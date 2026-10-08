export type StageRuntimeOverride = Readonly<{
  enemyBudget?: number;
  eliteChance?: number;
  modifierSlots?: number;
}>;

export type StageRuntimeSession = Readonly<{
  source: "bundled" | "published";
  activeRevision: string | null;
  configRevision: string;
  stages: Readonly<Record<number, StageRuntimeOverride>>;
}>;

const ENDPOINT = "/api/runtime/space-typing/stages";
const APPLY_BOUNDARY = "new-session";
const MIN_STAGE = 1;
const MAX_STAGE = 1000;
const AUTHORABLE_KEYS = new Set(["stage", "enemyBudget", "eliteChance", "modifierSlots"]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validRevision(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 120;
}

function validStage(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_STAGE && value <= MAX_STAGE;
}

function sanitizeRecord(value: unknown): { stage: number; override: StageRuntimeOverride } | null {
  const raw = object(value);
  if (raw === null || Object.keys(raw).some((key) => !AUTHORABLE_KEYS.has(key))) return null;
  if (!validStage(raw.stage)) return null;

  const override: { enemyBudget?: number; eliteChance?: number; modifierSlots?: number } = {};
  let fieldCount = 0;

  if (raw.enemyBudget !== undefined) {
    if (typeof raw.enemyBudget !== "number" || !Number.isFinite(raw.enemyBudget) || raw.enemyBudget <= 0) {
      return null;
    }
    override.enemyBudget = raw.enemyBudget;
    fieldCount += 1;
  }

  if (raw.eliteChance !== undefined) {
    if (typeof raw.eliteChance !== "number" || !Number.isFinite(raw.eliteChance) || raw.eliteChance < 0 || raw.eliteChance > 1) {
      return null;
    }
    override.eliteChance = raw.eliteChance;
    fieldCount += 1;
  }

  if (raw.modifierSlots !== undefined) {
    if (typeof raw.modifierSlots !== "number" || !Number.isInteger(raw.modifierSlots) || raw.modifierSlots < 0 || raw.modifierSlots > 4) {
      return null;
    }
    override.modifierSlots = raw.modifierSlots;
    fieldCount += 1;
  }

  return fieldCount > 0
    ? { stage: raw.stage, override: Object.freeze(override) }
    : null;
}

function bundledSession(activeRevision: string | null = null): StageRuntimeSession {
  return Object.freeze({
    source: "bundled" as const,
    activeRevision,
    configRevision: "bundled-stage-config",
    stages: Object.freeze({}),
  });
}

export function materializeStageRuntimeSession(envelope: unknown): StageRuntimeSession {
  const runtime = object(envelope);
  if (runtime === null || runtime.applyBoundary !== APPLY_BOUNDARY) return bundledSession();

  const activeRevision = typeof runtime.activeRevision === "string" ? runtime.activeRevision : null;
  const policy = object(runtime.policy);
  if (policy === null || !validRevision(policy.configRevision)) return bundledSession(activeRevision);
  if (Object.keys(policy).some((key) => key !== "configRevision" && key !== "stages")) {
    return bundledSession(activeRevision);
  }
  if (!Array.isArray(policy.stages)) return bundledSession(activeRevision);

  const stages: Record<number, StageRuntimeOverride> = {};
  const seen = new Set<number>();
  for (const rawRecord of policy.stages) {
    const record = sanitizeRecord(rawRecord);
    if (record === null || seen.has(record.stage)) return bundledSession(activeRevision);
    seen.add(record.stage);
    stages[record.stage] = record.override;
  }

  return Object.freeze({
    source: "published" as const,
    activeRevision,
    configRevision: policy.configRevision.trim(),
    stages: Object.freeze(stages),
  });
}

export async function fetchPublishedStageRuntimeSession(
  fetchImpl: typeof fetch,
  endpoint = ENDPOINT,
): Promise<StageRuntimeSession> {
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
    return materializeStageRuntimeSession(await response.json());
  } catch {
    return bundledSession();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function loadInitialSession(): Promise<StageRuntimeSession> {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return bundledSession();
  return fetchPublishedStageRuntimeSession(window.fetch.bind(window));
}

/** Immutable for one page/game session: a publish applies on the next session. */
export const ACTIVE_STAGE_RUNTIME_SESSION = await loadInitialSession();

export function activeStageRuntimeOverride(stage: number): StageRuntimeOverride | undefined {
  return ACTIVE_STAGE_RUNTIME_SESSION.stages[stage];
}
