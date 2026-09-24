import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import type {
  Enemy,
  EnemyProjectile,
  GameSettings,
  VocabularyEntry,
} from "../src/types";
import type { LuckPityState } from "../src/loot/pity";
import type { SupplyPod } from "../src/supply/pod";

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
  { id: "1", en: "planet", vi: "hành tinh", ipa: "/ˈplænɪt/" },
  { id: "2", en: "shield", vi: "lá chắn", ipa: "/ʃiːld/" },
  { id: "3", en: "signal", vi: "tín hiệu", ipa: "/ˈsɪɡnəl/" },
  { id: "4", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔːrbɪt/" },
];

type GameInternals = {
  enemies: Enemy[];
  projectiles: EnemyProjectile[];
  timeShellTimer: number;
  luckPity: LuckPityState;
  supplyPod: SupplyPod | null;
};

function createTestGame() {
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

  const hooks = {
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
  };

  const game = new Game(canvas, vocabulary, settings, hooks);
  game.setTestLabMode(true);
  game.startStage(
    createStageConfig(1),
    difficultyFor({
      stage: 1,
      mode: "normal",
      vocabularyLevel: 1,
      recentWpm: 60,
      recentAccuracy: 96,
    }),
  );

  return { game, hooks };
}

describe("Batch D tactical consumable runtime", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Word Bomb destroys a real enemy without claiming the word was typed", () => {
    const { game } = createTestGame();
    expect(game.testLabSpawnEnemies({ count: 1 })).toHaveLength(1);

    expect(game.useConsumable("word-bomb")).toBe(true);
    const session = game.getStageSessionSnapshot();
    const lab = game.getTestLabSnapshot();

    expect(lab?.enemies).toHaveLength(0);
    expect(session.enemiesResolved).toBe(1);
    expect(session.skillKilledWords).toBe(1);
    expect(session.wordsCompleted).toBe(0);
    expect(session.perfectWords).toBe(0);
    expect(session.consumablesUsed).toBe(1);
    game.destroy();
  });

  it("Nova Bomb clears active enemies through the same measured forced-kill path", () => {
    const { game } = createTestGame();
    expect(game.testLabSpawnEnemies({ count: 2 })).toHaveLength(2);

    expect(game.useConsumable("nova-bomb")).toBe(true);
    const session = game.getStageSessionSnapshot();

    expect(game.getTestLabSnapshot()?.enemies).toHaveLength(0);
    expect(session.enemiesResolved).toBe(2);
    expect(session.skillKilledWords).toBe(2);
    expect(session.wordsCompleted).toBe(0);
    expect(session.consumablesUsed).toBe(1);
    game.destroy();
  });

  it("EMP clears hostile bullets and delays a real enemy action timer", () => {
    const { game } = createTestGame();
    expect(game.testLabSpawnEnemies({ count: 1 })).toHaveLength(1);
    const internals = game as unknown as GameInternals;
    internals.enemies[0]!.actionCooldown = 1;
    internals.projectiles = [{
      id: 999,
      ownerId: internals.enemies[0]!.id,
      char: "a",
      x: 100,
      y: 100,
      vx: 0,
      vy: 10,
      radius: 8,
    }];

    expect(game.useConsumable("emp-charge")).toBe(true);
    expect(internals.projectiles).toHaveLength(0);
    expect(internals.enemies[0]!.actionCooldown).toBeGreaterThan(4);
    expect(game.getStageSessionSnapshot().consumablesUsed).toBe(1);
    game.destroy();
  });

  it("Time Crystal creates a bounded slow window and cannot be wasted at full duration", () => {
    const { game } = createTestGame();
    const internals = game as unknown as GameInternals;

    expect(game.useConsumable("time-crystal")).toBe(true);
    expect(internals.timeShellTimer).toBe(5);
    expect(game.useConsumable("time-crystal")).toBe(false);
    expect(game.getStageSessionSnapshot().consumablesUsed).toBe(1);
    game.destroy();
  });

  it("Supply Beacon creates one additional supply opportunity only when the arena allows it", () => {
    const { game } = createTestGame();
    const internals = game as unknown as GameInternals;
    expect(internals.supplyPod).toBeNull();

    expect(game.useConsumable("supply-beacon")).toBe(true);
    expect(internals.supplyPod).not.toBeNull();
    expect(game.useConsumable("supply-beacon")).toBe(false);
    expect(game.getStageSessionSnapshot().consumablesUsed).toBe(1);
    game.destroy();
  });

  it("Lucky Dice raises persistent pity counters and emits the existing persistence hook", () => {
    const { game, hooks } = createTestGame();
    const internals = game as unknown as GameInternals;

    expect(game.useConsumable("lucky-dice")).toBe(true);
    expect(internals.luckPity).toEqual({
      golden: 6,
      treasure: 6,
      choice: 6,
      anomaly: 6,
    });
    expect(hooks.onLuckPityUpdate).toHaveBeenLastCalledWith({
      golden: 6,
      treasure: 6,
      choice: 6,
      anomaly: 6,
    });
    expect(game.getStageSessionSnapshot().consumablesUsed).toBe(1);
    game.destroy();
  });
});
