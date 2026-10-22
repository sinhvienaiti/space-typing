/**
 * Helpers for the Typing Defense typing tests: the real vocabulary read from
 * shared/vocabulary (BUILD_NOW §3.5), small decks of chosen words, worlds
 * with assisted buildings, and keys sent the way the input sends them.
 */
import { readFileSync } from "node:fs";
import { deckFromLevels, VOCAB_LEVELS } from "../../src/td/app/vocab";
import type { CommandBody } from "../../src/td/sim/commands";
import type { RareEvent } from "../../src/td/sim/events";
import { step, type World, type WorldOptions } from "../../src/td/sim/world";
import { compileDeck, wordText, type Deck } from "../../src/td/typing/decks";
import { arrive, build, ready, send, world } from "./fixtures";

const levels = new Map<number, { id: string; en: string }[]>();
const level = (n: number) => {
  if (!levels.has(n)) levels.set(n, JSON.parse(readFileSync(new URL("../../../../shared/vocabulary/levels/" + String(n).padStart(3, "0") + ".json", import.meta.url), "utf8")).entries);
  return levels.get(n)!;
};

/** Shared vocabulary levels 1–5 in one deck, as the page compiles it. */
export const realDeck = (): Deck => deckFromLevels(Array.from({ length: VOCAB_LEVELS }, (_, index) => level(index + 1)));

/** The real words of levels 1..max, a–z only, as typingText leaves them. */
export const realWords = (max: number): { text: string; level: number }[] =>
  Array.from({ length: max }, (_, index) => level(index + 1).map((entry) => ({ text: entry.en.trim().toLowerCase().replace(/[^a-z]/g, ""), level: index + 1 }))).flat();

export const smallDeck = (words: readonly string[]): Deck => compileDeck(words.map((text, index) => ({ id: "w" + index, text, level: 1 })));

export const letter = (ch: string): number => ch.charCodeAt(0) - 97;

/** Live words: slot, text, building slot, typed. */
export function live(w: World): { s: number; text: string; b: number; typed: number }[] {
  return w.words.live().map((s) => ({ s, text: wordText(w.typing.deck, w.words.word[s]!), b: w.words.building[s]!, typed: w.words.typed[s]! }));
}

/** Sends `text` one key a tick (or all in one tick with `sameTick`), `ms` apart on the key clock; returns the rare events. */
export function type(w: World, text: string, ms = 150, sameTick = false): RareEvent[] {
  const from = w.events.rare.length;
  const keys: CommandBody[] = [...text].map((ch, index) => ({ t: "key", letter: letter(ch), atMs: w.tick * 16 + index * ms }));
  if (sameTick) send(w, ...keys);
  else for (const key of keys) send(w, key);
  return w.events.rare.slice(from);
}

/**
 * A sandbox world with the given deck and buildings, assisted by agents 0, 1,
 * … in order: every construction done, every agent arrived (returns on the
 * tick after the last arrival). `init` runs on the new world first.
 */
export function assisted(options: Partial<WorldOptions>, spots: readonly (readonly [string, number, number])[], keepLevel = 4, init?: (w: World) => void): { w: World; slots: number[] } {
  const w = world({ gold: 5000, ...options });
  init?.(w);
  send(w, { t: "sandbox", op: { op: "keepLevel", value: keepLevel } });
  const slots = spots.map(([id, x, z]) => (id === "keep" ? 0 : build(w, id, x, z)));
  ready(w);
  slots.forEach((b, agent) => send(w, { t: "assignUnit", agent, building: w.buildings.id(b) }));
  arrive(w);
  return { w, slots };
}

export function steps(w: World, ticks: number, each?: (w: World) => void): void {
  for (let index = 0; index < ticks; index += 1) {
    step(w);
    each?.(w);
  }
}

/** Spots where the 1A buildings stand clear of roads, water and each other. */
export const SPOTS = { archer: ["archer", -16, -4], archer2: ["archer", 10, -6], cannon: ["cannon", 10, -16], barracks: ["barracks", 2, 18], mine: ["gold-mine", 26, -30], keep: ["keep", 0, 40] } as const;
