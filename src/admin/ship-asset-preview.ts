import {
  materializeShipRuntimeSession,
  type ShipRuntimeSession,
  type ShipRuntimeVisualOverride,
} from "./ship-runtime-policy";
import { isCharacterId, type CharacterId } from "../characters/registry";
import {
  characterVisualProfile,
  withCharacterVisualRuntimeSession,
  type CharacterVisualProfile,
} from "../characters/visuals";

export type ShipAssetPreviewCandidate = Readonly<{
  characterId: CharacterId;
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
): ShipAssetPreviewCandidate {
  if (object(visual) === null) throw new ShipAssetPreviewError("Ship preview visual must be an object.");
  const session = materializeShipRuntimeSession({
    activeRevision: "admin-preview-ephemeral",
    applyBoundary: "new-session",
    policy: {
      configRevision: "admin-preview-ephemeral",
      ships: {
        [characterId]: { visual },
      },
    },
  });
  const sanitized = session.ships[characterId]?.visual;
  if (session.source !== "published" || sanitized === undefined) {
    throw new ShipAssetPreviewError("Ship preview visual candidate was rejected by the canonical runtime validator.");
  }
  return Object.freeze({
    characterId,
    visual: sanitized,
    session,
  });
}

export function createShipAssetPreviewCandidate(
  characterId: string,
  visual: unknown,
): ShipAssetPreviewCandidate {
  if (!isCharacterId(characterId)) throw new ShipAssetPreviewError("Unknown Ship preview characterId.");
  return materializeCandidate(characterId, visual);
}

export function updateShipAssetPreviewCandidate(
  candidate: ShipAssetPreviewCandidate,
  visualPatch: unknown,
): ShipAssetPreviewCandidate {
  const patch = object(visualPatch);
  if (patch === null) throw new ShipAssetPreviewError("Ship preview tuning patch must be an object.");
  return materializeCandidate(candidate.characterId, {
    ...candidate.visual,
    ...patch,
  });
}

/** Exact presentation values consumed by the production renderer for this candidate. */
export function shipAssetPreviewPresentation(
  candidate: ShipAssetPreviewCandidate,
): Readonly<CharacterVisualProfile> {
  return characterVisualProfile(candidate.characterId, candidate.session);
}

/**
 * Executes the real production renderer under the candidate's isolated visual
 * session. No PlayerSave, ShopInstance, published definition or active
 * runtime session is mutated.
 */
export function withShipAssetPreviewRuntime<T>(
  candidate: ShipAssetPreviewCandidate,
  render: () => T,
): T {
  return withCharacterVisualRuntimeSession(candidate.session, render);
}
