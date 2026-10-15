// Dev server only. Starts a boss stage and spawns its boss (title card,
// aura, sigil). #stage=<n>&at=<ms>[&attack=1&pre=<ms>&phase=<1-3>]
// e.g. stage=100 Auriel (G01 Tyrant), 200 Vorgrath, 20 World Boss, 10 Mini Boss.
(async () => {
  const game = window.__spaceTypingGame;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const params = new URLSearchParams(location.hash.slice(1));
  const stage = Number(params.get("stage") ?? 100);
  const { createStageConfig } = await import("/src/campaign/stage.ts");
  const { difficultyFor } = await import("/src/campaign/difficulty.ts");
  game.setTestLabMode(true);
  game.startStage(createStageConfig(stage), difficultyFor({ stage, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }));
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  const spawned = game.boss !== null || game.testLabSpawnBoss();
  if (params.get("attack") === "1" && game.boss) {
    await sleep(Number(params.get("pre") ?? 1500));
    game.settings.enemyProjectileMode = "on";
    if (params.get("phase")) game.testLabSetBoss({ phase: Number(params.get("phase")) });
    game.fireBossProjectiles(game.boss);
  }
  await sleep(Number(params.get("at") ?? 700));
  return { spawned, name: game.boss?.name, identity: game.bossIdentity?.id, projectiles: game.projectiles.length };
})()
