import { describe, expect, it, vi } from "vitest";
import { VoiceAdapter } from "../src/input/voice-adapter";
import { parseSnapshot } from "../src/input/platform/protocol.mjs";
import { VoiceResultPolicy } from "../src/input/platform/result-policy.mjs";

const envelope = (op: string, fields = {}) => ({
  type: `typing-game:voice:v1:${op}`,
  version: 1,
  gameId: "space-typing",
  gameInstanceId: "instance",
  ...fields,
});

describe("child voice metadata adapter", () => {
  it("is inert in Typing, validates exact parent/instance, and requires offline capability before start", () => {
    const postMessage = vi.fn(),
      parent = { postMessage } as unknown as Window,
      receive = vi.fn();
    const adapter = new VoiceAdapter(
      parent,
      "https://typing-game.local",
      "instance",
      receive,
    );
    expect(postMessage).not.toHaveBeenCalled();
    expect(adapter.start("voice", 0)).toBe(false);
    const event = (
      op: string,
      fields = {},
      origin = "https://typing-game.local",
      source = parent,
    ) =>
      ({
        data: envelope(op, fields),
        source,
        origin,
      }) as MessageEvent<unknown>;
    expect(
      adapter.handleMessage(
        event(
          "capabilities",
          { offlineEngineAvailable: true, reason: "test" },
          "https://evil.example",
        ),
      ),
    ).toBe(false);
    expect(
      adapter.handleMessage(
        event("capabilities", {
          offlineEngineAvailable: true,
          reason: "test",
          gameInstanceId: "old",
        }),
      ),
    ).toBe(false);
    adapter.probe();
    expect(postMessage).toHaveBeenLastCalledWith(
      envelope("hello", { versions: [1] }),
      "https://typing-game.local",
    );
    expect(
      adapter.handleMessage(
        event("capabilities", {
          offlineEngineAvailable: true,
          reason: "test",
        }),
      ),
    ).toBe(true);
    expect(adapter.start("typing", 0)).toBe(false);
    expect(adapter.start("hybrid", 1)).toBe(true);
    adapter.handleMessage(
      event("ready", {
        sessionId: "s",
        inputEpoch: 1,
        audioEpoch: 0,
        engineId: "test",
        modelId: "test",
        sampleRate: 16000,
      }),
    );
    expect(adapter.suspend(2)).toBe(true);
    expect(
      adapter.handleMessage(
        event("listening", {
          sessionId: "s",
          inputEpoch: 1,
          audioEpoch: 0,
          fromSample: 0,
        }),
      ),
    ).toBe(false);
    adapter.stop();
    expect(adapter.sendSession("resume")).toBe(false);
    expect(
      adapter.handleMessage(
        event("ready", {
          sessionId: "s",
          inputEpoch: 1,
          audioEpoch: 0,
          engineId: "test",
          modelId: "test",
          sampleRate: 16000,
        }),
      ),
    ).toBe(false);
  });

  it("rejects wildcard parent configuration and shares the canonical parser/result policy", () => {
    expect(
      () => new VoiceAdapter({} as Window, "*", "instance", vi.fn()),
    ).toThrow();
    expect(
      () =>
        new VoiceAdapter(
          {} as Window,
          "https://typing-game.local/path",
          "instance",
          vi.fn(),
        ),
    ).toThrow();
    expect(() => parseSnapshot({ targets: [] })).toThrow();
    expect(() => new VoiceResultPolicy({ retentionSeconds: 1 })).toThrow();
  });

  it("stopping while permission is pending cancels the parent by instance and rejects late readiness", () => {
    const postMessage = vi.fn(),
      parent = { postMessage } as unknown as Window;
    const adapter = new VoiceAdapter(
      parent,
      "https://typing-game.local",
      "instance",
      vi.fn(),
    );
    const event = (op: string, fields = {}) =>
      ({
        source: parent,
        origin: "https://typing-game.local",
        data: envelope(op, fields),
      }) as MessageEvent;
    adapter.handleMessage(
      event("capabilities", {
        offlineEngineAvailable: true,
        reason: "test",
      }),
    );
    adapter.start("voice", 1);
    adapter.stop();
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "typing-game:voice:v1:configure",
        mode: "typing",
        inputEpoch: 2,
      }),
      "https://typing-game.local",
    );
    expect(
      adapter.handleMessage(
        event("ready", {
          sessionId: "late",
          inputEpoch: 1,
          audioEpoch: 0,
          engineId: "test",
          modelId: "test",
          sampleRate: 16000,
          fromSample: 0,
        }),
      ),
    ).toBe(false);
  });

  it("normalizes permission-denied failures before gameplay and feedback consume them", () => {
    const postMessage = vi.fn(),
      parent = { postMessage } as unknown as Window,
      receive = vi.fn();
    const feedback = {
      setMode: vi.fn(),
      handleMessage: vi.fn(),
      suspend: vi.fn(),
      stop: vi.fn(),
      resolve: vi.fn(),
    };
    const adapter = new VoiceAdapter(
      parent,
      "https://typing-game.local",
      "instance",
      receive,
      feedback,
    );
    const event = (op: string, fields = {}) =>
      ({
        source: parent,
        origin: "https://typing-game.local",
        data: envelope(op, fields),
      }) as MessageEvent;

    expect(
      adapter.handleMessage(
        event("error", {
          code: "local-runtime-failed",
          message: "NotAllowedError: permission denied",
        }),
      ),
    ).toBe(true);

    const actionable = expect.objectContaining({
      code: "local-runtime-failed",
      message:
        "Microphone permission denied. Allow microphone access in browser and system settings, then retry.",
    });
    expect(feedback.handleMessage).toHaveBeenLastCalledWith(actionable);
    expect(receive).toHaveBeenLastCalledWith(actionable);
  });

  it("bounds recognition backlog, preserves FIFO order, yields between batches, and measures acceptance latency", () => {
    const tasks: Array<() => void> = [];
    let now = 10;
    const postMessage = vi.fn(),
      parent = { postMessage } as unknown as Window,
      delivered: string[] = [];
    let adapter!: VoiceAdapter;
    const receive = vi.fn((message: { type: string; detectionId?: string }) => {
      if (!message.type.endsWith(":detection")) return;
      delivered.push(String(message.detectionId));
      adapter.sendSession("resolution", {
        detectionId: message.detectionId,
        accepted: true,
        reason: "accepted",
      });
    });
    adapter = new VoiceAdapter(
      parent,
      "https://typing-game.local",
      "instance",
      receive as never,
      undefined,
      {
        schedule: (task) => tasks.push(task),
        now: () => now,
        maxPendingDetections: 2,
        detectionBatchSize: 1,
      },
    );
    const event = (op: string, fields = {}) =>
      ({
        source: parent,
        origin: "https://typing-game.local",
        data: envelope(op, fields),
      }) as MessageEvent;
    adapter.handleMessage(
      event("capabilities", {
        offlineEngineAvailable: true,
        reason: "test",
      }),
    );
    expect(adapter.start("hybrid", 1)).toBe(true);
    adapter.handleMessage(
      event("ready", {
        sessionId: "s",
        inputEpoch: 1,
        audioEpoch: 0,
        engineId: "test",
        modelId: "test",
        sampleRate: 16000,
        fromSample: 0,
      }),
    );

    const detection = (id: string, start: number, end: number) =>
      event("detection", {
        sessionId: "s",
        inputEpoch: 1,
        audioEpoch: 0,
        snapshotId: "snapshot",
        detectionId: id,
        streamEpoch: 1,
        unitId: id,
        unitVersion: 1,
        eligibilityVersion: 1,
        form: id,
        audioStartSample: start,
        audioEndSample: end,
        engineId: "test",
        modelId: "test",
        evidence: "final-utterance",
        emittedAtMs: 1,
      });

    expect(adapter.handleMessage(detection("d1", 100, 200))).toBe(true);
    expect(adapter.handleMessage(detection("d2", 300, 400))).toBe(true);
    expect(adapter.handleMessage(detection("d3", 500, 600))).toBe(true);
    expect(delivered).toEqual([]);
    expect(adapter.getAcceptanceMetrics()).toMatchObject({
      received: 3,
      enqueued: 2,
      pending: 2,
      highWaterMark: 2,
      accepted: 0,
      rejected: 1,
      overflowRejected: 1,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "typing-game:voice:v1:resolution",
        detectionId: "d3",
        accepted: false,
        reason: "backlog-full",
      }),
      "https://typing-game.local",
    );

    now = 35;
    tasks.shift()!();
    expect(delivered).toEqual(["d1"]);
    expect(adapter.getAcceptanceMetrics()).toMatchObject({
      pending: 1,
      accepted: 1,
      lastRecognitionToAcceptanceMs: 25,
      maxRecognitionToAcceptanceMs: 25,
    });
    expect(tasks).toHaveLength(1);

    now = 50;
    tasks.shift()!();
    expect(delivered).toEqual(["d1", "d2"]);
    expect(adapter.getAcceptanceMetrics()).toMatchObject({
      pending: 0,
      accepted: 2,
      rejected: 1,
      lastRecognitionToAcceptanceMs: 40,
      maxRecognitionToAcceptanceMs: 40,
    });
  });

  it("rejects queued recognition at an epoch barrier and stale scheduled work cannot re-enter gameplay", () => {
    const tasks: Array<() => void> = [];
    const postMessage = vi.fn(),
      parent = { postMessage } as unknown as Window,
      receive = vi.fn();
    const adapter = new VoiceAdapter(
      parent,
      "https://typing-game.local",
      "instance",
      receive,
      undefined,
      {
        schedule: (task) => tasks.push(task),
        now: () => 0,
        maxPendingDetections: 4,
        detectionBatchSize: 1,
      },
    );
    const event = (op: string, fields = {}) =>
      ({
        source: parent,
        origin: "https://typing-game.local",
        data: envelope(op, fields),
      }) as MessageEvent;
    adapter.handleMessage(
      event("capabilities", {
        offlineEngineAvailable: true,
        reason: "test",
      }),
    );
    adapter.start("voice", 1);
    adapter.handleMessage(
      event("ready", {
        sessionId: "s",
        inputEpoch: 1,
        audioEpoch: 0,
        engineId: "test",
        modelId: "test",
        sampleRate: 16000,
        fromSample: 0,
      }),
    );
    adapter.handleMessage(
      event("detection", {
        sessionId: "s",
        inputEpoch: 1,
        audioEpoch: 0,
        snapshotId: "snapshot",
        detectionId: "queued",
        streamEpoch: 1,
        unitId: "1",
        unitVersion: 1,
        eligibilityVersion: 1,
        form: "planet",
        audioStartSample: 100,
        audioEndSample: 200,
        engineId: "test",
        modelId: "test",
        evidence: "final-utterance",
        emittedAtMs: 1,
      }),
    );
    expect(receive).not.toHaveBeenCalledWith(
      expect.objectContaining({ detectionId: "queued" }),
    );

    expect(adapter.suspend(2)).toBe(true);
    expect(adapter.getAcceptanceMetrics()).toMatchObject({
      pending: 0,
      accepted: 0,
      rejected: 1,
      staleRejected: 1,
    });
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "typing-game:voice:v1:resolution",
        detectionId: "queued",
        accepted: false,
        reason: "stale-input-epoch",
        inputEpoch: 1,
      }),
      "https://typing-game.local",
    );

    tasks.shift()!();
    expect(receive).not.toHaveBeenCalledWith(
      expect.objectContaining({ detectionId: "queued" }),
    );
    expect(adapter.getAcceptanceMetrics().accepted).toBe(0);
  });
});
