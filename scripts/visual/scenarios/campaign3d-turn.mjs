// Campaign 3D: the turn between waves. Types wave 1 of stage 1 down, then
// shoots the break (slowed to 0.35×) as the dragon banks and the sky, stars
// and debris swing round, and the next wave arriving.
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-turn.mjs
// Q=medium for the Medium tier, MOTION=reduced for reduced motion.
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const reduced = process.env.MOTION === "reduced";
  const prefix = "turn" + (quality === "medium" ? "-medium" : "") + (reduced ? "-reduced" : "");
  const result = { quality, reduced, shots: [], notes: {} };
  const shot = async (name) => result.shots.push(await page.shot(out(prefix + "-" + name + ".jpg")));
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/campaign-3d.html", { settle: 300 });
  await page.eval("localStorage.setItem('spaceTyping3dQualityV1', '" + quality + "'), localStorage.setItem('spaceTypingMotionV1', '" + (reduced ? "reduced" : "full") + "'), true");
  await page.goto(base + "/campaign-3d.html", { settle: 1500 });
  await gesture(page);
  for (let wait = 0; wait < 480; wait += 1) {
    if (await page.eval(mode("return m.ready();"))) break;
    await page.sleep(250);
  }
  await page.eval(mode("m.start(1); return true;"));
  await page.sleep(2600);
  await shot("0-wave1");
  // Type wave 1 down.
  for (let round = 0; round < 120; round += 1) {
    const phase = await page.eval(mode("return m.run?.phase ?? null;"));
    if (phase === "break") break;
    const word = String((await page.eval(mode("return m.nearestWord();"))) ?? "");
    if (!word) {
      await page.sleep(250);
      continue;
    }
    for (const letter of word) {
      await page.key(letter);
      await page.sleep(60);
    }
    await page.sleep(250);
  }
  result.notes.phase = await page.eval(mode("const r = m.run; return r && { phase: r.phase, wave: r.wave, waves: r.plan.waves, phaseTime: r.phaseTime, targets: r.targets.map((t) => t.word.text + (t.alive ? '' : ' dead') + (t.dying ? ' dying' : '')) };"));
  await page.eval(mode("m.slow(0.35); return true;"));
  for (let index = 1; index <= 8; index += 1) {
    await page.sleep(index === 1 ? 300 : 650);
    await shot(index + "-break");
  }
  await page.eval(mode("m.slow(1); return true;"));
  await page.sleep(2500);
  await shot("9-wave2");
  result.notes.after = await page.eval(mode("return m.run?.phase ?? null;"));
  return result;
}
