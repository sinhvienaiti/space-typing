import { describe, expect, it } from "vitest";
import {
  DuelBot,
  duelBotObservation,
  type DuelBotPersonality,
} from "../src/duel/bots";
import { DuelEngine } from "../src/duel/engine";
import type {
  DuelActionOffer,
  DuelPlayerId,
} from "../src/duel/model";

function offer(
  playerId: DuelPlayerId,
  slot: number,
  actionId: string,
): DuelActionOffer {
  return {
    instanceId: playerId + "-" + String(slot) + "-" + actionId,
    actionId,
    ownerId: playerId,
    status: "available",
    typedPrefix: "",
    slotIndex: slot,
    shared: false,
  };
}

function observation(
  offers: readonly DuelActionOffer[],
) {
  return duelBotObservation({
    phase: "build",
    self: {
      hull: 100,
      maxHull: 100,
      shield: 20,
      maxShield: 40,
      energy: 25,
      maxEnergy: 100,
      offers,
    },
    opponent: {
      hull: 100,
      maxHull: 100,
      shield: 20,
      maxShield: 40,
      energy: 25,
      maxEnergy: 100,
    },
  });
}

describe("DuelBot M-DUEL-02", () => {
  it("uses SELECT_TARGET and TYPE_CHAR intents instead of authoritative completion", () => {
    const offers = [offer("player-2", 0, "laser")];
    const bot = new DuelBot({
      playerId: "player-2",
      wpm: 60,
      accuracy: 1,
      reactionMs: 0,
      personality: "balanced",
      seed: 7,
    });

    const intents = bot.update(2, observation(offers));
    expect(intents[0]).toEqual(
      expect.objectContaining({
        type: "SELECT_TARGET",
        targetInstanceId: offers[0]!.instanceId,
      }),
    );
    const typed = intents.filter(
      (intent): intent is Extract<typeof intent, { type: "TYPE_CHAR" }> =>
        intent.type === "TYPE_CHAR",
    );
    expect(typed.length).toBeGreaterThanOrEqual(5);
    expect(typed.slice(0, 5).map((intent) => intent.char).join("")).toBe(
      "laser",
    );
    expect(
      intents.some(
        (intent) =>
          (intent as { type: string }).type === "WORD_COMPLETE",
      ),
    ).toBe(false);
  });

  it("integrates through the exact same DuelEngine intent path as a human", () => {
    const engine = new DuelEngine();
    const offers = [offer("player-2", 0, "repair")];
    engine.setPrivateOffers("player-2", offers);
    const bot = new DuelBot({
      playerId: "player-2",
      wpm: 90,
      accuracy: 1,
      reactionMs: 100,
      personality: "turtle",
      seed: 11,
    });

    let completed = false;
    for (let frame = 0; frame < 240 && !completed; frame += 1) {
      const snapshot = engine.snapshot();
      const obs = duelBotObservation({
        phase: snapshot.phase,
        self: snapshot.players["player-2"],
        opponent: snapshot.players["player-1"],
      });
      for (const intent of bot.update(1 / 60, obs)) {
        engine.enqueueIntent(intent);
      }
      const events = engine.step(1 / 60);
      completed = events.some(
        (event) =>
          event.type === "action-completed" &&
          event.playerId === "player-2",
      );
    }

    expect(completed).toBe(true);
    const state = engine.snapshot().players["player-2"];
    expect(state.correctChars).toBe("repair".length);
    expect(state.wrongChars).toBe(0);
  });

  it("produces measured character rate near configured WPM over a timed sample", () => {
    const offers = [offer("player-2", 0, "black-hole")];
    const bot = new DuelBot({
      playerId: "player-2",
      wpm: 75,
      accuracy: 1,
      reactionMs: 0,
      personality: "fortune",
      seed: 99,
    });
    const obs = observation(offers);

    let typed = 0;
    let seconds = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      const dt = 1 / 60;
      seconds += dt;
      const intents = bot.update(dt, obs);
      typed += intents.filter(
        (intent) => intent.type === "TYPE_CHAR",
      ).length;
    }

    const measuredWpm = (typed / 5) / (seconds / 60);
    expect(measuredWpm).toBeGreaterThanOrEqual(60);
    expect(measuredWpm).toBeLessThanOrEqual(90);
  });

  it("models mistakes and recovery delay near configured accuracy", () => {
    const offers = [offer("player-2", 0, "black-hole")];
    const bot = new DuelBot({
      playerId: "player-2",
      wpm: 120,
      accuracy: 0.82,
      reactionMs: 0,
      personality: "balanced",
      seed: 123456,
    });
    const obs = observation(offers);

    for (let second = 0; second < 60; second += 1) {
      bot.update(1, obs);
    }

    const metrics = bot.metrics();
    const observed =
      metrics.correctChars / Math.max(1, metrics.emittedChars);
    expect(metrics.emittedChars).toBeGreaterThan(50);
    expect(metrics.wrongChars).toBeGreaterThan(0);
    expect(observed).toBeGreaterThanOrEqual(0.74);
    expect(observed).toBeLessThanOrEqual(0.9);
  });

  it("supports every approved personality without hidden state input", () => {
    const personalities: DuelBotPersonality[] = [
      "turtle",
      "aggro",
      "tactician",
      "trickster",
      "fortune",
      "sniper",
      "balanced",
    ];
    const offers = [
      offer("player-2", 0, "laser"),
      offer("player-2", 1, "barrier"),
      offer("player-2", 2, "energy"),
      offer("player-2", 3, "disrupt"),
      offer("player-2", 4, "black-hole"),
    ];

    for (const [index, personality] of personalities.entries()) {
      const bot = new DuelBot({
        playerId: "player-2",
        wpm: 60,
        accuracy: 0.95,
        reactionMs: 50,
        personality,
        seed: 100 + index,
      });
      const intents = bot.update(1, observation(offers));
      expect(intents.length).toBeGreaterThan(0);
      expect(
        intents.every(
          (intent) =>
            intent.type === "SELECT_TARGET" ||
            intent.type === "TYPE_CHAR",
        ),
      ).toBe(true);
    }
  });
});
