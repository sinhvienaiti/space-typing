
# Space Typing — Project Context, Requirements, Plan & Implementation Steps

> SOURCE OF TRUTH
>
> This document is the primary product, design and implementation source of truth for sinhvienaiti/space-typing.
> If this document conflicts with older design notes, this document wins.
> The game remains an independent repository and integrates with sinhvienaiti/typing-game only through the platform contracts described here.

---

# 1. Project identity

## 1.1 Core concept

Space Typing is a wide-screen typing combat game combining:

- fast arcade typing combat;
- a 1000-stage Campaign;
- character progression;
- equipment and builds;
- offensive and defensive skills;
- support spells;
- items and consumables;
- shops and upgrades;
- luck, random rewards and special events;
- bosses with real HP bars and multiple phases;
- shared English-learning resources from the parent typing-game platform.

ZType is a game-feel reference only. Space Typing may study target locking, combat timing, wave pressure, pause flow, projectile ideas, sound timing, glow, particles and difficulty progression.

Do not fork ZType, copy its proprietary/unlicensed game code, reuse its copyrighted sprites/audio, or make a simple reskin.

## 1.2 Repository and parent integration

Game repository:

~~~text
sinhvienaiti/space-typing
~~~

Parent platform:

~~~text
sinhvienaiti/typing-game
~~~

Target parent layout:

~~~text
typing-game/
└── games/
    └── space-typing -> sinhvienaiti/space-typing
~~~

Target URLs:

~~~text
https://typing-game.local/space-typing
https://space.typing-game.local
~~~

Development port:

~~~text
3004
~~~

Current parent-integration status:

~~~text
enabled in sinhvienaiti/typing-game
submodule path: games/space-typing
public route: /space-typing
internal origin: https://space.typing-game.local
~~~

## 1.3 Product identity

Space Typing is not:

- a mode inside Vocabulary Shooter;
- a spaceship game controlled by movement;
- a simple typing test with space graphics;
- a ZType clone.

It is:

~~~text
Typing skill
+
Combat decisions
+
Character/class progression
+
RPG-lite systems
+
Items/equipment/spells
+
Luck/random opportunities
+
1000-stage campaign
~~~

---

# 2. Non-negotiable combat rules

## 2.1 No movement

The player does not manually steer the ship or character.

Do not add:

~~~text
WASD movement
arrow movement
mouse steering
manual dodge
~~~

The tactical layer comes from:

- what target to type first;
- typing speed;
- accuracy;
- streak;
- skill timing;
- Energy management;
- defensive timing;
- consumables;
- loadout;
- character choice;
- random opportunities;
- risk/reward choices.

## 2.2 Typing is still the main skill

Progression helps the player go farther but never replaces typing ability.

A strong build may create:

- more defense;
- more damage;
- more resources;
- recovery opportunities;
- better loot;
- useful synergies.

But repeated typing mistakes must remain dangerous.

## 2.3 Input ownership

Letters are reserved for typing.

Preferred combat controls:

~~~text
1 / 2 / 3 / 4
-> active abilities

Space
-> Overdrive / Ultimate

Esc
-> Pause

Mouse / touch
-> optional UI actions
~~~

Any future typed spell must use an explicit command mode so spell text cannot conflict with enemy text.

---

# 3. Shared English resources

## 3.1 Shared vocabulary is mandatory

Space Typing must use the parent platform vocabulary.

Parent data:

~~~text
shared/vocabulary/index.json
shared/vocabulary/levels/001.json
...
shared/vocabulary/levels/100.json
~~~

Current production library:

~~~text
100 levels
18,000 entries
~~~

Required runtime entry:

~~~json
{
  "id": "L003-025",
  "en": "cache",
  "vi": "bộ nhớ đệm",
  "ipa": "/kæʃ/"
}
~~~

Required fields:

~~~text
id
en
vi
ipa
~~~

Phrases are supported.

Normal gameplay loads only the selected vocabulary level instead of all 100 files.

## 3.2 Campaign Stage and Vocabulary Level are independent

~~~text
Campaign Stage
001 -> 1000

Vocabulary Level
001 -> 100
~~~

Example:

~~~text
Campaign Stage 437
Vocabulary Level 021
~~~

Changing vocabulary must not reset Campaign progression.

## 3.3 Vocabulary UX

Use the same explicit apply behavior as Shooter and Recall.

~~~text
Vocabulary
├── Class
│   ├── Level selector
│   └── Use level
│
└── Custom
    ├── editor/input
    └── Save vocabulary
~~~

Switching Class/Custom tabs only changes the view.

Use level is the explicit Class apply action.

Save vocabulary is the explicit Custom apply action.

Success flow:

~~~text
Applying…
-> persist source
-> close dialog
-> show success notice
~~~

## 3.4 Shared typing-text corpus

Parent source:

~~~text
shared/typing-texts/
~~~

Current state:

~~~text
planned levels: 100
available levels: 20
passages: 300
~~~

Potential uses:

- boss phrase attacks;
- sentence challenge stages;
- special missions;
- advanced Ultimates;
- challenge modes.

Do not assume all 100 typing-text levels already exist.

## 3.5 Pronunciation and shared music

Completed learning targets may show:

~~~text
English
Vietnamese
IPA
pronunciation
~~~

Pronunciation keeps the parent integration signal:

~~~text
typing-game:speech
active true / false
~~~

and also emits the local Space Typing audio-priority signal used by M08:

~~~text
space-typing:pronunciation
active true / false
~~~

Rapid pronunciations must remain intelligible and higher priority than background audio.

Gameplay Expansion M08 supersedes the earlier restriction that Space Typing could not own an in-game soundtrack. Space Typing now owns its dynamic World/Boss/Shop soundtrack and ambient layers inside the game runtime.

Parent typing-game may still provide its separate global/local/YouTube music feature. Platform integration must avoid intentionally running two foreground music sources at the same time; the M08 Music volume can be set to zero when the parent/global music source is preferred.

Space Typing audio owns:

- dynamic World/Boss/Shop music state;
- World ambient layers;
- shot SFX;
- hit SFX;
- explosion;
- enemy attack;
- boss SFX;
- UI/gameplay SFX;
- pronunciation;
- Priority Kill Announcer integration.

MusicController consumes pronunciation, announcer and warning lifecycle events so high-priority speech/warnings duck BGM and ambient instead of competing with them.

---

# 4. Screen, visuals and game feel

## 4.1 Wide-screen requirement

Do not reproduce a narrow portrait battlefield.

Primary target:

~~~text
wide responsive desktop arena
16:9-like composition
most of available iframe area
up to roughly 1500x900 useful gameplay area
~~~

HUD stays near edges.

## 4.2 Visual quality target

Target:

- 60 FPS;
- high-DPI Canvas;
- layered stars/grid/parallax;
- additive glow;
- laser trails;
- particle bursts;
- hit flash;
- enemy recoil;
- target knockback;
- short hit-stop;
- controlled screen shake;
- boss telegraphs;
- animated Power/Streak meters;
- shield/core/weak-point effects;
- large boss silhouettes;
- polished pause UI.

Visual effects must never hide typing targets.

## 4.3 Per-key feel

Every correct key:

~~~text
correct key
-> laser
-> hit spark
-> target flash
-> recoil/knockback
-> short SFX
-> score/streak/power response
~~~

Word completion:

~~~text
final key
-> stronger hit
-> larger recoil
-> explosion
-> particles
-> reward feedback
-> VI + IPA
-> pronunciation
~~~

## 4.4 Art sourcing

Enemy/boss visuals may use:

- original Canvas/vector art;
- generated art made for this project;
- openly licensed assets;
- online references used only as inspiration.

For any external asset, record source, author when applicable, license and attribution requirement.

## 4.5 Audio quality is a first-class feature

Audio is not a final-stage decoration.

The game-feel target depends heavily on sound quality.

Required sound layers:

- correct-key shot;
- target hit;
- perfect-word impact;
- wrong-key feedback;
- enemy attack;
- projectile warning;
- Shield hit/break;
- skill/spell activation;
- item pickup;
- rare/Legendary drop;
- Supply Pod arrival;
- Elite warning;
- boss entrance;
- boss phase change;
- boss stagger;
- boss death;
- stage clear/fail;
- shop/reward/UI feedback.

Audio principles:

~~~text
correct typing
-> immediate crisp response

strong event
-> deeper/larger impact

rare event
-> recognizable signature sound

boss
-> unique sound identity
~~~

Do not make every event equally loud.

Use a clear mix hierarchy so typing feedback, dangerous warnings and pronunciation remain understandable while parent background music is playing.

Pronunciation keeps priority through shared-music ducking.

SFX should support volume groups where useful:

~~~text
Master SFX
Typing
Combat
Warnings
UI
Pronunciation
~~~

Avoid requiring all groups in the first UI if a simpler control is enough, but keep the audio architecture capable of supporting them.

## 4.6 UI/UX visual language

Monkeytype is a reference for information design and visual restraint, not a UI to copy.

Desired qualities visible in the reference screenshots:

- dark neutral background;
- one restrained accent color;
- strong typography hierarchy;
- generous spacing;
- large clean information blocks;
- simple icons;
- low border noise;
- modern but not flashy controls;
- settings grouped by understandable categories;
- important values emphasized with size instead of excessive decoration;
- secondary information visually quieter;
- consistent alignment;
- minimal clutter.

Space Typing should use the same design philosophy while keeping its own sci-fi identity.

### Combat HUD rule

Do not display every RPG system at once.

During combat, prioritize only information needed immediately:

~~~text
Current target
Boss HP when applicable
Hull
Shield
Energy
Power / Ultimate
Skill cooldowns
Critical active status
Stage / wave
Score or streak when useful
~~~

Inventory details, full stats, collections and long descriptions belong in pause/menu/result screens.

### Settings design

Settings should be a polished first-class page/panel with clear categories such as:

~~~text
Gameplay
Difficulty
Typing
Sound
Visual
Interface
Accessibility
Data / Save
~~~

Use simple rows, predictable controls, good spacing and immediate value feedback.

### Profile / progression presentation

A future Pilot Profile may show:

- Campaign progress;
- total stages cleared;
- time typing;
- WPM/accuracy records;
- character Mastery;
- boss records;
- recent activity;
- achievement/collection progress;
- optional activity heatmap/history.

It should remain visually calm and readable, inspired by Monkeytype's information hierarchy without copying its layout.

## 4.7 Performance budget

Visual and audio quality must not compromise responsiveness.

Primary target:

~~~text
60 FPS during normal combat
low input latency
no typing delay caused by effects
~~~

Implementation rules:

- pool frequently-created particles/projectiles where useful;
- cap particle counts;
- cull off-screen effects;
- avoid unnecessary DOM updates during Canvas combat;
- avoid expensive full-screen blur every frame;
- cache reusable graphics;
- separate simulation from rendering;
- use delta-time safely;
- support effect-quality presets;
- test boss + projectile + particle worst cases.

Suggested Visual quality options:

~~~text
Low
Medium
High
Ultra
~~~

Gameplay logic and typing timing must remain identical across quality presets.

---

# 5. Game modes

## 5.1 Campaign

Primary mode:

~~~text
Stage 001 -> Stage 1000
~~~

Rules:

- save highest unlocked stage;
- losing never resets to Stage 001;
- Retry restarts current stage;
- Stage Select can replay unlocked stages;
- stage clear unlocks next stage;
- milestone stages unlock characters/content.

Suggested menu:

~~~text
CAMPAIGN

Current: Stage 237

[ Continue ]
[ Stage Select ]
[ Character ]
[ Loadout ]
[ Shop ]
~~~

## 5.2 Later modes

After Campaign foundation is stable:

- Endless;
- Boss Rush;
- Survival;
- Precision Challenge.

Campaign is implemented first.

---

# 6. 1000-stage Campaign structure

## 6.1 Galaxies

~~~text
Galaxy 01 -> Stage 001-100
Galaxy 02 -> Stage 101-200
Galaxy 03 -> Stage 201-300
Galaxy 04 -> Stage 301-400
Galaxy 05 -> Stage 401-500
Galaxy 06 -> Stage 501-600
Galaxy 07 -> Stage 601-700
Galaxy 08 -> Stage 701-800
Galaxy 09 -> Stage 801-900
Galaxy 10 -> Stage 901-1000
~~~

Each Galaxy introduces combinations of:

- new enemies;
- hazards;
- visual theme;
- stage modifiers;
- equipment/rewards;
- boss mechanics.

## 6.2 Suggested rhythm inside every 100 stages

~~~text
x01-x09   normal progression
x10       Elite
x20       Mini Boss
x30       Special Mission
x40       Elite
x50       Boss
x60       Hazard Stage
x70       Elite
x80       Mini Boss
x90       Gauntlet
x100      Major Boss + milestone unlock
~~~

The exact rhythm may vary by Galaxy.

## 6.3 Gradual difficulty

Every later stage should be a little harder, but not only through speed.

Difficulty dimensions:

- enemy speed;
- durability;
- active-enemy cap;
- spawn interval;
- formation complexity;
- word length;
- word complexity;
- projectile speed;
- projectile count;
- fire rate;
- Elite chance;
- shield layers;
- support enemies;
- status effects;
- environmental pressure;
- boss mechanics;
- reaction windows;
- stage modifiers.

Example:

~~~text
Stage 101
-> enemy speed slightly higher

Stage 102
-> projectile speed slightly higher

Stage 103
-> durability slightly higher

Stage 104
-> formation harder

Stage 105
-> modifier/event pressure
~~~

## 6.4 Anti-plateau rule

Each new Galaxy increases a global baseline and introduces new combinations.

Do not allow late Campaign to become:

~~~text
same content
+ only larger numbers
~~~

## 6.5 Adaptive difficulty: Stage + Mode + WPM + Vocabulary

Difficulty must account for both Campaign progression and the player's selected typing context.

The effective pressure should combine:

~~~text
Campaign Stage difficulty
× selected Game Difficulty
× measured/selected WPM profile
× Vocabulary difficulty
× stage modifiers
~~~

Do not scale every value linearly from WPM.

A player typing 100 WPM should not simply receive enemies moving twice as fast as a 50 WPM player.

Use WPM mainly to estimate fair reaction windows and pressure.

Standard typing math may estimate typing time from roughly five characters per WPM word:

~~~text
estimated typing seconds
≈ character count × 12 / WPM
~~~

Then add reaction/target-acquisition buffer and clamp the final pressure within fair limits.

### Difficulty options

Recommended options:

~~~text
Relaxed
Normal
Hard
Expert
Adaptive
Custom
~~~

Adaptive:

- learns from recent valid Campaign performance;
- uses smoothed WPM rather than one unusually fast/slow stage;
- considers recent accuracy;
- never changes difficulty sharply mid-word;
- adjusts mainly between stages or controlled checkpoints.

Custom may allow:

~~~text
Target WPM
Enemy pressure
Projectile pressure
Boss pressure
Random-event intensity
~~~

### Vocabulary factor

Vocabulary Level already represents learning difficulty and should influence pressure.

Higher Vocabulary Levels may naturally include:

- less common words;
- harder spelling;
- longer/less familiar forms;
- harder pronunciation;
- phrases.

Therefore a high Vocabulary Level should not also receive the same raw speed scaling as an easy Vocabulary Level without compensation.

The balancing goal is:

~~~text
harder vocabulary
-> more cognitive/typing difficulty
-> slightly more reaction allowance where needed

higher Campaign Stage
-> more combat-system complexity

higher selected Game Difficulty
-> less forgiveness / more pressure
~~~

### Fairness rule

Adaptive difficulty must challenge the player, not punish improvement.

Do not continuously rubber-band so that every improvement is immediately cancelled.

The player must still feel:

~~~text
I became better
-> earlier stages/builds feel easier
-> higher stages become reachable
~~~

---

# 7. Core systems

## System 01 — Items

Includes:

- consumables;
- emergency items;
- supply items;
- materials;
- special event items;
- boss items.

Examples:

~~~text
Repair Kit
Shield Cell
Energy Cell
Nova Bomb
EMP Charge
Time Crystal
Cloak Charge
Word Bomb
Resurrection Core
Supply Beacon
Lucky Dice
~~~

## System 02 — Skills

Character abilities.

Categories:

- offense;
- defense;
- control;
- support;
- utility.

Skills may use Energy, cooldown, charges and typing conditions.

## System 03 — Characters

Each character owns:

~~~text
base stats
passive
active skill
ultimate
equipment affinity
visual identity
play style
~~~

## System 04 — Attributes

Primary attributes:

~~~text
Hull
Shield
Firepower
Armor
Energy
Reactor
Focus
Ward
Luck
Salvage
~~~

Definitions:

- Hull: health.
- Shield: renewable protection.
- Firepower: typing attack damage.
- Armor: incoming-damage reduction.
- Energy: active-skill resource capacity.
- Reactor: Energy recovery.
- Focus: Power gain, combo stability, precision effects.
- Ward: defensive spell/status resistance.
- Luck: reward/event rarity weighting.
- Salvage: Credits/material/equipment efficiency.

No movement-speed core stat.

## System 05 — Character Level / Mastery

Each character has individual progression.

Potential unlocks:

- small stat growth;
- passive upgrade;
- active-skill modifier;
- ultimate modifier;
- starting bonus;
- cosmetic/effect changes;
- mastery perks.

## System 06 — Support Spells

Equipable abilities separate from character core skills.

Examples:

~~~text
Barrier
Time Stop
Meteor
Resurrection
Lucky Blessing
Cleanse
Supply Beacon
Gravity Well
Sanctuary
~~~

A limited spell loadout is selected before a stage.

## System 07 — Shop

Types:

~~~text
Normal Shop
Upgrade Shop
Black Market
Event Shop
Repair Station
~~~

Purchases:

- consumables;
- equipment;
- materials;
- upgrades;
- spells;
- rerolls;
- repair;
- temporary buffs.

## System 08 — Equipment / Loadout

Recommended slots:

~~~text
Weapon
Armor
Shield
Reactor
Utility
Drone
Core
~~~

Optional later:

~~~text
Secondary Module
~~~

## System 09 — Rarity / Loot / Drops

Rarity:

~~~text
Common
Rare
Epic
Legendary
~~~

Optional late endgame:

~~~text
Mythic
~~~

Higher rarity should unlock interesting mechanics, not only bigger numbers.

## System 10 — Enhancement / Upgrades

Examples:

~~~text
Pulse Laser Mk.I -> Mk.V
Shield Core +1 -> +5
Armor reinforcement
Skill modifier upgrade
Equipment evolution
~~~

Avoid too many currencies.

## System 11 — Talent / Skill Tree

Characters can specialize.

Example Vanguard branches:

~~~text
Defense
Balanced
Power
~~~

Talent trees should be small and meaningful rather than huge grids of +1% nodes.

## System 12 — Combat Resources

Resources may include:

~~~text
Hull
Shield
Energy
Power / Overdrive
Skill charges
Bomb charges
Character-specific resource
~~~

Energy is tactical in-stage Energy.

There is no mobile-style stamina that blocks play.

## System 13 — Buff / Debuff / Status

Positive:

~~~text
Shielded
Fortified
Lucky
Overcharged
Cloaked
Combo Protected
Regeneration
~~~

Negative:

~~~text
Frozen
Burning
Silenced
Jammed
Cursed
Weakened
Armor Broken
Slowed
Marked
~~~

## System 14 — Enemies / Elites / Bosses

Candidate families:

~~~text
Scout
Mine
Tank
Destroyer
Oppressor
Carrier
Shield
Jammer
Cloaker
Healer
Splitter
Sniper
Leech
Commander
Elite
Boss
~~~

They must differ mechanically, not only in HP.

## System 15 — Stage Modifiers / Random Events

Examples:

~~~text
Fast Enemies
Armored Enemies
Low Shield
Double Supply
Projectile Storm
Supply Storm
Treasure Drone
Distress Beacon
Golden Enemy
Meteor Cache
Black Market
Repair Station
Weapon Trial
Jackpot Wave
Cursed Stage
~~~

This system is critical for keeping 1000 stages varied.

## System 16 — Combo / Accuracy / Perfect Typing

Typing performance directly affects combat.

Examples:

~~~text
10 correct keys
-> Shield pulse

25 streak
-> multiplier

50 streak
-> special proc

3 perfect words
-> Rail Strike ready

perfect boss word
-> stagger

long perfect word
-> bonus damage/Power

100% wave accuracy
-> reward choice
~~~

## System 17 — Missions / Achievements / Challenges

Examples:

~~~text
Clear without damage
Finish with 98%+ accuracy
100 perfect words
Kill boss without Bomb
Destroy 30 projectiles
Clear using specific character
Clear under time target
~~~

Rewards:

- Credits;
- cosmetics;
- equipment;
- materials;
- mastery;
- collection unlocks.

Normal Campaign progression must not require achievement grinding.

## System 18 — Meta Progression / Collection

Persist:

- highest stage;
- cleared stages;
- best results;
- characters;
- mastery;
- inventory;
- equipment;
- discovered enemies;
- discovered bosses;
- discovered items;
- achievements;
- cosmetics;
- boss records;
- collection completion.

## System 19 — Secret / Hidden Discovery

Hidden content is a major replay and Luck system.

Possible hidden content:

~~~text
Hidden Skill
Hidden Spell
Hidden Stage
Hidden Shop
Hidden Boss
Hidden Weapon
Hidden Equipment
Hidden Character interaction
Hidden Mission
Hidden Event
Hidden Upgrade path
Hidden Legendary/Mythic reward
~~~

Hidden content should use a mix of:

- Luck-based chance;
- secret conditions;
- character/build conditions;
- accuracy/streak conditions;
- special item possession;
- stage milestones;
- repeated-event pity;
- rare event chains.

Do not make important gameplay content permanently unreachable through pure RNG.

Use soft pity, clues, Codex silhouettes/??? entries or deterministic alternate conditions where appropriate.

Examples:

~~~text
Hidden Shop
-> small chance after a perfect stage
-> chance increased by Luck
-> guaranteed after a long drought

Hidden Boss
-> rare portal/event
-> or guaranteed by completing a secret mission chain

Hidden Skill
-> boss drop
-> or secret achievement condition
~~~

The purpose is discovery, surprise and replayability rather than frustration.

## System 20 — Adaptive Difficulty

Adaptive Difficulty combines:

- Campaign Stage;
- selected difficulty option;
- recent/target WPM;
- recent accuracy;
- active Vocabulary Level;
- stage modifiers.

It changes combat pressure while preserving a fair progression curve.

The player may explicitly choose a fixed difficulty or use Adaptive.

## Cross-system Synergy

Synergy is a cross-system rule, not a separate numbered system.

Example:

~~~text
Volt
+ Lightning Core
+ Chain Lightning
-> enhanced Lightning synergy
~~~

Build quality should come from interactions, not only the largest raw stat.

---

# 8. Character roster and milestone unlocks

## 8.1 Unlock schedule

~~~text
Stage 001
-> Character 01 Vanguard

Clear 100
-> Character 02 Aegis

Clear 200
-> Character 03 Volt

Clear 300
-> Character 04 Wraith

Clear 400
-> Character 05 Fortune

Clear 500
-> Character 06 Arsenal

Clear 600
-> Character 07 Oracle

Clear 700
-> Character 08 Bastion

Clear 800
-> Character 09 Reaper

Clear 900
-> Character 10 Celestial

Clear 1000
-> Character 11 Zenith
~~~

Unlocks are permanent.

Later characters may be stronger overall, but earlier characters retain unique builds and Mastery value.

## 8.2 Vanguard

Role: balanced starter.

Passive:

~~~text
20 consecutive correct keys
-> restore small Shield
~~~

Active: Barrier Pulse.

Ultimate: Nova Overdrive.

## 8.3 Aegis

Unlock: Stage 100.

Role: defense/tank.

Passive: perfect words reinforce Shield.

Active: Reflect Field.

Ultimate: Fortress Protocol.

## 8.4 Volt

Unlock: Stage 200.

Role: Energy caster.

Passive: long words restore extra Energy.

Active: EMP Burst.

Ultimate: Thunder Grid.

## 8.5 Wraith

Unlock: Stage 300.

Role: control/survival.

Passive: high streak periodically triggers short Cloak.

Active: Phase Cloak.

Ultimate: Time Collapse.

## 8.6 Fortune

Unlock: Stage 400.

Role: Luck/loot.

High Luck and Salvage.

Passive improves Supply, Treasure Drone and rare-event weighting.

Active: Lucky Star.

Ultimate: Jackpot.

Luck must never trivialize difficulty.

## 8.7 Arsenal

Unlock: Stage 500.

Role: weapon specialist.

Passive: weapon pickups last longer and gain extra effects.

Active: Weapon Overclock.

Ultimate: Armory Protocol.

## 8.8 Oracle

Unlock: Stage 600.

Role: precision typing.

Passive: perfect words deal extra boss damage.

Active: Mark of Weakness.

Ultimate: Perfect Sentence.

## 8.9 Bastion

Unlock: Stage 700.

Role: Shield/support.

Passive: destroying enemy projectiles recharges Shield.

Active: Guardian Matrix.

Ultimate: Sanctuary.

## 8.10 Reaper

Unlock: Stage 800.

Role: high-risk offense.

Passive: damage grows with streak.

Active: Execute.

Ultimate: Death Chain.

## 8.11 Celestial

Unlock: Stage 900.

Role: late-game hybrid.

Passive: perfect words generate Celestial Charge.

Active: Offensive/Defensive Celestial stance.

Ultimate: Starfall.

## 8.12 Zenith

Unlock: Stage 1000.

Role: secret post-Campaign character.

Strongest overall base character, but still skill-dependent.

Ultimate: Zenith Protocol.

It must be a multi-phase typing/combat ability, not an instant-win button.

---

# 9. Offensive, defensive and support mechanics

## 9.1 Defense

Candidate mechanics:

- Barrier;
- Reflect Field;
- Time Shell;
- Phase Cloak;
- Word Guard;
- Perfect Guard;
- Emergency Repair;
- Guardian Drone;
- Purify;
- Last Stand;
- Fortress;
- Sanctuary.

Because the player cannot dodge manually, defensive depth is mandatory.

## 9.2 Offense

Candidate mechanics:

- Nova Bomb;
- EMP;
- Chain Lightning;
- Rail Strike;
- Meteor Barrage;
- Mark of Weakness;
- Execute;
- Pulse Storm;
- Overclock;
- Word Collapse;
- Starfall;
- Death Chain.

## 9.3 Support/control

Candidate mechanics:

- Freeze;
- Gravity Well;
- Silence;
- Cleanse Word;
- Scan;
- Supply Beacon;
- Lucky Star;
- Shield regeneration;
- Energy regeneration;
- cooldown manipulation.

## 9.4 Ability constraints

Prevent spam through combinations of:

~~~text
Energy
Cooldown
Charges
Typing conditions
Per-stage limit
Per-run limit
~~~

---

# 10. Items, supplies and luck

## 10.1 Supply Pods

Supply Pods enter the battlefield with their own typing target.

~~~text
SUPPLY POD
[repair]

type before it exits
-> collect reward
~~~

Rewards may include:

- Hull Repair;
- Shield Recharge;
- Energy Cell;
- Overdrive Charge;
- Bomb;
- EMP;
- temporary weapon;
- armor buff;
- projectile slow;
- Combo Guard;
- Credits;
- materials;
- equipment;
- Drone repair;
- Cloak.

## 10.2 Enemy drops

Normal enemies have small drop chance.

Elite/Boss enemies have better tables.

Valuable pickups may require typing before timeout.

## 10.3 Consumables

Examples:

~~~text
Nova Bomb
EMP Charge
Repair Kit
Shield Cell
Time Crystal
Cloak Charge
Word Bomb
Resurrection Core
Supply Beacon
Lucky Dice
~~~

## 10.4 Temporary buffs

Examples:

~~~text
Firepower +20%
Shield +25%
Energy regeneration +30%
Power gain +20%
Projectile speed -15%
Enemy speed -10%
Supply chance +20%
Perfect-word reward +30%
One-mistake Combo protection
~~~

## 10.5 Reward choices

Some crates present:

~~~text
Choose 1 of 3
~~~

Example:

~~~text
+8% Firepower
+10% Shield
+12% Energy regeneration
~~~

## 10.6 Weapon drops

Candidate families:

~~~text
Pulse Laser
Twin Laser
Chain Lightning
Railgun
Plasma Cannon
Burst Cannon
Precision Beam
Homing Pulse
Arc Cannon
~~~

Weapon behavior should react to typing performance.

## 10.7 Lucky events

Examples:

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

## 10.8 Risk/reward crates

Example:

~~~text
ANOMALY CRATE

Possible positive:
Epic weapon
Large Credits
Full repair

Possible negative:
Elite ambush
Enemy speed +20%
Shield disabled temporarily
~~~

Risk is shown before opening.

## 10.9 Luck

Luck may influence:

- Supply chance;
- rare crate chance;
- reward quality;
- Treasure Drone chance;
- rare events;
- item rarity;
- boss drop quality.

Luck never guarantees success.

## 10.10 Soft pity

Hidden anti-bad-luck rules may slowly raise chance after long droughts.

Examples:

~~~text
many stages without Supply
-> Supply chance rises

many Elite/Boss kills without equipment
-> equipment chance rises

repeated near-end deaths
-> rescue weighting rises slightly
~~~

---

# 11. Enemy system

Candidate enemy mechanics:

### Scout
Basic target.

### Mine
Fast pressure.

### Tank
Slow and durable.

### Destroyer
Shoots letter projectiles.

### Oppressor
Heavy projectile pressure.

### Carrier
Spawns smaller enemies.

### Shield Enemy
Requires shield word then core word.

### Jammer
Temporarily distorts information without making targets unreadable/unfair.

### Cloaker
Partially hidden until lock/Scan.

### Healer
Restores nearby enemies.

### Splitter
Splits on death.

### Sniper
Telegraphs a powerful attack.

### Leech
Steals Energy/Power.

### Commander
Buffs nearby enemies.

### Elite
Enhanced mechanics plus better loot.

Enemy projectiles can carry letters/short words and can be destroyed through typing.

Defensive skills may reflect, freeze, block, erase or convert projectiles.

---

# 12. Boss system

## 12.1 Real HP

Bosses have actual HP bars.

~~~text
BOSS NAME
HP ████████████████████
~~~

## 12.2 Typing attack loop

~~~text
boss word appears
-> correct key
-> small damage/hit feedback

complete word
-> larger damage
-> stronger impact
-> boss HP decreases
-> next controlled-random word
-> repeat
~~~

Boss HP is not a fixed word count.

Damage may depend on:

- Firepower;
- character;
- equipment;
- buffs/debuffs;
- word length;
- perfect typing;
- streak;
- skills.

## 12.3 Boss words

Boss words come from active Vocabulary Level using controlled selection:

- length range;
- stage difficulty;
- thematic pool when applicable;
- phrase challenge when supported;
- anti-repeat rules.

## 12.4 Phases

Example:

~~~text
100%-70%
normal words

70%-40%
projectiles
summons

40%-15%
shield phase
shield word -> core word

15%-0%
rage
harder words
higher pressure
~~~

## 12.5 Stagger

Possible triggers:

- perfect boss word;
- Rail Strike;
- EMP;
- phase-break word;
- Ultimate;
- build synergy.

## 12.6 Readability

Always prioritize:

- HP;
- active word;
- typed position;
- dangerous projectile text;
- phase warning.

---

# 13. Character progression

Each character has:

~~~text
Character Level
Mastery XP
Mastery perks
Skill modifiers
Ultimate modifiers
Optional cosmetics
~~~

Do not make Vanguard useless after Stage 100.

---

# 14. Equipment and builds

Recommended slots:

~~~text
Weapon
Armor
Shield
Reactor
Utility
Drone
Core
~~~

Possible build styles:

~~~text
Tank
Energy Caster
Perfect Typing
Boss Killer
Luck/Loot
Shield Counter
Projectile Control
High-Streak Glass Cannon
Supply Hunter
Weapon Specialist
~~~

Interesting mechanics are preferred over pure stat inflation.

Example:

Bad:

~~~text
+300 damage
~~~

Better:

~~~text
Perfect word
-> secondary Rail shot
~~~

---

# 15. Shop and economy

Start with one main currency:

~~~text
Credits
~~~

Avoid too many currencies in the first implementation.

Shop types:

- Normal Shop;
- Upgrade Shop;
- Black Market;
- Event Shop;
- Repair Station.

Possible actions:

- buy consumable;
- buy equipment;
- repair;
- upgrade;
- buy spell;
- reroll offers.

Purchases must be atomic and cannot make Credits negative.

---

# 16. Save and persistence architecture

## 16.1 V1 needs no backend

Use:

~~~text
Static definitions
-> JSON / TypeScript

Player progress
-> IndexedDB

Small settings
-> localStorage

Backup
-> Export / Import JSON
~~~

## 16.2 Static definitions

Suggested:

~~~text
data/
├── characters/
├── skills/
├── spells/
├── items/
├── equipment/
├── enemies/
├── bosses/
├── shops/
├── loot/
├── galaxies/
└── modifiers/
~~~

## 16.3 IndexedDB player save

Persist:

- highest unlocked stage;
- stage clear history;
- best stage results;
- Credits;
- character unlocks;
- Character Level;
- Mastery;
- inventory;
- equipment;
- loadouts;
- skills;
- talents;
- achievements;
- collection/codex;
- pity counters;
- permanent progression.

## 16.4 localStorage

Use for small settings:

- SFX;
- graphics;
- vocabulary source;
- vocabulary level;
- accessibility;
- UI preferences;
- keybinds where applicable.

## 16.5 Autosave

Save immediately after important changes:

~~~text
stage clear
stage unlock
character unlock
level up
mastery change
item receive
equipment receive
loadout change
shop purchase
upgrade
talent spend
achievement unlock
currency change
important pity update
~~~

Show non-blocking:

~~~text
✓ Saved
~~~

when useful.

## 16.6 Save schema

Every save has a version.

~~~json
{
  "version": 1
}
~~~

Use migrations for future schema changes.

Never silently delete old progress when adding new fields.

## 16.7 Export / Import

Data screen:

~~~text
[ Export Save ]
[ Import Save ]
~~~

Import validates:

- version;
- structure;
- required data;
- value ranges;
- unknown IDs;
- corruption.

## 16.8 Future backend

PHP/MariaDB is only needed later for:

- cloud save;
- multi-device sync;
- accounts;
- remote leaderboard;
- shared profiles.

V1 is local/offline-first.

---

# 17. Technical architecture

Preferred stack:

~~~text
TypeScript
Vite
Canvas 2D
Web Audio / HTML Audio
IndexedDB
localStorage
Vitest
~~~

Suggested structure:

~~~text
src/
├── app/
├── engine/
├── combat/
├── campaign/
├── characters/
├── skills/
├── spells/
├── items/
├── equipment/
├── loot/
├── shop/
├── enemies/
├── bosses/
├── events/
├── vocabulary/
├── audio/
├── persistence/
├── ui/
└── types/

data/
├── characters/
├── equipment/
├── items/
├── skills/
├── spells/
├── enemies/
├── bosses/
├── loot/
├── shops/
├── galaxies/
└── modifiers/
~~~

Keep modules simple. Do not create abstractions before needed.

---

# 18. Engineering rules

- Keep code simple and readable.
- Do not over-engineer.
- Verify function inputs and outputs before using them.
- Reuse existing functions/systems before creating duplicates.
- Avoid redundant casts and defensive checks with no purpose.
- Use simple English names.
- Keep rendering separate from persistence/progression.
- Do not couple Space Typing to source code from other child games.
- Integrate through parent HTTP/postMessage/platform contracts.
- Add targeted tests for deterministic logic.
- Do not leave invalid partial checkpoints on main.
- Child CI must pass before parent pins a new submodule revision.
- Meaningful implementation changes update documentation.
- A major milestone requires two consecutive clean review passes.

---

# 19. PLAN

## Phase 0 — Foundation

Goal: stable TypeScript/Vite project before gameplay complexity.

Deliverables:

- Vite;
- TypeScript;
- Vitest;
- CI;
- README;
- master context;
- basic settings;
- shared vocabulary loader skeleton;
- persistence schema skeleton;
- parent audio-focus contract;
- base audio mixer/SFX architecture;
- base UI tokens for typography, spacing, panels and accent color.

Acceptance:

~~~text
pnpm test PASS
pnpm build PASS
standalone page loads
~~~

## Phase 1 — Core typing combat

Implement:

- Canvas loop;
- responsive wide arena;
- high-DPI;
- player ship;
- Scout;
- target acquisition;
- word rendering;
- correct-key shot;
- wrong-key penalty;
- completion;
- hit flash;
- knockback;
- particles;
- explosion;
- score;
- streak;
- multiplier;
- Power/Overdrive;
- pause/resume;
- first polished typing/combat SFX set;
- clean minimal HUD with clear information hierarchy.

Acceptance:

- typing feedback is immediate;
- targets stay readable;
- desktop performance is smooth;
- pause stops gameplay;
- no movement controls.

## Phase 2 — English-learning integration

Implement:

- Class/Custom vocabulary UI;
- 100 Vocabulary Levels;
- explicit Use level;
- success notice;
- VI/IPA;
- pronunciation;
- pronunciation queue;
- music ducking.

Acceptance:

- changing vocabulary does not change Campaign stage;
- rapid words all receive pronunciation;
- no competing BGM.

## Phase 3 — 1000-stage Campaign foundation

Implement:

- 10 Galaxies;
- Stage 001-1000 addressing;
- StageFactory;
- Difficulty;
- stage seed;
- stage roles;
- clear/fail;
- Continue;
- Retry;
- Stage Select;
- highest unlocked stage;
- difficulty mode selection;
- WPM/accuracy profile;
- Vocabulary difficulty factor;
- adaptive-difficulty smoothing/clamping.

Generate stages from data/functions rather than hand-writing 1000 files.

Acceptance:

- all 1000 stages resolve;
- difficulty trend rises;
- losing does not reset progress;
- deterministic stage behavior is testable.

## Phase 4 — Enemy families and projectile combat

Order:

1. Scout;
2. Mine;
3. Tank;
4. Destroyer;
5. Oppressor;
6. Carrier;
7. Shield;
8. Jammer;
9. Cloaker;
10. Healer;
11. Splitter;
12. Sniper;
13. Leech;
14. Commander;
15. Elite variants.

Add projectile typing and threat priority.

## Phase 5 — Boss framework

Implement:

- boss base;
- HP bar;
- per-key damage;
- word-complete damage;
- phases;
- shield/core;
- summons;
- projectiles;
- rage;
- stagger;
- boss loot.

Acceptance:

- boss requires multiple words;
- HP reflects actual damage;
- words rotate;
- phases are clear.

## Phase 6 — Persistence

Implement before deep RPG progression:

- IndexedDB;
- autosave;
- schema version;
- migrations;
- Export;
- Import;
- validation;
- save indicator.

## Phase 7 — Attributes and resources

Implement:

- Hull;
- Shield;
- Firepower;
- Armor;
- Energy;
- Reactor;
- Focus;
- Ward;
- Luck;
- Salvage;
- Overdrive;
- charges.

Use one effective-stat pipeline:

~~~text
Character Base
+ Character Level
+ Equipment
+ Talent
+ Temporary Buff
+ Stage Effect
= Effective Stats
~~~

## Phase 8 — Items and consumables

Implement registry/inventory and first items:

- Repair Kit;
- Shield Cell;
- Energy Cell;
- Nova Bomb;
- EMP;
- Time Crystal;
- Word Bomb;
- Supply Beacon;
- Lucky Dice.

## Phase 9 — Equipment, rarity and loot

Implement:

- slots;
- loadout;
- Common/Rare/Epic/Legendary;
- modifiers;
- equip/unequip;
- comparison;
- weighted loot;
- Elite/Boss drops.

## Phase 10 — Skills and support spells

Implement skill engine:

- Energy;
- cooldown;
- charges;
- typing conditions.

Initial skills:

- Barrier;
- Reflect;
- EMP;
- Time Shell;
- Emergency Repair;
- Chain Lightning;
- Mark of Weakness;
- Guardian Drone.

Support spells use a limited pre-stage loadout.

## Phase 11 — Characters and 100-stage milestones

Implement the 11-character data model.

Order:

1. Vanguard;
2. Aegis;
3. Volt;
4. Wraith;
5. Fortune;
6. Arsenal;
7. Oracle;
8. Bastion;
9. Reaper;
10. Celestial;
11. Zenith.

Milestone unlocks are permanent.

## Phase 12 — Character Level, Mastery and Talent

Implement:

- XP;
- level;
- mastery;
- passive upgrade;
- active modifier;
- ultimate modifier;
- small branching Talent Tree.

Do not build an enormous talent graph.

## Phase 13 — Supply, random events, Luck and hidden discovery

Implement:

- Supply Pod;
- enemy drops;
- Treasure Drone;
- Golden Enemy;
- reward-choice crate;
- Anomaly crate;
- Luck weighting;
- soft pity;
- event scheduler;
- Hidden Shop;
- Hidden Stage/event route;
- Hidden Boss trigger framework;
- Hidden Skill/Weapon/Mission reward hooks;
- Codex ???/discovery presentation.

Hidden content must combine RNG with fair deterministic/pity paths instead of pure permanent RNG lockout.

Use seeded/controlled RNG where useful for testing/debugging.

## Phase 14 — Shop and economy

Implement:

- Credits;
- Normal Shop;
- repair;
- consumables;
- equipment offers;
- Upgrade Shop;
- Black Market;
- reroll.

## Phase 15 — Enhancement and Synergy

Implement:

- equipment upgrade;
- limited evolution;
- mechanic upgrades;
- character/equipment/skill synergies.

Avoid uncontrolled stat inflation.

## Phase 16 — Status engine

Implement:

- timed effects;
- stacking rules;
- refresh rules;
- source tracking;
- cleanse;
- resistance/immunity;
- pause-safe timers.

## Phase 17 — Missions, achievements and collection

Implement:

- achievements;
- stage challenges;
- enemy codex;
- boss codex;
- item/equipment collection;
- character collection;
- best records.

## Phase 18 — Advanced stage variety

Expand:

- Galaxy hazards;
- special missions;
- gauntlets;
- boss variants;
- phrase challenges;
- shared typing-text special stages.

## Phase 19 — Art and audio final polish

Audio/visual quality is developed from Phase 1 onward. This phase is the final production pass, not the first time polish is considered.

Create/curate:

- characters/ships;
- enemy families;
- Elite effects;
- 10 Galaxy themes;
- bosses;
- projectiles;
- supply pods;
- crates;
- equipment icons;
- spells.

Use original/generated/compatible assets only.

Final audio pass includes:

- per-key sound response;
- layered hit strength;
- boss signatures;
- rare-drop/event signatures;
- warning readability;
- pronunciation priority;
- shared-BGM balance.

Final UI pass includes:

- combat HUD hierarchy;
- Settings;
- Character;
- Loadout;
- Shop;
- Stage Select;
- Result;
- Pilot Profile/Stats;
- Codex/Collection.

Use Monkeytype as a reference for clean, modern information hierarchy and settings organization, not as a layout to copy.

Tune SFX so typing remains satisfying with parent BGM.

Re-run worst-case performance profiling after every major VFX/audio change.

## Phase 20 — Parent platform integration

Only after child game is independently stable.

Parent changes:

- add submodule;
- registry/navigation;
- nginx;
- host/certificate;
- dev.sh;
- play.sh;
- package scripts;
- static build;
- CI integration.

Do not modify existing games' gameplay code.

## Phase 21 — Final QA and balancing

Run:

- gameplay QA;
- save/load QA;
- Campaign generation QA;
- boss QA;
- loot simulations;
- pity simulations;
- performance profiling;
- responsive QA;
- audio balance;
- readability;
- parent integration.

Completion requires:

~~~text
Review Pass #1 -> clean
Review Pass #2 -> clean
~~~

---

# 20. IMPLEMENTATION STEPS

Follow this dependency order.

## Step 01
Initialize Vite + TypeScript + Vitest + CI.

## Step 02
Create full-height wide Canvas shell.

## Step 03
Create game loop, high-DPI resize and pause-safe clock.

## Step 04
Create input router reserving letters for typing.

## Step 05
Create word renderer and first-letter target locking.

## Step 06
Create laser, hit, recoil, particles and SFX.

## Step 07
Create score, streak, multiplier and Power.

## Step 08
Create Scout and basic clear/fail loop.

## Step 09
Integrate shared vocabulary index and level loader.

## Step 10
Create Class/Custom vocabulary dialog with explicit apply confirmation.

## Step 11
Add VI, IPA, pronunciation and parent music ducking.

## Step 12
Create Campaign save with highest unlocked stage.

## Step 13
Create StageFactory for Stage 001-1000.

## Step 14
Create Galaxy and stage-role models.

## Step 15
Create difficulty model plus automated trend tests.

## Step 15A
Add fixed difficulty modes and Adaptive Difficulty using smoothed WPM, recent accuracy, Vocabulary Level and fair reaction-window clamps.

## Step 16
Add Continue, Retry and Stage Select.

## Step 17
Add Mine and Tank.

## Step 18
Add Destroyer and letter projectiles.

## Step 19
Add Oppressor and multi-projectile pressure.

## Step 20
Add Carrier, Shield, Jammer, Cloaker, Healer, Splitter, Sniper, Leech and Commander incrementally.

## Step 21
Create Elite modifier framework.

## Step 22
Create Boss base and HP UI.

## Step 23
Create boss word/damage loop.

## Step 24
Create first full multi-phase boss.

## Step 25
Implement IndexedDB persistence.

## Step 26
Add autosave, schema version and migrations.

## Step 27
Add Export/Import.

## Step 28
Create effective-stat calculation pipeline.

## Step 29
Implement all core attributes.

## Step 30
Create Item registry and inventory.

## Step 31
Implement first consumables.

## Step 32
Create Equipment and Loadout.

## Step 33
Implement rarity and loot tables.

## Step 34
Implement basic enhancement.

## Step 35
Create skill engine.

## Step 36
Implement defensive skills.

## Step 37
Implement offensive skills.

## Step 38
Implement support-spell loadout.

## Step 39
Create Character registry and Character Select.

## Step 40
Implement Vanguard.

**Status: implemented.**

Current Vanguard combat identity:

- Shield Rhythm restores a small amount of Shield every 20 consecutive correct keys;
- Barrier Pulse is the character active skill and uses the existing Energy/cooldown skill engine;
- Nova Overdrive is Vanguard's 100-Power ultimate, extending Overdrive pressure control and restoring Shield;
- selected Character is now applied to the live combat runtime instead of only the menu/save state.

## Step 41
Implement Stage-100 milestone unlock framework.

**Status: implemented.**

Milestone character unlock rules:

- clearing Stage 100/200/.../1000 unlocks every newly reached milestone character;
- unlocks only add to the permanent roster and never relock when replaying earlier stages;
- older/imported saves synchronize character unlocks from cleared Campaign milestones;
- milestone unlock changes are autosaved with Campaign progress.

## Step 42
Implement remaining milestone characters.

**Status: in progress.**

Implemented character slices:

- Aegis: perfect-word Shield reinforcement, Reflect Field active and Fortress Protocol ultimate;
- Volt: long words restore extra Energy, EMP Burst is the character active and Thunder Grid is the 100-Power ultimate;
- Wraith: streak milestones trigger short Cloak, Phase Cloak blocks incoming hits and Time Collapse slows hostile time while clearing projectiles;
- Fortune: character stats add Luck/Salvage, Lucky Star restores Shield and charges Power, and Jackpot restores combat resources with a timed pressure window;
- Arsenal: character stats add Firepower, Weapon Overclock boosts boss pressure, and Armory Protocol overclocks weapons while advancing nearby targets;
- Oracle: perfect words add Power and short boss marking, Mark of Weakness is the active skill, and Perfect Sentence applies a stronger precision burst;
- Bastion: Guardian Matrix blocks incoming projectile pressure, destroyed projectiles recycle into Shield, and Sanctuary combines Shield, barrier and guardian protection;
- Reaper: streak tiers increase boss damage, Execute advances the current threat or damages bosses, and Death Chain sustains a high-risk offensive window;
- Celestial: perfect words build Celestial Charge, Celestial Stance adapts between offense and defense, and Starfall converts stored charge into a hybrid burst;
- Zenith: Zenith Core rewards clean streak milestones, Zenith Shift is a short hybrid stance, and Zenith Protocol creates a sustained multi-system combat phase instead of an instant-win attack;
- normal enemies track whether the current word received a miss, creating a reusable perfect-word combat hook for precision characters.

**Step 42 status: implemented for all milestone characters.**

## Step 43
Add Character Level and Mastery.

**Status: implemented.**

Current progression rules:

- each character owns independent Level, XP, Mastery and Mastery XP;
- stage clears award progression only to the selected character;
- later stages and stronger typing performance award more XP;
- Level and Mastery add small bonuses through the shared effective-stat pipeline;
- Level is capped at 50 and Mastery at 20;
- old PlayerSave v8 character data migrates to the new progression shape without losing unlocks or selection;
- Character Select shows current Level and Mastery.

## Step 44
Add small branching Talent Trees.

**Status: implemented.**

Talent rules:

- every character has the same compact three-branch structure: Assault, Bulwark and Reactor;
- talent points unlock at Character Level 10, 25 and 40;
- each branch caps at rank 2 and each character has at most 3 points, forcing at least one meaningful branch choice at full progression;
- Assault improves Firepower/Focus, Bulwark improves Shield/Armor and Reactor improves Energy/Reactor;
- talent bonuses use the shared effective-stat pipeline;
- Character Select shows and edits the selected character's talents, including a reset action;
- PlayerSave v9 migrates to v10 with empty Talent Trees while preserving Level, XP, Mastery, unlocks and selection.

## Step 45
Implement Supply Pod.

**Status: implemented.**

Current Supply Pod slice:

- Supply Pods cross the combat field without blocking stage completion;
- each pod owns a normal English vocabulary target and must be typed before it exits;
- beginning a Supply Pod word locks typing to that pod until completion or a miss breaks the streak;
- completed Supply Pod words still use the normal learning hook, so Vietnamese/IPA/pronunciation behavior remains consistent;
- starter rewards restore Hull, Shield, Energy or Power/Overdrive;
- rewards are capped by the normal combat resource limits;
- later Supply/Luck steps may expand reward tables without changing the typing contract.

## Step 46
Implement enemy random drops.

**Status: implemented.**

Current drop rules:

- defeated normal enemies have a small equipment-drop chance;
- Elite enemies use a much higher equipment-drop chance;
- bosses guarantee an equipment drop;
- dropped equipment uses the existing Common/Rare/Epic/Legendary rarity tables and equipment registry;
- Luck improves rarity weighting and Salvage improves drop chance through the effective-stat pipeline;
- drops are added to the existing equipment inventory without auto-equipping them;
- each accepted drop autosaves immediately so closing the page mid-run does not silently lose the item.

## Step 47
Implement Treasure Drone and Golden Enemy.

**Status: implemented.**

Rare-target rules:

- Golden Enemies begin appearing after the early tutorial stages at a bounded low chance;
- Golden Enemies move slightly faster, have a distinct gold visual identity, grant bonus score and guarantee a higher-quality equipment drop table;
- Treasure Drone is a rare non-hostile typing target that crosses the arena independently of normal enemies;
- Treasure Drone uses the normal English vocabulary/learning hook and guarantees a Treasure equipment roll when completed before it escapes;
- neither rare target is required for Campaign progression;
- Step 50 may later add Luck weighting and soft pity without changing these base encounter contracts.

## Step 48
Implement reward-choice crate.

**Status: implemented.**

Reward-choice rules:

- a rare Choice Crate may enter combat after the tutorial portion of Campaign;
- the crate uses a normal English vocabulary target and must be typed before it expires;
- completing the crate pauses combat and presents three distinct equipment rewards;
- reward options use the Treasure rarity table and current Luck stat;
- exactly one reward may be selected;
- the selected equipment is added to inventory, autosaved immediately and combat resumes at the same stage state;
- the reward dialog cannot be dismissed with Escape before choosing, preventing a paused soft-lock.

## Step 49
Implement Anomaly risk/reward crate.

**Status: implemented.**

Anomaly rules:

- Anomaly Crates begin appearing from mid-Campaign at a bounded low chance;
- each Anomaly Crate is a normal English typing target and must be completed before it expires;
- completion pauses combat and forces one of two explicit choices;
- Stabilize is safe, grants a small Shield recovery and uses the strong Golden reward table;
- Overload removes a bounded percentage of max Hull, never reducing the player below 1 Hull, and uses an Epic/Legendary-biased Anomaly reward table;
- the chosen equipment reward uses the existing inventory/autosave path and combat resumes at the same state;
- the decision dialog cannot be dismissed with Escape, preventing unresolved anomaly state.

## Step 50
Implement Luck weighting and soft pity.

**Status: implemented.**

Luck/pity rules:

- Luck now increases the trigger chance of Golden Enemy, Treasure Drone, Choice Crate and Anomaly events after each event's normal introduction stage;
- every rare-event family owns an independent drought counter;
- a failed eligible roll increments only that event's counter, while a successful trigger resets it to zero;
- soft pity increases chance gradually and every event has a bounded maximum chance, so Luck never turns rare encounters into constant guaranteed events;
- stages before an event's introduction do not build pity;
- equipment rarity continues to use the existing Luck-weighted rarity tables, while Salvage continues to affect normal/Elite equipment-drop frequency;
- drought counters are persisted in PlayerSave v11 and survive reload/export/import;
- PlayerSave v10 migrates with zeroed pity counters, preserving all existing Campaign, Character, Talent and equipment progress.

## Step 50A
Implement hidden-content discovery framework: Hidden Shop, Hidden Event/Stage, Hidden Boss trigger, Hidden Skill/Weapon/Mission rewards and Codex ??? entries.

**Status: implemented.**

Hidden-discovery rules:

- six hidden discovery families are registered: Shop, Event/Stage, Boss, Skill, Weapon and Mission;
- undiscovered Codex entries render as `???` and reveal identity, description and unlock contract only after discovery;
- discovery rolls occur at most once for each newly reached Campaign stage, so replaying an old stage cannot farm hidden unlocks or pity;
- each hidden entry has its own introduction stage, Luck-adjusted bounded chance and persistent drought counter;
- overdue entries use a hard guarantee after their configured drought threshold, while at most one hidden entry can be discovered from a stage roll;
- discovered IDs, per-entry drought counters and the last evaluated Campaign stage are persisted in PlayerSave v12;
- PlayerSave v11 migrates with an empty hidden-discovery state while preserving Campaign, Character, Talent, equipment and Luck-pity progress;
- the title menu exposes a Codex dialog and discovery state autosaves immediately through the existing save queue;
- hidden unlock records are contracts for later Shop/Event/Boss/Skill/Weapon/Mission steps rather than parallel implementations of those future systems.

## Step 51
Implement stage random-event scheduler.

**Status: implemented.**

Random-event scheduler rules:

- stage events use the existing `modifierSlots` progression and are deterministic from the stage seed, so retrying a stage cannot reroll for an easier event;
- the initial event pool is Fast Enemies, Armored Enemies, Low Shield, Double Supply and Projectile Storm;
- events unlock gradually from Stage 030 onward and later modifier slots have lower activation chances, preventing every late stage from becoming a fully stacked event stage;
- selected events are unique per stage and capped by the stage's modifier-slot count;
- Luck increases the weighted selection of beneficial events without reducing the base availability of hazards;
- effects are applied through the existing enemy speed/layer, Shield, Supply Pod and projectile-pressure paths rather than parallel combat systems;
- Treasure Drone, Golden Enemy, Choice Crate and Anomaly continue using the Step 50 Luck/pity system and are not rerolled by this scheduler;
- the HUD shows scheduled event names and descriptions for the active stage.

## Step 52
Implement Credits and Normal Shop.

**Status: implemented.**

Credits and Normal Shop rules:

- Credits are the first main currency and are persisted in PlayerSave v13;
- PlayerSave v12 migrates with zero Credits while preserving all existing progress and Step 50A discovery state;
- clearing a stage grants Credits from stage progression, accuracy and the effective Salvage stat;
- Normal Shop offers the three existing recovery consumables plus three regular equipment offers from the existing equipment registry;
- current shop offers are deterministic from Campaign progress, so opening the dialog cannot reroll inventory for advantage;
- later Campaign progress can surface a Rare regular-equipment offer, while hidden equipment remains behind the Step 50A discovery contract;
- purchases are atomic: insufficient Credits, a full item stack or an invalid equipment instance never deducts currency;
- successful purchases update inventory/equipment and autosave immediately;
- repair, enhancement and upgrade services remain Step 53; Black Market/Event Shop behavior remains Step 54.

## Step 53
Implement Repair/Upgrade Shop.

**Status: implemented.**

Repair / Upgrade Shop rules:

- the shop reuses the existing +0 through +5 equipment enhancement system rather than creating a second upgrade layer;
- upgrade prices scale with current enhancement level and equipment rarity;
- max-level, missing and unaffordable upgrades never deduct Credits;
- successful upgrades update the existing equipment instance, immediately refresh effective stats and autosave;
- Repair Station uses existing recovery inventory instead of adding persistent Hull durability that the current game does not have;
- one Repair Station pack grants 1 Repair Kit + 1 Shield Cell for Credits and is atomic: if either stack is full or Credits are insufficient, nothing is deducted;
- no additional currency or material type is introduced in this step.

## Step 54
Implement Black Market/Event Shop.

**Status: implemented.**

Black Market / Event Shop rules:

- both shops consume the Step 50A hidden-discovery contracts instead of adding a second unlock system;
- Black Market appears only after `black-market-signal` is discovered;
- Event Shop appears only after `echo-rift` is discovered;
- undiscovered shops stay hidden from the title menu;
- Black Market offers deterministic Rare/Epic regular equipment, with a Legendary regular-equipment offer only at deep Campaign progress;
- Event Shop offers deterministic special consumables from the existing item registry;
- hidden Relic Cannon/skill/boss/mission contracts are not prematurely inserted into these shops;
- offers are stable for the same Campaign checkpoint and opening the shop cannot reroll them;
- purchases reuse the Step 52 Credits transaction path and are atomic for insufficient Credits, full item stacks or duplicate equipment instance IDs;
- successful purchases immediately update existing inventory/equipment and autosave.

## Step 55
Implement Buff/Debuff/Status engine.

**Status: implemented.**

Status-engine rules:

- one generic in-stage status state tracks positive and negative effects with remaining time, stacks and source;
- status definitions own polarity, stack/refresh behavior, stack caps and cleanseability;
- Ward provides bounded resistance against negative-status application while existing Ward duration scaling remains intact;
- status timers advance only from the active `playing` update loop, so pause does not consume status duration;
- Cleanse removes cleanseable negative statuses and now operates through the generic engine;
- Jammer interference is represented as the `Jammed` negative status while continuing to drive the existing hidden-word interference mechanic;
- Barrier and Sanctuary register `Fortified` positive status stacks and the generic status multiplier feeds the existing incoming-damage path;
- the engine includes the planned positive/negative status IDs from the design so later hazards/enemies can consume the same registry rather than inventing parallel timers;
- active statuses are surfaced in the combat HUD with remaining duration;
- temporary status state is stage-local and is intentionally not persisted.

## Step 56
Implement build Synergy rules.

**Status: implemented.**

Build-synergy rules:

- synergy is a cross-system rule over the existing Character, equipped Equipment and Skill/Support systems; it is not a new progression tree;
- active synergy bonuses feed a dedicated `synergy` layer in effective-stat calculation so they remain separate from Character/Equipment/Talent values;
- `Arc Circuit`: Volt + equipped Compact Reactor; grants a small Firepower/Reactor bonus and makes Chain Lightning reach up to 6 enemies (or 5% boss pressure instead of 4%);
- `Oracle Lens`: Oracle + equipped Targeting Module; grants small Firepower/Focus and extends Mark of Weakness from 8s to 11s;
- `Sanctuary Matrix`: Bastion + equipped Deflector Shield + Sanctuary in the support loadout; grants small Shield/Ward and boosts Sanctuary recovery/barrier duration;
- owning equipment without equipping it does not activate synergy;
- changing Character, loadout, equipment or support-spell loadout recalculates synergies immediately for the next stage;
- active synergies are shown in the Equipment dialog;
- bonuses are intentionally bounded to avoid uncontrolled stat inflation.

## Step 57
Implement Missions and Achievements.

**Status: implemented.**

Missions / Achievements rules:

- one persisted `ProgressionState` owns mission counters, claimed mission rewards and unlocked achievements;
- PlayerSave is upgraded to schema v14; v13 migrates with empty mission/achievement progress while preserving Credits and all prior systems;
- stage clears track total clears and 98%+ accuracy clears;
- successful shop transactions track purchase count and enemy equipment drops track drop count;
- mission rewards are explicit one-time claims paid in Credits through the existing Credits cap/sanitization path;
- achievements are synchronized from durable Campaign/hidden-discovery facts so they cannot be lost when the UI is reopened;
- current achievements cover first clear, Stage 100, 100 unique clears, 99%+ best accuracy, first hidden discovery and reaching Stage 500;
- the title menu exposes a Missions dialog with live progress, claim state and concealed locked achievements;
- progression changes autosave through the existing save queue;
- fixed a recovery-path regression where mirrored localStorage saves could reconstruct without passing persisted Credits into `createPlayerSave`.

## Step 58
Implement Codex/Collection/Meta Progression.

**Status: implemented.**

Codex / Collection / Meta Progression rules:

- Codex now combines Characters, equipment definitions, hidden-content entries and Achievements in one collection view;
- undiscovered identities remain concealed as `???`, including locked Characters, hidden content and locked Achievements;
- collection counts equipment definitions once even if multiple rarity/enhancement instances are owned;
- Meta Points are derived from durable progress: unique cleared stages, unlocked Characters, owned equipment types, hidden discoveries and unlocked Achievements;
- Meta Level is bounded to 1-20 and Meta Rank progresses through Cadet, Navigator, Ace, Commander and Legend thresholds;
- meta progression is derived rather than separately persisted, preventing drift between the Codex and the underlying save data;
- no combat stats, currencies or power rewards are attached to Meta Rank in this step, avoiding a second balance layer;
- the existing Codex menu now shows current Meta Level/Rank/Points plus total collection completion.

## Step 59
Add Galaxy hazards and special stages.

**Status: implemented.**

Galaxy hazard / special-stage rules:

- existing StageRole remains the source of truth: local Stage x30 is `special`, x60 is `hazard`, and x90 is `gauntlet`;
- deterministic role modifiers are prepended to the same stage-event pipeline created in Step 51, so HUD and combat effect application remain shared;
- special stages alternate between Supply Run and Training Window by Galaxy, giving bounded relief without rerolling;
- Galaxy hazard stages rotate Ion Storm, Debris Field, Solar Flare and Gravity Tide by Galaxy;
- gauntlet stages add fixed extra-layer/speed pressure with additional Supply Pod opportunity;
- role modifiers combine with Step 51 random events through the same speed/layer/Shield/Supply/projectile multipliers;
- role modifiers are deterministic from stage identity and cannot be rerolled by retrying;
- no new persistent state or second scheduler is introduced.

## Step 60
Add typing-text challenges when required parent data is available.

**Status: implemented.**

Typing-text challenge rules:

- the runtime reads the parent `/shared/typing-texts/index.json` contract and level files instead of copying passage content into the child repo;
- the parent currently exposes production Level 001-020; an exact selected Class level must exist in the parent typing-text index before a challenge activates;
- Custom vocabulary and Class levels not present in the typing-text index keep the normal configured vocabulary without blocking stage start;
- typing-text challenges activate only on existing `special` StageRole stages (local Stage x30), reusing the special-stage cadence from Step 59;
- passage selection is deterministic from the stage seed, so retrying a stage cannot reroll the passage;
- combat vocabulary comes from the passage `targetWords`; matching entries reuse the selected vocabulary metadata (VI/IPA) and missing metadata degrades to English-only entries;
- target words are deduplicated before use;
- configured Class/Custom vocabulary is restored before every stage so a special-stage challenge cannot leak into later normal stages;
- parent fetch/index/level failures degrade cleanly to the configured vocabulary, preserving standalone child development;
- the HUD identifies the active passage topic, CEFR label and target-word count;
- no passage content is persisted in PlayerSave because the parent corpus remains the source of truth.

## Step 61
Create final art/asset pipeline.

**Status: implemented.**

Art / asset pipeline rules:

- all visual assets are described by a versioned runtime manifest with category, source type, source, author, license and attribution requirement;
- the current production art remains original procedural Canvas/UI artwork and is explicitly recorded as such;
- generated or openly licensed assets may add a bundled URL without changing gameplay contracts;
- optional image assets preload into a catalog/cache before use;
- image or manifest load failure never blocks gameplay: the existing procedural renderer remains the mandatory fallback;
- duplicate/invalid manifest entries are rejected rather than silently accepted;
- required attributions can be derived from the same manifest;
- `docs/ASSET_SOURCES.md` is the human-readable licensing/source policy companion;
- the Data screen reports loaded asset-catalog coverage when the manifest is available;
- no third-party ZType sprites/audio are bundled or referenced.

## Step 62
Polish particles, glow, hit-stop, shake and telegraphs.

**Status: implemented.**

VFX polish rules:

- correct-key laser/flash/recoil and existing quality-scaled particle bursts remain the base feedback layer;
- word completion adds a very short simulation-only hit-stop, while boss-word and boss-defeat impacts use slightly stronger but still sub-100ms stops;
- keyboard handling remains active during hit-stop so visual emphasis never introduces typing input latency;
- hit-stop resets at every stage start and cannot leak into Retry/Next Stage;
- screen shake remains user-controlled and impact feedback only raises the existing bounded shake value;
- enemies with action cooldowns now receive a readable warning ring during the final attack window;
- Sniper keeps its line-to-player telegraph in addition to the shared warning ring;
- bosses receive a larger pulsing attack ring based on their action cooldown and never telegraph while staggered;
- telegraphs are drawn before ship/word rendering so warnings do not cover typing text;
- helper math for hit-stop and telegraph strength/pulse is deterministic and unit-tested.

## Step 63
Tune SFX and pronunciation balance.

**Status: implemented.**

Audio-balance rules:

- SFX now use explicit Typing, Combat, Warnings and UI mix groups under the existing master SFX setting;
- typing feedback and warnings sit above normal combat effects while UI signatures remain quieter;
- pronunciation activity ducks all SFX groups, but warnings retain more headroom than normal combat so danger cues stay audible;
- Web Speech now uses latest-word-wins behavior: starting a new pronunciation cancels stale queued speech instead of building a backlog during fast typing;
- parent BGM ducking continues through the existing `typing-game:speech` message while the same pronunciation lifecycle also drives child SFX ducking;
- word completion has a separate light impact signature layered under existing hit/kill feedback;
- Supply Pod arrival, Epic/Legendary drops, Shield break, stage clear and stage fail have distinct signatures;
- boss entrance/phase/shield/stagger/death remain distinct warning/combat identities;
- Game destruction removes the pronunciation listener and closes its AudioContext;
- grouped gain/duck math is deterministic and unit-tested.

## Step 64
Profile performance and add quality scaling.

**Status: implemented.**

Performance / quality rules:

- the existing `low / medium / high / ultra` visual-quality setting now drives a shared render-quality profile rather than particle count alone;
- quality profiles bound DPR, particle scale/cap, star density, glow strength and background-grid density;
- quality scaling changes rendering cost only; combat timing, enemy pressure, typing rules, loot and progression are unaffected;
- changing visual quality reapplies canvas DPR and star budget immediately;
- a rolling `FrameProfiler` records bounded frame samples and reports average FPS, average frame time, p95 frame time and slow-frame ratio;
- profiling is passive and never changes game difficulty or simulation time;
- the Data screen surfaces rolling FPS/p95 data once enough samples exist;
- quality budgets and profiler math are unit-tested.

## Step 65
Run automated drop/pity simulations.

**Status: implemented.**

Automated loot/pity simulation rules:

- simulations call the production `rollLuckPity`, `rollEquipmentRarity`, `rollEquipmentDrop`, `rarityChanceSummary` and `equipmentDropChance` paths rather than duplicating loot formulas;
- simulation RNG is seeded and deterministic so CI regressions reproduce exactly;
- every equipment source (normal, elite, golden, treasure, anomaly and boss) is sampled at large roll counts;
- empirical rarity frequencies must remain close to the production normalized weights;
- empirical equipment-drop rates must remain close to the production source/Salvage chance;
- persistent soft pity is statistically verified to increase event frequency versus the same base roll without pity;
- high Luck is statistically verified to improve pity-assisted event frequency;
- guaranteed equipment-drop sources remain at 100% in simulation;
- pity counters are checked to remain within their persisted 0-50 bounds.

## Step 66
Manually balance Stage 001-100 through playtesting.

**Status: automated balance audit implemented; manual browser playtest still required.**

Current Stage 001-100 balance guardrails:

- the audit uses the production `createStageConfig` and `difficultyFor` paths for Normal difficulty, Vocabulary Level 001 and a 60 WPM / 96% reference player;
- all 100 first-Galaxy stages are covered and role milestones are verified at their designed cadence;
- consecutive normal stages may not introduce an abrupt pressure-index jump;
- the stage immediately after Elite/Mini-boss/Boss/Hazard/Gauntlet milestones must return to a lower pressure band;
- first-Galaxy enemy speed, spawn interval, projectile pressure and boss pressure remain inside explicit early-game safety bounds;
- this automated audit is a regression guard, not a substitute for the roadmap's manual browser playtest;
- manual feel/timing observations must be recorded before Step 66 can be considered fully complete.

## Step 67
Statistically validate difficulty across Stage 001-1000.

**Status: implemented.**

Campaign difficulty validation rules:

- all 1,000 stages are evaluated through the production `createStageConfig` + `difficultyFor` paths;
- every generated difficulty field must remain finite and inside its production clamp bounds;
- Normal-mode average combat pressure must increase from Galaxy 01 through Galaxy 10 while average spawn interval decreases;
- Relaxed, Normal, Hard and Expert retain their intended ordering at milestone stages across the Campaign;
- higher Vocabulary Levels increase vocabulary complexity while applying the designed reaction-pressure compensation;
- Adaptive difficulty is checked with both struggling and strong reference profiles to ensure responsiveness without escaping global clamps;
- the audit is deterministic and runs in CI so future formula changes cannot silently introduce Campaign-wide statistical regressions.

## Step 68
Tune later Galaxies using milestone playtests rather than manually playing all 1000 stages one-by-one.

**Status: automated milestone tuning audit implemented; manual milestone playtest still required.**

Later-Galaxy tuning rules:

- milestone coverage samples Stage x50 Boss, x60 Hazard, x90 Gauntlet and x100 Major Boss in every Galaxy;
- the audit uses production `createStageConfig` and `difficultyFor` with progressively harder reference Vocabulary Levels;
- same-role combat-pressure growth between adjacent Galaxies must stay gradual rather than introducing sudden late-game cliffs;
- reaction metrics remain inside global speed/spawn/projectile/boss caps;
- each Galaxy's Major Boss remains harder than its Stage x50 Boss under the production model;
- the generated 40-stage milestone list is the intended manual playtest set, replacing any requirement to manually play all 1,000 stages;
- automated statistics found no formula change necessary at this checkpoint;
- manual feel/timing observations are still required before Step 68 is considered fully complete.

## Step 69
Integrate space-typing into parent as a submodule.

**Status: implemented.**

- parent repo `sinhvienaiti/typing-game` contains `games/space-typing` as a Git submodule on child branch `main`;
- parent checkpoint `bcd81cedca6b8fdf55839e6ce7cf10db636337f9` pins child checkpoint `cba924d14b47613439ae5ee1ccc2b7ffa19a21d2`;
- child remains the authoritative implementation repo; parent only pins a tested child commit.

## Step 70
Add parent nginx/dev/play/build/navigation support.

**Status: implemented.**

- parent supports `./dev.sh space`, `pnpm dev:space`, `pnpm build:space` and normal all-app development;
- Play mode rebuilds Space Typing only when its static output is missing/stale;
- Portal exposes `/space-typing` and internal origin `https://space.typing-game.local`;
- Dev and Play nginx expose parent shared `/vocabulary/` and `/shared/typing-texts/` routes on the Space origin;
- existing shared-music/navigation contracts remain parent-owned.

## Step 71
Verify existing games are unaffected.

**Status: implemented at platform-contract level; final manual smoke remains part of review.**

- parent validation protects existing Monkeytype, Vocabulary Shooter, Recall Typing and Karaoke Typing routes/origins while checking the Space Typing integration;
- Space Typing uses its own port/origin and does not replace existing game scripts or routes;
- final browser smoke across all games is still included in the final review checklist.

## Step 72
Run child CI and parent CI.

**Status: implemented.**

- child push CI #123 passed on `cba924d14b47613439ae5ee1ccc2b7ffa19a21d2`;
- parent push CI #157 passed on `bcd81cedca6b8fdf55839e6ce7cf10db636337f9`;
- parent CI runs `pnpm validate:space-integration` as the platform integration contract.

## Step 73
Run complete Review Pass #1 and fix all issues.

**Status: implemented and CI-verified.**

Review Pass #1 findings/fixes:

- persistence recovery now prefers the newer full save when Campaign progress ties, preventing newer Credits/inventory/equipment/progression state from being silently replaced by an older IndexedDB snapshot;
- mission/progression backup validation is structural and no longer depends on JSON object key order;
- stage WPM uses pause-safe active gameplay seconds instead of wall-clock time, so pause/reward/anomaly dialogs do not reduce measured WPM;
- runtime difficulty now exposes Relaxed / Normal / Hard / Expert / Adaptive / Custom instead of hardcoding Normal at 60 WPM / 96% accuracy;
- Adaptive keeps a bounded EMA profile from valid Campaign stage clears and feeds the production `difficultyFor` path between stages;
- Custom mode wires target WPM and pressure into the existing difficulty model without changing the combat formulas;
- delayed multi-note SFX timers are cancelled on destroy and cannot recreate an `AudioContext` after teardown;
- failed stages checkpoint current persistent pity state at Game Over rather than relying only on a later pagehide/save;
- equipment selected from Choice Crates now counts toward equipment-drop mission progression;
- targeted tests cover recovery freshness, structural progression validation, active-time WPM, adaptive smoothing/runtime settings and SFX teardown;
- PR #22 CI #126 passed Test and Build before this documentation checkpoint.

## Step 74
Run complete Review Pass #2.

**Status: implemented and CI-verified.**

Review Pass #2 findings/fixes:

- stage-only HUD state is cleared when leaving active gameplay so event/status/boss/typing-text badges cannot leak onto Title, Stage Clear or Game Over screens;
- already-visible Supply Pod / Treasure Drone / Choice Crate / Anomaly targets can be started before an untouched Boss, while a Boss word already in progress keeps its input lock;
- the parent shared vocabulary index is structurally validated before the game exposes level metadata or file paths;
- Campaign start now waits for both persistence and initial vocabulary bootstrap, eliminating the race where an early click could start a normal stage with bundled fallback words while shared vocabulary was still loading;
- unavailable shared vocabulary still intentionally falls back to bundled words and unlocks play after the load attempt completes;
- an invalid stored Custom vocabulary source is normalized back to Class Level 001 instead of retrying the broken source on every reload;
- regression tests cover boss-stage target priority and shared vocabulary index validation;
- PR #23 CI #129 passed Test and Build before this documentation checkpoint.

## Step 75
Only mark the milestone complete when both review passes are clean.

**Status: code/platform milestone complete.**

Final reviewed checkpoints:

- Review Pass #1 was merged to child `main` and child push CI #128 passed;
- Review Pass #2 was merged to child `main` at gameplay checkpoint `9b9367479b0d47216cb7a13a859a5c38f0511dc6`, and child push CI #131 passed;
- parent `sinhvienaiti/typing-game` pins that reviewed gameplay checkpoint through `games/space-typing`;
- parent final integration commit `157344c36924d1824c53a70f7558f28e5951d475` passed Platform CI #159, including the Space Typing integration contract, shared-data validation, Space Typing test/build, Portal build and Recall Typing regression checks;
- no known code/CI regression remains in the reviewed milestone.

Manual validation note:

- Steps 66 and 68 intentionally retain browser playtest/feel checks that cannot be proven by GitHub CI alone;
- Step 71 likewise retains final manual browser smoke across the local games;
- those manual observations are not falsely marked as executed by this GitHub-only checkpoint.

## Post-milestone enemy visual/reward expansion

The next major visual/gameplay expansion is defined in:

`docs/ENEMY_SYSTEM_MASTER_PLAN.md`

Status:

- original implementation PR #26 is merged;
- final independent audit branch: `review/enemy-system-final-audit`;
- final audit PR: `#27`;
- E01-E12 are implemented;
- E13 automated readability/asset/performance audit is implemented, while manual browser/art/audio approval is still pending;
- E14/E15 plus the final independent audit found and fixed additional correctness, visual-readability, audio-lifecycle and performance issues;
- reviewed audit head `9b32699e9812158e5ea4bbbbe0a0916f50ddc7f6` passed CI #159 Test + Build before the documentation update;
- the final audit restored all four V1 Mini Boss identities, enforced visual unlock stages, removed misleading unused registry scaling fields, corrected Damage Up duration, removed ineffective boss rewards, differentiated active reward markers, improved family visuals/audio feedback, exposed control/buff state visually, bounded high-DPI canvas cost and cached static render/audio resources;
- the enemy-system milestone is **not** marked fully complete until the manual visual/browser/audio readability and feel gate is performed;
- `docs/ENEMY_SYSTEM_MASTER_PLAN.md` remains the source of truth for enemy art direction, modular visual families, reward-on-kill effects, roster and implementation order;
- implementation reuses the existing combat, status, loot, boss, skill, particle/SFX and asset-pipeline systems rather than creating parallel frameworks;
- the project-original procedural renderer remains the runtime fallback and asset-source metadata is maintained in `docs/ASSET_SOURCES.md` plus the asset manifest.

---

# 21. First playable milestone

The complete vision is intentionally large.

Do not build all 18 systems at once.

The first major playable milestone should prove:

~~~text
typing feels excellent
wide arena looks good
shared vocabulary works
difficulty rises
Campaign save/unlock works
boss HP typing works
~~~

Recommended first milestone:

~~~text
Stage 001-020
Vanguard
5 enemy types
1 Elite
1 Boss
shared vocabulary
VI + IPA + pronunciation
score/streak/power
basic Hull/Shield/Energy
1 offensive skill
1 defensive skill
basic persistence
Stage Select
difficulty option + basic WPM adaptation
Supply Pod
3 consumables
1 rare/hidden discovery event
~~~

After this is fun/stable, scale toward the full 1000-stage architecture.

---

# 22. Definition of done

A major feature is complete only when:

1. behavior matches this source of truth or an explicitly updated requirement;
2. code is simple and maintainable;
3. function inputs/outputs are verified;
4. important deterministic logic has tests;
5. no known regression remains;
6. save compatibility is considered;
7. performance, readability and information hierarchy are checked;
8. audio feedback is checked for clarity, latency and mix balance;
9. child CI passes;
10. parent integration is updated only when required;
11. documentation is updated;
12. Review Pass #1 is clean;
13. Review Pass #2 is clean.

---

# 23. Current status

Current implementation checkpoint:

~~~text
Historical implementation:
- Steps 01-75 are present in this document and form the pre-expansion gameplay/platform baseline.
- Automated/code milestones are implemented as recorded in their individual sections.
- Manual browser/audio/playtest items explicitly left open in Steps 66/68/71/75 remain manual validation work, not missing runtime systems.

Gameplay Expansion:
- M01 Domain contracts + expansion save foundation: COMPLETE
- M02 Ten-stage checkpoint + rollback: COMPLETE
- M03 Crash recovery: COMPLETE
- M04 Resurrection/protection items: COMPLETE
- M05 Grade + core currency migration: COMPLETE
- M06 Deterministic finite-stock shops: COMPLETE
- M07 Canonical 50-World engine: COMPLETE
- M08 Dynamic World Music / Ambient runtime: COMPLETE
- M09 World enemy/boss roster mapping: COMPLETE
- M10 Enemy Rank I-X + WordDifficultyScore + typing layers: COMPLETE
- M11 Enemy skill/effect framework + Threat Budget: COMPLETE
- M12 Difficulty + Active Typing Pressure scheduler: COMPLETE
- M13 Formation system: COMPLETE
- M14 Branching Route Map + Station: COMPLETE
- M15 Hidden Challenge / Hidden World / Champion Hunt: COMPLETE
- M16 Stage Objectives + boss typing mechanics: COMPLETE
- M17 Skill/attribute/equipment upgrade expansion: COMPLETE
- M18 Run Relics: COMPLETE

Next:
- M19 Reward layer expansion + Codex
~~~

Current gameplay/progression foundation:

- 1000-stage persistent Campaign;
- ten-stage committed checkpoint sectors with separate highest-reached state;
- technical crash recovery separated from gameplay death rollback;
- Salvage Anchor / Stage Revival Core / Phoenix Core death-protection paths;
- adaptive Stage + WPM + Accuracy + Vocabulary difficulty;
- 15 mechanically distinct enemy families plus Elite/Boss systems and later enemy-visual/reward layers already present in the repository;
- Hull / Shield / Armor / Energy / Reactor / Focus / Ward runtime;
- unified effective-stat pipeline;
- persistent Character roster, Level/Mastery/Talents and milestone unlocks;
- generic status engine and build synergies;
- stable item registry + persistent inventory;
- seven equipment slots:
  Weapon / Armor / Shield / Reactor / Utility / Drone / Core;
- equipment instance persistence with Aluminum / Copper / Silver / Gold / Diamond grades and +0 through +5 enhancement;
- legacy Common / Rare / Epic / Legendary equipment is migration-only compatibility data;
- Luck-adjusted five-grade equipment weighting without guaranteed Diamond;
- persistent Credits / Alloy / Star Crystal / Quantum Core economy;
- deterministic finite shop instances with persistent stock;
- shared Normal / Station / Traveling / Black Market / Hidden / Event stock runtime;
- canonical 50-World registry with deterministic 20-stage mapping;
- per-World environment profiles consumed by the existing Canvas background;
- World transition/title identity presentation;
- M06 shop identity resolved through the canonical World registry;
- one state-driven World music controller with World/Intense/Boss/Shop/Station/Victory/Defeat states;
- separate Music/Ambient gain buses and crossfade lifecycle;
- pronunciation/announcer/warning soundtrack ducking through existing audio events;
- local override -> repository/default -> fail-soft soundtrack asset resolution;
- current WorldProfile is the production source for enemy family/visual/reward identity;
- World Elite pools and Mini Boss / World Boss identities are validated against the shared enemy registry;
- Campaign boss cadence follows the canonical World rhythm: local 10 Mini Boss, local 20 World Boss, x100 Galaxy Major Boss;
- current World rankDistribution is the authoritative Enemy Rank I-X band source;
- production enemies resolve Rank from World band + WordDifficultyScore + archetype/Elite/layer pressure;
- Rank I-III / IV-VI / VII-X normally resolve to 1 / 2 / 3 semantic typing layers;
- each completed enemy layer consumes one complete word and selects a new rank-band word for the next layer;
- enemy typing UI renders Rank, current Shield/Armor/Ward/Spell Barrier/Core identity and three fixed layer segments;
- Carrier/Splitter child spawns use the same M09 World roster + M10 typing-profile path;
- enemy attack/defense/control/support skill contracts resolve once per spawn from archetype signature + World family pools;
- enemy skills use explicit cooldown -> telegraph -> execute lifecycle;
- Freeze/Silence reuse the existing status engine with hard-CC anti-chain and post-effect immunity;
- every runtime enemy skill profile is bounded by an eight-axis Threat Budget audit;
- six fixed difficulty modes now cover Relax / Balanced / Hard / Extreme / Nightmare / Impossible, plus Adaptive/Custom;
- difficulty exposes explicit pressure budget, urgent-threat cap, controller/support density, reaction, CC, attack and reward dimensions;
- regular Campaign spawns, Carrier summons and Splitter fragments pass through Active Typing Pressure admission;
- pressure-denied regular spawns retry without consuming stage enemy budget;
- authored formations are aggregate M12 pressure packages and spawn atomically only after pressure/urgent/controller-support/max-enemy validation;
- M13 formation members reuse the same M09 World visual roster + M10 typing profile + M11 skill/Threat Budget runtime as solo enemies;
- deterministic ten-stage route graphs keep Campaign stages sequential while adding persisted Combat / Shop / Station choices;
- mandatory Mini Boss / World Boss / Galaxy Major Boss stages remain forced Combat route nodes;
- RouteState is part of RunPersistentState, so route choices participate in checkpoint rollback, stage-entry protection and technical crash recovery;
- Shop/Station route nodes reuse the existing deterministic ShopState / Service Shop / Support Loadout systems rather than creating parallel services;
- discovered Hidden Challenge / Hidden World / Champion Hunt offers extend the existing Route Map instead of adding a second navigation layer;
- hidden encounters use optional state inside HiddenDiscoveryState and therefore participate in existing checkpoint/crash/stage-entry recovery without a PlayerSave version bump;
- Hidden World reuses environment/World-roster/boss registries to build deterministic 3-4 encounter detours without numbered Campaign stages;
- Champion Hunt reuses PriorityKillChain and M08 announcer ducking; normal Campaign enemies still do not advance the chain;
- hidden clears bypass numbered Campaign recordStageClear/checkpoint progression and award premium rewards through existing economy systems;
- numbered Campaign stages now support event-driven required/bonus objectives without a parallel polling runtime;
- M16 objective rewards scale from M12 difficulty and reuse existing Credits/expansion-currency rewards;
- BossState phases now resolve one World-family typing mechanic at a time: Interrupt Charge / Shield Sequence / Weak Point / Rapid Rage / Accuracy Curse;
- boss typing mechanics reuse the existing vocabulary, phase, projectile, HUD, SFX/VFX and reward paths;
- difficulty word pressure stays inside the configured vocabulary and does not change authored World Rank access;
- stage-clear economy rewards use the frozen stage-start difficulty reward multiplier;
- Service / Upgrade Shop consumes Credits + Alloy through the existing enhancement system;
- M17 UpgradeState persists core skill Lv1-Lv5 and permanent core-stat training through PlayerSave/checkpoint/crash/death rollback;
- Lv5 core-skill mastery and level scaling compile into the existing SkillEngine/Game execution paths;
- equipment instances can carry bounded grade-dependent affixes; Station services support dismantle, Silver/Gold evolution and affix roll/reroll without a second equipment system;
- M18 RelicState is run-persistent build state with up to 3 equipped Relics; sector/Hidden Encounter reward paths unlock deterministic eligible Relics;
- equipped Relics compile only on loadout changes into direct combat fields for first-word sustain, perfect-word chaining, streak freeze, long boss-word damage and miss guarding;
- Relic loadout management reuses the existing Station Service / Upgrade screen and autosave queue;
- rare resurrection items can appear only as finite stock in eligible rare merchant pools;
- shop stock participates in checkpoint rollback, crash recovery and stage-entry recovery;
- Skill Engine:
  Energy / cooldown / charges / typing conditions / per-stage limits;
- defensive and offensive combat skills plus 2-slot Support Spell loadout;
- M19 expands stage-clear rewards with difficulty-relative performance badges, stronger sector caches and Campaign boss choose-one rewards while reusing the existing reward/economy paths;
- M19 Codex records World, enemy/boss and reward knowledge; discoveries are merged across persistence sources and intentionally survive gameplay checkpoint rollback;
- M20 Ascension replays the same 1000-stage / 50-World Campaign across 10 bounded tiers; each tier has a sequential frontier, deterministic boss mutations and bounded Rank/formation/reward pressure while M12 safety caps remain authoritative;
- Ascension frontier is part of RunPersistentState and therefore reuses the existing checkpoint/crash/stage-entry/death-protection paths; tier switching is allowed only at committed ten-stage boundaries;
- M21 adds one isolated Developer Test Lab using a disposable in-memory TestLabSession plus a gated production Game runtime; it never writes production PlayerSave and reuses production combat, recovery, shop, reward, equipment, Relic, difficulty and MusicController paths;
- Test Lab CI completeness is registry-driven so new production Worlds/enemies/bosses/items/equipment/skills/statuses/shops/music profiles cannot silently disappear from QA discovery;
- IndexedDB PlayerSave schema v25;
- explicit migrations from all earlier supported PlayerSave schemas;
- synchronized recovery mirror + autosave queue + validated JSON backup/import.

Recent expansion validation checkpoints:

~~~text
M01 Domain Contracts
PASS

M02 Checkpoint / Rollback
PASS

M03 Crash Recovery
PASS

M04 Death Protection
PASS

M05 Grade + Core Currency Migration
CI #190 PASS

M06 Deterministic Finite-Stock Shops
CI #195 PASS after removal of superseded parallel shop modules

M07 Canonical World Engine
CI #202 PASS Test + Build

M08 Dynamic World Music / Ambient Runtime
CI #208 PASS 405 tests + Build
Final audio binaries/loudness/licensing remain a manual asset gate.

M09 World Enemy / Boss Roster Mapping
CI #218 PASS 413 tests + Build

M10 Enemy Rank / Word Difficulty / Typing Layers
CI #225 PASS Test + Build

M11 Enemy Skills / CC Guard / Threat Budget
CI #227 PASS Test + Build

M12 Difficulty / Active Typing Pressure
CI #235 PASS Test + Build
Final docs checkpoint CI #238 PASS Test + Build

M13 Formation System
CI #242 PASS Test + Build after RNG callback/signature fix
Final docs checkpoint CI #245 PASS Test + Build

M14 Branching Route Map / Station
CI #250 PASS Test + Build
Integration music lifecycle CI #251 PASS Test + Build

M15 Hidden Challenge / Hidden World / Champion Hunt
CI #262 PASS Test + Build on implementation head

M16 Stage Objectives / Boss Typing Mechanics
CI #270 PASS Test + Build on implementation head

M17 Skill / Attribute / Equipment Upgrade Expansion
CI #281 PASS · 517/517 tests · TypeScript check + production build

M18 Run Relics
CI #286 PASS · 522/522 tests · TypeScript check + production build

M19 Reward Layer Expansion + Codex
CI #297 PASS · 531/531 tests · TypeScript check + production build

M20 Ascension
CI #335 PASS · 548/548 tests · TypeScript check + production build

M21 Developer QA / Test Lab
CI #376 PASS · 111 test files · 561/561 tests · TypeScript check + production build

M22 Full Balance / Performance Audit — AUTOMATED PASS, MANUAL GATE PENDING
CI #395 PASS · 116 test files · 583/583 tests · TypeScript check + production build + bundle budget
Manual-gate support: Developer Test Lab includes a 43-row QA-only recorder with per-row/default browser-device metadata, live runtime/performance/music evidence capture, explicit real-audio + High/Ultra-browser + low/mid/high human-paced attestations and Markdown export; real browser/audio/human-paced execution remains mandatory.
Pre-M22 polish slice: `docs/PRE_M22_UI_RECALL_CHARACTER_POLISH_PLAN.md` P00-P08.1 COMPLETE. RPG HUD slice `docs/PRE_M22_RPG_HUD_HOTBAR_PLAN.md` H01-H06 COMPLETE with PlayerSave v26. Stage-transition slice `docs/PRE_M22_STAGE_TRANSITION_PLAN.md` T01-T06 is implementation-complete pending final CI: every stage gets a short skippable pre-combat transition; World/Galaxy/Boss/Hidden encounters escalate visually; the transition resolves before `game.startStage()`, so combat cannot run behind it. M23 remains blocked until the final M22 manual gate passes.
~~~

Important implementation notes:

- Current PlayerSave schema is version 26. v25 -> v26 adds HotbarState with a deterministic legacy-compatible 1-9 layout while preserving AscensionState, CodexState, RelicState, UpgradeState, Campaign, equipment, ShopState, RouteState and recovery data. HotbarState is top-level PlayerSave preference state rather than RunPersistentState, so checkpoint/death rollback does not undo the user's key layout.
- AscensionState is part of RunPersistentState because tier frontier/economic progression must obey checkpoint rollback, crash recovery and stage-entry resurrection semantics. No parallel Ascension checkpoint store exists.
- Codex knowledge remains outside RunPersistentState/checkpoint rollback; recovery-source selection merges valid discoveries so technical recovery or gameplay rollback cannot erase already learned information.
- Test Lab preset localStorage is QA configuration only; Test Lab gameplay state is in-memory and must never be interpreted as PlayerSave/run persistence.
- M22 automated audit found and fixed child/summoned-enemy admission exceeding DifficultyProfile.maxEnemies; shared canAdmitSpawn now enforces the hard active-enemy cap for regular, Carrier and Splitter paths.
- M22 is not complete until docs/M22_MANUAL_PLAYTEST_MATRIX.md is executed on a real browser/audio device; M23 must not begin before that gate.
- Permanent systems must extend PlayerSave through explicit migrations.
- Current runtime equipment uses the five-grade model; legacy rarity names remain only in migration/compatibility paths and historical step notes.
- `ShopState` and `RouteState` are part of `RunPersistentState`, so shop stock and route choices are segment state rather than separate local-storage systems.
- M07 canonical World ids are the authoritative World identity used by M06 shop instances, M08 music profiles, M09 enemy/boss roster selection and M10 World rank bands; M12 changes pressure, not World access.
- Event/special tokens remain optional per the expansion plan. M06 does not create a permanent Event Token before an earning loop exists.
- Support spell loadout remains separate from core combat skills, but combat shortcuts are unified through the configurable 1-9 hotbar.
- Hotbar slots 1-9 may reference the three implemented recovery consumables, core defensive/offensive skills, equipped support skills or the selected character's active skill.
- Space remains the dedicated Overdrive key. Legacy hard-coded 1-3 / 4-9 / 0 / - / [ ] / = combat bindings are replaced by the hotbar routing layer.
- Parent vocabulary and shared Music contracts remain unchanged.

Project-wide requirements remain:

- Campaign scope: 1000 stages;
- 50 Worlds × 20 stages is the canonical Campaign mapping;
- character milestone unlocks: every 100 Campaign stages;
- parent vocabulary library: 18,000 entries / 100 levels;
- parent typing-text corpus: shared through the parent project;
- `docs/PROJECT_CONTEXT.md` remains the primary context/handoff document;
- `docs/GAMEPLAY_EXPANSION_MASTER_PLAN.md` is the numbered expansion execution plan.

---

# 24. Handoff rule

For any new session working on Space Typing:

~~~text
Read:
sinhvienaiti/space-typing
docs/PROJECT_CONTEXT.md

Treat it as source of truth.

Then inspect current GitHub main branch state before changing code.
Do not use chat history as repository state.
Continue from the latest valid GitHub checkpoint.
~~~
