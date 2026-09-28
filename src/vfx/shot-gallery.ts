/**
 * Dev-only player shot gallery (shot-gallery.html): Vanguard auto-types at
 * mock targets over the real World 01 background, so bolt designs can be
 * reviewed and screenshotted without playing a stage.
 *
 * URL: ?q=low|medium|high|ultra, ?cps=<keys per second>, ?t=<time scale>,
 * ?art=0 (code-drawn shots, to compare with the painted sprites).
 */
import { loadArtAssetManifest, preloadArtAssets } from "../assets/pipeline";
import { BackgroundStage } from "../background/stage";
import { drawCharacterShip, setCharacterShipSheet } from "../characters/renderer";
import { selectCharacterShipSheet } from "../characters/ship-art";
import type { VisualQuality } from "../types";
import { PlayerShotSystem, preloadShotArt, type ShotAimPoint } from "./player-shots";

type Target = {
  word: string;
  typed: number;
  x: number;
  y: number;
  baseX: number;
  phase: number;
  flash: number;
  /** Fully typed: waiting for the finishing bolt, then respawns. */
  dying: boolean;
  respawnIn: number;
};

type Payload = { target: Target; kill: boolean };

const WORDS = ["galaxy", "nebula", "comet", "orbit", "photon", "quasar", "meteor", "stellar"];
const PLAYER_Y_OFFSET = 72;

const params = new URLSearchParams(window.location.search);
const view = document.getElementById("view") as HTMLCanvasElement;
const context = view.getContext("2d")!;
const panel = document.getElementById("panel")!;
const qualitySelect = document.getElementById("quality") as HTMLSelectElement;
const cpsInput = document.getElementById("cps") as HTMLInputElement;
const timeScaleInput = document.getElementById("timeScale") as HTMLInputElement;
qualitySelect.value = params.get("q") ?? "high";
cpsInput.value = params.get("cps") ?? "8";
timeScaleInput.value = params.get("t") ?? "1";
if (params.get("panel") === "0") panel.classList.add("hidden");

const stage = new BackgroundStage(document.getElementById("bgCanvas") as HTMLCanvasElement, {
  presentation: "blit",
  quality: qualitySelect.value as VisualQuality,
});
stage.setWorld("world-01");

const shots = new PlayerShotSystem<Payload>();
const targets: Target[] = [];
let width = 1;
let height = 1;
let wordCursor = 0;

function spawnTarget(target: Target | null, index: number): Target {
  const next = target ?? ({} as Target);
  next.word = WORDS[wordCursor++ % WORDS.length]!;
  next.typed = 0;
  next.baseX = width * (0.22 + 0.28 * index) + (Math.random() - 0.5) * width * 0.08;
  next.x = next.baseX;
  next.y = height * (0.16 + Math.random() * 0.34);
  next.phase = Math.random() * Math.PI * 2;
  next.flash = 0;
  next.dying = false;
  next.respawnIn = 0;
  return next;
}

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  width = window.innerWidth;
  height = window.innerHeight;
  view.width = Math.round(width * dpr);
  view.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  stage.resize(width, height, dpr);
  if (targets.length === 0) for (let index = 0; index < 3; index += 1) targets.push(spawnTarget(null, index));
}

function currentTarget(): Target | null {
  let best: Target | null = null;
  for (const target of targets) {
    if (target.dying || target.respawnIn > 0) continue;
    if (best === null || target.typed > best.typed || (target.typed === best.typed && target.y > best.y)) {
      best = target;
    }
  }
  return best;
}

function typeKey(): void {
  const target = currentTarget();
  if (target === null) return;
  target.typed += 1;
  const kill = target.typed >= target.word.length;
  if (kill) target.dying = true;
  shots.fire({
    characterId: "vanguard",
    originX: width / 2,
    originY: height - PLAYER_Y_OFFSET,
    targetX: target.x,
    targetY: target.y,
    power: kill ? 1.45 : 0.8,
    viewHeight: height,
    payload: { target, kill },
  });
}

const aim = (payload: Payload, out: ShotAimPoint): boolean => {
  out.x = payload.target.x;
  out.y = payload.target.y;
  return true;
};

function drawTarget(target: Target): void {
  if (target.respawnIn > 0) return;
  const { x, y } = target;
  context.save();
  const orb = context.createRadialGradient(x - 5, y - 6, 2, x, y, 24);
  orb.addColorStop(0, target.flash > 0 ? "#ffffff" : "#ffd6f3");
  orb.addColorStop(0.55, "#ff7ccf");
  orb.addColorStop(1, "rgba(255,90,190,0)");
  context.fillStyle = orb;
  context.beginPath();
  context.arc(x, y, 24, 0, Math.PI * 2);
  context.fill();
  // Word label like the game's: dark box, typed letters dimmed.
  context.font = "700 20px ui-monospace, Menlo, monospace";
  const labelWidth = context.measureText(target.word).width + 22;
  context.fillStyle = "rgba(6,8,14,0.86)";
  context.fillRect(x - labelWidth / 2, y - 66, labelWidth, 32);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255,210,140,0.45)";
  context.fillText(target.word, x, y - 50);
  context.save();
  context.beginPath();
  const typedWidth = context.measureText(target.word.slice(0, target.typed)).width;
  context.rect(x - labelWidth / 2, y - 66, 11 + typedWidth, 32);
  context.clip();
  context.fillStyle = "#ffd98a";
  context.fillText(target.word, x, y - 50);
  context.restore();
  context.restore();
}

let last = performance.now();
let keyTimer = 0;
let time = 0;

function frame(now: number): void {
  const quality = qualitySelect.value as VisualQuality;
  const scale = Number(timeScaleInput.value);
  const dt = Math.min(0.05, (now - last) / 1000) * scale;
  last = now;
  time += dt;

  keyTimer += dt;
  const interval = 1 / Number(cpsInput.value);
  while (keyTimer >= interval) {
    keyTimer -= interval;
    typeKey();
  }
  targets.forEach((target, index) => {
    target.x = target.baseX + Math.sin(time * 0.7 + target.phase) * width * 0.05;
    target.y += dt * 10;
    target.flash = Math.max(0, target.flash - dt * 7);
    if (target.respawnIn > 0) {
      target.respawnIn -= dt;
      if (target.respawnIn <= 0) spawnTarget(target, index);
    }
  });
  for (const arrival of shots.update(dt, aim, quality)) {
    arrival.payload.target.flash = 1;
    if (arrival.payload.kill) arrival.payload.target.respawnIn = 0.45;
  }

  stage.setTimeScale(scale);
  stage.render(time, 0, 0);
  if (stage.active) context.drawImage(stage.canvas, 0, 0, width, height);
  else {
    context.fillStyle = "#04060c";
    context.fillRect(0, 0, width, height);
  }
  shots.drawShots(context, quality);
  for (const target of targets) drawTarget(target);
  shots.drawImpacts(context, quality);
  drawCharacterShip(context, "vanguard", {
    x: width / 2,
    y: height - PLAYER_Y_OFFSET,
    time,
    scale: 1,
  });
  shots.drawMuzzleFlashes(context);
  requestAnimationFrame(frame);
}

qualitySelect.addEventListener("change", () => stage.setQuality(qualitySelect.value as VisualQuality));
window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.key === "h" || event.key === "H") panel.classList.toggle("hidden");
});
(window as unknown as { __shotGallery: unknown }).__shotGallery = { shots, targets };

resize();
requestAnimationFrame(frame);
// ?art=0 compares against the code-drawn look.
if (params.get("art") !== "0") preloadShotArt("vanguard");
void (async () => {
  try {
    const catalog = await preloadArtAssets(await loadArtAssetManifest());
    const ship = selectCharacterShipSheet(catalog, "auto");
    setCharacterShipSheet(ship.image, ship.source);
  } catch (error) {
    console.warn("Ship art unavailable; procedural ship shown.", error);
  }
})();
