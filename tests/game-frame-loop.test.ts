import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { createTestGame } from "./helpers/game-harness";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";
import type { GamePhase } from "../src/types";

/** The Campaign canvas loop through a throwing frame: it pauses the run and keeps drawing. */
type FrameInternals = {
  advanceSimulation(dt: number): void;
  draw(time: number): void;
};

function playingGame() {
  const phases: GamePhase[] = [];
  const game = createTestGame(undefined, { onPhase: (phase) => phases.push(phase) });
  const reportError = vi.fn();
  vi.stubGlobal("reportError", reportError);
  game.setTestLabMode(true);
  game.startStage(
    createStageConfig(1),
    difficultyFor({ stage: 1, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }),
  );
  game.testLabSetSchedulerFrozen(true);
  const internals = game as unknown as FrameInternals;
  const draw = vi.spyOn(internals, "draw").mockImplementation(() => undefined);
  const requestFrame = globalThis.requestAnimationFrame as unknown as Mock<(callback: FrameRequestCallback) => number>;
  const runFrame = (now: number): void => {
    const callback = requestFrame.mock.calls.at(-1)![0];
    callback(now);
  };
  phases.length = 0;
  return { game, internals, draw, requestFrame, runFrame, phases, reportError };
}

describe("Campaign frame loop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("pauses the run on a throwing update, draws the frame and asks for the next one", () => {
    const { game, internals, draw, requestFrame, runFrame, phases, reportError } = playingGame();
    const failure = new Error("bad enemy");
    const simulate = vi.spyOn(internals, "advanceSimulation").mockImplementation(() => {
      throw failure;
    });
    expect(game.getPhase()).toBe("playing");
    const requestsBefore = requestFrame.mock.calls.length;

    runFrame(1000);

    expect(requestFrame.mock.calls.length).toBe(requestsBefore + 1);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(game.getPhase()).toBe("paused");
    expect(phases).toEqual(["paused"]);
    expect(reportError).toHaveBeenCalledWith(failure);

    // The player resumes once the frame is healthy again: the loop is still alive.
    simulate.mockRestore();
    game.resume();
    runFrame(1016);
    expect(game.getPhase()).toBe("playing");
    expect(draw).toHaveBeenCalledTimes(2);
    game.destroy();
  });

  it("pauses on a throwing draw and keeps the simulation stepping", () => {
    const { game, internals, draw, runFrame } = playingGame();
    const simulate = vi.spyOn(internals, "advanceSimulation");
    draw.mockImplementation(() => {
      throw new Error("bad sprite");
    });

    runFrame(1000);
    runFrame(1016);

    expect(game.getPhase()).toBe("paused");
    expect(simulate).toHaveBeenCalledTimes(2);
    game.destroy();
  });

  it("stops asking for frames once destroyed", () => {
    const { game, requestFrame } = playingGame();
    game.destroy();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(requestFrame.mock.results.at(-1)!.value);
  });
});
