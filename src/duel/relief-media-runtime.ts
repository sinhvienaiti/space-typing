const MEDIA_RUNTIME_BASE = "/api/runtime/space-typing/media/versions";
const ASSET_VERSION_ID_PATTERN = /^media-version\.[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const RELIEF_MEDIA_COMPONENT_ROLES = [
  "color",
  "emissive",
  "height",
  "model",
] as const;

export type ReliefMediaComponentRole =
  (typeof RELIEF_MEDIA_COMPONENT_ROLES)[number];

export type ReliefRuntimeMediaComponent = Readonly<{
  role: ReliefMediaComponentRole;
  mimeType: string;
  runtimeUrl: string;
  sha256: string;
  byteSize?: number;
  format?: string;
}>;

export type ReliefRuntimeMediaBundle = Readonly<{
  assetVersionId: string;
  contentFingerprint: string;
  components: Readonly<Record<ReliefMediaComponentRole, ReliefRuntimeMediaComponent>>;
}>;

export class ReliefRuntimeMediaError extends Error {}

const EXPECTED_MIME: Readonly<Record<ReliefMediaComponentRole, string>> = {
  color: "image/webp",
  emissive: "image/webp",
  height: "application/octet-stream",
  model: "application/json",
};

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactAssetVersionId(value: unknown): string {
  if (typeof value !== "string" || !ASSET_VERSION_ID_PATTERN.test(value)) {
    throw new ReliefRuntimeMediaError("Ship relief assetVersionId is invalid.");
  }
  return value;
}

function safeRuntimeUrl(value: unknown, role: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    throw new ReliefRuntimeMediaError(
      `Ship relief ${role} runtimeUrl must be a same-origin runtime path.`,
    );
  }
  return value;
}

function sha256(value: unknown, role: string): string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new ReliefRuntimeMediaError(`Ship relief ${role} component requires SHA-256 metadata.`);
  }
  return value;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && (value as number) > 0 ? value as number : undefined;
}

function optionalFormat(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-z0-9][a-z0-9._+-]{0,31}$/i.test(value)
    ? value.toLowerCase()
    : undefined;
}

function componentRole(value: unknown): ReliefMediaComponentRole | null {
  return typeof value === "string" &&
    (RELIEF_MEDIA_COMPONENT_ROLES as readonly string[]).includes(value)
    ? value as ReliefMediaComponentRole
    : null;
}

function resolveComponent(
  raw: Record<string, unknown>,
  role: ReliefMediaComponentRole,
): ReliefRuntimeMediaComponent {
  if (raw.mimeType !== EXPECTED_MIME[role]) {
    throw new ReliefRuntimeMediaError(
      `Ship relief ${role} component must use ${EXPECTED_MIME[role]}.`,
    );
  }
  const byteSize = optionalPositiveInteger(raw.byteSize);
  const format = optionalFormat(raw.format);
  return Object.freeze({
    role,
    mimeType: EXPECTED_MIME[role],
    runtimeUrl: safeRuntimeUrl(raw.runtimeUrl, role),
    sha256: sha256(raw.sha256, role),
    ...(byteSize === undefined ? {} : { byteSize }),
    ...(format === undefined ? {} : { format }),
  });
}

/**
 * Resolves one immutable Media V2 model version into the four components the
 * current production relief loader actually owns. This deliberately accepts
 * only an exact version id and same-origin runtime URLs; it never resolves a
 * logical asset's current/latest version and never accepts a raw Admin path.
 */
export async function resolveExactShipReliefBundle(
  fetchImpl: typeof fetch,
  assetVersionId: string,
  endpointBase = MEDIA_RUNTIME_BASE,
): Promise<ReliefRuntimeMediaBundle> {
  const exactId = exactAssetVersionId(assetVersionId);
  const response = await fetchImpl(`${endpointBase}/${encodeURIComponent(exactId)}`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new ReliefRuntimeMediaError(
      `Ship relief version ${exactId} could not be resolved (${response.status}).`,
    );
  }

  const input = object(await response.json());
  if (
    input === null ||
    input.schemaVersion !== 1 ||
    input.assetVersionId !== exactId ||
    input.kind !== "model" ||
    typeof input.contentFingerprint !== "string" ||
    !SHA256_PATTERN.test(input.contentFingerprint) ||
    !Array.isArray(input.components)
  ) {
    throw new ReliefRuntimeMediaError("Ship relief runtime response is incompatible.");
  }

  const byRole = new Map<ReliefMediaComponentRole, Record<string, unknown>>();
  for (const value of input.components) {
    const raw = object(value);
    const role = componentRole(raw?.role);
    if (raw === null || role === null) continue;
    if (byRole.has(role)) {
      throw new ReliefRuntimeMediaError(`Ship relief version contains duplicate ${role} components.`);
    }
    byRole.set(role, raw);
  }

  const components = {} as Record<ReliefMediaComponentRole, ReliefRuntimeMediaComponent>;
  for (const role of RELIEF_MEDIA_COMPONENT_ROLES) {
    const raw = byRole.get(role);
    if (raw === undefined) {
      throw new ReliefRuntimeMediaError(`Ship relief version is missing required ${role} component.`);
    }
    components[role] = resolveComponent(raw, role);
  }

  return Object.freeze({
    assetVersionId: exactId,
    contentFingerprint: input.contentFingerprint,
    components: Object.freeze(components),
  });
}
