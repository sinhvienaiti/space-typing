import { DUEL_ACTIONS_BY_ID } from "./actions";
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
  phase: DuelMatchPhase;
  self: DuelBotPublicPlayer;
  opponent: DuelBotPublicPlayer;
  ownOffers: readonly DuelActionOffer[];
  ownCooldowns: Readonly<Record<string, number>>;
};

export type DuelBotMetrics = {
  emittedChars: number;
  correctChars: number;
  wrongChars: number;
};

type BotTarget = {
  instanceId: string;
  actionId: string;
  answerToken: string;
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
        const selected = this.chooseTarget(observation);
        if (selected === null) {
          this.timer = Math.max(0.12, this.reactionSeconds);
          break;
        }
        this.target = selected;
        this.charIndex = 0;
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

  private chooseTarget(
    observation: DuelBotObservation,
  ): BotTarget | null {
    const candidates = observation.ownOffers
      .filter(
        (offer) =>
          offer.status === "available" &&
          (observation.ownCooldowns[offer.actionId] ?? 0) <= 0,
      )
      .map((offer) => {
        const action = DUEL_ACTIONS_BY_ID.get(offer.actionId);
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
          instanceId: entry.offer.instanceId,
          actionId: entry.action.id,
          answerToken: entry.action.answerToken,
        };
      }
    }
    const fallback = weighted[weighted.length - 1]!;
    return {
      instanceId: fallback.offer.instanceId,
      actionId: fallback.action.id,
      answerToken: fallback.action.answerToken,
    };
  }

  private targetStillAvailable(
    observation: DuelBotObservation,
  ): boolean {
    if (this.target === null) return true;
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
  };
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
    ownOffers: input.self.offers.map((offer) => ({ ...offer })),
    ownCooldowns: { ...(input.self.cooldowns ?? {}) },
  };
}
