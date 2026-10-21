import type { SpendResult } from "../online/wallet-sync";

/**
 * One wallet purchase, run from payment to save under a single lock.
 * Pure control flow, no DOM: the game supplies each step (src/main.ts).
 */

/** A payment the wallet took (opId null: no server wallet to confirm or refund). */
export type PaidPurchase = Extract<SpendResult, { ok: true }>;

export type WalletPurchaseOutcome =
  | { status: "saved" }
  | { status: "refused"; reason: string }
  /** Paid, then not kept: the local state is restored and the price refunded. */
  | { status: "rolled-back"; threw: boolean };

export type WalletPurchaseSteps = {
  /** Why no purchase may start now, a running one included; null to go ahead. */
  blocker(): string | null;
  /** Holds or releases the purchase lock that claims, Deploy and cloud sync wait on. */
  lock(held: boolean): void;
  /** Takes the price, or refuses without taking anything. */
  pay(): Promise<SpendResult>;
  /** Puts the bought item and the new balances in place. */
  apply(paid: PaidPurchase): void;
  /** Saves the item with its receipt; true only when both were kept. */
  save(paid: PaidPurchase): Promise<boolean>;
  /** Restores everything `apply` and `save` changed. */
  rollback(): void;
  /** Gives the price back. */
  refund(paid: PaidPurchase): Promise<void>;
  /** Takes the wallet's balances once the purchase is saved. */
  settle(): Promise<void>;
  /** Redraws the offer after the lock is released, whatever happened. */
  rerender?(): void;
};

const PAY_FAILED = "Purchase failed. Please retry.";

/**
 * Runs one purchase. The lock is held from payment until the save is
 * settled or undone, and always released; anything after payment that
 * fails or throws is rolled back and refunded at once, never rejected.
 */
export async function runWalletPurchase(steps: WalletPurchaseSteps): Promise<WalletPurchaseOutcome> {
  const blocked = steps.blocker();
  const outcome: WalletPurchaseOutcome = blocked === null
    ? await purchaseUnderLock(steps)
    : { status: "refused", reason: blocked };
  guarded("redraw", () => steps.rerender?.());
  return outcome;
}

async function purchaseUnderLock(steps: WalletPurchaseSteps): Promise<WalletPurchaseOutcome> {
  steps.lock(true);
  try {
    let paid: SpendResult;
    try {
      paid = await steps.pay();
    } catch (error) {
      return { status: "refused", reason: error instanceof Error ? error.message : PAY_FAILED };
    }
    if (!paid.ok) return { status: "refused", reason: paid.reason };
    let threw = false;
    try {
      steps.apply(paid);
      if (await steps.save(paid)) {
        await guardedAsync("settle", () => steps.settle());
        return { status: "saved" };
      }
    } catch (error) {
      threw = true;
      console.error("Wallet purchase failed after payment.", error);
    }
    guarded("rollback", () => steps.rollback());
    await guardedAsync("refund", () => steps.refund(paid));
    return { status: "rolled-back", threw };
  } finally {
    steps.lock(false);
  }
}

function guarded(step: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error("Wallet purchase " + step + " failed.", error);
  }
}

async function guardedAsync(step: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.error("Wallet purchase " + step + " failed.", error);
  }
}
