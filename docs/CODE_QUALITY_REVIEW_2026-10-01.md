# SPACE TYPING — POST-IMPLEMENTATION CODE QUALITY REVIEW

Date: 2026-10-01  
Scope reviewed: implementation delta after baseline `590168c5a926d9ab32eea75e0dbed5fe2da6a6b3`, with emphasis on FINAL V3 Credit Crystal, Duel runtime, the 3-layer learning-feedback regression, and their integration points.

## Review goals

This review is separate from feature acceptance. It checks:

- logic correctness and hidden state bugs;
- bounded runtime behavior and performance risks;
- deterministic Duel behavior;
- privacy/authority boundaries;
- maintainability and duplication;
- defensive handling of invalid/edge inputs;
- regression coverage for newly added behavior;
- whether optimization preserves approved gameplay and visual effects.

## Baseline quality gates already present

The project already has useful protection:

- TypeScript `strict: true`;
- `noUncheckedIndexedAccess: true`;
- client and server `tsc --noEmit`;
- Vitest regression suite;
- production Vite build;
- asset/integrity checks;
- Duel deterministic replay/stress coverage;
- Credit Crystal bounded pickup stress coverage.

There is currently no dedicated lint script in `package.json`. This is not a correctness blocker, but adding a low-noise lint/format gate can be considered later after runtime stabilization.

## Findings fixed during this review

### 1. Locked Duel target could be lost when another offer slot refilled

Severity: high for gameplay correctness.

`DuelEngine.setPrivateOffers()` replaced the offer list and always cleared:

- `targetInstanceId`;
- `acquisitionPrefix`.

Authority/local refill calls use this method after an unrelated offer expires or completes. Therefore a player typing one locked word could lose that target because another slot refreshed. During Target Freeze this was especially dangerous because the player could lose a previously valid lock and then be prevented from reacquiring it.

Fix:

- preserve the current locked private target if the same locked offer still exists;
- preserve active threat/objective targets because private-offer refresh is unrelated to them;
- preserve the current acquisition prefix and target mistake count only for a valid preserved target;
- otherwise clear target state and reset target mistakes.

Regression coverage now verifies typing can continue from `la` to `las` after another slot is replaced.

### 2. Initiative projectile tempo existed in Strategy but was cancelled by Threat clamping

Severity: medium gameplay-logic mismatch.

The Strategy system correctly exposed a maximum projectile tempo scale of `1.06`.

The engine converted this into a shorter response window by passing an inverse scale to `DuelThreatSystem.create()`. However Threat creation clamped the response-window multiplier to a minimum of `1`, so every intended value below `1` was discarded.

Effect: saved Initiative looked implemented in the Strategy snapshot but did not produce the intended live tempo advantage for telegraphed attacks.

Fix:

- allow bounded response-window scaling down to `0.85`;
- the current full-Initiative path produces `2.8 / 1.06` seconds for the reference Siege Lance instead of an unmodified 2.8 seconds;
- projectile drag can still extend the response window up to the existing `1.65` cap.

Regression coverage verifies the live engine path, not only the Strategy helper.

### 3. Degenerate all-zero draft weights could resurrect a disabled category

Severity: medium robustness / rules correctness.

`normalizedDuelCategoryWeights()` correctly produced zero for disabled categories, but `DuelOfferDraft.pick()` fell back to `weighted[0]` when every weight was zero.

Normal production rooms still have non-zero core categories, so this was not a common runtime path. But the generic draft API violated the rule that a zero multiplier means truly disabled.

Fix:

- return `null` when total positive draft weight is zero;
- `refillPrivateOffer()` already supports `null`, so no unsafe fallback is needed.

Regression coverage verifies a Mystery-only draft with `mystery: 0` produces no offer.

### 4. Overdue Director schedules could flood input-only ticks after a large time jump

Severity: high for runtime stability under Test Lab / stress time jumps.

The local handoff reported that a large phase jump could leave
`elapsedUntilHazard` and `elapsedUntilObjective` deeply overdue after the
Director's bounded catch-up. Subsequent input-only `step(0)` calls could then
replay more timed events even though simulation time had not advanced. Pending
hazard telegraphs do not age during `dt = 0`, so the queue could grow much
faster than it drained.

Git inspection confirmed the same scheduling shape was still present:

- hazard catch-up was capped at four events per update;
- remaining negative timer debt was retained after the cap;
- zero-time updates still entered the timed schedule loops;
- objective scheduling could retain negative debt after its one-event update.

Fix:

- preserve phase-transition logic and the one-shot Cataclysm announcement;
- return before timed scheduling when sanitized `dt === 0`;
- keep the existing four-hazard catch-up batch;
- if the fourth catch-up still leaves hazard time overdue, rebase to the next
  seeded interval from the current time;
- emit at most one objective per update and similarly rebase remaining
  objective debt;
- do not delete already-pending hazards or shorten their telegraph/effects.

Regression coverage exercises both Crisis and Cataclysm with a 240-second jump,
then verifies 100 zero-time input ticks and a small resumed time step do not
replay backlog. Normal scheduling must resume afterward, with no duplicate
one-shot Cataclysm.

The production stress assertion remains unchanged; this fix bounds the
scheduler instead of increasing the allowed pending-hazard count.

## Performance review

### Credit Crystal

The runtime remains bounded by visual-quality piece caps:

- Low: 28
- Medium: 44
- High: 68
- Ultra: 92

The update loop compacts arrays in place, expired bursts are removed, transition paths flush presentation state, resize reframes active pieces, and overflow merges reward presentation rather than creating unbounded entities.

The merge search is linear over a small bounded list. `freeCapacityForHero()` has a small nested search in an overflow path, but the hard cap keeps the worst-case data set tiny. It is not worth replacing this with more complex indexing at the current scale.

### Duel

Duel collections are deliberately small and bounded:

- five private offers per player;
- small inventory capacities;
- bounded active traps;
- bounded Tactical effects through durations;
- bounded pending hazards through Director cadence;
- bounded threat windows.

Snapshot cloning creates short-lived small objects. It is allocation-heavy compared with a mutable renderer state, but the state size is small and deterministic. No evidence currently justifies trading clarity for a more complex pooling architecture.

The renderer/perceived performance still requires real-browser High/Ultra capture on the target machine. CI cannot certify GPU frame pacing or input latency.

## Maintainability review

### Good

- Duel domain logic is separated into focused modules: draft, rules, threats, tactical, strategy, hazards, chance, authority and local match.
- Runtime values are bounded/sanitized in the critical systems.
- Server authority and local Practice share `DuelEngine` semantics.
- Hidden information is projected through authority views/events rather than exposing raw engine state.
- Credit reward authority is separated from crystal visual presentation.
- The 3-layer learning fix keeps the completed vocabulary entry before changing layers, preventing feedback from accidentally referring to the next word.

### Technical debt worth tracking, not blocking this release

1. `src/Game.ts` is very large. New unrelated features should continue moving into domain modules instead of growing Game indefinitely.
2. `src/duel/authority.ts` and `src/duel/local-match.ts` duplicate some engine/draft/refill/bot wiring. A small shared Duel match factory/orchestrator could reduce drift later.
3. The hook name `onKillTranslation` now also serves intermediate semantic layers. The behavior is correct, but the name is historical and can be renamed in a later cleanup to avoid misleading maintainers.
4. There is no dedicated ESLint/format gate. Add one only with a minimal rule set and without performing a giant unrelated formatting rewrite.

These are maintenance improvements, not reasons to destabilize the current working runtime before browser validation.

## Review conclusion

After this hardening pass, the reviewed FINAL V3 delta has:

- deterministic logic gates;
- explicit bounded resource/VFX behavior;
- stronger target-state continuity;
- a real Initiative tempo effect instead of a data-only value;
- true zero-weight category disabling;
- regression tests for each hidden issue found;
- strict TypeScript + full CI/build as the automated release gate.

The remaining non-automated acceptance item is real High/Ultra browser performance and visual/input behavior on target hardware.
