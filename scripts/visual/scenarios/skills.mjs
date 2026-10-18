// Player skill effects at their peak (uses evals/skill-fx.js).
//   SKILLS="railgun:330,missile-swarm:700,meteor:900"  (id:ms after the cast)
import { DEV_URL, evalFile, gesture, out, startStage } from "./common.mjs";

export default async function (page) {
  const list = (process.env.SKILLS ?? "railgun:330,missile-swarm:700,chain-lightning:260,meteor:900,gravity-well:700,emp-burst:300,barrier:500,ultimate:600").split(",");
  const script = evalFile("skill-fx.js");
  const result = [];
  for (const item of list) {
    const [fx, at] = item.split(":");
    await page.goto("about:blank", { waitLoad: false });
    await page.goto(DEV_URL + "#fx=" + fx + "&at=" + at, { settle: 5000 });
    await gesture(page);
    await startStage(page, 12);
    await page.sleep(1500);
    const r = await page.eval(script);
    await page.shot(out("skill-" + fx + ".jpg"));
    result.push({ fx, forced: r?.forced, effects: r?.effects, error: r?.error ?? r?.evalError });
  }
  return result;
}
