import { allBossIdentities } from "../../src/boss/identity";
import { materializeBossRuntimeSession } from "../../src/admin/boss-runtime-policy";

type PreviewInput = Readonly<{
  policy?: unknown;
}>;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validatePreviewPolicy(value: unknown, bossIds: ReadonlySet<string>): void {
  const policy = object(value);
  if (policy === null) throw new Error("Boss Admin preview policy is malformed or incompatible.");
  if (Object.keys(policy).some((key) => key !== "configRevision" && key !== "bosses")) {
    throw new Error("Boss Admin preview policy is malformed or incompatible.");
  }
  if (!validText(policy.configRevision, 120)) {
    throw new Error("Boss Admin preview policy is malformed or incompatible.");
  }
  if (policy.bosses === undefined) return;
  const bosses = object(policy.bosses);
  if (bosses === null) throw new Error("Boss Admin preview policy is malformed or incompatible.");
  for (const [id, rawOverride] of Object.entries(bosses)) {
    if (!bossIds.has(id)) throw new Error("Boss Admin preview policy is malformed or incompatible.");
    const override = object(rawOverride);
    if (override === null || Object.keys(override).some((key) => key !== "name" && key !== "title")) {
      throw new Error("Boss Admin preview policy is malformed or incompatible.");
    }
    if (override.name !== undefined && !validText(override.name, 100)) {
      throw new Error("Boss Admin preview policy is malformed or incompatible.");
    }
    if (override.title !== undefined && !validText(override.title, 160)) {
      throw new Error("Boss Admin preview policy is malformed or incompatible.");
    }
  }
}

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

const bundledBosses = allBossIdentities();
const bossIds = new Set(bundledBosses.map((boss) => boss.id));
const input = await readInput();
const hasPolicy = input.policy !== undefined;
if (hasPolicy) validatePreviewPolicy(input.policy, bossIds);

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

const bosses = bundledBosses.map((boss) => {
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
