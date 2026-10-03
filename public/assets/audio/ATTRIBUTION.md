# Default Audio Attribution

Space Typing ships a small curated set of redistributable **CC0** audio assets as default fallbacks. Local/private overrides remain supported and take priority where configured.


## Music — World songs (original, generated)

- `music/songs/<song>/calm.ogg` and `intense.ogg` — 13 songs, two stems each,
  played by World (Galaxy playlists) or shuffled (see `src/audio/music-library.ts`).

Original music made for Space Typing by `scripts/music/` (song specs in
`scripts/music/songs/`, rendered by the repository's own synthesizer): no
samples, loops or third-party audio are used, so there is nothing to
attribute. Re-render with `pnpm music:render`. Details: `docs/MUSIC_SYSTEM.md`.

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

## Duel war SFX — Freesound (CC0)

`public/assets/audio/duel/war/*.ogg` (2026-10-03). Every source is **CC0 (public domain)** on freesound.org, chosen by downloads/rating and measured spectrum (the owner rejected the generated pack as "tinh tinh" and a synthesized replacement as "stones in a pan"). Files are the 128 kbps HQ previews, trimmed, faded, peak-normalised to −1 dBFS and encoded as Opus 96 kbps mono.

| File | Freesound sound | Author | Link |
| --- | --- | --- | --- |
| `gun-a.ogg` | Sci Fi Gun Shot.wav (#317136) | Bird_man | https://freesound.org/people/Bird_man/sounds/317136/ |
| `gun-b.ogg` | plasmapistol_shot.wav (#450768) | Tycoh | https://freesound.org/people/Tycoh/sounds/450768/ |
| `gunshot-real.ogg` | Gunshot 4.wav (#166191) | ShawnyBoy | https://freesound.org/people/ShawnyBoy/sounds/166191/ |
| `hit-a.ogg` | Projectile Hit (#193429) | unfa | https://freesound.org/people/unfa/sounds/193429/ |
| `hit-b.ogg` | small explosion (#315826) | bevibeldesign | https://freesound.org/people/bevibeldesign/sounds/315826/ |
| `hit-heavy.ogg` | bad explosion (#47252) | deleted_user_364925 | https://freesound.org/people/deleted_user_364925/sounds/47252/ |
| `railgun.ogg` | shipboard_railgun.mp3 (#155790) | deleted_user_1941307 | https://freesound.org/people/deleted_user_1941307/sounds/155790/ |
| `tank-fire.ogg` | Tank fire Mixed.wav (#127845) | GaryQ | https://freesound.org/people/GaryQ/sounds/127845/ |
| `explosion-a.ogg` | Explosion (#182429) | qubodup | https://freesound.org/people/qubodup/sounds/182429/ |
| `explosion-b.ogg` | Explosion.wav (#94185) | Nbs Dark | https://freesound.org/people/Nbs Dark/sounds/94185/ |
| `explosion-big.ogg` | Explode001 (#136765) | mitchelk | https://freesound.org/people/mitchelk/sounds/136765/ |
| `missile.ogg` | CAS Missile Launching.wav (#398213) | morganpurkis | https://freesound.org/people/morganpurkis/sounds/398213/ |
| `rocket.ogg` | Rocket Launch (#521377) | Jarusca | https://freesound.org/people/Jarusca/sounds/521377/ |
| `laser-impact.ogg` | Laser Impact (#440668) | SeanSecret | https://freesound.org/people/SeanSecret/sounds/440668/ |
| `shield.ogg` | shield guard (#370203) | nekoninja | https://freesound.org/people/nekoninja/sounds/370203/ |
| `impact-design.ogg` | Sound Design Elements Impact SFX PS 086 (#812752) | AudioPapkin | https://freesound.org/people/AudioPapkin/sounds/812752/ |
