import {
  materializeStageRuntimeSession,
  type StageRuntimeOverride,
} from "../../src/admin/stage-runtime-policy";
import {
  createBundledStageConfig,
  MAX_CAMPAIGN_STAGE,
  resolveStageConfig,
} from "../../src/campaign/stage";
import { createStagePacingPlan } from "../../src/campaign/stage-pacing";

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
    throw new Error("Stage Admin preview input must be an object.");
  }
  return parsed as PreviewInput;
}

const input = await readInput();
const hasPolicy = input.policy !== undefined;
const session = hasPolicy
  ? materializeStageRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "admin-preview",
      policy: input.policy,
    })
  : materializeStageRuntimeSession({
      applyBoundary: "new-session",
      activeRevision: "admin-preview",
      policy: { configRevision: "bundled-stage-config", stages: [] },
    });

if (hasPolicy && session.source !== "published") {
  throw new Error("Stage Admin preview policy is malformed or incompatible.");
}

const stages = Array.from({ length: MAX_CAMPAIGN_STAGE }, (_, index) => {
  const bundled = createBundledStageConfig(index + 1);
  const override: StageRuntimeOverride | undefined = session.stages[bundled.stage];
  const resolved = resolveStageConfig(bundled, override);
  return {
    ...resolved,
    overridden: override !== undefined,
    pacingBudget: createStagePacingPlan(resolved).totalBudget,
  };
});

process.stdout.write(JSON.stringify({
  protocolVersion: 1,
  kind: "space-typing-stage-config-preview",
  configRevision: session.configRevision,
  authorableFields: ["enemyBudget", "eliteChance", "modifierSlots"],
  constraints: {
    stage: { min: 1, max: MAX_CAMPAIGN_STAGE, integer: true },
    enemyBudget: { minExclusive: 0 },
    eliteChance: { min: 0, max: 1 },
    modifierSlots: { min: 0, max: 4, integer: true },
  },
  stages,
}, null, 2) + "\n");
