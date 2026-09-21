import "./styles.css";
import { Game } from "./Game";
import { difficultyFor } from "./campaign/difficulty";
import {
  loadCampaignProgress,
  recordStageClear,
  saveCampaignProgress,
  selectCampaignStage,
} from "./campaign/progress";
import {
  createStageConfig,
  GALAXY_COUNT,
  STAGES_PER_GALAXY,
} from "./campaign/stage";
import { accuracyPercent } from "./logic";
import { speakEnglish, stopSpeech } from "./speech";
import {
  loadVocabularyIndex,
  loadVocabularyLevel,
  parseCustomVocabulary,
} from "./vocabulary";
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
        <div class="lives" id="lives">♥ ♥ ♥</div>
      </div>
    </header>

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
        <span>overdrive</span>
        <small id="powerHint">type cleanly to charge</small>
      </div>
      <div class="power-track">
        <div id="powerFill" class="power-fill"></div>
      </div>
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
let campaign = loadCampaignProgress();
let sourceState = loadSource();
let sourceTab: "class" | "custom" = sourceState.mode;
let vocabularyIndex: VocabularyIndex | null = null;
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

function renderStats(stats: GameStats): void {
  byId("score").textContent = stats.score.toLocaleString();
  byId("streak").textContent = String(stats.streak);
  byId("multiplier").textContent = "x" + String(stats.multiplier);
  byId("accuracy").textContent =
    accuracyPercent(stats.hits, stats.misses).toFixed(1) + "%";
  byId("kills").textContent = String(stats.kills);
  byId("waveBadge").textContent =
    "stage " + String(stats.stage).padStart(3, "0");

  byId("lives").textContent = Array.from({ length: 3 }, (_, index) =>
    index < stats.lives ? "♥" : "♡",
  ).join(" ");

  byId("powerFill").style.width = String(stats.power) + "%";
  byId("powerFill").classList.toggle("ready", stats.power >= 100);
  byId("powerHint").textContent =
    stats.power >= 100 ? "SPACE — ready" : "type cleanly to charge";
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
}

function renderStage(stage: number): void {
  const badge = byId("waveBadge");
  badge.textContent = "stage " + String(stage).padStart(3, "0");
  badge.classList.remove("pulse");
  void badge.offsetWidth;
  badge.classList.add("pulse");
}

function renderBoss(boss: BossHudState | null): void {
  const hud = byId("bossHud");
  if (boss === null) {
    hud.classList.add("hidden");
    return;
  }

  hud.classList.remove("hidden");
  byId("bossName").textContent = boss.name;
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
    onBossUpdate: renderBoss,
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
      saveCampaignProgress(campaign);

      byId("clearTitle").textContent =
        "Stage " + String(stats.stage).padStart(3, "0") + " complete";
      byId("clearScore").textContent = stats.score.toLocaleString();
      byId("clearAccuracy").textContent = accuracy.toFixed(1) + "%";
      byId("clearWpm").textContent = wpm.toFixed(0);
      byId("clearStreak").textContent = String(stats.maxStreak);

      updateCampaignUi();
      showNotice("✓ Saved · Stage " + String(stats.stage).padStart(3, "0") + " cleared");
    },
    onWordComplete: (entry) => {
      showLearning(entry);
      speakEnglish(entry.en, settings);
    },
  },
);

function selectedVocabularyLevel(): number {
  return sourceState.mode === "class" ? sourceState.level : 1;
}

function startSelectedStage(): void {
  const stage = createStageConfig(campaign.selectedStage);
  const difficulty = difficultyFor({
    stage: stage.stage,
    mode: "normal",
    vocabularyLevel: selectedVocabularyLevel(),
    recentWpm: 60,
    recentAccuracy: 96,
  });

  stageStartedAt = performance.now();
  game.startStage(stage, difficulty);
}

function updateCampaignUi(): void {
  byId("startButton").textContent =
    "Continue · Stage " + String(campaign.selectedStage).padStart(3, "0");
  byId("campaignMeta").textContent =
    "Unlocked " +
    String(campaign.highestUnlockedStage).padStart(3, "0") +
    " / 1000";

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
      saveCampaignProgress(campaign);
      updateCampaignUi();
      stageSelectDialog.close();
      showNotice("Stage " + String(stage).padStart(3, "0") + " selected");
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

async function loadInitialVocabulary(): Promise<void> {
  if (sourceState.mode === "custom") {
    const custom = parseCustomVocabulary(localStorage.getItem(CUSTOM_KEY) ?? "");
    if (custom.length > 0) {
      game.setVocabulary(custom);
      return;
    }
    sourceState = { mode: "class", level: 1 };
  }

  try {
    const index = await ensureVocabularyIndex();
    game.setVocabulary(await loadVocabularyLevel(sourceState.level, index));
  } catch (error) {
    console.warn("Shared vocabulary unavailable; using bundled fallback.", error);
  }
}

byId("startButton").addEventListener("click", startSelectedStage);
byId("resumeButton").addEventListener("click", () => game.resume());
byId("restartButton").addEventListener("click", startSelectedStage);
byId("againButton").addEventListener("click", startSelectedStage);
byId("clearRetryButton").addEventListener("click", startSelectedStage);
byId("nextStageButton").addEventListener("click", startSelectedStage);

for (const id of ["titleButton", "resultTitleButton", "clearTitleButton"]) {
  byId(id).addEventListener("click", () => game.backToTitle());
}

for (const id of ["settingsButton", "pauseSettingsButton"]) {
  byId(id).addEventListener("click", openSettings);
}

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
    stageSelectDialog.open
  ) return;

  if (event.key === "Escape" || event.key === " ") {
    event.preventDefault();
  }

  game.handleKey(event.key);
});

window.addEventListener("resize", () => game.resize());
window.addEventListener("beforeunload", () => {
  stopSpeech();
  game.destroy();
});

renderSettings();
updateCampaignUi();
renderStats(game.getStats());
renderPhase(game.getPhase());
void loadInitialVocabulary();
