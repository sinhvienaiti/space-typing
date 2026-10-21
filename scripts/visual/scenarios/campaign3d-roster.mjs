// Campaign 3D generated models across the roster: each enemy family's
// stage (models on the firing line, facing the hero) and a set of bosses
// (the stage boss brought in at once), flown by one pilot.
//   URL=http://127.0.0.1:3098/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-roster.mjs
// ENEMY_STAGES=220,316 BOSS_STAGES=110,500 PILOT=vanguard Q=medium.
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const pilot = process.env.PILOT || "vanguard";
  // First stage of each family with most kinds in play (plan.ts), then one boss per rank and galaxy spread.
  const enemyStages = (process.env.ENEMY_STAGES || "220,240,260,316,356,412,452,508").split(",").map(Number);
  const bossStages = (process.env.BOSS_STAGES || "10,110,160,200,210,320,500,520,900").split(",").map(Number);
  const result = { quality, pilot, shots: [], looks: {} };
  await page.goto(base + "/campaign-3d.html", { settle: 300 });
  await page.eval("localStorage.setItem('spaceTyping3dQualityV1', '" + quality + "'), localStorage.setItem('spaceTyping3dPilotV1', '" + pilot + "'), true");
  await page.goto(base + "/campaign-3d.html", { settle: 1500 });
  await gesture(page);
  for (let wait = 0; wait < 480; wait += 1) {
    if (await page.eval(mode("return m.ready();"))) break;
    await page.sleep(250);
  }
  for (const stage of enemyStages) {
    await page.eval(mode("m.start(" + stage + "); return true;"));
    await page.sleep(10500);
    result.looks["enemies-" + stage] = await page.eval(mode("return m.looks().enemies;"));
    result.shots.push(await page.shot(out("roster-enemies-" + stage + ".jpg")));
  }
  for (const stage of bossStages) {
    await page.eval(mode("m.start(" + stage + "); return true;"));
    await page.sleep(2500);
    await page.eval(mode("return m.boss();"));
    await page.sleep(5000);
    result.looks["boss-" + stage] = await page.eval(mode("return m.looks().boss;"));
    result.shots.push(await page.shot(out("roster-boss-" + stage + ".jpg")));
  }
  return result;
}
