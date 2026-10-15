import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import type { Enemy, GameSettings, VocabularyEntry } from "../src/types";
import { SkillFxSystem, distanceToSegment, nearestPoint } from "../src/vfx/skill-fx";

const settings: GameSettings = {
  sfxVolume: 0,
  musicVolume: 0,
  ambientVolume: 0,
  screenShake: false,
  visualQuality: "low",
  pronunciationEnabled: false,
  pronunciationRate: 1,
  pronunciationVolume: 0,
  killTranslation: {
    enabled: true,
    mode: "kill-position",
    showIpa: true,
    showVietnamese: true,
    size: "large",
    durationSeconds: 2.4,
  },
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

type Runtime = {
  enemies: Enemy[];
  width: number;
  height: number;
};

function spawn(game: Game, count: number): Enemy[] {
  const ids = game.testLabSpawnEnemies({ kind: "scout", count, layers: 1 });
  const runtime = game as unknown as Runtime;
  return ids.map((id) => runtime.enemies.find((enemy) => enemy.id === id)!);
}

function place(enemy: Enemy, x: number, y: number): void {
  enemy.x = x;
  enemy.baseX = x;
  enemy.drift = 0;
  enemy.y = y;
}

function tacticalGame(id: "missile-swarm" | "railgun" | "tractor-beam"): Game {
  const game = createTestGame();
  game.setTestLabMode(true);
  start(game);
  game.testLabSetSchedulerFrozen(true);
  game.setSupportSpells([id]);
  return game;
}

describe("tactical systems", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Missile Swarm hits when the missiles arrive, two letters per enemy", () => {
    const game = tacticalGame("missile-swarm");
    const targets = spawn(game, 3);
    targets.forEach((enemy, index) => place(enemy, 300 + index * 300, 220));

    expect(game.testLabForceSkill("missile-swarm").ok).toBe(true);
    // Still in flight: nothing typed yet.
    expect(targets.map((enemy) => enemy.typed)).toEqual([0, 0, 0]);

    game.testLabAdvanceSimulation(0.6);
    expect(targets.map((enemy) => enemy.typed)).toEqual([2, 2, 2]);
    game.destroy();
  });

  it("Railgun pierces every enemy in the target's lane and nothing outside it", () => {
    const game = tacticalGame("railgun");
    const runtime = game as unknown as Runtime;
    const [near, far, aside] = spawn(game, 3);
    const lane = runtime.width / 2;
    place(near!, lane, 420);
    place(far!, lane + 12, 160);
    place(aside!, lane + 360, 300);

    expect(game.testLabForceSkill("railgun").ok).toBe(true);
    expect(near!.typed).toBe(3);
    expect(far!.typed).toBe(3);
    expect(aside!.typed).toBe(0);
    game.destroy();
  });

  it("Railgun strips a shield layer before letters", () => {
    const game = tacticalGame("railgun");
    const runtime = game as unknown as Runtime;
    const [enemy] = spawn(game, 1);
    place(enemy!, runtime.width / 2, 300);
    enemy!.layersRemaining = 2;

    game.testLabForceSkill("railgun");
    expect(enemy!.layersRemaining).toBe(1);
    expect(enemy!.typed).toBe(0);
    game.destroy();
  });

  it("Tractor Beam hauls the closest enemy back up and holds it slowed", () => {
    const game = tacticalGame("tractor-beam");
    const [low, high] = spawn(game, 2);
    place(low!, 500, 520);
    place(high!, 800, 200);

    expect(game.testLabForceSkill("tractor-beam").ok).toBe(true);
    game.testLabAdvanceSimulation(0.8);
    expect(low!.y).toBeLessThan(420);
    expect(low!.rewardControlFactor).toBeCloseTo(0.45);
    expect(low!.rewardControlTimer).toBeGreaterThan(2.5);
    // The other enemy is untouched.
    expect(high!.rewardControlTimer ?? 0).toBe(0);
    game.destroy();
  });

  it("reports the new systems as not needed on an empty field", () => {
    for (const id of ["missile-swarm", "railgun", "tractor-beam"] as const) {
      const game = tacticalGame(id);
      expect(game.canUseSkill(id)).toBe("effect-not-needed");
      game.destroy();
    }
  });
});

describe("skill effects system", () => {
  it("expires effects and keeps the pool bounded", () => {
    const fx = new SkillFxSystem();
    for (let index = 0; index < 400; index += 1) fx.blast(index, 10, "#fff", 40);
    expect(fx.activeEffects).toBeLessThanOrEqual(96);
    fx.update(0.1);
    for (let step = 0; step < 20; step += 1) fx.update(0.1);
    expect(fx.activeEffects).toBe(0);

    fx.missile({ x: 0, y: 600 }, { x: 400, y: 100 }, "#ff9a4a", 0.2, 0.4);
    fx.update(0.05);
    expect(fx.activeEffects).toBe(1);
    fx.clear();
    expect(fx.activeEffects).toBe(0);
  });

  it("ignores lightning with fewer than two points and orbital strikes without targets", () => {
    const fx = new SkillFxSystem();
    fx.lightning([{ x: 1, y: 1 }], "#fff");
    fx.orbitalStrike([]);
    expect(fx.activeEffects).toBe(0);
  });

  it("measures lanes and finds the nearest drone", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 100 };
    expect(distanceToSegment(10, 50, a, b)).toBeCloseTo(10);
    expect(distanceToSegment(0, 130, a, b)).toBeCloseTo(30);
    expect(distanceToSegment(3, 4, a, a)).toBeCloseTo(5);
    expect(nearestPoint([], 0, 0)).toBeNull();
    expect(nearestPoint([{ x: 10, y: 0 }, { x: 2, y: 1 }], 0, 0)).toEqual({ x: 2, y: 1 });
  });
});
