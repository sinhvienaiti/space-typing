# Environment Art Production V2 — Deep, Rich, Living World Backgrounds

> Status: APPROVED FOR IMPLEMENTATION
>
> Created: 2026-09-26 after owner visual QA rejected the current Galaxy pass as
> too simple/flat and the current asteroid art as too rough.
>
> This plan is authoritative for the next visual-production pass. It extends
> `WORLD_BACKGROUND_SCENE_SYSTEM_PLAN.md`,
> `CINEMATIC_BACKGROUND_SYSTEM_PLAN.md`, and
> `LAYERED_BACKGROUND_ASSET_SYSTEM_PLAN.md`.
>
> Runtime architecture remains single-path: `WorldSceneRenderer` composes the
> authored layered renderer plus bounded support FX. Do not introduce another
> background game loop.

---

## 1. Why the current pass still fails visually

The renderer architecture is sound, but the production art is not yet at the
target quality.

Observed root causes:

1. **Galaxy base art is too flat.** The current dark Kenney sky is intentionally
   quiet, but it reads as a game backdrop rather than a deep, dangerous universe.
2. **Current meteor sprites still read like arcade rocks.** Even though they are
   sourced CC0 sprites rather than procedural polygons, their silhouette/detail
   is too simple at the sizes currently used.
3. **Authored layer density is too low.** One configured image generally means
   one visible object. The scene lacks the hundreds-to-dozens depth hierarchy
   seen in strong space imagery: huge foreground rock, medium belt, many small
   distant fragments.
4. **Stars are technically present but visually weak.** Galaxy disables near
   line-streak stars, which removed debug-like lines but also removed useful
   high-contrast depth cues. The replacement needs bright stars/glints, not lines.
5. **World variants are not authored strongly enough.** Several Worlds share one
   family array, so the configuration says "variant" while the screenshot still
   looks too similar.
6. **Narrative silhouettes are missing.** Distant ships, wrecks, creatures,
   structures or moving formations are absent from most scenes.
7. **Most non-Galaxy families still rely on simple custom SVG scenery.** These are
   useful structural placeholders but not the final visual bar.
8. **Motion types are too generic.** Drift/wrap/rotation work, but some objects
   need fly-by, orbit, depth approach, slow cinematic float and event paths.
9. **There is no explicit visual-density composition contract.** Rich scenes need
   more content near edges and depth bands while keeping the word corridor quiet.

This is therefore an **environment-art production problem**, not a request for
more random particles.

---

## 2. Target visual language

The target combines:

- deep black negative space;
- visible colorful nebula / galaxy structure;
- bright star hierarchy;
- large off-axis celestial landmarks;
- small, medium and very large environmental objects;
- foreground objects that occasionally cross near the camera;
- distant ships / ruins / creatures when appropriate;
- darkness and scale strong enough to feel mysterious or dangerous;
- smooth, slow large-object motion plus faster near-depth motion;
- enough asymmetry that a paused frame feels composed rather than generated;
- scene-specific visual storytelling.

Reference interpretation:

- asteroid-field references work because rock size varies strongly across depth;
- high-quality space wallpapers work because black space and luminous nebula
  coexist instead of filling the whole frame with equal brightness;
- cinematic game scenes use a dominant landmark plus supporting objects rather
  than many equal-weight decorations;
- parallax works when the depth bands move at obviously different but smooth
  speeds.

Do not copy proprietary game/wallpaper art. References define visual direction
only.

---

## 3. Asset sourcing rules

### 3.1 Preferred sources

Prefer, in order:

1. CC0/public-domain game art with explicit license;
2. reputable CC0 asset publishers with coherent packs;
3. NASA imagery only when the exact media item is suitable and its use is
   consistent with NASA media guidelines;
4. attribution licenses only when the asset is materially better and the
   attribution requirement is recorded and acceptable.

Candidate sources researched for this pass include:

- Screaming Brain Studios Seamless Space Backgrounds — CC0, 64 backgrounds,
  512/1024;
- OpenGameArt 3 Layer Parallax Star and Nebula Field — CC0, 4096x4096;
- OpenGameArt Handpainted 2D Space Shooter Spritesheet — CC0;
- OpenGameArt asteroid assets — CC0-compatible candidates;
- Foozle Void Environment Pack — CC0, layered backgrounds + animated
  planet/asteroid;
- NASA raw/scientific imagery where exact source rights are clear.

### 3.2 Quality gate

License is necessary but not sufficient.

Reject an asset when:

- it becomes visibly pixelated/flat at display scale;
- the silhouette is too simple to survive a large foreground presentation;
- its art style conflicts badly with the rest of the scene;
- it is a tiny icon being enlarged as scenery;
- it fills the central typing corridor with noisy contrast;
- it only improves the number of objects, not perceived depth/quality.

For asteroids specifically:

- no gray polygon placeholders;
- no single rock repeated obviously at one size;
- near objects must have enough surface/shading detail;
- use multiple variants and rotate/scale them;
- distant fragments may be simpler because they occupy few pixels.

---

## 4. Composition contract

Every production World scene is composed using six visual depth groups.

### D0 — Deep void / sky

Darkest and slowest. Contains black space plus a quiet star texture.

### D1 — Nebula / galaxy volume

Large colorful forms with low-to-medium opacity. Must remain visibly structured,
not a uniform purple wash.

### D2 — Monumental landmark

One or two dominant off-center objects:

- planet / sun / moon;
- halo gate;
- fortress;
- glacier;
- giant tree;
- reactor;
- black hole;
- cathedral;
- dimensional crown.

### D3 — Environmental field

Several mid-depth objects:

- asteroids;
- islands;
- ruins;
- ice;
- roots;
- machinery;
- wrecks.

### D4 — Near foreground

Fewer but larger/faster objects, mostly near screen thirds/edges. These create
scale and flight.

### D5 — Atmosphere / events

Small stars, dust, sparks, snow, leaves, comet events, ship fly-bys and other
bounded accents.

The central word corridor receives lower density/opacity than the outer thirds.

---

## 5. Motion contract V2

Keep deterministic, time-formula-driven motion. Do not allocate random objects
inside the frame loop.

Supported layer motion should become explicit:

- `static`: almost fixed landmark with only subtle drift/pulse;
- `float`: sinusoidal cinematic drift;
- `wrap`: continuous environmental travel;
- `orbit`: fragments/ships orbit a landmark;
- `flyby`: sparse edge-to-edge object/ship motion with long cooldown;
- `approach`: object scales/translates through a depth cycle to create forward
  travel without teleporting;
- `rotate`: local rotation layered on any compatible motion.

Wrap/approach transitions must cross-fade or duplicate at boundaries so large
objects never visibly pop.

---

## 6. Galaxy production target

World 01 is the first acceptance gate and must communicate "deep dangerous
universe" before enemy art is drawn.

Required paused-frame content:

- black/deep navy space with a rich blue/violet/magenta nebula structure;
- dense but readable stars, including a small number of visibly brighter stars;
- one large detailed planet or celestial body off-center;
- at least one distant secondary body;
- asteroid field with three depth bands;
- at least 3 visibly different asteroid silhouettes among medium/near objects;
- many small far fragments;
- optional distant ship/wreck silhouette;
- no procedural polygon rocks;
- no debug-like speed lines.

Required motion:

- nebula drifts extremely slowly;
- stars have depth-separated motion/twinkle;
- far fragments move subtly;
- medium asteroids move clearly and rotate;
- near asteroid/fly-by objects move faster and occasionally pass near an edge;
- distant ship/wreck drifts slowly or appears as a rare fly-by;
- all movement remains smooth under normal frame-rate variance.

World 01–05 must not be five palette swaps:

- World 01: deep rainbow/nebula reach + asteroid depth;
- World 02: celestial halo/cloud/temple identity;
- World 03: prism/cosmic shards + colorful galaxy;
- World 04: luminous falls/cloud islands + celestial traffic;
- World 05: aurora gate + meteor/comet emphasis.

---

## 7. Other family production targets

Each family must receive the same curation discipline, not just Galaxy.

- Infernal: dark red sky, smoke volume, lava/fortress landmark, ember depth,
  fire-rock events.
- Frost: deep cold sky, broad aurora, detailed frozen body/spires, snow/crystal
  depth.
- Verdant: dark atmospheric sky, giant canopy/root silhouettes, spores/leaves,
  luminous organisms.
- Shadow: eclipse + black/purple atmosphere, broken silhouettes, void debris.
- Cosmic Forge: deep industrial cosmos, reactor/machinery landmarks, sparks,
  rotating structures, distant industrial craft.
- Abyss: true black void, high-quality vortex/black-hole only if source quality
  passes, cursed ruins/debris.
- Meteor/Aurora: strongest rock-field density, large-to-tiny asteroid scale,
  aurora/comet depth.
- Cathedral: monumental structure, astral depth, light shafts/dust, slow ships or
  sacred silhouettes only where thematically coherent.
- Eternity: combined cosmic/prism/void structure, dimensional rings/crown,
  late-game scale and restrained high-energy events.

---

## 8. Performance rules

Visual richness must come from composition and reuse, not unbounded work.

- cache decoded images;
- preload upcoming World assets at safe transitions;
- reuse image objects;
- keep static/slow fullscreen texture layers small in count;
- no per-frame image creation;
- no per-frame registry scans;
- deterministic instance descriptors are generated on scene identity change;
- quality settings reduce optional instance counts first;
- no full-canvas blur in the frame loop;
- prefer gradients, opacity and pre-authored texture over runtime blur;
- cull objects beyond wrap/fly-by bounds;
- keep central-corridor masks simple;
- measure frame time/FPS and input latency rather than enforcing arbitrary file
  byte limits.

Target remains stable 60 FPS in normal desktop combat.

---

## 9. Implementation roadmap

### EA00 — Research, visual audit and this plan

Acceptance:
- root causes recorded;
- visual target recorded;
- asset/license strategy recorded;
- plan committed before runtime changes.

### EA01 — Layer motion/instance contract V2

Extend layered-background types with explicit motion and deterministic repeat
metadata. Add validation/tests.

Acceptance:
- no behavior regression for old layer declarations;
- repeat counts are bounded;
- no per-frame random allocations.

### EA02 — Renderer V2

Implement deterministic repeated instances and motion paths.

Acceptance:
- one source asteroid can create a varied bounded field using scale/phase/
  rotation differences;
- large-object wrap has no hard pop;
- low/medium/high/ultra instance caps are explicit.

### EA03 — Galaxy star hierarchy

Replace "tiny dots only" with a bounded hierarchy:

- faint stars;
- normal stars;
- bright stars;
- rare 4-point glints;
- subtle twinkle.

No universal line-streak layer.

### EA04 — Galaxy asteroid replacement + field composition

Curate better asteroid sources where possible and recompose far/mid/near bands.
Existing rough meteor sprites may remain only for far/small use if they pass at
their displayed scale; they must not be the main near-camera art.

### EA05 — Galaxy narrative/environmental objects

Add licensed distant ship/wreck/structure silhouettes and rare fly-bys. Keep
these environmental; they must never be confused with active targets.

### EA06 — Galaxy World 01–05 authored variants

Give each Galaxy 01 World a genuinely different authored composition, landmark,
field density and motion mix.

### EA07 — Remaining family asset curation

Replace placeholder-looking custom SVGs family-by-family using the same quality
gate. Do not retain obsolete art merely because it already exists.

### EA08 — Readability + visual polish

- outer-third density bias;
- word-corridor suppression;
- opacity/depth tuning;
- no background object mistaken for active enemy;
- no IPA/Recall/UI overlap regression.

### EA09 — Performance and worst-case QA

Review:

- boss + particles + rich background;
- Recall mode;
- High/Ultra;
- resize/DPR;
- scene transitions;
- 3–5 minute continuous play for visible wrap repetition/pops.

### EA10 — Automated regression + docs

Tests cover:

- bounded instance counts;
- deterministic instance generation;
- all asset paths local;
- all 50 Worlds resolve;
- all variants differ in material composition data;
- no deprecated polygon asteroid path for Galaxy;
- no missing production assets.

### EA11 — Parent integration pin

After child CI succeeds, update the parent `games/space-typing` gitlink.

---

## 10. Definition of done

This pass is complete only when:

1. World 01 visually reads as deep, rich space in a paused screenshot;
2. large/mid/small asteroid depth is obvious;
3. near asteroid art no longer looks like rough placeholder chunks;
4. stars include visible hierarchy without debug-like lines;
5. Galaxy 01 Worlds are compositionally distinct;
6. at least one environmental narrative-object system exists;
7. each remaining family has a production-quality curation pass;
8. motion is smooth and does not visibly pop on wrap;
9. typing targets remain clearer than scenery;
10. no per-frame unbounded allocation/scan is introduced;
11. tests/build/CI pass;
12. docs/provenance match runtime;
13. parent repo pins the final child commit.

---

## 11. Self-review checklist before implementation

This plan was reviewed against the owner's visual request and the existing
runtime architecture.

Confirmed:

- it does not solve the issue by adding more procedural polygon art;
- it does not treat licensing as a visual-quality guarantee;
- it addresses both paused-frame beauty and motion quality;
- it includes asteroid quality, stars, galaxies, ships/wrecks/creatures and
  non-Galaxy Worlds;
- it preserves central typing readability;
- it avoids a second renderer;
- it uses deterministic bounded motion for performance;
- it removes/replaces superseded assets instead of accumulating dead files;
- it makes visual browser QA mandatory because unit tests cannot certify taste.

Implementation may replace a candidate asset whenever real-browser review shows
that it does not meet the quality bar, even if the candidate has a valid license.
