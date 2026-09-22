import { describe, expect, it } from "vitest";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import {
  collectionSummary,
  createMetaProgressState,
  evaluateStageProgress,
  isValidMetaProgressState,
  missionForStage,
  recordBossDiscovery,
  recordEnemyDiscovery,
  sanitizeMetaProgressState,
  syncOwnedCollection,
} from "../src/progression/meta";

describe("missions, achievements and meta collection", () => {
  it("creates deterministic missions from stage role and hidden mission access", () => {
    expect(missionForStage(30, false)?.kind).toBe("accuracy");
    expect(missionForStage(90, false)?.kind).toBe("streak");
    expect(missionForStage(25, true)?.hidden).toBe(true);
    expect(missionForStage(1, false)).toBeNull();
  });

  it("awards mission Credits once and unlocks achievements", () => {
    const first = evaluateStageProgress(createMetaProgressState(), {
      stage: 30,
      accuracy: 99,
      maxStreak: 55,
      hiddenMissionUnlocked: false,
    });

    expect(first.completedMission?.id).toBe("special-30");
    expect(first.rewardCredits).toBe(80);
    expect(first.unlockedAchievements).toContain("first-clear");
    expect(first.unlockedAchievements).toContain("ace-pilot");
    expect(first.unlockedAchievements).toContain("streak-50");

    const replay = evaluateStageProgress(first.state, {
      stage: 30,
      accuracy: 99,
      maxStreak: 55,
      hiddenMissionUnlocked: false,
    });
    expect(replay.completedMission).toBeNull();
    expect(replay.rewardCredits).toBe(0);
  });

  it("records enemy and boss collection without duplicates", () => {
    let state = createMetaProgressState();
    state = recordEnemyDiscovery(state, "jammer");
    state = recordEnemyDiscovery(state, "jammer");
    state = recordBossDiscovery(state, 50);
    state = recordBossDiscovery(state, 50);

    expect(state.discoveredEnemies).toEqual(["jammer"]);
    expect(state.discoveredBossStages).toEqual([50]);
  });

  it("sanitizes and strictly validates persisted meta progress", () => {
    const state = sanitizeMetaProgressState({
      achievements: ["first-clear", "bad"],
      completedMissions: ["special-30", "special-30"],
      discoveredEnemies: ["scout", "bad"],
      discoveredBossStages: [100, 100, -1],
    });

    expect(state.achievements).toEqual(["first-clear"]);
    expect(state.completedMissions).toEqual(["special-30"]);
    expect(state.discoveredEnemies).toEqual(["scout"]);
    expect(state.discoveredBossStages).toEqual([100]);
    expect(state.discoveredItems).toEqual([]);
    expect(state.discoveredEquipment).toEqual([]);
    expect(state.discoveredCharacters).toEqual([]);
    expect(isValidMetaProgressState(state)).toBe(true);
  });

  it("persists owned collection and summarizes it", () => {
    let meta = recordEnemyDiscovery(
      createMetaProgressState(),
      "scout",
    );
    meta = syncOwnedCollection(meta, {
      inventory: { "repair-kit": 1 },
      equipment: createStarterEquipmentState(),
      characters: ["vanguard"],
    });

    // Collection survives after a consumable leaves current inventory.
    meta = syncOwnedCollection(meta, {
      inventory: {},
      equipment: createStarterEquipmentState(),
      characters: ["vanguard"],
    });

    const hidden = createHiddenDiscoveryState();
    hidden.discovered = ["black-market-signal"];
    const summary = collectionSummary(meta, hidden);

    expect(summary.enemies).toEqual([1, 14]);
    expect(summary.items[0]).toBe(1);
    expect(summary.characters).toEqual([1, 11]);
    expect(summary.hidden).toEqual([1, 6]);
  });
});
