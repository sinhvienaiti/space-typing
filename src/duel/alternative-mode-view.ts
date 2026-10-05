import type { DuelGameMode } from "./game-mode";
import type { ReflexPlayerPublicState, ReflexPublicChallenge } from "./reflex";
import type { WordChainPlayerPublicState, WordChainPublicBeat } from "./word-chain";

export type DuelAlternativeGameMode = Exclude<DuelGameMode, "standard">;

/**
 * Browser-safe, player-scoped state for alternative Duel modes.
 * Competitive answer material and rival private buffers are intentionally
 * absent from this contract.
 */
export type DuelAlternativeModePlayerView =
  | Readonly<{
      gameMode: "reflex";
      modeEpoch: number;
      challenge: ReflexPublicChallenge | null;
      player: ReflexPlayerPublicState;
    }>
  | Readonly<{
      gameMode: "word-chain";
      modeEpoch: number;
      beat: WordChainPublicBeat | null;
      player: WordChainPlayerPublicState;
    }>;

export function isDuelAlternativeModePlayerView(
  value: unknown,
): value is DuelAlternativeModePlayerView {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const source = value as Record<string, unknown>;
  if (
    (source.gameMode !== "reflex" && source.gameMode !== "word-chain") ||
    !Number.isSafeInteger(source.modeEpoch) ||
    (source.modeEpoch as number) <= 0 ||
    typeof source.player !== "object" ||
    source.player === null ||
    Array.isArray(source.player)
  ) {
    return false;
  }
  if (source.gameMode === "reflex") {
    return source.challenge === null ||
      (typeof source.challenge === "object" &&
        source.challenge !== null &&
        !Array.isArray(source.challenge));
  }
  return source.beat === null ||
    (typeof source.beat === "object" &&
      source.beat !== null &&
      !Array.isArray(source.beat));
}
