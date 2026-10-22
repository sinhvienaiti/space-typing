// Typing Defense 1A.6 "Lời Gọi" (docs/td/BUILD_1A6.md §8, §12 gate 8): one day and one night played with
// the keyboard alone. Every press is a trusted CDP key event; no mouse event reaches the page (a listener
// counts them) and __td is only read, never sent to, so every command in the log came from a key:
//   Insert + 5 + Enter puts a farm down at the first suggested spot, Insert + 1 + Enter an archer;
//   Tab goes through the buildings, then the dim calls, and Enter sends the hero (a villager's chop call,
//   the farm's site); the bright calls' words are typed; a word is locked and Esc lets it go; Digit1 and
//   Backquote pick the hero, Digit0 sends it home; Shift+Enter calls the night; at night Tab + Enter put
//   the hero by the archer and its power words are typed; on day 2, once the farm gave food, Shift+\ hires.
// Checks: every logged command is one a key makes, both buildings stand, words typed on chop, build and
// power calls, Esc unlocked, the night ended, the hire went through, and the log replays on Node to the
// page's hash. Picture td-1a6-keyboard (the night). Exits 1 when a check fails.
//   URL=http://127.0.0.1:3140/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a6-keyboard.mjs --width=1280 --height=720
import { KIND, Seen, WORDS, consoleChecks, finish, key, letter, out, replayOnNode, sizeOf, state, td, typeFor, until } from "./td-1a6-common.mjs";
import { DEV_URL } from "./common.mjs";

/** Commands a key makes (src/td/app/input.ts, selection.ts): nothing else may be in the log. */
const KEY_COMMANDS = new Set(["build", "assignUnit", "move", "recall", "hire", "callNight", "key", "backspace", "unlock", "sell", "upgrade"]);

const ui = (page) => page.eval(td("return t.ui();"));
const logOf = (page) => page.eval(td("return t.log();"));

/** Tab until `want(ui)` holds (at most `limit` presses); returns the ui then, or null. */
async function tabTo(page, want, limit = 24) {
  for (let k = 0; k < limit; k += 1) {
    const now = await ui(page);
    if (want(now)) return now;
    await key(page, "Tab");
  }
  const last = await ui(page);
  return want(last) ? last : null;
}

/** Insert, the kind's digit, Enter (Tab to the next suggested spot while nothing was built); returns the build command. */
async function buildByKeys(page, digit, def) {
  const before = (await logOf(page)).length;
  await key(page, "Insert");
  await key(page, digit);
  for (let k = 0; k < 6; k += 1) {
    await key(page, "Enter", { pause: 150 });
    const made = (await logOf(page)).slice(before).find((c) => c.t === "build" && c.def === def);
    if (made !== undefined) return made;
    await key(page, "Tab");
  }
  await key(page, "Escape");
  return null;
}

export default async function (page) {
  const size = sizeOf(page);
  const seen = new Seen();
  // Mouse, pointer and wheel events the page receives: none may come.
  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: "window.__mouseEvents = 0; for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'wheel', 'contextmenu']) window.addEventListener(type, () => (window.__mouseEvents += 1), true);",
  });
  await page.goto(DEV_URL.replace(/\/$/, "") + "/td.html?sandbox=1", { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  const defs = await page.eval(td("return t.defs();"));

  // Day 1: a farm and an archer from the build menu.
  const farmCmd = await buildByKeys(page, "Digit5", defs.indexOf("farm"));
  const archerCmd = await buildByKeys(page, "Digit1", defs.indexOf("archer"));
  await key(page, "Digit1");
  await key(page, "Backquote");
  const picked = (await ui(page)).agent;

  // A villager's chop call, dim far from the hero: Tab to it, Enter; then its words. One word is locked and let go first.
  const chopCall = await until(page, `return t.state().calls.find((c) => c.kind === ${KIND.chop} && c.open && !c.bright) ?? null;`, 30000);
  const tabbedCall = await tabTo(page, (u) => u.call >= 0);
  const callCard = await page.eval(`document.querySelector(".td-dock")?.textContent ?? ""`);
  const beforeEnter = (await logOf(page)).length;
  await key(page, "Enter");
  const sentToCall = (await logOf(page)).slice(beforeEnter).find((c) => c.t === "move" || c.t === "assignUnit") ?? null;
  await key(page, "Escape");
  let unlocked = false;
  const chop0 = Date.now();
  while (Date.now() - chop0 < 40000 && seen.hits(KIND.chop).length < 2) {
    if (!unlocked) {
      const word = ((await page.eval(WORDS)) ?? []).find((w) => w.kind === KIND.chop && !w.locked);
      if (word !== undefined) {
        await letter(page, word.text[0]);
        await page.sleep(150);
        // Esc only on a lock: with nothing to let go and nothing open it would pause the game.
        if ((await page.eval(td("return t.typing().lock;"))) >= 0) {
          await key(page, "Escape", { pause: 150 });
          unlocked = (await page.eval(td("return t.typing().lock;"))) < 0;
        }
        continue;
      }
    }
    await typeFor(page, 800, { wpm: 45, kinds: [KIND.chop], seen });
  }

  // The farm's site: Tab to it (a building), Enter sends the hero; its build words.
  const sites = (await state(page)).buildings.filter((b) => b.def !== "keep");
  const farm = sites.find((b) => b.def === "farm");
  const archer = sites.find((b) => b.def === "archer");
  const toFarm = farm ? await tabTo(page, (u) => u.focus === farm.id) : null;
  const beforeFarm = (await logOf(page)).length;
  await key(page, "Enter");
  const sentToFarm = (await logOf(page)).slice(beforeFarm).some((c) => c.t === "assignUnit" && c.agent === 0 && c.building === farm?.id);
  await key(page, "Escape");
  let toArcher = false;
  const build0 = Date.now();
  while (Date.now() - build0 < 50000) {
    await typeFor(page, 800, { wpm: 45, kinds: [KIND.build], seen });
    const s = await state(page);
    if (s.buildings.filter((b) => b.def !== "keep").every((b) => b.ready) && seen.hits(KIND.build).length >= 1) break;
    // The archer's site waits for the farm's: the hero goes over once the farm stands.
    if (!toArcher && s.buildings.find((b) => b.id === farm?.id)?.ready && archer && seen.hits(KIND.build).length >= 1) {
      toArcher = true;
      await tabTo(page, (u) => u.focus === archer.id);
      await key(page, "Enter");
      await key(page, "Escape");
    }
  }
  const dayEnd = await state(page);
  await key(page, "Digit0");

  // The night: Shift+Enter; the hero by the archer; power words typed until the night is over.
  await key(page, "Enter", { shift: true });
  const nightAt = await state(page);
  if (archer) {
    await tabTo(page, (u) => u.focus === archer.id);
    await key(page, "Enter");
    await key(page, "Escape");
  }
  let shot = null;
  const night0 = Date.now();
  while (Date.now() - night0 < 120000) {
    await typeFor(page, 700, { wpm: 50, kinds: [KIND.power], seen });
    const s = await state(page);
    if (shot === null && s.phase === "night" && s.enemies > 0 && Date.now() - night0 > 4000) shot = await page.shot(out("td-1a6-keyboard-" + size + ".png"));
    if (s.phase !== "night" && Date.now() - night0 > 2000) break;
  }
  if (shot === null) shot = await page.shot(out("td-1a6-keyboard-" + size + ".png"));
  const nightEnd = await state(page);

  // Day 2: the farm's first harvest pays food; Shift+\ hires a villager.
  await until(page, "const s = t.state(); return s.phase === 'day' && s.food >= 5;", 90000, 500);
  const villagersBefore = (await state(page)).npcs.filter((n) => n.kind === 1).length;
  const beforeHire = (await logOf(page)).length;
  await key(page, "Backslash", { shift: true, pause: 300 });
  const hireCmd = (await logOf(page)).slice(beforeHire).find((c) => c.t === "hire") ?? null;
  const villagersAfter = (await state(page)).npcs.filter((n) => n.kind === 1).length;

  await seen.poll(page);
  const log = await logOf(page);
  const mouseEvents = await page.eval("window.__mouseEvents");
  const replay = await replayOnNode(page, "td-1a6-keyboard");
  const rejected = seen.of("rejected");
  const checks = {
    ready,
    noMouseEvent: mouseEvents === 0,
    onlyKeyCommands: log.length > 0 && log.every((c) => KEY_COMMANDS.has(c.t)),
    farmBuiltByKeys: farmCmd !== null,
    archerBuiltByKeys: archerCmd !== null,
    bothStand: dayEnd.buildings.filter((b) => b.def === "farm" || b.def === "archer").filter((b) => b.ready).length === 2,
    digitsPickHero: picked === 0,
    tabToDimCall: chopCall !== null && tabbedCall !== null && /đang mờ/.test(callCard),
    enterSendsToCall: sentToCall !== null,
    chopTyped: seen.hits(KIND.chop).length >= 1,
    escUnlocks: unlocked && log.some((c) => c.t === "unlock"),
    tabEnterToSite: toFarm !== null && sentToFarm,
    buildTyped: seen.hits(KIND.build).length >= 1,
    digit0Recalls: log.some((c) => c.t === "recall" && c.agent === 0),
    nightByShiftEnter: nightAt.phase === "night" && log.some((c) => c.t === "callNight"),
    powerTyped: seen.hits(KIND.power).length >= 1,
    nightOver: nightEnd.phase !== "night" && nightEnd.lives > 0,
    hiredByShiftBackslash: hireCmd !== null && villagersAfter === villagersBefore + 1,
    nodeReplaysToBrowserHash: replay.match === true,
    ...consoleChecks(page),
  };
  return finish(page, checks, {
    commands: Object.entries(log.reduce((count, c) => ({ ...count, [c.t]: (count[c.t] ?? 0) + 1 }), {})),
    typed: { chop: seen.hits(KIND.chop).length, build: seen.hits(KIND.build).length, power: seen.hits(KIND.power).length },
    rejected: rejected.map((e) => e.command + ":" + e.reason).slice(0, 10),
    day: { gold: dayEnd.gold, wood: dayEnd.wood, food: dayEnd.food }, night: { phase: nightEnd.phase, wave: nightEnd.wave, lives: nightEnd.lives },
    villagers: [villagersBefore, villagersAfter], mouseEvents, callCard, replay, shots: [shot],
  });
}
