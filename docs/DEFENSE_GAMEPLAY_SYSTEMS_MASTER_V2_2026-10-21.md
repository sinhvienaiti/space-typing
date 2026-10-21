# DEFENSE GAMEPLAY SYSTEMS MASTER V2
## Toàn bộ cơ chế, flow, game content structure, progression, typing, learning, combat, story, map, UX và architecture

**Project:** Typing Game — Defense  
**Document role:** Master design cho toàn bộ cơ chế và hệ thống vận hành của game  
**Version:** V2 — Rewrite  
**Status:** Claude Review Draft  
**Date:** 2026-10-21  
**Ngôn ngữ:** Vietnamese  

---

# 0. MỤC ĐÍCH

File này mô tả **game hoạt động như thế nào**.

File companion chứa catalog content cụ thể:

`DEFENSE_GAME_CONTENT_CATALOG_MASTER_V2_2026-10-21.md`

File này tập trung:

- Core game loop
- Combat
- Hero Routing
- Building Assist
- Typing
- Direct Enemy Typing
- Enemy/Boss HP
- Economy
- Resource
- Wave
- Map
- Terrain
- Upgrade
- Progression
- Learning
- Story
- Shop flow
- Reward
- Difficulty
- UI/UX
- Camera
- Art direction rules
- Audio/VFX presentation
- Save
- Analytics
- Data architecture
- Prototype
- Vertical Slice
- MVP
- Roadmap

---

# 1. GAME IDENTITY

Không thiết kế game như:

> “Space Typing đặt vào map Tower Defense.”

Không thiết kế game như:

> “Kingdom Rush nhưng tất cả quái có chữ trên đầu.”

Identity đúng:

> **Tower Defense + Active Hero Routing + Autonomous Buildings + Typing Amplification + Selective Direct Typing Combat + Learning + Character-driven Multi-world Game**

---

# 2. CORE PILLARS

## Pillar 1 — Strategic Defense
Player xây và nâng cấp hệ thống phòng thủ.

## Pillar 2 — Hero Routing
Hero chạy giữa các Building và combat zone.

## Pillar 3 — Building Assist Typing
Typing tăng sức mạnh Building.

## Pillar 4 — HP Combat
Enemy/Boss có HP và bị damage bình thường.

## Pillar 5 — Selective Direct Typing
Chỉ một số target dùng typing trực tiếp.

## Pillar 6 — Learning
Learning tích hợp tự nhiên.

## Pillar 7 — Character & World
Hero, civilization, story, map, culture đều quan trọng.

---

# 3. CORE COMBAT MODEL

Core combat:

```text
Hero
+ Towers
+ Soldiers
+ Summons
+ Traps
+ Skills
+ DOT
        ↓
Enemy HP
        ↓
0 HP
        ↓
Death
```

Boss:

```text
Boss HP
+ Phase
+ Shield/Armor optional
+ Skills
+ Map Interaction
```

Typing không thay thế hệ HP.

---

# 4. THREE-LAYER TYPING COMBAT MODEL

Đây là rule quan trọng nhất.

---

## Layer 1 — Autonomous Combat

Phần lớn combat.

Buildings tự hoạt động.

Hero tự đánh hoặc dùng skill.

Soldiers tự đánh.

Enemy mất HP như Tower Defense/RPG bình thường.

Không cần typing trên đầu enemy.

---

## Layer 2 — Hero Assist Typing

Hero tới Building.

Player typing.

Typing tác động Building.

Ví dụ Archer:

- Speed -> fire rate
- Accuracy -> damage/crit
- Combo -> multishot
- Perfect -> Overdrive

Ví dụ Mine:

- Speed -> production cycle
- Accuracy -> Gold yield
- Combo -> Gold burst

Đây là typing mechanic chính.

---

## Layer 3 — Direct Typing Interaction

Chỉ một số target đặc biệt.

Ví dụ:

### Fast Runner
word xuất hiện trong thời gian ngắn.

Success:
- freeze/slow/stun

### Healer
word chỉ hiện khi cast.

Success:
- interrupt

### Shield enemy
word xuất hiện khi shield activated.

Success:
- break shield

### Teleporter
word xuất hiện lúc channel.

Success:
- cancel teleport

### Boss
phrase trong phase shield.

Success:
- break mechanic

Layer 3 giữ DNA của Space Typing nhưng không biến toàn game thành Space Typing.

---

# 5. TỶ LỆ TYPING ĐỀ XUẤT

Target experience:

- 60–75% battle time: strategy + normal combat observation
- 20–35%: Building Assist typing
- 5–15%: Direct Enemy/Boss typing

Đây là starting hypothesis.

Không lock cứng.

Claude cần review.

---

# 6. HERO ROUTING SYSTEM

Hero là mobile strategic resource.

Player có thể:

- click/tap Building
- Hero chạy tới
- assist
- rời Building
- intercept enemy
- dùng skill
- đổi lane

Travel time tạo opportunity cost.

Không free teleport mặc định.

---

# 7. HERO MOVEMENT TYPES

## Ground
- Warrior
- Engineer

## Fast Ground
- Ranger
- Assassin

## Flight
- Dragon
- aerial hero

## Blink
- Mage

## Transport-assisted
- Engineer/World mechanic

---

# 8. ROUTING DECISION EXAMPLE

Situation:

- Mine đang tạo Gold
- Cannon đang chống Swarm
- Barracks sắp bị Siege
- Boss phase sắp kích hoạt Shrine

Player phải quyết định:

1. ở Mine farm Gold?
2. chạy Cannon buff AoE?
3. cứu Barracks?
4. đi Shrine sớm?

Đó là gameplay.

---

# 9. BUILDING AUTONOMY RULE

Building phải tự chạy nếu Hero không ở đó.

Hero không phải “công tắc bật Building”.

Hero là amplifier.

Nếu không:
- game trở thành chore
- player phải typing liên tục
- economy/combat chết khi Hero rời đi

---

# 10. HERO ASSIST STATE

Flow:

1. Player selects Building.
2. Hero travels.
3. Enters Assist Radius.
4. Assist prompt becomes active.
5. Typing UI appears.
6. Performance is measured.
7. Building receives live modifiers.
8. Overdrive may trigger.
9. Hero can disengage.

---

# 11. TYPING PERFORMANCE MODEL

Inputs:

- Accuracy
- Speed
- Combo
- Consistency
- Difficulty

Proposed initial weights:

- Accuracy 45%
- Speed 25%
- Combo 15%
- Consistency 10%
- Difficulty 5%

Needs playtest.

---

# 12. PERSONAL BASELINE

Raw WPM không nên quyết định sức mạnh tuyệt đối.

Player baseline:

- average WPM
- recent WPM
- average accuracy
- consistency
- weak keys/words

Speed score có thể dựa trên:

`currentWPM / expectedWPM`

Clamp upper bonus.

---

# 13. ACCURACY-FIRST RULE

Accuracy phải quan trọng hơn raw speed.

Game muốn dạy:

> đúng trước, nhanh sau.

Không muốn dạy:

> spam nhanh bất chấp lỗi.

---

# 14. TYPING EFFECT SEMANTICS

## Accuracy
- damage quality
- crit
- heal power
- resource yield
- shield strength

## Speed
- fire rate
- reload
- production rate
- spawn speed

## Combo
- multishot
- chain
- AoE
- burst
- bonus item

## Consistency
- buff duration
- stable output
- shield uptime

## Difficulty
- small bonus

---

# 15. ERROR HANDLING

Một lỗi không nên làm player mất sạch.

Recommended:

- typo reduces bonus
- repeated typo lowers combo tier
- correction allowed
- recovery possible

Avoid:
- catastrophic reset
- fake typing punishment
- enemy scrambling input

---

# 16. DIRECT TYPING TARGET SYSTEM

Direct Typing Target is an explicit component.

Not all Enemy have it.

Conceptual schema:

```yaml
directTyping:
  enabled: true
  trigger: cast_start
  promptType: word
  timeLimit: 3
  success:
    interrupt: true
  failure:
    noExtraPenalty: true
```

---

# 17. DIRECT TYPING TRIGGERS

Possible:

- enemy enters distance threshold
- enemy starts cast
- shield activated
- teleport channel
- escape state
- enrage
- boss phase
- special event

---

# 18. DIRECT TYPING SUCCESS EFFECTS

- Damage
- Execute
- Stun
- Slow
- Freeze
- Root
- Interrupt
- Break Shield
- Dispel
- Reveal
- Silence
- Pushback
- Disable Skill

---

# 19. DIRECT TYPING FAILURE RULE

Failure should normally mean:

- mechanic continues

not:

- instant defeat

unless boss clearly teaches the rule.

---

# 20. OVERDRIVE SYSTEM

Excellent performance can trigger temporary Building Overdrive.

Examples:

## Archer
rapid volley

## Cannon
large AoE barrage

## Mine
Gold burst

## Hospital
area heal

## Workshop
instant production

---

# 21. OVERDRIVE CHARGE

Possible formula:

- Accuracy gives large contribution
- Combo gives multiplicative bonus
- Speed gives moderate contribution

Need anti-abuse:
- cooldown
- diminishing returns
- per-Building charge

---

# 22. BUILDING UPGRADE SYSTEM

Structure:

```text
Level 1
 ↓
Level 2
 ↓
Level 3
 ↙   ↘
A     B
```

Branches alter:

- role
- typing profile
- target priority
- VFX
- model

---

# 23. IN-BATTLE ECONOMY

Primary currency:
Gold.

Possible later:
Material
Knowledge

Player chooses:

- build
- upgrade
- economy
- defense
- emergency purchase

---

# 24. ECONOMY TRADEOFF

Good economy system forces:

> greed vs survival.

Example:

Gold Mine now:
- stronger future economy

Cannon now:
- safer current wave

---

# 25. GOLD GENERATION

Sources:

- passive income
- Mine
- enemy reward
- objective
- typing bonus

Need anti-snowball.

---

# 26. RESOURCE COMPLEXITY RULE

Prototype:
Gold only.

Vertical Slice:
maybe Gold + Knowledge.

Material only if needed.

Do not start with:
Gold + Wood + Stone + Iron + Food + Mana + Crystal + Oil.

---

# 27. FARM / AGRICULTURE MECHANIC

Farm can:

- generate generic Material/Food
- support Barracks
- create economy target

Hero typing:
- consistency
- harvest burst

But farming should not turn into city-builder micromanagement.

---

# 28. MILITARY PRODUCTION

Barracks:

- spawn unit
- rally
- respawn

Hero assist:
- improve soldiers

No need manually command every soldier.

---

# 29. UNIT AI

Requirements:

- target acquisition
- rally point
- leash
- respawn
- pathfinding
- avoid traffic jam
- prioritize nearby enemy

---

# 30. ENEMY AI

Possible target modes:

- Core
- nearest Building
- Economy
- Hero
- Support
- Resource
- civilian objective

Enemy archetype defines behavior.

---

# 31. WAVE SYSTEM

Wave data contains:

- spawn groups
- lane
- timing
- threat score
- special enemy
- elite
- boss

---

# 32. WAVE PREVIEW

UI may show:

- enemy icons
- lane
- flyer warning
- siege warning
- boss warning

Higher difficulty can hide details.

---

# 33. WAVE PACING

Rhythm:

1. Preparation
2. Early pressure
3. Mid pressure
4. Recovery
5. Elite spike
6. Recovery
7. Boss/climax

Typing requires mental rest.

Do not maximize intensity nonstop.

---

# 34. BETWEEN-WAVE PHASE

Player can:

- build
- upgrade
- move Hero
- shop
- research
- choose temporary perk

Keep duration short.

---

# 35. BOSS COMBAT SYSTEM

Boss still uses normal HP combat.

Phase triggers may depend on:

- HP threshold
- timer
- event
- object destroyed

---

# 36. BOSS PHASE TEMPLATE

## Intro
camera + music

## Phase 1
teach mechanic

## Phase 2
combine mechanic + adds

## Phase 3
terrain/map change

## Phase 4
typing interaction or special objective

## Final
high-intensity damage window

## Defeat
short cinematic

---

# 37. BOSS TYPING RULE

Typing is not constant.

Use typing for:

- interrupt
- shield break
- seal
- dispel
- vulnerability
- special finisher

Boss remains attackable through normal combat where intended.

---

# 38. BOSS UI

Always prioritize:

- Boss name
- HP
- phase
- status
- shield/armor if any

Typing prompt is secondary and temporary.

---

# 39. MAP DESIGN LAYERS

Each Map can include:

1. Enemy paths
2. Build spots
3. Economy spots
4. Hero paths
5. Shortcuts
6. Terrain
7. Interactive objects
8. Objectives
9. Boss zone
10. Safe/readable typing area in UI

---

# 40. FIXED BUILD SPOT VS FREE PLACEMENT

Recommended initial:
fixed or semi-fixed Build Spots.

Reason:
- readability
- balance
- cleaner pathing
- easier camera
- easier mobile/web UX

Free placement can be researched later.

---

# 41. HERO SHORTCUTS

Examples:

- bridge
- tunnel
- portal
- mount station
- zipline
- flying route

Shortcuts create map identity.

---

# 42. TERRAIN RULE

Terrain must affect gameplay.

But each map should emphasize only 1–2 strong rules.

Avoid stacking:
snow + fog + poison + lightning + darkness at once.

---

# 43. FOREST MECHANICS

Possible:
- hidden shortcut
- ranger bonus
- fire spread

---

# 44. SNOW MECHANICS

Possible:
- movement slow
- ice zone
- heat Building

---

# 45. DESERT MECHANICS

Possible:
- sandstorm
- range reduction
- oasis boost

---

# 46. VOLCANO MECHANICS

Possible:
- lava
- eruption
- fire resistance

---

# 47. WORLD SYSTEM

World = content pack + rules.

World defines:

- civilization
- races
- heroes
- buildings
- enemies
- boss
- maps
- terrain
- music
- story
- visual identity

---

# 48. WORLD SHOULD NOT REQUIRE REWRITING CORE

Core engine remains:

- combat
- building
- hero
- typing
- resource
- wave

World injects:
- data
- assets
- special rules

---

# 49. STORY STRUCTURE

Three layers:

## World Arc
main conflict

## Hero Arc
personal development

## Faction Arc
relationships/politics/conflict

---

# 50. HERO STORY PACKAGE

Each Hero:

- origin
- motive
- fear
- goal
- flaw
- relationships
- turning point
- resolution

---

# 51. BOSS STORY ROLE

Boss needs reason to exist.

Not:
“big enemy appears because stage 10”.

Boss should connect to:
- faction
- history
- world conflict
- Hero arc

---

# 52. DIALOGUE SYSTEM

Types:

- pre-battle
- post-battle
- Hero-to-Hero
- Boss intro
- Building interaction
- Shop/NPC
- story scene

Combat dialogue short only.

---

# 53. CHARACTER PRESENTATION

Two quality levels:

## Gameplay model
- optimized
- stylized
- readable

## Presentation asset
- portrait
- high detail model/art
- story/CGI

---

# 54. ART DIRECTION PRINCIPLE

Target:
- stylized 3D
- strong silhouettes
- readable colors
- diverse civilizations
- original designs

Avoid:
- tiny realism detail unreadable at game camera
- exact imitation of reference games

---

# 55. CAMERA

Recommended:
- elevated 3D/isometric
- controllable zoom within bounds

Camera zoom events:
- Ultimate
- Boss intro
- story event

Must return quickly.

---

# 56. TYPING UI POSITION

Typing UI must never be obscured by:

- VFX
- Boss
- camera shake
- particles

Direct Enemy Typing word may appear near target, but should also be mirrored in readable UI if needed.

---

# 57. ENEMY HP UI

Normal Enemy:
small HP bar.

Elite:
HP + ability marker.

Mini Boss:
larger/local UI.

Boss:
top-screen boss bar.

---

# 58. BUILDING UI

On select:

- name
- level
- role
- upgrade cost
- branch
- Hero Assist status
- Overdrive
- damage/range/etc

Avoid text walls.

---

# 59. HERO UI

Must show:

- HP
- location
- selected target/Building
- skills
- cooldown
- Assist state
- Ultimate charge

---

# 60. SHOP FLOW

Battle Shop:
- fast
- tactical
- minimal

Meta Shop:
- browse outside battle

Cosmetic Shop:
- preview-heavy

---

# 61. SHOP DESIGN RULE

Separate:
- content unlock
- economy
- monetization

Do not decide pay-to-win mechanics at system design stage.

---

# 62. HERO PROGRESSION

Possible:

- skill unlock
- skill modifier
- passive choice
- affinity upgrade
- cosmetic

Prefer horizontal choices.

---

# 63. BUILDING META PROGRESSION

Unlock:
- Blueprint
- branch
- variant
- cosmetic

Avoid permanent massive damage stacking.

---

# 64. CIVILIZATION RESEARCH

Possible:
- new Building
- new branch
- utility
- economy option

Should not trivialize early game.

---

# 65. ACCOUNT PROGRESSION

Unlock:
- World
- Hero
- Mode
- Cosmetic
- Challenge

---

# 66. EQUIPMENT SYSTEM RULE

Do not add until Hero loop proven.

If added:
few meaningful items.

No endless trash loot.

---

# 67. REWARD SYSTEM

Rewards can be:

- Hero XP
- Blueprint
- Gold/Credit
- Cosmetic
- Lore
- Learning mastery
- medal

---

# 68. MAP OBJECTIVES

Types:

- Defend
- Protect
- Escort
- Hold
- Capture
- Survive
- Hunt
- Resource goal
- Boss

---

# 69. OPTIONAL OBJECTIVES

Examples:

- no Building destroyed
- kill Boss before timer
- protect Mine
- maintain 95% typing accuracy
- use limited number of towers

Learning objective should be optional, not blocking normal completion.

---

# 70. DIFFICULTY MODES

Possible:

- Story
- Normal
- Veteran
- Challenge
- Endless

---

# 71. DIFFICULTY SCALING

Prefer:

- composition
- timings
- lane pressure
- enemy ability
- economy pressure
- boss behavior

Not only:
HP x 3.

---

# 72. LEARNING SYSTEM PHILOSOPHY

Learning is integrated but not intrusive.

Combat:
- word
- short phrase
- listening snippets

Deeper learning:
- Library
- training
- between wave
- post-map
- quest

---

# 73. LEARNING CONTENT TYPES

- Vocabulary
- Spelling
- Listening
- Grammar
- Sentence Pattern
- Reading
- Review
- Mastery

---

# 74. VOCABULARY IN COMBAT

Good for:
- Archer
- Mine
- Runner prompt

Short, fast, readable.

---

# 75. PHRASE IN COMBAT

Good for:
- Mage
- Shrine
- Boss phase

Use sparingly.

---

# 76. SENTENCE IN COMBAT

Use only:
- special challenge
- boss
- low-pressure phase

Not constant.

---

# 77. LISTENING

Possible:
- Shrine
- training
- optional challenge

Need:
- replay
- volume
- transcript support

---

# 78. GRAMMAR

Better outside fast combat.

Use:
- Library
- Academy
- quest

---

# 79. CEFR / SKILL ADAPTATION

Player language level should affect:
- prompt difficulty
- vocabulary pool
- sentence length

But combat difficulty should remain separate.

---

# 80. PERSONALIZATION

Track only useful data:

- WPM
- accuracy
- weak letters
- weak words
- mastery

Use for:
- normalized score
- learning review

---

# 81. POST-MAP REVIEW

Show:

- map result
- Hero XP
- rewards
- typing accuracy
- WPM relative to baseline
- learned/reviewed words
- mistakes
- optional retry

Keep concise.

---

# 82. AUDIO SYSTEM

Layers:

- world music
- combat music
- boss music
- Hero
- Building
- Enemy
- UI
- typing feedback
- ambience

---

# 83. AUDIO PRIORITY

Critical cues must cut through:

- Boss telegraph
- Direct Typing window
- Building destroyed
- Core low HP
- Ultimate ready

---

# 84. VOICE SYSTEM

Use cooldown.

Do not spam movement lines.

Priority:
1. Boss/critical
2. Ultimate
3. Skill
4. Assist
5. flavor

---

# 85. VFX SYSTEM

VFX communicates:

- source
- target
- area
- element
- danger
- buff/debuff

Spectacle after clarity.

---

# 86. DIRECT TYPING VFX

When enemy enters Direct Typing state:

- clear icon
- short glow/outline
- prompt
- countdown if needed
- success burst
- failure/timeout feedback

---

# 87. ACCESSIBILITY

Options:

- font size
- typing text size
- reduced screen shake
- reduced flashes
- VFX density
- colorblind modes
- audio category sliders
- high-contrast HP bars
- simplified Direct Typing prompt
- pause rules

---

# 88. PERFORMANCE

Potential heavy systems:

- many enemies
- soldiers
- projectiles
- VFX
- animated buildings
- large Boss

Need:
- pooling
- instancing
- LOD
- animation culling
- VFX quality
- texture budget
- shadow limits

---

# 89. DATA-DRIVEN ARCHITECTURE

Definitions:

- HeroDefinition
- BuildingDefinition
- EnemyDefinition
- BossDefinition
- UnitDefinition
- WorldDefinition
- MapDefinition
- WaveDefinition
- SkillDefinition
- TypingAssistProfile
- DirectTypingInteraction
- ShopDefinition
- RewardDefinition
- LearningProfile

---

# 90. DO NOT MERGE THESE TWO SYSTEMS

Keep separate:

## TypingAssistProfile
Used for:
Building/Hero support.

## DirectTypingInteraction
Used for:
Enemy/Boss special prompt.

This avoids future confusion.

---

# 91. EVENT SYSTEM

Possible events:

- WaveStarted
- WaveCompleted
- EnemySpawned
- EnemyKilled
- HeroMoved
- HeroArrived
- AssistStarted
- AssistStopped
- TypingScoreChanged
- OverdriveStarted
- DirectTypingStarted
- DirectTypingSucceeded
- DirectTypingFailed
- BossPhaseChanged
- BuildingDamaged
- BuildingDestroyed

---

# 92. SAVE SYSTEM

Layers:

## Account
- unlocks
- settings
- learning profile

## World
- story
- map progress

## Hero
- skill
- progression

## Run
optional resume

Version saves.

---

# 93. ANALYTICS

Useful:

- map win rate
- Hero pick rate
- Building pick
- branch pick
- assist time
- Gold spend
- Direct Typing success
- typing accuracy
- boss fail phase
- cause of loss

---

# 94. ANTI-EXPLOIT

Potential:

- idle farming Mine
- macro typing
- extremely high WPM scaling
- stacking economy bonuses
- infinite crowd control
- Hero teleport abuse
- Direct Typing execute abuse

Need caps and diminishing returns.

---

# 95. CORE LOOP

```text
World Map
↓
Story / Mission Select
↓
Hero / Loadout
↓
Map
↓
Build Phase
↓
Wave
↓
Hero Routing
↓
Assist / Combat / Direct Typing Event
↓
Upgrade / Economy
↓
Boss
↓
Rewards
↓
Learning Review
↓
Story / Unlock
```

---

# 96. 5-MINUTE GAMEPLAY EXAMPLE

1. Build Archer, Mine, Barracks.
2. Wave starts.
3. Buildings auto-attack.
4. Hero moves Mine.
5. Player types vocabulary.
6. Gold output increases.
7. Runner wave appears.
8. Hero moves Archer.
9. Archer gets speed/crit buff.
10. Elite Runner enters direct typing state: `freeze`.
11. Player types it.
12. Runner freezes.
13. Cannon kills swarm.
14. Siege enemy attacks Barracks.
15. Hero intercepts.
16. Player upgrades Archer to Deadeye.
17. Boss appears.
18. Boss HP bar top screen.
19. Normal combat lowers HP.
20. At 60%, Boss shield phase begins.
21. Shrine interaction triggers phrase.
22. Player types phrase.
23. Shield breaks.
24. Boss stunned.
25. Hero Ultimate.
26. Boss defeated.
27. Reward + learning review.

---

# 97. PROTOTYPE GOAL

Prove only:

- Hero Routing is fun.
- Building Assist is meaningful.
- HP combat is readable.
- Direct Typing special targets are exciting.
- typing does not overwhelm strategy.

---

# 98. PROTOTYPE SCOPE

## Hero
1 Engineer

## Buildings
- Archer
- Cannon
- Barracks
- Mine
- Workshop
- Shrine

## Enemy
8 types

## Direct Typing
- Runner
- Healer interrupt

## Boss
1 multi-phase

## Map
1 Forked Lane

## Resource
Gold only

---

# 99. PROTOTYPE SUCCESS CRITERIA

Pass if:

1. Player understands where Hero should go.
2. Assist clearly changes Building power.
3. Player still watches battlefield.
4. Direct Typing target feels special.
5. Enemy/Boss HP remains readable.
6. Player does not feel forced to type nonstop.
7. Accuracy-first feels fair.
8. UI remains readable.
9. Boss phase is understandable.
10. Economy decision matters.

---

# 100. VERTICAL SLICE

Add:

- 3 Heroes
- 8–9 Buildings
- 10–12 Enemy
- polished Boss
- 3 Maps
- 1 World
- final-ish art
- VFX
- SFX
- Hero voice subset
- Learning Word/Phrase/Listening

---

# 101. MVP

Suggested:

- 3–4 Heroes
- 8–10 Buildings
- 12–16 Enemies
- 2–3 Bosses
- 3–5 Maps
- 1 World
- basic progression
- basic Meta Shop
- cosmetics
- Story arc
- learning review

---

# 102. POST-MVP

Potential:

- more Worlds
- Equipment
- dynamic routes
- large Dragon Hero
- advanced Boss
- events
- endless mode
- more Direct Typing enemy mechanics
- additional learning modes

---

# 103. WHAT NOT TO DO

Do not:

- put words over every Enemy
- make typing the only damage source
- make Hero stationary
- make Building useless without Hero
- add 10 currencies
- add 50 Heroes before prototype
- create Boss as HP sponge
- make direct typing prompt cover HP
- sabotage keyboard input
- use giant VFX over typing UI
- reward speed over accuracy
- hard-code every World separately

---

# 104. CLAUDE REVIEW QUESTIONS

Claude must answer:

## Core
1. Is three-layer typing model correct?
2. Is Hero Routing strong enough as USP?
3. What percentage of Direct Typing is ideal?

## Combat
4. Should Hero auto-attack?
5. How much micro is too much?
6. Should Buildings ever be destroyed permanently?

## Typing
7. Are weights appropriate?
8. How to normalize WPM fairly?
9. Which Direct Typing effects are best?

## Economy
10. Gold-only prototype?
11. When to add Material?
12. Is Farm useful or over-complex?

## Map
13. Fixed Build Spot?
14. Hero shortcut frequency?
15. Dynamic routes later?

## Boss
16. How often should typing phase occur?
17. Boss fight target duration?
18. How to avoid UI overload?

## Learning
19. Which learning mode belongs in combat?
20. Which belongs outside combat?

## Progression
21. Should Equipment be removed from MVP?
22. How much persistent power is safe?

## Tech
23. Data architecture?
24. Event architecture?
25. 2.5D vs full 3D?

---

# 105. REQUIRED CLAUDE OUTPUT

Claude must produce:

1. Overall score /10
2. Core-loop critique
3. Three-layer typing critique
4. Hero Routing critique
5. Combat critique
6. Economy critique
7. Wave critique
8. Boss critique
9. Learning critique
10. UX critique
11. Architecture critique
12. Scope critique
13. Prototype revision
14. MVP revision
15. Risk list
16. Missing systems
17. Removed systems
18. V2.1 revised structure

Do not start implementation before review.

---

# 106. FINAL DESIGN POSITION

The intended game is:

> A Tower Defense game where enemies and bosses use normal HP-based combat, buildings and heroes deal damage automatically, and the player actively moves a hero around the battlefield to amplify buildings through typing.

Typing has two major roles:

1. **Building Assist Typing** — frequent and strategic.
2. **Direct Enemy/Boss Typing** — selective and special.

The game must never be reduced to:

> “Every monster has a word above its head.”

The strongest long-term identity is:

> **Hero Routing + Autonomous Buildings + Typing Amplification + Selective Direct Typing + Multi-world Character-driven Defense.**

That is the foundation that every future Hero, Building, Enemy, Boss, Shop, World, Story and Learning feature must support.
