export type EnemyRuntimeOverride = Readonly<{
  minStage?: number;
}>;

export type EnemyRuntimeSession = Readonly<{
  source: "bundled" | "published";
  activeRevision: string | null;
  configRevision: string;
  enemies: Readonly<Record<string, EnemyRuntimeOverride>>;
}>;

const ENDPOINT = "/api/runtime/space-typing/enemies";
const APPLY_BOUNDARY = "new-session";
const ENEMY_IDS = new Set([
  "rainbow-scout",
  "rainbow-dart",
  "rainbow-bubble",
  "imp-spark",
  "snow-wisp",
  "lucky-rainbow",
  "angel-healer",
  "angel-guard",
  "angel-blesser",
  "bomb-imp",
  "freeze-burst-sprite",
  "seraph-elite",
  "berserk-devil",
  "frost-keeper",
  "fortune-prism",
  "prism-sprite",
  "treasure-prism",
  "leaf-puff",
  "bloom-puff",
  "shade-wisp",
  "night-wisp",
  "umbra-elite",
  "star-core",
  "nova-core",
  "nebula-elite",
  "halo-seraph",
  "crown-demon",
  "glacier-oracle",
  "prism-sentinel",
  "archangel-core",
  "demon-lord-orb",
  "glacier-queen",
  "prism-archon",
  "void-eye",
  "cosmic-emperor",
]);
const AUTHORABLE_KEYS = new Set(["minStage"]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function sanitizeOverride(value: unknown): EnemyRuntimeOverride | null {
  const raw = object(value);
  if (raw === null || Object.keys(raw).some((key) => !AUTHORABLE_KEYS.has(key))) return null;
  const result: { minStage?: number } = {};
  if (raw.minStage !== undefined) {
    if (!Number.isInteger(raw.minStage) || (raw.minStage as number) < 1 || (raw.minStage as number) > 1000) return null;
    result.minStage = raw.minStage as number;
  }
  return Object.freeze(result);
}

function bundledSession(activeRevision: string | null = null): EnemyRuntimeSession {
  return Object.freeze({
    source: "bundled" as const,
    activeRevision,
    configRevision: "bundled-enemy-registry",
    enemies: Object.freeze({}),
  });
}

export function materializeEnemyRuntimeSession(envelope: unknown): EnemyRuntimeSession {
  const runtime = object(envelope);
  if (runtime === null || runtime.applyBoundary !== APPLY_BOUNDARY) return bundledSession();
  const activeRevision = typeof runtime.activeRevision === "string" ? runtime.activeRevision : null;
  const policy = object(runtime.policy);
  if (policy === null || !validText(policy.configRevision, 120)) return bundledSession(activeRevision);
  if (Object.keys(policy).some((key) => key !== "configRevision" && key !== "enemies")) return bundledSession(activeRevision);
  if (policy.enemies === undefined) return bundledSession(activeRevision);
  const rawEnemies = object(policy.enemies);
  if (rawEnemies === null) return bundledSession(activeRevision);

  const enemies: Record<string, EnemyRuntimeOverride> = {};
  for (const [id, rawOverride] of Object.entries(rawEnemies)) {
    if (!ENEMY_IDS.has(id)) continue;
    const override = sanitizeOverride(rawOverride);
    if (override !== null) enemies[id] = override;
  }

  return Object.freeze({
    source: "published" as const,
    activeRevision,
    configRevision: policy.configRevision,
    enemies: Object.freeze(enemies),
  });
}

export async function fetchPublishedEnemyRuntimeSession(
  fetchImpl: typeof fetch,
  endpoint = ENDPOINT,
): Promise<EnemyRuntimeSession> {
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
    return materializeEnemyRuntimeSession(await response.json());
  } catch {
    return bundledSession();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function loadInitialSession(): Promise<EnemyRuntimeSession> {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return bundledSession();
  return fetchPublishedEnemyRuntimeSession(window.fetch.bind(window));
}

/** Immutable for one page/game session: a publish applies on the next session. */
export const ACTIVE_ENEMY_RUNTIME_SESSION = await loadInitialSession();

export function activeEnemyRuntimeOverride(id: string): EnemyRuntimeOverride | undefined {
  return ACTIVE_ENEMY_RUNTIME_SESSION.enemies[id];
}
