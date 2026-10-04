import { afterEach, expect, it, vi } from "vitest";
import { VoiceSession } from "../src/input/voice-session";
import type { VoiceTarget } from "../src/input/platform/protocol.mjs";
const ns = "typing-game:voice:v1:";
function setup(mode: "voice" | "hybrid" = "hybrid", phase = "playing") {
  vi.useFakeTimers();
  const postMessage = vi.fn(),
    parent = { postMessage } as unknown as Window;
  vi.stubGlobal("window", { parent });
  const state = { phase, revision: 0 };
  const targets: Array<
    VoiceTarget & {
      keyboardOwned: boolean;
      terminal: boolean;
      resolving: boolean;
    }
  > = ["orbit", "planet"].map((form, i) => ({
    unitId: String(i),
    unitVersion: 1,
    eligibilityVersion: 1,
    forms: [form],
    capability: "word",
    eligible: true,
    eligibleFromSample: 0,
    keyboardOwned: false,
    terminal: false,
    resolving: false,
  }));
  const complete = vi.fn((id: string) => {
    const target = targets.find((t) => t.unitId === id)!;
    target.terminal = true;
    target.eligible = false;
    return true;
  });
  const game = {
    getPhase: () => state.phase,
    getVoiceTargets: () => targets,
    getVoiceVocabularyForms: () => ["orbit", "planet"],
    getVoiceVocabularyRevision: () => state.revision,
    completeVoiceUnit: complete,
    togglePause: vi.fn(() => {
      state.phase = "paused";
    }),
  };
  const onState = vi.fn();
  const session = new VoiceSession(
    parent,
    "https://typing-game.local",
    "instance",
    () => game,
    {
      handleMessage: vi.fn(),
      resolve: vi.fn(),
      stop: vi.fn(),
      setMode: vi.fn(),
      suspend: vi.fn(),
    },
    onState,
  );
  const last = (op: string) =>
    [...postMessage.mock.calls]
      .reverse()
      .find(([m]) => m.type === ns + op)?.[0];
  const send = (op: string, fields = {}) =>
    session.handleMessage({
      source: parent,
      origin: "https://typing-game.local",
      data: {
        ...fields,
        version: 1,
        type: ns + op,
        gameId: "space-typing",
        gameInstanceId: "instance",
      },
    } as MessageEvent);
  const prepare = (epoch: number, audioEpoch = 0, fromSample = 0, id = "s") => {
    send("ready", {
      sessionId: id,
      inputEpoch: epoch,
      audioEpoch,
      engineId: "test",
      modelId: "test",
      sampleRate: 16000,
      fromSample,
    });
    const request = last("vocabulary-check");
    send("vocabulary-checked", {
      sessionId: id,
      inputEpoch: epoch,
      audioEpoch,
      requestId: request.requestId,
      unsupported: [],
    });
    const snapshot = last("targets");
    send("targets-applied", {
      sessionId: id,
      inputEpoch: epoch,
      audioEpoch,
      snapshotId: snapshot.snapshotId,
      ready: snapshot.targets.map((t: VoiceTarget) => t.unitId),
      unsupported: [],
      appliedAtSample: fromSample,
    });
    send(audioEpoch ? "listening-resumed" : "listening", {
      sessionId: id,
      inputEpoch: epoch,
      audioEpoch,
      fromSample,
    });
    return snapshot;
  };
  const start = (sample = 0, id = "s") => {
    session.setMode(mode);
    session.start();
    send("capabilities", { offlineEngineAvailable: true, reason: "test" });
    return prepare(last("start").inputEpoch, 0, sample, id);
  };
  return {
    session,
    state,
    game,
    targets,
    complete,
    onState,
    last,
    send,
    prepare,
    start,
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("metadata readiness precedes start; owned A rejects while old-snapshot B still completes", () => {
  const s = setup();
  const snapshot = s.start();
  expect(s.session.isReady()).toBe(true);
  expect(s.session.isWorldReady()).toBe(true);
  s.targets[0]!.keyboardOwned = true;
  s.targets[0]!.eligible = false;
  s.targets[0]!.eligibilityVersion++;
  const detect = (unitId: string, form: string, id: string) =>
    s.send("detection", {
      ...snapshot,
      unitId,
      unitVersion: 1,
      eligibilityVersion: 1,
      form,
      detectionId: id,
      streamEpoch: 1,
      audioStartSample: 1600,
      audioEndSample: 3200,
      engineId: "test",
      modelId: "test",
      evidence: "final-utterance",
      emittedAtMs: 100,
    });
  s.send("clock", {
    sessionId: snapshot.sessionId,
    inputEpoch: snapshot.inputEpoch,
    audioEpoch: 0,
    sample: 3300,
  });
  detect("0", "orbit", "owned");
  expect(s.complete).not.toHaveBeenCalled();
  detect("1", "planet", "accepted");
  expect(s.complete).toHaveBeenCalledTimes(1);
  expect(s.complete).toHaveBeenLastCalledWith("1", 1, 1);
  detect("1", "planet", "accepted");
  expect(s.complete).toHaveBeenCalledTimes(1);
  s.session.stop();
});
it("pause barriers are synchronous and old audio cannot cross a resume", () => {
  const s = setup();
  const old = s.start();
  s.state.phase = "paused";
  s.session.phaseChanged();
  expect(s.last("suspend").inputEpoch).toBeGreaterThan(old.inputEpoch);
  expect(s.session.isReady()).toBe(true);
  s.state.phase = "playing";
  s.session.phaseChanged();
  const epoch = s.last("resume").inputEpoch;
  const next = s.prepare(epoch, 1, 5000);
  expect(next.audioEpoch).toBe(1);
  s.send("detection", {
    ...old,
    unitId: "1",
    unitVersion: 1,
    eligibilityVersion: 1,
    form: "planet",
    detectionId: "old",
    streamEpoch: 1,
    audioStartSample: 1600,
    audioEndSample: 3200,
    engineId: "test",
    modelId: "test",
    evidence: "final-utterance",
    emittedAtMs: 100,
  });
  expect(s.complete).not.toHaveBeenCalled();
  s.session.stop();
});
it("reconnecting resets capture sample history; a new low-clock session can publish", () => {
  const s = setup();
  s.start(500000);
  s.session.stop();
  const next = s.start(0, "new-session");
  expect(next.publishedAtSample).toBe(0);
  expect(s.session.isReady()).toBe(true);
  s.session.stop();
});
it("Hybrid errors keep keyboard combat running; Voice errors pause the encounter", () => {
  for (const mode of ["voice", "hybrid"] as const) {
    const s = setup(mode);
    s.start();
    s.send("error", {
      code: "microphone-runtime-failed",
      message: "Microphone disconnected",
    });
    expect(s.game.togglePause).toHaveBeenCalledTimes(mode === "voice" ? 1 : 0);
    expect(s.session.isReady()).toBe(false);
    expect(s.onState).toHaveBeenLastCalledWith(
      "error",
      "Microphone disconnected",
    );
    s.session.stop();
  }
});
it("local pronunciation waits for a gate ACK and a fresh audio epoch before returning", async () => {
  const s = setup();
  const snapshot = s.start(),
    play = vi.fn(async () => {});
  const output = s.session.withAudioOutput(play);
  expect(s.session.isWorldReady()).toBe(false);
  expect(play).not.toHaveBeenCalled();
  const intent = s.last("audio-output-intent");
  s.send("gate-closed", {
    sessionId: "s",
    inputEpoch: snapshot.inputEpoch,
    generation: intent.generation,
    fromSample: 500,
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(play).toHaveBeenCalledTimes(1);
  s.send("ready", {
    sessionId: "s",
    inputEpoch: snapshot.inputEpoch,
    audioEpoch: 1,
    engineId: "test",
    modelId: "test",
    sampleRate: 16000,
    fromSample: 1000,
  });
  await output;
  expect(s.session.isWorldReady()).toBe(false);
  expect(s.last("audio-output-ended").generation).toBe(intent.generation);
  s.session.stop();
});
it("changed vocabulary is revalidated before the next encounter is allowed to run", async () => {
  const s = setup();
  s.start();
  s.state.revision++;
  expect(s.session.isReady()).toBe(false);
  const ready = s.session.ensureVocabularyReady();
  const epoch = s.last("resume").inputEpoch;
  s.prepare(epoch, 1, 1000);
  await ready;
  expect(s.session.isReady()).toBe(true);
  s.session.stop();
});
it("a missing parent/start response fails visibly and leaves no readiness after the preparation deadline", () => {
  const s = setup("voice");
  s.session.setMode("voice");
  s.session.start();
  vi.advanceTimersByTime(90_000);
  expect(s.onState).toHaveBeenLastCalledWith(
    "error",
    expect.stringContaining("timed out"),
  );
  expect(s.session.isReady()).toBe(false);
  expect(s.game.togglePause).toHaveBeenCalledOnce();
  s.session.stop();
});
it("lost target ACK pauses Voice instead of leaving the world frozen indefinitely", () => {
  const s = setup("voice");
  s.start();
  s.targets[1]!.unitVersion++;
  vi.advanceTimersByTime(50);
  vi.advanceTimersByTime(5_000);
  expect(s.game.togglePause).toHaveBeenCalledOnce();
  expect(s.onState).toHaveBeenLastCalledWith(
    "error",
    expect.stringContaining("acknowledgement timed out"),
  );
  s.session.stop();
});
