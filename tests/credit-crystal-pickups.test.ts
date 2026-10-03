import { describe, expect, it } from "vitest";
import type { CombatCreditRewardReceipt } from "../src/rewards/combat-credit-drops";
import {
  CREDIT_TRAIL_POINTS,
  CreditCrystalPickupSystem,
  type CreditCrystalArrival,
  type CreditCrystalCollectionEvent,
  type CreditCrystalPoint,
} from "../src/vfx/credit-crystal-pickups";

function receipt(
  id: string,
  tier: CombatCreditRewardReceipt["tier"] = "common",
  value = 1,
  variant: CombatCreditRewardReceipt["variant"] = "standard",
): CombatCreditRewardReceipt {
  return {
    rewardId: id,
    attemptId: "attempt",
    sourceKind: tier === "boss" || tier === "major-boss" ? "boss" : "enemy",
    sourceInstanceId: id,
    cause: tier === "boss" || tier === "major-boss" ? "boss-kill" : "typed-kill",
    mode: "campaign",
    tier,
    variant,
    nominalEarned: value,
    walletDeltaApplied: value,
  };
}

function advance(
  system: CreditCrystalPickupSystem,
  seconds: number,
  target: CreditCrystalPoint,
): void {
  let remaining = seconds;
  while (remaining > 0) {
    const dt = Math.min(1 / 60, remaining);
    system.update(dt, target);
    remaining -= dt;
  }
}

describe("CreditCrystalPickupSystem", () => {
  it("runs scatter -> hover -> magnet and emits collection once", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("common-1"), 100, 100, "high");

    expect(system.phaseSnapshot()).toEqual(["scatter"]);
    advance(system, 0.17, { x: 600, y: 600 });
    expect(system.phaseSnapshot()).toEqual(["hover"]);
    advance(system, 0.12, { x: 600, y: 600 });
    expect(system.phaseSnapshot()).toEqual(["magnet"]);

    let events: CreditCrystalCollectionEvent[] = [];
    for (let i = 0; i < 240 && events.length === 0; i += 1) {
      events = system.update(1 / 60, { x: 600, y: 600 });
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        rewardIds: ["common-1"],
        walletDeltaApplied: 1,
        hero: false,
      }),
    );
    expect(system.liveBurstCount()).toBe(0);
    expect(system.update(1, { x: 600, y: 600 })).toEqual([]);
  });

  it("removes individual pieces when they reach the ship instead of waiting for timeout", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("piece-absorb", "elite", 8), 620, 500, "high");
    const initialPieces = system.livePieceCount();

    let sawPartialAbsorb = false;
    for (let i = 0; i < 180 && system.liveBurstCount() > 0; i += 1) {
      system.update(1 / 60, { x: 640, y: 650 });
      const live = system.livePieceCount();
      if (live > 0 && live < initialPieces) {
        sawPartialAbsorb = true;
        break;
      }
    }

    expect(sawPartialAbsorb).toBe(true);
  });

  it("follows a moving ship target instead of capturing the spawn-time target", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("moving", "high", 4), 100, 120, "high");
    advance(system, 0.5, { x: 700, y: 500 });

    const before = system.diagnosticSnapshot()[0]?.pieces[0];
    expect(before).toBeDefined();

    advance(system, 0.18, { x: 120, y: 650 });
    const after = system.diagnosticSnapshot()[0]?.pieces[0];
    expect(after).toBeDefined();

    expect(after!.y).toBeGreaterThan(before!.y);
  });

  it("coalesces low-tier presentation at the visual cap without losing wallet value", () => {
    const system = new CreditCrystalPickupSystem();

    for (let i = 0; i < 40; i += 1) {
      system.spawn(receipt("low-" + i, "common", 2), 200, 200, "low");
    }

    expect(system.livePieceCount()).toBeLessThanOrEqual(28);
    const totalValue = system
      .diagnosticSnapshot()
      .reduce((sum, burst) => sum + burst.walletDeltaApplied, 0);
    const rewardCount = system
      .diagnosticSnapshot()
      .reduce((sum, burst) => sum + burst.rewardCount, 0);

    expect(totalValue).toBe(80);
    expect(rewardCount).toBe(40);

    const events = system.flush();
    expect(
      events.reduce((sum, event) => sum + event.walletDeltaApplied, 0),
    ).toBe(80);
    expect(
      events.reduce((sum, event) => sum + event.rewardIds.length, 0),
    ).toBe(40);
  });

  it("reserves premium hero presentation when ordinary pieces already fill the scene", () => {
    const system = new CreditCrystalPickupSystem();

    for (let i = 0; i < 16; i += 1) {
      system.spawn(receipt("fill-" + i, "refined", 2), 250, 250, "medium");
    }
    system.spawn(receipt("major", "major-boss", 80), 400, 180, "medium");

    const hero = system
      .diagnosticSnapshot()
      .find((burst) => burst.tier === "major-boss");

    expect(hero).toBeDefined();
    expect(hero?.hero).toBe(true);
    expect(hero?.pieces.some((piece) => piece.anchor)).toBe(true);
    expect(hero?.pieces.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps repeated premium stress inside the quality cap without losing value", () => {
    const system = new CreditCrystalPickupSystem();
    let expectedValue = 0;

    for (let index = 0; index < 50; index += 1) {
      const tier = index % 5 === 0 ? "major-boss" : "boss";
      const value = 10 + index;
      expectedValue += value;
      system.spawn(receipt("hero-" + index, tier, value), 260, 180, "low");
    }

    expect(system.livePieceCount()).toBeLessThanOrEqual(28);
    const events = system.flush();
    expect(
      events.flatMap((event) => event.rewardIds),
    ).toHaveLength(50);
    expect(
      events.reduce((sum, event) => sum + event.walletDeltaApplied, 0),
    ).toBe(expectedValue);
  });

  it("reframes live pickups safely when the gameplay canvas is resized", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("resize", "high", 5), 1100, 620, "high");

    system.reframe(
      { width: 1280, height: 720 },
      { width: 640, height: 420 },
    );

    const pieces = system.diagnosticSnapshot()[0]?.pieces ?? [];
    expect(pieces.length).toBeGreaterThan(0);
    expect(
      pieces.every(
        (piece) =>
          piece.x >= -72 &&
          piece.x <= 712 &&
          piece.y >= -72 &&
          piece.y <= 492,
      ),
    ).toBe(true);
  });

  it("forces existing bursts directly into magnet phase for Test Lab QA", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("force", "boss", 20), 100, 100, "high");
    expect(system.phaseSnapshot()).toEqual(["scatter"]);

    system.forceMagnet();
    expect(system.phaseSnapshot()).toEqual(["magnet"]);
  });

  it("keeps Golden as a visual variant without creating another currency", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("golden", "elite", 12, "golden"), 100, 100, "ultra");

    const snapshot = system.diagnosticSnapshot()[0];
    expect(snapshot?.tier).toBe("elite");
    expect(snapshot?.walletDeltaApplied).toBe(12);
  });

  it("flushes every remaining logical receipt exactly once", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("a", "common", 1), 100, 100, "high");
    system.spawn(receipt("b", "elite", 7), 120, 100, "high");
    system.spawn(receipt("c", "boss", 30), 140, 100, "high");

    const events = system.flush();
    expect(
      events.flatMap((event) => event.rewardIds).sort(),
    ).toEqual(["a", "b", "c"]);
    expect(
      events.reduce((sum, event) => sum + event.walletDeltaApplied, 0),
    ).toBe(38);
    expect(system.flush()).toEqual([]);
  });
});

describe("Credit crystal arrivals and chain", () => {
  function collectAll(
    system: CreditCrystalPickupSystem,
    target: CreditCrystalPoint,
    seconds = 4,
  ): CreditCrystalArrival[] {
    const arrivals: CreditCrystalArrival[] = [];
    for (let t = 0; t < seconds && system.liveBurstCount() > 0; t += 1 / 60) {
      system.update(1 / 60, target, arrivals);
    }
    return arrivals;
  }

  it("reports every crystal reaching the ship, in arrival order", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("arrivals", "elite", 5), 400, 120, "ultra");
    const pieces = system.livePieceCount();
    const arrivals = collectAll(system, { x: 400, y: 640 });
    expect(arrivals).toHaveLength(pieces);
    expect(arrivals.map((arrival) => arrival.order)).toEqual(
      Array.from({ length: pieces }, (_, index) => index),
    );
    expect(arrivals.filter((arrival) => arrival.anchor)).toHaveLength(1);
    expect(new Set(arrivals.map((arrival) => arrival.step))).toEqual(new Set([0]));
  });

  it("climbs one ladder step per burst collected in a row", () => {
    const system = new CreditCrystalPickupSystem();
    const target = { x: 400, y: 640 };
    const steps: number[] = [];
    for (let kill = 0; kill < 6; kill += 1) {
      system.spawn(receipt("chain-" + kill), 300 + kill * 20, 140, "high");
      const arrivals = collectAll(system, target);
      steps.push(arrivals[0]!.step);
      if (kill === 4) expect(arrivals[0]!.milestone).toBe(true);
    }
    expect(steps).toEqual([0, 1, 2, 3, 4, 5]);
    expect(system.chainSnapshot()).toEqual({ step: 5, bursts: 6 });
  });

  it("dips the ladder after a short pause and restarts it after a long one", () => {
    const system = new CreditCrystalPickupSystem();
    const target = { x: 400, y: 640 };
    for (let kill = 0; kill < 6; kill += 1) {
      system.spawn(receipt("warm-" + kill), 320, 140, "high");
      collectAll(system, target);
    }
    // A 1.5 s pause (≈ 2.7 s between first crystals home) loses a few steps.
    advance(system, 1.5, target);
    system.spawn(receipt("after-short"), 320, 140, "high");
    const short = collectAll(system, target);
    expect(short[0]!.step).toBeLessThan(5);
    expect(short[0]!.step).toBeGreaterThan(0);
    expect(short[0]!.chain).toBe(1);

    advance(system, 8, target);
    system.spawn(receipt("after-long"), 320, 140, "high");
    expect(collectAll(system, target)[0]!.step).toBe(0);
  });

  it("samples trails on game time so frame rate does not change their length", () => {
    const fast = new CreditCrystalPickupSystem();
    const slow = new CreditCrystalPickupSystem();
    fast.spawn(receipt("trail"), 300, 100, "ultra");
    slow.spawn(receipt("trail"), 300, 100, "ultra");
    fast.forceMagnet();
    slow.forceMagnet();
    for (let i = 0; i < 40; i += 1) fast.update(1 / 400, { x: 300, y: 700 });
    for (let i = 0; i < 10; i += 1) slow.update(1 / 100, { x: 300, y: 700 });
    const trailOf = (system: CreditCrystalPickupSystem) =>
      (system as unknown as { bursts: Array<{ pieces: Array<{ trailLength: number }> }> })
        .bursts[0]!.pieces[0]!.trailLength;
    expect(Math.abs(trailOf(fast) - trailOf(slow))).toBeLessThanOrEqual(1);
    expect(trailOf(fast)).toBeLessThanOrEqual(CREDIT_TRAIL_POINTS);
  });

  it("keeps the wallet event once per burst while crystals report one by one", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("wallet", "high", 4), 300, 100, "high");
    const events: CreditCrystalCollectionEvent[] = [];
    const arrivals: CreditCrystalArrival[] = [];
    for (let i = 0; i < 300 && system.liveBurstCount() > 0; i += 1) {
      events.push(...system.update(1 / 60, { x: 300, y: 650 }, arrivals));
    }
    expect(events).toHaveLength(1);
    expect(events[0]!.walletDeltaApplied).toBe(4);
    expect(arrivals.length).toBeGreaterThan(1);
  });
});
