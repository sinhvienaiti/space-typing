import type {
  DuelMatchPhase,
  DuelPlayerId,
} from "./model";
import { DuelRngStreams } from "./rng";

export type DuelFateTier = "common" | "strong" | "jackpot";

export type DuelFateOutcomeId =
  | "shield-blessing"
  | "energy-surge"
  | "prism-barrage"
  | "critical-core"
  | "cooldown-spark"
  | "mirror-crystal"
  | "fortune-jackpot";

export type DuelFateOutcome = {
  id: DuelFateOutcomeId;
  tier: DuelFateTier;
  selfShield: number;
  selfEnergy: number;
  opponentDamage: number;
};

export type DuelFateResolution = {
  playerId: DuelPlayerId;
  outcome: DuelFateOutcome;
  pityBefore: number;
  pityAfter: number;
};

export type DuelMysteryRarity =
  | "minor"
  | "chaotic"
  | "cataclysm";

export type DuelMysteryRiskTag =
  | "defensive"
  | "support"
  | "tactical"
  | "danger"
  | "high-impact";

export type DuelMysteryCategory =
  | "beneficial"
  | "harmful"
  | "shared-chaos"
  | "cataclysm";

export type DuelMysteryOutcomeId =
  | "energy-cache"
  | "emergency-shield"
  | "repair-burst"
  | "shield-overload"
  | "energy-drain"
  | "offer-reshuffle"
  | "gravity-shift"
  | "hazard-surge"
  | "world-fracture";

export type DuelMysteryOutcome = {
  id: DuelMysteryOutcomeId;
  category: DuelMysteryCategory;
  rarity: DuelMysteryRarity;
  riskTag: DuelMysteryRiskTag;
  magnitude: number;
};

export type DuelMysteryPublic = {
  id: string;
  rarity: DuelMysteryRarity;
  riskTag: DuelMysteryRiskTag;
  resolved: boolean;
};

export type DuelMysteryRevealLevel =
  | "risk"
  | "category"
  | "exact";

export type DuelMysteryReveal = {
  id: string;
  rarity: DuelMysteryRarity;
  riskTag: DuelMysteryRiskTag;
  category?: DuelMysteryCategory;
  outcomeId?: DuelMysteryOutcomeId;
};

type MysteryState = {
  id: string;
  outcome: DuelMysteryOutcome;
  resolved: boolean;
};

const FATE_OUTCOMES: readonly DuelFateOutcome[] = [
  {
    id: "shield-blessing",
    tier: "common",
    selfShield: 14,
    selfEnergy: 0,
    opponentDamage: 0,
  },
  {
    id: "energy-surge",
    tier: "common",
    selfShield: 0,
    selfEnergy: 18,
    opponentDamage: 0,
  },
  {
    id: "cooldown-spark",
    tier: "common",
    selfShield: 6,
    selfEnergy: 10,
    opponentDamage: 0,
  },
  {
    id: "prism-barrage",
    tier: "strong",
    selfShield: 0,
    selfEnergy: 0,
    opponentDamage: 12,
  },
  {
    id: "critical-core",
    tier: "strong",
    selfShield: 0,
    selfEnergy: 8,
    opponentDamage: 14,
  },
  {
    id: "mirror-crystal",
    tier: "strong",
    selfShield: 20,
    selfEnergy: 6,
    opponentDamage: 0,
  },
  {
    id: "fortune-jackpot",
    tier: "jackpot",
    selfShield: 22,
    selfEnergy: 22,
    opponentDamage: 8,
  },
];

const MYSTERY_OUTCOMES: readonly DuelMysteryOutcome[] = [
  {
    id: "energy-cache",
    category: "beneficial",
    rarity: "minor",
    riskTag: "support",
    magnitude: 18,
  },
  {
    id: "emergency-shield",
    category: "beneficial",
    rarity: "minor",
    riskTag: "defensive",
    magnitude: 16,
  },
  {
    id: "repair-burst",
    category: "beneficial",
    rarity: "chaotic",
    riskTag: "defensive",
    magnitude: 14,
  },
  {
    id: "shield-overload",
    category: "harmful",
    rarity: "minor",
    riskTag: "danger",
    magnitude: 10,
  },
  {
    id: "energy-drain",
    category: "harmful",
    rarity: "chaotic",
    riskTag: "danger",
    magnitude: 16,
  },
  {
    id: "offer-reshuffle",
    category: "shared-chaos",
    rarity: "minor",
    riskTag: "tactical",
    magnitude: 1,
  },
  {
    id: "gravity-shift",
    category: "shared-chaos",
    rarity: "chaotic",
    riskTag: "tactical",
    magnitude: 0.35,
  },
  {
    id: "hazard-surge",
    category: "shared-chaos",
    rarity: "chaotic",
    riskTag: "danger",
    magnitude: 0.4,
  },
  {
    id: "world-fracture",
    category: "cataclysm",
    rarity: "cataclysm",
    riskTag: "high-impact",
    magnitude: 0.55,
  },
];

const PLAYER_IDS: readonly DuelPlayerId[] = [
  "player-1",
  "player-2",
];

function phaseMysteryPool(
  phase: DuelMatchPhase,
): readonly DuelMysteryOutcome[] {
  if (phase === "cataclysm") return MYSTERY_OUTCOMES;
  if (phase === "crisis") {
    return MYSTERY_OUTCOMES.filter(
      (outcome) => outcome.rarity !== "cataclysm",
    );
  }
  return MYSTERY_OUTCOMES.filter(
    (outcome) => outcome.rarity === "minor",
  );
}

function fateTierWeight(
  tier: DuelFateTier,
  pity: number,
): number {
  const capped = Math.max(0, Math.min(6, pity));
  switch (tier) {
    case "common":
      return Math.max(24, 72 - capped * 7);
    case "strong":
      return 24 + capped * 5;
    case "jackpot":
      return 4 + capped * 2;
  }
}

export class DuelChanceSystem {
  private readonly streams: DuelRngStreams;
  private readonly pity: Record<DuelPlayerId, number> = {
    "player-1": 0,
    "player-2": 0,
  };
  private readonly mysteries: MysteryState[] = [];
  private mysterySequence = 0;

  constructor(matchSeed: number, contentVersion: string) {
    this.streams = new DuelRngStreams(matchSeed, contentVersion);
  }

  rollFate(playerId: DuelPlayerId): DuelFateResolution {
    const pityBefore = this.pity[playerId];
    const rng = this.streams.domain("fate");
    let total = 0;
    const weighted = FATE_OUTCOMES.map((outcome) => {
      const weight = fateTierWeight(outcome.tier, pityBefore);
      total += weight;
      return { outcome, weight };
    });
    let roll = rng.nextFloat() * total;
    let selected = weighted[weighted.length - 1]!.outcome;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        selected = entry.outcome;
        break;
      }
    }

    if (selected.tier === "common") {
      this.pity[playerId] = Math.min(6, pityBefore + 1);
    } else {
      this.pity[playerId] = 0;
    }

    return {
      playerId,
      outcome: { ...selected },
      pityBefore,
      pityAfter: this.pity[playerId],
    };
  }

  createMystery(phase: DuelMatchPhase): DuelMysteryPublic {
    const pool = phaseMysteryPool(phase);
    const rng = this.streams.domain("mystery");
    const outcome = pool[rng.nextInt(pool.length)]!;
    const state: MysteryState = {
      id: "mystery:" + String(++this.mysterySequence),
      outcome,
      resolved: false,
    };
    this.mysteries.push(state);
    return this.toPublic(state);
  }

  revealMystery(
    id: string,
    level: DuelMysteryRevealLevel,
  ): DuelMysteryReveal | null {
    const state = this.mysteries.find(
      (candidate) => candidate.id === id,
    );
    if (state === undefined) return null;

    const reveal: DuelMysteryReveal = {
      id: state.id,
      rarity: state.outcome.rarity,
      riskTag: state.outcome.riskTag,
    };
    if (level === "category" || level === "exact") {
      reveal.category = state.outcome.category;
    }
    if (level === "exact") {
      reveal.outcomeId = state.outcome.id;
    }
    return reveal;
  }

  resolveMystery(id: string): DuelMysteryOutcome | null {
    const state = this.mysteries.find(
      (candidate) => candidate.id === id,
    );
    if (state === undefined || state.resolved) return null;
    state.resolved = true;
    return { ...state.outcome };
  }

  publicMysteries(): readonly DuelMysteryPublic[] {
    return this.mysteries.map((state) => this.toPublic(state));
  }

  pitySnapshot(): Readonly<Record<DuelPlayerId, number>> {
    return {
      "player-1": this.pity["player-1"],
      "player-2": this.pity["player-2"],
    };
  }

  resetRound(): void {
    for (const playerId of PLAYER_IDS) this.pity[playerId] = 0;
    this.mysteries.length = 0;
    this.mysterySequence = 0;
  }

  private toPublic(state: MysteryState): DuelMysteryPublic {
    return {
      id: state.id,
      rarity: state.outcome.rarity,
      riskTag: state.outcome.riskTag,
      resolved: state.resolved,
    };
  }
}
