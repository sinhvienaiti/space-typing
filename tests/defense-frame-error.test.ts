import { describe, expect, it } from "vitest";
import { pausesOnFrameError } from "../src/defense/frame-error";
import type { Phase } from "../src/defense/rules/engine";

describe("Rift Defense pause on a throwing frame", () => {
  it.each<[Phase]>([["build"], ["wave"]])("pauses a run in play (%s)", (phase) => {
    expect(pausesOnFrameError({ phase, paused: false, overlayOpen: false })).toBe(true);
  });

  it("leaves a boon pick or a word review alone: the pause menu would close it for good", () => {
    // The boon cards and the review are open in their phases...
    expect(pausesOnFrameError({ phase: "boon", paused: false, overlayOpen: true })).toBe(false);
    expect(pausesOnFrameError({ phase: "review", paused: false, overlayOpen: true })).toBe(false);
    // ...and also before the frame that would open them.
    expect(pausesOnFrameError({ phase: "boon", paused: false, overlayOpen: false })).toBe(false);
    expect(pausesOnFrameError({ phase: "review", paused: false, overlayOpen: false })).toBe(false);
  });

  it("leaves an open overlay in the build phase (a tower branch pick) alone", () => {
    expect(pausesOnFrameError({ phase: "build", paused: false, overlayOpen: true })).toBe(false);
  });

  it("does not pause twice, an ended run, or no run", () => {
    expect(pausesOnFrameError({ phase: "wave", paused: true, overlayOpen: true })).toBe(false);
    expect(pausesOnFrameError({ phase: "victory", paused: false, overlayOpen: false })).toBe(false);
    expect(pausesOnFrameError({ phase: "defeat", paused: false, overlayOpen: false })).toBe(false);
    expect(pausesOnFrameError({ phase: null, paused: false, overlayOpen: true })).toBe(false);
  });
});
