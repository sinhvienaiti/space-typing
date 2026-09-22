import { describe, expect, it } from "vitest";
import {
  FrameProfiler,
  qualityProfile,
  resolveRenderDpr,
} from "../src/performance/quality";

describe("performance quality profiles", () => {
  it("scales rendering budgets monotonically without gameplay values", () => {
    const low = qualityProfile("low");
    const medium = qualityProfile("medium");
    const high = qualityProfile("high");
    const ultra = qualityProfile("ultra");

    expect(low.maxParticles).toBeLessThan(medium.maxParticles);
    expect(medium.maxParticles).toBeLessThan(high.maxParticles);
    expect(high.maxParticles).toBeLessThan(ultra.maxParticles);
    expect(low.dprCap).toBeLessThan(high.dprCap);
    expect(ultra.glowScale).toBeGreaterThan(high.glowScale);
  });

  it("caps large high-DPI canvases by pixel budget", () => {
    const high = qualityProfile("high");
    const ultra = qualityProfile("ultra");
    const highDpr = resolveRenderDpr(high, 2.5, 2560, 1440);
    const ultraDpr = resolveRenderDpr(ultra, 2.5, 2560, 1440);

    expect(highDpr).toBeLessThan(high.dprCap);
    expect(ultraDpr).toBeLessThan(ultra.dprCap);
    expect(2560 * 1440 * highDpr * highDpr).toBeLessThanOrEqual(
      high.maxCanvasPixels + 1,
    );
    expect(ultraDpr).toBeGreaterThan(highDpr);
  });

  it("reports rolling frame performance and p95", () => {
    const profiler = new FrameProfiler(4);
    profiler.pushFrame(0.016);
    profiler.pushFrame(0.017);
    profiler.pushFrame(0.025);
    profiler.pushFrame(0.016);

    const report = profiler.report();
    expect(report.samples).toBe(4);
    expect(report.averageFps).toBeGreaterThan(40);
    expect(report.p95FrameMs).toBe(25);
    expect(report.slowFrameRatio).toBe(0.25);
  });

  it("keeps only the configured rolling sample window", () => {
    const profiler = new FrameProfiler(2);
    profiler.pushFrame(0.1);
    profiler.pushFrame(0.016);
    profiler.pushFrame(0.016);

    const report = profiler.report();
    expect(report.samples).toBe(2);
    expect(report.slowFrameRatio).toBe(0);
  });
});
