import type {
  DuelActionCategory,
  DuelActionDefinition,
  DuelPlayerId,
} from "./model";

export type DuelComboId =
  | "homing-barrage"
  | "mirror-barrier"
  | "gravity-bomb"
  | "repair-drone"
  | "overcharged-railgun";

export type DuelStrategyPath =
  | "balanced"
  | "arsenal"
  | "fortress"
  | "tactician"
  | "chaos";

export type DuelTrapId =
  | "minefield"
  | "mirror-trap"
  | "static-snare"
  | "decoy"
  | "counter-battery";

export type DuelConversionId =
  | "sacrifice"
  | "overload"
  | "reactor-dump"
  | "berserk";

export type DuelInitiativeReason =
  | "perfect-word"
  | "counter"
  | "neutral-objective"
  | "map-control"
  | "long-combo";

export type DuelReadyCombo = {
  id: DuelComboId;
  createdAtTick: number;
};

export type DuelTrap = {
  id: string;
  trapId: DuelTrapId;
  ownerId: DuelPlayerId;
  publicHint: string;
  armedAtTick: number;
};

export const DUEL_TRAP_INITIATIVE_COST = 8;

export type DuelTrapEffect = {
  damageToTrigger: number;
  energyCostToTrigger: number;
  shieldToOwner: number;
  tacticalEffect:
    | {
        effectId: "offer-drift" | "projectile-drag";
        strength: number;
        durationSeconds: number;
      }
    | null;
};

export type DuelStrategyPlayerSnapshot = {
  initiative: number;
  path: DuelStrategyPath;
  readyCombos: readonly DuelReadyCombo[];
  actionHistory: readonly string[];
  attackScale: number;
  defenseScale: number;
  traps: readonly DuelTrap[];
};

export type DuelStrategySnapshot = Readonly<
  Record<DuelPlayerId, DuelStrategyPlayerSnapshot>
>;

export type DuelConversionResolution = {
  id: DuelConversionId;
  hullCost: number;
  shieldCost: number;
  energyCost: number;
  energyGain: number;
  shieldGain: number;
  attackScaleBonus: number;
  defenseScalePenalty: number;
  durationSeconds: number;
};

type ComboRecipe = {
  id: DuelComboId;
  ingredients: readonly string[];
};

type MutablePlayer = {
  initiative: number;
  history: string[];
  readyCombos: DuelReadyCombo[];
  pathScore: Record<Exclude<DuelStrategyPath, "balanced">, number>;
  traps: DuelTrap[];
  attackScaleBonus: number;
  defenseScalePenalty: number;
  modifierSeconds: number;
};

export function duelStrategyCategoryMultiplier(
  path: DuelStrategyPath,
): Partial<Readonly<Record<DuelActionCategory, number>>> {
  switch (path) {
    case "arsenal":
      return { attack: 1.2, support: 1.05 };
    case "fortress":
      return { defense: 1.2, support: 1.08 };
    case "tactician":
      return { tactical: 1.25, support: 1.04 };
    case "chaos":
      return { fate: 1.22, mystery: 1.28 };
    case "balanced":
      return {};
  }
}

export const DUEL_COMBO_RECIPES: readonly ComboRecipe[] = [
  {
    id: "homing-barrage",
    ingredients: ["energy", "missile", "lock-on"],
  },
  {
    id: "mirror-barrier",
    ingredients: ["shield", "reflect"],
  },
  {
    id: "gravity-bomb",
    ingredients: ["gravity", "bomb"],
  },
  {
    id: "repair-drone",
    ingredients: ["drone", "repair"],
  },
  {
    id: "overcharged-railgun",
    ingredients: ["amplify", "railgun"],
  },
];

const INITIATIVE_GAIN: Readonly<
  Record<DuelInitiativeReason, number>
> = {
  "perfect-word": 4,
  counter: 8,
  "neutral-objective": 10,
  "map-control": 12,
  "long-combo": 10,
};

const PLAYER_IDS: readonly DuelPlayerId[] = [
  "player-1",
  "player-2",
];

function createPlayer(): MutablePlayer {
  return {
    initiative: 0,
    history: [],
    readyCombos: [],
    pathScore: {
      arsenal: 0,
      fortress: 0,
      tactician: 0,
      chaos: 0,
    },
    traps: [],
    attackScaleBonus: 0,
    defenseScalePenalty: 0,
    modifierSeconds: 0,
  };
}

function pathForCategory(
  category: DuelActionCategory,
): Exclude<DuelStrategyPath, "balanced"> {
  switch (category) {
    case "attack":
      return "arsenal";
    case "defense":
    case "support":
      return "fortress";
    case "tactical":
      return "tactician";
    case "fate":
    case "mystery":
      return "chaos";
  }
}

function suffixMatches(
  history: readonly string[],
  ingredients: readonly string[],
): boolean {
  if (ingredients.length > history.length) return false;
  const offset = history.length - ingredients.length;
  return ingredients.every(
    (ingredient, index) => history[offset + index] === ingredient,
  );
}

export class DuelStrategySystem {
  private readonly players: Record<DuelPlayerId, MutablePlayer> = {
    "player-1": createPlayer(),
    "player-2": createPlayer(),
  };
  private trapSequence = 0;

  recordAction(
    playerId: DuelPlayerId,
    action: DuelActionDefinition,
    tick: number,
  ): DuelReadyCombo | null {
    const player = this.players[playerId];
    player.history.push(action.id);
    if (player.history.length > 10) player.history.shift();

    const path = pathForCategory(action.category);
    player.pathScore[path] = Math.min(
      12,
      player.pathScore[path] + 1,
    );

    for (const recipe of DUEL_COMBO_RECIPES) {
      if (!suffixMatches(player.history, recipe.ingredients)) continue;
      if (
        player.readyCombos.some((combo) => combo.id === recipe.id)
      ) {
        return null;
      }
      const combo: DuelReadyCombo = {
        id: recipe.id,
        createdAtTick: Math.max(0, Math.floor(tick)),
      };
      player.readyCombos.push(combo);
      this.gainInitiative(playerId, "long-combo");
      return { ...combo };
    }
    return null;
  }

  consumeCombo(
    playerId: DuelPlayerId,
    comboId: DuelComboId,
  ): DuelReadyCombo | null {
    const combos = this.players[playerId].readyCombos;
    const index = combos.findIndex((combo) => combo.id === comboId);
    if (index < 0) return null;
    return combos.splice(index, 1)[0] ?? null;
  }

  armTrap(
    playerId: DuelPlayerId,
    trapId: DuelTrapId,
    tick: number,
  ): DuelTrap | null {
    const player = this.players[playerId];
    if (player.traps.length >= 2) return null;
    const trap: DuelTrap = {
      id: "trap:" + String(++this.trapSequence),
      trapId,
      ownerId: playerId,
      publicHint: "TRAP ARMED",
      armedAtTick: Math.max(0, Math.floor(tick)),
    };
    player.traps.push(trap);
    return { ...trap };
  }

  consumeTrap(
    playerId: DuelPlayerId,
    trapId: string,
  ): DuelTrap | null {
    const traps = this.players[playerId].traps;
    const index = traps.findIndex((trap) => trap.id === trapId);
    if (index < 0) return null;
    return traps.splice(index, 1)[0] ?? null;
  }

  consumeOldestTrap(
    playerId: DuelPlayerId,
  ): DuelTrap | null {
    return this.players[playerId].traps.shift() ?? null;
  }

  projectileTempoScale(playerId: DuelPlayerId): number {
    const initiative = this.players[playerId].initiative;
    return 1 + (Math.max(0, Math.min(100, initiative)) / 100) * 0.06;
  }

  publicTrapHintsFor(
    observerId: DuelPlayerId,
  ): readonly string[] {
    const opponent =
      observerId === "player-1" ? "player-2" : "player-1";
    return this.players[opponent].traps.map(
      (trap) => trap.publicHint,
    );
  }

  gainInitiative(
    playerId: DuelPlayerId,
    reason: DuelInitiativeReason,
  ): number {
    const player = this.players[playerId];
    player.initiative = Math.min(
      100,
      player.initiative + INITIATIVE_GAIN[reason],
    );
    return player.initiative;
  }

  spendInitiative(
    playerId: DuelPlayerId,
    amount: number,
  ): boolean {
    const safe = Math.max(0, Math.floor(amount));
    const player = this.players[playerId];
    if (player.initiative < safe) return false;
    player.initiative -= safe;
    return true;
  }

  applyConversion(
    playerId: DuelPlayerId,
    conversionId: DuelConversionId,
  ): DuelConversionResolution {
    const player = this.players[playerId];
    const resolution = duelConversionDefinition(conversionId);
    if (resolution.durationSeconds > 0) {
      player.attackScaleBonus = Math.max(
        player.attackScaleBonus,
        resolution.attackScaleBonus,
      );
      player.defenseScalePenalty = Math.max(
        player.defenseScalePenalty,
        resolution.defenseScalePenalty,
      );
      player.modifierSeconds = Math.max(
        player.modifierSeconds,
        resolution.durationSeconds,
      );
    }
    return resolution;
  }

  update(dtSeconds: number): void {
    const dt = Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );
    for (const playerId of PLAYER_IDS) {
      const player = this.players[playerId];
      if (player.modifierSeconds <= 0) continue;
      player.modifierSeconds = Math.max(
        0,
        player.modifierSeconds - dt,
      );
      if (player.modifierSeconds === 0) {
        player.attackScaleBonus = 0;
        player.defenseScalePenalty = 0;
      }
    }
  }

  attackScale(playerId: DuelPlayerId): number {
    return 1 + this.players[playerId].attackScaleBonus;
  }

  defenseScale(playerId: DuelPlayerId): number {
    return Math.max(
      0.75,
      1 - this.players[playerId].defenseScalePenalty,
    );
  }

  strategyPath(playerId: DuelPlayerId): DuelStrategyPath {
    const scores = this.players[playerId].pathScore;
    const ranked = (
      Object.entries(scores) as Array<
        [Exclude<DuelStrategyPath, "balanced">, number]
      >
    ).sort(
      (left, right) =>
        right[1] - left[1] || left[0].localeCompare(right[0]),
    );
    if ((ranked[0]?.[1] ?? 0) < 3) return "balanced";
    if (
      ranked[1] !== undefined &&
      ranked[0]![1] === ranked[1][1]
    ) {
      return "balanced";
    }
    return ranked[0]![0];
  }

  snapshot(): DuelStrategySnapshot {
    const snapshotFor = (
      playerId: DuelPlayerId,
    ): DuelStrategyPlayerSnapshot => {
      const player = this.players[playerId];
      return {
        initiative: player.initiative,
        path: this.strategyPath(playerId),
        readyCombos: player.readyCombos.map((combo) => ({ ...combo })),
        actionHistory: [...player.history],
        attackScale: this.attackScale(playerId),
        defenseScale: this.defenseScale(playerId),
        traps: player.traps.map((trap) => ({ ...trap })),
      };
    };
    return {
      "player-1": snapshotFor("player-1"),
      "player-2": snapshotFor("player-2"),
    };
  }

  resetRound(): void {
    for (const playerId of PLAYER_IDS) {
      this.players[playerId] = createPlayer();
    }
    this.trapSequence = 0;
  }
}

export function duelTrapEffect(
  trapId: DuelTrapId,
): DuelTrapEffect {
  switch (trapId) {
    case "minefield":
      return {
        damageToTrigger: 6,
        energyCostToTrigger: 0,
        shieldToOwner: 0,
        tacticalEffect: null,
      };
    case "mirror-trap":
      return {
        damageToTrigger: 4,
        energyCostToTrigger: 0,
        shieldToOwner: 6,
        tacticalEffect: null,
      };
    case "static-snare":
      return {
        damageToTrigger: 0,
        energyCostToTrigger: 0,
        shieldToOwner: 0,
        tacticalEffect: {
          effectId: "projectile-drag",
          strength: 0.25,
          durationSeconds: 3.5,
        },
      };
    case "decoy":
      return {
        damageToTrigger: 0,
        energyCostToTrigger: 0,
        shieldToOwner: 0,
        tacticalEffect: {
          effectId: "offer-drift",
          strength: 0.3,
          durationSeconds: 3.5,
        },
      };
    case "counter-battery":
      return {
        damageToTrigger: 0,
        energyCostToTrigger: 8,
        shieldToOwner: 0,
        tacticalEffect: null,
      };
  }
}

export function duelConversionDefinition(
  conversionId: DuelConversionId,
): DuelConversionResolution {
  switch (conversionId) {
    case "sacrifice":
      return {
        id: conversionId,
        hullCost: 12,
        shieldCost: 0,
        energyCost: 0,
        energyGain: 22,
        shieldGain: 0,
        attackScaleBonus: 0,
        defenseScalePenalty: 0,
        durationSeconds: 0,
      };
    case "reactor-dump":
      return {
        id: conversionId,
        hullCost: 0,
        shieldCost: 0,
        energyCost: 20,
        energyGain: 0,
        shieldGain: 18,
        attackScaleBonus: 0,
        defenseScalePenalty: 0,
        durationSeconds: 0,
      };
    case "overload":
      return {
        id: conversionId,
        hullCost: 0,
        shieldCost: 12,
        energyCost: 0,
        energyGain: 0,
        shieldGain: 0,
        attackScaleBonus: 0.15,
        defenseScalePenalty: 0,
        durationSeconds: 8,
      };
    case "berserk":
      return {
        id: conversionId,
        hullCost: 8,
        shieldCost: 0,
        energyCost: 0,
        energyGain: 0,
        shieldGain: 0,
        attackScaleBonus: 0.2,
        defenseScalePenalty: 0.12,
        durationSeconds: 8,
      };
  }
}

export function duelComboEffect(comboId: DuelComboId): {
  damage: number;
  shield: number;
  repair: number;
  tacticalPressure: number;
} {
  switch (comboId) {
    case "homing-barrage":
      return { damage: 26, shield: 0, repair: 0, tacticalPressure: 0.12 };
    case "mirror-barrier":
      return { damage: 0, shield: 28, repair: 0, tacticalPressure: 0 };
    case "gravity-bomb":
      return { damage: 20, shield: 0, repair: 0, tacticalPressure: 0.3 };
    case "repair-drone":
      return { damage: 0, shield: 8, repair: 18, tacticalPressure: 0 };
    case "overcharged-railgun":
      return { damage: 32, shield: 0, repair: 0, tacticalPressure: 0.08 };
  }
}
