import {
  currencyChips,
  type CurrencyAmounts,
} from "./currency";
import {
  GRADE_IDS,
  GRADE_PRESENTATION,
  type GradeId,
} from "../grades";

export function replaceCurrencyChips(
  root: HTMLElement,
  amounts: CurrencyAmounts,
  options: {
    includeZero?: boolean;
    signed?: boolean;
    className?: string;
  } = {},
): void {
  root.replaceChildren();
  root.classList.add("currency-chip-row");
  if (options.className !== undefined) {
    root.classList.add(options.className);
  }

  const chips = currencyChips(amounts, {
    includeZero: options.includeZero,
  });

  if (chips.length === 0) {
    const free = document.createElement("span");
    free.className = "currency-chip currency-free";
    free.textContent = "Free";
    root.append(free);
    return;
  }

  for (const chip of chips) {
    const element = document.createElement("span");
    element.className = "currency-chip " + chip.cssClass;
    const prefix = options.signed === true ? "+" : "";
    const accessible =
      prefix + chip.amount.toLocaleString() + " " + chip.label;
    element.title = accessible;
    element.setAttribute("aria-label", accessible);

    const icon = document.createElement("span");
    icon.className = "currency-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = chip.icon;

    const value = document.createElement("span");
    value.className = "currency-value";
    value.textContent = prefix + chip.amount.toLocaleString();

    element.append(icon, value);
    root.append(element);
  }
}

export function createLocalIcon(
  iconText: string,
  accessibleLabel: string,
  className = "",
): HTMLElement {
  const icon = document.createElement("span");
  icon.className = "local-item-icon" +
    (className.length > 0 ? " " + className : "");
  icon.textContent = iconText;
  icon.title = accessibleLabel;
  icon.setAttribute("aria-label", accessibleLabel);
  return icon;
}

export function applyGradeFrame(
  element: HTMLElement,
  grade: GradeId,
): void {
  for (const id of GRADE_IDS) {
    element.classList.remove(GRADE_PRESENTATION[id].cssClass);
  }
  element.classList.add("rarity-frame", GRADE_PRESENTATION[grade].cssClass);
  element.dataset.grade = grade;
}

export function createGradeBadge(grade: GradeId): HTMLElement {
  const presentation = GRADE_PRESENTATION[grade];
  const badge = document.createElement("span");
  badge.className = "grade-badge " + presentation.cssClass;
  badge.title = presentation.label + " grade";
  badge.setAttribute("aria-label", badge.title);

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = presentation.icon;

  const label = document.createElement("span");
  label.textContent = presentation.label;

  badge.append(icon, label);
  return badge;
}
