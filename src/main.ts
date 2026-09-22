import "./styles.css";
import { Game } from "./Game";
import {
  loadArtAssetManifest,
  preloadArtAssets,
  type ArtAssetCatalog,
} from "./assets/pipeline";
import { difficultyFor } from "./campaign/difficulty";
import {
  createDefaultCampaignProgress,
  recordStageClear,
  selectCampaignStage,
} from "./campaign/progress";
import {
  createStageConfig,
  GALAXY_COUNT,
  STAGES_PER_GALAXY,
} from "./campaign/stage";
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
  buyNormalShopOffer,
  normalShopItemIsFull,
  normalShopOfferName,
  normalShopOffers,
  type NormalShopOffer,
} from "./shops/normal-shop";
import {
  buyEquipmentUpgrade,
  buyRepairPack,
  equipmentUpgradeCost,
  REPAIR_PACK_COST,
} from "./shops/service-shop";
import {
  buySpecialShopOffer,
  specialShopOfferName,
  specialShopOffers,
  specialShopUnlocked,
  type SpecialShopKind,
  type SpecialShopOffer,
} from "./shops/special-shop";
import { accuracyPercent } from "./logic";
import type { EquipmentDrop } from "./loot/equipment-loot";
import type { StageEventDefinition } from "./events/stage-scheduler";
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
  exportPlayerSaveJson,
  parsePlayerSaveJson,
} from "./persistence/backup";
import {
  loadPlayerSave,
  savePlayerProgress,
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
const SOURCE_KEY = "spaceTypingVocabularySourceV1";
const CUSTOM_KEY = "spaceTypingCustomVocabularyV1";

type VocabularySource =
  | { mode: "class"; level: number }
  | { mode: "custom" };

const defaultSettings: GameSettings = {
  sfxVolume: 0.5,
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
        <div class="actions">
          <button id="startButton" class="primary">Continue · Stage 001</button>
          <button id="stageSelectButton">Stage Select</button>
          <button id="vocabularyButton">Vocabulary</button>
          <button id="characterButton">Characters</button>
          <button id="equipmentButton">Equipment</button>
          <button id="shopButton">Shop</button>
          <button id="serviceShopButton">Repair / Upgrade</button>
          <button id="blackMarketButton" class="hidden">Black Market</button>
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
        <button id="againButton" class="primary">Retry stage</button>
        <button id="gameOverStageSelectButton">Stage Select</button>
        <button id="resultTitleButton">Back to title</button>
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
          <div><span>credits</span><strong id="clearCredits">+0</strong></div>
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
        <strong id="serviceShopCredits">0 Credits</strong>
        · Upgrade owned equipment or restock one Repair Kit + Shield Cell.
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
            <small>Speech speed without cancelling queued words</small>
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
            <small>Particle density only; gameplay timing stays identical</small>
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
let campaign = createDefaultCampaignProgress();
let inventory: Inventory = createEmptyInventory();
let equipment: EquipmentState = createStarterEquipmentState();
let supportSpells: SupportSpellState = createStarterSupportSpellState();
let characters: CharacterState = createStarterCharacterState();
let luckPity: LuckPityState = createLuckPityState();
let hiddenDiscovery: HiddenDiscoveryState = createHiddenDiscoveryState();
let credits = 0;
let progression: ProgressionState = createProgressionState();
let persistenceReady = false;
let equipmentDropCounter = 0;
let shopPurchaseCounter = 0;
let currentSpecialShop: SpecialShopKind = "black-market";
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
let stageStartedAt = performance.now();
let currentGalaxy = Math.ceil(campaign.selectedStage / STAGES_PER_GALAXY);

const titleOverlay = byId("titleOverlay");
const pauseOverlay = byId("pauseOverlay");
const gameOverOverlay = byId("gameOverOverlay");
const stageClearOverlay = byId("stageClearOverlay");
const settingsDialog = byId<HTMLDialogElement>("settingsDialog");
const vocabularyDialog = byId<HTMLDialogElement>("vocabularyDialog");
const stageSelectDialog = byId<HTMLDialogElement>("stageSelectDialog");
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
  ),
);

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

function renderBoss(boss: BossHudState | null): void {
  const hud = byId("bossHud");
  if (boss === null) {
    hud.classList.add("hidden");
    return;
  }

  hud.classList.remove("hidden");
  byId("bossName").textContent =
    boss.name +
    " · PHASE " +
    String(boss.phase) +
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

    const rarity = document.createElement("span");
    rarity.textContent = option.rarity.toUpperCase();

    const name = document.createElement("strong");
    name.textContent = definition.name;

    const description = document.createElement("small");
    description.textContent = definition.description;

    button.append(rarity, name, description);
    button.addEventListener("click", () => {
      equipment = addEquipmentInstance(equipment, {
        instanceId: createEquipmentDropInstanceId(),
        definitionId: option.definitionId,
        rarity: option.rarity,
        enhancement: 0,
      });
      renderEquipment();
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

const game = new Game(
  byId<HTMLCanvasElement>("gameCanvas"),
  [],
  settings,
  {
    onStats: renderStats,
    onPhase: (phase) => {
      renderPhase(phase);
      if (phase === "gameover") {
        const stats = game.getStats();
        byId("resultScore").textContent = stats.score.toLocaleString();
        byId("resultWave").textContent =
          String(stats.stage).padStart(3, "0");
        byId("resultAccuracy").textContent =
          accuracyPercent(stats.hits, stats.misses).toFixed(1) + "%";
        byId("resultStreak").textContent = String(stats.maxStreak);
      }
    },
    onStage: renderStage,
    onStageEvents: renderStageEvents,
    onStatuses: renderStatuses,
    onBossUpdate: renderBoss,
    onSkills: renderAllSkills,
    onStageClear: (stats) => {
      const minutes = Math.max(
        1 / 60,
        (performance.now() - stageStartedAt) / 60000,
      );
      const wpm = (stats.hits / 5) / minutes;
      const accuracy = accuracyPercent(stats.hits, stats.misses);

      campaign = recordStageClear(campaign, stats.stage, {
        score: stats.score,
        accuracy,
        wpm,
        clearedAt: new Date().toISOString(),
      });

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
      const creditReward = stageClearCreditReward({
        stage: stats.stage,
        accuracy,
        salvage: game.getPlayerStats().salvage,
      });
      credits = addCredits(credits, creditReward);
      progression = recordProgressionEvent(progression, {
        type: "stage-clear",
        accuracy,
      });
      const achievementNames = syncProgressionAchievements();
      const achievementText =
        achievementNames.length > 0
          ? " · Achievement: " + achievementNames.join(", ")
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
          achievementText,
      );

      byId("clearTitle").textContent =
        "Stage " + String(stats.stage).padStart(3, "0") + " complete";
      byId("clearScore").textContent = stats.score.toLocaleString();
      byId("clearAccuracy").textContent = accuracy.toFixed(1) + "%";
      byId("clearWpm").textContent = wpm.toFixed(0);
      byId("clearCredits").textContent =
        "+" + creditReward.toLocaleString();
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
        rarity: drop.rarity,
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
          drop.rarity.toUpperCase() +
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
      updateSpecialShopAccess();
      const achievementNames = syncProgressionAchievements();
      if (achievementNames.length > 0) renderProgression();
      void autosaveCampaign(
        "discovery",
        discovery === null
          ? undefined
          : hiddenDiscoveryMessage(discovery),
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

function openSupportSpells(): void {
  if (!persistenceReady || game.getPhase() !== "title") return;
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
        item.rarity.toUpperCase() +
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
        : current.rarity.toUpperCase() +
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

function shopOfferDescription(offer: NormalShopOffer): string {
  if (offer.kind === "item") {
    return getItemDefinition(offer.itemId).description;
  }

  const definition = getEquipmentDefinition(offer.definitionId);
  return (
    offer.rarity.toUpperCase() +
    " · " +
    definition.slot +
    " · " +
    definition.description
  );
}

function renderNormalShop(): void {
  byId("shopCredits").textContent =
    credits.toLocaleString() + " Credits";

  const grid = byId("normalShopGrid");
  grid.replaceChildren();

  for (const offer of normalShopOffers(campaign.highestUnlockedStage)) {
    const card = document.createElement("article");
    card.className = "shop-offer";

    const type = document.createElement("span");
    type.className = "shop-offer-type";
    type.textContent =
      offer.kind === "item"
        ? "CONSUMABLE"
        : offer.rarity.toUpperCase() + " EQUIPMENT";

    const title = document.createElement("strong");
    title.textContent = normalShopOfferName(offer);

    const description = document.createElement("small");
    description.textContent = shopOfferDescription(offer);

    const buy = document.createElement("button");
    buy.type = "button";
    buy.className = "shop-buy";

    const itemFull =
      offer.kind === "item" &&
      normalShopItemIsFull(inventory, offer.itemId);
    buy.disabled = itemFull || credits < offer.price;
    buy.textContent = itemFull
      ? "Full"
      : offer.price.toLocaleString() + " Credits";

    buy.addEventListener("click", () => {
      const purchase = buyNormalShopOffer(
        { credits, inventory, equipment },
        offer,
        offer.kind === "equipment" ? createShopInstanceId() : "",
      );

      if (!purchase.purchased) {
        if (purchase.reason === "credits") {
          showNotice("Not enough Credits");
        } else if (purchase.reason === "full") {
          showNotice("Inventory stack is full");
        } else {
          showNotice("Unable to purchase this offer");
        }
        renderNormalShop();
        return;
      }

      credits = purchase.state.credits;
      inventory = purchase.state.inventory;
      equipment = purchase.state.equipment;
      renderInventory();
      renderEquipment();
      applyEquipmentStats();
      renderNormalShop();
      updateDataSummary();
      recordShopProgress();
      renderProgression();
      void autosaveCampaign(
        "shop",
        "✓ Purchased " +
          normalShopOfferName(offer) +
          " · " +
          credits.toLocaleString() +
          " Credits left",
      );
    });

    card.append(type, title, description, buy);
    grid.append(card);
  }
}

function openNormalShop(): void {
  if (!persistenceReady || game.getPhase() !== "title") return;
  renderNormalShop();
  shopDialog.showModal();
}

function applyServiceShopState(
  next: {
    credits: number;
    inventory: Inventory;
    equipment: EquipmentState;
  },
): void {
  credits = next.credits;
  inventory = next.inventory;
  equipment = next.equipment;
  renderInventory();
  renderEquipment();
  applyEquipmentStats();
  updateDataSummary();
}

function renderServiceShop(): void {
  byId("serviceShopCredits").textContent =
    credits.toLocaleString() + " Credits";

  const repairPanel = byId("repairServicePanel");
  repairPanel.replaceChildren();

  const repairCard = document.createElement("article");
  repairCard.className = "service-shop-card";

  const repairTitle = document.createElement("strong");
  repairTitle.textContent = "Repair Station Pack";

  const repairDescription = document.createElement("small");
  repairDescription.textContent =
    "Adds 1 Repair Kit and 1 Shield Cell using the existing inventory system.";

  const repairButton = document.createElement("button");
  repairButton.type = "button";
  repairButton.textContent =
    REPAIR_PACK_COST.toLocaleString() + " Credits";
  repairButton.disabled = credits < REPAIR_PACK_COST;
  repairButton.addEventListener("click", () => {
    const result = buyRepairPack({
      credits,
      inventory,
      equipment,
    });

    if (!result.applied) {
      showNotice(
        result.reason === "credits"
          ? "Not enough Credits"
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
      "✓ Repair Station pack purchased · " +
        credits.toLocaleString() +
        " Credits left",
    );
  });

  repairCard.append(repairTitle, repairDescription, repairButton);
  repairPanel.append(repairCard);

  const grid = byId("upgradeShopGrid");
  grid.replaceChildren();

  for (const item of equipment.items) {
    const definition = getEquipmentDefinition(item.definitionId);
    const cost = equipmentUpgradeCost(item);
    const card = document.createElement("article");
    card.className = "service-shop-card";

    const title = document.createElement("strong");
    title.textContent =
      definition.name +
      " · " +
      item.rarity.toUpperCase() +
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
    button.disabled = cost === null || credits < (cost ?? 0);
    button.textContent =
      cost === null
        ? "Max +5"
        : "Upgrade · " + cost.toLocaleString() + " Credits";

    button.addEventListener("click", () => {
      const result = buyEquipmentUpgrade(
        { credits, inventory, equipment },
        item.instanceId,
      );

      if (!result.applied) {
        showNotice(
          result.reason === "credits"
            ? "Not enough Credits"
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
      renderNormalShop();
      renderServiceShop();
      void autosaveCampaign(
        "shop",
        "✓ Upgraded " +
          definition.name +
          " · " +
          credits.toLocaleString() +
          " Credits left",
      );
    });

    card.append(title, detail, button);
    grid.append(card);
  }
}

function openServiceShop(): void {
  if (!persistenceReady || game.getPhase() !== "title") return;
  renderServiceShop();
  serviceShopDialog.showModal();
}

function specialShopOfferDescription(
  offer: SpecialShopOffer,
): string {
  if (offer.kind === "item") {
    return getItemDefinition(offer.itemId).description;
  }
  const definition = getEquipmentDefinition(offer.definitionId);
  return (
    offer.rarity.toUpperCase() +
    " · " +
    definition.slot +
    " · " +
    definition.description
  );
}

function updateSpecialShopAccess(): void {
  byId("blackMarketButton").classList.toggle(
    "hidden",
    !specialShopUnlocked("black-market", hiddenDiscovery),
  );
  byId("eventShopButton").classList.toggle(
    "hidden",
    !specialShopUnlocked("event-shop", hiddenDiscovery),
  );
}

function renderSpecialShop(): void {
  const isBlackMarket = currentSpecialShop === "black-market";
  byId("specialShopEyebrow").textContent = isBlackMarket
    ? "hidden market"
    : "event exchange";
  byId("specialShopTitle").textContent = isBlackMarket
    ? "Black Market"
    : "Event Shop";
  byId("specialShopMeta").textContent = isBlackMarket
    ? "Rare regular equipment with premium pricing."
    : "Special consumables from the existing item registry.";
  byId("specialShopCredits").textContent =
    credits.toLocaleString() + " Credits";

  const grid = byId("specialShopGrid");
  grid.replaceChildren();

  for (const offer of specialShopOffers(
    currentSpecialShop,
    campaign.highestUnlockedStage,
  )) {
    const card = document.createElement("article");
    card.className = "special-shop-offer";

    const type = document.createElement("span");
    type.className = "shop-offer-type";
    type.textContent =
      offer.kind === "item"
        ? "EVENT ITEM"
        : offer.rarity.toUpperCase() + " EQUIPMENT";

    const title = document.createElement("strong");
    title.textContent = specialShopOfferName(offer);

    const description = document.createElement("small");
    description.textContent = specialShopOfferDescription(offer);

    const buy = document.createElement("button");
    buy.type = "button";
    buy.textContent = offer.price.toLocaleString() + " Credits";
    buy.disabled = credits < offer.price;
    buy.addEventListener("click", () => {
      const purchase = buySpecialShopOffer(
        { credits, inventory, equipment },
        offer,
        offer.kind === "equipment" ? createShopInstanceId() : "",
      );

      if (!purchase.purchased) {
        showNotice(
          purchase.reason === "credits"
            ? "Not enough Credits"
            : purchase.reason === "full"
              ? "Inventory stack is full"
              : "Unable to purchase this offer",
        );
        renderSpecialShop();
        return;
      }

      applyServiceShopState(purchase.state);
      recordShopProgress();
      renderProgression();
      renderNormalShop();
      renderServiceShop();
      renderSpecialShop();
      void autosaveCampaign(
        "shop",
        "✓ Purchased " +
          specialShopOfferName(offer) +
          " · " +
          credits.toLocaleString() +
          " Credits left",
      );
    });

    card.append(type, title, description, buy);
    grid.append(card);
  }
}

function openSpecialShop(kind: SpecialShopKind): void {
  if (
    !persistenceReady ||
    game.getPhase() !== "title" ||
    !specialShopUnlocked(kind, hiddenDiscovery)
  ) {
    return;
  }
  currentSpecialShop = kind;
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

async function startSelectedStage(): Promise<void> {
  if (!persistenceReady || stageStartPending) return;
  stageStartPending = true;

  try {
    game.setCharacter(characters.selected);
    const stage = createStageConfig(campaign.selectedStage);
    await prepareStageVocabulary(stage);
    const difficulty = difficultyFor({
      stage: stage.stage,
      mode: "normal",
      vocabularyLevel: selectedVocabularyLevel(),
      recentWpm: 60,
      recentAccuracy: 96,
    });

    stageStartedAt = performance.now();
    game.startStage(stage, difficulty);
  } finally {
    stageStartPending = false;
  }
}

async function autosaveCampaign(
  reason: SaveReason,
  successMessage?: string,
): Promise<boolean> {
  campaignAutosave.schedule(
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
    },
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
  const dataButtons = [
    byId<HTMLButtonElement>("dataButton"),
    byId<HTMLButtonElement>("pauseDataButton"),
  ];
  const equipmentButton =
    byId<HTMLButtonElement>("equipmentButton");
  const shopButton = byId<HTMLButtonElement>("shopButton");
  const serviceShopButton =
    byId<HTMLButtonElement>("serviceShopButton");
  const blackMarketButton =
    byId<HTMLButtonElement>("blackMarketButton");
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
  equipmentButton.disabled = true;
  shopButton.disabled = true;
  serviceShopButton.disabled = true;
  blackMarketButton.disabled = true;
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

    updateCampaignUi();
    startButton.disabled = false;
    stageSelectButton.disabled = false;
    equipmentButton.disabled = false;
    shopButton.disabled = false;
    serviceShopButton.disabled = false;
    blackMarketButton.disabled = false;
    eventShopButton.disabled = false;
    supportButton.disabled = false;
    characterButton.disabled = false;
    codexButton.disabled = false;
    progressionButton.disabled = false;
    renderCodex();
    renderProgression();
    renderNormalShop();
    renderServiceShop();
    updateSpecialShopAccess();
    for (const button of dataButtons) button.disabled = false;

    if (characters.unlocked.length !== loadedCharacters.unlocked.length) {
      void autosaveCampaign(
        "character",
        "✓ Character milestone unlocks synchronized",
      );
    }

    if (loaded.migrated) {
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
  byId("startButton").textContent =
    "Continue · Stage " + String(campaign.selectedStage).padStart(3, "0");
  byId("campaignMeta").textContent =
    "Unlocked " +
    String(campaign.highestUnlockedStage).padStart(3, "0") +
    " / 1000 · " +
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

    const locked = stage > campaign.highestUnlockedStage;
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
      campaign = selectCampaignStage(campaign, stage);
      void autosaveCampaign(
        "stage-select",
        "✓ Saved · Stage " +
          String(stage).padStart(3, "0") +
          " selected",
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
    option.disabled =
      (galaxy - 1) * STAGES_PER_GALAXY + 1 >
      campaign.highestUnlockedStage;
  }

  select.value = String(currentGalaxy);
  renderStageGrid();
  stageSelectDialog.showModal();
}

function saveSettings(): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  game.updateSettings(settings);
}

function renderSettings(): void {
  const volume = byId<HTMLInputElement>("sfxVolume");
  volume.value = String(settings.sfxVolume);
  byId<HTMLOutputElement>("sfxValue").value =
    String(Math.round(settings.sfxVolume * 100)) + "%";

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
  byId("dataProgress").textContent =
    "Stage " +
    String(campaign.highestUnlockedStage).padStart(3, "0") +
    " / 1000 · " +
    String(inventoryTotal(inventory)) +
    " items · " +
    credits.toLocaleString() +
    " Credits" +
    artMeta;
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

  const saved = await autosaveCampaign("manual");
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
    campaign = imported;
    inventory = importedInventory;
    equipment = importedEquipment;
    supportSpells = importedSupportSpells;
    characters = importedCharacters;
    luckPity = importedLuckPity;
    hiddenDiscovery = importedHiddenDiscovery;
    credits = importedCredits;
    progression = importedProgression;
    syncProgressionAchievements();
    game.setLuckPityState(luckPity);
    game.setHiddenDiscoveryState(hiddenDiscovery);
    updateSpecialShopAccess();
    applySelectedCharacter();
    renderInventory();
    applyEquipmentStats();
    applySupportSpells();
    currentGalaxy = Math.ceil(
      campaign.selectedStage / STAGES_PER_GALAXY,
    );

    const saved = await autosaveCampaign("manual");
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
      game.setLuckPityState(luckPity);
      game.setHiddenDiscoveryState(hiddenDiscovery);
      updateSpecialShopAccess();
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
  if (sourceState.mode === "custom") {
    const custom = parseCustomVocabulary(localStorage.getItem(CUSTOM_KEY) ?? "");
    if (custom.length > 0) {
      configuredVocabulary = custom;
      game.setVocabulary(custom);
      return;
    }
    sourceState = { mode: "class", level: 1 };
  }

  try {
    const index = await ensureVocabularyIndex();
    configuredVocabulary = await loadVocabularyLevel(
      sourceState.level,
      index,
    );
    game.setVocabulary(configuredVocabulary);
  } catch (error) {
    console.warn("Shared vocabulary unavailable; using bundled fallback.", error);
  }
}

for (const id of [
  "startButton",
  "restartButton",
  "againButton",
  "clearRetryButton",
  "nextStageButton",
]) {
  byId(id).addEventListener("click", () => {
    void startSelectedStage();
  });
}
byId("resumeButton").addEventListener("click", () => game.resume());

for (const id of ["titleButton", "resultTitleButton", "clearTitleButton"]) {
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
byId("serviceShopButton").addEventListener("click", openServiceShop);
byId("blackMarketButton").addEventListener("click", () => {
  openSpecialShop("black-market");
});
byId("eventShopButton").addEventListener("click", () => {
  openSpecialShop("event-shop");
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
  "gameOverStageSelectButton",
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

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "hidden" || !persistenceReady) return;
  campaignAutosave.schedule(
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
    },
    "pagehide",
  );
  void campaignAutosave.flush("pagehide");
});

window.addEventListener("pagehide", () => {
  if (!persistenceReady) return;
  campaignAutosave.schedule(
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
    },
    "pagehide",
  );
  void campaignAutosave.flush("pagehide");
});

window.addEventListener("beforeunload", () => {
  stopSpeech();
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
