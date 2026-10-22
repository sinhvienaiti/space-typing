# Bộ prompt asset Typing Defense: mục lục và việc cần làm (22/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh, model, tiếng theo các file prompt); ChatGPT (đọc mục lục này để biết mở file nào); AI ghép file sau đó (Blender, manifest, engine).
>
> **Lấy từ thiết kế** `docs/td/TYPING_DEFENSE_DESIGN.md`: 0.5 và 26.1 (bước 1A, 1B, 1C), 0.6 (tên, id), 22 (nội dung Thế giới 1), 23 (hình), 24 (âm thanh), 27.2 (bậc P / VS / Sau), 28 (mặc định). Bước đang làm là 1A (`docs/td/BUILD_NOW.md`), chưa dùng media. Media bậc P phục vụ 1B và 1C.

```text
Instructions for ChatGPT
- This README is only an index. Never make an image or a sound from this page alone.
- When the owner names items, open the file named in the "File" column (01, 02, 03 or 04,
  all in docs/art-requests/td/) and follow that file's own "Instructions for ChatGPT" and blocks.
- All these files are on branch feat/space-typing-2026-10-18 of the repo sinhvienaiti/space-typing,
  not on main. Open every file from that branch.
- Item codes are unique only inside one file: P1 in file 01 is not P1 in file 02.
- One image or one sound per subject. Use the exact file name and folder of the item.
  No text, letters, numbers or logos inside any image.
- If an item is unclear, two files disagree, or a needed reference image is missing,
  ask the owner a short question in Vietnamese. Do not guess.
```

## 1. Các file

| File | Chứa gì | Bậc |
|---|---|---|
| [`01-tripo-characters-enemies.md`](01-tripo-characters-enemies.md) | Ảnh 2D gửi Tripo: Thư Đồng và bộ gắn, Lam, Draconis (model mới), Lính Giáo, 7 quái, boss Mộc Tinh | P, danh sách Sau |
| [`01-tripo-characters-enemies-vs.md`](01-tripo-characters-enemies-vs.md) | Tre, hai lính nhánh, thân thợ và 24 bộ gắn, 5 quái VS, Đại Bàng Tinh, trâu, heo đất | VS |
| [`02-tripo-buildings-props.md`](02-tripo-buildings-props.md) | Ảnh 2D gửi Tripo: 6 nhà và Đài Ấn, nòng pháo, goòng, đống vàng, đạn, túi, rương, cờ cấp, Rễ Trồi | P, danh sách Sau |
| [`02-tripo-buildings-props-vs.md`](02-tripo-buildings-props-vs.md) | 3 nhà VS, skin Ruộng, bộ cấp L2–L4, 18 nhánh, đống đổ nát, mốc cảnh, đồ dùng, đạn VS | VS |
| [`03-2d-scenery-ui-vfx.md`](03-2d-scenery-ui-vfx.md) | Ảnh 2D dùng thẳng (không qua Tripo): cảnh bản đồ 1, phông xa, chân dung, đèn lồng, icon, VFX | P, danh sách Sau |
| [`03-2d-scenery-ui-vfx-vs.md`](03-2d-scenery-ui-vfx-vs.md) | Cảnh và phông bản đồ 2, 3; chân dung đủ; ảnh trượt Tối Thượng; tranh truyện; atlas Neon; thú nền | VS |
| [`04-audio.md`](04-audio.md) | Tiếng ngắn, giọng, nhạc bản đồ 1 và câu nhạc ngắn | P, danh sách Sau |
| [`04-audio-vs.md`](04-audio-vs.md) | Thoại đủ, tiếng quái, vũ khí, nhà, sự kiện, boss, âm nền, nhạc VS | VS |

## 2. Thứ tự làm

- Làm hết bậc **P** trước. Bậc VS làm ở bước 5 "Lát dọc" (26.2). Bậc Sau chỉ là danh sách.
- Ảnh và model trước, tiếng sau. AI bắt đầu 1C khi có model Tripo đầu tiên (26.4). Tiếng bậc P được ghép ở bước 2 "Sống" (26.2).
- Làm "Đợt đầu" dưới đây trước. Sau đó làm tiếp theo thứ tự ghi ở đầu mỗi file.
- Draconis: `heroes/draconis-v2` (rồng đỏ cánh màng) là model tạm trong game. Model mới theo ảnh 3.png là P18 ở file 01, làm sau Đợt đầu. Đàn Ma Trơi không có model, chỉ là VFX (X11, file 03).

### Đợt đầu

Đây là những mục mở khóa nhiều việc nhất cho 1B và 1C (thiết kế 0.5, 26.1).

| # | Mục | File | Vì sao làm trước |
|---|---|---|---|
| 1 | P1 `keep` | 02 | Lũy là nhà lớn nhất. Ảnh Lũy đã duyệt là ảnh mẫu phong cách cho mọi nhà sau. |
| 2 | P1 `helper-owlet` (+ `-side`, `-back`) | 01 | 3 Thư Đồng có trên bản đồ từ 1A. Ảnh này mở P2–P6 và chân dung C2–C7. Cú dễ hỏng rig, nên thử sớm (27.4). |
| 3 | P2 `archer` | 02 | Tháp dạy ở đợt 1 bản đồ 1, xây nhiều nhất. |
| 4 | P3 `cannon`, P4 `cannon-barrel` | 02 | Tháp của 1A. Nòng là model rời, quay theo quái. |
| 5 | P5 `barracks` (02); P8a `linh-giao`, P8b `linh-giao-spear` (01) | 02, 01 | Lính đánh ở mọi đợt. Thử sớm đám đông và VAT (23.9). |
| 6 | P6 `gold-mine`, P7 `gold-mine-cart`, P8 `gold-pile-1…4` | 02 | Nhà kinh tế của 1A. Đống vàng là chỗ Alicanto trộm. |
| 7 | P9 `cuong-thi` | 01 | Quái đông nhất bản đồ 1. Thử vẽ instanced 300–400 quái (25.12). |
| 8 | P12 `thuong-luong` (+ `-front`) | 01 | Quái giáp của 1A. Rắn dễ hỏng rig, nên thử sớm (27.4). |
| 9 | X11 `ma-troi-wisp`, X2 `explosion` | 03 | Ma Trơi không có model, X11 là hình duy nhất của nó. X2 là nổ của đạn Pháo và cầu lửa Draconis. |
| 10 | L1–L3 đèn lồng | 03 | 5 đèn Nhiệt treo ở mọi nhà trong 1C. |
| 11 | S1, S3, S12 (v1); F1, F3 | 03 | Đủ để AI viết script cảnh 2D của 1C: billboard, khối tán, phông xa. |

## 3. Cách làm một đợt

1. Mở cuộc trò chuyện mới với ChatGPT (đã nối repo GitHub). Gõ, ví dụ:
   - Ảnh: `Trong repo sinhvienaiti/space-typing, nhánh feat/space-typing-2026-10-18, đọc docs/art-requests/td/02-tripo-buildings-props.md và tạo ảnh cho mục P1. Ghi tên file và đường dẫn lưu ngay phía trên mỗi ảnh, trong tin nhắn. Không vẽ chữ vào ảnh.`
   - Nhiều mục: `Trong repo sinhvienaiti/space-typing, nhánh feat/space-typing-2026-10-18, đọc docs/art-requests/td/01-tripo-characters-enemies.md và tạo ảnh cho mục P1-P4.`
   - Tiếng: `Trong repo sinhvienaiti/space-typing, nhánh feat/space-typing-2026-10-18, đọc docs/art-requests/td/04-audio.md và làm prompt cho mục A01-A08.`
   - Bộ file nằm ở nhánh `feat/space-typing-2026-10-18` của repo `sinhvienaiti/space-typing`, chưa có ở `main`. Tin nhắn luôn ghi tên repo và nhánh. ChatGPT đọc file trên GitHub, nên file phải đã được commit và push lên nhánh đó.
   - Khi làm ảnh chính P18 Draconis `draconis.png` (file 01), đính kèm thêm `art-src/td/refs/3.png` (xem bước 3). 3.png chỉ dùng cho ảnh chính P18 (và chân dung C1 khi chưa có ảnh P18). Ảnh `-side`, `-back` chỉ đính kèm `draconis.png` đã duyệt.
2. Kiểm ảnh theo bảng kiểm của file đó: 01 mục 4, 02 mục 3.7, 03 mục 12. Chưa đạt thì bảo ChatGPT làm lại và nói rõ lỗi.
3. Lưu đúng tên, đúng thư mục ghi ở mục. Đường dẫn tính từ thư mục game `games/space-typing/`. Thư mục chưa có thì tạo.
   - Ảnh 2D: `art-src/td/<loại>/<id>.png`. Cảnh vật: `art-src/td/scenery/<vùng>/<id>-v<n>.png`.
   - Model Tripo: cùng đường dẫn, thêm `3d/` sau `art-src/`, đuôi `.glb`. Ví dụ `art-src/td/enemies/troll.png` → `art-src/3d/td/enemies/troll.glb`.
   - Tiếng gốc (WAV 48 kHz 24-bit): `art-src/td/audio/<nhóm>/<id>[-v<n>].wav`. Chi tiết ở 04 mục 2.4.
   - Cùng một tên file có thể nằm ở hai thư mục: `buildings/keep.png` là ảnh gửi Tripo, `ui/buildings/keep.png` là icon. Lưu đúng thư mục.
   - Ảnh mẫu chủ dự án đã gửi: lưu `2.png` (Lam), `3.png` (Draconis), `4.webp` (khối tán) vào `art-src/td/refs/`. Git bỏ qua thư mục này, `pnpm media:push` sao lưu nó. Nhờ vậy đính kèm được trong ChatGPT, và AI làm sau xem được. Đính kèm là tùy chọn khi prompt chữ đã đủ (P7 Lam, S12, C1); riêng ảnh chính P18 Draconis nên đính kèm 3.png. Ảnh góc phụ (`-side`, `-back`) không đính kèm ảnh mẫu, chỉ đính kèm ảnh chính đã duyệt.
4. Tripo (chỉ ảnh của file 01, 02): Image to 3D; Multiview to 3D khi mục có ảnh góc phụ. Tách nền bật, texture HD, PBR bật, Quad tắt, Smart Low Poly tắt. Face limit, rig và clip theo từng mục. Tải GLB, đổi tên đúng dòng "Model 3D". Chi tiết ở 01 mục 5 và 02 mục 5.
5. Sao lưu. Ở thư mục gốc `typing-game`:
   - có GLB mới thì chạy trước `node games/space-typing/scripts/models/index-3d-sources.mjs` (thiếu bước này thì push từ chối);
   - rồi chạy `pnpm media:push`.
   - Ảnh, tiếng, model **không bao giờ vào Git**. Git bỏ qua `art-src/`. Bản gốc nằm trên Google Drive (`docs/MEDIA_STORAGE.md` ở repo cha).
6. Báo AI, ví dụ: `Đã lưu xong P1-P6 file 02 và P1 file 01. Đã chạy index-3d-sources và pnpm media:push.` Đánh dấu cột "Xong?" ở mục 6.

## 4. Luật chung

- Một ảnh một vật, đúng tên file. Không chữ, số, logo, chữ ký trong ảnh. Bùa, bảng đá, cuộn giấy để trống.
- Cỡ ảnh chỉ có 1024×1024, 1024×1536, 1536×1024. Dùng đúng cỡ ghi ở mục.
- Nền khóa màu, câu nền giống từng chữ ở file 01, 02, 03:
  - xanh `#00FF00` mặc định (BG-G; file 03 viết G);
  - hồng `#FF00FF` khi vật có xanh lá (BG-M, M);
  - lam `#0000FF` khi vật có cả xanh lá và hồng hoặc tím hồng (BG-B, B);
  - hiệu ứng phát sáng ở file 03: nền đen (K). Trời, mặt nạ, tranh vẽ kín, ảnh trượt: không dòng nền.
- Ảnh gửi Tripo: không lửa, khói, hạt, quầng sáng, vệt chuyển động; không viền đen vẽ sẵn; không sợi mảnh; ánh sáng phẳng, không bóng đổ. Lửa và hiệu ứng làm bằng VFX (23.11, 27.4). Nhân vật nhìn thẳng, tư thế A; thú nhìn ngang; nhà nhìn 3/4 từ trước.
- Màu dành riêng (23.3): đỏ `#FF4A4A` là nguy hiểm, cam `#FFB020` là khẩn, vàng kim `#FFC83A` là tiền, xanh ngọc `#7FF5E0` / `#0B8A78` là sức gõ. Không tô mảng lớn các màu này cho việc khác. Vệt Mực Câm trên quái là shader, không vẽ.
- Face limit (bảng chung ở 02 mục 5, cùng số với 01 mục 5): Tướng 20000; Trợ Thủ 8000; lính, thợ 5000; quái nhỏ, vừa 6000; quái to 9000; boss 30000; nhà 10000 (Lũy 15000); bộ cấp 4000; mốc cảnh 8000; đồ rơi, đồ gắn, đạn 2000. Mục nào ghi số riêng thì theo mục (ví dụ Draconis P18 file 01: 30000; Rễ Trồi P18 file 02: 4000).
- id viết kebab-case không dấu, theo bảng 0.6. Id tiếng có dạng `td.<nhóm>.<việc>`, mỗi phần theo id 0.6 (ví dụ `td.enemy.cuong-thi.move`).
- Prompt không nêu tên game thương mại, thương hiệu, người thật. Repo công khai: không ghi email, mật khẩu, khóa.

## 5. Số mục theo bậc

Đếm theo mã mục. Một mã có thể ra nhiều file (biến thể, lớp tiếng, góc phụ).

| File | P | VS | Sau | Ghi chú |
|---|---|---|---|---|
| 01 | 27 | — | 7 | 21 model; góc phụ bắt buộc ở P15, nên có ở P1, P7, P12, P14, P17, P18 |
| 01-vs | — | 45 | — | 21 mã và 24 bộ gắn thợ (K01–K24) |
| 02 | 18 | — | 7 | 21 model (P8 là 4 đống vàng) |
| 02-vs | — | 70 | — | 70 model |
| 03 | 70 | — | 8 | 83 ảnh |
| 03-vs | — | 85 | — | 72 mã mới và v3, v4 của S1–S13; khoảng 200 ảnh |
| 04 | 121 | — | 8 | 70 tiếng ngắn, 36 câu, 3 tiếng gắng sức, nhạc bản đồ 1, 11 câu nhạc |
| 04-vs | — | 339 | — | 161 tiếng ngắn, 156 câu, 8 tiếng gắng sức, 6 âm nền, 8 nhạc |

## 6. Mọi mục bậc P

- Cột "Lưu": đường dẫn sau `art-src/td/`. Cột "Model 3D": đường dẫn sau `art-src/3d/td/`. `—` là không có model.
- Cảnh vật bậc P có hai biến thể `-v1`, `-v2`.
- Tiếng: cột "Lưu" là thư mục. Tên file theo 04 mục 2.4: `<id>-v<n>.wav`; tiếng nhiều lớp `<id>.<lớp>-v<n>.wav`; câu thoại `<id>-en.wav` (Bà Cú Mực `<id>-vi.wav`). Số bản ghi ở từng mục.
- Nhạc M01–M12: AI làm bản bằng mã trước (04 mục 8.1, 8.7). Bản bằng công cụ AI là bản nâng cấp, tùy chọn. Câu nhạc ngắn M02–M12 cần công cụ đặt được độ dài 2–8 s (04 mục 2.1).

Tổng: 236 mục bậc P (01: 27, 02: 18, 03: 70, 04: 121).

| Mã | id | Tên | File | Lưu | Model 3D | Xong? |
|---|---|---|---|---|---|---|
| P1 | `helper-owlet` | Thân cú non chung của 3 Thư Đồng | 01 | `helpers/helper-owlet.png` (+ `-side`, `-back`) | `helpers/helper-owlet.glb` | |
| P2a | `helper-cham-glasses` | Kính tròn của Chấm | 01 | `helpers/helper-cham-glasses.png` | `helpers/helper-cham-glasses.glb` | |
| P2b | `helper-cham-scarf` | Khăn chấm bi của Chấm | 01 | `helpers/helper-cham-scarf.png` | `helpers/helper-cham-scarf.glb` | |
| P2c | `helper-cham-strap` | Vải dây đeo của Chấm (texture, không gửi Tripo) | 01 | `helpers/helper-cham-strap.png` | — | |
| P3a | `helper-phay-tail` | Lông đuôi dấu phẩy của Phẩy | 01 | `helpers/helper-phay-tail.png` | `helpers/helper-phay-tail.glb` | |
| P3b | `helper-phay-strap` | Vải dây đeo của Phẩy (texture, không gửi Tripo) | 01 | `helpers/helper-phay-strap.png` | — | |
| P4a | `helper-gach-wingband` | Băng cánh sọc của Gạch | 01 | `helpers/helper-gach-wingband.png` | `helpers/helper-gach-wingband.glb` | |
| P4b | `helper-gach-strap` | Vải dây đeo của Gạch (texture, không gửi Tripo) | 01 | `helpers/helper-gach-strap.png` | — | |
| P5a | `helper-brush` | Bút lông cầm tay của Thư Đồng | 01 | `helpers/helper-brush.png` | `helpers/helper-brush.glb` | |
| P5b | `helper-drum` | Trống con của Thư Đồng | 01 | `helpers/helper-drum.png` | `helpers/helper-drum.glb` | |
| P5c | `helper-hammer` | Búa con của Thư Đồng | 01 | `helpers/helper-hammer.png` | `helpers/helper-hammer.glb` | |
| P6a | `helper-cham-ref` | Ảnh mẫu Chấm mặc đủ (không gửi Tripo) | 01 | `helpers/helper-cham-ref.png` | — | |
| P6b | `helper-phay-ref` | Ảnh mẫu Phẩy mặc đủ (không gửi Tripo) | 01 | `helpers/helper-phay-ref.png` | — | |
| P6c | `helper-gach-ref` | Ảnh mẫu Gạch mặc đủ (không gửi Tripo) | 01 | `helpers/helper-gach-ref.png` | — | |
| P7 | `lam` | Tướng Lam (27.2: nếu kịp) | 01 | `heroes/lam.png` (+ `-side`, `-back`) | `heroes/lam.glb` | |
| P8a | `linh-giao` | Lính Giáo | 01 | `units/linh-giao.png` | `units/linh-giao.glb` | |
| P8b | `linh-giao-spear` | Giáo của Lính Giáo | 01 | `units/linh-giao-spear.png` | `units/linh-giao-spear.glb` | |
| P9 | `cuong-thi` | Cương Thi | 01 | `enemies/cuong-thi.png` | `enemies/cuong-thi.glb` | |
| P10 | `cuong-thi-lead-hat` | Mũ Cương Thi Đầu Đàn | 01 | `enemies/cuong-thi-lead-hat.png` | `enemies/cuong-thi-lead-hat.glb` | |
| P11 | `nuppeppo` | Nuppeppō | 01 | `enemies/nuppeppo.png` | `enemies/nuppeppo.glb` | |
| P12 | `thuong-luong` | Thuồng Luồng | 01 | `enemies/thuong-luong.png` (+ `-front`) | `enemies/thuong-luong.glb` | |
| P13 | `tanuki` | Lửng Tanuki | 01 | `enemies/tanuki.png` | `enemies/tanuki.glb` | |
| P14 | `troll` | Quỷ Núi Troll | 01 | `enemies/troll.png` (+ `-back`) | `enemies/troll.glb` | |
| P15 | `alicanto` | Chim Vàng Alicanto | 01 | `enemies/alicanto.png` (+ `-front`) | `enemies/alicanto.glb` | |
| P16 | `mam-go` | Mầm Gỗ | 01 | `enemies/mam-go.png` | `enemies/mam-go.glb` | |
| P17 | `moc-tinh` | Boss Mộc Tinh | 01 | `bosses/moc-tinh.png` (+ `-side`, `-back`) | `bosses/moc-tinh.glb` | |
| P18 | `draconis` | Tướng Draconis, model mới theo ảnh 3.png (v2 là model tạm) | 01 | `heroes/draconis.png` (+ `-side`, `-back`) | `heroes/draconis.glb` | |
| P1 | `keep` | Lũy Chữ cấp 1 | 02 | `buildings/keep.png` | `buildings/keep.glb` | |
| P2 | `archer` | Tháp Cung cấp 1 | 02 | `buildings/archer.png` | `buildings/archer.glb` | |
| P3 | `cannon` | Tháp Pháo cấp 1 (không nòng) | 02 | `buildings/cannon.png` | `buildings/cannon.glb` | |
| P4 | `cannon-barrel` | Nòng Tháp Pháo cấp 1–2 | 02 | `buildings/cannon-barrel.png` | `buildings/cannon-barrel.glb` | |
| P5 | `barracks` | Trại Lính cấp 1 | 02 | `buildings/barracks.png` | `buildings/barracks.glb` | |
| P6 | `gold-mine` | Mỏ Vàng cấp 1 | 02 | `buildings/gold-mine.png` | `buildings/gold-mine.glb` | |
| P7 | `gold-mine-cart` | Xe goòng của Mỏ | 02 | `props/gold-mine-cart.png` | `props/gold-mine-cart.glb` | |
| P8 | `gold-pile-1` … `-4` | Đống vàng 4 bậc (4 ảnh, 4 model) | 02 | `props/gold-pile-1.png` … `-4.png` | `props/gold-pile-1.glb` … `-4.glb` | |
| P9 | `arrow` | Mũi tên Tháp Cung | 02 | `projectiles/arrow.png` | `projectiles/arrow.glb` | |
| P10 | `shell` | Quả đạn Tháp Pháo | 02 | `projectiles/shell.png` | `projectiles/shell.glb` | |
| P11 | `keep-bolt` | Mũi nỏ Lũy | 02 | `projectiles/keep-bolt.png` | `projectiles/keep-bolt.glb` | |
| P12 | `farm` | Ruộng Lúa cấp 1 | 02 | `buildings/farm.png` | `buildings/farm.glb` | |
| P13 | `bag-cloth` | Túi vải | 02 | `loot/bag-cloth.png` | `loot/bag-cloth.glb` | |
| P14 | `bag-basket` | Giỏ tre | 02 | `loot/bag-basket.png` | `loot/bag-basket.glb` | |
| P15 | `chest-boss` | Rương Boss | 02 | `loot/chest-boss.png` | `loot/chest-boss.glb` | |
| P16 | `seal-dais` | Đài Ấn cấp 1 (27.2: nếu kịp) | 02 | `buildings/seal-dais.png` | `buildings/seal-dais.glb` | |
| P17 | `level-pennant` | Cờ cấp chung của mọi nhà | 02 | `props/level-pennant.png` | `props/level-pennant.glb` | |
| P18 | `root-burst` | Rễ Trồi của Mộc Tinh | 02 | `projectiles/root-burst.png` | `projectiles/root-burst.glb` | |
| S1 | `almond-tree` | Cây bàng | 03 | `scenery/meadow/almond-tree-v1.png`, `-v2.png` | — | |
| S2 | `mountain-pine` | Thông núi | 03 | `scenery/meadow/mountain-pine-v1.png`, `-v2.png` | — | |
| S3 | `bamboo-clump` | Khóm tre | 03 | `scenery/meadow/bamboo-clump-v1.png`, `-v2.png` | — | |
| S4 | `raspberry-bush` | Bụi mâm xôi | 03 | `scenery/meadow/raspberry-bush-v1.png`, `-v2.png` | — | |
| S5 | `tall-grass` | Cỏ cao | 03 | `scenery/meadow/tall-grass-v1.png`, `-v2.png` | — | |
| S6 | `reed-clump` | Cỏ lau | 03 | `scenery/meadow/reed-clump-v1.png`, `-v2.png` | — | |
| S7 | `wildflowers` | Hoa dại trắng vàng | 03 | `scenery/meadow/wildflowers-v1.png`, `-v2.png` | — | |
| S8 | `fern` | Dương xỉ | 03 | `scenery/meadow/fern-v1.png`, `-v2.png` | — | |
| S9 | `rock-small` | Đá xám rêu nhỏ | 03 | `scenery/meadow/rock-small-v1.png`, `-v2.png` | — | |
| S10 | `rock-medium` | Đá xám rêu vừa | 03 | `scenery/meadow/rock-medium-v1.png`, `-v2.png` | — | |
| S11 | `rotten-log` | Khúc gỗ mục | 03 | `scenery/meadow/rotten-log-v1.png`, `-v2.png` | — | |
| S12 | `canopy-block` | Khối tán mép rừng | 03 | `scenery/meadow/canopy-block-v1.png`, `-v2.png` | — | |
| S13 | `tree-stump` | Gốc cây (decal dùng chung mọi vùng) | 03 | `scenery/shared/tree-stump-v1.png`, `-v2.png` | — | |
| F1 | `sky-a` | Dải trời có cầu vồng | 03 | `backdrops/w1-silverfall/sky-a.png` | — | |
| F2 | `sky-b` | Dải trời mây sáng | 03 | `backdrops/w1-silverfall/sky-b.png` | — | |
| F3 | `layer-320` | Núi xa lam nhạt | 03 | `backdrops/w1-silverfall/layer-320.png` | — | |
| F4 | `layer-220` | Đồi rừng, vách đá vôi | 03 | `backdrops/w1-silverfall/layer-220.png` | — | |
| F5 | `layer-140-a` | Đồi chè có cối xay gió | 03 | `backdrops/w1-silverfall/layer-140-a.png` | — | |
| F6 | `layer-140-b` | Đồi chè trơn | 03 | `backdrops/w1-silverfall/layer-140-b.png` | — | |
| C1 | `draconis` | Chân dung Draconis | 03 | `portraits/draconis.png` | — | |
| C2 | `helper-cham-happy` | Chấm vui | 03 | `portraits/helper-cham-happy.png` | — | |
| C3 | `helper-cham-scared` | Chấm hoảng | 03 | `portraits/helper-cham-scared.png` | — | |
| C4 | `helper-phay-happy` | Phẩy vui | 03 | `portraits/helper-phay-happy.png` | — | |
| C5 | `helper-phay-scared` | Phẩy hoảng | 03 | `portraits/helper-phay-scared.png` | — | |
| C6 | `helper-gach-happy` | Gạch vui | 03 | `portraits/helper-gach-happy.png` | — | |
| C7 | `helper-gach-scared` | Gạch hoảng | 03 | `portraits/helper-gach-scared.png` | — | |
| C8 | `narrator` | Bà Cú Mực, người kể | 03 | `portraits/narrator.png` | — | |
| L1 | `lantern-unlit` | Đèn lồng tắt | 03 | `ui/lanterns/lantern-unlit.png` | — | |
| L2 | `lantern-lit` | Đèn lồng sáng | 03 | `ui/lanterns/lantern-lit.png` | — | |
| L3 | `lantern-blazing` | Đèn lồng cháy rực | 03 | `ui/lanterns/lantern-blazing.png` | — | |
| U1 | `keep` | Icon Lũy Chữ | 03 | `ui/buildings/keep.png` | — | |
| U2 | `archer` | Icon Tháp Cung | 03 | `ui/buildings/archer.png` | — | |
| U3 | `cannon` | Icon Tháp Pháo | 03 | `ui/buildings/cannon.png` | — | |
| U4 | `barracks` | Icon Trại Lính | 03 | `ui/buildings/barracks.png` | — | |
| U5 | `gold-mine` | Icon Mỏ Vàng | 03 | `ui/buildings/gold-mine.png` | — | |
| U6 | `farm` | Icon Ruộng Lúa | 03 | `ui/buildings/farm.png` | — | |
| U7 | `seal-dais` | Icon Đài Ấn (nếu kịp) | 03 | `ui/buildings/seal-dais.png` | — | |
| U8 | `tempo-0` | Icon nhịp Dừng | 03 | `ui/tempo/tempo-0.png` | — | |
| U9 | `tempo-6` | Icon nhịp 6 s (8 s dùng chung) | 03 | `ui/tempo/tempo-6.png` | — | |
| U10 | `tempo-4` | Icon nhịp 4 s | 03 | `ui/tempo/tempo-4.png` | — | |
| U11 | `tempo-3` | Icon nhịp 3 s | 03 | `ui/tempo/tempo-3.png` | — | |
| U12 | `tempo-2` | Icon nhịp 2 s | 03 | `ui/tempo/tempo-2.png` | — | |
| U13 | `tempo-1` | Icon nhịp 1 s | 03 | `ui/tempo/tempo-1.png` | — | |
| U14 | `charm-mend` | Icon Bùa Sửa | 03 | `ui/charms/charm-mend.png` | — | |
| U15 | `charm-frost` | Icon Bùa Băng | 03 | `ui/charms/charm-frost.png` | — | |
| U16 | `charm-gale` | Icon Bùa Gió | 03 | `ui/charms/charm-gale.png` | — | |
| U17 | `lives` | Icon Mạng | 03 | `ui/resources/lives.png` | — | |
| U18 | `gold` | Icon Vàng | 03 | `ui/resources/gold.png` | — | |
| U19 | `food` | Icon Lúa (cũng là bó lúa bay về HUD) | 03 | `ui/resources/food.png` | — | |
| U20 | `wood` | Icon Gỗ (cũng là khúc gỗ bay về HUD) | 03 | `ui/resources/wood.png` | — | |
| U21 | `knowledge` | Icon Tri thức | 03 | `ui/resources/knowledge.png` | — | |
| U22 | `wave` | Icon Đợt | 03 | `ui/resources/wave.png` | — | |
| U23 | `coin-common` | Đồng bậc common | 03 | `ui/loot/coin-common.png` | — | |
| U24 | `coin-refined` | Đồng bậc refined | 03 | `ui/loot/coin-refined.png` | — | |
| U25 | `coin-high` | Đồng bậc high | 03 | `ui/loot/coin-high.png` | — | |
| U26 | `coin-elite` | Đồng bậc elite | 03 | `ui/loot/coin-elite.png` | — | |
| U27 | `coin-mini-boss` | Đồng bậc mini-boss | 03 | `ui/loot/coin-mini-boss.png` | — | |
| U28 | `coin-major-boss` | Đồng bậc major-boss | 03 | `ui/loot/coin-major-boss.png` | — | |
| X1 | `dust-puff` | VFX bụi bung | 03 | `vfx/dust-puff.png` | — | |
| X2 | `explosion` | VFX nổ | 03 | `vfx/explosion.png` | — | |
| X3 | `flame-loop` | VFX lửa lặp | 03 | `vfx/flame-loop.png` | — | |
| X4 | `water-splash` | VFX té nước | 03 | `vfx/water-splash.png` | — | |
| X5 | `ink-splat` | VFX mực bắn | 03 | `vfx/ink-splat.png` | — | |
| X6 | `paper-scraps` | VFX giấy vụn | 03 | `vfx/paper-scraps.png` | — | |
| X7 | `leaf-flakes` | VFX lá rơi | 03 | `vfx/leaf-flakes.png` | — | |
| X8 | `wood-chips` | VFX mảnh gỗ | 03 | `vfx/wood-chips.png` | — | |
| X9 | `stone-chips` | VFX mảnh đá | 03 | `vfx/stone-chips.png` | — | |
| X10 | `scorch-mark` | Mặt nạ vết cháy | 03 | `vfx/scorch-mark.png` | — | |
| X11 | `ma-troi-wisp` | VFX đốm Ma Trơi | 03 | `vfx/ma-troi-wisp.png` | — | |
| X12 | `ma-troi-sheet` | Tờ tham khảo Ma Trơi (không bắt buộc) | 03 | `vfx/ma-troi-sheet.png` | — | |
| A01 | `td.keep.fire` | Nỏ Lũy bắn | 04 | `audio/sfx/` | — | |
| A02 | `td.keep.hit` | Mũi nỏ trúng | 04 | `audio/sfx/` | — | |
| A03 | `td.archer.fire` | Tháp Cung bắn | 04 | `audio/sfx/` | — | |
| A04 | `td.archer.hit` | Tên trúng | 04 | `audio/sfx/` | — | |
| A05 | `td.archer.wordshot` | Tên Chữ | 04 | `audio/sfx/` | — | |
| A06 | `td.cannon.fire` | Tháp Pháo bắn | 04 | `audio/sfx/` | — | |
| A07 | `td.cannon.hit` | Đạn pháo nổ | 04 | `audio/sfx/` | — | |
| A08 | `td.cannon.wordshot` | Đạn Chữ | 04 | `audio/sfx/` | — | |
| A09 | `td.mat.cloth` | Lớp thân chất liệu vải, giấy (Cương Thi) | 04 | `audio/sfx/` | — | |
| A10 | `td.mat.flesh` | Lớp thân chất liệu thịt, lông (Tanuki) | 04 | `audio/sfx/` | — | |
| A11 | `td.mat.dough` | Lớp thân chất liệu bột (Nuppeppō) | 04 | `audio/sfx/` | — | |
| A12 | `td.mat.scale` | Lớp thân chất liệu vảy, nước (Thuồng Luồng) | 04 | `audio/sfx/` | — | |
| A13 | `td.mat.stone` | Lớp thân chất liệu đá (Troll) | 04 | `audio/sfx/` | — | |
| A14 | `td.mat.metal` | Lớp thân chất liệu kim loại (Alicanto) | 04 | `audio/sfx/` | — | |
| A15 | `td.mat.spirit` | Lớp thân chất liệu hồn (Ma Trơi) | 04 | `audio/sfx/` | — | |
| A16 | `td.mat.wood` | Lớp thân chất liệu gỗ (Mộc Tinh, Mầm Gỗ) | 04 | `audio/sfx/` | — | |
| A17 | `td.barracks.drum` | Trống trại | 04 | `audio/sfx/` | — | |
| A18 | `td.soldier.spear` | Lính Giáo đâm | 04 | `audio/sfx/` | — | |
| A19 | `td.soldier.death` | Lính ngã | 04 | `audio/sfx/` | — | |
| A20 | `td.gold-mine.pick` | Cuốc mỏ | 04 | `audio/sfx/` | — | |
| A21 | `td.gold-mine.cart` | Goòng lăn | 04 | `audio/sfx/` | — | |
| A22 | `td.farm.harvest` | Liềm gặt | 04 | `audio/sfx/` | — | |
| A23 | `td.farm.rustle` | Lúa xào xạc | 04 | `audio/sfx/` | — | |
| A24 | `td.farm.word` | Lúa mọc vọt | 04 | `audio/sfx/` | — | |
| A25 | `td.rare.gold.spawn` | Từ Vàng hiện | 04 | `audio/sfx/` | — | |
| A26 | `td.finisher.spawn` | Cụm chốt hiện | 04 | `audio/sfx/` | — | |
| A27 | `td.overdrive.keep` | Bùng Nổ Lũy: Khiên Lũy | 04 | `audio/sfx/` | — | |
| A28 | `td.overdrive.archer` | Bùng Nổ Tháp Cung: Mưa Tên | 04 | `audio/sfx/` | — | |
| A29 | `td.overdrive.cannon` | Bùng Nổ Tháp Pháo: Loạt Ba | 04 | `audio/sfx/` | — | |
| A30 | `td.overdrive.barracks` | Bùng Nổ Trại Lính: Hô Xung Trận | 04 | `audio/sfx/` | — | |
| A31 | `td.overdrive.gold-mine` | Bùng Nổ Mỏ: Mạch Vàng Lộ | 04 | `audio/sfx/` | — | |
| A32 | `td.bag.drop` | Túi rơi | 04 | `audio/sfx/` | — | |
| A33 | `td.bag.pickup` | Nhặt túi | 04 | `audio/sfx/` | — | |
| A34 | `td.chest.open` | Rương Boss | 04 | `audio/sfx/` | — | |
| A35 | `td.build.place` | Xây nhà | 04 | `audio/sfx/` | — | |
| A36 | `td.build.upgrade` | Nâng cấp | 04 | `audio/sfx/` | — | |
| A37 | `td.build.sell` | Bán nhà | 04 | `audio/sfx/` | — | |
| A38 | `td.warn.leak` | Quái lọt Lũy | 04 | `audio/sfx/` | — | |
| A39 | `td.warn.direct` | Mở cửa sổ gõ trực tiếp | 04 | `audio/sfx/` | — | |
| A40 | `td.enemy.ink-peel` | Chung mọi quái: vệt mực bong thành giấy vụn | 04 | `audio/sfx/` | — | |
| A41 | `td.enemy.cuong-thi.move` | Cương Thi nhảy cả bầy | 04 | `audio/sfx/` | — | |
| A42 | `td.enemy.cuong-thi.attack` | Cương Thi vồ lính | 04 | `audio/sfx/` | — | |
| A43 | `td.enemy.cuong-thi.death` | Bùa cháy từ dưới lên, hóa tro, chuông "tinh" | 04 | `audio/sfx/` | — | |
| A44 | `td.enemy.ma-troi.move` | Đàn Ma Trơi bay thấp (tiếng lặp) | 04 | `audio/sfx/` | — | |
| A45 | `td.enemy.ma-troi.death` | Từng đốm tắt, "plinh" thủy tinh | 04 | `audio/sfx/` | — | |
| A46 | `td.enemy.nuppeppo.move` | Nuppeppō lạch bạch | 04 | `audio/sfx/` | — | |
| A47 | `td.enemy.nuppeppo.attack` | Nuppeppō vỗ | 04 | `audio/sfx/` | — | |
| A48 | `td.enemy.nuppeppo.death` | Bóp giãn, phụt bột kem | 04 | `audio/sfx/` | — | |
| A49 | `td.enemy.thuong-luong.move` | Thuồng Luồng trườn | 04 | `audio/sfx/` | — | |
| A50 | `td.enemy.thuong-luong.attack` | Thuồng Luồng cắn, quật đuôi vào lính | 04 | `audio/sfx/` | — | |
| A51 | `td.enemy.thuong-luong.skill` | Phun vòng nước 5 m đẩy lính | 04 | `audio/sfx/` | — | |
| A52 | `td.enemy.thuong-luong.death` | Cột nước, vảy ngọc rơi | 04 | `audio/sfx/` | — | |
| A53 | `td.enemy.tanuki.move` | Tanuki chạy | 04 | `audio/sfx/` | — | |
| A54 | `td.enemy.tanuki.attack` | Tanuki cào | 04 | `audio/sfx/` | — | |
| A55 | `td.enemy.tanuki.skill` | Trống Bụng (đích của Ngắt) | 04 | `audio/sfx/` | — | |
| A56 | `td.enemy.tanuki.death` | Khói be, chiếc lá xoay rơi | 04 | `audio/sfx/` | — | |
| A57 | `td.enemy.troll.move` | Troll đi | 04 | `audio/sfx/` | — | |
| A58 | `td.enemy.troll.attack` | Troll đấm nắm tay đá xuống đất | 04 | `audio/sfx/` | — | |
| A59 | `td.enemy.troll.death` | Hóa đá, vỡ 3 tảng | 04 | `audio/sfx/` | — | |
| A60 | `td.enemy.alicanto.move` | Alicanto vỗ cánh kim loại | 04 | `audio/sfx/` | — | |
| A61 | `td.enemy.alicanto.skill` | Sà xuống trộm vàng ở đống | 04 | `audio/sfx/` | — | |
| A62 | `td.enemy.alicanto.death` | Lông vàng rụng thành đồng | 04 | `audio/sfx/` | — | |
| A63 | `td.enemy.mam-go.move` | Mầm Gỗ đi | 04 | `audio/sfx/` | — | |
| A64 | `td.enemy.mam-go.attack` | Mầm Gỗ quất cành | 04 | `audio/sfx/` | — | |
| A65 | `td.enemy.mam-go.death` | Mầm Gỗ héo rũ | 04 | `audio/sfx/` | — | |
| A66 | `td.boss.moc-tinh.attack` | Quật cành, vùng 3 m | 04 | `audio/sfx/` | — | |
| A67 | `td.boss.moc-tinh.roots-warn` | Báo trước Rễ Trồi 1,5 s | 04 | `audio/sfx/` | — | |
| A68 | `td.boss.moc-tinh.roots` | Rễ trồi dưới nhà | 04 | `audio/sfx/` | — | |
| A69 | `td.boss.moc-tinh.roar` | Gầm: ra mắt, choáng ở 70 %, đổi pha | 04 | `audio/sfx/` | — | |
| A70 | `td.boss.moc-tinh.retreat` | Rút lui ở 50 %, chui xuống đất | 04 | `audio/sfx/` | — | |
| V01 | `td.vo.draconis.select-1` | Câu: “I am listening.” | 04 | `audio/voice/draconis/` | — | |
| V02 | `td.vo.draconis.move` | Câu: “Taking wing.” | 04 | `audio/voice/draconis/` | — | |
| V03 | `td.vo.draconis.assist` | Câu: “Speak true. I burn.” | 04 | `audio/voice/draconis/` | — | |
| V04 | `td.vo.draconis.skill-1` | Câu: “Phoenix fire!” | 04 | `audio/voice/draconis/` | — | |
| V05 | `td.vo.draconis.skill-2` | Câu: “Fall, sky-thieves!” | 04 | `audio/voice/draconis/` | — | |
| V06 | `td.vo.draconis.ult` | Câu: “Feathers of flame, fall!” | 04 | `audio/voice/draconis/` | — | |
| V07 | `td.vo.draconis.low-hp` | Câu: “My scales crack.” | 04 | `audio/voice/draconis/` | — | |
| V08 | `td.vo.draconis.down` | Câu: “I return from ash.” | 04 | `audio/voice/draconis/` | — | |
| V09 | `td.vo.draconis.respawn` | Câu: “Ash cannot hold me.” | 04 | `audio/voice/draconis/` | — | |
| V10 | `td.vo.draconis.victory` | Câu: “Another name kept.” | 04 | `audio/voice/draconis/` | — | |
| V11 | `td.vo.draconis.chain-10` | Câu: “Letters, aligned like stars.” | 04 | `audio/voice/draconis/` | — | |
| V12 | `td.vo.draconis.chain-25` | Câu: “The sky listens.” | 04 | `audio/voice/draconis/` | — | |
| V13 | `td.vo.helper-cham.select` | Câu: “Here!” | 04 | `audio/voice/helper-cham/` | — | |
| V14 | `td.vo.helper-cham.go` | Câu: “On my way.” | 04 | `audio/voice/helper-cham/` | — | |
| V15 | `td.vo.helper-cham.arrive` | Câu: “Slate ready.” | 04 | `audio/voice/helper-cham/` | — | |
| V16 | `td.vo.helper-cham.gold-word` | Câu: “Golden word!” | 04 | `audio/voice/helper-cham/` | — | |
| V17 | `td.vo.helper-cham.scared` | Câu: “My glasses!” | 04 | `audio/voice/helper-cham/` | — | |
| V18 | `td.vo.helper-cham.victory` | Câu: “Full stop!” | 04 | `audio/voice/helper-cham/` | — | |
| V19 | `td.vo.narrator.teach-wave-1` | Câu: “Đưa Draconis tới tháp. Gõ chữ bay lên.” | 04 | `audio/voice/narrator/` | — | |
| V20 | `td.vo.narrator.rare-first` | Câu: “Chữ sáng thế kia, đừng để bay mất.” | 04 | `audio/voice/narrator/` | — | |
| V21 | `td.vo.narrator.keep-level-2` | Câu: “Chấm đâu, ra giúp đi con.” | 04 | `audio/voice/narrator/` | — | |
| V22 | `td.vo.narrator.mine-thief` | Câu: “Có trộm ở mỏ kìa!” | 04 | `audio/voice/narrator/` | — | |
| V23 | `td.vo.narrator.boss-arrives` | Câu: “Thứ gì to lắm đang tới...” | 04 | `audio/voice/narrator/` | — | |
| V24 | `td.vo.narrator.keep-weak` | Câu: “Lũy Chữ sắp vỡ!” | 04 | `audio/voice/narrator/` | — | |
| V25 | `td.vo.crew-keep.assist` | Câu: “Typing with me? Splendid.” | 04 | `audio/voice/keep-lao-gac/` | — | |
| V26 | `td.vo.crew-keep.overdrive` | Câu: “Shield up! None pass!” | 04 | `audio/voice/keep-lao-gac/` | — | |
| V27 | `td.vo.crew-barracks.assist` | Câu: “Someone's on the drum!” | 04 | `audio/voice/barracks-sam/` | — | |
| V28 | `td.vo.crew-barracks.overdrive` | Câu: “Charge!” | 04 | `audio/voice/barracks-sam/` | — | |
| V29 | `td.vo.crew-archer.assist` | Câu: “You type, we shoot!” | 04 | `audio/voice/archer-chi-en/` | — | |
| V30 | `td.vo.crew-archer.overdrive` | Câu: “Arrow rain!” | 04 | `audio/voice/archer-em-se/` | — | |
| V31 | `td.vo.crew-cannon.assist` | Câu: “Type true. I won't miss.” | 04 | `audio/voice/cannon-bac-dong/` | — | |
| V32 | `td.vo.crew-cannon.overdrive` | Câu: “Triple shot!” | 04 | `audio/voice/cannon-bac-dong/` | — | |
| V33 | `td.vo.crew-gold-mine.assist` | Câu: “Type steady, dig steady!” | 04 | `audio/voice/gold-mine-anh-em/` | — | |
| V34 | `td.vo.crew-gold-mine.overdrive` | Câu: “Gold vein!” | 04 | `audio/voice/gold-mine-anh-em/` | — | |
| V35 | `td.vo.crew-farm.assist` | Câu: “Steady, like planting rice.” | 04 | `audio/voice/farm-co-ma/` | — | |
| V36 | `td.vo.crew-farm.overdrive` | Câu: “Hot rice!” | 04 | `audio/voice/farm-co-ma/` | — | |
| V-E1 | `td.vo.linh-giao.hup` | Tiếng gắng sức "Hup!" ngắn, gọn | 04 | `audio/voice/linh-giao/` | — | |
| V-E2 | `td.vo.linh-giao.death` | Tiếng gắng sức "Á!" ngắn, kiểu hoạt hình, không đau đớn | 04 | `audio/voice/linh-giao/` | — | |
| V-E3 | `td.vo.crew.heave-ho` | Tiếng gắng sức "Hò dô!" của 2–3 người | 04 | `audio/voice/crew/` | — | |
| M01 | `td.music.w1-silverfall` | Nhạc bản đồ 1, 3 lớp (bản mã do AI làm trước) | 04 | `audio/music/` | — | |
| M02 | `td.stinger.wave-start` | Câu nhạc ngắn: Đầu đợt | 04 | `audio/music/` | — | |
| M03 | `td.stinger.wave-clear` | Câu nhạc ngắn: Hết đợt | 04 | `audio/music/` | — | |
| M04 | `td.stinger.boss-intro` | Câu nhạc ngắn: Boss ra mắt | 04 | `audio/music/` | — | |
| M05 | `td.stinger.boss-phase` | Câu nhạc ngắn: Boss đổi pha | 04 | `audio/music/` | — | |
| M06 | `td.stinger.building-unlock` | Câu nhạc ngắn: Mở nhà mới | 04 | `audio/music/` | — | |
| M07 | `td.stinger.overdrive` | Câu nhạc ngắn: Bùng Nổ (chờ 4 s chung) | 04 | `audio/music/` | — | |
| M08 | `td.stinger.slot-unlock` | Câu nhạc ngắn: Mở ô (lễ mở ô) | 04 | `audio/music/` | — | |
| M09 | `td.stinger.chain-20` | Câu nhạc ngắn: Mốc Chuỗi 20 | 04 | `audio/music/` | — | |
| M10 | `td.stinger.chain-40` | Câu nhạc ngắn: Mốc Chuỗi 40 | 04 | `audio/music/` | — | |
| M11 | `td.stinger.victory` | Câu nhạc ngắn: Thắng | 04 | `audio/music/` | — | |
| M12 | `td.stinger.defeat` | Câu nhạc ngắn: Thua | 04 | `audio/music/` | — | |

## 7. Đã tự quyết (đổi được)

Chủ dự án giao AI tự quyết các việc dưới đây (22/10). Mọi dòng đều đổi được: báo AI một câu như cột cuối, AI sửa file prompt và thiết kế cho khớp.

| Việc | Đã chọn | Muốn đổi thì báo AI |
|---|---|---|
| Dáng Draconis | Theo ảnh 3.png (22.2): rồng hai chân, thân trắng, cánh lông vũ vàng kem, chóp lông tô đỏ cam, móng và giáp đen vàng. Model mới là P18 (01 mục 7). `draconis-v2` (rồng đỏ cánh màng) là model tạm. C1, C23, T1, T2, V70 theo dáng này. | "Draconis giữ dáng đỏ v2: bỏ P18, viết lại C1, C23, T1, T2, V70." |
| Chiều cao Tháp Pháo | Giữ dáng thấp tròn khoảng 4 m (23.12). 23.2 ghi Pháo 3,5–4,5 m, ngoại lệ của dòng Nhà đánh; `td-scale` theo mức này (02 P3, mục 8). | "Pháo cao như nhà đánh: làm lại P3 với ụ cao hơn." |
| Socket đậu `FX_perch` | `FX_top` + 0,6 m ở mọi nhà có mái (23.9). Pháo cấp 1 đậu ở mép sau tường ụ, cấp 2–3 ở mép sau mái che; Đài Ấn ở mép sau mặt đài (02 mục 8). | "Đổi chỗ Draconis đậu ở nhà <tên>." |
| Cờ cấp chung `level-pennant` | Một cờ chung cho mọi nhà trừ Lũy. Game tô màu họ nhà. Blender làm 3 texture 1, 2, 3 vạch (02 P17). | "Bỏ cờ chung, làm cờ riêng theo bộ cấp." |
| Thư Đồng ở nhà có tổ thợ trên cao | Đi vào cửa nhà, hiện ở `FX_crew`; hoảng thì hiện lại ở cửa, chạy về Lũy (02 mục 3.3, mục 8). | "Thư Đồng đứng dưới chân nhà, không vào trong." |
| Món thêm vào P ngoài 27.2 | Giữ hết, lý do ở 01 mục 2, 02 mục 2.1, 03 mục 4, 04 mục 5. 27.2 nay ghi thêm Lính Giáo + giáo, Draconis dáng mới, Rễ Trồi. | "Chuyển <mã> sang VS." |
| Âm thanh bậc P | 70 id tiếng ngắn. "Hô" của lính ở P là tiếng "Hup!"; câu hô có lời ở VS. Các Tự quyết khác của file 04 giữ nguyên (04 mục 5, 7.4). | "Bớt tiếng P còn <số> id." hoặc "Đưa câu hô có lời của lính vào P." |
| Ảnh mẫu 2.png, 3.png, 4.webp | Lưu ở `art-src/td/refs/` (Git bỏ qua, `pnpm media:push` sao lưu). Đính kèm khi cần; ảnh chính P18 nên đính kèm 3.png, ảnh góc phụ thì không (mục 3). | "Lưu ảnh mẫu ở <thư mục khác>." |
| Cỡ Thuồng Luồng trong `td-scale` | Đo chiều cao đầu ngóc (khoảng 2,4 m), không đo thân dài 6 m (01 P12, mục 13). | "Đo Thuồng Luồng theo chiều dài thân." |
