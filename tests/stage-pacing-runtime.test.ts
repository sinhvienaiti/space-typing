import { afterEach, describe, expect, it, vi } from "vitest";
import { Game, type GameHooks } from "../src/Game";
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

const vocabulary: VocabularyEntry[] = Array.from(
  { length: 20 },
  (_, index) => ({
    id: "phase-" + String(index),
    en: "word" + String(index),
    vi: "",
    ipa: "",
  }),
);

function createRuntime(stageNumber = 1) {
  vi.stubGlobal("window", {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
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

  const hooks: GameHooks = {
    onStats: vi.fn(),
    onPhase: vi.fn(),
    onStage: vi.fn(),
    onStagePhase: vi.fn(),
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
  };

  const game = new Game(canvas, vocabulary, settings, hooks);
  game.setTestLabMode(true);
  game.startStage(
    createStageConfig(stageNumber),
    difficultyFor({
      stage: stageNumber,
      mode: "balanced",
      vocabularyLevel: 1,
      recentWpm: 60,
      recentAccuracy: 96,
    }),
  );
  game.testLabSetSchedulerFrozen(true);
  return { game, hooks };
}

function exhaustCurrentPhase(game: Game): void {
  const initial = game.getTestLabSnapshot();
  if (initial === null) throw new Error("Test Lab snapshot unavailable");
  const index = initial.scheduler.phaseIndex;
  let guard = 0;

  while (guard < 300) {
    const snapshot = game.getTestLabSnapshot();
    if (snapshot === null) throw new Error("Test Lab snapshot unavailable");
    if (snapshot.scheduler.phaseIndex !== index) return;
    if (
      snapshot.scheduler.phaseSpawned >=
      snapshot.scheduler.phaseBudget
    ) {
      return;
    }

    game.testLabClearEnemies();
    game.testLabStepScheduler();
    const after = game.getTestLabSnapshot();
    if (after === null) throw new Error("Test Lab snapshot unavailable");
    expect(after.scheduler.phaseSpawned)
      .toBeLessThanOrEqual(after.scheduler.phaseBudget);
    guard += 1;
  }

  throw new Error("Phase scheduler did not reach its quota");
}

describe("explicit stage pacing runtime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("publishes Stage before opening Wave so the HUD cannot erase Wave 1", () => {
    const { game, hooks } = createRuntime(1);
    const onStage = hooks.onStage as ReturnType<typeof vi.fn>;
    const onStagePhase = hooks.onStagePhase as ReturnType<typeof vi.fn>;

    expect(onStage).toHaveBeenCalledWith(1);
    expect(onStagePhase).toHaveBeenCalledTimes(1);
    expect(onStagePhase.mock.calls[0]![0]).toMatchObject({
      index: 0,
      count: 3,
      label: "Opening",
    });
    expect(onStage.mock.invocationCallOrder[0])
      .toBeLessThan(onStagePhase.mock.invocationCallOrder[0]!);
    game.destroy();
  });

  it("enforces each phase quota and requires a drained recovery beat before advancing", () => {
    const { game, hooks } = createRuntime(1);
    const start = game.getTestLabSnapshot()!;
    expect(start.scheduler.phaseCount).toBe(3);
    expect(start.scheduler.phaseIndex).toBe(0);

    exhaustCurrentPhase(game);
    const exhausted = game.getTestLabSnapshot()!;
    expect(exhausted.scheduler.phaseIndex).toBe(0);
    expect(exhausted.scheduler.phaseSpawned)
      .toBe(exhausted.scheduler.phaseBudget);

    game.testLabClearEnemies();
    expect(game.testLabStepScheduler()).toBe(false);
    const armed = game.getTestLabSnapshot()!;
    expect(armed.scheduler.phaseIndex).toBe(0);
    expect(armed.scheduler.phaseBreakTimer).toBeGreaterThan(0);

    game.testLabClearEnemies();
    expect(game.testLabStepScheduler()).toBe(false);
    const advanced = game.getTestLabSnapshot()!;
    expect(advanced.scheduler.phaseIndex).toBe(1);
    expect(advanced.scheduler.phaseSpawned).toBe(0);
    expect(advanced.scheduler.phaseLabel).toBe("Pressure Ramp");

    const onStagePhase = hooks.onStagePhase as ReturnType<typeof vi.fn>;
    expect(onStagePhase).toHaveBeenCalledTimes(2);
    game.destroy();
  });

  it("consumes the exact authored total across all phases without raising concurrent caps", () => {
    const { game } = createRuntime(51);
    const initial = game.getTestLabSnapshot()!;
    const total = initial.scheduler.spawnRemaining;
    const maxEnemies = initial.difficulty!.maxEnemies;

    let guard = 0;
    while (game.getTestLabSnapshot()!.scheduler.spawnRemaining > 0) {
      const before = game.getTestLabSnapshot()!;
      game.testLabClearEnemies();
      game.testLabStepScheduler();
      const after = game.getTestLabSnapshot()!;

      expect(after.enemies.length).toBeLessThanOrEqual(maxEnemies);
      expect(after.scheduler.phaseSpawned)
        .toBeLessThanOrEqual(after.scheduler.phaseBudget);

      if (
        after.scheduler.spawnRemaining === before.scheduler.spawnRemaining &&
        after.scheduler.phaseSpawned === before.scheduler.phaseSpawned
      ) {
        game.testLabClearEnemies();
        game.testLabStepScheduler();
      }

      guard += 1;
      if (guard > total * 8) {
        throw new Error("Stage pacing did not consume the total budget");
      }
    }

    const final = game.getTestLabSnapshot()!;
    expect(total).toBe(createStageConfig(51).enemyBudget);
    expect(final.scheduler.spawnRemaining).toBe(0);
    expect(final.scheduler.phaseIndex).toBe(final.scheduler.phaseCount - 1);
    expect(final.scheduler.phaseSpawned)
      .toBe(final.scheduler.phaseBudget);
    game.destroy();
  });
});
