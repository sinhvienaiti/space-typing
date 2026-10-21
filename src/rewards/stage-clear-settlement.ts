import type { DifficultySettings } from "../campaign/difficulty-settings";
import { recordDifficultyResult } from "../campaign/difficulty-settings";
import {
  advanceCampaignExpansionOnStageClear,
  type CampaignExpansionState,
} from "../campaign/expansion-state";
import { inputProfileKey, recordStageClear } from "../campaign/progress";
import { syncRouteStateForStage } from "../campaign/route";
import { createStageConfig } from "../campaign/stage";
import type { DifficultyProfile } from "../campaign/types";
import type { CharacterProgressAward } from "../characters/progression";
import { awardCharacterProgress } from "../characters/progression";
import { getCharacter, type CharacterId } from "../characters/registry";
import { unlockCharactersForStage, updateCharacterProgress } from "../characters/state";
import { discoverCodexReward, type CodexRewardId, type CodexState } from "../codex/state";
import { boostClearCredits, type CosmeticsState } from "../cosmetics/state";
import { addCredits, stageClearCreditReward } from "../economy/credits";
import {
  addExpansionCurrencyReward,
  expansionCurrencyRewardText,
  scaleExpansionCurrencyReward,
  stageClearExpansionCurrencyReward,
  type ExpansionCurrencyReward,
} from "../economy/currencies";
import { WARP_POLICY } from "../economy/warp-charge";
import { objectiveRewardFactor, type StageObjectiveState } from "../events/objectives";
import type { InputMode } from "../input/mode";
import {
  createCheckpointSnapshot,
  type CheckpointSnapshot,
  type RunPersistentState,
} from "../persistence/checkpoint";
import {
  advanceAscensionOnStageClear,
  ascensionCompletionReward,
  currentAscensionStage,
} from "../progression/ascension";
import { ACHIEVEMENT_REGISTRY, recordProgressionEvent, syncAchievements } from "../progression/missions";
import type { GameplayMode } from "../recall/model";
import { getRelicDefinition, type RelicId } from "../relics/registry";
import { awardRelicReward } from "../relics/state";
import { markRestHubPending } from "../shops/state";
import type { GameStats } from "../types";
import { settleCombatCreditStageBase } from "./combat-credit-drops";
import {
  performanceReward,
  performanceRewardText,
  sectorCheckpointReward,
} from "./campaign-rewards";

/**
 * Campaign stage-clear settlement as one pure step: every reward and state
 * change of a clear is worked out here without touching game state, so the
 * game applies all of it together or none of it (src/main.ts onStageClear).
 */

/** What a cleared stage measured; read once, so a retry settles the same clear. */
export type StageClearRecord = {
  stats: Pick<GameStats, "stage" | "score" | "misses" | "maxStreak">;
  accuracy: number;
  wpm: number;
  elapsedSeconds: number;
  correctWordKeys: number;
  inputMode: InputMode;
  voiceWords: number;
  voicePolicy: string;
  gameplayMode: GameplayMode;
  vocabularyLevel: number;
  objective: StageObjectiveState | null;
  difficulty: DifficultyProfile | null;
  salvage: number;
  combatCreditsGranted: number;
  creditsMultiplier: number;
  clearedAt: string;
};

/** The account state a clear reads and changes. */
export type StageClearState = {
  run: RunPersistentState;
  cosmetics: CosmeticsState;
  codex: CodexState;
  campaignExpansion: CampaignExpansionState;
  difficultySettings: DifficultySettings;
  /** Sector rewards the account was already given (Warp milestone keys). */
  milestoneGrants: readonly string[];
};

export type StageClearSettlement = {
  state: Omit<StageClearState, "milestoneGrants">;
  /** The new checkpoint loadout, or null to keep the current one. */
  checkpointSnapshot: CheckpointSnapshot | null;
  /** The sector reward granted with this clear, or null. */
  milestoneKey: string | null;
  relic: RelicId | null;
  characterId: CharacterId;
  progressAward: CharacterProgressAward;
  credits: number;
  currencies: ExpansionCurrencyReward;
  objectiveText: string;
  performanceText: string;
  ascensionText: string;
  checkpointText: string;
  /** The notice shown once the clear is saved. */
  message: string;
};

export function settleStageClear(
  state: StageClearState,
  clear: StageClearRecord,
): StageClearSettlement {
  const { stage } = clear.stats;
  const { accuracy, wpm } = clear;
  const difficultySettings = recordDifficultyResult(
    state.difficultySettings,
    wpm,
    accuracy,
    { mode: clear.inputMode, voiceWords: clear.voiceWords, elapsedSeconds: clear.elapsedSeconds },
  );

  let campaign = recordStageClear(state.run.campaign, stage, {
    score: clear.stats.score,
    accuracy,
    wpm,
    clearedAt: clear.clearedAt,
    inputMode: clear.inputMode, voiceWords: clear.voiceWords, voicePolicy: clear.voicePolicy,
  }, inputProfileKey(clear.inputMode, clear.gameplayMode, difficultySettings.mode, state.run.ascension.selectedTier, clear.vocabularyLevel));
  const route = state.run.ascension.selectedTier === 0
    ? syncRouteStateForStage(state.run.route, campaign.highestUnlockedStage)
    : state.run.route;

  const characterUnlock = unlockCharactersForStage(state.run.characters, stage);
  const characterId = characterUnlock.state.selected;
  const progressAward = awardCharacterProgress(
    characterUnlock.state.progress[characterId],
    { stage, accuracy, wpm },
  );
  const characters = updateCharacterProgress(
    characterUnlock.state,
    characterId,
    progressAward.progress,
  );

  const unlockedNames = characterUnlock.unlocked.map(
    (id) => getCharacter(id).name,
  );
  const unlockText =
    unlockedNames.length > 0
      ? " · " + unlockedNames.join(", ") + " unlocked"
      : "";
  const progressText =
    progressAward.levelUps > 0 || progressAward.masteryUps > 0
      ? " · " +
        getCharacter(characterId).name +
        " Lv " +
        String(progressAward.progress.level) +
        " · Mastery " +
        String(progressAward.progress.mastery)
      : "";

  const difficultyRewardMultiplier = clear.difficulty?.rewardMultiplier ?? 1;
  const objective = clear.objective;
  const objectiveBonusFactor =
    clear.difficulty === null
      ? 0
      : objectiveRewardFactor(objective, clear.difficulty);
  const combinedRewardMultiplier =
    difficultyRewardMultiplier * (1 + objectiveBonusFactor);
  const stageBaseCreditTarget =
    stageClearCreditReward({ stage, accuracy, salvage: clear.salvage }) *
    combinedRewardMultiplier;
  const combatCreditSettlement = settleCombatCreditStageBase({
    stageBaseCredits: stageBaseCreditTarget,
    combatCreditsGranted: clear.combatCreditsGranted,
    creditsMultiplier: clear.creditsMultiplier,
  });
  const performance =
    clear.difficulty === null
      ? null
      : performanceReward({
          stats: clear.stats,
          accuracy,
          wpm,
          difficulty: clear.difficulty,
          objectiveComplete: objective?.status === "complete",
          typingEvidence: clear.inputMode !== "voice" && clear.correctWordKeys > 0,
        });
  const performanceCredits =
    performance === null ? 0 : performance.credits * difficultyRewardMultiplier;
  let totalCreditReward =
    combatCreditSettlement.settlementCredits + performanceCredits;
  // Style Shop Credit Booster: extra Credits for its remaining clears.
  const boostedClear = boostClearCredits(state.cosmetics, totalCreditReward);
  totalCreditReward += boostedClear.bonus;
  let credits = addCredits(state.run.credits, totalCreditReward);

  const baseCurrencyReward = scaleExpansionCurrencyReward(
    stageClearExpansionCurrencyReward(stage, createStageConfig(stage).role, accuracy),
    combinedRewardMultiplier,
  );
  let totalCurrencyReward = baseCurrencyReward;
  let expansionCurrencies = addExpansionCurrencyReward(
    state.run.expansionCurrencies,
    baseCurrencyReward,
  );
  let codex = state.codex;
  if (performance !== null) {
    const performanceCurrencies = scaleExpansionCurrencyReward(
      performance.currencies,
      difficultyRewardMultiplier,
    );
    expansionCurrencies = addExpansionCurrencyReward(expansionCurrencies, performanceCurrencies);
    totalCurrencyReward = addExpansionCurrencyReward(totalCurrencyReward, performanceCurrencies);
    for (const id of performance.earned) {
      codex = discoverCodexReward(codex, ("performance-" + id) as CodexRewardId).state;
    }
  }
  const performanceText =
    performance === null ? "" : performanceRewardText(performance);
  const objectiveText =
    objective?.status === "complete"
      ? " · Objective +" + Math.round(objectiveBonusFactor * 100) + "%"
      : objective?.status === "failed"
        ? " · Objective failed"
        : "";

  const achievements = syncAchievements(
    recordProgressionEvent(state.run.progression, { type: "stage-clear", accuracy }),
    campaign,
    state.run.hiddenDiscovery,
  );
  const progression = achievements.state;
  const achievementNames = achievements.newlyUnlocked.map(
    (id) => ACHIEVEMENT_REGISTRY[id].name,
  );
  const achievementText =
    achievementNames.length > 0
      ? " · Achievement: " + achievementNames.join(", ")
      : "";

  const completedTier = state.run.ascension.selectedTier;
  const ascensionResult = advanceAscensionOnStageClear(state.run.ascension, stage);
  const ascension = ascensionResult.state;
  if (completedTier > 0) {
    campaign = {
      ...campaign,
      selectedStage: currentAscensionStage(ascension) ?? campaign.highestUnlockedStage,
    };
  }

  let ascensionText = "";
  if (completedTier === 0 && ascensionResult.unlockedTier === 1) {
    ascensionText = " · Ascension 1 unlocked";
  } else if (completedTier > 0 && ascensionResult.newlyCompleted) {
    const reward = ascensionCompletionReward(completedTier);
    credits = addCredits(credits, reward.credits);
    expansionCurrencies = addExpansionCurrencyReward(expansionCurrencies, reward.currencies);
    totalCreditReward += reward.credits;
    totalCurrencyReward = addExpansionCurrencyReward(totalCurrencyReward, reward.currencies);
    ascensionText =
      " · Ascension " +
      String(completedTier) +
      " complete" +
      (ascensionResult.unlockedTier === null
        ? " · all tiers complete"
        : " · Tier " + String(ascensionResult.unlockedTier) + " unlocked");
  }

  let checkpointCommitted = ascensionResult.checkpointCommitted;
  let campaignExpansion = state.campaignExpansion;
  if (completedTier === 0) {
    const expansionResult = advanceCampaignExpansionOnStageClear(
      campaignExpansion,
      campaign,
      stage,
      clear.clearedAt,
    );
    campaignExpansion = expansionResult.state;
    checkpointCommitted = expansionResult.checkpointCommitted;
  } else if (checkpointCommitted) {
    campaignExpansion = { ...campaignExpansion, crashRecovery: null };
  }

  const milestoneKey = `${WARP_POLICY.version}:sector:${completedTier}:${stage}`;
  const sectorRewardEligible =
    checkpointCommitted && !state.milestoneGrants.includes(milestoneKey);
  let relics = state.run.relics;
  let relic: RelicId | null = null;
  let shops = state.run.shops;
  let sectorRewardText = "";
  if (sectorRewardEligible) {
    const award = awardRelicReward(
      relics,
      stage,
      completedTier > 0
        ? "ascension:" + String(completedTier) + ":sector:" + String(stage)
        : "sector:" + String(stage),
    );
    relics = award.state;
    relic = award.id;
    if (completedTier === 0) shops = markRestHubPending(shops, stage);
    const sectorReward = sectorCheckpointReward(stage);
    const ascensionRewardMultiplier = clear.difficulty?.ascensionRewardMultiplier ?? 1;
    const sectorCredits = Math.round(sectorReward.credits * ascensionRewardMultiplier);
    const sectorCurrencies = scaleExpansionCurrencyReward(
      sectorReward.currencies,
      ascensionRewardMultiplier,
    );
    credits = addCredits(credits, sectorCredits);
    expansionCurrencies = addExpansionCurrencyReward(expansionCurrencies, sectorCurrencies);
    totalCreditReward += sectorCredits;
    totalCurrencyReward = addExpansionCurrencyReward(totalCurrencyReward, sectorCurrencies);
    codex = discoverCodexReward(codex, "sector-cache").state;
    sectorRewardText = " · Sector +" + sectorCredits.toLocaleString() + " Credits";
  }

  const run: RunPersistentState = {
    ...state.run,
    campaign,
    route,
    characters,
    credits,
    progression,
    expansionCurrencies,
    shops,
    relics,
    ascension,
  };
  const currencyRewardText = expansionCurrencyRewardText(totalCurrencyReward);
  const checkpointText = checkpointCommitted
    ? completedTier > 0
      ? " · Ascension A" +
        String(completedTier) +
        " checkpoint " +
        String(stage).padStart(3, "0") +
        " committed" +
        sectorRewardText +
        relicRewardText(relic)
      : " · Checkpoint " +
        String(campaignExpansion.checkpoint.stage).padStart(3, "0") +
        " committed" +
        sectorRewardText +
        relicRewardText(relic)
    : "";

  return {
    state: {
      run,
      cosmetics: boostedClear.state,
      codex,
      campaignExpansion,
      difficultySettings,
    },
    checkpointSnapshot: sectorRewardEligible
      ? createCheckpointSnapshot(run, campaignExpansion.checkpoint.stage)
      : null,
    milestoneKey: sectorRewardEligible ? milestoneKey : null,
    relic,
    characterId,
    progressAward,
    credits: totalCreditReward,
    currencies: totalCurrencyReward,
    objectiveText,
    performanceText,
    ascensionText,
    checkpointText,
    message:
      "✓ Saved · Stage " +
      String(stage).padStart(3, "0") +
      " cleared" +
      unlockText +
      progressText +
      " · +" +
      totalCreditReward.toLocaleString() +
      " Credits" +
      (currencyRewardText.length > 0 ? " · " + currencyRewardText : "") +
      objectiveText +
      (performanceText.length > 0 ? " · Performance: " + performanceText : "") +
      achievementText +
      ascensionText +
      checkpointText,
  };
}

function relicRewardText(id: RelicId | null): string {
  return id === null ? "" : " · Relic: " + getRelicDefinition(id).name;
}

/**
 * Which encounter's clear is settled, and the one clear still owed a retry.
 * A clear counts as settled once its rewards are applied, so a settlement
 * that threw stays open and can run again for the same encounter.
 */
export class StageClearLedger {
  private settledEncounter = "";
  private owed: { encounter: string; retry: () => Promise<unknown> } | null = null;

  isSettled(encounter: string): boolean {
    return encounter === this.settledEncounter;
  }

  settle(encounter: string): void {
    this.settledEncounter = encounter;
    this.owed = null;
  }

  /** Keeps a failed settlement to try again before its clear is committed. */
  defer(encounter: string, retry: () => Promise<unknown>): void {
    this.owed = { encounter, retry };
  }

  /** Runs the owed settlement if it belongs to `encounter`; true once that clear is settled. */
  async retry(encounter: string): Promise<boolean> {
    const owed = this.owed;
    this.owed = null;
    if (owed === null || owed.encounter !== encounter || this.isSettled(encounter)) {
      return this.isSettled(encounter);
    }
    await owed.retry();
    return this.isSettled(encounter);
  }
}

/** How src/main.ts settles, applies and saves one Campaign clear. */
export type StageClearCommitSteps = {
  /** Works the clear out from the current state (settleStageClear); may throw. */
  settle(): StageClearSettlement;
  /** Plain assignments of the whole settlement. */
  apply(settlement: StageClearSettlement): void;
  /** The clear's own save; true once kept. */
  save(settlement: StageClearSettlement): Promise<boolean>;
  /** Opens the Rest Hub if this clear made one pending. */
  openRestHub(): void;
  /** After the save, kept or not (best-effort device state, effects, HUD). */
  afterSave(settlement: StageClearSettlement): void;
  notice(text: string): void;
};

/**
 * Settles one clear into the ledger: worked out, applied, only then counted
 * as settled, and saved. A settlement that throws changes nothing and is
 * owed a retry before the clear is committed. That retry is already leaving
 * the clear screen: it opens no Rest Hub (it stays pending for the hangar)
 * and leaves the notice to its caller.
 */
export async function commitStageClear(
  ledger: StageClearLedger,
  encounter: string,
  steps: StageClearCommitSteps,
  retry = false,
): Promise<StageClearSettlement | null> {
  let settlement: StageClearSettlement;
  try {
    settlement = steps.settle();
  } catch (error) {
    console.error("Unable to settle the stage clear.", error);
    ledger.defer(encounter, () => commitStageClear(ledger, encounter, steps, true));
    if (!retry) steps.notice("Stage rewards are not settled yet · retrying when you leave this screen");
    return null;
  }

  steps.apply(settlement);
  ledger.settle(encounter);
  try {
    if ((await steps.save(settlement)) && !retry) steps.openRestHub();
  } finally {
    steps.afterSave(settlement);
  }
  return settlement;
}
