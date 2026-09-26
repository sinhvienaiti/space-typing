# Visual >80% Execution Plan

Status: ACTIVE — owner rejected first V80-10 screenshot (<50% perceptual match); corrective visual pass implemented, fresh browser acceptance pending
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


## 8. Review checkpoints

### V80-00
- Task: baseline + acceptance contract
- Commit: `2863751d25e91c9ed3d922849d616e7732138edb`
- Files changed: execution plan only
- Contract changed: none at runtime
- Tests added/updated: none
- Self-review findings: root cause recorded as composition/depth/visibility, not a hidden World 01 legacy overwrite
- Remaining visual risk: all runtime work still pending at this point
- CI: documentation-only
- Browser acceptance: baseline screenshot remained rejected at ~40%

### V80-01
- Task: explicit layer quality contract
- Commit: `9f0e401c11a3690cdcef135ffc7b0fd0a1e3a243`
- Files changed: background types, renderer, registry, tests
- Contract changed: authored layers can declare `minQuality`; legacy `optional` behavior remains compatible
- Tests added/updated: quality visibility assertions
- Self-review findings: one centralized quality decision is used by preload and instance generation; no duplicated gating path. World 01 layers migrated to explicit `minQuality` no longer carry redundant `optional: true` state.
- Remaining visual risk: composition itself was still weak
- CI: PASS
- Browser acceptance: pending

### V80-02
- Task: explicit Galaxy depth grouping
- Commit: `504249d07bb117623fedde07098977d263abd290`
- Files changed: layered background registry
- Contract changed: none; source layout made auditable as D0-D5 groups
- Tests added/updated: existing registry integrity tests remained valid
- Self-review findings: an intermediate self-reference typo was caught during commit review and replaced before continuing
- Remaining visual risk: source art was still repeated
- CI: PASS
- Browser acceptance: pending

### V80-03
- Task: deep-space volume correction
- Commits: `78731bab37ccb9faa12bd3624c04d479d868ebf1`, `9bb66ad23d23643d169c394238f66e85ca7e7d1b`, `6cea11fac8e3bdd10f2673ba58755157b6090479`
- Files changed: registry, tests, asset provenance, asset integrity gate, one new CC0 nebula binary
- Contract changed: World 01 now composes distinct purple + blue nebula volumes instead of visually repeating one source
- Tests added/updated: distinct-source assertion + PNG integrity gate
- Self-review findings: imported source provenance/license retained; asset is local and build-checked
- Remaining visual risk: exact blend/opacity still requires browser judgment
- CI: PASS (#923 on latest integrity-gate head)
- Browser acceptance: pending

### V80-04
- Task: far asteroid band
- Commit: `70f8d2862c0c0431dd30b0ff193236793b0463e4`
- Files changed: registry, tests
- Contract changed: deterministic bounded far fragments remain visible even on Low; quality scaling reduces count instead of deleting the whole far band
- Tests added/updated: depth/scale/count/placement assertions
- Self-review findings: an initial count expectation failed CI and was corrected instead of weakening the feature; holistic review later caught that `minQuality: medium` contradicted the task's Low-density requirement, so the far band was restored on Low and left to the existing bounded quality scaler
- Remaining visual risk: density perception requires runtime motion review
- CI: PASS after correction
- Browser acceptance: pending

### V80-05
- Task: mid asteroid hierarchy
- Commit: `3c10459dc108b66e8a15b4df4023eedb7bfb8e8e`
- Files changed: registry, tests
- Contract changed: three sourced silhouettes and >=10 authored mid instances before quality scaling
- Tests added/updated: silhouette uniqueness, count and scale hierarchy
- Self-review findings: reused existing deterministic renderer; no new spawn system or per-frame random allocation
- Remaining visual risk: browser must confirm repetition is not noticeable
- CI: PASS
- Browser acceptance: pending

### V80-06
- Task: near hero asteroid band
- Commit: `61995bc3d1d0df79941e9cd173ba0004cc6d1757` plus V80-10 scale polish
- Files changed: registry, tests
- Contract changed: Medium retains one near approach cue; High adds a secondary cue
- Tests added/updated: approach count, quality threshold, near-vs-mid scale checks
- Self-review findings: placement remains edge-biased and deterministic; no center-spawn helper was introduced
- Remaining visual risk: final near-camera scale requires browser acceptance
- CI: PASS before final scale polish
- Browser acceptance: pending

### V80-07
- Task: landmark hierarchy
- Commit: `b5f6fc5da6dba9360987c26d77d2a7bbe4d736ef`
- Files changed: registry, tests
- Contract changed: one dominant off-axis primary planet with a clearly subordinate far planet
- Tests added/updated: scale/opacity/position hierarchy
- Self-review findings: existing sourced planet family retained; no extra procedural planet geometry
- Remaining visual risk: browser must confirm focal balance
- CI: PASS
- Browser acceptance: pending

### V80-08
- Task: narrative environmental object
- Commits: `09a34a2efe6ec451a8a311b8fca587372d106a6d`, `acbfc7a77094e684c75e6b4c801bfb666bfff205`
- Files changed: registry, tests
- Contract changed: Medium includes a low-opacity persistent sentinel; High retains a rare flyby
- Tests added/updated: persistent/flyby behavior and quality assertions
- Self-review findings: CI exposed a stale renamed-layer assertion; it was fixed with an explicit missing-layer assertion rather than hidden
- Remaining visual risk: scenery/enemy visual distinction still needs browser confirmation
- CI: PASS after correction
- Browser acceptance: pending

### V80-09
- Task: star hierarchy + typing-lane readability
- Commits: `a91910f80a01cb06a2b19ad8dba2e7e7cd1d2449`, `9483c9b1fd096bb7a80bc7e8d63f621c53c8cd24`
- Files changed: scene renderer, renderer tests
- Contract changed: World 01 suppresses center star/ambient-scenery intensity and slightly enriches outer thirds
- Tests added/updated: deterministic shared scenery-readability factor and World 01 scope assertions
- Self-review findings: first pass was too broad for all celestial-rainbow scenes; scope was narrowed to World 01 before rollout
- Remaining visual risk: star/ambient density still requires browser judgment at active combat speed
- CI: PASS
- Browser acceptance: pending

### V80-10
- Task: holistic World 01 composition review
- Status: CODE AUDIT ACTIVE
- Current code review: D0-D5, two nebula sources, far/mid/near asteroid bands, focal landmark, narrative silhouette, Medium identity and center-star suppression are now guarded by tests
- Additional polish: near-camera asteroid scale increased after reviewing the actual sourced asteroid binaries at native quality
- Self-review finding: current asteroid binaries are detailed cratered art; the earlier “rough chunk” look was primarily runtime scale/composition, not a low-detail source image
- Remaining visual risk: perceptual score cannot be honestly closed without a fresh owner/browser screenshot
- CI: must pass on this checkpoint before browser acceptance
- Browser acceptance: PENDING; do not migrate World 02 yet


## 9. Owner rejection corrective pass

The first post-V80 screenshot was explicitly rejected by the owner as still below
50% of the approved demo direction. This overrides the earlier internal
65–70% estimate. The correction target is not “more objects”; it is stronger
art-direction similarity, scene cohesion and cinematic composition.

### V80-10A — Asteroid palette integration

Commit: `317e6a253589664f945fc1eb6ebee279dc97df1a`

Changes:
- added a typed sourced-art treatment contract;
- far/mid/near asteroid bands inherit progressively stronger cool-space color
  grading;
- added bounded blue/violet edge glow using the existing canvas draw path;
- no duplicate asteroid assets and no per-frame image generation.

Review:
- treatment mapping is centralized;
- renderer state is contained by save/restore;
- the treatment is opt-in and limited to individual authored Galaxy rocks;
- the full-screen authored asteroid-field texture intentionally avoids the
  filter/shadow treatment so the integration pass does not add a large
  per-frame blur/filter cost.

### V80-10B — Star/noise reduction

Commit: `9a3d4e6f413ce4c08987bd677ee15f8de6581bdf`

Changes:
- reduced dense star-texture opacity;
- reduced sparse star-texture opacity;
- reduced embedded blue-nebula dominance while preserving the blue volume;
- reduced planet-speck texture weight;
- reduced World 01 procedural far-star density;
- halved the production near-star contribution;
- renamed the World 01 feature gate from star-specific wording to general
  production polish wording.

Review:
- change is scoped to World 01 where behavior differs;
- Worlds 02+ keep existing behavior until their own authored migration.

### V80-10C — Art-directed frame composition

Commit: `5b9838ae5bf316c1e1c9b977e8cc540cb99cdc83`

Changes:
- tightened primary/secondary celestial hierarchy;
- anchored the hero foreground asteroid deliberately at the upper-right edge
  instead of letting deterministic edge scattering choose either side;
- anchored the secondary foreground rock at the lower-left edge on High+;
- moved the distant sentinel and secondary bodies to support a left-landmark
  -> center gameplay -> right-depth visual flow;
- reduced the near hero scale slightly after placement was made intentional.

Review:
- foreground objects are now framing devices rather than random composition;
- the central gameplay lane remains free of intentionally anchored hero objects.

### V80-10D — Hero narrative accent

Commit: `26fcc66c67f3a8a86927a28f20a022053ed8bf1d`

Changes:
- added a subtle local luminous orbital structure in the upper-right depth field;
- uses an existing local authored asset, low opacity, screen blend and slow
  float;
- visible from Medium so the World has a memorable authored identity;
- remains visually subordinate to enemies and the primary planet.

### Corrective CI note

Composition intentionally reduced the hero asteroid from 0.30 to 0.27 while
anchoring it at the frame edge. One pre-existing test still required >=0.28 and
correctly failed CI. The test was updated to the new art-directed contract in
`0b8288757cba34ac96d00366dca6eb3c669b7227`; the holistic test still requires
the near band to remain >3x the largest mid-band scale.

### Corrective acceptance gate

Do not migrate World 02–05 yet.

Required next evidence:
1. CI passes on the corrected head.
2. Pull the branch on Windows/WSL.
3. Capture the same Stage 004 framing.
4. Re-score against the approved demo, using the owner's perceptual score as
   the acceptance source of truth.
5. If still below 80%, continue World 01 correction before any broader rollout.


### V80-10E — Composition architecture reset

Owner review confirmed that repeated parameter tuning on the old collage was not
producing a meaningful perceptual change. World 01 now uses
`galaxy/cinematic-v2.svg` as one authored full-frame composition. The old
full-screen star/particle support is visually suppressed for World 01, while
planet/asteroid layers are retained only as sparse parallax depth cues. This
pass is intentionally a composition reset rather than another opacity-only
polish cycle. World 02+ remains blocked until a fresh browser capture is
accepted.


### V80-10F — Revert rejected V3 and audio cleanup

The full-frame cinematic V3 composition was rejected in browser review because
it overcorrected and obscured gameplay. The branch has been returned to the
last stable visual architecture, the rejected cinematic asset was removed, and
World 01 now explicitly filters out the large left blue planet.

Audio cleanup from the same review:
- removed the secondary `computer-loop.ogg` ambient layer that caused the
  repetitive high-pitched background beep;
- removed the synthesized projectile-warning tone from the frequent enemy
  telegraph path while preserving warning ducking/mix behavior;
- added regression tests for both behaviors.

Verified checkpoint: CI #976 PASS.


### V80-11..14 — Galaxy 01 sibling Worlds

Code implementation complete; browser acceptance pending.

The canonical World registry defines the next four Worlds as:
- World 02 — Halo Garden / heaven;
- World 03 — Prismatic Tide / prism;
- World 04 — Cherub Falls / cherub;
- World 05 — Aurora Gate / aurora.

They now use isolated authored layer arrays registered through a single
`AUTHORED_WORLD_BACKGROUNDS` ownership map. This replaces the previous
variant-driven shared composition for these production Worlds and prevents a
World-specific visual adjustment from mutating a sibling World.

Regression coverage asserts:
- Worlds 01–05 are authored-production;
- World 06+ remains legacy-hybrid at this checkpoint;
- each World 02–05 contains its required theme-signature assets;
- the rejected large ocean planet is not inherited by Worlds 02–05;
- authored World layer arrays are not shared by reference.

Verified implementation checkpoint: CI #979 PASS, 154 test files / 797 tests.
See `docs/WORLD_VISUAL_THEME_MATRIX.md` for the maintenance contract.


### V80-11A — Halo Garden approved production art

Browser review exposed that the first binary upload of the approved Halo Garden
painting was truncated even though the old signature-only integrity gate passed.
Test Lab was correctly using the production `Game` runtime; the artwork itself
was failing to decode, so the remaining vector support layers were all that could
be seen.

The asset is now stored as an AVIF production painting at
`heaven/halo-garden-production-v1.avif`. The integrity gate validates the AVIF
container and its authored 896x504 dimensions, preventing a truncated binary
from passing CI again. World 02 still owns its isolated composition and keeps
secondary vector layers deliberately subtle.
