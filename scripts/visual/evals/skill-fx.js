// In-game skill effects on the dev server (needs window.__spaceTypingGame).
// Address hash: #fx=<skill id>|ultimate [&ship=<character id>] [&at=<ms>]
//   [&count=<enemies>] [&boss=1] [&hit=1] [&also=<second skill id>]
// Spawns a small wave with the Test Lab API, forces the skill (no Energy or
// cooldown), waits `at` ms so the effect is at its peak, then reports.
(async () => {
  const game = window.__spaceTypingGame;
  if (!game) return { error: "dev server only (window.__spaceTypingGame missing)" };
  const params = new URLSearchParams(location.hash.slice(1));
  const fx = params.get("fx") ?? "railgun";
  const at = Number(params.get("at") ?? 260);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const tactical = ["sanctuary", "gravity-well", "cleanse", "meteor", "missile-swarm", "railgun", "tractor-beam"];

  game.setTestLabMode(true);
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  game.testLabClearProjectiles();
  if (params.get("ship")) game.setCharacter(params.get("ship"));
  const ids = game.testLabSpawnEnemies({ kind: "scout", count: Number(params.get("count") ?? 6) });
  if (params.get("boss") === "1") game.testLabSpawnBoss();
  // Spread the wave over the upper field and hold it still.
  const width = window.innerWidth;
  const height = window.innerHeight;
  ids.forEach((id, index) => {
    const enemy = game.enemies.find((item) => item.id === id);
    if (!enemy) return;
    game.testLabPatchEnemy(id, { speed: 0 });
    enemy.x = enemy.baseX = width * (0.2 + (index % 3) * 0.3) + (index >= 3 ? width * 0.08 : 0);
    enemy.drift = 0;
    enemy.y = height * (index < 3 ? 0.26 : 0.46);
  });
  await sleep(600);

  const force = (id) => {
    if (tactical.includes(id)) game.setSupportSpells([id]);
    return game.testLabForceSkill(id).ok;
  };
  let forced;
  if (fx === "ultimate") {
    game.testLabSetResources({ power: 100 });
    game.handleKey(" ");
    forced = true;
  } else {
    forced = force(fx);
  }
  if (params.get("also")) force(params.get("also"));
  if (params.get("hit") === "1") {
    await sleep(200);
    game.testLabDamagePlayer(18);
  }
  await sleep(at);
  return {
    fx,
    forced,
    enemies: ids.length,
    effects: game.skillFx?.activeEffects ?? null,
    phase: game.getPhase(),
  };
})()
