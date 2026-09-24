# Audio Experience + Post-Implementation Review Plan

Status: **AUTOMATED IMPLEMENTATION COMPLETE / REAL-AUDIO M22 ACCEPTANCE PENDING**

## 1. Goal

Expand Space Typing audio from a capable runtime shell into a real adaptive sci-fi soundscape without weakening English-learning clarity or trading performance for feature removal.

This plan is explicitly **not** an optimization-by-deletion plan. Existing gameplay, enemy counts, particles, visual quality modes, typing pronunciation, mechanics and presentation remain intact. Performance changes must target avoidable work, incorrect hot-path behavior, repeated allocation, redundant lookup, or unstable presentation.

## 2. Audio design priorities

Mix priority, highest first:

1. English pronunciation
2. critical warning / boss alert / announcer
3. typing confirmation and combat readability
4. adaptive music
5. ambient spacecraft/world layers

Music and SFX must duck under pronunciation instead of competing with it.

## 3. Licensed source policy

Only redistribution-safe assets may be committed.

### SRG774 — Dark Sci-Fi Audio Pack

Source:
https://opengameart.org/content/dark-sci-fi-audio-pack

License: CC0 1.0.

Planned use:
- Sector: calm exploration / normal combat
- Airy: station / hidden / low-pressure atmosphere
- Pulse: pressure ramp / intense combat
- Urgent: boss and high-risk combat
- Transmission: defeat / transition / ominous handoff
- Victory: stage-clear stinger

### Kenney — Sci-Fi Sounds

Source:
https://opengameart.org/content/sci-fi-sounds

Original creator/source: Kenney / kenney.nl.
License: CC0.

Planned use:
- ship engine ambience
- laser accents
- force-field / shield feedback
- explosions
- boss/large-engine arrival
- computer/radar ambience
- confirmation/error accents

All committed audio must have provenance documented in
`public/assets/audio/ATTRIBUTION.md`.

## 4. Adaptive music state model

Keep the existing state machine and make it audible with real assets:

- WORLD_NORMAL -> calm exploration
- WORLD_INTENSE -> rhythmic pressure
- MINI_BOSS -> pressure track
- WORLD_BOSS -> urgent track
- GALAXY_BOSS -> urgent track with existing boss-phase gain escalation
- CHAMPION_HUNT -> urgent
- HIDDEN_CHALLENGE -> pulse
- HIDDEN_WORLD -> airy/eerie
- SHOP -> calm
- STATION -> airy
- VICTORY -> non-looping victory stinger
- DEFEAT -> non-looping transmission
- TRANSITION -> non-looping transmission

World-specific private overrides remain supported. Repository audio is the verified default fallback.

## 5. Stage pacing -> music intensity

Normal Campaign stages must breathe:

- opening -> WORLD_NORMAL
- pressure -> WORLD_INTENSE
- mixed -> WORLD_INTENSE
- recovery -> WORLD_NORMAL
- finale -> WORLD_INTENSE

Boss/elite/hazard/hidden states remain authoritative and must not be accidentally replaced by normal-stage phase music.

Crossfades remain bounded so frequent wave changes do not restart or thrash audio.

## 6. Spacecraft / combat sound identity

Keep existing Web Audio synthesis as fail-soft fallback and character/gameplay signature.

Layer or replace selected events with short real samples where useful:

- player laser
- projectile intercept
- enemy/ship explosion
- shield/force-field break
- boss entrance / large-engine arrival
- UI confirmation / supply arrival

Do not play a sample on every low-value event if it masks typing or creates audio spam.

## 7. Performance constraints

- no audio work in the Canvas per-frame render loop;
- no new Audio element allocation on every keypress;
- preload only a bounded curated sample set;
- short SFX use a bounded reusable pool;
- music keeps at most current/retiring tracks plus at most two ambient layers;
- pronunciation ducking remains authoritative;
- asset fallback failures remain fail-soft;
- no 50-track world preload;
- no synchronous decode/network work during combat.

## 8. UI/UX and accessibility

- existing music / ambient / SFX volume settings remain effective;
- reduced-motion is independent of audio;
- warning sounds are throttled through event semantics, not repeated every frame;
- boss alert must be noticeable without being painfully louder than pronunciation;
- low-value UI hover spam is not required;
- pause/resume must not create duplicate loops.

## 9. Automated acceptance

Must pass:

- all existing unit/runtime tests;
- TypeScript;
- production build;
- bundle/art guards;
- music profile tests;
- music controller lifecycle/fallback tests;
- M22 audio audit tests;
- new tests for committed default asset mapping;
- new tests for stage-phase adaptive music policy.

## 10. Manual M22 acceptance

Real browser/audio-device validation remains required after implementation:

- normal -> pressure -> recovery -> finale transitions feel intentional;
- boss arrival is unmistakable;
- boss phases become more urgent without clipping;
- pronunciation stays understandable during warning/combat;
- shop/station are clearly calmer;
- 15+ minute session has no duplicated loops or accumulating audio artifacts;
- High/Ultra performance remains inside the existing Batch F gates.

## 11. Post-implementation review pass

After CI-green implementation, run a new source review for:

### UI/UX
- unclear controls or labels
- accidental overlap / forced reflow
- inaccessible or noisy feedback
- duplicated modal actions
- state feedback that appears but does not perform an action

### Logic
- stale state between retries/checkpoints/stages
- race conditions during transitions
- persistence mismatches
- unreachable or duplicated branches
- misleading measured results
- event order bugs

### Performance
- per-frame allocation
- linear registry scans in render/update paths
- layout-forcing DOM access
- repeated Canvas text/gradient work
- unbounded caches/timers/audio pools
- unnecessary sort/filter/map in frame loops
- redundant state writes

Every finding must be classified as:
- confirmed bug -> fix + regression test;
- plausible hot path -> measure/instrument before changing behavior;
- manual-only observation -> add to M22 evidence checklist.

## 12. Sequencing

1. Commit this plan.
2. Install licensed default audio assets + attribution.
3. Wire real adaptive music fallbacks.
4. Add bounded sampled SFX/ship ambience where valuable.
5. Connect stage pacing to intensity.
6. Run child CI.
7. Merge child and sync parent gitlink.
8. Run full parent Platform CI.
9. Run the post-implementation UI/UX + logic + performance review.
10. Fix confirmed review findings and repeat CI.
11. Real-browser/audio M22 remains the final non-automatable acceptance gate.


## 13. Implementation checkpoint — 2026-09-24

Completed in this implementation:

- committed verified CC0 default music for calm, pressure and boss/high-risk states;
- committed victory stinger;
- committed two spacecraft ambient loops;
- committed a curated Kenney SFX subset;
- added `SampleSfxBank` with bounded reusable voices;
- preserved Web Audio synthesis and pronunciation ducking;
- added critical-hull one-shot threshold warning;
- normal stage pacing now drives calm/intense music without overriding special encounter states;
- added CC0 attribution/provenance;
- added an audio binary integrity + payload guard;
- kept the existing executable bundle thresholds unchanged and separated non-executable audio media into its own 6 MiB guard.

Latest automated gate on the implementation branch:

- CI #622: PASS;
- 147 test files / 732 tests PASS;
- TypeScript PASS;
- production Vite build PASS;
- audio asset guard PASS: 15 OGG files / 3.22 MiB;
- existing M22 JS/CSS bundle thresholds PASS;
- existing Ship V3 art budget PASS.

Remaining acceptance is intentionally manual:

- listen on a real audio device;
- verify pronunciation remains dominant;
- verify normal -> pressure -> recovery -> finale transitions;
- verify boss arrival/phase pressure;
- verify shop/station calm contrast;
- verify 15+ minute session has no duplicate loops or accumulating audio artifacts.


## 14. T16 source-review checkpoint — 2026-09-24

A second post-implementation source review was performed after the adaptive-audio and shared-curriculum integrations.

Confirmed issues fixed in this pass:

- Vocabulary dialog no longer eagerly loads Class, Topic, Word type and Grammar indexes together; only the active source is loaded.
- A failure in one curriculum source no longer writes the same failure into every source panel.
- Five source tabs now use a balanced responsive layout and expose `aria-pressed` state.
- Shared vocabulary level JSON documents are cached per browser session; failed requests are evicted so retry remains possible.
- Grammar references are deduplicated before deriving the representative vocabulary difficulty profile.
- Particle damping now computes the same exponential coefficient once per simulation frame instead of once per particle axis.
- Sampled SFX now prewarm their complete bounded voice pools before combat, removing first-use `Audio` allocation from combat events.

Review findings explicitly *not* treated as removable features:

- particle counts remain unchanged;
- Canvas effects and visual quality modes remain unchanged;
- enemy/projectile counts and combat timing remain unchanged;
- sampled and synthesized SFX remain enabled;
- curriculum content and 18,000-word lexical data remain unchanged.

Automated acceptance for this review is the full child CI, including unit/runtime tests, TypeScript, production build, bundle guard, Ship V3 guard and audio asset guard.

Real browser/audio M22 acceptance remains pending and must still validate perceived motion smoothness, pronunciation priority, long-session audio lifecycle, UI readability and measured frame-time gates on actual hardware.
