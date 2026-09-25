# Layered Background Asset System — Spec & Implementation Plan

> Status: IMPLEMENTED — FIRST AUTHORED ASSET PASS
>
> Created 2026-09-26 after owner review of the first cinematic/procedural pass.
>
> This document is authoritative for authored background imagery and layered
> parallax composition. `CINEMATIC_BACKGROUND_SYSTEM_PLAN.md` remains
> authoritative for motion semantics and quality budgets. This plan replaces the
> visual strategy of relying primarily on gradients, lines, ellipses and simple
> procedural geometry.

---

## 1. Product goal

Space Typing maps must look like actual places.

A map must be built from authored visual layers such as:

- sky / deep-space background;
- nebula / milky-way / aurora;
- planets / moons;
- black-hole / vortex;
- asteroid clusters;
- cloud islands;
- lava ridges;
- ice structures;
- trees / roots;
- reactor structures;
- cathedral / final-realm architecture;
- foreground debris / dust / particles.

The renderer then animates those layers with depth-aware parallax so the player
feels the ship is moving through the environment.

The target is not:
- gradient + debug-like line streaks;
- repeated ellipse/ring overlays;
- one generic background recolored per World.

The target is:
- authored scene art;
- layered depth;
- smooth parallax;
- cinematic environmental motion;
- clear World identity.

---

## 2. Asset sourcing policy

Before drawing or generating a new scenic asset, search established game-art
sources for a suitable asset with a verified permissive license.

Preferred sources include:

- OpenGameArt items explicitly marked CC0;
- Kenney CC0 packs;
- other repositories/packs with explicit CC0/public-domain licensing;
- NASA/SVS material only when the specific item and usage terms are verified.

Workflow:

1. search;
2. verify the exact asset license;
3. preview visual/style fit;
4. vendor the original local file;
5. record provenance in `docs/THIRD_PARTY_BACKGROUND_ASSETS.md`;
6. integrate it into the layer registry;
7. create custom art only when sourced assets cannot meet the requirement.

Do not create low-detail replacement art merely because it is faster if a
higher-quality permissive source already exists.

### Asset quality gate

A permissive license is necessary but not sufficient. Before an asset enters a
production scene, it must also pass a visual curation gate.

Prefer sources that have at least one of the following:

- meaningful community favorites/downloads or long-term use in game projects;
- an established game-asset author/publisher;
- a coherent pack that supplies multiple related objects in one visual style;
- enough source resolution for the intended on-screen scale.

For every candidate asset:

1. inspect the actual image, not only its title/license;
2. reject obvious placeholder, debug, icon-only or low-resolution art when it
   will be shown as a large scenic object;
3. reject full-screen backgrounds whose star/noise density competes with enemy
   labels or projectiles;
4. prefer a visually coherent family over mixing unrelated photorealistic,
   pixel-art and flat-vector assets in one scene;
5. source visible environmental objects too — planets, asteroids, suns,
   vortexes, debris and landmarks — instead of sourcing only the sky image;
6. use at least two depth classes of sourced moving objects where the family
   calls for flight/parallax;
7. record why a selected pack is appropriate in
   `docs/THIRD_PARTY_BACKGROUND_ASSETS.md`.

### Current Galaxy curation baseline

The next Galaxy pass should prefer:

- Screaming Brain Studios **Seamless Space Backgrounds** for a restrained
  nebula/space texture rather than the current overly noisy full-screen art;
- Screaming Brain Studios **2D Planet Pack 2** for high-resolution shaded
  planets/suns;
- Kenney **Space Shooter Remastered / Space Shooter** for cohesive arcade
  meteor/debris sprites;
- a sourced vortex/wormhole only if its visual style and resolution pass this
  quality gate. A weak pixel-art vortex must be omitted rather than forced into
  the scene.

## 3. Hybrid rendering model

The production background is a hybrid of:

### Authored assets

Reusable transparent SVG/WebP scenery:

- base sky;
- nebula sheet;
- planet;
- vortex;
- asteroid cluster;
- major landmark;
- foreground decorative object.

### Runtime motion

Canvas applies:

- parallax drift;
- forward-flight translation;
- gentle rotation;
- pulse/opacity animation;
- bounded particle overlays;
- rare event effects.

Procedural drawing remains useful for:
- stars;
- very small dust;
- glow;
- simple particles;
- masks/vignette.

Procedural drawing must not be responsible for the primary scenic identity.

---

## 4. Layer model

### Layer 0 — base sky image
Large cover image defining the main color/texture language.

### Layer 1 — far atmospheric art
Nebula, milky way, aurora, distant cloud, smoke, mist.

### Layer 2 — far landmark art
Planet, moon, giant halo, volcano ridge, cathedral silhouette, reactor, black
hole, giant crystal.

### Layer 3 — midground art
Asteroid clusters, floating islands, ice fragments, ruins, roots, machinery.

### Layer 4 — foreground art
Near asteroid/debris, cloud wisp, leaves, snow sheets, sparks, shards.

### Layer 5 — runtime FX
Stars, dust, comet, meteor, glow pulse and other short-lived effects.

Each layer has:
- depth;
- opacity;
- scale;
- anchor;
- drift vector;
- rotation speed;
- optional pulse;
- central-corridor avoidance rule.

---

## 5. Motion / parallax contract

Normalized depth:

- 0.10–0.25: extremely far
- 0.25–0.45: far
- 0.45–0.70: mid
- 0.70–0.95: near
- 1.00+: event/foreground

General motion:

- far layer: slowest;
- large landmarks: slow and stable;
- mid objects: clear parallax;
- near objects: faster;
- event layer: occasional fast movement.

The ship stays visually anchored; the environment supplies the sensation of
forward travel.

---

## 6. Asset family requirements

### Galaxy / Deep Space

Must include:
- deep-space sky;
- milky-way/nebula;
- ringed or illuminated planet;
- spiral galaxy / vortex;
- asteroid cluster;
- individual near asteroids.

Motion:
- nebula drift;
- slow planet parallax;
- vortex rotation;
- multi-speed asteroids;
- dense stars;
- comet/meteor events.

### Heaven / Celestial

Must include:
- luminous sky;
- cloud banks;
- halo gate;
- floating island/temple;
- light/feather accents.

Motion:
- cloud drift;
- slow floating structure parallax;
- halo pulse;
- feather/light motion.

### Hell / Infernal

Must include:
- infernal sky;
- lava ridge;
- volcanic/demon silhouette;
- smoke cloud;
- fire debris.

Motion:
- lava pulse;
- smoke rise/drift;
- embers;
- fire meteor events.

### Frost / Ice

Must include:
- cold sky;
- aurora sheet;
- ice-spire silhouette;
- floating ice/crystal fragments.

Motion:
- aurora wave;
- snow parallax;
- shard rotation;
- cold mist drift.

### Verdant / Nature

Must include:
- atmospheric green sky;
- giant tree/canopy;
- root/floating-island silhouette;
- leaves/spores.

Motion:
- canopy parallax;
- leaf/pollen drift;
- mist.

### Shadow / Void Nature

Must include:
- dark sky;
- eclipse;
- ruined/shadow flora silhouette;
- void shards.

Motion:
- fog;
- eclipse pulse;
- shard drift.

### Cosmic Forge

Must include:
- industrial cosmic sky;
- large reactor structure;
- mechanical towers;
- energy conduits.

Motion:
- reactor rotation;
- energy pulse;
- machinery parallax;
- sparks.

### Abyss / Void

Must include:
- deep void sky;
- black-hole/vortex;
- broken orbit/ruin assets;
- cursed debris.

Motion:
- inward/orbital drift;
- slow vortex;
- dark dust.

### Sacred Cathedral

Must include:
- astral sky;
- giant arch/cathedral silhouette;
- sacred light;
- astral dust.

Motion:
- monumental slow parallax;
- shimmer;
- sacred dust.

### Eternity / Final

Must include:
- final cosmic sky;
- crown / dimensional rings;
- prism/void structures.

Motion:
- layered ring rotation;
- cosmic drift;
- final-realm light motion.

---

## 7. Asset packaging

Canonical path:

`public/assets/space-typing/backgrounds/<family>/`

Examples:

- galaxy/sky-nebula.svg
- galaxy/planet-ringed.svg
- galaxy/spiral-galaxy.svg
- galaxy/asteroid-cluster.svg
- heaven/sky-celestial.svg
- heaven/halo-gate.svg
- hell/sky-infernal.svg
- hell/lava-ridge.svg

Assets are local-first and must not depend on remote URLs during play.

SVG is preferred for:
- planets;
- silhouettes;
- decorative structures;
- stylized nebula/aurora layers.

WebP is preferred later for:
- painterly full-resolution backgrounds where vector art is insufficient.

---

## 8. Runtime architecture

Add:

- `src/worlds/layered-background-types.ts`
- `src/worlds/layered-background-registry.ts`
- `src/worlds/layered-background-renderer.ts`

The existing `WorldSceneRenderer` remains the one production scene renderer.
It composes `LayeredBackgroundRenderer` rather than adding a second game-loop
background path.

Responsibilities:

### LayeredBackgroundRegistry
- map World scene archetype/variant to local authored assets;
- define depth, scale, opacity and motion per asset layer.

### LayeredBackgroundRenderer
- cache loaded images;
- draw base/far/mid/near layers;
- compute smooth parallax from `time`;
- apply rotation/pulse;
- avoid hard spawn/reset jumps;
- remain safe when assets are not yet loaded.

### WorldSceneRenderer
- draw authored image layers;
- then add bounded procedural support FX;
- preserve quality budgets and readability.

---

## 9. Combat-readability rules

1. Primary landmarks prefer screen thirds instead of dead center.
2. Large near objects avoid the upper-middle word-label zone.
3. Background art uses lower contrast than enemies/projectiles.
4. Asset opacity is capped by depth.
5. Fast objects are mostly near edges / lower half.
6. Procedural speed streaks are support detail only, never the dominant visual.

---

## 10. Implementation tasks

### LB00 — Commit this spec
No runtime behavior changes.

### LB01 — Layer types and registry
Add layer/motion types and family registry.

### LB02 — Authored Galaxy asset pack
Create local assets:
- deep sky;
- nebula;
- ringed planet;
- spiral galaxy;
- asteroid cluster;
- individual asteroid.

### LB03 — Asset renderer
Implement:
- image cache;
- cover/contain placement;
- parallax;
- drift;
- rotation;
- pulse;
- safe fallback.

### LB04 — Galaxy integration
World 01–05 use authored galaxy/celestial assets plus existing bounded stars,
dust and event FX.

Acceptance:
- screenshot already looks like a space scene even if animation is paused;
- during play, depth/parallax creates forward-flight feeling;
- line streaks are no longer the primary visual feature.

### LB05 — Heaven / Hell / Frost asset packs
Add authored local assets and registry entries.

### LB06 — Verdant / Shadow / Forge asset packs
Add authored local assets and registry entries.

### LB07 — Abyss / Cathedral / Eternity asset packs
Add authored local assets and registry entries.

### LB08 — Motion polish
- smooth wrapping;
- avoid visible pops;
- tune parallax;
- tune rotations/pulses;
- reduce procedural hard-line streaks.

### LB09 — Performance / quality tuning
- local image cache;
- no image recreation per frame;
- bounded moving layers;
- quality can reduce optional layers;
- core scenic identity is always present.

### LB10 — Tests and docs
Test:
- every World resolves an asset scene;
- all asset paths are local;
- layer configs are valid;
- quality filtering remains bounded.

Update project docs.

### LB11 — Parent pin
Update `sinhvienaiti/typing-game` gitlink after child CI succeeds.

---

## 11. Galaxy acceptance target

World 01 must contain, at minimum:

- rich deep-space sky image;
- visible milky-way/nebula mass;
- large ringed planet;
- visible spiral galaxy/vortex;
- asteroid cluster;
- moving near asteroid(s);
- dense stars;
- subtle comet/meteor event.

Paused frame acceptance:
- clearly looks like a beautiful galaxy scene.

Motion acceptance:
- after 3–5 seconds, parallax and object motion make the ship feel in flight.

Failure conditions:
- looks like gradient + lines;
- primary movement is just straight streaks;
- only a few dots/ellipses indicate space;
- no clear depth between far and near objects.

---

## 12. Definition of done

The layered asset system is complete when:

1. every World resolves a layered asset scene;
2. each family has authored scenic assets;
3. Galaxy/Heaven/Hell/Frost/etc. are visually recognizable from screenshots;
4. large/mid/near layers move with different parallax speeds;
5. procedural lines are secondary support only;
6. gameplay remains readable;
7. image loading is local and cached;
8. performance stays bounded;
9. tests/build pass;
10. project docs and parent gitlink are updated.


---

## 13. Implementation checkpoint — 2026-09-26

Implemented on child `main`:

- layered background types/registry/renderer;
- local image cache using browser `Image` objects;
- cover/contain placement;
- depth-aware parallax;
- smooth oscillatory drift for landmarks;
- wrapped travel motion for near/mid assets;
- layer rotation and pulse;
- quality filtering for optional layers;
- safe procedural fallback while authored images are still loading.

Authored local asset packs now exist for:

- Galaxy:
  - deep-space sky;
  - nebula;
  - ringed planet;
  - spiral galaxy;
  - asteroid cluster.
- Heaven:
  - celestial sky;
  - halo gate;
  - cloud islands.
- Infernal:
  - infernal sky;
  - lava ridge;
  - fortress.
- Frost:
  - frozen sky;
  - aurora;
  - ice spires.
- Verdant:
  - green atmospheric sky;
  - canopy;
  - roots.
- Shadow:
  - shadow sky;
  - eclipse;
  - ruins.
- Cosmic Forge:
  - industrial sky;
  - reactor;
  - towers.
- Abyss:
  - void sky;
  - black hole;
  - ruins.
- Meteor:
  - cosmic sky;
  - asteroid belt;
  - comet cluster.
- Cathedral:
  - astral sky;
  - cathedral;
  - sacred light window.
- Eternity:
  - final-realm sky;
  - dimensional rings;
  - cosmic crown.

Runtime integration:

- `WorldSceneRenderer` now composes `LayeredBackgroundRenderer`;
- authored imagery is drawn before bounded procedural support FX;
- once authored imagery is ready, the old perspective-floor line system is
  skipped instead of being drawn over the scene;
- hard straight near-star streaks were reduced and changed to softer faded
  trails with a glowing head;
- the previous procedural system remains only as a loading/fallback path.

Automated validation:

- all 50 Worlds resolve valid local authored background layers;
- all asset paths are local under
  `/assets/space-typing/backgrounds/`;
- representative Worlds map to distinct authored families;
- layer ids are unique per scene;
- Test: PASS;
- Build: PASS;
- child CI: SUCCESS.

The next visual QA step is owner review of World 01 in a real browser. If the
Galaxy scene is still not painterly/rich enough, the next iteration should
improve the authored SVG/WebP art itself rather than adding more procedural
lines.


---

## 14. LB12 — Galaxy curated asset replacement

**Reason**

Owner screenshot review of the first sourced Galaxy pass showed that sourcing
alone is not enough. The full-screen background was too noisy and the scene
still displayed rough procedural polygon asteroids. The first source set also
mixed unrelated visual styles.

**Required work**

1. Replace the noisy Galaxy background composition with a cleaner dark-space
   base plus a lower-opacity high-resolution nebula layer.
2. Replace low-detail planets with shaded high-resolution planet sprites from a
   coherent CC0 planet pack.
3. Replace every visible procedural polygon asteroid in Galaxy with sourced
   meteor/asteroid sprites.
4. Use multiple sourced asteroid variants at far/mid/near depths, with different
   sizes, drift rates and rotation speeds.
5. Remove the low-resolution black-hole image from the active Galaxy profile.
   Keep a vortex only if a sourced visual passes the quality gate; otherwise the
   scene is better without one.
6. Keep the central combat corridor less noisy than the side thirds.
7. Reduce straight/streak effects further when authored moving objects provide
   enough flight sensation.
8. Delete superseded custom Galaxy SVG assets and unused vendor files once the
   registry no longer references them.

**Acceptance**

A paused World 01 screenshot must show:

- clean deep-space/star backdrop;
- readable purple/blue nebula structure;
- one large high-quality planet;
- one smaller/far high-quality planet or sun;
- sourced asteroid sprites, not gray polygons;
- no low-resolution pixel-art black hole;
- no full-screen wall of bright noise.

During motion:

- far planet/nebula drift slowly;
- mid asteroids drift/rotate at medium speed;
- near asteroids move faster;
- no large object visibly pops when wrapping;
- enemies and words remain easier to read than the scenery.

**Validation**

- child tests/build pass;
- Galaxy registry tests assert no old custom Galaxy SVGs or deprecated
  low-quality Galaxy vendor assets are active;
- parent gitlink is updated after child CI succeeds.
