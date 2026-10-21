import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LaunchTransaction,
  deployWarpBlocker,
  resumablePreparedSortie,
  type LaunchSortie,
} from "../src/campaign/launch-transaction";
import { createWarpCharge, type WarpCharge } from "../src/economy/warp-charge";
import type { Sortie, SortieContext } from "../src/persistence/account-state";
import { createTestGame } from "./helpers/game-harness";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";

const now = Date.UTC(2026, 9, 21);
function tanks(current: number, reserve = 0): WarpCharge {
  return { ...createWarpCharge(now), current, reserve };
}
const context: SortieContext = {
  stage: 4,
  tier: 0,
  activity: "campaign",
  inputMode: "voice",
  gameplayMode: "combat",
  difficulty: "balanced",
  vocabulary: "english-v1",
  contentVersion: "test",
  seed: 7,
};
function attempt(phase: Sortie["phase"], ctx = context): Sortie {
  return {
    id: "sortie-1",
    context: structuredClone(ctx),
    phase,
    activeCost: 10,
    reserveCost: 0,
    reviveSequence: 0,
  };
}
function sortie(): LaunchSortie & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    activate: vi.fn(async () => {
      calls.push("activate");
    }),
    deactivate: vi.fn(async () => {
      calls.push("deactivate");
    }),
  };
}

describe("deploy Warp gate", () => {
  it("refuses a paid Deploy the tanks cannot cover and says how much is missing", () => {
    expect(deployWarpBlocker(tanks(7), { free: false, prepared: false })).toBe(
      "Not enough Warp · 3 more to Deploy. Practice is free.",
    );
    expect(deployWarpBlocker(tanks(0), { free: false, prepared: false })).toMatch(/10 more/);
  });
  it("counts Reserve, because Deploy asks before using it", () => {
    expect(deployWarpBlocker(tanks(4, 6), { free: false, prepared: false })).toBeNull();
    expect(deployWarpBlocker(tanks(4, 5), { free: false, prepared: false })).toMatch(/1 more/);
    expect(deployWarpBlocker(tanks(10), { free: false, prepared: false })).toBeNull();
  });
  it("never blocks a free run or a prepared sortie that was already paid", () => {
    expect(deployWarpBlocker(tanks(0), { free: true, prepared: false })).toBeNull();
    expect(deployWarpBlocker(tanks(0), { free: false, prepared: true })).toBeNull();
  });
});

describe("prepared sortie resume", () => {
  it("resumes a prepared sortie with the same context instead of paying again", () => {
    expect(resumablePreparedSortie(attempt("prepared"), { ...context })).toBe("sortie-1");
  });
  it("has nothing to resume without a prepared sortie", () => {
    expect(resumablePreparedSortie(null, context)).toBeNull();
    expect(resumablePreparedSortie(attempt("active"), context)).toBeNull();
    expect(resumablePreparedSortie(attempt("defeat-pending"), context)).toBeNull();
  });
  it("refuses another context before anything is spent", () => {
    expect(() =>
      resumablePreparedSortie(attempt("prepared"), { ...context, stage: 5 }),
    ).toThrow("Continue or abandon the prepared sortie first");
  });
});

describe("launch transaction", () => {
  it("abort puts back every change, newest first, and only once", () => {
    const launch = new LaunchTransaction();
    const order: string[] = [];
    launch.onAbort(() => order.push("practice flag"));
    launch.onAbort(() => order.push("title and music"));
    launch.abort();
    launch.abort();
    expect(order).toEqual(["title and music", "practice flag"]);
  });

  it("keeps undoing when one step fails", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const launch = new LaunchTransaction();
    const order: string[] = [];
    launch.onAbort(() => order.push("first"));
    launch.onAbort(() => {
      throw new Error("broken");
    });
    launch.abort();
    expect(order).toEqual(["first"]);
    expect(error).toHaveBeenCalledOnce();
  });

  it("a started stage keeps the launch's changes", async () => {
    const launch = new LaunchTransaction();
    const undo = vi.fn();
    const paid = sortie();
    launch.onAbort(undo);
    const start = vi.fn(() => {
      paid.calls.push("start");
      return true;
    });
    await launch.start(paid, () => null, start);
    launch.abort();
    expect(paid.calls).toEqual(["activate", "start"]);
    expect(undo).not.toHaveBeenCalled();
    await expect(launch.start(paid, () => null, start)).rejects.toThrow(/settled/);
  });

  it("a refusal before activation keeps the sortie prepared and never starts the stage", async () => {
    const launch = new LaunchTransaction();
    const paid = sortie();
    const start = vi.fn(() => true);
    await expect(
      launch.start(paid, () => "Microphone is not ready", start),
    ).rejects.toThrow(
      "Microphone is not ready · Sortie kept: Deploy again resumes it, no new Warp",
    );
    expect(paid.calls).toEqual([]);
    expect(start).not.toHaveBeenCalled();
  });

  it("a stage refused after activation puts the sortie back to prepared", async () => {
    const launch = new LaunchTransaction();
    const paid = sortie();
    let micReady = true;
    paid.activate = vi.fn(async () => {
      paid.calls.push("activate");
      micReady = false; // The microphone dropped while the activation was saved.
    });
    const undo = vi.fn();
    launch.onAbort(undo);
    await expect(
      launch.start(
        paid,
        () => (micReady ? null : "Microphone is not ready"),
        () => micReady,
      ),
    ).rejects.toThrow(/Microphone is not ready · Sortie kept/);
    expect(paid.calls).toEqual(["activate", "deactivate"]);
    launch.abort();
    expect(undo).toHaveBeenCalledOnce();
  });

  it("a failed activation never starts the stage and still lets the launch abort", async () => {
    const launch = new LaunchTransaction();
    const paid = sortie();
    paid.activate = vi.fn(async () => {
      throw new Error("Account changed in another tab. Reload; Practice remains free.");
    });
    const start = vi.fn(() => true);
    const undo = vi.fn();
    launch.onAbort(undo);
    await expect(launch.start(paid, () => null, start)).rejects.toThrow(/another tab/);
    expect(start).not.toHaveBeenCalled();
    expect(paid.deactivate).not.toHaveBeenCalled();
    launch.abort();
    expect(undo).toHaveBeenCalledOnce();
  });

  it("a free run has no sortie to keep", async () => {
    const launch = new LaunchTransaction();
    await expect(
      launch.start(null, () => "Microphone is not ready", () => true),
    ).rejects.toThrow(/^Microphone is not ready$/);
    await expect(
      new LaunchTransaction().start(null, () => null, () => false),
    ).rejects.toThrow(/^The stage could not start$/);
  });
});

describe("Game.startStage readiness", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const difficulty = difficultyFor({
    stage: 1,
    vocabularyLevel: 1,
    mode: "balanced",
    recentWpm: 60,
    recentAccuracy: 96,
  });

  it("reports a refused voice stage instead of silently staying on the title", () => {
    const game = createTestGame();
    let ready = false;
    game.setVoiceReadiness(() => ready);
    game.setInputMode("voice");
    expect(game.canStartStage()).toBe(false);
    expect(game.startStage(createStageConfig(1), difficulty)).toBe(false);
    expect(game.getPhase()).toBe("title");
    ready = true;
    expect(game.canStartStage()).toBe(true);
    expect(game.startStage(createStageConfig(1), difficulty)).toBe(true);
    expect(game.getPhase()).toBe("playing");
    game.destroy();
  });

  it("typing stages never wait for the microphone", () => {
    const game = createTestGame();
    game.setVoiceReadiness(() => false);
    expect(game.canStartStage()).toBe(true);
    expect(game.startStage(createStageConfig(1), difficulty)).toBe(true);
    game.destroy();
  });
});
