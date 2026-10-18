// The title guide (Draconis v4): greeting on arrival, then a few clicks
// (wave, flap, hop, bow, talk), each shot mid-action with its line.
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/title-guide.mjs
import { DEV_URL, gesture, out } from "./common.mjs";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const result = { shots: [] };
  const shot = async (name) => result.shots.push(await page.shot(out("guide-" + name + ".jpg")));
  await page.goto(base + "/", { settle: 1500 });
  await gesture(page);
  for (let wait = 0; wait < 240; wait += 1) {
    const ready = await page.eval("(() => { const g = document.querySelector('.th-guide'); return !!g && !g.hidden; })()");
    if (ready) break;
    await page.sleep(250);
  }
  result.box = await page.eval(`(() => {
    const g = document.querySelector('.th-guide');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), hidden: g.hidden };
  })()`);
  await page.sleep(900);
  await shot("1-greet");
  await page.sleep(2600);
  await shot("2-greet-later");
  result.lines = [];
  for (let click = 0; click < 5; click += 1) {
    await page.click(".th-guide-stage");
    await page.sleep(650);
    await shot("3-click-" + click);
    result.lines.push(await page.eval("document.querySelector('.th-guide-line')?.textContent ?? ''"));
    await page.sleep(1700);
  }
  return result;
}
