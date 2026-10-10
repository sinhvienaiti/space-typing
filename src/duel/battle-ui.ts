import { duelLiveActionMapForMap } from "./map-actions";
import {
  CHARACTER_IDS,
  type CharacterId,
} from "../characters/registry";
import { playerProjectileProfile } from "../characters/projectiles";
import type {
  DuelClientEvent,
  DuelClientMatchView,
} from "./authority";
import type {
  DuelLocalPrediction,
} from "./network-client";
import type { DuelWireIntent } from "./protocol";
import type { DuelPlayerId } from "./model";
import { duelCharacterFromKeyboardInput } from "./typing";
import type { VisualQuality } from "../types";
import {
  DuelPerformanceMonitor,
  type DuelPerformanceDiagnostics,
} from "./performance";
import {
  combatVfxUrl,
  preloadCombatVfxSprites,
  type CombatVfxId,
} from "../vfx/combat-vfx-sprites";
import {
  duelTargetSpriteUrl,
  preloadDuelTargetSprites,
} from "./target-art";
import { duelProjectileTravelMs } from "./presentation-timing";
import { DuelCombatVisuals } from "./combat-visuals";
import { setShip3DCalm } from "./ship3d";
import { duelAutoActionBlock } from "./offer-availability";
import { duelArenaLayout } from "./combat-layout";
import { DuelMomentum, DUEL_MOMENTUM_TIERS } from "./momentum";
import { DUEL_KO_TIMELINE } from "./presentation-timing";
import type { DuelPresentationBeat } from "./audio";
import type { DuelHitKind } from "./combat-juice";

export type DuelBattleUiHooks = {
  sendIntent(intent: DuelWireIntent): number | null;
  onCombatRenderer?(
    draw: ((context: CanvasRenderingContext2D, time: number, width: number, height: number) => void) | null,
    camera?: (() => { zoom: number; fx: number; fy: number }) | null,
  ): void;
  /**
   * `beats` are presentation moments the UI derived itself (typing
   * momentum, shield hits, round calls) so audio can follow the visuals.
   */
  onPresentationState?(
    view: DuelClientMatchView,
    events: readonly DuelClientEvent[],
    beats?: readonly DuelPresentationBeat[],
  ): void;
  /** Camera shake for a hit, in px. */
  onScreenShake?(amount: number): void;
  /** Wide (left/right) layout on or off, for stereo placement. */
  onLayoutChange?(horizontal: boolean): void;
  onExit?(): void;
};

export type DuelBattleUiController = {
  show(
    view: DuelClientMatchView,
    events?: readonly DuelClientEvent[],
  ): void;
  update(
    view: DuelClientMatchView,
    events?: readonly DuelClientEvent[],
  ): void;
  setPrediction(prediction: DuelLocalPrediction): void;
  setQuality(quality: VisualQuality): void;
  /** Duel lobby opened: start loading heavy art (3D hull) before the fight. */
  preload(quality: VisualQuality, self?: CharacterId, rival?: CharacterId): void;
  getPerformanceDiagnostics(): DuelPerformanceDiagnostics;
  resetPerformanceDiagnostics(): void;
  hide(): void;
  isActive(): boolean;
};

type BattleNodes = ReturnType<typeof createBattleNodes>;

const MAX_FEED_ITEMS = 8;
const MAX_FX_NODES = 24;
const MAX_PROJECTILE_NODES = 18;
const MAX_TYPING_FX_NODES = 14;
const MAX_VISIBLE_WORD_TARGETS = 10;
const DUEL_WORD_TARGET_POSITIONS = [
  [28, 34],
  [73, 35],
  [28, 65],
  [73, 65],
  [18, 48],
  [82, 48],
  [35, 49],
  [65, 49],
  [35, 76],
  [65, 76],
] as const;
const SHIP_FALLBACKS = {
  self: "vanguard",
  opponent: "reaper",
} as const satisfies Record<string, CharacterId>;

/**
 * Depth View: words flank the firing lane (x 40–60% stays clear) between
 * the far rival (top) and your ship (bottom).
 */
const DUEL_DEPTH_TARGET_POSITIONS = [
  [27, 34], [73, 34], [19, 53], [81, 53], [33, 68],
  [67, 68], [35, 47], [65, 47], [21, 74], [79, 74],
] as const;

const DUEL_HORIZONTAL_TARGET_POSITIONS = [
  [32, 27], [68, 27], [32, 70], [68, 70], [48, 27],
  [48, 70], [20, 27], [80, 70], [80, 27], [20, 70],
] as const;

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

function resourceRatio(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, value / max));
}

function phaseLabel(
  phase: DuelClientMatchView["phase"],
): string {
  switch (phase) {
    case "build":
      return "ENGAGE";
    case "skirmish":
      return "SKIRMISH";
    case "war":
      return "WAR";
    case "crisis":
      return "CRISIS";
    case "cataclysm":
      return "CATACLYSM";
  }
}

function formatClock(seconds: number): string {
  const safe = Math.max(
    0,
    Number.isFinite(seconds) ? Math.floor(seconds) : 0,
  );
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remainder).padStart(2, "0")
  );
}

function characterId(
  value: string | null,
  fallback: CharacterId,
): CharacterId {
  return CHARACTER_IDS.includes(value as CharacterId)
    ? (value as CharacterId)
    : fallback;
}

function eventSourcePlayer(
  event: DuelClientEvent,
): DuelPlayerId | null {
  switch (event.type) {
    case "cannon-fired":
    case "cannon-hit":
    case "action-completed":
    case "action-fired":
    case "stored-action-used":
    case "combo-used":
    case "precision-firepower":
    case "precision-firepower-fired":
      return event.playerId;
    case "threat-created":
      return event.threat.sourcePlayerId;
    case "threat-countered":
    case "threat-resolved":
      return event.sourcePlayerId;
    default:
      return null;
  }
}

function duelPresentationHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function typedMarkup(
  token: string,
  prefix: string,
): {
  typed: string;
  remaining: string;
} {
  const safePrefix = token.startsWith(prefix)
    ? prefix
    : "";
  return {
    typed: safePrefix,
    remaining: token.slice(safePrefix.length),
  };
}

function createBattleNodes(gameShell: HTMLElement) {
  const root = createElement("section", "duel-battle hidden");
  root.id = "duelBattle";
  root.setAttribute("aria-label", "Duel battlefield");
  root.innerHTML = `
    <div class="duel-ambient" aria-hidden="true">
      <i></i><i></i><i></i><i></i>
    </div>
    <div id="duelEventFx" class="duel-event-fx" aria-hidden="true"></div>

    <header class="duel-topbar">
      <div class="duel-map-title">
        <small id="duelBattleMode">DUEL</small>
        <strong id="duelBattleMap">Frost Wastes</strong>
      </div>
      <div class="duel-phase-block">
        <span id="duelBattlePhase">BUILD</span>
        <strong id="duelBattleClock">00:00</strong>
        <small id="duelHazardWarning" class="duel-hazard-warning">AIRSPACE CLEAR</small>
      </div>
      <div class="duel-series">
        <small id="duelBattleSeries">Bo3 · 0-0</small>
        <button id="duelBattleExit" class="duel-exit hidden" type="button">Return to Lobby</button>
      </div>
    </header>

    <div class="duel-arena-stack">
      <section class="duel-arena" aria-label="Real-time Duel combat arena">
        <div id="duelProjectiles" class="duel-projectile-layer" aria-hidden="true"></div>
        <div id="duelTypingFx" class="duel-typing-fx" aria-hidden="true"></div>

        <div class="duel-rival-zone">
          <aside class="duel-player-card duel-opponent-card" aria-label="Rival combat status">
            <div class="duel-player-heading">
              <i class="duel-card-portrait" aria-hidden="true"></i>
              <span>RIVAL</span>
              <strong id="duelOpponentPath">BALANCED</strong>
            </div>
            <div class="duel-resource-row">
              <span>Hull</span>
              <div class="duel-resource-track"><i id="duelOpponentHullFill"></i></div>
              <strong id="duelOpponentHull">100</strong>
            </div>
            <div class="duel-resource-row">
              <span>Shield</span>
              <div class="duel-resource-track"><i id="duelOpponentShieldFill"></i></div>
              <strong id="duelOpponentShield">20</strong>
            </div>
            <div class="duel-resource-row">
              <span>Energy</span>
              <div class="duel-resource-track"><i id="duelOpponentEnergyFill"></i></div>
              <strong id="duelOpponentEnergy">25</strong>
            </div>
            <div class="duel-initiative">
              <span>Initiative</span>
              <strong id="duelOpponentInitiative">0</strong>
            </div>
            <div id="duelOpponentTrapHints" class="duel-trap-hints"></div>
            <div id="duelOpponentBankReveal" class="duel-bank-reveal"></div>
          </aside>

          <div id="duelOpponentShipFrame" class="duel-ship-frame duel-ship-opponent" aria-label="Rival ship">
            <i class="duel-damage-vfx duel-damage-fire duel-damage-fire-a" aria-hidden="true"></i>
            <i class="duel-damage-vfx duel-damage-fire duel-damage-fire-b" aria-hidden="true"></i>
            <i class="duel-damage-vfx duel-damage-smoke" aria-hidden="true"></i>
            <div id="duelOpponentShip" class="duel-ship-sprite" data-character="reaper"></div>
          </div>
          <div id="duelOpponentCharge" class="duel-opponent-charge hidden" aria-live="polite">RIVAL CHARGING</div>
        </div>

        <div id="duelOffers" class="duel-word-field" aria-label="Typing targets"></div>

        <div class="duel-arena-center">
          <section class="duel-threat-lane duel-context-lane hidden" aria-live="polite">
            <div class="duel-lane-title">
              <span>COUNTER</span>
              <small id="duelThreatMeta">No incoming major attack</small>
            </div>
            <div id="duelThreats" class="duel-threats"></div>
          </section>

          <section class="duel-objective-lane duel-context-lane hidden" aria-live="polite">
            <div class="duel-lane-title">
              <span>OBJECTIVE</span>
              <small id="duelObjectiveMeta">Director waiting</small>
            </div>
            <div id="duelObjective" class="duel-objective-empty">No objective</div>
          </section>

          <div class="duel-combat-space" aria-hidden="true">
            <i class="duel-arena-line"></i>
            <i class="duel-arena-reticle"></i>
          </div>

          <div id="duelCurrentInput" class="duel-current-input duel-arena-input hidden" aria-live="polite">
            <span id="duelCurrentTarget">TARGET</span>
            <strong id="duelCurrentPrefix" class="duel-current-token">_</strong>
            <small>ESC cancel</small>
          </div>
        </div>

        <div class="duel-self-zone">
          <div id="duelSelfShipFrame" class="duel-ship-frame duel-ship-self" aria-label="Your ship">
            <i class="duel-damage-vfx duel-damage-fire duel-damage-fire-a" aria-hidden="true"></i>
            <i class="duel-damage-vfx duel-damage-fire duel-damage-fire-b" aria-hidden="true"></i>
            <i class="duel-damage-vfx duel-damage-smoke" aria-hidden="true"></i>
            <div id="duelSelfShip" class="duel-ship-sprite" data-character="vanguard"></div>
          </div>

          <aside class="duel-player-card duel-self-card" aria-label="Your combat status">
            <div class="duel-player-heading">
              <i class="duel-card-portrait" aria-hidden="true"></i>
              <span>YOU</span>
              <strong id="duelSelfPath">BALANCED</strong>
            </div>
            <div class="duel-resource-row">
              <span>Hull</span>
              <div class="duel-resource-track"><i id="duelSelfHullFill"></i></div>
              <strong id="duelSelfHull">100</strong>
            </div>
            <div class="duel-resource-row">
              <span>Shield</span>
              <div class="duel-resource-track"><i id="duelSelfShieldFill"></i></div>
              <strong id="duelSelfShield">20</strong>
            </div>
            <div class="duel-resource-row">
              <span>Energy</span>
              <div class="duel-resource-track"><i id="duelSelfEnergyFill"></i></div>
              <strong id="duelSelfEnergy">25</strong>
            </div>
            <div class="duel-initiative">
              <span>Initiative</span>
              <strong id="duelSelfInitiative">0</strong>
            </div>
          </aside>
        </div>
      </section>
    </div>

    <div id="duelCinematic" class="duel-cinematic" aria-live="assertive"></div>

    <aside class="duel-arsenal duel-auto-combat" aria-label="Automatic combat">
      <div class="duel-arsenal-help">GÕ ĐỂ BẮN <span>HOÀN THÀNH TỪ → TỰ KÍCH HOẠT · KHÔNG CẦN CẤT KHO</span></div>
    </aside>
    <div class="duel-hidden-systems" aria-hidden="true">
      <span id="duelStrategyMeta">No combo ready</span>
      <div id="duelCombos" class="duel-strategy-actions"></div>
      <div class="duel-tool-group">
        <button type="button" data-duel-skill="conversion:sacrifice">Sacrifice</button>
        <button type="button" data-duel-skill="conversion:reactor-dump">Reactor Dump</button>
        <button type="button" data-duel-skill="conversion:overload">Overload</button>
        <button type="button" data-duel-skill="conversion:berserk">Berserk</button>
        <button type="button" data-duel-skill="trap:minefield">Minefield</button>
        <button type="button" data-duel-skill="trap:mirror-trap">Mirror Trap</button>
        <button type="button" data-duel-skill="trap:static-snare">Static Snare</button>
        <button type="button" data-duel-skill="trap:decoy">Decoy</button>
        <button type="button" data-duel-skill="trap:counter-battery">Counter Battery</button>
      </div>
      <span id="duelMysteryMeta">No Mystery signal</span>
      <div id="duelEventFeed" class="duel-event-feed" aria-live="polite"></div>
    </div>
  `;

  gameShell.append(root);

  const byId = <T extends HTMLElement>(id: string): T => {
    const found = root.querySelector<HTMLElement>("#" + id);
    if (found === null) {
      throw new Error("Missing Duel battle node #" + id);
    }
    return found as T;
  };

  return {
    root,
    fx: byId("duelEventFx"),
    cinematic: byId("duelCinematic"),
    projectiles: byId("duelProjectiles"),
    typingFx: byId("duelTypingFx"),
    mode: byId("duelBattleMode"),
    map: byId("duelBattleMap"),
    phase: byId("duelBattlePhase"),
    clock: byId("duelBattleClock"),
    hazardWarning: byId("duelHazardWarning"),
    series: byId("duelBattleSeries"),
    exit: byId<HTMLButtonElement>("duelBattleExit"),
    selfPath: byId("duelSelfPath"),
    selfShipFrame: byId("duelSelfShipFrame"),
    selfShip: byId("duelSelfShip"),
    selfHullFill: byId("duelSelfHullFill"),
    selfShieldFill: byId("duelSelfShieldFill"),
    selfEnergyFill: byId("duelSelfEnergyFill"),
    selfHull: byId("duelSelfHull"),
    selfShield: byId("duelSelfShield"),
    selfEnergy: byId("duelSelfEnergy"),
    selfInitiative: byId("duelSelfInitiative"),
    opponentPath: byId("duelOpponentPath"),
    opponentShipFrame: byId("duelOpponentShipFrame"),
    opponentShip: byId("duelOpponentShip"),
    opponentCharge: byId("duelOpponentCharge"),
    opponentHullFill: byId("duelOpponentHullFill"),
    opponentShieldFill: byId("duelOpponentShieldFill"),
    opponentEnergyFill: byId("duelOpponentEnergyFill"),
    opponentHull: byId("duelOpponentHull"),
    opponentShield: byId("duelOpponentShield"),
    opponentEnergy: byId("duelOpponentEnergy"),
    opponentInitiative: byId("duelOpponentInitiative"),
    opponentTrapHints: byId("duelOpponentTrapHints"),
    opponentBankReveal: byId("duelOpponentBankReveal"),
    threatMeta: byId("duelThreatMeta"),
    threats: byId("duelThreats"),
    objectiveMeta: byId("duelObjectiveMeta"),
    objective: byId("duelObjective"),
    offers: byId("duelOffers"),
    currentInput: byId("duelCurrentInput"),
    currentTarget: byId("duelCurrentTarget"),
    currentPrefix: byId("duelCurrentPrefix"),
    strategyMeta: byId("duelStrategyMeta"),
    combos: byId("duelCombos"),
    mysteryMeta: byId("duelMysteryMeta"),
    eventFeed: byId("duelEventFeed"),
  };
}

function eventLabel(event: DuelClientEvent): string {
  switch (event.type) {
    case "cannon-fired": return "CANNON · firing";
    case "cannon-hit": return "CANNON · impact";
    case "typing-miss":
      return "Typing miss · " + event.char.toUpperCase();
    case "action-completed":
      return "Action complete · " + event.actionId;
    case "action-fired":
      return "FIRE · " + event.actionId;
    case "offer-expired":
      return "Offer expired · " + event.actionId;
    case "action-banked":
      return "Banked · " + event.actionId;
    case "stored-action-used":
      return "Deployed · " + event.actionId;
    case "threat-created":
      return "MAJOR ATTACK · response window open";
    case "threat-countered":
      return "COUNTER SUCCESS";
    case "threat-resolved":
      return "Threat impact · " + event.actionId;
    case "fate-resolved":
      return "FATE · " + event.resolution.outcome.id;
    case "mystery-created":
      return "MYSTERY SIGNAL · " + event.mystery.riskTag;
    case "mystery-revealed":
      return "Mystery intel acquired";
    case "mystery-resolved":
      return "Mystery resolved · " + event.outcome.id;
    case "combo-ready":
      return "COMBO READY · " + event.comboId;
    case "combo-used":
      return "COMBO · " + event.comboId;
    case "precision-firepower":
      return (
        "PRECISION ARMED " +
        String(event.streak) +
        " · " +
        event.ordnance.replaceAll("-", " ").toUpperCase()
      );
    case "precision-firepower-fired":
      return (
        "PRECISION FIRE " +
        String(event.streak) +
        " · " +
        event.ordnance.replaceAll("-", " ").toUpperCase()
      );
    case "conversion-used":
      return "CONVERSION · " + event.conversionId;
    case "trap-armed":
      return "TRAP ARMED";
    case "trap-triggered":
      return (
        "TRAP TRIGGERED · " +
        event.trapId.replaceAll("-", " ").toUpperCase()
      );
    case "opponent-trap-hint":
      return event.publicHint;
    case "objective-spawned":
      return "OBJECTIVE · " + event.objective.displayLabel;
    case "objective-resolved":
      return event.resolution.draw
        ? "OBJECTIVE DRAW"
        : "OBJECTIVE CLAIMED";
    case "map-hazard-telegraph":
      return (
        "WARNING · " +
        event.hazard.hazardId.replaceAll("-", " ").toUpperCase() +
        " · " +
        event.hazard.telegraphSeconds.toFixed(1) +
        "s"
      );
    case "map-hazard":
      return "HAZARD · " + event.hazard.hazardId;
    case "map-cataclysm":
      return "CATACLYSM · " + event.cataclysm.displayLabel;
    case "round-ended":
      return event.result.status === "draw"
        ? "ROUND DRAW"
        : "ROUND WON";
    case "intent-rejected":
      return "Action rejected · " + event.reason;
    case "target-locked":
      return "Target locked";
    case "target-cancelled":
      return "Target cancelled";
    case "action-blocked":
      return "Action blocked · " + event.reason;
  }
}

function fxKind(event: DuelClientEvent): string | null {
  switch (event.type) {
    case "map-hazard-telegraph":
      return "hazard-warning";
    case "map-hazard":
      return "hazard";
    case "map-cataclysm":
      return "cataclysm";
    case "fate-resolved":
      return "fate";
    case "mystery-created":
    case "mystery-resolved":
      return "mystery";
    case "combo-used":
      return "combo";
    case "precision-firepower":
    case "precision-firepower-fired":
      return "precision";
    case "trap-triggered":
      return "trap";
    case "threat-created":
    case "threat-countered":
    case "threat-resolved":
      return "threat";
    default:
      return null;
  }
}

function button(
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const node = createElement("button", className);
  node.type = "button";
  node.textContent = label;
  node.addEventListener("click", onClick);
  return node;
}

export function installDuelBattleUi(
  hooks: DuelBattleUiHooks,
  initialQuality: VisualQuality = "high",
): DuelBattleUiController {
  const gameShell = document.querySelector<HTMLElement>(
    ".game-shell",
  );
  if (gameShell === null) {
    throw new Error("Duel battle requires .game-shell.");
  }

  const existing =
    gameShell.querySelector<HTMLElement>("#duelBattle");
  existing?.remove();
  const nodes = createBattleNodes(gameShell);
  const updateLayout = (): void => {
    const bounds = nodes.projectiles.parentElement!.getBoundingClientRect();
    const layout = duelArenaLayout(bounds.width, bounds.height);
    if (nodes.root.dataset.layout !== layout) hooks.onLayoutChange?.(layout === "horizontal");
    nodes.root.dataset.layout = layout;
  };
  const layoutObserver = new ResizeObserver(updateLayout);
  layoutObserver.observe(nodes.root);
  // Canvas impacts (combat-juice) replace the DOM arrival blasts whenever
  // the shared renderer runs; the DOM path stays only as a fallback below.
  const combatVisuals = new DuelCombatVisuals(
    nodes.projectiles.parentElement!, nodes.selfShipFrame, nodes.opponentShipFrame,
    () => undefined,
    hooks.onCombatRenderer !== undefined,
  );
  combatVisuals.setShakeSink((amount) => hooks.onScreenShake?.(amount));
  const juice = combatVisuals.juice;
  if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) {
    Object.assign(combatVisuals.canvas, { duelVisuals: combatVisuals });
  }

  let quality = initialQuality;
  let view: DuelClientMatchView | null = null;
  let prediction: DuelLocalPrediction = {
    roundId: null,
    targetInstanceId: null,
    acquisitionPrefix: "",
    pendingSequences: [],
  };
  let active = false;
  let fxSequence = 0;
  let projectileSequence = 0;
  let lastTypingFeedbackKey = "";
  let paintedVfxGeneration = 0;
  const offerTargetNodes = new Map<
    string,
    {
      root: HTMLButtonElement;
      targetObject: HTMLElement;
      category: HTMLElement;
      label: HTMLElement;
      typed: HTMLElement;
      remaining: HTMLElement;
      meta: HTMLElement;
    }
  >();
  const offerLayoutAssignments = new Map<string, number>();
  /** When each target appeared (warp-in class for its first 460 ms). */
  const offerSpawnedAt = new Map<string, number>();
  /** Where a target was when it left the field, for the completion burst. */
  const removedOfferPoints = new Map<string, { x: number; y: number; rgb: string }>();
  const CATEGORY_RGB: Readonly<Record<string, string>> = {
    attack: "#ff7048", defense: "#56c4ff", support: "#60ffa2",
    tactical: "#c48cff", fate: "#ffd454", mystery: "#ff56d6",
  };
  const performanceMonitor =
    new DuelPerformanceMonitor();
  const presentationTimers = new Set<number>();
  const presentationAnimations = new Set<Animation>();
  const presentedCannonEvents = new Set<string>();
  const momentum = new DuelMomentum();
  /** Per-round numbers for the result card. */
  const roundStats = { dealt: 0, taken: 0 };
  /** Hull/shield change of the current update, so a confirmed bolt knows
   * whether it hit the shield or the hull. */
  const lastDelta: Record<"self" | "opponent", { hull: number; shield: number }> = {
    self: { hull: 0, shield: 0 },
    opponent: { hull: 0, shield: 0 },
  };
  let pendingBeats: DuelPresentationBeat[] = [];
  /** Beats raised between updates (attack arrivals); sent with the next. */
  let deferredBeats: DuelPresentationBeat[] = [];
  let firstBloodDrawn = false;
  const multiKill = { count: 0, lastAt: -Infinity };
  const MULTI_KILL_LABELS: Readonly<Record<number, string>> = { 2: "DOUBLE KILL!", 3: "TRIPLE KILL!", 4: "ULTRA KILL!", 5: "RAMPAGE!" };
  /**
   * DotA multi-kills: each of YOUR attacks (one per completed word, however
   * many bolts it fires) landing within 3.5 s of the previous one. Called
   * when the attack's flight ends; only the 2nd–5th announce.
   */
  const registerAttackHit = (): void => {
    if (!active || view?.round.status !== "active") return;
    const now = performance.now();
    multiKill.count = now - multiKill.lastAt <= 3500 ? multiKill.count + 1 : 1;
    multiKill.lastAt = now;
    if (multiKill.count < 2 || multiKill.count > 5) return;
    deferredBeats.push({ type: "multi-kill", count: multiKill.count });
    juice.text("opponent", MULTI_KILL_LABELS[Math.min(5, multiKill.count)]!, "callout", "#ffcf4d", 0);
  };
  let lastPhase: DuelClientMatchView["phase"] | null = null;
  let knockoutRoundId: string | null = null;
  const textCache = new WeakMap<HTMLElement, string>();
  const setText = (node: HTMLElement, value: string): void => {
    // Rewriting identical text 20x a second still invalidates layout.
    if (textCache.get(node) === value) return;
    textCache.set(node, value);
    node.textContent = value;
  };
  const styleCache = new WeakMap<HTMLElement, string>();
  const setTransform = (node: HTMLElement, value: string): void => {
    if (styleCache.get(node) === value) return;
    styleCache.set(node, value);
    node.style.transform = value;
  };
  const varCache = new WeakMap<HTMLElement, Map<string, string>>();
  const setVar = (node: HTMLElement, name: string, value: string): void => {
    let vars = varCache.get(node);
    if (vars === undefined) {
      vars = new Map();
      varCache.set(node, vars);
    }
    if (vars.get(name) === value) return;
    vars.set(name, value);
    node.style.setProperty(name, value);
  };
  const classCache = new WeakMap<HTMLElement, string>();
  const dataCache = new WeakMap<HTMLElement, Map<string, string>>();
  const setData = (node: HTMLElement, key: string, value: string): void => {
    let entries = dataCache.get(node);
    if (entries === undefined) {
      entries = new Map();
      dataCache.set(node, entries);
    }
    if (entries.get(key) === value) return;
    entries.set(key, value);
    node.dataset[key] = value;
  };
  const setClass = (node: HTMLElement, value: string): void => {
    if (classCache.get(node) === value) return;
    classCache.set(node, value);
    node.className = value;
  };
  const setResource = (
    fill: HTMLElement,
    valueNode: HTMLElement,
    value: number,
    max: number,
  ): void => {
    setTransform(fill, "scaleX(" + resourceRatio(value, max).toFixed(3) + ")");
    setText(
      valueNode,
      String(Math.max(0, Math.round(value))) + " / " + String(Math.max(0, Math.round(max))),
    );
  };

  const clearPresentationTimers = (): void => {
    for (const timer of presentationTimers) {
      window.clearTimeout(timer);
    }
    presentationTimers.clear();
    for (const animation of presentationAnimations) animation.cancel();
    presentationAnimations.clear();
    presentedCannonEvents.clear();
    combatVisuals.clear();
    nodes.root.querySelectorAll(".duel-muzzle-flash, .duel-projectile-arrival, .duel-damage-number, .duel-shield-break").forEach(node => node.remove());
  };

  const schedulePresentation = (
    callback: () => void,
    delayMs: number,
  ): void => {
    const timer = window.setTimeout(() => {
      presentationTimers.delete(timer);
      if (active) callback();
    }, Math.max(0, delayMs));
    presentationTimers.add(timer);
  };

  const appendTransientFx = (node: HTMLElement): void => {
    while (
      nodes.fx.childElementCount >= MAX_FX_NODES
    ) {
      nodes.fx.firstElementChild?.remove();
    }
    nodes.fx.append(node);
  };

  let performanceFrame: number | null = null;
  let lastPerformanceFrameAt: number | null = null;

  const sendTarget = (targetInstanceId: string): void => {
    const offer = view?.self.offers.find(item => item.instanceId === targetInstanceId);
    if (view && offer && duelAutoActionBlock(actionDefinition(offer.actionId), view.self.energy, view.self.cooldowns[offer.actionId])) return;
    hooks.sendIntent({
      type: "SELECT_TARGET",
      targetInstanceId,
    });
  };

  const actionDefinition = (
    actionId: string,
  ) =>
    view === null
      ? undefined
      : duelLiveActionMapForMap(view.map.id).get(actionId);

  const applyTargetSprite = (
    node: HTMLElement,
    actionId: string,
  ): boolean => {
    const url = duelTargetSpriteUrl(actionId);
    if (url === null) {
      node.classList.remove("duel-target-object-painted");
      node.style.removeProperty("background-image");
      return false;
    }
    node.classList.add("duel-target-object-painted");
    node.style.backgroundImage = 'url("' + url + '")';
    return true;
  };

  const applyPaintedTargetArt = async (): Promise<void> => {
    const manifest = await preloadDuelTargetSprites();
    if (!active || manifest === null) return;

    for (const mounted of offerTargetNodes.values()) {
      const actionId =
        mounted.targetObject.dataset.actionId;
      if (actionId !== undefined) {
        applyTargetSprite(
          mounted.targetObject,
          actionId,
        );
      }
    }
    nodes.root.dataset.paintedTargets =
      Object.keys(manifest.sprites).length > 0
        ? "true"
        : "false";
  };

  const applyPaintedCombatVfx = async (): Promise<void> => {
    const generation = ++paintedVfxGeneration;
    const manifest = await preloadCombatVfxSprites();
    if (
      !active ||
      generation !== paintedVfxGeneration ||
      manifest === null
    ) {
      return;
    }

    const ids: readonly CombatVfxId[] = [
      "explosion-core",
      "explosion-wide",
      "shockwave-ring",
      "fire-small",
      "fire-medium",
      "fire-critical",
      "smoke-dark",
      "smoke-hot",
      "spark-burst",
      "debris-burst",
      "missile-salvo",
      "bomb-impact",
      "precision-burst",
    ];

    let available = 0;
    for (const id of ids) {
      const url = combatVfxUrl(id);
      if (url === null) continue;
      available += 1;
      nodes.root.style.setProperty(
        "--duel-vfx-" + id,
        'url("' + url + '")',
      );
    }
    nodes.root.dataset.paintedVfx =
      available > 0 ? "true" : "false";
  };

  const damageTier = (
    hull: number,
    maxHull: number,
  ): 0 | 1 | 2 | 3 => {
    const ratio = resourceRatio(hull, maxHull);
    if (ratio > 0.7) return 0;
    if (ratio > 0.45) return 1;
    if (ratio > 0.2) return 2;
    return 3;
  };

  const assignOfferLayout = (
    instanceId: string,
  ): number => {
    const existing = offerLayoutAssignments.get(instanceId);
    if (existing !== undefined) return existing;

    const occupied = new Set(offerLayoutAssignments.values());
    const startIndex =
      duelPresentationHash(instanceId) %
      DUEL_WORD_TARGET_POSITIONS.length;
    for (
      let offset = 0;
      offset < DUEL_WORD_TARGET_POSITIONS.length;
      offset += 1
    ) {
      const candidate =
        (startIndex + offset) %
        DUEL_WORD_TARGET_POSITIONS.length;
      if (!occupied.has(candidate)) {
        offerLayoutAssignments.set(instanceId, candidate);
        return candidate;
      }
    }

    // UI cap is 10. Reuse is only a defensive fallback for malformed views.
    offerLayoutAssignments.set(instanceId, startIndex);
    return startIndex;
  };

  const mountOfferTarget = (
    instanceId: string,
  ) => {
    const card = createElement(
      "button",
      "duel-offer-card duel-word-target",
    );
    card.type = "button";
    card.classList.add("duel-word-target");
    card.dataset.offerId = instanceId;
    card.addEventListener("click", () => {
      sendTarget(instanceId);
    });

    const targetObject = createElement(
      "span",
      "duel-target-object",
    );
    targetObject.setAttribute("aria-hidden", "true");
    const category = createElement(
      "small",
      "duel-offer-category",
    );
    const label = createElement(
      "strong",
      "duel-offer-label",
    );
    const token = createElement(
      "span",
      "duel-offer-token",
    );
    const typed = createElement("b");
    const remaining = createElement("i");
    token.append(typed, remaining);
    const meta = createElement("small", "duel-offer-meta");
    card.append(
      targetObject,
      token,
      label,
      category,
      meta,
    );
    nodes.offers.append(card);

    const mounted = {
      root: card,
      targetObject,
      category,
      label,
      typed,
      remaining,
      meta,
    };
    offerTargetNodes.set(instanceId, mounted);
    return mounted;
  };

  const renderOffers = (): void => {
    if (view === null) return;
    const targetFrozen =
      view.shared.tactical.frozenTargetCount[
        view.self.playerId
      ] > 0;
    const driftScale =
      view.shared.tactical.offerDriftScale[
        view.self.playerId
      ];
    const driftStrength = Math.max(
      0,
      Math.min(
        1,
        (1 - driftScale) / 0.35,
      ),
    );
    nodes.offers.dataset.drifting =
      driftStrength > 0.01 ? "true" : "false";
    nodes.offers.style.setProperty(
      "--duel-offer-drift-strength",
      driftStrength.toFixed(4),
    );

    const visibleOffers = view.self.offers
      .filter(
        (offer) =>
          offer.status === "available" ||
          offer.status === "locked",
      )
      .slice(0, MAX_VISIBLE_WORD_TARGETS);
    const visibleIds = new Set(
      visibleOffers.map((offer) => offer.instanceId),
    );

    for (const [instanceId, mounted] of offerTargetNodes) {
      if (visibleIds.has(instanceId)) continue;
      if (combatVisuals.available) {
        // One layout read per removed target: rare, and it anchors the burst.
        const arena = nodes.projectiles.parentElement!.getBoundingClientRect();
        const box = mounted.targetObject.getBoundingClientRect();
        removedOfferPoints.set(instanceId, {
          x: box.left + box.width / 2 - arena.left,
          y: box.top + box.height / 2 - arena.top,
          rgb: CATEGORY_RGB[mounted.root.dataset.category ?? ""] ?? "#8fe9ff",
        });
        while (removedOfferPoints.size > 12) removedOfferPoints.delete(removedOfferPoints.keys().next().value!);
      }
      mounted.root.remove();
      offerTargetNodes.delete(instanceId);
      offerLayoutAssignments.delete(instanceId);
      offerSpawnedAt.delete(instanceId);
    }

    for (const offer of visibleOffers) {
      const action = actionDefinition(offer.actionId);
      if (action === undefined) continue;
      const blockedReason = duelAutoActionBlock(action, view.self.energy, view.self.cooldowns[action.id]);
      const cooldown =
        view.self.cooldowns[action.id] ?? 0;
      const lifetime =
        offer.remainingSeconds ?? null;
      const selected =
        prediction.targetInstanceId === offer.instanceId ||
        view.self.targetInstanceId === offer.instanceId;
      const prefix = selected
        ? prediction.acquisitionPrefix ||
          offer.typedPrefix
        : offer.typedPrefix;
      const answerToken =
        offer.typingPrompt?.answerToken ??
        action.answerToken;
      const progress = typedMarkup(
        answerToken,
        prefix,
      );

      const mounted =
        offerTargetNodes.get(offer.instanceId) ??
        mountOfferTarget(offer.instanceId);
      const card = mounted.root;
      if (!offerSpawnedAt.has(offer.instanceId)) offerSpawnedAt.set(offer.instanceId, performance.now());
      const spawning = performance.now() - (offerSpawnedAt.get(offer.instanceId) ?? 0) < 460;
      card.dataset.category = action.category;
      setClass(card,
        (spawning ? "spawning " : "") +
        "duel-offer-card duel-word-target duel-category-" +
        action.category +
        (selected ? " selected" : "") +
        (blockedReason ? " action-unavailable" : "") +
        (cooldown > 0 ? " cooling-down" : "") +
        (targetFrozen && !selected
          ? " target-frozen"
          : "") +
        (lifetime !== null && lifetime <= 5
          ? " expiring-soon"
          : ""));
      card.disabled =
        blockedReason !== null ||
        cooldown > 0 ||
        (targetFrozen && !selected);
      card.dataset.actionId = action.id;
      card.setAttribute("aria-disabled", String(card.disabled));
      const targetIndex = assignOfferLayout(
        offer.instanceId,
      );
      const [targetX, targetY] =
        DUEL_WORD_TARGET_POSITIONS[targetIndex] ?? [50, 50];
      setVar(card, "--duel-target-x", String(targetX) + "%");
      setVar(card, "--duel-target-y", String(targetY) + "%");
      const [horizontalX, horizontalY] = DUEL_HORIZONTAL_TARGET_POSITIONS[targetIndex] ?? [50, 27];
      setVar(card, "--duel-target-x-horizontal", horizontalX + "%");
      setVar(card, "--duel-target-y-horizontal", horizontalY + "%");
      const [depthX, depthY] = DUEL_DEPTH_TARGET_POSITIONS[targetIndex] ?? [27, 34];
      setVar(card, "--duel-target-x-depth", depthX + "%");
      setVar(card, "--duel-target-y-depth", depthY + "%");
      setVar(card, "--duel-target-float-delay", String((targetIndex % 5) * -0.37) + "s");
      card.title = blockedReason ? blockedReason + " — Esc để đổi mục tiêu" : action.displayLabel + " · Tự kích hoạt khi gõ xong";

      mounted.targetObject.dataset.actionId = action.id;
      applyTargetSprite(
        mounted.targetObject,
        action.id,
      );
      setText(mounted.category, action.category.toUpperCase());
      setText(mounted.label, action.displayLabel);
      setText(mounted.typed, progress.typed);
      setText(mounted.remaining, progress.remaining);

      const baseMeta = action.energyCost > 0 ? "AUTO · " + String(action.energyCost) + " EN" : "AUTO";
      const timingMeta: string[] = [];
      if (cooldown > 0) {
        timingMeta.push(cooldown.toFixed(1) + "s CD");
      }
      if (targetFrozen && !selected) {
        timingMeta.push("FROZEN");
      }
      if (lifetime !== null && lifetime <= 6) {
        timingMeta.push(
          Math.max(0, lifetime).toFixed(1) + "s",
        );
      }
      setText(mounted.meta,
        blockedReason ?? (timingMeta.length > 0
          ? timingMeta.join(" · ") + " · " + baseMeta
          : baseMeta));
      card.setAttribute("aria-label", action.displayLabel + " · " + answerToken + " · " + mounted.meta.textContent);
    }
  };

  let threatsShown = true;
  const renderThreats = (): void => {
    if (view === null) return;
    const threats = view.self.incomingThreats;
    if (threats.length === 0 && !threatsShown) return;
    threatsShown = threats.length > 0;
    nodes.threats.replaceChildren();
    nodes.threats
      .closest(".duel-context-lane")
      ?.classList.toggle("hidden", threats.length === 0);
    nodes.threatMeta.textContent =
      threats.length === 0
        ? "No incoming major attack"
        : String(threats.length) + " response window(s)";

    for (const threat of threats) {
      const selected =
        prediction.targetInstanceId === threat.id ||
        view.self.targetInstanceId === threat.id;
      const prefix = selected
        ? prediction.acquisitionPrefix ||
          threat.typedPrefix
        : threat.typedPrefix;
      const progress = typedMarkup(
        threat.answerToken,
        prefix,
      );
      const card = button(
        "",
        "duel-threat-card" +
          (selected ? " selected" : ""),
        () => sendTarget(threat.id),
      );
      const label = createElement("strong");
      label.textContent = threat.displayLabel;
      const clock = createElement("small");
      clock.textContent =
        threat.remainingSeconds.toFixed(1) + "s";
      const token = createElement("span");
      const typed = createElement("b");
      typed.textContent = progress.typed;
      const remaining = createElement("i");
      remaining.textContent = progress.remaining;
      token.append(typed, remaining);
      card.append(label, clock, token);
      nodes.threats.append(card);
    }
  };

  let objectiveShown = true;
  const renderObjective = (): void => {
    if (view === null) return;
    const objective = view.shared.neutralObjective;
    const objectiveActive = objective !== null && objective.status === "active";
    if (!objectiveActive && !objectiveShown) return;
    objectiveShown = objectiveActive;
    nodes.objective.replaceChildren();

    const objectiveLane =
      nodes.objective.closest(".duel-context-lane");
    if (
      objective === null ||
      objective.status !== "active"
    ) {
      objectiveLane?.classList.add("hidden");
      nodes.objective.className = "duel-objective-empty";
      nodes.objective.textContent = "No objective";
      nodes.objectiveMeta.textContent = "Director waiting";
      return;
    }

    objectiveLane?.classList.remove("hidden");
    nodes.objective.className = "duel-objective-card";
    nodes.objectiveMeta.textContent =
      objective.kind.toUpperCase() + " · simultaneous contest";

    const selected =
      prediction.targetInstanceId === objective.id ||
      view.self.targetInstanceId === objective.id;
    const selfPrefix = selected
      ? prediction.acquisitionPrefix ||
        objective.progress[view.self.playerId]
      : objective.progress[view.self.playerId];
    const opponentId =
      view.self.playerId === "player-1"
        ? "player-2"
        : "player-1";

    const title = createElement("strong");
    title.textContent = objective.displayLabel;
    const self = createElement("button", "duel-objective-progress");
    self.type = "button";
    self.classList.toggle("selected", selected);
    const selfProgress = typedMarkup(
      objective.answerToken,
      selfPrefix,
    );
    self.textContent =
      "YOU · " +
      selfProgress.typed +
      selfProgress.remaining;
    self.addEventListener("click", () => {
      sendTarget(objective.id);
    });

    const rival = createElement(
      "span",
      "duel-objective-progress rival",
    );
    rival.textContent =
      "RIVAL · " +
      objective.progress[opponentId] +
      "·".repeat(
        Math.max(
          0,
          objective.answerToken.length -
            objective.progress[opponentId].length,
        ),
      );

    nodes.objective.append(title, self, rival);
  };

  let strategyKey = "";
  const renderStrategy = (): void => {
    if (view === null) return;
    const combos = view.self.readyCombos;
    const key = view.self.strategyPath + "|" + combos.map((combo) => combo.id).join(",") + "|" + String(view.self.initiative >= 8);
    if (key === strategyKey) return;
    strategyKey = key;
    nodes.combos.replaceChildren();
    nodes.strategyMeta.textContent =
      combos.length === 0
        ? view.self.strategyPath.toUpperCase() +
          " · no combo ready"
        : view.self.strategyPath.toUpperCase() +
          " · " +
          String(combos.length) +
          " combo ready";

    for (const combo of combos) {
      nodes.combos.append(
        button(
          combo.id
            .replaceAll("-", " ")
            .toUpperCase(),
          "duel-combo-button",
          () => {
            hooks.sendIntent({
              type: "ACTIVATE_SKILL",
              skillId: "combo:" + combo.id,
            });
          },
        ),
      );
    }
    const initiative = view.self.initiative;
    nodes.root
      .querySelectorAll<HTMLButtonElement>(
        '[data-duel-skill^="trap:"]',
      )
      .forEach((tool) => {
        tool.disabled = initiative < 8;
        tool.title =
          initiative < 8
            ? "Requires 8 Initiative"
            : "Spend 8 Initiative to arm";
      });
  };

  let intelKey = "";
  const renderIntel = (): void => {
    if (view === null) return;
    const key = JSON.stringify([
      view.shared.mysteries.map((mystery) => mystery.displayLabel + mystery.resolved),
      view.shared.opponentTrapHints,
      view.opponent.revealedInventory,
    ]);
    if (key === intelKey) return;
    intelKey = key;
    const mysteries = view.shared.mysteries.filter(
      (mystery) => !mystery.resolved,
    );
    nodes.mysteryMeta.textContent =
      mysteries.length === 0
        ? "No Mystery signal"
        : mysteries
            .map(
              (mystery) =>
                mystery.displayLabel +
                " · " +
                mystery.rarity.toUpperCase() +
                " · " +
                mystery.riskTag.toUpperCase(),
            )
            .join(" · ");

    nodes.opponentTrapHints.replaceChildren();
    for (const hint of view.shared.opponentTrapHints) {
      const chip = createElement("span");
      chip.textContent = hint;
      nodes.opponentTrapHints.append(chip);
    }

    nodes.opponentBankReveal.replaceChildren();
    const revealed = view.opponent.revealedInventory;
    if (revealed !== null) {
      const heading = createElement("small");
      heading.textContent = "SCAN · OPPONENT BANK";
      nodes.opponentBankReveal.append(heading);
      for (const bucket of [
        "attack",
        "defense",
        "tactical",
      ] as const) {
        for (const entry of revealed[bucket]) {
          const action = actionDefinition(entry.actionId);
          const chip = createElement("span");
          chip.className =
            "duel-bank-reveal-chip duel-category-" +
            (action?.category ?? bucket);
          chip.textContent =
            action?.displayLabel ?? entry.actionId;
          nodes.opponentBankReveal.append(chip);
        }
      }
      if (nodes.opponentBankReveal.childElementCount === 1) {
        const empty = createElement("span", "duel-empty-chip");
        empty.textContent = "bank empty";
        nodes.opponentBankReveal.append(empty);
      }
    }
  };

  const renderShips = (): void => {
    if (view === null) return;
    const selfCharacter = characterId(
      view.appearance.selfCharacterId,
      SHIP_FALLBACKS.self,
    );
    const opponentCharacter = characterId(
      view.appearance.opponentCharacterId,
      SHIP_FALLBACKS.opponent,
    );
    nodes.selfShip.dataset.character = selfCharacter;
    nodes.opponentShip.dataset.character =
      opponentCharacter;
    // Status cards show each pilot's hull (style: src/duel/battle-holo.css).
    for (const [selector, id] of [[".duel-self-card", selfCharacter], [".duel-opponent-card", opponentCharacter]] as const) {
      const card = nodes.selfShip.ownerDocument.querySelector<HTMLElement>(selector);
      if (card !== null && card.dataset.character !== id) {
        card.dataset.character = id;
        card.style.setProperty("--ship-art", "url(\"/assets/space-typing/ships/3d/" + id + "/color.webp\")");
      }
    }
    combatVisuals.setCharacters(selfCharacter, opponentCharacter);
    // Between rounds (and before the first): load the 3D hulls now; the
    // rival's load pauses while a round is fought. Idempotent per ship.
    setShip3DCalm(view.round.status !== "active" || !active);
    if (view.round.status !== "active") combatVisuals.preload(quality, selfCharacter, opponentCharacter);

    setData(nodes.selfShipFrame, "damageTier", String(
      damageTier(view.self.hull, view.self.maxHull),
    ));
    setData(nodes.opponentShipFrame, "damageTier", String(
      damageTier(view.opponent.hull, view.opponent.maxHull),
    ));

    const selfShieldRatio = resourceRatio(
      view.self.shield,
      view.self.maxShield,
    );
    const opponentShieldRatio = resourceRatio(
      view.opponent.shield,
      view.opponent.maxShield,
    );
    setVar(nodes.selfShipFrame, "--duel-shield-ratio", selfShieldRatio.toFixed(3));
    setVar(nodes.opponentShipFrame, "--duel-shield-ratio", opponentShieldRatio.toFixed(3));
    setData(nodes.selfShipFrame, "shieldActive", selfShieldRatio > 0 ? "true" : "false");
    setData(nodes.opponentShipFrame, "shieldActive", opponentShieldRatio > 0 ? "true" : "false");

    const rivalTyping = view.opponent.typingTelegraph;
    const rivalProgress = rivalTyping.active
      ? Math.max(0.16, rivalTyping.progress)
      : 0;
    setData(nodes.opponentShipFrame, "typing", rivalTyping.active ? "true" : "false");
    setVar(nodes.opponentShipFrame, "--duel-opponent-typing-progress", rivalProgress.toFixed(2));
    nodes.opponentCharge.classList.toggle(
      "hidden",
      !rivalTyping.active,
    );
    setText(nodes.opponentCharge,
      rivalTyping.kind === "counter"
        ? "RIVAL COUNTERING"
        : rivalTyping.kind === "objective"
          ? "RIVAL CONTESTING"
          : "RIVAL CHARGING");

    setData(nodes.root, "targetFrozen",
      view.shared.tactical.frozenTargetCount[
        view.self.playerId
      ] > 0
        ? "true"
        : "false");
  };

  const spawnShieldImpact = (
    side: "self" | "opponent",
    hullImpact: boolean,
  ): void => {
    const frame =
      side === "self"
        ? nodes.selfShipFrame
        : nodes.opponentShipFrame;
    while (frame.querySelectorAll(".duel-ship-impact").length >= 3) {
      frame.querySelector(".duel-ship-impact")?.remove();
    }
    const impact = createElement(
      "i",
      "duel-ship-impact" +
        (hullImpact ? " hull-impact" : ""),
    );
    frame.append(impact);
    impact.addEventListener(
      "animationend",
      () => impact.remove(),
      { once: true },
    );
  };

  const spawnResourceGain = (
    side: "self" | "opponent",
    kind: "shield" | "repair" | "energy",
  ): void => {
    const frame =
      side === "self"
        ? nodes.selfShipFrame
        : nodes.opponentShipFrame;
    while (
      frame.querySelectorAll(".duel-resource-gain").length >= 3
    ) {
      frame.querySelector(".duel-resource-gain")?.remove();
    }
    const pulse = createElement(
      "i",
      "duel-resource-gain duel-resource-gain-" + kind,
    );
    frame.append(pulse);
    pulse.addEventListener(
      "animationend",
      () => pulse.remove(),
      { once: true },
    );
  };

  const renderDelta = (
    previous: DuelClientMatchView | null,
    next: DuelClientMatchView,
  ): void => {
    lastDelta.self.hull = 0;
    lastDelta.self.shield = 0;
    lastDelta.opponent.hull = 0;
    lastDelta.opponent.shield = 0;
    if (
      previous === null ||
      previous.roundId !== next.roundId
    ) {
      return;
    }
    const canvas = combatVisuals.available;
    for (const side of ["self", "opponent"] as const) {
      const before = previous[side];
      const after = next[side];
      const hullLoss = Math.max(0, before.hull - after.hull);
      const shieldLoss = Math.max(0, before.shield - after.shield);
      lastDelta[side].hull = hullLoss;
      lastDelta[side].shield = shieldLoss;
      if (side === "opponent") roundStats.dealt += hullLoss + shieldLoss;
      else roundStats.taken += hullLoss + shieldLoss;
      if (hullLoss > 0 && !firstBloodDrawn && next.round.status === "active") {
        firstBloodDrawn = true;
        pendingBeats.push({ type: "first-blood", side });
        if (canvas) juice.text(side, "FIRST BLOOD!", "callout", "#ff4d5e", 0);
      }
      if (hullLoss + shieldLoss > 0) {
        if (canvas) {
          juice.damage(side, hullLoss, shieldLoss);
          if (before.shield > 0 && after.shield <= 0) {
            juice.shieldBreak(side);
            pendingBeats.push({ type: "shield-break", side });
          } else if (shieldLoss > 0 && hullLoss <= 0) {
            pendingBeats.push({ type: "shield-hit", side });
          }
        } else {
          const frame = side === "self" ? nodes.selfShipFrame : nodes.opponentShipFrame;
          while (frame.querySelectorAll(".duel-damage-number").length >= 3) frame.querySelector(".duel-damage-number")?.remove();
          const label = createElement("strong", "duel-damage-number" + (hullLoss > 0 ? " hull-hit" : ""));
          label.textContent = "−" + String(Math.round((hullLoss + shieldLoss) * 10) / 10);
          frame.append(label);
          schedulePresentation(() => label.remove(), 600);
          if (before.shield > 0 && after.shield <= 0) {
            const broken = createElement("i", "duel-shield-break");
            frame.append(broken);
            schedulePresentation(() => broken.remove(), 500);
          }
        }
      }
      // Gains: canvas text for meaningful amounts; passive regen stays quiet.
      const hullGain = Math.max(0, after.hull - before.hull);
      const shieldGain = Math.max(0, after.shield - before.shield);
      const energyGain = Math.max(0, after.energy - before.energy);
      if (canvas) {
        if (hullGain >= 3) juice.heal(side, hullGain, "repair");
        if (shieldGain >= 4) juice.heal(side, shieldGain, "shield");
        if (energyGain >= 8) juice.heal(side, energyGain, "energy");
      }
    }
    if (canvas) return;
    if (next.self.shield < previous.self.shield) {
      spawnShieldImpact("self", false);
    }
    if (next.self.hull < previous.self.hull) {
      spawnShieldImpact("self", true);
    }
    if (
      next.opponent.shield <
      previous.opponent.shield
    ) {
      spawnShieldImpact("opponent", false);
    }
    if (next.opponent.hull < previous.opponent.hull) {
      spawnShieldImpact("opponent", true);
    }

    if (next.self.shield > previous.self.shield) {
      spawnResourceGain("self", "shield");
    }
    if (next.self.hull > previous.self.hull) {
      spawnResourceGain("self", "repair");
    }
    if (next.self.energy > previous.self.energy) {
      spawnResourceGain("self", "energy");
    }
    if (next.opponent.shield > previous.opponent.shield) {
      spawnResourceGain("opponent", "shield");
    }
    if (next.opponent.hull > previous.opponent.hull) {
      spawnResourceGain("opponent", "repair");
    }
    if (next.opponent.energy > previous.opponent.energy) {
      spawnResourceGain("opponent", "energy");
    }
  };

  const renderCurrentInput = (): void => {
    if (view === null) return;
    const targetId =
      prediction.targetInstanceId ??
      view.self.targetInstanceId;
    const prefix =
      prediction.acquisitionPrefix ||
      view.self.acquisitionPrefix;

    let token = "";
    let label = "FREE TARGETING";

    if (targetId !== null) {
      const offer = view.self.offers.find(
        (candidate) => candidate.instanceId === targetId,
      );
      const threat = view.self.incomingThreats.find(
        (candidate) => candidate.id === targetId,
      );
      const objective =
        view.shared.neutralObjective?.id === targetId
          ? view.shared.neutralObjective
          : null;

      if (offer !== undefined) {
        const action = actionDefinition(offer.actionId);
        label = action?.displayLabel ?? offer.actionId;
        const blockedReason = duelAutoActionBlock(action, view.self.energy, view.self.cooldowns[offer.actionId]);
        if (blockedReason) label = blockedReason + " · Esc để đổi mục tiêu";
        token =
          offer.typingPrompt?.answerToken ??
          action?.answerToken ??
          "";
        nodes.currentInput.dataset.category =
          action?.category ?? "unknown";
      } else if (threat !== undefined) {
        label = "COUNTER · " + threat.displayLabel;
        token = threat.answerToken;
        nodes.currentInput.dataset.category = "counter";
      } else if (objective !== null) {
        label = objective.displayLabel;
        token = objective.answerToken;
        nodes.currentInput.dataset.category = "objective";
      } else {
        label = "TARGET";
        nodes.currentInput.dataset.category = "unknown";
      }
    } else {
      delete nodes.currentInput.dataset.category;
    }

    nodes.currentInput.classList.toggle(
      "hidden",
      targetId === null && prefix === "",
    );
    nodes.currentTarget.textContent = label;
    nodes.currentPrefix.replaceChildren();

    if (token === "") {
      nodes.currentPrefix.textContent =
        prefix === "" ? "_" : prefix + "_";
      nodes.root.style.setProperty(
        "--duel-typing-progress",
        prefix === "" ? "0" : "0.08",
      );
      nodes.selfShipFrame.dataset.typing =
        prefix === "" ? "false" : "true";
      return;
    }

    const progress = typedMarkup(token, prefix);
    const typed = createElement("b");
    typed.textContent = progress.typed;
    const remaining = createElement("i");
    remaining.textContent = progress.remaining;
    nodes.currentPrefix.append(typed, remaining);

    const ratio = Math.max(
      0,
      Math.min(1, progress.typed.length / Math.max(1, token.length)),
    );
    nodes.root.style.setProperty(
      "--duel-typing-progress",
      ratio.toFixed(4),
    );
    nodes.selfShipFrame.dataset.typing =
      ratio > 0 && ratio < 1 ? "true" : "false";
  };

  const renderCore = (): void => {
    if (view === null) return;
    const renderStartedAt = performance.now();
    performanceMonitor.setContext(
      quality,
      view.phase,
    );
    setData(nodes.root, "map", view.map.id);
    setData(nodes.root, "phase", view.phase);
    setData(nodes.root, "mode", view.mode);
    setData(nodes.root, "gameMode", view.gameMode);
    setData(nodes.root, "quality", quality);
    setData(nodes.root, "helpFaded", view.elapsedSeconds > 7 || view.series.roundsPlayed > 0 ? "true" : "false");

    setText(nodes.mode,
      view.gameMode === "reflex"
        ? "REFLEX DUEL"
        : view.gameMode === "word-chain"
          ? "WORD CHAIN"
          : view.mode === "ranked"
            ? "RANKED · NORMALIZED"
            : view.mode === "practice"
              ? "PRACTICE VS BOT"
              : "FRIEND DUEL");
    setText(nodes.map, view.map.displayName);
    setText(nodes.phase, phaseLabel(view.phase));
    setText(nodes.clock, formatClock(view.elapsedSeconds));
    const pendingHazard = view.shared.pendingHazards[0];
    setText(nodes.hazardWarning,
      pendingHazard === undefined
        ? "AIRSPACE CLEAR"
        : pendingHazard.hazard.hazardId
            .replaceAll("-", " ")
            .toUpperCase() +
          " · " +
          pendingHazard.remainingSeconds.toFixed(1) +
          "s");
    setData(nodes.hazardWarning, "active",
      pendingHazard === undefined ? "false" : "true");
    setText(nodes.series,
      "Bo" +
      String(view.series.format) +
      " · " +
      String(view.series.wins["player-1"]) +
      "-" +
      String(view.series.wins["player-2"]) +
      " · R" +
      String(view.series.roundsPlayed + 1));

    setResource(
      nodes.selfHullFill,
      nodes.selfHull,
      view.self.hull,
      view.self.maxHull,
    );
    setResource(
      nodes.selfShieldFill,
      nodes.selfShield,
      view.self.shield,
      view.self.maxShield,
    );
    setResource(
      nodes.selfEnergyFill,
      nodes.selfEnergy,
      view.self.energy,
      view.self.maxEnergy,
    );
    setResource(
      nodes.opponentHullFill,
      nodes.opponentHull,
      view.opponent.hull,
      view.opponent.maxHull,
    );
    setResource(
      nodes.opponentShieldFill,
      nodes.opponentShield,
      view.opponent.shield,
      view.opponent.maxShield,
    );
    setResource(
      nodes.opponentEnergyFill,
      nodes.opponentEnergy,
      view.opponent.energy,
      view.opponent.maxEnergy,
    );

    setText(nodes.selfPath, view.self.strategyPath.toUpperCase());
    setText(nodes.opponentPath, view.opponent.strategyPath.toUpperCase());
    setText(nodes.selfInitiative, String(Math.round(view.self.initiative)));
    setText(nodes.opponentInitiative, String(Math.round(view.opponent.initiative)));
    combatVisuals.setDefense("self", resourceRatio(view.self.hull, view.self.maxHull), resourceRatio(view.self.shield, view.self.maxShield));
    combatVisuals.setDefense("opponent", resourceRatio(view.opponent.hull, view.opponent.maxHull), resourceRatio(view.opponent.shield, view.opponent.maxShield));

    const terminal =
      view.series.status !== "active";
    nodes.exit.classList.toggle("hidden", !terminal);

    renderShips();
    renderOffers();
    renderThreats();
    renderObjective();
    renderStrategy();
    renderIntel();
    renderCurrentInput();
    performanceMonitor.pushUiUpdateMs(
      performance.now() - renderStartedAt,
    );
  };

  // --- Cinematic beats: FIGHT!, phase calls, K.O., result card --------------

  const phaseCall = (
    phase: DuelClientMatchView["phase"],
  ): { kicker: string; title: string } | null => {
    switch (phase) {
      case "skirmish":
        return { kicker: "PHASE 2", title: "SKIRMISH" };
      case "war":
        return { kicker: "PHASE 3 · FIREPOWER UP", title: "ALL-OUT WAR" };
      case "crisis":
        return { kicker: "PHASE 4 · HAZARDS RISING", title: "CRISIS" };
      case "cataclysm":
        return { kicker: "FINAL PHASE · FINISH IT", title: "CATACLYSM" };
      default:
        return null;
    }
  };

  const showStamp = (
    title: string,
    kicker: string,
    tone: "fight" | "ko" | "phase" | "ready" | "time",
    durationMs: number,
  ): void => {
    nodes.cinematic.querySelectorAll(".duel-stamp").forEach((node) => node.remove());
    const stamp = createElement("div", "duel-stamp duel-stamp-" + tone);
    stamp.style.setProperty("--duel-stamp-duration", String(durationMs) + "ms");
    if (kicker !== "") {
      const small = createElement("small");
      small.textContent = kicker;
      stamp.append(small);
    }
    const strong = createElement("strong");
    strong.textContent = title;
    strong.dataset.text = title;
    stamp.append(strong);
    nodes.cinematic.append(stamp);
    stamp.addEventListener("animationend", (event) => {
      if (event.target === stamp) stamp.remove();
    });
  };

  const clearCinematic = (): void => {
    nodes.cinematic.replaceChildren();
    nodes.root.dataset.cinematic = "none";
  };

  const showResult = (
    outcome: "victory" | "defeat" | "draw",
    seriesOver: boolean,
  ): void => {
    if (view === null) return;
    nodes.cinematic.querySelectorAll(".duel-result").forEach((node) => node.remove());
    const selfWins = view.series.wins[view.self.playerId];
    const opponentWins = view.series.wins[view.self.playerId === "player-1" ? "player-2" : "player-1"];
    const typed = view.self.correctChars + view.self.wrongChars;
    const accuracy = typed > 0 ? Math.round((view.self.correctChars / typed) * 100) : 100;
    const panel = createElement("section", "duel-result duel-result-" + outcome + (seriesOver ? " duel-result-final" : ""));
    const kicker = createElement("small", "duel-result-kicker");
    kicker.textContent = seriesOver ? "MATCH OVER" : "ROUND " + String(view.series.roundsPlayed);
    const title = createElement("strong", "duel-result-title");
    const word = outcome === "victory" ? "VICTORY" : outcome === "defeat" ? "DEFEAT" : "DRAW";
    title.textContent = seriesOver && outcome !== "draw" ? "MATCH " + word : word;
    title.dataset.text = title.textContent;
    const score = createElement("div", "duel-result-score");
    score.innerHTML = "<span>YOU</span><b></b><span>RIVAL</span>";
    score.querySelector("b")!.textContent = String(selfWins) + " — " + String(opponentWins);
    const stats = createElement("div", "duel-result-stats");
    const stat = (label: string, value: string): void => {
      const cell = createElement("div");
      const strong = createElement("strong");
      strong.textContent = value;
      const small = createElement("small");
      small.textContent = label;
      cell.append(strong, small);
      stats.append(cell);
    };
    stat("BEST STREAK", "×" + String(momentum.best));
    stat("ACCURACY", String(accuracy) + "%");
    stat("DAMAGE DEALT", String(Math.round(roundStats.dealt)));
    stat("DAMAGE TAKEN", String(Math.round(roundStats.taken)));
    const footer = createElement("div", "duel-result-footer");
    if (seriesOver) {
      const back = createElement("button", "duel-result-exit");
      back.type = "button";
      back.textContent = "Return to Lobby";
      back.addEventListener("click", () => {
        controller.hide();
        hooks.onExit?.();
      });
      footer.append(back);
    } else {
      footer.textContent = "ROUND " + String(view.series.roundsPlayed + 1) + " · STAND BY";
    }
    panel.append(kicker, title, score, stats, footer);
    nodes.cinematic.append(panel);
    nodes.root.dataset.cinematic = "result";
  };

  const startKnockout = (
    result: Extract<DuelClientEvent, { type: "round-ended" }>["result"],
  ): void => {
    if (view === null || knockoutRoundId === view.roundId) return;
    knockoutRoundId = view.roundId;
    const selfId = view.self.playerId;
    const now = performance.now();
    const losers: Array<"self" | "opponent"> =
      result.status === "won"
        ? [result.winnerId === selfId ? "opponent" : "self"]
        : [
            ...(view.self.hull <= 0 ? (["self"] as const) : []),
            ...(view.opponent.hull <= 0 ? (["opponent"] as const) : []),
          ];
    const outcome = result.status === "draw" ? "draw" : result.winnerId === selfId ? "victory" : "defeat";
    const seriesOver = view.series.status !== "active";
    nodes.root.dataset.cinematic = "ko";
    nodes.root.dataset.outcome = outcome;
    if (combatVisuals.available) {
      combatVisuals.releaseShots();
      for (const side of losers) juice.knockout(side, now);
    } else {
      for (const side of losers) spawnProjectileArrival(side, "bomb");
    }
    showStamp(losers.length > 0 ? "K.O." : "TIME!", losers.length > 0 ? "" : "DRAW", losers.length > 0 ? "ko" : "time", 1250);
    schedulePresentation(() => {
      if (outcome === "victory") juice.celebrate("self");
      if (outcome === "defeat") juice.celebrate("opponent");
      showResult(outcome, seriesOver);
    }, DUEL_KO_TIMELINE.bannerMs);
    if (!seriesOver) {
      schedulePresentation(() => {
        nodes.cinematic.querySelectorAll(".duel-result").forEach((node) => node.classList.add("leaving"));
        showStamp("GET READY", "ROUND " + String((view?.series.roundsPlayed ?? 0) + 1), "ready", 1300);
      }, DUEL_KO_TIMELINE.readyMs);
    }
  };

  const startRound = (roundNumber: number): void => {
    clearCinematic();
    // The next observed view sets the baseline; no spurious streak.
    momentum.reset(null);
    roundStats.dealt = 0;
    roundStats.taken = 0;
    firstBloodDrawn = false;
    multiKill.count = 0;
    multiKill.lastAt = -Infinity;
    knockoutRoundId = null;
    lastPhase = view?.phase ?? null;
    juice.respawn();
    showStamp("FIGHT!", "ROUND " + String(roundNumber), "fight", 950);
    pendingBeats.push({ type: "round-start", round: roundNumber });
  };

  /** One impact on a ship without a tracked bolt (threat results, fallbacks). */
  const impactShip = (side: "self" | "opponent", kind: DuelHitKind): void => {
    if (!combatVisuals.available) {
      spawnProjectileArrival(side, kind === "bomb" ? "bomb" : "lance");
      return;
    }
    const point = combatVisuals.shipPoint(side);
    const horizontal = combatVisuals.isHorizontal;
    const heading = side === "opponent" ? (horizontal ? 0 : -Math.PI / 2) : (horizontal ? Math.PI : Math.PI / 2);
    juice.hit(side, kind, point.x, point.y, heading, lastDelta[side].hull <= 0 && lastDelta[side].shield > 0);
  };

  /** Shield or hull for a confirmed bolt, from this update's damage. */
  const shieldedHit = (side: "self" | "opponent"): boolean | undefined => {
    if (lastDelta[side].hull > 0) return false;
    if (lastDelta[side].shield > 0) return true;
    return undefined;
  };

  const appendFeed = (
    events: readonly DuelClientEvent[],
  ): void => {
    for (const event of events) {
      if (event.type === "cannon-fired" || event.type === "cannon-hit") {
        const key = event.type + ":" + event.shotId;
        if (presentedCannonEvents.has(key)) continue;
        presentedCannonEvents.add(key);
        if (presentedCannonEvents.size > 512) {
          presentedCannonEvents.delete(presentedCannonEvents.values().next().value!);
        }
      }
      const line = createElement("div", "duel-feed-item");
      line.dataset.eventType = event.type;
      line.textContent = eventLabel(event);
      nodes.eventFeed.prepend(line);

      while (
        nodes.eventFeed.childElementCount >
        MAX_FEED_ITEMS
      ) {
        nodes.eventFeed.lastElementChild?.remove();
      }

      const kind = fxKind(event);
      if (kind !== null) spawnFx(kind);
      spawnProjectileForEvent(event);
      if (event.type === "round-ended") startKnockout(event.result);
      if (event.type === "action-completed" && event.playerId === view?.self.playerId) {
        const point = removedOfferPoints.get(event.targetInstanceId);
        if (point !== undefined) {
          removedOfferPoints.delete(event.targetInstanceId);
          juice.collect(point.x, point.y, point.rgb);
        }
      }
    }
  };

  type ProjectileVariant =
    | "standard"
    | "laser"
    | "missile"
    | "railgun"
    | "bomb"
    | "lance"
    | "heavy"
    | "combo";

  const projectileVariantFor = (
    effectId: string | undefined,
  ): ProjectileVariant => {
    switch (effectId) {
      case "rapid-laser":
        return "laser";
      case "guided-missile":
        return "missile";
      case "heavy-railgun":
        return "railgun";
      case "delayed-bomb":
        return "bomb";
      case "siege-lance":
        return "lance";
      default:
        return "standard";
    }
  };

  const spawnTypingFeedback = (): void => {
    while (
      nodes.typingFx.childElementCount >=
      MAX_TYPING_FX_NODES
    ) {
      nodes.typingFx.firstElementChild?.remove();
    }
    const bolt = createElement("i", "duel-typing-bolt");
    const jitter = 48 + ((projectileSequence * 7) % 5);
    bolt.style.setProperty(
      "--duel-typing-x",
      String(jitter) + "%",
    );
    nodes.typingFx.append(bolt);
    bolt.addEventListener(
      "animationend",
      () => bolt.remove(),
      { once: true },
    );

    const impact = createElement("i", "duel-typing-impact");
    nodes.currentInput.append(impact);
    impact.addEventListener(
      "animationend",
      () => impact.remove(),
      { once: true },
    );
    // The transient impact node provides the key feedback. Avoid forcing
    // synchronous layout solely to restart a CSS class animation.
  };

  const spawnTacticalActionFx = (
    sourcePlayerId: DuelPlayerId,
    effectId: string,
  ): boolean => {
    if (view === null) return false;
    const fromSelf = sourcePlayerId === view.self.playerId;
    const targetFrame = fromSelf
      ? nodes.opponentShipFrame
      : nodes.selfShipFrame;

    if (effectId === "lock-on" || effectId === "scan") {
      const reticle = createElement(
        "i",
        "duel-tactical-reticle duel-tactical-" + effectId,
      );
      targetFrame.append(reticle);
      reticle.addEventListener(
        "animationend",
        () => reticle.remove(),
        { once: true },
      );
      return true;
    }

    if (
      effectId === "gravity-well" ||
      effectId === "disrupt" ||
      effectId === "amplify-field"
    ) {
      while (
        nodes.fx.querySelectorAll(".duel-tactical-field").length >= 3
      ) {
        nodes.fx.querySelector(".duel-tactical-field")?.remove();
      }
      const field = createElement(
        "i",
        "duel-tactical-field duel-tactical-" + effectId,
      );
      field.dataset.fromSelf = fromSelf ? "true" : "false";
      appendTransientFx(field);
      field.addEventListener(
        "animationend",
        () => field.remove(),
        { once: true },
      );
      return true;
    }

    return false;
  };

  const spawnShipActionFx = (
    sourcePlayerId: DuelPlayerId,
    effectId: string | undefined,
  ): void => {
    if (view === null) return;
    const frame =
      sourcePlayerId === view.self.playerId
        ? nodes.selfShipFrame
        : nodes.opponentShipFrame;
    let kind = "tactical";
    if (
      effectId === "shield-charge" ||
      effectId === "reflect-guard" ||
      effectId === "barrier-charge"
    ) {
      kind = "shield";
    } else if (
      effectId === "hull-repair" ||
      effectId === "repair-drone-charge"
    ) {
      kind = "repair";
    } else if (
      effectId === "energy-gain" ||
      effectId === "amplify-field"
    ) {
      kind = "energy";
    }
    const pulse = createElement(
      "i",
      "duel-ship-action-fx duel-ship-action-" + kind,
    );
    frame.append(pulse);
    pulse.addEventListener(
      "animationend",
      () => pulse.remove(),
      { once: true },
    );
  };

  const paintedBackground = (
    id: CombatVfxId,
  ): string | null => {
    const url = combatVfxUrl(id);
    return url === null ? null : 'url("' + url + '")';
  };

  const spawnMapBlast = (
    side: "self" | "opponent",
    variant: ProjectileVariant,
  ): void => {
    if (
      variant !== "bomb" &&
      variant !== "combo" &&
      variant !== "lance" &&
      variant !== "heavy"
    ) {
      return;
    }

    const blastArt =
      variant === "bomb"
        ? paintedBackground("bomb-impact")
        : paintedBackground("explosion-wide");
    const shockwaveArt = paintedBackground("shockwave-ring");
    if (blastArt === null && shockwaveArt === null) return;

    while (
      nodes.fx.querySelectorAll(".duel-map-painted-blast").length >= 5
    ) {
      nodes.fx
        .querySelector(".duel-map-painted-blast")
        ?.remove();
    }

    const blast = createElement(
      "i",
      "duel-map-painted-blast duel-map-painted-blast-" + side,
    );
    if (blastArt !== null) {
      blast.style.backgroundImage = blastArt;
    }
    appendTransientFx(blast);
    blast.addEventListener(
      "animationend",
      () => blast.remove(),
      { once: true },
    );

    if (shockwaveArt !== null) {
      const shockwave = createElement(
        "i",
        "duel-map-painted-shockwave duel-map-painted-blast-" + side,
      );
      shockwave.style.backgroundImage = shockwaveArt;
      appendTransientFx(shockwave);
      shockwave.addEventListener(
        "animationend",
        () => shockwave.remove(),
        { once: true },
      );
    }

    if (quality === "high" || quality === "ultra") {
      const secondaryArt = paintedBackground("explosion-core");
      const count = quality === "ultra" ? 2 : 1;
      if (secondaryArt !== null) {
        for (let index = 0; index < count; index += 1) {
          const secondary = createElement(
            "i",
            "duel-map-secondary-explosion duel-map-painted-blast-" + side,
          );
          secondary.style.backgroundImage = secondaryArt;
          secondary.style.setProperty(
            "--duel-secondary-x",
            String(36 + ((projectileSequence * 17 + index * 29) % 29)) + "%",
          );
          secondary.style.setProperty(
            "--duel-secondary-delay",
            String(110 + index * 90) + "ms",
          );
          appendTransientFx(secondary);
          secondary.addEventListener(
            "animationend",
            () => secondary.remove(),
            { once: true },
          );
        }
      }
    }
  };

  const spawnPrecisionActivation = (
    sourcePlayerId: DuelPlayerId,
    intensity: number,
  ): void => {
    if (view === null) return;
    const art = paintedBackground("precision-burst");
    if (art === null) return;
    const frame =
      sourcePlayerId === view.self.playerId
        ? nodes.selfShipFrame
        : nodes.opponentShipFrame;
    const flare = createElement(
      "i",
      "duel-precision-painted-burst",
    );
    flare.style.backgroundImage = art;
    flare.style.setProperty(
      "--duel-precision-scale",
      (0.9 + Math.max(0, intensity) * 0.14).toFixed(2),
    );
    frame.append(flare);
    flare.addEventListener(
      "animationend",
      () => flare.remove(),
      { once: true },
    );
  };

  const spawnProjectileArrival = (
    side: "self" | "opponent",
    variant: ProjectileVariant,
  ): void => {
    const frame =
      side === "self"
        ? nodes.selfShipFrame
        : nodes.opponentShipFrame;
    while (
      frame.querySelectorAll(".duel-projectile-arrival").length >= 3
    ) {
      frame.querySelector(".duel-projectile-arrival")?.remove();
    }
    const impact = createElement(
      "i",
      "duel-projectile-arrival duel-projectile-arrival-" + variant,
    );
    const impactArt =
      variant === "bomb"
        ? paintedBackground("bomb-impact")
        : paintedBackground("explosion-core");
    if (impactArt !== null && variant !== "laser" && variant !== "standard") {
      impact.classList.add("duel-projectile-arrival-painted");
      impact.style.backgroundImage = impactArt;
    }
    frame.append(impact);
    spawnMapBlast(side, variant);
    impact.addEventListener(
      "animationend",
      () => impact.remove(),
      { once: true },
    );
  };

  const clearThreatTelegraph = (threatId: string): void => {
    nodes.projectiles
      .querySelectorAll<HTMLElement>(".duel-threat-telegraph")
      .forEach((node) => {
        if (node.dataset.threatId === threatId) node.remove();
      });
  };

  const spawnThreatTelegraph = (
    threat: Extract<
      DuelClientEvent,
      { type: "threat-created" }
    >["threat"],
  ): void => {
    if (view === null) return;
    clearThreatTelegraph(threat.id);
    const fromSelf =
      threat.sourcePlayerId === view.self.playerId;
    const telegraph = createElement(
      "i",
      "duel-threat-telegraph " +
        (fromSelf
          ? "duel-threat-telegraph-from-self"
          : "duel-threat-telegraph-from-opponent"),
    );
    telegraph.dataset.threatId = threat.id;
    telegraph.style.setProperty(
      "--duel-threat-window",
      Math.max(0.2, threat.remainingSeconds).toFixed(2) + "s",
    );
    nodes.projectiles.append(telegraph);
  };

  const spawnThreatIntercept = (
    threatId: string,
    targetPlayerId: DuelPlayerId,
  ): void => {
    if (view === null) return;
    clearThreatTelegraph(threatId);
    const intercept = createElement(
      "i",
      "duel-threat-intercept " +
        (targetPlayerId === view.self.playerId
          ? "duel-threat-intercept-self"
          : "duel-threat-intercept-opponent"),
    );
    nodes.projectiles.append(intercept);
    intercept.addEventListener(
      "animationend",
      () => intercept.remove(),
      { once: true },
    );
  };

  const spawnProjectile = (
    sourcePlayerId: DuelPlayerId,
    variant: ProjectileVariant,
    cannon?: { shotId: string; travelMs: number },
  ): void => {
    if (view === null) return;
    while (
      nodes.projectiles.childElementCount >=
      MAX_PROJECTILE_NODES
    ) {
      nodes.projectiles.firstElementChild?.remove();
    }

    projectileSequence += 1;
    const fromSelf =
      sourcePlayerId === view.self.playerId;
    const sourceCharacter = fromSelf
      ? characterId(
          view.appearance.selfCharacterId,
          SHIP_FALLBACKS.self,
        )
      : characterId(
          view.appearance.opponentCharacterId,
          SHIP_FALLBACKS.opponent,
        );
    const projectileProfile =
      playerProjectileProfile(sourceCharacter);
    const speedScale = Math.max(
      0.5,
      view.shared.tactical.projectileSpeedScale[
        sourcePlayerId
      ] ?? 1,
    );
    if (combatVisuals.fire(
      fromSelf ? "self" : "opponent",
      cannon?.travelMs ?? duelProjectileTravelMs(speedScale), variant, cannon?.shotId,
    )) return;
    const projectile = createElement(
      "i",
      "duel-projectile " +
        (fromSelf
          ? "duel-projectile-from-self "
          : "duel-projectile-from-opponent ") +
        "duel-projectile-" +
        variant,
    );
    const lane =
      45 + ((projectileSequence * 13) % 11);
    projectile.style.setProperty(
      "--duel-projectile-x",
      String(lane) + "%",
    );
    const travelMs = cannon?.travelMs ?? duelProjectileTravelMs(speedScale);
    projectile.style.setProperty(
      "--duel-projectile-duration",
      String(travelMs) + "ms",
    );
    projectile.style.setProperty(
      "--duel-shot-primary",
      fromSelf ? "#51dcff" : "#ff7852",
    );
    projectile.style.setProperty(
      "--duel-shot-secondary",
      fromSelf ? "#e9fcff" : "#fff0cc",
    );
    projectile.style.setProperty(
      "--duel-shot-width",
      projectileProfile.width.toFixed(2),
    );
    projectile.style.setProperty(
      "--duel-shot-glow",
      projectileProfile.glow.toFixed(2),
    );
    projectile.dataset.archetype =
      projectileProfile.archetype;
    if (cannon !== undefined) projectile.dataset.shotId = cannon.shotId;
    nodes.projectiles.append(projectile);
    // Compute real muzzle/target coordinates, rather than guessing with vh.
    const source = fromSelf ? nodes.selfShipFrame : nodes.opponentShipFrame;
    const destination = fromSelf ? nodes.opponentShipFrame : nodes.selfShipFrame;
    const bounds = nodes.projectiles.getBoundingClientRect();
    const start = source.getBoundingClientRect();
    const end = destination.getBoundingClientRect();
    const sx = start.left + start.width / 2 - bounds.left + (projectileSequence % 2 === 0 ? -9 : 9);
    const sy = start.top + start.height / 2 - bounds.top;
    const dx = end.left + end.width / 2 - bounds.left - sx;
    const dy = end.top + end.height / 2 - bounds.top - sy;
    projectile.style.animation = "none";
    projectile.style.left = String(sx) + "px";
    projectile.style.top = String(sy) + "px";
    projectile.style.bottom = "auto";
    const angle = Math.atan2(dx, -dy) * 180 / Math.PI;
    const rotation = " rotate(" + String(angle) + "deg)";
    const flight = projectile.animate([
      { transform: "translate(-50%, -50%)" + rotation, opacity: 1 },
      { transform: "translate(calc(-50% + " + String(dx) + "px), calc(-50% + " + String(dy) + "px))" + rotation, opacity: 1 },
    ], { duration: travelMs, easing: "linear", fill: "forwards" });
    presentationAnimations.add(flight);
    flight.onfinish = () => {
      if (cannon === undefined && active && projectile.isConnected) spawnProjectileArrival(fromSelf ? "opponent" : "self", variant);
      projectile.remove();
      presentationAnimations.delete(flight);
      flight.cancel();
    };
    schedulePresentation(
      () => {
        projectile.remove();
        presentationAnimations.delete(flight);
        flight.cancel();
      },
      travelMs + 200,
    );
    projectile.addEventListener(
      "animationend",
      () => projectile.remove(),
      { once: true },
    );
  };

  const presentAction = (
    sourcePlayerId: DuelPlayerId,
    actionId: string,
    fallbackVariant: ProjectileVariant = "standard",
  ): void => {
    const action = actionDefinition(actionId);
    if (action === undefined) {
      spawnProjectile(sourcePlayerId, fallbackVariant);
      return;
    }
    if (action.category === "attack") {
      spawnProjectile(
        sourcePlayerId,
        projectileVariantFor(action.effectId),
      );
      return;
    }
    if (spawnTacticalActionFx(sourcePlayerId, action.effectId)) {
      return;
    }
    spawnShipActionFx(sourcePlayerId, action.effectId);
  };

  const spawnProjectileForEvent = (
    event: DuelClientEvent,
  ): void => {
    const source = eventSourcePlayer(event);
    if (source === null) return;

    if (event.type === "cannon-fired") {
      // A twin-barrel burst is one authoritative shot, not twice the damage.
      spawnProjectile(source, "laser", event);
      spawnProjectile(source, "laser", event);
      if (combatVisuals.available) return;
      const muzzle = createElement("i", "duel-muzzle-flash");
      const frame = source === view?.self.playerId ? nodes.selfShipFrame : nodes.opponentShipFrame;
      frame.append(muzzle);
      schedulePresentation(() => muzzle.remove(), 110);
      return;
    }
    if (event.type === "cannon-hit") {
      const target = event.targetPlayerId === view?.self.playerId ? "self" : "opponent";
      if (combatVisuals.hit(event.shotId, shieldedHit(target))) return;
      for (const shot of nodes.projectiles.querySelectorAll<HTMLElement>("[data-shot-id]")) {
        if (shot.dataset.shotId === event.shotId) shot.remove();
      }
      spawnProjectileArrival(event.targetPlayerId === view?.self.playerId ? "self" : "opponent", "laser");
      return;
    }

    if (event.type === "action-fired") {
      presentAction(source, event.actionId);
      if (source === view?.self.playerId && actionDefinition(event.actionId)?.category === "attack") {
        schedulePresentation(registerAttackHit, duelProjectileTravelMs(view.shared.tactical.projectileSpeedScale[source] ?? 1));
      }
      return;
    }

    if (event.type === "stored-action-used") {
      presentAction(source, event.actionId, "heavy");
      return;
    }

    if (event.type === "threat-created") {
      spawnThreatTelegraph(event.threat);
      // SIEGE LANCE: the crystal spear charges at the shooter's nose.
      combatVisuals.lanceCharge(event.threat.sourcePlayerId === view?.self.playerId ? "self" : "opponent", event.threat.id, event.threat.remainingSeconds);
      return;
    }

    if (event.type === "threat-countered") {
      combatVisuals.lanceBreak(event.threatId);
      spawnThreatIntercept(
        event.threatId,
        event.targetPlayerId,
      );
      return;
    }

    if (event.type === "threat-resolved") {
      combatVisuals.lanceStrike(event.threatId);
      clearThreatTelegraph(event.threatId);
      impactShip(event.targetPlayerId === view?.self.playerId ? "self" : "opponent", "lance");
      return;
    }

    if (event.type === "precision-firepower") {
      spawnPrecisionActivation(
        event.playerId,
        event.accuracyTier,
      );
      return;
    }

    if (event.type === "precision-firepower-fired") {
      if (event.playerId === view?.self.playerId) {
        schedulePresentation(registerAttackHit, duelProjectileTravelMs(view.shared.tactical.projectileSpeedScale[event.playerId] ?? 1));
      }
      spawnPrecisionActivation(
        event.playerId,
        event.accuracyTier,
      );
      const variant: ProjectileVariant =
        event.ordnance === "laser-burst"
          ? "laser"
          : event.ordnance === "micro-missile" ||
              event.ordnance === "missile-salvo"
            ? "missile"
            : event.ordnance === "heavy-bomb"
              ? "bomb"
              : "combo";
      const count =
        event.ordnance === "missile-salvo"
          ? 2 + Math.min(2, event.accuracyTier)
          : event.ordnance === "precision-barrage" ||
              event.ordnance === "major-ordnance"
            ? 2 + Math.min(3, event.accuracyTier)
            : 1;
      for (let index = 0; index < count; index += 1) {
        spawnProjectile(event.playerId, variant);
      }
      return;
    }

    if (event.type === "combo-used") {
      if (
        event.comboId === "homing-barrage" ||
        event.comboId === "gravity-bomb" ||
        event.comboId === "overcharged-railgun"
      ) {
        spawnProjectile(source, "combo");
      } else {
        spawnShipActionFx(source, "combo");
      }
    }
  };

  const spawnFx = (kind: string): void => {
    while (nodes.fx.childElementCount >= MAX_FX_NODES) {
      nodes.fx.firstElementChild?.remove();
    }

    fxSequence += 1;
    const burst = createElement(
      "i",
      "duel-fx-burst duel-fx-" + kind,
    );
    burst.style.setProperty(
      "--duel-fx-x",
      String(22 + ((fxSequence * 29) % 56)) + "%",
    );
    burst.style.setProperty(
      "--duel-fx-y",
      String(20 + ((fxSequence * 19) % 50)) + "%",
    );
    appendTransientFx(burst);
    burst.addEventListener(
      "animationend",
      () => burst.remove(),
      { once: true },
    );

    if (
      quality === "high" ||
      quality === "ultra"
    ) {
      const secondaryCount =
        quality === "ultra" ? 4 : 2;
      for (
        let index = 0;
        index < secondaryCount;
        index += 1
      ) {
        if (
          nodes.fx.childElementCount >= MAX_FX_NODES
        ) {
          break;
        }
        const spark = createElement(
          "i",
          "duel-fx-spark duel-fx-" + kind,
        );
        spark.style.setProperty(
          "--duel-fx-x",
          String(
            20 +
              ((fxSequence * 23 + index * 13) % 60),
          ) + "%",
        );
        spark.style.setProperty(
          "--duel-fx-y",
          String(
            22 +
              ((fxSequence * 17 + index * 11) % 48),
          ) + "%",
        );
        spark.style.setProperty(
          "--duel-fx-delay",
          String(index * 55) + "ms",
        );
        appendTransientFx(spark);
        spark.addEventListener(
          "animationend",
          () => spark.remove(),
          { once: true },
        );
      }
    }
  };

  const maybeSpawnTypingFeedback = (
    roundId: string | null,
    targetId: string | null,
    prefix: string,
    previousPrefixLength: number,
  ): void => {
    if (
      !active ||
      prefix.length <= previousPrefixLength ||
      prefix.length === 0
    ) {
      return;
    }
    const key =
      String(roundId ?? "") +
      "|" +
      String(targetId ?? "free") +
      "|" +
      prefix;
    if (key === lastTypingFeedbackKey) return;
    lastTypingFeedbackKey = key;
    if (!combatVisuals.available) {
      spawnTypingFeedback();
      return;
    }
    // A short punch on the input readout per accepted key. WAAPI on the
    // individual `scale` property: compositor-only, no forced layout.
    if (typeof nodes.currentInput.animate === "function") {
      nodes.currentInput.animate(
        [{ scale: "1.07" }, { scale: "1" }],
        { duration: 110, easing: "cubic-bezier(.2,.9,.3,1)" },
      );
    }
  };

  const observeMomentum = (next: DuelClientMatchView): void => {
    if (next.round.status !== "active") return;
    for (const event of momentum.observe(next.roundId, next.self.correctChars, next.self.wrongChars)) {
      pendingBeats.push({ type: "momentum", event });
      if (event.type === "tier-up") juice.momentumBurst(event.tier);
      if (event.type === "break") juice.momentumLost(event.lost);
    }
    combatVisuals.setMomentum(momentum.streak, momentum.tier, momentum.heat);
    const tier = DUEL_MOMENTUM_TIERS[momentum.tier]!;
    setData(nodes.root, "momentum", String(momentum.tier));
    setVar(nodes.root, "--duel-momentum-color", tier.color);
  };

  const observePhase = (next: DuelClientMatchView): void => {
    if (lastPhase === null) {
      lastPhase = next.phase;
      return;
    }
    if (next.phase === lastPhase) return;
    lastPhase = next.phase;
    if (next.round.status !== "active") return;
    const call = phaseCall(next.phase);
    if (call === null) return;
    showStamp(call.title, call.kicker, "phase", 1700);
    pendingBeats.push({ type: "phase", phase: next.phase });
    if (next.phase === "cataclysm") juice.screenFlash("#ff5a3d", 0.22);
  };

  const stopPerformanceLoop = (): void => {
    if (performanceFrame !== null) {
      cancelAnimationFrame(performanceFrame);
      performanceFrame = null;
    }
    lastPerformanceFrameAt = null;
  };

  const startPerformanceLoop = (): void => {
    if (performanceFrame !== null) return;
    const frame = (now: number): void => {
      if (!active) {
        stopPerformanceLoop();
        return;
      }
      if (lastPerformanceFrameAt !== null) {
        performanceMonitor.pushFrameMs(
          Math.min(
            250,
            Math.max(0, now - lastPerformanceFrameAt),
          ),
        );
      }
      lastPerformanceFrameAt = now;
      if (!combatVisuals.external) combatVisuals.render(now, quality);
      performanceMonitor.setContext(
        quality,
        view?.phase ?? null,
      );
      performanceMonitor.setLiveCounts(
        nodes.projectiles.childElementCount + combatVisuals.activeShots,
        nodes.fx.childElementCount,
      );
      performanceFrame = requestAnimationFrame(frame);
    };
    performanceFrame = requestAnimationFrame(frame);
  };

  const measureInputPaint = (
    startedAt: number,
    sequence: number | null,
  ): void => {
    if (sequence === null) return;
    requestAnimationFrame(() => {
      performanceMonitor.pushInputPaintMs(
        Math.max(0, performance.now() - startedAt),
      );
    });
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!active || view === null) return;
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return;
    }

    // Between rounds (K.O. and result) the authority ignores input anyway.
    if (view.round.status !== "active") return;

    // Reflex and Word Chain own their keyboard contract. The separate
    // alternative overlay feeds MODE_INPUT; never leak those keys into the
    // Standard target/action intent path.
    if (view.gameMode !== "standard") return;

    // No manual item hotkeys: completion itself activates the effect.
    if (event.key === "Escape") {
      const targetId =
        prediction.targetInstanceId ??
        view.self.targetInstanceId;
      if (targetId !== null) {
        event.preventDefault();
        const startedAt = performance.now();
        const sequence = hooks.sendIntent({
          type: "CANCEL_TARGET",
          targetInstanceId: targetId,
        });
        measureInputPaint(startedAt, sequence);
      }
      return;
    }

    const char = duelCharacterFromKeyboardInput({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      isComposing: event.isComposing,
      repeat: event.repeat,
    });
    if (char === null) return;

    event.preventDefault();
    const startedAt = performance.now();
    const sequence = hooks.sendIntent({
      type: "TYPE_CHAR",
      char,
      ...((prediction.targetInstanceId ??
        view.self.targetInstanceId) === null
        ? {}
        : {
            targetInstanceId:
              prediction.targetInstanceId ??
              view.self.targetInstanceId ??
              undefined,
          }),
    });
    measureInputPaint(startedAt, sequence);
  };

  document.addEventListener(
    "keydown",
    handleKeyDown,
    true,
  );

  nodes.root
    .querySelectorAll<HTMLButtonElement>(
      "[data-duel-skill]",
    )
    .forEach((tool) => {
      tool.addEventListener("click", () => {
        const skillId = tool.dataset.duelSkill;
        if (skillId === undefined) return;
        hooks.sendIntent({
          type: "ACTIVATE_SKILL",
          skillId,
        });
      });
    });

  nodes.exit.addEventListener("click", () => {
    controller.hide();
    hooks.onExit?.();
  });

  const controller: DuelBattleUiController = {
    show(nextView, events = []) {
      view = nextView;
      active = true;
      hooks.onCombatRenderer?.(
        (context, time, width, height) => combatVisuals.render(time * 1000, quality, context, { width, height }),
        () => combatVisuals.camera(),
      );
      void applyPaintedCombatVfx();
      void applyPaintedTargetArt();
      gameShell.classList.add(
        "duel-battle-active",
      );
      nodes.root.classList.remove("hidden");
      updateLayout();
      prediction = {
        roundId: nextView.roundId,
        targetInstanceId:
          nextView.self.targetInstanceId,
        acquisitionPrefix:
          nextView.self.acquisitionPrefix,
        pendingSequences: [],
      };
      performanceMonitor.reset();
      combatVisuals.clear();
      pendingBeats = [];
      startRound(nextView.series.roundsPlayed + 1);
      momentum.observe(nextView.roundId, nextView.self.correctChars, nextView.self.wrongChars);
      renderCore();
      appendFeed(events);
      hooks.onPresentationState?.(
        nextView,
        events,
        pendingBeats,
      );
      startPerformanceLoop();
    },
    update(nextView, events = []) {
      if (!active) {
        controller.show(nextView, events);
        return;
      }
      const previousView = view;
      const roundChanged =
        view?.roundId !== nextView.roundId;
      if (!roundChanged && previousView !== null) {
        maybeSpawnTypingFeedback(
          nextView.roundId,
          nextView.self.targetInstanceId,
          nextView.self.acquisitionPrefix,
          previousView.self.acquisitionPrefix.length,
        );
      }
      view = nextView;
      pendingBeats = deferredBeats;
      deferredBeats = [];
      if (roundChanged) {
        prediction = {
          roundId: nextView.roundId,
          targetInstanceId:
            nextView.self.targetInstanceId,
          acquisitionPrefix:
            nextView.self.acquisitionPrefix,
          pendingSequences: [],
        };
        clearPresentationTimers();
        nodes.eventFeed.replaceChildren();
        nodes.projectiles.replaceChildren();
        nodes.typingFx.replaceChildren();
        lastTypingFeedbackKey = "";
        startRound(nextView.series.roundsPlayed + 1);
      }
      renderCore();
      renderDelta(previousView, nextView);
      observeMomentum(nextView);
      observePhase(nextView);
      appendFeed(events);
      hooks.onPresentationState?.(
        nextView,
        events,
        pendingBeats,
      );
    },
    setPrediction(nextPrediction) {
      const previousPrefixLength =
        prediction.roundId === nextPrediction.roundId
          ? prediction.acquisitionPrefix.length
          : 0;
      maybeSpawnTypingFeedback(
        nextPrediction.roundId,
        nextPrediction.targetInstanceId,
        nextPrediction.acquisitionPrefix,
        previousPrefixLength,
      );
      prediction = {
        ...nextPrediction,
        pendingSequences: [
          ...nextPrediction.pendingSequences,
        ],
      };
      if (active) {
        const renderStartedAt = performance.now();
        renderOffers();
        renderThreats();
        renderObjective();
        renderCurrentInput();
        performanceMonitor.pushUiUpdateMs(
          performance.now() - renderStartedAt,
        );
      }
    },
    preload(nextQuality, self, rival) {
      combatVisuals.preload(nextQuality, self, rival);
    },
    setQuality(nextQuality) {
      quality = nextQuality;
      setData(nodes.root, "quality", quality);
      performanceMonitor.setContext(
        quality,
        view?.phase ?? null,
      );
    },
    getPerformanceDiagnostics() {
      performanceMonitor.setLiveCounts(
        nodes.projectiles.childElementCount + combatVisuals.activeShots,
        nodes.fx.childElementCount,
      );
      return performanceMonitor.diagnostics();
    },
    resetPerformanceDiagnostics() {
      performanceMonitor.reset();
      performanceMonitor.setContext(
        quality,
        view?.phase ?? null,
      );
    },
    hide() {
      active = false;
      setShip3DCalm(true);
      hooks.onCombatRenderer?.(null);
      paintedVfxGeneration += 1;
      clearPresentationTimers();
      stopPerformanceLoop();
      nodes.root.classList.add("hidden");
      gameShell.classList.remove(
        "duel-battle-active",
      );
      nodes.fx.replaceChildren();
      nodes.projectiles.replaceChildren();
      nodes.typingFx.replaceChildren();
      nodes.offers.replaceChildren();
      offerTargetNodes.clear();
      offerLayoutAssignments.clear();
      lastTypingFeedbackKey = "";
      clearCinematic();
      momentum.reset(null);
      knockoutRoundId = null;
      lastPhase = null;
    },
    isActive() {
      return active;
    },
  };

  nodes.root.dataset.quality = quality;
  return controller;
}
