// Typing Defense 1A.4 (docs/td/BUILD_NOW.md §6.2): three waves played with the
// keyboard alone, every press a trusted CDP Input.dispatchKeyEvent and no mouse
// event at all. Insert opens the build menu at the next suggested spot (Tab the
// next one, a digit the kind, Enter builds): two Tháp Cung and a Trại Lính.
// Tab focuses a building and Enter sends Draconis there; = makes its tempo
// denser; Shift+Enter calls each wave; the words are typed at 45 WPM. Between
// waves Draconis is sent to the other archer. __td is only read, never sent to,
// so every command in the log came from a key; a Node replay of that log must
// reach the browser's hash (§7 gate 4). Picture td-1a-keyboard mid-wave.
// Checks: ≥ 3 buildings, ≥ 2 sends, ≥ 1 tempo change, three waves won.
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-keyboard-only.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_URL, out } from "./common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
const WPM = Number(process.env.WPM ?? 45);
const KEY_MS = 60000 / (WPM * 5);
/** CDP key fields of the command keys used here. */
const KEYS = {
  Insert: ["Insert", 45], Tab: ["Tab", 9], Enter: ["Enter", 13], Escape: ["Escape", 27], Equal: ["=", 187], Minus: ["-", 189],
  Digit1: ["1", 49], Digit3: ["3", 51],
};

async function command(page, code, shift = false) {
  const [key, vk] = KEYS[code];
  const modifiers = shift ? 8 : 0;
  await page.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: vk, modifiers });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk, modifiers });
  await page.sleep(60);
}

async function letter(page, ch) {
  const vk = ch.toUpperCase().charCodeAt(0);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, code: "Key" + ch.toUpperCase(), text: ch, unmodifiedText: ch, windowsVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch, code: "Key" + ch.toUpperCase(), windowsVirtualKeyCode: vk });
}

const look = () => td("return { ui: t.ui(), state: t.state(), words: t.liveWords(), ended: t.events().filter((e) => e.t === 'waveEnd').map((e) => e.wave) };");

/** Tab until the building with id `id` is in focus (at most once around). */
async function focus(page, id) {
  for (let k = 0; k < 8; k += 1) {
    if ((await page.eval(td("return t.ui().focus;"))) === id) return true;
    await command(page, "Tab");
  }
  return false;
}

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const size = page.width + "x" + page.height;
  await page.goto(base + "/td.html?sandbox=1", { settle: 300 });
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  // Build: Insert + Enter (an archer at the first spot), Insert + Tab + Enter (the next spot), Insert + 3 + Enter (a barracks).
  await command(page, "Insert");
  await command(page, "Enter");
  await command(page, "Insert");
  await command(page, "Tab");
  await command(page, "Enter");
  await command(page, "Insert");
  await command(page, "Digit3");
  await command(page, "Enter");
  await page.sleep(1800); // construction: 1.5 s
  const built = (await page.eval(td("return t.state().buildings;"))).filter((b) => b.def !== "keep");
  const archers = built.filter((b) => b.def === "archer").map((b) => b.id);
  // Draconis to the first archer, its tempo one step denser, the card closed, wave 1 called.
  const focused = await focus(page, archers[0]);
  await command(page, "Enter");
  await command(page, "Equal");
  await command(page, "Escape");
  await command(page, "Enter", true);

  let keys = 0;
  let shot = null;
  let sends = 1;
  let calls = 1;
  const started = Date.now();
  let last = null;
  while (Date.now() - started < 240000) {
    const tickAt = Date.now();
    last = await page.eval(look());
    if (last === null || last.state.phase === "defeat" || last.ended.includes(3)) break;
    const { state, words } = last;
    // Between waves (the field clear, the next one counting): Draconis to the other archer once, then the next wave early.
    if (state.nextWaveAt >= 0 && state.enemies === 0 && state.wave < 3) {
      if (sends === 1) {
        await focus(page, archers[1]);
        await command(page, "Enter");
        await command(page, "Escape");
        sends += 1;
      }
      await command(page, "Enter", true);
      calls += 1;
      continue;
    }
    const locked = words.find((word) => word.locked);
    const target = locked ?? words.slice().sort((a, b) => a.left - b.left)[0];
    if (target !== undefined) {
      const pair = !locked && words.some((word) => word !== target && word.text[0] === target.text[0]);
      await letter(page, locked ? target.text[target.typed] : target.text[0]);
      keys += 1;
      if (pair) {
        await page.sleep(KEY_MS);
        await letter(page, target.text[1]);
        keys += 1;
      }
      if (shot === null && locked && locked.typed >= 2 && state.enemies > 0) shot = await page.shot(out("td-1a-keyboard-" + size + ".png"));
    }
    await page.sleep(Math.max(0, KEY_MS - (Date.now() - tickAt)));
  }
  if (shot === null) shot = await page.shot(out("td-1a-keyboard-" + size + ".png"));

  const final = await page.eval(td("return { flags: t.flags(), state: t.state(), stats: t.stats(), hash: t.hash(), log: t.log(), ended: t.events().filter((e) => e.t === 'waveEnd').map((e) => e.wave) };"));
  const log = final?.log ?? [];
  const replayFile = out("td-1a-keyboard-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify({ ...final?.flags, tick: final?.state?.tick, hash: final?.hash, log }));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/td/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }
  const count = (t) => log.filter((c) => c.t === t).length;
  const stats = final?.stats ?? {};
  const checks = {
    ready,
    focusedByTab: focused,
    threeBuildingsBuilt: count("build") >= 3 && (final?.state?.buildings?.length ?? 0) >= 4,
    twoSends: count("assignUnit") >= 2,
    tempoChanged: count("setTempo") >= 1,
    wavesCalledByKey: count("callWave") >= 3,
    threeWavesWon: (final?.ended ?? []).includes(3) && final?.state?.phase !== "defeat",
    // Only keys made commands: nothing a player could not press is in the log.
    onlyKeyCommands: log.every((c) => ["build", "assignUnit", "setTempo", "uiFocus", "callWave", "key", "backspace", "unlock"].includes(c.t)),
    realKeysReachedTheGame: (stats.keys ?? 0) >= keys * 0.95,
    nodeReplaysToBrowserHash: replay?.match === true,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return {
    pass,
    checks,
    wpm: WPM,
    keysSent: keys,
    sends,
    calls,
    commands: Object.fromEntries(["build", "assignUnit", "setTempo", "uiFocus", "callWave", "key"].map((t) => [t, count(t)])),
    buildings: final?.state?.buildings?.map((b) => b.def + "@" + b.x + "," + b.z + " tempo " + b.tempo),
    lives: final?.state?.lives,
    wavesEnded: final?.ended,
    stats: { streamDone: stats.streamDone, streamMissed: stats.streamMissed, keys: stats.keys, kills: stats.kills, leaks: stats.leaks },
    replay: { file: replayFile, ...replay },
    shots: [shot],
  };
}
