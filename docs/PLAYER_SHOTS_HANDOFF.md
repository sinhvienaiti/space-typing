# Space Typing — Đạn của phi thuyền (Player Shots): tài liệu bàn giao

> **Ngày:** 28/09/2026 · **Người viết:** Claude Code · **Người nhận:** ChatGPT (hoặc AI lập trình khác) làm tiếp, và chủ dự án.
>
> **Phạm vi:** hệ đạn mới của người chơi trong `games/space-typing`. Đã làm xong bản thử cho **phi thuyền đầu tiên, Vanguard**. **10 phi thuyền còn lại vẫn dùng tia laser cũ**, chờ làm tiếp theo tài liệu này.
>
> **Tài liệu liên quan:** hình nền BGV — [BACKGROUND_VISUAL_REBOOT_HANDOFF.md](BACKGROUND_VISUAL_REBOOT_HANDOFF.md). Hai hệ này độc lập; đạn chỉ dùng chung quy trình xử lý ảnh (`scripts/bg-art/`).

## Mục lục

0. [Đọc trước tiên](#0-đọc-trước-tiên)
1. [Chủ dự án muốn gì](#1-chủ-dự-án-muốn-gì)
2. [Hiện trạng](#2-hiện-trạng)
3. [Kiến trúc](#3-kiến-trúc)
4. [Gắn vào lối chơi (`Game.ts`)](#4-gắn-vào-lối-chơi-gamets)
5. [Ảnh vẽ tay: quy trình xử lý và cách dùng](#5-ảnh-vẽ-tay-quy-trình-xử-lý-và-cách-dùng)
6. [Làm đạn cho phi thuyền tiếp theo — từng bước](#6-làm-đạn-cho-phi-thuyền-tiếp-theo--từng-bước)
7. [Thiết kế đề xuất cho 10 phi thuyền còn lại](#7-thiết-kế-đề-xuất-cho-10-phi-thuyền-còn-lại)
8. [Nhật ký lỗi đã gặp và cách xử lý](#8-nhật-ký-lỗi-đã-gặp-và-cách-xử-lý)
9. [Việc còn lại](#9-việc-còn-lại)
10. [Checklist trước khi báo "xong"](#10-checklist-trước-khi-báo-xong)
- [Phụ lục — Lệnh và tham số](#phụ-lục--lệnh-và-tham-số)

---

## 0. Đọc trước tiên

1. **Mỗi chữ gõ đúng bắn ra 1 viên đạn bay thật** (không còn là tia laser tức thì). Viên đạn bay theo đường cong ngắn tới mục tiêu. Nó có đuôi sao băng, bụi sáng, và nhỏ dần khi bay xa để tạo cảm giác chiều sâu.
2. **Lối chơi không chờ đạn.** Điểm, số lần hạ gục, chuyển mục tiêu, phần thưởng đều tính ngay lúc gõ. Chỉ **phần nhìn** chờ đạn chạm: loé sáng, rung giật, tia lửa, khựng hình, tiếng nổ, rung màn hình. Kẻ địch bị hạ vẫn được vẽ tới khi viên cuối chạm vào mới nổ.
3. **Làm thử một phi thuyền trước (Vanguard), duyệt xong mới làm tiếp.** Đây là quy tắc của chủ dự án. Phi thuyền chưa có thiết kế thì giữ nguyên tia laser cũ, hành vi y hệt trước.
4. **Hình ảnh đẹp đến từ ảnh vẽ tay do chủ dự án tạo bằng Gemini.** Code lo chuyển động, đuôi, bụi sáng, thời điểm và cách hoà màu. Thiếu ảnh thì tự vẽ bằng code (dự phòng).
5. **Chưa commit.** Xem mục 9 và lệnh commit ở tin nhắn của Claude.
6. **Bài học khi ghép code:** lần trước chỉ `Game.ts` được commit, còn các file mới (`src/vfx/player-shots.ts`...) thì không. `Game.ts` import file không có trong Git nên build hỏng, và AI kia đã gỡ luôn phần đạn. **Luôn commit file mới cùng với file dùng nó**, và sau khi ghép, chạy `git status` xem có file nào đang được import mà chưa được theo dõi không.

---

## 1. Chủ dự án muốn gì

Yêu cầu gốc: *"hiệu ứng có cảm giác không phải 2D, phải đẹp, mỗi loại phi thuyền có đạn khác nhau, mỗi khi gõ từng chữ cái thì bắn ra 1 viên đạn, viên đạn có hiệu ứng kéo dài như sao băng bay"*.

| Quy tắc | Ghi chú |
|---|---|
| Mỗi phi thuyền một kiểu đạn riêng, hợp màu và dáng của tàu | Màu lấy từ `src/characters/projectiles.ts`, dáng tàu xem `docs/background-reboot/style-ref-player-ships.png` |
| Làm thử một cái, duyệt, rồi mới làm hàng loạt | Chủ dự án từng dừng một bản thiết kế cho cả 11 tàu, để chỉ làm Vanguard trước |
| Ảnh do chủ dự án tạo bằng Gemini; Claude/ChatGPT đưa **bảng tên file + prompt tiếng Anh sẵn để dán** | Ánh sáng (đạn, vụ nổ, loé nòng súng) vẽ trên **nền đen tuyệt đối `#000000`**, hướng **sang phải** |
| Đừng bắt chủ dự án xử lý file | Đề nghị tự lấy ảnh trong `~/Downloads`, tự đổi tên và chuyển vào đúng chỗ |
| Không giảm hiệu năng | Đạn vẽ bằng Canvas2D, rất nhẹ, không dùng `shadowBlur` (xem 3.5) |
| Chủ dự án duyệt bằng mắt, chơi qua Portal (`./play.sh`) | Thay đổi phải hiện mặc định; build lại trước khi báo |
| Giao tiếp tiếng Việt, dễ hiểu | |

---

## 2. Hiện trạng

### 2.1 Đã làm cho Vanguard

- **Đạn thường:** hai khẩu pháo ở cánh (`[-21, -12]` và `[21, -12]` so với tâm tàu) bắn luân phiên. Đường bay cong ra ngoài một chút rồi chụm vào mục tiêu.
- **Phát hạ gục** (`power >= 1.3`): bắn từ mũi tàu (`[0, -36]`), dùng ngọn giáo lớn hơn.
- **Đầu đạn:** ảnh vẽ tay (ngọn giáo pha lê xanh cyan có vòng xoắn năng lượng), ghim đúng mũi giáo vào vị trí đạn, xoay theo hướng bay.
- **Đuôi:** "vệt tàn" mềm bắt đầu phía sau thân giáo, nhiều lớp sáng lồng nhau, thon dần; kèm bụi sáng rơi phía sau.
- **Khi trúng:** loé trắng, ảnh vụ nổ hình sao vẽ tay nở ra rồi mờ dần (mỗi phát xoay một góc khác), tia lửa bắn ra.
- **Loé nòng súng:** ảnh vẽ tay, ghim gốc vào nòng.
- **Cảm giác chiều sâu:** đạn nhỏ dần khi bay lên (tới 60% ở khoảng cách lớn).
- **Dự phòng:** mọi phần đều có bản vẽ bằng code khi thiếu ảnh (xem `?art=0` ở trang xem thử).

### 2.2 Ảnh chụp (`docs/player-shots/`)

| File | Nội dung |
|---|---|
| `vanguard-gameplay-speed.jpg` | Tốc độ thường, 11 phím/giây, khung 1642×799 DPR 2 (kích thước chơi thật của chủ dự án) |
| `vanguard-slow-motion.jpg` | Quay chậm (`t=0.1`) |
| `vanguard-closeup.jpg` | Phóng to: ngọn giáo, vệt đuôi, loé nòng súng, vụ nổ |
| `vanguard-sprites-source.jpg` | 4 ảnh gốc chủ dự án gửi. Ảnh `bolt` bị nhầm (xem 9) |
| `vanguard-sprites-processed.jpg` | 3 ảnh sau khi xử lý (nền đen tuyệt đối, đã gỡ logo) |

### 2.3 Ảnh của Vanguard

| Ảnh | Trạng thái |
|---|---|
| `vanguard-finisher` | ✓ Dùng cho phát hạ gục, **và tạm cho đạn thường** |
| `vanguard-impact` | ✓ |
| `vanguard-muzzle` | ✓ |
| `vanguard-bolt` | ✗ Chủ dự án bỏ nhầm ảnh thiên thạch trên nền xanh. Script đã từ chối và báo rõ lý do. Cần tạo lại (prompt ở mục 9) |

---

## 3. Kiến trúc

### 3.1 File

| File | Vai trò |
|---|---|
| `src/vfx/player-shots.ts` | **Hệ đạn:** công thức từng tàu (`RECIPES`), mô phỏng bay (đường cong, bám mục tiêu, đuôi), vẽ (đuôi, đầu, bụi sáng, vụ nổ, loé nòng). Không biết gì về lối chơi. |
| `src/vfx/player-shot-sprites.ts` | **Ảnh vẽ tay:** đọc `fx.json` (kiểm tra chặt), nạp ảnh kèm `?v=<mã băm>`, chọn ảnh đầu đạn và ảnh thay thế. |
| `src/Game.ts` | **Gắn vào lối chơi:** kiểu `ShotImpact`, `firePlayerShot`, `aimPlayerShot`, `applyShotImpact`, `clearPlayerShots`, bóng kẻ địch chờ nổ (mục 4). |
| `src/vfx/shot-gallery.ts` + `shot-gallery.html` | Trang xem thử (chỉ ở chế độ dev): Vanguard tự gõ vào 3 mục tiêu trên nền World 01 thật. |
| `scripts/bg-art/prepare-fx.mjs` | Xử lý ảnh đạn: `pnpm fx:prepare <ship>` (mục 5). |
| `scripts/bg-art/art-common.mjs` | Hàm dùng chung với script ảnh nền: đọc ảnh, gỡ logo ✦ Gemini, đo viền, cắt ảnh, tham số dòng lệnh. |
| `scripts/check-background-art.mjs` | Kiểm tra khi build, gồm cả `fx/<ship>/fx.json`. |
| `public/assets/space-typing/fx/vanguard/` | Ảnh game dùng: `finisher.webp`, `impact.webp`, `muzzle.webp`, `fx.json` (94 KiB). |
| `art-src/fx/vanguard/` | Ảnh gốc Gemini, không lên Git (xem `art-src/README.md`). |
| `tests/player-shots.test.ts` | 11 test: công thức, bay, bám mục tiêu, đuôi tan, chuỗi đạn gõ nhanh, `fx.json`, chọn ảnh, tích hợp `Game`. |
| `tests/projectile-intercept-sfx.test.ts` | Bắn hạ đạn địch: đạn bay tới rồi mới vỡ; tàu chưa có đạn mới vẫn dùng laser. |

### 3.2 Vòng đời một viên đạn

```
Gõ đúng 1 chữ ──► Game.firePlayerShot(x, y, power, impact)
                   │  tàu có công thức?  không ─► tia laser cũ + applyShotImpact() ngay
                   │  có
                   ▼
PlayerShotSystem.fire()  ─ chọn nòng (luân phiên; phát hạ gục dùng mũi tàu)
                         ─ thời gian bay = khoảng cách / speed, kẹp 0,08–0,26 giây
                         ─ tạo loé nòng súng
mỗi khung: Game.updateEffects(dt) ─► system.update(dt, aimPlayerShot, quality)
                         ─ aim cập nhật vị trí mục tiêu đang di chuyển
                         ─ rắc bụi sáng
                         ─ tới nơi: trả về "arrival" + tạo vụ nổ
                   ▼
Game.applyShotImpact(payload)  ─ loé, giật, tia lửa, âm thanh, khựng hình, rung, xoá bóng kẻ địch
                   ▼
đuôi tiếp tục "chui" vào mục tiêu rồi viên đạn biến mất
```

- **Đường bay:** đường cong bậc hai từ nòng tới mục tiêu. Điểm uốn lệch sang phía của nòng súng một đoạn `bend × khoảng cách`, nên hai luồng đạn từ hai cánh chụm lại ở mục tiêu. Mục tiêu di chuyển thì đường cong tự nắn lại mỗi khung, nên đạn luôn trúng.
- **Đuôi:** lấy mẫu ngược trên chính đường cong, từ `s − trailS` tới `s` (s là tiến độ 0→1), nên không cần lưu lịch sử vị trí và không phụ thuộc số khung hình. `trailS = min(trailShare, trailMaxPx / khoảng cách)`. Sau khi trúng, đuôi còn chạy nốt `trailS` rồi mới tắt.
- **Chiều sâu:** `shotDepthScale(originY, y, viewHeight)` giảm từ 1 xuống 0,6 khi đạn bay lên. Áp dụng cho bề rộng đuôi, đầu đạn và chiều dài ảnh.

### 3.3 Công thức đạn (`ShotRecipe`, trong `RECIPES` theo archetype)

Giá trị hiện tại của Vanguard (`spear`):

| Trường | Giá trị | Ý nghĩa |
|---|---|---|
| `speed` | 3300 | px/giây (thời gian bay còn bị kẹp 0,08–0,26 giây) |
| `bend` | 0,07 | độ cong theo phần khoảng cách |
| `trailShare` / `trailMaxPx` | 0,55 / 240 | độ dài đuôi |
| `width` | 6,5 | bán kính đầu đạn và nửa bề rộng đuôi (px) khi ở gần |
| `stretch` | 5 | độ dài lõi trắng khi vẽ bằng code |
| `sparkleRate` | 90 | bụi sáng mỗi giây ở High (nhân hệ số theo bậc) |
| `muzzles` / `finisherMuzzle` | `[[-21,-12],[21,-12]]` / `[0,-36]` | vị trí nòng, tính từ tâm tàu (tàu vẽ ở cỡ 78 px) |
| `fx` | `"vanguard"` | thư mục ảnh trong `public/assets/space-typing/fx/` (`null` = chỉ vẽ bằng code) |
| `boltLength` / `finisherLength` | 92 / 150 | chiều dài ảnh đầu đạn (px, trước hệ số chiều sâu) |
| `impactSize` / `muzzleLength` | 84 / 46 | cỡ vụ nổ (phát hạ gục ×1,35), cỡ loé nòng súng (phát hạ gục ×1,4) |

`shotRecipeFor(characterId)` trả `null` cho tàu chưa có công thức. Khi đó `Game` dùng tia laser cũ.

### 3.4 Thứ tự vẽ trong `Game.draw()`

1. Tia laser cũ, rồi **đạn và đuôi** (`playerShots.drawShots`), vẽ **dưới kẻ địch** để nhãn chữ luôn đọc được.
2. Hạt, vòng vỡ khiên, đạn địch, **bóng đạn địch đã bị bắn hạ** (`interceptedProjectiles`).
3. Kẻ địch, rồi **bóng kẻ địch chờ nổ** (`dyingEnemies`).
4. Boss, rồi **vụ nổ khi trúng** (`drawImpacts`), vẽ trên kẻ địch.
5. Phi thuyền, rồi **loé nòng súng** (`drawMuzzleFlashes`).

### 3.5 Kỹ thuật vẽ và hiệu năng

- Mọi ánh sáng vẽ bằng `globalCompositeOperation = "lighter"` (cộng sáng).
- Quầng mềm dùng **ảnh gradient tròn tạo sẵn một lần cho mỗi màu** (`glowSprite`), rồi `drawImage`. **Không dùng `shadowBlur`**, vì nó tốn theo số điểm ảnh.
- Đuôi gồm các dải đa giác tô gradient dọc chiều dài:
  - 2 lớp quầng lồng nhau, mờ dần ra ngoài. Một quầng duy nhất sẽ lộ cạnh cứng như lưỡi dao.
  - 1 lớp thân màu đậm.
  - 1 lõi trắng.
- Bụi sáng nằm trong một `Float32Array` cố định (tối đa 320 hạt), không cấp phát bộ nhớ mỗi khung.
- Giới hạn: 64 đạn, 24 vụ nổ, 12 loé nòng súng cùng lúc.
- Theo bậc chất lượng:

  | Bậc | Số điểm mẫu của đuôi | Hệ số bụi sáng | Quầng ngoài | Chi tiết |
  |---|---|---|---|---|
  | Low | 6 | 0,25 | tắt | 0,55 |
  | Medium | 9 | 0,6 | bật | 0,8 |
  | High | 12 | 1 | bật | 1 |
  | Ultra | 16 | 1,35 | bật | 1,15 |

---

## 4. Gắn vào lối chơi (`Game.ts`)

### 4.1 `ShotImpact`: việc gì xảy ra khi đạn chạm

| Kiểu | Bắn từ | Xảy ra **ngay khi gõ** (lối chơi) | Xảy ra **khi đạn chạm** (phần nhìn) |
|---|---|---|---|
| `enemy-hit` | `typeTarget` (mỗi chữ); phản đạn (`fireLaser(enemy, 0.75)`) | đếm chữ, điểm, chuỗi combo, năng lượng | kẻ địch loé và giật, tia lửa (5, hoặc 12 nếu `power > 1`) |
| `enemy-layer` | `completeWord`, còn lớp khiên | đổi từ mới, điểm, năng lượng | loé, giật 1,45, khựng hình (`triggerImpactFeedback("word")`), tia lửa theo họ kẻ địch, `sfx.hit` |
| `enemy-kill` | `completeWord`, lớp cuối | hạ gục, điểm thưởng (`enemyKillRewardScore`), số điểm bật lên, rơi đồ, phần thưởng, đặc tính khi chết, xoá khỏi `enemies` | khựng hình, tia lửa, vụ nổ theo họ kẻ địch, `sfx.hit` + `sfx.kill`, rung màn hình (6,5 với tank, 4,5 với loại khác), xoá bóng |
| `boss-hit` | `typeBoss` (mỗi chữ) | sát thương boss, điểm | boss loé và giật, tia lửa |
| `intercept` | gõ chữ trên đạn địch | xoá đạn địch, điểm, `sfx.projectileIntercept` | vòng vỡ khiên, 28 tia lửa, rung nhẹ, xoá bóng |

- Các phần boss khác (hết từ, vỡ khiên, bị hạ) giữ nguyên, xảy ra ngay.
- Hạ gục bằng kỹ năng (`resolveSkillEnemyKill`, ví dụ bom chữ) không đi qua đạn, vẫn nổ ngay.

### 4.2 Các hàm chính

- `firePlayerShot(x, y, power, impact, laserLife = 0.085)`:
  - Nếu tàu có công thức: bắn đạn, rồi đưa kẻ địch bị hạ vào `dyingEnemies` và đạn địch bị bắn hạ vào `interceptedProjectiles`.
  - Nếu không: vẽ tia laser cũ và gọi `applyShotImpact` ngay. Tàu chưa làm vì vậy **y hệt trước**.
- `fireLaser(enemy, power)` và `fireBossLaser(power)`: lớp bọc mỏng quanh `firePlayerShot`.
- `aimPlayerShot`: tìm vị trí hiện tại của mục tiêu (kẻ địch còn sống, bóng kẻ địch, boss, đạn địch). Trả `false` thì đạn bay tới điểm cuối cùng đã biết.
- `applyShotImpact(impact, x, y)`: phần nhìn trong bảng 4.1.
- `clearPlayerShots()`: gọi ở cả 4 chỗ đặt `this.lasers = []` (Test Lab ×2, bắt đầu màn, về tiêu đề).
- Trong `updateEffects`, đạn được cập nhật **sau** các vòng giảm tuổi hiệu ứng. Nhờ vậy vòng vỡ khiên và tia lửa sinh ra lúc đạn chạm bắt đầu với đủ tuổi thọ.
- `preloadShotArt(characterId)` được gọi trong constructor và `setCharacter`. Không có trình duyệt (khi test) thì bỏ qua.

---

## 5. Ảnh vẽ tay: quy trình xử lý và cách dùng

### 5.1 Đầu vào: `art-src/fx/<ship>/<ship>-<id>.<png|jpg|jpeg|webp>`

| id | Là gì | Tỉ lệ | Điểm neo game ghim vào |
|---|---|---|---|
| `bolt` | đầu đạn thường, hướng sang phải | 2:1 (Gemini ra 1376×768 cũng được) | `tip`: điểm sáng xa nhất bên phải (mũi) |
| `finisher` | đầu đạn hạ gục, to và cầu kỳ hơn | 2:1 | `tip` |
| `impact` | vụ nổ khi trúng, tròn | 1:1 | `centre`: trọng tâm độ sáng |
| `muzzle` | loé nòng súng, hướng sang phải | 2:1 | `origin`: điểm sáng xa nhất bên trái (gốc) |

Tất cả phải là **ánh sáng trên nền đen tuyệt đối**: game cộng ảnh vào màn hình, nên màu đen coi như trong suốt.

### 5.2 Các bước của `pnpm fx:prepare <ship>` (`scripts/bg-art/prepare-fx.mjs`)

1. Gỡ logo ✦ Gemini, dùng chung mẫu với ảnh nền.
2. **Kiểm tra nền đen:** màu viền (trung vị) phải ≤ 28. Nếu không thì từ chối, kèm hướng dẫn tạo lại. Chính bước này đã bắt được ảnh `bolt` bỏ nhầm.
3. **Ép nền về đen tuyệt đối:** điểm đen = phân vị 98 của độ sáng viền (lọc nhiễu JPEG và màu "gần đen"), co giãn lại độ sáng, xoá các giá trị < 2. Không làm bước này thì cộng sáng sẽ lộ khung chữ nhật mờ quanh mỗi viên đạn.
4. Làm mờ dần 4% sát mép, để không có gì chạm mép ảnh.
5. Cắt sát phần sáng (lề 3%).
6. Tìm điểm neo (`tip`, `origin` hoặc `centre`) ở ngưỡng 55% độ sáng lớn nhất.
7. Thu nhỏ theo cạnh dài: `bolt`/`finisher` 768, `impact` 640, `muzzle` 512. Xuất WebP chất lượng 90, không kênh alpha.
8. Ghi `fx.json` (url, sha256, width, height, anchor) và xoá file cũ không dùng.
9. Ghi nguồn gốc vào `public/assets/space-typing/manifest.json`, mục `shot-fx-<ship>`.
   - **`category` phải thuộc `ART_CATEGORIES` trong `src/assets/pipeline.ts`.** Hiện dùng `"projectile"`.
   - Chỉ một mục sai là game **từ chối cả manifest**, và ảnh phi thuyền V3 cũng mất theo.
10. Có ảnh lỗi thì lệnh trả mã thoát 1, nhưng các ảnh hợp lệ vẫn được ghi ra.

Khi build, `check-background-art.mjs` kiểm tra:
- mỗi `fx.json`: `id` trùng thư mục;
- mỗi ảnh: file tồn tại, SHA-256 khớp, đúng là WebP và đúng kích thước, điểm neo trong khoảng 0–1;
- không có file thừa.

### 5.3 Cách game dùng ảnh (`drawShot` / `drawHead` / `drawImpact` / `drawMuzzleFlashes`)

- **Chọn ảnh đầu đạn** (`pickHeadSprite`): phát hạ gục dùng `finisher`, thiếu thì dùng `bolt`. Đạn thường dùng `bolt`, thiếu thì dùng `finisher`.
- **Đầu đạn:** `drawAnchored` ghim điểm neo vào vị trí đạn, xoay theo hướng bay, dài `boltLength`/`finisherLength` × hệ số chiều sâu. Kèm một quầng sáng mềm (ánh sáng hắt ra xung quanh).
- **Đuôi khi đầu đạn là ảnh ("vệt tàn"):** bề rộng chỉ còn 45%, và bắt đầu lùi sau mũi `0,7 × anchorX × chiều dài ảnh`, tức phần đuôi của thân giáo. Nếu để đuôi rộng và bắt đầu từ mũi thì thân giáo vẽ tay bị chìm, và đuôi thành cái nêm phẳng cạnh cứng.
- **Vụ nổ:**
  - Có loé trắng trong 30% đầu tuổi thọ.
  - Ảnh nở từ 0,55 lên 1,25 lần theo đường cong dịu, độ đục giảm theo `(1−k)^1,4`.
  - Mỗi phát xoay một góc riêng (`seed × 2,39` rad), để bắn liên tục không bị lặp hình.
- **Loé nòng súng:** ghim gốc vào nòng, co dần, tắt sau 0,075 giây.
- Ảnh đang nạp, lỗi, hoặc `?art=0` ở trang xem thử: dùng bản vẽ bằng code.

---

## 6. Làm đạn cho phi thuyền tiếp theo — từng bước

1. **Chọn tàu với chủ dự án.** Làm từng tàu một, duyệt xong mới sang tàu khác.
2. **Tìm hiểu tàu:**
   - `src/characters/projectiles.ts`: archetype, `primary`, `secondary`, `impactHue`.
   - `src/characters/registry.ts`: vai trò.
   - `docs/background-reboot/style-ref-player-ships.png`: dáng tàu và vị trí nòng.
3. **Thiết kế** theo gợi ý ở mục 7, rồi **đưa chủ dự án 4 prompt** (mẫu ở 7.2):
   - bảng tên file;
   - nhắc nền đen tuyệt đối và đạn hướng sang phải;
   - đề nghị tự lấy ảnh từ `~/Downloads`.
4. **Xử lý ảnh:**
   - thêm tên tàu vào `SHIPS` trong `prepare-fx.mjs`;
   - chạy `pnpm fx:prepare <ship>`;
   - mở `public/assets/space-typing/fx/<ship>/` xem kết quả.
5. **Thêm công thức** vào `RECIPES`, theo archetype của tàu:
   - `fx: "<ship>"`, các cỡ ảnh, `muzzles` (đo trên ảnh tàu: tàu vẽ ở cỡ 78 px, tâm ở giữa), tốc độ, độ cong.
   - Công thức gắn với archetype, và mỗi archetype hiện chỉ thuộc đúng một tàu.
6. **Nếu thiết kế cần cách bay hoặc cách vẽ mới** (xem 7.1: tia điện gấp khúc, đuôi xoắn, khói, vật đặc...):
   - thêm trường vào `ShotRecipe` (ví dụ `trail: "ribbon" | "zigzag" | "helix" | "smoke"`, `spin`, `tumble`, `solid`);
   - rẽ nhánh trong `drawTrail`/`drawHead`/`drawImpact`;
   - **giá trị mặc định phải giữ nguyên hình ảnh Vanguard**.
7. **Test:**
   - sửa test "gives only Vanguard a travelling bolt" thành danh sách tàu đã có công thức;
   - thêm test cho trường mới;
   - `pnpm test`.
8. **Trang xem thử:** thêm tham số `?ship=<id>`, hiện đang cố định Vanguard trong `shot-gallery.ts` (việc 9-4). Chụp ở 1642×799 DPR 2, cả tốc độ thường và `t=0.1`, phóng to kiểm tra cạnh cứng và màu nền lem.
9. `pnpm build` (có bước kiểm ảnh đạn), `pnpm build:space`, rồi báo chủ dự án tải lại trang và chơi bằng tàu đó.

---

## 7. Thiết kế đề xuất cho 10 phi thuyền còn lại

### 7.1 Ý tưởng theo tàu

Claude từng phác đủ 11 kiểu bằng code. Bản phác bị bỏ khi chủ dự án yêu cầu làm Vanguard trước, nhưng ý tưởng vẫn dùng được:

| Tàu (archetype) | Màu | Đầu đạn | Đuôi | Khi trúng | Cần thêm vào code |
|---|---|---|---|---|---|
| Aegis (`heavy`) | `#69eac7` / `#dffff6` | Quả cầu plasma nặng, lõi xoáy, ánh khiên lục giác | Ngắn, dày | Sóng xung kích và mảnh vỡ | Bay chậm hơn (khoảng 2500), nòng ở 2 tháp `[±22,-30]` |
| Volt (`electric`) | `#59dcff` / `#fff47e` | Cầu sét, tia điện vàng quanh | Gấp khúc, lập loè | Sét phân nhánh | `trail: "zigzag"` (lệch ngang ngẫu nhiên, đổi khoảng 30 lần/giây) |
| Wraith (`shadow`) | `#b77cff` / `#f0ddff` | Phi tiêu vật chất tối: lõi đen, viền tím | Khói tím sẫm | Nổ ngược vào trong | **Ảnh có kênh alpha** (lõi tối không vẽ được bằng cộng sáng). Cần chế độ tách nền xanh trong `prepare-fx` (dùng lại `ensureTransparency` của `prepare-kit`) và vẽ `source-over` |
| Fortune (`star`) | `#ffd95c` / `#fff5b5` | Ngôi sao 4 cánh vàng, lật như đồng xu | Kim tuyến lấp lánh | Nổ sao và đốm sáng | `spin` + `tumble` (co một trục theo `|cos|`, tạo cảm giác 3D) |
| Arsenal (`barrage`) | `#ff7658` / `#ffd184` | Tên lửa nhỏ, thân kim loại, lửa đuôi | Lửa và khói | Quả cầu lửa và khói | Thân đặc (**ảnh alpha**), bay tăng tốc, cong nhiều, 4 bệ phóng |
| Oracle (`mystic`) | `#e184ff` / `#83eaff` | Quả cầu rune trong 2 vòng nghiêng | **Xoắn kép 2 màu** (sợi gần sáng và dày hơn) | Vòng ấn chú | `trail: "helix"` |
| Bastion (`guard`) | `#63e9bc` / `#9ce8ff` | Mảnh khiên lục giác lộn nhào | Dải đôi | Gợn lục giác | `tumble` |
| Reaper (`slash`) | `#ff557a` / `#d58cff` | Lưỡi liềm xoay nhanh | Dải cong đỏ thẫm | Hai vết chém chéo | `spin` nhanh, nòng ở 2 mép cánh `[±30,-14]` |
| Celestial (`radiant`) | `#9ac8ff` / `#ffe99d` | Tia sáng trắng vàng, loé chữ thập | Dài, bụi sáng | Chữ thập loé và vòng hào quang | Không cần thêm |
| Zenith (`cosmic`) | `#d9fcff` / `#9b8cff` | Sao chổi nhân trắng, quầng tinh vân 2 màu, sao nhỏ bay quanh | Xoắn tinh vân | Hai vòng nova | `trail: "helix"` |

### 7.2 Mẫu prompt Gemini (thay phần in nghiêng theo tàu)

1. **`<ship>-bolt`:** *Game VFX sprite for a top-down 2D space shooter, painted high-detail style matching the `<ship description>`. One `<projectile description>` flying to the RIGHT, `<core/colour details>`, a short soft tail flare fading to black behind it. Horizontal, centered, about 70% of the width, wide empty margin, nothing touches the edges. Pure black background #000000, no stars, no nebula, no text, no shadow. Light only: every pixel that is not glowing must be pure black. 2:1 aspect ratio, highest resolution.*
2. **`<ship>-finisher`:** *Same style as the `<ship>` projectile but larger and more powerful: `<heavier variant>`, pointing RIGHT, … (same background and light-only rules), 2:1.*
3. **`<ship>-impact`:** *Game VFX sprite, top-down view: a `<colour>` `<impact description>` — blinding white core, … Centered round composition, about 75% of the square, nothing touches the edges. Pure black background #000000, no text. Light only. 1:1 square, highest resolution.*
4. **`<ship>-muzzle`:** *Game VFX sprite: a short punchy `<colour>` muzzle flash pointing RIGHT — bright white core on the left, a flared cone of light and a few sparks opening to the right. Centered, nothing touches the edges. Pure black background #000000, no text. Light only. 2:1 aspect ratio.*

Phần đặc (thân tên lửa, lõi vật chất tối): xin ảnh **trên nền xanh phẳng `#00FF00`**, rồi thêm chế độ alpha vào `prepare-fx` như ghi ở 7.1.

---

## 8. Nhật ký lỗi đã gặp và cách xử lý

1. **Đạn bản đầu trông như cây kim hay tia laser mảnh** → đầu đạn to gấp khoảng 1,5 lần, quầng sáng mạnh hơn, đuôi 3 lớp, thon chậm hơn (`0,1 + 0,9·u^1,3` thay vì `u²`), bụi sáng to và nhiều hơn.
2. **Vụ nổ xảy ra trước khi đạn tới** (kẻ địch bị xoá ngay khi gõ chữ cuối) → tách `ShotImpact` (mục 4), giữ bóng kẻ địch và bóng đạn địch tới khi đạn chạm.
3. **Vòng vỡ khiên sinh ra lúc đạn chạm bị trừ tuổi ngay trong khung hình đó** → cập nhật đạn **sau** các vòng giảm tuổi trong `updateEffects`.
4. **Hệ đạn tự kẹp bước thời gian 0,1 giây**, nên với bước lớn đạn tới muộn hơn các hiệu ứng khác → bỏ kẹp, để `Game` quyết định như mọi hiệu ứng khác.
5. **Hệ số bụi sáng theo bậc chất lượng khai báo mà không dùng** → `update(dt, aim, quality)`; `Game` và trang xem thử truyền bậc hiện tại.
6. **Ngọn giáo vẽ tay bị đuôi trắng rộng phủ mất, đuôi thành cái nêm cạnh cứng** → "vệt tàn": bề rộng 45%, bắt đầu sau thân giáo; quầng đuôi chia 2 lớp lồng nhau mờ dần.
7. **Ảnh `bolt` bỏ nhầm (thiên thạch nền xanh)** → `prepare-fx` kiểm tra nền đen và từ chối với hướng dẫn rõ; đạn thường tạm dùng `finisher`.
8. **`category` lạ trong manifest làm game từ chối cả manifest** (ảnh phi thuyền cũng mất) → dùng `"projectile"`, có ghi chú ngay trong code.
9. **Mất phần đạn khi ghép sang nhánh `feat/bgv-integration-current`:** 4 file mới không được commit, `Game.ts` import file không tồn tại, AI kia gỡ phần đạn cho build chạy.
   - Cách xử lý: lấy phần sửa `Game.ts` từ commit `762b257` (`git diff e3ed276 762b257 -- src/Game.ts`), áp bằng `git apply --3way` lên `Game.ts` mới. Không xung đột; điểm thưởng và số điểm bật lên của AI kia vẫn giữ.
   - Kiểm tra: kiểm tra kiểu, 864/864 test.
10. **Cũng trong lần ghép đó, `.gitignore`, `art-src/README.md` và một đoạn trong `docs/LOCAL_ASSETS_README.md` bị mất** → lấy lại từ `762b257`.
11. **Tách hàm dùng chung ra `art-common.mjs`** có thể làm hỏng script ảnh nền → chạy lại `pnpm bg:prepare g01-celestial`, `kit.json` giống hệt từng byte.

---

## 9. Việc còn lại

1. **P0 — Commit** toàn bộ file (lệnh ở tin nhắn của Claude), rồi chủ dự án duyệt Vanguard bằng mắt.
2. **P0 — Tạo lại `vanguard-bolt`.** Prompt:

   > *Game VFX sprite for a top-down 2D space shooter, painted high-detail style matching a sleek white-and-blue fighter with glowing cyan crystals. One cyan plasma lance projectile flying to the RIGHT: long needle-shaped white-hot core inside a luminous cyan energy sheath with subtle crystalline facets and tiny electric filaments, a bright star glint at the tip, a short soft tail flare fading to black behind it. Horizontal, centered, about 70% of the width, wide empty margin, nothing touches the edges. Pure black background #000000, no stars, no nebula, no text, no shadow. Light only: every pixel that is not glowing must be pure black. 2:1 aspect ratio, highest resolution.*

   Sau đó chạy `pnpm fx:prepare vanguard --tool="Google Gemini"` và `pnpm build:space`.
3. **P1 — Phi thuyền tiếp theo** theo mục 6 và 7. Hỏi chủ dự án muốn tàu nào; gợi ý Aegis, vì chỉ cần thêm tuỳ chỉnh tốc độ và độ dày.
4. **P1 — Tham số `?ship=`** cho trang xem thử.
5. **P2 — Âm thanh bắn riêng từng tàu.** Hiện mọi tàu dùng `sfx.shot`. AI kia từng làm âm thanh đạn riêng, rồi gỡ trong loạt "revert"; hỏi chủ dự án trước.
6. **P2 — Xoá tia laser cũ** (`lasers`, `drawLasers`, kiểu `Laser`) khi cả 11 tàu đã có đạn mới.

---

## 10. Checklist trước khi báo "xong"

- [ ] `pnpm test` đạt.
- [ ] `pnpm build` đạt, và dòng `Shot FX: … kit(s)` hiện ra.
- [ ] Ảnh mới: đã chạy `pnpm fx:prepare <ship>`, đã xem `public/assets/space-typing/fx/<ship>/` (nền đen, không lộ khung).
- [ ] Trang xem thử ở 1642×799 DPR 2: tốc độ thường và `t=0.1`; phóng to kiểm tra đầu đạn rõ chi tiết, đuôi không có cạnh cứng.
- [ ] Chơi thật bằng tàu đó: vụ nổ trùng lúc đạn chạm, kẻ địch bị hạ không biến mất trước khi nổ, nhãn chữ không bị đạn che.
- [ ] Tàu chưa làm vẫn bắn tia laser như cũ.
- [ ] `pnpm build:space`, rồi báo chủ dự án (tiếng Việt) chỉ cần tải lại trang, kèm ảnh chụp.
- [ ] Commit **đủ file mới** cùng file dùng chúng (bài học ở 0.6).

---

## Phụ lục — Lệnh và tham số

| Việc | Lệnh |
|---|---|
| Xử lý ảnh đạn | `cd games/space-typing && pnpm fx:prepare vanguard --tool="Google Gemini"` |
| Xem thử (dev) | `cd /Users/jokerit/htdocs/typing-game && pnpm dev:space`, mở `http://127.0.0.1:3004/shot-gallery.html` |
| Chơi thật | `pnpm build:space && ./play.sh` (thư mục gốc), rồi tải lại trang |
| Test | `cd games/space-typing && pnpm test` |

Tham số của trang xem thử:
- `q=low|medium|high|ultra`: bậc chất lượng.
- `cps=<phím/giây>`: tốc độ tự gõ, mặc định 8.
- `t=<tốc độ thời gian>`: `0.1` là quay chậm.
- `art=0`: dùng bản vẽ bằng code để so sánh.
- `panel=0`: ẩn bảng điều khiển.
- Phím `H`: ẩn hoặc hiện bảng điều khiển.
- `window.__shotGallery`: `{ shots, targets }`, dùng để soi trạng thái.
