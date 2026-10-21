import catalog from "../characters/ship-visual-catalog.json";

/**
 * Who flies Campaign 3D: Draconis, or one of the twelve Fleet ships (their
 * authored models ships/<id> and projectiles skills/<id>-bolt). The choice is
 * Campaign 3D's own (main.ts PILOT_KEY): it never changes the 2D game's ship
 * cosmetics.
 */
export type ShipPilotId = (typeof catalog)[number]["id"];
export type PilotId = "draconis" | ShipPilotId;
export type Pilot = {
  id: PilotId;
  name: string;
  ship: boolean;
  /** Bolts, muzzle glows, engine ribbons and the Nova beam, from the ship's projectile art. */
  shot: string;
  /** Menu thumbnail (the ship's top view); none for Draconis. */
  thumb: string | null;
};

/** Each ship's projectile colour, from its 2D projectile art, brightened to glow against space. */
const SHOT_COLORS: Record<ShipPilotId, string> = {
  vanguard: "#38d4ff",
  razorwing: "#7b7dff",
  "solar-lance": "#ffb347",
  "phantom-wraith": "#a35cff",
  "crimson-talon": "#ff4b3e",
  "frost-seraph": "#9fe3ff",
  "nova-reaper": "#e05cff",
  "astral-dragon": "#6fc3ff",
  "eclipse-monarch": "#9b6bff",
  "celestial-valkyrie": "#4dffb0",
  "genesis-phoenix": "#5aa8ff",
  "eternal-sovereign": "#b8c4ff",
};

export const PILOTS: readonly Pilot[] = [
  { id: "draconis", name: "Draconis", ship: false, shot: "#ff9a4a", thumb: null },
  ...[...catalog]
    .sort((a, b) => a.order - b.order)
    .map((visual): Pilot => ({
      id: visual.id,
      name: visual.name,
      ship: true,
      shot: SHOT_COLORS[visual.id] ?? "#38d4ff",
      thumb: "/assets/space-typing/ships/3d/" + visual.id + "/color.webp",
    })),
];

export function pilotById(id: string | null | undefined): Pilot {
  return PILOTS.find((pilot) => pilot.id === id) ?? PILOTS[0]!;
}

/** The projectile model of a ship pilot (skills kind), or null for Draconis. */
export function pilotShotModelId(pilot: Pilot): string | null {
  return pilot.ship ? pilot.id + "-bolt" : null;
}
