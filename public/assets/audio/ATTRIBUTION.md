# Default Audio Attribution

Space Typing ships a small curated set of redistributable **CC0** audio assets as default fallbacks. Local/private overrides remain supported and take priority where configured.

## Music — Dark Sci-Fi Audio Pack

Creator: SRG774

Original source:
https://opengameart.org/content/dark-sci-fi-audio-pack

License: **CC0 1.0 Universal / Public Domain**

Committed files:

- `music/sector.ogg`
- `music/pulse.ogg`
- `music/urgent.ogg`
- `stingers/victory.ogg`

These are used for calm exploration, pressure/intense combat, boss/high-risk combat and stage-clear feedback.

The source page explicitly identifies the pack as CC0 and describes the music as loopable sci-fi ambient/background material.

## Sci-Fi SFX — Kenney

Creator: Kenney / kenney.nl

Original source:
https://opengameart.org/content/sci-fi-sounds

License: **CC0**

Committed curated files are renamed under:

`sfx/kenney/`

and include laser, force-field, explosion, engine, thruster, confirmation and warning sounds.

The original source pack contains normalized sci-fi engine, explosion and laser OGG files and is published as CC0. Attribution is not required by the license, but is retained here for provenance.

## Import integrity

The repository intentionally commits only a curated subset needed by the runtime. It does not vendor entire upstream packs.

Audio files are content-preserving imports of the referenced CC0 assets. Application source code keeps its existing license; CC0 audio does not alter the code license.
