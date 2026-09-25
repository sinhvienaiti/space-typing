# Cinematic Background System — Spec & Implementation Plan

> Status: APPROVED FOR IMPLEMENTATION
>
> Created 2026-09-25 after owner visual review.
>
> This document supersedes the earlier "procedural abstract scene" direction for
> runtime background art. Existing World/scene registries remain useful metadata,
> but production rendering must now create a living cinematic environment with
> layered motion and a clear sense that the player's ship is moving through a
> real place.

---

## 1. Product intent

The background is not decoration behind the game. It is part of the feeling of
travel.

A player must be able to look at a screenshot or watch several seconds of play
and immediately understand the current environment without reading the World
name.

Examples:

- Galaxy / deep space must feel like flight through space: dense stars, nebulae,
  planets, vortexes, asteroids, comet streaks and strong depth motion.
- Heaven must feel like flying through a luminous celestial realm: cloud banks,
  halo gates, floating structures, light shafts and feather/light drift.
- Hell must feel dangerous and hot: lava, furnace silhouettes, smoke, ash,
  sparks and fire meteors.
- Meteor fields must feel like the ship is threading through moving debris.
- Frost must feel cold and alive: aurora, ice bodies, snow, crystal fragments and
  mist.
- Verdant maps must feel organic: huge silhouettes, drifting leaves/pollen,
  luminous spores and layered mist.
- Mechanical maps must feel industrial: reactors, rotating machinery, sparks and
  energy flows.
- Cathedral/final maps must feel monumental, sacred and late-game.

The target is a **living animated scene**, not a gradient with geometric
overlays.

---

## 2. Core visual principle

Every cinematic scene has five depth bands.

### Layer A — Far sky

The slowest layer.

Examples:

- star field;
- nebula;
- aurora;
- distant clouds;
- space haze;
- distant smoke.

Motion is subtle so the scene has scale.

### Layer B — Far landmarks

Large objects that define the place.

Examples:

- planet/moon;
- halo gate;
- demon fortress;
- glacier;
- giant tree;
- eclipse;
- reactor;
- black hole;
- cathedral;
- cosmic crown.

These move very slowly or only pulse/rotate.

### Layer C — Mid-space motion

Objects that make the player feel forward travel.

Examples:

- asteroid groups;
- cloud wisps;
- ice fragments;
- floating ruins;
- glowing leaves;
- debris;
- machinery pieces.

Motion speed is medium and uses parallax.

### Layer D — Near foreground motion

Fast low-opacity objects near the camera.

Examples:

- dust streaks;
- small debris;
- embers;
- snow;
- feathers;
- shards;
- sparks.

This layer is essential to create a sense of speed.

### Layer E — Flight cues

Subtle perspective motion aligned with the ship.

Examples:

- star streaks;
- light trails;
- converging dust motion;
- lane haze;
- warp-like streaks.

These must be sparse enough not to look like a grid or debug overlay.

---

## 3. Non-negotiable rules

1. Backgrounds must represent places, not abstract geometric compositions.
2. Motion must create parallax and forward-flight perception.
3. The central combat corridor must stay quieter than side/background regions.
4. Enemy labels, Recall prompts, boss telegraphs and projectiles always have
   stronger contrast than scenery.
5. Do not add 50 large fullscreen bitmap backgrounds.
6. Reuse the current World registry and World scene profile mapping.
7. Evolve the existing WorldSceneRenderer rather than creating a second parallel
   game-loop background renderer.
8. Static expensive layers remain cached.
9. Dynamic layers use deterministic generated objects, not unbounded per-frame
   allocations.
10. Low/Medium/High/Ultra change density/detail, not scene identity.
11. No persistence migration is required.
12. Hidden encounter environment overrides must continue selecting the correct
   visual world.
13. No universal perspective grid.
14. No repeated ellipse stacks as a generic depth substitute.
15. No full-width opaque color stripe behind active targets.

---

## 4. Cinematic motion model

### 4.1 Motion presets

The renderer supports the following canonical cinematic motions:

- `deep-flight`
  - many depth-separated stars;
  - subtle forward star expansion/streak;
  - slow nebula drift.

- `cloud-drift`
  - soft lateral/vertical cloud motion;
  - foreground wisps move faster than distant clouds.

- `orbital-swirl`
  - rotating vortex/ring motion;
  - slow orbital fragments.

- `asteroid-flow`
  - multiple size/depth asteroid layers;
  - objects drift diagonally toward/outward from the player;
  - large rocks move slowly, small rocks move faster.

- `meteor-storm`
  - occasional high-speed streaks;
  - lower-frequency dramatic event layer.

- `ember-rise`
  - rising sparks/embers;
  - smoke drift;
  - intermittent fire streak.

- `snow-flight`
  - near snow passes quickly;
  - far snow drifts slowly;
  - crystal fragments rotate.

- `aurora-wave`
  - broad slow-moving aurora ribbons;
  - subtle color pulse.

- `organic-drift`
  - leaves/pollen/fireflies;
  - soft oscillation and wind drift.

- `void-drift`
  - dark fragments;
  - slow fog;
  - occasional inward pull toward eclipse/void core.

- `reactor-motion`
  - rotating rings;
  - moving energy pulses;
  - spark ejection.

- `sacred-drift`
  - slow astral dust;
  - light-shaft shimmer;
  - very slow architecture parallax.

### 4.2 Parallax speed bands

Use normalized depth bands:

- far: 0.15–0.30
- far-mid: 0.30–0.50
- mid: 0.50–0.75
- near: 0.75–1.10
- streak/event: 1.20–2.20

The exact speed is multiplied by the current scene motion intensity.

### 4.3 Forward-flight illusion

The ship itself remains anchored near the bottom of the canvas. Background motion
must imply travel.

Use a combination of:

- stars expanding gently from a vanishing zone;
- foreground particles passing faster than far particles;
- mid objects translating with depth;
- occasional fast streaks;
- slow large landmark movement;
- no camera shake for normal travel.

---

## 5. Scene families and required motion

### Family 01 — Galaxy / Deep Space / Rainbow Reach

Visual identity:

- dense multi-depth star field;
- colorful nebula;
- one large off-center planet/halo;
- visible spiral/vortex;
- asteroid clusters;
- occasional comet/meteor streak;
- cosmic dust.

Required motion:

- `deep-flight`;
- `orbital-swirl`;
- `asteroid-flow`;
- low-frequency `meteor-storm`.

World variants:

1. Rainbow Reach
   - rainbow nebula;
   - cyan/violet/pink/gold dust;
   - large spiral galaxy.
2. Halo Garden
   - halo planet/rings;
   - celestial rock islands.
3. Prismatic Tide
   - crystal-like cosmic shards;
   - prismatic nebula.
4. Cherub Falls
   - bright light trails/cloud wisps;
   - small feather-like motes.
5. Aurora Gate
   - aurora bands;
   - portal/gate-like celestial structure.

### Family 02 — Heaven / Celestial

Visual identity:

- luminous clouds;
- halo gates;
- floating temples/islands;
- light shafts;
- soft gold/cyan highlights;
- feathers and motes.

Required motion:

- `cloud-drift`;
- `sacred-drift`;
- subtle `deep-flight`.

### Family 03 — Hell / Infernal

Visual identity:

- lava horizon;
- furnace/demon silhouettes;
- smoke;
- embers;
- ash;
- fire meteors.

Required motion:

- `ember-rise`;
- `meteor-storm`;
- slow smoke drift;
- lava pulse.

### Family 04 — Meteor / Asteroid Field

Visual identity:

- many rocks across several depth bands;
- large distant asteroid bodies;
- near small fragments;
- comet trails;
- collision dust.

Required motion:

- `asteroid-flow`;
- `meteor-storm`;
- `deep-flight`.

### Family 05 — Frost / Ice

Visual identity:

- aurora;
- frozen celestial bodies;
- ice spires;
- snow;
- crystal shards;
- cold mist.

Required motion:

- `snow-flight`;
- `aurora-wave`;
- slow crystal rotation.

### Family 06 — Verdant / Nature

Visual identity:

- huge tree/canopy silhouettes;
- floating roots/islands;
- spores;
- leaves;
- pollen;
- glowing organisms.

Required motion:

- `organic-drift`;
- cloud/mist drift;
- subtle branch/canopy parallax.

### Family 07 — Shadow / Void Nature

Visual identity:

- eclipse;
- black/purple mist;
- shadow vegetation;
- void shards;
- broken pillars.

Required motion:

- `void-drift`;
- low-frequency inward particle pull;
- slow eclipse pulse.

### Family 08 — Cosmic Forge / Mechanical

Visual identity:

- machinery;
- reactor rings;
- energy conduits;
- towers;
- sparks;
- rotating mechanical structures.

Required motion:

- `reactor-motion`;
- spark flow;
- mid-depth machinery parallax.

### Family 09 — Abyss / Void

Visual identity:

- black hole / void core;
- ruined structures;
- cursed orbit debris;
- dark dust;
- dim red/purple energy.

Required motion:

- `void-drift`;
- `orbital-swirl`;
- slow inward fragment motion.

### Family 10 — Sacred Cathedral / Eternity / Final

Visual identity:

- giant arches/columns;
- astral windows/light;
- dimensional crown/rings;
- layered cosmic structure;
- final-world scale.

Required motion:

- `sacred-drift`;
- `orbital-swirl`;
- restrained `deep-flight`.

---

## 6. World-to-family mapping

The existing ten Galaxy groups remain authoritative:

- Galaxy 01: celestial/galaxy hybrid
- Galaxy 02: infernal
- Galaxy 03: frost
- Galaxy 04: verdant
- Galaxy 05: shadow/void nature
- Galaxy 06: cosmic forge
- Galaxy 07: abyssal
- Galaxy 08: meteor/aurora/cosmic
- Galaxy 09: sacred void cathedral
- Galaxy 10: eternity/final

The five Worlds inside a Galaxy retain deterministic variants. Variants must
change more than color: at least one landmark, one dynamic object family and one
motion/detail parameter must differ.

---

## 7. Runtime data model

Extend `WorldSceneProfile` with cinematic fields:

- primaryMotion;
- secondaryMotion;
- flightIntensity;
- starDensity;
- midObjectDensity;
- foregroundDensity;
- eventFrequency;
- vortexStrength;
- asteroidDensity;
- cloudDensity.

Do not create a duplicate profile registry.

### Quality budget

Extend `WorldSceneQualityBudget` with bounded dynamic capacities:

- farStars;
- nearStars;
- midObjects;
- foregroundObjects;
- eventObjects.

Suggested caps:

Low:
- farStars: 70
- nearStars: 12
- midObjects: 5
- foregroundObjects: 8
- eventObjects: 1

Medium:
- farStars: 110
- nearStars: 18
- midObjects: 7
- foregroundObjects: 12
- eventObjects: 1

High:
- farStars: 155
- nearStars: 26
- midObjects: 10
- foregroundObjects: 16
- eventObjects: 2

Ultra:
- farStars: 210
- nearStars: 34
- midObjects: 13
- foregroundObjects: 22
- eventObjects: 2

These are background-only caps and remain lower priority than combat effects.

---

## 8. Runtime implementation architecture

Keep `WorldSceneRenderer` as the single runtime background renderer.

Add deterministic cinematic object pools generated from:

- scene seed;
- scene family;
- variant;
- visual quality.

Pools are regenerated only when the cache/runtime identity changes:

- World;
- size bucket where needed;
- DPR;
- quality.

Dynamic objects update by formula from `time`; do not mutate hundreds of object
positions every frame when a deterministic formula is enough.

Renderer order:

1. cached static sky;
2. cached far landmarks;
3. dynamic far star field;
4. dynamic cinematic mid objects;
5. dynamic atmosphere;
6. flight cues;
7. foreground particles/vignette.

---

## 9. Implementation tasks

### CB00 — Commit this spec

Acceptance:
- document exists on child main before runtime code commits.

### CB01 — Extend scene contracts

Files:
- src/worlds/scene-types.ts
- src/worlds/scene-registry.ts
- tests/world-scenes.test.ts

Work:
- add cinematic motion ids;
- add density/intensity parameters;
- extend quality budgets;
- define per-Galaxy motion defaults and five World-local variations.

Acceptance:
- all 50 Worlds validate;
- no duplicate registry;
- deterministic values;
- tests cover bounds.

### CB02 — Cinematic object generation

File:
- src/worlds/scene-renderer.ts

Work:
- deterministic far star pool;
- near star/streak pool;
- mid-object descriptors;
- foreground object descriptors;
- event descriptors;
- no per-frame random allocation.

Acceptance:
- pools bounded by quality;
- generated from scene seed;
- no persistence changes.

### CB03 — Galaxy/deep-space animation

Work:
- dense depth-separated stars;
- spiral/vortex;
- nebula drift;
- asteroid flow;
- comet/meteor event;
- forward-flight star motion.

Acceptance:
- World 01 clearly feels like moving through space;
- screenshot and short play sequence no longer resemble a static gradient.

### CB04 — Heaven/celestial animation

Work:
- moving cloud clusters;
- halo/light pulse;
- floating structures;
- feather/light drift;
- slow celestial parallax.

### CB05 — Infernal animation

Work:
- smoke drift;
- rising embers;
- lava pulse;
- fire meteor streak;
- fortress parallax.

### CB06 — Frost + asteroid animation

Work:
- aurora wave;
- multi-speed snow;
- rotating ice shards;
- multi-depth asteroid flow;
- comet streaks.

### CB07 — Nature + shadow animation

Work:
- leaves/pollen/spores;
- floating canopy/root parallax;
- shadow fog;
- void shard drift;
- eclipse pulse.

### CB08 — Forge + abyss animation

Work:
- reactor rotation;
- energy pulses;
- sparks;
- machinery parallax;
- orbital void debris;
- black-hole pull cue.

### CB09 — Cathedral + eternity animation

Work:
- astral dust;
- light-shaft shimmer;
- monumental parallax;
- dimensional ring rotation;
- final-scene cosmic drift.

### CB10 — Combat readability pass

Rules:
- central target corridor receives reduced opacity/detail;
- fast foreground objects avoid crossing word labels at high opacity;
- event streaks use outer screen bands where possible;
- Recall UI remains readable.

### CB11 — QA and performance

Automated:
- registry/tests;
- TypeScript;
- production build.

Browser review:
- World 01;
- World 06;
- World 11;
- World 16;
- World 26;
- World 36;
- World 41;
- World 46.

### CB12 — Docs + parent pin

Work:
- update existing World background plan and project context;
- mark cinematic system production-active;
- update parent `games/space-typing` gitlink.

---

## 10. World 01 acceptance target

World 01 is the first mandatory visual acceptance case.

Within 3–5 seconds of motion the player must see:

- many far stars;
- several faster near stars;
- one large off-center cosmic body;
- a visible spiral/vortex;
- multiple asteroid/debris objects crossing at different speeds;
- at least occasional comet/meteor streak;
- nebula motion;
- clear forward-flight perception.

It must not look like:

- a color gradient;
- a static wallpaper;
- a grid;
- a collection of ellipse outlines;
- a few floating particles.

---

## 11. Performance rules

- static sky/landmarks remain cached;
- dynamic object arrays are bounded and deterministic;
- no image decoding during combat;
- no per-frame registry lookup;
- no full-canvas blur each frame;
- no unbounded path construction;
- use simple Canvas primitives and gradients;
- quality reductions lower counts first, not scene identity;
- background workload yields to adaptive render resolution.

---

## 12. Definition of done

The cinematic background upgrade is complete when:

1. all 50 Worlds keep deterministic scene profiles;
2. every profile has cinematic motion/density parameters;
3. Galaxy maps visibly contain stars/nebula/space objects and forward motion;
4. Hell/Heaven/Frost/Nature/Forge/Void/Cathedral/Final scenes have distinctive
   animated environmental objects;
5. parallax exists across at least far/mid/near layers;
6. event motion exists where appropriate;
7. combat readability remains intact;
8. quality budgets are bounded;
9. tests and build pass;
10. source-of-truth docs are updated;
11. parent repo pins the final child commit.


---

## 13. Implementation checkpoint — 2026-09-25

The first production cinematic pass is implemented on child `main`.

Implemented contracts:

- `WorldSceneProfile` now includes cinematic motion ids and explicit densities /
  intensities for flight, stars, mid objects, foreground objects, events,
  vortexes, asteroids and clouds;
- all 50 existing Worlds receive deterministic cinematic parameters through the
  existing scene registry;
- there is no duplicate cinematic registry.

Implemented motion/runtime layers:

- dense far-star forward flight;
- faster near-star streaks;
- slow twinkling seeded stars;
- animated galaxy/void vortexes;
- moving side cloud/nebula wisps;
- multi-depth rotating asteroid/debris flow;
- animated aurora ribbons;
- rotating reactor-ring motion;
- bounded comet/meteor/travel events;
- themed foreground particles that reuse World particle identity:
  feathers/light, embers/sparks, snow/dust, leaves/pollen, shards/debris,
  astral motes and mechanical sparks.

World 01 / Galaxy behavior now specifically combines:

- high star density;
- deep-flight motion;
- visible spiral/vortex;
- asteroid flow;
- moving nebula/cloud atmosphere;
- fast near-star streaks;
- bounded travel/comet events.

Performance behavior:

- static sky and landmark layers remain cached;
- dynamic counts come from quality budgets;
- far/near/mid/foreground/event counts have hard caps;
- dynamic positions are deterministic functions of scene seed + time;
- no random object allocation or World-registry scanning is added to the frame
  loop;
- the existing adaptive render-resolution path remains authoritative.

Quality caps now include:

| Quality | Far stars | Near stars | Mid objects | Foreground | Events |
| --- | ---: | ---: | ---: | ---: | ---: |
| Low | 70 | 12 | 5 | 8 | 1 |
| Medium | 110 | 18 | 7 | 12 | 1 |
| High | 155 | 26 | 10 | 16 | 2 |
| Ultra | 210 | 34 | 13 | 22 | 2 |

Automated tests now validate cinematic motion identities, deterministic profile
coverage and bounded quality budgets.

Browser screenshot/video review remains a required perceptual QA step. CI can
prove TypeScript/build/test correctness but cannot certify that motion speed,
scene beauty or composition is visually final on the owner's display.


---

## 14. Authored asset integration — 2026-09-26

The cinematic system now uses the layered authored-asset architecture defined in
`docs/LAYERED_BACKGROUND_ASSET_SYSTEM_PLAN.md`.

Important production rule:

- procedural stars/dust/events are support FX;
- authored sky/landmark/midground assets provide the primary scenic identity.

`WorldSceneRenderer` now composes local authored imagery with the existing
bounded cinematic motion layer. The universal perspective-floor overlay is
suppressed once authored imagery is available.

This resolves the previous failure mode where motion existed but the frame still
looked like abstract lines on a gradient.
