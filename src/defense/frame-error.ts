import type { Phase } from "./rules/engine";

/**
 * Whether a throwing frame pauses the Rift Defense run (main.ts). Only a run
 * in play is paused: building or in a wave, with no overlay open. The pause
 * menu replaces every other overlay and resuming closes it, so a boon pick or
 * a word review under it would be lost and the run stuck in that phase.
 */
export function pausesOnFrameError(run: {
  phase: Phase | null;
  paused: boolean;
  overlayOpen: boolean;
}): boolean {
  return (
    (run.phase === "build" || run.phase === "wave") &&
    !run.paused &&
    !run.overlayOpen
  );
}
