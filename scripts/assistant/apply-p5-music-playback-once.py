from pathlib import Path

mc_path = Path("src/audio/MusicController.ts")
text = mc_path.read_text()

def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}")
    text = text.replace(old, new, 1)

replace_once(
    '''} from "./music-profile";\n''',
    '''} from "./music-profile";\nimport {\n  classifyMusicPlaybackFailure,\n  type MusicPlaybackFailureKind,\n} from "./music-playback-failure";\n''',
    "import",
)

replace_once(
    '''  advancingFallback: boolean;\n''',
    '''  advancingFallback: boolean;\n  disposed: boolean;\n  playRequestGeneration: number;\n  networkRetryCount: number;\n''',
    "ManagedTrack",
)

replace_once(
    '''function safePlay(audio: AudioLike): Promise<void> {\n  try {\n    const result = audio.play();\n    if (\n      result !== undefined &&\n      typeof (result as Promise<void>).catch === "function"\n    ) {\n      return result as Promise<void>;\n    }\n    return Promise.resolve();\n  } catch {\n    return Promise.reject(new Error("Audio playback failed."));\n  }\n}\n''',
    '''function safePlay(audio: AudioLike): Promise<void> {\n  try {\n    const result = audio.play();\n    if (\n      result !== undefined &&\n      typeof (result as Promise<void>).catch === "function"\n    ) {\n      return result as Promise<void>;\n    }\n    return Promise.resolve();\n  } catch (error) {\n    return Promise.reject(error);\n  }\n}\n''',
    "safePlay",
)

replace_once(
    '''function stopTrack(track: ManagedTrack): void {\n  detachListeners(track);\n  track.audio.pause();\n  track.audio.currentTime = 0;\n  track.output.dispose();\n}\n''',
    '''function stopTrack(track: ManagedTrack): void {\n  track.disposed = true;\n  track.playRequestGeneration += 1;\n  detachListeners(track);\n  track.audio.pause();\n  track.audio.currentTime = 0;\n  track.output.dispose();\n}\n''',
    "stopTrack",
)

replace_once(
    '''  playbackMode: MusicPlaybackMode;\n  song: null | {\n''',
    '''  playbackMode: MusicPlaybackMode;\n  lastPlaybackFailure: null | {\n    assetId: string;\n    kind: MusicPlaybackFailureKind;\n  };\n  song: null | {\n''',
    "debug type",
)

replace_once(
    '''  private musicBus: GainNode | null = null;\n  private gestureListening = false;\n\n  private readonly onAnnouncer''',
    '''  private musicBus: GainNode | null = null;\n  private gestureListening = false;\n  private lastPlaybackFailure: {\n    assetId: string;\n    kind: MusicPlaybackFailureKind;\n  } | null = null;\n\n  private readonly onAnnouncer''',
    "failure property",
)

replace_once(
    '''  private readonly onUserGesture = (): void => {\n    this.unlockAudioGraph();\n  };\n''',
    '''  private readonly onUserGesture = (): void => {\n    this.unlockAudioGraph();\n    if (this.lastPlaybackFailure?.kind !== "autoplay-permission") return;\n    this.lastPlaybackFailure = null;\n    if (this.activeMusic !== null) void this.playTrack(this.activeMusic);\n    for (const track of this.activeAmbient) void this.playTrack(track);\n  };\n''',
    "gesture",
)

replace_once(
    '''      playbackMode: this.mode,\n      song:\n''',
    '''      playbackMode: this.mode,\n      lastPlaybackFailure:\n        this.lastPlaybackFailure === null\n          ? null\n          : { ...this.lastPlaybackFailure },\n      song:\n''',
    "debug snapshot",
)

replace_once(
    '''      endedListener: null,\n      advancingFallback: false,\n      syncGroup: asset.syncGroup ?? null,\n''',
    '''      endedListener: null,\n      advancingFallback: false,\n      disposed: false,\n      playRequestGeneration: 0,\n      networkRetryCount: 0,\n      syncGroup: asset.syncGroup ?? null,\n''',
    "createTrack fields",
)

replace_once(
    '''  private async playTrack(track: ManagedTrack): Promise<void> {\n    if (this.paused || this.destroyed) return;\n\n    try {\n      await safePlay(track.audio);\n    } catch {\n      await this.tryNextCandidate(track);\n    }\n  }\n''',
    '''  private async playTrack(track: ManagedTrack): Promise<void> {\n    if (this.paused || this.destroyed || track.disposed) return;\n\n    const generation = ++track.playRequestGeneration;\n    const audio = track.audio;\n    try {\n      await safePlay(audio);\n      if (\n        track.disposed ||\n        track.audio !== audio ||\n        track.playRequestGeneration !== generation\n      ) {\n        return;\n      }\n      track.networkRetryCount = 0;\n      if (this.lastPlaybackFailure?.assetId === track.assetId) {\n        this.lastPlaybackFailure = null;\n      }\n      return;\n    } catch (error) {\n      if (\n        track.disposed ||\n        track.audio !== audio ||\n        track.playRequestGeneration !== generation\n      ) {\n        return;\n      }\n\n      let failure = classifyMusicPlaybackFailure(error);\n      this.lastPlaybackFailure = { assetId: track.assetId, kind: failure.kind };\n      if (\n        failure.kind === "autoplay-permission" ||\n        failure.kind === "stale-cancelled"\n      ) {\n        return;\n      }\n\n      if (failure.kind === "temporary-network" && track.networkRetryCount < 1) {\n        track.networkRetryCount += 1;\n        try {\n          await safePlay(audio);\n          if (\n            track.disposed ||\n            track.audio !== audio ||\n            track.playRequestGeneration !== generation\n          ) {\n            return;\n          }\n          track.networkRetryCount = 0;\n          this.lastPlaybackFailure = null;\n          return;\n        } catch (retryError) {\n          if (\n            track.disposed ||\n            track.audio !== audio ||\n            track.playRequestGeneration !== generation\n          ) {\n            return;\n          }\n          failure = classifyMusicPlaybackFailure(retryError);\n          this.lastPlaybackFailure = { assetId: track.assetId, kind: failure.kind };\n          if (\n            failure.kind === "autoplay-permission" ||\n            failure.kind === "stale-cancelled"\n          ) {\n            return;\n          }\n        }\n      }\n\n      await this.tryNextCandidate(track);\n    }\n  }\n''',
    "playTrack",
)

replace_once(
    '''  private async tryNextCandidate(\n    track: ManagedTrack,\n  ): Promise<void> {\n    if (track.advancingFallback) return;\n    if (\n      this.destroyed ||\n      track.candidateIndex + 1 >= track.candidates.length\n    ) {\n      track.audio.pause();\n      return;\n    }\n\n    track.advancingFallback = true;\n    detachListeners(track);\n    track.audio.pause();\n    track.output.dispose();\n\n    track.candidateIndex += 1;\n    const next = this.audioFactory(\n      track.candidates[track.candidateIndex]!,\n    );\n    if (next === null) {\n      track.advancingFallback = false;\n      return;\n    }\n\n    track.audio = next;\n    track.output = this.createOutput(next);\n    track.errorListener = null;\n    track.endedListener = null;\n    this.configureAudio(track);\n    this.attachEnded(track);\n    this.applyVolumes();\n\n    if (!this.paused) {\n      try {\n        await safePlay(track.audio);\n      } catch {\n        track.advancingFallback = false;\n        await this.tryNextCandidate(track);\n        return;\n      }\n    }\n    track.advancingFallback = false;\n  }\n''',
    '''  private async tryNextCandidate(\n    track: ManagedTrack,\n  ): Promise<void> {\n    if (track.advancingFallback || track.disposed) return;\n    if (\n      this.destroyed ||\n      track.candidateIndex + 1 >= track.candidates.length\n    ) {\n      track.audio.pause();\n      return;\n    }\n\n    track.advancingFallback = true;\n    track.playRequestGeneration += 1;\n    detachListeners(track);\n    track.audio.pause();\n    track.output.dispose();\n\n    track.candidateIndex += 1;\n    const next = this.audioFactory(\n      track.candidates[track.candidateIndex]!,\n    );\n    if (next === null) {\n      track.advancingFallback = false;\n      return;\n    }\n\n    track.audio = next;\n    track.output = this.createOutput(next);\n    track.errorListener = null;\n    track.endedListener = null;\n    track.networkRetryCount = 0;\n    this.configureAudio(track);\n    this.attachEnded(track);\n    this.applyVolumes();\n\n    track.advancingFallback = false;\n    if (!this.paused) await this.playTrack(track);\n  }\n''',
    "tryNextCandidate",
)

mc_path.write_text(text)

Path("src/audio/music-playback-failure.ts").write_text('''export type MusicPlaybackFailureKind =\n  | "autoplay-permission"\n  | "unsupported-codec"\n  | "missing-corrupt"\n  | "temporary-network"\n  | "stale-cancelled"\n  | "unknown";\n\nexport type MusicPlaybackFailure = {\n  kind: MusicPlaybackFailureKind;\n  retryable: boolean;\n  quarantine: boolean;\n};\n\nfunction nameOf(error: unknown): string {\n  if (typeof error === "object" && error !== null && "name" in error) {\n    const name = (error as { name?: unknown }).name;\n    if (typeof name === "string") return name;\n  }\n  return "";\n}\n\nfunction messageOf(error: unknown): string {\n  if (typeof error === "object" && error !== null && "message" in error) {\n    const message = (error as { message?: unknown }).message;\n    if (typeof message === "string") return message.toLowerCase();\n  }\n  if (typeof error === "string") return error.toLowerCase();\n  return "";\n}\n\n/**\n * Playback rejections are lifecycle signals, not all broken assets.\n * Autoplay denial keeps the selected candidate for a later user gesture.\n */\nexport function classifyMusicPlaybackFailure(\n  error: unknown,\n): MusicPlaybackFailure {\n  const name = nameOf(error);\n  const message = messageOf(error);\n\n  if (\n    name === "NotAllowedError" ||\n    message.includes("not allowed") ||\n    message.includes("user gesture") ||\n    message.includes("autoplay")\n  ) {\n    return { kind: "autoplay-permission", retryable: true, quarantine: false };\n  }\n\n  if (\n    name === "AbortError" ||\n    message.includes("interrupted") ||\n    message.includes("aborted") ||\n    message.includes("cancelled") ||\n    message.includes("canceled")\n  ) {\n    return { kind: "stale-cancelled", retryable: false, quarantine: false };\n  }\n\n  if (\n    name === "NotSupportedError" ||\n    message.includes("codec") ||\n    message.includes("decode") ||\n    message.includes("not supported")\n  ) {\n    return { kind: "unsupported-codec", retryable: false, quarantine: false };\n  }\n\n  if (\n    name === "NetworkError" ||\n    name === "TimeoutError" ||\n    message.includes("network") ||\n    message.includes("timeout") ||\n    message.includes("temporarily unavailable")\n  ) {\n    return { kind: "temporary-network", retryable: true, quarantine: false };\n  }\n\n  if (\n    name === "EncodingError" ||\n    message.includes("404") ||\n    message.includes("corrupt") ||\n    message.includes("missing") ||\n    message.includes("failed to load")\n  ) {\n    return { kind: "missing-corrupt", retryable: false, quarantine: true };\n  }\n\n  return { kind: "unknown", retryable: false, quarantine: false };\n}\n''')

Path("tests/music-playback-failure.test.ts").write_text('''import { describe, expect, it } from "vitest";\nimport { classifyMusicPlaybackFailure } from "../src/audio/music-playback-failure";\n\ndescribe("music playback failure taxonomy", () => {\n  it("keeps autoplay denial retryable without quarantining the track", () => {\n    expect(classifyMusicPlaybackFailure({ name: "NotAllowedError", message: "autoplay not allowed" })).toEqual({\n      kind: "autoplay-permission",\n      retryable: true,\n      quarantine: false,\n    });\n  });\n\n  it("treats interrupted play as stale lifecycle rather than broken media", () => {\n    expect(classifyMusicPlaybackFailure({ name: "AbortError", message: "play() request was interrupted by pause()" })).toEqual({\n      kind: "stale-cancelled",\n      retryable: false,\n      quarantine: false,\n    });\n  });\n\n  it("distinguishes codec, network and corrupt/missing failures", () => {\n    expect(classifyMusicPlaybackFailure({ name: "NotSupportedError", message: "codec is not supported" }).kind).toBe("unsupported-codec");\n    expect(classifyMusicPlaybackFailure({ name: "NetworkError", message: "temporary network failure" })).toEqual({\n      kind: "temporary-network",\n      retryable: true,\n      quarantine: false,\n    });\n    expect(classifyMusicPlaybackFailure(new Error("404 missing audio file"))).toEqual({\n      kind: "missing-corrupt",\n      retryable: false,\n      quarantine: true,\n    });\n  });\n});\n''')

Path("tests/music-controller-failure-taxonomy.test.ts").write_text('''import { describe, expect, it } from "vitest";\nimport {\n  MusicController,\n  type AudioLike,\n} from "../src/audio/MusicController";\n\nclass FailureAudio implements AudioLike {\n  volume = 0;\n  loop = false;\n  preload = "";\n  currentTime = 0;\n  paused = true;\n  playCount = 0;\n  pauseCount = 0;\n  error: unknown = null;\n  deferredReject: ((reason?: unknown) => void) | null = null;\n  private listeners = new Map<string, Set<EventListener>>();\n\n  constructor(public src: string) {}\n\n  play(): Promise<void> {\n    this.playCount += 1;\n    if (this.error !== null) return Promise.reject(this.error);\n    if (this.deferredReject !== null) {\n      return new Promise<void>((_resolve, reject) => {\n        this.deferredReject = reject;\n      });\n    }\n    this.paused = false;\n    return Promise.resolve();\n  }\n\n  pause(): void {\n    this.pauseCount += 1;\n    this.paused = true;\n  }\n\n  load(): void {}\n  addEventListener(type: string, listener: EventListener): void {\n    const set = this.listeners.get(type) ?? new Set<EventListener>();\n    set.add(listener);\n    this.listeners.set(type, set);\n  }\n  removeEventListener(type: string, listener: EventListener): void {\n    this.listeners.get(type)?.delete(listener);\n  }\n}\n\nasync function flush(): Promise<void> {\n  await Promise.resolve();\n  await Promise.resolve();\n  await Promise.resolve();\n}\n\ndescribe("MusicController playback failure taxonomy", () => {\n  it("does not advance an autoplay-denied track to another candidate", async () => {\n    const created: FailureAudio[] = [];\n    const controller = new MusicController((src) => {\n      const audio = new FailureAudio(src);\n      if (src.includes("/local-assets/music/world-01.ogg")) {\n        audio.error = { name: "NotAllowedError", message: "autoplay not allowed" };\n      }\n      created.push(audio);\n      return audio;\n    }, { tracks: [] });\n\n    controller.transitionTo("WORLD_NORMAL", 0);\n    await flush();\n\n    expect(created.some((audio) =>\n      audio.src.includes("/assets/audio/music/mysterious-ambience.mp3"),\n    )).toBe(false);\n    expect(controller.getDebugSnapshot().lastPlaybackFailure?.kind).toBe("autoplay-permission");\n    controller.destroy();\n  });\n\n  it("ignores a stale rejection from a track retired by a newer transition", async () => {\n    const created: FailureAudio[] = [];\n    let old: FailureAudio | null = null;\n    const controller = new MusicController((src) => {\n      const audio = new FailureAudio(src);\n      if (src.includes("/local-assets/music/world-01.ogg")) {\n        audio.deferredReject = () => undefined;\n        old = audio;\n      }\n      created.push(audio);\n      return audio;\n    }, { tracks: [] });\n\n    controller.transitionTo("WORLD_NORMAL", 0);\n    expect(old).not.toBeNull();\n    const rejectOld = old!.deferredReject;\n    controller.transitionTo("WORLD_BOSS", 0);\n    rejectOld?.(new Error("missing asset"));\n    await flush();\n\n    expect(created.some((audio) =>\n      audio.src.includes("/assets/audio/music/mysterious-ambience.mp3"),\n    )).toBe(false);\n    expect(controller.getState()).toBe("WORLD_BOSS");\n    controller.destroy();\n  });\n});\n''')
