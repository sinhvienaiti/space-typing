import { VOICE_NAMESPACE, parseVoiceMessage, type VoiceMessage } from "./platform/protocol.mjs";
import type { InputMode } from "./mode";
import type { VoiceFeedbackSink } from "./voice-feedback";

/** Metadata transport only. The game keeps authority over eligibility, ownership and completion. */
export class VoiceAdapter {
  private available = false;
  private inputEpoch = 0;
  private sessionId: string | null = null;
  private starting = false;
  private startedBefore = false;
  private audioEpoch = 0;
  constructor(
    private readonly parent: Window,
    private readonly parentOrigin: string,
    private readonly gameInstanceId: string,
    private readonly onMessage: (message: VoiceMessage) => void,
    private readonly feedback?: VoiceFeedbackSink,
  ) {
    const origin = new URL(parentOrigin);
    if (origin.origin !== parentOrigin || !["http:", "https:"].includes(origin.protocol)) throw new TypeError("exact parent origin required");
  }
  private post(op: string, fields: Record<string, unknown>): void {
    const message = parseVoiceMessage({ ...fields, version: 1, type: `${VOICE_NAMESPACE}:${op}`, gameId: "space-typing", gameInstanceId: this.gameInstanceId });
    this.parent.postMessage(message, this.parentOrigin);
  }
  probe(): void { this.post("hello", { versions: [1] }); }
  start(mode: InputMode, inputEpoch: number): boolean {
    if (!this.available || mode === "typing" || !Number.isSafeInteger(inputEpoch) || inputEpoch < this.inputEpoch || (this.startedBefore && inputEpoch === this.inputEpoch)) return false;
    this.sessionId = null; this.inputEpoch = inputEpoch; this.audioEpoch = 0; this.starting = true; this.startedBefore = true;
    this.feedback?.setMode(mode);
    this.post("configure", { mode, inputEpoch, language: "en", policyVersion: "space-voice-v2-draft1" });
    this.post("start", { inputEpoch }); return true;
  }
  handleMessage(event: MessageEvent<unknown>): boolean {
    if (event.source !== this.parent || event.origin !== this.parentOrigin) return false;
    let message: VoiceMessage; try { message = parseVoiceMessage(event.data); } catch { return false; }
    if (message.gameId !== "space-typing" || message.gameInstanceId !== this.gameInstanceId) return false;
    const op = message.type.slice(VOICE_NAMESPACE.length + 1);
    if (!["capabilities", "ready", "targets-applied", "detection", "feedback", "stopped", "listening", "listening-resumed", "gate-closed", "error"].includes(op)) return false;
    if (op === "capabilities") this.available = message.offlineEngineAvailable === true;
    else if (op === "ready") {
      if (message.inputEpoch !== this.inputEpoch || (!this.starting && message.sessionId !== this.sessionId) || typeof message.audioEpoch !== "number" || (this.starting ? message.audioEpoch < this.audioEpoch : message.audioEpoch <= this.audioEpoch)) return false;
      this.sessionId = message.sessionId as string;
      this.audioEpoch = message.audioEpoch; this.starting = false;
    } else if ("sessionId" in message && (message.sessionId !== this.sessionId || message.inputEpoch !== this.inputEpoch)) return false;
    if ("audioEpoch" in message && message.audioEpoch !== this.audioEpoch) return false;
    this.feedback?.handleMessage(message);
    this.onMessage(message); return true;
  }
  sendSession(op: string, fields: Record<string, unknown> = {}): boolean {
    if (!this.sessionId) return false;
    // Session/instance identities cannot be overridden by a payload.
    this.post(op, { ...fields, sessionId: this.sessionId, inputEpoch: this.inputEpoch });
    // Only the game's outgoing resolution can show an accepted hit.
    if (op === "resolution") this.feedback?.resolve(fields.detectionId as string, fields.accepted as boolean, fields.reason as string);
    return true;
  }
  suspend(inputEpoch: number): boolean {
    if (!Number.isSafeInteger(inputEpoch) || inputEpoch <= this.inputEpoch) return false;
    this.inputEpoch = inputEpoch; this.feedback?.suspend(); return this.sendSession("suspend");
  }
  stop(): void {
    this.sendSession("stop"); this.sessionId = null; this.available = false; this.starting = false; this.inputEpoch += 1;
    this.feedback?.stop();
  }
}
