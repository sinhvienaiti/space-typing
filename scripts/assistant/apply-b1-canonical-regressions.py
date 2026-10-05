from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}")
    return text.replace(old, new, 1)


# Preserve authored map order during migration. Random mode still resolves via
# the generated global normal assignment, which remains shuffle-bag.
policy_path = Path("src/audio/world-music-default-policy.ts")
policy = policy_path.read_text()
policy = replace_once(
    policy,
    '''          trackIds: worldPlaylist(worldId),\n          selectionMode: "shuffle-bag" as const,\n''',
    '''          trackIds: worldPlaylist(worldId),\n          selectionMode: "ordered" as const,\n''',
    "generated World map ordering",
)
policy_path.write_text(policy)


controller_path = Path("src/audio/MusicController.ts")
controller = controller_path.read_text()
controller = replace_once(
    controller,
    '''    if (this.isCampaignPlaylistState(this.state)) {\n      if (!this.hasSongs()) {\n        this.fadeMusicTo(null, SONG_CROSSFADE_SECONDS.world, "state");\n        return;\n      }\n      if (playlistChanged && this.currentSong === null) {\n''',
    '''    if (this.isCampaignPlaylistState(this.state)) {\n      if (!this.hasSongs()) {\n        // Keep the pre-B1 profile fallback alive when no catalog/library song\n        // can be resolved during migration.\n        this.transitionTo(this.state, SONG_CROSSFADE_SECONDS.world);\n        return;\n      }\n      if (playlistChanged && this.currentSong === null) {\n''',
    "setWorldProfile empty catalog fallback",
)
controller = replace_once(
    controller,
    '''    if (playlistChanged && this.isCampaignPlaylistState(this.state)) {\n      if (!this.hasSongs()) {\n        this.fadeMusicTo(null, SONG_CROSSFADE_SECONDS.mode, "state");\n        this.notifyNowPlaying();\n        return;\n      }\n      if (this.currentSong === null) {\n''',
    '''    if (playlistChanged && this.isCampaignPlaylistState(this.state)) {\n      if (!this.hasSongs()) {\n        this.transitionTo(this.state, SONG_CROSSFADE_SECONDS.mode);\n        return;\n      }\n      if (this.currentSong === null) {\n''',
    "setPlaybackMode empty catalog fallback",
)
controller = replace_once(
    controller,
    '''    if (this.isCampaignPlaylistState(state)) {\n      this.rebuildPlaylist(this.profile.worldId, state);\n      if (this.hasSongs()) {\n        this.playWorldSong(this.stemFor(state), crossfadeSeconds);\n      } else {\n        this.fadeMusicTo(null, crossfadeSeconds, "state");\n        this.notifyNowPlaying();\n      }\n      return;\n    }\n\n    const asset = musicAssetForState(this.profile, state);\n''',
    '''    if (this.isCampaignPlaylistState(state)) {\n      this.rebuildPlaylist(this.profile.worldId, state);\n      if (this.hasSongs()) {\n        this.playWorldSong(this.stemFor(state), crossfadeSeconds);\n        return;\n      }\n      // No usable catalog/library candidate: migration keeps the existing\n      // profile asset path rather than turning a previously audible state into\n      // silence.\n    }\n\n    const asset = musicAssetForState(this.profile, state);\n''',
    "transitionTo empty catalog fallback",
)
controller_path.write_text(controller)


# Update only assertions whose old behavior is intentionally superseded by the
# V2 same-World boss fallback contract. Other controller regression tests stay
# unchanged.
test_path = Path("tests/music-controller.test.ts")
test = test_path.read_text()
test = replace_once(
    test,
    '''    // A special state is a different song: it starts from the top.\n    intense.currentTime = 12;\n    controller.transitionTo("WORLD_BOSS", 0);\n    expect(created.at(-1)!.currentTime).toBe(0);\n''',
    '''    // With no dedicated World boss playlist, V2 resolves boss music back\n    // to the same World's normal playlist before any global boss fallback.\n    intense.currentTime = 12;\n    controller.transitionTo("WORLD_BOSS", 0);\n    const bossSnapshot = controller.getDebugSnapshot();\n    expect(bossSnapshot.song?.id).toBe("signal-in-the-void");\n    expect(bossSnapshot.playlistResolvedFrom).toContain("normal");\n    expect(created.at(-1)!.currentTime).toBeCloseTo(12);\n''',
    "boss fallback continuity assertion",
)
test = replace_once(
    test,
    '''  it("switches state without leaving the retired track playing", () => {\n    const created: FakeAudio[] = [];\n    const controller = new MusicController((src) => {\n      const audio = new FakeAudio(src);\n      created.push(audio);\n      return audio;\n    });\n\n    controller.transitionTo("WORLD_NORMAL", 0);\n    const normal = created.at(-1)!;\n    controller.transitionTo("WORLD_BOSS", 0);\n    const boss = created.at(-1)!;\n\n    expect(controller.getState()).toBe("WORLD_BOSS");\n    expect(normal.pauseCount).toBeGreaterThan(0);\n    expect(boss.loop).toBe(true);\n\n    controller.destroy();\n    expect(boss.pauseCount).toBeGreaterThan(0);\n  });\n''',
    '''  it("keeps same-World music continuous when boss resolves to normal fallback", () => {\n    const created: FakeAudio[] = [];\n    const controller = new MusicController((src) => {\n      const audio = new FakeAudio(src);\n      created.push(audio);\n      return audio;\n    });\n\n    controller.transitionTo("WORLD_NORMAL", 0);\n    const normal = created.at(-1)!;\n    const count = created.length;\n    controller.transitionTo("WORLD_BOSS", 0);\n\n    expect(controller.getState()).toBe("WORLD_BOSS");\n    expect(controller.getDebugSnapshot().playlistResolvedFrom).toContain("normal");\n    expect(created).toHaveLength(count);\n    expect(normal.pauseCount).toBe(0);\n\n    controller.destroy();\n    expect(normal.pauseCount).toBeGreaterThan(0);\n  });\n''',
    "same World boss continuity test",
)
test_path.write_text(test)
