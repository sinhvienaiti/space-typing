from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}")
    return text.replace(old, new, 1)


path = Path("src/audio/MusicController.ts")
text = path.read_text()

text = replace_once(
    text,
    '''import {\n  classifyMusicPlaybackFailure,\n  type MusicPlaybackFailureKind,\n} from "./music-playback-failure";\n''',
    '''import {\n  classifyMusicPlaybackFailure,\n  type MusicPlaybackFailureKind,\n} from "./music-playback-failure";\nimport {\n  catalogFromMusicTracks,\n  BUNDLED_WORLD_MUSIC_CATALOG,\n  resolveRuntimeWorldPlaylist,\n  stageRoleForMusicState,\n} from "./world-music-runtime";\nimport type {\n  PlaylistSelectionMode,\n  WorldMusicCatalog,\n  WorldMusicPolicy,\n} from "./world-music-model";\n''',
    "canonical runtime imports",
)

text = replace_once(
    text,
    '''export type MusicControllerOptions = {\n  /** Song library (defaults to the generated one). Tests pass their own. */\n  tracks?: readonly MusicTrack[];\n  random?: () => number;\n};\n''',
    '''export type MusicControllerOptions = {\n  /** Song library (defaults to the generated one). Tests pass their own. */\n  tracks?: readonly MusicTrack[];\n  random?: () => number;\n  /** Canonical B1 manifest/policy inputs. Admin preview supplies the same shape. */\n  catalog?: WorldMusicCatalog;\n  generatedPolicy?: WorldMusicPolicy;\n  publishedPolicy?: WorldMusicPolicy;\n};\n''',
    "MusicController options",
)

text = replace_once(
    text,
    '''  playbackMode: MusicPlaybackMode;\n  lastPlaybackFailure: null | {\n''',
    '''  playbackMode: MusicPlaybackMode;\n  playlistKey: string;\n  playlistSelectionMode: PlaylistSelectionMode;\n  playlistResolvedFrom: string;\n  lastPlaybackFailure: null | {\n''',
    "debug playlist diagnostics type",
)

text = replace_once(
    text,
    '''  private readonly tracks: readonly MusicTrack[];\n  private readonly random: () => number;\n  private mode: MusicPlaybackMode = "map";\n  private playlist: string[] = [];\n  private playlistIndex = 0;\n  private shuffle: ShuffleBag;\n''',
    '''  private readonly tracks: readonly MusicTrack[];\n  private readonly random: () => number;\n  private readonly catalog: WorldMusicCatalog;\n  private readonly generatedPolicy: WorldMusicPolicy | undefined;\n  private readonly publishedPolicy: WorldMusicPolicy | undefined;\n  private mode: MusicPlaybackMode = "map";\n  private playlist: string[] = [];\n  private playlistKey = "";\n  private playlistSelectionMode: PlaylistSelectionMode = "ordered";\n  private playlistResolvedFrom = "unresolved";\n  private playlistIndex = 0;\n  private shuffle: ShuffleBag;\n''',
    "canonical playlist fields",
)

text = replace_once(
    text,
    '''    this.tracks = options.tracks ?? MUSIC_TRACKS;\n    this.random = options.random ?? Math.random;\n    this.shuffle = new ShuffleBag(this.tracks.map((track) => track.id), this.random);\n    this.rebuildPlaylist(this.profile.worldId);\n''',
    '''    this.tracks = options.tracks ?? MUSIC_TRACKS;\n    this.random = options.random ?? Math.random;\n    this.catalog = options.catalog ?? (\n      options.tracks === undefined\n        ? BUNDLED_WORLD_MUSIC_CATALOG\n        : catalogFromMusicTracks(this.tracks)\n    );\n    this.generatedPolicy = options.generatedPolicy;\n    this.publishedPolicy = options.publishedPolicy;\n    this.shuffle = new ShuffleBag([], this.random);\n    this.rebuildPlaylist(this.profile.worldId, "WORLD_NORMAL");\n''',
    "constructor canonical playlist",
)

text = replace_once(
    text,
    '''      playbackMode: this.mode,\n      lastPlaybackFailure:\n''',
    '''      playbackMode: this.mode,\n      playlistKey: this.playlistKey,\n      playlistSelectionMode: this.playlistSelectionMode,\n      playlistResolvedFrom: this.playlistResolvedFrom,\n      lastPlaybackFailure:\n''',
    "debug playlist diagnostics values",
)

old_set_world = '''    this.transitionAmbient(profile.ambientLayers);\n    if (this.hasSongs()) {\n      this.rebuildPlaylist(profile.worldId);\n      // A new map brings its own music (random mode keeps its shuffle going).\n      if (this.mode === "map" && this.currentSong !== null) {\n        const first = this.trackById(this.playlist[0]);\n        if (first !== null && this.isWorldState(this.state)) {\n          if (first.id !== this.currentSong.id) {\n            this.startSong(first, this.stemFor(this.state), SONG_CROSSFADE_SECONDS.world, "song");\n          }\n        } else if (first !== null) {\n          // Boss, shop or stinger now: the new World's first song comes next.\n          this.upcoming = first;\n        }\n      }\n      return;\n    }\n    if (this.isWorldState(this.state)) {\n      this.transitionTo(this.state);\n    }\n'''
new_set_world = '''    this.transitionAmbient(profile.ambientLayers);\n    const playlistState = this.isCampaignPlaylistState(this.state)\n      ? this.state\n      : "WORLD_NORMAL";\n    const playlistChanged = this.rebuildPlaylist(profile.worldId, playlistState);\n    if (this.isCampaignPlaylistState(this.state)) {\n      if (!this.hasSongs()) {\n        this.fadeMusicTo(null, SONG_CROSSFADE_SECONDS.world, "state");\n        return;\n      }\n      if (playlistChanged && this.currentSong === null) {\n        const first = this.firstSong();\n        if (first !== null) {\n          this.startSong(first, this.stemFor(this.state), SONG_CROSSFADE_SECONDS.world, "song");\n        }\n      }\n      return;\n    }\n'''
text = replace_once(text, old_set_world, new_set_world, "setWorldProfile canonical resolver")

old_mode = '''  /** Map playlists or shuffle; the current song keeps playing where it fits. */\n  setPlaybackMode(mode: MusicPlaybackMode): void {\n    if (this.destroyed || mode === this.mode) return;\n    this.mode = mode;\n    this.upcoming = null;\n    this.releaseWarmNext();\n    if (mode === "random") {\n      this.shuffle = new ShuffleBag(this.tracks.map((track) => track.id), this.random);\n    } else {\n      this.rebuildPlaylist(this.profile.worldId);\n      const song = this.currentSong;\n      const position = song === null ? -1 : this.playlist.indexOf(song.id);\n      if (position >= 0) {\n        this.playlistIndex = position;\n      } else if (song !== null && this.isWorldState(this.state) && this.hasSongs()) {\n        const first = this.trackById(this.playlist[0]);\n        if (first !== null) {\n          this.playlistIndex = 0;\n          this.startSong(first, this.stemFor(this.state), SONG_CROSSFADE_SECONDS.mode, "song");\n          return;\n        }\n      }\n    }\n    this.notifyNowPlaying();\n  }\n'''
new_mode = '''  /** Map playlists or shuffle; the canonical resolver owns the effective pool. */\n  setPlaybackMode(mode: MusicPlaybackMode): void {\n    if (this.destroyed || mode === this.mode) return;\n    this.mode = mode;\n    const playlistState = this.isCampaignPlaylistState(this.state)\n      ? this.state\n      : "WORLD_NORMAL";\n    const playlistChanged = this.rebuildPlaylist(this.profile.worldId, playlistState);\n    if (playlistChanged && this.isCampaignPlaylistState(this.state)) {\n      if (!this.hasSongs()) {\n        this.fadeMusicTo(null, SONG_CROSSFADE_SECONDS.mode, "state");\n        this.notifyNowPlaying();\n        return;\n      }\n      if (this.currentSong === null) {\n        const first = this.firstSong();\n        if (first !== null) {\n          this.startSong(first, this.stemFor(this.state), SONG_CROSSFADE_SECONDS.mode, "song");\n          return;\n        }\n      }\n    }\n    this.notifyNowPlaying();\n  }\n'''
text = replace_once(text, old_mode, new_mode, "setPlaybackMode canonical resolver")

text = replace_once(
    text,
    '''    this.state = state;\n\n    if (this.isWorldState(state) && this.hasSongs()) {\n      this.playWorldSong(this.stemFor(state), crossfadeSeconds);\n      return;\n    }\n\n    const asset = musicAssetForState(this.profile, state);\n''',
    '''    this.state = state;\n\n    if (this.isCampaignPlaylistState(state)) {\n      this.rebuildPlaylist(this.profile.worldId, state);\n      if (this.hasSongs()) {\n        this.playWorldSong(this.stemFor(state), crossfadeSeconds);\n      } else {\n        this.fadeMusicTo(null, crossfadeSeconds, "state");\n        this.notifyNowPlaying();\n      }\n      return;\n    }\n\n    const asset = musicAssetForState(this.profile, state);\n''',
    "transitionTo canonical campaign resolver",
)

text = replace_once(
    text,
    '''  private hasSongs(): boolean {\n    return this.tracks.length > 0;\n  }\n\n  private isWorldState(state: MusicState): boolean {\n    return state === "WORLD_NORMAL" || state === "WORLD_INTENSE";\n  }\n''',
    '''  private hasSongs(): boolean {\n    return this.playlist.length > 0;\n  }\n\n  private isWorldState(state: MusicState): boolean {\n    return state === "WORLD_NORMAL" || state === "WORLD_INTENSE";\n  }\n\n  private isCampaignPlaylistState(state: MusicState): boolean {\n    return stageRoleForMusicState(state) !== null;\n  }\n''',
    "campaign playlist state helper",
)

old_rebuild = '''  private rebuildPlaylist(worldId: string): void {\n    const known = new Set(this.tracks.map((track) => track.id));\n    const list = worldPlaylist(worldId).filter((id) => known.has(id));\n    this.playlist = list.length > 0 ? list : this.tracks.map((track) => track.id);\n    this.playlistIndex = 0;\n    if (this.mode === "map") {\n      this.upcoming = null;\n      this.releaseWarmNext();\n    }\n  }\n'''
new_rebuild = '''  private rebuildPlaylist(\n    worldId: string,\n    state: MusicState = "WORLD_NORMAL",\n  ): boolean {\n    const known = new Set(this.tracks.map((track) => track.id));\n    const authoredLegacy = worldPlaylist(worldId).filter((id) => known.has(id));\n    const legacyWorldTrackIds = authoredLegacy.length > 0\n      ? authoredLegacy\n      : this.tracks.map((track) => track.id);\n    const resolved = resolveRuntimeWorldPlaylist({\n      worldId,\n      state,\n      musicMode: this.mode,\n      catalog: this.catalog,\n      generatedPolicy: this.generatedPolicy,\n      publishedPolicy: this.publishedPolicy,\n      legacyWorldTrackIds,\n      randomNormalTrackIds: this.tracks.map((track) => track.id),\n    });\n    if (resolved === null) return false;\n\n    const nextPlaylist = resolved.trackIds.filter((id) => known.has(id));\n    if (resolved.playlistKey === this.playlistKey) {\n      this.playlistResolvedFrom = resolved.resolvedFrom;\n      return false;\n    }\n\n    const currentId = this.currentSong?.id ?? null;\n    this.playlist = nextPlaylist;\n    this.playlistKey = resolved.playlistKey;\n    this.playlistSelectionMode = resolved.selectionMode;\n    this.playlistResolvedFrom = resolved.resolvedFrom;\n    this.playlistIndex = currentId === null ? 0 : Math.max(0, this.playlist.indexOf(currentId));\n    this.shuffle = new ShuffleBag(this.playlist, this.random);\n    this.upcoming = null;\n    this.releaseWarmNext();\n\n    if (currentId !== null && !this.playlist.includes(currentId)) {\n      // Keep the outgoing audio alive for the crossfade, but the new playlist\n      // must select its own first candidate rather than treating it as current.\n      this.currentSong = null;\n    }\n    return true;\n  }\n'''
text = replace_once(text, old_rebuild, new_rebuild, "canonical rebuildPlaylist")

text = replace_once(
    text,
    '''  private firstSong(): MusicTrack | null {\n    if (this.mode === "random") return this.trackById(this.shuffle.peek(null) ?? undefined);\n    this.playlistIndex = 0;\n    return this.trackById(this.playlist[0]);\n  }\n''',
    '''  private firstSong(): MusicTrack | null {\n    if (this.playlistSelectionMode === "shuffle-bag") {\n      return this.trackById(this.shuffle.peek(null) ?? undefined);\n    }\n    this.playlistIndex = 0;\n    return this.trackById(this.playlist[0]);\n  }\n''',
    "firstSong selection mode",
)

text = replace_once(
    text,
    '''    if (this.mode === "random") {\n      this.upcoming = this.trackById(this.shuffle.peek(this.currentSong?.id ?? null) ?? undefined);\n    } else if (this.playlist.length > 0) {\n''',
    '''    if (this.playlistSelectionMode === "shuffle-bag") {\n      this.upcoming = this.trackById(this.shuffle.peek(this.currentSong?.id ?? null) ?? undefined);\n    } else if (this.playlist.length > 0) {\n''',
    "peekNextSong selection mode",
)

text = replace_once(
    text,
    '''    if (next !== null && this.mode === "map") {\n      const index = this.playlist.indexOf(next.id);\n      if (index >= 0) this.playlistIndex = index;\n    }\n''',
    '''    if (next !== null && this.playlistSelectionMode === "ordered") {\n      const index = this.playlist.indexOf(next.id);\n      if (index >= 0) this.playlistIndex = index;\n    }\n''',
    "takeNextSong selection mode",
)

text = replace_once(
    text,
    '''  private commitRandomSongReservation(track: ManagedTrack): void {\n    if (this.mode !== "random" || track.songId === null) return;\n    this.shuffle.commit(track.songId);\n  }\n''',
    '''  private commitShuffleReservation(track: ManagedTrack): void {\n    if (this.playlistSelectionMode !== "shuffle-bag" || track.songId === null) return;\n    this.shuffle.commit(track.songId);\n  }\n''',
    "shuffle reservation helper rename",
)

text = text.replace("this.commitRandomSongReservation(track);", "this.commitShuffleReservation(track);")

path.write_text(text)
