import {
  createAdminSfxCatalog,
  resolveAdminSfxPreview,
} from "../../src/audio/admin-sfx-catalog";

type Request = {
  id?: string;
};

async function readRequest(): Promise<Request> {
  if (process.stdin.isTTY) return {};
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const input = Buffer.concat(chunks).toString("utf8");
  if (input.trim().length === 0) return {};
  return JSON.parse(input) as Request;
}

const request = await readRequest();
if (typeof request.id === "string") {
  const entry = resolveAdminSfxPreview(request.id);
  if (entry === null) {
    process.stderr.write(`Unknown SampleSfxId: ${request.id}\n`);
    process.exitCode = 2;
  } else {
    process.stdout.write(`${JSON.stringify(entry, null, 2)}\n`);
  }
} else {
  process.stdout.write(`${JSON.stringify(createAdminSfxCatalog(), null, 2)}\n`);
}
