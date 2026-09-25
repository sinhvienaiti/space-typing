# M22 — Full Balance / Performance Audit

Status: **ACCEPTED / CLOSED 2026-09-24**. Automated audit remains complete. The owner accepted the current extensively play-tested build and chose not to block the roadmap on re-running every recorder row. Unrecorded real-device rows remain targeted regression checks, not claimed PASS evidence.

M22 audits the production expansion after M21. It does not add a second balance engine or simulation-only gameplay implementation.

## Automated audit architecture

The M22 audit reuses production functions and registries:

- Stage 001-1000 mapping;
- 50 canonical Worlds;
- ten-stage checkpoint sectors;
- World Mini Boss / World Boss identity;
- all six fixed difficulty modes;
- Adaptive and Custom difficulty;
- Ascension tiers;
- Active Typing Pressure;
- formations;
- route graphs;
- finite deterministic shops;
- hidden discovery;
- campaign rewards and currencies;
- equipment drop / grade simulations;
- enemy reward simulations;
- checkpoint/death/crash recovery;
- all three protection/resurrection items;
- production Game runtime stepping;
- all World music profiles / music states;
- audio ducking/crossfade/lifecycle;
- build/bundle budgets.

## Full Campaign cross-system audit

`src/balance/full-expansion-audit.ts` performs a deterministic full-Campaign audit.

Coverage:

- 1000 Campaign stages;
- exactly 50 Worlds;
- exactly 100 ten-stage sectors;
- 6000 fixed-mode difficulty evaluations;
- 4000 Adaptive/Custom evaluations;
- 40 Ascension sample evaluations;
- 100 deterministic Route graphs;
- all ShopType × World deterministic stock resolutions;
- formation candidate/admission checks;
- deterministic Hidden discovery simulation;
- StageRole distribution;
- checkpoint reward validity;
- World boss mapping;
- global difficulty clamps;
- fixed-mode pressure/reward ordering.

The repeated seeded report must produce the same deterministic signature.

## WPM / difficulty audit

Adaptive is evaluated for three full-Campaign reference players:

- low: 25 WPM / 88% accuracy;
- mid: 60 WPM / 96% accuracy;
- high: 120 WPM / 99.2% accuracy.

For every Stage 001-1000:

- all profiles remain finite and inside global caps;
- stronger reference performance may receive higher pressure;
- Custom target/pressure remains bounded;
- fixed mode pressure remains ordered Relax -> Impossible.

Existing first-Galaxy and later-Galaxy balance audits remain active and authoritative for spike/role cadence checks.

## Economy / drop audit

`src/balance/m22-economy-audit.ts` adds seeded simulations over all production LootSource values:

- normal;
- elite;
- golden;
- treasure;
- anomaly;
- boss.

The audit compares empirical equipment drop rate with `equipmentDropChance()`, empirical Grade distribution with `gradeChanceSummary()`, and verifies Salvage never reduces drop rate.

Enemy reward simulations sample:

- Stage 30;
- Stage 250;
- Stage 500;
- Stage 750;
- Stage 1000.

They guard total reward rate, high-value reward rate, control uptime, score multiplier uptime and clear-screen rate.

A full Stage 001-1000 currency pass verifies Campaign clear rewards can earn Alloy, Star Crystal and Quantum Core.

## Checkpoint / recovery integrity

M22 repeats production recovery scenarios at representative Campaign bands:

- Stage 10;
- Stage 190;
- Stage 500;
- Stage 750;
- Stage 1000.

Validated paths:

- ordinary death rollback;
- Salvage Anchor;
- Stage Revival Core;
- Phoenix Core;
- technical crash snapshot restore;
- replaying the same crash snapshot without reward duplication.

These tests call production persistence/death-protection functions through isolated M21 Test Lab state.

## Runtime stress audit

M22 exposes `Game.testLabAdvanceSimulation()`, gated by `testLabEnabled`.

It calls the same private production `advanceSimulation()` path used by the animation frame. It exists only to advance deterministic QA simulations without rendering or wall-clock waiting.

Stress scenarios run 60 simulated seconds for:

- Stage 1 Balanced;
- Stage 250 Balanced;
- Stage 500 Hard;
- Stage 750 Nightmare;
- Stage 1000 Impossible;
- Stage 950 Impossible with explicit maximum Test Lab pressure overrides.

Guards include:

- no Game Over in Immortal mode;
- finite player/pressure state;
- enemy count bounded by DifficultyProfile.maxEnemies;
- particle count bounded by active VisualQuality;
- projectile/pressure envelopes remain bounded;
- same production seed/scenario yields the same stress summary.

## M22 finding fixed: summoned enemy cap

The first max-pressure stress run found a real production issue:

- configured `maxEnemies = 30`;
- runtime peaked at 32 enemies.

Root cause:

- `canAdmitSpawn()` guarded Active Typing Pressure / urgent threats / controller density but did not guard raw `maxEnemies`;
- Carrier children explicitly allowed `maxEnemies + 2`.

Fix:

- shared `canAdmitSpawn()` now rejects when `snapshot.enemyCount >= difficulty.maxEnemies`;
- Carrier child no longer has a +2 exception;
- Splitter fragments and Carrier children therefore reuse the same hard cap as regular spawns;
- regression coverage verifies Scout and controller/support admission both reject at max-enemy cap.

After the fix, the 60-second maximum-pressure stress test passes without relaxing its threshold.

## Audio / World music audit

The M22 audio audit covers every canonical World and every `MUSIC_STATES` value.

For every non-silent state it verifies:

- explicit asset mapping;
- local override candidate first;
- repository fallback candidate second;
- correct loop/non-loop contract.

Controller lifecycle audit verifies:

- all 50 Worlds can transition through every music state;
- no retired music/ambient tracks remain after immediate transitions;
- simultaneous pronunciation / announcer / warning ducking uses the strongest duck;
- release restores the base mix;
- nonzero crossfade retires outgoing tracks;
- World ambient crossfade completes;
- destroy pauses/stops all created tracks and removes listeners.

This is functional/lifecycle validation. It cannot certify subjective loudness or whether a real local audio file sounds good.

## Performance / build measurement policy

Runtime structural safety remains enforced where it directly protects gameplay:

- M12 hard active-enemy caps;
- VisualQuality particle caps;
- DPR/pixel safeguards;
- rolling FrameProfiler;
- bounded music/ambient lifecycle.

The original M22 implementation also introduced hard JS/CSS/total-dist byte
ceilings. **That static-size policy was superseded on 2026-09-25.**

Current production behavior:

- `scripts/report-bundle-metrics.mjs` reports JS, CSS and total `dist`
  raw/gzip sizes for review and trend visibility;
- those byte counts do **not** fail CI by themselves;
- audio payload size and Ship V3 transfer size are also reported rather than
  hard-capped;
- correctness/integrity checks remain active;
- meaningful performance decisions use runtime profiling and real-browser
  evidence rather than forcing source/build output under an arbitrary historic
  size number.

Canonical policy: `docs/CODE_QUALITY_AND_PERFORMANCE_RULES.md`.

For historical context, CI #395 measured:

- JS raw: 486.41 KiB;
- JS gzip: 126.99 KiB;
- CSS raw: 26.87 KiB;
- CSS gzip: 6.28 KiB;
- total dist raw: 537.91 KiB;
- total dist gzip: 151.45 KiB.

Those values are retained as historical measurements, **not current acceptance
ceilings**.

## Automated validation checkpoint

CI #395:

- 116/116 test files PASS;
- 583/583 tests PASS;
- TypeScript no-emit check PASS;
- Vite production build PASS;
- historical M22 bundle-size gate PASS at that time; current builds report size metrics without a hard byte ceiling.

Subsequent commits must keep Test + Build green; bundle sizes remain visible report-only metrics.

## Pre-manual polish integration

Before the real-browser/audio/human-paced gate, the approved P00-P08 polish slice refreshes the user-facing build that will actually be tested:

- title navigation is grouped by player intent instead of one flat action wall;
- large central learning feedback is replaced by a short enemy-local EN/IPA/VI echo while pronunciation remains unchanged;
- event/objective/status/typing notices share a compact top information rail and bottom controls are re-spaced;
- Recall Bonus is an optional non-hostile VI-to-masked-EN target that expires without punishment and reuses the existing treasure reward flow;
- all 11 player characters use reusable distinct ship visual profiles in combat and selection previews;
- the H01-H06 RPG HUD slice replaces separate quick-control walls with a compact Character/Level/Hull/Shield/Energy status cluster and one configurable 1-9 hotbar;
- hotbar configuration is PlayerSave v26 top-level preference state, migrates deterministically from v25, survives backup/import and technical recovery, and deliberately does not roll back with combat checkpoints;
- title/Pause Hotbar Setup edits route into existing production item/skill APIs, so no parallel combat state or Test Lab-only hotbar implementation exists;
- T01-T06 stage-transition polish adds a deterministic presentation model and a short skippable pre-combat handoff for every stage, with stronger World/Galaxy/Boss/Hidden variants. The transition is awaited before `game.startStage()`, so the visual layer never hides live enemy/projectile/typing advancement.

P00-P08.1 and H01-H06 are merged. T01-T06 is complete on PR #70 with CI #455 PASS: 121/121 test files, 613/613 tests, TypeScript, production build and bundle budget PASS. Final main CI must still remain green after merge. None of this converts the perceptual gate into an automated one.

The final pre-manual C01-C12 combat-identity/typing-clarity slice is implemented on PR #71 with CI #488 PASS: 124/124 test files, 629/629 tests, TypeScript, production build and bundle budget. Merged-main CI and the human M22 manual matrix are still required:

- prefix conflict scoring softly suppresses exact/same-prefix active words inside the existing near-Rank vocabulary band;
- normal spawns, Carrier children, Splitter fragments and replacement layers reuse that clarity context without changing scheduler/admission pressure;
- same-initial acquisition remains nearest-to-player first with deterministic lower-screen / enemy-id / word-length tie-breaks, and Test Lab has a fixed `morning / month / me` reproduction;
- Ship Visual V2 is one optional transparent 4x3 illustrated sheet loaded by the existing art pipeline, with procedural fallback;
- equipment aura is derived from existing loadout/Grade/enhancement/affixes and is not persisted separately;
- all 11 player characters reuse the existing Laser mechanic with distinct bounded tracer/muzzle/impact profiles, so damage and typing cadence are unchanged;
- Low/Medium quality reduce aura detail while existing glow/particle caps continue to bound visual cost.

## Ship Visual V3 follow-up

Eleven newly illustrated source sprites and one 1024×768 lossless WebP atlas (800,054 bytes, 3 MiB decoded) have been prepared as local artifacts, with 64/78/128px preview sheets. Local alpha/source-count/empty twelfth-cell and source-transfer checks passed. The premium binary is **not yet committed to GitHub**, so production continues to use V2. Once installed and registered through `scripts/install-ship-v3.mjs`, V3 is preferred, duplicate engine flames and heavy image bloom are omitted, and the V2 decoded reference is released.

File checks and TypeScript/unit/build results are **not** evidence of ≤1ms incremental p95 browser-frame performance. Paired V2/V3 real-browser measurements and a two-build aura/rapid-fire visual review remain pending in the M22 manual matrix.

## Manual gate

Automated tests cannot certify:

- readability during real motion;
- perceived fairness at a human typing pace;
- whether World themes feel distinct;
- actual loudness balance on speakers/headphones;
- real pronunciation vs combat intelligibility;
- subjective visual polish;
- real browser/device frame pacing.

Those checks are tracked in `docs/M22_MANUAL_PLAYTEST_MATRIX.md`.

The Developer Test Lab includes an M22 Manual Gate Recorder that mirrors the 43 manual rows, stores QA-only observations locally and exports a paste-ready Markdown report. The recorder now captures compact runtime evidence from the live Test Lab frame profiler, bounded runtime collections and MusicController debug state, and requires explicit human attestations for real audio output, High/Ultra browser observation and low/mid/high human-paced typing. This reduces transcription mistakes and improves reproducibility but does not automate or replace the human perceptual gate.

M22 must **not** be marked fully COMPLETE until the manual matrix is executed on a real browser/audio device and any findings are fixed.
