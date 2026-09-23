import {
  Game,
  type GameHooks,
  type TestLabDeathMode,
  type TestLabGameSnapshot,
} from "../Game";
import { MusicController } from "../audio/MusicController";
import {
  ANNOUNCER_EVENTS,
  type AnnouncerEvent,
} from "../audio/announcer";
import { speakEnglish } from "../speech";
import {
  MUSIC_STATES,
  musicProfileForWorld,
  type MusicState,
} from "../audio/music-profile";
import { difficultyFor } from "../campaign/difficulty";
import {
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
import type { CharacterId } from "../characters/registry";
import { DEFAULT_PLAYER_BASE_STATS } from "../stats/player";
import type { CoreStats } from "../stats/core";
import {
  addEquipmentInstance,
  equipInstance,
  equipmentStatBonus,
} from "../equipment/loadout";
import type { EquipmentId } from "../equipment/registry";
import type { GradeId } from "../grades";
import {
  compileRelicEffects,
  createRelicState,
  equipRelic,
  grantRelic,
} from "../relics/state";
import type { RelicId } from "../relics/registry";
import {
  SHOP_TYPES,
  buyShopStockEntry,
  formatShopPrice,
  resolveShopInstance,
  type ShopInstance,
  type ShopType,
} from "../shops/state";
import {
  createBossRewardChoiceOptions,
  createRewardChoiceOptions,
} from "../events/reward-choice";
import {
  rollEquipmentDrop,
  type LootSource,
} from "../loot/equipment-loot";
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
import { mountM22ManualGate } from "./m22-manual-gate";

const TEST_LAB_PRESET_KEY = "spaceTypingTestLabPresetV1";

const TEST_LAB_PRESETS = [
  { id: "world-showcase", label: "World Enemy Showcase" },
  { id: "world-boss", label: "World Boss Showcase" },
  { id: "rank-x-layers", label: "Rank X · 3-layer Enemy" },
  { id: "formation-pressure", label: "Formation Pressure Stress" },
  { id: "relax", label: "Low-WPM Relax" },
  { id: "impossible", label: "Impossible Pressure" },
  { id: "checkpoint-181", label: "Checkpoint 181 → Death 190" },
  { id: "salvage-anchor", label: "Salvage Anchor Death Test" },
  { id: "stage-revival", label: "Stage Revival Core Death Test" },
  { id: "phoenix-boss", label: "Phoenix Core Boss-Phase Test" },
  { id: "music-transition", label: "World → Boss Music Transition" },
] as const;

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
  lastAction: string,
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
      lastAction,
      sandbox: {
        world: worldForStage(session.stage),
        stage: session.stage,
        checkpointStage: session.checkpointStage,
        checkpointSnapshot: {
          selectedStage: session.checkpointSnapshot.campaign.selectedStage,
          credits: session.checkpointSnapshot.credits,
          currencies: session.checkpointSnapshot.expansionCurrencies,
          inventory: session.checkpointSnapshot.inventory,
        },
        route: session.state.route,
        currencies: currencyText(session),
        inventory: session.state.inventory,
        luckPity: session.state.luckPity,
        equipment: session.state.equipment,
        relics: session.state.relics,
        shops: Object.keys(session.state.shops.instances),
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
          : music.getDebugSnapshot(),
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
  let activeShop: ShopInstance | null = null;
  let shopPurchaseSequence = 0;
  let rewardPreview: unknown = null;
  let equipmentInstanceSequence = 0;
  let lastAction = "Test Lab initialized";

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
        <canvas data-role="canvas" tabindex="0" aria-label="Test Lab battlefield"></canvas>
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
            <label>Recent WPM<input data-field="recent-wpm" type="number" min="10" max="300" value="60"></label>
            <label>Recent accuracy<input data-field="recent-accuracy" type="number" min="60" max="100" step="0.1" value="96"></label>
            <label>Custom target WPM<input data-field="custom-wpm" type="number" min="10" max="300" value="60"></label>
            <label>Custom pressure<input data-field="custom-pressure" type="number" min="0.7" max="1.45" step="0.05" value="1"></label>
            <label>Death mode<select data-field="death-mode">
              <option value="immortal">Immortal</option>
              <option value="real">Real Death</option>
            </select></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="commit-scenario">Apply Scenario State</button>
            <button type="button" data-action="world-normal">Start World Stage</button>
            <button type="button" data-action="world-mini-boss">Mini Boss</button>
            <button type="button" data-action="world-boss">World Boss</button>
            <button type="button" data-action="galaxy-boss">Galaxy Boss</button>
            <button type="button" data-action="return-checkpoint">Return to Checkpoint</button>
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
            <label>Enemy<select data-field="enemy" multiple size="8"></select></label>
            <label>Rank<select data-field="rank"></select></label>
            <label>Layers<select data-field="layers">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select></label>
            <label>Count<input data-field="enemy-count" type="number" min="1" max="30" value="1"></label>
            <label>Skill<select data-field="enemy-skill"></select></label>
            <label>Enemy ID<select data-field="enemy-id"></select></label>
            <label>Speed px/s<input data-field="enemy-speed" type="number" min="0" max="2000" value="90"></label>
            <label>Action cooldown<input data-field="enemy-cooldown" type="number" min="0" max="120" step="0.1" value="1"></label>
            <label>Threat used<input data-field="enemy-threat" type="number" min="0" max="100" step="0.1" value="0"></label>
            <label class="test-lab-check"><input data-field="enemy-elite" type="checkbox"> Force Elite</label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="spawn-enemy">Spawn Selected ×N</button>
            <button type="button" data-action="spawn-all-selected">Spawn All Selected</button>
            <button type="button" data-action="spawn-world-roster">Spawn World Roster</button>
            <button type="button" data-action="patch-enemy">Apply Runtime Override</button>
            <button type="button" data-action="force-enemy-skill">Force Skill</button>
            <button type="button" data-action="force-word">Force Word / Next Layer</button>
            <button type="button" data-action="kill-enemy">Kill Selected</button>
            <button type="button" data-action="clear-enemies">Clear Enemies</button>
          </div>
        </details>

        <details>
          <summary>Boss Runtime</summary>
          <div class="test-lab-grid">
            <label>Boss<select data-field="boss-definition"></select></label>
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
            <button type="button" data-action="spawn-selected-boss">Load + Spawn Selected Boss</button>
            <button type="button" data-action="spawn-boss">Spawn Current Stage Boss</button>
            <button type="button" data-action="apply-boss">Apply Boss State</button>
            <button type="button" data-action="clear-boss">Clear Boss</button>
          </div>
        </details>

        <details>
          <summary>Player / Status</summary>
          <div class="test-lab-grid">
            <label>Character<select data-field="character"></select></label>
            <label>Core Hull<input data-field="core-hull" type="number" min="0" value="100"></label>
            <label>Core Shield<input data-field="core-shield" type="number" min="0" value="40"></label>
            <label>Firepower<input data-field="core-firepower" type="number" min="0" value="10"></label>
            <label>Armor<input data-field="core-armor" type="number" min="0" value="8"></label>
            <label>Core Energy<input data-field="core-energy" type="number" min="0" value="100"></label>
            <label>Reactor<input data-field="core-reactor" type="number" min="0" value="8"></label>
            <label>Focus<input data-field="core-focus" type="number" min="0" value="8"></label>
            <label>Ward<input data-field="core-ward" type="number" min="0" value="6"></label>
            <label>Luck<input data-field="core-luck" type="number" min="0" value="5"></label>
            <label>Salvage<input data-field="core-salvage" type="number" min="0" value="5"></label>
            <label>Current Hull<input data-field="hull" type="number" min="0" value="100"></label>
            <label>Current Shield<input data-field="shield" type="number" min="0" value="40"></label>
            <label>Current Energy<input data-field="energy" type="number" min="0" value="100"></label>
            <label>Power<input data-field="power" type="number" min="0" max="100" value="0"></label>
            <label>Status<select data-field="status"></select></label>
            <label>Duration<input data-field="status-duration" type="number" min="0.1" max="120" step="0.5" value="5"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="apply-core-stats">Apply Character / Core Stats</button>
            <button type="button" data-action="reset-core-stats">Reset Production Defaults</button>
            <button type="button" data-action="apply-resources">Apply Resources</button>
            <button type="button" data-action="damage-50">Damage 50</button>
            <button type="button" data-action="damage-lethal">Force Lethal</button>
            <button type="button" data-action="apply-status">Apply / Stack Status</button>
            <button type="button" data-action="clear-one-status">Clear Selected Status</button>
            <button type="button" data-action="clear-status">Clear All Statuses</button>
          </div>
        </details>

        <details>
          <summary>Equipment / Relics</summary>
          <div class="test-lab-grid">
            <label>Equipment<select data-field="equipment"></select></label>
            <label>Grade<select data-field="equipment-grade"></select></label>
            <label>Enhancement<input data-field="equipment-enhancement" type="number" min="0" max="5" value="0"></label>
            <label>Relic<select data-field="relic"></select></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="grant-equip-equipment">Grant + Equip</button>
            <button type="button" data-action="grant-equip-relic">Grant + Equip Relic</button>
            <button type="button" data-action="clear-relics">Clear Relics</button>
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
            <label>Max active enemies<input data-field="max-enemies" type="number" min="1" max="30" value="8"></label>
            <label>Spawn interval<input data-field="spawn-interval" type="number" min="0.05" max="30" step="0.05" value="1"></label>
            <label>Pressure budget<input data-field="pressure-budget" type="number" min="0.5" max="100" step="0.1" value="10"></label>
            <label>Urgent threat cap<input data-field="urgent-cap" type="number" min="1" max="30" value="3"></label>
            <label>Formation complexity<input data-field="formation-complexity" type="number" min="1" max="5" value="1"></label>
            <label>Attack interval factor<input data-field="attack-factor" type="number" min="0.2" max="3" step="0.05" value="1"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="use-player-skill">Force Skill Activation</button>
            <button type="button" data-action="reset-skill-cooldowns">Reset Skill Cooldowns</button>
            <button type="button" data-action="apply-time">Apply Time / Scheduler</button>
            <button type="button" data-action="apply-pressure">Apply Pressure Overrides</button>
            <button type="button" data-action="step-scheduler">Step Scheduler Once</button>
            <button type="button" data-action="spawn-formation">Spawn Formation Now</button>
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
          <summary>Shop / Economy Sandbox</summary>
          <div class="test-lab-grid">
            <label>Shop type<select data-field="shop-type"></select></label>
            <label>Stock<select data-field="shop-stock"></select></label>
            <label>QA seed offset<input data-field="shop-seed-offset" type="number" min="0" value="0"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="load-shop">Load Production Shop</button>
            <button type="button" data-action="reroll-shop">QA Reroll</button>
            <button type="button" data-action="buy-shop">Buy Selected via Production Flow</button>
          </div>
          <pre class="test-lab-mini-inspector" data-role="shop"></pre>
        </details>

        <details>
          <summary>Reward / Loot Controls</summary>
          <div class="test-lab-grid">
            <label>Loot source<select data-field="loot-source">
              <option value="normal">normal</option>
              <option value="elite">elite</option>
              <option value="golden">golden</option>
              <option value="treasure">treasure</option>
              <option value="anomaly">anomaly</option>
              <option value="boss">boss</option>
            </select></label>
            <label>Luck<input data-field="reward-luck" type="number" min="0" max="100" value="0"></label>
            <label>Salvage<input data-field="reward-salvage" type="number" min="0" max="100" value="0"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="roll-equipment">Roll Equipment Drop</button>
            <button type="button" data-action="preview-choice">Preview Reward Choice</button>
            <button type="button" data-action="preview-boss-choice">Preview Boss Choice</button>
            <button type="button" data-action="grant-star-crystal">Grant Star Crystal</button>
            <button type="button" data-action="grant-quantum-core">Grant Quantum Core</button>
            <button type="button" data-action="grant-salvage-anchor">Grant Salvage Anchor</button>
            <button type="button" data-action="grant-stage-revival">Grant Stage Revival Core</button>
            <button type="button" data-action="grant-phoenix">Grant Phoenix Core</button>
          </div>
          <pre class="test-lab-mini-inspector" data-role="reward"></pre>
        </details>

        <details>
          <summary>Music / Audio Runtime</summary>
          <div class="test-lab-grid">
            <label>Music state<select data-field="music-state"></select></label>
            <label>Crossfade sec<input data-field="crossfade" type="number" min="0" max="10" step="0.1" value="0.8"></label>
            <label>Music volume<input data-field="music-volume" type="number" min="0" max="1" step="0.05" value="0.34"></label>
            <label>Ambient volume<input data-field="ambient-volume" type="number" min="0" max="1" step="0.05" value="0.14"></label>
            <label>SFX / Announcer volume<input data-field="sfx-volume" type="number" min="0" max="1" step="0.05" value="0.7"></label>
            <label>Pronunciation volume<input data-field="pronunciation-volume" type="number" min="0" max="1" step="0.05" value="1"></label>
            <label>Boss music phase<select data-field="music-boss-phase">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select></label>
            <label>Announcer<select data-field="announcer"></select></label>
            <label>Pronunciation text<input data-field="pronunciation-text" value="checkpoint"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="apply-audio-levels">Apply Audio Levels</button>
            <button type="button" data-action="play-music">Transition</button>
            <button type="button" data-action="set-music-boss-phase">Apply Boss Music Phase</button>
            <button type="button" data-action="trigger-announcer">Trigger Announcer</button>
            <button type="button" data-action="trigger-pronunciation">Trigger Pronunciation</button>
            <button type="button" data-action="trigger-warning">Trigger Warning</button>
            <button type="button" data-action="duck-announcer">Duck Announcer</button>
            <button type="button" data-action="duck-pronunciation">Duck Pronunciation</button>
            <button type="button" data-action="duck-warning">Duck Warning</button>
            <button type="button" data-action="release-ducks">Release Ducks</button>
            <button type="button" data-action="stop-music">Stop / Reset Music</button>
          </div>
        </details>

        <details>
          <summary>Sandbox Economy / Preset</summary>
          <div class="test-lab-grid">
            <label>Built-in preset<select data-field="builtin-preset"></select></label>
            <label>Credits<input data-field="credits" type="number" min="0" value="0"></label>
            <label>Alloy<input data-field="alloy" type="number" min="0" value="0"></label>
            <label>Star Crystal<input data-field="star-crystal" type="number" min="0" value="0"></label>
            <label>Quantum Core<input data-field="quantum-core" type="number" min="0" value="0"></label>
          </div>
          <div class="test-lab-row">
            <button type="button" data-action="apply-builtin-preset">Apply Built-in Preset</button>
            <button type="button" data-action="apply-economy">Apply Economy</button>
            <button type="button" data-action="save-preset">Save Local Preset</button>
            <button type="button" data-action="load-preset">Load Local Preset</button>
          </div>
        </details>

        <details>
          <summary>M22 Manual Gate Recorder</summary>
          <div data-role="m22-manual-gate"></div>
        </details>

        <details open>
          <summary>State Inspector</summary>
          <pre class="test-lab-inspector" data-role="inspector"></pre>
        </details>
      </aside>
    </div>
  `;
  document.body.append(dialog);

  const manualGateRoot =
    dialog.querySelector<HTMLElement>('[data-role="m22-manual-gate"]')!;
  const manualGate = mountM22ManualGate(manualGateRoot, {
    showNotice: (message) => options.showNotice?.("Test Lab · " + message),
  });

  const canvas = dialog.querySelector<HTMLCanvasElement>('[data-role="canvas"]')!;
  const inspector = dialog.querySelector<HTMLElement>('[data-role="inspector"]')!;
  const inventoryInspector =
    dialog.querySelector<HTMLElement>('[data-role="inventory"]')!;
  const shopInspector =
    dialog.querySelector<HTMLElement>('[data-role="shop"]')!;
  const rewardInspector =
    dialog.querySelector<HTMLElement>('[data-role="reward"]')!;

  const builtInPresetSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="builtin-preset"]')!;
  const worldSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="world"]')!;
  const difficultySelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="difficulty"]')!;
  const enemySelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="enemy"]')!;
  const rankSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="rank"]')!;
  const bossDefinitionSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="boss-definition"]')!;
  const skillSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="enemy-skill"]')!;
  const enemyIdSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="enemy-id"]')!;
  const statusSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="status"]')!;
  const characterSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="character"]')!;
  const itemSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="item"]')!;
  const playerSkillSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="player-skill"]')!;
  const equipmentSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="equipment"]')!;
  const equipmentGradeSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="equipment-grade"]')!;
  const relicSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="relic"]')!;
  const shopTypeSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="shop-type"]')!;
  const shopStockSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="shop-stock"]')!;
  const musicStateSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="music-state"]')!;
  const announcerSelect =
    dialog.querySelector<HTMLSelectElement>('[data-field="announcer"]')!;

  setOptions(
    builtInPresetSelect,
    TEST_LAB_PRESETS.map((preset) => ({
      value: preset.id,
      label: preset.label,
    })),
  );
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
  const bossDefinitions = registry.enemies.filter((enemy) =>
    registry.worlds.some(
      (world) =>
        world.miniBoss === enemy.id ||
        world.worldBoss === enemy.id,
    ),
  );
  setOptions(
    bossDefinitionSelect,
    bossDefinitions.map((enemy) => ({
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
    characterSelect,
    registry.characters.map((id) => ({
      value: id,
      label: id,
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
    equipmentSelect,
    registry.equipment.map((item) => ({
      value: item.id,
      label: item.name + " · " + item.slot,
    })),
  );
  setOptions(
    equipmentGradeSelect,
    registry.grades.map((grade) => ({
      value: grade,
      label: grade,
    })),
  );
  setOptions(
    relicSelect,
    registry.relics.map((id) => ({
      value: id,
      label: id,
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
    shopTypeSelect,
    SHOP_TYPES.map((type) => ({
      value: type,
      label: type,
    })),
  );
  setOptions(
    musicStateSelect,
    MUSIC_STATES.map((state) => ({
      value: state,
      label: state,
    })),
  );
  setOptions(
    announcerSelect,
    ANNOUNCER_EVENTS.map((event) => ({
      value: event,
      label: event,
    })),
  );

  function notice(message: string): void {
    lastAction = message;
    options.showNotice?.("Test Lab · " + message);
  }

  function stageForBossDefinition(id: string): number | null {
    for (const world of registry.worlds) {
      if (world.miniBoss === id) return world.stageStart + 9;
      if (world.worldBoss === id) return world.stageEnd;
    }
    return null;
  }

  function selectedEnemyDefinitions() {
    const ids = new Set(
      Array.from(enemySelect.selectedOptions, (option) => option.value),
    );
    const selected = registry.enemies.filter((enemy) => ids.has(enemy.id));
    if (selected.length > 0) return selected;
    const fallback = registry.enemies.find(
      (enemy) => enemy.id === enemySelect.value,
    );
    return fallback === undefined ? [] : [fallback];
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
    inspector.textContent = snapshotText(
      snapshot,
      session,
      music,
      lastAction,
    );
    inventoryInspector.textContent =
      JSON.stringify(
        getItemDefinition(itemSelect.value as ItemId),
        null,
        2,
      ) +
      "\n\nInventory\n" +
      inventoryText(session) +
      "\n\n" +
      currencyText(session);
    shopInspector.textContent =
      activeShop === null
        ? "No shop loaded."
        : JSON.stringify(activeShop, null, 2);
    rewardInspector.textContent =
      rewardPreview === null
        ? "No reward preview."
        : JSON.stringify(rewardPreview, null, 2);
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
    session.state.equipment = structuredClone(previous.state.equipment);
    session.state.supportSpells = structuredClone(previous.state.supportSpells);
    session.state.characters = structuredClone(previous.state.characters);
    session.state.luckPity = { ...previous.state.luckPity };
    session.state.hiddenDiscovery = structuredClone(
      previous.state.hiddenDiscovery,
    );
    session.state.progression = structuredClone(previous.state.progression);
    session.state.shops = structuredClone(previous.state.shops);
    session.state.upgrades = structuredClone(previous.state.upgrades);
    session.state.relics = structuredClone(previous.state.relics);
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
    const vocabularyLevel = Math.max(
      1,
      Math.min(
        100,
        Math.floor(
          numberValue(dialog, '[data-field="vocab-level"]', 1),
        ),
      ),
    );
    const difficulty = difficultyFor({
      stage: stage.stage,
      mode:
        inputValue(dialog, '[data-field="difficulty"]') as DifficultyMode,
      vocabularyLevel,
      recentWpm: numberValue(
        dialog,
        '[data-field="recent-wpm"]',
        60,
      ),
      recentAccuracy: numberValue(
        dialog,
        '[data-field="recent-accuracy"]',
        96,
      ),
      customTargetWpm: numberValue(
        dialog,
        '[data-field="custom-wpm"]',
        60,
      ),
      customPressure: numberValue(
        dialog,
        '[data-field="custom-pressure"]',
        1,
      ),
    });
    activeGame.startStage(stage, difficulty);
    canvas.focus();
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

  function coreStatsFromControls(): CoreStats {
    return {
      hull: Math.max(0, numberValue(dialog, '[data-field="core-hull"]', DEFAULT_PLAYER_BASE_STATS.hull)),
      shield: Math.max(0, numberValue(dialog, '[data-field="core-shield"]', DEFAULT_PLAYER_BASE_STATS.shield)),
      firepower: Math.max(0, numberValue(dialog, '[data-field="core-firepower"]', DEFAULT_PLAYER_BASE_STATS.firepower)),
      armor: Math.max(0, numberValue(dialog, '[data-field="core-armor"]', DEFAULT_PLAYER_BASE_STATS.armor)),
      energy: Math.max(0, numberValue(dialog, '[data-field="core-energy"]', DEFAULT_PLAYER_BASE_STATS.energy)),
      reactor: Math.max(0, numberValue(dialog, '[data-field="core-reactor"]', DEFAULT_PLAYER_BASE_STATS.reactor)),
      focus: Math.max(0, numberValue(dialog, '[data-field="core-focus"]', DEFAULT_PLAYER_BASE_STATS.focus)),
      ward: Math.max(0, numberValue(dialog, '[data-field="core-ward"]', DEFAULT_PLAYER_BASE_STATS.ward)),
      luck: Math.max(0, numberValue(dialog, '[data-field="core-luck"]', DEFAULT_PLAYER_BASE_STATS.luck)),
      salvage: Math.max(0, numberValue(dialog, '[data-field="core-salvage"]', DEFAULT_PLAYER_BASE_STATS.salvage)),
    };
  }

  function applyResolvedBuildStats(): void {
    const activeGame = game;
    if (activeGame === null) return;
    activeGame.testLabSetPlayerStats({
      base: coreStatsFromControls(),
      equipment: equipmentStatBonus(session.state.equipment),
    });
    activeGame.setRelicEffects(
      compileRelicEffects(session.state.relics),
    );
  }

  function setField(field: string, value: string | number): void {
    const target = dialog.querySelector<
      HTMLInputElement | HTMLSelectElement
    >('[data-field="' + field + '"]');
    if (target !== null) target.value = String(value);
  }

  function setChecked(field: string, checked: boolean): void {
    const target = dialog.querySelector<HTMLInputElement>(
      '[data-field="' + field + '"]',
    );
    if (target !== null) target.checked = checked;
  }

  function applyBuiltInPreset(id: string): void {
    const world =
      registry.worlds.find((entry) => entry.id === worldSelect.value) ??
      registry.worlds[0]!;
    setField("enemy-count", 1);
    setField("rank", "I");
    setField("layers", 1);
    setField("difficulty", "balanced");
    setField("death-mode", "immortal");
    setField("time-scale", 1);
    setChecked("scheduler-frozen", false);

    if (id === "world-showcase") {
      setField("stage", world.stageStart);
      setField("checkpoint", world.stageStart);
    } else if (id === "world-boss") {
      setField("stage", world.stageEnd);
      setField("checkpoint", world.stageEnd);
    } else if (id === "rank-x-layers") {
      setField("stage", Math.max(world.stageStart, 900));
      setField("checkpoint", Math.max(world.stageStart, 900));
      setField("rank", "X");
      setField("layers", 3);
    } else if (id === "formation-pressure") {
      setField("stage", 950);
      setField("checkpoint", 941);
      setField("difficulty", "impossible");
      setField("max-enemies", 30);
      setField("pressure-budget", 100);
      setField("urgent-cap", 30);
      setField("formation-complexity", 5);
      setField("spawn-interval", 0.05);
    } else if (id === "relax") {
      setField("stage", 1);
      setField("checkpoint", 1);
      setField("difficulty", "relax");
      setField("vocab-level", 1);
      setField("recent-wpm", 25);
      setField("recent-accuracy", 90);
    } else if (id === "impossible") {
      setField("stage", 1000);
      setField("checkpoint", 991);
      setField("difficulty", "impossible");
      setField("vocab-level", 100);
      setField("recent-wpm", 300);
      setField("recent-accuracy", 99);
    } else if (
      id === "checkpoint-181" ||
      id === "salvage-anchor" ||
      id === "stage-revival"
    ) {
      setField("stage", 190);
      setField("checkpoint", 181);
      setField("death-mode", "real");
      setField("credits", 20000);
      setField("alloy", 120);
      setField("star-crystal", 2);
      if (id === "salvage-anchor") {
        session.state.inventory = addItem(
          session.state.inventory,
          "salvage-anchor",
          2,
        ).inventory;
      } else if (id === "stage-revival") {
        session.state.inventory = addItem(
          session.state.inventory,
          "stage-revival-core",
          2,
        ).inventory;
      }
    } else if (id === "phoenix-boss") {
      setField("stage", world.stageEnd);
      setField("checkpoint", world.stageStart + 10);
      setField("death-mode", "real");
      setField("boss-hp", 37);
      setField("boss-phase", 2);
      session.state.inventory = addItem(
        session.state.inventory,
        "phoenix-core",
        2,
      ).inventory;
    } else if (id === "music-transition") {
      setField("stage", world.stageStart);
      setField("checkpoint", world.stageStart);
      setField("music-state", "WORLD_NORMAL");
      setField("crossfade", 0.8);
    }

    applyScenarioInputs();
    syncScenarioInputsFromSession();
    renderInspector();
    notice(
      TEST_LAB_PRESETS.find((preset) => preset.id === id)?.label ??
        "built-in preset applied",
    );
  }

  function shopContext(offset = 0) {
    const world = worldForStage(session.stage);
    return {
      stage: session.stage,
      worldKey: world.id,
      luck: game?.getPlayerStats().luck ?? 0,
      progression: session.stage + Math.max(0, Math.floor(offset)),
      hiddenDiscovery: session.state.hiddenDiscovery,
    };
  }

  function populateShopStock(instance: ShopInstance): void {
    activeShop = instance;
    setOptions(
      shopStockSelect,
      instance.stock.map((entry) => ({
        value: entry.key,
        label:
          entry.key +
          " · " +
          String(entry.remaining) +
          " left · " +
          formatShopPrice(entry.price),
      })),
    );
  }

  function loadShop(qaOffset = 0): void {
    const resolved = resolveShopInstance(
      session.state.shops,
      shopTypeSelect.value as ShopType,
      shopContext(qaOffset),
    );
    session.state.shops = resolved.state;
    populateShopStock(resolved.instance);
    renderInspector();
  }

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

  dialog.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLButtonElement
    ) {
      return;
    }
    if (game === null) return;
    if (event.key === "Escape") return;

    game.handleKey(event.key);
    event.preventDefault();
    event.stopPropagation();
  });

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
    if (
      action === "world-normal" ||
      action === "world-mini-boss" ||
      action === "world-boss" ||
      action === "galaxy-boss"
    ) {
      const world =
        registry.worlds.find((entry) => entry.id === worldSelect.value) ??
        registry.worlds[0]!;
      const stage =
        action === "world-mini-boss"
          ? world.stageStart + 9
          : action === "world-boss"
            ? world.stageEnd
            : action === "galaxy-boss"
              ? world.galaxy * 100
              : world.stageStart;
      dialog.querySelector<HTMLInputElement>('[data-field="stage"]')!.value =
        String(stage);
      dialog.querySelector<HTMLInputElement>('[data-field="checkpoint"]')!.value =
        String(stage);
      startArena();
      if (action !== "world-normal") {
        window.setTimeout(() => {
          game?.testLabSpawnBoss();
          renderInspector();
        }, 0);
      }
      return;
    }
    if (action === "return-checkpoint") {
      session.state = restoreCheckpointSnapshot(
        session.checkpointSnapshot,
        session.state,
      );
      session.stage = session.state.campaign.selectedStage;
      syncScenarioInputsFromSession();
      renderInspector();
      notice("sandbox returned to committed checkpoint");
      return;
    }
    if (action === "capture-crash") {
      const captured = captureCrashRecoverySnapshot(
        session.state,
        session.campaignExpansion,
        session.checkpointSnapshot,
        "manual",
        "test-lab-crash",
      );
      session.crashRecoverySnapshot = captured.snapshot;
      session.campaignExpansion = captured.campaignExpansion;
      renderInspector();
      notice("crash snapshot captured through production recovery path");
      return;
    }
    if (action === "recover-crash") {
      const result = resolveCrashRecovery(
        session.state,
        session.campaignExpansion,
        session.checkpointSnapshot,
        session.crashRecoverySnapshot,
        "test-lab-recover",
      );
      session.state = result.state;
      session.campaignExpansion = result.campaignExpansion;
      session.checkpointSnapshot = result.checkpointSnapshot;
      if (result.crashRecoverySnapshot !== null) {
        session.crashRecoverySnapshot = result.crashRecoverySnapshot;
      }
      session.stage = result.state.campaign.selectedStage;
      syncScenarioInputsFromSession();
      renderInspector();
      notice("crash recovery resolved · " + result.mode);
      return;
    }
    if (action === "death-no-item") {
      const invalidated = invalidateCrashRecoverySnapshot(
        session.crashRecoverySnapshot,
        session.state,
        session.campaignExpansion,
        session.checkpointSnapshot,
        "test-lab-death",
      );
      const result = resolveCrashRecovery(
        session.state,
        invalidated.campaignExpansion,
        session.checkpointSnapshot,
        invalidated.snapshot,
        "test-lab-death-resolve",
      );
      session.state = result.state;
      session.campaignExpansion = result.campaignExpansion;
      session.checkpointSnapshot = result.checkpointSnapshot;
      session.crashRecoverySnapshot =
        result.crashRecoverySnapshot ?? invalidated.snapshot;
      session.stage = result.state.campaign.selectedStage;
      syncScenarioInputsFromSession();
      renderInspector();
      notice("no-item death rollback resolved · " + result.mode);
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
        session.campaignExpansion = result.campaignExpansion;
        session.checkpointSnapshot = result.checkpointSnapshot;
        if (result.stageEntrySnapshot !== null) {
          session.stageEntrySnapshot = result.stageEntrySnapshot;
        }
        session.stage = result.state.campaign.selectedStage;
        syncScenarioInputsFromSession();
        notice("Salvage Anchor resolved through production death-protection path");
      }
      renderInspector();
      return;
    }
    if (action === "stage-revival") {
      session.state.inventory = addItem(
        session.state.inventory,
        "stage-revival-core",
        1,
      ).inventory;
      const result = resolveStageRevivalCore(
        session.state,
        session.stageEntrySnapshot,
      );
      if (result === null || !result.applied) {
        notice("Stage Revival Core could not resolve this sandbox scenario");
        return;
      }
      session.state = result.state;
      session.campaignExpansion = result.campaignExpansion;
      session.checkpointSnapshot = result.checkpointSnapshot;
      if (result.stageEntrySnapshot !== null) {
        session.stageEntrySnapshot = result.stageEntrySnapshot;
      }
      session.stage = result.state.campaign.selectedStage;
      syncScenarioInputsFromSession();
      renderInspector();
      notice("Stage Revival Core resolved through production stage-entry path");
      return;
    }
    if (action === "phoenix-revive") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      session.state.inventory = addItem(
        session.state.inventory,
        "phoenix-core",
        1,
      ).inventory;
      const consumed = consumePhoenixCore(session.state);
      if (!consumed.applied) {
        notice("Phoenix Core is unavailable in sandbox inventory");
        return;
      }
      if (!activeGame.reviveCurrentEncounter()) {
        notice("Phoenix Core requires a Real Death gameover encounter");
        return;
      }
      session.state = consumed.state;
      renderInspector();
      notice("Phoenix Core consumed and encounter revived through production Game");
      return;
    }
    if (action === "spawn-enemy") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      const definition = selectedEnemyDefinitions()[0];
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
    if (action === "spawn-all-selected") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      for (const definition of selectedEnemyDefinitions()) {
        activeGame.testLabSpawnEnemies({
          definitionId: definition.id as EnemyDefinitionId,
          kind: enemyKindForRole(definition.role),
          count: 1,
          elite: definition.rarity === "elite",
          rank: rankSelect.value as EnemyRank,
          layers: Number(
            inputValue(dialog, '[data-field="layers"]'),
          ) as 1 | 2 | 3,
          skillIds: [skillSelect.value as EnemySkillId],
        });
      }
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
    if (action === "patch-enemy") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      activeGame.testLabPatchEnemy(
        Number(enemyIdSelect.value),
        {
          speed: numberValue(dialog, '[data-field="enemy-speed"]', 90),
          actionCooldown: numberValue(dialog, '[data-field="enemy-cooldown"]', 1),
          rank: rankSelect.value as EnemyRank,
          layers: Number(inputValue(dialog, '[data-field="layers"]')) as 1 | 2 | 3,
          elite: dialog.querySelector<HTMLInputElement>('[data-field="enemy-elite"]')!.checked,
          threatBudgetUsed: numberValue(dialog, '[data-field="enemy-threat"]', 0),
        },
      );
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
    if (action === "force-word") {
      ensureGame()?.testLabForceWordComplete(
        Number(enemyIdSelect.value),
      );
      renderInspector();
      return;
    }
    if (action === "kill-enemy") {
      ensureGame()?.testLabKillEnemy(
        Number(enemyIdSelect.value),
      );
      renderInspector();
      return;
    }
    if (action === "clear-enemies") {
      ensureGame()?.testLabClearEnemies();
      renderInspector();
      return;
    }
    if (action === "spawn-selected-boss") {
      const stage = stageForBossDefinition(
        bossDefinitionSelect.value,
      );
      if (stage === null) {
        notice("selected boss has no production World/stage mapping");
        return;
      }
      setField("stage", stage);
      setField("checkpoint", Math.floor((stage - 1) / 10) * 10 + 1);
      const world = worldForStage(stage);
      worldSelect.value = world.id;
      startArena();
      window.setTimeout(() => {
        const spawned = game?.testLabSpawnBoss() ?? false;
        renderInspector();
        notice(
          spawned
            ? "selected boss spawned through production stage mapping"
            : "production boss spawn rejected",
        );
      }, 0);
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
    if (action === "apply-core-stats") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      activeGame.setCharacter(characterSelect.value as CharacterId);
      activeGame.testLabSetPlayerStats({
        base: coreStatsFromControls(),
        equipment: equipmentStatBonus(session.state.equipment),
      });
      renderInspector();
      return;
    }
    if (action === "reset-core-stats") {
      for (const [field, value] of Object.entries({
        "core-hull": DEFAULT_PLAYER_BASE_STATS.hull,
        "core-shield": DEFAULT_PLAYER_BASE_STATS.shield,
        "core-firepower": DEFAULT_PLAYER_BASE_STATS.firepower,
        "core-armor": DEFAULT_PLAYER_BASE_STATS.armor,
        "core-energy": DEFAULT_PLAYER_BASE_STATS.energy,
        "core-reactor": DEFAULT_PLAYER_BASE_STATS.reactor,
        "core-focus": DEFAULT_PLAYER_BASE_STATS.focus,
        "core-ward": DEFAULT_PLAYER_BASE_STATS.ward,
        "core-luck": DEFAULT_PLAYER_BASE_STATS.luck,
        "core-salvage": DEFAULT_PLAYER_BASE_STATS.salvage,
      })) {
        dialog.querySelector<HTMLInputElement>(
          '[data-field="' + field + '"]',
        )!.value = String(value);
      }
      ensureGame()?.testLabSetPlayerCoreStats(DEFAULT_PLAYER_BASE_STATS);
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
    if (action === "clear-one-status") {
      ensureGame()?.testLabClearStatus(
        statusSelect.value as StatusId,
      );
      renderInspector();
      return;
    }
    if (action === "clear-status") {
      ensureGame()?.testLabClearStatuses();
      renderInspector();
      return;
    }
    if (action === "grant-equip-equipment") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      const definitionId = equipmentSelect.value as EquipmentId;
      const instanceId =
        "test-lab-equipment-" + String(++equipmentInstanceSequence);
      session.state.equipment = addEquipmentInstance(
        session.state.equipment,
        {
          instanceId,
          definitionId,
          grade: equipmentGradeSelect.value as GradeId,
          enhancement: Math.max(
            0,
            Math.min(
              5,
              Math.floor(
                numberValue(
                  dialog,
                  '[data-field="equipment-enhancement"]',
                  0,
                ),
              ),
            ),
          ),
          affixes: [],
        },
      );
      session.state.equipment = equipInstance(
        session.state.equipment,
        instanceId,
      );
      applyResolvedBuildStats();
      renderInspector();
      notice("equipment granted/equipped through production loadout");
      return;
    }
    if (action === "grant-equip-relic") {
      const id = relicSelect.value as RelicId;
      const granted = grantRelic(session.state.relics, id);
      const equipped = equipRelic(granted.state, id);
      session.state.relics = equipped.state;
      applyResolvedBuildStats();
      renderInspector();
      notice(
        equipped.changed
          ? "relic equipped through production RelicState"
          : "relic granted but equip cap/state blocked the equip",
      );
      return;
    }
    if (action === "clear-relics") {
      session.state.relics = createRelicState();
      applyResolvedBuildStats();
      renderInspector();
      return;
    }
    if (action === "use-player-skill") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      const id = playerSkillSelect.value;
      if (registry.supportSpells.includes(id)) {
        activeGame.setSupportSpells([id as SupportSpellId]);
      }
      const result = activeGame.useSkill(id);
      notice(
        result.ok
          ? "skill activated · " + id
          : "skill blocked · " + String(result.reason),
      );
      renderInspector();
      return;
    }
    if (action === "reset-skill-cooldowns") {
      ensureGame()?.testLabResetSkillCooldowns();
      renderInspector();
      return;
    }
    if (action === "apply-time") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      activeGame.testLabSetTimeScale(
        numberValue(dialog, '[data-field="time-scale"]', 1),
      );
      activeGame.testLabSetSchedulerFrozen(
        dialog.querySelector<HTMLInputElement>(
          '[data-field="scheduler-frozen"]',
        )!.checked,
      );
      renderInspector();
      return;
    }
    if (action === "apply-pressure") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      activeGame.testLabSetDifficultyOverrides({
        maxEnemies: numberValue(dialog, '[data-field="max-enemies"]', 8),
        spawnInterval: numberValue(dialog, '[data-field="spawn-interval"]', 1),
        pressureBudget: numberValue(dialog, '[data-field="pressure-budget"]', 10),
        urgentThreatCap: numberValue(dialog, '[data-field="urgent-cap"]', 3),
        formationComplexity: numberValue(dialog, '[data-field="formation-complexity"]', 1),
        attackIntervalFactor: numberValue(dialog, '[data-field="attack-factor"]', 1),
      });
      renderInspector();
      return;
    }
    if (action === "spawn-formation") {
      const count = ensureGame()?.testLabSpawnFormationNow() ?? 0;
      notice(
        count > 0
          ? "spawned production formation · " + String(count) + " members"
          : "formation denied by production pressure/admission rules",
      );
      renderInspector();
      return;
    }
    if (action === "step-scheduler") {
      const stepped = ensureGame()?.testLabStepScheduler() ?? false;
      notice(stepped ? "scheduler admitted one production spawn step" : "scheduler step denied by current state");
      renderInspector();
      return;
    }
    if (action === "clear-projectiles") {
      ensureGame()?.testLabClearProjectiles();
      renderInspector();
      return;
    }
    if (action === "clear-particles") {
      ensureGame()?.testLabClearParticles();
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

    if (action === "load-shop") {
      loadShop(
        numberValue(dialog, '[data-field="shop-seed-offset"]', 0),
      );
      notice("production shop loaded");
      return;
    }
    if (action === "reroll-shop") {
      const nextOffset =
        Math.max(
          0,
          Math.floor(
            numberValue(
              dialog,
              '[data-field="shop-seed-offset"]',
              0,
            ),
          ),
        ) + 1;
      dialog.querySelector<HTMLInputElement>(
        '[data-field="shop-seed-offset"]',
      )!.value = String(nextOffset);
      if (activeShop !== null) {
        const nextInstances = { ...session.state.shops.instances };
        delete nextInstances[activeShop.id];
        session.state.shops = {
          version: 1,
          instances: nextInstances,
        };
      }
      loadShop(nextOffset);
      notice("QA reroll used production deterministic stock generation");
      return;
    }
    if (action === "buy-shop") {
      if (activeShop === null) {
        notice("load a shop first");
        return;
      }
      const result = buyShopStockEntry(
        {
          credits: session.state.credits,
          expansionCurrencies: session.state.expansionCurrencies,
          inventory: session.state.inventory,
          equipment: session.state.equipment,
          shops: session.state.shops,
        },
        activeShop.id,
        shopStockSelect.value,
        "test-lab-shop-" + String(++shopPurchaseSequence),
      );
      session.state.credits = result.state.credits;
      session.state.expansionCurrencies =
        result.state.expansionCurrencies;
      session.state.inventory = result.state.inventory;
      session.state.equipment = result.state.equipment;
      session.state.shops = result.state.shops;
      activeShop =
        session.state.shops.instances[activeShop.id] ?? null;
      if (activeShop !== null) populateShopStock(activeShop);
      renderInspector();
      notice(
        result.purchased
          ? "shop purchase completed through production flow"
          : "shop purchase blocked · " + String(result.reason),
      );
      return;
    }
    if (action === "roll-equipment") {
      rewardPreview = rollEquipmentDrop(
        inputValue(dialog, '[data-field="loot-source"]') as LootSource,
        numberValue(dialog, '[data-field="reward-luck"]', 0),
        numberValue(dialog, '[data-field="reward-salvage"]', 0),
      );
      renderInspector();
      notice(
        rewardPreview === null
          ? "equipment roll produced no drop"
          : "equipment drop rolled through production loot table",
      );
      return;
    }
    if (action === "preview-choice") {
      rewardPreview = createRewardChoiceOptions(
        numberValue(dialog, '[data-field="reward-luck"]', 0),
      );
      renderInspector();
      return;
    }
    if (action === "preview-boss-choice") {
      rewardPreview = createBossRewardChoiceOptions(
        session.stage,
        numberValue(dialog, '[data-field="reward-luck"]', 0),
        session.state.relics,
      );
      renderInspector();
      return;
    }
    if (action === "grant-star-crystal") {
      session.state.expansionCurrencies = {
        ...session.state.expansionCurrencies,
        starCrystal:
          session.state.expansionCurrencies.starCrystal + 1,
      };
      renderInspector();
      return;
    }
    if (action === "grant-quantum-core") {
      session.state.expansionCurrencies = {
        ...session.state.expansionCurrencies,
        quantumCore:
          session.state.expansionCurrencies.quantumCore + 1,
      };
      renderInspector();
      return;
    }
    if (
      action === "grant-salvage-anchor" ||
      action === "grant-stage-revival" ||
      action === "grant-phoenix"
    ) {
      const id: ItemId =
        action === "grant-salvage-anchor"
          ? "salvage-anchor"
          : action === "grant-stage-revival"
            ? "stage-revival-core"
            : "phoenix-core";
      session.state.inventory = addItem(
        session.state.inventory,
        id,
        1,
      ).inventory;
      renderInspector();
      return;
    }

    if (action === "apply-audio-levels") {
      if (music === null || game === null) createRuntime();
      music?.setMusicVolume(
        Math.max(
          0,
          Math.min(
            1,
            numberValue(dialog, '[data-field="music-volume"]', 0.34),
          ),
        ),
      );
      music?.setAmbientVolume(
        Math.max(
          0,
          Math.min(
            1,
            numberValue(dialog, '[data-field="ambient-volume"]', 0.14),
          ),
        ),
      );
      game?.testLabSetSfxVolume(
        Math.max(
          0,
          Math.min(
            1,
            numberValue(dialog, '[data-field="sfx-volume"]', 0.7),
          ),
        ),
      );
      renderInspector();
      return;
    }
    if (action === "set-music-boss-phase") {
      if (music === null) createRuntime();
      music?.setBossPhase(
        Number(
          inputValue(dialog, '[data-field="music-boss-phase"]'),
        ),
      );
      renderInspector();
      return;
    }
    if (action === "trigger-announcer") {
      const activeGame = ensureGame();
      if (activeGame === null) return;
      activeGame.testLabTriggerAnnouncer(
        announcerSelect.value as AnnouncerEvent,
      );
      renderInspector();
      return;
    }
    if (action === "trigger-pronunciation") {
      const settings = {
        ...options.getSettings(),
        pronunciationEnabled: true,
        pronunciationVolume: Math.max(
          0,
          Math.min(
            1,
            numberValue(
              dialog,
              '[data-field="pronunciation-volume"]',
              1,
            ),
          ),
        ),
      };
      speakEnglish(
        inputValue(dialog, '[data-field="pronunciation-text"]'),
        settings,
      );
      renderInspector();
      return;
    }
    if (action === "trigger-warning") {
      ensureGame()?.testLabTriggerWarning();
      renderInspector();
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
    if (action === "apply-builtin-preset") {
      applyBuiltInPreset(builtInPresetSelect.value);
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
      manualGate.destroy();
      dialog.remove();
      button.remove();
    },
  };
}
