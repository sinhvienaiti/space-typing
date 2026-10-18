import type { VisualQuality } from "../types";
import { loadThree, renderShared, sharedRenderer, sharedRendererLost } from "../render3d/shared-renderer";

/**
 * Real fire on the HUD: the score panels when the streak burns (data-heat
 * 1–3 on #hudLeft/#hudRight) and the Rage bar when it is full. A GLSL flame
 * (value-noise fbm advected upward, tongues licking out of the panel frame,
 * white-hot rim at heat 3) is rendered through the shared WebGL renderer at
 * reduced resolution, 30 times a second, into one small canvas per burning
 * panel, plus a few sprite embers.
 *
 * Low quality keeps the older CSS flames. Nothing runs while nothing burns.
 */
type Kind = "panel" | "bar";
type Target = { element: HTMLElement; heat: number; kind: Kind };
type Ember = { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number };

const VERTEX = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAGMENT = `
precision mediump float;
uniform float uTime;
uniform vec2 uSize;
uniform vec4 uRect;
uniform float uHeat;
uniform float uBar;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.5 * noise(p);
  p = p * 2.03 + vec2(1.7, 9.2);
  value += 0.25 * noise(p);
  p = p * 2.03 + vec2(1.7, 9.2);
  value += 0.125 * noise(p);
  p = p * 2.03 + vec2(1.7, 9.2);
  value += 0.0625 * noise(p);
  return value;
}

void main() {
  vec2 px = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
  vec2 center = uRect.xy + uRect.zw * 0.5;
  vec2 q = abs(px - center) - uRect.zw * 0.5;
  float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  if (outside > 70.0 || outside < -16.0) { gl_FragColor = vec4(0.0); return; }

  // Flames flow upward (screen y decreases) and sway.
  vec2 p = px / (uBar > 0.5 ? 20.0 : 28.0);
  float n = fbm(vec2(p.x * 1.4 + sin(p.y * 0.7 + uTime) * 0.35, p.y * 0.9 + uTime * 1.9));
  float detail = fbm(vec2(p.x * 3.0 - uTime * 0.4, p.y * 2.3 + uTime * 3.1));

  float reach = (uBar > 0.5 ? 4.0 : 12.0) + uHeat * (uBar > 0.5 ? 6.5 : 13.0);
  float above = clamp((uRect.y + uRect.w * 0.5 - px.y) / (uRect.w * 0.5 + reach), 0.0, 1.0);
  float tongue = reach * mix(0.55, 1.6, above) * (0.45 + 1.1 * n);
  float edge = (1.0 - smoothstep(0.0, tongue, outside)) * smoothstep(-1.5, 1.5, outside);
  float rim = (1.0 - smoothstep(0.0, 3.0, abs(outside))) * 0.75;
  float inner = smoothstep(-14.0, 0.0, outside) * (1.0 - step(0.0, outside)) * 0.16;
  float flame = max(max(edge, rim), inner) * (0.5 + 0.85 * detail);
  flame *= smoothstep(0.0, 0.9, uHeat);
  flame = clamp(pow(flame, 1.55 - 0.18 * uHeat), 0.0, 1.0);

  vec3 color = mix(vec3(0.55, 0.04, 0.0), vec3(1.0, 0.38, 0.04), smoothstep(0.08, 0.42, flame));
  color = mix(color, vec3(1.0, 0.78, 0.32), smoothstep(0.42, 0.75, flame));
  color = mix(color, vec3(1.0, 0.96, 0.86), smoothstep(0.8, 1.0, flame) * smoothstep(1.6, 2.8, uHeat));
  float alpha = clamp(flame * 1.35, 0.0, 1.0);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

/** Fire render scale (of CSS px). Flames are soft, so a reduced resolution looks the same. */
const RESOLUTION: Readonly<Record<VisualQuality, number>> = { low: 0, medium: 0.4, high: 0.5, ultra: 0.65 };
/** Embers per second at heat 3. */
const EMBERS: Readonly<Record<VisualQuality, number>> = { low: 0, medium: 10, high: 18, ultra: 28 };

function emberSprite(): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 32;
  const context = sprite.getContext("2d")!;
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,248,220,1)");
  gradient.addColorStop(0.3, "rgba(255,170,60,0.85)");
  gradient.addColorStop(1, "rgba(255,60,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  return sprite;
}

export function installHudFire(getQuality: () => VisualQuality): void {
  const left = document.getElementById("hudLeft");
  const right = document.getElementById("hudRight");
  const status = document.getElementById("playerStatusHud");
  const bar = document.getElementById("powerTrack");
  const hud = document.querySelector(".hud");
  const host = hud?.parentElement;
  if (left === null || right === null || status === null || bar === null || !host) return;

  // One overlay canvas, large enough for Chrome to keep it on the GPU, so
  // copying the WebGL fire into it never reads pixels back to the CPU.
  const canvas = document.createElement("canvas");
  canvas.className = "hud-fire-overlay";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const context = canvas.getContext("2d", { alpha: true })!;

  let scene: import("three").Scene | null = null;
  let camera: import("three").Camera | null = null;
  let material: import("three").ShaderMaterial | null = null;
  let ready = false;
  let running = false;
  let turn = 0;
  let sprite: HTMLCanvasElement | null = null;
  const started = performance.now();
  const rects = new Map<HTMLElement, DOMRect>();
  let rectsAt = 0;
  let originRect: DOMRect | null = null;
  /** Last drawn box per target (overlay px), so only that box is cleared. */
  const boxes = new Map<HTMLElement, { x: number; y: number; w: number; h: number; embers: Ember[]; drawnAt: number }>();

  async function prepare(): Promise<void> {
    const renderer = await sharedRenderer();
    if (renderer === null) return;
    const three = await loadThree();
    scene = new three.Scene();
    camera = new three.Camera();
    material = new three.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: true,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: new three.Vector2(1, 1) },
        uRect: { value: new three.Vector4(0, 0, 1, 1) },
        uHeat: { value: 0 },
        uBar: { value: 0 },
      },
    });
    const quad = new three.Mesh(new three.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);
    sprite = emberSprite();
    ready = true;
  }

  function targets(): Target[] {
    const list: Target[] = [];
    for (const element of [left!, right!]) {
      const heat = Number(element.dataset.heat ?? 0);
      if (heat > 0 && element.offsetParent !== null) list.push({ element, heat, kind: "panel" });
    }
    if (status!.classList.contains("rage-ready") && !status!.classList.contains("hidden")) list.push({ element: bar!, heat: 2.6, kind: "bar" });
    return list;
  }

  function stop(): void {
    context.clearRect(0, 0, canvas.width, canvas.height);
    boxes.clear();
    running = false;
  }

  function frame(now: number): void {
    if (!running) return;
    const quality = getQuality();
    const list = targets();
    document.body.classList.toggle("hud-fire-gpu", quality !== "low" && ready);
    if (list.length === 0 || quality === "low" || !ready || sharedRendererLost()) {
      stop();
      return;
    }
    requestAnimationFrame(frame);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.round(host!.clientWidth * dpr);
    const height = Math.round(host!.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      boxes.clear();
    }
    // Forget panels that stopped burning.
    for (const [element, box] of boxes) {
      if (!list.some((target) => target.element === element)) {
        context.clearRect(box.x, box.y, box.w, box.h);
        boxes.delete(element);
      }
    }
    turn = (turn + 1) % list.length;
    const target = list[turn]!;
    // Panels do not move during a stage: read layout a few times a second, not every frame.
    if (now - rectsAt > 400) {
      rectsAt = now;
      originRect = host!.getBoundingClientRect();
      rects.clear();
    }
    let rect = rects.get(target.element);
    if (rect === undefined) {
      rect = target.element.getBoundingClientRect();
      rects.set(target.element, rect);
    }
    const origin = originRect!;
    const margin = target.kind === "bar" ? 30 : 54;
    const boxW = rect.width + margin * 2;
    const boxH = rect.height + margin * 2;
    const box = boxes.get(target.element) ?? { x: 0, y: 0, w: 0, h: 0, embers: [], drawnAt: 0 };
    if (box.w > 0) context.clearRect(box.x, box.y, box.w, box.h);
    box.x = Math.floor((rect.left - origin.left - margin) * dpr);
    box.y = Math.floor((rect.top - origin.top - margin) * dpr);
    box.w = Math.ceil(boxW * dpr);
    box.h = Math.ceil(boxH * dpr);
    const dt = Math.min(0.1, (now - (box.drawnAt || now)) / 1000);
    box.drawnAt = now;
    boxes.set(target.element, box);

    const uniforms = material!.uniforms as Record<string, { value: unknown }>;
    const scale = RESOLUTION[quality];
    uniforms.uTime!.value = (now - started) / 1000;
    (uniforms.uSize!.value as import("three").Vector2).set(boxW, boxH);
    (uniforms.uRect!.value as import("three").Vector4).set(margin, margin, rect.width, rect.height);
    uniforms.uHeat!.value = target.heat;
    uniforms.uBar!.value = target.kind === "bar" ? 1 : 0;
    const shot = renderShared(scene!, camera!, Math.max(8, Math.round(boxW * scale)), Math.max(8, Math.round(boxH * scale)));
    if (shot !== null) context.drawImage(shot.source, shot.sx, shot.sy, shot.width, shot.height, box.x, box.y, box.w, box.h);

    // Embers rise out of the frame (box-local CSS px).
    const rate = (EMBERS[quality] * target.heat) / 3;
    const spawn = Math.floor(rate * dt + Math.random());
    for (let index = 0; index < spawn && box.embers.length < 50; index += 1) {
      const side = Math.random();
      box.embers.push({
        x: margin + (side < 0.75 ? Math.random() * rect.width : side < 0.88 ? 0 : rect.width),
        y: margin + (side < 0.75 ? rect.height * (0.4 + Math.random() * 0.6) : Math.random() * rect.height),
        vx: (Math.random() - 0.5) * 26,
        vy: -(28 + Math.random() * 50 * target.heat),
        life: 0.6 + Math.random() * 0.9,
        age: 0,
        size: 2 + Math.random() * (1.5 + target.heat),
      });
    }
    context.globalCompositeOperation = "lighter";
    let live = 0;
    for (const ember of box.embers) {
      ember.age += dt;
      if (ember.age >= ember.life || ember.y < 0) continue;
      ember.x += (ember.vx + Math.sin((ember.age + ember.y) * 6) * 16) * dt;
      ember.y += ember.vy * dt;
      const life = 1 - ember.age / ember.life;
      const size = ember.size * (0.6 + life) * 2.4 * dpr;
      context.globalAlpha = life;
      context.drawImage(sprite!, box.x + ember.x * dpr - size / 2, box.y + ember.y * dpr - size / 2, size, size);
      box.embers[live++] = ember;
    }
    box.embers.length = live;
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }

  function wake(): void {
    if (running) return;
    if (targets().length === 0 || getQuality() === "low") return;
    running = true;
    if (!ready) {
      void prepare().then(() => requestAnimationFrame(frame));
      return;
    }
    requestAnimationFrame(frame);
  }

  const observer = new MutationObserver(wake);
  observer.observe(left, { attributes: true, attributeFilter: ["data-heat"] });
  observer.observe(right, { attributes: true, attributeFilter: ["data-heat"] });
  observer.observe(status, { attributes: true, attributeFilter: ["class"] });
  wake();
}
