import { describe, expect, it, vi } from "vitest";
import {
  createExpansionV2Profile,
  recordFixedChallengeResult,
} from "../src/expansion-v2/profile-store";

function validRecord() {
  return {
    identityKey: "2026-10-10|123|rules|content|words|kit|normal|standard|frozen",
    runId: "challenge-run",
    completedEncounters: 2,
    score: 100,
    accuracy: 95,
    activeSeconds: 60,
    retried: false,
    assisted: false,
  };
}

describe("Expansion V2 fixed challenge settlement transaction", () => {
  it.each([
    ["negative score", { score: -1 }],
    ["invalid accuracy", { accuracy: 101 }],
    ["negative active time", { activeSeconds: -1 }],
    ["empty run id", { runId: "" }],
    ["oversized derived event id", { runId: "x".repeat(138) }],
  ])("rejects %s without splitting PB, ghost, and history state", (_label, override) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:30:00.000Z"));
    try {
      const profile = createExpansionV2Profile();
      const result = recordFixedChallengeResult(
        profile,
        { ...validRecord(), ...override },
        [{ encounterIndex: 0, activeSeconds: 5, cumulativeScore: 10 }],
      );

      expect(result).toBe(profile);
      expect(result.history.events).toEqual([]);
      expect(result.pbByIdentity).toEqual({});
      expect(result.ghostByIdentity).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it("accepts a valid retry after rejected challenge data", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:30:00.000Z"));
    try {
      const profile = createExpansionV2Profile();
      const rejected = recordFixedChallengeResult(
        profile,
        { ...validRecord(), score: Number.NaN },
        [],
      );
      expect(rejected).toBe(profile);

      const settled = recordFixedChallengeResult(
        rejected,
        validRecord(),
        [{ encounterIndex: 0, activeSeconds: 5, cumulativeScore: 10 }],
      );

      expect(settled.history.events).toHaveLength(1);
      expect(settled.history.events[0]).toMatchObject({
        runId: "challenge-run",
        score: 100,
        accuracyPercent: 95,
        activeSeconds: 60,
        challengeKind: "daily",
      });
      expect(settled.pbByIdentity[validRecord().identityKey]?.runId)
        .toBe("challenge-run");
      expect(settled.ghostByIdentity[validRecord().identityKey]?.points)
        .toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
