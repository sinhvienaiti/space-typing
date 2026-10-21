import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestGame } from "./helpers/game-harness";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import type { BossHudState, BossState } from "../src/boss/model";
import type { Game } from "../src/Game";

/** The boss falls through handleKey: the word is recorded once, the HUD closes last. */
type BossInternals = { boss: BossState | null };

const word = "barrier";

/** A major boss mid-fight in `phase`, on the word "barrier". */
function bossFight(phase: number): {
  game: Game;
  boss: BossState;
  hud: (BossHudState | null)[];
  completed: string[];
} {
  const hud: (BossHudState | null)[] = [];
  const completed: string[] = [];
  const game = createTestGame([{ id: "barrier", en: word, vi: "", ipa: "" }], {
    onBossUpdate: (state) => hud.push(state),
    onWordComplete: (entry) => completed.push(entry.en),
  });
  game.setTestLabMode(true);
  game.startStage(
    createStageConfig(100),
    difficultyFor({ stage: 100, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }),
  );
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  expect(game.testLabSpawnBoss()).toBe(true);
  const boss = (game as unknown as BossInternals).boss!;
  // A plain word: no shield, armour part or word mechanic between the keys and the HP.
  boss.entry = { id: "barrier", en: word, vi: "", ipa: "" };
  boss.typed = 0;
  boss.shieldActive = false;
  boss.parts = [];
  boss.typingMechanic = undefined;
  boss.phase = phase;
  hud.length = 0;
  return { game, boss, hud, completed };
}

/** HP one letter of the boss word takes. */
function keyDamage(game: Game, boss: BossState): number {
  const before = boss.hp;
  game.handleKey(word[0]!);
  const damage = before - boss.hp;
  expect(damage).toBeGreaterThan(0);
  return damage;
}

function bossAttempts(game: Game): { en: string; outcome: string }[] {
  return game
    .getStageSessionSnapshot()
    .wordAttempts.filter((attempt) => attempt.source === "boss")
    .map(({ en, outcome }) => ({ en, outcome }));
}

describe("boss defeat flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("closes the boss HUD last when the finished word's damage defeats the boss", () => {
    // The last phase: the key's damage cannot open a new phase before the word ends.
    const { game, boss, hud, completed } = bossFight(3);
    const damage = keyDamage(game, boss);
    for (const letter of word.slice(1, -1)) game.handleKey(letter);
    // The last key leaves the boss standing; the word's damage brings it down.
    boss.hp = damage * 1.5;
    hud.length = 0;

    game.handleKey(word.at(-1)!);

    expect((game as unknown as BossInternals).boss).toBeNull();
    expect(hud.at(-1)).toBeNull();
    expect(hud.every((state) => state === null || state.hp > 0)).toBe(true);
    expect(completed).toEqual([word]);
    expect(bossAttempts(game)).toEqual([{ en: word, outcome: "perfect" }]);
    expect(game.getStageSessionSnapshot().bossKills).toBe(1);
    game.destroy();
  });

  it("records the word as completed when the last key's own damage defeats the boss", () => {
    // Phase 1: at 0 HP the boss falls without opening its last phase first
    // (no phase roar, no 0 HP bar).
    const { game, boss, hud, completed } = bossFight(1);
    const damage = keyDamage(game, boss);
    for (const letter of word.slice(1, -1)) game.handleKey(letter);
    boss.hp = damage * 0.5;
    hud.length = 0;

    game.handleKey(word.at(-1)!);

    expect((game as unknown as BossInternals).boss).toBeNull();
    // Only the closing HUD: no 0 HP bar of a last phase.
    expect(hud).toEqual([null]);
    expect(boss.phase).toBe(1);
    expect(completed).toEqual([word]);
    expect(bossAttempts(game)).toEqual([{ en: word, outcome: "perfect" }]);
    expect(game.getStageSessionSnapshot().interruptedWords).toBe(0);
    expect(game.getStageSessionSnapshot().bossKills).toBe(1);
    game.destroy();
  });

  it("completes the word when the last key's damage opens the next phase", () => {
    // Phase 1 just above two thirds of its HP: the last key alone crosses into phase 2.
    const { game, boss, hud, completed } = bossFight(1);
    const damage = keyDamage(game, boss);
    for (const letter of word.slice(1, -1)) game.handleKey(letter);
    boss.hp = boss.maxHp * 0.66 + damage * 0.5;
    hud.length = 0;

    game.handleKey(word.at(-1)!);

    expect(completed).toEqual([word]);
    expect(bossAttempts(game)).toEqual([{ en: word, outcome: "perfect" }]);
    expect(game.getStageSessionSnapshot().interruptedWords).toBe(0);
    // The phase opens after the word's damage, on a fresh word.
    expect((game as unknown as BossInternals).boss).toBe(boss);
    expect(boss.phase).toBe(2);
    expect(boss.typed).toBe(0);
    expect(hud.at(-1)).toMatchObject({ phase: 2 });
    game.destroy();
  });

  it("interrupts the word once when a key in the middle of it defeats the boss", () => {
    const { game, boss, hud, completed } = bossFight(1);
    const damage = keyDamage(game, boss);
    boss.hp = damage * 0.5;
    hud.length = 0;

    game.handleKey(word[1]!);

    expect((game as unknown as BossInternals).boss).toBeNull();
    expect(hud).toEqual([null]);
    expect(completed).toEqual([]);
    expect(bossAttempts(game)).toEqual([{ en: word, outcome: "interrupted" }]);
    expect(game.getStageSessionSnapshot().bossKills).toBe(1);
    game.destroy();
  });
});
