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
- 50 main Worlds with enemies, bosses, visuals, hazards, rewards and shops that match each World;
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
- musicMood
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

---

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

# 32. Automated balance and simulation requirements

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

# 33. Manual playtest matrix

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

# 34. Implementation roadmap

Do not build all systems in one PR.

Every milestone requires tests, CI and docs before continuing.

## M00 — Source of truth

- add this plan;
- keep legacy docs intact;
- document conflicts/superseded rhythms.

## M01 — Domain contracts + next PlayerSave schema

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

Implement:

- checkpoint every ten stages;
- committed state;
- active segment state;
- death rollback;
- highestReached separate from checkpoint;
- Stage Select anti-bypass rules.

## M03 — Crash recovery

Implement:

- technical recovery after safe transitions;
- death-invalid recovery;
- deterministic restoration;
- anti-reload exploit tests.

## M04 — Resurrection/protection items

Implement:

- Salvage Anchor;
- Stage Revival Core;
- Phoenix Core;
- death-choice UI;
- stage-entry snapshot;
- current-encounter resurrection path.

## M05 — Grade + currency migration

Implement:

- Aluminum/Copper/Silver/Gold/Diamond;
- legacy equipment migration;
- Credits/Alloy/Star Crystal/Quantum Core;
- segment rollback semantics.

## M06 — Random finite-stock shops

Implement:

- shop instance id/seed;
- stock persistence;
- shop-specific currency;
- random/hidden/traveling/black-market rules;
- resurrection-item availability.

## M07 — World engine

Implement:

- `WorldProfile`;
- stage-to-World mapping;
- 50 World registry entries;
- transition UI;
- current-World visual/environment contract.

Start with reusable profiles and then fill authored content in batches.

## M08 — World enemy/boss roster mapping

Make enemy families, rank bands, Mini Boss and World Boss come from the World profile.

Reuse the existing enemy/boss systems.

## M09 — Enemy Rank + word difficulty + typing layers

Implement:

- Rank I-X;
- `WordDifficultyScore`;
- 1/2/3 layer selection;
- layer identity;
- new word after each completed layer;
- visual three-segment feedback.

## M10 — Enemy skill/effect framework + Threat Budget

Implement:

- attack/defense/control/support skill contracts;
- World-specific skill pools;
- CC anti-chain;
- runtime resolved skill set;
- Threat Budget audit.

## M11 — Difficulty + Active Typing Pressure scheduler

Implement six primary modes:

- Relax;
- Balanced;
- Hard;
- Extreme;
- Nightmare;
- Impossible;

plus Adaptive/Custom.

Replace count-only spawn assumptions with projected typing-pressure budget.

## M12 — Formation system

Implement authored formation packages with aggregate budget validation.

## M13 — Branching Route Map + Station

Implement deterministic route graph, choices, station nodes and persisted route/shop state.

## M14 — Hidden Challenge / Hidden World

Implement optional challenge discovery, selectable risk tier and premium rewards.

## M15 — Stage Objectives + boss typing mechanics

Implement objective events and World-specific boss typing interactions.

## M16 — Skill/attribute/equipment upgrade expansion

Implement:

- skill Lv1-Lv5;
- permanent attribute upgrades;
- richer equipment services;
- dismantling;
- optional grade evolution;
- later affix system.

## M17 — Run Relics

Implement compiled relic effects and route/reward integration.

## M18 — Reward layer expansion + Codex

Implement:

- sector reward;
- boss reward choice;
- performance rewards;
- expanded Codex;
- knowledge persistence outside rollback.

## M19 — Ascension

Implement endgame replay layer using existing 50 Worlds and new modifier/boss mutation tables.

## M20 — Full balance/performance audit

Run:

- deterministic simulations;
- 1000-stage mapping audit;
- WPM/difficulty pressure audit;
- economy/drop simulations;
- stress tests;
- manual browser/audio/visual playtests.

## M21 — Review Pass #1

Complete independent full review and fix all findings.

## M22 — Review Pass #2

Repeat from a fresh perspective and fix all findings.

## M23 — Parent integration pin

Only after child `main` is clean:

- update `sinhvienaiti/typing-game` submodule pin;
- run Platform CI;
- verify existing games remain unaffected.

---

# 35. Definition of done for this expansion

The expansion is not complete until:

1. the 1000 stages map deterministically to 50 Worlds;
2. each World has distinct gameplay identity, roster and bosses;
3. checkpoints occur every 10 stages;
4. gameplay death and technical crash are correctly distinguished;
5. all three resurrection/protection items behave exactly as designed;
6. random shops have finite persistent stock without inventory accumulation limits;
7. the five-grade system is migrated safely;
8. multi-currency economy has distinct purposes;
9. enemy Rank I-X is clear and testable;
10. multi-word layers work and remain readable;
11. enemy skills pressure typing without fake keyboard lag;
12. Threat Budget prevents all-axis overpowered normal enemies;
13. Active Typing Pressure prevents impossible spawn piles;
14. all six primary WPM modes are balanced within explicit pressure caps;
15. Mini Boss/World Boss/Galaxy Boss reflect their Worlds;
16. Route/Hidden Challenge/Station systems persist deterministically;
17. upgrade/relic/objective systems obey checkpoint rollback semantics;
18. performance remains within existing project budgets;
19. PlayerSave migration/backup/import remain safe;
20. child Test + Build CI pass;
21. manual gameplay/readability/audio checks are recorded;
22. Review Pass #1 is clean;
23. Review Pass #2 is clean;
24. parent integration CI passes after the child pin is updated.

---

# 36. Implementation principles for future sessions

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
