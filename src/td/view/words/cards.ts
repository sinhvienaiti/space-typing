/**
 * Word cards (docs/td/BUILD_NOW.md §5.2, TK 23.4; BUILD_1A6 §9): a pool of
 * 20 DOM cards over the canvas. A frame changes only transform and opacity;
 * text and classes change when a word's state does. A bright call's word
 * sits over its NPC (or building), its colour the call's kind; it grows when
 * locked with the typed part in jade, shakes on a wrong key, and leaves when
 * typed (with the grade's own name, TK 0.6, stamped where it was) or folds
 * when its call dims or closes. A power call's bar is its 6 s. Columns part
 * at once and ease back on the spring, so no frame shows two cards overlapping.
 */
import type { Grade } from "../../content/types";
import type { RareEvent } from "../../sim/events";
import type { World } from "../../sim/world";
import { wordText } from "../../typing/decks";
import { KEY } from "../../typing/router";
import { COLUMN, columnHeights, spreadLanes, type LaneBox } from "./lanes";

export const GRADE_NAME: Readonly<Record<Grade, string>> = { flash: "Chớp", perfect: "Hoàn hảo", good: "Tốt", ok: "Vừa", sloppy: "Ẩu" };
/** By call kind (CALL_KIND): power, build, harvest, chop, mine, quiz. */
export const CALL_COLOR = ["#D9479B", "#8B5A2B", "#E0B33A", "#2F7D32", "#C98A2E", "#3B7DDD"] as const;

const POOL = 20;
const STAMPS = 10;
const MS = { hit: 220, fold: 200, stamp: 900, shake: 120, pink: 150, spring: 150 } as const;
/** Cards hang 1.6 m over the one who calls (a building's call over its middle). */
const ROOF_M = 1.6;
const SAFE = { side: 8, top: 64, bottom: 8 } as const;

type Leave = "" | "hit" | "fold";
type Card = {
  el: HTMLElement; text: HTMLElement; bar: HTMLElement; id: number; slot: number; b: number; word: string; tier: number;
  typed: number; pink: boolean; late: boolean; lockedAt: number; half: number; height: number; x: number; y: number; seen: number;
  leave: Leave; leaveAt: number; tx: number; ty: number; shakeUntil: number; pinkUntil: number;
};
type Stamp = { el: HTMLElement; at: number; x: number; y: number; half: number };

function element(root: HTMLElement, className: string, html = ""): HTMLElement {
  const el = root.appendChild(Object.assign(document.createElement("div"), { className, innerHTML: html }));
  el.style.opacity = "0";
  return el;
}

const place = (el: HTMLElement, x: number, y: number, scale: string, opacity: number): void => {
  el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + scale + ")";
  el.style.opacity = opacity.toFixed(2);
};

export class WordCards {
  private readonly cards: Card[];
  private readonly stamps: Stamp[];
  private readonly byId = new Map<number, Card>();
  private readonly offsets = new Map<number, number>();
  private last = 0;
  private frame = 0;

  constructor(root: HTMLElement, private readonly project: (x: number, z: number) => { x: number; y: number }) {
    this.cards = Array.from({ length: POOL }, () => {
      const el = element(root, "td-card", '<i class="td-card-dot"></i><span></span><span class="td-card-bar"></span>');
      return { el, text: el.children[1] as HTMLElement, bar: el.children[2] as HTMLElement, id: -1, leave: "" } as Card;
    });
    this.stamps = Array.from({ length: STAMPS }, () => ({ el: element(root, "td-stamp"), at: -1e9, x: 0, y: 0, half: 0 }));
  }

  /** This frame's events: a wrong key shakes its card; a typed word sends the card off and stamps its grade. */
  read(events: readonly RareEvent[], w: World, now: number): void {
    for (const event of events) {
      const card = "word" in event ? this.byId.get(event.word) : undefined;
      if (card === undefined) continue;
      if (event.t === "wordKey" && event.result === KEY.wrong) {
        card.shakeUntil = now + MS.shake;
        card.pinkUntil = now + MS.pink;
      } else if (event.t === "wordHit") {
        this.byId.delete(event.word);
        const c = w.calls.slotOf(event.call);
        const to = c >= 0 ? this.project(w.calls.x[c]!, w.calls.z[c]!) : card;
        Object.assign(card, { leave: "hit", leaveAt: now, tx: to.x, ty: to.y });
        const stamp = this.stamps.reduce((oldest, next) => (next.at < oldest.at ? next : oldest));
        stamp.el.textContent = GRADE_NAME[event.grade];
        stamp.el.className = "td-stamp is-" + event.grade;
        Object.assign(stamp, { at: now, x: card.x, y: card.y - 30, half: stamp.el.offsetWidth / 2 });
      }
    }
  }

  private bind(card: Card, w: World, s: number, id: number): void {
    const c = w.words.call[s]!;
    Object.assign(card, { id, b: c, word: wordText(w.typing.deck, w.words.word[s]!), typed: -1, late: false, lockedAt: -1, leave: "", shakeUntil: 0, pinkUntil: 0 });
    card.el.style.setProperty("--fam", CALL_COLOR[w.calls.kind[c]!]!);
    card.el.style.setProperty("--agent", "transparent");
    card.el.className = "td-card";
    this.byId.set(id, card);
  }

  /** Letters as spans: typed (t), the first one or two by tier (l), the next after a wrong key (p). */
  private render(card: Card, typed: number, pink: boolean, tier: number): void {
    card.tier = tier;
    card.text.innerHTML = [...card.word]
      .map((ch, k) => {
        const kind = (k < typed ? " t" : "") + (k < card.tier ? " l" : "") + (pink && k === typed ? " p" : "");
        return kind === "" ? ch : '<span class="' + kind.trim() + '">' + ch + "</span>";
      })
      .join("");
    Object.assign(card, { typed, pink, half: card.el.offsetWidth / 2, height: card.el.offsetHeight });
  }

  draw(w: World, now: number, width: number, height: number): void {
    const W = w.words;
    const lock = w.typing.router.lock;
    const dt = Math.min(100, now - this.last);
    this.last = now;
    this.frame += 1;
    const lanes = new Map<number, Card[]>();
    for (let s = 0; s < W.top; s += 1) {
      if (W.used[s] === 0) continue;
      let card = this.byId.get(W.id(s));
      if (card === undefined) {
        card = this.cards.find((free) => free.id < 0);
        if (card === undefined) continue;
        this.bind(card, w, s, W.id(s));
      }
      card.slot = s;
      card.seen = this.frame;
      const pink = now < card.pinkUntil;
      // Two keys tell either word of a tier-2 pair (TK 6.5): the older one, dealt at tier 1, underlines two letters too.
      const tier = w.typing.letters.partner[w.typing.deck.letters[w.typing.deck.start[W.word[s]!]!]!]! >= 0 ? 2 : W.tier[s]!;
      if (W.typed[s] !== card.typed || pink !== card.pink || tier !== card.tier) this.render(card, W.typed[s]!, pink, tier);
      card.lockedAt = lock !== s ? -1 : card.lockedAt < 0 ? w.tick : card.lockedAt;
      const c = W.call[s]!;
      const late = w.calls.expire[c]! >= 0 && w.calls.expire[c]! - w.tick < 1.5 * 60;
      if (late !== card.late) card.el.classList.toggle("is-late", (card.late = late));
      card.el.classList.toggle("is-locked", lock === s);
      (lanes.get(c) ?? lanes.set(c, []).get(c)!).push(card);
    }
    this.layout(w, lanes, lock, now, dt, width, height);
    for (const card of this.cards) {
      // A word gone with no result read (the run was reset) folds away.
      if (card.id >= 0 && card.leave === "" && card.seen !== this.frame) {
        this.byId.delete(card.id);
        Object.assign(card, { leave: "fold", leaveAt: now });
      }
      if (card.id >= 0 && card.leave !== "") this.leaving(card, now);
    }
    for (const stamp of this.stamps) {
      const p = Math.min(1, (now - stamp.at) / MS.stamp);
      if (p < 1 || stamp.el.style.opacity !== "0.00") place(stamp.el, stamp.x - stamp.half, stamp.y - 28 * p, "1", 1 - p * p);
    }
  }

  private layout(w: World, lanes: Map<number, Card[]>, lock: number, now: number, dt: number, width: number, height: number): void {
    const W = w.words;
    const C = w.calls;
    const boxes: LaneBox[] = [];
    const columns: { b: number; cards: Card[]; heights: number[]; roofY: number }[] = [];
    for (const [c, cards] of lanes) {
      // A call's word does not run out: it sits on the roof, never rises with a clock.
      const gap = Math.max(COLUMN.gap, Math.ceil(1.2 * Math.max(...cards.map((card) => card.height))) + 4);
      const heights = columnHeights(cards.map(() => 0), cards.map(() => 1), [], gap);
      const roof = this.project(C.x[c]!, C.z[c]! - ROOF_M);
      const tallest = heights[heights.length - 1]! + Math.max(...cards.map((card) => card.height));
      const roofY = Math.min(height - SAFE.bottom, Math.max(roof.y, SAFE.top + tallest));
      boxes.push({ x: roof.x, top: roofY - tallest, bottom: roofY, half: Math.max(...cards.map((card) => (card.slot === lock ? card.half * 1.2 + 18 : card.half))) + 9 });
      columns.push({ b: c, cards, heights, roofY });
    }
    const target = spreadLanes(boxes, SAFE.side, width - SAFE.side, []);
    columns.forEach((column, index) => {
      const was = this.offsets.get(column.b) ?? target[index]!;
      const offset = Math.abs(target[index]!) >= Math.abs(was) ? target[index]! : was + (target[index]! - was) * (1 - Math.exp(-dt / MS.spring));
      this.offsets.set(column.b, offset);
      column.cards.forEach((card, k) => {
        const s = card.slot;
        const typing = lock === s && W.typed[s]! >= 2;
        const expire = C.expire[column.b]!;
        card.x = boxes[index]!.x + offset + (typing ? 18 : 0) + (now < card.shakeUntil ? Math.sin(now * 0.25) * 3 : 0);
        card.y = column.roofY - column.heights[k]! - card.height;
        card.bar.style.transform = "scaleX(" + (expire < 0 ? 0 : Math.max(0, (expire - w.tick) / Math.max(1, expire - C.born[column.b]!))).toFixed(3) + ")";
        place(card.el, card.x - card.half, card.y, typing ? "1.2" : lock === s ? "1.1" : "1", lock >= 0 && lock !== s ? 0.7 : 1);
      });
    });
  }

  private leaving(card: Card, now: number): void {
    const p = Math.min(1, (now - card.leaveAt) / MS[card.leave as "hit" | "fold"]);
    if (p >= 1) {
      Object.assign(card, { id: -1, leave: "" });
      card.el.style.opacity = "0";
    } else if (card.leave === "hit") place(card.el, card.x + (card.tx - card.x) * p - card.half, card.y + (card.ty - card.y) * p, (1 - 0.7 * p).toFixed(3), 1 - 0.4 * p);
    else place(card.el, card.x - card.half, card.y, "1," + (1 - p).toFixed(3), 1 - p);
  }
}
