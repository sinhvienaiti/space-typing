import { describe, expect, it, vi } from "vitest";
import {
  runWalletPurchase,
  type PaidPurchase,
  type WalletPurchaseSteps,
} from "../src/economy/wallet-purchase";
import type { SpendResult } from "../src/online/wallet-sync";

/** A purchase whose steps log their order; the lock is a plain flag, as in the game. */
function purchase(overrides: Partial<WalletPurchaseSteps> = {}) {
  const log: string[] = [];
  const lock = { held: false };
  const steps: WalletPurchaseSteps = {
    blocker: () => (lock.held ? "Please wait for the current purchase to finish." : null),
    lock: (held) => {
      lock.held = held;
      log.push(held ? "lock" : "unlock");
    },
    pay: async () => {
      log.push("pay");
      return { ok: true, opId: "spend-1" };
    },
    apply: () => {
      log.push("apply");
    },
    save: async () => {
      log.push("save");
      return true;
    },
    rollback: () => {
      log.push("rollback");
    },
    refund: async () => {
      log.push("refund");
    },
    settle: async () => {
      log.push("settle");
    },
    rerender: () => {
      log.push("rerender:" + (lock.held ? "locked" : "free"));
    },
    ...overrides,
  };
  return { steps, log, lock };
}

describe("wallet purchase runner", () => {
  it("pays, applies, saves and settles under one lock, then redraws unlocked", async () => {
    const { steps, log, lock } = purchase();

    await expect(runWalletPurchase(steps)).resolves.toEqual({ status: "saved" });
    expect(log).toEqual(["lock", "pay", "apply", "save", "settle", "unlock", "rerender:free"]);
    expect(lock.held).toBe(false);
  });

  it("refuses without taking the lock while another purchase holds it", async () => {
    const { steps, log, lock } = purchase();
    lock.held = true;

    await expect(runWalletPurchase(steps)).resolves.toEqual({
      status: "refused",
      reason: "Please wait for the current purchase to finish.",
    });
    expect(log).toEqual(["rerender:locked"]);
  });

  it("releases the lock when the wallet refuses the payment, without applying or refunding", async () => {
    const { steps, log, lock } = purchase({
      pay: async () => ({ ok: false, reason: "Not enough on your account" }),
    });

    await expect(runWalletPurchase(steps)).resolves.toEqual({
      status: "refused",
      reason: "Not enough on your account",
    });
    expect(log).toEqual(["lock", "unlock", "rerender:free"]);
    expect(lock.held).toBe(false);
  });

  it("treats a throwing payment as a refusal and releases the lock", async () => {
    const { steps, log } = purchase({
      pay: async () => {
        throw new Error("offline");
      },
    });

    await expect(runWalletPurchase(steps)).resolves.toEqual({ status: "refused", reason: "offline" });
    expect(log).toEqual(["lock", "unlock", "rerender:free"]);
  });

  it("rolls back and refunds at once when apply throws after payment, and releases the lock", async () => {
    const refund = vi.fn<(paid: PaidPurchase) => Promise<void>>(async () => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { steps, log, lock } = purchase({
      apply: () => {
        log.push("apply");
        throw new Error("render failed");
      },
      refund: async (paid) => {
        log.push("refund");
        await refund(paid);
      },
    });

    await expect(runWalletPurchase(steps)).resolves.toEqual({ status: "rolled-back", threw: true });
    expect(log).toEqual(["lock", "pay", "apply", "rollback", "refund", "unlock", "rerender:free"]);
    expect(refund).toHaveBeenCalledWith({ ok: true, opId: "spend-1" });
    expect(lock.held).toBe(false);
    error.mockRestore();
  });

  it("rolls back and refunds a save that was not kept", async () => {
    const { steps, log } = purchase({
      save: async () => {
        log.push("save");
        return false;
      },
    });

    await expect(runWalletPurchase(steps)).resolves.toEqual({ status: "rolled-back", threw: false });
    expect(log).toEqual(["lock", "pay", "apply", "save", "rollback", "refund", "unlock", "rerender:free"]);
  });

  it("still refunds and unlocks when the save and the rollback both throw", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { steps, log, lock } = purchase({
      save: async () => {
        throw new Error("quota");
      },
      rollback: () => {
        log.push("rollback");
        throw new Error("render failed");
      },
    });

    await expect(runWalletPurchase(steps)).resolves.toEqual({ status: "rolled-back", threw: true });
    expect(log).toEqual(["lock", "pay", "apply", "rollback", "refund", "unlock", "rerender:free"]);
    expect(lock.held).toBe(false);
    error.mockRestore();
  });

  it("keeps a saved purchase when settling or redrawing throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { steps, log, lock } = purchase({
      settle: async () => {
        throw new Error("network");
      },
      rerender: () => {
        throw new Error("missing element");
      },
    });

    await expect(runWalletPurchase(steps)).resolves.toEqual({ status: "saved" });
    expect(log).not.toContain("rollback");
    expect(log).not.toContain("refund");
    expect(lock.held).toBe(false);
    error.mockRestore();
  });

  it("leaves the redraw to the caller when no redraw step is given", async () => {
    const { steps, lock } = purchase();
    delete steps.rerender;

    await expect(runWalletPurchase(steps)).resolves.toEqual({ status: "saved" });
    expect(lock.held).toBe(false);
  });

  it("holds the lock while the payment is pending, so a second purchase is refused", async () => {
    let releasePayment: (result: SpendResult) => void = () => undefined;
    const { steps, lock } = purchase({
      pay: () =>
        new Promise<SpendResult>((resolve) => {
          releasePayment = resolve;
        }),
    });

    const first = runWalletPurchase(steps);
    expect(lock.held).toBe(true);
    await expect(runWalletPurchase(steps)).resolves.toMatchObject({ status: "refused" });

    releasePayment({ ok: true, opId: null });
    await expect(first).resolves.toEqual({ status: "saved" });
    expect(lock.held).toBe(false);
  });
});
