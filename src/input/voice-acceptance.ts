export type VoiceAcceptanceBarrier = {
  sessionId: string;
  inputEpoch: number;
  audioEpoch: number;
};

export type VoiceAcceptanceDetection = VoiceAcceptanceBarrier & {
  detectionId: string;
  emittedAtMs: number;
};

export type VoiceAcceptanceDecision = {
  accepted: boolean;
  duplicate: boolean;
  reason: string;
};

export type VoiceAcceptanceTicket = {
  readonly detectionId: string;
  readonly receivedAtMs: number;
};

export type VoiceAcceptanceDiagnostics = {
  received: number;
  accepted: number;
  rejected: number;
  duplicateRejected: number;
  staleRejected: number;
  barrierChanges: number;
  sessionChanges: number;
  currentInFlight: number;
  maxInFlight: number;
  lastDeliveryLagMs: number;
  maxDeliveryLagMs: number;
  maxProcessingMs: number;
  overBudgetCount: number;
};

function safeDuration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function isStaleReason(reason: string): boolean {
  return (
    reason.startsWith("stale-") ||
    reason === "snapshot-epoch-mismatch" ||
    reason === "expired-result" ||
    reason === "invalid-audio-window" ||
    reason === "audio-before-ready" ||
    reason === "replayed-audio"
  );
}

/**
 * Small runtime monitor for the R04 acceptance contract.
 *
 * `maxDeliveryLagMs` is the browser/event-loop backlog signal: it measures how
 * long a recognition result waited between the recognizer emitting it and the
 * game beginning deterministic admission. `maxProcessingMs` and
 * `maxInFlight` cover work performed inside the synchronous game admission
 * path. No gameplay decision is made here; VoiceResultPolicy remains the
 * authority for stale/duplicate/eligibility acceptance.
 */
export class VoiceAcceptanceMonitor {
  private barrierKey = "";
  private sessionId = "";
  private received = 0;
  private accepted = 0;
  private rejected = 0;
  private duplicateRejected = 0;
  private staleRejected = 0;
  private barrierChanges = 0;
  private sessionChanges = 0;
  private currentInFlight = 0;
  private maxInFlight = 0;
  private lastDeliveryLagMs = 0;
  private maxDeliveryLagMs = 0;
  private maxProcessingMs = 0;
  private overBudgetCount = 0;

  constructor(
    private readonly nowMs: () => number = () => Date.now(),
    private readonly handlerBudgetMs = 8,
  ) {
    if (!Number.isFinite(handlerBudgetMs) || handlerBudgetMs < 0) {
      throw new RangeError("handlerBudgetMs must be a non-negative number");
    }
  }

  barrier(context: VoiceAcceptanceBarrier): void {
    const key = `${context.sessionId}\u0000${String(context.inputEpoch)}\u0000${String(context.audioEpoch)}`;
    if (this.barrierKey !== "" && key !== this.barrierKey) {
      this.barrierChanges += 1;
      if (context.sessionId !== this.sessionId) this.sessionChanges += 1;
    }
    this.barrierKey = key;
    this.sessionId = context.sessionId;
  }

  begin(detection: VoiceAcceptanceDetection): VoiceAcceptanceTicket {
    const receivedAtMs = this.nowMs();
    const deliveryLagMs = safeDuration(receivedAtMs - detection.emittedAtMs);
    this.received += 1;
    this.currentInFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.currentInFlight);
    this.lastDeliveryLagMs = deliveryLagMs;
    this.maxDeliveryLagMs = Math.max(this.maxDeliveryLagMs, deliveryLagMs);
    return { detectionId: detection.detectionId, receivedAtMs };
  }

  finish(
    ticket: VoiceAcceptanceTicket,
    decision: VoiceAcceptanceDecision,
  ): void {
    const processingMs = safeDuration(this.nowMs() - ticket.receivedAtMs);
    this.maxProcessingMs = Math.max(this.maxProcessingMs, processingMs);
    if (processingMs > this.handlerBudgetMs) this.overBudgetCount += 1;
    this.currentInFlight = Math.max(0, this.currentInFlight - 1);

    if (decision.accepted) {
      this.accepted += 1;
      return;
    }
    this.rejected += 1;
    if (decision.duplicate) this.duplicateRejected += 1;
    if (isStaleReason(decision.reason)) this.staleRejected += 1;
  }

  snapshot(): VoiceAcceptanceDiagnostics {
    return {
      received: this.received,
      accepted: this.accepted,
      rejected: this.rejected,
      duplicateRejected: this.duplicateRejected,
      staleRejected: this.staleRejected,
      barrierChanges: this.barrierChanges,
      sessionChanges: this.sessionChanges,
      currentInFlight: this.currentInFlight,
      maxInFlight: this.maxInFlight,
      lastDeliveryLagMs: this.lastDeliveryLagMs,
      maxDeliveryLagMs: this.maxDeliveryLagMs,
      maxProcessingMs: this.maxProcessingMs,
      overBudgetCount: this.overBudgetCount,
    };
  }

  reset(): void {
    this.received = 0;
    this.accepted = 0;
    this.rejected = 0;
    this.duplicateRejected = 0;
    this.staleRejected = 0;
    this.barrierChanges = 0;
    this.sessionChanges = 0;
    this.currentInFlight = 0;
    this.maxInFlight = 0;
    this.lastDeliveryLagMs = 0;
    this.maxDeliveryLagMs = 0;
    this.maxProcessingMs = 0;
    this.overBudgetCount = 0;
  }
}
