import { describe, expect, it } from "vitest";
import { createWorld } from "../src/td/sim/world";
import { replayHashes, runBot } from "./td/bot";
import { GOLDEN_EVERY, goldenSpec, readGolden, runGolden } from "./td/golden";

/**
 * The golden run (docs/td/BUILD_NOW.md §6.1, §7 gate 4; BUILD_1A6 §12 gate 2): the balanced bot plays
 * three days and nights from a fixed seed; the world hash every 60 ticks matches
 * tests/golden/td-1a.json, a second run matches the first, and the run's
 * command log replayed on a fresh world gives the same hashes. A content
 * change (rules or numbers) shows as a content hash first; remake the file
 * with `pnpm td:golden:update` once the change is meant.
 */
describe("golden run", () => {
  const golden = readGolden();
  const { run, deck } = runGolden(golden.words);

  it("plays the words and the content the golden file was made with", () => {
    expect(deck.hash, "the golden words compile to the golden deck").toBe(golden.deck);
    expect(createWorld({ seed: golden.seed }).c.hash, "rules or numbers changed: pnpm td:golden:update once the change is meant").toBe(golden.content);
  });

  it("plays three days and nights through commands the world takes, every call invariant holding every tick", () => {
    expect(run.stats.wavesCleared).toBe(3);
    expect(run.rejected).toEqual([]);
    expect(run.problems).toEqual([]);
    // It types, slips, takes back with Backspace, moves its hero, sends a helper, marks trees, hires, undoes a building, calls nights early.
    const kinds = new Set(run.log.map((command) => command.t));
    for (const kind of ["build", "sell", "assignUnit", "move", "markTree", "hire", "key", "backspace", "callNight", "sandbox"]) expect(kinds, kind).toContain(kind);
    expect(run.stats.keyErrors).toBeGreaterThan(0);
    expect(run.stats.callWords).toBeGreaterThan(20);
    expect(run.stats.callsPerfect).toBeGreaterThan(0);
  });

  it("hashes the world every 60 ticks as the golden file says", () => {
    const first = run.hashes.findIndex((hash, k) => hash !== golden.hashes[k]);
    expect(first, first < 0 ? "" : "first differs after tick " + (first + 1) * GOLDEN_EVERY).toBe(-1);
    expect(run.ticks).toBe(golden.ticks);
    expect(run.log.length).toBe(golden.commands);
    expect(run.hashes).toEqual(golden.hashes);
  });

  it("runs the same twice, and its command log replays to the same hashes", () => {
    const again = runBot(goldenSpec(deck));
    expect(again.hashes).toEqual(run.hashes);
    expect(again.log).toEqual(run.log);
    expect(replayHashes(goldenSpec(deck), run.log, run.ticks, GOLDEN_EVERY)).toEqual(run.hashes);
  });
});
