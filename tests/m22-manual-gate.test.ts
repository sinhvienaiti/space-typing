import { describe, expect, it } from "vitest";
import {
  M22_MANUAL_GATE_ROWS,
  createM22ManualGateState,
  m22ManualGateMarkdown,
  m22ManualGateSummary,
  sanitizeM22ManualGateState,
} from "../src/test-lab/m22-manual-gate";

describe("M22 manual gate recorder", () => {
  it("mirrors every required manual matrix row with stable unique ids", () => {
    expect(M22_MANUAL_GATE_ROWS).toHaveLength(43);
    expect(new Set(M22_MANUAL_GATE_ROWS.map((row) => row.id)).size).toBe(
      M22_MANUAL_GATE_ROWS.length,
    );
    expect(
      new Set(M22_MANUAL_GATE_ROWS.map((row) => row.section)),
    ).toEqual(
      new Set([
        "Difficulty and typing pace",
        "World / enemy composition",
        "Bosses / special encounters",
        "Death / recovery",
        "Shops / route",
        "Visual quality / performance",
        "Audio",
      ]),
    );
  });

  it("sanitizes stored QA data without accepting unknown status or rows", () => {
    const state = sanitizeM22ManualGateState({
      version: 99,
      browserDevice: "Chrome · Mac",
      updatedAt: "2026-09-23T03:00:00.000Z",
      rows: {
        "difficulty-relax": {
          status: "pass",
          notes: "Readable",
        },
        "difficulty-balanced": {
          status: "broken",
          notes: 123,
        },
        "unknown-row": {
          status: "pass",
          notes: "ignore",
        },
      },
    });

    expect(state.version).toBe(1);
    expect(state.browserDevice).toBe("Chrome · Mac");
    expect(state.rows["difficulty-relax"]).toEqual({
      status: "pass",
      notes: "Readable",
    });
    expect(state.rows["difficulty-balanced"]).toEqual({
      status: "pending",
      notes: "",
    });
    expect(state.rows["unknown-row"]).toBeUndefined();
  });

  it("requires every row to pass before the manual gate is complete", () => {
    const state = createM22ManualGateState();
    const initial = m22ManualGateSummary(state);

    expect(initial).toEqual({
      total: 43,
      pass: 0,
      fail: 0,
      pending: 43,
      complete: false,
    });

    for (const row of M22_MANUAL_GATE_ROWS) {
      state.rows[row.id] = {
        status: "pass",
        notes: "",
      };
    }

    expect(m22ManualGateSummary(state)).toEqual({
      total: 43,
      pass: 43,
      fail: 0,
      pending: 0,
      complete: true,
    });

    state.rows["audio-world-boss"] = {
      status: "fail",
      notes: "Crossfade clips",
    };
    expect(m22ManualGateSummary(state).complete).toBe(false);
  });

  it("exports a paste-ready markdown report with observations", () => {
    const state = createM22ManualGateState();
    state.browserDevice = "Chrome 151 | macOS";
    state.updatedAt = "2026-09-23T03:00:00.000Z";
    state.rows["visual-ultra"] = {
      status: "fail",
      notes: "stutter | visible on boss phase",
    };

    const report = m22ManualGateMarkdown(state);

    expect(report).toContain(
      "Browser/device: Chrome 151 | macOS",
    );
    expect(report).toContain(
      "| Ultra quality | high-DPI display | acceptable frame pacing; no runaway particles | FAIL | stutter \\| visible on boss phase |",
    );
    expect(report).toContain("M22 manual gate result: INCOMPLETE.");
  });
});
