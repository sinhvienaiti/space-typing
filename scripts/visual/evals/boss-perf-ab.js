// Dev server only. Boss Depth View frame cost, A/B in one page: the modes
// rotate every 1.5 s during the boss fight and frame intervals are bucketed
// per mode. Modes: full (3D relief, as shipped), half (re-render every other
// frame), lambert (cheaper material), painted (flat painting, like before).
// #stage=<n>&quality=<q>&modes=full,painted&ms=<total ms>
// docs/BOSS_DEPTH_VIEW_HANDOFF_2026-10-04.md §8.
(async () => {
  const game = window.__spaceTypingGame;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const params = new URLSearchParams(location.hash.slice(1));
  const stage = Number(params.get("stage") ?? 100);
  const { createStageConfig } = await import("/src/campaign/stage.ts");
  const { difficultyFor } = await import("/src/campaign/difficulty.ts");
  const THREE = await import("/node_modules/.vite/deps/three.js").catch(() => null);
  if (params.get("quality")) game.updateSettings({ ...game.settings, visualQuality: params.get("quality") });
  game.setTestLabMode(true);
  game.startStage(createStageConfig(stage), difficultyFor({ stage, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }));
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  game.testLabSpawnBoss();
  await sleep(4000);
  const relief = game.bossRelief;
  const standard = relief.mesh.material;
  const lambert = THREE ? new THREE.MeshLambertMaterial({ map: standard.map, alphaTest: 0.4, side: THREE.DoubleSide, emissive: new THREE.Color(0xffffff), emissiveMap: standard.map, emissiveIntensity: 0.05 }) : null;
  let flip = 0;
  const half = { available: true, render: (pose) => (flip++ % 2 === 0 ? relief.render(pose) : relief.renderer.domElement) };
  const modes = (params.get("modes") ?? "full,half,lambert,painted").split(",");
  const apply = (m) => {
    relief.mesh.material = m === "lambert" && lambert ? lambert : standard;
    game.bossRelief = m === "painted" ? null : m === "half" ? half : relief;
  };
  const buckets = Object.fromEntries(modes.map((m) => [m, []]));
  let i = 0; let mode = modes[0]; apply(mode);
  let last = performance.now(); const t0 = last; let switchAt = t0 + 1500; let skip = 0;
  await new Promise((resolve) => {
    const tick = () => {
      const now = performance.now();
      if (skip > 0) skip -= 1; else buckets[mode].push(now - last);
      last = now;
      if (now >= switchAt) { mode = modes[++i % modes.length]; apply(mode); switchAt = now + 1500; skip = 3; }
      if (now - t0 < Number(params.get("ms") ?? 24000)) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
  apply("full");
  const stat = (a) => { if (a.length === 0) return { n: 0 }; const s = [...a].sort((x, y) => x - y); const q = (p) => +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1); return { n: s.length, mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1), p50: q(0.5), p90: q(0.9) }; };
  return { quality: game.settings.visualQuality, lambertLoaded: lambert !== null, ...Object.fromEntries(modes.map((m) => [m, stat(buckets[m])])) };
})()
