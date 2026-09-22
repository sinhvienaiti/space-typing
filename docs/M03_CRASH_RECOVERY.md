# M03 — Crash Recovery vs Gameplay Rollback

M03 separates technical recovery from gameplay checkpoints without creating a second persistence backend.

## State layers

The existing PlayerSave remains the only persisted root.

- **Active segment:** normal top-level PlayerSave state.
- **Committed checkpoint:** `checkpointSnapshot`, introduced in M02.
- **Crash recovery:** `crashRecoverySnapshot`, introduced in PlayerSave v17.

A crash recovery snapshot contains:

- the last safe active persistent state;
- Campaign expansion/frontier metadata;
- the committed checkpoint snapshot that was valid at that transition;
- safe-transition reason and timestamp;
- a `deathInvalidated` flag.

It does not contain transient Canvas/combat objects, projectiles, temporary buffs or boss runtime objects.

## Safe transitions

M03 captures deterministic recovery state at bounded I/O points rather than per frame.

Current safe transitions include:

- stage entry;
- stage clear;
- Stage Select;
- shop purchases;
- equipment upgrades;
- character/equipment/support loadout changes;
- character talent changes;
- mission reward claims;
- hidden discovery transitions;
- manual save/export;
- page lifecycle checkpoints.

Combat item use, ordinary equipment drops and other in-encounter mutations do not independently redefine the recovery point.

## Technical crash behavior

When a valid non-death recovery snapshot exists, loading restores that snapshot even if a newer unsafe top-level autosave exists.

Example:

```text
checkpoint 181
safe transition: enter Stage 190
browser/process crash
reload -> restore the saved Stage 190 active segment state
```

This does not redefine the gameplay checkpoint. The committed checkpoint remains Stage 181 until Stage 190 is cleared and the sector commits.

## Death invalidation and anti-reload rule

A real gameplay death invalidates crash recovery before normal rollback is applied.

Death flow:

1. mark the current recovery snapshot `deathInvalidated=true`;
2. synchronously write the invalid marker to the existing localStorage recovery mirror;
3. enqueue the same invalid marker through the existing IndexedDB autosave queue;
4. restore the committed M02 checkpoint;
5. enqueue the rolled-back gameplay state after the invalid marker.

The queue preserves write order. If the browser reloads during the transition, either persisted death-invalid representation resolves to the committed checkpoint.

A death-invalid snapshot is never restored as active progress. Load/import resolution applies the M02 checkpoint rollback instead.

## Page lifecycle

`visibilitychange(hidden)` and `pagehide` capture a `pagehide` recovery snapshot and write the recovery mirror synchronously before the async IndexedDB flush.

This keeps deliberate reload/navigation from reverting persistent inventory/economy changes to an older recovery point.

## Backup/import

PlayerSave advances from v16 to v17.

v16 -> v17 migration:

- preserves Campaign, committed checkpoint and all M02 persistent state;
- initializes `crashRecoverySnapshot` to `null`.

Current-version backup import strictly validates crash recovery snapshots. Import also runs the same crash/death resolver as normal loading, so importing a death-invalid backup cannot bypass rollback.

## Performance and compatibility

- no new database/store is created;
- no per-frame serialization is added;
- recovery snapshots are captured only at explicit safe transitions;
- the existing IndexedDB + localStorage mirror path is reused;
- boss/status/reward/equipment/audio runtimes are unchanged;
- M04 owns death-choice UI and Salvage Anchor / Stage Revival Core / Phoenix Core behavior.
