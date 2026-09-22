# M04 — Death Protection and Resurrection

M04 activates the three protection items registered in M01 and integrates them with the M02 checkpoint and M03 crash-recovery layers.

## Death resolution

A real gameplay death no longer immediately applies the M02 rollback inside the same frame.

Instead:

1. M03 first writes a death-invalid recovery marker.
2. The game enters the existing Game Over phase.
3. The death-resolution panel shows available protection items.
4. The player may choose Salvage Anchor, Stage Revival Core, Phoenix Core, or the normal checkpoint path.
5. Reloading before a choice still resolves through M03 to the committed checkpoint, so the pending choice cannot be used as a reload exploit.

Leaving Game Over through Stage Select or Back to Title first resolves the ordinary committed checkpoint.

## Salvage Anchor

Internal id: salvage-anchor.

Behavior:

- one item is consumed;
- Campaign stage rolls back to the committed ten-stage checkpoint;
- Credits, expansion currencies, inventory, equipment, character progression and other current persistent build/economic state are preserved;
- best-stage records and discovered knowledge remain preserved;
- temporary combat runtime does not survive because the encounter ends;
- the next run starts from the checkpoint stage.

This uses the existing M02 committed checkpoint only for Campaign rollback; it does not copy a second inventory/equipment system.

## Stage Revival Core

Internal id: stage-revival-core.

M04 adds a persisted stageEntrySnapshot and advances PlayerSave from v17 to v18.

The stage-entry snapshot contains:

- persistent state at stage entry;
- Campaign expansion/frontier state;
- the committed checkpoint valid at entry;
- stage id and capture timestamp.

On death:

- state is restored to deterministic stage-entry state;
- earlier active-segment gains remain because they already existed at stage entry;
- provisional gains created during the failed stage are reverted before replay;
- knowledge/meta observations already discovered are retained;
- one Stage Revival Core is removed from the restored inventory;
- the same failed stage restarts through the normal stage-start path.

Reverting failed-stage provisional rewards is intentional: preserving them and replaying the same deterministic stage would allow reward duplication.

## Phoenix Core

Internal id: phoenix-core.

Phoenix does not restart the stage and does not rebuild the encounter.

Game.reviveCurrentEncounter():

- only succeeds from Game Over with an active stage;
- preserves enemy state;
- preserves boss HP and phase;
- preserves encounter spawn progress;
- clears hostile projectiles at the resurrection instant;
- restores 35% Hull;
- restores 25% Shield;
- restores 30% Energy;
- does not fully refill Power or other combat resources;
- applies a 2.5-second visible damage-grace window;
- returns the existing Game instance to Playing.

The death-invalid M03 marker is replaced with the safe stage-entry recovery snapshot after the Phoenix is consumed. If a later technical reload happens during the revived encounter, recovery returns to the safe stage-entry point with the Phoenix already consumed instead of restoring unsafe mid-encounter rewards.

## UI

The existing Game Over overlay now shows:

- Salvage Anchor count;
- Stage Revival Core count;
- Phoenix Core count;
- normal checkpoint retry;
- checkpoint + Stage Select;
- checkpoint + Back to title.

Buttons are disabled when the item is unavailable. Stage Revival and Phoenix also require the matching stage-entry snapshot.

## Persistence and compatibility

PlayerSave v18 adds stageEntrySnapshot: StageEntrySnapshot | null.

v17 -> v18 migration keeps every M03 field and initializes the new snapshot to null.

Backup import/export carries and strictly validates the stage-entry snapshot. Older saves remain supported through the existing explicit migration chain.

No new database, save store, equipment registry, reward runtime, boss runtime, status runtime or audio runtime is introduced.

## Validation focus

M04 tests cover:

- Salvage Anchor preservation vs Campaign rollback;
- Stage Revival deterministic entry restoration and item consumption;
- knowledge preservation during stage replay reset;
- Phoenix item consumption without persistent-state rollback;
- partial Phoenix resource tuning;
- stage-entry validation;
- PlayerSave v17 -> v18 migration;
- backup compatibility and invalid snapshot rejection.

CI Test + Build must pass before the milestone is marked complete.
