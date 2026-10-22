/**
 * Remakes tests/golden/td-1a.json (`pnpm td:golden:update`) after a change
 * that was meant: runs the golden bot (tests/td/golden.ts) on the file's own
 * words, or on a fresh snapshot of vocabulary levels 1–3 with --fresh-words,
 * and prints the fields that changed (any field: hashes, ticks, commands,
 * content and deck hashes, words, summary) and the tick where the hashes
 * first moved; the file is written when any field changed. --check compares
 * the same way and writes nothing (exit 1 when anything differs, which is
 * when tests/td-golden.test.ts fails). --log <file> also writes the run
 * with its command log, which the browser replays to show Chrome reaches the
 * same hashes (scripts/visual/scenarios/td-1a6-perf.mjs; BUILD_NOW §7 gate 4, BUILD_1A6 §12 gate 2).
 *   node --import tsx scripts/td/golden.ts [--check] [--fresh-words] [--log <file>]
 */
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GOLDEN_URL, goldenOf, goldenSpec, readGolden, runGolden, snapshotWords, type Golden } from "../../tests/td/golden";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const logAt = args.indexOf("--log");
const before = existsSync(GOLDEN_URL) ? readGolden() : null;
const words = flag("--fresh-words") || before === null ? snapshotWords() : before.words;
const { run, deck } = runGolden(words);
const golden = goldenOf(run, deck, words);
const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(golden)])] as (keyof Golden)[];
const changed = before === null ? [] : keys.filter((key) => JSON.stringify(golden[key]) !== JSON.stringify(before[key]));
const same = before !== null && changed.length === 0;
// Hashes past the shorter list count as moved.
const moved = before === null ? -1 : golden.hashes.findIndex((hash, k) => hash !== before.hashes[k]);
const movedAt = before === null || moved >= 0 ? moved : golden.hashes.length < before.hashes.length ? golden.hashes.length : -1;
const shown = (value: unknown) => (Array.isArray(value) ? value.length + " entries" : typeof value === "object" ? JSON.stringify(value) : String(value));
console.log(JSON.stringify({
  same,
  // Each changed field, before → after (lists by length).
  changed: before === null ? "no file yet" : Object.fromEntries(changed.map((key) => [key, shown(before[key]) + " → " + shown(golden[key])])),
  firstMovedAtTick: movedAt < 0 ? null : (movedAt + 1) * golden.every,
  content: golden.content,
  deck: golden.deck,
  ticks: golden.ticks,
  commands: golden.commands,
  problems: run.problems.length,
  rejected: run.rejected.length,
  summary: golden.summary,
}));
if (logAt >= 0) {
  const spec = goldenSpec(deck);
  writeFileSync(args[logAt + 1]!, JSON.stringify({ seed: spec.seed, expected: spec.hands!.wpm, words, deck: deck.hash, content: golden.content, every: golden.every, ticks: golden.ticks, hashes: golden.hashes, log: run.log }));
}
if (flag("--check")) {
  if (!same) process.exitCode = 1;
} else if (!same) {
  writeFileSync(GOLDEN_URL, JSON.stringify(golden, null, 1) + "\n");
  console.log("wrote " + fileURLToPath(GOLDEN_URL));
}
