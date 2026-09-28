import { afterEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "../src/audio/Sfx";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import { CHARACTER_IDS } from "../src/characters/registry";
import { Game } from "../src/Game";
import { typingText } from "../src/logic";
import type { Enemy, GameSettings, VocabularyEntry } from "../src/types";
import {
  parseShotFx,
  pickHeadSprite,
  type ShotSprite,
} from "../src/vfx/player-shot-sprites";
import {
  MAX_FLIGHT_SECONDS,
  MIN_DEPTH_SCALE,
  MIN_FLIGHT_SECONDS,
  PlayerShotSystem,
  shotDepthScale,
  shotRecipeFor,
  type ShotAimPoint,
} from "../src/vfx/player-shots";

const keepTarget = (): boolean => false;

function fireAt(
  system: PlayerShotSystem<string>,
  targetX: number,
  targetY: number,
  power = 0.8,
  payload = "hit",
): void {
  system.fire({
    characterId: "vanguard",
    originX: 640,
    originY: 648,
    targetX,
    targetY,
    power,
    viewHeight: 720,
    payload,
  });
}

/** Steps the system at 60 fps until `stop` or `seconds` pass; returns arrivals. */
function run(
  system: PlayerShotSystem<string>,
  seconds: number,
  aim: (payload: string, out: ShotAimPoint) => boolean = keepTarget,
): Array<{ payload: string; x: number; y: number; at: number }> {
  const landed: Array<{ payload: string; x: number; y: number; at: number }> = [];
  const step = 1 / 60;
  for (let time = step; time <= seconds + 1e-9; time += step) {
    for (const arrival of system.update(step, aim)) {
      landed.push({ payload: arrival.payload, x: arrival.x, y: arrival.y, at: time });
    }
  }
  return landed;
}

describe("player shot recipes", () => {
  it("gives only Vanguard a travelling bolt in the pilot", () => {
    expect(shotRecipeFor("vanguard")).not.toBeNull();
    for (const id of CHARACTER_IDS.filter((candidate) => candidate !== "vanguard")) {
      expect(shotRecipeFor(id)).toBeNull();
    }
    const system = new PlayerShotSystem<string>();
    expect(
      system.fire({
        characterId: "aegis", originX: 0, originY: 0, targetX: 0, targetY: -300,
        power: 1, viewHeight: 720, payload: "x",
      }),
    ).toBe(false);
    expect(system.activeShots).toBe(0);
  });

  it("points Vanguard at its painted sprite folder", () => {
    expect(shotRecipeFor("vanguard")?.fx).toBe("vanguard");
  });

  it("narrows bolts as they climb the field (depth cue)", () => {
    expect(shotDepthScale(600, 600, 720)).toBe(1);
    expect(shotDepthScale(600, 700, 720)).toBe(1);
    const near = shotDepthScale(600, 500, 720);
    expect(near).toBeLessThan(1);
    expect(near).toBeGreaterThan(shotDepthScale(600, 400, 720));
    expect(shotDepthScale(600, -2000, 720)).toBe(MIN_DEPTH_SCALE);
  });
});

describe("bolt impact sound", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("layers a chime, a crackle and a thud, and merges hits closer than 32 ms", () => {
    const sfx = new Sfx();
    const audio = sfx as unknown as { tone: () => void; noise: () => void };
    const tone = vi.spyOn(audio, "tone").mockImplementation(() => {});
    const noise = vi.spyOn(audio, "noise").mockImplementation(() => {});
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    sfx.boltImpact(0.8);
    expect(tone).toHaveBeenCalledTimes(3);
    expect(noise).toHaveBeenCalledOnce();
    now += 10;
    sfx.boltImpact(0.8);
    expect(tone).toHaveBeenCalledTimes(3);
    now += 40;
    sfx.boltImpact(0.8);
    expect(tone).toHaveBeenCalledTimes(6);
    sfx.destroy();
  });
});

describe("painted shot sprites", () => {
  const SHA = "b".repeat(64);
  const spec = { url: "impact.webp", sha256: SHA, width: 640, height: 634, anchor: [0.5, 0.49] };

  it("parses fx.json strictly and busts the cache with the content hash", () => {
    const fx = parseShotFx({ id: "vanguard", version: 1, sprites: { impact: spec } }, "vanguard");
    expect(fx?.sprites.impact?.url).toBe(
      "/assets/space-typing/fx/vanguard/impact.webp?v=" + "b".repeat(16),
    );
    expect(parseShotFx({ id: "vanguard", version: 1, sprites: { impact: spec } }, "aegis")).toBeNull();
    const broken = (patch: Record<string, unknown>) =>
      parseShotFx({ id: "vanguard", version: 1, sprites: { impact: { ...spec, ...patch } } }, "vanguard");
    expect(broken({ sha256: "nope" })).toBeNull();
    expect(broken({ url: "../x.webp" })).toBeNull();
    expect(broken({ anchor: [1.2, 0.5] })).toBeNull();
    expect(broken({ width: 0 })).toBeNull();
    expect(
      parseShotFx({ id: "vanguard", version: 1, sprites: { laser: spec } }, "vanguard"),
    ).toBeNull();
  });

  it("falls back between the light bolt and the heavy lance", () => {
    const sprite = (id: string) => ({ id }) as unknown as ShotSprite;
    const both = { bolt: sprite("bolt"), finisher: sprite("finisher") };
    expect(pickHeadSprite(both, false)).toBe(both.bolt);
    expect(pickHeadSprite(both, true)).toBe(both.finisher);
    // The owner's first batch had no usable bolt: normal shots borrow the lance.
    expect(pickHeadSprite({ finisher: both.finisher }, false)).toBe(both.finisher);
    expect(pickHeadSprite({ bolt: both.bolt }, true)).toBe(both.bolt);
    expect(pickHeadSprite({}, false)).toBeNull();
    expect(pickHeadSprite(null, true)).toBeNull();
  });
});

describe("PlayerShotSystem", () => {
  it("lands once at its target within the flight-time bounds, then drains its tail", () => {
    const system = new PlayerShotSystem<string>();
    fireAt(system, 400, 120, 0.8, "enemy-1");
    expect(system.activeShots).toBe(1);

    const landed = run(system, MAX_FLIGHT_SECONDS + 0.02);
    expect(landed).toHaveLength(1);
    expect(landed[0]).toMatchObject({ payload: "enemy-1", x: 400, y: 120 });
    expect(landed[0]!.at).toBeGreaterThanOrEqual(MIN_FLIGHT_SECONDS);
    expect(landed[0]!.at).toBeLessThanOrEqual(MAX_FLIGHT_SECONDS + 1 / 60);

    // The comet tail is still visible right after impact, then disappears.
    run(system, MAX_FLIGHT_SECONDS);
    expect(system.activeShots).toBe(0);
    expect(run(system, 1)).toHaveLength(0);
  });

  it("follows a moving target and lands where it is now", () => {
    const system = new PlayerShotSystem<string>();
    fireAt(system, 300, 200);
    let x = 300;
    const landed = run(system, MAX_FLIGHT_SECONDS + 0.02, (_payload, out) => {
      x += 4;
      out.x = x;
      out.y = 200;
      return true;
    });
    expect(landed).toHaveLength(1);
    expect(landed[0]!.x).toBeGreaterThan(300);
    expect(landed[0]!.x).toBe(x);
  });

  it("keeps a fast typist's stream of bolts in flight together", () => {
    const system = new PlayerShotSystem<string>();
    for (let key = 0; key < 6; key += 1) {
      fireAt(system, 640, 100, 0.8, "k" + key);
      run(system, 0.05);
    }
    expect(system.activeShots).toBeGreaterThan(1);
    const rest = run(system, MAX_FLIGHT_SECONDS * 2);
    expect(system.activeShots).toBe(0);
    expect(rest.map((arrival) => arrival.payload)).not.toContain("k0");
  });

  it("clear() drops bolts without reporting arrivals", () => {
    const system = new PlayerShotSystem<string>();
    fireAt(system, 500, 100);
    system.clear();
    expect(system.activeShots).toBe(0);
    expect(system.idle).toBe(true);
    expect(run(system, 1)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Game integration: gameplay resolves on the key press, the picture follows
// the bolt.
// ---------------------------------------------------------------------------

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

const vocabulary: VocabularyEntry[] = [{ id: "w", en: "star", vi: "", ipa: "" }];

function createTestGame(): Game {
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
      width: 1280, height: 720, top: 0, left: 0, right: 1280, bottom: 720, x: 0, y: 0,
      toJSON: () => ({}),
    })),
  } as unknown as HTMLCanvasElement;

  const game = new Game(canvas, vocabulary, settings, {
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
  game.setTestLabMode(true);
  game.startStage(
    createStageConfig(1),
    difficultyFor({
      stage: 1,
      vocabularyLevel: 1,
      mode: "balanced",
      recentWpm: 60,
      recentAccuracy: 96,
    }),
  );
  game.testLabSetSchedulerFrozen(true);
  return game;
}

type ShotRuntime = {
  enemies: Enemy[];
  dyingEnemies: Enemy[];
  lasers: unknown[];
  playerShots: { activeShots: number };
  update: (dt: number) => void;
  updateEffects: (dt: number) => void;
};

type BonusRuntime = ShotRuntime & {
  supplyPod: { x: number; y: number; entry: VocabularyEntry } | null;
  bonusGhosts: unknown[];
  spawnSupplyPod: () => void;
};

describe("Game player shots", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lands Vanguard's hit flash and kill blast with the bolt, not the key press", () => {
    const kill = vi.spyOn(Sfx.prototype, "kill").mockImplementation(() => {});
    const game = createTestGame();
    expect(game.testLabSpawnEnemies({ kind: "scout", count: 1, layers: 1 })).toHaveLength(1);
    const runtime = game as unknown as ShotRuntime;
    const enemy = runtime.enemies[0]!;
    const word = typingText(enemy.entry.en);
    const flashBefore = enemy.flash;

    game.handleKey(word[0]!);
    expect(enemy.typed).toBe(1);
    expect(enemy.flash).toBe(flashBefore);
    expect(runtime.playerShots.activeShots).toBe(1);
    expect(runtime.lasers).toHaveLength(0);
    runtime.updateEffects(MAX_FLIGHT_SECONDS);
    expect(enemy.flash).toBe(1);

    for (const key of word.slice(1)) game.handleKey(key);
    // Out of play at once (score, kill count), but drawn until the bolt lands.
    expect(runtime.enemies).toHaveLength(0);
    expect(game.getStats().kills).toBe(1);
    expect(runtime.dyingEnemies).toEqual([enemy]);
    expect(kill).not.toHaveBeenCalled();

    runtime.updateEffects(MAX_FLIGHT_SECONDS);
    expect(runtime.dyingEnemies).toHaveLength(0);
    expect(kill).toHaveBeenCalledOnce();
    game.destroy();
  });

  it("staggers the enemy and plays the impact chime when a bolt lands", () => {
    const chime = vi.spyOn(Sfx.prototype, "boltImpact").mockImplementation(() => {});
    const game = createTestGame();
    game.testLabSpawnEnemies({ kind: "scout", count: 1, layers: 1 });
    const runtime = game as unknown as ShotRuntime;
    const enemy = runtime.enemies[0]!;
    const word = typingText(enemy.entry.en);

    game.handleKey(word[0]!);
    expect(chime).not.toHaveBeenCalled();
    runtime.updateEffects(MAX_FLIGHT_SECONDS);
    expect(chime).toHaveBeenCalledOnce();
    expect(enemy.hitStun ?? 0).toBeGreaterThan(0);
    expect(enemy.hitShake ?? 0).toBeGreaterThan(0);

    // Held still while staggered, then it advances again.
    const heldY = enemy.y;
    runtime.update(0.02);
    expect(enemy.y).toBe(heldY);
    runtime.update(0.1);
    runtime.update(0.1);
    expect(enemy.y).toBeGreaterThan(heldY);
    game.destroy();
  });

  it("keeps the instant laser and immediate feedback for ships without a bolt", () => {
    const kill = vi.spyOn(Sfx.prototype, "kill").mockImplementation(() => {});
    const game = createTestGame();
    game.setCharacter("aegis");
    game.testLabSpawnEnemies({ kind: "scout", count: 1, layers: 1 });
    const runtime = game as unknown as ShotRuntime;
    const enemy = runtime.enemies[0]!;
    const word = typingText(enemy.entry.en);

    const chime = vi.spyOn(Sfx.prototype, "boltImpact").mockImplementation(() => {});
    game.handleKey(word[0]!);
    expect(enemy.flash).toBe(1);
    expect(runtime.lasers).toHaveLength(1);
    expect(runtime.playerShots.activeShots).toBe(0);
    // The legacy laser keeps its original feedback: no stagger, no chime.
    expect(enemy.hitStun ?? 0).toBe(0);
    expect(chime).not.toHaveBeenCalled();

    for (const key of word.slice(1)) game.handleKey(key);
    expect(runtime.dyingEnemies).toHaveLength(0);
    expect(kill).toHaveBeenCalledOnce();
    game.destroy();
  });

  it("turns the ship toward the enemy it shoots and fires from the turned muzzles", () => {
    const game = createTestGame();
    game.testLabSpawnEnemies({ kind: "scout", count: 1, layers: 1 });
    const runtime = game as unknown as ShotRuntime & {
      shipMotion: { aim: number };
      playerShots: { shots: Array<{ live: boolean; x0: number }> };
    };
    const enemy = runtime.enemies[0]!;
    enemy.x = 1100;
    enemy.baseX = 1100;
    enemy.y = 200;
    const word = typingText(enemy.entry.en);

    game.handleKey(word[0]!);
    expect(runtime.shipMotion.aim).toBeGreaterThan(0.3);
    // First bolt: the left wing pod, swung toward the right by the turn.
    const shot = runtime.playerShots.shots.find((item) => item.live)!;
    expect(shot.x0).toBeGreaterThan(640 - 21 + 3);
    game.destroy();
  });

  it("fires a real bolt at bonus targets and lands the pickup burst with the last one", () => {
    vi.spyOn(Sfx.prototype, "supplyArrival").mockImplementation(() => {});
    const support = vi.spyOn(Sfx.prototype, "support").mockImplementation(() => {});
    const chime = vi.spyOn(Sfx.prototype, "boltImpact").mockImplementation(() => {});
    const game = createTestGame();
    const runtime = game as unknown as BonusRuntime;
    runtime.spawnSupplyPod();
    const pod = runtime.supplyPod!;
    pod.x = 420;
    const word = typingText(pod.entry.en);

    game.handleKey(word[0]!);
    expect(runtime.playerShots.activeShots).toBe(1);
    expect(runtime.lasers).toHaveLength(0);
    expect(chime).not.toHaveBeenCalled();
    runtime.updateEffects(MAX_FLIGHT_SECONDS);
    expect(chime).toHaveBeenCalledOnce();

    for (const key of word.slice(1)) game.handleKey(key);
    // Collected at once (reward applied), drawn until the final bolt lands.
    expect(runtime.supplyPod).toBeNull();
    expect(runtime.bonusGhosts).toHaveLength(1);
    expect(support).not.toHaveBeenCalled();
    runtime.updateEffects(MAX_FLIGHT_SECONDS);
    expect(runtime.bonusGhosts).toHaveLength(0);
    expect(support).toHaveBeenCalledOnce();
    game.destroy();
  });

  it("draws the laser tracer at bonus targets for ships without a bolt", () => {
    vi.spyOn(Sfx.prototype, "supplyArrival").mockImplementation(() => {});
    const support = vi.spyOn(Sfx.prototype, "support").mockImplementation(() => {});
    const game = createTestGame();
    game.setCharacter("aegis");
    const runtime = game as unknown as BonusRuntime;
    runtime.spawnSupplyPod();
    const pod = runtime.supplyPod!;
    pod.x = 420;
    const word = typingText(pod.entry.en);

    game.handleKey(word[0]!);
    expect(runtime.lasers).toHaveLength(1);
    for (const key of word.slice(1)) game.handleKey(key);
    expect(runtime.lasers).toHaveLength(word.length);
    expect(runtime.bonusGhosts).toHaveLength(0);
    expect(support).toHaveBeenCalledOnce();
    game.destroy();
  });
});
