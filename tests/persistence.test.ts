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

  it("migrates PlayerSave v2 to v3 with an empty inventory", () => {
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
