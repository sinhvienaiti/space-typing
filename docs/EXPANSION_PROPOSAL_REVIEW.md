# Đánh giá đề xuất "1000 Stage Expansion" (Claude, 29/09/2026)

> **Dành cho:** chủ dự án và AI lập trình (Codex, Claude) sẽ triển khai.
>
> **Đánh giá dựa trên:** mã thật của nhánh `feat/bgv-integration-current`, commit `996be26`, đối chiếu với tài liệu `SPACE_TYPING_1000_STAGE_EXPANSION_MASTER_PROPOSAL.md` (Codex viết).
>
> **Chưa triển khai gì.** Đây là bản đánh giá và lộ trình đề xuất.

## 1. Kết luận ngắn

- **Hướng đi đúng.** Đề xuất đặt đúng các nguyên tắc: nhân nội dung bằng các hệ thống kết hợp với nhau (không tự tay làm 1000 màn), gõ phím luôn là trung tâm, chữ dễ đọc quan trọng hơn hiệu ứng, mức đồ hoạ (Low → Ultra) không được đổi lối chơi. Tôi đồng ý với các nguyên tắc này.
- **Nhưng không nên triển khai nguyên văn.** Đề xuất viết như thể game chưa có gì. Thực tế **7/10 đề xuất đã có bản sơ khai trong mã** (bảng ở mục 2). Làm thêm các hệ thống song song sẽ trùng lặp và làm `Game.ts` (11.026 dòng) phình thêm. Vài chỗ còn không khớp với mã: nhắc tới React (game không dùng React), và đặt tên trùng với tính năng đang có ("Anomaly", "Overdrive").
- **Nguyên nhân chơi lâu thấy chán, theo mã hiện tại:**
  1. Nhiều thứ đa dạng **đã có nhưng người chơi không thấy**. Ví dụ: biến thể màn (Ion Storm, Solar Flare…) chỉ đổi con số và hiện bằng nhãn chữ nhỏ `EVENT // …`. Quái tinh anh chỉ có thêm vài chấm nhỏ dưới thân.
  2. **Thứ phải gõ không đổi dạng.** Từ màn 1 tới màn 1000 vẫn là mỗi quái một từ.
  3. **Ít quyết định có ý nghĩa.** Relic, perk, synergy chủ yếu tự đến. Người chơi hiếm khi phải chọn.
  4. **Không có chế độ chơi lại theo lượt.** Chiến dịch 1000 màn chỉ đi một lần (Ascension là đi lại cùng tuyến).
- **Đề nghị:** triển khai theo lộ trình ở mục 12. Chuyển tinh thần từ "xây mới" sang "**nâng cấp và hợp nhất cái đã có**". Làm trước một bước nền bắt buộc (luồng sự kiện chiến đấu, mục 7). Bổ sung 4 ý đề xuất còn thiếu (mục 14): **đa dạng dạng gõ**, **chọn build 1 trong 3**, **chế độ Expedition chơi lại**, **đưa việc học từ vựng vào tiến trình**.

## 2. Hiện trạng: đề xuất nào đã có gì trong mã

| # | Đề xuất | Đã có trong mã | Còn thiếu |
|---|---|---|---|
| 01 | Stage Anomaly | `events/stage-scheduler.ts` (5 sự kiện ngẫu nhiên: fast-enemies, armored-enemies, low-shield, double-supply, projectile-storm), `events/galaxy-hazards.ts` (7 biến thể: ion-storm, solar-flare, gravity-tide, debris-field…). Dữ liệu đã khai báo sẵn (`StageEventDefinition` có `minStage`, `weight`, `effect`). | Luật chơi thật, hình ảnh, âm thanh, thẻ tương thích. Hiện chỉ là hệ số nhân và nhãn `EVENT // …` (`main.ts renderStageEvents`). **Tên "Anomaly" đã dùng** cho hòm dị thường (`events/anomaly.ts`, chọn stabilize/overload). |
| 02 | Enemy Affix | `enemies/elite.ts`: 4 biến thể tinh anh (swift, armored, frenzy, volatile), chỉ đổi số. 14 loại quái đã có hành vi riêng: splitter tách đôi, leech hút năng lượng, cloaker tàng hình, commander chỉ huy, carrier gọi quân, shield có khiên. 12 kỹ năng quái, ngân sách đe doạ (`enemies/threat.ts`). | Biến thể có hành vi và hình ảnh. **5/10 affix đề xuất trùng loại quái đã có** (Splitter, Leech, Cloaked, Commander, Summoner). |
| 03 | Typing Build & Synergy | 6 relic kích hoạt theo cách gõ (`relics/registry.ts`): Storm Script (từ hoàn hảo phóng sét sang 3 quái, chính là "Perfect Storm"), Frost Rhythm (chuỗi 20 đóng băng quái), Giant Word Lens (từ 8+ chữ), Mirror Vow (gõ sai không mất chuỗi). 3 synergy (`synergy/build.ts`), 21 đặc tính trang bị (`equipment/perks.ts`), nội tại của 11 phi thuyền. | Một đường xử lý chung: khoảng 40 điểm kích hoạt đang viết rải rác trong `Game.ts` (`applyCharacter…`, `applyRelic…`, `applyPerk…`). Cách **nhận** build (chọn lựa). Giao diện "khám phá synergy". |
| 04 | Evolution / Awakening | Trang bị có cấp độ hiếm, cường hoá, tiến hoá (`equipment/loadout.ts`) và Mk.I–III. Kỹ năng có hạng và mastery (`progression/basic-skills.ts`). Mỗi tàu có tuyệt chiêu Rage với hiệu ứng riêng (`Game.playUltimateFx`). | Tiến hoá **đạn** của phi thuyền (`vfx/player-shots.ts` đã có hồ sơ riêng từng tàu). "Awakening" gần như chính là tuyệt chiêu Rage. |
| 05 | Space Events | Lộ trình rẽ nhánh (`campaign/route.ts`, 3 loại nút: combat, shop, station), điểm nghỉ, 5 loại cửa hàng (có chợ đen), nội dung ẩn (`discovery/`), hòm chọn thưởng, hòm dị thường. | Nút "sự kiện" có lựa chọn và chuỗi sự kiện nhiều màn. |
| 06 | Cinematic Events | Nền WebGL (`background/`), vật thể lớn bay ngang (cá voi, tàu), mưa sao băng, hồ sơ cảnh theo World. | Bộ điều phối theo thời gian gắn với trận. **Nền còn 3 lỗi hiệu năng chưa sửa** (P3, P4, P6 trong `docs/PERFORMANCE_ROOT_CAUSE_REVIEW_2026-09-29.md`). |
| 07 | Boss 2.0 | `boss/typing-mechanics.ts`: interrupt-charge (chiêu cuối có thể ngắt), shield-sequence, weak-point, rapid-rage (pha cuồng nộ), accuracy-curse. 3 pha, choáng. Bản sắc 26 boss, kiểu bắn, màn xuất hiện và tử trận (`boss/identity.ts`, `vfx/combat-fx.ts`). | **Bộ phận nhắm được** (engine, core, cannon): hiện boss chỉ có một từ tại một thời điểm. |
| 08 | Flow / Overdrive | Chuỗi gõ và hệ số nhân (`multiplierForStreak`), Rage 0–100, trạng thái `combo-protected`, relic Mirror Vow. Nhạc có 2 lớp calm và intense, có trạng thái `WORLD_INTENSE` (`audio/MusicController.ts`). | Bậc Flow nhìn thấy được, và nối bậc với nhạc. **Tên "Overdrive" đã là tuyệt chiêu Rage** (`activateOverdrive`, "Nova Overdrive"). |
| 09 | Adaptive Director | `campaign/adaptive-profile.ts` (WPM và độ chính xác làm mượt qua các màn, có lưu), `campaign/difficulty.ts`, `campaign/active-pressure.ts` (áp lực gõ trong trận quyết định có cho thêm quái hay không). | Chỉ số Threat Level cho người chơi thấy, và điều chỉnh chậm ngay trong trận. |
| 10 | Meta / Collection | Codex (world, enemy, boss, reward), tỉ lệ sưu tầm (`progression/meta.ts`), 5 nhiệm vụ, 6 thành tựu, Ascension, 6 nội dung ẩn. Sự kiện học gửi lên Portal (`learning/shared.ts`, có bộ từ cần ôn), trí nhớ Recall (`recall/model.ts`). | Kho từ vựng trong game, mục tiêu mastery, chuỗi bí mật. |

Các điểm kiến trúc khác:
- **Không dùng React:** TypeScript thuần + DOM trong `main.ts` (8.817 dòng). Các lo ngại về React re-render trong đề xuất không áp dụng. Thay vào đó cần tránh ghi DOM ở mỗi khung hình (HUD cập nhật qua hook `onStats`, `onSkills`… đã có giãn nhịp).
- `Game.ts` là lớp trung tâm khoảng 436 hàm, sở hữu toàn bộ trạng thái trận.
- **Test Lab dùng đúng mã thật** (các hàm `testLab…` trên `Game`, cộng catalog QA mới). Đây là nền tốt để thử mọi hệ thống mới.
- Kiểm thử: 167 file, 945 bài. Có các script đo hình và tiếng (`scripts/visual/evals/`).

## 3. Đánh giá từng đề xuất

**Ký hiệu:** **Làm** = làm như đề xuất (có thể chỉnh nhỏ). **Làm có chỉnh** = làm nhưng đổi cách. **Gộp** = nhập vào hệ thống đã có. **Hoãn** = để sau.

### 01 Stage Anomaly → **Làm có chỉnh** (ưu tiên cao)
- **Đổi tên** thành *Sector Conditions* (điều kiện khu vực), để không trùng hòm dị thường.
- **Nâng cấp `StageEventDefinition`, không tạo hệ thống mới.** Thêm các trường: `tags`, `incompatible`, `rules` (luật chơi thật), `visual`, `audio`, `briefing`. Các biến thể đang có (solar-flare, gravity-tide…) trở thành bản đầy đủ.
- **Bản thử (MVP) 4 điều kiện:**
  - Solar Storm: nâng cấp solar-flare. Có nhịp xung năng lượng; gõ hoàn hảo đúng lúc xung thì được thêm năng lượng.
  - Meteor Shower: dùng lại mưa sao băng của nền. Có thiên thạch được đánh dấu để bắn lấy thưởng.
  - Gravity Well: nâng cấp gravity-tide, dùng lại hình hố đen của kỹ năng Singularity. Quái nhẹ bị kéo lệch, quái nặng thì không.
  - Time Fracture: vùng chậm và vùng nhanh.
- **Bắt buộc có thẻ giới thiệu trước màn và thông báo giữa màn** (dùng lại thẻ tên boss). Nếu không có, người chơi lại không thấy gì như hiện nay.
- Hoãn *Word Corruption* và *Lost Signal*: chúng làm hại việc học.

### 02 Enemy Affix → **Gộp** vào biến thể tinh anh (`enemies/elite.ts`)
- Giữ 4 biến thể cũ và **cho chúng hình ảnh** (vòng, dấu hiệu, tiếng).
- Chỉ thêm affix có **hành vi chưa loại quái nào có**:
  - Chrono: nhanh lên khi người chơi ngừng gõ.
  - Guardian: che chắn đồng đội ở gần.
  - Berserker: nhanh lên khi đến gần tàu.
  - Phase: nhảy làn.
  - Anchored: miễn bị kéo và bị choáng.
- **Quy tắc: affix không được lặp lại loại quái.** Không làm affix Splitter, Leech, Cloaked, Commander, Summoner. Muốn tinh anh của các loại này thì cho xuất hiện "biến thể tinh anh của loại đó".
- Bảng số affix theo màn trong đề xuất (0–1 ở màn 1–100 … 2–3 ở màn 851–1000) dùng được. Nên tính bằng ngân sách đe doạ có sẵn (`enemies/threat.ts`), không làm bảng riêng.

### 03 Typing Build & Synergy → **Làm có chỉnh** (ưu tiên cao)
- Các nhánh build đề xuất (Precision, Combo, Long Word, Recall) **đã có dạng relic**. Việc cần làm thật:
  1. **Đường xử lý chung** cho mọi điểm kích hoạt (mục 7).
  2. **Cách nhận build:** chọn 1 trong 3 (mục 14).
  3. **Mở rộng kho relic** lên khoảng 24 món chia 4 nhánh, kèm 2–3 synergy lộ ra khi khám phá được.
- Speed Build: tính theo **WPM của chính người chơi** (lấy từ adaptive profile), không theo ngưỡng tuyệt đối.
- Vocabulary Build (danh từ → khiên, động từ → tên lửa): **Hoãn**. Từ trong trận chưa mang loại từ. `vocabulary.ts` có nhóm theo loại từ, nên gắn được lúc nạp, nhưng cần kiểm dữ liệu trước.

### 04 Evolution / Awakening → **Gộp**
- Evolution = Mk.I–III + cấp độ hiếm + hạng kỹ năng (đã có). Chỉ thêm một thứ mới: **đạn phi thuyền tiến hoá** theo mốc (mở rộng `player-shots`).
- Awakening = **trạng thái hình ảnh của tuyệt chiêu Rage** (kéo dài, biến hình tàu). Không làm trạng thái thứ hai song song.

### 05 Space Events → **Làm sau** (Phase 4, đi cùng chế độ Expedition)
- Thêm loại nút `event` vào `route.ts`. Sự kiện khai báo bằng dữ liệu: yêu cầu, lựa chọn, kết quả, cờ.
- Cờ chuỗi sự kiện lưu vào **một phần lưu mới, kiểm tra dễ dãi** (mục 11).

### 06 Cinematic Events → **Hoãn**
- Sửa 3 lỗi hiệu năng nền trước (P3, P4, P6).
- Sau đó làm **một** cảnh thử ở một World, bằng bộ điều phối của nền WebGL. Đây cũng là nơi duy nhất nên có hiệu ứng bẻ cong ánh sáng (lensing).

### 07 Boss Mechanics 2.0 → **Làm có chỉnh**
- Dùng lại các cơ chế có sẵn: interrupt-charge chính là chiêu cuối ngắt được; rapid-rage chính là pha cuồng nộ.
- Phần mới là bộ phận nhắm được. **Làm bộ phận như những quái gắn vào thân boss.** Cách này dùng lại việc nhắm, gõ, vẽ và hiệu ứng của quái, không tạo hệ thống nhắm thứ hai (tránh lỗi kẹt gõ mà đề xuất có nhắc).
- Làm thử trên một Tyrant (Vorgrath, G02): 2 bộ phận, 1 chiêu cuối ngắt được, 1 pha cuồng nộ.

### 08 Flow → **Làm, gộp** (ưu tiên cao)
- Bậc Flow **tính từ chuỗi gõ có sẵn**, không thêm thanh đo mới.
- Bậc Flow điều khiển: lớp nhạc calm → intense (đã có), hào quang tàu (đã có trong `skill-fx`), và **một** thưởng lối chơi.
- Đổi tên để không trùng "Overdrive".
- Việc giảm dần thay vì mất cả chuỗi nên dựa vào cơ chế có sẵn (`combo-protected`, Mirror Vow) để giữ cân bằng.

### 09 Adaptive Director → **Làm** (nhỏ)
- Cho người chơi thấy Threat Level, tính từ `active-pressure` + adaptive profile.
- Thêm điều chỉnh chậm nhịp ra quái trong giới hạn của từng màn. Test Lab đã có chế độ đóng băng nên kiểm thử được.

### 10 Meta / Collection → **Làm từng phần**
- Mở rộng Codex thành **kho từ vựng**, dùng sự kiện học đã gửi lên Portal và trí nhớ Recall.
- Thêm mục tiêu mastery. Bí mật để sau.

## 4. Ma trận dùng lại / phải sửa

| Hệ thống | Dùng lại | Phải sửa trước | Nguy cơ trùng lặp |
|---|---|---|---|
| Sector Conditions | stage-scheduler, galaxy-hazards, thẻ tên boss (combat-fx), hố đen (skill-fx), mưa sao băng (background) | mở rộng `StageEventDefinition` | thấp nếu nâng cấp, cao nếu làm mới |
| Elite affix | elite.ts, threat.ts, combat-fx | hiện thị biến thể tinh anh | **cao** (trùng loại quái) |
| Build / Synergy | relics, synergy, perks, passives | **luồng sự kiện chiến đấu** | cao nếu thêm hàm `apply…` thứ 5 |
| Flow | streak, multiplier, Rage, MusicController | không | trung bình (tên Overdrive) |
| Director | adaptive-profile, active-pressure, difficulty | không | thấp |
| Boss 2.0 | typing-mechanics, identity, enemy targeting | cho phép "quái gắn vào boss" | cao nếu làm hệ thống nhắm riêng |
| Evolution / Awakening | Mk, grades, ranks, playUltimateFx, player-shots | không | cao nếu làm trạng thái mới |
| Space Events | route, discovery, reward-choice | loại nút `event` + phần lưu cờ | trung bình |
| Cinematic | background director | sửa P3, P4, P6 | thấp |
| Meta | codex, meta, learning, recall | phần lưu mastery | trung bình |

## 5. Thứ tự phụ thuộc

```
Luồng sự kiện chiến đấu (Phase 0)
  ├─> Build / Synergy / Draft ──> Expedition (chơi lại theo lượt)
  ├─> Flow ──> nhạc theo bậc
  ├─> Director (Threat Level)
  └─> Meta (mastery, kho từ)
Sector Conditions ─┬─> thẻ giới thiệu màn ──> đo độ lặp (variety audit)
Elite affix ───────┘
Sửa hiệu năng nền (P2, P3, P4, P6) ──> Cinematic
Quái gắn vào boss ──> Boss 2.0
Route event nodes ──> chuỗi sự kiện, bí mật
```

## 6. Ai giữ trạng thái nào

| Trạng thái | Chủ hiện tại | Hệ thống mới đặt ở đâu |
|---|---|---|
| Trận, mục tiêu gõ, quái, boss, đạn, kỹ năng đang chạy, trạng thái | `Game` | Sector Condition đang bật, affix (trường trên `Enemy`), bậc Flow, Threat của màn, bộ phận boss (là `Enemy`) |
| Tiến trình lưu lâu dài (chiến dịch, trang bị, relic, lộ trình…) | `main.ts` + các module `persistence/` | build đã chọn (qua các setter như `setEquipmentPerks`), cờ sự kiện, mastery, kho từ |
| Mức đồ hoạ | `settings` → `qualityProfile()` | mọi hiệu ứng mới chỉ đọc qua `qualityProfile` |
| Nền | `background/stage.ts` | cảnh cinematic |
| Nhạc, tiếng | `MusicController`, `Sfx` | lớp nhạc theo Flow, tiếng của condition và affix |

Quy tắc: mỗi trạng thái **chỉ có một chủ**. `main.ts` giải xong cấu hình rồi đưa vào `Game` qua setter. `Game` không đọc save trực tiếp.

## 7. Luồng sự kiện chiến đấu (khuyến nghị kiến trúc)

**Có nên làm luồng sự kiện chung không? Có**, nhưng **đồng bộ, có thứ tự cố định**, không làm "event bus" bất đồng bộ.

- `Game` đẩy sự kiện có kiểu vào một hàng đợi trong khung hình. Ví dụ: `LETTER_TYPED`, `WORD_COMPLETED {perfect, length, source, entry}`, `ENEMY_KILLED {kind, family, elite, affixes, perfect}`, `PLAYER_HIT`, `SKILL_USED`, `STREAK_CHANGED`, `BOSS_PHASE`, `RECALL_RESULT`, `PROJECTILE_INTERCEPTED`, `STAGE_STARTED`, `STAGE_ENDED`.
- Hàng đợi được xử lý ở **điểm cố định**: cuối `handleKey`, cuối mỗi nhịp `update`.
- **Thứ tự người nghe cố định:** thống kê → nội tại tàu → relic → perk → synergy → Flow → Director → Meta.
- Người nghe **không sửa trạng thái trực tiếp**. Họ trả về **lệnh**, ví dụ `strike(enemy, letters)`, `restoreEnergy(n)`, `block()`, `fx(…)`, `sound(…)`. `Game` áp dụng lệnh, nên `Game` vẫn là chủ duy nhất.
- Sự kiện sinh thêm sự kiện được xử lý trong cùng lượt, có giới hạn độ sâu để không lặp vô hạn.
- **Lợi ích:** thêm relic, perk hay synergy mới chỉ là dữ liệu cộng một hàm nhỏ, không phải chèn thêm hàm `apply…` vào `Game.ts`. Kiểm thử được bằng cách phát sự kiện giả và xem danh sách lệnh trả về.
- Phase 0 **chỉ chuyển 40 điểm kích hoạt đang có sang luồng này, không đổi hành vi**. 945 bài kiểm thử hiện có là lưới an toàn.

## 8. Hiển thị và hiệu ứng

- **Dùng lại:**
  - `vfx/combat-fx.ts`: quái, boss, affix, condition.
  - `vfx/skill-fx.ts`: kỹ năng, hào quang Flow.
  - `vfx/light-sprites.ts`: quầng sáng vẽ sẵn.
  - `vfx/player-shots.ts`: tiến hoá đạn.
  - Nền WebGL: hiệu ứng toàn cảnh, bẻ cong ánh sáng.
- **Quy tắc:**
  - Không dùng `shadowBlur` trong đường vẽ chạy mỗi khung hình (nguyên nhân giật đã đo được).
  - Mức đồ hoạ chỉ đổi số lượng, kích thước và độ mịn, qua `qualityProfile`.
  - Chữ luôn vẽ sau cùng, trên mọi hiệu ứng.
  - Không đặt chớp sáng mạnh sau chữ lâu hơn 0,3 giây.
- **Hiệu ứng phải dạy luật chơi:** mỗi affix và condition cần một dấu hiệu nhìn là nhận ra (màu, hình, tiếng), đúng như đề xuất mục 2.3.

## 9. Rủi ro hiệu năng và ngân sách đo được

Đo ngày 29/09 (Chrome không giao diện, 1642×799, DPR 2, High): 8 quái đạt 57 khung hình/giây (p95 20 ms); đánh boss đạt 60 khung hình/giây.

| Hạng mục | Ngân sách đề xuất |
|---|---|
| Thời gian khung hình | p95 ≤ 20 ms với 12 quái + boss + 2 kỹ năng, ở High |
| Hạt hiệu ứng | chiến đấu ≤ 360, khói ≤ 260, hiệu ứng kỹ năng ≤ 96 (đã có giới hạn cứng); condition ≤ 120 |
| Bẻ cong ánh sáng | tối đa 1 lượt toàn màn hình, chỉ ở nền WebGL, chỉ High/Ultra |
| Tiếng | ≤ 24 tiếng tổng hợp cùng lúc (đã có giãn nhịp 30–45 ms) |
| DOM | không ghi DOM mỗi khung hình; HUD mới cập nhật tối đa ~6 lần/giây |
| Bộ nhớ | ảnh vẽ tay tải theo World; bản thu nhỏ tối đa 72 bản (đã có) |

Việc phải làm trước khi thêm nhiều hiệu ứng: sửa **P2** (bộ tự hạ độ phân giải bỏ qua khung hình chậm thật) và **P6** (lúc tạm dừng vẫn vẽ liên tục) trong báo cáo hiệu năng.

## 10. Kiểm thử

- **Giữ:** toàn bộ 945 bài hiện có (hồi quy gõ thường, Recall, kỹ năng, nhắm mục tiêu, boss, qua màn).
- **Thêm:**
  - thứ tự luồng sự kiện;
  - bảng tương thích (condition × mục tiêu màn × affix × cơ chế boss);
  - "không kẹt gõ" khi dùng kỹ năng lúc boss đổi pha;
  - giới hạn số thực thể khi affix chồng nhau;
  - đo hiệu năng cho từng hệ thống (theo mẫu `scripts/visual/evals/enemy-perf.js`).
- **Script đo độ lặp (variety audit)** trong `src/balance/`, giống `campaign-audit.ts`: giả lập 1000 màn, đếm mỗi 10, 50 và 100 màn có bao nhiêu tổ hợp khác nhau (condition, mục tiêu, bộ affix, kiểu bắn boss), và bao nhiêu lần lặp lại gần nhau. Đây là cách đo trực tiếp nỗi lo "chơi lâu thấy chán", thay cho cảm tính.

## 11. Lưu trữ và chuyển đổi save

- **Hiện trạng:**
  - `RunPersistentState` có 15 phần.
  - `PLAYER_SAVE_VERSION` có nhiều nhánh kiểm tra phiên bản trong `persistence/backup.ts`.
  - **Có bẫy kiểm tra quá chặt:** trạng thái nâng cấp đòi đúng số lượng mã kỹ năng lõi, nên thêm mã mới sẽ làm hỏng bản sao lưu.
- **Quy tắc cho hệ thống mới:**
  - Dữ liệu lâu dài (cờ sự kiện, mastery, synergy đã khám phá, kỷ lục Expedition) vào **một phần lưu mới**, kiểm tra dễ dãi, có giá trị mặc định (theo mẫu `skills/support-loadout.ts`).
  - Không kiểm tra theo số lượng cố định.
  - Có mặt trong checkpoint, crash recovery, death protection và bản sao lưu.
  - Trạng thái trong trận (condition, Flow, Threat, build của lượt Expedition) **không lưu**, trừ phần lưu riêng của chế độ Expedition.

## 12. Lộ trình triển khai đề xuất

Mỗi giai đoạn: tính năng hiện **mặc định trong Portal** (chủ dự án duyệt bằng cách chơi), có cờ tắt để so sánh.

| Giai đoạn | Nội dung | Điều kiện trước | File chính | Rủi ro | Kiểm thử | Cách rút lại |
|---|---|---|---|---|---|---|
| **0 — Nền** (nhỏ đến vừa) | Luồng sự kiện chiến đấu, chuyển 40 điểm kích hoạt sang (không đổi hành vi). Script đo độ lặp. Sửa P2, P6. | — | `Game.ts`, `src/combat/events.ts` (mới), `relics/`, `equipment/perks.ts`, `synergy/`, `performance/` | trung bình | 945 bài cũ + thứ tự sự kiện | revert commit (hành vi không đổi) |
| **1 — Đa dạng nhìn thấy được** (vừa) | 4 Sector Conditions + thẻ giới thiệu màn. Hình ảnh cho 4 biến thể tinh anh + 4 affix mới. Bậc Flow + nhạc. Threat Level. **Đa dạng dạng gõ** (mục 14.1). | Phase 0 | `events/`, `enemies/elite.ts`, `vfx/combat-fx.ts`, `MusicController`, chọn từ trong `Game` | trung bình | tương thích, giới hạn thực thể, hiệu năng | cờ tắt từng hệ thống |
| **2 — Quyết định và build** (vừa) | Chọn 1 trong 3 (hòm thưởng, thưởng World Boss). Kho relic ~24 món theo 4 nhánh. Synergy khám phá được. Tuyệt chiêu Rage thành Awakening. | Phase 0 | `relics/`, `synergy/`, `events/reward-choice.ts`, `main.ts` | trung bình (cân bằng) | cân bằng bằng script balance | cờ tắt |
| **3 — Boss 2.0 thử nghiệm** (vừa) | Vorgrath có 2 bộ phận (quái gắn vào boss), chiêu cuối ngắt được, pha cuồng nộ. | Phase 0 | `Game.ts` (boss), `boss/`, Test Lab | **cao** (nhắm mục tiêu) | kẹt gõ, nhảy pha trong Test Lab | cờ theo boss |
| **4 — Chơi lại lâu dài** (lớn) | Chế độ Expedition (mục 14.2), nút sự kiện trên lộ trình, chuỗi sự kiện, hạt giống hằng ngày. | Phase 1–2 | `campaign/` (mode mới), `route.ts`, `persistence/` (phần lưu mới) | cao (lưu trữ) | save/load, chuyển đổi | chế độ riêng, không đụng chiến dịch |
| **5 — Trình diễn và sưu tầm** (vừa) | 1 cảnh cinematic thử (sau P3, P4). Kho từ vựng, mastery, bí mật. | Phase 0, sửa nền | `background/`, `codex/`, `learning/` | trung bình | chạy lặp nhiều lần không rò bộ nhớ | cờ tắt |

## 13. Bỏ, gộp, hoãn

- **Bỏ:**
  - Word Corruption (chữ nhấp nháy hoặc mất): hại việc học.
  - Affix Mirror kiểu đảo chữ.
  - Speed Build theo WPM tuyệt đối.
  - Tái cấu trúc thư mục theo sơ đồ mục 16 của đề xuất.
  - Event bus bất đồng bộ.
  - Các lo ngại React.
- **Gộp:**
  - Affix → biến thể tinh anh.
  - Flow → chuỗi gõ / Rage / nhạc.
  - Awakening → tuyệt chiêu Rage.
  - Evolution → Mk / cấp độ hiếm / hạng kỹ năng (+ tiến hoá đạn).
  - Archive → Codex.
  - Director → adaptive profile + active pressure.
- **Hoãn:**
  - Cinematic (chờ sửa hiệu năng nền).
  - Vocabulary Build theo loại từ (chờ dữ liệu).
  - Lost Signal.
  - Gravity Inversion: quái vào từ hướng khác làm rối thứ tự nhắm.
  - Hunter Fleet: làm cùng Expedition.
  - Quantum Echo: có thể thành affix sau.
  - Champion 4 affix (chờ kiểm chứng chữ vẫn dễ đọc).

## 14. Ý tưởng bổ sung (đề xuất chưa có)

1. **Đa dạng dạng gõ.** Đây là cốt lõi của một game gõ phím và là thiếu sót lớn nhất của đề xuất. Nhịp gõ phải thay đổi, không chỉ quái:
   - bầy quái nhỏ mang **một chữ cái** (gõ nhanh, liên tục);
   - sniper mang **từ dài**;
   - tinh anh mang **cụm 2 từ** (collocation, lấy từ kho từ vựng);
   - đòn kết liễu boss là **một câu ngắn**;
   - đội hình dùng **chung một từ** (gõ một lần trúng cả đội);
   - **nối đuôi**: chữ cuối từ này là chữ đầu từ sau thì được thưởng;
   - **sóng theo chủ đề**: `vocabulary.ts` đã có chủ đề, ví dụ World vũ trụ ra từ về vũ trụ.

   Tất cả dùng từ và cụm từ thật từ kho, không làm méo chữ.
2. **Chế độ Expedition (chơi lại không chán).** Mỗi lượt khoảng 20 màn ghép từ World, condition, affix, boss có sẵn. Sau mỗi màn chọn 1 trong 3 phần thưởng, có relic chỉ dùng trong lượt, chấm điểm, có **hạt giống hằng ngày** (cùng đề cho cả ngày) và kỷ lục cá nhân. Chế độ này tách khỏi tiến trình chiến dịch. Đây là đòn bẩy chơi lại mạnh nhất mà lại dùng toàn nội dung đã có.
3. **Chọn 1 trong 3** làm cách nhận build: sau boss, ở hòm thưởng, ở trạm. Người chơi phải ra quyết định, và build mỗi lượt sẽ khác nhau.
4. **Việc học thành tiến trình:**
   - Portal đã gửi bộ từ cần ôn (`learning/shared.ts`). Từ hay sai trở thành **"từ truy nã"**: một tinh anh mang từ đó, hạ được thì có thưởng.
   - Từ đã thuộc thắp sáng một **chòm sao sưu tầm**.
   - Cuối mỗi World có một **"Lexicon Boss"** ghép từ những từ mình hay sai.
5. **Đua với bóng ma của chính mình.** Chơi lại một màn cùng "tàu bóng ma" bắn đúng nhịp lần chơi tốt nhất. Rẻ, không cần ảnh mới, và rất hợp game gõ phím.
6. **Làm biến thể dễ thấy:**
   - trước màn có thẻ ngắn (condition + mục tiêu + affix sẽ gặp);
   - sau màn có phần "khoảnh khắc nổi bật" (chuỗi dài nhất, synergy mới, từ mới thuộc).

   Nếu thiếu phần này, người chơi sẽ không nhận ra các hệ thống đang chạy, đúng như tình trạng hiện nay.
7. **Kẻ thù truy đuổi (Nemesis).** Tinh anh nào hạ được mình thì được đặt tên và quay lại mạnh hơn, kèm tiền thưởng.
8. **Đo độ lặp** (mục 10) chạy cùng kiểm thử, để đội biết con số "bao nhiêu màn thì lặp lại".

## 15. Kết luận kỹ thuật

- **Đề xuất đạt về hướng, chưa đạt để làm nguyên văn.** Triển khai theo lộ trình ở mục 12: bắt đầu **Phase 0** (nền, không đổi hành vi) rồi **Phase 1** (đa dạng thấy ngay trong vài giờ chơi).
- Mọi hệ thống mới phải **nâng cấp cái đã có** trước khi tạo mới, đi qua **luồng sự kiện chiến đấu**, **khai báo bằng dữ liệu**, có **dấu hiệu nhìn thấy được**, và thử được trong **Test Lab bằng đúng mã thật**.
- Ưu tiên: đa dạng dạng gõ, Sector Conditions và chọn 1 trong 3. Ba thứ này đổi cảm giác chơi nhiều nhất trên mỗi đơn vị công sức.
