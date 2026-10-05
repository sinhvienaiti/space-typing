from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# ShuffleBag: reserve/peek without consuming, then commit only after playback.
# ---------------------------------------------------------------------------
library_path = Path("src/audio/music-library.ts")
library = library_path.read_text()
old_class = '''export class ShuffleBag {\n  private bag: string[] = [];\n\n  constructor(\n    private readonly ids: readonly string[],\n    private readonly random: () => number = Math.random,\n  ) {}\n\n  next(avoid: string | null): string | null {\n    if (this.ids.length === 0) return null;\n    if (this.bag.length === 0) {\n      this.bag = [...this.ids];\n      for (let index = this.bag.length - 1; index > 0; index -= 1) {\n        const swap = Math.floor(this.random() * (index + 1));\n        [this.bag[index], this.bag[swap]] = [this.bag[swap]!, this.bag[index]!];\n      }\n    }\n    // Drawn from the end; move the avoided song away from the top.\n    if (this.bag.length > 1 && this.bag[this.bag.length - 1] === avoid) {\n      [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1]!, this.bag[0]!];\n    }\n    const id = this.bag.pop()!;\n    if (id === avoid && this.ids.length > 1) return this.next(avoid);\n    return id;\n  }\n}\n'''
new_class = '''export class ShuffleBag {\n  private bag: string[] = [];\n  private reserved: string | null = null;\n\n  constructor(\n    private readonly ids: readonly string[],\n    private readonly random: () => number = Math.random,\n  ) {}\n\n  private refill(): void {\n    this.bag = [...this.ids];\n    for (let index = this.bag.length - 1; index > 0; index -= 1) {\n      const swap = Math.floor(this.random() * (index + 1));\n      [this.bag[index], this.bag[swap]] = [this.bag[swap]!, this.bag[index]!];\n    }\n  }\n\n  /**\n   * Reserves the next id without consuming it. Repeated peeks are stable, so\n   * preload/warm-up can inspect the next song without advancing the shuffle.\n   */\n  peek(avoid: string | null): string | null {\n    if (this.ids.length === 0) return null;\n\n    if (this.reserved !== null) {\n      if (this.reserved !== avoid || this.ids.length === 1) return this.reserved;\n      this.reserved = null;\n    }\n\n    if (this.bag.length === 0) this.refill();\n\n    // Drawn from the end; move the avoided song away from the top. This also\n    // prevents an immediate repeat across bag refills.\n    if (this.bag.length > 1 && this.bag[this.bag.length - 1] === avoid) {\n      [this.bag[0], this.bag[this.bag.length - 1]] = [\n        this.bag[this.bag.length - 1]!,\n        this.bag[0]!,\n      ];\n    } else if (\n      this.bag.length === 1 &&\n      this.bag[0] === avoid &&\n      this.ids.length > 1\n    ) {\n      // Defensive edge case when the caller's avoid id came from outside this\n      // bag. Start a fresh cycle rather than returning an immediate repeat.\n      this.refill();\n      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === avoid) {\n        [this.bag[0], this.bag[this.bag.length - 1]] = [\n          this.bag[this.bag.length - 1]!,\n          this.bag[0]!,\n        ];\n      }\n    }\n\n    this.reserved = this.bag[this.bag.length - 1] ?? null;\n    return this.reserved;\n  }\n\n  /** Consumes the current reservation only when the expected id still owns it. */\n  commit(expectedId: string | null = null): string | null {\n    const reserved = this.reserved;\n    if (reserved === null) return null;\n    if (expectedId !== null && expectedId !== reserved) return null;\n    if (this.bag[this.bag.length - 1] !== reserved) {\n      throw new Error("ShuffleBag reservation drifted from the queue.");\n    }\n    this.bag.pop();\n    this.reserved = null;\n    return reserved;\n  }\n\n  /** Releases a preload reservation without consuming the queued id. */\n  cancelReservation(expectedId: string | null = null): void {\n    if (\n      this.reserved !== null &&\n      (expectedId === null || expectedId === this.reserved)\n    ) {\n      this.reserved = null;\n    }\n  }\n\n  /** Legacy draw API: reserve and commit in one operation. */\n  next(avoid: string | null): string | null {\n    const id = this.peek(avoid);\n    return id === null ? null : this.commit(id);\n  }\n}\n'''
if new_class not in library:
    count = library.count(old_class)
    if count != 1:
        raise SystemExit(f"ShuffleBag class anchor count={count}")
    library = library.replace(old_class, new_class, 1)
    library_path.write_text(library)


# ---------------------------------------------------------------------------
# MusicController: random selection peeks; successful playback commits.
# ---------------------------------------------------------------------------
controller_path = Path("src/audio/MusicController.ts")
controller = controller_path.read_text()
controller = replace_once(
    controller,
    '''  private firstSong(): MusicTrack | null {\n    if (this.mode === "random") return this.trackById(this.shuffle.next(null) ?? undefined);\n''',
    '''  private firstSong(): MusicTrack | null {\n    if (this.mode === "random") return this.trackById(this.shuffle.peek(null) ?? undefined);\n''',
    "firstSong random reservation",
)
controller = replace_once(
    controller,
    '''    if (this.mode === "random") {\n      this.upcoming = this.trackById(this.shuffle.next(this.currentSong?.id ?? null) ?? undefined);\n''',
    '''    if (this.mode === "random") {\n      this.upcoming = this.trackById(this.shuffle.peek(this.currentSong?.id ?? null) ?? undefined);\n''',
    "peekNextSong random reservation",
)
controller = replace_once(
    controller,
    '''  private async playTrack(track: ManagedTrack): Promise<void> {\n''',
    '''  private commitRandomSongReservation(track: ManagedTrack): void {\n    if (this.mode !== "random" || track.songId === null) return;\n    this.shuffle.commit(track.songId);\n  }\n\n  private async playTrack(track: ManagedTrack): Promise<void> {\n''',
    "random reservation commit helper",
)
controller = replace_once(
    controller,
    '''      track.networkRetryCount = 0;\n      if (this.lastPlaybackFailure?.assetId === track.assetId) {\n''',
    '''      this.commitRandomSongReservation(track);\n      track.networkRetryCount = 0;\n      if (this.lastPlaybackFailure?.assetId === track.assetId) {\n''',
    "primary playback reservation commit",
)
controller = replace_once(
    controller,
    '''          track.networkRetryCount = 0;\n          this.lastPlaybackFailure = null;\n          return;\n''',
    '''          this.commitRandomSongReservation(track);\n          track.networkRetryCount = 0;\n          this.lastPlaybackFailure = null;\n          return;\n''',
    "retry playback reservation commit",
)
controller_path.write_text(controller)


# ---------------------------------------------------------------------------
# Focused regression tests for reservation semantics.
# ---------------------------------------------------------------------------
test_path = Path("tests/music-shuffle-reservation.test.ts")
test_content = '''import { describe, expect, it } from "vitest";\nimport { ShuffleBag } from "../src/audio/music-library";\n\ndescribe("B1 ShuffleBag reservation", () => {\n  it("keeps repeated preload peeks stable until playback commits", () => {\n    const bag = new ShuffleBag(["alpha", "beta", "gamma"], () => 0);\n    const reserved = bag.peek(null);\n\n    expect(reserved).not.toBeNull();\n    expect(bag.peek(null)).toBe(reserved);\n    expect(bag.commit(reserved)).toBe(reserved);\n    expect(bag.peek(reserved)).not.toBe(reserved);\n  });\n\n  it("can cancel a preload without consuming the queued song", () => {\n    const bag = new ShuffleBag(["alpha", "beta", "gamma"], () => 0);\n    const reserved = bag.peek(null);\n\n    bag.cancelReservation(reserved);\n\n    expect(bag.peek(null)).toBe(reserved);\n  });\n\n  it("preserves the legacy draw API and avoids immediate repeats", () => {\n    const bag = new ShuffleBag(["alpha", "beta", "gamma"], () => 0);\n    const first = bag.next(null);\n    const second = bag.next(first);\n    const third = bag.next(second);\n    const fourth = bag.next(third);\n\n    expect(new Set([first, second, third]).size).toBe(3);\n    expect(fourth).not.toBe(third);\n  });\n\n  it("does not commit a mismatched reservation", () => {\n    const bag = new ShuffleBag(["alpha", "beta"], () => 0);\n    const reserved = bag.peek(null);\n\n    expect(bag.commit(reserved === "alpha" ? "beta" : "alpha")).toBeNull();\n    expect(bag.peek(null)).toBe(reserved);\n  });\n});\n'''
if test_path.exists():
    if test_path.read_text() != test_content:
        raise SystemExit(f"{test_path}: unexpected existing content")
else:
    test_path.write_text(test_content)
