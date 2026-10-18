// Dev server only. Boss Depth View frame cost, A/B in one page: the modes
// rotate every 1.5 s while the boss loops a volley, a lance and a quake, and
// both the draw() CPU time and the frame interval are bucketed per mode.
// Modes: full (as shipped: GLB, FX layer over the model, High/Ultra bloom),
// nobloom (no boss bloom), nofx (no bloom and no over-the-boss FX layer),
// painted (no 3D: the painted sprite, as on Low).
// #stage=<n>&quality=<q>&modes=full,nofx,painted&ms=<total ms>
// For uncapped intervals start Chrome with --disable-gpu-vsync --disable-frame-rate-limit.
// docs/BOSS_DEPTH_VIEW_HANDOFF_2026-10-04.md §8.
(async () => {
  const game = window.__spaceTypingGame;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const params = new URLSearchParams(location.hash.slice(1));
  const stage = Number(params.get("stage") ?? 100);
  const { createStageConfig } = await import("/src/campaign/stage.ts");
  const { difficultyFor } = await import("/src/campaign/difficulty.ts");
  if (params.get("quality")) game.updateSettings({ ...game.settings, visualQuality: params.get("quality"), enemyProjectileMode: "on" });
  game.setTestLabMode(true);
  game.startStage(createStageConfig(stage), difficultyFor({ stage, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }));
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  // The model may still be downloading: wait for it (up to 60 s).
  for (let i = 0; i < 600 && !game.bossRelief?.available && game.settings.visualQuality !== "low"; i += 1) await sleep(100);
  if (game.settings.visualQuality !== "low" && !game.bossRelief?.available) throw new Error("Boss model did not load; refusing a misleading 2D performance result.");
  game.testLabSpawnBoss();
  game.boss.actionCooldown = 999;
  game.boss.maxHp = game.boss.hp = 1e9;
  // Fixed render scale, so the modes compare like for like.
  game.adaptiveRenderBudget.observe = () => false;
  await sleep(3000);
  const relief = game.bossRelief;
  const fx = game.bossFx;
  const glow = game.bossGlow;
  const original = { draw: fx.draw, under: fx.drawUnder, glow: glow.draw };
  const off = () => {};
  const modes = (params.get("modes") ?? "full,nobloom,nofx,painted").split(",");
  const apply = (m) => {
    game.bossRelief = m === "painted" ? null : relief;
    glow.draw = m === "full" ? original.glow : off;
    fx.draw = m === "nofx" ? off : original.draw;
    fx.drawUnder = m === "nofx" ? off : original.under;
  };
  const draw = Object.fromEntries(modes.map((m) => [m, []]));
  const frame = Object.fromEntries(modes.map((m) => [m, []]));
  const drawMethod = Object.getPrototypeOf(game).draw;
  let i = 0; let mode = modes[0]; let skip = 3; apply(mode);
  game.draw = function (t) { const s = performance.now(); drawMethod.call(this, t); if (skip <= 0) draw[mode].push(performance.now() - s); };
  let last = performance.now(); const t0 = last; let switchAt = t0 + 1500; let running = true;
  const tick = () => {
    const now = performance.now();
    if (skip > 0) skip -= 1; else frame[mode].push(now - last);
    last = now;
    if (now >= switchAt) { mode = modes[++i % modes.length]; apply(mode); switchAt = now + 1500; skip = 3; }
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const end = t0 + Number(params.get("ms") ?? 30000);
  while (performance.now() < end) {
    if (game.getPhase() !== "playing") throw new Error("Boss performance run left combat.");
    game.testLabSetResources({ hull: game.stats.maxHull, shield: game.stats.maxShield, energy: game.stats.maxEnergy });
    game.boss.actionCooldown = 999;
    game.fireBossProjectiles(game.boss); await sleep(500);
    game.testLabForceBossSkill("lance"); for (let k = 0; k < 80 && game.bossSkill !== null; k += 1) await sleep(50);
    game.fireBossProjectiles(game.boss); await sleep(500);
    game.testLabForceBossSkill("quake"); for (let k = 0; k < 80 && game.bossSkill !== null; k += 1) await sleep(50);
    game.testLabClearProjectiles(); await sleep(200);
  }
  running = false;
  delete game.draw;
  apply("full");
  const stat = (a) => { if (a.length === 0) return { n: 0 }; const s = [...a].sort((x, y) => x - y); const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2); return { n: s.length, mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p50: q(0.5), p95: q(0.95) }; };
  return {
    quality: game.settings.visualQuality,
    dpr: game.dpr,
    draw: Object.fromEntries(modes.map((m) => [m, stat(draw[m])])),
    frame: Object.fromEntries(modes.map((m) => [m, stat(frame[m])])),
    authoredModel: relief?.authoredModel !== null,
  };
})()
