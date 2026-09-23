import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import { qualityProfile } from "../src/performance/quality";
import type {
  DifficultyMode,
  GameSettings,
  VocabularyEntry,
} from "../src/types";

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
  { id: "m22-1", en: "orbit", vi: "", ipa: "" },
  { id: "m22-2", en: "shield", vi: "", ipa: "" },
  { id: "m22-3", en: "stellar", vi: "", ipa: "" },
  { id: "m22-4", en: "galaxy", vi: "", ipa: "" },
  { id: "m22-5", en: "reactor", vi: "", ipa: "" },
  { id: "m22-6", en: "quantum", vi: "", ipa: "" },
  { id: "m22-7", en: "guardian", vi: "", ipa: "" },
  { id: "m22-8", en: "formation", vi: "", ipa: "" },
  { id: "m22-9", en: "pressure", vi: "", ipa: "" },
];

function seededRandom(seedInput: number): () => number {
  let seed = seedInput >>> 0;
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createGame(): Game {
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

function runScenario(
  stage: number,
  mode: DifficultyMode,
  seed: number,
  maxPressure = false,
) {
  const random = seededRandom(seed);
  const randomSpy = vi.spyOn(Math, "random").mockImplementation(random);
  const game = createGame();
  game.setTestLabMode(true, "immortal");

  const difficulty = difficultyFor({
    stage,
    mode,
    vocabularyLevel: 50,
    recentWpm: mode === "impossible" ? 300 : 60,
    recentAccuracy: mode === "impossible" ? 99 : 96,
  });
  game.startStage(createStageConfig(stage), difficulty);

  if (maxPressure) {
    game.testLabSetDifficultyOverrides({
      maxEnemies: 30,
      spawnInterval: 0.05,
      pressureBudget: 100,
      urgentThreatCap: 30,
      formationComplexity: 5,
      attackIntervalFactor: 0.2,
    });
  }

  if (stage % 10 === 0) {
    game.testLabSpawnBoss();
  }

  let peakEnemies = 0;
  let peakProjectiles = 0;
  let peakParticles = 0;
  let peakPressure = 0;
  let peakUrgent = 0;

  for (let second = 0; second < 60; second += 1) {
    expect(game.testLabAdvanceSimulation(1, 0.05)).toBe(true);
    const snapshot = game.getTestLabSnapshot();
    expect(snapshot).not.toBeNull();
    peakEnemies = Math.max(peakEnemies, snapshot?.enemies.length ?? 0);
    peakProjectiles = Math.max(
      peakProjectiles,
      snapshot?.projectiles ?? 0,
    );
    peakParticles = Math.max(
      peakParticles,
      snapshot?.particles ?? 0,
    );
    peakPressure = Math.max(
      peakPressure,
      snapshot?.activePressure.pressure ?? 0,
    );
    peakUrgent = Math.max(
      peakUrgent,
      snapshot?.activePressure.urgentThreats ?? 0,
    );

    expect(Number.isFinite(snapshot?.stats.hull ?? NaN)).toBe(true);
    expect(
      Number.isFinite(snapshot?.activePressure.pressure ?? NaN),
    ).toBe(true);
    expect(snapshot?.phase).not.toBe("gameover");
    expect(snapshot?.stats.hull).toBeGreaterThanOrEqual(1);
    expect(snapshot?.particles).toBeLessThanOrEqual(
      qualityProfile("low").maxParticles,
    );
    expect(snapshot?.enemies.length).toBeLessThanOrEqual(
      snapshot?.difficulty?.maxEnemies ?? 30,
    );
  }

  const final = game.getTestLabSnapshot()!;
  const summary = {
    stage,
    mode,
    peakEnemies,
    peakProjectiles,
    peakParticles,
    peakPressure: Number(peakPressure.toFixed(6)),
    peakUrgent,
    lethalHits: final.lethalHits,
    phase: final.phase,
    hull: Number(final.stats.hull.toFixed(6)),
    shield: Number(final.stats.shield.toFixed(6)),
    kills: final.stats.kills,
    remainingEnemies: final.enemies.length,
    remainingProjectiles: final.projectiles,
  };

  game.destroy();
  randomSpy.mockRestore();
  return summary;
}

describe("M22 production runtime stress simulation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps early/mid/late Campaign runtime bounded for 60 simulated seconds", () => {
    for (const scenario of [
      { stage: 1, mode: "balanced" as const, seed: 0x220001 },
      { stage: 250, mode: "balanced" as const, seed: 0x220250 },
      { stage: 500, mode: "hard" as const, seed: 0x220500 },
      { stage: 750, mode: "nightmare" as const, seed: 0x220750 },
      { stage: 1000, mode: "impossible" as const, seed: 0x221000 },
    ]) {
      const result = runScenario(
        scenario.stage,
        scenario.mode,
        scenario.seed,
      );

      expect(result.peakEnemies).toBeLessThanOrEqual(16);
      expect(result.peakProjectiles).toBeLessThanOrEqual(160);
      expect(result.peakParticles).toBeLessThanOrEqual(110);
      expect(result.peakPressure).toBeLessThan(120);
      expect(result.phase).not.toBe("gameover");
    }
  });

  it("keeps the explicit maximum-pressure Test Lab stress profile bounded", () => {
    const result = runScenario(
      950,
      "impossible",
      0x229950,
      true,
    );

    expect(result.peakEnemies).toBeLessThanOrEqual(30);
    expect(result.peakProjectiles).toBeLessThanOrEqual(300);
    expect(result.peakParticles).toBeLessThanOrEqual(110);
    expect(result.peakPressure).toBeLessThan(220);
    expect(result.phase).not.toBe("gameover");
  });

  it("is deterministic for the same production seed and scenario", () => {
    const left = runScenario(750, "nightmare", 0x22d750);
    vi.unstubAllGlobals();
    const right = runScenario(750, "nightmare", 0x22d750);

    expect(right).toEqual(left);
  });
});
