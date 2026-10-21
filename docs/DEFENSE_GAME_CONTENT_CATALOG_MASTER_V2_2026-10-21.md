# DEFENSE GAME CONTENT CATALOG MASTER V2
## Toàn bộ đối tượng/content của game — Hero, Building, Unit, Enemy, Boss, Resource, Shop, Item, World Asset

**Project:** Typing Game — Defense  
**Document role:** Master catalog cho toàn bộ “thứ tồn tại trong game”  
**Version:** V2 — Rewrite  
**Status:** Claude Review Draft  
**Date:** 2026-10-21  
**Ngôn ngữ:** Vietnamese  

---

# 0. MỤC ĐÍCH

File này tập trung vào **tất cả các đối tượng/content cụ thể có trong game**.

Không dùng file này để mô tả sâu toàn bộ flow hay architecture gameplay.  
Các cơ chế tổng thể được tách sang file:

`DEFENSE_GAMEPLAY_SYSTEMS_MASTER_V2_2026-10-21.md`

File này trả lời:

- Game có những loại Hero nào?
- Game có những loại nhà nào?
- Có ruộng, mỏ, chợ, nhà lính, nhà nghiên cứu, nhà chữa trị không?
- Có những loại quân lính nào?
- Có những loại quái nào?
- Boss có những loại nào?
- Có Gold, Material, Knowledge, tài nguyên gì?
- Shop bán gì?
- Equipment, consumable, blueprint, cosmetic gồm gì?
- Mỗi loại content cần model/ảnh/animation/VFX/SFX/voice/lore gì?
- Mỗi loại content phải khác nhau thế nào?
- Loại nào nên vào Prototype, Vertical Slice, MVP, Post-MVP?

---

# 1. DESIGN RULE CHUNG CHO MỌI CONTENT

Mỗi content mới phải tạo ra ít nhất một khác biệt thực sự về gameplay.

Không chấp nhận content chỉ khác:

- +10% HP,
- +20% damage,
- đổi màu,
- đổi tên.

Mỗi content phải trả lời:

1. Nó làm gì?
2. Người chơi dùng nó khi nào?
3. Điểm mạnh?
4. Điểm yếu?
5. Counter?
6. Synergy?
7. Có liên quan typing không?
8. Có liên quan Hero Routing không?
9. Art/animation/VFX/SFX riêng là gì?
10. Có lore/world identity không?

---

# 2. COMBAT ENTITY RULE — CỰC KỲ QUAN TRỌNG

## 2.1 Enemy và Boss đều có HP bar

Core combat của game là combat theo HP.

Quái và Boss bị gây damage bởi:

- Hero,
- Tower,
- Soldiers,
- Summons,
- Traps,
- Skills,
- Status Effects,
- Projectiles,
- AoE,
- DOT.

Enemy chết khi HP = 0.

Boss cũng có HP và nhiều phase.

---

## 2.2 Không phải quái nào cũng có chữ trên đầu

Mặc định:

```text
Enemy
HP Bar
```

không có word target.

Cơ chế typing trực tiếp lên đầu quái chỉ dùng cho:

- một số enemy đặc biệt,
- một số elite,
- một số trạng thái skill,
- một số boss mechanic,
- emergency interaction.

Ví dụ:

```text
Fast Runner
[ freeze ]
HP █████
```

Gõ đúng có thể:

- freeze,
- stun,
- slow,
- interrupt,
- break shield,
- execute,
- reveal,
- silence,
- pushback,
- disable skill.

Đây là **special mechanic**, không phải default combat.

---

# 3. HERO MASTER TAXONOMY

Đề xuất 12 nhóm Hero chính.

---

# 4. HERO H01 — WARRIOR

## Role
- frontline,
- balanced melee,
- defend Building,
- hold lane.

## Strength
- HP khá,
- direct combat tốt,
- dễ dùng.

## Weakness
- mobility vừa/chậm,
- ít AoE,
- phụ thuộc vị trí.

## Affinity
- Barracks,
- Guard Post,
- Forge.

## Typing profile
- Accuracy,
- Combo.

## Signature Assist
Barracks:
- Accuracy -> Soldier damage
- Combo -> Morale
- Perfect -> Rally

## Required assets
- gameplay model
- portrait
- icon
- run
- attack A/B
- block
- skill
- ultimate
- building assist
- voice
- VFX
- SFX

---

# 5. HERO H02 — TANK / GUARDIAN

## Role
- absorb damage,
- taunt,
- shield Building,
- protect frontline.

## Affinity
- Barracks
- Hospital
- Shield Generator

## Typing
- Accuracy -> shield strength
- Consistency -> shield duration
- Combo -> barrier pulse

## Weakness
- low DPS
- slow travel

---

# 6. HERO H03 — RANGER

## Role
- ranged DPS
- runner control
- anti-air
- fast reposition

## Affinity
- Archer Tower
- Watchtower
- Scout Post

## Typing
- Speed -> attack rate
- Accuracy -> crit
- Combo -> multishot

---

# 7. HERO H04 — MAGE

## Role
- AoE
- magic
- crowd control
- elemental interaction

## Affinity
- Mage Tower
- Shrine
- Library
- Mana Well

## Typing
- Accuracy -> spell power
- Combo -> chain
- Phrase complexity -> bonus mana efficiency

---

# 8. HERO H05 — ENGINEER

## Role
- Building support specialist
- repair
- overclock
- drones
- production

## Affinity
- Workshop
- Cannon
- Mine
- Reactor

## Typing
- Accuracy
- Consistency
- moderate Speed

## Signature
Overclock Building.

Recommended Prototype Hero.

---

# 9. HERO H06 — SUPPORT / PRIEST

## Role
- heal
- shield
- cleanse
- buff

## Affinity
- Hospital
- Temple
- Shrine

## Typing
- Accuracy -> heal strength
- Consistency -> aura uptime
- Perfect -> emergency heal

---

# 10. HERO H07 — ASSASSIN

## Role
- eliminate priority target
- anti-Healer
- anti-Commander
- anti-Elite

## Typing
- high Accuracy
- short precision windows

## Weakness
- swarm
- tank
- sustain

---

# 11. HERO H08 — SUMMONER

## Role
- temporary units
- distributed pressure
- map control

## Typing
- Combo -> summon quality
- Consistency -> duration

---

# 12. HERO H09 — ECONOMY SPECIALIST

## Role
- boost Gold
- improve production
- cost efficiency

## Affinity
- Mine
- Market
- Farm
- Workshop

## Tradeoff
- lower combat power

---

# 13. HERO H10 — DRAGON / LARGE CREATURE

## Role
- flying
- AoE
- breath attack
- spectacle

## Affinity
- Forge
- Fire Tower
- Dragon Nest
- Shrine

## Special production needs
- large rig
- flight
- landing
- camera rules
- LOD

---

# 14. HERO H11 — COMMANDER

## Role
- buff allied units
- improve Barracks
- battlefield command

## Affinity
- Barracks
- Guard Post
- Command Center

---

# 15. HERO H12 — HYBRID

Hybrid chỉ tồn tại khi combination tạo gameplay mới.

Ví dụ:
- Battle Mage
- Tech Ranger

Không dùng Hybrid để Hero có mọi thứ.

---

# 16. HERO PRODUCTION PACKAGE

Mỗi Hero hoàn chỉnh cần:

## Gameplay
- role
- stats
- movement
- attack
- passive
- skill 1
- skill 2
- ultimate
- affinity
- typing profile
- progression

## Narrative
- race
- civilization
- faction
- origin
- personality
- motive
- conflict
- relationships
- arc

## Visual
- concept
- front/back/side
- portrait
- icon
- gameplay model
- optional presentation model

## Animation
- idle
- run/fly
- attack
- skill
- ultimate
- hit
- defeat
- victory
- assist animations

## Audio
- attack
- movement
- hit
- skill
- ultimate
- voice

## VFX
- attack
- skill
- ultimate
- assist
- buff/debuff

---

# 17. BUILDING MASTER TAXONOMY

Building chia thành:

1. Defense
2. Military
3. Economy
4. Resource
5. Production
6. Support
7. Research
8. Special / World-specific

---

# 18. DEFENSE BUILDING D01 — ARCHER TOWER

## Autonomous
- tự bắn
- ranged
- medium damage
- fast attack

## Typing Assist
- Speed -> fire rate
- Accuracy -> crit
- Combo -> multishot
- Perfect -> Volley Overdrive

## Branch A
Wind Ranger:
- rapid fire
- multishot
- chain

## Branch B
Deadeye:
- long range
- high crit
- armor penetration

---

# 19. DEFENSE BUILDING D02 — CANNON TOWER

## Autonomous
- slow
- AoE

## Typing
- Speed -> reload
- Accuracy -> damage
- Combo -> radius

## Branches
- Bombard
- Siege Breaker

---

# 20. DEFENSE BUILDING D03 — MAGE TOWER

## Autonomous
- magic damage

## Typing
- Accuracy -> spell power
- Combo -> chain
- Difficulty -> mana efficiency

## Branches
- Storm
- Arcane

---

# 21. DEFENSE BUILDING D04 — SNIPER TOWER

- long range
- low attack speed
- high single target
- priority Elite

Typing:
- Accuracy -> weak-point damage

---

# 22. DEFENSE BUILDING D05 — FLAME TOWER

- cone
- DOT
- anti-swarm

Typing:
- Speed -> tick
- Accuracy -> damage
- Combo -> burn duration

---

# 23. DEFENSE BUILDING D06 — ICE TOWER

- slow
- control

Typing:
- Accuracy -> slow
- Combo -> freeze chance

---

# 24. DEFENSE BUILDING D07 — LIGHTNING TOWER

- chain
- anti-cluster

Typing:
- Combo -> chain count
- Speed -> cast rate

---

# 25. DEFENSE BUILDING D08 — POISON TOWER

- DOT
- anti-high-HP

Typing:
- Accuracy -> potency
- Combo -> stack

---

# 26. DEFENSE BUILDING D09 — ANTI-AIR

- Flyer priority

Typing:
- Speed -> tracking
- Accuracy -> crit

---

# 27. DEFENSE BUILDING D10 — TRAP TOWER

- lane trap
- reset cycle

Typing:
- Speed -> reset
- Accuracy -> effectiveness

---

# 28. MILITARY BUILDING M01 — BARRACKS

## Autonomous
- spawn soldier
- block enemy

## Typing
- Accuracy -> unit damage
- Speed -> respawn
- Combo -> morale
- Perfect -> rally

## Branch A
Guardian

## Branch B
Berserker

---

# 29. MILITARY BUILDING M02 — STABLE

- cavalry
- fast intercept
- runner counter

Typing:
- Speed -> deploy
- Accuracy -> charge

---

# 30. MILITARY BUILDING M03 — GUARD POST

- protect local structure
- low-cost units

---

# 31. MILITARY BUILDING M04 — BEAST DEN

- wolf
- boar
- beast summon

Typing:
- Combo -> pack bonus

---

# 32. MILITARY BUILDING M05 — SUMMONER HALL

- temporary magical units

Typing:
- phrase -> summon charge

---

# 33. MILITARY BUILDING M06 — DRAGON NEST

Late-game special.

- flying drake
- aerial support

---

# 34. ECONOMY BUILDING E01 — GOLD MINE

## Autonomous
- Gold per cycle

## Typing Assist
- correct input -> production progress
- Accuracy -> yield
- Speed -> cycle
- Combo -> Gold burst

## Branch A
Deep Mine

## Branch B
Mint / Active Economy

Enemy interaction:
- Thief
- Saboteur

---

# 35. ECONOMY BUILDING E02 — MARKET

- discount
- tactical item
- trade

Typing:
- temporary discount meter

---

# 36. ECONOMY BUILDING E03 — TRADE POST

- periodic value
- caravan

Possible side objective:
protect caravan.

---

# 37. ECONOMY BUILDING E04 — TREASURY

- store
- protect Gold
- optional interest mechanic

Priority target for Thief.

---

# 38. ECONOMY BUILDING E05 — TAX OFFICE

Potential later-game.

- passive tax
- population/economy synergy

Not Prototype.

---

# 39. RESOURCE BUILDING R01 — FARM

## Role
- food/material abstraction
- military sustain

Typing:
- consistency -> productivity

---

# 40. RESOURCE BUILDING R02 — LUMBER MILL

- Material producer
- biome-specific

---

# 41. RESOURCE BUILDING R03 — QUARRY

- slow/high-value Material

---

# 42. RESOURCE BUILDING R04 — CRYSTAL MINE

- magic-world Material skin

---

# 43. RESOURCE BUILDING R05 — MANA WELL

- Knowledge/Mana production

Synergy:
- Mage
- Shrine
- Research

---

# 44. PRODUCTION BUILDING P01 — FORGE

Produces:
- battle buff
- weapon enhancement
- temporary item

Typing:
- Speed -> craft speed
- Accuracy -> quality
- Combo -> bonus
- Perfect -> Masterwork

---

# 45. PRODUCTION BUILDING P02 — WORKSHOP

Produces:
- drone
- trap
- repair kit
- deployable device

Engineer affinity.

---

# 46. PRODUCTION BUILDING P03 — ALCHEMY LAB

Produces:
- potion
- bomb
- poison
- cleanse

Post-Prototype.

---

# 47. PRODUCTION BUILDING P04 — AMMO FOUNDRY

Supports:
- Cannon
- anti-air
- siege weapon

Later due logistics complexity.

---

# 48. SUPPORT BUILDING S01 — HOSPITAL

Autonomous:
- heal Hero/Units

Typing:
- Accuracy -> heal power
- Speed -> rate
- Combo -> area heal

---

# 49. SUPPORT BUILDING S02 — TEMPLE

- cleanse
- morale
- revive charge
- curse resistance

---

# 50. SUPPORT BUILDING S03 — SHRINE

- mana
- ultimate charge
- boss mechanic
- blessing

Typing:
- Accuracy + Combo

Strong candidate for boss interaction.

---

# 51. SUPPORT BUILDING S04 — BARD HALL

- aura
- morale
- rhythm support

Later experimental.

---

# 52. SUPPORT BUILDING S05 — SHIELD GENERATOR

- area shield
- machine world

Typing:
- consistency -> uptime
- accuracy -> shield capacity

---

# 53. RESEARCH BUILDING RS01 — LIBRARY

Autonomous:
- Knowledge

Typing:
- vocabulary
- phrase

Benefits:
- research points
- reveal enemy weakness
- upgrade discount

---

# 54. RESEARCH BUILDING RS02 — ACADEMY

- unit training
- tactical unlock
- temporary bonus

---

# 55. RESEARCH BUILDING RS03 — OBSERVATORY

- wave preview
- stealth detection
- range insight

---

# 56. RESEARCH BUILDING RS04 — TECH LAB

Machine-world Library equivalent.

---

# 57. SPECIAL BUILDING — WORLD SPECIFIC

Examples:

## Dragon World
- Dragon Roost
- Flame Altar

## Machine World
- Reactor
- Drone Relay

## Frozen World
- Heat Core
- Ice Beacon

## Arcane World
- Portal Gate
- Mana Nexus

---

# 58. BUILDING PRODUCTION PACKAGE

Mỗi Building cần:

- id
- category
- cost
- size
- autonomous behavior
- stats
- targeting
- assist profile
- overdrive
- branch A
- branch B
- weakness
- synergy
- terrain rule
- model
- construction model
- damaged state
- destroyed state nếu có
- upgrade models
- animation
- VFX
- SFX
- icon
- UI panel

---

# 59. UNIT MASTER TAXONOMY

Unit là quân tự động sinh từ Building/Hero.

---

# 60. UNIT U01 — SHIELD SOLDIER

- tank
- block
- protect

---

# 61. UNIT U02 — SPEARMAN

- balanced melee
- anti-large optional

---

# 62. UNIT U03 — BERSERKER

- damage
- low defense

---

# 63. UNIT U04 — ARCHER UNIT

- mobile ranged

---

# 64. UNIT U05 — CAVALRY

- fast intercept

---

# 65. UNIT U06 — SUMMON

- elemental
- beast
- spirit
- drone

Temporary.

---

# 66. UNIT U07 — HEALER UNIT

- support
- low damage

Later.

---

# 67. UNIT U08 — SIEGE UNIT

- slow
- anti-large
- late-game

---

# 68. ENEMY MASTER TAXONOMY

Enemy mặc định:

```text
HP Bar
Combat AI
No typing word
```

Chỉ một số Enemy có `DirectTypingInteraction`.

---

# 69. ENEMY EN01 — SWARM

- low HP
- large number
- anti-single-target pressure

Counter:
- Cannon
- Flame
- Lightning

---

# 70. ENEMY EN02 — TANK

- high HP
- armor
- slow

Counter:
- Mage
- Poison
- Deadeye

---

# 71. ENEMY EN03 — RUNNER

- high speed
- low/medium HP

Counter:
- Ranger
- Ice
- Cavalry

Special variant có thể có Direct Typing:
`freeze`, `anchor`, `halt`.

---

# 72. ENEMY EN04 — FLYER

- airborne
- bypass block

Counter:
- Archer
- Anti-Air
- Mage
- Ranger Hero

---

# 73. ENEMY EN05 — SHIELDED

- separate shield
- HP underneath

Possible Direct Typing:
word appears only when shield enters charge state.

Typing result:
- break shield,
- weaken shield.

---

# 74. ENEMY EN06 — HEALER

- heals nearby enemy

Direct Typing window optional:
when casting:
`interrupt`

Success:
- cancel heal

---

# 75. ENEMY EN07 — COMMANDER

- buff nearby enemies

Priority target.

---

# 76. ENEMY EN08 — SPLITTER

On death:
- splits

Need entity cap.

---

# 77. ENEMY EN09 — BURROWER

- underground
- bypass some zones
- emerge later

Need ground telegraph.

---

# 78. ENEMY EN10 — ASSASSIN

- targets Hero/support

---

# 79. ENEMY EN11 — THIEF

Targets:
- Mine
- Treasury
- Market

Steals and escapes.

Possible Direct Typing:
`capture`

Result:
- root/slow

---

# 80. ENEMY EN12 — SIEGE

Targets:
- Buildings

High structural damage.

---

# 81. ENEMY EN13 — DISRUPTOR

Aura:
- reduces Building efficiency

Never:
- scramble keyboard
- fake input
- alter typed text

---

# 82. ENEMY EN14 — SUMMONER

- summons adds
- portal

Direct Typing possible:
`seal`

Result:
- close portal

---

# 83. ENEMY EN15 — TELEPORTER

- jump forward on route

Direct Typing possible:
`anchor`

Only appears during teleport channel.

---

# 84. ENEMY EN16 — MIMIC / ADAPTIVE

- resistance shift

Must show visible state.

---

# 85. ENEMY EN17 — STEALTH

- hidden
- needs detector

---

# 86. ENEMY EN18 — ELITE

Elite = existing archetype + meaningful modifier.

Not only stat boost.

---

# 87. ENEMY EN19 — BERSERKER

- stronger at low HP

---

# 88. ENEMY EN20 — REFLECTOR

- limited projectile reflection

Soft counter only.

---

# 89. ENEMY EN21 — RESOURCE CORRUPTOR

- targets resource node
- lowers production

---

# 90. ENEMY EN22 — CONSTRUCTOR

- creates enemy barricade/totem

---

# 91. ENEMY EN23 — NECROMANCER

- revives minions

Need corpse/entity limit.

---

# 92. ENEMY EN24 — WEATHER CALLER

- fog
- storm
- local terrain debuff

Late-game.

---

# 93. ENEMY DIRECT TYPING SUBTYPES

Không phải Enemy type riêng, mà là modifier.

## DT01 — Interrupt
typing cancels cast.

## DT02 — Break Shield
typing removes shield.

## DT03 — Slow/Freeze
typing applies control.

## DT04 — Reveal
typing reveals stealth/ethereal target.

## DT05 — Execute
only for special low-HP enemy.

## DT06 — Disable Skill
typing disables special ability.

## DT07 — Pushback
typing forces enemy backward.

## DT08 — Dispel
removes buff.

---

# 94. ENEMY PRODUCTION PACKAGE

- id
- faction
- archetype
- target priority
- HP
- armor
- resistance
- speed
- abilities
- threat score
- spawn cost
- counter tags
- direct typing interaction if any
- model
- animation
- VFX
- SFX
- codex
- lore

---

# 95. BOSS MASTER TAXONOMY

Boss luôn có:

- HP bar
- phase
- abilities
- map interaction
- telegraphs

Typing chỉ là phase mechanic khi phù hợp.

---

# 96. BOSS BS01 — SIEGE BOSS

- destroys Buildings
- armor plates
- slow advance

Typing possible:
- Forge/Cannon weak-point break support

---

# 97. BOSS BS02 — SUMMONER BOSS

- portals
- adds
- pressure

Typing:
- Shrine sequence can seal portal

---

# 98. BOSS BS03 — FLYING BOSS

- altitude phases
- air/ground windows

---

# 99. BOSS BS04 — MULTI-LANE BOSS

- attacks more than one lane
- clones/detachments

---

# 100. BOSS BS05 — WORLD-EVENT BOSS

- modifies terrain
- breaks bridge
- freezes river
- creates lava

---

# 101. BOSS BS06 — DUEL BOSS

- hunts Hero directly

Buildings support indirectly.

Use sparingly.

---

# 102. BOSS BS07 — FORTRESS BOSS

Boss is structure.

Need destroy:
- generators
- shield
- turrets

---

# 103. BOSS BS08 — PHASE-SHIFT BOSS

- changes resistance
- movement
- ability profile

---

# 104. BOSS HP UI

Normal boss:

```text
BOSS NAME — PHASE II
██████████████████ 63%
```

Optional:
- Shield bar
- Armor bar
- Stagger bar

Typing text should never replace boss HP bar.

---

# 105. BOSS DIRECT TYPING WINDOWS

Examples:

## Shield Phase
`break the seal`

Success:
- shield down
- stun

## Summon Phase
`seal portal`

Success:
- portal closed

## Enrage Phase
`disrupt`

Success:
- delay rage

## Vulnerability Phase
short word/phrase sequence.

Failure:
- boss continues mechanic
- no catastrophic instant loss unless clearly designed.

---

# 106. BOSS PRODUCTION PACKAGE

- story
- model
- scale
- rig
- phase states
- attacks
- telegraphs
- counters
- map interaction
- typing interaction
- music
- voice
- VFX
- SFX
- intro
- defeat
- reward

---

# 107. RESOURCE MASTER

Core recommended:

1. Gold
2. Material
3. Knowledge

---

# 108. RESOURCE RES01 — GOLD

Sources:
- passive
- Mine
- kill reward
- objectives
- typing bonus

Uses:
- build
- upgrade
- tactical purchase

---

# 109. RESOURCE RES02 — MATERIAL

Sources:
- Farm
- Lumber
- Quarry
- loot/objective

Uses:
- Forge
- Workshop
- advanced Building

Could be delayed until after prototype.

---

# 110. RESOURCE RES03 — KNOWLEDGE

Sources:
- Library
- lesson
- objective

Uses:
- research
- reveal
- temporary tech

---

# 111. FARM / RUỘNG SYSTEM

Farm is a real Building, not decoration.

Possible functions:

- produces Food/Material abstraction
- supports Barracks regen
- increases civilian economy
- can be attacked by raiders

Hero Assist:
- typing consistency -> production
- perfect streak -> harvest burst

Possible upgrade:
- Crop Farm
- Ranch
- Herbal Farm

Do not make food management too complex in early version.

---

# 112. CURRENCY TYPES

## In-battle
- Gold
- optional Material
- optional Knowledge

## Meta
- Credits/Coins
- Crystal if needed
- Event Tokens

Paid/premium currency not locked in design.

---

# 113. SHOP MASTER TAXONOMY

1. Battle Shop
2. Meta Shop
3. Cosmetic Shop
4. Event Shop
5. Blueprint Shop

---

# 114. SHOP SH01 — BATTLE SHOP

Sells:
- repair
- emergency troops
- temporary buff
- trap
- potion

Must:
- be fast
- not pause gameplay too long
- use in-battle resources only

---

# 115. SHOP SH02 — META SHOP

Sells/unlocks:
- Hero
- Blueprint
- Equipment
- permanent cosmetic

---

# 116. SHOP SH03 — COSMETIC SHOP

Items:
- Hero skin
- Building skin
- Projectile skin
- VFX theme
- Finisher
- Emote
- UI theme
- Voice Pack
- Mount
- Companion

---

# 117. SHOP SH04 — EVENT SHOP

- event cosmetic
- lore item
- challenge reward

Avoid aggressive FOMO.

---

# 118. SHOP SH05 — BLUEPRINT SHOP

Unlock:
- Building
- upgrade branch
- world-special structure

---

# 119. SHOP ITEM PREVIEW

Hero:
- 3D rotate
- skills
- affinity
- voice sample
- VFX preview

Building:
- level 1/2/3
- branch A/B
- skin preview

Cosmetic:
- before/after

---

# 120. EQUIPMENT MASTER

Possible slots:

- Weapon
- Armor
- Utility
- Relic
- Charm

Not required for Prototype.

---

# 121. EQUIPMENT EQ01 — WEAPON

Should alter:
- attack behavior
- skill

Not only stat.

---

# 122. EQUIPMENT EQ02 — ARMOR

- defense
- mobility tradeoff
- aura

---

# 123. EQUIPMENT EQ03 — UTILITY

- repair drone
- beacon
- cooldown tool

---

# 124. EQUIPMENT EQ04 — RELIC

- affinity
- typing effect
- ultimate modifier

---

# 125. EQUIPMENT EQ05 — CHARM

Small modifier.

Avoid trash loot.

---

# 126. CONSUMABLES

Types:
- Repair Kit
- Heal Potion
- Mana Potion
- Emergency Reinforcement
- Bomb
- Trap
- Shield Charge
- Temporary Overclock

Keep count low.

---

# 127. BLUEPRINTS

Blueprint unlocks:
- new Building
- specialization branch
- special world structure

Blueprint is a strong non-stat reward.

---

# 128. COSMETICS

Types:
- Hero skin
- Building skin
- Weapon skin
- Projectile skin
- VFX
- Voice
- Finisher
- Mount
- Companion
- Banner
- Profile frame

---

# 129. DROP / LOOT TYPES

Possible:
- Gold
- Material
- temporary item
- rare blueprint fragment
- cosmetic event item

Avoid loot spam.

---

# 130. MAP CONTENT TYPES

- Single Lane
- Forked Lane
- Multi-Entrance
- Crossroads
- Loop
- Dynamic Route
- Escort
- Hold Zone
- Boss Arena
- Endless

---

# 131. TERRAIN CONTENT TYPES

- Forest
- Snow
- Desert
- Volcano
- Swamp
- Storm
- Ruins
- Floating Isles

---

# 132. WORLD CONTENT TYPES

Potential long-term:

- Verdant Kingdom
- Desert Empire
- Frozen North
- Dragon Highlands
- Arcane Isles
- Clockwork Civilization
- Underworld
- Celestial Dynasty
- Abyss
- Lost Civilization

Names are placeholders.

---

# 133. WORLD CONTENT PACKAGE

Each World includes:

- civilization
- races
- factions
- heroes
- buildings
- enemy faction
- bosses
- maps
- terrain
- architecture
- props
- music
- ambience
- VFX palette
- story
- loading art
- UI accent

---

# 134. ART ASSET CATEGORIES

- Hero Concept
- Enemy Concept
- Boss Concept
- Building Concept
- Environment Concept
- Orthographic 3D Reference
- Portrait
- Icon
- Prop
- UI
- VFX texture
- Cinematic frame

---

# 135. ANIMATION CATEGORIES

## Hero
- idle
- run
- fly
- attack
- skill
- ultimate
- assist
- victory

## Building
- idle
- attack
- reload
- production
- overdrive
- damaged

## Enemy
- move
- attack
- cast
- hit
- death

## Boss
- phase
- attack
- environmental interaction
- death

---

# 136. VFX CATEGORIES

- Projectile
- Impact
- Trail
- Aura
- Area
- Beam
- Status
- Weather
- Ultimate
- Boss
- Typing Feedback

---

# 137. SFX CATEGORIES

- Hero
- Building
- Unit
- Enemy
- Boss
- Environment
- UI
- Typing
- Reward

---

# 138. VOICE CATEGORIES

Hero:
- select
- move
- attack
- assist
- skill
- ultimate
- low HP
- victory
- defeat
- story

Boss:
- intro
- phase
- defeat

NPC:
- shop
- tutorial
- story

---

# 139. CGI CONTENT TYPES

## Tier C1
In-engine gameplay cinematic

## Tier C2
Enhanced in-engine
- Hero intro
- Boss intro

## Tier C3
Pre-rendered
- World opening
- Major ending
- Flagship Hero

---

# 140. PROTOTYPE CONTENT CATALOG

## Hero
- Engineer

## Buildings
- Archer
- Cannon
- Barracks
- Gold Mine
- Workshop
- Shrine

## Units
- Shield Soldier

## Enemies
- Swarm
- Tank
- Runner
- Flyer
- Healer
- Thief
- Siege
- Commander

## Direct Typing Enemy
- Fast Runner
- Healer cast interrupt

## Boss
- Siege/Summoner hybrid

## Resource
- Gold

## Map
- Forked Lane

## Terrain
- simple forest/grassland

---

# 141. VERTICAL SLICE CATALOG

Add:

## Heroes
- Warrior
- Ranger

## Buildings
- Mage Tower
- Hospital
- Library

## Enemies
- Shield
- Summoner
- Teleporter

## Boss
- one polished world boss

## Learning
- Word
- Phrase
- Listening

## Presentation
- polished voice subset
- VFX
- SFX
- boss intro

---

# 142. MVP CONTENT TARGET

Suggested:

- 3–4 Heroes
- 8–10 Buildings
- 12–16 Enemy types
- 2–3 Bosses
- 3–5 Maps
- 1 World
- 2 Terrain mechanics
- 1 Battle Shop
- small Meta Shop
- basic Cosmetics
- no Equipment unless proven necessary

---

# 143. POST-MVP CONTENT

Potential:
- more Worlds
- Dragon Hero
- Summoner
- Dynamic Routes
- Equipment
- Event Shop
- large Bosses
- advanced terrain
- endless mode
- more direct-typing enemies

---

# 144. QUALITY GATE — HERO

Hero is ready only when:

- unique role
- weakness exists
- clear affinity
- movement identity
- coherent typing profile
- coherent skill kit
- readable silhouette
- full asset plan
- lore connection

---

# 145. QUALITY GATE — BUILDING

Building is ready only when:

- autonomous behavior works
- Hero Assist exists
- upgrade branches differ
- counter/use case exists
- art states planned
- VFX/SFX readable
- UI description concise

---

# 146. QUALITY GATE — ENEMY

Enemy is ready only when:

- creates decision
- readable quickly
- has counter
- fair telegraph
- typing interaction optional/special, not default
- no input sabotage

---

# 147. QUALITY GATE — BOSS

Boss is ready only when:

- HP-based combat works
- 2+ phases
- meaningful mechanic
- telegraphs clear
- no HP sponge
- typing phase integrated naturally
- intro/defeat presentation planned

---

# 148. CONTENT DEPENDENCY RULES

Examples:

If Flyer exists:
- there must be anti-air counter.

If Thief exists:
- there must be economy target.

If Shield typing break exists:
- player must understand the prompt.

If Shrine boss mechanic exists:
- Shrine must be taught before boss.

---

# 149. COUNTER MATRIX REQUIRED

Create before balance lock:

## Building vs Enemy
- Strong
- Neutral
- Weak
- Cannot Target

## Hero vs Building
- Affinity

## Hero vs Enemy
- Counter relation

## Terrain vs Unit
- movement/range effect

---

# 150. FINAL CLAUDE REVIEW REQUEST

Claude must review this catalog and return:

1. Missing content types
2. Redundant content types
3. Types to merge
4. Types to postpone
5. Prototype catalog revision
6. MVP catalog revision
7. World 1 catalog
8. Counter matrix
9. Asset-cost ranking
10. Content production risks
11. Direct Typing Enemy recommendations
12. Boss content recommendations
13. Shop scope recommendations
14. Economy resource recommendations
15. Final V2.1 taxonomy

Do not start mass asset production until this review is complete.
