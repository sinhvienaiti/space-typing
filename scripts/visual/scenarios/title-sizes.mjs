// Title deck at common laptop sizes: the mode cards must clear the dock.
import { DEV_URL, out } from "./common.mjs";

export default async function (page) {
  const sizes = [[1907, 856], [1642, 799], [1366, 768], [1280, 720], [1100, 760]];
  await page.goto(DEV_URL, { settle: 7000 });
  const result = [];
  for (const [w, h] of sizes) {
    await page.viewport(w, h, 1);
    await page.sleep(900);
    await page.shot(out("size-" + w + "x" + h + ".jpg"));
    result.push(await page.eval(`(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
      const modes = r(".th-modes"), dock = r(".holo-dock");
      return { size: innerWidth + "x" + innerHeight, modesBottom: modes?.[1], dockTop: dock?.[0], clear: !!modes && !!dock && modes[1] <= dock[0] + 2 };
    })()`));
  }
  return result;
}
