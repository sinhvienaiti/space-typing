// Typing Defense 1A.5 (docs/td/BUILD_NOW.md §7 gates 4 and 5).
// Gate 5: "Đặt sẵn 4 ô", all four at 1 s, wave 1 called, then the sandbox's
// load test (TK 25.12 __td.flood) puts 300 enemies on the routes' first half
// while words are typed for real at 70 WPM through CDP. For ~10 s the page's
// own frame costs (__td.costs: the 2D view with the word cards, and the steps
// with the HUD and sound) are read: the 2D view and the cards must take
// ≤ 8 ms a frame (p95) at 1280 × 720. That is script time only, so Chrome's
// own count (CDP Performance.getMetrics) is gated too: the renderer's whole
// main thread (script, style, layout, paint, the scenario's own polling) a
// frame, over the window and over each ~0.5 s of it (p95), ≤ 8 ms, at
// ≥ 55 frames a second (raster and the GPU run on other threads; a frame
// rate held shows they keep up). Picture td-1a-perf.
// Gate 4: the golden run's command log (tests/golden/td-1a.json, made by Node
// through scripts/td/golden.ts --log) is stepped in Chrome by the same modules
// (Vite serves /src), and every 60-tick hash must be Node's; the scenario's
// own log, flood included, must replay on Node to the page's __td.hash().
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-perf.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_URL, gesture, out } from "./common.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";
const WPM = Number(process.env.WPM ?? 70);
const FLOOD = 300;
const WINDOW_MS = 10000;
const DRAW_P95_MS = 8;
const FRAME_MS = 8;
const SAMPLE_MS = 500;
/** TEMPO index of 1 s (src/td/content/rules.ts). */
const ONE_SECOND = 6;

async function press(page, letter) {
  const code = "Key" + letter.toUpperCase();
  const vk = letter.toUpperCase().charCodeAt(0);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: letter, code, text: letter, unmodifiedText: letter, windowsVirtualKeyCode: vk });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: letter, code, windowsVirtualKeyCode: vk });
}

const stats = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  const round = (v) => Math.round(v * 1000) / 1000;
  return { frames: sorted.length, mean: round(sorted.reduce((s, v) => s + v, 0) / Math.max(1, sorted.length)), median: round(at(0.5)), p95: round(at(0.95)), max: round(sorted.at(-1) ?? 0) };
};

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const size = page.width + "x" + page.height;
  await page.goto(base + "/td.html?sandbox=1", { settle: 300 });
  await gesture(page);
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }

  // "Đặt sẵn 4 ô", everyone at their building, then 1 s everywhere, one knob turn at a time.
  await page.eval(td(`t.send({ t: "sandbox", op: { op: "preset" } }); return true;`));
  let arrived = false;
  for (let wait = 0; wait < 120 && !arrived; wait += 1) {
    await page.sleep(250);
    arrived = (await page.eval(td("const s = t.state(); return s.buildings.length === 5 && s.agents.every((a) => a.goal >= 0 && a.at === a.goal);"))) === true;
  }
  const ids = await page.eval(td(`return t.state().buildings.filter((b) => b.def !== "keep").map((b) => b.id);`));
  for (const id of ids) {
    await page.eval(td(`t.send({ t: "setTempo", building: ${id}, idx: 6 }); return true;`));
    await page.sleep(350);
  }
  await page.eval(td(`t.send({ t: "callWave" }); return true;`));
  await page.sleep(500);
  await page.eval(td(`t.flood(${FLOOD}); return true;`));
  await page.sleep(100);
  await page.eval(`window.__perfFrames = 0; (function count() { window.__perfFrames += 1; requestAnimationFrame(count); })(); true`);
  await page.send("Performance.enable", { timeDomain: "timeTicks" });
  const metrics = async () => Object.fromEntries((await page.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const samples = [{ frames: await page.eval("window.__perfFrames"), ...(await metrics()) }];

  // The window: type for real, watch the field.
  const keyMs = 60000 / (WPM * 5);
  let keys = 0;
  let minEnemies = Infinity;
  let maxEnemies = 0;
  let maxWords = 0;
  const dealers = new Set();
  const tempoLooks = [];
  const started = Date.now();
  while (Date.now() - started < WINDOW_MS) {
    const at = Date.now();
    const look = await page.eval(td(`const s = t.state(); return { words: t.liveWords(), enemies: s.enemies, frames: window.__perfFrames, tempos: s.buildings.filter((b) => b.def !== "keep").map((b) => b.tempo) };`));
    if (look === null) break;
    if (at - samples.at(-1).at >= SAMPLE_MS || samples.length === 1) samples.push({ at, frames: look.frames, ...(await metrics()) });
    tempoLooks.push(look.tempos);
    minEnemies = Math.min(minEnemies, look.enemies);
    maxEnemies = Math.max(maxEnemies, look.enemies);
    maxWords = Math.max(maxWords, look.words.length);
    for (const word of look.words) dealers.add(word.building);
    const locked = look.words.find((word) => word.locked);
    const target = locked ?? look.words.slice().sort((a, b) => a.left - b.left)[0];
    if (target !== undefined) {
      const pair = !locked && look.words.some((word) => word !== target && word.text[0] === target.text[0]);
      await press(page, locked ? target.text[target.typed] : target.text[0]);
      keys += 1;
      if (pair) {
        await page.sleep(keyMs);
        await press(page, target.text[1]);
        keys += 1;
      }
    }
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  const frames = await page.eval("window.__perfFrames");
  samples.push({ frames, ...(await metrics()) });
  const costs = await page.eval(td("return t.costs();"));
  const seconds = (Date.now() - started) / 1000;
  // Chrome's main thread a frame: the window's mean by kind, and each sample interval's whole task time a frame.
  const [first, last] = [samples[1], samples.at(-1)];
  const perFrame = (name) => +(((last[name] - first[name]) * 1000) / Math.max(1, last.frames - first.frames)).toFixed(3);
  const intervals = samples.slice(2).map((sample, k) => ((sample.TaskDuration - samples[k + 1].TaskDuration) * 1000) / Math.max(1, sample.frames - samples[k + 1].frames));
  const main = {
    frames: last.frames - first.frames,
    taskMean: perFrame("TaskDuration"), scriptMean: perFrame("ScriptDuration"), styleMean: perFrame("RecalcStyleDuration"), layoutMean: perFrame("LayoutDuration"),
    // Over each sample interval (~0.5 s): count, mean, median, p95, max.
    intervals: (({ frames: count, ...rest }) => ({ count, ...rest }))(stats(intervals)),
  };
  const take = (list) => list.slice(-Math.min(list.length, frames));
  const draw = stats(take(costs?.draw ?? []));
  const update = stats(take(costs?.update ?? []));
  const shot = await page.shot(out("td-1a-perf-" + size + ".png"));

  // Gate 4 in Chrome: the golden log, stepped by the page's own modules.
  const goldenFile = out("td-1a-golden-log.json");
  let nodeGolden = null;
  try {
    nodeGolden = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/td/golden.ts"), "--check", "--log", goldenFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    nodeGolden = { same: false, error: String(error.stdout || error.message).trim() };
  }
  const golden = JSON.parse(readFileSync(goldenFile, "utf8"));
  const chrome = await page.eval(`(async () => {
    const { createWorld, step } = await import("/src/td/sim/world.ts");
    const { hashHex } = await import("/src/td/sim/hash.ts");
    const { compileDeck } = await import("/src/td/typing/decks.ts");
    const run = ${JSON.stringify(golden)};
    const deck = compileDeck(run.words.flatMap((texts, index) => texts.map((text, k) => ({ id: "golden-" + (index + 1) + "-" + k, text, level: index + 1 }))));
    const world = createWorld({ seed: run.seed, deck, expected: run.expected });
    const hashes = [];
    let next = 0;
    while (world.tick < run.ticks) {
      const from = next;
      while (next < run.log.length && run.log[next].tick === world.tick) next += 1;
      step(world, run.log.slice(from, next));
      world.events.rare.length = 0;
      if (world.tick % run.every === 0) hashes.push(hashHex(world));
    }
    return { deck: deck.hash, content: world.c.hash, hashes };
  })()`);
  const firstDiff = (chrome?.hashes ?? []).findIndex((hash, k) => hash !== golden.hashes[k]);

  // The page's own log, flood included, on Node.
  const final = await page.eval(td("return { flags: t.flags(), state: t.state(), stats: t.stats(), hash: t.hash(), log: t.log(), rejected: t.events().filter((e) => e.t === 'rejected') };"));
  const replayFile = out("td-1a-perf-replay-" + size + ".json");
  writeFileSync(replayFile, JSON.stringify({ ...final?.flags, tick: final?.state?.tick, hash: final?.hash, log: final?.log ?? [] }));
  let replay = null;
  try {
    replay = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/td/replay.ts"), replayFile], { cwd: root, encoding: "utf8" }));
  } catch (error) {
    replay = { match: false, error: String(error.stdout || error.message).trim() };
  }

  const checks = {
    ready,
    presetAssisted: arrived && ids.length === 4,
    fourBuildingsDealtAt1s: dealers.size >= 4 && tempoLooks.length > 0 && tempoLooks.every((tempos) => tempos.length === 4 && tempos.every((tempo) => tempo === ONE_SECOND)),
    floodOnTheField: minEnemies >= FLOOD * 0.8,
    drawAndCardsWithin8msP95: draw.frames >= 200 && draw.p95 <= DRAW_P95_MS,
    mainThreadWithin8msPerFrame: main.frames >= 200 && main.intervals.count >= 10 && main.taskMean <= FRAME_MS && main.intervals.p95 <= FRAME_MS,
    holds55fps: frames / seconds >= 55,
    goldenSameInNodeAndChrome: nodeGolden?.same === true && chrome?.deck === golden.deck && chrome?.content === golden.content && chrome?.hashes?.length === golden.hashes.length && firstDiff < 0,
    nodeReplaysToBrowserHash: replay?.match === true,
    noRejectedCommand: (final?.rejected ?? []).length === 0,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return {
    pass,
    checks,
    window: { seconds: +seconds.toFixed(1), frames, fps: +(frames / seconds).toFixed(1), enemies: [minEnemies, maxEnemies], maxLiveWords: maxWords, keysSent: keys, wpm: WPM },
    drawAndCardsMs: draw,
    stepsAndHudMs: update,
    chromeMainThreadMsPerFrame: main,
    golden: { node: nodeGolden, chromeHashes: chrome?.hashes?.length ?? chrome, firstDiffAtTick: firstDiff < 0 ? null : (firstDiff + 1) * golden.every, log: goldenFile },
    vocabulary: final?.flags?.vocabulary,
    stats: { kills: final?.stats?.kills, streamDone: final?.stats?.streamDone, keys: final?.stats?.keys },
    replay: { file: replayFile, ...replay },
    shots: [shot],
  };
}
