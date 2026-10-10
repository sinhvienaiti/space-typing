import "./secret-route-map.css";
import {
  HIDDEN_DISCOVERY_PRESENTATION_EVENT,
  HIDDEN_STOP_ARRIVAL_EVENT,
  currentHiddenDiscoveryPresentation,
  type HiddenStopArrival,
} from "../discovery/hidden-discovery-presentation";
import {
  journeySectorDetailForStage,
  type JourneySectorDetail,
} from "../campaign/journey-map";
import {
  secretRoutePresentationsForStage,
  type SecretRoutePresentation,
} from "../campaign/secret-route";

const SECRET_NODE_SELECTOR = ".journey-secret-node";
const SECRET_ACTIONS_ID = "journeySecretActions";
const SECRET_ARRIVAL_ID = "journeySecretArrival";
const SECTOR_DETAIL_ID = "journeySectorDetail";

export type SecretRouteActivationHandlers = {
  onOpenStation: () => void;
  onPreviewRoute: (presentation: SecretRoutePresentation) => void;
};

/**
 * Keep Rest Stop activation on the station flow and away from Campaign stage
 * launch. Secret shops still use the existing preview/action affordance.
 */
export function activateSecretRoutePresentation(
  presentation: SecretRoutePresentation,
  handlers: SecretRouteActivationHandlers,
): "station" | "preview" {
  if (
    presentation.action === "open-hidden-station" &&
    presentation.node.kind === "hidden-station"
  ) {
    handlers.onOpenStation();
    return "station";
  }

  handlers.onPreviewRoute(presentation);
  return "preview";
}

export function hiddenStopArrivalButtonId(
  arrival: HiddenStopArrival,
): "blackMarketButton" | "stationShopButton" {
  return arrival.kind === "hidden-station"
    ? "stationShopButton"
    : "blackMarketButton";
}


export function hiddenStopArrivalCanPresent(
  stageCleared: boolean,
  checkpointHubOpen: boolean,
): boolean {
  return stageCleared && !checkpointHubOpen;
}
function byId<T extends HTMLElement>(root: Document, id: string): T | null {
  return root.getElementById(id) as T | null;
}

function displayedWorldStage(board: HTMLElement): number | null {
  const first = board.querySelector<HTMLElement>(
    ".journey-node[data-stage]",
  );
  if (first === null) return null;
  const stage = Number(first.dataset.stage);
  return Number.isInteger(stage) && stage >= 1 && stage <= 1000
    ? stage
    : null;
}

function selectedJourneyStage(board: HTMLElement): number | null {
  const selectors = [
    ".journey-node.selected[data-stage]",
    ".journey-node.current[data-stage]",
    ".journey-node.frontier[data-stage]",
    ".journey-node[data-stage]",
  ] as const;
  for (const selector of selectors) {
    const node = board.querySelector<HTMLElement>(selector);
    if (node === null) continue;
    const stage = Number(node.dataset.stage);
    if (Number.isInteger(stage) && stage >= 1 && stage <= 1000) {
      return stage;
    }
  }
  return null;
}

function clearSecretPreview(root: Document): void {
  const actions = byId(root, SECRET_ACTIONS_ID);
  actions?.remove();
  byId<HTMLButtonElement>(root, "journeyStartButton")?.classList.remove(
    "secret-route-hidden",
  );
  root.querySelectorAll<HTMLElement>(SECRET_NODE_SELECTOR).forEach((node) => {
    node.classList.remove("selected");
    node.setAttribute("aria-pressed", "false");
  });
}

function clearSecretArrival(root: Document): void {
  byId(root, SECRET_ARRIVAL_ID)?.remove();
}

function clearSectorDetail(root: Document): void {
  byId(root, SECTOR_DETAIL_ID)?.remove();
}

function openCanonicalAction(root: Document, buttonId: string): void {
  const source = byId<HTMLButtonElement>(root, buttonId);
  if (source === null || source.disabled) return;
  const dialog = byId<HTMLDialogElement>(root, "stageSelectDialog");
  if (dialog?.open === true) dialog.close();
  source.click();
}

function actionButton(
  root: Document,
  label: string,
  sourceButtonId: string,
  primary = false,
): HTMLButtonElement {
  const button = root.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (primary) button.className = "primary";
  button.addEventListener("click", () => {
    openCanonicalAction(root, sourceButtonId);
  });
  return button;
}

function renderSecretPreview(
  root: Document,
  presentation: SecretRoutePresentation,
  selected: HTMLButtonElement,
): void {
  clearSecretPreview(root);
  selected.classList.add("selected");
  selected.setAttribute("aria-pressed", "true");

  const title = byId(root, "stagePreviewTitle");
  const meta = byId(root, "stagePreviewMeta");
  const start = byId<HTMLButtonElement>(root, "journeyStartButton");
  const preview = byId(root, "stagePreview");
  if (title === null || meta === null || start === null || preview === null) {
    return;
  }

  title.textContent =
    presentation.eyebrow + " · " + presentation.title;
  meta.textContent =
    presentation.meta + " · " + presentation.node.description;
  start.classList.add("secret-route-hidden");

  const actions = root.createElement("div");
  actions.id = SECRET_ACTIONS_ID;
  actions.className =
    "journey-secret-actions journey-secret-actions-" +
    presentation.node.kind;

  if (presentation.action === "open-black-market") {
    actions.append(
      actionButton(root, presentation.actionLabel, "blackMarketButton", true),
    );
  } else {
    const note = root.createElement("small");
    note.textContent =
      "Hidden Station · safe service stop. Choose a service; Campaign stage selection remains unchanged.";
    actions.append(
      note,
      actionButton(root, "Station Shop", "stationShopButton", true),
      actionButton(root, "Repair / Upgrade", "serviceShopButton"),
      actionButton(root, "Support Loadout", "supportButton"),
    );
  }

  preview.append(actions);
}

function createSecretButton(
  root: Document,
  presentation: SecretRoutePresentation,
): HTMLButtonElement {
  const { node } = presentation;
  const button = root.createElement("button");
  button.type = "button";
  button.className =
    "journey-secret-node journey-secret-node-" + node.kind;
  button.style.left = String(node.x) + "%";
  button.style.top = String(node.y) + "px";
  button.dataset.hiddenDiscoveryId = node.id;
  button.dataset.discoveryStage = String(node.stage);
  button.setAttribute(
    "aria-label",
    (node.kind === "hidden-station" ? "Rest Stop · " : "") +
      presentation.eyebrow +
      " · " +
      node.name,
  );
  button.setAttribute("aria-pressed", "false");
  button.title =
    node.kind === "hidden-station"
      ? "Rest Stop · Dock at " + node.name
      : presentation.eyebrow + " · " + node.name;

  const glyph = root.createElement("span");
  glyph.className = "journey-secret-glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = node.kind === "hidden-shop" ? "◆" : "⌂";

  const label = root.createElement("strong");
  label.textContent = node.kind === "hidden-shop" ? "SECRET" : "REST STOP";
  button.append(glyph, label);
  button.addEventListener("click", () => {
    activateSecretRoutePresentation(presentation, {
      onOpenStation: () => openCanonicalAction(root, "stationShopButton"),
      onPreviewRoute: (entry) => renderSecretPreview(root, entry, button),
    });
  });
  return button;
}

function renderSecretNodes(root: Document): void {
  const grid = byId(root, "stageGrid");
  const board = grid?.querySelector<HTMLElement>(".stage-journey") ?? null;
  if (board === null) return;

  board.querySelectorAll(SECRET_NODE_SELECTOR).forEach((node) => node.remove());
  clearSecretPreview(root);

  const state = currentHiddenDiscoveryPresentation();
  const stage = displayedWorldStage(board);
  if (state === null || stage === null) return;

  for (const presentation of secretRoutePresentationsForStage(stage, state)) {
    board.append(createSecretButton(root, presentation));
  }
}

function createSectorStopChip(
  root: Document,
  stop: JourneySectorDetail["hiddenStops"][number],
): HTMLElement {
  const chip = root.createElement("span");
  chip.className = "journey-sector-stop journey-sector-stop-" + stop.kind;
  chip.dataset.hiddenDiscoveryId = stop.id;
  chip.textContent =
    (stop.kind === "hidden-station" ? "REST STOP" : "SECRET") +
    " · Stage " +
    String(stop.stage) +
    " · " +
    stop.name;
  return chip;
}

function renderSectorDetail(root: Document): void {
  clearSectorDetail(root);
  const dialog = byId<HTMLDialogElement>(root, "stageSelectDialog");
  const grid = byId(root, "stageGrid");
  const parent = grid?.parentElement ?? null;
  const board = grid?.querySelector<HTMLElement>(".stage-journey") ?? null;
  if (dialog?.open !== true || grid === null || parent === null || board === null) {
    return;
  }

  const stage = selectedJourneyStage(board);
  if (stage === null) return;
  const detail = journeySectorDetailForStage(
    stage,
    currentHiddenDiscoveryPresentation(),
  );

  const panel = root.createElement("section");
  panel.id = SECTOR_DETAIL_ID;
  panel.className = "journey-sector-detail";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", SECTOR_DETAIL_ID + "Title");

  const heading = root.createElement("div");
  heading.className = "journey-sector-heading";
  const eyebrow = root.createElement("small");
  eyebrow.textContent = "SECTOR DETAIL";
  const title = root.createElement("strong");
  title.id = SECTOR_DETAIL_ID + "Title";
  title.textContent =
    "Stages " + String(detail.startStage) + "–" + String(detail.endStage);
  const checkpoint = root.createElement("span");
  checkpoint.textContent = "Checkpoint · Stage " + String(detail.checkpointStage);
  heading.append(eyebrow, title, checkpoint);

  const stops = root.createElement("div");
  stops.className = "journey-sector-stops";
  if (detail.hiddenStops.length === 0) {
    const empty = root.createElement("span");
    empty.className = "journey-sector-empty";
    empty.textContent = "No hidden stops discovered in this sector.";
    stops.append(empty);
  } else {
    for (const stop of detail.hiddenStops) {
      stops.append(createSectorStopChip(root, stop));
    }
  }

  panel.append(heading, stops);
  parent.insertBefore(panel, grid);
}

function isHiddenStopArrival(value: unknown): value is HiddenStopArrival {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const arrival = value as Partial<HiddenStopArrival>;
  return (
    Number.isInteger(arrival.stage) &&
    typeof arrival.stage === "number" &&
    arrival.stage >= 1 &&
    arrival.stage <= 1000 &&
    ((arrival.discoveryId === "black-market-signal" &&
      arrival.kind === "hidden-shop" &&
      arrival.title === "Hidden Shop") ||
      (arrival.discoveryId === "hidden-station-signal" &&
        arrival.kind === "hidden-station" &&
        arrival.title === "Hidden Station"))
  );
}

function hiddenStopStageIsCleared(
  root: Document,
  arrival: HiddenStopArrival,
): boolean {
  const stageNode = root.querySelector<HTMLElement>(
    `.journey-node[data-stage="${String(arrival.stage)}"]`,
  );
  return stageNode?.classList.contains("cleared") === true;
}

function renderHiddenStopArrival(
  root: Document,
  arrival: HiddenStopArrival,
  onDismiss: () => void,
): void {
  const dialog = byId<HTMLDialogElement>(root, "stageSelectDialog");
  const restHubDialog = byId<HTMLDialogElement>(root, "restHubDialog");
  const grid = byId(root, "stageGrid");
  const parent = grid?.parentElement ?? null;
  if (
    dialog === null ||
    grid === null ||
    parent === null ||
    !hiddenStopArrivalCanPresent(
      hiddenStopStageIsCleared(root, arrival),
      restHubDialog?.open === true,
    )
  ) {
    return;
  }

  if (!dialog.open) {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }
  clearSecretArrival(root);

  const panel = root.createElement("section");
  panel.id = SECRET_ARRIVAL_ID;
  panel.className = "journey-secret-arrival journey-secret-arrival-" + arrival.kind;
  panel.tabIndex = -1;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-live", "polite");
  panel.setAttribute("aria-labelledby", SECRET_ARRIVAL_ID + "Title");

  const copy = root.createElement("div");
  const eyebrow = root.createElement("small");
  eyebrow.className = "journey-secret-arrival-eyebrow";
  eyebrow.textContent =
    arrival.kind === "hidden-station"
      ? "REST STOP DISCOVERED"
      : "SECRET SIGNAL DISCOVERED";
  const title = root.createElement("strong");
  title.id = SECRET_ARRIVAL_ID + "Title";
  title.textContent = arrival.title + " · Stage " + String(arrival.stage);
  const detail = root.createElement("span");
  detail.textContent =
    arrival.kind === "hidden-station"
      ? "Safe dock acquired. Enter the existing Station Shop flow or continue the Campaign; no combat launches from this stop."
      : "A hidden trader signal is now available in this sector. Enter the existing Black Market flow or continue the Campaign.";
  copy.append(eyebrow, title, detail);

  const actions = root.createElement("div");
  actions.className = "journey-secret-arrival-actions";
  const enter = root.createElement("button");
  enter.type = "button";
  enter.className = "primary";
  enter.textContent =
    arrival.kind === "hidden-station"
      ? "Dock at Hidden Station"
      : "Enter Black Market";
  enter.addEventListener("click", () => {
    onDismiss();
    clearSecretArrival(root);
    openCanonicalAction(root, hiddenStopArrivalButtonId(arrival));
  });

  const leave = root.createElement("button");
  leave.type = "button";
  leave.textContent = "Continue Journey";
  leave.addEventListener("click", () => {
    onDismiss();
    clearSecretArrival(root);
  });
  actions.append(enter, leave);
  panel.append(copy, actions);
  parent.insertBefore(panel, grid);
  panel.focus({ preventScroll: true });
}

export function installSecretRouteMap(root: Document = document): () => void {
  if (typeof window === "undefined") return () => undefined;
  const grid = byId(root, "stageGrid");
  if (grid === null) return () => undefined;

  let pendingArrival: HiddenStopArrival | null = null;
  const renderMap = () => {
    renderSecretNodes(root);
    renderSectorDetail(root);
    if (pendingArrival !== null) {
      renderHiddenStopArrival(root, pendingArrival, () => {
        pendingArrival = null;
      });
    }
  };

  const observer = new MutationObserver(renderMap);
  observer.observe(grid, { childList: true });

  const onDiscovery = () => renderMap();
  const onArrival = (event: Event) => {
  const detail = (event as CustomEvent<unknown>).detail;
  if (!isHiddenStopArrival(detail)) return;
  pendingArrival = detail;
  renderMap();
};
  const onClick = (event: Event) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(".journey-node[data-stage]") !== null
    ) {
      clearSecretPreview(root);
      renderSectorDetail(root);
    }
  };
  const restHubDialog = byId<HTMLDialogElement>(root, "restHubDialog");
  const stageSelectDialog = byId<HTMLDialogElement>(root, "stageSelectDialog");
  const onRestHubClose = () => renderMap();
  const onStageSelectClose = () => {
    if (
      pendingArrival !== null &&
      byId(root, SECRET_ARRIVAL_ID) !== null
    ) {
      pendingArrival = null;
      clearSecretArrival(root);
    }
  };

  window.addEventListener(HIDDEN_DISCOVERY_PRESENTATION_EVENT, onDiscovery);
  window.addEventListener(HIDDEN_STOP_ARRIVAL_EVENT, onArrival);
  restHubDialog?.addEventListener("close", onRestHubClose);
  stageSelectDialog?.addEventListener("close", onStageSelectClose);
  root.addEventListener("click", onClick);
  renderMap();

  return () => {
    observer.disconnect();
    window.removeEventListener(HIDDEN_DISCOVERY_PRESENTATION_EVENT, onDiscovery);
    window.removeEventListener(HIDDEN_STOP_ARRIVAL_EVENT, onArrival);
    restHubDialog?.removeEventListener("close", onRestHubClose);
    stageSelectDialog?.removeEventListener("close", onStageSelectClose);
    root.removeEventListener("click", onClick);
    clearSecretPreview(root);
    clearSecretArrival(root);
    clearSectorDetail(root);
  };
}
