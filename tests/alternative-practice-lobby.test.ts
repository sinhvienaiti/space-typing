import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  alternativeConfig: null as any,
  alternativeUi: {
    setRoom: vi.fn(),
    setMatch: vi.fn(),
    setInputResult: vi.fn(),
    destroy: vi.fn(),
  },
  roomUi: {
    currentLocalRoom: () => null,
    currentRemoteRoom: () => null,
    setRemoteRoom: vi.fn(),
    clearRemoteRoom: vi.fn(),
    setStatus: vi.fn(),
    setConnectionLabel: vi.fn(),
    setConnectionState: vi.fn(),
    setRankedQueueStatus: vi.fn(),
    setRankedProfile: vi.fn(),
    setRankedMatchFound: vi.fn(),
    setRoomList: vi.fn(),
    refreshSelf: vi.fn(),
  },
}));

vi.mock("../src/duel/room-ui", () => ({
  installDuelRoomUi: () => harness.roomUi,
}));
vi.mock("../src/duel/alternative-room-ui", () => ({
  installAlternativeDuelRoomUi: (config: unknown) => {
    harness.alternativeConfig = config;
    return harness.alternativeUi;
  },
}));

import { installDuelOnlineRoomController } from "../src/duel/online-room-controller";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

describe("R03 alternative local practice lobby", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T20:00:00.000Z"));
    harness.alternativeConfig = null;
    for (const value of Object.values(harness.alternativeUi)) {
      if (typeof value === "function" && "mockClear" in value) (value as ReturnType<typeof vi.fn>).mockClear();
    }
    harness.roomUi.setStatus.mockClear();
    vi.stubGlobal("sessionStorage", memoryStorage());
    vi.stubGlobal("document", { querySelector: () => null });
    vi.stubGlobal("window", {
      location: { protocol: "http:", host: "127.0.0.1:3004" },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts both alternative practice modes offline and applies Reflex input locally", () => {
    installDuelOnlineRoomController({ clientVersion: "test" });
    const config = harness.alternativeConfig as {
      onPracticeStart(mode: "reflex" | "word-chain"): void;
      onInput(value: string): boolean;
    };
    expect(config).not.toBeNull();

    config.onPracticeStart("word-chain");
    expect(harness.alternativeUi.setMatch).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "word-chain", matchType: "practice", status: "active" }),
    );

    config.onPracticeStart("reflex");
    const reflexView = harness.alternativeUi.setMatch.mock.calls.at(-1)?.[0] as {
      mode: string;
      matchType: string;
      challenge: { kind: string; prompt: string };
    };
    expect(reflexView).toMatchObject({
      mode: "reflex",
      matchType: "practice",
      challenge: { kind: "reflex" },
    });

    expect(config.onInput(reflexView.challenge.prompt)).toBe(true);
    expect(harness.alternativeUi.setInputResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ accepted: true, sequence: 1, reason: "accepted" }),
    );
    expect(harness.roomUi.setStatus).toHaveBeenCalledWith(
      expect.stringContaining("local/offline"),
    );
  });
});
