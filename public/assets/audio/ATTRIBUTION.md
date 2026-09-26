# Default Audio Attribution

Space Typing ships a small curated set of redistributable **CC0** audio assets as default fallbacks. Local/private overrides remain supported and take priority where configured.


## Music — Curated modern gameplay replacements

Normal and standard-pressure World gameplay now prefer the following CC0
fallbacks instead of the older `sector.ogg` / `pulse.ogg` tracks:

- `music/mysterious-ambience.mp3` — **Mysterious Ambience (song21)** by
  cynicmusic / pixelsphere.org:
  https://opengameart.org/content/mysterious-ambience-song21
- `music/battle-theme-b.mp3` — **Battle Theme B for RPG** by
  cynicmusic / pixelsphere.org:
  https://opengameart.org/content/battle-theme-b-for-rpg

Both works are multi-licensed by their source and are used here under the
**CC0** option. The vendored copies are the compact mono 96 kbps encodes from
the documented `kiyeonjeon21/reframe` mirror. See
`music/CURATED_CC0_SOURCE.md` for reproducible provenance.

The earlier Dark Sci-Fi pack remains in the repository for boss/high-risk and
legacy specialty states, but it is no longer the normal/pressure fallback for
standard World play.

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

These remain available for boss/high-risk combat, legacy specialty states and stage-clear feedback. Standard World exploration/pressure now uses the curated modern gameplay replacements above.

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
