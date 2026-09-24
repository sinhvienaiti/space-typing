import type { RecoveryItemId } from "../items/consumables";
import {
  isDefensiveSkillId,
  type DefensiveSkillId,
} from "../skills/defensive";
import {
  isOffensiveSkillId,
  type OffensiveSkillId,
} from "../skills/offensive";
import {
  isSupportSpellId,
  type SupportSpellId,
} from "../skills/support";

export const HOTBAR_SLOT_COUNT = 9;

export type HotbarPlacement = "left" | "right" | "utility";

export function hotbarPlacementForSlot(slotIndex: number): HotbarPlacement {
  const index = Math.max(0, Math.min(HOTBAR_SLOT_COUNT - 1, Math.floor(slotIndex)));
  if (index < 4) return "left";
  if (index < 8) return "right";
  return "utility";
}

export type CoreCombatSkillId = DefensiveSkillId | OffensiveSkillId;

export type HotbarAction =
  | { kind: "item"; id: RecoveryItemId }
  | { kind: "skill"; id: CoreCombatSkillId | SupportSpellId }
  | { kind: "character-skill" };

export type HotbarSlot = HotbarAction | null;

export type HotbarState = {
  version: 1;
  slots: [
    HotbarSlot,
    HotbarSlot,
    HotbarSlot,
    HotbarSlot,
    HotbarSlot,
    HotbarSlot,
    HotbarSlot,
    HotbarSlot,
    HotbarSlot,
  ];
};

function isRecoveryItemId(value: unknown): value is RecoveryItemId {
  return (
    value === "repair-kit" ||
    value === "shield-cell" ||
    value === "energy-cell"
  );
}

export function hotbarActionKey(action: HotbarAction): string {
  if (action.kind === "character-skill") return "character-skill";
  return action.kind + ":" + action.id;
}

export function createDefaultHotbarState(): HotbarState {
  return {
    version: 1,
    slots: [
      { kind: "item", id: "repair-kit" },
      { kind: "item", id: "shield-cell" },
      { kind: "item", id: "energy-cell" },
      { kind: "skill", id: "barrier" },
      { kind: "skill", id: "emergency-repair" },
      { kind: "skill", id: "emp-burst" },
      { kind: "character-skill" },
      null,
      null,
    ],
  };
}

// v25 did not save hotbar data; v26 introduced the original all-eight-skill
// layout. Preserve that migration behavior separately from new v27 starters.
export function createLegacyHotbarState(): HotbarState {
  return {
    version: 1,
    slots: [
      { kind: "item", id: "repair-kit" },
      { kind: "item", id: "shield-cell" },
      { kind: "item", id: "energy-cell" },
      { kind: "skill", id: "barrier" },
      { kind: "skill", id: "reflect-field" },
      { kind: "skill", id: "time-shell" },
      { kind: "skill", id: "emergency-repair" },
      { kind: "skill", id: "guardian-drone" },
      { kind: "skill", id: "emp-burst" },
    ],
  };
}

export function isHotbarAction(value: unknown): value is HotbarAction {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as { kind?: unknown; id?: unknown };
  if (raw.kind === "character-skill") return raw.id === undefined;

  if (raw.kind === "item") {
    return isRecoveryItemId(raw.id);
  }

  if (raw.kind === "skill" && typeof raw.id === "string") {
    return (
      isDefensiveSkillId(raw.id) ||
      isOffensiveSkillId(raw.id) ||
      isSupportSpellId(raw.id)
    );
  }

  return false;
}

export function sanitizeHotbarState(value: unknown): HotbarState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createDefaultHotbarState();
  }

  const raw = value as { version?: unknown; slots?: unknown };
  if (raw.version !== 1 || !Array.isArray(raw.slots)) {
    return createDefaultHotbarState();
  }

  const source = raw.slots;
  const slots = Array.from({ length: HOTBAR_SLOT_COUNT }, (_, index) => {
    const slot = source[index];
    return isHotbarAction(slot) ? { ...slot } : null;
  }) as HotbarState["slots"];

  const seen = new Set<string>();
  for (let index = 0; index < slots.length; index += 1) {
    const action = slots[index];
    if (action == null) continue;
    const key = hotbarActionKey(action);
    if (seen.has(key)) slots[index] = null;
    else seen.add(key);
  }

  return { version: 1, slots };
}

export function isValidHotbarState(value: unknown): value is HotbarState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as { version?: unknown; slots?: unknown };
  if (
    raw.version !== 1 ||
    !Array.isArray(raw.slots) ||
    raw.slots.length !== HOTBAR_SLOT_COUNT
  ) {
    return false;
  }

  const seen = new Set<string>();
  for (const slot of raw.slots) {
    if (slot === null) continue;
    if (!isHotbarAction(slot)) return false;
    const key = hotbarActionKey(slot);
    if (seen.has(key)) return false;
    seen.add(key);
  }

  return true;
}

export function assignHotbarSlot(
  state: HotbarState,
  slotIndex: number,
  action: HotbarSlot,
): HotbarState {
  const safe = sanitizeHotbarState(state);
  const index = Math.max(
    0,
    Math.min(HOTBAR_SLOT_COUNT - 1, Math.floor(slotIndex)),
  );
  const slots = [...safe.slots] as HotbarState["slots"];

  if (action !== null && isHotbarAction(action)) {
    const key = hotbarActionKey(action);
    for (let position = 0; position < slots.length; position += 1) {
      const existing = slots[position];
      if (
        existing != null &&
        hotbarActionKey(existing) === key
      ) {
        slots[position] = null;
      }
    }
    slots[index] = { ...action };
  } else {
    slots[index] = null;
  }

  return { version: 1, slots };
}

export function hotbarSlotForKey(key: string): number | null {
  if (!/^[1-9]$/.test(key)) return null;
  return Number(key) - 1;
}
