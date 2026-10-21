import * as THREE from "three";
import { loadModel, modelEntry, pickModelTier } from "../../render3d/model-loader";
import { glowSprite } from "../../scene3d/materials";
import type { Quality } from "../../scene3d/space";
import { textures } from "../../scene3d/textures";
import { TOWER_ORDER, type TowerType } from "../rules/data";
import type { DefenseEngine, Tower } from "../rules/engine";
import { fit, type Terrain } from "./terrain";

/**
 * The towers on their pads: the owner's model for each kind, larger and
 * brighter with each level and recoloured by its branch, a glowing ring
 * under it, a kick when it strikes, and a dark, leaning wreck when it falls
 * (the fire and smoke are vfx.ts). Each kind keeps one loaded template.
 */

export const TOWER_COLOR: Record<TowerType, THREE.Color> = {
  frost: new THREE.Color("#7fd8ff"),
  gravity: new THREE.Color("#b07bff"),
  arc: new THREE.Color("#9fc4ff"),
  beacon: new THREE.Color("#ff6a3d"),
  sanctum: new THREE.Color("#ffd36b"),
  siphon: new THREE.Color("#5cf2c8"),
};
/** Branch tints (a / b). */
const BRANCH_COLOR: Record<TowerType, readonly [THREE.Color, THREE.Color]> = {
  frost: [new THREE.Color("#c8f4ff"), new THREE.Color("#5fa8ff")],
  gravity: [new THREE.Color("#ff5cf0"), new THREE.Color("#6b4dff")],
  arc: [new THREE.Color("#e6f6ff"), new THREE.Color("#ff8af0")],
  beacon: [new THREE.Color("#ffb347"), new THREE.Color("#ff3b6b")],
  sanctum: [new THREE.Color("#fff1b8"), new THREE.Color("#8dffb0")],
  siphon: [new THREE.Color("#ffd36b"), new THREE.Color("#8fd8ff")],
};
const HEIGHT: Record<TowerType, number> = { frost: 4.6, gravity: 4.2, arc: 5, beacon: 3.4, sanctum: 4.2, siphon: 3.8 };
const LEVEL_SCALE = [1, 1.1, 1.2, 1.34] as const;

type Look = { material: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color; intensity: number };

type TowerView = {
  type: TowerType;
  level: number;
  branch: string | null;
  root: THREE.Group;
  body: THREE.Group;
  looks: Look[];
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  aura: THREE.Sprite;
  kick: number;
  rise: number;
  down: number;
  mixer: THREE.AnimationMixer | null;
};

export class TowerViews {
  readonly group = new THREE.Group();
  private readonly templates = new Map<TowerType, { scene: THREE.Object3D; clips: THREE.AnimationClip[] }>();
  private views: (TowerView | null)[] = [];

  constructor(scene: THREE.Scene, private readonly terrain: Terrain) {
    scene.add(this.group);
  }

  async load(quality: Quality): Promise<void> {
    await Promise.all(
      TOWER_ORDER.map(async (type) => {
        const entry = await modelEntry("items", "tower-" + type);
        const url = entry === null ? null : pickModelTier(entry, quality);
        if (url === null) return;
        try {
          const gltf = await loadModel(url);
          this.templates.set(type, { scene: gltf.scene, clips: gltf.animations });
        } catch {
          // That kind shows only its ring and glow.
        }
      }),
    );
  }

  reset(pads: number): void {
    for (const view of this.views) view?.root.removeFromParent();
    this.views = Array.from({ length: pads }, () => null);
  }

  /** The point beams and bolts leave from: near the top of the tower. */
  top(engine: DefenseEngine, pad: number, out: THREE.Vector3): THREE.Vector3 {
    const at = engine.pads[pad]!;
    const tower = engine.towers[pad] ?? null;
    const height = tower === null ? 2 : HEIGHT[tower.type] * LEVEL_SCALE[Math.min(3, tower.level)]! * 0.86;
    return out.set(at.x, this.terrain.padTop(at) + height, at.z);
  }

  /** A strike: a quick squash and a flash. */
  kick(pad: number, strength = 1): void {
    const view = this.views[pad];
    if (view != null) view.kick = Math.max(view.kick, strength);
  }

  private make(engine: DefenseEngine, tower: Tower): TowerView {
    const pad = engine.pads[tower.pad]!;
    const root = new THREE.Group();
    root.position.set(pad.x, this.terrain.padTop(pad), pad.z);
    const body = new THREE.Group();
    root.add(body);
    const looks: Look[] = [];
    let mixer: THREE.AnimationMixer | null = null;
    const template = this.templates.get(tower.type);
    if (template !== undefined) {
      const model = template.scene.clone(true);
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const own = (material: THREE.Material): THREE.Material => {
          if (!(material instanceof THREE.MeshStandardMaterial)) return material;
          const copy = material.clone();
          looks.push({ material: copy, color: copy.color.clone(), emissive: copy.emissive.clone(), intensity: copy.emissiveIntensity });
          return copy;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
      });
      body.add(fit(model, HEIGHT[tower.type]));
      const idle = template.clips.find((clip) => clip.name.includes("Idle"));
      if (idle !== undefined) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(idle).play();
      }
    }
    const { soft, ring: ringTexture } = textures();
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.05, 6, 1), new THREE.MeshBasicMaterial({ color: TOWER_COLOR[tower.type], map: ringTexture, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = Math.PI / 6;
    ring.position.y = 0.05;
    ring.renderOrder = 3;
    const aura = glowSprite(soft, TOWER_COLOR[tower.type]);
    aura.scale.setScalar(4.5);
    aura.position.y = HEIGHT[tower.type] * 0.55;
    aura.material.opacity = 0.32;
    root.add(ring, aura);
    this.group.add(root);
    return { type: tower.type, level: -1, branch: null, root, body, looks, ring, aura, kick: 0, rise: 0, down: 0, mixer };
  }

  update(engine: DefenseEngine, dt: number, time: number): void {
    engine.towers.forEach((tower, pad) => {
      let view = this.views[pad] ?? null;
      if (tower === null) {
        if (view !== null) {
          view.root.removeFromParent();
          this.views[pad] = null;
        }
        return;
      }
      if (view === null || view.type !== tower.type) {
        view?.root.removeFromParent();
        view = this.make(engine, tower);
        this.views[pad] = view;
      }
      if (view.level !== tower.level || view.branch !== tower.branch) {
        // A new level: it grows from where it was and its glow takes the branch's colour.
        view.level = tower.level;
        view.branch = tower.branch;
        view.rise = 0;
        const tint = tower.branch === null ? TOWER_COLOR[tower.type] : BRANCH_COLOR[tower.type][tower.branch === "a" ? 0 : 1];
        view.ring.material.color.copy(tint);
        view.aura.material.color.copy(tint);
      }
      view.rise = Math.min(1, view.rise + dt * 2.2);
      view.kick = Math.max(0, view.kick - dt * 5);
      view.down += ((tower.down ? 1 : 0) - view.down) * Math.min(1, dt * 3);
      view.mixer?.update(tower.down || tower.stunned > 0 ? 0 : dt);
      const grow = LEVEL_SCALE[Math.min(3, tower.level)]!;
      const appear = 1 - (1 - view.rise) ** 3;
      const squash = 1 - view.kick * 0.08;
      view.body.scale.set(grow * (2 - squash) * 0.5 + grow * 0.5, grow * squash * (0.35 + 0.65 * appear), grow * (2 - squash) * 0.5 + grow * 0.5);
      // A fallen tower leans and sinks a little; a stunned one shudders.
      view.body.rotation.set(view.down * 0.22, 0, view.down * 0.12 + (tower.stunned > 0 ? Math.sin(time * 40) * 0.03 : 0));
      view.body.position.y = -view.down * 0.35;
      const level = tower.level / 3;
      const tint = view.ring.material.color;
      const quiet = tower.down ? 0 : tower.jammed ? 0.35 + 0.35 * Math.abs(Math.sin(time * 23)) : 1;
      for (const look of view.looks) {
        look.material.color.copy(look.color).multiplyScalar(1 - view.down * 0.65);
        look.material.emissive.copy(look.emissive).lerp(tint, 0.35 + level * 0.3);
        look.material.emissiveIntensity = (look.intensity + 0.25 + level * 0.55 + view.kick * 1.2) * quiet;
      }
      view.ring.material.opacity = (0.35 + level * 0.3 + view.kick * 0.4) * (tower.down ? 0.15 : 1) * (0.85 + 0.15 * Math.sin(time * 2 + pad));
      view.ring.rotation.z += dt * (0.2 + level * 0.4);
      view.aura.material.opacity = (0.22 + level * 0.25 + view.kick * 0.4) * quiet;
      view.aura.scale.setScalar(4 + level * 2 + view.kick * 1.5);
    });
  }
}
