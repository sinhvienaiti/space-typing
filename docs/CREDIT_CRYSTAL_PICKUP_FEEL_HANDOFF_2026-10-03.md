# Bàn giao: hiệu ứng và âm thanh credit rơi ra, bay về tàu (2026-10-03)

Người làm: Claude. Trạng thái: **đã làm xong trong mã nguồn, có demo, đang chờ chủ dự án duyệt rồi mới build.** Portal (bản build tĩnh) chưa đổi.

## 1. Yêu cầu

Chủ dự án (2026-10-03), phần combat của Campaign:
- Credit rơi ra và lúc chạm tàu chưa đẹp.
- Âm thanh chưa giống kiểu kim cương rơi ra trong nhiều game.
- Gõ đúng nhanh thì tiếng nghe rời rạc, không liên hoàn.
- Phân tích nhiều game có kiểu rơi credit. Hiệu ứng rơi ra, bay về và âm thanh phải thật hấp dẫn, nghe kích thích, thích thú.

Lưu ý: quy tắc "không dùng tiếng tinh tinh" (bộ nhớ `duel-war-audio-taste`) chỉ áp dụng cho hỏa lực trong Duel. Ở đây chủ dự án chủ động yêu cầu tiếng kiểu kim cương trong game.

## 2. Các game tham khảo và bài học

| Game | Rơi ra | Bay về / nhặt | Âm thanh | Bài học dùng cho Space Typing |
|---|---|---|---|---|
| Vampire Survivors | Ngọc nằm tại chỗ quái chết | Nam châm hút, ngọc tăng tốc lao vào nhân vật | Mỗi viên một tiếng "bling" ngắn, cao dần khi nhặt liên tục | Mỗi viên một tiếng; cao độ leo theo chuỗi |
| Peggle | — | — | Mỗi lần chạm cao lên một nốt theo thang âm | Thang âm đi lên tạo cảm giác "liên hoàn" |
| Diablo III/IV, Path of Exile | Đồ bật ra; đồ hiếm có cột sáng | Nhặt tự động (vàng) | Tiếng "keng" khi rơi; đồ hiếm có tiếng trầm riêng | Hạng cao: cột sáng và tiếng trầm "có gì đó lớn vừa rơi" |
| Hollow Knight | Tiền văng ra, nảy, lấp lánh | Nhặt từng đồng | Mỗi đồng một tiếng lách cách; số tiền cộng dồn ở góc | Số đếm chạy lên theo từng lần nhặt |
| Hades | Tài nguyên bung ra | Bay về nhân vật | Pha lê + nhịp trầm nhẹ cho đồ hiếm | Lớp trầm làm tiếng đầy đặn, không chói |
| Brotato, Clash Royale, Brawl Stars | — | Tài nguyên bay thành dòng về thanh đếm | Mỗi viên tới một tiếng "tách", kết thúc bằng "ka-ching" | Dòng chảy liên tục, tiếng kết thúc khi đủ |
| Sonic, Mario | — | — | Tiếng nhặt 2 nốt sáng; Sonic xen kẽ trái/phải | Tiếng ngắn, sáng; đặt tiếng theo vị trí trái/phải |
| Sky Force, Galaxy Attack (bắn tàu dọc) | Xu nổ tung ra, xoay lật như vật 3D | Hút về tàu, có vệt sáng | Dòng tiếng nhặt liên tục | Xoay lật quanh trục đứng để viên đá trông 3D |

Nguyên tắc rút ra:
1. Mỗi viên một tiếng, không phải mỗi chùm một tiếng.
2. Cao độ leo theo thang âm khi nhặt liên tục. Nghỉ ngắn thì hạ vài bậc, nghỉ lâu thì về đầu.
3. Không bỏ tiếng. Xếp hàng theo nhịp đều (như rải hợp âm); quá dày thì chồng nhẹ lên nhau.
4. Bốn nhịp hình: bung ra (nhanh, có lực) → lơ lửng lấp lánh (ngắn) → hút về (tăng tốc, có vệt sáng) → chạm tàu (chớp sáng trên thân tàu).
5. Hạng cao: chùm lớn hơn, tiếng trầm hơn, lấp lánh nhiều hơn, cột sáng.
6. Mốc chuỗi có phần thưởng riêng (tiếng rải nốt và vòng sáng).

## 3. Nguyên nhân cũ (đã kiểm tra trong mã)

- **Ảnh pha lê chưa từng được đưa vào game.** 8 ảnh đã vẽ xong từ 2026-10-01 (`output/art-generation/credit-puzzle-2026-10-01/credits/`) nhưng `art-src/pickups/credits/` và `src/assets/pickups/credits/` chưa có. Vì vậy game vẽ hình đa giác tạm bằng code, kèm một quầng tròn đặc.
- Tiếng rơi và tiếng nhặt đều dùng `confirm.ogg`, chính là tiếng xác nhận của nút giao diện, phát qua `HTMLAudioElement`.
- `creditDrop` chặn 42 ms, `creditPickup` chặn 48 ms: tiếng bị **bỏ hẳn**, không gộp, không xếp hàng.
- Một chùm 4–16 viên chỉ kêu **một lần**, khi viên cuối tới.
- Nốt chạy vòng 4 nốt cố định (A5 C6 E6 G6), không gắn với tốc độ nhặt.
- Tiếng phụ hẹn giờ bằng `setTimeout` nên lệch nhịp.
- Nam châm hút chậm (khoảng 1,2 s cho 500 px), nên các viên đợi lâu, tiếng tới thưa.
- Khi tàu nhặt chỉ có hạt chung chung và một vòng; không có chớp sáng cho từng viên.

## 4. Đã làm

### 4.1 Hình

- **Cài ảnh:** chép 8 PNG vào `art-src/pickups/credits/` (thư mục không lên Git), chạy `pnpm pickups:prepare`, ra 16 tệp `src/assets/pickups/credits/*.webp` (256 và 512 px, tổng khoảng 600 KB). Game tự nhận qua `import.meta.glob`. Nếu thiếu ảnh, game quay về hình đa giác cũ.
- **Ảnh thu nhỏ trước** (`crystalSprite`): ảnh 512 px được thu nhỏ từng nửa, lưu sẵn theo cỡ (16…512). Vẽ 20 px vẫn nét, không nhấp nháy răng cưa.
- **Bung ra:** viên to vọt rồi về cỡ thật (0,25 → 1,22 → 1 trong 0,24 s); trắng rực lúc mới ra, nguội trong 0,14 s; chớp sáng tại chỗ quái vỡ; vòng sóng kép và tia quay. Các viên nhỏ bung rộng hơn rồi phanh gấp (tốc độ 1,15–1,75 × `scatterSpeed`, trước là 0,78–1,18); viên chính ở giữa (0,55 ×).
- **Lơ lửng:** lúc văng thì xoay lộn mạnh, sau đó dựng đứng và **xoay lật quanh trục đứng** như vật 3D (bề ngang co từ 1 xuống 0,46). Khi một mặt quay thẳng ra thì lóe sao sáng; viên lớn có sao lấp lánh bay quanh.
- **Hút về:** tăng tốc theo thời gian bay (đạt tốc độ tối đa sau 0,7 s, `MAGNET_RAMP_SECONDS`), khoảng 0,85 s cho 500 px. Nghiêng nhẹ theo hướng bay (tối đa 0,42 rad), hơi kéo dài khi bay nhanh. Có đuôi sao chổi vẽ sẵn bằng ảnh, dài theo điểm ảnh (không theo số khung hình).
- **Chạm tàu (từng viên):** sao chớp tại chỗ chạm, vài tia lửa văng ra; tàu có quầng sáng tăng dần khi pha lê tới liên tục (cộng 0,09 mỗi viên nhỏ, 0,22 mỗi viên chính, nhân 2,2 với hạng trùm; tối đa 1,6; giảm theo e^(−2,4t)).
- **Mốc chuỗi** (mỗi 5 chùm liên tiếp) và viên chính của trùm: vòng sáng nở quanh tàu kèm sao bắn ra.
- **Hạng trùm và golden:** cột sáng kiểu Diablo trong khoảng 1,1 s đầu.
- **Khi cả chùm về đủ:** vòng `skillFx.pulse` nhỏ hơn trước. Hạt bung chung chỉ còn ở hạng trùm, vì từng viên đã có chớp sáng riêng.
- **Mức đồ họa:** Low chỉ có viên pha lê và nhịp to vọt. Medium thêm quầng sáng, vòng bung, đuôi ngắn, sao lóe ở viên chính. High và Ultra đủ hết: đuôi dài hơn, sao lấp lánh bay quanh, tia lửa nhiều hơn, cột sáng, vệt sáng quét trên viên trùm.

### 4.2 Âm thanh (`src/audio/credit-sound.ts`, lớp `CreditSoundEngine`)

Tạo bằng Web Audio, hẹn giờ theo đồng hồ âm thanh (không dùng `setTimeout`). Đi qua bộ giới hạn (limiter) chung của `Sfx`, nhóm `combat`, tự giảm khi đang phát âm từ vựng.

- **Một tiếng pha lê (gem):** nốt chính (sine) + 2 họa âm "thủy tinh" không chẵn (×2,76 và ×5,4) + lớp trầm nửa tần số (triangle) + tiếng chạm rất ngắn (nhiễu lọc cao 5,5 kHz). Chuỗi càng dài thì càng nhiều lấp lánh (`heat`). Có phòng vang ngắn, sáng (convolver 1,1 s).
- **Thang âm:** A thứ ngũ cung từ E5 đến A7 (13 nốt), cùng giọng với nhạc World 01 (`CREDIT_LADDER_HZ`).
- **Rơi ra (`drop`):** tiếng "bụp" nhẹ (sine 260 → 72 Hz), tiếng nứt thủy tinh (nhiễu lọc dải 3,8 kHz), tiếng xèo sáng, rồi một tràng tiếng leng keng (3 viên với common, đến 10 với major-boss), dày lúc đầu và thưa dần.
  - Hạng trùm thêm tiếng thịch trầm (120 → 40 Hz), tiếng ầm và tiếng lấp lánh dâng lên.
  - Golden thêm 2 nốt cao kiểu đồng xu.
  - Nhiều quái chết cùng lúc (trong 45 ms, ví dụ Nova) gộp thành một tràng lớn hơn, không mất tiếng.
- **Từng viên chạm tàu (`tick`):** mỗi viên một tiếng.
  - Bậc của chùm = bậc chuỗi. Các viên trong chùm lần lượt +0, +2, +4, +1, +3, +5… bậc (`creditOrderOffset`).
  - Viên chính đóng chùm bằng một hợp âm 3 nốt.
  - Các tiếng xếp hàng cách nhau ít nhất 30 ms (`CREDIT_TICK_GAP`). Nếu phải đợi quá 90 ms (`CREDIT_TICK_MAX_LAG`) thì phát chồng nhẹ (60 % độ to), **không bỏ tiếng nào**.
- **Thang chuỗi (trong `CreditCrystalPickupSystem`):**
  - Chùm có viên đầu tiên về trong vòng 1,6 s sau chùm trước thì lên 1 bậc (`CREDIT_CHAIN_WINDOW`).
  - Nghỉ lâu hơn thì mất 1 bậc cho mỗi 0,5 s vượt quá.
  - Quá bậc 8 thì chạy vòng trong quãng tám trên cùng, nên chuỗi dài vẫn nghe như đang leo.
- **Cả chùm về đủ (`complete`):**
  - Elite và golden: tiếng "shing" + quãng năm đi lên.
  - Trùm: tiếng thịch trầm, tiếng ầm, rải 5 nốt, lấp lánh dài.
  - Common, refined, high: không thêm, vì tiếng từng viên đã đủ.
- **Mốc chuỗi (`milestone`):** rải nhanh 4 nốt đi lên.

`Sfx` giữ tên hàm cũ `creditDrop` / `creditPickup` (thêm `pan`, `step`) và thêm `creditTick`, `creditMilestone`. Hai mục mẫu âm `credit-drop` / `credit-pickup` trong `sample-bank.ts` vẫn còn nhưng không được phát nữa.

### 4.3 Ô Credits trên thanh trên

- Số chạy dần lên giá trị mới trong 320 ms; mua bán hoặc đồng bộ thì nhảy thẳng.
- Dưới số có nhãn "+N" cộng dồn khi nhặt liên tục, nảy lên mỗi lần cộng, mờ đi sau 1,3 s không nhặt (1,8 s với trùm). Có kiểu riêng cho trùm (màu vàng).
- Ví vẫn chỉ đổi một lần cho mỗi lần hạ địch, như trước (`CreditCrystalCollectionEvent` giữ nguyên).

## 5. Tệp đã sửa

- `src/vfx/credit-crystal-pickups.ts`: báo từng viên về (`CreditCrystalArrival`, tham số thứ 3 của `update`), thang chuỗi, `chainSnapshot()`, đuôi theo thời gian, xoay lộn → dựng đứng → nghiêng, nam châm tăng tốc, bung rộng hơn.
- `src/vfx/credit-crystal-renderer.ts`: vẽ lại theo 3 lượt gom (cộng sáng / thường / cộng sáng); ảnh thu nhỏ sẵn; quầng, sao, đuôi vẽ sẵn bằng ảnh; cột sáng; bảng màu có `light` và `hot`.
- `src/vfx/credit-crystal-fx.ts` (mới): tia lửa khi bung, chớp và tia lửa khi chạm tàu, quầng sáng tàu, vòng mốc chuỗi.
- `src/audio/credit-sound.ts` (mới) và `src/audio/Sfx.ts`.
- `src/Game.ts`: `presentCombatCreditArrival`, `creditPan`, gọi âm thanh theo từng viên, bớt hạt khi cả chùm về.
- `src/main.ts`, `src/styles.css`, `index.html`: ô Credits đếm dần và nhãn "+N".
- Kiểm thử: `tests/credit-sound.test.ts` (mới), `tests/credit-crystal-pickups.test.ts` (thêm 5 bài).
- Ảnh (chạy trên máy, không trong Git giống các ảnh khác ở `src/assets/`): `art-src/pickups/credits/*.png`, `src/assets/pickups/credits/*.webp`.

## 6. Hiệu năng (đo 2026-10-03, Chrome, canvas 1642×799 DPR 2)

Trường hợp nặng nhất: 15 lần hạ địch mỗi giây, đủ trần 92 viên ở Ultra, gồm cả lớp hiệu ứng phụ. Đây là thời gian CPU cho update + vẽ mỗi khung hình (trung vị / mức 95 %):

| Mức | Cũ | Mới |
|---|---|---|
| Medium (44 viên) | 0,3 / 0,4 ms | 0,5 / 0,8 ms |
| Ultra (92 viên) | 0,7 / 0,9 ms | 1,0–1,1 / 1,4 ms |

Bản đầu tiên tốn 2,5 ms ở Ultra. Đã giảm bằng cách: gom lượt vẽ theo kiểu hòa sáng thay vì đổi qua lại cho từng viên; dùng `setTransform` tính sẵn thay cho `save/restore`; dùng ảnh đuôi vẽ sẵn thay cho dải gradient tạo mới mỗi khung hình. Khi chơi thường, số viên ít hơn nhiều.

Bài đo: `.visual/credit-perf-mini.html` (cần máy chủ dev).

## 7. Demo và cách tạo lại

Máy chủ dev: `pnpm dev` (cổng 3004). Tất cả nằm trong `.visual/`, thư mục không lên Git.

- So sánh A (cũ) / B (mới), cùng thời điểm: `credit-demo-elite.png`, `credit-demo-boss.png`, `credit-demo-golden.png`, `credit-demo-chain.png`, `credit-demo-elite-B.jpg` (cận cảnh nét cao), `credit-demo-low-medium.jpg`.
  - Tạo: `node scripts/visual/shot.mjs "http://127.0.0.1:3004/.visual/credit-lab.html?scene=elite" .visual/credit-demo-elite.png --wait=2500 --width=1830 --height=1100 --dpr=1`. Các cảnh: `elite | common | boss | golden | chain`; mức đồ họa `&q=low|medium|high|ultra`.
  - Bản A dùng mã cũ chụp lại trong `.visual/credit-old/` (hình đa giác, đúng như chủ dự án đang thấy).
- Trong game thật (Ultra): `credit-demo-ingame.jpg` (6 khoảnh khắc), `credit-demo-ingame-zoom.jpg`.
  - Tạo: `node .visual/duel-record.mjs "http://127.0.0.1:3004/" .visual/credit-game --scenario=.visual/credit-game.js --quality=ultra --jpeg`.
  - Kịch bản làm chậm thời gian 10 lần (`testLabSetTimeScale`), để mỗi ảnh rơi đúng khoảnh khắc.
- Âm thanh WAV trong `.visual/credit-audio/`: `A-*` là cũ, `B-*` là mới, `AB-*` là cũ rồi im 1 s rồi mới. Các cảnh: `single`, `chain` (12 lần hạ địch, 0,42 s/lần), `boss`, `golden`, `nova` (6 quái chết cùng lúc). `chain-spectrum.jpg` là phổ âm so sánh.
  - Tạo: `node .visual/credit-audio-run.mjs chain:A chain:B` (trang `.visual/credit-audio.html` dựng lại đúng dòng thời gian từ hệ thống pha lê thật, rồi xuất bằng OfflineAudioContext).
  - Số đo (âm lượng 50 %):
    - chuỗi 12 lần hạ địch: cũ có 12 tiếng rơi + 12 tiếng nhặt cùng một mẫu, đỉnh −17,6 dBFS; mới có 12 tiếng rơi + 59 tiếng pha lê, đỉnh −11,2 dBFS, trung bình −31,9 dB;
    - trùm: đỉnh mới −9 dBFS;
    - Nova: cũ chỉ còn 1/6 tiếng rơi, mới đủ 6 (gộp thành tràng).

## 8. Kiểm thử

- `npx vitest run`: 1.438 qua, 1 lỗi có từ trước (`combat-vfx-sprites`, do ảnh hiệu ứng trên máy).
- `npx tsc --noEmit -p .`: sạch.
- Bài mới kiểm tra:
  - thang âm leo và chạy vòng;
  - tiếng xếp hàng đều 30 ms, chồng nhẹ khi quá 90 ms, không mất tiếng nào;
  - viên chính phát hợp âm;
  - gộp tiếng rơi trong 45 ms;
  - tiếng thịch chỉ ở hạng trùm;
  - tiếng kết thúc chỉ ở elite, golden và trùm;
  - im lặng khi không có Web Audio, khi tắt tiếng, hoặc khi đối tượng âm thanh thiếu hàm;
  - báo đủ từng viên theo thứ tự;
  - thang chuỗi lên 1 bậc mỗi chùm, mốc ở chùm thứ 5, hạ bậc khi nghỉ;
  - đuôi không đổi theo số khung hình;
  - ví vẫn chỉ đổi 1 lần mỗi chùm.

## 9. Còn mở

- **Chờ chủ dự án duyệt** hình (ảnh demo) và tiếng (WAV). Duyệt xong mới `pnpm build:space`.
- Nếu chủ dự án thấy thang nốt leo "trẻ con":
  - giữ tiếng pha lê nhưng cho nốt ngẫu nhiên trong một dải hẹp: trong `tick`, thay `creditLadderIndex(step, …)` bằng một chỉ số ngẫu nhiên 5–8;
  - cho chuỗi làm tiếng sáng hơn thay vì cao hơn (tăng `heat`).
- Ảnh golden (CC05) có thân tím, viền vàng. Ở cỡ nhỏ trông gần như tím, chỉ cột sáng và quầng sáng là vàng. Nếu muốn vàng rõ hơn, cần nhờ AI vẽ lại CC05.
- Một số quái có hình pha lê tím (ví dụ prism sprite), dễ lẫn với credit. Có thể đổi màu quầng credit nếu chủ dự án thấy rối.
