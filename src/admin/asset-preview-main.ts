import "./asset-preview.css";
import {
  AssetPreviewMessageGate,
  AssetPreviewProtocolError,
  assetPreviewScenario,
  createAssetPreviewResponse,
  type AssetPreviewCommand,
  type AssetPreviewScenario,
} from "./asset-preview-protocol";
import { AssetPreviewResourceScope } from "./asset-preview-lifecycle";
import {
  AssetPreviewMutationQueue,
  AssetPreviewSupersededError,
} from "./asset-preview-mutation-queue";
import { BossAssetPreviewScene } from "./boss-asset-preview";
import { EnemyAssetPreviewScene } from "./enemy-asset-preview";
import { WorldStageAssetPreviewScene } from "./world-stage-asset-preview";
import {
  createShipAssetPreviewCandidate,
  flashShipAssetPreviewRelief,
  prepareShipAssetPreviewCandidate,
  releaseShipAssetPreviewCandidate,
  renderShipAssetPreviewRelief,
  shipAssetPreviewHasRelief,
  shipAssetPreviewPresentation,
  updateShipAssetPreviewCandidate,
  withShipAssetPreviewRuntime,
  type ShipAssetPreviewCandidate,
} from "./ship-asset-preview";
import {
  characterShipAngle,
  drawCharacterShip,
  setCharacterShipSheet,
} from "../characters/renderer";
import { playerProjectileProfile } from "../characters/projectiles";
import { Sfx } from "../audio/Sfx";
import { PlayerShotSystem } from "../vfx/player-shots";

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredQueryToken(name: string): string {
  const value = new URLSearchParams(window.location.search).get(name);
  if (value === null || !/^[A-Za-z0-9._:-]{8,160}$/.test(value)) {
    throw new Error(`Missing or invalid ${name}.`);
  }
  return value;
}

function exactParentOrigin(): string {
  if (window.parent === window || document.referrer.length === 0) {
    throw new Error("Admin preview must run inside its parent frame.");
  }
  const referrer = new URL(document.referrer);
  if (referrer.protocol !== "http:" && referrer.protocol !== "https:") {
    throw new Error("Admin preview parent origin is unsupported.");
  }
  return referrer.origin;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Asset preview DOM is missing ${selector}.`);
  return element;
}

function requiredCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("2D Canvas is unavailable.");
  return context;
}

type PreviewDomain = "ship" | "enemy" | "boss" | "world" | "stage";

const SHIP_SCENARIOS = new Set<AssetPreviewScenario>(["idle", "move", "fire"]);
const WORLD_STAGE_SCENARIOS = new Set<AssetPreviewScenario>(["idle"]);
const canvas = requiredElement<HTMLCanvasElement>("#assetPreviewCanvas");
const status = requiredElement<HTMLElement>("#assetPreviewStatus");
const context = requiredCanvasContext(canvas);

const previewSessionId = requiredQueryToken("previewSession");
const nonce = requiredQueryToken("nonce");
const parentOrigin = exactParentOrigin();
const parentSource = window.parent;
const gate = new AssetPreviewMessageGate(parentOrigin, parentSource, previewSessionId, nonce);
const resources = new AssetPreviewResourceScope();
const shipMutations = new AssetPreviewMutationQueue();
const shots = new PlayerShotSystem<number>();
const sfx = new Sfx();
const enemyScene = new EnemyAssetPreviewScene();
const bossScene = new BossAssetPreviewScene();
const worldStageScene = new WorldStageAssetPreviewScene();
resources.addDisposer(() => shots.clear());
resources.addDisposer(() => sfx.destroy());
resources.addDisposer(() => enemyScene.reset());
resources.addDisposer(() => bossScene.reset());
resources.addDisposer(() => worldStageScene.destroy());

setCharacterShipSheet(null);

let shipCandidate: ShipAssetPreviewCandidate | null = null;
let activeDomain: PreviewDomain | null = null;
let candidateGeneration = 0;
let scenario: AssetPreviewScenario = "idle";
let paused = false;
let simulationSeconds = 0;
let previousFrameMs: number | null = null;
let nextShotSeconds = 0;
let lastShotSeconds = Number.NEGATIVE_INFINITY;
let nextReliefGun = 0;
let disposed = false;
let viewWidth = 1;
let viewHeight = 1;
let viewDpr = 1;

resources.addDisposer(() => {
  candidateGeneration += 1;
  if (shipCandidate !== null) releaseShipAssetPreviewCandidate(shipCandidate);
  shipCandidate = null;
  activeDomain = null;
});

function post(type: "READY" | "APPLIED" | "ERROR" | "DISPOSED", requestId: number, payload?: unknown): void {
  parentSource.postMessage(
    createAssetPreviewResponse(previewSessionId, nonce, type, requestId, payload),
    parentOrigin,
  );
}

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  viewDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  viewWidth = Math.max(1, rect.width);
  viewHeight = Math.max(1, rect.height);
  canvas.width = Math.max(1, Math.round(viewWidth * viewDpr));
  canvas.height = Math.max(1, Math.round(viewHeight * viewDpr));
  context.setTransform(viewDpr, 0, 0, viewDpr, 0, 0);
}

function background(): void {
  context.clearRect(0, 0, viewWidth, viewHeight);
  const gradient = context.createRadialGradient(
    viewWidth * 0.5,
    viewHeight * 0.55,
    10,
    viewWidth * 0.5,
    viewHeight * 0.55,
    Math.max(viewWidth, viewHeight) * 0.7,
  );
  gradient.addColorStop(0, "#102840");
  gradient.addColorStop(0.48, "#071321");
  gradient.addColorStop(1, "#02060c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, viewWidth, viewHeight);

  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = "#7edcff";
  context.lineWidth = 1;
  const step = 44;
  for (let x = 0; x <= viewWidth; x += step) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, viewHeight);
    context.stroke();
  }
  for (let y = 0; y <= viewHeight; y += step) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(viewWidth, y);
    context.stroke();
  }
  context.restore();
}

function maybeFire(activeCandidate: ShipAssetPreviewCandidate, shipX: number, shipY: number): void {
  if (scenario !== "fire" || paused || simulationSeconds < nextShotSeconds) return;
  const drawOptions = {
    x: shipX,
    y: shipY,
    time: simulationSeconds,
    scale: 1.55,
    boost: 0.72,
    recoil: 0.8,
  };
  const fired = shots.fire({
    characterId: activeCandidate.characterId,
    originX: shipX,
    originY: shipY,
    originAngle: characterShipAngle(drawOptions),
    originScale: drawOptions.scale,
    targetX: viewWidth * 0.5,
    targetY: Math.max(52, viewHeight * 0.16),
    viewHeight,
    power: 1,
    payload: 1,
  });
  if (fired) {
    sfx.shot(1);
    flashShipAssetPreviewRelief(activeCandidate, nextReliefGun++);
  }
  lastShotSeconds = simulationSeconds;
  nextShotSeconds = simulationSeconds + 0.65;
}

function previewImpactSound(activeCandidate: ShipAssetPreviewCandidate, power: number, x: number): void {
  withShipAssetPreviewRuntime(activeCandidate, () => {
    const variant = playerProjectileProfile(activeCandidate.characterId).impactVariant;
    const pan = Math.max(-1, Math.min(1, (x / Math.max(1, viewWidth)) * 2 - 1)) * 0.6;
    sfx.boltImpact(power, pan, variant);
  });
}

function drawShipFrame(dt: number): void {
  const activeCandidate = shipCandidate;
  if (activeCandidate === null) return;
  const shipX = viewWidth * 0.5;
  const shipY = viewHeight * 0.72;
  const relief = shipAssetPreviewHasRelief(activeCandidate);
  status.textContent = `${activeCandidate.characterId.toUpperCase()} · ${scenario.toUpperCase()} · ${relief ? "production 3D renderer" : "production renderer"}`;
  withShipAssetPreviewRuntime(activeCandidate, () => maybeFire(activeCandidate, shipX, shipY));
  if (!paused) {
    const arrivals = shots.update(dt, () => false, "high");
    for (const arrival of arrivals) previewImpactSound(activeCandidate, arrival.power, arrival.x);
  }
  shots.drawShots(context, "high");

  const recoil = scenario === "fire"
    ? Math.max(0, 1 - (simulationSeconds - lastShotSeconds) / 0.12)
    : 0;
  const boost = scenario === "move" ? 1 : scenario === "fire" ? 0.72 : 0.35;
  let drewRelief = false;
  if (relief) {
    const presentation = shipAssetPreviewPresentation(activeCandidate);
    const roll = scenario === "move" ? Math.sin(simulationSeconds * 1.7) * 0.18 : 0;
    const yaw = scenario === "move" ? Math.sin(simulationSeconds * 1.1) * 0.07 : 0;
    const frame = renderShipAssetPreviewRelief(activeCandidate, {
      width: Math.max(150, Math.min(viewWidth * 0.5, viewHeight * 0.48)),
      dpr: viewDpr,
      roll,
      yaw,
      pitch: -Math.min(1, recoil) * 0.08,
      heat: scenario === "idle" ? 0.2 : scenario === "move" ? 0.62 : 0.82,
      rim: presentation.glow,
      blast: null,
      engine: { power: boost, color: presentation.engine },
      time: simulationSeconds,
      dt,
      quality: "high",
    });
    if (frame !== null) {
      context.drawImage(frame.canvas, shipX - frame.size / 2, shipY - frame.size / 2, frame.size, frame.size);
      drewRelief = true;
    }
  }
  if (!drewRelief) {
    withShipAssetPreviewRuntime(activeCandidate, () => {
      drawCharacterShip(context, activeCandidate.characterId, {
        x: shipX,
        y: shipY,
        time: simulationSeconds,
        scale: 1.55,
        glowScale: 1,
        detailScale: 1,
        boost,
        recoil: Math.min(1, recoil),
      });
    });
  }
  shots.drawMuzzleFlashes(context);
  shots.drawImpacts(context, "high");
}

function drawFrame(frameMs: number): void {
  if (disposed || resources.isDisposed) return;
  if (previousFrameMs === null) previousFrameMs = frameMs;
  const dt = Math.min(0.05, Math.max(0, (frameMs - previousFrameMs) / 1000));
  previousFrameMs = frameMs;
  if (!paused) simulationSeconds += dt;

  if (activeDomain === "world" || activeDomain === "stage") {
    context.clearRect(0, 0, viewWidth, viewHeight);
    const active = worldStageScene.activeCandidate;
    if (active !== null) {
      worldStageScene.draw(context, viewWidth, viewHeight, viewDpr, simulationSeconds);
      status.textContent = active.domain === "world"
        ? `${active.world.name.toUpperCase()} · AMBIENT · WorldSceneRenderer`
        : `STAGE ${String(active.stage)} · ${active.world.name.toUpperCase()} · ${String(active.stageRole).toUpperCase()} · WorldSceneRenderer`;
    }
  } else {
    background();
    if (activeDomain === "ship" && shipCandidate !== null) {
      drawShipFrame(dt);
    } else if (activeDomain === "enemy" && enemyScene.activeCandidate !== null) {
      const enemy = enemyScene.activeCandidate;
      status.textContent = `${enemy.definition.name.toUpperCase()} · ${enemyScene.activeScenario.toUpperCase()} · production enemy renderer`;
      enemyScene.draw(context, viewWidth, viewHeight, simulationSeconds, dt, paused);
    } else if (activeDomain === "boss" && bossScene.activeCandidate !== null) {
      const boss = bossScene.activeCandidate;
      status.textContent = `${boss.identity.name.toUpperCase()} · ${bossScene.activeScenario.toUpperCase()} · production boss renderer`;
      bossScene.draw(context, viewWidth, viewHeight, simulationSeconds, dt, paused);
    } else {
      status.textContent = "READY · waiting for validated production candidate";
    }
  }
  resources.setAnimationFrame(requestAnimationFrame(drawFrame));
}

function releaseShip(): void {
  if (shipCandidate !== null) releaseShipAssetPreviewCandidate(shipCandidate);
  shipCandidate = null;
  shots.clear();
  nextReliefGun = 0;
  lastShotSeconds = Number.NEGATIVE_INFINITY;
}

function clearNonShipScenes(): void {
  enemyScene.reset();
  bossScene.reset();
  worldStageScene.reset();
}

function superseded(message: string): AssetPreviewSupersededError {
  return new AssetPreviewSupersededError(message);
}

async function loadShipCandidate(input: Record<string, unknown>): Promise<Readonly<Record<string, unknown>>> {
  if (typeof input.characterId !== "string") throw new Error("Invalid Ship preview candidate payload.");
  const generation = ++candidateGeneration;
  return shipMutations.run(async () => {
    if (disposed || resources.isDisposed || generation !== candidateGeneration) {
      throw superseded("Ship preview candidate was superseded before materialization.");
    }
    const next = createShipAssetPreviewCandidate(
      input.characterId as string,
      input.visual,
      input.imageAssetVersionId,
      input.projectileArchetype,
      input.reliefAssetVersionId,
    );
    try {
      await prepareShipAssetPreviewCandidate(next, window.fetch.bind(window), () => new Image());
    } catch (error) {
      releaseShipAssetPreviewCandidate(next);
      throw error;
    }
    if (disposed || resources.isDisposed || generation !== candidateGeneration) {
      releaseShipAssetPreviewCandidate(next);
      throw superseded("Ship preview candidate was superseded by a newer request.");
    }
    releaseShip();
    clearNonShipScenes();
    shipCandidate = next;
    activeDomain = "ship";
    scenario = "idle";
    nextShotSeconds = simulationSeconds + 0.08;
    return Object.freeze({
      domain: "ship",
      characterId: next.characterId,
      imageAssetVersionId: next.imageAssetVersionId,
      reliefAssetVersionId: next.reliefAssetVersionId,
      reliefPreviewRequested: next.reliefPreviewRequested,
      projectileArchetype: next.projectileArchetype,
      presentation: shipAssetPreviewPresentation(next),
      scenarios: ["idle", "move", "fire"],
    });
  });
}

async function tuneShipCandidate(payload: unknown): Promise<Readonly<Record<string, unknown>>> {
  const generation = candidateGeneration;
  return shipMutations.run(async () => {
    if (
      disposed ||
      resources.isDisposed ||
      generation !== candidateGeneration ||
      activeDomain !== "ship" ||
      shipCandidate === null
    ) {
      throw superseded("Ship preview tuning was superseded before it could be applied.");
    }
    const previous = shipCandidate;
    const input = object(payload);
    const next = updateShipAssetPreviewCandidate(previous, input?.visual);
    try {
      if (next.session !== previous.session && (next.imageAssetVersionId !== null || next.reliefPreviewRequested)) {
        await prepareShipAssetPreviewCandidate(next, window.fetch.bind(window), () => new Image());
      }
    } catch (error) {
      if (next.session !== previous.session) releaseShipAssetPreviewCandidate(next);
      throw error;
    }
    if (
      disposed ||
      resources.isDisposed ||
      generation !== candidateGeneration ||
      activeDomain !== "ship" ||
      shipCandidate !== previous
    ) {
      if (next.session !== previous.session) releaseShipAssetPreviewCandidate(next);
      throw superseded("Ship preview tuning was superseded by a newer request.");
    }
    shipCandidate = next;
    if (next.session !== previous.session) releaseShipAssetPreviewCandidate(previous);
    return Object.freeze({
      reliefAssetVersionId: next.reliefAssetVersionId,
      projectileArchetype: next.projectileArchetype,
      presentation: shipAssetPreviewPresentation(next),
    });
  });
}

function prepareNonShipCandidate(): void {
  candidateGeneration += 1;
  releaseShip();
  clearNonShipScenes();
}

function loadEnemyCandidate(input: Record<string, unknown>): Readonly<Record<string, unknown>> {
  if (typeof input.definitionId !== "string") throw new Error("Invalid Enemy preview candidate payload.");
  prepareNonShipCandidate();
  const metadata = enemyScene.load(input.definitionId, simulationSeconds);
  activeDomain = "enemy";
  scenario = "idle";
  return Object.freeze({ domain: "enemy", ...metadata });
}

function loadBossCandidate(input: Record<string, unknown>): Readonly<Record<string, unknown>> {
  if (typeof input.bossId !== "string") throw new Error("Invalid Boss preview candidate payload.");
  prepareNonShipCandidate();
  const metadata = bossScene.load(input.bossId, simulationSeconds);
  activeDomain = "boss";
  scenario = "idle";
  return Object.freeze({ domain: "boss", ...metadata });
}

function loadWorldCandidate(input: Record<string, unknown>): Readonly<Record<string, unknown>> {
  if (typeof input.worldId !== "string") throw new Error("Invalid World preview candidate payload.");
  prepareNonShipCandidate();
  const metadata = worldStageScene.loadWorld(input.worldId);
  activeDomain = "world";
  scenario = "idle";
  return Object.freeze({ domain: "world", ...metadata });
}

function loadStageCandidate(input: Record<string, unknown>): Readonly<Record<string, unknown>> {
  if (!Number.isSafeInteger(input.stage)) throw new Error("Invalid Stage preview candidate payload.");
  prepareNonShipCandidate();
  const metadata = worldStageScene.loadStage(input.stage as number);
  activeDomain = "stage";
  scenario = "idle";
  return Object.freeze({ domain: "stage", ...metadata });
}

async function loadCandidate(payload: unknown): Promise<Readonly<Record<string, unknown>>> {
  const input = object(payload);
  if (input === null) throw new Error("Invalid production preview candidate payload.");
  if (input.domain === "ship") return loadShipCandidate(input);
  if (input.domain === "enemy") return loadEnemyCandidate(input);
  if (input.domain === "boss") return loadBossCandidate(input);
  if (input.domain === "world") return loadWorldCandidate(input);
  if (input.domain === "stage") return loadStageCandidate(input);
  throw new Error(`Unsupported production preview domain: ${String(input.domain)}.`);
}

async function applyCommand(command: AssetPreviewCommand): Promise<void> {
  if (command.type === "LOAD_CANDIDATE") {
    post("APPLIED", command.requestId, await loadCandidate(command.payload));
    return;
  }
  if (command.type === "SET_TUNING") {
    post("APPLIED", command.requestId, await tuneShipCandidate(command.payload));
    return;
  }
  if (command.type === "SET_SCENARIO") {
    const input = object(command.payload);
    const nextScenario = assetPreviewScenario(input?.scenario);
    if (activeDomain === "ship") {
      if (!SHIP_SCENARIOS.has(nextScenario)) {
        throw new Error(`Ship production preview does not support scenario: ${nextScenario}.`);
      }
      scenario = nextScenario;
      shots.clear();
      nextReliefGun = 0;
      lastShotSeconds = Number.NEGATIVE_INFINITY;
      nextShotSeconds = simulationSeconds + 0.08;
    } else if (activeDomain === "enemy") {
      enemyScene.setScenario(nextScenario, simulationSeconds);
      scenario = nextScenario;
    } else if (activeDomain === "boss") {
      bossScene.setScenario(nextScenario, simulationSeconds);
      scenario = nextScenario;
    } else if (activeDomain === "world" || activeDomain === "stage") {
      if (!WORLD_STAGE_SCENARIOS.has(nextScenario)) {
        throw new Error(`${activeDomain === "world" ? "World" : "Stage"} production preview supports ambient/idle only.`);
      }
      scenario = "idle";
    } else {
      throw new Error("SET_SCENARIO requires a loaded candidate.");
    }
    post("APPLIED", command.requestId, { scenario });
    return;
  }
  if (command.type === "PAUSE") {
    const input = object(command.payload);
    paused = input?.paused === true;
    post("APPLIED", command.requestId, { paused });
    return;
  }
  if (command.type === "RESET") {
    candidateGeneration += 1;
    releaseShip();
    clearNonShipScenes();
    activeDomain = null;
    scenario = "idle";
    paused = false;
    post("APPLIED", command.requestId, { reset: true });
    return;
  }
  if (command.type === "DISPOSE") {
    post("DISPOSED", command.requestId);
    disposed = true;
    resources.dispose();
  }
}

function requestIdFrom(value: unknown): number {
  const input = object(value);
  const requestId = input?.requestId;
  return typeof requestId === "number" && Number.isSafeInteger(requestId) ? requestId : 0;
}

function onMessage(event: MessageEvent): void {
  if (disposed) return;
  let command: AssetPreviewCommand;
  try {
    command = gate.accept(event);
  } catch (error) {
    if (
      error instanceof AssetPreviewProtocolError &&
      (error.code === "wrong-origin" || error.code === "wrong-source")
    ) return;
    const message = error instanceof Error ? error.message : "Preview command failed.";
    post("ERROR", requestIdFrom(event.data), { message });
    return;
  }
  void applyCommand(command).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Preview command failed.";
    post("ERROR", command.requestId, {
      message,
      ...(error instanceof AssetPreviewSupersededError ? { code: "STALE_PREVIEW_COMMAND" } : {}),
    });
  });
}

window.addEventListener("message", onMessage, { signal: resources.signal });
window.addEventListener("resize", resize, { signal: resources.signal });
window.addEventListener("pagehide", () => resources.dispose(), { signal: resources.signal, once: true });
resize();
resources.setAnimationFrame(requestAnimationFrame(drawFrame));
post("READY", 0, {
  domain: "multi",
  domains: {
    ship: { scenarios: ["idle", "move", "fire"], exactVersionMedia: true, relief3d: true },
    enemy: { scenarios: ["idle", "hit", "death"], renderer: "production-modular-enemy" },
    boss: { scenarios: ["idle", "phase", "hit", "death"], renderer: "production-painted-boss" },
    world: { scenarios: ["idle"], renderer: "WorldSceneRenderer", animation: "production-ambient" },
    stage: { scenarios: ["idle"], renderer: "WorldSceneRenderer", stageMapping: "worldForStage" },
  },
  renderer: "production",
  candidateState: "ephemeral",
});
