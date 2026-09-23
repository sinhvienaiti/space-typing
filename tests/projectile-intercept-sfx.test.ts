import { afterEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "../src/audio/Sfx";
import { Game } from "../src/Game";
import type { EnemyProjectile, GamePhase, GameSettings } from "../src/types";

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

function gameWithFakeCanvas(): Game {
  vi.stubGlobal("window", {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    },
  );

  const canvas = {
    getContext: () => ({ setTransform: vi.fn() }),
    getBoundingClientRect: () => ({ width: 1280, height: 720 }),
  } as unknown as HTMLCanvasElement;

  return new Game(
    canvas,
    [{ id: "test-word", en: "galaxy", vi: "", ipa: "" }],
    settings,
    {
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
    },
  );
}

describe("hostile projectile intercept SFX", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses a dedicated short COMBAT laser and shatter layer, not TTS", () => {
    const sfx = new Sfx();
    const audio = sfx as unknown as {
      tone: (...args: [number, number, string, number, number, string]) => void;
      noise: (...args: [number, number, string]) => void;
    };
    const tone = vi.spyOn(audio, "tone").mockImplementation(() => {});
    const noise = vi.spyOn(audio, "noise").mockImplementation(() => {});

    sfx.projectileIntercept();

    expect(tone).toHaveBeenNthCalledWith(
      1, 1160, 0.11, "sawtooth", 0.09, 310, "combat",
    );
    expect(tone).toHaveBeenNthCalledWith(
      2, 630, 0.125, "triangle", 0.05, 170, "combat",
    );
    expect(tone).toHaveBeenCalledTimes(2);
    expect(noise).toHaveBeenCalledExactlyOnceWith(0.045, 0.027, "combat");
    sfx.destroy();
  });

  it("plays the player intercept sound once for a typed hostile bullet", () => {
    const intercept = vi.spyOn(Sfx.prototype, "projectileIntercept").mockImplementation(() => {});
    const genericHit = vi.spyOn(Sfx.prototype, "hit").mockImplementation(() => {});
    const game = gameWithFakeCanvas();
    const state = game as unknown as {
      phase: GamePhase;
      projectiles: EnemyProjectile[];
      lasers: Array<{ life: number }>;
      projectileImpacts: Array<{ life: number; radius: number }>;
      particles: unknown[];
      updateEffects: (dt: number) => void;
    };
    state.phase = "playing";
    state.projectiles = [
      { id: 1, ownerId: -1, char: "k", x: 300, y: 350, vx: 0, vy: 90, radius: 14 },
    ];

    game.handleKey("k");

    expect(state.projectiles).toHaveLength(0);
    expect(game.getStats().hits).toBe(1);
    expect(intercept).toHaveBeenCalledOnce();
    expect(genericHit).not.toHaveBeenCalled();
    expect(state.lasers).toHaveLength(1);
    expect(state.lasers[0]!.life).toBe(0.18);
    expect(state.projectileImpacts).toHaveLength(1);
    expect(state.projectileImpacts[0]!.life).toBe(0.34);
    expect(state.particles.length).toBeGreaterThan(0);
    state.updateEffects(0.1);
    expect(state.projectileImpacts[0]!.life).toBeCloseTo(0.24);
    state.updateEffects(0.25);
    expect(state.projectileImpacts).toHaveLength(0);
    game.destroy();
  });
});
