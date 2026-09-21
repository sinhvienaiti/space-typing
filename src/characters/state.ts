import {
  CHARACTER_IDS,
  getCharacter,
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


export type CharacterUnlockResult = {
  state: CharacterState;
  unlocked: CharacterId[];
};

export function unlockCharactersForStage(
  state: CharacterState,
  clearedStage: number,
): CharacterUnlockResult {
  const newlyUnlocked = CHARACTER_IDS.filter(
    (id) =>
      getCharacter(id).unlockStage > 1 &&
      getCharacter(id).unlockStage <= clearedStage &&
      !state.unlocked.includes(id),
  );

  if (newlyUnlocked.length === 0) {
    return {
      state,
      unlocked: [],
    };
  }

  const unlocked = CHARACTER_IDS.filter(
    (id) =>
      state.unlocked.includes(id) ||
      newlyUnlocked.includes(id),
  );

  return {
    state: {
      selected: state.selected,
      unlocked,
    },
    unlocked: newlyUnlocked,
  };
}

export function syncCharacterUnlocks(
  state: CharacterState,
  clearedStages: readonly number[],
): CharacterState {
  const highestCleared = clearedStages.reduce(
    (highest, stage) => Math.max(highest, stage),
    0,
  );
  return unlockCharactersForStage(state, highestCleared).state;
}
