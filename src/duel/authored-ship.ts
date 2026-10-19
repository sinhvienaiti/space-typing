import type { CharacterId } from "../characters/registry";
import type { VisualQuality } from "../types";
import { MODEL_CONTRACTS, missingSockets } from "../render3d/model-contracts";
import { loadModel, modelUrl } from "../render3d/model-loader";
import { disposeBuiltShipResources } from "./ship3d-lifecycle";
import type { BuiltShip } from "./vanguard-model";
import { resolveShipVisualId } from "../characters/ship-visual";
import { loadShipVisualArt, shipVisualColors } from "../characters/ship-art";

type Three = typeof import("three");

function texturesOf(model: import("three").Object3D): import("three").Texture[] {
  const textures = new Set<import("three").Texture>();
  model.traverse(object => {
    const mesh = object as import("three").Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const value of Object.values(material)) {
        if (value && typeof value === "object" && "isTexture" in value) textures.add(value as import("three").Texture);
      }
    }
  });
  return [...textures];
}

/** Adapt an authored GLB to the existing lit title/Duel renderer and FX anchors. */
export function buildAuthoredShip(
  three: Three,
  model: import("three").Group,
  clips: readonly import("three").AnimationClip[] = [],
): BuiltShip | null {
  const sockets = new Map<string, import("three").Object3D>();
  model.traverse(object => { if (object.name.startsWith("FX_")) sockets.set(object.name, object); });
  if (missingSockets(MODEL_CONTRACTS.ships, [...sockets.keys()]).length > 0) return null;
  const box = new three.Box3().setFromObject(model);
  const size = box.getSize(new three.Vector3());
  const longest = Math.max(size.x, size.z);
  if (!Number.isFinite(longest) || longest <= 0) return null;

  const group = new three.Group();
  const normalized = new three.Group();
  group.add(normalized);
  normalized.add(model);
  model.position.sub(box.getCenter(new three.Vector3()));
  normalized.scale.setScalar(1 / longest);
  group.updateMatrixWorld(true);
  const anchors: Array<{ node: import("three").Object3D; point: import("three").Vector3 }> = [];
  const point = (name: string): import("three").Vector3 | null => {
    const node = sockets.get(name);
    if (!node) return null;
    const value = node.getWorldPosition(new three.Vector3());
    anchors.push({ node, point: value });
    return value;
  };
  const many = (names: string[]): import("three").Vector3[] => names.map(point).filter((value): value is import("three").Vector3 => value !== null);
  const nozzles = many(["FX_ENGINE_L", "FX_ENGINE_C", "FX_ENGINE_R"]);
  const guns = many(["FX_MUZZLE_L", "FX_MUZZLE_R"]);
  const centerGun = point("FX_MUZZLE")!;
  const emissive: Array<{ material: import("three").MeshStandardMaterial; base: number }> = [];
  model.traverse(object => {
    const mesh = object as import("three").Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const pbr = material as import("three").MeshStandardMaterial;
      if (pbr.isMeshStandardMaterial && pbr.emissiveMap) emissive.push({ material: pbr, base: pbr.emissiveIntensity });
    }
  });
  const idle = clips.find(clip => clip.name.includes("Ship_Idle"));
  const mixer = idle ? new three.AnimationMixer(model) : null;
  if (idle) mixer!.clipAction(idle).play();
  const inverse = new three.Matrix4();
  let lastTime = -1;
  group.userData.authoredShip = true;
  return {
    group,
    nozzles: nozzles.map(at => ({ at, radius: 0.035 })),
    muzzles: guns.length > 0 ? guns : [centerGun],
    lights: { nose: centerGun, canopy: point("FX_CORE"), eyes: [], wingtips: many(["FX_WING_L", "FX_WING_R"]) },
    halfWidth: size.x / longest / 2,
    environment: 0.65,
    textures: texturesOf(model),
    colors: { hot: "#effcff", plume: "#7fe8ff", outer: "#4d85ff", accent: "#5fe3ff" },
    tick(time, heat) {
      mixer?.update(lastTime < 0 ? 0 : Math.max(0, Math.min(0.1, time - lastTime)));
      lastTime = time;
      for (const value of emissive) value.material.emissiveIntensity = value.base * (1 + Math.max(0, Math.min(1, heat)) * 0.35);
      group.updateMatrixWorld(true);
      inverse.copy(group.matrixWorld).invert();
      for (const anchor of anchors) anchor.node.getWorldPosition(anchor.point).applyMatrix4(inverse);
    },
  };
}

export async function loadAuthoredShip(three: Three, id: CharacterId, quality: VisualQuality, visualId = resolveShipVisualId(id)): Promise<BuiltShip | null> {
  if (quality === "low" || (typeof location !== "undefined" && new URLSearchParams(location.search).get("model3d") === "off")) return null;
  // Prepare a fail-soft fallback independently, even when no GLB is listed.
  // A missing or slow image must never delay an otherwise valid model.
  void loadShipVisualArt(visualId);
  const url = await modelUrl("ships", visualId, quality);
  if (!url) return null;
  const gltf = await loadModel(url);
  const built = buildAuthoredShip(three, gltf.scene, gltf.animations);
  if (!built) disposeBuiltShipResources({ group: gltf.scene, textures: texturesOf(gltf.scene) });
  else {
    built.group.userData.modelUrl = url;
    built.colors = shipVisualColors(visualId) ?? built.colors;
  }
  return built;
}
