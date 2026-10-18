// Deploy from the title (ship launch → stage card → play), then back to the title.
import { DEV_URL, out } from "./common.mjs";

export default async function (page) {
  await page.goto(DEV_URL, { settle: 7000 });
  await page.click("#startButton");
  const launch = await page.frames(out("launch"), 8, 40);
  await page.sleep(2500);
  const phase = await page.eval(`window.__spaceTypingGame?.getPhase?.()`);
  await page.eval(`window.__spaceTypingGame?.backToTitle?.()`);
  const back = await page.frames(out("launch-back"), 4, 60);
  return { phase, frames: launch.length + back.length };
}
