# M14 — Branching Route Map + Station

M14 adds a deterministic, persisted route layer between Campaign encounters without replacing the sequential Stage 001-1000 progression model.

## Route model

Each committed ten-stage checkpoint sector has one deterministic route graph generated from the existing Campaign stage seed contract.

Current M14 node types are:

- Combat;
- Shop;
- Station.

Hidden Signal / Hidden Challenge / Hidden World route content is intentionally owned by M15.

Every route step still targets the same numbered Campaign stage. A route choice changes the service/context before the encounter; it does not skip or renumber stages.

## Mandatory boss continuity

Mini Boss, World Boss and Galaxy Major Boss stages resolve to one mandatory Combat node.

Therefore route selection cannot bypass authored boss cadence.

## Deterministic graph guarantees

The graph:

- covers every stage in the current ten-stage sector;
- has 2-3 lanes on ordinary branching steps;
- has at least one Combat lane on ordinary steps;
- connects every non-terminal node to the next stage step;
- is recreated from the same seed on reload;
- creates a new graph only when the Campaign frontier crosses into a new checkpoint sector.

The UI is static DOM and does not add work to the combat frame loop.

## Route choice

Only the current Campaign progression frontier is route-gated.

Replaying an already-unlocked older stage continues to use Stage Select and is not blocked by the current frontier route.

Interim Route Map UX (before the approved Campaign Map redesign): the player may switch among the current frontier stage's displayed Combat / Shop / Station lanes before pressing Start Encounter. Only one lane is highlighted at a time; switching saves the newly selected lane and replaces the prior pending visit rather than accumulating fake visited lanes. During an in-flight selection save, other lanes and Start Encounter are temporarily disabled. After encounter entry, previous stages remain non-selectable. A reload restores the last saved selection without regenerating the deterministic graph; invalid route IDs are rejected. Purchases and service costs remain persisted independently and cannot be refunded or stock-rerolled by changing lanes.

The underlying `selectRouteNode` helper defaults to immutable first-selection behavior for legacy callers and snapshots. Only the between-encounter UI explicitly opts into reselection. Mandatory single-node stages auto-resolve and do not require an unnecessary click.

This is a transitional usability fix, not completion of `docs/CAMPAIGN_MAP_AND_REST_STOP_REDESIGN.md`. The approved redesign removes routine per-stage Shop/Station lanes entirely and places them at checkpoint rest hubs.

## Shop and Station reuse

Shop nodes open the existing deterministic finite-stock Normal Shop.

Station nodes expose existing production systems:

- Station Shop;
- Repair / Upgrade;
- Support Loadout.

M14 does not create a second inventory, merchant, equipment or service runtime.

Future dismantling, affix and grade-evolution services remain owned by M17.

## Persistence

RouteState is part of RunPersistentState.

It therefore participates in the same existing flows as other segment state:

- committed checkpoint snapshots;
- stage-entry snapshots;
- crash-recovery snapshots;
- gameplay-death rollback;
- Salvage Anchor / Stage Revival behavior;
- IndexedDB;
- recovery mirror;
- backup export/import.

Route choice autosave uses the existing route-choice crash-recovery reason.

## PlayerSave v21

M14 bumps PlayerSave from v20 to v21.

v20 -> v21 migration:

- preserves Campaign;
- preserves inventory/equipment/support/characters;
- preserves luck/discovery/progression/economy;
- preserves deterministic ShopState;
- preserves checkpoint/crash/stage-entry snapshots through migration-aware sanitization;
- creates the deterministic RouteState from the saved Campaign frontier.

Backup import explicitly continues to accept valid v20 files.

Current v21 backup validation also validates RouteState against the saved Campaign sector.

## Checkpoint semantics

A route choice made inside an uncommitted segment rolls back with the segment after an unprotected gameplay death.

A safely captured route choice is restored after a technical crash.

When a sector-end clear advances the Campaign frontier, the next sector RouteState is created before the new checkpoint snapshot is committed, so checkpoint and route sector cannot drift apart.

## Audio lifecycle

Opening Shop/Station services uses the existing SHOP/STATION music states.

Closing those dialogs:

- restores World music from title;
- restores VICTORY music from stage-clear.

No new audio controller or SFX lifecycle is introduced.

## Validation

Automated coverage verifies:

- deterministic graph generation;
- complete ten-stage connectivity;
- mandatory boss Combat nodes;
- persisted route choice without reload reroll;
- immutable first selection;
- invalid-node rejection;
- route reset only at sector crossing;
- bounded route-choice progress;
- checkpoint sector alignment;
- route choice crash recovery;
- PlayerSave v20 -> v21 migration;
- v20 backup import compatibility;
- all existing persistence/checkpoint/death/shop regressions.

CI #251 passes Test + Build on the complete runtime integration.

M15 owns Hidden Challenge / Hidden World / Champion Hunt and must extend this route contract rather than create a second navigation/save layer.
