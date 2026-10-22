/**
 * Remakes tests/golden/td-1a.json (`pnpm td:golden:update`) after a change
 * that was meant: runs the golden bot (tests/td/golden.ts) on the file's own
 * words, or on a fresh snapshot of vocabulary levels 1–3 with --fresh-words,
 * and prints the tick where the hashes first moved. --check compares and
 * writes nothing (exit 1 when they differ). --log <file> also writes the run
 * with its command log, which the browser replays to show Chrome reaches the
 * same hashes (scripts/visual/scenarios/td-1a-perf.mjs, BUILD_NOW §7 gate 4).
 *   node --import tsx scripts/td/golden.ts [--check] [--fresh-words] [--log <file>]
 */
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GOLDEN_URL, goldenOf, goldenSpec, readGolden, runGolden, snapshotWords } from "../../tests/td/golden";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const logAt = args.indexOf("--log");
const before = existsSync(GOLDEN_URL) ? readGolden() : null;
const words = flag("--fresh-words") || before === null ? snapshotWords() : before.words;
const { run, deck } = runGolden(words);
const golden = goldenOf(run, deck, words);
const moved = before === null ? 0 : golden.hashes.findIndex((hash, k) => hash !== before.hashes[k]);
const same = before !== null && moved < 0 && golden.hashes.length === before.hashes.length && golden.ticks === before.ticks;
console.log(JSON.stringify({
  same,
  firstMovedAtTick: before === null || moved < 0 ? null : (moved + 1) * golden.every,
  content: before === null || before.content === golden.content ? golden.content : before.content + " → " + golden.content,
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
