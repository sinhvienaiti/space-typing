/**
 * One floating tooltip for every element with `data-tip`. It lives on
 * <body>, so chamfered (clip-path) buttons cannot cut it off. Shows on
 * hover and keyboard focus, hides on leave, blur, click and Escape.
 * `data-tip-side="below"` places it under the element (default: above).
 */
let tip: HTMLDivElement | null = null;
let owner: HTMLElement | null = null;

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

let installed = false;

export function installHoloTooltips(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("pointerover", (event) => {
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
  document.addEventListener("pointerdown", hide);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
  window.addEventListener("blur", hide);
}
