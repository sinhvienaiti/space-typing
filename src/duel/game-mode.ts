export const DUEL_GAME_MODES = [
  "standard",
  "reflex",
  "word-chain",
] as const;

export type DuelGameMode = (typeof DUEL_GAME_MODES)[number];

export const DUEL_MATCH_CHANNELS = [
  "friend",
  "practice",
  "ranked",
] as const;

export type DuelMatchChannel = (typeof DUEL_MATCH_CHANNELS)[number];

export type DuelModeEpoch = number;

export type DuelGameModePolicy = Readonly<{
  usesSharedBattlefield: true;
  inputBoundary: "standard-intent" | "mode-input";
  standardActionOffers: boolean;
  challengeFamily: "none" | "reflex" | "word-chain";
  rankedEnabled: boolean;
}>;

const GAME_MODE_POLICY: Readonly<Record<DuelGameMode, DuelGameModePolicy>> = {
  standard: {
    usesSharedBattlefield: true,
    inputBoundary: "standard-intent",
    standardActionOffers: true,
    challengeFamily: "none",
    rankedEnabled: true,
  },
  reflex: {
    usesSharedBattlefield: true,
    inputBoundary: "mode-input",
    standardActionOffers: false,
    challengeFamily: "reflex",
    rankedEnabled: false,
  },
  "word-chain": {
    usesSharedBattlefield: true,
    inputBoundary: "mode-input",
    standardActionOffers: false,
    challengeFamily: "word-chain",
    rankedEnabled: false,
  },
};

export function isDuelGameMode(value: unknown): value is DuelGameMode {
  return typeof value === "string" &&
    (DUEL_GAME_MODES as readonly string[]).includes(value);
}

export function duelGameModePolicy(mode: DuelGameMode): DuelGameModePolicy {
  return GAME_MODE_POLICY[mode];
}

export function isAlternativeDuelGameMode(
  mode: DuelGameMode,
): mode is Exclude<DuelGameMode, "standard"> {
  return mode !== "standard";
}

export function duelGameModeAllowedInChannel(
  mode: DuelGameMode,
  channel: DuelMatchChannel,
): boolean {
  return channel !== "ranked" || duelGameModePolicy(mode).rankedEnabled;
}

export function nextDuelModeEpoch(current: DuelModeEpoch): DuelModeEpoch {
  if (!Number.isSafeInteger(current) || current < 0) return 1;
  return current >= Number.MAX_SAFE_INTEGER ? 1 : current + 1;
}

export type DuelModeInputEnvelope = Readonly<{
  gameMode: DuelGameMode;
  modeEpoch: DuelModeEpoch;
  inputId: string;
  clientSequence: number;
  kind: "standard-intent" | "mode-input";
  payload: unknown;
}>;

export type DuelModeInputParseResult =
  | { ok: true; value: DuelModeInputEnvelope }
  | { ok: false; reason: "schema" | "mode-kind-mismatch" };

type JsonObject = Record<string, unknown>;

const INPUT_KEYS = [
  "gameMode",
  "modeEpoch",
  "inputId",
  "clientSequence",
  "kind",
  "payload",
] as const;

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function hasExactKeys(value: JsonObject): boolean {
  const allowed = new Set<string>(INPUT_KEYS);
  const keys = Object.keys(value);
  return INPUT_KEYS.every((key) => key in value) &&
    keys.every((key) => allowed.has(key));
}

export function parseDuelModeInputEnvelope(
  raw: unknown,
): DuelModeInputParseResult {
  const value = asObject(raw);
  if (value === null || !hasExactKeys(value)) {
    return { ok: false, reason: "schema" };
  }

  if (
    !isDuelGameMode(value.gameMode) ||
    !Number.isSafeInteger(value.modeEpoch) ||
    (value.modeEpoch as number) <= 0 ||
    typeof value.inputId !== "string" ||
    value.inputId.length === 0 ||
    value.inputId.length > 96 ||
    !Number.isSafeInteger(value.clientSequence) ||
    (value.clientSequence as number) < 0 ||
    (value.kind !== "standard-intent" && value.kind !== "mode-input")
  ) {
    return { ok: false, reason: "schema" };
  }

  const gameMode = value.gameMode;
  const policy = duelGameModePolicy(gameMode);
  if (value.kind !== policy.inputBoundary) {
    return { ok: false, reason: "mode-kind-mismatch" };
  }

  return {
    ok: true,
    value: {
      gameMode,
      modeEpoch: value.modeEpoch as number,
      inputId: value.inputId,
      clientSequence: value.clientSequence as number,
      kind: value.kind,
      payload: value.payload,
    },
  };
}
