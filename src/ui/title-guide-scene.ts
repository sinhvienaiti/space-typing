import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { loadModel, modelEntry, pickModelTier } from "../render3d/model-loader";
import type { VisualQuality } from "../types";
import type { GuideAction } from "./title-guide-lines";

/**
 * The guide's 3D view (loaded on demand by title-guide.ts): the rigged
 * Draconis v4 (models/guides/draconis-v4) standing in a studio light, its
 * idle breathing loop under one-shot actions cross-faded in and out, turning
 * a little toward the pointer. The caller drives frames (render) only while
 * the deck shows it.
 */
const CLIPS: Record<GuideAction, string> = {
  wave: "Guide_Wave",
  flap: "Guide_Flap",
  hop: "Guide_Hop",
  bow: "Guide_Bow",
  talk: "Guide_Talk",
};

export type GuideScene = {
  play(action: GuideAction): void;
  setPointer(x: number, y: number): void;
  /** Draws one frame at the canvas's CSS size; false when nothing was drawn. */
  render(dt: number): boolean;
  dispose(): void;
};

export async function createGuideScene(canvas: HTMLCanvasElement, quality: VisualQuality): Promise<GuideScene | null> {
  const entry = await modelEntry("guides", "draconis-v4");
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url === null) return null;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality === "high", powerPreference: "low-power" });
  } catch {
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x1a1030, 0.7));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(-2.5, 3.5, 4);
  const rim = new THREE.DirectionalLight(0x5fe3ff, 2.6);
  rim.position.set(3, 2.2, -3.5);
  const fire = new THREE.PointLight(0xff8a3a, 3, 4, 2);
  fire.position.set(0, -0.6, 1.2);
  scene.add(key, rim, fire);

  let gltf;
  try {
    gltf = await loadModel(url);
  } catch {
    renderer.dispose();
    environment.dispose();
    return null;
  }
  const model = gltf.scene;
  model.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) object.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(model);
  const find = (name: string): THREE.AnimationClip | undefined => gltf.animations.find((clip) => clip.name === name);
  const idleClip = find("Guide_Idle");
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  idle?.play();
  mixer.update(0);
  // Fit: 2 units tall, feet on y = -1, centred.
  const pivot = new THREE.Group();
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 2 / Math.max(size.y, 0.001);
  model.position.set(-center.x, -box.min.y, -center.z);
  pivot.scale.setScalar(scale);
  pivot.position.y = -1;
  pivot.add(model);
  scene.add(pivot);
  // A soft glow on the floor under the feet.
  const floorTexture = (() => {
    const glow = document.createElement("canvas");
    glow.width = glow.height = 128;
    const context = glow.getContext("2d")!;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,170,90,0.55)");
    gradient.addColorStop(0.45, "rgba(95,227,255,0.18)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(glow);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshBasicMaterial({ map: floorTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.995;
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(26, 0.75, 0.1, 40);
  camera.position.set(1.1, 0.55, 6.4);
  camera.lookAt(0, 0.05, 0);
  // Compile the shaders off the main thread where the browser can
  // (KHR_parallel_shader_compile), so the first frame does not stall the page.
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    /* Compiled on first render instead. */
  }

  let current: THREE.AnimationAction | null = null;
  const onFinished = (event: { action: THREE.AnimationAction }): void => {
    if (event.action !== current || idle === null) return;
    idle.enabled = true;
    idle.setEffectiveWeight(1);
    idle.crossFadeFrom(event.action, 0.35, false);
    current = null;
  };
  mixer.addEventListener("finished", onFinished as never);

  let px = 0;
  let py = 0;
  let yaw = 0;
  let tilt = 0;
  let time = 0;

  return {
    play(action) {
      const clip = find(CLIPS[action]);
      if (clip === undefined || idle === null) return;
      const next = mixer.clipAction(clip);
      next.reset();
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.play();
      next.crossFadeFrom(current ?? idle, current ? 0.18 : 0.25, false);
      current = next;
    },
    setPointer(x, y) {
      px = x;
      py = y;
    },
    render(dt) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 8 || height < 8) return false;
      const dpr = Math.min(quality === "high" ? 1.75 : 1, window.devicePixelRatio || 1);
      const pixelsW = Math.round(width * dpr);
      const pixelsH = Math.round(height * dpr);
      if (canvas.width !== pixelsW || canvas.height !== pixelsH) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      time += dt;
      // Turn a little toward the pointer, with a slow drift of its own.
      const ease = 1 - Math.exp(-dt * 3);
      yaw += (px * 0.55 + Math.sin(time * 0.35) * 0.06 - yaw) * ease;
      tilt += (py * 0.08 - tilt) * ease;
      pivot.rotation.set(tilt, yaw, 0);
      fire.intensity = 2.6 + Math.sin(time * 7.3) * 0.25 + Math.sin(time * 13.1) * 0.15;
      mixer.update(dt);
      renderer.render(scene, camera);
      return true;
    },
    dispose() {
      mixer.removeEventListener("finished", onFinished as never);
      mixer.stopAllAction();
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      });
      floor.geometry.dispose();
      floor.material.dispose();
      floorTexture.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
