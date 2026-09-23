/**
 * End-of-stage eligibility. Hostile projectiles are intentionally excluded:
 * they must not trap the player in an empty arena. Every active, visible bonus
 * target and an unresolved choice must be collected or expire before clearing.
 * Only actual (already spawned) targets block; a scheduled but not spawned
 * bonus must not create a soft lock.
 */
export type StageClearGate = {
  remainingSpawns: number;
  livingEnemies: number;
  activeBonusTargets: number;
  unresolvedBonusChoice: boolean;
  bossRequired: boolean;
  bossDefeated: boolean;
  bossRewardPending: boolean;
};

export function canFinishCombatStage(input: StageClearGate): boolean {
  return input.remainingSpawns === 0 &&
    input.livingEnemies === 0 &&
    input.activeBonusTargets === 0 &&
    !input.unresolvedBonusChoice &&
    (!input.bossRequired || (input.bossDefeated && !input.bossRewardPending));
}

/** Boss may only enter when all previous visible targets have resolved. */
export function canSpawnFinalBoss(input: StageClearGate, bossSpawned: boolean): boolean {
  return input.bossRequired && !bossSpawned &&
    input.remainingSpawns === 0 &&
    input.livingEnemies === 0 &&
    input.activeBonusTargets === 0 &&
    !input.unresolvedBonusChoice;
}
