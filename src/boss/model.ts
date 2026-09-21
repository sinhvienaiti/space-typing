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
  flash: number;
  kick: number;
};

export type BossHudState = {
  name: string;
  hp: number;
  maxHp: number;
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

export function toBossHud(state: BossState): BossHudState {
  return {
    name: state.name,
    hp: Math.max(0, state.hp),
    maxHp: state.maxHp,
  };
}
