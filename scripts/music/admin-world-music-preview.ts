import { readFile } from "node:fs/promises";
import { createWorldMusicAdminPreview } from "../../src/admin/world-music-preview";
import type { MusicPlaybackMode } from "../../src/audio/music-library";
import type { WorldMusicPolicy } from "../../src/audio/world-music-model";

type PreviewRequest = {
  musicMode?: MusicPlaybackMode;
  publishedPolicy?: WorldMusicPolicy;
};

async function readRequest(): Promise<PreviewRequest> {
  if (process.stdin.isTTY) return {};
  const input = await readFile(0, "utf8");
  if (input.trim().length === 0) return {};
  const value = JSON.parse(input) as PreviewRequest;
  if (value.musicMode !== undefined && value.musicMode !== "map" && value.musicMode !== "random") {
    throw new Error("musicMode must be map or random");
  }
  return value;
}

const request = await readRequest();
const preview = createWorldMusicAdminPreview(request);
process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
