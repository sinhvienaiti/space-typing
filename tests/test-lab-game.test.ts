import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import type { GameSettings, VocabularyEntry } from "../src/types";

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
  { id: "qa-1", en: "orbit", vi: "", ipa: "" },
  { id: "qa-2", en: "shield", vi: "", ipa: "" },
  { id: "qa-3", en: "stellar", vi: "", ipa: "" },
];

function createTestGame(): Game {
  vi.stubGlobal("window", {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
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

  const context = {
    setTransform: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
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

  return new Game(canvas, vocabulary, settings, {
    onStats: vi.fn(),
    onPhase: vi.fn(),
    onStage: vi.fn(),
    onStageEvents: vi.fn(),
    onObjectiveUpdate: vi.fn(),
    onStageClear: vi.fn(),
    onBossUpdate: vi.fn(),
    onWordComplete: vi.fn(),
    onEquipmentDrop: vi.fn(),
    onRewardChoice: vi.fn(),
    onBossRewardChoice: vi.fn(),
    onEnemySeen: vi.fn(),
    onAnomalyReady: vi.fn(),
    onLuckPityUpdate: vi.fn(),
    onHiddenDiscoveryUpdate: vi.fn(),
    onStatuses: vi.fn(),
    onSkills: vi.fn(),
  });
}

function start(game: Game, stage = 1): void {
  game.startStage(
    createStageConfig(stage),
    difficultyFor({
      stage,
      vocabularyLevel: 1,
      mode: "balanced",
      recentWpm: 60,
      recentAccuracy: 96,
    }),
  );
}

describe("M21 gated Game Test Lab API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is dormant until Test Lab mode is explicitly enabled", () => {
    const game = createTestGame();
    start(game);

    expect(game.getTestLabSnapshot()).toBeNull();
    expect(game.testLabSetResources({ hull: 1 })).toBe(false);
    expect(game.testLabSpawnEnemies({ count: 1 })).toEqual([]);
    expect(game.testLabSetTimeScale(2)).toBe(false);

    game.destroy();
  });

  it("records lethal damage but keeps Immortal mode alive at one Hull", () => {
    const game = createTestGame();
    game.setTestLabMode(true, "immortal");
    start(game);

    game.testLabSetResources({
      hull: 10,
      shield: 0,
      energy: 50,
    });
    expect(game.testLabDamagePlayer(10_000)).toBe(true);

    const snapshot = game.getTestLabSnapshot();
    expect(snapshot?.phase).toBe("playing");
    expect(snapshot?.stats.hull).toBe(1);
    expect(snapshot?.lethalHits).toBe(1);
    expect(snapshot?.deathMode).toBe("immortal");

    game.destroy();
  });

  it("exposes scheduler and pressure overrides only in the isolated runtime", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 250);

    expect(game.testLabSetSchedulerFrozen(true)).toBe(true);
    expect(
      game.testLabSetDifficultyOverrides({
        maxEnemies: 20,
        pressureBudget: 40,
        urgentThreatCap: 12,
        formationComplexity: 5,
        spawnInterval: 0.1,
        attackIntervalFactor: 0.5,
      }),
    ).toBe(true);

    const snapshot = game.getTestLabSnapshot();
    expect(snapshot?.scheduler.frozen).toBe(true);
    expect(snapshot?.difficulty?.maxEnemies).toBe(20);
    expect(snapshot?.difficulty?.pressureBudget).toBe(40);
    expect(snapshot?.difficulty?.urgentThreatCap).toBe(12);
    expect(snapshot?.difficulty?.formationComplexity).toBe(5);
    expect(snapshot?.difficulty?.spawnInterval).toBeCloseTo(0.1);
    expect(snapshot?.difficulty?.attackIntervalFactor).toBeCloseTo(0.5);

    game.destroy();
  });

  it("rebuilds the production boss runtime when a QA phase is forced", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 20);

    expect(game.testLabSpawnBoss()).toBe(true);
    expect(
      game.testLabSetBoss({
        hpRatio: 0.37,
        phase: 2,
        shieldActive: true,
        staggerSeconds: 3,
      }),
    ).toBe(true);

    const boss = game.getTestLabSnapshot()?.boss;
    expect(boss?.phase).toBe(2);
    expect((boss?.hp ?? 0) / (boss?.maxHp ?? 1)).toBeCloseTo(0.37, 2);
    expect(boss?.shieldActive).toBe(true);
    expect(boss?.staggered).toBe(true);

    game.destroy();
  });

  it("uses the production enemy instance for force-word and clear controls", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 50);

    const ids = game.testLabSpawnEnemies({
      kind: "scout",
      count: 1,
      rank: "X",
      layers: 2,
    });
    expect(ids).toHaveLength(1);

    const first = game.getTestLabSnapshot()?.enemies[0];
    expect(first?.rank).toBe("X");
    expect(first?.layersRemaining).toBe(2);
    expect(first?.wordDifficultyScore).toBeTypeOf("number");
    expect(first?.threatBudget).toBeDefined();
    expect(first?.threatBudget?.used).toBeGreaterThan(0);

    expect(game.testLabForceWordComplete(ids[0]!)).toBe(true);
    const second = game.getTestLabSnapshot()?.enemies[0];
    expect(second?.layersRemaining).toBe(1);

    expect(game.testLabKillEnemy(ids[0]!)).toBe(true);
    const finalSnapshot = game.getTestLabSnapshot();
    expect(finalSnapshot?.enemies).toHaveLength(0);
    expect(finalSnapshot?.learningEcho?.en.length).toBeGreaterThan(0);
    expect(finalSnapshot?.learningEcho?.remaining).toBeGreaterThan(0);

    game.destroy();
  });
});
