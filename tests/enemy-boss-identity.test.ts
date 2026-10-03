import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import { ENEMY_FAMILY_IDS } from "../src/enemies/families";
import { FAMILY_STYLES, KIND_ARCHETYPES, kindMotionPose } from "../src/enemies/identity";
import {
  allBossIdentities,
  bossIdentityForStage,
  bossShotGeometry,
  galaxyTyrant,
  type BossPattern,
} from "../src/boss/identity";
import { CombatFxSystem } from "../src/vfx/combat-fx";
import { Sfx } from "../src/audio/Sfx";
import type { BossState } from "../src/boss/model";
import type { Enemy, EnemyKind, EnemyProjectile, GameSettings, VocabularyEntry } from "../src/types";

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

const KINDS = Object.keys(KIND_ARCHETYPES) as EnemyKind[];

describe("enemy identity", () => {
  it("gives every family its own material, death burst and shot look", () => {
    const styles = ENEMY_FAMILY_IDS.map((family) => FAMILY_STYLES[family]);
    expect(new Set(styles.map((style) => style.material)).size).toBe(8);
    expect(new Set(styles.map((style) => style.death)).size).toBe(8);
    expect(new Set(styles.map((style) => style.shot)).size).toBe(8);
    for (const style of styles) {
      for (const color of [style.primary, style.accent, style.core]) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("moves every kind differently, within a few pixels and never off its hit box", () => {
    const signatures = new Set<string>();
    for (const kind of KINDS) {
      let maxOffset = 0;
      let minScale = 1;
      let maxScale = 1;
      let minAlpha = 1;
      const samples: number[] = [];
      for (let step = 0; step < 240; step += 1) {
        const pose = kindMotionPose(kind, step / 30, 7);
        maxOffset = Math.max(maxOffset, Math.hypot(pose.dx, pose.dy));
        minScale = Math.min(minScale, pose.scaleX, pose.scaleY);
        maxScale = Math.max(maxScale, pose.scaleX, pose.scaleY);
        minAlpha = Math.min(minAlpha, pose.alpha);
        samples.push(Math.round(pose.dx * 10), Math.round(pose.dy * 10), Math.round(pose.rotation * 100));
      }
      expect(maxOffset, kind).toBeLessThan(8);
      expect(minScale, kind).toBeGreaterThan(0.9);
      expect(maxScale, kind).toBeLessThan(1.1);
      expect(minAlpha, kind).toBeGreaterThan(0.6);
      signatures.add(samples.join(","));
    }
    expect(signatures.size).toBe(KINDS.length);
    // Same inputs, same pose (no hidden randomness).
    expect(kindMotionPose("destroyer", 3.2, 4)).toEqual(kindMotionPose("destroyer", 3.2, 4));
  });
});

describe("boss identity", () => {
  it("names 26 distinct bosses: a Tyrant per Galaxy, a Warden and a Lieutenant per family", () => {
    const all = allBossIdentities();
    expect(all).toHaveLength(26);
    expect(new Set(all.map((identity) => identity.id)).size).toBe(26);
    expect(new Set(all.map((identity) => identity.name)).size).toBe(26);
    for (let galaxy = 1; galaxy <= 10; galaxy += 1) {
      expect(galaxyTyrant(galaxy).id).toBe("tyrant-g" + String(galaxy).padStart(2, "0"));
      expect(galaxyTyrant(galaxy).rank).toBe("Galaxy Tyrant");
    }
    for (const identity of all) {
      expect(identity.patterns.length).toBeGreaterThan(0);
      expect(identity.voice).toBeGreaterThan(0.5);
      expect(identity.voice).toBeLessThan(1.4);
    }
  });

  it("meets the right boss on each boss stage", () => {
    expect(bossIdentityForStage(100, "major-boss").name).toBe("Auriel");
    expect(bossIdentityForStage(200, "major-boss").name).toBe("Vorgrath");
    expect(bossIdentityForStage(1000, "major-boss").name).toBe("Aeternus");
    // World 01 is led by the rainbow family, World 03 by prism.
    expect(bossIdentityForStage(20, "boss").id).toBe("warden-rainbow");
    expect(bossIdentityForStage(50, "boss").id).toBe("warden-prism");
    expect(bossIdentityForStage(10, "mini-boss").id).toBe("lieutenant-rainbow");
  });

  it("aims every volley pattern at the ship and keeps the shot count", () => {
    const patterns: BossPattern[] = ["aimed", "fan", "twin", "ring", "rain", "stream"];
    const player = { x: 640, y: 640 };
    for (const pattern of patterns) {
      for (let count = 1; count <= 5; count += 1) {
        for (let index = 0; index < count; index += 1) {
          const shot = bossShotGeometry(pattern, index, count, 640, 240, 70, player.x, player.y, 1280);
          expect(shot.x).toBeGreaterThanOrEqual(0);
          expect(shot.x).toBeLessThanOrEqual(1280);
          expect(shot.y).toBeLessThan(player.y);
          // Heading down the screen, toward the ship's side of the field.
          expect(Math.sin(shot.angle), pattern).toBeGreaterThan(0.55);
          expect(shot.speed).toBeGreaterThanOrEqual(0.55);
          expect(shot.speed).toBeLessThanOrEqual(1.1);
        }
      }
    }
  });
});

describe("combat effects", () => {
  it("caps particles and clears itself", () => {
    const fx = new CombatFxSystem();
    for (let index = 0; index < 60; index += 1) {
      fx.death(100, 100, "embers", FAMILY_STYLES.devil, 20, "high");
    }
    expect(fx.activeParticles).toBeLessThanOrEqual(360);
    for (let step = 0; step < 40; step += 1) fx.update(0.1);
    expect(fx.activeParticles).toBe(0);
    fx.hit(0, 0, "metal", FAMILY_STYLES.cosmic, 1, "high");
    expect(fx.activeParticles).toBeGreaterThan(0);
    fx.clear();
    expect(fx.activeParticles).toBe(0);
  });
});

type Runtime = {
  enemies: Enemy[];
  projectiles: EnemyProjectile[];
  boss: BossState | null;
  bossIdentity: { id: string; family: string } | null;
  fireBossProjectiles: (boss: BossState) => void;
  fireEnemyProjectile: (enemy: Enemy) => void;
  settings: GameSettings;
};

describe("identity in combat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("gives a Galaxy Tyrant its name, its family shots and its roar", () => {
    const roar = vi.spyOn(Sfx.prototype, "bossRoar").mockImplementation(() => {});
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 200);
    const runtime = game as unknown as Runtime;
    runtime.settings.enemyProjectileMode = "on";
    if (runtime.boss === null) expect(game.testLabSpawnBoss()).toBe(true);
    expect(runtime.boss?.name.startsWith("Vorgrath, Crown of Cinders")).toBe(true);
    expect(runtime.bossIdentity?.id).toBe("tyrant-g02");
    expect(roar).toHaveBeenCalled();
    runtime.projectiles = [];
    runtime.fireBossProjectiles(runtime.boss!);
    expect(runtime.projectiles.length).toBeGreaterThan(0);
    expect(runtime.projectiles.every((projectile) => projectile.family === "devil")).toBe(true);
    game.destroy();
  });

  it("tags enemy shots with the shooter's family", () => {
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 1);
    const runtime = game as unknown as Runtime;
    runtime.settings.enemyProjectileMode = "on";
    const [id] = game.testLabSpawnEnemies({ definitionId: "imp-spark", kind: "scout", count: 1 });
    const enemy = runtime.enemies.find((item) => item.id === id)!;
    runtime.fireEnemyProjectile(enemy);
    expect(runtime.projectiles.at(-1)?.family).toBe("devil");
    game.destroy();
  });

  it("breaks an enemy apart in its own material when the kill bolt lands", () => {
    const kill = vi.spyOn(Sfx.prototype, "kill").mockImplementation(() => {});
    const game = createTestGame();
    game.setTestLabMode(true);
    start(game, 1);
    game.testLabSetSchedulerFrozen(true);
    const [id] = game.testLabSpawnEnemies({ definitionId: "snow-wisp", kind: "scout", count: 1, layers: 1 });
    game.testLabForceWordComplete(id!);
    game.testLabAdvanceSimulation(1.2);
    expect(kill).toHaveBeenCalled();
    expect(kill.mock.calls.at(-1)?.[1]).toBe("ice");
    game.destroy();
  });
});
