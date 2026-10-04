import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createBossState, type BossState } from "../src/boss/model";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import type { SupplyPod } from "../src/supply/pod";
import type { GamePhase, GameSettings, VocabularyEntry } from "../src/types";
import { TargetOwnership } from "../src/input/target-ownership";
import type { Enemy } from "../src/types";

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

type OwnershipInternals = Omit<GameInternals, "enemies"> & {
  targetOwnership: TargetOwnership;
  completeWord(enemy: Enemy): void;
  pickEnemyLayerEntry(enemy: Enemy): VocabularyEntry;
  enemies: Enemy[];
};
function liveScenario(): { game: Game; state: OwnershipInternals } {
  const game = createTestGame(); game.setTestLabMode(true);
  game.startStage(createStageConfig(1), difficultyFor({ stage: 1, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }));
  game.testLabSpawnSamePrefixScenario();
  return { game, state: game as unknown as OwnershipInternals };
}

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

describe("Recall mode bonus targets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets a supply pod take a key the Recall enemy does not want", () => {
    const game = createTestGame();
    const state = game as unknown as GameInternals & { gameplayMode: string };
    state.phase = "playing";
    state.gameplayMode = "recall";
    state.enemies = [{ id: 7, entry: { id: "sister", en: "sister", vi: "chị gái", ipa: "" }, typed: 0 }];
    state.supplyPod = supply("right");

    game.handleKey("r");
    expect(state.supplyPod?.typed).toBe(1);
    expect(state.enemies[0]!.typed).toBe(0);

    // Started: the pod keeps its letters.
    game.handleKey("i");
    expect(state.supplyPod?.typed).toBe(2);
    game.destroy();
  });

  it("still reaches the supply pod once the Recall word is locked and half typed", () => {
    const game = createTestGame();
    const state = game as unknown as GameInternals & { gameplayMode: string };
    state.phase = "playing";
    state.gameplayMode = "recall";
    // "s" already typed: the Recall word is the locked target and wants "i".
    state.enemies = [{ id: 7, entry: { id: "sister", en: "sister", vi: "chị gái", ipa: "" }, typed: 1 }];
    state.targetId = 7;
    state.supplyPod = supply("right");

    game.handleKey("r");
    expect(state.supplyPod?.typed).toBe(1);
    expect(state.enemies[0]!.typed).toBe(1);

    // "i" is wanted by both: the started pod keeps its own next letter.
    game.handleKey("i");
    expect(state.supplyPod?.typed).toBe(2);
    expect(state.enemies[0]!.typed).toBe(1);
    game.destroy();
  });

  it("lets a bonus target take a key the Recall boss word does not want", () => {
    const game = createTestGame();
    const state = game as unknown as GameInternals & { gameplayMode: string };
    state.phase = "playing";
    state.gameplayMode = "recall";
    state.boss = createBossState(50, 1, "boss", bossEntry);
    state.supplyPod = supply("solar");

    game.handleKey("s");
    expect(state.supplyPod?.typed).toBe(1);
    expect(state.boss.typed).toBe(0);
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
    game.setTestLabMode(true);
    game.startStage(
      createStageConfig(50),
      difficultyFor({
        stage: 50,
        vocabularyLevel: 1,
        mode: "balanced",
        recentWpm: 60,
        recentAccuracy: 96,
      }),
    );
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

describe("keyboard ownership in real game routes", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("claims only an accepted key on the receiving unit", () => {
    const game = createTestGame(), state = game as unknown as OwnershipInternals;
    state.phase = "playing"; state.boss = createBossState(50, 1, "boss", bossEntry);
    state.supplyPod = supply("solar");
    game.handleKey("x"); expect(state.targetOwnership.isKeyboardOwned(state.boss)).toBe(false);
    game.handleKey("s"); expect(state.targetOwnership.isKeyboardOwned(state.supplyPod)).toBe(true);
    expect(state.targetOwnership.isKeyboardOwned(state.boss)).toBe(false);
    state.supplyPod!.typed = 0; game.handleKey("Escape");
    expect(state.targetOwnership.isKeyboardOwned(state.supplyPod)).toBe(true); game.destroy();
  });
  it("system progress is available until a real accepted keyboard key claims it", () => {
    const { game, state } = liveScenario(), enemy = state.enemies[0]!; enemy.typed = 1; state.targetId = enemy.id;
    expect(state.targetOwnership.current(enemy).owner).toBe("available");
    game.handleKey(enemy.entry.en[1]!); expect(state.targetOwnership.current(enemy).owner).toBe("keyboard"); game.destroy();
  });
  it.each([1, 2])("completing B with %s layer(s) keeps A's lock, progress and keyboard ownership", (layers) => {
    const { game, state } = liveScenario(); game.handleKey("m");
    const a = state.enemies.find((e) => e.id === state.targetId)!; const b = state.enemies.find((e) => e.id !== a.id)!;
    b.layersRemaining = layers; b.typed = b.entry.en.length;
    const aProgress = a.typed; const aUnit = state.targetOwnership.current(a);
    state.completeWord(b);
    expect(state.targetId).toBe(a.id); expect(a.typed).toBe(aProgress); expect(aUnit.owner).toBe("keyboard"); game.destroy();
  });
  it("completing its own layer releases the lock and gives even the same word a new available unit", () => {
    const { game, state } = liveScenario(); game.handleKey("m"); const enemy = state.enemies.find((e) => e.id === state.targetId)!;
    const oldUnit = state.targetOwnership.current(enemy); enemy.layersRemaining = 2;
    vi.spyOn(state, "pickEnemyLayerEntry").mockReturnValue(enemy.entry); state.completeWord(enemy);
    expect(state.targetId).toBeNull(); expect(enemy.typed).toBe(0); expect(oldUnit.owner).toBe("invalidated");
    expect(state.targetOwnership.current(enemy).owner).toBe("available"); expect(state.targetOwnership.current(enemy).unitId).not.toBe(oldUnit.unitId); game.destroy();
  });
  it("does not restore a lock whose target has already been removed by gameplay", () => {
    const { game, state } = liveScenario(); game.handleKey("m"); const oldId = state.targetId; const b = state.enemies.find((e) => e.id !== oldId)!;
    state.enemies = state.enemies.filter((e) => e.id !== oldId); state.completeWord(b);
    expect(state.targetId).toBeNull(); game.destroy();
  });
});
