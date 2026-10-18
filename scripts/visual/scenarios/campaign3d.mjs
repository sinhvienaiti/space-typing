// Campaign 3D (beta): menu, a normal stage (typing, kills, Nova beam, hit),
// a boss stage (boss words, defeat, victory, result) and a defeat.
//   URL=http://127.0.0.1:3095/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d.mjs
// (a dev server started after `models:prepare`: Vite does not poll public/).
import { DEV_URL, gesture, out } from "./common.mjs";

const mode = (code) => "(() => { const m = window.__campaign3d; if (!m) return 'no handle'; " + code + " })()";

async function typeNearest(page, words, delay = 80) {
  const typed = [];
  for (let round = 0, waits = 0; round < words && waits < 40; ) {
    const word = String(await page.eval(mode("return m.nearestWord();")));
    if (!word) {
      waits += 1;
      await page.sleep(250);
      continue;
    }
    round += 1;
    typed.push(word);
    for (const letter of word) {
      await page.key(letter);
      await page.sleep(delay);
    }
    await page.sleep(260);
  }
  return typed;
}

export default async function (page) {
  // Q=medium: the page's Medium tier. BOSS=100: the boss stage to fight (default 10, G01 is 100).
  const quality = process.env.Q === "medium" ? "medium" : "high";
  const bossStage = Number(process.env.BOSS || 10);
  const prefix = "c3d" + (quality === "medium" ? "-medium" : "") + (bossStage === 10 ? "" : "-s" + bossStage);
  const result = { quality, bossStage, shots: [] };
  const shot = async (name) => result.shots.push(await page.shot(out(prefix + "-" + name + ".jpg")));
  const base = DEV_URL.replace(/\/$/, "");
  await page.goto(base + "/campaign-3d.html", { settle: 300 });
  await page.eval("localStorage.setItem('spaceTyping3dQualityV1', '" + quality + "'), true");
  await page.goto(base + "/campaign-3d.html", { settle: 1500 });
  await gesture(page);
  const started = Date.now();
  for (let wait = 0; wait < 240; wait += 1) {
    if (await page.eval(mode("return m.ready();"))) break;
    await page.sleep(250);
  }
  result.readyMs = Date.now() - started;
  result.status = await page.eval("document.getElementById('c3dStatus').textContent");
  await page.sleep(1200);
  await shot("menu");

  await page.click("#c3dStartButton");
  await page.sleep(1400);
  await shot("intro");
  await page.sleep(2400);
  result.stage1 = await typeNearest(page, 2);
  await shot("fight");
  result.stage1.push(...(await typeNearest(page, 2, 60)));
  await shot("fight-2");
  await page.eval(mode("m.nova(); return true;"));
  await page.sleep(1150);
  await shot("nova");
  await page.sleep(1500);
  await page.eval(mode("m.hurt(12); return true;"));
  await page.sleep(180);
  await shot("hit");
  result.phase1 = await page.eval(mode("const r = m.run; return r && { phase: r.phase, wave: r.wave, hull: r.hull, shield: r.shield, score: r.score, words: r.words };"));
  // Hands off: the next wave flies in to its firing line and shoots.
  await page.sleep(9000);
  await shot("incoming");
  result.incoming = await page.eval(mode("const r = m.run; return r && { phase: r.phase, hull: r.hull, shield: r.shield, targets: r.targets.map((t) => ({ w: t.word.text, a: Math.round(t.approach * 100) / 100, elite: t.elite })) };"));

  // A boss stage: stage 10 is the World's Mini Boss, 100 the Tyrant G01 (3D model).
  await page.eval(mode("m.start(" + bossStage + "); return true;"));
  await page.sleep(3200);
  await page.eval(mode("return m.boss();"));
  await page.sleep(2600);
  await shot("boss");
  result.boss = [];
  for (let round = 0; round < 20; round += 1) {
    const word = String(await page.eval(mode("return m.bossWord();")));
    if (!word) {
      const hp = await page.eval(mode("return m.run?.boss?.hp ?? 0;"));
      if (hp <= 0) break;
      await page.sleep(300);
      continue;
    }
    result.boss.push(word);
    for (const letter of word) {
      await page.key(letter);
      await page.sleep(55);
    }
    if (round === 1) {
      await page.sleep(380);
      await shot("boss-hit");
    }
    await page.sleep(520);
  }
  await page.sleep(900);
  await shot("boss-down");
  await page.sleep(2600);
  await shot("victory");
  for (let wait = 0; wait < 40; wait += 1) {
    if ((await page.eval(mode("return m.run?.phase ?? '';"))) === "result") break;
    await page.sleep(250);
  }
  await page.sleep(700);
  await shot("result");
  result.phase2 = await page.eval(mode("const r = m.run; return r && { phase: r.phase, cleared: r.cleared, score: r.score, words: r.words };"));
  result.saved = await page.eval("localStorage.getItem('spaceTyping3dCampaignV1')");

  // A defeat.
  await page.eval(mode("m.start(2); return true;"));
  await page.sleep(3600);
  await page.eval(mode("m.hurt(200); return true;"));
  await page.sleep(1500);
  await shot("death");
  await page.sleep(2600);
  await shot("defeat");
  return result;
}
