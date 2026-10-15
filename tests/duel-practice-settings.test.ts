import { describe, expect, it } from "vitest";
import { DuelLocalPracticeMatch } from "../src/duel/local-match";
import { createPracticeDuelRoom } from "../src/duel/room";
import type { DuelMapId } from "../src/duel/maps";

const DUEL_MAP_IDS: readonly DuelMapId[] = ["frost-wastes", "inferno-rift", "tempest-prime", "ocean-abyss", "terra-core", "celestial-void"];

describe("Practice vs Bot honours the lobby settings", () => {
  it("plays a random map when Map mode is Random (it was always the fixed map)", () => {
    const room = createPracticeDuelRoom({
      roomId: "LOCAL-RND",
      participantId: "local-player",
      displayName: "Pilot",
      mapId: "frost-wastes",
      settings: { mapSelection: { mode: "random", pool: [...DUEL_MAP_IDS] }, roundFormat: 5 },
    }).snapshot();
    const maps = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      const view = new DuelLocalPracticeMatch({ room, seed }).initial().view;
      maps.add(view.map.id);
      expect(view.series.format).toBe(5);
    }
    expect(maps.size).toBeGreaterThanOrEqual(4);
  });

  it("keeps the chosen map in Fixed mode", () => {
    const room = createPracticeDuelRoom({
      roomId: "LOCAL-FIX",
      participantId: "local-player",
      displayName: "Pilot",
      settings: { mapSelection: { mode: "fixed", mapId: "ocean-abyss" } },
    }).snapshot();
    expect(new DuelLocalPracticeMatch({ room, seed: 7 }).initial().view.map.id).toBe("ocean-abyss");
  });
});
