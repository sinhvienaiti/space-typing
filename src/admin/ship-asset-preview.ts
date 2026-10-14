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
import {
  DuelShip3D,
  type Ship3DFrame,
  type Ship3DPose,
} from "../duel/ship3d";

export type ShipAssetPreviewCandidate = Readonly<{
  characterId: CharacterId;
  imageAssetVersionId: string | null;
  projectileArchetype: ShipRuntimeProjectileArchetype | null;
  reliefAssetVersionId: string | null;
  reliefPreviewRequested: boolean;
  visual: Readonly<ShipRuntimeVisualOverride>;
  session: ShipRuntimeSession;
}>;

export class ShipAssetPreviewError extends Error {}

const reliefPreviewShips = new WeakMap<ShipAssetPreviewCandidate, DuelShip3D>();

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
  reliefAssetVersionId?: unknown,
): ShipAssetPreviewCandidate {
  if (object(visual) === null) throw new ShipAssetPreviewError("Ship preview visual must be an object.");
  const reliefPreviewRequested = reliefAssetVersionId !== undefined;
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
          ...(reliefAssetVersionId === undefined || reliefAssetVersionId === null
            ? {}
            : { reliefAssetVersionId }),
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
  if (
    reliefAssetVersionId !== undefined &&
    reliefAssetVersionId !== null &&
    materialized?.reliefAssetVersionId === undefined
  ) {
    throw new ShipAssetPreviewError("Ship preview relief bundle was rejected by the canonical runtime validator.");
  }
  return Object.freeze({
    characterId,
    imageAssetVersionId: materialized?.imageAssetVersionId ?? null,
    projectileArchetype: materialized?.projectileArchetype ?? null,
    reliefAssetVersionId: materialized?.reliefAssetVersionId ?? null,
    reliefPreviewRequested,
    visual: sanitized,
    session,
  });
}

export function createShipAssetPreviewCandidate(
  characterId: string,
  visual: unknown,
  imageAssetVersionId?: unknown,
  projectileArchetype?: unknown,
  reliefAssetVersionId?: unknown,
): ShipAssetPreviewCandidate {
  if (!isCharacterId(characterId)) throw new ShipAssetPreviewError("Unknown Ship preview characterId.");
  return materializeCandidate(
    characterId,
    visual,
    imageAssetVersionId,
    projectileArchetype,
    reliefAssetVersionId,
  );
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
    candidate.reliefPreviewRequested ? candidate.reliefAssetVersionId : undefined,
  );
}

export async function prepareShipAssetPreviewCandidate(
  candidate: ShipAssetPreviewCandidate,
  fetchImpl: typeof fetch,
  imageFactory: () => HTMLImageElement,
): Promise<ShipAssetPreviewCandidate> {
  try {
    if (candidate.imageAssetVersionId !== null) {
      await preloadShipRuntimeImages(candidate.session, fetchImpl, imageFactory);
    }
    if (candidate.reliefPreviewRequested) {
      const previous = reliefPreviewShips.get(candidate);
      previous?.dispose();
      reliefPreviewShips.delete(candidate);
      const ship = await DuelShip3D.loadFresh(candidate.characterId, "self", {
        reliefAssetVersionId: candidate.reliefAssetVersionId,
      });
      if (ship === null) {
        throw new ShipAssetPreviewError(
          "Ship relief preview could not materialize through the production 3D runtime.",
        );
      }
      reliefPreviewShips.set(candidate, ship);
    }
    return candidate;
  } catch (error) {
    releaseShipRuntimeImages(candidate.session);
    reliefPreviewShips.get(candidate)?.dispose();
    reliefPreviewShips.delete(candidate);
    throw error;
  }
}

export function releaseShipAssetPreviewCandidate(candidate: ShipAssetPreviewCandidate): void {
  releaseShipRuntimeImages(candidate.session);
  reliefPreviewShips.get(candidate)?.dispose();
  reliefPreviewShips.delete(candidate);
}

export function shipAssetPreviewHasRelief(candidate: ShipAssetPreviewCandidate): boolean {
  return reliefPreviewShips.has(candidate);
}

export function renderShipAssetPreviewRelief(
  candidate: ShipAssetPreviewCandidate,
  pose: Ship3DPose,
): Ship3DFrame | null {
  return reliefPreviewShips.get(candidate)?.render(pose) ?? null;
}

export function flashShipAssetPreviewRelief(
  candidate: ShipAssetPreviewCandidate,
  gunIndex: number,
): void {
  reliefPreviewShips.get(candidate)?.flash(gunIndex);
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