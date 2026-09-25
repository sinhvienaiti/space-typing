# World Background Scene System — Spec & Implementation Plan

> Status: APPROVED FOR IMPLEMENTATION
>
> Source of truth for the background-scene upgrade requested on 2026-09-25.
> This plan extends the M07 World Engine visual contract. M07 remains authoritative
> for World/stage mapping; this document is authoritative for how each World is
> presented as a distinct combat environment.
>
> Implementation checkpoint (2026-09-25): BG00-BG11 are code/documentation
> complete on child main. BG12 is the external parent gitlink pin and is verified
> in sinhvienaiti/typing-game rather than by changing this child plan again.

---

## 1. Problem statement

The current production background is technically World-aware, but visually it is
still one generic composition:

- radial gradient;
- stars;
- haze;
- one perspective grid.

Each World changes palette/intensity values, but the scene structure stays the
same. As a result, Heaven, Hell, Frost, Meteor, Void, Nature and mechanical Worlds
do not read as different places.

This is not a hidden setting problem. It is an implementation gap.

The new system must make the current World recognizable from its environment,
not only from UI text or recoloring.

---

## 2. Product goal

Turn the background layer into a real **World Scene System**.

A World scene must communicate identity through a combination of:

- sky / nebula composition;
- major landmarks;
- far and mid silhouettes;
- floor / travel-lane language;
- atmosphere / haze;
- thematic ambient particles;
- light treatment;
- restrained parallax/motion.

Examples:

- Heaven -> halo gates, luminous clouds, temple/bridge silhouettes, feathers;
- Hell -> lava rifts, furnace/cathedral silhouettes, embers, heat haze;
- Frost -> aurora, ice spires, frozen plane, snow/crystal dust;
- Meteor / cosmic -> planets, asteroid belts, comet trails, deep nebula;
- Nature -> luminous trees, roots, pollen/leaves, organic paths;
- Shadow / Void -> eclipse, broken pillars, void rifts, drifting shards;
- Cosmic Forge -> reactor rings, machinery towers, sparks, energy lanes;
- Sacred/Void Cathedral -> arches, columns, light aisle, astral dust;
- Final/Eternity -> combined crown/prism/void/celestial language.

---

## 3. Non-negotiable rules

1. **Do not implement this as 50 large bitmap backgrounds.**
   Use Canvas procedural/vector scenery and caching.

2. **Do not replace the canonical World registry.**
   The 50 existing Worlds and 20-stage mapping remain authoritative.

3. **Do not create a second game-loop renderer.**
   The scene renderer is called by the existing Game Canvas draw path.

4. **Do not scan World registries every frame.**
   Scene/profile resolution happens on stage/world change.

5. **Static scenery must be cached.**
   Expensive static geometry/gradients are rebuilt only when World, dimensions,
   DPR or quality changes.

6. **Animated scenery must be bounded.**
   Ambient particle counts are quality-dependent and have explicit caps.

7. **Typing readability wins over decoration.**
   Background contrast stays below combat targets, Recall UI, boss telegraphs and
   player/enemy projectiles.

8. **Visual quality changes detail, not theme.**
   Low/Medium/High/Ultra all show the correct World identity.

9. **No persistence migration.**
   Scene identity is deterministic from the current World.

10. **Existing hidden encounter environment overrides continue to work.**

---

## 4. Architecture

### 4.1 Scene profile

Create a dedicated scene contract containing:

- World id;
- scene archetype;
- World-local variant (1-5);
- landmark style;
- floor style;
- ambient particle style;
- motion profile;
- deterministic scene seed;
- landmark/detail intensity;
- horizon position.

The existing M07 environment profile remains the color source:

- backgroundCore;
- backgroundMid;
- backgroundEdge;
- starRgb;
- gridRgb;
- hazeRgb;
- gridIntensity;
- hazeIntensity;
- starDrift.

The scene profile decides **what** to draw.
The environment profile decides the World-specific palette.

### 4.2 Scene archetypes

Ten canonical scene archetypes correspond to the ten current Galaxy groups:

1. celestial-rainbow
2. infernal
3. frost-prism
4. verdant
5. shadow-nature
6. cosmic-forge
7. abyssal
8. aurora-cosmic
9. void-cathedral
10. eternity

Each of the five Worlds inside a Galaxy receives a deterministic variant so that
the same Galaxy does not look like five copies of one scene.

### 4.3 Scene renderer layers

The renderer owns five conceptual layers:

1. **Sky**
   - gradient;
   - nebula/light bloom;
   - planet/eclipses/aurora where appropriate.

2. **Far landmarks**
   - gates;
   - mountains/spires;
   - fortress;
   - trees;
   - reactor towers;
   - cathedral arches;
   - asteroid silhouettes.

3. **Mid decoration**
   - halo rings;
   - crystals;
   - machinery;
   - floating rocks;
   - roots;
   - broken pillars.

4. **Floor / lane**
   - halo bridge;
   - lava rift;
   - ice plane;
   - organic root path;
   - void rift;
   - reactor lane;
   - asteroid/comet lane;
   - cathedral aisle;
   - infinity/crown lane.

5. **Dynamic atmosphere**
   - stars;
   - feathers;
   - embers;
   - snow;
   - pollen/leaves;
   - void shards;
   - sparks;
   - comet dust;
   - astral motes.

### 4.4 Static cache

A scene cache key must include:

- scene profile id;
- width;
- height;
- effective DPR;
- visual quality.

Static sky/landmarks are rendered once into an offscreen HTML canvas when
available.

The cache is invalidated on:

- World change;
- canvas resize;
- adaptive DPR change;
- visual-quality change.

Dynamic stars, floor motion and ambient particles stay outside the static cache.

---

## 5. World-to-scene design matrix

### Galaxy 01 — Celestial / Rainbow

Worlds:
- Rainbow Reach
- Halo Garden
- Prismatic Tide
- Cherub Falls
- Aurora Gate

Visual language:
- rainbow nebula;
- halo rings;
- luminous cloud/temple silhouettes;
- prism fragments;
- celestial bridge/light lane;
- feather/light motes.

### Galaxy 02 — Infernal

Worlds:
- Ember Orchard
- Imp Furnace
- Scarlet Halo
- Cinder Cathedral
- Demon Crown

Visual language:
- red/black sky;
- lava horizon;
- furnace towers;
- demon fortress/cathedral shapes;
- ember rain;
- cracked lava lane.

### Galaxy 03 — Frost / Prism

Worlds:
- Snowglass Bay
- Crystal Drift
- Frozen Prism
- Glacier Choir
- Winter Oracle

Visual language:
- aurora ribbons;
- ice spires;
- crystal moons;
- frozen plane;
- snow/crystal motes.

### Galaxy 04 — Verdant

Worlds:
- Leaflight Meadow
- Bloom Circuit
- Verdant Halo
- Pollen Crown
- Ancient Grove

Visual language:
- luminous canopy;
- huge tree silhouettes;
- root bridges;
- pollen/leaves;
- organic light paths.

### Galaxy 05 — Shadow / Eclipse

Worlds:
- Twilight Fen
- Umbra Garden
- Nightglass
- Eclipse Hollow
- Shadow Crown

Visual language:
- eclipse;
- purple/black fog;
- thorn silhouettes;
- broken dark pillars;
- void/shadow lane;
- drifting shadow shards.

### Galaxy 06 — Cosmic Forge

Worlds:
- Starforge Port
- Nebula Works
- Prism Reactor
- Nova Foundry
- Cosmic Engine

Visual language:
- industrial space structures;
- reactor rings;
- machinery towers;
- sparks;
- energy-panel lane.

### Galaxy 07 — Abyssal

Worlds:
- Abyss Choir
- Cursed Orbit
- Infernal Veil
- Black Halo
- Void Chapel

Visual language:
- black-hole/void core;
- broken cathedral architecture;
- cursed orbit fragments;
- dark-red/purple rifts;
- abyssal dust.

### Galaxy 08 — Aurora / Meteor / Cosmic

Worlds:
- Aurora Nexus
- Comet Glacier
- Starlit Tundra
- Frozen Cosmos
- Polar Singularity

Visual language:
- strong aurora;
- asteroid belt;
- comet trails;
- frozen celestial bodies;
- meteor lane.

### Galaxy 09 — Sacred Void Cathedral

Worlds:
- Silent Basilica
- Seraph Eclipse
- Astral Crypt
- Void Sanctuary
- Eventide Throne

Visual language:
- cathedral arches;
- tall pillars;
- stained/astral light;
- eclipse/holy contrast;
- luminous central aisle.

### Galaxy 10 — Eternity / Final Crown

Worlds:
- Eternity Prism
- Celestial Abyss
- Chaos Aurora
- Infinity Choir
- Cosmic Crown

Visual language:
- combined prism/celestial/void vocabulary;
- large crown/ring silhouettes;
- dimensional storm;
- infinity lane;
- final-game scale without covering gameplay.

---

## 6. Quality budgets

The scene system must derive its moving-detail budget from Visual Quality.

### Low
- static identity remains intact;
- minimal ambient particles;
- simplest floor animation;
- no extra bloom passes.

### Medium
- moderate particles;
- standard parallax detail.

### High
- richer atmospheric layer;
- additional landmark accents;
- smoother dynamic detail.

### Ultra
- highest bounded particle/detail count;
- no gameplay behavior difference;
- no unbounded full-screen blur.

Suggested scene-ambient caps:

- Low: 8
- Medium: 14
- High: 20
- Ultra: 28

These are scene-only procedural elements, separate from combat particles.

---

## 7. Implementation tasks

Each task is a reviewable checkpoint. A task is not complete until its acceptance
criteria and relevant tests/build checks pass.

### BG00 — Spec and baseline audit

**Goal**

Record the approved architecture and current implementation gap before code work.

**Files**

- docs/WORLD_BACKGROUND_SCENE_SYSTEM_PLAN.md

**Acceptance**

- plan is committed to child main before implementation commits;
- no runtime behavior changes in this checkpoint.

---

### BG01 — Scene type system and 50-World registry

**Goal**

Create the canonical WorldSceneProfile layer without touching combat behavior.

**Files**

- src/worlds/scene-types.ts
- src/worlds/scene-registry.ts
- tests/world-scenes.test.ts

**Work**

- define 10 archetypes;
- define landmark/floor/particle/motion contracts;
- create one scene profile for every existing World;
- keep five deterministic variants per Galaxy;
- expose sceneProfileForWorld(...);
- validate every scene profile.

**Acceptance**

- exactly 50 scene profiles;
- every World resolves one profile;
- all ten archetypes are represented;
- each Galaxy has five variant values;
- all style ids are non-empty/valid;
- no persistence changes.

---

### BG02 — Static scene cache and renderer foundation

**Goal**

Add one reusable Canvas scene renderer with static caching.

**Files**

- src/worlds/scene-renderer.ts
- tests/world-scene-renderer.test.ts where practical

**Work**

- cache static sky/landmark layers;
- deterministic seeded decoration;
- graceful no-DOM fallback for tests;
- bounded quality-dependent dynamic budget;
- expose invalidate/destroy/draw API.

**Acceptance**

- static scene cache is not recreated each frame;
- cache key changes on scene/size/DPR/quality;
- dynamic layer does not allocate an unbounded object list;
- renderer accepts existing M07 environment colors.

---

### BG03 — Celestial / Rainbow scene family

**Goal**

Make Galaxy 01 visually read as celestial/heaven/prism instead of generic grid.

**Work**

- rainbow nebula;
- halo gates/rings;
- temple/cloud silhouettes;
- prism accents;
- halo/light bridge floor;
- feather/light motes;
- five visible World variants.

**Acceptance**

- all five Galaxy 01 Worlds have distinct composition variants;
- no generic perspective-grid-only presentation remains.

---

### BG04 — Infernal scene family

**Goal**

Create Hell/infernal identity for Galaxy 02.

**Work**

- lava horizon;
- furnace/cathedral silhouettes;
- demon crown/spires;
- ember atmosphere;
- cracked lava lane;
- heat-style motion without expensive full-screen blur.

**Acceptance**

- clearly distinguishable from celestial/frost scenes;
- embers remain behind typing targets.

---

### BG05 — Frost + Verdant scene families

**Goal**

Implement Galaxies 03 and 04.

**Frost**

- aurora;
- ice spires/crystals;
- frozen plane;
- snow/crystal dust.

**Verdant**

- luminous tree silhouettes;
- organic root path;
- bloom/leaf/pollen atmosphere.

**Acceptance**

- Frost and Verdant use different landmark and floor languages;
- both preserve target readability.

---

### BG06 — Shadow + Cosmic Forge scene families

**Goal**

Implement Galaxies 05 and 06.

**Shadow**

- eclipse;
- dark pillars/thorns;
- void/shadow lane;
- drifting shards.

**Cosmic Forge**

- reactor rings;
- machinery towers;
- energy-panel floor;
- sparks.

**Acceptance**

- Shadow reads organic/void;
- Forge reads mechanical/industrial;
- no shared generic grid dominates both.

---

### BG07 — Abyssal + Aurora/Meteor scene families

**Goal**

Implement Galaxies 07 and 08.

**Abyssal**

- void core;
- ruined chapel/cathedral geometry;
- cursed orbit fragments;
- abyss dust.

**Aurora/Meteor**

- aurora;
- asteroid belt;
- comet/meteor streaks;
- polar/frozen celestial silhouettes.

**Acceptance**

- meteor/asteroid identity is obvious in Galaxy 08;
- Abyssal is distinct from Galaxy 05 Shadow.

---

### BG08 — Sacred Cathedral + Eternity scene families

**Goal**

Implement Galaxies 09 and 10.

**Sacred/Void Cathedral**

- arches;
- pillars;
- central light aisle;
- astral motes.

**Eternity**

- prism/crown/void combination;
- large dimensional rings;
- infinity/crown floor;
- final-campaign scale.

**Acceptance**

- late-game scenes are visually richer but do not obscure combat;
- Galaxy 10 does not simply recolor Galaxy 09.

---

### BG09 — Game runtime integration

**Goal**

Replace the old gradient+generic-grid background path with WorldSceneRenderer.

**Files**

- src/Game.ts

**Work**

- resolve scene profile at stage start using the same environment-stage override;
- invalidate cache on World change;
- invalidate on resize/adaptive DPR/quality changes;
- retain existing star data as one dynamic layer;
- remove obsolete backgroundGradient path;
- keep hidden encounter environment override behavior.

**Acceptance**

- Stage 001-020 use World 01 scene;
- Stage 021 switches to World 02 scene;
- World changes do not require reload;
- adaptive resolution remains functional;
- no new per-frame registry lookup.

---

### BG10 — Automated regression coverage

**Goal**

Prove registry completeness and runtime contracts.

**Tests**

- all 50 Worlds resolve scenes;
- all ten archetypes represented;
- five variants per Galaxy;
- deterministic scene seeds;
- quality budgets bounded;
- M07 environment validation still passes;
- existing World mapping tests remain green.

**Acceptance**

- test suite passes;
- TypeScript passes;
- production build passes.

---

### BG11 — Documentation/source-of-truth update

**Goal**

Remove the old implication that M07 backgrounds are merely palette/grid profiles.

**Files**

- docs/M07_WORLD_ENGINE.md
- docs/PROJECT_CONTEXT.md
- docs/WORLD_BACKGROUND_SCENE_SYSTEM_PLAN.md

**Work**

- document scene system as the current visual contract;
- mark BG00-BG10 implementation state;
- document cache/performance behavior;
- explicitly state there is no hidden “enable backgrounds” setting.

**Acceptance**

- docs match production code;
- no fake/unconsumed background config is documented.

---

### BG12 — Parent integration pin

**Goal**

Make the canonical parent ./dev.sh workflow receive the completed child build.

**Work**

- update games/space-typing gitlink in sinhvienaiti/typing-game;
- do not change unrelated child gitlinks.

**Acceptance**

- parent main points at the final child commit;
- user can obtain it through:
  cd /Users/jokerit/htdocs/typing-game
  ./dev.sh

---

## 8. QA checklist

Automated validation cannot judge final visual taste. After implementation,
targeted real-browser checks should cover at least:

- World 01 celestial identity;
- World 06 infernal identity;
- World 11 frost identity;
- World 16 verdant identity;
- World 21 shadow identity;
- World 26 forge identity;
- World 31 abyss identity;
- World 36 meteor/aurora identity;
- World 41 cathedral identity;
- World 46 eternity identity;
- Recall target readability over every scene family;
- boss telegraph readability;
- High and Ultra frame stability on the owner's MacBook.

Any visual issue found after this pass is a normal polish/regression item; it must
not be hidden by claiming CI can judge appearance.

---

## 9. Definition of done

The background upgrade is complete when:

1. all 50 Worlds resolve a real WorldSceneProfile;
2. ten scene archetypes exist and are visually distinct;
3. each Galaxy's five Worlds have deterministic composition variants;
4. Heaven/Hell/Frost/Meteor/Nature/Void/Forge/Cathedral/Final maps are visibly
   recognizable without reading the World name;
5. the old generic perspective grid is no longer the universal scene;
6. static scenery is cached;
7. dynamic scenery is bounded by quality;
8. no persistence schema changes are introduced;
9. hidden environment overrides still work;
10. automated tests, TypeScript and production build pass;
11. source-of-truth docs are updated;
12. parent typing-game pins the final child commit.


---

## 10. Implementation checkpoint — 2026-09-25

Implemented child runtime:

- `src/worlds/scene-types.ts` defines the scene contracts;
- `src/worlds/scene-registry.ts` resolves all 50 Worlds into ten archetypes and
  five deterministic variants per Galaxy;
- `src/worlds/scene-renderer.ts` owns cached static scenery plus bounded dynamic
  stars, themed floors and ambient particles;
- per-World landmark/floor/particle style ids are consumed by runtime signatures,
  not stored as unused config;
- `src/Game.ts` resolves the scene only on environment/World changes and
  invalidates the static cache on World/size/DPR/quality changes;
- the old universal gradient + perspective-grid draw path has been removed;
- hidden encounter environment-stage overrides continue to select both the
  environment palette and scene;
- Low/Medium/High/Ultra keep the same scene identity with bounded detail budgets.

Implemented visual families:

- BG03 celestial/rainbow/heaven;
- BG04 infernal/hell;
- BG05 frost/prism + verdant/nature;
- BG06 shadow/eclipsed nature + cosmic forge;
- BG07 abyssal + aurora/meteor/cosmic;
- BG08 sacred void cathedral + eternity/final crown.

Automated coverage:

- all 50 Worlds resolve scene profiles;
- all ten archetypes are covered;
- each Galaxy resolves variants 1-5;
- scene seeds and style contracts are deterministic;
- scene detail budgets are bounded;
- static cache identity reacts to World/size/DPR/quality;
- existing M07 World/environment tests remain in the normal suite.

Perceptual quality remains a real-browser review item. CI can validate contracts,
TypeScript and build behavior, but it cannot certify that a particular backdrop
looks beautiful enough on the owner's display. Follow-up visual tuning should
reuse this scene system rather than reintroducing a parallel background path.


---

## BG13 — Visual richness corrective pass

**Reason**

Real-browser review of World 01 showed that the first implementation was
structurally correct but visually too conservative. The scene still read as the
old dark teal background with a few new thin rings/lines. The renderer therefore
met the registry/cache contract but did not yet meet the product goal that a
player should immediately recognize Heaven/Galaxy/Hell/Frost/Meteor/etc. from
the scene itself.

**Goal**

Move the scene renderer from "themed line overlay" to a clearly authored
background composition while preserving the existing cache/performance
architecture.

**Required changes**

1. Add scene-family sky palettes independent from the legacy M07 base palette.
   The legacy environment palette remains useful for World accent/star/haze, but
   it must no longer dominate the whole canvas.

2. Add strong filled background masses, not only strokes:
   - celestial: multicolor nebula/rainbow aurora + luminous cloud horizon;
   - infernal: lava horizon + red/orange atmospheric glow;
   - frost: deep blue sky + broad aurora + ice mass;
   - verdant: forest/canopy silhouettes + green luminous horizon;
   - shadow: eclipse + dark fog banks;
   - forge: machinery/reactor mass + industrial light;
   - abyss: black-hole/void mass + ruined structures;
   - aurora/meteor: comet/asteroid field + aurora;
   - cathedral: large architectural silhouette + sacred light;
   - eternity: dimensional/crown/prism composition.

3. Increase landmark scale/opacity where necessary. Major scenery must be
   visible on a normal desktop screenshot without needing zoom.

4. Reduce reliance on thin repeated floor rings. Floor treatment should support
   the scene rather than become the main visible change.

5. Keep combat readability:
   - no bright scenery directly behind active word labels at high opacity;
   - target/Recall/boss telegraphs retain stronger contrast than scenery.

6. Keep static work cached. Do not add heavy full-screen work every frame.

**World 01 acceptance screenshot**

Stage 001-020 / Rainbow Reach must no longer look like the old teal grid.
Without reading the World name, the scene should visibly show:
- celestial/rainbow sky color separation;
- large luminous celestial landmark/halo;
- cloud/nebula mass;
- a light-lane/bridge depth cue;
- stars/ambient light only as supporting detail.

**Cross-family acceptance**

At minimum these representative Worlds must be visually distinguishable from a
single screenshot:
- World 01 celestial;
- World 06 infernal;
- World 11 frost;
- World 16 verdant;
- World 26 forge;
- World 36 meteor/aurora;
- World 41 cathedral;
- World 46 eternity.

**Validation**

- existing World scene registry tests stay green;
- TypeScript/build pass;
- no new persistence state;
- static cache contract remains intact;
- parent submodule pin is updated after child CI passes.
