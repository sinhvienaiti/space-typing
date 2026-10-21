// Campaign 3D flown by Fleet ships: the menu's hangar view with the pilot
// list, the chase camera in a fight with the generated enemy models, a shot
// (the ship's projectile model, slowed to catch it in flight), the word's
// last letter from both guns, the Nova, and a boss stage's model.
//   URL=http://127.0.0.1:3098/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-ships.mjs
// PILOTS=vanguard,solar-lance (pilots.ts ids, "draconis" too), STAGE=12, BOSS_STAGE=40, Q=medium.
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return null; " + code + " })()";

export default async function (page) {
  const base = DEV_URL.replace(/\/$/, "");
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const pilots = (process.env.PILOTS || "vanguard,solar-lance,crimson-talon,eternal-sovereign").split(",");
  const stage = Number(process.env.STAGE || 12);
  const bossStage = Number(process.env.BOSS_STAGE || 40);
  const result = { quality, shots: [], notes: {} };
  for (const pilot of pilots) {
    const shot = async (name) => result.shots.push(await page.shot(out("ships-" + pilot + "-" + name + ".jpg")));
    const note = (result.notes[pilot] = {});
    await page.goto(base + "/campaign-3d.html", { settle: 300 });
    await page.eval("localStorage.setItem('spaceTyping3dQualityV1', '" + quality + "'), localStorage.setItem('spaceTyping3dPilotV1', '" + pilot + "'), true");
    await page.goto(base + "/campaign-3d.html", { settle: 1500 });
    await gesture(page);
    for (let wait = 0; wait < 480; wait += 1) {
      if (await page.eval(mode("return m.ready() && (m.heroInfo().id !== '' );"))) break;
      await page.sleep(250);
    }
    await page.sleep(2500);
    note.hero = await page.eval(mode("return m.heroInfo().id;"));
    note.shotModel = await page.eval(mode("return m.shotModel();"));
    await shot("1-menu");

    await page.eval(mode("m.start(" + stage + "); return true;"));
    await page.sleep(9500);
    note.fight = await page.eval(mode("return m.looks();"));
    await shot("2-fight");
    const word = String((await page.eval(mode("return m.nearestWord();"))) ?? "");
    if (word) {
      await page.eval(mode("m.slow(0.15); return true;"));
      await page.key(word[0]);
      await page.sleep(500);
      await shot("3-shot");
      await page.eval(mode("m.slow(1); return true;"));
      for (const letter of word.slice(1, -1)) {
        await page.key(letter);
        await page.sleep(140);
      }
      await page.eval(mode("m.slow(0.15); return true;"));
      await page.key(word[word.length - 1]);
      await page.sleep(600);
      await shot("4-final");
      await page.eval(mode("m.slow(1); return true;"));
    }
    await page.sleep(900);
    await page.eval(mode("m.nova(); return true;"));
    await page.sleep(1100);
    await shot("5-nova");

    await page.eval(mode("m.start(" + bossStage + "); return true;"));
    await page.sleep(2500);
    await page.eval(mode("return m.boss();"));
    await page.sleep(5500);
    note.boss = await page.eval(mode("return m.looks().boss;"));
    await shot("6-boss");
  }
  return result;
}
