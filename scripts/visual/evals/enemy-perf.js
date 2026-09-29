// Dev server only. 8 fixed enemies of mixed kinds; rAF interval stats
// over 4 s (fps, p50, p95). Baseline 29/09/2026 at DPR 2: 12.9 fps before
// removing enemy shadowBlur, 57-58 fps after.
(async () => {
  const game = window.__spaceTypingGame;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  game.setTestLabMode(true);
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  const kinds = ["scout", "tank", "mine", "sniper", "healer", "shield", "carrier", "leech"];
  const ids = [];
  kinds.forEach((kind) => ids.push(...game.testLabSpawnEnemies({ kind, count: 1 })));
  const w = window.innerWidth, h = window.innerHeight;
  ids.forEach((id, i) => { const e = game.enemies.find((x) => x.id === id); if (!e) return; game.testLabPatchEnemy(id, { speed: 0, actionCooldown: 120 }); e.x = e.baseX = w * (0.14 + (i % 4) * 0.24); e.drift = 0; e.y = h * (i < 4 ? 0.24 : 0.46); });
  await sleep(1200);
  const intervals = []; let last = performance.now(); const t0 = last;
  await new Promise((resolve) => { const tick = () => { const now = performance.now(); intervals.push(now - last); last = now; if (now - t0 < 4000) requestAnimationFrame(tick); else resolve(); }; requestAnimationFrame(tick); });
  intervals.shift();
  const sorted = [...intervals].sort((a, b) => a - b);
  const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  return { fps: +(1000 / avg).toFixed(1), p50: +sorted[Math.floor(sorted.length * 0.5)].toFixed(1), p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1), frames: intervals.length, enemies: game.enemies.length, dpr: window.devicePixelRatio };
})()
