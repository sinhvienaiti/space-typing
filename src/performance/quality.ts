import type { VisualQuality } from "../types";

export type QualityProfile = {
  dprCap: number;
  particleScale: number;
  maxParticles: number;
  minStars: number;
  maxStars: number;
  starAreaDivisor: number;
  glowScale: number;
  gridStep: number;
  maxCanvasPixels: number;
};

const PROFILES: Record<VisualQuality, QualityProfile> = {
  low: {
    dprCap: 1,
    particleScale: 0.35,
    maxParticles: 110,
    minStars: 36,
    maxStars: 90,
    starAreaDivisor: 18000,
    glowScale: 0.35,
    gridStep: 72,
    maxCanvasPixels: 3_500_000,
  },
  medium: {
    dprCap: 1.5,
    particleScale: 0.65,
    maxParticles: 220,
    minStars: 56,
    maxStars: 140,
    starAreaDivisor: 13000,
    glowScale: 0.65,
    gridStep: 60,
    maxCanvasPixels: 5_000_000,
  },
  // Canvas blur/shadow work scales with physical pixel count, not gameplay
  // complexity. Avoid DPR 2+ on a fullscreen canvas with many glossy sprites.
  high: {
    dprCap: 1.65,
    particleScale: 0.87,
    maxParticles: 290,
    minStars: 72,
    maxStars: 180,
    starAreaDivisor: 10500,
    glowScale: 0.88,
    gridStep: 52,
    maxCanvasPixels: 4_600_000,
  },
  ultra: {
    dprCap: 2,
    particleScale: 1.1,
    maxParticles: 390,
    minStars: 95,
    maxStars: 245,
    starAreaDivisor: 8200,
    glowScale: 1.08,
    gridStep: 46,
    maxCanvasPixels: 6_800_000,
  },
};

export type PerformanceReport = {
  samples: number;
  averageFps: number;
  averageFrameMs: number;
  p95FrameMs: number;
  slowFrameRatio: number;
};

export function qualityProfile(
  quality: VisualQuality,
): Readonly<QualityProfile> {
  return PROFILES[quality];
}

export function resolveRenderDpr(
  profile: Readonly<QualityProfile>,
  devicePixelRatio: number,
  width: number,
  height: number,
): number {
  const safeDeviceDpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
      ? devicePixelRatio
      : 1;
  const safeWidth = Math.max(1, Number.isFinite(width) ? width : 1);
  const safeHeight = Math.max(1, Number.isFinite(height) ? height : 1);
  const pixelBudgetDpr = Math.sqrt(
    profile.maxCanvasPixels / (safeWidth * safeHeight),
  );

  return Math.max(
    0.5,
    Math.min(profile.dprCap, safeDeviceDpr, pixelBudgetDpr),
  );
}

export class FrameProfiler {
  private readonly samples: number[] = [];
  private cursor = 0;
  private readonly capacity: number;

  constructor(capacity = 180) {
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  pushFrame(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const sample = Math.min(0.25, seconds);
    if (this.samples.length < this.capacity) {
      this.samples.push(sample);
      return;
    }

    this.samples[this.cursor] = sample;
    this.cursor = (this.cursor + 1) % this.capacity;
  }

  report(): PerformanceReport {
    if (this.samples.length === 0) {
      return {
        samples: 0,
        averageFps: 0,
        averageFrameMs: 0,
        p95FrameMs: 0,
        slowFrameRatio: 0,
      };
    }

    const milliseconds = this.samples.map((value) => value * 1000);
    const averageFrameMs =
      milliseconds.reduce((sum, value) => sum + value, 0) /
      milliseconds.length;
    const sorted = [...milliseconds].sort((a, b) => a - b);
    const p95Index = Math.min(
      sorted.length - 1,
      Math.ceil(sorted.length * 0.95) - 1,
    );
    const slowFrames = milliseconds.filter((value) => value > 20).length;

    return {
      samples: milliseconds.length,
      averageFps: averageFrameMs > 0 ? 1000 / averageFrameMs : 0,
      averageFrameMs,
      p95FrameMs: sorted[p95Index] ?? 0,
      slowFrameRatio: slowFrames / milliseconds.length,
    };
  }
}
