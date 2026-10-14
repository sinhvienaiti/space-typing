import type { AssetTuningCapabilityStatus } from "./asset-tuning-capabilities";

export type A7EnemyBossDomain = "enemy" | "boss";

export type A7EnemyBossCapability = Readonly<{
  id: string;
  domain: A7EnemyBossDomain;
  persistedField: string | null;
  canonicalOwner: string;
  validator: string | null;
  runtimeResolver: string | null;
  productionConsumer: string | null;
  previewConsumer: string | null;
  applyBoundary: "new-session" | "runtime-state" | "build/static" | "none";
  status: AssetTuningCapabilityStatus;
  note: string;
}>;

function capability(value: A7EnemyBossCapability): A7EnemyBossCapability {
  return Object.freeze(value);
}

/**
 * A7 source of truth for Enemy / Boss Admin authoring.
 *
 * A persisted field plus an Admin registry preview is not enough to call a
 * capability production-backed. A writable control is only "SUPPORTED NOW"
 * when the published value reaches an actual gameplay/presentation consumer.
 * Bundled registry data remains read-only until a canonical write seam exists.
 */
export const A7_ENEMY_BOSS_CAPABILITIES = Object.freeze([
  capability({
    id: "enemy.projectile-mode",
    domain: "enemy",
    persistedField: "projectileMode",
    canonicalOwner: "src/admin/enemy-runtime-policy.ts",
    validator: "sanitizeProjectileMode() + src/admin/enemy-registry-preview.ts::validateEnemyAdminPolicy()",
    runtimeResolver: "src/combat/enemy-projectile-policy.ts::resolveEnemyProjectileMode()",
    productionConsumer: "src/combat/enemy-projectile-policy.ts::normalEnemyProjectilesEnabled() consumed by Game.ts",
    previewConsumer: "src/admin/enemy-registry-preview.ts policy validation",
    applyBoundary: "new-session",
    status: "SUPPORTED NOW",
    note: "Published global projectile mode is authoritative for normal-enemy projectiles and falls back to the legacy local mode only when Admin has no published value.",
  }),
  capability({
    id: "enemy.min-stage",
    domain: "enemy",
    persistedField: "enemies.<id>.minStage",
    canonicalOwner: "src/admin/enemy-runtime-policy.ts",
    validator: "sanitizeOverride() + src/admin/enemy-registry-preview.ts::validateEnemyAdminPolicy()",
    runtimeResolver: null,
    productionConsumer: null,
    previewConsumer: "src/admin/enemy-registry-preview.ts::createEnemyAdminPreview()",
    applyBoundary: "none",
    status: "REQUIRES CANONICAL MIGRATION",
    note: "The published envelope and Admin registry preview accept minStage, but production enemyDefinition()/world roster resolution still reads the bundled registry and does not consume activeEnemyRuntimeOverride(). Do not present this field as live gameplay authoring yet.",
  }),
  capability({
    id: "enemy.registry-identity-reward-visual",
    domain: "enemy",
    persistedField: null,
    canonicalOwner: "src/enemies/registry.ts",
    validator: "src/enemies/registry.ts::validateEnemyRegistry()",
    runtimeResolver: "src/enemies/registry.ts::enemyDefinition() + src/worlds/roster.ts",
    productionConsumer: "Game.ts enemy spawning/render/reward paths",
    previewConsumer: "src/admin/enemy-registry-preview.ts::createEnemyAdminPreview() read-only registry materialization",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Enemy name, family, role, rarity, reward, rewardPower and visual profile are bundled registry authority. The Admin may inspect them but must not imply they are revision-backed write fields.",
  }),
  capability({
    id: "enemy.media-vfx-binding",
    domain: "enemy",
    persistedField: null,
    canonicalOwner: "src/enemies/registry.ts visual profile + src/enemies/painted-sprites.ts + renderer/VFX code",
    validator: null,
    runtimeResolver: null,
    productionConsumer: "bundled enemy renderer/VFX paths only",
    previewConsumer: null,
    applyBoundary: "none",
    status: "REQUIRES CANONICAL MIGRATION",
    note: "Enemy visual tokens and painted sprites are code/bundle owned. There is no immutable Media V2 asset-version field or production Admin resolver for per-Enemy image/VFX/SFX authoring.",
  }),
  capability({
    id: "boss.metadata-name-title",
    domain: "boss",
    persistedField: "bosses.<id>.{name,title}",
    canonicalOwner: "src/admin/boss-runtime-policy.ts",
    validator: "materializeBossRuntimeSession() name/title allow-list + scripts/admin/boss-registry-preview.ts validation",
    runtimeResolver: null,
    productionConsumer: null,
    previewConsumer: "scripts/admin/boss-registry-preview.ts registry preview",
    applyBoundary: "none",
    status: "REQUIRES CANONICAL MIGRATION",
    note: "Boss name/title can be persisted and previewed, but production bossIdentityForStage() still returns bundled identities and does not consume activeBossRuntimeOverride(). Keep the editor fail-closed until that authority chain is completed.",
  }),
  capability({
    id: "boss.identity-stage-usage",
    domain: "boss",
    persistedField: null,
    canonicalOwner: "src/boss/identity.ts + campaign stage/world role selection",
    validator: null,
    runtimeResolver: "src/boss/identity.ts::bossIdentityForStage()",
    productionConsumer: "Game.ts + main.ts boss encounter/title-card consumers",
    previewConsumer: "scripts/admin/boss-registry-preview.ts::allBossIdentities() read-only materialization",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Boss id, role, rank, family and stage usage are derived from bundled Galaxy/World identity tables and campaign role selection; there is no revision-backed relationship or stage-usage write seam.",
  }),
  capability({
    id: "boss.phase-mechanics",
    domain: "boss",
    persistedField: null,
    canonicalOwner: "src/boss/model.ts + src/boss/typing-mechanics.ts + src/boss/skills.ts + src/boss/identity.ts patterns",
    validator: null,
    runtimeResolver: "bossPhaseFor()/bossPatternForPhase()/boss typing and skill runtime",
    productionConsumer: "Game.ts boss combat loop",
    previewConsumer: null,
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Boss phases, projectile patterns, typing mechanics and skills are production code authority. A rich Admin phase editor would be fake until these structures gain typed persisted policy, validation and a runtime resolver.",
  }),
  capability({
    id: "boss.media-vfx-sfx-binding",
    domain: "boss",
    persistedField: null,
    canonicalOwner: "src/boss/visual-profile.ts + src/boss/boss-relief.ts + src/enemies/painted-sprites.ts + combat VFX/audio code",
    validator: null,
    runtimeResolver: null,
    productionConsumer: "bundled boss art/relief/VFX/audio paths only",
    previewConsumer: null,
    applyBoundary: "none",
    status: "REQUIRES CANONICAL MIGRATION",
    note: "Boss art, relief, aura/VFX and audio are not backed by an Admin Media V2 exact-version binding. Do not expose image, GLB, VFX or SFX pickers from the current metadata policy.",
  }),
  capability({
    id: "boss.reward-drop-binding",
    domain: "boss",
    persistedField: null,
    canonicalOwner: "campaign/boss reward systems are separate from BossRuntimeOverride",
    validator: null,
    runtimeResolver: null,
    productionConsumer: null,
    previewConsumer: null,
    applyBoundary: "none",
    status: "DEFERRED / UNSUPPORTED",
    note: "There is no canonical per-Boss reward/drop relationship in the current Admin policy. Existing campaign/reward systems must not be re-labelled as an editable Boss reward field without an explicit runtime contract.",
  }),
] satisfies readonly A7EnemyBossCapability[]);

export function a7EnemyBossCapability(id: string): A7EnemyBossCapability | undefined {
  return A7_ENEMY_BOSS_CAPABILITIES.find((entry) => entry.id === id);
}
