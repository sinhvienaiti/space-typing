import { DUEL_ACTIONS } from "./actions";
import {
  DuelBot,
  duelBotObservation,
} from "./bots";
import type {
  DuelClientEvent,
  DuelClientMatchView,
} from "./authority";
import { DuelOfferDraft } from "./draft";
import {
  DuelEngine,
  type DuelEngineEvent,
  type DuelEngineSnapshot,
} from "./engine";
import {
  duelMapProfile,
  type DuelMapId,
} from "./maps";
import type {
  DuelActionCategory,
  DuelActionOffer,
  DuelPlayerId,
} from "./model";
import {
  toEngineIntent,
  type DuelWireIntent,
} from "./protocol";
import type {
  DuelRoomSnapshot,
} from "./room";

const ALL_CATEGORIES: readonly DuelActionCategory[] = [
  "attack",
  "defense",
  "support",
  "tactical",
  "fate",
  "mystery",
];

export type DuelLocalPracticeUpdate = {
  view: DuelClientMatchView;
  events: readonly DuelClientEvent[];
};

function deriveSeed(base: number, suffix: number): number {
  let value =
    (base ^ Math.imul(suffix + 1, 0x9e3779b1)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function selectedMap(
  room: DuelRoomSnapshot,
  seed: number,
): DuelMapId {
  const selection = room.settings.mapSelection;
  if (selection.mode === "fixed") {
    return selection.mapId;
  }
  const pool = selection.pool;
  return pool[seed % pool.length] ?? "frost-wastes";
}

function isPrivatePlayerEvent(
  event: DuelEngineEvent,
): event is Extract<
  DuelEngineEvent,
  { playerId: DuelPlayerId }
> {
  return "playerId" in event;
}

function projectEvents(
  events: readonly DuelEngineEvent[],
): DuelClientEvent[] {
  const projected: DuelClientEvent[] = [];
  const privateTypes = new Set([
    "intent-rejected",
    "target-locked",
    "target-cancelled",
    "typing-miss",
    "action-blocked",
    "action-completed",
    "action-banked",
    "mystery-revealed",
    "combo-ready",
  ]);

  for (const event of events) {
    if (
      privateTypes.has(event.type) &&
      isPrivatePlayerEvent(event)
    ) {
      if (event.playerId === "player-1") {
        projected.push(event);
      }
      continue;
    }

    if (event.type === "trap-armed") {
      if (event.playerId === "player-1") {
        projected.push(event);
      } else {
        projected.push({
          type: "opponent-trap-hint",
          publicHint: event.publicHint,
        });
      }
      continue;
    }

    projected.push(event);
  }
  return projected;
}

export class DuelLocalPracticeMatch {
  private readonly room: DuelRoomSnapshot;
  private readonly baseSeed: number;
  private readonly mapId: DuelMapId;
  private engine: DuelEngine;
  private draft: Record<DuelPlayerId, DuelOfferDraft>;
  private bot: DuelBot;
  private humanSequence = 0;
  private serverSequence = 0;
  private roundSequence = 1;
  private roundId = "practice:round:1";
  private needsRoundReset = false;
  private readonly series: {
    format: 1 | 3 | 5;
    winsNeeded: number;
    roundsPlayed: number;
    maxRounds: number;
    wins: Record<DuelPlayerId, number>;
    draws: number;
    status: "active" | "won" | "draw";
    winnerId: DuelPlayerId | null;
  };

  constructor(input: {
    room: DuelRoomSnapshot;
    seed: number;
  }) {
    const botConfig = input.room.slots[1].bot;
    if (
      input.room.slots[0].kind !== "human" ||
      input.room.slots[1].kind !== "bot" ||
      botConfig === null
    ) {
      throw new Error(
        "Local Practice requires one human and one configured Bot.",
      );
    }

    this.room = input.room;
    this.baseSeed = input.seed >>> 0;
    this.mapId = selectedMap(input.room, this.baseSeed);
    this.engine = this.createEngine(this.baseSeed);
    this.draft = this.createDrafts(this.baseSeed);
    this.bot = new DuelBot({
      playerId: "player-2",
      wpm: botConfig.wpm,
      accuracy: botConfig.accuracy,
      reactionMs: botConfig.reactionMs,
      personality: botConfig.personality,
      seed: deriveSeed(this.baseSeed, 29),
    });
    this.series = {
      format: input.room.settings.roundFormat,
      winsNeeded:
        Math.floor(input.room.settings.roundFormat / 2) + 1,
      roundsPlayed: 0,
      maxRounds: input.room.settings.roundFormat + 2,
      wins: {
        "player-1": 0,
        "player-2": 0,
      },
      draws: 0,
      status: "active",
      winnerId: null,
    };
    this.dealOffers();
  }

  initial(): DuelLocalPracticeUpdate {
    return {
      view: this.view(),
      events: [],
    };
  }

  sendIntent(
    intent: DuelWireIntent,
  ): {
    sequence: number;
    update: DuelLocalPracticeUpdate;
  } | null {
    if (this.series.status !== "active") return null;
    if (this.needsRoundReset) {
      this.beginNextRound();
    }

    this.humanSequence += 1;
    this.engine.enqueueIntent(
      toEngineIntent({
        playerId: "player-1",
        sequence: this.humanSequence,
        intent,
      }),
    );
    const events = this.engine.step(0);
    this.afterEngineStep(events);
    this.serverSequence += 1;
    return {
      sequence: this.humanSequence,
      update: {
        view: this.view(),
        events: projectEvents(events),
      },
    };
  }

  tick(dtSeconds: number): DuelLocalPracticeUpdate {
    if (this.series.status !== "active") {
      return this.initial();
    }
    if (this.needsRoundReset) {
      this.beginNextRound();
    }

    const snapshot = this.engine.snapshot();
    for (const intent of this.bot.update(
      dtSeconds,
      duelBotObservation({
        phase: snapshot.phase,
        self: snapshot.players["player-2"],
        opponent: snapshot.players["player-1"],
      }),
    )) {
      this.engine.enqueueIntent(intent);
    }

    const events = this.engine.step(dtSeconds);
    this.afterEngineStep(events);
    this.serverSequence += 1;
    return {
      view: this.view(),
      events: projectEvents(events),
    };
  }

  isFinished(): boolean {
    return this.series.status !== "active";
  }

  private createEngine(seed: number): DuelEngine {
    return new DuelEngine({
      regulationSeconds:
        this.room.settings.matchLengthSeconds,
      matchSeed: seed,
      mapId: this.mapId,
    });
  }

  private createDrafts(
    seed: number,
  ): Record<DuelPlayerId, DuelOfferDraft> {
    const multiplier =
      duelMapProfile(this.mapId).categoryMultiplier;
    return {
      "player-1": new DuelOfferDraft({
        seed: deriveSeed(seed, 1),
        actions: DUEL_ACTIONS,
        enabledCategories: ALL_CATEGORIES,
        categoryMultiplier: multiplier,
      }),
      "player-2": new DuelOfferDraft({
        seed: deriveSeed(seed, 2),
        actions: DUEL_ACTIONS,
        enabledCategories: ALL_CATEGORIES,
        categoryMultiplier: multiplier,
      }),
    };
  }

  private dealOffers(): void {
    const phase = this.engine.phase();
    this.engine.setPrivateOffers(
      "player-1",
      this.draft["player-1"].dealPrivateOffers(
        "player-1",
        phase,
      ),
    );
    this.engine.setPrivateOffers(
      "player-2",
      this.draft["player-2"].dealPrivateOffers(
        "player-2",
        phase,
      ),
    );
  }

  private afterEngineStep(
    events: readonly DuelEngineEvent[],
  ): void {
    this.refillOffers(events);
    const ended = events.find(
      (event) => event.type === "round-ended",
    );
    if (ended?.type === "round-ended") {
      this.finishRound(ended.result);
    }
  }

  private refillOffers(
    events: readonly DuelEngineEvent[],
  ): void {
    const snapshot = this.engine.snapshot();

    for (const playerId of [
      "player-1",
      "player-2",
    ] as const) {
      const slots = new Set<number>();
      for (const event of events) {
        if (
          event.type !== "action-completed" ||
          event.playerId !== playerId
        ) {
          continue;
        }
        const completed =
          snapshot.players[playerId].offers.find(
            (offer) =>
              offer.instanceId === event.targetInstanceId,
          );
        if (completed !== undefined) {
          slots.add(completed.slotIndex);
        }
      }
      if (slots.size === 0) continue;

      const offers =
        snapshot.players[playerId].offers.map(
          (offer) => ({ ...offer }),
        );
      for (const slotIndex of slots) {
        const refill =
          this.draft[playerId].refillPrivateOffer(
            playerId,
            slotIndex,
            snapshot.phase,
            offers.filter(
              (offer) =>
                offer.slotIndex !== slotIndex &&
                offer.status !== "completed",
            ),
          );
        if (refill === null) continue;
        const index = offers.findIndex(
          (offer) => offer.slotIndex === slotIndex,
        );
        if (index >= 0) offers[index] = refill;
        else offers.push(refill);
      }
      this.engine.setPrivateOffers(playerId, offers);
    }
  }

  private finishRound(
    result: DuelEngineSnapshot["round"],
  ): void {
    this.series.roundsPlayed += 1;
    if (result.status === "won") {
      this.series.wins[result.winnerId] += 1;
    } else if (result.status === "draw") {
      this.series.draws += 1;
    }

    const winner = ([
      "player-1",
      "player-2",
    ] as const).find(
      (playerId) =>
        this.series.wins[playerId] >=
        this.series.winsNeeded,
    );
    if (winner !== undefined) {
      this.series.status = "won";
      this.series.winnerId = winner;
      return;
    }

    if (
      this.series.roundsPlayed >=
      this.series.maxRounds
    ) {
      const left = this.series.wins["player-1"];
      const right = this.series.wins["player-2"];
      if (left === right) {
        this.series.status = "draw";
        this.series.winnerId = null;
      } else {
        this.series.status = "won";
        this.series.winnerId =
          left > right ? "player-1" : "player-2";
      }
      return;
    }

    this.needsRoundReset = true;
  }

  private beginNextRound(): void {
    this.roundSequence += 1;
    this.roundId =
      "practice:round:" + String(this.roundSequence);
    const seed = deriveSeed(
      this.baseSeed,
      this.roundSequence,
    );
    this.engine = this.createEngine(seed);
    this.draft = this.createDrafts(seed);
    const botConfig = this.room.slots[1].bot;
    if (botConfig === null) {
      throw new Error("Practice Bot config disappeared.");
    }
    this.bot = new DuelBot({
      playerId: "player-2",
      wpm: botConfig.wpm,
      accuracy: botConfig.accuracy,
      reactionMs: botConfig.reactionMs,
      personality: botConfig.personality,
      seed: deriveSeed(seed, 29),
    });
    this.humanSequence = 0;
    this.needsRoundReset = false;
    this.dealOffers();
  }

  private view(): DuelClientMatchView {
    const snapshot = this.engine.snapshot();
    const self = snapshot.players["player-1"];
    const opponent = snapshot.players["player-2"];
    const selfStrategy =
      snapshot.strategy["player-1"];
    const opponentStrategy =
      snapshot.strategy["player-2"];

    return {
      matchId: "practice",
      roundId: this.roundId,
      mode: "practice",
      combatProfile: "normalized",
      serverSequence: this.serverSequence,
      elapsedSeconds: snapshot.elapsedSeconds,
      phase: snapshot.phase,
      round: snapshot.round,
      series: {
        format: this.series.format,
        winsNeeded: this.series.winsNeeded,
        roundsPlayed: this.series.roundsPlayed,
        maxRounds: this.series.maxRounds,
        wins: { ...this.series.wins },
        draws: this.series.draws,
        status: this.series.status,
        winnerId: this.series.winnerId,
      },
      map: snapshot.map,
      self: {
        playerId: "player-1",
        hull: self.hull,
        maxHull: self.maxHull,
        shield: self.shield,
        maxShield: self.maxShield,
        energy: self.energy,
        maxEnergy: self.maxEnergy,
        correctChars: self.correctChars,
        wrongChars: self.wrongChars,
        lastAcceptedSequence:
          self.lastAcceptedSequence,
        targetInstanceId: self.targetInstanceId,
        acquisitionPrefix: self.acquisitionPrefix,
        offers: self.offers.map((offer: DuelActionOffer) => ({
          ...offer,
        })),
        inventory:
          snapshot.inventories["player-1"],
        incomingThreats:
          snapshot.incomingThreats["player-1"],
        initiative: selfStrategy.initiative,
        strategyPath: selfStrategy.path,
        readyCombos:
          selfStrategy.readyCombos.map((combo) => ({
            id: combo.id,
            createdAtTick: combo.createdAtTick,
          })),
        ownPity: snapshot.chance.pity["player-1"],
      },
      opponent: {
        hull: opponent.hull,
        maxHull: opponent.maxHull,
        shield: opponent.shield,
        maxShield: opponent.maxShield,
        energy: opponent.energy,
        maxEnergy: opponent.maxEnergy,
        initiative: opponentStrategy.initiative,
        strategyPath: opponentStrategy.path,
      },
      shared: {
        tactical: snapshot.tactical,
        mysteries: snapshot.chance.mysteries,
        neutralObjective: snapshot.neutralObjective,
        opponentTrapHints:
          snapshot.publicTrapHints["player-1"],
      },
    };
  }
}
