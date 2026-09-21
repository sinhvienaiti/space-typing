import "./styles.css";
import { Game } from "./Game";
import { accuracyPercent } from "./logic";
import { speakEnglish, stopSpeech } from "./speech";
import {
  loadVocabularyIndex,
  loadVocabularyLevel,
  parseCustomVocabulary,
} from "./vocabulary";
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

      <div id="waveBadge" class="wave-badge">wave 1</div>

      <div class="hud-side hud-side-right">
        <div class="metric"><span>accuracy</span><strong id="accuracy">100%</strong></div>
        <div class="metric"><span>kills</span><strong id="kills">0</strong></div>
        <div class="lives" id="lives">♥ ♥ ♥</div>
      </div>
    </header>

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
          <button id="startButton" class="primary">Start mission</button>
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
        <button id="restartButton">Restart run</button>
        <button id="titleButton">Back to title</button>
      </div>
    </section>

    <section id="gameOverOverlay" class="overlay hidden">
      <div class="pause-card">
        <p class="eyebrow">signal lost</p>
        <h2>Run over</h2>
        <div class="results">
          <div><span>score</span><strong id="resultScore">0</strong></div>
          <div><span>wave</span><strong id="resultWave">1</strong></div>
          <div><span>accuracy</span><strong id="resultAccuracy">100%</strong></div>
          <div><span>max streak</span><strong id="resultStreak">0</strong></div>
        </div>
        <button id="againButton" class="primary">Play again</button>
        <button id="resultTitleButton">Back to title</button>
      </div>
    </section>

    <div id="learningToast" class="learning-toast" aria-live="polite">
      <strong id="learningWord"></strong>
      <span id="learningIpa"></span>
      <small id="learningVi"></small>
    </div>

    <div id="notice" class="notice" aria-live="polite"></div>

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
let sourceState = loadSource();
let sourceTab: "class" | "custom" = sourceState.mode;
let vocabularyIndex: VocabularyIndex | null = null;
let learningTimer: number | null = null;
let noticeTimer: number | null = null;

const titleOverlay = byId("titleOverlay");
const pauseOverlay = byId("pauseOverlay");
const gameOverOverlay = byId("gameOverOverlay");
const settingsDialog = byId<HTMLDialogElement>("settingsDialog");
const vocabularyDialog = byId<HTMLDialogElement>("vocabularyDialog");

function renderStats(stats: GameStats): void {
  byId("score").textContent = stats.score.toLocaleString();
  byId("streak").textContent = String(stats.streak);
  byId("multiplier").textContent = "x" + String(stats.multiplier);
  byId("accuracy").textContent =
    accuracyPercent(stats.hits, stats.misses).toFixed(1) + "%";
  byId("kills").textContent = String(stats.kills);
  byId("waveBadge").textContent = "wave " + String(stats.wave);

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
}

function renderWave(wave: number): void {
  const badge = byId("waveBadge");
  badge.textContent = "wave " + String(wave);
  badge.classList.remove("pulse");
  void badge.offsetWidth;
  badge.classList.add("pulse");
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
        byId("resultWave").textContent = String(stats.wave);
        byId("resultAccuracy").textContent =
          accuracyPercent(stats.hits, stats.misses).toFixed(1) + "%";
        byId("resultStreak").textContent = String(stats.maxStreak);
      }
    },
    onWave: renderWave,
    onWordComplete: (entry) => {
      showLearning(entry);
      speakEnglish(entry.en, settings);
    },
  },
);

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

byId("startButton").addEventListener("click", () => game.start());
byId("resumeButton").addEventListener("click", () => game.resume());
byId("restartButton").addEventListener("click", () => game.start());
byId("againButton").addEventListener("click", () => game.start());

for (const id of ["titleButton", "resultTitleButton"]) {
  byId(id).addEventListener("click", () => game.backToTitle());
}

for (const id of ["settingsButton", "pauseSettingsButton"]) {
  byId(id).addEventListener("click", openSettings);
}

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
  if (settingsDialog.open || vocabularyDialog.open) return;

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
renderStats(game.getStats());
renderPhase(game.getPhase());
void loadInitialVocabulary();
