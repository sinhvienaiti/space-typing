# M07 — World Engine

M07 introduces the canonical 50-World layer for the 1000-stage Campaign without replacing the existing Campaign, enemy, boss, shop, persistence or audio systems.

## World mapping

The Campaign remains sequential:

- 1000 total stages;
- 50 Worlds;
- 20 stages per World;
- 5 Worlds per Galaxy;
- 10 Galaxies.

Canonical mapping examples:

- Stage 001-020 -> World 01;
- Stage 021-040 -> World 02;
- Stage 081-100 -> World 05;
- Stage 101-120 -> World 06;
- Stage 981-1000 -> World 50.

The canonical resolver is `worldForStage(stage)`.

## WorldProfile registry

`src/worlds/registry.ts` owns the 50 runtime World profiles.

Each profile contains the M01 contract fields needed by later milestones:

- id and name;
- Galaxy and stage range;
- visual theme;
- background / ambient profile ids;
- enemy-family and enemy-roster contracts;
- rank-distribution contract;
- elite / apex pools;
- Mini Boss / World Boss ids;
- World rules and hazards;
- word affinity;
- reward and shop pools;
- hidden event / challenge pools;
- music profile id;
- transition presentation id.

M07 establishes this authoritative registry. M08 consumes music/ambient identity and M09 consumes World-specific enemy/boss roster mapping. M07 does not create duplicate combat registries.

## Authored World identity

The 50 Worlds are authored in ten five-World Galaxy groups.

The World names and profile contracts change by Galaxy and by slot inside each Galaxy so late Campaign content does not resolve to the same generic identity with only larger numbers.

Examples include:

- Rainbow Reach;
- Halo Garden;
- Demon Crown;
- Winter Oracle;
- Ancient Grove;
- Shadow Crown;
- Cosmic Engine;
- Void Chapel;
- Polar Singularity;
- Cosmic Crown.

## Stage rhythm contract

M07 exposes deterministic World-local helpers:

- World entry: local stage 01;
- Mini Boss contract: local stage 10;
- World Boss contract: local stage 20;
- Galaxy Major Boss override: Campaign x100.

These helpers are contracts for M09 and later encounter-authoring work.

The current combat stage-role implementation is not silently rewritten in M07. Player-facing M07 transition UI therefore shows World identity and local stage position, not a future boss label that is not active yet.

## Visual / environment contract

`src/worlds/environment.ts` remains the validated color/atmosphere source for
each World:

- background core / mid / edge colors;
- star color;
- grid/accent color;
- haze color;
- grid/accent intensity;
- haze intensity;
- star drift.

The production background is no longer one generic star/grid scene with palette
changes only. The current World Scene System is defined by:

- `src/worlds/scene-types.ts`;
- `src/worlds/scene-registry.ts`;
- `src/worlds/scene-renderer.ts`;
- `docs/WORLD_BACKGROUND_SCENE_SYSTEM_PLAN.md`.

Every one of the 50 Worlds resolves one `WorldSceneProfile`. The ten Galaxy
groups use ten scene archetypes:

- celestial/rainbow;
- infernal;
- frost/prism;
- verdant;
- shadow/nature;
- cosmic forge;
- abyssal;
- aurora/cosmic/meteor;
- void cathedral;
- eternity/final crown.

Each five-World Galaxy group also has five deterministic scene variants with
World-specific landmark, floor and ambient-particle identities. These style
contracts are consumed by runtime rendering; they are not decorative config
fields.

The Canvas scene renderer separates static and dynamic work:

- static sky/nebula/landmark geometry is cached per World + size + DPR + quality;
- stars, themed floor motion and ambient particles remain lightweight dynamic
  layers;
- scene ambient counts are bounded by Visual Quality;
- cache invalidation happens on World change, resize, adaptive DPR change or
  visual-quality change;
- the existing hidden-encounter environment-stage override also selects the
  corresponding scene.

The scene is resolved when a stage starts or the environment World changes. It
does not scan the World registry each combat frame.

There is no separate hidden setting required to enable World backgrounds.
Low/Medium/High/Ultra change detail budgets, not scene identity.

The existing Canvas renderer, combat particle system and adaptive visual-quality
budgets remain authoritative.

## Transition / menu presentation

The title screen displays the selected World name and stage range.

When entering a different World, or starting a World-entry stage, a lightweight World transition card displays:

- Galaxy number;
- World number;
- World name;
- current Campaign stage;
- local stage position out of 20.

This is DOM presentation outside the hot combat loop.

## Shop integration

M06 used a temporary deterministic `world-XX` formula as an explicit bridge until M07.

M07 replaces that source with:

`worldForStage(stage).id`

The existing M06 `ShopState`, deterministic stock, persistence and rollback logic are unchanged. There is no second shop system.

## Persistence

World identity is derived deterministically from Campaign stage and the static registry.

No new PlayerSave field is required.

This avoids storing redundant World ids that could drift from Campaign progress.

## Validation

M07 tests verify:

- exactly 50 Worlds;
- all 1000 Campaign stages map to exactly one correct 20-stage World;
- five Worlds map to each Galaxy;
- registry ids/names/ranges are valid and unique;
- World-local stage helpers are deterministic;
- every World has a valid environment profile;
- every World resolves one valid WorldSceneProfile;
- all ten scene archetypes are represented;
- every Galaxy has five deterministic scene variants;
- scene quality budgets remain bounded;
- every profile has non-empty contracts for later enemy/reward/shop/music consumers;
- M06 shop identity receives the canonical World id and changes at World boundaries.

M08 owns Dynamic World Music / Ambient runtime behavior.
M09 owns World-driven enemy and boss roster selection.
