import { describe, expect, it } from "vitest";
import {
  chooseFurthestCampaign,
  createPlayerSave,
  migratePlayerSave,
  PLAYER_SAVE_VERSION,
  sanitizePlayerSave,
  UnsupportedPlayerSaveVersionError,
} from "../src/persistence/player-save";
import {
  createDefaultCampaignProgress,
  recordStageClear,
} from "../src/campaign/progress";

describe("player save persistence model", () => {
  it("wraps Campaign progress in a versioned player save", () => {
    const save = createPlayerSave(
      createDefaultCampaignProgress(),
      "2026-09-21T15:00:00.000Z",
    );

    expect(save.version).toBe(PLAYER_SAVE_VERSION);
    expect(save.campaign.highestUnlockedStage).toBe(1);
    expect(save.updatedAt).toBe("2026-09-21T15:00:00.000Z");
  });

  it("sanitizes malformed player save data", () => {
    const save = sanitizePlayerSave({
      version: PLAYER_SAVE_VERSION,
      campaign: {
        version: 1,
        highestUnlockedStage: 5000,
        selectedStage: 9000,
        clearedStages: [1, 2, 2],
        bestByStage: {},
      },
      updatedAt: 123,
    });

    expect(save.version).toBe(PLAYER_SAVE_VERSION);
    expect(save.campaign.highestUnlockedStage).toBe(1000);
    expect(save.campaign.selectedStage).toBe(1000);
    expect(save.campaign.clearedStages).toEqual([1, 2]);
    expect(save.updatedAt).toBe("");
    expect(save.lastSaveReason).toBe("unknown");
  });

  it("migrates PlayerSave v1 to the current schema without losing Campaign progress", () => {
    const progress = recordStageClear(
      createDefaultCampaignProgress(),
      1,
      {
        score: 1234,
        accuracy: 98.5,
        wpm: 71,
        clearedAt: "2026-09-21T15:20:00.000Z",
      },
    );

    const migration = migratePlayerSave({
      version: 1,
      campaign: progress,
      updatedAt: "2026-09-21T15:21:00.000Z",
    });

    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(1);
    expect(migration.save.version).toBe(PLAYER_SAVE_VERSION);
    expect(migration.save.campaign.highestUnlockedStage).toBe(2);
    expect(migration.save.campaign.clearedStages).toEqual([1]);
    expect(migration.save.updatedAt).toBe(
      "2026-09-21T15:21:00.000Z",
    );
    expect(migration.save.lastSaveReason).toBe("migration");
    expect(migration.save.inventory).toEqual({});
  });

  it("migrates PlayerSave v2 to the current schema with starter equipment", () => {
    const progress = createDefaultCampaignProgress();
    const migration = migratePlayerSave({
      version: 2,
      campaign: progress,
      updatedAt: "2026-09-21T15:29:00.000Z",
      lastSaveReason: "stage-select",
    });

    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(2);
    expect(migration.save.version).toBe(PLAYER_SAVE_VERSION);
    expect(migration.save.inventory).toEqual({});
    expect(migration.save.equipment.loadout.weapon).toBe("starter-pulse");
  });

  it("migrates PlayerSave v3 to v4 without losing inventory", () => {
    const progress = createDefaultCampaignProgress();
    const migration = migratePlayerSave({
      version: 3,
      campaign: progress,
      inventory: { "repair-kit": 3 },
      updatedAt: "2026-09-21T15:29:30.000Z",
      lastSaveReason: "inventory",
    });

    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(3);
    expect(migration.save.inventory).toEqual({ "repair-kit": 3 });
    expect(migration.save.equipment.loadout.weapon).toBe("starter-pulse");
  });

  it("migrates PlayerSave v4 equipment to Common rarity", () => {
    const progress = createDefaultCampaignProgress();
    const migration = migratePlayerSave({
      version: 4,
      campaign: progress,
      inventory: { "repair-kit": 1 },
      equipment: {
        items: [
          {
            instanceId: "starter-pulse",
            definitionId: "pulse-laser-mk1",
          },
          {
            instanceId: "starter-precision",
            definitionId: "precision-laser-mk1",
          },
        ],
        loadout: {
          weapon: "starter-precision",
          armor: null,
          shield: null,
          reactor: null,
          utility: null,
          drone: null,
          core: null,
        },
      },
      updatedAt: "2026-09-21T16:10:00.000Z",
      lastSaveReason: "equipment",
    });

    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(4);
    expect(migration.save.equipment.loadout.weapon).toBe(
      "starter-precision",
    );
    expect(migration.save.equipment.items).toEqual([
      {
        instanceId: "starter-pulse",
        definitionId: "pulse-laser-mk1",
        rarity: "common",
        enhancement: 0,
      },
      {
        instanceId: "starter-precision",
        definitionId: "precision-laser-mk1",
        rarity: "common",
        enhancement: 0,
      },
    ]);
  });

  it("migrates PlayerSave v5 rarity equipment to +0 enhancement", () => {
    const progress = createDefaultCampaignProgress();
    const migration = migratePlayerSave({
      version: 5,
      campaign: progress,
      inventory: {},
      equipment: {
        items: [
          {
            instanceId: "rare-pulse",
            definitionId: "pulse-laser-mk1",
            rarity: "rare",
          },
        ],
        loadout: {
          weapon: "rare-pulse",
          armor: null,
          shield: null,
          reactor: null,
          utility: null,
          drone: null,
          core: null,
        },
      },
      updatedAt: "2026-09-21T16:16:00.000Z",
      lastSaveReason: "equipment",
    });

    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(5);
    expect(migration.save.equipment.items[0]).toEqual({
      instanceId: "rare-pulse",
      definitionId: "pulse-laser-mk1",
      rarity: "rare",
      enhancement: 0,
    });
  });

  it("migrates PlayerSave v6 to starter support spell loadout", () => {
    const current = createPlayerSave(createDefaultCampaignProgress());
    const legacy = {
      ...current,
      version: 6,
    } as Record<string, unknown>;
    delete legacy.supportSpells;

    const migration = migratePlayerSave(legacy);
    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(6);
    expect(migration.save.supportSpells.loadout).toEqual([
      "sanctuary",
      "gravity-well",
    ]);
  });

  it("migrates PlayerSave v7 to starter character state", () => {
    const current = createPlayerSave(createDefaultCampaignProgress());
    const legacy = {
      ...current,
      version: 7,
    } as Record<string, unknown>;
    delete legacy.characters;

    const migration = migratePlayerSave(legacy);
    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(7);
    expect(migration.save.characters).toMatchObject({
      selected: "vanguard",
      unlocked: ["vanguard"],
    });
    expect(migration.save.characters.progress.vanguard.level).toBe(1);
  });

  it("migrates PlayerSave v8 character state to Level and Mastery progression", () => {
    const current = createPlayerSave(createDefaultCampaignProgress());
    const legacy = {
      ...current,
      version: 8,
      characters: {
        selected: "vanguard",
        unlocked: ["vanguard"],
      },
    };

    const migration = migratePlayerSave(legacy);
    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(8);
    expect(migration.save.characters.progress.vanguard).toEqual({
      level: 1,
      xp: 0,
      mastery: 0,
      masteryXp: 0,
      talents: {
        assault: 0,
        bulwark: 0,
        reactor: 0,
      },
    });
  });

  it("migrates PlayerSave v9 progression to empty Talent Trees", () => {
    const current = createPlayerSave(createDefaultCampaignProgress());
    const legacyProgress = Object.fromEntries(
      Object.entries(current.characters.progress).map(([id, progress]) => [
        id,
        {
          level: progress.level,
          xp: progress.xp,
          mastery: progress.mastery,
          masteryXp: progress.masteryXp,
        },
      ]),
    );
    const legacy = {
      ...current,
      version: 9,
      characters: {
        selected: current.characters.selected,
        unlocked: current.characters.unlocked,
        progress: legacyProgress,
      },
    };

    const migration = migratePlayerSave(legacy);
    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(9);
    expect(migration.save.characters.progress.vanguard.talents).toEqual({
      assault: 0,
      bulwark: 0,
      reactor: 0,
    });
  });

  it("migrates PlayerSave v10 to persistent Luck pity counters", () => {
    const current = createPlayerSave(createDefaultCampaignProgress());
    const legacy = {
      ...current,
      version: 10,
    } as Record<string, unknown>;
    delete legacy.luckPity;

    const migration = migratePlayerSave(legacy);
    expect(migration.migrated).toBe(true);
    expect(migration.fromVersion).toBe(10);
    expect(migration.save.luckPity).toEqual({
      golden: 0,
      treasure: 0,
      choice: 0,
      anomaly: 0,
    });
  });

  it("keeps a valid current-version save without migration", () => {
    const save = createPlayerSave(
      createDefaultCampaignProgress(),
      "2026-09-21T15:30:00.000Z",
      "stage-select",
      { "repair-kit": 2 },
    );

    const migration = migratePlayerSave(save);
    expect(migration.migrated).toBe(false);
    expect(migration.fromVersion).toBe(PLAYER_SAVE_VERSION);
    expect(migration.save).toEqual(save);
    expect(migration.save.inventory).toEqual({ "repair-kit": 2 });
    expect(migration.save.equipment.loadout.weapon).toBe("starter-pulse");
    expect(migration.save.supportSpells.loadout).toEqual([
      "sanctuary",
      "gravity-well",
    ]);
    expect(migration.save.characters).toMatchObject({
      selected: "vanguard",
      unlocked: ["vanguard"],
    });
    expect(migration.save.characters.progress.vanguard.level).toBe(1);
    expect(migration.save.luckPity).toEqual({
      golden: 0,
      treasure: 0,
      choice: 0,
      anomaly: 0,
    });
  });

  it("refuses unsupported numeric schema versions instead of down-migrating them", () => {
    expect(() =>
      migratePlayerSave({
        version: PLAYER_SAVE_VERSION + 1,
        campaign: createDefaultCampaignProgress(),
        updatedAt: "2026-09-21T15:35:00.000Z",
      }),
    ).toThrow(UnsupportedPlayerSaveVersionError);
  });

  it("chooses the furthest progress during legacy migration recovery", () => {
    const initial = createDefaultCampaignProgress();
    const stageOne = recordStageClear(initial, 1, {
      score: 100,
      accuracy: 98,
      wpm: 60,
      clearedAt: "2026-09-21T15:00:00.000Z",
    });
    const stageTwo = recordStageClear(stageOne, 2, {
      score: 200,
      accuracy: 99,
      wpm: 65,
      clearedAt: "2026-09-21T15:10:00.000Z",
    });

    expect(
      chooseFurthestCampaign(stageOne, stageTwo).highestUnlockedStage,
    ).toBe(3);
    expect(
      chooseFurthestCampaign(stageTwo, stageOne).highestUnlockedStage,
    ).toBe(3);
  });

  it("keeps the preferred save on an exact progress tie", () => {
    const preferred = createDefaultCampaignProgress();
    const fallback = {
      ...createDefaultCampaignProgress(),
      selectedStage: 1,
    };

    expect(chooseFurthestCampaign(preferred, fallback)).toBe(preferred);
  });
});
