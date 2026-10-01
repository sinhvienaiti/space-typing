import { duelActionDefinitionForMap } from "./map-actions";
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

export type DuelBattleUiHooks = {
  sendIntent(intent: DuelWireIntent): number | null;
  onPresentationState?(
    view: DuelClientMatchView,
    events: readonly DuelClientEvent[],
  ): void;
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
const SHIP_FALLBACKS = {
  self: "vanguard",
  opponent: "reaper",
} as const satisfies Record<string, CharacterId>;

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
      return "BUILD";
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
    case "action-completed":
    case "action-fired":
    case "stored-action-used":
    case "combo-used":
    case "precision-firepower":
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
          <aside class="duel-player-card duel-opponent-card">
            <div class="duel-player-heading">
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

        <div class="duel-arena-center">
          <section class="duel-threat-lane duel-context-lane">
            <div class="duel-lane-title">
              <span>COUNTER WINDOW</span>
              <small id="duelThreatMeta">No incoming major attack</small>
            </div>
            <div id="duelThreats" class="duel-threats"></div>
          </section>

          <section class="duel-objective-lane duel-context-lane">
            <div class="duel-lane-title">
              <span>SHARED OBJECTIVE</span>
              <small id="duelObjectiveMeta">Director waiting</small>
            </div>
            <div id="duelObjective" class="duel-objective-empty">No objective</div>
          </section>

          <div class="duel-combat-space" aria-hidden="true">
            <i class="duel-arena-line"></i>
            <i class="duel-arena-reticle"></i>
          </div>

          <div id="duelCurrentInput" class="duel-current-input duel-arena-input" aria-live="polite">
            <span id="duelCurrentTarget">FREE TARGETING</span>
            <strong id="duelCurrentPrefix" class="duel-current-token">_</strong>
            <small>ESC cancels target · wrong keys do not advance</small>
          </div>
        </div>

        <div class="duel-self-zone">
          <div id="duelSelfShipFrame" class="duel-ship-frame duel-ship-self" aria-label="Your ship">
            <i class="duel-damage-vfx duel-damage-fire duel-damage-fire-a" aria-hidden="true"></i>
            <i class="duel-damage-vfx duel-damage-fire duel-damage-fire-b" aria-hidden="true"></i>
            <i class="duel-damage-vfx duel-damage-smoke" aria-hidden="true"></i>
            <div id="duelSelfShip" class="duel-ship-sprite" data-character="vanguard"></div>
          </div>

          <aside class="duel-player-card duel-self-card">
            <div class="duel-player-heading">
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

      <section class="duel-command-deck" aria-label="Duel typing controls">
        <div class="duel-context-row">
          <section class="duel-threat-lane duel-context-copy" aria-hidden="true"></section>
          <section class="duel-objective-lane duel-context-copy" aria-hidden="true"></section>
        </div>

        <section class="duel-offer-section">
          <div class="duel-lane-title">
            <span>ACTION OFFERS</span>
            <small>Type naturally or click to lock target</small>
          </div>
          <div id="duelOffers" class="duel-offer-grid"></div>
        </section>
      </section>
    </div>

    <footer class="duel-bottom">
      <section class="duel-inventory-panel">
        <div class="duel-lane-title">
          <span>BANKED ACTIONS</span>
          <small>Attack 3 · Defense 2 · Tactical 2</small>
        </div>
        <div id="duelInventory" class="duel-inventory"></div>
      </section>

      <section class="duel-strategy-panel">
        <div class="duel-lane-title">
          <span>STRATEGY</span>
          <small id="duelStrategyMeta">No combo ready</small>
        </div>
        <div id="duelCombos" class="duel-strategy-actions"></div>
        <details class="duel-strategy-tools">
          <summary>Conversions & traps</summary>
          <div class="duel-tool-group">
            <button type="button" data-duel-skill="conversion:sacrifice">Sacrifice</button>
            <button type="button" data-duel-skill="conversion:reactor-dump">Reactor Dump</button>
            <button type="button" data-duel-skill="conversion:overload">Overload</button>
            <button type="button" data-duel-skill="conversion:berserk">Berserk</button>
          </div>
          <div class="duel-tool-group">
            <button type="button" data-duel-skill="trap:minefield">Minefield</button>
            <button type="button" data-duel-skill="trap:mirror-trap">Mirror Trap</button>
            <button type="button" data-duel-skill="trap:static-snare">Static Snare</button>
            <button type="button" data-duel-skill="trap:decoy">Decoy</button>
            <button type="button" data-duel-skill="trap:counter-battery">Counter Battery</button>
          </div>
        </details>
      </section>

      <section class="duel-intel-panel">
        <div class="duel-lane-title">
          <span>INTEL</span>
          <small id="duelMysteryMeta">No Mystery signal</small>
        </div>
        <div id="duelEventFeed" class="duel-event-feed" aria-live="polite"></div>
      </section>
    </footer>
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
    inventory: byId("duelInventory"),
    strategyMeta: byId("duelStrategyMeta"),
    combos: byId("duelCombos"),
    mysteryMeta: byId("duelMysteryMeta"),
    eventFeed: byId("duelEventFeed"),
  };
}

function setResource(
  fill: HTMLElement,
  valueNode: HTMLElement,
  value: number,
  max: number,
): void {
  fill.style.transform =
    "scaleX(" + resourceRatio(value, max).toFixed(4) + ")";
  valueNode.textContent =
    String(Math.max(0, Math.round(value))) +
    " / " +
    String(Math.max(0, Math.round(max)));
}

function eventLabel(event: DuelClientEvent): string {
  switch (event.type) {
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
        "PRECISION " +
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
  const performanceMonitor =
    new DuelPerformanceMonitor();
  let performanceFrame: number | null = null;
  let lastPerformanceFrameAt: number | null = null;

  const sendTarget = (targetInstanceId: string): void => {
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
      : duelActionDefinitionForMap(
          view.map.id,
          actionId,
        );

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

  const renderOffers = (): void => {
    if (view === null) return;
    nodes.offers.replaceChildren();
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

    for (const offer of view.self.offers) {
      const action = actionDefinition(offer.actionId);
      if (action === undefined) continue;
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
      const progress = typedMarkup(
        action.answerToken,
        prefix,
      );
      const card = createElement(
        "button",
        "duel-offer-card duel-category-" +
          action.category +
          (selected ? " selected" : "") +
          (offer.status === "completed" ? " completed" : "") +
          (cooldown > 0 ? " cooling-down" : "") +
          (targetFrozen && !selected
            ? " target-frozen"
            : "") +
          (lifetime !== null && lifetime <= 5
            ? " expiring-soon"
            : ""),
      );
      card.type = "button";
      card.disabled =
        (offer.status !== "available" &&
          offer.status !== "locked") ||
        cooldown > 0 ||
        (targetFrozen && !selected);
      card.dataset.offerId = offer.instanceId;

      const category = createElement(
        "small",
        "duel-offer-category",
      );
      category.textContent = action.category.toUpperCase();
      const label = createElement(
        "strong",
        "duel-offer-label",
      );
      label.textContent = action.displayLabel;
      const token = createElement(
        "span",
        "duel-offer-token",
      );
      const typed = createElement("b");
      typed.textContent = progress.typed;
      const remaining = createElement("i");
      remaining.textContent = progress.remaining;
      token.append(typed, remaining);

      const meta = createElement("small", "duel-offer-meta");
      const baseMeta =
        action.resolveMode === "banked"
          ? "BANK · " + action.typingCostBand
          : action.energyCost > 0
            ? String(action.energyCost) +
              " EN · " +
              action.typingCostBand
            : action.typingCostBand;
      const timingMeta: string[] = [];
      if (cooldown > 0) {
        timingMeta.push(cooldown.toFixed(1) + "s CD");
      }
      if (targetFrozen && !selected) {
        timingMeta.push("TARGET FROZEN");
      }
      if (lifetime !== null) {
        timingMeta.push(
          Math.max(0, lifetime).toFixed(1) + "s",
        );
      }
      meta.textContent =
        timingMeta.length > 0
          ? timingMeta.join(" · ") + " · " + baseMeta
          : baseMeta;

      card.append(category, label, token, meta);
      card.addEventListener("click", () => {
        sendTarget(offer.instanceId);
      });
      nodes.offers.append(card);
    }
  };

  const renderThreats = (): void => {
    if (view === null) return;
    nodes.threats.replaceChildren();
    const threats = view.self.incomingThreats;
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

  const renderObjective = (): void => {
    if (view === null) return;
    const objective = view.shared.neutralObjective;
    nodes.objective.replaceChildren();

    if (
      objective === null ||
      objective.status !== "active"
    ) {
      nodes.objective.className = "duel-objective-empty";
      nodes.objective.textContent = "No objective";
      nodes.objectiveMeta.textContent = "Director waiting";
      return;
    }

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

  const renderInventory = (): void => {
    if (view === null) return;
    nodes.inventory.replaceChildren();

    for (const bucket of [
      "attack",
      "defense",
      "tactical",
    ] as const) {
      const group = createElement(
        "div",
        "duel-inventory-group",
      );
      const heading = createElement("small");
      heading.textContent = bucket.toUpperCase();
      group.append(heading);

      const entries = view.self.inventory[bucket];
      if (entries.length === 0) {
        const empty = createElement("span", "duel-empty-chip");
        empty.textContent = "empty";
        group.append(empty);
      }

      for (const entry of entries) {
        const action = actionDefinition(entry.actionId);
        const chip = button(
          action?.displayLabel ?? entry.actionId,
          "duel-inventory-chip duel-category-" +
            (action?.category ?? bucket),
          () => {
            hooks.sendIntent({
              type: "USE_ITEM",
              itemId: entry.actionId,
            });
          },
        );
        group.append(chip);
      }
      nodes.inventory.append(group);
    }
  };

  const renderStrategy = (): void => {
    if (view === null) return;
    nodes.combos.replaceChildren();
    const combos = view.self.readyCombos;
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

  const renderIntel = (): void => {
    if (view === null) return;
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

    nodes.selfShipFrame.dataset.damageTier = String(
      damageTier(view.self.hull, view.self.maxHull),
    );
    nodes.opponentShipFrame.dataset.damageTier = String(
      damageTier(view.opponent.hull, view.opponent.maxHull),
    );

    const selfShieldRatio = resourceRatio(
      view.self.shield,
      view.self.maxShield,
    );
    const opponentShieldRatio = resourceRatio(
      view.opponent.shield,
      view.opponent.maxShield,
    );
    nodes.selfShipFrame.style.setProperty(
      "--duel-shield-ratio",
      selfShieldRatio.toFixed(4),
    );
    nodes.opponentShipFrame.style.setProperty(
      "--duel-shield-ratio",
      opponentShieldRatio.toFixed(4),
    );
    nodes.selfShipFrame.dataset.shieldActive =
      selfShieldRatio > 0 ? "true" : "false";
    nodes.opponentShipFrame.dataset.shieldActive =
      opponentShieldRatio > 0 ? "true" : "false";

    const rivalTyping = view.opponent.typingTelegraph;
    const rivalProgress = rivalTyping.active
      ? Math.max(0.16, rivalTyping.progress)
      : 0;
    nodes.opponentShipFrame.dataset.typing =
      rivalTyping.active ? "true" : "false";
    nodes.opponentShipFrame.style.setProperty(
      "--duel-opponent-typing-progress",
      rivalProgress.toFixed(2),
    );
    nodes.opponentCharge.classList.toggle(
      "hidden",
      !rivalTyping.active,
    );
    nodes.opponentCharge.textContent =
      rivalTyping.kind === "counter"
        ? "RIVAL COUNTERING"
        : rivalTyping.kind === "objective"
          ? "RIVAL CONTESTING"
          : "RIVAL CHARGING";

    nodes.root.dataset.targetFrozen =
      view.shared.tactical.frozenTargetCount[
        view.self.playerId
      ] > 0
        ? "true"
        : "false";
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
    if (
      previous === null ||
      previous.roundId !== next.roundId
    ) {
      return;
    }
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
        token = action?.answerToken ?? "";
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
    nodes.root.dataset.map = view.map.id;
    nodes.root.dataset.phase = view.phase;
    nodes.root.dataset.mode = view.mode;
    nodes.root.dataset.quality = quality;

    nodes.mode.textContent =
      view.mode === "ranked"
        ? "RANKED · NORMALIZED"
        : view.mode === "practice"
          ? "PRACTICE VS BOT"
          : "FRIEND DUEL";
    nodes.map.textContent = view.map.displayName;
    nodes.phase.textContent = phaseLabel(view.phase);
    nodes.clock.textContent = formatClock(
      view.elapsedSeconds,
    );
    const pendingHazard = view.shared.pendingHazards[0];
    nodes.hazardWarning.textContent =
      pendingHazard === undefined
        ? "AIRSPACE CLEAR"
        : pendingHazard.hazard.hazardId
            .replaceAll("-", " ")
            .toUpperCase() +
          " · " +
          pendingHazard.remainingSeconds.toFixed(1) +
          "s";
    nodes.hazardWarning.dataset.active =
      pendingHazard === undefined ? "false" : "true";
    nodes.series.textContent =
      "Bo" +
      String(view.series.format) +
      " · " +
      String(view.series.wins["player-1"]) +
      "-" +
      String(view.series.wins["player-2"]) +
      " · R" +
      String(view.series.roundsPlayed + 1);

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

    nodes.selfPath.textContent =
      view.self.strategyPath.toUpperCase();
    nodes.opponentPath.textContent =
      view.opponent.strategyPath.toUpperCase();
    nodes.selfInitiative.textContent = String(
      Math.round(view.self.initiative),
    );
    nodes.opponentInitiative.textContent = String(
      Math.round(view.opponent.initiative),
    );

    const terminal =
      view.series.status !== "active";
    nodes.exit.classList.toggle("hidden", !terminal);

    renderShips();
    renderOffers();
    renderThreats();
    renderObjective();
    renderInventory();
    renderStrategy();
    renderIntel();
    renderCurrentInput();
    performanceMonitor.pushUiUpdateMs(
      performance.now() - renderStartedAt,
    );
  };

  const appendFeed = (
    events: readonly DuelClientEvent[],
  ): void => {
    for (const event of events) {
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
    nodes.currentInput.classList.remove("typing-hit");
    void nodes.currentInput.offsetWidth;
    nodes.currentInput.classList.add("typing-hit");
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
      nodes.fx.append(field);
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
    nodes.fx.append(blast);
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
      nodes.fx.append(shockwave);
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
          nodes.fx.append(secondary);
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
    if (impactArt !== null) {
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
    projectile.style.setProperty(
      "--duel-projectile-duration",
      String(Math.round(720 / speedScale)) + "ms",
    );
    projectile.style.setProperty(
      "--duel-shot-primary",
      projectileProfile.primary,
    );
    projectile.style.setProperty(
      "--duel-shot-secondary",
      projectileProfile.secondary,
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
    nodes.projectiles.append(projectile);
    projectile.addEventListener(
      "animationend",
      () => {
        spawnProjectileArrival(
          fromSelf ? "opponent" : "self",
          variant,
        );
        projectile.remove();
      },
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

    if (event.type === "action-fired") {
      presentAction(source, event.actionId);
      return;
    }

    if (event.type === "stored-action-used") {
      presentAction(source, event.actionId, "heavy");
      return;
    }

    if (event.type === "threat-created") {
      spawnThreatTelegraph(event.threat);
      return;
    }

    if (event.type === "threat-countered") {
      spawnThreatIntercept(
        event.threatId,
        event.targetPlayerId,
      );
      return;
    }

    if (event.type === "threat-resolved") {
      clearThreatTelegraph(event.threatId);
      presentAction(
        event.sourcePlayerId,
        event.actionId,
        "lance",
      );
      return;
    }

    if (event.type === "precision-firepower") {
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
    nodes.fx.append(burst);
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
        nodes.fx.append(spark);
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
    spawnTypingFeedback();
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
      performanceMonitor.setContext(
        quality,
        view?.phase ?? null,
      );
      performanceMonitor.setLiveCounts(
        nodes.projectiles.childElementCount,
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
      void applyPaintedCombatVfx();
      gameShell.classList.add(
        "duel-battle-active",
      );
      nodes.root.classList.remove("hidden");
      prediction = {
        roundId: nextView.roundId,
        targetInstanceId:
          nextView.self.targetInstanceId,
        acquisitionPrefix:
          nextView.self.acquisitionPrefix,
        pendingSequences: [],
      };
      performanceMonitor.reset();
      renderCore();
      appendFeed(events);
      hooks.onPresentationState?.(
        nextView,
        events,
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
      if (roundChanged) {
        prediction = {
          roundId: nextView.roundId,
          targetInstanceId:
            nextView.self.targetInstanceId,
          acquisitionPrefix:
            nextView.self.acquisitionPrefix,
          pendingSequences: [],
        };
        nodes.eventFeed.replaceChildren();
        nodes.projectiles.replaceChildren();
        nodes.typingFx.replaceChildren();
        lastTypingFeedbackKey = "";
      }
      renderCore();
      renderDelta(previousView, nextView);
      appendFeed(events);
      hooks.onPresentationState?.(
        nextView,
        events,
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
    setQuality(nextQuality) {
      quality = nextQuality;
      nodes.root.dataset.quality = quality;
      performanceMonitor.setContext(
        quality,
        view?.phase ?? null,
      );
    },
    getPerformanceDiagnostics() {
      performanceMonitor.setLiveCounts(
        nodes.projectiles.childElementCount,
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
      paintedVfxGeneration += 1;
      stopPerformanceLoop();
      nodes.root.classList.add("hidden");
      gameShell.classList.remove(
        "duel-battle-active",
      );
      nodes.fx.replaceChildren();
      nodes.projectiles.replaceChildren();
      nodes.typingFx.replaceChildren();
      lastTypingFeedbackKey = "";
    },
    isActive() {
      return active;
    },
  };

  nodes.root.dataset.quality = quality;
  return controller;
}
