// Campaign 3D VFX close-up: the hero's flight, a left and a right punch (bolt
// from the palm), the two-palm finisher, the Nova breath, a hit on the shield,
// and the boss bolts. Each action is shot at a few moments after it starts.
//   URL=https://space.typing-game.local/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-vfx.mjs
// Q=medium for the Medium tier.
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const prefix = "vfx" + (quality === "medium" ? "-medium" : "");
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
  result.notes.hero = await page.eval(mode("return m.heroInfo ? m.heroInfo() : null;"));
  await page.eval(mode("m.start(1); return true;"));
  await page.sleep(2600);
  await shot("fly-a");
  await page.sleep(370);
  await shot("fly-b");

  const waitWord = async () => {
    for (let wait = 0; wait < 60; wait += 1) {
      const word = String((await page.eval(mode("return m.nearestWord();"))) ?? "");
      if (word.length >= 2) return word;
      await page.sleep(200);
    }
    return "";
  };
  // One letter = one punch; photographed through the punch.
  const punch = async (name, letter) => {
    await page.key(letter);
    await page.sleep(45);
    await shot(name + "-1-windup");
    await page.sleep(60);
    await shot(name + "-2-release");
    await page.sleep(110);
    await shot(name + "-3-bolt");
    await page.sleep(250);
  };
  let word = await waitWord();
  result.notes.word1 = word;
  await punch("punch-a", word[0]);
  await punch("punch-b", word[1]);
  // The rest of the word; the last letter is the two-palm finisher.
  for (const letter of word.slice(2, -1)) {
    await page.key(letter);
    await page.sleep(160);
  }
  await page.key(word[word.length - 1]);
  await page.sleep(80);
  await shot("finisher-1");
  await page.sleep(90);
  await shot("finisher-2-release");
  await page.sleep(200);
  await shot("finisher-3-impact");
  await page.sleep(900);

  // Nova breath.
  await page.eval(mode("m.nova(); return true;"));
  for (const [delay, name] of [[300, "nova-1-rear"], [380, "nova-2-release"], [250, "nova-3-breath"], [400, "nova-4-after"]]) {
    await page.sleep(delay);
    await shot(name);
  }
  await page.sleep(1600);
  await page.eval(mode("m.hurt(10); return true;"));
  await page.sleep(90);
  await shot("hit-1");
  await page.sleep(200);
  await shot("hit-2");

  // Boss bolts (barrage after a boss word).
  await page.eval(mode("m.start(10); return true;"));
  await page.sleep(3000);
  await page.eval(mode("return m.boss();"));
  await page.sleep(2400);
  word = String((await page.eval(mode("return m.bossWord();"))) ?? "");
  for (const letter of word) {
    await page.key(letter);
    await page.sleep(70);
  }
  await page.sleep(160);
  await shot("boss-barrage");
  await page.sleep(500);
  await shot("boss-barrage-2");
  result.notes.state = await page.eval(mode("const r = m.run; return r && { phase: r.phase, hull: r.hull, shield: r.shield, words: r.words };"));

  // The rest of the boss, then the victory set piece.
  for (let round = 0; round < 16; round += 1) {
    word = String((await page.eval(mode("return m.bossWord();"))) ?? "");
    if (!word) {
      if ((await page.eval(mode("return m.run?.boss?.hp ?? 0;"))) <= 0) break;
      await page.sleep(300);
      continue;
    }
    for (const letter of word) {
      await page.key(letter);
      await page.sleep(55);
    }
    await page.sleep(450);
  }
  await page.sleep(1300);
  await shot("victory-1");
  await page.sleep(1300);
  await shot("victory-2");

  // Intro (warp in) and death.
  await page.eval(mode("m.start(2); return true;"));
  await page.sleep(500);
  await shot("intro");
  await page.sleep(3000);
  await page.eval(mode("m.hurt(200); return true;"));
  await page.sleep(400);
  await shot("death-1");
  await page.sleep(1100);
  await shot("death-2");
  return result;
}
