// The boot splash: shots while the page starts, and when it lifts (the deck
// must be complete by then: no "Loading your day…", Warp has a balance).
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/boot-splash.mjs
import { DEV_URL, out } from "./common.mjs";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const result = { shots: [], timeline: [] };
  const started = Date.now();
  await page.goto(base + "/", { waitLoad: false });
  const probe = `(() => {
    const splash = document.getElementById('bootSplash');
    return {
      splash: splash ? (splash.classList.contains('is-done') ? 'fading' : 'on') : 'gone',
      status: document.getElementById('bootStatus')?.textContent ?? '',
      today: !document.body.innerText.includes('Loading your day'),
      warp: document.getElementById('titleWarpBalance')?.textContent ?? '',
      ship: (document.querySelector('.th-ship-wrap')?.dataset.ship3d ?? '-') + (document.querySelector('.th-ship-wrap.has-ship3d') ? '+drawn' : ''),
      guide: document.querySelector('.th-guide')?.dataset.state ?? '-',
    };
  })()`;
  let shotOn = false;
  for (let i = 0; i < 60; i += 1) {
    const state = await page.eval(probe);
    if (state && typeof state === "object") {
      result.timeline.push({ ms: Date.now() - started, ...state });
      if (!shotOn && state.splash === "on") {
        shotOn = true;
        result.shots.push(await page.shot(out("boot-1-splash.jpg")));
      }
      if (state.splash === "gone") break;
    }
    await page.sleep(200);
  }
  await page.sleep(300);
  result.shots.push(await page.shot(out("boot-2-deck.jpg")));
  return result;
}
