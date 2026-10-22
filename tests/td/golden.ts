/**
 * The golden run (docs/td/BUILD_NOW.md §6.1 td-golden, §7 gate 4; BUILD_1A6
 * §12 gate 2): the balanced bot plays three days and nights from seed 1 and
 * the world is hashed every 60 ticks. tests/golden/td-1a.json keeps those
 * hashes with the words the run used (levels 1–3 of the shared vocabulary when
 * it was made), so a new vocabulary in the parent repository never moves it;
 * the content hash in it tells a change of rules or numbers apart from a
 * change of behaviour. `pnpm td:golden:update` remakes it after a change that was meant.
 */
import { readFileSync } from "node:fs";
import { compileDeck, wordText, type Deck } from "../../src/td/typing/decks";
import { runBot, type BotRun, type BotSpec } from "./bot";
import { followCalls } from "./policies/hero";
import { ARCHER_WEST, BALANCED } from "./policies/layouts";
import { Plan, type Rule } from "./policies/stand";
import { realDeck } from "./typing";

export const GOLDEN_URL = new URL("../golden/td-1a.json", import.meta.url);
export const GOLDEN_LEVELS = 3;
export const GOLDEN_EVERY = 60;

export type Golden = {
  about: string;
  seed: number;
  /** Content hash (rules and slice) and deck hash the run was made with. */
  content: string;
  deck: string;
  every: number;
  ticks: number;
  commands: number;
  /** World hash after every `every` ticks. */
  hashes: string[];
  /** A few counters of the run, to read a diff by. */
  summary: Record<string, number>;
  /** The words, by vocabulary level (1 first), in deck order. */
  words: string[][];
};

/** The words of levels 1..GOLDEN_LEVELS of the shared vocabulary as the page compiles them, by level. */
export function snapshotWords(): string[][] {
  const deck = realDeck();
  const out: string[][] = Array.from({ length: GOLDEN_LEVELS }, () => []);
  for (let word = 0; word < deck.count; word += 1) if (deck.level[word]! <= GOLDEN_LEVELS) out[deck.level[word]! - 1]!.push(wordText(deck, word));
  return out;
}

export const goldenDeck = (words: readonly (readonly string[])[]): Deck =>
  compileDeck(words.flatMap((texts, index) => texts.map((text, k) => ({ id: "golden-" + (index + 1) + "-" + k, text, level: index + 1 }))));

export const readGolden = (): Golden => JSON.parse(readFileSync(GOLDEN_URL, "utf8")) as Golden;

/** A building put down and undone inside its 5 s (TK 11.12), so the run sends `sell` too (the sandbox gives its wood). */
const undoOnce: Rule = (bot) => {
  const { w } = bot;
  const def = w.c.buildingIndex(ARCHER_WEST.id);
  if (w.tick === 239) bot.send({ t: "sandbox", op: { op: "wood", value: w.wood + 80 } });
  if (w.tick === 240) bot.send({ t: "build", def, qx: ARCHER_WEST.x * 4, qz: ARCHER_WEST.z * 4 });
  const built = w.buildings.live(1).find((b) => w.buildings.def[b] === def && w.buildings.x[b] === ARCHER_WEST.x && w.buildings.z[b] === ARCHER_WEST.z);
  if (w.tick === 300 && built !== undefined) bot.send({ t: "sell", building: w.buildings.id(built) });
};

/** The balanced bot at 35 WPM, 95 %, its hero following the calls, three days and nights, every invariant checked. */
export function goldenSpec(deck: Deck): BotSpec {
  return {
    seed: 1,
    deck,
    hands: { wpm: 35, accuracy: 0.95, backspace: 0.3 },
    plan: () => new Plan(BALANCED, [undoOnce, followCalls()]),
    nights: 3,
    hashEvery: GOLDEN_EVERY,
    check: true,
  };
}

export function goldenOf(run: BotRun, deck: Deck, words: string[][]): Golden {
  const s = run.stats;
  return {
    about: "tests/td/golden.ts; remake with pnpm td:golden:update",
    seed: 1,
    content: run.world.c.hash,
    deck: deck.hash,
    every: GOLDEN_EVERY,
    ticks: run.ticks,
    commands: run.log.length,
    hashes: run.hashes,
    summary: {
      kills: s.kills, livesLost: s.livesLost, wavesCleared: s.wavesCleared, calls: s.calls, callWords: s.callWords, callsPerfect: s.callsPerfect, keys: s.keys, keyErrors: s.keyErrors,
      gold: run.world.gold / 1000, wood: run.world.wood, food: run.world.food,
    },
    words,
  };
}

export const runGolden = (words: readonly (readonly string[])[]): { run: BotRun; deck: Deck } => {
  const deck = goldenDeck(words);
  return { run: runBot(goldenSpec(deck)), deck };
};
