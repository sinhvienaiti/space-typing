# M09 — World Enemy / Boss Roster Mapping

M09 makes the canonical M07 World profile the runtime source of enemy-family, enemy-roster, rank-band and boss identity.

The implementation reuses the existing `Game`, EnemyKind mechanics, enemy registry/renderer, reward system, BossState/model, SFX/VFX and difficulty systems. It does not create a second enemy or boss runtime.

## World authority

Each `WorldProfile` already contains:

- `enemyFamilies`;
- `enemyRoster`;
- `rankDistribution`;
- `elitePool`;
- `miniBoss`;
- `worldBoss`.

M09 makes those contracts active.

The World registry now strongly types enemy/boss ids against `EnemyDefinitionId` and validates:

- every regular roster entry exists;
- roster families belong to the World;
- boss definitions are not placed in the regular roster;
- every Elite pool entry is a registered Elite in the same roster;
- Mini Boss ids resolve to existing Mini Boss definitions;
- World Boss ids resolve to existing Boss definitions;
- Mini Boss / World Boss families belong to the authored World family set;
- Rank I-X weight entries are finite, non-negative and contain at least one positive weight.

## Enemy selection

`src/worlds/roster.ts` owns the World-aware selection layer.

Existing `EnemyKind` still controls combat mechanics such as:

- speed;
- size;
- movement/drift;
- typing layers currently supplied by the old kind profile;
- support/projectile behavior;
- action cadence.

M09 changes the visual/reward definition selected for that kind.

Selection order:

1. resolve the current World from Campaign stage;
2. inspect only that World's authored enemy roster;
3. prefer a definition whose enemy role matches the current `EnemyKind`;
4. prefer the first/primary World family when that role exists there;
5. use the World Elite pool for Elite spawns;
6. keep reward replacements inside the same World roster;
7. never select Boss/Mini Boss definitions for regular spawns.

This preserves the established combat runtime while giving each World an authored family identity.

## World roster vs legacy minStage

Before M09, global enemy `minStage` values controlled when visual definitions could appear.

After M09:

- `minStage` remains legacy/global compatibility data for the older spawn-profile helpers and tests;
- the production `Game` runtime uses the authored World roster;
- if a World explicitly contains an enemy definition, the World contract is authoritative and legacy `minStage` does not veto it.

This is required so an early authored Prism/Shadow/etc. World can actually look like that World instead of silently falling back to old globally unlocked visuals.

The legacy helpers remain available for compatibility but are no longer the production spawn source.

## Boss identity

M09 adds stage-aware boss visual resolution:

- Mini Boss -> `world.miniBoss`;
- World Boss -> `world.worldBoss`;
- Galaxy Major Boss -> the fifth World's `worldBoss` identity.

Boss HP, typing, phase, projectile, reward and combat behavior still use the existing BossState/model.

Only identity/visual-family selection changes.

## Campaign boss rhythm migration

M07 defined the canonical 20-stage World rhythm but deliberately did not silently change existing combat cadence.

M09 performs that migration intentionally.

For each World:

```text
local stage 10 -> Mini Boss
local stage 20 -> World Boss
```

For the fifth World of each Galaxy:

```text
Galaxy local stage 100 -> Galaxy Major Boss
```

The Major Boss still uses the fifth World's authored World Boss identity, while the existing `major-boss` BossRole supplies stronger HP/phase/combat behavior.

## Non-boss encounter cadence

M09 preserves the existing encounter-role vocabulary without mixing the old boss positions back into the new World rhythm.

Within each World:

- local stage 05 -> Elite;
- local stage 10 -> Mini Boss;
- local stage 15 -> stronger/special encounter chosen by World slot;
- local stage 20 -> World Boss or Galaxy Major Boss.

Local stage 15 rotates by World slot inside a Galaxy:

- World 1 -> Special;
- World 2 -> Elite;
- World 3 -> Hazard;
- World 4 -> Elite;
- World 5 -> Gauntlet.

This keeps existing Special/Hazard/Gauntlet event systems active while World boss cadence becomes authoritative.

## Rank-band contract

M09 does not implement Rank I-X combat effects; that belongs to M10.

It does establish the authoritative source:

```text
worldRankDistributionForStage(stage)
-> current WorldProfile.rankDistribution
```

M10 must consume this contract rather than invent a second global rank curve.

## Runtime integration

`Game.spawnEnemy()` now uses:

```text
spawnWorldEnemyDefinitionId(...)
```

Enemy visual/reward fallback paths use:

```text
worldRuntimeEnemyDefinitionId(...)
```

Boss rendering/intros/phases/death effects use:

```text
bossVisualDefinitionIdForStage(...)
bossVisualNameForStage(...)
```

The legacy Galaxy-only boss visual resolver remains for compatibility tests/history but is no longer the production Game path.

## M08 interaction

M08 maps soundtrack state from production `StageRole`.

Because M09 intentionally migrates `StageRole` boss cadence, music follows automatically:

- World local 10 -> MINI_BOSS;
- World local 20 -> WORLD_BOSS;
- Galaxy 100 -> GALAXY_BOSS.

No extra audio routing is required.

## Persistence

No PlayerSave schema change is required.

World identity, enemy roster and boss selection are deterministic from:

- Campaign stage;
- static World registry;
- existing spawn RNG.

No redundant World/enemy identity state is persisted.

## Validation

M09 automated coverage verifies:

- all 50 World roster contracts;
- all 1000 stages can resolve valid World enemy definitions;
- resolved enemy definitions remain inside the current World roster/family set;
- primary family preference when a compatible role exists;
- Elite selection stays inside `elitePool` where available;
- reward replacement never escapes the current World roster;
- World-authored definitions are not blocked by legacy `minStage`;
- boss identity resolves from current World for Mini/World/Major Boss roles;
- Campaign role cadence follows the 20-stage World rhythm;
- Galaxy hazard/special/gauntlet regression tests use the new intra-World cadence;
- early/later Campaign balance audits use representative World milestones.

M10 owns Rank I-X mechanics, WordDifficultyScore and 1/2/3 typing-layer behavior.
