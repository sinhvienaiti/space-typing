import {
  CHARACTER_IDS,
  getCharacter,
  isCharacterId,
  type CharacterId,
} from "./registry";
import {
  createStarterCharacterProgress,
  isValidCharacterProgress,
  sanitizeCharacterProgress,
  type CharacterProgress,
} from "./progression";

export type CharacterProgressMap = Record<CharacterId, CharacterProgress>;

export type CharacterState = {
  selected: CharacterId;
  unlocked: CharacterId[];
  progress: CharacterProgressMap;
};

export function createCharacterProgressMap(): CharacterProgressMap {
  const progress = {} as CharacterProgressMap;
  for (const id of CHARACTER_IDS) {
    progress[id] = createStarterCharacterProgress();
  }
  return progress;
}

export function createStarterCharacterState(): CharacterState {
  return {
    selected: "vanguard",
    unlocked: ["vanguard"],
    progress: createCharacterProgressMap(),
  };
}

function sanitizeUnlocked(value: unknown): CharacterId[] {
  const unlocked = Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (id): id is CharacterId =>
              typeof id === "string" && isCharacterId(id),
          ),
        ),
      )
    : [];

  if (!unlocked.includes("vanguard")) {
    unlocked.unshift("vanguard");
  }

  return CHARACTER_IDS.filter((id) => unlocked.includes(id));
}

function sanitizeProgressMap(value: unknown): CharacterProgressMap {
  const source =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<CharacterId, unknown>>)
      : {};
  const progress = {} as CharacterProgressMap;

  for (const id of CHARACTER_IDS) {
    progress[id] = sanitizeCharacterProgress(source[id]);
  }

  return progress;
}

export function sanitizeCharacterState(value: unknown): CharacterState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createStarterCharacterState();
  }

  const raw = value as {
    selected?: unknown;
    unlocked?: unknown;
    progress?: unknown;
  };
  const unlocked = sanitizeUnlocked(raw.unlocked);
  const selected =
    typeof raw.selected === "string" &&
    isCharacterId(raw.selected) &&
    unlocked.includes(raw.selected)
      ? raw.selected
      : "vanguard";

  return {
    selected,
    unlocked,
    progress: sanitizeProgressMap(raw.progress),
  };
}

export function isValidLegacyCharacterState(value: unknown): boolean {
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

export function isValidCharacterState(
  value: unknown,
): value is CharacterState {
  if (!isValidLegacyCharacterState(value)) return false;

  const raw = value as CharacterState;
  if (
    raw.progress === null ||
    typeof raw.progress !== "object" ||
    Array.isArray(raw.progress)
  ) {
    return false;
  }

  const keys = Object.keys(raw.progress);
  if (
    keys.length !== CHARACTER_IDS.length ||
    !CHARACTER_IDS.every((id) => keys.includes(id))
  ) {
    return false;
  }

  return CHARACTER_IDS.every((id) =>
    isValidCharacterProgress(raw.progress[id]),
  );
}

export function selectCharacter(
  state: CharacterState,
  id: CharacterId,
): CharacterState {
  if (!state.unlocked.includes(id)) return state;

  return {
    selected: id,
    unlocked: [...state.unlocked],
    progress: state.progress,
  };
}

export function updateCharacterProgress(
  state: CharacterState,
  id: CharacterId,
  progress: CharacterProgress,
): CharacterState {
  return {
    selected: state.selected,
    unlocked: [...state.unlocked],
    progress: {
      ...state.progress,
      [id]: sanitizeCharacterProgress(progress),
    },
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
      progress: state.progress,
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
