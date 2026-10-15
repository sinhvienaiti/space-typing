import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestGame } from "./helpers/game-harness";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import { createBossState, type BossState } from "../src/boss/model";
import { TargetOwnership } from "../src/input/target-ownership";
import {
  VOICE_COMBAT_POLICY,
  VoicePassiveCredit,
} from "../src/input/voice-combat-policy";
import type { Enemy, EnemyProjectile, VocabularyEntry } from "../src/types";
import type { Game } from "../src/Game";
import type { SupplyPod } from "../src/supply/pod";
import { startBossSkill, type BossSkillState } from "../src/boss/skills";

it("built-in counter vocabulary does not poison offline preflight with unbind", () => {
  const game = createTestGame([]);
  expect(game.getVoiceVocabularyForms()).not.toContain("unbind");
  expect(game.getVoiceVocabularyForms()).toContain("unlock");
  game.destroy();
});

const entry = (en: string): VocabularyEntry => ({
  id: en,
  en,
  vi: "",
  ipa: "",
});
const pool = [
  "morning",
  "planet",
  "zebra",
  "river",
  "banana",
  "galaxy",
  "shield",
  "month",
  "me",
].map(entry);
type Internals = {
  enemies: Enemy[];
  targetId: number | null;
  boss: BossState | null;
  bossSkill: BossSkillState | null;
  supplyPod: SupplyPod | null;
  targetOwnership: TargetOwnership;
  projectiles: EnemyProjectile[];
  selectVariedEnemyEntry(preferred: VocabularyEntry): VocabularyEntry | null;
  admitVoiceProjectile(projectile: EnemyProjectile): boolean;
  pickEnemyLayerEntry(enemy: Enemy): VocabularyEntry;
  voiceCandidateAllowed(entry: VocabularyEntry, exclude?: object): boolean;
  startBossSkillCast(boss: BossState, kind: "lance" | "cataclysm"): void;
  update(dt: number): void;
};
function scenario(mode: "voice" | "hybrid" = "hybrid") {
  const wordComplete = vi.fn(),
    game = createTestGame(pool, { onWordComplete: wordComplete });
  game.setInputMode(mode);
  game.setVoiceReadiness(() => true);
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
  game.testLabSpawnSamePrefixScenario();
  const state = game as unknown as Internals;
  state.enemies = state.enemies.filter((enemy) => enemy.entry.en !== "me");
  state.enemies.forEach((enemy) => {
    enemy.layersRemaining = 1;
    enemy.y = enemy.entry.en === "morning" ? 600 : 200;
  });
  return { game, state, wordComplete };
}
function target(game: Game, form: string) {
  const t = game.getVoiceTargets(16000).find((t) => t.forms.includes(form));
  if (!t) throw new Error("Target missing: " + form);
  return t;
}
function say(game: Game, form: string) {
  const t = target(game, form);
  return game.completeVoiceUnit(t.unitId, t.unitVersion, t.eligibilityVersion);
}

it("cached conflict checks still invalidate when a live word changes and re-enable when it leaves", () => {
  const { game, state } = scenario("voice");
  const morning = state.enemies.find((enemy) => enemy.entry.en === "morning")!;
  expect(target(game, "morning").eligible).toBe(true);
  const other = state.enemies.find((enemy) => enemy !== morning)!;
  other.entry = entry("morningstar");
  expect(target(game, "morning").eligible).toBe(false);
  expect(target(game, "morningstar").eligible).toBe(false);
  state.enemies = [morning];
  expect(target(game, "morning").eligible).toBe(true);
  game.destroy();
});

afterEach(() => vi.unstubAllGlobals());
describe("real Voice semantic completion", () => {
  it("completes B while preserving keyboard A and every typing statistic", () => {
    const { game, state, wordComplete } = scenario();
    game.handleKey("m");
    game.handleKey("o");
    game.handleKey("r");
    const a = state.enemies.find((e) => e.entry.en === "morning")!;
    const before = game.getStats(),
      lock = state.targetId;
    expect(target(game, "morning").keyboardOwned).toBe(true);
    expect(say(game, "morning")).toBe(false);
    expect(say(game, "month")).toBe(true);
    expect(a.typed).toBe(3);
    expect(a.wordMissed).toBe(false);
    expect(state.targetId).toBe(lock);
    expect(game.getStats()).toMatchObject({
      hits: before.hits,
      misses: before.misses,
      streak: before.streak,
      maxStreak: before.maxStreak,
      multiplier: before.multiplier,
    });
    expect(game.getVoiceMetrics().words).toBe(1);
    expect(game.getStageSessionSnapshot().correctWordKeys).toBe(3);
    expect(
      game.getStageSessionSnapshot().wordAttempts.find((a) => a.en === "month"),
    ).toMatchObject({ outcome: "spoken", correctKeys: 0 });
    expect(wordComplete).toHaveBeenCalledWith(
      expect.objectContaining({ en: "month" }),
      expect.objectContaining({ inputSource: "voice" }),
    );
    game.destroy();
  });
  it("never grants duplicate completion and gives a fresh identity to a same-text layer", () => {
    const { game, state } = scenario("voice");
    state.enemies = state.enemies.filter((e) => e.entry.en === "month");
    const b = state.enemies[0]!;
    b.layersRemaining = 2;
    vi.spyOn(state, "pickEnemyLayerEntry").mockReturnValue(b.entry);
    const old = target(game, "month");
    expect(
      game.completeVoiceUnit(
        old.unitId,
        old.unitVersion,
        old.eligibilityVersion,
      ),
    ).toBe(true);
    const next = target(game, "month");
    expect(next.unitId).not.toBe(old.unitId);
    expect(next.terminal).toBe(false);
    const score = game.getStats().score;
    expect(
      game.completeVoiceUnit(
        old.unitId,
        old.unitVersion,
        old.eligibilityVersion,
      ),
    ).toBe(false);
    expect(game.getStats().score).toBe(score);
    expect(say(game, "month")).toBe(true);
    expect(game.getVoiceMetrics().words).toBe(2);
    game.destroy();
  });
  it("retains keyboard ownership when system mechanics reset progress to zero", () => {
    const { game, state } = scenario();
    game.handleKey("m");
    game.handleKey("o");
    game.handleKey("r");
    const a = state.enemies.find((e) => e.entry.en === "morning")!;
    a.typed = 0;
    expect(target(game, "morning").keyboardOwned).toBe(true);
    expect(say(game, "morning")).toBe(false);
    game.destroy();
  });
  it("Voice uses controls but cannot fake keyboard letters or a perfect typing result", () => {
    const { game } = scenario("voice");
    game.handleKey("m");
    expect(game.getStats().hits).toBe(0);
    expect(say(game, "month")).toBe(true);
    expect(game.getStats()).toMatchObject({
      hits: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
    });
    expect(game.getStageSessionSnapshot()).toMatchObject({
      perfectWords: 0,
      wordsCompleted: 0,
    });
    game.handleKey("Escape");
    expect(game.getPhase()).toBe("paused");
    expect(say(game, "morning")).toBe(false);
    game.destroy();
  });
  it("intercepts the exact NATO projectile without disturbing the keyboard lock", () => {
    const { game, state } = scenario();
    game.handleKey("m");
    game.handleKey("o");
    game.handleKey("r");
    const lock = state.targetId;
    state.projectiles = [
      {
        id: 901,
        char: "a",
        ownerId: 0,
        x: 300,
        y: 300,
        vx: 0,
        vy: 1,
        radius: 10,
      },
    ];
    expect(say(game, "alpha")).toBe(true);
    expect(state.projectiles).toHaveLength(0);
    expect(state.targetId).toBe(lock);
    expect(game.getVoiceMetrics()).toMatchObject({ words: 0, actions: 1 });
    expect(game.getStats().hits).toBe(3);
    game.destroy();
  });
  it("completes a boss counter without typing hits, and Voice windows permit a final utterance", () => {
    const { game, state } = scenario("voice");
    state.enemies = [];
    state.boss = createBossState(100, 1, "major-boss", entry("barrier"));
    state.startBossSkillCast(state.boss, "lance");
    const skill = state.bossSkill!;
    expect(skill.spec.telegraph).toBeGreaterThanOrEqual(3.5);
    expect(say(game, skill.word!)).toBe(true);
    expect(skill.result).toBe("countered");
    expect(game.getStats().hits).toBe(0);
    expect(say(game, skill.word!)).toBe(false);
    state.bossSkill = null;
    state.startBossSkillCast(state.boss, "cataclysm");
    const meteorSkill = state.bossSkill!;
    meteorSkill.stage = "release";
    meteorSkill.t = 0.1;
    expect(meteorSkill.voiceMeteorFlightSeconds).toBe(2.8);
    const action = game
      .getVoiceTargets(0)
      .find((t) => t.capability === "action" && t.eligible)!;
    expect(action).toBeDefined();
    expect(
      game.completeVoiceUnit(
        action.unitId,
        action.unitVersion,
        action.eligibilityVersion,
      ),
    ).toBe(true);
    expect(meteorSkill.meteors[0]!.state).toBe("destroyed");
    expect(game.getVoiceMetrics().actions).toBe(1);
    game.destroy();
  });
  it("fails closed on a forced global collision", () => {
    const { game, state } = scenario("voice");
    state.supplyPod = {
      entry: entry("morningstar"),
      typed: 0,
      reward: "shield",
      x: 200,
      y: 200,
      speed: 0,
      age: 0,
      lifetime: 20,
    };
    expect(target(game, "morning").eligible).toBe(false);
    expect(say(game, "morning")).toBe(false);
    expect(say(game, "morningstar")).toBe(false);
    expect(say(game, "month")).toBe(true);
    game.destroy();
  });
  it("completes a supply word once with Voice and preserves typing A", () => {
    const { game, state } = scenario();
    game.handleKey("m");
    game.handleKey("o");
    game.handleKey("r");
    const lock = state.targetId;
    state.supplyPod = {
      entry: entry("solar"),
      typed: 0,
      reward: "shield",
      x: 200,
      y: 200,
      speed: 0,
      age: 0,
      lifetime: 20,
    };
    expect(say(game, "solar")).toBe(true);
    expect(state.supplyPod).toBeNull();
    expect(state.targetId).toBe(lock);
    expect(game.getStats().hits).toBe(3);
    game.destroy();
  });
});
describe("production world admission and Voice passive policy", () => {
  it("includes keyboard-owned and bonus words in global duplicate/prefix/homophone checks", () => {
    const { game, state } = scenario();
    game.handleKey("m");
    game.handleKey("o");
    game.handleKey("r");
    expect(state.voiceCandidateAllowed(entry("morningstar"))).toBe(false);
    expect(state.voiceCandidateAllowed(entry("morning"))).toBe(false);
    state.supplyPod = {
      entry: entry("right"),
      typed: 0,
      reward: "shield",
      x: 200,
      y: 200,
      speed: 0,
      age: 0,
      lifetime: 20,
    };
    expect(state.voiceCandidateAllowed(entry("write"))).toBe(false);
    expect(state.voiceCandidateAllowed(entry("river"))).toBe(true);
    game.destroy();
  });
  it("reserves duplicate projectiles under distinct visible spoken commands", () => {
    const { game, state } = scenario("voice");
    for (let i = 0; i < 10; i++) {
      const projectile: EnemyProjectile = {
        id: 1000 + i,
        char: "a",
        ownerId: 0,
        x: 300,
        y: 300,
        vx: 0,
        vy: 1,
        radius: 10,
      };
      expect(state.admitVoiceProjectile(projectile)).toBe(true);
      state.projectiles.push(projectile);
    }
    const forms = game.getVoiceTargets(0).flatMap((t) => t.forms);
    expect(new Set(forms).size).toBe(forms.length);
    game.destroy();
  });
  it("defers an unsafe replacement without losing the only completable word", () => {
    const { game, state } = scenario("voice");
    const enemy = state.enemies.find((e) => e.entry.en === "month")!;
    expect(state.voiceCandidateAllowed(enemy.entry, enemy)).toBe(true);
    const next = state.pickEnemyLayerEntry(enemy);
    expect(state.voiceCandidateAllowed(next, enemy)).toBe(true);
    game.destroy();
  });
  it("caps effort and releases at most one separate passive proc per accepted utterance", () => {
    expect(VOICE_COMBAT_POLICY.maxEffort).toBe(8);
    const credits = new VoicePassiveCredit();
    expect(credits.add("a", 999, 20)).toBe(false);
    expect(credits.add("b", 8, 20)).toBe(false);
    expect(credits.add("a", 8, 20)).toBe(false);
    expect(credits.add("a", 8, 20)).toBe(true);
    expect(credits.add("b", 8, 20)).toBe(false);
    credits.reset();
    expect(credits.add("a", 8, 20)).toBe(false);
  });
});
