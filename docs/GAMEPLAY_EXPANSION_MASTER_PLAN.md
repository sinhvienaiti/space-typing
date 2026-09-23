# Space Typing — Gameplay Expansion Master Plan

> STATUS: APPROVED DESIGN PLAN — implementation not started by this document.
>
> Repository: `sinhvienaiti/space-typing`
>
> This document is the source of truth for the next major gameplay/progression expansion discussed after the reviewed enemy-system milestone. It must be read together with `docs/PROJECT_CONTEXT.md` and `docs/ENEMY_SYSTEM_MASTER_PLAN.md`.
>
> When this plan conflicts with the old suggested 100-stage rhythm in `PROJECT_CONTEXT.md`, this plan wins for the systems explicitly redesigned here.
>
> GitHub `main` remains the source of truth for implementation state. Do not mark a section implemented until code, tests, CI and documentation prove it.

---

# 1. Goals

The expansion must make a 1000-stage typing campaign feel like a long adventure instead of the same typing battle with larger numbers.

The major goals are:

- checkpoints that create meaningful risk every 10 stages;
- crash recovery that protects the player from technical failures without weakening gameplay;
- 50 main Worlds with enemies, bosses, visuals, hazards, rewards, shops, BGM and ambient identity that match each World;
- branching route choices without deleting the numeric 001-1000 Campaign identity;
- optional hidden challenge stages with selectable risk and reward;
- a clear 10-rank enemy hierarchy;
- multi-word enemy defense layers;
- enemy skills that primarily pressure typing and target decisions;
- difficulty modes designed around real typing-speed ranges;
- threat-aware spawn balancing so impossible enemy piles do not occur by accident;
- richer rewards, currencies, shops, item grades and upgrade systems;
- rare resurrection/protection items that are valuable but may be accumulated without an artificial inventory limit;
- run relics, objectives, stations, boss typing mechanics, Codex and Ascension;
- event-driven/data-driven implementation with bounded rendering and simulation cost.

The game must remain typing-first. Progression and builds help, but they must not replace typing skill.

---

# 2. Non-negotiable design rules

## 2.1 Typing remains the primary combat skill

Enemy mechanics may:

- reduce reaction time;
- obscure information;
- force target switching;
- add interrupt words;
- add shield/armor words;
- lock abilities briefly;
- create urgency;
- add word sequences;
- add positional/visual pressure.

Enemy mechanics must not feel like broken keyboard input.

Do not introduce real input latency, random dropped keystrokes or invisible input rejection. If a status temporarily prevents typing, it must be explicitly telegraphed and represented by a fair typing mechanic such as a thaw/break word, a visible lock timer, a reveal delay or another counterable state.

## 2.2 Strength requires a trade-off

A normal enemy must not simultaneously be:

- extremely fast;
- extremely durable;
- high damage;
- heavy crowd control;
- strong support;
- three typing layers.

Every generated/runtime enemy uses a bounded Threat Budget. Strength in one axis consumes budget and requires weakness in another axis.

Examples:

- strong Freeze caster -> slow, fragile, long cast and long cooldown;
- very fast Assassin -> short words, low defense, little/no hard CC;
- heavy Tank -> slow movement, low attack frequency;
- powerful Support -> weak direct attack and clear target priority;
- high-damage Sniper -> telegraphed shot and low defense.

Bosses may exceed normal budgets but must distribute mechanics across phases rather than activate everything at once.

## 2.3 Difficulty controls total pressure, not one multiplier

Difficulty must control:

- active enemy pressure;
- spawn timing;
- simultaneous urgent threats;
- word difficulty;
- typing layers;
- enemy attack cadence;
- CC duration/frequency;
- reaction windows;
- formation complexity;
- support/controller density;
- projectile pressure;
- elite/apex frequency;
- boss aggression;
- reward multipliers.

Do not implement difficulty as only enemy speed or HP scaling.

## 2.4 No parallel combat/boss architecture

Reuse and extend the existing:

- `Game` runtime;
- enemy registry/renderer;
- boss model;
- status system;
- skill engine;
- loot/pity system;
- equipment/loadout;
- PlayerSave/IndexedDB/autosave;
- performance quality profiles;
- SFX/VFX pipeline.

Do not create a second boss system or a second persistence system.

---

# 3. Campaign hierarchy

The target Campaign hierarchy becomes:

~~~text
1000 Campaign Stages
└── 10 Galaxies
    └── 5 Worlds per Galaxy
        └── 20 Campaign Stages per World
            ├── Sector A: 10 stages
            └── Sector B: 10 stages
~~~

Therefore:

- 10 Galaxies;
- 50 Main Worlds;
- 20 stages per World;
- 2 ten-stage checkpoint sectors per World;
- 100 ten-stage checkpoint sectors across the Campaign.

Hidden Worlds/Hidden Challenges are outside the 1000 numbered stages and do not change the Campaign stage number.

## 3.1 Ten-stage checkpoint rhythm

For a sector beginning at Stage 181:

~~~text
Checkpoint entry: 181
Play: 181 ... 190
Clear 190
Commit checkpoint
Next checkpoint entry: 191
~~~

If the player dies at 190 without using a protection/resurrection item:

~~~text
rollback -> Stage 181
~~~

The player must replay the sector.

## 3.2 World rhythm

Recommended default:

~~~text
World Stage 01-09  -> progressive encounters
World Stage 10     -> Mini Boss + checkpoint
World Stage 11-19  -> harder World encounters
World Stage 20     -> World Boss + checkpoint + next World
~~~

The fifth World of a Galaxy ends at Galaxy Stage 100 and uses a Galaxy Major Boss instead of an ordinary World Boss.

This replaces the old assumption that only x20/x50/x80/x100 define the major rhythm. Existing stage-role code must be migrated intentionally rather than silently mixed with both designs.

---

# 4. Checkpoint, rollback and crash recovery

Gameplay checkpoints and technical recovery are separate concepts.

## 4.1 Persistent state layers

Use three explicit persistence layers:

### Committed Checkpoint State

The authoritative gameplay state at the beginning of the current ten-stage sector.

Includes:

- checkpoint stage;
- currencies;
- inventory;
- equipment;
- equipment enhancement/grade/affixes;
- permanent character progression;
- permanent attribute upgrades;
- skill upgrades;
- relic ownership that is persistent by design;
- shop/world progression already committed;
- other permanent economic state.

### Active Segment State

The live persistent state while playing the current ten-stage sector.

It includes all gains/spending/upgrades after the checkpoint.

### Crash Recovery State

A technical recovery snapshot written at safe transitions such as:

- stage clear;
- route choice;
- shop transaction;
- upgrade transaction;
- Hidden Challenge transition;
- page lifecycle checkpoints.

It may restore the active segment after an unexpected reload/crash.

It must never redefine the gameplay checkpoint.

## 4.2 Death invalidates ordinary crash recovery

If the game records a real gameplay death:

1. mark the active recovery snapshot as death-invalid;
2. show death-resolution choices;
3. resolve resurrection/protection item if selected;
4. otherwise restore the committed checkpoint.

Reloading after a recorded death must not allow the player to bypass rollback.

## 4.3 Crash behavior

Example:

~~~text
Checkpoint: 181
Cleared: 181-189
Currently entering 190
Browser crashes
~~~

The player may recover at the saved active segment / Stage 190 state because the loss was technical, not gameplay death.

## 4.4 Highest reached vs checkpoint stage

Track separately:

- `highestReachedStage` for records/Codex;
- `checkpointStage` for gameplay rollback;
- `selectedStage` for replay/stage selection rules.

Stage Select must not become a loophole that jumps back to an uncommitted stage after death.

---

# 5. Three rare protection/resurrection items

Player inventory has no artificial accumulation limit for these items. Their balancing comes from rarity, random availability, shop stock and cost.

Grade and drop probability are independent. A Silver-grade item may still have a lower drop weight than some Gold equipment if desired.

## 5.1 Salvage Anchor

Suggested internal id:

~~~text
salvage-anchor
~~~

Suggested grade:

~~~text
Silver
~~~

Death behavior:

- player returns to the ten-stage checkpoint;
- all permanent/economic gains from the failed segment are preserved;
- Credits/materials/currencies are preserved;
- equipment and loot are preserved;
- permanent attribute/skill/equipment upgrades made in the segment are preserved;
- Campaign stage still rolls back.

Temporary combat statuses/buffs are not preserved.

The item is consumed when used.

## 5.2 Stage Revival Core

Suggested internal id:

~~~text
stage-revival-core
~~~

Suggested grade:

~~~text
Gold
~~~

Death behavior:

- preserve segment gains;
- restart the stage that was just failed;
- do not return to the ten-stage checkpoint.

Use a stage-entry snapshot so the restart is deterministic and cannot duplicate rewards.

The item is consumed when used.

## 5.3 Phoenix Core

Suggested internal id:

~~~text
phoenix-core
~~~

Suggested grade:

~~~text
Diamond
~~~

Death behavior:

- resurrect immediately inside the current encounter;
- preserve current encounter progress;
- preserve boss HP/phase where safe;
- restore a tuned amount of Hull/Shield/Energy;
- provide a short visible invulnerability/grace window;
- continue the encounter without replaying the stage.

It must not fully refill every combat resource by default.

The item is consumed when used.

## 5.4 Relative availability

Target relative availability:

~~~text
Salvage Anchor  >> Stage Revival Core > Phoenix Core
~~~

Do not hardcode one universal percentage. Use source-specific weighted pools.

Possible sources:

- Elite;
- Apex;
- Mini Boss;
- World Boss;
- Galaxy Major Boss;
- Hidden Challenge;
- Treasure;
- random events;
- milestone rewards;
- Normal/Traveling/Black Market/Hidden/Event shops.

Luck may improve the chance slightly, but must be capped so high Luck does not make rare resurrection items ordinary.

---

# 6. Item/equipment/skill grade system

Replace the player-facing legacy rarity naming with five clear grades:

~~~text
Aluminum
Copper
Silver
Gold
Diamond
~~~

Suggested internal ids:

~~~text
aluminum
copper
silver
gold
diamond
~~~

The grade system should apply consistently where meaningful:

- Equipment;
- Consumables/special items;
- Relics;
- Skill upgrade quality/tier where applicable;
- selected reward containers.

## 6.1 Legacy migration

Current equipment uses:

~~~text
Common
Rare
Epic
Legendary
~~~

A safe migration path is:

~~~text
Common    -> Aluminum
Rare      -> Copper
Epic      -> Silver
Legendary -> Gold
Diamond   -> new top grade
~~~

Do not break old PlayerSave data. Use explicit schema migration and tests.

## 6.2 Grade is not drop weight

Store these separately:

- `grade`: power/quality identity;
- `dropWeight`: how likely the item is to appear;
- `sourceRules`: where it may appear;
- `stockRules`: shop quantity rules.

---

# 7. Currency and reward economy

Avoid a single-currency economy where every reward becomes more Credits.

Target core currencies:

## 7.1 Credits

Common currency.

Used for:

- normal shops;
- repair;
- standard consumables;
- basic services;
- part of most upgrade costs.

## 7.2 Alloy

Upgrade/crafting material.

Sources:

- dismantling equipment;
- Elite/Apex enemies;
- bosses;
- Machine/industrial Worlds;
- reward chests.

Used for:

- equipment enhancement;
- equipment service actions;
- selected attribute/skill upgrades;
- affix reroll/evolution where implemented.

## 7.3 Star Crystal

Rare progression currency.

Sources:

- Hidden Challenges;
- Mini Boss;
- World Boss;
- high-tier milestones;
- rare events;
- rare shops.

Used for:

- high-grade equipment;
- late enhancement;
- rare relics;
- resurrection/protection items;
- higher-level skill/equipment evolution.

## 7.4 Quantum Core

Very rare endgame currency.

Sources:

- Galaxy Major Boss;
- very difficult hidden content;
- Ascension;
- endgame achievement/reward structures.

Used for:

- top-end evolution;
- Diamond systems;
- special endgame upgrades.

## 7.5 Special Tokens

Optional content-scoped currency.

Examples:

- event token;
- hidden-world token;
- bounty/challenge token.

Do not create a new permanent currency unless it has a distinct use.

---

# 8. Reward layers

Rewards must come from multiple gameplay layers.

## 8.1 In-stage rewards

- enemy drops;
- Elite/Apex drops;
- treasure targets;
- random events;
- hidden objects.

These remain part of the active segment until checkpoint commit.

## 8.2 Stage-clear rewards

May include:

- Credits;
- Alloy;
- performance reward;
- objective reward;
- item/equipment roll.

Still uncommitted until the ten-stage checkpoint.

## 8.3 Sector checkpoint reward

Clearing the tenth stage commits:

- active segment economic state;
- sector reward;
- checkpoint advancement.

Sector rewards should feel stronger than an ordinary stage clear.

## 8.4 Hidden Challenge reward

Reward scales with selected challenge tier.

Potential outputs:

- Credits multiplier;
- Alloy;
- Star Crystal;
- higher equipment-grade weight;
- Relic;
- resurrection item chance;
- special token.

## 8.5 Boss rewards

Prefer meaningful reward choice where useful:

~~~text
Choose 1 of 3
- equipment
- rare currency
- relic/special item
~~~

RNG remains relevant but the player gets some agency.

## 8.6 Performance rewards

Optional bonuses for:

- high accuracy;
- no miss;
- streak;
- fast clear;
- objective completion.

These must not require unrealistic WPM for the selected global difficulty.

## 8.7 Knowledge/meta progress does not roll back

Do not erase information the player already discovered:

- Codex discovery;
- enemy first-seen;
- story log;
- tutorial;
- highest-ever stage;
- achievement discovery.

Economic/permanent build gains inside an uncommitted segment do roll back unless protected.

---

# 9. Shop system

Shops may sell resurrection items, but availability is random and stock is finite per shop encounter.

Player storage is not capped by this rule.

## 9.1 Shop types

Target set:

- Normal Shop;
- Station Shop;
- Traveling/Random Merchant;
- Black Market;
- Hidden Shop;
- Event Shop;
- Upgrade/Service Station.

## 9.2 Random stock

A shop instance receives a deterministic inventory roll using:

- shop type;
- World;
- stage/sector;
- seed;
- progression;
- Luck within capped influence;
- unlock state.

The result is persisted in active segment/crash recovery.

Reloading the page must not reroll the same shop to hunt Phoenix Cores.

## 9.3 Limited stock

Example:

~~~text
Salvage Anchor x1
Stage Revival Core x1
Phoenix Core x0
~~~

Buying the stock removes it from that shop instance.

Another shop later receives its own independent roll.

## 9.4 Currency preference

Different shops may prefer different payment combinations:

- Normal -> Credits;
- Service -> Credits + Alloy;
- Black Market -> Credits + Star Crystal;
- Hidden Merchant -> Star Crystal / special token;
- Ancient/Endgame Station -> Quantum Core;
- Event Shop -> Event Token.

---

# 10. World/Map system

World identity is a gameplay system, not a background skin.

Each World owns a `WorldProfile`.

Suggested contract:

~~~text
WorldProfile
- id
- name
- galaxy
- stageStart
- stageEnd
- visualTheme
- backgroundProfile
- ambientProfile
- enemyFamilies
- enemyRoster
- rankDistribution
- elitePool
- apexPool
- miniBoss
- worldBoss
- worldRules
- environmentalHazards
- wordAffinity
- rewardPool
- shopPool
- hiddenEventPool
- hiddenChallengePool
- musicProfile
- transitionPresentation
~~~

World profile is resolved once per stage/route transition, not scanned every frame.

## 10.1 Main World count

Target:

~~~text
50 Main Worlds
5 Worlds / Galaxy
20 Campaign stages / World
~~~

Hidden Worlds are extra and do not consume numbered Campaign stages.

## 10.2 Enemy/boss identity rule

A World must not merely recolor generic enemies.

The World must influence:

- names;
- silhouettes/components;
- family;
- archetype mix;
- skills;
- CC effects;
- formations;
- Mini Boss;
- World Boss;
- environment;
- rewards;
- shop/event pool.

Reusable archetypes are allowed, but their presentation and signature mechanics must fit the World.

## 10.3 Dynamic World Music System

Background music is part of World identity and must be designed together with visuals, enemy families and bosses.

The game currently has SFX/pronunciation/announcer foundations, but the expansion requires a real BGM/ambient runtime.

Each World owns a `WorldMusicProfile` referenced by `WorldProfile.musicProfile`.

Suggested contract:

~~~text
WorldMusicProfile
- id
- baseTrack
- ambientLayers
- intenseTrackOrLayer
- miniBossTrack
- worldBossTrack
- galaxyBossTrack
- championHuntTrack
- hiddenChallengeTrack
- hiddenWorldTrack
- shopTrack
- stationTrack
- victoryStinger
- defeatStinger
- transitionStinger
- crossfadeSeconds
- duckingProfile
- preloadHints
~~~

Not every field must point to a unique file. A World may reuse one base composition with extra layers or intensity states where that produces a better result and keeps asset size reasonable.

### 10.3.1 Music state machine

Use an explicit music state instead of ad-hoc play/stop calls.

Target states:

~~~text
SILENT
WORLD_NORMAL
WORLD_INTENSE
MINI_BOSS
WORLD_BOSS
GALAXY_BOSS
CHAMPION_HUNT
HIDDEN_CHALLENGE
HIDDEN_WORLD
SHOP
STATION
VICTORY
DEFEAT
TRANSITION
~~~

State changes are driven by production gameplay events.

Examples:

~~~text
enter World
-> WORLD_NORMAL

Elite/Apex pressure rises
-> WORLD_INTENSE

pressure clears
-> WORLD_NORMAL

enter Mini Boss
-> MINI_BOSS

enter World Boss
-> WORLD_BOSS

enter Galaxy Major Boss
-> GALAXY_BOSS

enter Champion Hunt
-> CHAMPION_HUNT

open Shop/Station
-> SHOP / STATION

boss defeated
-> duck/stop combat music
-> boss-death SFX
-> VICTORY stinger
~~~

Do not restart the same track from the beginning every time a short state changes if a seamless layer transition is possible.

### 10.3.2 Crossfade

Music transitions must not hard-cut unless the design intentionally calls for a dramatic stop.

Default behavior:

- fade outgoing music down;
- begin/fade incoming music up;
- preserve a small overlap window;
- cancel stale transitions if a newer state arrives.

Suggested initial crossfade target:

~~~text
1.5-2.5 seconds for World/route transitions
0.4-1.0 seconds for combat intensity changes
short intentional cut/impact for selected boss/victory moments
~~~

Exact values must be configurable and validated by manual playtest.

### 10.3.3 Layered intensity

Where practical, prefer layered music over loading many nearly identical full tracks.

Example:

~~~text
WORLD_NORMAL
= base pad + rhythm

WORLD_INTENSE
= base pad + rhythm + percussion/intense layer

BOSS PHASE 2
= boss base + stronger percussion

BOSS PHASE 3
= boss base + high-intensity layer
~~~

The system may use:

- synchronized stems;
- alternate tracks;
- one-shot stingers;
- filtered/volume automation.

Do not require every World to use stems if a simple crossfade is enough.

### 10.3.4 Ambient layer

Each World may have a low-volume environmental ambience independent of the musical track.

Examples:

- Frozen World -> wind, distant ice crack;
- Forest -> wind/leaves/insects;
- Shadow -> low drone/whispers;
- Machine -> machinery/hum;
- Demon -> fire/low rumble;
- Ocean -> deep water/pressure;
- Angel -> airy/choir-like ambience;
- Void -> sub drone/anomaly noise.

Ambient must remain below important gameplay audio and should be looped/cached efficiently.

### 10.3.5 Audio priority and ducking

Typing/pronunciation and warnings must remain intelligible.

Target priority:

~~~text
Announcer / critical pronunciation
> critical warning
> normal pronunciation / typing feedback
> combat SFX
> BGM
> ambient
~~~

When a high-priority event occurs:

- BGM ducks smoothly;
- ambient ducks more strongly;
- announcer/pronunciation remains clear;
- music recovers smoothly after the event.

Examples:

~~~text
DOUBLE KILL
-> BGM duck
-> announcer plays
-> BGM restores

pronunciation starts
-> BGM/ambient duck slightly
-> pronunciation ends
-> restore

boss warning
-> BGM may duck or transition
-> warning remains readable
~~~

The existing SFX/pronunciation event infrastructure should be extended rather than creating an unrelated audio pipeline.

### 10.3.6 Separate volume controls

Settings should ultimately expose separate user controls for:

- Master;
- Music;
- Ambient;
- SFX;
- Pronunciation;
- Announcer.

If UI scope must be staged, Music + Ambient may first share one control, but the runtime should keep their gain buses separate.

### 10.3.7 World and stage-type mapping

The music resolver receives:

- current World;
- current route/stage type;
- boss type/phase;
- combat intensity;
- hidden/shop/station state.

Resolution order should be deterministic.

Example precedence:

~~~text
Galaxy Boss
> World Boss
> Mini Boss
> Champion Hunt / Hidden Challenge / Hidden World
> Shop / Station
> World Intense
> World Normal
~~~

A specific authored override may supersede this order when explicitly configured.

### 10.3.8 Boss music behavior

Boss music is not just another random track.

Required behavior:

- boss entrance stinger/transition;
- dedicated Mini Boss/World Boss/Galaxy Boss state;
- phase changes can add layers or change intensity;
- boss death must leave room for death impact and victory stinger;
- returning to route/World music uses a controlled transition.

Do not restart full boss music on every phase.

### 10.3.9 Champion Hunt / multi-kill interaction

Champion Hunt / Apex Gauntlet receives its own optional music state.

The Priority Kill Chain announcer must temporarily duck this music so:

- Double Kill;
- Triple Kill;
- Ultra Kill;
- Rampage;
- Monster Kill

remain clearly audible.

Music escalation and announcer escalation may reinforce one another, but must not compete for the same frequency/volume space.

### 10.3.10 Asset layout and local overrides

Repository-owned, redistributable/default audio may live under:

~~~text
public/assets/audio/music/
public/assets/audio/ambient/
public/assets/audio/stingers/
~~~

Private/local-only replacements may live under:

~~~text
public/local-assets/music/
public/local-assets/ambient/
public/local-assets/announcer/
~~~

Local-only folders are governed by `docs/LOCAL_ASSETS_README.md` and must remain review-required before any public deployment.

The runtime must not crash if local overrides are absent.

Preferred resolution:

~~~text
explicit valid local override
-> use local asset

otherwise
-> use repository/default asset

asset missing/failed
-> fail soft, continue gameplay without blocking combat
~~~

Do not perform synchronous network/file probing in the combat frame loop. Resolve/cache asset availability outside hot paths.

### 10.3.11 Track count strategy

Do not create one song per Campaign stage.

A practical target is:

- one identifiable base theme per Main World;
- reusable or World-specific ambient layer;
- special boss/galaxy themes where valuable;
- reusable Champion Hunt/Hidden/Shop/Station themes where appropriate;
- stingers for transitions/victory/defeat.

For 50 Worlds this may result in roughly 50 core World themes plus a smaller collection of boss/special-state tracks, rather than hundreds or thousands of files.

Content quality and clear World identity matter more than raw track count.

### 10.3.12 Audio runtime architecture

Use a dedicated music controller layered on top of the existing audio architecture, not scattered `new Audio()` calls around gameplay.

Target responsibilities:

~~~text
MusicController
- resolveMusicState()
- transitionTo(state)
- setWorldProfile(profile)
- setIntensity(level)
- setBossPhase(phase)
- duck(reason)
- releaseDuck(reason)
- setMusicVolume()
- setAmbientVolume()
- preloadNext()
- stop()
- destroy()
~~~

Implementation may use Web Audio gain nodes, HTMLAudio media elements routed through Web Audio, or another lightweight browser-native solution, but it must support:

- loop;
- crossfade;
- separate music/ambient gain;
- ducking;
- cleanup;
- no leaking audio elements;
- no duplicate playback after pause/restart;
- mobile/browser autoplay constraints.

### 10.3.13 Performance requirements

- resolve World music once on World/stage transition;
- no full music registry scan every frame;
- no decoding/loading all 50 Worlds at startup;
- preload only current/next likely tracks;
- cap simultaneous stems/layers;
- release unused media/buffers;
- pause/suspend cleanly when the game is paused/backgrounded where appropriate;
- do not let failed audio loads break gameplay.

---

# 11. Proposed 50-World content map

# 11. Proposed 50-World content map

Names are working names and may be refined, but the 50-slot structure is intentional.

## Galaxy 01 — Frontier Awakening

1. Star Frontier — scouts, raiders, basic shields — Boss: Frontier Warden
2. Monster Planet — beasts, parasites, mutants — Boss: Planet Devourer
3. Crystal Moon — crystal/prism defense — Boss: Lunar Prism Beast
4. Ancient Machine Colony — drones, repair units, turrets — Boss: Colony Core
5. Solar Citadel — solar knights and machines — Galaxy Boss: Solar Sovereign

## Galaxy 02 — Verdant Dominion

6. Endless Forest — plants, fairies, healers — Boss: Ancient Treant
7. Fungal Depths — spores, poison, swarm support — Boss: Mycelium Queen
8. Thorn Wastes — armor/thorns/root — Boss: Thorn Colossus
9. Spirit Grove — spirits, charm/control, healing — Boss: Grove Oracle
10. World Tree Heart — mixed Nature apex roster — Galaxy Boss: Heart of Yggra

## Galaxy 03 — Frozen Expanse

11. Snowbound Reach — frost scouts and slow — Boss: Snowfang Alpha
12. Glacier Caverns — ice armor and shields — Boss: Glacier Keeper
13. Aurora Sky — fast frost spirits, light effects — Boss: Aurora Seraph
14. Frozen Empire — frost knights, Freeze control — Boss: Glacier Queen
15. Eternal Winter Core — combined frost mechanics — Galaxy Boss: Winter Emperor

## Galaxy 04 — Celestial Realms

16. Sky Kingdom — winged guards, barrier support — Boss: Sky Regent
17. Angelic Realm — heal, barrier, judgment — Boss: Archangel Core
18. Moon Temple — lunar spirits, marks, phases — Boss: Moon Oracle
19. Fallen Heaven — corrupted angel mechanics — Boss: Fallen Seraph King
20. Celestial Gate — angel/cosmic convergence — Galaxy Boss: Celestial Judge

## Galaxy 05 — Infernal Descent

21. Ash Wastes — burn and fragile attackers — Boss: Ash Behemoth
22. Volcanic Hell — magma armor and eruptions — Boss: Inferno Colossus
23. Demon City — imps, casters, berserkers — Boss: Crown Demon
24. Blood Moon Valley — curse/drain/risk — Boss: Blood Moon Reaver
25. Abyssal Throne — full infernal roster — Galaxy Boss: Demon Lord

## Galaxy 06 — Dominion of Darkness

26. Haunted Ruins — ghosts, curses, haunted armor — Boss: Ancient Wraith
27. Shadow Realm — cloak, darkness, hidden information — Boss: Shadow Sovereign
28. Nightmare City — fear, scramble, assassins — Boss: Nightmare Architect
29. Grave Nebula — spectral/cosmic hybrid — Boss: Grave Star
30. Eclipse Dominion — mixed dark apex roster — Galaxy Boss: Eclipse King

## Galaxy 07 — Bio-Abyss

31. Coral Orbit — aquatic swarm/support — Boss: Coral Titan
32. Abyssal Ocean — deep-sea pressure and concealment — Boss: Abyss Leviathan
33. Toxic Wasteland — poison, mutation, corrosion — Boss: Plague Titan
34. Bio-Lab Planet — engineered splitters/healers — Boss: Genesis Engine
35. Leviathan Trench — bio/ocean apex roster — Galaxy Boss: Prime Leviathan

## Galaxy 08 — Fractured Dimensions

36. Prism Dimension — reflect/shield/crystal — Boss: Prism Monarch
37. Mirror World — copies, reflect, target deception — Boss: Mirror Queen
38. Time Fracture — delayed/reordered pressure windows — Boss: Chrono Warden
39. Gravity Labyrinth — gravity/control/formation distortion — Boss: Gravity Tyrant
40. Reality Nexus — combined dimensional mechanics — Galaxy Boss: Nexus Architect

## Galaxy 09 — Cosmic Void

41. Void Frontier — void eyes, drain, silence — Boss: Void Eye
42. Star Graveyard — dead stars, spectral cosmic units — Boss: Star Eater
43. Black Hole Ring — gravity, pressure, slow heavy threats — Boss: Event Horizon
44. Anomaly Sea — unstable mixed mechanics — Boss: Anomaly Heart
45. Cosmic Cathedral — cosmic/angel/shadow convergence — Galaxy Boss: Cosmic Emperor

## Galaxy 10 — End of Worlds

46. Ascendant Machine — advanced machines and adaptation — Boss: Omega Core
47. Fallen Celestial — corrupted divine/cosmic mix — Boss: Broken Seraph
48. Chaos Garden — Nature/Demon/Void hybrid — Boss: Chaos Bloom
49. End of Time — remix of prior mechanics with strict budgets — Boss: Last Warden
50. Emperor's Throne — final curated apex roster — Final Galaxy Boss: Sovereign of the End

## 11.1 World uniqueness requirement

Before a World is accepted, it must prove at least:

- one distinct visual/environment identity;
- one distinct roster combination;
- one distinct World rule or hazard;
- one distinct reward/shop/event tendency;
- one Mini Boss identity;
- one World Boss identity;
- at least one typing-specific mechanic that is not merely numeric scaling.

---

# 12. Branching Route Map

The Campaign stage number remains sequential. Route choice enriches how the player reaches the next numbered encounter; it does not delete the 001-1000 structure.

Suggested node types:

- Combat;
- Elite;
- Apex;
- Shop;
- Station;
- Repair;
- Event;
- Treasure;
- Hidden Signal;
- Hidden Challenge;
- Mystery.

## 12.1 Deterministic route generation

Route graph generation must use a saved seed.

Required guarantees:

- at least one valid path to the sector end;
- no impossible disconnected route;
- no reroll on reload;
- stage continuity remains valid;
- route choices are persisted in crash recovery;
- route choice does not bypass mandatory Mini Boss/World Boss.

## 12.2 Performance

Route UI does not run the combat loop.

Use lightweight DOM or a simple static Canvas layer.

Do not animate every route node at 60 FPS when the map is idle.

---

# 13. Hidden Challenge stages

This replaces the idea of random modifiers being the main special-stage feature.

Hidden Challenge stages are optional bonus encounters.

They may be discovered through:

- Hidden Signal route node;
- secret event;
- rare item/key;
- World-specific discovery;
- Hidden Shop information;
- boss/event reward.

The player may:

- enter;
- choose a challenge tier;
- skip and continue the normal route.

## 13.1 Challenge tiers

Challenge tier is independent from the global typing difficulty.

Example relative choices:

~~~text
Tier I   -> moderately harder -> better reward
Tier II  -> strongly harder   -> high reward
Tier III -> extreme risk      -> premium reward pool
~~~

Exact names can be themed per World.

Difficulty must scale from the player's selected global mode, not use a fixed WPM assumption.

## 13.2 Failure

Because entering is optional and rewards are meaningful, a death inside a Hidden Challenge uses the normal death/resurrection/checkpoint rules unless a particular challenge explicitly states otherwise.

## 13.3 Hidden World

Some rare discoveries may lead to a 1-5 encounter Hidden World.

Hidden Worlds:

- do not change the numbered Campaign stage;
- use their own theme/roster/boss;
- offer premium rewards;
- are saved deterministically for crash recovery.


## 13.4 Champion Hunt / Apex Gauntlet

Add an optional high-pressure stage type designed around chained kills of priority targets rather than normal enemies.

Eligible kill-chain targets:

- Elite;
- Apex;
- Champion;
- future authored priority targets.

Normal enemies do not advance the announcer chain. World Boss/Galaxy Major Boss defeats use their own boss-defeat presentation rather than the normal multi-kill chain.

Initial announcer milestones:

~~~text
2 -> Double Kill
3 -> Triple Kill
4 -> Ultra Kill
5 -> Rampage
6 -> Monster Kill
~~~

The stage may spawn priority targets sequentially or in bounded formations. It must still obey Active Typing Pressure and global difficulty budgets.

Audio architecture:

- announcer playback goes through the existing SFX lifecycle;
- one repository-owned base audio asset is the safe fallback;
- each milestone has an independent asset mapping;
- local/private announcer files may later replace each mapping without changing kill-chain logic;
- local third-party announcer assets remain subject to `docs/LOCAL_ASSETS_README.md`.

The kill-chain window must ultimately be resolved from global difficulty rather than one hardcoded value. The first implementation may use a temporary default window until M11 owns the final difficulty-specific timing.

---

# 14. Enemy Threat Rank system

Normal/Elite/Apex enemies use ten clear ranks.

Mini Boss and Boss are separate classes and are not Rank XI/XII.

Suggested ranks:

~~~text
Rank I
Rank II
Rank III
Rank IV
Rank V
Rank VI
Rank VII
Rank VIII
Rank IX
Rank X / Apex-level normal enemy
~~~

## 14.1 Rank dimensions

Rank is derived from a combination of:

- word difficulty;
- typing layers;
- skill budget;
- defensive budget;
- offensive budget;
- support/control budget;
- urgency/reaction window.

Rank must not simply equal HP.

## 14.2 Default typing-layer bands

Recommended baseline:

~~~text
Rank I-III   -> usually 1 word layer
Rank IV-VI   -> usually 2 word layers
Rank VII-X   -> usually 3 word layers
~~~

Exceptions are allowed for archetype balance.

Example three-layer enemy:

~~~text
Shield word
-> break Shield
Armor word appears
-> break Armor
Core word appears
-> kill
~~~

Each layer requires a complete correct word.

## 14.3 Layer identity

Layers may have gameplay meaning:

- Shield -> protects from control/stagger;
- Armor -> reduces special damage or blocks a mechanic;
- Core -> final kill layer;
- Ward -> resists status;
- Spell Barrier -> must be interrupted first.

Breaking a layer may change the enemy's behavior.

---

# 15. Word Difficulty Score

Rank cannot be based only on character count.

Define a deterministic `WordDifficultyScore` using available vocabulary metadata and safe heuristics such as:

- selected Vocabulary Level;
- character count;
- phrase/token count;
- spelling pattern complexity;
- repeated/awkward letter transitions;
- rarity/familiarity metadata if reliable data becomes available.

Do not fabricate linguistic rarity data that the shared corpus does not contain.

If only current fields are available, use deterministic heuristics and document them.

## 15.1 Difficulty mode interaction

Global difficulty selects a fair band from the currently selected vocabulary source.

It must not silently switch the player to an unrelated vocabulary level.

Higher Rank may:

- select harder words within the available set;
- require more layers;
- use phrases only where supported.

---

# 16. Enemy archetypes

Build a reusable set of gameplay archetypes, then express them differently by World.

Target archetypes:

- Assault;
- Tank;
- Defender;
- Sniper;
- Assassin;
- Support;
- Healer;
- Controller;
- Summoner;
- Leech;
- Splitter;
- Commander;
- Bomber;
- Trickster.

Examples:

- Angel Support -> barrier/heal;
- Forest Support -> regeneration/root buff;
- Dark Support -> curse/darkness;
- Machine Support -> repair/shield network.

Reuse behavior contracts where possible, but keep World-specific names, visuals and signature skills.

---

# 17. Enemy skill/effect system

Enemy skills should primarily create typing pressure.

## 17.1 Effect families

### Attack

- projectile;
- beam;
- charge;
- explosion;
- burn/poison damage;
- drain;
- delayed strike.

### Defense

- Shield;
- Armor;
- Reflect;
- Cloak;
- regeneration;
- temporary immunity;
- ally shield.

### Control / typing pressure

- Freeze;
- Petrify;
- Darkness;
- Jam;
- Curse;
- Bind/Root;
- Silence;
- Fear;
- Scramble;
- Gravity;
- Infection;
- Energy/Shield Drain.

### Support

- heal;
- buff;
- shield ally;
- summon;
- repair;
- resurrect weak ally;
- accelerate ally cast.

## 17.2 Fair implementations for typing impairment

Examples:

### Freeze

Do not add invisible keyboard latency.

Fair options:

- short visible typing lock with clear frozen overlay;
- thaw word that immediately ends Freeze;
- delayed next-word reveal;
- longer target-switch acquisition.

Freeze caster must pay with low defense/speed or long cooldown.

### Petrify

Possible effects:

- temporarily lock active abilities;
- require a break word;
- slow target switching.

Do not chain indefinitely.

### Darkness

- hide part of the untyped word;
- reveal progressively;
- keep current typed progress visible.

### Jam

- hide non-essential assistance such as translation/IPA;
- interfere with target-assist UI;
- never corrupt the actual required answer.

### Curse

- increases miss/streak penalty temporarily;
- must be clearly visible.

### Bind

- a short break word removes it;
- caster should have weak offense.

### Silence

- locks player skills briefly;
- does not block ordinary typing;
- receives hard anti-chain rules.

### Scramble

Use careful, deterministic visual reveal mechanics. Do not randomly reorder the actual answer after the player has started typing.

## 17.3 CC anti-lock rules

Hard requirements:

- hard CC has immunity/resistance after expiration;
- Relax/Balanced cannot stack multiple strong hard CC effects;
- no infinite Freeze/Petrify/Silence chain;
- strong CC requires telegraph;
- player must have a readable counter;
- bosses separate hard CC windows from dense projectile windows;
- lower difficulties shorten CC and lengthen enemy cooldowns.

---

# 18. Threat Budget

Every enemy runtime profile receives a bounded threat budget distributed among:

~~~text
Attack
Defense
Speed
Control
Support
Typing Difficulty
Layer Count
Urgency
~~~

High values in one axis reduce the room available in others.

The system should support explicit authored overrides for bosses/special enemies, but normal enemy definitions must pass an audit.

CI audit should reject obvious invalid combinations such as a normal enemy exceeding configured caps in too many threat dimensions.

---

# 19. Active Typing Pressure and spawn balancing

Enemy count alone is not enough.

Define an `ActiveTypingPressure` metric using inputs such as:

- remaining required characters;
- remaining layers;
- estimated typing time at selected difficulty target;
- time-to-impact;
- cast deadline;
- projectile urgency;
- CC severity;
- support priority;
- boss mechanic pressure.

The spawn scheduler may only create new threats when the projected pressure remains inside the selected difficulty budget.

## 19.1 Urgent threat cap

Maintain explicit caps for simultaneous urgent enemies.

Example concept:

- Relax -> very low urgent-threat cap;
- Balanced -> low/moderate;
- Hard -> moderate;
- Extreme -> high but bounded;
- Nightmare -> advanced formations;
- Impossible -> maximum authored pressure, still mathematically feasible for the target band.

## 19.2 Formation budget

Formation examples:

- Tank + Healer;
- Commander + Scouts;
- Defender + Sniper;
- Controller + Assassin;
- Summoner + fragile support.

A formation is one budgeted encounter package.

Do not independently spawn each member without checking aggregate typing pressure.

---

# 20. Difficulty framework

Target player-facing modes and recommended typing bands:

| Mode | Recommended WPM |
| --- | ---: |
| Relax | 10-30 |
| Balanced | 40-70 |
| Hard | 70-100 |
| Extreme | 100-140 |
| Nightmare | 150-200 |
| Impossible | 250-300 |

Also retain:

- Adaptive;
- Custom.

These are recommended bands, not account restrictions.

## 20.1 Difficulty screen

Show clearly:

- recommended WPM;
- enemy density;
- CC pressure;
- reaction window;
- formation complexity;
- reward multiplier.

## 20.2 Typing-time model

Use the standard approximation already used by the project:

~~~text
estimated typing seconds ~= character count * 12 / WPM
~~~

Then add:

- visual acquisition time;
- target-switch time;
- mechanic overhead;
- fair reaction buffer.

Do not scale enemy speed linearly with WPM.

## 20.3 Difficulty dimensions

Each mode defines bounds for:

- max active enemies;
- urgent-threat cap;
- spawn interval;
- attack interval;
- projectile pressure;
- word-score band;
- layer probability;
- controller/support density;
- hard-CC duration;
- CC immunity duration;
- elite/apex chance;
- boss phase aggression;
- Hidden Challenge multiplier;
- reward multiplier.

## 20.4 Adaptive mode

Adaptive uses smoothed recent valid Campaign performance.

It must:

- adjust mainly between stages/checkpoints;
- avoid sharp mid-word changes;
- never cancel player improvement through aggressive rubber-banding;
- stay inside global safety caps.

---

# 21. World-specific skill language

Worlds should teach a coherent mechanic language.

Examples:

- Frozen Worlds -> Freeze, Slow, Ice Shield;
- Dark Worlds -> Darkness, Fear, Cloak, Curse;
- Ancient/Stone Worlds -> Petrify, Armor, heavy slow attacks;
- Angel Worlds -> Barrier, Heal, Resurrection, Judgment;
- Demon Worlds -> Burn, Curse, Berserk, Sacrifice;
- Forest Worlds -> Root, Regeneration, Poison, Pollen;
- Machine Worlds -> Jam, Lock-on, Repair, Shield Network;
- Dimensional Worlds -> Reflect, Gravity, Time Delay, Mirror;
- Void Worlds -> Silence, Drain, Distortion, Gravity.

A later World may remix earlier effects, but must introduce at least one new interaction or composition.

---

# 22. Enemy progression inside each World

Recommended 20-stage curve:

~~~text
01-04 -> Rank I-III introduction
05-09 -> Rank II-V combinations
10    -> Mini Boss + checkpoint
11-14 -> Rank III-VI
15-17 -> Rank IV-VIII
18-19 -> Rank VI-X / Elite-Apex formations
20    -> World Boss + checkpoint
~~~

Global difficulty changes pressure, not access to the roster.

A Relax player can still meet late-game Rank X enemies, but with:

- easier word selection inside the chosen vocabulary;
- longer attack windows;
- lower simultaneous pressure;
- shorter CC;
- fewer dangerous combinations.

---

# 23. Boss hierarchy and typing mechanics

## 23.1 Mini Boss

- sector climax;
- multiple typing layers/sequences;
- 2-3 signature mechanics;
- at least two behavior states where useful;
- World-specific identity.

## 23.2 World Boss

- stage 20 of each World;
- multiple phases;
- phrase/sequence/interrupt mechanics;
- tests the mechanics taught by the World;
- dedicated visual/audio identity.

## 23.3 Galaxy Major Boss

- every 100 stages;
- combines lessons from the five Worlds in the Galaxy;
- phase-based mechanic remix;
- premium reward.

## 23.4 Boss typing examples

- charge -> type INTERRUPT word before timer;
- shield phase -> complete sequence to break shield;
- weak point -> long word for high damage;
- rage -> short rapid words;
- curse phase -> accuracy challenge;
- summon phase -> choose boss or support target.

Do not activate all mechanics at once.

---

# 24. Stage Objectives

Add optional/required objective contracts using event-driven counters.

Initial objective types:

- survive for N seconds;
- maintain accuracy >= target;
- no-miss challenge;
- protect a target;
- kill commander first;
- destroy marked enemy before escape;
- defeat N Elite enemies;
- clear before timer.

Objectives must subscribe to gameplay events rather than scan the full game state every frame.

Reward difficulty must scale with global mode.

---

# 25. Run Relics / Artifacts

Relics create temporary build variety for a run/sector/World depending on final design.

Examples:

- first correct word each stage heals;
- perfect word triggers chain lightning;
- every 20 streak freezes one enemy;
- long words gain damage;
- a mistake consumes Shield instead of streak once;
- World-specific relic interactions.

## 25.1 Performance rule

Do not loop through every relic on every frame/keystroke.

When relic loadout changes, compile it into a `CompiledRelicEffects` structure with direct fields/hooks.

---

# 26. Station / Camp system

Stations are non-combat route nodes.

Possible actions:

- repair;
- Service Shop;
- equipment enhancement;
- dismantle;
- affix reroll;
- change support spell;
- manage relics;
- limited merchant;
- identify hidden route;
- optional risk/reward service.

Station inventory/state is deterministic and saved for crash recovery.

---

# 27. Upgrade systems

## 27.1 Existing systems to retain

Current code already has:

- Character Level;
- Character Mastery;
- Talent branches;
- equipment enhancement +0 to +5;
- equipment loadout;
- stat pipeline.

Extend them rather than replace them.

## 27.2 Equipment enhancement

Keep:

~~~text
+0 -> +1 -> +2 -> +3 -> +4 -> +5
~~~

New economy:

- early enhancement -> Credits + Alloy;
- high enhancement -> more Alloy;
- top enhancement/evolution may require Star Crystal.

## 27.3 Equipment grade evolution

Optional advanced service:

~~~text
Silver +5 -> Gold +0
Gold +5   -> Diamond +0
~~~

Requires rare material/currency and a suitable Station.

Balance carefully so direct high-grade drops remain exciting.

## 27.4 Affixes

Introduce only after core grade/economy is stable.

Potential actions:

- roll affix;
- reroll one affix;
- lock one affix at extra cost.

Do not generate dozens of meaningless +1% affixes.

## 27.5 Dismantling

Equipment may dismantle primarily into Alloy and possibly rare material by grade.

## 27.6 Skill upgrades

Current combat skills have fixed definitions. Add explicit progression:

~~~text
Skill Lv1 -> Lv2 -> Lv3 -> Lv4 -> Lv5
~~~

Higher levels may improve:

- duration;
- damage;
- cooldown;
- energy efficiency;
- charges;
- secondary mechanic.

At least some top upgrades should add behavior, not only numbers.

Skill grade may use Aluminum/Copper/Silver/Gold/Diamond where appropriate, but avoid duplicating both level and grade unless each has a clear role.

## 27.7 Core attribute upgrades

Allow controlled permanent upgrades to:

- Hull;
- Shield;
- Firepower;
- Armor;
- Energy;
- Reactor;
- Focus;
- Ward;
- Luck;
- Salvage.

Use:

- level gates;
- escalating cost;
- soft/hard caps;
- Credits/Alloy and rare material at high levels.

Luck and Salvage require stricter caps/cost curves because they affect the whole reward economy.

## 27.8 Checkpoint interaction

Any permanent upgrade paid for with uncommitted segment resources remains part of active segment state.

Death without protection restores the committed checkpoint state, including pre-upgrade values.

Using Salvage Anchor preserves the upgrade.

This prevents spending uncommitted loot from becoming a rollback loophole.

---

# 28. Codex

Codex should record:

- World discovery;
- enemy discovery;
- enemy Rank;
- kills;
- skills/effects;
- weakness/counter hints after discovery;
- Mini Boss/World Boss/Galaxy Boss records;
- best WPM/accuracy;
- equipment discovery;
- item/relic discovery;
- hidden content;
- highest reached stage;
- completion percentage.

Codex knowledge survives gameplay rollback.

Do not write IndexedDB on every keystroke. Accumulate stage-local counters and flush at safe transitions.

---

# 29. Ascension / New Game+

After Stage 1000:

- keep the 50-World Campaign;
- add Ascension tiers;
- remix World rules;
- increase formation/Rank pressure inside safety models;
- add boss mutations;
- improve reward tables;
- introduce rare endgame rewards.

Do not create another endless list of Stage 1001-2000 unless a later design explicitly chooses that direction.

---

# 30. Performance architecture

These systems should not materially reduce combat performance when implemented correctly.

## 30.1 Resolve once, consume cheaply

At stage start resolve:

- World profile;
- global difficulty profile;
- route modifiers;
- objective;
- enemy rank bands;
- reward profile.

At enemy spawn resolve:

- EnemyRuntimeProfile;
- chosen skills;
- word layers;
- threat budget.

Combat loop should read the resolved runtime profile rather than scan registries.

## 30.2 Bounded state

Keep hard bounds for:

- active enemies;
- projectiles;
- particles;
- urgent threats;
- support/controller count;
- boss effects.

## 30.3 Persistence

Do not deep-clone full PlayerSave every frame.

Write snapshots on:

- stage transition;
- route selection;
- shop/upgrade transaction;
- checkpoint;
- death resolution;
- page lifecycle;
- other explicit safe boundaries.

## 30.4 Asset loading

Load current/near-future World assets only.

Do not preload 50 full Worlds.

For music/ambient:

- preload the current track and only likely next transitions;
- avoid decoding all World themes at startup;
- cache small stingers when useful;
- release old World media after transition;
- keep a bounded number of simultaneous music/ambient layers.

Continue using procedural/cached fallback visuals where appropriate.

---

# 31. Save schema direction

Current PlayerSave must be extended through explicit migrations.

Expected new persistent domains include:

- checkpoint metadata;
- active segment metadata;
- crash recovery metadata/version;
- currencies;
- item grades;
- new resurrection items;
- World progress/discovery;
- route seed/choice state;
- shop instance stock;
- skill upgrades;
- permanent attribute upgrades;
- Codex expansion;
- Ascension;
- optional relic state.

Do not overwrite old schemas in place.

Every schema bump requires:

- sanitizer;
- migration;
- backup/import compatibility;
- unsupported-newer-version behavior;
- tests.

---

# 32. Developer QA/Test Lab

After the feature expansion through Ascension is implemented, build one configurable **Developer QA/Test Lab** before the full balance/performance audit.

Do not create 10-20 separate test stages for different enemy/item cases. The goal is one sandbox screen that can configure and reproduce nearly every important production runtime state quickly.

The Test Lab is outside the numbered Stage 001-1000 Campaign.

## 32.1 Production-runtime rule

The Test Lab must reuse the same production code paths for:

- enemy rendering;
- enemy ranks;
- enemy word layers;
- enemy skills;
- boss phases;
- player stats;
- enemy stats;
- combat damage;
- Shield/Armor/Hull;
- status effects and CC;
- projectiles;
- VFX;
- SFX;
- BGM/music state;
- ambient layers;
- announcer;
- audio ducking/crossfade;
- kill/death effects;
- items and consumables;
- equipment;
- skill execution;
- reward preview;
- shop inventory;
- death resolution;
- resurrection/protection items.

Do not implement fake Test-Lab-only combat behavior. A feature that works only in the Test Lab does not count as tested.

## 32.2 Single configurable test screen

The tester must be able to configure a scenario from one screen.

### World / environment controls

Allow selection of:

- any Main World;
- Hidden World/theme when implemented;
- World background/environment;
- World rules/hazards;
- route context where relevant;
- stage/sector/checkpoint context.

Changing World should optionally auto-load that World's recommended enemy/boss roster, while still allowing manual overrides.

### Music / audio controls

Allow:

- select any WorldMusicProfile;
- play World Normal;
- play World Intense;
- play Mini Boss;
- play World Boss;
- play Galaxy Boss;
- play Champion Hunt;
- play Hidden Challenge;
- play Hidden World;
- play Shop;
- play Station;
- trigger victory/defeat/transition stingers;
- force boss phase 1/2/3 music state;
- adjust Music/Ambient/SFX/Pronunciation/Announcer volumes;
- trigger announcer while music is playing;
- trigger pronunciation while music is playing;
- inspect current duck reasons and resolved gains;
- force duck/release duck;
- set crossfade duration;
- enable/disable ambient;
- inspect currently loaded/preloaded audio assets;
- stop/reset all music without resetting the whole Test Lab.

Required QA cases:

- no hard click/cut during ordinary transition;
- no duplicate loops after repeated state changes;
- announcer remains clear above music;
- pronunciation remains clear above music;
- boss phase transition does not restart the full track accidentally;
- missing local/default asset fails soft;
- World change releases old music correctly;
- rapid state changes settle on the latest requested state.

### Enemy controls

Allow:

- select any enemy definition;
- select multiple enemy types;
- spawn one;
- spawn N;
- spawn all selected;
- spawn all enemies from current World;
- remove one/all enemies;
- choose Rank I-X;
- override typing-layer count;
- override word-difficulty band;
- force Elite/Apex variant;
- choose archetype/family when valid;
- force skill list;
- force skill cooldown ready;
- trigger a specific enemy skill immediately;
- pause/resume enemy AI;
- set movement speed;
- set attack speed/cooldown;
- set attack damage;
- set defense/Armor;
- set Shield;
- set layer durability/runtime values;
- set status resistance;
- set support/heal strength;
- set threat-budget fields for validation;
- inspect resolved EnemyRuntimeProfile.

The tester must be able to display several different enemies simultaneously to verify:

- visual readability;
- formation interaction;
- overlapping skills;
- simultaneous status effects;
- kill effects;
- performance.

### Boss controls

Allow:

- select any Mini Boss;
- select any World Boss;
- select any Galaxy Major Boss;
- spawn one or several bosses in explicit stress mode;
- jump directly to phase;
- set boss HP;
- set shield/stagger state;
- force signature skill;
- force summon phase;
- force rage/enrage;
- force interrupt window;
- reset boss without resetting the entire lab.

Multi-boss mode is a QA/stress tool and does not imply that Campaign gameplay supports several major bosses at once.

## 32.3 Player configuration

Allow direct test configuration of:

- Hull;
- Shield;
- Armor;
- Firepower;
- Energy;
- Reactor;
- Focus;
- Ward;
- Luck;
- Salvage;
- Character;
- Character Level;
- Mastery;
- Talent ranks;
- permanent attribute upgrades;
- active/equipped combat skills;
- skill level/grade;
- support spells;
- equipment loadout;
- equipment grade;
- equipment enhancement;
- equipment affixes when implemented;
- relics;
- currencies.

Support:

- reset to production defaults;
- save local Test Lab preset;
- reload Test Lab preset;
- copy resolved effective stats for debugging.

## 32.4 Item / inventory sandbox

Allow selection and direct grant of any registered testable item.

Controls should include:

- Give x1;
- Give x5;
- Give x99;
- remove item;
- clear test inventory;
- set exact quantity;
- preview item definition and grade;
- use item normally through the production item path.

This includes:

- recovery consumables;
- repair/shield/energy items;
- special items;
- Relics where itemized;
- equipment;
- upgrade materials;
- currencies;
- Salvage Anchor;
- Stage Revival Core;
- Phoenix Core;
- future registered consumables.

The Test Lab must not require the player to wait for random drops just to verify an item.

## 32.5 Death modes

Provide at least two explicit modes.

### Immortal Mode

- Shield/Hull/resources take normal damage;
- status effects still apply;
- enemy skills still work;
- lethal damage is recorded;
- Hull is clamped to a safe minimum such as 1;
- Game Over is not entered.

Use this for long combat/VFX/status inspection.

### Real Death Mode

- Hull may reach 0;
- production death flow runs normally;
- Game Over/death-resolution UI appears;
- checkpoint/segment logic runs;
- resurrection/protection items may be selected;
- item consumption is real inside the sandbox session.

This mode is mandatory for validating resurrection items.

## 32.6 Checkpoint / segment / recovery scenario editor

The tester must be able to create scenarios such as:

~~~text
Checkpoint Stage = 181
Current Stage = 190
Segment Credits = +20000
Segment Alloy = +120
Segment Star Crystal = +2
Segment Equipment = Gold Weapon
Boss Phase = 2
Boss HP = 37%
~~~

Then trigger:

- Force Death;
- Force Crash Recovery;
- Use Salvage Anchor;
- Use Stage Revival Core;
- Use Phoenix Core;
- Return to checkpoint;
- Restart current stage;
- revive inside current encounter.

The resulting state must be inspectable so rollback/preservation bugs are visible immediately.

## 32.7 Death-item acceptance cases

At minimum test:

### No item

Death at Stage 190:

- rollback to Stage 181;
- uncommitted economic/build gains are lost.

### Salvage Anchor

Death at Stage 190:

- return to Stage 181;
- segment economic/build gains remain;
- item quantity decreases by one.

### Stage Revival Core

Death at Stage 190:

- restart Stage 190;
- correct pre-stage/segment state is preserved;
- reward duplication does not occur;
- item quantity decreases by one.

### Phoenix Core

Death during an encounter:

- continue in the same encounter;
- boss/enemy progress is preserved where specified;
- tuned resources are restored;
- grace/invulnerability window applies;
- item quantity decreases by one.

Also test:

- repeated deaths;
- multiple copies of the same resurrection item;
- all three items owned at once;
- zero quantity;
- death during CC;
- death during boss transition;
- death in Hidden Challenge;
- reload after a recorded death;
- crash before death;
- crash after item use.

## 32.8 Status-effect controls

Allow applying/removing production statuses directly to the player or enemy.

Examples:

- Freeze;
- Petrify;
- Darkness;
- Jam;
- Curse;
- Bind;
- Silence;
- Fear;
- Scramble;
- Gravity;
- Infection;
- Burn;
- Poison;
- Slow;
- future World-specific effects.

Controls:

- apply effect;
- choose duration;
- choose strength when supported;
- stack attempt;
- clear one;
- clear all;
- display immunity/resistance timers.

This is required to verify anti-chain and readability rules.

## 32.9 Skill controls

For player skills:

- select skill;
- select level/grade;
- set cooldown ready;
- set Energy;
- force activation;
- reset charges.

For enemy skills:

- select enemy;
- inspect available skills;
- force one skill;
- reset cooldown;
- disable skill;
- repeat skill for VFX/audio inspection.

For bosses:

- force signature mechanic;
- force interrupt word;
- force shield phase;
- force summon;
- force stagger;
- force phase transition.

## 32.10 Shop / economy sandbox

Allow spawning/configuring:

- Normal Shop;
- Station Shop;
- Traveling Merchant;
- Black Market;
- Hidden Shop;
- Event Shop;
- Service/Upgrade Station.

Allow:

- set shop seed;
- reroll only through an explicit QA action;
- inspect deterministic inventory;
- force a selected item into stock;
- set stock quantity;
- set price/currency for a test case;
- buy item through production purchase flow;
- verify stock decreases;
- reload sandbox and verify persisted test stock;
- reset sandbox to initial preset.

Test scenarios must include rare resurrection items.

## 32.11 Reward / loot controls

Allow:

- force enemy drop;
- force equipment drop;
- choose grade;
- force reward chest;
- force reward-choice screen;
- force Star Crystal/Quantum Core reward;
- force resurrection-item reward;
- simulate Luck/Salvage values;
- preview pity state;
- trigger kill reward VFX/SFX without permanently changing Campaign data.

## 32.12 Spawn and pressure controls

Allow:

- set max active enemies;
- set spawn interval;
- enable/disable automatic spawning;
- choose formation;
- spawn formation now;
- override Active Typing Pressure budget;
- inspect current/projected pressure;
- inspect urgent-threat count;
- freeze scheduler;
- step scheduler manually.

This must make it possible to reproduce "too many enemies at once" bugs without playing hundreds of stages.

## 32.13 Difficulty controls

Allow switching production difficulty profiles directly:

- Relax;
- Balanced;
- Hard;
- Extreme;
- Nightmare;
- Impossible;
- Adaptive;
- Custom.

Display the resolved runtime values used by the current scenario:

- target/recommended WPM;
- reaction window;
- max active enemies;
- urgent-threat cap;
- spawn interval;
- attack interval;
- CC duration multiplier;
- projectile pressure;
- layer probabilities;
- reward multiplier.

The Test Lab must use the production difficulty resolver.

## 32.14 Time/debug controls

Recommended QA controls:

- Pause;
- Resume;
- Slow Motion;
- single simulation step where practical;
- normal speed;
- accelerated cooldowns;
- reset arena;
- clear projectiles;
- clear particles;
- clear statuses;
- kill selected enemy;
- damage selected enemy;
- next typing layer;
- force word complete;
- toggle hitboxes/debug bounds;
- show enemy ids;
- show Rank;
- show active skill/cooldown;
- show Threat Budget;
- show Active Typing Pressure;
- show boss state/phase;
- show current World/route/checkpoint state.

## 32.15 State Inspector

Provide a readable inspector for:

- Committed Checkpoint State;
- Active Segment State;
- Crash Recovery State;
- current stage-entry snapshot;
- player effective stats;
- inventory;
- equipment;
- currencies;
- resurrection item quantities;
- current World;
- selected difficulty;
- current enemies;
- boss HP/phase;
- statuses;
- shop stock;
- route state;
- current objective;
- active relic effects;
- death reason;
- last persistence action.

This is a developer QA surface. Readability is more important than decorative UI.

## 32.16 Test state isolation

This is non-negotiable.

Test Lab state must not mutate the player's real Campaign progression.

Required separation:

~~~text
Production PlayerSave
!=
TestLab Session State
~~~

Allowed approaches:

- in-memory test state;
- dedicated TestLab IndexedDB namespace/store;
- sandbox copy of a production save that can never overwrite the source.

Test Lab actions must not:

- advance Campaign;
- permanently grant Credits/materials/items;
- unlock stages;
- consume production inventory;
- modify real checkpoint;
- farm Codex/achievements;
- change production shop stock.

If save migration itself is under test, use an explicit disposable sandbox copy.

## 32.17 Presets

Support reusable presets so common checks take seconds.

Examples:

- World Enemy Showcase;
- World Boss Showcase;
- Rank I-X comparison;
- 3-layer enemy showcase;
- Freeze/Petrify CC test;
- overlapping CC anti-chain test;
- projectile stress;
- formation pressure;
- low-WPM Relax scenario;
- Impossible 300-WPM scenario;
- Salvage Anchor death test;
- Stage Revival Core death test;
- Phoenix Core boss-phase test;
- Hidden Shop rare-item stock;
- checkpoint 181 -> death at 190;
- crash recovery at Stage 190;
- all reward VFX;
- all item-use VFX/SFX;
- World Normal -> Intense -> Normal music transition;
- World -> Mini Boss -> World Boss transition;
- World -> Galaxy Boss -> Victory transition;
- Shop/Station crossfade;
- Hidden Challenge / Hidden World music;
- pronunciation ducking over BGM;
- announcer ducking over BGM;
- missing-track fallback;
- rapid music-state transition stress;
- Double/Triple/Ultra/Rampage/Monster announcer chain;
- Champion Hunt / Apex Gauntlet chain timing.

Presets are configuration templates for the one Test Lab, not separate Campaign stages.

## 32.18 World coverage

Every World must be testable from the same screen.

For a selected World provide quick actions:

~~~text
Spawn World Roster
Spawn Mini Boss
Spawn World Boss
Spawn Galaxy Boss (when applicable)
Apply World Hazard
Load World Shop Pool
Load World Reward Pool
~~~

The World registry and Test Lab roster should share the same source data so newly added enemies/bosses cannot silently be omitted from QA.

## 32.19 Automated completeness audit

CI should verify that every registered production entity intended for runtime testing is discoverable by the Test Lab registry.

Audit at least:

- all 50 Worlds;
- all normal enemy definitions;
- Elite/Apex variants where separately registered;
- all Mini Bosses;
- all World Bosses;
- all Galaxy Major Bosses;
- all player consumables;
- all resurrection items;
- all equipment definitions;
- all currencies;
- all combat skills;
- all supported status effects;
- all shop types;
- every World has a valid music profile or an explicit documented fallback;
- every configured music/stinger asset id resolves to a registered asset mapping.

This does not replace manual Test Lab usage; it prevents missing entries.

## 32.20 Performance rule

The Test Lab itself may expose more debug information than Campaign, but debug panels must not accidentally ship expensive full-registry scans into normal combat.

All debug-only inspectors and selectors must be dormant outside Test Lab/debug mode.

---

# 33. Automated balance and simulation requirements

Before considering the expansion balanced, add deterministic simulation/audit coverage for:

- 1000-stage World mapping;
- exactly 50 main Worlds;
- checkpoint transitions;
- rollback correctness;
- crash recovery vs death;
- all three resurrection items;
- item consumption;
- no reward duplication after restart/recovery;
- shop deterministic stock;
- shop stock finite but player inventory unlimited;
- legacy rarity migration;
- currency sanitization;
- enemy Rank distribution;
- word-score bands;
- typing-layer bounds;
- Threat Budget;
- CC anti-chain rules;
- Active Typing Pressure;
- formation budget;
- global difficulty bands;
- reward multipliers;
- boss/world roster mapping;
- route reachability;
- Hidden Challenge determinism;
- Ascension bounds.

Use seeded RNG in tests/simulations.

---

# 34. Manual playtest matrix

Automated tests cannot certify game feel.

Manual validation should sample at least:

- each global difficulty;
- low/mid/high WPM reference players;
- early/mid/late Worlds;
- controller-heavy World;
- support-heavy World;
- three-layer Rank VII-X enemies;
- Mini Boss;
- World Boss;
- Galaxy Major Boss;
- Hidden Challenge;
- death rollback;
- all three resurrection items;
- random/hidden shops;
- route map;
- high/ultra visual quality;
- pronunciation mixed with combat audio.

Key questions:

- Is target text always readable?
- Can the player understand why typing is impaired?
- Is CC fair and counterable?
- Do formations create decisions instead of impossible overload?
- Does each World feel different?
- Do boss mechanics reflect their World?
- Does a ten-stage rollback feel meaningful but not punitive?
- Are resurrection items exciting rather than mandatory?
- Does economy create choices without too many currencies?

---

# 35. Implementation roadmap

Do not build all systems in one PR.

Every milestone requires tests, CI and docs before continuing.

## M00 — Source of truth

- add this plan;
- keep legacy docs intact;
- document conflicts/superseded rhythms.

## M01 — Domain contracts + next PlayerSave schema

**Status: Complete.** PlayerSave v15 and the M01 domain foundation are implemented with migration, strict backup validation, tests, and `docs/M01_DOMAIN_CONTRACTS.md`. Runtime checkpoint/death behavior remains intentionally deferred to M02-M04.

Add data contracts for:

- World;
- sector/checkpoint;
- active segment;
- crash recovery;
- new currencies;
- five grades;
- resurrection items.

No large UI rewrite yet.

## M02 — Ten-stage checkpoint + rollback

**Status: Complete.** PlayerSave v16 now persists a committed checkpoint snapshot, ten-stage frontier commits are active, ordinary gameplay death rolls back permanent/economic segment state, knowledge/meta records survive, and Stage Select cannot bypass the rolled-back frontier. See `docs/M02_CHECKPOINT_ROLLBACK.md`.

Implement:

- checkpoint every ten stages;
- committed state;
- active segment state;
- death rollback;
- highestReached separate from checkpoint;
- Stage Select anti-bypass rules.

## M03 — Crash recovery

**Status: Complete.** PlayerSave v17 now persists deterministic safe-transition crash recovery separately from the M02 committed checkpoint, real gameplay death invalidates technical recovery before rollback, page lifecycle handling does not promote unsafe mid-combat state, and load/import paths enforce anti-reload rollback. See `docs/M03_CRASH_RECOVERY.md`.

Implemented:

- technical recovery after safe transitions;
- death-invalid recovery;
- deterministic restoration;
- anti-reload exploit tests.

## M04 — Resurrection/protection items

**Status: Complete.** PlayerSave v18 now persists deterministic stage-entry snapshots, Game Over exposes item-aware death choices, Salvage Anchor and Stage Revival Core reuse the M02/M03 state layers, and Phoenix Core resumes the same in-memory encounter with partial resources plus a visible grace window. See `docs/M04_DEATH_PROTECTION.md`.

Implemented:

- Salvage Anchor;
- Stage Revival Core;
- Phoenix Core;
- death-choice UI;
- stage-entry snapshot;
- current-encounter resurrection path.

## M05 — Grade + currency migration

**Status: Complete.** PlayerSave v19 is grade-native, legacy Common/Rare/Epic/Legendary equipment migrates explicitly to Aluminum/Copper/Silver/Gold while preserving enhancement/loadout, Diamond is active as the new top grade, and Alloy/Star Crystal/Quantum Core now flow through the existing persistent economy with M02 checkpoint rollback semantics. See `docs/M05_GRADE_CURRENCY_MIGRATION.md`.

Implemented:

- Aluminum/Copper/Silver/Gold/Diamond;
- legacy equipment migration;
- Credits/Alloy/Star Crystal/Quantum Core;
- segment rollback semantics.

## M06 — Random finite-stock shops

**Status: Complete.** PlayerSave v20 persists deterministic finite shop instances and stock through the existing checkpoint/crash/death-protection state layers. Normal, Station, Traveling, Black Market, Hidden and Event shops now share one stock/purchase runtime; Service/Upgrade reuses its existing enhancement path with Credits + Alloy. Rare resurrection items have finite merchant stock and page reload cannot reroll an existing encounter. See `docs/M06_FINITE_STOCK_SHOPS.md`.

Implemented:

- shop instance id/seed;
- stock persistence;
- shop-specific currency;
- random/hidden/traveling/black-market rules;
- resurrection-item availability.

## M07 — World engine

**Status: Complete.** The 1000-stage Campaign now maps deterministically to 50 canonical Worlds (20 stages each, five Worlds per Galaxy), the runtime owns a validated `WorldProfile` registry and per-World environment profiles, the Canvas background consumes current-World visual data, title/stage-entry presentation exposes World identity, and M06 shop identity now uses the canonical World resolver. See `docs/M07_WORLD_ENGINE.md`.

Implemented:

- `WorldProfile`;
- stage-to-World mapping;
- 50 World registry entries;
- transition UI;
- current-World visual/environment contract.

M08 consumes World music/ambient identity. M09 consumes World enemy/boss roster contracts.

## M08 — Dynamic World Music / Ambient system

**Status: Runtime implementation complete.** The 50 M07 Worlds now resolve through `WorldMusicProfile`, one `MusicController` owns soundtrack state/crossfade/lifecycle, pronunciation/announcer/warning events duck the soundtrack through the existing audio event architecture, Music/Ambient have separate gain controls, and local/default asset resolution fails soft when files are absent. See `docs/M08_DYNAMIC_WORLD_MUSIC.md`.

Implemented:

- `WorldMusicProfile`;
- MusicController/state machine;
- World Normal/Intense states;
- Mini Boss/World Boss/Galaxy Boss music;
- Champion Hunt/Hidden/Shop/Station states;
- ambient layers;
- crossfade;
- audio priority/ducking;
- separate music/ambient gain buses;
- repository/default asset mapping;
- optional local override mapping;
- graceful missing-asset fallback;
- audio lifecycle/performance tests.

Final 50-World track selection/composition, loudness normalization, perceptual crossfade tuning and licensing remain manual asset gates. Missing binary assets do not block gameplay or require another audio architecture.

Integrates with the existing SFX/pronunciation/announcer architecture instead of creating unrelated playback paths.

## M09 — World enemy/boss roster mapping

**Status: Complete.** The production Game runtime now resolves regular enemy visual/reward identities, Elite identities, Mini Bosses and World Bosses from the current `WorldProfile`. Campaign boss cadence has been intentionally migrated to the canonical 20-stage World rhythm, while existing EnemyKind combat mechanics and BossState behavior remain authoritative. See `docs/M09_WORLD_ROSTERS.md`.

Implemented:

- World-typed enemy/boss roster contracts;
- validated World enemy families, regular rosters and Elite pools;
- World-driven production enemy selection;
- World-contained reward-enemy replacement;
- World-driven Mini Boss / World Boss / Galaxy Major Boss identity;
- Campaign local Stage 10 Mini Boss / Stage 20 World Boss rhythm;
- existing Elite/Special/Hazard/Gauntlet systems retained at intra-World milestones;
- World rank-band distribution exposed and validated as the M10 source.

M10 owns the actual Rank I-X runtime effects, `WordDifficultyScore` and 1/2/3 typing-layer mechanics.

## M10 — Enemy Rank + word difficulty + typing layers

**Status: Complete.** Production enemy spawn now resolves Rank I-X from the current World rank band plus actual vocabulary/mechanical pressure, computes deterministic `WordDifficultyScore`, assigns semantic 1/2/3-layer plans, requires one complete word per layer, and renders Rank/current-layer/three-segment feedback. Carrier/Splitter child spawns also pass through the shared M09 World roster + M10 typing pipeline. See `docs/M10_ENEMY_RANKS_AND_LAYERS.md`.

Implemented:

- Rank I-X;
- `WordDifficultyScore`;
- 1/2/3 layer selection;
- layer identity;
- new word after each completed layer;
- visual three-segment feedback.

M11 must consume this Rank/layer runtime instead of introducing another enemy difficulty axis.

## M11 — Enemy skill/effect framework + Threat Budget

**Status: Complete.** Production enemies now resolve bounded attack/defense/control/support skill sets from archetype signatures plus canonical World family pools. Skills use explicit cooldown -> telegraph -> execute lifecycle, Freeze/Silence reuse the existing status engine with hard-CC anti-chain/immunity, and each runtime enemy receives an audited Threat Budget across Attack/Defense/Speed/Control/Support/Typing/Layers/Urgency. See `docs/M11_ENEMY_SKILLS_THREAT_BUDGET.md`.

Implemented:

- attack/defense/control/support skill contracts;
- World-specific skill pools;
- CC anti-chain;
- runtime resolved skill set;
- Threat Budget audit.

M12 owns Active Typing Pressure, urgent-threat caps and the expanded global difficulty scheduler.

## M12 — Difficulty + Active Typing Pressure scheduler

**Status: Complete.** Production difficulty now exposes Relax / Balanced / Hard / Extreme / Nightmare / Impossible plus Adaptive/Custom, with bounded pressure/urgent/CC/reaction/reward dimensions. Regular and summoned enemy admission uses live Active Typing Pressure rather than raw count alone, while legacy difficulty ids migrate safely. See `docs/M12_DIFFICULTY_ACTIVE_PRESSURE.md`.

Implemented:

- Relax;
- Balanced;
- Hard;
- Extreme;
- Nightmare;
- Impossible;
- Adaptive/Custom;
- projected Active Typing Pressure admission;
- urgent-threat cap;
- controller/support density cap;
- mode-specific reaction/CC/attack/reward dimensions;
- in-Rank word pressure without changing World Rank access.

M13 must reuse the M12 aggregate pressure contracts for authored formations.

## M13 — Formation system

**Status: Complete.** Production encounters now support authored formation packages that are validated as one aggregate M12 pressure package before any member spawns. See `docs/M13_FORMATIONS.md`.

Implemented:

- Tank + Healer;
- Commander + Scout wing;
- Defender + Sniper;
- Controller + Assassin;
- Carrier escort;
- stage/complexity availability;
- weighted deterministic selection contract;
- aggregate pressure / urgent / controller-support / max-enemy admission;
- atomic package spawn and Campaign enemy-budget consumption;
- safe fallback to the existing solo spawn path.

M14 owns Branching Route Map + Station and persisted route/shop state.

## M14 — Branching Route Map + Station

**Status: Complete.** Production Campaign now has deterministic ten-stage route graphs with persisted immutable choices, mandatory boss continuity, and Shop/Station nodes that reuse the existing finite-stock/service systems. RouteState is part of the checkpoint/crash/death persistence domain through PlayerSave v21. See `docs/M14_ROUTE_STATION.md`.

Implemented:

- deterministic per-sector route seed/graph;
- sequential Stage 001-1000 continuity;
- mandatory Mini Boss / World Boss / Galaxy Major Boss Combat nodes;
- Combat / Shop / Station branches;
- immutable persisted route choice;
- frontier-stage route gating with replay-stage compatibility;
- existing Normal Shop / Station Shop / Repair-Upgrade / Support integration;
- checkpoint, crash recovery and death rollback integration;
- PlayerSave v20 -> v21 migration and v20 backup compatibility;
- static responsive route UI with no combat-frame animation.

M15 must extend this route/persistence contract for Hidden Challenge / Hidden World / Champion Hunt rather than create a second navigation layer.

## M15 — Hidden Challenge / Hidden World / Champion Hunt

**Status: Complete.** Discovered optional encounters now extend the existing M14 Route Map, support Tier I-III risk, persist through the existing crash/checkpoint model, and run through the shared Game combat runtime without advancing numbered Campaign stages. Hidden World provides deterministic multi-encounter detours and Champion Hunt reuses the existing Priority Kill Chain announcer. See `docs/M15_HIDDEN_ENCOUNTERS.md`.

Implemented:

- discovery-driven optional route offers;
- Tier I / II / III selection and persisted Skip;
- Hidden Challenge;
- deterministic 3-4 encounter Hidden Worlds with composite environment/roster/boss identity;
- Champion Hunt priority-target chains;
- difficulty-derived kill-chain window;
- premium Credits / Alloy / Star Crystal / Quantum Core rewards;
- dedicated hidden music states;
- checkpoint/crash/death-protection integration;
- backward-compatible PlayerSave v21 hidden-state extension.

M16 must extend the existing StageConfig/BossState typing runtime for Stage Objectives and World-specific boss typing mechanics.

## M16 — Stage Objectives + boss typing mechanics

**Status: Complete.** Numbered Campaign stages now support deterministic event-driven required/bonus objectives, while existing BossState phases resolve one World-family typing mechanic at a time. Objective rewards scale from M12 difficulty and boss typing reuses the existing vocabulary, phase, projectile, HUD, SFX/VFX and reward paths. See `docs/M16_OBJECTIVES_BOSS_TYPING.md`.

Implemented Stage Objectives:

- survive timer;
- accuracy target;
- no-miss;
- protect integrity;
- Commander-first;
- marked target;
- Elite quota;
- speed-clear.

Implemented boss typing interactions:

- Interrupt Charge;
- Shield Sequence;
- Weak Point;
- Rapid Rage;
- Accuracy Curse.

M17 must extend the current SkillEngine/stat/equipment/ShopState/PlayerSave upgrade domains rather than create parallel progression systems.

## M17 — Skill/attribute/equipment upgrade expansion

**Status: Complete.** The existing SkillEngine/stat/equipment/Station/PlayerSave domains now support persistent Lv1-Lv5 core skills, bounded permanent attributes, equipment affixes, dismantling, Silver/Gold grade evolution and richer Station services without parallel progression systems. PlayerSave v22 carries UpgradeState through checkpoint/crash/death rollback semantics. See `docs/M17_UPGRADE_EXPANSION.md`.

Implemented:

- core defensive/offensive skill Lv1-Lv5 compiler;
- Lv5 mastery behaviors consumed by existing Game skill paths;
- permanent Hull/Shield/Firepower/Armor/Energy/Reactor/Focus/Ward/Luck/Salvage upgrades;
- stricter Luck/Salvage caps and economy-sensitive costs;
- existing effective-stat `permanent` lane integration;
- compact equipment affix registry and equipped affix stat bonuses;
- +0 through +5 equipment enhancement retained;
- dismantling for unequipped equipment;
- Silver +5 -> Gold +0 evolution;
- Gold +5 -> Diamond +0 evolution;
- affix roll and locked-other-affix reroll;
- existing Credits/Alloy/Star Crystal/Quantum Core costs and stage gates;
- Station UI/runtime integration;
- PlayerSave v21 -> v22 migration;
- checkpoint/crash/death-protection coverage;
- 517/517 tests plus production build passing on CI #281.

M18 must compile Run Relics into existing stat/combat/reward/route/persistence contracts rather than create a second progression architecture.

## M18 — Run Relics

**Status: Complete.** Run Relics extend the existing Game, reward/route transitions, Station and PlayerSave/checkpoint domains. Relic loadouts compile to direct combat fields so the hot path does not scan relic inventory. PlayerSave v23 carries RelicState through crash/death/checkpoint semantics. See `docs/M18_RUN_RELICS.md`.

Implemented:

- bounded RelicState with owned/equipped lists and maximum 3 active Relics;
- deterministic stage-gated sector and Hidden Encounter Relic acquisition;
- Station equip/unequip using the existing Service / Upgrade UI and autosave queue;
- `CompiledRelicEffects` generated only when loadout state changes;
- first-combat-word Hull recovery;
- perfect-word chain effect using the existing enemy softening runtime;
- streak-triggered freeze using the existing enemy control runtime;
- long boss-word damage modifier;
- once-per-stage miss guard that spends Shield without breaking streak/Power;
- PlayerSave v22 -> v23 migration;
- backup/import/recovery/checkpoint/crash/death integration;
- 522/522 tests plus TypeScript check and production build passing on CI #286.

M19 must extend the existing stage/boss/reward/Codex paths and existing knowledge-persistence merge semantics rather than create parallel reward or discovery stores.

## M19 — Reward layer expansion + Codex

**Status: Complete.** M19 extends the existing Campaign stage-clear, boss reward, economy and Codex/meta paths. PlayerSave v24 stores Codex knowledge outside checkpoint rollback while recovery-source selection merges discovered knowledge. See `docs/M19_REWARD_CODEX.md`.

Implemented:

- difficulty-relative performance rewards for accuracy, no-miss, streak, tempo and objective completion;
- stronger ten-stage sector checkpoint cache using the existing Credits / Alloy / Star Crystal / Quantum Core economy;
- Campaign boss choose-one reward using the existing reward dialog and boss equipment / currency / Run Relic paths;
- boss stage completion held until the reward choice resolves, with the choice committed by the following stage-clear transaction;
- expanded existing Codex/meta collection for Worlds, enemies/bosses and reward discoveries;
- first-seen enemy and stage World discovery hooks without hot-path registry scans;
- knowledge merge semantics so Codex discoveries survive checkpoint rollback and recovery-source selection;
- PlayerSave v23 -> v24 migration plus backup/import validation;
- regression coverage for reward thresholds, sector scaling, boss choice, Codex merge and migration;
- 531/531 tests plus TypeScript check and production build passing on CI #297.

M20 must reuse the existing 50-World Campaign, World registry, difficulty/pressure model, boss runtime, reward tables and PlayerSave migration path rather than create a second Campaign or endless Stage 1001+ progression.

## M20 — Ascension

**Status: Complete.** M20 adds a bounded New Game+ replay layer over the existing 1000-stage / 50-World Campaign. It reuses M02-M04 persistence/recovery, M10 Rank/typing, M12 pressure caps, M13 formations, M16 bosses and M19 reward paths. See `docs/M20_ASCENSION.md`.

Implemented:

- 10 Ascension tiers unlocked from base Stage 1000 completion;
- independent sequential Stage 001-1000 frontier per tier with anti-skip checks;
- the existing ten-stage `CheckpointSnapshot` / crash / stage-entry / death-protection system carries Ascension frontier state;
- tier switching only at committed Stage 001/011/021/... boundaries, preventing mid-segment reward commits;
- completed tiers cannot be reactivated as active progression;
- bounded Rank, formation, word-pressure and reward modifiers compiled at stage start;
- deterministic boss mutation tables compiled into existing boss HP/action/projectile runtime fields;
- existing M12 max-enemy, urgent-threat, controller/support and pressure safety ceilings remain authoritative;
- sector/boss rewards reuse existing M19/economy paths with bounded Ascension scaling;
- first tier completion grants the next tier and a one-time endgame completion cache;
- PlayerSave v24 -> v25 migration with AscensionState, including legacy nested checkpoint/crash/stage-entry migration;
- title Ascension selector plus Ascension-aware Stage Select/Route locks and recovery labels;
- regression coverage for migration, sequential progression, checkpoint switching/rollback, Rank integration, boss mutations/rewards and backup validation;
- 108 test files / 548 tests plus TypeScript check and production build passing on CI #335.

## M21 — Developer QA/Test Lab

**Status: Complete.** M21 implements the single isolated configurable Test Lab defined in Section 32. See `docs/M21_TEST_LAB.md`.

Implemented baseline:

- one title-screen Test Lab sandbox, outside Campaign Stage 001-1000;
- disposable in-memory `TestLabSession`; no writes to production PlayerSave;
- dedicated production `Game` instance with debug APIs gated by `testLabEnabled`;
- selectors for every registered World/enemy/boss/item/equipment/skill/status/shop/music state plus reward/loot controls;
- direct player core-stat/build configuration and enemy runtime/Threat Budget overrides;
- Rank I-X, 1-3 layers, enemy skill forcing, boss phase/HP/shield/stagger controls;
- multi-enemy selection, World roster spawn and production formation admission/spawn;
- Immortal and Real Death modes;
- no-item rollback, Salvage Anchor, Stage Revival Core, Phoenix Core and crash-recovery acceptance actions through production persistence functions;
- isolated checkpoint, stage-entry and crash-recovery snapshots;
- production shop generation/purchase, equipment, Relic, reward-choice and loot paths;
- production Difficulty resolver controls including Adaptive/Custom inputs;
- scheduler freeze/single-step, pressure overrides, time scale and runtime inspector;
- production MusicController with all music states, duck/release, pronunciation, announcer, warning, crossfade/asset debug state;
- reusable built-in QA presets plus optional local Test Lab preset storage;
- keyboard typing routed directly to the isolated Game instance;
- CI completeness audit derived from production registries, including all 50 Worlds, boss mappings and music asset/fallback contracts;
- regression coverage proving debug APIs remain dormant outside Test Lab and sandbox/recovery state is detached from production state;
- final M21 Test + Build: CI #376 PASS · 111 test files · 561/561 tests · TypeScript check + production build.

M22 may now begin the final deterministic balance/performance audit. Do not add a second Test Lab or duplicate runtime systems during M22.

## M22 — Full balance/performance audit

**Status: Automated audit complete; manual browser/audio/visual gate pending.** See `docs/M22_BALANCE_PERFORMANCE_AUDIT.md` and `docs/M22_MANUAL_PLAYTEST_MATRIX.md`.

Automated work completed:

- deterministic cross-system simulation across Stage 001-1000 / 50 Worlds / 100 checkpoint sectors;
- all six fixed difficulty bands plus full-Campaign Adaptive/Custom reference runs;
- seeded economy, equipment-drop, Grade and enemy-reward simulations;
- checkpoint/death/crash and all three resurrection/protection-item integrity scenarios;
- production Game runtime stress through gated deterministic stepping;
- Test Lab-driven early/mid/late/max-pressure stress coverage;
- all-World music mapping, fallback, ducking, crossfade and lifecycle audit;
- deploy bundle-size budgets enforced by `pnpm build`;
- M22 stress audit found and fixed Carrier/Splitter child spawn admission exceeding `maxEnemies`;
- Test Lab includes a QA-only M22 Manual Gate Recorder mirroring all 43 required browser/audio/visual rows and exporting a Markdown observation report without touching PlayerSave;
- the recorder captures live Test Lab performance/runtime/music evidence and requires explicit real-audio, High/Ultra-browser and low/mid/high human-paced attestations before COMPLETE CANDIDATE status;
- CI #395 PASS · 116 test files · 583/583 tests · TypeScript check + production build + bundle budget.

Remaining M22 gate:

The approved user-facing polish slice in `docs/PRE_M22_UI_RECALL_CHARACTER_POLISH_PLAN.md` is COMPLETE. P00-P08 are merged with follow-up P08.1.

The approved RPG HUD slice in `docs/PRE_M22_RPG_HUD_HOTBAR_PLAN.md` is also COMPLETE: H01-H06 add compact player status, one configurable 1-9 hotbar, title/Pause assignment UI, PlayerSave v26 migration, responsive polish and regression coverage.

The approved transition slice in `docs/PRE_M22_STAGE_TRANSITION_PLAN.md` is COMPLETE: T01-T06 replace the World-only notice with a short skippable pre-combat transition for every stage, escalating for World/Galaxy/Boss/Hidden encounters while keeping combat paused until the overlay finishes. PR #70 CI #455 PASS · 121/121 test files · 613/613 tests · TypeScript/build/bundle PASS.

The final approved pre-manual slice in `docs/PRE_M22_COMBAT_IDENTITY_TYPING_CLARITY_PLAN.md` has completed C01-C12: same-prefix spawn suppression, deterministic nearest-target QA, Ship Visual V2 illustrated player art with procedural fallback, equipment-derived aura, and character-specific player-shot VFX without changing combat damage or persistence schema. PR #71 CI #488 PASS · 124/124 test files · 629/629 tests · TypeScript/build/bundle PASS; merged-main CI still must pass.

After PR #71 merge and merged-main CI are green:

- execute and record the real-browser/audio/visual matrix on the final polished HUD/transition/combat-identity build;
- fix any manual findings;
- run final post-fix CI.

Do **not** begin M23 until the manual M22 matrix is complete.

## M23 — Review Pass #1

Complete independent full review and fix all findings.

## M24 — Review Pass #2

Repeat from a fresh perspective and fix all findings.

## M25 — Parent integration pin

Only after child `main` is clean:

- update `sinhvienaiti/typing-game` submodule pin;
- run Platform CI;
- verify existing games remain unaffected.

---

# 36. Definition of done for this expansion

The expansion is not complete until:

1. the 1000 stages map deterministically to 50 Worlds;
2. each World has distinct gameplay identity, roster and bosses;
3. each World resolves a valid music/ambient profile or an explicit safe fallback;
4. music state transitions cover World Normal/Intense, boss, Champion Hunt, Hidden, Shop and Station contexts;
5. BGM/ambient crossfade and lifecycle do not leak or duplicate playback;
6. announcer/pronunciation/warnings remain intelligible through deterministic ducking;
7. checkpoints occur every 10 stages;
8. gameplay death and technical crash are correctly distinguished;
9. all three resurrection/protection items behave exactly as designed;
10. random shops have finite persistent stock without inventory accumulation limits;
11. the five-grade system is migrated safely;
12. multi-currency economy has distinct purposes;
13. enemy Rank I-X is clear and testable;
14. multi-word layers work and remain readable;
15. enemy skills pressure typing without fake keyboard lag;
16. Threat Budget prevents all-axis overpowered normal enemies;
17. Active Typing Pressure prevents impossible spawn piles;
18. all six primary WPM modes are balanced within explicit pressure caps;
19. Mini Boss/World Boss/Galaxy Boss reflect their Worlds;
20. Champion Hunt / Apex Gauntlet and Priority Kill Chain work without counting ordinary enemies;
21. Route/Hidden Challenge/Station systems persist deterministically;
22. upgrade/relic/objective systems obey checkpoint rollback semantics;
23. performance remains within existing project budgets;
24. PlayerSave migration/backup/import remain safe;
25. child Test + Build CI pass;
26. manual gameplay/readability/audio checks are recorded;
27. Review Pass #1 is clean;
28. Review Pass #2 is clean;
29. the configurable Test Lab covers production Worlds/enemies/bosses/items/statuses/death/resurrection/music/announcer and remains isolated from the real Campaign save;
30. Test Lab registry completeness audit passes;
31. parent integration CI passes after the child pin is updated.

---

# 37. Implementation principles for future sessions

- GitHub is the only implementation source of truth.
- Read this file, `PROJECT_CONTEXT.md` and relevant subsystem docs before coding.
- Inspect current `main`; never trust an old chat checkpoint without verification.
- Continue from the latest completed milestone.
- Do not only report status when implementation work remains.
- Keep changes in reviewable vertical slices.
- Run tests/build/CI after each milestone.
- If CI fails, read logs, fix the actual issue and continue.
- Do not leave fake config fields that look active but are not consumed by runtime.
- Do not add unbounded per-frame scans.
- Do not duplicate existing boss, persistence, equipment, status or reward engines.
- Update this plan only when a design decision is intentionally changed.
