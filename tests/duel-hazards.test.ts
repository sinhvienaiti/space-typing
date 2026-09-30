import { describe, expect, it } from "vitest";
import {
  resolveDuelCataclysm,
  resolveDuelHazard,
} from "../src/duel/hazards";
import { DUEL_MAPS } from "../src/duel/maps";
import { DuelEngine } from "../src/duel/engine";
import type {
  DuelHazardEvent,
} from "../src/duel/director";

function event(
  hazardId: DuelHazardEvent["hazardId"],
  pressure = 1,
): DuelHazardEvent {
  return {
    sequence: 1,
    mapId: "inferno-rift",
    hazardId,
    phase: "war",
    pressure,
    telegraphSeconds: 1.5,
    protectionSeconds: 2,
    symmetry: "symmetric",
  };
}

describe("Duel map hazard gameplay", () => {
  it("resolves every configured hazard without unbounded direct damage", () => {
    for (const map of Object.values(DUEL_MAPS)) {
      for (const hazard of map.hazards) {
        const resolution = resolveDuelHazard(
          event(hazard.id, 1.6),
          {
            "player-1": 0,
            "player-2": 0,
          },
        );

        for (const effect of resolution.effects) {
          if (effect.type === "damage") {
            expect(effect.amount).toBeLessThanOrEqual(8);
          }
          if (effect.type === "energy-cost") {
            expect(effect.amount).toBeLessThanOrEqual(7);
          }
        }
      }
    }
  });

  it("keeps neutral hazard direct effects symmetric without map control", () => {
    const resolution = resolveDuelHazard(
      event("lava-burst", 1),
      {
        "player-1": 0,
        "player-2": 0,
      },
    );
    const damage = resolution.effects.filter(
      (effect) => effect.type === "damage",
    );

    expect(damage).toHaveLength(2);
    expect(damage[0]?.amount).toBe(damage[1]?.amount);
  });

  it("lets earned map-control pressure mitigate hazard impact without immunity", () => {
    const resolution = resolveDuelHazard(
      event("frozen-meteor", 1),
      {
        "player-1": 0.8,
        "player-2": 0,
      },
    );
    const damage = resolution.effects.filter(
      (effect) => effect.type === "damage",
    );
    const p1 = damage.find(
      (effect) => effect.targetId === "player-1",
    );
    const p2 = damage.find(
      (effect) => effect.targetId === "player-2",
    );

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p1!.amount).toBeLessThan(p2!.amount);
    expect(p1!.amount).toBeGreaterThan(0);
  });

  it("uses Cataclysm for battlefield pressure instead of random direct lethal damage", () => {
    const resolution = resolveDuelCataclysm({
      sequence: 1,
      mapId: "celestial-void",
      cataclysmId: "reality-collapse",
      displayLabel: "REALITY COLLAPSE",
      pressureMultiplier: 1.7,
    });

    expect(resolution.effects).toEqual([]);
    expect(resolution.tacticalEffects.length).toBeGreaterThan(0);
    expect(
      resolution.tacticalEffects.every(
        (effect) =>
          effect.effectId === "projectile-drag" ||
          effect.effectId === "offer-drift",
      ),
    ).toBe(true);
  });

  it("applies Director hazard effects through the authoritative engine batch", () => {
    const engine = new DuelEngine({
      mapId: "inferno-rift",
      matchSeed: 18,
      regulationSeconds: 40,
      maxShield: 0,
      startingShield: 0,
    });

    engine.step(10);
    const before = engine.snapshot();
    const events = engine.step(2);
    const after = engine.snapshot();

    expect(
      events.some((entry) => entry.type === "map-hazard"),
    ).toBe(true);
    expect(after.players["player-1"].hull).toBeLessThan(
      before.players["player-1"].hull,
    );
    expect(after.players["player-2"].hull).toBeCloseTo(
      after.players["player-1"].hull,
      8,
    );
  });

  it("never changes hazard gameplay by visual quality because quality is absent from resolver", () => {
    const source = resolveDuelHazard(
      event("black-hole", 1.2),
      {
        "player-1": 0,
        "player-2": 0,
      },
    );
    expect(source.tacticalEffects.length).toBeGreaterThan(0);
    expect(
      JSON.stringify(source),
    ).not.toContain("quality");
  });
});
