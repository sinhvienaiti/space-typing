import "./styles.css";
import { Game } from "./Game";
import {
  loadArtAssetManifest,
  preloadArtAssets,
  type ArtAssetCatalog,
} from "./assets/pipeline";
import { difficultyFor } from "./campaign/difficulty";
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
import type { RecoveryItemId } from "./items/consumables";
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
import { gradeLabel } from "./grades";
import { MusicController } from "./audio/MusicController";
import {
  musicProfileForWorld,
  musicStateForStageRole,
  type MusicState,
} from "./audio/music-profile";
import {
  stageInWorld,
  worldForStage,
} from "./worlds/registry";
import type { WorldProfile } from "./worlds/types";
import {
  buyShopStockEntry,
  canAffordShopPrice,
  createShopState,
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
  buyEquipmentUpgrade,
  buyRepairPack,
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
  type SupportSpellId,
} from "./skills/support";

type CombatSkillId = DefensiveSkillId | OffensiveSkillId;
import { DEFAULT_PLAYER_BASE_STATS } from "./stats/player";
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
  loadVocabularyIndex,
  loadVocabularyLevel,
  parseCustomVocabulary,
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
  | { mode: "custom" };

const defaultSettings: GameSettings = {
  sfxVolume: 0.5,
  musicVolume: 0.35,
  ambientVolume: 0.15,
  screenShake: true,
  visualQuality: "high",
  pronunciationEnabled: true,
  pronunciationRate: 1,
  pronunciationVolume: 1,
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
        <div class="metric"><span>hull</span><strong id="hull">100</strong></div>
        <div class="metric"><span>shield</span><strong id="shield">40</strong></div>
      </div>
    </header>

    <div
      id="stageEventBadge"
      class="stage-event-badge hidden"
      aria-live="polite"
    ></div>
    <div
      id="objectiveBadge"
      class="stage-event-badge hidden"
      aria-live="polite"
    ></div>
    <div
      id="statusBadge"
      class="status-badge hidden"
      aria-live="polite"
    ></div>
    <div
      id="typingTextBadge"
      class="typing-text-badge hidden"
      aria-live="polite"
    ></div>

    <div id="bossHud" class="boss-hud hidden" aria-live="polite">
      <div class="boss-hud-meta">
        <strong id="bossName">Boss</strong>
        <span id="bossHpText">0 / 0</span>
      </div>
      <div class="boss-hp-track">
        <div id="bossHpFill" class="boss-hp-fill"></div>
      </div>
    </div>

    <div class="power-shell">
      <div class="power-label">
        <span>ultimate</span>
        <small id="powerHint">type cleanly to charge</small>
      </div>
      <div class="power-track">
        <div id="powerFill" class="power-fill"></div>
      </div>
      <div class="energy-chip">
        <span>energy</span>
        <strong id="energyText">100 / 100</strong>
      </div>
    </div>

    <div id="quickItems" class="quick-items hidden">
      <button id="quickRepair" type="button" title="Repair Kit">
        <kbd>1</kbd>
        <span>repair</span>
        <strong id="repairCount">0</strong>
      </button>
      <button id="quickShield" type="button" title="Shield Cell">
        <kbd>2</kbd>
        <span>shield</span>
        <strong id="shieldCount">0</strong>
      </button>
      <button id="quickEnergy" type="button" title="Energy Cell">
        <kbd>3</kbd>
        <span>energy</span>
        <strong id="energyCount">0</strong>
      </button>
    </div>

    <div id="quickSupport" class="quick-support hidden">
      <button id="supportSkill0" type="button">
        <kbd>[</kbd><span>support 1</span><strong></strong>
      </button>
      <button id="characterSkill" type="button">
        <kbd>=</kbd><span>character</span><strong></strong>
      </button>
      <button id="supportSkill1" type="button">
        <kbd>]</kbd><span>support 2</span><strong></strong>
      </button>
    </div>

    <div id="quickSkills" class="quick-skills hidden">
      <button id="skillBarrier" type="button">
        <kbd>4</kbd><span>barrier</span><strong></strong>
      </button>
      <button id="skillReflect" type="button">
        <kbd>5</kbd><span>reflect</span><strong></strong>
      </button>
      <button id="skillTimeShell" type="button">
        <kbd>6</kbd><span>time</span><strong></strong>
      </button>
      <button id="skillRepair" type="button">
        <kbd>7</kbd><span>repair</span><strong></strong>
      </button>
      <button id="skillGuardian" type="button">
        <kbd>8</kbd><span>guardian</span><strong></strong>
      </button>
      <button id="skillEmp" type="button">
        <kbd>9</kbd><span>emp</span><strong></strong>
      </button>
      <button id="skillChain" type="button">
        <kbd>0</kbd><span>chain</span><strong></strong>
      </button>
      <button id="skillMark" type="button">
        <kbd>-</kbd><span>mark</span><strong></strong>
      </button>
    </div>

    <section id="titleOverlay" class="overlay">
      <div class="main-card">
        <p class="eyebrow">typing combat // prototype 01</p>
        <h1>SPACE <span>TYPE</span></h1>
        <p class="intro">
          Lock a target with its first letter, finish the word, and keep the
          streak alive. No movement — only typing decisions.
        </p>
        <p id="titleWorldMeta" class="world-meta">
          World 01 · Rainbow Reach · Stage 001-020
        </p>
        <div class="actions">
          <button id="startButton" class="primary">Continue · Stage 001</button>
          <button id="routeButton">Route Map</button>
          <button id="stageSelectButton">Stage Select</button>
          <button id="vocabularyButton">Vocabulary</button>
          <button id="characterButton">Characters</button>
          <button id="equipmentButton">Equipment</button>
          <button id="shopButton">Normal Shop</button>
          <button id="stationShopButton">Station Shop</button>
          <button id="travelingShopButton" class="hidden">Traveling Merchant</button>
          <button id="serviceShopButton">Repair / Upgrade</button>
          <button id="blackMarketButton" class="hidden">Black Market</button>
          <button id="hiddenShopButton" class="hidden">Hidden Shop</button>
          <button id="eventShopButton" class="hidden">Event Shop</button>
          <button id="supportButton">Support Spells</button>
          <button id="codexButton">Codex</button>
          <button id="progressionButton">Missions</button>
          <button id="dataButton">Data</button>
          <button id="settingsButton">Settings</button>
        </div>
        <div class="hints">
          <span><kbd>ESC</kbd> pause</span>
          <span><kbd>SPACE</kbd> overdrive at 100%</span>
        </div>
      </div>
    </section>

    <section id="pauseOverlay" class="overlay hidden">
      <div class="pause-card">
        <p class="eyebrow">mission hold</p>
        <h2>Game paused</h2>
        <button id="resumeButton" class="primary">Resume</button>
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
          <div><span>max streak</span><strong id="resultStreak">0</strong></div>
        </div>
        <p id="deathProtectionMeta" class="death-protection-meta">
          Choose a recovery path. Reloading before a choice enforces checkpoint rollback.
        </p>
        <div class="death-protection-actions">
          <button id="salvageAnchorButton">Salvage Anchor · 0</button>
          <button id="stageRevivalButton">Stage Revival Core · 0</button>
          <button id="phoenixCoreButton">Phoenix Core · 0</button>
        </div>
        <button id="againButton" class="primary">Return to checkpoint</button>
        <button id="gameOverStageSelectButton">Checkpoint + Stage Select</button>
        <button id="resultTitleButton">Checkpoint + Back to title</button>
      </div>
    </section>

    <section id="stageClearOverlay" class="overlay hidden">
      <div class="pause-card">
        <p class="eyebrow">stage clear</p>
        <h2 id="clearTitle">Stage 001 complete</h2>
        <div class="results">
          <div><span>score</span><strong id="clearScore">0</strong></div>
          <div><span>accuracy</span><strong id="clearAccuracy">100%</strong></div>
          <div><span>wpm</span><strong id="clearWpm">0</strong></div>
          <div><span>rewards</span><strong id="clearCredits">+0</strong></div>
          <div><span>max streak</span><strong id="clearStreak">0</strong></div>
        </div>
        <button id="nextStageButton" class="primary">Next stage</button>
        <button id="clearRetryButton">Replay stage</button>
        <button id="clearStageSelectButton">Stage Select</button>
        <button id="clearTitleButton">Back to title</button>
      </div>
    </section>

    <div id="learningToast" class="learning-toast" aria-live="polite">
      <strong id="learningWord"></strong>
      <span id="learningIpa"></span>
      <small id="learningVi"></small>
    </div>

    <div id="notice" class="notice" aria-live="polite"></div>
    <div
      id="worldTransition"
      class="world-transition hidden"
      aria-live="polite"
    >
      <small id="worldTransitionGalaxy">Galaxy 01 · World 01</small>
      <strong id="worldTransitionName">Rainbow Reach</strong>
      <span id="worldTransitionRange">Stage 001-020</span>
    </div>

    <dialog id="stageSelectDialog" class="settings-dialog stage-select-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">campaign</p>
          <h2>Stage Select</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <div class="stage-toolbar">
        <label>
          <span class="field-label">Galaxy</span>
          <select id="galaxySelect"></select>
        </label>
        <span id="campaignMeta"></span>
      </div>
      <div id="stageGrid" class="stage-grid"></div>
    </dialog>

    <dialog id="routeDialog" class="settings-dialog route-dialog">
      <form method="dialog" class="dialog-head">
        <div>
          <p class="eyebrow">sector navigation</p>
          <h2 id="routeTitle">Route Map</h2>
        </div>
        <button class="icon-button" aria-label="Close">×</button>
      </form>
      <p id="routeMeta" class="equipment-note">
        Choose one route for the next Campaign encounter.
      </p>
      <div id="routeMap" class="route-map"></div>
      <div id="routeSelectedPanel" class="route-selected-panel hidden">
        <strong id="routeSelectedTitle">Combat</strong>
        <span id="routeSelectedMeta"></span>
        <div class="route-actions">
          <button id="routeShopAction" class="hidden">Open Shop</button>
          <button id="routeStationShopAction" class="hidden">Station Shop</button>
          <button id="routeServiceAction" class="hidden">Repair / Upgrade</button>
          <button id="routeSupportAction" class="hidden">Support Loadout</button>
          <button id="routeContinueButton" class="primary">Start Encounter</button>
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
        Combat is paused. Pick one equipment reward to continue.
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
let characters: CharacterState = createStarterCharacterState();
let luckPity: LuckPityState = createLuckPityState();
let hiddenDiscovery: HiddenDiscoveryState = createHiddenDiscoveryState();
let credits = 0;
let progression: ProgressionState = createProgressionState();
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
let sourceState = loadSource();
let sourceTab: "class" | "custom" = sourceState.mode;
let vocabularyIndex: VocabularyIndex | null = null;
let configuredVocabulary: VocabularyEntry[] = [];
let artCatalog: ArtAssetCatalog | null = null;
const typingChallengeCache = new Map<
  string,
  Promise<TypingTextChallenge>
>();
let stageStartPending = false;
let learningTimer: number | null = null;
let noticeTimer: number | null = null;
let worldTransitionTimer: number | null = null;
let lastPresentedWorldId: string | null = null;
let currentGalaxy = Math.ceil(campaign.selectedStage / STAGES_PER_GALAXY);

const titleOverlay = byId("titleOverlay");
const pauseOverlay = byId("pauseOverlay");
const gameOverOverlay = byId("gameOverOverlay");
const stageClearOverlay = byId("stageClearOverlay");
const settingsDialog = byId<HTMLDialogElement>("settingsDialog");
const vocabularyDialog = byId<HTMLDialogElement>("vocabularyDialog");
const stageSelectDialog = byId<HTMLDialogElement>("stageSelectDialog");
const routeDialog = byId<HTMLDialogElement>("routeDialog");
const dataDialog = byId<HTMLDialogElement>("dataDialog");
const equipmentDialog = byId<HTMLDialogElement>("equipmentDialog");
const shopDialog = byId<HTMLDialogElement>("shopDialog");
const serviceShopDialog =
  byId<HTMLDialogElement>("serviceShopDialog");
const specialShopDialog =
  byId<HTMLDialogElement>("specialShopDialog");
const supportDialog = byId<HTMLDialogElement>("supportDialog");
const characterDialog = byId<HTMLDialogElement>("characterDialog");
const codexDialog = byId<HTMLDialogElement>("codexDialog");
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
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
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
    characters,
    luckPity,
    hiddenDiscovery,
    credits,
    progression,
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
  renderInventory();
  applyEquipmentStats();
  applySupportSpells();
  renderCodex();
  renderProgression();
  if (shopDialog.open) renderNormalShop();
  if (serviceShopDialog.open) renderServiceShop();
  if (specialShopDialog.open) renderSpecialShop();
  updateShopAccess();
  updateCampaignUi();
  updateDataSummary();
}

function renderStats(stats: GameStats): void {
  byId("score").textContent = stats.score.toLocaleString();
  byId("streak").textContent = String(stats.streak);
  byId("multiplier").textContent = "x" + String(stats.multiplier);
  byId("accuracy").textContent =
    accuracyPercent(stats.hits, stats.misses).toFixed(1) + "%";
  byId("kills").textContent = String(stats.kills);
  byId("waveBadge").textContent =
    "stage " + String(stats.stage).padStart(3, "0");

  byId("hull").textContent =
    String(Math.ceil(stats.hull)) + " / " + String(Math.ceil(stats.maxHull));
  byId("shield").textContent =
    String(Math.ceil(stats.shield)) + " / " + String(Math.ceil(stats.maxShield));
  byId("energyText").textContent =
    String(Math.ceil(stats.energy)) +
    " / " +
    String(Math.ceil(stats.maxEnergy));

  byId("powerFill").style.width = String(stats.power) + "%";
  byId("powerFill").classList.toggle("ready", stats.power >= 100);
  const ultimateName = getCharacter(characters.selected).ultimateName;
  byId("powerHint").textContent =
    stats.power >= 100
      ? "SPACE — " + ultimateName + " ready"
      : "charge " + ultimateName.toLowerCase();
}

function renderInventory(): void {
  const entries: Array<{
    id: RecoveryItemId;
    countId: string;
    buttonId: string;
  }> = [
    {
      id: "repair-kit",
      countId: "repairCount",
      buttonId: "quickRepair",
    },
    {
      id: "shield-cell",
      countId: "shieldCount",
      buttonId: "quickShield",
    },
    {
      id: "energy-cell",
      countId: "energyCount",
      buttonId: "quickEnergy",
    },
  ];

  for (const entry of entries) {
    const count = itemCount(inventory, entry.id);
    byId(entry.countId).textContent = String(count);
    byId<HTMLButtonElement>(entry.buttonId).disabled =
      count <= 0 || game.getPhase() !== "playing";
  }
}

function skillReasonText(reason: SkillBlockReason): string {
  if (reason === "cooldown") return "Skill is cooling down";
  if (reason === "no-charges") return "No charges left this stage";
  if (reason === "stage-limit") return "Stage use limit reached";
  if (reason === "energy") return "Not enough Energy";
  if (reason === "typing-condition") {
    return "Typing condition not met";
  }
  if (reason === "effect-not-needed") {
    return "No useful target or effect right now";
  }
  if (reason === "silenced") {
    return "Skills are temporarily Silenced";
  }
  return "Skill unavailable";
}

function renderSupportSkills(): void {
  const buttons = [
    byId<HTMLButtonElement>("supportSkill0"),
    byId<HTMLButtonElement>("supportSkill1"),
  ];

  for (let index = 0; index < buttons.length; index += 1) {
    const button = buttons[index]!;
    const slot = index as 0 | 1;
    const id = supportSpells.loadout[slot];
    const name = button.querySelector("span");
    const stateLabel = button.querySelector("strong");

    if (id === null) {
      if (name !== null) name.textContent = "empty";
      if (stateLabel !== null) stateLabel.textContent = "—";
      button.disabled = true;
      button.title = "Empty support spell slot";
      continue;
    }

    const spell = getSupportSpell(id);
    const state = game.getSkillState(id);
    const reason = game.canUseSkill(id);

    if (name !== null) name.textContent = spell.name.toLowerCase();
    if (stateLabel !== null) {
      if (state === null) {
        stateLabel.textContent = "—";
      } else if (state.cooldownRemaining > 0.05) {
        stateLabel.textContent = state.cooldownRemaining.toFixed(1) + "s";
      } else if (state.chargesRemaining !== null) {
        stateLabel.textContent = "×" + String(state.chargesRemaining);
      } else {
        stateLabel.textContent = "ready";
      }
    }

    button.disabled = reason !== null;
    button.title =
      reason === null ? spell.description : skillReasonText(reason);
  }
}

function selectedCharacterSkillId(): string | null {
  if (characters.selected === "vanguard") {
    return VANGUARD_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "aegis") {
    return AEGIS_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "volt") {
    return VOLT_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "wraith") {
    return WRAITH_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "fortune") {
    return FORTUNE_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "arsenal") {
    return ARSENAL_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "oracle") {
    return ORACLE_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "bastion") {
    return BASTION_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "reaper") {
    return REAPER_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "celestial") {
    return CELESTIAL_ACTIVE_SKILL_ID;
  }
  if (characters.selected === "zenith") {
    return ZENITH_ACTIVE_SKILL_ID;
  }
  return null;
}

function renderCharacterSkill(): void {
  const button = byId<HTMLButtonElement>("characterSkill");
  const name = button.querySelector("span");
  const stateLabel = button.querySelector("strong");
  const character = getCharacter(characters.selected);
  const skillId = selectedCharacterSkillId();

  if (name !== null) name.textContent = character.activeName.toLowerCase();

  if (skillId === null) {
    if (stateLabel !== null) stateLabel.textContent = "—";
    button.disabled = true;
    button.title = "Character skill is implemented in a later step";
    return;
  }

  const state = game.getSkillState(skillId);
  const reason = game.canUseSkill(skillId);

  if (stateLabel !== null) {
    if (state === null) {
      stateLabel.textContent = "—";
    } else if (state.cooldownRemaining > 0.05) {
      stateLabel.textContent = state.cooldownRemaining.toFixed(1) + "s";
    } else {
      stateLabel.textContent = "ready";
    }
  }

  button.disabled = reason !== null;
  button.title =
    reason === null ? character.activeName : skillReasonText(reason);
}

function renderAllSkills(): void {
  renderSkills();
  renderSupportSkills();
  renderCharacterSkill();
}

function useCharacterSkill(): void {
  const skillId = selectedCharacterSkillId();
  if (skillId === null) {
    showNotice("Character skill is not implemented yet");
    return;
  }

  const result = game.useSkill(skillId);
  if (!result.ok) {
    showNotice(skillReasonText(result.reason));
    renderAllSkills();
    return;
  }

  showNotice("✓ " + getCharacter(characters.selected).activeName + " activated");
  renderAllSkills();
}

function useSupportSpell(slot: 0 | 1): void {
  const id = supportSpells.loadout[slot];
  if (id === null) {
    showNotice("Support spell slot is empty");
    return;
  }

  const result = game.useSkill(id);
  if (!result.ok) {
    showNotice(skillReasonText(result.reason));
    renderAllSkills();
    return;
  }

  showNotice("✓ " + getSupportSpell(id).name + " activated");
  renderAllSkills();
}

function renderSkills(): void {
  const map: Array<{
    id: CombatSkillId;
    buttonId: string;
  }> = [
    { id: "barrier", buttonId: "skillBarrier" },
    { id: "reflect-field", buttonId: "skillReflect" },
    { id: "time-shell", buttonId: "skillTimeShell" },
    { id: "emergency-repair", buttonId: "skillRepair" },
    { id: "guardian-drone", buttonId: "skillGuardian" },
    { id: "emp-burst", buttonId: "skillEmp" },
    { id: "chain-lightning", buttonId: "skillChain" },
    { id: "mark-of-weakness", buttonId: "skillMark" },
  ];

  for (const entry of map) {
    const button = byId<HTMLButtonElement>(entry.buttonId);
    const state = game.getSkillState(entry.id);
    const reason = game.canUseSkill(entry.id);
    const label = button.querySelector("strong");

    if (label !== null) {
      if (state === null) {
        label.textContent = "—";
      } else if (state.cooldownRemaining > 0.05) {
        label.textContent = state.cooldownRemaining.toFixed(1) + "s";
      } else if (state.chargesRemaining !== null) {
        label.textContent = "×" + String(state.chargesRemaining);
      } else {
        label.textContent = "ready";
      }
    }

    button.disabled = reason !== null;
    const definition =
      DEFENSIVE_SKILLS.find((skill) => skill.id === entry.id) ??
      OFFENSIVE_SKILLS.find((skill) => skill.id === entry.id);

    button.title =
      reason === null
        ? definition?.name ?? entry.id
        : skillReasonText(reason);
  }
}

function useCombatSkill(id: CombatSkillId): void {
  const result = game.useSkill(id);
  if (!result.ok) {
    showNotice(skillReasonText(result.reason));
    renderSkills();
    return;
  }

  const skill =
    DEFENSIVE_SKILLS.find((entry) => entry.id === id) ??
    OFFENSIVE_SKILLS.find((entry) => entry.id === id);
  showNotice("✓ " + (skill?.name ?? id) + " activated");
  renderSkills();
}

function useInventoryItem(id: RecoveryItemId): void {
  if (itemCount(inventory, id) <= 0) return;
  if (!game.useConsumable(id)) {
    showNotice("Item not needed right now");
    return;
  }

  const removed = removeItem(inventory, id, 1);
  if (removed.changed <= 0) return;

  inventory = removed.inventory;
  renderInventory();
  void autosaveCampaign("inventory", "✓ Item used · progress saved");
}

function showLearning(entry: VocabularyEntry): void {
  if (learningTimer !== null) window.clearTimeout(learningTimer);
  byId("learningWord").textContent = entry.en;
  byId("learningIpa").textContent = entry.ipa;
  byId("learningVi").textContent = entry.vi;

  const toast = byId("learningToast");
  toast.classList.add("visible");
  learningTimer = window.setTimeout(() => {
    toast.classList.remove("visible");
    learningTimer = null;
  }, 2200);
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
  byId("quickItems").classList.toggle("hidden", phase !== "playing");
  byId("quickSkills").classList.toggle("hidden", phase !== "playing");
  byId("quickSupport").classList.toggle("hidden", phase !== "playing");

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
}

function renderStage(stage: number): void {
  const badge = byId("waveBadge");
  badge.textContent = "stage " + String(stage).padStart(3, "0");
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

function renderObjective(
  objective: StageObjectiveState | null,
): void {
  const badge = byId("objectiveBadge");
  if (objective === null) {
    badge.textContent = "";
    badge.title = "";
    badge.classList.add("hidden");
    return;
  }

  const prefix =
    objective.definition.required
      ? "OBJECTIVE // REQUIRED"
      : "OBJECTIVE // BONUS";
  badge.textContent =
    prefix +
    " · " +
    objective.definition.label +
    " · " +
    objectiveProgressText(objective) +
    " · " +
    objective.status.toUpperCase();
  badge.title =
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
  const hud = byId("bossHud");
  if (boss === null) {
    lastMusicBossPhase = 0;
    hud.classList.add("hidden");
    return;
  }

  if (boss.phase !== lastMusicBossPhase) {
    musicController.setBossPhase(boss.phase);
    lastMusicBossPhase = boss.phase;
  }

  hud.classList.remove("hidden");
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
  byId("bossName").textContent =
    boss.name +
    " · PHASE " +
    String(boss.phase) +
    mechanicMeta +
    (boss.shieldActive ? " · SHIELD" : boss.staggered ? " · STAGGER" : "");
  byId("bossHpText").textContent =
    Math.max(0, Math.ceil(boss.hp)).toLocaleString() +
    " / " +
    boss.maxHp.toLocaleString();

  const percent =
    boss.maxHp <= 0
      ? 0
      : Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
  byId("bossHpFill").style.width = percent.toFixed(2) + "%";
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
  });
  const entries = collectionEntries({
    characters,
    equipment,
    hidden: hiddenDiscovery,
    progression,
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

    const category = document.createElement("span");
    category.textContent = entry.category.toUpperCase();

    const title = document.createElement("strong");
    title.textContent = entry.title;

    const description = document.createElement("small");
    description.textContent = entry.description;

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
    const card = document.createElement("article");
    card.className = "progression-card";

    const title = document.createElement("strong");
    title.textContent = mission.name;

    const description = document.createElement("small");
    description.textContent = mission.description;

    const meta = document.createElement("span");
    meta.textContent =
      String(progress) +
      " / " +
      String(mission.target) +
      " · " +
      mission.rewardCredits.toLocaleString() +
      " Credits";

    const claim = document.createElement("button");
    claim.type = "button";
    claim.disabled = claimed || !missionClaimable(progression, id);
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

    card.append(title, description, meta, claim);
    missionGrid.append(card);
  }

  const achievementGrid = byId("achievementGrid");
  achievementGrid.replaceChildren();

  for (const id of ACHIEVEMENT_IDS) {
    const definition = ACHIEVEMENT_REGISTRY[id];
    const unlocked = progression.unlockedAchievements.includes(id);
    const card = document.createElement("article");
    card.className =
      "progression-card " + (unlocked ? "unlocked" : "locked");

    const title = document.createElement("strong");
    title.textContent = unlocked ? definition.name : "???";

    const description = document.createElement("small");
    description.textContent = unlocked
      ? definition.description
      : "Achievement not unlocked yet.";

    card.append(title, description);
    achievementGrid.append(card);
  }
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

function clearDeathRecoveryMarker(): void {
  crashRecoverySnapshot = null;
  campaignExpansion = {
    ...campaignExpansion,
    crashRecovery: null,
  };
}

function renderDeathProtectionChoices(failedStage: number): void {
  const anchorCount = itemCount(inventory, "salvage-anchor");
  const revivalCount = itemCount(inventory, "stage-revival-core");
  const phoenixCount = itemCount(inventory, "phoenix-core");
  const validStageEntry =
    stageEntrySnapshot !== null &&
    stageEntrySnapshot.stage === failedStage;

  byId("salvageAnchorButton").textContent =
    "Salvage Anchor · " + String(anchorCount);
  byId("stageRevivalButton").textContent =
    "Stage Revival Core · " + String(revivalCount);
  byId("phoenixCoreButton").textContent =
    "Phoenix Core · " + String(phoenixCount);

  byId<HTMLButtonElement>("salvageAnchorButton").disabled =
    anchorCount <= 0;
  byId<HTMLButtonElement>("stageRevivalButton").disabled =
    revivalCount <= 0 || !validStageEntry;
  byId<HTMLButtonElement>("phoenixCoreButton").disabled =
    phoenixCount <= 0 || !validStageEntry;

  const checkpointStage = campaignExpansion.checkpoint.stage;
  byId("againButton").textContent =
    "Retry checkpoint · Stage " +
    String(checkpointStage).padStart(3, "0");
  byId("deathProtectionMeta").textContent =
    "Death at Stage " +
    String(failedStage).padStart(3, "0") +
    " · checkpoint " +
    String(checkpointStage).padStart(3, "0") +
    ". Protection items are consumed only when chosen.";
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

async function resolveCheckpointDeath(
  action: "retry" | "stage-select" | "title",
): Promise<void> {
  if (game.getPhase() !== "gameover") return;

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
  refreshPersistentStateUi();

  const checkpointStage = campaignExpansion.checkpoint.stage;
  const saved = await persistResolvedDeath(
    "✓ Returned to checkpoint · Stage " +
      String(checkpointStage).padStart(3, "0"),
  );
  if (!saved) return;

  if (action === "retry") {
    await startSelectedStage();
  } else if (action === "stage-select") {
    game.backToTitle();
    openStageSelect();
  } else {
    game.backToTitle();
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
    "✓ Salvage Anchor consumed · gains preserved · checkpoint Stage " +
      String(campaignExpansion.checkpoint.stage).padStart(3, "0"),
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
        byId("resultScore").textContent = stats.score.toLocaleString();
        byId("resultWave").textContent =
          String(stats.stage).padStart(3, "0");
        byId("resultAccuracy").textContent =
          accuracyPercent(stats.hits, stats.misses).toFixed(1) + "%";
        byId("resultStreak").textContent = String(stats.maxStreak);

        const deathAt = new Date().toISOString();
        markCrashRecoveryDeathInvalid(deathAt);
        renderDeathProtectionChoices(stats.stage);
      }
    },
    onStage: renderStage,
    onStageEvents: renderStageEvents,
    onObjectiveUpdate: renderObjective,
    onStatuses: renderStatuses,
    onBossUpdate: renderBoss,
    onSkills: renderAllSkills,
    onStageClear: (stats) => {
      const wpm = stageWordsPerMinute(
        stats.hits,
        game.getStageElapsedSeconds(),
      );
      const accuracy = accuracyPercent(stats.hits, stats.misses);
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
      route = syncRouteStateForStage(
        route,
        campaign.highestUnlockedStage,
      );

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
      const creditReward =
        stageClearCreditReward({
          stage: stats.stage,
          accuracy,
          salvage: game.getPlayerStats().salvage,
        }) *
        game.getCreditsMultiplier() *
        combinedRewardMultiplier;
      credits = addCredits(credits, creditReward);

      const stageConfig = createStageConfig(stats.stage);
      const currencyReward = scaleExpansionCurrencyReward(
        stageClearExpansionCurrencyReward(
          stats.stage,
          stageConfig.role,
          accuracy,
        ),
        combinedRewardMultiplier,
      );
      expansionCurrencies = addExpansionCurrencyReward(
        expansionCurrencies,
        currencyReward,
      );
      const currencyRewardText =
        expansionCurrencyRewardText(currencyReward);
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

      const expansionResult =
        advanceCampaignExpansionOnStageClear(
          campaignExpansion,
          campaign,
          stats.stage,
          clearedAt,
        );
      campaignExpansion = expansionResult.state;
      if (expansionResult.checkpointCommitted) {
        checkpointSnapshot = createCheckpointSnapshot(
          currentRunPersistentState(),
          campaignExpansion.checkpoint.stage,
        );
      }
      stageEntrySnapshot = null;
      const checkpointText = expansionResult.checkpointCommitted
        ? " · Checkpoint " +
          String(campaignExpansion.checkpoint.stage).padStart(3, "0") +
          " committed"
        : "";

      void autosaveCampaign(
        "stage-clear",
        "✓ Saved · Stage " +
          String(stats.stage).padStart(3, "0") +
          " cleared" +
          unlockText +
          progressText +
          " · +" +
          creditReward.toLocaleString() +
          " Credits" +
          (currencyRewardText.length > 0
            ? " · " + currencyRewardText
            : "") +
          objectiveText +
          achievementText +
          checkpointText,
        "stage-clear",
      );

      byId("clearTitle").textContent =
        "Stage " + String(stats.stage).padStart(3, "0") + " complete";
      byId("clearScore").textContent = stats.score.toLocaleString();
      byId("clearAccuracy").textContent = accuracy.toFixed(1) + "%";
      byId("clearWpm").textContent = wpm.toFixed(0);
      byId("clearCredits").textContent =
        "+" +
        creditReward.toLocaleString() +
        " Credits" +
        (currencyRewardText.length > 0
          ? " · " + currencyRewardText
          : "") +
        objectiveText;
      byId("clearStreak").textContent = String(stats.maxStreak);

      updateCampaignUi();
    },
    onWordComplete: (entry) => {
      showLearning(entry);
      speakEnglish(entry.en, settings);
    },
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
  renderAllSkills();
}

function renderCharacters(): void {
  const grid = byId("characterGrid");
  grid.replaceChildren();

  for (const id of CHARACTER_IDS) {
    const definition = getCharacter(id);
    const unlocked = characters.unlocked.includes(id);
    const selected = characters.selected === id;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "character-card";
    card.classList.toggle("selected", selected);
    card.classList.toggle("locked", !unlocked);
    card.disabled = !unlocked;

    const top = document.createElement("div");
    top.className = "character-card-top";

    const name = document.createElement("strong");
    name.textContent = definition.name;

    const role = document.createElement("span");
    role.textContent = definition.role;

    top.append(name, role);

    const summary = document.createElement("p");
    summary.textContent = definition.summary;

    const progress = characters.progress[id];
    const skills = document.createElement("small");
    skills.textContent =
      definition.activeName +
      " · " +
      definition.ultimateName +
      " · Lv " +
      String(progress.level) +
      " · M " +
      String(progress.mastery);

    const status = document.createElement("em");
    status.textContent = selected
      ? "SELECTED"
      : unlocked
        ? "AVAILABLE"
        : "CLEAR STAGE " + String(definition.unlockStage).padStart(3, "0");

    card.append(top, summary, skills, status);

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
  }

  const selectedProgress = characters.progress[characters.selected];
  byId("characterSelectedMeta").textContent =
    "Selected: " +
    getCharacter(characters.selected).name +
    " · Lv " +
    String(selectedProgress.level) +
    " · Mastery " +
    String(selectedProgress.mastery);

  renderTalentPanel();
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
  const synergies = activeBuildSynergies();
  game.setBuildSynergies(synergies);
  game.setPlayerStats({
    base: DEFAULT_PLAYER_BASE_STATS,
    character: characterStatBonus(characters.selected),
    level: characterProgressStatBonus(
      characters.progress[characters.selected],
    ),
    equipment: equipmentStatBonus(equipment),
    talent: talentStatBonus(
      characters.progress[characters.selected].talents,
    ),
    synergy: buildSynergyStatBonus(synergies),
  });
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
    card.className = "equipment-slot";

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

    const detail = document.createElement("small");
    detail.textContent =
      current === null
        ? "No equipment"
        : gradeLabel(current.grade).toUpperCase() +
          " +" +
          String(current.enhancement) +
          " · " +
          getEquipmentDefinition(current.definitionId).description;

    card.append(title, select, detail);
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

function showWorldTransition(
  world: WorldProfile,
  stage: number,
): void {
  const panel = byId("worldTransition");
  const worldNumber = Math.floor((world.stageStart - 1) / 20) + 1;

  byId("worldTransitionGalaxy").textContent =
    "Galaxy " +
    String(world.galaxy).padStart(2, "0") +
    " · World " +
    String(worldNumber).padStart(2, "0");
  byId("worldTransitionName").textContent = world.name;
  byId("worldTransitionRange").textContent =
    "Stage " +
    String(stage).padStart(3, "0") +
    " · " +
    String(stageInWorld(stage)).padStart(2, "0") +
    " / 20";

  panel.classList.remove("hidden");
  if (worldTransitionTimer !== null) {
    window.clearTimeout(worldTransitionTimer);
  }
  worldTransitionTimer = window.setTimeout(() => {
    panel.classList.add("hidden");
    worldTransitionTimer = null;
  }, 2300);
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

function shopBalanceText(): string {
  return (
    credits.toLocaleString() +
    " Credits · " +
    expansionCurrencies.alloy.toLocaleString() +
    " Alloy · " +
    expansionCurrencies.starCrystal.toLocaleString() +
    " Star Crystal · " +
    expansionCurrencies.quantumCore.toLocaleString() +
    " Quantum Core"
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

function shopStockType(entry: ShopStockEntry): string {
  if (entry.kind === "equipment") {
    return gradeLabel(entry.grade).toUpperCase() + " EQUIPMENT";
  }
  const definition = getItemDefinition(entry.itemId);
  return (
    (definition.grade === undefined
      ? definition.category
      : gradeLabel(definition.grade)) +
    " ITEM"
  ).toUpperCase();
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
    const card = document.createElement("article");
    card.className = cardClass;

    const type = document.createElement("span");
    type.className = "shop-offer-type";
    type.textContent =
      shopStockType(entry) +
      " · STOCK " +
      String(entry.remaining);

    const title = document.createElement("strong");
    title.textContent = shopStockName(entry);

    const description = document.createElement("small");
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
    buy.textContent = soldOut
      ? "Sold out"
      : itemFull
        ? "Full"
        : formatShopPrice(entry.price);

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

    card.append(type, title, description, buy);
    grid.append(card);
  }
}

function renderNormalShop(): void {
  byId("shopCredits").textContent = shopBalanceText();
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
  },
): void {
  credits = next.credits;
  expansionCurrencies = next.expansionCurrencies;
  inventory = next.inventory;
  equipment = next.equipment;
  renderInventory();
  renderEquipment();
  applyEquipmentStats();
  updateDataSummary();
}

function renderServiceShop(): void {
  byId("serviceShopCredits").textContent =
    credits.toLocaleString() +
    " Credits · " +
    expansionCurrencies.alloy.toLocaleString() +
    " Alloy";

  const repairPanel = byId("repairServicePanel");
  repairPanel.replaceChildren();

  const repairCard = document.createElement("article");
  repairCard.className = "service-shop-card";

  const repairTitle = document.createElement("strong");
  repairTitle.textContent = "Repair Station Pack";

  const repairDescription = document.createElement("small");
  repairDescription.textContent =
    "Adds 1 Repair Kit and 1 Shield Cell. Service payment uses Credits + Alloy.";

  const repairButton = document.createElement("button");
  repairButton.type = "button";
  repairButton.textContent =
    REPAIR_PACK_COST.toLocaleString() +
    " Credits + " +
    REPAIR_PACK_ALLOY_COST.toLocaleString() +
    " Alloy";
  repairButton.disabled =
    credits < REPAIR_PACK_COST ||
    expansionCurrencies.alloy < REPAIR_PACK_ALLOY_COST;
  repairButton.addEventListener("click", () => {
    const result = buyRepairPack({
      credits,
      expansionCurrencies,
      inventory,
      equipment,
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

  repairCard.append(repairTitle, repairDescription, repairButton);
  repairPanel.append(repairCard);

  const grid = byId("upgradeShopGrid");
  grid.replaceChildren();

  for (const item of equipment.items) {
    const definition = getEquipmentDefinition(item.definitionId);
    const cost = equipmentUpgradeCost(item);
    const alloyCost = equipmentUpgradeAlloyCost(item);
    const card = document.createElement("article");
    card.className = "service-shop-card";

    const title = document.createElement("strong");
    title.textContent =
      definition.name +
      " · " +
      gradeLabel(item.grade).toUpperCase() +
      " +" +
      String(item.enhancement);

    const detail = document.createElement("small");
    detail.textContent =
      definition.slot +
      " · " +
      definition.description +
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
    button.textContent =
      cost === null || alloyCost === null
        ? "Max +5"
        : "Upgrade · " +
          cost.toLocaleString() +
          " Credits + " +
          alloyCost.toLocaleString() +
          " Alloy";

    button.addEventListener("click", () => {
      const result = buyEquipmentUpgrade(
        {
          credits,
          expansionCurrencies,
          inventory,
          equipment,
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

    card.append(title, detail, button);
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
  byId("specialShopCredits").textContent = shopBalanceText();

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
  return sourceState.mode === "class" ? sourceState.level : 1;
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

  if (result.completed) {
    const reward = hiddenEncounterReward(
      active,
      accuracy,
    );
    rewardCredits = reward.credits;
    credits = addCredits(credits, reward.credits);
    expansionCurrencies = addExpansionCurrencyReward(
      expansionCurrencies,
      reward.currencies,
    );
    const currencyText =
      expansionCurrencyRewardText(reward.currencies);
    rewardText =
      "+" +
      reward.credits.toLocaleString() +
      " Credits" +
      (currencyText.length > 0
        ? " · " + currencyText
        : "");
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

  byId("clearTitle").textContent =
    result.completed
      ? label + " complete"
      : hiddenEncounterLabel(result.state.active!);
  byId("clearScore").textContent =
    stats.score.toLocaleString();
  byId("clearAccuracy").textContent =
    accuracy.toFixed(1) + "%";
  byId("clearWpm").textContent = wpm.toFixed(0);
  byId("clearCredits").textContent = rewardText;
  byId("clearStreak").textContent =
    String(stats.maxStreak);
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

function renderRouteMap(): void {
  const targetStage = routeTargetStage();
  route = syncRouteStateForStage(route, targetStage);

  const progress = routeProgress(route);
  byId("routeTitle").textContent =
    "Sector " +
    String(route.graph.sectorStart).padStart(3, "0") +
    "-" +
    String(route.graph.sectorEnd).padStart(3, "0");
  byId("routeMeta").textContent =
    "Stage " +
    String(targetStage).padStart(3, "0") +
    " frontier · seed " +
    String(route.graph.seed) +
    " · " +
    String(progress.chosen) +
    " / " +
    String(progress.total) +
    " branch choices locked";

  const map = byId("routeMap");
  map.replaceChildren();

  for (const step of route.graph.steps) {
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
    const currentSelected =
      step.stage === targetStage
        ? selectedRouteNode(route, targetStage)
        : null;

    for (const node of step.nodes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "route-node route-node-" + node.type;
      button.dataset.nodeId = node.id;

      if (
        chosenId === node.id ||
        (step.nodes.length === 1 && node.mandatory)
      ) {
        button.classList.add("selected");
      }
      if (route.visitedNodeIds.includes(node.id)) {
        button.classList.add("visited");
      }

      button.disabled =
        step.stage !== targetStage ||
        currentSelected !== null ||
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
  byId("routeSelectedMeta").textContent =
    routeNodeDescription(selected);

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
  continueButton.disabled = false;
  renderHiddenEncounterOffers(targetStage);
}

async function chooseCurrentRouteNode(
  nodeId: string,
): Promise<void> {
  const targetStage = routeTargetStage();
  const previousRoute = route;
  const previousExpansion = campaignExpansion;
  const previousRecovery = crashRecoverySnapshot;
  const next = selectRouteNode(route, targetStage, nodeId);

  if (
    next.selectedByStage[String(targetStage)] ===
    previousRoute.selectedByStage[String(targetStage)]
  ) {
    renderRouteMap();
    return;
  }

  route = next;
  renderRouteMap();

  const saved = await autosaveCampaign(
    "route-choice",
    "✓ Route locked · Stage " +
      String(targetStage).padStart(3, "0"),
    "route-choice",
  );
  if (!saved) {
    route = previousRoute;
    campaignExpansion = previousExpansion;
    crashRecoverySnapshot = previousRecovery;
    renderRouteMap();
  }
}

function openRouteMap(): void {
  if (
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
  const difficulty = hiddenEncounterDifficulty(
    baseDifficulty,
    active.kind,
    active.tier,
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

  game.startStage(
    stage,
    difficulty,
    runtime,
  );
}

async function startSelectedStage(): Promise<void> {
  if (!persistenceReady || !vocabularyReady || stageStartPending) return;

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
    const stage = createStageConfig(campaign.selectedStage);
    const world = worldForStage(stage.stage);
    if (
      lastPresentedWorldId !== world.id ||
      stageInWorld(stage.stage) === 1
    ) {
      showWorldTransition(world, stage.stage);
      lastPresentedWorldId = world.id;
    }
    const vocabularyLevel = selectedVocabularyLevel();
    game.setVocabularyLevel(vocabularyLevel);
    await prepareStageVocabulary(stage);
    const difficulty = difficultyFor(
      difficultyInputFromSettings(
        difficultySettings,
        stage.stage,
        vocabularyLevel,
      ),
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
  progressionButton.disabled = true;
  for (const button of dataButtons) button.disabled = true;

  try {
    const loaded = await loadPlayerSave();
    campaign = loaded.save.campaign;
    inventory = loaded.save.inventory;
    equipment = loaded.save.equipment;
    supportSpells = loaded.save.supportSpells;
    luckPity = loaded.save.luckPity;
    hiddenDiscovery = loaded.save.hiddenDiscovery;
    credits = loaded.save.credits;
    progression = loaded.save.progression;
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
    currentGalaxy = Math.ceil(
      campaign.selectedStage / STAGES_PER_GALAXY,
    );
    persistenceReady = true;

    syncWorldMusicProfile(campaign.selectedStage);
    musicController.transitionTo("WORLD_NORMAL", 0.8);
    updateCampaignUi();
    startButton.disabled = !vocabularyReady;
    stageSelectButton.disabled = false;
    routeButton.disabled = false;
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
    progressionButton.disabled = false;
    renderCodex();
    renderProgression();
    renderServiceShop();
    updateShopAccess();
    for (const button of dataButtons) button.disabled = false;

    if (characters.unlocked.length !== loadedCharacters.unlocked.length) {
      void autosaveCampaign(
        "character",
        "✓ Character milestone unlocks synchronized",
      );
    }

    if (loaded.recoveryMode === "death-rollback") {
      showNotice(
        "Death record enforced · returned to checkpoint Stage " +
          String(campaignExpansion.checkpoint.stage).padStart(3, "0"),
      );
    } else if (loaded.recoveryMode === "crash") {
      showNotice(
        "✓ Recovered last safe transition · Stage " +
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
  byId<HTMLButtonElement>("nextStageButton").textContent = "Next stage";
  byId("startButton").textContent =
    "Continue · Stage " + String(campaign.selectedStage).padStart(3, "0");
  const selectedWorld = worldForStage(campaign.selectedStage);
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
    String(campaignExpansion.checkpoint.stage).padStart(3, "0") +
    " · record " +
    String(campaignExpansion.activeSegment.highestReachedStage).padStart(3, "0") +
    " · " +
    getCharacter(characters.selected).name;

  currentGalaxy = Math.min(
    GALAXY_COUNT,
    Math.max(1, Math.ceil(campaign.selectedStage / STAGES_PER_GALAXY)),
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

function renderStageGrid(): void {
  const grid = byId("stageGrid");
  grid.replaceChildren();

  const firstStage = (currentGalaxy - 1) * STAGES_PER_GALAXY + 1;
  const lastStage = currentGalaxy * STAGES_PER_GALAXY;
  const cleared = new Set(campaign.clearedStages);

  for (let stage = firstStage; stage <= lastStage; stage += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stage-button";
    button.textContent = String(stage).padStart(3, "0");

    const locked = !canSelectCampaignStage(
      campaign,
      campaignExpansion,
      stage,
    );
    button.disabled = locked;
    button.classList.toggle("locked", locked);
    button.classList.toggle("cleared", cleared.has(stage));
    button.classList.toggle("selected", stage === campaign.selectedStage);

    if (cleared.has(stage)) {
      button.title = "Cleared";
    } else if (locked) {
      button.title = "Locked";
    } else {
      button.title = "Current stage";
    }

    button.addEventListener("click", () => {
      if (!canSelectCampaignStage(campaign, campaignExpansion, stage)) {
        return;
      }
      campaign = selectCampaignStage(campaign, stage);
      void autosaveCampaign(
        "stage-select",
        "✓ Saved · Stage " +
          String(stage).padStart(3, "0") +
          " selected",
        "stage-select",
      );
      updateCampaignUi();
      stageSelectDialog.close();
    });

    grid.append(button);
  }
}

function openStageSelect(): void {
  populateGalaxySelect();
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
  renderStageGrid();
  stageSelectDialog.showModal();
}

function saveSettings(): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  game.updateSettings(settings);
  musicController.setMusicVolume(settings.musicVolume);
  musicController.setAmbientVolume(settings.ambientVolume);
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
}

function openSettings(): void {
  renderSettings();
  settingsDialog.showModal();
}

async function ensureVocabularyIndex(): Promise<VocabularyIndex> {
  vocabularyIndex ??= await loadVocabularyIndex();
  return vocabularyIndex;
}

function renderSourceTabs(): void {
  byId("sourceClass").classList.toggle("active", sourceTab === "class");
  byId("sourceCustom").classList.toggle("active", sourceTab === "custom");
  byId("classPanel").classList.toggle("hidden", sourceTab !== "class");
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
    " Quantum Core" +
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
    const importedCharacters = syncCharacterUnlocks(
      result.save.characters,
      imported.clearedStages,
    );
    const importedLuckPity = result.save.luckPity;
    const importedHiddenDiscovery = result.save.hiddenDiscovery;
    const importedCredits = result.save.credits;
    const importedProgression = result.save.progression;
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
    const previousCharacters = characters;
    const previousLuckPity = luckPity;
    const previousHiddenDiscovery = hiddenDiscovery;
    const previousCredits = credits;
    const previousProgression = progression;
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
    characters = importedCharacters;
    luckPity = importedLuckPity;
    hiddenDiscovery = importedHiddenDiscovery;
    credits = importedCredits;
    progression = importedProgression;
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
      characters = previousCharacters;
      luckPity = previousLuckPity;
      hiddenDiscovery = previousHiddenDiscovery;
      credits = previousCredits;
      progression = previousProgression;
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

async function openVocabulary(): Promise<void> {
  sourceTab = sourceState.mode;
  renderSourceTabs();
  try {
    await populateLevels();
  } catch (error) {
    byId("levelMeta").textContent =
      error instanceof Error ? error.message : "Unable to load levels.";
  }
  vocabularyDialog.showModal();
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

async function initializeArtPipeline(): Promise<void> {
  try {
    const manifest = await loadArtAssetManifest();
    artCatalog = await preloadArtAssets(manifest);
    updateDataSummary();

    if (artCatalog.failed.length > 0) {
      console.warn(
        "Optional art assets failed to load; procedural fallbacks remain active.",
        artCatalog.failed,
      );
    }
  } catch (error) {
    artCatalog = null;
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
    configuredVocabulary = await loadVocabularyLevel(
      sourceState.level,
      index,
    );
    game.setVocabulary(configuredVocabulary);
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

for (const id of [
  "startButton",
  "restartButton",
  "clearRetryButton",
  "nextStageButton",
]) {
  byId(id).addEventListener("click", () => {
    void startSelectedStage();
  });
}
byId("routeButton").addEventListener("click", openRouteMap);
byId("routeContinueButton").addEventListener("click", () => {
  if (routeNeedsChoice(route, routeTargetStage())) return;
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

const recoveryButtons: Array<[string, RecoveryItemId]> = [
  ["quickRepair", "repair-kit"],
  ["quickShield", "shield-cell"],
  ["quickEnergy", "energy-cell"],
];

for (const [buttonId, itemId] of recoveryButtons) {
  byId(buttonId).addEventListener("click", () => {
    useInventoryItem(itemId);
  });
}

const combatSkillButtons: Array<[string, CombatSkillId]> = [
  ["skillBarrier", "barrier"],
  ["skillReflect", "reflect-field"],
  ["skillTimeShell", "time-shell"],
  ["skillRepair", "emergency-repair"],
  ["skillGuardian", "guardian-drone"],
  ["skillEmp", "emp-burst"],
  ["skillChain", "chain-lightning"],
  ["skillMark", "mark-of-weakness"],
];

for (const [buttonId, skillId] of combatSkillButtons) {
  byId(buttonId).addEventListener("click", () => {
    useCombatSkill(skillId);
  });
}

byId("characterButton").addEventListener("click", openCharacters);
byId("equipmentButton").addEventListener("click", openEquipment);
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
      applyEquipmentStats();
      renderSupportLoadout();
      renderEquipment();
      void autosaveCampaign(
        "support-spells",
        "✓ Support loadout saved · applies next stage",
        "loadout",
      );
    },
  );
}

byId("supportSkill0").addEventListener("click", () => {
  useSupportSpell(0);
});
byId("characterSkill").addEventListener("click", useCharacterSkill);
byId("supportSkill1").addEventListener("click", () => {
  useSupportSpell(1);
});

for (const id of ["settingsButton", "pauseSettingsButton"]) {
  byId(id).addEventListener("click", openSettings);
}

for (const id of ["dataButton", "pauseDataButton"]) {
  byId(id).addEventListener("click", openData);
}

byId("codexButton").addEventListener("click", openCodex);
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
  renderStageGrid();
});

for (const id of ["vocabularyButton", "pauseVocabularyButton"]) {
  byId(id).addEventListener("click", () => void openVocabulary());
}

byId("sourceClass").addEventListener("click", () => {
  sourceTab = "class";
  renderSourceTabs();
  void populateLevels();
});

byId("sourceCustom").addEventListener("click", () => {
  sourceTab = "custom";
  renderSourceTabs();
});

byId("levelSelect").addEventListener("change", updateLevelMeta);

byId("applyLevel").addEventListener("click", () => {
  void applyClassLevel(Number(byId<HTMLSelectElement>("levelSelect").value));
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
    characterDialog.open ||
    codexDialog.open ||
    progressionDialog.open ||
    shopDialog.open ||
    serviceShopDialog.open ||
    specialShopDialog.open
  ) return;

  if (game.getPhase() === "playing" && event.key === "=") {
    event.preventDefault();
    useCharacterSkill();
    return;
  }

  if (
    game.getPhase() === "playing" &&
    (event.key === "[" || event.key === "]")
  ) {
    event.preventDefault();
    useSupportSpell(event.key === "[" ? 0 : 1);
    return;
  }

  if (
    game.getPhase() === "playing" &&
    (event.key === "4" ||
      event.key === "5" ||
      event.key === "6" ||
      event.key === "7" ||
      event.key === "8" ||
      event.key === "9" ||
      event.key === "0" ||
      event.key === "-")
  ) {
    event.preventDefault();
    const skillId: CombatSkillId =
      event.key === "4"
        ? "barrier"
        : event.key === "5"
          ? "reflect-field"
          : event.key === "6"
            ? "time-shell"
            : event.key === "7"
              ? "emergency-repair"
              : event.key === "8"
                ? "guardian-drone"
                : event.key === "9"
                  ? "emp-burst"
                  : event.key === "0"
                    ? "chain-lightning"
                    : "mark-of-weakness";
    useCombatSkill(skillId);
    return;
  }

  if (
    game.getPhase() === "playing" &&
    (event.key === "1" ||
      event.key === "2" ||
      event.key === "3")
  ) {
    event.preventDefault();
    const itemId: RecoveryItemId =
      event.key === "1"
        ? "repair-kit"
        : event.key === "2"
          ? "shield-cell"
          : "energy-cell";
    useInventoryItem(itemId);
    return;
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
renderStats(game.getStats());
renderPhase(game.getPhase());
renderAllSkills();
void initializeArtPipeline();
void initializePlayerProgress();
void loadInitialVocabulary();
