import { createWorldMusicAdminPreview } from "../../src/admin/world-music-preview";
import type { MusicPlaybackMode } from "../../src/audio/music-library";
import type { WorldMusicPolicy } from "../../src/audio/world-music-model";

type PreviewRequest = {
  musicMode?: MusicPlaybackMode;
  publishedPolicy?: WorldMusicPolicy;
  stageNumber?: number;
};

async function readRequest(): Promise<PreviewRequest> {
  if (process.stdin.isTTY) return {};
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const input = Buffer.concat(chunks).toString("utf8");
  if (input.trim().length === 0) return {};
  const value = JSON.parse(input) as PreviewRequest;
  if (value.musicMode !== undefined && value.musicMode !== "map" && value.musicMode !== "random") {
    throw new Error("musicMode must be map or random");
  }
  if (
    value.stageNumber !== undefined &&
    (!Number.isInteger(value.stageNumber) || value.stageNumber < 1 || value.stageNumber > 1000)
  ) {
    throw new Error("stageNumber must be an integer from 1 to 1000");
  }
  return value;
}

const request = await readRequest();
const preview = createWorldMusicAdminPreview(request);
process.stdout.write(`${JSON.stringify(preview, null, 2)}\n`);
