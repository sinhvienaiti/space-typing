import { describe, expect, it } from "vitest";
import {
  HIDDEN_CONTENT_REGISTRY,
  createHiddenDiscoveryState,
  hiddenCodexEntries,
  hiddenDiscoveryChance,
  isValidHiddenDiscoveryState,
  rollHiddenDiscovery,
  sanitizeHiddenDiscoveryState,
} from "../src/discovery/hidden-content";

describe("hidden-content discovery", () => {
  it("starts concealed and renders Codex placeholders", () => {
    const entries = hiddenCodexEntries(createHiddenDiscoveryState());
    expect(entries).toHaveLength(6);
    expect(entries.every((entry) => entry.title === "???")).toBe(true);
    expect(entries.every((entry) => entry.reward === "???")).toBe(true);
  });

  it("does not roll the same or an older Campaign stage twice", () => {
    const first = rollHiddenDiscovery(
      createHiddenDiscoveryState(),
      30,
      0,
      () => 0.999999,
    );
    expect(first.rolled).toBe(true);
    expect(first.state.lastRollStage).toBe(30);

    const replay = rollHiddenDiscovery(first.state, 30, 100, () => 0);
    expect(replay.rolled).toBe(false);
    expect(replay.state).toEqual(first.state);
  });

  it("uses Luck and drought without exceeding each discovery cap", () => {
    const definition = HIDDEN_CONTENT_REGISTRY["ghost-contract"];
    const base = hiddenDiscoveryChance(definition, 0, 0);
    const lucky = hiddenDiscoveryChance(definition, 80, 0);
    const dry = hiddenDiscoveryChance(definition, 80, 50);

    expect(lucky).toBeGreaterThan(base);
    expect(dry).toBeGreaterThan(lucky);
    expect(dry).toBeLessThanOrEqual(definition.maxChance);
  });

  it("increments eligible drought and guarantees overdue content", () => {
    const state = createHiddenDiscoveryState();
    state.lastRollStage = 29;
    state.drought["ghost-contract"] =
      HIDDEN_CONTENT_REGISTRY["ghost-contract"].guaranteeAfter;

    const result = rollHiddenDiscovery(state, 30, 0, () => 0.999999);
    expect(result.discovery?.id).toBe("ghost-contract");
    expect(result.state.discovered).toContain("ghost-contract");
    expect(result.state.drought["ghost-contract"]).toBe(0);
  });

  it("reveals only discovered Codex entries", () => {
    const state = createHiddenDiscoveryState();
    state.discovered = ["black-market-signal"];

    const entries = hiddenCodexEntries(state);
    expect(
      entries.find((entry) => entry.id === "black-market-signal"),
    ).toMatchObject({
      title: "Black Market Signal",
      reward: "Hidden Shop route",
      discovered: true,
    });
    expect(
      entries.find((entry) => entry.id === "void-warden")?.title,
    ).toBe("???");
  });

  it("sanitizes malformed state and validates strict persisted data", () => {
    const sanitized = sanitizeHiddenDiscoveryState({
      discovered: ["ghost-contract", "ghost-contract", "bad"],
      drought: {
        "black-market-signal": 999,
        "ghost-contract": -3,
      },
      lastRollStage: 5000,
    });

    expect(sanitized.discovered).toEqual(["ghost-contract"]);
    expect(sanitized.drought["black-market-signal"]).toBe(60);
    expect(sanitized.drought["ghost-contract"]).toBe(0);
    expect(sanitized.lastRollStage).toBe(1000);
    expect(isValidHiddenDiscoveryState(sanitized)).toBe(true);
    expect(
      isValidHiddenDiscoveryState({
        ...sanitized,
        drought: {
          ...sanitized.drought,
          "echo-rift": -1,
        },
      }),
    ).toBe(false);
  });
});
