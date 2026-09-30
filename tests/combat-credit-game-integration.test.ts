import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/Game";
import { createBossState } from "../src/boss/model";
import { difficultyFor } from "../src/campaign/difficulty";
import { createStageConfig } from "../src/campaign/stage";
import {
  CombatCreditRewardLedger,
  type CombatCreditClaimRequest,
  type CombatCreditMode,
  type CombatCreditRewardReceipt,
} from "../src/rewards/combat-credit-drops";
import type { Enemy, GameSettings, VocabularyEntry } from "../src/types";

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

const ELIGIBLE_DEFINITION_ID = "rainbow-scout" as const;

const vocabulary: VocabularyEntry[] = [
  { id: "credit-a", en: "orbit", vi: "quỹ đạo", ipa: "" },
  { id: "credit-b", en: "shield", vi: "lá chắn", ipa: "" },
  { id: "credit-c", en: "stellar", vi: "thuộc về sao", ipa: "" },
];

type Runtime = {
  enemies: Enemy[];
  spawnCarrierChild(enemy: Enemy): void;
  resolveSkillEnemyKill(
    enemy: Enemy,
    options: {
      normalScore: number;
      eliteScore: number;
      grantPower?: number;
      rollDrop?: boolean;
      triggerDeathTraits?: boolean;
      playDeathFx?: boolean;
    },
  ): void;
  boss: ReturnType<typeof createBossState> | null;
  defeatBoss(completedEntry?: VocabularyEntry): void;
};

function createHarness(mode: CombatCreditMode = "test-lab"): {
  game: Game;
  reward: ReturnType<typeof vi.fn>;
} {
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

  const ledger = new CombatCreditRewardLedger();
  const reward = vi.fn(
    (request: CombatCreditClaimRequest): CombatCreditRewardReceipt | null =>
      ledger.claimKillReward(request),
  );

  const game = new Game(canvas, vocabulary, settings, {
    onStats: vi.fn(),
    onPhase: vi.fn(),
    onStage: vi.fn(),
    onCombatCreditAttemptStart: (attempt) => {
      ledger.beginAttempt({
        attemptId: attempt.attemptId,
        mode,
        combatCreditBudget: 500,
        expectedWeight: 500,
      });
    },
    onCombatCreditReward: reward,
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
  return { game, reward };
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
  game.testLabSetSchedulerFrozen(true);
}

describe("Combat Credit FINAL V3 Game integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("claims only the final layer of a multi-layer combat enemy", () => {
    const { game, reward } = createHarness();
    start(game, 50);
    const id = game.testLabSpawnEnemies({
      definitionId: ELIGIBLE_DEFINITION_ID,
      kind: "scout",
      count: 1,
      rank: "X",
      layers: 2,
    })[0]!;

    expect(game.testLabForceWordComplete(id)).toBe(true);
    expect(reward).not.toHaveBeenCalled();
    expect(game.getCombatCreditsGrantedThisStage()).toBe(0);

    expect(game.testLabForceWordComplete(id)).toBe(true);
    expect(reward).toHaveBeenCalledTimes(1);
    expect(game.getCombatCreditsGrantedThisStage()).toBeGreaterThanOrEqual(1);
    game.destroy();
  });

  it("does not claim rewards for clear/filter cleanup removal", () => {
    const { game, reward } = createHarness();
    start(game, 1);
    expect(
      game.testLabSpawnEnemies({ kind: "scout", count: 2, layers: 1 }),
    ).toHaveLength(2);

    expect(game.testLabClearEnemies()).toBe(true);
    expect(reward).not.toHaveBeenCalled();
    expect(game.getCombatCreditsGrantedThisStage()).toBe(0);
    game.destroy();
  });

  it("blocks repeatable carrier summons from Combat Credits without blocking the carrier", () => {
    const { game, reward } = createHarness();
    start(game, 100);
    game.testLabSetDifficultyOverrides({ maxEnemies: 20 });
    const carrierId = game.testLabSpawnEnemies({
      definitionId: ELIGIBLE_DEFINITION_ID,
      kind: "carrier",
      count: 1,
      layers: 1,
    })[0]!;
    const runtime = game as unknown as Runtime;
    const carrier = runtime.enemies.find((enemy) => enemy.id === carrierId);
    if (carrier === undefined) throw new Error("Missing carrier");

    runtime.spawnCarrierChild(carrier);
    const child = runtime.enemies.find((enemy) => enemy.id !== carrierId);
    expect(child).toBeDefined();
    expect(child?.combatCreditEligible).toBe(false);
    expect(game.testLabKillEnemy(child!.id)).toBe(true);
    expect(reward).not.toHaveBeenCalled();

    expect(game.testLabKillEnemy(carrierId)).toBe(true);
    expect(reward).toHaveBeenCalledTimes(1);
    expect(game.getCombatCreditsGrantedThisStage()).toBeGreaterThanOrEqual(1);
    game.destroy();
  });

  it("keeps finite Splitter fragments eligible for their own combat reward", () => {
    const { game, reward } = createHarness();
    start(game, 100);
    game.testLabSetDifficultyOverrides({ maxEnemies: 20 });
    const splitterId = game.testLabSpawnEnemies({
      definitionId: ELIGIBLE_DEFINITION_ID,
      kind: "splitter",
      count: 1,
      layers: 1,
    })[0]!;
    expect(game.testLabKillEnemy(splitterId)).toBe(true);
    expect(reward).toHaveBeenCalledTimes(1);

    const runtime = game as unknown as Runtime;
    const fragment = runtime.enemies[0];
    expect(fragment).toBeDefined();
    expect(fragment?.combatCreditEligible).toBe(true);
    expect(game.testLabKillEnemy(fragment!.id)).toBe(true);
    expect(reward).toHaveBeenCalledTimes(2);
    game.destroy();
  });

  it("routes skill kills through the same idempotent reward contract", () => {
    const { game, reward } = createHarness();
    start(game, 100);
    const id = game.testLabSpawnEnemies({
      definitionId: ELIGIBLE_DEFINITION_ID,
      kind: "scout",
      count: 1,
      layers: 1,
    })[0]!;
    const runtime = game as unknown as Runtime;
    const enemy = runtime.enemies.find((item) => item.id === id);
    if (enemy === undefined) throw new Error("Missing enemy");

    runtime.resolveSkillEnemyKill(enemy, {
      normalScore: 10,
      eliteScore: 20,
      rollDrop: false,
      triggerDeathTraits: false,
      playDeathFx: false,
    });

    expect(reward).toHaveBeenCalledTimes(1);
    expect(reward.mock.calls[0]?.[0]?.cause).toBe("skill-kill");
    expect(game.getCombatCreditsGrantedThisStage()).toBeGreaterThanOrEqual(1);
    game.destroy();
  });

  it("keeps Recall combat claims disabled even when a kill path runs", () => {
    const { game, reward } = createHarness("recall");
    game.setGameplayMode("recall");
    start(game, 1);
    const id = game.testLabSpawnEnemies({
      definitionId: ELIGIBLE_DEFINITION_ID,
      kind: "scout",
      count: 1,
      layers: 1,
    })[0]!;

    expect(game.testLabKillEnemy(id)).toBe(true);
    expect(reward).toHaveBeenCalledTimes(1);
    expect(game.getCombatCreditsGrantedThisStage()).toBe(0);
    expect(game.getCombatCreditsAppliedThisStage()).toBe(0);
    game.destroy();
  });

  it("claims one premium boss receipt from the central boss defeat path", () => {
    const { game, reward } = createHarness();
    start(game, 100);
    const runtime = game as unknown as Runtime;
    const entry = vocabulary[0]!;
    runtime.boss = createBossState(100, 1, "major-boss", entry);

    runtime.defeatBoss(entry);

    expect(reward).toHaveBeenCalledTimes(1);
    expect(reward.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        cause: "boss-kill",
        source: expect.objectContaining({
          sourceKind: "boss",
          bossRole: "major-boss",
        }),
      }),
    );
    expect(game.getCombatCreditsGrantedThisStage()).toBeGreaterThanOrEqual(1);
    game.destroy();
  });
});
