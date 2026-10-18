// Campaign 3D: the fireball model in flight (slowed to 0.12× so the 0.4 s
// flight can be shot), a word's big last fireball, and the early enemies
// (rainbow scout model) on the firing line.
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-fireball.mjs
// Q=medium for the Medium tier.
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const prefix = "fireball" + (quality === "medium" ? "-medium" : "");
  const result = { quality, shots: [], notes: {} };
  const shot = async (name) => result.shots.push(await page.shot(out(prefix + "-" + name + ".jpg")));
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/campaign-3d.html", { settle: 300 });
  await page.eval("localStorage.setItem('spaceTyping3dQualityV1', '" + quality + "'), true");
  await page.goto(base + "/campaign-3d.html", { settle: 1500 });
  await gesture(page);
  for (let wait = 0; wait < 480; wait += 1) {
    if (await page.eval(mode("return m.ready();"))) break;
    await page.sleep(250);
  }
  await page.eval(mode("m.start(1); return true;"));
  const waitWord = async () => {
    for (let wait = 0; wait < 80; wait += 1) {
      const word = String((await page.eval(mode("return m.nearestWord();"))) ?? "");
      if (word.length >= 2) return word;
      await page.sleep(200);
    }
    return "";
  };
  let word = await waitWord();
  // Let the first enemies reach the firing line.
  await page.sleep(4200);
  await shot("enemies");
  result.notes.model = await page.eval(mode("return m.fireballModel();"));
  word = String((await page.eval(mode("return m.nearestWord();"))) ?? word);
  result.notes.word = word;

  // One letter, slowed.
  await page.eval(mode("m.slow(0.12); return true;"));
  await page.key(word[0]);
  for (const [delay, name] of [[260, "1"], [450, "2"], [450, "3"], [450, "4"], [450, "5"], [500, "6"]]) {
    await page.sleep(delay);
    await shot("small-" + name);
  }
  await page.eval(mode("m.slow(1); return true;"));
  await page.sleep(400);

  // The rest of the word at speed but the last letter, then the big one, slowed.
  word = String((await page.eval(mode("return m.nearestWord();"))) ?? "");
  for (const letter of word.slice(0, -1)) {
    await page.key(letter);
    await page.sleep(170);
  }
  await page.sleep(500);
  await page.eval(mode("m.slow(0.12); return true;"));
  await page.key(word[word.length - 1]);
  for (const [delay, name] of [[300, "1"], [500, "2"], [500, "3"], [500, "4"], [500, "5"], [600, "6"]]) {
    await page.sleep(delay);
    await shot("big-" + name);
  }
  await page.eval(mode("m.slow(1); return true;"));
  await page.sleep(2500);
  await shot("enemies-2");
  return result;
}
