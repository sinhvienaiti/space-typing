import { describe, expect, it, vi } from "vitest";
import { handleEach, runFrameLoop, type FrameError, type FrameLoopOptions, type FrameScheduler } from "../src/platform/frame-loop";

/** A hand-cranked requestAnimationFrame: `tick(now)` runs the pending frame. */
function manualFrames(): FrameScheduler & { pending: number; cancelled: number[]; tick(now: number): void } {
  let next: ((now: number) => void) | null = null;
  let handle = 0;
  const frames = {
    pending: 0,
    cancelled: [] as number[],
    request(callback: (now: number) => void): number {
      next = callback;
      handle += 1;
      frames.pending = handle;
      return handle;
    },
    cancel(id: number): void {
      frames.cancelled.push(id);
      if (id === frames.pending) next = null;
    },
    tick(now: number): void {
      const callback = next;
      next = null;
      callback?.(now);
    },
  };
  return frames;
}

function loop(options: Partial<FrameLoopOptions>) {
  const frames = manualFrames();
  const errors: FrameError[] = [];
  const reported: unknown[] = [];
  const handle = runFrameLoop({
    update: () => undefined,
    draw: () => undefined,
    onError: (failure) => errors.push(failure),
    report: (error) => reported.push(error),
    scheduler: frames,
    ...options,
  });
  return { frames, errors, reported, handle };
}

describe("resilient frame loop", () => {
  it("keeps running after a throwing update, and still draws that frame", () => {
    const draw = vi.fn();
    let broken = true;
    const update = vi.fn(() => {
      if (broken) throw new Error("bad enemy");
    });
    const { frames, errors, reported } = loop({ update, draw });

    frames.tick(16);
    expect(draw).toHaveBeenCalledWith(16);
    expect(errors).toMatchObject([{ stage: "update", streak: 1, halted: false }]);
    expect(reported).toEqual([new Error("bad enemy")]);

    broken = false;
    frames.tick(32);
    frames.tick(48);
    expect(update).toHaveBeenCalledTimes(3);
    expect(draw).toHaveBeenCalledTimes(3);
    expect(errors).toHaveLength(1);
  });

  it("requests the next frame before the stages run", () => {
    const pendingDuringUpdate: number[] = [];
    const { frames } = loop({
      update: () => {
        pendingDuringUpdate.push(frames.pending);
        throw new Error("bad enemy");
      },
    });
    expect(frames.pending).toBe(1);
    frames.tick(16);
    // Frame 1 is running; frame 2 was already asked for.
    expect(pendingDuringUpdate).toEqual([2]);
  });

  it("keeps the world running when the draw throws", () => {
    const update = vi.fn();
    const { frames, errors } = loop({
      update,
      draw: () => {
        throw new Error("bad sprite");
      },
    });
    frames.tick(16);
    frames.tick(32);
    expect(update).toHaveBeenCalledTimes(2);
    expect(errors.map((failure) => failure.stage)).toEqual(["draw", "draw"]);
  });

  it("halts a stage after three failed frames in a row and tries it again later", () => {
    let broken = true;
    const update = vi.fn(() => {
      if (broken) throw new Error("stuck");
    });
    const draw = vi.fn();
    const { frames, errors, reported } = loop({ update, draw, retryMs: 1000 });

    for (const now of [16, 32, 48]) frames.tick(now);
    expect(errors.map(({ streak, halted }) => [streak, halted])).toEqual([
      [1, false],
      [2, false],
      [3, true],
    ]);
    // One report per streak, not one per frame.
    expect(reported).toHaveLength(1);

    // Halted: skipped (the draw still runs) until a second has passed.
    frames.tick(500);
    expect(update).toHaveBeenCalledTimes(3);
    expect(draw).toHaveBeenCalledTimes(4);

    // Still broken at the retry: halted again, nothing new reported.
    frames.tick(1048);
    expect(update).toHaveBeenCalledTimes(4);
    expect(errors.at(-1)).toMatchObject({ streak: 4, halted: true });
    expect(reported).toHaveLength(1);

    // Fixed (the player left the run): the next retry runs it every frame again.
    broken = false;
    frames.tick(1500);
    expect(update).toHaveBeenCalledTimes(4);
    frames.tick(2048);
    frames.tick(2064);
    expect(update).toHaveBeenCalledTimes(6);

    // A new streak is reported again.
    broken = true;
    frames.tick(2080);
    expect(reported).toHaveLength(2);
    expect(errors.at(-1)).toMatchObject({ streak: 1, halted: false });
  });

  it("reports an error thrown by onError and keeps going", () => {
    const draw = vi.fn();
    const { frames, reported } = loop({
      update: () => {
        throw new Error("update");
      },
      draw,
      onError: () => {
        throw new Error("pause failed");
      },
    });
    frames.tick(16);
    expect(reported).toEqual([new Error("update"), new Error("pause failed")]);
    expect(draw).toHaveBeenCalledTimes(1);
    frames.tick(32);
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it("stops cleanly: cancels the pending frame, also when stopped inside a frame", () => {
    const outsideUpdate = vi.fn();
    const outsideDraw = vi.fn();
    const outside = loop({ update: outsideUpdate, draw: outsideDraw });
    outside.handle.stop();
    outside.handle.stop();
    expect(outside.frames.cancelled).toEqual([1]);
    outside.frames.tick(16);
    expect(outsideUpdate).not.toHaveBeenCalled();
    expect(outsideDraw).not.toHaveBeenCalled();

    const draw = vi.fn();
    const inside = loop({
      update: () => inside.handle.stop(),
      draw,
    });
    inside.frames.tick(16);
    expect(draw).not.toHaveBeenCalled();
    expect(inside.frames.cancelled).toEqual([2]);
    inside.frames.tick(32);
    expect(draw).not.toHaveBeenCalled();
  });
});

describe("handleEach (a frame's events)", () => {
  it("handles every event after one throws, then rethrows the first error", () => {
    const handled: string[] = [];
    const first = new Error("bad tower");
    const handle = (event: string): void => {
      handled.push(event);
      if (event === "collapse") throw first;
      if (event === "horizon") throw new Error("second");
    };

    expect(() => handleEach(["collapse", "horizon", "waveEnd", "defeat"], handle)).toThrow(first);
    expect(handled).toEqual(["collapse", "horizon", "waveEnd", "defeat"]);
  });

  it("returns quietly when every event is handled", () => {
    const handle = vi.fn();
    expect(() => handleEach(["waveStart", "waveEnd"], handle)).not.toThrow();
    expect(handle).toHaveBeenCalledTimes(2);
  });
});
