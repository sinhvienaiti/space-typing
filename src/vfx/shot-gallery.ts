/**
 * Dev-only player shot gallery (shot-gallery.html): the selected ship auto-types
 * at mock targets over the real World 01 background, so bolt designs can be
 * reviewed and screenshotted without playing a stage.
 *
 * URL: ?ship=<character>, ?q=low|medium|high|ultra, ?cps=<keys per second>, ?t=<time scale>,
 * ?art=0 (code-drawn shots, to compare with the painted sprites),
 * ?stopAt=<seconds> (freeze the picture then, for repeatable screenshots),
 * ?idle=1 (no typing: the ship's idle lights only).
 */
import { loadArtAssetManifest, preloadArtAssets } from "../assets/pipeline";
import { BackgroundStage } from "../background/stage";
import {
  activeShipLightRig,
  characterShipAngle,
  characterShipPoint,
  drawCharacterShip,
  setCharacterShipSheet,
  type CharacterDrawOptions,
} from "../characters/renderer";
import { selectCharacterShipSheet } from "../characters/ship-art";
import { isCharacterId, type CharacterId } from "../characters/registry";
import { ShipMotion } from "../characters/ship-motion";
import type { VisualQuality } from "../types";
import { PlayerShotSystem, preloadShotArt, type ShotAimPoint } from "./player-shots";
import { ShipExhaust } from "./ship-exhaust";

type Target = {
  word: string;
  typed: number;
  x: number;
  y: number;
  baseX: number;
  phase: number;
  flash: number;
  /** Hit reaction like the game's stagger: recoil, hold and sideways shake. */
  kick: number;
  stun: number;
  shake: number;
  /** Fully typed: waiting for the finishing bolt, then respawns. */
  dying: boolean;
  respawnIn: number;
};

type Payload = { target: Target; kill: boolean };

const WORDS = ["galaxy", "nebula", "comet", "orbit", "photon", "quasar", "meteor", "stellar"];
const PLAYER_Y_OFFSET = 72;

const params = new URLSearchParams(window.location.search);
const requestedShip = params.get("ship");
const shipId: CharacterId =
  requestedShip !== null && isCharacterId(requestedShip)
    ? requestedShip
    : "vanguard";
const view = document.getElementById("view") as HTMLCanvasElement;
const context = view.getContext("2d")!;
const panel = document.getElementById("panel")!;
const qualitySelect = document.getElementById("quality") as HTMLSelectElement;
const cpsInput = document.getElementById("cps") as HTMLInputElement;
const timeScaleInput = document.getElementById("timeScale") as HTMLInputElement;
const shipSelect = document.getElementById("ship") as HTMLSelectElement;
shipSelect.value = shipId;
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
// Same ship behaviour as the game: turn toward the target, recoil, throttle.
const motion = new ShipMotion();
const exhaust = new ShipExhaust();
const shipPoint: ShotAimPoint = { x: 0, y: 0 };
const nozzlePoints: ShotAimPoint[] = [];
let lastTarget: Target | null = null;
const stopAt = Number(params.get("stopAt") ?? "Infinity");
const idle = params.get("idle") === "1";
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
  next.kick = 0;
  next.stun = 0;
  next.shake = 0;
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

function shipOptions(at: number): CharacterDrawOptions {
  return {
    x: width / 2,
    y: height - PLAYER_Y_OFFSET,
    time: at,
    scale: 1,
    aim: motion.aim,
    recoil: motion.recoil,
    boost: motion.boost,
  };
}

function typeKey(): void {
  const target = currentTarget();
  if (target === null) return;
  target.typed += 1;
  const kill = target.typed >= target.word.length;
  if (kill) target.dying = true;
  motion.fire(width / 2, height - PLAYER_Y_OFFSET, target.x, target.y, kill ? 1.45 : 0.8);
  lastTarget = target;
  const pose = shipOptions(time);
  characterShipPoint(pose, 0, 0, shipPoint);
  shots.fire({
    characterId: shipId,
    originX: shipPoint.x,
    originY: shipPoint.y,
    originAngle: characterShipAngle(pose),
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
  const { x } = target;
  const y = target.y - target.kick * 7;
  // Like the game: only the body recoils and shakes; the word label holds still.
  const labelY = target.y;
  const bodyX = x + (target.shake > 0 ? Math.sin(time * 95) * 2.8 * (target.shake / 0.12) : 0);
  context.save();
  const orb = context.createRadialGradient(bodyX - 5, y - 6, 2, bodyX, y, 24);
  orb.addColorStop(0, target.flash > 0 ? "#ffffff" : "#ffd6f3");
  orb.addColorStop(0.55, "#ff7ccf");
  orb.addColorStop(1, "rgba(255,90,190,0)");
  context.fillStyle = orb;
  context.beginPath();
  context.arc(bodyX, y, 24, 0, Math.PI * 2);
  context.fill();
  // Word label like the game's: dark box, typed letters dimmed.
  context.font = "700 20px ui-monospace, Menlo, monospace";
  const labelWidth = context.measureText(target.word).width + 22;
  context.fillStyle = "rgba(6,8,14,0.86)";
  context.fillRect(x - labelWidth / 2, labelY - 66, labelWidth, 32);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255,210,140,0.45)";
  context.fillText(target.word, x, labelY - 50);
  context.save();
  context.beginPath();
  const typedWidth = context.measureText(target.word.slice(0, target.typed)).width;
  context.rect(x - labelWidth / 2, labelY - 66, 11 + typedWidth, 32);
  context.clip();
  context.fillStyle = "#ffd98a";
  context.fillText(target.word, x, labelY - 50);
  context.restore();
  context.restore();
}

let last = performance.now();
let keyTimer = 0;
let time = 0;

const trackTarget = (out: ShotAimPoint): boolean => {
  if (lastTarget === null || lastTarget.respawnIn > 0) return false;
  out.x = lastTarget.x;
  out.y = lastTarget.y;
  return true;
};

function frame(now: number): void {
  const quality = qualitySelect.value as VisualQuality;
  const scale = time >= stopAt ? 0 : Number(timeScaleInput.value);
  const dt = Math.min(0.05, (now - last) / 1000) * scale;
  last = now;
  time += dt;

  keyTimer += dt;
  const interval = idle ? Infinity : 1 / Number(cpsInput.value);
  while (keyTimer >= interval) {
    keyTimer -= interval;
    typeKey();
  }
  motion.update(dt, width / 2, height - PLAYER_Y_OFFSET, trackTarget);
  const rig = activeShipLightRig(shipId);
  if (rig !== null) {
    const pose = shipOptions(time);
    rig.nozzles.forEach(([x, y], index) => {
      const point = (nozzlePoints[index] ??= { x: 0, y: 0 });
      characterShipPoint(pose, x, y, point);
    });
    exhaust.update(dt, nozzlePoints, characterShipAngle(pose), motion.boost, quality);
  }
  targets.forEach((target, index) => {
    target.x = target.baseX + Math.sin(time * 0.7 + target.phase) * width * 0.05;
    if (target.stun > 0) target.stun = Math.max(0, target.stun - dt);
    else target.y += dt * 10;
    target.flash = Math.max(0, target.flash - dt * 7);
    target.kick = Math.max(0, target.kick - dt * 4);
    target.shake = Math.max(0, target.shake - dt);
    if (target.respawnIn > 0) {
      target.respawnIn -= dt;
      if (target.respawnIn <= 0) spawnTarget(target, index);
    }
  });
  for (const arrival of shots.update(dt, aim, quality)) {
    arrival.payload.target.flash = 1;
    arrival.payload.target.kick = Math.max(arrival.payload.target.kick, 1.6);
    arrival.payload.target.stun = 0.06;
    arrival.payload.target.shake = 0.12;
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
  if (rig !== null) exhaust.draw(context, rig);
  drawCharacterShip(context, shipId, shipOptions(time));
  shots.drawMuzzleFlashes(context);
  requestAnimationFrame(frame);
}

qualitySelect.addEventListener("change", () =>
  stage.setQuality(qualitySelect.value as VisualQuality),
);
shipSelect.addEventListener("change", () => {
  const next = new URL(window.location.href);
  next.searchParams.set("ship", shipSelect.value);
  window.location.href = next.toString();
});
window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.key === "h" || event.key === "H") panel.classList.toggle("hidden");
});
(window as unknown as { __shotGallery: unknown }).__shotGallery = { shots, targets, motion, exhaust };

resize();
requestAnimationFrame(frame);
// ?art=0 compares against the code-drawn look.
if (params.get("art") !== "0") preloadShotArt(shipId);
void (async () => {
  try {
    const catalog = await preloadArtAssets(await loadArtAssetManifest());
    const ship = selectCharacterShipSheet(catalog, "auto");
    setCharacterShipSheet(ship.image, ship.source);
  } catch (error) {
    console.warn("Ship art unavailable; procedural ship shown.", error);
  }
})();
