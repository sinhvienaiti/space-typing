import { DUEL_ACTIONS_BY_ID } from "./actions";
import {
  CHARACTER_IDS,
  type CharacterId,
} from "../characters/registry";
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

export type DuelBattleUiHooks = {
  sendIntent(intent: DuelWireIntent): number | null;
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
  hide(): void;
  isActive(): boolean;
};

type BattleNodes = ReturnType<typeof createBattleNodes>;

const MAX_FEED_ITEMS = 8;
const MAX_FX_NODES = 24;
const MAX_PROJECTILE_NODES = 18;
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
    case "stored-action-used":
    case "combo-used":
      return event.playerId;
    case "threat-created":
      return event.threat.sourcePlayerId;
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
    <div id="duelProjectiles" class="duel-projectile-layer" aria-hidden="true"></div>
    <div class="duel-event-fx" aria-hidden="true"></div>

    <header class="duel-topbar">
      <div class="duel-map-title">
        <small id="duelBattleMode">DUEL</small>
        <strong id="duelBattleMap">Frost Wastes</strong>
      </div>
      <div class="duel-phase-block">
        <span id="duelBattlePhase">BUILD</span>
        <strong id="duelBattleClock">00:00</strong>
      </div>
      <div class="duel-series">
        <small id="duelBattleSeries">Bo3 · 0-0</small>
        <button id="duelBattleExit" class="duel-exit hidden" type="button">Return to Lobby</button>
      </div>
    </header>

    <div class="duel-combat-grid">
      <aside class="duel-player-card duel-self-card">
        <div class="duel-player-heading">
          <span>YOU</span>
          <strong id="duelSelfPath">BALANCED</strong>
        </div>
        <div id="duelSelfShipFrame" class="duel-ship-frame duel-ship-self" aria-hidden="true">
          <div id="duelSelfShip" class="duel-ship-sprite" data-character="vanguard"></div>
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

      <main class="duel-center">
        <section class="duel-threat-lane">
          <div class="duel-lane-title">
            <span>COUNTER WINDOW</span>
            <small id="duelThreatMeta">No incoming major attack</small>
          </div>
          <div id="duelThreats" class="duel-threats"></div>
        </section>

        <section class="duel-objective-lane">
          <div class="duel-lane-title">
            <span>SHARED OBJECTIVE</span>
            <small id="duelObjectiveMeta">Director waiting</small>
          </div>
          <div id="duelObjective" class="duel-objective-empty">No objective</div>
        </section>

        <section class="duel-offer-section">
          <div class="duel-lane-title">
            <span>ACTION OFFERS</span>
            <small>Type naturally or click to lock target</small>
          </div>
          <div id="duelOffers" class="duel-offer-grid"></div>
        </section>

        <div class="duel-current-input" aria-live="polite">
          <span id="duelCurrentTarget">FREE TARGETING</span>
          <strong id="duelCurrentPrefix">_</strong>
          <small>ESC cancels target · wrong keys do not advance</small>
        </div>
      </main>

      <aside class="duel-player-card duel-opponent-card">
        <div class="duel-player-heading">
          <span>RIVAL</span>
          <strong id="duelOpponentPath">BALANCED</strong>
        </div>
        <div id="duelOpponentShipFrame" class="duel-ship-frame duel-ship-opponent" aria-hidden="true">
          <div id="duelOpponentShip" class="duel-ship-sprite" data-character="reaper"></div>
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
      </aside>
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
    mode: byId("duelBattleMode"),
    map: byId("duelBattleMap"),
    phase: byId("duelBattlePhase"),
    clock: byId("duelBattleClock"),
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
    opponentHullFill: byId("duelOpponentHullFill"),
    opponentShieldFill: byId("duelOpponentShieldFill"),
    opponentEnergyFill: byId("duelOpponentEnergyFill"),
    opponentHull: byId("duelOpponentHull"),
    opponentShield: byId("duelOpponentShield"),
    opponentEnergy: byId("duelOpponentEnergy"),
    opponentInitiative: byId("duelOpponentInitiative"),
    opponentTrapHints: byId("duelOpponentTrapHints"),
    threatMeta: byId("duelThreatMeta"),
    threats: byId("duelThreats"),
    objectiveMeta: byId("duelObjectiveMeta"),
    objective: byId("duelObjective"),
    offers: byId("duelOffers"),
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
    case "conversion-used":
      return "CONVERSION · " + event.conversionId;
    case "trap-armed":
      return "TRAP ARMED";
    case "opponent-trap-hint":
      return event.publicHint;
    case "objective-spawned":
      return "OBJECTIVE · " + event.objective.displayLabel;
    case "objective-resolved":
      return event.resolution.draw
        ? "OBJECTIVE DRAW"
        : "OBJECTIVE CLAIMED";
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

  const sendTarget = (targetInstanceId: string): void => {
    hooks.sendIntent({
      type: "SELECT_TARGET",
      targetInstanceId,
    });
  };

  const renderOffers = (): void => {
    if (view === null) return;
    nodes.offers.replaceChildren();

    for (const offer of view.self.offers) {
      const action = DUEL_ACTIONS_BY_ID.get(offer.actionId);
      if (action === undefined) continue;
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
          (offer.status === "completed" ? " completed" : ""),
      );
      card.type = "button";
      card.disabled = offer.status === "completed";
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
      meta.textContent =
        action.resolveMode === "banked"
          ? "BANK · " + action.typingCostBand
          : action.energyCost > 0
            ? String(action.energyCost) +
              " EN · " +
              action.typingCostBand
            : action.typingCostBand;

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
        const action = DUEL_ACTIONS_BY_ID.get(entry.actionId);
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
  };

  const renderCurrentInput = (): void => {
    if (view === null) return;
    const targetId =
      prediction.targetInstanceId ??
      view.self.targetInstanceId;
    const prefix =
      prediction.acquisitionPrefix ||
      view.self.acquisitionPrefix;

    if (targetId === null) {
      nodes.currentTarget.textContent = "FREE TARGETING";
      nodes.currentPrefix.textContent =
        prefix === "" ? "_" : prefix;
      return;
    }

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
      nodes.currentTarget.textContent =
        DUEL_ACTIONS_BY_ID.get(offer.actionId)
          ?.displayLabel ?? offer.actionId;
    } else if (threat !== undefined) {
      nodes.currentTarget.textContent =
        "COUNTER · " + threat.displayLabel;
    } else if (objective !== null) {
      nodes.currentTarget.textContent =
        objective.displayLabel;
    } else {
      nodes.currentTarget.textContent = "TARGET";
    }
    nodes.currentPrefix.textContent =
      prefix === "" ? "_" : prefix;
  };

  const renderCore = (): void => {
    if (view === null) return;
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

  const spawnProjectile = (
    sourcePlayerId: DuelPlayerId,
    variant: "standard" | "heavy" | "combo",
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
      34 + ((projectileSequence * 17) % 34);
    projectile.style.setProperty(
      "--duel-projectile-y",
      String(lane) + "%",
    );
    nodes.projectiles.append(projectile);
    projectile.addEventListener(
      "animationend",
      () => projectile.remove(),
      { once: true },
    );
  };

  const spawnProjectileForEvent = (
    event: DuelClientEvent,
  ): void => {
    const source = eventSourcePlayer(event);
    if (source === null) return;

    if (event.type === "action-completed") {
      const action = DUEL_ACTIONS_BY_ID.get(
        event.actionId,
      );
      if (
        action?.category === "attack" &&
        action.resolveMode === "instant"
      ) {
        spawnProjectile(source, "standard");
      }
      return;
    }

    if (event.type === "stored-action-used") {
      const action = DUEL_ACTIONS_BY_ID.get(
        event.actionId,
      );
      if (action?.category === "attack") {
        spawnProjectile(source, "heavy");
      }
      return;
    }

    if (event.type === "threat-created") {
      spawnProjectile(source, "heavy");
      return;
    }

    if (event.type === "combo-used") {
      if (
        event.comboId === "homing-barrage" ||
        event.comboId === "gravity-bomb" ||
        event.comboId === "overcharged-railgun"
      ) {
        spawnProjectile(source, "combo");
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
        hooks.sendIntent({
          type: "CANCEL_TARGET",
          targetInstanceId: targetId,
        });
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
    hooks.sendIntent({
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
      renderCore();
      appendFeed(events);
    },
    update(nextView, events = []) {
      if (!active) {
        controller.show(nextView, events);
        return;
      }
      const previousView = view;
      const roundChanged =
        view?.roundId !== nextView.roundId;
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
      }
      renderCore();
      renderDelta(previousView, nextView);
      appendFeed(events);
    },
    setPrediction(nextPrediction) {
      prediction = {
        ...nextPrediction,
        pendingSequences: [
          ...nextPrediction.pendingSequences,
        ],
      };
      if (active) {
        renderOffers();
        renderThreats();
        renderObjective();
        renderCurrentInput();
      }
    },
    setQuality(nextQuality) {
      quality = nextQuality;
      nodes.root.dataset.quality = quality;
    },
    hide() {
      active = false;
      nodes.root.classList.add("hidden");
      gameShell.classList.remove(
        "duel-battle-active",
      );
      nodes.fx.replaceChildren();
      nodes.projectiles.replaceChildren();
    },
    isActive() {
      return active;
    },
  };

  nodes.root.dataset.quality = quality;
  return controller;
}
