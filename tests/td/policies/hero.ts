/**
 * Where the hero goes (BUILD_1A6 §6, §8): calls are typed only in a help ring, so Draconis goes where they gather,
 * by the commands a keyboard sends (Tab to a building or a dim call, Enter: assignUnit to the building, or move to
 * where the call's NPC stands). Twice a second, unless a word is locked or he is in the air, he weighs every such
 * place by the words left on the calls his 10 m ring would light there (calls a helper's ring lights anyway count
 * for nothing), less for the way there, and goes when a place is clearly better than where he stands. By night the
 * places are the towers and the Bastion: the power calls they make and the enemies in their reach.
 */
import { AGENT } from "../../../src/td/content/rules";
import type { CommandBody } from "../../../src/td/sim/commands";
import { CALL_KIND, CALL_STATE } from "../../../src/td/sim/stores/calls";
import { MODE } from "../../../src/td/sim/stores/walkers";
import { slotsOpen, stand } from "../../../src/td/sim/systems/agents";
import type { World } from "../../../src/td/sim/world";
import type { Rule } from "./stand";

const EVERY = 30;
const q = (metres: number): number => Math.round(metres * 4);
const near = (ax: number, az: number, bx: number, bz: number, r: number): boolean => (ax - bx) * (ax - bx) + (az - bz) * (az - bz) <= r * r;

type Place = { x: number; z: number; send: CommandBody };

/** Words left on the open or waiting calls within the hero's ring of (x, z) that no helper's ring lights. */
function callWeight(w: World, x: number, z: number): number {
  const C = w.calls;
  const A = w.agents;
  let weight = 0;
  for (const c of C.live()) {
    if (C.kind[c] === CALL_KIND.quiz || !near(C.x[c]!, C.z[c]!, x, z, AGENT.heroRingM - 0.5)) continue;
    let helped = false;
    for (let a = 1; a < slotsOpen(w) && !helped; a += 1) helped = near(A.x[a]!, A.z[a]!, C.x[c]!, C.z[c]!, AGENT.helperRingM);
    if (!helped) weight += C.words[c]! - C.done[c]!;
  }
  return weight;
}

/** Enemies within a tower's reach of (x, z), and its power call waiting. */
function nightWeight(w: World, b: number, x: number, z: number): number {
  const E = w.enemies;
  const reach = w.c.buildings[w.buildings.def[b]!]!.attack!.levels[w.buildings.level[b]! - 1]!.range + 2;
  let weight = 0;
  for (const e of E.live()) if (near(E.x[e]!, E.z[e]!, w.buildings.x[b]!, w.buildings.z[b]!, reach)) weight += 1;
  const call = w.buildings.call[b]!;
  if (call >= 0 && w.calls.bright[call] === 0) weight += 4;
  return weight + (near(w.buildings.x[b]!, w.buildings.z[b]!, x, z, AGENT.heroRingM) ? 0.5 : 0);
}

/** The keyboard's places by day: every building (its stand), and every dim call (its building's stand, or where its NPC stands). */
function dayPlaces(w: World): Place[] {
  const B = w.buildings;
  const C = w.calls;
  const places: Place[] = B.live().map((b) => ({ ...stand(w, b), send: { t: "assignUnit", agent: 0, building: B.id(b) } }));
  for (const c of C.live()) {
    if (C.state[c] !== CALL_STATE.open || C.bright[c] === 1) continue;
    const b = C.b[c]!;
    if (b >= 0) places.push({ ...stand(w, b), send: { t: "assignUnit", agent: 0, building: B.id(b) } });
    else places.push({ x: q(C.x[c]!) / 4, z: q(C.z[c]!) / 4, send: { t: "move", agent: 0, qx: q(C.x[c]!), qz: q(C.z[c]!) } });
  }
  return places;
}

/** By day: to the place whose ring holds the most words, worth the way (a 60 m flight halves a place's worth), better than here by 1.5 words (any, with none here). */
export function heroDay(): Rule {
  return (bot) => {
    const { w } = bot;
    const A = w.agents;
    if (w.phase === "night" || w.tick % EVERY !== 0 || w.typing.router.lock >= 0 || A.mode[0] !== MODE.stand) return;
    const here = callWeight(w, A.x[0]!, A.z[0]!);
    let best: Place | null = null;
    let bestValue = here === 0 ? 0 : here + 1.5;
    for (const place of dayPlaces(w)) {
      const value = callWeight(w, place.x, place.z) / (1 + Math.hypot(place.x - A.x[0]!, place.z - A.z[0]!) / 60);
      if (value > bestValue) [best, bestValue] = [place, value];
    }
    if (best !== null) bot.send(best.send);
  };
}

/** By night: to the tower (or the Bastion) with the most enemies in reach and a dim power call; there he fights too. */
export function heroNight(): Rule {
  return (bot) => {
    const { w } = bot;
    const A = w.agents;
    const B = w.buildings;
    if (w.phase !== "night" || w.tick % EVERY !== 0 || w.typing.router.lock >= 0 || A.mode[0] === MODE.takeoff || A.mode[0] === MODE.fly) return;
    let best = -1;
    let bestValue = 0;
    let here = 0;
    for (const b of B.live(0)) {
      if (B.ready[b] === 0 || w.c.buildings[B.def[b]!]!.attack === null) continue;
      const value = nightWeight(w, b, A.x[0]!, A.z[0]!);
      if (A.goal[0] === b) here = value;
      if (value > bestValue) [best, bestValue] = [b, value];
    }
    if (best >= 0 && A.goal[0] !== best && bestValue >= here + 2) bot.send({ t: "assignUnit", agent: 0, building: B.id(best) });
  };
}
