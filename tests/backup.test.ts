import { describe, expect, it } from "vitest";
import {
  exportPlayerSaveJson,
  parsePlayerSaveJson,
} from "../src/persistence/backup";
import {
  createDefaultCampaignProgress,
  recordStageClear,
} from "../src/campaign/progress";
import {
  createPlayerSave,
  PLAYER_SAVE_VERSION,
} from "../src/persistence/player-save";

const GRADE_TO_LEGACY_RARITY = {
  aluminum: "common",
  copper: "rare",
  silver: "epic",
  gold: "legendary",
  diamond: "legendary",
} as const;

function convertEquipmentToLegacyRarity(
  raw: Record<string, unknown>,
): void {
  const equipment = raw.equipment as {
    items?: Array<Record<string, unknown>>;
    loadout?: unknown;
  } | undefined;
  if (equipment === undefined || !Array.isArray(equipment.items)) return;

  equipment.items = equipment.items.map((item) => {
    const grade = item.grade;
    if (
      grade !== "aluminum" &&
      grade !== "copper" &&
      grade !== "silver" &&
      grade !== "gold" &&
      grade !== "diamond"
    ) {
      return item;
    }

    const { grade: _grade, ...rest } = item;
    return {
      ...rest,
      rarity: GRADE_TO_LEGACY_RARITY[grade],
    };
  });
}

describe("save backup", () => {
  it("exports a readable current-version JSON backup", () => {
    const progress = recordStageClear(
      createDefaultCampaignProgress(),
      1,
      {
        score: 900,
        accuracy: 97,
        wpm: 64,
        clearedAt: "2026-09-21T15:40:00.000Z",
      },
    );

    const json = exportPlayerSaveJson(
      progress,
      "2026-09-21T15:41:00.000Z",
      { "repair-kit": 2 },
    );
    const parsed = JSON.parse(json) as {
      version: number;
      campaign: { highestUnlockedStage: number };
      lastSaveReason: string;
      inventory: { "repair-kit"?: number };
      equipment: { loadout: { weapon: string | null } };
      supportSpells: { loadout: Array<string | null> };
      characters: { selected: string; unlocked: string[] };
      luckPity: {
        golden: number;
        treasure: number;
        choice: number;
        anomaly: number;
      };
      hiddenDiscovery: {
        discovered: string[];
        lastRollStage: number;
      };
      credits: number;
      progression: {
        claimedMissions: string[];
        unlockedAchievements: string[];
      };
      expansionCurrencies: {
        alloy: number;
        starCrystal: number;
        quantumCore: number;
      };
      campaignExpansion: {
        checkpoint: { stage: number };
        activeSegment: { currentStage: number };
        crashRecovery: unknown;
      };
      checkpointSnapshot: {
        campaign: { highestUnlockedStage: number; selectedStage: number };
        credits: number;
      };
      crashRecoverySnapshot: unknown;
      stageEntrySnapshot: unknown;
      hotbar: { version: number; slots: unknown[] };
    };

    expect(parsed.version).toBe(PLAYER_SAVE_VERSION);
    expect(parsed.campaign.highestUnlockedStage).toBe(2);
    expect(parsed.lastSaveReason).toBe("manual");
    expect(parsed.inventory["repair-kit"]).toBe(2);
    expect(parsed.equipment.loadout.weapon).toBe("starter-pulse");
    expect(parsed.supportSpells.loadout).toEqual([
      "sanctuary",
      "gravity-well",
    ]);
    expect(parsed.characters).toMatchObject({
      selected: "vanguard",
      unlocked: ["vanguard"],
    });
    expect(parsed.hotbar.version).toBe(1);
    expect(parsed.hotbar.slots).toHaveLength(9);
    expect(parsed.luckPity).toEqual({
      golden: 0,
      treasure: 0,
      choice: 0,
      anomaly: 0,
    });
    expect(parsed.hiddenDiscovery).toMatchObject({
      discovered: [],
      lastRollStage: 0,
    });
    expect(parsed.credits).toBe(0);
    expect(parsed.progression.claimedMissions).toEqual([]);
    expect(parsed.progression.unlockedAchievements).toEqual([]);
    expect(parsed.expansionCurrencies).toEqual({
      alloy: 0,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(parsed.campaignExpansion.checkpoint.stage).toBe(1);
    expect(parsed.campaignExpansion.activeSegment.currentStage).toBe(2);
    expect(parsed.campaignExpansion.crashRecovery).toBeNull();
    expect(parsed.checkpointSnapshot.campaign).toMatchObject({
      highestUnlockedStage: 1,
      selectedStage: 1,
    });
    expect(parsed.checkpointSnapshot.credits).toBe(0);
    expect(parsed.crashRecoverySnapshot).toBeNull();
    expect(parsed.stageEntrySnapshot).toBeNull();
  });

  it("imports and migrates a valid v1 backup", () => {
    const progress = recordStageClear(
      createDefaultCampaignProgress(),
      1,
      {
        score: 1200,
        accuracy: 99,
        wpm: 72,
        clearedAt: "2026-09-21T15:42:00.000Z",
      },
    );

    const result = parsePlayerSaveJson(
      JSON.stringify({
        version: 1,
        campaign: progress,
        updatedAt: "2026-09-21T15:43:00.000Z",
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.version).toBe(PLAYER_SAVE_VERSION);
    expect(result.save.campaign.highestUnlockedStage).toBe(2);
  });

  it("rejects malformed JSON and unsupported versions", () => {
    expect(parsePlayerSaveJson("{broken").ok).toBe(false);

    const unsupported = parsePlayerSaveJson(
      JSON.stringify({
        version: 99,
        campaign: createDefaultCampaignProgress(),
      }),
    );
    expect(unsupported).toEqual({
      ok: false,
      error:
        "Unsupported save version. Supported versions: 1-" +
        String(PLAYER_SAVE_VERSION) +
        ".",
    });
  });

  it("accepts and migrates a valid PlayerSave v20 backup without route data", () => {
    const current = createPlayerSave(createDefaultCampaignProgress());
    const checkpointSnapshot = {
      ...current.checkpointSnapshot,
    } as Record<string, unknown>;
    delete checkpointSnapshot.route;
    const legacy = {
      ...current,
      version: 20,
      checkpointSnapshot,
    } as Record<string, unknown>;
    delete legacy.route;

    const result = parsePlayerSaveJson(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.version).toBe(PLAYER_SAVE_VERSION);
    expect(result.save.route.graph.sectorStart).toBe(1);
  });

  it("rejects out-of-range Campaign data instead of silently clamping it", () => {
    const invalid = parsePlayerSaveJson(
      JSON.stringify({
        version: PLAYER_SAVE_VERSION,
        campaign: {
          version: 1,
          highestUnlockedStage: 5000,
          selectedStage: 5000,
          clearedStages: [1],
          bestByStage: {},
        },
        updatedAt: "2026-09-21T15:44:00.000Z",
        lastSaveReason: "manual",
      }),
    );

    expect(invalid).toEqual({
      ok: false,
      error: "Campaign data is missing, corrupted or out of range.",
    });
  });

  it("rejects unknown item IDs and invalid stack counts in v3", () => {
    const progress = createDefaultCampaignProgress();
    const unknown = parsePlayerSaveJson(
      JSON.stringify({
        version: PLAYER_SAVE_VERSION,
        campaign: progress,
        inventory: { "not-real": 1 },
        updatedAt: "2026-09-21T15:45:00.000Z",
        lastSaveReason: "manual",
      }),
    );

    expect(unknown).toEqual({
      ok: false,
      error: "Inventory contains an unknown item or invalid stack count.",
    });
  });

  it("imports and migrates a valid v4 equipment backup", () => {
    const progress = createDefaultCampaignProgress();
    const result = parsePlayerSaveJson(
      JSON.stringify({
        version: 4,
        campaign: progress,
        inventory: { "repair-kit": 1 },
        equipment: {
          items: [
            {
              instanceId: "starter-pulse",
              definitionId: "pulse-laser-mk1",
            },
          ],
          loadout: {
            weapon: "starter-pulse",
            armor: null,
            shield: null,
            reactor: null,
            utility: null,
            drone: null,
            core: null,
          },
        },
        updatedAt: "2026-09-21T16:12:00.000Z",
        lastSaveReason: "equipment",
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.save.equipment.items[0]?.grade).toBe("aluminum");
    expect(result.save.equipment.items[0]?.enhancement).toBe(0);
  });

  it("imports and migrates a valid v5 rarity backup", () => {
    const progress = createDefaultCampaignProgress();
    const result = parsePlayerSaveJson(
      JSON.stringify({
        version: 5,
        campaign: progress,
        inventory: {},
        equipment: {
          items: [
            {
              instanceId: "epic-pulse",
              definitionId: "pulse-laser-mk1",
              rarity: "epic",
            },
          ],
          loadout: {
            weapon: "epic-pulse",
            armor: null,
            shield: null,
            reactor: null,
            utility: null,
            drone: null,
            core: null,
          },
        },
        updatedAt: "2026-09-21T16:17:00.000Z",
        lastSaveReason: "equipment",
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migrated).toBe(true);
    expect(result.save.equipment.items[0]).toMatchObject({
      grade: "silver",
      enhancement: 0,
    });
  });

  it("imports and migrates a valid v6 backup", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 6;
    convertEquipmentToLegacyRarity(raw);
    delete raw.supportSpells;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.supportSpells.loadout).toEqual([
      "sanctuary",
      "gravity-well",
    ]);
  });

  it("rejects invalid or duplicate support spell loadout in v7", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.supportSpells = {
      unlocked: ["sanctuary", "gravity-well"],
      loadout: ["sanctuary", "sanctuary"],
    };

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result).toEqual({
      ok: false,
      error: "Support spell data contains an invalid or duplicate loadout.",
    });
  });

  it("imports and migrates a valid v7 backup", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 7;
    convertEquipmentToLegacyRarity(raw);
    delete raw.characters;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.characters).toMatchObject({
      selected: "vanguard",
      unlocked: ["vanguard"],
    });
    expect(result.save.characters.progress.vanguard.level).toBe(1);
  });

  it("imports and migrates a valid v8 character backup", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 8;
    convertEquipmentToLegacyRarity(raw);
    raw.characters = {
      selected: "vanguard",
      unlocked: ["vanguard"],
    };

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.characters.progress.vanguard.level).toBe(1);
  });

  it("imports and migrates a valid v9 Level/Mastery backup", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 9;
    convertEquipmentToLegacyRarity(raw);

    const characters = raw.characters as {
      selected: string;
      unlocked: string[];
      progress: Record<string, Record<string, unknown>>;
    };
    for (const progress of Object.values(characters.progress)) {
      delete progress.talents;
    }

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.characters.progress.vanguard.talents).toEqual({
      assault: 0,
      bulwark: 0,
      reactor: 0,
    });
  });

  it("imports and migrates a valid v10 backup to Luck pity state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 10;
    convertEquipmentToLegacyRarity(raw);
    delete raw.luckPity;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.luckPity).toEqual({
      golden: 0,
      treasure: 0,
      choice: 0,
      anomaly: 0,
    });
  });

  it("imports and migrates a valid v11 backup to hidden discovery state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 11;
    convertEquipmentToLegacyRarity(raw);
    delete raw.hiddenDiscovery;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.hiddenDiscovery).toMatchObject({
      discovered: [],
      lastRollStage: 0,
    });
  });

  it("imports and migrates a valid v12 backup to zero Credits", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 12;
    convertEquipmentToLegacyRarity(raw);
    delete raw.credits;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.credits).toBe(0);
  });

  it("imports and migrates a valid v13 backup to empty progression", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 13;
    convertEquipmentToLegacyRarity(raw);
    delete raw.progression;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.progression.claimedMissions).toEqual([]);
    expect(result.save.progression.unlockedAchievements).toEqual([]);
  });

  it("imports and migrates a valid v14 backup to M01 expansion state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 14;
    convertEquipmentToLegacyRarity(raw);
    delete raw.expansionCurrencies;
    delete raw.campaignExpansion;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.expansionCurrencies).toEqual({
      alloy: 0,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(result.save.campaignExpansion.checkpoint.stage).toBe(1);
  });

  it("imports and migrates a valid v15 backup to a checkpoint snapshot", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 15;
    convertEquipmentToLegacyRarity(raw);
    delete raw.checkpointSnapshot;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.checkpointSnapshot.campaign.selectedStage).toBe(1);
  });

  it("imports and migrates a valid v16 backup to empty crash recovery", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 16;
    convertEquipmentToLegacyRarity(raw);
    delete raw.crashRecoverySnapshot;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.crashRecoverySnapshot).toBeNull();
    expect(result.save.checkpointSnapshot.campaign.selectedStage).toBe(1);
  });

  it("imports and migrates a valid v17 backup to empty stage-entry state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 17;
    convertEquipmentToLegacyRarity(raw);
    delete raw.stageEntrySnapshot;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.stageEntrySnapshot).toBeNull();
    expect(result.save.crashRecoverySnapshot).toBeNull();
  });

  it("imports and migrates a valid v18 rarity backup to v19 grades", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 18;
    convertEquipmentToLegacyRarity(raw);

    const equipment = raw.equipment as {
      items: Array<Record<string, unknown>>;
    };
    equipment.items[0] = {
      ...equipment.items[0],
      rarity: "legendary",
      enhancement: 4,
    };

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.equipment.items[0]).toMatchObject({
      grade: "gold",
      enhancement: 4,
    });
    expect(result.save.stageEntrySnapshot).toBeNull();
  });

  it("imports and migrates a valid v19 backup to empty shop state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 19;
    delete raw.shops;

    const checkpoint = raw.checkpointSnapshot as Record<string, unknown>;
    delete checkpoint.shops;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.shops).toEqual({
      version: 1,
      instances: {},
    });
    expect(result.save.checkpointSnapshot.shops).toEqual({
      version: 1,
      instances: {},
    });
  });

  it("rejects legacy rarity fields in current v20 equipment", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    convertEquipmentToLegacyRarity(raw);

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Equipment data contains an invalid item or loadout reference.",
    });
  });

  it("rejects invalid current shop state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.shops = {
      version: 1,
      instances: {
        broken: {
          id: "different-id",
          type: "normal",
          worldKey: "world-01",
          stage: 1,
          sectorStart: 1,
          seed: 1,
          stock: [],
        },
      },
    };

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Shop state is invalid.",
    });
  });

  it("rejects invalid current expansion currencies", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.expansionCurrencies = {
      alloy: -1,
      starCrystal: 0,
      quantumCore: 0,
    };

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Expansion currencies must be non-negative whole numbers.",
    });
  });

  it("rejects invalid current campaign expansion state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    const expansion = raw.campaignExpansion as Record<string, unknown>;
    expansion.sector = { startStage: 11, endStage: 20 };

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Campaign expansion checkpoint/segment data is invalid.",
    });
  });

  it("rejects an invalid current checkpoint snapshot", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.checkpointSnapshot = { campaign: { selectedStage: 999 } };

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Committed checkpoint snapshot is invalid.",
    });
  });

  it("rejects an invalid current crash recovery snapshot", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.crashRecoverySnapshot = {
      state: {},
      savedAt: "2026-09-22T09:00:00.000Z",
      reason: "pagehide",
      deathInvalidated: false,
    };

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Crash recovery snapshot is invalid.",
    });
  });

  it("rejects an invalid current stage-entry snapshot", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.stageEntrySnapshot = {
      stage: 999,
      capturedAt: "2026-09-22T10:15:00.000Z",
      state: {},
    };

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Stage-entry snapshot is invalid.",
    });
  });

  it("rejects invalid current mission progression", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.progression = {
      counters: {
        stageClears: -1,
        highAccuracyClears: 0,
        shopPurchases: 0,
        equipmentDrops: 0,
      },
      claimedMissions: [],
      unlockedAchievements: [],
    };

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result).toEqual({
      ok: false,
      error: "Mission/Achievement progression data is invalid.",
    });
  });

  it("rejects invalid current Credits", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.credits = -1;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result).toEqual({
      ok: false,
      error: "Credits must be a non-negative whole number.",
    });
  });

  it("rejects invalid current hidden discovery state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    const hidden = raw.hiddenDiscovery as Record<string, unknown>;
    hidden.lastRollStage = -1;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result).toEqual({
      ok: false,
      error:
        "Hidden discovery data contains invalid unlock or drought state.",
    });
  });

  it("rejects invalid current Luck pity counters", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.luckPity = {
      golden: 0,
      treasure: -1,
      choice: 0,
      anomaly: 0,
    };

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result).toEqual({
      ok: false,
      error: "Luck pity data contains invalid drought counters.",
    });
  });

  it("rejects invalid current character state", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.characters = {
      selected: "aegis",
      unlocked: ["vanguard"],
    };

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result).toEqual({
      ok: false,
      error: "Character data contains an invalid selection or unlock list.",
    });
  });

  it("rejects invalid equipment/loadout references in v4", () => {
    const progress = createDefaultCampaignProgress();
    const invalid = parsePlayerSaveJson(
      JSON.stringify({
        version: PLAYER_SAVE_VERSION,
        campaign: progress,
        inventory: {},
        equipment: {
          items: [
            {
              instanceId: "bad",
              definitionId: "pulse-laser-mk1",
            },
          ],
          loadout: {
            weapon: null,
            armor: "bad",
            shield: null,
            reactor: null,
            utility: null,
            drone: null,
            core: null,
          },
        },
        updatedAt: "2026-09-21T15:45:30.000Z",
        lastSaveReason: "manual",
      }),
    );

    expect(invalid).toEqual({
      ok: false,
      error: "Equipment data contains an invalid item or loadout reference.",
    });
  });

  it("imports a valid v24 backup into v25 Ascension state", () => {
    const completed = recordStageClear(
      createDefaultCampaignProgress(),
      1000,
      {
        score: 8000,
        accuracy: 99.4,
        wpm: 105,
        clearedAt: "2026-09-22T18:46:00.000Z",
      },
    );
    const current = createPlayerSave(completed);
    const raw = {
      ...current,
      version: 24,
    } as Record<string, unknown>;
    delete raw.ascension;

    const result = parsePlayerSaveJson(JSON.stringify(raw));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrated).toBe(true);
      expect(result.save.version).toBe(PLAYER_SAVE_VERSION);
      expect(result.save.ascension).toEqual({
        version: 1,
        highestUnlockedTier: 1,
        selectedTier: 0,
        completedTiers: [],
        frontierByTier: { "1": 1 },
      });
    }
  });

  it("imports a valid v25 backup into v26 with the legacy-compatible hotbar", () => {
    const current = createPlayerSave(createDefaultCampaignProgress());
    const raw = {
      ...current,
      version: 25,
    } as Record<string, unknown>;
    delete raw.hotbar;

    const result = parsePlayerSaveJson(JSON.stringify(raw));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrated).toBe(true);
      expect(result.save.version).toBe(PLAYER_SAVE_VERSION);
      expect(result.save.hotbar.slots[0]).toEqual({
        kind: "item",
        id: "repair-kit",
      });
      expect(result.save.hotbar.slots[8]).toEqual({
        kind: "skill",
        id: "emp-burst",
      });
    }
  });

  it("still validates v25 checkpoint data before migrating the hotbar", () => {
    const current = createPlayerSave(createDefaultCampaignProgress());
    const raw = {
      ...current,
      version: 25,
      checkpointSnapshot: { stage: 999, state: {} },
    } as Record<string, unknown>;
    delete raw.hotbar;

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Committed checkpoint snapshot is invalid.",
    });
  });

  it("rejects invalid current-version hotbar data", () => {
    const raw = createPlayerSave(createDefaultCampaignProgress()) as unknown as Record<
      string,
      unknown
    >;
    raw.hotbar = {
      version: 1,
      slots: [
        { kind: "item", id: "repair-kit" },
        { kind: "item", id: "repair-kit" },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    };

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Hotbar loadout is invalid.",
    });
  });

  it("rejects invalid current-version Ascension data", () => {
    const raw = createPlayerSave(createDefaultCampaignProgress()) as unknown as Record<
      string,
      unknown
    >;
    raw.ascension = {
      version: 1,
      highestUnlockedTier: 1,
      selectedTier: 9,
      completedTiers: [],
    };

    expect(parsePlayerSaveJson(JSON.stringify(raw))).toEqual({
      ok: false,
      error: "Ascension state is invalid.",
    });
  });

  it("exports selected Ascension state in the current backup", () => {
    const progress = recordStageClear(
      createDefaultCampaignProgress(),
      1000,
      {
        score: 9000,
        accuracy: 100,
        wpm: 110,
        clearedAt: "2026-09-22T18:47:00.000Z",
      },
    );
    const state = {
      version: 1 as const,
      highestUnlockedTier: 2,
      selectedTier: 2,
      completedTiers: [1],
      frontierByTier: {
        "1": 1000,
        "2": 1,
      },
    };
    const args = createPlayerSave(progress);
    const json = exportPlayerSaveJson(
      progress,
      "2026-09-22T18:48:00.000Z",
      args.inventory,
      args.equipment,
      args.supportSpells,
      args.characters,
      args.luckPity,
      args.hiddenDiscovery,
      args.credits,
      args.progression,
      args.expansionCurrencies,
      args.campaignExpansion,
      args.checkpointSnapshot,
      args.crashRecoverySnapshot,
      args.stageEntrySnapshot,
      args.shops,
      args.route,
      args.upgrades,
      args.relics,
      args.codex,
      state,
    );

    const parsed = JSON.parse(json) as {
      ascension: {
        highestUnlockedTier: number;
        selectedTier: number;
        completedTiers: number[];
      };
    };
    expect(parsed.ascension).toEqual(state);
  });

  it("rejects corrupted best-result values", () => {
    const progress = createDefaultCampaignProgress();
    const invalid = parsePlayerSaveJson(
      JSON.stringify({
        version: PLAYER_SAVE_VERSION,
        campaign: {
          ...progress,
          bestByStage: {
            "1": {
              score: -10,
              accuracy: 120,
              wpm: -1,
              clearedAt: "",
            },
          },
        },
        updatedAt: "2026-09-21T15:45:00.000Z",
        lastSaveReason: "manual",
      }),
    );

    expect(invalid.ok).toBe(false);
  });
});
