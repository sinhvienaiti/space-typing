# Space Typing Post-R05 Master Roadmap

Updated: 2026-10-12

## Purpose

This document begins **after** completion of the bounded R01-R05 Remaining Implementation roadmap.

It is intentionally **not R06**. R01-R05 are closed implementation milestones; this roadmap coordinates integration, cleanup, open workstreams and final product acceptance without reopening completed units by default.

Manual/product checks that automation cannot replace are tracked separately in:

- `docs/SPACE_TYPING_MANUAL_ACCEPTANCE_CHECKLIST.md`

Pending manual acceptance is **not a global implementation blocker**. Independent technical work may continue while manual items remain pending. A manual item blocks only the affected subsystem, a merge/release decision that depends on it, or a step that would make the pending evidence ambiguous/obsolete.

## Source of truth

- Repository: `sinhvienaiti/space-typing`
- Active integration branch: `feat/bgv-integration-current`
- R01-R05 code checkpoint: `46e336dc3ab1556be80fd5592389bc8c75249cb3`
- R01-R05 closure document: `docs/SPACE_TYPING_REMAINING_IMPLEMENTATION_PROGRESS.md`
- Manual acceptance backlog: `docs/SPACE_TYPING_MANUAL_ACCEPTANCE_CHECKLIST.md`
- Always fetch the latest remote HEAD before changing code.
- Never reset/revert newer worker/tab work to a historical SHA.
- If this document and Git disagree, current Git state wins.

## Current execution status

| Gate | Status | Current evidence / disposition |
| --- | --- | --- |
| P0 | DONE | R01-R05 closure/exact-SHA regression completed before this continuation. |
| P1 | DONE | Integration trunk reconciliation completed before this continuation. |
| P2 | PENDING MANUAL | Visual/product acceptance remains in the manual checklist; this is not a global technical blocker. |
| P3 | DONE | PR #128 integration preparation/reconciliation completed before this continuation. |
| P4 | DONE | PR #129 English integration was reconciled semantically; the stale/non-mergeable PR is not required as a wholesale merge. |
| P5 | DONE | PR #130 was semantically decomposed; only two independently useful audio slices were integrated, duplicate/conflicting owners were explicitly rejected. |
| P6 | DONE | PR #131 Stage/Galaxy World Music semantics are already represented by the canonical child runtime + parent Admin path; regression coverage was added without merging the giant PR. |
| P7 | PENDING MANUAL | Final microphone/latency/visual/audio/performance acceptance remains human/hardware work. |

The first unfinished **technical** Post-R05 unit is therefore none at this checkpoint. The remaining release gates are P2/P7 manual acceptance unless newer Git introduces a concrete regression or a newly authorized product scope.

## Integration topology and stale-branch policy

### PR #127 — Visual >80% production pass

The remaining decision is perceptual/browser owner acceptance. Do not infer PASS from CI.

### PR #128 — BGV/current gameplay integration

This branch contains the completed R01-R05 track and Post-R05 technical reconciliation. Preserve its current history; do not rebase/force-rewrite merely to make the stacked PR smaller.

### PR #129 — Rich English combat activity integration

Treat the old PR as historical evidence. The still-useful semantics were reconciled during P4; do not merge a stale/non-mergeable PR just to close topology.

### PR #130 — Audio / music / Admin QA / PvP rollout

This is a giant overlapping branch. **Do not merge/cherry-pick it wholesale.** P5 classified its units semantically against the current integration branch.

### PR #131 — Admin World Music Stage/Galaxy policy

This is also a giant stacked/history-topology branch. **Do not merge/cherry-pick it wholesale.** P6 reconstructed/verified the actual Stage/Galaxy policy semantics on the current architecture instead.

## Manual acceptance deferral policy

- Record manual checks in `docs/SPACE_TYPING_MANUAL_ACCEPTANCE_CHECKLIST.md` as `PENDING`, `PASS`, `FAIL`, `STALE`, or `N/A`.
- Continue automated/integration work that does not depend on the unresolved manual result.
- Stop only when the next unit directly modifies the same subsystem and would make attribution unsafe, or when merge/release eligibility requires that acceptance.
- CI, screenshots, static inspection and code review must never be used to fabricate a manual `PASS`.
- If later work touches a manually accepted subsystem, mark the affected acceptance evidence `STALE` and retest it before release.
- Before final merge/release, all release-required manual items must be resolved.

## Gate P0 — R01-R05 closure and exact-SHA regression

**Status: DONE.**

The bounded R01-R05 roadmap is closed. Do not reopen it by default. New findings must be treated as concrete regressions or explicitly authorized new scope.

## Gate P1 — Stabilize the integration trunk

**Status: DONE.**

The integration trunk was reconciled without rewriting the long gameplay history. Preserve current Git as source of truth.

## Gate P2 — Resolve visual/manual acceptance for PR #127

**Status: PENDING MANUAL.**

Required evidence lives in `docs/SPACE_TYPING_MANUAL_ACCEPTANCE_CHECKLIST.md`, including current browser capture/video, owner review for representative World 01/02 visual quality/motion, gameplay readability and presentation/noise checks.

P2 blocks declaring the visual base accepted for final merge/release. It does **not** invalidate completed automated implementation gates.

## Gate P3 — Integrate PR #128 safely

**Status: DONE (technical preparation/reconciliation).**

Do not use this status to claim final mainline merge eligibility while P2 remains pending.

## Gate P4 — Reconcile PR #129 English integration

**Status: DONE.**

Only still-needed English combat integration was retained. Preserve canonical Shared Learning IDs/contracts; do not revive stale PR topology without a concrete missing capability.

## Gate P5 — Decompose PR #130 instead of wholesale merge

**Status: DONE.**

### Integrated useful slices

1. `777817688247b1ac2b08892ac31e9982bba5b5e9` — `fix(audio): keep sample cues without Web Audio`
   - `Sfx.unlock()` fails soft when `AudioContext` is unavailable.
   - HTMLAudio sample cues remain usable/preloaded.
   - Exact CI #1914: PASS.

2. `b48ec34b97b3e2a3c18c378eab72ef8fda6b88f7` — `fix(audio): fence stale music playback failures`
   - stale/replaced track failures cannot mutate the active fallback chain;
   - autoplay denial, unsupported/missing media and temporary network errors have explicit lifecycle semantics;
   - temporary network failure retries the same candidate once before fallback.

3. `46bcee5367fc173f4518ce6a873c1b946e9a3904` — `test(audio): cover transient playback retry`
   - locks the temporary-network retry behavior;
   - exact CI #1917: PASS.

### Explicitly rejected/superseded #130 units

- Do **not** import #130 `AudioFocusManager` / shared pronunciation-to-music ducking. Current product requirement intentionally keeps pronunciation from ducking BGM/music; pronunciation only affects the appropriate SFX mix groups.
- Do **not** create a second QA-session/runtime owner. Canonical QA/Test Lab ownership already exists in the current trunk.
- SFX pooling/lifecycle is already present on the current trunk.
- Alternative Duel/PvP is already closed by R03 unless a future audit proves a genuinely newer independent capability.

P5 exit condition is satisfied: useful missing work is represented as small auditable commits; stale/duplicate/conflicting work remains unmerged.

## Gate P6 — Reconstruct Admin World Music policy from PR #131

**Status: DONE (technical semantics and ownership).**

### Canonical source commits identified on #131

- `c816e033155edf1b10c1b81b442f50b26837225f` — Stage/Galaxy precedence.
- `e0a40491ffae147f0d3dd934107e95ba088eab82` — preserve random World Music semantics.
- `80bfa6294d49eab712e2518a6860c689d00936bf` — type legacy fallback candidates.

These commits were used as semantic references only; the giant #131 history was not merged.

### Current canonical child behavior

The active integration trunk already contains the same production ownership for:

- `src/audio/world-music-model.ts`
- `src/audio/world-music-runtime.ts`
- `src/admin/world-music-preview.ts`

Resolver semantics are intentionally split by mode:

- map/boss effective scope: **Stage → World → Galaxy → legacy World → Global**;
- boss slots resolve role → boss-common → normal within a scope before falling through to the parent scope;
- random-normal intentionally does **not** consume Stage/World/Galaxy normal overrides; it keeps **Global normal → migration random library → catalog random library** semantics;
- runtime can infer Galaxy from `WORLD_REGISTRY` for backward-compatible callers;
- Admin preview exposes Stage/Galaxy resolution and badges such as `STAGE OVERRIDE` / `GALAXY FALLBACK`.

Regression commit:

- `6053849e9b02ffb9e6b69750004b6a913f1b5487` — `test(admin): lock world music scope precedence`
- exact child CI #1918: PASS.

### Parent Admin coordination

Parent repository `sinhvienaiti/typing-game`, branch `feat/space-typing-admin-uiux`, was audited at:

- `c3181e2d6f987a759bd1b6fe4bf565f64f4a11f0`
- Space Typing Admin CI #714: PASS.
- Platform CI #2086: PASS.

The parent already owns the canonical Admin editing surface for **Global / Galaxy / World / Stage**, forwards optional `stageNumber` into `pnpm music:admin-preview`, and its World Music regression verifies both `STAGE OVERRIDE` and `GALAXY FALLBACK` through the child resolver.

### Contract ownership decision

Do **not** invent new `scopes`, `mapBossPrecedence` or `randomNormalPrecedence` fields in `contracts/space-typing-admin.v1.json` merely to document runtime behavior:

- the canonical #131 Stage/Galaxy commits did not change that JSON contract;
- the parent validator intentionally requires its contract snapshot to be exactly equal to the child contract;
- Stage/Galaxy hierarchy is already owned by the typed policy/runtime/preview path and tested there;
- adding speculative metadata would create a second semantics surface rather than one source of truth.

P6 exit condition is satisfied: one canonical runtime resolver remains authoritative, parent Admin delegates preview to it, and the giant PR remains unmerged.

## Gate P7 — Final manual product acceptance

**Status: PENDING MANUAL.**

The canonical checklist and evidence fields live in `docs/SPACE_TYPING_MANUAL_ACCEPTANCE_CHECKLIST.md`.

Release-required manual coverage includes:

- real microphone + browser permission on macOS;
- real microphone + browser permission on Windows;
- Voice/Hybrid perceived latency and recognition UX;
- current visual acceptance/video on target hardware;
- audio/music subjective balance and repeated-loop fatigue;
- GPU/performance spot checks on representative machines.

These checks may remain pending while independent implementation continues, but they must be resolved before final product/release acceptance.

## Integration principles

1. **Latest Git wins** — no checkpoint rollback.
2. **No invented R06** — new work uses this Post-R05 roadmap and named gates/workstreams.
3. **No wholesale stale-branch merges** — especially #130/#131.
4. **One canonical runtime owner** for Duel, Voice, analytics, music policy and Admin resolution.
5. **Fail closed** where authoritative backend/ranked/cross-player semantics do not exist.
6. **No fabricated analytics data** for unavailable boss/equipment/skill identity.
7. **Manual evidence stays manual** for microphone hardware and perceptual visual/audio acceptance.
8. **Exact-SHA CI after integration checkpoints** before advancing to another technical gate.
9. **Pending manual acceptance is not a global blocker**, but final merge/release acceptance requires all release-required manual evidence.
10. A new worker/tab must first fetch HEAD, read this roadmap and the manual checklist, and resume from any concrete new regression/newly authorized scope rather than reopening P5/P6.

## Immediate next action

There is no unfinished Post-R05 technical integration gate at this checkpoint.

1. Run CI for this documentation checkpoint and verify the exact resulting SHA.
2. Keep P2/P7 manual items pending; do not mark them PASS automatically.
3. If CI remains green and Git has no newer technical regression, hand the user the manual checklist for hardware/perceptual acceptance.
4. If the user reports a manual FAIL, fix only the affected subsystem, rerun focused + full CI, mark affected evidence appropriately, and continue through the remaining manual checklist.
5. Do not merge/mark PRs ready without explicit user instruction when the decision depends on manual acceptance.