import { describe, expect, it, vi } from "vitest";
import { VoiceAdapter } from "../src/input/voice-adapter";
import { parseSnapshot } from "../src/input/platform/protocol.mjs";
import { VoiceResultPolicy } from "../src/input/platform/result-policy.mjs";
const envelope = (op: string, fields = {}) => ({ type: `typing-game:voice:v1:${op}`, version: 1, gameId: "space-typing", gameInstanceId: "instance", ...fields });
describe("child voice metadata adapter", () => {
  it("is inert in Typing, validates exact parent/instance, and requires offline capability before start", () => {
    const postMessage = vi.fn(), parent = { postMessage } as unknown as Window, receive = vi.fn();
    const adapter = new VoiceAdapter(parent, "https://typing-game.local", "instance", receive);
    expect(postMessage).not.toHaveBeenCalled(); expect(adapter.start("voice", 0)).toBe(false);
    const event = (op: string, fields = {}, origin = "https://typing-game.local", source = parent) => ({ data: envelope(op, fields), source, origin }) as MessageEvent<unknown>;
    expect(adapter.handleMessage(event("capabilities", { offlineEngineAvailable: true, reason: "test" }, "https://evil.example"))).toBe(false);
    expect(adapter.handleMessage(event("capabilities", { offlineEngineAvailable: true, reason: "test", gameInstanceId: "old" }))).toBe(false);
    adapter.probe(); expect(postMessage).toHaveBeenLastCalledWith(envelope("hello", { versions: [1] }), "https://typing-game.local");
    expect(adapter.handleMessage(event("capabilities", { offlineEngineAvailable: true, reason: "test" }))).toBe(true);
    expect(adapter.start("typing", 0)).toBe(false); expect(adapter.start("hybrid", 1)).toBe(true);
    adapter.handleMessage(event("ready", { sessionId: "s", inputEpoch: 1, audioEpoch: 0, engineId: "test", modelId: "test", sampleRate: 16000 }));
    expect(adapter.suspend(2)).toBe(true); expect(adapter.handleMessage(event("listening", { sessionId: "s", inputEpoch: 1, audioEpoch: 0, fromSample: 0 }))).toBe(false);
    adapter.stop(); expect(adapter.sendSession("resume")).toBe(false);
    expect(adapter.handleMessage(event("ready", { sessionId: "s", inputEpoch: 1, audioEpoch: 0, engineId: "test", modelId: "test", sampleRate: 16000 }))).toBe(false);
  });
  it("rejects wildcard parent configuration and shares the canonical parser/result policy", () => {
    expect(() => new VoiceAdapter({} as Window, "*", "instance", vi.fn())).toThrow();
    expect(() => new VoiceAdapter({} as Window, "https://typing-game.local/path", "instance", vi.fn())).toThrow();
    expect(() => parseSnapshot({ targets: [] })).toThrow(); expect(() => new VoiceResultPolicy({ retentionSeconds: 1 })).toThrow();
  });
});
