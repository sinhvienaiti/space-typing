import { CHARACTER_IDS } from "../src/characters/registry";
import { describe, expect, it } from "vitest";
import { duelActionDefinitionForMap } from "../src/duel/map-actions";
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
  it("uses automatic items in production Practice, with a free energy word and no inventory accumulation", () => {
    const match = new DuelLocalPracticeMatch({ room: practiceRoom(), seed: 731 });
    let update = match.initial();
    let activated = 0;
    for (let i = 0; i < 12; i++) {
      const view = update.view;
      expect(view.self.offers.some(o => o.actionId === "energy")).toBe(true);
      const selected = view.self.offers.find(o => o.actionId !== "energy" && duelActionDefinitionForMap(view.map.id, o.actionId)!.energyCost <= view.self.energy && !((view.self.cooldowns[o.actionId] ?? 0) > 0)) ?? view.self.offers.find(o => o.actionId === "energy")!;
      for (const char of selected.typingPrompt!.answerToken) {
        update = match.sendIntent({ type: "TYPE_CHAR", targetInstanceId: selected.instanceId, char })!.update;
        activated += update.events.filter(e => e.type === "action-fired").length;
        expect(update.events.some(e => e.type === "action-banked")).toBe(false);
      }
      expect(update.view.self.inventory).toEqual({ attack: [], defense: [], tactical: [] });
    }
    expect(activated).toBeGreaterThan(0);
  });

  it("starts the same deterministic three-offer Duel contract", () => {
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
    // The bot flies a random hull, stable for the same room.
    expect(CHARACTER_IDS).toContain(a.appearance.opponentCharacterId);
    expect(b.appearance.opponentCharacterId).toBe(a.appearance.opponentCharacterId);
    expect(a.map.id).toBe("tempest-prime");
    expect(a.self.offers).toHaveLength(3);
    expect(
      a.self.offers.map((offer) => offer.actionId),
    ).toEqual(
      b.self.offers.map((offer) => offer.actionId),
    );
  });

  it("applies room modifiers to the live Practice engine", () => {
    const base = practiceRoom();
    const room = {
      ...base,
      settings: {
        ...base.settings,
        modifier: "sudden-death" as const,
      },
    };
    const match = new DuelLocalPracticeMatch({
      room,
      seed: 9191,
    });
    const view = match.initial().view;

    expect(view.self.maxHull).toBe(75);
    expect(view.self.maxShield).toBe(20);
    expect(view.self.shield).toBe(10);
    expect(view.opponent.maxHull).toBe(75);
  });

  it("processes human typing immediately and refills the completed slot", () => {
    const match = new DuelLocalPracticeMatch({
      room: practiceRoom(),
      seed: 2026,
    });
    const initial = match.initial().view;
    const offer = initial.self.offers.find((candidate) => {
      const action = duelActionDefinitionForMap(
        initial.map.id,
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
    const action = duelActionDefinitionForMap(
      initial.map.id,
      offer.actionId,
    )!;
    const answerToken =
      offer.typingPrompt?.answerToken ??
      action.answerToken;

    match.sendIntent({
      type: "SELECT_TARGET",
      targetInstanceId: offer.instanceId,
    });
    let last = match.initial();
    for (const char of answerToken) {
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
      answerToken.length,
    );
    expect(
      last.view.self.offers.some(
        (candidate) =>
          candidate.instanceId === offer.instanceId,
      ),
    ).toBe(false);
    expect(last.view.self.offers).toHaveLength(3);
  });

  it("refills expired human offers back to three slots without creating typing misses", () => {
    const match = new DuelLocalPracticeMatch({
      room: practiceRoom(),
      seed: 3030,
    });
    const initial = match.initial().view;
    const initialIds = new Set(
      initial.self.offers.map((offer) => offer.instanceId),
    );

    let view = initial;
    for (let second = 0; second < 25; second += 1) {
      view = match.tick(1).view;
    }

    expect(view.self.offers).toHaveLength(3);
    expect(
      view.self.offers.some((offer) =>
        initialIds.has(offer.instanceId),
      ),
    ).toBe(false);
    expect(view.self.correctChars).toBe(0);
    expect(view.self.wrongChars).toBe(0);
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
    // Exercise director activity immediately: the active cannon can now end
    // a round against an idle player before the first build-phase hazard.
    a.advanceToPhaseForTestLab("crisis");
    b.advanceToPhaseForTestLab("crisis");
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
