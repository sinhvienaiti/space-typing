import type {
  BackgroundKit,
  BackgroundTier,
  TierCounts,
  WorldComposition,
} from "../types";
import { G01_COMPOSITIONS } from "./g01-celestial";

const TIERS: readonly BackgroundTier[] = ["low", "medium", "high", "ultra"];

/** Every World that has moved to the BGV renderer. Others keep the legacy scene. */
export const BACKGROUND_COMPOSITIONS: readonly WorldComposition[] = [
  ...G01_COMPOSITIONS,
];

const BY_WORLD = new Map(
  BACKGROUND_COMPOSITIONS.map((composition) => [composition.worldId, composition]),
);

export function compositionForWorld(worldId: string): WorldComposition | null {
  return BY_WORLD.get(worldId) ?? null;
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function range(value: readonly [number, number]): boolean {
  return finite(value[0]) && finite(value[1]) && value[0] <= value[1];
}

function counts(value: TierCounts): boolean {
  return TIERS.every(
    (tier) => Number.isInteger(value[tier]) && value[tier] >= 0,
  );
}

/**
 * Structural checks for a composition. Returns human-readable errors; any
 * error keeps the legacy background.
 */
export function validateComposition(composition: WorldComposition): string[] {
  const errors: string[] = [];
  const where = composition.worldId + ": ";
  const plate = composition.plate;

  if (!finite(plate.overscan) || plate.overscan < 1) {
    errors.push(where + "plate overscan must be >= 1.");
  }
  const driftRoom = (plate.overscan - 1) / 2;
  if (
    !plate.drift.every((value) => finite(value) && value >= 0 && value <= driftRoom + 1e-9)
  ) {
    errors.push(where + "plate drift exceeds the overscan margin.");
  }
  if (!finite(plate.driftPeriod) || plate.driftPeriod <= 0) {
    errors.push(where + "plate drift period must be positive.");
  }
  if (
    plate.focus !== undefined &&
    !plate.focus.every((value) => finite(value) && value >= 0 && value <= 1)
  ) {
    errors.push(where + "plate focus must be within 0..1.");
  }
  const grade = plate.grade;
  if (
    ![grade.exposure, grade.gamma, grade.saturation, grade.hueShift].every(finite) ||
    grade.exposure <= 0 ||
    grade.gamma <= 0 ||
    grade.saturation < 0
  ) {
    errors.push(where + "invalid plate grade.");
  }

  for (const sheet of composition.sheets) {
    if (
      !finite(sheet.opacity) ||
      sheet.opacity < 0 ||
      sheet.opacity > 1 ||
      !finite(sheet.tileScale) ||
      sheet.tileScale <= 0 ||
      !finite(sheet.flow) ||
      sheet.flow < 0
    ) {
      errors.push(where + "invalid sheet " + sheet.texture + ".");
    }
  }

  const hero = composition.hero;
  if (hero !== null) {
    if (!finite(hero.size) || hero.size <= 0 || hero.alpha < 0 || hero.alpha > 1) {
      errors.push(where + "invalid hero " + hero.texture + ".");
    }
  }

  for (const field of composition.fields) {
    if (
      !counts(field.counts) ||
      !range(field.depth) ||
      !range(field.size) ||
      !range(field.spin) ||
      field.size[0] <= 0 ||
      field.alpha < 0 ||
      field.alpha > 1
    ) {
      errors.push(where + "invalid field " + field.id + ".");
    }
  }

  for (const layer of [...composition.stars, ...composition.particles]) {
    if (
      !counts(layer.counts) ||
      !counts(layer.spikes) ||
      !range(layer.depth) ||
      !range(layer.radius) ||
      !range(layer.brightness) ||
      !range(layer.twinkleHz) ||
      layer.palette.length === 0
    ) {
      errors.push(where + "invalid point layer " + layer.id + ".");
    }
  }

  for (const event of composition.events) {
    if (!range(event.interval) || event.interval[0] <= 0) {
      errors.push(where + "invalid event interval.");
    }
    if (event.kind === "pass" && (!range(event.duration) || event.headings.length === 0)) {
      errors.push(where + "invalid pass " + event.id + ".");
    }
  }

  return errors;
}

/**
 * Textures and atlases a composition references but the kit lacks. A partial
 * kit still renders (missing layers are skipped, a missing plate is black),
 * so these are warnings for the art pipeline, not errors.
 */
export function missingKitReferences(
  composition: WorldComposition,
  kit: BackgroundKit,
): string[] {
  const missing: string[] = [];
  const where = composition.worldId + ": ";
  const textures = [
    composition.plate.texture,
    ...composition.sheets.map((sheet) => sheet.texture),
    ...(composition.hero === null ? [] : [composition.hero.texture]),
  ];
  for (const texture of textures) {
    if (kit.textures[texture] === undefined) {
      missing.push(where + "kit " + kit.id + " has no texture " + texture + ".");
    }
  }
  const atlases = [
    ...composition.fields.map((field) => field.atlas),
    ...composition.events.flatMap((event) => (event.kind === "pass" ? [event.atlas] : [])),
  ];
  for (const atlas of new Set(atlases)) {
    if (kit.atlases[atlas] === undefined) {
      missing.push(where + "kit " + kit.id + " has no atlas " + atlas + ".");
    }
  }
  return missing;
}
