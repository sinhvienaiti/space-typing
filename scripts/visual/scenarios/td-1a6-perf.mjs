// Typing Defense 1A.6 "Lời Gọi" (docs/td/BUILD_1A6.md §12 gates 2, 3 and 8): frame cost, step cost and
// determinism in Chrome.
// Frames: a busy village (the sandbox preset at Bastion level 4, three more farms and two archers as
// sites for the four builders, twelve more trees marked, the helpers among the farms) and a crowded
// night (the sandbox's "Sinh đêm", then __td.flood(300)); words are typed for real at 70 WPM while for
// ~10 s the page's own frame costs (__td.costs: the 2D view with the word cards, and the steps with the
// HUD and sound) and Chrome's main thread (CDP Performance.getMetrics) are read: the view and the cards
// ≤ 8 ms a frame (p95) over ≥ 200 frames, the main thread ≤ 8 ms a frame (mean and p95 of ~0.5 s
// intervals), ≥ 55 frames a second.
// Steps (gate 3): the page's own modules (Vite serves /src) build tests/td/perf.ts's loaded world in
// Chrome (Bastion 4, six archers, three barracks, a mine, four farms, nine villagers, twenty marked
// trees, the helpers out, a night with 300 enemies no shot ends) and time 600 steps, ten at a time
// (the page's clock is coarse): median and p95 ≤ 0.5 ms.
// Determinism (gate 2): Node runs the golden bot (scripts/td/golden.ts --check --log) and Chrome steps its
// log with the page's modules: every 60-tick hash must be Node's, and the golden file must be current;
// the page's own log (flood included) replays on Node to the page's hash. Picture td-1a6-perf.
//   URL=http://127.0.0.1:3140/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a6-perf.mjs --width=1280 --height=720
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ROOT, boot, consoleChecks, finish, letter, out, replayOnNode, sandbox, send, sizeOf, state, td } from "./td-1a6-common.mjs";

const WPM = Number(process.env.WPM ?? 70);
const FLOOD = 300;
const WINDOW_MS = 10000;
const DRAW_P95_MS = 8;
const FRAME_MS = 8;
const SAMPLE_MS = 500;
const STEP_MS = 0.5;
const q = (m) => Math.round(m * 4);

const stats = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
  const round = (v) => Math.round(v * 1000) / 1000;
  return { frames: sorted.length, mean: round(sorted.reduce((s, v) => s + v, 0) / Math.max(1, sorted.length)), median: round(at(0.5)), p95: round(at(0.95)), max: round(sorted.at(-1) ?? 0) };
};

/** tests/td/perf.ts loadedWorld(300, 0) in the page, from its own modules; then 600 timed steps after 60. */
const STEP_COST = `(async () => {
  const { createWorld, step } = await import("/src/td/sim/world.ts");
  const { placeBuilding } = await import("/src/td/sim/commands.ts");
  const { addVillager, countNpcs } = await import("/src/td/sim/systems/economy.ts");
  const { NPC_KIND } = await import("/src/td/sim/stores/npcs.ts");
  const { loadDeck } = await import("/src/td/app/vocab.ts");
  const { deck } = await loadDeck();
  const w = createWorld({ seed: 1, deck, gold: 5000, wood: 5000 });
  const at = (body) => step(w, [{ ...body, tick: w.tick }]);
  at({ t: "sandbox", op: { op: "keepLevel", value: 4 } });
  const put = (id, x, z) => placeBuilding(w, w.c.buildingIndex(id), x, z, w.map.nodes.findIndex((n) => n.x === x && n.z === z), true);
  for (const [x, z] of [[-18, -14], [-18, -8], [-8, -16], [-8, -8], [7, -25], [10, -8]]) put("archer", x, z);
  for (const [x, z] of [[2, 18], [8, 12], [-10, 16]]) put("barracks", x, z);
  put("gold-mine", 26, -30);
  for (const [x, z] of [[-17, 40], [-30, 30], [-36, -6], [30, 6]]) put("farm", x, z);
  while (countNpcs(w, NPC_KIND.villager) < 9) addVillager(w);
  for (let t = 0; t < 20; t += 1) w.trees.marked[t] = 1;
  step(w, [[-4, 14], [-20, 36], [-26, -24], [30, 2]].map(([x, z], a) => ({ t: "move", agent: a, qx: x * 4, qz: z * 4, tick: w.tick })));
  at({ t: "sandbox", op: { op: "night" } });
  w.spawnQueue.length = 0;
  for (const e of w.enemies.live()) w.enemies.release(e);
  w.waveAlive[1] = 0;
  w.lives = 1e6;
  const ids = ["cuong-thi", "ma-troi", "thuong-luong"];
  for (let k = 0; k < ${FLOOD}; k += 1) {
    const id = ids[k % 3];
    const route = id === "ma-troi" ? w.lanes.length - 1 : k % 2;
    const index = w.c.enemyIndex(id);
    const enemy = w.c.enemies[index];
    const s = w.enemies.add(index, enemy.hp, enemy.altitude, route, 0, 0);
    w.enemies.dist[s] = 5 + ((k * 0.37) % 90);
    const p = w.lanes[route].point(w.enemies.dist[s], 0, { x: 0, z: 0 });
    w.enemies.x[s] = p.x;
    w.enemies.z[s] = p.z;
    w.waveAlive[0] = (w.waveAlive[0] ?? 0) + 1;
    w.enemies.hp[s] = 1e7;
  }
  // performance.now() is coarse in a page that is not cross-origin isolated (0.1 ms): steps are timed ten at a time.
  for (let k = 0; k < 60; k += 1) step(w);
  const enemiesAtStart = w.enemies.count;
  const times = [];
  for (let k = 0; k < 60; k += 1) {
    const start = performance.now();
    for (let n = 0; n < 10; n += 1) step(w);
    times.push((performance.now() - start) / 10);
  }
  times.sort((a, b) => a - b);
  const farms = w.buildings.live().filter((b) => w.c.buildings[w.buildings.def[b]].farm).length;
  return {
    steps: times.length * 10, median: times[times.length >> 1], p95: times[Math.floor(times.length * 0.95)], max: times[times.length - 1],
    enemiesAtStart, enemies: w.enemies.count, villagers: countNpcs(w, NPC_KIND.villager), farms, marked: Array.from(w.trees.marked).filter(Boolean).length, phase: w.phase, calls: w.calls.count,
  };
})()`;

export default async function (page) {
  const size = sizeOf(page);
  const ready = await boot(page);

  // The busy village.
  await sandbox(page, "preset");
  await sandbox(page, "keepLevel", 4);
  await sandbox(page, "gold", 5000);
  await sandbox(page, "wood", 2000);
  await page.sleep(300); // the commands act on the next tick
  const defs = await page.eval(td("return t.defs();"));
  const farm = defs.indexOf("farm");
  const archer = defs.indexOf("archer");
  await send(page,
    ...[[-30, 30], [-36, -6], [30, 6]].map(([x, z]) => ({ t: "build", def: farm, qx: q(x), qz: q(z) })),
    ...[[-8, 28], [9, 27]].map(([x, z]) => ({ t: "build", def: archer, qx: q(x), qz: q(z) })));
  const marks = await page.eval(td("return t.state().trees.map((tree, k) => [k, tree]).filter(([, tree]) => tree.standing && !tree.marked).slice(0, 12).map(([k]) => k);"));
  await send(page, ...marks.map((tree) => ({ t: "markTree", tree })));
  await page.sleep(300);
  const preset = await state(page);
  const presetFarm = preset.buildings.find((b) => b.def === "farm");
  await send(page,
    { t: "move", agent: 0, qx: q(0), qz: q(14) },
    { t: "assignUnit", agent: 1, building: presetFarm.id },
    { t: "move", agent: 2, qx: q(17), qz: q(37) },
    { t: "move", agent: 3, qx: q(-4), qz: q(26) });
  await page.sleep(4000);
  const village = await state(page);

  // The crowded night.
  await sandbox(page, "night");
  await page.sleep(400);
  await page.eval(td(`t.flood(${FLOOD}); return true;`));
  await page.sleep(150);
  await page.eval(`window.__perfFrames = 0; (function count() { window.__perfFrames += 1; requestAnimationFrame(count); })(); true`);
  await page.send("Performance.enable", { timeDomain: "timeTicks" });
  const metrics = async () => Object.fromEntries((await page.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const samples = [{ at: Date.now(), frames: await page.eval("window.__perfFrames"), ...(await metrics()) }];
  const keyMs = 60000 / (WPM * 5);
  let keys = 0;
  let minEnemies = Infinity;
  let maxEnemies = 0;
  let maxWords = 0;
  let maxCalls = 0;
  const started = Date.now();
  while (Date.now() - started < WINDOW_MS) {
    const at = Date.now();
    const look = await page.eval(td(`const s = t.state(); return { words: t.liveWords(), enemies: s.enemies, calls: s.calls.length, frames: window.__perfFrames };`));
    if (look === null) break;
    if (at - samples.at(-1).at >= SAMPLE_MS) samples.push({ at, frames: look.frames, ...(await metrics()) });
    minEnemies = Math.min(minEnemies, look.enemies);
    maxEnemies = Math.max(maxEnemies, look.enemies);
    maxWords = Math.max(maxWords, look.words.length);
    maxCalls = Math.max(maxCalls, look.calls);
    const locked = look.words.find((word) => word.locked);
    const target = locked ?? look.words.slice().sort((a, b) => b.age - a.age)[0];
    if (target !== undefined) {
      await letter(page, locked ? target.text[target.typed] : target.text[0]);
      keys += 1;
    }
    await page.sleep(Math.max(0, keyMs - (Date.now() - at)));
  }
  const frames = await page.eval("window.__perfFrames");
  samples.push({ at: Date.now(), frames, ...(await metrics()) });
  const costs = await page.eval(td("return t.costs();"));
  const seconds = (Date.now() - started) / 1000;
  const [first, last] = [samples[1] ?? samples[0], samples.at(-1)];
  const perFrame = (name) => +(((last[name] - first[name]) * 1000) / Math.max(1, last.frames - first.frames)).toFixed(3);
  const intervals = samples.slice(2).map((sample, k) => ((sample.TaskDuration - samples[k + 1].TaskDuration) * 1000) / Math.max(1, sample.frames - samples[k + 1].frames));
  const main = {
    frames: last.frames - first.frames,
    taskMean: perFrame("TaskDuration"), scriptMean: perFrame("ScriptDuration"), styleMean: perFrame("RecalcStyleDuration"), layoutMean: perFrame("LayoutDuration"),
    intervals: (({ frames: count, ...rest }) => ({ count, ...rest }))(stats(intervals)),
  };
  const take = (list) => list.slice(-Math.min(list.length, frames));
  const draw = stats(take(costs?.draw ?? []));
  const update = stats(take(costs?.update ?? []));
  const shot = await page.shot(out("td-1a6-perf-" + size + ".png"));
  const night = await state(page);

  // Gate 3: the step cost of the loaded world, in Chrome.
  const stepCost = await page.eval(STEP_COST);

  // Gate 2: Node's golden run, its log stepped in Chrome by the page's modules.
  const goldenFile = out("td-1a6-golden-log-" + size + ".json");
  mkdirSync(dirname(goldenFile), { recursive: true });
  let nodeGolden = null;
  try {
    nodeGolden = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", resolve(ROOT, "scripts/td/golden.ts"), "--check", "--log", goldenFile], { cwd: ROOT, encoding: "utf8" }));
  } catch (error) {
    try {
      nodeGolden = JSON.parse(String(error.stdout).trim().split("\n")[0]);
    } catch {
      nodeGolden = { same: false, error: String(error.stdout || error.message).trim().slice(0, 400) };
    }
  }
  let golden = null;
  try {
    golden = JSON.parse(readFileSync(goldenFile, "utf8"));
  } catch {}
  const chrome = golden === null ? null : await page.eval(`(async () => {
    const { createWorld, step } = await import("/src/td/sim/world.ts");
    const { hashHex } = await import("/src/td/sim/hash.ts");
    const { compileDeck } = await import("/src/td/typing/decks.ts");
    const run = ${JSON.stringify(golden)};
    const deck = compileDeck(run.words.flatMap((texts, index) => texts.map((text, k) => ({ id: "golden-" + (index + 1) + "-" + k, text, level: index + 1 }))));
    const world = createWorld({ seed: run.seed, deck, expected: run.expected, vocab: run.vocab, mode: run.mode });
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
  const firstDiff = (chrome?.hashes ?? []).findIndex((hash, k) => hash !== golden?.hashes[k]);
  const replay = await replayOnNode(page, "td-1a6-perf");

  const checks = {
    ready,
    busyVillage: village.npcs.length >= 10 && village.buildings.filter((b) => b.def === "farm").length >= 4 && village.calls.length >= 4,
    floodOnTheField: minEnemies >= FLOOD * 0.8,
    typedInTheWindow: keys >= 30,
    drawAndCardsWithin8msP95: draw.frames >= 200 && draw.p95 <= DRAW_P95_MS,
    mainThreadWithin8msPerFrame: main.frames >= 200 && main.intervals.count >= 10 && main.taskMean <= FRAME_MS && main.intervals.p95 <= FRAME_MS,
    holds55fps: frames / seconds >= 55,
    loadedWorldAsGate3: stepCost?.enemiesAtStart >= FLOOD && stepCost?.enemies >= FLOOD * 0.8 && stepCost?.villagers === 9 && stepCost?.farms === 4 && stepCost?.marked >= 20 && stepCost?.phase === "night",
    simStepWithinHalfMs: stepCost?.median <= STEP_MS && stepCost?.p95 <= STEP_MS,
    chromeStepsNodeGoldenLog: chrome !== null && chrome.deck === golden.deck && chrome.content === golden.content && chrome.hashes.length === golden.hashes.length && firstDiff < 0,
    goldenFileCurrent: nodeGolden?.same === true,
    nodeReplaysToBrowserHash: replay.match === true,
    ...consoleChecks(page),
  };
  return finish(page, checks, {
    window: { seconds: +seconds.toFixed(1), frames, fps: +(frames / seconds).toFixed(1), enemies: [minEnemies, maxEnemies], maxLiveWords: maxWords, maxCalls, keysSent: keys, wpm: WPM },
    village: { npcs: village.npcs.length, farms: village.buildings.filter((b) => b.def === "farm").length, buildings: village.buildings.length, calls: village.calls.length, marked: village.trees.filter((tree) => tree.marked).length },
    night: { phase: night.phase, enemies: night.enemies, lives: night.lives },
    drawAndCardsMs: draw, stepsAndHudMs: update, chromeMainThreadMsPerFrame: main,
    simStepMs: stepCost,
    golden: { node: nodeGolden && { same: nodeGolden.same, changed: nodeGolden.changed, content: nodeGolden.content, ticks: nodeGolden.ticks, error: nodeGolden.error }, chromeHashes: chrome?.hashes?.length ?? null, firstDiffAtTick: firstDiff < 0 ? null : (firstDiff + 1) * (golden?.every ?? 60), log: goldenFile },
    replay, shots: [shot],
  });
}
