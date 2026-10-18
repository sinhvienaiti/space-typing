// Campaign 3D with a Vietnamese input method on: an accented letter (what
// UniKey / EVKey send in place of a key) shows the "switch it off" note and is
// not scored; an IME's composing press is skipped; plain letters still type.
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-ime.mjs
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const result = { shots: [], notes: {} };
  await page.goto(base + "/campaign-3d.html", { settle: 1500 });
  await gesture(page);
  for (let wait = 0; wait < 480; wait += 1) {
    if (await page.eval(mode("return m.ready();"))) break;
    await page.sleep(250);
  }
  await page.eval(mode("m.start(1); return true;"));
  let word = "";
  for (let wait = 0; wait < 80 && word.length < 2; wait += 1) {
    word = String((await page.eval(mode("return m.nearestWord();"))) ?? "");
    if (word.length < 2) await page.sleep(200);
  }
  const typed = () => page.eval(mode("const r = m.run; return r ? { correct: r.correct, misses: r.misses } : null;"));
  result.notes.word = word;
  result.notes.before = await typed();
  // UniKey-style: a Backspace and an accented letter instead of the key.
  await page.key("Backspace", { code: "Backspace" });
  await page.key("ô", { code: "", text: "ô" });
  // An IME composing press (Chrome: key "Process", keyCode 229).
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Process", code: "KeyA", windowsVirtualKeyCode: 229 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Process", code: "KeyA", windowsVirtualKeyCode: 229 });
  await page.sleep(400);
  result.notes.afterVietnamese = await typed();
  result.notes.notice = await page.eval("({ hidden: document.getElementById('c3dImeNotice').hidden, on: document.getElementById('c3dImeNotice').classList.contains('is-on') })");
  result.shots.push(await page.shot(out("c3d-ime-notice.jpg")));
  // Plain letters still type.
  await page.key(word[0], { code: "Key" + word[0].toUpperCase() });
  await page.sleep(300);
  result.notes.afterLetter = await typed();
  return result;
}
