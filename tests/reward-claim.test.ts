import { describe, expect, it, vi } from "vitest";
import {
  CLAIM_NOT_SAVED,
  claimWithRollback,
  type RewardClaimSteps,
} from "../src/rewards/reward-claim";

type Account = { credits: number; claimed: string[] };

/** A mission-style claim over a small account; the lock feeds the blocker, as in the game. */
function claim(account: Account, overrides: Partial<RewardClaimSteps<Account>> = {}) {
  const lock = { held: false, history: [] as boolean[] };
  const steps: RewardClaimSteps<Account> = {
    blocker: () => (lock.held ? "Saving… try again in a moment." : null),
    lock: (held) => {
      lock.held = held;
      lock.history.push(held);
    },
    capture: () => ({ credits: account.credits, claimed: account.claimed }),
    apply: () => {
      account.credits += 100;
      account.claimed = [...account.claimed, "clear-5"];
    },
    save: async () => true,
    restore: (before) => {
      account.credits = before.credits;
      account.claimed = before.claimed;
    },
    ...overrides,
  };
  return { steps, lock };
}

describe("claimWithRollback", () => {
  it("keeps a claim once its save succeeds", async () => {
    const account: Account = { credits: 50, claimed: [] };
    const { steps, lock } = claim(account);

    await expect(claimWithRollback(steps)).resolves.toEqual({ ok: true });
    expect(account).toEqual({ credits: 150, claimed: ["clear-5"] });
    expect(lock.history).toEqual([true, false]);
  });

  it("changes nothing when the blocker refuses (a read-only tab)", async () => {
    const account: Account = { credits: 50, claimed: [] };
    const apply = vi.fn();
    const { steps, lock } = claim(account, {
      blocker: () => "Read-only account in this tab. Close other Space Typing tabs.",
      apply,
    });

    await expect(claimWithRollback(steps)).resolves.toEqual({
      ok: false,
      reason: "Read-only account in this tab. Close other Space Typing tabs.",
    });
    expect(apply).not.toHaveBeenCalled();
    expect(account).toEqual({ credits: 50, claimed: [] });
    expect(lock.history).toEqual([]);
  });

  it("restores the reward when the save is not kept, so the mission stays claimable", async () => {
    const account: Account = { credits: 50, claimed: [] };
    const { steps, lock } = claim(account, { save: async () => false });

    await expect(claimWithRollback(steps)).resolves.toEqual({ ok: false, reason: CLAIM_NOT_SAVED });
    expect(account).toEqual({ credits: 50, claimed: [] });
    expect(lock.held).toBe(false);
  });

  it("restores the reward when applying or saving throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const account: Account = { credits: 50, claimed: [] };
    const throwingSave = claim(account, {
      save: async () => {
        throw new Error("QuotaExceededError");
      },
    });
    await expect(claimWithRollback(throwingSave.steps)).resolves.toEqual({ ok: false, reason: CLAIM_NOT_SAVED });
    expect(account).toEqual({ credits: 50, claimed: [] });

    const throwingApply = claim(account, {
      apply: () => {
        account.credits += 100;
        throw new Error("render failed");
      },
    });
    await expect(claimWithRollback(throwingApply.steps)).resolves.toEqual({ ok: false, reason: CLAIM_NOT_SAVED });
    expect(account).toEqual({ credits: 50, claimed: [] });
    expect(throwingApply.lock.held).toBe(false);
    error.mockRestore();
  });

  it("refuses a second claim while the first is still saving", async () => {
    const account: Account = { credits: 50, claimed: [] };
    let finishSave: (saved: boolean) => void = () => undefined;
    const { steps } = claim(account, {
      save: () =>
        new Promise<boolean>((resolve) => {
          finishSave = resolve;
        }),
    });

    const first = claimWithRollback(steps);
    await expect(claimWithRollback(steps)).resolves.toEqual({ ok: false, reason: "Saving… try again in a moment." });
    finishSave(true);
    await expect(first).resolves.toEqual({ ok: true });
    expect(account.credits).toBe(150);
  });
});
