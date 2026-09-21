import "./styles.css";
import { Game } from "./Game";
import { accuracyPercent } from "./logic";
import type { GamePhase, GameSettings, GameStats, VisualQuality } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (app === null) {
  throw new Error("#app not found");
}

const SETTINGS_KEY = "spaceTypingSettingsV1";

const defaultSettings: GameSettings = {
  sfxVolume: 0.5,
  screenShake: true,
  visualQuality: "high",
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
    };
  } catch {
    return { ...defaultSettings };
  }
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

const titleOverlay = byId("titleOverlay");
const pauseOverlay = byId("pauseOverlay");
const gameOverOverlay = byId("gameOverOverlay");
const settingsDialog = byId<HTMLDialogElement>("settingsDialog");

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
}

function openSettings(): void {
  renderSettings();
  settingsDialog.showModal();
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
  if (settingsDialog.open) return;

  if (event.key === "Escape" || event.key === " ") {
    event.preventDefault();
  }

  game.handleKey(event.key);
});

window.addEventListener("resize", () => game.resize());
window.addEventListener("beforeunload", () => game.destroy());

renderSettings();
renderStats(game.getStats());
renderPhase(game.getPhase());
