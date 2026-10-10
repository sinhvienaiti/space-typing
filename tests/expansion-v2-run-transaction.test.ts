import { describe, expect, it } from "vitest";
import {
  createExpansionV2Profile,
  recordExpansionRun,
} from "../src/expansion-v2/profile-store";

describe("Expansion V2 run settlement transaction", () => {
  it.each([
    [
      "negative timestamp",
      {
        runId: "invalid-time",
        score: 99,
        completed: true,
        occurredAtMs: -1,
      },
    ],
    [
      "non-finite score",
      {
        runId: "invalid-score",
        score: Number.NaN,
        completed: true,
        occurredAtMs: 100,
      },
    ],
    [
      "empty run id",
      {
        runId: "",
        score: 99,
        completed: true,
        occurredAtMs: 100,
      },
    ],
    [
      "derived event id beyond the history contract",
      {
        runId: "x".repeat(137),
        score: 99,
        completed: true,
        occurredAtMs: 100,
      },
    ],
  ])("rejects %s without partially mutating the profile", (_label, input) => {
    const profile = {
      ...createExpansionV2Profile(),
      completedRuns: 2,
      bestScore: 10,
    };

    const result = recordExpansionRun(profile, input);

    expect(result).toBe(profile);
    expect(result.completedRuns).toBe(2);
    expect(result.bestScore).toBe(10);
    expect(result.processedRunIds).toEqual([]);
    expect(result.history.events).toEqual([]);
  });

  it("allows a valid retry after invalid input and settles the run exactly once", () => {
    const profile = {
      ...createExpansionV2Profile(),
      completedRuns: 2,
      bestScore: 10,
    };
    const rejected = recordExpansionRun(profile, {
      runId: "retry-run",
      score: 99,
      completed: true,
      occurredAtMs: -1,
    });

    expect(rejected).toBe(profile);

    const settled = recordExpansionRun(rejected, {
      runId: "retry-run",
      score: 99,
      completed: true,
      occurredAtMs: 100,
    });

    expect(settled.completedRuns).toBe(3);
    expect(settled.bestScore).toBe(99);
    expect(settled.processedRunIds).toEqual(["retry-run"]);
    expect(settled.history.events).toHaveLength(1);
    expect(settled.history.events[0]).toMatchObject({
      eventId: "expedition-run:retry-run:terminal",
      occurredAtMs: 100,
      runId: "retry-run",
      score: 99,
      outcome: "completed",
    });

    const replay = recordExpansionRun(settled, {
      runId: "retry-run",
      score: 999,
      completed: true,
      occurredAtMs: 200,
    });

    expect(replay).toBe(settled);
    expect(replay.completedRuns).toBe(3);
    expect(replay.history.events).toHaveLength(1);
  });
});
