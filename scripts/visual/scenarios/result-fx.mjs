// Stage Complete and Run Over cinematics (dev hook __resultPreview).
import { DEV_URL, gesture, out } from "./common.mjs";

export default async function (page) {
  const result = {};
  for (const kind of ["clear", "over"]) {
    await page.goto("about:blank", { waitLoad: false });
    await page.goto(DEV_URL, { settle: 7000 });
    await gesture(page);
    result[kind] = await page.eval(`(() => { if (typeof window.__resultPreview !== "function") return "no hook (dev server only)"; window.__resultPreview(${JSON.stringify(kind)}, 3, 5); return "ok"; })()`);
    await page.frames(out("result-" + kind), 8, 260);
  }
  return result;
}
