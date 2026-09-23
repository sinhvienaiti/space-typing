# Game Over — Automatic Checkpoint Recovery

Status: runtime and deterministic decision tests implemented on `fix/automatic-checkpoint-recovery`; manual browser acceptance pending.

## User-facing flow

- On death, keep the result overlay visible with the failed-stage score, accuracy and streak.
- If no *usable* protection item exists, start restoring the saved checkpoint immediately in the background. Revival cores without a matching stage-entry snapshot are not usable.
- Keep all three destination buttons disabled only during the checkpoint save. Once saved, show the checkpoint stage clearly and allow **Replay Stage**, **Choose unlocked stage**, or **Main menu** directly. Do not add a second confirmation/rollback button.
- If a usable protection item exists, show the three existing revival choices. Selecting one preserves its existing cost/effect. Choosing any destination instead restores the checkpoint once and proceeds directly.
- Only one checkpoint rollback/save may be in flight. Rapid/double clicks must not duplicate persistence writes. When saving fails, keep the result overlay open and allow a destination click to retry saving before navigation.
- Preserve the existing death recovery marker, snapshot/sector rollback, anti-duplication and Ascension Stage Select restriction. Failed-run metrics remain visible even after the persistent state rolls back.
- Replay still respects legacy Route Map: if a route decision is required, open the map rather than silently doing nothing. The separate Campaign Map redesign will remove these ordinary shop/station lanes later.

## Verification

Automated: `tests/game-over.test.ts` covers zero items, applicable Anchor/Core items, and unusable cores without a valid stage-entry snapshot.

Real-browser gate: die at Stage 002 with zero recovery items, observe the restored Stage 001 notice without any confirmation, then check each destination independently. Repeat with each usable item, invalid stage-entry core availability, save failures and rapid clicks. Confirm stage selection is disabled during Ascension and reload cannot duplicate rewards. Run child Test, TypeScript, Build and CI before merging.
