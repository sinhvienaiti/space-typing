import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import { DEFAULT_RECALL_SETTINGS } from "../src/recall/model";
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
  { id: "qa-1", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔrbɪt/" },
  { id: "qa-2", en: "shield", vi: "lá chắn", ipa: "/ʃild/" },
  { id: "qa-3", en: "stellar", vi: "thuộc về sao", ipa: "/ˈstelər/" },
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

  it("holds stage clear while the visible Recall bonus remains, then clears after collection", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 1);
    game.testLabSetSchedulerFrozen(true);
    const runtime = game as unknown as {
      spawnRemaining: number;
      supplySpawnsRemaining: number;
      treasureDronePending: boolean;
      recallBonusPending: boolean;
      rewardChoicePending: boolean;
      anomalyPending: boolean;
    };
    runtime.spawnRemaining = 0;
    runtime.supplySpawnsRemaining = 0;
    runtime.treasureDronePending = false;
    runtime.recallBonusPending = false;
    runtime.rewardChoicePending = false;
    runtime.anomalyPending = false;

    expect(game.testLabSpawnRecallBonus("qa-1")).toBe(true);
    expect(game.testLabAdvanceSimulation(0.05)).toBe(true);
    expect(game.getPhase()).toBe("playing");
    expect(game.getTestLabSnapshot()?.recallBonus?.en).toBe("orbit");

    expect(game.testLabCompleteRecallBonus()).toBe(true);
    game.testLabAdvanceSimulation(0.05);
    expect(game.getPhase()).toBe("stageclear");
    game.destroy();
  });

  it("Nova Pulse clears visible enemies/projectiles but preserves collectible bonuses", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 1);
    expect(game.testLabSpawnEnemies({ kind: "scout", count: 3 })).toHaveLength(3);
    expect(game.testLabSpawnRecallBonus("qa-1")).toBe(true);
    const runtime = game as unknown as {
      projectiles: Array<{id:number;ownerId:number;char:string;x:number;y:number;vx:number;vy:number;radius:number}>;
    };
    runtime.projectiles = [{ id:1,ownerId:1,char:"a",x:400,y:100,vx:0,vy:0,radius:10 }];
    game.testLabSetResources({ power: 100 });
    game.handleKey(" ");
    const snapshot = game.getTestLabSnapshot();
    expect(snapshot?.stats.power).toBe(0);
    expect(snapshot?.stats.kills).toBe(3);
    expect(snapshot?.enemies).toHaveLength(0);
    expect(snapshot?.projectiles).toBe(0);
    expect(snapshot?.recallBonus?.en).toBe("orbit");
    game.destroy();
  });

  it("keeps Recall typed kills sequential, projectile-free and free of Combat translation echo", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    game.setGameplayMode("recall", {
      ...DEFAULT_RECALL_SETTINGS,
      showTranslation: false,
      autoPronounce: false,
    });
    start(game, 900);
    game.testLabSetSchedulerFrozen(true);

    const ids = game.testLabSpawnEnemies({
      kind: "splitter",
      count: 1,
      layers: 1,
    });
    expect(ids).toHaveLength(1);

    const onKillTranslation = vi.fn();
    const runtime = game as unknown as {
      enemies: Array<{ id: number; eliteModifiers: string[] }>;
      projectiles: unknown[];
      recallHintIndices: Map<number, Set<number>>;
      hooks: {
        onKillTranslation?: (entry: VocabularyEntry) => void;
      };
    };
    runtime.hooks.onKillTranslation = onKillTranslation;
    runtime.enemies[0]!.eliteModifiers = ["volatile"];

    expect(runtime.recallHintIndices.size).toBe(1);
    expect(game.testLabForceWordComplete(ids[0]!)).toBe(true);

    expect(game.getTestLabSnapshot()?.enemies).toHaveLength(0);
    expect(game.getTestLabSnapshot()?.projectiles).toBe(0);
    expect(runtime.recallHintIndices.size).toBe(0);
    expect(onKillTranslation).not.toHaveBeenCalled();
    game.destroy();
  });

  it("preserves Splitter fragments and Volatile burst in Combat", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 900);
    game.testLabSetSchedulerFrozen(true);

    const ids = game.testLabSpawnEnemies({
      kind: "splitter",
      count: 1,
      layers: 1,
    });
    expect(ids).toHaveLength(1);

    const runtime = game as unknown as {
      enemies: Array<{ id: number; eliteModifiers: string[] }>;
    };
    runtime.enemies[0]!.eliteModifiers = ["volatile"];

    expect(game.testLabForceWordComplete(ids[0]!)).toBe(true);
    const snapshot = game.getTestLabSnapshot();

    expect(snapshot?.enemies.length).toBeGreaterThan(0);
    expect(snapshot?.projectiles).toBeGreaterThan(0);
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

  it("does not emit boss HUD updates every frame while staggered", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 20);
    expect(game.testLabSpawnBoss()).toBe(true);

    const onBossUpdate = vi.fn();
    const runtime = game as unknown as {
      hooks: { onBossUpdate: (boss: unknown) => void };
      boss: {
        staggerTimer: number;
        typingMechanic?: unknown;
      } | null;
    };
    runtime.hooks.onBossUpdate = onBossUpdate;
    expect(runtime.boss).not.toBeNull();
    runtime.boss!.typingMechanic = undefined;
    runtime.boss!.staggerTimer = 1;
    onBossUpdate.mockClear();

    game.testLabAdvanceSimulation(0.5, 1 / 120);
    expect(onBossUpdate).not.toHaveBeenCalled();

    game.testLabAdvanceSimulation(0.55, 1 / 120);
    expect(onBossUpdate).toHaveBeenCalledTimes(1);

    game.destroy();
  });

  it("applies Custom hostile bullet velocity to boss projectiles too", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 20);
    expect(game.testLabSpawnBoss()).toBe(true);

    const state = game as unknown as {
      boss: { phase: number } | null;
      difficulty: { projectileSpeedScale?: number } | null;
      projectiles: Array<{ vx: number; vy: number }>;
      fireBossProjectiles: (boss: { phase: number }) => void;
    };
    expect(state.boss).not.toBeNull();
    expect(state.difficulty).not.toBeNull();
    state.projectiles = [];
    state.difficulty!.projectileSpeedScale = 1;
    state.fireBossProjectiles(state.boss!);
    const normal = Math.hypot(state.projectiles[0]!.vx, state.projectiles[0]!.vy);
    expect(normal).toBeGreaterThan(0);

    state.projectiles = [];
    state.difficulty!.projectileSpeedScale = 0.55;
    state.fireBossProjectiles(state.boss!);
    const slow = Math.hypot(state.projectiles[0]!.vx, state.projectiles[0]!.vy);
    expect(slow).toBeCloseTo(normal * 0.55, 5);
    game.destroy();
  });

  it("keeps Recall Bonus optional, non-hostile and non-punitive", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 80);

    const before = game.getTestLabSnapshot();
    expect(game.testLabSpawnRecallBonus("qa-1")).toBe(true);

    const active = game.getTestLabSnapshot();
    expect(active?.recallBonus?.en).toBe("orbit");
    expect(active?.recallBonus?.vi).toBe("quỹ đạo");
    expect(active?.recallBonus?.mask).toContain("_");
    expect(active?.activePressure.enemyCount).toBe(0);
    expect(active?.activePressure.urgentThreats).toBe(0);

    game.handleKey("x");
    const afterWrongGuess = game.getTestLabSnapshot();
    expect(afterWrongGuess?.recallBonus?.typed).toBe(0);
    expect(afterWrongGuess?.stats.hits).toBe(before?.stats.hits);
    expect(afterWrongGuess?.stats.misses).toBe(before?.stats.misses);

    expect(game.testLabCompleteRecallBonus()).toBe(true);
    const after = game.getTestLabSnapshot();

    expect(after?.recallBonus).toBeNull();
    expect(after?.stats.hits).toBe(before?.stats.hits);
    expect(after?.stats.misses).toBe(before?.stats.misses);
    expect(after?.stats.score ?? 0).toBeGreaterThan(before?.stats.score ?? 0);

    game.destroy();
  });

  it("reproduces same-prefix targeting and locks the nearest enemy", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 50);

    const ids = game.testLabSpawnSamePrefixScenario();
    expect(ids).toHaveLength(3);

    const before = game.getTestLabSnapshot();
    expect(before?.enemies.map((enemy) => enemy.entry.en)).toEqual([
      "morning",
      "month",
      "me",
    ]);
    expect(before?.scheduler.frozen).toBe(true);

    game.handleKey("m");
    const after = game.getTestLabSnapshot();
    const typed = after?.enemies.filter((enemy) => enemy.typed === 1) ?? [];

    expect(typed).toHaveLength(1);
    expect(typed[0]?.entry.en).toBe("month");

    game.handleKey("o");
    const locked = game.getTestLabSnapshot();
    expect(
      locked?.enemies.find((enemy) => enemy.entry.en === "month")?.typed,
    ).toBe(2);
    expect(
      locked?.enemies.find((enemy) => enemy.entry.en === "morning")?.typed,
    ).toBe(0);

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
