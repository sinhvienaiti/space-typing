# M08 — Dynamic World Music / Ambient Runtime

M08 adds one state-driven soundtrack controller on top of the existing Space Typing audio lifecycle.

It does not scatter independent `Audio` objects through gameplay code and it does not replace the existing `Sfx`, pronunciation, announcer, World or parent-platform contracts.

## Music state machine

The explicit states are:

- SILENT
- WORLD_NORMAL
- WORLD_INTENSE
- MINI_BOSS
- WORLD_BOSS
- GALAXY_BOSS
- CHAMPION_HUNT
- HIDDEN_CHALLENGE
- HIDDEN_WORLD
- SHOP
- STATION
- VICTORY
- DEFEAT
- TRANSITION

Current production StageRole mapping intentionally reuses the existing Campaign rhythm:

- normal/special -> WORLD_NORMAL;
- elite/gauntlet/hazard -> WORLD_INTENSE;
- mini-boss -> MINI_BOSS;
- boss -> WORLD_BOSS;
- major-boss -> GALAXY_BOSS.

M09 may change which concrete enemies/bosses a World stage uses. M08 does not pre-implement that roster migration.

Champion Hunt and hidden-state music are first-class resolver states now, so later gameplay producers can activate them without adding another playback path.

## World profiles

Every M07 World resolves to one `WorldMusicProfile`.

The profile contains:

- base World track;
- ambient layers;
- intense layer/track;
- Mini Boss / World Boss / Galaxy Boss tracks;
- Champion Hunt / hidden tracks;
- Shop / Station tracks;
- victory / defeat / transition stingers;
- default crossfade;
- ducking profile;
- preload hints.

The registry is deterministic and has one entry per canonical World.

## Asset resolution

Preferred order for every mapped file:

1. optional local/private override;
2. repository/default path;
3. silence for the missing asset while gameplay continues.

Examples:

```text
/local-assets/music/world-01.ogg
-> /assets/audio/music/world-01.ogg
-> fail soft

/local-assets/ambient/world-01.ogg
-> /assets/audio/ambient/world-01.ogg
-> fail soft
```

No synchronous fetch/probe occurs inside the combat frame loop.

The current repository does not yet contain the 50 final World music binaries. That is deliberate and is not represented as completed audio-content approval. The controller and mappings are ready for repository-owned or local/private tracks, and missing files do not block gameplay.

## MusicController

`src/audio/MusicController.ts` owns soundtrack playback.

Responsibilities implemented in M08:

- set current World profile;
- transition to an explicit music state;
- crossfade outgoing/incoming tracks;
- cancel stale transitions cleanly;
- avoid restarting the same track for repeated state calls;
- maintain separate Music and Ambient volume buses;
- cap ambient layers at two;
- retry autoplay-blocked current tracks after a user gesture/resume;
- try local asset first and repository default second;
- fail soft after all candidates fail;
- preload only a small current/next hint set;
- pause/resume on game/background lifecycle;
- stop/destroy all media without leaked playback;
- boss-phase gain escalation without restarting boss music.

Interrupted crossfades preserve the current partial mix instead of jumping the outgoing track back to full volume.

## Audio priority / ducking

M08 extends existing event infrastructure.

Pronunciation already emits:

```text
space-typing:pronunciation
```

Priority Kill Announcer now emits:

```text
space-typing:announcer
```

Critical warning SFX emit:

```text
space-typing:warning
```

The MusicController listens to these events and applies the current World's ducking profile.

Priority intent:

```text
Announcer / pronunciation
> critical warning
> normal typing/combat SFX
> music
> ambient
```

Ambient ducks more strongly than music.

## Gameplay integration

Stage start:

- resolve canonical M07 World;
- apply its WorldMusicProfile;
- resolve current production StageRole;
- crossfade to the appropriate combat state;
- preload only the next likely World profile near the end of a World.

Pause/background:

- pause active music and ambient;
- resume existing tracks without recreating them.

Stage Clear:

- transition to VICTORY one-shot.

Game Over:

- transition to DEFEAT one-shot.

Phoenix Core:

- returning to Playing resolves the current stage combat state again without resetting the encounter.

Shops:

- Normal / Traveling / Black Market / Hidden / Event -> SHOP;
- Station / Service -> STATION;
- closing the shop returns to the selected World's normal state.

## Settings

Game settings now retain independent:

- SFX volume;
- Music volume;
- Ambient volume;
- Pronunciation volume.

The runtime gain buses are separate even though Announcer remains under the existing SFX control.

## Performance

M08 intentionally avoids:

- loading all 50 World tracks at startup;
- registry scans every frame;
- per-frame DOM/audio state updates;
- unlimited stems;
- duplicate playback after pause/restart.

World/state resolution happens on stage, shop, phase or lifecycle transitions.

## Asset/content gate

M08 code and mapping can be validated automatically.

The following remain perceptual/manual asset work and must not be claimed by CI:

- final track composition/selection;
- loudness normalization;
- exact crossfade feel;
- frequency balance with pronunciation/announcer;
- browser-specific autoplay feel;
- final local/default asset licensing audit.

These gates do not require a second audio architecture. Replacing mapped files should not require gameplay logic changes.
