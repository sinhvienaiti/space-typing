# Space Typing — Đạn của phi thuyền (Player Shots): tài liệu bàn giao

> **Ngày:** 28/09/2026 · **Người viết:** Claude Code · **Người nhận:** ChatGPT (hoặc AI lập trình khác) làm tiếp, và chủ dự án.
>
> **Phạm vi:** hệ đạn mới của người chơi trong `games/space-typing`. Đã làm xong bản thử cho **phi thuyền đầu tiên, Vanguard**. **10 phi thuyền còn lại vẫn dùng tia laser cũ**, chờ làm tiếp theo tài liệu này.
>
> **Tài liệu liên quan:** hình nền BGV — [BACKGROUND_VISUAL_REBOOT_HANDOFF.md](BACKGROUND_VISUAL_REBOOT_HANDOFF.md). Hai hệ này độc lập; đạn chỉ dùng chung quy trình xử lý ảnh (`scripts/bg-art/`). Nhạc nền World 01 — [MUSIC_WORLD_01.md](MUSIC_WORLD_01.md).
>
> **Cập nhật 28/09 (đợt 4):** làm lại **tiếng trúng quái**: bản cũ nhỏ hơn nhạc nền khoảng 25 dB nên chủ dự án không nghe thấy, và tàu dùng laser cũ thì không có tiếng trúng. Xem 2.1, 4.1 và lỗi 18.
>
> **Cập nhật 28/09 (đợt 3):** quái thưởng giờ cũng bị bắn bằng đạn thật; phi thuyền **xoay mũi về phía mục tiêu** khi bắn, nòng súng xoay theo; **bộ đèn mới cho Vanguard** (lửa phụt đúng 2 ống, lõi pha lê, đèn cánh, hào quang, tia lửa phía sau). Xem mục 2.1, 4.1, 4.3 và 8 (lỗi 13–17).

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
7. **Tự nhìn trước khi báo.** `pnpm visual:shot` chụp màn hình game bằng Chrome chạy ngầm, rồi AI mở ảnh ra xem. Hướng dẫn: [VISUAL_TESTING.md](VISUAL_TESTING.md). Mọi ảnh chụp trong tài liệu này đều làm theo cách đó.

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
- **Khi trúng:** loé trắng và quầng màu, ảnh vụ nổ hình sao vẽ tay nở ra rồi mờ dần (mỗi phát xoay một góc khác), tia lửa bắn ra.
- **Tiếng trúng** (`Sfx.boltImpact(power, pan, variant)`), gồm các lớp:
  - tiếng "tách" sáng (nhiễu lọc dải);
  - tiếng "bụp" giữa và tiếng trầm có lực;
  - với Vanguard (`"crystal"`): tiếng ngân pha lê trên một nốt của thang La thứ ngũ cung (Sol, La, Đô, Rê, Mi ở quãng cao). Không lặp lại nốt vừa phát, nên gõ liên tục nghe như chuỗi chuông cùng giọng với nhạc World 01. Phát hạ gục ngân nốt La và thêm tiếng "vút" lấp lánh đi lên;
  - với tàu còn dùng laser (`"energy"`): tiếng "xẹt" điện thay cho tiếng ngân.
  - Tiếng lệch trái/phải theo vị trí quái (tối đa 60%). Các phát cách nhau dưới 32 ms được gộp.
  - Độ to, đo ở âm lượng mặc định: đỉnh khoảng −23 dBFS; phát hạ gục −21; laser −25. Làm mốc: tiếng bắn hạ đạn địch khoảng −19; nhạc nền World 01 khoảng −27 LUFS. Bản đầu chỉ −41 dBFS.
- **Quái khựng lại khi trúng:** dừng tiến 0,06 giây mỗi phát (0,16 giây khi vỡ khiên), thân bật lùi mạnh hơn và rung ngang 0,12 giây. Nhãn chữ đứng yên để dễ đọc.
- **Loé nòng súng:** ảnh vẽ tay, ghim gốc vào nòng.
- **Cảm giác chiều sâu:** đạn nhỏ dần khi bay lên, nhưng chỉ tới 74%, để đạn ở xa vẫn dễ nhìn.
- **Dự phòng:** mọi phần đều có bản vẽ bằng code khi thiếu ảnh (xem `?art=0` ở trang xem thử).
- **Quái thưởng** (hộp tiếp tế, drone kho báu, hộp chọn thưởng, hộp dị thường, mục tiêu Recall): mỗi chữ cũng bắn 1 viên thật, nhắm đúng chỗ hộp đang lắc lư. Phát cuối: phần thưởng tính ngay, còn vụ nổ và tiếng nhặt thưởng xảy ra khi đạn chạm (mục 4.1).
- **Phi thuyền xoay về phía mục tiêu** (mọi tàu, không chỉ Vanguard): mỗi phát xoay ngay 55% góc, phần còn lại xoay dần; bám theo mục tiêu đang di chuyển trong 0,8 giây, rồi từ từ quay mũi lên. Tối đa ±55°. Nòng súng xoay theo thân tàu, nên đạn luôn ra đúng nòng đang vẽ (mục 4.3).
- **Giật lùi và tăng lửa:** mỗi phát đẩy thân tàu lùi tối đa 2,4 px (phát hạ gục mạnh hơn); gõ càng nhanh thì lửa phụt càng dài và sáng.
- **Bộ đèn mới của Vanguard** (ảnh `docs/player-shots/vanguard-ship-lights.jpg`: bay êm · đèn cánh nháy · đang xoay bắn): lửa phụt 3 lớp ra đúng 2 ống, có "vòng kim cương" như động cơ phản lực; lõi pha lê thở sáng và loé khi bắn; tia sáng lấp lánh trên mũi pha lê mỗi khoảng 3 giây; đèn nháy đầu cánh; hào quang mờ ôm theo viền tàu; tia lửa phụt ra phía sau và trôi tự do, nên khi tàu xoay thì vệt lửa uốn cong.

### 2.2 Ảnh chụp (`docs/player-shots/`)

| File | Nội dung |
|---|---|
| `vanguard-gameplay-speed.jpg` | Tốc độ thường, 11 phím/giây, khung 1642×799 DPR 2 (kích thước chơi thật của chủ dự án) |
| `vanguard-slow-motion.jpg` | Quay chậm (`t=0.1`) |
| `vanguard-closeup.jpg` | Phóng to: ngọn giáo, vệt đuôi, loé nòng súng, vụ nổ |
| `vanguard-sprites-source.jpg` | 4 ảnh gốc chủ dự án gửi. Ảnh `bolt` bị nhầm (xem 9) |
| `vanguard-sprites-processed.jpg` | 3 ảnh sau khi xử lý (nền đen tuyệt đối, đã gỡ logo) |
| `vanguard-ship-lights.jpg` | Bộ đèn mới, phóng to: bay êm · đèn cánh trái nháy · đang xoay bắn sang trái (lửa dài hơn khi gõ nhanh) |

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
| `src/characters/ship-motion.ts` | **Chuyển động tàu khi bắn:** `ShipMotion` (góc xoay `aim`, giật lùi `recoil`, tăng lửa `boost`), `shipAimAngle`. Chỉ tính số, không vẽ; `Game` và trang xem thử dùng chung. |
| `src/characters/ship-lights.ts` | **Bộ đèn của tàu:** `ShipLightRig` (vị trí ống phụt, lõi, đầu cánh, màu), `drawShipHalo` (vẽ dưới thân), `drawShipLights` (vẽ trên thân). Hiện chỉ có Vanguard. |
| `src/vfx/ship-exhaust.ts` | **Tia lửa phía sau tàu:** `ShipExhaust`, bể hạt `Float32Array` cố định (192 hạt), trôi trong không gian màn hình. |
| `src/characters/renderer.ts` | Vẽ tàu. Mới: tuỳ chọn `aim`/`recoil`/`boost`; `characterShipPoint` và `characterShipAngle` (đổi điểm trên thân tàu ra toạ độ màn hình, **đúng phép biến đổi lúc vẽ**); `activeShipLightRig` (chỉ bật với ảnh tàu V3). |
| `tests/player-shots.test.ts` | 16 test: công thức, bay, bám mục tiêu, đuôi tan, chuỗi đạn gõ nhanh, `fx.json`, chọn ảnh, tích hợp `Game` (khựng, tiếng trúng, tàu xoay, quái thưởng, laser cũ). |
| `tests/ship-motion.test.ts` | 10 test: góc xoay và giới hạn, bám mục tiêu rồi quay về, giật lùi và tăng lửa, toạ độ nòng khi tàu xoay, bộ đèn Vanguard, tia lửa theo bậc chất lượng. |
| `tests/projectile-intercept-sfx.test.ts` | Bắn hạ đạn địch: đạn bay tới rồi mới vỡ; tàu chưa có đạn mới vẫn dùng laser. |

### 3.2 Vòng đời một viên đạn

```
Gõ đúng 1 chữ ──► Game.firePlayerShot(x, y, power, impact)
                   │  shipMotion.fire(): tàu xoay mũi về (x, y), giật lùi, tăng lửa
                   │  characterShipPoint(): tâm tàu và góc xoay đúng như sẽ vẽ
                   │  tàu có công thức?  không ─► tia laser cũ (từ mũi tàu) + applyShotImpact() ngay
                   │  có
                   ▼
PlayerShotSystem.fire()  ─ chọn nòng (luân phiên; phát hạ gục dùng mũi tàu), xoay theo originAngle
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
- **Chiều sâu:** `shotDepthScale(originY, y, viewHeight)` giảm từ 1 xuống `MIN_DEPTH_SCALE` (0,74) khi đạn bay lên. Áp dụng cho bề rộng đuôi, đầu đạn và chiều dài ảnh. Bản đầu cho co tới 0,6, và chủ dự án thấy đạn quá nhỏ.

### 3.3 Công thức đạn (`ShotRecipe`, trong `RECIPES` theo archetype)

Giá trị hiện tại của Vanguard (`spear`):

| Trường | Giá trị | Ý nghĩa |
|---|---|---|
| `speed` | 3300 | px/giây (thời gian bay còn bị kẹp 0,08–0,26 giây) |
| `bend` | 0,07 | độ cong theo phần khoảng cách |
| `trailShare` / `trailMaxPx` | 0,55 / 240 | độ dài đuôi |
| `width` | 8 | bán kính đầu đạn và nửa bề rộng đuôi (px) khi ở gần |
| `stretch` | 5 | độ dài lõi trắng khi vẽ bằng code |
| `sparkleRate` | 90 | bụi sáng mỗi giây ở High (nhân hệ số theo bậc) |
| `muzzles` / `finisherMuzzle` | `[[-21,-12],[21,-12]]` / `[0,-36]` | vị trí nòng khi tàu thẳng mũi, tính từ tâm tàu (tàu vẽ ở cỡ 78 px). Khi tàu xoay, `fire()` tự xoay các điểm này theo `originAngle` |
| `fx` | `"vanguard"` | thư mục ảnh trong `public/assets/space-typing/fx/` (`null` = chỉ vẽ bằng code) |
| `boltLength` / `finisherLength` | 128 / 190 | chiều dài ảnh đầu đạn (px, trước hệ số chiều sâu). Đã tăng khoảng 40% theo góp ý ngày 28/9 |
| `impactSize` / `muzzleLength` | 118 / 60 | cỡ vụ nổ (phát hạ gục ×1,35), cỡ loé nòng súng (phát hạ gục ×1,4) |

`shotRecipeFor(characterId)` trả `null` cho tàu chưa có công thức. Khi đó `Game` dùng tia laser cũ.

### 3.4 Thứ tự vẽ trong `Game.draw()`

1. Tia laser cũ, rồi **đạn và đuôi** (`playerShots.drawShots`), vẽ **dưới kẻ địch** để nhãn chữ luôn đọc được.
2. Hạt, vòng vỡ khiên, đạn địch, **bóng đạn địch đã bị bắn hạ** (`interceptedProjectiles`).
3. Kẻ địch, rồi **bóng kẻ địch chờ nổ** (`dyingEnemies`).
4. Boss, rồi **vụ nổ khi trúng** (`drawImpacts`), vẽ trên kẻ địch.
5. **Tia lửa phía sau tàu** (`shipExhaust.draw`), rồi phi thuyền: hào quang → thân tàu → lửa phụt, lõi, đèn cánh. Cuối cùng là **loé nòng súng** (`drawMuzzleFlashes`).

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
| `enemy-hit` | `typeTarget` (mỗi chữ); phản đạn (`fireLaser(enemy, 0.75)`) | đếm chữ, điểm, chuỗi combo, năng lượng | kẻ địch loé, giật (1,6), **khựng 0,06 giây và rung**, tia lửa (8, hoặc 12 nếu `power > 1`), `sfx.boltImpact(power)` |
| `enemy-layer` | `completeWord`, còn lớp khiên | đổi từ mới, điểm, năng lượng | loé, giật 1,9, **khựng 0,16 giây và rung**, khựng hình (`triggerImpactFeedback("word")`), tia lửa theo họ kẻ địch, `sfx.hit` + `sfx.boltImpact(1.25)` |
| `enemy-kill` | `completeWord`, lớp cuối | hạ gục, điểm thưởng (`enemyKillRewardScore`), số điểm bật lên, rơi đồ, phần thưởng, đặc tính khi chết, xoá khỏi `enemies` | khựng hình, tia lửa, vụ nổ theo họ kẻ địch, `sfx.hit` + `sfx.kill` + `sfx.boltImpact(1.45)`, rung màn hình (6,5 với tank, 4,5 với loại khác), xoá bóng |
| `boss-hit` | `typeBoss` (mỗi chữ) | sát thương boss, điểm | boss loé và giật (1,4), tia lửa, `sfx.boltImpact(0.9)`. Boss không bị khựng. |
| `intercept` | gõ chữ trên đạn địch | xoá đạn địch, điểm, `sfx.projectileIntercept` | vòng vỡ khiên, 28 tia lửa, rung nhẹ, xoá bóng |
| `bonus-hit` | `typeSupplyPod`, `typeTreasureDrone`, `typeRewardChoiceCrate`, `typeAnomalyCrate`, `typeRecallBonus` (mỗi chữ trừ chữ cuối), qua `fireBonusShot` | điểm, chuỗi combo, năng lượng (như trước) | tia lửa màu của hộp (7–8 hạt), `sfx.boltImpact(0.8)` |
| `bonus-collect` | chữ cuối của các hộp trên | **phần thưởng, điểm, rơi đồ, bảng chọn thưởng, thông báo, xoá hộp** | xoá bóng hộp, vụ nổ lớn màu của hộp (34–54 hạt), `sfx.support` + `sfx.boltImpact(1.3)` |

- Cú khựng và rung **chỉ có khi đạn thật chạm** (`fromBolt = true`). Tia laser cũ không có, và có test khoá hành vi này. Tàu nào có đạn mới thì tự có cú khựng.
- **Tiếng trúng thì tàu nào cũng có:** `applyShotImpact` gọi `sfx.boltImpact(sức, pan, variant)` ở mọi kiểu trúng (trừ `intercept`, vốn đã có tiếng riêng lúc gõ). `variant` = `"crystal"` khi đạn thật chạm, `"energy"` với laser cũ. `pan` = vị trí x của mục tiêu, đổi sang −1…1, nhân 0,6. Sức: trúng thường = `power` của phát bắn; vỡ khiên 1,25; hạ gục 1,45; boss 0,9; hộp thưởng 0,8; nhặt hộp 1,3.
- Cú khựng là thay đổi lối chơi nhỏ: quái bị gõ tiến chậm lại. Thời lượng nằm ở các hằng số `HIT_STUN_SECONDS` (0,06), `LAYER_STUN_SECONDS` (0,16), `HIT_SHAKE_SECONDS` (0,12) trong `Game.ts`.
- Các phần boss khác (hết từ, vỡ khiên, bị hạ) giữ nguyên, xảy ra ngay.
- Hạ gục bằng kỹ năng (`resolveSkillEnemyKill`, ví dụ bom chữ) không đi qua đạn, vẫn nổ ngay.

### 4.2 Các hàm chính

- `firePlayerShot(x, y, power, impact, laserLife = 0.085)`:
  - Nếu tàu có công thức: bắn đạn, rồi đưa kẻ địch bị hạ vào `dyingEnemies` và đạn địch bị bắn hạ vào `interceptedProjectiles`.
  - Nếu không: vẽ tia laser cũ và gọi `applyShotImpact` ngay. Tàu chưa làm vì vậy **y hệt trước**.
- `fireLaser(enemy, power)` và `fireBossLaser(power)`: lớp bọc mỏng quanh `firePlayerShot`.
- `aimPlayerShot`: tìm vị trí hiện tại của mục tiêu (kẻ địch còn sống, bóng kẻ địch, boss, đạn địch). Trả `false` thì đạn bay tới điểm cuối cùng đã biết.
- `applyShotImpact(impact, x, y, fromBolt)`: phần nhìn trong bảng 4.1. `fromBolt` là `true` khi đạn chạm, `false` với tia laser cũ.
- `staggerEnemy(enemy, seconds)` đặt `enemy.hitStun` và `enemy.hitShake` (trường tuỳ chọn của `Enemy` trong `types.ts`). Vòng cập nhật kẻ địch nhân tốc độ tiến với 0 khi `hitStun > 0`. `hitShakeOffset(enemy)` chỉ dịch **thân** quái sang ngang khi vẽ (`translate` của thân trong `drawEnemy`), không dịch nhãn chữ.
- `clearPlayerShots()`: gọi ở cả 4 chỗ đặt `this.lasers = []` (Test Lab ×2, bắt đầu màn, về tiêu đề).
- Trong `updateEffects`, đạn được cập nhật **sau** các vòng giảm tuổi hiệu ứng. Nhờ vậy vòng vỡ khiên và tia lửa sinh ra lúc đạn chạm bắt đầu với đủ tuổi thọ.
- `preloadShotArt(characterId)` được gọi trong constructor và `setCharacter`. Không có trình duyệt (khi test) thì bỏ qua.
- `fireBonusShot(aim, hue, count, collect)`: đạn cho quái thưởng. `aim` là hàm ghi vị trí **đang vẽ** của hộp, gồm cả độ lắc lư (`supplyPodAim`, `treasureDroneAim`, `recallBonusAim`, `rewardCrateAim`, `anomalyCrateAim`). Công thức lắc lư dùng chung với hàm vẽ (`supplyPodBob`, `treasureDroneBob`, `recallBonusBob`, `rewardCrateSway`, `anomalyCrateSway` ở đầu `Game.ts`), nên đạn trúng đúng hộp. Phát cuối truyền `collect` (hàm vẽ lại hộp) vào `bonusGhosts`; hộp được vẽ tới khi đạn chạm.
- Hộp đã nhặt không còn được cập nhật, nên nó đứng yên ở vị trí cuối, và `aim` trả đúng vị trí đó.

### 4.3 Phi thuyền: xoay theo mục tiêu, ánh sáng, hào quang, phản lực

**Chuyển động** (`ShipMotion`, `src/characters/ship-motion.ts`; góc tính bằng radian, chiều kim đồng hồ, 0 = mũi thẳng lên):

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `SHIP_AIM_LIMIT` | 0,96 (≈ 55°) | góc xoay tối đa mỗi bên, để dáng tàu vẫn dễ nhận ra |
| `SHIP_AIM_SNAP` | 0,55 | phần góc xoay ngay lúc bấm phím; phần còn lại xoay dần |
| `SHIP_AIM_HOLD_SECONDS` | 0,8 | thời gian giữ hướng và bám mục tiêu sau phát cuối |
| tốc độ bám / quay về | 18 / 3,4 mỗi giây | bám nhanh, quay về từ tốn |
| giật lùi | +0,55 mỗi phát, +1 với phát hạ gục (`power >= 1.3`), giảm 14/giây | nhân với `SHIP_RECOIL_PX` = 2,4 px |
| tăng lửa (`boost`) | +0,28 mỗi phát, giảm 2,2/giây | khoảng 3 phím/giây thì lửa nhỏ, từ 8 phím/giây thì gần tối đa |

- `Game.firePlayerShot` gọi `shipMotion.fire()` **trước khi** tính nòng, rồi lấy tâm và góc tàu bằng `characterShipPoint` / `characterShipAngle` với `shipDrawOptions(lastDrawTime)`. Nhờ vậy đạn ra đúng nòng của khung hình sắp vẽ. `lastDrawTime` là thời gian của khung vẽ gần nhất (phím bấm nằm ngoài vòng vẽ).
- `trackShipTarget` dùng lại `aimPlayerShot` với phát bắn cuối (`shipAimImpact`), nên tàu bám được cả quái, boss, đạn địch và hộp thưởng.
- Tia laser cũ và đường ngắm mờ (`drawTargetLine`) giờ xuất phát từ **mũi tàu** (`SHIP_NOSE_OFFSET` = 30 px phía trước tâm).
- Tâm tàu vẽ có dao động nhẹ (`driftX` tới ±7,5 px, `bob` tới khoảng ±8,6 px). Trước đây đạn bắn ra từ tâm không dao động, nên lệch khỏi nòng. `characterShipPoint` đã tính cả phần này.

**Bộ đèn** (`ShipLightRig`, `src/characters/ship-lights.ts`) — chỉ bật khi đang dùng ảnh tàu V3 (`activeShipLightRig`), vì các điểm neo đo trên ảnh đó:

| Phần | Vanguard | Cách vẽ |
|---|---|---|
| Ống phụt `nozzles` | `[-13, 23.5]`, `[13, 23.5]` | 3 lớp lửa (lam ngoài → cyan → lõi trắng) treo từ miệng ống; 3 "vòng kim cương" chạy dọc tia lửa; đốm nóng ở miệng ống loé khi bắn. Lửa rung theo 3 nhịp lệch nhau để không đập đều |
| Lõi `core` / `coreRadius` / `glint` | `[0, -12]` / 13 / `[0, -25]` | ánh sáng thở chậm trong pha lê, loé khi bắn; tia sáng hình sao ở mũi pha lê mỗi khoảng 3 giây |
| Đầu cánh `tips` | `[-33, 17.5]`, `[33, 17.5]` | đốm sáng dịu cố định + nháy ngắn, trái rồi phải |
| Hào quang | màu `halo` | chính viền tàu, tô màu và làm nhoè một lần (đóng dấu 36 lần quanh 3 vòng), vẽ to hơn thân một chút và **dưới** thân, độ đục chỉ khoảng 0,24 |
| Tia lửa phía sau | `ShipExhaust` | bắn ra dọc trục tàu, rồi trôi tự do, chảy xuống theo không gian (70 px/giây). Số hạt mỗi ống mỗi giây: Low 10, Medium 28, High 46, Ultra 66 (tăng thêm tới 80% khi `boost` cao) |

- Đổi toạ độ ảnh sang toạ độ trên thân tàu: ô ảnh V3 cỡ 256 px, tàu vẽ rộng 78 px, nên `toạ độ = (pixel − 128) × 78 / 256`. Ví dụ ngọn lửa vẽ sẵn của Vanguard nằm ở pixel x 85 và 171, rời ống ở pixel y khoảng 204.
- Mọi lớp sáng là ảnh gradient tạo sẵn (lửa 32×128, quầng 64×64, hào quang 128×128 mỗi tàu), vẽ bằng `drawImage` với chế độ cộng sáng. **Không dùng `shadowBlur`**. Bộ cũ (`drawFlightTail`, `drawEngine`) dùng `shadowBlur`, nên bộ mới nhẹ hơn.
- Bậc Low (`detailScale` < 0,7) bỏ vòng kim cương và tia sáng lấp lánh.
- Màn chọn tàu (`main.ts`) cũng vẽ bằng `drawCharacterShip`, nên thẻ Vanguard có luôn bộ đèn mới (ảnh tĩnh).
- **Các tàu khác vẫn dùng lửa cũ** cho tới khi chủ dự án duyệt Vanguard (quy tắc làm thử một cái trước). Thêm cho tàu khác: đo điểm neo trên ảnh V3 của tàu đó rồi thêm vào `RIGS`.

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
- **Đuôi khi đầu đạn là ảnh ("vệt tàn"):** bề rộng chỉ còn 55%, và bắt đầu lùi sau mũi `0,7 × anchorX × chiều dài ảnh`, tức phần đuôi của thân giáo. Nếu để đuôi rộng và bắt đầu từ mũi thì thân giáo vẽ tay bị chìm, và đuôi thành cái nêm phẳng cạnh cứng.
- **Vụ nổ:**
  - Có loé trắng trong 30% đầu tuổi thọ, và một quầng màu bằng khoảng 0,6 lần cỡ vụ nổ.
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
5. **Tiếng trúng:** mỗi tàu nên có tiếng riêng. Thêm một giá trị vào `ImpactVariant` trong `Sfx.ts` (ví dụ `"storm"` cho Volt: tiếng sét lách tách), viết nhánh riêng trong `boltImpact`, rồi chọn variant theo tàu trong `applyShotImpact` (hiện là `fromBolt ? "crystal" : "energy"`).
   - `tone()` và `noise()` nhận thêm `VoiceShape`: `pan`, `attack` (độ vào tiếng), `filter`/`frequency`/`q` (lọc nhiễu, ví dụ `"bandpass"`).
   - **Đo độ to trước khi báo** bằng `scripts/visual/evals/sfx-levels.js` (mục phụ lục). AI không nghe được, nên phải so bằng số: tiếng trúng thường nên có đỉnh quanh −23 dBFS ở âm lượng mặc định.
6. **Thêm công thức** vào `RECIPES`, theo archetype của tàu:
   - `fx: "<ship>"`, các cỡ ảnh, `muzzles` (đo trên ảnh tàu: tàu vẽ ở cỡ 78 px, tâm ở giữa), tốc độ, độ cong.
   - Công thức gắn với archetype, và mỗi archetype hiện chỉ thuộc đúng một tàu.
7. **Nếu thiết kế cần cách bay hoặc cách vẽ mới** (xem 7.1: tia điện gấp khúc, đuôi xoắn, khói, vật đặc...):
   - thêm trường vào `ShotRecipe` (ví dụ `trail: "ribbon" | "zigzag" | "helix" | "smoke"`, `spin`, `tumble`, `solid`);
   - rẽ nhánh trong `drawTrail`/`drawHead`/`drawImpact`;
   - **giá trị mặc định phải giữ nguyên hình ảnh Vanguard**.
8. **Test:**
   - sửa test "gives only Vanguard a travelling bolt" thành danh sách tàu đã có công thức;
   - thêm test cho trường mới;
   - `pnpm test`.
9. **Bộ đèn của tàu** (sau khi chủ dự án duyệt bộ đèn Vanguard): đo vị trí ống phụt, lõi, đầu cánh trên ảnh V3 của tàu (công thức ở 4.3), thêm một mục vào `RIGS` trong `ship-lights.ts`, chọn màu theo `characterVisualProfile`. Nòng súng trong `RECIPES` cũng đo trên cùng ảnh đó. Tàu xoay theo mục tiêu thì tự có, không cần làm gì thêm.
10. **Trang xem thử:** thêm tham số `?ship=<id>`, hiện đang cố định Vanguard trong `shot-gallery.ts` (việc 9-4). Chụp ở 1642×799 DPR 2, cả tốc độ thường và `t=0.1`, rồi phóng to kiểm tra cạnh cứng và màu nền lem. Máy chủ dev tạm ở cổng 3098, xem [VISUAL_TESTING.md](VISUAL_TESTING.md):

   ```bash
   pnpm -s visual:shot "http://127.0.0.1:3098/shot-gallery.html?panel=0&cps=10" .visual/shots.png --wait=6000 --eval-file=scripts/visual/evals/shot-state.js
   pnpm -s visual:shot "http://127.0.0.1:3098/shot-gallery.html?panel=0&t=0.1" .visual/shots-slow.png --wait=8000
   pnpm -s visual:crop .visual/shots-slow.png .visual/bolt-zoom.jpg --rect=1300,900,900,700
   pnpm -s visual:shot "http://127.0.0.1:3098/" .visual/game.png --click=#startButton --wait=20000 --eval-file=scripts/visual/evals/game-assets.js
   ```

   `shot-state.js` cho biết ảnh đạn nào đã nạp. `game-assets.js` cho biết game thật đã tải `fx/<ship>/fx.json` chưa.
11. `pnpm build` (có bước kiểm ảnh đạn), `pnpm build:space`, rồi báo chủ dự án tải lại trang và chơi bằng tàu đó.

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
   - Kiểm tra lúc đó: kiểm tra kiểu, 864/864 test.
10. **Cũng trong lần ghép đó, `.gitignore`, `art-src/README.md` và một đoạn trong `docs/LOCAL_ASSETS_README.md` bị mất** → lấy lại từ `762b257`.
11. **Tách hàm dùng chung ra `art-common.mjs`** có thể làm hỏng script ảnh nền → chạy lại `pnpm bg:prepare g01-celestial`, `kit.json` giống hệt từng byte.
12. **Chủ dự án góp ý sau khi chơi (28/9): "trúng quái thiếu cảm giác, không có âm thanh hay hiệu ứng như đạn fantasy; quái nên khựng lại; đạn hơi nhỏ".**
    - Nguyên nhân: mỗi chữ trúng đích không có tiếng nào (chỉ có tiếng "tách" rất ngắn lúc bắn); quái chỉ giật nhẹ 7 px; đạn dài 92 px và co còn 60% khi bay xa.
    - Cách xử lý: thêm `Sfx.boltImpact`; thêm cú khựng (dừng tiến, giật mạnh hơn, rung thân); đạn to hơn khoảng 40%, chỉ co tới 74%; vụ nổ to hơn, có quầng màu, nhiều tia lửa hơn (10, hoặc 18 với phát hạ gục).
    - **Bài học cho các tàu sau:** mỗi kiểu đạn cần có **tiếng trúng riêng** và phản ứng trúng rõ ràng, không chỉ hình ảnh.
13. **Gõ quái thưởng không thấy đường đạn** (chủ dự án báo 28/9).
    - Nguyên nhân: 5 hàm `typeSupplyPod`, `typeTreasureDrone`, `typeRewardChoiceCrate`, `typeAnomalyCrate`, `typeRecallBonus` chỉ gọi `burst()` tại chỗ hộp và `sfx.shot()`, **chưa từng bắn đạn**, kể cả tia laser cũ. Mọi tàu đều bị.
    - Cách xử lý: thêm `bonus-hit` / `bonus-collect` và `fireBonusShot` (mục 4.1, 4.2). Tàu dùng laser cũ giờ cũng có tia laser tới hộp.
    - Chú ý: hộp được vẽ lệch khỏi `x`/`y` do lắc lư (tới 18 px). Nhắm vào `x`/`y` thì đạn trượt khỏi hình hộp, nên phải nhắm vào vị trí đang vẽ.
14. **Phi thuyền luôn chĩa mũi thẳng lên khi bắn** (chủ dự án: "nó chỉ đúng 1 hướng khi typing") → `ShipMotion` và nòng súng xoay theo (mục 4.3).
15. **Lửa phụt trông thô:** lửa cũ vẽ ở `x = ±6`, `y = 17`, tức **giữa hai ống phụt**, trong khi ống thật của ảnh nằm ở `±13`, `23,5`; thêm một vệt đuôi ở giữa, chỗ không có động cơ nào. Đo lại trên ảnh (mục 4.3) và làm bộ đèn mới.
16. **Hào quang bản đầu quá đậm,** trông như viền dán màu cyan quanh tàu → nhoè rộng hơn, độ đục từ khoảng 0,5–0,9 giảm còn khoảng 0,24–0,4.
17. **Tia lửa bản đầu to và nhoè như đốm tròn mờ** → nhỏ hơn, sáng hơn, bay nhanh hơn, sống ngắn hơn.
18. **Chủ dự án hỏi "đã có âm thanh khi đạn bắn vào quái chưa?"**, dù `boltImpact` đã có từ đợt 2.
    - Đo bằng cách dựng tiếng ngoài thời gian thực trong Chrome (`OfflineAudioContext`, file `sfx-levels.js`): đỉnh chỉ −41 dBFS ở âm lượng mặc định. Các lớp tắt gần như ngay (giảm theo hàm mũ từ lúc bắt đầu), và lớp trầm nằm ở 70–170 Hz, loa laptop gần như không phát được. Tiếng này nhỏ hơn nhạc nền khoảng 25 dB, và nhỏ hơn tiếng bắn hạ đạn địch (mẫu âm thanh Kenney, đỉnh khoảng −19) khoảng 22 dB.
    - Thêm nữa: 10 tàu dùng laser cũ không có tiếng trúng nào. Từ khi AI kia cho chọn mọi tàu ngay từ đầu, điều này dễ gặp.
    - Cách xử lý: thiết kế lại (xem 2.1), đặt mức theo số đo, thêm biến thể `"energy"` cho tàu laser, và cho tiếng lệch trái/phải theo vị trí quái.
    - **Bài học:** tiếng mới phải được đo và so với một tiếng mà chủ dự án đã nghe rõ, không chỉ "có gọi hàm".

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
7. **P0 — Chủ dự án duyệt bộ đèn và cách xoay của Vanguard** bằng mắt. Có thể cần chỉnh: góc tối đa (`SHIP_AIM_LIMIT`), độ giật (`SHIP_RECOIL_PX`), độ sáng hào quang (`drawShipHalo`), độ dài lửa (`plumeLength`).
8. **P1 — Bộ đèn cho 10 tàu còn lại** (mục 6, bước 9), sau khi Vanguard được duyệt.

---

## 10. Checklist trước khi báo "xong"

- [ ] `pnpm test` đạt.
- [ ] `pnpm build` đạt, và dòng `Shot FX: … kit(s)` hiện ra.
- [ ] Ảnh mới: đã chạy `pnpm fx:prepare <ship>`, đã xem `public/assets/space-typing/fx/<ship>/` (nền đen, không lộ khung).
- [ ] Đã chụp bằng `pnpm visual:shot` ở 1642×799 DPR 2 (tốc độ thường và `t=0.1`) **và đã tự mở ảnh xem**; đã phóng to (`visual:crop`) kiểm tra đầu đạn rõ chi tiết, đuôi không có cạnh cứng.
- [ ] Chơi thật bằng tàu đó: vụ nổ trùng lúc đạn chạm, kẻ địch bị hạ không biến mất trước khi nổ, nhãn chữ không bị đạn che.
- [ ] Tàu chưa làm vẫn bắn tia laser như cũ.
- [ ] Gõ quái thưởng (hộp tiếp tế, drone kho báu…) thấy đạn bay tới hộp; hộp nổ khi đạn chạm.
- [ ] Tàu xoay về phía mục tiêu, đạn ra đúng nòng khi tàu đang xoay (xem ảnh phóng to).
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
| Chụp và soi ảnh tự động | `pnpm -s visual:shot <url> .visual/<tên>.png [...]`, `pnpm -s visual:crop <png> <jpg> --rect=x,y,w,h`. Xem [VISUAL_TESTING.md](VISUAL_TESTING.md) |
| Đo độ to các tiếng động | `pnpm -s visual:shot "http://127.0.0.1:3098/shot-gallery.html?panel=0&idle=1" .visual/sfx.png --wait=2500 --eval-file=scripts/visual/evals/sfx-levels.js` (máy chủ dev tạm, cổng 3098). Trả về đỉnh, độ to 100 ms, độ dài và độ lệch trái/phải của từng tiếng |

Tham số của trang xem thử:
- `q=low|medium|high|ultra`: bậc chất lượng.
- `cps=<phím/giây>`: tốc độ tự gõ, mặc định 8.
- `t=<tốc độ thời gian>`: `0.1` là quay chậm.
- `art=0`: dùng bản vẽ bằng code để so sánh.
- `panel=0`: ẩn bảng điều khiển.
- Phím `H`: ẩn hoặc hiện bảng điều khiển.
- `stopAt=<giây>`: đóng băng hình ở giây đó, để chụp lặp lại được (ví dụ `stopAt=3.87` thấy tia lấp lánh trên pha lê, `stopAt=4.35` thấy đèn cánh trái nháy).
- `idle=1`: không tự gõ, chỉ xem tàu bay êm.
- `window.__shotGallery`: `{ shots, targets, motion, exhaust }`, dùng để soi trạng thái.
