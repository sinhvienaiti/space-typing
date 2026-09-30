import {
  DUEL_DEFAULT_REGULATION_SECONDS,
  DUEL_HARD_OVERTIME_SECONDS,
  type DuelActionDefinition,
  type DuelActionOffer,
  type DuelIntent,
  type DuelMatchPhase,
  type DuelPlayerId,
  duelPhaseForProgress,
  duelRegulationProgress,
} from "./model";
import { DUEL_ACTIONS_BY_ID } from "./actions";
import { matchingDuelOffers } from "./typing";

export type DuelRoundResult =
  | { status: "active"; winnerId: null }
  | { status: "won"; winnerId: DuelPlayerId }
  | { status: "draw"; winnerId: null };

export type DuelPlayerState = {
  id: DuelPlayerId;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  correctChars: number;
  wrongChars: number;
  lastAcceptedSequence: number;
  targetInstanceId: string | null;
  acquisitionPrefix: string;
  offers: DuelActionOffer[];
};

export type DuelEngineSnapshot = {
  tick: number;
  elapsedSeconds: number;
  phase: DuelMatchPhase;
  round: DuelRoundResult;
  players: Readonly<Record<DuelPlayerId, DuelPlayerState>>;
};

export type DuelTickEffect =
  | {
      type: "damage";
      targetId: DuelPlayerId;
      amount: number;
      sourceId?: DuelPlayerId;
    }
  | {
      type: "shield";
      targetId: DuelPlayerId;
      amount: number;
    }
  | {
      type: "repair";
      targetId: DuelPlayerId;
      amount: number;
    }
  | {
      type: "energy";
      targetId: DuelPlayerId;
      amount: number;
    };

export type DuelEngineEvent =
  | {
      type: "intent-rejected";
      playerId: DuelPlayerId;
      sequence: number;
      reason:
        | "round-ended"
        | "stale-sequence"
        | "invalid-char"
        | "unknown-target"
        | "target-unavailable";
    }
  | {
      type: "target-locked";
      playerId: DuelPlayerId;
      targetInstanceId: string;
    }
  | {
      type: "target-cancelled";
      playerId: DuelPlayerId;
      targetInstanceId: string;
    }
  | {
      type: "typing-miss";
      playerId: DuelPlayerId;
      char: string;
    }
  | {
      type: "action-completed";
      playerId: DuelPlayerId;
      targetInstanceId: string;
      actionId: string;
    }
  | {
      type: "round-ended";
      result: DuelRoundResult;
    };

export type DuelEngineConfig = {
  regulationSeconds?: number;
  hardOvertimeSeconds?: number;
  maxHull?: number;
  maxShield?: number;
  maxEnergy?: number;
  startingShield?: number;
  startingEnergy?: number;
  actions?: ReadonlyMap<string, DuelActionDefinition>;
};

const PLAYER_IDS: readonly DuelPlayerId[] = [
  "player-1",
  "player-2",
];

function otherPlayer(playerId: DuelPlayerId): DuelPlayerId {
  return playerId === "player-1" ? "player-2" : "player-1";
}

function cloneOffer(offer: DuelActionOffer): DuelActionOffer {
  return { ...offer };
}

function createPlayer(
  id: DuelPlayerId,
  config: Required<
    Pick<
      DuelEngineConfig,
      | "maxHull"
      | "maxShield"
      | "maxEnergy"
      | "startingShield"
      | "startingEnergy"
    >
  >,
): DuelPlayerState {
  return {
    id,
    hull: config.maxHull,
    maxHull: config.maxHull,
    shield: Math.min(config.maxShield, config.startingShield),
    maxShield: config.maxShield,
    energy: Math.min(config.maxEnergy, config.startingEnergy),
    maxEnergy: config.maxEnergy,
    correctChars: 0,
    wrongChars: 0,
    lastAcceptedSequence: -1,
    targetInstanceId: null,
    acquisitionPrefix: "",
    offers: [],
  };
}

export class DuelEngine {
  private readonly actions: ReadonlyMap<string, DuelActionDefinition>;
  private readonly regulationSeconds: number;
  private readonly hardOvertimeSeconds: number;
  private readonly profile: Required<
    Pick<
      DuelEngineConfig,
      | "maxHull"
      | "maxShield"
      | "maxEnergy"
      | "startingShield"
      | "startingEnergy"
    >
  >;
  private readonly players: Record<DuelPlayerId, DuelPlayerState>;
  private readonly queuedIntents: DuelIntent[] = [];
  private tickNumber = 0;
  private elapsedSeconds = 0;
  private roundResult: DuelRoundResult = {
    status: "active",
    winnerId: null,
  };

  constructor(config: DuelEngineConfig = {}) {
    this.actions = config.actions ?? DUEL_ACTIONS_BY_ID;
    this.regulationSeconds = Math.max(
      1,
      config.regulationSeconds ?? DUEL_DEFAULT_REGULATION_SECONDS,
    );
    this.hardOvertimeSeconds = Math.max(
      1,
      config.hardOvertimeSeconds ?? DUEL_HARD_OVERTIME_SECONDS,
    );
    this.profile = {
      maxHull: Math.max(1, config.maxHull ?? 100),
      maxShield: Math.max(0, config.maxShield ?? 40),
      maxEnergy: Math.max(1, config.maxEnergy ?? 100),
      startingShield: Math.max(0, config.startingShield ?? 20),
      startingEnergy: Math.max(0, config.startingEnergy ?? 25),
    };
    this.players = {
      "player-1": createPlayer("player-1", this.profile),
      "player-2": createPlayer("player-2", this.profile),
    };
  }

  resetRound(): void {
    this.tickNumber = 0;
    this.elapsedSeconds = 0;
    this.roundResult = { status: "active", winnerId: null };
    this.queuedIntents.length = 0;
    for (const playerId of PLAYER_IDS) {
      this.players[playerId] = createPlayer(playerId, this.profile);
    }
  }

  setPrivateOffers(
    playerId: DuelPlayerId,
    offers: readonly DuelActionOffer[],
  ): void {
    const player = this.players[playerId];
    player.offers = offers
      .filter((offer) => !offer.shared && offer.ownerId === playerId)
      .map(cloneOffer);
    player.targetInstanceId = null;
    player.acquisitionPrefix = "";
  }

  enqueueIntent(intent: DuelIntent): void {
    this.queuedIntents.push({ ...intent });
  }

  step(dtSeconds: number): DuelEngineEvent[] {
    const events: DuelEngineEvent[] = [];
    if (this.roundResult.status !== "active") {
      this.queuedIntents.length = 0;
      return events;
    }

    this.tickNumber += 1;
    this.elapsedSeconds += Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );

    const batch = this.queuedIntents
      .splice(0)
      .sort(
        (left, right) =>
          left.sequence - right.sequence ||
          left.playerId.localeCompare(right.playerId),
      );

    for (const intent of batch) {
      this.processIntent(intent, events);
    }

    this.resolveTerminalState(events);
    return events;
  }

  applyTickEffects(
    effects: readonly DuelTickEffect[],
  ): DuelEngineEvent[] {
    const events: DuelEngineEvent[] = [];
    if (this.roundResult.status !== "active") return events;

    const hullDamage: Record<DuelPlayerId, number> = {
      "player-1": 0,
      "player-2": 0,
    };
    const shieldDelta: Record<DuelPlayerId, number> = {
      "player-1": 0,
      "player-2": 0,
    };
    const repairDelta: Record<DuelPlayerId, number> = {
      "player-1": 0,
      "player-2": 0,
    };
    const energyDelta: Record<DuelPlayerId, number> = {
      "player-1": 0,
      "player-2": 0,
    };

    for (const effect of effects) {
      const amount = Math.max(
        0,
        Number.isFinite(effect.amount) ? effect.amount : 0,
      );
      if (effect.type === "damage") hullDamage[effect.targetId] += amount;
      if (effect.type === "shield") shieldDelta[effect.targetId] += amount;
      if (effect.type === "repair") repairDelta[effect.targetId] += amount;
      if (effect.type === "energy") energyDelta[effect.targetId] += amount;
    }

    for (const playerId of PLAYER_IDS) {
      const player = this.players[playerId];
      let damage = hullDamage[playerId];
      if (damage > 0 && player.shield > 0) {
        const absorbed = Math.min(player.shield, damage);
        player.shield -= absorbed;
        damage -= absorbed;
      }
      player.hull = Math.max(
        0,
        Math.min(
          player.maxHull,
          player.hull - damage + repairDelta[playerId],
        ),
      );
      player.shield = Math.max(
        0,
        Math.min(
          player.maxShield,
          player.shield + shieldDelta[playerId],
        ),
      );
      player.energy = Math.max(
        0,
        Math.min(
          player.maxEnergy,
          player.energy + energyDelta[playerId],
        ),
      );
    }

    this.resolveTerminalState(events);
    return events;
  }

  opponentOf(playerId: DuelPlayerId): DuelPlayerId {
    return otherPlayer(playerId);
  }

  phase(): DuelMatchPhase {
    return duelPhaseForProgress(
      duelRegulationProgress(
        this.elapsedSeconds,
        this.regulationSeconds,
      ),
    );
  }

  snapshot(): DuelEngineSnapshot {
    return {
      tick: this.tickNumber,
      elapsedSeconds: this.elapsedSeconds,
      phase: this.phase(),
      round: { ...this.roundResult },
      players: {
        "player-1": this.clonePlayer(this.players["player-1"]),
        "player-2": this.clonePlayer(this.players["player-2"]),
      },
    };
  }

  private processIntent(
    intent: DuelIntent,
    events: DuelEngineEvent[],
  ): void {
    const player = this.players[intent.playerId];
    if (this.roundResult.status !== "active") {
      events.push({
        type: "intent-rejected",
        playerId: intent.playerId,
        sequence: intent.sequence,
        reason: "round-ended",
      });
      return;
    }
    if (intent.sequence <= player.lastAcceptedSequence) {
      events.push({
        type: "intent-rejected",
        playerId: intent.playerId,
        sequence: intent.sequence,
        reason: "stale-sequence",
      });
      return;
    }
    player.lastAcceptedSequence = intent.sequence;

    switch (intent.type) {
      case "TYPE_CHAR":
        this.typeCharacter(
          player,
          intent.char,
          intent.targetInstanceId,
          events,
        );
        return;
      case "CANCEL_TARGET":
        this.cancelTarget(player, intent.targetInstanceId, events);
        return;
      case "SELECT_TARGET":
        this.selectTarget(player, intent.targetInstanceId, events);
        return;
      case "USE_ITEM":
      case "ACTIVATE_SKILL":
        return;
    }
  }

  private typeCharacter(
    player: DuelPlayerState,
    rawChar: string,
    targetInstanceId: string | undefined,
    events: DuelEngineEvent[],
  ): void {
    const char = rawChar.toLocaleLowerCase("en-US");
    if (!/^[a-z]$/.test(char)) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "invalid-char",
      });
      return;
    }

    if (
      targetInstanceId !== undefined &&
      player.targetInstanceId === null
    ) {
      this.selectTarget(player, targetInstanceId, events);
    }

    const locked = this.lockedOffer(player);
    if (locked !== null) {
      this.typeLockedOffer(player, locked, char, events);
      return;
    }

    const nextPrefix = player.acquisitionPrefix + char;
    const matches = matchingDuelOffers(
      nextPrefix,
      player.offers,
      this.actions,
    );
    if (matches.length === 0) {
      player.wrongChars += 1;
      events.push({
        type: "typing-miss",
        playerId: player.id,
        char,
      });
      return;
    }

    player.correctChars += 1;
    player.acquisitionPrefix = nextPrefix;
    if (matches.length === 1) {
      const offer = matches[0]!;
      offer.status = "locked";
      offer.typedPrefix = nextPrefix;
      player.targetInstanceId = offer.instanceId;
      events.push({
        type: "target-locked",
        playerId: player.id,
        targetInstanceId: offer.instanceId,
      });
      this.completeIfFinished(player, offer, events);
    }
  }

  private typeLockedOffer(
    player: DuelPlayerState,
    offer: DuelActionOffer,
    char: string,
    events: DuelEngineEvent[],
  ): void {
    const action = this.actions.get(offer.actionId);
    if (action === undefined) return;
    const expected = action.answerToken[offer.typedPrefix.length];
    if (expected !== char) {
      player.wrongChars += 1;
      events.push({
        type: "typing-miss",
        playerId: player.id,
        char,
      });
      return;
    }

    player.correctChars += 1;
    offer.typedPrefix += char;
    player.acquisitionPrefix = offer.typedPrefix;
    this.completeIfFinished(player, offer, events);
  }

  private completeIfFinished(
    player: DuelPlayerState,
    offer: DuelActionOffer,
    events: DuelEngineEvent[],
  ): void {
    const action = this.actions.get(offer.actionId);
    if (
      action === undefined ||
      offer.typedPrefix !== action.answerToken
    ) {
      return;
    }
    offer.status = "completed";
    events.push({
      type: "action-completed",
      playerId: player.id,
      targetInstanceId: offer.instanceId,
      actionId: offer.actionId,
    });
    player.targetInstanceId = null;
    player.acquisitionPrefix = "";
  }

  private selectTarget(
    player: DuelPlayerState,
    targetInstanceId: string,
    events: DuelEngineEvent[],
  ): void {
    const offer = player.offers.find(
      (candidate) => candidate.instanceId === targetInstanceId,
    );
    if (offer === undefined) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "unknown-target",
      });
      return;
    }
    if (offer.status !== "available") {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "target-unavailable",
      });
      return;
    }
    const previous = this.lockedOffer(player);
    if (previous !== null) {
      previous.status = "available";
      previous.typedPrefix = "";
    }
    offer.status = "locked";
    offer.typedPrefix = "";
    player.targetInstanceId = offer.instanceId;
    player.acquisitionPrefix = "";
    events.push({
      type: "target-locked",
      playerId: player.id,
      targetInstanceId: offer.instanceId,
    });
  }

  private cancelTarget(
    player: DuelPlayerState,
    targetInstanceId: string,
    events: DuelEngineEvent[],
  ): void {
    if (player.targetInstanceId !== targetInstanceId) return;
    const offer = this.lockedOffer(player);
    if (offer !== null) {
      offer.status = "available";
      offer.typedPrefix = "";
    }
    player.targetInstanceId = null;
    player.acquisitionPrefix = "";
    events.push({
      type: "target-cancelled",
      playerId: player.id,
      targetInstanceId,
    });
  }

  private lockedOffer(
    player: DuelPlayerState,
  ): DuelActionOffer | null {
    if (player.targetInstanceId === null) return null;
    return (
      player.offers.find(
        (offer) =>
          offer.instanceId === player.targetInstanceId &&
          offer.status === "locked",
      ) ?? null
    );
  }

  private resolveTerminalState(
    events: DuelEngineEvent[],
  ): void {
    if (this.roundResult.status !== "active") return;
    const p1Dead = this.players["player-1"].hull <= 0;
    const p2Dead = this.players["player-2"].hull <= 0;
    let result: DuelRoundResult | null = null;

    if (p1Dead && p2Dead) {
      result = { status: "draw", winnerId: null };
    } else if (p1Dead) {
      result = { status: "won", winnerId: "player-2" };
    } else if (p2Dead) {
      result = { status: "won", winnerId: "player-1" };
    } else if (
      this.elapsedSeconds >=
      this.regulationSeconds + this.hardOvertimeSeconds
    ) {
      result = { status: "draw", winnerId: null };
    }

    if (result !== null) {
      this.roundResult = result;
      events.push({ type: "round-ended", result: { ...result } });
    }
  }

  private clonePlayer(player: DuelPlayerState): DuelPlayerState {
    return {
      ...player,
      offers: player.offers.map(cloneOffer),
    };
  }
}
