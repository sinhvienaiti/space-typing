/**
 * Style Shop: avatars, frames, titles, banners, ship paint, engine trails,
 * shot colours, plus packs and boosters. Hovering a card tries it on in the
 * preview; buying wears it at once. Purchases and saving live in main.ts
 * (deps); this file only draws and asks.
 */
import { BOOSTERS, BUNDLES, COSMETIC_SLOTS, SLOT_LABELS, cosmeticsInSlot, type CosmeticItem, type CosmeticPrice, type CosmeticSlot } from "../cosmetics/catalog";
import { bundleBuysToday, cosmeticStatus, resolveLook, type CosmeticsProgress, type CosmeticsState, type Look, type Wallet } from "../cosmetics/state";
import { bannerBackground, loadCosmeticArt, paintFilter, renderAvatar, renderTitle } from "./cosmetic-look";
import { holoConfirm } from "./holo-confirm";
import { iconSvg } from "./icons";

export type StyleShopDeps = {
  state(): CosmeticsState;
  progress(): CosmeticsProgress;
  wallet(): Wallet;
  pilotName(): string;
  shipArt(): string;
  gameDay(): number;
  /** Why buying is not possible right now, or null. */
  blocker(): string | null;
  buy(id: string): Promise<string | null>;
  equip(slot: CosmeticSlot, id: string | null): Promise<void>;
  buyBundle(id: string): Promise<string | null>;
  buyBooster(id: string): Promise<string | null>;
  sound: { tab(): void; reveal(big: boolean): void; error(): void };
  notice(message: string): void;
};

type Tab = "featured" | CosmeticSlot | "packs";
const TABS: ReadonlyArray<[Tab, string]> = [["featured", "Featured"], ...COSMETIC_SLOTS.map((slot) => [slot, SLOT_LABELS[slot]] as [Tab, string]), ["packs", "Packs & boosters"]];
const RARITY_LABEL = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" } as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function coin(kind: "credits" | "crystal", amount: number): HTMLElement {
  const element = el("span", "ss-coin " + kind, amount.toLocaleString());
  const label = amount.toLocaleString() + (kind === "credits" ? " Credits" : " Star Crystals");
  element.title = label;
  element.setAttribute("aria-label", label);
  return element;
}

function priceLabel(price: CosmeticPrice): HTMLElement {
  const box = el("span", "ss-price");
  if (price.credits > 0) box.append(coin("credits", price.credits));
  if (price.starCrystal > 0) box.append(coin("crystal", price.starCrystal));
  if (price.credits === 0 && price.starCrystal === 0) box.append(el("span", "ss-coin", "Free"));
  return box;
}

/** Six shop items a day, seeded by the game day (the same for every pilot). */
function featured(day: number): CosmeticItem[] {
  const pool = COSMETIC_SLOTS.flatMap((slot) => cosmeticsInSlot(slot)).filter((item) => item.unlock.kind === "shop");
  let seed = (day * 2654435761) >>> 0 || 1;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const picks: CosmeticItem[] = [];
  const copy = [...pool];
  while (picks.length < 6 && copy.length > 0) picks.push(copy.splice(Math.floor(random() * copy.length), 1)[0]!);
  return picks;
}

export function installStyleShop(deps: StyleShopDeps): { open(tab?: Tab): void; refresh(): void } {
  const dialog = el("dialog", "settings-dialog ss-dialog");
  dialog.id = "styleShopDialog";
  dialog.setAttribute("aria-labelledby", "styleShopTitle");
  const shell = el("form", "ss-shell");
  shell.method = "dialog";

  const head = el("header", "ss-head");
  const titleBox = el("div", "ss-title");
  titleBox.append(el("p", "eyebrow", "Hangar boutique · looks only, never power"));
  const heading = el("h2", "", "Style Shop");
  heading.id = "styleShopTitle";
  titleBox.append(heading);
  const wallet = el("div", "ss-wallet");
  const close = el("button", "ss-close", "×");
  close.type = "submit";
  close.value = "close";
  close.setAttribute("aria-label", "Close Style Shop");
  head.append(titleBox, wallet, close);

  const body = el("div", "ss-body");
  const preview = el("aside", "ss-preview");
  const main = el("section", "ss-main");
  const tabs = el("nav", "ss-tabs");
  tabs.setAttribute("role", "tablist");
  const grid = el("div", "ss-grid");
  main.append(tabs, grid);
  body.append(preview, main);
  shell.append(head, body);
  dialog.append(shell);
  document.body.append(dialog);

  let tab: Tab = "featured";
  let trying: CosmeticItem | null = null;
  let busy = false;

  function look(): Look {
    const base = resolveLook(deps.state(), deps.progress());
    if (trying === null) return base;
    return { ...base, [trying.slot]: trying } as Look;
  }

  function renderWallet(): void {
    const money = deps.wallet();
    wallet.replaceChildren(coin("credits", money.credits), coin("crystal", money.starCrystal));
  }

  function renderPreview(): void {
    const current = look();
    preview.replaceChildren();
    const card = el("div", "ss-pilot");
    card.style.background = bannerBackground(current.banner);
    const text = el("div", "ss-pilot-text");
    text.append(el("strong", "", deps.pilotName()), renderTitle(current.title));
    card.append(renderAvatar(current.avatar, current.frame, 76), text);

    const stage = el("div", "ss-ship-stage");
    const ship = el("img", "ss-ship");
    ship.src = deps.shipArt();
    ship.alt = "";
    const filter = paintFilter(current.paint);
    if (filter !== null) ship.style.filter = filter;
    const flame = el("span", "ss-flame");
    if (current.trail !== null) {
      flame.style.setProperty("--hot", current.trail.hot);
      flame.style.setProperty("--plume", current.trail.plume);
    }
    const beam = el("span", "ss-beam");
    if (current.shot !== null) {
      beam.style.setProperty("--shot", current.shot.primary);
      beam.style.setProperty("--shot2", current.shot.secondary);
    }
    stage.append(beam, flame, ship);

    const worn = el("dl", "ss-worn");
    for (const slot of COSMETIC_SLOTS) {
      const item = current[slot];
      worn.append(el("dt", "", SLOT_LABELS[slot]), el("dd", item === null ? "stock" : "cl-rarity-" + item.rarity, item === null ? "Ship default" : item.name));
    }
    preview.append(card, stage);
    const booster = deps.state().booster;
    if (booster !== null) preview.append(el("p", "ss-booster-on", "⚡ Credit Booster +" + Math.round(booster.bonus * 100) + "% · " + booster.clearsLeft + " clears left"));
    preview.append(worn);
    if (trying !== null) preview.append(el("p", "ss-trying", "Trying on: " + trying.name));
  }

  function renderTabs(): void {
    tabs.replaceChildren();
    for (const [id, label] of TABS) {
      const button = el("button", "ss-tab" + (tab === id ? " on" : ""), label);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(tab === id));
      button.addEventListener("click", () => {
        if (tab === id) return;
        tab = id;
        trying = null;
        deps.sound.tab();
        render();
      });
      tabs.append(button);
    }
  }

  function thumb(item: CosmeticItem): HTMLElement {
    const box = el("div", "ss-thumb");
    const current = resolveLook(deps.state(), deps.progress());
    if (item.slot === "avatar") box.append(renderAvatar(item, current.frame, 64));
    else if (item.slot === "frame") box.append(renderAvatar(current.avatar, item, 64));
    else if (item.slot === "title") box.append(renderTitle(item));
    else if (item.slot === "banner") {
      const swatch = el("span", "ss-banner-swatch");
      swatch.style.background = bannerBackground(item);
      box.append(swatch);
    } else if (item.slot === "paint") {
      const ship = el("img", "ss-thumb-ship");
      ship.src = deps.shipArt();
      ship.alt = "";
      ship.style.filter = paintFilter(item) ?? "";
      box.append(ship);
    } else if (item.slot === "trail") {
      const flame = el("span", "ss-flame ss-flame-thumb");
      flame.style.setProperty("--hot", item.hot);
      flame.style.setProperty("--plume", item.plume);
      box.append(flame);
    } else {
      const beam = el("span", "ss-beam ss-beam-thumb");
      beam.style.setProperty("--shot", item.primary);
      beam.style.setProperty("--shot2", item.secondary);
      box.append(beam);
    }
    return box;
  }

  function itemCard(item: CosmeticItem): HTMLElement {
    const state = deps.state();
    const status = cosmeticStatus(item, state, deps.progress());
    const worn = resolveLook(state, deps.progress())[item.slot]?.id === item.id;
    const card = el("article", "ss-card cl-rarity-" + item.rarity + (worn ? " worn" : ""));
    card.tabIndex = 0;
    const info = el("div", "ss-info");
    info.append(el("span", "ss-rarity", RARITY_LABEL[item.rarity] + " · " + SLOT_LABELS[item.slot].replace(/s$/, "")), el("strong", "", item.name), el("small", "", item.blurb));
    const action = el("button", "ss-action");
    action.type = "button";
    if (worn) {
      action.textContent = "Equipped";
      action.classList.add("is-worn");
      // Ship slots can go back to the ship's own look.
      if (item.slot === "paint" || item.slot === "trail" || item.slot === "shot") {
        action.textContent = "Equipped · remove";
        action.addEventListener("click", () => void run(() => deps.equip(item.slot, null).then(() => null)));
      } else action.disabled = true;
    } else if (status.kind === "owned") {
      action.textContent = "Equip";
      action.addEventListener("click", () => void run(() => deps.equip(item.slot, item.id).then(() => null)));
    } else if (status.kind === "buyable") {
      action.append(el("span", "", "Buy"), priceLabel(status.price));
      const money = deps.wallet();
      if (money.credits < status.price.credits || money.starCrystal < status.price.starCrystal) action.classList.add("short");
      action.addEventListener("click", () => void purchase(item, status.price));
    } else {
      action.innerHTML = iconSvg("lock", "ss-lock") + "<span></span>";
      action.querySelector("span")!.textContent = status.reason;
      action.disabled = true;
      action.classList.add("locked");
    }
    card.append(thumb(item), info, action);
    const tryOn = () => {
      if (trying?.id === item.id) return;
      trying = item;
      renderPreview();
    };
    card.addEventListener("pointerenter", tryOn);
    card.addEventListener("focus", tryOn);
    card.addEventListener("pointerleave", () => {
      trying = null;
      renderPreview();
    });
    return card;
  }

  async function run(action: () => Promise<string | null>): Promise<void> {
    if (busy) return;
    const blocked = deps.blocker();
    if (blocked !== null) {
      deps.sound.error();
      deps.notice(blocked);
      return;
    }
    busy = true;
    try {
      const error = await action();
      if (error !== null) {
        deps.sound.error();
        deps.notice(error);
      }
    } finally {
      busy = false;
      render();
    }
  }

  async function purchase(item: CosmeticItem, price: CosmeticPrice): Promise<void> {
    if (price.starCrystal > 0 || price.credits >= 2000) {
      const ok = await holoConfirm({
        title: "Buy " + item.name + "?",
        message: RARITY_LABEL[item.rarity] + " " + SLOT_LABELS[item.slot].replace(/s$/, "").toLowerCase() + " for " + [price.credits > 0 ? price.credits.toLocaleString() + " Credits" : "", price.starCrystal > 0 ? price.starCrystal + " Star Crystals" : ""].filter(Boolean).join(" + ") + ". You wear it straight away.",
        confirmLabel: "Buy",
        icon: "info",
      });
      if (!ok) return;
    }
    await run(async () => {
      const error = await deps.buy(item.id);
      if (error === null) {
        deps.sound.reveal(item.rarity === "epic" || item.rarity === "legendary");
        deps.notice("✓ " + item.name + " unlocked and equipped");
      }
      return error;
    });
  }

  function renderPacks(): void {
    grid.append(el("h3", "ss-section", "Packs · discounted bundles, limited per day"));
    const day = deps.gameDay();
    for (const bundle of BUNDLES) {
      const left = bundle.dailyLimit - bundleBuysToday(deps.state(), bundle.id, day);
      const card = el("article", "ss-card ss-pack");
      const icon = el("div", "ss-thumb ss-pack-icon");
      icon.innerHTML = iconSvg(bundle.icon, "ss-pack-svg");
      const info = el("div", "ss-info");
      const value = el("span", "ss-was", "Worth " + bundle.value.toLocaleString());
      info.append(el("span", "ss-rarity", left > 0 ? left + " left today" : "Sold out today"), el("strong", "", bundle.name), el("small", "", bundle.blurb), value);
      const action = el("button", "ss-action");
      action.type = "button";
      action.append(el("span", "", "Buy"), priceLabel(bundle.price));
      action.disabled = left <= 0;
      action.addEventListener("click", () =>
        void run(async () => {
          const error = await deps.buyBundle(bundle.id);
          if (error === null) {
            deps.sound.reveal(false);
            deps.notice("✓ " + bundle.name + " added to your inventory");
          }
          return error;
        }),
      );
      card.append(icon, info, action);
      grid.append(card);
    }
    grid.append(el("h3", "ss-section", "Boosters · more Credits from stage clears"));
    const active = deps.state().booster;
    for (const booster of BOOSTERS) {
      const card = el("article", "ss-card ss-pack cl-rarity-" + (booster.creditBonus >= 1 ? "legendary" : "epic"));
      const icon = el("div", "ss-thumb ss-pack-icon");
      icon.innerHTML = iconSvg(booster.icon, "ss-pack-svg");
      const info = el("div", "ss-info");
      const running = active?.id === booster.id ? " · running, " + active.clearsLeft + " clears left" : "";
      info.append(el("span", "ss-rarity", "Booster" + running), el("strong", "", booster.name), el("small", "", booster.blurb));
      const action = el("button", "ss-action");
      action.type = "button";
      action.append(el("span", "", active?.id === booster.id ? "Extend" : "Activate"), priceLabel(booster.price));
      action.disabled = active !== null && active.id !== booster.id;
      action.addEventListener("click", () =>
        void run(async () => {
          const error = await deps.buyBooster(booster.id);
          if (error === null) {
            deps.sound.reveal(true);
            deps.notice("⚡ " + booster.name + " active");
          }
          return error;
        }),
      );
      card.append(icon, info, action);
      grid.append(card);
    }
  }

  function renderGrid(): void {
    grid.replaceChildren();
    grid.scrollTop = 0;
    if (tab === "packs") {
      renderPacks();
      return;
    }
    const items = tab === "featured" ? featured(deps.gameDay()) : cosmeticsInSlot(tab);
    if (tab === "featured") grid.append(el("h3", "ss-section", "Today's picks · new selection every day (UTC)"));
    for (const item of items) grid.append(itemCard(item));
    if (tab === "featured") {
      grid.append(el("h3", "ss-section", "Earn by playing"));
      const earned = COSMETIC_SLOTS.flatMap((slot) => cosmeticsInSlot(slot)).filter((item) => item.unlock.kind === "stage" || item.unlock.kind === "streak");
      for (const item of earned.slice(0, 6)) grid.append(itemCard(item));
    }
  }

  function render(): void {
    renderWallet();
    renderTabs();
    renderPreview();
    renderGrid();
  }

  void loadCosmeticArt().then(() => {
    if (dialog.open) render();
  });

  return {
    open(next) {
      tab = next ?? "featured";
      trying = null;
      render();
      if (!dialog.open) dialog.showModal();
    },
    refresh() {
      if (dialog.open) render();
    },
  };
}
