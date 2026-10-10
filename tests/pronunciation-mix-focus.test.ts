import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MusicController,
  type AudioLike,
} from "../src/audio/MusicController";
import { musicProfileForWorld } from "../src/audio/music-profile";
import { Sfx } from "../src/audio/Sfx";

type ListenerMap = Map<string, Set<EventListener>>;

function windowHarness() {
  const listeners: ListenerMap = new Map();
  const addEventListener = vi.fn((type: string, listener: EventListener) => {
    const set = listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    listeners.set(type, set);
  });
  const removeEventListener = vi.fn((type: string, listener: EventListener) => {
    listeners.get(type)?.delete(listener);
  });
  const emit = (type: string, detail: Record<string, unknown>) => {
    for (const listener of [...(listeners.get(type) ?? [])]) {
      listener({ detail } as unknown as Event);
    }
  };

  vi.stubGlobal("window", {
    addEventListener,
    removeEventListener,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    dispatchEvent: vi.fn(),
  });

  return { addEventListener, removeEventListener, emit };
}

class FakeMusicAudio implements AudioLike {
  volume = 0;
  loop = false;
  preload = "";
  currentTime = 0;
  paused = true;

  constructor(public src: string) {}

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  load(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}

describe("pronunciation mix focus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ducks music for pronunciation and preserves stronger overlapping focus", () => {
    const events = windowHarness();
    const controller = new MusicController((src) => new FakeMusicAudio(src));
    const profile = musicProfileForWorld("world-01");
    controller.setWorldProfile(profile);
    controller.setMusicVolume(0.8);
    controller.transitionTo("WORLD_NORMAL", 0);

    events.emit("space-typing:pronunciation", { active: true });
    let snapshot = controller.getDebugSnapshot();
    expect(snapshot.duckReasons).toContain("pronunciation");
    expect(snapshot.duckMultiplier).toBe(profile.duckingProfile.pronunciation);

    events.emit("space-typing:announcer", { active: true });
    snapshot = controller.getDebugSnapshot();
    expect(snapshot.duckReasons).toEqual(["announcer", "pronunciation"]);
    expect(snapshot.duckMultiplier).toBe(
      Math.min(
        profile.duckingProfile.announcer,
        profile.duckingProfile.pronunciation,
      ),
    );

    events.emit("space-typing:pronunciation", { active: false });
    snapshot = controller.getDebugSnapshot();
    expect(snapshot.duckReasons).toEqual(["announcer"]);
    expect(snapshot.duckMultiplier).toBe(profile.duckingProfile.announcer);

    events.emit("space-typing:announcer", { active: false });
    expect(controller.getDebugSnapshot().duckMultiplier).toBe(1);

    controller.destroy();
    // The shared focus manager owns the pronunciation bridge. A controller
    // only owns and removes its three gesture listeners.
    expect(events.removeEventListener).not.toHaveBeenCalledWith(
      "space-typing:pronunciation",
      expect.any(Function),
    );
    for (const type of ["pointerdown", "keydown", "touchstart"]) {
      expect(events.removeEventListener).toHaveBeenCalledWith(
        type,
        expect.any(Function),
        { capture: true },
      );
    }
  });

  it("re-levels an announcer that was already playing when pronunciation starts", async () => {
    const events = windowHarness();
    const instances: FakeAnnouncerAudio[] = [];

    class FakeAnnouncerAudio {
      preload = "";
      volume = 1;
      currentTime = 0;
      readonly pause = vi.fn();
      readonly play = vi.fn(() => Promise.resolve());
      private listeners = new Map<string, Set<EventListener>>();

      constructor(readonly src: string) {
        instances.push(this);
      }

      addEventListener(type: string, listener: EventListener): void {
        const set = this.listeners.get(type) ?? new Set<EventListener>();
        set.add(listener);
        this.listeners.set(type, set);
      }
    }

    vi.stubGlobal("Audio", FakeAnnouncerAudio);

    const sfx = new Sfx();
    sfx.setVolume(0.8);
    sfx.announcer("double-kill");
    await Promise.resolve();

    const announcer = instances[0]!;
    const normalVolume = announcer.volume;
    expect(normalVolume).toBeGreaterThan(0);

    events.emit("space-typing:pronunciation", { active: true });
    expect(announcer.volume).toBeLessThan(normalVolume);

    events.emit("space-typing:pronunciation", { active: false });
    expect(announcer.volume).toBeCloseTo(normalVolume);

    sfx.destroy();
  });
});
