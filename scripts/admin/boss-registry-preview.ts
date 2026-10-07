import { allBossIdentities } from "../../src/boss/identity";
import { materializeBossRuntimeSession } from "../../src/admin/boss-runtime-policy";

type PreviewInput = Readonly<{
  policy?: unknown;
}>;

async function readInput(): Promise<PreviewInput> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Boss Admin preview input must be an object.");
  }
  return parsed as PreviewInput;
}

const input = await readInput();
const hasPolicy = input.policy !== undefined;
const session = hasPolicy
  ? materializeBossRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "admin-preview",
      policy: input.policy,
    })
  : materializeBossRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "admin-preview",
      policy: { configRevision: "bundled-boss-registry", bosses: {} },
    });

if (hasPolicy && session.source !== "published") {
  throw new Error("Boss Admin preview policy is malformed or incompatible.");
}

const bosses = allBossIdentities().map((boss) => {
  const override = session.bosses[boss.id];
  return {
    id: boss.id,
    name: override?.name ?? boss.name,
    title: override?.title ?? boss.title,
    role: boss.role,
    rank: boss.rank,
    family: boss.family,
    overridden: override !== undefined && Object.keys(override).length > 0,
  };
});

process.stdout.write(JSON.stringify({
  protocolVersion: 1,
  kind: "space-typing-boss-registry-preview",
  configRevision: session.configRevision,
  authorableFields: ["name", "title"],
  bosses,
}, null, 2) + "\n");
