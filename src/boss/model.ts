import type { StageRole } from "../campaign/types";
import type { VocabularyEntry } from "../types";

export type BossRole = Extract<
  StageRole,
  "mini-boss" | "boss" | "major-boss"
>;

export type BossState = {
  role: BossRole;
  name: string;
  hp: number;
  maxHp: number;
  entry: VocabularyEntry;
  typed: number;
  wordsCompleted: number;
  phase: number;
  shieldActive: boolean;
  staggerTimer: number;
  actionCooldown: number;
  wordMissed: boolean;
  flash: number;
  kick: number;
};

export type BossHudState = {
  name: string;
  hp: number;
  maxHp: number;
  phase: number;
  shieldActive: boolean;
  staggered: boolean;
};

export function isBossStageRole(role: StageRole): role is BossRole {
  return (
    role === "mini-boss" ||
    role === "boss" ||
    role === "major-boss"
  );
}

export function bossName(role: BossRole, galaxy: number): string {
  const prefix =
    role === "major-boss"
      ? "Galaxy Tyrant"
      : role === "boss"
        ? "Abyss Warden"
        : "Vanguard Sentinel";
  return prefix + " · G" + String(galaxy).padStart(2, "0");
}

export function bossMaxHp(
  stage: number,
  role: BossRole,
): number {
  const safeStage = Math.max(1, Math.floor(stage));
  const base =
    role === "major-boss" ? 620 : role === "boss" ? 390 : 250;
  const perStage =
    role === "major-boss" ? 7 : role === "boss" ? 5 : 3.5;
  return Math.round(base + safeStage * perStage);
}

export function createBossState(
  stage: number,
  galaxy: number,
  role: BossRole,
  entry: VocabularyEntry,
): BossState {
  const maxHp = bossMaxHp(stage, role);
  return {
    role,
    name: bossName(role, galaxy),
    hp: maxHp,
    maxHp,
    entry,
    typed: 0,
    wordsCompleted: 0,
    phase: 1,
    shieldActive: false,
    staggerTimer: 0,
    actionCooldown: bossActionInterval(role, 1),
    wordMissed: false,
    flash: 0,
    kick: 0,
  };
}

export function bossKeyDamage(
  maxHp: number,
  role: BossRole,
): number {
  const ratio =
    role === "major-boss" ? 0.01 : role === "boss" ? 0.013 : 0.016;
  return Math.max(1, Math.round(maxHp * ratio));
}

export function bossWordDamage(
  maxHp: number,
  role: BossRole,
): number {
  const ratio =
    role === "major-boss" ? 0.038 : role === "boss" ? 0.045 : 0.052;
  return Math.max(2, Math.round(maxHp * ratio));
}

export function bossPhaseFor(
  hp: number,
  maxHp: number,
  role: BossRole,
): number {
  if (role === "mini-boss") return 1;

  const ratio = maxHp <= 0 ? 0 : hp / maxHp;
  if (role === "major-boss") {
    if (ratio <= 0.33) return 3;
    if (ratio <= 0.66) return 2;
    return 1;
  }

  return ratio <= 0.5 ? 2 : 1;
}

export function bossActionInterval(
  role: BossRole,
  phase: number,
): number {
  const base =
    role === "major-boss" ? 4.5 : role === "boss" ? 4.8 : 5.2;
  return Math.max(2.25, base - Math.max(0, phase - 1) * 0.8);
}

export function bossProjectileCount(
  role: BossRole,
  phase: number,
): number {
  if (role === "major-boss") {
    return Math.min(3, Math.max(1, phase));
  }
  if (role === "boss") {
    return phase >= 2 ? 2 : 1;
  }
  return 1;
}

export function toBossHud(state: BossState): BossHudState {
  return {
    name: state.name,
    hp: Math.max(0, state.hp),
    maxHp: state.maxHp,
    phase: state.phase,
    shieldActive: state.shieldActive,
    staggered: state.staggerTimer > 0,
  };
}
