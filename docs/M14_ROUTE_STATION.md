# M14 — Legacy Branching Routes and Checkpoint Rest Hub

M14 originally added a persisted route layer to the 1000-stage Campaign. The approved Campaign redesign now creates **combat-only new ten-stage sectors** and a **guaranteed rest hub after Stage 010, 020, ...**. Existing in-progress route graphs with visited/selected lanes retain the M14 legacy interface until the next checkpoint. The original historical M14 implementation details below describe that compatibility path, not new-sector behavior.

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
- new graphs have exactly one Combat node per numbered stage;
- old saved branching graphs retain their authored 2-3 Combat/Shop/Station nodes until the next checkpoint;
- connects every non-terminal node to the next stage step;
- is recreated from the same seed on reload;
- creates a new graph only when the Campaign frontier crosses into a new checkpoint sector.

The UI is static DOM and does not add work to the combat frame loop.

## Route choice

Only the current Campaign progression frontier is route-gated.

Replaying an already-unlocked older stage continues to use Stage Select and is not blocked by the current frontier route.

Interim Route Map UX (before the approved Campaign Map redesign): the player may switch among the current frontier stage's displayed Combat / Shop / Station lanes before pressing Start Encounter. Only one lane is highlighted at a time; switching saves the newly selected lane and replaces the prior pending visit rather than accumulating fake visited lanes. During an in-flight selection save, other lanes and Start Encounter are temporarily disabled. After encounter entry, previous stages remain non-selectable. A reload restores the last saved selection without regenerating the deterministic graph; invalid route IDs are rejected. Purchases and service costs remain persisted independently and cannot be refunded or stock-rerolled by changing lanes.

The underlying `selectRouteNode` helper defaults to immutable first-selection behavior for legacy callers and snapshots. Only the between-encounter UI explicitly opts into reselection. Mandatory single-node stages auto-resolve and do not require an unnecessary click.

The ability to change selected lanes now applies only to a recorded in-progress **legacy** branching sector. Fresh sectors use combat-only nodes; optional Shop and Station services are available together in the guaranteed checkpoint rest hub. Hidden combat remains accessible through the legacy sector-detail dialog until unified map integration is completed.

## Shop and Station reuse

The guaranteed hub uses the existing finite-stock Normal Shop and Station Shop, and exposes Repair / Upgrade and Support Loadout together. Legacy Shop nodes still open the Normal Shop; legacy Station nodes still expose:

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
