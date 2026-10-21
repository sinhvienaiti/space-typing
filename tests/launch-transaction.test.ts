import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LaunchTransaction,
  deployWarpBlocker,
  deployWarpRefusal,
  openSortieStep,
  resumablePreparedSortie,
  runLaunch,
  type LaunchPayment,
  type LaunchPlan,
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
type FakeSortie = LaunchSortie & { calls: string[] };
function sortie(
  calls: string[] = [],
  inputMode: LaunchSortie["inputMode"] = "voice",
): FakeSortie {
  return {
    calls,
    inputMode,
    activate: vi.fn(async () => {
      calls.push("activate");
    }),
    deactivate: vi.fn(async () => {
      calls.push("deactivate");
    }),
  };
}
/** Pays for `paid` the way prepareSortie does once the Warp is spent; records "prepare". */
function payment(paid: FakeSortie): LaunchPayment {
  return vi.fn(async () => {
    paid.calls.push("prepare");
    return paid;
  });
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
  it("a local wallet refuses the click; a server wallet lets the server decide", () => {
    const options = { free: false, prepared: false };
    expect(deployWarpRefusal(tanks(3), { ...options, serverWallet: false })).toMatch(/7 more/);
    // This device's tanks may be behind the server's (a gift or a refuel elsewhere).
    expect(deployWarpRefusal(tanks(3), { ...options, serverWallet: true })).toBeNull();
    expect(deployWarpRefusal(tanks(10), { ...options, serverWallet: false })).toBeNull();
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

describe("open sortie before a launch", () => {
  const deploy = { practice: false, canWrite: true };
  it("leaves nothing to settle without a sortie, in a read-only tab, or for a prepared one Deploy resumes", () => {
    expect(openSortieStep({ ...deploy, phase: "title", attempt: null })).toBe("none");
    expect(openSortieStep({ ...deploy, canWrite: false, phase: "paused", attempt: "active" })).toBe("none");
    expect(openSortieStep({ ...deploy, phase: "title", attempt: "prepared" })).toBe("none");
  });
  it("Practice asks before it ends a prepared (paid) sortie and ends a running one as failed", () => {
    const practice = { practice: true, canWrite: true };
    expect(openSortieStep({ ...practice, phase: "title", attempt: "prepared" })).toBe("drop-prepared");
    expect(openSortieStep({ ...practice, phase: "paused", attempt: "active" })).toBe("fail");
    expect(openSortieStep({ ...practice, phase: "gameover", attempt: "defeat-pending" })).toBe("fail");
  });
  it("Next or Replay on a clear whose settlement did not save commits the clear, never abandons it", () => {
    expect(openSortieStep({ ...deploy, phase: "stageclear", attempt: "active" })).toBe("commit-clear");
  });
  it("a restart abandons the running sortie (after the next Deploy's preflight)", () => {
    expect(openSortieStep({ ...deploy, phase: "paused", attempt: "active" })).toBe("abandon");
    expect(openSortieStep({ ...deploy, phase: "title", attempt: "active" })).toBe("abandon");
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
    error.mockRestore();
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
    await launch.start(payment(paid), () => null, start);
    launch.abort();
    expect(paid.calls).toEqual(["prepare", "activate", "start"]);
    expect(undo).not.toHaveBeenCalled();
    await expect(launch.start(payment(paid), () => null, start)).rejects.toThrow(/settled/);
  });

  it("a refusal before paying spends nothing and never starts the stage", async () => {
    const launch = new LaunchTransaction();
    const paid = sortie();
    const pay = payment(paid);
    const start = vi.fn(() => true);
    await expect(
      launch.start(pay, () => "Microphone is not ready", start),
    ).rejects.toThrow(/^Microphone is not ready$/);
    expect(pay).not.toHaveBeenCalled();
    expect(paid.calls).toEqual([]);
    expect(start).not.toHaveBeenCalled();
  });

  it("a microphone that drops while the Warp is spent keeps the sortie prepared for Voice", async () => {
    const launch = new LaunchTransaction();
    const paid = sortie();
    let micReady = true;
    const pay = vi.fn(async () => {
      paid.calls.push("prepare");
      micReady = false;
      return paid;
    });
    await expect(
      launch.start(pay, () => (micReady ? null : "Microphone is not ready"), () => true),
    ).rejects.toThrow(
      "Microphone is not ready · Sortie kept for Voice: connect the microphone and Deploy again, no new Warp",
    );
    expect(paid.calls).toEqual(["prepare"]);
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
        payment(paid),
        () => (micReady ? null : "Microphone is not ready"),
        () => micReady,
      ),
    ).rejects.toThrow(/Microphone is not ready · Sortie kept for Voice/);
    expect(paid.calls).toEqual(["prepare", "activate", "deactivate"]);
    launch.abort();
    expect(undo).toHaveBeenCalledOnce();
  });

  it("a stage that throws after activation puts the sortie back and rethrows", async () => {
    const launch = new LaunchTransaction();
    const paid = sortie([], "typing");
    const undo = vi.fn();
    launch.onAbort(undo);
    await expect(
      launch.start(payment(paid), () => null, () => {
        throw new Error("Stage data is broken");
      }),
    ).rejects.toThrow(/^Stage data is broken$/);
    expect(paid.calls).toEqual(["prepare", "activate", "deactivate"]);
    launch.abort();
    expect(undo).toHaveBeenCalledOnce();
  });

  it("the stage's own error wins when the sortie cannot be put back either", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const paid = sortie();
    paid.deactivate = vi.fn(async () => {
      throw new Error("Sortie already closed");
    });
    await expect(
      new LaunchTransaction().start(payment(paid), () => null, () => {
        throw new Error("Stage data is broken");
      }),
    ).rejects.toThrow(/^Stage data is broken$/);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
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
    await expect(launch.start(payment(paid), () => null, start)).rejects.toThrow(/another tab/);
    expect(start).not.toHaveBeenCalled();
    expect(paid.deactivate).not.toHaveBeenCalled();
    launch.abort();
    expect(undo).toHaveBeenCalledOnce();
  });

  it("a typing sortie is kept without a microphone hint; a free run has none to keep", async () => {
    const paid = sortie([], "typing");
    await expect(
      new LaunchTransaction().start(payment(paid), () => null, () => false),
    ).rejects.toThrow(
      /^The stage could not start · Sortie kept: Deploy again resumes it, no new Warp$/,
    );
    await expect(
      new LaunchTransaction().start(null, () => "Microphone is not ready", () => true),
    ).rejects.toThrow(/^Microphone is not ready$/);
    await expect(
      new LaunchTransaction().start(null, () => null, () => false),
    ).rejects.toThrow(/^The stage could not start$/);
  });
});

describe("launch order", () => {
  /** A paid launch whose steps record themselves into `calls`. */
  function plan(calls: string[], overrides: Partial<LaunchPlan> = {}): LaunchPlan {
    const paid = sortie(calls);
    return {
      preflight: async () => {
        calls.push("preflight");
        return payment(paid);
      },
      save: async () => {
        calls.push("save");
        return true;
      },
      presentationUndo: () => {
        calls.push("read presentation");
        return () => calls.push("undo presentation");
      },
      present: async () => {
        calls.push("animation");
      },
      blocker: () => null,
      startStage: () => {
        calls.push("start");
        return true;
      },
      ...overrides,
    };
  }

  it("preflight → save → animation → Warp → stage, and a running stage keeps all of it", async () => {
    const calls: string[] = [];
    const launch = new LaunchTransaction();
    await expect(runLaunch(launch, plan(calls))).resolves.toBe(true);
    launch.abort();
    expect(calls).toEqual([
      "preflight",
      "save",
      "read presentation",
      "animation",
      "prepare",
      "activate",
      "start",
    ]);
  });

  it("a refused preflight saves nothing, shows nothing and spends nothing", async () => {
    const calls: string[] = [];
    const launch = new LaunchTransaction();
    launch.onAbort(() => calls.push("practice flag off"));
    await expect(
      runLaunch(
        launch,
        plan(calls, {
          preflight: async () => {
            calls.push("preflight");
            throw new Error("Not enough Warp · 3 more to Deploy. Practice is free.");
          },
        }),
      ),
    ).rejects.toThrow(/Not enough Warp/);
    launch.abort();
    expect(calls).toEqual(["preflight", "practice flag off"]);
  });

  it("a failed stage-entry save stops before the animation and the Warp", async () => {
    const calls: string[] = [];
    const launch = new LaunchTransaction();
    const result = await runLaunch(
      launch,
      plan(calls, {
        save: async () => {
          calls.push("save");
          return false;
        },
      }),
    );
    launch.abort();
    expect(result).toBe(false);
    expect(calls).toEqual(["preflight", "save"]);
  });

  it("a server refusal after the animation brings the deck back and starts nothing", async () => {
    const calls: string[] = [];
    const launch = new LaunchTransaction();
    await expect(
      runLaunch(
        launch,
        plan(calls, {
          preflight: async () => {
            calls.push("preflight");
            return async () => {
              calls.push("prepare");
              throw new Error("Not enough Warp · Warp updated from the server");
            };
          },
        }),
      ),
    ).rejects.toThrow(/Warp updated from the server/);
    launch.abort();
    expect(calls).toEqual([
      "preflight",
      "save",
      "read presentation",
      "animation",
      "prepare",
      "undo presentation",
    ]);
  });

  it("a microphone that drops during the animation costs no Warp", async () => {
    const calls: string[] = [];
    let micReady = true;
    const launch = new LaunchTransaction();
    await expect(
      runLaunch(
        launch,
        plan(calls, {
          present: async () => {
            calls.push("animation");
            micReady = false;
          },
          blocker: () => (micReady ? null : "Microphone is not ready"),
        }),
      ),
    ).rejects.toThrow(/^Microphone is not ready$/);
    launch.abort();
    expect(calls).toEqual([
      "preflight",
      "save",
      "read presentation",
      "animation",
      "undo presentation",
    ]);
  });

  it("a free run (Test Lab, Expedition) never pays", async () => {
    const calls: string[] = [];
    const launch = new LaunchTransaction();
    await runLaunch(
      launch,
      plan(calls, {
        preflight: async () => {
          calls.push("preflight");
          return null;
        },
      }),
    );
    expect(calls).toEqual(["preflight", "save", "read presentation", "animation", "start"]);
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
