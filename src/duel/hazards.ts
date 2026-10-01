import type {
  DuelCataclysmEvent,
  DuelHazardEvent,
} from "./director";
import type { DuelCombatEffect } from "./combat";
import type {
  DuelPlayerId,
} from "./model";
import type {
  DuelTacticalMapEffect,
} from "./tactical";

export type DuelHazardResolution = {
  effects: DuelCombatEffect[];
  tacticalEffects: Array<
    Omit<DuelTacticalMapEffect, "id">
  >;
};

const PLAYERS: readonly DuelPlayerId[] = [
  "player-1",
  "player-2",
];

function protectionScale(
  controlPressure: Readonly<Record<DuelPlayerId, number>>,
  playerId: DuelPlayerId,
): number {
  const pressure = Math.max(
    0,
    Math.min(
      1,
      Number.isFinite(controlPressure[playerId])
        ? controlPressure[playerId]
        : 0,
    ),
  );
  return 1 - pressure * 0.25;
}

function symmetricDamage(
  amount: number,
  controlPressure: Readonly<Record<DuelPlayerId, number>>,
): DuelCombatEffect[] {
  return PLAYERS.map((playerId) => ({
    type: "damage" as const,
    targetId: playerId,
    amount:
      Math.max(0, amount) *
      protectionScale(controlPressure, playerId),
  }));
}

function symmetricEnergyCost(
  amount: number,
  controlPressure: Readonly<Record<DuelPlayerId, number>>,
): DuelCombatEffect[] {
  return PLAYERS.map((playerId) => ({
    type: "energy-cost" as const,
    targetId: playerId,
    amount:
      Math.max(0, amount) *
      protectionScale(controlPressure, playerId),
  }));
}

function symmetricEnergy(
  amount: number,
): DuelCombatEffect[] {
  return PLAYERS.map((playerId) => ({
    type: "energy" as const,
    targetId: playerId,
    amount: Math.max(0, amount),
  }));
}

function symmetricShield(
  amount: number,
): DuelCombatEffect[] {
  return PLAYERS.map((playerId) => ({
    type: "shield" as const,
    targetId: playerId,
    amount: Math.max(0, amount),
  }));
}

function tacticalBoth(
  effectId:
    | "offer-drift"
    | "projectile-drag"
    | "target-freeze",
  strength: number,
  seconds: number,
): Array<Omit<DuelTacticalMapEffect, "id">> {
  return PLAYERS.map((playerId) => ({
    effectId,
    sourcePlayerId: playerId,
    targetPlayerId: playerId,
    strength,
    remainingSeconds: seconds,
  }));
}

function tacticalHazardBoth(
  hazard: DuelHazardEvent,
  effectId:
    | "offer-drift"
    | "projectile-drag"
    | "target-freeze",
  strength: number,
  seconds: number,
  controlPressure: Readonly<Record<DuelPlayerId, number>>,
): Array<Omit<DuelTacticalMapEffect, "id">> {
  return PLAYERS.map((playerId) => {
    const protection =
      hazard.symmetry === "contest"
        ? protectionScale(controlPressure, playerId)
        : 1;
    return {
      effectId,
      sourcePlayerId: playerId,
      targetPlayerId: playerId,
      strength: strength * protection,
      remainingSeconds:
        effectId === "target-freeze"
          ? seconds * protection
          : seconds,
    };
  });
}

export function resolveDuelHazard(
  hazard: DuelHazardEvent,
  controlPressure: Readonly<Record<DuelPlayerId, number>>,
): DuelHazardResolution {
  const effects: DuelCombatEffect[] = [];
  const tacticalEffects: Array<
    Omit<DuelTacticalMapEffect, "id">
  > = [];
  const pressure = Math.max(
    0.5,
    Math.min(1.8, hazard.pressure),
  );

  const damage = (base: number): void => {
    effects.push(
      ...symmetricDamage(
        Math.min(8, base * pressure),
        controlPressure,
      ),
    );
  };
  const energyCost = (base: number): void => {
    effects.push(
      ...symmetricEnergyCost(
        Math.min(7, base * pressure),
        controlPressure,
      ),
    );
  };
  const drift = (
    strength: number,
    seconds: number,
  ): void => {
    tacticalEffects.push(
      ...tacticalHazardBoth(
        hazard,
        "offer-drift",
        Math.min(0.65, strength * pressure),
        seconds,
        controlPressure,
      ),
    );
  };
  const drag = (
    strength: number,
    seconds: number,
  ): void => {
    tacticalEffects.push(
      ...tacticalHazardBoth(
        hazard,
        "projectile-drag",
        Math.min(0.7, strength * pressure),
        seconds,
        controlPressure,
      ),
    );
  };

  switch (hazard.hazardId) {
    case "blizzard":
      drag(0.22, 4.5);
      drift(0.12, 3.5);
      break;
    case "ice-shatter":
      damage(4);
      break;
    case "whiteout":
      drift(0.28, 4.5);
      break;
    case "freeze-lock":
      tacticalEffects.push(
        ...tacticalHazardBoth(
          hazard,
          "target-freeze",
          0.25,
          2.2,
          controlPressure,
        ),
      );
      break;
    case "frozen-meteor":
      damage(6);
      break;

    case "fire-tornado":
      damage(2.5);
      drag(0.2, 3.5);
      break;
    case "lava-burst":
      damage(5);
      break;
    case "ember-rain":
      damage(3);
      break;
    case "magma-crack":
      energyCost(4);
      break;
    case "infernal-surge":
      damage(6);
      break;

    case "lightning-storm":
      damage(2);
      effects.push(...symmetricEnergy(4));
      break;
    case "cyclone":
      drag(0.3, 4.5);
      break;
    case "static-field":
      drift(0.24, 4);
      break;
    case "thunderfall":
      damage(5);
      break;
    case "tempest-wall":
      drag(0.44, 5);
      break;

    case "whirlpool":
      drag(0.32, 4.5);
      break;
    case "tidal-surge":
      damage(4);
      break;
    case "deep-fog":
      drift(0.26, 4.5);
      break;
    case "pressure-crush":
      energyCost(5);
      break;
    case "bubble-field":
      effects.push(...symmetricShield(5));
      break;

    case "quake":
      damage(3);
      break;
    case "rockfall":
      damage(5);
      break;
    case "dust-storm":
      drift(0.22, 4);
      break;
    case "fault-line":
      energyCost(4);
      break;
    case "spike-ridge":
      damage(6);
      break;

    case "black-hole":
      drag(0.42, 5);
      drift(0.18, 4);
      break;
    case "gravity-vortex":
      drag(0.36, 4.5);
      break;
    case "time-fracture":
      drift(0.3, 4.5);
      break;
    case "star-collapse":
      damage(6);
      break;
    case "void-wave":
      energyCost(5);
      break;
  }

  return { effects, tacticalEffects };
}

export function resolveDuelCataclysm(
  cataclysm: DuelCataclysmEvent,
): DuelHazardResolution {
  const strength = Math.max(
    0.25,
    Math.min(
      0.65,
      (cataclysm.pressureMultiplier - 1) * 0.55,
    ),
  );
  const tacticalEffects: Array<
    Omit<DuelTacticalMapEffect, "id">
  > = [];

  switch (cataclysm.cataclysmId) {
    case "absolute-zero":
      tacticalEffects.push(
        ...tacticalBoth("projectile-drag", strength, 8),
      );
      break;
    case "world-burn":
      tacticalEffects.push(
        ...tacticalBoth("offer-drift", strength * 0.75, 7),
      );
      break;
    case "eye-of-the-storm":
      tacticalEffects.push(
        ...tacticalBoth("projectile-drag", strength, 7),
        ...tacticalBoth("offer-drift", strength * 0.55, 5),
      );
      break;
    case "abyss-rise":
      tacticalEffects.push(
        ...tacticalBoth("projectile-drag", strength * 0.8, 8),
      );
      break;
    case "planet-break":
      tacticalEffects.push(
        ...tacticalBoth("offer-drift", strength * 0.65, 7),
      );
      break;
    case "reality-collapse":
      tacticalEffects.push(
        ...tacticalBoth("projectile-drag", strength, 8),
        ...tacticalBoth("offer-drift", strength * 0.7, 8),
      );
      break;
  }

  return {
    effects: [],
    tacticalEffects,
  };
}
