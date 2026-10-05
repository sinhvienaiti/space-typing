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


# Dedicated boss playlists may advance on natural `ended`, but the player-facing
# Skip control remains a normal/intense-world-music action. This preserves the
# existing no-skip boss contract while allowing one-track boss playlists to
# restart naturally.
replace_once(
    "src/audio/MusicController.ts",
    '''  /** Hands over to the next song now. False when no world song is playing. */\n  skipTrack(): boolean {\n    return this.advanceSong(SONG_CROSSFADE_SECONDS.skip);\n  }\n''',
    '''  /** Hands over to the next normal/intense song now. Boss music is not skippable. */\n  skipTrack(): boolean {\n    if (!this.isWorldState(this.state)) return false;\n    return this.advanceSong(SONG_CROSSFADE_SECONDS.skip);\n  }\n''',
    "boss skip guard",
)


# The catalog playback fixture also creates World ambient audio through
# setWorldProfile(). Count the single music recording's voices specifically;
# ambient layers are unrelated to the single-file one-voice contract.
replace_once(
    "tests/music-catalog-playback.test.ts",
    '''    expect(controller.getNowPlaying()).toMatchObject({ id: "single-normal", stem: "calm" });\n    expect(created).toHaveLength(1);\n    expect(created[0]?.src).toBe("/music/single.webm");\n    expect(controller.getDebugSnapshot().activeMusic?.candidates).toEqual([\n''',
    '''    expect(controller.getNowPlaying()).toMatchObject({ id: "single-normal", stem: "calm" });\n    const singleVoices = () => created.filter((audio) => audio.src.startsWith("/music/single."));\n    expect(singleVoices()).toHaveLength(1);\n    expect(singleVoices()[0]?.src).toBe("/music/single.webm");\n    expect(controller.getDebugSnapshot().activeMusic?.candidates).toEqual([\n''',
    "single voice initial assertion",
)
replace_once(
    "tests/music-catalog-playback.test.ts",
    '''    created[0]!.currentTime = 41.25;\n    controller.transitionTo("WORLD_INTENSE", 0);\n\n    expect(created).toHaveLength(1);\n    expect(created[0]!.currentTime).toBeCloseTo(41.25);\n''',
    '''    singleVoices()[0]!.currentTime = 41.25;\n    controller.transitionTo("WORLD_INTENSE", 0);\n\n    expect(singleVoices()).toHaveLength(1);\n    expect(singleVoices()[0]!.currentTime).toBeCloseTo(41.25);\n''',
    "single voice intensity assertion",
)
