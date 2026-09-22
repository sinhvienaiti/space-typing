# M01 — Domain Contracts and PlayerSave Schema

This document records the implementation boundary for Gameplay Expansion milestone M01.

## Scope

M01 adds foundation contracts only. It does **not** activate checkpoint rollback, crash restoration, resurrection behavior, grade migration, multi-currency spending, World routing, or new UI.

Implemented contracts:

- World profile shape matching the expansion master plan;
- ten-stage sector, committed-checkpoint, active-segment and crash-recovery metadata;
- Alloy, Star Crystal and Quantum Core persistent currency state;
- Aluminum, Copper, Silver, Gold and Diamond grade identifiers;
- Salvage Anchor, Stage Revival Core and Phoenix Core definitions in the existing item registry.

## Persistence

PlayerSave advances from v14 to v15.

v14 -> v15 migration:

- preserves all v14 Campaign, inventory, equipment, support spell, character, pity, discovery, Credits and progression data;
- initializes expansion currencies to zero;
- initializes sector/checkpoint/active-segment metadata from the existing Campaign selection;
- leaves crash recovery empty because M03 owns runtime recovery behavior.

The existing IndexedDB/localStorage persistence path remains authoritative. M01 does not create a second save store.

## Compatibility rules

- Legacy equipment rarity remains unchanged in M01. The five-grade equipment migration is intentionally deferred to M05.
- Credits remains the existing canonical Credits field. The new currency state contains only Alloy, Star Crystal and Quantum Core.
- Resurrection items use the existing inventory. They have no gameplay stack cap; `Number.MAX_SAFE_INTEGER` is only a technical serialization/safety ceiling.
- Resurrection effects are intentionally deferred to M04.
- World registry/content is intentionally deferred to M07; M01 only provides the contract.

## Validation

M01 tests cover:

- deterministic ten-stage sector boundaries;
- expansion-state sanitization/strict validation;
- currency sanitization;
- grade identifiers;
- resurrection item registration and effectively-unbounded accumulation;
- PlayerSave v14 -> v15 migration;
- strict backup validation for the v15 fields.

CI Test + Build must pass before M01 is marked complete in the master plan.
