import { DUEL_ACTIONS_BY_ID } from "./actions";
import { duelActionQualityForMistakes } from "./accuracy";
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
  resolveDuelCataclysm,
  resolveDuelHazard,
} from "./hazards";
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
  DuelNeutralObjectiveSystem,
  type DuelNeutralObjective,
  type DuelNeutralObjectiveKind,
  type DuelObjectiveResolution,
} from "./objectives";
import {
  DuelStrategySystem,
  DUEL_TRAP_INITIATIVE_COST,
  duelComboEffect,
  duelConversionDefinition,
  duelTrapEffect,
  type DuelComboId,
  type DuelConversionId,
  type DuelStrategySnapshot,
  type DuelTrapId,
} from "./strategy";
import {
  DuelTacticalMapState,
  type DuelTacticalMapSnapshot,
} from "./tactical";
import {
  DuelThreatSystem,
  type DuelIncomingThreat,
} from "./threats";
import { matchingDuelOffers } from "./typing";
import {
  duelOfferLifetimeSeconds,
  sanitizeDuelOfferRemainingSeconds,
} from "./offer-lifecycle";
import {
  DuelCooldownState,
  type DuelCooldownSnapshot,
} from "./cooldowns";

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
  targetMistakes: number;
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
  cooldowns: Readonly<
    Record<DuelPlayerId, DuelCooldownSnapshot>
  >;
  tactical: DuelTacticalMapSnapshot;
  chance: {
    pity: Readonly<Record<DuelPlayerId, number>>;
    mysteries: readonly DuelMysteryPublic[];
  };
  map: DuelMapProfile;
  neutralObjective: DuelNeutralObjective | null;
  strategy: DuelStrategySnapshot;
  publicTrapHints: Readonly<Record<DuelPlayerId, readonly string[]>>;
  pendingHazards: readonly DuelPendingHazard[];
};

export type DuelPendingHazard = {
  hazard: DuelHazardEvent;
  remainingSeconds: number;
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
        | "target-frozen"
        | "item-unavailable"
        | "skill-unavailable"
        | "insufficient-energy"
        | "action-cooldown";
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
      reason:
        | "inventory-full"
        | "insufficient-energy"
        | "cooldown";
    }
  | {
      type: "action-completed";
      playerId: DuelPlayerId;
      targetInstanceId: string;
      actionId: string;
    }
  | {
      type: "offer-expired";
      playerId: DuelPlayerId;
      targetInstanceId: string;
      actionId: string;
      slotIndex: number;
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
      type: "combo-ready";
      playerId: DuelPlayerId;
      comboId: DuelComboId;
    }
  | {
      type: "combo-used";
      playerId: DuelPlayerId;
      comboId: DuelComboId;
    }
  | {
      type: "conversion-used";
      playerId: DuelPlayerId;
      conversionId: DuelConversionId;
    }
  | {
      type: "trap-armed";
      playerId: DuelPlayerId;
      trapId: DuelTrapId;
      publicHint: string;
    }
  | {
      type: "trap-triggered";
      playerId: DuelPlayerId;
      trapId: DuelTrapId;
      triggeredByPlayerId: DuelPlayerId;
    }
  | {
      type: "objective-spawned";
      objective: DuelNeutralObjective;
    }
  | {
      type: "objective-resolved";
      resolution: DuelObjectiveResolution;
    }
  | {
      type: "map-hazard-telegraph";
      hazard: DuelHazardEvent;
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
  escalationSeconds?: number;
  hardOvertimeSeconds?: number;
  hazardIntervalScale?: number;
  hazardPressureScale?: number;
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
    targetMistakes: 0,
    offers: [],
  };
}

export class DuelEngine {
  private readonly actions: ReadonlyMap<string, DuelActionDefinition>;
  private readonly regulationSeconds: number;
  private readonly escalationSeconds: number;
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
  private readonly cooldowns = new DuelCooldownState();
  private readonly tactical = new DuelTacticalMapState();
  private readonly strategy = new DuelStrategySystem();
  private readonly objectives = new DuelNeutralObjectiveSystem();
  private readonly chance: DuelChanceSystem;
  private readonly director: DuelMapDirector;
  private readonly mapId: DuelMapId;
  private readonly queuedIntents: DuelIntent[] = [];
  private readonly pendingEffects: DuelCombatEffect[] = [];
  private readonly pendingHazards: DuelPendingHazard[] = [];
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
      this.mapId,
    );
    this.director = new DuelMapDirector({
      mapId: this.mapId,
      matchSeed: config.matchSeed ?? 1,
      contentVersion: DUEL_CONTENT_VERSION,
      hazardIntervalScale: config.hazardIntervalScale,
      hazardPressureScale: config.hazardPressureScale,
    });
    this.regulationSeconds = Math.max(
      1,
      config.regulationSeconds ?? DUEL_DEFAULT_REGULATION_SECONDS,
    );
    this.escalationSeconds = Math.max(
      1,
      config.escalationSeconds ?? this.regulationSeconds,
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
    this.pendingHazards.length = 0;
    this.reservedEnergyCost["player-1"] = 0;
    this.reservedEnergyCost["player-2"] = 0;
    this.threats.clear();
    this.cooldowns.clear();
    this.tactical.clear();
    this.strategy.resetRound();
    this.objectives.resetRound();
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
      .map((offer) => {
        const cloned = cloneOffer(offer);
        const action = this.actions.get(cloned.actionId);
        cloned.remainingSeconds =
          sanitizeDuelOfferRemainingSeconds(
            cloned.remainingSeconds,
            action === undefined
              ? 20
              : duelOfferLifetimeSeconds(action.category),
          );
        return cloned;
      })
      .sort(
        (left, right) =>
          left.slotIndex - right.slotIndex ||
          left.instanceId.localeCompare(right.instanceId),
      );
    player.targetInstanceId = null;
    player.acquisitionPrefix = "";
  }

  enqueueIntent(intent: DuelIntent): void {
    this.queuedIntents.push({ ...intent });
  }

  spawnNeutralObjective(
    kind: DuelNeutralObjectiveKind,
  ): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const objective = this.objectives.spawn(
      kind,
      duelMapProfile(this.mapId),
    );
    return objective === null
      ? []
      : [{ type: "objective-spawned", objective }];
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
    this.cooldowns.update(dt);
    this.tactical.update(dt);
    this.strategy.update(dt);
    this.advancePendingHazards(dt, events);
    this.expirePrivateOffers(dt, events);
    const directorEvents = this.director.update(dt, this.phase());
    for (const event of directorEvents) {
      if (event.type === "hazard") {
        this.pendingHazards.push({
          hazard: { ...event.hazard },
          remainingSeconds: Math.max(
            0,
            event.hazard.telegraphSeconds,
          ),
        });
        events.push({
          type: "map-hazard-telegraph",
          hazard: event.hazard,
        });
      } else if (event.type === "objective") {
        events.push(...this.spawnNeutralObjective(event.objective.kind));
      } else {
        const cataclysm = resolveDuelCataclysm(
          event.cataclysm,
        );
        this.pendingEffects.push(...cataclysm.effects);
        for (const effect of cataclysm.tacticalEffects) {
          this.tactical.apply(effect);
        }
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

    const objectiveResolution = this.objectives.finalizeTick();
    if (objectiveResolution !== null) {
      this.resolveObjective(objectiveResolution, events);
    }

    for (const threatEvent of this.threats.update(dt)) {
      const target = this.players[threatEvent.targetPlayerId];
      if (target.targetInstanceId === threatEvent.threatId) {
        target.targetInstanceId = null;
        target.acquisitionPrefix = "";
      }

      if (threatEvent.outcome === "countered") {
        this.strategy.gainInitiative(
          threatEvent.targetPlayerId,
          "counter",
        );
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
        const quality = Math.max(
          0.75,
          Math.min(
            1,
            Number.isFinite(threatEvent.effectScale)
              ? threatEvent.effectScale
              : 1,
          ),
        );
        this.pendingEffects.push(
          ...resolution.effects
            .filter((effect) => effect.type !== "energy-cost")
            .map((effect) =>
              effect.type === "damage" &&
              effect.sourceId === threatEvent.sourcePlayerId
                ? {
                    ...effect,
                    amount:
                      effect.amount *
                      this.strategy.attackScale(
                        threatEvent.sourcePlayerId,
                      ) *
                      quality,
                  }
                : effect,
            ),
        );
        for (const effect of resolution.tacticalEffects) {
          this.tactical.apply({
            ...effect,
            strength: effect.strength * quality,
          });
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

  private advancePendingHazards(
    dtSeconds: number,
    events: DuelEngineEvent[],
  ): void {
    if (this.pendingHazards.length === 0) return;
    const dt = Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );
    let write = 0;
    for (const pending of this.pendingHazards) {
      pending.remainingSeconds = Math.max(
        0,
        pending.remainingSeconds - dt,
      );
      if (pending.remainingSeconds > 0) {
        this.pendingHazards[write++] = pending;
        continue;
      }

      const resolution = resolveDuelHazard(
        pending.hazard,
        this.tactical.snapshot().controlPressure,
      );
      this.pendingEffects.push(...resolution.effects);
      for (const effect of resolution.tacticalEffects) {
        this.tactical.apply(effect);
      }
      events.push({
        type: "map-hazard",
        hazard: pending.hazard,
      });
    }
    this.pendingHazards.length = write;
  }

  applyHazardEvent(
    hazard: DuelHazardEvent,
  ): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const resolution = resolveDuelHazard(
      hazard,
      this.tactical.snapshot().controlPressure,
    );
    for (const effect of resolution.tacticalEffects) {
      this.tactical.apply(effect);
    }
    this.applyEffectsToPlayers(resolution.effects);
    const events: DuelEngineEvent[] = [
      { type: "map-hazard", hazard },
    ];
    this.resolveTerminalState(events);
    return events;
  }

  applyCataclysmEvent(
    cataclysm: DuelCataclysmEvent,
  ): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const resolution = resolveDuelCataclysm(cataclysm);
    for (const effect of resolution.tacticalEffects) {
      this.tactical.apply(effect);
    }
    this.applyEffectsToPlayers(resolution.effects);
    const events: DuelEngineEvent[] = [
      { type: "map-cataclysm", cataclysm },
    ];
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
    this.appendFateEffects(resolution, effects);
    const cooldownReduction =
      resolution.outcome.cooldownReductionSeconds ?? 0;
    if (cooldownReduction > 0) {
      this.cooldowns.reduce(
        playerId,
        cooldownReduction,
      );
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
    this.appendMysteryOutcomeEffects(
      playerId,
      outcome,
      effects,
    );

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
        this.escalationSeconds,
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
      cooldowns: {
        "player-1": this.cooldowns.snapshotFor("player-1"),
        "player-2": this.cooldowns.snapshotFor("player-2"),
      },
      tactical: this.tactical.snapshot(),
      chance: {
        pity: this.chance.pitySnapshot(),
        mysteries: this.chance.publicMysteries(),
      },
      map: duelMapProfile(this.mapId),
      neutralObjective: this.objectives.activeObjective(),
      strategy: this.strategy.snapshot(),
      publicTrapHints: {
        "player-1": this.strategy.publicTrapHintsFor("player-1"),
        "player-2": this.strategy.publicTrapHintsFor("player-2"),
      },
      pendingHazards: this.pendingHazards.map((pending) => ({
        hazard: { ...pending.hazard },
        remainingSeconds: pending.remainingSeconds,
      })),
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
        this.activateDuelSkill(
          player,
          intent.skillId,
          events,
        );
        return;
    }
  }

  private activateDuelSkill(
    player: DuelPlayerState,
    skillId: string,
    events: DuelEngineEvent[],
  ): void {
    if (skillId.startsWith("combo:")) {
      const comboId = skillId.slice(6) as DuelComboId;
      if (
        ![
          "homing-barrage",
          "mirror-barrier",
          "gravity-bomb",
          "repair-drone",
          "overcharged-railgun",
        ].includes(comboId)
      ) {
        this.rejectSkill(player, events);
        return;
      }
      if (
        this.strategy.consumeCombo(
          player.id,
          comboId,
        ) === null
      ) {
        this.rejectSkill(player, events);
        return;
      }

      const combo = duelComboEffect(comboId);
      if (combo.damage > 0) {
        this.pendingEffects.push({
          type: "damage",
          targetId: otherPlayer(player.id),
          sourceId: player.id,
          amount:
            combo.damage *
            this.strategy.attackScale(player.id),
        });
      }
      if (combo.shield > 0) {
        this.pendingEffects.push({
          type: "shield",
          targetId: player.id,
          amount: combo.shield,
        });
      }
      if (combo.repair > 0) {
        this.pendingEffects.push({
          type: "repair",
          targetId: player.id,
          amount: combo.repair,
        });
      }
      if (combo.tacticalPressure > 0) {
        this.tactical.apply({
          effectId: "control-pressure",
          sourcePlayerId: player.id,
          targetPlayerId: otherPlayer(player.id),
          strength: combo.tacticalPressure,
          remainingSeconds: 6,
        });
      }
      events.push({
        type: "combo-used",
        playerId: player.id,
        comboId,
      });
      return;
    }

    if (skillId.startsWith("conversion:")) {
      const conversionId =
        skillId.slice(11) as DuelConversionId;
      if (
        ![
          "sacrifice",
          "overload",
          "reactor-dump",
          "berserk",
        ].includes(conversionId)
      ) {
        this.rejectSkill(player, events);
        return;
      }
      const definition =
        duelConversionDefinition(conversionId);
      if (
        player.hull <= definition.hullCost ||
        player.shield < definition.shieldCost ||
        player.energy < definition.energyCost
      ) {
        this.rejectSkill(player, events);
        return;
      }
      const resolution =
        this.strategy.applyConversion(
          player.id,
          conversionId,
        );
      player.hull = Math.max(
        1,
        player.hull - resolution.hullCost,
      );
      player.shield = Math.max(
        0,
        Math.min(
          player.maxShield,
          player.shield -
            resolution.shieldCost +
            resolution.shieldGain,
        ),
      );
      player.energy = Math.max(
        0,
        Math.min(
          player.maxEnergy,
          player.energy -
            resolution.energyCost +
            resolution.energyGain,
        ),
      );
      events.push({
        type: "conversion-used",
        playerId: player.id,
        conversionId,
      });
      return;
    }

    if (skillId.startsWith("trap:")) {
      const trapId = skillId.slice(5) as DuelTrapId;
      if (
        ![
          "minefield",
          "mirror-trap",
          "static-snare",
          "decoy",
          "counter-battery",
        ].includes(trapId)
      ) {
        this.rejectSkill(player, events);
        return;
      }
      if (
        this.strategy.snapshot()[player.id].initiative <
        DUEL_TRAP_INITIATIVE_COST
      ) {
        this.rejectSkill(player, events);
        return;
      }
      const trap = this.strategy.armTrap(
        player.id,
        trapId,
        this.tickNumber,
      );
      if (trap === null) {
        this.rejectSkill(player, events);
        return;
      }
      if (
        !this.strategy.spendInitiative(
          player.id,
          DUEL_TRAP_INITIATIVE_COST,
        )
      ) {
        throw new Error("Trap Initiative spend desynchronized.");
      }
      events.push({
        type: "trap-armed",
        playerId: player.id,
        trapId,
        publicHint: trap.publicHint,
      });
      return;
    }

    this.rejectSkill(player, events);
  }

  private rejectSkill(
    player: DuelPlayerState,
    events: DuelEngineEvent[],
  ): void {
    events.push({
      type: "intent-rejected",
      playerId: player.id,
      sequence: player.lastAcceptedSequence,
      reason: "skill-unavailable",
    });
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
      const specialTarget =
        this.objectives.isActiveTarget(targetInstanceId) ||
        this.threats.getOpenThreat(
          player.id,
          targetInstanceId,
        ) !== null;
      if (
        this.tactical.isTargetFrozen(player.id) &&
        !specialTarget
      ) {
        events.push({
          type: "intent-rejected",
          playerId: player.id,
          sequence: player.lastAcceptedSequence,
          reason: "target-frozen",
        });
        return;
      }
      this.selectTarget(player, targetInstanceId, events);
    }

    if (
      player.targetInstanceId !== null &&
      player.targetInstanceId.startsWith("threat:")
    ) {
      this.typeThreat(player, char, events);
      return;
    }

    if (
      player.targetInstanceId !== null &&
      player.targetInstanceId.startsWith("objective:")
    ) {
      this.typeObjective(player, char, events);
      return;
    }

    const locked = this.lockedOffer(player);
    if (locked !== null) {
      this.typeLockedOffer(player, locked, char, events);
      return;
    }

    if (this.tactical.isTargetFrozen(player.id)) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "target-frozen",
      });
      return;
    }

    const nextPrefix = player.acquisitionPrefix + char;
    const matches = matchingDuelOffers(
      nextPrefix,
      this.availableOffersForTyping(player),
      this.actions,
    );
    if (matches.length === 0) {
      player.wrongChars += 1;
      player.targetMistakes += 1;
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
      player.targetMistakes += 1;
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
      player.targetMistakes += 1;
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

  private typeObjective(
    player: DuelPlayerState,
    char: string,
    events: DuelEngineEvent[],
  ): void {
    const objectiveId = player.targetInstanceId;
    if (objectiveId === null) return;

    const result = this.objectives.typeChar(
      player.id,
      objectiveId,
      char,
    );
    if (result.kind === "wrong") {
      player.wrongChars += 1;
      player.targetMistakes += 1;
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
    player.acquisitionPrefix =
      this.objectives.progressFor(player.id, objectiveId) ?? "";
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
      const quality = duelActionQualityForMistakes(
        player.targetMistakes,
      );
      const stored = this.inventories[player.id].store(
        action,
        this.tickNumber,
        quality.scale,
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
      this.recordStrategyAction(player, action, events);
      events.push({
        type: "action-banked",
        playerId: player.id,
        actionId: offer.actionId,
        storedInstanceId: stored.entry.instanceId,
        bucket: stored.bucket,
      });
      player.targetInstanceId = null;
      player.acquisitionPrefix = "";
      player.targetMistakes = 0;
      return;
    }

    if (action.responseOpportunity !== undefined) {
      this.reserveEnergy(player.id, action.energyCost);
      const projectileSpeedScale =
        this.tactical.snapshot()
          .projectileSpeedScale[player.id];
      const threat = this.threats.create(
        action,
        player.id,
        otherPlayer(player.id),
        1 /
          Math.max(
            0.5,
            (Number.isFinite(projectileSpeedScale)
              ? projectileSpeedScale
              : 1) *
              this.strategy.projectileTempoScale(player.id),
          ),
        duelActionQualityForMistakes(
          player.targetMistakes,
        ).scale,
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
    } else if (
      !this.queueSpecialActionResolution(
        action,
        player.id,
        events,
      )
    ) {
      this.queueActionResolution(
        action,
        player.id,
        duelActionQualityForMistakes(
          player.targetMistakes,
        ).scale,
      );
      if (action.effectId === "scan") {
        this.revealMysteryIntelForScan(
          player.id,
          events,
        );
      }
    }

    this.triggerOpponentTrap(
      player.id,
      action,
      events,
    );
    this.cooldowns.activate(
      player.id,
      action.id,
      action.cooldownSeconds,
    );
    offer.status = "completed";
    events.push({
      type: "action-completed",
      playerId: player.id,
      targetInstanceId: offer.instanceId,
      actionId: offer.actionId,
    });
    this.recordStrategyAction(player, action, events);
    player.targetInstanceId = null;
    player.acquisitionPrefix = "";
    player.targetMistakes = 0;
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
    if (!this.cooldowns.isReady(player.id, action.id)) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "action-cooldown",
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

    this.queueActionResolution(
      action,
      player.id,
      stored.qualityScale,
    );
    this.triggerOpponentTrap(
      player.id,
      action,
      events,
    );
    this.cooldowns.activate(
      player.id,
      action.id,
      action.cooldownSeconds,
    );
    events.push({
      type: "stored-action-used",
      playerId: player.id,
      actionId,
      storedInstanceId: stored.instanceId,
    });
  }

  private triggerOpponentTrap(
    sourcePlayerId: DuelPlayerId,
    action: DuelActionDefinition,
    events: DuelEngineEvent[],
  ): void {
    if (
      action.category !== "attack" &&
      action.category !== "tactical"
    ) {
      return;
    }
    const ownerId = otherPlayer(sourcePlayerId);
    const trap = this.strategy.consumeOldestTrap(ownerId);
    if (trap === null) return;

    const effect = duelTrapEffect(trap.trapId);
    if (effect.damageToTrigger > 0) {
      this.pendingEffects.push({
        type: "damage",
        targetId: sourcePlayerId,
        amount: effect.damageToTrigger,
        sourceId: ownerId,
      });
    }
    if (effect.energyCostToTrigger > 0) {
      this.pendingEffects.push({
        type: "energy-cost",
        targetId: sourcePlayerId,
        amount: effect.energyCostToTrigger,
      });
    }
    if (effect.shieldToOwner > 0) {
      this.pendingEffects.push({
        type: "shield",
        targetId: ownerId,
        amount: effect.shieldToOwner,
      });
    }
    if (effect.tacticalEffect !== null) {
      this.tactical.apply({
        effectId: effect.tacticalEffect.effectId,
        sourcePlayerId: ownerId,
        targetPlayerId: sourcePlayerId,
        strength: effect.tacticalEffect.strength,
        remainingSeconds:
          effect.tacticalEffect.durationSeconds,
      });
    }
    events.push({
      type: "trap-triggered",
      playerId: ownerId,
      trapId: trap.trapId,
      triggeredByPlayerId: sourcePlayerId,
    });
  }

  private revealMysteryIntelForScan(
    playerId: DuelPlayerId,
    events: DuelEngineEvent[],
  ): void {
    let mystery = this.chance
      .publicMysteries()
      .find((candidate) => !candidate.resolved);
    if (mystery === undefined) {
      mystery = this.chance.createMystery(this.phase());
      events.push({ type: "mystery-created", mystery });
    }
    const reveal = this.chance.revealMystery(
      mystery.id,
      "category",
    );
    if (reveal !== null) {
      events.push({
        type: "mystery-revealed",
        playerId,
        reveal,
      });
    }
  }

  private queueSpecialActionResolution(
    action: DuelActionDefinition,
    playerId: DuelPlayerId,
    events: DuelEngineEvent[],
  ): boolean {
    if (action.effectId === "fate-crystal") {
      const resolution = this.chance.rollFate(playerId);
      this.appendFateEffects(
        resolution,
        this.pendingEffects,
      );
      const cooldownReduction =
        resolution.outcome.cooldownReductionSeconds ?? 0;
      if (cooldownReduction > 0) {
        this.cooldowns.reduce(
          playerId,
          cooldownReduction,
        );
      }
      events.push({ type: "fate-resolved", resolution });
      return true;
    }

    if (action.effectId === "mystery-black-hole") {
      let mystery = this.chance
        .publicMysteries()
        .find((candidate) => !candidate.resolved);
      if (mystery === undefined) {
        mystery = this.chance.createMystery(this.phase());
        events.push({ type: "mystery-created", mystery });
      }
      const outcome = this.chance.resolveMystery(mystery.id);
      if (outcome !== null) {
        this.appendMysteryOutcomeEffects(
          playerId,
          outcome,
          this.pendingEffects,
        );
        events.push({
          type: "mystery-resolved",
          playerId,
          mysteryId: mystery.id,
          outcome,
        });
      }
      return true;
    }

    return false;
  }

  private queueActionResolution(
    action: DuelActionDefinition,
    playerId: DuelPlayerId,
    qualityScale = 1,
  ): void {
    this.reserveEnergy(playerId, action.energyCost);
    const resolution = resolveDuelAction(action, playerId);
    const attackScale = this.strategy.attackScale(playerId);
    const quality = Math.max(
      0.75,
      Math.min(1, Number.isFinite(qualityScale) ? qualityScale : 1),
    );
    this.pendingEffects.push(
      ...resolution.effects.map((effect) => {
        if (
          effect.type === "damage" &&
          effect.sourceId === playerId
        ) {
          return {
            ...effect,
            amount: effect.amount * attackScale * quality,
          };
        }
        if (
          (effect.type === "shield" ||
            effect.type === "repair" ||
            effect.type === "energy") &&
          effect.targetId === playerId
        ) {
          return { ...effect, amount: effect.amount * quality };
        }
        return effect;
      }),
    );
    for (const effect of resolution.tacticalEffects) {
      this.tactical.apply({
        ...effect,
        strength: effect.strength * quality,
      });
    }
  }

  private canFinalizeAction(
    playerId: DuelPlayerId,
    action: DuelActionDefinition,
  ): boolean {
    if (action.resolveMode === "banked") {
      return this.inventories[playerId].canStore(action);
    }
    return (
      this.cooldowns.isReady(playerId, action.id) &&
      this.hasEnergy(playerId, action.energyCost)
    );
  }

  private blockReason(
    playerId: DuelPlayerId,
    action: DuelActionDefinition,
  ):
    | "inventory-full"
    | "insufficient-energy"
    | "cooldown" {
    if (
      action.resolveMode === "banked" &&
      !this.inventories[playerId].canStore(action)
    ) {
      return "inventory-full";
    }
    if (
      action.resolveMode === "instant" &&
      !this.cooldowns.isReady(playerId, action.id)
    ) {
      return "cooldown";
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
    if (this.objectives.isActiveTarget(targetInstanceId)) {
      const previous = this.lockedOffer(player);
      if (previous !== null) {
        previous.status = "available";
        previous.typedPrefix = "";
      }
      player.targetInstanceId = targetInstanceId;
      player.acquisitionPrefix =
        this.objectives.progressFor(player.id, targetInstanceId) ?? "";
      player.targetMistakes = 0;
      events.push({
        type: "target-locked",
        playerId: player.id,
        targetInstanceId,
      });
      return;
    }

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
      player.targetMistakes = 0;
      events.push({
        type: "target-locked",
        playerId: player.id,
        targetInstanceId: threat.id,
      });
      return;
    }

    if (this.tactical.isTargetFrozen(player.id)) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "target-frozen",
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
    const action = this.actions.get(offer.actionId);
    if (
      action?.resolveMode === "instant" &&
      !this.cooldowns.isReady(player.id, action.id)
    ) {
      events.push({
        type: "intent-rejected",
        playerId: player.id,
        sequence: player.lastAcceptedSequence,
        reason: "action-cooldown",
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
    player.targetMistakes = 0;
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
    player.targetMistakes = 0;
    events.push({
      type: "target-cancelled",
      playerId: player.id,
      targetInstanceId,
    });
  }

  private expirePrivateOffers(
    dtSeconds: number,
    events: DuelEngineEvent[],
  ): void {
    if (dtSeconds <= 0) return;

    for (const playerId of PLAYER_IDS) {
      const player = this.players[playerId];
      for (const offer of player.offers) {
        if (offer.status !== "available") continue;
        const action = this.actions.get(offer.actionId);
        const remaining =
          sanitizeDuelOfferRemainingSeconds(
            offer.remainingSeconds,
            action === undefined
              ? 20
              : duelOfferLifetimeSeconds(action.category),
          );
        if (remaining === null) continue;

        const next = Math.max(0, remaining - dtSeconds);
        offer.remainingSeconds = next;
        if (next > 0) continue;

        offer.status = "expired";
        offer.typedPrefix = "";
        if (player.targetInstanceId === offer.instanceId) {
          player.targetInstanceId = null;
          player.acquisitionPrefix = "";
          player.targetMistakes = 0;
        }
        events.push({
          type: "offer-expired",
          playerId,
          targetInstanceId: offer.instanceId,
          actionId: offer.actionId,
          slotIndex: offer.slotIndex,
        });
      }
    }
  }

  private availableOffersForTyping(
    player: DuelPlayerState,
  ): readonly DuelActionOffer[] {
    return player.offers.filter((offer) => {
      if (offer.status !== "available") {
        return offer.status === "locked";
      }
      const action = this.actions.get(offer.actionId);
      return (
        action === undefined ||
        action.resolveMode === "banked" ||
        this.cooldowns.isReady(player.id, action.id)
      );
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

  private resolveObjective(
    resolution: DuelObjectiveResolution,
    events: DuelEngineEvent[],
  ): void {
    for (const playerId of PLAYER_IDS) {
      const player = this.players[playerId];
      if (player.targetInstanceId === resolution.objectiveId) {
        player.targetInstanceId = null;
        player.acquisitionPrefix = "";
      }
    }

    events.push({ type: "objective-resolved", resolution });
    if (resolution.winnerId === null) return;

    this.strategy.gainInitiative(
      resolution.winnerId,
      "neutral-objective",
    );
    if (resolution.kind === "map-control") {
      this.strategy.gainInitiative(
        resolution.winnerId,
        "map-control",
      );
    }

    if (resolution.kind === "fate") {
      const fate = this.chance.rollFate(resolution.winnerId);
      this.appendFateEffects(fate, this.pendingEffects);
      events.push({ type: "fate-resolved", resolution: fate });
      return;
    }
    if (resolution.kind === "cache") {
      this.pendingEffects.push(
        {
          type: "energy",
          targetId: resolution.winnerId,
          amount: 18,
        },
        {
          type: "shield",
          targetId: resolution.winnerId,
          amount: 6,
        },
      );
      return;
    }

    this.tactical.apply({
      effectId: "control-pressure",
      sourcePlayerId: resolution.winnerId,
      targetPlayerId: otherPlayer(resolution.winnerId),
      strength: 0.35,
      remainingSeconds: 10,
    });
  }

  private recordStrategyAction(
    player: DuelPlayerState,
    action: DuelActionDefinition,
    events: DuelEngineEvent[],
  ): void {
    if (player.targetMistakes === 0) {
      this.strategy.gainInitiative(
        player.id,
        "perfect-word",
      );
    }
    const combo = this.strategy.recordAction(
      player.id,
      action,
      this.tickNumber,
    );
    if (combo !== null) {
      events.push({
        type: "combo-ready",
        playerId: player.id,
        comboId: combo.id,
      });
    }
    player.targetMistakes = 0;
  }

  private appendMysteryOutcomeEffects(
    playerId: DuelPlayerId,
    outcome: DuelMysteryOutcome,
    effects: DuelCombatEffect[],
  ): void {
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
        this.reshuffleOffersForMystery();
        break;
      case "gravity-shift":
        this.applySharedMysteryTactical(
          "projectile-drag",
          outcome.magnitude,
          6,
        );
        break;
      case "hazard-surge":
        this.applySharedMysteryTactical(
          "offer-drift",
          outcome.magnitude,
          5,
        );
        this.applySharedMysteryTactical(
          "projectile-drag",
          outcome.magnitude * 0.55,
          5,
        );
        break;
      case "world-fracture":
        this.applySharedMysteryTactical(
          "offer-drift",
          outcome.magnitude,
          8,
        );
        this.applySharedMysteryTactical(
          "projectile-drag",
          outcome.magnitude,
          8,
        );
        break;
    }
  }

  private reshuffleOffersForMystery(): void {
    for (const playerId of PLAYER_IDS) {
      const offers = this.players[playerId].offers;
      if (offers.length <= 1) continue;
      const maxSlot = offers.reduce(
        (value, offer) =>
          Math.max(value, offer.slotIndex),
        0,
      );
      for (const offer of offers) {
        offer.slotIndex = maxSlot - offer.slotIndex;
      }
      offers.sort(
        (left, right) =>
          left.slotIndex - right.slotIndex ||
          left.instanceId.localeCompare(right.instanceId),
      );
    }
  }

  private applySharedMysteryTactical(
    effectId: "offer-drift" | "projectile-drag",
    strength: number,
    seconds: number,
  ): void {
    for (const playerId of PLAYER_IDS) {
      this.tactical.apply({
        effectId,
        sourcePlayerId: playerId,
        targetPlayerId: playerId,
        strength,
        remainingSeconds: seconds,
      });
    }
  }

  private appendFateEffects(
    resolution: DuelFateResolution,
    effects: DuelCombatEffect[],
  ): void {
    const playerId = resolution.playerId;
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
  }

  useCombo(
    playerId: DuelPlayerId,
    comboId: DuelComboId,
  ): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    if (this.strategy.consumeCombo(playerId, comboId) === null) {
      return [];
    }
    const combo = duelComboEffect(comboId);
    const effects: DuelCombatEffect[] = [];
    if (combo.damage > 0) {
      effects.push({
        type: "damage",
        targetId: otherPlayer(playerId),
        sourceId: playerId,
        amount: combo.damage * this.strategy.attackScale(playerId),
      });
    }
    if (combo.shield > 0) {
      effects.push({
        type: "shield",
        targetId: playerId,
        amount: combo.shield,
      });
    }
    if (combo.repair > 0) {
      effects.push({
        type: "repair",
        targetId: playerId,
        amount: combo.repair,
      });
    }
    if (combo.tacticalPressure > 0) {
      this.tactical.apply({
        effectId: "control-pressure",
        sourcePlayerId: playerId,
        targetPlayerId: otherPlayer(playerId),
        strength: combo.tacticalPressure,
        remainingSeconds: 6,
      });
    }
    this.applyEffectsToPlayers(effects);
    const events: DuelEngineEvent[] = [
      { type: "combo-used", playerId, comboId },
    ];
    this.resolveTerminalState(events);
    return events;
  }

  useConversion(
    playerId: DuelPlayerId,
    conversionId: DuelConversionId,
  ): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const player = this.players[playerId];
    const definition = duelConversionDefinition(conversionId);
    if (
      player.hull <= definition.hullCost ||
      player.shield < definition.shieldCost ||
      player.energy < definition.energyCost
    ) {
      return [];
    }
    const resolution = this.strategy.applyConversion(
      playerId,
      conversionId,
    );

    player.hull = Math.max(
      1,
      player.hull - resolution.hullCost,
    );
    player.shield = Math.max(
      0,
      Math.min(
        player.maxShield,
        player.shield -
          resolution.shieldCost +
          resolution.shieldGain,
      ),
    );
    player.energy = Math.max(
      0,
      Math.min(
        player.maxEnergy,
        player.energy -
          resolution.energyCost +
          resolution.energyGain,
      ),
    );
    return [
      {
        type: "conversion-used",
        playerId,
        conversionId,
      },
    ];
  }

  armTrap(
    playerId: DuelPlayerId,
    trapId: DuelTrapId,
  ): DuelEngineEvent[] {
    if (this.roundResult.status !== "active") return [];
    const trap = this.strategy.armTrap(
      playerId,
      trapId,
      this.tickNumber,
    );
    if (trap === null) return [];
    return [
      {
        type: "trap-armed",
        playerId,
        trapId,
        publicHint: trap.publicHint,
      },
    ];
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
      let damage =
        hullDamage[playerId] /
        this.strategy.defenseScale(playerId);
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
      offers: player.offers
        .map(cloneOffer)
        .sort(
          (left, right) =>
            left.slotIndex - right.slotIndex ||
            left.instanceId.localeCompare(right.instanceId),
        ),
    };
  }
}
