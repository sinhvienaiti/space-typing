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
  },
  high: {
    dprCap: 2,
    particleScale: 1,
    maxParticles: 360,
    minStars: 80,
    maxStars: 220,
    starAreaDivisor: 9000,
    glowScale: 1,
    gridStep: 48,
  },
  ultra: {
    dprCap: 2.5,
    particleScale: 1.35,
    maxParticles: 520,
    minStars: 110,
    maxStars: 300,
    starAreaDivisor: 7000,
    glowScale: 1.2,
    gridStep: 42,
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

export class FrameProfiler {
  private readonly samples: number[] = [];

  constructor(private readonly capacity = 180) {}

  pushFrame(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.samples.push(Math.min(0.25, seconds));
    if (this.samples.length > this.capacity) {
      this.samples.splice(0, this.samples.length - this.capacity);
    }
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
