// Campaign 3D camera angles side by side: the same moments (flight with
// targets in range, a bolt leaving the hand, the Nova breath) from the chase
// camera (play), three-quarter (flank) and side (profile).
//   URL=http://127.0.0.1:3095/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-camera.mjs
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const result = { shots: [] };
  const cams = (process.env.CAMS || "play,flank,profile").split(",");
  for (const cam of cams) {
    const shot = async (name) => result.shots.push(await page.shot(out("cam-" + cam + "-" + name + ".jpg")));
    await page.goto(base + "/campaign-3d.html?cam=" + cam, { settle: 1200 });
    await gesture(page);
    for (let wait = 0; wait < 480; wait += 1) {
      if (await page.eval(mode("return m.ready();"))) break;
      await page.sleep(250);
    }
    await page.eval(mode("m.start(1); return true;"));
    // Let a few targets come in to their firing line.
    await page.sleep(9500);
    await shot("1-fight");
    const word = String((await page.eval(mode("return m.nearestWord();"))) ?? "");
    if (word) {
      await page.key(word[0]);
      await page.sleep(130);
      await shot("2-bolt");
      for (const letter of word.slice(1)) {
        await page.key(letter);
        await page.sleep(140);
      }
      await page.sleep(60);
      await shot("3-finisher");
    }
    await page.sleep(700);
    await page.eval(mode("m.nova(); return true;"));
    await page.sleep(950);
    await shot("4-nova");
  }
  return result;
}
