/**
 * Typing Defense (td.html), step 1A "Cổng vui" (docs/td/BUILD_NOW.md): a
 * top-down 2D test field. The vocabulary loads first; then the world steps
 * at 60 Hz in a session, the debug view draws it, word cards float over it,
 * the keys, the mouse and the HUD act through the selection, typing sounds
 * follow its events, and window.__td lets the browser scenarios drive it
 * through commands.
 */
import "./ui/td.css";
import { runFrameLoop } from "../platform/frame-loop";
import { installDevHandle } from "./app/dev-handle";
import { installKeys, installPointer } from "./app/input";
import { sandboxHtml } from "./app/sandbox";
import { Selection } from "./app/selection";
import { Session } from "./app/session";
import { loadDeck } from "./app/vocab";
import type { CommandBody } from "./sim/commands";
import type { RareEvent } from "./sim/events";
import { hashHex } from "./sim/hash";
import { canPlace } from "./sim/placement";
import { statsObject } from "./sim/stats";
import { PATH_MAX } from "./sim/stores/agents";
import { wordText } from "./typing/decks";
import { dockHtml } from "./ui/build-menu";
import { actionsHtml, Hud, REASON, statusHtml, stripHtml } from "./ui/hud";
import { teamHtml } from "./ui/team-bar";
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
const canvas = byId<HTMLCanvasElement>("tdCanvas");
const view = new DebugView(canvas);
let painted = false;

const { deck, source } = await loadDeck();
byId("tdHud").replaceChildren(); // the loading note
const session = new Session({ seed, sandbox, deck });
const world = session.world;
const selection = new Selection(world, (command) => session.send(command));
const cards = new WordCards(byId("tdWords"), (x, z) => view.project(x, z));
const audio = new TypingAudio();
let imeWarning = false;

/** Buttons and keys: the camera's and the sound's own, the rest the selection's. */
function act(action: string): void {
  const [name, dx, dy] = action.split(":");
  if (name === "pan") view.panBy(Number(dx) * 60, Number(dy) * 60);
  else if (name === "mute") audio.muted = !audio.muted;
  else selection.act(action);
}

const hud = new Hud(byId("tdHud"), act);
for (const type of ["pointerdown", "keydown"]) window.addEventListener(type, () => audio.resume());
installKeys(window, {
  // Paused, nothing is typed: words wait behind the blur.
  send: (command) => {
    if (!selection.paused) session.send(command);
  },
  act,
  onVietnamese: () => (imeWarning = true),
  allowUntrusted: params.get("untrusted") === "1",
});
installPointer(canvas, view, selection);

function showHud(): void {
  const refused = [...recent].reverse().find((event) => event.t === "rejected" && world.tick - event.tick < 150);
  const notices = [imeWarning ? "Tắt bộ gõ tiếng Việt để gõ" : "", source === "fallback" ? "Từ dự phòng (máy chủ không có từ vựng)" : ""];
  hud.update([
    statusHtml(world, sandbox, selection.paused, audio.muted, notices.filter((notice) => notice !== "")),
    sandbox && selection.panel ? sandboxHtml(world) : "",
    teamHtml(world, selection.agent),
    stripHtml(world, refused?.t === "rejected" ? (REASON[refused.reason] ?? refused.reason) : ""),
    dockHtml(world, selection),
    actionsHtml(world),
  ]);
  document.body.classList.toggle("is-paused", selection.paused);
}

const resize = (): void => {
  const ui = Math.max(0.8, Math.min(1.2, Math.min(window.innerWidth / 1600, window.innerHeight / 900)));
  document.documentElement.style.setProperty("--ui", ui.toFixed(3));
  document.documentElement.style.setProperty("--hud", Math.max(1, ui).toFixed(3));
  view.resize(window.innerWidth, window.innerHeight, Math.min(2, window.devicePixelRatio || 1), world.map.halfM, 60 * Math.max(1, ui));
  view.draw(world, selection);
  painted = true;
};
window.addEventListener("resize", resize);
const recent: RareEvent[] = [];
resize();
showHud();

/** The last 600 frames' costs in ms (BUILD_NOW §7 gate 5): the steps with the HUD and sound, then the 2D view with the cards. */
const costs = { update: [] as number[], draw: [] as number[] };
function timed(list: number[], run: () => void): void {
  const start = performance.now();
  run();
  list.push(performance.now() - start);
  if (list.length > 600) list.shift();
}

runFrameLoop({
  update(now) {
    timed(costs.update, () => {
      selection.update();
      session.paused = selection.paused;
      session.frame(now);
      const fresh = world.events.rare.splice(0);
      cards.read(fresh, world, now);
      audio.read(fresh, world, now);
      recent.push(...fresh);
      if (recent.length > 400) recent.splice(0, recent.length - 400);
      showHud();
    });
  },
  draw(now) {
    timed(costs.draw, () => {
      view.draw(world, selection);
      cards.draw(world, now, window.innerWidth, window.innerHeight);
    });
    painted = true;
  },
  onError() {
    selection.paused = true;
  },
});

installDevHandle({
  ready: () => painted,
  // What a Node replay of log() needs besides the log (scripts/td/replay.ts).
  flags: () => ({ sandbox, seed: world.seed, content: world.c.hash, deck: deck.hash, vocabulary: source }),
  send: (command: CommandBody) => session.send(command),
  // TK 25.12's load test: n enemies on the routes, through the sandbox's logged command.
  flood: (n: number) => session.send({ t: "sandbox", op: { op: "flood", value: n } }),
  costs: () => ({ update: costs.update.slice(), draw: costs.draw.slice() }),
  stats: () => statsObject(world.stats),
  hash: () => hashHex(world),
  defs: () => world.c.buildings.map((building) => building.id),
  canPlace: (id: string, x: number, z: number) => canPlace(world, world.c.buildingIndex(id), Math.round(x * 4), Math.round(z * 4)),
  events: () => recent.slice(),
  log: () => session.log.slice(),
  // Ages and times left in ticks.
  liveWords: () => {
    const W = world.words;
    return W.live().map((s) => ({
      id: W.id(s), text: wordText(deck, W.word[s]!), typed: W.typed[s]!, errors: W.errors[s]!, tier: W.tier[s]!, building: world.buildings.id(W.building[s]!),
      age: world.tick - W.born[s]!, left: W.expire[s]! - world.tick, locked: world.typing.router.lock === s,
    }));
  },
  typing: () => ({ chain: world.typing.chain, cap: world.typing.cap, a: world.typing.a, lock: world.typing.router.lock, allStopped: world.typing.allStopped }),
  ui: () => ({ agent: selection.agent, focus: selection.focus, building: selection.building, kind: selection.kind, paused: selection.paused, panel: selection.panel, grace: world.tick < world.typing.graceUntil }),
  // Agents: hero first; mode as MODE in sim/stores/agents.ts; goal and at are building ids (−1 none); path: x, z, x, z… ahead.
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
