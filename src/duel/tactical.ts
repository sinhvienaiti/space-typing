import type { DuelPlayerId } from "./model";

export type DuelTacticalMapEffectId =
  | "offer-drift"
  | "projectile-drag"
  | "bank-reveal"
  | "target-freeze"
  | "control-pressure";

export type DuelTacticalMapEffect = {
  id: string;
  effectId: DuelTacticalMapEffectId;
  sourcePlayerId: DuelPlayerId;
  targetPlayerId: DuelPlayerId | null;
  strength: number;
  remainingSeconds: number;
};

export type DuelTacticalMapSnapshot = {
  offerDriftScale: Readonly<Record<DuelPlayerId, number>>;
  projectileSpeedScale: Readonly<Record<DuelPlayerId, number>>;
  frozenTargetCount: Readonly<Record<DuelPlayerId, number>>;
  controlPressure: Readonly<Record<DuelPlayerId, number>>;
  bankRevealFor: Readonly<Record<DuelPlayerId, boolean>>;
};

export class DuelTacticalMapState {
  private readonly effects: DuelTacticalMapEffect[] = [];
  private sequence = 0;

  apply(
    effect: Omit<DuelTacticalMapEffect, "id">,
  ): DuelTacticalMapEffect {
    const next: DuelTacticalMapEffect = {
      ...effect,
      id: "tactical:" + String(++this.sequence),
      strength: Math.max(
        0,
        Math.min(
          1,
          Number.isFinite(effect.strength) ? effect.strength : 0,
        ),
      ),
      remainingSeconds: Math.max(
        0,
        Number.isFinite(effect.remainingSeconds)
          ? effect.remainingSeconds
          : 0,
      ),
    };
    this.effects.push(next);
    return { ...next };
  }

  update(dtSeconds: number): void {
    const dt = Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );
    let write = 0;
    for (const effect of this.effects) {
      effect.remainingSeconds -= dt;
      if (effect.remainingSeconds > 0) {
        this.effects[write++] = effect;
      }
    }
    this.effects.length = write;
  }

  isTargetFrozen(playerId: DuelPlayerId): boolean {
    return this.effects.some(
      (effect) =>
        effect.effectId === "target-freeze" &&
        effect.targetPlayerId === playerId &&
        effect.remainingSeconds > 0,
    );
  }

  snapshot(): DuelTacticalMapSnapshot {
    const offerDriftScale: Record<DuelPlayerId, number> = {
      "player-1": 1,
      "player-2": 1,
    };
    const projectileSpeedScale: Record<DuelPlayerId, number> = {
      "player-1": 1,
      "player-2": 1,
    };
    const frozenTargetCount: Record<DuelPlayerId, number> = {
      "player-1": 0,
      "player-2": 0,
    };
    const controlPressure: Record<DuelPlayerId, number> = {
      "player-1": 0,
      "player-2": 0,
    };
    const bankRevealFor: Record<DuelPlayerId, boolean> = {
      "player-1": false,
      "player-2": false,
    };

    for (const effect of this.effects) {
      switch (effect.effectId) {
        case "offer-drift":
          if (effect.targetPlayerId !== null) {
            offerDriftScale[effect.targetPlayerId] *=
              1 - effect.strength * 0.35;
          }
          break;
        case "projectile-drag":
          if (effect.targetPlayerId !== null) {
            projectileSpeedScale[effect.targetPlayerId] *=
              1 - effect.strength * 0.4;
          }
          break;
        case "bank-reveal":
          if (effect.targetPlayerId !== null) {
            bankRevealFor[effect.sourcePlayerId] = true;
          }
          break;
        case "target-freeze":
          if (effect.targetPlayerId !== null) {
            frozenTargetCount[effect.targetPlayerId] += 1;
          }
          break;
        case "control-pressure":
          controlPressure[effect.sourcePlayerId] += effect.strength;
          break;
      }
    }

    for (const playerId of ["player-1", "player-2"] as const) {
      offerDriftScale[playerId] = Math.max(
        0.5,
        offerDriftScale[playerId],
      );
      projectileSpeedScale[playerId] = Math.max(
        0.5,
        projectileSpeedScale[playerId],
      );
    }

    return {
      offerDriftScale,
      projectileSpeedScale,
      frozenTargetCount,
      controlPressure,
      bankRevealFor,
    };
  }

  clear(): void {
    this.effects.length = 0;
  }
}
