import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import type { BossState } from "../src/boss/model";
import { startBossSkill, seededBossRng, type BossSkillState } from "../src/boss/skills";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import type { GameSettings, GameStats, VocabularyEntry } from "../src/types";

/** Boss Depth View skills inside the real Game loop (counters, damage, routing). */
type GameInternals = {
  boss: BossState | null;
  bossSkill: BossSkillState | null;
  bossUltimateQueued: boolean;
  bossExposedTimer: number;
  stats: GameStats;
};

const settings: GameSettings = {
  sfxVolume: 0,
  musicVolume: 0,
  ambientVolume: 0,
  screenShake: false,
  visualQuality: "low",
  pronunciationEnabled: false,
  pronunciationRate: 1,
  pronunciationVolume: 0,
};

const vocabulary: VocabularyEntry[] = [
  { id: "barrier", en: "barrier", vi: "", ipa: "" },
  { id: "galaxy", en: "galaxy", vi: "", ipa: "" },
  { id: "nebula", en: "nebula", vi: "", ipa: "" },
];

function createBossGame(): { game: Game; state: GameInternals } {
  vi.stubGlobal("window", {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      close(): Promise<void> {
        return Promise.resolve();
      }
      resume(): Promise<void> {
        return Promise.resolve();
      }
    },
  );
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ setTransform: vi.fn() })),
    getBoundingClientRect: vi.fn(() => ({
      width: 1280,
      height: 720,
      top: 0,
      left: 0,
      right: 1280,
      bottom: 720,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })),
  } as unknown as HTMLCanvasElement;
  const noop = vi.fn();
  const game = new Game(canvas, vocabulary, settings, {
    onStats: noop,
    onPhase: noop,
    onStage: noop,
    onStageEvents: noop,
    onObjectiveUpdate: noop,
    onStageClear: noop,
    onBossUpdate: noop,
    onWordComplete: noop,
    onEquipmentDrop: noop,
    onRewardChoice: noop,
    onBossRewardChoice: noop,
    onEnemySeen: noop,
    onAnomalyReady: noop,
    onLuckPityUpdate: noop,
    onHiddenDiscoveryUpdate: noop,
    onStatuses: noop,
    onSkills: noop,
  });
  game.setTestLabMode(true);
  game.startStage(
    createStageConfig(100),
    difficultyFor({ stage: 100, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }),
  );
  game.testLabSetSchedulerFrozen(true);
  game.testLabClearEnemies();
  expect(game.testLabSpawnBoss()).toBe(true);
  return { game, state: game as unknown as GameInternals };
}

function typeWord(game: Game, word: string): void {
  for (const letter of word) game.handleKey(letter);
}

function health(stats: GameStats): number {
  return stats.hull + stats.shield;
}

describe("boss depth skills in the game loop", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parries a lance: the boss takes the beam and staggers, the ship is untouched", () => {
    const { game, state } = createBossGame();
    expect(game.testLabForceBossSkill("lance")).toBe(true);
    const boss = state.boss!;
    const before = { boss: boss.hp, ship: health(state.stats) };
    typeWord(game, state.bossSkill!.word!);
    expect(state.bossSkill!.result).toBe("countered");
    expect(boss.typed).toBe(0);
    game.testLabAdvanceSimulation(state.bossSkill!.spec.telegraph + 0.4);
    expect(boss.hp).toBeLessThan(before.boss);
    expect(boss.staggerTimer).toBeGreaterThan(0);
    expect(health(state.stats)).toBe(before.ship);
    game.destroy();
  });

  it("an unanswered lance hits the ship", () => {
    const { game, state } = createBossGame();
    game.testLabForceBossSkill("lance");
    const before = health(state.stats);
    game.testLabAdvanceSimulation(state.bossSkill!.spec.telegraph + 0.4);
    expect(health(state.stats)).toBeLessThan(before);
    game.destroy();
  });

  it("a key that continues the boss word stays there until the counter has started", () => {
    const { game, state } = createBossGame();
    const boss = state.boss!;
    boss.entry = vocabulary[0]!;
    boss.typed = 1; // "b" typed; "a" comes next
    const skill = startBossSkill("surge", "major-boss", 1, seededBossRng(1));
    skill.word = "anchor";
    state.bossSkill = skill;

    game.handleKey("a");
    expect(boss.typed).toBe(2);
    expect(skill.typed).toBe(0);

    // The boss now wants "r": an "a" can only be the counter.
    game.handleKey("a");
    expect(skill.typed).toBe(1);
    expect(boss.typed).toBe(2);

    // Started: the counter keeps its letters.
    typeWord(game, "nchor");
    expect(skill.result).toBe("countered");
    game.destroy();
  });

  it("a braced rush leaves the boss exposed", () => {
    const { game, state } = createBossGame();
    game.testLabForceBossSkill("surge");
    typeWord(game, state.bossSkill!.word!);
    game.testLabAdvanceSimulation(state.bossSkill!.spec.telegraph + 0.6);
    expect(state.bossExposedTimer).toBeGreaterThan(0);
    game.destroy();
  });

  it("queues the ultimate entering the Galaxy Tyrant's third phase", () => {
    const { game, state } = createBossGame();
    game.testLabSetBoss({ phase: 3 });
    expect(state.bossUltimateQueued).toBe(true);
    game.testLabAdvanceSimulation(0.2);
    expect(state.bossSkill?.kind).toBe("cataclysm");
    game.destroy();
  });
});
