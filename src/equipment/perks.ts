/**
 * Equipment perks: what makes a Mk.II or Mk.III part more than a stat stick.
 * Every perk is one clear, visible behaviour of a ship system (a drone that
 * snipes, plating that eats a hit, a pod that fires missiles). Game reads the
 * combined numbers (resolveEquipmentPerks) whenever the loadout changes.
 */
export const EQUIPMENT_PERK_IDS = [
  "arc-emitter",
  "overpenetration",
  "plasma-rupture",
  "ablative-plating",
  "reactive-armor",
  "nanite-weave",
  "discharge-shield",
  "harmonic-recharge",
  "phase-shield",
  "efficient-capacitor",
  "kill-siphon",
  "cryo-coolant",
  "hunter-killer",
  "threat-scanner",
  "overcharge-module",
  "escort-drone",
  "interceptor-drone",
  "wing-drones",
  "ignition-core",
  "momentum-core",
  "quantum-core",
] as const;

export type EquipmentPerkId = (typeof EQUIPMENT_PERK_IDS)[number];

export type EquipmentPerkDefinition = {
  id: EquipmentPerkId;
  name: string;
  description: string;
};

export const EQUIPMENT_PERKS: Record<EquipmentPerkId, EquipmentPerkDefinition> = {
  "arc-emitter": {
    id: "arc-emitter",
    name: "Arc Emitter",
    description: "Every 3rd kill arcs lightning into the nearest enemy: it loses 1 letter.",
  },
  overpenetration: {
    id: "overpenetration",
    name: "Overpenetration",
    description: "Kill shots punch through: the next enemy behind in the same lane loses 1 letter.",
  },
  "plasma-rupture": {
    id: "plasma-rupture",
    name: "Plasma Rupture",
    description: "Every 4th perfect-word kill ruptures in plasma: enemies within 170 px lose a shield layer or 1 letter.",
  },
  "ablative-plating": {
    id: "ablative-plating",
    name: "Ablative Plating",
    description: "The first hit of every stage is absorbed completely.",
  },
  "reactive-armor": {
    id: "reactive-armor",
    name: "Reactive Armor",
    description: "When a hit lands, a shock pulse destroys every hostile shot within 240 px.",
  },
  "nanite-weave": {
    id: "nanite-weave",
    name: "Nanite Weave",
    description: "Repairs 0.6 Hull per second after 4 s without taking damage.",
  },
  "discharge-shield": {
    id: "discharge-shield",
    name: "Shield Discharge",
    description: "When your Shield breaks it releases an EMP: every enemy weapon stalls for 2.5 s.",
  },
  "harmonic-recharge": {
    id: "harmonic-recharge",
    name: "Harmonic Recharge",
    description: "Every perfect word restores 3 Shield.",
  },
  "phase-shield": {
    id: "phase-shield",
    name: "Phase Shift",
    description: "Every 18 s, the next hit passes straight through the ship.",
  },
  "efficient-capacitor": {
    id: "efficient-capacitor",
    name: "Low-Loss Capacitor",
    description: "Every skill costs 15% less Energy.",
  },
  "kill-siphon": {
    id: "kill-siphon",
    name: "Wreck Siphon",
    description: "Each kill restores 3 Energy.",
  },
  "cryo-coolant": {
    id: "cryo-coolant",
    name: "Cryo Coolant",
    description: "Skill cooldowns run 18% faster.",
  },
  "hunter-killer": {
    id: "hunter-killer",
    name: "Hunter-Killer Missiles",
    description: "Every 5th kill launches 2 micro-missiles at the closest enemies: 1 letter each.",
  },
  "threat-scanner": {
    id: "threat-scanner",
    name: "Guidance Jammer",
    description: "Hostile shots fly 15% slower.",
  },
  "overcharge-module": {
    id: "overcharge-module",
    name: "Rage Overcharge",
    description: "Rage builds 20% faster.",
  },
  "escort-drone": {
    id: "escort-drone",
    name: "Escort Drone",
    description: "A drone flies at your wing and zaps 1 letter off the closest enemy every 7 s.",
  },
  "interceptor-drone": {
    id: "interceptor-drone",
    name: "Point Defence",
    description: "An interceptor drone shoots down the nearest hostile shot every 5 s.",
  },
  "wing-drones": {
    id: "wing-drones",
    name: "Wing Drones",
    description: "Two escort drones: each zaps 1 letter off the closest enemy every 6 s.",
  },
  "ignition-core": {
    id: "ignition-core",
    name: "Hot Start",
    description: "Start every stage with 25 Rage.",
  },
  "momentum-core": {
    id: "momentum-core",
    name: "Momentum",
    description: "While your streak is 15 or more, bosses take 12% more damage.",
  },
  "quantum-core": {
    id: "quantum-core",
    name: "Quantum Timing",
    description: "Every 8th perfect word cuts all skill cooldowns by 3 s.",
  },
};

/** The combined perk numbers Game applies (0 or 1 = off). */
export type EquipmentPerkEffects = {
  /** Every Nth kill arcs into the nearest enemy (0 = off). */
  arcEveryKills: number;
  /** Kill shots pierce into the next enemy in the lane. */
  overpenetration: boolean;
  /** Every Nth perfect-word kill ruptures in plasma (0 = off). */
  plasmaEveryPerfectKills: number;
  plasmaRadius: number;
  /** Hits absorbed at the start of each stage. */
  stageBlocks: number;
  /** Radius of the pulse that clears hostile shots when hit (0 = off). */
  reactivePulseRadius: number;
  /** Hull per second after `hullRegenDelay` seconds without damage. */
  hullRegen: number;
  hullRegenDelay: number;
  /** Enemy weapon stall when the Shield breaks, seconds (0 = off). */
  shieldBreakStall: number;
  /** Shield restored per perfect word. */
  perfectWordShield: number;
  /** Seconds between phase-shift blocks (0 = off). */
  phaseShieldInterval: number;
  /** Energy cost multiplier for every skill. */
  skillCostMultiplier: number;
  /** Energy restored per kill. */
  killEnergy: number;
  /** Skill cooldown speed (1 = normal). */
  cooldownRate: number;
  /** Every Nth kill launches micro-missiles (0 = off). */
  missileEveryKills: number;
  /** Hostile projectile speed multiplier. */
  hostileShotSpeed: number;
  /** Rage gain multiplier. */
  rageGainMultiplier: number;
  /** Escort drones and the seconds between their zaps. */
  escortDrones: number;
  escortInterval: number;
  /** Interceptor drones and the seconds between their shots. */
  interceptorDrones: number;
  interceptorInterval: number;
  /** Rage at stage start. */
  startingRage: number;
  /** Extra damage while the streak is at least `momentumStreak` (0 = off). */
  momentumStreak: number;
  momentumDamage: number;
  /** Every Nth perfect word cuts all cooldowns (0 = off). */
  quantumEveryPerfect: number;
  quantumCooldownCut: number;
};

export const NO_EQUIPMENT_PERKS: Readonly<EquipmentPerkEffects> = Object.freeze({
  arcEveryKills: 0,
  overpenetration: false,
  plasmaEveryPerfectKills: 0,
  plasmaRadius: 0,
  stageBlocks: 0,
  reactivePulseRadius: 0,
  hullRegen: 0,
  hullRegenDelay: 0,
  shieldBreakStall: 0,
  perfectWordShield: 0,
  phaseShieldInterval: 0,
  skillCostMultiplier: 1,
  killEnergy: 0,
  cooldownRate: 1,
  missileEveryKills: 0,
  hostileShotSpeed: 1,
  rageGainMultiplier: 1,
  escortDrones: 0,
  escortInterval: 0,
  interceptorDrones: 0,
  interceptorInterval: 0,
  startingRage: 0,
  momentumStreak: 0,
  momentumDamage: 0,
  quantumEveryPerfect: 0,
  quantumCooldownCut: 0,
});

export function isEquipmentPerkId(value: unknown): value is EquipmentPerkId {
  return typeof value === "string" && (EQUIPMENT_PERK_IDS as readonly string[]).includes(value);
}

/** Smallest non-zero "every N" value (so two sources keep the faster one). */
function every(current: number, next: number): number {
  return current === 0 ? next : Math.min(current, next);
}

export function resolveEquipmentPerks(ids: readonly EquipmentPerkId[]): EquipmentPerkEffects {
  const effects: EquipmentPerkEffects = { ...NO_EQUIPMENT_PERKS };
  for (const id of new Set(ids)) {
    switch (id) {
      case "arc-emitter":
        effects.arcEveryKills = every(effects.arcEveryKills, 3);
        break;
      case "overpenetration":
        effects.overpenetration = true;
        break;
      case "plasma-rupture":
        effects.plasmaEveryPerfectKills = every(effects.plasmaEveryPerfectKills, 4);
        effects.plasmaRadius = Math.max(effects.plasmaRadius, 170);
        break;
      case "ablative-plating":
        effects.stageBlocks += 1;
        break;
      case "reactive-armor":
        effects.reactivePulseRadius = Math.max(effects.reactivePulseRadius, 240);
        break;
      case "nanite-weave":
        effects.hullRegen += 0.6;
        effects.hullRegenDelay = effects.hullRegenDelay === 0 ? 4 : Math.min(effects.hullRegenDelay, 4);
        break;
      case "discharge-shield":
        effects.shieldBreakStall = Math.max(effects.shieldBreakStall, 2.5);
        break;
      case "harmonic-recharge":
        effects.perfectWordShield += 3;
        break;
      case "phase-shield":
        effects.phaseShieldInterval = every(effects.phaseShieldInterval, 18);
        break;
      case "efficient-capacitor":
        effects.skillCostMultiplier *= 0.85;
        break;
      case "kill-siphon":
        effects.killEnergy += 3;
        break;
      case "cryo-coolant":
        effects.cooldownRate *= 1.18;
        break;
      case "hunter-killer":
        effects.missileEveryKills = every(effects.missileEveryKills, 5);
        break;
      case "threat-scanner":
        effects.hostileShotSpeed *= 0.85;
        break;
      case "overcharge-module":
        effects.rageGainMultiplier *= 1.2;
        break;
      case "escort-drone":
        effects.escortDrones += 1;
        effects.escortInterval = every(effects.escortInterval, 7);
        break;
      case "interceptor-drone":
        effects.interceptorDrones += 1;
        effects.interceptorInterval = every(effects.interceptorInterval, 5);
        break;
      case "wing-drones":
        effects.escortDrones += 2;
        effects.escortInterval = every(effects.escortInterval, 6);
        break;
      case "ignition-core":
        effects.startingRage = Math.min(50, effects.startingRage + 25);
        break;
      case "momentum-core":
        effects.momentumStreak = every(effects.momentumStreak, 15);
        effects.momentumDamage = Math.max(effects.momentumDamage, 0.12);
        break;
      case "quantum-core":
        effects.quantumEveryPerfect = every(effects.quantumEveryPerfect, 8);
        effects.quantumCooldownCut = Math.max(effects.quantumCooldownCut, 3);
        break;
    }
  }
  return effects;
}
