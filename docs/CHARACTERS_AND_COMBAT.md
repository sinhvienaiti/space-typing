# Characters, skills and stationary combat

## Core combat rule

Space Typing is a typing combat game.

The player ship/character does not move around the battlefield.

Survival and combat depth therefore come from:

~~~text
typing skill
target priority
defensive skills
offensive skills
spells
equipment
temporary buffs
consumables
character passives
resource management
luck/random events
~~~

Do not add movement mechanics that compete with typing.

## Input rule

Normal letter keys are reserved for typing targets.

Active abilities must not steal ordinary typing letters.

Preferred controls:

~~~text
1 / 2 / 3 / 4
-> active abilities

Space
-> Overdrive / ultimate when available

Esc
-> pause

mouse/touch
-> optional UI activation
~~~

A future spell system may also use special typed spell prompts, but it must enter an explicit command state so spell text cannot be confused with enemy target text.

## Combat stats

Use stats that matter without movement.

~~~text
Hull
-> base health

Shield
-> renewable damage layer

Firepower
-> damage produced by correct typing

Armor
-> reduces incoming damage

Energy
-> active-skill resource capacity

Reactor
-> Energy regeneration

Focus
-> typing-based Power gain, combo stability and precision bonuses

Ward
-> defensive spell strength / status resistance

Luck
-> supply, rare event and reward quality weighting

Salvage
-> Credits/material/equipment-drop efficiency
~~~

Avoid a movement-speed stat as a core attribute.

## Defensive mechanics

Because the player cannot dodge manually, the game needs rich defensive options.

Examples:

### Barrier

Temporary shield that absorbs several hits.

### Reflect Field

Returns enemy projectiles to their owner.

### Time Shell

Slows all enemies/projectiles for a short duration.

### Phase Cloak

Enemy projectiles cannot target the player for a short window.

### Word Guard

The next typing mistake does not break the streak.

### Perfect Guard

Completing a word with no mistakes grants a small temporary shield.

### Emergency Repair

Restore Hull, with a long cooldown or Energy cost.

### Guardian Drone

Automatically destroys one dangerous projectile at intervals.

### Purify

Removes Jammer, Silence, Curse or other negative effects.

### Last Stand

A lethal hit leaves the player at 1 Hull once per stage/run.

### Fortress

Large Shield gain but lower Firepower for its duration.

## Offensive mechanics

### Nova Bomb

Large area damage and projectile clear.

### EMP

Stops enemy shooting and disables shielded enemies temporarily.

### Chain Lightning

A completed target chains damage into nearby enemies.

### Rail Strike

A perfect word triggers a high-damage piercing attack.

### Meteor Barrage

Calls several delayed area strikes.

### Mark of Weakness

The selected boss/enemy takes increased damage from completed words.

### Execute

Instantly destroys a normal enemy below a health threshold.

### Pulse Storm

Each correct key emits small secondary shots for several seconds.

### Overclock

Higher Firepower and Power gain, but Shield regeneration pauses temporarily.

### Word Collapse

Completing a long word creates area damage based on word length.

## Support / control skills

### Freeze

Stops selected enemies temporarily.

### Gravity Well

Slows a group of enemies and pulls their projectiles into a safe point.

### Silence

Prevents Destroyer/Oppressor/Boss projectile attacks.

### Cleanse Word

Removes an enemy buff or shield layer.

### Scan

Reveals Cloaked/Jammer enemies and highlights priority targets.

### Supply Beacon

Raises the chance of a Supply Pod appearing during the stage.

### Lucky Star

Temporarily raises Luck and rare-drop weighting.

## Consumables

Consumables are limited resources stored during a run.

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

Some may be carried between stages; stronger consumables may have per-stage limits.

## Skill activation and cooldowns

Abilities should combine:

~~~text
Energy cost
cooldown
charges
typing conditions
~~~

Examples:

~~~text
Reflect Field
Energy 30
Cooldown 18 sec

Rail Strike
requires 3 perfect words
no Energy cost

Emergency Repair
1 charge / stage

Lucky Star
Energy 45
Cooldown 35 sec
~~~

This prevents ability spam.

## Typing-linked skill triggers

The strongest mechanics should reward typing behavior.

Examples:

~~~text
10 correct keys
-> Shield pulse

3 perfect words
-> Rail Strike ready

50 streak
-> Time Shell proc

word length >= 10
-> bonus Power

perfect boss word
-> boss stagger

destroy enemy projectile by typing
-> recover Energy

100% accuracy for current wave
-> guaranteed temporary buff choice
~~~

## Character system

Characters are distinct combat classes.

A character has:

~~~text
base stats
passive ability
active skill
ultimate
starting equipment affinity
unique visual ship/character design
~~~

Later characters are stronger overall, but earlier characters retain unique builds and may receive upgrades so they remain useful.

## Character unlock progression

The Campaign has 1000 stages grouped into ten 100-stage Galaxies.

Starting character:

~~~text
Stage 001
Character 01 available
~~~

Clearing each 100-stage milestone unlocks a stronger character.

~~~text
Clear 100
-> Character 02

Clear 200
-> Character 03

Clear 300
-> Character 04

Clear 400
-> Character 05

Clear 500
-> Character 06

Clear 600
-> Character 07

Clear 700
-> Character 08

Clear 800
-> Character 09

Clear 900
-> Character 10

Clear 1000
-> secret/final Character 11
~~~

Unlocks are permanent.

## Proposed character roster

### 01. Vanguard

Role:
balanced starter

Strengths:
stable Hull/Shield, easy Energy management

Passive:
every 20 consecutive correct keys restores a small Shield amount

Active:
Barrier Pulse

Ultimate:
Nova Overdrive

Purpose:
teaches the whole combat system without strong weaknesses.

### 02. Aegis

Unlock:
Stage 100

Role:
defensive tank

Stats:
high Hull, high Armor, lower Firepower

Passive:
perfect words reinforce Shield

Active:
Reflect Field

Ultimate:
Fortress Protocol — large Shield plus projectile reflection

### 03. Volt

Unlock:
Stage 200

Role:
Energy caster

Stats:
high Energy/Reactor

Passive:
long words restore additional Energy

Active:
EMP Burst

Ultimate:
Thunder Grid — Chain Lightning repeatedly attacks multiple enemies

### 04. Wraith

Unlock:
Stage 300

Role:
control / survival

Stats:
high Focus/Ward

Passive:
large streak periodically triggers short Cloak

Active:
Phase Cloak

Ultimate:
Time Collapse — heavily slows enemies and projectiles

### 05. Fortune

Unlock:
Stage 400

Role:
Luck / loot specialist

Stats:
very high Luck/Salvage

Passive:
higher Supply, Treasure Drone and rare event weighting

Active:
Lucky Star

Ultimate:
Jackpot — immediately rolls several controlled reward effects

This character should be fun but not able to trivialize difficulty through loot alone.

### 06. Arsenal

Unlock:
Stage 500

Role:
weapon specialist

Stats:
high Firepower

Passive:
weapon pickups last longer and gain an extra effect

Active:
Weapon Overclock

Ultimate:
Armory Protocol — temporarily combines two weapon families

### 07. Oracle

Unlock:
Stage 600

Role:
precision typing

Stats:
very high Focus

Passive:
perfect words deal substantially more boss damage

Active:
Mark of Weakness

Ultimate:
Perfect Sentence — a high-value typing challenge that deals massive damage when completed cleanly

### 08. Bastion

Unlock:
Stage 700

Role:
shield/support master

Stats:
very high Shield/Ward

Passive:
destroying enemy projectiles recharges Shield

Active:
Guardian Matrix

Ultimate:
Sanctuary — blocks damage and cleanses negative effects for a limited duration

### 09. Reaper

Unlock:
Stage 800

Role:
high-risk offense

Stats:
extreme Firepower, lower defensive stats

Passive:
damage grows with current streak

Active:
Execute

Ultimate:
Death Chain — completed words chain heavy damage through the battlefield

### 10. Celestial

Unlock:
Stage 900

Role:
late-game hybrid

Stats:
high across most categories

Passive:
perfect words generate Celestial Charge

Active:
choose offensive or defensive Celestial stance

Ultimate:
Starfall — damage, projectile clear and temporary buffs together

### 11. Zenith

Unlock:
Stage 1000

Role:
secret final character

This is the strongest base character but should still require skill to exploit.

Passive:
combines small versions of multiple milestone-character passives

Active:
adaptive skill selected from the current combat need

Ultimate:
Zenith Protocol — a powerful multi-phase typing ability rather than a simple instant-win button

Zenith is a post-Campaign reward for Endless, Boss Rush and replaying difficult stages.

## Character upgrades

Unlocking a later character does not delete progression on earlier characters.

Characters may have individual mastery levels earned through use.

Mastery can unlock:

~~~text
passive upgrade
active-skill modifier
ultimate modifier
starting bonus
cosmetic effect
small stat growth
~~~

This preserves replay value.

## Boss combat

Bosses have real HP bars.

~~~text
BOSS NAME
HP ████████████████████
~~~

A boss repeatedly presents attack words.

~~~text
word appears
-> player types correct keys
-> each correct key creates minor damage/hit feedback
-> completing the word creates major damage
-> boss HP decreases
-> new controlled-random word appears
-> repeat until phase threshold or zero HP
~~~

Boss words are selected from the active vocabulary level with length/difficulty rules appropriate to the boss/stage.

Boss HP is not a fixed number of words. Equipment, Firepower, buffs, accuracy and special mechanics can change damage.

## Boss phase example

~~~text
100% - 70%
normal attack words

70% - 40%
boss fires letter projectiles
summons adds

40% - 15%
shield phase
type shield words before core words

15% - 0%
rage
faster attacks
harder words
shorter reaction windows
~~~

Bosses may stagger after perfect words, powerful spells or specific mechanics.

## Boss readability

The boss HP bar, current attack word and dangerous projectiles must remain visually clear even during heavy effects.

Visual spectacle must never hide typing targets.

## Design principle

Because there is no movement, every meaningful combat decision should be expressible through:

~~~text
what to type first
how accurately to type
when to spend Energy
which skill to activate
which consumable to save
which character/build to use
which random opportunity to take
which risk to accept
~~~

That is the core tactical layer of Space Typing.
