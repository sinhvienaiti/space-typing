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
| world-02 | Halo Garden | heaven | heaven sky, halo gate, cloud islands, faint aurora |
| world-03 | Prismatic Tide | prism | blue/purple nebula volume, aurora sheet, orbital prism rings |
| world-04 | Cherub Falls | cherub | heaven sky, asymmetric cloud bank, small halo, lightfall |
| world-05 | Aurora Gate | aurora | dark meteor sky, aurora wave, halo portal, asteroid belt/comet edge accents |

## Next migration boundary

World 06 and later remain `legacy-hybrid` until their own theme batch is
implemented and reviewed. Infernal begins at World 06 in the canonical World
registry; it is intentionally not substituted into World 03.
