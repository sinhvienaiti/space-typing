import { VoiceAdapter } from "./voice-adapter";
import { VoiceResultPolicy } from "./platform/result-policy.mjs";
import {
  VOICE_NAMESPACE,
  type VoiceMessage,
  type VoiceTarget,
} from "./platform/protocol.mjs";
import type { VoiceFeedbackSink } from "./voice-feedback";
import type { InputMode } from "./mode";

type LiveTarget = VoiceTarget & {
  keyboardOwned: boolean;
  terminal: boolean;
  resolving: boolean;
};
type GamePort = {
  getPhase(): string;
  getVoiceTargets(sample: number): LiveTarget[];
  getVoiceVocabularyForms(): string[];
  getVoiceVocabularyRevision(): number;
  completeVoiceUnit(id: string, version: number, eligibility: number): boolean;
  togglePause(): void;
};
export class VoiceSession {
  private adapter: VoiceAdapter;
  private policy = new VoiceResultPolicy();
  private mode: InputMode = "typing";
  private epoch = 0;
  private state = "off";
  private sample = 0;
  private context: {
    sessionId: string;
    inputEpoch: number;
    audioEpoch: number;
    sampleRate: number;
    engineId: string;
    modelId: string;
  } | null = null;
  private signature = "";
  private revision = 0;
  private lastPhase = "title";
  private timer: ReturnType<typeof setInterval> | null = null;
  private preparationTimer: ReturnType<typeof setTimeout> | null = null;
  private acknowledgementTimer: ReturnType<typeof setTimeout> | null = null;
  private targetUpdatePending = false;
  private pendingSnapshotId = "";
  private outputGeneration = 0;
  private outputWaiter: {
    generation: number;
    resolve(): void;
    reject(error: Error): void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private outputActive = false;
  private outputResume: {
    resolve(): void;
    reject(error: Error): void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private vocabularyQueue: string[][] = [];
  private vocabularyRequest = "";
  private pendingTargets: VoiceTarget[] = [];
  private readyUnits = new Set<string>();
  private preparedVocabulary = -1;
  private preparingVocabulary = -1;
  private prepareWaiters = new Set<{
    resolve(): void;
    reject(error: Error): void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private unitKey(target: VoiceTarget): string {
    return `${target.unitId}:${target.unitVersion}:${target.eligibilityVersion}`;
  }
  isWorldReady(): boolean {
    if (this.state !== "listening" || this.outputActive || !this.isReady())
      return false;
    try {
      return this.game()
        .getVoiceTargets(this.sample)
        .every((t) => !t.eligible || this.readyUnits.has(this.unitKey(t)));
    } catch {
      this.fail("Voice target inventory unavailable. Reconnect to continue.");
      return false;
    }
  }
  constructor(
    parent: Window,
    origin: string,
    instanceId: string,
    private game: () => GamePort,
    feedback: VoiceFeedbackSink,
    private onState: (state: string, detail: string) => void,
  ) {
    this.adapter = new VoiceAdapter(
      parent,
      origin,
      instanceId,
      (message) => this.receive(message),
      feedback,
    );
  }
  handleMessage(event: MessageEvent<unknown>): void {
    this.adapter.handleMessage(event);
  }
  setMode(mode: InputMode): void {
    this.stop();
    this.mode = mode;
  }
  isReady(): boolean {
    return (
      (this.state === "listening" || this.state === "suspended") &&
      this.preparedVocabulary === this.game().getVoiceVocabularyRevision()
    );
  }
  isRunning(): boolean {
    return this.context !== null || this.state === "preparing";
  }
  start(): void {
    if (this.mode === "typing") {
      this.onState("off", "Select Voice or Hybrid first");
      return;
    }
    if (window.parent === window) {
      this.onState(
        "error",
        "Open Space Typing through https://typing-game.local/space-typing",
      );
      return;
    }
    this.stop();
    this.state = "preparing";
    this.onState(this.state, "Preparing microphone and offline model…");
    this.preparationDeadline(90_000);
    this.adapter.probe();
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.preparationTimer) clearTimeout(this.preparationTimer);
    this.preparationTimer = null;
    this.clearAcknowledgement();
    if (this.outputWaiter) {
      clearTimeout(this.outputWaiter.timer);
      this.outputWaiter.reject(new Error("Voice session stopped"));
      this.outputWaiter = null;
    }
    if (this.outputResume) {
      clearTimeout(this.outputResume.timer);
      this.outputResume.reject(new Error("Voice session stopped"));
      this.outputResume = null;
    }
    this.adapter.stop();
    this.epoch += 1;
    this.context = null;
    this.sample = 0;
    this.signature = "";
    this.targetUpdatePending = false;
    this.state = "off";
    this.outputActive = false;
    this.vocabularyQueue = [];
    this.vocabularyRequest = "";
    this.pendingTargets = [];
    this.readyUnits.clear();
    this.preparedVocabulary = -1;
    for (const waiter of this.prepareWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("Voice preparation stopped"));
    }
    this.prepareWaiters.clear();
    this.onState("off", "Microphone off");
  }
  /** Close capture and wait for the parent's ACK before any local pronunciation. */
  async withAudioOutput(play: () => Promise<void>): Promise<void> {
    if (!this.context) {
      await play();
      return;
    }
    if (this.outputActive) throw new Error("Pronunciation already playing");
    this.clearAcknowledgement();
    this.outputActive = true;
    this.state = "suspended";
    this.onState("suspended", "Microphone paused for pronunciation");
    const generation = ++this.outputGeneration;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.outputWaiter = null;
          reject(new Error("Microphone gate did not close"));
        }, 3000);
        this.outputWaiter = { generation, resolve, reject, timer };
        this.adapter.sendSession("audio-output-intent", { generation });
      });
      await play();
    } finally {
      this.outputActive = false;
      if (this.context)
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            this.outputResume = null;
            reject(new Error("Microphone did not resume"));
          }, 5000);
          this.outputResume = { resolve, reject, timer };
          this.adapter.sendSession("audio-output-ended", { generation });
        });
    }
  }
  /** Called synchronously by game phase hooks; polling only observes target churn. */
  phaseChanged(): void {
    this.tick();
  }
  async ensureVocabularyReady(): Promise<void> {
    if (this.mode === "typing" || this.isReady()) return;
    if (!this.context)
      throw new Error("Enable the microphone before starting Voice or Hybrid");
    const promise = new Promise<void>((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.prepareWaiters.delete(waiter);
          reject(new Error("Voice vocabulary preparation timed out"));
        }, 15000),
      };
      this.prepareWaiters.add(waiter);
    });
    if (this.state !== "preparing") {
      this.preparationDeadline(15_000);
      this.clearAcknowledgement();
      this.epoch++;
      this.adapter.suspend(this.epoch);
      this.context.inputEpoch = this.epoch;
      this.epoch++;
      this.adapter.resume(this.epoch);
      this.state = "preparing";
      this.onState("preparing", "Checking offline vocabulary…");
    }
    await promise;
  }
  private receive(message: VoiceMessage): void {
    const op = message.type.slice(VOICE_NAMESPACE.length + 1);
    if (op === "clock") {
      this.sample = Math.max(this.sample, Number(message.sample));
      return;
    }
    const waiter = this.outputWaiter;
    if (
      op === "gate-closed" &&
      waiter &&
      waiter.generation === message.generation
    ) {
      clearTimeout(waiter.timer);
      waiter.resolve();
      this.outputWaiter = null;
      return;
    }
    if (op === "capabilities") {
      if (this.state !== "preparing") return;
      if (message.offlineEngineAvailable !== true) {
        this.fail("Offline voice engine unavailable");
        return;
      }
      this.epoch += 1;
      this.adapter.start(this.mode, this.epoch);
      return;
    }
    if (op === "ready") {
      if (this.outputResume) {
        clearTimeout(this.outputResume.timer);
        this.outputResume.resolve();
        this.outputResume = null;
      }
      this.sample = Math.max(this.sample, Number(message.fromSample ?? 0));
      this.context = {
        sessionId: String(message.sessionId),
        inputEpoch: Number(message.inputEpoch),
        audioEpoch: Number(message.audioEpoch),
        sampleRate: Number(message.sampleRate),
        engineId: String(message.engineId),
        modelId: String(message.modelId),
      };
      this.policy.barrier({ ...this.context, fromSample: this.sample });
      this.signature = "";
      this.targetUpdatePending = false;
      this.readyUnits.clear();
      this.state = "preparing";
      const forms = [...new Set(this.game().getVoiceVocabularyForms())];
      this.preparingVocabulary = this.game().getVoiceVocabularyRevision();
      this.vocabularyQueue = [];
      for (let i = 0; i < forms.length; i += 256)
        this.vocabularyQueue.push(forms.slice(i, i + 256));
      this.checkVocabulary();
      this.timer ??= setInterval(() => this.tick(), 50);
      return;
    }
    if (op === "vocabulary-checked") {
      if (message.requestId !== this.vocabularyRequest) return;
      this.clearAcknowledgement();
      this.vocabularyRequest = "";
      const unsupported = message.unsupported as string[];
      if (unsupported.length) {
        this.fail(
          `Model cannot recognize: ${unsupported.slice(0, 3).join(", ")}. Change vocabulary or choose Typing.`,
        );
        return;
      }
      this.checkVocabulary();
      return;
    }
    if (op === "targets-applied") {
      if (message.snapshotId !== this.pendingSnapshotId) return;
      this.clearAcknowledgement();
      this.targetUpdatePending = false;
      this.sample = Math.max(this.sample, Number(message.appliedAtSample));
      try {
        this.policy.acknowledge(
          String(message.snapshotId),
          message.ready as string[],
          Number(message.appliedAtSample),
        );
      } catch {
        this.fail("Voice target acknowledgement failed");
        return;
      }
      if ((message.unsupported as string[]).length) {
        this.fail(
          "This vocabulary contains unsupported spoken forms. Choose Typing to continue.",
        );
        return;
      }
      const ready = new Set(message.ready as string[]);
      this.readyUnits = new Set(
        this.pendingTargets
          .filter((t) => ready.has(t.unitId))
          .map((t) => this.unitKey(t)),
      );
      return;
    }
    if (op === "listening" || op === "listening-resumed") {
      if (this.preparationTimer) clearTimeout(this.preparationTimer);
      this.preparationTimer = null;
      this.preparedVocabulary = this.preparingVocabulary;
      this.sample = Math.max(this.sample, Number(message.fromSample));
      this.state = "listening";
      this.lastPhase = "";
      this.onState("listening", "Listening · English");
      this.tick();
      for (const waiter of this.prepareWaiters) {
        clearTimeout(waiter.timer);
        waiter.resolve();
      }
      this.prepareWaiters.clear();
      return;
    }
    if (op === "detection" && this.context && this.state === "listening") {
      this.sample = Math.max(this.sample, Number(message.audioEndSample));
      const now = this.sample;
      let outcome;
      try {
        outcome = this.policy.resolve(
          message,
          this.game().getVoiceTargets(now),
          now,
        );
      } catch {
        return;
      }
      let accepted =
        outcome.accepted &&
        !outcome.duplicate &&
        this.game().getPhase() === "playing";
      if (accepted)
        accepted = this.game().completeVoiceUnit(
          outcome.unitId,
          Number(message.unitVersion),
          Number(message.eligibilityVersion),
        );
      this.adapter.sendSession("resolution", {
        detectionId: message.detectionId,
        accepted,
        reason: accepted
          ? "accepted"
          : outcome.accepted
            ? "unit-unavailable"
            : outcome.reason,
      });
      if (accepted) {
        this.signature = "";
        this.publish();
      }
      return;
    }
    if (op === "error")
      this.fail(
        String(message.message ?? "Microphone error. Reconnect to continue."),
      );
  }
  private fail(detail: string): void {
    if (this.mode === "voice" && this.game().getPhase() === "playing")
      this.game().togglePause();
    this.stop();
    this.state = "error";
    this.onState("error", detail);
  }
  private checkVocabulary(): void {
    if (!this.context) return;
    const forms = this.vocabularyQueue.shift();
    if (!forms) {
      this.publish();
      return;
    }
    this.vocabularyRequest = `${this.context.sessionId}:vocab:${++this.revision}`;
    this.onState("preparing", "Checking offline vocabulary…");
    this.awaitAcknowledgement(
      "Offline vocabulary acknowledgement timed out. Reconnect the microphone.",
    );
    this.adapter.sendSession("vocabulary-check", {
      audioEpoch: this.context.audioEpoch,
      requestId: this.vocabularyRequest,
      forms,
    });
  }
  private preparationDeadline(ms: number): void {
    if (this.preparationTimer) clearTimeout(this.preparationTimer);
    this.preparationTimer = setTimeout(
      () =>
        this.fail(
          "Microphone preparation timed out. Allow access and reconnect.",
        ),
      ms,
    );
  }
  private clearAcknowledgement(): void {
    if (this.acknowledgementTimer) clearTimeout(this.acknowledgementTimer);
    this.acknowledgementTimer = null;
  }
  private awaitAcknowledgement(message: string): void {
    this.clearAcknowledgement();
    this.acknowledgementTimer = setTimeout(() => this.fail(message), 5_000);
  }
  private tick(): void {
    if (!this.context || this.outputActive) return;
    const phase = this.game().getPhase();
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      if (phase !== "playing" && this.state === "listening") {
        this.clearAcknowledgement();
        this.epoch++;
        this.adapter.suspend(this.epoch);
        this.context.inputEpoch = this.epoch;
        this.state = "suspended";
        this.onState("suspended", "Microphone paused");
      } else if (phase === "playing" && this.state === "suspended") {
        this.preparationDeadline(15_000);
        this.epoch++;
        this.adapter.resume(this.epoch);
        this.state = "preparing";
        this.onState("preparing", "Resuming microphone…");
      }
    }
    if (this.state === "listening") this.publish();
  }
  private publish(): void {
    if (!this.context || this.targetUpdatePending) return;
    const playing = this.game().getPhase() === "playing";
    let targets: VoiceTarget[];
    try {
      targets = this.game()
        .getVoiceTargets(this.sample)
        .map(
          ({ keyboardOwned: _k, terminal: _t, resolving: _r, ...target }) => ({
            ...target,
            eligible: playing && target.eligible,
          }),
        );
    } catch {
      this.fail("Voice target inventory unavailable. Reconnect to continue.");
      return;
    }
    const signature = JSON.stringify(targets);
    if (signature === this.signature) return;
    const snapshot = {
      ...this.context,
      snapshotId: `${this.context.sessionId}:snapshot:${++this.revision}`,
      registryRevision: this.revision,
      publishedAtSample: this.sample,
      targets,
    };
    try {
      this.policy.publish(snapshot);
    } catch {
      this.fail("Voice target history needs reconnecting");
      return;
    }
    this.signature = signature;
    this.targetUpdatePending = true;
    this.pendingSnapshotId = snapshot.snapshotId;
    this.pendingTargets = targets;
    this.awaitAcknowledgement(
      "Voice target acknowledgement timed out. Reconnect the microphone.",
    );
    this.adapter.sendSession("targets", snapshot);
  }
}
