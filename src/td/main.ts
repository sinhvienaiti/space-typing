/**
 * Typing Defense (td.html), step 1A "Cổng vui" (docs/td/BUILD_NOW.md) with
 * 1A.6 "Lời Gọi" (docs/td/BUILD_1A6.md): a top-down 2D test field. The
 * vocabulary loads first; then the world steps at 60 Hz in a session, the
 * debug view draws it, the calls' word cards float over it, the keys, the
 * mouse and the HUD act through the selection, typing sounds follow its
 * events, and window.__td lets the browser scenarios drive it through commands.
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
  // Paused (Esc, or Space's tactical pause), nothing is typed: words wait.
  send: (command) => {
    if (!selection.halted) session.send(command);
  },
  act,
  onVietnamese: () => (imeWarning = true),
  allowUntrusted: params.get("untrusted") === "1",
});
installPointer(canvas, view, {
  pointer: (p) => selection.pointer(p),
  // A call's bubble (a word card, or a dim one on the map) sends the agent there (BUILD_1A6 §8).
  click: (p, right, at) => {
    const call = right || selection.building ? -1 : Math.max(cards.callAt(at.x, at.y), view.callAt(at.x, at.y));
    if (call >= 0) selection.toCall(call);
    else selection.click(p, right);
  },
});

function showHud(): void {
  const refused = [...recent].reverse().find((event) => event.t === "rejected" && world.tick - event.tick < 150);
  const notices = [
    selection.tactical ? "Tạm dừng chiến thuật · Space để chạy tiếp" : "", imeWarning ? "Tắt bộ gõ tiếng Việt để gõ" : "", source === "fallback" ? "Từ dự phòng (máy chủ không có từ vựng)" : "",
  ];
  hud.update([
    statusHtml(world, sandbox, selection.halted, audio.muted, notices.filter((notice) => notice !== "")),
    sandbox && selection.panel ? sandboxHtml(world) : "",
    teamHtml(world, selection.agent),
    stripHtml(world, refused?.t === "rejected" ? (REASON[refused.reason] ?? refused.reason) : ""),
    dockHtml(world, selection),
    actionsHtml(world, selection.tactical),
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
      session.paused = selection.halted;
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
  // Ages in ticks; the call is its id.
  liveWords: () => {
    const W = world.words;
    return W.live().map((s) => ({
      id: W.id(s), text: wordText(deck, W.word[s]!), typed: W.typed[s]!, errors: W.errors[s]!, tier: W.tier[s]!, call: world.calls.id(W.call[s]!),
      age: world.tick - W.born[s]!, locked: world.typing.router.lock === s,
    }));
  },
  typing: () => ({ chain: world.typing.chain, lock: world.typing.router.lock, typedTicks: world.typing.typedSum }),
  ui: () => ({ agent: selection.agent, focus: selection.focus, call: selection.call, building: selection.building, kind: selection.kind, paused: selection.paused, tactical: selection.tactical, panel: selection.panel }),
  // Agents: hero first; mode as MODE in sim/stores/walkers.ts; goal a building id (−1 none); path: x, z, x, z… ahead. Calls: kind as CALL_KIND.
  state: () => {
    const { buildings: B, units: U, agents: A, npcs: N, calls: C } = world;
    return {
      tick: world.tick, phase: world.phase, day: world.day, phaseEnd: world.phaseEnd, wave: world.wave, lives: world.lives, mode: world.mode,
      gold: world.gold / 1000, wood: world.wood, food: world.food, seeds: world.seeds, knowledge: world.knowledge,
      enemies: world.enemies.count, projectiles: world.projectiles.count,
      buildings: B.live().map((b) => ({
        id: B.id(b), def: world.c.buildings[B.def[b]!]!.id, level: B.level[b]!, x: B.x[b]!, z: B.z[b]!, ready: B.ready[b] === 1, upTo: B.upTo[b]!, progress: B.progress[b]!,
        charges: B.charges[b]!, pile: B.pile[b]! / 1000,
      })),
      soldiers: U.live().map((s) => ({ alive: U.hp[s]! > 0, contact: U.contact[s] === 1, x: U.x[s]!, z: U.z[s]! })),
      agents: A.live().map((a) => ({
        x: A.x[a]!, z: A.z[a]!, mode: A.mode[a]!, goal: A.goal[a]! < 0 ? -1 : B.id(A.goal[a]!),
        path: Array.from(A.path.subarray((a * PATH_MAX + A.next[a]!) * 2, (a * PATH_MAX + A.pathN[a]!) * 2)),
      })),
      npcs: N.live().map((n) => ({ kind: N.kind[n]!, task: N.task[n]!, job: N.job[n]!, x: N.x[n]!, z: N.z[n]! })),
      calls: C.live().map((c) => ({ id: C.id(c), kind: C.kind[c]!, open: C.state[c] === 1, bright: C.bright[c] === 1, words: C.words[c]!, done: C.done[c]!, x: C.x[c]!, z: C.z[c]!, agent: C.agent[c]! })),
      review: Array.from(world.typing.review.subarray(0, world.typing.reviewN), (word) => wordText(deck, word)),
      trees: world.map.trees.map(([x, z], t) => ({ x, z, standing: world.trees.standing[t] === 1, marked: world.trees.marked[t] === 1 })),
    };
  },
});
