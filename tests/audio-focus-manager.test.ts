import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioFocusManager } from "../src/audio/focus-manager";
import { resolveFocusGain, resolveGain } from "../src/audio/gain-resolver";
import { AnnouncerScheduler } from "../src/audio/announcer-scheduler";

describe("AudioFocusManager", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps independent tokens and ignores stale generation release", () => {
    const manager = new AudioFocusManager();
    const first = manager.replace("speech", "pronunciation", 1);
    const newer = manager.replace("speech", "pronunciation", 2);
    expect(manager.snapshot().tokens).toEqual([newer]);
    expect(manager.release(first)).toBe(false);
    expect(manager.isActive("pronunciation")).toBe(true);
    manager.release(newer);
    expect(manager.isActive("pronunciation")).toBe(false);
  });

  it("uses the strongest focus target instead of multiplying ducks", () => {
    expect(resolveFocusGain(["pronunciation", "warning"], {
      pronunciation: 0.22,
      warning: 0.56,
    })).toBe(0.22);
  });
});

describe("gain resolution", () => {
  it("preserves explicit user zero and applies each factor once", () => {
    expect(resolveGain({ childPreference: 0, publishedDefault: 0.8, busCalibration: 1.2 })).toBe(0);
    expect(resolveGain({
      masterPreference: 0.5,
      parentPreference: 0.8,
      childPreference: 0.75,
      busCalibration: 0.5,
      assetTrim: 0.8,
      eventGain: 0.5,
      focusGain: 0.25,
      transitionGain: 0.5,
      policyCap: 1,
    })).toBeCloseTo(0.0075);
  });
});

describe("AnnouncerScheduler", () => {
  it("defers normal, drops flavor, and allows critical during pronunciation", () => {
    const scheduler = new AnnouncerScheduler<"normal" | "flavor" | "critical">();
    scheduler.enqueue({ eventId: "f", event: "flavor", priority: "flavor", rank: 1, sessionId: "s", createdAtMonotonicMs: 0, ttlMs: 1000 }, 0);
    scheduler.enqueue({ eventId: "n", event: "normal", priority: "normal", rank: 2, sessionId: "s", createdAtMonotonicMs: 1, ttlMs: 1000 }, 1);
    scheduler.enqueue({ eventId: "c", event: "critical", priority: "critical", rank: 3, sessionId: "s", createdAtMonotonicMs: 2, ttlMs: 1000 }, 2);

    expect(scheduler.takeNext(3, true)?.event).toBe("critical");
    expect(scheduler.takeNext(4, true)).toBeNull();
    expect(scheduler.snapshot().map((item) => item.event)).toEqual(["normal"]);
    expect(scheduler.takeNext(5, false)?.event).toBe("normal");
  });

  it("coalesces lower milestones and expires by monotonic TTL", () => {
    const scheduler = new AnnouncerScheduler<string>();
    scheduler.enqueue({ eventId: "1", event: "double", priority: "normal", rank: 2, sessionId: "s", createdAtMonotonicMs: 0, ttlMs: 100, coalesceKey: "chain" }, 0);
    scheduler.enqueue({ eventId: "2", event: "triple", priority: "normal", rank: 3, sessionId: "s", createdAtMonotonicMs: 10, ttlMs: 100, coalesceKey: "chain" }, 10);
    expect(scheduler.snapshot().map((item) => item.event)).toEqual(["triple"]);
    expect(scheduler.takeNext(111, false)).toBeNull();
  });
});
