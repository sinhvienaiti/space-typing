import { WARP_POLICY, type WarpCharge } from "../economy/warp-charge";
import type { Sortie, SortieContext } from "../persistence/account-state";

/**
 * Why a paid Deploy cannot start, or null. `warp` is already reconciled.
 * Free runs (Practice, reviews, Test Lab previews) and a prepared sortie,
 * paid when it was admitted, need no Warp. Reserve counts: Deploy asks
 * before it uses Reserve.
 */
export function deployWarpBlocker(
  warp: WarpCharge,
  options: { free: boolean; prepared: boolean },
): string | null {
  if (options.free || options.prepared) return null;
  const missing = WARP_POLICY.cost - warp.current - warp.reserve;
  return missing > 0
    ? `Not enough Warp · ${missing} more to Deploy. Practice is free.`
    : null;
}

/**
 * The prepared sortie a Deploy resumes without a second charge, or null when
 * none is prepared. A prepared sortie for another context must be continued
 * or abandoned first; nothing is spent before that is settled.
 */
export function resumablePreparedSortie(
  attempt: Sortie | null,
  context: SortieContext,
): string | null {
  if (attempt === null || attempt.phase !== "prepared") return null;
  if (JSON.stringify(attempt.context) !== JSON.stringify(context))
    throw new Error("Continue or abandon the prepared sortie first");
  return attempt.id;
}

/** The paid sortie a launch puts live just before its stage starts. */
export type LaunchSortie = {
  /** Prepared → active. */
  activate(): Promise<unknown>;
  /** Active → prepared again, for a stage that never started. */
  deactivate(): Promise<unknown>;
};

const SORTIE_KEPT = "Sortie kept: Deploy again resumes it, no new Warp";

/**
 * One launch from the hangar or a result screen. Every change the launch
 * makes before its stage runs (flags, title deck, music) registers how to put
 * it back. `start` leaves a running stage or throws; `abort` then undoes the
 * launch's changes, newest first, and does nothing once the stage runs.
 */
export class LaunchTransaction {
  private undo: (() => void)[] = [];
  private settled = false;

  /** Registers how to put back a change this launch made. */
  onAbort(undo: () => void): void {
    if (!this.settled) this.undo.push(undo);
  }

  /**
   * Puts the sortie live and starts the stage. `blocker` is read right
   * before activation, so a refusal there keeps the sortie prepared. If the
   * stage still refuses after activation (the microphone dropped while it
   * was saved), the sortie goes back to prepared: its Warp is never spent on
   * a stage that did not start.
   */
  async start(
    sortie: LaunchSortie | null,
    blocker: () => string | null,
    startStage: () => boolean,
  ): Promise<void> {
    if (this.settled) throw new Error("This launch is already settled");
    const refused = (reason: string): Error =>
      new Error(sortie === null ? reason : `${reason} · ${SORTIE_KEPT}`);
    const before = blocker();
    if (before !== null) throw refused(before);
    if (sortie !== null) await sortie.activate();
    if (!startStage()) {
      if (sortie !== null) await sortie.deactivate();
      throw refused(blocker() ?? "The stage could not start");
    }
    this.settled = true;
    this.undo = [];
  }

  /** Undoes the launch's changes, newest first; a no-op once the stage runs. */
  abort(): void {
    if (this.settled) return;
    this.settled = true;
    const undo = this.undo.reverse();
    this.undo = [];
    for (const step of undo) {
      try {
        step();
      } catch (error) {
        console.error("Unable to undo a launch step.", error);
      }
    }
  }
}
