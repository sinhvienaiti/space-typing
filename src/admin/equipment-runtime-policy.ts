export type EquipmentRuntimeStatKey =
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

export type EquipmentRuntimeOverride = Readonly<{
  name?: string;
  description?: string;
  stats?: Partial<Record<EquipmentRuntimeStatKey, number>>;
  perk?: string | null;
}>;

export type EquipmentRuntimeSession = Readonly<{
  source: "bundled" | "published";
  activeRevision: string | null;
  configRevision: string;
  equipment: Readonly<Record<string, EquipmentRuntimeOverride>>;
}>;

const ENDPOINT = "/api/runtime/space-typing/equipment";
const APPLY_BOUNDARY = "new-session";
const EQUIPMENT_IDS = new Set([
  "pulse-laser-mk1", "precision-laser-mk1", "ion-cannon-mk1",
  "plated-armor-mk1", "adaptive-armor-mk1", "kinetic-shell-mk1",
  "deflector-shield-mk1", "prism-shield-mk1", "capacitor-shield-mk1",
  "compact-reactor-mk1", "overclock-reactor-mk1", "fusion-reactor-mk1",
  "targeting-module-mk1", "salvage-module-mk1", "fortune-module-mk1",
  "support-drone-mk1", "assault-drone-mk1", "ward-drone-mk1",
  "overdrive-core-mk1", "salvage-core-mk1", "balanced-core-mk1",
  "arc-projector-mk2", "rail-driver-mk2", "plasma-lance-mk3",
  "ablative-plating-mk2", "reactive-armor-mk2", "nanoweave-hull-mk3",
  "discharge-shield-mk2", "harmonic-shield-mk2", "phase-shield-mk3",
  "efficient-reactor-mk2", "siphon-reactor-mk2", "cryo-reactor-mk3",
  "hunter-killer-pod-mk2", "threat-scanner-mk2", "overcharge-module-mk3",
  "escort-drone-mk2", "interceptor-drone-mk2", "wing-drones-mk3",
  "ignition-core-mk2", "momentum-core-mk2", "quantum-core-mk3",
]);
const PERK_IDS = new Set([
  "arc-emitter", "overpenetration", "plasma-rupture", "ablative-plating",
  "reactive-armor", "nanite-weave", "discharge-shield", "harmonic-recharge",
  "phase-shield", "efficient-capacitor", "kill-siphon", "cryo-coolant",
  "hunter-killer", "threat-scanner", "overcharge-module", "escort-drone",
  "interceptor-drone", "wing-drones", "ignition-core", "momentum-core",
  "quantum-core",
]);
const STAT_KEYS = new Set<EquipmentRuntimeStatKey>([
  "hull", "shield", "firepower", "armor", "energy", "reactor", "focus", "ward", "luck", "salvage",
]);
const AUTHORABLE_KEYS = new Set(["name", "description", "stats", "perk"]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -100 && value <= 100;
}

function sanitizeOverride(value: unknown): EquipmentRuntimeOverride | null {
  const raw = object(value);
  if (raw === null || Object.keys(raw).some((key) => !AUTHORABLE_KEYS.has(key))) return null;
  const result: {
    name?: string;
    description?: string;
    stats?: Partial<Record<EquipmentRuntimeStatKey, number>>;
    perk?: string | null;
  } = {};

  if (raw.name !== undefined) {
    if (!validText(raw.name, 100)) return null;
    result.name = raw.name;
  }
  if (raw.description !== undefined) {
    if (!validText(raw.description, 320)) return null;
    result.description = raw.description;
  }
  if (raw.stats !== undefined) {
    const stats = object(raw.stats);
    if (stats === null) return null;
    const clean: Partial<Record<EquipmentRuntimeStatKey, number>> = {};
    for (const [key, number] of Object.entries(stats)) {
      if (!STAT_KEYS.has(key as EquipmentRuntimeStatKey) || !validNumber(number)) return null;
      clean[key as EquipmentRuntimeStatKey] = number;
    }
    result.stats = Object.freeze(clean);
  }
  if (raw.perk !== undefined) {
    if (raw.perk !== null && (typeof raw.perk !== "string" || !PERK_IDS.has(raw.perk))) return null;
    result.perk = raw.perk as string | null;
  }
  return Object.freeze(result);
}

function bundledSession(activeRevision: string | null = null): EquipmentRuntimeSession {
  return Object.freeze({
    source: "bundled" as const,
    activeRevision,
    configRevision: "bundled-equipment-registry",
    equipment: Object.freeze({}),
  });
}

export function materializeEquipmentRuntimeSession(envelope: unknown): EquipmentRuntimeSession {
  const runtime = object(envelope);
  if (runtime === null || runtime.applyBoundary !== APPLY_BOUNDARY) return bundledSession();
  const activeRevision = typeof runtime.activeRevision === "string" ? runtime.activeRevision : null;
  const policy = object(runtime.policy);
  if (policy === null || !validText(policy.configRevision, 120)) return bundledSession(activeRevision);
  if (Object.keys(policy).some((key) => key !== "configRevision" && key !== "equipment")) return bundledSession(activeRevision);
  if (policy.equipment === undefined) return bundledSession(activeRevision);
  const rawEquipment = object(policy.equipment);
  if (rawEquipment === null) return bundledSession(activeRevision);

  const equipment: Record<string, EquipmentRuntimeOverride> = {};
  for (const [id, rawOverride] of Object.entries(rawEquipment)) {
    if (!EQUIPMENT_IDS.has(id)) continue;
    const override = sanitizeOverride(rawOverride);
    if (override !== null) equipment[id] = override;
  }
  return Object.freeze({
    source: "published" as const,
    activeRevision,
    configRevision: policy.configRevision,
    equipment: Object.freeze(equipment),
  });
}

export async function fetchPublishedEquipmentRuntimeSession(
  fetchImpl: typeof fetch,
  endpoint = ENDPOINT,
): Promise<EquipmentRuntimeSession> {
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
    return materializeEquipmentRuntimeSession(await response.json());
  } catch {
    return bundledSession();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function loadInitialSession(): Promise<EquipmentRuntimeSession> {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return bundledSession();
  return fetchPublishedEquipmentRuntimeSession(window.fetch.bind(window));
}

/** Immutable for one page/game session: a publish applies on the next session. */
export const ACTIVE_EQUIPMENT_RUNTIME_SESSION = await loadInitialSession();

export function activeEquipmentRuntimeOverride(id: string): EquipmentRuntimeOverride | undefined {
  return ACTIVE_EQUIPMENT_RUNTIME_SESSION.equipment[id];
}
