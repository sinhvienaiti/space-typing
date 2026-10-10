import type { GradeId } from "../grades";

/**
 * Reward cards in the style of LoL ARAM Mayhem augment cards: the frame
 * colour is the tier (Silver, Gold, Prismatic), a dark chamfered panel, a big
 * icon, a serif title, a tag pill and a description with coloured keywords.
 * Cards are dealt face down and flip in one by one; keys 1-3 pick.
 * Styles: src/ui/reward-cards.css.
 */
export type RewardCardTier = "silver" | "gold" | "prismatic";

export type RewardCardInput = {
  tier: RewardCardTier;
  /** Small pill under the title, e.g. "Equipment · Silver". */
  tag: string;
  title: string;
  description?: string;
  bullets?: readonly string[];
  /** Painted art; `glyph` is shown when it is missing. */
  iconUrl?: string | null;
  glyph?: string;
  /** Painted icon on an opaque dark square: screen-blend it into the card. */
  iconDark?: boolean;
  onPick(): void;
};

/** Aluminum/Copper/Silver → Silver, Gold → Gold, Diamond → Prismatic. */
export function rewardTierForGrade(grade: GradeId): RewardCardTier {
  if (grade === "diamond") return "prismatic";
  if (grade === "gold") return "gold";
  return "silver";
}

export function rewardTierLabel(tier: RewardCardTier): string {
  return tier === "prismatic" ? "Prismatic" : tier === "gold" ? "Gold" : "Silver";
}

type Highlight = { pattern: RegExp; className: string };

/** Keyword colours: numbers gold, healing green, power violet, elements cyan. */
const HIGHLIGHTS: readonly Highlight[] = [
  { pattern: /[+-]?\d+(?:[.,]\d+)?%?(?:\s?(?:s|sec|seconds))?/y, className: "rc-num" },
  { pattern: /\b(?:max Hull|Hull|heal(?:s|ing)?|restore[sd]?|repair[s]?|Shield)\b/iy, className: "rc-heal" },
  { pattern: /\b(?:Rage|Overdrive|Quantum Core|Core|crit(?:ical)?|Relic)\b/iy, className: "rc-power" },
  { pattern: /\b(?:arc lightning|lightning|ion|plasma|frost|fire|burn|chain|pierce|missile[s]?|drone[s]?)\b/iy, className: "rc-element" },
  { pattern: /\b(?:Credits?|Alloy|Star Crystals?)\b/iy, className: "rc-coin" },
];

/** Splits text into plain runs and <b> keywords (no innerHTML). */
export function highlightKeywords(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let plain = "";
  let index = 0;
  const flush = (): void => {
    if (plain !== "") fragment.append(document.createTextNode(plain));
    plain = "";
  };
  while (index < text.length) {
    const previous = index === 0 ? " " : text[index - 1]!;
    const boundary = !/[A-Za-z0-9]/.test(previous);
    let matched = false;
    if (boundary) {
      for (const { pattern, className } of HIGHLIGHTS) {
        pattern.lastIndex = index;
        const found = pattern.exec(text);
        if (found !== null && found[0].length > 0) {
          flush();
          const node = document.createElement("b");
          node.className = className;
          node.textContent = found[0];
          fragment.append(node);
          index += found[0].length;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      plain += text[index]!;
      index += 1;
    }
  }
  flush();
  return fragment;
}

function cardElement(card: RewardCardInput, index: number): HTMLElement {
  const slot = document.createElement("div");
  slot.className = "rc-slot";
  slot.style.setProperty("--rc-deal", String(index * 140) + "ms");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "rc-card rc-" + card.tier;
  button.setAttribute("aria-keyshortcuts", String(index + 1));

  const panel = document.createElement("span");
  panel.className = "rc-panel";
  const content = document.createElement("span");
  content.className = "rc-content";

  const icon = document.createElement("span");
  icon.className = "rc-icon";
  if (card.iconUrl !== undefined && card.iconUrl !== null) {
    const image = document.createElement("img");
    image.src = card.iconUrl;
    image.alt = "";
    image.decoding = "async";
    if (card.iconDark === true) image.className = "rc-dark";
    icon.append(image);
  } else {
    const glyph = document.createElement("span");
    glyph.className = "rc-glyph";
    glyph.textContent = card.glyph ?? "✦";
    icon.append(glyph);
  }

  const title = document.createElement("strong");
  title.className = "rc-title";
  title.textContent = card.title;
  const tag = document.createElement("span");
  tag.className = "rc-tag";
  tag.textContent = card.tag;

  const description = document.createElement("span");
  description.className = "rc-desc";
  if (card.bullets !== undefined && card.bullets.length > 0) {
    const list = document.createElement("ul");
    for (const line of card.bullets) {
      const item = document.createElement("li");
      item.append(highlightKeywords(line));
      list.append(item);
    }
    description.append(list);
  } else if (card.description !== undefined) {
    description.append(highlightKeywords(card.description));
  }

  // Back face: shown while the card is dealt, then it flips over.
  const back = document.createElement("span");
  back.className = "rc-back";
  back.setAttribute("aria-hidden", "true");

  content.append(icon, title, tag, description);
  button.append(panel, content, back);
  button.addEventListener("click", () => card.onPick());

  const key = document.createElement("span");
  key.className = "rc-key";
  key.textContent = String(index + 1);
  key.setAttribute("aria-hidden", "true");

  slot.append(button, key);
  return slot;
}

/** Fills `grid` with cards; a picked card disables the rest. */
export function renderRewardCards(
  grid: HTMLElement,
  cards: readonly RewardCardInput[],
): void {
  grid.replaceChildren(
    ...cards.map((card, index) =>
      cardElement(
        {
          ...card,
          onPick: () => {
            for (const button of grid.querySelectorAll<HTMLButtonElement>(".rc-card")) {
              button.disabled = true;
            }
            card.onPick();
          },
        },
        index,
      ),
    ),
  );
  grid.classList.remove("rc-dealt", "rc-ready");
  // Next frame: start the deal-and-flip animation; then hand over to hover.
  requestAnimationFrame(() => grid.classList.add("rc-dealt"));
  window.setTimeout(
    () => grid.classList.add("rc-ready"),
    140 * Math.max(0, cards.length - 1) + 720,
  );
}

/** Keys 1-9 pick the matching card while `dialog` is open. */
export function installRewardCardKeys(
  dialog: HTMLDialogElement,
  grid: HTMLElement,
): void {
  dialog.addEventListener("keydown", (event) => {
    if (!/^[1-9]$/.test(event.key)) return;
    const cards = grid.querySelectorAll<HTMLButtonElement>(".rc-card");
    const card = cards[Number(event.key) - 1];
    if (card === undefined || card.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    card.focus();
    card.click();
  });
}
