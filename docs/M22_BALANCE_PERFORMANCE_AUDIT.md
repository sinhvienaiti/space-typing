# M22 — Full Balance / Performance Audit

Status: **AUTOMATED AUDIT COMPLETE; MANUAL PLAYTEST GATE PENDING**.

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

## Performance / build budget

Runtime structural budgets already include:

- M12 hard active-enemy caps;
- VisualQuality particle caps;
- DPR/pixel budgets;
- rolling FrameProfiler;
- bounded music/ambient active tracks.

M22 additionally makes bundle size a production build gate via `scripts/check-bundle-size.mjs`.

Budgets:

- JS raw <= 650 KiB;
- JS gzip <= 180 KiB;
- CSS raw <= 60 KiB;
- CSS gzip <= 20 KiB;
- total dist raw <= 800 KiB;
- total dist gzip <= 250 KiB.

Baseline before enabling the hard gate (CI #393):

- JS: ~498.08 kB raw / 130.04 kB gzip;
- CSS: ~27.52 kB raw / 6.43 kB gzip;
- index.html: ~0.45 kB raw / 0.29 kB gzip.

The thresholds intentionally leave headroom while preventing silent large regressions.

## Automated validation checkpoint

CI #393, after the runtime cap fix and before the bundle gate commit:

- 116/116 test files PASS;
- 583/583 tests PASS;
- TypeScript no-emit check PASS;
- Vite production build PASS.

The latest M22 head must pass the same suite plus the bundle-budget gate before automated M22 is considered clean.

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

M22 must **not** be marked fully COMPLETE until the manual matrix is executed on a real browser/audio device and any findings are fixed.
