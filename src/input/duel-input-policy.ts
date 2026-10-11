import type { InputMode } from "./mode";

export type RankedDuelInputAdmission =
  | { allowed: true; mode: "typing" }
  | { allowed: false; mode: Exclude<InputMode, "typing">; reason: string };

/**
 * Ranked is intentionally fail-closed until Voice/Hybrid can submit through
 * the same authoritative Duel TYPE_CHAR transport as keyboard input. This
 * prevents a selected Voice/Hybrid profile from silently falling back to a
 * keyboard-only Ranked match or steering a local runtime outside authority.
 */
export function rankedDuelInputAdmission(
  mode: InputMode,
): RankedDuelInputAdmission {
  if (mode === "typing") return { allowed: true, mode };
  return {
    allowed: false,
    mode,
    reason:
      "Ranked Duel currently supports Typing input only. Select Typing before joining the Ranked queue.",
  };
}
