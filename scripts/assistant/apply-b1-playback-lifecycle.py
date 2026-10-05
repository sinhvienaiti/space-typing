from pathlib import Path

path = Path('src/audio/MusicController.ts')
text = path.read_text()

anchor = '''import {\n  sharedAudioFocus,\n  type AudioFocusReason,\n} from "./focus-manager";\n'''
replacement = anchor + '''import {\n  classifyMusicPlaybackFailure,\n  type MusicPlaybackFailureKind,\n} from "./music-playback-failure";\n'''
if text.count(anchor) != 1:
    raise SystemExit(f'import anchor count={text.count(anchor)}')
text = text.replace(anchor, replacement, 1)

old = '''  advancingFallback: boolean;\n'''
new = '''  advancingFallback: boolean;\n  disposed: boolean;\n  playRequestGeneration: number;\n  networkRetryCount: number;\n'''
if text.count(old) != 1:
    raise SystemExit(f'ManagedTrack anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''function stopTrack(track: ManagedTrack): void {\n  detachListeners(track);\n  track.audio.pause();\n  track.audio.currentTime = 0;\n  track.output.dispose();\n}\n'''
new = '''function stopTrack(track: ManagedTrack): void {\n  track.disposed = true;\n  track.playRequestGeneration += 1;\n  detachListeners(track);\n  track.audio.pause();\n  track.audio.currentTime = 0;\n  track.output.dispose();\n}\n'''
if text.count(old) != 1:
    raise SystemExit(f'stopTrack anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''function safePlay(audio: AudioLike): Promise<void> {\n  try {\n    const result = audio.play();\n    if (\n      result !== undefined &&\n      typeof (result as Promise<void>).catch === "function"\n    ) {\n      return result as Promise<void>;\n    }\n    return Promise.resolve();\n  } catch {\n    return Promise.reject(new Error("Audio playback failed."));\n  }\n}\n'''
new = '''function safePlay(audio: AudioLike): Promise<void> {\n  try {\n    const result = audio.play();\n    if (\n      result !== undefined &&\n      typeof (result as Promise<void>).catch === "function"\n    ) {\n      return result as Promise<void>;\n    }\n    return Promise.resolve();\n  } catch (error) {\n    return Promise.reject(error);\n  }\n}\n'''
if text.count(old) != 1:
    raise SystemExit(f'safePlay anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''  playbackMode: MusicPlaybackMode;\n  song: null | {\n'''
new = '''  playbackMode: MusicPlaybackMode;\n  lastPlaybackFailure: null | {\n    assetId: string;\n    kind: MusicPlaybackFailureKind;\n  };\n  song: null | {\n'''
if text.count(old) != 1:
    raise SystemExit(f'debug type anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''  private focusUnsubscribe: (() => void) | null = null;\n\n  private syncSharedFocus'''
new = '''  private focusUnsubscribe: (() => void) | null = null;\n  private lastPlaybackFailure: {\n    assetId: string;\n    kind: MusicPlaybackFailureKind;\n  } | null = null;\n\n  private syncSharedFocus'''
if text.count(old) != 1:
    raise SystemExit(f'failure property anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''  private readonly onUserGesture = (): void => {\n    this.unlockAudioGraph();\n  };\n'''
new = '''  private readonly onUserGesture = (): void => {\n    this.unlockAudioGraph();\n    if (this.lastPlaybackFailure?.kind !== "autoplay-permission") return;\n    this.lastPlaybackFailure = null;\n    if (this.activeMusic !== null) void this.playTrack(this.activeMusic);\n    for (const track of this.activeAmbient) void this.playTrack(track);\n  };\n'''
if text.count(old) != 1:
    raise SystemExit(f'gesture anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''      playbackMode: this.mode,\n      song:\n'''
new = '''      playbackMode: this.mode,\n      lastPlaybackFailure:\n        this.lastPlaybackFailure === null\n          ? null\n          : { ...this.lastPlaybackFailure },\n      song:\n'''
if text.count(old) != 1:
    raise SystemExit(f'debug snapshot anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''      endedListener: null,\n      advancingFallback: false,\n      syncGroup: asset.syncGroup ?? null,\n'''
new = '''      endedListener: null,\n      advancingFallback: false,\n      disposed: false,\n      playRequestGeneration: 0,\n      networkRetryCount: 0,\n      syncGroup: asset.syncGroup ?? null,\n'''
if text.count(old) != 1:
    raise SystemExit(f'createTrack fields anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''  private async playTrack(track: ManagedTrack): Promise<void> {\n    if (this.paused || this.destroyed) return;\n\n    try {\n      await safePlay(track.audio);\n    } catch {\n      await this.tryNextCandidate(track);\n    }\n  }\n'''
new = '''  private async playTrack(track: ManagedTrack): Promise<void> {\n    if (this.paused || this.destroyed || track.disposed) return;\n\n    const generation = ++track.playRequestGeneration;\n    const audio = track.audio;\n    try {\n      await safePlay(audio);\n      if (\n        track.disposed ||\n        track.audio !== audio ||\n        track.playRequestGeneration !== generation\n      ) {\n        return;\n      }\n      track.networkRetryCount = 0;\n      if (this.lastPlaybackFailure?.assetId === track.assetId) {\n        this.lastPlaybackFailure = null;\n      }\n      return;\n    } catch (error) {\n      if (\n        track.disposed ||\n        track.audio !== audio ||\n        track.playRequestGeneration !== generation\n      ) {\n        return;\n      }\n\n      let failure = classifyMusicPlaybackFailure(error);\n      this.lastPlaybackFailure = { assetId: track.assetId, kind: failure.kind };\n      if (\n        failure.kind === "autoplay-permission" ||\n        failure.kind === "stale-cancelled"\n      ) {\n        return;\n      }\n\n      if (failure.kind === "temporary-network" && track.networkRetryCount < 1) {\n        track.networkRetryCount += 1;\n        try {\n          await safePlay(audio);\n          if (\n            track.disposed ||\n            track.audio !== audio ||\n            track.playRequestGeneration !== generation\n          ) {\n            return;\n          }\n          track.networkRetryCount = 0;\n          this.lastPlaybackFailure = null;\n          return;\n        } catch (retryError) {\n          if (\n            track.disposed ||\n            track.audio !== audio ||\n            track.playRequestGeneration !== generation\n          ) {\n            return;\n          }\n          failure = classifyMusicPlaybackFailure(retryError);\n          this.lastPlaybackFailure = { assetId: track.assetId, kind: failure.kind };\n          if (\n            failure.kind === "autoplay-permission" ||\n            failure.kind === "stale-cancelled"\n          ) {\n            return;\n          }\n        }\n      }\n\n      await this.tryNextCandidate(track);\n    }\n  }\n'''
if text.count(old) != 1:
    raise SystemExit(f'playTrack anchor count={text.count(old)}')
text = text.replace(old, new, 1)

old = '''  private async tryNextCandidate(\n    track: ManagedTrack,\n  ): Promise<void> {\n    if (track.advancingFallback) return;\n    if (\n      this.destroyed ||\n      track.candidateIndex + 1 >= track.candidates.length\n    ) {\n      track.audio.pause();\n      return;\n    }\n\n    track.advancingFallback = true;\n    detachListeners(track);\n    track.audio.pause();\n    track.output.dispose();\n\n    track.candidateIndex += 1;\n    const next = this.audioFactory(\n      track.candidates[track.candidateIndex]!,\n    );\n    if (next === null) {\n      track.advancingFallback = false;\n      return;\n    }\n\n    track.audio = next;\n    track.output = this.createOutput(next);\n    track.errorListener = null;\n    track.endedListener = null;\n    this.configureAudio(track);\n    this.attachEnded(track);\n    this.applyVolumes();\n\n    if (!this.paused) {\n      try {\n        await safePlay(track.audio);\n      } catch {\n        track.advancingFallback = false;\n        await this.tryNextCandidate(track);\n        return;\n      }\n    }\n    track.advancingFallback = false;\n  }\n'''
new = '''  private async tryNextCandidate(\n    track: ManagedTrack,\n  ): Promise<void> {\n    if (track.advancingFallback || track.disposed) return;\n    if (\n      this.destroyed ||\n      track.candidateIndex + 1 >= track.candidates.length\n    ) {\n      track.audio.pause();\n      return;\n    }\n\n    track.advancingFallback = true;\n    track.playRequestGeneration += 1;\n    detachListeners(track);\n    track.audio.pause();\n    track.output.dispose();\n\n    track.candidateIndex += 1;\n    const next = this.audioFactory(\n      track.candidates[track.candidateIndex]!,\n    );\n    if (next === null) {\n      track.advancingFallback = false;\n      return;\n    }\n\n    track.audio = next;\n    track.output = this.createOutput(next);\n    track.errorListener = null;\n    track.endedListener = null;\n    track.networkRetryCount = 0;\n    this.configureAudio(track);\n    this.attachEnded(track);\n    this.applyVolumes();\n\n    track.advancingFallback = false;\n    if (!this.paused) await this.playTrack(track);\n  }\n'''
if text.count(old) != 1:
    raise SystemExit(f'tryNextCandidate anchor count={text.count(old)}')
text = text.replace(old, new, 1)

path.write_text(text)
