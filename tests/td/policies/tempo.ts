/**
 * How a bot sets tempos (docs/td/BUILD_NOW.md §6.3; TK 6.2, 6.13, 19.3):
 * one fixed tempo everywhere, the game's own hint, a load target, or the
 * densest tempo everywhere (the "dense and sloppy" bot of TK 19.6). A rule
 * changes one building's tempo at a time, at most every 1.5 s, as a hand on
 * the knob does: a tempo change restarts that building's schedule (TK 6.2),
 * so changing them all on one tick would deal every word of equal tempos
 * together, 0.2 s apart (TK 6.4), and the second of each pair could not be
 * typed in its life at 35 WPM.
 */
import { TEMPO } from "../../../src/td/content/rules";
import type { Family } from "../../../src/td/content/types";
import { dealing } from "../../../src/td/sim/systems/heat";
import { densestFor } from "../../../src/td/sim/systems/stream";
import { expectedE } from "../../../src/td/sim/systems/words";
import type { World } from "../../../src/td/sim/world";
import { capacity, STOP, stepTempo, tempoHint, tempoOpen, wordsPerMinute } from "../../../src/td/typing/tempo";
import type { Bot, Rule } from "./stand";

const KNOB_TICKS = 90;
/** Who gets the denser tempo first: towers, soldiers, support, the Bastion, then the economy. */
const FAMILY_ORDER: readonly Family[] = ["attack", "military", "support", "core", "economy", "resource"];

/** `index`, or the densest open tempo slower than it (the Bastion stops at 3 s, or 2 s from its level 2). */
function openAtMost(w: World, b: number, index: number): number {
  for (let at = index; at > STOP; at -= 1) if (tempoOpen(at, densestFor(w, b), w.difficulty)) return at;
  return stepTempo(STOP, 1, densestFor(w, b), w.difficulty);
}

/** A knob turned by one hand: the first building (of `wanted`, in order) whose tempo differs, once per KNOB_TICKS. */
function knob(): (bot: Bot, wanted: Iterable<readonly [number, number]>) => void {
  let turnedAt = -1e9;
  return (bot, wanted) => {
    if (bot.w.tick - turnedAt < KNOB_TICKS) return;
    for (const [b, index] of wanted) {
      if (bot.w.buildings.tempo[b] === index) continue;
      bot.send({ t: "setTempo", building: bot.w.buildings.id(b), idx: index });
      turnedAt = bot.w.tick;
      return;
    }
  };
}

/** Every building at TEMPO[index] (6 s: 2, 4 s: 3, 3 s: 4, 2 s: 5, 1 s: 6), or the densest it may take below. */
export function fixedTempo(index: number): Rule {
  const turn = knob();
  return (bot) => turn(bot, bot.w.buildings.live().map((b) => [b, openAtMost(bot.w, b, index)] as const));
}

/** Build k of the layout (the Bastion: −1) at its own fixed tempo; the others keep theirs. */
export function tempoByBuild(byBuild: ReadonlyMap<number, number>): Rule {
  const turn = knob();
  return (bot, plan) => {
    const wanted = [...byBuild].map(([k, index]) => [plan.goalOf(bot.w, k), index] as const).filter(([b]) => b >= 0);
    turn(bot, wanted.map(([b, index]) => [b, openAtMost(bot.w, b, index)] as const));
  };
}

/** The game's hint (TK 6.2): after 10 words at a tempo, one step denser at ≥ 95 % caught, one slower under 70 %. */
export function hintTempo(): Rule {
  const turn = knob();
  return (bot) => {
    const { w } = bot;
    const B = w.buildings;
    const wanted = B.live().map((b) => {
      const hint = tempoHint(B.resolved[b]!, B.hits[b]!, B.tempo[b]!, densestFor(w, b), w.difficulty);
      return [b, hint === 0 ? B.tempo[b]! : stepTempo(B.tempo[b]!, hint as 1 | -1, densestFor(w, b), w.difficulty)] as const;
    });
    turn(bot, wanted);
  };
}

/** Words a minute the buildings ask over K (TK 6.13) with `tempos` in place of theirs. */
function loadWith(w: World, tempos: ReadonlyMap<number, number>): number {
  const B = w.buildings;
  const asked = B.live().filter((b) => dealing(w, b) || tempos.has(b)).map((b) => tempos.get(b) ?? B.tempo[b]!);
  return wordsPerMinute(asked) / capacity(expectedE(w), w.typing.meanLen);
}

/**
 * Tempos for a load target (TK 6.13, the balanced bot's 90–110 %): each time who is assisted changes, every assisted
 * building starts at Dừng, then, towers first, one goes a step denser at a time while W / K stays at or under
 * `target`; the knob then turns toward that. A building no step fits stays at Dừng: its helper only stands there
 * (TK 6.13 "1 nhà 6 s + có mặt").
 */
export function loadTempo(target: number): Rule {
  const turn = knob();
  let assisted = "";
  let wanted = new Map<number, number>();
  return (bot) => {
    const { w } = bot;
    const B = w.buildings;
    const order = B.live().filter((b) => B.assist[b]! >= 0);
    if (order.join(",") !== assisted) {
      assisted = order.join(",");
      const rank = (b: number) => FAMILY_ORDER.indexOf(w.c.buildings[B.def[b]!]!.family);
      order.sort((a, b) => rank(a) - rank(b) || a - b);
      wanted = new Map(order.map((b) => [b, STOP]));
      for (let moved = true; moved; ) {
        moved = false;
        for (const b of order) {
          const denser = stepTempo(wanted.get(b)!, 1, densestFor(w, b), w.difficulty);
          if (denser === wanted.get(b) || loadWith(w, new Map([...wanted, [b, denser]])) > target) continue;
          wanted.set(b, denser);
          moved = true;
        }
      }
    }
    turn(bot, [...wanted].filter(([b]) => B.used[b] === 1));
  };
}

/** Every building at the densest tempo it may take ("Nhịp dày ẩu", TK 19.6). */
export function densestTempo(): Rule {
  const turn = knob();
  return (bot) => turn(bot, bot.w.buildings.live().map((b) => [b, openAtMost(bot.w, b, TEMPO.length - 1)] as const));
}
