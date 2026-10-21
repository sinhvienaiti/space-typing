// Rift Defense frame cost with a full rift (V4 plan §15): the roads of a map
// filled with N enemies (scouts, bombs, tanks, role enemies and 40-drone
// swarms) while all six towers strike, two burn, and the player types,
// measured uncapped. MAP=prism-spire by default.
//   CHROME_FLAGS="--disable-gpu-vsync --disable-frame-rate-limit --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling" \
//   URL=http://127.0.0.1:3098/ COUNTS=100,200,400 THROTTLE=1 Q=high node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense-perf.mjs --headful
import { DEV_URL, gesture, out } from "./common.mjs";

const d = (code) => "(() => { const d = window.__defense; if (!d) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const throttle = Number(process.env.THROTTLE ?? "1");
  const counts = (process.env.COUNTS || "100,200,400").split(",").map(Number);
  const result = { quality, throttle, runs: [] };
  await page.goto(base + "/defense.html", { settle: 300 });
  await page.eval("localStorage.setItem('spaceTypingDefenseQualityV1', '" + quality + "'), true");
  await page.goto(base + "/defense.html", { settle: 1200 });
  await gesture(page);
  for (let wait = 0; wait < 480; wait += 1) {
    if (await page.eval(d("return d.ready();"))) break;
    await page.sleep(250);
  }
  if (throttle > 1) await page.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  for (const count of counts) {
    await page.eval(d("return d.start('" + (process.env.MAP || "prism-spire") + "');"), { await: true });
    await page.eval(d("d.build(0,'gravity',2); d.build(1,'frost',2); d.build(2,'arc',2); d.build(3,'beacon',2); d.build(5,'sanctum',2); d.build(9,'siphon',1); d.build(4,'frost',1); d.damage(4, 0.2); d.damage(9, 0); d.engine.wave = 8; return d.flood(" + count + ");"));
    // Keep the dragon firing: type a word every 0.7 s while measuring.
    await page.eval("(() => { window.__perfTyper = setInterval(() => { const d = window.__defense; const w = d.nearestWord(); if (w) d.type(w); }, 700); return true; })()");
    await page.sleep(2500);
    const measured = await page.eval(d("return d.measure(4);"));
    await page.eval("clearInterval(window.__perfTyper), true");
    result.runs.push({ count, ...measured });
    await page.shot(out("defense-perf-" + quality + "-x" + throttle + "-" + count + ".jpg"));
  }
  return result;
}
