// Typing Defense 1A (docs/td/BUILD_NOW.md §6.2): td.html?sandbox=1 boots with
// no media at all, draws its ground, shows its HUD in Be Vietnam Pro, and logs
// no console error or page exception. A request the server refuses (a 403 or
// 404 font) reaches no console API, so the resource timings are read too.
// Exits 1 when a check fails.
//   URL=http://127.0.0.1:3110/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-boot.mjs --width=1280 --height=720
import { DEV_URL, gesture, out } from "./common.mjs";

const td = (code) => "(() => { const t = window.__td; if (!t) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const size = page.width + "x" + page.height;
  // The dev server's module requests would fill the default 250-entry buffer and hide later failures.
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: "performance.setResourceTimingBufferSize(100000);" });
  await page.goto(base + "/td.html?sandbox=1", { settle: 300 });
  await gesture(page);
  let ready = false;
  for (let wait = 0; wait < 80 && !ready; wait += 1) {
    ready = (await page.eval(td("return t.ready();"))) === true;
    if (!ready) await page.sleep(250);
  }
  await page.eval("document.fonts.ready.then(() => true)");
  const state = await page.eval(`(() => {
    const canvas = document.getElementById("tdCanvas");
    const hud = document.querySelector("#tdHud .td-chip");
    const box = hud ? hud.getBoundingClientRect() : null;
    const pixel = canvas.getContext("2d").getImageData(canvas.width >> 1, canvas.height >> 1, 1, 1).data;
    const media = performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => /\\.(png|jpe?g|webp|avif|ktx2|glb|gltf|bin|mp3|ogg|wav|m4a|webm|mp4)(\\?|$)/i.test(name));
    return {
      flags: window.__td.flags(),
      canvas: { width: canvas.width, height: canvas.height, css: [canvas.clientWidth, canvas.clientHeight], ratio: window.devicePixelRatio },
      ground: [pixel[0], pixel[1], pixel[2]],
      hud: box && { text: hud.textContent, left: box.left, top: box.top, width: Math.round(box.width), height: Math.round(box.height) },
      // The faces the chip draws with, the Vietnamese one included (its subtitle).
      font: document.fonts.check("700 14px 'Be Vietnam Pro'", "Typing Defense") && document.fonts.check("800 12px 'Be Vietnam Pro'", "Hộp cát") &&
        getComputedStyle(hud).fontFamily.startsWith('"Be Vietnam Pro"'),
      media,
      failed: performance.getEntriesByType("resource").filter((entry) => entry.responseStatus >= 400).map((entry) => entry.responseStatus + " " + entry.name),
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    };
  })()`);
  const shot = await page.shot(out("td-1a-boot-" + size + ".png"));
  const checks = {
    ready,
    sandbox: state?.flags?.sandbox === true,
    canvasFillsViewport: state?.canvas?.css?.[0] === page.width && state?.canvas?.css?.[1] === page.height,
    groundDrawn: JSON.stringify(state?.ground) === JSON.stringify([0x7d, 0xba, 0x5a]),
    hudShown: (state?.hud?.width ?? 0) > 0 && (state?.hud?.height ?? 0) > 0,
    fontLoaded: state?.font === true,
    noMedia: (state?.media?.length ?? 1) === 0,
    noFailedLoads: (state?.failed?.length ?? 1) === 0,
    noPageScroll: state?.scroll?.[0] <= page.width && state?.scroll?.[1] <= page.height,
    noConsoleErrors: page.logs.filter((line) => line.startsWith("error")).length === 0,
    noExceptions: page.exceptions.length === 0,
  };
  const pass = Object.values(checks).every(Boolean);
  if (!pass) process.exitCode = 1;
  return { pass, checks, state, shots: [shot] };
}
