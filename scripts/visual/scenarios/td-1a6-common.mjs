// Shared helpers for the Typing Defense 1A.6 browser scenarios (scripts/visual/scenarios/td-1a6-*.mjs,
// docs/td/BUILD_1A6.md §12 gate 8): boot td.html?sandbox=1, real CDP keys and clicks, the zoom-1 screen
// mapping of main.ts and DebugView.resize, a typist that reads the live words, the card checks (no two
// live cards overlap, none over a HUD panel, text ≥ 18 px), a collector for the page's rare events, and
// the Node replay of the page's command log (scripts/td/replay.ts: Node and Chrome reach the same hash).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_URL, gesture, out } from "./common.mjs";

export { out };
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
/** CALL_KIND of src/td/sim/stores/calls.ts, and the bright cap of each mode (MODES[mode].open in rules.ts). */
export const KIND = { power: 0, build: 1, harvest: 2, chop: 3, mine: 4, quiz: 5 };
export const CAP = { relax: 2, balanced: 3, challenge: 4, learn: 2 };
export const sizeOf = (page) => page.width + "x" + page.height;

/** td.html?sandbox=1 until the first frame is painted and the fonts are in; `mouse: false` sends no first click (keyboard-only runs). */
export async function boot(page, { mouse = true } = {}) {
  await page.goto(DEV_URL.replace(/\/$/, "") + "/td.html?sandbox=1", { settle: 300 });
  if (mouse) await gesture(page);
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  await page.eval("document.fonts.ready.then(() => true)");
  return ready;
}

/** Commands through the dev handle (logged like any other, so the run replays). */
export const send = (page, ...bodies) => page.eval(td(`for (const body of ${JSON.stringify(bodies)}) t.send(body); return true;`));
export const sandbox = (page, op, value) => send(page, value === undefined ? { t: "sandbox", op: { op } } : { t: "sandbox", op: { op, value } });
export const state = (page) => page.eval(td("return t.state();"));

/** Waits until the td() body `body` returns something truthy, polling every `every` ms for up to `ms`; returns its last value. */
export async function until(page, body, ms = 30000, every = 250) {
  const ends = Date.now() + ms;
  let value = null;
  while (Date.now() < ends) {
    value = await page.eval(td(body));
    if (value) return value;
    await page.sleep(every);
  }
  return value;
}

/** CDP fields of the command keys (key, windowsVirtualKeyCode). */
const KEYS = {
  Tab: ["Tab", 9], Enter: ["Enter", 13], Escape: ["Escape", 27], Insert: ["Insert", 45], Backslash: ["\\", 220], Backquote: ["`", 192],
  Space: [" ", 32], Delete: ["Delete", 46], Backspace: ["Backspace", 8], Minus: ["-", 189], Equal: ["=", 187], F9: ["F9", 120],
  Digit0: ["0", 48], Digit1: ["1", 49], Digit2: ["2", 50], Digit3: ["3", 51], Digit4: ["4", 52], Digit5: ["5", 53],
};

/** A trusted press of a command key by its code (Shift held with `shift`). */
export async function key(page, code, { shift = false, pause = 70 } = {}) {
  const [name, vk] = KEYS[code];
  const modifiers = shift ? 8 : 0;
  const shown = shift && code === "Backslash" ? "|" : name;
  await page.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: shown, code, windowsVirtualKeyCode: vk, modifiers });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: shown, code, windowsVirtualKeyCode: vk, modifiers });
  if (pause > 0) await page.sleep(pause);
}

/** A trusted letter press (a–z), as a keyboard sends it. */
export async function letter(page, ch) {
  const code = "Key" + ch.toUpperCase();
  const vk = ch.toUpperCase().charCodeAt(0);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, code, text: ch, unmodifiedText: ch, windowsVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch, code, windowsVirtualKeyCode: vk });
}

/** Screen point (CSS px) of a field point at zoom 1, as main.ts and DebugView.resize place the field (100 m over the room above the strip). */
export function screen(page, x, z) {
  const ui = Math.max(0.8, Math.min(1.2, Math.min(page.width / 1600, page.height / 900)));
  const bottom = 60 * Math.max(1, ui);
  const scale = Math.min(page.width, page.height - bottom) / 100;
  return { x: page.width / 2 + x * scale, y: (page.height - bottom) / 2 + z * scale };
}

/** A real click on the field point (x, z) at zoom 1. */
export async function click(page, x, z, button = "left") {
  const p = screen(page, x, z);
  await page.mouse(p.x, p.y);
  await page.mouse(p.x, p.y, "mousePressed", { button });
  await page.mouse(p.x, p.y, "mouseReleased", { button });
  await page.sleep(80);
}

/** Wheel steps over the field point (x, z) at zoom 1 (a whole screen pixel): negative zooms in (each step ×1.15). Returns that pixel. */
export async function wheel(page, x, z, steps) {
  const p = screen(page, x, z);
  const at = { x: Math.round(p.x), y: Math.round(p.y) };
  for (let k = 0; k < Math.abs(steps); k += 1) await page.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: at.x, y: at.y, deltaX: 0, deltaY: steps < 0 ? -100 : 100 });
  await page.sleep(300);
  return at;
}

/**
 * The edge arrows (BUILD_1A6 §9) after `steps` wheel steps in at the screen pixel `at` from zoom 1: the camera of
 * DebugView.resize and zoomAt is worked out here, then for each open call off the zoom-1 field's picture the
 * canvas pixel where DebugView.calls draws its arrow's middle, against the kind's colour (CALL_COLOR).
 */
export const arrows = (steps, at) => td(`
  const COLORS = ["#D9479B", "#8B5A2B", "#E0B33A", "#2F7D32", "#C98A2E", "#3B7DDD"].map((hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)));
  const canvas = document.getElementById("tdCanvas");
  const ctx = canvas.getContext("2d");
  const ratio = canvas.width / canvas.clientWidth;
  const ui = Math.max(0.8, Math.min(1.2, Math.min(innerWidth / 1600, innerHeight / 900)));
  const bottom = 60 * Math.max(1, ui);
  const halfM = 48;
  const fit = { scale: (Math.min(innerWidth, innerHeight - bottom) / (halfM * 2 + 4)) * ratio, x: canvas.width / 2, y: ((innerHeight - bottom) / 2) * ratio };
  let [scale, ox, oy] = [fit.scale, fit.x, fit.y];
  for (let k = 0; k < ${steps}; k += 1) {
    const f = Math.max(fit.scale, Math.min(2.5 * fit.scale, scale * 1.15)) / scale;
    scale *= f;
    ox = ${at.x} * ratio - f * (${at.x} * ratio - ox);
    oy = ${at.y} * ratio - f * (${at.y} * ratio - oy);
    const room = scale * 50;
    ox = Math.max(fit.x - room, Math.min(fit.x + room, ox));
    oy = Math.max(fit.y - room, Math.min(fit.y + room, oy));
  }
  const half = fit.scale * (halfM + 2) - 22 * ratio;
  return t.state().calls.filter((c) => c.open).map((c) => {
    const dx = ox + c.x * scale - fit.x;
    const dy = oy + c.z * scale - fit.y;
    const out = Math.max(Math.abs(dx), Math.abs(dy)) / half;
    if (out <= 1) return { id: c.id, kind: c.kind, edge: false };
    const [x, y] = [Math.round(fit.x + dx / out), Math.round(fit.y + dy / out)];
    const pixel = Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    return { id: c.id, kind: c.kind, edge: true, x, y, pixel, match: pixel.every((v, k) => Math.abs(v - COLORS[c.kind][k]) <= 10) };
  });`);

/** Live words with their call's kind (−1: the call is gone). */
export const WORDS = td(`const kinds = new Map(t.state().calls.map((c) => [c.id, c.kind])); return t.liveWords().map((w) => ({ ...w, kind: kinds.has(w.call) ? kinds.get(w.call) : -1 }));`);

/** The page's rare events, collected across polls (the page keeps only its last 400). */
export class Seen {
  constructor() {
    this.keys = new Set();
    this.list = [];
  }

  async poll(page) {
    for (const event of (await page.eval(td("return t.events();"))) ?? []) {
      const k = JSON.stringify(event);
      if (this.keys.has(k)) continue;
      this.keys.add(k);
      this.list.push(event);
    }
    return this.list;
  }

  of(type) {
    return this.list.filter((event) => event.t === type);
  }

  /** Kind of call id `call`, from its events. */
  kindOf(call) {
    return this.list.find((event) => (event.t === "call" || event.t === "callEnd") && event.call === call)?.kind ?? -1;
  }

  /** Words typed (wordHit) on calls of `kind`. */
  hits(kind) {
    return this.of("wordHit").filter((event) => this.kindOf(event.call) === kind);
  }
}

/**
 * Types for up to `ms` at about `wpm` (or until `stop(words)` is true): the locked word's next letter, else the
 * first letter of the oldest live word whose call kind is in `kinds` (any with null). With `sloppy` ({ left: n }, kept
 * by the caller across calls) the next n words get two wrong keys at their third letter (Ẩu: into the review
 * book). Returns the keys sent and the words finished.
 */
export async function typeFor(page, ms, { wpm = 45, kinds = null, sloppy = null, stop = null, seen = null } = {}) {
  const gap = 60000 / (wpm * 5);
  const ends = Date.now() + ms;
  let keys = 0;
  let finished = 0;
  while (Date.now() < ends) {
    const at = Date.now();
    const words = (await page.eval(WORDS)) ?? [];
    if (seen !== null) await seen.poll(page);
    if (stop !== null && (await stop(words))) break;
    const locked = words.find((word) => word.locked);
    const pool = words.filter((word) => !word.locked && (kinds === null || kinds.includes(word.kind))).sort((a, b) => b.age - a.age);
    if (locked !== undefined) {
      if (sloppy !== null && sloppy.left > 0 && locked.typed === 2 && locked.text.length > 3 && (sloppy.wrongs ?? 0) < 2) {
        const right = locked.text[2];
        await letter(page, right === "z" || right === "q" ? "x" : "q");
        sloppy.wrongs = (sloppy.wrongs ?? 0) + 1;
      } else {
        await letter(page, locked.text[locked.typed]);
        if (locked.typed + 1 === locked.text.length) {
          finished += 1;
          if (sloppy !== null && sloppy.wrongs === 2) [sloppy.left, sloppy.wrongs] = [sloppy.left - 1, 0];
        }
      }
      keys += 1;
    } else if (pool.length > 0) {
      await letter(page, pool[0].text[0]);
      keys += 1;
    }
    await page.sleep(Math.max(0, gap - (Date.now() - at)));
  }
  return { keys, finished };
}

/**
 * What the screen shows (TK 23.4; BUILD_1A6 §9): live word cards (opacity > 0.05, not on their way out), the HUD
 * panels, and the calls: bright, dim (open, out of every ring), waiting (queued, or open and dim inside a ring:
 * held back by the cap or the budget).
 */
export const LOOK = td(`
  const cards = [...document.querySelectorAll(".td-card")].filter((el) => Number(el.style.opacity) > 0.05 && !el.classList.contains("is-gone"))
    .map((el) => { const r = el.getBoundingClientRect(); return { text: el.textContent, mean: el.querySelector(".td-card-mean")?.textContent ?? "", cls: el.className, left: r.left, top: r.top, right: r.right, bottom: r.bottom, font: parseFloat(getComputedStyle(el).fontSize) }; });
  const panels = [...document.querySelectorAll(".td-panel")].map((el) => [el.className.replace("td-panel ", ""), el.getBoundingClientRect()])
    .filter(([, r]) => r.width > 0 && r.height > 0).map(([name, r]) => ({ name, left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
  const s = t.state();
  const level = s.buildings.find((b) => b.def === "keep").level;
  const out = Math.min(level, 4);
  const ring = (x, z) => s.agents.slice(0, out).some((a, k) => (a.x - x) ** 2 + (a.z - z) ** 2 <= (k === 0 ? 100 : 36));
  const live = s.calls;
  return {
    cards, panels, phase: s.phase, mode: s.mode, tick: s.tick,
    bright: live.filter((c) => c.bright).length,
    dim: live.filter((c) => c.open && !c.bright).length,
    waiting: live.filter((c) => !c.bright && (!c.open || ring(c.x, c.z))).map((c) => c.id),
    brightIds: live.filter((c) => c.bright).map((c) => c.id),
    words: t.liveWords(), ui: t.ui(), review: s.review, knowledge: s.knowledge, typedTicks: t.typing().typedTicks,
  };`);

const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

export const cardStats = () => ({ samples: 0, cards: 0, small: 0, overlaps: [], overHud: [], offScreen: 0, maxBright: 0 });

/** One look, its cards checked (`hud`: at zoom 1, against the HUD panels too) into `stats`. */
export async function look(page, stats, { hud = true } = {}) {
  const v = await page.eval(LOOK);
  if (v === null) return null;
  stats.samples += 1;
  stats.cards += v.cards.length;
  stats.maxBright = Math.max(stats.maxBright, v.bright);
  for (let i = 0; i < v.cards.length; i += 1) {
    const card = v.cards[i];
    if (card.font < 18) stats.small += 1;
    if (card.left < 0 || card.top < 0 || card.right > page.width || card.bottom > page.height) stats.offScreen += 1;
    for (let j = i + 1; j < v.cards.length; j += 1) {
      const other = v.cards[j];
      const box = (c) => [c.cls.replace("td-card", "").trim(), Math.round(c.left), Math.round(c.top), Math.round(c.right), Math.round(c.bottom)].join(" ");
      if (overlap(card, other) > 1) stats.overlaps.push(card.text + " [" + box(card) + "] / " + other.text + " [" + box(other) + "] tick " + v.tick);
    }
    if (hud) for (const p of v.panels) if (overlap(card, p) > 1) stats.overHud.push(p.name + ": " + card.text);
  }
  return v;
}

export const cardsClean = (stats) => stats.overlaps.length === 0 && stats.overHud.length === 0 && stats.small === 0 && stats.offScreen === 0;
export const cardSummary = (stats) => ({ ...stats, overlaps: stats.overlaps.slice(0, 6), overHud: stats.overHud.slice(0, 6) });

/** Writes the page's run (flags, tick, hash, log) to OUT_DIR and replays it on Node: { match, … }. */
export async function replayOnNode(page, name) {
  const final = await page.eval(td("return { flags: t.flags(), tick: t.state().tick, hash: t.hash(), log: t.log() };"));
  const file = out(name + "-replay-" + sizeOf(page) + ".json");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ ...final?.flags, tick: final?.tick, hash: final?.hash, log: final?.log ?? [] }));
  try {
    return { file, commands: final?.log?.length ?? 0, ...JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(ROOT, "scripts/td/replay.ts"), file], { cwd: ROOT, encoding: "utf8" })) };
  } catch (error) {
    return { file, match: false, error: String(error.stdout || error.message).trim().slice(0, 400) };
  }
}

/** The checks every scenario ends with. */
export const consoleChecks = (page) => ({
  noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
  noExceptions: page.exceptions.length === 0,
});

export function finish(page, checks, rest) {
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, ...rest, logs: page.logs.slice(0, 10), exceptions: page.exceptions.slice(0, 5) };
}
