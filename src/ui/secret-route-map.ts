import "./secret-route-map.css";
import {
  HIDDEN_DISCOVERY_PRESENTATION_EVENT,
  currentHiddenDiscoveryPresentation,
} from "../discovery/hidden-discovery-presentation";
import {
  secretRoutePresentationsForStage,
  type SecretRoutePresentation,
} from "../campaign/secret-route";

const SECRET_NODE_SELECTOR = ".journey-secret-node";
const SECRET_ACTIONS_ID = "journeySecretActions";

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
  button.setAttribute("aria-label", presentation.eyebrow + " · " + node.name);
  button.setAttribute("aria-pressed", "false");
  button.title = presentation.eyebrow + " · " + node.name;

  const glyph = root.createElement("span");
  glyph.className = "journey-secret-glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = node.kind === "hidden-shop" ? "◆" : "⌂";

  const label = root.createElement("strong");
  label.textContent = node.kind === "hidden-shop" ? "SECRET" : "STATION";
  button.append(glyph, label);
  button.addEventListener("click", () => {
    renderSecretPreview(root, presentation, button);
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

export function installSecretRouteMap(root: Document = document): () => void {
  if (typeof window === "undefined") return () => undefined;
  const grid = byId(root, "stageGrid");
  if (grid === null) return () => undefined;

  const observer = new MutationObserver(() => renderSecretNodes(root));
  observer.observe(grid, { childList: true });

  const onDiscovery = () => renderSecretNodes(root);
  const onClick = (event: Event) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(".journey-node[data-stage]") !== null
    ) {
      clearSecretPreview(root);
    }
  };
  window.addEventListener(HIDDEN_DISCOVERY_PRESENTATION_EVENT, onDiscovery);
  root.addEventListener("click", onClick);
  renderSecretNodes(root);

  return () => {
    observer.disconnect();
    window.removeEventListener(HIDDEN_DISCOVERY_PRESENTATION_EVENT, onDiscovery);
    root.removeEventListener("click", onClick);
    clearSecretPreview(root);
  };
}
