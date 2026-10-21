// Rift Defense map art: writes each map's layout guide (the road, tower
// pads, Core and gates in flat colours, exactly where the game expects
// them) and the ground the game paints until the owner's art exists, for
// docs/art-requests/DEFENSE_MAPS_PROMPTS_2026-10-21.md.
//   URL=http://127.0.0.1:3098/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense-map-guides.mjs
// GUIDES_DIR overrides the folder (default docs/art-requests/defense-maps).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DEV_URL } from "./common.mjs";

const d = (code) => "(() => { const d = window.__defense; if (!d) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const folder = resolve(process.env.GUIDES_DIR || "docs/art-requests/defense-maps");
  mkdirSync(folder, { recursive: true });
  await page.goto(base + "/defense.html", { settle: 1500 });
  const ids = await page.eval(d("return d.maps();"));
  const written = [];
  for (const [index, id] of ids.entries()) {
    for (const [guide, size, suffix] of [[true, 1024, "layout.png"], [false, 768, "now.jpg"]]) {
      const url = await page.eval(d("return d.paint('" + id + "', " + size + ", " + guide + ");"));
      const file = join(folder, String(index + 1).padStart(2, "0") + "-" + id + "-" + suffix);
      writeFileSync(file, Buffer.from(String(url).split(",")[1], "base64"));
      written.push(file);
    }
  }
  return written;
}
