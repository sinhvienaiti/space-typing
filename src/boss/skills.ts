import type { EnemyFamilyId } from "../enemies/families";
import type { BossRole } from "./model";

/**
 * Boss skill system (pure logic, no drawing). A skill telegraphs, releases,
 * then recovers. While it telegraphs, the player can counter it by typing:
 *
 * - volley    (Glyph Volley)   counter "intercept": type the letters on the shots.
 * - lance     (charged beam)   counter "parry": type the prompt word before release
 *                              to reflect the beam into the boss and stagger it.
 * - quake     (lane AoE)       counter "dodge": type the word on the safe lane to
 *                              dash there; the shock rolls down the other lanes.
 * - surge     (boss rushes in) counter "brace": type the word to take no damage;
 *                              the boss is left exposed (bonus damage window).
 * - tether    (siphon chain)   counter "break": the chain drains hull and heals
 *                              the boss until its word is typed (also while it
 *                              drains); breaking it stuns the boss.
 * - cataclysm (ultimate)       counter "intercept": meteors carry letters; each
 *                              one typed is shot down, each one that lands hurts.
 *
 * Game.ts owns damage, effects and sound; it reads the events from tickBossSkill.
 */
export type BossSkillKind = "volley" | "lance" | "quake" | "surge" | "tether" | "cataclysm";
export type BossCounterKind = "intercept" | "parry" | "dodge" | "brace" | "break";
export type BossSkillStage = "telegraph" | "release" | "recovery";

export type BossSkillSpec = {
  kind: BossSkillKind;
  counter: BossCounterKind;
  /** Seconds of wind-up (the counter window). */
  telegraph: number;
  /** Seconds the hit plays out. */
  release: number;
  recovery: number;
  /** Hull damage when not countered (per meteor / per drain tick). */
  damage: number;
  /** Seconds before the same skill can be chosen again. */
  cooldown: number;
  weight: number;
  /** Fraction of the release when the beam / shock / rush connects. */
  hitAt: number;
};

export const BOSS_SKILLS: Readonly<Record<BossSkillKind, BossSkillSpec>> = {
  volley: { kind: "volley", counter: "intercept", telegraph: 0.9, release: 0.25, recovery: 0.35, damage: 0, cooldown: 0, weight: 3, hitAt: 0 },
  // The beam is instant; the quake shock and the rush need time to travel.
  lance: { kind: "lance", counter: "parry", telegraph: 2.7, release: 0.55, recovery: 0.8, damage: 64, cooldown: 7, weight: 2.2, hitAt: 0.2 },
  quake: { kind: "quake", counter: "dodge", telegraph: 2.4, release: 1.0, recovery: 0.6, damage: 56, cooldown: 9, weight: 2, hitAt: 0.58 },
  surge: { kind: "surge", counter: "brace", telegraph: 1.9, release: 0.85, recovery: 0.9, damage: 52, cooldown: 10, weight: 1.6, hitAt: 0.4 },
  // Drains every TETHER_TICK seconds of the release (8 ticks = 64 at most).
  tether: { kind: "tether", counter: "break", telegraph: 1.4, release: 4.0, recovery: 0.7, damage: 8, cooldown: 12, weight: 1.4, hitAt: 0 },
  cataclysm: { kind: "cataclysm", counter: "intercept", telegraph: 1.7, release: 3.4, recovery: 1.1, damage: 26, cooldown: 30, weight: 0, hitAt: 0 },
};

/** Skills each role can use, by phase (the ultimate is queued on phase entry). */
export function bossSkillPool(role: BossRole, phase: number): readonly BossSkillKind[] {
  if (role === "mini-boss") return phase >= 2 ? ["volley", "lance", "tether"] : ["volley", "lance"];
  if (role === "boss") return phase >= 2 ? ["volley", "lance", "quake", "surge", "tether"] : ["volley", "lance", "quake"];
  if (phase >= 2) return ["volley", "lance", "quake", "surge", "tether"];
  return ["volley", "lance", "quake", "surge"];
}

/** Seconds between siphon drain ticks. */
export const TETHER_TICK = 0.5;

/** World bosses cast their ultimate entering phase 2, Galaxy Tyrants entering phase 3. */
export function bossUltimatePhase(role: BossRole): number | null {
  if (role === "boss") return 2;
  if (role === "major-boss") return 3;
  return null;
}

/** Themed prompt words: short, common English verbs (also good vocabulary). */
export const COUNTER_WORDS: Readonly<Record<Exclude<BossCounterKind, "intercept">, readonly string[]>> = {
  parry: ["parry", "guard", "block", "ward", "shield", "deflect", "repel"],
  dodge: ["dash", "dodge", "evade", "shift", "slide", "veer", "drift"],
  brace: ["brace", "hold", "stand", "anchor", "steady", "endure"],
  break: ["break", "snap", "sever", "cut", "unbind", "free", "release"],
};

const SKILL_NAMES: Readonly<Record<Exclude<BossSkillKind, "volley">, Readonly<Record<EnemyFamilyId, string>>>> = {
  lance: { rainbow: "Spectrum Lance", angel: "Seraph Lance", devil: "Hellfire Lance", frost: "Glacier Spear", prism: "Prism Lance", nature: "Thorn Javelin", shadow: "Umbral Pike", cosmic: "Star Lance" },
  quake: { rainbow: "Rainbow Quake", angel: "Halo Quake", devil: "Cinder Quake", frost: "Frost Fault", prism: "Shard Quake", nature: "Root Rupture", shadow: "Void Rift", cosmic: "Gravity Quake" },
  surge: { rainbow: "Prismatic Rush", angel: "Wing Rush", devil: "Infernal Charge", frost: "Blizzard Rush", prism: "Crystal Ram", nature: "Stampede", shadow: "Shadow Lunge", cosmic: "Comet Rush" },
  tether: { rainbow: "Ribbon Siphon", angel: "Halo Chain", devil: "Soul Chain", frost: "Frost Shackle", prism: "Prism Tether", nature: "Vine Siphon", shadow: "Leech Chain", cosmic: "Gravity Tether" },
  cataclysm: { rainbow: "Prism Cataclysm", angel: "Judgment Rain", devil: "Meteor Hell", frost: "Hailstorm", prism: "Shard Storm", nature: "Seed Barrage", shadow: "Nightfall", cosmic: "Starfall" },
};

export function bossSkillName(kind: BossSkillKind, family: EnemyFamilyId): string {
  return kind === "volley" ? "Glyph Volley" : SKILL_NAMES[kind][family];
}

export function bossCounterVerb(counter: BossCounterKind): string {
  switch (counter) {
    case "parry": return "PARRY";
    case "dodge": return "DODGE";
    case "brace": return "BRACE";
    case "break": return "BREAK";
    case "intercept": return "SHOOT DOWN";
  }
}

export type BossMeteor = {
  id: number;
  char: string;
  /** -1 … 1 across the play field. */
  lane: number;
  /** Seconds after release when it lands. */
  landsAt: number;
  state: "falling" | "destroyed" | "landed";
};

export type BossSkillState = {
  counterInputSource?: "typing" | "voice";
  voiceMeteorFlightSeconds?: number;
  kind: BossSkillKind;
  spec: BossSkillSpec;
  stage: BossSkillStage;
  /** Seconds into the current stage. */
  t: number;
  /** Counter prompt (parry / dodge / brace), null for intercept skills. */
  word: string | null;
  typed: number;
  result: "pending" | "countered" | "failed";
  /** Quake: safe lane 0 (left), 1 (middle) or 2 (right). */
  safeLane: number;
  meteors: BossMeteor[];
  /** Set once the recovery has finished ("end" was emitted). */
  ended: boolean;
  /** Seconds of telegraph left when the counter word was finished (0 = not yet). */
  counteredWithLeft: number;
};

export type BossSkillEvent =
  | { type: "release"; countered: boolean; typedRatio: number }
  | { type: "impact"; countered: boolean; typedRatio: number }
  | { type: "meteor-land"; meteor: BossMeteor }
  /** Siphon chain: one drain tick (only while it holds). */
  | { type: "drain" }
  | { type: "end" };

export type Rng = () => number;

/** Mulberry32: small seeded RNG so a stage plays the same every time. */
export function seededBossRng(seed: number): Rng {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Weighted pick among the pool, skipping skills still cooling down and not
 * repeating the last special skill back to back.
 */
export function chooseBossSkill(
  role: BossRole,
  phase: number,
  cooldowns: Readonly<Partial<Record<BossSkillKind, number>>>,
  last: BossSkillKind | null,
  rng: Rng,
): BossSkillKind {
  const pool = bossSkillPool(role, phase).filter(
    (kind) => (cooldowns[kind] ?? 0) <= 0 && (kind === "volley" || kind !== last),
  );
  if (pool.length === 0) return "volley";
  const total = pool.reduce((sum, kind) => sum + BOSS_SKILLS[kind].weight, 0);
  let roll = rng() * total;
  for (const kind of pool) {
    roll -= BOSS_SKILLS[kind].weight;
    if (roll <= 0) return kind;
  }
  return pool[pool.length - 1]!;
}

const METEOR_LETTERS = "asdfjklqweruiopzxcvbnm";

/**
 * Starts a skill. `windup` scales the telegraph (harder difficulty → shorter,
 * clamped so a counter word always stays typeable).
 */
export function startBossSkill(
  kind: BossSkillKind,
  role: BossRole,
  phase: number,
  rng: Rng,
  windup = 1,
  voiceWindow = false,
): BossSkillState {
  const base = BOSS_SKILLS[kind];
  const spec: BossSkillSpec = {
    ...base,
    telegraph: Math.max(base.kind === "volley" ? 0.5 : voiceWindow ? 3.5 : 1.6, base.telegraph * windup),
  };
  let word: string | null = null;
  if (spec.counter !== "intercept") {
    const words = COUNTER_WORDS[spec.counter];
    // Later phases may pick the longer words.
    const maxLength = phase >= 3 ? 7 : phase === 2 ? 6 : 5;
    const fitting = words.filter((candidate) => candidate.length <= maxLength);
    const list = fitting.length > 0 ? fitting : words;
    word = list[Math.floor(rng() * list.length)] ?? list[0]!;
  }
  const meteors: BossMeteor[] = [];
  if (kind === "cataclysm") {
    const count = role === "major-boss" ? 7 : 5;
    const used = new Set<string>();
    for (let index = 0; index < count; index += 1) {
      let char = METEOR_LETTERS[Math.floor(rng() * METEOR_LETTERS.length)] ?? "a";
      for (let guard = 0; used.has(char) && guard < 30; guard += 1) {
        char = METEOR_LETTERS[Math.floor(rng() * METEOR_LETTERS.length)] ?? "a";
      }
      used.add(char);
      meteors.push({
        id: index,
        char,
        lane: -0.85 + (1.7 * index) / Math.max(1, count - 1) + (rng() - 0.5) * 0.12,
        // Staggered landings across the release, the first after 0.9 s.
        landsAt: voiceWindow ? 2.8 + index * 1.2 : 0.9 + (index / count) * (spec.release - 1.1) + rng() * 0.15,
        state: "falling",
      });
    }
    meteors.sort((a, b) => a.landsAt - b.landsAt);
    if (voiceWindow) spec.release = meteors.at(-1)!.landsAt + 0.4;
  }
  return {
    kind,
    ...(voiceWindow ? { voiceMeteorFlightSeconds: 2.8 } : {}),
    spec,
    stage: "telegraph",
    t: 0,
    word,
    typed: 0,
    result: "pending",
    // Never the middle: the ship sits there, so dodging always means moving.
    safeLane: rng() < 0.5 ? 0 : 2,
    meteors,
    ended: false,
    counteredWithLeft: 0,
  };
}

/** True while the counter word can still be typed. */
export function bossCounterOpen(state: BossSkillState): boolean {
  if (state.word === null || state.result !== "pending") return false;
  return state.stage === "telegraph" || (state.kind === "tether" && state.stage === "release");
}

/**
 * A counter finished with at least 40 % of the wind-up left is "perfect"
 * (bigger reflect / longer stun). The siphon counts as perfect when broken
 * before it drains.
 */
export function bossCounterPerfect(state: BossSkillState): boolean {
  return state.result === "countered" && state.counteredWithLeft >= state.spec.telegraph * 0.4;
}

/** 0 … 1 through the current stage. */
export function bossSkillProgress(state: BossSkillState): number {
  const length =
    state.stage === "telegraph"
      ? state.spec.telegraph
      : state.stage === "release"
        ? state.spec.release
        : state.spec.recovery;
  return Math.min(1, state.t / Math.max(0.0001, length));
}

/**
 * Typing a counter prompt. Only letters that match the next character count;
 * anything else is "ignored" so the key can go to other targets.
 */
export function typeBossCounter(
  state: BossSkillState,
  key: string,
): "advance" | "complete" | "ignored" {
  if (!bossCounterOpen(state) || state.word === null) return "ignored";
  if (state.word[state.typed] !== key) return "ignored";
  state.typed += 1;
  if (state.typed >= state.word.length) {
    state.result = "countered";
    state.counteredWithLeft = state.stage === "telegraph" ? Math.max(0, state.spec.telegraph - state.t) : 0;
    return "complete";
  }
  return "advance";
}

/** A falling meteor whose letter matches `key` (earliest landing first). */
export function interceptBossMeteor(state: BossSkillState, key: string): BossMeteor | null {
  if (state.kind !== "cataclysm" || state.stage === "recovery") return null;
  const meteor = state.meteors.find((item) => item.state === "falling" && item.char === key);
  if (meteor === undefined) return null;
  meteor.state = "destroyed";
  return meteor;
}

/** Advances the skill; returns what happened this tick (in order). */
export function tickBossSkill(state: BossSkillState, dt: number): BossSkillEvent[] {
  const events: BossSkillEvent[] = [];
  if (state.ended) return events;
  let remaining = Math.max(0, dt);
  while (remaining > 0) {
    const length =
      state.stage === "telegraph"
        ? state.spec.telegraph
        : state.stage === "release"
          ? state.spec.release
          : state.spec.recovery;
    const step = Math.min(remaining, Math.max(0, length - state.t));
    const before = state.t;
    state.t += step;
    remaining -= step;

    if (state.stage === "release" && state.kind === "tether") {
      if (state.result === "countered") {
        // Broken while it drained: snap straight to recovery.
        events.push({ type: "impact", countered: true, typedRatio: 1 });
        state.stage = "recovery";
        state.t = 0;
        continue;
      }
      const ticksBefore = Math.floor(before / TETHER_TICK + 1e-9);
      const ticksNow = Math.floor(state.t / TETHER_TICK + 1e-9);
      for (let tick = ticksBefore; tick < ticksNow; tick += 1) events.push({ type: "drain" });
    }

    if (state.stage === "release") {
      for (const meteor of state.meteors) {
        if (meteor.state === "falling" && before < meteor.landsAt && state.t >= meteor.landsAt) {
          meteor.state = "landed";
          events.push({ type: "meteor-land", meteor });
        }
      }
      // Beam / shock / rush connect partway into the release (spec.hitAt).
      const hitAt = state.spec.release * state.spec.hitAt;
      if (state.kind !== "cataclysm" && state.kind !== "volley" && state.kind !== "tether" && before < hitAt && state.t >= hitAt) {
        events.push({ type: "impact", countered: state.result === "countered", typedRatio: typedRatio(state) });
      }
    }

    if (state.t < length - 1e-9) break;
    // Stage finished.
    if (state.stage === "telegraph") {
      // The siphon stays breakable while it drains; the others close here.
      if (state.result === "pending" && state.kind !== "tether") {
        state.result = state.word === null ? "pending" : "failed";
      }
      events.push({ type: "release", countered: state.result === "countered", typedRatio: typedRatio(state) });
      // A chain broken before it attaches never drains.
      state.stage = state.kind === "tether" && state.result === "countered" ? "recovery" : "release";
      state.t = 0;
    } else if (state.stage === "release") {
      if (state.kind === "tether" && state.result === "pending") state.result = "failed";
      for (const meteor of state.meteors) {
        if (meteor.state === "falling") {
          meteor.state = "landed";
          events.push({ type: "meteor-land", meteor });
        }
      }
      state.stage = "recovery";
      state.t = 0;
    } else {
      state.ended = true;
      events.push({ type: "end" });
      break;
    }
  }
  return events;
}

function typedRatio(state: BossSkillState): number {
  return state.word === null ? 0 : state.typed / state.word.length;
}

/**
 * Damage taken from an un-countered lance, quake or rush: a partly typed
 * counter word still blunts it (up to 60 % less).
 */
export function bossSkillDamage(spec: BossSkillSpec, typedRatio: number): number {
  return Math.round(spec.damage * (1 - Math.min(1, Math.max(0, typedRatio)) * 0.6));
}
