# Làm đẹp giao diện đợt 2 và sửa lỗi (04/10/2026)

> **Dành cho:** chủ dự án và AI làm tiếp (Claude, ChatGPT, Codex).
> **Phong cách:** Holo Command (phương án A, đã duyệt), xem `docs/UI_REDESIGN_PROPOSAL_2026-10-03.md`.
> **Yêu cầu gốc:** chủ dự án gửi 14 ảnh chụp các chỗ còn thô hoặc bị lỗi.

## 1. Danh sách việc và trạng thái

| # | Việc | Trạng thái |
|---|---|---|
| 1 | **Lỗi:** chọn map khi tạo phòng Duel nhưng vào trận vẫn là nền mặc định (cả đấu với máy và đấu online) | Đã sửa |
| 2 | **Lỗi:** ở chế độ Recall, quái bonus (hộp tiếp tế, drone, hòm) không gõ được | Đã sửa |
| 3 | 4 thẻ chế độ ở màn mở đầu chưa đồng đều: thống nhất 1 nút chính ở trên, 2 nút phụ ở dưới | Đã làm |
| 4 | Nút và thẻ chưa có hiệu ứng khi rê chuột, khi bấm | Đã làm |
| 5 | Thanh điểm số trong trận thô; thêm hiệu ứng "bốc cháy" khi gõ chính xác liên tục hoặc nhanh | Đã làm |
| 6 | Hàng phím tắt kỹ năng (1–9) thô; cần hiệu ứng gây chú ý khi một ô dùng được | Đã làm |
| 7 | Quái bonus đang là ô vàng; dùng ảnh hòm đã có | Đã làm |
| 8 | Chữ tiếng Việt trong trận nhỏ, khó đọc | Đã làm |
| 9 | Hangar: ảnh tàu xấu; dùng ảnh tàu mới, khung màu theo vai trò | Đã làm |
| 10 | Tactical, Hotbar, Vocabulary, Missions, Shop: phông nhỏ, thô, thiếu ảnh minh họa | Đã làm. Ảnh vật phẩm tiêu hao chờ vẽ (mục 13) |
| 11 | Bản đồ chiến dịch: thô; cần nền, ảnh trùm, hiệu ứng theo từng thế giới | Đã làm (bản 2D có chiều sâu; chưa có 3D thật) |
| 12 | Màn hoàn thành: thô; cần hiệu ứng chúc mừng, làm nổi các chỉ số chính | Đã làm |
| 13 | Ảnh còn thiếu (biểu tượng vật phẩm tiêu hao…) và nhạc chúc mừng: viết yêu cầu tạo ảnh và nhạc | Đã xong: 12 ảnh vật phẩm, 12 ảnh cổ vật nền trong suốt, nhạc chúc mừng mới (xem đầu 2 tệp yêu cầu) |

## 2. Đã làm

### 2.1 Lỗi chọn map Duel
- **Nguyên nhân:** lựa chọn map vẫn được gửi vào trận và có ảnh hưởng tới luật chơi. Nhưng hình nền trận Duel không bao giờ đổi theo map, nên luôn hiện cảnh của thế giới chiến dịch đang chơi.
- **Sửa:** `src/duel/map-backdrop.ts` gán mỗi map với một thế giới. Map lấy thế giới thứ 3 của Galaxy tương ứng, cũng là ảnh trên thẻ map trong sảnh:

  | Map | Thế giới |
  |---|---|
  | Frost Wastes | world-13 |
  | Inferno Rift | world-08 |
  | Tempest Prime | world-38 |
  | Ocean Abyss | world-33 |
  | Terra Core | world-18 |
  | Celestial Void | world-03 |

- `main.ts` (`onPresentationState`) gọi `game.setDuelBackdrop(...)` theo `view.map.id`. Cách này áp dụng chung cho đấu với máy và đấu online.
- Thoát trận thì trả lại cảnh của chiến dịch (`setDuelPresentationActive(false)`).
- `room-ui.ts` dùng chung bảng map này.

### 2.2 Lỗi quái bonus ở Recall
- **Nguyên nhân:** ở Recall, `handleKey` dồn mọi phím vào trùm hoặc quái đầu tiên, nên không phím nào tới được hộp tiếp tế.
- **Sửa:**
  - quái bonus đang gõ dở thì tiếp tục nhận phím;
  - phím mà từ Recall không cần thì được dùng để bắt đầu gõ quái bonus có chữ đầu trùng;
  - hai hàm dùng chung: `typeStartedBonusTarget` và `typeNewBonusTarget`.
- **Kiểm thử:** `tests/game-input-priority.test.ts` (thêm 3 bài).
- **Sửa lần 2:** lần sửa đầu chưa đủ.
  - **Nguyên nhân:** ở Recall, ngay phím đầu tiên quái Recall đã bị khóa làm mục tiêu (`targetId`). Từ đó mọi phím đi vào nhánh "mục tiêu đã khóa" ở đầu `handleKey`, chạy trước đoạn đã sửa, nên hòm vẫn không nhận phím. Bài kiểm tra đầu chưa khóa mục tiêu nên không bắt được lỗi.
  - **Sửa:** `typeRecallBonusTargetKey` chạy **trước** nhánh mục tiêu đã khóa, theo thứ tự:
    1. hòm đang gõ dở luôn giữ chữ tiếp theo của chính nó;
    2. phím từ Recall cần thì vẫn thuộc về từ Recall;
    3. phím khác thì đi vào hòm đang gõ dở, hoặc mở một hòm có chữ đầu trùng.
  - **Đã thử trong trình duyệt:** từ Recall bị khóa ở chữ thứ 2; gõ hòm "code" thì hòm nhận đủ 4 phím và được thu; từ Recall không đổi.

### 2.3 Thẻ chế độ và hiệu ứng
- **Thẻ chế độ:** `.holo-actions` dạng lưới 2 cột: nút chính chiếm hết hàng trên, 2 nút phụ ở dưới.
  - Recall thêm nút "Word list" (mở Vocabulary) và "Recall settings" (mở Settings, cuộn tới mục Recall).
  - Duel thêm nút "Practice" (mở sảnh rồi bắt đầu đấu với máy) và "Join code" (mở sảnh, đặt con trỏ vào ô mã phòng).
- **Hiệu ứng** (`src/ui/holo-motion.css`, `src/ui/holo-motion.ts`):
  - nút chính: ánh sáng lướt qua, nổi lên, phát sáng; nút chính của thẻ Campaign "thở" nhẹ;
  - nút phụ: nền kính sáng lên, biểu tượng phát sáng;
  - nút công cụ góc trên: biểu tượng nghiêng nhẹ;
  - thanh dưới cùng: nổi lên, có vạch sáng chạy dưới chân;
  - mọi nút Holo lún xuống khi bấm, có gợn sóng sáng từ chỗ bấm;
  - thẻ chế độ: nổi lên, ảnh phóng nhẹ, tàu bay lên, đèn rọi theo con trỏ;
  - hộp thoại mở ra có hiệu ứng trồi lên và mờ dần vào;
  - người dùng bật chế độ giảm chuyển động thì tắt hết các hiệu ứng.

### 2.4 Thanh điểm số và hiệu ứng "bốc cháy" (`src/ui/holo-hud.css`, `renderHudHeat` trong `main.ts`)
- Hai cụm điểm (trái: score, streak, multi; phải: credits, accuracy, kills) thành khung kính vát góc. Số dùng phông Exo 2 to hơn. Credits có biểu tượng tinh thể.
- **Bên trái cháy theo chuỗi gõ đúng liên tục:**

  | Chuỗi | Cấp | Nhãn |
  |---|---|---|
  | ≥ 15 | 1 | HOT STREAK |
  | ≥ 35 | 2 | ON FIRE |
  | ≥ 70 | 3 | INFERNO |

- **Bên phải cháy theo tốc độ gõ.** Tốc độ tính từ số phím đúng trong 8 giây gần nhất, và chỉ tính khi độ chính xác ≥ 92 %:

  | Tốc độ | Cấp | Nhãn |
  |---|---|---|
  | ≥ 40 WPM | 1 | FAST |
  | ≥ 60 WPM | 2 | BLAZING |
  | ≥ 80 WPM | 3 | LIGHTSPEED |

  Ngừng gõ 2,6 giây thì lửa tắt.
- **Hiệu ứng:** ngọn lửa bốc lên từ đáy khung (gradient động), tàn lửa bay lên, số chuyển màu lửa, nhãn cấp dưới khung. Khung nảy lên khi lên cấp, kèm tiếng lửa bùng (`Sfx.heatUp`, chỉ dùng tiếng ồn và âm trầm).
- Tất cả là CSS; chỉ chuyển động `transform`, `opacity` và `background-position`. Người dùng bật chế độ giảm chuyển động thì tắt.

### 2.5 Hàng phím tắt 1–9
- Ô cao hơn (64 px), vát góc, biểu tượng 34 px. Phím số nằm ở góc trái trên, số lượng hoặc thời gian hồi ở góc phải. Mỗi loại một màu: vật phẩm xanh ngọc, kỹ năng tím, kỹ năng của tàu vàng.
- **Ô đang hồi chiêu:** phủ tối, số giây ở giữa.
- **Ô dùng được:** viền sáng, có vệt sáng lướt chậm.
- **Ô vừa dùng lại được:** nảy lên, vòng sáng tỏa ra, kèm tiếng sạc ngắn (`Sfx.hotbarReady`, không phải tiếng chuông). Xử lý ở `renderHotbar`, so trạng thái cũ qua `data-ready`.
- Vật phẩm có ảnh vẽ thì dùng ảnh (`paintedItemIcon`, đọc từ `src/assets/icons/items/`, chờ ảnh).

### 2.6 Quái bonus dùng ảnh hòm (`src/vfx/bonus-sprites.ts`)
- **Ảnh:** ảnh hòm và tàu chở hàng của bộ Credit puzzle có sẵn ở `output/art-generation/credit-puzzle-2026-10-01/puzzle/`. Đã chép sang `art-src/puzzle/` rồi xử lý bằng `pnpm puzzle:prepare`, ra 6 file `src/assets/puzzle/*.webp`.
- **Gán ảnh:**

  | Quái bonus | Ảnh | Màu quầng sáng |
  |---|---|---|
  | Hộp tiếp tế | hòm đóng | theo phần thưởng: khiên xanh dương, máu xanh lá, năng lượng tím, còn lại vàng |
  | Treasure drone | tàu chở hàng | vàng |
  | Hòm lựa chọn | hòm đóng | tím |
  | Anomaly | hòm mở | hồng |

- **Cách vẽ:** quầng sáng phía sau, bóng mờ phía dưới, nghiêng và "thở" nhẹ, 3 đốm lấp lánh bay quanh. Bên dưới có nhãn dễ đọc kèm thanh tiến độ gõ. Ảnh chưa tải xong thì vẽ hình cũ.

### 2.7 Chữ tiếng Việt trong trận
- Nghĩa và IPA dưới quái Recall, dưới từ của trùm Recall và trong ô Recall bonus dùng phông **Be Vietnam Pro** (đủ dấu tiếng Việt), cỡ 15–16 px (trước là 12–13 px).
- Chữ nằm trên nền viên thuốc tối có viền (`drawMeaningPill` trong `Game.ts`).

### 2.8 Các hộp thoại (`src/ui/holo-dialogs.css`)
- **Chung:** ô chọn (select) cao 46 px, vát góc, có mũi tên cyan. Chữ ghi chú 0,9 rem. Nhãn trường viết hoa bằng Exo 2.
- **Shop:**
  - bố cục thẻ đã sửa: trước đây tên và mô tả dính liền vì thiếu CSS;
  - thẻ có ô ảnh 76 px viền theo cấp, nhãn cấp dạng viên thuốc, tên, mô tả, nút mua gradient;
  - trang bị dùng ảnh vẽ (`paintedEquipmentIcon`), vật phẩm dùng `paintedItemIcon` (chờ ảnh).
- **Hangar:** thay hình vẽ bằng code bằng ảnh tàu 3D (`shipArtUrl`). Khung, nhãn vai trò, nhãn "Selected" và đèn sân khấu đều theo màu `glow` của từng tàu (`characterVisualProfile`). Rê chuột thì tàu bay lên.
- **Missions:** thẻ vát góc, có thanh tiến độ. Phần thưởng chờ nhận phát sáng nhịp nhàng, nút nhận màu vàng.
- **Tactical, Hotbar, Vocabulary:** ô kính vát góc. Phím số dạng huy hiệu gradient. Tab đang chọn tô gradient (`.source-tabs button.active`).
- **Tiền tệ:** chip Credits dùng ảnh tinh thể thay cho ký hiệu ₵.

### 2.9 Bản đồ chiến dịch (`renderStageGrid` trong `main.ts` và cuối `holo-dialogs.css`)
- **Nền:** ảnh nền Galaxy (`galaxyPlateUrl`) đứng yên trong khung, đường đi cuộn qua nên tạo cảm giác chiều sâu. Có lớp bụi sao trôi.
- **Vật thể biểu tượng của từng thế giới** (`worldHeroUrl`, file `hero-wNN.512.webp`) lơ lửng cạnh ô trùm của thế giới.
- **Ô trùm** (màn 10, 20, 100…): ô tròn lớn 92 px có ảnh trùm (`paintedBossArtUrl`), vòng rune nét đứt xoay, nhãn số màn tím hồng.
- **Ô thường:** đã qua thì viền vàng có dấu ✓; ô đang chơi có vòng sáng lan ra; ô đang chọn có viền vàng. Rê chuột thì ô phóng to.
- **Đường đã đi** phát sáng, ánh sáng chạy dọc đường. Tàu của người chơi (ảnh thật) lơ lửng trên ô đang chơi.
- **Kiểu bản đồ vượt ải** (chủ dự án chốt: không cần 3D thật, chỉ cần đẹp như game vượt ải):
  - **Nền riêng từng thế giới:** `worldPlateUrl` lấy đúng ảnh nền mà thế giới đó dùng khi chơi (`compositionForWorld(...).plate.texture`, cỡ 1280; riêng `g01` plate-b là 1376).
  - **Huy hiệu "YOU":** tàu của người chơi trong vòng tròn phát sáng có mũi ghim, nhún lên xuống ở ô đang chơi (`.journey-avatar`).
  - **Sao dưới ô đã qua:** 1–3 sao, tính từ độ chính xác tốt nhất đã lưu (`campaign.bestByStage`) theo luật sao của màn hoàn thành (`journeyStageStars`).
  - **Ô chưa mở** có biểu tượng khóa.
  - **Đầu bản đồ** có 2 ô tiến độ: số màn đã qua trên 20, số sao trên 60 (`renderJourneyProgress`).
  - **Hạt bay theo chủ đề Galaxy** (`.journey-fx`, lớp dính trên khung cuộn):

    | Galaxy | Hạt |
    |---|---|
    | G01 | lấp lánh hồng và cyan |
    | G02 | tàn lửa |
    | G03 | tuyết rơi |
    | G04 | cánh hoa rơi |
    | G05 | đốm tím |
    | G06 | tia vàng |
    | G07 | bong bóng |
    | G08 | lấp lánh cực quang |
    | G09 | bụi vàng rơi |
    | G10 | bụi vàng bay lên |

    Số hạt: Low 8, Medium 16, High và Ultra 26.

### 2.10 Màn hoàn thành (`src/ui/holo-results.css`)
- **Tiêu đề:** "STAGE 017 COMPLETE" chữ nghiêng lớn, có ánh sáng lướt định kỳ.
- **Sao:** 3 sao bật lên lần lượt (`renderClearStars`); sao đạt được màu vàng phát sáng.
- **Điểm số:** đếm từ 0 lên (`countUpNumber`) trong ô lớn viền vàng. Accuracy và WPM màu cyan cỡ lớn. Các ô còn lại hiện dần lần lượt.
- **Hiệu ứng chúc mừng:** tia sáng quay phía sau (`.stage-clear-rays`) và mưa giấy màu (`.stage-clear-confetti`). Số mảnh giấy: Ultra 64, High 48, Medium 30, Low 10. Lớp này nằm trên thẻ nhưng không chặn chuột.
- **Nút cuối:** cao 48 px, vát góc; "Next stage" nổi nhất.
- **Âm thanh:** vẫn dùng âm cũ. Đã viết yêu cầu tạo đoạn nhạc chúc mừng mới (mục B của tệp yêu cầu).

## 3. Kiểm tra
- `tests/game-input-priority.test.ts`: thêm 2 bài cho quái bonus ở Recall.
- **Cả bộ:** 1494/1495 bài đạt. Bài lỗi duy nhất là `combat-vfx-sprites`, lỗi có từ trước, không liên quan.
- **Ảnh chụp** (máy chủ dev cổng 3004), đều nằm trong `.visual/ui2/`:

  | File | Nội dung |
  |---|---|
  | `title.png` | 4 thẻ đã đều |
  | `hud.png`, `hud-top.png` | lửa cấp 3, hòm tiếp tế, hàng phím tắt |
  | `dlg-sheet.jpg` | 6 hộp thoại |
  | `clear.png` | màn hoàn thành |
  | `map.png`, `map-boss.png` | bản đồ |
  | `duel-map.png` | đấu với máy ở Inferno Rift, nền đúng map |

## 4. Còn lại, gợi ý tiếp
- **Ảnh vật phẩm tiêu hao, ảnh cổ vật và nhạc chúc mừng:** đã có, đã đưa vào game.
- **Bản đồ chiến dịch 3D thật:** chưa làm; cần chủ dự án duyệt hướng làm.
- **Các bảng còn kiểu cũ trong Hangar:** bảng Talent và cây Basic Skill bên dưới các thẻ tàu mới chỉ ăn theo kiểu chung (chữ, ô chọn), chưa được thiết kế riêng.

## 5. Đợt 2c (04/10/2026): vật phẩm rơi, thanh nộ, Duel HUD, thẻ Campaign, Run over

### 5.1 Quái bonus rơi vật phẩm bay về tàu (`src/vfx/reward-drops.ts`)
- **Vấn đề:** trước đây hạ quái bonus chỉ thấy một chùm tia sáng; phần thưởng cộng thẳng vào thanh, không thấy gì rơi ra.
- **Cách làm:** khi phát bắn cuối trúng (`applyShotImpact`, kiểu `bonus-collect` có thêm `drop`), vật phẩm bật ra kèm vòng sáng. Sau 0,34 giây nó bị hút về tàu (lực hút tăng dần, tối đa 1900 px/s), để lại vệt sáng.
- **Khi chạm tàu:** vòng sáng ở tàu (`skillFx.pulse`), chữ nhận thưởng bay lên, âm `Sfx.rewardPickup`.
- **Phần thưởng chỉ là hình ảnh:** chỉ số vẫn được cộng ngay lúc thu như trước, nên không đổi cân bằng game.

| Quái bonus | Vật rơi | Chữ hiện ở tàu | Âm |
|---|---|---|---|
| Hộp tiếp tế | ảnh vật phẩm theo phần thưởng: máu → Repair Kit, khiên → Shield Cell, năng lượng → Energy Cell, nộ → Phoenix Core | `+27 SHIELD`… (số thực nhận) | `item`: tiếng hút ấm |
| Treasure drone | 4 tinh thể vàng | `+N TREASURE`, hoặc `TREASURE · NEW GEAR` khi rơi trang bị | `treasure`: tiếng ngọc Credit |
| Hòm lựa chọn | 4 mảnh sao tím | `CHOICE CRATE OPEN` | `crate`: tiếng dâng trầm |
| Anomaly | 4 mảnh sao hồng | `ANOMALY CAPTURED` | `crate` |
| Recall bonus | 3 tinh thể | `RECALL BONUS` | `treasure` |

### 5.2 Thanh nộ (SPACE) đầy thì bốc cháy
- **Cách bật:** `renderStats` bật lớp `rage-ready` cho `#playerStatusHud` khi đủ 5 đoạn. Lúc vừa đầy có tiếng lửa bùng (`heat-up` cấp 3).
- **Hiệu ứng** (`holo-hud.css`, mục "Rage (SPACE) full"):
  - thanh chuyển sang màu dung nham chảy;
  - lửa và tàn lửa bốc lên dưới thanh;
  - viền bảng nhấp nháy cam;
  - dòng gợi ý sáng lên;
  - phím SPACE vàng, nảy nhịp.

### 5.3 Duel HUD (`src/duel/battle-holo.css`, áp dụng cho mọi chế độ Duel)
- **Bố cục đối đầu kiểu game đối kháng:** YOU ở góc trên trái, RIVAL ở góc trên phải (đối xứng), đồng hồ trận ở giữa phía trên.
- **Mỗi bảng có:**
  - ảnh tàu của phi công (`--ship-art`, đặt trong `battle-ui.ts`);
  - nhãn YOU hoặc RIVAL và lối chơi;
  - thanh Hull dày, Shield vừa, Energy mỏng; thanh của RIVAL rút từ phải sang;
  - ô Initiative.
- **Dòng hướng dẫn "GÕ ĐỂ BẮN"** chuyển xuống giữa phía dưới, không còn bị đồng hồ che.

### 5.4 Thẻ Campaign không còn lựa chọn Recall
- **Thay đổi:** ẩn hai nút Combat và Recall; Recall có thẻ riêng. Nút "Continue" của Campaign luôn chơi Combat.
- **Cách giữ chế độ đúng:** nút "Start recall" đặt cờ `recallLaunchPending` để vẫn chạy Recall. Nút "Next stage" giữ nguyên chế độ của lượt đang chơi.
- **Nhãn:** nút Continue không còn đuôi "· Recall".

### 5.5 Màn Run over cùng kiểu màn hoàn thành; biểu tượng cho mọi chỉ số
- **Bố cục mới của `#gameOverOverlay`:**
  - đầu bảng: "RUN OVER" chữ đỏ nghiêng lớn, huy hiệu DEFEATED;
  - cột trái: 4 ô chỉ số chính, điểm số nổi bật viền vàng;
  - cột phải: báo cáo chi tiết và các vật phẩm hồi sinh;
  - chân bảng: 3 nút lớn;
  - tro bụi rơi chậm phía sau.
- **Giữ nguyên:** mọi id cũ.
- **Biểu tượng:** mỗi chỉ số ở màn hoàn thành và Run over có biểu tượng nhỏ (`resultMetricIcon` trong `main.ts` chọn theo nhãn). `icons.ts` có thêm flame, heart, skull, gauge, keyboard, star.

### 5.6 Kiểm tra
- 1495/1496 bài đạt. Bài lỗi duy nhất là `combat-vfx-sprites`, lỗi có từ trước.
- **Ảnh chụp** (`.visual/ui2/`):
  - `run-over.png`;
  - `duel-hud.png`;
  - `drop-*.png` và `drop-late.jpg` (vật rơi bay về tàu);
  - `drop-sheet.jpg` (thanh nộ cháy).
