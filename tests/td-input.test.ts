import { describe, expect, it } from "vitest";
import { installKeys, KEY_ACTIONS, keyAction } from "../src/td/app/input";
import { Selection } from "../src/td/app/selection";
import type { CommandBody } from "../src/td/sim/commands";
import { BUILD } from "../src/td/content/rules";
import { canPlace, freeSpots } from "../src/td/sim/placement";
import { MODE } from "../src/td/sim/stores/agents";
import { spawnWord } from "../src/td/sim/systems/words";
import { STOP } from "../src/td/typing/tempo";
import { arrive, build, def, q, ready, run, send, world } from "./td/fixtures";
import { smallDeck } from "./td/typing";

/**
 * The keyboard and the mouse (docs/td/BUILD_NOW.md §5.4, §6.1 td-input; TK 6.15,
 * 8.3): keys by event.code, letters never commands, input methods, held keys
 * and synthetic events left alone, and a keyboard path for every task in a
 * wave, run through the real selection and the sim.
 */
type Press = { key: string; code: string; shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; repeat?: boolean; isComposing?: boolean; keyCode?: number; isTrusted?: boolean };
const press = (event: Press, allowUntrusted = false) => keyAction({ isTrusted: true, shiftKey: false, ...event } as unknown as KeyboardEvent, allowUntrusted);

describe("keys by event.code (BUILD_NOW §5.4)", () => {
  it("maps every command key by its code, whatever the layout prints", () => {
    const expected: [Press, string][] = [
      [{ key: "1", code: "Digit1" }, "pick:1"], [{ key: "&", code: "Digit1" }, "pick:1"], [{ key: "é", code: "Digit2" }, "pick:2"],
      [{ key: '"', code: "Digit3" }, "pick:3"], [{ key: "'", code: "Digit4" }, "pick:4"], [{ key: "0", code: "Digit0" }, "recall"],
      [{ key: "`", code: "Backquote" }, "cycle"], [{ key: "Tab", code: "Tab" }, "next"], [{ key: "Tab", code: "Tab", shiftKey: true }, "prev"],
      [{ key: "Enter", code: "Enter" }, "send"], [{ key: "Enter", code: "NumpadEnter" }, "send"], [{ key: "Enter", code: "Enter", shiftKey: true }, "wave"],
      [{ key: "-", code: "Minus" }, "slower"], [{ key: "=", code: "Equal" }, "denser"], [{ key: "-", code: "NumpadSubtract" }, "slower"],
      [{ key: "+", code: "NumpadAdd" }, "denser"], [{ key: "_", code: "Minus", shiftKey: true }, "stopAll"], [{ key: "+", code: "Equal", shiftKey: true }, "restore"],
      [{ key: "Insert", code: "Insert" }, "build"], [{ key: "Escape", code: "Escape" }, "escape"], [{ key: "Pause", code: "Pause" }, "pause"],
      [{ key: "F9", code: "F9" }, "sandbox"], [{ key: " ", code: "Space" }, ""], [{ key: "ArrowLeft", code: "ArrowLeft" }, "pan:1:0"],
      [{ key: "ArrowDown", code: "ArrowDown" }, "pan:0:-1"], [{ key: "Backspace", code: "Backspace" }, "backspace"],
    ];
    for (const [event, action] of expected) expect(press(event), JSON.stringify(event)).toBe(action);
  });

  it("never turns a letter into a command: a letter key types, whatever its code; a letter code that prints no letter does nothing", () => {
    for (let c = 0; c < 26; c += 1) {
      const letter = String.fromCharCode(97 + c);
      const code = "Key" + letter.toUpperCase();
      expect(press({ key: letter, code })).toBe(c);
      expect(press({ key: letter.toUpperCase(), code, shiftKey: true })).toBe(c);
      expect(press({ key: "ф", code })).toBeNull();
    }
    // A layout that prints letters on command keys still types them.
    for (const code of Object.keys(KEY_ACTIONS)) expect(press({ key: "q", code: code.replace(/^Shift/, ""), shiftKey: code.startsWith("Shift") })).toBe(16);
  });

  it("leaves input-method, held, Ctrl / Alt / Meta and synthetic presses alone (the arrows may repeat: the camera keeps moving)", () => {
    for (const event of [
      { key: "a", code: "KeyA", isComposing: true }, { key: "Process", code: "KeyA", keyCode: 229 }, { key: "Enter", code: "Enter", isComposing: true },
      { key: "1", code: "Digit1", keyCode: 229 }, { key: "a", code: "KeyA", repeat: true }, { key: "Tab", code: "Tab", repeat: true },
      { key: "Backspace", code: "Backspace", repeat: true }, { key: "a", code: "KeyA", ctrlKey: true }, { key: "1", code: "Digit1", altKey: true },
      { key: "Enter", code: "Enter", metaKey: true }, { key: "a", code: "KeyA", isTrusted: false },
    ]) expect(press(event), JSON.stringify(event)).toBeNull();
    expect(press({ key: "ArrowUp", code: "ArrowUp", repeat: true })).toBe("pan:0:1");
    expect(press({ key: "a", code: "KeyA", isTrusted: false }, true)).toBe(0);
  });

  it("installKeys: letters and Backspace become commands with the key's time, actions go to the selection, Space is only swallowed, a Vietnamese sign is reported", () => {
    const sent: CommandBody[] = [];
    const acts: string[] = [];
    let vietnamese = 0;
    let handler: (event: KeyboardEvent) => void = () => undefined;
    const target = { addEventListener: (_: string, fn: typeof handler) => (handler = fn) } as unknown as Window;
    installKeys(target, { send: (command) => sent.push(command), act: (action) => acts.push(action), onVietnamese: () => (vietnamese += 1), allowUntrusted: false });
    const fire = (event: Press) => {
      let prevented = false;
      handler({ isTrusted: true, shiftKey: false, timeStamp: 10, preventDefault: () => (prevented = true), ...event } as unknown as KeyboardEvent);
      return prevented;
    };
    expect([fire({ key: "A", code: "KeyA", shiftKey: true }), fire({ key: "Backspace", code: "Backspace" }), fire({ key: " ", code: "Space" }), fire({ key: "Tab", code: "Tab" })]).toEqual([true, true, true, true]);
    expect(fire({ key: "ô", code: "" })).toBe(false); // UniKey's accented letter: nothing to type, the player is told
    expect(fire({ key: "Process", code: "KeyA", keyCode: 229 })).toBe(false);
    expect(fire({ key: "F5", code: "F5" })).toBe(false);
    expect(sent).toEqual([{ t: "key", letter: 0, atMs: 10 }, { t: "backspace", atMs: 10 }]);
    expect(acts).toEqual(["next"]);
    expect(vietnamese).toBe(2);
  });
});

/** A world, its selection, and a step that applies what the selection sent (like a frame). */
function hand(options: Parameters<typeof world>[0] = {}) {
  const w = world(options);
  const sent: CommandBody[] = [];
  const sel = new Selection(w, (command) => sent.push(command));
  const keys = (...actions: string[]) => {
    for (const action of actions) sel.act(action);
    const events = send(w, ...sent.splice(0));
    sel.update();
    return events;
  };
  return { w, sel, sent, keys };
}

describe("a keyboard path for every task in a wave (BUILD_NOW §5.4, TK 6.14)", () => {
  it("every in-wave action has a key", () => {
    const keyed = new Set(Object.values(KEY_ACTIONS).map((action) => action.split(":")[0]));
    for (const action of ["pick", "cycle", "recall", "next", "prev", "send", "wave", "slower", "denser", "stopAll", "restore", "build", "escape", "pause", "pan"]) expect(keyed.has(action), action).toBe(true);
  });

  it("Insert opens the build menu at the first suggested spot; Enter builds there; digits pick the kind and Tab the next spot", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    keys("build");
    expect(sel.building).toBe(true);
    const first = sel.ghost()!;
    expect(first.reason).toBe("");
    expect(keys("send").find((event) => event.t === "built")).toMatchObject({ def: def(w, "archer") });
    expect(sel.building).toBe(false);
    ready(w);
    keys("build", "pick:3", "next");
    const spot = sel.ghost()!;
    expect([sel.kind, spot.reason, spot.x === first.x && spot.z === first.z]).toEqual([def(w, "barracks"), "", false]);
    keys("send");
    keys("build", "pick:4");
    expect(w.map.nodes.some((node) => node.x === sel.ghost()!.x && node.z === sel.ghost()!.z)).toBe(true);
    keys("send");
    expect(w.buildings.live(1).map((b) => w.c.buildings[w.buildings.def[b]!]!.id)).toEqual(["archer", "barracks", "gold-mine"]);
  });

  it("Tab focuses buildings from the nearest to the agent; Enter sends the agent; −/= step the tempo, sent only on a change; Shift+−/= stop and restore all", () => {
    const { w, sel, sent, keys } = hand({ gold: 1000 });
    const near = build(w, "archer", -8, 12);
    const far = build(w, "cannon", 26, -6);
    ready(w);
    keys("next");
    expect(w.buildings.slotOf(sel.focus)).toBe(0); // the hero rests by the Bastion
    keys("next");
    expect(w.buildings.slotOf(sel.focus)).toBe(near);
    keys("next", "prev", "next");
    expect(w.buildings.slotOf(sel.focus)).toBe(far);
    expect(keys("send").find((event) => event.t === "agentOrdered")).toMatchObject({ agent: 0, building: w.buildings.id(far) });
    const tempo = w.buildings.tempo[far]!;
    keys("denser");
    expect(w.buildings.tempo[far]).toBe(tempo + 1);
    keys("slower");
    keys("slower");
    expect(w.buildings.tempo[far]).toBe(tempo - 1);
    w.buildings.tempo[far] = STOP;
    sel.act("slower");
    expect(sent.filter((command) => command.t === "setTempo")).toEqual([]);
    keys("stopAll");
    expect(w.typing.allStopped).toBe(true);
    keys("restore");
    expect(w.typing.allStopped).toBe(false);
  });

  it("digits pick only open slots, Backquote cycles them, Digit0 recalls; an order never changes who is selected", () => {
    const { w, sel, keys } = hand();
    keys("pick:2");
    expect(sel.agent).toBe(0);
    keys("sb:keepLevel:3"); // a level applies on the next tick, so the digit comes a frame later
    keys("pick:3");
    expect(sel.agent).toBe(2);
    keys("cycle", "cycle");
    expect(sel.agent).toBe(1);
    keys("next", "send");
    expect(sel.agent).toBe(1);
    run(w, 30);
    expect(keys("recall").find((event) => event.t === "agentOrdered")).toMatchObject({ agent: 1, building: -1 });
    keys("sb:keepLevel:1");
    expect(sel.agent).toBe(0);
  });

  it("Shift+Enter calls the wave; Esc lets go of the locked word, then closes the menu, then goes back to the hero, then pauses", () => {
    const { w, sel, keys } = hand({ deck: smallDeck(["cat", "dog", "fish"]) });
    expect(keys("wave").find((event) => event.t === "waveStart")).toMatchObject({ wave: 1 });
    keys("sb:keepLevel:2");
    keys("pick:2", "next");
    spawnWord(w, 0, 0, 1);
    send(w, { t: "key", letter: 2, atMs: 0 });
    expect(w.typing.router.lock).toBeGreaterThanOrEqual(0);
    keys("escape");
    expect([w.typing.router.lock, sel.focus >= 0, sel.agent, sel.paused]).toEqual([-1, true, 1, false]);
    keys("escape");
    expect([sel.focus, sel.agent, sel.paused]).toEqual([-1, 1, false]);
    keys("escape");
    expect([sel.agent, sel.paused]).toEqual([0, false]);
    keys("escape");
    expect(sel.paused).toBe(true);
  });

  it("an open card or build menu holds the order grace (TK 6.14), asked once a menu opens and ended once all close", () => {
    const { w, sel, sent, keys } = hand();
    sel.act("next");
    sel.act("next");
    sel.act("build");
    sel.act("pick:2");
    expect(sent.filter((command) => command.t === "uiFocus")).toEqual([{ t: "uiFocus", on: true }]);
    keys("escape");
    expect(w.tick < w.typing.graceUntil).toBe(false);
    expect(sent).toEqual([]);
    keys("next");
    expect(w.tick < w.typing.graceUntil).toBe(false); // opened again within 3 s: no grace
    keys("escape");
    run(w, 180);
    keys("next");
    expect(w.tick < w.typing.graceUntil).toBe(true);
  });
});

describe("the mouse and the commands it sends", () => {
  it("a click on open ground opens the build menu there; the ghost follows the mouse and says why it may not stand; a click builds", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    sel.click({ x: -8, z: 12 }, false);
    expect([sel.building, sel.ghost()]).toEqual([true, { x: -8, z: 12, reason: "" }]);
    sel.pointer({ x: -8, z: 36 });
    expect(sel.ghost()!.reason).toBe("Trong vòng 11 m quanh Lũy");
    sel.click({ x: -8, z: 12 }, false);
    expect(keys().find((event) => event.t === "built")).toMatchObject({ def: def(w, "archer") });
    sel.click({ x: 60, z: 0 }, false); // off the field: nothing to build there
    expect(sel.building).toBe(false);
  });

  it("right on a building sends the selected agent; right on the ground moves it; a helper may not stand in the water", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    const archer = build(w, "archer", -8, 12);
    ready(w);
    sel.click({ x: -8.5, z: 12.5 }, true);
    expect(keys().find((event) => event.t === "agentOrdered")).toMatchObject({ agent: 0, building: w.buildings.id(archer) });
    arrive(w);
    expect(w.agents.at[0]).toBe(archer);
    sel.click({ x: 20, z: 20 }, true);
    keys();
    run(w, 600);
    expect([w.agents.x[0], w.agents.z[0], w.agents.at[0], w.agents.mode[0]]).toEqual([20, 20, -1, MODE.stand]);
    keys("sb:keepLevel:2");
    keys("agent:1");
    sel.click({ x: -24, z: 0 }, true);
    expect(keys().find((event) => event.t === "rejected")).toMatchObject({ command: "move", reason: "blocked" });
    expect(send(w, { t: "move", agent: 3, qx: 0, qz: 0 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "noSlot" });
    expect(send(w, { t: "move", agent: 0, qx: 0.5, qz: 0 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "bounds" });
    expect(send(w, { t: "move", agent: 0, qx: q(60), qz: 0 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "blocked" });
  });
});

describe("the sandbox preset and the suggested spots", () => {
  it('"Đặt sẵn 4 ô" puts the map\'s preset down free at Bastion level 4 and sends each agent; pressed again it changes nothing', () => {
    const { w, keys } = hand();
    keys("sb:preset");
    const B = w.buildings;
    expect(B.level[0]).toBe(4);
    expect(w.gold).toBe(220_000);
    expect(B.live(1).map((b) => [w.c.buildings[B.def[b]!]!.id, B.x[b], B.z[b], B.paid[b]])).toEqual([["cannon", 7, 12, 0], ["archer", -8, 12, 0], ["barracks", 3, 18, 0], ["gold-mine", -34, 8, 0]]);
    expect(w.agents.live().map((a) => w.agents.goal[a])).toEqual(B.live(1));
    keys("sb:preset");
    expect(B.live(1).length).toBe(4);
  });

  it("offers mines the free nodes, and others the places by the road canPlace allows (gold aside), nearest a bend first", () => {
    const w = world({ gold: 0 });
    const archer = def(w, "archer");
    const spots = freeSpots(w, archer);
    expect(spots.length).toBeGreaterThan(40);
    for (const spot of spots) expect(canPlace(w, archer, q(spot.x), q(spot.z), true).ok).toBe(true);
    const bend = (p: { x: number; z: number }) => Math.min(...w.map.routes.flatMap((route) => route.slice(1, -1)).map(([x, z]) => Math.sqrt((x - p.x) ** 2 + (z - p.z) ** 2)));
    expect(bend(spots[0]!)).toBeLessThanOrEqual(BUILD.roadClearM + 2 + 2 + 2);
    for (let k = 1; k < spots.length; k += 1) expect(bend(spots[k]!)).toBeGreaterThanOrEqual(bend(spots[k - 1]!) - 1e-9);
    const mines = freeSpots(w, def(w, "gold-mine"));
    expect([mines.length, mines]).toEqual([3, expect.arrayContaining(w.map.nodes.map((node) => ({ x: node.x, z: node.z })))]);
  });
});
