import { describe, expect, it } from "vitest";
import {
  exportPlayerSaveJson,
  parsePlayerSaveJson,
} from "../src/persistence/backup";
import {
  createDefaultCampaignProgress,
  recordStageClear,
} from "../src/campaign/progress";
import { PLAYER_SAVE_VERSION } from "../src/persistence/player-save";

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
      error: "Unsupported save version. Supported versions: 1-14.",
    });
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
    expect(result.save.equipment.items[0]?.rarity).toBe("common");
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
      rarity: "epic",
      enhancement: 0,
    });
  });

  it("imports and migrates a valid v6 backup", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 6;
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
    delete raw.credits;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.credits).toBe(0);
  });

  it("imports and migrates a valid v13 backup to empty meta progression", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.version = 13;
    raw.credits = 444;
    delete raw.metaProgress;

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migrated).toBe(true);
    expect(result.save.credits).toBe(444);
    expect(result.save.metaProgress).toEqual({
      achievements: [],
      completedMissions: [],
      discoveredEnemies: [],
      discoveredBossStages: [],
    });
  });

  it("rejects invalid current meta progression", () => {
    const raw = JSON.parse(
      exportPlayerSaveJson(createDefaultCampaignProgress()),
    ) as Record<string, unknown>;
    raw.metaProgress = {
      achievements: ["bad"],
      completedMissions: [],
      discoveredEnemies: [],
      discoveredBossStages: [],
    };

    const result = parsePlayerSaveJson(JSON.stringify(raw));
    expect(result).toEqual({
      ok: false,
      error: "Meta progression data is invalid.",
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
