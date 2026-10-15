import { describe, expect, it } from "vitest";
import {
  formatVarietyAuditMarkdown,
  runVarietyAuditBaseline,
} from "../src/balance/variety-audit";

describe("1000-stage Variety Audit baseline", () => {
  const report = runVarietyAuditBaseline();

  it("covers the full Campaign with no audit integrity errors", () => {
    expect(report.errors).toEqual([]);
    expect(report.metrics.stages).toBe(1000);
    expect(report.metrics.roleCounts).toEqual({
      normal: 800,
      elite: 70,
      "mini-boss": 50,
      boss: 40,
      special: 10,
      hazard: 10,
      gauntlet: 10,
      "major-boss": 10,
    });
    expect(report.metrics.bossStages).toBe(100);
    expect(report.metrics.bossRewardChoiceStages).toBe(100);
    expect(report.metrics.stagesWithInternalRecoveryPhase).toBe(820);
  });

  it("locks the current pre-V2 repeat baseline without inventing future systems", () => {
    expect(report.metrics.encounterRepeat).toEqual({
      distinct: 674,
      minRepeatDistance: 1,
      immediateRepeats: 79,
      maxStreak: 2,
    });
    expect(report.metrics.nearEncounterRepeat).toEqual({
      distinct: 179,
      minRepeatDistance: 1,
      immediateRepeats: 79,
      maxStreak: 2,
    });

    const full = report.metrics.windows.find(
      (window) => window.size === 1000,
    );
    expect(full).toEqual({
      size: 1000,
      windows: 1,
      minDistinctExactSignatures: 674,
      minDistinctNearSignatures: 179,
      maxRepeatedExactSignature: 9,
      maxRepeatedNearSignature: 284,
    });

    expect(report.coverage.canonicalEncounterRecipes).toBe(false);
    expect(report.coverage.canonicalSectorConditions).toBe(false);
    expect(report.coverage.canonicalTypingPatterns).toBe(false);
    expect(report.coverage.deterministicEliteAffixPairs).toBe(false);
    expect(report.coverage.macroPacing).toBe(false);
  });

  it("records current production event and objective repetition deterministically", () => {
    expect(report.metrics.eventFrequency["fast-enemies"]).toEqual({
      count: 137,
      minRepeatDistance: 1,
    });
    expect(report.metrics.eventFrequency["double-supply"]).toEqual({
      count: 122,
      minRepeatDistance: 1,
    });
    expect(report.metrics.eventFrequency["gauntlet-pressure"]).toEqual({
      count: 10,
      minRepeatDistance: 100,
    });

    expect(report.metrics.objectiveFrequency["commander-first"]?.count).toBe(102);
    expect(report.metrics.objectiveFrequency["survive"]).toEqual({
      count: 20,
      minRepeatDistance: 40,
    });
    expect(report.metrics.objectiveFrequency["elite-hunt"]).toEqual({
      count: 10,
      minRepeatDistance: 100,
    });
  });

  it("is reproducible and exposes a compact report for implementation reviews", () => {
    const repeated = runVarietyAuditBaseline();

    expect(repeated.metrics).toEqual(report.metrics);
    expect(repeated.deterministicSignature).toBe(
      report.deterministicSignature,
    );
    expect(formatVarietyAuditMarkdown(report)).toContain(
      "## Sliding windows",
    );
  });
});
