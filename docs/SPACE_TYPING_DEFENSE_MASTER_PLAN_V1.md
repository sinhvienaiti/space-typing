# SPACE TYPING DEFENSE — MASTER PLAN V1

> Lưu vào repo ngày 18/10/2026: nguyên văn bản V1 chủ dự án gửi trong cuộc trò chuyện, chưa sửa nội dung. Bản đã chỉnh theo đánh giá và quyết định của chủ dự án: `SPACE_TYPING_DEFENSE_PLAN_V2_2026-10-18.md`.

**Document type:** Product / Gameplay / Technical / UX / Content Master Plan  
**Purpose:** Review trước khi triển khai code  
**Status:** Draft for review  
**Scope:** Chuyển hướng Space Typing từ shooter thuần sang hệ sinh thái **Typing + Tower Defense + Hero Combat**, hỗ trợ cả **offline/single-player** và **online/co-op 1–8 người**.

---

# 0. TÓM TẮT QUYẾT ĐỊNH

Space Typing Defense sẽ không trở thành một game hoàn toàn mới tách khỏi hệ thống hiện tại. Mục tiêu là giữ lại phần lớn giá trị đã có:

- hệ thống typing,
- campaign/world,
- ship/dragon themes,
- hero/player model,
- VFX,
- audio,
- enemy/boss assets,
- progression,
- shop,
- upgrade,
- PvP/co-op foundation,
- background cosmic,
- các giant creature/setpiece,
- admin/content pipelines.

Điểm thay đổi lớn nhất là **combat presentation và game loop**.

Thay vì:

```text
Player trực tiếp bắn từng enemy trong màn shooter
```

game sẽ trở thành:

```text
BUILD → TYPE → DEFEND → EARN → UPGRADE → SURVIVE → BOSS → REPLAY
```

Hai mode chính:

1. **Massive Rift Defense**
   - Map rất rộng.
   - Tối đa 8 portal/gate.
   - 1–8 người.
   - Mỗi player quản lý một sector/cổng.
   - Quái tràn ra toàn map theo wave.
   - Thua khi Threat/Overload vượt ngưỡng quá lâu.
   - Thiên về co-op, endless, leaderboard, online.

2. **Core Defense**
   - Solo/offline là ưu tiên số 1.
   - Một căn cứ/Core/Home Base chính.
   - Enemy đi theo lane/path về Core.
   - Enemy lọt vào Core gây damage.
   - Core HP = 0 → thua.
   - Thiên về campaign, progression, chapter, challenge, boss.

Hai mode phải dùng chung phần lớn gameplay core để tránh code phình.

---

# 1. PRODUCT VISION

## 1.1. Câu mô tả game ngắn nhất

> Một game tower defense 3D phong cách cosmic-fantasy, nơi người chơi xây tower, điều khiển hero và dùng kỹ năng typing để can thiệp trực tiếp vào chiến trường.

Typing không còn chỉ là input để bắn đạn.

Typing trở thành:

- targeting,
- skill activation,
- emergency response,
- boss mechanic,
- combo engine,
- resource multiplier,
- tower overdrive,
- support mechanic,
- team coordination mechanic.

---

## 1.2. Mục tiêu trải nghiệm

Game cần tạo được 5 cảm giác chính:

### A. Dễ hiểu ngay

Người mới chỉ cần biết:

```text
Xây tower
↓
Enemy xuất hiện
↓
Tower tự bắn
↓
Gõ từ đúng để tăng hiệu quả
↓
Không cho enemy phá Core / làm map quá tải
```

### B. Càng chơi càng sâu

Sau 5–10 giờ người chơi mới dần hiểu:

- tower synergies,
- element combos,
- route control,
- armor break,
- crowd control,
- relic builds,
- hero builds,
- boss weak points,
- WPM/accuracy builds,
- economy strategies.

### C. Có replayability

Cùng một map nhưng mỗi run có thể khác:

- relic khác,
- tower branch khác,
- hero khác,
- route modifier khác,
- boss affix khác,
- challenge modifier khác,
- typing modifier khác.

### D. Có chỗ cho casual và hardcore

Casual:

- campaign,
- easy/normal,
- offline,
- auto-target,
- pause,
- low typing pressure.

Hardcore:

- nightmare,
- endless,
- 8-gate,
- ranked,
- weekly seed,
- no-pause,
- boss challenge,
- leaderboard.

### E. Visual spectacle tăng dần

Đầu trận:

```text
2–3 tower
10 enemy
ít hiệu ứng
```

Cuối trận:

```text
20+ tower
100+ enemy
hero skills
boss
chain lightning
fire
meteor
projectiles
giant creature
screen shake
camera zoom
```

Nhưng UI typing vẫn phải đọc rõ.

---

# 2. CORE GAME STRUCTURE

```text
SPACE TYPING DEFENSE
│
├── CAMPAIGN
│   └── CORE DEFENSE
│       ├── Solo
│       ├── Offline
│       ├── Chapters
│       ├── Bosses
│       ├── Challenges
│       └── Difficulty tiers
│
├── RIFT DEFENSE
│   ├── 1–8 players
│   ├── Massive map
│   ├── Multi-gate
│   ├── Threat meter
│   ├── Endless
│   └── Co-op / Ranked / Custom
│
├── WEEKLY RIFT
│   ├── Fixed seed
│   ├── Same modifiers
│   └── Leaderboard
│
├── BOSS SIEGE
│   ├── Solo
│   ├── Co-op
│   └── Multi-phase boss
│
└── CUSTOM
    ├── Host settings
    ├── Gate count
    ├── Enemy scaling
    ├── Tower restrictions
    └── Typing modifiers
```

---

# 3. MODE 1 — MASSIVE RIFT DEFENSE

# 3.1. High-level concept

Map quy mô lớn với tối đa 8 cổng spawn.

```text
                 GATE 1

        G8                   G2

   G7          CENTER           G3

        G6                   G4

                 GATE 5
```

Map không bắt buộc hình tròn.

Có thể là:

- asteroid ring,
- giant space citadel,
- floating island network,
- dragon realm,
- celestial ruins,
- multi-layer fortress.

---

# 3.2. Player ownership

Mỗi player được assign:

```text
Player 1 → Sector A
Player 2 → Sector B
...
Player 8 → Sector H
```

Nhưng player **không bị khóa** trong sector.

Player có quyền:

- build tower trong sector mình,
- gửi resource,
- ping,
- request support,
- dùng global skill,
- di chuyển hero sang sector khác,
- cứu lane bạn,
- share target priority.

---

# 3.3. Host mở thêm gate

Bắt đầu map với:

```text
2 / 8 gates active
```

Host có thể chọn mở gate mới.

Mỗi gate mới tăng:

```text
Enemy pressure
Enemy variety
Reward rate
XP gain
Rare drop chance
Score multiplier
```

Ví dụ:

```text
OPEN GATE 5?

+25% enemy pressure
+20% resource gain
+15% XP
+10% rare drop chance
+0.25 leaderboard multiplier
```

Có thể yêu cầu vote ở public room:

```text
3/5 players agree → gate opens
```

Custom room:

```text
Host-only control
```

---

# 3.4. Lose condition: Threat Meter thay vì enemy count cứng

Không nên:

```text
Enemy count >= 150 → instant lose
```

Nên dùng:

# THREAT / OVERLOAD

Mỗi enemy tạo threat khác nhau:

```text
Common        +1
Fast          +1
Shield        +2
Elite         +3
Tank          +4
Commander     +6
Mini Boss     +10
World Boss    special
```

Threat bar:

```text
THREAT
████████████████░░ 82%
```

Khi đạt 100%:

```text
CONTAINMENT FAILURE IN 15s
```

Nếu team giảm threat xuống dưới recovery threshold:

```text
< 90%
```

countdown dừng.

Cơ chế này tạo comeback.

---

# 3.5. Gate escalation

Gate có levels:

```text
Gate I
Gate II
Gate III
Gate IV
Gate V
```

Gate càng cao:

- spawn nhanh hơn,
- enemy stronger,
- elite chance cao hơn,
- reward cao hơn.

Người chơi có thể tự nguyện upgrade gate để tăng score/reward.

---

# 3.6. Massive mode submodes

## Casual

- no rank,
- drop-in friendly,
- disconnect safe,
- moderate scaling.

## Endless

- wave không giới hạn,
- mục tiêu highest wave.

## Ranked

- fixed rule set,
- matchmaking,
- leaderboard,
- no manual difficulty change.

## Custom

Host điều chỉnh:

- player count,
- gate count,
- enemy HP,
- wave speed,
- typing difficulty,
- towers allowed,
- bosses,
- modifiers.

## Weekly Rift

- same map,
- same seed,
- same enemy waves,
- same relic options,
- same tower pool.

Mục tiêu:

```text
fair leaderboard
```

---

# 4. MODE 2 — CORE DEFENSE

# 4.1. High-level concept

Một map classic tower defense.

Enemy spawn từ:

```text
1–4 entrances
```

và đi theo:

```text
path → junction → path → Core
```

Core có HP.

Enemy chạm Core:

```text
Core HP -= enemy damage
```

Core HP = 0:

```text
DEFEAT
```

---

# 4.2. Why this is the foundation mode

Đây phải là mode build trước vì:

- dễ prototype,
- dễ balance,
- dễ offline,
- dễ test typing,
- dễ test tower pathing,
- không cần networking ngay,
- phù hợp campaign,
- phù hợp chapter structure.

---

# 4.3. Stage format

Ví dụ:

```text
WORLD 1 — CELESTIAL FRONTIER

1-1 Awakening Path
1-2 Crystal Road
1-3 Twin Gate
1-4 Broken Orbit
1-5 Boss: Rift Maw
```

Mỗi stage:

```text
★ Win
★ Core HP >= 80%
★ Accuracy >= 95%
```

Optional:

```text
★ No tower sold
★ No hero death
★ Max 4 towers
★ No fire damage
```

---

# 4.4. Difficulty tiers

```text
Normal
Hard
Nightmare
Chaos
```

Không chỉ scale HP.

Hard có thể thay đổi:

- route,
- tower restriction,
- enemy composition,
- elite timing,
- boss phase,
- typing speed,
- environmental modifier.

---

# 4.5. Challenge variants

```text
No Upgrade
One Tower Type
Hero Only
Typing Only
Low Economy
Fast Waves
Armored Invasion
Boss Rush
Perfect Accuracy
No Pause
```

---

# 5. TYPING COMBAT DESIGN

Typing là differentiator lớn nhất.

Không được để game biến thành TD bình thường có ô typing phụ.

---

# 5.1. Layer 1 — Priority Target Typing

Enemy quan trọng có word.

Ví dụ:

```text
[ OVERLOAD ]
Elite Commander
```

Gõ đúng:

```text
overload
```

Kết quả:

- towers focus target,
- apply armor break,
- trigger critical window,
- hero aim target.

---

# 5.2. Layer 2 — Tower Overdrive

Mỗi tower có energy.

Tower attack tự động.

Typing tốt tạo:

```text
Overdrive charge
```

Ví dụ:

```text
Combo 20
Accuracy 98%
→ DRAGON TOWER OVERDRIVE READY
```

Prompt:

```text
IGNITION
```

Gõ thành công:

```text
Fire Breath x3
AOE radius +50%
Burn stacks
```

---

# 5.3. Layer 3 — Emergency Typing

Dùng khi:

- Core low HP,
- lane broken,
- elite breach,
- boss phase,
- shield down.

Ví dụ:

```text
EMERGENCY REPAIR
restore
```

Gõ đúng nhanh:

```text
Core +10% HP
```

---

# 5.4. Layer 4 — Global Spells

```text
Meteor
Freeze
Shield
Black Hole
EMP
Firestorm
Time Warp
Repair
```

Skill activation:

```text
type word / phrase
```

Tốc độ và accuracy ảnh hưởng power.

---

# 5.5. Layer 5 — Boss Typing Mechanics

Boss không chỉ có HP.

Ví dụ:

```text
VOID LEVIATHAN
```

Phase:

```text
1. Break tentacles
2. Type weakness word
3. Shield opens
4. DPS phase
5. Boss enrages
6. Final typing sequence
```

---

# 5.6. Layer 6 — Combo Engine

Typing stats:

```text
WPM
Accuracy
Combo
Perfect Words
Mistakes
Recovery
```

Các threshold:

```text
Combo 10  → +5% attack speed
Combo 20  → overdrive charge
Combo 30  → crit chance
Combo 50  → hero rage
Combo 100 → legendary state
```

Balance phải tránh snowball quá mạnh.

---

# 5.7. Anti-clutter typing rules

Không hiển thị word trên mọi enemy.

Priority:

```text
Boss
Elite
Dangerous
Special
Player-targeted
```

Common enemy:

```text
no word label
```

Hoặc dùng:

```text
group word
```

Một từ có thể đại diện 5 enemy cùng type.

---

# 6. TOWER SYSTEM

# 6.1. Tower categories

MVP nên có 4 tower.

Full game nên có 10–16 tower core archetypes.

Ví dụ:

```text
1. Cannon
2. Frost Crystal
3. Arc Tower
4. Dragon Tower
5. Void Tower
6. Missile Battery
7. Beam Prism
8. Gravity Well
9. Support Beacon
10. Repair Node
11. Poison/Bio
12. Drone Nest
```

---

# 6.2. Tower role taxonomy

```text
Single-target DPS
AOE
Slow
Stun
Armor break
Damage over time
Boss DPS
Support
Economy
Anti-air
Crowd control
Debuff
```

---

# 6.3. Branching upgrades

Không dùng:

```text
Lv1 → Lv2 → Lv3 → Lv4 → Lv5
```

Dùng:

```text
                   DRAGON TOWER
                        │
             ┌──────────┼──────────┐
             │          │          │
            FIRE       STORM      VOID
```

Ví dụ FIRE:

```text
Ember
→ Burn
→ Explosion
→ Inferno
→ Phoenix Breath
```

STORM:

```text
Spark
→ Chain
→ Stun
→ Tempest
→ Sky Tyrant
```

VOID:

```text
Slow
→ Armor Break
→ Gravity
→ Black Hole
→ Event Horizon
```

---

# 6.4. Tower synergy system

Ví dụ:

```text
Frost + Cannon
→ Shatter
```

```text
Fire + Poison
→ Combustion
```

```text
Shock + Wet
→ Chain multiplier
```

```text
Void + Missile
→ Homing distortion
```

Mục tiêu:

```text
build creativity
```

---

# 6.5. Tower placement

Có thể dùng:

### Fixed pads

Dễ balance.

### Free placement

Sâu hơn nhưng khó pathfinding.

Khuyến nghị:

```text
Campaign → hybrid pads
Massive → sector pads + special free nodes
```

---

# 7. HERO SYSTEM

Current ship/dragon assets nên chuyển thành hero system.

---

# 7.1. Hero role

Hero:

- move,
- patrol,
- attack,
- cast skill,
- tank,
- intercept,
- support,
- boss burst.

---

# 7.2. Dragon hero

Animations:

```text
idle-flight
wing-flap
glide
bank-left
bank-right
attack
mouth-charge
fire-breath
cast
hit
rage
death
```

---

# 7.3. Ship hero

Animations:

```text
idle-hover
roll
pitch
strafe
missile
laser
boost
warp
hit
critical
explode
```

---

# 7.4. Hero command

Player có thể:

```text
Click map
→ Move hero
```

Hoặc:

```text
Hero AI:
Patrol
Defend Core
Boss Focus
Weak Lane
Follow Ping
```

---

# 7.5. Hero progression

Hero progression mở:

- skill,
- skill branch,
- cosmetics,
- passive options.

Không nên tạo pay-to-win.

---

# 8. ENEMY SYSTEM

# 8.1. Enemy archetypes

MVP:

```text
Runner
Basic
Tank
Shield
Flying
Commander
Elite
Boss
```

Full:

```text
Stealth
Splitter
Healer
Leech
Summoner
Jammer
Bomber
Teleporter
Reflector
Disruptor
Siege
Swarm
Burrower
```

---

# 8.2. Enemy lane behavior

Enemy có thể:

- follow path,
- split route,
- choose weakest path,
- bypass tower,
- teleport,
- shield allies,
- disable tower.

---

# 8.3. Enemy mutation

Late game:

```text
Armored
Frozen immune
Fire resistant
Fast
Regenerating
Reflective
Phase
Boss-linked
```

---

# 9. BOSS DESIGN

Boss phải là event.

---

# 9.1. Boss rules

Boss:

- multi-phase,
- camera event,
- unique audio,
- typing mechanics,
- weak points,
- adds,
- route change,
- special reward.

---

# 9.2. Giant creature usage

Giant assets như:

- space whale,
- leviathan,
- world dragon,
- giant machine,
- cosmic serpent

nên chuyển từ background/setpiece thành:

```text
world event / boss / neutral giant
```

---

# 9.3. Example boss

```text
VOID LEVIATHAN
```

Phase 1:

```text
Moves around map
spawns parasites
```

Phase 2:

```text
Tentacles block towers
```

Phase 3:

```text
Type "rupture"
→ expose core
```

Phase 4:

```text
DPS race
```

Phase 5:

```text
Final phrase
```

---

# 10. ECONOMY

# 10.1. In-match resources

Suggested:

```text
Credits
Energy
Crystal
Ultimate Charge
```

MVP nên đơn giản:

```text
Credits
```

---

# 10.2. Earning

Player kiếm resource từ:

- kills,
- typing accuracy,
- combo,
- elite kill,
- boss phase,
- wave clear,
- perfect wave.

---

# 10.3. Multiplayer resource interaction

Có:

```text
SEND 500
REQUEST 700
TEAM FUND
```

Không nên bắt buộc shared economy hoàn toàn.

Recommended:

```text
Personal credits
+
Small team pool
```

---

# 11. ROGUELITE LAYER

Sau một số wave:

```text
CHOOSE ONE
```

Ví dụ:

```text
Inferno Core
Fire damage +30%
```

```text
Arc Matrix
Chain targets +2
```

```text
Frozen Time
Slow +25%
```

---

# 11.1. Relic tiers

```text
Common
Rare
Epic
Legendary
Mythic
```

---

# 11.2. Relic categories

```text
Tower
Typing
Hero
Economy
Core
Element
Boss
Risk/Reward
```

---

# 12. PROGRESSION SYSTEM

Progression không nên tăng raw power vô hạn.

---

# 12.1. Account progression unlocks

Unlock:

- towers,
- heroes,
- tower branches,
- relics,
- difficulty,
- maps,
- cosmetics,
- challenges.

---

# 12.2. Avoid

Không:

```text
Account Lv100
= +500% damage
```

Điều này phá multiplayer balance.

---

# 12.3. Collection

```text
Tower Codex
Enemy Codex
Boss Codex
Relic Codex
Hero Gallery
World Archive
```

---

# 13. OFFLINE RETENTION

Offline player phải có lý do quay lại mà không cần live service.

---

# 13.1. Campaign

Chapter-based.

---

# 13.2. Stage mastery

```text
Stars
Medals
No-hit
Accuracy
WPM
Core HP
Speed clear
```

---

# 13.3. Challenge mode

Map cũ nhưng rule mới.

---

# 13.4. Endless solo

Offline endless vẫn cần hỗ trợ.

---

# 13.5. Offline save

Save:

```text
Local profile
+
optional cloud sync later
```

---

# 14. ONLINE RETENTION

Online cần tạo social loop.

---

# 14.1. Co-op reasons

- shared crisis,
- resource sending,
- support calls,
- hero rescue,
- boss coordination,
- gate opening,
- leaderboard.

---

# 14.2. Weekly Rift

Same seed.

Leaderboard:

```text
Wave
Score
Accuracy
WPM
Damage
Threat peak
Deaths
Core HP
```

---

# 14.3. Seasonal content

Có thể thêm sau:

```text
Season theme
New boss
New relic set
New tower
Cosmetic reward
```

Không nên bắt đầu dự án bằng season system.

---

# 15. MULTIPLAYER 1–8 PLAYERS

# 15.1. Scale progression

Không build 8-player trước.

Roadmap:

```text
Solo
→ 2P
→ 4P
→ 8P
```

---

# 15.2. Sector model

Each player:

```text
playerId
sectorId
gateId
economy
hero
towerOwnership
```

---

# 15.3. Disconnect handling

Player disconnect:

```text
Sector enters Auto Defense
```

Tower vẫn bắn.

Credits giữ lại.

Reconnect:

```text
restore ownership
```

Host có thể transfer.

---

# 15.4. Late join

Casual/custom:

```text
allowed
```

Ranked:

```text
not allowed after lock
```

---

# 15.5. Ping system

```text
Danger
Need help
Boss
Build here
Send resources
Focus target
Open gate?
```

---

# 16. MAP DESIGN

# 16.1. Core Defense maps

Map nên có:

- primary route,
- alternate route,
- choke points,
- tower pads,
- hero zones,
- boss arena.

---

# 16.2. Massive maps

Map phải:

- readable,
- sectorized,
- support camera zoom,
- support mini-map,
- allow large enemy count.

---

# 16.3. Verticality

3D không nên chỉ để đẹp.

Có thể có:

```text
upper lane
lower lane
air lane
tunnel
bridge
```

Nhưng MVP nên tránh quá phức tạp.

---

# 17. CAMERA PLAN

# 17.1. Campaign TD camera

Recommended:

```text
isometric / elevated 3D
```

Cho phép:

- zoom,
- pan,
- rotate nhẹ.

---

# 17.2. Massive mode

Camera:

```text
zoomed tactical view
```

Khi boss:

```text
cinematic zoom
```

---

# 17.3. Hero camera moments

Không chuyển sang full action camera thường xuyên.

Chỉ dùng:

- ultimate,
- boss intro,
- final kill,
- stage clear.

---

# 18. VISUAL STYLE

Giữ Space Typing style:

```text
cosmic
neon
crystal
energy
high contrast
3D
fantasy + sci-fi
```

---

# 18.1. Theme layer

Hai presentation theme:

```text
SPACE
DRAGON
```

Gameplay core giống nhau.

Space:

- ships,
- laser,
- missile,
- reactor.

Dragon:

- dragons,
- fire,
- magic,
- crystal.

---

# 18.2. Avoid visual clutter

VFX LOD:

```text
Near
Medium
Far
```

Quality settings:

```text
Low
Medium
High
Ultra
```

---

# 19. UI / UX

# 19.1. Main HUD

Suggested:

Top left:

```text
Stage
Wave
Gate status
```

Top center:

```text
Boss / event
```

Top right:

```text
Credits
Threat/Core HP
Combo
```

Bottom left:

```text
Tower palette
```

Bottom center:

```text
Typing input
```

Bottom right:

```text
Skills
Hero
Relic
```

---

# 19.2. Typing input visibility

Typing field phải:

- large enough,
- centered,
- never hidden by VFX,
- high contrast,
- support VN/EN,
- support IME safely.

---

# 19.3. Mini-map

Massive mode cần mini-map.

Show:

- gates,
- enemy clusters,
- players,
- boss,
- critical lane,
- threat hotspots.

---

# 20. AUDIO

# 20.1. Audio layers

```text
BGM
Ambient
Tower SFX
Enemy SFX
Hero SFX
Typing SFX
Announcer
Boss
UI
```

---

# 20.2. Intensity system

Music should escalate:

```text
calm
→ wave
→ danger
→ boss
→ victory
```

---

# 20.3. Multiplayer announcer

Examples:

```text
Gate breached
Sector critical
Boss incoming
Threat at 90%
Overdrive ready
Perfect wave
```

---

# 21. CONTENT MODEL

Data-driven.

Example tower:

```json
{
  "id": "dragon_tower",
  "role": ["aoe", "burn"],
  "baseCost": 400,
  "range": 8,
  "attackSpeed": 1.2,
  "branches": ["fire", "storm", "void"]
}
```

---

# 22. TECHNICAL ARCHITECTURE

# 22.1. High-level

```text
Game Rules
│
├── Defense Runtime
├── Typing Runtime
├── Enemy Runtime
├── Tower Runtime
├── Hero Runtime
├── Economy Runtime
├── Wave Runtime
└── Presentation Layer
```

---

# 22.2. Avoid mode-specific forks

Không:

```ts
if (massiveMode) { ... }
if (coreMode) { ... }
```

rải khắp code.

Dùng:

```ts
interface DefenseRuleSet {
  getLoseCondition()
  getSpawnPolicy()
  getEconomyPolicy()
  getGatePolicy()
  getVictoryCondition()
}
```

Implement:

```ts
CoreDefenseRuleSet
MassiveRiftRuleSet
```

---

# 22.3. Presentation abstraction

```ts
interface CombatTheme {
  heroPresentation
  towerPresentation
  enemyPresentation
  projectilePresentation
  audioProfile
  vfxProfile
  cameraProfile
}
```

---

# 23. WAVE SYSTEM

Wave schema:

```json
{
  "wave": 10,
  "groups": [
    {
      "enemy": "tank",
      "count": 10,
      "interval": 0.7
    },
    {
      "enemy": "runner",
      "count": 30,
      "interval": 0.2
    }
  ],
  "boss": "rift_guardian"
}
```

---

# 24. PATHFINDING

MVP:

```text
predefined spline/path nodes
```

Không cần navmesh dynamic ngay.

Later:

- route switching,
- path blocking,
- teleport,
- dynamic lanes.

---

# 25. PERFORMANCE TARGET

Need support:

```text
100–300 enemies
20–60 towers
large VFX
boss
multiplayer
```

Optimization:

- object pooling,
- GPU instancing,
- projectile pooling,
- animation LOD,
- enemy LOD,
- VFX LOD,
- audio limits,
- offscreen throttling.

---

# 26. SAVE SYSTEM

Save:

```text
profile
progression
unlocks
settings
campaign
codex
achievements
```

In-run save:

Core Defense:

```text
optional checkpoint
```

Massive online:

```text
server/session state
```

---

# 27. ANTI-CHEAT / FAIRNESS

Ranked requires authority.

Never trust client for:

- damage,
- resource,
- enemy kill,
- score,
- gate state.

Can trust partially for:

- input events,
- camera,
- visuals.

---

# 28. MATCHMAKING

Later.

Buckets:

```text
Casual
Ranked
Custom
Friends
```

Skill inputs:

- historical win rate,
- difficulty,
- WPM,
- accuracy,
- defense performance.

---

# 29. MONETIZATION PRINCIPLES

Nếu monetization sau này:

Allowed:

- skins,
- hero cosmetics,
- tower skins,
- effects,
- banners,
- announcer,
- music packs.

Avoid:

- raw power,
- stronger paid towers,
- paid stat boost.

---

# 30. LIVE OPS

Không làm sớm.

Later:

```text
Weekly Rift
Monthly Boss
Seasonal cosmetic
Special map
Community challenge
```

---

# 31. MVP DEFINITION

MVP phải chứng minh:

> Typing + Tower Defense có vui không?

MVP scope:

```text
1 map
20 waves
4 towers
8 enemies
1 hero
1 boss
3 typing mechanics
1 relic draft
1 difficulty
offline solo
```

---

# 32. MVP TOWERS

Suggested:

```text
Cannon
Frost
Arc
Dragon
```

---

# 33. MVP ENEMIES

```text
Basic
Runner
Tank
Shield
Flying
Commander
Elite
Boss
```

---

# 34. MVP TYPING MECHANICS

Only 3:

```text
Priority Target
Tower Overdrive
Emergency Skill
```

Không thêm quá nhiều ngay.

---

# 35. MVP BOSS

Need:

- 3 phases,
- one typing weak point,
- adds,
- dramatic visual.

---

# 36. ROADMAP

# PHASE 0 — DESIGN LOCK

Deliverables:

- final master plan,
- architecture decisions,
- MVP feature lock,
- UI wireframes,
- map concept,
- tower list,
- enemy list.

---

# PHASE 1 — SOLO CORE DEFENSE PROTOTYPE

Implement:

- path,
- Core HP,
- enemy spawn,
- tower placement,
- tower shooting,
- kill,
- wave,
- resource.

No fancy VFX yet.

---

# PHASE 2 — TYPING INTEGRATION

Add:

- priority typing,
- overdrive,
- emergency typing,
- combo,
- WPM,
- accuracy.

---

# PHASE 3 — HERO INTEGRATION

Add:

- Dragon/Ship hero,
- movement,
- attack,
- skill,
- target support.

---

# PHASE 4 — CONTENT & BOSS

Add:

- 20 waves,
- 8 enemy types,
- boss,
- relics,
- upgrade branches.

---

# PHASE 5 — POLISH

Add:

- final UI,
- VFX,
- audio,
- camera,
- quality settings,
- performance.

---

# PHASE 6 — CAMPAIGN

Add:

- chapters,
- stars,
- challenges,
- progression.

---

# PHASE 7 — MASSIVE MODE SOLO SIMULATION

Before networking:

- massive map,
- 2–8 gates,
- threat system,
- sector system,
- endless.

---

# PHASE 8 — 2 PLAYER CO-OP

Add:

- sync,
- reconnect,
- ownership,
- resources,
- pings.

---

# PHASE 9 — 4 PLAYER

Stress test.

---

# PHASE 10 — 8 PLAYER

Add:

- all sectors,
- gate control,
- host tools,
- scale balance.

---

# PHASE 11 — WEEKLY / RANKED

Only after stable.

---

# 37. MIGRATION FROM CURRENT SPACE TYPING

Keep/reuse:

```text
typing engine
enemy definitions
boss art
ship assets
dragon assets
projectile art
VFX
audio
backgrounds
campaign data
shop
progression
admin
config pipeline
quality settings
```

Refactor:

```text
combat loop
camera
enemy movement
targeting
projectile routing
stage rules
```

---

# 38. WHAT SHOULD NOT BE THROWN AWAY

Existing shooter mode can remain as:

```text
Arcade / Legacy / Hero Challenge
```

Không cần xóa.

Có thể dùng lại:

- tutorial combat,
- side mode,
- boss duel,
- event mode.

---

# 39. ADMIN REQUIREMENTS

Admin should manage:

- towers,
- costs,
- stats,
- upgrade branches,
- enemy waves,
- boss phases,
- maps,
- relics,
- typing rules,
- gates,
- difficulty modifiers.

No developer-only raw JSON UI as primary admin experience.

---

# 40. TOOLTIP / ADMIN UX

Admin:

- visual cards,
- icons,
- previews,
- hover tooltips,
- no cluttered description blocks.

---

# 41. BALANCING MODEL

Balance metrics:

```text
DPS
Cost efficiency
Range
Crowd control
Boss damage
Wave clear
Economy
Typing dependency
```

---

# 42. DIFFICULTY MODEL

Difficulty should scale:

- enemy composition,
- path complexity,
- typing pressure,
- modifiers,
- boss mechanics.

Not only:

```text
HP × 5
```

---

# 43. RETENTION LOOP

```text
PLAY
↓
EARN
↓
UNLOCK
↓
TRY NEW BUILD
↓
MASTER
↓
CHALLENGE
↓
LEADERBOARD / STAR / COLLECTION
↓
PLAY AGAIN
```

---

# 44. PLAYER TYPES

Design must serve:

### Casual

Wants:

- easy fun,
- visuals,
- offline.

### Strategy

Wants:

- build depth,
- tower synergy.

### Typist

Wants:

- WPM,
- accuracy,
- mastery.

### Collector

Wants:

- unlocks,
- codex,
- skins.

### Social

Wants:

- co-op,
- friends,
- support.

### Hardcore

Wants:

- nightmare,
- endless,
- leaderboard.

---

# 45. DAILY / WEEKLY WITHOUT CHORE

Avoid:

```text
Login every day or lose reward
```

Prefer:

```text
Weekly goal:
Play 3 matches
```

Extra play gives:

- score,
- cosmetic progress,
- leaderboard,
- mastery.

---

# 46. LEADERBOARD

Categories:

```text
Solo
2P
4P
8P
Weekly
Boss
Endless
```

Metrics:

```text
Wave
Score
Accuracy
WPM
Threat control
Core HP
Time
```

---

# 47. SOCIAL FEATURES

Later:

- friends,
- party,
- clan,
- replay,
- spectate,
- build sharing.

---

# 48. REPLAY SYSTEM

Long-term useful.

Store:

- seed,
- builds,
- towers,
- wave results,
- typing stats.

---

# 49. BUILD PRESETS

Players can save:

```text
Fire Build
Boss Build
Support Build
Economy Build
```

---

# 50. ACCESSIBILITY

Options:

- font size,
- typing font,
- colorblind indicators,
- reduced flash,
- reduced shake,
- reduced particles,
- dyslexia-friendly font,
- sound cues.

---

# 51. VIETNAMESE INPUT

Critical:

Typing layer must safely handle:

- Telex,
- VNI,
- EVKey,
- UniKey,
- Chrome IME,
- macOS input.

Do not regress existing Vietnamese typing issues.

---

# 52. LOCALIZATION

UI text independent from typing word bank.

Need:

```text
UI locale
Typing language
```

Example:

```text
UI: Vietnamese
Typing: English
```

---

# 53. ANALYTICS TO TRACK

For design validation:

```text
stage completion
average wave
tower pick rate
tower win rate
relic pick rate
typing accuracy
WPM
boss failure point
core damage
threat peak
session length
retry rate
```

---

# 54. MVP SUCCESS CRITERIA

Prototype passes if:

- users understand loop in < 5 minutes,
- typing feels important,
- tower placement matters,
- player wants to retry,
- at least 2 viable builds,
- boss feels different,
- screen remains readable.

---

# 55. FAILURE CONDITIONS

Need reconsider if:

- typing feels optional,
- towers do all work,
- typing becomes exhausting,
- too many words clutter screen,
- hero feels irrelevant,
- player only upgrades one tower,
- waves feel repetitive.

---

# 56. MAJOR RISKS

## Risk 1 — Scope explosion

Mitigation:

```text
MVP first
```

## Risk 2 — Typing overload

Mitigation:

```text
priority targets only
```

## Risk 3 — Multiplayer complexity

Mitigation:

```text
Solo → 2P → 4P → 8P
```

## Risk 4 — Performance

Mitigation:

```text
pooling + LOD + instancing
```

## Risk 5 — UI clutter

Mitigation:

```text
strict label priority
```

---

# 57. ART PLAN

Need art sets:

```text
Towers
Tower upgrades
Enemy tiers
Boss
Hero
Projectiles
Skill VFX
Core
Gate
Map structures
UI icons
Relics
```

---

# 58. 3D ASSET PLAN

3D models priority:

```text
Hero
Boss
Major towers
Elite enemies
Core
Gate
```

Common swarm enemy can use optimized models.

---

# 59. ANIMATION PLAN

Hero:

- full animation.

Boss:

- full animation.

Tower:

- turret,
- recoil,
- charge,
- overdrive.

Enemy:

- movement,
- attack,
- death,
- status.

---

# 60. CAMERA CINEMATICS

Use sparingly:

```text
Boss intro
Gate opening
Ultimate
Final boss kill
Victory
```

---

# 61. TUTORIAL

Tutorial 10–15 minutes.

Steps:

```text
1. Build tower
2. Enemy wave
3. Type priority word
4. Upgrade
5. Use overdrive
6. Defend Core
7. Boss
```

---

# 62. ONBOARDING

Don't unlock everything immediately.

Suggested:

```text
Stage 1 → Cannon
Stage 2 → Frost
Stage 3 → Arc
Stage 5 → Dragon
```

---

# 63. CAMPAIGN WORLD THEMES

Can reuse:

```text
Celestial
Frost
Infernal
Void
Shadow
Heaven
Forge
Verdant
Meteor
Abyss
```

---

# 64. WORLD-SPECIFIC MECHANICS

Example:

Frost:

```text
ice routes
slow weather
```

Infernal:

```text
lava zones
burning path
```

Void:

```text
teleport gates
```

Verdant:

```text
regeneration
roots
```

---

# 65. ENDLESS ESCALATION

Every N waves:

```text
mutation
elite boost
boss
gate level
modifier
```

---

# 66. BOSS REWARDS

Boss can drop:

- relic,
- cosmetic,
- codex,
- tower branch unlock,
- hero skill.

---

# 67. RANKED FAIRNESS

Ranked should use:

```text
fixed tower unlock pool
or normalized power
```

Avoid account grind advantage.

---

# 68. CUSTOM ROOM CONTROLS

Host can set:

```text
Max players
Active gates
Difficulty
Enemy speed
Enemy HP
Tower limit
Allowed heroes
Typing language
Word level
Pause
Friendly support
```

---

# 69. HOST OPEN-GATE FLOW

UI:

```text
Gate 5 locked
↓
Open?
↓
Preview risk/reward
↓
Vote
↓
Countdown
↓
Portal cinematic
```

---

# 70. THREAT RECOVERY MECHANIC

Threat should decay naturally slightly when:

- enemy count low,
- elite killed,
- wave ended.

Prevents permanent near-loss.

---

# 71. TEAM COMEBACK MECHANICS

Examples:

```text
Emergency artillery
Global freeze
Team repair
Temporary slow
Hero revival
```

Must be limited.

---

# 72. PLAYER CONTRIBUTION SCORE

Do not rank solely by kills.

Track:

```text
Damage
CC
Support
Resource sent
Core repair
Boss break
Typing accuracy
Emergency saves
```

---

# 73. POST-MATCH SCREEN

Show:

```text
Wave
Score
Accuracy
WPM
Tower build
Damage
Hero stats
Threat peak
Core HP
Relics
Contribution
```

---

# 74. MVP UI SCREENS

Need mockups for:

```text
Main menu
Mode select
Campaign map
Loadout
In-game HUD
Tower build
Upgrade popup
Relic choice
Boss HUD
Victory
Defeat
Post-match stats
```

---

# 75. FUTURE MODE IDEAS

After core stable:

```text
Escort
Reverse TD
Boss Rush
PvPvE
Survival
Hero Arena
Typing Raid
```

Not part of MVP.

---

# 76. PvP POSSIBILITY

Possible later:

```text
Player A sends pressure
Player B defends
```

But should not be first multiplayer mode.

---

# 77. CONTENT PIPELINE

Need data editors for:

- waves,
- tower stats,
- relic pools,
- boss phases,
- enemy groups,
- map routes.

---

# 78. TEST STRATEGY

Automated:

```text
wave progression
tower targeting
damage
economy
pathing
typing parsing
save
rulesets
```

Manual:

```text
readability
fun
camera
VFX
boss feel
difficulty
co-op feel
```

---

# 79. PERFORMANCE TEST SCENARIOS

Stress:

```text
300 enemies
60 towers
8 heroes
boss
full VFX
```

Need degrade gracefully.

---

# 80. NETWORK TEST SCENARIOS

Test:

```text
disconnect
reconnect
packet delay
host leave
late join
player transfer
boss sync
resource sync
```

---

# 81. CI / QUALITY GATES

Need:

```text
unit tests
integration tests
build
typecheck
asset validation
wave schema validation
admin schema validation
```

Manual test should not block unrelated coding unless critical.

---

# 82. DOCUMENTS TO CREATE AFTER PLAN APPROVAL

Suggested:

```text
DEFENSE_ARCHITECTURE.md
CORE_DEFENSE_MVP_SPEC.md
MASSIVE_RIFT_MODE_SPEC.md
TOWER_SYSTEM_SPEC.md
TYPING_COMBAT_SPEC.md
HERO_SYSTEM_SPEC.md
BOSS_SYSTEM_SPEC.md
UI_UX_DEFENSE_SPEC.md
DEFENSE_ADMIN_SPEC.md
DEFENSE_TEST_PLAN.md
```

---

# 83. RECOMMENDED FIRST IMPLEMENTATION TARGET

**Vertical Slice 0.1**

One map:

```text
Rainbow Reach Defense
```

Contents:

```text
20 waves
4 towers
8 enemy types
1 dragon hero
1 boss
1 Core
3 typing mechanics
1 relic choice every 5 waves
```

Goal:

```text
15–20 minute complete run
```

---

# 84. VERTICAL SLICE ACCEPTANCE CRITERIA

Must feel:

```text
strategic
readable
responsive
typing-driven
visually satisfying
replayable
```

Reject slice if:

```text
typing feels decorative
```

---

# 85. FINAL PRODUCT PRINCIPLES

## Principle 1

Typing must matter.

## Principle 2

Strategy must matter.

## Principle 3

Hero must matter.

## Principle 4

Build diversity must matter.

## Principle 5

Offline must feel complete.

## Principle 6

Online must feel cooperative, not mandatory.

## Principle 7

Progression must expand choices, not just inflate stats.

## Principle 8

Bosses must be events.

## Principle 9

Visual spectacle must not hurt readability.

## Principle 10

Architecture must support future themes without duplicating gameplay.

---

# 86. FINAL RECOMMENDATION

Recommended direction:

```text
Space Typing
↓
Space Typing Defense ecosystem
↓
Campaign Core Defense
+
Massive Rift Defense
+
Boss Siege
+
Future side modes
```

The highest-priority path should be:

```text
1. Design lock
2. Solo Core Defense MVP
3. Typing integration
4. Hero integration
5. Boss/relic/build depth
6. Campaign
7. Massive mode offline simulation
8. 2P co-op
9. 4P
10. 8P
11. Weekly / Ranked
```

Do **not** begin by building the full 8-player system.

The first question to answer is:

> **Is a 15–20 minute solo Typing Tower Defense run genuinely fun and replayable?**

If yes, the 8-player Massive Rift mode becomes an expansion of a proven core instead of a high-risk rewrite.

---

# 87. REVIEW CHECKLIST

Before implementation, review and approve:

- [ ] Game vision
- [ ] Two main modes
- [ ] Threat Meter rule
- [ ] Core HP rule
- [ ] Typing layers
- [ ] Tower branching model
- [ ] Hero role
- [ ] Roguelite relic system
- [ ] Offline progression
- [ ] Multiplayer progression 1→2→4→8
- [ ] Camera direction
- [ ] Art direction
- [ ] MVP tower list
- [ ] MVP enemy list
- [ ] MVP boss
- [ ] MVP stage length
- [ ] Difficulty philosophy
- [ ] Ranked fairness
- [ ] Admin requirements
- [ ] Migration strategy from current Space Typing
- [ ] Vertical slice acceptance criteria

---

# 88. DECISIONS TO MAKE IN NEXT REVIEW

The next review should answer these questions:

1. Core Defense map should use fixed tower pads, free placement, or hybrid?
2. Hero should be directly movable by click or mostly AI-controlled?
3. Typing should trigger damage directly or mostly buff systems?
4. Should every tower have 3 branches, or only advanced towers?
5. How many towers should be available in the first public build?
6. Massive mode should start with 4 gates or 8 gates visible?
7. Threat capacity should be shared globally or partially per sector?
8. Should host opening a gate require team vote by default?
9. Should offline progression and online progression share the same unlock tree?
10. Should Dragon and Ship be hero themes only, or also change tower/enemy presentation?
11. How much of the current shooter mode should remain as a side mode?
12. Should stage typing language be configurable independently from UI language?
13. What is the target average match length for solo and co-op?
14. Should Endless allow save/resume?
15. Should Weekly Rift use fixed relic choices to maximize fairness?

---

# END OF MASTER PLAN V1

**Recommended next step:** review this document, lock the first vertical slice, then create the technical architecture and implementation roadmap before changing gameplay code.
