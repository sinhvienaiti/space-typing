import { difficultyFor } from "../campaign/difficulty";
import { PRIMARY_DIFFICULTY_MODES } from "../campaign/difficulty-modes";
import { createStageConfig } from "../campaign/stage";
import { stageClearCreditReward } from "../economy/credits";
import { scaleExpansionCurrencyReward, stageClearExpansionCurrencyReward } from "../economy/currencies";
import { HEAVY_SORTIES_PER_DAY, type WalletBalances } from "../economy/wallet-rules";
import { createStageObjectiveState, objectiveForStage, objectiveRewardFactor } from "../events/objectives";
import { createBossRewardChoiceOptions } from "../events/reward-choice";
import { applyAscensionDifficulty, ascensionCompletionReward } from "../progression/ascension";
import { RELIC_IDS } from "../relics/registry";
import { performanceReward, sectorCheckpointReward } from "../rewards/campaign-rewards";

/**
 * Where the server wallet's earning limits come from (src/economy/wallet-rules.ts).
 * Uses the game's own reward rules; tests/wallet-rules.test.ts checks that
 * the tables in wallet-rules.ts still match these numbers.
 *
 * - expectedSortie: a strong, typical sortie at `stage` (Balanced, 97 %
 *   accuracy, half salvage, 3 performance badges, objective done, the
 *   currency choice on boss stages, a first clear every other sortie).
 * - maxSortie: the formula ceiling for one sortie at `stage` over every
 *   difficulty mode and Ascension tier (100 % accuracy and salvage, all 5
 *   badges, the premium boss cache, a sector checkpoint, the Style Shop
 *   Credit booster at +100 %, Ascension completion at stage 1000).
 */
export const CAP_AUDIT_STAGES = [1, 10, 25, 50, 100, 200, 300, 500, 750, 1000] as const;

function role(stage: number) {
  return createStageConfig(stage).role;
}

function isBoss(stage: number): boolean {
  return ["mini-boss", "boss", "major-boss"].includes(role(stage));
}

export function expectedSortie(stage: number): WalletBalances {
  const difficulty = difficultyFor({ mode: "balanced", vocabularyLevel: 1, recentWpm: 60, recentAccuracy: 97, stage });
  const definition = objectiveForStage(createStageConfig(stage), difficulty);
  const objective = definition ? createStageObjectiveState(definition) : null;
  if (objective) objective.status = "complete";
  const multiplier = difficulty.rewardMultiplier * (1 + objectiveRewardFactor(objective, difficulty));
  const clearCredits = stageClearCreditReward({ stage, accuracy: 97, salvage: 50 }) * multiplier;
  const clearCurrencies = scaleExpansionCurrencyReward(stageClearExpansionCurrencyReward(stage, role(stage), 97), multiplier);
  const performance = performanceReward({
    stats: { stage, misses: 2, maxStreak: 25 },
    accuracy: 97,
    wpm: difficulty.targetWpm * 1.05,
    difficulty,
    objectiveComplete: definition !== null,
    typingEvidence: true,
  });
  const cache = isBoss(stage)
    ? createBossRewardChoiceOptions(stage, 0, { version: 1, owned: [...RELIC_IDS], equipped: [] }, 1).find((option) => option.id === "currency")
    : undefined;
  const cacheCredits = cache?.kind === "currency" ? cache.credits : 0;
  const cacheCurrencies = cache?.kind === "currency" ? cache.currencies : { alloy: 0, starCrystal: 0, quantumCore: 0 };
  // A first clear every other sortie; a sector checkpoint every 10th stage.
  const sector = sectorCheckpointReward(stage);
  const sectorShare = 0.5 / 10;
  return {
    credits: Math.round(clearCredits + performance.credits * difficulty.rewardMultiplier + cacheCredits + sector.credits * sectorShare),
    alloy: clearCurrencies.alloy + performance.currencies.alloy + cacheCurrencies.alloy + sector.currencies.alloy * sectorShare,
    starCrystal: clearCurrencies.starCrystal + performance.currencies.starCrystal + cacheCurrencies.starCrystal + sector.currencies.starCrystal * sectorShare,
    quantumCore: clearCurrencies.quantumCore + cacheCurrencies.quantumCore + sector.currencies.quantumCore * sectorShare,
  };
}

export function maxSortie(stage: number): WalletBalances {
  const best: WalletBalances = { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 };
  for (const mode of PRIMARY_DIFFICULTY_MODES) {
    for (const tier of [0, 1, 5, 10]) {
      const difficulty = applyAscensionDifficulty(difficultyFor({ mode, vocabularyLevel: 1, recentWpm: 300, recentAccuracy: 100, stage }), tier, stage);
      const definition = objectiveForStage(createStageConfig(stage), difficulty);
      const objective = definition ? createStageObjectiveState(definition) : null;
      if (objective) objective.status = "complete";
      const multiplier = difficulty.rewardMultiplier * (1 + objectiveRewardFactor(objective, difficulty));
      const ascension = difficulty.ascensionRewardMultiplier ?? 1;
      const clearCredits = stageClearCreditReward({ stage, accuracy: 100, salvage: 100 }) * multiplier;
      const clearCurrencies = scaleExpansionCurrencyReward(stageClearExpansionCurrencyReward(stage, role(stage), 100), multiplier);
      const performance = performanceReward({
        stats: { stage, misses: 0, maxStreak: 99 },
        accuracy: 100,
        wpm: difficulty.targetWpm * 2,
        difficulty,
        objectiveComplete: true,
        typingEvidence: true,
      });
      const premium = isBoss(stage)
        ? createBossRewardChoiceOptions(stage, 0, { version: 1, owned: [...RELIC_IDS], equipped: [] }, ascension)
            .filter((option) => option.kind === "currency")
            .reduce((top, option) => (option.kind === "currency" && option.credits > top.credits ? option : top), { credits: 0, currencies: { alloy: 0, starCrystal: 0, quantumCore: 0 } })
        : { credits: 0, currencies: { alloy: 0, starCrystal: 0, quantumCore: 0 } };
      const sector = stage % 10 === 0 ? sectorCheckpointReward(stage) : { credits: 0, currencies: { alloy: 0, starCrystal: 0, quantumCore: 0 } };
      const completion = stage === 1000 ? ascensionCompletionReward(tier) : { credits: 0, currencies: { alloy: 0, starCrystal: 0, quantumCore: 0 } };
      const credits =
        clearCredits * 2 + // Credit booster +100 %
        performance.credits * difficulty.rewardMultiplier +
        premium.credits +
        sector.credits * ascension +
        completion.credits;
      const sum = (key: "alloy" | "starCrystal" | "quantumCore") =>
        clearCurrencies[key] +
        scaleExpansionCurrencyReward(performance.currencies, difficulty.rewardMultiplier)[key] +
        premium.currencies[key] +
        scaleExpansionCurrencyReward(sector.currencies, ascension)[key] +
        completion.currencies[key];
      best.credits = Math.max(best.credits, Math.ceil(credits));
      best.alloy = Math.max(best.alloy, sum("alloy"));
      best.starCrystal = Math.max(best.starCrystal, sum("starCrystal"));
      best.quantumCore = Math.max(best.quantumCore, sum("quantumCore"));
    }
  }
  return best;
}

/** A player at `stage` replays the last 10 stages (boss and normal stages mixed). */
export const CAP_WINDOW = 10;

function window(stage: number): number[] {
  const from = Math.max(1, stage - CAP_WINDOW + 1);
  return Array.from({ length: stage - from + 1 }, (_, index) => from + index);
}

/** Average expected sortie over the stages a player at `stage` replays. */
export function expectedSortieAround(stage: number): WalletBalances {
  const stages = window(stage);
  const total: WalletBalances = { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 };
  for (const item of stages) {
    const sortie = expectedSortie(item);
    for (const key of Object.keys(total) as (keyof WalletBalances)[]) total[key] += sortie[key] / stages.length;
  }
  return total;
}

/** The most one sortie can pay on any of those stages. */
export function maxSortieAround(stage: number): WalletBalances {
  const best: WalletBalances = { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 };
  for (const item of window(stage)) {
    const sortie = maxSortie(item);
    for (const key of Object.keys(best) as (keyof WalletBalances)[]) best[key] = Math.max(best[key], sortie[key]);
  }
  return best;
}

/** Expected income of a heavy player (60 active minutes, HEAVY_SORTIES_PER_DAY sorties) at `stage`, per day. */
export function heavyDailyIncome(stage: number): WalletBalances {
  const sortie = expectedSortieAround(stage);
  return {
    credits: sortie.credits * HEAVY_SORTIES_PER_DAY,
    alloy: sortie.alloy * HEAVY_SORTIES_PER_DAY,
    starCrystal: sortie.starCrystal * HEAVY_SORTIES_PER_DAY,
    quantumCore: sortie.quantumCore * HEAVY_SORTIES_PER_DAY,
  };
}
