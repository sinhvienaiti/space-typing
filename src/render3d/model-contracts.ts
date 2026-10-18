/**
 * What every authored 3D model must contain, per kind. Shared by
 * `pnpm models:prepare` (validation, compression) and the game runtime.
 * DOM-free so tests and Node scripts can import it.
 *
 * Authoring rules (Blender, see docs/art-requests/3D_MODELS_PROMPT_PACK_2026-10-16.md):
 *  - Units: metres, +Y up, the model faces -Z in Blender's glTF export
 *    (forward = nose). Origin at the visual centre.
 *  - Sockets are Empties parented to the mesh or its armature, named exactly
 *    as below. The game hangs light, flames and particles on them.
 *  - Animation clips are Blender Actions pushed to NLA tracks, named exactly.
 */
export type ModelKind = "ships" | "enemies" | "bosses" | "skills" | "items" | "heroes" | "guides";
export type ModelTier = "high" | "medium";

export type ModelContract = {
  kind: ModelKind;
  /** Sockets that must exist (Empty names). */
  requiredSockets: readonly string[];
  /** Sockets used when present. */
  optionalSockets: readonly string[];
  /** Clip names that must exist (substring match, so "_V3" suffixes pass). */
  requiredClips: readonly string[];
  optionalClips: readonly string[];
  triangles: { min: number; max: number };
  /** Longest texture edge per tier. */
  textureMax: Readonly<Record<ModelTier, number>>;
};

export const MODEL_CONTRACTS: Readonly<Record<ModelKind, ModelContract>> = {
  ships: {
    kind: "ships",
    requiredSockets: ["FX_ENGINE_L", "FX_ENGINE_R", "FX_MUZZLE", "FX_CORE"],
    optionalSockets: ["FX_ENGINE_C", "FX_WING_L", "FX_WING_R", "FX_MUZZLE_L", "FX_MUZZLE_R"],
    requiredClips: [],
    optionalClips: ["Ship_Idle", "Ship_Fire", "Ship_Skill"],
    triangles: { min: 3_000, max: 18_000 },
    textureMax: { high: 2048, medium: 1024 },
  },
  enemies: {
    kind: "enemies",
    requiredSockets: ["FX_CORE"],
    optionalSockets: ["FX_MUZZLE", "FX_WEAKPOINT"],
    requiredClips: [],
    optionalClips: ["Enemy_Idle", "Enemy_Attack", "Enemy_Hit", "Enemy_Death"],
    triangles: { min: 800, max: 7_000 },
    textureMax: { high: 1024, medium: 512 },
  },
  bosses: {
    kind: "bosses",
    requiredSockets: ["FX_CORE", "FX_CAST_L", "FX_CAST_R", "FX_HALO"],
    optionalSockets: ["FX_WEAKPOINT", "FX_MOUTH"],
    requiredClips: ["Boss_Idle_Hover"],
    optionalClips: ["Boss_Skill", "Prismatic_Burst", "Boss_Hit", "Boss_Stagger", "Boss_Death", "Boss_Intro", "Boss_Phase"],
    triangles: { min: 12_000, max: 45_000 },
    textureMax: { high: 2048, medium: 1024 },
  },
  skills: {
    kind: "skills",
    requiredSockets: [],
    optionalSockets: ["FX_TRAIL", "FX_CORE"],
    requiredClips: [],
    optionalClips: ["Skill_Loop", "Skill_Spawn", "Skill_Impact"],
    triangles: { min: 100, max: 4_000 },
    textureMax: { high: 512, medium: 256 },
  },
  items: {
    kind: "items",
    requiredSockets: [],
    optionalSockets: ["FX_CORE"],
    requiredClips: [],
    optionalClips: ["Item_Idle"],
    triangles: { min: 500, max: 9_000 },
    textureMax: { high: 1024, medium: 512 },
  },
  // Rigged player characters (Campaign 3D): blender tool --kind heroes --rig-json.
  heroes: {
    kind: "heroes",
    requiredSockets: ["FX_CORE", "FX_CAST_L", "FX_CAST_R"],
    optionalSockets: ["FX_MOUTH", "FX_HALO", "FX_WING_L", "FX_WING_R", "FX_WING_L2", "FX_WING_R2", "FX_TAIL", "FX_FOOT_L", "FX_FOOT_R"],
    requiredClips: ["Hero_Fly"],
    optionalClips: ["Hero_Idle_Hover", "Hero_Boost", "Hero_Attack_L", "Hero_Attack_R", "Hero_Cast", "Hero_Hit", "Hero_Victory", "Hero_Death", "Hero_Intro"],
    triangles: { min: 8_000, max: 30_000 },
    textureMax: { high: 2048, medium: 1024 },
  },
  // The menu guide (title page): blender tool --kind guides --rig-json (make_guide_clips).
  guides: {
    kind: "guides",
    requiredSockets: ["FX_CORE"],
    optionalSockets: ["FX_HALO", "FX_MOUTH", "FX_CAST_L", "FX_CAST_R", "FX_WING_L", "FX_WING_R", "FX_WING_L2", "FX_WING_R2", "FX_TAIL", "FX_FOOT_L", "FX_FOOT_R"],
    requiredClips: ["Guide_Idle"],
    optionalClips: ["Guide_Wave", "Guide_Flap", "Guide_Hop", "Guide_Bow", "Guide_Talk"],
    triangles: { min: 8_000, max: 34_000 },
    textureMax: { high: 2048, medium: 1024 },
  },
};

export type ModelManifestEntry = {
  kind: ModelKind;
  id: string;
  /** Public URLs per tier. */
  tiers: Partial<Record<ModelTier, { url: string; bytes: number }>>;
  triangles: number;
  sockets: string[];
  clips: string[];
  /** Bounding box size (x, y, z) in model units. */
  size: [number, number, number];
};

export type ModelManifest = {
  version: 1;
  generatedAt: string;
  models: Record<string, ModelManifestEntry>;
};

export const MODEL_MANIFEST_URL = "/assets/space-typing/models/manifest.json";

export function modelKey(kind: ModelKind, id: string): string {
  return kind + "/" + id;
}

export function missingSockets(contract: ModelContract, sockets: readonly string[]): string[] {
  return contract.requiredSockets.filter((name) => !sockets.includes(name));
}

export function missingClips(contract: ModelContract, clips: readonly string[]): string[] {
  return contract.requiredClips.filter((name) => !clips.some((clip) => clip.includes(name)));
}
