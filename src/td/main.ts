/**
 * Typing Defense (td.html), step 1A "Cổng vui" (docs/td/BUILD_NOW.md): a
 * top-down 2D test field. The vocabulary loads first; then the world steps
 * at 60 Hz in a session, the debug view draws it, word cards float over it,
 * typing sounds follow its events, and window.__td lets the browser
 * scenarios drive it through commands.
 */
import "./ui/td.css";
import { runFrameLoop } from "../platform/frame-loop";
import { installDevHandle } from "./app/dev-handle";
import { installTypingInput } from "./app/input";
import { Session } from "./app/session";
import { loadDeck } from "./app/vocab";
import type { RareEvent } from "./sim/events";
import { hashHex } from "./sim/hash";
import { canPlace } from "./sim/placement";
import { statsObject } from "./sim/stats";
import { PATH_MAX } from "./sim/stores/agents";
import { wordText } from "./typing/decks";
import { TypingAudio } from "./view/audio-min";
import { DebugView } from "./view/debug-2d";
import { WordCards } from "./view/words/cards";

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error("typing defense: missing #" + id);
  return element as T;
}

const params = new URLSearchParams(window.location.search);
// 1A is the sandbox build: on unless ?sandbox=0.
const sandbox = params.get("sandbox") !== "0";
const seed = Number(params.get("seed") ?? "1") >>> 0 || 1;
const view = new DebugView(byId<HTMLCanvasElement>("tdCanvas"));
let painted = false;

const title = document.createElement("div");
title.className = "td-chip";
title.textContent = "Typing Defense";
if (sandbox) title.insertAdjacentHTML("beforeend", "<small>Hộp cát · bản thử 1A</small>");
const status = document.createElement("div");
status.className = "td-status";
status.textContent = "Đang tải từ vựng…";
const mute = document.createElement("button");
mute.className = "td-mute";
mute.type = "button";
mute.textContent = "Tắt tiếng";
title.append(status, mute);
byId("tdHud").append(title);

const { deck, source } = await loadDeck();
const session = new Session({ seed, sandbox, deck });
const world = session.world;
const cards = new WordCards(byId("tdWords"), (x, z) => view.project(x, z));
const audio = new TypingAudio();
let imeWarning = false;

mute.addEventListener("click", () => {
  audio.resume();
  audio.muted = !audio.muted;
  mute.textContent = audio.muted ? "Bật tiếng" : "Tắt tiếng";
});
window.addEventListener("pointerdown", () => audio.resume());
window.addEventListener("keydown", () => audio.resume());
installTypingInput(window, {
  send: (command) => session.send(command),
  locked: () => world.typing.router.lock >= 0 || world.typing.router.group >= 0,
  onVietnamese: () => (imeWarning = true),
  allowUntrusted: params.get("untrusted") === "1",
});

const waveCount = world.c.content.waves.list.length;
let shown = "";
function showStatus(): void {
  const wave = world.wave === 0 ? "Chuẩn bị" : "Đợt " + world.wave + "/" + waveCount;
  const parts = ["Mạng " + world.lives, "Vàng " + Math.floor(world.gold / 1000), wave, "Chuỗi " + world.typing.chain];
  if (world.phase === "defeat") parts.push("Thua");
  if (imeWarning) parts.push("Tắt bộ gõ tiếng Việt để gõ");
  if (source === "fallback") parts.push("Từ dự phòng");
  const text = parts.join(" · ");
  if (text !== shown) status.textContent = shown = text;
}

const resize = (): void => {
  const ui = Math.max(0.8, Math.min(1.2, Math.min(window.innerWidth / 1600, window.innerHeight / 900)));
  document.documentElement.style.setProperty("--ui", ui.toFixed(3));
  view.resize(window.innerWidth, window.innerHeight, Math.min(2, window.devicePixelRatio || 1), world.map.halfM);
  view.draw(world);
  painted = true;
};
window.addEventListener("resize", resize);
resize();
showStatus();

const recent: RareEvent[] = [];
runFrameLoop({
  update(now) {
    session.frame(now);
    const fresh = world.events.rare.splice(0);
    cards.read(fresh, world, now);
    audio.read(fresh, world, now);
    recent.push(...fresh);
    if (recent.length > 400) recent.splice(0, recent.length - 400);
    showStatus();
  },
  draw(now) {
    view.draw(world);
    cards.draw(world, now, window.innerWidth, window.innerHeight);
    painted = true;
  },
  onError() {
    session.paused = true;
  },
});

installDevHandle({
  ready: () => painted,
  flags: () => ({ sandbox, seed: world.seed, content: world.c.hash, deck: deck.hash, vocabulary: source }),
  send: (command) => session.send(command),
  stats: () => statsObject(world.stats),
  hash: () => hashHex(world),
  defs: () => world.c.buildings.map((building) => building.id),
  canPlace: (id, x, z) => canPlace(world, world.c.buildingIndex(id), Math.round(x * 4), Math.round(z * 4)),
  events: () => recent.slice(),
  log: () => session.log.slice(),
  liveWords: () => {
    const W = world.words;
    return W.live().map((s) => ({
      id: W.id(s), text: wordText(deck, W.word[s]!), typed: W.typed[s]!, errors: W.errors[s]!, tier: W.tier[s]!, building: world.buildings.id(W.building[s]!),
      age: world.tick - W.born[s]!, left: W.expire[s]! - world.tick, locked: world.typing.router.lock === s,
    }));
  },
  typing: () => ({ chain: world.typing.chain, cap: world.typing.cap, a: world.typing.a, lock: world.typing.router.lock, allStopped: world.typing.allStopped }),
  state: () => {
    const { buildings: B, units: U, agents: A } = world;
    return {
      tick: world.tick, phase: world.phase, wave: world.wave, nextWaveAt: world.nextWaveAt, lives: world.lives, gold: world.gold / 1000,
      enemies: world.enemies.count, projectiles: world.projectiles.count,
      buildings: B.live().map((b) => ({
        id: B.id(b), def: world.c.buildings[B.def[b]!]!.id, level: B.level[b]!, x: B.x[b]!, z: B.z[b]!, ready: world.tick >= B.readyTick[b]!,
        tempo: B.tempo[b]!, assist: B.assist[b]!, heat: B.heat[b]! / 1000, words: B.liveWords[b]!,
      })),
      soldiers: U.live().map((s) => ({ alive: U.hp[s]! > 0, contact: U.contact[s] === 1, x: U.x[s]!, z: U.z[s]! })),
      agents: A.live().map((a) => ({
        x: A.x[a]!, z: A.z[a]!, mode: A.mode[a]!, goal: A.goal[a]! < 0 ? -1 : B.id(A.goal[a]!), at: A.at[a]! < 0 ? -1 : B.id(A.at[a]!),
        path: Array.from(A.path.subarray((a * PATH_MAX + A.next[a]!) * 2, (a * PATH_MAX + A.pathN[a]!) * 2)),
      })),
    };
  },
});
