// Defense render bench (defense-bench.html, build with SPACE_BENCH=1): measures
// every way of drawing the crowd at several sizes and writes a JSON report.
//   CHROME_FLAGS="--disable-gpu-vsync --disable-frame-rate-limit" URL=https://space.typing-game.local/ \
//     node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense-bench.mjs --headful
// Q=medium for the Medium tier, THROTTLE=4 to slow the CPU 4× (a weaker laptop),
// MODES=impostor,lod and COUNTS=50,100 to pick, VFX=0 without fireballs, SHOTS=1 for pictures.
import { writeFileSync, mkdirSync } from "node:fs";
import { DEV_URL, out } from "./common.mjs";

const bench = (code) => "(() => { const b = window.__bench; if (!b) return null; " + code + " })()";

export default async function (page) {
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const throttle = Number(process.env.THROTTLE ?? "1");
  const modes = (process.env.MODES ?? "sprite,batch,impostor,mesh,instanced,lod").split(",");
  const counts = (process.env.COUNTS ?? "25,50,100,200,400,800").split(",").map(Number);
  const vfx = process.env.VFX !== "0";
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/defense-bench.html?q=" + quality, { settle: 1000 });
  let ready = false;
  for (let wait = 0; wait < 240 && !ready; wait += 1) {
    ready = (await page.eval(bench("return b.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  if (!ready) {
    return { error: "bench not ready", page: await page.eval("location.href + ' | ' + document.title + ' | ' + typeof window.__bench + ' | ' + (document.getElementById('benchHud')?.textContent ?? '')") };
  }
  if (throttle > 1) await page.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  const info = await page.eval(bench("return b.info();"));
  // REPEAT passes, each in a rotated mode order, so a slow moment of the
  // machine (clocks, other programs) lands on different configurations; the
  // report keeps the median of each.
  const repeat = Number(process.env.REPEAT ?? "1");
  const configs = modes.flatMap((mode) =>
    // One copy of the model or 3 sprites each: past 400 that is no real option.
    counts.filter((count) => !((mode === "mesh" || mode === "sprite") && count > 400)).map((count) => ({ mode, count })),
  );
  const all = [];
  for (let pass = 0; pass < repeat; pass += 1) {
    const shift = Math.round((pass * configs.length) / repeat);
    const order = [...configs.slice(shift), ...configs.slice(0, shift)];
    for (const { mode, count } of order) {
      const result = await page.eval(bench("return b.measure(" + JSON.stringify({ mode, count, vfx, seconds: 2.5, warmup: 1.2 }) + ");"));
      all.push(result);
      if (pass === 0 && process.env.SHOTS === "1" && (count === 100 || count === 400)) await page.shot(out("bench-" + quality + "-" + mode + "-" + count + ".jpg"));
    }
  }
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const runs = configs.map(({ mode, count }) => {
    const samples = all.filter((run) => run && run.mode === mode && run.count === count);
    const pick = (key) => median(samples.map((run) => run[key]));
    return { mode, count, fps: pick("fps"), frameAvg: pick("frameAvg"), frameP95: pick("frameP95"), cpuAvg: pick("cpuAvg"), cpuP95: pick("cpuP95"), calls: pick("calls"), triangles: pick("triangles"), buildMs: pick("buildMs"), heapMB: pick("heapMB"), passes: samples.length };
  });
  const report = { quality, throttle, vfx, repeat, info, runs, all, at: new Date().toISOString() };
  const file = out("bench-" + quality + "-" + page.width + "x" + page.height + "@" + page.dpr + (throttle > 1 ? "-cpu" + throttle : "") + (vfx ? "" : "-novfx") + ".json");
  mkdirSync(file.replace(/[\\/][^\\/]+$/, ""), { recursive: true });
  writeFileSync(file, JSON.stringify(report, null, 1));
  return { file, info, summary: runs.map((run) => run.mode + " " + run.count + ": " + run.fps + " fps, p95 " + run.frameP95 + " ms, cpu " + run.cpuAvg + " ms, calls " + run.calls) };
}
