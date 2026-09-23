import { describe, expect, it } from "vitest";
import { canFinishCombatStage, canSpawnFinalBoss, type StageClearGate } from "../src/campaign/stage-clear-gate";
const empty: StageClearGate = {
  remainingSpawns: 0, livingEnemies: 0, activeBonusTargets: 0,
  unresolvedBonusChoice: false, bossRequired: false,
  bossDefeated: false, bossRewardPending: false,
};
describe("stage clear waits for all visible non-projectile targets", () => {
  it("does not clear while ANY of five bonus target types remains visible", () => {
    for (const kind of ["supply", "treasure", "recall", "choice", "anomaly"]) {
      expect(canFinishCombatStage({ ...empty, activeBonusTargets: 1 }), kind).toBe(false);
    }
    expect(canFinishCombatStage({ ...empty, activeBonusTargets: 0 })).toBe(true);
    expect(canFinishCombatStage({ ...empty, unresolvedBonusChoice: true })).toBe(false);
    expect(canFinishCombatStage({ ...empty, remainingSpawns: 1 })).toBe(false);
    expect(canFinishCombatStage({ ...empty, livingEnemies: 1 })).toBe(false);
  });
  it("ignores projectiles and unspawned chance rolls so no infinite empty-stage wait", () => {
    // The gate has no projectile/pending-timer field on purpose.
    expect(canFinishCombatStage(empty)).toBe(true);
  });
  it("holds mandatory boss spawns and choices until bonus and boss phases resolve", () => {
    const boss: StageClearGate = { ...empty, bossRequired: true };
    expect(canSpawnFinalBoss(boss, false)).toBe(true);
    expect(canSpawnFinalBoss({ ...boss, activeBonusTargets: 1 }, false)).toBe(false);
    expect(canSpawnFinalBoss({ ...boss, unresolvedBonusChoice: true }, false)).toBe(false);
    expect(canSpawnFinalBoss(boss, true)).toBe(false);
    expect(canFinishCombatStage(boss)).toBe(false);
    expect(canFinishCombatStage({ ...boss, bossDefeated: true, bossRewardPending: true })).toBe(false);
    expect(canFinishCombatStage({ ...boss, bossDefeated: true })).toBe(true);
  });
});
