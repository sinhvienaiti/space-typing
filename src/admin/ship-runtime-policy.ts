export type ShipRuntimeDefinitionOverride = Partial<{
  name: string;
  unlockStage: number;
  role: string;
  summary: string;
  passiveName: string;
  activeName: string;
  ultimateName: string;
}>;

export type ShipRuntimeStatKey =
  | "hull"
  | "shield"
  | "firepower"
  | "armor"
  | "energy"
  | "reactor"
  | "focus"
  | "ward"
  | "luck"
  | "salvage";

export type ShipRuntimeStatOverride = Partial<Record<ShipRuntimeStatKey, number>>;

export type ShipRuntimeVisualOverride = Partial<{
  silhouette: "spear" | "fortress" | "arc" | "phantom" | "crown" | "blade";
  primary: string;
  secondary: string;
  accent: string;
  core: string;
  engine: string;
  glow: string;
  wingSpan: number;
  bodyLength: number;
  engineCount: 1 | 2 | 3;
}>;

export type ShipRuntimeOverride = ShipRuntimeDefinitionOverride & {
  statBonus?: ShipRuntimeStatOverride;
  visual?: ShipRuntimeVisualOverride;
};

export type ShipRuntimeSession = Readonly<{
  source: "bundled" | "published";
  activeRevision: string | null;
  configRevision: string;
  ships: Readonly<Record<string, Readonly<ShipRuntimeOverride>>>;
}>;

const RUNTIME_ENDPOINT = "/api/runtime/space-typing/ships";
const APPLY_BOUNDARY = "new-session";
const SHIP_IDS = new Set([
  "vanguard",
  "aegis",
  "volt",
  "wraith",
  "fortune",
  "arsenal",
  "oracle",
  "bastion",
  "reaper",
  "celestial",
  "zenith",
]);
const DEFINITION_KEYS = new Set([
  "name",
  "unlockStage",
  "role",
  "summary",
  "passiveName",
  "activeName",
  "ultimateName",
  "statBonus",
  "visual",
]);
const TEXT_LIMITS = {
  name: 80,
  role: 100,
  summary: 240,
  passiveName: 100,
  activeName: 100,
  ultimateName: 100,
} as const;
const CORE_STAT_KEYS = new Set<ShipRuntimeStatKey>([
  "hull",
  "shield",
  "firepower",
  "armor",
  "energy",
  "reactor",
  "focus",
  "ward",
  "luck",
  "salvage",
]);
const VISUAL_KEYS = new Set([
  "silhouette",
  "primary",
  "secondary",
  "accent",
  "core",
  "engine",
  "glow",
  "wingSpan",
  "bodyLength",
  "engineCount",
]);
const COLOR_KEYS = ["primary", "secondary", "accent", "core", "engine", "glow"] as const;
const SILHOUETTES = new Set([
  "spear",
  "fortress",
  "arc",
  "phantom",
  "crown",
  "blade",
]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function sanitizeShipOverride(value: unknown): Readonly<ShipRuntimeOverride> | null {
  const input = object(value);
  if (input === null || Object.keys(input).some((key) => !DEFINITION_KEYS.has(key))) {
    return null;
  }

  const definition: Record<string, unknown> = {};
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    const raw = input[key];
    if (raw === undefined) continue;
    if (!validText(raw, max)) return null;
    definition[key] = raw;
  }

  if (input.unlockStage !== undefined) {
    if (!Number.isInteger(input.unlockStage) || !validNumber(input.unlockStage, 1, 1000)) {
      return null;
    }
    definition.unlockStage = input.unlockStage;
  }

  let statBonus: ShipRuntimeStatOverride | undefined;
  if (input.statBonus !== undefined) {
    const stats = object(input.statBonus);
    if (stats === null) return null;
    const sanitized: Partial<Record<ShipRuntimeStatKey, number>> = {};
    for (const [key, raw] of Object.entries(stats)) {
      if (!CORE_STAT_KEYS.has(key as ShipRuntimeStatKey) || !validNumber(raw, -100, 100)) {
        return null;
      }
      sanitized[key as ShipRuntimeStatKey] = raw;
    }
    statBonus = Object.freeze(sanitized);
  }

  let visual: ShipRuntimeVisualOverride | undefined;
  if (input.visual !== undefined) {
    const rawVisual = object(input.visual);
    if (rawVisual === null || Object.keys(rawVisual).some((key) => !VISUAL_KEYS.has(key))) {
      return null;
    }
    const sanitized: Record<string, unknown> = {};

    if (rawVisual.silhouette !== undefined) {
      if (typeof rawVisual.silhouette !== "string" || !SILHOUETTES.has(rawVisual.silhouette)) {
        return null;
      }
      sanitized.silhouette = rawVisual.silhouette;
    }

    for (const key of COLOR_KEYS) {
      const raw = rawVisual[key];
      if (raw === undefined) continue;
      if (!validText(raw, 32)) return null;
      sanitized[key] = raw;
    }

    for (const key of ["wingSpan", "bodyLength"] as const) {
      const raw = rawVisual[key];
      if (raw === undefined) continue;
      if (!validNumber(raw, 0.5, 2)) return null;
      sanitized[key] = raw;
    }

    if (rawVisual.engineCount !== undefined) {
      if (![1, 2, 3].includes(rawVisual.engineCount as number)) return null;
      sanitized.engineCount = rawVisual.engineCount;
    }

    visual = Object.freeze(sanitized) as ShipRuntimeVisualOverride;
  }

  return Object.freeze({
    ...(definition as ShipRuntimeDefinitionOverride),
    ...(statBonus === undefined ? {} : { statBonus }),
    ...(visual === undefined ? {} : { visual }),
  });
}

function bundledSession(activeRevision: string | null = null): ShipRuntimeSession {
  return Object.freeze({
    source: "bundled" as const,
    activeRevision,
    configRevision: "bundled-character-registry",
    ships: Object.freeze({}),
  });
}

export function materializeShipRuntimeSession(envelope: unknown): ShipRuntimeSession {
  const runtime = object(envelope);
  if (runtime === null || runtime.applyBoundary !== APPLY_BOUNDARY) {
    return bundledSession();
  }

  const activeRevision =
    typeof runtime.activeRevision === "string" && runtime.activeRevision.length > 0
      ? runtime.activeRevision
      : null;
  if (runtime.policy === undefined || runtime.policy === null) {
    return bundledSession(activeRevision);
  }

  const policy = object(runtime.policy);
  if (policy === null) return bundledSession(activeRevision);
  if (Object.keys(policy).some((key) => key !== "configRevision" && key !== "ships")) {
    return bundledSession(activeRevision);
  }
  if (!validText(policy.configRevision, 120)) return bundledSession(activeRevision);
  if (policy.ships === undefined) return bundledSession(activeRevision);

  const rawShips = object(policy.ships);
  if (rawShips === null) return bundledSession(activeRevision);

  const ships: Record<string, Readonly<ShipRuntimeOverride>> = {};
  for (const [id, rawOverride] of Object.entries(rawShips)) {
    if (!SHIP_IDS.has(id)) continue;
    const override = sanitizeShipOverride(rawOverride);
    if (override !== null) ships[id] = override;
  }

  return Object.freeze({
    source: "published" as const,
    activeRevision,
    configRevision: policy.configRevision,
    ships: Object.freeze(ships),
  });
}

export async function fetchPublishedShipRuntimeSession(
  fetchImpl: typeof fetch,
  endpoint = RUNTIME_ENDPOINT,
): Promise<ShipRuntimeSession> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return bundledSession();
    return materializeShipRuntimeSession(await response.json());
  } catch {
    return bundledSession();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function loadInitialShipRuntimeSession(): Promise<ShipRuntimeSession> {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return bundledSession();
  }
  return fetchPublishedShipRuntimeSession(window.fetch.bind(window));
}

/**
 * Immutable for the lifetime of this page/game session. Publishing Admin
 * changes while gameplay is running cannot mutate the active session; the
 * next page/game session materializes the then-current published revision.
 */
export const ACTIVE_SHIP_RUNTIME_SESSION = await loadInitialShipRuntimeSession();

export function activeShipRuntimeDefinitionOverride(
  id: string,
): Readonly<ShipRuntimeDefinitionOverride> | undefined {
  const override = ACTIVE_SHIP_RUNTIME_SESSION.ships[id];
  if (override === undefined) return undefined;
  const { statBonus: _statBonus, visual: _visual, ...definition } = override;
  return definition;
}

export function activeShipRuntimeStatOverride(
  id: string,
): Readonly<ShipRuntimeStatOverride> | undefined {
  return ACTIVE_SHIP_RUNTIME_SESSION.ships[id]?.statBonus;
}

export function activeShipRuntimeVisualOverride(
  id: string,
): Readonly<ShipRuntimeVisualOverride> | undefined {
  return ACTIVE_SHIP_RUNTIME_SESSION.ships[id]?.visual;
}
