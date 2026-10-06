import type { SkillDefinition, SkillTypingCondition } from "../skills/engine";

export type SkillRuntimeOverride = Readonly<{
  name?: string;
  description?: string;
  energyCost?: number;
  cooldown?: number;
  charges?: number | null;
  perStageLimit?: number | null;
  typingCondition?: SkillTypingCondition | null;
}>;

export type SkillRuntimeSession = Readonly<{
  source: "bundled" | "published";
  activeRevision: string | null;
  configRevision: string;
  skills: Readonly<Record<string, SkillRuntimeOverride>>;
}>;

const ENDPOINT = "/api/runtime/space-typing/skills";
const APPLY_BOUNDARY = "new-session";
const SKILL_IDS = new Set([
  "emp-burst",
  "chain-lightning",
  "mark-of-weakness",
  "barrier",
  "reflect-field",
  "time-shell",
  "emergency-repair",
  "guardian-drone",
  "sanctuary",
  "gravity-well",
  "cleanse",
  "meteor",
  "missile-swarm",
  "railgun",
  "tractor-beam",
]);
const AUTHORABLE_KEYS = new Set([
  "name",
  "description",
  "energyCost",
  "cooldown",
  "charges",
  "perStageLimit",
  "typingCondition",
]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function validNullableInteger(value: unknown, max: number): value is number | null {
  return value === null || (validNumber(value, 0, max) && Number.isInteger(value));
}

function sanitizeTypingCondition(value: unknown): SkillTypingCondition | null | undefined {
  if (value === null) return null;
  const raw = object(value);
  if (raw === null || Object.keys(raw).some((key) => key !== "minStreak" && key !== "minAccuracy")) return undefined;
  const condition: SkillTypingCondition = {};
  if (raw.minStreak !== undefined) {
    if (!validNumber(raw.minStreak, 0, 999) || !Number.isInteger(raw.minStreak)) return undefined;
    condition.minStreak = raw.minStreak;
  }
  if (raw.minAccuracy !== undefined) {
    if (!validNumber(raw.minAccuracy, 0, 100)) return undefined;
    condition.minAccuracy = raw.minAccuracy;
  }
  return Object.freeze(condition);
}

function sanitizeOverride(value: unknown): SkillRuntimeOverride | null {
  const raw = object(value);
  if (raw === null || Object.keys(raw).some((key) => !AUTHORABLE_KEYS.has(key))) return null;
  const result: {
    name?: string;
    description?: string;
    energyCost?: number;
    cooldown?: number;
    charges?: number | null;
    perStageLimit?: number | null;
    typingCondition?: SkillTypingCondition | null;
  } = {};

  if (raw.name !== undefined) {
    if (!validText(raw.name, 100)) return null;
    result.name = raw.name;
  }
  if (raw.description !== undefined) {
    if (!validText(raw.description, 320)) return null;
    result.description = raw.description;
  }
  if (raw.energyCost !== undefined) {
    if (!validNumber(raw.energyCost, 0, 200)) return null;
    result.energyCost = raw.energyCost;
  }
  if (raw.cooldown !== undefined) {
    if (!validNumber(raw.cooldown, 0, 300)) return null;
    result.cooldown = raw.cooldown;
  }
  if (raw.charges !== undefined) {
    if (!validNullableInteger(raw.charges, 99)) return null;
    result.charges = raw.charges;
  }
  if (raw.perStageLimit !== undefined) {
    if (!validNullableInteger(raw.perStageLimit, 99)) return null;
    result.perStageLimit = raw.perStageLimit;
  }
  if (raw.typingCondition !== undefined) {
    const condition = sanitizeTypingCondition(raw.typingCondition);
    if (condition === undefined) return null;
    result.typingCondition = condition;
  }
  return Object.freeze(result);
}

function bundledSession(activeRevision: string | null = null): SkillRuntimeSession {
  return Object.freeze({
    source: "bundled" as const,
    activeRevision,
    configRevision: "bundled-skill-registry",
    skills: Object.freeze({}),
  });
}

export function materializeSkillRuntimeSession(envelope: unknown): SkillRuntimeSession {
  const runtime = object(envelope);
  if (runtime === null || runtime.applyBoundary !== APPLY_BOUNDARY) return bundledSession();
  const activeRevision = typeof runtime.activeRevision === "string" ? runtime.activeRevision : null;
  const policy = object(runtime.policy);
  if (policy === null || !validText(policy.configRevision, 120)) return bundledSession(activeRevision);
  if (Object.keys(policy).some((key) => key !== "configRevision" && key !== "skills")) return bundledSession(activeRevision);
  if (policy.skills === undefined) return bundledSession(activeRevision);
  const rawSkills = object(policy.skills);
  if (rawSkills === null) return bundledSession(activeRevision);

  const skills: Record<string, SkillRuntimeOverride> = {};
  for (const [id, rawOverride] of Object.entries(rawSkills)) {
    if (!SKILL_IDS.has(id)) continue;
    const override = sanitizeOverride(rawOverride);
    if (override !== null) skills[id] = override;
  }
  return Object.freeze({
    source: "published" as const,
    activeRevision,
    configRevision: policy.configRevision,
    skills: Object.freeze(skills),
  });
}

export async function fetchPublishedSkillRuntimeSession(
  fetchImpl: typeof fetch,
  endpoint = ENDPOINT,
): Promise<SkillRuntimeSession> {
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
    return materializeSkillRuntimeSession(await response.json());
  } catch {
    return bundledSession();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function loadInitialSession(): Promise<SkillRuntimeSession> {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return bundledSession();
  return fetchPublishedSkillRuntimeSession(window.fetch.bind(window));
}

/** Immutable for one page/game session: a publish applies on the next session. */
export const ACTIVE_SKILL_RUNTIME_SESSION = await loadInitialSession();

export function activeSkillRuntimeOverride(id: string): SkillRuntimeOverride | undefined {
  return ACTIVE_SKILL_RUNTIME_SESSION.skills[id];
}

export function applySkillRuntimeOverride<T extends SkillDefinition>(definition: T): T {
  const override = activeSkillRuntimeOverride(definition.id);
  if (override === undefined) return definition;
  const merged = {
    ...definition,
    ...override,
    id: definition.id,
    typingCondition: override.typingCondition === undefined
      ? definition.typingCondition
      : override.typingCondition === null
        ? undefined
        : { ...override.typingCondition },
  } as T;
  return Object.freeze(merged);
}
