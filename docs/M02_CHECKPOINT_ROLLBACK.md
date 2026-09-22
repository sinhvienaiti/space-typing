# M02 — Ten-Stage Checkpoint and Rollback

M02 activates the gameplay checkpoint model introduced by M01.

## Runtime state layers

M02 uses the existing PlayerSave and persistence path. It does not create a second store.

- **Active segment:** the normal top-level PlayerSave state. It contains the player's current Campaign, inventory, equipment, support spells, character progression, luck pity, discovery state, Credits, expansion currencies and mission progression.
- **Committed checkpoint:** `checkpointSnapshot` in PlayerSave v16. It is captured at the beginning of each ten-stage sector and replaced only when the sector-end frontier stage is cleared.
- **Crash recovery:** remains inactive/null in M02. Technical crash restoration belongs to M03.

## Checkpoint rhythm

A sector is ten stages.

Example:

```text
checkpoint 181
play 181 ... 190
clear 190
commit the current permanent/economic state
next checkpoint 191
```

A normal gameplay death before the next commit restores the committed snapshot and returns Campaign progression to the checkpoint stage.

## Rollback-sensitive state

The committed snapshot restores:

- Campaign unlock/selection/cleared-stage progression;
- inventory;
- equipment and enhancement state;
- support-spell loadout/unlocks;
- permanent character progression/unlocks;
- Luck pity;
- hidden-content drought/roll position;
- Credits;
- mission counters and claimed mission rewards;
- Alloy, Star Crystal and Quantum Core.

This prevents gaining or spending permanent/economic resources inside an uncommitted sector and then keeping those changes after an ordinary death.

## Knowledge/meta state that survives rollback

The rollback merge intentionally preserves knowledge already observed during the active segment:

- stage best-result records;
- hidden-content discoveries;
- achievement discovery;
- `highestReachedStage` in the expansion metadata.

Knowledge preservation does not grant gameplay access. Stage Select is bounded by the rolled-back Campaign frontier and checkpoint state, so `highestReachedStage` cannot reopen an uncommitted stage.

## Replay rules

Selecting and clearing an older unlocked stage is a replay. It may update normal records/rewards, but it does not move or commit the active progression frontier.

This prevents a replay of Stage 190 from committing a checkpoint while the real frontier is elsewhere.

## PlayerSave migration

PlayerSave advances from v15 to v16.

v15 -> v16:

- preserves all M01 fields;
- normalizes the expansion frontier around `highestUnlockedStage` rather than a replay-selected stage;
- seeds the first committed checkpoint snapshot from the existing persisted state.

Older saves did not contain a historical committed snapshot. Preserving their existing permanent/economic state during migration is the safest backward-compatible behavior; M02 begins enforcing rollback from that migration checkpoint onward.

## End-of-campaign handling

Clearing Stage 1000 commits a terminal checkpoint at Stage 1000. The terminal checkpoint is valid even though the final ten-stage sector begins at 991.

## Regression and performance notes

- no boss, status, reward, equipment, SFX or audio subsystem was duplicated;
- temporary combat statuses remain Game runtime state and are naturally reset by starting the checkpoint stage;
- checkpoint snapshots are updated only at sector commit; ordinary autosaves reuse the existing snapshot;
- persistence serialization is still proportional to save size and is not performed per frame;
- export/import includes and strictly validates the committed checkpoint snapshot.

M03 owns technical crash recovery and death-invalid recovery snapshots. M04 owns Salvage Anchor, Stage Revival Core and Phoenix Core death choices.
