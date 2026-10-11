import {
  VOICE_NAMESPACE,
  parseVoiceMessage,
  type VoiceMessage,
} from "./platform/protocol.mjs";
import type { InputMode } from "./mode";
import type { VoiceFeedbackSink } from "./voice-feedback";
import { VOICE_COMBAT_POLICY } from "./voice-combat-policy";

const DEFAULT_MAX_PENDING_DETECTIONS = 16;
const DEFAULT_DETECTION_BATCH_SIZE = 2;

type DetectionMessage = VoiceMessage & {
  sessionId: string;
  inputEpoch: number;
  audioEpoch: number;
  detectionId: string;
  audioEndSample: number;
};

type QueuedDetection = {
  message: DetectionMessage;
  receivedAtMs: number;
  generation: number;
};

type InFlightDetection = {
  receivedAtMs: number;
  audioEndSample: number;
};

export type VoiceAcceptanceMetrics = Readonly<{
  received: number;
  enqueued: number;
  pending: number;
  highWaterMark: number;
  accepted: number;
  rejected: number;
  staleRejected: number;
  overflowRejected: number;
  lastRecognitionToAcceptanceMs: number | null;
  maxRecognitionToAcceptanceMs: number | null;
  lastAudioEndToAcceptanceMs: number | null;
  maxAudioEndToAcceptanceMs: number | null;
}>;

export type VoiceAdapterRuntime = Readonly<{
  schedule?: (task: () => void) => void;
  now?: () => number;
  maxPendingDetections?: number;
  detectionBatchSize?: number;
}>;

function actionableVoiceError(message: VoiceMessage): VoiceMessage {
  if (!message.type.endsWith(":error")) return message;
  const fields = message as VoiceMessage & { code?: unknown; message?: unknown };
  const code = typeof fields.code === "string" ? fields.code.toLowerCase() : "";
  const detail =
    typeof fields.message === "string" ? fields.message.toLowerCase() : "";
  const reason = `${code} ${detail}`;
  const permissionDenied =
    reason.includes("notallowed") ||
    reason.includes("not-allowed") ||
    reason.includes("permission-denied") ||
    reason.includes("permission denied") ||
    (reason.includes("permission") &&
      (reason.includes("denied") || reason.includes("blocked")));
  if (!permissionDenied) return message;
  return {
    ...message,
    message:
      "Microphone permission denied. Allow microphone access in browser and system settings, then retry.",
  } as VoiceMessage;
}

/** Metadata transport only. The game keeps authority over eligibility, ownership and completion. */
export class VoiceAdapter {
  private available = false;
  private inputEpoch = 0;
  private sessionId: string | null = null;
  private starting = false;
  private startedBefore = false;
  private audioEpoch = 0;
  private sampleRate = 0;
  private latestSample = 0;
  private detectionQueue: QueuedDetection[] = [];
  private inFlightDetections = new Map<string, InFlightDetection>();
  private detectionGeneration = 0;
  private scheduledGeneration: number | null = null;
  private readonly scheduleDetectionTask: (task: () => void) => void;
  private readonly now: () => number;
  private readonly maxPendingDetections: number;
  private readonly detectionBatchSize: number;
  private acceptanceMetrics = {
    received: 0,
    enqueued: 0,
    highWaterMark: 0,
    accepted: 0,
    rejected: 0,
    staleRejected: 0,
    overflowRejected: 0,
    lastRecognitionToAcceptanceMs: null as number | null,
    maxRecognitionToAcceptanceMs: null as number | null,
    lastAudioEndToAcceptanceMs: null as number | null,
    maxAudioEndToAcceptanceMs: null as number | null,
  };

  constructor(
    private readonly parent: Window,
    private readonly parentOrigin: string,
    private readonly gameInstanceId: string,
    private readonly onMessage: (message: VoiceMessage) => void,
    private readonly feedback?: VoiceFeedbackSink,
    runtime: VoiceAdapterRuntime = {},
  ) {
    const origin = new URL(parentOrigin);
    if (
      origin.origin !== parentOrigin ||
      !["http:", "https:"].includes(origin.protocol)
    )
      throw new TypeError("exact parent origin required");

    const maxPending =
      runtime.maxPendingDetections ?? DEFAULT_MAX_PENDING_DETECTIONS;
    const batchSize = runtime.detectionBatchSize ?? DEFAULT_DETECTION_BATCH_SIZE;
    if (!Number.isSafeInteger(maxPending) || maxPending < 1)
      throw new RangeError("maxPendingDetections must be a positive integer");
    if (
      !Number.isSafeInteger(batchSize) ||
      batchSize < 1 ||
      batchSize > maxPending
    )
      throw new RangeError(
        "detectionBatchSize must be a positive integer within the backlog cap",
      );

    this.maxPendingDetections = maxPending;
    this.detectionBatchSize = batchSize;
    this.scheduleDetectionTask =
      runtime.schedule ?? ((task) => void setTimeout(task, 0));
    this.now =
      runtime.now ??
      (() =>
        typeof performance === "undefined" ? Date.now() : performance.now());
  }

  getAcceptanceMetrics(): VoiceAcceptanceMetrics {
    return {
      ...this.acceptanceMetrics,
      pending: this.detectionQueue.length,
    };
  }

  private post(op: string, fields: Record<string, unknown>): void {
    const message = parseVoiceMessage({
      ...fields,
      version: 1,
      type: `${VOICE_NAMESPACE}:${op}`,
      gameId: "space-typing",
      gameInstanceId: this.gameInstanceId,
    });
    this.parent.postMessage(message, this.parentOrigin);
  }

  probe(): void {
    this.post("hello", { versions: [1] });
  }

  start(mode: InputMode, inputEpoch: number): boolean {
    if (
      !this.available ||
      mode === "typing" ||
      !Number.isSafeInteger(inputEpoch) ||
      inputEpoch < this.inputEpoch ||
      (this.startedBefore && inputEpoch === this.inputEpoch)
    )
      return false;
    this.rejectQueuedDetections("stale-input-epoch");
    this.sessionId = null;
    this.inputEpoch = inputEpoch;
    this.audioEpoch = 0;
    this.sampleRate = 0;
    this.latestSample = 0;
    this.starting = true;
    this.startedBefore = true;
    this.feedback?.setMode(mode);
    this.post("configure", {
      mode,
      inputEpoch,
      language: "en",
      policyVersion: VOICE_COMBAT_POLICY.version,
    });
    this.post("start", { inputEpoch });
    return true;
  }

  handleMessage(event: MessageEvent<unknown>): boolean {
    if (event.source !== this.parent || event.origin !== this.parentOrigin)
      return false;
    let message: VoiceMessage;
    try {
      message = parseVoiceMessage(event.data);
    } catch {
      return false;
    }
    if (
      message.gameId !== "space-typing" ||
      message.gameInstanceId !== this.gameInstanceId
    )
      return false;
    const op = message.type.slice(VOICE_NAMESPACE.length + 1);
    if (
      ![
        "capabilities",
        "preparing",
        "ready",
        "targets-applied",
        "vocabulary-checked",
        "clock",
        "detection",
        "feedback",
        "stopped",
        "listening",
        "listening-resumed",
        "gate-closed",
        "error",
      ].includes(op)
    )
      return false;

    if (op === "capabilities") {
      this.available = message.offlineEngineAvailable === true;
    } else if (op === "preparing") {
      if (!this.starting || message.inputEpoch !== this.inputEpoch) return false;
    } else if (op === "ready") {
      if (
        message.inputEpoch !== this.inputEpoch ||
        (!this.starting && message.sessionId !== this.sessionId) ||
        typeof message.audioEpoch !== "number" ||
        (this.starting
          ? message.audioEpoch < this.audioEpoch
          : message.audioEpoch <= this.audioEpoch)
      )
        return false;
      this.rejectQueuedDetections("stale-audio-epoch");
      this.sessionId = message.sessionId as string;
      this.audioEpoch = message.audioEpoch;
      this.sampleRate = Number(message.sampleRate);
      this.latestSample = Number(message.fromSample ?? 0);
      this.starting = false;
    } else if (
      "sessionId" in message &&
      (message.sessionId !== this.sessionId ||
        message.inputEpoch !== this.inputEpoch)
    ) {
      return false;
    }

    if ("audioEpoch" in message && message.audioEpoch !== this.audioEpoch)
      return false;

    if (op === "clock")
      this.latestSample = Math.max(this.latestSample, Number(message.sample));

    const delivered = actionableVoiceError(message);
    this.feedback?.handleMessage(delivered);
    if (op === "detection")
      return this.enqueueDetection(delivered as DetectionMessage);
    this.onMessage(delivered);
    return true;
  }

  sendSession(op: string, fields: Record<string, unknown> = {}): boolean {
    if (!this.sessionId) return false;
    this.post(op, {
      ...fields,
      sessionId: this.sessionId,
      inputEpoch: this.inputEpoch,
    });
    if (op === "resolution") {
      const detectionId = String(fields.detectionId ?? "");
      const receipt = this.inFlightDetections.get(detectionId);
      if (receipt) {
        this.inFlightDetections.delete(detectionId);
        this.recordResolution(
          fields.accepted === true,
          receipt.receivedAtMs,
          receipt.audioEndSample,
        );
      }
      this.feedback?.resolve(
        fields.detectionId as string,
        fields.accepted as boolean,
        fields.reason as string,
      );
    }
    return true;
  }

  suspend(inputEpoch: number): boolean {
    if (!Number.isSafeInteger(inputEpoch) || inputEpoch <= this.inputEpoch)
      return false;
    this.rejectQueuedDetections("stale-input-epoch");
    this.inputEpoch = inputEpoch;
    this.feedback?.suspend();
    return this.sendSession("suspend");
  }

  resume(inputEpoch: number): boolean {
    if (!Number.isSafeInteger(inputEpoch) || inputEpoch <= this.inputEpoch)
      return false;
    this.rejectQueuedDetections("stale-input-epoch");
    this.inputEpoch = inputEpoch;
    return this.sendSession("resume");
  }

  stop(): void {
    this.rejectQueuedDetections("session-stopped");
    if (this.starting)
      this.post("configure", {
        mode: "typing",
        inputEpoch: this.inputEpoch + 1,
        language: "en",
        policyVersion: VOICE_COMBAT_POLICY.version,
      });
    this.sendSession("stop");
    this.sessionId = null;
    this.available = false;
    this.starting = false;
    this.inputEpoch += 1;
    this.audioEpoch = 0;
    this.sampleRate = 0;
    this.latestSample = 0;
    this.inFlightDetections.clear();
    this.feedback?.stop();
  }

  private enqueueDetection(message: DetectionMessage): boolean {
    this.acceptanceMetrics.received += 1;
    this.latestSample = Math.max(
      this.latestSample,
      Number(message.audioEndSample),
    );
    if (this.detectionQueue.length >= this.maxPendingDetections) {
      this.acceptanceMetrics.rejected += 1;
      this.acceptanceMetrics.overflowRejected += 1;
      this.sendSession("resolution", {
        detectionId: message.detectionId,
        accepted: false,
        reason: "backlog-full",
      });
      return true;
    }

    this.detectionQueue.push({
      message,
      receivedAtMs: this.now(),
      generation: this.detectionGeneration,
    });
    this.acceptanceMetrics.enqueued += 1;
    this.acceptanceMetrics.highWaterMark = Math.max(
      this.acceptanceMetrics.highWaterMark,
      this.detectionQueue.length,
    );
    this.scheduleDetectionDrain();
    return true;
  }

  private scheduleDetectionDrain(): void {
    if (this.scheduledGeneration === this.detectionGeneration) return;
    const generation = this.detectionGeneration;
    this.scheduledGeneration = generation;
    this.scheduleDetectionTask(() => {
      if (generation !== this.detectionGeneration) return;
      this.scheduledGeneration = null;
      this.drainDetections(generation);
    });
  }

  private drainDetections(generation: number): void {
    let processed = 0;
    while (
      generation === this.detectionGeneration &&
      processed < this.detectionBatchSize &&
      this.detectionQueue.length
    ) {
      const item = this.detectionQueue.shift()!;
      processed += 1;
      const message = item.message;
      if (
        item.generation !== this.detectionGeneration ||
        !this.sessionId ||
        message.sessionId !== this.sessionId ||
        message.inputEpoch !== this.inputEpoch ||
        message.audioEpoch !== this.audioEpoch
      ) {
        this.acceptanceMetrics.rejected += 1;
        this.acceptanceMetrics.staleRejected += 1;
        continue;
      }

      this.inFlightDetections.set(message.detectionId, {
        receivedAtMs: item.receivedAtMs,
        audioEndSample: message.audioEndSample,
      });
      try {
        this.onMessage(message);
      } catch {
        // Recognition transport must never tear down the gameplay/event loop.
      }
      if (this.inFlightDetections.has(message.detectionId)) {
        this.inFlightDetections.delete(message.detectionId);
        this.acceptanceMetrics.rejected += 1;
        this.sendSession("resolution", {
          detectionId: message.detectionId,
          accepted: false,
          reason: "unresolved-detection",
        });
      }
    }

    if (
      generation === this.detectionGeneration &&
      this.detectionQueue.length
    )
      this.scheduleDetectionDrain();
  }

  private rejectQueuedDetections(reason: string): void {
    const pending = this.detectionQueue.splice(0);
    this.detectionGeneration += 1;
    this.scheduledGeneration = null;
    for (const item of pending) {
      this.acceptanceMetrics.rejected += 1;
      this.acceptanceMetrics.staleRejected += 1;
      if (
        this.sessionId &&
        item.message.sessionId === this.sessionId &&
        item.message.inputEpoch === this.inputEpoch
      )
        this.sendSession("resolution", {
          detectionId: item.message.detectionId,
          accepted: false,
          reason,
        });
    }
  }

  private recordResolution(
    accepted: boolean,
    receivedAtMs: number,
    audioEndSample: number,
  ): void {
    if (accepted) this.acceptanceMetrics.accepted += 1;
    else this.acceptanceMetrics.rejected += 1;

    const recognitionLatency = Math.max(0, this.now() - receivedAtMs);
    if (accepted) {
      this.acceptanceMetrics.lastRecognitionToAcceptanceMs = recognitionLatency;
      this.acceptanceMetrics.maxRecognitionToAcceptanceMs = Math.max(
        this.acceptanceMetrics.maxRecognitionToAcceptanceMs ?? 0,
        recognitionLatency,
      );
      if (this.sampleRate > 0) {
        const captureLatency = Math.max(
          0,
          ((this.latestSample - audioEndSample) * 1000) / this.sampleRate,
        );
        this.acceptanceMetrics.lastAudioEndToAcceptanceMs = captureLatency;
        this.acceptanceMetrics.maxAudioEndToAcceptanceMs = Math.max(
          this.acceptanceMetrics.maxAudioEndToAcceptanceMs ?? 0,
          captureLatency,
        );
      }
    }
  }
}
