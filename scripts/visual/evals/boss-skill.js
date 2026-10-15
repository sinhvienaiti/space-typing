// Dev server only. Boss Depth View skill check: starts a boss stage, spawns
// the boss and forces one skill. #stage=<n>&skill=<lance|quake|surge|tether|cataclysm>
// &at=<ms after the skill starts>[&type=<letters to type first>&typeAt=<ms>]
// [&quality=low|medium|high|ultra]
(async () => {
  const game = window.__spaceTypingGame;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const params = new URLSearchParams(location.hash.slice(1));
  const stage = Number(params.get("stage") ?? 100);
  const { createStageConfig } = await import("/src/campaign/stage.ts");
  const { difficultyFor } = await import("/src/campaign/difficulty.ts");
  if (params.get("quality")) game.updateSettings({ ...game.settings, visualQuality: params.get("quality") });
  game.setTestLabMode(true);
  game.startStage(createStageConfig(stage), difficultyFor({ stage, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }));
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  const spawned = game.boss !== null || game.testLabSpawnBoss();
  await sleep(Number(params.get("pre") ?? 2200));
  const skill = params.get("skill");
  let forced = false;
  if (skill) forced = game.testLabForceBossSkill(skill);
  const typeAt = Number(params.get("typeAt") ?? -1);
  if (typeAt >= 0) {
    await sleep(typeAt);
    const word = params.get("type") === "counter" ? game.bossSkill?.word ?? "" : params.get("type") ?? "";
    for (const letter of word) game.handleKey(letter);
  }
  await sleep(Math.max(0, Number(params.get("at") ?? 1200) - Math.max(0, typeAt)));
  const s = game.bossSkill;
  return {
    spawned,
    forced,
    relief: game.bossRelief !== null,
    boss: game.boss && { hp: Math.round(game.boss.hp), maxHp: game.boss.maxHp, phase: game.boss.phase, stagger: game.boss.staggerTimer },
    skill: s && { kind: s.kind, stage: s.stage, t: +s.t.toFixed(2), word: s.word, typed: s.typed, result: s.result },
    hull: game.stats.hull ?? game.stats.hp,
  };
})()
