# Prompt ảnh 2D cho Typing Defense: cảnh vật, phông xa, chân dung, UI, VFX (22/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh bằng ChatGPT), ChatGPT (đọc file và tạo ảnh), AI tích hợp về sau (tách nền, atlas, manifest).
>
> **Lấy từ thiết kế** `docs/td/TYPING_DEFENSE_DESIGN.md`: 0.6 (tên, id), 17.4 (đồng, túi, bùa), 22.1–22.3 (thế giới, Tướng, Thư Đồng, Bà Cú Mực), 22.4 (nhà), 22.9 (bản đồ), 23.1–23.5 (phong cách, cỡ, màu có nghĩa, thẻ chữ, HUD), 23.8 (VFX), 23.10 (cảnh 2D), 23.11 (ảnh 2D), 23.12 (bộ phong cách), 23.13 (tranh truyện), 27.2 (bậc), 28.12 (Thư Thành).
>
> **Bước hiện tại:** 1A (`docs/td/BUILD_NOW.md`), chưa dùng ảnh. Ảnh bậc P phục vụ 1B, 1C và bước 2 (thiết kế 0.5, 26.1; 26.2 ghi "art bậc P vào qua manifest" ở bước 2).
>
> **Bậc VS:** file [`03-2d-scenery-ui-vfx-vs.md`](03-2d-scenery-ui-vfx-vs.md) cùng thư mục. Mục lục và bảng việc của cả bộ: [`README.md`](README.md).
>
> **Không món nào ở đây gửi Tripo.** Mọi ảnh dùng thẳng dạng 2D, nên không có đường dẫn model 3D. Model 3D nằm ở các file Tripo cùng thư mục (ví dụ `01-tripo-characters-enemies.md`).

```text
Instructions for ChatGPT
1. Read this whole file first. Make one image per request and one subject per image.
   Never combine items. A "sheet" item is one image that holds a 4 x 4 grid.
2. Build every prompt by copying blocks from section 3 word for word, in the order given by the
   "Cách ghép" (recipe) line of the item's group, normally:
   STYLE + the KIND block (SCENERY, BACKDROP, PORTRAIT, ICON, VFX or MASK)
   + the LOOK block or shared base text of the group (if any) + the item prompt
   + the ONE variant line you are making (scenery only, e.g. "v1: ...")
   + the MATCH, SAME, REF, BUILDREF or LAYOUT line (only when an image is attached, step 6)
   + the background line whose code is in the item table (G, M, B, K; "none" means no line).
   Some recipes say "no STYLE" or "no KIND block": follow the recipe.
   When a later block contradicts an earlier one (for example STYLE asks for dark outlines and
   VFX asks for no outline on fire), the later, more specific block wins.
3. Use the image size in the item table. If the table has no size, use the size written at the
   end of the KIND block (1024x1024, 1024x1536 or 1536x1024 only).
4. Never draw text, letters, numbers, signatures, watermarks, logos, UI or frames.
5. After each image, write its exact save path from the item table
   (for example art-src/td/scenery/meadow/almond-tree-v1.png) so the owner can save it.
6. If the owner attaches an image, add the MATCH, SAME, REF, BUILDREF or LAYOUT line from
   section 3.9 that the item asks for, and follow the attached image as that line says.
7. Do not invent new items, ids or file names. Do not change colours given as hex codes.
8. If a rule is unclear, two rules conflict, or something you need is missing,
   ask the owner before generating. Do not guess.
```

## 1. Cách làm

1. Mở ChatGPT. Gõ, ví dụ: `Trong repo sinhvienaiti/space-typing, nhánh feat/space-typing-2026-10-18, đọc docs/art-requests/td/03-2d-scenery-ui-vfx.md và tạo ảnh cho mục S1–S3, biến thể v1.` Luôn ghi tên repo và nhánh: file chưa có ở `main`.
2. ChatGPT ghép prompt từ các khối ở mục 3, rồi tạo từng ảnh.
3. Chọn ảnh đẹp nhất. Kiểm tra theo mục 12. Chưa đạt thì bảo ChatGPT làm lại và nói rõ lỗi.
4. Tải ảnh PNG gốc. Lưu đúng đường dẫn trong bảng, cột "Lưu".
5. Xong một đợt thì sao lưu (mục 2).
6. Báo AI tích hợp.

- Mã mục: **S** cảnh vật, **F** phông xa, **C** chân dung, **L** đèn lồng, **U** icon, **X** VFX. File VS dùng tiếp số (S14, F7, C9…).
- Làm biến thể v2: tải ảnh v1 lên cùng prompt và thêm dòng MATCH. Các ảnh cùng loại sẽ đều tay.
- Làm trạng thái khác của cùng một vật (đèn lồng, nhịp): tải ảnh đầu lên và thêm dòng SAME.
- Làm ảnh hoảng của Thư Đồng: tải ảnh vui lên và thêm dòng REF.

## 2. Lưu file

- Thư mục `art-src/` không vào Git. `pnpm media:push` (chạy ở thư mục gốc `typing-game`) sao lưu nó lên Google Drive (xem `docs/MEDIA_STORAGE.md` của repo cha).
- Tên file: chữ thường, gạch ngang, không dấu, đúng từng ký tự như bảng.

| Loại | Đường dẫn |
|---|---|
| Cảnh vật | `art-src/td/scenery/<vùng>/<id>-v<n>.png` |
| Cảnh dùng chung mọi vùng (gốc cây) | `art-src/td/scenery/shared/<id>-v<n>.png` |
| Phông xa | `art-src/td/backdrops/<bản đồ>/<lớp>.png` |
| Chân dung, ảnh trượt Tối Thượng | `art-src/td/portraits/<id>.png` |
| Icon UI | `art-src/td/ui/<nhóm>/<id>.png` |
| VFX | `art-src/td/vfx/<id>.png` |
| Tranh truyện (VS) | `art-src/td/story/<tướng>/<n>.png` |
| Thú nền (VS) | `art-src/td/fauna/<id>.png` |
| Ảnh mẫu chủ dự án gửi | `art-src/td/refs/2.png` (Lam), `refs/3.png` (Draconis), `refs/4.webp` (khối tán) |

- Lưu các ảnh mẫu chủ dự án đã gửi vào `art-src/td/refs/`, giữ tên gốc. Git bỏ qua thư mục này, `pnpm media:push` sao lưu nó. Nhờ vậy đính kèm được trong ChatGPT, và AI làm sau xem được. Ở file này, đính kèm là tùy chọn: prompt chữ đã đủ (S12, C1).
- Tự quyết: tên vùng là `meadow` (bản đồ 1), `coast` (bản đồ 2), `rainforest` (bản đồ 3), `meadow-neon` (bản đồ thử Neon). Thư mục `shared` cho món dùng chung mọi vùng.
- Tự quyết: tên bản đồ trong đường dẫn phông là id ở 22.9: `w1-silverfall`, `w1-whitestone`, `w1-rootwood`.
- Tự quyết: id cảnh vật là tiếng Anh kebab-case, vì thiết kế chưa đặt id cho cảnh.
- Tự quyết: thú nền lưu riêng ở `art-src/td/fauna/`. Chúng là flipbook, không đi qua script cảnh. Không dùng `art-src/td/animals/`: thư mục đó là ảnh gửi Tripo (trâu, heo đất, chuồn chuồn ở file `01-…-vs.md`), mỗi ảnh ở đó phải có GLB cùng tên.

## 3. Khối prompt chung

### 3.1 STYLE (đầu mọi prompt, trừ bản Neon ở file VS)

```text
Bright hand-painted storybook fantasy art for a cozy tower-defense game set in a Vietnamese-inspired folk valley of rice terraces, bamboo villages, silver waterfalls and white limestone hills. Chunky rounded shapes, strong simple silhouettes, fresh warm colours (young-rice green, ripe-rice gold, river silver, bamboo brown, limestone white, small cinnabar accents), clean even dark ink outlines, flat colour fills with soft painted texture, charming, lively and warm like a classic illustrated picture book. No text, letters, numbers, signature, watermark, logo, frame or border.
```

### 3.2 SCENERY (cảnh vật, đúng luật 23.10)

```text
Single scenery cut-out for a 3D game that shows plants and rocks as flat painted billboards: exactly one object, whole and complete, centred, its base at the bottom centre of the image, a small empty margin on every side. Seen from the front, a little above eye level (about 10 degrees down), almost a side view, never from above. Flat, even, shadowless light from the front: no cast shadow, no strong highlight, no rim light, no sun direction. Foliage grouped into a few big rounded masses, each mass slightly darker on its underside. An even dark ink outline around the object and around each big mass. No ground, no soil, no grass, no pebbles and no flowers around the base: the base ends cleanly. No blur, no soft or see-through parts, no glow, no thin strands, no single hairs or needles, no tiny scattered leaves, no floating bits.
```

- Cạnh dài phải ≥ 1024 px. Khổ trong bảng đã đủ.
- Game tự thêm viền mực chuẩn, bóng, đung đưa, ramp 3 bậc (23.10). Tranh chỉ cần vật sáng phẳng, nền sạch.

### 3.3 BACKDROP (phông xa)

```text
Backdrop tile for a 3D game: one wide strip of very distant scenery that wraps around the play area. Viewed straight ahead at a level horizon: no tilt, no fisheye, no perspective lines. Soft even light, no strong shadows, no sun disc unless the item asks for one. Atmospheric haze: farther parts are paler and bluer, and their outlines are thinner and softer in colour. Large calm shapes, no small busy detail, no people, no animals, no buildings unless the item asks for one. The top edge of the land against the background is one crisp, solid line: no mist, haze or cloud crosses it. The left 8% and the right 8% of the image are calm and plain, and the ridge line meets both side edges at exactly the height given in the item, so tiles join side by side and also when mirrored. Landscape 1536 x 1024.
```

### 3.4 PORTRAIT (chân dung HUD)

```text
Character portrait for the game HUD: one character only, turned three-quarters toward the viewer's right and looking slightly right, a clear, readable expression. The face sits in the middle of the image with the eyes about 40% from the top; the character fills most of the frame, so the portrait still reads when cropped to a circle and shrunk to 64 px. Soft painted shading under even front light, crisp ink outline. Square 1024 x 1024.
```

- Tự quyết: mọi chân dung quay 3/4 sang phải người xem. Thanh trợ lực ở dưới trái, ảnh trượt vào từ trái (23.5, 23.8), nên nhân vật nhìn vào giữa màn hình.

### 3.5 ICON (một phong cách cho mọi icon HUD)

```text
Game HUD icon: one single object, centred, filling about 80% of the square, slight three-quarter front view, chunky simplified shapes with very few details, a bold dark ink outline thick enough to survive shrinking to 32 px, two or three flat tones per colour plus one small soft highlight, strong contrast so it reads on both cream parchment and dark wood. No background shapes, no extra badge or circle behind the object (when the object itself is a badge or a shield, that is fine), no frame, no cast shadow, no text, no letters, no numbers. Square 1024 x 1024.
```

- Icon phải đọc được ở 32–48 px (nút vòng menu 44 px, 23.5).
- Hình trước, màu sau: mỗi icon có dáng riêng, người mù màu vẫn phân biệt được.

### 3.6 VFX (tấm sprite hiệu ứng)

```text
Game VFX sprite sheet: chunky rounded shapes, two or three painted tones. Solid pieces have a thin dark ink outline; dust, smoke, water and fire have no outline. On a green, magenta or blue background every edge is crisp and solid: softness is painted as two or three tone bands inside the shape, never as a blurry or see-through fade into the background. On a black background (glowing effects) soft glowing edges are fine. A FLIPBOOK shows the whole motion including the fade-out: in the last frames the shapes break apart and shrink instead of turning see-through. Exactly 16 cells in a 4 x 4 grid on a square 1024 x 1024 image: each cell is 256 x 256 px, the drawing is centred in its cell with at least 24 px of empty space on every side, nothing touches or crosses a cell border, no grid lines, no numbers, no labels. Cells read left to right, top to bottom.
```

- Tự quyết: mọi tấm VFX là lưới 4 × 4 = 16 ô, mỗi ô 256 px. **FLIPBOOK** là 16 khung của một chuyển động. **ATLAS** là 16 mảnh khác nhau; game tự xoay và rải.
- Hiệu ứng cộng màu (lửa, đốm sáng) nằm trên nền đen thuần (nền K). Hiệu ứng trộn alpha (bụi, mảnh vỡ, giấy, nước, mực) nằm trên nền khóa màu.
- Tự quyết: bụi, khói, nước vẽ mép gọn, độ mềm nằm trong hình. Mép mờ trên nền khóa màu tách không sạch (sót viền xanh, hồng). Chỉ ảnh nền đen mới được mép tỏa sáng.
- Lưới lệch một chút vẫn dùng được: miễn các hình không chạm nhau, AI tích hợp tự tách từng hình và xếp lại lưới (mục 13).

### 3.7 MASK (mặt nạ nhìn từ trên)

```text
Game texture mask seen straight from above: a pure white shape on a pure black background. White means the effect, black means nothing; soft grey edges inside the shape are fine. No colour, nothing outside the shape. The shape is centred with 10% empty margin. Square 1024 x 1024.
```

### 3.8 Dòng nền (dán cuối prompt)

| Mã | Khi nào (luật 23.10, 23.11) | Dòng nền |
|---|---|---|
| G | Vật không có màu xanh lá | `Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no green at all.` |
| M | Vật có màu xanh lá, không có hồng hay tím hồng | `Flat pure #FF00FF magenta background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no pink, magenta or bright purple at all.` |
| B | Vật có cả xanh lá và hồng hoặc tím hồng | `Flat pure #0000FF blue background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no blue at all.` |
| K | Hiệu ứng cộng màu | `Pure black #000000 background, perfectly uniform; only the glowing effect is in the image.` |
| none | Trời, mặt nạ, tranh vẽ kín | Không dán dòng nền. |

- G, M, B là ba dòng nền BG-G, BG-M, BG-B của file 01 và 02, giống từng chữ. K chỉ dùng ở file 03.

### 3.9 Dòng MATCH, SAME, REF, BUILDREF, LAYOUT (khi có ảnh đính kèm; dán ngay trước dòng nền)

| Dòng | Khi nào | Câu dán |
|---|---|---|
| MATCH | Biến thể v2 trở đi, ô phông thứ hai | `Use the attached image only to match the style, colours, outline and light. Paint a different individual as described.` |
| SAME | Trạng thái khác của cùng một vật | `Same object as the attached image: identical shape, size, position and colours. Change only what is described.` |
| REF | Nhân vật đã có ảnh chuẩn | `The attached image is the official look of this character. Keep its colours, markings, clothes, kit and proportions exactly; only the pose, view and expression may change.` |
| BUILDREF | Icon nhà, khi có ảnh Tripo của nhà đó | `The attached image shows this building. Keep its shape, materials and colours, simplified into a chunky icon; add only what is described.` |
| LAYOUT | Khối tán (S12, S31), khi chủ dự án đính kèm ảnh mẫu `art-src/td/refs/4.webp` của mình | `Use the attached image only as a layout reference for how the round crowns stick together in offset rows. Do not copy its colours, style or details.` |

## 4. Tổng quan theo bậc

| Bậc | Nhóm | Số ảnh | Ở đâu |
|---|---|---|---|
| P | Cảnh bản đồ 1: 12 loại × 2 biến thể, gốc cây (dùng chung) 2 biến thể | 26 | Mục 5 |
| P | Phông xa bản đồ 1 | 6 | Mục 6 |
| P | Chân dung: Draconis, 3 Thư Đồng (vui, hoảng), Bà Cú Mực | 8 | Mục 7 |
| P | Đèn lồng Nhiệt 3 trạng thái | 3 | Mục 8 |
| P | Icon: 6 nhà (+ Đài Ấn nếu kịp), 6 nhịp, 3 bùa, 6 tài nguyên HUD, 6 bậc đồng | 28 | Mục 9 |
| P | VFX: 11 tấm + 1 tờ tham khảo Ma Trơi | 12 | Mục 10 |
| VS | Cảnh 3 bản đồ, phông 2 bản đồ, chân dung đủ, ảnh trượt, tranh truyện, atlas Neon, thú nền, icon 3 nhà VS | ~200 | File `-vs` |
| Sau | Thư Thành nhiều lớp, bách khoa quái | — | Mục 11 |

27.2 ghi cho P: cảnh bản đồ 1, 1 phông xa, chân dung, đèn lồng, 3 bùa, icon 6 nhà, icon 6 nhịp. Món thêm vào P có lý do ở từng mục (gốc cây, icon tài nguyên, đồng, VFX).

## 5. P — Cảnh bản đồ 1: Đồng Cỏ Thác Bạc (`meadow`)

- Bản đồ 1 là cao nguyên ôn đới, 7:30 sáng sau mưa (22.9). Tranh vẫn sáng phẳng; game tô màu theo vùng và giờ (23.10).
- P làm v1 và v2 (27.2). VS làm thêm v3 và v4, vì 23.10 cần ≥ 4 biến thể mỗi loại. Dòng biến thể có sẵn ở mỗi mục.
- Cách ghép S1–S12: STYLE + SCENERY + phần riêng + một dòng biến thể + dòng nền.
- Tự quyết: chọn 12 loại dưới đây từ danh sách cảnh 2D của bản đồ 1 (22.9) và cột 2D của 23.10. Đồi chè và cối xay gió vào phông xa (mục 6). Trâu là model 3D (23.10, 27.2). Đàn cò là thú nền (VS).
- Tự quyết: cọc đá ruộng (22.9) làm ở VS (S14), vì model Ruộng Lúa bậc P đã có cọc mốc riêng (file 02, P12), nên 1C không thiếu.
- "Cỏ thấp" của 22.9 vẽ vào texture đất (23.10), nên không có ảnh riêng. S5 là cỏ cao gần camera.
- Đá vẽ tròn trịa, vì billboard chỉ dành cho đá tròn; đá lệch là impostor 8 hướng, chưa có ở 1C (23.10, 26.1).
- Tự quyết: cột "Cao thật" để AI tích hợp đặt cỡ; nằm trong khung 23.2 (cây lớn 6–10 m).
- Biến thể v2: đổi `-v1` thành `-v2` trong tên file.

| Mã | id | Tên · là gì | Cao thật | Khổ | Nền | Lưu (v1) |
|---|---|---|---|---|---|---|
| S1 | `almond-tree` | Cây bàng · cây to, tán xếp tầng ngang | 8 m | 1024×1536 | M | `art-src/td/scenery/meadow/almond-tree-v1.png` |
| S2 | `mountain-pine` | Thông núi · cây cao, tán thành đệm tròn | 10 m | 1024×1536 | M | `art-src/td/scenery/meadow/mountain-pine-v1.png` |
| S3 | `bamboo-clump` | Khóm tre · bụi tre làng, ngọn cong | 7 m | 1024×1536 | M | `art-src/td/scenery/meadow/bamboo-clump-v1.png` |
| S4 | `raspberry-bush` | Bụi mâm xôi · bụi tròn có quả đỏ hồng | 1,2 m | 1024×1024 | B | `art-src/td/scenery/meadow/raspberry-bush-v1.png` |
| S5 | `tall-grass` | Cỏ cao · bụi cỏ gần camera (hai tấm chéo) | 0,8 m | 1024×1024 | M | `art-src/td/scenery/meadow/tall-grass-v1.png` |
| S6 | `reed-clump` | Cỏ lau · bụi lau bờ suối, bông trắng bạc | 1,6 m | 1024×1536 | M | `art-src/td/scenery/meadow/reed-clump-v1.png` |
| S7 | `wildflowers` | Hoa dại trắng vàng · khóm hoa thấp | 0,5 m | 1024×1024 | M | `art-src/td/scenery/meadow/wildflowers-v1.png` |
| S8 | `fern` | Dương xỉ · khóm lá xòe bờ ẩm | 0,8 m | 1024×1024 | M | `art-src/td/scenery/meadow/fern-v1.png` |
| S9 | `rock-small` | Đá xám rêu nhỏ | 0,6 m | 1024×1024 | M | `art-src/td/scenery/meadow/rock-small-v1.png` |
| S10 | `rock-medium` | Đá xám rêu vừa · tảng đá to | 1,8 m | 1536×1024 | M | `art-src/td/scenery/meadow/rock-medium-v1.png` |
| S11 | `rotten-log` | Khúc gỗ mục · thân cây đổ có rêu, nấm | 0,7 m (dài 3 m) | 1536×1024 | M | `art-src/td/scenery/meadow/rotten-log-v1.png` |
| S12 | `canopy-block` | Khối tán · bức tường tán cây ở mép rừng | 10 m (rộng 16 m) | 1536×1024 | M | `art-src/td/scenery/meadow/canopy-block-v1.png` |
| S13 | `tree-stump` | Gốc cây · decal nhìn từ trên, còn lại khi đặt nhà phá cây; dùng chung mọi vùng | 0,4 m (rộng 1 m) | 1024×1024 | G | `art-src/td/scenery/shared/tree-stump-v1.png` |

**S1 · `almond-tree`**
```text
An Indian almond tree about 8 metres tall: a sturdy grey-brown trunk, branches spreading in flat horizontal tiers like layered parasols, each tier one broad rounded mass of big broad leaves in fresh spring green, a few warm amber leaves only at the rim of a tier.
v1: three wide tiers, balanced, straight trunk.
v2: four narrower tiers, taller, the trunk leaning slightly left.
v3 (VS): a young tree with two tiers and a thinner trunk.
v4 (VS): an old tree with a thick knobbly trunk, its top tier larger on the right.
```

**S2 · `mountain-pine`**
```text
A mountain pine about 10 metres tall, shaped like a storybook pine: a tall reddish-brown trunk with a gentle S-curve and flaky bark plates, a few strong branches each ending in a big flat rounded cloud-like pad of dense dark-green needles, the pads stacked unevenly up the trunk, each pad darker underneath, no single needles visible.
v1: five pads, upright.
v2: four pads, the trunk leaning right, one long branch reaching left.
v3 (VS): a slim young pine with three pads.
v4 (VS): an old wind-bent pine with one broad top pad.
```

**S3 · `bamboo-clump`**
```text
A clump of village bamboo about 7 metres tall: nine thick culms in green and pale yellow with clear joint rings, growing from one tight base and fanning gently outward, the tops arching over; the leaves grouped into four or five big solid rounded masses near the top, the culms visible between them.
v1: upright and full.
v2: leaning, the tops arching to the right.
v3 (VS): a smaller clump of five culms.
v4 (VS): a wide clump with two arching tops.
```

**S4 · `raspberry-bush`** (nền B vì có lá xanh và quả hồng)
```text
A wild raspberry bush about 1.2 metres tall: a dome of three or four overlapping rounded masses of serrated green leaves, a few thick arching canes, clusters of plump ripe raspberries in red and pink tucked between the leaves, a few small white blossoms.
v1: a round dome.
v2: wider and lower, most berries on the right.
v3 (VS): a small young bush with few berries.
v4 (VS): taller, the canes arching to one side.
```

**S5 · `tall-grass`**
```text
A dense tuft of tall wild meadow grass about 80 cm tall: the blades grouped into five or six thick tapering clumps fanning out from one tight base, fresh green with lighter yellow-green tips, a few chunky seed heads. Roughly symmetrical, so it also works on two crossed planes.
v1: upright and symmetrical.
v2: bent by the wind toward the right.
v3 (VS): short and wide.
v4 (VS): taller, with more seed heads.
```

**S6 · `reed-clump`**
```text
A clump of riverside silver-grass about 1.6 metres tall: long arching grey-green leaves grouped into a few thick sweeping clumps, crowned by seven or eight big plumes in silvery cream-white, each plume one solid chunky teardrop shape with a gently scalloped edge (not wispy, not see-through), lighter toward its tip.
v1: upright.
v2: the plumes bowing to the left in a breeze.
v3 (VS): a short clump with four plumes.
v4 (VS): a wide clump with plumes at different heights.
```

**S7 · `wildflowers`**
```text
A low clump of wildflowers about 50 cm tall: a cushion of rounded green leaf masses topped by two or three bunches of simple white daisies with yellow centres and small yellow buttercups, the flowers big and easy to read. Roughly symmetrical, so it also works on two crossed planes.
v1: mostly white daisies.
v2: mostly yellow buttercups with a few daisies.
v3 (VS): taller, sparser stems.
v4 (VS): a wide, low cushion.
```

**S8 · `fern`**
```text
A lush fern clump about 80 cm tall: seven broad arching fronds growing from one centre, each frond one solid leaf shape with simple scalloped edges (not lacy), fresh green with darker undersides, one young fern curl in the middle.
v1: a symmetrical rosette.
v2: taller, the fronds leaning right.
v3 (VS): a small young fern.
v4 (VS): wide and flat.
```

**S9 · `rock-small`**
```text
A small rounded grey granite rock about 60 cm tall and wider than tall, a smooth weathered surface with a few soft cracks, a cap of bright cushion moss on top and in one crack, a few pale lichen spots.
v1: one rounded rock.
v2: two small rocks fused at the base, one taller.
v3 (VS): a flatter rock with a mossy top.
v4 (VS): a blocky rock with well-rounded corners, moss on one side.
```

**S10 · `rock-medium`**
```text
A medium grey granite boulder about 1.8 metres tall, chunky and rounded with two or three big faces, a few deep cracks, soft green moss on top running down one side, pale grey lichen patches.
v1: a rounded boulder.
v2: a taller upright boulder, a little narrower at the top, still rounded.
v3 (VS): a split boulder with a crack down the middle.
v4 (VS): a low, wide, slab-like boulder.
```

**S11 · `rotten-log`**
```text
A fallen rotten tree log about 3 metres long and 70 cm high, lying on its side and seen from the side: thick rough dark-brown bark peeling in places, a hollow broken end showing soft pale wood, green moss patches on top, a small cluster of tan-orange shelf mushrooms.
v1: a straight log, the broken end on the right.
v2: a log with one stubby broken branch pointing up.
v3 (VS): a short, thick log piece.
v4 (VS): a log with a root plate at one end.
```

**S12 · `canopy-block`** (khối tán mép rừng, 23.10: 3–5 tán tròn dính nhau, 2–4 hàng lệch, hàng sau cao hơn và tối hơn 8 %)
```text
A forest-edge canopy block for the border of the map: a dense wall of broadleaf tree crowns in fresh spring green, made of round crowns stuck together side by side in offset rows; each row behind is taller and about 8% darker than the row in front; short trunks show only at the very bottom and end cleanly; the whole block reads as one solid connected shape.
v1: three crowns in two rows.
v2: five crowns in three rows.
v3 (VS): four crowns in two rows, taller on the left.
v4 (VS): five crowns in four rows, with a tall back row.
```

Khối tán làm theo lời tả của 23.10, prompt đã đủ. Ảnh mẫu 4.webp (23.10 nhắc tới) lưu ở `art-src/td/refs/4.webp` (mục 2). Đính kèm là tùy chọn; khi đính kèm thì thêm dòng LAYOUT (mục 3.9) để giữ đúng cách xếp tán.

**S13 · `tree-stump`** (decal nhìn từ trên; không dùng khối SCENERY)
- Thêm vào P: bước 1C có "phá khi đặt nhà", cây đổ và **decal gốc cây ở lại** (23.10, 26.1).
- Tự quyết: một bộ gốc cây dùng chung mọi vùng; game tô màu theo vùng. Vì vậy ảnh lưu ở `scenery/shared/`, không ở `meadow/`.
- Cách ghép: STYLE + phần riêng + một dòng biến thể + nền G.
```text
A freshly cut tree stump seen straight from above, as a flat decal for the ground: a round cut face of pale wood with clear growth rings, a ring of dark-brown bark around it, three or four short thick roots spreading outward with rounded tips, a few small wood chips on the cut face. Flat even light, no cast shadow, an even dark ink outline. The stump fills about 70% of the square, centred. Square 1024 x 1024.
v1: round, with four roots.
v2: oval, with a split crack and three roots.
v3 (VS): a small young stump with two roots.
v4 (VS): an old stump with a jagged broken rim.
```

## 6. P — Phông xa bản đồ 1 (`w1-silverfall`)

- 23.10 cho phông xa 2–3 vòng trụ ở 140 / 220 / 320 m, thêm vòm trời.
- Không khí (22.9): 7:30 sáng sau mưa, cầu vồng trên thác, mây sáng, núi xanh nhiều lớp, đồi chè ở dải xa, cối xay gió trên đồi xa.
- Tự quyết: làm đủ 3 vòng và 1 dải trời, tổng 6 ảnh (bảng dưới).
- Tự quyết: ChatGPT chỉ tạo tối đa 1536 × 1024, nên mỗi ảnh là một phần tư vòng. Mỗi vòng có 4 ô.
- Tự quyết: ô có điểm nhấn (a) đặt một lần. Ô trơn đặt các chỗ còn lại, lật ngang xen kẽ. Hai ô lật xen kẽ thì mép luôn khớp.
- Mép trái và phải của mọi ô "lặng" và cao bằng nhau, nên ô a nối được với ô trơn.
- Tự quyết: cầu vồng nằm giữa ô `sky-a`. AI tích hợp quay ô này về hướng bắc (phía thác và Khe Nứt).
- Cách ghép F1, F2: STYLE + phần riêng (đã gồm luật mép). F3–F6: STYLE + BACKDROP + phần riêng + nền M.
- Làm F2 với ảnh F1 đính kèm, F6 với ảnh F5 đính kèm, kèm dòng MATCH.

| Mã | Lớp (id) | Là gì | Đặt quanh vòng | Nền | Lưu |
|---|---|---|---|---|---|
| F1 | `sky-a` | Dải trời có cầu vồng | 1 lần, hướng bắc | none | `art-src/td/backdrops/w1-silverfall/sky-a.png` |
| F2 | `sky-b` | Dải trời mây sáng | 3 lần, lật xen kẽ | none | `art-src/td/backdrops/w1-silverfall/sky-b.png` |
| F3 | `layer-320` | Núi xa lam nhạt | 4 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-silverfall/layer-320.png` |
| F4 | `layer-220` | Đồi rừng xanh lam, vách đá vôi | 4 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-silverfall/layer-220.png` |
| F5 | `layer-140-a` | Đồi chè có cối xay gió | 1 lần | M | `art-src/td/backdrops/w1-silverfall/layer-140-a.png` |
| F6 | `layer-140-b` | Đồi chè trơn | 3 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-silverfall/layer-140-b.png` |

**F1 · `sky-a`**
```text
Sky band of a 360-degree backdrop for a 3D game, morning at 7:30 just after rain over a highland valley: fresh clear blue sky, deeper blue at the top edge, big bright white cumulus clouds with soft lavender-grey undersides, the last grey rain clouds drifting away; a soft rainbow arc centred in the image, its feet at about 20% and 80% of the width and its top about 25% from the top; the bottom 20% of the image fades into a flat pale blue-white haze. No land, no hills, no trees, no birds, no sun disc. Soft even light. The left 8% and right 8% are plain open sky with the same blue at every height on both sides, and no cloud touches or crosses the left or right edge, so tiles join side by side and when mirrored. Landscape 1536 x 1024.
```

**F2 · `sky-b`**
```text
Sky band of a 360-degree backdrop for a 3D game, morning at 7:30 just after rain over a highland valley: fresh clear blue sky, deeper blue at the top edge, scattered bright white cumulus clouds of different sizes with soft lavender-grey undersides; no rainbow; the bottom 20% of the image fades into a flat pale blue-white haze. No land, no hills, no trees, no birds, no sun disc. Soft even light. The left 8% and right 8% are plain open sky with the same blue at every height on both sides, and no cloud touches or crosses the left or right edge, so tiles join side by side and when mirrored. Landscape 1536 x 1024.
```

**F3 · `layer-320`**
```text
Layer at 320 metres: a very distant range of misty mountains in pale blue-grey, soft rounded and jagged peaks overlapping in two or three faint layers, lighter toward their tops, thin white mist bands between them (below the ridge line only). The ridge line stays between 35% and 65% from the top of the image, and meets both side edges at exactly 60% from the top. Above the ridge line the image is the flat background colour. Below the mountains the image fades into a flat pale blue haze that is solid from 80% down to the bottom edge.
```

**F4 · `layer-220`**
```text
Layer at 220 metres: mid-distance highland ridges covered in soft blue-green forest, a few pale limestone cliffs breaking through, a patch of terraced fields on one slope, light haze. The ridge line stays between 40% and 65% from the top of the image, and meets both side edges at exactly 60% from the top. Above the ridge line the image is the flat background colour. Below, the ridges fade into a flat blue-green haze that is solid from 80% down to the bottom edge.
```

**F5 · `layer-140-a`**
```text
Layer at 140 metres: near-distance rolling tea hills, rounded green hills striped with neat curving rows of tea bushes, a few round trees on the ridges, and on the highest hill near the centre a small stone windmill with a cone roof and four chunky wooden sail frames. The hill line stays between 35% and 65% from the top of the image, and meets both side edges at exactly 62% from the top. Above the hill line the image is the flat background colour. Below, the hills fade into a flat soft green haze that is solid from 85% down to the bottom edge.
```

**F6 · `layer-140-b`**
```text
Layer at 140 metres: near-distance rolling tea hills, rounded green hills striped with neat curving rows of tea bushes, a few round trees and one small bamboo grove on the ridges, no buildings. The hill line stays between 35% and 65% from the top of the image, and meets both side edges at exactly 62% from the top. Above the hill line the image is the flat background colour. Below, the hills fade into a flat soft green haze that is solid from 85% down to the bottom edge.
```

## 7. P — Chân dung (C1–C8)

- Thanh trợ lực có 4 chân dung tròn (23.5). Khung màu, vòng máu, vòng Tối Thượng, icon nhà, viền đỏ khi hoảng đều do game vẽ. Ảnh chỉ cần nhân vật trên nền khóa màu.
- Chân dung được 3/4 tự do, có biểu cảm, có lửa và hiệu ứng (23.11). Nhưng giữ đúng màu và đồ của nhân vật.
- Dáng và màu Thư Đồng chép từ `01-tripo-characters-enemies.md` (mục 6: P1 thân chung, P2–P4 bộ gắn, P6 ảnh mẫu). Có ảnh mẫu `art-src/td/helpers/helper-cham-ref.png` (và `-phay-ref`, `-gach-ref`) thì đính kèm và thêm dòng REF. Khi file 01 và file này khác nhau, theo file 01.
- Cách ghép Draconis: STYLE + PORTRAIT + LOOK-DRACONIS + phần riêng C1 (+ REF khi đính kèm ảnh mẫu) + nền G.
- Cách ghép Thư Đồng: STYLE + PORTRAIT + LOOK-OWLET + dòng riêng của Thư Đồng đó + dòng biểu cảm (C2–C7) + nền G.
- Làm ảnh "hoảng" với ảnh "vui" của cùng Thư Đồng đính kèm, kèm dòng REF.
- Tự quyết: id chân dung Thư Đồng là `<id>-happy` và `<id>-scared`.

| Mã | id | Ai · trạng thái | Khổ | Nền | Lưu |
|---|---|---|---|---|---|
| C1 | `draconis` | Draconis, Tướng ô 1 (dáng ảnh 3.png, LOOK-DRACONIS) | 1024×1024 | G | `art-src/td/portraits/draconis.png` |
| C2 | `helper-cham-happy` | Thư Đồng Chấm · vui | 1024×1024 | G | `art-src/td/portraits/helper-cham-happy.png` |
| C3 | `helper-cham-scared` | Thư Đồng Chấm · hoảng | 1024×1024 | G | `art-src/td/portraits/helper-cham-scared.png` |
| C4 | `helper-phay-happy` | Thư Đồng Phẩy · vui | 1024×1024 | G | `art-src/td/portraits/helper-phay-happy.png` |
| C5 | `helper-phay-scared` | Thư Đồng Phẩy · hoảng | 1024×1024 | G | `art-src/td/portraits/helper-phay-scared.png` |
| C6 | `helper-gach-happy` | Thư Đồng Gạch · vui | 1024×1024 | G | `art-src/td/portraits/helper-gach-happy.png` |
| C7 | `helper-gach-scared` | Thư Đồng Gạch · hoảng | 1024×1024 | G | `art-src/td/portraits/helper-gach-scared.png` |
| C8 | `narrator` | Bà Cú Mực, người kể | 1024×1024 | G | `art-src/td/portraits/narrator.png` |

**LOOK-DRACONIS** (22.2)
```text
Draconis, the Star-sea Phoenix Dragon: a large, majestic two-legged dragon, noble and ancient, not chibi; a white scaled body and a long tail; big feathered wings in cream-gold whose feather edges shade into fiery red-orange like flames; claws and armour plates in black and gold; calm golden-amber eyes; two horns swept back, black with gold edges.
```

- Tự quyết: mắt vàng hổ phách, hai sừng đen viền vàng. 22.2 không nói; chọn cho hợp giáp đen vàng.
- Tự quyết: chân dung không có vệt mực tím ở cánh. Vệt mực mờ dần qua từng bản đồ (22.2), ảnh tĩnh không theo kịp; model 3D lo phần này.
- Tự quyết (22/10, đổi được): C1, và C23, T1, T2 ở file VS, dùng LOOK-DRACONIS: dáng ảnh 3.png (22.2). Model trong game tạm thời là `heroes/draconis-v2` (rồng đỏ cánh màng); model mới theo dáng này là P18 ở `01-tripo-characters-enemies.md`. Muốn dáng đỏ của v2 thì AI viết lại các prompt này.
- Khối này cùng dáng với P18 ở file 01; chân dung được vẽ thêm lửa ở mép lông (23.11). Hai file khác nhau về dáng thì theo file 01.
- Ảnh mẫu (tùy chọn): ảnh Tripo `art-src/td/heroes/draconis.png` (P18) nếu đã có, không thì `art-src/td/refs/3.png`. Đính kèm thì thêm dòng REF.

**C1 · `draconis`**
```text
Framing: the head, the neck and the top of the chest, the top of the near wing rising behind the shoulder. Expression: proud, ancient and faintly amused, mouth closed. The red-orange wing edges look like living flame, painted as solid shapes, no loose sparks.
```

**LOOK-OWLET** (Thư Đồng, chung cho C2–C7; chép từ file 01, P1: mũ kem viền nâu, mắt đen to, chóp bút đen ló trên vai phải)
```text
A baby owl apprentice scribe: a round fluffy owlet like a ball of soft down, about two heads tall (the head is half of the total height); soft grey-brown down grouped into a few big smooth masses, a lighter warm-beige face disc and belly; very big round dark eyes with one painted white highlight each; a small yellow beak; two short rounded ear tufts; short stubby wings, each tip ending in three broad rounded feather tips joined as one solid shape. A soft cream cloth scholar cap with a thin dark-brown band, round and low, sitting snugly on the head between the ear tufts. A small blank dark-grey slate board with a light wooden frame, worn diagonally across the chest on a wide cloth strap from its right shoulder to its left hip, the slate resting flat on the belly. A short thick calligraphy brush with a dry tan bamboo handle tucked behind its back under the strap, its dark brush tip (one solid pointed mass) poking up above its right shoulder. Curious, gentle and a little shy. Framing: from the top of the cap down to just below the slate board, so the strap pattern shows clearly; the whole owlet fits inside a centred circle.
```

- Hoa văn trên dây (chấm, phẩy, gạch) giúp người mù màu phân biệt ba Thư Đồng (22.3, 23.3).
- Tự quyết: kính của Chấm trên model là đĩa mờ đục, chỉ vì Tripo không dựng được kính trong. Chân dung cho thấy mắt sau kính, để đọc được biểu cảm.

| Thư Đồng | Dòng riêng (dán sau LOOK-OWLET; chép từ file 01, P2–P4, P6) |
|---|---|
| Chấm | `The slate strap is purple (#9B5DE5) with rows of round white dots and a small square wooden buckle. Big round thick purple (#9B5DE5) glasses with milky pale-blue lenses in front of the eyes; the big dark eyes show softly through the lenses. A purple knitted scarf with round white polka dots wrapped once around the neck, one short fat knot at the front and two short stubby ends.` |
| Phẩy | `The slate strap is pink (#FF8FB1) with rows of small white comma marks and a small square wooden buckle. One big comma-curled tail feather, grey-brown with a pink (#FF8FB1) tip, rising behind the body and curling out beside its left hip, so it peeks out behind the body on the right side of the image, fully inside the frame and not cut by the edge.` |
| Gạch | `The slate strap is bronze brown (#B07A4F) with rows of short white dashes and a small square wooden buckle. Bronze-brown (#B07A4F) cloth cuffs with three bold horizontal cream stripes on both wings.` |

**C2 · `helper-cham-happy`** (Chấm cẩn thận)
```text
Expression: careful and proud, a small gentle smile, one wing tip pushing its big round glasses up.
```

**C3 · `helper-cham-scared`**
```text
Expression: scared, feathers puffed up and ruffled, eyes wide, one big sweat drop on its head, wings flapping up in panic, the glasses knocked crooked on its beak.
```

**C4 · `helper-phay-happy`** (Phẩy lắm lời)
```text
Expression: chatty and excited, beak open mid-sentence, sparkling eyes, leaning forward; the pink-tipped comma tail feather clearly visible beside its left hip.
```

**C5 · `helper-phay-scared`**
```text
Expression: scared, beak wide open in a squeak, eyes wide with tiny tears, feathers puffed and ruffled, one sweat drop, wings flailing; the pink-tipped comma tail feather visible beside its left hip.
```

**C6 · `helper-gach-happy`** (Gạch ít nói)
```text
Expression: quiet and content, calm half-closed eyes, a tiny satisfied smile, wings folded; the striped wing cuffs clearly visible.
```

**C7 · `helper-gach-scared`**
```text
Expression: startled but quiet, eyes squeezed shut, feathers puffed, one loose down feather floating away, a single sweat drop; the striped wing cuffs visible.
```

**C8 · `narrator`** (dùng STYLE + PORTRAIT + phần riêng, không có khối LOOK)
- Tự quyết: dáng Bà Cú Mực. 22.3 chỉ tả giọng và vai (cú già của Hội Khắc Chữ). Chọn kính bán nguyệt để khác kính tròn của Chấm.
```text
Grandma Ink Owl, the old narrator of the Engravers' Guild: a plump elderly owl with soft silver-grey and brown feathers, small ink-black speckles on her feather tips, fluffy ear tufts like bushy eyebrows, warm amber eyes behind small half-moon reading glasses perched on her beak, a deep indigo knitted shawl with a cream border, a little round ink pot hanging on a cord at her chest, a long bamboo calligraphy brush tucked under one wing. Framing: head and upper body down to the bottom of the shawl. Expression: warm, slow and a little amused, as if about to tell a story.
```

## 8. P — Đèn lồng Nhiệt (L1–L3)

- Mỗi nhà treo 5 đèn lồng giấy dưới mái. Số đèn sáng là Nhiệt 0–5 (22.1, 23.4).
- Game đặt sprite ở socket `FX_lantern_0..4` và trên thẻ thông tin nhà (23.5, 23.9).
- 3 ảnh: tắt, sáng, cháy rực (Bùng Nổ). Nửa đèn (Vừa), lóe xanh ngọc (Chớp), cam mờ (Ẩu) và quầng sáng do game pha màu.
- Tự quyết: đèn giấy màu kem, không đỏ. Đỏ dành cho nguy hiểm từ địch (23.3). Đèn là đèn giấy làng quê, không phải vật thờ (22.1).
- Cách ghép: STYLE + ICON + phần chung đèn + phần riêng + nền G. Làm L1 trước; L2, L3 đính kèm L1 và dòng SAME.

| Mã | id | Trạng thái | Khổ | Nền | Lưu |
|---|---|---|---|---|---|
| L1 | `lantern-unlit` | Tắt | 1024×1024 | G | `art-src/td/ui/lanterns/lantern-unlit.png` |
| L2 | `lantern-lit` | Sáng | 1024×1024 | G | `art-src/td/ui/lanterns/lantern-lit.png` |
| L3 | `lantern-blazing` | Cháy rực | 1024×1024 | G | `art-src/td/ui/lanterns/lantern-blazing.png` |

**Phần chung đèn**
```text
A small village paper lantern hanging from a short dark cord loop: an oval lantern of cream rice paper over a few bamboo ribs shown as soft vertical lines, a small dark wooden cap at the top and at the bottom, a short thick knot under the bottom cap.
```

| Mã | Phần riêng |
|---|---|
| L1 | `Unlit: the paper is a dim cream-grey, the inside is dark, no light at all.` |
| L2 | `Lit: the paper glows warm white from inside, brightest in the middle, the ribs darker against the glow; the light stays inside the paper and does not spill onto the background.` |
| L3 | `Blazing: the paper glows white-hot with a warm peach-amber rim, a bright flame visible through the paper, three small solid flame tongues licking up from the top opening; the light stays inside the lantern shape.` |

## 9. P — Icon (U1–U28)

Cách ghép mọi icon: STYLE + ICON + phần chung của nhóm (nếu có) + phần riêng + dòng nền.

### 9.1 Nhà (U1–U7)

- 27.2: icon 6 nhà của P. Đài Ấn làm nếu kịp, như model Đài Ấn ở 27.2.
- Tự quyết: icon là nhà cấp 1 thu nhỏ, đúng dáng ảnh Tripo ở `02-tripo-buildings-props.md` (P1–P6, P12, P16), phóng to nét đặc trưng, thêm một cờ đuôi nheo nhỏ màu họ nhà ở góc sau trái (chỗ socket `FX_banner`, khớp cờ cấp chung `level-pennant` mà game tô màu họ nhà, file 02, P17). Lũy dùng luôn lá cờ ngà viền son có sẵn trên model.
- Tự quyết: icon được vẽ thêm vật báo chức năng mà model cấp 1 không có (cây cung ở Tháp Cung, nòng pháo và xe goòng gắn sẵn), để đọc được ở 32 px.
- Có ảnh Tripo của nhà (`art-src/td/buildings/<id>.png`) thì đính kèm và thêm dòng BUILDREF.
- Dáng theo chức năng (23.12): Tháp Cung cao mảnh, Tháp Pháo thấp tròn nòng to, Trại Lính rộng có trống.
- Màu họ nhà: Đánh `#D9479B` · Quân `#3B7DDD` · Vàng (Mỏ) `#C98A2E` · Tài nguyên `#49AE45` · Hỗ trợ `#8F72E8` · Chỉ huy `#EDE6D6`.

| Mã | id | Nhà | Nền | Lưu |
|---|---|---|---|---|
| U1 | `keep` | Lũy Chữ | G | `art-src/td/ui/buildings/keep.png` |
| U2 | `archer` | Tháp Cung | G | `art-src/td/ui/buildings/archer.png` |
| U3 | `cannon` | Tháp Pháo | G | `art-src/td/ui/buildings/cannon.png` |
| U4 | `barracks` | Trại Lính | G | `art-src/td/ui/buildings/barracks.png` |
| U5 | `gold-mine` | Mỏ Vàng | G | `art-src/td/ui/buildings/gold-mine.png` |
| U6 | `farm` | Ruộng Lúa | M | `art-src/td/ui/buildings/farm.png` |
| U7 | `seal-dais` | Đài Ấn (nếu kịp) | G | `art-src/td/ui/buildings/seal-dais.png` |

**U1 · `keep`**
```text
Icon of the Bastion, the village's main fort: a sturdy three-tier fort; a base of white limestone blocks with a big arched timber double gate studded with bronze; a timber middle hall with woven bamboo-mat walls under a gently curved terracotta tile roof; a small open timber watch hut on top under a little terracotta roof; at the back left, a tall ivory banner (#EDE6D6) with a vermilion border on a thick timber pole.
```

**U2 · `archer`**
```text
Icon of the Archer Tower: a tall, slim tower almost twice as tall as wide; a round foot of white fieldstones; a square shaft of thick golden-tan bamboo posts with woven bamboo-mat walls; a plank lookout under a steep pyramid roof of wheat-gold palm-leaf thatch; a big wooden bow with a nocked arrow mounted across the front of the lookout; a small deep pink pennant (#D9479B) at the back left of the roof.
```

**U3 · `cannon`**
```text
Icon of the Cannon Tower: a low, round, heavy mound of warm ochre rammed earth with horizontal layer lines and a thick earthen parapet; a short fat aged-bronze cannon barrel with a flared mouth and thick rings pointing up and forward from the middle; a small pyramid of dark-iron cannonballs beside it; a small deep pink pennant (#D9479B) on a short pole at the back left.
```

**U4 · `barracks`**
```text
Icon of the Barracks: a wide, sturdy militia camp; a round palisade of thick sharpened timber stakes with a heavy timber gate; beside the gate, a big round village war drum with a red-brown hide face and a bronze-studded rim on a timber stand; behind the palisade, a long low hall under broad wheat-gold rice-straw thatch; a small blue pennant (#3B7DDD) at the back left of the roof.
```

**U5 · `gold-mine`**
```text
Icon of the Gold Mine: a small rocky hill of big grey granite boulders with broad warm-gold ore veins; a timber-framed tunnel mouth under a small terracotta porch roof; a sturdy timber hoist with a big wooden pulley wheel on top; a chunky wooden mine cart heaped with shiny gold nuggets on short iron rails in front; a small amber pennant (#C98A2E) at the back left on top of the rock.
```

**U6 · `farm`**
```text
Icon of the Rice Field: a rounded-square flooded paddy seen from slightly above, low brown earth banks, calm silver-blue water with neat rows of chunky young rice-green tufts; a cheerful straw scarecrow in a conical palm-leaf hat in the middle; at the back right, a raised field-watch hut on tall, thick stilts with a steep wheat-gold straw roof, the tallest part of the icon; a small green pennant (#49AE45) at the back left of the hut roof.
```

**U7 · `seal-dais`** (Đài Ấn là đài đá khắc chữ, không bàn thờ, không hương, 22.1)
```text
Icon of the Seal Dais, a low round stone stage, not a shrine: three wide white limestone steps; a big flat round carved stone seal disc in the centre of the top; five short square limestone posts around the edge carved with swirling brush-stroke ornament (no readable letters); the back post twice as tall, holding a compact bronze wind chime on a curved arm; a small lavender pennant (#8F72E8) on the tall back post. No altar, no incense, no statue, no offerings.
```

### 9.2 Nhịp (U8–U13)

- Tự quyết: 6 icon là Dừng, 6 s, 4 s, 3 s, 2 s, 1 s, đúng các nấc của vòng menu nhà (23.5). Nhịp 8 s (chỉ mức Dễ, 6.2) dùng icon 6 s, vì huy hiệu 23.4 cho 8 s và 6 s cùng một chấm nhạt.
- Tự quyết: icon không có số. Game viết số giây ("4 s", 28.7) bằng chữ thật cạnh icon. Ảnh AI hay vẽ sai số.
- Số chấm theo 23.4: 6 s một chấm nhạt; 4 s một chấm; 3 s hai; 2 s ba; 1 s bốn chấm xanh ngọc đậm. Dừng: quả lắc nằm yên (22.4). Xanh ngọc là màu sức gõ (23.3).
- Tự quyết: tên file theo số giây của mã (`tempo = 0` là Dừng): `tempo-0`, `tempo-6`, `tempo-4`, `tempo-3`, `tempo-2`, `tempo-1`.
- Tự quyết: Đài Ấn có nhịp cụm riêng 8 / 6 / 5 s theo cấp (6.2), 23.4 chưa có huy hiệu cho 5 s. 8 s và 6 s dùng `tempo-6`; 5 s dùng `tempo-4`. Số giây thật vẫn do game viết.
- Nền M vì chấm xanh ngọc gần màu khóa xanh lá.
- Làm U8 trước. U9–U13 đính kèm U8 và dòng SAME.

| Mã | id | Nhịp | Nền | Lưu |
|---|---|---|---|---|
| U8 | `tempo-0` | Dừng | M | `art-src/td/ui/tempo/tempo-0.png` |
| U9 | `tempo-6` | 6 s (8 s dùng chung) | M | `art-src/td/ui/tempo/tempo-6.png` |
| U10 | `tempo-4` | 4 s | M | `art-src/td/ui/tempo/tempo-4.png` |
| U11 | `tempo-3` | 3 s | M | `art-src/td/ui/tempo/tempo-3.png` |
| U12 | `tempo-2` | 2 s | M | `art-src/td/ui/tempo/tempo-2.png` |
| U13 | `tempo-1` | 1 s | M | `art-src/td/ui/tempo/tempo-1.png` |

**Phần chung nhịp**
```text
Icon of a tempo badge, seen straight from the front (not tilted): a round badge with a thick dark wooden rim and a cream paper face; a small brass pendulum with a short thick rod and a round weight hangs from the top centre of the face; big round dots sit in a row along the lower part of the face.
```

| Mã | Phần riêng |
|---|---|
| U8 | `Stop: the pendulum hangs perfectly still, straight down, with no motion lines; no dots; the paper face is a muted grey-cream, calm and slightly dim.` |
| U9 | `6 seconds: the pendulum tilts slightly to one side with one faint curved motion line; one pale, faint teal dot.` |
| U10 | `4 seconds: the pendulum tilts a little more with two curved motion lines; one solid deep-teal dot (#0B8A78).` |
| U11 | `3 seconds: the pendulum mid-swing with two curved motion lines; two solid deep-teal dots (#0B8A78).` |
| U12 | `2 seconds: a wide swing with three curved motion lines; three solid deep-teal dots (#0B8A78).` |
| U13 | `1 second: the widest swing with bold motion lines; four bright deep-teal dots (#0B8A78); three small wavy heat-shimmer lines rise above the badge.` |

### 9.3 Bùa (U14–U16)

- 3 bùa dùng một lần: rơi trong túi, bay vào ô vật phẩm (17.4, id ở 0.6).
- Tự quyết: bùa là thẻ nhỏ có hình vẽ, treo dây thắt nút; không chữ, không ký hiệu tôn giáo (22.1). Ba dáng thẻ khác nhau để không cần nhìn màu: vuông (Sửa), lục giác (Băng), hình lá (Gió).
- Màu theo nguyên tố (23.3): hồi máu trắng ấm và bạc hà; băng xanh nhạt. Tự quyết: Gió (23.3 không có màu) dùng lục ngọc nhạt và trắng.

| Mã | id | Bùa · tác dụng | Nền | Lưu |
|---|---|---|---|---|
| U14 | `charm-mend` | Bùa Sửa · sửa một nhà 50 % | M | `art-src/td/ui/charms/charm-mend.png` |
| U15 | `charm-frost` | Bùa Băng · đóng băng quái 2 s | G | `art-src/td/ui/charms/charm-frost.png` |
| U16 | `charm-gale` | Bùa Gió · người đi nhanh 30 % | M | `art-src/td/ui/charms/charm-gale.png` |

**Phần chung bùa**
```text
Icon of a one-use magic charm: a small thick tag hanging from a short knotted cord, one simple pictogram painted on its face, a soft glow only inside the pictogram.
```

| Mã | Phần riêng |
|---|---|
| U14 | `Mend charm: a square tag of honey-coloured wood with a cream paper face; the pictogram is a small wooden mallet crossing a plank, with one mint leaf; a warm white and mint glow.` |
| U15 | `Frost charm: a hexagonal tag of frosted pale ice-blue crystal with a white snowflake pictogram and a little white rime on its edges; a cool white glow.` |
| U16 | `Gale charm: a leaf-shaped tag of pale jade-green lacquered wood with a white spiral gust and a small white feather as its pictogram; a soft white glow.` |

### 9.4 Tài nguyên HUD (U17–U22)

- Thêm vào P (Vàng, Lúa, Mạng, Đợt): bảng trên trái của HUD có Mạng, Vàng, Lúa, Gỗ, Đợt (23.5); 1B có Lúa, 1C có đồ bay về các ô này.
- Thêm vào P (Gỗ, Tri thức): làm cùng lượt để cùng một nét vẽ; rẻ. Game dùng từ VS (17.1).
- Tự quyết: icon Lúa và icon Gỗ cũng là vật bay về HUD (17.4: icon là đích bay của loot). Một ảnh làm hai việc. Vàng thì vật bay là đồng theo bậc (mục 9.5).
- Tự quyết: Mạng là trái tim đỏ hồng sẫm vẽ trên khiên gỗ ngà (Lũy giữ mạng). Tránh đỏ `#FF4A4A` (nguy hiểm, 23.3) và hồng của Phẩy.
- Tự quyết: Đợt là lá cờ vải tím đen màu Mực Câm, vì đợt quái tới từ Khe Nứt.

| Mã | id | Tài nguyên | Nền | Lưu |
|---|---|---|---|---|
| U17 | `lives` | Mạng | G | `art-src/td/ui/resources/lives.png` |
| U18 | `gold` | Vàng | G | `art-src/td/ui/resources/gold.png` |
| U19 | `food` | Lúa (cũng là bó lúa bay về HUD) | M | `art-src/td/ui/resources/food.png` |
| U20 | `wood` | Gỗ (cũng là khúc gỗ bay về HUD) | G | `art-src/td/ui/resources/wood.png` |
| U21 | `knowledge` | Tri thức (ngoài trận) | G | `art-src/td/ui/resources/knowledge.png` |
| U22 | `wave` | Đợt | G | `art-src/td/ui/resources/wave.png` |

| Mã | Phần riêng |
|---|---|
| U17 | `Icon of lives: a small round ivory wooden shield with a plump deep crimson-rose (#C83A5A) heart painted big on its face, a small cream highlight on the heart.` |
| U18 | `Icon of gold: a small fanned stack of three thick gold coins (#FFC83A), each round with a square hole in the middle and a raised rim, pale shiny highlights.` |
| U19 | `Icon of rice: a plump sheaf of ripe rice, green stalks tied in the middle with a twisted straw band, heavy drooping golden grain heads at the top.` |
| U20 | `Icon of wood: two short thick logs stacked crosswise, warm brown bark, pale cut ends with clear growth rings.` |
| U21 | `Icon of knowledge: an open old book with cream pages and a deep indigo cover, a small owl feather lying across the pages as a bookmark, one tiny soft sparkle above the pages.` |
| U22 | `Icon of an enemy wave: a small triangular cloth banner with a torn edge on a short bamboo pole, the cloth deep violet-black like living ink with a faint purple sheen.` |

### 9.5 Đồng (U23–U28)

- Thêm vào P: bước 1C cho đồng bay về ô Vàng (26.1). Bảng rơi 17.4 ghi đồng có "bậc ảnh": `common`, `refined`, `high`, `elite`, `mini-boss`, `major-boss`.
- 25.2 cho ảnh Credit Crystal của Space Typing (`src/assets/pickups/credits/*.webp`) làm ảnh dự phòng, nên 1C vẫn chạy khi chưa có các ảnh này. Vẫn làm ở P vì tinh thể khoa học viễn tưởng lạc giữa thung lũng sách tranh.
- Tự quyết: đồng là tiền đồng lỗ vuông kiểu làng xưa, vàng kim `#FFC83A` (màu tiền, 23.3). Bậc cao to hơn, cầu kỳ hơn. Hoa văn chỉ là hạt lúa, lá, lông vũ; không chữ.
- Game tự xoay, lấp lánh, vẽ vệt bay. Làm U23 trước; các bậc sau đính kèm U23 và dòng MATCH.

| Mã | id | Bậc | Nền | Lưu |
|---|---|---|---|---|
| U23 | `coin-common` | common | G | `art-src/td/ui/loot/coin-common.png` |
| U24 | `coin-refined` | refined | G | `art-src/td/ui/loot/coin-refined.png` |
| U25 | `coin-high` | high | G | `art-src/td/ui/loot/coin-high.png` |
| U26 | `coin-elite` | elite | G | `art-src/td/ui/loot/coin-elite.png` |
| U27 | `coin-mini-boss` | mini-boss | G | `art-src/td/ui/loot/coin-mini-boss.png` |
| U28 | `coin-major-boss` | major-boss | G | `art-src/td/ui/loot/coin-major-boss.png` |

**Phần chung đồng**
```text
Icon of a single gold coin seen from the front, tilted slightly: warm gold (#FFC83A) with pale highlights and darker gold edges, a round coin with a square hole in the middle, embossed patterns only, no letters, no numbers.
```

| Mã | Phần riêng |
|---|---|
| U23 | `Common: a small plain coin with a thin raised rim.` |
| U24 | `Refined: a slightly larger coin with a thicker rim and four small embossed rice grains around the hole.` |
| U25 | `High: a thick coin with a silver inner ring around the hole and embossed leaves on the gold rim.` |
| U26 | `Elite: a large thick coin with a notched rim and a cream-white jade ring set around the square hole.` |
| U27 | `Mini-boss: a big coin with a scalloped rim and a raised rice-ear emblem curling around the hole, a few small white glints.` |
| U28 | `Major boss: a grand thick gold medallion with a scalloped double rim, an embossed sunburst and phoenix feathers around the square hole, several white glints.` |

**Đồ rơi khác:** túi vải, giỏ tre, Rương Boss là model 3D (27.2, file Tripo). Mảnh Chữ không cần ảnh khung: chữ cái lấy từ atlas chữ của mã (23.8). Giấy vụn khi quái chết lấy từ X6.
- Tự quyết: bỏ ảnh khung Mảnh Chữ, vì thiết kế vẽ Mảnh Chữ bằng chữ cái của atlas chữ.

## 10. P — VFX (X1–X12)

- Thêm vào P cả nhóm: 23.8 cần các hình này khi trận có hình 3D (1C: đạn Pháo, cầu lửa Draconis, cây đổ khi đặt nhà, Ma Trơi) và ở bước 2 (26.2: "VFX theo ngữ pháp từng thực thể", quái chết thành giấy vụn). 1A, 1B chưa có hình 3D (26.1), nên VFX chưa cần ảnh. Mỗi dòng bảng ghi lý do.
- Không làm ảnh cho thứ mã tự tạo được: tia lửa, lóe trắng, quầng tròn, vòng rune, cột sáng Bùng Nổ, hạt chữ cái, số nổi, vệt bay.
- Giới hạn VFX (23.8): 2.400 hạt (High), 1.200 (Medium). Mỗi tấm chỉ là texture; game lo số lượng.
- Cách ghép X1–X11: STYLE + VFX + phần riêng + dòng nền. X10: chỉ MASK + phần riêng (không STYLE). X12: STYLE + phần riêng.
- Tự quyết: Ma Trơi màu lam trắng lạnh, lõi tím Mực Câm. Tránh xanh ngọc, vì 23.3 dành xanh ngọc cho sức gõ.

| Mã | id | Tên · dùng ở đâu (lý do) | Loại | Trộn | Nền | Lưu |
|---|---|---|---|---|---|---|
| X1 | `dust-puff` | Bụi bung · xây nhà, lính ra cổng, nổ bụi, Đổ Nát, bụi phấn; game tô màu thành bụi, phấn, khói | FLIPBOOK | alpha | G | `art-src/td/vfx/dust-puff.png` |
| X2 | `explosion` | Nổ hoạt hình · đạn Pháo, cầu lửa Draconis (có từ 1A) | FLIPBOOK | alpha | G | `art-src/td/vfx/explosion.png` |
| X3 | `flame-loop` | Lửa lặp · vũng cháy Tối Thượng Draconis (1B), cháy trên quái, lông lửa | FLIPBOOK | cộng | K | `art-src/td/vfx/flame-loop.png` |
| X4 | `water-splash` | Té nước · Thuồng Luồng (1A) chết thành cột nước, phun vòng nước | FLIPBOOK | alpha | G | `art-src/td/vfx/water-splash.png` |
| X5 | `ink-splat` | Mực bắn · Mực Câm bong khi mọi quái chết (22.6); VS tô đen ánh xanh ngọc cho Thư Pháp | FLIPBOOK | alpha | G | `art-src/td/vfx/ink-splat.png` |
| X6 | `paper-scraps` | Giấy vụn · "vệt mực bong thành giấy vụn" khi quái chết (22.6) | ATLAS | alpha | G | `art-src/td/vfx/paper-scraps.png` |
| X7 | `leaf-flakes` | Lá rơi · cây đổ khi đặt nhà (1C), Tanuki chết (1B) | ATLAS | alpha | M | `art-src/td/vfx/leaf-flakes.png` |
| X8 | `wood-chips` | Mảnh gỗ · nhà bị đánh, sửa, bán (ván bay), Mầm Gỗ, Mộc Tinh | ATLAS | alpha | G | `art-src/td/vfx/wood-chips.png` |
| X9 | `stone-chips` | Mảnh đá · Troll hóa đá vỡ (1B), Lũy bị đánh | ATLAS | alpha | G | `art-src/td/vfx/stone-chips.png` |
| X10 | `scorch-mark` | Vết cháy · decal trên đất sau nổ Pháo, cầu lửa (23.8) | MASK | mặt nạ | none | `art-src/td/vfx/scorch-mark.png` |
| X11 | `ma-troi-wisp` | Đốm Ma Trơi · quái Đàn Ma Trơi không có model (27.2: Ma Trơi là VFX) | FLIPBOOK | cộng | K | `art-src/td/vfx/ma-troi-wisp.png` |
| X12 | `ma-troi-sheet` | Tờ tham khảo Ma Trơi · chỉ để AI tích hợp xem dáng đàn và cảnh chết; không vào game; không bắt buộc | ảnh đơn 1536×1024 | — | none | `art-src/td/vfx/ma-troi-sheet.png` |

**X1 · `dust-puff`**
```text
FLIPBOOK: 16 frames of one dust puff bursting out of the ground and fading. Frame 1 a small tight puff; frames 2 to 8 it grows into a ring of chunky rounded cloud lumps; frames 9 to 16 the lumps break into smaller lumps, drift apart and shrink to nothing. Neutral warm grey only (the game tints it to dust, chalk or smoke).
```

**X2 · `explosion`**
```text
FLIPBOOK: 16 frames of one chunky cartoon explosion. Frame 1 a small white-yellow flash; frames 2 to 5 a big rounded fireball of overlapping puffs with a white-yellow core, orange body and red-brown edges; frames 6 to 12 the fire cools into dark grey smoke puffs that rise a little; frames 13 to 16 the smoke breaks up into small puffs that shrink away.
```

**X3 · `flame-loop`**
```text
FLIPBOOK: 16 frames of one small flame flickering in a seamless loop (frame 16 flows back into frame 1): a white-yellow core, an orange body, a few red-orange tips, no smoke, no loose sparks. Additive effect: bright glowing shapes, soft edges, no outline.
```

**X4 · `water-splash`**
```text
FLIPBOOK: 16 frames of one cartoon water splash from the ground. Frame 1 a small dome of water; frames 2 to 6 a short column rises with a crown of chunky drops; frames 7 to 12 the column falls and the drops spread outward and drop; frames 13 to 16 small droplets and a low ring of splash shrink away. Opaque painted water in light blue with white highlights and a darker blue edge.
```

**X5 · `ink-splat`**
```text
FLIPBOOK: 16 frames of one splat of living ink. Frame 1 a small blob; frames 2 to 5 it bursts into a star-shaped splat with round droplets still attached; frames 6 to 12 its edges curl and peel away like drying ink flakes; frames 13 to 16 it breaks into small flakes that shrink away. Deep violet-black with a faint purple sheen.
```

**X6 · `paper-scraps`**
```text
ATLAS: 16 different small torn scraps of old cream rice paper: strips, triangles, curled pieces, a folded corner, a round flake; some with a faint violet-black ink stain on one edge, some with a scorched brown edge; no writing and no marks that look like letters.
```

**X7 · `leaf-flakes`**
```text
ATLAS: 16 different single chunky cartoon leaves: broad round leaves, almond leaves, small bamboo leaves, a toothed oak-like leaf, a heart-shaped leaf; fresh green, yellow-green, a few amber and one dry brown leaf; darker central veins.
```

**X8 · `wood-chips`**
```text
ATLAS: 16 different broken wood pieces: long splinters, chunky chips, a short broken plank end with one nail, flat bark chips, curled pale wood shavings; warm brown bark and pale fresh wood.
```

**X9 · `stone-chips`**
```text
ATLAS: 16 different chunky stone fragments: angular chips, small pebbles, a broken roof-tile piece, flat flakes, one bigger cracked chunk; grey granite with lighter facets and dark crack lines.
```

**X10 · `scorch-mark`** (MASK)
```text
A scorch mark: a rough round burnt patch, brightest white in the centre, cracked ragged edges and a few short radial streaks.
```

**X11 · `ma-troi-wisp`**
```text
FLIPBOOK: 16 frames of one will-o'-wisp spirit light in a seamless loop: a small round ghostly flame with a short wavering flame tail on top and two tiny pure-black eye holes; cold pale blue-white glow with a faint violet core; the flame wavers and stretches, and the eyes blink once in frames 9 and 10. Additive effect: bright glowing shapes, soft edges, no outline.
```

**X12 · `ma-troi-sheet`** (tham khảo, không bắt buộc)
```text
Reference sheet, not a game asset: a loose flock of seven small round ghost flames (will-o'-wisps) floating about three metres above a meadow path at different heights and sizes, cute and a little eerie, cold pale blue-white glow with violet cores, two tiny dark eyes each, a thin violet-black ink streak trailing from the largest one. On the right side, a small strip of three steps shows their death: the flames go out one by one into tiny glass-like sparkles. Plain dark navy background, no text. Landscape 1536 x 1024.
```

**Hiệu ứng chết của quái bậc P dùng tấm nào** (hình chết ở 22.6; model ở file 01):

| Quái | Hình chết (22.6) | Tấm VFX |
|---|---|---|
| Mọi quái | Vệt mực bong thành giấy vụn, chữ cái bay ra | X5 + X6; chữ cái do mã |
| Cương Thi | Bùa cháy từ dưới lên, hóa tro | X3 + X1 tô xám tro + X6 mép cháy |
| Đàn Ma Trơi | Từng đốm tắt, "plinh" thủy tinh | X11 mờ dần; lấp lánh do mã |
| Nuppeppō | Bóp giãn, phụt bột kem | X1 tô màu kem |
| Thuồng Luồng | Cột nước, vảy ngọc rơi | X4; vảy tạm dùng X9 tô trắng ngọc trai |
| Tanuki | Khói be, chiếc lá xoay rơi | X1 tô be + X7 |
| Troll | Hóa đá, vỡ 3 tảng | X9 + X1 |
| Alicanto | Lông vàng rụng thành đồng bay về HUD | U23–U25 (đồng) |
| Mầm Gỗ | Héo rũ | Clip `Enemy_Death` + X7 |
| Mộc Tinh | Bị đánh, rút lui chui xuống đất | X8, X7; X1 khi chui xuống |

- Ma Trơi nhỏ (`ma-troi-nho`, VS, do Dokkaebi gọi) dùng lại X11, thu nhỏ. Không cần ảnh mới.

## 11. Sau (chỉ danh sách)

| Mục | id | Là gì | Nguồn |
|---|---|---|---|
| 1 | `thu-thanh` | Thư Thành, tranh 2D nhiều lớp: trời, đồi xa, làng, tiền cảnh | 28.12, 15.3 |
| 2 | `sanh-tuong` | Sảnh Tướng: nhà gỗ lớn Đội Phi Thư, sân tập rơm | 22.8 |
| 3 | `hoc-vien` | Học Viện: nhà sách nhiều tầng, tổ cú trên mái | 22.8 |
| 4 | `xuong-ban-ve` | Xưởng Bản Vẽ: xưởng mộc, bản vẽ ghim đầy tường | 22.8 |
| 5 | `cay-chu` | Cây Chữ: cây đa non giữa quảng trường, chùm lá chữ sáng theo bậc | 22.8 |
| 6 | `cho` | Chợ: sạp thuyền Rái Đá dưới chân đồi | 22.8 |
| 7 | `codex-<id quái>` | Bách khoa quái: một tranh mỗi loài ở 22.6 và 2 boss ở 22.7 (16 tranh) | 20.3, 27.2 |
| 8 | `greeter-chu-deo`, `greeter-co-rai-bong` | Chân dung người đón ở Thư Thành: Chú Đẽo (Xưởng Bản Vẽ), Cô Rái Bông (Chợ). Đội trưởng Sấm, Trò Mực, Bà Cú Mực dùng lại C15, C19 (file VS) và C8 | 22.8 |

Đường dẫn và prompt của nhóm Sau sẽ viết khi tới bước 6 (26.2).
- Tự quyết: id tạm cho nhóm Sau như bảng trên; người đón có tiền tố `greeter-`.

## 12. Kiểm tra trước khi lưu

**Cảnh vật (S):**
- [ ] Một vật, đủ toàn thân, chân ở giữa đáy, có lề nhỏ.
- [ ] Nhìn gần ngang, hơi từ trên (~10°). Không nhìn từ trên xuống (trừ S13).
- [ ] Sáng phẳng, không bóng đổ, không nắng một phía.
- [ ] Không đất, cỏ, sỏi, hoa quanh chân.
- [ ] Không sợi mảnh, không lá li ti, không phần mờ hay trong suốt.
- [ ] Nền một màu, đúng mã, không loang, không bóng.
- [ ] Vật không chứa màu nền (cây trên nền hồng không có hoa hồng hay tím).

**Phông xa (F):**
- [ ] Mép trái và phải lặng; đường núi chạm mép đúng độ cao ghi trong mục.
- [ ] Trời (F1, F2): không đám mây nào chạm mép trái hay phải.
- [ ] Phía trên đường núi là nền phẳng (F3–F6), đường đỉnh gọn, không sương vắt qua. Phía dưới là màu mù phẳng.
- [ ] Ô a và ô trơn cùng màu, cùng độ mù.

**Chân dung (C):**
- [ ] Đúng màu, đúng đồ (so với ảnh Tripo nếu có). Thư Đồng: mũ kem viền nâu, mắt đen to, chóp bút đen ló trên vai phải.
- [ ] Draconis đúng dáng ảnh 3.png (LOOK-DRACONIS): thân trắng, cánh lông vũ vàng kem, chóp lông đỏ cam, móng và giáp đen vàng.
- [ ] Mặt ở giữa; cắt tròn vẫn đủ mặt, đủ dấu riêng (kính tròn của Chấm, lông đuôi phẩy của Phẩy, băng cánh sọc của Gạch).
- [ ] Hoa văn dây đúng: Chấm chấm, Phẩy phẩy, Gạch gạch.

**Icon, đèn lồng, đồng (U, L):**
- [ ] Thu nhỏ còn 32 px vẫn nhận ra.
- [ ] Không chữ, không số.
- [ ] Các trạng thái của cùng một vật trùng dáng, trùng cỡ.

**VFX (X):**
- [ ] Đúng 16 hình, xếp 4 × 4, không hình nào chạm hình khác hay mép ảnh.
- [ ] FLIPBOOK đi đúng thứ tự trái sang phải, trên xuống dưới.
- [ ] Ảnh cộng màu nằm trên nền đen thuần.
- [ ] Ảnh trên nền khóa màu: mép gọn, không mờ loang ra nền.

## 13. Cho AI tích hợp

- **Cảnh:** `scripts/td/prepare-scenery.mjs` (23.10; chưa có, viết ở 1C). Tách nền theo khóa màu, cắt sát, lề 8 px, viền mực 1,5–2 px, nở màu 8 px, pháp tuyến phồng, tấm bóng, atlas 2 × 4096² (High) và 2 × 2048² (Medium), manifest, KTX2 hoặc WebP. Cỡ thật lấy từ cột "Cao thật". S5, S7 dùng hai tấm chéo. S13 (`scenery/shared/`) là decal trên đất: không pháp tuyến phồng, không tấm bóng, không đung đưa.
- **Icon, đèn lồng, đồng, chân dung:** tách nền, khử viền màu khóa, xuất WebP 1× và 2× (cách làm như `pickups:prepare`). Đầu ra ở `public/assets/td/`. Manifest ghi nguồn: công cụ, gói, ngày, prompt (27.1).
- **VFX:** cắt lưới 4 × 4. Lưới lệch thì tách từng hình theo vùng nền (các hình không chạm nhau), rồi xếp lại ô 256 px theo thứ tự trái sang phải, trên xuống dưới. Cờ trộn theo cột "Trộn". X1 cho phép tô màu. X10 là mặt nạ cho decal.
- **Phông xa:** hòa mép 6 %. Xếp 4 ô mỗi vòng theo cột "Đặt quanh vòng". Trụ ở 140 / 220 / 320 m; dải trời sau cùng, phần trên nối màu tới đỉnh vòm. Phóng 2× khi cần.
- **Ma Trơi:** X11 là thân mỗi đốm. X12 chỉ để tham khảo.
- **Chân dung:** cắt tròn ở thanh trợ lực. Thư Đồng hoảng dùng ảnh `-scared`.
- **Impostor (VS):** S30 ở file VS có 8 ảnh mỗi biến thể, `-d0` … `-d7`; d<k> là nhà xoay k × 45° theo chiều kim đồng hồ nhìn từ trên. Ảnh trượt Tối Thượng cắt thành dải ngang khoảng 3 : 1 ở nửa giữa ảnh.

## 14. Chỗ còn hở

1. **Draconis:** Tự quyết (22/10, đổi được): C1 (và C23, T1, T2 ở file VS, lông lửa V70 ở `02-tripo-buildings-props-vs.md`) theo dáng ảnh 3.png của 22.2: thân trắng, cánh lông vũ vàng kem. Model có sẵn `heroes/draconis-v2` (rồng người đỏ thẫm, cánh màng) chỉ là model tạm; model mới là P18 ở file 01. Trong lúc chờ P18, chân dung và model trong game khác màu.
2. **Đối chiếu file 01:** Thư Đồng, Lam, Tre, tổ thợ, trâu Mộng, Mộc Tinh, Đại Bàng Tinh đã chép theo `01-tripo-characters-enemies.md` và `-vs.md` (đối chiếu lại ngày 22/10: LOOK-OWLET và 10 tổ thợ đã sửa cho khớp). File 01 đổi thì sửa lại các khối LOOK và dòng tổ thợ. Dáng Bà Cú Mực vẫn là tự quyết (file 01 không có).
3. **Trâu:** 22.9 ghi "trâu và đàn cò (sprite động)", còn 23.10 và 27.2 cho trâu là model 3D. File này theo 23.10: trâu ở file Tripo, cò là thú nền (VS).
4. **Chưa có trong 27.2, chưa viết prompt:** icon tín hiệu cần giúp (8.9), icon trạng thái trên quái (23.8), 2 Phép Chỉ huy (16.1), 4 vật phẩm mang theo (16.2), icon Sao, Xu, Bản vẽ, khung HUD sách tranh (gỗ, giấy da).
5. **Ảnh nền đất bản đồ** (22.9) chỉ làm sau khi bố cục khóa và AI xuất ảnh khung. Cỏ thấp, hoa nhỏ, sỏi vẽ vào đất (23.10) chưa có tem riêng; tạm dùng S5, S7 thu nhỏ.
6. **Khổ ảnh:** ChatGPT tạo tối đa 1536 × 1024. Phông xa phải ghép 4 ô; tranh 16 : 9 (file VS) phải cắt từ 3 : 2.
7. **Lưới VFX 4 × 4, 8 hướng của S30:** chưa thử xem ChatGPT giữ lưới đều và giữ đúng một ngôi nhà qua 8 hướng tới đâu. Mục 13 có cách cứu khi lưới lệch. S30 lệch quá thì cần thêm một mục Tripo cho nhà sàn ở file `02-…-vs.md` (ngoài phạm vi file này).
8. **Decal tán nhìn từ trên:** 23.10 cho cây lớn trộn sang decal tán khi camera dốc hơn 75° (F3). 27.2 chưa ghi món này, nên chưa có prompt.
9. **Vật dài (S11 khúc gỗ):** billboard luôn quay mặt dài về camera, nhìn hơi sai khi xoay 90°. 23.10 có impostor 8 hướng cho đá lệch, tàn tích (VS, 26.2 bước 5); ở 1C nên đặt khúc gỗ thưa.
