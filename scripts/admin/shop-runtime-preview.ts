import { previewShopRuntime } from "../../src/admin/shop-runtime-preview";

async function readInput(): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) return {};
  return JSON.parse(raw) as unknown;
}

const input = await readInput();
process.stdout.write(JSON.stringify(previewShopRuntime(input), null, 2) + "\n");
