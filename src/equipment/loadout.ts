import {
  EQUIPMENT_SLOTS,
  getEquipmentDefinition,
  isEquipmentId,
  type EquipmentId,
  type EquipmentSlot,
} from "./registry";
import {
  enhancementStatMultiplier,
  MAX_ENHANCEMENT_LEVEL,
  sanitizeEnhancementLevel,
} from "./enhancement";
import {
  isLegacyEquipmentRarity,
  legacyRarityToGrade,
  type LegacyEquipmentRarity,
} from "./rarity";
import {
  gradeStatMultiplier,
  isGradeId,
  type GradeId,
} from "../grades";
import type { StatBonus } from "../stats/core";

export type EquipmentInstance = {
  instanceId: string;
  definitionId: EquipmentId;
  grade: GradeId;
  enhancement: number;
};

type RarityEquipmentInstance = {
  instanceId: string;
  definitionId: EquipmentId;
  rarity: LegacyEquipmentRarity;
};

export type LegacyEnhancedRarityEquipmentInstance = {
  instanceId: string;
  definitionId: EquipmentId;
  rarity: LegacyEquipmentRarity;
  enhancement: number;
};

export type LegacyEnhancedRarityEquipmentState = {
  items: LegacyEnhancedRarityEquipmentInstance[];
  loadout: EquipmentLoadout;
};

type LegacyEquipmentInstance = {
  instanceId: string;
  definitionId: EquipmentId;
};

export type EquipmentLoadout = Record<
  EquipmentSlot,
  string | null
>;

export type EquipmentState = {
  items: EquipmentInstance[];
  loadout: EquipmentLoadout;
};

function emptyLoadout(): EquipmentLoadout {
  return {
    weapon: null,
    armor: null,
    shield: null,
    reactor: null,
    utility: null,
    drone: null,
    core: null,
  };
}

export function createStarterEquipmentState(): EquipmentState {
  const items: EquipmentInstance[] = [
    { instanceId: "starter-pulse", definitionId: "pulse-laser-mk1", grade: "aluminum", enhancement: 0 },
    { instanceId: "starter-precision", definitionId: "precision-laser-mk1", grade: "aluminum", enhancement: 0 },
    { instanceId: "starter-armor", definitionId: "plated-armor-mk1", grade: "aluminum", enhancement: 0 },
    { instanceId: "starter-shield", definitionId: "deflector-shield-mk1", grade: "aluminum", enhancement: 0 },
    { instanceId: "starter-reactor", definitionId: "compact-reactor-mk1", grade: "aluminum", enhancement: 0 },
    { instanceId: "starter-utility", definitionId: "targeting-module-mk1", grade: "aluminum", enhancement: 0 },
    { instanceId: "starter-drone", definitionId: "support-drone-mk1", grade: "aluminum", enhancement: 0 },
    { instanceId: "starter-core", definitionId: "balanced-core-mk1", grade: "aluminum", enhancement: 0 },
  ];

  return {
    items,
    loadout: {
      weapon: "starter-pulse",
      armor: "starter-armor",
      shield: "starter-shield",
      reactor: "starter-reactor",
      utility: "starter-utility",
      drone: "starter-drone",
      core: "starter-core",
    },
  };
}

function validInstance(value: unknown): value is EquipmentInstance {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    instanceId?: unknown;
    definitionId?: unknown;
    grade?: unknown;
    enhancement?: unknown;
  };

  return (
    typeof raw.instanceId === "string" &&
    raw.instanceId.length > 0 &&
    typeof raw.definitionId === "string" &&
    isEquipmentId(raw.definitionId) &&
    isGradeId(raw.grade) &&
    typeof raw.enhancement === "number" &&
    Number.isInteger(raw.enhancement) &&
    raw.enhancement >= 0 &&
    raw.enhancement <= MAX_ENHANCEMENT_LEVEL
  );
}

function validRarityInstance(
  value: unknown,
): value is RarityEquipmentInstance {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    instanceId?: unknown;
    definitionId?: unknown;
    rarity?: unknown;
  };

  return (
    typeof raw.instanceId === "string" &&
    raw.instanceId.length > 0 &&
    typeof raw.definitionId === "string" &&
    isEquipmentId(raw.definitionId) &&
    isLegacyEquipmentRarity(raw.rarity)
  );
}

function validEnhancedRarityInstance(
  value: unknown,
): value is LegacyEnhancedRarityEquipmentInstance {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    instanceId?: unknown;
    definitionId?: unknown;
    rarity?: unknown;
    enhancement?: unknown;
  };

  return (
    typeof raw.instanceId === "string" &&
    raw.instanceId.length > 0 &&
    typeof raw.definitionId === "string" &&
    isEquipmentId(raw.definitionId) &&
    isLegacyEquipmentRarity(raw.rarity) &&
    typeof raw.enhancement === "number" &&
    Number.isInteger(raw.enhancement) &&
    raw.enhancement >= 0 &&
    raw.enhancement <= MAX_ENHANCEMENT_LEVEL
  );
}

function validLegacyInstance(
  value: unknown,
): value is LegacyEquipmentInstance {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    instanceId?: unknown;
    definitionId?: unknown;
  };

  return (
    typeof raw.instanceId === "string" &&
    raw.instanceId.length > 0 &&
    typeof raw.definitionId === "string" &&
    isEquipmentId(raw.definitionId)
  );
}

export function migrateLegacyEquipmentState(
  value: unknown,
): EquipmentState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createStarterEquipmentState();
  }

  const raw = value as {
    items?: unknown;
    loadout?: unknown;
  };

  if (!Array.isArray(raw.items)) {
    return createStarterEquipmentState();
  }

  const items = raw.items
    .filter(validLegacyInstance)
    .map((item) => ({
      ...item,
      grade: "aluminum" as const,
      enhancement: 0,
    }));

  if (items.length === 0) {
    return createStarterEquipmentState();
  }

  return sanitizeEquipmentState({
    items,
    loadout: raw.loadout,
  });
}

export function migrateRarityEquipmentState(
  value: unknown,
): EquipmentState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createStarterEquipmentState();
  }

  const raw = value as {
    items?: unknown;
    loadout?: unknown;
  };

  if (!Array.isArray(raw.items)) {
    return createStarterEquipmentState();
  }

  const items = raw.items
    .filter(validRarityInstance)
    .map((item) => ({
      instanceId: item.instanceId,
      definitionId: item.definitionId,
      grade: legacyRarityToGrade(item.rarity),
      enhancement: 0,
    }));

  if (items.length === 0) {
    return createStarterEquipmentState();
  }

  return sanitizeEquipmentState({
    items,
    loadout: raw.loadout,
  });
}

export function migrateEnhancedRarityEquipmentState(
  value: unknown,
): EquipmentState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createStarterEquipmentState();
  }

  const raw = value as {
    items?: unknown;
    loadout?: unknown;
  };

  if (!Array.isArray(raw.items)) {
    return createStarterEquipmentState();
  }

  const items = raw.items
    .filter(validEnhancedRarityInstance)
    .map((item) => ({
      instanceId: item.instanceId,
      definitionId: item.definitionId,
      grade: legacyRarityToGrade(item.rarity),
      enhancement: item.enhancement,
    }));

  if (items.length === 0) {
    return createStarterEquipmentState();
  }

  return sanitizeEquipmentState({
    items,
    loadout: raw.loadout,
  });
}

export function sanitizeEquipmentState(value: unknown): EquipmentState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createStarterEquipmentState();
  }

  const raw = value as {
    items?: unknown;
    loadout?: unknown;
  };

  const items: EquipmentInstance[] = [];
  const seen = new Set<string>();

  if (Array.isArray(raw.items)) {
    for (const candidate of raw.items) {
      if (seen.has(
        typeof candidate === "object" &&
          candidate !== null &&
          !Array.isArray(candidate) &&
          typeof (candidate as { instanceId?: unknown }).instanceId === "string"
          ? (candidate as { instanceId: string }).instanceId
          : "",
      )) {
        continue;
      }

      if (validInstance(candidate)) {
        seen.add(candidate.instanceId);
        items.push({ ...candidate });
        continue;
      }

      if (validEnhancedRarityInstance(candidate)) {
        seen.add(candidate.instanceId);
        items.push({
          instanceId: candidate.instanceId,
          definitionId: candidate.definitionId,
          grade: legacyRarityToGrade(candidate.rarity),
          enhancement: candidate.enhancement,
        });
      }
    }
  }

  if (items.length === 0) {
    return createStarterEquipmentState();
  }

  const byId = new Map(items.map((item) => [item.instanceId, item]));
  const loadout = emptyLoadout();

  if (
    raw.loadout !== null &&
    typeof raw.loadout === "object" &&
    !Array.isArray(raw.loadout)
  ) {
    const rawLoadout = raw.loadout as Record<string, unknown>;

    for (const slot of EQUIPMENT_SLOTS) {
      const instanceId = rawLoadout[slot];
      if (instanceId === null) {
        loadout[slot] = null;
        continue;
      }
      if (typeof instanceId !== "string") continue;

      const instance = byId.get(instanceId);
      if (
        instance !== undefined &&
        getEquipmentDefinition(instance.definitionId).slot === slot
      ) {
        loadout[slot] = instanceId;
      }
    }
  }

  return { items, loadout };
}

export function isValidLegacyEquipmentState(
  value: unknown,
): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    items?: unknown;
    loadout?: unknown;
  };

  if (!Array.isArray(raw.items)) return false;

  const byId = new Map<string, LegacyEquipmentInstance>();
  for (const candidate of raw.items) {
    if (!validLegacyInstance(candidate) || byId.has(candidate.instanceId)) {
      return false;
    }
    byId.set(candidate.instanceId, candidate);
  }

  if (
    raw.loadout === null ||
    typeof raw.loadout !== "object" ||
    Array.isArray(raw.loadout)
  ) {
    return false;
  }

  const loadout = raw.loadout as Record<string, unknown>;

  for (const slot of EQUIPMENT_SLOTS) {
    const instanceId = loadout[slot];
    if (instanceId === null) continue;
    if (typeof instanceId !== "string") return false;

    const instance = byId.get(instanceId);
    if (
      instance === undefined ||
      getEquipmentDefinition(instance.definitionId).slot !== slot
    ) {
      return false;
    }
  }

  return true;
}

export function isValidRarityEquipmentState(
  value: unknown,
): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    items?: unknown;
    loadout?: unknown;
  };

  if (!Array.isArray(raw.items)) return false;

  const byId = new Map<string, RarityEquipmentInstance>();
  for (const candidate of raw.items) {
    if (!validRarityInstance(candidate) || byId.has(candidate.instanceId)) {
      return false;
    }
    byId.set(candidate.instanceId, candidate);
  }

  if (
    raw.loadout === null ||
    typeof raw.loadout !== "object" ||
    Array.isArray(raw.loadout)
  ) {
    return false;
  }

  const rawLoadout = raw.loadout as Record<string, unknown>;

  for (const slot of EQUIPMENT_SLOTS) {
    const instanceId = rawLoadout[slot];
    if (instanceId === null) continue;
    if (typeof instanceId !== "string") return false;

    const instance = byId.get(instanceId);
    if (
      instance === undefined ||
      getEquipmentDefinition(instance.definitionId).slot !== slot
    ) {
      return false;
    }
  }

  return true;
}

export function isValidEnhancedRarityEquipmentState(
  value: unknown,
): value is LegacyEnhancedRarityEquipmentState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    items?: unknown;
    loadout?: unknown;
  };

  if (!Array.isArray(raw.items)) return false;

  const byId = new Map<string, LegacyEnhancedRarityEquipmentInstance>();
  for (const candidate of raw.items) {
    if (
      !validEnhancedRarityInstance(candidate) ||
      byId.has(candidate.instanceId)
    ) {
      return false;
    }
    byId.set(candidate.instanceId, candidate);
  }

  if (
    raw.loadout === null ||
    typeof raw.loadout !== "object" ||
    Array.isArray(raw.loadout)
  ) {
    return false;
  }

  const loadout = raw.loadout as Record<string, unknown>;

  for (const slot of EQUIPMENT_SLOTS) {
    const instanceId = loadout[slot];
    if (instanceId === null) continue;
    if (typeof instanceId !== "string") return false;

    const instance = byId.get(instanceId);
    if (
      instance === undefined ||
      getEquipmentDefinition(instance.definitionId).slot !== slot
    ) {
      return false;
    }
  }

  return true;
}

export function isValidEquipmentState(
  value: unknown,
): value is EquipmentState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    items?: unknown;
    loadout?: unknown;
  };

  if (!Array.isArray(raw.items)) return false;

  const byId = new Map<string, EquipmentInstance>();
  for (const candidate of raw.items) {
    if (!validInstance(candidate) || byId.has(candidate.instanceId)) {
      return false;
    }
    byId.set(candidate.instanceId, candidate);
  }

  if (
    raw.loadout === null ||
    typeof raw.loadout !== "object" ||
    Array.isArray(raw.loadout)
  ) {
    return false;
  }

  const loadout = raw.loadout as Record<string, unknown>;

  for (const slot of EQUIPMENT_SLOTS) {
    const instanceId = loadout[slot];
    if (instanceId === null) continue;
    if (typeof instanceId !== "string") return false;

    const instance = byId.get(instanceId);
    if (
      instance === undefined ||
      getEquipmentDefinition(instance.definitionId).slot !== slot
    ) {
      return false;
    }
  }

  return true;
}

export function addEquipmentInstance(
  state: EquipmentState,
  item: EquipmentInstance,
): EquipmentState {
  if (state.items.some((current) => current.instanceId === item.instanceId)) {
    return state;
  }

  return {
    items: [...state.items.map((current) => ({ ...current })), { ...item }],
    loadout: { ...state.loadout },
  };
}

export function equipmentForSlot(
  state: EquipmentState,
  slot: EquipmentSlot,
): EquipmentInstance[] {
  return state.items.filter(
    (item) => getEquipmentDefinition(item.definitionId).slot === slot,
  );
}

export function equipInstance(
  state: EquipmentState,
  instanceId: string,
): EquipmentState {
  const instance = state.items.find(
    (item) => item.instanceId === instanceId,
  );
  if (instance === undefined) return state;

  const slot = getEquipmentDefinition(instance.definitionId).slot;
  return {
    items: state.items.map((item) => ({ ...item })),
    loadout: {
      ...state.loadout,
      [slot]: instanceId,
    },
  };
}

export function enhanceInstance(
  state: EquipmentState,
  instanceId: string,
): { state: EquipmentState; changed: boolean } {
  const current = state.items.find(
    (item) => item.instanceId === instanceId,
  );
  if (
    current === undefined ||
    current.enhancement >= MAX_ENHANCEMENT_LEVEL
  ) {
    return { state, changed: false };
  }

  return {
    state: {
      items: state.items.map((item) =>
        item.instanceId === instanceId
          ? {
              ...item,
              enhancement: sanitizeEnhancementLevel(
                item.enhancement + 1,
              ),
            }
          : { ...item },
      ),
      loadout: { ...state.loadout },
    },
    changed: true,
  };
}

export function unequipSlot(
  state: EquipmentState,
  slot: EquipmentSlot,
): EquipmentState {
  return {
    items: state.items.map((item) => ({ ...item })),
    loadout: {
      ...state.loadout,
      [slot]: null,
    },
  };
}

export function equipmentStatBonus(
  state: EquipmentState,
): StatBonus {
  const totals: Record<string, number> = {};

  for (const slot of EQUIPMENT_SLOTS) {
    const instanceId = state.loadout[slot];
    if (instanceId === null) continue;

    const instance = state.items.find(
      (item) => item.instanceId === instanceId,
    );
    if (instance === undefined) continue;

    const definition = getEquipmentDefinition(instance.definitionId);
    const multiplier =
      gradeStatMultiplier(instance.grade) *
      enhancementStatMultiplier(instance.enhancement);
    for (const [key, value] of Object.entries(definition.stats)) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      totals[key] = (totals[key] ?? 0) + value * multiplier;
    }
  }

  return totals as StatBonus;
}
