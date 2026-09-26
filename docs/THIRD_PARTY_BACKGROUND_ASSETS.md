# Third-Party Background Asset Sources

This file records the provenance and license of externally sourced background
assets vendored into Space Typing.

Production rule:

- prefer high-quality existing permissive assets over hand-drawn placeholder art;
- only create custom art when no suitable source asset exists or when a source
  cannot match the required visual direction;
- every vendored asset must have a known source and license before use;
- keep original source names/authors in this document even when files are renamed
  inside the project.

## Galaxy / Space assets

### Rawdanitsu — Space Backgrounds

Original source:
- https://opengameart.org/content/space-backgrounds-3

License:
- Creative Commons Zero / CC0

Original asset:
- `Background-4.png`

Vendored project path:
- `public/assets/space-typing/backgrounds/vendor/rawdanitsu/space-background-4.png`

Acquisition route:
- copied from the vendored CC0 copy in `openai/procgen`
  (`procgen/data/assets/space_backgrounds/Background-4.png`);
- `openai/procgen/ASSET_LICENSES.md` identifies Rawdanitsu's Space Backgrounds
  as CC0 and links the same OpenGameArt source.

Use:
- primary Galaxy far-background art.

### Screaming Brain Studios — Seamless Space Backgrounds

Original source:
- https://opengameart.org/content/seamless-space-backgrounds

License:
- Creative Commons Zero / CC0

Original assets:
- `Purple Nebula 3 - 512x512.png`
- `Starfield 4 - 512x512.png`

Vendored project paths:
- `public/assets/space-typing/backgrounds/vendor/screaming-brain/purple-nebula-3-512.png`
- `public/assets/space-typing/backgrounds/vendor/screaming-brain/starfield-4-512.png`

Acquisition route:
- copied from the curated copies in
  `NapOnline/naponline.github.io/javascripts/skyfire-squadron/assets/`;
- that repository's `CREDITS.md` records the original OpenGameArt source and
  CC0 license.

Use:
- secondary Galaxy nebula/starfield layers.

### Wisedawn — 20 CC0 Planet Sprites

Original source:
- https://opengameart.org/content/20-cc0-planet-sprites

License:
- Creative Commons Zero / CC0

Original assets:
- `3.png`
- `18.png`

Vendored project paths:
- `public/assets/space-typing/backgrounds/vendor/wisedawn/planet-3.png`
- `public/assets/space-typing/backgrounds/vendor/wisedawn/planet-18.png`

Acquisition route:
- copied from the downscaled curated copies in
  `NapOnline/naponline.github.io/javascripts/skyfire-squadron/assets/`;
- that repository's `CREDITS.md` records the original OpenGameArt source and
  CC0 license.

Use:
- near/far Galaxy planet layers with different parallax depths.

### Kenney — Space Shooter Redux

Original source:
- https://kenney.nl/assets/space-shooter-redux
- mirror: https://opengameart.org/content/space-shooter-redux

License:
- Creative Commons Zero 1.0 Universal / CC0

Original assets:
- `PNG/Meteors/meteorBrown_big1.png`
- `PNG/Meteors/meteorGrey_med1.png`

Vendored project paths:
- `public/assets/space-typing/backgrounds/vendor/kenney/meteor-brown-big1.png`
- `public/assets/space-typing/backgrounds/vendor/kenney/meteor-grey-med1.png`

Acquisition route:
- copied from the curated copies in
  `NapOnline/naponline.github.io/javascripts/skyfire-squadron/assets/`;
- its `CREDITS.md` records Kenney's pack and CC0 license.

Use:
- moving Galaxy asteroid layers.

### Sparklin Labs / Pixel-boy — Superpowers Space Shooter Asset Pack

Original source:
- https://github.com/sparklinlabs/superpowers-asset-packs/tree/master/space-shooter

License:
- Creative Commons Zero / CC0

Original asset:
- `backgrounds/black-hole.png`

Vendored project path:
- `public/assets/space-typing/backgrounds/vendor/sparklinlabs/black-hole.png`

The source repository states that the asset packs are created by Pixel-boy for
Sparklin Labs and released under CC0.

Use:
- optional rotating Galaxy black-hole/vortex accent.

## Review notes

These assets are sourced art, not proof that final composition is complete.
Visual review still decides whether a source image is appropriate for:

- the game's glossy/cute style;
- readability behind active word labels;
- scaling quality at the target canvas size;
- parallax depth;
- motion smoothness.

If an asset is visually weak in production, replace the asset with another
licensed source rather than hiding the problem with more procedural geometry.


---

## Galaxy curation pass 2 — 2026-09-26

The first sourced pass was visually rejected after browser review because the
selected full-screen background was too noisy and the runtime still overlaid
procedural polygon asteroids.

The production Galaxy selection was therefore re-curated using both license and
quality/popularity signals.

### Screaming Brain Studios — Seamless Space Backgrounds

Canonical source:
- https://opengameart.org/content/seamless-space-backgrounds

License:
- CC0

Curation signal at review time:
- 32 OpenGameArt favorites;
- 6,633 downloads for the 1024x1024 pack;
- 32 coordinated seamless backgrounds in the same family.

Selected source asset:
- `Purple Nebula 3 - 1024x1024.png`

Vendored project path:
- `public/assets/space-typing/backgrounds/vendor/screaming-brain/nebula-purple-3-1024.png`

Binary acquisition route:
- curated CC0 copy from
  `EamonnMR/galactic-night`.

Use:
- restrained Galaxy sky/nebula layer at reduced opacity.

### Screaming Brain Studios — 2D Planet Pack 2

Canonical source:
- https://opengameart.org/node/145528

License:
- CC0

Curation signal at review time:
- 18 OpenGameArt favorites;
- 420 rendered planet sprites;
- 512x512 transparent shaded originals;
- one coherent family covering terrestrial planets, gas giants and suns.

Selected assets:
- Ocean_03 512x512;
- BlueGiant_04 512x512;
- Cratered_03 512x512;
- Sun_Blue_03 512x512.

Vendored project paths:
- `vendor/screaming-brain/planet-ocean-03-512.png`;
- `vendor/screaming-brain/planet-blue-giant-04-512.png`;
- `vendor/screaming-brain/planet-cratered-03-512.png`;
- `vendor/screaming-brain/sun-blue-03-512.png`.

Binary acquisition route:
- curated CC0 copies from
  `ShaimHowl/STEAL-A-COINS-1`.

Use:
- large, far and optional celestial bodies with separate parallax depths.

### Kenney — Space Shooter / Space Shooter Remastered meteors

Canonical sources:
- https://opengameart.org/content/space-shooter-art
- https://kenney.nl/assets/space-shooter-remastered

License:
- CC0

Curation signal at review time:
- original Space Shooter art has 153 OpenGameArt favorites and more than
  23,000 downloads;
- Space Shooter Remastered contains 295 files;
- one established arcade-space visual family.

Selected production assets:
- bg_darkPurple;
- meteorBrown_big1;
- meteorBrown_big2;
- meteorBrown_big4;
- meteorGrey_big3;
- meteorGrey_med2;
- meteorGrey_small1.

Two initially copied variants (meteorBrown_big3 and meteorGrey_big1) were not
needed by the final composition and were removed rather than kept as dead
assets.

Vendored under:
- `public/assets/space-typing/backgrounds/vendor/kenney-remastered/`

Binary acquisition route:
- extracted CC0 copies from `judaheland-dev/astrobro`.

Use:
- tiny distant debris only;
- these assets are no longer permitted for readable mid/near desktop layers
  after owner visual review rejected their blocky arcade look when enlarged.

### OhjiroChan — Asteroid Tileset 01

Canonical source:
- https://opengameart.org/content/asteroid-tileset-01

License:
- CC0

Source characteristics:
- three authored size tiers;
- eight rotation views per tier in the original sheet;
- cratered, shaded asteroid rendering rather than flat arcade polygons.

Vendored production derivatives:
- `vendor/ohjirochan/asteroid-small.png`;
- `vendor/ohjirochan/asteroid-medium.png`;
- `vendor/ohjirochan/asteroid-large.png`.

Acquisition route:
- reproducible extracted frames from
  `lebalz/ofi-blog/docs/pgzero/A-examples/5-asteroids/images/`;
- that example links directly back to the same OpenGameArt
  `Asteroid Tileset 01` source;
- a local `SOURCE.md` is stored beside the imported binaries.

Use:
- authored mid-depth asteroid drift;
- authored near-camera hero asteroid;
- no runtime crater/shading synthesis is allowed.

### Deprecated from active Galaxy composition

The following first-pass assets remain documented historically but are no longer
selected by the active Galaxy registry:

- Rawdanitsu `space-background-4.png`: visually too noisy for the active typing
  lane at the previous composition/opacity;
- old 512px Screaming Brain nebula/starfield copies: superseded by the cleaner
  1024px nebula plus runtime stars;
- Wisedawn small planet sprites: superseded by the coherent 512px shaded planet
  family;
- Sparklin Labs black-hole image: valid CC0, but too low-resolution/pixel-like
  for the current visual quality target;
- old two-meteor vendor paths: superseded by the larger curated Kenney meteor
  set.

These superseded binary/custom assets have now been removed from the repository.
Their source history remains in this document only for provenance and review
traceability.
