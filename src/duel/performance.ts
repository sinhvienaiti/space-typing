import type { VisualQuality } from "../types";
import type { DuelMatchPhase } from "./model";

export const DUEL_PERFORMANCE_MIN_SAMPLES = 120;
export const DUEL_PERFORMANCE_BUDGETS = Object.freeze({
  frameP95Ms: 20,
  frameP99Ms: 28,
  slowFrameRatio: 0.05,
  uiUpdateP95Ms: 8,
  inputPaintP95Ms: 50,
  maxProjectiles: 18,
  maxFxNodes: 24,
  allocationSpikeBytes: 4 * 1024 * 1024,
});

export type DuelPerformanceDiagnostics = {
  version: 1;
  quality: VisualQuality;
  phase: DuelMatchPhase | null;
  frame: {
    samples: number;
    averageMs: number;
    p95Ms: number;
    p99Ms: number;
    slowFrameRatio: number;
    maxMs: number;
  };
  uiUpdate: {
    samples: number;
    averageMs: number;
    p95Ms: number;
    p99Ms: number;
    maxMs: number;
  };
  inputPaint: {
    samples: number;
    averageMs: number;
    p95Ms: number;
    p99Ms: number;
    maxMs: number;
  };
  live: {
    projectiles: number;
    fxNodes: number;
    peakProjectiles: number;
    peakFxNodes: number;
  };
  browser: {
    deviceDpr: number;
    viewport: string;
    heapSupported: boolean;
    usedHeapBytes: number | null;
    peakUsedHeapBytes: number | null;
    allocationSpikeCount: number;
    heapDropCount: number;
  };
};

export type DuelPerformanceAssessment = {
  ready: boolean;
  pass: boolean;
  reasons: readonly string[];
};

type MetricSummary = {
  samples: number;
  averageMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
};

type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize?: number;
  };
};

function safeNow(): number {
  if (typeof performance === "undefined") return Date.now();
  return performance.now();
}

function percentile(
  sorted: readonly number[],
  ratio: number,
): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index] ?? 0;
}

class RingMetric {
  private readonly values: number[] = [];
  private cursor = 0;

  constructor(private readonly capacity: number) {}

  push(value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    const safe = Math.min(1000, value);
    if (this.values.length < this.capacity) {
      this.values.push(safe);
      return;
    }
    this.values[this.cursor] = safe;
    this.cursor = (this.cursor + 1) % this.capacity;
  }

  reset(): void {
    this.values.length = 0;
    this.cursor = 0;
  }

  summary(): MetricSummary {
    if (this.values.length === 0) {
      return {
        samples: 0,
        averageMs: 0,
        p95Ms: 0,
        p99Ms: 0,
        maxMs: 0,
      };
    }
    const values = [...this.values];
    const sorted = [...values].sort((left, right) => left - right);
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      samples: values.length,
      averageMs: total / values.length,
      p95Ms: percentile(sorted, 0.95),
      p99Ms: percentile(sorted, 0.99),
      maxMs: sorted[sorted.length - 1] ?? 0,
    };
  }

  countAbove(thresholdMs: number): number {
    return this.values.filter((value) => value > thresholdMs).length;
  }
}

function heapBytes(): number | null {
  if (typeof performance === "undefined") return null;
  const memory = (performance as PerformanceWithMemory).memory;
  const value = memory?.usedJSHeapSize;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : null;
}

export class DuelPerformanceMonitor {
  private readonly frame = new RingMetric(600);
  private readonly uiUpdate = new RingMetric(300);
  private readonly inputPaint = new RingMetric(120);
  private quality: VisualQuality = "medium";
  private phase: DuelMatchPhase | null = null;
  private projectiles = 0;
  private fxNodes = 0;
  private peakProjectiles = 0;
  private peakFxNodes = 0;
  private lastHeapBytes: number | null = null;
  private peakHeapBytes: number | null = null;
  private allocationSpikeCount = 0;
  private heapDropCount = 0;
  private frameCounter = 0;

  reset(): void {
    this.frame.reset();
    this.uiUpdate.reset();
    this.inputPaint.reset();
    this.projectiles = 0;
    this.fxNodes = 0;
    this.peakProjectiles = 0;
    this.peakFxNodes = 0;
    this.lastHeapBytes = heapBytes();
    this.peakHeapBytes = this.lastHeapBytes;
    this.allocationSpikeCount = 0;
    this.heapDropCount = 0;
    this.frameCounter = 0;
  }

  setContext(
    quality: VisualQuality,
    phase: DuelMatchPhase | null,
  ): void {
    this.quality = quality;
    this.phase = phase;
  }

  pushFrameMs(value: number): void {
    this.frame.push(value);
    this.frameCounter += 1;
    if (this.frameCounter % 30 === 0) {
      this.sampleHeap();
    }
  }

  pushUiUpdateMs(value: number): void {
    this.uiUpdate.push(value);
  }

  pushInputPaintMs(value: number): void {
    this.inputPaint.push(value);
  }

  setLiveCounts(
    projectiles: number,
    fxNodes: number,
  ): void {
    this.projectiles = Math.max(0, Math.floor(projectiles));
    this.fxNodes = Math.max(0, Math.floor(fxNodes));
    this.peakProjectiles = Math.max(
      this.peakProjectiles,
      this.projectiles,
    );
    this.peakFxNodes = Math.max(
      this.peakFxNodes,
      this.fxNodes,
    );
  }

  measureUi<T>(callback: () => T): T {
    const start = safeNow();
    try {
      return callback();
    } finally {
      this.pushUiUpdateMs(safeNow() - start);
    }
  }

  diagnostics(): DuelPerformanceDiagnostics {
    const frame = this.frame.summary();
    const slowFrames = this.frame.countAbove(20);
    const uiUpdate = this.uiUpdate.summary();
    const inputPaint = this.inputPaint.summary();
    const currentHeap = heapBytes();
    if (
      currentHeap !== null &&
      (this.peakHeapBytes === null ||
        currentHeap > this.peakHeapBytes)
    ) {
      this.peakHeapBytes = currentHeap;
    }

    return {
      version: 1,
      quality: this.quality,
      phase: this.phase,
      frame: {
        ...frame,
        slowFrameRatio:
          frame.samples > 0
            ? slowFrames / frame.samples
            : 0,
      },
      uiUpdate,
      inputPaint,
      live: {
        projectiles: this.projectiles,
        fxNodes: this.fxNodes,
        peakProjectiles: this.peakProjectiles,
        peakFxNodes: this.peakFxNodes,
      },
      browser: {
        deviceDpr:
          typeof window === "undefined"
            ? 1
            : Math.max(
                0.5,
                Number.isFinite(window.devicePixelRatio)
                  ? window.devicePixelRatio
                  : 1,
              ),
        viewport:
          typeof window === "undefined"
            ? "server"
            : String(window.innerWidth) +
              "x" +
              String(window.innerHeight),
        heapSupported: currentHeap !== null,
        usedHeapBytes: currentHeap,
        peakUsedHeapBytes: this.peakHeapBytes,
        allocationSpikeCount: this.allocationSpikeCount,
        heapDropCount: this.heapDropCount,
      },
    };
  }

  private sampleHeap(): void {
    const current = heapBytes();
    if (current === null) return;

    if (
      this.peakHeapBytes === null ||
      current > this.peakHeapBytes
    ) {
      this.peakHeapBytes = current;
    }
    if (this.lastHeapBytes !== null) {
      const delta = current - this.lastHeapBytes;
      if (
        delta >=
        DUEL_PERFORMANCE_BUDGETS.allocationSpikeBytes
      ) {
        this.allocationSpikeCount += 1;
      } else if (
        delta <=
        -DUEL_PERFORMANCE_BUDGETS.allocationSpikeBytes
      ) {
        this.heapDropCount += 1;
      }
    }
    this.lastHeapBytes = current;
  }
}

export function assessDuelPerformance(
  diagnostics: DuelPerformanceDiagnostics,
): DuelPerformanceAssessment {
  const reasons: string[] = [];
  if (
    diagnostics.frame.samples <
    DUEL_PERFORMANCE_MIN_SAMPLES
  ) {
    reasons.push(
      "need at least " +
        String(DUEL_PERFORMANCE_MIN_SAMPLES) +
        " frame samples",
    );
  }
  if (
    diagnostics.frame.p95Ms >
    DUEL_PERFORMANCE_BUDGETS.frameP95Ms
  ) {
    reasons.push("frame p95 exceeds budget");
  }
  if (
    diagnostics.frame.p99Ms >
    DUEL_PERFORMANCE_BUDGETS.frameP99Ms
  ) {
    reasons.push("frame p99 exceeds budget");
  }
  if (
    diagnostics.frame.slowFrameRatio >
    DUEL_PERFORMANCE_BUDGETS.slowFrameRatio
  ) {
    reasons.push("slow-frame ratio exceeds budget");
  }
  if (
    diagnostics.uiUpdate.samples > 0 &&
    diagnostics.uiUpdate.p95Ms >
      DUEL_PERFORMANCE_BUDGETS.uiUpdateP95Ms
  ) {
    reasons.push("UI update p95 exceeds budget");
  }
  if (
    diagnostics.inputPaint.samples > 0 &&
    diagnostics.inputPaint.p95Ms >
      DUEL_PERFORMANCE_BUDGETS.inputPaintP95Ms
  ) {
    reasons.push("input-to-paint p95 exceeds budget");
  }
  if (
    diagnostics.live.peakProjectiles >
    DUEL_PERFORMANCE_BUDGETS.maxProjectiles
  ) {
    reasons.push("projectile cap exceeded");
  }
  if (
    diagnostics.live.peakFxNodes >
    DUEL_PERFORMANCE_BUDGETS.maxFxNodes
  ) {
    reasons.push("FX node cap exceeded");
  }

  const ready =
    diagnostics.frame.samples >=
    DUEL_PERFORMANCE_MIN_SAMPLES;

  return {
    ready,
    pass: ready && reasons.length === 0,
    reasons,
  };
}
