import { describe, expect, it, vi } from "vitest";
import { VoiceFeedbackState } from "../src/input/voice-feedback";
import { VoiceAdapter } from "../src/input/voice-adapter";
import { parseVoiceMessage } from "../src/input/platform/protocol.mjs";

const session = { sessionId: "session", inputEpoch: 1, audioEpoch: 0 };
const identity = { engineId: "test-engine", modelId: "test-model" };
const message = (op: string, fields = {}) => parseVoiceMessage({ type: `typing-game:voice:v1:${op}`, version: 1, gameId: "space-typing", gameInstanceId: "instance", ...fields });
const ready = (fields = {}) => message("ready", { ...session, ...identity, sampleRate: 16000, ...fields });
const feedback = (fields = {}) => message("feedback", { ...session, ...identity, feedbackId: "f1", streamEpoch: 1, result: "recognized", evidence: "final-utterance", transcript: "Red", audioStartSample: 300, audioEndSample: 3000, emittedAtMs: 2, ...fields });
const detection = (fields = {}) => message("detection", { ...session, ...identity, detectionId: "d1", snapshotId: "snapshot", streamEpoch: 1, unitId: "a", unitVersion: 1, eligibilityVersion: 1, form: "red", audioStartSample: 300, audioEndSample: 3000, evidence: "validated-keyword", emittedAtMs: 2, ...fields });
function listening() {
  const render = vi.fn(), state = new VoiceFeedbackState(render);
  state.setGameplayActive(true); state.setMode("voice"); state.handleMessage(ready());
  state.handleMessage(message("listening", { ...session, fromSample: 200 }));
  return { state, render };
}

describe("voice feedback presentation", () => {
  it("is hidden in Typing and outside gameplay, and requires a listening barrier", () => {
    const state = new VoiceFeedbackState(vi.fn());
    state.setGameplayActive(true); state.handleMessage(ready()); state.handleMessage(feedback());
    expect(state.getView().visible).toBe(false);
    state.setMode("hybrid"); state.handleMessage(ready()); state.handleMessage(feedback());
    expect(state.getView().status).toBe("preparing");
    state.setGameplayActive(false); state.handleMessage(feedback()); expect(state.getView().visible).toBe(false);
  });
  it("shows heard words without claiming damage; only the matching game resolution accepts them", () => {
    const { state } = listening(); state.handleMessage(detection());
    expect(state.getView()).toMatchObject({ transcript: "red", status: "heard", detail: "Checking…" });
    state.resolve("other", true, "accepted"); expect(state.getView().status).toBe("heard");
    state.handleMessage(message("resolution", { ...session, detectionId: "d1", accepted: true, reason: "accepted" }));
    expect(state.getView().status).toBe("heard");
    state.resolve("d1", true, "accepted"); expect(state.getView().status).toBe("accepted");
    state.resolve("d1", false, "keyboard-owned"); expect(state.getView().status).toBe("accepted");
    state.handleMessage(feedback({ detectionId: "d1", transcript: "RED!" }));
    expect(state.getView()).toMatchObject({ status: "accepted", transcript: "RED!" });
  });
  it("distinguishes no target, no recognition, and a word already owned by keyboard", () => {
    const { state } = listening(); state.handleMessage(feedback({ transcript: "banana" }));
    expect(state.getView()).toMatchObject({ status: "unmatched", transcript: "banana", detail: "No target match · try again" });
    state.handleMessage(feedback({ feedbackId: "f2", result: "unrecognized", transcript: null, audioStartSample: 3200, audioEndSample: 6000 }));
    expect(state.getView()).toMatchObject({ status: "unrecognized", transcript: null, detail: "Not recognized · speak again" });
    state.handleMessage(detection({ detectionId: "d2", audioStartSample: 6400, audioEndSample: 9000 }));
    state.resolve("d2", false, "keyboard-owned");
    expect(state.getView()).toMatchObject({ status: "unmatched", transcript: "red", detail: "Finish typing this word" });
  });
  it("late results and resolutions cannot replace the most recent utterance or expired feedback", () => {
    const { state } = listening(); state.handleMessage(detection());
    state.handleMessage(detection({ detectionId: "d2", form: "robot", audioStartSample: 3200, audioEndSample: 6000 }));
    state.resolve("d1", true, "accepted"); state.handleMessage(feedback());
    expect(state.getView()).toMatchObject({ transcript: "robot", status: "heard" });
    state.handleMessage(detection({ detectionId: "d1", audioStartSample: 6400, audioEndSample: 9000 }));
    expect(state.getView().transcript).toBe("robot");
    state.resolve("d2", true, "accepted"); state.expire();
    state.handleMessage(detection({ detectionId: "d2", form: "robot", audioStartSample: 3200, audioEndSample: 6000 }));
    state.resolve("d2", true, "accepted");
    expect(state.getView()).toMatchObject({ status: "listening", transcript: null });
  });
  it("rejects stale session/audio/engine and pre-gate speech; pause and mode changes clear words", () => {
    const { state } = listening();
    for (const fields of [{ sessionId: "old" }, { inputEpoch: 0 }, { audioEpoch: 1 }, { engineId: "other" }, { modelId: "other" }, { audioStartSample: 100 }]) state.handleMessage(feedback(fields));
    expect(state.getView().status).toBe("listening");
    state.handleMessage(detection()); state.suspend(); state.handleMessage(feedback({ audioEndSample: 6000 }));
    state.handleMessage(message("listening", { ...session, fromSample: 200 }));
    expect(state.getView()).toMatchObject({ status: "paused", transcript: null });
    state.setMode("typing"); expect(state.getView().visible).toBe(false);
  });
  it("shows an explicit unavailable state without displaying an earlier transcript", () => {
    const { state } = listening(); state.handleMessage(detection());
    state.handleMessage(message("error", { code: "local-runtime-failed", message: "permission denied" }));
    expect(state.getView()).toMatchObject({ status: "error", transcript: null, detail: "Microphone unavailable · retry" });
    state.expire(); expect(state.getView().status).toBe("error");
  });
});

describe("adapter to feedback flow", () => {
  it("routes only validated parent metadata and the game's own resolution; duplicate readiness cannot reset it", () => {
    const state = new VoiceFeedbackState(vi.fn()); state.setGameplayActive(true);
    const postMessage = vi.fn(), parent = { postMessage } as unknown as Window, gameReceive = vi.fn();
    const adapter = new VoiceAdapter(parent, "https://typing-game.local", "instance", gameReceive, state);
    const receive = (data: unknown, origin = "https://typing-game.local", source = parent) => adapter.handleMessage({ data, origin, source } as MessageEvent<unknown>);
    receive(message("capabilities", { offlineEngineAvailable: true, reason: "test-fixture" }));
    expect(adapter.start("voice", 1)).toBe(true); receive(ready());
    receive(message("listening", { ...session, fromSample: 200 }));
    expect(receive(detection(), "https://other.example")).toBe(false);
    expect(receive(detection(), undefined, {} as Window)).toBe(false);
    expect(state.getView().status).toBe("listening");
    receive(detection());
    expect(receive(message("resolution", { ...session, detectionId: "d1", accepted: true, reason: "accepted" }))).toBe(false);
    expect(state.getView().status).toBe("heard");
    expect(adapter.sendSession("resolution", { detectionId: "d1", accepted: true, reason: "accepted", gameInstanceId: "spoof", sessionId: "spoof" })).toBe(true);
    expect(postMessage).toHaveBeenLastCalledWith(message("resolution", { ...session, detectionId: "d1", accepted: true, reason: "accepted" }), "https://typing-game.local");
    expect(state.getView().status).toBe("accepted"); expect(receive(ready())).toBe(false);
    adapter.suspend(2); expect(state.getView().status).toBe("paused");
    expect(receive(feedback())).toBe(false); adapter.stop(); expect(state.getView().visible).toBe(false);
  });
});
