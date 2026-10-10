import type { DuelActionDefinition, DuelPlayerId } from "./model";
import type { DuelTacticalMapEffect } from "./tactical";

export type DuelCombatEffect =
  | {
      type: "damage";
      targetId: DuelPlayerId;
      amount: number;
      sourceId?: DuelPlayerId;
    }
  | {
      type: "shield";
      targetId: DuelPlayerId;
      amount: number;
    }
  | {
      type: "repair";
      targetId: DuelPlayerId;
      amount: number;
    }
  | {
      type: "energy";
      targetId: DuelPlayerId;
      amount: number;
    }
  | {
      type: "energy-cost";
      targetId: DuelPlayerId;
      amount: number;
    };

export type DuelActionResolution = {
  effects: DuelCombatEffect[];
  tacticalEffects: Array<Omit<DuelTacticalMapEffect, "id">>;
};

function opponent(playerId: DuelPlayerId): DuelPlayerId {
  return playerId === "player-1" ? "player-2" : "player-1";
}

export function resolveDuelAction(
  action: DuelActionDefinition,
  playerId: DuelPlayerId,
): DuelActionResolution {
  const targetId = opponent(playerId);
  const effects: DuelCombatEffect[] = [];
  const tacticalEffects: Array<
    Omit<DuelTacticalMapEffect, "id">
  > = [];

  if (action.energyCost > 0) {
    effects.push({
      type: "energy-cost",
      targetId: playerId,
      amount: action.energyCost,
    });
  }

  switch (action.effectId) {
    case "rapid-laser":
      effects.push({
        type: "damage",
        targetId,
        sourceId: playerId,
        amount: 10,
      });
      break;
    case "guided-missile":
      effects.push({
        type: "damage",
        targetId,
        sourceId: playerId,
        amount: 18,
      });
      break;
    case "heavy-railgun":
      effects.push({
        type: "damage",
        targetId,
        sourceId: playerId,
        amount: 24,
      });
      break;
    case "delayed-bomb":
      effects.push({
        type: "damage",
        targetId,
        sourceId: playerId,
        amount: 20,
      });
      break;
    case "siege-lance":
      effects.push({
        type: "damage",
        targetId,
        sourceId: playerId,
        amount: 28,
      });
      break;
    case "shield-charge":
      effects.push({
        type: "shield",
        targetId: playerId,
        amount: 14,
      });
      break;
    case "reflect-guard":
      effects.push({
        type: "shield",
        targetId: playerId,
        amount: 10,
      });
      tacticalEffects.push({
        effectId: "projectile-drag",
        sourcePlayerId: playerId,
        targetPlayerId: targetId,
        strength: 0.18,
        remainingSeconds: 4,
      });
      break;
    case "barrier-charge":
      effects.push({
        type: "shield",
        targetId: playerId,
        amount: 18,
      });
      break;
    case "hull-repair":
      effects.push({
        type: "repair",
        targetId: playerId,
        amount: 14,
      });
      break;
    case "energy-gain":
      effects.push({
        type: "energy",
        targetId: playerId,
        amount: 22,
      });
      break;
    case "amplify-field":
      effects.push({
        type: "energy",
        targetId: playerId,
        amount: 8,
      });
      tacticalEffects.push({
        effectId: "control-pressure",
        sourcePlayerId: playerId,
        targetPlayerId: null,
        strength: 0.12,
        remainingSeconds: 6,
      });
      break;
    case "repair-drone-charge":
      effects.push({
        type: "repair",
        targetId: playerId,
        amount: 10,
      });
      break;
    case "lock-on":
      tacticalEffects.push({
        effectId: "control-pressure",
        sourcePlayerId: playerId,
        targetPlayerId: targetId,
        strength: 0.25,
        remainingSeconds: 5,
      });
      break;
    case "gravity-well":
      tacticalEffects.push({
        effectId: "projectile-drag",
        sourcePlayerId: playerId,
        targetPlayerId: targetId,
        strength: 0.3,
        remainingSeconds: 5,
      });
      break;
    case "disrupt":
      tacticalEffects.push({
        effectId: "offer-drift",
        sourcePlayerId: playerId,
        targetPlayerId: targetId,
        strength: 0.45,
        remainingSeconds: 4,
      });
      break;
    case "scan":
      tacticalEffects.push({
        effectId: "bank-reveal",
        sourcePlayerId: playerId,
        targetPlayerId: targetId,
        strength: 1,
        remainingSeconds: 4,
      });
      break;
  }

  return { effects, tacticalEffects };
}
