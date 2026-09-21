# Space Typing design

## Core identity

Space Typing is a wide-screen typing combat game with a 1000-stage campaign, persistent progression, equipment, ship stats, random rewards and optional challenge modes.

ZType is a game-feel reference only. The game uses its own code, visuals, audio and progression systems.

## Campaign

Campaign stages are separate from vocabulary levels.

~~~text
Campaign Stage: 001 -> 1000
Vocabulary Level: 001 -> 100
~~~

The highest unlocked Campaign Stage is saved. Losing never sends the player back to Stage 001.

Stages are grouped into 10 Galaxies of 100 stages. Each Galaxy introduces new enemies, hazards, visual themes and bosses.

Difficulty rises gradually across many axes: enemy speed, durability, spawn density, active enemy cap, word complexity, projectile speed, projectile count, fire rate, formation complexity, elite chance, boss phases and environmental hazards.

## Shared English resources

Normal gameplay consumes the parent shared vocabulary library and keeps English, Vietnamese and IPA together.

Future boss/sentence challenge modes may also use the shared typing-text corpus.

## Random rewards and stage variety

Every stage should have a chance to create a useful surprise.

The player should not feel that progression is only:

~~~text
type words
-> kill enemies
-> next stage
~~~

Each stage may contain optional random opportunities that change the current run.

### Supply drops

Supply pods may enter the battlefield carrying a short typing target.

~~~text
SUPPLY POD
[shield]

type before it leaves
-> open supply
-> receive reward
~~~

Possible rewards include Hull repair, Shield recharge, Energy cell, Overdrive charge, Bomb, EMP, temporary weapon boost, temporary armor boost, projectile slow, Combo protection, Credits, upgrade material, equipment, Drone repair and emergency Cloak.

Reward weights may react slightly to player condition. Low Hull can raise Repair weight; empty Shield can raise Shield recovery weight; low Power can raise Energy/Overdrive weight. These rules assist but never guarantee survival.

### Lucky enemy drops

Normal enemies have a small pickup chance. Elite enemies and bosses have better drop tables.

Possible pickups include Credits, Energy, Shield, Bombs, missiles, weapon charges, temporary stat buffs, equipment fragments and rare items.

High-value pickups may require the player to type a short pickup word before the item disappears.

### Consumable emergency weapons

Consumables are strong but limited.

~~~text
Nova Bomb
-> clear normal enemies
-> clear enemy projectiles
-> heavy elite damage

EMP
-> disable enemy firing temporarily

Time Bomb
-> slow enemies and projectiles

Shield Bomb
-> temporary full-screen protection

Word Bomb
-> instantly destroy one dangerous target
~~~

### Temporary run buffs

Examples:

~~~text
Firepower +20%
Shield +25%
Energy regeneration +30%
Power gain +20%
Enemy projectile speed -15%
Enemy speed -10%
Supply chance +20%
Perfect-word reward +30%
One-mistake Combo protection
~~~

These buffs last for the current stage or current run.

### Random attribute choices

Rare crates may offer a choice instead of an automatic reward.

~~~text
CHOOSE ONE

+8% Firepower
+10% Shield
+12% Energy regeneration
~~~

### Weapon drops

Weapon crates may temporarily replace or enhance the current weapon.

Candidate weapon families:

~~~text
Twin Laser
Chain Lightning
Railgun
Plasma Cannon
Burst Cannon
Precision Beam
Homing Pulse
Arc Cannon
~~~

Weapon behavior should reward typing skill rather than only changing damage numbers.

### Persistent equipment

Elite and boss stages may award equipment for:

~~~text
Weapon
Armor
Shield
Engine
Reactor
Utility
Drone
Core
~~~

Rarity:

~~~text
Common
Rare
Epic
Legendary
~~~

Higher rarity should primarily add interesting mechanics.

### Lucky stage events

A stage may occasionally roll an optional event:

~~~text
Supply Storm
Treasure Drone
Distress Beacon
Golden Enemy
Meteor Cache
Black Market Beacon
Repair Station
Weapon Trial
Jackpot Wave
~~~

Events must be uncommon enough to feel special.

### Risk/reward crates

Optional Anomaly crates can give a major reward or a temporary penalty.

Possible outcomes:

~~~text
Epic weapon
Large Credits reward
Full repair
Enemy speed +20%
Elite ambush
Shield disabled temporarily
~~~

Risk must be visible before the player opens the crate.

### Soft pity rules

Pure random systems can create frustrating runs, so the game uses soft anti-bad-luck rules.

Long periods without Supply slowly raise Supply chance. Long periods without equipment improve elite/boss equipment chance. Repeated near-end deaths may slightly raise rescue-item weighting.

Exact pity values stay hidden from normal UI.

## Ship progression

The ship has meaningful combat stats such as Hull, Shield, Firepower, Energy, Reactor, Engine, Focus and Luck.

Stats help the player survive farther but do not replace typing skill.

## Combat Energy

There is no mobile-style stamina that blocks play.

Combat Energy is an in-stage tactical resource used for abilities such as Cloak, Shield Burst, EMP, Repair and Overdrive.

Energy can recharge through correct typing, streaks, wave clears, Reactor stats and supply items.

## Stage clear flow

A completed stage may grant:

~~~text
Guaranteed Credits
Optional random drops
Lucky event rewards
Elite/Boss drops
Post-stage upgrade choice
~~~

The combination of deterministic progression and controlled randomness should make repeated stages feel different without making success depend only on luck.

## Design goal

Random systems exist to create surprise, build variety, recovery opportunities, risk/reward decisions, replayability and memorable stages.

A strong build helps the player go farther, but repeated typing mistakes must remain meaningful.
