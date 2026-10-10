import { validCampaignStage } from "../campaign/stage-selection-access";
import { isCharacterId, type CharacterId } from "../characters/registry";
import {
  readCanonicalPlayerSave,
  type PlayerSave,
} from "../persistence/player-save";

export type QaEnvironment = "local" | "development" | "preview" | "test";
export type QaStageOverride = {
  stage: number;
  mode: "allow" | "force";
};
export type QaOverrides = {
  stageAccess?: QaStageOverride;
  shipPreview?: CharacterId;
  unlimitedWarp?: boolean;
};
export type QaCapability = {
  version: 1;
  id: string;
  gameId: "space-typing";
  environment: QaEnvironment;
  targetSessionId: string;
  actorId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  generation: number;
  overrides: QaOverrides;
};
export type QaRuntimeSessionPolicy = {
  kind: "qa";
  sessionId: string;
  generation: number;
  capabilityId: string;
  actorId: string;
  environment: QaEnvironment;
  startedAtMs: number;
  expiresAtMs: number;
  persistenceTarget: "qa-sandbox";
  rewardEligibility: "none";
  overrides: QaOverrides;
};
export type QaCallbackToken = Pick<
  QaRuntimeSessionPolicy,
  "sessionId" | "generation" | "rewardEligibility"
>;
export type QaSandboxStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type QaSandboxEnvelope = {
  version: 1;
  sessionId: string;
  generation: number;
  capabilityId: string;
  save: PlayerSave;
};

const QA_SANDBOX_PREFIX = "spaceTypingQaSandboxV1:";
const QA_ENVIRONMENTS = new Set<QaEnvironment>([
  "local",
  "development",
  "preview",
  "test",
]);

function text(value: unknown, max = 200): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function timestamp(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 8_640_000_000_000_000
  );
}

function generation(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function sanitizeOverrides(value: unknown): QaOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("QA capability overrides must be an object");
  }
  const raw = value as Record<string, unknown>;
  const overrides: QaOverrides = {};
  if (raw.stageAccess !== undefined) {
    if (
      !raw.stageAccess ||
      typeof raw.stageAccess !== "object" ||
      Array.isArray(raw.stageAccess)
    ) {
      throw new Error("QA stage access override is invalid");
    }
    const stage = (raw.stageAccess as { stage?: unknown }).stage;
    const mode = (raw.stageAccess as { mode?: unknown }).mode;
    if (
      typeof stage !== "number" ||
      !validCampaignStage(stage) ||
      (mode !== "allow" && mode !== "force")
    ) {
      throw new Error("QA stage access override is invalid");
    }
    overrides.stageAccess = { stage, mode };
  }
  if (raw.shipPreview !== undefined) {
    if (typeof raw.shipPreview !== "string" || !isCharacterId(raw.shipPreview)) {
      throw new Error("QA ship preview override is invalid");
    }
    overrides.shipPreview = raw.shipPreview;
  }
  if (raw.unlimitedWarp !== undefined) {
    if (typeof raw.unlimitedWarp !== "boolean") {
      throw new Error("QA unlimited Warp override is invalid");
    }
    overrides.unlimitedWarp = raw.unlimitedWarp;
  }
  return overrides;
}

/**
 * Validate a capability delivered by the trusted Admin/session channel.
 * Query parameters and localStorage are intentionally not accepted as authority.
 */
export function parseQaCapability(
  value: unknown,
  expectedSessionId: string,
  expectedEnvironment: QaEnvironment,
  nowMs: number,
): QaCapability {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("QA capability is missing");
  }
  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    raw.gameId !== "space-typing" ||
    !text(raw.id) ||
    !text(raw.targetSessionId) ||
    !text(raw.actorId) ||
    !QA_ENVIRONMENTS.has(raw.environment as QaEnvironment) ||
    raw.environment !== expectedEnvironment ||
    raw.targetSessionId !== expectedSessionId ||
    !timestamp(raw.issuedAtMs) ||
    !timestamp(raw.expiresAtMs) ||
    !timestamp(nowMs) ||
    !generation(raw.generation) ||
    raw.expiresAtMs <= raw.issuedAtMs ||
    nowMs < raw.issuedAtMs ||
    nowMs >= raw.expiresAtMs
  ) {
    throw new Error("QA capability is invalid, expired, or out of scope");
  }
  return {
    version: 1,
    id: raw.id,
    gameId: "space-typing",
    environment: raw.environment as QaEnvironment,
    targetSessionId: raw.targetSessionId,
    actorId: raw.actorId,
    issuedAtMs: raw.issuedAtMs,
    expiresAtMs: raw.expiresAtMs,
    generation: raw.generation,
    overrides: sanitizeOverrides(raw.overrides ?? {}),
  };
}

export function beginQaRuntimeSession(
  capability: QaCapability,
  runtimeSessionId: string,
  environment: QaEnvironment,
  nowMs: number,
): QaRuntimeSessionPolicy {
  const validated = parseQaCapability(
    capability,
    runtimeSessionId,
    environment,
    nowMs,
  );
  return {
    kind: "qa",
    sessionId: runtimeSessionId,
    generation: validated.generation,
    capabilityId: validated.id,
    actorId: validated.actorId,
    environment: validated.environment,
    startedAtMs: nowMs,
    expiresAtMs: validated.expiresAtMs,
    persistenceTarget: "qa-sandbox",
    rewardEligibility: "none",
    overrides: structuredClone(validated.overrides),
  };
}

export function qaSessionExpired(
  policy: QaRuntimeSessionPolicy,
  nowMs: number,
): boolean {
  return nowMs >= policy.expiresAtMs;
}

export function qaCallbackToken(
  policy: QaRuntimeSessionPolicy,
): QaCallbackToken {
  return {
    sessionId: policy.sessionId,
    generation: policy.generation,
    rewardEligibility: "none",
  };
}

/**
 * Expiry never upgrades an already-started QA run to a rewarded run. The token
 * remains QA/non-rewarded until that run is disposed; only generation/session
 * replacement makes its asynchronous callbacks stale.
 */
export function assertQaCallbackCurrent(
  policy: QaRuntimeSessionPolicy,
  token: QaCallbackToken,
): void {
  if (
    token.sessionId !== policy.sessionId ||
    token.generation !== policy.generation ||
    token.rewardEligibility !== "none"
  ) {
    throw new Error("Stale QA callback rejected");
  }
}

export function qaCanSelectStage(
  normalAccess: boolean,
  stage: number,
  policy: QaRuntimeSessionPolicy,
): boolean {
  if (!validCampaignStage(stage)) return false;
  return normalAccess || policy.overrides.stageAccess?.stage === stage;
}

export function qaForcedStage(
  policy: QaRuntimeSessionPolicy,
): number | null {
  const override = policy.overrides.stageAccess;
  return override?.mode === "force" ? override.stage : null;
}

export function qaCanPreviewShip(
  normallySelectable: boolean,
  shipId: CharacterId,
  policy: QaRuntimeSessionPolicy,
): boolean {
  return normallySelectable || policy.overrides.shipPreview === shipId;
}

/** Unlimited Warp is an admission bypass only; canonical Warp is never inflated. */
export function qaHasUnlimitedWarp(policy: QaRuntimeSessionPolicy): boolean {
  return policy.overrides.unlimitedWarp === true;
}

export function qaSandboxStorageKey(policy: QaRuntimeSessionPolicy): string {
  return `${QA_SANDBOX_PREFIX}${encodeURIComponent(policy.capabilityId)}:${policy.generation}:${encodeURIComponent(policy.sessionId)}`;
}

function readSandboxEnvelope(
  raw: string | null,
  policy: QaRuntimeSessionPolicy,
): PlayerSave | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<QaSandboxEnvelope>;
    if (
      value.version !== 1 ||
      value.sessionId !== policy.sessionId ||
      value.generation !== policy.generation ||
      value.capabilityId !== policy.capabilityId
    ) {
      return null;
    }
    return readCanonicalPlayerSave(value.save);
  } catch {
    return null;
  }
}

/**
 * Disposable QA persistence. It only knows its namespaced sandbox key and has
 * no API capable of writing the canonical IndexedDB save or recovery mirrors.
 */
export class QaSessionSandbox {
  private save: PlayerSave;
  private readonly key: string;

  constructor(
    readonly policy: QaRuntimeSessionPolicy,
    canonicalSnapshot: PlayerSave,
    private storage?: QaSandboxStorage,
  ) {
    this.key = qaSandboxStorageKey(policy);
    this.save =
      readSandboxEnvelope(storage?.getItem(this.key) ?? null, policy) ??
      structuredClone(canonicalSnapshot);
  }

  snapshot(): PlayerSave {
    return structuredClone(this.save);
  }

  replace(next: PlayerSave): PlayerSave {
    this.save = structuredClone(next);
    this.persist();
    return this.snapshot();
  }

  mutate(mutator: (draft: PlayerSave) => void): PlayerSave {
    const draft = this.snapshot();
    mutator(draft);
    return this.replace(draft);
  }

  persist(): void {
    if (!this.storage) return;
    const envelope: QaSandboxEnvelope = {
      version: 1,
      sessionId: this.policy.sessionId,
      generation: this.policy.generation,
      capabilityId: this.policy.capabilityId,
      save: this.save,
    };
    this.storage.setItem(this.key, JSON.stringify(envelope));
  }

  dispose(): void {
    this.storage?.removeItem(this.key);
  }
}
