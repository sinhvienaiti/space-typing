# Visual Runtime Architecture Correction Plan

Status: ACTIVE IMPLEMENTATION — World 01 production authored mode

Date: 2026-09-26

## Root cause

The approved demo art and the current runtime are produced by different pipelines.

The runtime currently always draws the legacy procedural/static scene first
(`drawBaseSky + drawStaticLandmarks`), then draws authored image layers on top.
That means authored production art enriches the old scene instead of replacing it.

Most non-Galaxy families also still use prototype SVG geometry (triangles,
rectangles, circles, simple arches and polygons), so changing renderer effects
alone cannot make those Worlds look like the approved demos.

## Architecture correction

Introduce an explicit layered-background render mode:

- `legacy-hybrid`: current behavior for Worlds not yet migrated.
- `authored-production`: authored image/object layers replace legacy procedural
  landmarks/floor/cinematic scene geometry.

World 01 / Rainbow Reach is the first production-authored World.

### World 01 production pipeline

1. Draw only a neutral/base sky fallback while image assets are loading.
2. Draw authored background/object layers.
3. Draw bounded star hierarchy.
4. Draw lightweight ambient particles.
5. Do NOT draw legacy static landmarks.
6. Do NOT draw legacy procedural floor geometry.
7. Do NOT draw legacy cinematic procedural shapes/events.

Object motion remains in the authored layered renderer:
float, orbit, wrap, flyby and approach.

## Rollout rule

Do not switch another World to `authored-production` until that World has a
curated authored asset manifest that can replace its prototype SVG geometry.

This prevents a partial migration where the old procedural art still determines
the visual identity.

## Acceptance

World 01 must visibly lose the old procedural landmark identity while keeping:
- authored nebula / star layers;
- authored planets / moon;
- authored asteroid field and production asteroids;
- authored distant ship flybys;
- stable gameplay readability;
- bounded performance.

CI must protect:
- World 01 uses `authored-production`;
- representative unmigrated Worlds remain `legacy-hybrid`;
- production mode disables legacy static/cinematic/floor passes;
- authored asset registry remains valid.
