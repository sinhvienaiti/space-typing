# DEFENSE TYPING INTERACTION & ATTENTION MASTER V3
## Thiết kế đợt 3 — Làm typing không phá điều phối Tower Defense

**Project:** Typing Game — Defense  
**Document role:** Core UX / Input / Attention / Typing Interaction Design  
**Version:** V3 Draft for Claude Review  
**Date:** 2026-10-22  
**Companion documents:**
- `DEFENSE_GAME_CONTENT_CATALOG_MASTER_V2_2026-10-21.md`
- `DEFENSE_GAMEPLAY_SYSTEMS_MASTER_V2_2026-10-21.md`

---

# 0. VẤN ĐỀ THỰC TẾ ĐÃ PHÁT HIỆN

Qua thử nghiệm, xuất hiện một vấn đề rất nghiêm trọng:

> Khi player bắt đầu typing, player gần như không thể làm việc khác một cách thoải mái.

Trong thời gian typing, player khó hoặc không thể:

- xây Building,
- nâng cấp Building,
- chọn Building khác,
- điều khiển Hero,
- đổi lane,
- dùng chuột để phản ứng,
- kiểm tra Shop,
- ra lệnh cho unit,
- dùng skill,
- quan sát battlefield đầy đủ.

Đây không phải bug UX nhỏ.

Đây là xung đột trực tiếp giữa hai gameplay pillar:

```text
TOWER DEFENSE STRATEGY
        VS
ACTIVE TYPING
```

Nếu xử lý sai, game sẽ trở thành:

```text
Typing Game
→ tạm dừng chơi Tower Defense
→ typing xong
→ quay lại Tower Defense
```

Hai hệ thống sẽ cạnh tranh với nhau thay vì hỗ trợ nhau.

---

# 1. CORE DESIGN CONCLUSION

Không nên cố ép player:

> vừa touch-type liên tục bằng hai tay vừa điều khiển chuột đồng thời.

Đó không phải interaction tự nhiên.

Thiết kế đúng phải là:

> **Rapid Interleaving**

Tức:

```text
OBSERVE
↓
DECIDE
↓
TYPE MỘT BURST NGẮN
↓
EFFECT ĐƯỢC LƯU / DUY TRÌ
↓
PLAYER QUAY LẠI ĐIỀU PHỐI
↓
OBSERVE
...
```

Typing và strategy **luân phiên nhanh**, không chạy cạnh tranh liên tục.

---

# 2. NEW CORE RULE — TYPING MUST NOT HOLD THE PLAYER HOSTAGE

Bất kỳ typing action trong combat cũng phải đáp ứng:

1. Có thể ngắt.
2. Có thể thoát nhanh.
3. Không phạt nặng khi player cần xử lý battlefield.
4. Không auto-steal keyboard focus ngoài dự kiến.
5. Mouse luôn usable.
6. Player có thể ưu tiên strategy thay vì typing.
7. Typing effect phải tiếp tục có giá trị sau khi player ngừng gõ.
8. Combat typing mặc định phải ngắn.
9. Long-form typing chỉ dùng trong safe/low-pressure contexts.
10. Direct Typing events không được spam.

---

# 3. THAY ĐỔI LỚN NHẤT — TỪ CONTINUOUS ASSIST SANG ASSIST BURST

## Cách cũ dễ gây khó chịu

```text
Hero tới Archer
↓
Player phải typing liên tục
↓
Typing dừng = buff dừng
```

Điều này khiến player bị “giam” ở typing UI.

---

## Cách mới đề xuất

```text
Hero tới Archer
↓
Player type 1–3 giây
↓
Game đánh giá performance
↓
Tạo ASSIST CHARGE / BUFF
↓
Buff tồn tại 5–12 giây hoặc X attacks
↓
Player được tự do làm việc khác
```

Đây là **Assist Burst System**.

---

# 4. ASSIST BURST SYSTEM

Một Assist Burst gồm:

1. Hero đã ở đúng Building.
2. Player chủ động activate Assist.
3. Game đưa prompt ngắn.
4. Player type.
5. Prompt kết thúc rất nhanh.
6. Game snapshot performance.
7. Building nhận buff có duration/charges.
8. Typing UI đóng/minimize.
9. Player quay lại strategy.

---

# 5. ASSIST BURST DURATION TARGET

Combat prompt không nên đo bằng số từ cố định.

Nên đo theo **expected completion time**.

Target:

### Quick Burst
0.8–1.5 giây

### Standard Burst
1.5–2.5 giây

### Strong Burst
2.5–4 giây

### Boss/Special
3–6 giây

### Long learning text
chỉ ngoài pressure combat.

---

# 6. ADAPT PROMPT LENGTH THEO PLAYER BASELINE

Ví dụ:

Player A:
- 30 WPM

Player B:
- 100 WPM

Không nên bắt cả hai type cùng một paragraph để nhận cùng buff.

Game nên chọn prompt để target completion time tương đương.

Ví dụ Standard Burst khoảng 2 giây:

Player A:
```text
guard
```

Player B:
```text
guard the eastern gate
```

Cả hai đều dành khoảng thời gian tương đương.

---

# 7. BUFF PERSISTENCE — ĐIỂM QUAN TRỌNG

Sau typing, buff không được biến mất ngay.

Có hai cách chính.

---

## 7.1 Time-based Buff

Ví dụ:

```text
Archer Assist
Excellent
↓
+30% Fire Rate
+20% Crit
Duration: 8 sec
```

Player có 8 giây để:

- xây nhà,
- đổi Hero target,
- dùng skill,
- nâng cấp,
- quan sát.

---

## 7.2 Charge-based Buff

Đây có thể còn tốt hơn.

Ví dụ:

```text
Cannon Assist
Excellent
↓
Next 5 shots:
+35% damage
+25% AoE
```

Player không phải lo game speed.

---

# 8. ĐỀ XUẤT: HYBRID DURATION + CHARGES

Mỗi Building có model phù hợp.

### Archer
buff theo thời gian.

### Cannon
buff theo số shot.

### Mine
buff next harvest cycles.

### Barracks
buff next spawned soldiers.

### Hospital
buff next heal pulses.

### Workshop
buff next craft.

Điều này làm từng Building có identity riêng.

---

# 9. KHÔNG CẦN TYPE LIÊN TỤC ĐỂ GIỮ BUFF

Player có thể type lại để refresh.

Ví dụ:

```text
Assist buff còn 3 sec

Player lựa chọn:
- refresh bây giờ
- bỏ qua
- đi Building khác
```

Không có nghĩa vụ phải giữ 100% uptime.

---

# 10. DIMINISHING RETURNS CHO SPAM ASSIST

Nếu cứ type liên tục một Building là optimal, player lại bị mắc kẹt.

Đề xuất:

Lần 1:
100% Assist value

Lần refresh ngay:
80%

Refresh tiếp:
60%

Sau một thời gian:
reset về 100%.

Điều này khuyến khích Hero Routing.

---

# 11. ASSIST COOLDOWN

Mỗi Building có short Assist cooldown:

Ví dụ:
4–8 giây.

Không phải để punish.

Mục tiêu:

- tránh spam typing,
- cho player thời gian strategy,
- thúc đẩy rotate Building.

---

# 12. ATTENTION LOOP MỤC TIÊU

Một nhịp combat tốt có thể như:

```text
0–3 sec:
observe + build

3–5 sec:
Archer Assist Burst

5–12 sec:
buff active
player moves Hero + upgrades Mine

12–14 sec:
Direct Typing Runner event

14–20 sec:
normal strategy

20–22 sec:
Mine Assist Burst

22–30 sec:
economy buff while player manages map
```

Typing xuất hiện thường xuyên nhưng không chiếm toàn bộ trận.

---

# 13. TARGET ACTIVE TYPING TIME

Default Campaign nên thử:

```text
20–30% thời gian active combat
```

không phải 60–100%.

Ví dụ 60 giây combat:

- 12–18 giây typing
- phần còn lại strategy, observation, building, routing.

Đây là hypothesis cần playtest.

---

# 14. GAMEPLAY PRESET THEO TYPING DENSITY

Có thể cho player chọn.

## Strategy Focus
- 10–20% typing
- buff duration dài
- ít Direct Typing

## Balanced — DEFAULT
- 20–30%
- standard duration

## Learning Focus
- 35–50%
- prompt dài hơn
- có optional slow-time

Không nên balance campaign dựa trên Learning Focus.

---

# 15. INPUT OWNERSHIP SYSTEM

Game cần state rõ ràng.

Proposed:

```text
STRATEGY_FREE
ASSIST_READY
ASSIST_TYPING
DIRECT_TYPING_ALERT
DIRECT_TYPING_ACTIVE
BUILD_PLACEMENT
MENU_MODAL
BOSS_FOCUS_EVENT
PAUSED
```

Không để mọi component tự bắt keyboard.

---

# 16. STRATEGY_FREE STATE

Default.

Player có thể:

- click map,
- chọn Hero,
- xây,
- upgrade,
- dùng skill,
- mở Shop.

Keyboard không tự động gửi vào typing buffer.

---

# 17. ASSIST_READY STATE

Hero đứng ở Building.

UI hiển thị:

```text
Assist Ready
[Click / Enter to Focus]
```

Typing không tự bắt đầu.

Player chủ động activate.

---

# 18. ASSIST_TYPING STATE

Khi player chủ động vào:

- letter keys -> typing buffer
- mouse vẫn hoạt động
- Escape -> cancel
- click battlefield -> suspend/cancel cleanly
- click Building/Skill -> strategy action ưu tiên

Không được chặn mouse.

---

# 19. CLICK OUTSIDE TYPING

Nếu player đang gõ rồi click ra map:

Game lập tức:

1. suspend typing,
2. không tính lỗi,
3. giữ partial progress ngắn hạn hoặc reset prompt nhẹ nhàng,
4. thực hiện mouse command.

Không yêu cầu player bấm nút “Exit Typing”.

---

# 20. PARTIAL PROMPT POLICY

Nếu click interrupt giữa từ:

Option recommended:

- partial word không bị tính lỗi,
- prompt trở về đầu word,
- snapshot progress trước đó vẫn giữ nếu đã hoàn thành từ trước.

Không resume giữa ký tự sau 5 giây vì dễ gây confusion.

---

# 21. COMMAND PREEMPTION

Strategic command luôn có quyền preempt typing.

Priority:

```text
Critical UI / Pause
>
Player Mouse Command
>
Boss Required UI
>
Direct Typing
>
Assist Typing
>
Flavor Typing
```

---

# 22. HERO MOVE WHILE TYPING

Nếu player click Building B trong lúc đang Assist Building A:

Recommended:

1. current completed word được ghi nhận,
2. current incomplete word bỏ qua không penalty,
3. Assist kết thúc,
4. buff snapshot được áp dụng theo performance đã đạt,
5. Hero bắt đầu chạy sang B.

Không bắt player “finish sentence first”.

---

# 23. BUILD WHILE TYPING

Player click Build Spot:

1. typing suspend,
2. build radial/menu mở,
3. player xây,
4. typing session có thể resume nếu còn hợp lệ.

Không khóa build UI.

---

# 24. UPGRADE WHILE TYPING

Same rule:

Mouse click upgrade luôn ưu tiên.

Assist không được chặn.

---

# 25. SKILL WHILE TYPING

Critical Hero skill button click:

- cast ngay,
- typing suspended.

Nếu skill cần target:
- enter targeting mode,
- typing buffer frozen.

---

# 26. HOTKEY CONFLICT RULE

Không nên bind core strategic actions vào letter keys mặc định vì letter keys thuộc typing.

Recommended strategic controls:

- Mouse primary
- configurable function/number/modifier keys
- Escape
- Tab
- mouse side buttons optional

Player có thể remap.

---

# 27. NEVER AUTO-STEAL FOCUS

Direct Typing Enemy xuất hiện không được:

- tự động chuyển keyboard vào prompt,
- xóa text player đang gõ,
- cancel Building placement,
- cướp cursor.

Nó chỉ tạo:

```text
DIRECT TYPING ALERT
```

---

# 28. DIRECT TYPING ALERT

Ví dụ Runner:

```text
⚠ FAST RUNNER
[ freeze ]
2.8s
```

Player có thể:

- click prompt,
- press configurable Focus key,
- ignore.

Nếu ignore:
- towers/Hero vẫn đánh bình thường.

---

# 29. DIRECT TYPING TARGET SELECTION

Nếu nhiều target:

Không được có 8 từ cùng lúc.

Recommended maximum:

```text
1 ACTIVE prompt
1–2 QUEUED alerts
```

Selection:

- click target,
- Tab cycle,
- priority auto-suggest.

---

# 30. DIRECT TYPING SHOULD BE OPTIONAL IN MOST CASES

Ví dụ Runner:

Typing:
- freeze

Không typing:
- vẫn có thể chết bởi tower.

Typing là tactical advantage, không phải mandatory every time.

---

# 31. EXCEPTIONS — REQUIRED DIRECT TYPING

Chỉ một số:

- boss gate mechanic,
- tutorial,
- special challenge,
- learning mission.

Ngay cả khi required:
- telegraph rõ,
- đủ thời gian,
- có difficulty scaling.

---

# 32. DIRECT TYPING PROMPT LENGTH

Combat direct prompt target:

### Runner
0.5–1.5 sec

### Interrupt
0.8–2 sec

### Shield Break
1–2.5 sec

### Boss
2–5 sec

Không dùng paragraph giữa combat bình thường.

---

# 33. DIRECT TYPING TELEGRAPH

Trước prompt có thể có:

```text
0.5–1.0 sec anticipation
```

Ví dụ:

Healer giơ staff
↓
aura charge
↓
prompt appears
↓
typing window

Player đọc được tình huống trước khi gõ.

---

# 34. NO PROMPT COLLISION

Nếu player đang:

- build placement,
- upgrade modal,
- Shop,
- story,
- pause,

Direct Typing event không được auto-focus.

Possible behavior:
- event vẫn diễn ra nếu natural combat,
- hoặc countdown chỉ bắt đầu sau telegraph,
- boss-required interaction có thể suppress modal.

Need per-event design.

---

# 35. DIRECT EVENT PRIORITY

Priority:

1. Boss critical
2. Core-threatening special Enemy
3. Elite
4. Normal special
5. Building Assist
6. Economy flavor

Only highest-priority typing prompt active.

---

# 36. BUILDING ASSIST VS DIRECT ENEMY

Situation:

Player đang gõ Archer Assist.

Healer starts cast.

UI:

```text
HEALER CAST
[ interrupt ]
Press Tab / Click
```

Game không tự chuyển.

Player decides:

### Option A
finish Assist.

### Option B
click/Tab:
- Assist snapshot
- switch prompt
- interrupt Healer.

Agency remains with player.

---

# 37. BOSS TYPING MODE

Boss typing cần treatment riêng.

Không nên xuất hiện liên tục.

Use:

- phase transition,
- shield,
- seal,
- interrupt,
- stagger,
- finisher.

---

# 38. TACTICAL SLOW-MOTION

Slow-motion có thể giải quyết boss/direct focus, nhưng dễ exploit.

Recommended:

## Player-initiated Building Assist
NO automatic slow-motion.

## Normal Direct Enemy
NO slow by default.

## Boss Focus Event
Optional controlled slow:
- 40–70% world speed

## Accessibility / Story Mode
Focus Slow can be enabled.

---

# 39. ANTI-EXPLOIT FOR SLOW-MOTION

Nếu slow-time bật:

- limited to event window,
- not triggered by arbitrary typing,
- cooldowns/world simulation slow together,
- leaderboard/challenge may disable it.

Không cho player spam empty typing state để slow game.

---

# 40. TACTICAL PAUSE OPTION

Single-player có thể hỗ trợ Tactical Pause.

Trong pause player có thể:

- inspect
- build/upgrade if game mode allows
- queue Hero destination
- read Enemy info

Không nhất thiết cho mọi difficulty.

Possible:

### Story
full active pause.

### Normal
pause + inspect; build optional.

### Veteran
limited/no active pause.

---

# 41. BETWEEN-WAVE BUILD PHASE

Phần lớn construction lớn nên thuận tiện nhất giữa wave.

Between waves:

- no typing pressure
- build
- upgrade
- Shop
- research
- inspect next wave

Nhưng mid-wave build vẫn được phép.

---

# 42. QUEUED HERO COMMAND

Một giải pháp rất mạnh:

Trong lúc typing, player click một Building khác.

Game có thể hiển thị:

```text
NEXT COMMAND:
Move to Cannon
```

Khi current word hoàn thành hoặc player release Assist:

Hero bắt đầu move.

Optional setting:

- Immediate
- After Current Word

---

# 43. QUEUED BUILD ACTION

Optional advanced UX:

Player có thể:

- click Build Spot,
- chọn planned Building,
- queue construction.

Nếu resources đủ:
- build immediately after current micro-action.

Tuy nhiên system này không cần Prototype nếu click-to-interrupt đã đủ tốt.

---

# 44. ONE-WORD COMMIT MODEL

Một design rất phù hợp:

Mỗi từ hoàn thành là một atomic commit.

Ví dụ prompt:

```text
guard rapid arrow
```

Player type:

`guard`

→ 1 charge được commit.

Sau đó player click map.

Hai từ còn lại bỏ.

Player vẫn nhận một phần buff.

Điều này làm typing dễ interrupt.

---

# 45. NEVER REQUIRE “FINISH THE PARAGRAPH”

Trong active combat:

Không bắt player hoàn thành toàn paragraph để nhận gì đó.

Reward incremental.

Mỗi:

- word
- short phrase
- micro-sequence

có thể commit progress.

---

# 46. SNAPSHOT SCORE

Assist score được snapshot khi session kết thúc.

Ví dụ:

```text
Words completed: 2
Accuracy: 100%
Speed vs baseline: 112%
Combo: 2

Result:
Excellent Burst
```

Buff được tính ngay.

---

# 47. PERFORMANCE SCORING WHEN INTERRUPTED

Nếu player tự ngắt:

- completed units counted,
- incomplete unit ignored,
- no artificial accuracy penalty.

Nếu player typed wrong:
- real typing error counted.

Clicking to manage strategy không phải lỗi typing.

---

# 48. COMBAT ATTENTION BUDGET

Mỗi 10 giây, game không nên yêu cầu quá nhiều attention switches.

Design budget:

- 0–1 Assist decision
- 0–1 Direct Typing event
- 1 major strategic event

Không nên:

```text
Runner word
+ Healer word
+ Boss phrase
+ Mine prompt
+ Shop popup
```

cùng lúc.

---

# 49. ATTENTION DIRECTOR

Có thể tạo system logic:

`AttentionDirector`

Nhiệm vụ:

- kiểm soát typing-event density,
- tránh prompt collision,
- queue optional alerts,
- suppress low-priority prompts khi Boss event,
- điều chỉnh theo difficulty.

---

# 50. ATTENTION DIRECTOR INPUTS

- current typing state
- number of special enemies
- boss phase
- player menu state
- recent typing duration
- recent strategic actions
- current difficulty

---

# 51. ATTENTION FATIGUE

Game nên theo dõi rolling metric:

```text
typingSecondsLast30s
directEventsLast30s
```

Nếu typing quá dày:
- giảm optional Direct Typing spawn,
- kéo dài Assist buff,
- delay flavor prompts.

Đây là adaptive pacing, không phải adaptive difficulty trực tiếp.

---

# 52. BUILDING-SPECIFIC ASSIST RHYTHM

Không phải Building nào cũng cần same cadence.

## Archer
Short frequent burst.

1–2 sec
→ 6–8 sec buff.

## Cannon
Less frequent.

2 sec
→ next 3–5 shots empowered.

## Mine
Low urgency.

2–3 sec
→ next 2 harvest cycles boosted.

## Barracks
Event-based.

1–2 sec
→ next spawned squad buffed.

## Workshop
Production batch.

2–4 sec
→ next craft improved.

## Hospital
Emergency burst.

1–2 sec
→ next heal pulse stronger.

## Shrine
Longer special.

2–4 sec
→ charge Ultimate / boss interaction.

---

# 53. HERO-SPECIFIC TYPING RHYTHM

Hero cũng có thể thay cadence.

### Engineer
short stable bursts.

### Ranger
fast micro bursts.

### Mage
slightly longer phrase.

### Priest
accuracy-focused steady short phrase.

### Dragon
less frequent, high-impact burst.

---

# 54. ASSIST TOKEN SYSTEM — OPTION

Alternative or complementary.

Typing creates:

```text
Assist Tokens
```

Example:

Excellent word:
+2 Archer Tokens.

Each shot consumes token for bonus.

Advantages:
- no need continuous typing,
- easy UI,
- player can leave Building,
- clear persistence.

Need cap:
e.g. max 5 tokens.

---

# 55. SHOULD BUFF FOLLOW HERO OR BUILDING?

Recommended:

Buff belongs to Building.

Hero can leave.

This is essential.

Otherwise routing becomes punished.

---

# 56. HERO DEPARTURE RULE

Hero leaves Building:

- active Assist charges remain,
- no new charges generated,
- unique aura requiring Hero may stop.

Separate:

### Snapshot Buff
persists.

### Presence Aura
stops.

Keep both types visually distinct.

---

# 57. BUILDING ASSIST START SHOULD BE MANUAL

Hero arriving does not auto-open typing UI.

Player may simply move Hero there for:

- combat,
- aura,
- future preparation.

Assist typing is explicit action.

---

# 58. “TYPE NOW” INDICATOR

When Assist is useful:

small indicator:

```text
Assist Ready
+ Cannon charge available
```

No flashing unless urgent.

---

# 59. DIRECT TYPING TARGET VISUAL LANGUAGE

Special target must be immediately distinct.

Use:

- small rune/icon
- outline
- prompt panel
- timer ring if timed

Do not show giant floating text on every Enemy.

---

# 60. HP BAR REMAINS PRIMARY

Even Direct Typing Enemy:

```text
[anchor]
Enemy
HP ███████
```

Typing prompt is a mechanic overlay.

HP remains combat truth.

---

# 61. MOBILE / TOUCH FUTURE

Architecture should allow:

- tap typing prompt
- virtual/connected keyboard
- tap Building
- touch build

But desktop keyboard+mouse is priority.

---

# 62. CONTROLLER FUTURE

Typing naturally requires keyboard.

Controller support may allow:
- strategy-only assist mode,
- alternative command mechanic.

Not MVP.

---

# 63. UI LAYOUT PROPOSAL

Bottom-center:
Typing Focus panel.

Bottom/side:
Hero skills.

Top:
wave/boss HP.

Map:
minimal special prompt marker.

When not typing:
Typing panel collapses.

---

# 64. TYPING PANEL STATES

## Hidden
no action.

## Ready
small prompt icon.

## Active
text + accuracy.

## Suspended
dimmed.

## Completed
brief result.

Should transition fast.

---

# 65. RESULT FEEDBACK

After burst:

```text
EXCELLENT
Archer Overdrive
8s
```

Display <= 1 sec.

Do not cover gameplay.

---

# 66. AUDIO CUES

Need subtle cues:

- Assist ready
- Direct target alert
- Direct target urgent
- typing success
- Overdrive
- typing suspended

Audio helps player avoid staring at UI.

---

# 67. PLAYER SHOULD NOT HAVE TO WATCH TYPING PANEL AND MAP AT SAME TIME

While actively typing:
panel should be clear and centrally readable.

Since burst is short:
player temporarily focuses on text.

Then immediately returns to map.

This is better than expecting split attention.

---

# 68. LONG-FORM TYPING LOCATIONS

Longer typing belongs:

- between waves
- Library
- training
- story
- research
- optional challenge
- calm economy phase

Not during heavy battlefield micro.

---

# 69. LEARNING DESIGN CONSEQUENCE

Learning content must be divided by attention cost.

### Low Attention
short vocabulary
combat suitable.

### Medium
phrases
Assist/Boss suitable.

### High
sentence/grammar/listening comprehension
safe phase.

---

# 70. COMBAT PROMPT CONTENT

Combat words should:

- be readable quickly,
- not be unnecessarily long,
- fit player learning level,
- avoid unexpected punctuation early.

Learning still occurs via repetition.

---

# 71. BETWEEN-WAVE LEARNING

This is where deeper content can live.

Example:

- review 3 weak words
- sentence pattern
- listening
- grammar mini-task

Reward:
- temporary perk
- Knowledge
- optional bonus

Player can skip if desired.

---

# 72. BOSS FOCUS EVENT — UX SEQUENCE

Example:

1. Boss raises shield.
2. Combat continues briefly.
3. 1 sec telegraph.
4. UI announces:
   `ARCANE SEAL`
5. Player chooses:
   - activate Shrine typing,
   - keep fighting shield.
6. If typing chosen:
   world may slow in Normal.
7. 2–4 sec phrase.
8. Success:
   shield break.
9. UI collapses.
10. Full strategy control returns.

---

# 73. BOSS TYPING MUST NOT ARRIVE WHILE PLAYER IS IN RANDOM BUILD MENU WITHOUT WARNING

Boss mechanic should have telegraph.

Player should know:

```text
Seal in 5s
```

Enough to finish strategic action.

---

# 74. SPECIAL ENEMY SPAWN BUDGET

Do not spawn 5 typing-reactive enemies simultaneously.

Suggested:

Normal:
max 1 active Direct Typing target.

Higher difficulty:
2 alerts possible, but one typing focus.

---

# 75. DIFFICULTY EFFECT ON TYPING UX

Difficulty may change:

- prompt time window
- event frequency
- buff persistence
- telegraph

But should not suddenly:
- make text unreadable,
- steal focus,
- add fake input errors.

---

# 76. STORY MODE

Possible:

- longer telegraph
- Focus Slow
- longer buff duration
- lower Direct Typing frequency
- Tactical Pause

---

# 77. NORMAL MODE

Default intended experience:

- no slow for normal Assist
- short burst
- optional Direct Typing
- boss controlled slow only if needed
- mouse interruption always available

---

# 78. VETERAN MODE

Possible:

- shorter Direct windows
- shorter buff duration
- no Focus Slow
- more tactical pressure

Still no input-lock frustration.

---

# 79. LEARNING MODE

Optional:

- more typing
- longer prompt
- stronger typing rewards
- slower battlefield during focus

Not baseline balance target.

---

# 80. PAUSE & ACTIVE PAUSE

Single-player game can support pause without shame.

Pause is UX tool.

Potential:

- inspect map
- inspect stats
- read enemy tooltip

Optional Active Pause:
- queue Hero move
- select upgrade
- build

Challenge modes may disable.

---

# 81. WHY “MOUSE STILL WORKS” ALONE IS NOT ENOUGH

Even if code lets mouse click while typing:

- player physically uses both hands to type,
- moving hand to mouse breaks flow,
- player loses accuracy,
- attention splits.

Therefore solution must be:

```text
short typing
+
persistent result
+
clean interruption
```

not just “enable mouse input”.

---

# 82. WHY CONTINUOUS WPM BUFF IS RISKY

Continuous formula:

```text
current WPM → live tower fire rate
```

forces player to type nonstop.

Recommended replacement:

```text
burst performance
→ snapshot tier
→ temporary/charged buff
```

Can still visually show WPM, but WPM not live leash.

---

# 83. PERFORMANCE TIERS

Example:

### Stable
basic buff.

### Good
strong buff.

### Excellent
stronger + secondary effect.

### Perfect
Overdrive chance/charge.

Avoid precise microscopic stat updates every keystroke.

---

# 84. ASSIST REWARD EXAMPLE — ARCHER

Prompt:
`swift arrow`

Player result:
- 98% accuracy
- 108% baseline speed

Output:

```text
EXCELLENT ASSIST

8 sec:
+25% attack speed
+15% crit

Next 3 attacks:
Multishot
```

Player immediately goes back to map.

---

# 85. ASSIST REWARD EXAMPLE — MINE

Prompt:
`harvest`

Output:

```text
GOOD ASSIST

Next 2 cycles:
+30% Gold

Perfect bonus:
+1 bonus Gold packet
```

No need stay typing.

---

# 86. DIRECT ENEMY EXAMPLE — RUNNER

Runner appears.

Normal HP:
300.

Towers can kill it.

Direct prompt:
`halt`

Player types in 1 sec.

Effect:
- 3 sec root
- 20 direct damage optional.

Then player returns to map.

---

# 87. DIRECT ENEMY EXAMPLE — HEALER

Healer channels.

Prompt:
`break`

Player ignores:
heal succeeds.

Player types:
cast interrupted.

No requirement to kill Healer via typing.

---

# 88. DIRECT ENEMY EXAMPLE — TELEPORTER

Prompt only during channel:

`anchor`

Success:
cancel teleport.

Failure:
teleport happens.

HP remains.

---

# 89. BUILD PHASE + TYPING

Between waves, optional typing can be longer.

Example Mine preparation:
type 10–15 sec training sequence
→ next wave starts with economy bonus.

This is optional.

---

# 90. PRE-WAVE PREPARATION CHARGE

Potential mechanic:

Before wave starts, player can charge ONE Building via longer typing.

Example:
- Archer preloaded volley
- Mine prepared harvest
- Shrine charge

This lets learning content exist without combat input conflict.

---

# 91. “ONE MAJOR TYPING TASK AT A TIME” RULE

Global invariant:

```text
activeTypingOwner <= 1
```

Possible owners:
- Assist
- Direct Enemy
- Boss
- Learning Event

Never two simultaneous buffers.

---

# 92. TYPING FOCUS MANAGER

Technical component proposal:

`TypingFocusManager`

Responsibilities:

- current owner
- input routing
- suspend/resume
- priority
- no auto-steal
- interrupt reasons
- partial progress
- mouse preemption

---

# 93. ATTENTION DIRECTOR VS TYPING FOCUS MANAGER

Different systems.

### TypingFocusManager
Who owns keyboard **now**?

### AttentionDirector
Should a new typing event be allowed to appear **now**?

Keep separate.

---

# 94. STATE TRANSITION EXAMPLE

```text
STRATEGY_FREE
↓ click Assist
ASSIST_TYPING
↓ click Build Spot
BUILD_PLACEMENT
↓ build complete
STRATEGY_FREE
```

Assist result:
completed units snapshot before transition.

---

# 95. DIRECT ALERT TRANSITION

```text
STRATEGY_FREE
↓ Runner enters trigger
DIRECT_TYPING_ALERT
↓ player clicks alert
DIRECT_TYPING_ACTIVE
↓ success
STRATEGY_FREE
```

If ignored:

```text
DIRECT_TYPING_ALERT
↓ timeout
STRATEGY_FREE
```

---

# 96. ASSIST + ALERT TRANSITION

```text
ASSIST_TYPING
↓ Healer alert
ASSIST_TYPING + ALERT_VISIBLE
↓ player presses Tab
snapshot Assist
↓
DIRECT_TYPING_ACTIVE
↓ success
STRATEGY_FREE
```

---

# 97. NEVER HIDE CRITICAL BATTLEFIELD STATE DURING TYPING

While Typing UI active, still visible:

- Core HP
- Boss HP
- wave warning
- Hero HP
- critical Building alert

No full-screen typing panel during combat.

---

# 98. CAMERA WHILE TYPING

Do not force cinematic camera movement during ordinary Assist.

Keep camera stable.

Direct target:
optional subtle highlight only.

Boss:
controlled camera event before typing, then stable during typing.

---

# 99. CAMERA SHAKE

Reduce during typing focus.

Heavy shake can make text hard to read.

---

# 100. VFX DENSITY DURING TYPING

Option:

When typing active:
- critical VFX unchanged,
- decorative particles reduced slightly near text UI.

Do not dim battlefield excessively.

---

# 101. AUTONOMOUS DEFENSE SAFETY NET

Typing should amplify.

Player should survive reasonable moments without typing.

This lets player:

- build,
- think,
- inspect,
- recover.

If not typing for 10 sec instantly causes loss, strategy layer is fake.

---

# 102. TYPING AS DECISION, NOT CHORE

Good question:

> “Where should I spend my next 2 seconds of typing?”

Bad question:

> “How can I keep typing nonstop so my towers continue working?”

---

# 103. HERO ROUTING SYNERGY

New loop:

```text
Move Hero
↓
Arrive
↓
Short Assist Burst
↓
Leave persistent Building charge
↓
Move to next strategic point
```

This actually makes Hero Routing stronger.

---

# 104. MULTIPLE HERO FUTURE

If later multiple Heroes exist:

Do not allow multiple simultaneous typing sessions.

Typing applies only to selected active Hero.

Other Hero:
- autonomous behavior
- queued command.

---

# 105. AUTO-ASSIST OPTION

Accessibility option:

Hero at Building can provide weak passive bonus without typing.

Typing provides stronger snapshot charge.

This keeps game playable for:
- fatigue
- accessibility
- strategy-first player.

---

# 106. TYPO RECOVERY

Combat prompt:

- wrong key marked
- correction allowed
- no artificial lockout

For Direct Typing:
time continues naturally.

For Assist:
no harsh timer unless explicitly designed.

---

# 107. IME / VIETNAMESE INPUT SAFETY

Given existing project history with Vietnamese IME:

TypingFocusManager must be IME-aware.

Need:
- composition events
- no premature key validation
- no strategic hotkey firing during IME composition
- test EVKey/Unikey/macOS input

Even if initial learning language is English, input architecture should not break IME.

---

# 108. KEY REPEAT / SYSTEM SHORTCUT SAFETY

Avoid:
- intercepting Cmd/Ctrl shortcuts unexpectedly
- browser shortcuts
- accessibility shortcuts

Only capture typing keys when explicit focus active.

---

# 109. BROWSER FOCUS

If web game:

Typing starts only after game canvas/app has valid focus.

Clicking UI outside typing panel must route correctly.

---

# 110. PLAYER FEEDBACK FOR SUSPEND

When strategy action interrupts typing:

small message:

```text
Assist paused — no penalty
```

Do not use alarming red error state.

---

# 111. BUFF UI

Building should show small ring/charges:

```text
Archer
Assist: 6s
```

or:

```text
Cannon
Empowered Shots: 3
```

Player understands typing effect continues.

---

# 112. HERO PATH UI

After typing burst, clicking next Building:

show Hero path.

No need reopen typing panel until arrival.

---

# 113. CLICK TARGET WHILE TYPING

If player clicks Enemy:

- select Enemy normally,
- typing Assist suspends.

If Enemy has Direct Typing:
- click prompt specifically to enter Direct mode.

Selecting Enemy alone should not steal keyboard.

---

# 114. MAX PROMPT DURATION IN ACTIVE WAVE

Recommended default hard ceiling:

Routine Assist:
<= 4 sec expected.

Routine Direct:
<= 3 sec.

Boss:
<= 6 sec.

Anything longer:
safe phase only.

---

# 115. MAX TYPING DENSITY

Starting guardrail:

In rolling 20 sec:

- routine typing target <= 8 sec in Balanced mode.

AttentionDirector can postpone optional events beyond that.

---

# 116. SPECIAL “FOCUS WINDOW” REWARD

Instead of making typing mandatory constantly, game can create explicit moments:

```text
FOCUS WINDOW
3 sec
```

Player knows:
now is a good time to type.

After:
return strategy.

Clear rhythm reduces stress.

---

# 117. SAFE WINDOW DETECTION — OPTIONAL ADVANCED

Game could detect:

- low threat nearby
- no critical Building
- no Boss cast

and recommend Assist.

Do not auto-start it.

---

# 118. PLAYER-CREATED SAFE WINDOW

Strong strategy can create time to type.

Example:
- Barracks blocks lane
- Ice slows wave

This creates natural synergy:

> better defense → more safe typing opportunities.

Very desirable.

---

# 119. TYPING REWARD SHOULD COMPENSATE ATTENTION COST

If player spends 2 sec not micromanaging map, reward must be noticeable.

Weak +3% buff will feel pointless.

Assist should create clear impact.

---

# 120. BUT TYPING MUST NOT BE MANDATORY FOR BASIC FUNCTION

Target:

No typing:
- viable at lower/default difficulty with good strategy.

Good typing:
- meaningful advantage,
- higher score,
- faster progression,
- stronger control.

Higher modes may require more mastery.

---

# 121. SCORING

Score can reward:

- typing performance
- strategic efficiency
- Building survival
- resource efficiency
- optional objectives

Do not rank solely by WPM.

---

# 122. LEADERBOARD FAIRNESS

If leaderboards exist:

Separate:
- Focus Slow enabled
- no slow
- accessibility modifiers

Or score normalize appropriately.

Not MVP concern.

---

# 123. TEST MATRIX

Prototype must test:

## Scenario A
Typing Archer while needing to build.

## Scenario B
Direct Runner alert during Assist.

## Scenario C
Boss prompt while Shop open.

## Scenario D
Hero move command mid-word.

## Scenario E
Typing fatigue after 5 minutes.

## Scenario F
Slow typist.

## Scenario G
Very fast typist.

## Scenario H
Mouse-heavy player.

## Scenario I
keyboard shortcut user.

## Scenario J
IME active.

---

# 124. METRICS TO COLLECT

- % combat time typing
- average Assist Burst length
- average buff uptime
- number of manual interruptions
- Direct event ignore rate
- Direct success rate
- number of simultaneous alerts
- build actions during/after typing
- Hero idle time
- player typing accuracy
- loss causes

---

# 125. UX FAILURE SIGNALS

Red flags:

- player says “I can’t do anything while typing”
- Hero sits at one Building too long
- player ignores building system to keep typing
- player ignores typing to play strategy
- too many prompts on screen
- frequent accidental keyboard capture
- clicking strategy counts as typing failure
- player waits for typing to end before acting

Any of these means V3 design is not correctly implemented.

---

# 126. PROTOTYPE IMPLEMENTATION ORDER

## P1
Input ownership + mouse preemption.

## P2
Assist Burst + snapshot result.

## P3
Persistent Building charges/buffs.

## P4
Direct Typing Alert, no focus steal.

## P5
One active Direct target.

## P6
AttentionDirector basic cooldown.

## P7
Boss Focus Event.

## P8
Difficulty/accessibility Focus Slow.

---

# 127. PROTOTYPE BUILDINGS FOR V3 TEST

Use:

### Archer
time buff.

### Cannon
shot charges.

### Mine
harvest charges.

This tests 3 persistence models.

---

# 128. PROTOTYPE DIRECT ENEMIES

Use only:

### Runner
typing -> root.

### Healer
typing -> interrupt.

This is enough to validate selective direct typing.

---

# 129. PROTOTYPE BOSS EVENT

Boss at 60% HP:

- shield activates
- 3 sec telegraph
- player may click Shrine
- short phrase
- shield breaks

Test whether this disrupts strategy.

---

# 130. ACCEPTANCE CRITERIA

V3 passes only if:

1. Player can interrupt typing instantly.
2. Mouse command always works.
3. Player does not need continuous typing.
4. Building buff persists after typing.
5. Hero can route away without losing all value.
6. Direct prompt never steals focus unexpectedly.
7. Max one active typing owner.
8. Special Enemy prompt feels notable, not spammy.
9. Player can build mid-wave comfortably.
10. Boss typing does not hide Boss HP.
11. Slow and fast typists receive fair interaction time.
12. Combat remains readable.
13. Typing feels powerful.
14. Strategy remains primary.
15. Player does not feel trapped.

---

# 131. RECOMMENDED DEFAULT V3 MODEL

The strongest current proposal:

```text
BUILDING ASSIST
= user-initiated micro typing burst
= 1–3 sec
= snapshot result
= persistent buff/charges
= immediate return to strategy
```

```text
DIRECT ENEMY TYPING
= optional special tactical prompt
= 0.5–3 sec
= max one active
= never auto-steals focus
```

```text
BOSS TYPING
= rare focus mechanic
= 2–6 sec
= heavily telegraphed
= optional controlled slow in default/accessibility mode
```

```text
LONG TYPING
= between waves / research / learning / story
```

---

# 132. WHY THIS MODEL FITS THE GAME

It preserves all major pillars:

### Tower Defense
Player still builds and manages.

### Hero Routing
Hero moves frequently instead of camping.

### Typing
Still frequent and meaningful.

### Learning
Short combat repetition + deeper safe-phase content.

### Special Direct Typing
Space Typing DNA remains.

### UX
Player never loses agency for long.

---

# 133. CLAUDE REVIEW REQUIREMENTS

Claude should review this as:

- Senior Game UX Designer
- Input Systems Designer
- Tower Defense Designer
- Typing Game Designer
- Learning Game Designer

Must answer:

1. Is Assist Burst better than continuous Assist?
2. Should buffs be duration-, charge-, or hybrid-based?
3. Ideal active typing percentage?
4. Ideal burst duration?
5. Should click interrupt immediately or after current word?
6. Should partial word reset?
7. Should Direct Typing be opt-in?
8. Is one active Direct target enough?
9. Should Normal mode use Focus Slow?
10. Should Tactical Pause allow building?
11. How to prevent slow-motion exploit?
12. How to structure AttentionDirector?
13. Which controls should remain available during typing?
14. How to handle Hero commands while typing?
15. How to handle Boss typing without frustration?
16. What should be removed from this proposal?
17. What interaction patterns are still missing?

---

# 134. REQUIRED CLAUDE OUTPUT

Create:

`DEFENSE_TYPING_INTERACTION_ATTENTION_V3_1_REVIEW.md`

Include:

- overall score
- core UX critique
- revised input ownership model
- revised Assist Burst model
- revised Direct Typing model
- revised Boss typing model
- attention budget
- state machine
- control mapping
- prototype spec
- test plan
- risk list
- V3.1 final recommendation

Do not begin large implementation before this review.
