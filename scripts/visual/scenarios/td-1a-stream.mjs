// Typing Defense 1A.2 (docs/td/BUILD_NOW.md §6.2): one slot, a Tháp Cung at 4 s
// with Draconis, and wave 1 typed for real at 40 WPM through CDP
// Input.dispatchKeyEvent (trusted key events, read by the page's own input).
// The typist reads the live words from __td.liveWords(), finishes the locked
// word, else starts the most urgent one. At 4 s one word is up at a time, so
// after the wave the tower goes to 1 s for 12 s: several words live at once,
// and one soft switch on purpose (first letter of one word, then of another).
// Pictures: the stream mid-wave, a word locked half typed, the 1 s column.
// Checks: words finished, ≥ 2 words live at once with first letters never
// ambiguous, the soft switch, Word Shots fired, no console error or page
// exception, and a Node replay of the run's log reaches the browser's hash
// (§7 gate 4). Tier 2 needs 3–4 busy buildings: td-1a-slots (1A.3) covers it.
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-stream.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_URL, gesture, out } from "./common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
const WPM = Number(process.env.WPM ?? 40);
const KEY_MS = 60000 / (WPM * 5);
const SPOTS = [[-8, 10], [8, 8], [-14, 4], [10, -6]];

async function press(page, letter) {
  const code = "Key" + letter.toUpperCase();
  const vk = letter.toUpperCase().charCodeAt(0);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: letter, code, text: letter, unmodifiedText: letter, windowsVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: letter, code, windowsVirtualKeyCode: vk });
}

/** Live words with one first letter each, or a tier-2 pair told apart by the second letter. */
function ambiguity(words) {
  const by = new Map();
  for (const word of words) by.set(word.text[0], [...(by.get(word.text[0]) ?? []), word.text]);
  return [...by.values()].filter((list) => list.length > 2 || (list.length === 2 && list[0][1] === list[1][1]));
}

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
  const spot = await page.eval(td("return " + JSON.stringify(SPOTS) + ".find(([x, z]) => t.canPlace('archer', x, z).ok) ?? null;"));
  await page.eval(td(`t.send({ t: "build", def: t.defs().indexOf("archer"), qx: ${Math.round(spot[0] * 4)}, qz: ${Math.round(spot[1] * 4)} }); return true;`));
  await page.sleep(1700); // construction: 1.5 s
  await page.eval(td(`
    const archer = t.state().buildings.find((b) => b.def === "archer");
    t.send({ t: "assignUnit", agent: 0, building: archer.id });
    t.send({ t: "setTempo", building: archer.id, idx: 3 });
    t.send({ t: "callWave" });
    return true;`));

  const problems = [];
  let lockShot = null;
  let streamShot = null;
  let denseShot = null;
  let keys = 0;
  let maxLive = 0;
  let switchTried = false;
  const started = Date.now();
  let ended = false;
  let denseUntil = 0;
  while ((!ended || Date.now() < denseUntil) && Date.now() - started < 180000) {
    const tickAt = Date.now();
    const words = (await page.eval(td("return t.liveWords();"))) ?? [];
    maxLive = Math.max(maxLive, words.length);
    const bad = ambiguity(words);
    if (bad.length > 0 && problems.length < 10) problems.push("ambiguous: " + JSON.stringify(bad));
    // The stream picture: mid-wave, a word up and not yet touched.
    if (streamShot === null && words.length >= 1 && !words.some((word) => word.locked || word.typed > 0) && Date.now() - started > 9000) {
      streamShot = await page.shot(out("td-1a-stream-" + size + ".png"));
    }
    if (denseUntil > 0 && denseShot === null && words.length >= 3) denseShot = await page.shot(out("td-1a-stream-dense-" + size + ".png"));
    const locked = words.find((word) => word.locked);
    // The soft switch: one letter into the most urgent word, then a key that starts another (and is not the first one's next letter).
    const [first, ...others] = words.slice().sort((a, b) => a.left - b.left);
    const other = others.find((word) => word.text[0] !== first?.text[0] && word.text[0] !== first?.text[1] && !others.some((pair) => pair !== word && pair.text[0] === word.text[0]));
    if (denseUntil > 0 && !switchTried && !locked && other !== undefined && !others.some((word) => word.text[0] === first.text[0])) {
      switchTried = true;
      await press(page, first.text[0]);
      await page.sleep(KEY_MS);
      await press(page, other.text[0]);
      keys += 2;
      continue;
    }
    const target = locked ?? first;
    if (target !== undefined) {
      const pair = !locked && words.some((word) => word !== target && word.text[0] === target.text[0]);
      const next = locked ? target.text[target.typed] : target.text[0];
      await press(page, next);
      keys += 1;
      if (pair) {
        await page.sleep(KEY_MS);
        await press(page, target.text[1]);
        keys += 1;
      }
      if (lockShot === null && locked && target.typed >= 2 && target.typed < target.text.length - 1) {
        await page.sleep(80);
        lockShot = await page.shot(out("td-1a-lock-" + size + ".png"));
      }
    }
    const state = await page.eval(td("return { ended: t.events().some((e) => e.t === 'waveEnd' && e.wave === 1), phase: t.state().phase };"));
    ended ||= state?.ended === true || state?.phase === "defeat"; // latched: the dense phase pushes the wave's end out of the recent events
    if (ended && denseUntil === 0 && state?.phase !== "defeat") {
      await page.eval(td(`const archer = t.state().buildings.find((b) => b.def === "archer"); t.send({ t: "setTempo", building: archer.id, idx: 6 }); return true;`));
      denseUntil = Date.now() + 12000;
    }
    await page.sleep(Math.max(0, KEY_MS - (Date.now() - tickAt)));
  }
  if (streamShot === null) streamShot = await page.shot(out("td-1a-stream-" + size + ".png"));

  const final = await page.eval(
    td("return { flags: t.flags(), state: t.state(), stats: t.stats(), typing: t.typing(), hash: t.hash(), log: t.log(), hits: t.events().filter((e) => e.t === 'wordHit').map((e) => e.grade), switches: t.events().filter((e) => e.t === 'wordKey' && e.result === 5).length };"),
  );
  const replayFile = out("td-1a-stream-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify({ ...final?.flags, tick: final?.state?.tick, hash: final?.hash, log: final?.log ?? [] }));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/td/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  const stats = final?.stats ?? {};
  const checks = {
    ready,
    archerPlaced: Array.isArray(spot),
    wave1Ended: ended,
    streamDone: (stats.streamDone ?? 0) > 0,
    severalWordsLive: maxLive >= 2,
    firstLettersDistinct: problems.length === 0,
    softSwitch: (final?.switches ?? 0) > 0,
    wordShotsFired: (stats.wordShots ?? 0) > 0,
    lockPicture: lockShot !== null,
    densePicture: denseShot !== null,
    realKeysReachedTheGame: (stats.keys ?? 0) >= keys * 0.95,
    nodeReplaysToBrowserHash: replay?.match === true,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  const grades = {};
  for (const grade of final?.hits ?? []) grades[grade] = (grades[grade] ?? 0) + 1;
  return {
    pass,
    checks,
    wpm: WPM,
    keysSent: keys,
    vocabulary: final?.flags?.vocabulary,
    stats: { streamSpawned: stats.streamSpawned, streamDone: stats.streamDone, streamMissed: stats.streamMissed, keys: stats.keys, keyErrors: stats.keyErrors, strays: stats.strays, wordShots: stats.wordShots, fizzles: stats.fizzles, kills: stats.kills, damageWordShot: stats.damageWordShot, goldWord: stats.goldWord },
    grades,
    typing: final?.typing,
    maxLive,
    lives: final?.state?.lives,
    problems,
    replay: { file: replayFile, ...replay },
    shots: [streamShot, lockShot, denseShot].filter(Boolean),
  };
}
