# Kế hoạch: góc nhìn chiều sâu (Depth View) cho PvP Duel

Ngày: 2026-10-03. Người viết: Claude. Trạng thái: **bản pilot đã triển khai trong cùng đợt** (xem mục 9). File này là kế hoạch và tài liệu thiết kế. Bàn giao chung của đợt nằm ở `CLAUDE_HANDOFF_DUEL_AUTO_COMBAT_HORIZONTAL_2026-10-03.md`.

## 1. Yêu cầu của chủ dự án

- Bố cục ngang (tàu trái/phải) nhìn xấu. Ban đầu chủ dự án muốn **dọc**, nhưng bản dọc cũ đặt hai tàu quá gần nhau.
- Muốn có **cảm giác 3D**:
  - Tàu mình nhìn rõ, ở gần.
  - Tàu địch ở rất xa.
  - Đạn càng bay tới gần càng to và rõ.
  - Xung quanh phải chuyển động, không "treo lơ lửng, đứng im".
- Vẫn phải thấy đủ bom đạn, hiệu ứng, chữ mục tiêu và HUD.
- Ảnh tham khảo (concept do chủ dự án gửi): tàu mình ở đáy giữa, địch nhỏ ở trên, đạn và khói tên lửa hội tụ về phía địch, thiên thạch và mảnh vỡ hai bên, mục tiêu chữ rải hai bên đường đạn.

## 2. Vì sao bản dọc cũ thất bại

1. Hai tàu **cùng kích thước**. Mắt người hiểu "xa" qua kích thước. Không có tỉ lệ thì 450px chỉ là "gần nhau".
2. Đạn đi **đều trên màn hình**, cùng độ to. Không có tín hiệu phối cảnh nào: không nhỏ dần, không tăng tốc khi lại gần.
3. Môi trường **tĩnh**. Nền chỉ trôi rất chậm, không có gì lao qua camera.
4. Camera **cố định**: không lắc, không áp sát lúc kết liễu.

## 3. Giải pháp: phối cảnh giả 3D trên canvas 2D (không dùng WebGL 3D)

Lý do chọn hướng này:
- Tận dụng toàn bộ art hiện có (tàu V3, đạn vẽ tay, ảnh nổ, nền BGV), không cần mô hình 3D.
- Chi phí GPU gần như không đổi. Máy chủ dự án là MacBook có Intel UHD 630 / Radeon 560X, và yêu cầu không giảm hiệu năng.
- Không phá Campaign. Chỉ Duel dùng các tùy chọn mới.

### 3.1. Mô hình chiếu

Camera đặt sau và hơi trên tàu mình, nhìn về phía địch. Một vật ở độ sâu `z` có tỉ lệ `scale = F / z` và cao độ màn hình `y = H + C / z`, với `H` là đường chân trời (vanishing line). Suy ra **tỉ lệ tỉ lệ thuận với (y − H)** cho mọi vật cùng cao độ.

Từ vị trí và kích thước hai tàu (lấy từ DOM), ta tính ngược ra đường chân trời:

```
H = (yR·sP − yP·sR) / (sP − sR)
```

Trong đó `P` là tàu mình (gần) và `R` là tàu địch (xa). Ở 1642×799: tàu mình ~160px tại y = 79%, địch ~52px tại y = 21%. Tỉ lệ kích thước khoảng 3:1, nên `H` nằm hơi trên mép trên màn hình.

### 3.2. Đạn bay theo chiều sâu (đã làm trong `src/vfx/player-shots.ts`, tùy chọn `horizonY`)

- Đạn di chuyển **đều theo độ sâu**, không đều theo màn hình. Tỉ lệ đường đi trên màn hình tại thời điểm `w`:
  `u = (near − 1/depth(w)) / (y0 − ty)`, với `depth(w) = 1/near + (1/far − 1/near)·w`, `near = y0 − H`, `far = ty − H`.
  - Đạn mình: rời nòng **nhanh rồi chậm dần**, nhỏ dần về phía địch.
  - Đạn địch: **xuất hiện nhỏ và chậm ở xa, rồi phình to và lao nhanh** khi tới gần. Đây chính là cảm giác "đạn tới gần thì thấy rõ hơn".
- Độ rộng vệt, độ dài thân đạn vẽ tay, kích thước vụ nổ khi trúng và chớp lửa nòng đều nhân với `depthAt(y) = (y − H)/(y0 − H)`.
- Campaign không đặt `horizonY` nên giữ đúng hành vi cũ (đã chạy lại các test đạn).

### 3.3. Hiệu ứng trúng và chữ theo chiều sâu

- Vụ nổ, tia lửa, mảnh vỡ ở tàu địch thu nhỏ theo khoảng cách (`depthFactor^0.7`, nên ở xa vẫn đủ to để thấy). Trúng tàu mình thì **to và rung mạnh hơn**.
- Chữ nổi giữ cỡ dễ đọc (không thu nhỏ theo khoảng cách) và được xếp theo làn (mục 6 của handoff).

### 3.4. Môi trường chuyển động

1. **Luồng sao bay qua camera (warp streaks):** các điểm sao trong không gian 3D tiến về phía camera từ điểm tụ cạnh tàu địch. Càng gần càng sáng và vệt càng dài. Số lượng theo chất lượng: Low 40 / Medium 80 / High 140 / Ultra 220. Chuỗi gõ đúng tăng tốc độ luồng sao. Khi KO, luồng chậm lại theo đồng hồ hiệu ứng.
2. **Tàu không đứng yên:**
   - Tàu mình trôi ngang nhẹ (±14px) và nghiêng theo hướng trôi.
   - Tàu địch né trái/phải chậm (±6% bề rộng) như đang cơ động.
   - Đạn luôn bám theo vị trí sống của mục tiêu.
3. **Khói và lửa theo tên lửa/bom:** vệt khói và tàn lửa rơi dọc đường bay, giống concept.
4. **Camera:**
   - Rung (đã có) và "đẩy" zoom nhẹ khi trúng đòn nặng.
   - Khi KO, camera **áp sát** tàu thua (zoom 1,12 → 1,18 lúc nổ cuối) rồi lùi về. Camera áp dụng cho cả nền (Game canvas). HUD và chữ DOM không bị phóng to nên vẫn dễ đọc.

### 3.5. Bố cục màn hình (`data-layout="depth"`)

| Thành phần | Vị trí |
| --- | --- |
| Tàu địch | giữa, y ≈ 21%, rộng clamp(44px, 3.6vw, 62px) |
| Tàu mình | giữa, y ≈ 79%, rộng clamp(128px, 10.5vw, 176px) |
| Mục tiêu chữ | hai bên đường đạn (x 19–36% và 64–81%), không chiếm làn giữa 40–60% |
| Ô đang gõ | giữa đáy (bottom 2.5%) |
| HUD địch / mình | trên trái / dưới trái (giữ như cũ) |
| Dòng hướng dẫn | trên giữa, tự mờ sau 7 giây |
| Nhãn "RIVAL CHARGING" | ngay dưới tàu địch |

## 4. Tương thích và lựa chọn bố cục

- **Mặc định: Depth View** trên mọi kích thước (desktop và dọc điện thoại).
- So sánh bản ngang cũ: thêm `?duelView=side` vào URL game (`https://space.typing-game.local/?duelView=side`). Portal không truyền tham số, nên chủ dự án sẽ thấy Depth View ngay khi tải lại.
- `duelHorizontalLayout()` giữ cho bản `side`. Hàm mới là `duelArenaLayout()` trong `src/duel/combat-layout.ts`.
- Không đổi gameplay, protocol hay save. Vị trí là phần trình bày thuần.

## 5. Ngân sách hiệu năng

- Luồng sao: một lệnh `stroke` cho mỗi bậc độ sáng (4 bậc), không cấp phát bộ nhớ mỗi khung hình.
- Mặt cache thân tàu đổi theo kích thước: tàu mình ~290px, địch ~160px. Vẽ lại tối đa 30Hz như cũ.
- Camera zoom chỉ là một `setTransform` trên canvas đã có. Không thêm canvas toàn màn hình.
- Không dùng `shadowBlur`, `filter`, hay `backdrop-filter` mới.
- Đo bằng `.visual/juice-ab.js` và kịch bản đánh trong `.visual/` (xem handoff mục đo hiệu năng).

## 6. Rủi ro và cách xử lý

| Rủi ro | Xử lý |
| --- | --- |
| Tàu địch nhỏ khó thấy | Viền sáng/hào quang theo màu tàu, vụ nổ ở xa vẫn tối thiểu 58% cỡ gần, camera áp sát khi KO |
| Chữ mục tiêu đè đường đạn | Vị trí riêng cho depth, chừa làn giữa |
| Art tàu là góc nhìn từ trên xuống | Từ camera phía sau-trên, tàu mình hướng mũi lên và tàu địch mũi xuống vẫn đọc đúng; không cần art mới cho pilot |
| Máy yếu | Low/Medium giảm luồng sao và hạt; Reduced Motion tắt trôi/lắc |

## 7. Việc tiếp theo nếu chủ dự án duyệt pilot

1. Tinh chỉnh tỉ lệ xa/gần (3:1 hiện tại) và tốc độ luồng sao theo cảm nhận khi chơi thật.
2. Tùy chọn art (chỉ khi cần, sẽ có file prompt riêng trong `docs/art-requests/`):
   - Ảnh "hành lang tinh vân" có điểm tụ ở giữa trên cho nền Duel.
   - Sprite đầu tàu địch nhìn chính diện cho khoảng cách xa.
3. Hiệu ứng mục tiêu chữ bay theo chiều sâu, ví dụ vật phẩm trôi từ xa lại.
4. Đo FPS trên máy thật của chủ dự án ở High/Ultra, và so `?duelView=side` với Depth.

## 8. Cách kiểm tra

```bash
cd /Users/jokerit/htdocs/typing-game/games/space-typing
pnpm build:space        # hoặc ./play.sh
# Mở portal, vào Duel → Practice vs Bot. So sánh: https://space.typing-game.local/?duelView=side
```

## 9. Phần đã triển khai trong pilot (2026-10-03)

- `src/vfx/player-shots.ts`: tùy chọn `horizonY` (đạn theo chiều sâu), vụ nổ khi trúng và chớp nòng theo khoảng cách, `visitLiveShots()` cho vệt khói.
- `src/duel/combat-layout.ts`: `duelArenaLayout()`, mặc định `depth`, `?duelView=side` để so sánh.
- `src/duel/combat-visuals.ts`: đường chân trời tính từ hai tàu, tàu trôi/né, luồng sao, vệt khói tên lửa, mặt cache tàu theo cỡ, camera.
- `src/duel/combat-juice.ts`: hiệu ứng theo chiều sâu, camera áp sát khi KO và đẩy nhẹ khi trúng nặng.
- `src/Game.ts`: áp camera Duel (zoom quanh một điểm) cho cả nền.
- `src/duel/battle-ui.ts`, `src/duel/battle-juice.css`: bố cục `depth`, vị trí mục tiêu chữ, ô gõ và hướng dẫn.
