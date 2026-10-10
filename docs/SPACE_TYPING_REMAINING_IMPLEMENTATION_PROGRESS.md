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

## R03 — Alternative Duel Modes Runtime

Status: **COMPLETE**

Locked code checkpoint:

- `7c97bdec15f5aaaa72173a59eaaa36394eb50e75` — `test(duel): align empty alternative room slot fixture`
- Exact checkpoint CI #1842: PASS.

### Acceptance checklist

1. **Canonical runtime capabilities — COMPLETE**
   - `reflex` and `word-chain` are registered in `ALTERNATIVE_MODE_REGISTRY`.
   - Both modes bind to the real `AlternativeMatchRuntime` owner.
   - Friend and Practice are explicitly supported; Ranked remains fail-closed rather than silently borrowing Standard Duel MMR/ranked semantics.

2. **Authoritative match runtime — COMPLETE**
   - Reflex and Word Chain resolve score, hull damage and terminal results in the authority runtime.
   - Projectile damage lands on the authority impact clock rather than a presentation timer.
   - Duplicate/stale sequence handling prevents repeated or late input from mutating authoritative state.

3. **Persistence / reconnect — COMPLETE**
   - Runtime snapshots include mode/rules/content identity needed to resume safely.
   - Reconnect republishes personalized authoritative state instead of reconstructing combat from client-local state.
   - Terminal snapshots remain reconnectable while a later owner-started match can release the old terminal binding idempotently.

4. **Protocol / identity / transport — COMPLETE**
   - `MODE_INPUT` is parsed through a dedicated alternative protocol boundary.
   - The server binds authenticated session identity and authority time; the client cannot claim authoritative `playerId`, damage or timestamps.
   - Friend Alternative Duel reuses the existing Duel WebSocket authentication, room lifecycle, reconnect and tick loop; no second networking stack was introduced.

5. **Practice + presentation — COMPLETE**
   - Practice has a deterministic local owner using the same runtime rules.
   - Friend lobby exposes Reflex / Word Chain activation through the existing Duel flow.
   - UI consumes authoritative score, hull, challenge, turn and projectile-impact state; it does not simulate authoritative damage locally.

6. **Canonical content handling — COMPLETE**
   - Word Chain uses the canonical `DUEL_TYPING_LEXICON` rather than an open client dictionary/regex acceptance path.
   - Invalid words / invalid chain transitions are rejected by the authoritative runtime.

7. **Admin/runtime-availability truthfulness — COMPLETE for this child branch**
   - This branch has no standalone `src/admin` Alternative Modes owner or Admin-only runtime declaration to patch.
   - Runtime availability is represented by the canonical `ALTERNATIVE_MODE_REGISTRY`, whose descriptors now point to `AlternativeMatchRuntime`.
   - R03 intentionally does not invent a parallel child Admin framework merely to duplicate that source of truth.

### R03 implementation/test evidence

Primary runtime files:

- `src/duel/alternative-modes.ts`
- `src/duel/alternative-match-runtime.ts`
- `src/duel/alternative-practice.ts`
- `src/duel/alternative-presentation.ts`
- `src/duel/alternative-protocol.ts`
- `src/duel/alternative-wire.ts`
- `src/duel/alternative-room-ui.ts`
- existing Duel server/network-client integration files

Focused tests include:

- `tests/alternative-match-runtime.test.ts`
- `tests/alternative-coordinator.test.ts`
- `tests/alternative-protocol-service.test.ts`
- `tests/alternative-network-client.test.ts`
- `tests/alternative-practice-presentation.test.ts`
- `tests/alternative-room-ui-model.test.ts`

Exact R03 checkpoint validation:

- CI #1842 on `7c97bdec15f5aaaa72173a59eaaa36394eb50e75`: PASS.
- Earlier locked slices include CI #1832, #1833, #1834 and live-transport CI #1838.

Do not return to R03 unless R04/R05 work causes a real regression.

## First unfinished unit

### R04 — Voice / Hybrid Final Acceptance

Status: **NOT STARTED from this handoff checkpoint**

Resume order:

1. Fetch the latest remote HEAD and reconcile any newer commits first.
2. Audit the existing `VoiceSession`, input-mode normalization and Duel authority/network path before changing architecture.
3. Keep Typing / Voice / Hybrid mutually explicit and reuse the existing authoritative Duel input pipeline instead of creating a parallel transport/runtime.
4. Complete the smallest unfinished authority slice first: normalized voice/hybrid input identity, stale/duplicate protection, reconnect behavior and deterministic tests.
5. Keep unsupported ranked combinations fail-closed until they satisfy the same authority/validation contract as Typing.
6. Finish final UI/microphone acceptance only after the runtime path is real and testable.
7. After R04 is locked by exact-SHA CI, continue R05 — Historical Analytics Backend.

Do not restart R01-R03 from their historical SHAs. The latest remote HEAD is always the source of truth.
