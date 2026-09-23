import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../src/characters/registry";
import { createStarterCharacterProgress } from "../src/characters/progression";
import {
  BASIC_SKILL_UNLOCK_LEVELS,
  basicSkillNextUnlockLevel,
  basicSkillPoints,
  createBasicSkillProgress,
  createBasicSkillRanks,
  createBasicSkillsByCharacter,
  isValidBasicSkillsByCharacter,
  sanitizeBasicSkillProgress,
  spendBasicSkillPoint,
} from "../src/progression/basic-skills";
import {
  createUpgradeState,
  isValidLegacyUpgradeState,
  isValidUpgradeState,
  sanitizeUpgradeState,
} from "../src/progression/upgrades";
import {
  createCheckpointSnapshot,
  restoreCheckpointSnapshot,
  migrateLegacyRunPersistentState,
} from "../src/persistence/checkpoint";
import { createPlayerSave, migratePlayerSave } from "../src/persistence/player-save";
import { createDefaultCampaignProgress } from "../src/campaign/progress";
import {
  createStageEntrySnapshot,
  sanitizeStageEntrySnapshot,
} from "../src/persistence/death-protection";
import {
  captureCrashRecoverySnapshot,
  sanitizeCrashRecoverySnapshot,
} from "../src/persistence/crash-recovery";
import { awardCharacterProgress } from "../src/characters/progression";

describe("P0 Basic Skill Points share existing character XP", () => {
  it("starts all characters independently with three learnable starter skills", () => {
    const all = createBasicSkillsByCharacter();
    expect(Object.keys(all)).toEqual([...CHARACTER_IDS]);
    for (const id of CHARACTER_IDS) {
      expect(all[id].spent).toBe(0);
      expect(all[id].ranks.barrier).toBe(1);
      expect(all[id].ranks["emp-burst"]).toBe(1);
      expect(all[id].ranks["emergency-repair"]).toBe(1);
      expect(all[id].ranks["time-shell"]).toBe(0);
      expect(basicSkillPoints(1, all[id]).available).toBe(0);
    }
    expect(isValidBasicSkillsByCharacter(all)).toBe(true);
    all.vanguard.ranks.barrier = 3;
    expect(all.aegis.ranks.barrier).toBe(1);
  });

  it("derives one Basic Point per level-up without affecting Mastery or Talents", () => {
    const starter = createStarterCharacterProgress();
    const award = awardCharacterProgress(starter, {
      stage: 1000,
      accuracy: 100,
      wpm: 150,
    });
    const wallet = createBasicSkillProgress();
    expect(basicSkillPoints(award.progress.level, wallet).available).toBe(award.levelUps);
    expect(award.progress.talents).toEqual(starter.talents);
    expect(award.progress.mastery).toBeGreaterThanOrEqual(starter.mastery);
    expect(basicSkillPoints(50, wallet).earned).toBe(49);
  });

  it("blocks unaffordable/locked skill ranks and cannot spend stale points twice", () => {
    const first = createBasicSkillProgress();
    expect(spendBasicSkillPoint(first, "barrier", 1)).toMatchObject({
      changed: false, reason: "level",
    });
    expect(spendBasicSkillPoint(first, "time-shell", 1)).toMatchObject({
      changed: false, reason: "points",
    });
    const earned = spendBasicSkillPoint(first, "time-shell", 3);
    expect(earned.changed).toBe(true);
    expect(earned.progress.ranks["time-shell"]).toBe(1);
    expect(earned.progress.spent).toBe(1);
    expect(basicSkillPoints(3, earned.progress).available).toBe(1);
    const second = spendBasicSkillPoint(earned.progress, "time-shell", 3);
    expect(second.changed).toBe(true);
    expect(second.progress.ranks["time-shell"]).toBe(2);
    expect(spendBasicSkillPoint(second.progress, "barrier", 3)).toMatchObject({
      changed: false, reason: "points",
    });
    expect(first.spent).toBe(0);
    expect(first.ranks["time-shell"]).toBe(0);
    expect(BASIC_SKILL_UNLOCK_LEVELS).toEqual([1, 2, 8, 18, 32]);
    expect(basicSkillNextUnlockLevel(5)).toBeNull();
    expect(spendBasicSkillPoint({
      ranks: { ...first.ranks, barrier: 5 }, spent: 0,
    }, "barrier", 50)).toMatchObject({ changed: false, reason: "max" });
  });

  it("grandfathers old currency-paid M17 levels for EVERY character without spending new points", () => {
    const legacy = {
      skillLevels: {
        ...createUpgradeState().skillLevels,
        barrier: 5,
        "chain-lightning": 4,
      },
      attributeLevels: {
        ...createUpgradeState().attributeLevels,
        hull: 3,
      },
    };
    expect(isValidLegacyUpgradeState(legacy)).toBe(true);
    const result = sanitizeUpgradeState(legacy);
    expect(isValidUpgradeState(result)).toBe(true);
    for (const id of CHARACTER_IDS) {
      expect(result.basicSkills[id].ranks.barrier).toBe(5);
      expect(result.basicSkills[id].ranks["chain-lightning"]).toBe(4);
      expect(result.basicSkills[id].spent).toBe(0);
    }
    expect(result.attributeLevels.hull).toBe(3);
    expect(sanitizeUpgradeState(result).basicSkills).toEqual(result.basicSkills);
  });

  it("sanitizes corrupt Basic Points without granting extra ranks", () => {
    const result = sanitizeBasicSkillProgress({
      ranks: { barrier: 99, "time-shell": -50 },
      spent: Number.POSITIVE_INFINITY,
    });
    expect(result.ranks.barrier).toBe(5);
    expect(result.ranks["time-shell"]).toBe(0);
    expect(result.spent).toBe(0);
    expect(basicSkillPoints(1, result).available).toBe(0);
    expect(createBasicSkillRanks("legacy", { barrier: 4 }).barrier).toBe(4);
  });

  it("migrates v26 active, checkpoint, stage entry and crash-recovery paid skills", () => {
    const base = createPlayerSave(createDefaultCampaignProgress(), "2026-09-23T00:00:00Z");
    const oldUpgrades = {
      skillLevels: { ...base.upgrades.skillLevels, barrier: 5 },
      attributeLevels: { ...base.upgrades.attributeLevels, hull: 8 },
    };
    const oldSnapshot = {
      ...base.checkpointSnapshot,
      upgrades: oldUpgrades,
    };
    expect(migrateLegacyRunPersistentState(oldSnapshot)?.upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
    const oldStageEntry = createStageEntrySnapshot(
      base,
      base.campaignExpansion,
      base.checkpointSnapshot,
      "2026-09-23T00:00:00Z",
    );
    const legacyStageEntry = {
      ...oldStageEntry,
      state: { ...oldStageEntry.state, upgrades: oldUpgrades },
      checkpointSnapshot: { ...oldStageEntry.checkpointSnapshot, upgrades: oldUpgrades },
    };
    const restoredEntry = sanitizeStageEntrySnapshot(legacyStageEntry);
    expect(restoredEntry?.state.upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
    const capture = captureCrashRecoverySnapshot(
      base,
      base.campaignExpansion,
      base.checkpointSnapshot,
      "stage-entry",
      "2026-09-23T00:01:00Z",
    );
    const oldCrash = {
      ...capture.snapshot,
      state: { ...capture.snapshot.state, upgrades: oldUpgrades },
      checkpointSnapshot: { ...capture.snapshot.checkpointSnapshot, upgrades: oldUpgrades },
    };
    const restoredCrash = sanitizeCrashRecoverySnapshot(oldCrash);
    expect(restoredCrash?.state.upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
    const old = {
      ...base,
      version: 26,
      upgrades: oldUpgrades,
      checkpointSnapshot: oldSnapshot,
      stageEntrySnapshot: legacyStageEntry,
      crashRecoverySnapshot: oldCrash,
    };
    const migrated = migratePlayerSave(old);
    expect(migrated.fromVersion).toBe(26);
    expect(migrated.migrated).toBe(true);
    expect(migrated.save.version).toBe(27);
    expect(migrated.save.upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
    expect(migrated.save.upgrades.basicSkills.zenith.ranks.barrier).toBe(5);
    expect(migrated.save.checkpointSnapshot.upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
    expect(migrated.save.checkpointSnapshot.upgrades.attributeLevels.hull).toBe(8);
    expect(migrated.save.stageEntrySnapshot?.state.upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
    expect(migrated.save.crashRecoverySnapshot?.state.upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
    const restored = restoreCheckpointSnapshot(migrated.save.checkpointSnapshot, migrated.save);
    expect(restored.upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
    expect(restored.upgrades.basicSkills.vanguard.spent).toBe(0);
    expect(createCheckpointSnapshot(restored, 1).upgrades.basicSkills.vanguard.ranks.barrier).toBe(5);
  });
});
