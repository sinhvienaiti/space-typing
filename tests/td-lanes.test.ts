import { describe, expect, it } from "vitest";
import { besidePanels, COLUMN, columnHeights, lanesTouch, spreadLanes, type LaneBox } from "../src/td/view/words/lanes";

/** Word card layout (docs/td/TYPING_DEFENSE_DESIGN.md 23.4; BUILD_NOW §6.1 td-lanes). */
const CARD = 32;

/** Ages (newest first) of the words a building at period N holds after `t` seconds, each living L. */
function ages(period: number, life: number, t: number): number[] {
  const out: number[] = [];
  for (let born = Math.floor(t / period) * period; born >= 0 && t - born < life && out.length < 4; born -= period) out.push(t - born);
  return out;
}

describe("the column rule", () => {
  it("never overlaps cards and stays ≤ 240 px with L = 7.5 s at N = 1 and 2 s", () => {
    for (const period of [1, 2]) {
      for (let t = 0; t < 30; t += 0.05) {
        const list = ages(period, 7.5, t);
        const heights = columnHeights(list, list.map(() => 7.5), []);
        for (let k = 1; k < heights.length; k += 1) expect(heights[k]! - heights[k - 1]!).toBeGreaterThanOrEqual(COLUMN.gap - 1e-9);
        expect((heights[heights.length - 1] ?? 0) + CARD).toBeLessThanOrEqual(COLUMN.max + CARD);
      }
    }
  });

  it("height is the clock: 120 px over a word's life, older above newer", () => {
    expect(columnHeights([0], [3], [])).toEqual([0]);
    expect(columnHeights([1.5], [3], [])).toEqual([60]);
    expect(columnHeights([1, 3], [4, 4], [])).toEqual([30, 90]);
    expect(columnHeights([1, 1.2], [4, 4], [])).toEqual([30, 70]);
    expect(columnHeights([9], [3], [])).toEqual([120]);
  });
});

describe("the lane spreader", () => {
  const box = (x: number, top = 100, bottom = 300, half = 50): LaneBox => ({ x, top, bottom, half });

  it("pushes overlapping columns apart sideways, the left one left, at most COLUMN.push (240 px) each", () => {
    const out = spreadLanes([box(640), box(660)], 0, 1280, []);
    expect(out[0]).toBeLessThan(0);
    expect(out[1]).toBeGreaterThan(0);
    expect(660 + out[1]! - 50 - (640 + out[0]! + 50)).toBeGreaterThanOrEqual(COLUMN.clear - 0.02);
    const same = spreadLanes([box(640), box(640), box(640)], 0, 1280, []);
    expect(same[0]).toBeLessThan(same[1]!);
    expect(same[1]).toBeLessThan(same[2]!);
    for (const offset of same) expect(Math.abs(offset)).toBeLessThanOrEqual(COLUMN.push);
  });

  it("leaves columns that do not overlap where they are, and moves none vertically", () => {
    expect(spreadLanes([box(200), box(900)], 0, 1280, [])).toEqual([0, 0]);
    expect(spreadLanes([box(640, 0, 100), box(650, 200, 300)], 0, 1280, [])).toEqual([0, 0]);
  });

  it("keeps the order stable when the anchors swap sides gradually", () => {
    let previous: number[] = [];
    for (let x = 600; x <= 700; x += 2) {
      const out = spreadLanes([box(x), box(650)], 0, 1280, []);
      const placed = [x + out[0]!, 650 + out[1]!];
      if (previous.length > 0 && x !== 650) expect(placed[0]! < placed[1]!).toBe(x < 650);
      previous = placed;
    }
  });

  it("keeps every column inside the safe area", () => {
    const out = spreadLanes([box(20), box(1270)], 8, 1272, []);
    expect(20 + out[0]! - 50).toBeGreaterThanOrEqual(8);
    expect(1270 + out[1]! + 50).toBeLessThanOrEqual(1272);
  });

  it("lays out 20 cards in ≤ 0.3 ms", () => {
    const lanes = Array.from({ length: 5 }, (_, index) => box(560 + index * 30, 100, 100 + 4 * CARD + 3 * COLUMN.gap));
    const out: number[] = [];
    const heights: number[] = [];
    const start = performance.now();
    for (let frame = 0; frame < 200; frame += 1) {
      for (let lane = 0; lane < 5; lane += 1) columnHeights([0.4, 1.4, 2.4, 3.4], [7.5, 7.5, 7.5, 7.5], heights);
      spreadLanes(lanes, 8, 1272, out);
    }
    const perFrame = (performance.now() - start) / 200;
    console.log("td lanes: " + perFrame.toFixed(4) + " ms a frame for 20 cards");
    expect(perFrame).toBeLessThanOrEqual(0.3);
  });
});

describe("columns and the HUD's side panels (review R2)", () => {
  // 1280 × 720: the chip and the team bar on the left, the dock on the right, the word strip across the middle.
  const panels = [{ left: 12, top: 12, right: 299, bottom: 175 }, { left: 12, top: 598, right: 299, bottom: 708 }, { left: 984, top: 488, right: 1271, bottom: 656 }, { left: 460, top: 668, right: 820, bottom: 712 }];
  const row = (xs: number[], half = 75, top = 520): LaneBox[] => xs.map((x) => ({ x, top, bottom: top + 60, half }));

  it("a lane gets the room between the side panels at its height; the strip across the middle is no side panel", () => {
    expect(besidePanels({ x: 640, top: 520, bottom: 580, half: 70 }, panels, 640)).toMatchObject({ lo: -Infinity, hi: 978 });
    expect(besidePanels({ x: 400, top: 100, bottom: 160, half: 70 }, panels, 640)).toMatchObject({ lo: 305, hi: Infinity });
    expect(besidePanels({ x: 640, top: 640, bottom: 700, half: 70 }, panels, 640)).toMatchObject({ lo: 305, hi: 978 });
  });

  it("four bubbles by the east trees part without covering the dock (the 240 px push alone put one over it)", () => {
    const lanes = row([560, 700, 760, 790]);
    const free = spreadLanes(lanes, 8, 1272, []);
    expect(Math.max(...lanes.map((lane, k) => lane.x + free[k]! + lane.half))).toBeGreaterThan(984);
    const beside = lanes.map((lane) => besidePanels(lane, panels, 640));
    const kept = spreadLanes(beside, 8, 1272, []);
    expect(Math.max(...lanes.map((lane, k) => lane.x + kept[k]! + lane.half))).toBeLessThanOrEqual(978 + 0.01);
    expect(lanesTouch(lanes, kept)).toBe(false);
    expect(lanesTouch(lanes, lanes.map(() => 0))).toBe(true);
  });

  it("with no room between the panels the lanes would touch: that is how the cards know to stand over the HUD instead", () => {
    const lanes = row([560, 610, 660, 710], 85, 600); // by the team bar and the dock: 4 × 170 px and the gaps, more than the 673 px between
    const kept = spreadLanes(lanes.map((lane) => besidePanels(lane, panels, 640)), 8, 1272, []);
    expect(lanesTouch(lanes, kept)).toBe(true);
    expect(lanesTouch(lanes, spreadLanes(lanes, 8, 1272, []))).toBe(false);
  });
});
