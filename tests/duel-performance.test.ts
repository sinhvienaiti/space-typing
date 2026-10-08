import { describe, expect, it } from "vitest";
import {
  DUEL_PERFORMANCE_BUDGETS,
  DUEL_PERFORMANCE_MIN_SAMPLES,
  DuelPerformanceMonitor,
  assessDuelPerformance,
} from "../src/duel/performance";

function healthyMonitor(): DuelPerformanceMonitor {
  const monitor = new DuelPerformanceMonitor();
  monitor.setContext("ultra", "cataclysm");
  for (
    let index = 0;
    index < DUEL_PERFORMANCE_MIN_SAMPLES;
    index += 1
  ) {
    monitor.pushFrameMs(16);
    monitor.pushUiUpdateMs(4);
  }
  for (let index = 0; index < 20; index += 1) {
    monitor.pushInputPaintMs(28);
  }
  monitor.setLiveCounts(
    DUEL_PERFORMANCE_BUDGETS.maxProjectiles,
    DUEL_PERFORMANCE_BUDGETS.maxFxNodes,
  );
  return monitor;
}

describe("Duel performance acceptance monitor", () => {
  it("passes a fully sampled High/Ultra scene inside explicit budgets", () => {
    const diagnostics = healthyMonitor().diagnostics();
    const assessment =
      assessDuelPerformance(diagnostics);

    expect(diagnostics.quality).toBe("ultra");
    expect(diagnostics.phase).toBe("cataclysm");
    expect(diagnostics.frame.samples).toBe(
      DUEL_PERFORMANCE_MIN_SAMPLES,
    );
    expect(diagnostics.frame.p95Ms).toBe(16);
    expect(diagnostics.frame.p99Ms).toBe(16);
    expect(assessment).toEqual({
      ready: true,
      pass: true,
      reasons: [],
    });
  });

  it("refuses to call the gate ready before enough real frame samples", () => {
    const monitor = new DuelPerformanceMonitor();
    for (
      let index = 0;
      index < DUEL_PERFORMANCE_MIN_SAMPLES - 1;
      index += 1
    ) {
      monitor.pushFrameMs(16);
    }

    const assessment = assessDuelPerformance(
      monitor.diagnostics(),
    );
    expect(assessment.ready).toBe(false);
    expect(assessment.pass).toBe(false);
    expect(assessment.reasons[0]).toContain(
      "frame samples",
    );
  });

  it("catches p99 spikes even when p95 remains healthy", () => {
    const monitor = new DuelPerformanceMonitor();
    for (let index = 0; index < 118; index += 1) {
      monitor.pushFrameMs(16);
    }
    monitor.pushFrameMs(34);
    monitor.pushFrameMs(40);

    const diagnostics = monitor.diagnostics();
    const assessment =
      assessDuelPerformance(diagnostics);

    expect(diagnostics.frame.p95Ms).toBe(16);
    expect(diagnostics.frame.p99Ms).toBe(34);
    expect(assessment.ready).toBe(true);
    expect(assessment.pass).toBe(false);
    expect(assessment.reasons).toContain(
      "frame p99 exceeds budget",
    );
  });

  it("tracks bounded live presentation counts without deleting approved FX", () => {
    const monitor = healthyMonitor();
    monitor.setLiveCounts(
      DUEL_PERFORMANCE_BUDGETS.maxProjectiles + 1,
      DUEL_PERFORMANCE_BUDGETS.maxFxNodes + 1,
    );

    const diagnostics = monitor.diagnostics();
    const assessment =
      assessDuelPerformance(diagnostics);

    expect(diagnostics.live.peakProjectiles).toBe(
      DUEL_PERFORMANCE_BUDGETS.maxProjectiles + 1,
    );
    expect(diagnostics.live.peakFxNodes).toBe(
      DUEL_PERFORMANCE_BUDGETS.maxFxNodes + 1,
    );
    expect(assessment.reasons).toContain(
      "projectile cap exceeded",
    );
    expect(assessment.reasons).toContain(
      "FX node cap exceeded",
    );
  });

  it("resets samples and peak counters between QA captures", () => {
    const monitor = healthyMonitor();
    monitor.reset();
    const diagnostics = monitor.diagnostics();

    expect(diagnostics.frame.samples).toBe(0);
    expect(diagnostics.uiUpdate.samples).toBe(0);
    expect(diagnostics.inputPaint.samples).toBe(0);
    expect(diagnostics.live.peakProjectiles).toBe(0);
    expect(diagnostics.live.peakFxNodes).toBe(0);
  });
});
