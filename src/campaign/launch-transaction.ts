import { WARP_POLICY, type WarpCharge } from "../economy/warp-charge";
import type { InputMode } from "../input/mode";
import type { Sortie, SortieContext } from "../persistence/account-state";
import type { GamePhase } from "../types";

/**
 * Why a paid Deploy looks unavailable, or null. `warp` is already reconciled.
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
 * Why a Deploy click is refused before anything is saved, or null. A server
 * wallet decides itself: this device's tanks may be behind the server's
 * (a gift or a refuel elsewhere), and the server refuses a Deploy it
 * cannot cover without charging anything.
 */
export function deployWarpRefusal(
  warp: WarpCharge,
  options: { free: boolean; prepared: boolean; serverWallet: boolean },
): string | null {
  return options.serverWallet ? null : deployWarpBlocker(warp, options);
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

/**
 * What a launch does first with the account's open sortie:
 * - none: nothing open, or a prepared sortie this Deploy resumes;
 * - drop-prepared: Practice ends a prepared (paid) sortie, once the player agrees;
 * - fail: Practice ends the running sortie as failed;
 * - commit-clear: a cleared stage whose settlement has not saved yet saves it;
 * - abandon: a restart closes the running sortie, once the next Deploy passed its preflight.
 */
export type OpenSortieStep =
  | "none"
  | "drop-prepared"
  | "fail"
  | "commit-clear"
  | "abandon";

export function openSortieStep(input: {
  practice: boolean;
  canWrite: boolean;
  phase: GamePhase;
  attempt: Sortie["phase"] | null;
}): OpenSortieStep {
  if (!input.canWrite || input.attempt === null) return "none";
  if (input.practice)
    return input.attempt === "prepared" ? "drop-prepared" : "fail";
  if (input.attempt === "prepared") return "none";
  if (input.phase === "stageclear" && input.attempt === "active")
    return "commit-clear";
  return "abandon";
}

/** The paid sortie a launch puts live just before its stage starts. */
export type LaunchSortie = {
  /** The input mode the sortie was paid for; a kept sortie resumes only in it. */
  inputMode: InputMode;
  /** Prepared → active. */
  activate(): Promise<unknown>;
  /** Active → prepared again, for a stage that never started. */
  deactivate(): Promise<unknown>;
};

/** Spends the Warp for a paid sortie, or resumes the prepared sortie holding it. */
export type LaunchPayment = () => Promise<LaunchSortie>;

function sortieKept(mode: InputMode): string {
  if (mode === "typing")
    return "Sortie kept: Deploy again resumes it, no new Warp";
  const label = mode === "voice" ? "Voice" : "Hybrid";
  return `Sortie kept for ${label}: connect the microphone and Deploy again, no new Warp`;
}

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
   * Pays for the sortie, puts it live and starts the stage. `blocker` is read
   * before the Warp is spent and again before activation, so a refusal there
   * spends nothing or keeps the paid sortie prepared. If the stage still
   * refuses (or throws) after activation, the sortie goes back to prepared:
   * its Warp is never spent on a stage that did not start.
   */
  async start(
    prepare: LaunchPayment | null,
    blocker: () => string | null,
    startStage: () => boolean,
  ): Promise<void> {
    if (this.settled) throw new Error("This launch is already settled");
    const before = blocker();
    if (before !== null) throw new Error(before);
    const sortie = prepare === null ? null : await prepare();
    const refused = (reason: string): Error =>
      new Error(
        sortie === null ? reason : `${reason} · ${sortieKept(sortie.inputMode)}`,
      );
    const ready = blocker();
    if (ready !== null) throw refused(ready);
    if (sortie !== null) await sortie.activate();
    let started: boolean;
    try {
      started = startStage();
    } catch (error) {
      if (sortie !== null)
        await sortie.deactivate().catch((reason: unknown) => {
          console.error("Unable to keep the sortie after a failed start.", reason);
        });
      throw error;
    }
    if (!started) {
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

/** The steps of one launch, in the order `runLaunch` runs them. */
export type LaunchPlan = {
  /**
   * Every refusal, before anything is saved, spent or shown. Returns how the
   * sortie is paid for; null: a free run.
   */
  preflight(): Promise<LaunchPayment | null>;
  /** The stage-entry recovery save; false stops the launch (it says why). */
  save(): Promise<boolean>;
  /** Read before `present`: how to put back what it shows. */
  presentationUndo(): () => void;
  /** Stage music and the launch animation. */
  present(): Promise<void>;
  /** Why the stage cannot start right now, or null. */
  blocker(): string | null;
  /** False: the stage refused to start and nothing changed. */
  startStage(): boolean;
};

/**
 * Runs a launch: preflight → save → presentation → Warp → stage. The Warp is
 * spent after the animation, right before the stage starts, so a microphone
 * that drops during the animation costs nothing. True when the stage runs.
 */
export async function runLaunch(
  launch: LaunchTransaction,
  plan: LaunchPlan,
): Promise<boolean> {
  const payment = await plan.preflight();
  if (!(await plan.save())) return false;
  launch.onAbort(plan.presentationUndo());
  await plan.present();
  await launch.start(payment, plan.blocker, plan.startStage);
  return true;
}
