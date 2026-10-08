// Dev server only (window.__spaceTypingGame). One enemy of each family:
// #mode=shots  -> each fires a pulse shot (family shot skins), capture at &at=ms (900)
// #mode=deaths -> each plays its family death burst at once, capture at &at=ms (160)
(async () => {
  const game = window.__spaceTypingGame;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const mode = new URLSearchParams(location.hash.slice(1)).get("mode") ?? "shots";
  game.setTestLabMode(true);
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  game.settings.enemyProjectileMode = "on";
  const defs = ["rainbow-scout", "angel-guard", "imp-spark", "snow-wisp", "prism-sprite", "leaf-puff", "shade-wisp", "star-core"];
  const kinds = ["scout", "tank", "mine", "sniper", "splitter", "healer", "leech", "carrier"];
  const w = window.innerWidth, h = window.innerHeight;
  const ids = [];
  defs.forEach((definitionId, i) => {
    const [id] = game.testLabSpawnEnemies({ definitionId, kind: kinds[i], count: 1, layers: 1 });
    if (id === undefined) return;
    ids.push(id);
    const e = game.enemies.find((x) => x.id === id);
    game.testLabPatchEnemy(id, { speed: 0, actionCooldown: 120 });
    e.x = e.baseX = w * (0.12 + (i % 4) * 0.25); e.drift = 0; e.y = h * (i < 4 ? 0.2 : 0.4);
  });
  await sleep(700);
  if (mode === "shots") {
    for (const id of ids) game.testLabForceEnemySkill(id, "pulse-shot");
    await sleep(Number(new URLSearchParams(location.hash.slice(1)).get("at") ?? 900));
  } else {
    // Straight to the family death burst (no bolt flight), at the enemy.
    for (const id of ids) {
      const e = game.enemies.find((x) => x.id === id);
      game.enemyImpactFx(e, e.x, e.y, 1.45, 0, "kill");
    }
    game.enemies = [];
    await sleep(Number(new URLSearchParams(location.hash.slice(1)).get("at") ?? 160));
  }
  return { mode, ids: ids.length, projectiles: game.projectiles.length, particles: game.combatFx.activeParticles, families: game.projectiles.map((p) => p.family) };
})()
