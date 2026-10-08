import { describe, expect, it } from "vitest";
import { ShuffleBag } from "../src/audio/music-library";

describe("B1 ShuffleBag reservation", () => {
  it("keeps repeated preload peeks stable until playback commits", () => {
    const bag = new ShuffleBag(["alpha", "beta", "gamma"], () => 0);
    const reserved = bag.peek(null);

    expect(reserved).not.toBeNull();
    expect(bag.peek(null)).toBe(reserved);
    expect(bag.commit(reserved)).toBe(reserved);
    expect(bag.peek(reserved)).not.toBe(reserved);
  });

  it("can cancel a preload without consuming the queued song", () => {
    const bag = new ShuffleBag(["alpha", "beta", "gamma"], () => 0);
    const reserved = bag.peek(null);

    bag.cancelReservation(reserved);

    expect(bag.peek(null)).toBe(reserved);
  });

  it("preserves the legacy draw API and avoids immediate repeats", () => {
    const bag = new ShuffleBag(["alpha", "beta", "gamma"], () => 0);
    const first = bag.next(null);
    const second = bag.next(first);
    const third = bag.next(second);
    const fourth = bag.next(third);

    expect(new Set([first, second, third]).size).toBe(3);
    expect(fourth).not.toBe(third);
  });

  it("does not commit a mismatched reservation", () => {
    const bag = new ShuffleBag(["alpha", "beta"], () => 0);
    const reserved = bag.peek(null);

    expect(bag.commit(reserved === "alpha" ? "beta" : "alpha")).toBeNull();
    expect(bag.peek(null)).toBe(reserved);
  });
});
