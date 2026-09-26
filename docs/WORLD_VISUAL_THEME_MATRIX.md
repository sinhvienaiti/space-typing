# World Visual Theme Matrix

This document defines the authored-background ownership boundary for the first
Galaxy and the maintenance rules used by later World migrations.

## Maintenance rules

- A production World owns its own immutable layer array.
- Do not mutate a shared family array to tune one production World.
- Shared assets are allowed; shared mutable composition is not.
- Full-screen layers are background atmosphere only. Large foreground objects
  stay edge-biased and must not cover the central typing corridor.
- Each World must have at least one theme-signature asset that differs from its
  siblings.
- New production Worlds are registered through
  `AUTHORED_WORLD_BACKGROUNDS`; legacy Worlds continue through
  `familyLayers()` until explicitly migrated.
- Visual acceptance remains browser-first. Passing unit/build checks does not
  mean an art direction is accepted.

## Galaxy 01 authored Worlds

| World | Name | Family | Signature composition |
| --- | --- | --- | --- |
| world-01 | Rainbow Reach | galaxy | purple/blue nebula, sparse asteroid depth, no large left ocean planet |
| world-02 | Halo Garden | heaven | generated production painting (celestial gateway/cloud sanctuary) + very subtle depth overlays |
| world-03 | Prismatic Tide | prism | blue/purple nebula volume, aurora sheet, orbital prism rings |
| world-04 | Cherub Falls | cherub | heaven sky, asymmetric cloud bank, small halo, lightfall |
| world-05 | Aurora Gate | aurora | dark meteor sky, aurora wave, halo portal, asteroid belt/comet edge accents |

## Next migration boundary

World 06 and later remain `legacy-hybrid` until their own theme batch is
implemented and reviewed. Infernal begins at World 06 in the canonical World
registry; it is intentionally not substituted into World 03.


## World 02 production-art rule

`world-02` now uses `heaven/halo-garden-production-v2.avif` as the primary
full-frame artwork. The older vector sky is deliberately not used in the
production composition. Secondary vector layers are kept at very low opacity
only for subtle parallax and must not visually overwrite the approved painting.


## World 02 2K production checkpoint — 2026-09-27

Halo Garden now uses `heaven/halo-garden-production-v2.svg`, a local
2560x1440 production wrapper containing the generated AVIF master. The wrapper
keeps the repository transport textual while the browser still decodes the
embedded AVIF as the full-frame raster artwork.

The 2K integrity gate validates both the SVG wrapper dimensions and the embedded
AVIF `ispe` dimensions. An 896x504 replacement can no longer pass the
background asset check.

World 02 additionally owns the stronger authored ambient pass for waterfall
flow/spray, cloud parallax, galaxy glow, star drift/twinkle, halo/light rays and
sparse shooting stars.
