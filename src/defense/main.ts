// First: the game's Interface motion setting answers prefers-reduced-motion (CSS and JS).
import { motionReduced } from "../ui/motion-preference";
import "@fontsource/exo-2/700.css";
import "@fontsource/exo-2/800.css";
import "@fontsource/exo-2/800-italic.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "../ui/reward-cards.css";
import "./defense.css";
import * as THREE from "three";
import { allBossIdentities, bossFullName } from "../boss/identity";
import { paintedEnemyArtUrl } from "../enemies/painted-sprites";
import { buildCombatLearningEvent, LEARNING_ATTEMPT_MESSAGE, PARENT_ORIGIN } from "../learning/shared";
import { loadModel, modelEntry, pickModelTier } from "../render3d/model-loader";
import { HeroFx } from "../scene3d/fx";
import { Hero } from "../scene3d/hero";
import { isComposingKey, typedLetter, vietnameseInputSign } from "../scene3d/keys";
import { SceneAudio, type SceneSfx } from "../scene3d/sfx";
import { SpaceStage, TIERS, type Quality } from "../scene3d/space";
import { clamp, COLORS } from "../scene3d/util";
import { WordPicker } from "../scene3d/words";
import { FlightWorld } from "../scene3d/world";
import { speakEnglish } from "../speech";
import type { EnemyKind, GameSettings, VocabularyEntry } from "../types";
import { paintedEquipmentIcon, paintedItemIcon, paintedSkillIcon } from "../ui/painted-icons";
import { renderRewardCards, type RewardCardInput } from "../ui/reward-card";
import { loadVocabularyIndex, loadVocabularyLevel } from "../vocabulary";
import { ABILITY, BOONS, ENEMIES, RUBBLE_COST, SKILLS, TOWER_ORDER, TOWERS, type Branch, type Difficulty, type EnemyType, type SkillId, type TowerType } from "./rules/data";
import { DefenseEngine, STEP, type DefenseEvent, type Enemy, type Tower } from "./rules/engine";
import { towerFit } from "./rules/fit";
import { MAPS, mapById, type MapSpec } from "./rules/maps";
import { DefenseCamera } from "./view/camera";
import { Crowd } from "./view/crowd";
import { paintGround } from "./view/painter";
import { DefenseSounds } from "./view/sounds";
import { ROAD_Y, Terrain, fit } from "./view/terrain";
import { TOWER_COLOR, TowerViews } from "./view/towers";
import { DefenseFx, type Damage } from "./view/vfx";

/**
 * Rift Defense (beta), defense.html: the typing tower defense of
 * docs/SPACE_TYPING_DEFENSE_PLAN_V4_2026-10-21.md. The rules (rules/) run at
 * a fixed step; this page draws them: one painted island per map with its
 * family's enemies, the owner's tower, Core and boss models, every tower
 * strike, enemy attack, fire and smoke (view/vfx.ts) and sound
 * (view/sounds.ts), a free camera, and the game's reward cards for boons
 * and tower branches. Its own storage only (spaceTypingDefense…).
 */

const SETTINGS_KEY = "spaceTypingSettingsV1";
const SOURCE_KEY = "spaceTypingVocabularySourceV1";
const QUALITY_KEY = "spaceTypingDefenseQualityV1";
const SOUND_KEY = "spaceTypingDefenseSoundV1";
const DIFFICULTY_KEY = "spaceTypingDefenseDifficultyV1";
const MAP_KEY = "spaceTypingDefenseMapV1";
const BEST_KEY = "spaceTypingDefenseBestV2";
const FALLBACK_WORDS = [
  "star", "orbit", "comet", "planet", "rocket", "galaxy", "meteor", "signal", "engine", "shield", "laser", "pilot", "moon", "solar", "nebula", "light",
  "space", "wing", "flame", "dragon", "power", "speed", "focus", "energy", "crystal", "storm", "thunder", "ocean", "garden", "harbor", "island", "jungle",
  "kettle", "lemon", "mirror", "number", "quiet", "river", "silver", "tiger", "under", "village", "window", "yellow", "zebra", "anchor", "bridge", "candle",
];
/** Explosion colours: the map family's glow, for the roles a little warmer. */
const KILL_COLOR = new THREE.Color("#ffd36b");
const STORM_WAVES = new Set(["Storm", "Great storm", "Iron tide"]);

// ------------------------------------------------------------------ helpers

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error("rift defense: missing #" + id);
  return element as T;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(storage()?.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

/** A storage write that may fail (blocked or full storage): then it lasts for this visit only. */
function safely(write: () => void): void {
  try {
    write();
  } catch {
    // Kept for this visit only.
  }
}

function gameSettings(): GameSettings {
  const saved = readJson<Partial<GameSettings>>(SETTINGS_KEY) ?? {};
  return {
    sfxVolume: Number.isFinite(saved.sfxVolume) ? saved.sfxVolume! : 0.7,
    musicVolume: Number.isFinite(saved.musicVolume) ? saved.musicVolume! : 0.5,
    ambientVolume: Number.isFinite(saved.ambientVolume) ? saved.ambientVolume! : 0.4,
    screenShake: saved.screenShake ?? true,
    visualQuality: saved.visualQuality ?? "high",
    pronunciationEnabled: saved.pronunciationEnabled ?? true,
    pronunciationRate: Number.isFinite(saved.pronunciationRate) ? saved.pronunciationRate! : 0.9,
    pronunciationVolume: Number.isFinite(saved.pronunciationVolume) ? saved.pronunciationVolume! : 1,
  };
}

/** A painted icon id "kind/name" (src/assets/icons/<kind>/<name>.webp) → its URL. */
function iconUrl(id: string): string | null {
  const [kind, name] = id.split("/") as [string, string];
  return kind === "equipment" ? paintedEquipmentIcon(name) : kind === "skills" ? paintedSkillIcon(name) : paintedItemIcon(name);
}

// ------------------------------------------------------------------ stage

const settings = gameSettings();
const reduced = motionReduced();
const canvas = byId<HTMLCanvasElement>("dfCanvas");
const quality0: Quality = ((): Quality => {
  const chosen = storage()?.getItem(QUALITY_KEY);
  if (chosen === "medium" || chosen === "high") return chosen;
  return settings.visualQuality === "high" || settings.visualQuality === "ultra" ? "high" : "medium";
})();
let stage: SpaceStage;
try {
  stage = new SpaceStage(canvas, quality0);
} catch {
  byId("dfStatus").textContent = "This browser cannot start WebGL, so Rift Defense cannot run here.";
  throw new Error("rift defense: no WebGL");
}
const world = new FlightWorld(stage.scene, stage.quality);
world.skyOnly = true;
const audio = new SceneAudio(clamp(settings.sfxVolume, 0, 1) * 0.7, clamp(settings.musicVolume, 0, 1) * 0.45);
audio.enabled = storage()?.getItem(SOUND_KEY) !== "off";
const sounds = new DefenseSounds(audio);
const heroFx = new HeroFx(stage, audio);
heroFx.showHalo = false;
heroFx.trailDrift = 0;
heroFx.setGlowColor(new THREE.Color("#ff9a4a"));
const fx = new DefenseFx(stage);
fx.setQuality(stage.quality === "high");
const terrain = new Terrain(stage.scene);
const crowd = new Crowd(stage.scene);
const towerViews = new TowerViews(stage.scene, terrain);
const camera = new DefenseCamera(stage.camera, canvas);
const dragon = new THREE.Group();
stage.scene.add(dragon);

const labelLayer = byId("dfLabels");
const barLayer = byId("dfBars");
const floatLayer = byId("dfFloaters");
const banner = byId("dfBanner");
const chainLabel = byId("dfChain");
const vignette = byId("dfVignette");

let hero: Hero | null = null;
let picker: WordPicker | null = null;
let entries: VocabularyEntry[] = [];
let vocabularyLevel = 1;
let engine: DefenseEngine | null = null;
let map: MapSpec = mapById(storage()?.getItem(MAP_KEY));
let difficulty: Difficulty = ((): Difficulty => {
  const saved = storage()?.getItem(DIFFICULTY_KEY);
  return saved === "easy" || saved === "hard" ? saved : "normal";
})();
let paused = false;
let clock = 0;
let last = performance.now();
let accumulator = 0;
let hitstop = 0;
let slowmo = 1;
let devScale = 1;
let bannerTimer = 0;
let chainTimer = 0;
let wordInfoTimer = 0;
let selectedPad = -1;
let hoverPad = -1;
let previewTower: TowerType | null = null;
let endTimer = 0;
let lastHud = "";
let lastInspector = "";
let lastCards = "";
let frameSamples: number[] = [];
let autoChecked = false;
let healed = 0;
let alarmClock = 0;
let mapLoading: Promise<void> | null = null;
const blasts: number[] = [];
const jammedBefore = new Set<number>();

// ------------------------------------------------------------------ loading

async function loadDragon(quality: Quality): Promise<void> {
  const entry = (await modelEntry("heroes", "draconis-v3")) ?? (await modelEntry("heroes", "draconis-v2"));
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url === null) throw new Error("The Draconis model is not in the model manifest.");
  const gltf = await loadModel(url);
  hero?.dispose();
  hero = new Hero(gltf.scene, gltf.animations, {
    tipsPerSide: 0,
    trail: TIERS[quality].trail,
    palette: [COLORS.ember, COLORS.gold],
    trailSockets: [],
    fitSize: 3.6,
    knock: 0.4,
    pitch: { idle: 0, fly: 0, boost: 0 },
    release: { spit: (0.42 * 11) / 24, spitBig: (0.45 * 15) / 24, cast: (0.46 * 39) / 24 },
    additive: ["spit", "spitBig", "cast", "hit"],
    bob: false,
  });
  hero.locomotion = "fly";
  dragon.add(hero.root);
  for (const ribbon of hero.ribbons) stage.scene.add(ribbon.mesh);
  for (const light of stage.handLights) light.color.copy(COLORS.ember);
  heroFx.hitStrength = 0.55;
  heroFx.voiced = true;
  heroFx.castFrom = "mouth";
  heroFx.castRelease = hero.releaseDelay("cast");
  heroFx.setCastColor(COLORS.ember);
}

async function loadFireball(quality: Quality): Promise<void> {
  const entry = await modelEntry("skills", "dragon-fireball");
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url !== null) heroFx.setFireballModel((await loadModel(url)).scene);
}

type BossTemplate = { scene: THREE.Object3D; clips: THREE.AnimationClip[] };
const bossTemplates = new Map<string, BossTemplate>();

async function loadBoss(id: string, quality: Quality): Promise<void> {
  if (bossTemplates.has(id)) return;
  const entry = await modelEntry("bosses", id);
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url === null) return;
  const gltf = await loadModel(url);
  bossTemplates.set(id, { scene: gltf.scene, clips: gltf.animations });
}

async function loadWords(): Promise<VocabularyEntry[]> {
  const source = readJson<{ level?: number }>(SOURCE_KEY);
  vocabularyLevel = Number.isInteger(source?.level) && source!.level! > 0 ? source!.level! : 1;
  try {
    const index = await loadVocabularyIndex();
    const level = index.levels.some((item) => item.level === vocabularyLevel) ? vocabularyLevel : (index.levels[0]?.level ?? 1);
    vocabularyLevel = level;
    return await loadVocabularyLevel(level, index);
  } catch {
    return FALLBACK_WORDS.map((en, index) => ({ id: "fallback-" + index, en, vi: "", ipa: "" }));
  }
}

/** Everything a map needs: its island, its family's enemies, its bosses and its sky. */
function prepareMap(next: MapSpec): Promise<void> {
  const quality = stage.quality;
  mapLoading = Promise.all([
    terrain.build(next, quality),
    crowd.load(next.family, quality),
    loadBoss(next.bosses.lieutenant, quality).catch(() => undefined),
    loadBoss(next.bosses.warden, quality).catch(() => undefined),
    world.setStage(next.skyStage),
  ]).then(() => {
    const [x, z] = next.core;
    // The dragon hovers beside the Core, between it and the roads.
    dragon.position.set(x + 6, 8.5, z + (Math.abs(z) < 4 ? 5 : -2));
    camera.setHome(next.camera, engine === null);
  });
  return mapLoading;
}

// ------------------------------------------------------------------ audio

const LOUD: ReadonlySet<SceneSfx> = new Set(["kill", "bigBlast", "death", "bossHit"]);

/** Sound with a cap: at most 6 explosions in any 120 ms, the rest are folded into the ones playing. */
function sfx(name: SceneSfx, gain: number, pan = 0): void {
  if (LOUD.has(name)) {
    const now = performance.now();
    while (blasts.length > 0 && now - blasts[0]! > 120) blasts.shift();
    if (blasts.length >= 6) return;
    blasts.push(now);
  }
  audio.play(name, gain, { pan: clamp(pan, -1, 1), gap: 0.03 });
}

/** Stereo pan of a point as the camera sees it. */
function panOf(x: number, z: number): number {
  const local = point.set(x, 0, z).applyMatrix4(stage.camera.matrixWorldInverse);
  return clamp(local.x / 30, -0.9, 0.9);
}

// ------------------------------------------------------------------ maps menu

const thumbs = new Map<string, string>();

function bestStars(): Record<string, number> {
  return readJson<Record<string, number>>(BEST_KEY) ?? {};
}

function renderMaps(): void {
  const best = bestStars();
  const list = byId("dfMaps");
  list.replaceChildren(
    ...MAPS.map((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "df-map" + (item.id === map.id ? " is-on" : "");
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", String(item.id === map.id));
      const picture = document.createElement("span");
      picture.className = "df-map-art";
      const thumb = thumbs.get(item.id);
      if (thumb !== undefined) picture.style.backgroundImage = "url(" + thumb + ")";
      const enemy = paintedEnemyArtUrl(item.family, "scout");
      if (enemy !== undefined) {
        const face = document.createElement("img");
        face.src = enemy;
        face.alt = "";
        face.loading = "lazy";
        picture.append(face);
      }
      const number = document.createElement("em");
      number.textContent = String(item.number);
      const name = document.createElement("b");
      name.textContent = item.name;
      const vi = document.createElement("small");
      vi.textContent = item.nameVi + " · " + item.paths.length + (item.paths.length > 1 ? " gates" : " gate") + " · " + item.pads.length + " pads";
      const blurb = document.createElement("span");
      blurb.className = "df-map-blurb";
      blurb.textContent = item.blurb;
      const stars = document.createElement("i");
      const got = best[item.id + ":" + difficulty] ?? 0;
      stars.textContent = got > 0 ? "★".repeat(got) + "☆".repeat(3 - got) : "☆☆☆";
      stars.className = got > 0 ? "is-won" : "";
      card.append(picture, number, name, vi, blurb, stars);
      card.addEventListener("click", () => chooseMap(item));
      card.addEventListener("dblclick", () => {
        chooseMap(item);
        void startRun();
      });
      return card;
    }),
  );
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-difficulty]")) button.setAttribute("aria-checked", String(button.dataset.difficulty === difficulty));
}

/** Map thumbnails: each island painted small, one at a time so the menu stays responsive. */
function paintThumbs(): void {
  const next = MAPS.find((item) => !thumbs.has(item.id));
  if (next === undefined) return;
  const painted = paintGround(next, 256);
  thumbs.set(next.id, painted.color.toDataURL("image/jpeg", 0.82));
  if (!byId("dfMenu").hidden) renderMaps();
  window.setTimeout(paintThumbs, 30);
}

function chooseMap(next: MapSpec): void {
  if (next.id === map.id) return;
  map = next;
  safely(() => storage()?.setItem(MAP_KEY, next.id));
  renderMaps();
  byId("dfStatus").textContent = "Loading " + next.name + "…";
  void prepareMap(next).then(() => {
    if (map === next) byId("dfStatus").textContent = next.name + " · vocabulary level " + vocabularyLevel;
  });
}

// ------------------------------------------------------------------ run

async function startRun(): Promise<void> {
  if (picker === null) return;
  audio.unlock();
  sounds.preload();
  clearRun();
  if (mapLoading !== null) await mapLoading;
  picker = new WordPicker(entries, 8);
  engine = new DefenseEngine({ map, difficulty, words: picker });
  towerViews.reset(map.pads.length);
  camera.setHome(map.camera, false);
  selectedPad = -1;
  hoverPad = -1;
  previewTower = null;
  endTimer = 0;
  slowmo = 1;
  lastHud = lastInspector = lastCards = "";
  showOverlay(null);
  byId("dfHud").hidden = false;
  labelLayer.hidden = false;
  byId("dfMapName").textContent = map.number + " · " + map.name;
  showBanner(map.name, "Choose a pad and build your first towers", false, 2.6);
  void audio.playMusic("music/sector.ogg");
}

function clearRun(): void {
  engine = null;
  for (const element of labels.values()) element.remove();
  labels.clear();
  labelState.clear();
  for (const element of bars.values()) element.remove();
  bars.clear();
  for (const view of bossViews.values()) view.root.removeFromParent();
  bossViews.clear();
  heroFx.clear();
  fx.clear();
  jammedBefore.clear();
  terrain.showRange(0, 0, 0, 0, null);
  document.body.classList.remove("df-tier-1", "df-tier-2", "df-tier-3");
}

type Overlay = "dfMenu" | "dfCards" | "dfReview" | "dfPause" | "dfResult";
function showOverlay(id: Overlay | null): void {
  for (const name of ["dfMenu", "dfCards", "dfReview", "dfPause", "dfResult"] as const) byId(name).hidden = name !== id;
}

function showBanner(text: string, small = "", fire = false, seconds = 1.8): void {
  banner.replaceChildren(text);
  if (small !== "") {
    const line = document.createElement("small");
    line.textContent = small;
    banner.append(line);
  }
  banner.classList.toggle("is-fire", fire);
  banner.classList.add("is-on");
  bannerTimer = seconds;
}

function enemyById(id: number): Enemy | null {
  return engine?.enemies.find((enemy) => enemy.alive && enemy.id === id) ?? null;
}

/** Where an enemy's body is (its hover height above the road). */
function enemyAt(enemy: { x: number; z: number; type: EnemyType }, out: THREE.Vector3): THREE.Vector3 {
  return out.set(enemy.x, ROAD_Y + ENEMIES[enemy.type].lift + (ENEMIES[enemy.type].boss === true ? 2.5 : 0.2), enemy.z);
}

function padPoint(pad: number, out: THREE.Vector3): THREE.Vector3 {
  const at = engine!.pads[pad]!;
  return out.set(at.x, terrain.padTop(at), at.z);
}

function coreAt(out: THREE.Vector3): THREE.Vector3 {
  return out.set(map.core[0], terrain.heightAt(map.core[0], map.core[1]) + 3, map.core[1]);
}

// ------------------------------------------------------------------ dragon

/** The dragon spits a fireball at an enemy (a word's last letter: the big spit). */
function spit(id: number, big: boolean, final: boolean, x: number, z: number): void {
  if (hero === null) return;
  const shot = big ? "spitBig" : "spit";
  hero.play(shot);
  const delay = hero.releaseDelay(shot);
  const radius = big ? 0.6 : final ? 0.42 : 0.32;
  heroFx.charge(3, delay, radius * 0.8);
  const fallback = new THREE.Vector3(x, 1.2, z);
  const track = (): THREE.Vector3 => {
    const enemy = enemyById(id);
    return enemy === null ? fallback : enemyAt(enemy, fallback);
  };
  window.setTimeout(() => {
    const from = heroFx.jaws(new THREE.Vector3(), true, big ? 1.6 : 1, track());
    audio.voice(big ? "spitBig" : "spit", big ? 0.9 : 0.7, { pan: panOf(from.x, from.z), gap: 0.04 });
    heroFx.fireball(from, track, radius, Math.max(0.12, 0.36 - delay), () => undefined);
  }, delay * 1000);
}

function updateDragon(dt: number): void {
  if (hero === null) return;
  const target = engine?.locked ?? engine?.enemies.filter((enemy) => enemy.alive && enemy.labeled).sort((a, b) => remaining(a) - remaining(b))[0] ?? null;
  const tx = target?.x ?? 0;
  const tz = target?.z ?? 0;
  const want = Math.atan2(-(tx - dragon.position.x), -(tz - dragon.position.z));
  let delta = want - dragonYaw;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  dragonYaw += delta * Math.min(1, dt * 4);
  dragon.rotation.y = dragonYaw;
  dragon.position.y = 8.5 + Math.sin(clock * 1.3) * 0.25;
  hero.locomotion = "fly";
  hero.update(dt, clock, 0, 0);
}
let dragonYaw = 0;

function remaining(enemy: Enemy): number {
  return engine === null ? 0 : engine.paths[enemy.path]!.length - enemy.s;
}

// ------------------------------------------------------------------ bosses

type BossView = { root: THREE.Group; mixer: THREE.AnimationMixer; clips: THREE.AnimationClip[]; id: number; type: EnemyType };
const bossViews = new Map<number, BossView>();

function bossIn(id: number, type: EnemyType): void {
  const bossId = type === "warden" ? map.bosses.warden : map.bosses.lieutenant;
  const template = bossTemplates.get(bossId);
  const identity = allBossIdentities().find((item) => item.id === bossId);
  showBanner(identity !== undefined ? bossFullName(identity) : ENEMIES[type].name, type === "warden" ? "Boss · break its armour word by word" : "Lieutenant · it stamps on your towers", true, 2.8);
  audio.voice("roar", 1, { gap: 0.3 });
  sfx("warp", 0.6);
  if (template === undefined) return;
  const root = new THREE.Group();
  root.add(fit(template.scene.clone(true), ENEMIES[type].size * 1.25));
  stage.scene.add(root);
  const model = root.children[0]!;
  const mixer = new THREE.AnimationMixer(model);
  const idle = template.clips.find((clip) => clip.name.includes("Idle"));
  if (idle !== undefined) mixer.clipAction(idle).play();
  const view: BossView = { root, mixer, clips: template.clips, id, type };
  bossViews.set(id, view);
  playBoss(view, "Intro");
}

function playBoss(view: BossView, needle: string): void {
  const clip = view.clips.find((item) => item.name.includes(needle));
  if (clip === undefined) return;
  const action = view.mixer.clipAction(clip);
  action.reset().setLoop(THREE.LoopOnce, 1).play();
  action.clampWhenFinished = needle === "Death";
}

function bossDown(id: number, x: number, z: number): void {
  const view = bossViews.get(id);
  if (view !== undefined) playBoss(view, "Death");
  for (let index = 0; index < 6; index += 1) {
    window.setTimeout(() => {
      fx.explosion(point.set(x + (Math.random() - 0.5) * 4, 2 + Math.random() * 5, z + (Math.random() - 0.5) * 3), 1.4);
      kick(0.5, 0.06);
    }, index * 160);
  }
  window.setTimeout(() => {
    view?.root.removeFromParent();
    bossViews.delete(id);
  }, 1400);
}

// ------------------------------------------------------------------ events

const point = new THREE.Vector3();
const point2 = new THREE.Vector3();

function handle(event: DefenseEvent): void {
  const e = engine;
  if (e === null) return;
  switch (event.kind) {
    case "waveStart": {
      const spec = map.waves[event.wave - 1]!;
      showBanner("Wave " + event.wave, spec.name, event.wave === map.waves.length, 2);
      sfx("boost", 0.45);
      sfx("warp", 0.5);
      if (event.early > 0) floater("+" + event.early + " early", coreAt(point), "energy");
      const boss = spec.groups.some((group) => ENEMIES[group.type].boss === true);
      void audio.playMusic(STORM_WAVES.has(spec.name) || boss ? "duel/music/duel-combat-intense.ogg" : "music/sector.ogg");
      for (const gate of terrain.gates) fx.build(point.copy(gate.position).setY(ROAD_Y + 0.2), new THREE.Color(map.palette.rim), true);
      selectedPad = -1;
      break;
    }
    case "spawn":
      if (ENEMIES[event.type].boss === true) bossIn(event.id, event.type);
      break;
    case "shot":
      spit(event.id, event.bomb, event.final, event.x, event.z);
      break;
    case "layer": {
      const enemy = enemyById(event.id);
      const at = enemy === null ? point.set(event.x, 1.6, event.z) : enemyAt(enemy, point);
      if (event.by === "word") {
        heroFx.spray(at, COLORS.gold, 14, 5, 0.14);
        sfx(enemy !== null && ENEMIES[enemy.type].boss === true ? "bossHit" : "impact", 0.4, panOf(event.x, event.z));
      } else if (event.by === "heal") {
        floater("+armour", at, "heal");
      }
      const view = bossViews.get(event.id);
      if (view !== undefined && event.by !== "heal") playBoss(view, "Hit");
      break;
    }
    case "kill": {
      const scale = ENEMIES[event.type].size / 2.4;
      heroFx.explode(point.set(event.x, ROAD_Y + ENEMIES[event.type].lift, event.z), KILL_COLOR.clone().lerp(new THREE.Color(map.palette.vein), 0.5), Math.min(1.6, scale) * (event.byBlast ? 0.75 : 1), false);
      sfx("kill", event.byBlast ? 0.3 : 0.45, panOf(event.x, event.z));
      if (ENEMIES[event.type].boss === true) bossDown(event.id, event.x, event.z);
      break;
    }
    case "swarmPop": {
      const enemy = e.enemies.find((item) => item.id === event.id);
      crowd.popSwarm(event.x, event.z, event.drones, enemy?.seed ?? 0.5);
      point.set(event.x, 1.4, event.z);
      heroFx.wave(point, COLORS.cyan, 0.4, 6, 0.55, 0.85);
      stage.flash(point, COLORS.cyan, 6);
      sfx("bigBlast", 0.55, panOf(event.x, event.z));
      kick(0.25, 0.07);
      break;
    }
    case "blast": {
      point.set(event.x, ROAD_Y + 1, event.z);
      fx.explosion(point, (event.small ? 0.45 : 0.6) + event.radius * 0.14);
      if (!event.small) heroFx.fireBurst(point, 0.4 + event.radius * 0.14);
      sfx("bigBlast", event.depth === 0 ? 0.6 : 0.38, panOf(event.x, event.z));
      if (event.depth > 0) sounds.chain(panOf(event.x, event.z));
      kick(event.depth === 0 ? 0.35 : 0.18, event.depth === 0 ? 0.07 : 0.03);
      if (event.depth > 0) {
        chainLabel.textContent = "CHAIN ×" + (event.depth + 1);
        chainLabel.style.setProperty("--df-chain-scale", String(1 + Math.min(0.8, event.depth * 0.08)));
        chainLabel.classList.add("is-on");
        chainTimer = 1.2;
      }
      break;
    }
    case "shatter":
      fx.freeze(point.set(event.x, 1.2, event.z));
      sounds.freeze(panOf(event.x, event.z));
      break;
    case "shieldBreak":
      fx.shieldBreak(point.set(event.x, ROAD_Y + 1.6, event.z));
      sounds.shield(panOf(event.x, event.z));
      break;
    case "frost": {
      const tower = e.towers[event.pad]!;
      fx.frostWave(padPoint(event.pad, point).setY(point.y + 0.1), e.range(tower), TOWER_COLOR.frost);
      towerViews.kick(event.pad, 0.6);
      sounds.frost(panOf(point.x, point.z));
      break;
    }
    case "freeze":
      for (const id of event.ids) {
        const enemy = enemyById(id);
        if (enemy !== null) fx.freeze(enemyAt(enemy, point));
      }
      padPoint(event.pad, point);
      sounds.freeze(panOf(point.x, point.z));
      towerViews.kick(event.pad, 1);
      break;
    case "lance": {
      const from = towerViews.top(e, event.pad, new THREE.Vector3());
      const id = event.id;
      const fallback = new THREE.Vector3();
      fx.lance(from, () => {
        const enemy = enemyById(id);
        return enemy === null ? fallback : enemyAt(enemy, fallback);
      }, () => undefined);
      sounds.lance(panOf(from.x, from.z));
      towerViews.kick(event.pad, 0.8);
      break;
    }
    case "collapse":
      padPoint(event.pad, point);
      fx.collapse(point.setY(point.y + 0.1), e.range(e.towers[event.pad]!));
      sounds.collapse(panOf(point.x, point.z));
      towerViews.kick(event.pad, 1);
      kick(0.15, 0);
      break;
    case "singularity":
      padPoint(event.pad, point);
      fx.freeze(point.setY(point.y + 1.5));
      sounds.collapse(panOf(point.x, point.z));
      break;
    case "horizon":
      padPoint(event.pad, point);
      fx.horizon(point.setY(point.y + 0.1), e.range(e.towers[event.pad]!));
      sounds.horizon(panOf(point.x, point.z));
      towerViews.kick(event.pad, 1);
      break;
    case "arc": {
      const points = [towerViews.top(e, event.pad, new THREE.Vector3())];
      for (const id of event.ids) {
        const enemy = enemyById(id);
        if (enemy !== null) points.push(enemyAt(enemy, new THREE.Vector3()));
      }
      if (points.length > 1) fx.arc(points, event.overload);
      sounds.arc(panOf(points[0]!.x, points[0]!.z), event.overload);
      towerViews.kick(event.pad, event.overload ? 1 : 0.6);
      break;
    }
    case "mark": {
      const pad = event.pad;
      const id = event.id;
      fx.lock(() => {
        const enemy = enemyById(id);
        if (enemy === null || engine === null || engine.towers[pad] === null) return null;
        return { from: towerViews.top(engine, pad, new THREE.Vector3()), to: enemyAt(enemy, new THREE.Vector3()) };
      });
      sounds.lock(panOf(e.pads[pad]!.x, e.pads[pad]!.z));
      towerViews.kick(pad, 0.7);
      break;
    }
    case "coreHeal": {
      fx.coreHeal(towerViews.top(e, event.pad, point2), coreAt(point));
      floater("+1", point, "heal");
      sounds.coreHeal();
      healed = 1;
      towerViews.kick(event.pad, 0.6);
      break;
    }
    case "revive":
      fx.revive(padPoint(event.pad, point));
      sounds.revive(panOf(point.x, point.z));
      break;
    case "income": {
      const top = towerViews.top(e, event.pad, point);
      fx.income(top);
      floater("+" + event.amount, top, "energy");
      sounds.income(panOf(top.x, top.z));
      towerViews.kick(event.pad, 0.7);
      break;
    }
    case "siphon":
      fx.siphon(point.set(event.x, 1.4, event.z), towerViews.top(e, event.pad, point2));
      sounds.siphon(panOf(event.x, event.z));
      break;
    case "aim": {
      const id = event.id;
      const pad = event.pad;
      const enemy = enemyById(id);
      if (enemy === null) break;
      fx.aim(() => {
        const live = enemyById(id);
        if (live === null || engine === null || live.act === "walk" || engine.towers[pad] == null) return null;
        return { from: enemyAt(live, new THREE.Vector3()), to: towerViews.top(engine, pad, new THREE.Vector3()) };
      }, enemy.type === "sniper" ? ABILITY.sniperAim : 4);
      sounds.aim(panOf(enemy.x, enemy.z));
      if (enemy.type === "destroyer") floater("!", enemyAt(enemy, point), "warn");
      break;
    }
    case "bolt": {
      const enemy = enemyById(event.id);
      if (enemy === null) break;
      const pad = event.pad;
      const to = new THREE.Vector3();
      fx.bolt(enemyAt(enemy, point), () => (engine === null ? to : towerViews.top(engine, pad, to)), event.flight, event.boss, () => undefined);
      sounds.bolt(panOf(enemy.x, enemy.z), event.boss);
      break;
    }
    case "towerHit": {
      const top = towerViews.top(e, event.pad, point);
      top.y -= 1.2;
      if (event.hit !== "shot" && event.hit !== "bolt") fx.hit(top, event.amount / 40);
      floater("−" + event.amount, top, "damage");
      sounds.towerHit(panOf(top.x, top.z), event.amount >= 30);
      towerViews.kick(event.pad, 0.9);
      break;
    }
    case "towerDown": {
      const top = towerViews.top(e, event.pad, point);
      top.y -= 1.4;
      fx.towerDown(top);
      sounds.towerDown(panOf(top.x, top.z));
      showBanner(TOWERS[e.towers[event.pad]!.type].name + " down", "Repair it between waves, or let a Sanctum stand it up", false, 1.8);
      kick(0.4, 0.05);
      break;
    }
    case "mineBlast":
      point.set(event.x, ROAD_Y + 1.2, event.z);
      fx.explosion(point, 0.8, new THREE.Color("#ffb0e8"));
      sounds.mineBlast(panOf(event.x, event.z));
      kick(0.25, 0.03);
      break;
    case "smash": {
      const at = padPoint(event.pad, point).setY(point.y + 0.6);
      fx.smash(at);
      sounds.smash(panOf(at.x, at.z));
      kick(0.35, 0.05);
      break;
    }
    case "stomp":
      fx.stomp(point.set(event.x, 0.2, event.z), event.radius);
      sounds.stomp();
      kick(0.55, 0.06);
      break;
    case "heal": {
      const healer = enemyById(event.id);
      const target = enemyById(event.target);
      if (healer !== null && target !== null) fx.heal(enemyAt(healer, point), enemyAt(target, point2));
      if (healer !== null) sounds.enemyHeal(panOf(healer.x, healer.z));
      break;
    }
    case "launch": {
      const carrier = enemyById(event.id);
      if (carrier !== null) {
        fx.launch(enemyAt(carrier, point));
        sounds.launch(panOf(carrier.x, carrier.z));
      }
      break;
    }
    case "split":
      heroFx.spray(point.set(event.x, 1.4, event.z), new THREE.Color(map.palette.vein), 16, 5, 0.14);
      break;
    case "leak":
      terrain.struck();
      coreAt(point);
      if (event.blocked) {
        fx.shieldBreak(point);
        sounds.shield(0);
        floater("Blocked", point, "heal");
        break;
      }
      fx.explosion(point, ENEMIES[event.type].boss === true ? 2.4 : 0.7, new THREE.Color("#ff6a6a"));
      floater("−" + event.damage, point, "damage");
      sfx("hurt", 0.7);
      kick(0.45, 0);
      vignette.style.opacity = "0.9";
      window.setTimeout(() => (vignette.style.opacity = ""), 260);
      if (e.lives / e.maxLives < 0.3 && alarmClock <= 0) {
        sounds.alarm();
        alarmClock = 6;
      }
      break;
    case "learned":
      showWordInfo(event.entry);
      if (window.parent !== window) {
        window.parent.postMessage({ type: LEARNING_ATTEMPT_MESSAGE, requestId: "rift-defense-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), event: buildCombatLearningEvent({ entry: event.entry, perfect: event.perfect }) }, PARENT_ORIGIN);
      }
      break;
    case "combo": {
      const tier = event.combo >= 50 ? 3 : event.combo >= 25 ? 2 : 1;
      document.body.classList.remove("df-tier-1", "df-tier-2", "df-tier-3");
      document.body.classList.add("df-tier-" + tier);
      showBanner(event.tier + "!", "Combo " + event.combo, true, 1.4);
      sounds.streak();
      if (tier >= 2) audio.voice("roar", 0.5, { gap: 0.5 });
      break;
    }
    case "miss":
      sfx("miss", 0.4);
      document.body.classList.remove("df-tier-1", "df-tier-2", "df-tier-3");
      if (event.id !== null) {
        const element = labels.get(event.id);
        if (element !== undefined) {
          element.classList.remove("is-miss");
          void element.offsetWidth;
          element.classList.add("is-miss");
        }
      }
      break;
    case "skill":
      useSkillFx(event.skill);
      break;
    case "build": {
      const at = padPoint(event.pad, point);
      const color = TOWER_COLOR[event.type];
      fx.build(at, color, event.level > 0);
      if (event.level > 0) sounds.upgrade();
      else sounds.build();
      if (event.branch !== null) showBanner(TOWERS[event.type].branches[event.branch].name, TOWERS[event.type].name + " · level 4", true, 1.8);
      break;
    }
    case "sell":
      fx.sell(padPoint(event.pad, point), new THREE.Color("#5cf2c8"));
      floater("+" + event.refund, point.setY(point.y + 2), "energy");
      sounds.sell();
      break;
    case "repair":
      fx.revive(padPoint(event.pad, point));
      sounds.repair(panOf(point.x, point.z));
      break;
    case "clear":
      fx.build(padPoint(event.pad, point), new THREE.Color("#c8b89a"), false);
      sounds.build();
      break;
    case "waveEnd":
      showBanner(event.perfect ? "Perfect wave" : "Wave cleared", "+" + event.bonus + " Energy", event.perfect, 2);
      floater("+" + event.bonus, coreAt(point), "energy");
      sfx("reward", 0.5);
      document.body.classList.remove("df-tier-1", "df-tier-2", "df-tier-3");
      if (e.review.length > 0) showReview();
      break;
    case "boonOffer":
      showBoons();
      break;
    case "boon":
      showOverlay(null);
      showBanner(BOONS[event.boon].name, BOONS[event.boon].text, true, 2);
      sfx("reward", 0.6);
      break;
    case "bossPhase":
      showBanner(event.phase === 2 ? "The Warden calls its swarms" : "The Warden charges!", event.phase === 3 ? "Every word pushes it back" : "", true, 2);
      audio.voice("roar", 0.8, { gap: 0.3 });
      kick(0.5, 0.05);
      break;
    case "victory":
      endTimer = 1.6;
      slowmo = 0.3;
      heroFx.startVictory(map.core[0], map.core[1]);
      sfx("victory", 0.8);
      break;
    case "defeat":
      endTimer = 1.4;
      slowmo = 0.3;
      fx.explosion(coreAt(point), 3, new THREE.Color("#ff6a6a"));
      sfx("death", 0.8);
      break;
    default:
      break;
  }
}

/** Camera shake and a short freeze-frame (hitstop) on big hits. */
function kick(strength: number, freeze: number): void {
  if (reduced || !settings.screenShake) return;
  camera.shake = Math.max(camera.shake, strength);
  hitstop = Math.max(hitstop, freeze);
}

function useSkillFx(skill: SkillId): void {
  if (skill === "breath") {
    hero?.play("cast");
    heroFx.startCast(() => undefined);
    audio.voice("roar", 0.9, { gap: 0.2 });
    showBanner("Dragon Breath", "Every word is a bomb", true, 1.6);
  } else if (skill === "roar") {
    audio.voice("roar", 1, { gap: 0.2 });
    for (const path of engine?.paths ?? []) {
      for (let index = 0; index < 3; index += 1) {
        const at = path.point(path.length * (0.4 + index * 0.2), 0, { x: 0, z: 0 });
        heroFx.wave(point.set(at.x, 1, at.z), COLORS.gold, 0.5, 9, 0.6, 0.7);
      }
    }
    kick(0.4, 0.05);
    showBanner("Roar", "The rift falls back", true, 1.2);
  } else {
    heroFx.wave(coreAt(point), COLORS.white, 1, 40, 0.9, 0.7);
    stage.flash(point, COLORS.white, 10);
    sfx("burst", 0.7);
    showBanner("Nova", "Short words for 8 s", true, 1.4);
  }
}

// ------------------------------------------------------------------ overlays

function showWordInfo(entry: VocabularyEntry): void {
  byId("dfWordEn").textContent = entry.en;
  byId("dfWordIpa").textContent = entry.ipa ?? "";
  byId("dfWordVi").textContent = entry.vi ?? "";
  byId("dfWordInfo").classList.add("is-on");
  wordInfoTimer = 2.4;
  if (settings.pronunciationEnabled) speakEnglish(entry.en, settings);
}

function showReview(): void {
  if (engine === null) return;
  byId("dfReviewList").replaceChildren(
    ...engine.review.map((word) => {
      const item = document.createElement("li");
      const en = document.createElement("strong");
      en.textContent = word.entry.en;
      const ipa = document.createElement("span");
      ipa.textContent = word.entry.ipa ?? "";
      const say = document.createElement("button");
      say.type = "button";
      say.textContent = "Listen";
      say.addEventListener("click", () => speakEnglish(word.entry.en, settings));
      const vi = document.createElement("em");
      vi.textContent = word.entry.vi ?? "";
      item.append(en, ipa, say, vi);
      return item;
    }),
  );
  showOverlay("dfReview");
}

/** The game's reward cards (src/ui/reward-card.ts) for a boon or a tower branch. */
function showCards(eyebrow: string, title: string, cards: RewardCardInput[], cancellable: boolean): void {
  byId("dfCardsEyebrow").textContent = eyebrow;
  byId("dfCardsTitle").textContent = title;
  byId("dfCardsCancel").hidden = !cancellable;
  renderRewardCards(byId("dfCardGrid"), cards);
  showOverlay("dfCards");
  sfx("uiOpen", 0.6);
}

function showBoons(): void {
  if (engine === null) return;
  showCards(
    "Rift boon · wave " + engine.wave,
    "Choose one",
    engine.offered.map((boon, index) => {
      const spec = BOONS[boon];
      return {
        tier: spec.tier,
        tag: "Boon · " + (spec.tier === "prismatic" ? "Prismatic" : spec.tier === "gold" ? "Gold" : "Silver"),
        title: spec.name,
        description: spec.text,
        iconUrl: iconUrl(spec.icon),
        iconDark: true,
        onPick: () => engine?.chooseBoon(index),
      };
    }),
    false,
  );
}

function showBranches(pad: number): void {
  const e = engine;
  const tower = e?.towers[pad];
  if (e == null || tower == null) return;
  const spec = TOWERS[tower.type];
  showCards(
    spec.name + " · level 4",
    "Choose its branch",
    (["a", "b"] as const).map((branch) => {
      const option = spec.branches[branch];
      const cost = option.stats.cost;
      return {
        tier: branch === "a" ? "gold" : "prismatic",
        tag: "Branch · " + cost + " Energy" + (e.energy < cost ? " (need " + (cost - e.energy) + " more)" : ""),
        title: option.name,
        description: option.text,
        iconUrl: iconUrl(option.icon),
        iconDark: true,
        onPick: () => {
          if (engine?.upgrade(pad, branch as Branch)) showOverlay(null);
          else {
            sfx("miss", 0.4);
            showBanner("Not enough Energy", option.name + " costs " + cost, false, 1.4);
            showOverlay(null);
          }
        },
      };
    }),
    true,
  );
}

function showResult(): void {
  if (engine === null) return;
  const won = engine.phase === "victory";
  const card = byId("dfResult").querySelector(".df-result")!;
  card.classList.toggle("is-win", won);
  card.classList.toggle("is-loss", !won);
  byId("dfResultEyebrow").textContent = won ? map.name + " held · " + difficulty : map.name + " · the Core has fallen at wave " + (engine.wave + 1);
  byId("dfResultTitle").textContent = won ? "Victory" : "Defeat";
  const stars = engine.stars();
  byId("dfStars").replaceChildren(
    ...[0, 1, 2].map((index) => {
      const star = document.createElement("i");
      star.textContent = "★";
      if (index < stars) star.className = "is-on";
      return star;
    }),
  );
  const towersBuilt = engine.towers.filter((tower) => tower !== null).length;
  const stats: [string, string][] = [
    ["WPM", Math.round(engine.wpm).toString()],
    ["Accuracy", Math.round(engine.accuracy * 100) + "%"],
    ["Words", String(engine.stats.words)],
    ["Max combo", String(engine.stats.maxCombo)],
    ["Best chain", "×" + engine.stats.chainBest],
    ["Biggest rift", String(engine.stats.maxAlive)],
    ["Towers", towersBuilt + " · lost " + engine.stats.towersDown],
    ["Core", engine.lives + "/" + engine.startLives],
  ];
  byId("dfResultStats").replaceChildren(
    ...stats.map(([name, value]) => {
      const cell = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = name;
      const data = document.createElement("dd");
      data.textContent = value;
      cell.append(term, data);
      return cell;
    }),
  );
  byId("dfResultTip").textContent = won
    ? stars < 3
      ? "Third star: keep 90% of the Core. A Sanctum heals it; a Gravity Well and a Beacon clear the storms."
      : "A perfect defence."
    : towersBuilt < 3
      ? "Tip: build early — a Frost Spire on a long stretch buys time, an Arc Pylon strips armour and shields."
      : "Tip: upgrade a few towers instead of building many, keep a Sanctum near the front, and type Saboteurs first.";
  const next = MAPS[map.number] ?? null;
  byId("dfNextMap").hidden = !won || next === null;
  if (won) {
    const best = bestStars();
    const key = map.id + ":" + difficulty;
    if ((best[key] ?? 0) < stars) {
      best[key] = stars;
      safely(() => storage()?.setItem(BEST_KEY, JSON.stringify(best)));
    }
  }
  showOverlay("dfResult");
  byId("dfHud").hidden = true;
  labelLayer.hidden = true;
}

function toMenu(): void {
  clearRun();
  paused = false;
  byId("dfHud").hidden = true;
  labelLayer.hidden = true;
  renderMaps();
  showOverlay("dfMenu");
  void audio.playMusic(null);
}

// ------------------------------------------------------------------ labels, bars, floaters

const labels = new Map<number, HTMLDivElement>();
const placed: { element: HTMLDivElement; x: number; y: number; w: number; h: number }[] = [];
const labelState = new Map<number, string>();
const projected = new THREE.Vector3();

function screenOf(at: THREE.Vector3): { x: number; y: number; visible: boolean } {
  projected.copy(at).project(stage.camera);
  return { x: (projected.x * 0.5 + 0.5) * window.innerWidth, y: (-projected.y * 0.5 + 0.5) * window.innerHeight, visible: projected.z < 1 };
}

function updateLabels(): void {
  if (engine === null) return;
  const seen = new Set<number>();
  for (const enemy of engine.enemies) {
    if (!enemy.alive || !enemy.labeled || enemy.word === null) continue;
    seen.add(enemy.id);
    let element = labels.get(enemy.id);
    if (element === undefined) {
      element = document.createElement("div");
      element.className = "df-word";
      labelLayer.append(element);
      labels.set(enemy.id, element);
    }
    const locked = engine.locked === enemy;
    const boss = ENEMIES[enemy.type].boss === true;
    const key = enemy.word.text + "|" + enemy.typed + "|" + enemy.bomb + "|" + enemy.layers + "|" + locked + "|" + enemy.shielded + "|" + (enemy.brittle > 0);
    if (labelState.get(enemy.id) !== key) {
      labelState.set(enemy.id, key);
      element.className =
        "df-word" + (locked ? " is-locked" : "") + (enemy.bomb ? " is-bomb" : "") + (enemy.maxLayers > 1 ? " is-armoured" : "") + (boss ? " is-boss" : "") + (enemy.shielded ? " is-shielded" : "") + (enemy.brittle > 0 ? " is-brittle" : "");
      const typed = document.createElement("b");
      typed.textContent = enemy.word.text.slice(0, enemy.typed);
      element.replaceChildren(typed, enemy.word.text.slice(enemy.typed));
      if (enemy.maxLayers > 1) {
        const pips = document.createElement("span");
        pips.className = "df-pips";
        for (let index = 0; index < enemy.layers; index += 1) pips.append(document.createElement("i"));
        element.append(pips);
      }
    }
    const lift = ROAD_Y + ENEMIES[enemy.type].lift + ENEMIES[enemy.type].size * (boss ? 1.1 : 0.85);
    const at = screenOf(point.set(enemy.x, lift, enemy.z));
    element.hidden = !at.visible;
    placed.push({ element, x: at.x, y: at.y, w: element.offsetWidth, h: element.offsetHeight });
    element.style.zIndex = locked ? "3" : boss ? "2" : "1";
  }
  // Labels that would overlap are pushed apart vertically (enemies bunch up at bends and gates).
  placed.sort((a, b) => a.y - b.y);
  for (let index = 0; index < placed.length; index += 1) {
    const label = placed[index]!;
    for (let other = 0; other < index; other += 1) {
      const above = placed[other]!;
      if (Math.abs(label.x - above.x) < (label.w + above.w) / 2 + 4 && label.y < above.y + above.h + 2) label.y = above.y + above.h + 2;
    }
  }
  for (const label of placed) label.element.style.transform = "translate(" + Math.round(label.x - label.w / 2) + "px," + Math.round(label.y - label.h) + "px)";
  placed.length = 0;
  for (const [id, element] of labels) {
    if (seen.has(id)) continue;
    element.remove();
    labels.delete(id);
    labelState.delete(id);
  }
}

const bars = new Map<number, HTMLDivElement>();

/** A hit-point bar over each damaged tower; "DOWN" over a fallen one. */
function updateBars(): void {
  if (engine === null) return;
  engine.towers.forEach((tower, pad) => {
    let element = bars.get(pad);
    const show = tower !== null && (tower.down || tower.hp < tower.maxHp - 0.5 || tower.jammed || tower.stunned > 0);
    if (!show) {
      if (element !== undefined) element.hidden = true;
      return;
    }
    if (element === undefined) {
      element = document.createElement("div");
      element.className = "df-towerbar";
      element.append(document.createElement("i"), document.createElement("span"));
      barLayer.append(element);
      bars.set(pad, element);
    }
    const share = tower!.down ? 0 : tower!.hp / tower!.maxHp;
    const fill = element.firstElementChild as HTMLElement;
    fill.style.transform = "scaleX(" + share.toFixed(3) + ")";
    element.classList.toggle("is-low", share < 0.35);
    element.classList.toggle("is-down", tower!.down);
    (element.lastElementChild as HTMLElement).textContent = tower!.down ? (tower!.revive > 0 ? "REVIVING " + Math.ceil(tower!.revive) : "DOWN") : tower!.jammed ? "JAMMED" : tower!.stunned > 0 ? "STUNNED" : "";
    const at = screenOf(towerViews.top(engine!, pad, point).setY(point.y + 1.1));
    element.hidden = !at.visible;
    element.style.transform = "translate(" + Math.round(at.x - 30) + "px," + Math.round(at.y) + "px)";
  });
}

type Floater = { element: HTMLDivElement; at: THREE.Vector3; life: number };
const floaters: Floater[] = [];

/** A number or word rising off a point (Energy, damage, heals). */
function floater(text: string, at: THREE.Vector3, kind: "energy" | "damage" | "heal" | "warn"): void {
  let item = floaters.find((candidate) => candidate.life <= 0);
  if (item === undefined) {
    if (floaters.length >= 28) item = floaters.reduce((oldest, candidate) => (candidate.life < oldest.life ? candidate : oldest));
    else {
      const element = document.createElement("div");
      floatLayer.append(element);
      item = { element, at: new THREE.Vector3(), life: 0 };
      floaters.push(item);
    }
  }
  item.element.className = "df-float is-" + kind;
  item.element.textContent = text;
  item.at.copy(at);
  item.life = 1.2;
}

function updateFloaters(dt: number): void {
  for (const item of floaters) {
    if (item.life <= 0) {
      item.element.hidden = true;
      continue;
    }
    item.life -= dt;
    const at = screenOf(item.at);
    const rise = (1.2 - item.life) * 46;
    item.element.hidden = !at.visible;
    item.element.style.transform = "translate(" + Math.round(at.x) + "px," + Math.round(at.y - rise) + "px) translate(-50%, -50%)";
    item.element.style.opacity = String(Math.min(1, item.life * 2.5));
  }
}

// ------------------------------------------------------------------ HUD and build UI

const hud = {
  waveNo: byId("dfWaveNo"),
  waveName: byId("dfWaveName"),
  energy: byId("dfEnergy"),
  lives: byId("dfLives"),
  livesFill: byId("dfLivesFill"),
  combo: byId("dfCombo"),
  tier: byId("dfTier"),
  wpm: byId("dfWpm"),
  alive: byId("dfAlive"),
  charge: byId("dfChargeFill"),
  chargeText: byId("dfChargeText"),
  skills: byId("dfSkills"),
  build: byId("dfBuild"),
  next: byId("dfNext"),
  call: byId<HTMLButtonElement>("dfCallWave"),
  callText: byId("dfCallText"),
  timer: byId("dfBuildTimer"),
};

function building(): boolean {
  return engine !== null && (engine.phase === "build" || engine.phase === "review" || engine.phase === "boon");
}

function updateHud(): void {
  if (engine === null) return;
  const e = engine;
  const wave = Math.min(map.waves.length, e.wave + 1);
  const tier = e.combo >= 50 ? "Rift Fury" : e.combo >= 25 ? "Inferno" : e.combo >= 10 ? "Ignite" : "";
  for (const skill of ["breath", "roar", "nova"] as const) {
    const button = document.querySelector<HTMLElement>("[data-skill='" + skill + "']")!;
    button.style.setProperty("--df-cool", String(e.cooldowns[skill] / Math.max(1, SKILLS[skill].cooldown)));
  }
  const key = [wave, e.energy, e.lives, e.combo, Math.round(e.wpm), e.alive, Math.round(e.charge), e.phase, Math.ceil(e.buildTimer), e.earlyBonus, e.breath > 0, e.nova > 0, e.cooldowns.breath > 0, e.cooldowns.roar > 0].join("|");
  if (key !== lastHud) {
    lastHud = key;
    hud.waveNo.textContent = String(wave);
    hud.waveName.textContent = map.waves[Math.min(map.waves.length - 1, e.wave)]!.name;
    hud.energy.textContent = String(e.energy);
    hud.lives.textContent = String(e.lives);
    hud.livesFill.style.transform = "scaleX(" + clamp(e.lives / e.maxLives, 0, 1) + ")";
    hud.livesFill.parentElement!.classList.toggle("is-low", e.lives / e.maxLives < 0.3);
    hud.combo.textContent = String(e.combo);
    hud.tier.textContent = tier;
    hud.wpm.textContent = String(Math.round(e.wpm));
    hud.alive.textContent = String(e.alive);
    hud.charge.style.transform = "scaleX(" + e.charge / 100 + ")";
    hud.chargeText.textContent = "RIFT CHARGE " + Math.round(e.charge);
    for (const skill of ["breath", "roar", "nova"] as const) {
      const button = document.querySelector<HTMLElement>("[data-skill='" + skill + "']")!;
      button.classList.toggle("is-ready", e.canUse(skill));
      button.classList.toggle("is-active", (skill === "breath" && e.breath > 0) || (skill === "nova" && e.nova > 0));
    }
    const build = building();
    hud.skills.hidden = build;
    hud.build.hidden = e.phase !== "build";
    hud.call.hidden = e.phase !== "build";
    hud.callText.textContent = e.earlyBonus > 0 ? "Call wave now · +" + e.earlyBonus : "Start wave " + wave;
    hud.timer.textContent = e.buildTimer > 0 ? "Wave in " + Math.ceil(e.buildTimer) + " s" : "";
    renderNext();
  }
  updateBuild();
  updateInspector();
}

function renderNext(): void {
  if (engine === null) return;
  const spec = map.waves[engine.wave];
  hud.next.replaceChildren();
  if (spec === undefined || engine.phase === "wave") return;
  const counts = new Map<EnemyType, number>();
  for (const group of spec.groups) counts.set(group.type, (counts.get(group.type) ?? 0) + group.count);
  for (const [type, count] of counts) {
    const chip = document.createElement("span");
    chip.className = "df-chip" + (ENEMIES[type].boss === true ? " is-boss" : "");
    chip.title = ENEMIES[type].name;
    const art = ENEMIES[type].boss === true ? undefined : paintedEnemyArtUrl(map.family, ENEMIES[type].model as EnemyKind);
    if (art !== undefined) {
      const image = document.createElement("img");
      image.src = art;
      image.alt = "";
      chip.append(image);
    }
    const label = document.createElement("b");
    label.textContent = (ENEMIES[type].boss === true ? "" : count + "× ") + ENEMIES[type].name;
    chip.append(label);
    hud.next.append(chip);
  }
}

function updateBuild(): void {
  if (engine === null) return;
  const e = engine;
  const pad = selectedPad;
  const tower = pad >= 0 ? e.towers[pad] ?? null : null;
  const built = e.towers.flatMap((item) => (item === null ? [] : [{ pad: item.pad, type: item.type }]));
  const key = [e.phase, pad, e.energy, tower?.type ?? "", e.cleared[pad] ?? "", built.length, previewTower].join("|");
  if (key === lastCards) return;
  lastCards = key;
  const padSpec = pad >= 0 ? e.pads[pad]! : null;
  byId("dfPadTitle").textContent = pad < 0 ? "Choose a pad" : tower !== null ? "Pad " + (pad + 1) + " · " + TOWERS[tower.type].name : e.cleared[pad] ? "Pad " + (pad + 1) + " · empty" : "Pad " + (pad + 1) + " · rubble";
  const trait = padSpec?.trait ?? "normal";
  byId("dfPadTrait").textContent = trait === "high" ? "High ground · reach +25%" : trait === "ley" ? "Ley line · effects +15%" : trait === "rubble" && !e.cleared[pad] ? "Rubble · clear it first (" + RUBBLE_COST + ")" : "";
  byId("dfPadTrait").className = "df-trait is-" + trait;
  const cards = byId("dfTowerCards");
  cards.replaceChildren(
    ...TOWER_ORDER.map((type, index) => {
      const spec = TOWERS[type];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "df-tcard";
      card.style.setProperty("--df-tower", "#" + TOWER_COLOR[type].getHexString());
      const locked = !e.unlocked(type);
      const cost = spec.levels[0].cost;
      const usable = pad >= 0 && tower === null && e.cleared[pad] === true && !locked;
      card.disabled = !usable || e.energy < cost;
      card.classList.toggle("is-locked", locked);
      card.classList.toggle("is-preview", previewTower === type);
      const image = document.createElement("img");
      image.src = iconUrl(spec.icon) ?? "";
      image.alt = "";
      const kbd = document.createElement("kbd");
      kbd.textContent = String(index + 1);
      const name = document.createElement("b");
      name.textContent = spec.name;
      const role = document.createElement("small");
      role.textContent = locked ? "Opens on map " + (MAPS.find((item) => item.towers.includes(type))?.number ?? "?") : spec.role;
      const price = document.createElement("em");
      price.textContent = String(cost);
      card.append(image, kbd, name, role, price);
      if (usable) {
        const fitted = towerFit(type, pad, e.pads, e.paths, map.core, built);
        const stars = document.createElement("i");
        stars.className = "df-fit df-fit-" + fitted.stars;
        stars.textContent = "★".repeat(fitted.stars) + "☆".repeat(3 - fitted.stars);
        card.append(stars);
        card.title = spec.text + " — " + fitted.reason;
      } else card.title = spec.text;
      card.addEventListener("click", () => buildOn(type));
      card.addEventListener("pointerenter", () => {
        previewTower = type;
        lastCards = "";
        if (usable) byId("dfFitReason").textContent = towerFit(type, pad, e.pads, e.paths, map.core, built).reason;
      });
      card.addEventListener("pointerleave", () => {
        previewTower = null;
        lastCards = "";
        byId("dfFitReason").textContent = "";
      });
      return card;
    }),
  );
}

function statLines(tower: Tower): string[] {
  const e = engine!;
  const stats = e.towerStats(tower);
  const lines = ["Reach " + e.range(tower).toFixed(1) + " m"];
  const haste = e.haste(tower);
  switch (tower.type) {
    case "frost":
      lines.push("Frost wave every " + (stats.period / haste).toFixed(1) + " s", "Slows " + Math.round(stats.slow * e.power(tower) * 100) + "% for " + stats.slowSeconds + " s");
      if (stats.reveal > 0) lines.push("Reveals Phantoms");
      break;
    case "gravity":
      lines.push("Pull " + (stats.pull * e.power(tower)).toFixed(1), "Slows " + Math.round(stats.slow * 100) + "%");
      if (stats.period > 0) lines.push((tower.branch === "b" ? "Throws back every " : "Collapses every ") + stats.period + " s");
      break;
    case "arc":
      lines.push("Lightning every " + (stats.period / haste).toFixed(1) + " s", "Chains to " + stats.targets + " enemies", "Strips 1 armour or a shield each");
      break;
    case "beacon":
      lines.push("Marks a bomb every " + stats.period + " s" + (tower.branch === "b" ? " (two)" : ""));
      if (stats.bonus > 0) lines.push("Blast +" + Math.round(stats.bonus * 100) + "%");
      break;
    case "sanctum":
      lines.push("Core +1 every " + (stats.period / e.power(tower)).toFixed(0) + " s", "Repairs " + stats.repair + " HP/s in reach");
      if (tower.level >= 2) lines.push("Stands fallen towers up");
      break;
    case "siphon":
      lines.push("+" + stats.income + " Energy each wave", "+" + stats.perKill + " per kill in reach");
      break;
  }
  return lines;
}

function updateInspector(): void {
  const panel = byId("dfInspector");
  const e = engine;
  const tower = e !== null && selectedPad >= 0 ? e.towers[selectedPad] ?? null : null;
  const rubble = e !== null && selectedPad >= 0 && e.cleared[selectedPad] === false;
  if (e === null || (tower === null && !rubble)) {
    panel.hidden = true;
    lastInspector = "";
    return;
  }
  const key = [selectedPad, tower?.level, tower?.branch, Math.round(tower?.hp ?? 0), tower?.down, e.energy, e.phase, rubble].join("|");
  if (key === lastInspector) return;
  lastInspector = key;
  panel.hidden = false;
  const clearButton = byId<HTMLButtonElement>("dfClear");
  clearButton.hidden = !rubble;
  clearButton.disabled = !building() || e.energy < RUBBLE_COST;
  for (const id of ["dfUpgrade", "dfRepair", "dfSell"]) byId(id).hidden = tower === null;
  if (tower === null) {
    byId("dfInspectName").textContent = "Rubble";
    byId("dfInspectLevel").textContent = "Pad " + (selectedPad + 1);
    byId<HTMLImageElement>("dfInspectIcon").src = iconUrl("items/salvage-anchor") ?? "";
    byId("dfInspectText").textContent = "Clear the rubble to build here.";
    byId("dfInspectStats").replaceChildren();
    byId("dfInspectHp").style.transform = "scaleX(0)";
    byId("dfInspectHpText").textContent = "";
    return;
  }
  const spec = TOWERS[tower.type];
  const branch = tower.branch === null ? null : spec.branches[tower.branch];
  byId<HTMLImageElement>("dfInspectIcon").src = iconUrl(branch?.icon ?? spec.icon) ?? "";
  byId("dfInspectName").textContent = branch?.name ?? spec.name;
  byId("dfInspectLevel").textContent = (branch !== null ? spec.name + " · " : "") + "Level " + (tower.level + 1) + (e.pads[tower.pad]!.trait !== "normal" ? " · " + e.pads[tower.pad]!.trait : "");
  byId("dfInspectHp").style.transform = "scaleX(" + (tower.down ? 0 : tower.hp / tower.maxHp).toFixed(3) + ")";
  byId("dfInspectHpText").textContent = tower.down ? "Down" : Math.round(tower.hp) + " / " + tower.maxHp;
  byId("dfInspectText").textContent = branch?.text ?? spec.text;
  byId("dfInspectStats").replaceChildren(
    ...statLines(tower).map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }),
  );
  const build = building();
  const upgrade = byId<HTMLButtonElement>("dfUpgrade");
  const next = e.upgradeCost(tower.pad, "a");
  if (tower.branch !== null) {
    upgrade.textContent = "Top level";
    upgrade.disabled = true;
  } else if (tower.level >= 2) {
    upgrade.replaceChildren(map.branches ? "Choose a branch · from " + Math.min(spec.branches.a.stats.cost, spec.branches.b.stats.cost) : "Branches open on map 5");
    upgrade.disabled = !build || !map.branches;
  } else {
    upgrade.replaceChildren("Upgrade · " + next + " ", Object.assign(document.createElement("kbd"), { textContent: "U" }));
    upgrade.disabled = !build || next === null || e.energy < next || tower.down;
  }
  const repair = byId<HTMLButtonElement>("dfRepair");
  const repairCost = e.repairCost(tower.pad);
  repair.hidden = repairCost === null;
  repair.replaceChildren("Repair · " + (repairCost ?? 0) + " ", Object.assign(document.createElement("kbd"), { textContent: "R" }));
  repair.disabled = !build || repairCost === null || e.energy < repairCost;
  const sell = byId<HTMLButtonElement>("dfSell");
  sell.replaceChildren("Sell · +" + e.refund(tower.pad) + " ", Object.assign(document.createElement("kbd"), { textContent: "Del" }));
  sell.disabled = !build;
}

function buildOn(type: TowerType): void {
  if (engine === null || selectedPad < 0) {
    sfx("miss", 0.3);
    showBanner("Choose a pad first", "Click a glowing hexagon, or press Tab", false, 1.4);
    return;
  }
  if (!engine.unlocked(type)) {
    sfx("miss", 0.3);
    return;
  }
  if (!engine.build(selectedPad, type)) {
    sfx("miss", 0.3);
    const cost = TOWERS[type].levels[0].cost;
    if (engine.energy < cost) showBanner("Not enough Energy", TOWERS[type].name + " costs " + cost, false, 1.2);
  }
  lastCards = lastInspector = "";
}

function upgradeSelected(): void {
  if (engine === null || selectedPad < 0) return;
  const tower = engine.towers[selectedPad];
  if (tower == null) return;
  if (tower.level >= 2 && tower.branch === null) {
    if (map.branches && building()) showBranches(selectedPad);
    else sfx("miss", 0.3);
    return;
  }
  if (!engine.upgrade(selectedPad)) sfx("miss", 0.3);
  lastInspector = "";
}

// ------------------------------------------------------------------ input

function pickPad(clientX: number, clientY: number): number {
  if (engine === null) return -1;
  let best = -1;
  let bestGap = 64;
  engine.pads.forEach((pad, index) => {
    const at = screenOf(point.set(pad.x, terrain.padTop(pad), pad.z));
    if (!at.visible) return;
    const gap = Math.hypot(at.x - clientX, at.y - clientY);
    if (gap < bestGap) {
      bestGap = gap;
      best = index;
    }
  });
  return best;
}

function selectPad(pad: number): void {
  selectedPad = pad;
  previewTower = null;
  lastCards = lastInspector = "";
  if (pad >= 0) sfx("uiClick", 0.3);
}

const CAMERA_KEYS: Record<string, () => void> = {
  q: () => camera.turn(0.35),
  e: () => camera.turn(-0.35),
  w: () => camera.pan(0, -5),
  s: () => camera.pan(0, 5),
  a: () => camera.pan(-5, 0),
  d: () => camera.pan(5, 0),
  "+": () => camera.zoom(0.85),
  "=": () => camera.zoom(0.85),
  "-": () => camera.zoom(1.18),
  pageup: () => camera.tilt(0.12),
  pagedown: () => camera.tilt(-0.12),
  home: () => camera.reset(),
};

window.addEventListener("keydown", (event) => {
  if (isComposingKey(event)) return;
  if (vietnameseInputSign(event)) showBanner("Turn off the Vietnamese keyboard", "UniKey / EVKey changes your letters", false, 2.4);
  const key = event.key;
  if (!byId("dfMenu").hidden) {
    if (key === "Enter" && !byId<HTMLButtonElement>("dfStartButton").disabled) void startRun();
    return;
  }
  if (!byId("dfResult").hidden) {
    if (key === "Enter") void startRun();
    return;
  }
  if (engine === null) return;
  if (!byId("dfCards").hidden) {
    if (/^[1-3]$/.test(key)) {
      const cards = document.querySelectorAll<HTMLButtonElement>("#dfCardGrid .rc-card");
      const card = cards[Number(key) - 1];
      if (card !== undefined && !card.disabled) card.click();
      event.preventDefault();
    } else if (key === "Escape" && !byId("dfCardsCancel").hidden) {
      showOverlay(null);
      event.preventDefault();
    }
    return;
  }
  if (key === "Escape") {
    togglePause();
    event.preventDefault();
    return;
  }
  if (paused) return;
  if (engine.phase === "review") {
    if (key === "Enter" || key === " ") {
      engine.skipReview();
      showOverlay(null);
      event.preventDefault();
    }
    return;
  }
  if (engine.phase === "build") {
    const lower = key.toLowerCase();
    if (key === "Tab" || key === "ArrowRight" || key === "ArrowDown") selectPad((selectedPad + 1) % engine.pads.length);
    else if (key === "ArrowLeft" || key === "ArrowUp") selectPad((selectedPad + engine.pads.length - 1) % engine.pads.length);
    else if (key >= "1" && key <= "6") buildOn(TOWER_ORDER[Number(key) - 1]!);
    else if (lower === "u") upgradeSelected();
    else if (lower === "r") {
      if (selectedPad < 0 || !engine.repair(selectedPad)) sfx("miss", 0.3);
    } else if (key === "Backspace" || key === "Delete") {
      if (selectedPad >= 0) engine.sell(selectedPad);
    } else if (lower === "c") {
      if (selectedPad < 0 || !engine.clear(selectedPad)) sfx("miss", 0.3);
    } else if (key === "Enter") engine.startWave();
    else if (CAMERA_KEYS[lower] !== undefined) CAMERA_KEYS[lower]!();
    else return;
    lastCards = lastInspector = "";
    event.preventDefault();
    return;
  }
  if (engine.phase !== "wave") return;
  if (key === "1") return void engine.useSkill("breath");
  if (key === "2") return void engine.useSkill("roar");
  if (key === " ") {
    event.preventDefault();
    return void engine.useSkill("nova");
  }
  if (key === "Home") return void camera.reset();
  if (key === "PageUp") return void camera.tilt(0.12);
  if (key === "PageDown") return void camera.tilt(-0.12);
  const letter = typedLetter(event);
  if (letter === null) return;
  event.preventDefault();
  engine.typeLetter(letter);
});

let pressAt: { x: number; y: number } | null = null;
canvas.addEventListener("pointerdown", (event) => {
  if (event.button === 0 && !event.shiftKey) pressAt = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", (event) => {
  if (event.button !== 0 || pressAt === null || engine === null) return;
  const moved = Math.hypot(event.clientX - pressAt.x, event.clientY - pressAt.y);
  pressAt = null;
  if (moved > 6) return;
  const pad = pickPad(event.clientX, event.clientY);
  selectPad(pad);
});
canvas.addEventListener("pointermove", (event) => {
  if (engine === null || camera.dragging) return;
  hoverPad = pickPad(event.clientX, event.clientY);
  canvas.style.cursor = hoverPad >= 0 ? "pointer" : "";
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-skill]")) {
  button.addEventListener("click", () => engine?.useSkill(button.dataset.skill as SkillId));
}
for (const image of document.querySelectorAll<HTMLImageElement>("img[data-icon]")) image.src = iconUrl(image.dataset.icon!) ?? "";
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-difficulty]")) {
  button.addEventListener("click", () => {
    difficulty = button.dataset.difficulty as Difficulty;
    safely(() => storage()?.setItem(DIFFICULTY_KEY, difficulty));
    renderMaps();
  });
}
const CAMERA_BUTTONS: Record<string, () => void> = {
  left: () => camera.turn(Math.PI / 4),
  right: () => camera.turn(-Math.PI / 4),
  up: () => camera.tilt(0.18),
  down: () => camera.tilt(-0.18),
  in: () => camera.zoom(0.8),
  out: () => camera.zoom(1.25),
  home: () => camera.reset(),
};
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-camera]")) {
  button.addEventListener("click", () => CAMERA_BUTTONS[button.dataset.camera!]?.());
}
byId("dfStartButton").addEventListener("click", () => void startRun());
byId("dfCallWave").addEventListener("click", () => engine?.startWave());
byId("dfUpgrade").addEventListener("click", upgradeSelected);
byId("dfRepair").addEventListener("click", () => {
  if (engine !== null && selectedPad >= 0 && !engine.repair(selectedPad)) sfx("miss", 0.3);
});
byId("dfSell").addEventListener("click", () => {
  if (engine !== null && selectedPad >= 0) engine.sell(selectedPad);
});
byId("dfClear").addEventListener("click", () => {
  if (engine !== null && selectedPad >= 0 && !engine.clear(selectedPad)) sfx("miss", 0.3);
});
byId("dfCardsCancel").addEventListener("click", () => showOverlay(null));
byId("dfReviewDone").addEventListener("click", () => {
  engine?.skipReview();
  showOverlay(null);
});
byId("dfPauseButton").addEventListener("click", togglePause);
byId("dfResume").addEventListener("click", togglePause);
byId("dfRestart").addEventListener("click", () => void startRun());
byId("dfQuit").addEventListener("click", toMenu);
byId("dfAgain").addEventListener("click", () => void startRun());
byId("dfNextMap").addEventListener("click", () => {
  const next = MAPS[map.number];
  if (next === undefined) return;
  chooseMap(next);
  void startRun();
});
byId("dfToMenu").addEventListener("click", toMenu);
const qualitySelect = byId<HTMLSelectElement>("dfQuality");
qualitySelect.value = stage.quality;
qualitySelect.addEventListener("change", () => setQuality(qualitySelect.value === "medium" ? "medium" : "high", true));
const soundToggle = byId<HTMLInputElement>("dfSound");
soundToggle.checked = audio.enabled;
soundToggle.addEventListener("change", () => {
  audio.setEnabled(soundToggle.checked);
  safely(() => storage()?.setItem(SOUND_KEY, soundToggle.checked ? "on" : "off"));
});

function togglePause(): void {
  if (engine === null || engine.phase === "victory" || engine.phase === "defeat") return;
  paused = !paused;
  showOverlay(paused ? "dfPause" : null);
}

function setQuality(quality: Quality, save: boolean): void {
  if (save) safely(() => storage()?.setItem(QUALITY_KEY, quality));
  stage.setQuality(quality);
  heroFx.setQuality(quality);
  fx.setQuality(quality === "high");
  world.setQuality(quality);
  qualitySelect.value = quality;
}

// ------------------------------------------------------------------ frame

const wells: { x: number; y: number; z: number; radius: number; strength: number }[] = [];
const fields: { x: number; z: number; radius: number }[] = [];
const damage: Damage[] = [];

/** What the effects draw from the rules each frame: wells, jamming fields, burning towers, the Core. */
function effectState(): void {
  wells.length = 0;
  fields.length = 0;
  damage.length = 0;
  const e = engine;
  if (e === null) return;
  e.towers.forEach((tower, pad) => {
    if (tower === null) return;
    const at = e.pads[pad]!;
    if (tower.type === "gravity" && !tower.down) {
      wells.push({ x: at.x, y: terrain.padTop(at) + 0.08, z: at.z, radius: e.range(tower), strength: tower.jammed || tower.stunned > 0 ? 0 : Math.min(1, tower.active / 6 + (tower.collapse > 0 ? 0.8 : 0)) });
    }
    if (tower.down || tower.hp < tower.maxHp * 0.6) {
      const top = towerViews.top(e, pad, point);
      damage.push({ x: at.x, y: top.y - 1, z: at.z, hp: tower.hp / tower.maxHp, down: tower.down, size: 1 });
    }
    if (tower.jammed && !jammedBefore.has(pad)) {
      jammedBefore.add(pad);
      sounds.jam(panOf(at.x, at.z));
    } else if (!tower.jammed) jammedBefore.delete(pad);
  });
  for (const enemy of e.enemies) {
    if (enemy.alive && enemy.type === "jammer" && enemy.silence <= 0 && enemy.doomed === 0) fields.push({ x: enemy.x, z: enemy.z, radius: ABILITY.jamRadius });
  }
}

function frame(now: number): void {
  const real = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  hitstop = Math.max(0, hitstop - real);
  const scale = paused ? 0 : (hitstop > 0 ? 0.12 : 1) * slowmo * devScale;
  const dt = real * scale;
  clock += dt;
  alarmClock = Math.max(0, alarmClock - dt);
  healed = Math.max(0, healed - real * 1.2);
  if (engine !== null) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 10) {
      engine.step(STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 10) accumulator = 0;
    for (const event of engine.events.splice(0)) handle(event);
    if (endTimer > 0) {
      endTimer -= real;
      if (endTimer <= 0) {
        slowmo = 1;
        showResult();
      }
    }
    if (engine !== null && engine.phase !== "review" && !byId("dfReview").hidden) showOverlay(null);
    if (engine?.phase === "wave") measure(real);
  }
  bannerTimer -= real;
  if (bannerTimer <= 0) banner.classList.remove("is-on");
  chainTimer -= real;
  if (chainTimer <= 0) chainLabel.classList.remove("is-on");
  wordInfoTimer -= real;
  if (wordInfoTimer <= 0) byId("dfWordInfo").classList.remove("is-on");
  camera.update(real);
  const e = engine;
  terrain.update(real, clock, {
    build: e?.phase === "build",
    selected: selectedPad,
    hover: hoverPad,
    occupied: e?.towers.map((tower) => tower !== null) ?? [],
    cleared: e?.cleared ?? [],
    wave: e?.phase === "wave",
    lives: e === null ? 1 : e.lives / e.maxLives,
    healed,
  });
  // The reach ring: of the tower previewed on an empty pad, or of the chosen tower.
  if (e !== null && selectedPad >= 0) {
    const pad = e.pads[selectedPad]!;
    const tower = e.towers[selectedPad];
    const type = tower?.type ?? previewTower;
    const radius = tower != null ? e.range(tower) : type !== null ? TOWERS[type].levels[0].range * (pad.trait === "high" ? 1.25 : 1) : 0;
    terrain.showRange(pad.x, pad.z, terrain.padTop(pad), radius, type === null ? null : TOWER_COLOR[type]);
  } else terrain.showRange(0, 0, 0, 0, null);
  if (e !== null) {
    towerViews.update(e, dt, clock);
    crowd.update(e, dt, clock, camera.facing);
    for (let index = 0; index < Math.min(crowd.pops.length, 30); index += 1) {
      const pop = crowd.pops[index]!;
      heroFx.spray(point.set(pop.x, pop.y, pop.z), index % 2 === 0 ? COLORS.cyan : COLORS.white, 5, 3.5, 0.12);
    }
    for (const view of bossViews.values()) {
      const enemy = e.enemies.find((item) => item.id === view.id);
      if (enemy !== undefined && enemy.alive) {
        view.root.position.set(enemy.x, ROAD_Y + 1.2 + Math.sin(clock * 1.2) * 0.3, enemy.z);
        // Bosses face glTF +z: toward the Core they march on, turned partly to the camera.
        const toCore = Math.atan2(map.core[0] - enemy.x, map.core[1] - enemy.z);
        view.root.rotation.y = toCore;
      }
      view.mixer.update(dt);
    }
  }
  effectState();
  const core = e === null ? null : { x: map.core[0], y: terrain.heightAt(map.core[0], map.core[1]) + 2.4, z: map.core[1], weak: 1 - e.lives / e.maxLives };
  fx.update(dt, wells, fields, damage, core);
  updateDragon(dt);
  heroFx.update(dt, hero, 0, "fly", 0);
  stage.updateBackground(dt, 0.25);
  world.update(dt, 0.25, stage.camera);
  stage.setDefaultScenery(!world.ready);
  if (engine !== null) {
    updateLabels();
    updateBars();
    updateHud();
  }
  updateFloaters(real);
  stage.render(real);
  window.requestAnimationFrame(frame);
}

/** Auto quality: after 5 s of a wave, an average over 20 ms drops High to Medium. */
function measure(real: number): void {
  if (autoChecked) return;
  frameSamples.push(real * 1000);
  if (frameSamples.length < 300) return;
  autoChecked = true;
  const average = frameSamples.reduce((sum, value) => sum + value, 0) / frameSamples.length;
  frameSamples = [];
  if (average > 20 && stage.quality === "high") {
    setQuality("medium", false);
    showBanner("Quality: Medium", "to keep the fight smooth", false, 2);
  }
}

// ------------------------------------------------------------------ boot

const startButton = byId<HTMLButtonElement>("dfStartButton");
byId("dfStatus").textContent = "Loading the rift…";
renderMaps();
showOverlay("dfMenu");
byId("dfHud").hidden = true;
window.requestAnimationFrame(frame);
window.setTimeout(paintThumbs, 400);
void Promise.all([loadDragon(stage.quality), loadFireball(stage.quality).catch(() => undefined), towerViews.load(stage.quality), prepareMap(map), loadWords()])
  .then(([, , , , words]) => {
    entries = words;
    picker = new WordPicker(entries, 8);
    startButton.disabled = false;
    byId("dfStatus").textContent = map.name + " · vocabulary level " + vocabularyLevel + " · " + entries.length + " words";
  })
  .catch((error: unknown) => {
    byId("dfStatus").textContent = "Could not load Rift Defense: " + (error instanceof Error ? error.message : String(error));
  });

// Dev / screenshot / performance handle.
(window as unknown as { __defense: unknown }).__defense = {
  get engine() {
    return engine;
  },
  ready: () => picker !== null && crowd.ready && hero !== null && terrain.ready,
  maps: () => MAPS.map((item) => item.id),
  /** Starts `id` (a map id) at `level`; resolves once it is running. */
  start: async (id?: string, level: Difficulty = "normal") => {
    difficulty = level;
    if (id !== undefined && id !== map.id) {
      map = mapById(id);
      await prepareMap(map);
    }
    await startRun();
    return map.id;
  },
  /** Jump to wave `n` (1-based) with energy to build. */
  wave: (n: number) => {
    if (engine === null) return false;
    engine.wave = clamp(Math.round(n) - 1, 0, map.waves.length - 1);
    engine.phase = "build";
    engine.buildTimer = 0;
    return engine.startWave();
  },
  build: (pad: number, type: TowerType, level = 0, branch: Branch = "a") => {
    if (engine === null) return false;
    engine.energy += 2000;
    if (engine.cleared[pad] === false) engine.clear(pad);
    const ok = engine.build(pad, type);
    for (let index = 0; index < level; index += 1) engine.upgrade(pad, index >= 2 ? branch : undefined);
    return ok;
  },
  select: (pad: number) => selectPad(pad),
  /** Fill the roads with `count` enemies (performance checks). */
  flood: (count: number) => {
    if (engine === null) return 0;
    if (engine.phase !== "wave") {
      engine.phase = "build";
      engine.buildTimer = 0;
      engine.startWave();
    }
    engine.flood(count);
    return engine.alive;
  },
  /** Screenshots: offer the boons now. */
  boon: () => {
    if (engine === null) return false;
    engine.wave = 3;
    engine.phase = "review";
    engine.reviewTimer = 0;
    engine.step(STEP);
    return engine.phase;
  },
  branches: (pad: number) => showBranches(pad),
  /** Screenshots: hurt a tower (0…1 of its hit points left). */
  damage: (pad: number, share: number) => {
    const tower = engine?.towers[pad];
    if (tower == null) return false;
    tower.hp = Math.max(0, tower.maxHp * share);
    tower.down = share <= 0;
    return true;
  },
  lives: (n: number) => {
    if (engine !== null) engine.lives = n;
  },
  camera: (yaw: number, tilt: number, distance: number, x?: number, z?: number) => {
    camera.yaw = yaw;
    camera.pitch = THREE.MathUtils.degToRad(tilt);
    camera.distance = distance;
    if (x !== undefined && z !== undefined) camera.target.set(x, 0, z);
  },
  finish: (win: boolean) => {
    if (engine === null) return false;
    engine.phase = win ? "victory" : "defeat";
    engine.events.push(win ? { kind: "victory", stars: engine.stars() } : { kind: "defeat" });
    return true;
  },
  words: () =>
    (engine?.enemies ?? []).filter((enemy) => engine!.typeable(enemy)).map((enemy) => ({ word: enemy.word!.text.slice(enemy.typed), bomb: enemy.bomb, type: enemy.type, s: Math.round(enemy.s) })),
  type: (text: string) => {
    for (const letter of text) engine?.typeLetter(letter);
  },
  nearestWord: () => {
    const target = engine?.locked ?? engine?.enemies.filter((enemy) => engine!.typeable(enemy)).sort((a, b) => remaining(a) - remaining(b))[0];
    return target?.word == null ? "" : target.word.text.slice(target.typed);
  },
  slow: (k: number) => {
    devScale = clamp(k, 0.02, 1);
  },
  quality: (q: Quality) => setQuality(q, false),
  fxStats: () => fx.stats(),
  /** The owner's map art: the layout guide (`guide`) or the ground the game paints now, as a data URL. */
  paint: (id: string, size = 1024, guide = true) => paintGround(mapById(id), size, guide).color.toDataURL(guide ? "image/png" : "image/jpeg", 0.86),
  /** Checks: an explosion and a smoke column at the Core. */
  fxTest: () => {
    point.set(camera.target.x, 2, camera.target.z);
    fx.explosion(point, 2);
    fx.towerDown(point.setY(point.y + 1));
    return fx.stats();
  },
  /** Frame timing over `seconds` (real time): fps, mean/p95 frame ms, draw calls, triangles, instances. */
  measure: (seconds = 4) =>
    new Promise((resolve) => {
      const samples: number[] = [];
      let previous = performance.now();
      const started = previous;
      const tick = (time: number): void => {
        samples.push(time - previous);
        previous = time;
        if (time - started < seconds * 1000) {
          window.requestAnimationFrame(tick);
          return;
        }
        samples.sort((a, b) => a - b);
        const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        const info = stage.renderer.info;
        resolve({
          frames: samples.length,
          fps: Math.round(1000 / mean),
          meanMs: Math.round(mean * 100) / 100,
          p95Ms: Math.round(samples[Math.floor(samples.length * 0.95)]! * 100) / 100,
          drawCalls: info.render.calls,
          triangles: info.render.triangles,
          instances: crowd.drawn(),
          alive: engine?.alive ?? 0,
          quality: stage.quality,
        });
      };
      window.requestAnimationFrame(tick);
    }),
};
