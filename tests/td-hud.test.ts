import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TICK_HZ } from "../src/td/content/rules";
import { PLACE_CHECKS } from "../src/td/sim/placement";
import { CALL_KIND } from "../src/td/sim/stores/calls";
import { makeCall } from "../src/td/sim/systems/calls";
import { Selection } from "../src/td/app/selection";
import { review } from "../src/td/sim/systems/calls";
import { compileDeck } from "../src/td/typing/decks";
import { dockHtml } from "../src/td/ui/build-menu";
import { actionsHtml, REASON, statusHtml, stripHtml } from "../src/td/ui/hud";
import { teamHtml } from "../src/td/ui/team-bar";
import { built, run, send, world } from "./td/fixtures";
import { callWord, type } from "./td/typing";

/**
 * The HUD's words and numbers (docs/td/BUILD_NOW.md §5.3, BUILD_1A6 §9): what
 * a panel promises is what the sim does. The panels are HTML strings, read here
 * without a page.
 */
const status = (w: ReturnType<typeof world>) => statusHtml(w, true, false, false, []);

describe("the status panel", () => {
  it("shows gold, wood, food, seeds and lives, then the day's clock or the night's enemies left", () => {
    const w = world();
    const html = status(w);
    for (const [label, value] of [["Vàng", "220"], ["Gỗ", "40"], ["Lúa", "0"], ["Hạt", "4"], ["Mạng", "20"]]) expect(html).toContain(`<small>${label}</small><b>${value}</b>`);
    expect(html).toContain("<b>Ngày 1 · 1:15</b>");
    run(w, 61);
    expect(status(w)).toContain("<b>Ngày 1 · 1:14</b>"); // 73.98 s left rounds up
    send(w, { t: "callNight" });
    expect(status(w)).toMatch(/<b>Đêm 1 · còn \d+ quái<\/b>/);
    expect(status(w)).not.toContain("Gọi đêm sớm");
  });

  it("the call button promises the gold an early night pays, at every tick of the day", () => {
    for (const into of [0, 1, 31, 59, 60, 61, 3000, 4439, 4441]) {
      const w = world();
      run(w, into);
      const html = status(w);
      const promised = Number(/Gọi đêm sớm · \+(\d+) vàng/.exec(html)?.[1]);
      const called = send(w, { t: "callNight" }).find((event) => event.t === "nightCalled");
      expect(called, "tick " + into).toMatchObject({ day: 1, bonus: promised });
      expect(promised).toBe(Math.min(30, Math.floor((w.phaseEnd < 0 ? 4500 - into : 0) / TICK_HZ)));
    }
  });

  it("names every reason the sim may refuse a command for, in Vietnamese", () => {
    // applyCommand's reasons: the string literals commands.ts returns, typeKey's (calls.ts), and canPlace's checks.
    const files = ["../src/td/sim/commands.ts", "../src/td/sim/systems/calls.ts"].map((path) => readFileSync(join(__dirname, path), "utf8"));
    const returned = files.flatMap((text) => [...text.matchAll(/return ([^;]*);/g)].flatMap((match) => [...match[1]!.matchAll(/"([a-z][A-Za-z]*)"/g)].map((literal) => literal[1]!)));
    const reasons = [...new Set([...returned, ...PLACE_CHECKS])];
    expect(reasons).toEqual(expect.arrayContaining(["noBuilding", "noBarracks", "badValue", "noSandbox", "badKey", "blocked", "notDay", "path", "tree", "wood", "food", "villagerCap", "notRipe", "noTree"]));
    expect(reasons.filter((reason) => REASON[reason] === undefined)).toEqual([]);
  });
});

describe('the "Đang gọi" chip (BUILD_1A6 §9)', () => {
  it("counts the open calls against the mode's cap", () => {
    const w = world();
    const chip = () => /Đang gọi (\d+)\/(\d+)/.exec(teamHtml(w, 0))?.slice(1).map(Number);
    expect(chip()).toEqual([0, 3]);
    for (let k = 0; k < 4; k += 1) makeCall(w, CALL_KIND.mine, 1, -1, 0, -1, -1);
    run(w, 1);
    expect(chip()).toEqual([3, 3]);
    send(w, { t: "sandbox", op: { op: "mode", value: "challenge" } });
    expect(chip()).toEqual([4, 4]);
  });
});

describe("learning in the HUD (BUILD_1A6 §7)", () => {
  const deck = compileDeck([{ id: "g", text: "good", level: 1, vi: "tốt; hay", ipa: "/ɡʊd/" }, { id: "c", text: "cold", level: 1, vi: "lạnh; rét", ipa: "/koʊld/" }]);

  it("the status counts knowledge and the review book once there are any", () => {
    const w = world({ deck });
    expect(status(w)).not.toContain("Tri thức");
    review(w, 1, true);
    expect(status(w)).toContain("Tri thức <b>0</b> · Sổ ôn <b>1</b>");
  });

  it("the strip hides a quiz's word past what is typed, under its meaning; the learn mode adds meaning and IPA; other modes neither", () => {
    const w = world({ deck });
    callWord(w, 0, 1, CALL_KIND.quiz);
    type(w, "g", 60, true);
    expect(stripHtml(w, "")).toContain('<b class="td-word"><span>g</span>___</b><small class="td-mean">tốt; hay</small>');
    type(w, "o", 60, true);
    expect(stripHtml(w, "")).toContain("<span>go</span>__</b>");
    for (const [mode, mean] of [["learn", '<small class="td-mean">lạnh; rét /koʊld/</small>'], ["balanced", ""]] as const) {
      const other = world({ deck, mode });
      callWord(other, 1);
      type(other, "c", 60, true);
      expect(stripHtml(other, "")).toContain('<b class="td-word"><span>c</span>old</b>' + mean + "<span");
    }
  });
});

describe("cards and buttons (BUILD_1A6 §8–§9)", () => {
  it("the farm's card: plots by stage, seeds, a pack, the auto-buy; the Bastion's: villagers, builders, food, hire, sale; a tower's: power charges", () => {
    const w = world({ gold: 1000 });
    const sel = new Selection(w, () => undefined);
    send(w, { t: "sandbox", op: { op: "preset" } });
    const card = (id: string) => {
      sel.focus = w.buildings.id(w.buildings.live().find((b) => w.c.buildings[w.buildings.def[b]!]!.id === id)!);
      return dockHtml(w, sel);
    };
    const farm = card("farm");
    for (const text of ["Chín <b>1</b> · Lớn <b>2</b> · Trống <b>1</b>", "Hạt giống <b>", "Mua 4 hạt · 30 vàng", 'class="is-on">Tự mua hạt']) expect(farm).toContain(text);
    for (const text of ["Dân <b>5/7</b> · Thợ xây <b>3</b> · Lúa <b>0</b>", "Thuê dân · 25 vàng, 5 lúa", "Bán 10 Lúa · +10 vàng"]) expect(card("keep")).toContain(text);
    expect(card("archer")).toContain("Lượt mạnh <b>0/5</b>");
  });

  it("the card of a dim call Tab is on names it and sends the agent; the actions bar has Space only where the mode pauses", () => {
    const w = world({ gold: 1000 });
    const mine = built(w, "gold-mine", 26, -30);
    [w.buildings.haulAt[mine], w.buildings.pile[mine]] = [1e9, 31000];
    run(w, 1);
    const sel = new Selection(w, () => undefined);
    sel.call = w.calls.id(w.buildings.call[mine]!);
    expect(dockHtml(w, sel)).toMatch(/⛏️ Đào.*2 từ · đang mờ.*Gửi Draconis/s);
    expect(actionsHtml(w, false)).not.toContain("Space");
    send(w, { t: "sandbox", op: { op: "mode", value: "relax" } });
    expect([actionsHtml(w, false), actionsHtml(w, true)].map((html) => /data-act="space">([^<]+)/.exec(html)?.[1])).toEqual(["Tạm dừng", "Chạy tiếp"]);
  });
});
