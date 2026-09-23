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

  it("migrates the legacy v1 recorder without inventing human attestations", () => {
    const state = sanitizeM22ManualGateState({
      version: 1,
      browserDevice: "Chrome · Mac",
      updatedAt: "2026-09-23T03:00:00.000Z",
      rows: {
        "difficulty-relax": {
          status: "pass",
          browserDevice: "Chrome · Mac",
          notes: "Readable",
        },
        "difficulty-balanced": {
          status: "broken",
          browserDevice: 123,
          notes: 123,
        },
        "unknown-row": {
          status: "pass",
          notes: "ignore",
        },
      },
    });

    expect(state.version).toBe(2);
    expect(state.browserDevice).toBe("Chrome · Mac");
    expect(state.attestations).toEqual({
      realAudioOutput: false,
      realHighUltraBrowser: false,
      humanLowMidHigh: false,
    });
    expect(state.rows["difficulty-relax"]).toEqual({
      status: "pass",
      browserDevice: "Chrome · Mac",
      notes: "Readable",
    });
    expect(state.rows["difficulty-balanced"]).toEqual({
      status: "pending",
      browserDevice: "",
      notes: "",
    });
    expect(state.rows["unknown-row"]).toBeUndefined();
  });

  it("sanitizes v2 attestations and row values", () => {
    const state = sanitizeM22ManualGateState({
      version: 2,
      browserDevice: "Firefox · Linux",
      attestations: {
        realAudioOutput: true,
        realHighUltraBrowser: "yes",
        humanLowMidHigh: true,
      },
      rows: {
        "visual-high": {
          status: "pass",
          browserDevice: "",
          notes: "No obscured text",
        },
      },
    });

    expect(state.attestations).toEqual({
      realAudioOutput: true,
      realHighUltraBrowser: false,
      humanLowMidHigh: true,
    });
    expect(state.rows["visual-high"]).toEqual({
      status: "pass",
      browserDevice: "",
      notes: "No obscured text",
    });
  });

  it("rejects a future incompatible recorder schema", () => {
    const state = sanitizeM22ManualGateState({
      version: 3,
      browserDevice: "should not carry",
      attestations: {
        realAudioOutput: true,
        realHighUltraBrowser: true,
        humanLowMidHigh: true,
      },
      rows: {
        "difficulty-relax": {
          status: "pass",
          browserDevice: "should not carry",
          notes: "should not carry",
        },
      },
    });

    expect(state).toEqual(createM22ManualGateState());
  });

  it("requires rows, device evidence and all human attestations before completion", () => {
    const state = createM22ManualGateState();
    const initial = m22ManualGateSummary(state);

    expect(initial).toEqual({
      total: 43,
      pass: 0,
      fail: 0,
      pending: 43,
      attestationsComplete: false,
      complete: false,
    });

    state.browserDevice = "Chrome · Mac";
    for (const row of M22_MANUAL_GATE_ROWS) {
      state.rows[row.id] = {
        status: "pass",
        browserDevice: "",
        notes: "",
      };
    }

    expect(m22ManualGateSummary(state)).toEqual({
      total: 43,
      pass: 43,
      fail: 0,
      pending: 0,
      attestationsComplete: false,
      complete: false,
    });

    state.attestations = {
      realAudioOutput: true,
      realHighUltraBrowser: true,
      humanLowMidHigh: true,
    };

    expect(m22ManualGateSummary(state)).toEqual({
      total: 43,
      pass: 43,
      fail: 0,
      pending: 0,
      attestationsComplete: true,
      complete: true,
    });

    state.rows["audio-world-boss"] = {
      status: "fail",
      browserDevice: "",
      notes: "Crossfade clips",
    };
    expect(m22ManualGateSummary(state).complete).toBe(false);
  });

  it("exports observations and explicit human attestations in markdown", () => {
    const state = createM22ManualGateState();
    state.browserDevice = "Chrome 151 | macOS";
    state.updatedAt = "2026-09-23T03:00:00.000Z";
    state.attestations = {
      realAudioOutput: true,
      realHighUltraBrowser: true,
      humanLowMidHigh: false,
    };
    state.rows["visual-ultra"] = {
      status: "fail",
      browserDevice: "Safari · MacBook",
      notes: "stutter | visible on boss phase",
    };

    const report = m22ManualGateMarkdown(state);

    expect(report).toContain(
      "Browser/device: Chrome 151 | macOS",
    );
    expect(report).toContain("Real audio output heard: YES");
    expect(report).toContain(
      "High + Ultra observed in a real browser: YES",
    );
    expect(report).toContain(
      "Low + mid + high WPM human-paced runs performed: NO",
    );
    expect(report).toContain(
      "| Ultra quality | high-DPI display | acceptable frame pacing; no runaway particles | Safari · MacBook | FAIL | stutter \\| visible on boss phase |",
    );
    expect(report).toContain("M22 manual gate result: INCOMPLETE.");
  });
});
