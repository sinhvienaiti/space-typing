# M17 — Skill / Attribute / Equipment Upgrade Expansion

M17 extends the existing SkillEngine, effective-stat pipeline, EquipmentState, Station service path, checkpoint/crash persistence, and PlayerSave schema.

It does not introduce parallel progression, equipment, shop, currency, or persistence systems.

## Skill Lv1-Lv5

Core defensive/offensive skills now resolve through a shared level compiler.

Rules:

- valid levels are Lv1-Lv5;
- Lv1 preserves the authored base definition;
- higher levels improve energy efficiency, cooldown and effect scale within bounded profiles;
- Lv5 exposes a mastery flag consumed by the existing Game skill execution paths;
- the current SkillEngine remains authoritative for activation, cooldowns, charges, typing conditions and stage limits.

The production Game runtime applies the compiled effect scale/mastery behavior to existing defensive and offensive skill effects rather than creating separate skill implementations.

## Permanent attributes

UpgradeState stores persistent levels for the existing core stats:

- Hull;
- Shield;
- Firepower;
- Armor;
- Energy;
- Reactor;
- Focus;
- Ward;
- Luck;
- Salvage.

Combat-oriented attributes cap at Lv20.

Luck and Salvage cap at Lv10 and use stricter cost/stage curves because they influence economy/reward behavior.

Permanent bonuses are injected through the existing `calculateEffectiveStats()` permanent-stat lane.

## Equipment service expansion

The existing EquipmentState now supports compact optional affixes on equipment instances.

Affix rules:

- Aluminum/Copper: no affix slots;
- Silver: one affix;
- Gold/Diamond: two affixes;
- duplicate affixes are rejected/sanitized;
- equipped affix bonuses are included by the existing equipment stat aggregator.

Station services now include:

- +0 through +5 equipment enhancement;
- dismantling of unequipped equipment;
- Silver +5 -> Gold +0 evolution;
- Gold +5 -> Diamond +0 evolution;
- affix roll;
- one-affix reroll while other affixes remain locked.

Evolution keeps the equipment instance and compatible affixes, changes grade, and resets enhancement to +0.

Dismantling uses the existing expansion-currency state and cannot dismantle equipped items.

## Economy and stage gates

M17 uses only the existing currencies:

- Credits;
- Alloy;
- Star Crystal;
- Quantum Core.

Skill, attribute, evolution and affix services use explicit cost and Campaign-stage gates.

No new M17 currency or merchant-state system is introduced.

## Station integration

The existing Service / Upgrade Station UI consumes the same service-shop state used by repair and equipment enhancement.

Successful operations update the existing in-memory state, refresh equipment/effective stats, and use the current autosave/checkpoint model.

## Persistence and rollback semantics

PlayerSave is upgraded from v21 to v22.

Migration rules:

- v21 -> v22 adds a default UpgradeState;
- existing Campaign, inventory, equipment, shops, route, hidden content and recovery domains remain intact;
- core skills start at Lv1;
- permanent attributes start at Lv0.

UpgradeState is part of RunPersistentState, checkpoint snapshots and crash recovery.

Therefore uncommitted M17 purchases/upgrades follow the same segment rollback semantics as other run-persistent economy/equipment state.

Equipment affixes are stored on the existing EquipmentInstance shape and sanitized during PlayerSave migration/load.

## Validation

Automated coverage includes:

- default/sanitized UpgradeState;
- skill Lv1-Lv5 bounds and Lv5 mastery;
- stricter Luck/Salvage caps/costs;
- permanent-stat conversion;
- equipment affix stat aggregation;
- affix reroll locking;
- grade evolution requirements/reset;
- Station skill/attribute/equipment service transactions;
- PlayerSave v21 -> v22 migration;
- checkpoint, crash-recovery and death-protection integration.

CI #281 passes:

- 104 test files;
- 517/517 tests;
- TypeScript no-emit type check;
- production Vite build.

## Next milestone

M18 owns Run Relics.

M18 must compile relic effects into the existing runtime/stat/reward/route systems and must not create a second progression or persistence architecture.
