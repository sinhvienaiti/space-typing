import {
  materializeShipRuntimeSession,
  type ShipRuntimeProjectileArchetype,
  type ShipRuntimeSession,
  type ShipRuntimeVisualOverride,
} from "./ship-runtime-policy";
import { isCharacterId, type CharacterId } from "../characters/registry";
import { withPlayerProjectileRuntimeSession } from "../characters/projectiles";
import {
  characterVisualProfile,
  withCharacterVisualRuntimeSession,
  type CharacterVisualProfile,
} from "../characters/visuals";
import {
  preloadShipRuntimeImages,
  releaseShipRuntimeImages,
  withCharacterShipMediaRuntimeSession,
} from "../characters/ship-media-runtime";

export type ShipAssetPreviewCandidate = Readonly<{
  characterId: CharacterId;
  imageAssetVersionId: string | null;
  projectileArchetype: ShipRuntimeProjectileArchetype | null;
  visual: Readonly<ShipRuntimeVisualOverride>;
  session: ShipRuntimeSession;
}>;

export class ShipAssetPreviewError extends Error {}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function materializeCandidate(
  characterId: CharacterId,
  visual: unknown,
  imageAssetVersionId?: unknown,
  projectileArchetype?: unknown,
): ShipAssetPreviewCandidate {
  if (object(visual) === null) throw new ShipAssetPreviewError("Ship preview visual must be an object.");
  const session = materializeShipRuntimeSession({
    activeRevision: "admin-preview-ephemeral",
    applyBoundary: "new-session",
    policy: {
      configRevision: "admin-preview-ephemeral",
      ships: {
        [characterId]: {
          visual,
          ...(imageAssetVersionId === undefined ? {} : { imageAssetVersionId }),
          ...(projectileArchetype === undefined ? {} : { projectileArchetype }),
        },
      },
    },
  });
  const materialized = session.ships[characterId];
  const sanitized = materialized?.visual;
  if (session.source !== "published" || sanitized === undefined) {
    throw new ShipAssetPreviewError("Ship preview candidate was rejected by the canonical runtime validator.");
  }
  if (imageAssetVersionId !== undefined && materialized?.imageAssetVersionId === undefined) {
    throw new ShipAssetPreviewError("Ship preview image assignment was rejected by the canonical runtime validator.");
  }
  if (projectileArchetype !== undefined && materialized?.projectileArchetype === undefined) {
    throw new ShipAssetPreviewError("Ship preview projectile recipe was rejected by the canonical runtime validator.");
  }
  return Object.freeze({
    characterId,
    imageAssetVersionId: materialized?.imageAssetVersionId ?? null,
    projectileArchetype: materialized?.projectileArchetype ?? null,
    visual: sanitized,
    session,
  });
}

export function createShipAssetPreviewCandidate(
  characterId: string,
  visual: unknown,
  imageAssetVersionId?: unknown,
  projectileArchetype?: unknown,
): ShipAssetPreviewCandidate {
  if (!isCharacterId(characterId)) throw new ShipAssetPreviewError("Unknown Ship preview characterId.");
  return materializeCandidate(characterId, visual, imageAssetVersionId, projectileArchetype);
}

export function updateShipAssetPreviewCandidate(
  candidate: ShipAssetPreviewCandidate,
  visualPatch: unknown,
): ShipAssetPreviewCandidate {
  const patch = object(visualPatch);
  if (patch === null) throw new ShipAssetPreviewError("Ship preview tuning patch must be an object.");
  return materializeCandidate(
    candidate.characterId,
    {
      ...candidate.visual,
      ...patch,
    },
    candidate.imageAssetVersionId ?? undefined,
    candidate.projectileArchetype ?? undefined,
  );
}

export async function prepareShipAssetPreviewCandidate(
  candidate: ShipAssetPreviewCandidate,
  fetchImpl: typeof fetch,
  imageFactory: () => HTMLImageElement,
): Promise<ShipAssetPreviewCandidate> {
  if (candidate.imageAssetVersionId !== null) {
    await preloadShipRuntimeImages(candidate.session, fetchImpl, imageFactory);
  }
  return candidate;
}

export function releaseShipAssetPreviewCandidate(candidate: ShipAssetPreviewCandidate): void {
  releaseShipRuntimeImages(candidate.session);
}

/** Exact presentation values consumed by the production renderer for this candidate. */
export function shipAssetPreviewPresentation(
  candidate: ShipAssetPreviewCandidate,
): Readonly<CharacterVisualProfile> {
  return characterVisualProfile(candidate.characterId, candidate.session);
}

/**
 * Executes the real production renderer/projectile resolver under the
 * candidate's isolated Ship runtime sessions. No PlayerSave, ShopInstance,
 * published definition or active runtime session is mutated.
 */
export function withShipAssetPreviewRuntime<T>(
  candidate: ShipAssetPreviewCandidate,
  render: () => T,
): T {
  return withCharacterVisualRuntimeSession(candidate.session, () =>
    withCharacterShipMediaRuntimeSession(candidate.session, () =>
      withPlayerProjectileRuntimeSession(candidate.session, render)));
}
