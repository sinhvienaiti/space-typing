import { stageSeed } from "../campaign/stage";
import { clamp } from "../logic";
import {
  createHiddenEncounterState,
  isValidHiddenEncounterState,
  sanitizeHiddenEncounterState,
  type HiddenEncounterState,
} from "./hidden-encounter";

export const HIDDEN_CONTENT_IDS = [
  "black-market-signal",
  "hidden-station-signal",
  "echo-rift",
  "void-warden",
  "phase-lance",
  "relic-cannon",
  "ghost-contract",
] as const;

export type HiddenContentId = (typeof HIDDEN_CONTENT_IDS)[number];
export type HiddenContentKind =
  | "shop"
  | "station"
  | "event"
  | "boss"
  | "skill"
  | "weapon"
  | "mission";

export type HiddenUnlock = {
  type: HiddenContentKind;
  id: string;
  label: string;
};

export type HiddenContentDefinition = {
  id: HiddenContentId;
  kind: HiddenContentKind;
  name: string;
  description: string;
  unlock: HiddenUnlock;
  minStage: number;
  baseChance: number;
  maxChance: number;
  guaranteeAfter: number;
};

export const HIDDEN_CONTENT_REGISTRY: Record<
  HiddenContentId,
  HiddenContentDefinition
> = {
  "black-market-signal": {
    id: "black-market-signal",
    kind: "shop",
    name: "Black Market Signal",
    description:
      "A masked merchant route has been decoded from deep-space traffic.",
    unlock: {
      type: "shop",
      id: "black-market",
      label: "Hidden Shop route",
    },
    minStage: 25,
    baseChance: 0.012,
    maxChance: 0.1,
    guaranteeAfter: 26,
  },
  "hidden-station-signal": {
    id: "hidden-station-signal",
    kind: "station",
    name: "Hidden Station Signal",
    description:
      "A low-power navigation beacon reveals a concealed rest station outside the numbered route.",
    unlock: {
      type: "station",
      id: "hidden-station",
      label: "Hidden Station route",
    },
    minStage: 40,
    baseChance: 0.01,
    maxChance: 0.085,
    guaranteeAfter: 28,
  },
  "echo-rift": {
    id: "echo-rift",
    kind: "event",
    name: "Echo Rift",
    description:
      "A distorted navigation echo points to an off-route encounter.",
    unlock: {
      type: "event",
      id: "echo-rift",
      label: "Hidden Stage/Event route",
    },
    minStage: 35,
    baseChance: 0.014,
    maxChance: 0.11,
    guaranteeAfter: 24,
  },
  "void-warden": {
    id: "void-warden",
    kind: "boss",
    name: "Void Warden",
    description:
      "Encrypted combat telemetry reveals a boss outside the normal Campaign route.",
    unlock: {
      type: "boss",
      id: "void-warden",
      label: "Hidden Boss trigger",
    },
    minStage: 75,
    baseChance: 0.008,
    maxChance: 0.07,
    guaranteeAfter: 32,
  },
  "phase-lance": {
    id: "phase-lance",
    kind: "skill",
    name: "Phase Lance",
    description:
      "A sealed combat routine has been recovered for a future skill unlock.",
    unlock: {
      type: "skill",
      id: "phase-lance",
      label: "Hidden Skill unlock",
    },
    minStage: 45,
    baseChance: 0.011,
    maxChance: 0.09,
    guaranteeAfter: 26,
  },
  "relic-cannon": {
    id: "relic-cannon",
    kind: "weapon",
    name: "Relic Cannon",
    description:
      "A lost weapon signature has been added to the recovery registry.",
    unlock: {
      type: "weapon",
      id: "relic-cannon",
      label: "Hidden Weapon unlock",
    },
    minStage: 55,
    baseChance: 0.01,
    maxChance: 0.085,
    guaranteeAfter: 28,
  },
  "ghost-contract": {
    id: "ghost-contract",
    kind: "mission",
    name: "Ghost Contract",
    description:
      "An anonymous mission packet has been accepted into the mission registry.",
    unlock: {
      type: "mission",
      id: "ghost-contract",
      label: "Hidden Mission unlock",
    },
    minStage: 30,
    baseChance: 0.014,
    maxChance: 0.11,
    guaranteeAfter: 22,
  },
};

export type HiddenDiscoveryState = {
  discovered: HiddenContentId[];
  discoveryStages: Partial<Record<HiddenContentId, number>>;
  drought: Record<HiddenContentId, number>;
  seedIdentity: string;
  lastRollStage: number;
  lastRollIdentity: string | null;
  encounter?: HiddenEncounterState;
};

export type HiddenDiscoveryRoll = {
  state: HiddenDiscoveryState;
  discovery: HiddenContentDefinition | null;
  rolled: boolean;
};

export type HiddenCodexEntry = {
  id: HiddenContentId;
  kind: HiddenContentKind;
  discovered: boolean;
  title: string;
  description: string;
  reward: string;
};

function createDroughtState(): Record<HiddenContentId, number> {
  return Object.fromEntries(
    HIDDEN_CONTENT_IDS.map((id) => [id, 0]),
  ) as Record<HiddenContentId, number>;
}

function randomSeedIdentity(): string {
  if (typeof window === "undefined") {
    return "campaign-headless-simulation";
  }

  const cryptoSource = globalThis.crypto;
  if (cryptoSource !== undefined && typeof cryptoSource.randomUUID === "function") {
    return `campaign-${cryptoSource.randomUUID()}`;
  }

  return `campaign-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function isSeedIdentity(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 96
  );
}

function legacySeedIdentity(state: Pick<
  HiddenDiscoveryState,
  "discovered" | "drought" | "lastRollStage"
>): string {
  let hash = (stageSeed(Math.max(1, state.lastRollStage)) ^ 0x4c454741) >>> 0;
  for (let index = 0; index < HIDDEN_CONTENT_IDS.length; index += 1) {
    const id = HIDDEN_CONTENT_IDS[index]!;
    const discovered = state.discovered.includes(id) ? 1 : 0;
    hash ^= Math.imul(
      (index + 1) * 131 + discovered * 17 + state.drought[id],
      0x45d9f3b,
    );
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  }
  return `legacy-${hash.toString(16).padStart(8, "0")}`;
}

export function hiddenDiscoveryRollIdentity(
  seedIdentity: string,
  stage: number,
): string {
  return `${seedIdentity}:stage-${Math.floor(clamp(stage, 1, 1000))}`;
}

export function createHiddenDiscoveryState(
  seedIdentity = randomSeedIdentity(),
): HiddenDiscoveryState {
  return {
    discovered: [],
    discoveryStages: {},
    drought: createDroughtState(),
    seedIdentity,
    lastRollStage: 0,
    lastRollIdentity: null,
    encounter: createHiddenEncounterState(),
  };
}

export function sanitizeHiddenDiscoveryState(
  value: unknown,
): HiddenDiscoveryState {
  const result = createHiddenDiscoveryState();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  const raw = value as {
    discovered?: unknown;
    discoveryStages?: unknown;
    drought?: unknown;
    seedIdentity?: unknown;
    lastRollStage?: unknown;
    lastRollIdentity?: unknown;
    encounter?: unknown;
  };

  if (Array.isArray(raw.discovered)) {
    const seen = new Set<HiddenContentId>();
    for (const id of raw.discovered) {
      if (
        typeof id === "string" &&
        HIDDEN_CONTENT_IDS.includes(id as HiddenContentId)
      ) {
        seen.add(id as HiddenContentId);
      }
    }
    result.discovered = HIDDEN_CONTENT_IDS.filter((id) => seen.has(id));
  }

  if (
    raw.drought !== null &&
    typeof raw.drought === "object" &&
    !Array.isArray(raw.drought)
  ) {
    const drought = raw.drought as Partial<Record<HiddenContentId, unknown>>;
    for (const id of HIDDEN_CONTENT_IDS) {
      const value = drought[id];
      if (typeof value === "number" && Number.isFinite(value)) {
        result.drought[id] = Math.floor(clamp(value, 0, 60));
      }
    }
  }

  if (
    typeof raw.lastRollStage === "number" &&
    Number.isFinite(raw.lastRollStage)
  ) {
    result.lastRollStage = Math.floor(clamp(raw.lastRollStage, 0, 1000));
  }

  result.seedIdentity = isSeedIdentity(raw.seedIdentity)
    ? raw.seedIdentity.trim()
    : legacySeedIdentity(result);
  result.lastRollIdentity =
    result.lastRollStage > 0
      ? hiddenDiscoveryRollIdentity(result.seedIdentity, result.lastRollStage)
      : null;

  const rawDiscoveryStages =
    raw.discoveryStages !== null &&
    typeof raw.discoveryStages === "object" &&
    !Array.isArray(raw.discoveryStages)
      ? (raw.discoveryStages as Partial<Record<HiddenContentId, unknown>>)
      : {};
  const discoveryStages: Partial<Record<HiddenContentId, number>> = {};
  for (const id of result.discovered) {
    const definition = HIDDEN_CONTENT_REGISTRY[id];
    const value = rawDiscoveryStages[id];
    discoveryStages[id] =
      typeof value === "number" && Number.isFinite(value)
        ? Math.floor(clamp(value, definition.minStage, 1000))
        : definition.minStage;
  }
  result.discoveryStages = discoveryStages;

  result.encounter = sanitizeHiddenEncounterState(raw.encounter);
  return result;
}

export function isValidHiddenDiscoveryState(
  value: unknown,
): value is HiddenDiscoveryState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as HiddenDiscoveryState;
  if (
    !Array.isArray(raw.discovered) ||
    new Set(raw.discovered).size !== raw.discovered.length ||
    !raw.discovered.every((id) => HIDDEN_CONTENT_IDS.includes(id))
  ) {
    return false;
  }

  if (
    raw.drought === null ||
    typeof raw.drought !== "object" ||
    Array.isArray(raw.drought)
  ) {
    return false;
  }

  const droughtKeys = Object.keys(raw.drought);
  if (
    droughtKeys.length !== HIDDEN_CONTENT_IDS.length ||
    !HIDDEN_CONTENT_IDS.every((id) => droughtKeys.includes(id))
  ) {
    return false;
  }

  if (
    !HIDDEN_CONTENT_IDS.every(
      (id) =>
        Number.isInteger(raw.drought[id]) &&
        raw.drought[id] >= 0 &&
        raw.drought[id] <= 60,
    )
  ) {
    return false;
  }

  if (
    raw.discoveryStages === null ||
    typeof raw.discoveryStages !== "object" ||
    Array.isArray(raw.discoveryStages)
  ) {
    return false;
  }

  const discoveryStageKeys = Object.keys(raw.discoveryStages);
  if (
    discoveryStageKeys.length !== raw.discovered.length ||
    !raw.discovered.every((id) => {
      const stage = raw.discoveryStages[id];
      return (
        discoveryStageKeys.includes(id) &&
        typeof stage === "number" &&
        Number.isInteger(stage) &&
        stage >= HIDDEN_CONTENT_REGISTRY[id].minStage &&
        stage <= 1000
      );
    })
  ) {
    return false;
  }

  if (!isSeedIdentity(raw.seedIdentity)) {
    return false;
  }

  const validRollIdentity =
    raw.lastRollStage === 0
      ? raw.lastRollIdentity === null
      : raw.lastRollIdentity ===
        hiddenDiscoveryRollIdentity(raw.seedIdentity, raw.lastRollStage);

  return (
    Number.isInteger(raw.lastRollStage) &&
    raw.lastRollStage >= 0 &&
    raw.lastRollStage <= 1000 &&
    validRollIdentity &&
    (raw.encounter === undefined ||
      isValidHiddenEncounterState(raw.encounter))
  );
}

export function hiddenDiscoveryChance(
  definition: HiddenContentDefinition,
  luck: number,
  drought: number,
): number {
  const safeLuck = clamp(luck, 0, 100);
  const safeDrought = Math.floor(clamp(drought, 0, 60));
  const luckMultiplier = 1 + safeLuck * 0.008;
  const droughtBonus = definition.baseChance * safeDrought * 0.11;

  return clamp(
    definition.baseChance * luckMultiplier + droughtBonus,
    definition.baseChance,
    definition.maxChance,
  );
}

function hashSeedIdentity(seedIdentity: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seedIdentity.length; index += 1) {
    hash ^= seedIdentity.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function hiddenDiscoveryRandom(
  seedIdentity: string,
  stage: number,
): () => number {
  let value = (
    stageSeed(stage) ^
    hashSeedIdentity(seedIdentity) ^
    0x48494444
  ) >>> 0;

  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 0x100000000;
  };
}

export function rollDeterministicHiddenDiscovery(
  input: HiddenDiscoveryState,
  stage: number,
  luck: number,
): HiddenDiscoveryRoll {
  const state = sanitizeHiddenDiscoveryState(input);
  const safeStage = Math.floor(clamp(stage, 1, 1000));
  return rollHiddenDiscovery(
    state,
    safeStage,
    luck,
    hiddenDiscoveryRandom(state.seedIdentity, safeStage),
  );
}

export function rollHiddenDiscovery(
  input: HiddenDiscoveryState,
  stage: number,
  luck: number,
  random?: () => number,
): HiddenDiscoveryRoll {
  const state = sanitizeHiddenDiscoveryState(input);
  const safeStage = Math.floor(clamp(stage, 1, 1000));
  const randomSource =
    random ?? hiddenDiscoveryRandom(state.seedIdentity, safeStage);

  if (safeStage <= state.lastRollStage) {
    return { state, discovery: null, rolled: false };
  }

  const discovered = new Set(state.discovered);
  const eligible = HIDDEN_CONTENT_IDS
    .map((id) => HIDDEN_CONTENT_REGISTRY[id])
    .filter(
      (definition) =>
        !discovered.has(definition.id) &&
        safeStage >= definition.minStage,
    );

  const drought = { ...state.drought };
  let discovery: HiddenContentDefinition | null = null;

  const guaranteed = eligible
    .filter(
      (definition) =>
        drought[definition.id] >= definition.guaranteeAfter,
    )
    .sort(
      (left, right) =>
        drought[right.id] / right.guaranteeAfter -
        drought[left.id] / left.guaranteeAfter,
    )[0];

  if (guaranteed !== undefined) {
    discovery = guaranteed;
  } else {
    for (const definition of eligible) {
      if (
        clamp(randomSource(), 0, 0.999999) <
        hiddenDiscoveryChance(
          definition,
          luck,
          drought[definition.id],
        )
      ) {
        discovery = definition;
        break;
      }
    }
  }

  for (const definition of eligible) {
    drought[definition.id] =
      definition.id === discovery?.id
        ? 0
        : Math.min(60, drought[definition.id] + 1);
  }

  const nextDiscovered =
    discovery === null
      ? state.discovered
      : HIDDEN_CONTENT_IDS.filter(
          (id) => discovered.has(id) || id === discovery?.id,
        );
  const discoveryStages = { ...state.discoveryStages };
  if (discovery !== null) {
    discoveryStages[discovery.id] = safeStage;
  }

  return {
    state: {
      discovered: nextDiscovered,
      discoveryStages,
      drought,
      seedIdentity: state.seedIdentity,
      lastRollStage: safeStage,
      lastRollIdentity: hiddenDiscoveryRollIdentity(
        state.seedIdentity,
        safeStage,
      ),
      encounter: state.encounter,
    },
    discovery,
    rolled: true,
  };
}

export function hiddenCodexEntries(
  input: HiddenDiscoveryState,
): HiddenCodexEntry[] {
  const state = sanitizeHiddenDiscoveryState(input);
  const discovered = new Set(state.discovered);

  return HIDDEN_CONTENT_IDS.map((id) => {
    const definition = HIDDEN_CONTENT_REGISTRY[id];
    const revealed = discovered.has(id);

    return {
      id,
      kind: definition.kind,
      discovered: revealed,
      title: revealed ? definition.name : "???",
      description: revealed
        ? definition.description
        : "Undiscovered signal. Continue Campaign progression to reveal it.",
      reward: revealed ? definition.unlock.label : "???",
    };
  });
}
