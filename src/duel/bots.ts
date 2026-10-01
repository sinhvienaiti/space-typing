import { duelActionDefinitionForMap } from "./map-actions";
import type { DuelMapId } from "./maps";
import type {
  DuelActionCategory,
  DuelActionDefinition,
  DuelActionOffer,
  DuelIntent,
  DuelMatchPhase,
  DuelPlayerId,
  DuelTypingCostBand,
} from "./model";
import { DuelRng } from "./rng";
import type { DuelCombatInventorySnapshot } from "./inventory";
import type { DuelIncomingThreat } from "./threats";
import type { DuelNeutralObjective } from "./objectives";

export type DuelBotPersonality =
  | "turtle"
  | "aggro"
  | "tactician"
  | "trickster"
  | "fortune"
  | "sniper"
  | "balanced";

export type DuelBotConfig = {
  playerId: DuelPlayerId;
  wpm: number;
  accuracy: number;
  reactionMs: number;
  personality: DuelBotPersonality;
  seed: number;
};

export type DuelBotPublicPlayer = {
  hullRatio: number;
  shieldRatio: number;
  energyRatio: number;
};

export type DuelBotObservation = {
  mapId: DuelMapId;
  phase: DuelMatchPhase;
  self: DuelBotPublicPlayer;
  opponent: DuelBotPublicPlayer;
  selfEnergy: number;
  ownOffers: readonly DuelActionOffer[];
  ownCooldowns: Readonly<Record<string, number>>;
  ownInventory: DuelCombatInventorySnapshot;
  incomingThreats: readonly DuelIncomingThreat[];
  neutralObjective: DuelNeutralObjective | null;
  ownInitiative: number;
  ownReadyCombos: readonly string[];
  ownTrapCount: number;
};

export type DuelBotMetrics = {
  emittedChars: number;
  correctChars: number;
  wrongChars: number;
};

type BotTarget = {
  kind: "offer" | "threat" | "objective";
  instanceId: string;
  actionId: string;
  answerToken: string;
  progressLength: number;
};

const CATEGORY_WEIGHT: Readonly<
  Record<
    DuelBotPersonality,
    Readonly<Record<DuelActionCategory, number>>
  >
> = {
  turtle: {
    attack: 0.65,
    defense: 1.8,
    support: 1.3,
    tactical: 1.15,
    fate: 0.9,
    mystery: 0.7,
  },
  aggro: {
    attack: 1.9,
    defense: 0.55,
    support: 0.9,
    tactical: 1.05,
    fate: 1,
    mystery: 0.9,
  },
  tactician: {
    attack: 0.95,
    defense: 1.15,
    support: 1.05,
    tactical: 1.9,
    fate: 1.05,
    mystery: 1,
  },
  trickster: {
    attack: 0.8,
    defense: 0.8,
    support: 0.9,
    tactical: 1.75,
    fate: 1.2,
    mystery: 1.9,
  },
  fortune: {
    attack: 0.9,
    defense: 0.9,
    support: 1,
    tactical: 1.05,
    fate: 1.9,
    mystery: 1.65,
  },
  sniper: {
    attack: 1.8,
    defense: 0.7,
    support: 1.1,
    tactical: 1.25,
    fate: 0.9,
    mystery: 0.8,
  },
  balanced: {
    attack: 1,
    defense: 1,
    support: 1,
    tactical: 1,
    fate: 1,
    mystery: 1,
  },
};

const COST_WEIGHT: Readonly<
  Record<DuelBotPersonality, Readonly<Record<DuelTypingCostBand, number>>>
> = {
  turtle: { short: 1.1, medium: 1.15, long: 0.9, epic: 0.7 },
  aggro: { short: 1.3, medium: 1.15, long: 1, epic: 0.8 },
  tactician: { short: 1, medium: 1.2, long: 1.15, epic: 0.9 },
  trickster: { short: 0.95, medium: 1.15, long: 1.25, epic: 1 },
  fortune: { short: 0.9, medium: 1.05, long: 1.3, epic: 1.1 },
  sniper: { short: 0.65, medium: 1, long: 1.65, epic: 1.8 },
  balanced: { short: 1, medium: 1, long: 1, epic: 1 },
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeWpm(value: number): number {
  if (!Number.isFinite(value)) return 40;
  return Math.max(10, Math.min(300, value));
}

function reactionSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0.35;
  return Math.max(0, Math.min(3, value / 1000));
}

function wrongChar(expected: string): string {
  const code = expected.charCodeAt(0) - 97;
  return String.fromCharCode(97 + ((code + 11) % 26));
}

export class DuelBot {
  private readonly rng: DuelRng;
  private readonly playerId: DuelPlayerId;
  private readonly wpm: number;
  private readonly accuracy: number;
  private readonly reactionSeconds: number;
  private readonly personality: DuelBotPersonality;
  private sequence = 0;
  private target: BotTarget | null = null;
  private charIndex = 0;
  private timer = 0;
  private emittedChars = 0;
  private correctChars = 0;
  private wrongChars = 0;

  constructor(config: DuelBotConfig) {
    this.playerId = config.playerId;
    this.wpm = safeWpm(config.wpm);
    this.accuracy = clamp01(config.accuracy);
    this.reactionSeconds = reactionSeconds(config.reactionMs);
    this.personality = config.personality;
    this.rng = new DuelRng(config.seed);
    this.timer = this.reactionSeconds;
  }

  update(
    dtSeconds: number,
    observation: DuelBotObservation,
  ): DuelIntent[] {
    const intents: DuelIntent[] = [];
    let remaining = Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );

    if (!this.targetStillAvailable(observation)) {
      this.resetTarget();
    }
    const urgentThreat = this.pickThreat(observation);
    if (
      urgentThreat !== null &&
      this.target?.kind !== "threat"
    ) {
      this.resetTarget();
    } else if (
      urgentThreat === null &&
      observation.neutralObjective?.status === "active" &&
      this.target?.kind === "offer"
    ) {
      this.resetTarget();
    }

    let guard = 0;
    while (remaining >= 0 && guard < 16) {
      guard += 1;
      if (this.timer > remaining) {
        this.timer -= remaining;
        break;
      }
      remaining -= this.timer;
      this.timer = 0;

      if (this.target === null) {
        const priority = this.choosePriorityTarget(observation);
        if (priority !== null) {
          this.target = priority;
          this.charIndex = priority.progressLength;
          intents.push({
            type: "SELECT_TARGET",
            playerId: this.playerId,
            sequence: this.nextSequence(),
            targetInstanceId: priority.instanceId,
          });
          this.timer = this.characterInterval();
          continue;
        }

        const strategic = this.chooseStrategicIntent(observation);
        if (strategic !== null) {
          intents.push(strategic);
          this.timer = Math.max(
            0.12,
            this.reactionSeconds,
          );
          break;
        }

        const selected = this.chooseOfferTarget(observation);
        if (selected === null) {
          this.timer = Math.max(0.12, this.reactionSeconds);
          break;
        }
        this.target = selected;
        this.charIndex = selected.progressLength;
        intents.push({
          type: "SELECT_TARGET",
          playerId: this.playerId,
          sequence: this.nextSequence(),
          targetInstanceId: selected.instanceId,
        });
        this.timer = this.characterInterval();
        continue;
      }

      const expected = this.target.answerToken[this.charIndex];
      if (expected === undefined) {
        this.resetTarget();
        this.timer = this.reactionSeconds;
        continue;
      }

      const correct = this.rng.nextFloat() < this.accuracy;
      this.emittedChars += 1;
      if (correct) this.correctChars += 1;
      else this.wrongChars += 1;
      intents.push({
        type: "TYPE_CHAR",
        playerId: this.playerId,
        sequence: this.nextSequence(),
        char: correct ? expected : wrongChar(expected),
        targetInstanceId: this.target.instanceId,
      });

      if (correct) {
        this.charIndex += 1;
        if (this.charIndex >= this.target.answerToken.length) {
          this.resetTarget();
          this.timer = this.reactionSeconds;
          continue;
        }
        this.timer = this.characterInterval();
      } else {
        this.timer =
          this.characterInterval() * (1.25 + this.rng.nextFloat() * 0.5);
      }
    }

    return intents;
  }

  currentTargetId(): string | null {
    return this.target?.instanceId ?? null;
  }

  metrics(): DuelBotMetrics {
    return {
      emittedChars: this.emittedChars,
      correctChars: this.correctChars,
      wrongChars: this.wrongChars,
    };
  }

  private chooseOfferTarget(
    observation: DuelBotObservation,
  ): BotTarget | null {
    const candidates = observation.ownOffers
      .filter(
        (offer) =>
          offer.status === "available" &&
          (observation.ownCooldowns[offer.actionId] ?? 0) <= 0,
      )
      .map((offer) => {
        const action = duelActionDefinitionForMap(
          observation.mapId,
          offer.actionId,
        );
        return action === undefined ? null : { offer, action };
      })
      .filter(
        (
          entry,
        ): entry is {
          offer: DuelActionOffer;
          action: DuelActionDefinition;
        } => entry !== null,
      );
    if (candidates.length === 0) return null;

    let total = 0;
    const weighted = candidates.map(({ offer, action }) => {
      let weight =
        CATEGORY_WEIGHT[this.personality][action.category] *
        COST_WEIGHT[this.personality][action.typingCostBand];

      if (
        action.category === "defense" &&
        observation.self.hullRatio < 0.42
      ) {
        weight *= 1.65;
      }
      if (
        action.category === "attack" &&
        observation.opponent.hullRatio < 0.35
      ) {
        weight *= 1.35;
      }
      if (
        action.category === "support" &&
        observation.self.energyRatio < 0.3
      ) {
        weight *= 1.4;
      }
      if (
        observation.phase === "cataclysm" &&
        action.category === "attack"
      ) {
        weight *= 1.25;
      }

      const safe = Math.max(0.01, weight);
      total += safe;
      return { offer, action, weight: safe };
    });

    let roll = this.rng.nextFloat() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        return {
          kind: "offer",
          instanceId: entry.offer.instanceId,
          actionId: entry.action.id,
          answerToken: entry.action.answerToken,
          progressLength: entry.offer.typedPrefix.length,
        };
      }
    }
    const fallback = weighted[weighted.length - 1]!;
    return {
      kind: "offer",
      instanceId: fallback.offer.instanceId,
      actionId: fallback.action.id,
      answerToken: fallback.action.answerToken,
      progressLength: fallback.offer.typedPrefix.length,
    };
  }

  private pickThreat(
    observation: DuelBotObservation,
  ): DuelIncomingThreat | null {
    const threats = observation.incomingThreats
      .filter((threat) => threat.status === "open")
      .sort(
        (left, right) =>
          left.remainingSeconds - right.remainingSeconds ||
          left.id.localeCompare(right.id),
      );
    return threats[0] ?? null;
  }

  private choosePriorityTarget(
    observation: DuelBotObservation,
  ): BotTarget | null {
    const threat = this.pickThreat(observation);
    if (threat !== null) {
      return {
        kind: "threat",
        instanceId: threat.id,
        actionId: threat.actionId,
        answerToken: threat.answerToken,
        progressLength: threat.typedPrefix.length,
      };
    }

    const objective = observation.neutralObjective;
    if (objective?.status === "active") {
      return {
        kind: "objective",
        instanceId: objective.id,
        actionId: "objective:" + objective.kind,
        answerToken: objective.answerToken,
        progressLength:
          objective.progress[this.playerId].length,
      };
    }
    return null;
  }

  private chooseStrategicIntent(
    observation: DuelBotObservation,
  ): DuelIntent | null {
    const comboId = observation.ownReadyCombos[0];
    if (comboId !== undefined) {
      return {
        type: "ACTIVATE_SKILL",
        playerId: this.playerId,
        sequence: this.nextSequence(),
        skillId: "combo:" + comboId,
      };
    }

    const usable = (
      bucket: keyof DuelCombatInventorySnapshot,
    ): string | null => {
      for (const entry of observation.ownInventory[bucket]) {
        const action = duelActionDefinitionForMap(
          observation.mapId,
          entry.actionId,
        );
        if (
          action !== undefined &&
          action.energyCost <= observation.selfEnergy &&
          (observation.ownCooldowns[action.id] ?? 0) <= 0
        ) {
          return action.id;
        }
      }
      return null;
    };

    const defense = usable("defense");
    if (
      defense !== null &&
      (observation.self.hullRatio < 0.55 ||
        observation.self.shieldRatio < 0.3)
    ) {
      return {
        type: "USE_ITEM",
        playerId: this.playerId,
        sequence: this.nextSequence(),
        itemId: defense,
      };
    }

    const tactical = usable("tactical");
    if (
      tactical !== null &&
      (this.personality === "tactician" ||
        this.personality === "trickster" ||
        observation.phase === "crisis" ||
        observation.phase === "cataclysm")
    ) {
      return {
        type: "USE_ITEM",
        playerId: this.playerId,
        sequence: this.nextSequence(),
        itemId: tactical,
      };
    }

    const attack = usable("attack");
    if (
      attack !== null &&
      (this.personality === "aggro" ||
        this.personality === "sniper" ||
        observation.opponent.hullRatio < 0.72 ||
        observation.phase === "war" ||
        observation.phase === "crisis" ||
        observation.phase === "cataclysm")
    ) {
      return {
        type: "USE_ITEM",
        playerId: this.playerId,
        sequence: this.nextSequence(),
        itemId: attack,
      };
    }

    if (
      observation.ownInitiative >= 8 &&
      observation.ownTrapCount < 2 &&
      (this.personality === "tactician" ||
        this.personality === "trickster" ||
        this.personality === "turtle")
    ) {
      const trapId =
        this.personality === "turtle"
          ? "mirror-trap"
          : this.personality === "trickster"
            ? "decoy"
            : "static-snare";
      return {
        type: "ACTIVATE_SKILL",
        playerId: this.playerId,
        sequence: this.nextSequence(),
        skillId: "trap:" + trapId,
      };
    }

    return null;
  }

  private targetStillAvailable(
    observation: DuelBotObservation,
  ): boolean {
    if (this.target === null) return true;
    if (this.target.kind === "threat") {
      return observation.incomingThreats.some(
        (threat) =>
          threat.id === this.target?.instanceId &&
          threat.status === "open",
      );
    }
    if (this.target.kind === "objective") {
      return (
        observation.neutralObjective?.id ===
          this.target.instanceId &&
        observation.neutralObjective.status === "active"
      );
    }
    const offer = observation.ownOffers.find(
      (candidate) => candidate.instanceId === this.target?.instanceId,
    );
    return (
      offer !== undefined &&
      (offer.status === "available" || offer.status === "locked")
    );
  }

  private characterInterval(): number {
    const base = 12 / this.wpm;
    const jitter = 0.92 + this.rng.nextFloat() * 0.16;
    return base * jitter;
  }

  private nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }

  private resetTarget(): void {
    this.target = null;
    this.charIndex = 0;
  }
}

export function duelBotObservation(input: {
  mapId?: DuelMapId;
  phase: DuelMatchPhase;
  self: {
    hull: number;
    maxHull: number;
    shield: number;
    maxShield: number;
    energy: number;
    maxEnergy: number;
    offers: readonly DuelActionOffer[];
    cooldowns?: Readonly<Record<string, number>>;
    inventory?: DuelCombatInventorySnapshot;
    incomingThreats?: readonly DuelIncomingThreat[];
    initiative?: number;
    readyCombos?: readonly { id: string }[];
    trapCount?: number;
  };
  neutralObjective?: DuelNeutralObjective | null;
  opponent: {
    hull: number;
    maxHull: number;
    shield: number;
    maxShield: number;
    energy: number;
    maxEnergy: number;
  };
}): DuelBotObservation {
  const ratio = (value: number, max: number): number =>
    max <= 0 ? 0 : clamp01(value / max);

  return {
    mapId: input.mapId ?? "frost-wastes",
    phase: input.phase,
    self: {
      hullRatio: ratio(input.self.hull, input.self.maxHull),
      shieldRatio: ratio(input.self.shield, input.self.maxShield),
      energyRatio: ratio(input.self.energy, input.self.maxEnergy),
    },
    opponent: {
      hullRatio: ratio(input.opponent.hull, input.opponent.maxHull),
      shieldRatio: ratio(input.opponent.shield, input.opponent.maxShield),
      energyRatio: ratio(input.opponent.energy, input.opponent.maxEnergy),
    },
    selfEnergy: Math.max(
      0,
      Number.isFinite(input.self.energy) ? input.self.energy : 0,
    ),
    ownOffers: input.self.offers.map((offer) => ({ ...offer })),
    ownCooldowns: { ...(input.self.cooldowns ?? {}) },
    ownInventory: input.self.inventory ?? {
      attack: [],
      defense: [],
      tactical: [],
    },
    incomingThreats:
      input.self.incomingThreats?.map((threat) => ({
        ...threat,
        counterTags: [...threat.counterTags],
      })) ?? [],
    neutralObjective:
      input.neutralObjective === undefined
        ? null
        : input.neutralObjective,
    ownInitiative: Math.max(
      0,
      Number.isFinite(input.self.initiative)
        ? input.self.initiative!
        : 0,
    ),
    ownReadyCombos:
      input.self.readyCombos?.map((combo) => combo.id) ?? [],
    ownTrapCount: Math.max(
      0,
      Math.floor(input.self.trapCount ?? 0),
    ),
  };
}
