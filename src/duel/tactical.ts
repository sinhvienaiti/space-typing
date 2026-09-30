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
  offerDriftScale: number;
  projectileSpeedScale: number;
  frozenTargetCount: number;
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

  snapshot(): DuelTacticalMapSnapshot {
    let offerDriftScale = 1;
    let projectileSpeedScale = 1;
    let frozenTargetCount = 0;
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
          offerDriftScale *= 1 - effect.strength * 0.35;
          break;
        case "projectile-drag":
          projectileSpeedScale *= 1 - effect.strength * 0.4;
          break;
        case "bank-reveal":
          if (effect.targetPlayerId !== null) {
            bankRevealFor[effect.sourcePlayerId] = true;
          }
          break;
        case "target-freeze":
          frozenTargetCount += 1;
          break;
        case "control-pressure":
          controlPressure[effect.sourcePlayerId] += effect.strength;
          break;
      }
    }

    return {
      offerDriftScale: Math.max(0.5, offerDriftScale),
      projectileSpeedScale: Math.max(0.5, projectileSpeedScale),
      frozenTargetCount,
      controlPressure,
      bankRevealFor,
    };
  }

  clear(): void {
    this.effects.length = 0;
  }
}
