from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: anchor count={count}")
    file.write_text(text.replace(old, new, 1))


# Commit the ShuffleBag reservation at the logical handover, not after the
# asynchronous HTMLMediaElement.play() promise. Preload still only peeks, but
# rapid skip/handover calls cannot observe the same unconsumed reservation.
replace_once(
    "src/audio/MusicController.ts",
    '''    if (next === null) next = this.createSongTrack(song, stem);\n    if (next === null) return;\n    this.currentSong = song;\n''',
    '''    if (next === null) next = this.createSongTrack(song, stem);\n    if (next === null) return;\n    this.commitShuffleReservation(next);\n    this.currentSong = song;\n''',
    "startSong shuffle commit",
)

path = Path("src/audio/MusicController.ts")
text = path.read_text()
old = "      this.commitShuffleReservation(track);\n      track.networkRetryCount = 0;"
if old in text:
    text = text.replace(old, "      track.networkRetryCount = 0;", 1)
old_retry = "          this.commitShuffleReservation(track);\n          track.networkRetryCount = 0;"
if old_retry in text:
    text = text.replace(old_retry, "          track.networkRetryCount = 0;", 1)
path.write_text(text)

# Expose the actual active song identity in the QA snapshot. `currentSong`
# describes playlist state and can legitimately stay populated while a special
# looping asset is active, so M22 must inspect ManagedTrack.songId instead.
replace_once(
    "src/audio/MusicController.ts",
    '''  activeMusic: null | {\n    assetId: string;\n    candidates: string[];\n''',
    '''  activeMusic: null | {\n    assetId: string;\n    songId: string | null;\n    candidates: string[];\n''',
    "debug activeMusic songId type",
)
replace_once(
    "src/audio/MusicController.ts",
    '''          : {\n              assetId: active.assetId,\n              candidates: [...active.candidates],\n''',
    '''          : {\n              assetId: active.assetId,\n              songId: active.songId,\n              candidates: [...active.candidates],\n''',
    "debug activeMusic songId value",
)

# V2 boss fallback intentionally keeps same-World normal music when no
# dedicated boss assignment exists. Update the legacy playlist regression to
# assert continuity instead of an artificial silent/special-track detour.
replace_once(
    "tests/music-playlist.test.ts",
    '''  it("resumes with a fresh song after a boss, and the next World's first song after a boss there", () => {\n    const { controller, playing } = setup("world-01");\n    controller.transitionTo("WORLD_NORMAL", 0);\n    controller.transitionTo("WORLD_BOSS", 0);\n    expect(playing()).toBeNull();\n    controller.transitionTo("WORLD_NORMAL", 0);\n    expect(playing()).toBe("starlit-lullaby");\n\n    controller.transitionTo("WORLD_BOSS", 0);\n    controller.setWorldProfile(musicProfileForWorld("world-06"));\n    controller.transitionTo("WORLD_NORMAL", 0);\n    expect(playing()).toBe("ember-rush");\n    controller.destroy();\n  });\n''',
    '''  it("keeps same-World normal music through boss fallback and follows a new World's identity", () => {\n    const { controller, playing } = setup("world-01");\n    controller.transitionTo("WORLD_NORMAL", 0);\n    expect(playing()).toBe("signal-in-the-void");\n\n    controller.transitionTo("WORLD_BOSS", 0);\n    expect(playing()).toBe("signal-in-the-void");\n    expect(controller.getDebugSnapshot().playlistResolvedFrom).toContain("normal");\n\n    controller.transitionTo("WORLD_NORMAL", 0);\n    expect(playing()).toBe("signal-in-the-void");\n\n    controller.transitionTo("WORLD_BOSS", 0);\n    controller.setWorldProfile(musicProfileForWorld("world-06"));\n    expect(playing()).toBe("ember-rush");\n    controller.transitionTo("WORLD_NORMAL", 0);\n    expect(playing()).toBe("ember-rush");\n    controller.destroy();\n  });\n''',
    "boss fallback playlist regression",
)

# M22 predates canonical World playlists. A campaign state resolved through a
# catalog song follows song lifecycle semantics (non-looping handover) even if
# the semantic state is a boss; legacy profile assets keep stateLoops().
replace_once(
    "tests/m22-audio-audit.test.ts",
    '''        } else if (state === "WORLD_NORMAL" || state === "WORLD_INTENSE") {\n          // World music plays the map's songs: one file each, handed over to\n          // the next song instead of looping (docs/MUSIC_SYSTEM.md).\n          expect(snapshot.activeMusic).not.toBeNull();\n          expect(snapshot.song).not.toBeNull();\n          expect(snapshot.activeMusic?.loop).toBe(false);\n          expect(snapshot.activeMusic?.candidates.length).toBe(1);\n        } else {\n          expect(snapshot.activeMusic).not.toBeNull();\n          expect(snapshot.activeMusic?.loop).toBe(stateLoops(state));\n          expect(snapshot.activeMusic?.candidates.length).toBe(2);\n        }\n''',
    '''        } else if (\n          snapshot.activeMusic !== null &&\n          snapshot.activeMusic.songId !== null\n        ) {\n          // Canonical campaign playlists (including same-World boss fallback)\n          // use song lifecycle semantics: hand over instead of looping. Source\n          // candidate count is a transport detail and may grow with codecs.\n          expect(snapshot.song?.id).toBe(snapshot.activeMusic.songId);\n          expect(snapshot.activeMusic.loop).toBe(false);\n          expect(snapshot.activeMusic.candidates.length).toBeGreaterThanOrEqual(1);\n        } else {\n          // Non-catalog legacy profile assets retain their state-specific loop\n          // contract and local/default source fallback pair.\n          expect(snapshot.activeMusic).not.toBeNull();\n          expect(snapshot.activeMusic?.loop).toBe(stateLoops(state));\n          expect(snapshot.activeMusic?.candidates.length).toBe(2);\n        }\n''',
    "M22 canonical playlist lifecycle",
)

# Map mode migration preserves the authored legacy order. Only global random
# normal playback uses the shuffle-bag assignment.
replace_once(
    "tests/world-music-default-policy.test.ts",
    '''        selectionMode: "shuffle-bag",\n      });\n    }\n''',
    '''        selectionMode: "ordered",\n      });\n    }\n''',
    "generated map ordering assertion",
)
