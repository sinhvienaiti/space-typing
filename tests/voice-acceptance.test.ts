import { describe, expect, it } from "vitest";
import {
  VoiceAcceptanceMonitor,
} from "../src/input/voice-acceptance";
import { rankedDuelInputAdmission } from "../src/input/duel-input-policy";

describe("voice final acceptance diagnostics", () => {
  it("measures recognizer delivery backlog and synchronous handler budget deterministically", () => {
    let now = 1_000;
    const monitor = new VoiceAcceptanceMonitor(() => now, 8);
    monitor.barrier({ sessionId: "s1", inputEpoch: 1, audioEpoch: 0 });

    const accepted = monitor.begin({
      sessionId: "s1",
      inputEpoch: 1,
      audioEpoch: 0,
      detectionId: "d1",
      emittedAtMs: 950,
    });
    now += 3;
    monitor.finish(accepted, {
      accepted: true,
      duplicate: false,
      reason: "accepted",
    });

    const duplicate = monitor.begin({
      sessionId: "s1",
      inputEpoch: 1,
      audioEpoch: 0,
      detectionId: "d1",
      emittedAtMs: 990,
    });
    now += 10;
    monitor.finish(duplicate, {
      accepted: false,
      duplicate: true,
      reason: "duplicate",
    });

    expect(monitor.snapshot()).toMatchObject({
      received: 2,
      accepted: 1,
      rejected: 1,
      duplicateRejected: 1,
      currentInFlight: 0,
      maxInFlight: 1,
      maxDeliveryLagMs: 50,
      maxProcessingMs: 10,
      overBudgetCount: 1,
    });
  });

  it("tracks stale rejection and reconnect barriers without conflating epoch changes with new sessions", () => {
    let now = 5_000;
    const monitor = new VoiceAcceptanceMonitor(() => now);
    monitor.barrier({ sessionId: "s1", inputEpoch: 1, audioEpoch: 0 });
    monitor.barrier({ sessionId: "s1", inputEpoch: 2, audioEpoch: 1 });
    monitor.barrier({ sessionId: "s2", inputEpoch: 1, audioEpoch: 0 });

    const ticket = monitor.begin({
      sessionId: "s1",
      inputEpoch: 1,
      audioEpoch: 0,
      detectionId: "late",
      emittedAtMs: 4_980,
    });
    monitor.finish(ticket, {
      accepted: false,
      duplicate: false,
      reason: "stale-session",
    });

    expect(monitor.snapshot()).toMatchObject({
      barrierChanges: 2,
      sessionChanges: 1,
      staleRejected: 1,
      rejected: 1,
      maxDeliveryLagMs: 20,
    });
  });
});

describe("Ranked Duel input admission", () => {
  it("allows canonical Typing and fails closed for Voice/Hybrid until authority transport exists", () => {
    expect(rankedDuelInputAdmission("typing")).toEqual({
      allowed: true,
      mode: "typing",
    });
    for (const mode of ["voice", "hybrid"] as const) {
      const admission = rankedDuelInputAdmission(mode);
      expect(admission.allowed).toBe(false);
      if (!admission.allowed) {
        expect(admission.mode).toBe(mode);
        expect(admission.reason).toContain("Typing input only");
      }
    }
  });
});
