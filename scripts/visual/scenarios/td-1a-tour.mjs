// Typing Defense 1A.5: the owner's picture set (docs/td/BUILD_NOW.md §8), one
// run at 1280 × 720 with the real vocabulary, words typed for real through
// CDP and the sandbox panel hidden (F9) except in its own picture:
//   td-1a-tour-1-placement   the build menu's ghost by the road, range ring
//   td-1a-tour-2-tempo-card  the building card with the tempo knob (2 s)
//   td-1a-tour-3-one-slot    one Tháp Cung, Draconis on its eave, words up
//   td-1a-tour-4-three-slots three buildings dealing, words floating (E 55)
//   td-1a-tour-5-four-slots  four, Gạch at the mine over the stream
//   td-1a-tour-6-sandbox     the sandbox panel
//   td-1a-tour-7-wave        wave 4 on the road: Thuồng Luồng, soldiers, shots
// Checks: each picture's state was reached, no command refused, no console
// error, no page exception.
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-tour.mjs --width=1280 --height=720
import { DEV_URL, gesture, out } from "./common.mjs";

const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
const ARCHER = [-8, 12];
const CANNON = [7, 12];
const BARRACKS = [3, 18];
const MINE = [-34, 8];

async function press(page, key, code, modifiers = 0) {
  const text = key.length === 1 ? key : undefined;
  const vk = key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined;
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, text, unmodifiedText: text, windowsVirtualKeyCode: vk, modifiers });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk, modifiers });
}
const letter = (page, ch) => press(page, ch, "Key" + ch.toUpperCase());

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/td.html?sandbox=1", { settle: 300 });
  await gesture(page);
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  // The map at zoom 1, as main.ts and DebugView.resize fit it (td-1a-combat).
  const ui = Math.max(0.8, Math.min(1.2, Math.min(page.width / 1600, page.height / 900)));
  const strip = 60 * Math.max(1, ui);
  const metre = Math.min(page.width, page.height - strip) / 100;
  const at = ([x, z]) => ({ x: page.width / 2 + x * metre, y: (page.height - strip) / 2 + z * metre });
  const click = async (point, button = "left") => {
    const p = at(point);
    await page.mouse(p.x, p.y);
    await page.mouse(p.x, p.y, "mousePressed", { button, buttons: button === "left" ? 1 : 2 });
    await page.mouse(p.x, p.y, "mouseReleased", { button, buttons: 0 });
    await page.sleep(150);
  };
  const send = (commands) => page.eval(td(`for (const c of ${JSON.stringify(commands)}) t.send(c); return true;`));
  const state = () => page.eval(td("return t.state();"));
  const idOf = async (def, [x, z]) => (await state()).buildings.find((b) => b.def === def && b.x === x && b.z === z)?.id ?? -1;
  const reached = {};
  const shots = [];
  /** A picture; the mouse first leaves the field (no hover, no ghost) unless it is the point. */
  const shoot = async (name, keepMouse = false) => {
    if (!keepMouse) await page.mouse(page.width - 4, 300);
    await page.sleep(120);
    shots.push(await page.shot(out("td-1a-tour-" + name + ".png")));
  };

  /** Types at `wpm` (the locked word, else the most urgent; a tier-2 pair takes two keys) until `done(look)` or `ms` pass. */
  const typeUntil = async (wpm, ms, done) => {
    const keyMs = 60000 / (wpm * 5);
    const ends = Date.now() + ms;
    while (Date.now() < ends) {
      const start = Date.now();
      const look = await page.eval(td("return { words: t.liveWords(), state: t.state() };"));
      if (look === null) return false;
      if (await done(look)) return true;
      const locked = look.words.find((word) => word.locked);
      const target = locked ?? look.words.slice().sort((a, b) => a.left - b.left)[0];
      if (target !== undefined) {
        const pair = !locked && look.words.some((word) => word !== target && word.text[0] === target.text[0]);
        await letter(page, locked ? target.text[target.typed] : target.text[0]);
        if (pair) {
          await page.sleep(keyMs);
          await letter(page, target.text[1]);
        }
      }
      await page.sleep(Math.max(0, keyMs - (Date.now() - start)));
    }
    return false;
  };
  const dealing = (look) => new Set(look.words.map((word) => word.building)).size;

  // The game's view: the sandbox panel away (F9).
  await press(page, "F9", "F9");
  await send([{ t: "sandbox", op: { op: "gold", value: 1000 } }]);
  await page.sleep(200);

  // 1. Placement: a left click on open ground opens the build menu with the ghost there.
  await click(ARCHER);
  await page.mouse(at(ARCHER).x, at(ARCHER).y);
  await page.sleep(200);
  reached.placement = (await page.eval(td("return t.ui().building;"))) === true;
  await shoot("1-placement", true);
  await click(ARCHER);
  await page.sleep(1700);
  const archer = await idOf("archer", ARCHER);

  // 2. The building card: Draconis (selected) sent by a right click and perched; a left click opens the card; 2 s on its knob.
  await click(ARCHER, "right");
  for (let wait = 0; wait < 60 && (await state()).agents[0].at !== archer; wait += 1) await page.sleep(200);
  await click(ARCHER);
  await page.click('button[data-act="tempo:5"]');
  await page.sleep(300);
  reached.tempoCard = (await page.eval(td("return t.ui().focus;"))) === archer && (await state()).buildings.find((b) => b.id === archer)?.tempo === 5;
  await shoot("2-tempo-card");
  await page.click('button[data-act="close"]');

  // 3. One slot: wave 1 called (Shift+Enter), words typed at 35 WPM until two float over the archer and one is half typed.
  await press(page, "Enter", "Enter", 8);
  reached.oneSlot = await typeUntil(35, 40000, (look) => look.state.agents[0].at === archer && look.words.filter((word) => word.building === archer).length >= 2 && look.words.some((word) => word.locked && word.typed >= 2));
  await shoot("3-one-slot");

  // 4. Three slots: E 55 (the sandbox), Bastion level 3, a Tháp Pháo and a Trại Lính by the merge, Chấm and Phẩy sent, 3 s each.
  await send([
    { t: "sandbox", op: { op: "expected", value: 55 } },
    { t: "sandbox", op: { op: "keepLevel", value: 3 } },
    { t: "build", def: 2, qx: CANNON[0] * 4, qz: CANNON[1] * 4 },
    { t: "build", def: 3, qx: BARRACKS[0] * 4, qz: BARRACKS[1] * 4 },
  ]);
  await page.sleep(300);
  const cannon = await idOf("cannon", CANNON);
  const barracks = await idOf("barracks", BARRACKS);
  await send([{ t: "assignUnit", agent: 1, building: cannon }, { t: "assignUnit", agent: 2, building: barracks }]);
  await typeUntil(50, 4000, async () => false);
  await send([{ t: "setTempo", building: cannon, idx: 4 }]);
  await typeUntil(50, 1500, async () => false);
  await send([{ t: "setTempo", building: barracks, idx: 4 }]);
  reached.threeSlots = await typeUntil(50, 40000, (look) => dealing(look) >= 3 && look.words.length >= 4);
  await shoot("4-three-slots");

  // 5. Four slots: level 4, a Mỏ Vàng on N3 across the stream; Gạch walks there over a bridge.
  await send([{ t: "sandbox", op: { op: "keepLevel", value: 4 } }, { t: "build", def: 4, qx: MINE[0] * 4, qz: MINE[1] * 4 }]);
  await page.sleep(300);
  const mine = await idOf("gold-mine", MINE);
  await send([{ t: "assignUnit", agent: 3, building: mine }]);
  reached.fourSlots = await typeUntil(55, 60000, (look) => look.state.agents[3].at === mine && dealing(look) >= 4);
  await shoot("5-four-slots");

  // 6. The sandbox panel.
  await press(page, "F9", "F9");
  await page.sleep(300);
  reached.sandbox = (await page.eval(td("return t.ui().panel;"))) === true;
  await shoot("6-sandbox");
  await press(page, "F9", "F9");

  // 7. A wave on the road: waves called as soon as they may be until wave 4 (two Thuồng Luồng); 30 s on, they near the merge.
  let fourthAt = -1;
  reached.wave = await typeUntil(55, 240000, async (look) => {
    const s = look.state;
    if (s.phase === "battle" && s.nextWaveAt >= 0 && s.wave < 4) await send([{ t: "callWave" }]);
    if (s.wave >= 4 && fourthAt < 0) fourthAt = s.tick;
    return fourthAt >= 0 && s.tick - fourthAt >= 30 * 60 && s.enemies >= 4 && s.projectiles >= 1;
  });
  await shoot("7-wave");

  const final = await page.eval(td("return { stats: t.stats(), rejected: t.events().filter((e) => e.t === 'rejected'), flags: t.flags(), state: t.state() };"));
  const checks = {
    ready,
    ...Object.fromEntries(Object.entries(reached).map(([k, v]) => [k, v === true])),
    realVocabulary: final?.flags?.vocabulary === "vocabulary",
    noRejectedCommand: (final?.rejected ?? []).length === 0,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, rejected: final?.rejected, wave: final?.state?.wave, lives: final?.state?.lives, stats: { streamDone: final?.stats?.streamDone, streamMissed: final?.stats?.streamMissed, kills: final?.stats?.kills }, shots };
}
