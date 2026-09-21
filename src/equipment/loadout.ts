import {
  EQUIPMENT_SLOTS,
  getEquipmentDefinition,
  isEquipmentId,
  type EquipmentId,
  type EquipmentSlot,
} from "./registry";
import type { StatBonus } from "../stats/core";

export type EquipmentInstance = {
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
    { instanceId: "starter-pulse", definitionId: "pulse-laser-mk1" },
    { instanceId: "starter-precision", definitionId: "precision-laser-mk1" },
    { instanceId: "starter-armor", definitionId: "plated-armor-mk1" },
    { instanceId: "starter-shield", definitionId: "deflector-shield-mk1" },
    { instanceId: "starter-reactor", definitionId: "compact-reactor-mk1" },
    { instanceId: "starter-utility", definitionId: "targeting-module-mk1" },
    { instanceId: "starter-drone", definitionId: "support-drone-mk1" },
    { instanceId: "starter-core", definitionId: "balanced-core-mk1" },
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
  };

  return (
    typeof raw.instanceId === "string" &&
    raw.instanceId.length > 0 &&
    typeof raw.definitionId === "string" &&
    isEquipmentId(raw.definitionId)
  );
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
      if (!validInstance(candidate) || seen.has(candidate.instanceId)) {
        continue;
      }
      seen.add(candidate.instanceId);
      items.push({ ...candidate });
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
    for (const [key, value] of Object.entries(definition.stats)) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      totals[key] = (totals[key] ?? 0) + value;
    }
  }

  return totals as StatBonus;
}
