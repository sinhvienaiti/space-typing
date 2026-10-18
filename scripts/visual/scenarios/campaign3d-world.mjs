// Campaign 3D, the World flowing past: a few stages from different Galaxies,
// each shot a few seconds apart so the passing sky, clouds, debris and
// landmark can be compared frame to frame.
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-world.mjs
// STAGES=1,230,610 by default.
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const stages = (process.env.STAGES || "1,230,610").split(",").map(Number);
  const result = { shots: [] };
  await page.goto(base + "/campaign-3d.html", { settle: 1200 });
  await gesture(page);
  for (let wait = 0; wait < 480; wait += 1) {
    if (await page.eval(mode("return m.ready();"))) break;
    await page.sleep(250);
  }
  for (const stage of stages) {
    await page.eval(mode("m.start(" + stage + "); return true;"));
    for (const [delay, name] of [[3500, "a"], [1500, "b"], [1500, "c"], [4000, "d"]]) {
      await page.sleep(delay);
      result.shots.push(await page.shot(out("world-" + stage + "-" + name + ".jpg")));
    }
    // PASS=1: a giant flyby (whale, derelict) at points along its course.
    if (process.env.PASS) {
      for (const t of [0.1, 0.4, 0.65, 0.85, 0.95]) {
        const shown = await page.eval(mode("return m.pass(" + t + ");"));
        await page.sleep(400);
        if (shown) result.shots.push(await page.shot(out("world-" + stage + "-pass-" + Math.round(t * 100) + ".jpg")));
      }
    }
  }
  return result;
}
