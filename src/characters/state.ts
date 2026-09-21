import {
  CHARACTER_IDS,
  isCharacterId,
  type CharacterId,
} from "./registry";

export type CharacterState = {
  selected: CharacterId;
  unlocked: CharacterId[];
};

export function createStarterCharacterState(): CharacterState {
  return {
    selected: "vanguard",
    unlocked: ["vanguard"],
  };
}

export function sanitizeCharacterState(value: unknown): CharacterState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createStarterCharacterState();
  }

  const raw = value as {
    selected?: unknown;
    unlocked?: unknown;
  };

  const unlocked = Array.isArray(raw.unlocked)
    ? Array.from(
        new Set(
          raw.unlocked.filter(
            (id): id is CharacterId =>
              typeof id === "string" && isCharacterId(id),
          ),
        ),
      )
    : [];

  if (!unlocked.includes("vanguard")) {
    unlocked.unshift("vanguard");
  }

  const selected =
    typeof raw.selected === "string" &&
    isCharacterId(raw.selected) &&
    unlocked.includes(raw.selected)
      ? raw.selected
      : "vanguard";

  return {
    selected,
    unlocked: CHARACTER_IDS.filter((id) => unlocked.includes(id)),
  };
}

export function isValidCharacterState(
  value: unknown,
): value is CharacterState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    selected?: unknown;
    unlocked?: unknown;
  };

  if (
    typeof raw.selected !== "string" ||
    !isCharacterId(raw.selected) ||
    !Array.isArray(raw.unlocked)
  ) {
    return false;
  }

  const seen = new Set<CharacterId>();
  for (const id of raw.unlocked) {
    if (
      typeof id !== "string" ||
      !isCharacterId(id) ||
      seen.has(id)
    ) {
      return false;
    }
    seen.add(id);
  }

  return seen.has("vanguard") && seen.has(raw.selected);
}

export function selectCharacter(
  state: CharacterState,
  id: CharacterId,
): CharacterState {
  if (!state.unlocked.includes(id)) return state;

  return {
    selected: id,
    unlocked: [...state.unlocked],
  };
}
