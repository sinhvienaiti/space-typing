// First: the game's Interface motion setting answers prefers-reduced-motion (CSS and JS).
import { motionReduced } from "../ui/motion-preference";
import "@fontsource/exo-2/700.css";
import "@fontsource/exo-2/800.css";
import "@fontsource/exo-2/800-italic.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./campaign3d.css";
import * as THREE from "three";
import { bossFullName } from "../boss/identity";
import type { EnemyFamilyId } from "../enemies/families";
import { splitDisplayByTypedLetters } from "../logic";
import { loadModel, modelEntry, pickModelTier } from "../render3d/model-loader";
import { HeroFx } from "../scene3d/fx";
import { Hero, type Locomotion } from "../scene3d/hero";
import { bufferStats, SceneAudio, voiceStats, type SceneVoice } from "../scene3d/sfx";
import { SpaceStage, TIERS, type CameraMode, type Quality } from "../scene3d/space";
import { clamp, COLORS, easeOut, rand } from "../scene3d/util";
import { FlightWorld } from "../scene3d/world";
import { speakEnglish } from "../speech";
import type { EnemyKind, GameSettings, VocabularyEntry } from "../types";
import { loadVocabularyIndex, loadVocabularyLevel } from "../vocabulary";
import { BossActor, EnemyActor } from "./actors";
import { isComposingKey, typedLetter, vietnameseInputSign } from "../scene3d/keys";
import { PILOTS, pilotById, pilotShotModelId, type Pilot } from "./pilots";
import { comboMultiplier, MAX_STAGE_3D, stagePlan3D, wordScore, wordsPerMinute, type StagePlan3D } from "./plan";
import { loadProgress3D, recordClear3D, saveProgress3D, type Progress3D } from "./progress";
import { WordPicker, type PickedWord } from "../scene3d/words";

/**
 * Campaign 3D (beta), campaign-3d.html: the Campaign's stages flown in 3D by
 * the rigged hero Draconis or one of the twelve Fleet ships (pilots.ts), on
 * the character demo's engine (src/scene3d).
 *
 * A stage comes from the Campaign tables (plan.ts); words from the player's
 * chosen vocabulary level. Enemies fly in from far ahead, hold a firing
 * line and shoot; the first key locks the target with that first letter and
 * every correct letter fires a bolt from the hero's hands. Nova (Enter, when
 * charged) casts the rune circle and beam. Boss stages end with the stage's
 * boss. Progress is this page's own (progress.ts): no Warp, save or wallet.
 */

const HERO_IDS = ["draconis-v3", "draconis-v2", "draconis"] as const;
const FIREBALL_ID = "dragon-fireball";
const SETTINGS_KEY = "spaceTypingSettingsV1";
const SOURCE_KEY = "spaceTypingVocabularySourceV1";
const QUALITY_KEY = "spaceTyping3dQualityV1";
const SOUND_KEY = "spaceTyping3dSoundV1";
/** The player's swing of the camera (radians), kept between visits. */
const VIEW_YAW_KEY = "spaceTyping3dViewYawV1";
/** The chosen pilot (pilots.ts): Draconis or a Fleet ship. */
const PILOT_KEY = "spaceTyping3dPilotV1";
const VIEW_YAW_MAX = 0.5;
const VIEW_YAW_STEP = 0.08;
const PAGE = 10;
/**
 * The fight camera: rear three-quarter (behind, above, a little to the
 * right) — the owner's pick on 18/10 for the four-legged dragon: its back,
 * both wings and the tail read in depth. (The straight chase view read the
 * upright first models as standing; `flank`, well to the side, was used
 * before.) A ship flies under the chase camera instead (space.ts), its top
 * in view. ?cam=play|rear|flank|profile|chase picks one for any pilot, for
 * comparing angles.
 */
const ASKED_CAMERA: CameraMode | null = ((): CameraMode | null => {
  const asked = new URLSearchParams(window.location.search).get("cam");
  return asked === "play" || asked === "rear" || asked === "flank" || asked === "profile" || asked === "chase" ? asked : null;
})();
/** Enemies fly in from this far ahead; their word shows (and can be typed) past LABEL_AT of the approach. */
/**
 * Enemies show far off and fly in to a firing line well ahead (z −13…−20),
 * not in the hero's face; they are built a little bigger to read at that range.
 */
const SPAWN_Z = -72;
const LABEL_AT = 0.07;
const SPEED: Record<Locomotion, number> = { idle: 6, fly: 18, boost: 52 };
const HULL = 100;
const SHIELD = 40;
/**
 * A ship's shots (fx.shipShot): its projectile model, long and slow enough
 * to be seen flying; the word's last letter fires a bigger pair, and the
 * target blows up once they land.
 */
const SHIP_SHOT = { length: 1.9, flight: 0.36, curve: 1.2 };
const SHIP_FINAL = { length: 2.5, flight: 0.42, curve: 1.5 };
const FALLBACK_WORDS = [
  "star", "orbit", "comet", "planet", "rocket", "galaxy", "meteor", "signal", "engine", "shield", "laser", "pilot", "moon", "solar",
  "nebula", "light", "space", "wing", "flame", "dragon", "power", "speed", "focus", "energy", "crystal", "storm", "thunder", "ocean",
];

type Target = {
  id: number;
  kind: "enemy" | "boss";
  word: PickedWord;
  extra: PickedWord[];
  typed: number;
  pos: THREE.Vector3;
  alive: boolean;
  dying: boolean;
  elite: boolean;
  label: HTMLDivElement;
  shown: string;
  // Enemies only:
  actor: EnemyActor | null;
  from: THREE.Vector3;
  front: THREE.Vector3;
  approach: number;
  age: number;
  fireTimer: number;
  family: EnemyFamilyId;
};

type BossState = {
  actor: BossActor;
  target: Target;
  hp: number;
  maxHp: number;
  attackTimer: number;
  escortTimer: number;
  dying: number;
};

type Phase = "menu" | "intro" | "wave" | "break" | "boss" | "clear" | "dead" | "result";

type Run = {
  plan: StagePlan3D;
  phase: Phase;
  phaseTime: number;
  wave: number;
  perWave: number[];
  spawned: number;
  spawnTimer: number;
  time: number;
  typingTime: number;
  score: number;
  combo: number;
  maxCombo: number;
  correct: number;
  misses: number;
  words: number;
  hull: number;
  shield: number;
  sinceDamage: number;
  nova: number;
  boss: BossState | null;
  locked: Target | null;
  targets: Target[];
  side: 0 | 1;
  cleared: boolean;
  pendingKills: { target: Target; at: number }[];
};

// ------------------------------------------------------------------ helpers

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error("campaign 3d: missing #" + id);
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

/** The game's own settings (volumes, quality, pronunciation), read only. */
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

function initialQuality(settings: GameSettings): Quality {
  const chosen = storage()?.getItem(QUALITY_KEY);
  if (chosen === "medium" || chosen === "high") return chosen;
  return settings.visualQuality === "high" || settings.visualQuality === "ultra" ? "high" : "medium";
}

function pad(stage: number): string {
  return String(stage).padStart(3, "0");
}

function roleLabel(plan: StagePlan3D): string {
  if (plan.boss !== null) return plan.boss.identity.rank;
  return { normal: "Stage", elite: "Elite stage", special: "Special stage", hazard: "Hazard stage", gauntlet: "Gauntlet" }[plan.role as string] ?? "Stage";
}

// ------------------------------------------------------------------ setup

const settings = gameSettings();
const progressStore = storage();
let progress: Progress3D = loadProgress3D(progressStore);
let selectedStage = progress.highestUnlocked;
let page = Math.floor((selectedStage - 1) / PAGE);

const canvas = byId<HTMLCanvasElement>("c3dCanvas");
let stage: SpaceStage;
try {
  stage = new SpaceStage(canvas, initialQuality(settings));
} catch {
  byId("c3dStatus").textContent = "This browser cannot start WebGL, so Campaign 3D cannot run here.";
  throw new Error("campaign 3d: no WebGL");
}
// The World being played, from the 2D Campaign's own background art, flowing past in depth.
const flightWorld = new FlightWorld(stage.scene, stage.quality);
void flightWorld.setStage(selectedStage);
const audio = new SceneAudio(clamp(settings.sfxVolume, 0, 1) * 0.7, clamp(settings.musicVolume, 0, 1) * 0.45);
audio.enabled = storage()?.getItem(SOUND_KEY) !== "off";

function setViewYaw(yaw: number, save: boolean): void {
  stage.viewYaw = clamp(yaw, -VIEW_YAW_MAX, VIEW_YAW_MAX);
  if (!save) return;
  try {
    storage()?.setItem(VIEW_YAW_KEY, stage.viewYaw.toFixed(3));
  } catch {
    // Storage blocked or full: the swing lasts for this visit.
  }
}
setViewYaw(Number(storage()?.getItem(VIEW_YAW_KEY)) || 0, false);
const fx = new HeroFx(stage, audio);
fx.showHalo = false;
fx.trailDrift = 0.08;
fx.setGlowColor(new THREE.Color("#ff9a4a"));
const labelLayer = byId("c3dLabels");
const flashLayer = byId("c3dFlash");
const banner = byId("c3dBanner");

let hero: Hero | null = null;
let heroId = "";
let pilot: Pilot = pilotById(storage()?.getItem(PILOT_KEY));
/** A ship pilot fires its own projectile model from its guns. */
let shipShots = false;
/** The latest hero/projectile load: an older one that finishes later is dropped. */
let heroLoad = 0;
let shotLoad = 0;
/** Ordinary bolts: fire for Draconis v2, the first model's cyan otherwise. */
let boltColor = COLORS.cyan;
/** Draconis v2 and v3 throw fireballs; the first model fires small bolts. */
let fireballs = false;
/** Draconis v3 spits them from its jaws (v2 throws them by hand). */
let spits = false;
let picker: WordPicker | null = null;
let vocabularyLevel = 1;
let run: Run | null = null;
let paused = false;
let nextId = 1;
let cinematic: { mode: CameraMode; until: number } | null = null;
let clock = 0;
let bannerTimer = 0;
let wordInfoTimer = 0;
let prevLocomotion: Locomotion = "idle";

async function loadHero(quality: Quality): Promise<void> {
  if (pilot.ship) return loadShip(pilot, quality);
  const token = ++heroLoad;
  // The newest Draconis in the manifest: v3 (the four-legged dragon), then v2, then the first.
  let id: string = HERO_IDS[0];
  let entry = null;
  for (const candidate of HERO_IDS) {
    entry = await modelEntry("heroes", candidate);
    id = candidate;
    if (entry !== null) break;
  }
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url === null) throw new Error("The Draconis model is not in the model manifest.");
  const gltf = await loadModel(url);
  if (token !== heroLoad) return;
  const previous = hero;
  const dragon = id === "draconis-v3";
  const flight = dragon || id === "draconis-v2";
  heroId = id;
  spits = dragon;
  hero = new Hero(gltf.scene, gltf.animations, {
    // The dragon draws no wing-tip ribbons: on its jagged wings they read as loose wires.
    tipsPerSide: dragon ? 0 : TIERS[quality].tipsPerSide,
    trail: TIERS[quality].trail,
    palette: [COLORS.ember, COLORS.gold],
    // The four-legged dragon has none (above). The first model: its trailing wing edges stream fire. v2
    // flies flat but upright-built, so those edges lie by the feet; its
    // ribbons run from the wing claws. No tail ribbon: from behind it reads as a pole.
    trailSockets: dragon ? [] : flight ? ["FX_WING_L", "FX_WING_R"] : ["FX_WING_L2", "FX_WING_R2"],
    // v2 and v3 clips carry the flight posture, heave the body with the beat
    // and time the shots (blender make_flight_clips / make_dragon_clips); the
    // actions are added over the fly loop, so the wings keep beating.
    // v3: the fireball leaves the jaws at 42 % of a spit, 45 % of a big
    // spit; the breath at 46 % of the cast. v2: the palm is out at 38 % of an
    // attack, both palms at 42 %, the breath at 46 % of the cast.
    ...(dragon
      ? {
          fitSize: 3,
          // A hit is a soft flinch (the clip sways and settles); the code adds only a little knock.
          knock: 0.4,
          pitch: { idle: 0, fly: 0, boost: 0 },
          release: { spit: 0.42 * 11 / 24, spitBig: 0.45 * 15 / 24, cast: 0.46 * 39 / 24 },
          additive: ["spit", "spitBig", "cast", "hit"] as const,
          bob: false,
        }
      : flight
        ? {
            pitch: { idle: 0, fly: 0, boost: 0 },
            release: { attackL: 0.38 * 13 / 24, attackR: 0.38 * 13 / 24, attackBoth: 0.42 * 15 / 24, cast: 0.46 * 39 / 24 },
            additive: ["attackL", "attackR", "attackBoth", "cast", "hit"] as const,
            bob: false,
          }
        : {}),
  });
  // The dragon's air gallop (blender make_dragon_clips, Hero_Fly: strides of
  // 0.875 s; hind left, hind right, fore left, fore right push off in turn;
  // the downstroke starts 0.3 of a beat in and lasts 42 % of it).
  const made = hero;
  const node = (name: string): THREE.Object3D | null => (dragon ? made.node(name) : null);
  const feet = (
    [["FX_FOOT_L", 0, undefined], ["FX_FOOT_R", 0.1, undefined], ["FX_CAST_L", 0.45, 0], ["FX_CAST_R", 0.55, 1]] as const
  ).flatMap(([name, offset, hand]) => {
    const socket = node(name);
    return socket === null ? [] : [{ socket, offset, hand, left: name.endsWith("_L") }];
  });
  const wings = (
    [["FX_WING_L", "FX_WING_L2"], ["FX_WING_R", "FX_WING_R2"]] as const
  ).flatMap(([rootName, tipName]) => {
    const root = node(rootName);
    const tip = node(tipName);
    return root === null || tip === null ? [] : [{ root, tip }];
  });
  fx.gait = dragon ? { beat: 0.875, feet, wings, lag: 0.3 * 0.875, down: 0.42 } : null;
  for (const light of stage.handLights) light.color.copy(dragon ? COLORS.ember : COLORS.cyan);
  fx.hitStrength = dragon ? 0.55 : 1;
  // The dragon roars, breathes and beats its wings (synthesized) instead of a ship's lasers.
  fx.voiced = dragon;
  fx.castFrom = flight ? "mouth" : "hands";
  fx.castRelease = flight ? hero.releaseDelay("cast") : 1.04;
  fx.setCastColor(flight ? COLORS.ember : COLORS.cyan);
  boltColor = flight ? COLORS.ember : COLORS.cyan;
  fireballs = flight;
  shipShots = false;
  fx.setGlowColor(new THREE.Color("#ff9a4a"));
  mountHero(hero, previous);
}

/**
 * A Fleet ship as the flown hero: authored nose -Z (no half turn), its gun
 * sockets standing in for hands and jaws, engine ribbons in its shot colour.
 * Ships have only Ship_Idle: the code banks, bobs and knocks the hull.
 */
async function loadShip(chosen: Pilot, quality: Quality): Promise<void> {
  const token = ++heroLoad;
  const entry = await modelEntry("ships", chosen.id);
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url === null) throw new Error("The " + chosen.name + " model is not in the model manifest.");
  const gltf = await loadModel(url);
  if (token !== heroLoad) return;
  const previous = hero;
  const shot = new THREE.Color(chosen.shot);
  heroId = "ships/" + chosen.id;
  spits = false;
  fireballs = false;
  shipShots = true;
  hero = new Hero(gltf.scene, gltf.animations, {
    tipsPerSide: 0,
    trail: TIERS[quality].trail,
    palette: [shot, COLORS.white],
    fitSize: 2.3,
    trailSockets: ["FX_ENGINE_L", "FX_ENGINE_R", "FX_ENGINE_C"],
    // Level in a cruise, the nose dipping a little into a boost.
    pitch: { idle: 0, fly: -0.03, boost: -0.1 },
    // The stiff spring: a gun's recoil is a crisp kick, not a slow rock.
    knock: 1,
    faceAway: false,
  });
  fx.gait = null;
  for (const light of stage.handLights) light.color.copy(shot);
  fx.hitStrength = 0.8;
  fx.voiced = false;
  // Nova: the rune circle and beam open ahead of the guns, in the ship's colour
  // (the mouth cast is the dragon's fire breath).
  fx.castFrom = "hands";
  fx.castRelease = 1.04;
  fx.setCastColor(shot);
  fx.setGlowColor(shot);
  boltColor = shot;
  mountHero(hero, previous);
}

/** Puts a newly loaded hero in the scene where the previous one flew. */
function mountHero(next: Hero, previous: Hero | null): void {
  if (previous !== null) {
    next.x = previous.x;
    previous.dispose();
  }
  stage.scene.add(next.root);
  for (const ribbon of next.ribbons) stage.scene.add(ribbon.mesh);
  next.play("intro");
  fx.warpIn(fx.core);
}

/**
 * The pilot's projectile model. Draconis: the owner's fireball model
 * (skills/dragon-fireball), drawn by every fireball; until it loads, or
 * without it, the photographed fire alone. A ship: its own projectile
 * (skills/<ship>-bolt); without it, plain bolts in its shot colour.
 */
async function loadProjectile(quality: Quality): Promise<void> {
  const token = ++shotLoad;
  const chosen = pilot;
  const shotId = pilotShotModelId(chosen);
  if (shotId === null) fx.setShotModel(null, COLORS.white);
  const entry = await modelEntry("skills", shotId ?? FIREBALL_ID);
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url === null) {
    if (shotId !== null && token === shotLoad) fx.setShotModel(null, COLORS.white);
    return;
  }
  const gltf = await loadModel(url);
  if (token !== shotLoad) return;
  if (shotId === null) fx.setFireballModel(gltf.scene);
  else fx.setShotModel(gltf.scene, new THREE.Color(chosen.shot));
}

async function loadWords(): Promise<VocabularyEntry[]> {
  const source = readJson<{ mode?: string; level?: number }>(SOURCE_KEY);
  vocabularyLevel = Number.isInteger(source?.level) && source!.level! > 0 ? source!.level! : 1;
  try {
    const index = await loadVocabularyIndex();
    const level = index.levels.some((item) => item.level === vocabularyLevel) ? vocabularyLevel : index.levels[0]?.level ?? 1;
    vocabularyLevel = level;
    return await loadVocabularyLevel(level, index);
  } catch {
    return FALLBACK_WORDS.map((en, index) => ({ id: "fallback-" + index, en, vi: "", ipa: "" }));
  }
}

// ------------------------------------------------------------------ menu

function renderMenu(): void {
  const grid = byId("c3dStageGrid");
  const first = page * PAGE + 1;
  const last = Math.min(MAX_STAGE_3D, first + PAGE - 1);
  byId("c3dPageLabel").textContent = "Stages " + first + "–" + last;
  byId<HTMLButtonElement>("c3dPrevPage").disabled = page === 0;
  // The next page opens once one of its stages is unlocked.
  byId<HTMLButtonElement>("c3dNextPage").disabled = last >= MAX_STAGE_3D || last + 1 > progress.highestUnlocked;
  const tiles: HTMLButtonElement[] = [];
  for (let number = first; number <= last; number += 1) {
    const plan = stagePlan3D(number, vocabularyLevel);
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "c3d-stage-tile" + (plan.boss !== null ? " is-boss" : "");
    tile.disabled = number > progress.highestUnlocked;
    tile.setAttribute("role", "option");
    tile.setAttribute("aria-selected", String(number === selectedStage));
    const best = progress.best[String(number)];
    const title = document.createElement("b");
    title.textContent = pad(number);
    const world = document.createElement("small");
    world.textContent = plan.worldName;
    const tag = document.createElement("em");
    tag.textContent = plan.boss !== null ? plan.boss.identity.rank : best !== undefined ? "✓ " + best.score.toLocaleString("en-US") : "";
    tile.append(title, world, tag);
    tile.addEventListener("click", () => {
      selectedStage = number;
      void flightWorld.setStage(number);
      renderMenu();
    });
    tile.addEventListener("dblclick", () => {
      selectedStage = number;
      void startRun(number);
    });
    tiles.push(tile);
  }
  grid.replaceChildren(...tiles);
  const plan = stagePlan3D(selectedStage, vocabularyLevel);
  byId("c3dSelected").textContent =
    "Stage " + pad(selectedStage) + " · " + plan.worldName + " · " + roleLabel(plan) +
    (plan.boss !== null ? " · " + bossFullName(plan.boss.identity) : " · " + plan.enemies + " targets in " + plan.waves + " waves");
}

/** The pilot list in the menu: Draconis and the Fleet, the chosen one flying behind the menu. */
function renderPilots(): void {
  const list = byId("c3dPilotList");
  const items = PILOTS.map((option) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "c3d-pilot" + (option.ship ? "" : " is-dragon");
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(option.id === pilot.id));
    item.title = option.name;
    item.style.setProperty("--pilot-shot", option.shot);
    if (option.thumb !== null) {
      const image = document.createElement("img");
      image.src = option.thumb;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      item.append(image);
    }
    const name = document.createElement("span");
    name.textContent = option.name;
    item.append(name);
    item.addEventListener("click", () => selectPilot(option));
    return item;
  });
  list.replaceChildren(...items);
  // The chosen pilot in view: the row scrolls sideways past the first nine.
  const chosen = items[PILOTS.indexOf(pilot)];
  if (chosen !== undefined) list.scrollLeft = Math.max(0, chosen.offsetLeft - list.offsetLeft - (list.clientWidth - chosen.offsetWidth) / 2);
  byId("c3dPilotName").textContent = pilot.name;
}

function selectPilot(next: Pilot): void {
  if (next.id === pilot.id) return;
  pilot = next;
  try {
    storage()?.setItem(PILOT_KEY, next.id);
  } catch {
    // Storage blocked or full: the choice lasts for this visit.
  }
  renderPilots();
  placeHangar();
  byId("c3dStatus").textContent = "Loading " + next.name + "…";
  void Promise.all([loadHero(stage.quality), loadProjectile(stage.quality)])
    .then(() => {
      if (pilot === next) byId("c3dStatus").textContent = next.name + " ready · vocabulary level " + vocabularyLevel;
    })
    .catch((error: unknown) => {
      if (pilot === next) byId("c3dStatus").textContent = "Could not load " + next.name + ": " + (error instanceof Error ? error.message : String(error));
    });
}

function showMenu(): void {
  clearRun();
  setPhaseUi("menu");
  renderMenu();
  void audio.playMusic(null);
}

function setPhaseUi(phase: Phase): void {
  byId("c3dMenu").hidden = phase !== "menu";
  byId("c3dHud").hidden = phase === "menu" || phase === "result";
  byId("c3dResult").hidden = phase !== "result";
  byId("c3dPause").hidden = true;
  labelLayer.hidden = phase === "menu" || phase === "result";
  if (phase === "menu") window.requestAnimationFrame(placeHangar);
  else stage.hangarSpot = null;
}

/** The hangar view shows a ship in the free strip right of the menu card (centred when there is none). */
function placeHangar(): void {
  const card = document.querySelector<HTMLElement>("#c3dMenu .c3d-menu");
  const width = window.innerWidth;
  if (card === null || byId("c3dMenu").hidden || width <= 0) return;
  const right = card.getBoundingClientRect().right;
  const free = width - right;
  stage.hangarSpot = free < width * 0.14 ? null : { x: (right + width) / 2 / width, width: free / width };
  byId("c3dMenu").classList.toggle("is-hangar", stage.hangarSpot !== null && pilot.ship);
}

// ------------------------------------------------------------------ run

function split(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  return Array.from({ length: parts }, (_, index) => base + (index < total % parts ? 1 : 0));
}

async function startRun(number: number): Promise<void> {
  audio.unlock();
  if (hero === null || picker === null) return;
  clearRun();
  void flightWorld.setStage(number);
  const plan = stagePlan3D(number, vocabularyLevel);
  picker = new WordPicker(currentEntries, plan.maxWordLength);
  run = {
    plan,
    phase: "intro",
    phaseTime: 0,
    wave: 0,
    perWave: split(plan.enemies, plan.waves),
    spawned: 0,
    // The first enemy comes in as the intro banner fades.
    spawnTimer: 0,
    time: 0,
    typingTime: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    misses: 0,
    words: 0,
    hull: HULL,
    shield: SHIELD,
    sinceDamage: 10,
    nova: 0,
    boss: null,
    locked: null,
    targets: [],
    side: 0,
    cleared: false,
    pendingKills: [],
  };
  selectedStage = plan.stage;
  setPhaseUi("intro");
  // The World's families tint the nebula.
  const palette = plan.families.slice(0, 3).map((id) => new THREE.Color(familyColor(id)));
  stage.setNebula([...palette, COLORS.violet]);
  byId("c3dStageName").textContent = pad(plan.stage);
  byId("c3dWorldName").textContent = plan.worldName + " · " + plan.stageInWorld + "/20";
  const role = byId("c3dRole");
  role.textContent = roleLabel(plan);
  role.classList.toggle("is-boss", plan.boss !== null);
  renderWaves();
  showBanner("Stage " + pad(plan.stage), plan.worldName + (plan.boss !== null ? " · " + plan.boss.identity.rank : ""), plan.boss !== null);
  hero.play("intro");
  fx.warpIn(fx.core);
  fx.boostKick();
  void audio.playMusic("music/sector.ogg");
}

function familyColor(family: EnemyFamilyId): string {
  return { rainbow: "#ff8ad8", angel: "#ffd98a", devil: "#ff5a2e", frost: "#7fe3ff", prism: "#d38bff", nature: "#7ddc5a", shadow: "#8a5cff", cosmic: "#6fb6ff" }[family];
}

function clearRun(): void {
  if (run !== null) {
    for (const target of run.targets) disposeTarget(target);
    if (run.boss !== null) {
      run.boss.actor.dispose();
      disposeTarget(run.boss.target);
    }
  }
  run = null;
  fx.clear();
  cinematic = null;
  flightTurn = null;
  paused = false;
  byId("c3dBoss").hidden = true;
  byId("c3dWordInfo").classList.remove("is-on");
}

/**
 * Between waves the flight turns, so each wave comes from a new heading: the
 * dragon rolls into the turn, its head leading, and the camera leans with it
 * while the sky, stars, cloud banks and debris swing round it (stage.swing,
 * flightWorld.swing). The fight itself is not turned: the next wave still
 * comes from ahead. The turns go one way then the other, so the World's best
 * view is never far. Reduced motion: a short, gentle turn and no lean.
 */
type FlightTurn = { t: number; duration: number; angle: number; done: number; reduced: boolean };
let flightTurn: FlightTurn | null = null;
let turnSide = Math.random() < 0.5 ? 1 : -1;
/** Seconds into a wave break before the turn starts (it ends before the next wave). */
const TURN_DELAY = 0.12;

function startTurn(): void {
  const reduced = motionReduced();
  turnSide = -turnSide;
  const degrees = reduced ? rand(16, 22) : rand(40, 56);
  flightTurn = { t: 0, duration: reduced ? 1.5 : 1.8, angle: turnSide * THREE.MathUtils.degToRad(degrees), done: 0, reduced };
}

/** Advances the turn: swings the scenery by this frame's share and sets the lean. */
function updateTurn(dt: number): void {
  const turn = flightTurn;
  let rate = 0;
  if (turn !== null) {
    turn.t += dt;
    const k = clamp((turn.t - TURN_DELAY) / turn.duration, 0, 1);
    // Smootherstep: it eases in and out, so the lean grows and settles.
    const eased = k * k * k * (k * (k * 6 - 15) + 10);
    const step = turn.angle * eased - turn.done;
    if (step !== 0) {
      const pivotX = hero?.x ?? 0;
      stage.swing(step, pivotX, 0);
      flightWorld.swing(step, pivotX, 0);
      turn.done += step;
    }
    rate = (turn.angle * 30 * k * k * (1 - k) * (1 - k)) / turn.duration;
    if (turn.reduced) rate *= 0.5;
    if (k >= 1) flightTurn = null;
  }
  // + angle: a turn to the right, the right wing down and the head round to the right.
  const bank = clamp(-rate * 0.55, -0.6, 0.6);
  if (hero !== null) {
    hero.turnBank = bank;
    hero.turnYaw = clamp(-rate * 0.22, -0.3, 0.3);
  }
  stage.roll = turn?.reduced ? 0 : bank * 0.35;
}

function disposeTarget(target: Target): void {
  target.alive = false;
  target.actor?.dispose();
  target.label.remove();
}

function makeLabel(kind: "enemy" | "boss", elite: boolean): HTMLDivElement {
  const label = document.createElement("div");
  label.className = "c3d-word" + (kind === "boss" ? " is-boss" : "") + (elite ? " is-elite" : "");
  labelLayer.append(label);
  return label;
}

function takenLetters(): Set<string> {
  const taken = new Set<string>();
  if (run === null) return taken;
  for (const target of run.targets) if (target.alive && !target.dying) taken.add(target.word.text[0]!);
  if (run.boss !== null && run.boss.target.alive) taken.add(run.boss.target.word.text[0]!);
  return taken;
}

function spawnEnemy(escort = false): void {
  if (run === null || picker === null) return;
  const plan = run.plan;
  const elite = !escort && Math.random() < plan.eliteChance;
  const word = picker.pick(elite ? "elite" : "enemy", takenLetters());
  if (word === null) return;
  const extra: PickedWord[] = [];
  if (elite) {
    const second = picker.pick("enemy", new Set([...takenLetters(), word.text[0]!]));
    if (second !== null) extra.push(second);
  }
  const familyRoll = Math.random();
  const family = plan.families[familyRoll < 0.6 ? 0 : familyRoll < 0.85 ? 1 : 2] ?? plan.families[0] ?? "rainbow";
  const kind: EnemyKind = plan.kinds[Math.floor(Math.random() ** 1.4 * plan.kinds.length)] ?? "scout";
  const actor = new EnemyActor(family, kind, stage.quality, elite ? 3.2 : 2.5, elite);
  stage.scene.add(actor.group);
  // Its place on the firing line: the best of a few tries, as far as it gets
  // on screen from the others there (the camera sees the line from the side,
  // so a gap in depth alone still piles targets and their words up).
  const onScreen = (at: THREE.Vector3): THREE.Vector2 => {
    const ndc = at.clone().project(stage.camera);
    return new THREE.Vector2(ndc.x * stage.camera.aspect, ndc.y);
  };
  const others = run.targets.filter((item) => item.alive && !item.dying).map((item) => onScreen(item.front));
  let x = 0;
  let front = new THREE.Vector3();
  let best = -1;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const tryX = rand(-7, 7);
    const tryFront = new THREE.Vector3(clamp(tryX * 0.85 + rand(-1, 1), -6.6, 6.6), rand(0.6, 5), -rand(13, 20));
    const spot = onScreen(tryFront);
    const gap = others.length === 0 ? Infinity : Math.min(...others.map((other) => other.distanceTo(spot)));
    if (gap > best) {
      best = gap;
      x = tryX;
      front = tryFront;
    }
    if (gap > 0.32) break;
  }
  const target: Target = {
    id: nextId++,
    kind: "enemy",
    word,
    extra,
    typed: 0,
    pos: new THREE.Vector3(x, rand(1, 4), SPAWN_Z),
    alive: true,
    dying: false,
    elite,
    label: makeLabel("enemy", elite),
    shown: "",
    actor,
    from: new THREE.Vector3(x, rand(1, 4.5), SPAWN_Z),
    front,
    approach: 0,
    age: rand(0, 6),
    fireTimer: plan.fireInterval * rand(0.5, 0.9),
    family,
  };
  actor.group.position.copy(target.pos);
  actor.group.scale.setScalar(0.01);
  run.targets.push(target);
}

function startBoss(): void {
  if (run === null || run.plan.boss === null || picker === null) return;
  const bossPlan = run.plan.boss;
  const actor = new BossActor(bossPlan.identity, stage.quality, 6.5);
  actor.group.position.set(0, 2.2, -27);
  stage.scene.add(actor.group);
  const word = picker.pick("boss", takenLetters()) ?? picker.pick("enemy", new Set());
  if (word === null) return;
  const target: Target = {
    id: nextId++,
    kind: "boss",
    word,
    extra: [],
    typed: 0,
    pos: new THREE.Vector3(0, 3, -26),
    alive: true,
    dying: false,
    elite: false,
    label: makeLabel("boss", false),
    shown: "",
    actor: null,
    from: new THREE.Vector3(),
    front: new THREE.Vector3(),
    approach: 1,
    age: 0,
    fireTimer: 0,
    family: bossPlan.identity.family,
  };
  run.boss = { actor, target, hp: bossPlan.hp, maxHp: bossPlan.hp, attackTimer: bossPlan.attackInterval * 1.2, escortTimer: bossPlan.escortInterval, dying: 0 };
  byId("c3dBoss").hidden = false;
  byId("c3dBossName").textContent = bossFullName(bossPlan.identity);
  renderBossBar();
  showBanner(bossPlan.identity.name, bossPlan.identity.title, true);
  stage.shake = Math.max(stage.shake, 0.4);
  audio.play("bigBlast", 0.6);
  void audio.playMusic("duel/music/duel-combat-intense.ogg");
}

function renderBossBar(): void {
  if (run?.boss == null) return;
  byId("c3dBossFill").style.transform = "scaleX(" + (run.boss.hp / run.boss.maxHp).toFixed(3) + ")";
}

function renderWaves(): void {
  if (run === null) return;
  const marks: HTMLElement[] = [];
  for (let index = 0; index < run.plan.waves; index += 1) {
    const mark = document.createElement("i");
    if (index < run.wave || run.phase === "boss" || run.phase === "clear") mark.className = "is-done";
    else if (index === run.wave && run.phase !== "intro") mark.className = "is-now";
    marks.push(mark);
  }
  if (run.plan.boss !== null) {
    const mark = document.createElement("i");
    mark.className = "is-boss" + (run.phase === "boss" ? " is-now" : run.phase === "clear" ? " is-done" : "");
    marks.push(mark);
  }
  byId("c3dWaves").replaceChildren(...marks);
  byId("c3dWaveText").textContent =
    run.phase === "boss" ? "Boss" : run.phase === "clear" ? "Clear" : "Wave " + Math.min(run.plan.waves, run.wave + 1) + " / " + run.plan.waves;
}

function showBanner(title: string, subtitle: string, boss = false): void {
  const strong = document.createElement("span");
  strong.textContent = title;
  const small = document.createElement("small");
  small.textContent = subtitle;
  banner.replaceChildren(strong, small);
  banner.classList.toggle("is-boss", boss);
  banner.classList.add("is-on");
  bannerTimer = 2.2;
}

// ------------------------------------------------------------------ typing

function candidates(): Target[] {
  if (run === null) return [];
  const list = run.targets.filter((target) => target.alive && !target.dying && target.approach > LABEL_AT);
  if (run.boss !== null && run.boss.target.alive && !run.boss.target.dying && run.boss.dying === 0) list.push(run.boss.target);
  return list;
}

function typeLetter(letter: string): void {
  if (run === null || hero === null || paused) return;
  if (run.phase !== "wave" && run.phase !== "boss" && run.phase !== "break") return;
  let target = run.locked !== null && run.locked.alive && !run.locked.dying ? run.locked : null;
  if (target === null) {
    const matches = candidates().filter((item) => item.word.text[item.typed] === letter);
    // The nearest first: it shoots soonest.
    target = matches.sort((a, b) => b.pos.z - a.pos.z)[0] ?? null;
    if (target !== null) {
      run.locked = target;
      audio.play("lock", 0.3);
      showWordInfo(target.word);
    }
  }
  if (target === null || target.word.text[target.typed] !== letter) {
    miss();
    return;
  }
  target.typed += 1;
  run.correct += 1;
  run.nova = Math.min(100, run.nova + 2.5);
  const done = target.typed >= target.word.text.length;
  shoot(target, done);
  if (done) completeWord(target);
}

function miss(): void {
  if (run === null) return;
  run.misses += 1;
  run.combo = 0;
  audio.play("miss", 0.45);
  labelLayer.classList.remove("c3d-miss");
  void labelLayer.offsetWidth;
  labelLayer.classList.add("c3d-miss");
}

/**
 * A fireball thrown by one hand (0 left, 1 right) or both (2): the throw
 * plays, the ball forms in the palm until the arm is out at the clip's
 * release frame, then flies to `track`.
 */
function throwFireball(hand: 0 | 1 | 2, track: () => THREE.Vector3 | null, radius: number, onArrive: (at: THREE.Vector3) => void): void {
  if (run === null || hero === null) return;
  const current = run;
  const shot = hand === 2 ? "attackBoth" : hand === 0 ? "attackL" : "attackR";
  hero.play(shot);
  const delay = hero.releaseDelay(shot);
  fx.charge(hand, delay, radius);
  window.setTimeout(() => {
    if (run !== current || hero === null) return;
    let from: THREE.Vector3;
    if (hand === 2) {
      fx.muzzle(0);
      fx.muzzle(1);
      from = fx.palms(new THREE.Vector3());
    } else {
      from = fx.muzzle(hand).clone();
    }
    audio.play("shot", 0.42, { pan: from.x / 5, gap: 0.035 });
    fx.fireball(from, track, radius, 0.3 + radius * 0.25, onArrive);
  }, delay * 1000);
}

/**
 * A fireball spat from the jaws: the head draws back with the jaw shut and the
 * ball glowing inside, then snaps forward gaping as it leaves (big: the
 * deeper lunge of a word's last letter).
 */
function spitFireball(big: boolean, track: () => THREE.Vector3 | null, radius: number, onArrive: (at: THREE.Vector3) => void): void {
  if (run === null || hero === null) return;
  const current = run;
  const shot = big ? "spitBig" : "spit";
  hero.play(shot);
  const delay = hero.releaseDelay(shot);
  fx.charge(3, delay, radius * 0.8);
  window.setTimeout(() => {
    if (run !== current || hero === null) return;
    const from = fx.jaws(new THREE.Vector3(), true, big ? 1.7 : 1, track() ?? undefined);
    audio.voice(big ? "spitBig" : "spit", big ? 1 : 0.85, { pan: from.x / 5, gap: 0.035 });
    fx.fireball(from, track, radius, 0.3 + radius * 0.25, onArrive);
  }, delay * 1000);
}

/**
 * A ship's guns: its projectile model from one gun after the other, both on
 * a word's last letter (bigger), with a small recoil of the hull.
 */
function fireShip(target: Target, final: boolean): void {
  if (run === null || hero === null) return;
  if (!final) run.side = run.side === 0 ? 1 : 0;
  const sides: (0 | 1)[] = final ? [0, 1] : [run.side];
  const color = boltColor;
  const shot = final ? SHIP_FINAL : SHIP_SHOT;
  hero.hurt(final ? 0.05 : 0.025);
  sides.forEach((side, index) => {
    const from = fx.muzzle(side).clone();
    if (index === 0) audio.play("shot", final ? 0.46 : 0.38, { pan: from.x / 5, gap: 0.035 });
    fx.shipShot(from, () => (target.alive ? target.pos : null), color, shot.length, shot.flight, shot.curve, (at) => {
      if (index > 0) return;
      fx.spray(at, color, final ? 16 : 10, 5, 0.12);
      fx.wave(at, color, 0.1, final ? 1.5 : 1.1, 0.22, 0.6);
      audio.play("impact", 0.3, { pan: at.x / 6, gap: 0.03 });
      if (target.kind === "enemy" && target.actor !== null) target.actor.flash = 1;
    });
  });
}

function shoot(target: Target, final: boolean): void {
  if (run === null || hero === null) return;
  const current = run;
  if (shipShots) {
    fireShip(target, final);
    return;
  }
  if (spits) {
    spitFireball(final, () => (target.alive ? target.pos : null), final ? 0.55 : 0.34, (at) => {
      audio.voice("fireImpact", final ? 0.7 : 0.5, { pan: at.x / 6, gap: 0.03 });
      if (target.kind === "enemy" && target.actor !== null) target.actor.flash = 1;
    });
    return;
  }
  if (fireballs) {
    // A word's last letter: one big fireball from both palms.
    if (!final) current.side = current.side === 0 ? 1 : 0;
    throwFireball(final ? 2 : current.side, () => (target.alive ? target.pos : null), final ? 0.5 : 0.3, (at) => {
      audio.play("impact", 0.34, { pan: at.x / 6, gap: 0.03 });
      if (target.kind === "enemy" && target.actor !== null) target.actor.flash = 1;
    });
    return;
  }
  // A word's last letter: both palms together, when the rig has that punch.
  const both = final && hero.has("attackBoth");
  if (!both) current.side = current.side === 0 ? 1 : 0;
  const hand = current.side;
  const shot = both ? "attackBoth" : hand === 0 ? "attackL" : "attackR";
  hero.play(shot);
  const color = final ? COLORS.gold : boltColor;
  const fire = (): void => {
    if (run !== current || hero === null) return;
    // From the palm where it is now: fully out at the release frame.
    const hands: (0 | 1)[] = both ? [0, 1] : [hand];
    hands.forEach((side, index) => {
      const from = fx.muzzle(side).clone();
      if (index === 0) audio.play("shot", 0.38, { pan: from.x / 5, gap: 0.035 });
      fx.fireBolt(from, () => (target.alive ? target.pos : null), color, final ? 0.3 : 0.24, 1.3, (at) => {
        if (index > 0) return;
        fx.spray(at, color, 10, 5, 0.12);
        fx.wave(at, color, 0.1, 1.1, 0.22, 0.6);
        audio.play("impact", 0.3, { pan: at.x / 6, gap: 0.03 });
        if (target.kind === "enemy" && target.actor !== null) target.actor.flash = 1;
      });
    });
  };
  const delay = hero.releaseDelay(shot);
  if (delay <= 0) fire();
  else window.setTimeout(fire, delay * 1000);
}

function completeWord(target: Target): void {
  if (run === null) return;
  run.combo += 1;
  run.maxCombo = Math.max(run.maxCombo, run.combo);
  run.score += wordScore(target.word.text.length, run.combo);
  run.words += 1;
  run.nova = Math.min(100, run.nova + 8);
  run.locked = null;
  showWordInfo(target.word);
  if (settings.pronunciationEnabled) speakEnglish(target.word.entry.en, settings);
  if (target.kind === "boss") {
    bossWordDone();
    return;
  }
  const next = target.extra.shift();
  if (next !== undefined) {
    // Elite: the first word breaks its shield, the second finishes it.
    window.setTimeout(() => {
      if (!target.alive) return;
      target.word = next;
      target.typed = 0;
      fx.wave(target.pos, COLORS.gold, 0.4, 3, 0.4, 0.8);
      audio.play("shieldBreak", 0.5);
    }, 280);
    target.typed = target.word.text.length;
    return;
  }
  target.dying = true;
  // A ship's last pair is still in flight: the target goes up as it lands.
  run.pendingKills.push({ target, at: run.time + (shipShots ? SHIP_FINAL.flight + 0.02 : 0.3) });
}

function killTarget(target: Target, scale = 1): void {
  if (run === null || !target.alive) return;
  target.alive = false;
  const color = target.actor?.color ?? COLORS.pink;
  fx.explode(target.pos, color, (target.elite ? 1.3 : 1) * scale);
  disposeTarget(target);
  if (run.locked === target) run.locked = null;
}

function bossWordDone(): void {
  if (run?.boss == null || picker === null) return;
  const boss = run.boss;
  const barrage = 3;
  if (spits) {
    // Two quick spits and a big one: a flurry of fire on the boss.
    [false, false, true].forEach((big, index) => {
      window.setTimeout(() => {
        if (run?.boss !== boss) return;
        spitFireball(big, () => boss.target.pos, big ? 0.6 : 0.38, (at) => {
          fx.explode(at, COLORS.ember, 0.6, false);
          audio.voice("fireImpact", 0.7, { pan: at.x / 6, gap: 0.03 });
          audio.play("bossHit", 0.35, { gap: 0.06 });
        });
      }, 140 + index * 230);
    });
  } else if (fireballs) {
    // Left, right, then both palms: a flurry of fire on the boss.
    ([0, 1, 2] as const).forEach((hand, index) => {
      window.setTimeout(() => {
        if (run?.boss !== boss) return;
        throwFireball(hand, () => boss.target.pos, hand === 2 ? 0.55 : 0.36, (at) => {
          fx.explode(at, COLORS.ember, 0.6, false);
          audio.play("bossHit", 0.5, { gap: 0.06 });
        });
      }, 120 + index * 170);
    });
  }
  for (let index = 0; index < (fireballs ? 0 : barrage); index += 1) {
    window.setTimeout(() => {
      if (run?.boss !== boss || hero === null) return;
      const hand = (index % 2) as 0 | 1;
      const from = fx.muzzle(hand).clone();
      const arrive = (at: THREE.Vector3): void => {
        fx.explode(at, boss.actor.color, 0.7, false);
        audio.play("bossHit", 0.5, { gap: 0.06 });
      };
      if (shipShots) fx.shipShot(from, () => boss.target.pos, boltColor, SHIP_FINAL.length, 0.42, 2.2, arrive);
      else fx.fireBolt(from, () => boss.target.pos, COLORS.gold, 0.42, 2.2, arrive);
    }, index * 90);
  }
  window.setTimeout(() => {
    if (run?.boss !== boss) return;
    boss.hp -= 1;
    boss.actor.hit();
    stage.shake = Math.max(stage.shake, 0.3);
    renderBossBar();
    if (boss.hp <= 0) {
      boss.dying = 0.001;
      boss.target.alive = false;
      boss.target.label.classList.add("is-gone");
      boss.actor.die();
      return;
    }
    const word = picker?.pick("boss", lettersExcept(boss.target)) ?? null;
    if (word !== null) {
      boss.target.word = word;
      boss.target.typed = 0;
    }
  }, 420);
}

function lettersExcept(skip: Target): Set<string> {
  const taken = new Set<string>();
  for (const target of run?.targets ?? []) if (target !== skip && target.alive && !target.dying) taken.add(target.word.text[0]!);
  return taken;
}

function castNova(): void {
  if (run === null || hero === null || paused || run.nova < 100) return;
  if (run.phase !== "wave" && run.phase !== "boss") return;
  if (!fx.startCast(() => {
    if (run === null) return;
    run.targets.filter((target) => target.alive).forEach((target, index) => {
      target.dying = true;
      run!.pendingKills.push({ target, at: run!.time + 0.09 + index * 0.1 });
    });
    if (run.locked !== null && run.locked.kind === "enemy") run.locked = null;
    const boss = run.boss;
    if (boss !== null && boss.dying === 0) {
      boss.hp = Math.max(0, boss.hp - 2);
      boss.actor.hit();
      fx.explode(boss.target.pos, boss.actor.color, 1.2);
      renderBossBar();
      if (boss.hp <= 0) {
        boss.dying = 0.001;
        boss.target.alive = false;
        boss.target.label.classList.add("is-gone");
        boss.actor.die();
      }
    }
  })) return;
  hero.play("cast");
  run.nova = 0;
}

function showWordInfo(word: PickedWord): void {
  byId("c3dIpa").textContent = word.entry.ipa ? "/" + word.entry.ipa.replace(/^\/|\/$/g, "") + "/" : "";
  byId("c3dMeaning").textContent = word.entry.vi ?? "";
  byId("c3dWordInfo").classList.toggle("is-on", Boolean(word.entry.ipa || word.entry.vi));
  wordInfoTimer = 2.4;
}

// ------------------------------------------------------------------ damage

function damageHero(amount: number, at: THREE.Vector3): void {
  if (run === null || hero === null || run.phase === "dead" || run.phase === "clear") return;
  const absorbed = Math.min(run.shield, amount);
  run.shield -= absorbed;
  run.hull = Math.max(0, run.hull - (amount - absorbed));
  run.sinceDamage = 0;
  run.combo = 0;
  fx.shieldHit(at, absorbed >= amount ? 0.7 : 1);
  hero.play("hit");
  hero.hurt(1);
  if (run.hull <= 0) {
    run.phase = "dead";
    run.phaseTime = 0;
    hero.play("death");
    fx.startDeath(() => showResult(false));
    void audio.playMusic(null);
  }
}

function enemyShot(from: THREE.Vector3, damage: number, spread = 0): void {
  audio.play("enemy", 0.35, { pan: from.x / 6, gap: 0.05 });
  const aim = new THREE.Vector3();
  fx.fireBolt(from.clone(), () => aim.copy(fx.core).add(new THREE.Vector3(spread, 0, 0)), COLORS.red, 0.75, 1, (at) => damageHero(damage, at));
}

// ------------------------------------------------------------------ result

/** After a fall: how the game really works (plan.ts, updateRun), one at a time. */
const FALL_TIPS = [
  "Your shield refills by itself after 3 seconds without a hit.",
  "Enemies shoot only once they reach their line: finish the nearest words first.",
  "Correct letters charge Nova. When it is full, Enter burns every enemy on screen.",
  "A miss breaks your combo, and the combo multiplies your score: steady beats fast.",
];
let fallTip = 0;
let countUp = 0;

function showResult(cleared: boolean): void {
  if (run === null) return;
  const current = run;
  const plan = current.plan;
  current.phase = "result";
  current.cleared = cleared;
  setPhaseUi("result");
  const accuracy = current.correct + current.misses === 0 ? 100 : Math.round((current.correct / (current.correct + current.misses)) * 1000) / 10;
  const wpm = wordsPerMinute(current.correct, current.typingTime);
  const card = byId("c3dResultCard");
  // Re-run the entrance for each result.
  card.className = "c3d-card c3d-result";
  void card.offsetWidth;
  card.classList.add(cleared ? "is-clear" : "is-fail");
  byId("c3dResultEyebrow").textContent = "Stage " + pad(plan.stage) + " · " + plan.worldName;
  byId("c3dResultTitle").textContent = cleared ? "Stage clear" : pilot.name + (pilot.ship ? " went down" : " fell");
  const bossName = plan.boss === null ? "" : bossFullName(plan.boss.identity);
  byId("c3dResultSub").textContent = cleared
    ? "All " + plan.waves + " waves cleared" + (bossName ? " · " + bossName + " defeated" : "")
    : current.boss !== null
      ? "Fell to " + bossName
      : "Fell in wave " + Math.min(plan.waves, current.wave + 1) + " of " + plan.waves;
  byId("c3dResultWpm").textContent = String(wpm);
  byId("c3dResultAccuracy").textContent = accuracy + "%";
  byId("c3dResultWords").textContent = String(current.words);
  byId("c3dResultCombo").textContent = String(current.maxCombo);
  const seconds = Math.round(current.time);
  byId("c3dResultTime").textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  const before = progress.best[String(plan.stage)];
  const best = byId("c3dResultBest");
  const newBest = cleared && (before === undefined || current.score > before.score);
  best.classList.toggle("is-best", newBest);
  best.textContent = newBest ? "New best" : before !== undefined ? "Best " + before.score.toLocaleString("en-US") : "";
  byId("c3dResultTip").textContent = cleared ? "" : "Tip: " + FALL_TIPS[fallTip++ % FALL_TIPS.length];
  if (cleared) {
    progress = recordClear3D(progress, plan.stage, { score: current.score, wpm, accuracy });
    const saved = saveProgress3D(progressStore, progress);
    byId("c3dResultNote").textContent = (saved ? "Saved in this browser" : "Not saved: browser storage is blocked") + " · Campaign save, Warp and rewards unchanged.";
  } else {
    byId("c3dResultNote").textContent = "Retry from the start of the stage. Campaign save, Warp and rewards unchanged.";
  }
  // The score counts up (at once with reduced motion).
  const score = byId("c3dResultScore");
  const target = current.score;
  window.cancelAnimationFrame(countUp);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target === 0) {
    score.textContent = target.toLocaleString("en-US");
  } else {
    const started = performance.now();
    const tick = (now: number): void => {
      const k = Math.min(1, (now - started) / 900);
      score.textContent = Math.round(target * easeOut(k)).toLocaleString("en-US");
      if (k < 1) countUp = window.requestAnimationFrame(tick);
    };
    countUp = window.requestAnimationFrame(tick);
  }
  const next = byId<HTMLButtonElement>("c3dNextButton");
  next.hidden = !cleared || plan.stage >= MAX_STAGE_3D;
  byId("c3dAgainButton").classList.toggle("c3d-primary", !cleared);
  byId("c3dAgainButton").classList.toggle("c3d-ghost", cleared);
  void audio.playMusic(null);
  // A clear chimes a reward (the roar and fanfare came with the victory);
  // a fall sinks with a low groan and the fire dying.
  if (cleared) audio.play("reward", 0.6);
  else if (spits) audio.voice("fall", 0.85);
  audio.play("uiOpen", 0.3);
}

// ------------------------------------------------------------------ frame

function step(dt: number): void {
  clock += dt;
  bannerTimer = Math.max(0, bannerTimer - dt);
  if (bannerTimer <= 0) banner.classList.remove("is-on");
  wordInfoTimer = Math.max(0, wordInfoTimer - dt);
  if (wordInfoTimer <= 0 && (run?.locked == null)) byId("c3dWordInfo").classList.remove("is-on");

  const current = run;
  if (current !== null && !paused) updateRun(current, dt);

  const phase = current?.phase ?? "menu";
  const locomotion: Locomotion = phase === "dead" || phase === "clear" || phase === "result"
    ? "idle"
    : phase === "intro" || phase === "break"
      ? "boost"
      : phase === "menu"
        ? "fly"
        : "fly";
  const speed = SPEED[locomotion] * (paused ? 0 : 1);
  stageSpeed += (speed - stageSpeed) * (1 - Math.exp(-(locomotion === "boost" ? 3 : 1.6) * dt));
  const drift = stageSpeed * dt;
  const lockedX = current?.locked?.pos.x ?? 0;
  const steer = phase === "menu" ? Math.sin(clock * 0.45) * 0.6 : clamp(lockedX / 7, -0.55, 0.55);
  if (!paused) updateTurn(dt);
  if (hero !== null && !paused) {
    hero.locomotion = locomotion;
    hero.update(dt, clock, steer, 2.4);
    if (locomotion === "boost" && prevLocomotion !== "boost") fx.boostKick();
  }
  prevLocomotion = locomotion;
  stage.updateBackground(paused ? 0 : dt, stageSpeed);
  flightWorld.update(paused ? 0 : dt, stageSpeed, stage.camera);
  stage.setDefaultScenery(!flightWorld.ready);
  fx.update(paused ? 0 : dt, hero, drift, locomotion, stageSpeed);
  const mode = viewFor(cinematic !== null && clock < cinematic.until ? cinematic.mode : phase === "menu" ? "show" : ASKED_CAMERA ?? "rear");
  if (cinematic !== null && clock >= cinematic.until) cinematic = null;
  stage.updateCamera(dt, mode, hero?.x ?? 0, locomotion, fx.glow);
  flashLayer.style.opacity = String(fx.hurt * 0.8);
  if (current !== null) {
    updateLabels(current);
    updateHud(current);
  }
}
let stageSpeed = SPEED.fly;

/** A ship is framed by its own views: the chase camera in the fight, the hangar look for close-ups. */
function viewFor(mode: CameraMode): CameraMode {
  if (!pilot.ship) return mode;
  if (mode === "show") return "hangar";
  return mode === "rear" && ASKED_CAMERA === null ? "chase" : mode;
}

function updateRun(current: Run, dt: number): void {
  current.time += dt;
  current.phaseTime += dt;
  if (current.phase === "wave" || current.phase === "boss") current.typingTime += dt;
  current.sinceDamage += dt;
  if (current.sinceDamage > 3) current.shield = Math.min(SHIELD, current.shield + dt * 8);
  const plan = current.plan;

  for (let index = current.pendingKills.length - 1; index >= 0; index -= 1) {
    const kill = current.pendingKills[index]!;
    if (current.time >= kill.at) {
      killTarget(kill.target);
      current.pendingKills.splice(index, 1);
    }
  }

  switch (current.phase) {
    case "intro":
      if (current.phaseTime > 2.4) {
        current.phase = "wave";
        current.phaseTime = 0;
        renderWaves();
      }
      break;
    case "wave": {
      current.spawnTimer -= dt;
      const alive = current.targets.filter((target) => target.alive).length;
      const quota = current.perWave[current.wave] ?? 0;
      if (current.spawned < quota && alive < plan.concurrent && current.spawnTimer <= 0) {
        spawnEnemy();
        current.spawned += 1;
        current.spawnTimer = plan.spawnInterval * rand(0.85, 1.2);
      }
      // Counted again after the spawn: the wave's last enemy may have come in just now.
      if (current.spawned >= quota && !current.targets.some((target) => target.alive) && current.pendingKills.length === 0) {
        current.wave += 1;
        current.spawned = 0;
        current.phaseTime = 0;
        if (current.wave < plan.waves) {
          current.phase = "break";
          showBanner("Wave " + (current.wave + 1) + " / " + plan.waves, plan.worldName);
          startTurn();
        } else if (plan.boss !== null) {
          current.phase = "boss";
          startBoss();
        } else {
          stageClear(current);
        }
        renderWaves();
      }
      break;
    }
    case "break":
      if (current.phaseTime > 2.2) {
        current.phase = "wave";
        current.phaseTime = 0;
        current.spawnTimer = 0;
        renderWaves();
      }
      break;
    case "boss":
      updateBoss(current, dt);
      break;
    default:
      break;
  }
  updateEnemies(current, dt);
  current.targets = current.targets.filter((target) => target.alive);
}

const heroAt = new THREE.Vector3();

/** Where the flown hero is now: targets keep their faces on it. */
function heroPoint(): THREE.Vector3 {
  return hero === null ? heroAt.set(0, 0, 0) : heroAt.copy(hero.root.position);
}

function updateEnemies(current: Run, dt: number): void {
  const plan = current.plan;
  for (const target of current.targets) {
    if (!target.alive || target.actor === null) continue;
    target.age += dt;
    target.approach = Math.min(1, target.approach + dt / plan.approachSeconds);
    const k = easeOut(target.approach);
    target.pos.lerpVectors(target.from, target.front, k);
    target.pos.x += Math.sin(target.age * 0.8) * 0.5 * k;
    target.pos.y += Math.sin(target.age * 1.3) * 0.25;
    target.actor.group.position.copy(target.pos);
    // Grown in by the time its word shows, so a target is never a dot with a label.
    target.actor.group.scale.setScalar(Math.max(0.01, Math.min(1, target.approach * 12)) * (1 + target.actor.flash * 0.15));
    target.actor.update(dt, current.locked === target, heroPoint());
    if (target.approach >= 1 && !target.dying && (current.phase === "wave" || current.phase === "boss")) {
      target.fireTimer -= dt;
      if (target.fireTimer <= 0) {
        target.fireTimer = plan.fireInterval * rand(0.85, 1.25);
        target.actor.flash = 0.6;
        enemyShot(target.pos, plan.shotDamage);
      }
    }
  }
}

function updateBoss(current: Run, dt: number): void {
  const boss = current.boss;
  const bossPlan = current.plan.boss;
  if (boss === null || bossPlan === null) return;
  boss.actor.update(dt, heroPoint());
  boss.target.pos.copy(boss.actor.group.position).add(new THREE.Vector3(0, 1.2, 0.5));
  if (boss.dying > 0) {
    boss.dying += dt;
    // A chain of blasts over the body, then the stage is clear.
    if (Math.random() < dt * 9) {
      const at = boss.target.pos.clone().add(new THREE.Vector3(rand(-2.4, 2.4), rand(-2.2, 2), rand(-0.5, 0.5)));
      fx.explode(at, Math.random() < 0.5 ? boss.actor.color : boss.actor.accent, rand(0.8, 1.4), Math.random() < 0.5);
      stage.shake = Math.max(stage.shake, 0.25);
    }
    boss.actor.group.scale.setScalar(Math.max(0.01, 1 - Math.max(0, boss.dying - 1.2) / 0.6));
    if (boss.dying > 1.9 && boss.actor.group.visible) {
      boss.actor.group.visible = false;
      fx.explode(boss.target.pos, boss.actor.accent, 2.4);
      stage.shake = Math.max(stage.shake, 0.7);
      for (const target of current.targets) killTarget(target, 0.8);
    }
    if (boss.dying > 2.6) stageClear(current);
    return;
  }
  boss.attackTimer -= dt;
  boss.actor.charge = clamp(1 - boss.attackTimer / 1.2, 0, 1);
  if (boss.attackTimer <= 0) {
    boss.attackTimer = bossPlan.attackInterval * rand(0.9, 1.15);
    boss.actor.charge = 0;
    for (let index = 0; index < bossPlan.volley; index += 1) {
      const spread = (index - (bossPlan.volley - 1) / 2) * 0.35;
      window.setTimeout(() => {
        if (run !== current || current.boss !== boss || boss.dying > 0) return;
        enemyShot(boss.target.pos.clone().add(new THREE.Vector3(spread * 4, -0.4, 0)), bossPlan.shotDamage, spread);
      }, index * 110);
    }
  }
  boss.escortTimer -= dt;
  if (boss.escortTimer <= 0) {
    boss.escortTimer = bossPlan.escortInterval * rand(0.9, 1.2);
    if (current.targets.filter((target) => target.alive).length < 2) spawnEnemy(true);
  }
}

function stageClear(current: Run): void {
  if (current.phase === "clear" || current.phase === "result") return;
  current.phase = "clear";
  current.phaseTime = 0;
  byId("c3dBoss").hidden = true;
  if (current.boss !== null) disposeTarget(current.boss.target);
  hero?.play("victory");
  fx.startVictory(hero?.x ?? 0, 0);
  cinematic = { mode: "show", until: clock + 3.8 };
  showBanner("Stage clear", current.score.toLocaleString("en-US") + " points");
  renderWaves();
  void audio.playMusic(null);
  window.setTimeout(() => {
    if (run === current && current.phase === "clear") showResult(true);
  }, 3600);
}

function updateLabels(current: Run): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const all = current.boss !== null && current.boss.target.alive ? [...current.targets, current.boss.target] : current.targets;
  const projected = new THREE.Vector3();
  for (const target of all) {
    if (!target.alive) continue;
    const visible = target.kind === "boss" || target.approach > LABEL_AT;
    const display = target.word.entry.en;
    const key = target.typed + "|" + display;
    if (key !== target.shown) {
      target.shown = key;
      const parts = splitDisplayByTypedLetters(display, target.typed);
      const done = document.createElement("b");
      done.textContent = parts.typed;
      target.label.replaceChildren(done, parts.remaining);
    }
    target.label.classList.toggle("is-locked", current.locked === target);
    projected.copy(target.pos).add(new THREE.Vector3(0, target.kind === "boss" ? 2.6 : target.elite ? 1.5 : 1.15, 0)).project(stage.camera);
    const onScreen = visible && projected.z < 1 && Math.abs(projected.x) < 1.15 && Math.abs(projected.y) < 1.15;
    target.label.style.visibility = onScreen ? "" : "hidden";
    if (onScreen) {
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      target.label.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-100%)";
    }
  }
}

const hudCache = new Map<string, string>();
function setText(id: string, text: string): void {
  if (hudCache.get(id) === text) return;
  hudCache.set(id, text);
  byId(id).textContent = text;
}

function updateHud(current: Run): void {
  const accuracy = current.correct + current.misses === 0 ? 100 : Math.round((current.correct / (current.correct + current.misses)) * 100);
  setText("c3dScore", current.score.toLocaleString("en-US"));
  setText("c3dCombo", current.combo + " ×" + comboMultiplier(current.combo).toFixed(1));
  setText("c3dAccuracy", accuracy + "%");
  setText("c3dWpm", String(wordsPerMinute(current.correct, current.typingTime)));
  setText("c3dHull", String(Math.ceil(current.hull)));
  setText("c3dShield", String(Math.ceil(current.shield)));
  setText("c3dNovaHint", current.nova >= 100 ? "ENTER" : Math.floor(current.nova) + "%");
  byId("c3dHullFill").style.transform = "scaleX(" + (current.hull / HULL).toFixed(3) + ")";
  byId("c3dShieldFill").style.transform = "scaleX(" + (current.shield / SHIELD).toFixed(3) + ")";
  byId("c3dNovaFill").style.transform = "scaleX(" + (current.nova / 100).toFixed(3) + ")";
  const vitals = document.querySelector(".c3d-vitals");
  vitals?.classList.toggle("is-ready", current.nova >= 100);
  vitals?.classList.toggle("is-low", current.hull > 0 && current.hull <= HULL * 0.35);
  vitals?.classList.toggle("is-shieldless", current.shield < 0.5);
}

let last = performance.now();
/** Screenshots only (__campaign3d.slow): the scene's clock against the wall clock. */
let timeScale = 1;
function frame(now: number): void {
  window.requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) * timeScale;
  last = now;
  step(dt);
  stage.render(dt);
}

// ------------------------------------------------------------------ input

function setPaused(next: boolean): void {
  if (run === null || run.phase === "result" || run.phase === "menu") return;
  paused = next;
  byId("c3dPause").hidden = !next;
  audio.play(next ? "uiOpen" : "uiConfirm", 0.3);
}

// UI sounds (the game's Kenney set): a soft tick on hover, a click on press.
const UI_TARGETS = ".c3d-primary, .c3d-ghost, .c3d-stage-tile, .c3d-icon-button";
document.addEventListener("pointerover", (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(UI_TARGETS) : null;
  if (target === null || (event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) return;
  if (target instanceof HTMLButtonElement && target.disabled) return;
  audio.play("uiHover", 0.16, { gap: 0.05 });
});
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(UI_TARGETS) : null;
  if (target !== null && !(target instanceof HTMLButtonElement && target.disabled)) audio.play("uiClick", 0.4, { gap: 0.03 });
});

/**
 * A Vietnamese input method on (UniKey / EVKey rewriting letters, or an
 * IME composing): a note to switch it off for English, at most once in
 * 20 s. The keys themselves are never scored (keys.ts).
 */
let imeNoticeAt = -Infinity;
let imeNoticeTimer = 0;
function noteVietnameseInput(): void {
  const now = performance.now();
  if (now - imeNoticeAt < 20_000) return;
  imeNoticeAt = now;
  const notice = byId("c3dImeNotice");
  notice.hidden = false;
  notice.classList.add("is-on");
  window.clearTimeout(imeNoticeTimer);
  imeNoticeTimer = window.setTimeout(() => notice.classList.remove("is-on"), 7000);
}

/** Dev: a record of key presses (window.__campaign3d.keyTrace) to see what an input method sends. */
let keyTrace: Array<Record<string, unknown>> | null = null;
function traceKey(event: KeyboardEvent): void {
  if (keyTrace === null || keyTrace.length >= 400) return;
  keyTrace.push({ type: event.type, key: event.key, code: event.code, keyCode: event.keyCode, composing: event.isComposing, repeat: event.repeat, t: Math.round(event.timeStamp) });
}
window.addEventListener("keypress", traceKey);

window.addEventListener("keydown", (event) => {
  traceKey(event);
  audio.unlock();
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (vietnameseInputSign(event) && run !== null && run.phase !== "result") noteVietnameseInput();
  // An input method's presses (composing "â" from "a a", or the Enter that commits it) do nothing.
  if (isComposingKey(event)) return;
  const key = event.key;
  if (key === "Escape") {
    if (run !== null && run.phase !== "result") setPaused(!paused);
    return;
  }
  if (run === null || run.phase === "result") {
    if (key === "Enter" && !byId("c3dMenu").hidden) void startRun(selectedStage);
    return;
  }
  if (key === "Enter") {
    event.preventDefault();
    castNova();
    return;
  }
  if (key === "ArrowLeft" || key === "ArrowRight") {
    event.preventDefault();
    setViewYaw(stage.viewYaw + (key === "ArrowLeft" ? -1 : 1) * VIEW_YAW_STEP, true);
    return;
  }
  const letter = typedLetter(event);
  if (letter !== null) {
    event.preventDefault();
    typeLetter(letter);
  }
});
document.addEventListener("pointerdown", () => audio.unlock());

// Looking round: drag across the view (or ←/→) to swing the camera a little
// to either side of the dragon; double-click puts it back. Remembered.
let viewDrag: { id: number; x: number; yaw: number } | null = null;
canvas.style.cursor = "grab";
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.button !== 2) return;
  viewDrag = { id: event.pointerId, x: event.clientX, yaw: stage.viewYaw };
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", (event) => {
  if (viewDrag === null || event.pointerId !== viewDrag.id) return;
  // About a third of the window's width swings the whole range.
  const width = Math.max(320, window.innerWidth);
  setViewYaw(viewDrag.yaw - ((event.clientX - viewDrag.x) / (width / 3)) * VIEW_YAW_MAX, false);
});
const endViewDrag = (event: PointerEvent): void => {
  if (viewDrag === null || event.pointerId !== viewDrag.id) return;
  viewDrag = null;
  canvas.style.cursor = "grab";
  setViewYaw(stage.viewYaw, true);
};
canvas.addEventListener("pointerup", endViewDrag);
canvas.addEventListener("pointercancel", endViewDrag);
canvas.addEventListener("dblclick", () => setViewYaw(0, true));
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPaused(true);
});
window.addEventListener("resize", () => {
  stage.resize();
  placeHangar();
});

byId("c3dStartButton").addEventListener("click", () => void startRun(selectedStage));
byId("c3dPrevPage").addEventListener("click", () => {
  page = Math.max(0, page - 1);
  renderMenu();
});
byId("c3dNextPage").addEventListener("click", () => {
  page = Math.min(Math.floor((MAX_STAGE_3D - 1) / PAGE), page + 1);
  renderMenu();
});
byId("c3dPauseButton").addEventListener("click", () => setPaused(true));
byId("c3dResumeButton").addEventListener("click", () => setPaused(false));
byId("c3dRetryButton").addEventListener("click", () => {
  const number = run?.plan.stage ?? selectedStage;
  void startRun(number);
});
byId("c3dQuitButton").addEventListener("click", () => showMenu());
byId("c3dNextButton").addEventListener("click", () => {
  const number = Math.min(MAX_STAGE_3D, (run?.plan.stage ?? selectedStage) + 1);
  selectedStage = number;
  page = Math.floor((number - 1) / PAGE);
  void startRun(number);
});
byId("c3dAgainButton").addEventListener("click", () => void startRun(run?.plan.stage ?? selectedStage));
byId("c3dSelectButton").addEventListener("click", () => {
  page = Math.floor((selectedStage - 1) / PAGE);
  showMenu();
});
const qualitySelect = byId<HTMLSelectElement>("c3dQuality");
qualitySelect.value = stage.quality;
qualitySelect.addEventListener("change", () => {
  const quality: Quality = qualitySelect.value === "medium" ? "medium" : "high";
  try {
    storage()?.setItem(QUALITY_KEY, quality);
  } catch {
    /* Not remembered. */
  }
  stage.setQuality(quality);
  fx.setQuality(quality);
  flightWorld.setQuality(quality);
  void loadHero(quality).catch(() => undefined);
  void loadProjectile(quality).catch(() => undefined);
});
const soundToggle = byId<HTMLInputElement>("c3dSound");
soundToggle.checked = audio.enabled;
soundToggle.addEventListener("change", () => {
  audio.setEnabled(soundToggle.checked);
  try {
    storage()?.setItem(SOUND_KEY, soundToggle.checked ? "on" : "off");
  } catch {
    /* Not remembered. */
  }
});

// ------------------------------------------------------------------ boot

let currentEntries: VocabularyEntry[] = [];
const startButton = byId<HTMLButtonElement>("c3dStartButton");
startButton.disabled = true;
byId("c3dStatus").textContent = "Loading " + pilot.name + " and your words…";
window.requestAnimationFrame(frame);
renderMenu();
renderPilots();
window.requestAnimationFrame(placeHangar);
void loadProjectile(stage.quality).catch(() => undefined);
void Promise.all([loadHero(stage.quality), loadWords()])
  .then(([, entries]) => {
    currentEntries = entries;
    picker = new WordPicker(entries, 6);
    startButton.disabled = false;
    byId("c3dStatus").textContent = "Vocabulary level " + vocabularyLevel + " · " + entries.length + " words";
    renderMenu();
  })
  .catch((error: unknown) => {
    byId("c3dStatus").textContent = "Could not load Campaign 3D: " + (error instanceof Error ? error.message : String(error));
  });

// Dev / screenshot handle.
(window as unknown as { __campaign3d: unknown }).__campaign3d = {
  get run() {
    return run;
  },
  start: (number: number) => startRun(number),
  type: (letters: string) => {
    for (const letter of letters) typeLetter(letter);
  },
  nova: () => {
    if (run !== null) run.nova = 100;
    castNova();
  },
  /** Screenshots: clear the waves and bring the stage boss in. */
  boss: () => {
    if (run === null || run.plan.boss === null || run.boss !== null) return false;
    for (const target of run.targets) disposeTarget(target);
    run.targets = [];
    run.wave = run.plan.waves;
    run.phase = "boss";
    startBoss();
    renderWaves();
    return true;
  },
  hurt: (amount: number) => damageHero(amount, fx.core.clone()),
  /** Screenshots: a giant flyby `t` (0..1) along its course. */
  pass: (t: number) => flightWorld.previewPass(t),
  /** Input checks: start (true) or stop recording key presses; returns what was recorded. */
  keyTrace: (on: boolean) => {
    const recorded = keyTrace ?? [];
    keyTrace = on ? [] : null;
    return recorded;
  },
  /** Screenshots: slow the scene to `k` × real time (1 = normal) to catch a fireball in flight. */
  slow: (k: number) => {
    timeScale = clamp(k, 0.02, 1);
  },
  fireballModel: () => fx.hasFireballModel(),
  shotModel: () => fx.hasShotModel(),
  /** Screenshots: fly `id` (a pilots.ts id); resolves once its hull and projectile are in. */
  pilot: async (id: string) => {
    selectPilot(pilotById(id));
    await Promise.all([loadHero(stage.quality), loadProjectile(stage.quality)]);
    return { pilot: pilot.id, hero: heroId, shotModel: fx.hasShotModel() };
  },
  /** Checks: each live target's family/kind and whether its authored model is drawn. */
  looks: () => ({
    enemies: (run?.targets ?? []).flatMap((target) => (target.actor === null ? [] : [target.actor.look])),
    boss: run?.boss?.actor.look ?? null,
  }),
  /** Audio checks: a dragon sound rendered offline, or a recorded sample, measured. */
  voiceStats: (name: SceneVoice) => voiceStats(name),
  sampleStats: async (path: string) => {
    const data = await (await fetch("/assets/audio/" + path)).arrayBuffer();
    return bufferStats(await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(data));
  },
  bossWord: () => {
    const target = run?.boss?.target;
    return target === undefined || !target.alive ? "" : target.word.text.slice(target.typed);
  },
  nearestWord: () => {
    const list = candidates().sort((a, b) => b.pos.z - a.pos.z);
    const target = run?.locked ?? list[0];
    return target === undefined ? "" : target.word.text.slice(target.typed);
  },
  ready: () => hero !== null && picker !== null,
  heroInfo: () => {
    const at = (name: string): number[] | null => {
      const object = hero?.root.getObjectByName(name);
      if (object == null) return null;
      return object.getWorldPosition(new THREE.Vector3()).toArray().map((value) => Math.round(value * 100) / 100);
    };
    return {
      id: heroId,
      clips: hero?.clipNames ?? [],
      bones: hero?.bones ?? 0,
      locomotion: hero?.locomotion,
      mouth: at("FX_MOUTH"),
      core: at("FX_CORE"),
      foot: at("FX_FOOT_L"),
      tail: at("FX_TAIL"),
      handL: at("FX_CAST_L"),
      camera: stage.camera.position.toArray().map((value) => Math.round(value * 100) / 100),
      skin: (() => {
        let info: Record<string, unknown> | null = null;
        hero?.root.traverse((object) => {
          const mesh = object as THREE.SkinnedMesh;
          if (!mesh.isSkinnedMesh || info !== null) return;
          mesh.computeBoundingBox();
          const box = mesh.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
          const hips = hero!.root.getObjectByName("hips");
          info = {
            bones: mesh.skeleton.bones.length,
            sameHips: mesh.skeleton.bones.some((bone) => bone === hips),
            bindMode: mesh.bindMode,
            min: box.min.toArray().map((value) => Math.round(value * 100) / 100),
            max: box.max.toArray().map((value) => Math.round(value * 100) / 100),
            material: (mesh.material as THREE.Material).type,
          };
        });
        return info;
      })(),
    };
  },
};
