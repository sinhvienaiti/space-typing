import { describe, expect, it } from "vitest";
import {
  BOSS_SKILLS,
  TETHER_TICK,
  bossCounterOpen,
  bossCounterPerfect,
  bossSkillDamage,
  bossSkillName,
  bossSkillPool,
  bossUltimatePhase,
  chooseBossSkill,
  interceptBossMeteor,
  seededBossRng,
  startBossSkill,
  tickBossSkill,
  typeBossCounter,
  type BossSkillEvent,
  type BossSkillState,
} from "../src/boss/skills";

function run(state: BossSkillState, seconds: number, step = 1 / 60): BossSkillEvent[] {
  const events: BossSkillEvent[] = [];
  for (let t = 0; t < seconds; t += step) events.push(...tickBossSkill(state, step));
  return events;
}

describe("boss skill pools", () => {
  it("gives mini bosses two skills and opens the kit as phases advance", () => {
    expect(bossSkillPool("mini-boss", 1)).toEqual(["volley", "lance"]);
    expect(bossSkillPool("mini-boss", 2)).toContain("tether");
    expect(bossSkillPool("boss", 1)).toEqual(["volley", "lance", "quake"]);
    expect(bossSkillPool("boss", 2)).toContain("surge");
    expect(bossSkillPool("major-boss", 1)).toContain("surge");
    expect(bossSkillPool("major-boss", 2)).toContain("tether");
    expect(bossUltimatePhase("mini-boss")).toBeNull();
    expect(bossUltimatePhase("boss")).toBe(2);
    expect(bossUltimatePhase("major-boss")).toBe(3);
  });

  it("never picks a skill on cooldown or the same special twice in a row", () => {
    const rng = seededBossRng(7);
    for (let i = 0; i < 200; i += 1) {
      const kind = chooseBossSkill("major-boss", 2, { lance: 3 }, "quake", rng);
      expect(kind).not.toBe("lance");
      expect(kind).not.toBe("quake");
    }
  });

  it("names skills by family", () => {
    expect(bossSkillName("lance", "devil")).toBe("Hellfire Lance");
    expect(bossSkillName("cataclysm", "cosmic")).toBe("Starfall");
    expect(bossSkillName("volley", "frost")).toBe("Glyph Volley");
  });
});

describe("counter prompts", () => {
  it("parries when the word is finished before release", () => {
    const state = startBossSkill("lance", "boss", 1, seededBossRng(3));
    expect(state.word).not.toBeNull();
    const word = state.word!;
    for (const letter of word.slice(0, -1)) expect(typeBossCounter(state, letter)).toBe("advance");
    expect(typeBossCounter(state, "!")).toBe("ignored");
    expect(typeBossCounter(state, word.at(-1)!)).toBe("complete");
    const events = run(state, BOSS_SKILLS.lance.telegraph + 0.4);
    expect(events).toContainEqual(expect.objectContaining({ type: "release", countered: true }));
    expect(events).toContainEqual(expect.objectContaining({ type: "impact", countered: true }));
  });

  it("fails when the window closes, and a half-typed parry still blunts the lance", () => {
    const state = startBossSkill("lance", "boss", 1, seededBossRng(4));
    typeBossCounter(state, state.word![0]!);
    const events = run(state, BOSS_SKILLS.lance.telegraph + 0.3);
    const release = events.find((event) => event.type === "release");
    expect(release).toEqual(expect.objectContaining({ countered: false }));
    const ratio = release!.type === "release" ? release!.typedRatio : 0;
    expect(ratio).toBeGreaterThan(0);
    expect(bossSkillDamage(BOSS_SKILLS.lance, ratio)).toBeLessThan(BOSS_SKILLS.lance.damage);
    // Typing after the release does nothing.
    expect(typeBossCounter(state, state.word![1]!)).toBe("ignored");
  });

  it("keeps a typeable window even at the fastest wind-up", () => {
    const state = startBossSkill("quake", "major-boss", 3, seededBossRng(5), 0.3);
    expect(state.spec.telegraph).toBeGreaterThanOrEqual(1.6);
    expect(state.safeLane).toBeGreaterThanOrEqual(0);
    expect(state.safeLane).toBeLessThanOrEqual(2);
  });

  it("runs telegraph → release → recovery → end exactly once", () => {
    const state = startBossSkill("surge", "boss", 2, seededBossRng(6));
    const spec = state.spec;
    const events = run(state, spec.telegraph + spec.release + spec.recovery + 0.5);
    expect(events.filter((event) => event.type === "release")).toHaveLength(1);
    expect(events.filter((event) => event.type === "impact")).toHaveLength(1);
    expect(events.filter((event) => event.type === "end")).toHaveLength(1);
  });
});

describe("siphon chain", () => {
  it("drains every tick until the release ends when nobody breaks it", () => {
    const state = startBossSkill("tether", "boss", 2, seededBossRng(11));
    const spec = state.spec;
    const events = run(state, spec.telegraph + spec.release + spec.recovery + 0.3);
    expect(events.filter((event) => event.type === "drain")).toHaveLength(Math.round(spec.release / TETHER_TICK));
    expect(state.result).toBe("failed");
    expect(events.filter((event) => event.type === "end")).toHaveLength(1);
  });

  it("can be broken while it drains, which stops the drain at once", () => {
    const state = startBossSkill("tether", "boss", 2, seededBossRng(12));
    const before = run(state, state.spec.telegraph + 1.1);
    expect(before.filter((event) => event.type === "drain")).toHaveLength(2);
    expect(bossCounterOpen(state)).toBe(true);
    for (const letter of state.word!) typeBossCounter(state, letter);
    expect(state.result).toBe("countered");
    expect(bossCounterPerfect(state)).toBe(false);
    const after = run(state, 3);
    expect(after.filter((event) => event.type === "drain")).toHaveLength(0);
    expect(after).toContainEqual(expect.objectContaining({ type: "impact", countered: true }));
  });

  it("never drains when broken before it attaches", () => {
    const state = startBossSkill("tether", "major-boss", 2, seededBossRng(13));
    for (const letter of state.word!) typeBossCounter(state, letter);
    expect(bossCounterPerfect(state)).toBe(true);
    const events = run(state, state.spec.telegraph + state.spec.release + 1);
    expect(events.filter((event) => event.type === "drain")).toHaveLength(0);
    expect(events).toContainEqual(expect.objectContaining({ type: "release", countered: true }));
  });
});

describe("perfect counters", () => {
  it("is perfect only with 40 % of the wind-up left", () => {
    const early = startBossSkill("lance", "boss", 1, seededBossRng(21));
    for (const letter of early.word!) typeBossCounter(early, letter);
    expect(bossCounterPerfect(early)).toBe(true);
    const late = startBossSkill("lance", "boss", 1, seededBossRng(21));
    run(late, late.spec.telegraph * 0.8);
    for (const letter of late.word!) typeBossCounter(late, letter);
    expect(late.result).toBe("countered");
    expect(bossCounterPerfect(late)).toBe(false);
  });
});

describe("cataclysm meteors", () => {
  it("carries distinct letters; typed meteors never land, the rest do", () => {
    const state = startBossSkill("cataclysm", "major-boss", 3, seededBossRng(9));
    expect(state.meteors).toHaveLength(7);
    expect(new Set(state.meteors.map((meteor) => meteor.char)).size).toBe(7);
    run(state, state.spec.telegraph + 0.1);
    const shot = interceptBossMeteor(state, state.meteors[0]!.char);
    expect(shot?.state).toBe("destroyed");
    const events = run(state, state.spec.release + state.spec.recovery + 0.5);
    const landed = events.filter((event) => event.type === "meteor-land");
    expect(landed).toHaveLength(6);
    expect(landed.every((event) => event.type === "meteor-land" && event.meteor.id !== shot!.id)).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    const a = startBossSkill("cataclysm", "boss", 2, seededBossRng(42));
    const b = startBossSkill("cataclysm", "boss", 2, seededBossRng(42));
    expect(a.meteors).toEqual(b.meteors);
  });
});
