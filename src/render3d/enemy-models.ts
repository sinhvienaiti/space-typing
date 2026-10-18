import type { EnemyFamilyId } from "../enemies/families";
import { familyStyle } from "../enemies/identity";
import type { EnemyKind, VisualQuality } from "../types";
import { buildModelSheet, type ModelSheet } from "./model-sheet";

/**
 * Modelled enemies (pilot: the Dart scout). A model prepared as
 * models/enemies/<family>-<kind> (own textures) or models/enemies/<kind>
 * (one base mesh, lit in the family's colours) replaces the painted sprite
 * at Medium quality and above. Lookups are nested maps so the per-frame
 * call allocates nothing.
 */
type Slot = ModelSheet | "loading" | "missing";
const slots = new Map<VisualQuality, Map<EnemyFamilyId, Map<EnemyKind, Slot>>>();

/** Modelled enemies are drawn this much larger than the painted sprite box (the render adds margin). */
export const ENEMY_MODEL_SCALE = 1.24;

export function enemyModelSheet(family: EnemyFamilyId, kind: EnemyKind, quality: VisualQuality): ModelSheet | null {
  if (quality === "low") return null;
  let byFamily = slots.get(quality);
  if (byFamily === undefined) {
    byFamily = new Map();
    slots.set(quality, byFamily);
  }
  let byKind = byFamily.get(family);
  if (byKind === undefined) {
    byKind = new Map();
    byFamily.set(family, byKind);
  }
  const slot = byKind.get(kind);
  if (slot !== undefined) return typeof slot === "string" ? null : slot;
  byKind.set(kind, "loading");
  const style = familyStyle(family);
  const target = byKind;
  void buildModelSheet("enemies", [family + "-" + kind, kind], quality, { primary: style.primary, accent: style.accent }).then(
    (sheet) => target.set(kind, sheet ?? "missing"),
  );
  return null;
}
