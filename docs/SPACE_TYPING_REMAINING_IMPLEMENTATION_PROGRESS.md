# Space Typing Remaining Implementation Progress

Updated: 2026-10-11

## Source of truth

- Repository: `sinhvienaiti/space-typing`
- Working branch: `feat/bgv-integration-current`
- Always fetch the latest remote HEAD before making changes.
- Never reset/revert the branch to an older checkpoint and never overwrite newer worker/tab work.
- Treat this file as a resumable handoff, not as a reason to redo completed units.
- Code/commit state on the branch is authoritative if this document ever lags behind.

## Roadmap status

The bounded **R01-R05 Remaining Implementation roadmap is COMPLETE**.

There is intentionally **no R06** in this roadmap. Further work is tracked in `docs/SPACE_TYPING_POST_R05_MASTER_ROADMAP.md` and must begin from the latest remote HEAD, not from an older R01-R05 checkpoint.

## R01 — Secret Route / Hidden Discovery / Journey Map / Rest Stop UX

Status: **COMPLETE**

Locked implementation checkpoint:

- `471a71171e7d9222b3417d448abc8e677a7704ae` — `test(campaign): isolate R01 browser QA phase deadlines`
- Browser-QA reliability follow-up: `fdd7909baea99ec7488e1c602df9347206840283`

Validation:

- CI #1830 / run `38044396808`: Test PASS, Build PASS, R01 browser QA PASS, browser captures PASS.

Do not return to R01 unless a later change causes a real regression.

## R02 — Seasonal / Weekly Challenge Runtime

Status: **COMPLETE**

Locked code checkpoint:

- `e07537d344d13cafcd463d6b7acf59add01c1d8f` — `feat(challenge): bind weekly runs to frozen expedition inputs`

Acceptance locked:

- canonical UTC week identity and deterministic weekly seed;
- weekly lifecycle/reset and stale-run rejection;
- reward eligibility/claim idempotency;
- PB/ghost persistence and leaderboard eligibility;
- deterministic frozen-content binding and replay protection;
- safe save/load/resume contract;
- read-only Weekly admin/QA surface backed by canonical runtime state.

Focused coverage includes `weekly-challenge*`, Expedition session/binding tests and Expansion V2 profile persistence tests.

Exact R02 code validation completed on CI #1829, followed by the R01 harness reliability follow-up on CI #1830.

Do not return to R02 unless a later change causes a real regression.

## R03 — Alternative Duel Modes Runtime

Status: **COMPLETE**

Locked checkpoint:

- `7c97bdec15f5aaaa72173a59eaaa36394eb50e75` — `test(duel): align empty alternative room slot fixture`
- Exact checkpoint CI #1842: PASS.

Acceptance locked:

- Reflex and Word Chain canonical runtime registration;
- authoritative score/hull/projectile-impact resolution;
- stale/duplicate sequence protection;
- reconnect/persistence of authoritative match state;
- authenticated protocol identity and existing Duel transport reuse;
- deterministic local Practice using the same rules;
- canonical Word Chain lexicon validation;
- Ranked remains fail-closed where authority/ranking semantics are unsupported.

Alternative Local Practice is part of the existing Duel lobby/runtime and is not a separate game shell.

Do not return to R03 unless a later change causes a real regression.

## R04 — Voice / Hybrid Final Acceptance

Status: **COMPLETE**

Locked checkpoint:

- `938a6cd8c28c57bb02d5a923125511652f7efbd2` — `feat(voice): bound and observe recognition acceptance`
- Exact checkpoint CI #1876 / run `38124521206`: PASS.

Acceptance locked:

1. **Detection latency observability**
   - deterministic recognition-to-game-acceptance telemetry;
   - audio-end-to-acceptance timing where source timing is available;
   - current/max latency surfaces are testable without a real microphone.

2. **Queue/backlog control**
   - bounded pending recognition queue;
   - deterministic overflow rejection;
   - small batch draining with event-loop yielding rather than unbounded synchronous processing.

3. **Stale rejection**
   - session/input/audio generation fencing;
   - late callbacks from a previous generation cannot mutate gameplay after pause/resume or session changes.

4. **Event-loop/combat interaction**
   - inbound recognition does not synchronously complete combat on the message call stack;
   - duplicate results remain fenced by the existing Voice result policy;
   - deterministic tests verify that one recognition cannot double-complete combat.

Typing / Voice / Hybrid remain explicit modes and the implementation reuses the existing game/input authority boundaries rather than introducing a parallel combat runtime.

Real browser permission prompts, real microphone capture and macOS/Windows hardware behavior remain **manual hardware QA**, not fabricated automated coverage. These are not implementation blockers for R04 completion.

## R05 — Historical Analytics Backend

Status: **COMPLETE**

Locked implementation chain:

- `181722ee8a2718cedf95a1af0eb88ce0e0bb31e1` — `fix(analytics): align retained run replay fence`
- `cbaf4e55ab0970022ff85ce90c66b7676addfeaf` — `feat(analytics): record canonical expedition assist coverage`
- `46e336dc3ab1556be80fd5592389bc8c75249cb3` — `test(analytics): lock R05 producer replay acceptance`

Exact checkpoint validation:

- CI #1879 / run `38125396701`: Test PASS, Build PASS, R01 browser QA PASS, browser captures PASS.

Acceptance locked:

1. **Persistent versioned historical store**
   - terminal historical events live in Expansion V2 persisted profile state;
   - deterministic sanitization/version handling remains in the existing profile boundary.

2. **Idempotent replay protection**
   - `processedRunIds` retention is aligned with historical event retention (`512`);
   - a retained historical row also acts as a durable replay receipt;
   - reload/migration with retained history but a missing older journal cannot double-count a run.

3. **Canonical Expedition producer**
   - one terminal run produces one enriched historical record;
   - outcome, score, accuracy, active time, challenge, retry, difficulty, input mode, gameplay mode, source stages, relic loadout, typed letters, voice completions and WPM are recorded only when canonically derivable;
   - `assisted` is derived from persisted Expedition profile assist mode.

4. **No fabricated dimensions**
   - ExpeditionRun v1 has no canonical boss/equipment/skill identity ledger;
   - boss attempts, equipment and skill usage remain empty/unknown rather than reconstructed from presentation state.

5. **Historical aggregation/admin truthfulness**
   - deterministic period/UTC aggregation remains backed only by persisted events;
   - Admin Historical Analytics is read-only;
   - current child scope is `local-profile` only and `crossPlayerSupported: false` remains fail-closed without an authoritative backend identity/store.

Focused R05 regression coverage includes terminal producer enrichment, replay after reload, migration replay receipts, pure Voice WPM semantics and unknown-dimension behavior.

## Final R01-R05 integration audit

Audit checkpoint before closure documentation: `46e336dc3ab1556be80fd5592389bc8c75249cb3`.

Findings:

- R05 is only three commits ahead of the locked R04 checkpoint and changes exactly:
  - `src/expansion-v2/expedition-history.ts`
  - `src/expansion-v2/profile-store.ts`
  - `tests/expedition-history.test.ts`
- R05 does not alter Voice transport/session/combat code introduced/locked by R04.
- The shared Expansion V2 profile boundary used by R02 Weekly was reviewed: R05 hardens historical replay state while leaving weekly reward claims, PB/ghost and weekly identity semantics intact.
- Full repository tests, TypeScript/build and the R01 browser regression gate are green on the exact R05 code checkpoint.
- No code-level R01-R05 blocker remains from this audit.

## Closure rule

R01-R05 are closed. Do not invent an R06 or reopen a completed unit without a concrete regression.

Continue from:

- `docs/SPACE_TYPING_POST_R05_MASTER_ROADMAP.md`

Future integration work must still re-fetch the latest remote HEAD and reconcile newer worker/tab commits before editing.
