import "./styles.css";
import "./character-progress.css";
import "./basic-skills.css";
import "./kill-translation.css";
import {
  DEFAULT_KILL_TRANSLATION_SETTINGS,
  KillTranslationQueue,
  hasVisibleKillTranslation,
  sanitizeKillTranslationSettings,
} from "./feedback/kill-translation";
import { Game } from "./Game";
import {
  stageResultStars,
  type StageSessionSnapshot,
  type StageWordOutcome,
} from "./results/stage-session";
import { hasUsableDeathProtection } from "./ui/game-over";
import {
  loadArtAssetManifest,
  preloadArtAssets,
  type ArtAssetCatalog,
} from "./assets/pipeline";
import { difficultyFor } from "./campaign/difficulty";
import { journeyNodesForStage, journeyPath } from "./campaign/journey-map";
import type { StagePacingPhase } from "./campaign/stage-pacing";
import { selectCompletedStageForReplay } from "./campaign/replay";
import {
  difficultyModeDefinition,
  difficultyModePresentation,
} from "./campaign/difficulty-modes";
import type {
  DifficultyProfile,
  StageConfig,
} from "./campaign/types";
import {
  createDifficultySettings,
  difficultyInputFromSettings,
  recordDifficultyResult,
  sanitizeDifficultySettings,
  type DifficultySettings,
} from "./campaign/difficulty-settings";
import {
  createDefaultCampaignProgress,
  recordStageClear,
  selectCampaignStage,
} from "./campaign/progress";
import {
  advanceCampaignExpansionOnStageClear,
  canSelectCampaignStage,
  createCampaignExpansionState,
  rollbackCampaignExpansion,
  type CampaignExpansionState,
  type CrashRecoveryReason,
} from "./campaign/expansion-state";
import {
  createStageConfig,
  stageRole,
  GALAXY_COUNT,
  STAGES_PER_GALAXY,
} from "./campaign/stage";
import {
  createRouteState,
  routeChoicesForStage,
  routeNeedsChoice,
  routeNodeLabel,
  routeProgress,
  selectRouteNode,
  selectedRouteNode,
  syncRouteStateForStage,
  type RouteNode,
  type RouteState,
} from "./campaign/route";
import {
  CHARACTER_IDS,
  getCharacter,
} from "./characters/registry";
import {
  drawCharacterShip,
  setCharacterShipSheet,
} from "./characters/renderer";
import {
  parseShipArtPreference,
  PREMIUM_SHIP_SHEET_ASSET_ID,
  selectCharacterShipSheet,
} from "./characters/ship-art";
import { CHARACTER_SHIP_SHEET_ASSET_ID } from "./characters/visuals";
import { deriveEquipmentAura } from "./characters/equipment-aura";
import { AEGIS_ACTIVE_SKILL_ID } from "./characters/aegis";
import { ARSENAL_ACTIVE_SKILL_ID } from "./characters/arsenal";
import { BASTION_ACTIVE_SKILL_ID } from "./characters/bastion";
import { CELESTIAL_ACTIVE_SKILL_ID } from "./characters/celestial";
import { FORTUNE_ACTIVE_SKILL_ID } from "./characters/fortune";
import { ORACLE_ACTIVE_SKILL_ID } from "./characters/oracle";
import { REAPER_ACTIVE_SKILL_ID } from "./characters/reaper";
import {
  createStarterCharacterState,
  selectCharacter,
  syncCharacterUnlocks,
  unlockCharactersForStage,
  updateCharacterProgress,
  type CharacterState,
} from "./characters/state";
import {
  awardCharacterProgress,
  characterProgressStatBonus,
  MAX_CHARACTER_LEVEL,
  xpNeededForLevel,
} from "./characters/progression";
import {
  resetTalentRanks,
  spendTalentPoint,
  TALENT_BRANCHES,
  talentBranchLabel,
  talentPointsForLevel,
  talentStatBonus,
  totalTalentPoints,
} from "./characters/talents";
import { VANGUARD_ACTIVE_SKILL_ID } from "./characters/vanguard";
import { VOLT_ACTIVE_SKILL_ID } from "./characters/volt";
import { WRAITH_ACTIVE_SKILL_ID } from "./characters/wraith";
import { ZENITH_ACTIVE_SKILL_ID } from "./characters/zenith";
import { characterStatBonus } from "./characters/stats";
import {
  addEquipmentInstance,
  createStarterEquipmentState,
  equipmentForSlot,
  equipmentStatBonus,
  equipInstance,
  unequipSlot,
} from "./equipment/loadout";
import type { EquipmentState } from "./equipment/loadout";
import {
  EQUIPMENT_SLOTS,
  getEquipmentDefinition,
} from "./equipment/registry";
import {
  createEmptyInventory,
  inventoryTotal,
  itemCount,
  removeItem,
} from "./items/inventory";
import type { Inventory } from "./items/inventory";
import {
  COMBAT_CONSUMABLE_IDS,
  type CombatConsumableId,
} from "./items/consumables";
import { getItemDefinition } from "./items/registry";
import {
  addCredits,
  stageClearCreditReward,
} from "./economy/credits";
import {
  addExpansionCurrencyReward,
  createExpansionCurrencyState,
  expansionCurrencyRewardText,
  scaleExpansionCurrencyReward,
  stageClearExpansionCurrencyReward,
  type ExpansionCurrencyState,
} from "./economy/currencies";
import { gradeLabel, type GradeId } from "./grades";
import {
  applyGradeFrame,
  createGradeBadge,
  createLocalIcon,
  replaceCurrencyChips,
} from "./ui/components";
import {
  currencyAccessibleText,
  type CurrencyAmounts,
} from "./ui/currency";
import { CORE_STAT_KEYS, type CoreStatKey } from "./stats/core";
import {
  attributeUpgradeCost,
  createUpgradeState,
  maxAttributeLevel,
  permanentAttributeBonus,
  type UpgradeCost,
  type UpgradeState,
} from "./progression/upgrades";
import {
  UPGRADEABLE_SKILL_IDS,
  resolveSkillDefinitionLevel,
} from "./skills/progression";
import {
  BASIC_SKILL_PRESENTATION,
  basicSkillNextUnlockLevel,
  basicSkillPoints,
  spendBasicSkillPoint,
} from "./progression/basic-skills";
import {
  RELIC_REGISTRY,
  getRelicDefinition,
  type RelicId,
} from "./relics/registry";
import {
  MAX_EQUIPPED_RELICS,
  compileRelicEffects,
  createRelicState,
  equipRelic,
  grantRelic,
  selectRelicReward,
  unequipRelic,
  type RelicState,
} from "./relics/state";
import {
  EQUIPMENT_AFFIX_REGISTRY,
  maxAffixesForGrade,
} from "./equipment/affixes";
import { MusicController } from "./audio/MusicController";
import {
  musicProfileForWorld,
  musicStateForStagePhase,
  musicStateForStageRole,
  type MusicState,
} from "./audio/music-profile";
import {
  stageInWorld,
  worldForStage,
} from "./worlds/registry";
import type { WorldProfile } from "./worlds/types";
import {
  createHiddenTransitionSpec,
  createStageTransitionSpec,
  type StageTransitionSpec,
} from "./ui/stage-transition";
import {
  buyShopStockEntry,
  canAffordShopPrice,
  createShopState,
  dismissRestHub,
  markRestHubPending,
  pendingRestHubStage,
  formatShopPrice,
  resolveShopInstance,
  shopAvailable,
  type ShopInstance,
  type ShopRollContext,
  type ShopState,
  type ShopStockEntry,
  type ShopType,
} from "./shops/state";
import {
  buyAttributeUpgrade,
  buyEquipmentAffix,
  buyEquipmentAffixReroll,
  buyEquipmentEvolution,
  buyEquipmentUpgrade,
  buyRepairPack,
  buySkillUpgrade,
  dismantleEquipment,
  dismantleReward,
  equipmentAffixRollCost,
  equipmentEvolutionCost,
  equipmentUpgradeAlloyCost,
  equipmentUpgradeCost,
  REPAIR_PACK_ALLOY_COST,
  REPAIR_PACK_COST,
} from "./shops/service-shop";

import {
  accuracyPercent,
  stageWordsPerMinute,
} from "./logic";
import type { EquipmentDrop } from "./loot/equipment-loot";
import {
  createBossRewardChoiceOptions,
  type BossRewardChoiceOption,
} from "./events/reward-choice";
import {
  performanceReward,
  performanceRewardText,
  sectorCheckpointReward,
} from "./rewards/campaign-rewards";
import {
  createCodexState,
  discoverCodexEnemy,
  discoverCodexReward,
  discoverCodexWorld,
  type CodexRewardId,
  type CodexState,
} from "./codex/state";
import type { StageEventDefinition } from "./events/stage-scheduler";
import {
  objectiveProgressText,
  objectiveRewardFactor,
  type StageObjectiveState,
} from "./events/objectives";
import {
  statusLabel,
  type ActiveStatus,
} from "./status/engine";
import {
  buildSynergyStatBonus,
  buildSynergySummary,
  resolveBuildSynergies,
} from "./synergy/build";
import {
  createLuckPityState,
  type LuckPityState,
} from "./loot/pity";
import {
  ACHIEVEMENT_IDS,
  ACHIEVEMENT_REGISTRY,
  MISSION_IDS,
  MISSION_REGISTRY,
  claimMission,
  createProgressionState,
  missionClaimable,
  missionProgress,
  recordProgressionEvent,
  syncAchievements,
  type ProgressionState,
} from "./progression/missions";
import {
  collectionEntries,
  resolveMetaProgression,
} from "./progression/meta";
import {
  achievementImportance,
  collectionImportance,
  missionImportance,
  objectiveImportance,
  type ImportancePresentation,
} from "./ui/importance";
import {
  applyAscensionDifficulty,
  advanceAscensionOnStageClear,
  ascensionCompletionReward,
  ascensionProfile,
  canSwitchAscensionTier,
  createAscensionState,
  currentAscensionStage,
  selectAscensionTier,
  type AscensionState,
} from "./progression/ascension";
import {
  createHiddenDiscoveryState,
  type HiddenContentDefinition,
  type HiddenDiscoveryState,
} from "./discovery/hidden-content";
import {
  HIDDEN_CHALLENGE_TIERS,
  advanceHiddenEncounter,
  createHiddenEncounterState,
  hiddenEncounterDifficulty,
  hiddenEncounterLabel,
  hiddenEncounterOffers,
  hiddenEncounterReward,
  hiddenEncounterRuntime,
  skipHiddenEncounter,
  startHiddenEncounter,
  type ActiveHiddenEncounter,
  type HiddenChallengeTier,
  type HiddenEncounterKind,
  type HiddenEncounterOffer,
  type HiddenEncounterState,
} from "./discovery/hidden-encounter";
import {
  DEFENSIVE_SKILLS,
  type DefensiveSkillId,
} from "./skills/defensive";
import type { SkillBlockReason } from "./skills/engine";
import {
  OFFENSIVE_SKILLS,
  type OffensiveSkillId,
} from "./skills/offensive";
import {
  createStarterSupportSpellState,
  equipSupportSpell,
  type SupportSpellState,
} from "./skills/support-loadout";
import {
  getSupportSpell,
  isSupportSpellId,
  type SupportSpellId,
} from "./skills/support";
import {
  assignHotbarSlot,
  createDefaultHotbarState,
  hotbarActionKey,
  hotbarPlacementForSlot,
  hotbarSlotForKey,
  type HotbarAction,
  type HotbarState,
} from "./hud/hotbar";

type CombatSkillId = DefensiveSkillId | OffensiveSkillId;
import { DEFAULT_PLAYER_BASE_STATS } from "./stats/player";
import { mountTestLab } from "./test-lab/controller";
import { AutosaveQueue } from "./persistence/autosave";
import {
  createCheckpointSnapshot,
  restoreCheckpointSnapshot,
  type CheckpointSnapshot,
  type RunPersistentState,
} from "./persistence/checkpoint";
import {
  consumePhoenixCore,
  createStageEntrySnapshot,
  resolveSalvageAnchor,
  resolveStageRevivalCore,
  type StageEntrySnapshot,
} from "./persistence/death-protection";
import {
  captureCrashRecoverySnapshot,
  invalidateCrashRecoverySnapshot,
  type CrashRecoverySnapshot,
} from "./persistence/crash-recovery";
import {
  exportPlayerSaveJson,
  parsePlayerSaveJson,
} from "./persistence/backup";
import {
  createPlayerSave,
  loadPlayerSave,
  savePlayerProgress,
  savePlayerRecoveryMirrorSync,
  UnsupportedPlayerSaveVersionError,
} from "./persistence/player-save";
import type {
  PersistenceSource,
  SaveReason,
} from "./persistence/player-save";
import { speakEnglish, stopSpeech } from "./speech";
import {
  loadVocabularyGrammarIndex,
  loadVocabularyGrammarModule,
  loadVocabularyIndex,
  loadVocabularyLevel,
  loadVocabularyPosCategory,
  loadVocabularyPosIndex,
  loadVocabularyTopic,
  loadVocabularyTopicIndex,
  parseCustomVocabulary,
  type VocabularyGrammarIndex,
  type VocabularyPosIndex,
  type VocabularyTopicIndex,
} from "./vocabulary";
import {
  loadTypingTextChallenge,
  type TypingTextChallenge,
} from "./typing-text";
import type { BossHudState } from "./boss/model";
import type {
  GamePhase,
  GameSettings,
  GameStats,
  VisualQuality,
  VocabularyEntry,
  VocabularyIndex,
} from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (app === null) {
  throw new Error("#app not found");
}

const SETTINGS_KEY = "spaceTypingSettingsV1";
const DIFFICULTY_KEY = "spaceTypingDifficultyV1";
const SOURCE_KEY = "spaceTypingVocabularySourceV1";
const CUSTOM_KEY = "spaceTypingCustomVocabularyV1";

type VocabularySource =
  | { mode: "class"; level: number }
  | { mode: "topic"; topicId: string; level: number }
  | { mode: "word-type"; posId: string; level: number }
  | { mode: "grammar"; grammarId: string; level: number }
  | { mode: "custom" };

type VocabularySourceTab = VocabularySource["mode"];

const defaultSettings: GameSettings = {
  sfxVolume: 0.5,
  musicVolume: 0.35,
  ambientVolume: 0.15,
  screenShake: true,
  visualQuality: "high",
  pronunciationEnabled: true,
  pronunciationRate: 1,
  pronunciationVolume: 1,
  killTranslation: { ...DEFAULT_KILL_TRANSLATION_SETTINGS },
};

function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw === null) return { ...defaultSettings };

    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      sfxVolume:
        typeof parsed.sfxVolume === "number"
          ? Math.min(1, Math.max(0, parsed.sfxVolume))
          : defaultSettings.sfxVolume,
      musicVolume:
        typeof parsed.musicVolume === "number"
          ? Math.min(1, Math.max(0, parsed.musicVolume))
          : defaultSettings.musicVolume,
      ambientVolume:
        typeof parsed.ambientVolume === "number"
          ? Math.min(1, Math.max(0, parsed.ambientVolume))
          : defaultSettings.ambientVolume,
      screenShake:
        typeof parsed.screenShake === "boolean"
          ? parsed.screenShake
          : defaultSettings.screenShake,
      visualQuality:
        parsed.visualQuality === "low" ||
        parsed.visualQuality === "medium" ||
        parsed.visualQuality === "high" ||
        parsed.visualQuality === "ultra"
          ? parsed.visualQuality
          : defaultSettings.visualQuality,
      pronunciationEnabled:
        typeof parsed.pronunciationEnabled === "boolean"
          ? parsed.pronunciationEnabled
          : defaultSettings.pronunciationEnabled,
      pronunciationRate:
        typeof parsed.pronunciationRate === "number"
          ? Math.min(1.35, Math.max(0.7, parsed.pronunciationRate))
          : defaultSettings.pronunciationRate,
      pronunciationVolume:
        typeof parsed.pronunciationVolume === "number"
          ? Math.min(1, Math.max(0, parsed.pronunciationVolume))
          : defaultSettings.pronunciationVolume,
      killTranslation: sanitizeKillTranslationSettings(parsed.killTranslation),
    };
  } catch {
    return { ...defaultSettings };
  }
}

function loadDifficultySettings(): DifficultySettings {
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    if (raw === null) return createDifficultySettings();
    return sanitizeDifficultySettings(JSON.parse(raw));
  } catch {
    return createDifficultySettings();
  }
}

function saveDifficultySettings(): void {
  localStorage.setItem(
    DIFFICULTY_KEY,
    JSON.stringify(difficultySettings),
  );
}

function loadSource(): VocabularySource {
  try {
    const parsed = JSON.parse(localStorage.getItem(SOURCE_KEY) ?? "") as VocabularySource;
    if (
      parsed.mode === "class" &&
      Number.isInteger(parsed.level) &&
      parsed.level >= 1
    ) {
      return parsed;
    }
    if (
      parsed.mode === "topic" &&
      typeof parsed.topicId === "string" &&
      parsed.topicId.trim() !== "" &&
      Number.isInteger(parsed.level) &&
      parsed.level >= 1
    ) {
      return parsed;
    }
    if (
      parsed.mode === "word-type" &&
      typeof parsed.posId === "string" &&
      parsed.posId.trim() !== "" &&
      Number.isInteger(parsed.level) &&
      parsed.level >= 1
    ) {
      return parsed;
    }
    if (
      parsed.mode === "grammar" &&
      typeof parsed.grammarId === "string" &&
      parsed.grammarId.trim() !== "" &&
      Number.isInteger(parsed.level) &&
      parsed.level >= 1
    ) {
      return parsed;
    }
    if (parsed.mode === "custom") return parsed;
  } catch {
    // Use default source.
  }
  return { mode: "class", level: 1 };
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error("#" + id + " not found");
  }
  return element as T;
}

app.innerHTML = `
  <section id="killLearningStrip" class="kill-learning-strip hidden" aria-live="polite" aria-atomic="true">
    <span class="kill-learning-label" aria-hidden="true">IPA · NGHĨA TIẾNG VIỆT</span>
    <div class="kill-learning-text">
      <strong id="killLearningIpa" class="kill-learning-ipa"></strong>
      <strong id="killLearningVi" class="kill-learning-vi"></strong>
    </div>
  </section>
  <div class="game-shell">
    <canvas id="gameCanvas" aria-label="Space Typing battlefield"></canvas>

    <header class="hud">
      <div class="hud-side">
        <div class="metric"><span>score</span><strong id="score">0</strong></div>
        <div class="metric"><span>streak</span><strong id="streak">0</strong></div>
        <div class="metric"><span>multi</span><strong id="multiplier">x1</strong></div>
      </div>

      <div id="waveBadge" class="wave-badge">stage 001</div>

      <div class="hud-side hud-side-right">
        <div class="metric"><span>accuracy</span><strong id="accuracy">100%</strong></div>
        <div class="metric"><span>kills</span><strong id="kills">0</strong></div>
      </div>
    </header>

    <div class="combat-info-stack" aria-live="polite">
      <div
        id="stageEventBadge"
        class="stage-event-badge hidden"
      ></div>
      <div
        id="objectiveBadge"
        class="stage-event-badge hidden"
      ></div>
      <div
        id="statusBadge"
        class="status-badge hidden"
      ></div>
      <div
        id="typingTextBadge"
        class="typing-text-badge hidden"
      ></div>
    </div>

    <div id="bossHud" class="boss-hud hidden" aria-live="polite">
      <div class="boss-hud-meta">
        <strong id="bossName">Boss</strong>
        <span id="bossHpText">0 / 0</span>
      </div>
      <div class="boss-hp-track">
        <div id="bossHpFill" class="boss-hp-fill"></div>
      </div>
    </div>

    <aside id="playerStatusHud" class="player-status-hud hidden" aria-label="Player status">
      <div class="player-status-body">
        <div class="player-status-head">
          <strong id="playerStatusName">Vanguard</strong>
          <span id="playerStatusLevel">Lv 1</span>
        </div>
        <div class="resource-row hull-row">
          <span>Hull</span>
          <div class="resource-track">
            <i id="hullDamageFill" class="resource-fill resource-damage-fill"></i>
            <i id="hullFill" class="resource-fill hull-fill"></i>
          </div>
          <strong id="hull">100 / 100</strong>
        </div>
        <div class="resource-row shield-row">
          <span>Shield</span>
          <div class="resource-track">
            <i id="shieldFill" class="resource-fill shield-fill"></i>
          </div>
          <strong id="shield">40 / 40</strong>
        </div>
        <div class="resource-row energy-row">
          <span>Energy</span>
          <div class="resource-track">
            <i id="energyFill" class="resource-fill energy-fill"></i>
          </div>
          <strong id="energyText">100 / 100</strong>
        </div>
        <div class="player-ultimate">
          <span id="powerHint" title="Correct typing builds Rage. SPACE at 100% activates your character ultimate and Nova Pulse: removes all visible regular enemies and hostile bullets, and damages an unshielded boss. Bonus targets remain collectible.">Rage · charging</span>
          <div class="power-track">
            <div id="powerFill" class="power-fill"></div>
          </div>
          <kbd>SPACE</kbd>
        </div>
      </div>
    </aside>

    <div id="combatHotbar" class="combat-hotbar hidden" aria-label="Combat hotbar"></div>

    <section id="titleOverlay" class="overlay">
      <div class="main-card title-main-card">
        <p class="eyebrow">typing combat // campaign</p>
        <h1>SPACE <span>TYPE</span></h1>
        <p class="intro">
          Lock a target with its first letter, finish the word, and keep the
          streak alive. No movement — only typing decisions.
        </p>
        <p id="titleWorldMeta" class="world-meta">
          World 01 · Rainbow Reach · Stage 001-020
        </p>

        <div class="title-play-actions">
          <button id="startButton" class="primary">Continue · Stage 001</button>
          <button id="routeButton">Sector Briefing</button>
          <button id="stageSelectButton">Stage Select</button>
        </div>

        <div class="title-navigation-grid">
          <section class="title-nav-group" aria-label="Build">
            <span class="title-group-label">Build</span>
            <div class="title-group-actions">
              <button id="characterButton">Characters</button>
              <button id="equipmentButton">Equipment</button>
              <button id="supportButton">Support Spells</button>
              <button id="hotbarButton">Hotbar</button>
              <button id="vocabularyButton">Vocabulary</button>
            </div>
          </section>

          <section class="title-nav-group" aria-label="Progress">
            <span class="title-group-label">Progress</span>
            <div class="title-group-actions">
              <button id="progressionButton">Missions</button>
              <button id="codexButton">Codex</button>
              <button id="ascensionButton" class="hidden">Ascension</button>
            </div>
          </section>

          <section class="title-nav-group" aria-label="System">
            <span class="title-group-label">System</span>
            <div class="title-group-actions">
              <button id="settingsButton">Settings</button>
              <button id="dataButton">Data</button>
            </div>
          </section>
        </div>

        <details class="title-more">
          <summary>Shops &amp; Services</summary>
          <div class="title-more-actions">
            <button id="shopButton">Normal Shop</button>
            <button id="stationShopButton">Station Shop</button>
            <button id="serviceShopButton">Repair / Upgrade</button>
            <button id="travelingShopButton" class="hidden">Traveling Merchant</button>
            <button id="blackMarketButton" class="hidden">Black Market</button>
            <button id="hiddenShopButton" class="hidden">Hidden Shop</button>
            <button id="eventShopButton" class="hidden">Event Shop</button>
          </div>
        </details>

        <details class="title-more title-developer">
          <summary>Developer</summary>
          <div class="title-dev-actions"></div>
        </details>

        <div class="hints">
          <span><kbd>ESC</kbd> pause</span>
          <span><kbd>SPACE</kbd> Nova Pulse + character ultimate at 100% Rage</span>
        </div>
      </div>
    </section>

    <section id="pauseOverlay" class="overlay hidden">
      <div class="pause-card">
        <p class="eyebrow">mission hold</p>
        <h2>Game paused</h2>
        <button id="resumeButton" class="primary">Resume</button>
        <button id="pauseHotbarButton">Hotbar Setup</button>
        <button id="pauseVocabularyButton">Vocabulary</button>
        <button id="pauseSettingsButton">Settings</button>
        <button id="pauseDataButton">Data</button>
        <button id="restartButton">Restart stage</button>
        <button id="pauseStageSelectButton">Stage Select</button>
        <button id="titleButton">Back to title</button>
      </div>
    </section>

    <section id="gameOverOverlay" class="overlay hidden">
      <div class="pause-card">
        <p class="eyebrow">signal lost</p>
        <h2>Run over</h2>
        <div class="results">
          <div><span>score</span><strong id="resultScore">0</strong></div>
          <div><span>stage</span><strong id="resultWave">001</strong></div>
          <div><span>accuracy</span><strong id="resultAccuracy">100%</strong></div>
          <div><span>max key streak</span><strong id="resultStreak">0</strong></div>
        </div>
        <div id="gameOverMeasured" class="result-measured-grid" aria-label="Measured run statistics"></div>
        <p id="deathProtectionMeta" class="death-protection-meta" role="status" aria-live="polite">
          Checkpoint recovery is available.
        </p>
        <div id="deathProtectionActions" class="death-protection-actions">
          <button id="salvageAnchorButton">Salvage Anchor · 0</button>
          <button id="stageRevivalButton">Stage Revival Core · 0</button>
          <button id="phoenixCoreButton">Phoenix Core · 0</button>
        </div>
        <button id="againButton" class="primary">Replay checkpoint stage</button>
        <button id="gameOverStageSelectButton">Choose unlocked stage</button>
        <button id="resultTitleButton">Main menu</button>
      </div>
    </section>

    <section id="stageClearOverlay" class="overlay hidden">
      <div class="pause-card stage-results-card">
        <header class="stage-results-header">
          <div>
            <p class="eyebrow">stage clear · measured report</p>
            <h2 id="clearTitle">Stage 001 complete</h2>
            <p id="clearMeta" class="stage-results-meta"></p>
          </div>
          <div class="stage-stars" aria-label="Stage rating">
            <strong id="clearStars">★☆☆</strong>
            <small id="clearStarRule">1★ clear · 2★ 90% · 3★ objective / 97%</small>
          </div>
        </header>

        <div class="results stage-results-summary">
          <div><span>score</span><strong id="clearScore">0</strong></div>
          <div><span>target accuracy</span><strong id="clearAccuracy">100%</strong></div>
          <div><span>target WPM</span><strong id="clearWpm">0</strong></div>
          <div><span>time</span><strong id="clearTime">0:00</strong></div>
          <div><span>max key streak</span><strong id="clearStreak">0</strong></div>
          <div><span>kill rate</span><strong id="clearKillRate">0/min</strong></div>
        </div>

        <section class="stage-result-section">
          <h3>Combat</h3>
          <div id="clearCombatMetrics" class="result-measured-grid"></div>
        </section>

        <section class="stage-result-section">
          <h3>Typing & learning</h3>
          <p class="result-denominator-note">
            WPM/target accuracy use hostile enemy + boss word keys only. Projectile letters and bonus targets do not inflate these learning metrics. Key Streak keeps the existing gameplay semantics.
          </p>
          <div id="clearTypingMetrics" class="result-measured-grid"></div>
          <details class="word-review">
            <summary>Word review <span id="wordReviewCount"></span></summary>
            <div id="wordReviewTabs" class="word-review-tabs" role="tablist" aria-label="Word result filter">
              <button type="button" data-word-filter="all" class="active">All</button>
              <button type="button" data-word-filter="perfect">Perfect</button>
              <button type="button" data-word-filter="corrected">Corrected</button>
              <button type="button" data-word-filter="missed">Missed</button>
            </div>
            <div id="wordReviewList" class="word-review-list"></div>
          </details>
        </section>

        <section class="stage-result-section">
          <h3>Rewards</h3>
          <div id="clearCredits" class="reward-chips stage-reward-chips" aria-label="Stage rewards"></div>
        </section>

        <section id="clearCharacterProgress" class="clear-character-progress" aria-live="polite"></section>
        <p id="clearDetails" class="result-details"></p>
        <div class="stage-result-actions">
          <button id="nextStageButton" class="primary">Next stage</button>
          <button id="clearRetryButton">Replay stage</button>
          <button id="clearStageSelectButton">Stage Select</button>
          <button id="clearTitleButton">Back to title</button>
        </div>
      </div>
    </section>

    <div id="notice" class="notice" aria-live="polite"></div>
    <div
      id="stageTransition"
      class="stage-transition hidden"
      data-tone="regular"
      aria-live="polite"
    >
      <div class="stage-transition-warp" aria-hidden="true"></div>
      <div class="stage-transition-core" aria-hidden="true"></div>
      <div class="stage-transition-card">
        <small id="stageTransitionEyebrow">GALAXY 01 // RAINBOW REACH</small>
        <strong id="stageTransitionTitle">STAGE 001</strong>
        <span id="stageTransitionSubtitle">Stage 001 · 01 / 20</span>
        <em>ENTER / SPACE / TAP TO DEPLOY</em>
      </div>
    </div>

    <dialog id="stageSelectDialog" class="settings-dialog stage-select-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">campaign journey</p>
          <h2>Campaign Map</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <div class="stage-toolbar">
        <label>
          <span class="field-label">Galaxy</span>
          <select id="galaxySelect"></select>
        </label>
        <label>
          <span class="field-label">World</span>
          <select id="journeyWorldSelect"></select>
        </label>
        <span id="campaignMeta"></span>
      </div>
      <div class="journey-map-heading">
        <strong id="journeyWorldTitle">World 01</strong>
        <span>✦ Cleared · ◆ Current ship · ♛ Boss · ⚑ Checkpoint</span>
      </div>
      <div id="stageGrid" class="stage-journey-scroll" role="region" tabindex="0" aria-label="Campaign journey map"></div>
      <div id="stagePreview" class="stage-preview" aria-live="polite">
        <div>
          <strong id="stagePreviewTitle">Choose a stage</strong>
          <p id="stagePreviewMeta">Unlocked stages may be replayed.</p>
        </div>
        <button type="button" id="journeyStartButton" class="primary">Start / Replay</button>
      </div>
    </dialog>

    <dialog id="routeDialog" class="settings-dialog route-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">sector briefing</p>
          <h2 id="routeTitle">Route Map</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p id="routeMeta" class="equipment-note">
        Upcoming ten-stage sector, mandatory boss and checkpoint rest stop.
      </p>
      <div id="routeMap" class="route-map"></div>
      <div id="routeSelectedPanel" class="route-selected-panel hidden">
        <strong id="routeSelectedTitle">Combat</strong>
        <span id="routeSelectedMeta"></span>
        <div id="routeServiceGroup" class="route-service-group hidden">
          <small>Optional services at this stop</small>
          <div class="route-actions route-service-actions">
            <button id="routeShopAction" class="hidden">Open Shop</button>
            <button id="routeStationShopAction" class="hidden">Station Shop</button>
            <button id="routeServiceAction" class="hidden">Repair / Upgrade</button>
            <button id="routeSupportAction" class="hidden">Support Loadout</button>
          </div>
        </div>
        <div class="route-actions route-primary-actions">
          <button id="routeContinueButton" class="primary">Start Encounter</button>
          <button id="routeCampaignButton" type="button">Open Campaign Map</button>
        </div>
      </div>
      <section id="hiddenEncounterPanel" class="route-hidden-panel hidden">
        <div class="route-hidden-head">
          <div>
            <p class="eyebrow">optional signal</p>
            <strong id="hiddenEncounterTitle">Hidden Encounters</strong>
          </div>
          <span id="hiddenEncounterMeta"></span>
        </div>
        <div id="hiddenEncounterGrid" class="route-hidden-grid"></div>
      </section>
    </dialog>

    <dialog id="restHubDialog" class="settings-dialog rest-hub-dialog">
      <div class="dialog-head">
        <div>
          <p class="eyebrow">safe checkpoint // maintenance</p>
          <h2>Checkpoint Rest Hub</h2>
        </div>
        <button id="restHubTitleButton" type="button" class="icon-button" aria-label="Return to title">×</button>
      </div>
      <p id="restHubMeta" class="equipment-note">Sector cleared · safe rest stop</p>
      <div class="rest-hub-services">
        <button type="button" id="restHubShop">◈ Normal Shop<span>Use existing finite-stock shop</span></button>
        <button type="button" id="restHubStation">✦ Station Shop<span>Available checkpoint supplies</span></button>
        <button type="button" id="restHubRepair">✧ Repair / Upgrade<span>Repair gear and spend resources</span></button>
        <button type="button" id="restHubSupport">✺ Support Loadout<span>Prepare your next encounter</span></button>
      </div>
      <div class="rest-hub-footer">
        <button type="button" id="restHubContinue" class="primary">Continue journey</button>
        <button type="button" id="restHubLeave">Return to title</button>
      </div>
      <p class="equipment-note">Shopping is optional. Purchases use existing stock and currencies. Continue commits your checkpoint visit once.</p>
    </dialog>

    <dialog id="characterDialog" class="settings-dialog character-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">pilot roster</p>
          <h2>Character Select</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p id="characterSelectedMeta" class="equipment-note">
        Selected: Vanguard
      </p>
      <div id="characterGrid" class="character-grid"></div>
      <div id="talentPanel" class="talent-panel"></div>
      <section id="basicSkillPanel" class="basic-skill-panel" aria-label="Basic Skill Tree"></section>
      <section class="hotbar-loadout-panel">
        <div class="hotbar-loadout-head">
          <div>
            <p class="eyebrow">combat shortcuts</p>
            <strong>1–9 Hotbar</strong>
          </div>
          <small>Assign items and skills without adding more combat panels.</small>
        </div>
        <div id="hotbarLoadoutGrid" class="hotbar-loadout-grid"></div>
      </section>
    </dialog>

    <dialog id="codexDialog" class="settings-dialog codex-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">collection archive</p>
          <h2>Codex & Meta Progression</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p id="codexMeta" class="equipment-note">Meta Level 1 · Cadet</p>
      <p id="codexCollectionMeta" class="equipment-note">
        0 / 0 collection entries
      </p>
      <div id="codexGrid" class="codex-grid"></div>
    </dialog>

    <dialog id="ascensionDialog" class="settings-dialog progression-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">new game+</p>
          <h2>Ascension</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p id="ascensionMeta" class="equipment-note">
        Complete Stage 1000 to unlock Ascension.
      </p>
      <div id="ascensionGrid" class="progression-grid"></div>
    </dialog>

    <dialog id="progressionDialog" class="settings-dialog progression-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">pilot records</p>
          <h2>Missions & Achievements</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <div class="progression-columns">
        <section>
          <h3>Missions</h3>
          <div id="missionGrid" class="progression-grid"></div>
        </section>
        <section>
          <h3>Achievements</h3>
          <div id="achievementGrid" class="progression-grid"></div>
        </section>
      </div>
    </dialog>

    <dialog id="rewardChoiceDialog" class="settings-dialog reward-choice-dialog">
      <div class="dialog-head">
        <div>
          <p class="eyebrow">rare reward</p>
          <h2>Choose one reward</h2>
        </div>
      </div>
      <p class="equipment-note">
        Combat is paused. Pick one reward to continue.
      </p>
      <div id="rewardChoiceGrid" class="reward-choice-grid"></div>
    </dialog>

    <dialog id="anomalyDialog" class="settings-dialog anomaly-dialog">
      <div class="dialog-head">
        <div>
          <p class="eyebrow">anomaly detected</p>
          <h2>Choose the risk</h2>
        </div>
      </div>
      <p id="anomalyRiskMeta" class="equipment-note">
        Overload trades Hull for a stronger reward table.
      </p>
      <div class="anomaly-choice-grid">
        <button id="anomalyStabilize" type="button" class="anomaly-choice safe">
          <strong>Stabilize</strong>
          <span>Safe reward · small Shield recovery</span>
        </button>
        <button id="anomalyOverload" type="button" class="anomaly-choice risk">
          <strong>Overload</strong>
          <span>Lose Hull · Epic/Legendary-biased reward</span>
        </button>
      </div>
    </dialog>

    <dialog id="hotbarDialog" class="settings-dialog hotbar-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">combat shortcuts</p>
          <h2>1–9 Hotbar</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p class="equipment-note">
        Assign available consumables and skills. Space remains Overdrive.
      </p>
      <div id="hotbarDialogGrid" class="hotbar-loadout-grid"></div>
    </dialog>

    <dialog id="supportDialog" class="settings-dialog support-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">pre-stage loadout</p>
          <h2>Support Spells</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p class="equipment-note">
        Equip up to two support spells. Changes apply from the next stage.
      </p>
      <div class="support-loadout-grid">
        <label class="equipment-slot">
          <span class="equipment-slot-name">support slot 1</span>
          <select id="supportSlot0"></select>
          <small id="supportSlot0Meta">Empty</small>
        </label>
        <label class="equipment-slot">
          <span class="equipment-slot-name">support slot 2</span>
          <select id="supportSlot1"></select>
          <small id="supportSlot1Meta">Empty</small>
        </label>
      </div>
    </dialog>

    <dialog id="equipmentDialog" class="settings-dialog equipment-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">pre-stage build</p>
          <h2>Equipment Loadout</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p class="equipment-note">
        Loadout changes are applied to the next stage and saved immediately.
      </p>
      <div id="equipmentGrid" class="equipment-grid"></div>
      <div class="equipment-total">
        <span>equipped bonuses</span>
        <strong id="equipmentBonusText">none</strong>
      </div>
      <div class="equipment-total">
        <span>active synergies</span>
        <strong id="equipmentSynergyText">none</strong>
      </div>
    </dialog>

    <dialog id="shopDialog" class="settings-dialog shop-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">campaign supply</p>
          <h2>Normal Shop</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p class="equipment-note">
        <strong id="shopCredits">0 Credits</strong>
        · Recovery supplies and regular equipment only.
      </p>
      <div id="normalShopGrid" class="shop-grid"></div>
    </dialog>

    <dialog id="serviceShopDialog" class="settings-dialog service-shop-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">maintenance bay</p>
          <h2>Repair / Upgrade Shop</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p class="equipment-note">
        <strong id="serviceShopCredits">0 Credits · 0 Alloy</strong>
        · Upgrades and repair packs consume Credits + Alloy.
      </p>
      <div id="repairServicePanel" class="repair-service-panel"></div>
      <div id="upgradeShopGrid" class="upgrade-shop-grid"></div>
    </dialog>

    <dialog id="specialShopDialog" class="settings-dialog special-shop-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p id="specialShopEyebrow" class="eyebrow">hidden market</p>
          <h2 id="specialShopTitle">Black Market</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p class="equipment-note">
        <strong id="specialShopCredits">0 Credits</strong>
        · <span id="specialShopMeta"></span>
      </p>
      <div id="specialShopGrid" class="special-shop-grid"></div>
    </dialog>

    <dialog id="dataDialog" class="settings-dialog data-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">local data</p>
          <h2>Save backup</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>

      <div class="data-panel">
        <div class="data-summary">
          <span>Campaign progress</span>
          <strong id="dataProgress">Stage 001 / 1000</strong>
          <small>
            Player progress is stored in IndexedDB. Export a JSON backup
            before moving browsers or clearing site data.
          </small>
        </div>

        <div class="data-summary render-performance">
          <span>Live render diagnostics</span>
          <strong id="renderDiagnostics">Start an encounter to measure</strong>
          <small>Frame p95 includes browser timing; draw p95 measures Canvas calls. A high frame p95 with low draw p95 can indicate GPU/compositor pressure. Adaptive resolution only affects High and Ultra.</small>
        </div>

        <div class="data-actions">
          <button id="exportSaveButton" class="primary" type="button">
            Export Save
          </button>
          <button id="importSaveButton" type="button">Import Save</button>
          <input
            id="importSaveFile"
            class="hidden"
            type="file"
            accept=".json,application/json"
          />
        </div>

        <p id="dataStatus" class="data-status">
          Import validates the save before anything is replaced.
        </p>
      </div>
    </dialog>

    <dialog id="vocabularyDialog" class="settings-dialog vocabulary-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">learning source</p>
          <h2>Vocabulary</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>

      <div class="source-tabs">
        <button id="sourceClass" type="button">Class</button>
        <button id="sourceTopic" type="button">Topic</button>
        <button id="sourceWordType" type="button">Word type</button>
        <button id="sourceGrammar" type="button">Grammar</button>
        <button id="sourceCustom" type="button">Custom</button>
      </div>

      <section id="classPanel" class="source-panel">
        <label>
          <span class="field-label">Level</span>
          <select id="levelSelect"></select>
        </label>
        <div class="source-footer">
          <small id="levelMeta">Loading shared vocabulary…</small>
          <button id="applyLevel" class="primary" type="button">Use level</button>
        </div>
      </section>

      <section id="topicPanel" class="source-panel hidden">
        <label>
          <span class="field-label">Learning topic</span>
          <select id="topicSelect"></select>
        </label>
        <div class="source-footer">
          <small id="topicMeta">Loading shared topics…</small>
          <button id="applyTopic" class="primary" type="button">Use topic</button>
        </div>
      </section>

      <section id="wordTypePanel" class="source-panel hidden">
        <label>
          <span class="field-label">Word type</span>
          <select id="wordTypeSelect"></select>
        </label>
        <div class="source-footer">
          <small id="wordTypeMeta">Loading word types…</small>
          <button id="applyWordType" class="primary" type="button">Use word type</button>
        </div>
      </section>

      <section id="grammarPanel" class="source-panel hidden">
        <label>
          <span class="field-label">Grammar practice</span>
          <select id="grammarSelect"></select>
        </label>
        <div class="source-footer">
          <small id="grammarMeta">Loading grammar…</small>
          <button id="applyGrammar" class="primary" type="button">Use grammar</button>
        </div>
      </section>

      <section id="customPanel" class="source-panel hidden">
        <label>
          <span class="field-label">English | Vietnamese | IPA</span>
          <textarea id="customVocabulary" rows="10" placeholder="apple | quả táo | /ˈæpəl/"></textarea>
        </label>
        <div class="source-footer">
          <small>Separators: |, =, →, tab</small>
          <button id="saveCustom" class="primary" type="button">Save vocabulary</button>
        </div>
      </section>
    </dialog>

    <dialog id="settingsDialog" class="settings-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">settings</p>
          <h2>Game settings</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>

      <div class="settings-section">
        <h3>sound</h3>
        <label class="setting-row">
          <span>
            <strong>Music volume</strong>
            <small>World, boss, shop and special-state soundtrack</small>
          </span>
          <span class="setting-control range-control">
            <input id="musicVolume" type="range" min="0" max="1" step="0.05" />
            <output id="musicValue">35%</output>
          </span>
        </label>

        <label class="setting-row">
          <span>
            <strong>Ambient volume</strong>
            <small>World environmental layer; ducks below important audio</small>
          </span>
          <span class="setting-control range-control">
            <input id="ambientVolume" type="range" min="0" max="1" step="0.05" />
            <output id="ambientValue">15%</output>
          </span>
        </label>

        <label class="setting-row">
          <span>
            <strong>SFX volume</strong>
            <small>Typing, impact and combat feedback</small>
          </span>
          <span class="setting-control range-control">
            <input id="sfxVolume" type="range" min="0" max="1" step="0.05" />
            <output id="sfxValue">50%</output>
          </span>
        </label>

        <label class="setting-row">
          <span>
            <strong>Pronunciation</strong>
            <small>English voice after a completed word</small>
          </span>
          <select id="pronunciationEnabled">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>

        <label class="setting-row">
          <span>
            <strong>Pronunciation rate</strong>
            <small>Speech speed; the latest completed word takes priority</small>
          </span>
          <span class="setting-control range-control">
            <input id="pronunciationRate" type="range" min="0.7" max="1.35" step="0.05" />
            <output id="pronunciationRateValue">1.00x</output>
          </span>
        </label>

        <label class="setting-row">
          <span>
            <strong>Pronunciation volume</strong>
            <small>Parent music ducks while pronunciation is active</small>
          </span>
          <span class="setting-control range-control">
            <input id="pronunciationVolume" type="range" min="0" max="1" step="0.05" />
            <output id="pronunciationVolumeValue">100%</output>
          </span>
        </label>
      </div>

      <div class="settings-section">
        <h3>Kill translation · learning</h3>
        <label class="setting-row">
          <span><strong>Show after killing a typed word</strong><small>Dedicated strip above the battlefield; independent from English speech</small></span>
          <select id="killTranslationEnabled">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>
        <label class="setting-row">
          <span><strong>IPA</strong><small>Show pronunciation only if available</small></span>
          <select id="killTranslationIpa">
            <option value="true">Show</option>
            <option value="false">Hide</option>
          </select>
        </label>
        <label class="setting-row">
          <span><strong>Vietnamese meaning</strong><small>No repeated English target word</small></span>
          <select id="killTranslationVi">
            <option value="true">Show</option>
            <option value="false">Hide</option>
          </select>
        </label>
        <label class="setting-row">
          <span><strong>Text size</strong><small>Readable even at large resolutions</small></span>
          <select id="killTranslationSize">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label class="setting-row">
          <span><strong>Display duration</strong><small>0.8–5.0 seconds per word · two pending words maximum</small></span>
          <span class="setting-control range-control">
            <input id="killTranslationDuration" type="range" min="0.8" max="5" step="0.1" />
            <output id="killTranslationDurationValue">2.4s</output>
          </span>
        </label>
      </div>

      <div class="settings-section">
        <h3>difficulty</h3>
        <label class="setting-row">
          <span>
            <strong>Difficulty mode</strong>
            <small>Fixed modes, Adaptive, or a Custom typing target</small>
          </span>
          <select id="difficultyMode">
            <option value="relax">Relax</option>
            <option value="balanced">Balanced</option>
            <option value="hard">Hard</option>
            <option value="extreme">Extreme</option>
            <option value="nightmare">Nightmare</option>
            <option value="impossible">Impossible</option>
            <option value="adaptive">Adaptive</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label class="setting-row">
          <span>
            <strong>Recommended WPM</strong>
            <small>Guideline only; it does not lock Campaign access</small>
          </span>
          <output id="difficultyWpmValue">40–70 WPM</output>
        </label>

        <label class="setting-row">
          <span>
            <strong>Enemy density</strong>
            <small>Bounded by active typing pressure, not only enemy count</small>
          </span>
          <output id="difficultyDensityValue">Low / moderate</output>
        </label>

        <label class="setting-row">
          <span>
            <strong>CC pressure</strong>
            <small>Hard CC still obeys telegraph and anti-chain rules</small>
          </span>
          <output id="difficultyCcValue">Low</output>
        </label>

        <label class="setting-row">
          <span>
            <strong>Reaction window</strong>
            <small>Minimum scheduler/telegraph safety window</small>
          </span>
          <output id="difficultyReactionValue">0.82s+</output>
        </label>

        <label class="setting-row">
          <span>
            <strong>Formation complexity</strong>
            <small>M13 formations will consume this same difficulty contract</small>
          </span>
          <output id="difficultyFormationValue">2 / 5</output>
        </label>

        <label class="setting-row">
          <span>
            <strong>Reward multiplier</strong>
            <small>Applied to Campaign stage-clear economy rewards</small>
          </span>
          <output id="difficultyRewardValue">1.00x</output>
        </label>

        <label class="setting-row">
          <span>
            <strong>Adaptive profile</strong>
            <small>Smoothed from valid Campaign stage clears</small>
          </span>
          <output id="adaptiveProfileValue">60 WPM · 96%</output>
        </label>

        <label class="setting-row">
          <span>
            <strong>Custom target WPM</strong>
            <small>Used only when Difficulty mode is Custom</small>
          </span>
          <input id="customTargetWpm" type="number" min="10" max="300" step="5" />
        </label>

        <label class="setting-row">
          <span>
            <strong>Custom pressure</strong>
            <small>0.70 is forgiving; 1.45 is the maximum custom pressure</small>
          </span>
          <input id="customPressure" type="number" min="0.7" max="1.45" step="0.05" />
        </label>
        <p class="equipment-note">Custom tuning below is independent: 1.00× means default. Changes take effect at the NEXT encounter, never mid-stage.</p>
        <div class="custom-combat-controls" id="customCombatControls">
          <label class="setting-row">
            <span><strong>Enemy movement</strong><small>How quickly enemies approach the player</small></span>
            <span class="setting-control range-control">
              <input id="customEnemySpeed" type="range" min="0.10" max="1.65" step="0.05" />
              <output id="customEnemySpeedValue">1.00×</output>
            </span>
          </label>
          <label class="setting-row">
            <span><strong>Hostile bullet speed</strong><small>Projectile travel time, separate from fire frequency</small></span>
            <span class="setting-control range-control">
              <input id="customBulletSpeed" type="range" min="0.10" max="1.65" step="0.05" />
              <output id="customBulletSpeedValue">1.00×</output>
            </span>
          </label>
          <label class="setting-row">
            <span><strong>Enemy fire / skill rate</strong><small>Lower values give more time between hostile attacks</small></span>
            <span class="setting-control range-control">
              <input id="customFireRate" type="range" min="0.10" max="1.6" step="0.05" />
              <output id="customFireRateValue">1.00×</output>
            </span>
          </label>
          <label class="setting-row">
            <span><strong>Enemy spawn rate</strong><small>Total stage count stays the same; adjusts arrival pacing</small></span>
            <span class="setting-control range-control">
              <input id="customSpawnRate" type="range" min="0.10" max="1.45" step="0.05" />
              <output id="customSpawnRateValue">1.00×</output>
            </span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h3>visual</h3>
        <label class="setting-row">
          <span>
            <strong>Screen shake</strong>
            <small>Impact feedback on hits and damage</small>
          </span>
          <select id="screenShake">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>

        <label class="setting-row">
          <span>
            <strong>Effects quality</strong>
            <small>Particles, glow and render resolution; gameplay timing stays identical</small>
          </span>
          <select id="visualQuality">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="ultra">Ultra</option>
          </select>
        </label>
      </div>
    </dialog>
  </div>
`;

let settings = loadSettings();
let difficultySettings = loadDifficultySettings();
let activeStageDifficulty: DifficultyProfile | null = null;
let campaign = createDefaultCampaignProgress();
let inventory: Inventory = createEmptyInventory();
let equipment: EquipmentState = createStarterEquipmentState();
let supportSpells: SupportSpellState = createStarterSupportSpellState();
let hotbar: HotbarState = createDefaultHotbarState();
let characters: CharacterState = createStarterCharacterState();
let luckPity: LuckPityState = createLuckPityState();
let hiddenDiscovery: HiddenDiscoveryState = createHiddenDiscoveryState();
let credits = 0;
let progression: ProgressionState = createProgressionState();
let upgrades: UpgradeState = createUpgradeState();
let relics: RelicState = createRelicState();
let codex: CodexState = createCodexState();
let ascension: AscensionState = createAscensionState(campaign);
let expansionCurrencies: ExpansionCurrencyState =
  createExpansionCurrencyState();
let shops: ShopState = createShopState();
let route: RouteState = createRouteState(campaign.highestUnlockedStage);
const musicController = new MusicController();
musicController.setMusicVolume(settings.musicVolume);
musicController.setAmbientVolume(settings.ambientVolume);
musicController.setWorldProfile(
  musicProfileForWorld(worldForStage(campaign.selectedStage)),
);
musicController.transitionTo("WORLD_NORMAL");
let campaignExpansion: CampaignExpansionState =
  createCampaignExpansionState(campaign);
let checkpointSnapshot: CheckpointSnapshot =
  createCheckpointSnapshot(
    {
      campaign,
      inventory,
      equipment,
      supportSpells,
      characters,
      luckPity,
      hiddenDiscovery,
      credits,
      progression,
      upgrades,
      relics,
      ascension,
      expansionCurrencies,
      shops,
      route,
    },
    campaignExpansion.checkpoint.stage,
  );
let crashRecoverySnapshot: CrashRecoverySnapshot | null = null;
let stageEntrySnapshot: StageEntrySnapshot | null = null;
let persistenceReady = false;
let vocabularyReady = false;
let equipmentDropCounter = 0;
let shopPurchaseCounter = 0;
let currentShopType: ShopType = "black-market";
let lastHudShield: number | null = null;
let currentStagePhaseDisplay: StagePacingPhase | null = null;
let currentStagePhaseStage: number | null = null;
const hudDomMetrics = {
  renderCalls: 0,
  attemptedWrites: 0,
  appliedWrites: 0,
  totalRenderMs: 0,
  maxRenderMs: 0,
};
let sourceState = loadSource();
let sourceTab: VocabularySourceTab = sourceState.mode;
let vocabularyIndex: VocabularyIndex | null = null;
let vocabularyTopicIndex: VocabularyTopicIndex | null = null;
let vocabularyPosIndex: VocabularyPosIndex | null = null;
let vocabularyGrammarIndex: VocabularyGrammarIndex | null = null;
let configuredVocabulary: VocabularyEntry[] = [];
let artCatalog: ArtAssetCatalog | null = null;
const typingChallengeCache = new Map<
  string,
  Promise<TypingTextChallenge>
>();
let stageStartPending = false;
let noticeTimer: number | null = null;
let currentGalaxy = Math.ceil(campaign.selectedStage / STAGES_PER_GALAXY);
let selectedJourneyWorld = Math.ceil(campaign.selectedStage / 20);
let selectedJourneyStage = campaign.selectedStage;

/** Keyboard-, mouse- and touch-accessible help on existing menu actions.
 * Existing button IDs and their action listeners remain unchanged. */
function installMenuHelp(): void {
  const descriptions: Record<string, [string, string]> = {
    routeButton: ["Sector Briefing", "Shows the next ten combat stages, boss and checkpoint. Campaign Map lets you choose or replay an unlocked stage. Old saved sectors may still contain optional lanes."],
    stageSelectButton: ["Campaign Map", "Navigate Worlds, view boss checkpoints and replay stages that are already unlocked."],
    characterButton: ["Characters", "Choose your pilot and spend character progression upgrades."],
    equipmentButton: ["Equipment", "Review equipped gear, drops and combat attributes."],
    supportButton: ["Support Spells", "Assign the support spells available during combat."],
    hotbarButton: ["Hotbar", "Assign skills and consumables to combat shortcuts."],
    vocabularyButton: ["Vocabulary", "Select a shared level, learning topic or custom English list."],
    progressionButton: ["Missions", "Review progression objectives and claim earned rewards."],
    codexButton: ["Codex", "See discovered enemies, Worlds and reward records."],
    settingsButton: ["Settings", "Configure game audio, speech, display quality and controls."],
    dataButton: ["Data", "Review saves, active stage and combat performance information."],
    shopButton: ["Normal Shop", "Browse the existing finite-stock shop; purchases are saved."],
    stationShopButton: ["Station Shop", "Browse maintenance-related items in the station shop."],
    serviceShopButton: ["Repair and Upgrade", "Repair, improve and manage equipment with available resources."],
  };

  const wrappers: HTMLElement[] = [];
  for (const [id, [title, description]] of Object.entries(descriptions)) {
    const action = byId<HTMLButtonElement>(id);
    const parent = action.parentElement;
    if (parent === null) continue;
    const wrap = document.createElement("div");
    wrap.className = "menu-help-wrap";
    const tip = document.createElement("span");
    tip.className = "menu-help-popup";
    tip.id = "help-" + id;
    tip.setAttribute("role", "tooltip");
    tip.textContent = description;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "menu-help-trigger";
    trigger.setAttribute("aria-label", "About " + title);
    trigger.setAttribute("aria-describedby", tip.id);
    trigger.setAttribute("aria-expanded", "false");
    trigger.textContent = "ⓘ";
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasOpen = wrap.dataset.open === "true";
      for (const other of wrappers) {
        other.dataset.open = "false";
        other.querySelector(".menu-help-trigger")?.setAttribute("aria-expanded", "false");
      }
      wrap.dataset.open = String(!wasOpen);
      trigger.setAttribute("aria-expanded", String(!wasOpen));
    });
    parent.insertBefore(wrap, action);
    wrap.append(action, trigger, tip);
    wrappers.push(wrap);
    action.title = description; // Native fallback if the tooltip is unavailable.
  }

  document.addEventListener("click", (event) => {
    if ((event.target as Element).closest(".menu-help-wrap") !== null) return;
    for (const wrap of wrappers) {
      wrap.dataset.open = "false";
      wrap.querySelector(".menu-help-trigger")?.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const wrap of wrappers) {
      wrap.dataset.open = "false";
      wrap.querySelector(".menu-help-trigger")?.setAttribute("aria-expanded", "false");
    }
  });
}

installMenuHelp();

const killTranslationQueue = new KillTranslationQueue();
let killTranslationTimer: number | null = null;

function currentKillTranslationSettings() {
  return sanitizeKillTranslationSettings(settings.killTranslation);
}

function clearKillTranslationFeedback(): void {
  if (killTranslationTimer !== null) window.clearTimeout(killTranslationTimer);
  killTranslationTimer = null;
  killTranslationQueue.clear();
  byId("killLearningIpa").textContent = "";
  byId("killLearningVi").textContent = "";
}

function renderActiveKillTranslation(): void {
  if (killTranslationTimer !== null) window.clearTimeout(killTranslationTimer);
  killTranslationTimer = null;
  const config = currentKillTranslationSettings();
  let entry = killTranslationQueue.peek();
  while (entry !== null && !hasVisibleKillTranslation(entry, config)) {
    entry = killTranslationQueue.advance();
  }
  const ipa = byId("killLearningIpa");
  const vi = byId("killLearningVi");
  ipa.textContent = entry !== null && config.showIpa ? entry.ipa.trim() : "";
  vi.textContent = entry !== null && config.showVietnamese ? entry.vi.trim() : "";
  if (entry !== null) {
    killTranslationTimer = window.setTimeout(() => {
      killTranslationTimer = null;
      killTranslationQueue.advance();
      renderActiveKillTranslation();
    }, config.durationSeconds * 1000);
  }
}

function updateKillTranslationVisibility(phase: GamePhase): void {
  const config = currentKillTranslationSettings();
  const show =
    phase === "playing" && config.enabled &&
    (config.showIpa || config.showVietnamese);
  const strip = byId("killLearningStrip");
  const hiddenBefore = strip.classList.contains("hidden");
  strip.classList.toggle("hidden", !show);
  strip.classList.remove("size-small", "size-medium", "size-large");
  strip.classList.add("size-" + config.size);
  if (!show) clearKillTranslationFeedback();
  else renderActiveKillTranslation();
  if (hiddenBefore !== !show) {
    // The learning strip reserves its OWN layout row; resize the battlefield
    // only when that row appears/disappears, never on each kill.
    window.requestAnimationFrame(() => game.resize());
  }
}

function enqueueKillTranslation(entry: VocabularyEntry): void {
  if (!hasVisibleKillTranslation(entry, currentKillTranslationSettings())) return;
  if (game.getPhase() !== "playing") return;
  const becameActive = killTranslationQueue.enqueue(entry);
  if (becameActive) renderActiveKillTranslation();
}

const titleOverlay = byId("titleOverlay");
const pauseOverlay = byId("pauseOverlay");
const gameOverOverlay = byId("gameOverOverlay");
const stageClearOverlay = byId("stageClearOverlay");
const settingsDialog = byId<HTMLDialogElement>("settingsDialog");
const vocabularyDialog = byId<HTMLDialogElement>("vocabularyDialog");
const stageSelectDialog = byId<HTMLDialogElement>("stageSelectDialog");
const routeDialog = byId<HTMLDialogElement>("routeDialog");
const restHubDialog = byId<HTMLDialogElement>("restHubDialog");
const dataDialog = byId<HTMLDialogElement>("dataDialog");
const equipmentDialog = byId<HTMLDialogElement>("equipmentDialog");
const shopDialog = byId<HTMLDialogElement>("shopDialog");
const serviceShopDialog =
  byId<HTMLDialogElement>("serviceShopDialog");
const specialShopDialog =
  byId<HTMLDialogElement>("specialShopDialog");
const supportDialog = byId<HTMLDialogElement>("supportDialog");
const hotbarDialog = byId<HTMLDialogElement>("hotbarDialog");
const characterDialog = byId<HTMLDialogElement>("characterDialog");
const codexDialog = byId<HTMLDialogElement>("codexDialog");
const ascensionDialog = byId<HTMLDialogElement>("ascensionDialog");
const progressionDialog =
  byId<HTMLDialogElement>("progressionDialog");
const rewardChoiceDialog =
  byId<HTMLDialogElement>("rewardChoiceDialog");
const anomalyDialog = byId<HTMLDialogElement>("anomalyDialog");

rewardChoiceDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
});
anomalyDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
});

for (const dialog of [
  shopDialog,
  serviceShopDialog,
  specialShopDialog,
]) {
  dialog.addEventListener("close", () => {
    const phase = game.getPhase();
    if (phase === "title") {
      restoreTitleMusic();
    } else if (phase === "stageclear") {
      musicController.transitionTo("VICTORY", 0.35);
      musicController.setPaused(false);
    }
  });
}

type AutosaveSnapshot = {
  campaign: typeof campaign;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  hotbar: HotbarState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  upgrades: UpgradeState;
  relics: RelicState;
  codex: CodexState;
  ascension: AscensionState;
  expansionCurrencies: ExpansionCurrencyState;
  shops: ShopState;
  route: RouteState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
};

const campaignAutosave = new AutosaveQueue<
  AutosaveSnapshot,
  PersistenceSource
>((snapshot, reason) =>
  savePlayerProgress(
    snapshot.campaign,
    snapshot.inventory,
    snapshot.equipment,
    snapshot.supportSpells,
    snapshot.characters,
    reason as SaveReason,
    snapshot.luckPity,
    snapshot.hiddenDiscovery,
    snapshot.credits,
    snapshot.progression,
    snapshot.expansionCurrencies,
    snapshot.campaignExpansion,
    snapshot.checkpointSnapshot,
    snapshot.crashRecoverySnapshot,
    snapshot.stageEntrySnapshot,
    snapshot.shops,
    snapshot.route,
    snapshot.upgrades,
    snapshot.relics,
    snapshot.codex,
    snapshot.ascension,
    snapshot.hotbar,
  ),
);

function currentRunPersistentState(): RunPersistentState {
  return {
    campaign,
    inventory,
    equipment,
    supportSpells,
    characters,
    luckPity,
    hiddenDiscovery,
    credits,
    progression,
    expansionCurrencies,
    shops,
    route,
    upgrades,
    relics,
    ascension,
  };
}

function applyRunPersistentState(state: RunPersistentState): void {
  campaign = state.campaign;
  inventory = state.inventory;
  equipment = state.equipment;
  supportSpells = state.supportSpells;
  characters = state.characters;
  luckPity = state.luckPity;
  hiddenDiscovery = state.hiddenDiscovery;
  credits = state.credits;
  progression = state.progression;
  upgrades = state.upgrades;
  relics = state.relics;
  ascension = state.ascension;
  const restoredAscensionStage = currentAscensionStage(ascension);
  if (restoredAscensionStage !== null) {
    campaign = {
      ...campaign,
      selectedStage: restoredAscensionStage,
    };
  }
  expansionCurrencies = state.expansionCurrencies;
  shops = state.shops;
  route = state.route;
}

function currentAutosaveSnapshot(): AutosaveSnapshot {
  return {
    campaign,
    inventory,
    equipment,
    supportSpells,
    hotbar,
    characters,
    luckPity,
    hiddenDiscovery,
    credits,
    progression,
    upgrades,
    relics,
    codex,
    ascension,
    expansionCurrencies,
    shops,
    route,
    campaignExpansion,
    checkpointSnapshot,
    crashRecoverySnapshot,
    stageEntrySnapshot,
  };
}

function captureSafeCrashRecovery(
  reason: CrashRecoveryReason,
  savedAt = new Date().toISOString(),
): void {
  const captured = captureCrashRecoverySnapshot(
    currentRunPersistentState(),
    campaignExpansion,
    checkpointSnapshot,
    reason,
    savedAt,
  );
  campaignExpansion = captured.campaignExpansion;
  crashRecoverySnapshot = captured.snapshot;
}

function persistRecoveryMirrorSync(
  reason: SaveReason,
  timestamp = new Date().toISOString(),
): void {
  savePlayerRecoveryMirrorSync(
    createPlayerSave(
      campaign,
      timestamp,
      reason,
      inventory,
      equipment,
      supportSpells,
      characters,
      luckPity,
      hiddenDiscovery,
      credits,
      progression,
      expansionCurrencies,
      campaignExpansion,
      checkpointSnapshot,
      crashRecoverySnapshot,
      stageEntrySnapshot,
      shops,
      route,
      upgrades,
      relics,
      codex,
      ascension,
      hotbar,
    ),
  );
}

function markCrashRecoveryDeathInvalid(
  timestamp = new Date().toISOString(),
): void {
  const invalidated = invalidateCrashRecoverySnapshot(
    crashRecoverySnapshot,
    currentRunPersistentState(),
    campaignExpansion,
    checkpointSnapshot,
    timestamp,
  );
  campaignExpansion = invalidated.campaignExpansion;
  crashRecoverySnapshot = invalidated.snapshot;

  try {
    persistRecoveryMirrorSync("gameover", timestamp);
  } catch (error) {
    console.warn(
      "Unable to write synchronous death recovery marker.",
      error,
    );
  }

  campaignAutosave.schedule(
    currentAutosaveSnapshot(),
    "gameover",
  );
  void campaignAutosave.flush("gameover");
}

function refreshPersistentStateUi(): void {
  game.setLuckPityState(luckPity);
  game.setHiddenDiscoveryState(hiddenDiscovery);
  applySelectedCharacter();
  renderPlayerStatusIdentity();
  renderInventory();
  applyEquipmentStats();
  applySupportSpells();
  applyRelicEffects();
  renderCodex();
  renderProgression();
  if (shopDialog.open) renderNormalShop();
  if (serviceShopDialog.open) renderServiceShop();
  if (specialShopDialog.open) renderSpecialShop();
  updateShopAccess();
  updateCampaignUi();
  updateDataSummary();
}

function hudText(id: string, value: string): void {
  hudDomMetrics.attemptedWrites += 1;
  const element = byId(id);
  if (element.textContent === value) return;
  element.textContent = value;
  hudDomMetrics.appliedWrites += 1;
}

function hudWidth(id: string, value: string): void {
  hudDomMetrics.attemptedWrites += 1;
  const element = byId<HTMLElement>(id);
  if (element.style.width === value) return;
  element.style.width = value;
  hudDomMetrics.appliedWrites += 1;
}

function hudClass(id: string, className: string, enabled: boolean): void {
  hudDomMetrics.attemptedWrites += 1;
  const element = byId(id);
  if (element.classList.contains(className) === enabled) return;
  element.classList.toggle(className, enabled);
  hudDomMetrics.appliedWrites += 1;
}

function renderStats(stats: GameStats): void {
  const startedAt = performance.now();
  hudDomMetrics.renderCalls += 1;

  hudText("score", stats.score.toLocaleString());
  hudText("streak", String(stats.streak));
  hudText("multiplier", "x" + String(stats.multiplier));
  hudText(
    "accuracy",
    accuracyPercent(stats.hits, stats.misses).toFixed(1) + "%",
  );
  hudText("kills", String(stats.kills));
  hudText("waveBadge", stageBadgeText(stats.stage));

  hudText(
    "hull",
    String(Math.ceil(stats.hull)) + " / " + String(Math.ceil(stats.maxHull)),
  );
  hudText(
    "shield",
    String(Math.ceil(stats.shield)) + " / " + String(Math.ceil(stats.maxShield)),
  );
  hudText(
    "energyText",
    String(Math.ceil(stats.energy)) +
      " / " +
      String(Math.ceil(stats.maxEnergy)),
  );

  const hullPercent =
    stats.maxHull <= 0 ? 0 : Math.max(0, Math.min(100, stats.hull / stats.maxHull * 100));
  const shieldPercent =
    stats.maxShield <= 0 ? 0 : Math.max(0, Math.min(100, stats.shield / stats.maxShield * 100));
  const energyPercent =
    stats.maxEnergy <= 0 ? 0 : Math.max(0, Math.min(100, stats.energy / stats.maxEnergy * 100));
  hudWidth("hullFill", hullPercent.toFixed(2) + "%");
  hudWidth("hullDamageFill", hullPercent.toFixed(2) + "%");
  hudWidth("shieldFill", shieldPercent.toFixed(2) + "%");
  hudWidth("energyFill", energyPercent.toFixed(2) + "%");
  const playerStatusHud = byId("playerStatusHud");
  if (
    lastHudShield !== null &&
    lastHudShield > 0 &&
    stats.shield <= 0
  ) {
    playerStatusHud.classList.remove("shield-break");
    void playerStatusHud.offsetWidth;
    playerStatusHud.classList.add("shield-break");
    window.setTimeout(
      () => playerStatusHud.classList.remove("shield-break"),
      420,
    );
  }
  lastHudShield = stats.shield;
  hudClass("playerStatusHud", "low-hull", hullPercent <= 25);
  hudClass("playerStatusHud", "energy-low", energyPercent <= 20);

  hudWidth("powerFill", String(stats.power) + "%");
  hudClass("powerFill", "ready", stats.power >= 100);
  const ultimateName = getCharacter(characters.selected).ultimateName;
  hudText(
    "powerHint",
    stats.power >= 100
      ? "RAGE FULL · " + ultimateName + " + NOVA"
      : "RAGE " + Math.floor(stats.power) + "% · " + ultimateName,
  );

  const elapsed = performance.now() - startedAt;
  hudDomMetrics.totalRenderMs += elapsed;
  hudDomMetrics.maxRenderMs = Math.max(hudDomMetrics.maxRenderMs, elapsed);
}

function skillReasonText(reason: SkillBlockReason): string {
  if (reason === "cooldown") return "Skill is cooling down";
  if (reason === "no-charges") return "No charges left this stage";
  if (reason === "stage-limit") return "Stage use limit reached";
  if (reason === "energy") return "Not enough Energy";
  if (reason === "typing-condition") return "Typing condition not met";
  if (reason === "effect-not-needed") return "No useful target or effect right now";
  if (reason === "silenced") return "Skills are temporarily Silenced";
  return "Skill unavailable";
}

function selectedCharacterSkillId(): string | null {
  if (characters.selected === "vanguard") return VANGUARD_ACTIVE_SKILL_ID;
  if (characters.selected === "aegis") return AEGIS_ACTIVE_SKILL_ID;
  if (characters.selected === "volt") return VOLT_ACTIVE_SKILL_ID;
  if (characters.selected === "wraith") return WRAITH_ACTIVE_SKILL_ID;
  if (characters.selected === "fortune") return FORTUNE_ACTIVE_SKILL_ID;
  if (characters.selected === "arsenal") return ARSENAL_ACTIVE_SKILL_ID;
  if (characters.selected === "oracle") return ORACLE_ACTIVE_SKILL_ID;
  if (characters.selected === "bastion") return BASTION_ACTIVE_SKILL_ID;
  if (characters.selected === "reaper") return REAPER_ACTIVE_SKILL_ID;
  if (characters.selected === "celestial") return CELESTIAL_ACTIVE_SKILL_ID;
  if (characters.selected === "zenith") return ZENITH_ACTIVE_SKILL_ID;
  return null;
}

function isCoreCombatSkillId(id: string): id is CombatSkillId {
  return (
    DEFENSIVE_SKILLS.some((skill) => skill.id === id) ||
    OFFENSIVE_SKILLS.some((skill) => skill.id === id)
  );
}

function hotbarSkillId(action: HotbarAction): string | null {
  if (action.kind === "character-skill") {
    return selectedCharacterSkillId();
  }
  return action.kind === "skill" ? action.id : null;
}

function hotbarActionLabel(action: HotbarAction): string {
  if (action.kind === "item") return getItemDefinition(action.id).name;
  if (action.kind === "character-skill") {
    return getCharacter(characters.selected).activeName;
  }
  const definition = game.getSkillDefinition(action.id);
  if (definition !== null) return definition.name;
  if (isSupportSpellId(action.id)) return getSupportSpell(action.id).name;
  return (
    DEFENSIVE_SKILLS.find((skill) => skill.id === action.id)?.name ??
    OFFENSIVE_SKILLS.find((skill) => skill.id === action.id)?.name ??
    action.id
  );
}

function hotbarActionGlyph(action: HotbarAction): string {
  if (action.kind === "item") {
    if (action.id === "repair-kit") return "✚";
    if (action.id === "shield-cell") return "⬡";
    return "⚡";
  }
  if (action.kind === "character-skill") return "★";
  if (action.id === "barrier") return "◈";
  if (action.id === "reflect-field") return "◇";
  if (action.id === "time-shell") return "◷";
  if (action.id === "emergency-repair") return "✦";
  if (action.id === "guardian-drone") return "◆";
  if (action.id === "emp-burst") return "ϟ";
  if (action.id === "chain-lightning") return "↯";
  if (action.id === "mark-of-weakness") return "◎";
  if (action.id === "sanctuary") return "✧";
  if (action.id === "gravity-well") return "◉";
  if (action.id === "cleanse") return "◇";
  return "☄";
}

function hotbarActionStatus(action: HotbarAction): {
  disabled: boolean;
  state: string;
  title: string;
  cooldown: boolean;
} {
  if (action.kind === "item") {
    const count = itemCount(inventory, action.id);
    return {
      disabled: game.getPhase() !== "playing" || count <= 0,
      state: "×" + String(count),
      title: getItemDefinition(action.id).description,
      cooldown: false,
    };
  }

  const skillId = hotbarSkillId(action);
  if (skillId === null) {
    return {
      disabled: true,
      state: "—",
      title: "Skill unavailable for the selected character",
      cooldown: false,
    };
  }

  if (
    action.kind === "skill" &&
    isCoreCombatSkillId(action.id) &&
    upgrades.basicSkills[characters.selected].ranks[action.id] === 0
  ) {
    return {
      disabled: true,
      state: "locked",
      title: "Learn this Basic Skill in Character Select",
      cooldown: false,
    };
  }

  const state = game.getSkillState(skillId);
  const reason = game.canUseSkill(skillId);
  const cooldown = (state?.cooldownRemaining ?? 0) > 0.05;
  const stateText =
    state === null
      ? "—"
      : cooldown
        ? state.cooldownRemaining.toFixed(1) + "s"
        : state.chargesRemaining !== null
          ? "×" + String(state.chargesRemaining)
          : "ready";

  return {
    disabled: reason !== null,
    state: stateText,
    title:
      reason === null
        ? hotbarActionLabel(action)
        : skillReasonText(reason),
    cooldown,
  };
}

type HotbarButtonView = {
  button: HTMLButtonElement;
  glyph: HTMLElement;
  label: HTMLElement;
  state: HTMLElement;
};

let hotbarButtonViews: HotbarButtonView[] | null = null;

function ensureHotbarButtons(): HotbarButtonView[] {
  const root = byId("combatHotbar");
  if (root.children.length !== 9 || hotbarButtonViews === null) {
    root.replaceChildren();
    const views: HotbarButtonView[] = [];
    for (let index = 0; index < 9; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "hotbar-slot hotbar-" + hotbarPlacementForSlot(index);
      button.id = "hotbarSlot" + String(index + 1);
      const key = document.createElement("kbd");
      key.textContent = String(index + 1);
      const glyph = document.createElement("span");
      glyph.className = "hotbar-glyph";
      glyph.textContent = "·";
      const label = document.createElement("span");
      label.className = "hotbar-label";
      label.textContent = "empty";
      const state = document.createElement("strong");
      state.className = "hotbar-state";
      state.textContent = "—";
      button.append(key, glyph, label, state);
      button.addEventListener("click", () => activateHotbarSlot(index));
      root.append(button);
      views.push({ button, glyph, label, state });
    }
    hotbarButtonViews = views;
  }
  return hotbarButtonViews;
}

function renderHotbar(): void {
  const views = ensureHotbarButtons();
  for (let index = 0; index < views.length; index += 1) {
    const view = views[index]!;
    const action = hotbar.slots[index] ?? null;

    if (action === null) {
      const renderKey = "empty";
      if (view.button.dataset.renderKey === renderKey) continue;
      view.button.dataset.renderKey = renderKey;
      view.glyph.textContent = "·";
      view.label.textContent = "empty";
      view.state.textContent = "—";
      view.button.disabled = true;
      view.button.title = "Unassigned hotbar slot";
      view.button.className =
        "hotbar-slot hotbar-" + hotbarPlacementForSlot(index);
      continue;
    }

    const status = hotbarActionStatus(action);
    const kindClass =
      action.kind === "item"
        ? "item"
        : action.kind === "character-skill"
          ? "character"
          : "skill";
    const glyph = hotbarActionGlyph(action);
    const label = hotbarActionLabel(action);
    const renderKey = [
      hotbarActionKey(action),
      glyph,
      label,
      status.state,
      status.disabled ? "disabled" : "enabled",
      status.cooldown ? "cooldown" : "ready",
      status.title,
    ].join("\u0000");
    if (view.button.dataset.renderKey === renderKey) continue;

    view.button.dataset.renderKey = renderKey;
    view.glyph.textContent = glyph;
    view.label.textContent = label;
    view.state.textContent = status.state;
    view.button.disabled = status.disabled;
    view.button.title = status.title;
    view.button.className =
      "hotbar-slot hotbar-" +
      hotbarPlacementForSlot(index) +
      " " +
      kindClass +
      (status.cooldown ? " cooldown" : "");
  }
}

function renderInventory(): void {
  renderHotbar();
}

function renderAllSkills(): void {
  renderHotbar();
}

function useInventoryItem(id: CombatConsumableId): void {
  if (itemCount(inventory, id) <= 0) return;
  if (!game.useConsumable(id)) {
    showNotice("Item cannot be used right now");
    return;
  }

  const removed = removeItem(inventory, id, 1);
  if (removed.changed <= 0) return;

  inventory = removed.inventory;
  renderHotbar();
  void autosaveCampaign("inventory", "✓ Item used · progress saved");
}

function useHotbarSkill(action: HotbarAction): void {
  const skillId = hotbarSkillId(action);
  if (skillId === null) {
    showNotice("Skill unavailable for the selected character");
    return;
  }

  const result = game.useSkill(skillId);
  if (!result.ok) {
    showNotice(skillReasonText(result.reason));
    renderHotbar();
    return;
  }

  showNotice("✓ " + hotbarActionLabel(action) + " activated");
  renderHotbar();
}

function activateHotbarSlot(index: number): void {
  if (game.getPhase() !== "playing") return;
  const action = hotbar.slots[index] ?? null;
  if (action === null) return;
  if (action.kind === "item") {
    useInventoryItem(action.id);
    return;
  }
  useHotbarSkill(action);
}

function hotbarCandidateActions(): HotbarAction[] {
  const actions: HotbarAction[] = [
    ...COMBAT_CONSUMABLE_IDS.map(
      (id): HotbarAction => ({ kind: "item", id }),
    ),
    ...DEFENSIVE_SKILLS.map(
      (skill): HotbarAction => ({
        kind: "skill",
        id: skill.id as DefensiveSkillId,
      }),
    ),
    ...OFFENSIVE_SKILLS.map(
      (skill): HotbarAction => ({
        kind: "skill",
        id: skill.id as OffensiveSkillId,
      }),
    ),
    { kind: "character-skill" },
  ];

  for (const id of supportSpells.loadout) {
    if (id !== null) actions.push({ kind: "skill", id });
  }

  return actions;
}

function hotbarActionFromKey(key: string): HotbarAction | null {
  return hotbarCandidateActions().find(
    (action) => hotbarActionKey(action) === key,
  ) ?? null;
}

function renderHotbarLoadout(): void {
  const candidates = hotbarCandidateActions();
  const roots = [
    byId("hotbarLoadoutGrid"),
    byId("hotbarDialogGrid"),
  ];

  for (const root of roots) {
    root.replaceChildren();

    for (let index = 0; index < 9; index += 1) {
      const row = document.createElement("label");
      row.className = "hotbar-loadout-slot";
      const key = document.createElement("kbd");
      key.textContent = String(index + 1);
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Hotbar slot " + String(index + 1));

      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Empty";
      select.append(empty);

      for (const action of candidates) {
        const option = document.createElement("option");
        option.value = hotbarActionKey(action);
        const coreId =
          action.kind === "skill" && isCoreCombatSkillId(action.id)
            ? action.id
            : null;
        const locked =
          coreId !== null &&
          upgrades.basicSkills[characters.selected].ranks[coreId] === 0;
        option.textContent =
          hotbarActionLabel(action) + (locked ? " · locked" : "");
        option.disabled = locked;
        select.append(option);
      }

      const current = hotbar.slots[index] ?? null;
      select.value = current === null ? "" : hotbarActionKey(current);
      select.disabled = game.getPhase() === "playing";
      select.addEventListener("change", () => {
        const action =
          select.value === "" ? null : hotbarActionFromKey(select.value);
        hotbar = assignHotbarSlot(hotbar, index, action);
        renderHotbar();
        renderHotbarLoadout();
        void autosaveCampaign(
          "hotbar",
          "✓ Hotbar saved · slot " + String(index + 1),
        );
      });

      row.append(key, select);
      root.append(row);
    }
  }
}

function openHotbarSetup(): void {
  if (!persistenceReady) return;
  const phase = game.getPhase();
  if (
    phase !== "title" &&
    phase !== "paused" &&
    phase !== "stageclear"
  ) {
    return;
  }
  renderHotbarLoadout();
  hotbarDialog.showModal();
}

function reconcileHotbarSupportAssignments(): void {
  const equipped = new Set(
    supportSpells.loadout.filter(
      (id): id is SupportSpellId => id !== null,
    ),
  );
  let next = hotbar;
  for (let index = 0; index < next.slots.length; index += 1) {
    const action = next.slots[index];
    if (
      action?.kind === "skill" &&
      isSupportSpellId(action.id) &&
      !equipped.has(action.id)
    ) {
      next = assignHotbarSlot(next, index, null);
    }
  }
  hotbar = next;
}

function renderPlayerStatusIdentity(): void {
  const character = getCharacter(characters.selected);
  const progress = characters.progress[characters.selected];
  byId("playerStatusName").textContent = character.name;
  byId("playerStatusLevel").textContent = "Lv " + String(progress.level);
}

function showNotice(message: string): void {
  if (noticeTimer !== null) window.clearTimeout(noticeTimer);
  const notice = byId("notice");
  notice.textContent = message;
  notice.classList.add("visible");
  noticeTimer = window.setTimeout(() => {
    notice.classList.remove("visible");
    noticeTimer = null;
  }, 2400);
}

function renderPhase(phase: GamePhase): void {
  titleOverlay.classList.toggle("hidden", phase !== "title");
  pauseOverlay.classList.toggle("hidden", phase !== "paused");
  gameOverOverlay.classList.toggle("hidden", phase !== "gameover");
  stageClearOverlay.classList.toggle("hidden", phase !== "stageclear");
  byId("playerStatusHud").classList.toggle("hidden", phase !== "playing");
  byId("combatHotbar").classList.toggle("hidden", phase !== "playing");

  if (phase !== "playing" && phase !== "paused") {
    renderStageEvents([]);
    renderStatuses([]);
    renderBoss(null);
    const typingTextBadge = byId("typingTextBadge");
    typingTextBadge.textContent = "";
    typingTextBadge.classList.add("hidden");
  }

  renderInventory();
  renderAllSkills();
  updateKillTranslationVisibility(phase);
}

function stageBadgeText(stage: number): string {
  const base = "stage " + String(stage).padStart(3, "0");
  if (
    currentStagePhaseDisplay === null ||
    currentStagePhaseStage !== stage
  ) {
    return base;
  }
  return (
    base +
    " · wave " +
    String(currentStagePhaseDisplay.index + 1) +
    "/" +
    String(currentStagePhaseDisplay.count)
  );
}

function renderStage(stage: number): void {
  currentStagePhaseDisplay = null;
  currentStagePhaseStage = stage;
  const badge = byId("waveBadge");
  badge.textContent = stageBadgeText(stage);
  badge.title = "";
  badge.classList.remove("pulse");
  void badge.offsetWidth;
  badge.classList.add("pulse");
}

function renderStagePhase(phase: StagePacingPhase): void {
  currentStagePhaseDisplay = phase;
  const badge = byId("waveBadge");
  const stage = game.getStats().stage;
  currentStagePhaseStage = stage;
  badge.textContent = stageBadgeText(stage);
  badge.title =
    phase.label +
    " · " +
    String(phase.budget) +
    " scheduled enemies in this wave";
  badge.classList.remove("pulse");
  void badge.offsetWidth;
  badge.classList.add("pulse");
}

function renderStageEvents(
  events: readonly StageEventDefinition[],
): void {
  const badge = byId("stageEventBadge");
  if (events.length === 0) {
    badge.textContent = "";
    badge.title = "";
    badge.classList.add("hidden");
    return;
  }

  badge.textContent =
    "EVENT // " + events.map((event) => event.name).join(" · ");
  badge.title = events
    .map((event) => event.name + ": " + event.description)
    .join("\n");
  badge.classList.remove("hidden");
}

function createImportanceMeta(
  presentation: ImportancePresentation,
): HTMLElement {
  const meta = document.createElement("span");
  meta.textContent =
    presentation.icon +
    " " +
    presentation.label +
    " · " +
    presentation.stateLabel;
  meta.style.color = presentation.accent;
  meta.setAttribute(
    "aria-label",
    presentation.label + " · " + presentation.stateLabel,
  );
  return meta;
}

function applyImportanceBorder(
  element: HTMLElement,
  presentation: ImportancePresentation,
): void {
  element.style.borderColor = presentation.accent;
  element.dataset.importance = presentation.label.toLowerCase();
  element.dataset.importanceState =
    presentation.stateLabel.toLowerCase().replaceAll(" ", "-");
}

function renderObjective(
  objective: StageObjectiveState | null,
): void {
  const badge = byId("objectiveBadge");
  if (objective === null) {
    badge.textContent = "";
    badge.title = "";
    badge.style.removeProperty("border-color");
    badge.style.removeProperty("color");
    delete badge.dataset.importance;
    delete badge.dataset.importanceState;
    badge.classList.add("hidden");
    return;
  }

  const presentation = objectiveImportance(
    objective.definition.type,
    objective.definition.required,
    objective.status,
  );
  badge.style.borderColor = presentation.accent;
  badge.style.color = presentation.accent;
  badge.dataset.importance = presentation.label.toLowerCase();
  badge.dataset.importanceState =
    presentation.stateLabel.toLowerCase().replaceAll(" ", "-");
  badge.textContent =
    presentation.icon +
    " OBJECTIVE // " +
    presentation.stateLabel.toUpperCase() +
    " · " +
    objective.definition.label +
    " · " +
    objectiveProgressText(objective);
  badge.title =
    presentation.label +
    " · " +
    presentation.stateLabel +
    " · " +
    objective.definition.label +
    " · reward +" +
    Math.round(objective.definition.rewardFactor * 100) +
    "% base factor";
  badge.classList.remove("hidden");
}

function renderStatuses(
  statuses: readonly ActiveStatus[],
): void {
  const badge = byId("statusBadge");
  if (statuses.length === 0) {
    badge.textContent = "";
    badge.classList.add("hidden");
    return;
  }

  badge.textContent = statuses
    .map(
      (status) =>
        statusLabel(status) +
        " " +
        status.remaining.toFixed(1) +
        "s",
    )
    .join(" · ");
  badge.classList.remove("hidden");
}

let lastMusicBossPhase = 0;

function renderBoss(boss: BossHudState | null): void {
  if (boss === null) {
    lastMusicBossPhase = 0;
    hudClass("bossHud", "hidden", true);
    return;
  }

  if (boss.phase !== lastMusicBossPhase) {
    musicController.setBossPhase(boss.phase);
    lastMusicBossPhase = boss.phase;
  }

  hudClass("bossHud", "hidden", false);
  const mechanicMeta =
    boss.mechanicLabel === undefined
      ? ""
      : " · " +
        boss.mechanicLabel.toUpperCase() +
        (boss.mechanicTimer !== undefined
          ? " " + boss.mechanicTimer.toFixed(1) + "s"
          : boss.mechanicProgress !== undefined
            ? " " + boss.mechanicProgress
            : "");
  hudText(
    "bossName",
    boss.name +
      " · PHASE " +
      String(boss.phase) +
      mechanicMeta +
      (boss.shieldActive ? " · SHIELD" : boss.staggered ? " · STAGGER" : ""),
  );
  hudText(
    "bossHpText",
    Math.max(0, Math.ceil(boss.hp)).toLocaleString() +
      " / " +
      boss.maxHp.toLocaleString(),
  );

  const percent =
    boss.maxHp <= 0
      ? 0
      : Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
  hudWidth("bossHpFill", percent.toFixed(2) + "%");
}

function createEquipmentDropInstanceId(): string {
  equipmentDropCounter += 1;
  return (
    "drop-" +
    Date.now().toString(36) +
    "-" +
    equipmentDropCounter.toString(36)
  );
}

function renderCodex(): void {
  const meta = resolveMetaProgression({
    campaign,
    characters,
    equipment,
    hidden: hiddenDiscovery,
    progression,
    codex,
  });
  const entries = collectionEntries({
    characters,
    equipment,
    hidden: hiddenDiscovery,
    progression,
    codex,
  });

  byId("codexMeta").textContent =
    "Meta Level " +
    String(meta.level) +
    " · " +
    meta.rankName +
    " · " +
    meta.points.toLocaleString() +
    " points" +
    (meta.nextRankAt === null
      ? " · max rank"
      : " · next rank at " + meta.nextRankAt.toLocaleString());

  byId("codexCollectionMeta").textContent =
    String(meta.collectionFound) +
    " / " +
    String(meta.collectionTotal) +
    " collection entries · " +
    String(meta.uniqueStagesCleared) +
    " stages cleared";

  const grid = byId("codexGrid");
  grid.replaceChildren();

  for (const entry of entries) {
    const card = document.createElement("article");
    card.className =
      "codex-entry " + (entry.discovered ? "discovered" : "unknown");

    const presentation = collectionImportance(
      entry.category,
      entry.discovered,
    );
    applyImportanceBorder(card, presentation);

    const category = createImportanceMeta(presentation);
    const title = document.createElement("strong");
    title.textContent = entry.title;

    const description = document.createElement("small");
    description.textContent = entry.description;

    card.title =
      presentation.label +
      " · " +
      presentation.stateLabel +
      (entry.discovered ? " · " + entry.title : "");
    card.append(category, title, description);
    grid.append(card);
  }
}

function openCodex(): void {
  if (!persistenceReady || game.getPhase() !== "title") return;
  renderCodex();
  codexDialog.showModal();
}

function syncProgressionAchievements(): string[] {
  const result = syncAchievements(
    progression,
    campaign,
    hiddenDiscovery,
  );
  progression = result.state;
  return result.newlyUnlocked.map(
    (id) => ACHIEVEMENT_REGISTRY[id].name,
  );
}

function recordShopProgress(): void {
  progression = recordProgressionEvent(progression, {
    type: "shop-purchase",
  });
}

function renderProgression(): void {
  const missionGrid = byId("missionGrid");
  missionGrid.replaceChildren();

  for (const id of MISSION_IDS) {
    const mission = MISSION_REGISTRY[id];
    const progress = missionProgress(progression, id);
    const claimed = progression.claimedMissions.includes(id);
    const claimable = !claimed && missionClaimable(progression, id);
    const presentation = missionImportance(
      id,
      claimed ? "claimed" : claimable ? "claimable" : "active",
    );
    const card = document.createElement("article");
    card.className = "progression-card";
    card.classList.toggle("unlocked", claimable || claimed);
    applyImportanceBorder(card, presentation);

    const importance = createImportanceMeta(presentation);
    const title = document.createElement("strong");
    title.textContent = mission.name;

    const description = document.createElement("small");
    description.textContent = mission.description;

    const meta = document.createElement("span");
    meta.textContent =
      String(progress) +
      " / " +
      String(mission.target);

    const reward = document.createElement("div");
    reward.className = "progression-reward";
    replaceCurrencyChips(
      reward,
      { credits: mission.rewardCredits },
      { signed: true },
    );

    const claim = document.createElement("button");
    claim.type = "button";
    claim.disabled = claimed || !claimable;
    claim.textContent = claimed ? "Claimed" : "Claim reward";
    claim.addEventListener("click", () => {
      const result = claimMission(progression, id);
      if (!result.claimed) return;
      progression = result.state;
      credits = addCredits(credits, result.rewardCredits);
      renderProgression();
      updateDataSummary();
      void autosaveCampaign(
        "progression",
        "✓ Mission reward · +" +
          result.rewardCredits.toLocaleString() +
          " Credits",
        "progression",
      );
    });

    card.title =
      presentation.label + " · " + presentation.stateLabel;
    card.append(importance, title, description, meta, reward, claim);
    missionGrid.append(card);
  }

  const achievementGrid = byId("achievementGrid");
  achievementGrid.replaceChildren();

  for (const id of ACHIEVEMENT_IDS) {
    const definition = ACHIEVEMENT_REGISTRY[id];
    const unlocked = progression.unlockedAchievements.includes(id);
    const presentation = achievementImportance(id, unlocked);
    const card = document.createElement("article");
    card.className =
      "progression-card " + (unlocked ? "unlocked" : "locked");
    applyImportanceBorder(card, presentation);

    const importance = createImportanceMeta(presentation);
    const title = document.createElement("strong");
    title.textContent = unlocked ? definition.name : "???";

    const description = document.createElement("small");
    description.textContent = unlocked
      ? definition.description
      : "Achievement not unlocked yet.";

    card.title =
      presentation.label +
      " · " +
      presentation.stateLabel +
      (unlocked ? " · " + definition.name : "");
    card.append(importance, title, description);
    achievementGrid.append(card);
  }
}

function selectedGameplayStage(): number {
  return currentAscensionStage(ascension) ?? campaign.selectedStage;
}

function renderAscension(): void {
  const button = byId<HTMLButtonElement>("ascensionButton");
  const unlocked = ascension.highestUnlockedTier >= 1;
  button.classList.toggle("hidden", !unlocked);
  button.textContent =
    ascension.selectedTier <= 0
      ? "Ascension · Base"
      : "Ascension · Tier " + String(ascension.selectedTier);

  byId("ascensionMeta").textContent = unlocked
    ? "Unlocked through Tier " +
      String(ascension.highestUnlockedTier) +
      " · selected " +
      (ascension.selectedTier === 0
        ? "Base Campaign"
        : "Tier " +
          String(ascension.selectedTier) +
          " · frontier " +
          String(currentAscensionStage(ascension) ?? 1).padStart(3, "0")) +
      " · replay the same 1000 stages with remixed pressure and boss mutations."
    : "Complete Stage 1000 to unlock Ascension.";

  const grid = byId("ascensionGrid");
  grid.replaceChildren();
  if (!unlocked) return;

  for (let tier = 0; tier <= ascension.highestUnlockedTier; tier += 1) {
    const tierStage =
      tier === 0
        ? campaign.selectedStage
        : ascension.frontierByTier[String(tier)] ?? 1;
    const profile = ascensionProfile(tier, tierStage);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "progression-card";
    card.classList.toggle("selected", tier === ascension.selectedTier);
    const completed =
      tier > 0 && ascension.completedTiers.includes(tier);
    card.disabled = completed;

    const title = document.createElement("strong");
    title.textContent =
      tier === 0
        ? "Base Campaign"
        : "Ascension " +
          String(tier) +
          (completed ? " · COMPLETE" : "");

    const description = document.createElement("small");
    description.textContent =
      tier === 0
        ? "Original 50-World campaign rules."
        : "Rank +" +
          String(profile.enemyRankBonus) +
          " · formation +" +
          String(profile.formationComplexityBonus) +
          " · rewards x" +
          profile.rewardMultiplier.toFixed(2) +
          " · frontier " +
          String(tierStage).padStart(3, "0") +
          " · boss " +
          profile.bossMutations.join(", ");

    card.append(title, description);
    card.addEventListener("click", () => {
      if (tier === ascension.selectedTier) return;
      ascension = selectAscensionTier(ascension, tier);
      const ascensionStage = currentAscensionStage(ascension);
      campaign = {
        ...campaign,
        selectedStage:
          ascensionStage ?? campaign.highestUnlockedStage,
      };
      stageEntrySnapshot = null;
      crashRecoverySnapshot = null;
      checkpointSnapshot = createCheckpointSnapshot(
        currentRunPersistentState(),
        campaignExpansion.checkpoint.stage,
      );
      renderAscension();
      updateCampaignUi();
      ascensionDialog.close();
      void autosaveCampaign(
        "ascension",
        "✓ Ascension selected · " +
          (tier === 0
            ? "Base Campaign"
            : "Tier " +
              String(tier) +
              " · Stage " +
              String(ascensionStage ?? 1).padStart(3, "0")),
        "stage-select",
      );
    });
    grid.append(card);
  }
}

function openAscension(): void {
  if (
    !persistenceReady ||
    game.getPhase() !== "title" ||
    ascension.highestUnlockedTier < 1
  ) {
    return;
  }
  if (!canSwitchAscensionTier(ascension)) {
    showNotice(
      "Ascension tier can change only at a committed 10-stage checkpoint.",
    );
    return;
  }
  renderAscension();
  ascensionDialog.showModal();
}

function openProgression(): void {
  if (!persistenceReady || game.getPhase() !== "title") return;
  syncProgressionAchievements();
  renderProgression();
  progressionDialog.showModal();
}

function hiddenDiscoveryMessage(
  discovery: HiddenContentDefinition,
): string {
  return (
    "✦ Hidden discovery · " +
    discovery.name +
    " · " +
    discovery.unlock.label
  );
}

function renderAnomalyDecision(riskHullRatio: number): void {
  byId("anomalyRiskMeta").textContent =
    "Overload removes " +
    String(Math.round(riskHullRatio * 100)) +
    "% max Hull (cannot reduce Hull below 1) for a stronger reward table.";
}

function renderRewardChoiceOptions(
  options: readonly EquipmentDrop[],
): void {
  const grid = byId("rewardChoiceGrid");
  grid.replaceChildren();

  for (const option of options) {
    const definition = getEquipmentDefinition(option.definitionId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reward-choice-option";

    const grade = document.createElement("span");
    grade.textContent = gradeLabel(option.grade).toUpperCase();

    const name = document.createElement("strong");
    name.textContent = definition.name;

    const description = document.createElement("small");
    description.textContent = definition.description;

    button.append(grade, name, description);
    button.addEventListener("click", () => {
      equipment = addEquipmentInstance(equipment, {
        instanceId: createEquipmentDropInstanceId(),
        definitionId: option.definitionId,
        grade: option.grade,
        enhancement: 0,
      });
      progression = recordProgressionEvent(progression, {
        type: "equipment-drop",
      });
      renderEquipment();
      renderProgression();
      void autosaveCampaign(
        "equipment",
        "✓ Reward selected · " + definition.name,
      );
      rewardChoiceDialog.close();
      game.resume();
    });

    grid.append(button);
  }
}

function renderBossRewardChoiceOptions(
  options: readonly BossRewardChoiceOption[],
): void {
  const grid = byId("rewardChoiceGrid");
  grid.replaceChildren();

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reward-choice-option";

    const kind = document.createElement("span");
    kind.textContent = option.kind.toUpperCase();

    const name = document.createElement("strong");
    const description = document.createElement("small");
    const extra = document.createElement("div");
    extra.className = "reward-choice-extra";

    if (option.kind === "equipment") {
      const definition = getEquipmentDefinition(option.drop.definitionId);
      applyGradeFrame(button, option.drop.grade);
      extra.append(
        createLocalIcon(
          definition.icon,
          definition.name + " icon",
          "reward-choice-icon",
        ),
        createGradeBadge(option.drop.grade),
      );
      name.textContent = definition.name;
      description.textContent = definition.description;
    } else if (option.kind === "relic") {
      const definition = getRelicDefinition(option.relicId);
      applyGradeFrame(button, definition.grade);
      extra.append(createGradeBadge(definition.grade));
      name.textContent = definition.name;
      description.textContent = definition.description;
    } else {
      name.textContent = option.id === "premium-currency"
        ? "Premium Cache"
        : "Boss Cache";
      description.textContent = "Currency reward";
      replaceCurrencyChips(
        extra,
        {
          credits: option.credits,
          alloy: option.currencies.alloy,
          starCrystal: option.currencies.starCrystal,
          quantumCore: option.currencies.quantumCore,
        },
        { signed: true },
      );
    }

    button.classList.add("visual-card");
    button.append(kind, extra, name, description);
    button.addEventListener("click", () => {
      if (option.kind === "equipment") {
        equipment = addEquipmentInstance(equipment, {
          instanceId: createEquipmentDropInstanceId(),
          definitionId: option.drop.definitionId,
          grade: option.drop.grade,
          enhancement: 0,
        });
        progression = recordProgressionEvent(progression, {
          type: "equipment-drop",
        });
      } else if (option.kind === "relic") {
        relics = grantRelic(relics, option.relicId).state;
        applyRelicEffects();
      } else {
        credits = addCredits(credits, option.credits);
        expansionCurrencies = addExpansionCurrencyReward(
          expansionCurrencies,
          option.currencies,
        );
      }

      codex = discoverCodexReward(codex, "boss-choice").state;
      renderEquipment();
      renderProgression();
      renderCodex();
      updateDataSummary();
      rewardChoiceDialog.close();
      game.resume();
      game.resolveBossRewardChoice();
    });

    grid.append(button);
  }
}

function clearDeathRecoveryMarker(): void {
  crashRecoverySnapshot = null;
  campaignExpansion = {
    ...campaignExpansion,
    crashRecovery: null,
  };
}

function checkpointDisplayLabel(): string {
  const checkpointAscensionStage =
    currentAscensionStage(checkpointSnapshot.ascension);
  return checkpointAscensionStage === null
    ? "Stage " +
        String(campaignExpansion.checkpoint.stage).padStart(3, "0")
    : "A" +
        String(checkpointSnapshot.ascension.selectedTier) +
        " Stage " +
        String(checkpointAscensionStage).padStart(3, "0");
}

// A checkpoint is restored automatically when no usable revival choice exists.
// When a recovery item is available, the three navigation buttons are still
// direct actions: they restore the checkpoint only if the player skips the item.
let checkpointRollbackApplied = false;
let checkpointRollbackSaved = false;
let checkpointRollbackPromise: Promise<boolean> | null = null;
let deathNavigationPending = false;

function setDeathNavigationDisabled(pending: boolean): void {
  byId<HTMLButtonElement>("againButton").disabled = pending;
  byId<HTMLButtonElement>("gameOverStageSelectButton").disabled =
    pending || currentAscensionStage(checkpointSnapshot.ascension) !== null;
  byId<HTMLButtonElement>("resultTitleButton").disabled = pending;
}

function renderDeathProtectionChoices(failedStage: number): boolean {
  const anchorCount = itemCount(inventory, "salvage-anchor");
  const revivalCount = itemCount(inventory, "stage-revival-core");
  const phoenixCount = itemCount(inventory, "phoenix-core");
  const validStageEntry =
    stageEntrySnapshot !== null &&
    stageEntrySnapshot.stage === failedStage;
  const hasProtection = hasUsableDeathProtection({
    salvageAnchors: anchorCount,
    stageRevivalCores: revivalCount,
    phoenixCores: phoenixCount,
    hasValidStageEntry: validStageEntry,
  });

  byId("salvageAnchorButton").textContent =
    "Salvage Anchor · " + String(anchorCount);
  byId("stageRevivalButton").textContent =
    "Stage Revival Core · " + String(revivalCount);
  byId("phoenixCoreButton").textContent =
    "Phoenix Core · " + String(phoenixCount);
  byId("deathProtectionActions").classList.toggle("hidden", !hasProtection);
  byId<HTMLButtonElement>("salvageAnchorButton").disabled =
    anchorCount <= 0;
  byId<HTMLButtonElement>("stageRevivalButton").disabled =
    revivalCount <= 0 || !validStageEntry;
  byId<HTMLButtonElement>("phoenixCoreButton").disabled =
    phoenixCount <= 0 || !validStageEntry;

  const checkpointLabel = checkpointDisplayLabel();
  byId("againButton").textContent = "Replay " + checkpointLabel;
  byId("gameOverStageSelectButton").textContent = "Choose unlocked stage";
  byId("resultTitleButton").textContent = "Main menu";
  setDeathNavigationDisabled(false);

  byId("deathProtectionMeta").textContent = hasProtection
    ? "Defeated at Stage " +
      String(failedStage).padStart(3, "0") +
      " · use a revival item, or choose a destination to return to " +
      checkpointLabel +
      ". Items are consumed only when selected."
    : "Defeated at Stage " +
      String(failedStage).padStart(3, "0") +
      " · restoring " +
      checkpointLabel +
      " automatically…";
  return hasProtection;
}

async function persistResolvedDeath(
  message: string,
): Promise<boolean> {
  clearDeathRecoveryMarker();
  return autosaveCampaign(
    "gameover",
    message,
    "manual",
  );
}

/** One in-flight rollback protects the death state from rapid repeated clicks. */
async function ensureCheckpointRollback(): Promise<boolean> {
  if (checkpointRollbackSaved) return true;
  if (checkpointRollbackPromise !== null) return checkpointRollbackPromise;

  const rollback = (async (): Promise<boolean> => {
    if (!checkpointRollbackApplied) {
      const restored = restoreCheckpointSnapshot(
        checkpointSnapshot,
        currentRunPersistentState(),
      );
      applyRunPersistentState(restored);
      campaignExpansion = rollbackCampaignExpansion(
        campaignExpansion,
        new Date().toISOString(),
      );
      stageEntrySnapshot = null;
      checkpointRollbackApplied = true;
      refreshPersistentStateUi();
    }

    // Reviving the failed encounter is no longer possible once rollback
    // starts; never leave stale consumable buttons enabled while saving.
    byId("deathProtectionActions").classList.add("hidden");
    setDeathNavigationDisabled(true);

    const saved = await persistResolvedDeath(
      "✓ Checkpoint restored · " + checkpointDisplayLabel(),
    );
    if (saved) {
      checkpointRollbackSaved = true;
      byId("deathProtectionMeta").textContent =
        "Checkpoint " +
        checkpointDisplayLabel() +
        " restored. Choose where to go next.";
    } else {
      byId("deathProtectionMeta").textContent =
        "Could not save the restored checkpoint. Choose an action to retry saving.";
    }
    setDeathNavigationDisabled(false);
    return saved;
  })();

  checkpointRollbackPromise = rollback;
  try {
    return await rollback;
  } finally {
    if (checkpointRollbackPromise === rollback) {
      checkpointRollbackPromise = null;
    }
  }
}

async function resolveCheckpointDeath(
  action: "retry" | "stage-select" | "title",
): Promise<void> {
  if (game.getPhase() !== "gameover" || deathNavigationPending) return;
  deathNavigationPending = true;
  try {
    if (!(await ensureCheckpointRollback())) return;

    // The rollback changes persistence, not Game's gameover phase.
    // Exit gameover before requesting an encounter or opening Stage Select.
    game.backToTitle();
    if (action === "retry") {
      await startSelectedStage();
      if (routeDialog.open) {
        showNotice("Choose a route, then press Start Encounter");
      }
    } else if (action === "stage-select") {
      openStageSelect();
    }
  } finally {
    deathNavigationPending = false;
  }
}

async function resolveSalvageAnchorDeath(): Promise<void> {
  if (game.getPhase() !== "gameover") return;

  const result = resolveSalvageAnchor(
    currentRunPersistentState(),
    campaignExpansion,
    checkpointSnapshot,
    new Date().toISOString(),
  );
  if (!result.applied) {
    renderDeathProtectionChoices(game.getStats().stage);
    return;
  }

  applyRunPersistentState(result.state);
  campaignExpansion = result.campaignExpansion;
  checkpointSnapshot = result.checkpointSnapshot;
  stageEntrySnapshot = null;
  refreshPersistentStateUi();

  const saved = await persistResolvedDeath(
    "✓ Salvage Anchor consumed · gains preserved · checkpoint " +
      checkpointDisplayLabel(),
  );
  if (saved) await startSelectedStage();
}

async function resolveStageRevivalDeath(): Promise<void> {
  if (game.getPhase() !== "gameover") return;

  const result = resolveStageRevivalCore(
    currentRunPersistentState(),
    stageEntrySnapshot,
  );
  if (result === null || !result.applied) {
    renderDeathProtectionChoices(game.getStats().stage);
    return;
  }

  applyRunPersistentState(result.state);
  campaignExpansion = result.campaignExpansion;
  checkpointSnapshot = result.checkpointSnapshot;
  stageEntrySnapshot = result.stageEntrySnapshot;
  refreshPersistentStateUi();

  const saved = await persistResolvedDeath(
    "✓ Stage Revival Core consumed · restarting Stage " +
      String(campaign.selectedStage).padStart(3, "0"),
  );
  if (saved) await startSelectedStage();
}

async function resolvePhoenixDeath(): Promise<void> {
  if (
    game.getPhase() !== "gameover" ||
    stageEntrySnapshot === null ||
    itemCount(inventory, "phoenix-core") <= 0
  ) {
    return;
  }

  if (!game.reviveCurrentEncounter()) return;

  const activeResult = consumePhoenixCore(
    currentRunPersistentState(),
  );
  if (!activeResult.applied) return;
  applyRunPersistentState(activeResult.state);

  const entryResult = consumePhoenixCore(
    stageEntrySnapshot.state,
  );
  const safeEntryState = entryResult.applied
    ? entryResult.state
    : stageEntrySnapshot.state;
  const safeEntry = createStageEntrySnapshot(
    safeEntryState,
    stageEntrySnapshot.campaignExpansion,
    stageEntrySnapshot.checkpointSnapshot,
    stageEntrySnapshot.capturedAt,
  );
  stageEntrySnapshot = safeEntry;

  const captured = captureCrashRecoverySnapshot(
    safeEntry.state,
    safeEntry.campaignExpansion,
    safeEntry.checkpointSnapshot,
    "stage-entry",
    new Date().toISOString(),
  );
  crashRecoverySnapshot = captured.snapshot;
  campaignExpansion = {
    ...campaignExpansion,
    crashRecovery: captured.campaignExpansion.crashRecovery,
  };

  renderInventory();
  updateDataSummary();
  void autosaveCampaign(
    "gameover",
    "✓ Phoenix Core consumed · encounter resumed",
  );
}

type WordReviewFilter = "all" | "perfect" | "corrected" | "missed";

let latestStageSession: StageSessionSnapshot | null = null;
let wordReviewFilter: WordReviewFilter = "all";

function formatStageDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return String(minutes) + ":" + String(total % 60).padStart(2, "0");
}

function appendResultMetric(
  root: HTMLElement,
  label: string,
  value: string,
  detail?: string,
): void {
  const card = document.createElement("div");
  const name = document.createElement("span");
  name.textContent = label;
  const amount = document.createElement("strong");
  amount.textContent = value;
  card.append(name, amount);
  if (detail !== undefined && detail.length > 0) {
    const note = document.createElement("small");
    note.textContent = detail;
    card.append(note);
  }
  root.append(card);
}

function renderWordReview(snapshot: StageSessionSnapshot): void {
  latestStageSession = snapshot;
  const list = byId("wordReviewList");
  list.replaceChildren();

  const groups = snapshot.wordGroups.filter((group) => {
    if (wordReviewFilter === "perfect") return group.perfect > 0;
    if (wordReviewFilter === "corrected") return group.corrected > 0;
    if (wordReviewFilter === "missed") return group.missed > 0;
    return true;
  });

  byId("wordReviewCount").textContent =
    "(" + snapshot.wordAttempts.length + " stored attempts" +
    (snapshot.wordAttemptsTruncated > 0
      ? " · " + snapshot.wordAttemptsTruncated + " omitted after safety cap"
      : "") +
    " · " + snapshot.wordGroups.length + " unique)";

  for (const button of byId("wordReviewTabs").querySelectorAll<HTMLButtonElement>(
    "button[data-word-filter]",
  )) {
    const filter = button.dataset.wordFilter as WordReviewFilter;
    button.classList.toggle("active", filter === wordReviewFilter);
    button.onclick = () => {
      wordReviewFilter = filter;
      if (latestStageSession !== null) renderWordReview(latestStageSession);
    };
  }

  if (groups.length === 0) {
    const empty = document.createElement("p");
    empty.className = "word-review-empty";
    empty.textContent = "No word attempts in this category.";
    list.append(empty);
    return;
  }

  for (const group of groups) {
    const row = document.createElement("article");
    row.className = "word-review-row";

    const learning = document.createElement("div");
    const word = document.createElement("strong");
    word.textContent = group.en;
    const ipa = document.createElement("span");
    ipa.textContent = group.ipa || "IPA unavailable";
    const meaning = document.createElement("span");
    meaning.textContent = group.vi || "Vietnamese meaning unavailable";
    learning.append(word, ipa, meaning);

    const outcomes = document.createElement("div");
    outcomes.className = "word-review-outcomes";
    const chips: Array<[string, number, StageWordOutcome]> = [
      ["Perfect", group.perfect, "perfect"],
      ["Corrected", group.corrected, "corrected"],
      ["Missed", group.missed, "missed"],
      ["Skill kill", group.skillKilled, "skill-kill"],
      ["Interrupted", group.interrupted, "interrupted"],
    ];
    for (const [label, count, outcome] of chips) {
      if (count <= 0) continue;
      const chip = document.createElement("span");
      chip.dataset.outcome = outcome;
      chip.textContent = label + " ×" + String(count);
      outcomes.append(chip);
    }

    const meta = document.createElement("small");
    meta.textContent =
      String(group.occurrences) + " occurrence" +
      (group.occurrences === 1 ? "" : "s") +
      " · " + String(group.correctKeys) + " correct target keys" +
      (group.wrongKeys > 0
        ? " · " + String(group.wrongKeys) + " wrong"
        : "");

    row.append(learning, outcomes, meta);
    list.append(row);
  }
}

function renderMeasuredStageSession(
  snapshot: StageSessionSnapshot,
  totalCorrectInputs: number,
  totalWrongInputs: number,
): void {
  const combat = byId("clearCombatMetrics");
  combat.replaceChildren();
  const killTotal =
    snapshot.regularKills + snapshot.eliteKills + snapshot.bossKills;
  appendResultMetric(
    combat,
    "Enemies resolved",
    String(snapshot.enemiesResolved) + " / " + String(snapshot.enemiesSpawned),
    String(snapshot.enemyEscapes) + " escaped",
  );
  appendResultMetric(combat, "Regular kills", String(snapshot.regularKills));
  appendResultMetric(combat, "Elite kills", String(snapshot.eliteKills));
  appendResultMetric(combat, "Boss kills", String(snapshot.bossKills));
  appendResultMetric(
    combat,
    "Projectile defense",
    String(snapshot.hostileBulletsIntercepted) + " intercepted",
    String(snapshot.hostileBulletsHit) + " hit the player",
  );
  appendResultMetric(
    combat,
    "Damage taken",
    snapshot.damageTaken.toFixed(0),
    snapshot.shieldAbsorbed.toFixed(0) + " absorbed by Shield · " +
      String(snapshot.hitsTaken) + " damaging hits",
  );
  appendResultMetric(combat, "Skills used", String(snapshot.skillsUsed));
  appendResultMetric(combat, "Consumables", String(snapshot.consumablesUsed));
  appendResultMetric(combat, "Nova / Ultimate", String(snapshot.novaUses));
  appendResultMetric(
    combat,
    "Bonus targets",
    String(snapshot.bonusCollected) + " collected",
    String(snapshot.bonusMissed) + " expired",
  );
  appendResultMetric(combat, "Measured kills", String(killTotal));

  const typing = byId("clearTypingMetrics");
  typing.replaceChildren();
  appendResultMetric(typing, "Correct inputs", String(totalCorrectInputs));
  appendResultMetric(typing, "Wrong inputs", String(totalWrongInputs));
  appendResultMetric(
    typing,
    "Corrected errors",
    String(snapshot.correctedErrors),
    "wrong target keys on attempts later completed",
  );
  appendResultMetric(
    typing,
    "Hostile target keys",
    String(snapshot.correctWordKeys) + " correct",
    String(snapshot.wrongWordKeys) + " wrong",
  );
  appendResultMetric(typing, "Words completed", String(snapshot.wordsCompleted));
  appendResultMetric(typing, "Perfect words", String(snapshot.perfectWords));
  appendResultMetric(typing, "Corrected words", String(snapshot.correctedWords));
  appendResultMetric(typing, "Missed words", String(snapshot.missedWords));
  appendResultMetric(
    typing,
    "Skill-killed words",
    String(snapshot.skillKilledWords),
    "not counted as typing mistakes",
  );
  appendResultMetric(
    typing,
    "Interrupted boss words",
    String(snapshot.interruptedWords),
  );
  appendResultMetric(
    typing,
    "Perfect Word Chain",
    String(snapshot.maxPerfectWordChain),
    "independent from Key Streak",
  );

  renderWordReview(snapshot);
}

function renderGameOverMeasured(snapshot: StageSessionSnapshot): void {
  const root = byId("gameOverMeasured");
  root.replaceChildren();
  appendResultMetric(root, "Active time", formatStageDuration(snapshot.elapsedSeconds));
  appendResultMetric(
    root,
    "Enemies resolved",
    String(snapshot.enemiesResolved) + " / " + String(snapshot.enemiesSpawned),
  );
  appendResultMetric(root, "Damage taken", snapshot.damageTaken.toFixed(0));
  appendResultMetric(root, "Hits taken", String(snapshot.hitsTaken));
  appendResultMetric(root, "Words completed", String(snapshot.wordsCompleted));
  appendResultMetric(root, "Perfect Word Chain", String(snapshot.maxPerfectWordChain));
  appendResultMetric(root, "Skills / Nova", String(snapshot.skillsUsed) + " / " + String(snapshot.novaUses));
}

const game = new Game(
  byId<HTMLCanvasElement>("gameCanvas"),
  [],
  settings,
  {
    onStats: renderStats,
    onPhase: (phase) => {
      renderPhase(phase);

      if (phase === "paused") {
        musicController.setPaused(true);
      } else if (phase === "playing") {
        const hidden = currentHiddenEncounterState().active;
        if (hidden !== null) {
          musicController.setPaused(false);
          musicController.transitionTo(
            hiddenMusicState(hidden.kind),
            musicCrossfadeSeconds(hiddenMusicState(hidden.kind)),
          );
        } else {
          syncCombatMusic(game.getStats().stage);
        }
      } else if (phase === "stageclear") {
        musicController.setPaused(false);
        musicController.transitionTo("VICTORY", 0.35);
      } else if (phase === "title") {
        restoreTitleMusic();
      }

      if (phase === "gameover") {
        musicController.setPaused(false);
        musicController.transitionTo("DEFEAT", 0.35);
        const stats = game.getStats();
        const stageSession = game.getStageSessionSnapshot();
        byId("resultScore").textContent = stats.score.toLocaleString();
        byId("resultWave").textContent =
          String(stats.stage).padStart(3, "0");
        byId("resultAccuracy").textContent =
          accuracyPercent(
            stageSession.correctWordKeys,
            stageSession.wrongWordKeys,
          ).toFixed(1) + "%";
        byId("resultStreak").textContent = String(stats.maxStreak);
        renderGameOverMeasured(stageSession);

        checkpointRollbackApplied = false;
        checkpointRollbackSaved = false;
        checkpointRollbackPromise = null;
        deathNavigationPending = false;

        const deathAt = new Date().toISOString();
        markCrashRecoveryDeathInvalid(deathAt);
        const hasProtection = renderDeathProtectionChoices(stats.stage);
        if (!hasProtection) {
          // Let the death event finish before applying the rollback. Keep the
          // result overlay visible so the player can still review the run.
          void Promise.resolve().then(() => ensureCheckpointRollback());
        }
      }
    },
    onStage: (stage) => {
      renderStage(stage);
      codex = discoverCodexWorld(codex, worldForStage(stage).id).state;
    },
    onStagePhase: (phase) => {
      renderStagePhase(phase);
      syncStagePhaseMusic(phase);
    },
    onStageEvents: renderStageEvents,
    onObjectiveUpdate: renderObjective,
    onStatuses: renderStatuses,
    onBossUpdate: renderBoss,
    onSkills: renderAllSkills,
    onStageClear: (stats) => {
      const stageSession = game.getStageSessionSnapshot();
      const wpm = stageWordsPerMinute(
        stageSession.correctWordKeys,
        stageSession.elapsedSeconds,
      );
      const accuracy = accuracyPercent(
        stageSession.correctWordKeys,
        stageSession.wrongWordKeys,
      );
      const activeHidden = currentHiddenEncounterState().active;
      if (activeHidden !== null) {
        handleHiddenEncounterClear(
          activeHidden,
          stats,
          wpm,
          accuracy,
        );
        return;
      }

      difficultySettings = recordDifficultyResult(
        difficultySettings,
        wpm,
        accuracy,
      );
      saveDifficultySettings();

      const clearedAt = new Date().toISOString();
      campaign = recordStageClear(campaign, stats.stage, {
        score: stats.score,
        accuracy,
        wpm,
        clearedAt,
      });
      if (ascension.selectedTier === 0) {
        route = syncRouteStateForStage(
          route,
          campaign.highestUnlockedStage,
        );
      }

      const characterUnlock = unlockCharactersForStage(
        characters,
        stats.stage,
      );
      characters = characterUnlock.state;

      const activeCharacterId = characters.selected;
      const progressAward = awardCharacterProgress(
        characters.progress[activeCharacterId],
        {
          stage: stats.stage,
          accuracy,
          wpm,
        },
      );
      characters = updateCharacterProgress(
        characters,
        activeCharacterId,
        progressAward.progress,
      );
      renderPlayerStatusIdentity();

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
            getCharacter(activeCharacterId).name +
            " Lv " +
            String(progressAward.progress.level) +
            " · Mastery " +
            String(progressAward.progress.mastery)
          : "";
      const difficultyRewardMultiplier =
        activeStageDifficulty?.rewardMultiplier ?? 1;
      const objective = game.getStageObjective();
      const objectiveBonusFactor =
        activeStageDifficulty === null
          ? 0
          : objectiveRewardFactor(
              objective,
              activeStageDifficulty,
            );
      const combinedRewardMultiplier =
        difficultyRewardMultiplier *
        (1 + objectiveBonusFactor);
      const baseCreditReward =
        stageClearCreditReward({
          stage: stats.stage,
          accuracy,
          salvage: game.getPlayerStats().salvage,
        }) *
        game.getCreditsMultiplier() *
        combinedRewardMultiplier;
      const performance =
        activeStageDifficulty === null
          ? null
          : performanceReward({
              stats,
              accuracy,
              wpm,
              difficulty: activeStageDifficulty,
              objectiveComplete: objective?.status === "complete",
            });
      const performanceCredits =
        performance === null
          ? 0
          : performance.credits * difficultyRewardMultiplier;
      let totalCreditReward =
        baseCreditReward + performanceCredits;
      credits = addCredits(credits, totalCreditReward);

      const stageConfig = createStageConfig(stats.stage);
      const baseCurrencyReward = scaleExpansionCurrencyReward(
        stageClearExpansionCurrencyReward(
          stats.stage,
          stageConfig.role,
          accuracy,
        ),
        combinedRewardMultiplier,
      );
      let totalCurrencyReward = baseCurrencyReward;
      expansionCurrencies = addExpansionCurrencyReward(
        expansionCurrencies,
        baseCurrencyReward,
      );

      if (performance !== null) {
        const performanceCurrencies =
          scaleExpansionCurrencyReward(
            performance.currencies,
            difficultyRewardMultiplier,
          );
        expansionCurrencies = addExpansionCurrencyReward(
          expansionCurrencies,
          performanceCurrencies,
        );
        totalCurrencyReward = addExpansionCurrencyReward(
          totalCurrencyReward,
          performanceCurrencies,
        );
        for (const id of performance.earned) {
          codex = discoverCodexReward(
            codex,
            ("performance-" + id) as CodexRewardId,
          ).state;
        }
      }
      const performanceText =
        performance === null
          ? ""
          : performanceRewardText(performance);
      const objectiveText =
        objective?.status === "complete"
          ? " · Objective +" +
            Math.round(objectiveBonusFactor * 100) +
            "%"
          : objective?.status === "failed"
            ? " · Objective failed"
            : "";
      progression = recordProgressionEvent(progression, {
        type: "stage-clear",
        accuracy,
      });
      const achievementNames = syncProgressionAchievements();
      const achievementText =
        achievementNames.length > 0
          ? " · Achievement: " + achievementNames.join(", ")
          : "";

      const completedTier = ascension.selectedTier;
      const ascensionResult = advanceAscensionOnStageClear(
        ascension,
        stats.stage,
      );
      ascension = ascensionResult.state;
      const nextAscensionStage = currentAscensionStage(ascension);
      if (completedTier > 0) {
        campaign = {
          ...campaign,
          selectedStage:
            nextAscensionStage ?? campaign.highestUnlockedStage,
        };
      }

      let ascensionText = "";
      if (completedTier === 0 && ascensionResult.unlockedTier === 1) {
        ascensionText = " · Ascension 1 unlocked";
      } else if (
        completedTier > 0 &&
        ascensionResult.newlyCompleted
      ) {
        const reward = ascensionCompletionReward(completedTier);
        credits = addCredits(credits, reward.credits);
        expansionCurrencies = addExpansionCurrencyReward(
          expansionCurrencies,
          reward.currencies,
        );
        totalCreditReward += reward.credits;
        totalCurrencyReward = addExpansionCurrencyReward(
          totalCurrencyReward,
          reward.currencies,
        );
        ascensionText =
          " · Ascension " +
          String(completedTier) +
          " complete" +
          (ascensionResult.unlockedTier === null
            ? " · all tiers complete"
            : " · Tier " +
              String(ascensionResult.unlockedTier) +
              " unlocked");
      }

      let checkpointCommitted = ascensionResult.checkpointCommitted;
      if (completedTier === 0) {
        const expansionResult =
          advanceCampaignExpansionOnStageClear(
            campaignExpansion,
            campaign,
            stats.stage,
            clearedAt,
          );
        campaignExpansion = expansionResult.state;
        checkpointCommitted = expansionResult.checkpointCommitted;
      } else if (checkpointCommitted) {
        campaignExpansion = {
          ...campaignExpansion,
          crashRecovery: null,
        };
      }

      const sectorRelic = checkpointCommitted
        ? grantRelicReward(
            stats.stage,
            completedTier > 0
              ? "ascension:" +
                  String(completedTier) +
                  ":sector:" +
                  String(stats.stage)
              : "sector:" + String(stats.stage),
          )
        : null;
      let sectorRewardText = "";
      if (checkpointCommitted) {
        if (completedTier === 0) {
          shops = markRestHubPending(shops, stats.stage);
        }
        const sectorReward = sectorCheckpointReward(stats.stage);
        const ascensionRewardMultiplier =
          activeStageDifficulty?.ascensionRewardMultiplier ?? 1;
        const sectorCredits = Math.round(
          sectorReward.credits * ascensionRewardMultiplier,
        );
        const sectorCurrencies = scaleExpansionCurrencyReward(
          sectorReward.currencies,
          ascensionRewardMultiplier,
        );
        credits = addCredits(credits, sectorCredits);
        expansionCurrencies = addExpansionCurrencyReward(
          expansionCurrencies,
          sectorCurrencies,
        );
        totalCreditReward += sectorCredits;
        totalCurrencyReward = addExpansionCurrencyReward(
          totalCurrencyReward,
          sectorCurrencies,
        );
        codex = discoverCodexReward(codex, "sector-cache").state;
        sectorRewardText =
          " · Sector +" +
          sectorCredits.toLocaleString() +
          " Credits";
        checkpointSnapshot = createCheckpointSnapshot(
          currentRunPersistentState(),
          campaignExpansion.checkpoint.stage,
        );
      }
      stageEntrySnapshot = null;
      const currencyRewardText =
        expansionCurrencyRewardText(totalCurrencyReward);
      const checkpointText = checkpointCommitted
        ? completedTier > 0
          ? " · Ascension A" +
            String(completedTier) +
            " checkpoint " +
            String(stats.stage).padStart(3, "0") +
            " committed" +
            sectorRewardText +
            relicRewardText(sectorRelic)
          : " · Checkpoint " +
            String(campaignExpansion.checkpoint.stage).padStart(3, "0") +
            " committed" +
            sectorRewardText +
            relicRewardText(sectorRelic)
        : "";

      void autosaveCampaign(
        "stage-clear",
        "✓ Saved · Stage " +
          String(stats.stage).padStart(3, "0") +
          " cleared" +
          unlockText +
          progressText +
          " · +" +
          totalCreditReward.toLocaleString() +
          " Credits" +
          (currencyRewardText.length > 0
            ? " · " + currencyRewardText
            : "") +
          objectiveText +
          (performanceText.length > 0
            ? " · Performance: " + performanceText
            : "") +
          achievementText +
          ascensionText +
          checkpointText,
        "stage-clear",
      ).then((saved) => {
        if (saved && pendingRestHubStage(shops) === stats.stage) {
          openRestHub();
        }
      });

      const world = worldForStage(stats.stage);
      const rating = stageResultStars(
        accuracy,
        objective?.status ?? null,
      );
      const measuredKills =
        stageSession.regularKills +
        stageSession.eliteKills +
        stageSession.bossKills;
      const killRate =
        stageSession.elapsedSeconds <= 0
          ? 0
          : measuredKills / stageSession.elapsedSeconds * 60;

      byId("clearTitle").textContent =
        "Stage " + String(stats.stage).padStart(3, "0") + " complete";
      byId("clearMeta").textContent =
        world.name + " · " +
        stageRole(stats.stage).replaceAll("-", " ") + " · " +
        difficultySettings.mode.toUpperCase();
      byId("clearStars").textContent =
        "★".repeat(rating.stars) + "☆".repeat(3 - rating.stars);
      byId("clearStarRule").textContent =
        "1★ clear · 2★ ≥90% target accuracy · 3★ " +
        rating.thirdStarRule;
      byId("clearScore").textContent = stats.score.toLocaleString();
      byId("clearAccuracy").textContent = accuracy.toFixed(1) + "%";
      byId("clearWpm").textContent = wpm.toFixed(0);
      byId("clearTime").textContent =
        formatStageDuration(stageSession.elapsedSeconds);
      byId("clearKillRate").textContent =
        killRate.toFixed(1) + "/min";
      wordReviewFilter = "all";
      renderMeasuredStageSession(stageSession, stats.hits, stats.misses);
      // Use distinct compact currency badges rather than a long wrapped line
      // that makes the entire results card unusually tall.
      const rewardContainer = byId("clearCredits");
      replaceCurrencyChips(
        rewardContainer,
        {
          credits: totalCreditReward,
          alloy: totalCurrencyReward.alloy,
          starCrystal: totalCurrencyReward.starCrystal,
          quantumCore: totalCurrencyReward.quantumCore,
        },
        {
          signed: true,
          className: "stage-reward-chips",
        },
      );
      byId("clearDetails").textContent =
        [objectiveText, performanceText ? "Performance: " + performanceText : "",
          ascensionText, checkpointText]
          .filter(Boolean).join(" · ").replace(/^\s*·\s*/, "");
      byId("clearStreak").textContent = String(stats.maxStreak);

      const characterProgressPanel = byId("clearCharacterProgress");
      characterProgressPanel.replaceChildren();
      const xpTitle = document.createElement("strong");
      xpTitle.textContent =
        getCharacter(activeCharacterId).name +
        " · Lv " + progressAward.previousLevel +
        (progressAward.levelUps > 0
          ? " → " + progressAward.progress.level
          : "") +
        " · +" + progressAward.xpGained + " XP";
      const xpTrack = document.createElement("progress");
      const atMaxLevel = progressAward.progress.level >= MAX_CHARACTER_LEVEL;
      xpTrack.max = atMaxLevel
        ? 1
        : xpNeededForLevel(progressAward.progress.level);
      xpTrack.value = atMaxLevel ? 1 : progressAward.progress.xp;
      xpTrack.setAttribute("aria-label", "Character XP");
      const xpDetail = document.createElement("span");
      const previousAtMax =
        progressAward.previousLevel >= MAX_CHARACTER_LEVEL;
      const previousTarget = previousAtMax
        ? 1
        : xpNeededForLevel(progressAward.previousLevel);
      const previousXpText = previousAtMax
        ? "MAX"
        : String(progressAward.previousXp) + " / " +
          String(previousTarget);
      const nextXpText = atMaxLevel
        ? "MAX"
        : String(progressAward.progress.xp) + " / " +
          String(xpNeededForLevel(progressAward.progress.level));
      xpDetail.textContent =
        "XP " + previousXpText + " → " + nextXpText;
      characterProgressPanel.append(xpTitle, xpTrack, xpDetail);
      if (progressAward.levelUps > 0) {
        const gainedStats = document.createElement("p");
        gainedStats.className = "clear-auto-stats";
        gainedStats.textContent = "Automatic growth · " +
          CORE_STAT_KEYS.map((key) =>
            key.charAt(0).toUpperCase() + key.slice(1) + " +" +
            progressAward.autoStatGains[key].toFixed(
              key === "luck" || key === "salvage" ? 3 : 2,
            ),
          ).join(" · ");
        characterProgressPanel.append(gainedStats);
      }
      const basicAwardNotice = document.createElement("span");
      const currentBasicPoints = basicSkillPoints(
        progressAward.progress.level,
        upgrades.basicSkills[activeCharacterId],
      );
      basicAwardNotice.textContent =
        "+" + progressAward.levelUps + " Basic Skill Points · " +
        currentBasicPoints.available + " available (Talent Points separate)";
      characterProgressPanel.append(basicAwardNotice);
      if (progressAward.masteryUps > 0) {
        const masteryNotice = document.createElement("span");
        masteryNotice.textContent =
          "Mastery " + progressAward.previousMastery +
          " → " + progressAward.progress.mastery +
          " (separate from character level)";
        characterProgressPanel.append(masteryNotice);
      }

      // Rewards above use the stats earned DURING this stage. New level
      // bonuses take effect after reward calculation and before the next stage.
      if (progressAward.levelUps > 0 || progressAward.masteryUps > 0) {
        applyEquipmentStats();
      }
      updateCampaignUi();
    },
    onWordComplete: (entry) => {
      speakEnglish(entry.en, settings);
    },
    onKillTranslation: enqueueKillTranslation,
    onEquipmentDrop: (drop) => {
      const definition = getEquipmentDefinition(drop.definitionId);
      equipment = addEquipmentInstance(equipment, {
        instanceId: createEquipmentDropInstanceId(),
        definitionId: drop.definitionId,
        grade: drop.grade,
        enhancement: 0,
      });
      progression = recordProgressionEvent(progression, {
        type: "equipment-drop",
      });
      renderEquipment();
      renderProgression();
      void autosaveCampaign(
        "equipment",
        "✓ " +
          gradeLabel(drop.grade).toUpperCase() +
          " drop · " +
          definition.name,
      );
    },
    onRewardChoice: (options) => {
      if (options.length === 0) return;
      game.pause();
      renderRewardChoiceOptions(options);
      rewardChoiceDialog.showModal();
    },
    onBossRewardChoice: (stage) => {
      const options = createBossRewardChoiceOptions(
        stage,
        game.getPlayerStats().luck,
        relics,
        activeStageDifficulty?.ascensionRewardMultiplier ?? 1,
      );
      game.pause();
      renderBossRewardChoiceOptions(options);
      rewardChoiceDialog.showModal();
    },
    onEnemySeen: (definitionId) => {
      codex = discoverCodexEnemy(codex, definitionId).state;
    },
    onAnomalyReady: (riskHullRatio) => {
      game.pause();
      renderAnomalyDecision(riskHullRatio);
      anomalyDialog.showModal();
    },
    onLuckPityUpdate: (state) => {
      luckPity = state;
    },
    onHiddenDiscoveryUpdate: (state, discovery) => {
      hiddenDiscovery = state;
      renderCodex();
      updateShopAccess();
      const achievementNames = syncProgressionAchievements();
      if (achievementNames.length > 0) renderProgression();
      void autosaveCampaign(
        "discovery",
        discovery === null
          ? undefined
          : hiddenDiscoveryMessage(discovery),
        discovery === null ? undefined : "hidden-transition",
      );
    },
  },
);

const testLab = mountTestLab({
  getSettings: () => settings,
  getVocabulary: () => configuredVocabulary,
  showNotice,
});

byId<HTMLButtonElement>("anomalyStabilize").addEventListener(
  "click",
  () => {
    if (!game.resolveAnomaly("stabilize")) return;
    anomalyDialog.close();
    game.resume();
  },
);

byId<HTMLButtonElement>("anomalyOverload").addEventListener(
  "click",
  () => {
    if (!game.resolveAnomaly("overload")) return;
    anomalyDialog.close();
    game.resume();
  },
);

function applySelectedCharacter(): void {
  game.setCharacter(characters.selected);
  applyEquipmentStats();
  renderPlayerStatusIdentity();
  renderAllSkills();
}

function renderCharacters(): void {
  const grid = byId("characterGrid");
  grid.replaceChildren();

  CHARACTER_IDS.forEach((id, index) => {
    const definition = getCharacter(id);
    const unlocked = characters.unlocked.includes(id);
    const selected = characters.selected === id;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "character-card";
    card.classList.toggle("selected", selected);
    card.classList.toggle("locked", !unlocked);
    card.disabled = !unlocked;
    card.setAttribute(
      "aria-label",
      definition.name +
        " · " +
        definition.role +
        (selected ? " · selected" : unlocked ? " · available" : " · locked"),
    );

    const preview = document.createElement("canvas");
    preview.className = "character-card-preview";
    preview.width = 240;
    preview.height = 132;
    preview.setAttribute("aria-hidden", "true");
    const previewContext = preview.getContext("2d");
    if (previewContext !== null) {
      drawCharacterShip(previewContext, id, {
        x: preview.width / 2,
        y: 76,
        time: index * 0.73 + 0.8,
        scale: selected ? 1.42 : 1.3,
        glowScale: selected ? 1.15 : 0.86,
        alpha: unlocked ? 1 : 0.48,
        aura: selected
          ? deriveEquipmentAura(equipment, characters.selected)
          : null,
      });
    }

    const top = document.createElement("div");
    top.className = "character-card-top";

    const nameWrap = document.createElement("div");
    nameWrap.className = "character-card-name";

    const name = document.createElement("strong");
    name.textContent = definition.name;

    const role = document.createElement("span");
    role.className = "character-role";
    role.textContent = definition.role;

    nameWrap.append(name, role);

    const state = document.createElement("span");
    state.className = "character-card-state";
    state.textContent = selected
      ? "Selected"
      : unlocked
        ? "Available"
        : "Stage " + String(definition.unlockStage).padStart(3, "0");

    top.append(nameWrap, state);

    const summary = document.createElement("p");
    summary.textContent = definition.summary;

    const progress = characters.progress[id];
    const kit = document.createElement("div");
    kit.className = "character-card-kit";

    const active = document.createElement("small");
    active.innerHTML =
      "<b>Active</b><span>" + definition.activeName + "</span>";

    const ultimate = document.createElement("small");
    ultimate.innerHTML =
      "<b>Ultimate</b><span>" + definition.ultimateName + "</span>";

    kit.append(active, ultimate);

    const progressMeta = document.createElement("div");
    progressMeta.className = "character-card-progress";
    progressMeta.textContent =
      "Lv " +
      String(progress.level) +
      " · Mastery " +
      String(progress.mastery) +
      " · " + basicSkillPoints(progress.level, upgrades.basicSkills[id]).available +
      " Basic Points available";

    card.append(preview, top, summary, kit, progressMeta);

    if (unlocked && !selected) {
      card.addEventListener("click", () => {
        characters = selectCharacter(characters, id);
        applySelectedCharacter();
        renderCharacters();
        updateCampaignUi();
        void autosaveCampaign(
          "character",
          "✓ Character selected · " + definition.name,
          "loadout",
        );
      });
    }

    grid.append(card);
  });

  const selectedProgress = characters.progress[characters.selected];
  byId("characterSelectedMeta").textContent =
    "Selected: " +
    getCharacter(characters.selected).name +
    " · Lv " +
    String(selectedProgress.level) +
    " · Mastery " +
    String(selectedProgress.mastery);

  renderTalentPanel();
  renderBasicSkillPanel();
  renderHotbarLoadout();
}

function renderTalentPanel(): void {
  const panel = byId("talentPanel");
  panel.replaceChildren();

  const id = characters.selected;
  const progress = characters.progress[id];
  const available = talentPointsForLevel(progress.level);
  const spent = totalTalentPoints(progress.talents);

  const head = document.createElement("div");
  head.className = "talent-head";

  const title = document.createElement("strong");
  title.textContent = "Talent Tree";

  const meta = document.createElement("span");
  meta.textContent =
    String(spent) + "/" + String(available) + " points spent";

  head.append(title, meta);

  const grid = document.createElement("div");
  grid.className = "talent-grid";

  for (const branch of TALENT_BRANCHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "talent-button";

    const label = document.createElement("strong");
    label.textContent = talentBranchLabel(branch);

    const rank = document.createElement("span");
    rank.textContent = "Rank " + String(progress.talents[branch]) + "/2";

    button.append(label, rank);
    button.disabled =
      spent >= available || progress.talents[branch] >= 2;

    button.addEventListener("click", () => {
      const nextTalents = spendTalentPoint(
        characters.progress[id].talents,
        branch,
        characters.progress[id].level,
      );
      if (nextTalents === characters.progress[id].talents) return;

      characters = updateCharacterProgress(characters, id, {
        ...characters.progress[id],
        talents: nextTalents,
      });
      applyEquipmentStats();
      renderCharacters();
      void autosaveCampaign(
        "character",
        "✓ Talent saved · " +
          getCharacter(id).name +
          " · " +
          talentBranchLabel(branch),
        "upgrade",
      );
    });

    grid.append(button);
  }

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "talent-reset";
  reset.textContent = "Reset talents";
  reset.disabled = spent === 0;
  reset.addEventListener("click", () => {
    characters = updateCharacterProgress(characters, id, {
      ...characters.progress[id],
      talents: resetTalentRanks(),
    });
    applyEquipmentStats();
    renderCharacters();
    void autosaveCampaign(
      "character",
      "✓ Talents reset · " + getCharacter(id).name,
      "upgrade",
    );
  });

  panel.append(head, grid, reset);
}

function renderBasicSkillPanel(): void {
  const panel = byId("basicSkillPanel");
  panel.replaceChildren();
  const characterId = characters.selected;
  const characterLevel = characters.progress[characterId].level;
  const wallet = upgrades.basicSkills[characterId];
  const points = basicSkillPoints(characterLevel, wallet);

  const heading = document.createElement("div");
  heading.className = "basic-skill-heading";
  const title = document.createElement("strong");
  title.textContent = "Basic Skill Tree";
  const balance = document.createElement("span");
  balance.textContent =
    points.available + " available · " + points.spent +
    " spent / " + points.earned + " earned";
  heading.append(title, balance);
  const note = document.createElement("p");
  note.textContent =
    "Earn 1 Basic Skill Point for every character level-up. " +
    "Each character has separate skills; Talent Points and Mastery are unchanged.";
  panel.append(heading, note);

  const grid = document.createElement("div");
  grid.className = "basic-skill-grid";
  const definitions = [...DEFENSIVE_SKILLS, ...OFFENSIVE_SKILLS];

  for (const skillId of UPGRADEABLE_SKILL_IDS) {
    const rank = wallet.ranks[skillId];
    const nextRequirement = basicSkillNextUnlockLevel(rank);
    const presentation = BASIC_SKILL_PRESENTATION[skillId];
    const definition = definitions.find((skill) => skill.id === skillId);
    const currentEffect =
      rank > 0 && definition !== undefined
        ? resolveSkillDefinitionLevel(definition, rank)
        : null;
    const nextEffect =
      nextRequirement !== null && definition !== undefined
        ? resolveSkillDefinitionLevel(definition, rank + 1)
        : null;
    const card = document.createElement("article");
    card.className =
      "basic-skill-card visual-card skill-card " +
      (rank > 0 ? "learned" : "locked");
    const icon = document.createElement("span");
    icon.className = "basic-skill-icon";
    icon.textContent = presentation.icon;
    icon.setAttribute("aria-hidden", "true");
    const body = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = (definition?.name ?? skillId) + " · Lv" + rank + "/5";
    const category = document.createElement("span");
    category.className = "basic-skill-category";
    category.textContent = presentation.group;
    const summary = document.createElement("small");
    summary.textContent = presentation.summary;
    const effect = document.createElement("small");
    effect.className = "basic-skill-effect";
    effect.textContent = nextEffect === null
      ? "Mastered · final skill rank"
      : (currentEffect === null
          ? "Not learned"
          : "Current: " + currentEffect.energyCost + " Energy · " +
            currentEffect.cooldown.toFixed(1) + "s cooldown · " +
            currentEffect.effectScale?.toFixed(2) + "× effect") +
        " → Next: " + nextEffect.energyCost + " Energy · " +
        nextEffect.cooldown.toFixed(1) + "s cooldown · " +
        nextEffect.effectScale?.toFixed(2) + "× effect";
    const button = document.createElement("button");
    button.type = "button";
    const canLearn =
      nextRequirement !== null &&
      characterLevel >= nextRequirement &&
      points.available > 0;
    button.disabled = !canLearn;
    button.textContent = nextRequirement === null
      ? "Max rank"
      : characterLevel < nextRequirement
        ? "Unlock at Lv " + nextRequirement
        : points.available < 1
          ? "Requires 1 Basic Skill Point"
          : (rank === 0 ? "Learn" : "Upgrade") + " · 1 point";
    button.addEventListener("click", () => {
      // Re-read the latest wallet/level, so repeated quick clicks cannot
      // spend points or upgrade a rank based on stale rendered UI.
      const current = upgrades.basicSkills[characterId];
      const result = spendBasicSkillPoint(
        current,
        skillId,
        characters.progress[characterId].level,
      );
      if (!result.changed) return;
      upgrades = {
        ...upgrades,
        basicSkills: {
          ...upgrades.basicSkills,
          [characterId]: result.progress,
        },
      };
      applyEquipmentStats();
      renderCharacters();
      renderAllSkills();
      void autosaveCampaign(
        "upgrade",
        "✓ " + (definition?.name ?? skillId) +
          " Lv" + result.progress.ranks[skillId] +
          " · Basic Skill Point spent",
        "upgrade",
      );
    });
    body.append(name, category, summary, effect, button);
    card.append(icon, body);
    grid.append(card);
  }
  panel.append(grid);
}

function openCharacters(): void {
  if (!persistenceReady || game.getPhase() !== "title") return;
  renderCharacters();
  characterDialog.showModal();
}

function applySupportSpells(): void {
  const ids = supportSpells.loadout.filter(
    (id): id is SupportSpellId => id !== null,
  );
  game.setSupportSpells(ids);
}

function renderSupportLoadout(): void {
  const selects = [
    byId<HTMLSelectElement>("supportSlot0"),
    byId<HTMLSelectElement>("supportSlot1"),
  ];
  const metas = [
    byId("supportSlot0Meta"),
    byId("supportSlot1Meta"),
  ];

  for (let index = 0; index < selects.length; index += 1) {
    const select = selects[index]!;
    select.replaceChildren();

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Empty";
    select.append(empty);

    for (const id of supportSpells.unlocked) {
      const option = document.createElement("option");
      const spell = getSupportSpell(id);
      option.value = id;
      option.textContent = spell.name;
      select.append(option);
    }

    const slot = index as 0 | 1;
    const selected = supportSpells.loadout[slot];
    select.value = selected ?? "";
    metas[index]!.textContent =
      selected === null
        ? "No spell equipped"
        : getSupportSpell(selected).description;
  }
}

function canOpenBetweenStageMenu(): boolean {
  const phase = game.getPhase();
  return phase === "title" || phase === "stageclear";
}

function openSupportSpells(): void {
  if (!persistenceReady || !canOpenBetweenStageMenu()) return;
  renderSupportLoadout();
  supportDialog.showModal();
}

function activeBuildSynergies() {
  return resolveBuildSynergies({
    character: characters.selected,
    equipment,
    supportSpells,
  });
}

function applyEquipmentStats(): void {
  game.setSkillLevels(upgrades.basicSkills[characters.selected].ranks);
  const synergies = activeBuildSynergies();
  game.setBuildSynergies(synergies);
  game.setEquipmentAura(
    deriveEquipmentAura(equipment, characters.selected),
  );
  game.setPlayerStats({
    base: DEFAULT_PLAYER_BASE_STATS,
    character: characterStatBonus(characters.selected),
    level: characterProgressStatBonus(
      characters.progress[characters.selected],
    ),
    equipment: equipmentStatBonus(equipment),
    permanent: permanentAttributeBonus(upgrades),
    talent: talentStatBonus(
      characters.progress[characters.selected].talents,
    ),
    synergy: buildSynergyStatBonus(synergies),
  });
}

function applyRelicEffects(): void {
  game.setRelicEffects(compileRelicEffects(relics));
}

function grantRelicReward(
  sourceStage: number,
  sourceKey: string,
): RelicId | null {
  const id = selectRelicReward(relics, sourceStage, sourceKey);
  if (id === null) return null;

  relics = grantRelic(relics, id).state;
  if (relics.equipped.length < MAX_EQUIPPED_RELICS) {
    relics = equipRelic(relics, id).state;
  }
  applyRelicEffects();
  return id;
}

function relicRewardText(id: RelicId | null): string {
  return id === null
    ? ""
    : " · Relic: " + getRelicDefinition(id).name;
}

function formatEquipmentBonuses(): string {
  const bonus = equipmentStatBonus(equipment);
  const parts = Object.entries(bonus)
    .filter(([, value]) => typeof value === "number" && value !== 0)
    .map(([key, value]) =>
      key + " +" + String(Math.round((value ?? 0) * 10) / 10),
    );

  return parts.length > 0 ? parts.join(" · ") : "none";
}

function renderEquipment(): void {
  const grid = byId("equipmentGrid");
  grid.replaceChildren();

  for (const slot of EQUIPMENT_SLOTS) {
    const card = document.createElement("label");
    card.className = "equipment-slot visual-card equipment-card";

    const title = document.createElement("span");
    title.className = "equipment-slot-name";
    title.textContent = slot;

    const select = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Empty";
    select.append(empty);

    for (const item of equipmentForSlot(equipment, slot)) {
      const definition = getEquipmentDefinition(item.definitionId);
      const option = document.createElement("option");
      option.value = item.instanceId;
      option.textContent =
        "[" +
        gradeLabel(item.grade).toUpperCase() +
        " +" +
        String(item.enhancement) +
        "] " +
        definition.name;
      select.append(option);
    }

    select.value = equipment.loadout[slot] ?? "";
    select.addEventListener("change", () => {
      equipment =
        select.value === ""
          ? unequipSlot(equipment, slot)
          : equipInstance(equipment, select.value);

      applyEquipmentStats();
      renderEquipment();
      void autosaveCampaign(
        "equipment",
        "✓ Loadout saved · applies next stage",
        "loadout",
      );
    });

    const currentId = equipment.loadout[slot];
    const current =
      currentId === null
        ? null
        : equipment.items.find(
            (item) => item.instanceId === currentId,
          ) ?? null;

    const definition =
      current === null
        ? null
        : getEquipmentDefinition(current.definitionId);
    applyGradeFrame(card, current?.grade ?? "aluminum");

    const head = document.createElement("div");
    head.className = "equipment-card-head";
    const visual = createLocalIcon(
      definition?.icon ?? "○",
      definition === null ? slot + " slot" : definition.name + " icon",
      "equipment-card-icon",
    );
    const identity = document.createElement("div");
    identity.className = "equipment-card-identity";
    identity.append(title);
    if (current !== null) {
      identity.append(createGradeBadge(current.grade));
    }
    head.append(visual, identity);

    const detail = document.createElement("small");
    detail.textContent =
      current === null
        ? "No equipment"
        : "+" +
          String(current.enhancement) +
          " · " +
          (definition?.description ?? "");

    card.append(head, select, detail);
    grid.append(card);
  }

  byId("equipmentBonusText").textContent = formatEquipmentBonuses();
  byId("equipmentSynergyText").textContent =
    buildSynergySummary(activeBuildSynergies());
}

function openEquipment(): void {
  if (!persistenceReady || game.getPhase() !== "title") return;
  renderEquipment();
  equipmentDialog.showModal();
}

function createShopInstanceId(): string {
  shopPurchaseCounter += 1;
  return (
    "shop-" +
    Date.now().toString(36) +
    "-" +
    shopPurchaseCounter.toString(36)
  );
}

function musicCrossfadeSeconds(state: MusicState): number {
  if (state === "WORLD_INTENSE") return 0.65;
  if (
    state === "MINI_BOSS" ||
    state === "WORLD_BOSS" ||
    state === "GALAXY_BOSS"
  ) {
    return 0.8;
  }
  if (
    state === "SHOP" ||
    state === "STATION"
  ) {
    return 0.7;
  }
  return 1.8;
}

function syncWorldMusicProfile(stage: number): void {
  musicController.setWorldProfile(
    musicProfileForWorld(worldForStage(stage)),
  );
}

function syncStagePhaseMusic(phase: StagePacingPhase): void {
  if (currentHiddenEncounterState().active !== null) return;
  const stage = game.getStats().stage;
  const stageConfig = createStageConfig(stage);
  const state = musicStateForStagePhase(stageConfig.role, phase.kind);
  if (state === null) return;

  musicController.transitionTo(
    state,
    phase.kind === "recovery" ? 0.75 : 0.55,
  );
  musicController.setPaused(false);
}

function syncCombatMusic(stage: number): void {
  const stageConfig = createStageConfig(stage);
  syncWorldMusicProfile(stageConfig.stage);
  const state = musicStateForStageRole(stageConfig.role);
  musicController.transitionTo(
    state,
    musicCrossfadeSeconds(state),
  );
  musicController.setPaused(false);
}

function restoreTitleMusic(): void {
  syncWorldMusicProfile(campaign.selectedStage);
  musicController.setBossPhase(1);
  musicController.transitionTo("WORLD_NORMAL", 0.8);
  musicController.setPaused(false);
}

function enterShopMusic(type: ShopType): void {
  syncWorldMusicProfile(campaign.highestUnlockedStage);
  const state: MusicState =
    type === "station" || type === "service"
      ? "STATION"
      : "SHOP";
  musicController.transitionTo(
    state,
    musicCrossfadeSeconds(state),
  );
  musicController.setPaused(false);
}

function worldLabel(world: WorldProfile): string {
  const worldNumber = Math.floor((world.stageStart - 1) / 20) + 1;
  return (
    "World " +
    String(worldNumber).padStart(2, "0") +
    " · " +
    world.name
  );
}

async function presentStageTransition(
  spec: StageTransitionSpec,
): Promise<void> {
  const panel = byId("stageTransition");
  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const fadeMs = reducedMotion ? 20 : 170;
  const durationMs = reducedMotion
    ? Math.min(180, spec.durationMs)
    : spec.durationMs;

  panel.dataset.tone = spec.tone;
  byId("stageTransitionEyebrow").textContent = spec.eyebrow;
  byId("stageTransitionTitle").textContent = spec.title;
  byId("stageTransitionSubtitle").textContent = spec.subtitle;

  panel.classList.remove("hidden", "leaving", "active");
  void panel.offsetWidth;
  panel.classList.add("active");

  await new Promise<void>((resolve) => {
    let settled = false;
    let hideTimer: number | null = null;

    const cleanup = (): void => {
      window.removeEventListener("keydown", onKeyDown, true);
      panel.removeEventListener("pointerdown", finish);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };

    const finish = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      panel.classList.remove("active");
      panel.classList.add("leaving");
      window.setTimeout(() => {
        panel.classList.add("hidden");
        panel.classList.remove("leaving");
        resolve();
      }, fadeMs);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key !== "Enter" &&
        event.key !== " " &&
        event.key !== "Escape"
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      finish();
    };

    window.addEventListener("keydown", onKeyDown, true);
    panel.addEventListener("pointerdown", finish);
    hideTimer = window.setTimeout(finish, durationMs);
  });
}

function shopWorldKey(stage: number): string {
  return worldForStage(stage).id;
}

function currentShopContext(): ShopRollContext {
  const stage = campaign.highestUnlockedStage;
  return {
    stage,
    worldKey: shopWorldKey(stage),
    luck: game.getPlayerStats().luck,
    progression: campaign.clearedStages.length,
    hiddenDiscovery,
  };
}

function renderShopBalance(root: HTMLElement): void {
  replaceCurrencyChips(
    root,
    {
      credits,
      alloy: expansionCurrencies.alloy,
      starCrystal: expansionCurrencies.starCrystal,
      quantumCore: expansionCurrencies.quantumCore,
    },
    {
      includeZero: true,
      className: "shop-wallet-chips",
    },
  );
}

function setCurrencyButton(
  button: HTMLButtonElement,
  label: string,
  amounts: CurrencyAmounts,
  options: {
    signed?: boolean;
  } = {},
): void {
  button.replaceChildren();
  const action = document.createElement("span");
  action.className = "currency-action-label";
  action.textContent = label;
  const chips = document.createElement("span");
  chips.className = "currency-action-price";
  replaceCurrencyChips(chips, amounts, {
    signed: options.signed,
  });
  button.append(action, chips);
  button.setAttribute(
    "aria-label",
    label + " · " + currencyAccessibleText(amounts, {
      signed: options.signed,
    }),
  );
}

function resolveRuntimeShop(type: ShopType): ShopInstance | null {
  const context = currentShopContext();
  if (!shopAvailable(type, context)) return null;

  const resolved = resolveShopInstance(shops, type, context);
  shops = resolved.state;
  if (resolved.created) {
    void autosaveCampaign(
      "shop",
      "✓ " + shopPresentation(type).title + " stock locked for this sector",
      "shop",
    );
  }
  return resolved.instance;
}

function shopStockName(entry: ShopStockEntry): string {
  return entry.kind === "item"
    ? getItemDefinition(entry.itemId).name
    : getEquipmentDefinition(entry.definitionId).name;
}

function shopStockGrade(entry: ShopStockEntry): GradeId {
  if (entry.kind === "equipment") return entry.grade;
  return getItemDefinition(entry.itemId).grade ?? "aluminum";
}

function shopStockIcon(entry: ShopStockEntry): string {
  return entry.kind === "item"
    ? getItemDefinition(entry.itemId).icon
    : getEquipmentDefinition(entry.definitionId).icon;
}

function shopStockType(entry: ShopStockEntry): string {
  if (entry.kind === "equipment") {
    return getEquipmentDefinition(entry.definitionId).slot.toUpperCase();
  }
  return getItemDefinition(entry.itemId).category.toUpperCase();
}

function shopStockDescription(entry: ShopStockEntry): string {
  if (entry.kind === "item") {
    return getItemDefinition(entry.itemId).description;
  }

  const definition = getEquipmentDefinition(entry.definitionId);
  return (
    gradeLabel(entry.grade).toUpperCase() +
    " · " +
    definition.slot +
    " · " +
    definition.description
  );
}

function shopStockIsFull(entry: ShopStockEntry): boolean {
  if (entry.kind !== "item") return false;
  return (
    itemCount(inventory, entry.itemId) >=
    getItemDefinition(entry.itemId).maxStack
  );
}

function applyShopPurchaseState(
  next: {
    credits: number;
    expansionCurrencies: ExpansionCurrencyState;
    inventory: Inventory;
    equipment: EquipmentState;
    shops: ShopState;
  },
): void {
  credits = next.credits;
  expansionCurrencies = next.expansionCurrencies;
  inventory = next.inventory;
  equipment = next.equipment;
  shops = next.shops;
  renderInventory();
  renderEquipment();
  applyEquipmentStats();
  updateDataSummary();
}

function shopPurchaseFailureMessage(
  reason: "missing" | "sold-out" | "currency" | "full" | "duplicate" | null,
): string {
  if (reason === "currency") return "Not enough shop currency";
  if (reason === "full") return "Inventory stack is full";
  if (reason === "sold-out") return "This stock is sold out";
  if (reason === "duplicate") return "Unable to create equipment instance";
  return "Unable to purchase this offer";
}

function appendShopStockCards(
  instance: ShopInstance,
  grid: HTMLElement,
  cardClass: string,
  rerender: () => void,
): void {
  grid.replaceChildren();

  for (const entry of instance.stock) {
    const grade = shopStockGrade(entry);
    const card = document.createElement("article");
    card.className = cardClass + " visual-card item-card";
    applyGradeFrame(card, grade);
    card.title = shopStockDescription(entry);

    const visual = createLocalIcon(
      shopStockIcon(entry),
      shopStockName(entry) + " icon",
      "item-card-icon",
    );

    const body = document.createElement("div");
    body.className = "item-card-body";

    const meta = document.createElement("div");
    meta.className = "item-card-meta";
    const gradeBadge = createGradeBadge(grade);
    const type = document.createElement("span");
    type.className = "shop-offer-type";
    type.textContent =
      shopStockType(entry) +
      " · STOCK " +
      String(entry.remaining);
    meta.append(gradeBadge, type);

    const title = document.createElement("strong");
    title.className = "item-card-title";
    title.textContent = shopStockName(entry);

    const description = document.createElement("small");
    description.className = "item-card-description";
    description.textContent = shopStockDescription(entry);

    const buy = document.createElement("button");
    buy.type = "button";
    buy.className = "shop-buy";

    const soldOut = entry.remaining <= 0;
    const itemFull = shopStockIsFull(entry);
    const affordable = canAffordShopPrice(
      credits,
      expansionCurrencies,
      entry.price,
    );
    buy.disabled = soldOut || itemFull || !affordable;

    if (soldOut || itemFull) {
      buy.textContent = soldOut ? "Sold out" : "Full";
    } else {
      const price = document.createElement("span");
      price.className = "shop-price";
      replaceCurrencyChips(price, entry.price);
      buy.append(price);
      buy.setAttribute(
        "aria-label",
        "Buy " + shopStockName(entry) + " for " + formatShopPrice(entry.price),
      );
      if (!affordable) {
        buy.title = "Insufficient currency · " + formatShopPrice(entry.price);
      }
    }

    buy.addEventListener("click", () => {
      const purchase = buyShopStockEntry(
        {
          credits,
          expansionCurrencies,
          inventory,
          equipment,
          shops,
        },
        instance.id,
        entry.key,
        entry.kind === "equipment" ? createShopInstanceId() : "",
      );

      if (!purchase.purchased) {
        showNotice(shopPurchaseFailureMessage(purchase.reason));
        rerender();
        return;
      }

      applyShopPurchaseState(purchase.state);
      recordShopProgress();
      renderProgression();
      rerender();
      updateShopAccess();
      void autosaveCampaign(
        "shop",
        "✓ Purchased " +
          shopStockName(entry) +
          " · stock " +
          String(Math.max(0, entry.remaining - 1)) +
          " left",
        "shop",
      );
    });

    body.append(meta, title, description, buy);
    card.append(visual, body);
    grid.append(card);
  }
}

function renderNormalShop(): void {
  renderShopBalance(byId("shopCredits"));
  const grid = byId("normalShopGrid");
  const instance = resolveRuntimeShop("normal");

  if (instance === null) {
    grid.replaceChildren();
    return;
  }

  appendShopStockCards(
    instance,
    grid,
    "shop-offer",
    renderNormalShop,
  );
}

function openNormalShop(): void {
  if (!persistenceReady || !canOpenBetweenStageMenu()) return;
  enterShopMusic("normal");
  renderNormalShop();
  shopDialog.showModal();
}

function applyServiceShopState(
  next: {
    credits: number;
    expansionCurrencies: ExpansionCurrencyState;
    inventory: Inventory;
    equipment: EquipmentState;
    upgrades: UpgradeState;
  },
): void {
  credits = next.credits;
  expansionCurrencies = next.expansionCurrencies;
  inventory = next.inventory;
  equipment = next.equipment;
  upgrades = next.upgrades;
  renderInventory();
  renderEquipment();
  applyEquipmentStats();
  updateDataSummary();
}

function canAffordUpgradeCost(cost: UpgradeCost): boolean {
  return (
    campaign.highestUnlockedStage >= cost.requiredStage &&
    credits >= cost.credits &&
    expansionCurrencies.alloy >= cost.alloy &&
    expansionCurrencies.starCrystal >= cost.starCrystal &&
    expansionCurrencies.quantumCore >= cost.quantumCore
  );
}

function serviceFailureText(
  reason:
    | "credits"
    | "alloy"
    | "star-crystal"
    | "quantum-core"
    | "stage"
    | "full"
    | "max"
    | "missing"
    | "equipped"
    | "grade"
    | "affix"
    | null,
): string {
  if (reason === "credits") return "Not enough Credits";
  if (reason === "alloy") return "Not enough Alloy";
  if (reason === "star-crystal") return "Not enough Star Crystal";
  if (reason === "quantum-core") return "Not enough Quantum Core";
  if (reason === "stage") return "Campaign progress is too low for this service";
  if (reason === "equipped") return "Unequip this item before dismantling";
  if (reason === "grade") return "This equipment cannot evolve yet";
  if (reason === "affix") return "No valid affix slot/action is available";
  if (reason === "max") return "Already at maximum level";
  if (reason === "full") return "Inventory stack is full";
  return "Unable to apply this Station service";
}

function commitUpgradeService(
  result: ReturnType<typeof buySkillUpgrade>,
  message: string,
  countAsPurchase = true,
): void {
  if (!result.applied) {
    showNotice(serviceFailureText(result.reason));
    renderServiceShop();
    return;
  }

  applyServiceShopState(result.state);
  if (countAsPurchase) {
    recordShopProgress();
    renderProgression();
  }
  renderServiceShop();
  void autosaveCampaign("upgrade", message, "upgrade");
}

function renderServiceShop(): void {
  renderShopBalance(byId("serviceShopCredits"));

  const repairPanel = byId("repairServicePanel");
  repairPanel.replaceChildren();

  const repairCard = document.createElement("article");
  repairCard.className = "service-shop-card visual-card item-card";
  applyGradeFrame(repairCard, "aluminum");
  const repairIcon = createLocalIcon(
    getItemDefinition("repair-kit").icon,
    "Repair Station Pack icon",
    "item-card-icon",
  );

  const repairBody = document.createElement("div");
  repairBody.className = "item-card-body";

  const repairTitle = document.createElement("strong");
  repairTitle.textContent = "Repair Station Pack";

  const repairDescription = document.createElement("small");
  repairDescription.textContent =
    "Adds 1 Repair Kit and 1 Shield Cell. Service payment uses Credits + Alloy.";

  const repairButton = document.createElement("button");
  repairButton.type = "button";
  setCurrencyButton(
    repairButton,
    "Buy Repair Pack",
    {
      credits: REPAIR_PACK_COST,
      alloy: REPAIR_PACK_ALLOY_COST,
    },
  );
  repairButton.disabled =
    credits < REPAIR_PACK_COST ||
    expansionCurrencies.alloy < REPAIR_PACK_ALLOY_COST;
  repairButton.addEventListener("click", () => {
    const result = buyRepairPack({
      credits,
      expansionCurrencies,
      inventory,
      equipment,
      upgrades,
    });

    if (!result.applied) {
      showNotice(
        result.reason === "credits"
          ? "Not enough Credits"
          : result.reason === "alloy"
            ? "Not enough Alloy"
            : "Repair Kit or Shield Cell stack is full",
      );
      renderServiceShop();
      return;
    }

    applyServiceShopState(result.state);
    recordShopProgress();
    renderProgression();
    renderServiceShop();
    void autosaveCampaign(
      "shop",
      "✓ Repair Station pack purchased · Credits + Alloy deducted",
      "shop",
    );
  });

  repairBody.append(repairTitle, repairDescription, repairButton);
  repairCard.append(repairIcon, repairBody);
  repairPanel.append(repairCard);

  // Legacy paid Lv1-Lv5 skills remain grandfathered for all characters,
  // but the Station no longer has a second purchase path for their ranks.
  const skillsNote = document.createElement("p");
  skillsNote.className = "equipment-note";
  skillsNote.textContent =
    "Core skill ranks now use per-character Basic Skill Points. " +
    "Open Character Select to learn or upgrade skills; previous paid ranks are retained.";
  repairPanel.append(skillsNote);

  for (const key of CORE_STAT_KEYS) {
    const level = upgrades.attributeLevels[key];
    const max = maxAttributeLevel(key);
    const cost = attributeUpgradeCost(key, level);
    const card = document.createElement("article");
    card.className = "service-shop-card visual-card stat-card";

    const title = document.createElement("strong");
    title.textContent =
      key.toUpperCase() +
      " · Lv" +
      String(level) +
      "/" +
      String(max);

    const detail = document.createElement("small");
    detail.textContent =
      key === "luck" || key === "salvage"
        ? "Economy-sensitive permanent attribute · stricter cap and cost curve."
        : "Permanent core-stat training · participates in checkpoint rollback semantics.";

    const button = document.createElement("button");
    button.type = "button";
    button.disabled =
      cost === null || !canAffordUpgradeCost(cost);
    if (cost === null) {
      button.textContent = "Maxed";
    } else {
      setCurrencyButton(
        button,
        "Train Lv" + String(level + 1),
        cost,
      );
    }
    button.addEventListener("click", () => {
      commitUpgradeService(
        buyAttributeUpgrade(
          {
            credits,
            expansionCurrencies,
            inventory,
            equipment,
            upgrades,
          },
          key as CoreStatKey,
          campaign.highestUnlockedStage,
        ),
        "✓ Permanent attribute trained · " +
          key +
          " Lv" +
          String(level + 1),
      );
    });

    card.append(title, detail, button);
    repairPanel.append(card);
  }

  const relicSummary = document.createElement("article");
  relicSummary.className = "service-shop-card";
  const relicTitle = document.createElement("strong");
  relicTitle.textContent =
    "Run Relics · " +
    String(relics.equipped.length) +
    "/" +
    String(MAX_EQUIPPED_RELICS) +
    " equipped";
  const relicMeta = document.createElement("small");
  relicMeta.textContent =
    relics.owned.length === 0
      ? "Sector and Hidden Encounter rewards can unlock Relics. Relic effects are compiled when the loadout changes."
      : String(relics.owned.length) +
        " owned · equip up to " +
        String(MAX_EQUIPPED_RELICS) +
        " at this Station.";
  relicSummary.append(relicTitle, relicMeta);
  repairPanel.append(relicSummary);

  for (const id of relics.owned) {
    const definition = RELIC_REGISTRY[id];
    const equipped = relics.equipped.includes(id);
    const card = document.createElement("article");
    card.className = "service-shop-card";

    const title = document.createElement("strong");
    title.textContent =
      definition.name +
      " · " +
      gradeLabel(definition.grade).toUpperCase();

    const detail = document.createElement("small");
    detail.textContent = definition.description;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = equipped ? "Unequip Relic" : "Equip Relic";
    button.disabled =
      !equipped &&
      relics.equipped.length >= MAX_EQUIPPED_RELICS;
    button.addEventListener("click", () => {
      const result = equipped
        ? unequipRelic(relics, id)
        : equipRelic(relics, id);
      if (!result.changed) {
        showNotice(
          relics.equipped.length >= MAX_EQUIPPED_RELICS
            ? "Relic loadout is full"
            : "Relic loadout unchanged",
        );
        return;
      }

      relics = result.state;
      applyRelicEffects();
      renderServiceShop();
      updateDataSummary();
      void autosaveCampaign(
        "relic",
        "✓ Relic loadout saved · " + definition.name,
        "loadout",
      );
    });

    card.append(title, detail, button);
    repairPanel.append(card);
  }

  const grid = byId("upgradeShopGrid");
  grid.replaceChildren();

  for (const item of equipment.items) {
    const definition = getEquipmentDefinition(item.definitionId);
    const cost = equipmentUpgradeCost(item);
    const alloyCost = equipmentUpgradeAlloyCost(item);
    const card = document.createElement("article");
    card.className = "service-shop-card visual-card item-card equipment-service-card";
    applyGradeFrame(card, item.grade);

    const visual = createLocalIcon(
      definition.icon,
      definition.name + " icon",
      "item-card-icon",
    );
    const cardBody = document.createElement("div");
    cardBody.className = "item-card-body";

    const titleRow = document.createElement("div");
    titleRow.className = "item-card-meta";
    const gradeBadge = createGradeBadge(item.grade);
    const title = document.createElement("strong");
    title.textContent =
      definition.name +
      " +" +
      String(item.enhancement);
    titleRow.append(gradeBadge, title);

    const detail = document.createElement("small");
    const affixText =
      (item.affixes ?? []).length > 0
        ? " · " +
          (item.affixes ?? [])
            .map((id) => EQUIPMENT_AFFIX_REGISTRY[id].name)
            .join(" / ")
        : "";
    detail.textContent =
      definition.slot +
      " · " +
      definition.description +
      affixText +
      (equipment.loadout[definition.slot] === item.instanceId
        ? " · EQUIPPED"
        : "");

    const button = document.createElement("button");
    button.type = "button";
    button.disabled =
      cost === null ||
      alloyCost === null ||
      credits < (cost ?? 0) ||
      expansionCurrencies.alloy < (alloyCost ?? 0);
    if (cost === null || alloyCost === null) {
      button.textContent = "Max +5";
    } else {
      setCurrencyButton(
        button,
        "Upgrade",
        {
          credits: cost,
          alloy: alloyCost,
        },
      );
    }

    button.addEventListener("click", () => {
      const result = buyEquipmentUpgrade(
        {
          credits,
          expansionCurrencies,
          inventory,
          equipment,
          upgrades,
        },
        item.instanceId,
      );

      if (!result.applied) {
        showNotice(
          result.reason === "credits"
            ? "Not enough Credits"
            : result.reason === "alloy"
              ? "Not enough Alloy"
              : result.reason === "max"
                ? "Equipment is already +5"
                : "Unable to upgrade this equipment",
        );
        renderServiceShop();
        return;
      }

      applyServiceShopState(result.state);
      recordShopProgress();
      renderProgression();
      renderServiceShop();
      void autosaveCampaign(
        "shop",
        "✓ Upgraded " +
          definition.name +
          " · Credits + Alloy deducted",
        "upgrade",
      );
    });

    cardBody.append(titleRow, detail, button);
    card.append(visual, cardBody);

    const evolutionCost = equipmentEvolutionCost(item);
    if (evolutionCost !== null) {
      const evolve = document.createElement("button");
      evolve.type = "button";
      evolve.disabled = !canAffordUpgradeCost(evolutionCost);
      setCurrencyButton(
        evolve,
        "Evolve grade",
        evolutionCost,
      );
      evolve.addEventListener("click", () => {
        commitUpgradeService(
          buyEquipmentEvolution(
            {
              credits,
              expansionCurrencies,
              inventory,
              equipment,
              upgrades,
            },
            item.instanceId,
            campaign.highestUnlockedStage,
          ),
          "✓ Equipment grade evolved · " + definition.name,
        );
      });
      cardBody.append(evolve);
    }

    const maxAffixes = maxAffixesForGrade(item.grade);
    const affixCount = (item.affixes ?? []).length;
    const affixCost = equipmentAffixRollCost(item, false);
    if (
      affixCost !== null &&
      affixCount < maxAffixes
    ) {
      const rollAffix = document.createElement("button");
      rollAffix.type = "button";
      rollAffix.disabled = !canAffordUpgradeCost(affixCost);
      setCurrencyButton(
        rollAffix,
        "Roll affix " +
          String(affixCount + 1) +
          "/" +
          String(maxAffixes),
        affixCost,
      );
      rollAffix.addEventListener("click", () => {
        commitUpgradeService(
          buyEquipmentAffix(
            {
              credits,
              expansionCurrencies,
              inventory,
              equipment,
              upgrades,
            },
            item.instanceId,
            campaign.highestUnlockedStage,
          ),
          "✓ Equipment affix rolled · " + definition.name,
        );
      });
      cardBody.append(rollAffix);
    }

    const rerollCost = equipmentAffixRollCost(item, true);
    if (rerollCost !== null && affixCount > 0) {
      const reroll = document.createElement("button");
      reroll.type = "button";
      reroll.disabled = !canAffordUpgradeCost(rerollCost);
      setCurrencyButton(
        reroll,
        "Reroll first affix · others locked",
        rerollCost,
      );
      reroll.addEventListener("click", () => {
        commitUpgradeService(
          buyEquipmentAffixReroll(
            {
              credits,
              expansionCurrencies,
              inventory,
              equipment,
              upgrades,
            },
            item.instanceId,
            0,
            campaign.highestUnlockedStage,
          ),
          "✓ Equipment affix rerolled · " + definition.name,
        );
      });
      cardBody.append(reroll);
    }

    const dismantle = document.createElement("button");
    dismantle.type = "button";
    const equipped =
      equipment.loadout[definition.slot] === item.instanceId;
    const salvage = dismantleReward(item);
    dismantle.disabled = equipped;
    if (equipped) {
      dismantle.textContent = "Dismantle · unequip first";
    } else {
      setCurrencyButton(
        dismantle,
        "Dismantle",
        {
          alloy: salvage.alloy,
          starCrystal: salvage.starCrystal,
        },
        { signed: true },
      );
    }
    dismantle.addEventListener("click", () => {
      commitUpgradeService(
        dismantleEquipment(
          {
            credits,
            expansionCurrencies,
            inventory,
            equipment,
            upgrades,
          },
          item.instanceId,
        ),
        "✓ Equipment dismantled · " + definition.name,
        false,
      );
    });
    cardBody.append(dismantle);

    grid.append(card);
  }
}

function openServiceShop(): void {
  if (!persistenceReady || !canOpenBetweenStageMenu()) return;
  enterShopMusic("service");
  renderServiceShop();
  serviceShopDialog.showModal();
}

function shopPresentation(type: ShopType): {
  eyebrow: string;
  title: string;
  meta: string;
} {
  if (type === "station") {
    return {
      eyebrow: "sector station",
      title: "Station Shop",
      meta: "Deterministic sector stock · Credits + Alloy.",
    };
  }
  if (type === "traveling") {
    return {
      eyebrow: "merchant signal",
      title: "Traveling Merchant",
      meta: "Random sector appearance · finite Credits + Alloy stock.",
    };
  }
  if (type === "black-market") {
    return {
      eyebrow: "hidden market",
      title: "Black Market",
      meta: "Finite premium stock · Credits + Star Crystal.",
    };
  }
  if (type === "hidden") {
    return {
      eyebrow: "hidden route",
      title: "Hidden Shop",
      meta: "Rare finite stock · Star Crystal / Quantum Core.",
    };
  }
  if (type === "event") {
    return {
      eyebrow: "event exchange",
      title: "Event Shop",
      meta: "Finite special-item stock · Star Crystal exchange.",
    };
  }
  if (type === "service") {
    return {
      eyebrow: "maintenance bay",
      title: "Repair / Upgrade Shop",
      meta: "Credits + Alloy.",
    };
  }
  return {
    eyebrow: "campaign supply",
    title: "Normal Shop",
    meta: "Finite regular stock · Credits.",
  };
}

function updateShopAccess(): void {
  const context = currentShopContext();
  byId("travelingShopButton").classList.toggle(
    "hidden",
    !shopAvailable("traveling", context),
  );
  byId("blackMarketButton").classList.toggle(
    "hidden",
    !shopAvailable("black-market", context),
  );
  byId("hiddenShopButton").classList.toggle(
    "hidden",
    !shopAvailable("hidden", context),
  );
  byId("eventShopButton").classList.toggle(
    "hidden",
    !shopAvailable("event", context),
  );
}

function renderSpecialShop(): void {
  const presentation = shopPresentation(currentShopType);
  byId("specialShopEyebrow").textContent = presentation.eyebrow;
  byId("specialShopTitle").textContent = presentation.title;
  byId("specialShopMeta").textContent = presentation.meta;
  renderShopBalance(byId("specialShopCredits"));

  const grid = byId("specialShopGrid");
  const instance = resolveRuntimeShop(currentShopType);
  if (instance === null) {
    grid.replaceChildren();
    return;
  }

  appendShopStockCards(
    instance,
    grid,
    "special-shop-offer",
    renderSpecialShop,
  );
}

function openSpecialShop(kind: ShopType): void {
  if (
    !persistenceReady ||
    !canOpenBetweenStageMenu() ||
    kind === "normal" ||
    kind === "service" ||
    !shopAvailable(kind, currentShopContext())
  ) {
    return;
  }

  currentShopType = kind;
  enterShopMusic(kind);
  renderSpecialShop();
  specialShopDialog.showModal();
}

function selectedVocabularyLevel(): number {
  return sourceState.mode === "custom" ? 1 : sourceState.level;
}

function typingChallengeKey(level: number, seed: number): string {
  return String(level) + ":" + String(seed);
}

async function prepareStageVocabulary(
  stage: ReturnType<typeof createStageConfig>,
): Promise<void> {
  const badge = byId("typingTextBadge");
  badge.classList.add("hidden");
  badge.textContent = "";

  if (configuredVocabulary.length > 0) {
    game.setVocabulary(configuredVocabulary);
  }

  if (stage.role !== "special" || sourceState.mode !== "class") {
    return;
  }

  const level = sourceState.level;
  const key = typingChallengeKey(level, stage.seed);
  let pending = typingChallengeCache.get(key);
  if (pending === undefined) {
    pending = loadTypingTextChallenge(
      level,
      stage.seed,
      configuredVocabulary,
    );
    typingChallengeCache.set(key, pending);
  }

  try {
    const challenge = await pending;
    game.setVocabulary(challenge.entries);
    badge.textContent =
      "TYPING TEXT // " +
      challenge.passage.topic +
      " · " +
      challenge.cefr +
      " · " +
      String(challenge.entries.length) +
      " target words";
    badge.classList.remove("hidden");
  } catch (error) {
    typingChallengeCache.delete(key);
    console.info(
      "Typing-text challenge unavailable; using configured vocabulary.",
      error,
    );
  }
}

function routeTargetStage(): number {
  return campaign.highestUnlockedStage;
}

function routeNodeDescription(node: RouteNode): string {
  if (node.type === "station") {
    return "Maintenance stop · Station Shop, Repair / Upgrade, and Support Loadout are available before the encounter.";
  }
  if (node.type === "shop") {
    return "Supply detour · finite deterministic shop stock is available before the encounter.";
  }
  return node.mandatory
    ? "Mandatory combat route · boss progression cannot be bypassed."
    : "Direct combat route · no service detour before the encounter.";
}

function handleHiddenEncounterClear(
  active: ActiveHiddenEncounter,
  stats: ReturnType<Game["getStats"]>,
  wpm: number,
  accuracy: number,
): void {
  const label = hiddenEncounterLabel(active);
  const result = advanceHiddenEncounter(
    currentHiddenEncounterState(),
  );
  setHiddenEncounterState(result.state);
  stageEntrySnapshot = null;

  let rewardText = "No checkpoint change";
  let rewardCredits = 0;
  let rewardCurrencies = createExpansionCurrencyState();
  let rewardRelic: RelicId | null = null;

  if (result.completed) {
    const reward = hiddenEncounterReward(
      active,
      accuracy,
    );
    rewardCredits = reward.credits;
    rewardCurrencies = reward.currencies;
    credits = addCredits(credits, reward.credits);
    expansionCurrencies = addExpansionCurrencyReward(
      expansionCurrencies,
      reward.currencies,
    );
    rewardRelic =
      active.tier >= 2 ||
      active.kind === "hidden-world" ||
      active.kind === "champion-hunt"
        ? grantRelicReward(
            active.sourceStage,
            "hidden:" + active.id + ":" + String(active.tier),
          )
        : null;
    rewardText =
      currencyAccessibleText(
        {
          credits: reward.credits,
          alloy: reward.currencies.alloy,
          starCrystal: reward.currencies.starCrystal,
          quantumCore: reward.currencies.quantumCore,
        },
        { signed: true },
      ) +
      relicRewardText(rewardRelic);
  } else {
    rewardText =
      "Hidden World progress · " +
      String(result.state.active?.step ?? active.step + 1) +
      "/" +
      String(active.totalSteps);
  }

  void autosaveCampaign(
    "hidden-transition",
    result.completed
      ? "✓ " + label + " complete · premium reward secured"
      : "✓ " + label + " progress saved",
    "hidden-transition",
  );

  const stageSession = game.getStageSessionSnapshot();
  const rating = stageResultStars(accuracy, null);
  const measuredKills =
    stageSession.regularKills +
    stageSession.eliteKills +
    stageSession.bossKills;
  const killRate =
    stageSession.elapsedSeconds <= 0
      ? 0
      : measuredKills / stageSession.elapsedSeconds * 60;

  byId("clearTitle").textContent =
    result.completed
      ? label + " complete"
      : hiddenEncounterLabel(result.state.active!);
  byId("clearMeta").textContent =
    "Hidden encounter · Tier " + String(active.tier) +
    " · Campaign Stage " + String(active.sourceStage).padStart(3, "0");
  byId("clearStars").textContent =
    "★".repeat(rating.stars) + "☆".repeat(3 - rating.stars);
  byId("clearStarRule").textContent =
    "1★ clear · 2★ ≥90% target accuracy · 3★ " + rating.thirdStarRule;
  byId("clearScore").textContent =
    stats.score.toLocaleString();
  byId("clearAccuracy").textContent =
    accuracy.toFixed(1) + "%";
  byId("clearWpm").textContent = wpm.toFixed(0);
  byId("clearTime").textContent =
    formatStageDuration(stageSession.elapsedSeconds);
  byId("clearKillRate").textContent =
    killRate.toFixed(1) + "/min";
  byId("clearStreak").textContent =
    String(stats.maxStreak);

  wordReviewFilter = "all";
  renderMeasuredStageSession(stageSession, stats.hits, stats.misses);

  const rewardContainer = byId("clearCredits");
  if (result.completed) {
    replaceCurrencyChips(
      rewardContainer,
      {
        credits: rewardCredits,
        alloy: rewardCurrencies.alloy,
        starCrystal: rewardCurrencies.starCrystal,
        quantumCore: rewardCurrencies.quantumCore,
      },
      { signed: true },
    );
    if (rewardRelic !== null) {
      const relic = document.createElement("span");
      relic.className = "reward-chip";
      relic.textContent = "Relic · " + getRelicDefinition(rewardRelic).name;
      rewardContainer.append(relic);
    }
  } else {
    rewardContainer.replaceChildren();
    const progressChip = document.createElement("span");
    progressChip.className = "reward-chip";
    progressChip.textContent = rewardText;
    rewardContainer.append(progressChip);
  }

  const hiddenProgress = byId("clearCharacterProgress");
  hiddenProgress.replaceChildren();
  const hiddenProgressNote = document.createElement("span");
  hiddenProgressNote.textContent =
    "Character XP is not awarded by the current Hidden Encounter reward path.";
  hiddenProgress.append(hiddenProgressNote);

  byId("clearDetails").textContent = "Hidden encounter reward · no Campaign checkpoint advancement";
  updateCampaignUi();
  byId<HTMLButtonElement>("nextStageButton").textContent =
    result.completed
      ? "Continue Campaign"
      : "Next Hidden Encounter";

  if (rewardCredits > 0) {
    updateDataSummary();
  }
  renderCodex();
}

function currentHiddenEncounterState(): HiddenEncounterState {
  return hiddenDiscovery.encounter ?? createHiddenEncounterState();
}

function setHiddenEncounterState(state: HiddenEncounterState): void {
  hiddenDiscovery = {
    ...hiddenDiscovery,
    encounter: state,
  };
  game.setHiddenDiscoveryState(hiddenDiscovery);
}

function hiddenMusicState(kind: HiddenEncounterKind): MusicState {
  if (kind === "champion-hunt") return "CHAMPION_HUNT";
  if (kind === "hidden-world") return "HIDDEN_WORLD";
  return "HIDDEN_CHALLENGE";
}

function renderHiddenEncounterOffers(targetStage: number): void {
  const panel = byId("hiddenEncounterPanel");
  const grid = byId("hiddenEncounterGrid");
  grid.replaceChildren();

  const state = currentHiddenEncounterState();
  const active = state.active;
  if (active !== null) {
    panel.classList.remove("hidden");
    byId("hiddenEncounterTitle").textContent =
      hiddenEncounterLabel(active);
    byId("hiddenEncounterMeta").textContent =
      "Crash-safe optional encounter · Campaign Stage " +
      String(active.sourceStage).padStart(3, "0") +
      " remains unchanged";

    const card = document.createElement("article");
    card.className = "route-hidden-card active";
    const title = document.createElement("strong");
    title.textContent = "Resume " + hiddenEncounterLabel(active);
    const meta = document.createElement("small");
    meta.textContent =
      active.kind === "hidden-world"
        ? "Encounter " +
          String(active.step) +
          " / " +
          String(active.totalSteps)
        : "Tier " + String(active.tier);
    const resume = document.createElement("button");
    resume.type = "button";
    resume.className = "primary";
    resume.textContent = "Resume";
    resume.addEventListener("click", () => {
      if (routeDialog.open) routeDialog.close();
      void startSelectedStage();
    });
    card.append(title, meta, resume);
    grid.append(card);
    return;
  }

  const offers = hiddenEncounterOffers(
    hiddenDiscovery,
    state,
    targetStage,
  );
  panel.classList.toggle("hidden", offers.length === 0);
  if (offers.length === 0) return;

  byId("hiddenEncounterTitle").textContent = "Hidden Encounters";
  byId("hiddenEncounterMeta").textContent =
    "Optional · choose Tier I-III or skip permanently for this sector";

  for (const offer of offers) {
    const card = document.createElement("article");
    card.className =
      "route-hidden-card route-hidden-" + offer.kind;

    const title = document.createElement("strong");
    title.textContent = offer.label;
    const description = document.createElement("small");
    description.textContent = offer.description;

    const actions = document.createElement("div");
    actions.className = "route-hidden-actions";

    for (const tier of HIDDEN_CHALLENGE_TIERS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Tier " + String(tier);
      if (tier === 3) button.className = "primary";
      button.addEventListener("click", () => {
        void beginHiddenEncounter(offer, tier);
      });
      actions.append(button);
    }

    const skip = document.createElement("button");
    skip.type = "button";
    skip.textContent = "Skip";
    skip.addEventListener("click", () => {
      void skipCurrentHiddenEncounterOffer(offer);
    });
    actions.append(skip);

    card.append(title, description, actions);
    grid.append(card);
  }
}

async function beginHiddenEncounter(
  offer: HiddenEncounterOffer,
  tier: HiddenChallengeTier,
): Promise<void> {
  const previous = hiddenDiscovery;
  setHiddenEncounterState(
    startHiddenEncounter(
      currentHiddenEncounterState(),
      offer,
      tier,
    ),
  );

  const saved = await autosaveCampaign(
    "hidden-transition",
    "✓ " + offer.label + " Tier " + String(tier) + " locked",
    "hidden-transition",
  );
  if (!saved) {
    hiddenDiscovery = previous;
    game.setHiddenDiscoveryState(hiddenDiscovery);
    renderHiddenEncounterOffers(routeTargetStage());
    return;
  }

  if (routeDialog.open) routeDialog.close();
  void startSelectedStage();
}

async function skipCurrentHiddenEncounterOffer(
  offer: HiddenEncounterOffer,
): Promise<void> {
  const previous = hiddenDiscovery;
  setHiddenEncounterState(
    skipHiddenEncounter(
      currentHiddenEncounterState(),
      offer.id,
    ),
  );

  const saved = await autosaveCampaign(
    "hidden-transition",
    "✓ " + offer.label + " skipped for this sector",
    "hidden-transition",
  );
  if (!saved) {
    hiddenDiscovery = previous;
    game.setHiddenDiscoveryState(hiddenDiscovery);
  }
  renderHiddenEncounterOffers(routeTargetStage());
}

let routeChoicePending = false;

function renderRouteMap(): void {
  const targetStage = routeTargetStage();
  route = syncRouteStateForStage(route, targetStage);

  const progress = routeProgress(route);
  byId("routeTitle").textContent =
    "Sector " +
    String(route.graph.sectorStart).padStart(3, "0") +
    "-" +
    String(route.graph.sectorEnd).padStart(3, "0");
  const linearSector = route.graph.steps.every((step) => step.nodes.length === 1);
  byId("routeMeta").textContent = linearSector
    ? "Ten sequential combat stages · boss and checkpoint rest hub at Stage " +
      String(route.graph.sectorEnd).padStart(3, "0") +
      ". Campaign Map is for unlocked-stage replay."
    : "Existing saved branching sector · " +
      String(progress.chosen) + "/" + String(progress.total) +
      " route choices · old lanes remain available until the next checkpoint.";

  const map = byId("routeMap");
  map.replaceChildren();
  map.classList.toggle("route-sector-briefing", linearSector);

  for (const step of route.graph.steps) {
    if (linearSector) {
      const node = document.createElement("div");
      const role = stageRole(step.stage);
      const cleared = campaign.clearedStages.includes(step.stage);
      node.className = "route-sector-node" +
        (cleared ? " cleared" : "") +
        (step.stage === targetStage ? " current" : "") +
        (role.includes("boss") ? " boss" : "");
      const number = document.createElement("strong");
      number.textContent = String(step.stage).padStart(3, "0");
      const description = document.createElement("span");
      description.textContent = role.includes("boss") ? "♛ Boss" :
        step.stage % 10 === 0 ? "⚑ Checkpoint" :
        cleared ? "✓ Cleared" : step.stage === targetStage ? "◆ Next" : "Combat";
      node.append(number, description);
      map.append(node);
      continue;
    }
    const row = document.createElement("section");
    row.className =
      "route-step" +
      (step.stage === targetStage ? " route-step-current" : "");

    const stageLabel = document.createElement("strong");
    stageLabel.className = "route-stage-label";
    stageLabel.textContent =
      "Stage " + String(step.stage).padStart(3, "0");

    const nodes = document.createElement("div");
    nodes.className = "route-node-row";

    const chosenId = route.selectedByStage[String(step.stage)];
    for (const node of step.nodes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "route-node route-node-" + node.type;
      button.dataset.nodeId = node.id;

      const isSelected =
        chosenId === node.id ||
        (step.nodes.length === 1 && node.mandatory);
      if (isSelected) {
        button.classList.add("selected");
        if (step.stage === targetStage && step.nodes.length > 1) {
          button.classList.add("current-choice");
        }
      }
      if (
        step.stage !== targetStage &&
        route.visitedNodeIds.includes(node.id)
      ) {
        button.classList.add("visited");
      }
      if (step.stage === targetStage) {
        button.setAttribute("aria-pressed", String(isSelected));
      }

      button.disabled =
        step.stage !== targetStage ||
        routeChoicePending ||
        isSelected ||
        step.nodes.length === 1;

      const name = document.createElement("strong");
      name.textContent = routeNodeLabel(node.type);

      const meta = document.createElement("small");
      meta.textContent =
        node.mandatory
          ? "Mandatory"
          : "Lane " + String(node.lane + 1);

      button.append(name, meta);
      button.addEventListener("click", () => {
        void chooseCurrentRouteNode(node.id);
      });
      nodes.append(button);
    }

    row.append(stageLabel, nodes);
    map.append(row);
  }

  const selected = selectedRouteNode(route, targetStage);
  const panel = byId("routeSelectedPanel");
  const shopAction =
    byId<HTMLButtonElement>("routeShopAction");
  const stationShopAction =
    byId<HTMLButtonElement>("routeStationShopAction");
  const serviceAction =
    byId<HTMLButtonElement>("routeServiceAction");
  const supportAction =
    byId<HTMLButtonElement>("routeSupportAction");
  const continueButton =
    byId<HTMLButtonElement>("routeContinueButton");

  if (selected === null) {
    panel.classList.add("hidden");
    byId("hiddenEncounterPanel").classList.add("hidden");
    continueButton.disabled = true;
    return;
  }

  panel.classList.remove("hidden");
  byId("routeSelectedTitle").textContent =
    routeNodeLabel(selected.type) +
    " · Stage " +
    String(selected.targetStage).padStart(3, "0");
  byId("routeSelectedMeta").textContent = linearSector
    ? "Mandatory combat encounter · shop and maintenance services are available together at the end-of-sector rest hub."
    : routeNodeDescription(selected);

  shopAction.classList.toggle(
    "hidden",
    selected.type !== "shop",
  );
  stationShopAction.classList.toggle(
    "hidden",
    selected.type !== "station",
  );
  serviceAction.classList.toggle(
    "hidden",
    selected.type !== "station",
  );
  supportAction.classList.toggle(
    "hidden",
    selected.type !== "station",
  );
  const hasOptionalService =
    selected.type === "shop" || selected.type === "station";
  byId("routeServiceGroup").classList.toggle(
    "hidden",
    !hasOptionalService,
  );
  continueButton.textContent =
    "Start Stage " + String(selected.targetStage).padStart(3, "0");
  continueButton.title = hasOptionalService
    ? "Services are optional. Start the encounter when you are ready."
    : "Start the selected combat encounter.";
  for (const button of [
    shopAction,
    stationShopAction,
    serviceAction,
    supportAction,
    continueButton,
  ]) {
    button.disabled = routeChoicePending;
  }
  renderHiddenEncounterOffers(targetStage);
}

async function chooseCurrentRouteNode(
  nodeId: string,
): Promise<void> {
  // Save the preview before accepting another click or starting an encounter.
  // The active frontier can switch lanes until Start Encounter commits entry.
  if (routeChoicePending || !canOpenBetweenStageMenu()) return;
  const targetStage = routeTargetStage();
  const previousRoute = route;
  const previousExpansion = campaignExpansion;
  const previousRecovery = crashRecoverySnapshot;
  const next = selectRouteNode(route, targetStage, nodeId, true);

  if (
    next.selectedByStage[String(targetStage)] ===
    previousRoute.selectedByStage[String(targetStage)]
  ) {
    return;
  }

  routeChoicePending = true;
  route = next;
  renderRouteMap();

  try {
    const saved = await autosaveCampaign(
      "route-choice",
      "✓ Route selected · Stage " +
        String(targetStage).padStart(3, "0"),
      "route-choice",
    );
    if (!saved) {
      route = previousRoute;
      campaignExpansion = previousExpansion;
      crashRecoverySnapshot = previousRecovery;
    }
  } finally {
    routeChoicePending = false;
    renderRouteMap();
  }
}

function openRouteMap(): void {
  if (
    ascension.selectedTier > 0 ||
    !persistenceReady ||
    !canOpenBetweenStageMenu()
  ) {
    return;
  }

  route = syncRouteStateForStage(
    route,
    routeTargetStage(),
  );
  renderRouteMap();
  if (!routeDialog.open) routeDialog.showModal();
}

function openRestHub(): void {
  const stage = pendingRestHubStage(shops);
  if (
    stage === null ||
    !persistenceReady ||
    ascension.selectedTier > 0 ||
    (game.getPhase() !== "title" && game.getPhase() !== "stageclear")
  ) return;
  byId("restHubMeta").textContent =
    "Stage " + String(stage).padStart(3, "0") +
    " cleared · checkpoint saved · choose either or both services";
  if (!restHubDialog.open) restHubDialog.showModal();
}

let restHubContinuePending = false;
async function continueRestHub(): Promise<void> {
  if (restHubContinuePending || pendingRestHubStage(shops) === null) return;
  restHubContinuePending = true;
  const button = byId<HTMLButtonElement>("restHubContinue");
  button.disabled = true;
  const previousShop = shops;
  const previousSnapshot = checkpointSnapshot;
  const previousExpansion = campaignExpansion;
  const previousRecovery = crashRecoverySnapshot;
  try {
    shops = dismissRestHub(shops);
    // Commit post-checkpoint purchases alongside the next sector's starting
    // loadout. Without this, a later death could reroll consumed shop stock.
    checkpointSnapshot = createCheckpointSnapshot(
      currentRunPersistentState(),
      campaignExpansion.checkpoint.stage,
    );
    const saved = await autosaveCampaign(
      "shop",
      "✓ Checkpoint rest complete · loadout saved",
      "shop",
    );
    if (!saved) {
      shops = previousShop;
      checkpointSnapshot = previousSnapshot;
      campaignExpansion = previousExpansion;
      crashRecoverySnapshot = previousRecovery;
      return;
    }
    if (restHubDialog.open) restHubDialog.close();
    game.backToTitle();
    await startSelectedStage();
  } finally {
    restHubContinuePending = false;
    button.disabled = false;
  }
}

function closeRouteAndOpen(action: () => void): void {
  if (routeDialog.open) routeDialog.close();
  action();
}

function hiddenStageConfig(
  active: ActiveHiddenEncounter,
): StageConfig {
  const base = createStageConfig(active.sourceStage);
  const finalHiddenWorldBoss =
    active.kind === "hidden-world" &&
    active.step === active.totalSteps;

  return {
    ...base,
    role: finalHiddenWorldBoss ? "boss" : "normal",
  };
}

async function startActiveHiddenEncounter(
  active: ActiveHiddenEncounter,
): Promise<void> {
  game.setCharacter(characters.selected);
  const stage = hiddenStageConfig(active);
  const vocabularyLevel = selectedVocabularyLevel();
  game.setVocabularyLevel(vocabularyLevel);
  await prepareStageVocabulary(stage);

  const baseDifficulty = difficultyFor(
    difficultyInputFromSettings(
      difficultySettings,
      active.sourceStage,
      vocabularyLevel,
    ),
  );
  const difficulty = applyAscensionDifficulty(
    hiddenEncounterDifficulty(
      baseDifficulty,
      active.kind,
      active.tier,
    ),
    ascension.selectedTier,
    active.sourceStage,
  );
  const runtime = hiddenEncounterRuntime(
    active,
    difficulty,
  );
  activeStageDifficulty = difficulty;

  const stageEntryAt = new Date().toISOString();
  stageEntrySnapshot = createStageEntrySnapshot(
    currentRunPersistentState(),
    campaignExpansion,
    checkpointSnapshot,
    stageEntryAt,
  );

  const recoverySaved = await autosaveCampaign(
    "hidden-transition",
    undefined,
    "hidden-transition",
  );
  if (!recoverySaved) return;

  const musicStage =
    runtime.environmentStageOverride ??
    active.sourceStage;
  musicController.setWorldProfile(
    musicProfileForWorld(worldForStage(musicStage)),
  );
  musicController.setBossPhase(1);
  const state = hiddenMusicState(active.kind);
  musicController.transitionTo(
    state,
    musicCrossfadeSeconds(state),
  );
  musicController.setPaused(false);

  await presentStageTransition(
    createHiddenTransitionSpec(
      hiddenEncounterLabel(active),
      active.sourceStage,
    ),
  );

  game.startStage(
    stage,
    difficulty,
    runtime,
  );
}

async function startSelectedStage(): Promise<void> {
  if (
    !persistenceReady ||
    !vocabularyReady ||
    stageStartPending ||
    routeChoicePending
  ) return;
  // Do not let rapid Next clicks skip an unvisited checkpoint rest stop.
  if (pendingRestHubStage(shops) !== null && ascension.selectedTier === 0) {
    openRestHub();
    return;
  }

  const activeHidden = currentHiddenEncounterState().active;
  if (activeHidden !== null) {
    stageStartPending = true;
    try {
      await startActiveHiddenEncounter(activeHidden);
    } finally {
      stageStartPending = false;
    }
    return;
  }

  if (
    ascension.selectedTier === 0 &&
    campaign.selectedStage === campaign.highestUnlockedStage
  ) {
    route = syncRouteStateForStage(
      route,
      campaign.highestUnlockedStage,
    );
    if (routeNeedsChoice(route, campaign.selectedStage)) {
      openRouteMap();
      return;
    }
  }

  stageStartPending = true;

  try {
    game.setCharacter(characters.selected);
    const gameplayStage = selectedGameplayStage();
    campaign = {
      ...campaign,
      selectedStage: gameplayStage,
    };
    const stage = createStageConfig(gameplayStage);
    const world = worldForStage(stage.stage);
    const vocabularyLevel = selectedVocabularyLevel();
    game.setVocabularyLevel(vocabularyLevel);
    await prepareStageVocabulary(stage);
    const difficulty = applyAscensionDifficulty(
      difficultyFor(
        difficultyInputFromSettings(
          difficultySettings,
          stage.stage,
          vocabularyLevel,
        ),
      ),
      ascension.selectedTier,
      stage.stage,
    );
    activeStageDifficulty = difficulty;

    const stageEntryAt = new Date().toISOString();
    stageEntrySnapshot = createStageEntrySnapshot(
      currentRunPersistentState(),
      campaignExpansion,
      checkpointSnapshot,
      stageEntryAt,
    );

    const recoverySaved = await autosaveCampaign(
      "stage-entry",
      undefined,
      "stage-entry",
    );
    if (!recoverySaved) return;

    syncWorldMusicProfile(stage.stage);
    musicController.setBossPhase(1);
    const musicState = musicStateForStageRole(stage.role);
    musicController.transitionTo(
      musicState,
      musicCrossfadeSeconds(musicState),
    );
    musicController.setPaused(false);

    if (world.stageEnd < 1000 && stageInWorld(stage.stage) >= 18) {
      musicController.preloadNext(
        musicProfileForWorld(worldForStage(world.stageEnd + 1)),
      );
    }

    await presentStageTransition(
      createStageTransitionSpec({
        stage: stage.stage,
        galaxy: stage.galaxy,
        stageInGalaxy: stage.stageInGalaxy,
        stageInWorld: stageInWorld(stage.stage),
        worldName: world.name,
        role: stage.role,
      }),
    );

    game.startStage(stage, difficulty);
  } finally {
    stageStartPending = false;
  }
}

async function autosaveCampaign(
  reason: SaveReason,
  successMessage?: string,
  recoveryReason?: CrashRecoveryReason,
): Promise<boolean> {
  if (recoveryReason !== undefined) {
    captureSafeCrashRecovery(recoveryReason);
  }

  campaignAutosave.schedule(
    currentAutosaveSnapshot(),
    reason,
  );

  try {
    const source = await campaignAutosave.flush();

    if (successMessage !== undefined && source !== null) {
      showNotice(
        successMessage +
          (source === "localStorage" ? " · recovery storage" : ""),
      );
    }
    return true;
  } catch (error) {
    console.error("Unable to save player progress.", error);
    showNotice("Save failed · progress is still active in this session");
    return false;
  }
}

async function initializePlayerProgress(): Promise<void> {
  const startButton = byId<HTMLButtonElement>("startButton");
  const stageSelectButton =
    byId<HTMLButtonElement>("stageSelectButton");
  const routeButton = byId<HTMLButtonElement>("routeButton");
  const dataButtons = [
    byId<HTMLButtonElement>("dataButton"),
    byId<HTMLButtonElement>("pauseDataButton"),
  ];
  const equipmentButton =
    byId<HTMLButtonElement>("equipmentButton");
  const shopButton = byId<HTMLButtonElement>("shopButton");
  const stationShopButton =
    byId<HTMLButtonElement>("stationShopButton");
  const travelingShopButton =
    byId<HTMLButtonElement>("travelingShopButton");
  const serviceShopButton =
    byId<HTMLButtonElement>("serviceShopButton");
  const blackMarketButton =
    byId<HTMLButtonElement>("blackMarketButton");
  const hiddenShopButton =
    byId<HTMLButtonElement>("hiddenShopButton");
  const eventShopButton =
    byId<HTMLButtonElement>("eventShopButton");
  const supportButton =
    byId<HTMLButtonElement>("supportButton");
  const characterButton =
    byId<HTMLButtonElement>("characterButton");
  const codexButton = byId<HTMLButtonElement>("codexButton");
  const ascensionButton = byId<HTMLButtonElement>("ascensionButton");
  const progressionButton =
    byId<HTMLButtonElement>("progressionButton");

  startButton.disabled = true;
  stageSelectButton.disabled = true;
  routeButton.disabled = true;
  equipmentButton.disabled = true;
  shopButton.disabled = true;
  stationShopButton.disabled = true;
  travelingShopButton.disabled = true;
  serviceShopButton.disabled = true;
  blackMarketButton.disabled = true;
  hiddenShopButton.disabled = true;
  eventShopButton.disabled = true;
  supportButton.disabled = true;
  characterButton.disabled = true;
  codexButton.disabled = true;
  ascensionButton.disabled = true;
  progressionButton.disabled = true;
  for (const button of dataButtons) button.disabled = true;

  try {
    const loaded = await loadPlayerSave();
    campaign = loaded.save.campaign;
    inventory = loaded.save.inventory;
    equipment = loaded.save.equipment;
    supportSpells = loaded.save.supportSpells;
    hotbar = loaded.save.hotbar;
    luckPity = loaded.save.luckPity;
    hiddenDiscovery = loaded.save.hiddenDiscovery;
    credits = loaded.save.credits;
    progression = loaded.save.progression;
    upgrades = loaded.save.upgrades;
    relics = loaded.save.relics;
    codex = loaded.save.codex;
    ascension = loaded.save.ascension;
    const loadedAscensionStage = currentAscensionStage(ascension);
    if (loadedAscensionStage !== null) {
      campaign = {
        ...campaign,
        selectedStage: loadedAscensionStage,
      };
    }
    expansionCurrencies = loaded.save.expansionCurrencies;
    shops = loaded.save.shops;
    route = loaded.save.route;
    campaignExpansion = loaded.save.campaignExpansion;
    checkpointSnapshot = loaded.save.checkpointSnapshot;
    crashRecoverySnapshot = loaded.save.crashRecoverySnapshot;
    stageEntrySnapshot = loaded.save.stageEntrySnapshot;
    syncProgressionAchievements();
    game.setLuckPityState(luckPity);
    game.setHiddenDiscoveryState(hiddenDiscovery);
    const loadedCharacters = loaded.save.characters;
    characters = syncCharacterUnlocks(
      loadedCharacters,
      loaded.save.campaign.clearedStages,
    );
    applySelectedCharacter();
    renderInventory();
    applyEquipmentStats();
    applySupportSpells();
    applyRelicEffects();
    currentGalaxy = Math.ceil(
      campaign.selectedStage / STAGES_PER_GALAXY,
    );
    persistenceReady = true;

    syncWorldMusicProfile(campaign.selectedStage);
    musicController.transitionTo("WORLD_NORMAL", 0.8);
    updateCampaignUi();
    startButton.disabled = !vocabularyReady;
    const ascensionActive = ascension.selectedTier > 0;
    stageSelectButton.disabled = ascensionActive;
    routeButton.disabled = ascensionActive;
    equipmentButton.disabled = false;
    shopButton.disabled = false;
    stationShopButton.disabled = false;
    travelingShopButton.disabled = false;
    serviceShopButton.disabled = false;
    blackMarketButton.disabled = false;
    hiddenShopButton.disabled = false;
    eventShopButton.disabled = false;
    supportButton.disabled = false;
    characterButton.disabled = false;
    codexButton.disabled = false;
    ascensionButton.disabled = false;
    progressionButton.disabled = false;
    renderCodex();
    renderAscension();
    renderProgression();
    renderServiceShop();
    updateShopAccess();
    for (const button of dataButtons) button.disabled = false;
    if (pendingRestHubStage(shops) !== null && ascension.selectedTier === 0) {
      openRestHub();
    }

    if (characters.unlocked.length !== loadedCharacters.unlocked.length) {
      void autosaveCampaign(
        "character",
        "✓ Character milestone unlocks synchronized",
      );
    }

    if (loaded.recoveryMode === "death-rollback") {
      showNotice(
        "Death record enforced · returned to checkpoint " +
          checkpointDisplayLabel(),
      );
    } else if (loaded.recoveryMode === "crash") {
      showNotice(
        "✓ Recovered last safe transition · " +
          (ascension.selectedTier > 0
            ? "A" +
              String(ascension.selectedTier) +
              " Stage "
            : "Stage ") +
          String(campaign.selectedStage).padStart(3, "0"),
      );
    } else if (loaded.migrated) {
      showNotice("✓ Existing progress migrated to IndexedDB");
    } else if (loaded.source === "localStorage") {
      showNotice("IndexedDB unavailable · using recovery storage");
    }
  } catch (error) {
    console.error("Unable to initialize player progress.", error);
    if (error instanceof UnsupportedPlayerSaveVersionError) {
      showNotice(
        "Save is from a newer game version · update Space Typing before playing",
      );
      return;
    }

    showNotice("Unable to load player progress");
  }
}

function updateCampaignUi(): void {
  const gameplayStage = selectedGameplayStage();
  byId<HTMLButtonElement>("nextStageButton").textContent = "Next stage";
  byId("startButton").textContent =
    "Continue · Stage " +
    String(gameplayStage).padStart(3, "0") +
    (ascension.selectedTier > 0
      ? " · A" + String(ascension.selectedTier)
      : "");
  renderAscension();
  const selectedWorld = worldForStage(gameplayStage);
  musicController.setWorldProfile(
    musicProfileForWorld(selectedWorld),
  );
  byId("titleWorldMeta").textContent =
    worldLabel(selectedWorld) +
    " · Stage " +
    String(selectedWorld.stageStart).padStart(3, "0") +
    "-" +
    String(selectedWorld.stageEnd).padStart(3, "0");
  byId("campaignMeta").textContent =
    "Unlocked " +
    String(campaign.highestUnlockedStage).padStart(3, "0") +
    " / 1000 · " +
    worldLabel(selectedWorld) +
    " · checkpoint " +
    (ascension.selectedTier > 0
      ? "A" +
        String(ascension.selectedTier) +
        "-" +
        String(
          Math.floor((Math.max(1, gameplayStage) - 1) / 10) * 10 + 1,
        ).padStart(3, "0")
      : String(campaignExpansion.checkpoint.stage).padStart(3, "0")) +
    " · record " +
    String(campaignExpansion.activeSegment.highestReachedStage).padStart(3, "0") +
    " · " +
    getCharacter(characters.selected).name;

  const ascensionActive = ascension.selectedTier > 0;
  for (const id of [
    "stageSelectButton",
    "pauseStageSelectButton",
    "clearStageSelectButton",
    "routeButton",
  ]) {
    byId<HTMLButtonElement>(id).disabled = ascensionActive;
  }

  currentGalaxy = Math.min(
    GALAXY_COUNT,
    Math.max(1, Math.ceil(gameplayStage / STAGES_PER_GALAXY)),
  );
}

function populateGalaxySelect(): void {
  const select = byId<HTMLSelectElement>("galaxySelect");
  if (select.options.length > 0) return;

  for (let galaxy = 1; galaxy <= GALAXY_COUNT; galaxy += 1) {
    const option = document.createElement("option");
    const firstStage = (galaxy - 1) * STAGES_PER_GALAXY + 1;
    const lastStage = galaxy * STAGES_PER_GALAXY;
    option.value = String(galaxy);
    option.textContent =
      "Galaxy " +
      String(galaxy).padStart(2, "0") +
      " · " +
      String(firstStage).padStart(3, "0") +
      "-" +
      String(lastStage).padStart(3, "0");
    option.disabled = firstStage > campaign.highestUnlockedStage;
    select.append(option);
  }
}

function populateJourneyWorldSelect(): void {
  const select = byId<HTMLSelectElement>("journeyWorldSelect");
  select.replaceChildren();
  for (let slot = 0; slot < 5; slot += 1) {
    const number = (currentGalaxy - 1) * 5 + slot + 1;
    const world = worldForStage((number - 1) * 20 + 1);
    const option = document.createElement("option");
    option.value = String(number);
    option.textContent =
      "World " + String(number).padStart(2, "0") + " · " + world.name;
    option.disabled = world.stageStart > campaign.highestUnlockedStage;
    select.append(option);
  }
  const firstWorld = (currentGalaxy - 1) * 5 + 1;
  if (
    selectedJourneyWorld < firstWorld ||
    selectedJourneyWorld >= firstWorld + 5
  ) {
    selectedJourneyWorld = firstWorld;
  }
  select.value = String(selectedJourneyWorld);
}

function renderStagePreview(): void {
  const stage = selectedJourneyStage;
  const world = worldForStage(stage);
  const node = journeyNodesForStage(stage).find((entry) => entry.stage === stage)!;
  const isUnlocked = canSelectCampaignStage(
    campaign,
    campaignExpansion,
    stage,
  );
  const cleared = campaign.clearedStages.includes(stage);
  const title = byId("stagePreviewTitle");
  title.textContent =
    "Stage " + String(stage).padStart(3, "0") +
    " · " + (node.role === "normal" ? "Combat" : node.role.replace(/-/g, " "));
  byId("stagePreviewMeta").textContent =
    world.name + " · " +
    (cleared ? "Cleared · Replay available" : isUnlocked ? "Current frontier" : "Locked") +
    (node.checkpoint ? " · Checkpoint milestone" : "");
  const start = byId<HTMLButtonElement>("journeyStartButton");
  start.disabled = !isUnlocked;
  start.textContent = cleared ? "Replay Stage" : "Start Stage";
}

function renderStageGrid(): void {
  const scroll = byId("stageGrid");
  scroll.replaceChildren();

  const world = worldForStage((selectedJourneyWorld - 1) * 20 + 1);
  const nodes = journeyNodesForStage(world.stageStart);
  byId("journeyWorldTitle").textContent =
    "World " + String(selectedJourneyWorld).padStart(2, "0") +
    " · " + world.name;

  const board = document.createElement("div");
  board.className = "stage-journey";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "stage-journey-path");
  svg.setAttribute("viewBox", "0 0 1000 1780");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const base = document.createElementNS("http://www.w3.org/2000/svg", "path");
  base.setAttribute("d", journeyPath(nodes));
  base.setAttribute("class", "stage-journey-track");
  const active = document.createElementNS("http://www.w3.org/2000/svg", "path");
  active.setAttribute(
    "d",
    journeyPath(nodes.filter((node) => node.stage <= campaign.highestUnlockedStage)),
  );
  active.setAttribute("class", "stage-journey-progress");
  svg.append(base, active);
  board.append(svg);

  const cleared = new Set(campaign.clearedStages);
  const current = campaign.highestUnlockedStage;
  for (const node of nodes) {
    const unlocked = canSelectCampaignStage(campaign, campaignExpansion, node.stage);
    const isCleared = cleared.has(node.stage);
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "journey-node" +
      (node.role !== "normal" ? " journey-node-special" : "") +
      (node.role.includes("boss") ? " journey-node-boss" : "") +
      (node.checkpoint ? " journey-node-checkpoint" : "") +
      (isCleared ? " cleared" : "") +
      (!unlocked ? " locked" : "") +
      (node.stage === current ? " frontier" : "") +
      (node.stage === selectedJourneyStage ? " selected" : "");
    button.style.left = String(node.x) + "%";
    button.style.top = String(node.y) + "px";
    button.disabled = !unlocked;
    button.dataset.stage = String(node.stage);
    button.setAttribute("aria-pressed", String(node.stage === selectedJourneyStage));
    const label = document.createElement("strong");
    label.textContent = String(node.stage).padStart(3, "0");
    button.append(label);
    if (node.role !== "normal" || node.checkpoint) {
      const badge = document.createElement("span");
      badge.className = "journey-node-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = node.role.includes("boss") ? "♛" :
        node.role === "elite" ? "✦" : node.checkpoint ? "⚑" : "★";
      button.append(badge);
    }
    const roleLabel = node.role.replace(/-/g, " ");
    button.setAttribute("aria-label",
      "Stage " + node.stage + ", " + roleLabel +
      (node.checkpoint ? ", checkpoint" : "") +
      (isCleared ? ", cleared" : !unlocked ? ", locked" : ", playable"));
    if (node.stage === current) {
      const ship = document.createElement("span");
      ship.className = "journey-ship";
      ship.setAttribute("aria-hidden", "true");
      ship.textContent = "◆";
      button.append(ship);
    }
    button.addEventListener("click", () => {
      selectedJourneyStage = node.stage;
      for (const sibling of board.querySelectorAll<HTMLButtonElement>(".journey-node")) {
        const selected = sibling === button;
        sibling.classList.toggle("selected", selected);
        sibling.setAttribute("aria-pressed", String(selected));
      }
      renderStagePreview();
    });
    board.append(button);
  }
  scroll.append(board);
  renderStagePreview();
}

function focusJourneyFrontier(): void {
  const scroll = byId("stageGrid");
  const node = scroll.querySelector<HTMLElement>(
    '[data-stage="' + String(Math.max((selectedJourneyWorld - 1) * 20 + 1,
      Math.min(selectedJourneyWorld * 20, campaign.highestUnlockedStage))) + '"]',
  );
  if (node !== null) {
    scroll.scrollTop = Math.max(0, node.offsetTop - scroll.clientHeight / 2);
  }
}

function openStageSelect(): void {
  if (ascension.selectedTier > 0) {
    showNotice("Stage Select is disabled during an Ascension run.");
    return;
  }
  populateGalaxySelect();
  selectedJourneyStage = campaign.selectedStage;
  currentGalaxy = Math.ceil(selectedJourneyStage / STAGES_PER_GALAXY);
  selectedJourneyWorld = Math.ceil(selectedJourneyStage / 20);
  const select = byId<HTMLSelectElement>("galaxySelect");

  for (const option of Array.from(select.options)) {
    const galaxy = Number(option.value);
    option.disabled = !canSelectCampaignStage(
      campaign,
      campaignExpansion,
      (galaxy - 1) * STAGES_PER_GALAXY + 1,
    );
  }

  select.value = String(currentGalaxy);
  populateJourneyWorldSelect();
  renderStageGrid();
  stageSelectDialog.showModal();
  focusJourneyFrontier();
}

function saveSettings(): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  game.updateSettings(settings);
  musicController.setMusicVolume(settings.musicVolume);
  musicController.setAmbientVolume(settings.ambientVolume);
  updateKillTranslationVisibility(game.getPhase());
}

function renderSettings(): void {
  const volume = byId<HTMLInputElement>("sfxVolume");
  volume.value = String(settings.sfxVolume);
  byId<HTMLOutputElement>("sfxValue").value =
    String(Math.round(settings.sfxVolume * 100)) + "%";

  const musicVolume = byId<HTMLInputElement>("musicVolume");
  musicVolume.value = String(settings.musicVolume);
  byId<HTMLOutputElement>("musicValue").value =
    String(Math.round(settings.musicVolume * 100)) + "%";

  const ambientVolume = byId<HTMLInputElement>("ambientVolume");
  ambientVolume.value = String(settings.ambientVolume);
  byId<HTMLOutputElement>("ambientValue").value =
    String(Math.round(settings.ambientVolume * 100)) + "%";

  byId<HTMLSelectElement>("screenShake").value =
    String(settings.screenShake);
  byId<HTMLSelectElement>("visualQuality").value =
    settings.visualQuality;

  byId<HTMLSelectElement>("pronunciationEnabled").value =
    String(settings.pronunciationEnabled);
  const killSettings = currentKillTranslationSettings();
  byId<HTMLSelectElement>("killTranslationEnabled").value =
    String(killSettings.enabled);
  byId<HTMLSelectElement>("killTranslationIpa").value =
    String(killSettings.showIpa);
  byId<HTMLSelectElement>("killTranslationVi").value =
    String(killSettings.showVietnamese);
  byId<HTMLSelectElement>("killTranslationSize").value = killSettings.size;
  byId<HTMLInputElement>("killTranslationDuration").value =
    String(killSettings.durationSeconds);
  byId<HTMLOutputElement>("killTranslationDurationValue").value =
    killSettings.durationSeconds.toFixed(1) + "s";

  const rate = byId<HTMLInputElement>("pronunciationRate");
  rate.value = String(settings.pronunciationRate);
  byId<HTMLOutputElement>("pronunciationRateValue").value =
    settings.pronunciationRate.toFixed(2) + "x";

  const voiceVolume = byId<HTMLInputElement>("pronunciationVolume");
  voiceVolume.value = String(settings.pronunciationVolume);
  byId<HTMLOutputElement>("pronunciationVolumeValue").value =
    String(Math.round(settings.pronunciationVolume * 100)) + "%";

  const difficultyMode = byId<HTMLSelectElement>("difficultyMode");
  difficultyMode.value = difficultySettings.mode;

  const modeDefinition = difficultyModeDefinition(
    difficultySettings.mode,
    difficultySettings.profile.smoothedWpm,
    difficultySettings.customTargetWpm,
    difficultySettings.customPressure,
  );
  const modePresentation =
    difficultyModePresentation(modeDefinition);
  byId<HTMLOutputElement>("difficultyWpmValue").value =
    modePresentation.recommendedWpm;
  byId<HTMLOutputElement>("difficultyDensityValue").value =
    modePresentation.enemyDensity;
  byId<HTMLOutputElement>("difficultyCcValue").value =
    modePresentation.ccPressure;
  byId<HTMLOutputElement>("difficultyReactionValue").value =
    modePresentation.reactionWindow;
  byId<HTMLOutputElement>("difficultyFormationValue").value =
    modePresentation.formationComplexity;
  byId<HTMLOutputElement>("difficultyRewardValue").value =
    modePresentation.rewardMultiplier;

  byId<HTMLOutputElement>("adaptiveProfileValue").value =
    difficultySettings.profile.smoothedWpm.toFixed(0) +
    " WPM · " +
    difficultySettings.profile.smoothedAccuracy.toFixed(1) +
    "% · " +
    String(difficultySettings.profile.samples) +
    " clears";

  const customTargetWpm = byId<HTMLInputElement>("customTargetWpm");
  customTargetWpm.value = String(difficultySettings.customTargetWpm);
  customTargetWpm.disabled = difficultySettings.mode !== "custom";

  const customPressure = byId<HTMLInputElement>("customPressure");
  customPressure.value = difficultySettings.customPressure.toFixed(2);
  customPressure.disabled = difficultySettings.mode !== "custom";
  const customEnabled = difficultySettings.mode === "custom";
  byId("customCombatControls").classList.toggle("disabled", !customEnabled);
  for (const id of ["customEnemySpeed", "customBulletSpeed", "customFireRate", "customSpawnRate"] as const) {
    const control = byId<HTMLInputElement>(id);
    control.value = String(difficultySettings[id]);
    control.disabled = !customEnabled;
    byId<HTMLOutputElement>(id + "Value").value = difficultySettings[id].toFixed(2) + "×";
  }
}

function openSettings(): void {
  renderSettings();
  settingsDialog.showModal();
}

async function ensureVocabularyIndex(): Promise<VocabularyIndex> {
  vocabularyIndex ??= await loadVocabularyIndex();
  return vocabularyIndex;
}

async function ensureVocabularyTopicIndex(): Promise<VocabularyTopicIndex> {
  vocabularyTopicIndex ??= await loadVocabularyTopicIndex();
  return vocabularyTopicIndex;
}

async function ensureVocabularyPosIndex(): Promise<VocabularyPosIndex> {
  vocabularyPosIndex ??= await loadVocabularyPosIndex();
  return vocabularyPosIndex;
}

async function ensureVocabularyGrammarIndex(): Promise<VocabularyGrammarIndex> {
  vocabularyGrammarIndex ??= await loadVocabularyGrammarIndex();
  return vocabularyGrammarIndex;
}

function curriculumLabel(id: string): string {
  return id
    .split("-")
    .map((part) => part === "" ? part : part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function renderSourceTabs(): void {
  const tabButtons: Array<[string, VocabularySourceTab]> = [
    ["sourceClass", "class"],
    ["sourceTopic", "topic"],
    ["sourceWordType", "word-type"],
    ["sourceGrammar", "grammar"],
    ["sourceCustom", "custom"],
  ];
  for (const [id, tab] of tabButtons) {
    const button = byId<HTMLButtonElement>(id);
    const active = sourceTab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  byId("classPanel").classList.toggle("hidden", sourceTab !== "class");
  byId("topicPanel").classList.toggle("hidden", sourceTab !== "topic");
  byId("wordTypePanel").classList.toggle("hidden", sourceTab !== "word-type");
  byId("grammarPanel").classList.toggle("hidden", sourceTab !== "grammar");
  byId("customPanel").classList.toggle("hidden", sourceTab !== "custom");
  if (sourceTab === "custom") {
    byId<HTMLTextAreaElement>("customVocabulary").value =
      localStorage.getItem(CUSTOM_KEY) ?? "";
  }
}

function updateLevelMeta(): void {
  const level = Number(byId<HTMLSelectElement>("levelSelect").value);
  const metadata = vocabularyIndex?.levels.find((item) => item.level === level);
  byId("levelMeta").textContent =
    metadata === undefined
      ? ""
      : String(metadata.count) + " entries · " + metadata.label;
}

function updateTopicMeta(): void {
  const topicId = byId<HTMLSelectElement>("topicSelect").value;
  const metadata = vocabularyTopicIndex?.topics.find(
    (item) => item.id === topicId,
  );
  byId("topicMeta").textContent =
    metadata === undefined
      ? ""
      : String(metadata.count) +
        " entries · " +
        metadata.levels.join(" / ");
}

async function populateTopics(): Promise<void> {
  const index = await ensureVocabularyTopicIndex();
  const select = byId<HTMLSelectElement>("topicSelect");

  if (select.options.length === 0) {
    const groups = new Map<string, HTMLOptGroupElement>();
    for (const topic of index.topics) {
      let group = groups.get(topic.group);
      if (group === undefined) {
        group = document.createElement("optgroup");
        group.label = topic.groupLabel ?? topic.group;
        groups.set(topic.group, group);
        select.append(group);
      }

      const option = document.createElement("option");
      option.value = topic.id;
      option.textContent = topic.label + " · " + String(topic.count);
      group.append(option);
    }
  }

  if (sourceState.mode === "topic") {
    select.value = sourceState.topicId;
  }
  if (select.value === "" && index.topics.length > 0) {
    select.value = index.topics[0]?.id ?? "";
  }
  updateTopicMeta();
}

function updateWordTypeMeta(): void {
  const id = byId<HTMLSelectElement>("wordTypeSelect").value;
  const category = vocabularyPosIndex?.categories.find((item) => item.id === id);
  byId("wordTypeMeta").textContent =
    category === undefined
      ? ""
      : String(category.entries.length) +
        " available · " +
        String(category.missing.length) +
        " coverage gaps";
}

async function populateWordTypes(): Promise<void> {
  const index = await ensureVocabularyPosIndex();
  const select = byId<HTMLSelectElement>("wordTypeSelect");

  if (select.options.length === 0) {
    for (const category of index.categories) {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent =
        curriculumLabel(category.id) +
        " · " +
        String(category.entries.length);
      option.disabled = category.entries.length === 0;
      select.append(option);
    }
  }

  if (sourceState.mode === "word-type") {
    select.value = sourceState.posId;
  }
  if (
    select.value === "" ||
    select.selectedOptions[0]?.disabled === true
  ) {
    select.value =
      index.categories.find((item) => item.entries.length > 0)?.id ?? "";
  }
  updateWordTypeMeta();
}

function updateGrammarMeta(): void {
  const id = byId<HTMLSelectElement>("grammarSelect").value;
  const module = vocabularyGrammarIndex?.modules.find((item) => item.id === id);
  byId("grammarMeta").textContent =
    module === undefined
      ? ""
      : module.focus.join(" · ") +
        " · " +
        String(module.signalEntries.length) +
        " signal words";
}

async function populateGrammar(): Promise<void> {
  const index = await ensureVocabularyGrammarIndex();
  const select = byId<HTMLSelectElement>("grammarSelect");

  if (select.options.length === 0) {
    const timeGroup = document.createElement("optgroup");
    timeGroup.label = "Past / Present / Future";
    for (const id of index.primaryTimeGroups) {
      const module = index.modules.find((item) => item.id === id);
      if (module === undefined) continue;
      const option = document.createElement("option");
      option.value = module.id;
      option.textContent = module.label;
      timeGroup.append(option);
    }
    if (timeGroup.childElementCount > 0) select.append(timeGroup);

    const practicalGroup = document.createElement("optgroup");
    practicalGroup.label = "Practical grammar";
    for (const module of index.modules) {
      if (index.primaryTimeGroups.includes(module.id)) continue;
      const option = document.createElement("option");
      option.value = module.id;
      option.textContent = module.label;
      practicalGroup.append(option);
    }
    if (practicalGroup.childElementCount > 0) select.append(practicalGroup);
  }

  if (sourceState.mode === "grammar") {
    select.value = sourceState.grammarId;
  }
  if (select.value === "") {
    select.value =
      index.primaryTimeGroups[0] ??
      index.modules[0]?.id ??
      "";
  }
  updateGrammarMeta();
}

async function populateLevels(): Promise<void> {
  const index = await ensureVocabularyIndex();
  const select = byId<HTMLSelectElement>("levelSelect");

  if (select.options.length === 0) {
    for (const level of index.levels) {
      const option = document.createElement("option");
      option.value = String(level.level);
      option.textContent =
        "Level " + String(level.level).padStart(3, "0") + " · " + level.label;
      select.append(option);
    }
  }

  if (sourceState.mode === "class") select.value = String(sourceState.level);
  updateLevelMeta();
}

function updateDataSummary(): void {
  const artMeta =
    artCatalog === null
      ? ""
      : " · art " +
        String(artCatalog.assets.size - artCatalog.failed.length) +
        "/" +
        String(artCatalog.assets.size);
  const performance = game.getPerformanceReport();
  const render = game.getRenderDiagnostics();
  const hudAttempted = hudDomMetrics.attemptedWrites;
  const hudApplied = hudDomMetrics.appliedWrites;
  const hudAvoidedPercent =
    hudAttempted <= 0
      ? 0
      : Math.round((1 - hudApplied / hudAttempted) * 100);
  const hudAverageMs =
    hudDomMetrics.renderCalls <= 0
      ? 0
      : hudDomMetrics.totalRenderMs / hudDomMetrics.renderCalls;
  const hudDiagnostics =
    " · HUD DOM " + hudApplied + "/" + hudAttempted +
    " writes (" + hudAvoidedPercent + "% avoided)" +
    " · HUD avg " + hudAverageMs.toFixed(3) + "ms" +
    " · max " + hudDomMetrics.maxRenderMs.toFixed(3) + "ms";
  byId("renderDiagnostics").textContent = (performance.samples < 30
    ? "Waiting for 30 measured frames"
    : performance.averageFps.toFixed(0) + " FPS · frame p95 " +
      performance.p95FrameMs.toFixed(1) + "ms · draw p95 " +
      render.renderP95Ms.toFixed(1) + "ms · DPR " +
      render.effectiveDpr.toFixed(2) + " · adaptive " +
      Math.round(render.adaptiveScale * 100) + "% · cached bodies " +
      render.bodySprites + " · " +
      (render.canvasPixels / 1_000_000).toFixed(1) + "M px") +
    hudDiagnostics;
  const performanceMeta =
    performance.samples < 30
      ? ""
      : " · " +
        performance.averageFps.toFixed(0) +
        " FPS · p95 " +
        performance.p95FrameMs.toFixed(1) +
        "ms · quality " +
        settings.visualQuality;
  byId("dataProgress").textContent =
    "Stage " +
    String(campaign.highestUnlockedStage).padStart(3, "0") +
    " / 1000 · " +
    String(inventoryTotal(inventory)) +
    " items · " +
    credits.toLocaleString() +
    " Credits · " +
    expansionCurrencies.alloy.toLocaleString() +
    " Alloy · " +
    expansionCurrencies.starCrystal.toLocaleString() +
    " Star Crystal · " +
    expansionCurrencies.quantumCore.toLocaleString() +
    " Quantum Core · " +
    String(relics.owned.length) +
    " Relics (" +
    String(relics.equipped.length) +
    " equipped) · Ascension " +
    String(ascension.selectedTier) +
    "/" +
    String(ascension.highestUnlockedTier) +
    artMeta +
    performanceMeta;
}

function openData(): void {
  if (!persistenceReady) return;
  updateDataSummary();
  byId("dataStatus").textContent =
    "Import validates the save before anything is replaced.";
  dataDialog.showModal();
}

async function exportSave(): Promise<void> {
  if (!persistenceReady) return;

  const saved = await autosaveCampaign(
    "manual",
    undefined,
    "manual",
  );
  const json = exportPlayerSaveJson(
    campaign,
    undefined,
    inventory,
    equipment,
    supportSpells,
    characters,
    luckPity,
    hiddenDiscovery,
    credits,
    progression,
    expansionCurrencies,
    campaignExpansion,
    checkpointSnapshot,
    crashRecoverySnapshot,
    stageEntrySnapshot,
    shops,
    route,
    upgrades,
    relics,
    codex,
    ascension,
    hotbar,
  );
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  link.href = url;
  link.download = "space-typing-save-" + stamp + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);

  byId("dataStatus").textContent =
    (saved ? "✓ Backup exported" : "Backup exported from current session") +
    " · Stage " +
    String(campaign.highestUnlockedStage).padStart(3, "0");
}

async function importSaveFile(file: File): Promise<void> {
  const status = byId("dataStatus");

  try {
    const result = parsePlayerSaveJson(await file.text());
    if (!result.ok) {
      status.textContent = "Import failed · " + result.error;
      return;
    }

    const imported = result.save.campaign;
    const importedInventory = result.save.inventory;
    const importedEquipment = result.save.equipment;
    const importedSupportSpells = result.save.supportSpells;
    const importedHotbar = result.save.hotbar;
    const importedCharacters = syncCharacterUnlocks(
      result.save.characters,
      imported.clearedStages,
    );
    const importedLuckPity = result.save.luckPity;
    const importedHiddenDiscovery = result.save.hiddenDiscovery;
    const importedCredits = result.save.credits;
    const importedProgression = result.save.progression;
    const importedUpgrades = result.save.upgrades;
    const importedRelics = result.save.relics;
    const importedCodex = result.save.codex;
    const importedAscension = result.save.ascension;
    const importedExpansionCurrencies =
      result.save.expansionCurrencies;
    const importedShops = result.save.shops;
    const importedRoute = result.save.route;
    const importedCampaignExpansion =
      result.save.campaignExpansion;
    const importedCheckpointSnapshot =
      result.save.checkpointSnapshot;
    const importedCrashRecoverySnapshot =
      result.save.crashRecoverySnapshot;
    const importedStageEntrySnapshot =
      result.save.stageEntrySnapshot;
    const message =
      "Import Stage " +
      String(imported.highestUnlockedStage).padStart(3, "0") +
      " progress?\n\n" +
      "Current Stage " +
      String(campaign.highestUnlockedStage).padStart(3, "0") +
      " progress will be replaced.";

    if (!window.confirm(message)) {
      status.textContent = "Import cancelled.";
      return;
    }

    const previousCampaign = campaign;
    const previousInventory = inventory;
    const previousEquipment = equipment;
    const previousSupportSpells = supportSpells;
    const previousHotbar = hotbar;
    const previousCharacters = characters;
    const previousLuckPity = luckPity;
    const previousHiddenDiscovery = hiddenDiscovery;
    const previousCredits = credits;
    const previousProgression = progression;
    const previousUpgrades = upgrades;
    const previousRelics = relics;
    const previousCodex = codex;
    const previousAscension = ascension;
    const previousExpansionCurrencies = expansionCurrencies;
    const previousShops = shops;
    const previousRoute = route;
    const previousCampaignExpansion = campaignExpansion;
    const previousCheckpointSnapshot = checkpointSnapshot;
    const previousCrashRecoverySnapshot = crashRecoverySnapshot;
    const previousStageEntrySnapshot = stageEntrySnapshot;
    campaign = imported;
    inventory = importedInventory;
    equipment = importedEquipment;
    supportSpells = importedSupportSpells;
    hotbar = importedHotbar;
    characters = importedCharacters;
    luckPity = importedLuckPity;
    hiddenDiscovery = importedHiddenDiscovery;
    credits = importedCredits;
    progression = importedProgression;
    upgrades = importedUpgrades;
    relics = importedRelics;
    codex = importedCodex;
    ascension = importedAscension;
    const importedAscensionStage = currentAscensionStage(ascension);
    if (importedAscensionStage !== null) {
      campaign = {
        ...campaign,
        selectedStage: importedAscensionStage,
      };
    }
    expansionCurrencies = importedExpansionCurrencies;
    shops = importedShops;
    route = importedRoute;
    campaignExpansion = importedCampaignExpansion;
    checkpointSnapshot = importedCheckpointSnapshot;
    crashRecoverySnapshot = importedCrashRecoverySnapshot;
    stageEntrySnapshot = importedStageEntrySnapshot;
    syncProgressionAchievements();
    game.setLuckPityState(luckPity);
    game.setHiddenDiscoveryState(hiddenDiscovery);
    updateShopAccess();
    applySelectedCharacter();
    renderInventory();
    applyEquipmentStats();
    applySupportSpells();
    currentGalaxy = Math.ceil(
      campaign.selectedStage / STAGES_PER_GALAXY,
    );

    const saved = await autosaveCampaign(
      "manual",
      undefined,
      "manual",
    );
    if (!saved) {
      campaign = previousCampaign;
      inventory = previousInventory;
      equipment = previousEquipment;
      supportSpells = previousSupportSpells;
      hotbar = previousHotbar;
      characters = previousCharacters;
      luckPity = previousLuckPity;
      hiddenDiscovery = previousHiddenDiscovery;
      credits = previousCredits;
      progression = previousProgression;
      upgrades = previousUpgrades;
      relics = previousRelics;
      codex = previousCodex;
      ascension = previousAscension;
      const previousAscensionStage = currentAscensionStage(ascension);
      if (previousAscensionStage !== null) {
        campaign = {
          ...campaign,
          selectedStage: previousAscensionStage,
        };
      }
      expansionCurrencies = previousExpansionCurrencies;
      shops = previousShops;
      route = previousRoute;
      campaignExpansion = previousCampaignExpansion;
      checkpointSnapshot = previousCheckpointSnapshot;
      crashRecoverySnapshot = previousCrashRecoverySnapshot;
      stageEntrySnapshot = previousStageEntrySnapshot;
      game.setLuckPityState(luckPity);
      game.setHiddenDiscoveryState(hiddenDiscovery);
      updateShopAccess();
      applySelectedCharacter();
      renderInventory();
      applyEquipmentStats();
      applySupportSpells();
      applyRelicEffects();
      currentGalaxy = Math.ceil(
        campaign.selectedStage / STAGES_PER_GALAXY,
      );
      updateCampaignUi();
      updateDataSummary();
      status.textContent =
        "Import validated, but storage write failed. Previous progress was restored.";
      return;
    }

    updateCampaignUi();
    updateDataSummary();
    dataDialog.close();

    showNotice(
      "✓ Save imported" +
        (result.migrated ? " · migrated to current schema" : ""),
    );
  } catch {
    status.textContent = "Import failed · Unable to read this file.";
  }
}

function sourceMetaId(tab: VocabularySourceTab): string | null {
  if (tab === "class") return "levelMeta";
  if (tab === "topic") return "topicMeta";
  if (tab === "word-type") return "wordTypeMeta";
  if (tab === "grammar") return "grammarMeta";
  return null;
}

async function populateVocabularySourceTab(
  tab: VocabularySourceTab,
): Promise<void> {
  if (tab === "class") {
    await populateLevels();
  } else if (tab === "topic") {
    await populateTopics();
  } else if (tab === "word-type") {
    await populateWordTypes();
  } else if (tab === "grammar") {
    await populateGrammar();
  }
}

async function populateVocabularySourceTabSafely(
  tab: VocabularySourceTab,
): Promise<void> {
  const metaId = sourceMetaId(tab);
  try {
    await populateVocabularySourceTab(tab);
  } catch (error) {
    if (metaId !== null) {
      byId(metaId).textContent =
        error instanceof Error
          ? error.message
          : "Unable to load this learning source.";
    }
  }
}

function selectVocabularySourceTab(tab: VocabularySourceTab): void {
  sourceTab = tab;
  renderSourceTabs();
  void populateVocabularySourceTabSafely(tab);
}

async function openVocabulary(): Promise<void> {
  sourceTab = sourceState.mode;
  renderSourceTabs();
  await populateVocabularySourceTabSafely(sourceTab);
  if (!vocabularyDialog.open) vocabularyDialog.showModal();
}

async function applyClassLevel(level: number): Promise<void> {
  const button = byId<HTMLButtonElement>("applyLevel");
  button.disabled = true;
  button.textContent = "Applying…";

  try {
    const index = await ensureVocabularyIndex();
    const entries = await loadVocabularyLevel(level, index);
    const metadata = index.levels.find((item) => item.level === level);

    configuredVocabulary = entries;
    typingChallengeCache.clear();
    sourceState = { mode: "class", level };
    sourceTab = "class";
    localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
    game.setVocabulary(entries);
    vocabularyDialog.close();

    showNotice(
      metadata === undefined
        ? "Level " + String(level).padStart(3, "0") + " applied"
        : "Level " +
            String(level).padStart(3, "0") +
            " applied · " +
            String(metadata.count) +
            " entries",
    );
  } catch (error) {
    alert(error instanceof Error ? error.message : "Unable to apply vocabulary level.");
  } finally {
    button.disabled = false;
    button.textContent = "Use level";
  }
}

async function applyTopicVocabulary(topicId: string): Promise<void> {
  const button = byId<HTMLButtonElement>("applyTopic");
  button.disabled = true;
  button.textContent = "Applying…";

  try {
    const [topics, levels] = await Promise.all([
      ensureVocabularyTopicIndex(),
      ensureVocabularyIndex(),
    ]);
    const loaded = await loadVocabularyTopic(topicId, topics, levels);

    configuredVocabulary = loaded.entries;
    typingChallengeCache.clear();
    sourceState = {
      mode: "topic",
      topicId: loaded.topic.id,
      level: loaded.representativeLevel,
    };
    sourceTab = "topic";
    localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
    game.setVocabulary(loaded.entries);
    game.setVocabularyLevel(loaded.representativeLevel);
    vocabularyDialog.close();

    showNotice(
      loaded.topic.label +
        " applied · " +
        String(loaded.entries.length) +
        " entries · level profile " +
        String(loaded.representativeLevel).padStart(3, "0"),
    );
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Unable to apply vocabulary topic.",
    );
  } finally {
    button.disabled = false;
    button.textContent = "Use topic";
  }
}

async function applyWordTypeVocabulary(posId: string): Promise<void> {
  const button = byId<HTMLButtonElement>("applyWordType");
  button.disabled = true;
  button.textContent = "Applying…";

  try {
    const [wordTypes, levels] = await Promise.all([
      ensureVocabularyPosIndex(),
      ensureVocabularyIndex(),
    ]);
    const loaded = await loadVocabularyPosCategory(posId, wordTypes, levels);

    configuredVocabulary = loaded.entries;
    typingChallengeCache.clear();
    sourceState = {
      mode: "word-type",
      posId: loaded.category.id,
      level: loaded.representativeLevel,
    };
    sourceTab = "word-type";
    localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
    game.setVocabulary(loaded.entries);
    game.setVocabularyLevel(loaded.representativeLevel);
    vocabularyDialog.close();

    showNotice(
      curriculumLabel(loaded.category.id) +
        " applied · " +
        String(loaded.entries.length) +
        " entries · level profile " +
        String(loaded.representativeLevel).padStart(3, "0"),
    );
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Unable to apply vocabulary word type.",
    );
  } finally {
    button.disabled = false;
    button.textContent = "Use word type";
  }
}

async function applyGrammarVocabulary(grammarId: string): Promise<void> {
  const button = byId<HTMLButtonElement>("applyGrammar");
  button.disabled = true;
  button.textContent = "Applying…";

  try {
    const [grammar, topics, levels] = await Promise.all([
      ensureVocabularyGrammarIndex(),
      ensureVocabularyTopicIndex(),
      ensureVocabularyIndex(),
    ]);
    const loaded = await loadVocabularyGrammarModule(
      grammarId,
      grammar,
      topics,
      levels,
    );

    configuredVocabulary = loaded.entries;
    typingChallengeCache.clear();
    sourceState = {
      mode: "grammar",
      grammarId: loaded.module.id,
      level: loaded.representativeLevel,
    };
    sourceTab = "grammar";
    localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
    game.setVocabulary(loaded.entries);
    game.setVocabularyLevel(loaded.representativeLevel);
    vocabularyDialog.close();

    showNotice(
      loaded.module.label +
        " applied · " +
        String(loaded.entries.length) +
        " entries · level profile " +
        String(loaded.representativeLevel).padStart(3, "0"),
    );
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Unable to apply vocabulary grammar module.",
    );
  } finally {
    button.disabled = false;
    button.textContent = "Use grammar";
  }
}

async function initializeArtPipeline(): Promise<void> {
  try {
    const manifest = await loadArtAssetManifest();
    // QA-only A/B comparison: ?shipArt=v2 excludes V3 from the preload so the
    // same stage/device can benchmark the old art without hidden V3 decoding.
    const artPreference = parseShipArtPreference(
      new URLSearchParams(window.location.search).get("shipArt"),
    );
    const loadManifest = artPreference === "v2"
      ? {
          ...manifest,
          entries: manifest.entries.filter(
            (entry) => entry.id !== PREMIUM_SHIP_SHEET_ASSET_ID,
          ),
        }
      : manifest;
    artCatalog = await preloadArtAssets(loadManifest);
    const shipArt = selectCharacterShipSheet(artCatalog, artPreference);
    setCharacterShipSheet(shipArt.image, shipArt.source);
    if (shipArt.source === "v3") {
      // Keep only one decoded full-size art atlas while V3 is active.
      const fallback = artCatalog.assets.get(CHARACTER_SHIP_SHEET_ASSET_ID);
      if (fallback !== undefined) fallback.image = null;
    }
    // QA telemetry only; the atlas selection is a one-time startup decision.
    document.documentElement.dataset.shipArt = shipArt.source;
    renderPlayerStatusIdentity();
    if (characterDialog.open) renderCharacters();
    updateDataSummary();

    if (artCatalog.failed.length > 0) {
      console.warn(
        "Optional art assets failed to load; procedural fallbacks remain active.",
        artCatalog.failed,
      );
    }
  } catch (error) {
    artCatalog = null;
    setCharacterShipSheet(null);
    document.documentElement.dataset.shipArt = "procedural";
    console.warn(
      "Art manifest unavailable; procedural Canvas renderer remains active.",
      error,
    );
  }
}

async function loadInitialVocabulary(): Promise<void> {
  try {
    if (sourceState.mode === "custom") {
      const custom = parseCustomVocabulary(
        localStorage.getItem(CUSTOM_KEY) ?? "",
      );
      if (custom.length > 0) {
        configuredVocabulary = custom;
        game.setVocabulary(custom);
        return;
      }

      sourceState = { mode: "class", level: 1 };
      localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
    }

    const index = await ensureVocabularyIndex();
    if (sourceState.mode === "topic") {
      const topics = await ensureVocabularyTopicIndex();
      const loaded = await loadVocabularyTopic(
        sourceState.topicId,
        topics,
        index,
      );
      configuredVocabulary = loaded.entries;
      sourceState = {
        mode: "topic",
        topicId: loaded.topic.id,
        level: loaded.representativeLevel,
      };
      localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
      game.setVocabulary(configuredVocabulary);
      game.setVocabularyLevel(loaded.representativeLevel);
    } else if (sourceState.mode === "word-type") {
      const wordTypes = await ensureVocabularyPosIndex();
      const loaded = await loadVocabularyPosCategory(
        sourceState.posId,
        wordTypes,
        index,
      );
      configuredVocabulary = loaded.entries;
      sourceState = {
        mode: "word-type",
        posId: loaded.category.id,
        level: loaded.representativeLevel,
      };
      localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
      game.setVocabulary(configuredVocabulary);
      game.setVocabularyLevel(loaded.representativeLevel);
    } else if (sourceState.mode === "grammar") {
      const [grammar, topics] = await Promise.all([
        ensureVocabularyGrammarIndex(),
        ensureVocabularyTopicIndex(),
      ]);
      const loaded = await loadVocabularyGrammarModule(
        sourceState.grammarId,
        grammar,
        topics,
        index,
      );
      configuredVocabulary = loaded.entries;
      sourceState = {
        mode: "grammar",
        grammarId: loaded.module.id,
        level: loaded.representativeLevel,
      };
      localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
      game.setVocabulary(configuredVocabulary);
      game.setVocabularyLevel(loaded.representativeLevel);
    } else {
      configuredVocabulary = await loadVocabularyLevel(
        sourceState.level,
        index,
      );
      game.setVocabulary(configuredVocabulary);
    }
  } catch (error) {
    console.warn(
      "Shared vocabulary unavailable; using bundled fallback.",
      error,
    );
  } finally {
    vocabularyReady = true;
    byId<HTMLButtonElement>("startButton").disabled = !persistenceReady;
  }
}

// The clear handler advances campaign.selectedStage immediately after a win.
 // Replay must explicitly select the completed encounter, not the new frontier.
for (const id of ["startButton", "nextStageButton"]) {
  byId(id).addEventListener("click", () => void startSelectedStage());
}
for (const id of ["restartButton", "clearRetryButton"]) {
  byId(id).addEventListener("click", () => {
    if (currentHiddenEncounterState().active !== null) {
      void startSelectedStage();
      return;
    }
    const completedStage = game.getStats().stage;
    campaign = selectCompletedStageForReplay(
      campaign,
      campaignExpansion,
      completedStage,
    );
    updateCampaignUi();
    void startSelectedStage();
  });
}
byId("routeButton").addEventListener("click", openRouteMap);
byId("routeCampaignButton").addEventListener("click", () => {
  if (routeDialog.open) routeDialog.close();
  openStageSelect();
});
restHubDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  if (restHubDialog.open) restHubDialog.close(); // Pending visit stays saved.
  game.backToTitle();
});
byId("restHubTitleButton").addEventListener("click", () => {
  restHubDialog.close();
  game.backToTitle();
});
byId("restHubLeave").addEventListener("click", () => {
  restHubDialog.close();
  game.backToTitle();
});
byId("restHubShop").addEventListener("click", openNormalShop);
byId("restHubStation").addEventListener("click", () => openSpecialShop("station"));
byId("restHubRepair").addEventListener("click", openServiceShop);
byId("restHubSupport").addEventListener("click", openSupportSpells);
byId("restHubContinue").addEventListener("click", () => {
  void continueRestHub();
});
byId("routeContinueButton").addEventListener("click", () => {
  if (routeChoicePending || routeNeedsChoice(route, routeTargetStage())) return;
  if (routeDialog.open) routeDialog.close();
  void startSelectedStage();
});
byId("routeShopAction").addEventListener("click", () => {
  closeRouteAndOpen(openNormalShop);
});
byId("routeStationShopAction").addEventListener("click", () => {
  closeRouteAndOpen(() => openSpecialShop("station"));
});
byId("routeServiceAction").addEventListener("click", () => {
  closeRouteAndOpen(openServiceShop);
});
byId("routeSupportAction").addEventListener("click", () => {
  closeRouteAndOpen(openSupportSpells);
});

byId("resumeButton").addEventListener("click", () => game.resume());

byId("againButton").addEventListener("click", () => {
  void resolveCheckpointDeath("retry");
});
byId("gameOverStageSelectButton").addEventListener("click", () => {
  void resolveCheckpointDeath("stage-select");
});
byId("resultTitleButton").addEventListener("click", () => {
  void resolveCheckpointDeath("title");
});
byId("salvageAnchorButton").addEventListener("click", () => {
  void resolveSalvageAnchorDeath();
});
byId("stageRevivalButton").addEventListener("click", () => {
  void resolveStageRevivalDeath();
});
byId("phoenixCoreButton").addEventListener("click", () => {
  void resolvePhoenixDeath();
});

for (const id of ["titleButton", "clearTitleButton"]) {
  byId(id).addEventListener("click", () => game.backToTitle());
}

byId("characterButton").addEventListener("click", openCharacters);
byId("equipmentButton").addEventListener("click", openEquipment);
byId("hotbarButton").addEventListener("click", openHotbarSetup);
byId("pauseHotbarButton").addEventListener("click", openHotbarSetup);
byId("shopButton").addEventListener("click", openNormalShop);
byId("stationShopButton").addEventListener("click", () => {
  openSpecialShop("station");
});
byId("travelingShopButton").addEventListener("click", () => {
  openSpecialShop("traveling");
});
byId("serviceShopButton").addEventListener("click", openServiceShop);
byId("blackMarketButton").addEventListener("click", () => {
  openSpecialShop("black-market");
});
byId("hiddenShopButton").addEventListener("click", () => {
  openSpecialShop("hidden");
});
byId("eventShopButton").addEventListener("click", () => {
  openSpecialShop("event");
});
byId("supportButton").addEventListener("click", openSupportSpells);

for (const slot of [0, 1] as const) {
  byId<HTMLSelectElement>("supportSlot" + String(slot)).addEventListener(
    "change",
    (event) => {
      const value = (event.currentTarget as HTMLSelectElement).value;
      const id = value === "" ? null : (value as SupportSpellId);
      supportSpells = equipSupportSpell(supportSpells, slot, id);
      applySupportSpells();
      reconcileHotbarSupportAssignments();
      applyEquipmentStats();
      renderSupportLoadout();
      renderEquipment();
      renderHotbar();
      renderHotbarLoadout();
      void autosaveCampaign(
        "support-spells",
        "✓ Support loadout saved · applies next stage",
        "loadout",
      );
    },
  );
}

for (const id of ["settingsButton", "pauseSettingsButton"]) {
  byId(id).addEventListener("click", openSettings);
}

for (const id of ["dataButton", "pauseDataButton"]) {
  byId(id).addEventListener("click", openData);
}

byId("codexButton").addEventListener("click", openCodex);
byId("ascensionButton").addEventListener("click", openAscension);
byId("progressionButton").addEventListener("click", openProgression);

byId("exportSaveButton").addEventListener("click", () => {
  void exportSave();
});

byId("importSaveButton").addEventListener("click", () => {
  byId<HTMLInputElement>("importSaveFile").click();
});

byId<HTMLInputElement>("importSaveFile").addEventListener(
  "change",
  (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file !== undefined) {
      void importSaveFile(file);
    }
  },
);

for (const id of [
  "stageSelectButton",
  "pauseStageSelectButton",
  "clearStageSelectButton",
]) {
  byId(id).addEventListener("click", openStageSelect);
}

byId("galaxySelect").addEventListener("change", (event) => {
  currentGalaxy = Number((event.currentTarget as HTMLSelectElement).value);
  selectedJourneyWorld = (currentGalaxy - 1) * 5 + 1;
  selectedJourneyStage = (selectedJourneyWorld - 1) * 20 + 1;
  populateJourneyWorldSelect();
  renderStageGrid();
  byId("stageGrid").scrollTop = 0;
});

byId("journeyWorldSelect").addEventListener("change", (event) => {
  selectedJourneyWorld = Number((event.currentTarget as HTMLSelectElement).value);
  selectedJourneyStage = (selectedJourneyWorld - 1) * 20 + 1;
  renderStageGrid();
  focusJourneyFrontier();
});

byId("journeyStartButton").addEventListener("click", () => {
  void (async () => {
    const stage = selectedJourneyStage;
    if (!canSelectCampaignStage(campaign, campaignExpansion, stage)) return;
    const previous = campaign;
    const next = selectCampaignStage(campaign, stage);
    if (next.selectedStage !== stage) return;
    campaign = next;
    const saved = await autosaveCampaign(
      "stage-select",
      "✓ Saved · Stage " + String(stage).padStart(3, "0") + " selected",
      "stage-select",
    );
    if (!saved) {
      campaign = previous;
      updateCampaignUi();
      return;
    }
    updateCampaignUi();
    stageSelectDialog.close();
    game.backToTitle();
    await startSelectedStage();
  })();
});

for (const id of ["vocabularyButton", "pauseVocabularyButton"]) {
  byId(id).addEventListener("click", () => void openVocabulary());
}

byId("sourceClass").addEventListener("click", () => {
  selectVocabularySourceTab("class");
});

byId("sourceTopic").addEventListener("click", () => {
  selectVocabularySourceTab("topic");
});

byId("sourceWordType").addEventListener("click", () => {
  selectVocabularySourceTab("word-type");
});

byId("sourceGrammar").addEventListener("click", () => {
  selectVocabularySourceTab("grammar");
});

byId("sourceCustom").addEventListener("click", () => {
  selectVocabularySourceTab("custom");
});

byId("levelSelect").addEventListener("change", updateLevelMeta);
byId("topicSelect").addEventListener("change", updateTopicMeta);
byId("wordTypeSelect").addEventListener("change", updateWordTypeMeta);
byId("grammarSelect").addEventListener("change", updateGrammarMeta);

byId("applyLevel").addEventListener("click", () => {
  void applyClassLevel(Number(byId<HTMLSelectElement>("levelSelect").value));
});
byId("applyTopic").addEventListener("click", () => {
  void applyTopicVocabulary(byId<HTMLSelectElement>("topicSelect").value);
});
byId("applyWordType").addEventListener("click", () => {
  void applyWordTypeVocabulary(
    byId<HTMLSelectElement>("wordTypeSelect").value,
  );
});
byId("applyGrammar").addEventListener("click", () => {
  void applyGrammarVocabulary(
    byId<HTMLSelectElement>("grammarSelect").value,
  );
});

byId("saveCustom").addEventListener("click", () => {
  const input = byId<HTMLTextAreaElement>("customVocabulary");
  const entries = parseCustomVocabulary(input.value);
  if (entries.length === 0) {
    alert("Add at least one valid English vocabulary entry.");
    return;
  }

  localStorage.setItem(CUSTOM_KEY, input.value);
  configuredVocabulary = entries;
  typingChallengeCache.clear();
  sourceState = { mode: "custom" };
  sourceTab = "custom";
  localStorage.setItem(SOURCE_KEY, JSON.stringify(sourceState));
  game.setVocabulary(entries);
  vocabularyDialog.close();
  showNotice("Custom vocabulary applied · " + String(entries.length) + " entries");
});

byId<HTMLSelectElement>("difficultyMode").addEventListener(
  "change",
  (event) => {
    difficultySettings = sanitizeDifficultySettings({
      ...difficultySettings,
      mode: (event.currentTarget as HTMLSelectElement).value,
    });
    saveDifficultySettings();
    renderSettings();
  },
);

byId<HTMLInputElement>("customTargetWpm").addEventListener(
  "change",
  (event) => {
    difficultySettings = sanitizeDifficultySettings({
      ...difficultySettings,
      customTargetWpm: Number(
        (event.currentTarget as HTMLInputElement).value,
      ),
    });
    saveDifficultySettings();
    renderSettings();
  },
);

byId<HTMLInputElement>("customPressure").addEventListener(
  "change",
  (event) => {
    difficultySettings = sanitizeDifficultySettings({
      ...difficultySettings,
      customPressure: Number(
        (event.currentTarget as HTMLInputElement).value,
      ),
    });
    saveDifficultySettings();
    renderSettings();
  },
);

for (const id of ["customEnemySpeed", "customBulletSpeed", "customFireRate", "customSpawnRate"] as const) {
  byId<HTMLInputElement>(id).addEventListener("input", (event) => {
    difficultySettings = sanitizeDifficultySettings({
      ...difficultySettings,
      [id]: Number((event.currentTarget as HTMLInputElement).value),
    });
    saveDifficultySettings();
    byId<HTMLOutputElement>(id + "Value").value = difficultySettings[id].toFixed(2) + "×";
  });
}

byId<HTMLInputElement>("musicVolume").addEventListener(
  "input",
  (event) => {
    settings = {
      ...settings,
      musicVolume: Number(
        (event.currentTarget as HTMLInputElement).value,
      ),
    };
    renderSettings();
    saveSettings();
  },
);

byId<HTMLInputElement>("ambientVolume").addEventListener(
  "input",
  (event) => {
    settings = {
      ...settings,
      ambientVolume: Number(
        (event.currentTarget as HTMLInputElement).value,
      ),
    };
    renderSettings();
    saveSettings();
  },
);

byId<HTMLInputElement>("sfxVolume").addEventListener("input", (event) => {
  settings = {
    ...settings,
    sfxVolume: Number((event.currentTarget as HTMLInputElement).value),
  };
  renderSettings();
  saveSettings();
});

byId<HTMLSelectElement>("screenShake").addEventListener(
  "change",
  (event) => {
    settings = {
      ...settings,
      screenShake:
        (event.currentTarget as HTMLSelectElement).value === "true",
    };
    saveSettings();
  },
);

for (const [id, field] of [
  ["killTranslationEnabled", "enabled"],
  ["killTranslationIpa", "showIpa"],
  ["killTranslationVi", "showVietnamese"],
] as const) {
  byId<HTMLSelectElement>(id).addEventListener("change", (event) => {
    settings = {
      ...settings,
      killTranslation: {
        ...currentKillTranslationSettings(),
        [field]: (event.currentTarget as HTMLSelectElement).value === "true",
      },
    };
    saveSettings();
  });
}

byId<HTMLSelectElement>("killTranslationSize").addEventListener(
  "change",
  (event) => {
    settings = {
      ...settings,
      killTranslation: sanitizeKillTranslationSettings({
        ...currentKillTranslationSettings(),
        size: (event.currentTarget as HTMLSelectElement).value,
      }),
    };
    saveSettings();
  },
);

byId<HTMLInputElement>("killTranslationDuration").addEventListener(
  "input",
  (event) => {
    settings = {
      ...settings,
      killTranslation: sanitizeKillTranslationSettings({
        ...currentKillTranslationSettings(),
        durationSeconds: Number((event.currentTarget as HTMLInputElement).value),
      }),
    };
    renderSettings();
    saveSettings();
  },
);

byId<HTMLSelectElement>("pronunciationEnabled").addEventListener(
  "change",
  (event) => {
    settings = {
      ...settings,
      pronunciationEnabled:
        (event.currentTarget as HTMLSelectElement).value === "true",
    };
    if (!settings.pronunciationEnabled) stopSpeech();
    saveSettings();
  },
);

byId<HTMLInputElement>("pronunciationRate").addEventListener(
  "input",
  (event) => {
    settings = {
      ...settings,
      pronunciationRate: Number((event.currentTarget as HTMLInputElement).value),
    };
    renderSettings();
    saveSettings();
  },
);

byId<HTMLInputElement>("pronunciationVolume").addEventListener(
  "input",
  (event) => {
    settings = {
      ...settings,
      pronunciationVolume: Number((event.currentTarget as HTMLInputElement).value),
    };
    renderSettings();
    saveSettings();
  },
);

byId<HTMLSelectElement>("visualQuality").addEventListener(
  "change",
  (event) => {
    settings = {
      ...settings,
      visualQuality:
        (event.currentTarget as HTMLSelectElement).value as VisualQuality,
    };
    saveSettings();
  },
);

window.addEventListener("keydown", (event) => {
  if (
    settingsDialog.open ||
    vocabularyDialog.open ||
    stageSelectDialog.open ||
    dataDialog.open ||
    equipmentDialog.open ||
    supportDialog.open ||
    hotbarDialog.open ||
    characterDialog.open ||
    codexDialog.open ||
    progressionDialog.open ||
    shopDialog.open ||
    serviceShopDialog.open ||
    specialShopDialog.open
  ) return;

  if (game.getPhase() === "playing") {
    const slotIndex = hotbarSlotForKey(event.key);
    if (slotIndex !== null) {
      event.preventDefault();
      activateHotbarSlot(slotIndex);
      return;
    }
  }

  if (event.key === "Escape" || event.key === " ") {
    event.preventDefault();
  }

  game.handleKey(event.key);
});

window.addEventListener("resize", () => game.resize());

function persistPageLifecycleRecovery(): void {
  if (!persistenceReady) return;

  const savedAt = new Date().toISOString();
  const phase = game.getPhase();

  // Mid-encounter page lifecycle events must not promote equipment drops,
  // item consumption or other unsafe combat mutations into a new recovery
  // point. The mirror still writes the current top-level state, but load
  // resolution restores the previous safe snapshot.
  if (phase === "title" || phase === "stageclear") {
    captureSafeCrashRecovery("pagehide", savedAt);
  }

  try {
    persistRecoveryMirrorSync("pagehide", savedAt);
  } catch (error) {
    console.warn(
      "Unable to write synchronous page recovery mirror.",
      error,
    );
  }

  campaignAutosave.schedule(
    currentAutosaveSnapshot(),
    "pagehide",
  );
  void campaignAutosave.flush("pagehide");
}

document.addEventListener("visibilitychange", () => {
  const hidden = document.visibilityState === "hidden";
  if (hidden) {
    musicController.setPaused(true);
    persistPageLifecycleRecovery();
    return;
  }

  if (game.getPhase() !== "paused") {
    musicController.setPaused(false);
  }
});

window.addEventListener("pagehide", persistPageLifecycleRecovery);

window.addEventListener(
  "pointerdown",
  () => {
    if (game.getPhase() !== "paused") {
      musicController.setPaused(false);
    }
  },
  { once: true },
);

window.addEventListener("beforeunload", () => {
  stopSpeech();
  musicController.destroy();
  game.destroy();
});

renderSettings();
updateCampaignUi();
renderPlayerStatusIdentity();
renderStats(game.getStats());
renderPhase(game.getPhase());
renderAllSkills();
void initializeArtPipeline();
void initializePlayerProgress();
void loadInitialVocabulary();
