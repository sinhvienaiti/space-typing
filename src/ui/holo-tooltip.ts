import "./holo-tooltip-help.css";

/**
 * One floating tooltip for every element with `data-tip`. It lives on
 * <body>, so chamfered (clip-path) buttons cannot cut it off. Shows on
 * mouse hover, keyboard focus and touch/pen tap. `data-tip-side="below"`
 * places it under the element (default: above).
 */
let tip: HTMLDivElement | null = null;
let owner: HTMLElement | null = null;

export type ContextualHoloHelpDefinition = {
  anchorId: string;
  ownerSelector?: string;
  text: string;
  side?: "above" | "below";
};

/**
 * R01 contextual help for currencies/resources that are visible while the
 * player is making Campaign decisions. Menu actions keep their existing
 * installMenuHelp wiring; these definitions fill the HUD/resource gap without
 * creating duplicate controls or changing existing element IDs.
 */
export const CONTEXTUAL_HOLO_HELP: readonly ContextualHoloHelpDefinition[] = [
  {
    anchorId: "creditsHud",
    ownerSelector: ".metric-credits",
    text: "Credits · earned from combat and rewards. Spend them in Campaign shops and service stops.",
    side: "below",
  },
  {
    anchorId: "warpBalance",
    ownerSelector: ".metric-warp",
    text: "Warp Charge · deployment stamina for rewarded Campaign runs. Practice remains free; Reserve stores overflow.",
    side: "below",
  },
  {
    anchorId: "hull",
    ownerSelector: ".hull-row",
    text: "Hull · your ship's core health. Reach zero and the current combat attempt ends.",
  },
  {
    anchorId: "shield",
    ownerSelector: ".shield-row",
    text: "Shield · absorbs incoming damage before Hull. Repair and defensive services can restore it.",
  },
  {
    anchorId: "energyText",
    ownerSelector: ".energy-row",
    text: "Energy · powers combat skills and support actions. It regenerates during combat.",
  },
  {
    anchorId: "powerHint",
    ownerSelector: ".player-ultimate",
    text: "Rage · correct typing fills five segments. Press Space to spend the filled segments on your ship's signature attack.",
  },
  {
    anchorId: "titlePilotCredits",
    ownerSelector: ".holo-stat",
    text: "Credits · your Campaign spending currency for shops, upgrades and services.",
    side: "below",
  },
  {
    anchorId: "titleWarpBalance",
    ownerSelector: ".pilot-warp",
    text: "Warp Charge · rewarded deployment stamina. Open Warp management to refuel or control Reserve.",
    side: "below",
  },
] as const;

export function contextualHoloHelpDefinition(
  anchorId: string,
): ContextualHoloHelpDefinition | null {
  return CONTEXTUAL_HOLO_HELP.find(
    (definition) => definition.anchorId === anchorId,
  ) ?? null;
}

function isNaturallyFocusable(element: HTMLElement): boolean {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLAnchorElement
  ) {
    return !(
      "disabled" in element &&
      (element as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).disabled
    );
  }
  return element.tabIndex >= 0;
}

function ensureHelpMark(target: HTMLElement): void {
  if (target.querySelector(":scope > .holo-help-mark") !== null) return;
  const mark = document.createElement("span");
  mark.className = "holo-help-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "ⓘ";
  target.append(mark);
}

export function installContextualHoloHelp(root: Document = document): void {
  for (const definition of CONTEXTUAL_HOLO_HELP) {
    const anchor = root.getElementById(definition.anchorId);
    if (!(anchor instanceof HTMLElement)) continue;
    const target =
      definition.ownerSelector === undefined
        ? anchor
        : anchor.closest<HTMLElement>(definition.ownerSelector) ?? anchor;

    target.dataset.tip = definition.text;
    if (definition.side === "below") target.dataset.tipSide = "below";
    else delete target.dataset.tipSide;
    target.dataset.holoHelp = "resource";

    if (!isNaturallyFocusable(target)) {
      target.tabIndex = 0;
      target.dataset.holoHelpTabindex = "managed";
    }
    ensureHelpMark(target);
  }
}

function ensureTip(): HTMLDivElement {
  if (tip !== null) return tip;
  tip = document.createElement("div");
  tip.className = "holo-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.id = "holoTooltip";
  document.body.append(tip);
  return tip;
}

function show(target: HTMLElement): void {
  const text = target.dataset.tip;
  if (text === undefined || text === "") return;
  const node = ensureTip();
  if (owner !== null && owner !== target) {
    owner.removeAttribute("aria-describedby");
  }
  owner = target;
  node.textContent = text;
  node.classList.add("visible");
  target.setAttribute("aria-describedby", node.id);
  const box = target.getBoundingClientRect();
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const below = target.dataset.tipSide === "below" || box.top < height + 16;
  const x = Math.min(
    window.innerWidth - width - 8,
    Math.max(8, box.left + box.width / 2 - width / 2),
  );
  const y = below ? box.bottom + 10 : box.top - height - 10;
  node.style.transform =
    "translate(" + String(Math.round(x)) + "px, " + String(Math.round(y)) + "px)";
}

function hide(): void {
  if (owner !== null) owner.removeAttribute("aria-describedby");
  owner = null;
  tip?.classList.remove("visible");
}

function tipTarget(event: Event): HTMLElement | null {
  const element = event.target instanceof Element ? event.target : null;
  return element?.closest<HTMLElement>("[data-tip]") ?? null;
}

function eventPointerType(event: Event): string {
  const pointer = event as Event & { pointerType?: unknown };
  return typeof pointer.pointerType === "string" ? pointer.pointerType : "";
}

let installed = false;

export function installHoloTooltips(): void {
  if (
    installed ||
    typeof document === "undefined" ||
    typeof window === "undefined"
  ) {
    return;
  }
  installed = true;
  installContextualHoloHelp(document);

  document.addEventListener("pointerover", (event) => {
    // Touch/pen gets a stable tap-to-toggle interaction on pointerup instead
    // of flashing the tooltip during the synthetic hover sequence.
    const pointerType = eventPointerType(event);
    if (pointerType === "touch" || pointerType === "pen") return;
    const target = tipTarget(event);
    if (target === owner) return;
    if (target === null) hide();
    else show(target);
  });
  document.addEventListener("focusin", (event) => {
    const target = tipTarget(event);
    if (target !== null && target.matches(":focus-visible")) show(target);
  });
  document.addEventListener("focusout", hide);
  document.addEventListener("pointerdown", (event) => {
    const pointerType = eventPointerType(event);
    if (pointerType !== "touch" && pointerType !== "pen") hide();
  });
  document.addEventListener("pointerup", (event) => {
    const pointerType = eventPointerType(event);
    if (pointerType !== "touch" && pointerType !== "pen") return;
    const target = tipTarget(event);
    if (target === null) {
      hide();
      return;
    }
    if (target === owner && tip?.classList.contains("visible") === true) {
      hide();
    } else {
      show(target);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
  window.addEventListener("blur", hide);
}
