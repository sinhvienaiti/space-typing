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

  it("uses earned map control to mitigate contest tactical hazards", () => {
    const hazard = event("static-field", 1);
    hazard.mapId = "tempest-prime";
    hazard.symmetry = "contest";

    const resolution = resolveDuelHazard(
      hazard,
      {
        "player-1": 0.8,
        "player-2": 0,
      },
    );
    const p1 = resolution.tacticalEffects.find(
      (effect) => effect.targetPlayerId === "player-1",
    );
    const p2 = resolution.tacticalEffects.find(
      (effect) => effect.targetPlayerId === "player-2",
    );

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p1!.effectId).toBe("offer-drift");
    expect(p1!.strength).toBeLessThan(p2!.strength);
    expect(p1!.strength).toBeGreaterThan(0);
  });

  it("shortens contest target-freeze duration when map control was earned", () => {
    const hazard = event("freeze-lock", 1);
    hazard.mapId = "frost-wastes";
    hazard.symmetry = "contest";

    const resolution = resolveDuelHazard(
      hazard,
      {
        "player-1": 0.8,
        "player-2": 0,
      },
    );
    const p1 = resolution.tacticalEffects.find(
      (effect) => effect.targetPlayerId === "player-1",
    );
    const p2 = resolution.tacticalEffects.find(
      (effect) => effect.targetPlayerId === "player-2",
    );

    expect(p1?.effectId).toBe("target-freeze");
    expect(p2?.effectId).toBe("target-freeze");
    expect(p1!.remainingSeconds).toBeLessThan(
      p2!.remainingSeconds,
    );
    expect(p1!.remainingSeconds).toBeGreaterThan(0);
  });

  it("keeps symmetric tactical hazards equivalent on both sides", () => {
    const hazard = event("cyclone", 1);
    hazard.mapId = "tempest-prime";
    hazard.symmetry = "symmetric";

    const resolution = resolveDuelHazard(
      hazard,
      {
        "player-1": 0.9,
        "player-2": 0,
      },
    );
    const p1 = resolution.tacticalEffects.find(
      (effect) => effect.targetPlayerId === "player-1",
    );
    const p2 = resolution.tacticalEffects.find(
      (effect) => effect.targetPlayerId === "player-2",
    );

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p1!.strength).toBeCloseTo(p2!.strength, 8);
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

  it("telegraphs Director hazards before impact and preserves warning state for reconnect", () => {
    const engine = new DuelEngine({
      mapId: "inferno-rift",
      matchSeed: 18,
      regulationSeconds: 40,
      maxShield: 0,
      startingShield: 0,
    });

    let telegraph:
      | Extract<
          ReturnType<DuelEngine["step"]>[number],
          { type: "map-hazard-telegraph" }
        >
      | undefined;
    for (let second = 0; second < 30; second += 1) {
      const events = engine.step(1);
      telegraph = events.find(
        (entry) => entry.type === "map-hazard-telegraph",
      );
      if (telegraph !== undefined) break;
    }
    expect(telegraph).toBeDefined();
    const warned = engine.snapshot();
    expect(warned.pendingHazards).toHaveLength(1);
    expect(
      warned.pendingHazards[0]?.remainingSeconds,
    ).toBeGreaterThan(0);

    const beforeHull =
      warned.players["player-1"].hull;
    const events = engine.step(
      telegraph!.hazard.telegraphSeconds + 0.01,
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "map-hazard",
        hazard: expect.objectContaining({
          sequence: telegraph!.hazard.sequence,
        }),
      }),
    );
    expect(engine.snapshot().pendingHazards).toHaveLength(0);
    expect(
      engine.snapshot().players["player-1"].hull,
    ).toBeLessThanOrEqual(beforeHull);
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
    let events = engine.step(2);
    if (
      !events.some((entry) => entry.type === "map-hazard")
    ) {
      events = engine.step(3);
    }
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

  it("enforces a target-protection window after a freeze hazard", () => {
    const engine = new DuelEngine({
      mapId: "frost-wastes",
      matchSeed: 51,
    });
    const freeze: DuelHazardEvent = {
      sequence: 1,
      mapId: "frost-wastes",
      hazardId: "freeze-lock",
      phase: "crisis",
      pressure: 1,
      telegraphSeconds: 1.8,
      protectionSeconds: 2.3,
      symmetry: "contest",
    };

    engine.applyHazardEvent(freeze);
    expect(
      engine.snapshot().tactical.frozenTargetCount["player-1"],
    ).toBe(1);

    engine.applyHazardEvent({
      ...freeze,
      sequence: 2,
    });
    expect(
      engine.snapshot().tactical.frozenTargetCount["player-1"],
    ).toBe(1);

    engine.step(2.3);
    expect(
      engine.snapshot().tactical.frozenTargetCount["player-1"],
    ).toBe(0);

    engine.applyHazardEvent({
      ...freeze,
      sequence: 3,
    });
    expect(
      engine.snapshot().tactical.frozenTargetCount["player-1"],
    ).toBe(0);

    engine.step(2.3);
    engine.applyHazardEvent({
      ...freeze,
      sequence: 4,
    });
    expect(
      engine.snapshot().tactical.frozenTargetCount["player-1"],
    ).toBe(1);
  });

  it("supports deterministic direct hazard injection for Duel Test Lab and replay QA", () => {
    const engine = new DuelEngine({
      mapId: "celestial-void",
      matchSeed: 7,
      startingShield: 20,
      startingEnergy: 60,
    });

    const before = engine.snapshot();
    const events = engine.applyHazardEvent({
      sequence: 99,
      mapId: "celestial-void",
      hazardId: "black-hole",
      phase: "war",
      pressure: 1.2,
      telegraphSeconds: 1.5,
      protectionSeconds: 2,
      symmetry: "symmetric",
    });
    const after = engine.snapshot();

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "map-hazard",
        hazard: expect.objectContaining({
          hazardId: "black-hole",
        }),
      }),
    );
    expect(
      after.tactical.projectileSpeedScale["player-1"],
    ).toBeLessThan(
      before.tactical.projectileSpeedScale["player-1"],
    );
    expect(
      after.tactical.projectileSpeedScale["player-1"],
    ).toBeCloseTo(
      after.tactical.projectileSpeedScale["player-2"],
      8,
    );
  });

  it("supports direct Cataclysm injection without hidden direct lethal damage", () => {
    const engine = new DuelEngine({
      mapId: "celestial-void",
      matchSeed: 11,
    });
    const before = engine.snapshot();

    const events = engine.applyCataclysmEvent({
      sequence: 100,
      mapId: "celestial-void",
      cataclysmId: "reality-collapse",
      displayLabel: "REALITY COLLAPSE",
      pressureMultiplier: 1.7,
    });
    const after = engine.snapshot();

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "map-cataclysm",
      }),
    );
    expect(after.players["player-1"].hull).toBe(
      before.players["player-1"].hull,
    );
    expect(after.players["player-2"].hull).toBe(
      before.players["player-2"].hull,
    );
    expect(
      after.tactical.offerDriftScale["player-1"],
    ).toBeLessThan(1);
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
