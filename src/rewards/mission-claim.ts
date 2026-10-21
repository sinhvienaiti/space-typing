/**
 * A mission reward claim (src/progression/missions.ts) kept only with its
 * save (src/rewards/reward-claim.ts). No DOM: src/main.ts supplies the
 * account. A claim that is not kept takes back exactly what it added and
 * nothing else, so a balance the server wallet adopted while it saved stays
 * and no later earning is reported under the mission's opId.
 */
import { addCredits } from "../economy/credits";
import { claimMission, type MissionId, type ProgressionState } from "../progression/missions";
import { claimWithRollback, type RewardClaimOutcome } from "./reward-claim";

export type MissionClaimAccount<Recovery> = {
  progression: ProgressionState;
  credits: number;
  /** Crash-recovery state the save rewrites before it is flushed. */
  recovery: Recovery;
};

export type MissionClaimHost<Recovery> = {
  /** Why nothing may be claimed now (the shared reward-claim blocker), or null. */
  blocker(): string | null;
  lock(held: boolean): void;
  read(): MissionClaimAccount<Recovery>;
  write(account: MissionClaimAccount<Recovery>): void;
  /** Names the next earning a committed save reports (WalletSync.hint). */
  hint(source: string, opId?: string): void;
  /** Saves with this notice; true once kept. */
  save(message: string): Promise<boolean>;
  render(): void;
};

/** Claims one mission under the claim lock; null when it has nothing to claim. */
export async function claimMissionWithRollback<Recovery>(
  host: MissionClaimHost<Recovery>,
  id: MissionId,
): Promise<RewardClaimOutcome | null> {
  const result = claimMission(host.read().progression, id);
  if (!result.claimed) return null;
  let gained = 0;
  return claimWithRollback({
    blocker: () => host.blocker(),
    lock: (held) => host.lock(held),
    capture: () => host.read(),
    apply: () => {
      host.hint("mission", "mission:" + id);
      const account = host.read();
      const credits = addCredits(account.credits, result.rewardCredits);
      host.write({ ...account, progression: result.state, credits });
      gained = credits - account.credits;
      host.render();
    },
    save: () =>
      host.save("✓ Mission reward · +" + result.rewardCredits.toLocaleString() + " Credits"),
    restore: (before) => {
      // "other" carries no opId, the same as no hint: the mission's id stays free for its real claim.
      host.hint("other");
      host.write({
        progression: before.progression,
        credits: Math.max(0, host.read().credits - gained),
        recovery: before.recovery,
      });
    },
  });
}
