# Space Typing — 1000 Stage Expansion V2 — Phase 0A Baseline

**Branch:** `feat/1000-stage-expansion-v2-phase0a`  
**Base SHA:** `8023beac88e1cb4e5a30b22f1a95edb45b5c89ca`  
**Scope:** Phase 0A only — performance/baseline audit, deterministic variety baseline, no gameplay feature expansion.  
**Status:** Automated baseline implemented. Real-browser High/Ultra capture remains a required manual gate before Phase 0A is declared fully passed.

## 1. Baseline-source audit

The V2 plan supersedes the old standalone review notes and explicitly says newer correct branch behavior wins over stale assumptions. The current source already contains several performance protections that older review labels may have referred to:

- centralized `qualityProfile()` DPR, particle, glow and canvas-pixel budgets;
- High/Ultra adaptive render scaling;
- background-first degradation through `AdaptiveYieldLayer`;
- bounded static enemy-body cache instead of repeating expensive glossy body/shadow work;
- bounded particles and text-width cache;
- HUD value dedupe plus 150 ms throttling for continuously changing resource/status/objective updates;
- existing real-browser Batch F baseline/candidate comparator.

Because those protections are already present, Phase 0A does **not** add a speculative second optimization layer or reduce High/Ultra visuals without measured evidence.

## 2. Pre-change CI condition

The base SHA was not green before Phase 0A implementation:

- 168 test files executed;
- 167 passed, 1 failed;
- 951 tests executed;
- 950 passed, 1 failed;
- failing test: `tests/m22-audio-audit.test.ts`;
- production `MusicController` registers two mix-event listeners plus three first-gesture listeners, while the stale assertion still expected six removals.

The Phase 0A change updates the test to verify teardown symmetry against the listeners actually registered. Runtime audio behavior is unchanged.

## 3. Deterministic variety reference

Reference player used only to resolve existing data-driven stage content:

- mode: `balanced`;
- Luck: `50`;
- recent WPM: `60`;
- recent accuracy: `96`;
- vocabulary level: `50`.

The audit calls production functions for stage config, World selection, current stage events, current objectives, stage pacing and boss typing mechanics.

It does **not** create a fake combat implementation.

### Current Campaign structure

| Current stage role | Count |
|---|---:|
| normal | 800 |
| elite | 70 |
| mini-boss | 50 |
| boss | 40 |
| special | 10 |
| hazard | 10 |
| gauntlet | 10 |
| major-boss | 10 |

Boss stages: **100**. Current boss reward-choice opportunities: **100**.

Current stages containing an internal stage-pacing `recovery` phase: **820**. This is deliberately **not** treated as V2 Macro Pacing; Macro Pacing is a later cross-stage system.

### Current encounter-signature repeat baseline

For Phase 0A only:

- **exact signature** = World + current stage role + current event IDs + current objective type + current internal pacing shape + current boss mechanic sequence;
- **near signature** = the same tuple without World ID.

Results:

- exact distinct signatures: **674 / 1000**;
- near distinct signatures: **179 / 1000**;
- adjacent exact-signature repeats: **79**;
- maximum adjacent exact-signature streak: **2**.

| Sliding window | Minimum distinct exact signatures | Minimum distinct near signatures | Maximum repeats of one exact signature | Maximum repeats of one near signature |
|---:|---:|---:|---:|---:|
| 5 | 2 | 2 | 4 | 4 |
| 10 | 5 | 5 | 6 | 6 |
| 25 | 14 | 12 | 9 | 13 |
| 50 | 28 | 22 | 9 | 21 |
| 100 | 61 | 36 | 9 | 39 |
| 1000 | 674 | 179 | 9 | 284 |

These are diagnostics, not new acceptance thresholds. Later phases should improve them through controlled composition and pacing rather than maximizing entropy.

### Existing stage-event frequency at the reference Luck

| Current event/modifier | Occurrences | Minimum repeat distance |
|---|---:|---:|
| fast-enemies | 137 | 1 |
| double-supply | 122 | 1 |
| armored-enemies | 95 | 1 |
| low-shield | 84 | 1 |
| projectile-storm | 80 | 1 |
| gauntlet-pressure | 10 | 100 |
| supply-run | 5 | 200 |
| training-window | 5 | 200 |
| ion-storm | 3 | 400 |
| debris-field | 3 | 400 |
| solar-flare | 2 | 400 |
| gravity-tide | 2 | 400 |

The random stage-event layer can therefore repeat on adjacent stages today. This is useful baseline evidence for the later anti-repeat / Encounter Recipe work.

### Existing objective frequency

| Objective | Occurrences | Minimum repeat distance |
|---|---:|---:|
| commander-first | 102 | 2 |
| accuracy | 50 | 1 |
| protect | 48 | 2 |
| speed-clear | 48 | 1 |
| marked-target | 46 | 1 |
| no-miss | 43 | 6 |
| survive | 20 | 40 |
| elite-hunt | 10 | 100 |

## 4. Metrics intentionally not fabricated

The following canonical V2 systems do not yet exist as deterministic Campaign composition layers and therefore remain explicitly uncovered in the Phase 0A baseline:

- Encounter Recipe;
- Sector Condition;
- Typing Pattern;
- deterministic Elite Affix pairs;
- Macro Pacing.

Current elite modifiers are runtime-selected. Phase 0A does not invent a seeded stage-level affix composition simply to make a report look complete.

As each owning phase lands, the Variety Audit must replace these gaps with real production-derived metrics.

## 5. Reproduction

Automated checks:

```bash
pnpm install --frozen-lockfile
pnpm exec vitest run tests/variety-audit.test.ts --reporter=verbose
pnpm test
pnpm build
```

Real-browser performance measurement must reuse the existing procedures in:

- `docs/UI_UX_BATCH_F_BROWSER_QA.md`;
- `docs/M22_MANUAL_PLAYTEST_MATRIX.md`;
- the Test Lab performance/Data capture UI.

For comparable captures:

1. use the same physical machine, browser/profile, viewport and DPR;
2. use the same Test Lab setup;
3. gather at least 120 frame samples;
4. cover reference combat, formation pressure, boss and visually heavy combat;
5. repeat heavy cases on High and Ultra;
6. record frame p95, Canvas draw p95, slow-frame ratio, adaptive scale, effective DPR, Canvas pixels and body-cache occupancy.

The V2 target for representative heavy High-quality combat remains **frame p95 <= 20 ms**, but CI/unit tests are not allowed to claim that a real GPU/browser gate has passed.

## 6. Phase 0A exit status

| Acceptance item | Status |
|---|---|
| No intended gameplay behavior change | Implemented |
| Current deterministic Variety Audit baseline | Implemented |
| Baseline report committed | Implemented with this phase |
| Reproducible automated checks | Implemented |
| Reproducible browser profiling path | Reuses existing Batch F / M22 tooling |
| Full regression suite | Must be green on this branch after the stale audio assertion fix |
| Real-browser High/Ultra p95 evidence | **Pending manual capture** |
| Rollback | Revert the Phase 0A implementation commit |

Do not start Phase 0B until the automated branch is green and the required real-browser baseline evidence has been captured/reviewed.
