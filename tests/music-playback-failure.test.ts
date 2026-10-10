import { describe, expect, it } from "vitest";
import { classifyMusicPlaybackFailure } from "../src/audio/music-playback-failure";

describe("music playback failure taxonomy", () => {
  it("keeps autoplay denial retryable without quarantining the track", () => {
    expect(classifyMusicPlaybackFailure({ name: "NotAllowedError", message: "play() failed because the user didn't interact" })).toEqual({
      kind: "autoplay-permission",
      retryable: true,
      quarantine: false,
    });
  });

  it("treats interrupted play as stale lifecycle rather than broken media", () => {
    expect(classifyMusicPlaybackFailure({ name: "AbortError", message: "play() request was interrupted by pause()" })).toEqual({
      kind: "stale-cancelled",
      retryable: false,
      quarantine: false,
    });
  });

  it("distinguishes codec, network and corrupt/missing failures", () => {
    expect(classifyMusicPlaybackFailure({ name: "NotSupportedError", message: "codec is not supported" }).kind).toBe("unsupported-codec");
    expect(classifyMusicPlaybackFailure({ name: "NetworkError", message: "temporary network failure" })).toEqual({
      kind: "temporary-network",
      retryable: true,
      quarantine: false,
    });
    expect(classifyMusicPlaybackFailure(new Error("404 missing audio file"))).toEqual({
      kind: "missing-corrupt",
      retryable: false,
      quarantine: true,
    });
  });
});
