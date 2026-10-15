export const RUNTIME_MEDIA_BASE = "/api/runtime/space-typing/media";

const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const SAME_ORIGIN_PATH = /^\/(?!\/)/;

export type RuntimeMediaComponent = Readonly<{
  role: string;
  mimeType: string;
  storageClass: "admin-blob" | "runtime-reference";
  runtimeUrl: string;
  format?: string;
  sha256?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}>;

export type RuntimeMediaVersion = Readonly<{
  schemaVersion: 1;
  assetId: string;
  assetVersionId: string;
  kind: "image" | "model" | "music" | "sfx" | "audio" | "data";
  provenance: "admin-upload" | "generated-runtime" | "code-owned" | "external-reference";
  contentFingerprint: string;
  components: readonly RuntimeMediaComponent[];
}>;

export type ReliefRuntimeBundle = Readonly<{
  assetId: string;
  assetVersionId: string;
  modelUrl: string;
  colorUrl: string;
  emissiveUrl: string;
  heightUrl: string;
}>;

export class RuntimeMediaValidationError extends Error {}

function fail(message: string): never {
  throw new RuntimeMediaValidationError(message);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${path} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, pattern?: RegExp): string {
  if (typeof value !== "string" || value.length === 0 || (pattern !== undefined && !pattern.test(value))) {
    fail(`${path} is invalid.`);
  }
  return value;
}

function optionalPositiveNumber(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) fail(`${path} must be a positive finite number.`);
  return value;
}

function component(value: unknown, index: number): RuntimeMediaComponent {
  const input = record(value, `components[${index}]`);
  const role = text(input.role, `components[${index}].role`, /^[a-z][a-z0-9._-]{0,79}$/);
  const mimeType = text(input.mimeType, `components[${index}].mimeType`, /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i);
  const storageClass = input.storageClass;
  if (storageClass !== "admin-blob" && storageClass !== "runtime-reference") {
    fail(`components[${index}].storageClass is not runtime-consumable.`);
  }
  const runtimeUrl = text(input.runtimeUrl, `components[${index}].runtimeUrl`, SAME_ORIGIN_PATH);
  const output: {
    role: string;
    mimeType: string;
    storageClass: "admin-blob" | "runtime-reference";
    runtimeUrl: string;
    format?: string;
    sha256?: string;
    byteSize?: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
  } = { role, mimeType, storageClass, runtimeUrl };
  if (input.format !== undefined) output.format = text(input.format, `components[${index}].format`, /^[a-z0-9.+-]{1,32}$/i);
  if (input.sha256 !== undefined) output.sha256 = text(input.sha256, `components[${index}].sha256`, /^[a-f0-9]{64}$/);
  const byteSize = optionalPositiveNumber(input.byteSize, `components[${index}].byteSize`);
  const width = optionalPositiveNumber(input.width, `components[${index}].width`);
  const height = optionalPositiveNumber(input.height, `components[${index}].height`);
  const durationSeconds = optionalPositiveNumber(input.durationSeconds, `components[${index}].durationSeconds`);
  if (byteSize !== undefined) output.byteSize = byteSize;
  if (width !== undefined) output.width = width;
  if (height !== undefined) output.height = height;
  if (durationSeconds !== undefined) output.durationSeconds = durationSeconds;
  return Object.freeze(output);
}

export function validateRuntimeMediaVersion(value: unknown, expectedAssetVersionId?: string): RuntimeMediaVersion {
  const input = record(value, "runtime media version");
  if (input.schemaVersion !== 1) fail("runtime media version schemaVersion must be 1.");
  const assetId = text(input.assetId, "assetId", ID_PATTERN);
  const assetVersionId = text(input.assetVersionId, "assetVersionId", ID_PATTERN);
  if (expectedAssetVersionId !== undefined && assetVersionId !== expectedAssetVersionId) {
    fail("Runtime media response does not match the requested exact assetVersionId.");
  }
  const kind = input.kind;
  if (!["image", "model", "music", "sfx", "audio", "data"].includes(String(kind))) fail("kind is invalid.");
  const provenance = input.provenance;
  if (!["admin-upload", "generated-runtime", "code-owned", "external-reference"].includes(String(provenance))) {
    fail("provenance is invalid.");
  }
  const contentFingerprint = text(input.contentFingerprint, "contentFingerprint", /^[a-f0-9]{64}$/);
  if (!Array.isArray(input.components) || input.components.length === 0) fail("components must not be empty.");
  const components = input.components.map(component);
  const roles = new Set<string>();
  for (const item of components) {
    if (roles.has(item.role)) fail(`Duplicate runtime media component role: ${item.role}.`);
    roles.add(item.role);
  }
  return Object.freeze({
    schemaVersion: 1,
    assetId,
    assetVersionId,
    kind: kind as RuntimeMediaVersion["kind"],
    provenance: provenance as RuntimeMediaVersion["provenance"],
    contentFingerprint,
    components: Object.freeze(components),
  });
}

export async function fetchExactRuntimeMediaVersion(
  assetVersionId: string,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<RuntimeMediaVersion> {
  if (!ID_PATTERN.test(assetVersionId) || assetVersionId === "current" || assetVersionId === "latest") {
    fail("A canonical exact assetVersionId is required.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${RUNTIME_MEDIA_BASE}/versions/${encodeURIComponent(assetVersionId)}`, {
    cache: "no-store",
    signal: options.signal,
  });
  if (!response.ok) throw new Error(`Runtime media resolution failed (${response.status}).`);
  return validateRuntimeMediaVersion(await response.json(), assetVersionId);
}

function requireRole(version: RuntimeMediaVersion, role: string, mimeType: string, format: string): RuntimeMediaComponent {
  const found = version.components.find((item) => item.role === role);
  if (found === undefined) fail(`Relief bundle is missing ${role}.`);
  if (found.mimeType !== mimeType || found.format !== format) fail(`Relief bundle ${role} has an unsupported format.`);
  return found;
}

export function resolveCurrentReliefRuntimeBundle(value: unknown, expectedAssetVersionId?: string): ReliefRuntimeBundle {
  const version = validateRuntimeMediaVersion(value, expectedAssetVersionId);
  if (version.kind !== "model" || version.provenance !== "generated-runtime") {
    fail("Current relief profile requires a generated-runtime model version.");
  }
  if (version.components.length !== 4) fail("Current relief profile requires exactly four components.");
  const model = requireRole(version, "model", "application/json", "json");
  const color = requireRole(version, "color", "image/webp", "webp");
  const emissive = requireRole(version, "emissive", "image/webp", "webp");
  const height = requireRole(version, "height", "application/octet-stream", "bin");
  return Object.freeze({
    assetId: version.assetId,
    assetVersionId: version.assetVersionId,
    modelUrl: model.runtimeUrl,
    colorUrl: color.runtimeUrl,
    emissiveUrl: emissive.runtimeUrl,
    heightUrl: height.runtimeUrl,
  });
}
