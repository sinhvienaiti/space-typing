# M05 — Grade and Core Currency Migration

M05 replaces the player-facing equipment rarity model with the five-grade system defined in the gameplay expansion plan and activates the persistent core currencies introduced in M01.

## Equipment grades

The runtime grade ids are:

- Aluminum — `aluminum`
- Copper — `copper`
- Silver — `silver`
- Gold — `gold`
- Diamond — `diamond`

Equipment instances now persist `grade` instead of `rarity`.

The stat multipliers preserve the old power curve for migrated equipment and add Diamond above the previous ceiling:

- Aluminum: 1.00
- Copper: 1.12
- Silver: 1.28
- Gold: 1.50
- Diamond: 1.80

Enhancement remains a separate +0 through +5 axis.

## Legacy migration

PlayerSave advances from v18 to v19.

Legacy equipment is mapped explicitly:

- Common -> Aluminum
- Rare -> Copper
- Epic -> Silver
- Legendary -> Gold
- Diamond has no legacy source and is a new top grade

Migration preserves:

- equipment definition id;
- instance id;
- loadout references;
- enhancement level;
- inventory;
- Campaign progress;
- Credits;
- Alloy / Star Crystal / Quantum Core;
- checkpoint state;
- crash recovery;
- stage-entry recovery.

Versions 6 through 18 are validated against the old rarity+enhancement shape before migration. Current v19 backups must use the grade shape; a current-version backup cannot smuggle legacy `rarity` fields through sanitization.

## Grade and drop probability are separate

Grade is equipment quality. Drop probability remains controlled by source-specific weights.

The existing equipment drop chance still depends on source and Salvage. Once a drop occurs, a separate five-grade weight roll chooses the grade.

Diamond is intentionally present at very low weight in ordinary loot tables. Luck can improve high-grade weighting, but Luck is capped and never turns Diamond into a guaranteed result.

## Existing shops

M05 converts existing equipment offers to grade terminology so no legacy rarity name leaks into the player-facing runtime.

- Normal Shop: Aluminum / Copper equipment.
- Black Market: Copper / Silver / Gold, with Diamond introduced in late-game stock.
- Service Shop: enhancement cost scales by grade, with Diamond above Gold.

M06 still owns deterministic random shop instances, finite stock, resurrection-item availability and shop-specific multi-currency payment. M05 does not pre-implement those systems.

## Core currencies

Credits remains its existing canonical field.

The M01 expansion-currency state remains the single persistent location for:

- Alloy;
- Star Crystal;
- Quantum Core.

M05 activates stage-clear income:

- every clear can award Alloy;
- Elite / special / boss roles award stronger Alloy amounts;
- Mini Boss / Boss / Major Boss roles award Star Crystal;
- Major Boss stages award Quantum Core;
- the final major boss gives the larger Quantum Core reward.

These rewards are applied before M02 checkpoint commit. Therefore currency gained inside an uncommitted ten-stage segment is ordinary economic state and rolls back on unprotected death. A checkpoint clear commits the resulting currency balance together with the rest of persistent economic state.

Salvage Anchor continues to preserve the active economic balance by design. Stage Revival Core restores the deterministic stage-entry economic balance. Phoenix Core continues the current encounter.

## Item grades

The existing item registry now has grade identity where meaningful:

- basic recovery cells: Aluminum;
- common tactical consumables: Copper;
- rarer tactical/special items: Silver;
- Salvage Anchor: Silver;
- Stage Revival Core: Gold;
- Phoenix Core: Diamond.

This uses the existing item registry and does not create another inventory type.

## UI

Equipment, drop notices, reward choices and existing shops now display grade names rather than Common/Rare/Epic/Legendary.

The Data summary and stage-clear result expose Credits, Alloy, Star Crystal and Quantum Core balances/rewards.

## Validation focus

Tests cover:

- explicit legacy rarity -> grade mapping;
- v18 -> v19 PlayerSave migration while preserving enhancement and currencies;
- strict old-version vs current-version backup validation;
- five-grade loot distribution and Diamond rarity;
- grade-based equipment power and service cost;
- grade-aware Normal Shop and Black Market offers;
- stage-clear multi-currency rewards;
- currency accumulation;
- currency rollback through the existing ten-stage checkpoint model.

No new persistence backend, inventory, equipment registry or parallel reward system is introduced.
