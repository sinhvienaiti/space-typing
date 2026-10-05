import type {
  DuelEngine,
  DuelEngineEvent,
} from "../../src/duel/engine";
import type { DuelPlayerId } from "../../src/duel/model";
import type {
  DuelModeAttack,
  DuelModeCombatPort,
} from "./mode-runtime";

type PendingModeAttack = Readonly<{
  attack: DuelModeAttack;
  dueAtMs: number;
}>;

/**
 * Production adapter between alternative-mode authority and the existing Duel
 * combat engine. Alternative modes may schedule attacks, but damage is only
 * applied when the authority clock reaches projectile impact.
 *
 * The emitted cannon-fired/cannon-hit events intentionally reuse the existing
 * battlefield renderer contract instead of introducing a second renderer.
 */
export class DuelModeEngineCombatPort implements DuelModeCombatPort {
  private clockMs = 0;
  private readonly pending: PendingModeAttack[] = [];
  private readonly events: DuelEngineEvent[] = [];

  constructor(private readonly engine: DuelEngine) {}

  setAuthorityClock(nowMs: number): void {
    if (!Number.isFinite(nowMs)) return;
    this.clockMs = Math.max(this.clockMs, Math.trunc(nowMs));
  }

  scheduleModeAttack(attack: DuelModeAttack): void {
    const dueAtMs = this.clockMs + attack.travelMs;
    this.pending.push({
      attack: { ...attack },
      dueAtMs,
    });
    this.pending.sort(
      (left, right) =>
        left.dueAtMs - right.dueAtMs ||
        left.attack.attackId.localeCompare(right.attack.attackId),
    );

    // Both currently shipped alternative modes use the primary cannon. Keep
    // this event on the existing renderer path so the projectile visual and
    // server-owned impact deadline describe the same shot.
    this.events.push({
      type: "cannon-fired",
      playerId: attack.sourcePlayerId,
      shotId: attack.attackId,
      travelMs: attack.travelMs,
    });
  }

  advanceAuthorityClock(nowMs: number): readonly DuelEngineEvent[] {
    this.setAuthorityClock(nowMs);
    if (this.pending.length === 0) return this.drainEvents();

    while (
      this.pending.length > 0 &&
      this.pending[0]!.dueAtMs <= this.clockMs
    ) {
      const pending = this.pending.shift()!;
      const sourcePlayerId = pending.attack.sourcePlayerId;
      const targetPlayerId: DuelPlayerId =
        sourcePlayerId === "player-1" ? "player-2" : "player-1";

      // Reuse DuelEngine shield/hull/terminal-state resolution. No browser
      // callback and no alternative-mode module can apply damage directly.
      const engineEvents = this.engine.applyTickEffects([
        {
          type: "damage",
          sourceId: sourcePlayerId,
          targetId: targetPlayerId,
          amount: pending.attack.damage,
        },
      ]);
      this.events.push({
        type: "cannon-hit",
        playerId: sourcePlayerId,
        targetPlayerId,
        shotId: pending.attack.attackId,
      });
      this.events.push(...engineEvents);
    }

    return this.drainEvents();
  }

  drainEvents(): readonly DuelEngineEvent[] {
    if (this.events.length === 0) return [];
    const drained = this.events.map((event) => ({ ...event }));
    this.events.length = 0;
    return drained;
  }

  clear(): void {
    this.pending.length = 0;
    this.events.length = 0;
  }

  pendingCount(): number {
    return this.pending.length;
  }
}
