import { VOICE_NAMESPACE, type VoiceMessage } from "./platform/protocol.mjs";
import type { InputMode } from "./mode";

export type VoiceFeedbackView = Readonly<{
  visible: boolean;
  status: "hidden" | "preparing" | "listening" | "heard" | "accepted" | "unmatched" | "unrecognized" | "paused" | "error";
  transcript: string | null;
  detail: string;
}>;

export interface VoiceFeedbackSink {
  setMode(mode: InputMode): void;
  handleMessage(message: VoiceMessage): void;
  suspend(): void;
  stop(): void;
  resolve(detectionId: string, accepted: boolean, reason: string): void;
}

function voiceErrorDetail(message: VoiceMessage, op: string): string {
  const fields = message as VoiceMessage & {
    code?: unknown;
    message?: unknown;
  };
  const code = typeof fields.code === "string" ? fields.code.toLowerCase() : "";
  const detail = typeof fields.message === "string" ? fields.message.toLowerCase() : "";
  const reason = `${code} ${detail}`;
  if (code === "offline-engine-not-validated" || op === "capabilities") {
    return "Voice unavailable";
  }
  const permissionDenied =
    reason.includes("notallowed") ||
    reason.includes("not-allowed") ||
    reason.includes("permission-denied") ||
    reason.includes("permission denied") ||
    (reason.includes("permission") &&
      (reason.includes("denied") || reason.includes("blocked")));
  return permissionDenied
    ? "Microphone permission denied · allow access in browser/system settings, then retry"
    : "Microphone unavailable · retry";
}

/** Presentation only. Recognition is never an accepted hit until the game resolves it. */
export class VoiceFeedbackState implements VoiceFeedbackSink {
  private mode: InputMode = "typing";
  private active = false;
  private listening = false;
  private context: { sessionId: unknown; inputEpoch: unknown; audioEpoch: unknown; engineId: unknown; modelId: unknown } | null = null;
  private fromSample = 0;
  private latestEndSample = -1;
  private readonly seenEvents = new Set<string>();
  private readonly candidateEnds = new Map<string, number>();
  private detectionId: string | null = null;
  private view: VoiceFeedbackView = { visible: false, status: "hidden", transcript: null, detail: "" };

  constructor(private readonly onChange: (view: VoiceFeedbackView) => void) {}
  getView(): VoiceFeedbackView { return this.view; }
  private render(status: VoiceFeedbackView["status"], detail: string, transcript: string | null = null): void {
    this.view = { visible: this.active && this.mode !== "typing" && status !== "hidden", status, transcript, detail };
    this.onChange(this.view);
  }
  private reset(): void {
    this.listening = false; this.context = null; this.detectionId = null; this.latestEndSample = -1;
    this.seenEvents.clear(); this.candidateEnds.clear();
  }
  setGameplayActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.reset(); this.render("hidden", "");
  }
  setMode(mode: InputMode): void {
    if (this.mode === mode) return;
    this.mode = mode; this.reset();
    this.render(mode === "typing" ? "hidden" : "preparing", "Preparing voice…");
  }
  suspend(): void {
    this.listening = false; this.detectionId = null; this.context = null;
    this.render("paused", "Microphone paused");
  }
  stop(): void { this.reset(); this.render("hidden", ""); }
  expire(): void {
    // Retain the sample watermark so a late result cannot resurrect an old utterance.
    if (!["heard", "accepted", "unmatched", "unrecognized"].includes(this.view.status)) return;
    this.detectionId = null;
    this.render(this.listening ? "listening" : "paused", this.listening ? "Listening" : "Microphone paused");
  }
  handleMessage(message: VoiceMessage): void {
    if (this.mode === "typing" || !this.active) return;
    const op = message.type.slice(VOICE_NAMESPACE.length + 1);
    if (op === "error" || (op === "capabilities" && message.offlineEngineAvailable === false)) {
      this.reset();
      this.render("error", voiceErrorDetail(message, op));
      return;
    }
    if (op === "ready") {
      this.reset();
      this.context = { sessionId: message.sessionId, inputEpoch: message.inputEpoch, audioEpoch: message.audioEpoch, engineId: message.engineId, modelId: message.modelId };
      this.render("preparing", "Preparing voice…"); return;
    }
    const c = this.context;
    if (!c || message.sessionId !== c.sessionId || message.inputEpoch !== c.inputEpoch) return;
    if (op === "stopped") { this.stop(); return; }
    if (op === "gate-closed") { this.suspend(); return; }
    if (message.audioEpoch !== c.audioEpoch) return;
    if (op === "listening" || op === "listening-resumed") {
      if (this.listening) return;
      this.fromSample = message.fromSample as number; this.listening = true;
      this.render("listening", "Listening"); return;
    }
    if (!this.listening || (op !== "detection" && op !== "feedback") || message.engineId !== c.engineId || message.modelId !== c.modelId || (message.audioStartSample as number) < this.fromSample) return;
    const end = message.audioEndSample as number;
    const id = typeof message.detectionId === "string" ? message.detectionId : null;
    const eventId = `${op}:${op === "feedback" ? message.feedbackId : id}`;
    if (this.seenEvents.has(eventId) || (id !== null && this.candidateEnds.has(id) && this.candidateEnds.get(id) !== end)) return;
    if (end < this.latestEndSample) return;
    this.seenEvents.add(eventId);
    if (id !== null) this.candidateEnds.set(id, end);
    if (this.seenEvents.size > 128) this.seenEvents.delete(this.seenEvents.values().next().value!);
    if (this.candidateEnds.size > 128) this.candidateEnds.delete(this.candidateEnds.keys().next().value!);
    if (end === this.latestEndSample) {
      // A final transcript may arrive after its candidate has already been accepted.
      if (op === "feedback" && id !== null && id === this.detectionId && typeof message.transcript === "string" && message.transcript !== this.view.transcript) this.render(this.view.status, this.view.detail, message.transcript);
      return;
    }
    this.latestEndSample = end; this.detectionId = id;
    if (op === "detection") this.render("heard", "Checking…", message.form as string);
    else if (message.result === "unrecognized") this.render("unrecognized", "Not recognized · speak again");
    else this.render(id === null ? "unmatched" : "heard", id === null ? "No target match · try again" : "Checking…", message.transcript as string);
  }
  resolve(detectionId: string, accepted: boolean, reason: string): void {
    if (!this.active || !this.listening || this.detectionId !== detectionId || this.view.status !== "heard") return;
    const detail = accepted ? "Accepted" : ["keyboard-owned", "suppressed"].includes(reason) ? "Finish typing this word" : reason === "ambiguous" ? "Multiple matches · try again" : "Not applied · speak again";
    this.render(accepted ? "accepted" : "unmatched", detail, this.view.transcript);
  }
}
