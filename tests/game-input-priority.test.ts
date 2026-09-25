import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createBossState, type BossState } from "../src/boss/model";
import type { SupplyPod } from "../src/supply/pod";
import type { GamePhase, GameSettings, VocabularyEntry } from "../src/types";

type GameInternals = {
  phase: GamePhase;
  boss: BossState | null;
  supplyPod: SupplyPod | null;
  targetId: number | null;
  enemies: Array<{ id: number; entry: VocabularyEntry; typed: number }>;
  recallBonus: { entry: VocabularyEntry; typed: number } | null;
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

const bossEntry: VocabularyEntry = {
  id: "boss",
  en: "barrier",
  vi: "",
  ipa: "",
};

function createTestGame(vocabulary: VocabularyEntry[] = [bossEntry]): Game {
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

function supply(word: string): SupplyPod {
  return {
    entry: { id: "supply", en: word, vi: "", ipa: "" },
    typed: 0,
    reward: "shield",
    x: 200,
    y: 200,
    speed: 0,
    age: 0,
    lifetime: 20,
  };
}

describe("boss-stage input priority", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows an unstarted special target before an untouched boss", () => {
    const game = createTestGame();
    const state = game as unknown as GameInternals;
    state.phase = "playing";
    state.boss = createBossState(50, 1, "boss", bossEntry);
    state.supplyPod = supply("solar");

    game.handleKey("s");

    expect(state.supplyPod?.typed).toBe(1);
    expect(state.boss.typed).toBe(0);
    game.destroy();
  });

  it("keeps the boss word locked after boss typing has started", () => {
    const game = createTestGame();
    const state = game as unknown as GameInternals;
    state.phase = "playing";
    state.boss = createBossState(50, 1, "boss", bossEntry);
    state.boss.typed = 1;
    state.supplyPod = supply("anchor");

    game.handleKey("a");

    expect(state.boss.typed).toBe(2);
    expect(state.supplyPod?.typed).toBe(0);
    game.destroy();
  });
});

describe("Recall Bonus input priority", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets a matching Recall Bonus key bypass a locked enemy wrong key", () => {
    const bonusEntries: VocabularyEntry[] = [
      { id: "orbit", en: "orbit", vi: "quỹ đạo", ipa: "" },
      { id: "apple", en: "apple", vi: "táo", ipa: "" },
      { id: "zebra", en: "zebra", vi: "ngựa vằn", ipa: "" },
    ];
    const game = createTestGame(bonusEntries);
    const state = game as unknown as GameInternals;
    state.phase = "playing";
    game.setTestLabMode(true);
    const ids = game.testLabSpawnSamePrefixScenario();
    expect(ids.length).toBeGreaterThan(0);

    game.handleKey("m");
    const locked = state.enemies.find((enemy) => enemy.id === state.targetId);
    expect(locked?.typed).toBe(1);
    const enemyExpected = locked?.entry.en[1];

    const bonus =
      bonusEntries.find((entry) => entry.en[0] !== enemyExpected) ??
      bonusEntries[0]!;
    expect(game.testLabSpawnRecallBonus(bonus.id)).toBe(true);
    expect(state.recallBonus?.typed).toBe(0);

    game.handleKey(bonus.en[0]!);

    expect(state.recallBonus?.typed).toBe(1);
    expect(locked?.typed).toBe(1);
    game.destroy();
  });
});

