// Galaxy Tyrant G01 (stage 100): intro, idle, volley, a forced skill, hit, death.
//   Q=medium|high|ultra  SKILL=lance|quake|surge|tether|cataclysm
import { DEV_URL, QUALITY, gesture, out, startStage } from "./common.mjs";

export default async function (page) {
  const skill = process.env.SKILL ?? "lance";
  const tag = "boss-" + QUALITY;
  await page.goto(DEV_URL, { settle: 6000 });
  await gesture(page);
  const phase = await startStage(page, 100);
  const spawned = await page.eval(`(() => { const g = window.__spaceTypingGame; g.testLabSetSchedulerFrozen(true); g.testLabClearEnemies(); const ok = g.boss !== null || g.testLabSpawnBoss(); return { ok, id: g.bossIdentity?.id }; })()`);
  await page.frames(out(tag + "-intro"), 6, 400);
  await page.sleep(1200);
  await page.shot(out(tag + "-idle.png"));
  await page.eval(`(() => { const g = window.__spaceTypingGame; g.settings.enemyProjectileMode = "on"; g.fireBossProjectiles(g.boss); })()`);
  await page.frames(out(tag + "-volley"), 6, 150);
  await page.sleep(1500);
  const forced = await page.eval(`window.__spaceTypingGame.testLabForceBossSkill(${JSON.stringify(skill)})`);
  await page.frames(out(tag + "-" + skill), 10, 260);
  await page.sleep(1500);
  // A word-complete style hit, then the death sequence.
  await page.eval(`(() => { const g = window.__spaceTypingGame; if (g.boss) { g.boss.flash = 1; } })()`);
  await page.frames(out(tag + "-hit"), 3, 80);
  await page.eval(`(() => { const g = window.__spaceTypingGame; if (g.boss && typeof g.defeatBoss === "function") g.defeatBoss(); })()`);
  await page.frames(out(tag + "-death"), 8, 220);
  // Frame time with the boss on screen (respawn).
  await page.eval(`(() => { const g = window.__spaceTypingGame; g.testLabSpawnBoss(); })()`);
  await page.sleep(2500);
  const perf = await page.eval(`new Promise((done) => { const d = []; let last = performance.now(); let n = 0; const f = (t) => { d.push(t - last); last = t; if (++n < 240) requestAnimationFrame(f); else { d.sort((a, b) => a - b); done({ median: +d[120].toFixed(2), p95: +d[228].toFixed(2) }); } }; requestAnimationFrame(f); })`);
  return { phase, spawned, forced, perf };
}
