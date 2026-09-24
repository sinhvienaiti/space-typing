import type { PerformanceReport } from "../performance/quality";
import type { VisualQuality } from "../types";

export const BATCH_F_MIN_PERFORMANCE_SAMPLES = 120;
export const BATCH_F_P95_REGRESSION_LIMIT_MS = 1;
export const BATCH_F_SLOW_FRAME_RATIO_REGRESSION_LIMIT = 0.02;
export const BATCH_F_PERFORMANCE_STORAGE_KEY =
  "spaceTypingUiUxBatchFPerformanceV1";

export type BatchFRenderDiagnostics = {
  renderP95Ms: number;
  adaptiveScale: number;
  effectiveDpr: number;
  canvasPixels: number;
  bodySprites: number;
};

export type BatchFPerformanceCapture = {
  version: 1;
  capturedAt: string;
  browserDevice: string;
  stage: number;
  quality: VisualQuality;
  viewport: string;
  deviceDpr: number;
  performance: PerformanceReport;
  render: BatchFRenderDiagnostics;
};

export type BatchFPerformanceState = {
  version: 1;
  baseline: BatchFPerformanceCapture | null;
  candidate: BatchFPerformanceCapture | null;
};

export type BatchFPerformanceComparison = {
  comparable: boolean;
  pass: boolean;
  reasons: string[];
  frameP95DeltaMs: number;
  renderP95DeltaMs: number;
  averageFpsDelta: number;
  slowFrameRatioDelta: number;
};

export type BatchFPerformanceMountOptions = {
  capture(): BatchFPerformanceCapture | null;
  showNotice?(message: string): void;
};

export type BatchFPerformanceController = {
  getState(): BatchFPerformanceState;
  destroy(): void;
};

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function safeText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function sanitizeReport(value: unknown): PerformanceReport {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      samples: 0,
      averageFps: 0,
      averageFrameMs: 0,
      p95FrameMs: 0,
      slowFrameRatio: 0,
    };
  }
  const raw = value as Partial<PerformanceReport>;
  return {
    samples: Math.max(0, Math.floor(finite(raw.samples))),
    averageFps: Math.max(0, finite(raw.averageFps)),
    averageFrameMs: Math.max(0, finite(raw.averageFrameMs)),
    p95FrameMs: Math.max(0, finite(raw.p95FrameMs)),
    slowFrameRatio: Math.max(0, Math.min(1, finite(raw.slowFrameRatio))),
  };
}

function sanitizeRender(value: unknown): BatchFRenderDiagnostics {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      renderP95Ms: 0,
      adaptiveScale: 1,
      effectiveDpr: 1,
      canvasPixels: 0,
      bodySprites: 0,
    };
  }
  const raw = value as Partial<BatchFRenderDiagnostics>;
  return {
    renderP95Ms: Math.max(0, finite(raw.renderP95Ms)),
    adaptiveScale: Math.max(0, finite(raw.adaptiveScale, 1)),
    effectiveDpr: Math.max(0, finite(raw.effectiveDpr, 1)),
    canvasPixels: Math.max(0, Math.floor(finite(raw.canvasPixels))),
    bodySprites: Math.max(0, Math.floor(finite(raw.bodySprites))),
  };
}

export function sanitizeBatchFPerformanceCapture(
  value: unknown,
): BatchFPerformanceCapture | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Partial<BatchFPerformanceCapture>;
  if (raw.version !== 1) return null;
  if (
    raw.quality !== "low" &&
    raw.quality !== "medium" &&
    raw.quality !== "high" &&
    raw.quality !== "ultra"
  ) {
    return null;
  }

  return {
    version: 1,
    capturedAt: safeText(raw.capturedAt, 80),
    browserDevice: safeText(raw.browserDevice, 320),
    stage: Math.max(1, Math.min(1000, Math.floor(finite(raw.stage, 1)))),
    quality: raw.quality,
    viewport: safeText(raw.viewport, 80),
    deviceDpr: Math.max(0.5, Math.min(8, finite(raw.deviceDpr, 1))),
    performance: sanitizeReport(raw.performance),
    render: sanitizeRender(raw.render),
  };
}

export function createBatchFPerformanceState(): BatchFPerformanceState {
  return {
    version: 1,
    baseline: null,
    candidate: null,
  };
}

export function sanitizeBatchFPerformanceState(
  value: unknown,
): BatchFPerformanceState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createBatchFPerformanceState();
  }
  const raw = value as Partial<BatchFPerformanceState>;
  if (raw.version !== 1) return createBatchFPerformanceState();
  return {
    version: 1,
    baseline: sanitizeBatchFPerformanceCapture(raw.baseline),
    candidate: sanitizeBatchFPerformanceCapture(raw.candidate),
  };
}

export function compareBatchFPerformance(
  baseline: BatchFPerformanceCapture,
  candidate: BatchFPerformanceCapture,
): BatchFPerformanceComparison {
  const reasons: string[] = [];

  if (baseline.browserDevice !== candidate.browserDevice) {
    reasons.push("browser/device mismatch");
  }
  if (baseline.stage !== candidate.stage) {
    reasons.push("stage mismatch");
  }
  if (baseline.quality !== candidate.quality) {
    reasons.push("visual quality mismatch");
  }
  if (baseline.viewport !== candidate.viewport) {
    reasons.push("viewport mismatch");
  }
  if (Math.abs(baseline.deviceDpr - candidate.deviceDpr) > 0.01) {
    reasons.push("device DPR mismatch");
  }
  if (
    baseline.performance.samples < BATCH_F_MIN_PERFORMANCE_SAMPLES ||
    candidate.performance.samples < BATCH_F_MIN_PERFORMANCE_SAMPLES
  ) {
    reasons.push(
      "need at least " +
        String(BATCH_F_MIN_PERFORMANCE_SAMPLES) +
        " frame samples in both captures",
    );
  }

  const frameP95DeltaMs =
    candidate.performance.p95FrameMs - baseline.performance.p95FrameMs;
  const renderP95DeltaMs =
    candidate.render.renderP95Ms - baseline.render.renderP95Ms;
  const averageFpsDelta =
    candidate.performance.averageFps - baseline.performance.averageFps;
  const slowFrameRatioDelta =
    candidate.performance.slowFrameRatio -
    baseline.performance.slowFrameRatio;

  return {
    comparable: reasons.length === 0,
    pass:
      reasons.length === 0 &&
      frameP95DeltaMs <= BATCH_F_P95_REGRESSION_LIMIT_MS &&
      renderP95DeltaMs <= BATCH_F_P95_REGRESSION_LIMIT_MS &&
      slowFrameRatioDelta <= BATCH_F_SLOW_FRAME_RATIO_REGRESSION_LIMIT,
    reasons,
    frameP95DeltaMs,
    renderP95DeltaMs,
    averageFpsDelta,
    slowFrameRatioDelta,
  };
}

function fixed(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "0";
}

export function batchFPerformanceMarkdown(
  state: BatchFPerformanceState,
): string {
  const lines = [
    "# Space Typing Batch F Browser Performance Comparison",
    "",
  ];
  if (state.baseline === null || state.candidate === null) {
    lines.push("Result: INCOMPLETE — capture both baseline and candidate.", "");
    return lines.join("\n");
  }

  const comparison = compareBatchFPerformance(
    state.baseline,
    state.candidate,
  );
  lines.push(
    "- Result: " +
      (comparison.pass
        ? "PASS"
        : comparison.comparable
          ? "FAIL"
          : "NOT COMPARABLE"),
    "- Context: " +
      state.candidate.browserDevice +
      " · Stage " +
      String(state.candidate.stage) +
      " · " +
      state.candidate.quality +
      " · " +
      state.candidate.viewport +
      " · DPR " +
      fixed(state.candidate.deviceDpr, 2),
    "- Minimum samples: " + String(BATCH_F_MIN_PERFORMANCE_SAMPLES),
    "- Allowed p95 regression: +" +
      fixed(BATCH_F_P95_REGRESSION_LIMIT_MS) +
      " ms",
    "",
    "| Metric | Baseline | Candidate | Delta |",
    "| --- | ---: | ---: | ---: |",
    "| Frame p95 ms | " +
      fixed(state.baseline.performance.p95FrameMs) +
      " | " +
      fixed(state.candidate.performance.p95FrameMs) +
      " | " +
      fixed(comparison.frameP95DeltaMs) +
      " |",
    "| Canvas draw p95 ms | " +
      fixed(state.baseline.render.renderP95Ms) +
      " | " +
      fixed(state.candidate.render.renderP95Ms) +
      " | " +
      fixed(comparison.renderP95DeltaMs) +
      " |",
    "| Average FPS | " +
      fixed(state.baseline.performance.averageFps, 1) +
      " | " +
      fixed(state.candidate.performance.averageFps, 1) +
      " | " +
      fixed(comparison.averageFpsDelta, 1) +
      " |",
    "| Slow-frame ratio | " +
      fixed(state.baseline.performance.slowFrameRatio, 3) +
      " | " +
      fixed(state.candidate.performance.slowFrameRatio, 3) +
      " | " +
      fixed(comparison.slowFrameRatioDelta, 3) +
      " |",
    "| Effective DPR | " +
      fixed(state.baseline.render.effectiveDpr, 2) +
      " | " +
      fixed(state.candidate.render.effectiveDpr, 2) +
      " | — |",
    "| Canvas pixels | " +
      String(state.baseline.render.canvasPixels) +
      " | " +
      String(state.candidate.render.canvasPixels) +
      " | — |",
    "| Body sprite cache | " +
      String(state.baseline.render.bodySprites) +
      " | " +
      String(state.candidate.render.bodySprites) +
      " | — |",
    "",
  );
  if (comparison.reasons.length > 0) {
    lines.push("Comparison blockers: " + comparison.reasons.join("; "), "");
  }
  return lines.join("\n");
}

function loadState(): BatchFPerformanceState {
  try {
    const raw = localStorage.getItem(BATCH_F_PERFORMANCE_STORAGE_KEY);
    return raw === null
      ? createBatchFPerformanceState()
      : sanitizeBatchFPerformanceState(JSON.parse(raw));
  } catch {
    return createBatchFPerformanceState();
  }
}

function saveState(state: BatchFPerformanceState): void {
  try {
    localStorage.setItem(
      BATCH_F_PERFORMANCE_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // QA-only storage must never affect gameplay.
  }
}

function copyText(value: string): Promise<void> {
  if (navigator.clipboard !== undefined) {
    return navigator.clipboard.writeText(value);
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

export function mountBatchFPerformanceGate(
  root: HTMLElement,
  options: BatchFPerformanceMountOptions,
): BatchFPerformanceController {
  let state = loadState();

  const intro = document.createElement("p");
  intro.className = "equipment-note";
  intro.textContent =
    "QA-only before/after browser comparison. Use the same stage, quality, " +
    "viewport and browser/device; let each run collect at least " +
    String(BATCH_F_MIN_PERFORMANCE_SAMPLES) +
    " frame samples.";

  const summary = document.createElement("strong");
  const output = document.createElement("pre");
  output.className = "test-lab-mini-inspector";

  const actions = document.createElement("div");
  actions.className = "test-lab-row";
  const baselineButton = document.createElement("button");
  baselineButton.type = "button";
  baselineButton.textContent = "Capture Baseline";
  const candidateButton = document.createElement("button");
  candidateButton.type = "button";
  candidateButton.textContent = "Capture Candidate";
  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy Comparison";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset";
  actions.append(
    baselineButton,
    candidateButton,
    copyButton,
    resetButton,
  );
  root.replaceChildren(intro, summary, actions, output);

  function render(): void {
    const comparison =
      state.baseline !== null && state.candidate !== null
        ? compareBatchFPerformance(state.baseline, state.candidate)
        : null;
    summary.textContent =
      "Batch F performance · " +
      (comparison === null
        ? "capture baseline + candidate"
        : comparison.pass
          ? "PASS"
          : comparison.comparable
            ? "FAIL"
            : "NOT COMPARABLE");
    output.textContent = batchFPerformanceMarkdown(state);
  }

  function capture(kind: "baseline" | "candidate"): void {
    const sample = options.capture();
    if (sample === null) {
      options.showNotice?.(
        "Start a Test Lab encounter and collect frame samples first",
      );
      return;
    }
    state = {
      ...state,
      [kind]: sanitizeBatchFPerformanceCapture(sample),
    };
    saveState(state);
    render();
    options.showNotice?.(
      "Batch F " + kind + " captured · " +
      String(sample.performance.samples) + " samples",
    );
  }

  baselineButton.addEventListener("click", () => capture("baseline"));
  candidateButton.addEventListener("click", () => capture("candidate"));
  copyButton.addEventListener("click", () => {
    void copyText(batchFPerformanceMarkdown(state))
      .then(() => options.showNotice?.("Batch F comparison copied"))
      .catch(() => options.showNotice?.("Clipboard unavailable"));
  });
  resetButton.addEventListener("click", () => {
    state = createBatchFPerformanceState();
    saveState(state);
    render();
    options.showNotice?.("Batch F performance comparison reset");
  });

  render();

  return {
    getState(): BatchFPerformanceState {
      return sanitizeBatchFPerformanceState(state);
    },
    destroy(): void {
      root.replaceChildren();
    },
  };
}
