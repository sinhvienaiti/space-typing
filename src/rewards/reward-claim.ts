/**
 * A reward claim that is kept only with its save: applied, saved, or put
 * back exactly as it was. Pure control flow, no DOM (src/main.ts supplies
 * the steps), so a refused or failed claim never shows a reward that a
 * reload would take away.
 */

export type RewardClaimOutcome = { ok: true } | { ok: false; reason: string };

export type RewardClaimSteps<Before> = {
  /** Why nothing may be claimed now, a claim still saving included; null to go ahead. */
  blocker(): string | null;
  /** Holds or releases the claim lock for the length of the save. */
  lock(held: boolean): void;
  /** The state the claim changes, kept for a rollback. */
  capture(): Before;
  apply(): void;
  /** True once the claim is saved. */
  save(): Promise<boolean>;
  restore(before: Before): void;
};

export const CLAIM_NOT_SAVED = "Could not save. Try again.";

/** Applies and saves a claim under the lock; a failed or throwing step restores the captured state. */
export async function claimWithRollback<Before>(steps: RewardClaimSteps<Before>): Promise<RewardClaimOutcome> {
  const blocked = steps.blocker();
  if (blocked !== null) return { ok: false, reason: blocked };
  const before = steps.capture();
  steps.lock(true);
  try {
    try {
      steps.apply();
      if (await steps.save()) return { ok: true };
    } catch (error) {
      console.error("Unable to save the reward claim.", error);
    }
    steps.restore(before);
    return { ok: false, reason: CLAIM_NOT_SAVED };
  } finally {
    steps.lock(false);
  }
}
