import { DUEL_ACTIONS_BY_ID } from "./actions";
import {
  resolveDuelAction,
  type DuelCombatEffect,
} from "./combat";
import {
  DuelChanceSystem,
  type DuelFateResolution,
  type DuelMysteryOutcome,
  type DuelMysteryPublic,
  type DuelMysteryReveal,
  type DuelMysteryRevealLevel,
} from "./chance";
import {
  DuelCombatInventory,
  type DuelCombatInventorySnapshot,
} from "./inventory";
import {
  DuelMapDirector,
  type DuelCataclysmEvent,
  type DuelHazardEvent,
} from "./director";
import {
  DUEL_CONTENT_VERSION,
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
import {
  duelMapProfile,
  type DuelMapId,
  type DuelMapProfile,
} from "./maps";
import {
  DuelTacticalMapState,
  type DuelTacticalMapSnapshot,
} from "./tactical";
import {
  DuelThreatSystem,
  type DuelIncomingThreat,
} from "./threats";
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
  inventories: Readonly<
    Record<DuelPlayerId, DuelCombatInventorySnapshot>
  >;
  incomingThreats: Readonly<
    Record<DuelPlayerId, readonly DuelIncomingThreat[]>
  >;
  tactical: DuelTacticalMapSnapshot;
  chance: {
    pity: Readonly<Record<DuelPlayerId, number>>;
    mysteries: readonly DuelMysteryPublic[];
  };
  map: DuelMapProfile;
};

export type DuelTickEffect = DuelCombatEffect;

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
        | "target-unavailable"
        | "item-unavailable"
        | "insufficient-energy";
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
      type: "action-blocked";
      playerId: DuelPlayerId;
      targetInstanceId: string;
      actionId: string;
      reason: "inventory-full" | "insufficient-energy";
    }
  | {
      type: "action-completed";
      playerId: DuelPlayerId;
      targetInstanceId: string;
      actionId: string;
    }
  | {
      type: "action-banked";
      playerId: DuelPlayerId;
      actionId: string;
      storedInstanceId: string;
      bucket: "attack" | "defense" | "tactical";
    }
  | {
      type: "stored-action-used";
      playerId: DuelPlayerId;
      actionId: string;
      storedInstanceId: string;
    }
  | {
      type: "threat-created";
      threat: DuelIncomingThreat;
    }
  | {
      type: "threat-countered";
      threatId: string;
      sourcePlayerId: DuelPlayerId;
      targetPlayerId: DuelPlayerId;
      actionId: string;
    }
  | {
      type: "threat-resolved";
      threatId: string;
      sourcePlayerId: DuelPlayerId;
      targetPlayerId: DuelPlayerId;
      actionId: string;
    }
  | {
      type: "fate-resolved";
      resolution: DuelFateResolution;
    }
  | {
      type: "mystery-created";
      mystery: DuelMysteryPublic;
    }
  | {
      type: "mystery-revealed";
      playerId: DuelPlayerId;
      reveal: DuelMysteryReveal;
    }
  | {
      type: "mystery-resolved";
      playerId: DuelPlayerId;
      mysteryId: string;
      outcome: DuelMysteryOutcome;
    }
  | {
      type: "map-hazard";
      hazard: DuelHazardEvent;
    }
  | {
      type: "map-cataclysm";
      cataclysm: DuelCataclysmEvent;
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
  matchSeed?: number;
  mapId?: DuelMapId;
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
  private readonly inventories: Record<
    DuelPlayerId,
    DuelCombatInventory
  > = {
    "player-1": new DuelCombatInventory(),
    "player-2": new DuelCombatInventory(),
  };
  private readonly threats = new DuelThreatSystem();
  private readonly tactical = new DuelTacticalMapState();
  private readonly chance: DuelChanceSystem;
  private readonly director: DuelMapDirector;
  private readonly mapId: DuelMapId;
  private readonly queuedIntents: DuelIntent[] = [];
  private readonly pendingEffects: DuelCombatEffect[] = [];
  private readonly reservedEnergyCost: Record<DuelPlayerId, number> = {
    "player-1": 0,
    "player-2": 0,
  };
  private tickNumber = 0;
  private elapsedSeconds = 0;
  private roundResult: DuelRoundResult = {
    status: "active",
    winnerId: null,
  };

  constructor(config: DuelEngineConfig = {}) {
    this.actions = config.actions ?? DUEL_ACTIONS_BY_ID;
    this.mapId = config.mapId ?? "frost-wastes";
    this.chance = new DuelChanceSystem(
      config.matchSeed ?? 1,
      DUEL_CONTENT_VERSION,
    );
    this.director = new DuelMapDirector({
      mapId: this.mapId,
      matchSeed: config.matchSeed ?? 1,
      contentVersion: DUEL_CONTENT_VERSION,
    });
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
    this.pendingEffects.length = 0;
    this.reservedEnergyCost["player-1"] = 0;
    this.reservedEnergyCost["player-2"] = 0;
    this.threats.clear();
    this.tactical.clear();
    this.chance.resetRound();
    this.director.resetRound();
    for (const playerId of PLAYER_IDS) {
      this.players[playerId] = createPlayer(playerId, this.profile);
      this.inventories[playerId].clear();
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

    const dt = Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );
    this.tickNumber += 1;
    this.elapsedSeconds += dt;
    this.pendingEffects.length = 0;
    this.reservedEnergyCost["player-1"] = 0;
    this.reservedEnergyCost["player-2"] = 0;
    this.tactical.update(dt);
    const directorEvents = this.director.update(dt, this.phase());
    for (const event of directorEvents) {
      if (event.type === "hazard") {
        events.push({ type: "map-hazard", hazard: event.hazard });
      } else {
        events.push({
          type: "map-cataclysm",
          cataclysm: event.cataclysm,
        });
      }
    }

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

    for (const threatEvent of this.threats.update(dt)) {
      const target = this.players[threatEvent.targetPlayerId];
      if (target.targetInstanceId === threatEvent.threatId) {
        target.targetInstanceId = null;
        target.acquisitionPrefix = "";
      }

      if (threatEvent.outcome === "countered") {
        events.push({
          type: "threat-countered",
          threatId: threatEvent.threatId,
          sourcePlayerId: threatEvent.sourcePlayerId,
          targetPlayerId: threatEvent.targetPlayerId,
          actionId: threatEvent.actionId,
        });
        continue;
      }

      const action = this.actions.get(threatEvent.actionId);
      if (action !== undefined) {
        const resolution = resolveDuelAction(
          action,
          threatEvent.sourcePlayerId,
        );
        this.pendingEffects.push(
          ...resolution.effects.filter(
            (effect) => effect.type !== "energy-cost",
          ),
        );
        for (const effect of resolution.tacticalEffects) {
          this.tactical.apply(effect);
        }
      }
      events.push({
        type: "threat-resolved",
        threatId: threatEvent.threatId,
        sourcePlayerId: threatEvent.sourcePlayerId,
        targetPlayerId: threatEvent.targetPlayerId,
        actionId: threatEvent.actionId,
      });
    }

    this.applyEffectsToPlayers(this.pendingEffects);
    this.resolveTerminalState(events);
    return events;
  }

  applyTickEffects(
    effects: readonly DuelTickEffect[],
  ): DuelEngineEvent[] {
    const events: DuelEngineEvent[] = [];
    if (this.roundResult.status !== "active") return events;
    this.applyEffectsToPlayers(effects);
    this.resolveTerminalState(events);
    return events;
  }

  opponentOf(playerId: DuelPlayerId): DuelPlayerId {
    return otherPlayer(playerId);
  }

  resolveFate(playerId: DuelPlayerId): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const resolution = this.chance.rollFate(playerId);
    const effects: DuelCombatEffect[] = [];
    if (resolution.outcome.selfShield > 0) {
      effects.push({
        type: "shield",
        targetId: playerId,
        amount: resolution.outcome.selfShield,
      });
    }
    if (resolution.outcome.selfEnergy > 0) {
      effects.push({
        type: "energy",
        targetId: playerId,
        amount: resolution.outcome.selfEnergy,
      });
    }
    if (resolution.outcome.opponentDamage > 0) {
      effects.push({
        type: "damage",
        targetId: otherPlayer(playerId),
        sourceId: playerId,
        amount: resolution.outcome.opponentDamage,
      });
    }
    this.applyEffectsToPlayers(effects);
    const events: DuelEngineEvent[] = [
      { type: "fate-resolved", resolution },
    ];
    this.resolveTerminalState(events);
    return events;
  }

  createMystery(): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const mystery = this.chance.createMystery(this.phase());
    return [{ type: "mystery-created", mystery }];
  }

  revealMystery(
    playerId: DuelPlayerId,
    mysteryId: string,
    level: DuelMysteryRevealLevel,
  ): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const reveal = this.chance.revealMystery(mysteryId, level);
    if (reveal === null) return [];
    return [{ type: "mystery-revealed", playerId, reveal }];
  }

  resolveMystery(
    playerId: DuelPlayerId,
    mysteryId: string,
  ): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const outcome = this.chance.resolveMystery(mysteryId);
    if (outcome === null) return [];

    const effects: DuelCombatEffect[] = [];
    switch (outcome.id) {
      case "energy-cache":
        effects.push({
          type: "energy",
          targetId: playerId,
          amount: outcome.magnitude,
        });
        break;
      case "emergency-shield":
        effects.push({
          type: "shield",
          targetId: playerId,
          amount: outcome.magnitude,
        });
        break;
      case "repair-burst":
        effects.push({
          type: "repair",
          targetId: playerId,
          amount: outcome.magnitude,
        });
        break;
      case "shield-overload":
        effects.push({
          type: "damage",
          targetId: playerId,
          amount: outcome.magnitude,
        });
        break;
      case "energy-drain":
        effects.push({
          type: "energy-cost",
          targetId: playerId,
          amount: outcome.magnitude,
        });
        break;
      case "offer-reshuffle":
      case "gravity-shift":
      case "hazard-surge":
      case "world-fracture":
        break;
    }

    this.applyEffectsToPlayers(effects);
    const events: DuelEngineEvent[] = [
      {
        type: "mystery-resolved",
        playerId,
        mysteryId,
        outcome,
      },
    ];
    this.resolveTerminalState(events);
    return events;
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
      inventories: {
        "player-1": this.inventories["player-1"].snapshot(),
        "player-2": this.inventories["player-2"].snapshot(),
      },
      incomingThreats: {
        "player-1": this.threats.snapshotFor("player-1"),
        "player-2": this.threats.snapshotFor("player-2"),
      },
      tactical: this.tactical.snapshot(),
      chance: {
        pity: this.chance.pitySnapshot(),
        mysteries: this.chance.publicMysteries(),
      },
      map: duelMapProfile(this.mapId),
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
        this.useStoredAction(player, intent.itemId, events);
        return;
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

    if (
      player.targetInstanceId !== null &&
      player.targetInstanceId.startsWith("threat:")
    ) {
      this.typeThreat(player, char, events);
      return;
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

    if (matches.length === 1) {
      const offer = matches[0]!;
      const action = this.actions.get(offer.actionId);
      if (
        action !== undefined &&
        nextPrefix === action.answerToken &&
        !this.canFinalizeAction(player.id, action)
      ) {
        events.push({
          type: "action-blocked",
          playerId: player.id,
          targetInstanceId: offer.instanceId,
          actionId: offer.actionId,
          reason: this.blockReason(player.id, action),
        });
        return;
      }
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

    const wouldComplete =
      offer.typedPrefix.length + 1 === action.answerToken.length;
    if (
      wouldComplete &&
      !this.canFinalizeAction(player.id, action)
    ) {
      events.push({
        type: "action-blocked",
        playerId: player.id,
        targetInstanceId: offer.instanceId,
        actionId: offer.actionId,
        reason: this.blockReason(player.id, action),
      });
      return;
    }

    player.correctChars += 1;
    offer.typedPrefix += char;
    player.acquisitionPrefix = offer.typedPrefix;
    this.completeIfFinished(player, offer, events);
  }

  private typeThreat(
    player: DuelPlayerState,
    char: string,
    events: DuelEngineEvent[],
  ): void {
    const threatId = player.targetInstanceId;
    if (threatId === null) return;
    const result = this.threats.typeChar(
      player.id,
      threatId,
      char,
    );
    if (result.kind === "wrong") {
      player.wrongChars += 1;
      events.push({
        type: "typing-miss",
        playerId: player.id,
        char,
      });
      return;
    }
    if (result.kind === "unavailable") {
      player.targetInstanceId = null;
      player.acquisitionPrefix = "";
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "target-unavailable",
      });
      return;
    }

    player.correctChars += 1;
    const threat = this.threats.getOpenThreat(player.id, threatId);
    player.acquisitionPrefix = threat?.typedPrefix ?? "";
    if (result.completed) {
      player.targetInstanceId = null;
      player.acquisitionPrefix = "";
    }
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

    if (action.resolveMode === "banked") {
      const stored = this.inventories[player.id].store(
        action,
        this.tickNumber,
      );
      if (!stored.stored) {
        return;
      }
      offer.status = "completed";
      events.push({
        type: "action-completed",
        playerId: player.id,
        targetInstanceId: offer.instanceId,
        actionId: offer.actionId,
      });
      events.push({
        type: "action-banked",
        playerId: player.id,
        actionId: offer.actionId,
        storedInstanceId: stored.entry.instanceId,
        bucket: stored.bucket,
      });
      player.targetInstanceId = null;
      player.acquisitionPrefix = "";
      return;
    }

    if (action.responseOpportunity !== undefined) {
      this.reserveEnergy(player.id, action.energyCost);
      const threat = this.threats.create(
        action,
        player.id,
        otherPlayer(player.id),
      );
      if (threat !== null) {
        this.pendingEffects.push({
          type: "energy-cost",
          targetId: player.id,
          amount: action.energyCost,
        });
        events.push({
          type: "threat-created",
          threat,
        });
      }
    } else {
      this.queueActionResolution(action, player.id);
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

  private useStoredAction(
    player: DuelPlayerState,
    actionId: string,
    events: DuelEngineEvent[],
  ): void {
    const action = this.actions.get(actionId);
    if (
      action === undefined ||
      action.resolveMode !== "banked"
    ) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "item-unavailable",
      });
      return;
    }
    if (!this.hasEnergy(player.id, action.energyCost)) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "insufficient-energy",
      });
      return;
    }

    const stored =
      this.inventories[player.id].consumeFirstByAction(actionId);
    if (stored === null) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "item-unavailable",
      });
      return;
    }

    this.queueActionResolution(action, player.id);
    events.push({
      type: "stored-action-used",
      playerId: player.id,
      actionId,
      storedInstanceId: stored.instanceId,
    });
  }

  private queueActionResolution(
    action: DuelActionDefinition,
    playerId: DuelPlayerId,
  ): void {
    this.reserveEnergy(playerId, action.energyCost);
    const resolution = resolveDuelAction(action, playerId);
    this.pendingEffects.push(...resolution.effects);
    for (const effect of resolution.tacticalEffects) {
      this.tactical.apply(effect);
    }
  }

  private canFinalizeAction(
    playerId: DuelPlayerId,
    action: DuelActionDefinition,
  ): boolean {
    if (action.resolveMode === "banked") {
      return this.inventories[playerId].canStore(action);
    }
    return this.hasEnergy(playerId, action.energyCost);
  }

  private blockReason(
    playerId: DuelPlayerId,
    action: DuelActionDefinition,
  ): "inventory-full" | "insufficient-energy" {
    if (
      action.resolveMode === "banked" &&
      !this.inventories[playerId].canStore(action)
    ) {
      return "inventory-full";
    }
    return "insufficient-energy";
  }

  private hasEnergy(
    playerId: DuelPlayerId,
    cost: number,
  ): boolean {
    const needed = Math.max(0, cost);
    return (
      this.players[playerId].energy -
        this.reservedEnergyCost[playerId] >=
      needed
    );
  }

  private reserveEnergy(
    playerId: DuelPlayerId,
    cost: number,
  ): void {
    this.reservedEnergyCost[playerId] += Math.max(0, cost);
  }

  private selectTarget(
    player: DuelPlayerState,
    targetInstanceId: string,
    events: DuelEngineEvent[],
  ): void {
    const threat = this.threats.getOpenThreat(
      player.id,
      targetInstanceId,
    );
    if (threat !== null) {
      const previous = this.lockedOffer(player);
      if (previous !== null) {
        previous.status = "available";
        previous.typedPrefix = "";
      }
      player.targetInstanceId = threat.id;
      player.acquisitionPrefix = threat.typedPrefix;
      events.push({
        type: "target-locked",
        playerId: player.id,
        targetInstanceId: threat.id,
      });
      return;
    }

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
    if (!targetInstanceId.startsWith("threat:")) {
      const offer = this.lockedOffer(player);
      if (offer !== null) {
        offer.status = "available";
        offer.typedPrefix = "";
      }
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

  private applyEffectsToPlayers(
    effects: readonly DuelCombatEffect[],
  ): void {
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
    const energyCost: Record<DuelPlayerId, number> = {
      "player-1": 0,
      "player-2": 0,
    };

    for (const effect of effects) {
      const amount = Math.max(
        0,
        Number.isFinite(effect.amount) ? effect.amount : 0,
      );
      if (effect.type === "damage") {
        hullDamage[effect.targetId] += amount;
      }
      if (effect.type === "shield") {
        shieldDelta[effect.targetId] += amount;
      }
      if (effect.type === "repair") {
        repairDelta[effect.targetId] += amount;
      }
      if (effect.type === "energy") {
        energyDelta[effect.targetId] += amount;
      }
      if (effect.type === "energy-cost") {
        energyCost[effect.targetId] += amount;
      }
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
          player.energy -
            energyCost[playerId] +
            energyDelta[playerId],
        ),
      );
    }
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
