// Campaign 3D HUD and result screens: the in-flight HUD (stage card, vitals,
// low HP), a stage clear (boss stage 10, typed through) and a fall.
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-results.mjs
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const result = { shots: [], notes: {} };
  const shot = async (name) => result.shots.push(await page.shot(out("c3d-" + name + ".jpg")));
  await page.goto(base + "/campaign-3d.html", { settle: 1500 });
  await gesture(page);
  for (let wait = 0; wait < 480; wait += 1) {
    if (await page.eval(mode("return m.ready();"))) break;
    await page.sleep(250);
  }
  await shot("menu");

  // HUD in flight, then with low HP.
  await page.eval(mode("m.start(10); return true;"));
  await page.sleep(5200);
  await shot("hud");
  await page.eval(mode("m.hurt(45); return true;"));
  await page.sleep(1600);
  await page.eval(mode("m.hurt(30); return true;"));
  await page.sleep(900);
  await shot("hud-low");

  // A clear: the boss typed down.
  await page.eval(mode("m.start(10); return true;"));
  await page.sleep(3000);
  await page.eval(mode("return m.boss();"));
  await page.sleep(2400);
  for (let round = 0; round < 20; round += 1) {
    const word = String((await page.eval(mode("return m.bossWord();"))) ?? "");
    if (!word) {
      if ((await page.eval(mode("return m.run?.boss?.hp ?? 0;"))) <= 0) break;
      await page.sleep(300);
      continue;
    }
    for (const letter of word) {
      await page.key(letter);
      await page.sleep(55);
    }
    await page.sleep(450);
  }
  await page.sleep(8500);
  await shot("result-clear");
  result.notes.clear = await page.eval("({ title: document.getElementById('c3dResultTitle').textContent, sub: document.getElementById('c3dResultSub').textContent, best: document.getElementById('c3dResultBest').textContent, score: document.getElementById('c3dResultScore').textContent })");

  // A fall.
  await page.eval(mode("m.start(2); return true;"));
  await page.sleep(3200);
  await page.eval(mode("m.hurt(200); return true;"));
  await page.sleep(4600);
  await shot("result-fail");
  result.notes.fail = await page.eval("({ title: document.getElementById('c3dResultTitle').textContent, sub: document.getElementById('c3dResultSub').textContent, tip: document.getElementById('c3dResultTip').textContent })");
  return result;
}
