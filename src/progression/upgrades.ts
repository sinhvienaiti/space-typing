import {
  CORE_STAT_KEYS,
  type CoreStatKey,
  type StatBonus,
} from "../stats/core";
import {
  UPGRADEABLE_SKILL_IDS,
  type UpgradeableSkillId,
} from "../skills/progression";
import { clamp } from "../logic";
import {
  createBasicSkillsByCharacter,
  isValidBasicSkillsByCharacter,
  sanitizeBasicSkillsByCharacter,
  type BasicSkillsByCharacter,
} from "./basic-skills";

export const MAX_SKILL_LEVEL = 5;
export const MAX_ATTRIBUTE_LEVEL = 20;
export const MAX_ECONOMY_ATTRIBUTE_LEVEL = 10;

export type UpgradeState = {
  skillLevels: Record<UpgradeableSkillId, number>;
  attributeLevels: Record<CoreStatKey, number>;
  basicSkills: BasicSkillsByCharacter;
};

export type UpgradeCost = {
  credits: number;
  alloy: number;
  starCrystal: number;
  quantumCore: number;
  requiredStage: number;
};

const ATTRIBUTE_BONUS_PER_LEVEL: Record<CoreStatKey, number> = {
  hull: 5,
  shield: 3,
  firepower: 1.5,
  armor: 1.2,
  energy: 4,
  reactor: 0.5,
  focus: 1,
  ward: 1,
  luck: 0.6,
  salvage: 0.6,
};

function createSkillLevels(): Record<UpgradeableSkillId, number> {
  return Object.fromEntries(
    UPGRADEABLE_SKILL_IDS.map((id) => [id, 1]),
  ) as Record<UpgradeableSkillId, number>;
}

function createAttributeLevels(): Record<CoreStatKey, number> {
  return Object.fromEntries(
    CORE_STAT_KEYS.map((key) => [key, 0]),
  ) as Record<CoreStatKey, number>;
}

export function createUpgradeState(): UpgradeState {
  return {
    skillLevels: createSkillLevels(),
    attributeLevels: createAttributeLevels(),
    basicSkills: createBasicSkillsByCharacter(),
  };
}

export function maxAttributeLevel(key: CoreStatKey): number {
  return key === "luck" || key === "salvage"
    ? MAX_ECONOMY_ATTRIBUTE_LEVEL
    : MAX_ATTRIBUTE_LEVEL;
}

export function sanitizeSkillLevel(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(Math.floor(value), 1, MAX_SKILL_LEVEL)
    : 1;
}

export function sanitizeAttributeLevel(
  key: CoreStatKey,
  value: unknown,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(Math.floor(value), 0, maxAttributeLevel(key))
    : 0;
}

export function sanitizeUpgradeState(value: unknown): UpgradeState {
  const result = createUpgradeState();
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return result;
  }

  const raw = value as {
    skillLevels?: unknown;
    attributeLevels?: unknown;
    basicSkills?: unknown;
  };

  if (
    raw.skillLevels !== null &&
    typeof raw.skillLevels === "object" &&
    !Array.isArray(raw.skillLevels)
  ) {
    const levels = raw.skillLevels as Record<string, unknown>;
    for (const id of UPGRADEABLE_SKILL_IDS) {
      result.skillLevels[id] = sanitizeSkillLevel(levels[id]);
    }
  }

  if (
    raw.attributeLevels !== null &&
    typeof raw.attributeLevels === "object" &&
    !Array.isArray(raw.attributeLevels)
  ) {
    const levels = raw.attributeLevels as Record<string, unknown>;
    for (const key of CORE_STAT_KEYS) {
      result.attributeLevels[key] =
        sanitizeAttributeLevel(key, levels[key]);
    }
  }

  // v22-v26 had only currency-paid, globally shared Lv1-Lv5 skill ranks.
  // Preserve every paid rank for EVERY character at zero Basic Points spent.
  // Afterwards the old field is retained for compatibility but no longer
  // provides a second in-game purchase path.
  result.basicSkills = sanitizeBasicSkillsByCharacter(
    raw.basicSkills,
    raw.basicSkills === undefined ? result.skillLevels : undefined,
  );

  return result;
}

export function isValidUpgradeState(
  value: unknown,
): value is UpgradeState {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const raw = value as Record<string, unknown>;
  if (
    Object.keys(raw).length !== 3 ||
    raw.skillLevels === null ||
    typeof raw.skillLevels !== "object" ||
    Array.isArray(raw.skillLevels) ||
    raw.attributeLevels === null ||
    typeof raw.attributeLevels !== "object" ||
    Array.isArray(raw.attributeLevels)
  ) {
    return false;
  }

  const skills = raw.skillLevels as Record<string, unknown>;
  if (
    Object.keys(skills).length !== UPGRADEABLE_SKILL_IDS.length ||
    !UPGRADEABLE_SKILL_IDS.every(
      (id) =>
        Number.isInteger(skills[id]) &&
        typeof skills[id] === "number" &&
        skills[id] >= 1 &&
        skills[id] <= MAX_SKILL_LEVEL,
    )
  ) {
    return false;
  }

  const attributes = raw.attributeLevels as Record<string, unknown>;
  return (
    isValidBasicSkillsByCharacter(raw.basicSkills) &&
    Object.keys(attributes).length === CORE_STAT_KEYS.length &&
    CORE_STAT_KEYS.every(
      (key) =>
        Number.isInteger(attributes[key]) &&
        typeof attributes[key] === "number" &&
        attributes[key] >= 0 &&
        attributes[key] <= maxAttributeLevel(key),
    )
  );
}

// Strict check for the two-field v22-v26 M17 save contract. The extra
// per-character Basic Skill field is added during PlayerSave v27 migration.
export function isValidLegacyUpgradeState(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).length !== 2 || !("skillLevels" in raw) ||
      !("attributeLevels" in raw)) return false;
  return isValidUpgradeState({ ...raw, basicSkills: createBasicSkillsByCharacter() });
}

export function permanentAttributeBonus(
  stateInput: UpgradeState,
): StatBonus {
  const state = sanitizeUpgradeState(stateInput);
  const result: StatBonus = {};

  for (const key of CORE_STAT_KEYS) {
    result[key] =
      state.attributeLevels[key] *
      ATTRIBUTE_BONUS_PER_LEVEL[key];
  }

  return result;
}

export function skillUpgradeCost(
  currentLevel: number,
): UpgradeCost | null {
  const level = sanitizeSkillLevel(currentLevel);
  if (level >= MAX_SKILL_LEVEL) return null;

  const target = level + 1;
  return {
    credits: Math.round(140 + target * target * 80),
    alloy: 1 + target * 2,
    starCrystal: target >= 5 ? 2 : target >= 4 ? 1 : 0,
    quantumCore: 0,
    requiredStage:
      target <= 2
        ? 1
        : target === 3
          ? 101
          : target === 4
            ? 301
            : 601,
  };
}

export function attributeUpgradeCost(
  key: CoreStatKey,
  currentLevel: number,
): UpgradeCost | null {
  const level = sanitizeAttributeLevel(key, currentLevel);
  if (level >= maxAttributeLevel(key)) return null;

  const target = level + 1;
  const economy = key === "luck" || key === "salvage";
  const curve = economy ? 1.65 : 1;
  const requiredStage = economy
    ? Math.max(1, (target - 2) * 80 + 1)
    : Math.max(1, (target - 5) * 35 + 1);

  return {
    credits: Math.round(
      (90 + target * target * 26) * curve,
    ),
    alloy: Math.round(
      (1 + Math.floor(target / 3)) * curve,
    ),
    starCrystal:
      target >= (economy ? 8 : 16)
        ? economy
          ? 2
          : 1
        : 0,
    quantumCore:
      target === maxAttributeLevel(key) && economy ? 1 : 0,
    requiredStage: clamp(requiredStage, 1, 1000),
  };
}

export function upgradeSkillLevel(
  stateInput: UpgradeState,
  id: UpgradeableSkillId,
): { state: UpgradeState; changed: boolean } {
  const state = sanitizeUpgradeState(stateInput);
  const current = state.skillLevels[id];
  if (current >= MAX_SKILL_LEVEL) {
    return { state, changed: false };
  }

  return {
    state: {
      ...state,
      skillLevels: {
        ...state.skillLevels,
        [id]: current + 1,
      },
    },
    changed: true,
  };
}

export function upgradeAttributeLevel(
  stateInput: UpgradeState,
  key: CoreStatKey,
): { state: UpgradeState; changed: boolean } {
  const state = sanitizeUpgradeState(stateInput);
  const current = state.attributeLevels[key];
  if (current >= maxAttributeLevel(key)) {
    return { state, changed: false };
  }

  return {
    state: {
      ...state,
      attributeLevels: {
        ...state.attributeLevels,
        [key]: current + 1,
      },
    },
    changed: true,
  };
}
