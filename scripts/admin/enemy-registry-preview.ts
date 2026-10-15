import {
  createEnemyAdminPreview,
  type EnemyAdminPolicy,
} from "../../src/admin/enemy-registry-preview";

type Request = {
  policy?: EnemyAdminPolicy;
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
process.stdout.write(`${JSON.stringify(createEnemyAdminPreview(request.policy), null, 2)}\n`);
