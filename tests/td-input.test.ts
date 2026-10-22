import { describe, expect, it } from "vitest";
import { installKeys, KEY_ACTIONS, keyAction } from "../src/td/app/input";
import { Selection } from "../src/td/app/selection";
import { Session } from "../src/td/app/session";
import type { CommandBody } from "../src/td/sim/commands";
import { BUILD } from "../src/td/content/rules";
import { canPlace, nextSpot, spotCandidates } from "../src/td/sim/placement";
import { CELL } from "../src/td/sim/nav/grid";
import { FARM } from "../src/td/content/rules";
import { MODE } from "../src/td/sim/stores/agents";
import { PLOT } from "../src/td/sim/stores/buildings";
import { CALL_STATE } from "../src/td/sim/stores/calls";
import { NPC_KIND } from "../src/td/sim/stores/npcs";
import { stand } from "../src/td/sim/systems/agents";
import { countNpcs, plotAt } from "../src/td/sim/systems/economy";
import { arrive, build, built, def, q, ready, run, send, world } from "./td/fixtures";
import { callWord, smallDeck } from "./td/typing";

/**
 * The keyboard and the mouse (docs/td/BUILD_NOW.md §5.4, §6.1 td-input; BUILD_1A6 §8; TK 6.15,
 * 8.3): keys by event.code, letters never commands, input methods, held keys
 * and synthetic events left alone, and a keyboard path for every task, run
 * through the real selection and the sim.
 */
type Press = { key: string; code: string; shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; repeat?: boolean; isComposing?: boolean; keyCode?: number; isTrusted?: boolean };
const press = (event: Press, allowUntrusted = false) => keyAction({ isTrusted: true, shiftKey: false, ...event } as unknown as KeyboardEvent, allowUntrusted);

describe("keys by event.code (BUILD_NOW §5.4)", () => {
  it("maps every command key by its code, whatever the layout prints", () => {
    const expected: [Press, string][] = [
      [{ key: "1", code: "Digit1" }, "pick:1"], [{ key: "&", code: "Digit1" }, "pick:1"], [{ key: "é", code: "Digit2" }, "pick:2"],
      [{ key: '"', code: "Digit3" }, "pick:3"], [{ key: "'", code: "Digit4" }, "pick:4"], [{ key: "0", code: "Digit0" }, "recall"],
      [{ key: "`", code: "Backquote" }, "cycle"], [{ key: "Tab", code: "Tab" }, "next"], [{ key: "Tab", code: "Tab", shiftKey: true }, "prev"],
      [{ key: "Enter", code: "Enter" }, "send"], [{ key: "Enter", code: "NumpadEnter" }, "send"], [{ key: "Enter", code: "Enter", shiftKey: true }, "night"],
      [{ key: "5", code: "Digit5" }, "pick:5"], [{ key: "Insert", code: "Insert" }, "build"], [{ key: "\\", code: "Backslash" }, "build"],
      [{ key: "Insert", code: "Insert", shiftKey: true }, "hire"], [{ key: "|", code: "Backslash", shiftKey: true }, "hire"],
      [{ key: "Delete", code: "Delete" }, "undo"], [{ key: "Escape", code: "Escape" }, "escape"], [{ key: "Pause", code: "Pause" }, "pause"],
      [{ key: "F9", code: "F9" }, "sandbox"], [{ key: " ", code: "Space" }, "space"], [{ key: "ArrowLeft", code: "ArrowLeft" }, "pan:1:0"],
      [{ key: "ArrowDown", code: "ArrowDown" }, "pan:0:-1"], [{ key: "Backspace", code: "Backspace" }, "backspace"],
    ];
    for (const [event, action] of expected) expect(press(event), JSON.stringify(event)).toBe(action);
    // §8: the tempo keys are gone; the page leaves them alone.
    for (const event of [{ key: "-", code: "Minus" }, { key: "=", code: "Equal" }, { key: "_", code: "Minus", shiftKey: true }, { key: "+", code: "Equal", shiftKey: true }]) expect(press(event)).toBeNull();
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
      { key: "Enter", code: "Enter", metaKey: true }, { key: "a", code: "KeyA", isTrusted: false }, { key: " ", code: "Space", isComposing: true },
      { key: "Process", code: "Space", keyCode: 229 }, { key: " ", code: "Space", repeat: true }, { key: "|", code: "Backslash", shiftKey: true, isComposing: true },
    ]) expect(press(event), JSON.stringify(event)).toBeNull();
    expect(press({ key: "ArrowUp", code: "ArrowUp", repeat: true })).toBe("pan:0:1");
    expect(press({ key: "a", code: "KeyA", isTrusted: false }, true)).toBe(0);
  });

  it("installKeys: letters and Backspace become commands with the key's time, actions (Space too) go to the selection, a Vietnamese sign is reported", () => {
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
    expect(acts).toEqual(["space", "next"]);
    expect(vietnamese).toBe(2);
  });
});

/** A world, its selection, and a step that applies what the selection sent (like a frame); `applied` is what the last step took. */
function hand(options: Parameters<typeof world>[0] = {}) {
  const w = world(options);
  const sent: CommandBody[] = [];
  const applied: CommandBody[] = [];
  const sel = new Selection(w, (command) => sent.push(command));
  const keys = (...actions: string[]) => {
    for (const action of actions) sel.act(action);
    applied.splice(0, applied.length, ...sent);
    const events = send(w, ...sent.splice(0));
    sel.update();
    return events;
  };
  return { w, sel, sent, applied, keys };
}

describe("a keyboard path for every task (BUILD_NOW §5.4, BUILD_1A6 §8)", () => {
  it("every action of a day and a night has a key", () => {
    const keyed = new Set(Object.values(KEY_ACTIONS).map((action) => action.split(":")[0]));
    for (const action of ["pick", "cycle", "recall", "next", "prev", "send", "night", "hire", "build", "undo", "escape", "pause", "pan"]) expect(keyed.has(action), action).toBe(true);
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
    keys("build", "pick:5");
    expect(sel.ghost()!.reason).toBe("");
    keys("send");
    expect(w.buildings.live(1).map((b) => w.c.buildings[w.buildings.def[b]!]!.id)).toEqual(["archer", "barracks", "gold-mine", "farm"]);
  });

  it("Tab focuses buildings from the nearest to the selected agent; Enter sends the agent", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    const near = build(w, "archer", -8, 12);
    const far = build(w, "cannon", 26, -6);
    ready(w);
    keys("next");
    expect(w.buildings.slotOf(sel.focus)).toBe(0); // the hero rests by the Bastion
    keys("next");
    expect(w.buildings.slotOf(sel.focus)).toBe(near);
    keys("next", "prev", "next");
    expect(w.buildings.slotOf(sel.focus)).toBe(far);
    // Away from the Bastion the order follows the hero, not the Bastion: the cannon, the archer, then the Bastion.
    keys("escape");
    send(w, { t: "move", agent: 0, qx: q(24), qz: q(-14) });
    run(w, 900);
    expect([w.agents.x[0], w.agents.z[0], w.agents.mode[0]]).toEqual([24, -14, MODE.stand]);
    const order = [1, 2, 3].map(() => (keys("next"), w.buildings.slotOf(sel.focus)));
    expect(order).toEqual([far, near, 0]);
    keys("prev", "prev");
    expect(w.buildings.slotOf(sel.focus)).toBe(far);
    expect(keys("send").find((event) => event.t === "agentOrdered")).toMatchObject({ agent: 0, building: w.buildings.id(far) });
  });

  it("Shift+\\ hires a villager; the farm's and the Bastion's card buttons buy seeds, switch the auto-buy, sell food, upgrade", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    w.food = 20;
    keys("hire");
    expect([countNpcs(w, NPC_KIND.villager), w.food]).toEqual([3, 15]);
    const farm = built(w, "farm", -17, 40);
    sel.focus = w.buildings.id(farm);
    keys("seeds", "autoSeeds", "sellFood");
    expect([w.autoSeeds, w.food]).toEqual([false, 5]);
    expect(keys("upgrade").find((event) => event.t === "built")).toMatchObject({ building: w.buildings.id(farm) });
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

  it("Shift+Enter calls the night; Esc lets go of the locked word, then closes the menu, then goes back to the hero, then pauses", () => {
    const { w, sel, keys } = hand({ deck: smallDeck(["cat", "dog", "fish"]) });
    expect(keys("night").find((event) => event.t === "waveStart")).toMatchObject({ wave: 1 });
    keys("sb:keepLevel:2");
    keys("pick:2", "next");
    callWord(w, 0);
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

  it("Delete undoes the building whose card is open within its 5 s; it never touches the Bastion or anything with no card open", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    const archer = build(w, "archer", -8, 12);
    const none = keys("undo"); // no card open
    sel.click({ x: 0, z: 40 }, false);
    const bastion = keys("undo"); // the Bastion's card
    expect([...none, ...bastion].filter((event) => event.t === "rejected" || event.t === "sold")).toEqual([]);
    sel.click({ x: -8, z: 12 }, false);
    expect(w.buildings.slotOf(sel.focus)).toBe(archer);
    expect(keys("undo").find((event) => event.t === "sold")).toMatchObject({ gold: 49, wood: 21 });
    expect([w.gold, w.wood, sel.focus]).toEqual([1000 * 1000, 1000, -1]);
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

  it("a right click while the build menu is open only closes it", () => {
    const { w, sel, sent, keys } = hand({ gold: 1000 });
    sel.click({ x: -8, z: 12 }, false);
    expect(sel.building).toBe(true);
    sel.click({ x: -8, z: 12 }, true);
    keys();
    expect([sel.building, sent, w.buildings.live(1)]).toEqual([false, [], []]);
  });

  it("right on a building sends the selected agent; right on the ground moves it: Draconis flies anywhere on the field, a helper may not stand in the water", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    const archer = build(w, "archer", -8, 12);
    ready(w);
    sel.click({ x: -8.5, z: 12.5 }, true);
    expect(keys().find((event) => event.t === "agentOrdered")).toMatchObject({ agent: 0, building: w.buildings.id(archer) });
    arrive(w);
    const spot = { ...stand(w, archer) };
    expect([w.agents.x[0], w.agents.z[0]]).toEqual([spot.x, spot.z]);
    sel.click({ x: 20, z: 20 }, true);
    keys();
    run(w, 600);
    expect([w.agents.x[0], w.agents.z[0], w.agents.goal[0], w.agents.mode[0]]).toEqual([20, 20, -1, MODE.stand]);
    sel.click({ x: -24, z: 0 }, true); // over the stream
    expect(w.grid.cells[w.grid.cell(-24, 0)]).toBe(CELL.water);
    expect(keys().find((event) => event.t === "rejected")).toBeUndefined();
    run(w, 900);
    expect([w.agents.x[0], w.agents.z[0], w.agents.mode[0]]).toEqual([-24, 0, MODE.stand]);
    expect(send(w, { t: "move", agent: 0, qx: q(-8), qz: q(12) }).find((event) => event.t === "rejected")).toBeUndefined(); // onto the archer's roof (a right click there sends him beside it)
    run(w, 900);
    expect([w.agents.x[0], w.agents.z[0], w.agents.goal[0]]).toEqual([-8, 12, -1]);
    keys("sb:keepLevel:2");
    keys("agent:1");
    sel.click({ x: -24, z: 0 }, true);
    expect(keys().find((event) => event.t === "rejected")).toMatchObject({ command: "move", reason: "blocked" });
    expect(send(w, { t: "move", agent: 3, qx: 0, qz: 0 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "noSlot" });
    expect(send(w, { t: "move", agent: 0, qx: 0.5, qz: 0 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "bounds" });
    expect(send(w, { t: "move", agent: 0, qx: q(60), qz: 0 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "blocked" });
  });
});

describe("the tactical pause (BUILD_1A6 §8)", () => {
  it("Space pauses the relax and learn modes and goes on again; elsewhere it does nothing; a mode without it ends it", () => {
    for (const mode of ["relax", "learn"] as const) {
      const { sel, keys } = hand({ mode });
      keys("space");
      expect([sel.tactical, sel.halted, sel.paused]).toEqual([true, true, false]);
      keys("space");
      expect([sel.tactical, sel.halted]).toEqual([false, false]);
    }
    for (const mode of ["balanced", "challenge"] as const) {
      const { sel, keys } = hand({ mode });
      keys("space");
      expect([sel.tactical, sel.halted]).toEqual([false, false]);
    }
    const { sel, keys } = hand({ mode: "learn" });
    keys("space", "pause");
    expect([sel.tactical, sel.paused]).toEqual([false, false]); // the HUD's ▶ goes on
    keys("space", "sb:mode:balanced");
    expect(sel.tactical).toBe(false);
  });

  it("paused, the session steps nothing and holds what the hand sends; it acts on the next tick once the game runs again", () => {
    const session = new Session({ seed: 1, mode: "relax" });
    const sel = new Selection(session.world, (command) => session.send(command));
    session.frame(0);
    sel.act("space");
    session.paused = sel.halted;
    sel.act("seeds"); // a farm card's button, pressed while paused
    sel.act("build");
    sel.act("send");
    expect([session.frame(1000), session.world.tick, session.log, sel.building]).toEqual([0, 0, [], false]);
    sel.act("space");
    session.paused = sel.halted;
    expect(session.frame(1017)).toBe(1);
    expect(session.log.map((command) => [command.t, command.tick])).toEqual([["buySeeds", 0], ["build", 0]]);
    expect([session.world.seeds, session.world.buildings.live(1).length]).toEqual([8, 1]);
  });
});

describe("Tab and clicks to calls (BUILD_1A6 §8)", () => {
  /** A ready mine on N1 whose pile calls for help; the hero by the Bastion, too far to light it. */
  function dimMine() {
    const h = hand({ gold: 1000 });
    const mine = built(h.w, "gold-mine", 26, -30);
    [h.w.buildings.haulAt[mine], h.w.buildings.pile[mine]] = [1e9, 31000];
    run(h.w, 1);
    const c = h.w.buildings.call[mine]!;
    expect([h.w.calls.state[c], h.w.calls.bright[c]]).toEqual([CALL_STATE.open, 0]);
    return { ...h, mine, c };
  }

  it("Tab goes through the buildings, then the dim calls, each nearest the agent first; Enter sends the agent by the call's building", () => {
    const { w, sel, keys, mine, c } = dimMine();
    const seen = [1, 2, 3, 4].map(() => (keys("next"), [sel.focus, sel.call]));
    expect(seen).toEqual([[w.buildings.id(0), -1], [w.buildings.id(mine), -1], [-1, w.calls.id(c)], [w.buildings.id(0), -1]]);
    keys("prev");
    expect([sel.focus, sel.call]).toEqual([-1, w.calls.id(c)]);
    expect(keys("send").find((event) => event.t === "agentOrdered")).toMatchObject({ agent: 0, building: w.buildings.id(mine) });
    keys("escape");
    expect(sel.call).toBe(-1);
  });

  it("a click on an NPC sends the agent: by its call, by its farm, or where it stands; a call's bubble (toCall) the same way", () => {
    const { w, sel, keys, applied, mine, c } = dimMine();
    const farm = built(w, "farm", -17, 40);
    const farmer = w.buildings.farmer[farm]!;
    sel.click({ x: w.npcs.x[farmer]! + 0.3, z: w.npcs.z[farmer]! }, false);
    expect(keys().find((event) => event.t === "agentOrdered")).toMatchObject({ building: w.buildings.id(farm) });
    const villager = w.npcs.live().find((n) => w.npcs.kind[n] === NPC_KIND.villager)!;
    const [x, z] = [w.npcs.x[villager]!, w.npcs.z[villager]!];
    sel.click({ x, z }, false);
    keys();
    expect(applied).toEqual([{ t: "move", agent: 0, qx: q(x), qz: q(z) }]);
    sel.toCall(w.calls.id(c));
    expect(keys().find((event) => event.t === "agentOrdered")).toMatchObject({ building: w.buildings.id(mine) });
    sel.toCall(-1); // a call gone: nothing
    expect(keys().filter((event) => event.t === "agentOrdered")).toEqual([]);
  });
});

describe("clicks on trees and plots (BUILD_1A6 §8)", () => {
  it("a click on a standing tree marks it, again unmarks it; a click on a ripe plot asks the farmer for it first", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    const [x, z] = w.map.trees[3]!;
    sel.click({ x: x + 0.8, z }, false);
    keys();
    expect(w.trees.marked[3]).toBe(1);
    sel.click({ x, z }, false);
    keys();
    expect([w.trees.marked[3], sel.building, sel.focus]).toEqual([0, false, -1]);
    const farm = built(w, "farm", -17, 40);
    w.buildings.plot[farm * FARM.plots + 1] = PLOT.ripe;
    const plot = plotAt(w, farm, 1);
    sel.click(plot, false);
    keys();
    expect(w.buildings.prio[farm] === 1 || w.npcs.job[w.buildings.farmer[farm]!] === 1).toBe(true);
    sel.click(plotAt(w, farm, 0), false); // not ripe: the farm's card
    expect(w.buildings.slotOf(sel.focus)).toBe(farm);
  });
});

describe("the sandbox preset and the suggested spots", () => {
  it('"Đặt sẵn" (§10) puts the map\'s preset down built and free, the Bastion at level 3, 5 villagers, the 8 trees nearest the Bastion marked; pressed again it changes nothing', () => {
    const { w, keys } = hand();
    keys("sb:preset");
    const B = w.buildings;
    expect(B.level[0]).toBe(3);
    expect([w.gold, w.wood]).toEqual([220_000, 40]);
    expect(B.live(1).map((b) => [w.c.buildings[B.def[b]!]!.id, B.x[b], B.z[b], B.ready[b], B.paidGold[b]])).toEqual([
      ["archer", -8, 12, 1, 0], ["cannon", 7, 12, 1, 0], ["barracks", 3, 18, 1, 0], ["gold-mine", 26, -30, 1, 0], ["farm", -17, 40, 1, 0],
    ]);
    expect(countNpcs(w, NPC_KIND.villager)).toBe(5);
    expect(countNpcs(w, NPC_KIND.builder)).toBe(3);
    expect(countNpcs(w, NPC_KIND.farmer)).toBe(1);
    const farm = B.live().find((b) => w.c.buildings[B.def[b]!]!.farm)!;
    expect([0, 1, 2, 3].map((p) => [B.plot[farm * FARM.plots + p], Math.round(B.plotWork[farm * FARM.plots + p]! * 100) / 100])).toEqual([[PLOT.ripe, 0], [PLOT.growing, 0.7], [PLOT.growing, 0.3], [PLOT.empty, 0]]); // every stage at once
    expect(w.trees.marked.reduce((sum, m) => sum + m, 0)).toBe(8);
    keys("sb:preset");
    expect([B.live(1).length, countNpcs(w, NPC_KIND.villager), w.trees.marked.reduce((sum, m) => sum + m, 0)]).toEqual([5, 5, 8]);
  });

  it("offers mines the free nodes, and others the places by the road canPlace allows (gold aside), nearest a bend first, both ways round", () => {
    const w = world({ gold: 1000 });
    build(w, "archer", -8, 12);
    w.gold = 0; // spots leave gold aside
    const offered = (kind: number, dir: 1 | -1) => {
      const candidates = spotCandidates(w, kind);
      const seen: number[] = [];
      for (let k = nextSpot(w, kind, candidates, dir > 0 ? 0 : candidates.length - 1, dir); k >= 0 && !seen.includes(k); k = nextSpot(w, kind, candidates, (k + dir + candidates.length) % candidates.length, dir)) seen.push(k);
      return { candidates, spots: seen.map((k) => candidates[k]!) };
    };
    const archer = def(w, "archer");
    const { candidates, spots } = offered(archer, 1);
    expect(spots.length).toBeGreaterThan(40);
    expect(spots).toEqual(candidates.filter((p) => canPlace(w, archer, q(p.x), q(p.z), true).ok));
    expect(spots.length).toBeLessThan(candidates.length); // the road's clearance, the Bastion's ring, the archer already there
    expect(offered(archer, -1).spots).toEqual(spots.slice().reverse());
    const bend = (p: { x: number; z: number }) => Math.min(...w.map.routes.flatMap((route) => route.slice(1, -1)).map(([x, z]) => Math.sqrt((x - p.x) ** 2 + (z - p.z) ** 2)));
    expect(bend(spots[0]!)).toBeLessThanOrEqual(BUILD.roadClearM + 2 + 2 + 2);
    for (let k = 1; k < spots.length; k += 1) expect(bend(spots[k]!)).toBeGreaterThanOrEqual(bend(spots[k - 1]!) - 1e-9);
    const mines = offered(def(w, "gold-mine"), 1).spots;
    expect([mines.length, mines]).toEqual([3, expect.arrayContaining(w.map.nodes.map((node) => ({ x: node.x, z: node.z })))]);
  });

  it("Insert and Tab check spots only as far as they go: about one path search a press, not one per spot (~40 ms)", () => {
    const { w, sel, keys } = hand({ gold: 1000 });
    keys("sb:preset");
    let searches = 0;
    const stamp = w.grid.stamp.bind(w.grid);
    w.grid.stamp = (x, z, r, flag, on) => {
      if (flag === CELL.probe && on) searches += 1;
      stamp(x, z, r, flag, on);
    };
    const presses: number[] = [];
    for (const action of ["build", "next", "next", "next", "prev", "pick:3", "next", "pick:2", "prev", "escape", "build"]) {
      searches = 0;
      sel.act(action);
      presses.push(searches);
    }
    expect(presses.every((n) => n <= 3)).toBe(true);
    expect(sel.ghost()?.reason).toBe("");
  });
});
