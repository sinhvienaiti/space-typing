import type { StageRole } from "../campaign/types";

export type StageTransitionTone =
  | "regular"
  | "elite"
  | "world"
  | "galaxy"
  | "mini-boss"
  | "world-boss"
  | "galaxy-boss"
  | "hidden";

export type StageTransitionInput = {
  stage: number;
  galaxy: number;
  stageInGalaxy: number;
  stageInWorld: number;
  worldName: string;
  role: StageRole;
};

export type StageTransitionSpec = {
  tone: StageTransitionTone;
  eyebrow: string;
  title: string;
  subtitle: string;
  durationMs: number;
};

function stageNumber(stage: number): string {
  return String(Math.max(1, Math.floor(stage))).padStart(3, "0");
}

function galaxyNumber(galaxy: number): string {
  return String(Math.max(1, Math.floor(galaxy))).padStart(2, "0");
}

export function stageRoleLabel(role: StageRole): string {
  if (role === "major-boss") return "GALAXY MAJOR BOSS";
  if (role === "boss") return "WORLD BOSS";
  if (role === "mini-boss") return "MINI BOSS";
  if (role === "gauntlet") return "GAUNTLET";
  if (role === "hazard") return "HAZARD";
  if (role === "special") return "SPECIAL SIGNAL";
  if (role === "elite") return "ELITE ENCOUNTER";
  return "COMBAT";
}

export function createStageTransitionSpec(
  input: StageTransitionInput,
): StageTransitionSpec {
  const stage = stageNumber(input.stage);
  const galaxy = galaxyNumber(input.galaxy);
  const location =
    "Stage " +
    stage +
    " · " +
    String(Math.max(1, input.stageInWorld)).padStart(2, "0") +
    " / 20";

  if (input.role === "major-boss") {
    return {
      tone: "galaxy-boss",
      eyebrow: "GALAXY " + galaxy + " // FINAL CONTACT",
      title: "GALAXY MAJOR BOSS",
      subtitle: input.worldName + " · Stage " + stage,
      durationMs: 1650,
    };
  }

  if (input.role === "boss") {
    return {
      tone: "world-boss",
      eyebrow: "GALAXY " + galaxy + " // WORLD FINAL",
      title: "WORLD BOSS",
      subtitle: input.worldName + " · Stage " + stage,
      durationMs: 1400,
    };
  }

  if (input.role === "mini-boss") {
    return {
      tone: "mini-boss",
      eyebrow: "GALAXY " + galaxy + " // PRIORITY CONTACT",
      title: "MINI BOSS",
      subtitle: input.worldName + " · Stage " + stage,
      durationMs: 1180,
    };
  }

  if (input.stageInGalaxy === 1) {
    return {
      tone: "galaxy",
      eyebrow: "NEW GALAXY // " + galaxy,
      title: input.worldName,
      subtitle: location,
      durationMs: 1450,
    };
  }

  if (input.stageInWorld === 1) {
    return {
      tone: "world",
      eyebrow: "GALAXY " + galaxy + " // NEW WORLD",
      title: input.worldName,
      subtitle: location,
      durationMs: 1250,
    };
  }

  if (
    input.role === "elite" ||
    input.role === "special" ||
    input.role === "hazard" ||
    input.role === "gauntlet"
  ) {
    return {
      tone: "elite",
      eyebrow: "GALAXY " + galaxy + " // " + stageRoleLabel(input.role),
      title: "STAGE " + stage,
      subtitle: input.worldName + " · " + stageRoleLabel(input.role),
      durationMs: 980,
    };
  }

  return {
    tone: "regular",
    eyebrow: "GALAXY " + galaxy + " // " + input.worldName,
    title: "STAGE " + stage,
    subtitle: location,
    durationMs: 760,
  };
}

export function createHiddenTransitionSpec(
  label: string,
  sourceStage: number,
): StageTransitionSpec {
  return {
    tone: "hidden",
    eyebrow: "HIDDEN SIGNAL // OPTIONAL ENCOUNTER",
    title: label,
    subtitle:
      "Campaign Stage " +
      stageNumber(sourceStage) +
      " remains unchanged",
    durationMs: 1250,
  };
}
