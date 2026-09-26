# Runtime Visual, Audio & Test Lab Hardening Plan

Status: **ACTIVE IMPLEMENTATION — desktop first**

Date: 2026-09-26

## 1. Why this pass exists

Owner browser review confirms three production gaps remain after Stage Results V3:

1. gameplay backgrounds and environmental objects still do not match the approved cinematic demos;
2. current repository music still contains dated/harsh fallback material and the audible result is not acceptable;
3. Test Lab controls are not sufficiently trustworthy for visual/audio QA because some controls change form state without clearly changing the live runtime.

This pass fixes those three areas in that order of dependency: make Test Lab reliable first, then use it to validate the environment and audio work.

## 2. Non-negotiable visual direction

The approved demo sheets are the visual target.

Do not try to rescue weak source art by drawing fake detail in runtime code.

Use a hybrid production pipeline:

- high-quality local/openly-licensed authored source art for nebulae, planets, asteroids, debris, wreckage, crystals, structures and other readable objects;
- runtime code only for composition, crop, parallax, drift, slow tumble, orbit, fly-by, opacity and bounded ambient FX;
- procedural geometry is support-only and must not be a hero/background landmark;
- desktop first; tablet/mobile adaptation is deferred;
- central typing/combat lanes stay readable.

World 01 / Rainbow Reach is the gold-standard implementation gate. Do not roll out to all 50 Worlds until World 01 visibly crosses the approved demo quality bar in a real browser.

## 3. Test Lab correctness findings

Confirmed source findings before implementation:

- changing the Character select alone only changes the HTML control;
- the live Game character changes only when the separate `Apply Character / Core Stats` button is pressed;
- `startArena()` creates a fresh Game but does not apply the selected Test Lab character before starting the stage, so restarting the arena silently returns to the Game default character;
- the Test Lab runtime snapshot does not expose the effective character id, which makes it difficult to verify whether a selection actually applied;
- the UI does not distinguish pending form selection from effective live runtime state.

### Test Lab acceptance

- Character change applies immediately to the live sandbox when an arena exists.
- Starting/restarting the arena applies the selected character before the stage begins.
- The effective character is visible in the Test Lab inspector.
- Character-specific ship art and skill definition visibly change.
- Core stats still require an explicit apply action; character selection must not silently overwrite manually entered stat values.
- Runtime snapshot regression tests prove the selected character survives restart/start.
- Other Test Lab controls keep explicit apply semantics unless a live-safe immediate apply is intentionally documented.

## 4. World 01 environment production pass

### Far layer
- deeper authored nebula/galaxy plate;
- denser but restrained micro-star hierarchy;
- separate slow-drift haze/nebula layer;
- no large procedural polygons.

### Mid layer
- curated hero planet off-axis;
- 2–4 smaller support planets/moons with different depth/speed;
- authored asteroid/debris objects;
- sparse distant ship/wreck/signature objects where source quality is sufficient.

### Near layer
- one rare authored hero asteroid/wreck fly-by at a time;
- edge-biased placement;
- slow tumble and smooth fade/wrap/approach;
- never block the central typing lane.

### Motion
- far nebula drift: very slow;
- support planets: subtle independent parallax/orbit;
- small debris: slow drift;
- mid asteroids: bounded tumble;
- hero object: rare approach/fly-by;
- micro stars: bounded twinkle/glint;
- no full-screen runtime blur/filter animation.

### Performance
- authored bitmap/SVG source cached by existing renderer;
- bounded instance counts;
- no per-frame asset generation;
- no new registry scans in the draw loop;
- High/Ultra may add optional objects; Low/Medium skip them before load.

## 5. Audio cleanup

Current repository defaults are functional but not final-content quality.

Required work:

- identify which current track produces the harsh/dated audible result;
- replace or remap repository defaults with calmer modern sci-fi/space ambient material from redistribution-safe sources;
- preserve the existing MusicController state machine and fallback architecture;
- normalize relative gains so music never competes with pronunciation, warnings or typing feedback;
- reduce excessive high-frequency energy by source selection/mix level, not by adding expensive realtime EQ;
- keep boss/intense states stronger than normal exploration but avoid retro siren-like looping;
- Test Lab must expose the effective music asset id/candidate currently playing.

Audio acceptance:
- normal World 01 loop can be listened to for several minutes without fatigue;
- intense/boss state is distinct but not painfully bright;
- victory/defeat remain short stingers;
- pronunciation stays dominant;
- no duplicated loops after restart/pause/Test Lab transition.

## 6. Implementation sequence

1. Commit this plan.
2. Fix Test Lab character/runtime binding + inspector evidence + regression tests.
3. Audit/curate World 01 authored visual assets.
4. Recompose World 01 runtime layers and motion.
5. Audit/replace/remap dated default music.
6. Add targeted regressions for asset contracts, audio mapping and Test Lab state.
7. Run full child CI.
8. Review full PR diff for logic/UI/performance regressions.
9. Merge only after Test + TypeScript + Build are green.
10. Owner real-browser screenshot/audio acceptance remains the final perceptual gate.

## 7. Completion rule

Do not report this pass complete merely because CI is green.

Automated completion proves correctness/build safety.

Visual/audio completion requires:
- World 01 clearly different from the old purple-flat scene and materially closer to the approved demo;
- effective object motion visible without reducing readability;
- the old harsh/dated normal gameplay music no longer being selected;
- Test Lab character selection verifiably changes the live runtime and survives arena restart.
