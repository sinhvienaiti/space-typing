import {
  ACTIVE_SHIP_RUNTIME_SESSION,
  type ShipRuntimeSession,
} from "../admin/ship-runtime-policy";
import { isCharacterId, type CharacterId } from "./registry";

const MEDIA_RUNTIME_BASE = "/api/runtime/space-typing/media/versions";
const ASSET_VERSION_ID_PATTERN = /^media-version\.[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/webp",
  "image/jpeg",
]);

export type ShipRuntimeMediaComponent = Readonly<{
  role: "primary";
  mimeType: string;
  runtimeUrl: string;
  width?: number;
  height?: number;
}>;

export class ShipRuntimeMediaError extends Error {}

type ImageFactory = () => HTMLImageElement;

const IMAGES_BY_SESSION = new WeakMap<
  ShipRuntimeSession,
  Map<CharacterId, HTMLImageElement>
>();
const LOADS_BY_SESSION = new WeakMap<ShipRuntimeSession, Promise<void>>();
let scopedShipMediaSession: ShipRuntimeSession | null = null;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactAssetVersionId(value: unknown): string {
  if (typeof value !== "string" || !ASSET_VERSION_ID_PATTERN.test(value)) {
    throw new ShipRuntimeMediaError("Ship image assetVersionId is invalid.");
  }
  return value;
}

function safeRuntimeUrl(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    throw new ShipRuntimeMediaError("Ship image runtimeUrl must be a same-origin runtime path.");
  }
  return value;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && (value as number) > 0 ? value as number : undefined;
}

export async function resolveExactShipImageComponent(
  fetchImpl: typeof fetch,
  assetVersionId: string,
  endpointBase = MEDIA_RUNTIME_BASE,
): Promise<ShipRuntimeMediaComponent> {
  const exactId = exactAssetVersionId(assetVersionId);
  const response = await fetchImpl(`${endpointBase}/${encodeURIComponent(exactId)}`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new ShipRuntimeMediaError(`Ship image version ${exactId} could not be resolved (${response.status}).`);
  }

  const input = object(await response.json());
  if (
    input === null ||
    input.schemaVersion !== 1 ||
    input.assetVersionId !== exactId ||
    input.kind !== "image" ||
    !Array.isArray(input.components)
  ) {
    throw new ShipRuntimeMediaError("Ship image runtime response is incompatible.");
  }

  const primary = input.components
    .map(object)
    .find((component) => component?.role === "primary");
  if (primary === undefined) {
    throw new ShipRuntimeMediaError("Ship image version has no primary component.");
  }
  if (typeof primary.mimeType !== "string" || !ALLOWED_IMAGE_MIME_TYPES.has(primary.mimeType)) {
    throw new ShipRuntimeMediaError("Ship image primary component has an unsupported image MIME type.");
  }

  return Object.freeze({
    role: "primary" as const,
    mimeType: primary.mimeType,
    runtimeUrl: safeRuntimeUrl(primary.runtimeUrl),
    ...(optionalPositiveInteger(primary.width) === undefined
      ? {}
      : { width: optionalPositiveInteger(primary.width) }),
    ...(optionalPositiveInteger(primary.height) === undefined
      ? {}
      : { height: optionalPositiveInteger(primary.height) }),
  });
}

async function loadRuntimeImage(
  component: ShipRuntimeMediaComponent,
  imageFactory: ImageFactory,
): Promise<HTMLImageElement> {
  const image = imageFactory();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new ShipRuntimeMediaError("Ship image bytes could not be decoded."));
    image.src = component.runtimeUrl;
  });
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    image.src = "";
    throw new ShipRuntimeMediaError("Ship image decoded with invalid dimensions.");
  }
  return image;
}

export function shipRuntimeImageAssetVersionId(
  id: CharacterId,
  session: ShipRuntimeSession = scopedShipMediaSession ?? ACTIVE_SHIP_RUNTIME_SESSION,
): string | null {
  return session.ships[id]?.imageAssetVersionId ?? null;
}

export function characterShipRuntimeImage(
  id: CharacterId,
  session: ShipRuntimeSession = scopedShipMediaSession ?? ACTIVE_SHIP_RUNTIME_SESSION,
): HTMLImageElement | null {
  return IMAGES_BY_SESSION.get(session)?.get(id) ?? null;
}

export async function preloadShipRuntimeImages(
  session: ShipRuntimeSession,
  fetchImpl: typeof fetch,
  imageFactory: ImageFactory,
): Promise<void> {
  const existing = LOADS_BY_SESSION.get(session);
  if (existing !== undefined) return existing;

  const load = (async () => {
    const images = new Map<CharacterId, HTMLImageElement>();
    for (const [id, override] of Object.entries(session.ships)) {
      if (!isCharacterId(id) || override.imageAssetVersionId === undefined) continue;
      const component = await resolveExactShipImageComponent(fetchImpl, override.imageAssetVersionId);
      images.set(id, await loadRuntimeImage(component, imageFactory));
    }
    IMAGES_BY_SESSION.set(session, images);
  })();
  LOADS_BY_SESSION.set(session, load);
  try {
    await load;
  } catch (error) {
    LOADS_BY_SESSION.delete(session);
    throw error;
  }
}

export function withCharacterShipMediaRuntimeSession<T>(
  session: ShipRuntimeSession,
  render: () => T,
): T {
  const previous = scopedShipMediaSession;
  scopedShipMediaSession = session;
  try {
    return render();
  } finally {
    scopedShipMediaSession = previous;
  }
}

export function releaseShipRuntimeImages(session: ShipRuntimeSession): void {
  const images = IMAGES_BY_SESSION.get(session);
  if (images !== undefined) {
    for (const image of images.values()) image.src = "";
  }
  IMAGES_BY_SESSION.delete(session);
  LOADS_BY_SESSION.delete(session);
}

if (
  typeof window !== "undefined" &&
  typeof window.fetch === "function" &&
  typeof Image !== "undefined"
) {
  void preloadShipRuntimeImages(
    ACTIVE_SHIP_RUNTIME_SESSION,
    window.fetch.bind(window),
    () => new Image(),
  ).catch((error: unknown) => {
    console.warn("Published Ship image assignment failed soft; bundled Ship art remains active.", error);
  });
}
