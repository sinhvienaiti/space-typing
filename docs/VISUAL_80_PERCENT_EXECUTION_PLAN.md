# Visual >80% Execution Plan

Status: ACTIVE
Owner acceptance target: runtime visual quality >= 80% of the approved demo direction
Branch: `feat/visual-over-80-pass`
Created: 2026-09-26

## 1. Purpose

The current World 01 runtime is structurally correct but visually around 40% of the approved target.
The remaining gap is primarily authored composition, depth hierarchy, asset visibility, and per-World production migration—not a hidden legacy overwrite in World 01.

This plan converts the visual work into small, reviewable tasks. Every task must be implemented, code-reviewed, test-reviewed, and visually reasoned about before the next task starts.

## 2. Non-negotiable engineering rules

1. Keep one background runtime path. Do not introduce a second game loop.
2. Keep `WorldSceneRenderer` as the scene composition owner.
3. Do not restore legacy procedural landmarks/floors/cinematic geometry inside an authored-production World.
4. Do not add arbitrary file-size limits. Optimize runtime work, allocations, decoding, and draw count instead.
5. Reuse existing helpers and types before adding new abstractions.
6. Remove obsolete code when a replacement makes it unreachable.
7. No per-frame random allocation for authored scenery.
8. Instance generation must remain deterministic and bounded.
9. Essential visual-identity layers must not disappear merely because quality is Medium.
10. Low quality may reduce density; it must not destroy the scene identity.
11. Central typing/readability corridor must remain quieter than outer thirds.
12. Every new asset requires local path + provenance/license record.
13. Unit tests prove contracts, not beauty. Browser screenshots remain the perceptual acceptance gate.

## 3. Definition of >80%

A production World passes only when a paused gameplay frame has all of these:

- clear D0-D5 depth hierarchy;
- structured deep-space background, not a uniform color wash;
- one strong off-axis landmark;
- obvious far/mid/near object scale separation;
- detailed near objects that do not look like placeholder chunks;
- bright-star hierarchy without debug-like speed lines;
- meaningful environmental storytelling object(s);
- composition density concentrated away from the typing corridor;
- no legacy geometry leaking into the authored scene;
- Medium quality keeps the visual identity;
- High/Ultra enrich the scene rather than revealing the scene for the first time;
- stable motion with no obvious wrap pop;
- no scenery mistaken for an active enemy;
- no IPA/Recall/HUD overlap regression.

The practical target is >= 8/10 in owner browser review for World 01 before rollout.

## 4. Task workflow

For every task:

1. Re-read the exact files affected.
2. Write the smallest coherent change.
3. Update/add tests for the contract changed.
4. Self-review for:
   - accidental legacy-path reintroduction;
   - duplicate helpers/data;
   - unnecessary branching;
   - per-frame allocation;
   - quality/readability regression;
   - dead code;
   - naming/type clarity.
5. Commit one task as one logical commit.
6. Check CI when available.
7. Do not mark visual acceptance complete without owner/browser evidence.

## 5. Detailed task breakdown

### V80-00 — Baseline + acceptance contract

Goal: freeze the current root cause and acceptance rules so later work cannot drift.

Deliverables:
- this execution plan;
- current World 01 architecture recorded as `authored-production`;
- current non-migrated Worlds recorded as `legacy-hybrid`;
- current known visual failure: flat reused nebula, weak scale hierarchy, too few asteroids, quality-gated identity layers.

Acceptance:
- no runtime behavior change;
- plan is committed before visual refactor work.

### V80-01 — Explicit layer quality contract

Problem:
`optional: true` currently means High/Ultra only. That is too coarse and hides identity-defining layers on Medium.

Implementation:
- add an explicit minimum visual quality field to authored layers;
- centralize quality ordering/check logic;
- preserve backward compatibility for old `optional` declarations during migration;
- move World 01 identity-critical layers to Medium-or-better visibility;
- keep only truly decorative density on High/Ultra.

World 01 Medium must include:
- asteroid field;
- at least one secondary celestial body;
- near scale cue;
- enough far/mid depth to read as a layered scene.

Tests:
- quality contract unit tests;
- World 01 identity layer assertions.

### V80-02 — Composition helpers, no duplicated magic data

Goal:
prepare clean, readable composition data before increasing density.

Implementation:
- extract small authoring helpers only where repeated configuration is genuinely duplicated;
- group Galaxy layers by D0-D5 purpose in source order/comments;
- avoid a generic abstraction that hides actual art direction;
- keep layer declarations easy to inspect.

Acceptance:
- output behavior equivalent except for intentional composition changes in later tasks;
- registry becomes easier to audit.

### V80-03 — D0/D1 deep-space volume correction

Problem:
the same purple nebula source is reused in a way that reads as one flat purple wash.

Implementation:
- create visibly distinct deep-void and nebula-volume treatments from available authored sources;
- reduce equal-weight fullscreen repetition;
- keep a darker base, one main luminous structure, and a lower-opacity secondary volume;
- use blend/anchor/scale/motion differences only when they create perceptible depth;
- source additional licensed local nebula art if current sources cannot satisfy the visual bar.

Acceptance:
- screenshot no longer reads as one uniform purple sheet;
- black/deep navy negative space remains visible;
- nebula structure has a clear dominant region and secondary depth.

### V80-04 — Far asteroid/debris band

Goal:
create many small distant fragments without clutter.

Implementation:
- bounded deterministic instances;
- small scale, low opacity, slow relative motion;
- wide spread biased away from center where possible;
- no expensive per-frame treatment.

Acceptance:
- far field is visible but subordinate;
- no central typing noise;
- Low reduces count, Medium still preserves the field identity.

### V80-05 — Mid asteroid band

Goal:
make asteroid depth obvious.

Implementation:
- multiple silhouettes/sources;
- stronger size variance;
- rotation and lateral/depth motion;
- enough instances to form a field without reading as repetition.

Acceptance:
- at least 3 visibly different asteroid silhouettes in normal play;
- mid band is clearly larger/faster than far band.

### V80-06 — Near hero asteroid band

Goal:
replace the current occasional small chunk with convincing near-camera scale cues.

Implementation:
- 1–3 sparse near objects depending on quality;
- substantially larger scale than mid band;
- edge-biased placement;
- approach/fly-through movement with smooth entry/exit;
- never cover the central word corridor for long;
- reject any source that becomes visibly rough when enlarged.

Acceptance:
- a paused frame can contain a convincing foreground object;
- near art no longer looks like a placeholder rock.

### V80-07 — Landmark hierarchy

Goal:
make the scene composition intentional rather than evenly scattered.

Implementation:
- one dominant off-axis celestial landmark;
- one secondary body;
- tune relative size/opacity/position;
- avoid equal visual weight among all planets.

Acceptance:
- the eye has a clear first focal environmental object;
- landmark supports gameplay rather than competing with targets.

### V80-08 — Narrative environmental objects

Goal:
make the world feel inhabited/alive.

Implementation:
- retain distant ship/wreck/structure silhouettes as scenery;
- at least one narrative object visible on Medium when safe;
- optional extra fly-bys on High/Ultra;
- keep opacity/scale distinct from enemies.

Acceptance:
- scene tells a small environmental story;
- no scenery is confused with an enemy.

### V80-09 — Star hierarchy + atmosphere polish

Implementation:
- faint/normal/bright/rare-glint balance;
- outer-third bias;
- corridor suppression;
- subtle atmospheric particles only;
- no universal streak-line effect.

Acceptance:
- stars contribute depth, not noise.

### V80-10 — World 01 holistic composition review

Review together:
- D0-D5 layering;
- motion;
- scale hierarchy;
- center readability;
- paused-frame composition;
- quality Low/Medium/High/Ultra.

Acceptance:
- owner browser review >= 8/10;
- no known blocker hidden behind “tests pass”.

Do not migrate further Worlds before this gate.

### V80-11 — World 02 authored-production migration

Curate its own asset manifest first, then switch its render mode.
Do not reuse World 01 as a simple palette swap.

### V80-12 — World 03 authored-production migration

Prism/cosmic-shard identity, distinct landmark and motion mix.

### V80-13 — World 04 authored-production migration

Luminous/celestial identity, distinct composition and narrative objects.

### V80-14 — World 05 authored-production migration

Aurora/meteor emphasis with stronger rock/comet depth.

### V80-15 — Galaxy 01 five-World acceptance

Acceptance:
- Worlds 01–05 are materially distinct in paused screenshots;
- all five are authored-production;
- no legacy landmark/floor/cinematic geometry.

### V80-16 — Remaining family production rollout

Migrate family-by-family only after curated manifests exist:
Infernal -> Frost -> Verdant -> Shadow -> Cosmic Forge -> Abyss -> Aurora Cosmic -> Cathedral -> Eternity.

Each family gets a separate review checkpoint; do not mass-toggle renderMode first.

### V80-17 — Cross-mode readability regression

Explicit review:
- normal combat;
- boss;
- Recall;
- IPA/translation UI;
- resize/DPR;
- Low/Medium/High/Ultra.

### V80-18 — Performance + continuous-motion QA

Review:
- no per-frame image creation;
- no per-frame registry scans;
- bounded instances;
- decode/preload behavior;
- visible wrap/approach popping over 3–5 minutes;
- worst case boss + particles + rich background.

### V80-19 — Audio pass after visual acceptance

Audio is intentionally separate:
- ambience/music;
- combat SFX;
- warning/boss cues;
- per-family mood.

Do not use audio work to mask an unfinished visual scene.

### V80-20 — Final docs + parent integration

- update production docs to match actual runtime;
- record final asset provenance;
- confirm tests/build/CI;
- update parent repository gitlink only after child acceptance.

## 6. Immediate execution order

The implementation starts now in this exact order:

1. V80-00 plan commit.
2. V80-01 quality contract.
3. V80-02 composition cleanup.
4. V80-03 deep-space volume.
5. V80-04 far asteroid band.
6. V80-05 mid asteroid band.
7. V80-06 near asteroid band.
8. V80-07 landmark hierarchy.
9. V80-08 narrative objects.
10. V80-09 atmosphere.
11. V80-10 owner/browser acceptance gate.

Only after V80-10 passes do Worlds 02–05 migrate.

## 7. Review record format

Append a short checkpoint after each completed task:

- Task:
- Commit:
- Files changed:
- Contract changed:
- Tests added/updated:
- Self-review findings:
- Remaining visual risk:
- CI:
- Browser acceptance:

A task is not “done” merely because TypeScript compiles.
