# P10 Expedition Implementation Report

Status: **AUTOMATED PASS / MANUAL BROWSER TEST NOT RUN**

Source branch:
- `feat/1000-stage-expansion-v2-phase0a`
- FINAL 2 design contract used as implementation source of truth.
- No new image generation was performed. Existing art remains untouched.

## Implemented

### Run ownership and isolation
- Dedicated Expedition run contract under `src/expedition/`.
- Expedition storage is separate from Campaign PlayerSave v27.
- Campaign fixture is captured before entering Expedition.
- Loaner state uses existing starter factories rather than copying Campaign power.
- Campaign credits/items/equipment/progression/pity/shop/route are not projected back from Expedition.
- Campaign autosave, gameover recovery mirror, stage-entry save and pagehide save are guarded while Expedition owns the runtime.
- Return to Campaign restores the captured Campaign snapshot before releasing Expedition ownership.

### Determinism and safe state
- Versioned run config.
- Frozen vocabulary entries + hash.
- Deterministic encounter plan from existing early normal production stages.
- Gameplay and cosmetic encounter seeds are stored separately.
- Run-local resources persist across safe boundaries.
- Revision + writer-id checks reject stale writers.
- Reload claims writer ownership and replays an interrupted encounter from the safe boundary.
- Unsupported/corrupt/future Expedition data is not silently overwritten.
- Terminal victory/defeat/abandon is idempotent.

### Draft shell
- Materialized deterministic Relic offers.
- Maximum 3 choices.
- No duplicate choices.
- Explicit fallback when no Relic is eligible.
- Three equipped Relic slots.
- Full slots require explicit replacement before confirmation.
- Repeated confirmation cannot grant the same offer twice.

### Production Game integration
- `Game.startStage()` accepts optional safe-boundary Hull/Shield/Energy/Power.
- Expedition stage clear is intercepted before Campaign rewards/progression.
- Expedition gameover is intercepted before Campaign death/recovery handling.
- Expedition encounters use production `Game`, production stage configs, production difficulty resolver, world transition and music paths.
- Expedition runs use Combat typing mode and the frozen run vocabulary.
- P10 prototype encounter count is intentionally 2. P30 owns the final 8-encounter vertical slice.

### Test Lab
P10 Expedition QA controls were added:
- fixed seed start,
- force `draft` with materialized offer,
- force `encounter`,
- force terminal defeat,
- inject one storage write failure through the adapter,
- inspect current run/revision/ownership/resume state.

The storage failure control does not directly edit or corrupt localStorage.

## Automated verification

A temporary branch-only GitHub Actions workflow was added only for verification and removed after the run.

Successful verification run:
- Run ID: `36663248407`
- Node: 24
- pnpm: 11.21.0
- `pnpm test`: **PASS**
  - 171 test files passed
  - 971 tests passed
- `pnpm build`: **PASS**
  - audio integrity PASS
  - background reference/integrity PASS
  - TypeScript `tsc --noEmit` PASS
  - Vite production build PASS
  - ship art integrity PASS

Two compile issues exposed by the first CI attempt were corrected:
1. Phase 0A variety audit lost the `BossRole` narrowing inside a callback.
2. Expedition session test imported `ExpeditionStorage` from the wrong module.

The second CI run passed Test and Build completely.

## P10 trace coverage

Automated tests cover the P10 contract including:
- T01 Campaign fixture unchanged on abandon.
- T02 victory remains run-local.
- T03 same seed/config produces deterministic plan/offer.
- T04 repeated confirm cannot double-grant.
- T05 full Relic slots require explicit replacement.
- T06 0/1/2 eligible rewards stay finite and duplicate-free.
- T10 reload/writer claim preserves materialized state.
- T11 failed settlement write leaves the previous safe boundary authoritative.
- T12 terminal state cannot be resurrected by duplicate terminal actions.
- T13 future Expedition data is preserved.
- T14 storage failure is explicit.
- T15 stale writer cannot silently overwrite.
- T19 disabling the feature does not delete stored Expedition data.

Additional session lifecycle tests verify:
- draft -> encounter -> settlement/draft,
- resource carry,
- reload ownership claim,
- retry/interrupted marker,
- failed write does not advance in-memory revision,
- Test Lab phase forcing remains in Expedition storage.

## Manual browser tests left to owner

These are intentionally **NOT RUN** in the current environment:

1. Start Campaign and note credits/items/equipment/progression.
2. Start Expedition from the title.
3. Choose a Relic and complete encounter 1.
4. Confirm the second draft appears.
5. Reload during encounter 2, then use Resume Expedition.
6. Verify the encounter restarts from its safe boundary.
7. Complete or force defeat.
8. Return to Campaign.
9. Verify Campaign credits/items/equipment/progression/pity/shop/route are unchanged.
10. Fill 3 Relic slots and verify the replacement UI requires one explicit replacement.
11. In Test Lab, use Fail Next Save and verify the UI reports failure while the previous safe snapshot remains resumable.
12. Exercise the normal viewport/browser visual flow and check no modal/HUD overlap.

## Gate conclusion

P10 code and automated regression/build gates are complete.

Final P10 status:
- core contract: PASS
- persistence/reload contract: PASS
- Campaign save isolation guards: PASS by automated/code path verification
- full repository regression: PASS
- production build: PASS
- browser/runtime manual acceptance: NOT RUN
- visual/manual Campaign before/after verification: NOT RUN

Do not begin P20 mechanics from this report implicitly; P20 should start as its own scoped phase.
