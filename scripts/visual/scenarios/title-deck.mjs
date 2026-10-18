// Title Command Deck: first screen, hover/press states, scrolled sections.
//   URL=https://space.typing-game.local/  (Play build) or the dev server (default)
import { DEV_URL, out } from "./common.mjs";

export default async function (page) {
  const tag = process.env.TAG ?? "deck";
  await page.goto(DEV_URL, { settle: 8000 });
  await page.shot(out(tag + "-top.png"));
  const layout = await page.eval(`(() => {
    const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    return { hero: r(".th-hero"), today: r("#titleToday"), modes: r(".th-modes"), dock: r(".holo-dock"), cta: r("#startButton"), ship3d: !!document.querySelector(".th-ship-wrap.has-ship3d") };
  })()`);
  await page.hover("#startButton");
  await page.sleep(500);
  await page.shot(out(tag + "-hover-cta.png"), { clip: { x: 0, y: 60, width: 960, height: 560 } });
  await page.hover(".th-modes .holo-mode:nth-child(3)");
  await page.sleep(500);
  await page.shot(out(tag + "-hover-mode.png"));
  // Press burst, ten times slower so the 0.5 s effect is visible.
  await page.slowAnimations(0.1);
  const pressed = await page.press("#stageSelectButton");
  if (pressed) {
    await page.sleep(150);
    await page.shot(out(tag + "-press.png"), { clip: { x: Math.max(0, pressed.x - 160), y: Math.max(0, pressed.y - 110), width: 320, height: 220 } });
    await page.release(pressed);
    await page.sleep(400);
    await page.eval(`[...document.querySelectorAll("dialog[open]")].forEach((d) => d.close())`);
  }
  await page.slowAnimations(1);
  for (let i = 1; i <= 3; i += 1) {
    await page.eval(`document.getElementById("titleScroll").scrollTo({ top: ${i} * 700, behavior: "instant" })`);
    await page.sleep(1200);
    await page.shot(out(tag + "-scroll" + i + ".png"));
  }
  return { layout };
}
