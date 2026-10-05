import {
  evaluateAlternativeRankedGate,
  type AlternativeRankedEvidence,
  type AlternativeRankedGateReason,
  type AlternativeRankedMode,
  type AlternativeRatingNamespace,
} from "./alternative-ranked-gate";

export type AlternativeRankedAdmission =
  | {
      ok: true;
      mode: AlternativeRankedMode;
      ratingNamespace: AlternativeRatingNamespace;
    }
  | {
      ok: false;
      mode: AlternativeRankedMode;
      reasons: readonly AlternativeRankedGateReason[];
    };

/**
 * Server-side queue admission boundary. The browser cannot override evidence,
 * rating namespace, or the release flag. Keep this in front of any future
 * Reflex/Word Chain ranked ticket creation.
 */
export function authorizeAlternativeRankedQueue(input: {
  mode: AlternativeRankedMode;
  releaseFlagEnabled: boolean;
  evidence: AlternativeRankedEvidence;
}): AlternativeRankedAdmission {
  const gate = evaluateAlternativeRankedGate(input);
  return gate.enabled
    ? {
        ok: true,
        mode: input.mode,
        ratingNamespace: gate.ratingNamespace,
      }
    : {
        ok: false,
        mode: input.mode,
        reasons: gate.reasons,
      };
}
