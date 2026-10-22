// Typing Defense 1A.1 (docs/td/BUILD_NOW.md §6.2): two Tháp Cung and a Trại Lính
// hold two sandbox waves with no typing. Builds through __td.send (the same
// commands a player sends), runs the sandbox at 2×, takes a picture while
// soldiers block, then waits for wave 2 to end. Checks kills, blocks, both
// wave ends, a world hash, and no console error or page exception.
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-combat.mjs --width=1280 --height=720
import { DEV_URL, gesture, out } from "./common.mjs";

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
  // One evaluation between two frames: the tick, hash and log belong together (a Node replay of the log must reach the same hash).
  const final = await page.eval(td("return { state: t.state(), stats: t.stats(), hash: t.hash(), rejected: t.events().filter((e) => e.t === 'rejected'), log: t.log() };"));
  const checks = {
    ready,
    layoutPlaceable: Array.isArray(placeable) && placeable.every(Boolean),
    built: final?.state?.buildings?.length === 1 + LAYOUT.length && final.rejected.length === 0,
    soldiersBlocked: blocking !== null && (final?.stats?.blocks ?? 0) > 0,
    kills: (final?.stats?.kills ?? 0) > 0,
    twoWavesEnded: ended.includes(1) && ended.includes(2),
    hash: /^[0-9a-f]{8}$/.test(final?.hash ?? ""),
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  const { state, ...rest } = final ?? {};
  return {
    pass,
    checks,
    final: { ...rest, tick: state?.tick, wave: state?.wave, lives: state?.lives, gold: state?.gold, enemies: state?.enemies, buildings: state?.buildings?.length },
    blockingAt: blocking && { tick: blocking.tick, wave: blocking.wave, enemies: blocking.enemies },
    shots,
  };
}
