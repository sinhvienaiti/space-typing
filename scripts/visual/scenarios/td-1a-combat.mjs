// Typing Defense 1A.1 (docs/td/BUILD_NOW.md §6.2): two Tháp Cung and a Trại Lính
// hold two sandbox waves with no typing. Since the 1A.4 review the layout goes
// down with the mouse alone, every press a trusted CDP Input.dispatchMouseEvent:
// a left click on open ground opens the build menu with its ghost there
// (picture td-1a-mouse-menu), a click on the menu's row picks the Trại Lính, a
// second left click builds. The ghost moved into the Bastion's 11 m ring turns
// red with its reason on a chip (td-1a-mouse-ghost-red); a right click closes
// the menu. A left click on the first archer opens its card with the order
// grace (td-1a-mouse-card); a right click on it sends Draconis, a right click on
// open ground moves him; the wheel zooms about the second archer
// (td-1a-mouse-zoom) and a drag pans, sending nothing. The HUD's 2× and call
// buttons start the waves. Then: a picture while soldiers block, the end of
// wave 2. Checks the commands those presses logged, kills, blocks, both wave
// ends, and no console error or page exception. The run's log, seed and hash
// go to td-1a-combat-replay-<size>.json, and scripts/td/replay.ts replays it in
// Node, which must reach the browser's hash (§7 gate 4).
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
/** Inside the Bastion's 11 m ring: where the ghost turns red. Where Draconis is moved to. */
const RED = [-6, 34];
const MOVE = [-12, -12];

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
  const redReason = await page.eval(td(`return t.canPlace("archer", ${RED[0]}, ${RED[1]}).reason;`));

  // The map at zoom 1, as main.ts and DebugView.resize fit it: the 100 m field above the word strip's 60 px (× --hud).
  const ui = Math.max(0.8, Math.min(1.2, Math.min(page.width / 1600, page.height / 900)));
  const strip = 60 * Math.max(1, ui);
  const metre = Math.min(page.width, page.height - strip) / 100;
  const at = ([x, z]) => ({ x: page.width / 2 + x * metre, y: (page.height - strip) / 2 + z * metre });
  const click = async ([x, z], button = "left") => {
    const p = at([x, z]);
    await page.mouse(p.x, p.y);
    await page.mouse(p.x, p.y, "mousePressed", { button, buttons: button === "left" ? 1 : 2 });
    await page.mouse(p.x, p.y, "mouseReleased", { button, buttons: 0 });
    await page.sleep(120);
  };
  const look = () => page.eval(td("return { ui: t.ui(), log: t.log(), buildings: t.state().buildings };"));
  // A HUD button acts on press; the panel it changes is written on the next frame.
  const press = async (selector) => {
    await page.click(selector);
    await page.sleep(120);
  };
  const mouse = {};

  // Build: left on open ground opens the menu there, left again builds; the barracks is picked on the menu's row.
  for (const [id, x, z] of LAYOUT) {
    await click([x, z]);
    if (shots.length === 0) shots.push(await page.shot(out("td-1a-mouse-menu-" + size + ".png")));
    if (id === "barracks") await press('button[data-act="pick:3"]');
    await click([x, z]);
  }
  mouse.afterBuilds = (await look()).ui;
  // The ghost in the Bastion's ring: red, its reason on a chip; a right click closes the menu and sends nothing.
  await press('button[data-act="build"]');
  await press('button[data-act="pick:1"]');
  await page.mouse(at(RED).x, at(RED).y);
  await page.sleep(150);
  shots.push(await page.shot(out("td-1a-mouse-ghost-red-" + size + ".png")));
  const beforeClose = (await look()).log.length;
  await click(RED, "right");
  const closed = await look();
  mouse.menuClosedByRight = { building: closed.ui.building, sent: closed.log.slice(beforeClose).map((c) => c.t) };

  // Construction takes 1.5 s; the order grace, once ended, opens again after 3 s (TK 6.14).
  await page.sleep(3300);
  const built = (await look()).buildings.filter((b) => b.def !== "keep");
  const archer = built.find((b) => b.def === "archer" && Math.abs(b.x - LAYOUT[0][1]) <= 0.25 && Math.abs(b.z - LAYOUT[0][2]) <= 0.25);
  // Left on the first archer: its card, the order grace held (a mouse order, TK 6.14).
  await click(LAYOUT[0].slice(1));
  const card = await look();
  mouse.card = { focus: card.ui.focus, archer: archer?.id, grace: card.ui.grace };
  shots.push(await page.shot(out("td-1a-mouse-card-" + size + ".png")));
  // Right on it: Draconis is sent; right on open ground: he moves there. The card's × closes it.
  await click(LAYOUT[0].slice(1), "right");
  await click(MOVE, "right");
  await press('button[data-act="close"]');
  // The wheel zooms about the second archer; a drag pans; neither sends a command.
  const beforeCamera = (await look()).log.length;
  const zoomAt = at(LAYOUT[1].slice(1));
  for (let k = 0; k < 6; k += 1) {
    await page.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: zoomAt.x, y: zoomAt.y, deltaX: 0, deltaY: -120 });
    await page.sleep(40);
  }
  await page.sleep(150);
  shots.push(await page.shot(out("td-1a-mouse-zoom-" + size + ".png")));
  const from = at([0, 0]);
  await page.mouse(from.x, from.y);
  await page.mouse(from.x, from.y, "mousePressed", { buttons: 1 });
  for (let k = 1; k <= 10; k += 1) await page.mouse(from.x + k * 15, from.y + k * 8, "mouseMoved", { button: "left", buttons: 1 });
  await page.mouse(from.x + 150, from.y + 80, "mouseReleased", { buttons: 0 });
  for (let k = 0; k < 10; k += 1) await page.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: zoomAt.x, y: zoomAt.y, deltaX: 0, deltaY: 120 });
  await page.sleep(150);
  const afterCamera = await look();
  mouse.cameraSent = afterCamera.log.slice(beforeCamera).map((c) => c.t);
  // The HUD's buttons: game speed 2×, then the call.
  await press('button[data-act="sb:speed:2"]');
  await press('button[data-act="wave"]');
  await page.mouse(4, page.height / 2); // off the buttons, for the pictures

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
  const final = await page.eval(td("return { flags: t.flags(), defs: t.defs(), state: t.state(), stats: t.stats(), hash: t.hash(), rejected: t.events().filter((e) => e.t === 'rejected'), log: t.log() };"));
  const replayFile = out("td-1a-combat-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify({ ...final?.flags, tick: final?.state?.tick, hash: final?.hash, log: final?.log ?? [] }));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/td/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  const log = final?.log ?? [];
  const builds = log.filter((c) => c.t === "build").map((c) => [final.defs[c.def], c.qx / 4, c.qz / 4]);
  const near = (a, b) => Math.abs(a - b) <= 0.25;
  const checks = {
    ready,
    layoutPlaceable: Array.isArray(placeable) && placeable.every(Boolean),
    builtByMouse: builds.length === LAYOUT.length && LAYOUT.every(([id, x, z], k) => builds[k][0] === id && near(builds[k][1], x) && near(builds[k][2], z)),
    built: final?.state?.buildings?.length === 1 + LAYOUT.length && final.rejected.length === 0,
    ghostRedWithReason: redReason === "keep",
    rightClickClosesBuildMenu: mouse.menuClosedByRight.building === false && mouse.menuClosedByRight.sent.every((t) => t === "uiFocus"),
    cardByClickHoldsGrace: archer !== undefined && mouse.card.focus === archer.id && mouse.card.grace === true,
    rightClickSendsDraconis: log.some((c) => c.t === "assignUnit" && c.agent === 0 && c.building === archer?.id),
    rightClickMovesDraconis: log.some((c) => c.t === "move" && c.agent === 0 && near(c.qx / 4, MOVE[0]) && near(c.qz / 4, MOVE[1])),
    zoomAndDragSendNothing: mouse.cameraSent.length === 0,
    hudButtonsFound: !page.logs.some((line) => line.startsWith("click fallback")),
    hudButtonsStartWaves: log.some((c) => c.t === "sandbox" && c.op.op === "speed" && c.op.value === 2) && log.some((c) => c.t === "callWave"),
    soldiersBlocked: blocking !== null && (final?.stats?.blocks ?? 0) > 0,
    kills: (final?.stats?.kills ?? 0) > 0,
    twoWavesEnded: ended.includes(1) && ended.includes(2),
    nodeReplaysToBrowserHash: replay?.match === true && /^[0-9a-f]{8}$/.test(final?.hash ?? ""),
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  const { state, ...rest } = final ?? {};
  return {
    pass,
    checks,
    mouse: { ...mouse, builds, commands: log.filter((c) => c.t !== "uiFocus").slice(0, 12).map((c) => c.t) },
    final: { stats: rest.stats, hash: rest.hash, rejected: rest.rejected, commands: log.length, tick: state?.tick, wave: state?.wave, lives: state?.lives, gold: state?.gold, enemies: state?.enemies, buildings: state?.buildings?.length },
    replay: { file: replayFile, ...replay },
    blockingAt: blocking && { tick: blocking.tick, wave: blocking.wave, enemies: blocking.enemies },
    shots,
  };
}
