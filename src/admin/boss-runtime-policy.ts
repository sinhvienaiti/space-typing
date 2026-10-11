export type BossRuntimeOverride = Readonly<{
  name?: string;
  title?: string;
}>;

export type BossRuntimeSession = Readonly<{
  source: "bundled" | "published";
  activeRevision: string | null;
  configRevision: string;
  bosses: Readonly<Record<string, BossRuntimeOverride>>;
}>;

const ENDPOINT = "/api/runtime/space-typing/bosses";
const APPLY_BOUNDARY = "new-session";
const BOSS_IDS = new Set([
  "tyrant-g01", "tyrant-g02", "tyrant-g03", "tyrant-g04", "tyrant-g05",
  "tyrant-g06", "tyrant-g07", "tyrant-g08", "tyrant-g09", "tyrant-g10",
  "warden-rainbow", "warden-angel", "warden-devil", "warden-frost",
  "warden-prism", "warden-nature", "warden-shadow", "warden-cosmic",
  "lieutenant-rainbow", "lieutenant-angel", "lieutenant-devil", "lieutenant-frost",
  "lieutenant-prism", "lieutenant-nature", "lieutenant-shadow", "lieutenant-cosmic",
]);
const AUTHORABLE_KEYS = new Set(["name", "title"]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function sanitizeOverride(value: unknown): BossRuntimeOverride | null {
  const raw = object(value);
  if (raw === null || Object.keys(raw).some((key) => !AUTHORABLE_KEYS.has(key))) return null;
  const result: { name?: string; title?: string } = {};
  if (raw.name !== undefined) {
    if (!validText(raw.name, 100)) return null;
    result.name = raw.name.trim();
  }
  if (raw.title !== undefined) {
    if (!validText(raw.title, 160)) return null;
    result.title = raw.title.trim();
  }
  return Object.freeze(result);
}

function bundledSession(activeRevision: string | null = null): BossRuntimeSession {
  return Object.freeze({
    source: "bundled" as const,
    activeRevision,
    configRevision: "bundled-boss-registry",
    bosses: Object.freeze({}),
  });
}

export function materializeBossRuntimeSession(envelope: unknown): BossRuntimeSession {
  const runtime = object(envelope);
  if (runtime === null || runtime.applyBoundary !== APPLY_BOUNDARY) return bundledSession();
  const activeRevision = typeof runtime.activeRevision === "string" ? runtime.activeRevision : null;
  const policy = object(runtime.policy);
  if (policy === null || !validText(policy.configRevision, 120)) return bundledSession(activeRevision);
  if (Object.keys(policy).some((key) => key !== "configRevision" && key !== "bosses")) return bundledSession(activeRevision);
  if (policy.bosses === undefined) return bundledSession(activeRevision);
  const rawBosses = object(policy.bosses);
  if (rawBosses === null) return bundledSession(activeRevision);

  const bosses: Record<string, BossRuntimeOverride> = {};
  for (const [id, rawOverride] of Object.entries(rawBosses)) {
    if (!BOSS_IDS.has(id)) continue;
    const override = sanitizeOverride(rawOverride);
    if (override !== null) bosses[id] = override;
  }

  return Object.freeze({
    source: "published" as const,
    activeRevision,
    configRevision: policy.configRevision,
    bosses: Object.freeze(bosses),
  });
}

export async function fetchPublishedBossRuntimeSession(
  fetchImpl: typeof fetch,
  endpoint = ENDPOINT,
): Promise<BossRuntimeSession> {
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
    return materializeBossRuntimeSession(await response.json());
  } catch {
    return bundledSession();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function loadInitialSession(): Promise<BossRuntimeSession> {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return bundledSession();
  return fetchPublishedBossRuntimeSession(window.fetch.bind(window));
}

/** Immutable for one page/game session: a publish applies on the next session. */
export const ACTIVE_BOSS_RUNTIME_SESSION = await loadInitialSession();

export function activeBossRuntimeOverride(id: string): BossRuntimeOverride | undefined {
  return ACTIVE_BOSS_RUNTIME_SESSION.bosses[id];
}
