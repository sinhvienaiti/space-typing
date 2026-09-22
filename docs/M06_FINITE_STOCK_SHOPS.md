# M06 — Deterministic finite-stock shops

M06 replaces the earlier offer-only shop slices with one persistent shop-instance model. A shop encounter is rolled once, stored in PlayerSave, and reused on reopen/reload. Buying stock reduces that exact persisted instance.

## Canonical state

`ShopState` is part of the existing `RunPersistentState` and PlayerSave v20.

A `ShopInstance` owns:

- deterministic instance id;
- shop type;
- temporary World key;
- stage and ten-stage sector start;
- deterministic seed;
- finite stock entries.

The instance id is based on shop type + World key + ten-stage sector. Luck/progression can influence the first deterministic roll, but once an instance exists its stock is reused even if those values later change.

M07 replaces the temporary 20-stage `world-XX` key with the canonical World registry. The persisted shop contract does not need another schema.

## Shop types

The shared runtime supports:

- Normal Shop;
- Station Shop;
- Traveling Merchant;
- Black Market;
- Hidden Shop;
- Event Shop;
- Service / Upgrade Shop.

Normal, Station, Traveling, Black Market, Hidden and Event stock use the same `ShopState` generator/purchase path.

Service / Upgrade keeps the existing enhancement/repair service because it mutates owned equipment rather than selling finite generated stock.

The superseded standalone Normal Shop and Special Shop implementations were removed so there is no parallel stock system.

## Availability

- Normal and Station are regular access points.
- Traveling Merchant appearance is deterministic per current context and Luck has bounded influence.
- Black Market requires the existing `black-market-signal` discovery.
- Hidden Shop and Event Shop require the existing `echo-rift` discovery.

Opening an already-created shop cannot reroll it.

## Finite stock

Every stock entry persists a `remaining` quantity.

Purchasing:

1. resolves the persisted shop instance;
2. rejects missing/sold-out stock;
3. verifies all required currencies;
4. verifies item stack or equipment-instance validity;
5. applies inventory/equipment mutation;
6. deducts currencies;
7. decrements stock;
8. autosaves through the existing persistence/recovery path.

Player inventory remains governed by existing item stack rules. Finite stock is a property of a shop encounter, not a new global inventory cap.

## Currency preferences

M06 uses the persistent currencies introduced by M05:

- Normal -> Credits;
- Station / Traveling -> Credits + Alloy;
- Service / Upgrade -> Credits + Alloy;
- Black Market -> Credits + Star Crystal, with top-end offers able to require Quantum Core;
- Hidden Shop -> Star Crystal / Quantum Core;
- Event Shop -> Star Crystal exchange for now.

The master plan defines content-scoped special tokens as optional. M06 intentionally does not add a permanent Event Token before an event-token earning loop exists. When authored event content introduces such a loop, the Event Shop price contract can be extended without another shop inventory implementation.

## Resurrection/protection availability

Salvage Anchor, Stage Revival Core and Phoenix Core can appear only in eligible rare merchant pools:

- Traveling Merchant;
- Black Market;
- Hidden Shop.

Their source-specific chances are low, Luck influence is capped, and each rolled protection item has stock 1. A normal shop cannot roll them.

## Checkpoint / recovery semantics

Because `ShopState` is inside `RunPersistentState`, the existing M02-M04 rules apply automatically:

- uncommitted shop purchases/stock changes roll back on ordinary checkpoint death;
- checkpoint commit preserves the new stock state;
- crash recovery restores the last safe shop state;
- Stage Revival Core restores deterministic stage-entry shop/economy state;
- Salvage Anchor preserves active segment economic/shop gains by its existing design;
- Phoenix Core continues the same in-memory encounter.

Reloading cannot be used to reroll a shop for protection items.

## Save compatibility

PlayerSave advances from v19 to v20.

Migration:

- adds an empty canonical `ShopState`;
- migrates old checkpoint snapshots that lack shops;
- migrates old crash-recovery nested state that lacks shops;
- migrates old stage-entry nested state that lacks shops;
- preserves existing Campaign, equipment, inventory, currencies, recovery state and knowledge.

Current v20 backups require a valid shop state. Old supported backups use legacy snapshot migration rather than pretending their old shape is v20.

## Validation

Automated coverage includes:

- deterministic instance id/seed/stock;
- reopen without reroll;
- finite decrement and sold-out rejection;
- atomic multi-currency spending;
- deterministic Traveling Merchant availability;
- restricted finite resurrection stock;
- checkpoint rollback of stock and purchased equipment;
- Service Shop Credits + Alloy behavior;
- PlayerSave v19 -> v20 migration;
- current-backup ShopState validation;
- legacy checkpoint/crash/stage-entry compatibility.

CI Test + Build is required before merge.
