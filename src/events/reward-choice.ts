import { clamp, typingText } from "../logic";
import {
  rollEquipmentDefinition,
  rollEquipmentGrade,
  type EquipmentDrop,
} from "../loot/equipment-loot";
import type { ExpansionCurrencyReward } from "../economy/currencies";
import {
  selectRelicReward,
  type RelicState,
} from "../relics/state";
import type { RelicId } from "../relics/registry";
import type { VocabularyEntry } from "../types";

export type RewardChoiceCrate = {
  entry: VocabularyEntry;
  typed: number;
  x: number;
  y: number;
  speed: number;
  age: number;
  lifetime: number;
};

export function rewardChoiceCrateChance(stage: number): number {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  if (safeStage < 30) return 0;
  return Math.min(0.1, 0.045 + (safeStage - 30) * 0.000057);
}

export function shouldScheduleRewardChoiceCrate(
  stage: number,
  random = Math.random(),
): boolean {
  return random < rewardChoiceCrateChance(stage);
}

type RewardChoiceSource = "treasure" | "boss";

function createEquipmentRewardChoiceOptions(
  luck: number,
  source: RewardChoiceSource,
  random: () => number,
): EquipmentDrop[] {
  const choices: EquipmentDrop[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (choices.length < 3 && attempts < 30) {
    attempts += 1;
    const definitionId = rollEquipmentDefinition(source, random());
    if (seen.has(definitionId)) continue;

    seen.add(definitionId);
    choices.push({
      source,
      definitionId,
      grade: rollEquipmentGrade(source, luck, random()),
    });
  }

  return choices;
}

export function createRewardChoiceOptions(
  luck: number,
  random = Math.random,
): EquipmentDrop[] {
  return createEquipmentRewardChoiceOptions(luck, "treasure", random);
}

export function createBossRewardChoiceOptions(
  luck: number,
  random = Math.random,
): EquipmentDrop[] {
  return createEquipmentRewardChoiceOptions(luck, "boss", random);
}

export function rewardChoiceWord(
  vocabulary: readonly VocabularyEntry[],
  random = Math.random(),
): VocabularyEntry | null {
  const candidates = vocabulary.filter((entry) => {
    const length = typingText(entry.en).length;
    return length >= 5 && length <= 10;
  });
  const source = candidates.length > 0 ? candidates : vocabulary;
  if (source.length === 0) return null;

  const index = Math.min(
    source.length - 1,
    Math.floor(clamp(random, 0, 0.999999) * source.length),
  );
  return source[index] ?? null;
}


export type BossRewardChoiceOption =
  | {
      id: "equipment";
      kind: "equipment";
      drop: EquipmentDrop;
    }
  | {
      id: "currency";
      kind: "currency";
      credits: number;
      currencies: ExpansionCurrencyReward;
    }
  | {
      id: "relic";
      kind: "relic";
      relicId: RelicId;
    }
  | {
      id: "premium-currency";
      kind: "currency";
      credits: number;
      currencies: ExpansionCurrencyReward;
    };

function rewardChoiceSeededRandom(stage: number): () => number {
  let state =
    (Math.imul(Math.max(1, Math.min(1000, Math.floor(stage))), 0x9e3779b1) ^
      0xa5a5a5a5) >>>
    0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createBossRewardChoiceOptions(
  stageInput: number,
  luck: number,
  relics: RelicState,
): BossRewardChoiceOption[] {
  const stage = Math.max(1, Math.min(1000, Math.floor(stageInput)));
  const random = rewardChoiceSeededRandom(stage);
  const equipment: BossRewardChoiceOption = {
    id: "equipment",
    kind: "equipment",
    drop: {
      source: "boss",
      definitionId: rollEquipmentDefinition("boss", random()),
      grade: rollEquipmentGrade("boss", luck, random()),
    },
  };

  const galaxy = Math.max(1, Math.ceil(stage / 100));
  const currency: BossRewardChoiceOption = {
    id: "currency",
    kind: "currency",
    credits: 110 + stage * 2,
    currencies: {
      alloy: 5 + galaxy,
      starCrystal: 1 + Math.floor(galaxy / 3),
      quantumCore: stage % 100 === 0 ? 1 : 0,
    },
  };

  const relicId = selectRelicReward(
    relics,
    stage,
    "boss-choice:" + String(stage),
  );
  const third: BossRewardChoiceOption =
    relicId === null
      ? {
          id: "premium-currency",
          kind: "currency",
          credits: 180 + stage * 3,
          currencies: {
            alloy: 7 + galaxy,
            starCrystal: 2 + Math.floor(galaxy / 2),
            quantumCore: stage >= 500 ? 1 : 0,
          },
        }
      : {
          id: "relic",
          kind: "relic",
          relicId,
        };

  return [equipment, currency, third];
}
