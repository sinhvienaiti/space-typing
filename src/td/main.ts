/**
 * Typing Defense (td.html), step 1A "Cổng vui" (docs/td/BUILD_NOW.md): a
 * top-down 2D test field. The world steps at 60 Hz in a session, the debug
 * view draws it every frame, and window.__td lets the browser scenarios
 * drive it through commands.
 */
import "./ui/td.css";
import { runFrameLoop } from "../platform/frame-loop";
import { installDevHandle } from "./app/dev-handle";
import { Session } from "./app/session";
import type { RareEvent } from "./sim/events";
import { hashHex } from "./sim/hash";
import { canPlace } from "./sim/placement";
import { statsObject } from "./sim/stats";
import { DebugView } from "./view/debug-2d";

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error("typing defense: missing #" + id);
  return element as T;
}

const params = new URLSearchParams(window.location.search);
// 1A is the sandbox build: on unless ?sandbox=0.
const sandbox = params.get("sandbox") !== "0";
const seed = Number(params.get("seed") ?? "1") >>> 0 || 1;
const session = new Session({ seed, sandbox });
const world = session.world;
const view = new DebugView(byId<HTMLCanvasElement>("tdCanvas"));
let painted = false;

const title = document.createElement("div");
title.className = "td-chip";
title.textContent = "Typing Defense";
if (sandbox) title.insertAdjacentHTML("beforeend", "<small>Hộp cát · bản thử 1A</small>");
const status = document.createElement("div");
status.className = "td-status";
title.append(status);
byId("tdHud").append(title);

const waveCount = world.c.content.waves.list.length;
let shown = "";
function showStatus(): void {
  const wave = world.wave === 0 ? "Chuẩn bị" : "Đợt " + world.wave + "/" + waveCount;
  const text = "Mạng " + world.lives + " · Vàng " + Math.floor(world.gold / 1000) + " · " + wave + (world.phase === "defeat" ? " · Thua" : "");
  if (text !== shown) status.textContent = shown = text;
}

const resize = (): void => {
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
    recent.push(...world.events.rare.splice(0));
    if (recent.length > 200) recent.splice(0, recent.length - 200);
    showStatus();
  },
  draw() {
    view.draw(world);
    painted = true;
  },
  onError() {
    session.paused = true;
  },
});

installDevHandle({
  ready: () => painted,
  flags: () => ({ sandbox, seed: world.seed, content: world.c.hash }),
  send: (command) => session.send(command),
  stats: () => statsObject(world.stats),
  hash: () => hashHex(world),
  defs: () => world.c.buildings.map((building) => building.id),
  canPlace: (id, x, z) => canPlace(world, world.c.buildingIndex(id), Math.round(x * 4), Math.round(z * 4)),
  events: () => recent.slice(),
  log: () => session.log.slice(),
  state: () => {
    const B = world.buildings;
    const U = world.units;
    const buildings = [];
    for (let b = 0; b < B.top; b += 1) {
      if (B.used[b] === 1) buildings.push({ id: B.id(b), def: world.c.buildings[B.def[b]!]!.id, level: B.level[b]!, x: B.x[b]!, z: B.z[b]!, ready: world.tick >= B.readyTick[b]! });
    }
    const soldiers = [];
    for (let s = 0; s < U.top; s += 1) if (U.used[s] === 1) soldiers.push({ alive: U.hp[s]! > 0, contact: U.contact[s] === 1, x: U.x[s]!, z: U.z[s]! });
    return {
      tick: world.tick, phase: world.phase, wave: world.wave, nextWaveAt: world.nextWaveAt, lives: world.lives, gold: world.gold / 1000,
      enemies: world.enemies.count, projectiles: world.projectiles.count, buildings, soldiers,
    };
  },
});
