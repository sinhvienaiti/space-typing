import {
  SUPPORT_SPELL_IDS,
  isSupportSpellId,
  type SupportSpellId,
} from "./support";

export const SUPPORT_SPELL_SLOT_COUNT = 2;

export type SupportSpellState = {
  unlocked: SupportSpellId[];
  loadout: [SupportSpellId | null, SupportSpellId | null];
};

export function createStarterSupportSpellState(): SupportSpellState {
  return {
    unlocked: [...SUPPORT_SPELL_IDS],
    loadout: ["sanctuary", "gravity-well"],
  };
}

export function sanitizeSupportSpellState(
  value: unknown,
): SupportSpellState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createStarterSupportSpellState();
  }

  const raw = value as {
    unlocked?: unknown;
    loadout?: unknown;
  };

  const unlocked = Array.isArray(raw.unlocked)
    ? Array.from(
        new Set(
          raw.unlocked.filter(
            (id): id is SupportSpellId =>
              typeof id === "string" && isSupportSpellId(id),
          ),
        ),
      )
    : [];

  if (unlocked.length === 0) {
    return createStarterSupportSpellState();
  }

  const loadout: [SupportSpellId | null, SupportSpellId | null] = [
    null,
    null,
  ];
  const seen = new Set<SupportSpellId>();

  if (Array.isArray(raw.loadout)) {
    for (let index = 0; index < SUPPORT_SPELL_SLOT_COUNT; index += 1) {
      const id = raw.loadout[index];
      if (
        typeof id === "string" &&
        isSupportSpellId(id) &&
        unlocked.includes(id) &&
        !seen.has(id)
      ) {
        loadout[index] = id;
        seen.add(id);
      }
    }
  }

  return {
    unlocked,
    loadout,
  };
}

export function isValidSupportSpellState(
  value: unknown,
): value is SupportSpellState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    unlocked?: unknown;
    loadout?: unknown;
  };

  if (
    !Array.isArray(raw.unlocked) ||
    !Array.isArray(raw.loadout) ||
    raw.loadout.length !== SUPPORT_SPELL_SLOT_COUNT
  ) {
    return false;
  }

  const unlocked = new Set<SupportSpellId>();
  for (const id of raw.unlocked) {
    if (
      typeof id !== "string" ||
      !isSupportSpellId(id) ||
      unlocked.has(id)
    ) {
      return false;
    }
    unlocked.add(id);
  }

  const equipped = new Set<SupportSpellId>();
  for (const id of raw.loadout) {
    if (id === null) continue;
    if (
      typeof id !== "string" ||
      !isSupportSpellId(id) ||
      !unlocked.has(id) ||
      equipped.has(id)
    ) {
      return false;
    }
    equipped.add(id);
  }

  return true;
}

export function equipSupportSpell(
  state: SupportSpellState,
  slot: 0 | 1,
  id: SupportSpellId | null,
): SupportSpellState {
  if (id !== null && !state.unlocked.includes(id)) {
    return state;
  }

  const loadout: [SupportSpellId | null, SupportSpellId | null] = [
    state.loadout[0],
    state.loadout[1],
  ];

  if (id !== null) {
    const otherSlot = slot === 0 ? 1 : 0;
    if (loadout[otherSlot] === id) {
      loadout[otherSlot] = null;
    }
  }

  loadout[slot] = id;

  return {
    unlocked: [...state.unlocked],
    loadout,
  };
}
