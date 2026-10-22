import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TICK_HZ } from "../src/td/content/rules";
import { PLACE_CHECKS } from "../src/td/sim/placement";
import { tempoIndex } from "../src/td/typing/tempo";
import { REASON, statusHtml } from "../src/td/ui/hud";
import { teamHtml } from "../src/td/ui/team-bar";
import { arrive, run, send, world } from "./td/fixtures";
import { smallDeck } from "./td/typing";

/**
 * The HUD's words and numbers (docs/td/BUILD_NOW.md §5.3; TK 6.13, 18.3): what
 * a panel promises is what the sim does. The panels are HTML strings, read here
 * without a page.
 */
const status = (w: ReturnType<typeof world>) => statusHtml(w, true, false, false, []);

describe("the status panel", () => {
  it("the flag button promises the gold an early call pays, at every tick of the count; the count itself rounds up", () => {
    // A tick in: 29.98 s left; 31 in: 29.48 s ("30 s · +29"); 59 in: 29.02 s; 60 in: exactly 29 s.
    for (const into of [0, 1, 31, 59, 60, 61, 1799]) {
      const w = world();
      send(w, { t: "callWave" });
      while (w.nextWaveAt < 0) run(w, 1);
      run(w, into);
      const html = status(w);
      const promised = Number(/Gọi đợt 2 sớm · \+(\d+) vàng/.exec(html)?.[1]);
      const left = (w.nextWaveAt - w.tick) / TICK_HZ;
      const called = send(w, { t: "callWave" }).find((event) => event.t === "waveCalled");
      expect(called, "tick " + into).toMatchObject({ wave: 2, bonus: promised });
      expect(html, "tick " + into).toContain(`<small>${Math.ceil(left)} s</small>`);
      expect(promised).toBe(Math.min(30, Math.floor(left)));
    }
  });

  it("shows the wave as n/N through the list, then n alone in the sandbox's endless waves", () => {
    const w = world();
    const wave = () => /<small>Đợt<\/small><b>([^<]*)/.exec(status(w))?.[1];
    expect(wave()).toBe("0/6");
    w.wave = 6;
    expect(wave()).toBe("6/6");
    w.wave = 7;
    expect(wave()).toBe("7");
  });

  it("names every reason the sim may refuse a command for, in Vietnamese", () => {
    // applyCommand's reasons: the string literals commands.ts returns, typeKey's (words.ts), and canPlace's checks.
    const files = ["../src/td/sim/commands.ts", "../src/td/sim/systems/words.ts"].map((path) => readFileSync(join(__dirname, path), "utf8"));
    const returned = files.flatMap((text) => [...text.matchAll(/return ([^;]*);/g)].flatMap((match) => [...match[1]!.matchAll(/"([a-z][A-Za-z]*)"/g)].map((literal) => literal[1]!)));
    const reasons = [...new Set([...returned, ...PLACE_CHECKS])];
    expect(reasons).toEqual(expect.arrayContaining(["noBuilding", "noBarracks", "badValue", "noSandbox", "badKey", "blocked", "notCounting", "path"]));
    expect(reasons.filter((reason) => REASON[reason] === undefined)).toEqual([]);
  });
});

describe("the load chip (TK 6.13)", () => {
  /** The Bastion assisted at 4 s (15 words a minute) with 4-letter words: K = 0.75 × E × 5 / 5, so E = 20 is 100 % and E = 16 is 125 %. */
  function loadAt(expected: number) {
    const w = world({ deck: smallDeck(["cats", "dogs", "fish", "bird", "lamp", "ring"]), difficulty: "easy", expected });
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(0) });
    arrive(w);
    send(w, { t: "setTempo", building: w.buildings.id(0), idx: tempoIndex(4) });
    run(w, 60);
    const chip = /class="td-load" style="background:(#[0-9a-f]{6})"[^>]*>Tải (\d+) %/.exec(teamHtml(w, 0));
    return [Number(chip?.[2]), chip?.[1]];
  }

  it("is jade up to 100 %, amber up to 125 %, orange past it (never red, the enemy's)", () => {
    expect(loadAt(21)).toEqual([95, "#0b8a78"]);
    expect(loadAt(20)).toEqual([100, "#0b8a78"]);
    expect(loadAt(19)).toEqual([105, "#c98a2e"]);
    expect(loadAt(16)).toEqual([125, "#c98a2e"]);
    expect(loadAt(15)).toEqual([133, "#e2701e"]);
  });

  it("counts only buildings that deal: none assisted is 0 % with no list", () => {
    const html = teamHtml(world(), 0);
    expect(html).toContain('title="Chưa nhà nào phát chữ">Tải 0 %');
  });
});
