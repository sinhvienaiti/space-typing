export type MusicPlaybackFailureKind =
  | "autoplay-permission"
  | "unsupported-codec"
  | "missing-corrupt"
  | "temporary-network"
  | "stale-cancelled"
  | "unknown";

export type MusicPlaybackFailure = {
  kind: MusicPlaybackFailureKind;
  retryable: boolean;
  quarantine: boolean;
};

function nameOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "";
}

function messageOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message.toLowerCase();
  }
  if (typeof error === "string") return error.toLowerCase();
  return "";
}

/**
 * Playback rejections are lifecycle signals, not all broken assets.
 * In particular an autoplay denial must keep the selected track so a later
 * user gesture can retry it instead of poisoning/falling through the catalog.
 */
export function classifyMusicPlaybackFailure(
  error: unknown,
): MusicPlaybackFailure {
  const name = nameOf(error);
  const message = messageOf(error);

  if (
    name === "NotAllowedError" ||
    message.includes("not allowed") ||
    message.includes("user gesture") ||
    message.includes("autoplay")
  ) {
    return {
      kind: "autoplay-permission",
      retryable: true,
      quarantine: false,
    };
  }

  if (
    name === "AbortError" ||
    message.includes("interrupted") ||
    message.includes("aborted") ||
    message.includes("cancelled") ||
    message.includes("canceled")
  ) {
    return {
      kind: "stale-cancelled",
      retryable: false,
      quarantine: false,
    };
  }

  if (
    name === "NotSupportedError" ||
    message.includes("codec") ||
    message.includes("decode") ||
    message.includes("not supported")
  ) {
    return {
      kind: "unsupported-codec",
      retryable: false,
      quarantine: false,
    };
  }

  if (
    name === "NetworkError" ||
    name === "TimeoutError" ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("temporarily unavailable")
  ) {
    return {
      kind: "temporary-network",
      retryable: true,
      quarantine: false,
    };
  }

  if (
    name === "EncodingError" ||
    message.includes("404") ||
    message.includes("corrupt") ||
    message.includes("missing") ||
    message.includes("failed to load")
  ) {
    return {
      kind: "missing-corrupt",
      retryable: false,
      quarantine: true,
    };
  }

  return {
    kind: "unknown",
    retryable: false,
    quarantine: false,
  };
}
