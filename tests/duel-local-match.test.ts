import { describe, expect, it } from "vitest";
import { DUEL_ACTIONS_BY_ID } from "../src/duel/actions";
import { DuelLocalPracticeMatch } from "../src/duel/local-match";
import { createPracticeDuelRoom } from "../src/duel/room";

function practiceRoom() {
  return createPracticeDuelRoom({
    roomId: "LOCAL-TEST",
    participantId: "human",
    displayName: "Pilot",
    mapId: "tempest-prime",
    bot: {
      wpm: 72,
      accuracy: 0.96,
      reactionMs: 120,
      personality: "tactician",
    },
  }).snapshot();
}

describe("Duel local Practice runtime", () => {
  it("starts the same deterministic five-offer Duel contract", () => {
    const room = practiceRoom();
    const left = new DuelLocalPracticeMatch({
      room,
      seed: 12345,
    });
    const right = new DuelLocalPracticeMatch({
      room,
      seed: 12345,
    });

    const a = left.initial().view;
    const b = right.initial().view;

    expect(a.mode).toBe("practice");
    expect(a.combatProfile).toBe("normalized");
    expect(a.appearance.selfCharacterId).toBe("vanguard");
    expect(a.appearance.opponentCharacterId).toBe("reaper");
    expect(a.map.id).toBe("tempest-prime");
    expect(a.self.offers).toHaveLength(5);
    expect(
      a.self.offers.map((offer) => offer.actionId),
    ).toEqual(
      b.self.offers.map((offer) => offer.actionId),
    );
  });

  it("processes human typing immediately and refills the completed slot", () => {
    const match = new DuelLocalPracticeMatch({
      room: practiceRoom(),
      seed: 2026,
    });
    const initial = match.initial().view;
    const offer = initial.self.offers.find((candidate) => {
      const action = DUEL_ACTIONS_BY_ID.get(
        candidate.actionId,
      );
      return (
        action !== undefined &&
        action.energyCost <= initial.self.energy
      );
    });
    if (offer === undefined) {
      throw new Error("Missing affordable Practice offer.");
    }
    const action = DUEL_ACTIONS_BY_ID.get(offer.actionId)!;

    match.sendIntent({
      type: "SELECT_TARGET",
      targetInstanceId: offer.instanceId,
    });
    let last = match.initial();
    for (const char of action.answerToken) {
      const result = match.sendIntent({
        type: "TYPE_CHAR",
        char,
        targetInstanceId: offer.instanceId,
      });
      if (result === null) {
        throw new Error("Practice input unexpectedly stopped.");
      }
      last = result.update;
    }

    expect(last.view.self.correctChars).toBe(
      action.answerToken.length,
    );
    expect(
      last.view.self.offers.some(
        (candidate) =>
          candidate.instanceId === offer.instanceId,
      ),
    ).toBe(false);
    expect(last.view.self.offers).toHaveLength(5);
  });

  it("can jump a local Practice scene to Crisis/Cataclysm for visual Test Lab without Bot fast-forward", () => {
    const crisisMatch = new DuelLocalPracticeMatch({
      room: practiceRoom(),
      seed: 6060,
    });
    const crisis =
      crisisMatch.advanceToPhaseForTestLab("crisis");
    expect(crisis.view.phase).toBe("crisis");
    expect(crisis.view.round.status).toBe("active");

    const cataclysmMatch = new DuelLocalPracticeMatch({
      room: practiceRoom(),
      seed: 7070,
    });
    const cataclysm =
      cataclysmMatch.advanceToPhaseForTestLab(
        "cataclysm",
      );
    expect(cataclysm.view.phase).toBe("cataclysm");
    expect(cataclysm.view.round.status).toBe("active");
    expect(
      cataclysm.events.some(
        (event) => event.type === "map-cataclysm",
      ),
    ).toBe(true);
  });

  it("runs the configured Bot through character-level engine intents", () => {
    const match = new DuelLocalPracticeMatch({
      room: practiceRoom(),
      seed: 8080,
    });

    let view = match.initial().view;
    for (let frame = 0; frame < 120; frame += 1) {
      view = match.tick(0.05).view;
    }

    expect(
      view.opponent.hull <= view.opponent.maxHull,
    ).toBe(true);
    expect(view.elapsedSeconds).toBeCloseTo(6, 6);
    expect(view.serverSequence).toBe(120);
  });

  it("does not expose Bot offers, inventory or pity in the Practice client view", () => {
    const match = new DuelLocalPracticeMatch({
      room: practiceRoom(),
      seed: 99,
    });
    const view = match.initial().view;
    const opponent = view.opponent as unknown as Record<
      string,
      unknown
    >;

    expect("offers" in opponent).toBe(false);
    expect("inventory" in opponent).toBe(false);
    expect("pity" in opponent).toBe(false);
  });

  it("keeps Practice map/director deterministic for the same seed", () => {
    const room = practiceRoom();
    const a = new DuelLocalPracticeMatch({
      room,
      seed: 5150,
    });
    const b = new DuelLocalPracticeMatch({
      room,
      seed: 5150,
    });

    const eventsA: string[] = [];
    const eventsB: string[] = [];
    for (let frame = 0; frame < 1600; frame += 1) {
      for (const event of a.tick(0.05).events) {
        if (
          event.type === "map-hazard" ||
          event.type === "objective-spawned"
        ) {
          eventsA.push(JSON.stringify(event));
        }
      }
      for (const event of b.tick(0.05).events) {
        if (
          event.type === "map-hazard" ||
          event.type === "objective-spawned"
        ) {
          eventsB.push(JSON.stringify(event));
        }
      }
    }

    expect(eventsA.length).toBeGreaterThan(0);
    expect(eventsA).toEqual(eventsB);
  });
});
