// Typing Defense 1A.1 (docs/td/BUILD_NOW.md §6.2): two Tháp Cung and a Trại Lính
// hold two sandbox waves with no typing. Builds through __td.send (the same
// commands a player sends), runs the sandbox at 2×, takes a picture while
// soldiers block, then waits for wave 2 to end. Checks kills, blocks, both
// wave ends, and no console error or page exception. The run's log, seed and
// hash go to td-1a-combat-replay-<size>.json, and scripts/td/replay.ts replays
// it in Node, which must reach the browser's hash (§7 gate 4).
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-combat.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_URL, gesture, out } from "./common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
const LAYOUT = [
  ["archer", -16, -4],
  ["archer", 10, -6],
  ["barracks", 2, 18],
];

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const size = page.width + "x" + page.height;
  const shots = [];
  await page.goto(base + "/td.html?sandbox=1", { settle: 300 });
  await gesture(page);
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  const placeable = await page.eval(td("return " + JSON.stringify(LAYOUT) + ".map(([id, x, z]) => t.canPlace(id, x, z).ok);"));
  await page.eval(td(`
    const defs = t.defs();
    for (const [id, x, z] of ${JSON.stringify(LAYOUT)}) t.send({ t: "build", def: defs.indexOf(id), qx: Math.round(x * 4), qz: Math.round(z * 4) });
    t.send({ t: "sandbox", op: { op: "speed", value: 2 } });
    t.send({ t: "callWave" });
    return true;`));

  // A picture while the soldiers hold the road.
  let blocking = null;
  for (let wait = 0; wait < 240 && blocking === null; wait += 1) {
    const state = await page.eval(td("return t.state();"));
    if (state?.soldiers?.some((soldier) => soldier.contact) && state.enemies > 0) blocking = state;
    else await page.sleep(125);
  }
  shots.push(await page.shot(out("td-1a-combat-" + size + ".png")));

  let ended = [];
  for (let wait = 0; wait < 720; wait += 1) {
    ended = (await page.eval(td("return t.events().filter((e) => e.t === 'waveEnd').map((e) => e.wave);"))) ?? [];
    if (ended.includes(2)) break;
    await page.sleep(250);
  }
  shots.push(await page.shot(out("td-1a-combat-end-" + size + ".png")));
  // One evaluation between two frames: the tick, hash and log belong together.
  const final = await page.eval(td("return { flags: t.flags(), state: t.state(), stats: t.stats(), hash: t.hash(), rejected: t.events().filter((e) => e.t === 'rejected'), log: t.log() };"));
  const replayFile = out("td-1a-combat-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify({ ...final?.flags, tick: final?.state?.tick, hash: final?.hash, log: final?.log ?? [] }));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/td/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  const checks = {
    ready,
    layoutPlaceable: Array.isArray(placeable) && placeable.every(Boolean),
    built: final?.state?.buildings?.length === 1 + LAYOUT.length && final.rejected.length === 0,
    soldiersBlocked: blocking !== null && (final?.stats?.blocks ?? 0) > 0,
    kills: (final?.stats?.kills ?? 0) > 0,
    twoWavesEnded: ended.includes(1) && ended.includes(2),
    nodeReplaysToBrowserHash: replay?.match === true && /^[0-9a-f]{8}$/.test(final?.hash ?? ""),
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  const { state, log, ...rest } = final ?? {};
  return {
    pass,
    checks,
    final: { ...rest, commands: log?.length, tick: state?.tick, wave: state?.wave, lives: state?.lives, gold: state?.gold, enemies: state?.enemies, buildings: state?.buildings?.length },
    replay: { file: replayFile, ...replay },
    blockingAt: blocking && { tick: blocking.tick, wave: blocking.wave, enemies: blocking.enemies },
    shots,
  };
}
