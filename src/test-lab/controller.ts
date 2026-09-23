import {
  Game,
  type GameHooks,
  type TestLabDeathMode,
  type TestLabGameSnapshot,
} from "../Game";
import { MusicController } from "../audio/MusicController";
import {
  MUSIC_STATES,
  musicProfileForWorld,
  type MusicState,
} from "../audio/music-profile";
import { difficultyFor } from "../campaign/difficulty";
import {
  createDifficultySettings,
  difficultyInputFromSettings,
  DIFFICULTY_MODES,
} from "../campaign/difficulty-settings";
import { createStageConfig } from "../campaign/stage";
import type { DifficultyMode } from "../campaign/types";
import {
  restoreCheckpointSnapshot,
} from "../persistence/checkpoint";
import {
  consumePhoenixCore,
  resolveSalvageAnchor,
  resolveStageRevivalCore,
} from "../persistence/death-protection";
import {
  captureCrashRecoverySnapshot,
  invalidateCrashRecoverySnapshot,
  resolveCrashRecovery,
} from "../persistence/crash-recovery";
import {
  addItem,
  removeItem,
} from "../items/inventory";
import {
  getItemDefinition,
  type ItemId,
} from "../items/registry";
import {
  ENEMY_RANKS,
  type EnemyRank,
} from "../enemies/rank";
import type { EnemyDefinitionId } from "../enemies/registry";
import type { EnemySkillId } from "../enemies/skills";
import type { StatusId } from "../status/engine";
import type { SupportSpellId } from "../skills/support";
import {
  worldForStage,
} from "../worlds/registry";
import type {
  GameSettings,
  VocabularyEntry,
} from "../types";
import {
  createTestLabRegistry,
  type TestLabRegistry,
} from "./registry";
import {
  cloneTestLabSession,
  createTestLabSession,
  testLabCampaignExpansion,
  type TestLabSession,
} from "./session";

const TEST_LAB_PRESET_KEY = "spaceTypingTestLabPresetV1";

export type TestLabMountOptions = {
  getSettings(): GameSettings;
  getVocabulary(): VocabularyEntry[];
  showNotice?(message: string): void;
};

export type TestLabController = {
  open(): void;
  destroy(): void;
};

function option(
  value: string,
  label = value,
): HTMLOptionElement {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

function numberValue(
  root: ParentNode,
  selector: string,
  fallback: number,
): number {
  const value = Number(
    root.querySelector<HTMLInputElement>(selector)?.value,
  );
  return Number.isFinite(value) ? value : fallback;
}

function inputValue(
  root: ParentNode,
  selector: string,
): string {
  return root.querySelector<HTMLInputElement | HTMLSelectElement>(
    selector,
  )?.value ?? "";
}

function setOptions(
  select: HTMLSelectElement,
  values: readonly { value: string; label: string }[],
): void {
  select.replaceChildren(
    ...values.map((entry) => option(entry.value, entry.label)),
  );
}

function inventoryText(session: TestLabSession): string {
  const entries = Object.entries(session.state.inventory)
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  return entries.length === 0
    ? "empty"
    : entries.map(([id, count]) => id + " ×" + String(count)).join("\n");
}

function currencyText(session: TestLabSession): string {
  return [
    "Credits " + session.state.credits.toLocaleString(),
    "Alloy " + session.state.expansionCurrencies.alloy.toLocaleString(),
    "Star Crystal " +
      session.state.expansionCurrencies.starCrystal.toLocaleString(),
    "Quantum Core " +
      session.state.expansionCurrencies.quantumCore.toLocaleString(),
  ].join(" · ");
}

function snapshotText(
  snapshot: TestLabGameSnapshot | null,
  session: TestLabSession,
  music: MusicController | null,
): string {
  const runtime =
    snapshot === null
      ? {
          runtime: "not started",
        }
      : {
          phase: snapshot.phase,
          stage: snapshot.stage,
          deathMode: snapshot.deathMode,
          lethalHits: snapshot.lethalHits,
          player: snapshot.stats,
          enemies: snapshot.enemies.map((enemy) => ({
            id: enemy.id,
            definitionId: enemy.definitionId,
            kind: enemy.kind,
            rank: enemy.rank,
            layersRemaining: enemy.layersRemaining,
            skillIds: enemy.skillIds,
            actionCooldown: enemy.actionCooldown,
            y: Math.round(enemy.y),
          })),
          boss: snapshot.boss,
          statuses: snapshot.statuses,
          projectiles: snapshot.projectiles,
          particles: snapshot.particles,
          activePressure: snapshot.activePressure,
          difficulty: snapshot.difficulty,
        };

  return JSON.stringify(
    {
      sandbox: {
        stage: session.stage,
        checkpointStage: session.checkpointStage,
        currencies: currencyText(session),
        inventory: session.state.inventory,
        campaignExpansion: session.campaignExpansion,
        stageEntrySnapshot: {
          stage: session.stageEntrySnapshot.stage,
          capturedAt: session.stageEntrySnapshot.capturedAt,
        },
        crashRecoverySnapshot: {
          stage: session.crashRecoverySnapshot.state.campaign.selectedStage,
          savedAt: session.crashRecoverySnapshot.savedAt,
          reason: session.crashRecoverySnapshot.reason,
          deathInvalidated: session.crashRecoverySnapshot.deathInvalidated,
        },
      },
      music:
        music === null
          ? "not started"
          : {
              state: music.getState(),
              world: music.getWorldProfile().worldId,
            },
      runtime,
    },
    null,
    2,
  );
}

function stageForWorld(
  registry: TestLabRegistry,
  worldId: string,
): number {
  return registry.worlds.find((world) => world.id === worldId)?.stageStart ?? 1;
}

function enemyKindForRole(role: string): import("../types").EnemyKind {
  switch (role) {
    case "swift":
      return "sniper";
    case "tank":
      return "tank";
    case "burst":
      return "destroyer";
    case "control":
      return "jammer";
    case "support":
      return "healer";
    case "elite":
      return "commander";
    default:
      return "scout";
  }
}

export function mountTestLab(
  options: TestLabMountOptions,
): TestLabController {
  const registry = createTestLabRegistry();
  let session = createTestLabSession(1, 1, "test-lab");
  let game: Game | null = null;
  let music: MusicController | null = null;
  let inspectorTimer = 0;

  const button = document.createElement("button");
  button.id = "testLabButton";
  button.type = "button";
  button.textContent = "Developer Test Lab";
  button.className = "test-lab-launch";

  const actions = document.querySelector("#titleOverlay .actions");
  actions?.append(button);

  const dialog = document.createElement("dialog");
  dialog.id = "testLabDialog";
  dialog.className = "settings-dialog test-lab-dialog";
  dialog.innerHTML = `
    <div class="dialog-head">
      <div>
        <p class="eyebrow">developer qa // isolated sandbox</p>
        <h2>Test Lab</h2>
      </div>
      <button type="button" class="icon-button" data-action="close" aria-label="Close">×</button>
    </div>
    <p class="equipment-note">
      Production Game runtime, isolated session state. Test Lab actions never autosave Campaign progression.
    </p>
    <div class="test-lab-shell">
      <section class="test-lab-arena">
        <canvas data-role="canvas" aria-label="Test Lab battlefield"></canvas>
        <div class="test-lab-arena-actions">
          <button type="button" class="primary" data-action="start">Start / Restart Arena</button>
          <button type="button" data-action="pause">Pause / Resume</button>
          <button type="button" data-action="reset-arena">Reset Arena</button>
        </div>
      </section>
      <aside class="test-lab-controls">
        <details open>
          <summary>World / Stage / Difficulty</summary>
          <div class="test-lab-grid">
            <label>World<select data-field="world"></select></label>
            <label>Stage<input data-field="stage" type="number" min="1" max="1000" value="1"></label>
            <label>Checkpoint<input data-field="checkpoint" type="number" min="1" max="1000" value="1"></label>
            <label>Difficulty<select data-field="difficulty"></select></label>
            <label>Vocabulary level<input data-field="vocab-level" type="number" min="1" max="100" value="1"></label>
            <label>Death mode<select data-field="death-mode">
              <option value="immortal">Immortal</option>
              <option value="real">Real Death</option>
            </select></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="commit-scenario">Apply Scenario State</button>
            <button type="button" data-action="return-checkpoint">Return to Checkpoint</button>
            <button type="button" data-action="salvage-anchor">Use Salvage Anchor</button>
          </div>
        </details>

        <details>
          <summary>Death / Recovery Acceptance</summary>
          <div class="test-lab-row">
            <button type="button" data-action="capture-crash">Capture Crash Snapshot</button>
            <button type="button" data-action="recover-crash">Recover Crash</button>
            <button type="button" data-action="death-no-item">Death · No Item</button>
            <button type="button" data-action="salvage-anchor">Death · Salvage Anchor</button>
            <button type="button" data-action="stage-revival">Death · Stage Revival Core</button>
            <button type="button" data-action="phoenix-revive">Phoenix Core · Revive Encounter</button>
          </div>
        </details>

        <details open>
          <summary>Enemy Runtime</summary>
          <div class="test-lab-grid">
            <label>Enemy<select data-field="enemy"></select></label>
            <label>Rank<select data-field="rank"></select></label>
            <label>Layers<select data-field="layers">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select></label>
            <label>Count<input data-field="enemy-count" type="number" min="1" max="30" value="1"></label>
            <label>Skill<select data-field="enemy-skill"></select></label>
            <label>Enemy ID<select data-field="enemy-id"></select></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="spawn-enemy">Spawn Selected</button>
            <button type="button" data-action="spawn-world-roster">Spawn World Roster</button>
            <button type="button" data-action="force-enemy-skill">Force Skill</button>
            <button type="button" data-action="force-word">Force Word / Next Layer</button>
            <button type="button" data-action="kill-enemy">Kill Selected</button>
            <button type="button" data-action="clear-enemies">Clear Enemies</button>
          </div>
        </details>

        <details>
          <summary>Boss Runtime</summary>
          <div class="test-lab-grid">
            <label>HP %<input data-field="boss-hp" type="number" min="0" max="100" value="100"></label>
            <label>Phase<select data-field="boss-phase">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select></label>
            <label>Stagger seconds<input data-field="boss-stagger" type="number" min="0" max="120" value="0"></label>
            <label class="test-lab-check"><input data-field="boss-shield" type="checkbox"> Shield active</label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="spawn-boss">Spawn Stage Boss</button>
            <button type="button" data-action="apply-boss">Apply Boss State</button>
            <button type="button" data-action="clear-boss">Clear Boss</button>
          </div>
        </details>

        <details>
          <summary>Player / Status</summary>
          <div class="test-lab-grid">
            <label>Hull<input data-field="hull" type="number" min="0" value="100"></label>
            <label>Shield<input data-field="shield" type="number" min="0" value="40"></label>
            <label>Energy<input data-field="energy" type="number" min="0" value="100"></label>
            <label>Power<input data-field="power" type="number" min="0" max="100" value="0"></label>
            <label>Status<select data-field="status"></select></label>
            <label>Duration<input data-field="status-duration" type="number" min="0.1" max="120" step="0.5" value="5"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="apply-resources">Apply Resources</button>
            <button type="button" data-action="damage-50">Damage 50</button>
            <button type="button" data-action="damage-lethal">Force Lethal</button>
            <button type="button" data-action="apply-status">Apply Status</button>
            <button type="button" data-action="clear-status">Clear Statuses</button>
          </div>
        </details>

        <details>
          <summary>Skills / Time / Scheduler</summary>
          <div class="test-lab-grid">
            <label>Player skill<select data-field="player-skill"></select></label>
            <label>Time scale<select data-field="time-scale">
              <option value="0.25">0.25×</option>
              <option value="0.5">0.5×</option>
              <option value="1" selected>1×</option>
              <option value="2">2×</option>
              <option value="4">4×</option>
            </select></label>
            <label class="test-lab-check"><input data-field="scheduler-frozen" type="checkbox"> Freeze auto spawn scheduler</label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="use-player-skill">Force Skill Activation</button>
            <button type="button" data-action="reset-skill-cooldowns">Reset Skill Cooldowns</button>
            <button type="button" data-action="apply-time">Apply Time / Scheduler</button>
            <button type="button" data-action="step-scheduler">Step Scheduler Once</button>
            <button type="button" data-action="clear-projectiles">Clear Projectiles</button>
            <button type="button" data-action="clear-particles">Clear Particles</button>
          </div>
        </details>

        <details>
          <summary>Inventory Sandbox</summary>
          <div class="test-lab-grid">
            <label>Item<select data-field="item"></select></label>
            <label>Exact quantity<input data-field="item-quantity" type="number" min="0" max="99999" value="1"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="give-1">Give ×1</button>
            <button type="button" data-action="give-5">Give ×5</button>
            <button type="button" data-action="give-99">Give ×99</button>
            <button type="button" data-action="set-item">Set Exact</button>
            <button type="button" data-action="remove-item">Remove</button>
            <button type="button" data-action="use-item">Use via Game</button>
            <button type="button" data-action="clear-inventory">Clear</button>
          </div>
          <pre class="test-lab-mini-inspector" data-role="inventory"></pre>
        </details>

        <details>
          <summary>Music / Audio Runtime</summary>
          <div class="test-lab-grid">
            <label>Music state<select data-field="music-state"></select></label>
            <label>Crossfade sec<input data-field="crossfade" type="number" min="0" max="10" step="0.1" value="0.8"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="play-music">Transition</button>
            <button type="button" data-action="duck-announcer">Duck Announcer</button>
            <button type="button" data-action="duck-pronunciation">Duck Pronunciation</button>
            <button type="button" data-action="duck-warning">Duck Warning</button>
            <button type="button" data-action="release-ducks">Release Ducks</button>
            <button type="button" data-action="stop-music">Stop</button>
          </div>
        </details>

        <details>
          <summary>Sandbox Economy / Preset</summary>
          <div class="test-lab-grid">
            <label>Credits<input data-field="credits" type="number" min="0" value="0"></label>
            <label>Alloy<input data-field="alloy" type="number" min="0" value="0"></label>
            <label>Star Crystal<input data-field="star-crystal" type="number" min="0" value="0"></label>
            <label>Quantum Core<input data-field="quantum-core" type="number" min="0" value="0"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="apply-economy">Apply Economy</button>
            <button type="button" data-action="save-preset">Save Local Preset</button>
            <button type="button" data-action="load-preset">Load Local Preset</button>
          </div>
        </details>

        <details open>
          <summary>State Inspector</summary>
          <pre class="test-lab-inspector" data-role="inspector"></pre>
        </details>
      </aside>
    </div>
  `;
  document.body.append(dialog);

  const canvas = dialog.querySelector<HTMLCanvasElement>('[data-role="canvas"]')!;
  const inspector = dialog.querySelector<HTMLElement>('[data-role="inspector"]')!;
  const inventoryInspector =
    dialog.querySelector<HTMLElement>('[data-role="inventory"]')!;

  const worldSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="world"]')!;
  const difficultySelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="difficulty"]')!;
  const enemySelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="enemy"]')!;
  const rankSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="rank"]')!;
  const skillSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="enemy-skill"]')!;
  const enemyIdSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="enemy-id"]')!;
  const statusSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="status"]')!;
  const itemSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="item"]')!;
  const playerSkillSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="player-skill"]')!;
  const musicStateSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="music-state"]')!;

  setOptions(
    worldSelect,
    registry.worlds.map((world) => ({
      value: world.id,
      label:
        world.id.toUpperCase() +
        " · " +
        world.name +
        " · " +
        String(world.stageStart).padStart(3, "0") +
        "-" +
        String(world.stageEnd).padStart(3, "0"),
    })),
  );
  setOptions(
    difficultySelect,
    DIFFICULTY_MODES.map((mode) => ({
      value: mode,
      label: mode,
    })),
  );
  setOptions(
    enemySelect,
    registry.enemies.map((enemy) => ({
      value: enemy.id,
      label: enemy.name + " · " + enemy.role,
    })),
  );
  setOptions(
    rankSelect,
    ENEMY_RANKS.map((rank) => ({
      value: rank,
      label: "Rank " + rank,
    })),
  );
  setOptions(
    skillSelect,
    registry.enemySkills.map((skill) => ({
      value: skill.id,
      label: skill.name + " · " + skill.category,
    })),
  );
  setOptions(
    statusSelect,
    registry.statuses.map((status) => ({
      value: status.id,
      label: status.label,
    })),
  );
  setOptions(
    itemSelect,
    registry.items.map((item) => ({
      value: item.id,
      label: item.name + " · " + item.category,
    })),
  );
  setOptions(
    playerSkillSelect,
    [
      ...registry.playerSkills.map((id) => ({
        value: id,
        label: "Core · " + id,
      })),
      ...registry.supportSpells.map((id) => ({
        value: id,
        label: "Support · " + id,
      })),
    ],
  );
  setOptions(
    musicStateSelect,
    MUSIC_STATES.map((state) => ({
      value: state,
      label: state,
    })),
  );

  function notice(message: string): void {
    options.showNotice?.("Test Lab · " + message);
  }

  function currentSnapshot(): TestLabGameSnapshot | null {
    return game?.getTestLabSnapshot() ?? null;
  }

  function refreshEnemyIds(snapshot: TestLabGameSnapshot | null): void {
    const selected = enemyIdSelect.value;
    const values =
      snapshot?.enemies.map((enemy) => ({
        value: String(enemy.id),
        label:
          "#" +
          String(enemy.id) +
          " · " +
          (enemy.definitionId ?? enemy.kind),
      })) ?? [];
    setOptions(enemyIdSelect, values);
    if (values.some((value) => value.value === selected)) {
      enemyIdSelect.value = selected;
    }
  }

  function renderInspector(): void {
    const snapshot = currentSnapshot();
    inspector.textContent = snapshotText(snapshot, session, music);
    inventoryInspector.textContent =
      inventoryText(session) +
      "\n\n" +
      currencyText(session);
    refreshEnemyIds(snapshot);
  }

  function stopInspector(): void {
    if (inspectorTimer !== 0) {
      window.clearInterval(inspectorTimer);
      inspectorTimer = 0;
    }
  }

  function startInspector(): void {
    stopInspector();
    inspectorTimer = window.setInterval(renderInspector, 300);
  }

  function destroyRuntime(): void {
    stopInspector();
    game?.destroy();
    game = null;
    music?.destroy();
    music = null;
  }

  function runtimeHooks(): GameHooks {
    return {
      onStats: renderInspector,
      onPhase: renderInspector,
      onStage: renderInspector,
      onStageEvents: () => renderInspector(),
      onObjectiveUpdate: () => renderInspector(),
      onStageClear: () => renderInspector(),
      onBossUpdate: () => renderInspector(),
      onWordComplete: () => renderInspector(),
      onEquipmentDrop: () => undefined,
      onRewardChoice: () => undefined,
      onBossRewardChoice: () => undefined,
      onEnemySeen: () => undefined,
      onAnomalyReady: () => undefined,
      onLuckPityUpdate: () => undefined,
      onHiddenDiscoveryUpdate: () => undefined,
      onStatuses: () => renderInspector(),
      onSkills: () => renderInspector(),
    };
  }

  function createRuntime(): Game {
    game?.destroy();
    const settings = options.getSettings();
    const entries = options.getVocabulary();
    game = new Game(canvas, entries, settings, runtimeHooks());
    game.setTestLabMode(
      true,
      inputValue(dialog, '[data-field="death-mode"]') as TestLabDeathMode,
    );
    game.setVocabularyLevel(
      numberValue(dialog, '[data-field="vocab-level"]', 1),
    );
    if (entries.length > 0) game.setVocabulary(entries);

    music?.destroy();
    music = new MusicController();
    music.setMusicVolume(settings.musicVolume);
    music.setAmbientVolume(settings.ambientVolume);
    music.setWorldProfile(
      musicProfileForWorld(
        worldForStage(
          numberValue(dialog, '[data-field="stage"]', 1),
        ),
      ),
    );
    return game;
  }

  function applyScenarioInputs(): void {
    const stage = Math.max(
      1,
      Math.min(
        1000,
        Math.floor(numberValue(dialog, '[data-field="stage"]', 1)),
      ),
    );
    const checkpoint = Math.max(
      1,
      Math.min(
        stage,
        Math.floor(
          numberValue(dialog, '[data-field="checkpoint"]', 1),
        ),
      ),
    );
    const previous = cloneTestLabSession(session);
    session = createTestLabSession(stage, checkpoint, "test-lab");
    session.deathMode =
      inputValue(dialog, '[data-field="death-mode"]') as TestLabDeathMode;
    session.state.inventory = { ...previous.state.inventory };
    session.state.credits = Math.max(
      0,
      Math.floor(numberValue(dialog, '[data-field="credits"]', 0)),
    );
    session.state.expansionCurrencies = {
      alloy: Math.max(
        0,
        Math.floor(numberValue(dialog, '[data-field="alloy"]', 0)),
      ),
      starCrystal: Math.max(
        0,
        Math.floor(numberValue(dialog, '[data-field="star-crystal"]', 0)),
      ),
      quantumCore: Math.max(
        0,
        Math.floor(numberValue(dialog, '[data-field="quantum-core"]', 0)),
      ),
    };
    renderInspector();
  }

  function startArena(): void {
    applyScenarioInputs();
    const activeGame = createRuntime();
    const stage = createStageConfig(session.stage);
    const difficultySettings = createDifficultySettings();
    difficultySettings.mode =
      inputValue(dialog, '[data-field="difficulty"]') as DifficultyMode;
    const vocabularyLevel = Math.max(
      1,
      Math.min(
        100,
        Math.floor(
          numberValue(dialog, '[data-field="vocab-level"]', 1),
        ),
      ),
    );
    const difficulty = difficultyFor(
      difficultyInputFromSettings(
        difficultySettings,
        stage.stage,
        vocabularyLevel,
      ),
    );
    activeGame.startStage(stage, difficulty);
    music?.setWorldProfile(musicProfileForWorld(worldForStage(stage.stage)));
    music?.transitionTo("WORLD_NORMAL", 0.25);
    startInspector();
    renderInspector();
  }

  function ensureGame(): Game | null {
    if (game === null) {
      notice("start the arena first");
      return null;
    }
    return game;
  }

  function setSessionItem(id: ItemId, quantity: number): void {
    const current = session.state.inventory[id] ?? 0;
    if (quantity > current) {
      session.state.inventory = addItem(
        session.state.inventory,
        id,
        quantity - current,
      ).inventory;
    } else if (quantity < current) {
      session.state.inventory = removeItem(
        session.state.inventory,
        id,
        current - quantity,
      ).inventory;
    }
    renderInspector();
  }

  function savePreset(): void {
    localStorage.setItem(
      TEST_LAB_PRESET_KEY,
      JSON.stringify({
        session,
        controls: {
          world: worldSelect.value,
          stage: inputValue(dialog, '[data-field="stage"]'),
          checkpoint: inputValue(dialog, '[data-field="checkpoint"]'),
          difficulty: difficultySelect.value,
          vocabLevel: inputValue(dialog, '[data-field="vocab-level"]'),
          deathMode: inputValue(dialog, '[data-field="death-mode"]'),
          enemy: enemySelect.value,
          rank: rankSelect.value,
          layers: inputValue(dialog, '[data-field="layers"]'),
          enemyCount: inputValue(dialog, '[data-field="enemy-count"]'),
          enemySkill: skillSelect.value,
          status: statusSelect.value,
          statusDuration: inputValue(dialog, '[data-field="status-duration"]'),
          item: itemSelect.value,
          musicState: musicStateSelect.value,
        },
      }),
    );
    notice("local preset saved");
  }

  function loadPreset(): void {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(TEST_LAB_PRESET_KEY) ?? "",
      ) as {
        session?: TestLabSession;
        controls?: Record<string, string>;
      };
      if (parsed.session?.version !== 1) throw new Error("invalid preset");
      session = cloneTestLabSession(parsed.session);
      const controls = parsed.controls ?? {};
      const mappings: Array<[string, string]> = [
        ["world", "world"],
        ["stage", "stage"],
        ["checkpoint", "checkpoint"],
        ["difficulty", "difficulty"],
        ["vocabLevel", "vocab-level"],
        ["deathMode", "death-mode"],
        ["enemy", "enemy"],
        ["rank", "rank"],
        ["layers", "layers"],
        ["enemyCount", "enemy-count"],
        ["enemySkill", "enemy-skill"],
        ["status", "status"],
        ["statusDuration", "status-duration"],
        ["item", "item"],
        ["musicState", "music-state"],
      ];
      for (const [key, field] of mappings) {
        const value = controls[key];
        const target = dialog.querySelector<
          HTMLInputElement | HTMLSelectElement
        >('[data-field="' + field + '"]');
        if (target !== null && value !== undefined) target.value = value;
      }
      dialog.querySelector<HTMLInputElement>('[data-field="credits"]')!.value =
        String(session.state.credits);
      dialog.querySelector<HTMLInputElement>('[data-field="alloy"]')!.value =
        String(session.state.expansionCurrencies.alloy);
      dialog.querySelector<HTMLInputElement>('[data-field="star-crystal"]')!.value =
        String(session.state.expansionCurrencies.starCrystal);
      dialog.querySelector<HTMLInputElement>('[data-field="quantum-core"]')!.value =
        String(session.state.expansionCurrencies.quantumCore);
      renderInspector();
      notice("local preset loaded");
    } catch {
      notice("saved preset is invalid or unavailable");
    }
  }

  worldSelect.addEventListener("change", () => {
    const stage = stageForWorld(registry, worldSelect.value);
    dialog.querySelector<HTMLInputElement>('[data-field="stage"]')!.value =
      String(stage);
    dialog.querySelector<HTMLInputElement>('[data-field="checkpoint"]')!.value =
      String(stage);
  });

  function syncScenarioInputsFromSession(): void {
    dialog.querySelector<HTMLInputElement>('[data-field="stage"]')!.value =
      String(session.stage);
    dialog.querySelector<HTMLInputElement>('[data-field="checkpoint"]')!.value =
      String(session.checkpointStage);
    dialog.querySelector<HTMLInputElement>('[data-field="credits"]')!.value =
      String(session.state.credits);
    dialog.querySelector<HTMLInputElement>('[data-field="alloy"]')!.value =
      String(session.state.expansionCurrencies.alloy);
    dialog.querySelector<HTMLInputElement>('[data-field="star-crystal"]')!.value =
      String(session.state.expansionCurrencies.starCrystal);
    dialog.querySelector<HTMLInputElement>('[data-field="quantum-core"]')!.value =
      String(session.state.expansionCurrencies.quantumCore);
  }

  dialog.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-action]",
    );
    if (target === null) return;

    const action = target.dataset.action;
    if (action === "close") {
      dialog.close();
      return;
    }
    if (action === "start") {
      startArena();
      return;
    }
    if (action === "pause") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      if (activeGame.getPhase() === "playing") activeGame.pause();
      else if (activeGame.getPhase() === "paused") activeGame.resume();
      renderInspector();
      return;
    }
    if (action === "reset-arena") {
      ensureGame()?.testLabResetArena();
      renderInspector();
      return;
    }
    if (action === "commit-scenario") {
      applyScenarioInputs();
      game?.testLabSetDeathMode(session.deathMode);
      notice("sandbox scenario applied");
      return;
    }
    if (action === "return-checkpoint") {
      session.state = restoreCheckpointSnapshot(
        session.checkpointSnapshot,
        session.state,
      );
      session.stage = session.state.campaign.selectedStage;
      dialog.querySelector<HTMLInputElement>('[data-field="stage"]')!.value =
        String(session.stage);
      renderInspector();
      notice("sandbox returned to committed checkpoint");
      return;
    }
    if (action === "salvage-anchor") {
      session.state.inventory = addItem(
        session.state.inventory,
        "salvage-anchor",
        1,
      ).inventory;
      const result = resolveSalvageAnchor(
        session.state,
        testLabCampaignExpansion(session),
        session.checkpointSnapshot,
        "test-lab",
      );
      if (result.applied) {
        session.state = result.state;
        session.checkpointSnapshot = result.checkpointSnapshot;
        session.stage = result.state.campaign.selectedStage;
        notice("Salvage Anchor resolved through production death-protection path");
      }
      renderInspector();
      return;
    }
    if (action === "spawn-enemy") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      const definition = registry.enemies.find(
        (entry) => entry.id === enemySelect.value,
      );
      if (definition === undefined) return;
      activeGame.testLabSpawnEnemies({
        definitionId: definition.id as EnemyDefinitionId,
        kind: enemyKindForRole(definition.role),
        count: Math.max(
          1,
          Math.min(
            30,
            Math.floor(
              numberValue(dialog, '[data-field="enemy-count"]', 1),
            ),
          ),
        ),
        elite: definition.rarity === "elite",
        rank: rankSelect.value as EnemyRank,
        layers: Number(
          inputValue(dialog, '[data-field="layers"]'),
        ) as 1 | 2 | 3,
        skillIds: [skillSelect.value as EnemySkillId],
      });
      renderInspector();
      return;
    }
    if (action === "spawn-world-roster") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      const world = worldForStage(session.stage);
      for (const id of world.enemyRoster) {
        const definition = registry.enemies.find((entry) => entry.id === id);
        if (
          definition === undefined ||
          definition.role === "boss" ||
          definition.role === "mini-boss"
        ) {
          continue;
        }
        activeGame.testLabSpawnEnemies({
          definitionId: definition.id as EnemyDefinitionId,
          kind: enemyKindForRole(definition.role),
          count: 1,
        });
      }
      renderInspector();
      return;
    }
    if (action === "force-enemy-skill") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      activeGame.testLabForceEnemySkill(
        Number(enemyIdSelect.value),
        skillSelect.value as EnemySkillId,
      );
      renderInspector();
      return;
    }
    if (action === "clear-enemies") {
      ensureGame()?.testLabClearEnemies();
      renderInspector();
      return;
    }
    if (action === "spawn-boss") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      if (!activeGame.testLabSpawnBoss()) {
        notice("selected Stage is not a production boss stage");
      }
      renderInspector();
      return;
    }
    if (action === "apply-boss") {
      ensureGame()?.testLabSetBoss({
        hpRatio:
          numberValue(dialog, '[data-field="boss-hp"]', 100) / 100,
        phase: Number(
          inputValue(dialog, '[data-field="boss-phase"]'),
        ) as 1 | 2 | 3,
        shieldActive:
          dialog.querySelector<HTMLInputElement>('[data-field="boss-shield"]')!
            .checked,
        staggerSeconds: numberValue(
          dialog,
          '[data-field="boss-stagger"]',
          0,
        ),
      });
      renderInspector();
      return;
    }
    if (action === "clear-boss") {
      ensureGame()?.testLabClearBoss();
      renderInspector();
      return;
    }
    if (action === "apply-resources") {
      ensureGame()?.testLabSetResources({
        hull: numberValue(dialog, '[data-field="hull"]', 100),
        shield: numberValue(dialog, '[data-field="shield"]', 40),
        energy: numberValue(dialog, '[data-field="energy"]', 100),
        power: numberValue(dialog, '[data-field="power"]', 0),
      });
      renderInspector();
      return;
    }
    if (action === "damage-50") {
      ensureGame()?.testLabDamagePlayer(50);
      renderInspector();
      return;
    }
    if (action === "damage-lethal") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      activeGame.testLabDamagePlayer(
        (activeGame.getStats().hull + activeGame.getStats().shield + 100) * 3,
      );
      renderInspector();
      return;
    }
    if (action === "apply-status") {
      ensureGame()?.testLabApplyStatus(
        statusSelect.value as StatusId,
        numberValue(dialog, '[data-field="status-duration"]', 5),
      );
      renderInspector();
      return;
    }
    if (action === "clear-status") {
      ensureGame()?.testLabClearStatuses();
      renderInspector();
      return;
    }

    const itemId = itemSelect.value as ItemId;
    const itemCurrent = session.state.inventory[itemId] ?? 0;
    if (action === "give-1" || action === "give-5" || action === "give-99") {
      const amount = action === "give-1" ? 1 : action === "give-5" ? 5 : 99;
      setSessionItem(itemId, itemCurrent + amount);
      return;
    }
    if (action === "set-item") {
      setSessionItem(
        itemId,
        Math.max(
          0,
          Math.floor(
            numberValue(dialog, '[data-field="item-quantity"]', 0),
          ),
        ),
      );
      return;
    }
    if (action === "remove-item") {
      setSessionItem(itemId, 0);
      return;
    }
    if (action === "clear-inventory") {
      session.state.inventory = {};
      renderInspector();
      return;
    }
    if (action === "use-item") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      const definition = getItemDefinition(itemId);
      if (
        !definition.combatUsable ||
        itemCurrent <= 0 ||
        !activeGame.useConsumable(itemId)
      ) {
        notice("selected item is not usable in the current production runtime state");
        return;
      }
      setSessionItem(itemId, itemCurrent - 1);
      return;
    }

    if (action === "play-music") {
      if (music === null) createRuntime();
      const state = musicStateSelect.value as MusicState;
      music?.setWorldProfile(
        musicProfileForWorld(worldForStage(session.stage)),
      );
      music?.transitionTo(
        state,
        Math.max(
          0,
          numberValue(dialog, '[data-field="crossfade"]', 0.8),
        ),
      );
      renderInspector();
      return;
    }
    if (action === "duck-announcer") {
      music?.duck("announcer");
      renderInspector();
      return;
    }
    if (action === "duck-pronunciation") {
      music?.duck("pronunciation");
      renderInspector();
      return;
    }
    if (action === "duck-warning") {
      music?.duck("warning");
      renderInspector();
      return;
    }
    if (action === "release-ducks") {
      music?.releaseDuck("announcer");
      music?.releaseDuck("pronunciation");
      music?.releaseDuck("warning");
      renderInspector();
      return;
    }
    if (action === "stop-music") {
      music?.stop(
        Math.max(
          0,
          numberValue(dialog, '[data-field="crossfade"]', 0.8),
        ),
      );
      renderInspector();
      return;
    }
    if (action === "apply-economy") {
      session.state.credits = Math.max(
        0,
        Math.floor(numberValue(dialog, '[data-field="credits"]', 0)),
      );
      session.state.expansionCurrencies = {
        alloy: Math.max(
          0,
          Math.floor(numberValue(dialog, '[data-field="alloy"]', 0)),
        ),
        starCrystal: Math.max(
          0,
          Math.floor(
            numberValue(dialog, '[data-field="star-crystal"]', 0),
          ),
        ),
        quantumCore: Math.max(
          0,
          Math.floor(
            numberValue(dialog, '[data-field="quantum-core"]', 0),
          ),
        ),
      };
      renderInspector();
      return;
    }
    if (action === "save-preset") {
      savePreset();
      return;
    }
    if (action === "load-preset") {
      loadPreset();
    }
  });

  dialog.addEventListener("close", () => {
    destroyRuntime();
  });

  button.addEventListener("click", () => {
    renderInspector();
    dialog.showModal();
  });

  renderInspector();

  return {
    open(): void {
      renderInspector();
      dialog.showModal();
    },
    destroy(): void {
      destroyRuntime();
      dialog.remove();
      button.remove();
    },
  };
}
