# Space Typing Remaining Implementation Progress

Updated: 2026-10-10

## Source of truth

- Repository: `sinhvienaiti/space-typing`
- Working branch: `feat/bgv-integration-current`
- Always fetch the latest remote HEAD before making changes.
- Never reset/revert the branch to an older checkpoint and never overwrite newer worker/tab work.
- Treat this file as a resumable handoff, not as a reason to redo completed units.

## R01 — Secret Route / Hidden Discovery / Journey Map / Rest Stop UX

Status: **COMPLETE**

Locked implementation checkpoint:

- `471a71171e7d9222b3417d448abc8e677a7704ae` — `test(campaign): isolate R01 browser QA phase deadlines`

Browser-QA reliability follow-up:

- `fdd7909baea99ec7488e1c602df9347206840283` — `test(campaign): harden R01 persistence readiness wait`

The follow-up keeps the real Campaign Map readiness requirement intact. It does not bypass the disabled button or remove structural assertions; it only gives cold persistence/UI bootstrap a separate 60-second readiness budget while keeping the map-render deadline independent.

Validation on CI #1830 / run `38044396808`:

- Test: PASS
- Build: PASS
- R01 browser QA: PASS
- R01 browser captures upload: PASS

Do not return to R01 unless a later change causes a real regression.

## R02 — Seasonal / Weekly Challenge Runtime

Status: **COMPLETE**

R02 code checkpoint:

- `e07537d344d13cafcd463d6b7acf59add01c1d8f` — `feat(challenge): bind weekly runs to frozen expedition inputs`

Implementation commits:

- `45d4cf3f5f1b664c8bc11f611cf6c22aa1979388` — `feat(challenge): add weekly lifecycle persistence contract`
- `f463b17d7ea9d7aa8b6ade59d99ef4f65e4560d8` — `feat(challenge): harden weekly binding and admin diagnostics`
- `92a6579e81e2639f07c1fa4fd004e28df7b6adc6` — `feat(expedition): gate weekly challenge resume by canonical binding`
- `e07537d344d13cafcd463d6b7acf59add01c1d8f` — `feat(challenge): bind weekly runs to frozen expedition inputs`

### Acceptance checklist

1. **Canonical UTC week identity — COMPLETE**
   - ISO UTC Monday week key.
   - Canonical weekly identity namespace remains distinct from daily challenge identity.

2. **Deterministic weekly seed — COMPLETE**
   - Same canonical week/ruleset produces the same seed.
   - Week rollover produces a new deterministic seed.

3. **Weekly lifecycle / reset — COMPLETE**
   - Weekly runs are a first-class Expedition challenge kind.
   - Previous-week runs are classified as stale and cannot resume as the current week.

4. **Reward eligibility + idempotency — COMPLETE**
   - Weekly completion claims are fenced by canonical identity key.
   - Duplicate settlement cannot grant the weekly completion claim twice.
   - Claim history is bounded and backward-compatible inside Expansion V2 profile version 1.

5. **Personal Best / Ghost — COMPLETE**
   - PB and ghost records reuse the existing fixed-challenge profile storage.
   - Later attempts may improve PB/ghost without granting the weekly completion claim again.
   - Leaderboard eligibility is derived from canonical run conditions, retry state and assist state.

6. **Persistence / save-load / resume — COMPLETE**
   - Weekly reward claims survive the existing profile sanitize/save/load path without a schema bump.
   - Generic Expedition resume intentionally excludes weekly runs.
   - `resumeWeekly(...)` requires the current canonical weekly binding before claiming the persisted envelope.
   - A rejected stale/invalid run is not mutated merely by the resume check.

7. **Deterministic replay / duplicate-roll protection — COMPLETE**
   - Canonical binding validates week, identity key, seed, ruleset version, content version, word-pool hash, start kit, difficulty and assist.
   - Weekly binding freezes adaptive wanted-word selection for fixed-run comparability.
   - A forged seed or mismatched frozen content contract is rejected instead of being relabeled/rerolled.
   - Resume reuses the existing Expedition replay boundary, preserving the encounter plan and incrementing retry state.

8. **Admin Weekly surface — COMPLETE**
   - Read-only `Weekly Challenge` admin/QA view-model exposes week, seed, identity, resume state, reward claim, PB, ghost count and leaderboard eligibility.
   - Stale/invalid/retried/assisted diagnostics are exposed from the same canonical state.
   - `canMutate` is intentionally false on this child branch; R02 does not invent a second admin write owner.

### R02 implementation/test evidence

Primary runtime files:

- `src/expansion-v2/challenge.ts`
- `src/expansion-v2/weekly-challenge-runtime.ts`
- `src/expansion-v2/weekly-challenge-admin.ts`
- `src/expansion-v2/profile-store.ts`
- `src/expedition/core.ts`
- `src/expedition/session.ts`

Focused tests:

- `tests/weekly-challenge.test.ts`
- `tests/weekly-challenge-runtime.test.ts`
- `tests/weekly-challenge-session.test.ts`
- `tests/weekly-challenge-bind.test.ts`
- `tests/expansion-v2-profile-persistence.test.ts`

Exact R02 code checkpoint validation:

- CI #1829: Test PASS, Build PASS; R01 browser QA hit a pre-existing readiness-timeout flake.
- The R01 harness-only follow-up at `fdd7909...` then passed the complete gate on CI #1830 / run `38044396808`.

### Scope note

R02 is the Weekly Runtime/Admin surface milestone. A new player-facing Weekly launcher/button is not part of this R02 acceptance and was not added here.

## First unfinished unit

### R03 — Alternative Modes Runtime

Status: **NOT STARTED in this checkpoint**

Resume order:

1. Fetch the latest remote HEAD and reconcile any newer commits first.
2. Identify the canonical alternative-mode registry already present in the latest code.
3. Bind each declared mode to a real runtime owner rather than an Admin-only/runtime-unavailable declaration.
4. Complete lifecycle + persistence + focused tests for the first unfinished mode/runtime slice.
5. Replace the corresponding Admin runtime-absence diagnostic only after a real runtime owner exists.
6. Continue the next unfinished R03 slice; do not redo R01/R02.

Do not start R03 from the historical SHAs above if GitHub has a newer HEAD. The latest remote HEAD is always the source of truth.
