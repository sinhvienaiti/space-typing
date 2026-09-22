# M20 — Ascension

Status: COMPLETE on the M20 feature branch after Test + Build validation.

## Scope

Ascension is the endgame replay layer for the existing Campaign.

It does **not** add Stage 1001+, a second Campaign, a second checkpoint engine, or a parallel combat/reward runtime. Every Ascension tier reuses the canonical:

- 1000 Campaign stages;
- 50 Worlds × 20 stages;
- World rosters and Rank I-X system;
- M12 difficulty / Active Typing Pressure caps;
- M13 formations;
- M16 boss runtime and typing mechanics;
- M19 reward paths;
- M02-M04 checkpoint, crash-recovery and death-protection flow.

## Unlock and progression

- Completing base Campaign Stage 1000 unlocks Ascension Tier 1.
- Ascension has 10 bounded tiers.
- Each tier has its own sequential frontier from Stage 001 through Stage 1000.
- A stage advances the active tier only when it exactly matches that tier's frontier; clearing a later stage cannot skip progression.
- Completing Tier N unlocks Tier N+1, up to Tier 10.
- Completed tiers cannot be reactivated as active progression tiers.
- After completing a tier, the next newly unlocked tier is prepared at Stage 001; Tier 10 completion returns to Base.

## Existing checkpoint integration

Ascension progress is part of `RunPersistentState`.

The existing `CheckpointSnapshot`, crash snapshot, stage-entry snapshot and death-protection paths therefore snapshot/restore the Ascension frontier together with economic state.

Rules:

- Ascension commits every 10 cleared stages, using the same 10-stage rhythm as the base Campaign.
- Tier/mode switching is allowed only at a committed boundary: Stage 001, 011, 021, ... 991.
- Switching at a boundary may create the new active checkpoint; switching mid-segment is rejected so it cannot be used to commit uncheckpointed rewards.
- Salvage Anchor keeps its existing economic-preservation semantics but rolls the Ascension frontier back to the committed checkpoint.
- Stage Revival and technical crash recovery reuse the existing stage-entry/crash paths.
- Death/crash UI reports the Ascension checkpoint (for example `A1 Stage 021`) rather than the base terminal checkpoint.

No second checkpoint store is introduced.

## Tier modifier profile

`src/progression/ascension.ts` compiles a deterministic tier profile once for stage start.

Bounded scaling:

- enemy Rank bonus: up to +3;
- formation-complexity bonus: up to +2, still capped at complexity 5;
- combat/projectile/boss pressure multiplier: +2.5% per tier, up to +25%;
- word difficulty offset: +1.5 per tier, up to +15;
- reward multiplier: +7.5% per tier, up to +75%;
- pressure-budget allowance: small bounded increase, while active-threat hard caps remain authoritative.

Existing M12 safety ceilings remain unchanged:

- combat pressure <= 3.6;
- projectile pressure <= 3.15;
- boss pressure <= 3.15;
- max-enemy, urgent-threat and controller/support caps remain owned by the selected difficulty mode.

## Enemy Rank and formations

Ascension Rank pressure enters through the existing M10 enemy typing profile before Rank-band word selection.

It does not bypass:

- authored World Rank distributions;
- Rank I-X bounds;
- word-difficulty selection;
- typing-layer caps;
- Threat Budget.

Formation pressure increases the existing `formationComplexity`; M12 Active Typing Pressure still decides whether a formation can actually be admitted.

## Boss mutation table

Boss mutations are deterministic from Ascension tier + Campaign stage.

Mutation ids:

- `fortified-core` — bounded HP increase;
- `rapid-cycle` — bounded boss action-rate increase;
- `projectile-echo` — extra projectile pressure;
- `apex-crown` — combined late-tier boss mutation.

Tier mutation counts:

- Tier 1-4: 1 mutation;
- Tier 5-8: 2 mutations;
- Tier 9-10: 3 mutations.

The table is compiled into scalar `DifficultyProfile` fields at stage start. The Game runtime does not scan mutation registries every frame.

Boss mechanics, visuals, phases and typing interactions remain the existing M16/M09 runtime paths.

## Reward integration

Ascension improves existing rewards instead of creating a second reward currency/system.

- normal stage rewards inherit the existing difficulty reward multiplier;
- performance rewards reuse M19;
- ten-stage sector caches receive the Ascension reward multiplier;
- boss reward choices reuse M19 equipment/currency/Relic choices and scale currency/grade pressure;
- Ascension sector Relic seeds include tier identity so different tiers do not reuse the same deterministic source key;
- first completion of each Ascension tier grants one bounded endgame cache;
- completion cache cannot be farmed because completed tiers cannot complete again.

Existing Credits, Alloy, Star Crystal and Quantum Core remain authoritative.

## PlayerSave v25

M20 increments PlayerSave from v24 to v25.

New persisted domain:

`AscensionState`

- `highestUnlockedTier`;
- `selectedTier`;
- `completedTiers`;
- `frontierByTier`.

Migration:

- v24 -> v25 creates Ascension state from Campaign completion;
- a completed base Campaign starts with Tier 1 unlocked at Stage 001;
- legacy v23/v24 checkpoint/crash/stage-entry snapshots are migrated through the existing legacy `RunPersistentState` path;
- current v25 snapshots validate Ascension strictly;
- malformed active selection of an already-completed tier is sanitized to Base.

Ascension is run/checkpoint state and therefore rolls back with gameplay state. M19 Codex knowledge remains outside rollback and keeps its merge semantics.

## Player-facing UI

The title screen exposes Ascension only after Stage 1000 completion.

The Ascension dialog shows:

- unlocked tiers;
- active tier/frontier;
- completed tiers;
- Rank bonus;
- formation bonus;
- reward multiplier;
- deterministic boss mutation names.

Stage Select and Route Map are disabled during an active Ascension run because the active tier frontier owns stage progression.

## Validation

Final implementation checkpoint: CI #335.

- 108 test files PASS;
- 548/548 tests PASS;
- TypeScript no-emit check PASS;
- Vite production build PASS.

Regression coverage includes:

- unlock and migration;
- sequential frontier / anti-skip behavior;
- 10-stage commit rhythm;
- tier completion/unlock;
- completed-tier selection rejection;
- checkpoint-boundary switching;
- checkpoint rollback of Ascension frontier;
- difficulty safety caps;
- deterministic boss mutations;
- Rank integration;
- boss reward scaling;
- backup/export/import validation.
