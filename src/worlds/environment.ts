import type { WorldProfile } from "./types";
import { WORLD_REGISTRY, worldById } from "./registry";

export type WorldEnvironmentProfile = {
  id: string;
  worldId: string;
  backgroundCore: string;
  backgroundMid: string;
  backgroundEdge: string;
  starRgb: string;
  gridRgb: string;
  hazeRgb: string;
  gridIntensity: number;
  hazeIntensity: number;
  starDrift: number;
};

type GalaxyPalette = {
  cores: readonly [string, string, string, string, string];
  mid: string;
  edge: string;
  starRgb: string;
  gridRgb: string;
  hazeRgb: string;
};

const GALAXY_PALETTES: readonly GalaxyPalette[] = [
  {
    cores: ["#173b4a", "#324566", "#3b315f", "#244d59", "#343f70"],
    mid: "#0a1724",
    edge: "#03060c",
    starRgb: "174, 238, 255",
    gridRgb: "91, 220, 244",
    hazeRgb: "123, 225, 255",
  },
  {
    cores: ["#4a211d", "#562218", "#4f1a2d", "#46201d", "#5e1b22"],
    mid: "#1c0c12",
    edge: "#080306",
    starRgb: "255, 197, 151",
    gridRgb: "255, 105, 82",
    hazeRgb: "255, 93, 72",
  },
  {
    cores: ["#173b50", "#19475c", "#23485f", "#29405c", "#294c65"],
    mid: "#071824",
    edge: "#02070d",
    starRgb: "213, 248, 255",
    gridRgb: "116, 224, 255",
    hazeRgb: "153, 233, 255",
  },
  {
    cores: ["#23472f", "#285139", "#21483f", "#2f5135", "#1d4430"],
    mid: "#0b1c17",
    edge: "#030906",
    starRgb: "218, 255, 194",
    gridRgb: "111, 226, 151",
    hazeRgb: "150, 244, 171",
  },
  {
    cores: ["#29233f", "#322343", "#24203e", "#241934", "#311d3f"],
    mid: "#0d0a18",
    edge: "#040308",
    starRgb: "218, 199, 255",
    gridRgb: "154, 118, 230",
    hazeRgb: "154, 109, 220",
  },
  {
    cores: ["#252e58", "#2b315d", "#353162", "#253458", "#34336a"],
    mid: "#0a1025",
    edge: "#02040d",
    starRgb: "204, 219, 255",
    gridRgb: "123, 154, 255",
    hazeRgb: "142, 119, 255",
  },
  {
    cores: ["#301b37", "#35182d", "#2a1839", "#25152e", "#31142b"],
    mid: "#0e0714",
    edge: "#050208",
    starRgb: "244, 190, 255",
    gridRgb: "211, 91, 207",
    hazeRgb: "203, 75, 180",
  },
  {
    cores: ["#183b55", "#1d405b", "#253d61", "#1e3658", "#183348"],
    mid: "#071525",
    edge: "#02060c",
    starRgb: "197, 235, 255",
    gridRgb: "102, 188, 255",
    hazeRgb: "113, 209, 255",
  },
  {
    cores: ["#26223f", "#292542", "#1e243f", "#20213a", "#29223d"],
    mid: "#090b17",
    edge: "#020309",
    starRgb: "221, 218, 255",
    gridRgb: "138, 133, 229",
    hazeRgb: "154, 137, 225",
  },
  {
    cores: ["#332b5f", "#312759", "#3b2c61", "#29254f", "#3e316e"],
    mid: "#0b0d25",
    edge: "#02030b",
    starRgb: "230, 222, 255",
    gridRgb: "162, 142, 255",
    hazeRgb: "180, 148, 255",
  },
] as const;

function profileFor(world: WorldProfile): WorldEnvironmentProfile {
  const palette = GALAXY_PALETTES[world.galaxy - 1]!;
  const slot = Math.floor((world.stageStart - 1) / 20) % 5;

  return {
    id: world.backgroundProfile,
    worldId: world.id,
    backgroundCore: palette.cores[slot] ?? palette.cores[0],
    backgroundMid: palette.mid,
    backgroundEdge: palette.edge,
    starRgb: palette.starRgb,
    gridRgb: palette.gridRgb,
    hazeRgb: palette.hazeRgb,
    gridIntensity: 0.05 + slot * 0.008,
    hazeIntensity: 0.02 + slot * 0.006,
    starDrift: 0.85 + slot * 0.08,
  };
}

export const WORLD_ENVIRONMENT_REGISTRY: Readonly<
  Record<string, WorldEnvironmentProfile>
> = Object.fromEntries(
  WORLD_REGISTRY.map((world) => [
    world.id,
    profileFor(world),
  ]),
);

export function environmentForWorld(
  worldOrId: WorldProfile | string,
): WorldEnvironmentProfile {
  const world =
    typeof worldOrId === "string"
      ? worldById(worldOrId)
      : worldOrId;
  if (world === undefined) {
    return WORLD_ENVIRONMENT_REGISTRY["world-01"]!;
  }
  return WORLD_ENVIRONMENT_REGISTRY[world.id]!;
}

export function validateWorldEnvironmentRegistry(): string[] {
  const errors: string[] = [];

  for (const world of WORLD_REGISTRY) {
    const profile = WORLD_ENVIRONMENT_REGISTRY[world.id];
    if (profile === undefined) {
      errors.push(world.id + ": missing environment profile.");
      continue;
    }
    if (
      profile.id !== world.backgroundProfile ||
      profile.worldId !== world.id
    ) {
      errors.push(world.id + ": environment identity mismatch.");
    }
    if (
      !profile.backgroundCore.startsWith("#") ||
      !profile.backgroundMid.startsWith("#") ||
      !profile.backgroundEdge.startsWith("#") ||
      profile.starRgb.trim().length === 0 ||
      profile.gridRgb.trim().length === 0 ||
      profile.hazeRgb.trim().length === 0
    ) {
      errors.push(world.id + ": environment colors are incomplete.");
    }
    if (
      !Number.isFinite(profile.gridIntensity) ||
      profile.gridIntensity <= 0 ||
      !Number.isFinite(profile.hazeIntensity) ||
      profile.hazeIntensity <= 0 ||
      !Number.isFinite(profile.starDrift) ||
      profile.starDrift <= 0
    ) {
      errors.push(world.id + ": environment motion/intensity is invalid.");
    }
  }

  return errors;
}
