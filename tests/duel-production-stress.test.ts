import { describe, expect, it } from "vitest";
import { DuelLocalPracticeMatch } from "../src/duel/local-match";
import {
  DUEL_MAPS,
  type DuelMapId,
} from "../src/duel/maps";
import { createPracticeDuelRoom } from "../src/duel/room";

const MAP_IDS = Object.keys(DUEL_MAPS) as DuelMapId[];

function stressRoom(mapId: DuelMapId) {
  const base = createPracticeDuelRoom({
    roomId: "STRESS-" + mapId,
    participantId: "human",
    displayName: "Stress Pilot",
    mapId,
    bot: {
      wpm: 105,
      accuracy: 0.96,
      reactionMs: 110,
      personality: "tactician",
    },
  }).snapshot();

  return {
    ...base,
    settings: {
      ...base.settings,
      hazardLevel: "high" as const,
      mysteryFrequency: "high" as const,
      fateFrequency: "high" as const,
      modifier: "high-hazard" as const,
    },
  };
}

function expectBounded(
  value: number,
  min: number,
  max: number,
): void {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

describe("Duel FINAL V3 production stress", () => {
  it("keeps all maps bounded through high-hazard Cataclysm runtime", () => {
    for (const [index, mapId] of MAP_IDS.entries()) {
      const match = new DuelLocalPracticeMatch({
        room: stressRoom(mapId),
        seed: 9000 + index,
      });

      const crisis = match.advanceToPhaseForTestLab("crisis");
      expect(crisis.view.phase).toBe("crisis");
      expect(crisis.view.map.id).toBe(mapId);
      expect(crisis.view.round.status).toBe("active");

      const cataclysm =
        match.advanceToPhaseForTestLab("cataclysm");
      expect(cataclysm.view.phase).toBe("cataclysm");
      expect(
        cataclysm.events.some(
          (event) => event.type === "map-cataclysm",
        ),
      ).toBe(true);

      let update = cataclysm;
      for (let frame = 0; frame < 240; frame += 1) {
        if (update.view.series.status !== "active") break;
        update = match.tick(0.05);
      }

      const view = update.view;
      expect(view.map.id).toBe(mapId);
      expectBounded(
        view.self.hull,
        0,
        view.self.maxHull,
      );
      expectBounded(
        view.self.shield,
        0,
        view.self.maxShield,
      );
      expectBounded(
        view.self.energy,
        0,
        view.self.maxEnergy,
      );
      expectBounded(
        view.opponent.hull,
        0,
        view.opponent.maxHull,
      );
      expectBounded(
        view.opponent.shield,
        0,
        view.opponent.maxShield,
      );
      expectBounded(
        view.opponent.energy,
        0,
        view.opponent.maxEnergy,
      );
      expect(view.self.offers.length).toBeLessThanOrEqual(5);
      expect(view.self.inventory.attack.length).toBeLessThanOrEqual(3);
      expect(view.self.inventory.defense.length).toBeLessThanOrEqual(2);
      expect(view.self.inventory.tactical.length).toBeLessThanOrEqual(2);
      expect(
        view.shared.tactical.projectileSpeedScale["player-1"],
      ).toBeGreaterThanOrEqual(0.5);
      expect(
        view.shared.tactical.projectileSpeedScale["player-2"],
      ).toBeGreaterThanOrEqual(0.5);
      expect(
        view.shared.tactical.offerDriftScale["player-1"],
      ).toBeGreaterThanOrEqual(0.5);
      expect(
        view.shared.tactical.offerDriftScale["player-2"],
      ).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("replays the same stressed local match deterministically", () => {
    const room = stressRoom("celestial-void");
    const left = new DuelLocalPracticeMatch({
      room,
      seed: 424242,
    });
    const right = new DuelLocalPracticeMatch({
      room,
      seed: 424242,
    });

    left.advanceToPhaseForTestLab("cataclysm");
    right.advanceToPhaseForTestLab("cataclysm");

    for (let frame = 0; frame < 180; frame += 1) {
      const a = left.tick(0.05);
      const b = right.tick(0.05);
      expect(a.events).toEqual(b.events);
      expect(a.view).toEqual(b.view);
      if (
        a.view.series.status !== "active" ||
        b.view.series.status !== "active"
      ) {
        break;
      }
    }
  });
});
