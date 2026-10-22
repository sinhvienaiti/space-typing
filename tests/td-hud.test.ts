import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TICK_HZ } from "../src/td/content/rules";
import { PLACE_CHECKS } from "../src/td/sim/placement";
import { CALL_KIND } from "../src/td/sim/stores/calls";
import { makeCall } from "../src/td/sim/systems/calls";
import { REASON, statusHtml } from "../src/td/ui/hud";
import { teamHtml } from "../src/td/ui/team-bar";
import { run, send, world } from "./td/fixtures";

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
