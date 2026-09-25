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
