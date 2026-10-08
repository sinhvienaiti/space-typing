import { materializeWorldRuntimeSession, resolveWorldProfileForRuntime } from "../../src/admin/world-runtime-policy";
import { WORLD_REGISTRY } from "../../src/worlds/registry";
import { worldRuntimeEnemyDefinitionIdForWorld } from "../../src/worlds/roster";

async function readStdin(): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text.length === 0 ? {} : JSON.parse(text);
}

const input = await readStdin() as { policy?: unknown };
const policy = input.policy ?? { configRevision: "worlds-bundled", worlds: {} };
const session = materializeWorldRuntimeSession({
  protocolVersion: 1,
  activeRevision: "admin-preview",
  applyBoundary: "new-session",
  policy,
});

if (session.source !== "published") {
  console.error("Invalid World Admin policy.");
  process.exitCode = 1;
} else {
  const worlds = WORLD_REGISTRY.map((bundled) => {
    const effective = resolveWorldProfileForRuntime(bundled, session.worlds[bundled.id]);
    return {
      id: effective.id,
      name: effective.name,
      galaxy: effective.galaxy,
      stageStart: effective.stageStart,
      stageEnd: effective.stageEnd,
      enemyFamilies: effective.enemyFamilies,
      enemyRoster: effective.enemyRoster,
      elitePool: effective.elitePool,
      sampleEnemyId: worldRuntimeEnemyDefinitionIdForWorld(effective, "scout", false, 0),
      overridden: session.worlds[bundled.id] !== undefined,
    };
  });
  console.log(JSON.stringify({
    protocolVersion: 1,
    configRevision: session.configRevision,
    authorableFields: ["enemyRoster"],
    structuralFields: ["id", "galaxy", "stageStart", "stageEnd", "enemyFamilies"],
    worlds,
  }, null, 2));
}
