# Space Typing Post-R05 Master Roadmap

Updated: 2026-10-11

## Purpose

This document begins **after** completion of the bounded R01-R05 Remaining Implementation roadmap.

It is intentionally **not R06**. R01-R05 are closed implementation milestones; this roadmap coordinates integration, cleanup, open workstreams and final product acceptance without reopening completed units by default.

## Source of truth

- Repository: `sinhvienaiti/space-typing`
- Active integration branch at roadmap creation: `feat/bgv-integration-current`
- R01-R05 code checkpoint: `46e336dc3ab1556be80fd5592389bc8c75249cb3`
- R01-R05 closure document: `docs/SPACE_TYPING_REMAINING_IMPLEMENTATION_PROGRESS.md`
- Always fetch the latest remote HEAD before changing code.
- Never reset/revert newer worker/tab work to a historical SHA.
- If this document and Git disagree, current Git state wins.

## Current integration topology

### Main

Current `main` at audit time:

- `4ce8741c1d144fd77e5b000dac76f6ab99216254` — `fix(ci): use TOANDX GitLab mirror secret`

There are exactly three commits on `main` after the common merge base `3c551b4c...`:

1. `38eebecf896d6882b8137196d0ff31767cdd06e6` — `ci: mirror repository to GitLab`
2. `d6133bb714fecb4e4794ac6e738925c3cd4125e4` — `fix(ci): mirror only branches and tags to GitLab`
3. `4ce8741c1d144fd77e5b000dac76f6ab99216254` — `fix(ci): use TOANDX GitLab mirror secret`

These are CI/mirror integration commits, not gameplay feature changes.

### PR #127 — Visual >80% production pass

- Base: `main`
- Head: `feat/visual-over-80-pass`
- State: open / draft / mergeable
- Relationship to `main`: ahead 233, behind 3.
- Remaining product gate in the PR description: browser/owner visual acceptance.

### PR #128 — BGV/current gameplay integration

- Base: `feat/visual-over-80-pass`
- Head: `feat/bgv-integration-current`
- State: open / draft / mergeable.
- Relationship to its base: ahead 537, behind 0.
- Size at audit: 537 commits / 785 changed files.
- Relationship to `main`: ahead 770, behind 3.

This is the branch that now contains the completed R01-R05 track.

### PR #129 — Rich English combat activity integration

- Base: `feat/bgv-integration-current`
- Head: `feature/english-learning-content-system`
- State: open / non-draft / currently non-mergeable.
- Size at audit: 3 commits / 4 changed files.

This is small enough to reconcile explicitly after the active integration trunk is stabilized.

### PR #130 — Audio / music / Admin QA / PvP rollout

- Base: an older `feat/bgv-integration-current` checkpoint.
- Head: `feat/audio-a1-pronunciation-audibility`
- State: open / draft / currently non-mergeable.
- Size at audit: 216 commits / 103 changed files.

This branch overlaps areas already implemented on the current integration branch, especially Alternative Duel/PvP. It must not be merged wholesale without a current-state diff audit.

### PR #131 — Admin World Music Stage/Galaxy policy

- Base: `main`
- Head: `feat/admin-world-music-stage-policy`
- State: open / draft / mergeable.
- Size at audit: 846 commits / 846 changed files.

Its declared feature scope is much smaller than its apparent PR diff. Treat it as a stacked/history-topology problem and reconstruct or selectively transplant the canonical Admin policy work rather than merging the 846-file diff blindly.

## Post-R05 execution order

### Gate P0 — R01-R05 closure and exact-SHA regression

Goal: freeze the completed implementation track before any new integration work.

Required:

- R01-R05 progress document reflects reality.
- Post-R05 roadmap exists.
- Full current CI runs on the final closure-documentation HEAD.
- Test PASS.
- Build PASS.
- R01 browser QA PASS.
- Closure HEAD is re-fetched after CI to ensure no worker/tab commit was overwritten.

Exit condition: closure documentation HEAD is green and stable.

### Gate P1 — Stabilize the integration trunk against current `main`

Goal: remove the three-commit `main` drift before attempting mainline integration.

Policy:

- Do **not** rebase/force-rewrite the 770-commit integration history.
- Reconcile the three `main` CI/mirror commits through a normal merge or controlled transplant onto the active integration stack.
- Preserve current gameplay/assets/runtime state.
- Re-run full CI after reconciliation.

Reason: the only known `main`-side divergence is GitLab mirror CI wiring, so it should be reconciled independently from gameplay changes.

Exit condition: the chosen integration checkpoint contains the required mirror behavior and is no longer missing those three `main` commits semantically.

### Gate P2 — Resolve visual/manual acceptance for PR #127

Goal: decide whether the visual base is acceptable for mainline integration.

Required manual evidence:

- current browser capture/video on the actual accepted branch state;
- owner review for World 01/02 visual quality and visible motion;
- verify no regression in gameplay readability and audio noise fixes.

Automated CI cannot substitute for this perceptual acceptance.

If accepted, #127 becomes eligible for integration after P1 reconciliation. If rejected, make visual-only corrections without reopening R01-R05 runtime work.

### Gate P3 — Integrate PR #128 safely

Goal: move the current BGV/gameplay/R01-R05 integration toward the stable target without hiding the stacked branch structure.

Rules:

- Keep #128 based on the visual stack until #127/main relationship is resolved.
- Do not retarget #128 directly to a stale `main` while it is 770 commits ahead / 3 behind.
- Do not squash/rewrite history merely to make the PR look smaller unless a separate clean integration branch is intentionally created.
- Prefer a reviewed integration checkpoint/branch if a clean mainline PR is needed later.

Exit condition: #128's content is represented on a target branch that already includes the accepted visual base and current `main` CI semantics, with CI green.

### Gate P4 — Reconcile PR #129 English integration

Priority: high after trunk stabilization because the change surface is small.

Plan:

- fetch latest #129 head;
- diff its 3 commits / 4 files against the stabilized trunk;
- transplant/reapply only still-missing English combat integration;
- preserve canonical Shared Learning IDs/contracts;
- run focused English-learning/combat tests plus full CI.

Do not merge the currently non-mergeable PR blindly.

### Gate P5 — Decompose PR #130 instead of wholesale merge

Priority: medium/high, but only after P4 or an explicit dependency audit.

Plan:

- classify each #130 unit as `already-present`, `still-needed`, `superseded`, or `conflicting`;
- skip Alternative Duel/PvP units already closed by R03 unless there is a proven newer capability;
- selectively transplant missing Audio A1-A4, World Music/Admin B1-B3, B4 QA sandbox or other independently useful slices;
- run focused tests after each slice;
- avoid creating a second runtime owner for systems that already have a canonical owner on the active trunk.

Exit condition: useful missing work is integrated as small auditable commits; stale/duplicate work remains unmerged.

### Gate P6 — Reconstruct the Admin World Music policy from PR #131

Priority: after current child trunk is stable and coordinated with the parent Admin UI/UX program.

Plan:

- identify the canonical Stage → World → Galaxy → Global precedence commits on `feat/admin-world-music-stage-policy`;
- compare them against both current child runtime and the active parent Admin integration branch;
- transplant/rebuild only the actual policy/runtime changes;
- do not merge the 846-file PR surface as-is;
- keep one source of truth for Admin/effective resolution.

Exit condition: Admin policy is represented as a small reviewed delta on the current architecture, with parent/child ownership explicit.

### Gate P7 — Final manual product acceptance

This gate contains checks that automation cannot honestly claim:

- real microphone + browser permission on macOS;
- real microphone + browser permission on Windows;
- Voice/Hybrid perceived latency and recognition UX;
- current visual acceptance/video on target hardware;
- audio/music subjective balance and repeated-loop fatigue;
- GPU/performance spot checks on representative machines.

These manual checks do not invalidate already-complete automated R01-R05 implementation acceptance; they are product-release evidence.

## Integration principles

1. **Latest Git wins** — no checkpoint rollback.
2. **No invented R06** — new work uses this Post-R05 roadmap and named gates/workstreams.
3. **No wholesale stale-branch merges** — especially #130/#131.
4. **One canonical runtime owner** for Duel, Voice, analytics, music policy and Admin resolution.
5. **Fail closed** where authoritative backend/ranked/cross-player semantics do not exist.
6. **No fabricated analytics data** for unavailable boss/equipment/skill identity.
7. **Manual evidence stays manual** for microphone hardware and perceptual visual/audio acceptance.
8. **Exact-SHA CI after integration checkpoints** before advancing to the next gate.

## Immediate first unfinished gate

At roadmap creation, the first unfinished gate is:

**P0 — R01-R05 closure and exact-SHA regression.**

After P0 passes, continue directly to **P1 — stabilize the integration trunk against current `main`**.
