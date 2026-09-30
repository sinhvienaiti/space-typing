import { describe, expect, it } from "vitest";
import { DuelMapDirector } from "../src/duel/director";
import { DuelEngine } from "../src/duel/engine";
import { normalizedDuelCategoryWeights } from "../src/duel/draft";
import {
  DUEL_MAPS,
  duelMapProfile,
  type DuelMapId,
} from "../src/duel/maps";

const MAP_IDS = Object.keys(DUEL_MAPS) as DuelMapId[];

describe("Duel M-DUEL-06 maps and director", () => {
  it("defines six mechanically distinct FINAL V3 maps", () => {
    expect(MAP_IDS).toHaveLength(6);
    expect(new Set(MAP_IDS.map((id) => DUEL_MAPS[id].controlObjective.id)).size).toBe(6);
    expect(new Set(MAP_IDS.map((id) => DUEL_MAPS[id].cataclysm.id)).size).toBe(6);
    for (const id of MAP_IDS) {
      const map = duelMapProfile(id);
      expect(map.hazards).toHaveLength(5);
      expect(map.wordAffinity.length).toBeGreaterThanOrEqual(3);
      expect(map.mysteryLabels.length).toBeGreaterThanOrEqual(2);
      expect(map.audioProfileId).not.toBe("");
      expect(map.visualIdentityId).not.toBe("");
    }
  });

  it("changes category affinity by map instead of acting as a reskin", () => {
    expect(
      DUEL_MAPS["frost-wastes"].categoryMultiplier.defense,
    ).toBeGreaterThan(1);
    expect(
      DUEL_MAPS["inferno-rift"].categoryMultiplier.attack,
    ).toBeGreaterThan(1);
    expect(
      DUEL_MAPS["tempest-prime"].categoryMultiplier.tactical,
    ).toBeGreaterThan(1);
    expect(
      DUEL_MAPS["ocean-abyss"].categoryMultiplier.support,
    ).toBeGreaterThan(1);
    expect(
      DUEL_MAPS["celestial-void"].categoryMultiplier.mystery,
    ).toBeGreaterThan(1);
  });

  it("feeds map affinity into offer category weights", () => {
    const frost = normalizedDuelCategoryWeights(
      "war",
      ["attack", "defense", "support", "tactical"],
      DUEL_MAPS["frost-wastes"].categoryMultiplier,
    );
    const inferno = normalizedDuelCategoryWeights(
      "war",
      ["attack", "defense", "support", "tactical"],
      DUEL_MAPS["inferno-rift"].categoryMultiplier,
    );
    const voidWeights = normalizedDuelCategoryWeights(
      "war",
      ["attack", "defense", "support", "tactical", "fate", "mystery"],
      DUEL_MAPS["celestial-void"].categoryMultiplier,
    );

    expect(frost.defense).toBeGreaterThan(inferno.defense);
    expect(inferno.attack).toBeGreaterThan(frost.attack);
    expect(voidWeights.mystery).toBeGreaterThan(0);
    expect(voidWeights.fate).toBeGreaterThan(0);
  });

  it("replays the same hazard order for the same map and seed", () => {
    const a = new DuelMapDirector({
      mapId: "tempest-prime",
      matchSeed: 500,
      contentVersion: "v3",
    });
    const b = new DuelMapDirector({
      mapId: "tempest-prime",
      matchSeed: 500,
      contentVersion: "v3",
    });

    const left = [];
    const right = [];
    for (let second = 0; second < 90; second += 1) {
      left.push(...a.update(1, "war"));
      right.push(...b.update(1, "war"));
    }
    expect(left).toEqual(right);
  });

  it("keeps BUILD calm and increases event cadence later", () => {
    const director = new DuelMapDirector({
      mapId: "inferno-rift",
      matchSeed: 88,
      contentVersion: "v3",
    });
    let buildHazards = 0;
    for (let second = 0; second < 60; second += 1) {
      buildHazards += director
        .update(1, "build")
        .filter((event) => event.type === "hazard").length;
    }
    expect(buildHazards).toBe(0);

    director.resetRound();
    let skirmish = 0;
    for (let second = 0; second < 60; second += 1) {
      skirmish += director
        .update(1, "skirmish")
        .filter((event) => event.type === "hazard").length;
    }

    director.resetRound();
    let crisis = 0;
    for (let second = 0; second < 60; second += 1) {
      crisis += director
        .update(1, "crisis")
        .filter((event) => event.type === "hazard").length;
    }
    expect(crisis).toBeGreaterThan(skirmish);
  });

  it("integrates the selected map into DuelEngine snapshot and events", () => {
    const engine = new DuelEngine({
      mapId: "tempest-prime",
      matchSeed: 123,
      regulationSeconds: 40,
    });

    expect(engine.snapshot().map.id).toBe("tempest-prime");
    expect(
      engine.snapshot().map.controlObjective.id,
    ).toBe("storm-core");

    let sawHazard = false;
    for (let second = 0; second < 30; second += 1) {
      const events = engine.step(1);
      if (events.some((event) => event.type === "map-hazard")) {
        sawHazard = true;
        break;
      }
    }
    expect(sawHazard).toBe(true);

    const cataclysmEvents = engine.step(20);
    expect(cataclysmEvents).toContainEqual(
      expect.objectContaining({
        type: "map-cataclysm",
        cataclysm: expect.objectContaining({
          cataclysmId: "eye-of-the-storm",
        }),
      }),
    );
  });

  it("emits each map Cataclysm once per round", () => {
    const director = new DuelMapDirector({
      mapId: "celestial-void",
      matchSeed: 9,
      contentVersion: "v3",
    });
    const first = director.update(0, "cataclysm");
    const second = director.update(0, "cataclysm");

    expect(first).toContainEqual(
      expect.objectContaining({
        type: "cataclysm",
        cataclysm: expect.objectContaining({
          cataclysmId: "reality-collapse",
        }),
      }),
    );
    expect(
      second.filter((event) => event.type === "cataclysm"),
    ).toHaveLength(0);
  });

  it("only schedules hazards legal for the current phase", () => {
    const director = new DuelMapDirector({
      mapId: "frost-wastes",
      matchSeed: 99,
      contentVersion: "v3",
    });
    const hazards = [];
    for (let second = 0; second < 120; second += 1) {
      hazards.push(
        ...director
          .update(1, "skirmish")
          .filter((event) => event.type === "hazard")
          .map((event) =>
            event.type === "hazard" ? event.hazard.hazardId : "",
          ),
      );
    }
    expect(hazards.length).toBeGreaterThan(0);
    expect(hazards.every((id) => id === "blizzard")).toBe(true);
  });
});
