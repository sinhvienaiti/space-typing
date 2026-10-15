import { enemyDefinition, type EnemyDefinitionId } from "../enemies/registry";
import { worldById } from "../worlds/registry";
import type { WorldProfile } from "../worlds/types";

export type WorldRuntimeOverride = Readonly<{
  enemyRoster?: readonly EnemyDefinitionId[];
}>;

export type WorldRuntimeSession = Readonly<{
  source: "bundled" | "published";
  activeRevision: string | null;
  configRevision: string;
  worlds: Readonly<Record<string, WorldRuntimeOverride>>;
}>;

const ENDPOINT = "/api/runtime/space-typing/worlds";
const APPLY_BOUNDARY = "new-session";
const AUTHORABLE_KEYS = new Set(["enemyRoster"]);
const MAX_ROSTER = 64;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validRevision(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 120;
}

function sanitizeOverride(worldId: string, value: unknown): WorldRuntimeOverride | null {
  const bundled = worldById(worldId);
  const raw = object(value);
  if (bundled === undefined || raw === null || Object.keys(raw).some((key) => !AUTHORABLE_KEYS.has(key))) return null;
  if (!Array.isArray(raw.enemyRoster) || raw.enemyRoster.length < 1 || raw.enemyRoster.length > MAX_ROSTER) return null;

  const roster: EnemyDefinitionId[] = [];
  const seen = new Set<string>();
  for (const candidate of raw.enemyRoster) {
    if (typeof candidate !== "string" || seen.has(candidate)) return null;
    const definition = enemyDefinition(candidate as EnemyDefinitionId);
    if (
      definition === undefined ||
      definition.role === "boss" ||
      definition.role === "mini-boss" ||
      !bundled.enemyFamilies.includes(definition.family)
    ) return null;
    seen.add(candidate);
    roster.push(candidate as EnemyDefinitionId);
  }
  return Object.freeze({ enemyRoster: Object.freeze(roster) });
}

function bundledSession(activeRevision: string | null = null): WorldRuntimeSession {
  return Object.freeze({
    source: "bundled" as const,
    activeRevision,
    configRevision: "bundled-world-registry",
    worlds: Object.freeze({}),
  });
}

export function materializeWorldRuntimeSession(envelope: unknown): WorldRuntimeSession {
  const runtime = object(envelope);
  if (runtime === null || runtime.applyBoundary !== APPLY_BOUNDARY) return bundledSession();
  const activeRevision = typeof runtime.activeRevision === "string" ? runtime.activeRevision : null;
  const policy = object(runtime.policy);
  if (policy === null || !validRevision(policy.configRevision)) return bundledSession(activeRevision);
  if (Object.keys(policy).some((key) => key !== "configRevision" && key !== "worlds")) return bundledSession(activeRevision);
  const rawWorlds = object(policy.worlds);
  if (rawWorlds === null) return bundledSession(activeRevision);

  const worlds: Record<string, WorldRuntimeOverride> = {};
  for (const [worldId, rawOverride] of Object.entries(rawWorlds)) {
    const override = sanitizeOverride(worldId, rawOverride);
    if (override === null) return bundledSession(activeRevision);
    worlds[worldId] = override;
  }
  return Object.freeze({
    source: "published" as const,
    activeRevision,
    configRevision: policy.configRevision.trim(),
    worlds: Object.freeze(worlds),
  });
}

export async function fetchPublishedWorldRuntimeSession(
  fetchImpl: typeof fetch,
  endpoint = ENDPOINT,
): Promise<WorldRuntimeSession> {
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
    return materializeWorldRuntimeSession(await response.json());
  } catch {
    return bundledSession();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function loadInitialSession(): Promise<WorldRuntimeSession> {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return bundledSession();
  return fetchPublishedWorldRuntimeSession(window.fetch.bind(window));
}

/** Immutable for one page/game session: a publish applies on the next session. */
export const ACTIVE_WORLD_RUNTIME_SESSION = await loadInitialSession();

export function activeWorldRuntimeOverride(worldId: string): WorldRuntimeOverride | undefined {
  return ACTIVE_WORLD_RUNTIME_SESSION.worlds[worldId];
}

export function resolveWorldProfileForRuntime(
  bundled: WorldProfile,
  override: WorldRuntimeOverride | undefined = activeWorldRuntimeOverride(bundled.id),
): WorldProfile {
  if (override?.enemyRoster === undefined) return bundled;
  const enemyRoster = [...override.enemyRoster];
  return {
    ...bundled,
    enemyRoster,
    elitePool: bundled.elitePool.filter((id) => enemyRoster.includes(id)),
  };
}
