import type { DuelPlayerId } from "./model";

export type DuelCooldownSnapshot = Readonly<
  Record<string, number>
>;

const PLAYER_IDS: readonly DuelPlayerId[] = [
  "player-1",
  "player-2",
];

export class DuelCooldownState {
  private readonly remainingByPlayer: Record<
    DuelPlayerId,
    Map<string, number>
  > = {
    "player-1": new Map(),
    "player-2": new Map(),
  };

  update(dtSeconds: number): void {
    const dt = Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );
    if (dt <= 0) return;

    for (const playerId of PLAYER_IDS) {
      const cooldowns = this.remainingByPlayer[playerId];
      for (const [actionId, remaining] of cooldowns) {
        const next = remaining - dt;
        if (next <= 0) {
          cooldowns.delete(actionId);
        } else {
          cooldowns.set(actionId, next);
        }
      }
    }
  }

  activate(
    playerId: DuelPlayerId,
    actionId: string,
    seconds: number,
  ): void {
    const duration = Math.max(
      0,
      Number.isFinite(seconds) ? seconds : 0,
    );
    if (duration <= 0) return;

    const cooldowns = this.remainingByPlayer[playerId];
    cooldowns.set(
      actionId,
      Math.max(
        cooldowns.get(actionId) ?? 0,
        duration,
      ),
    );
  }

  remaining(
    playerId: DuelPlayerId,
    actionId: string,
  ): number {
    return Math.max(
      0,
      this.remainingByPlayer[playerId].get(actionId) ?? 0,
    );
  }

  isReady(
    playerId: DuelPlayerId,
    actionId: string,
  ): boolean {
    return this.remaining(playerId, actionId) <= 0;
  }

  reduce(
    playerId: DuelPlayerId,
    seconds: number,
  ): void {
    const amount = Math.max(
      0,
      Number.isFinite(seconds) ? seconds : 0,
    );
    if (amount <= 0) return;

    const cooldowns = this.remainingByPlayer[playerId];
    for (const [actionId, remaining] of cooldowns) {
      const next = remaining - amount;
      if (next <= 0) {
        cooldowns.delete(actionId);
      } else {
        cooldowns.set(actionId, next);
      }
    }
  }

  snapshotFor(
    playerId: DuelPlayerId,
  ): DuelCooldownSnapshot {
    return Object.freeze(
      Object.fromEntries(
        [...this.remainingByPlayer[playerId].entries()]
          .filter(([, remaining]) => remaining > 0)
          .sort(([left], [right]) =>
            left.localeCompare(right),
          )
          .map(([actionId, remaining]) => [
            actionId,
            remaining,
          ]),
      ),
    );
  }

  clear(): void {
    for (const playerId of PLAYER_IDS) {
      this.remainingByPlayer[playerId].clear();
    }
  }
}
