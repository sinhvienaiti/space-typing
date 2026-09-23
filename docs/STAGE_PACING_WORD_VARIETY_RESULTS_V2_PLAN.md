# Stage Pacing, Word Variety, Projectile SFX and Stage Results V2

Status: **user-approved design direction; implementation NOT started.** This document is a reviewable implementation specification, not a claim of delivered runtime behavior.

Source of truth for existing implementation remains `main`, specifically `src/campaign/stage.ts`, `src/Game.ts`, `src/enemies/word-difficulty.ts`, `src/audio/Sfx.ts`, `src/main.ts`, M12 active-pressure rules and the C01-C04 same-prefix clarity work.

This is a user-facing polish/functional slice to complete and manually test **before the final M22 manual gate**. Do not claim M22/M23 completion on the basis of this plan. Keep existing World boss cadence, M12 safety caps, M10 Rank targets and test-lab/recovery compatibility.

## A. Why current stages are short

The current `createStageConfig` starts Stage 001 with `enemyBudget = 6` and increments modestly, while `Game.startStage` copies it to `spawnRemaining` and `Game` clears when remaining spawns and living enemies reach zero (with the existing boss conditions). The existing `waveForKills` is a display-derived counter, not an authored multi-phase scheduler. Extend the actual spawn budget and pacing deliberately; do not only change the HUD label or add an idle minimum timer.

## B. Stage pacing and enemy count

- Provisional early-to-late targets, subject to difficulty and actual playtest:
  - Stage 001-010: approximately 35-60 spawned normal/elite enemies per normal stage, with boss-specific pacing.
  - Stage 011-050: approximately 60-90.
  - Stage 051+: target roughly 100-150 for ordinary stages as the sustainable baseline, with some special/gauntlet stages above 150 when typing-pressure audits pass.
  - Campaign-wide ordinary-stage average should exceed 100 enemies without forcing Stage 001 newcomers to clear 100 full words immediately.
- Use an explicit 3-5 phase/wave pacing plan (opening, pressure ramp, mixed elite/support, optional event/recovery beat, finale where applicable). Author role/World variation. Keep the existing World Mini Boss at World stage 10, World Boss at 20, Galaxy Major Boss at 100.
- Target stage durations: ordinary stages roughly 90-150 seconds; milestone/boss stages roughly 120-210 seconds, calibrated across difficulty and WPM bands. These are playtest targets, not artificial timers that leave an empty arena after the last kill.
- Preserve M11/M12 Threat Budget, maximum concurrent active targets, urgent-threat ceilings, formation admission, reaction windows and late-stage performance budgets. A high **total stage spawn count** must not turn into 100 simultaneous on-screen enemies.
- Spawn rate and wave lengths adapt to chosen difficulty and vocabulary difficulty; do not multiply every axis linearly with WPM. Ensure boss arrival and stage-clear remain reachable; count spawned and resolved enemies accurately even when Carrier/Splitter add children, enemies escape or special non-hostile targets exist.
- Full cross-stage/role simulation, low/high WPM manual playtest and an explicit Stage 001/010/011/051+ acceptance matrix must gate release.

## C. Vocabulary variation — HIGH PRIORITY

The user explicitly requires **few repeated English words inside any one stage** and **no identical enemy words visible simultaneously wherever avoidable**. Repetition across different stages is fully allowed and should not be blocked by prior-stage history.

### C1. Per-stage word ledger

- Introduce one stage-scoped selection context/ledger shared by all hostile enemy-word assignment paths: initial normal spawn, elites, World formations, Carrier children, Splitter fragments, reinforcement/armor layers, enemy swaps and boss word rotation when they draw from the regular vocabulary pool.
- Track `usedCountByNormalizedWord`, `lastUsedSpawnOrdinal`, and a current `activeNormalizedWords` set (or an equivalent count-aware structure). Reset on genuine new stage start/replay; restore appropriately for any flow that resumes the *same* stage rather than starting a fresh stage.
- Canonical identity must match the text the player actually types, using the existing `typingText(entry.en)` canonicalization. IDs alone are insufficient: two different dictionary entries may display the same or typing-equivalent word/phrase. Ignore empty/untypable entries.
- Scope stage ledger to the selected Class/Custom vocabulary source. Do not silently load all 18,000 entries, change vocabulary levels or recycle words from other vocabulary sources to inflate stage count.

### C2. Selection priority and fairness

Select from an authored near-Rank/word-difficulty candidate band with the following priorities:

1. **Hard preference:** never assign an identical currently visible hostile word to another target while any distinct usable alternative exists within the allowed difficulty/typing context.
2. **Strong per-stage preference:** prefer words not yet shown in this stage, then words with the lowest use count, then the least recently used words.
3. Retain current C01-C04 active prefix-conflict avoidance and deterministic target-lock fairness *after* evaluating exact duplicate avoidance. A same-prefix penalty alone is NOT a stage repetition policy.
4. Keep difficulty/Rank tolerance explicit. Widen a bounded near-Rank band when variety is insufficient instead of repeatedly choosing from the existing 8-24 nearest words, but never silently flatten difficult Rank tiers.
5. Tie-breaking should use a deterministic, stage-scoped seed/cursor where reproducibility or crash reconstruction requires it; no uncontrolled re-roll on reload.

With enough eligible distinct words, a 100-enemy stage should aim to show each hostile word once, including multi-layer enemies. If a custom source is too small, strict total-stage uniqueness is mathematically impossible: use the least-used/least-recent fallback and show a non-blocking vocabulary-variety hint in the pre-stage UI.

**Active exact duplicates remain prohibited whenever there are at least two distinct eligible words.** If a genuinely one-word Custom source or authored forced mechanic makes a collision unavoidable, serialize/delay the conflicting spawn or require an explicit documented fallback rather than creating two visually identical simultaneous targets. Bounded queuing must never deadlock stage clear.

Boss fixed-script words, hidden special phrases, recall bonus words and single-letter hostile projectiles require documented handling. The prohibition on two simultaneous identical full enemy words is not a ban on multiple single-letter enemy bullets; the latter use the existing distinct intercept-targeting logic. Treat visible boss full words as active reservations wherever a regular enemy could overlap with them.

### C3. Acceptance tests

- 150 distinct eligible words / 100 selected hostile words: **zero repeated typing-equivalent words within the stage**, absent a documented scripted exception.
- 100+ enemies with normal source: no two simultaneously visible hostile enemies share the same canonical word, including spawn children and new armor layers.
- Repeated runs with identical seeds/source/settings resolve deterministically wherever the existing RNG contract promises determinism.
- Tiny Custom vocabularies (1, 2, 5, 20 entries): never crash or hang; minimize repeats, no avoidable active exact collision, preserve authored word difficulty where feasible.
- Replays allow the same words as earlier stages; no across-stage ban, stale ledger, save corruption or unbounded ledger memory.
- Test punctuation/case-equivalent pairs, duplicate IDs with same EN, varying IPA/VI on same typed word, boss transition and late-stage high-pressure formations.

## D. Distinct hostile-projectile typing SFX

- Existing projectile destruction currently calls `this.sfx.hit()` and already draws a short laser. This generic hit may be perceptually weak/indistinguishable; add a dedicated short, crisp **projectile intercept/laser-shot** gameplay sound for a successful typed hostile bullet, with a stronger shatter/pop on actual projectile destruction if the mechanic later supports multi-hit projectiles. Do not pretend a single-character bullet has multiple separate correct-key and final-key events.
- An incorrect projectile key routes through existing `wrong()` but its sound must be audibly distinct and softer than a successful intercept. Existing enemy projectile fire sound remains distinct from player intercept sound.
- Implement with existing `Sfx` and shared volume/mixing/limiter, reusing category envelopes, voice priority/ducking and audio-unlock behavior. This sound is **combat SFX, NOT English pronunciation/TTS**.
- Guard rapid-fire polyphony and clipping. Compare headphones and speakers with parent global music, in-game BGM, announcer and English pronunciation. Provide a Test Lab trigger and regression coverage; perform a real-browser manual audio acceptance test.

## E. Stage Clear / results V2

Replace the current five loose result cells and overgrown Rewards text with an ordered, compact responsive result screen. Keep primary Next Stage, Replay, Campaign Map and Back to Title actions, and respect M14/revised ten-stage checkpoint/hidden-stop transition rules when those designs are implemented.

### E1. Summary above the fold

- Stage number, World, difficulty/mode, clear time (active gameplay time; pause and precombat transition excluded), 0-3 stars with an **explicit published scoring rubric**, earned rewards separated by currency/item.
- Primary cards: enemies killed, enemies spawned/resolved where meaningful, kill rate per minute, average WPM, peak rolling WPM, accuracy, score and max streak.
- Optional expandable Combat detail: normal/elite/boss defeated, hostile bullets intercepted/missed, damage taken, shields absorbed, skills/consumables used and objectives achieved, but **only** for metrics actually instrumented. Never display invented zeroes for unavailable counters.
- Do not confuse `hits` (currently correct keystrokes including projectile hits) with killed enemies, total English words, or valid word-typing characters for WPM. Define a consistent stage WPM/accuracy denominator and label excluded categories explicitly.
- Star example to finalize and test: 1 for clear, 2 for an accuracy threshold, 3 for an authored secondary objective (or an explicitly documented alternative on stages without one). Do not award impossible third-star conditions to stages lacking objectives. If per-stage best stars are persisted, use a deliberate versioned migration and replay-best semantics. The score rubric should remain fair across difficulty profiles, not promise a comparison unsupported by data.

### E2. Word review tabs

- Tabs: **All / Perfect / Corrected / Missed** with counts. Each record: EN word or phrase, IPA and VI from the actual selected entry, occurrences, correct/wrong key count as available, final status and (optional) typing time. A word typed twice should be grouped clearly with occurrence count and accessible individual attempts.
- Perfect = completed without wrong key on that attempt; Corrected = completed after at least one mistake on that attempt; Missed = a displayed hostile word that escaped/failed/was not completed. Distinguish unfinished words from words never typed because an enemy was destroyed by a skill or chain effect; do not mark those as typing mistakes.
- Count multi-layer enemy words separately as word attempts, but count that enemy once as a kill when it dies. Boss words completed or interrupted belong to their own explicit category/metadata so totals reconcile.
- Expose only real attempted words in the default learning breakdown. Optional filters may reveal projectile letters and non-hostile bonus words, but never inflate English-word counts with projectile characters.
- Word trace should attach to the actual target/attempt lifecycle, not infer perfect/corrected only from global miss totals. Preserve a wrong-then-corrected word's `hadError` state across layer handling.
- Long 100+ word runs require virtualized/paginated or collapsed groups so results remain fast/readable on mobile. Add compact filters/search only where they improve use.

### E3. Data lifetime

- Stage session trace is created at start, frozen on clear/fail, and available on that result page without unnecessary per-frame DOM writes.
- Explicitly decide bounded persistence of `lastStageResult` and per-stage personal best summary separately; do not persist all attempts of all 1,000 stages into PlayerSave without a defined size budget and migration. Recovery of an active stage should not duplicate old trace events.
- Add contract + lifecycle tests for hit/miss/correct/recovered/escaped/skill-kill, layers, bullets, bosses, retry, replay, pause, death/protection and post-clear hidden/checkpoint transitions.

## F. Reviewable development order

1. Instrument stage lifecycle, spawn budget, explicit phases and per-stage word ledger (first get word selection correct; then raise total enemies without destroying variety). Add deterministic simulation/regression tests.
2. Integrate exact-active-duplicate exclusion and fair least-used fallback at **every** hostile word-creation path; audit same-prefix selection and replay/reset/recovery.
3. Integrate dedicated projectile intercept SFX and manual listening/Test Lab trigger.
4. Add isolated stage word attempt/event tracker, reconcile typed-word versus projectile metrics, and implement the new result layout/stars/word tabs.
5. Run complete Test/TypeScript/build/bundle CI, review passes and M22 real-browser/audio/visual matrix on the final combined build. Preserve and integrate the independently proposed Campaign Map/checkpoint rest-stop redesign in PR #75 without silently overriding its pending status.

Do not mark any of these steps COMPLETE because this document or its draft PR exists.
