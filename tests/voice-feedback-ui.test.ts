import { afterEach, describe, expect, it, vi } from "vitest";
import { mountVoiceFeedback } from "../src/ui/voice-feedback";
import { parseVoiceMessage } from "../src/input/platform/protocol.mjs";

const message = (op: string, fields = {}) => parseVoiceMessage({ type: `typing-game:voice:v1:${op}`, version: 1, gameId: "space-typing", gameInstanceId: "instance", sessionId: "session", inputEpoch: 1, audioEpoch: 0, engineId: "test", modelId: "test", ...fields });
const heard = (fields = {}) => message("feedback", { feedbackId: "f1", streamEpoch: 1, result: "recognized", evidence: "final-utterance", transcript: "<img src=x onerror=alert(1)>", audioStartSample: 300, audioEndSample: 3000, emittedAtMs: 2, ...fields });
function mount(width = 1642) {
  const transcript = { hidden: true, textContent: "", set innerHTML(_value: string) { throw new Error("Transcript must use textContent"); } };
  const detail = { textContent: "" };
  const hotbar = { getBoundingClientRect: () => ({ left: (width - 760) / 2, right: (width + 760) / 2, width: 760, height: 64, top: 725 }) };
  const player = { getBoundingClientRect: () => ({ left: 8, right: 276, width: 268, height: 180, top: 611 }) };
  const style = { setProperty: vi.fn() };
  const root = { hidden: true, dataset: {} as Record<string, string>, style: { bottom: "" }, querySelector: (selector: string) => selector.includes("transcript") ? transcript : detail, parentElement: { style, getBoundingClientRect: () => ({ right: width, bottom: 799, width }), querySelectorAll: () => [hotbar, player] } };
  const mounted = mountVoiceFeedback(root as unknown as HTMLElement);
  mounted.state.setGameplayActive(true); mounted.state.setMode("hybrid");
  mounted.state.handleMessage(message("ready", { sampleRate: 16000 }));
  mounted.state.handleMessage(message("listening", { fromSample: 200 }));
  return { ...mounted, root, transcript, detail, style };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("compact voice HUD rendering", () => {
  it("renders speech as inert text and collapses four seconds after the latest utterance", () => {
    vi.useFakeTimers(); const ui = mount(); ui.state.handleMessage(heard());
    expect(ui.root.hidden).toBe(false); expect(ui.transcript.textContent).toBe("<img src=x onerror=alert(1)>");
    vi.advanceTimersByTime(3000);
    ui.state.handleMessage(heard({ feedbackId: "f2", transcript: "robot", audioStartSample: 3200, audioEndSample: 6000 }));
    vi.advanceTimersByTime(1000); expect(ui.transcript.textContent).toBe("robot");
    vi.advanceTimersByTime(3000); expect(ui.transcript.hidden).toBe(true); expect(ui.detail.textContent).toBe("Listening");
    ui.state.handleMessage(heard({ feedbackId: "f3", audioStartSample: 6400, audioEndSample: 9000 }));
    ui.state.setGameplayActive(false); vi.advanceTimersByTime(4000);
    expect(ui.root.hidden).toBe(true); expect(ui.transcript.textContent).toBe(""); ui.dispose();
  });
  it("keeps a free desktop corner and lifts above controls when the viewport narrows", () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const desktop = mount(); expect(desktop.root.style.bottom).toBe("12px"); desktop.dispose();
    const tablet = mount(1024); expect(Number.parseFloat(tablet.root.style.bottom)).toBeGreaterThan(799 - 725); tablet.dispose();
    const narrow = mount(390); expect(Number.parseFloat(narrow.root.style.bottom)).toBeGreaterThan(799 - 611);
    expect(narrow.style.setProperty).toHaveBeenCalledWith("--voice-feedback-clearance", "272px"); narrow.dispose();
  });
});
