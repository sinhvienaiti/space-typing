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

## Menu / UI SFX — Kenney Interface Sounds and Sci-Fi Sounds (CC0)

Creator: Kenney / kenney.nl

Original sources (downloaded 2026-10-16):
- https://kenney.nl/assets/interface-sounds (Interface Sounds 1.0, 100 files)
- https://kenney.nl/assets/sci-fi-sounds (Sci-Fi Sounds, 73 files)

License: **CC0** (https://creativecommons.org/publicdomain/zero/1.0/)

Curated, renamed copies live in `src/assets/audio/ui/` (bundled by Vite, played by `src/audio/Sfx.ts` through Web Audio):

| File | Source file |
|---|---|
| `hover.ogg` | Interface `select_001.ogg` |
| `click.ogg` | Interface `click_002.ogg` |
| `tab.ogg` | Interface `switch_002.ogg` |
| `open.ogg` | Interface `maximize_006.ogg` |
| `close.ogg` | Interface `minimize_006.ogg` |
| `error.ogg` | Interface `error_004.ogg` |
| `confirm.ogg` | Interface `confirmation_001.ogg` |
| `reward-small.ogg` | Interface `confirmation_003.ogg` |
| `reward-big.ogg` | Interface `confirmation_004.ogg` |
| `reward-shimmer.ogg` | Interface `glass_004.ogg` |
| `streak.ogg` | Sci-Fi `forceField_001.ogg` |
| `deploy.ogg` | Sci-Fi `forceField_000.ogg` |
| `deploy-thump.ogg` | Sci-Fi `lowFrequency_explosion_001.ogg` |

All files are normalised near 0 dBFS by the source; each cue's level is set in `Sfx.ts` (comment above `uiHover`).

## Boss SFX — Kenney Impact Sounds and Sci-Fi Sounds (CC0)

Creator: Kenney / kenney.nl

Original sources (downloaded 2026-10-16):
- https://kenney.nl/assets/impact-sounds (Impact Sounds)
- https://kenney.nl/assets/sci-fi-sounds (Sci-Fi Sounds)

License: **CC0** (https://creativecommons.org/publicdomain/zero/1.0/)

Curated, renamed copies in `sfx/kenney/`, registered in `src/audio/sample-bank.ts` (levels set there):

| File | Source file | Use |
|---|---|---|
| `crystal-hit.ogg` | Impact `impactGlass_heavy_000.ogg` | bolt hits on a crystal boss |
| `crystal-break.ogg` | Impact `impactGlass_heavy_004.ogg` | heavy blows, death chain |
| `force-field-cast.ogg` | Sci-Fi `forceField_002.ogg` | boss volley / lance cast |
| `explosion-crunch-chain.ogg` | Sci-Fi `explosionCrunch_002.ogg` | boss death chain blasts |
| `explosion-crunch-big.ogg` | Sci-Fi `explosionCrunch_004.ogg` | boss final blast |

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

## Campaign 3D dragon SFX — Freesound (CC0)

`public/assets/audio/dragon/*.mp3` (2026-10-18), the fire dragon Draconis in Campaign 3D (`src/scene3d/sfx.ts` DRAGON_SAMPLES). Every source is **CC0 (public domain)** on freesound.org; the license was read on each sound's own page, and no other license appears there. They replace a synthesized set the owner found weak ("xoẹt xoẹt", gun-like blasts). Files are the untouched 128 kbps HQ MP3 previews; the game plays a trimmed stretch of each with short fades, over a synthesized sub-bass, through a soft saturation and a compressor.

| File | Freesound sound | Author | Link |
| --- | --- | --- | --- |
| `fire-burst.mp3` | Fire Burst Flash (#539972) | Za-Games | https://freesound.org/people/Za-Games/sounds/539972/ |
| `fireball-explosion.mp3` | Fireball Explosion.wav (#431174) | Blankened | https://freesound.org/people/Blankened/sounds/431174/ |
| `fire-explosion.mp3` | Fire Explosion (#855898) | qubodup | https://freesound.org/people/qubodup/sounds/855898/ |
| `combust.mp3` | Combust.wav (#412558) | GrimGrum | https://freesound.org/people/GrimGrum/sounds/412558/ |
| `roar.mp3` | Dragon roar 1.wav (#651817) | AMWD_Mortsel-Edegem-Kontich | https://freesound.org/people/AMWD_Mortsel-Edegem-Kontich/sounds/651817/ |
| `fire-breath.mp3` | Fire Breath.wav (#157616) | bspiller5 | https://freesound.org/people/bspiller5/sounds/157616/ |
| `fireball-swell.mp3` | JM_FX_Fireball 02.wav (#346917) | Julien_Matthey | https://freesound.org/people/Julien_Matthey/sounds/346917/ |
