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

  it("does not target an action that is on its own authoritative cooldown", () => {
    const offers = [
      offer("player-2", 0, "repair"),
      offer("player-2", 1, "laser"),
    ];
    const bot = new DuelBot({
      playerId: "player-2",
      wpm: 60,
      accuracy: 1,
      reactionMs: 0,
      personality: "turtle",
      seed: 17,
    });
    const obs = duelBotObservation({
      phase: "build",
      self: {
        hull: 30,
        maxHull: 100,
        shield: 0,
        maxShield: 40,
        energy: 100,
        maxEnergy: 100,
        offers,
        cooldowns: {
          repair: 4.5,
        },
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

    const intents = bot.update(0.1, obs);
    expect(intents[0]).toEqual(
      expect.objectContaining({
        type: "SELECT_TARGET",
        targetInstanceId: offers[1]!.instanceId,
      }),
    );
  });

  it("preempts normal offers to type an incoming counter token", () => {
    const bot = new DuelBot({
      playerId: "player-2",
      wpm: 90,
      accuracy: 1,
      reactionMs: 0,
      personality: "balanced",
      seed: 81,
    });
    const obs = duelBotObservation({
      phase: "war",
      self: {
        hull: 100,
        maxHull: 100,
        shield: 20,
        maxShield: 40,
        energy: 50,
        maxEnergy: 100,
        offers: [offer("player-2", 0, "laser")],
        incomingThreats: [
          {
            id: "threat:1",
            sourcePlayerId: "player-1",
            targetPlayerId: "player-2",
            actionId: "siege-lance",
            displayLabel: "INTERCEPT",
            answerToken: "intercept",
            typedPrefix: "",
            counterTags: ["intercept"],
            remainingSeconds: 2.8,
            effectScale: 1,
            status: "open",
          },
        ],
      },
      opponent: {
        hull: 100,
        maxHull: 100,
        shield: 20,
        maxShield: 40,
        energy: 50,
        maxEnergy: 100,
      },
    });

    const intents = bot.update(0.01, obs);
    expect(intents[0]).toEqual(
      expect.objectContaining({
        type: "SELECT_TARGET",
        targetInstanceId: "threat:1",
      }),
    );
  });

  it("contests an active neutral objective using the same typing intents", () => {
    const bot = new DuelBot({
      playerId: "player-2",
      wpm: 90,
      accuracy: 1,
      reactionMs: 0,
      personality: "fortune",
      seed: 82,
    });
    const obs = duelBotObservation({
      phase: "war",
      self: {
        hull: 100,
        maxHull: 100,
        shield: 20,
        maxShield: 40,
        energy: 50,
        maxEnergy: 100,
        offers: [offer("player-2", 0, "laser")],
      },
      neutralObjective: {
        id: "objective:1",
        kind: "fate",
        displayLabel: "FATE CRYSTAL",
        answerToken: "fatecrystal",
        status: "active",
        winnerId: null,
        draw: false,
        progress: {
          "player-1": "",
          "player-2": "",
        },
      },
      opponent: {
        hull: 100,
        maxHull: 100,
        shield: 20,
        maxShield: 40,
        energy: 50,
        maxEnergy: 100,
      },
    });

    expect(bot.update(0.01, obs)[0]).toEqual(
      expect.objectContaining({
        type: "SELECT_TARGET",
        targetInstanceId: "objective:1",
      }),
    );
  });

  it("uses earned banked actions and ready combos instead of hoarding them forever", () => {
    const comboBot = new DuelBot({
      playerId: "player-2",
      wpm: 60,
      accuracy: 1,
      reactionMs: 0,
      personality: "aggro",
      seed: 83,
    });
    const comboObs = duelBotObservation({
      phase: "war",
      self: {
        hull: 100,
        maxHull: 100,
        shield: 20,
        maxShield: 40,
        energy: 50,
        maxEnergy: 100,
        offers: [],
        readyCombos: [{ id: "homing-barrage" }],
      },
      opponent: {
        hull: 60,
        maxHull: 100,
        shield: 0,
        maxShield: 40,
        energy: 50,
        maxEnergy: 100,
      },
    });
    expect(comboBot.update(0.01, comboObs)[0]).toEqual(
      expect.objectContaining({
        type: "ACTIVATE_SKILL",
        skillId: "combo:homing-barrage",
      }),
    );

    const itemBot = new DuelBot({
      playerId: "player-2",
      wpm: 60,
      accuracy: 1,
      reactionMs: 0,
      personality: "sniper",
      seed: 84,
    });
    const itemObs = duelBotObservation({
      phase: "war",
      self: {
        hull: 100,
        maxHull: 100,
        shield: 20,
        maxShield: 40,
        energy: 50,
        maxEnergy: 100,
        offers: [],
        inventory: {
          attack: [
            {
              instanceId: "stored:attack:1",
              actionId: "missile",
              storedAtTick: 10,
              qualityScale: 1,
            },
          ],
          defense: [],
          tactical: [],
        },
      },
      opponent: {
        hull: 60,
        maxHull: 100,
        shield: 0,
        maxShield: 40,
        energy: 50,
        maxEnergy: 100,
      },
    });
    expect(itemBot.update(0.01, itemObs)[0]).toEqual(
      expect.objectContaining({
        type: "USE_ITEM",
        itemId: "missile",
      }),
    );
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
            intent.type === "TYPE_CHAR" ||
            intent.type === "USE_ITEM" ||
            intent.type === "ACTIVATE_SKILL",
        ),
      ).toBe(true);
    }
  });
});
