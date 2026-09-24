import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const AUDIO_FILES = [
  "public/assets/audio/music/sector.ogg",
  "public/assets/audio/music/pulse.ogg",
  "public/assets/audio/music/urgent.ogg",
  "public/assets/audio/stingers/victory.ogg",
  "public/assets/audio/ambient/engine-loop.ogg",
  "public/assets/audio/ambient/computer-loop.ogg",
  "public/assets/audio/sfx/kenney/laser-small.ogg",
  "public/assets/audio/sfx/kenney/laser-large.ogg",
  "public/assets/audio/sfx/kenney/force-field.ogg",
  "public/assets/audio/sfx/kenney/explosion-crunch.ogg",
  "public/assets/audio/sfx/kenney/explosion-low.ogg",
  "public/assets/audio/sfx/kenney/engine-large.ogg",
  "public/assets/audio/sfx/kenney/thruster.ogg",
  "public/assets/audio/sfx/kenney/confirm.ogg",
  "public/assets/audio/sfx/kenney/error.ogg",
] as const;

describe("committed default audio assets", () => {
  it("ships non-empty OGG binaries for every production fallback", async () => {
    for (const relative of AUDIO_FILES) {
      const absolute = resolve(process.cwd(), relative);
      const info = await stat(absolute);
      expect(info.size).toBeGreaterThan(1_000);
      const header = await readFile(absolute);
      expect(header.subarray(0, 4).toString("ascii")).toBe("OggS");
    }
  });

  it("keeps the default audio payload curated instead of vendoring whole packs", () => {
    expect(AUDIO_FILES.length).toBeLessThanOrEqual(16);
  });
});
