# M19 — Reward Layer Expansion + Codex

Status: COMPLETE on feature branch after Test + Build validation.

## Scope

M19 extends the existing Campaign stage-clear, boss reward, economy and meta/Codex paths. It does not add a second reward runtime or a second persistence store.

## Reward layers

### Performance rewards

`src/rewards/campaign-rewards.ts` adds optional performance badges for:

- Precision — 99%+ accuracy;
- Flawless — no misses;
- Streak — stage max streak >= 25;
- Tempo — WPM >= 105% of the active difficulty target;
- Objective — completed stage objective.

Tempo is difficulty-relative, so lower-WPM modes are not compared against Impossible-mode thresholds.

Rewards reuse Credits and the existing Alloy / Star Crystal / Quantum Core economy.

### Sector checkpoint reward

Each committed ten-stage checkpoint receives a stronger sector cache.

The cache is granted before the new checkpoint snapshot is captured, so it becomes part of committed run state and follows the existing checkpoint/death/crash rules.

The existing M18 sector Relic reward remains part of the same transition.

### Campaign boss reward choice

Campaign boss victory now gates stage completion behind the existing reward-choice UI.

The player chooses one of three deterministic reward categories:

- equipment using the existing boss equipment pool;
- Credits + existing expansion currencies;
- eligible Run Relic, with a premium-currency fallback when no new Relic is available.

The Game remains in the current encounter until the choice resolves. The choice itself is not independently autosaved before stage clear; it commits with the following stage-clear transaction, avoiding a duplicate-reward recovery path.

Hidden Encounter boss flow remains on the existing Hidden Encounter reward path.

## Expanded Codex

`src/codex/state.ts` records knowledge for:

- Worlds;
- enemy / boss definitions;
- M19 reward layers.

Game emits enemy sightings only once per definition per Game runtime. World knowledge is resolved on stage transition rather than scanned every frame.

The existing Codex / meta-progression screen is extended with these entries instead of creating a second discovery UI.

## Knowledge persistence outside rollback

PlayerSave schema is v24.

Codex knowledge is intentionally outside `RunPersistentState` / checkpoint rollback. Recovery-source selection unions valid Codex knowledge from both sources so an already-seen World/enemy/reward is not forgotten after gameplay rollback or recovery.

Economic rewards remain inside the existing committed/active run state and therefore still obey checkpoint rollback semantics.

Migration:

- v23 -> v24 adds an empty CodexState;
- RelicState and all earlier run domains are preserved;
- backup/import validation supports v23 migration and validates current v24 CodexState;
- unsupported newer versions remain rejected.

## Regression coverage

M19 adds coverage for:

- difficulty-relative performance reward thresholds;
- sector checkpoint reward scaling;
- deterministic boss choose-one reward generation;
- Codex sanitizer/discovery/merge behavior;
- PlayerSave v23 -> v24 migration;
- Game hook fixtures for boss reward / enemy sightings.

CI #297 on implementation head:

- 107 test files PASS;
- 531/531 tests PASS;
- TypeScript no-emit check PASS;
- Vite production build PASS.
