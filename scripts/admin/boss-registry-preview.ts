import { allBossIdentities } from "../../src/boss/identity";

const bosses = allBossIdentities().map((boss) => ({
  id: boss.id,
  name: boss.name,
  title: boss.title,
  role: boss.role,
  rank: boss.rank,
  family: boss.family,
}));

process.stdout.write(JSON.stringify({
  protocolVersion: 1,
  kind: "space-typing-boss-registry-preview",
  authorableFields: ["name", "title"],
  bosses,
}, null, 2) + "\n");
