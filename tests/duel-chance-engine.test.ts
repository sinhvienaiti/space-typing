import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import type { DuelActionOffer } from "../src/duel/model";

function completeOffer(
  engine: DuelEngine,
  actionId: string,
  answerToken: string,
  startSequence = 1,
): ReturnType<DuelEngine["step"]> {
  const offer: DuelActionOffer = {
    instanceId: "player-1:0:" + actionId,
    actionId,
    ownerId: "player-1",
    status: "available",
    typedPrefix: "",
    slotIndex: 0,
    shared: false,
  };
  engine.setPrivateOffers("player-1", [offer]);
  engine.enqueueIntent({
    type: "SELECT_TARGET",
    playerId: "player-1",
    sequence: startSequence,
    targetInstanceId: offer.instanceId,
  });
  let sequence = startSequence + 1;
  for (const char of answerToken) {
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: sequence++,
      char,
      targetInstanceId: offer.instanceId,
    });
  }
  return engine.step(0);
}

describe("DuelEngine M-DUEL-05 chance integration", () => {
  it("keeps Fate deterministic inside the authoritative engine", () => {
    const a = new DuelEngine({
      matchSeed: 1234,
      maxShield: 100,
      startingShield: 0,
      startingEnergy: 0,
    });
    const b = new DuelEngine({
      matchSeed: 1234,
      maxShield: 100,
      startingShield: 0,
      startingEnergy: 0,
    });

    const left = Array.from({ length: 12 }, () =>
      a.resolveFate("player-1"),
    );
    const right = Array.from({ length: 12 }, () =>
      b.resolveFate("player-1"),
    );

    expect(left).toEqual(right);
    expect(a.snapshot().chance.pity).toEqual(
      b.snapshot().chance.pity,
    );
  });

  it("does not leak exact Mystery outcome through the engine snapshot", () => {
    const engine = new DuelEngine({ matchSeed: 55 });
    const created = engine.createMystery();
    const event = created[0];
    expect(event?.type).toBe("mystery-created");
    if (event?.type !== "mystery-created") return;

    const publicMystery = engine.snapshot().chance.mysteries[0]!;
    expect(publicMystery.id).toBe(event.mystery.id);
    expect(publicMystery.riskTag).toBeDefined();
    expect("category" in publicMystery).toBe(false);
    expect("outcomeId" in publicMystery).toBe(false);
  });

  it("reveals only the requested Mystery information tier", () => {
    const engine = new DuelEngine({ matchSeed: 77 });
    const created = engine.createMystery()[0];
    if (created?.type !== "mystery-created") {
      throw new Error("Missing mystery-created event.");
    }

    const risk = engine.revealMystery(
      "player-1",
      created.mystery.id,
      "risk",
    )[0];
    const category = engine.revealMystery(
      "player-1",
      created.mystery.id,
      "category",
    )[0];
    const exact = engine.revealMystery(
      "player-1",
      created.mystery.id,
      "exact",
    )[0];

    expect(risk).toEqual(
      expect.objectContaining({
        type: "mystery-revealed",
        reveal: expect.not.objectContaining({
          category: expect.anything(),
          outcomeId: expect.anything(),
        }),
      }),
    );
    if (category?.type !== "mystery-revealed") {
      throw new Error("Missing category reveal.");
    }
    expect(category.reveal.category).toBeDefined();
    expect(category.reveal.outcomeId).toBeUndefined();

    if (exact?.type !== "mystery-revealed") {
      throw new Error("Missing exact reveal.");
    }
    expect(exact.reveal.category).toBeDefined();
    expect(exact.reveal.outcomeId).toBeDefined();
  });

  it("resolves a Mystery exactly once through bounded engine effects", () => {
    const engine = new DuelEngine({
      matchSeed: 901,
      maxHull: 100,
      maxShield: 100,
      maxEnergy: 100,
      startingShield: 50,
      startingEnergy: 50,
    });
    const created = engine.createMystery()[0];
    if (created?.type !== "mystery-created") {
      throw new Error("Missing mystery-created event.");
    }

    const before = engine.snapshot().players["player-1"];
    const events = engine.resolveMystery(
      "player-1",
      created.mystery.id,
    );
    const after = engine.snapshot().players["player-1"];

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("mystery-resolved");
    expect(
      engine.resolveMystery("player-1", created.mystery.id),
    ).toEqual([]);
    expect(after.hull).toBeGreaterThanOrEqual(90);
    expect(after.hull).toBeLessThanOrEqual(100);
    expect(after.shield).toBeGreaterThanOrEqual(40);
    expect(after.shield).toBeLessThanOrEqual(100);
    expect(after.energy).toBeGreaterThanOrEqual(34);
    expect(after.energy).toBeLessThanOrEqual(100);
    expect(before.hull).toBe(100);
  });

  it("makes offer-reshuffle change battlefield lanes without deleting offer value", () => {
    let exercised = false;

    for (let seed = 1; seed <= 80; seed += 1) {
      const engine = new DuelEngine({
        matchSeed: seed,
        mapId: "frost-wastes",
      });
      engine.setPrivateOffers("player-1", [
        {
          instanceId: "p1:0:laser",
          actionId: "laser",
          ownerId: "player-1",
          status: "available",
          typedPrefix: "",
          slotIndex: 0,
          shared: false,
        },
        {
          instanceId: "p1:1:shield",
          actionId: "shield",
          ownerId: "player-1",
          status: "available",
          typedPrefix: "",
          slotIndex: 1,
          shared: false,
        },
        {
          instanceId: "p1:2:energy",
          actionId: "energy",
          ownerId: "player-1",
          status: "available",
          typedPrefix: "",
          slotIndex: 2,
          shared: false,
        },
      ]);

      const created = engine.createMystery()[0];
      if (created?.type !== "mystery-created") continue;
      const reveal = engine.revealMystery(
        "player-1",
        created.mystery.id,
        "exact",
      )[0];
      if (
        reveal?.type !== "mystery-revealed" ||
        reveal.reveal.outcomeId !== "offer-reshuffle"
      ) {
        continue;
      }

      const before = engine
        .snapshot()
        .players["player-1"].offers
        .map((offer) => offer.actionId);
      engine.resolveMystery(
        "player-1",
        created.mystery.id,
      );
      const after = engine
        .snapshot()
        .players["player-1"].offers
        .map((offer) => offer.actionId);

      expect(before).toEqual([
        "laser",
        "shield",
        "energy",
      ]);
      expect(after).toEqual([
        "energy",
        "shield",
        "laser",
      ]);
      expect(new Set(after)).toEqual(new Set(before));
      exercised = true;
      break;
    }

    expect(exercised).toBe(true);
  });

  it("turns world-fracture Mystery into symmetric bounded battlefield pressure", () => {
    let exercised = false;

    for (let seed = 1; seed <= 160; seed += 1) {
      const engine = new DuelEngine({
        matchSeed: seed,
        mapId: "celestial-void",
        regulationSeconds: 1,
      });
      engine.step(1.01);
      const created = engine.createMystery()[0];
      if (created?.type !== "mystery-created") continue;
      const reveal = engine.revealMystery(
        "player-1",
        created.mystery.id,
        "exact",
      )[0];
      if (
        reveal?.type !== "mystery-revealed" ||
        reveal.reveal.outcomeId !== "world-fracture"
      ) {
        continue;
      }

      const before = engine.snapshot();
      engine.resolveMystery(
        "player-1",
        created.mystery.id,
      );
      const after = engine.snapshot();

      expect(after.players["player-1"].hull).toBe(
        before.players["player-1"].hull,
      );
      expect(after.players["player-2"].hull).toBe(
        before.players["player-2"].hull,
      );
      expect(
        after.tactical.offerDriftScale["player-1"],
      ).toBeLessThan(1);
      expect(
        after.tactical.offerDriftScale["player-1"],
      ).toBeCloseTo(
        after.tactical.offerDriftScale["player-2"],
        8,
      );
      expect(
        after.tactical.projectileSpeedScale["player-1"],
      ).toBeLessThan(1);
      exercised = true;
      break;
    }

    expect(exercised).toBe(true);
  });

  it("never lets a direct Fate roll delete a healthy player", () => {
    const engine = new DuelEngine({
      matchSeed: 991,
      maxHull: 100,
      maxShield: 0,
      startingShield: 0,
    });

    for (let index = 0; index < 20; index += 1) {
      engine.resolveFate("player-1");
      expect(
        engine.snapshot().players["player-2"].hull,
      ).toBeGreaterThan(0);
    }
  });

  it("makes SCAN reveal Mystery category before BLACK HOLE resolves the same signal", () => {
    const engine = new DuelEngine({
      matchSeed: 440,
      startingEnergy: 100,
    });

    const scanEvents = completeOffer(
      engine,
      "scan",
      "scan",
      1,
    );
    const created = scanEvents.find(
      (event) => event.type === "mystery-created",
    );
    const revealed = scanEvents.find(
      (event) => event.type === "mystery-revealed",
    );
    expect(created?.type).toBe("mystery-created");
    expect(revealed?.type).toBe("mystery-revealed");
    if (
      created?.type !== "mystery-created" ||
      revealed?.type !== "mystery-revealed"
    ) {
      throw new Error("SCAN did not create and reveal Mystery intel.");
    }
    expect(revealed.reveal.category).toBeDefined();
    expect(revealed.reveal.outcomeId).toBeUndefined();
    expect(
      engine.snapshot().chance.mysteries[0]?.resolved,
    ).toBe(false);

    const mysteryId = created.mystery.id;
    const blackHoleEvents = completeOffer(
      engine,
      "black-hole",
      "blackhole",
      6,
    );
    expect(blackHoleEvents).toContainEqual(
      expect.objectContaining({
        type: "mystery-resolved",
        mysteryId,
      }),
    );
    expect(
      blackHoleEvents.filter(
        (event) => event.type === "mystery-created",
      ),
    ).toHaveLength(0);
    expect(
      engine.snapshot().chance.mysteries[0]?.resolved,
    ).toBe(true);
  });

  it("routes a drafted Fate word into the authoritative Fate runtime", () => {
    const engine = new DuelEngine({
      matchSeed: 431,
      maxShield: 100,
      startingShield: 20,
      startingEnergy: 20,
    });

    const events = completeOffer(
      engine,
      "fate-crystal",
      "fatecrystal",
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "fate-resolved",
      }),
    );
    expect(
      engine.snapshot().players["player-1"].offers[0]?.status,
    ).toBe("completed");
  });

  it("routes a drafted Mystery word through a bounded authoritative outcome", () => {
    const engine = new DuelEngine({
      matchSeed: 732,
      maxHull: 100,
      maxShield: 100,
      maxEnergy: 100,
      startingShield: 50,
      startingEnergy: 50,
    });

    const events = completeOffer(
      engine,
      "black-hole",
      "blackhole",
    );

    expect(events.some((event) => event.type === "mystery-created")).toBe(
      true,
    );
    expect(events.some((event) => event.type === "mystery-resolved")).toBe(
      true,
    );
    const mysteries = engine.snapshot().chance.mysteries;
    expect(mysteries).toHaveLength(1);
    expect(mysteries[0]?.resolved).toBe(true);
    expect(engine.snapshot().players["player-1"].hull).toBeGreaterThan(0);
    expect(engine.snapshot().players["player-2"].hull).toBeGreaterThan(0);
  });

  it("resetRound clears round-local pity and unresolved Mystery state", () => {
    const engine = new DuelEngine({ matchSeed: 31337 });
    engine.resolveFate("player-1");
    engine.createMystery();
    expect(engine.snapshot().chance.mysteries).toHaveLength(1);

    engine.resetRound();

    expect(engine.snapshot().chance.mysteries).toEqual([]);
    expect(engine.snapshot().chance.pity).toEqual({
      "player-1": 0,
      "player-2": 0,
    });
  });
});
