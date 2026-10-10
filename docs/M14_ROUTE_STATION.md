# M14 — Legacy Branching Routes and Checkpoint Rest Hub

M14 originally added a persisted route layer to the 1000-stage Campaign. The approved Campaign redesign now creates **combat-only new ten-stage sectors** and a **guaranteed rest hub after Stage 010, 020, ...**. Existing in-progress route graphs with visited/selected lanes retain the M14 legacy interface until the next checkpoint. The original historical M14 implementation details below describe that compatibility path, not new-sector behavior.

## R01 redesign status

The current Campaign presentation keeps M14 persistence as the compatibility foundation while changing the player-facing route model:

- untouched/new ten-stage sectors contain one Combat node per numbered stage;
- an already-started legacy branching sector remains playable with its recorded Combat/Shop/Station choices until the next checkpoint instead of being destructively migrated;
- the current ten-stage sector is rendered as detail inside the unified Journey Map rather than as a competing normal-route grid;
- the x10 mandatory encounter/boss is cleared first, then the guaranteed Rest Hub becomes available with Shop, Repair/Upgrade and Support Loadout together;
- opening services does not create a numbered stage, reroll stock or advance Campaign progression;
- R01 real-browser QA is enforced by `pnpm visual:r01-qa`; CI #1819 and the CI-generated desktop/mobile screenshot review are accepted.

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

The ability to change selected lanes now applies only to a recorded in-progress **legacy** branching sector. Fresh sectors use combat-only nodes; optional Shop and Station services are available together in the guaranteed checkpoint Rest Hub. The Journey Map embeds the current ten-stage sector detail and discovered hidden-stop landmarks without reintroducing ordinary Shop/Station alternatives at numbered stages.

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

The R01 Rest Hub is a post-clear service state: checkpoint progression remains authoritative before Rest Hub inventory/service mutations occur, and closing/reopening the hub does not manufacture another sector clear or another stock roll.

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
- combat-only fresh-sector behavior and legacy-sector transition;
- guaranteed checkpoint Rest Hub behavior;
- all existing persistence/checkpoint/death/shop regressions.

Historical M14 integration passed CI #251. The R01 redesign validation is now accepted on CI #1819 at commit `e48194bbc72fdf055805e472bf5c862204ced44a`: 257 / 257 test files and 1659 / 1659 tests passed, production Build passed, and the real-Chrome desktop/mobile Campaign Map gate passed with zero horizontal overflow. The uploaded captures were reviewed and accepted for hierarchy/readability. Later device-specific findings remain normal regressions rather than an open R01 milestone.

M15 owns Hidden Challenge / Hidden World / Champion Hunt and must extend this persistence contract rather than create a second navigation/save layer. Hidden Shop/Station post-stage discovery uses the shared discovery/shop persistence but is not a replacement for those M15 optional combat activities.
