import type { VisualQuality } from "../types";

const SAMPLE_COUNT = 120;
const MIN_SCALE = 0.72;

/**
 * Adaptive *render-only* resolution. Preserve Canvas drawing complexity and
 * gameplay simulation timing; react to sustained slow frames instead of
 * permanently degrading High/Ultra on every machine.
 */
export class AdaptiveRenderBudget {
  private readonly frameMs: number[] = [];
  private readonly drawMs: number[] = [];
  private timeToReview = 3.5;
  private stableSeconds = 0;
  private value = 1;

  get scale(): number { return this.value; }

  reset(): void {
    this.frameMs.length = 0;
    this.drawMs.length = 0;
    this.timeToReview = 3.5;
    this.stableSeconds = 0;
    this.value = 1;
  }

  observe(quality: VisualQuality, frameSeconds: number, drawMilliseconds: number): boolean {
    if (quality !== "high" && quality !== "ultra") return false;
    if (!Number.isFinite(frameSeconds) || frameSeconds <= 0 || frameSeconds > 0.15 ||
        !Number.isFinite(drawMilliseconds) || drawMilliseconds < 0) {
      return false; // Background tab, first frame, debugger pause, etc.
    }
    this.frameMs.push(frameSeconds * 1000);
    this.drawMs.push(drawMilliseconds);
    if (this.frameMs.length > SAMPLE_COUNT) this.frameMs.shift();
    if (this.drawMs.length > SAMPLE_COUNT) this.drawMs.shift();
    this.timeToReview -= Math.min(frameSeconds, 0.05);
    if (this.frameMs.length < 90 || this.timeToReview > 0) return false;
    this.timeToReview = 3.5;

    const p95 = (samples: readonly number[]): number => {
      const ordered = [...samples].sort((a, b) => a - b);
      return ordered[Math.ceil(ordered.length * 0.95) - 1] ?? 0;
    };
    const frameP95 = p95(this.frameMs);
    const drawP95 = p95(this.drawMs);

    // High-DPI Canvas and expensive per-enemy shadows can saturate either the
    // main thread (draw P95) or the compositor (frame P95).
    if (frameP95 > 24 || drawP95 > 11.5) {
      this.stableSeconds = 0;
      const next = Math.max(MIN_SCALE, Math.round((this.value - 0.12) * 100) / 100);
      if (next === this.value) return false;
      this.value = next;
      return true;
    }
    if (frameP95 < 18.5 && drawP95 < 8) {
      this.stableSeconds += 3.5;
      if (this.stableSeconds >= 10.5 && this.value < 1) {
        this.stableSeconds = 0;
        this.value = Math.min(1, Math.round((this.value + 0.08) * 100) / 100);
        return true;
      }
    } else {
      this.stableSeconds = 0;
    }
    return false;
  }
}
