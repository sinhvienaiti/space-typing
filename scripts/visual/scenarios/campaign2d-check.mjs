// The 2D Campaign through Practice (free: no Warp, no save change), with the
// title's load timeline: when the Today panel, Warp and the 3D ship and
// guide appear after the page opens.
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign2d-check.mjs
import { DEV_URL, out } from "./common.mjs";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const result = { shots: [], timeline: [] };
  const started = Date.now();
  await page.goto(base + "/", { settle: 0 });
  const probe = `(() => {
    const today = document.getElementById('titleToday');
    const warp = document.querySelector('.th-warp, #warpChargeValue, [data-warp]');
    return {
      today: today ? today.textContent.trim().slice(0, 30) : null,
      ship3d: !!document.querySelector('.th-ship-wrap.has-ship3d'),
      guide: (() => { const g = document.querySelector('.th-guide'); return !!g && !g.hidden; })(),
      warp: document.body.innerText.match(/WARP\\s*([^\\n]*)/)?.[1]?.slice(0, 20) ?? null,
      ready: !document.body.innerText.includes('Loading your day'),
    };
  })()`;
  for (let i = 0; i < 24; i += 1) {
    const at = Date.now() - started;
    const state = await page.eval(probe);
    result.timeline.push({ ms: at, ...state });
    if (i === 1 || i === 4 || i === 10) result.shots.push(await page.shot(out("c2d-title-" + i + ".jpg")));
    await page.sleep(250);
  }
  await page.click("#practiceButton");
  await page.sleep(7000);
  result.shots.push(await page.shot(out("c2d-practice-1.jpg")));
  await page.sleep(4000);
  result.shots.push(await page.shot(out("c2d-practice-2.jpg")));
  result.phase = await page.eval("document.body.innerText.match(/STAGE \\d+[^\\n]*/)?.[0] ?? ''");
  return result;
}
