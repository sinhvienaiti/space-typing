/**
 * Replays a browser run's command log in Node and compares the world hash
 * (docs/td/BUILD_NOW.md §7 gate 4: Node and Chrome reach the same hash for
 * the same log). The input is the file td-1a-combat.mjs writes next to its
 * screenshots: { seed, sandbox, content, tick, hash, log }.
 *   node --import tsx scripts/td/replay.ts <OUT_DIR>/td-1a-combat-replay-1280x720.json
 * Prints one JSON line; exits 1 when the content or the hash differs.
 */
import { readFileSync } from "node:fs";
import type { Command } from "../../src/td/sim/commands";
import { hashHex } from "../../src/td/sim/hash";
import { createWorld, runLog } from "../../src/td/sim/world";

type BrowserRun = { seed: number; sandbox: boolean; content: string; tick: number; hash: string; log: Command[] };

const file = process.argv[2];
if (file === undefined) {
  console.error("usage: node --import tsx scripts/td/replay.ts <replay.json>");
  process.exit(2);
}
const run = JSON.parse(readFileSync(file, "utf8")) as BrowserRun;
const world = createWorld({ seed: run.seed, sandbox: run.sandbox });
runLog(world, run.log, run.tick);
const result = {
  commands: run.log.length,
  tick: world.tick,
  sameContent: world.c.hash === run.content,
  browser: run.hash,
  node: hashHex(world),
};
const match = result.sameContent && result.tick === run.tick && result.node === result.browser;
console.log(JSON.stringify({ match, ...result }));
if (!match) process.exitCode = 1;
