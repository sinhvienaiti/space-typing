# M18 — Run Relics

M18 adds temporary-build Relics by extending the existing combat, route/reward, Station, checkpoint and PlayerSave systems.

It does not add a second combat loop, reward engine, route graph, currency, inventory, or persistence architecture.

## Relic state and loadout

`RelicState` owns two bounded lists:

- `owned`: unlocked Relic IDs;
- `equipped`: up to 3 owned Relics.

The initial v23 save starts with no owned/equipped Relics.

Relics are acquired inside existing progression transitions and are subject to the same checkpoint/death rollback rules as other run-persistent build state.

## Compiled runtime effects

Relic inventory is never scanned every frame or every keystroke.

Whenever the Relic loadout changes, `compileRelicEffects()` reduces the equipped set into `CompiledRelicEffects` scalar fields/hooks. `Game` consumes those fields directly.

Current effects:

- **First Light Seed** — first combat word completed each stage restores 5% max Hull;
- **Storm Script** — perfect enemy words chain into nearby normal enemies using the existing enemy softening runtime;
- **Frost Rhythm** — every 20-hit streak freezes nearby normal enemies;
- **Giant Word Lens** — boss words with 8+ characters gain +25% word damage;
- **Mirror Vow** — once per stage, a typing miss spends Shield instead of resetting streak/Power;
- **Cosmic Conductor** — stacks bounded chain/long-word bonuses with compatible Relics.

Compiler output is bounded for heal ratio, chain strength/targets, freeze duration, long-word damage and mistake-guard charges.

## Route and reward integration

M18 uses existing progression transitions:

- a committed ten-stage sector checkpoint can award one deterministic eligible unowned Relic;
- completed Tier II/III Hidden Challenges, Hidden Worlds and Champion Hunts can award a deterministic eligible unowned Relic;
- newly acquired Relics auto-equip only when a loadout slot is free;
- the existing Station Service / Upgrade screen manages equip/unequip operations.

No reward is generated when every currently stage-eligible Relic is already owned.

## Persistence and rollback

PlayerSave moves from v22 to v23.

Migration:

- v22 -> v23 adds `RelicState { version: 1, owned: [], equipped: [] }`;
- legacy checkpoint/crash/stage-entry snapshots without Relics migrate to an empty RelicState;
- v23 import validation rejects malformed Relic state;
- recovery-mirror selection preserves the selected Relic state.

Relics are part of `RunPersistentState`, therefore:

- checkpoint snapshots include ownership/loadout;
- crash recovery includes ownership/loadout;
- gameplay death rollback returns Relics to the committed checkpoint state;
- knowledge domains retain their existing special merge semantics and are not duplicated by M18.

## I/O and performance

- Save/export/import routes carry RelicState explicitly.
- Station changes autosave through the existing save queue.
- Reward selection is deterministic from source stage/key and never depends on frame-time RNG.
- Runtime combat reads compiled fields in O(1); no per-frame/per-key relic registry scan exists.

## Validation

CI #286 passes:

- 105 test files;
- 522/522 tests;
- TypeScript no-emit check;
- production Vite build;
- 115 modules transformed.

Coverage includes sanitizer behavior, three-slot loadout bounds, compiler aggregation/bounds, deterministic reward selection, v22 -> v23 migration, checkpoint rollback, crash/death fixture compatibility, and backup/import regression.

## Next milestone

M19 owns the Reward layer expansion + Codex.

M19 must extend existing stage/boss/rare reward paths and the existing Codex/knowledge persistence model instead of adding parallel reward or discovery systems.
