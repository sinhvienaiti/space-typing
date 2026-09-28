import {
  CHARACTER_IDS,
  isCharacterId,
  type CharacterId,
} from "./registry";
import {
  createStarterCharacterProgress,
  isValidCharacterProgress,
  MAX_CHARACTER_LEVEL,
  MAX_CHARACTER_MASTERY,
  sanitizeCharacterProgress,
  type CharacterProgress,
  xpNeededForLevel,
  xpNeededForMastery,
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

function allCharactersUnlocked(): CharacterId[] {
  return [...CHARACTER_IDS];
}

function withAllCharactersUnlocked(
  state: CharacterState,
): CharacterState {
  if (
    state.unlocked.length === CHARACTER_IDS.length &&
    CHARACTER_IDS.every((id) => state.unlocked.includes(id))
  ) {
    return state;
  }

  return {
    selected: state.selected,
    unlocked: allCharactersUnlocked(),
    progress: state.progress,
  };
}

export function createStarterCharacterState(): CharacterState {
  return {
    selected: "vanguard",
    unlocked: allCharactersUnlocked(),
    progress: createCharacterProgressMap(),
  };
}

function sanitizeUnlocked(_value: unknown): CharacterId[] {
  // Ship choice is no longer gated by Campaign/World progress. Keep the
  // persisted field for save compatibility, but normalize every save to the
  // complete roster so old/imported saves immediately gain full selection.
  return allCharactersUnlocked();
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
    isCharacterId(raw.selected)
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

function isValidPreTalentProgress(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    level?: unknown;
    xp?: unknown;
    mastery?: unknown;
    masteryXp?: unknown;
  };

  if (
    typeof raw.level !== "number" ||
    !Number.isInteger(raw.level) ||
    raw.level < 1 ||
    raw.level > MAX_CHARACTER_LEVEL ||
    typeof raw.xp !== "number" ||
    !Number.isInteger(raw.xp) ||
    raw.xp < 0 ||
    typeof raw.mastery !== "number" ||
    !Number.isInteger(raw.mastery) ||
    raw.mastery < 0 ||
    raw.mastery > MAX_CHARACTER_MASTERY ||
    typeof raw.masteryXp !== "number" ||
    !Number.isInteger(raw.masteryXp) ||
    raw.masteryXp < 0
  ) {
    return false;
  }

  if (
    (raw.level >= MAX_CHARACTER_LEVEL && raw.xp !== 0) ||
    (raw.level < MAX_CHARACTER_LEVEL &&
      raw.xp >= xpNeededForLevel(raw.level))
  ) {
    return false;
  }

  return (
    (raw.mastery >= MAX_CHARACTER_MASTERY && raw.masteryXp === 0) ||
    (raw.mastery < MAX_CHARACTER_MASTERY &&
      raw.masteryXp < xpNeededForMastery(raw.mastery))
  );
}

export function isValidPreTalentCharacterState(value: unknown): boolean {
  if (!isValidLegacyCharacterState(value)) return false;

  const raw = value as { progress?: unknown };
  if (
    raw.progress === null ||
    typeof raw.progress !== "object" ||
    Array.isArray(raw.progress)
  ) {
    return false;
  }

  const progress = raw.progress as Partial<Record<CharacterId, unknown>>;
  const keys = Object.keys(progress);
  if (
    keys.length !== CHARACTER_IDS.length ||
    !CHARACTER_IDS.every((id) => keys.includes(id))
  ) {
    return false;
  }

  return CHARACTER_IDS.every((id) =>
    isValidPreTalentProgress(progress[id]),
  );
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
  return {
    selected: id,
    unlocked: allCharactersUnlocked(),
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
  _clearedStage: number,
): CharacterUnlockResult {
  // Character/ship availability is intentionally independent of Campaign
  // progress. Preserve the old API so stage-clear/save code does not need a
  // special path, but do not emit milestone unlock notifications anymore.
  return {
    state: withAllCharactersUnlocked(state),
    unlocked: [],
  };
}

export function syncCharacterUnlocks(
  state: CharacterState,
  _clearedStages: readonly number[],
): CharacterState {
  return withAllCharactersUnlocked(state);
}
