import { describe, expect, it } from "vitest";
import {
  BATCH_F_MIN_PERFORMANCE_SAMPLES,
  batchFPerformanceMarkdown,
  compareBatchFPerformance,
  createBatchFPerformanceState,
  sanitizeBatchFPerformanceCapture,
  sanitizeBatchFPerformanceState,
  type BatchFPerformanceCapture,
} from "../src/test-lab/batch-f-performance-gate";

function capture(
  overrides: Partial<BatchFPerformanceCapture> = {},
): BatchFPerformanceCapture {
  return {
    version: 1,
    capturedAt: "2026-09-24T03:00:00.000Z",
    browserDevice: "Chrome 151 · macOS",
    stage: 51,
    quality: "high",
    viewport: "1920x1080",
    deviceDpr: 2,
    performance: {
      samples: BATCH_F_MIN_PERFORMANCE_SAMPLES,
      averageFps: 60,
      averageFrameMs: 16.67,
      p95FrameMs: 18,
      slowFrameRatio: 0.02,
    },
    render: {
      renderP95Ms: 8,
      adaptiveScale: 1,
      effectiveDpr: 1.65,
      canvasPixels: 4_200_000,
      bodySprites: 24,
    },
    ...overrides,
  };
}

describe("Batch F browser performance gate", () => {
  it("passes comparable captures inside the 1ms p95 regression gate", () => {
    const baseline = capture();
    const candidate = capture({
      capturedAt: "2026-09-24T03:05:00.000Z",
      performance: {
        ...baseline.performance,
        averageFps: 59,
        p95FrameMs: 18.8,
        slowFrameRatio: 0.025,
      },
      render: {
        ...baseline.render,
        renderP95Ms: 8.7,
      },
    });

    expect(compareBatchFPerformance(baseline, candidate)).toMatchObject({
      comparable: true,
      pass: true,
      frameP95DeltaMs: 0.8,
      renderP95DeltaMs: 0.7,
      averageFpsDelta: -1,
      slowFrameRatioDelta: 0.005,
    });
  });

  it("fails a real p95 regression without hiding it behind average FPS", () => {
    const baseline = capture();
    const candidate = capture({
      performance: {
        ...baseline.performance,
        averageFps: 61,
        p95FrameMs: 19.2,
      },
    });

    const comparison = compareBatchFPerformance(baseline, candidate);
    expect(comparison.comparable).toBe(true);
    expect(comparison.pass).toBe(false);
    expect(comparison.frameP95DeltaMs).toBeCloseTo(1.2);
  });

  it("refuses comparisons across browser, stage, quality, viewport or DPR context", () => {
    const baseline = capture();
    const candidate = capture({
      browserDevice: "Safari · macOS",
      stage: 52,
      quality: "ultra",
      viewport: "1728x1117",
      deviceDpr: 1.5,
    });

    const comparison = compareBatchFPerformance(baseline, candidate);
    expect(comparison.comparable).toBe(false);
    expect(comparison.pass).toBe(false);
    expect(comparison.reasons).toEqual([
      "browser/device mismatch",
      "stage mismatch",
      "visual quality mismatch",
      "viewport mismatch",
      "device DPR mismatch",
    ]);
  });

  it("requires enough real frame samples before calling a comparison valid", () => {
    const baseline = capture({
      performance: {
        ...capture().performance,
        samples: BATCH_F_MIN_PERFORMANCE_SAMPLES - 1,
      },
    });
    const comparison = compareBatchFPerformance(baseline, capture());

    expect(comparison.comparable).toBe(false);
    expect(comparison.pass).toBe(false);
    expect(comparison.reasons[0]).toContain("frame samples");
  });

  it("sanitizes QA-only stored captures without touching PlayerSave schemas", () => {
    expect(sanitizeBatchFPerformanceCapture({
      version: 2,
      quality: "high",
    })).toBeNull();

    const sanitized = sanitizeBatchFPerformanceState({
      version: 1,
      baseline: {
        ...capture(),
        stage: 5000,
        deviceDpr: 99,
        performance: {
          samples: 12.9,
          averageFps: -5,
          averageFrameMs: Number.NaN,
          p95FrameMs: -1,
          slowFrameRatio: 4,
        },
      },
      candidate: null,
    });

    expect(sanitized.baseline?.stage).toBe(1000);
    expect(sanitized.baseline?.deviceDpr).toBe(8);
    expect(sanitized.baseline?.performance).toEqual({
      samples: 12,
      averageFps: 0,
      averageFrameMs: 0,
      p95FrameMs: 0,
      slowFrameRatio: 1,
    });
    expect(sanitized.candidate).toBeNull();
  });

  it("exports explicit baseline/candidate measurements and incomplete state", () => {
    const empty = batchFPerformanceMarkdown(createBatchFPerformanceState());
    expect(empty).toContain("INCOMPLETE");

    const baseline = capture();
    const candidate = capture({
      performance: {
        ...baseline.performance,
        p95FrameMs: 18.5,
      },
      render: {
        ...baseline.render,
        renderP95Ms: 8.4,
      },
    });
    const report = batchFPerformanceMarkdown({
      version: 1,
      baseline,
      candidate,
    });

    expect(report).toContain("Result: PASS");
    expect(report).toContain("Frame p95 ms");
    expect(report).toContain("Canvas draw p95 ms");
    expect(report).toContain("Effective DPR");
    expect(report).toContain("Body sprite cache");
  });
});
