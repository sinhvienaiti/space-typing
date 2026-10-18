// Winged-character demo (character-demo.html): one picture per action.
//   node scripts/visual/cdp-run.mjs scripts/visual/scenarios/character-demo.mjs
// Q=medium for the Medium tier. Pictures: .visual/scenarios/char-*.jpg
import { DEV_URL, QUALITY, gesture, out } from "./common.mjs";

const demo = (code) => "(() => { const d = window.__characterDemo; if (!d) return 'no demo handle'; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/character-demo.html?auto=0&quality=" + QUALITY, { settle: 1500 });
  await gesture(page);
  const started = Date.now();
  for (let wait = 0; wait < 240; wait += 1) {
    if (await page.eval(demo("return d.hero !== null;"))) break;
    await page.sleep(250);
  }
  const info = await page.eval(demo("return d.hero;"));
  const result = { info, loadMs: Date.now() - started, shots: [] };
  const snap = async (name, action, delay, setup = "") => {
    await page.eval(demo(setup + (action ? "d.act(" + JSON.stringify(action) + ");" : "") + "return true;"));
    await page.sleep(delay);
    result.shots.push(await page.shot(out("char-" + QUALITY + "-" + name + ".jpg")));
  };
  await page.sleep(2600);
  await snap("fly", "fly", 1500);
  // Type the nearest word partly: bolts in flight, attack clip.
  const word = await page.eval(demo("const t = d.state; return [...document.querySelectorAll('.cd-word:not(.is-gone)')].map((e) => e.textContent)[0] ?? '';"));
  result.word = word;
  for (const ch of String(word).slice(0, 3)) {
    await page.key(ch);
    await page.sleep(70);
  }
  result.shots.push(await page.shot(out("char-" + QUALITY + "-attack.jpg")));
  await page.sleep(900);
  await snap("boost", "boost", 650);
  await page.sleep(2200);
  await snap("cast-charge", "cast", 700);
  await page.sleep(470);
  result.shots.push(await page.shot(out("char-" + QUALITY + "-cast-beam.jpg")));
  await page.sleep(1500);
  await snap("burst", "burst", 1000);
  await page.sleep(1500);
  await snap("hit", "hit", 640);
  await page.sleep(1200);
  await snap("victory", "victory", 1300);
  await page.sleep(3400);
  await snap("death", "death", 1100);
  await page.sleep(3200);
  await snap("side", "fly", 1800, "d.setCamera('side');");
  await snap("show", null, 2200, "d.setCamera('show');");
  await snap("orbit", "boost", 1600, "d.setCamera('orbit');");
  result.particles = await page.eval(demo("return d.particles();"));
  result.stats = await page.eval("[...document.querySelectorAll('.cd-stats dd')].map((e) => e.textContent)");
  result.status = await page.eval("document.getElementById('demoStatus').textContent");
  return result;
}
