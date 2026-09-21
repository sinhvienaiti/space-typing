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
    );
    const parsed = JSON.parse(json) as {
      version: number;
      campaign: { highestUnlockedStage: number };
      lastSaveReason: string;
    };

    expect(parsed.version).toBe(PLAYER_SAVE_VERSION);
    expect(parsed.campaign.highestUnlockedStage).toBe(2);
    expect(parsed.lastSaveReason).toBe("manual");
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
      error: "Unsupported save version. Supported versions: 1-2.",
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
