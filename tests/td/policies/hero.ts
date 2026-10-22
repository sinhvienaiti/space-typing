/**
 * Where the hero goes (BUILD_1A6 §6): calls are typed only in a help ring, so Draconis follows them. Every 2 s,
 * unless a word is locked, he flies to the oldest open call that is dim, landing 2 m south of it.
 */
import { CALL_STATE } from "../../../src/td/sim/stores/calls";
import type { Rule } from "./stand";

const EVERY = 120;

export function followCalls(): Rule {
  return (bot) => {
    const { w } = bot;
    const C = w.calls;
    if (w.tick % EVERY !== 0 || w.typing.router.lock >= 0) return;
    let best = -1;
    for (const c of C.live()) if (C.state[c] === CALL_STATE.open && C.bright[c] === 0 && (best < 0 || C.born[c]! < C.born[best]!)) best = c;
    if (best < 0) return;
    bot.send({ t: "move", agent: 0, qx: Math.round(C.x[best]! * 4), qz: Math.round((C.z[best]! + 2) * 4) });
  };
}
