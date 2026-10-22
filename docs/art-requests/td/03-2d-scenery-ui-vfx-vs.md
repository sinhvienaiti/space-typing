# Prompt ảnh 2D cho Typing Defense, bậc VS (22/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh bằng ChatGPT), ChatGPT (đọc file và tạo ảnh), AI tích hợp về sau.
>
> **Lấy từ thiết kế** `docs/td/TYPING_DEFENSE_DESIGN.md`: 22.1–22.2 (thế giới, ba Tướng, truyện), 22.4 (nhà, tổ thợ), 22.7 (boss), 22.9 (bản đồ 2, 3), 23.8 (ảnh trượt Tối Thượng), 23.10 (cảnh 2D, thú nền), 23.11 (chân dung), 23.12 (Neon), 23.13 (tranh truyện), 26.2 (bước 5 là VS), 27.2 (bậc VS).
>
> **File chính:** [`03-2d-scenery-ui-vfx.md`](03-2d-scenery-ui-vfx.md) có bậc P, cách làm, đường dẫn, kiểm tra và cách tích hợp. Mục 1 dưới đây chép các khối prompt từ file chính và thêm các khối mới (FAUNA, NEON, NEON-RECOLOUR, SLIDE-IN, STORY). Nếu hai file khác nhau, file chính đúng.
>
> **Không món nào ở đây gửi Tripo.** Mọi ảnh dùng thẳng dạng 2D.

```text
Instructions for ChatGPT
1. Read this whole file first. Make one image per request and one subject per image.
2. Build every prompt from the blocks in section 1 of this file, word for word, in the order given
   by the "Cách ghép" (recipe) line of the item's group, normally:
   STYLE (or NEON for the Neon atlas) + the KIND block
   (SCENERY, BACKDROP, PORTRAIT, ICON, VFX, SLIDE-IN or STORY) + the LOOK block (characters)
   + the item prompt (+ NEON-RECOLOUR for the Neon atlas, + FAUNA for animals)
   + the ONE variant or view line you are making (scenery only, e.g. "v3: ...")
   + the MATCH, SAME, REF, BUILDREF or LAYOUT line (only when an image is attached)
   + the background line whose code is in the item table (G, M, B, K; "none" means no line).
   When a later block contradicts an earlier one, the later, more specific block wins.
3. Map 1 variants v3 and v4 (S1-S13) and the Neon atlas (N1-N12) use item prompts from the main
   file docs/art-requests/td/03-2d-scenery-ui-vfx.md, section 5. Open it for those items
   (same repo and branch as this file). LOOK-DRACONIS is in section 7 of the main file.
4. Use the image size in the item table; if the table has none, use the size at the end of the
   KIND block. Never draw text, letters, numbers, signatures, watermarks, logos, speech bubbles,
   captions, UI or frames.
5. After each image, write its exact save path from the item table so the owner can save it.
6. If the owner attaches an image, add the MATCH, SAME, REF, BUILDREF or LAYOUT line from
   section 1.8, just before the background line.
7. Do not invent new items, ids or file names. Do not change colours given as hex codes.
8. If a rule is unclear, two rules conflict, or something you need is missing,
   ask the owner before generating. Do not guess.
```

## 1. Khối prompt

### 1.1 STYLE (chép từ file chính)

```text
Bright hand-painted storybook fantasy art for a cozy tower-defense game set in a Vietnamese-inspired folk valley of rice terraces, bamboo villages, silver waterfalls and white limestone hills. Chunky rounded shapes, strong simple silhouettes, fresh warm colours (young-rice green, ripe-rice gold, river silver, bamboo brown, limestone white, small cinnabar accents), clean even dark ink outlines, flat colour fills with soft painted texture, charming, lively and warm like a classic illustrated picture book. No text, letters, numbers, signature, watermark, logo, frame or border.
```

### 1.2 SCENERY (chép từ file chính)

```text
Single scenery cut-out for a 3D game that shows plants and rocks as flat painted billboards: exactly one object, whole and complete, centred, its base at the bottom centre of the image, a small empty margin on every side. Seen from the front, a little above eye level (about 10 degrees down), almost a side view, never from above. Flat, even, shadowless light from the front: no cast shadow, no strong highlight, no rim light, no sun direction. Foliage grouped into a few big rounded masses, each mass slightly darker on its underside. An even dark ink outline around the object and around each big mass. No ground, no soil, no grass, no pebbles and no flowers around the base: the base ends cleanly. No blur, no soft or see-through parts, no glow, no thin strands, no single hairs or needles, no tiny scattered leaves, no floating bits.
```

### 1.3 BACKDROP (chép từ file chính)

```text
Backdrop tile for a 3D game: one wide strip of very distant scenery that wraps around the play area. Viewed straight ahead at a level horizon: no tilt, no fisheye, no perspective lines. Soft even light, no strong shadows, no sun disc unless the item asks for one. Atmospheric haze: farther parts are paler and bluer, and their outlines are thinner and softer in colour. Large calm shapes, no small busy detail, no people, no animals, no buildings unless the item asks for one. The top edge of the land against the background is one crisp, solid line: no mist, haze or cloud crosses it. The left 8% and the right 8% of the image are calm and plain, and the ridge line meets both side edges at exactly the height given in the item, so tiles join side by side and also when mirrored. Landscape 1536 x 1024.
```

### 1.4 PORTRAIT (chép từ file chính)

```text
Character portrait for the game HUD: one character only, turned three-quarters toward the viewer's right and looking slightly right, a clear, readable expression. The face sits in the middle of the image with the eyes about 40% from the top; the character fills most of the frame, so the portrait still reads when cropped to a circle and shrunk to 64 px. Soft painted shading under even front light, crisp ink outline. Square 1024 x 1024.
```

### 1.5 ICON (chép từ file chính)

```text
Game HUD icon: one single object, centred, filling about 80% of the square, slight three-quarter front view, chunky simplified shapes with very few details, a bold dark ink outline thick enough to survive shrinking to 32 px, two or three flat tones per colour plus one small soft highlight, strong contrast so it reads on both cream parchment and dark wood. No background shapes, no extra badge or circle behind the object (when the object itself is a badge or a shield, that is fine), no frame, no cast shadow, no text, no letters, no numbers. Square 1024 x 1024.
```

### 1.6 VFX (chép từ file chính; dùng cho thú nền) và FAUNA (mới)

```text
Game VFX sprite sheet: chunky rounded shapes, two or three painted tones. Solid pieces have a thin dark ink outline; dust, smoke, water and fire have no outline. On a green, magenta or blue background every edge is crisp and solid: softness is painted as two or three tone bands inside the shape, never as a blurry or see-through fade into the background. On a black background (glowing effects) soft glowing edges are fine. A FLIPBOOK shows the whole motion including the fade-out: in the last frames the shapes break apart and shrink instead of turning see-through. Exactly 16 cells in a 4 x 4 grid on a square 1024 x 1024 image: each cell is 256 x 256 px, the drawing is centred in its cell with at least 24 px of empty space on every side, nothing touches or crosses a cell border, no grid lines, no numbers, no labels. Cells read left to right, top to bottom.
```

FAUNA (dán sau phần riêng của A1–A4):

```text
These are living animals, not an effect: paint them as solid storybook creatures with a clean even dark ink outline and normal painted shading, the same size and position in every cell; thin legs and beaks are drawn as thick simple strokes.
```

### 1.7 Dòng nền (chép từ file chính)

| Mã | Khi nào | Dòng nền |
|---|---|---|
| G | Vật không có màu xanh lá | `Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no green at all.` |
| M | Vật có màu xanh lá, không có hồng hay tím hồng | `Flat pure #FF00FF magenta background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no pink, magenta or bright purple at all.` |
| B | Vật có cả xanh lá và hồng hoặc tím hồng | `Flat pure #0000FF blue background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no blue at all.` |
| K | Hiệu ứng cộng màu | `Pure black #000000 background, perfectly uniform; only the glowing effect is in the image.` |
| none | Trời, tranh vẽ kín, ảnh trượt | Không dán dòng nền. |

- G, M, B là ba dòng nền BG-G, BG-M, BG-B của file 01 và 02, giống từng chữ. K chỉ dùng ở file 03.

### 1.8 Dòng MATCH, SAME, REF, BUILDREF, LAYOUT (chép từ file chính; dán ngay trước dòng nền)

| Dòng | Khi nào | Câu dán |
|---|---|---|
| MATCH | Biến thể v2 trở đi, ô phông thứ hai | `Use the attached image only to match the style, colours, outline and light. Paint a different individual as described.` |
| SAME | Trạng thái khác của cùng một vật | `Same object as the attached image: identical shape, size, position and colours. Change only what is described.` |
| REF | Nhân vật đã có ảnh chuẩn | `The attached image is the official look of this character. Keep its colours, markings, clothes, kit and proportions exactly; only the pose, view and expression may change.` |
| BUILDREF | Icon nhà, khi có ảnh Tripo của nhà đó | `The attached image shows this building. Keep its shape, materials and colours, simplified into a chunky icon; add only what is described.` |
| LAYOUT | Khối tán (S12, S31), khi chủ dự án đính kèm ảnh mẫu `art-src/td/refs/4.webp` của mình | `Use the attached image only as a layout reference for how the round crowns stick together in offset rows. Do not copy its colours, style or details.` |

### 1.9 NEON (mới; thay STYLE cho atlas Neon)

```text
Dark painterly neon fantasy art for the same tower-defense game: the same plant or rock as the storybook version, but in night-dark materials (deep navy, indigo and charcoal, no green), crisp clean edges, a thin even dark outline, glowing accents painted on the surface as bold veins, cracks, leaf rims and tips in electric blue and soft violet with a few pale white points. No teal, no red, no orange, no gold glow. No loose light rays, no glow spilling outside the object. No text, letters, numbers, signature, watermark, logo, frame or border.
```

- Tự quyết: Neon dùng lam điện và tím nhạt. Tránh xanh ngọc (sức gõ), đỏ (nguy hiểm), cam (khẩn), vàng kim (tiền), theo 23.3.

NEON-RECOLOUR (dán ngay sau phần riêng S1–S12, trước dòng biến thể):

```text
Neon recolour: ignore every colour named in the description above. All leaves, needles, grass, moss, reeds, flowers, berries, bark and stone are painted in deep navy, indigo and charcoal; only rims, veins and tips glow in electric blue and soft violet with a few pale white points. Nothing in the image is green.
```

- Phần riêng S1–S12 tả lá xanh, rêu xanh. Không có dòng này thì ChatGPT dễ vẽ lá xanh, và nền G sẽ xóa mất lá khi tách nền.

### 1.10 SLIDE-IN (mới; ảnh trượt Tối Thượng)

```text
Ultimate slide-in art for the game: a dynamic half-body action shot of one hero in the middle of their ultimate move, facing right and moving toward the right, placed in the left 60% of the image. The game crops this image into a wide strip, so the hero's head, face, hands and the main action all sit inside the middle half of the image height (from 25% to 75% from the top); the top and bottom quarters hold only the colour band and loose effects. The background is a bold horizontal band of the hero's colour (given in the item) painted with rough brush strokes, slightly darker at the top and bottom, filling the whole image. Fire and magic effects are allowed and may spill over the band. Strong storybook ink outlines. Landscape 1536 x 1024.
```

### 1.11 STORY (mới; tranh truyện)

```text
Story panel for a picture-book cutscene: one wide cinematic scene with a full painted background, warm readable lighting, one clear focal point, characters exactly on-model, gentle humour, no blood and no gore. Compose for 16:9 inside a 3:2 image (1536 x 1024): keep every important element inside the middle band and leave the top 8% and bottom 8% as plain sky or ground that can be cropped. No text, no speech bubbles, no captions (the game adds subtitles).
```

## 2. Tổng quan VS

| Nhóm | Mã | Số ảnh | Ghi chú |
|---|---|---|---|
| Cảnh bản đồ 1 thêm | S1–S14 | 30 | v3, v4 của S1–S13 (26 ảnh) + cọc đá ruộng S14 (4 ảnh) |
| Cảnh bản đồ 2 | S15–S22 | 32 | 8 loại × 4 biến thể |
| Cảnh bản đồ 3 | S23–S31 | 48 | 8 loại × 4 biến thể + nhà sàn S30 (2 biến thể × 8 hướng) |
| Phông xa bản đồ 2, 3 | F7–F18 | 12 | Phông bản đồ 1 đã có ở P |
| Chân dung đủ | C9–C22 | 14 | Lam, Tre, 10 tổ thợ, 2 boss (Draconis đã có ở P) |
| Ảnh trượt Tối Thượng | C23–C25 | 3 | Một ảnh mỗi Tướng |
| Tranh truyện | T1–T6 | 6 | 2 tranh mỗi Tướng |
| Atlas cảnh Neon | N1–N12 | 48 | 12 loại × 4 biến thể |
| Thú nền | A1–A4 | 4 | Thêm vào VS, lý do ở mục 11 |
| Icon nhà VS | U29–U31 | 3 | Thêm vào VS, lý do ở mục 12 |

- Tự quyết: VS có 18 loại cảnh mới (S14–S31). Cộng 13 loại của P là 31, hơn mức "~25" của 27.2, vì 22.9 liệt kê đủ chừng ấy loại. Thiếu thời gian thì làm trước cây, khối tán và đá.

## 3. Cảnh bản đồ 1 thêm (`meadow`)

- Luật 23.10: ≥ 4 biến thể mỗi loại. P đã có v1, v2. VS làm v3, v4.
- Phần riêng và dòng v3, v4 của S1–S13 nằm ở file chính, mục 5. Lưu `art-src/td/scenery/meadow/<id>-v3.png` và `-v4.png`; riêng gốc cây S13 lưu `art-src/td/scenery/shared/tree-stump-v3.png` và `-v4.png`.
- Đá ở mọi bản đồ vẽ tròn trịa để làm billboard (23.10). Đá lệch và tàn tích là impostor 8 hướng (xem S30).
- Cách ghép: STYLE + SCENERY + phần riêng + một dòng biến thể + dòng nền (S13 không dùng SCENERY, xem file chính).
- Tự quyết: cọc đá ruộng (22.9 "cọc đá khắc tên ruộng") khắc nét cọ trừu tượng, không chữ thật, vì ảnh không được có chữ. Dáng giống cọc mốc đá vôi trên model Ruộng Lúa (file 02, P12).

| Mã | id | Tên · là gì | Cao thật | Khổ | Nền | Lưu (v1) |
|---|---|---|---|---|---|---|
| S14 | `field-marker` | Cọc đá ruộng · cọc đá đánh dấu bờ ruộng | 1 m | 1024×1536 | M | `art-src/td/scenery/meadow/field-marker-v1.png` |

**S14 · `field-marker`**
```text
A short round-topped limestone field-marker post about 1 metre tall, pale cream-white with grey seams, slightly tapered, a round carved medallion on its front filled with bold abstract brush-stroke carving (not letters, not symbols), soft moss on its top and on one shoulder.
v1: a straight post.
v2: leaning a little to the right.
v3: shorter and wider.
v4: with a chipped top corner.
```

## 4. Cảnh bản đồ 2: Vịnh Đá Trắng (`coast`)

- Bờ đá vôi, 18:00 giờ vàng, gió biển (22.9). Tranh vẫn sáng phẳng; game tô màu theo giờ (23.10).
- Lấy từ danh sách cảnh 2D bản đồ 2 (22.9): ô-liu, phi lao, cỏ biển, hoa muống biển, đá vôi trắng, lưới phơi, thuyền thúng úp. Hải âu là thú nền (mục 11). Bọt sóng do shader nước.
- Cách ghép: STYLE + SCENERY + phần riêng + một dòng biến thể + dòng nền. Làm đủ v1–v4; đổi `-v1` thành số biến thể.
- Tự quyết: đá vôi tách hai cỡ (nhỏ, vừa) như bản đồ 1.
- Tự quyết: lưới phơi vẽ thành nếp vải dày, không có lỗ lưới, vì 23.10 cấm sợi mảnh.

| Mã | id | Tên · là gì | Cao thật | Khổ | Nền | Lưu (v1) |
|---|---|---|---|---|---|---|
| S15 | `olive-tree` | Cây ô-liu · cây già thân xoắn, tán xám bạc | 6 m | 1024×1536 | M | `art-src/td/scenery/coast/olive-tree-v1.png` |
| S16 | `casuarina` | Phi lao · cây cao, tán rủ nghiêng theo gió | 10 m | 1024×1536 | M | `art-src/td/scenery/coast/casuarina-v1.png` |
| S17 | `sea-grass` | Cỏ biển · bụi cỏ cồn cát (hai tấm chéo) | 0,7 m | 1024×1024 | M | `art-src/td/scenery/coast/sea-grass-v1.png` |
| S18 | `morning-glory` | Hoa muống biển · thảm dây bò, hoa hồng | 0,4 m | 1536×1024 | B | `art-src/td/scenery/coast/morning-glory-v1.png` |
| S19 | `limestone-small` | Đá vôi trắng nhỏ | 0,7 m | 1024×1024 | G | `art-src/td/scenery/coast/limestone-small-v1.png` |
| S20 | `limestone-medium` | Đá vôi trắng vừa · tảng đá tròn, mặt có gờ | 2,2 m | 1536×1024 | G | `art-src/td/scenery/coast/limestone-medium-v1.png` |
| S21 | `net-rack` | Lưới phơi · giá tre phơi lưới cá | 2 m | 1536×1024 | G | `art-src/td/scenery/coast/net-rack-v1.png` |
| S22 | `basket-boat` | Thuyền thúng úp | 1 m (rộng 2 m) | 1536×1024 | G | `art-src/td/scenery/coast/basket-boat-v1.png` |

**S15 · `olive-tree`**
```text
An old olive tree about 6 metres tall: a thick twisted silver-grey trunk with a hollow, a wide crown of five rounded masses of silvery grey-green leaves with darker undersides, a few small dark olives.
v1: wide and balanced.
v2: leaning toward the right, as if toward the sea.
v3: a young, slimmer tree.
v4: a very old tree, its trunk split in two.
```

**S16 · `casuarina`**
```text
A tall coastal casuarina (she-oak) about 10 metres tall: a straight rough grey-brown trunk, drooping grey-green foliage grouped into four tall solid rounded masses swept to one side by the wind, no single needles.
v1: upright.
v2: bent by the wind to the right.
v3: two trunks from one base.
v4: young and slim.
```

**S17 · `sea-grass`**
```text
A tuft of coastal dune grass about 70 cm tall: stiff blades grouped into five thick tapering clumps leaning with the sea wind, pale sage green with sandy straw tips. Roughly symmetrical, so it also works on two crossed planes.
v1: upright.
v2: leaning right.
v3: short and wide.
v4: tall, with a few seed spikes.
```

**S18 · `morning-glory`** (nền B vì có lá xanh và hoa hồng)
```text
A low creeping mat of beach morning glory about 40 cm tall: thick trailing stems with broad rounded heart-shaped green leaves and five or six big trumpet flowers in bright warm pink (no blue or violet tint) with paler centres.
v1: a round mat.
v2: a long mat trailing to the right.
v3: a small mat with two flowers.
v4: a dense mat with many flowers.
```

**S19 · `limestone-small`**
```text
A small white limestone rock about 70 cm tall, rounded and pitted by sea spray, pale cream-white with soft blue-grey hollows and a thin streak of dry yellow lichen.
v1: rounded.
v2: two rocks fused at the base.
v3: flat.
v4: taller, with a rounded top.
```

**S20 · `limestone-medium`**
```text
A medium white limestone boulder about 2.2 metres tall, chunky and rounded overall, with eroded ridges and round pits on its surface, pale cream-white with blue-grey shading in the hollows.
v1: rounded.
v2: taller and upright, narrower at the top.
v3: split in two.
v4: low and wide, with a small arch through it.
```

**S21 · `net-rack`**
```text
A fishing-net drying rack: two short bamboo A-frames joined by a pole, a heavy dark-blue fishing net draped over it in thick solid folds (no see-through mesh holes), a row of round cork floats along its edge.
v1: a full net.
v2: the net pulled to one side.
v3: a short rack with a small net.
v4: the net folded twice over the pole.
```

**S22 · `basket-boat`**
```text
A round woven bamboo basket boat turned upside down: a dome of tight basket weave with a dark tar-coated rim, a wooden paddle leaning against it.
v1: the dome resting flat on its rim.
v2: tilted up on one side.
v3: a smaller boat.
v4: with a patch of darker newer weave.
```

## 5. Cảnh bản đồ 3: Rừng Rễ Cổ (`rainforest`)

- Rừng mưa, 10:30 ẩm, tia nắng xuyên tán (22.9). Luật Tán Che: cây chặt được khi đặt nhà, nên mỗi cây phải đọc rõ.
- Lấy từ 22.9: cây rừng to 8–12 m, dây leo, dương xỉ, nấm, rễ nhỏ, phong lan, đá rêu, nhà sàn bỏ hoang (xa). Thêm khối tán rừng (23.10). Đom đóm, bướm là thú nền (mục 11).
- Cách ghép: STYLE + SCENERY + phần riêng + một dòng biến thể + dòng nền. Làm đủ v1–v4 (S30 làm theo cách riêng ở mục S30).
- Tự quyết: dây leo vẽ quấn quanh gốc cây chết, vì dây leo cần chỗ bám và tranh phải là một vật trọn.
- Tự quyết: dương xỉ ở rừng là dương xỉ thân gỗ, để khác dương xỉ bụi của bản đồ 1.

| Mã | id | Tên · là gì | Cao thật | Khổ | Nền | Lưu (v1) |
|---|---|---|---|---|---|---|
| S23 | `jungle-tree` | Cây rừng to · thân xám, rễ bạnh | 12 m | 1024×1536 | M | `art-src/td/scenery/rainforest/jungle-tree-v1.png` |
| S24 | `vine-stump` | Dây leo · gốc cây chết quấn dây leo | 4 m | 1024×1536 | M | `art-src/td/scenery/rainforest/vine-stump-v1.png` |
| S25 | `tree-fern` | Dương xỉ thân gỗ | 3 m | 1024×1536 | M | `art-src/td/scenery/rainforest/tree-fern-v1.png` |
| S26 | `mushroom-cluster` | Cụm nấm | 0,5 m | 1024×1024 | G | `art-src/td/scenery/rainforest/mushroom-cluster-v1.png` |
| S27 | `root-tangle` | Rễ nhỏ · đám rễ uốn vòng | 0,8 m (dài 2 m) | 1536×1024 | G | `art-src/td/scenery/rainforest/root-tangle-v1.png` |
| S28 | `orchid-clump` | Phong lan · khóm lan trên mẩu cành | 0,6 m | 1024×1024 | B | `art-src/td/scenery/rainforest/orchid-clump-v1.png` |
| S29 | `mossy-boulder` | Đá rêu rừng | 2 m | 1536×1024 | M | `art-src/td/scenery/rainforest/mossy-boulder-v1.png` |
| S30 | `stilt-house-ruin` | Nhà sàn bỏ hoang · đặt xa, ở mép bản đồ; impostor 8 hướng | 6 m | 1024×1024 | M | `art-src/td/scenery/rainforest/stilt-house-ruin-v1-d0.png` |
| S31 | `jungle-canopy-block` | Khối tán rừng mưa · tường tán ở mép rừng | 14 m (rộng 18 m) | 1536×1024 | M | `art-src/td/scenery/rainforest/jungle-canopy-block-v1.png` |

**S23 · `jungle-tree`**
```text
A giant rainforest tree about 12 metres tall: a tall pale grey trunk with wide plank-like buttress roots at its base, a few thick branches holding four big dense rounded masses of deep green leaves high up, two thick vines hanging as solid ropes.
v1: straight and tall.
v2: leaning, the crown off to the left.
v3: slimmer, with three leaf masses.
v4: very wide buttresses and a broad crown.
```

**S24 · `vine-stump`**
```text
A dead tree stump about 4 metres tall with a broken top, wrapped and draped in thick twisting lianas, broad heart-shaped leaves grouped into a few rounded masses, the hanging vines drawn as thick solid ropes that end well above the base.
v1: a straight stump, vines on both sides.
v2: a leaning stump, vines hanging to the right.
v3: a shorter stump with one big leaf mass on top.
v4: a split stump with vines bridging the gap.
```

**S25 · `tree-fern`**
```text
A tree fern about 3 metres tall: a straight shaggy brown trunk topped by a crown of eight big arching fronds, each frond one solid scalloped leaf shape, bright green with darker undersides.
v1: upright, with an even crown.
v2: the trunk curving to the left.
v3: a short young tree fern.
v4: a tall one with drooping lower fronds.
```

**S26 · `mushroom-cluster`**
```text
A cluster of seven chunky forest mushrooms about 50 cm tall growing from one shared base: smooth caps in warm tan, cream and soft orange, thick pale stems, a few small white spots on the largest cap.
v1: one big mushroom in the middle with smaller ones around it.
v2: a tall group leaning right.
v3: three wide flat caps.
v4: a crowded cluster of many small caps.
```

**S27 · `root-tangle`**
```text
A tangle of thick gnarled tree roots about 2 metres long, arching up in three loops and diving back down, warm brown bark with paler root tips; the loops end cleanly at the bottom of the object.
v1: three even loops.
v2: one tall loop and two low ones.
v3: a short tangle of two loops.
v4: a long tangle with a root fork.
```

**S28 · `orchid-clump`** (nền B vì có lá xanh và hoa hồng)
```text
A wild orchid clump growing on a short mossy branch stub: thick strap-shaped green leaves and two arching sprays of big orchid flowers in pink and white.
v1: two sprays arching left and right.
v2: one long spray hanging down to the right.
v3: a small clump with one spray.
v4: a big clump with three sprays.
```

**S29 · `mossy-boulder`**
```text
A rounded dark grey boulder about 2 metres tall, thickly covered in bright green cushion moss on its top and sides, two small ferns sprouting from a crack as solid shapes, darker wet-looking stone near its base.
v1: rounded.
v2: taller and upright, still rounded.
v3: split by a crack with a fern in it.
v4: low and wide.
```

**S30 · `stilt-house-ruin`** (impostor 8 hướng)
- Tự quyết: nhà sàn bỏ hoang là tàn tích, nên làm impostor 8 hướng (23.10; impostor có ở VS, 26.2 bước 5). Một billboard luôn quay mặt trước về camera khi xoay, nhìn sai.
- Tự quyết: 2 biến thể × 8 hướng = 16 ảnh, không phải 4 biến thể. Nhà sàn chỉ đặt 1–2 cái ở mép xa; luật ≥ 4 biến thể là để chống lặp cho vật rải dày.
- Tự quyết: tên file thêm hướng: `stilt-house-ruin-v<n>-d<k>.png`, k = 0…7. Hướng k là nhà xoay k × 45° theo chiều kim đồng hồ nhìn từ trên (như bàn xoay); "trái, phải" là trái, phải của chính ngôi nhà.
- Cách ghép d0: STYLE + SCENERY + phần riêng (đoạn đầu và dòng "Views:") + một dòng v + dòng d0 + nền M. Cách ghép d1–d7: như d0 nhưng đổi dòng d, đính kèm ảnh d0 cùng biến thể và thêm dòng SAME (trước dòng nền).
- 8 ảnh lệch nhau quá thì báo AI tích hợp. Cách dự phòng: dựng model Tripo cho nhà sàn rồi Blender chụp 8 hướng (cần thêm mục ở file `02-…-vs.md`).
```text
A small abandoned wooden stilt house about 6 metres tall, simple shapes that read from far away: a hut on tall thick wooden posts, a sagging thatched roof with a hole, moss patches grouped into a few big masses, a broken ladder with thick rungs, a thick vine climbing one post; quiet and a little sad, not scary. The whole hut fits inside the square, with the same size and the same base position in every view.
v1: the hut standing straight, with a small covered porch at the front.
v2: a smaller hut with half of its roof gone.
Views: the hut stands on a turntable and turns 45 degrees clockwise (seen from above) for each step; the camera never moves. "Left" and "right" mean the hut's own left and right.
d0: not turned: the front of the hut faces us.
d1: turned 45 degrees: we see the front and the hut's left side.
d2: turned 90 degrees: we see the hut's left side.
d3: turned 135 degrees: we see the hut's left side and the back.
d4: turned 180 degrees: we see the back.
d5: turned 225 degrees: we see the back and the hut's right side.
d6: turned 270 degrees: we see the hut's right side.
d7: turned 315 degrees: we see the hut's right side and the front.
```

**S31 · `jungle-canopy-block`**
```text
A rainforest-edge canopy block: a dense wall of deep green jungle crowns, round crowns stuck together side by side in offset rows, each row behind taller and about 8% darker than the row in front; a few hanging vines drawn as solid ropes and broad banana-like leaves at the front bottom; trunks only at the very bottom, ending cleanly; one solid connected shape.
v1: three crowns in two rows.
v2: five crowns in three rows.
v3: four crowns in two rows, taller on the right.
v4: five crowns in four rows, with a tall back row.
```

## 6. Phông xa bản đồ 2 và 3

- Cách làm như mục 6 file chính: 6 ảnh mỗi bản đồ. Ô a đặt một lần; ô trơn đặt các chỗ còn lại, lật ngang xen kẽ.
- Cách ghép dải trời: STYLE + phần riêng (đã gồm luật mép). Các lớp: STYLE + BACKDROP + phần riêng + nền M.
- Làm ô thứ hai của mỗi cặp với ô đầu đính kèm và dòng MATCH.
- Bản đồ 2 (22.9): đảo đá vôi, mặt trời vàng, mây hồng. Bản đồ 3: rừng mưa, tia nắng xuyên tán.
- Tự quyết: bản đồ 2 quay `sky-a` (mặt trời) về hướng tây, vì là 18:00. Bản đồ 3 quay `sky-a` (tia nắng) về hướng đông, vì là 10:30.
- Trời tối dần và đom đóm ở đợt boss bản đồ 3 là màu do game pha (22.9), không cần ảnh riêng.

| Mã | Bản đồ | Lớp (id) | Là gì | Đặt quanh vòng | Nền | Lưu |
|---|---|---|---|---|---|---|
| F7 | `w1-whitestone` | `sky-a` | Trời giờ vàng có mặt trời | 1 lần, hướng tây | none | `art-src/td/backdrops/w1-whitestone/sky-a.png` |
| F8 | `w1-whitestone` | `sky-b` | Trời mây hồng | 3 lần, lật xen kẽ | none | `art-src/td/backdrops/w1-whitestone/sky-b.png` |
| F9 | `w1-whitestone` | `layer-320` | Đảo đá vôi xa | 4 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-whitestone/layer-320.png` |
| F10 | `w1-whitestone` | `layer-220` | Đảo đá vôi gần hơn | 4 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-whitestone/layer-220.png` |
| F11 | `w1-whitestone` | `layer-140-a` | Mũi đất có thuyền buồm | 1 lần | M | `art-src/td/backdrops/w1-whitestone/layer-140-a.png` |
| F12 | `w1-whitestone` | `layer-140-b` | Mũi đất trơn | 3 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-whitestone/layer-140-b.png` |
| F13 | `w1-rootwood` | `sky-a` | Trời ẩm có tia nắng | 1 lần, hướng đông | none | `art-src/td/backdrops/w1-rootwood/sky-a.png` |
| F14 | `w1-rootwood` | `sky-b` | Trời ẩm mây cao | 3 lần, lật xen kẽ | none | `art-src/td/backdrops/w1-rootwood/sky-b.png` |
| F15 | `w1-rootwood` | `layer-320` | Dãy rừng xa trong sương | 4 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-rootwood/layer-320.png` |
| F16 | `w1-rootwood` | `layer-220` | Dãy rừng có thác mảnh | 4 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-rootwood/layer-220.png` |
| F17 | `w1-rootwood` | `layer-140-a` | Tán rừng có cây vượt tán | 1 lần | M | `art-src/td/backdrops/w1-rootwood/layer-140-a.png` |
| F18 | `w1-rootwood` | `layer-140-b` | Tán rừng trơn | 3 lần, lật xen kẽ | M | `art-src/td/backdrops/w1-rootwood/layer-140-b.png` |

**F7 · `w1-whitestone/sky-a`**
```text
Sky band of a 360-degree backdrop for a 3D game, golden hour at 6 pm over a calm sea: warm gold near the bottom, soft pink and peach clouds, cooler blue at the top edge, and a big soft golden sun just above the bottom haze in the centre of the image; the bottom 20% fades into a flat warm golden haze. No land, no sea, no birds. Soft even light. The left 8% and right 8% are plain sky with the same colour at every height on both sides, and no cloud touches or crosses the left or right edge, so tiles join side by side and when mirrored. Landscape 1536 x 1024.
```

**F8 · `w1-whitestone/sky-b`**
```text
Sky band of a 360-degree backdrop for a 3D game, golden hour at 6 pm over a calm sea: warm gold near the bottom, soft pink and peach clouds of different sizes, cooler blue at the top edge, no sun; the bottom 20% fades into a flat warm golden haze. No land, no sea, no birds. Soft even light. The left 8% and right 8% are plain sky with the same colour at every height on both sides, and no cloud touches or crosses the left or right edge, so tiles join side by side and when mirrored. Landscape 1536 x 1024.
```

**F9 · `w1-whitestone/layer-320`**
```text
Layer at 320 metres: very distant white limestone karst islands rising from a calm sea, tall rounded towers of rock in pale blue-grey haze, two or three faint layers. The top line of the islands stays between 35% and 65% from the top of the image, and the sea horizon meets both side edges at exactly 60% from the top. Above the island line the image is the flat background colour. Below, the calm sea fades into a flat pale warm haze that is solid from 80% down to the bottom edge.
```

**F10 · `w1-whitestone/layer-220`**
```text
Layer at 220 metres: nearer limestone karst islands with steep white-grey cliffs and green caps of scrub, warm golden light on their faces, calm sea between them, light haze. The top line of the islands stays between 35% and 65% from the top of the image, and the sea horizon meets both side edges at exactly 62% from the top. Above the island line the image is the flat background colour. Below, the sea fades into a flat warm haze that is solid from 80% down to the bottom edge.
```

**F11 · `w1-whitestone/layer-140-a`**
```text
Layer at 140 metres: a low rocky headland with silver-green olive groves and white limestone rocks along the shore, and near the centre three small fishing boats with square sails resting on calm water. The land line stays between 45% and 70% from the top of the image, and meets both side edges at exactly 66% from the top. Above the land line the image is the flat background colour. Below, the shore fades into a flat warm haze that is solid from 85% down to the bottom edge.
```

**F12 · `w1-whitestone/layer-140-b`**
```text
Layer at 140 metres: a low rocky headland with silver-green olive groves and white limestone rocks along the shore, no boats, no buildings. The land line stays between 45% and 70% from the top of the image, and meets both side edges at exactly 66% from the top. Above the land line the image is the flat background colour. Below, the shore fades into a flat warm haze that is solid from 85% down to the bottom edge.
```

**F13 · `w1-rootwood/sky-a`**
```text
Sky band of a 360-degree backdrop for a 3D game, a humid rainforest morning at 10:30: a bright hazy blue-white sky, towering soft cumulus clouds, and a few broad soft sunbeams slanting down from behind a cloud near the centre; the bottom 20% fades into a flat pale green-grey haze. No land, no trees, no birds, no sun disc. Soft even light. The left 8% and right 8% are calm hazy sky with the same colour at every height on both sides, and no cloud or sunbeam touches the left or right edge, so tiles join side by side and when mirrored. Landscape 1536 x 1024.
```

**F14 · `w1-rootwood/sky-b`**
```text
Sky band of a 360-degree backdrop for a 3D game, a humid rainforest morning at 10:30: a bright hazy blue-white sky with towering soft cumulus clouds of different sizes, no sunbeams; the bottom 20% fades into a flat pale green-grey haze. No land, no trees, no birds, no sun disc. Soft even light. The left 8% and right 8% are calm hazy sky with the same colour at every height on both sides, and no cloud touches the left or right edge, so tiles join side by side and when mirrored. Landscape 1536 x 1024.
```

**F15 · `w1-rootwood/layer-320`**
```text
Layer at 320 metres: very distant misty jungle ridges in soft blue-green, rounded and layered, thick white mist in the valleys between them. The ridge line stays between 35% and 60% from the top of the image, and meets both side edges at exactly 58% from the top. Above the ridge line the image is the flat background colour. Below, the ridges fade into a flat pale blue-green haze that is solid from 80% down to the bottom edge.
```

**F16 · `w1-rootwood/layer-220`**
```text
Layer at 220 metres: layered ridges covered in deep green jungle, mist in the valleys, one thin distant waterfall falling from a cliff as a solid painted ribbon. The ridge line stays between 35% and 65% from the top of the image, and meets both side edges at exactly 60% from the top. Above the ridge line the image is the flat background colour. Below, the ridges fade into a flat green haze that is solid from 80% down to the bottom edge.
```

**F17 · `w1-rootwood/layer-140-a`**
```text
Layer at 140 metres: rolling hills of dense rainforest canopy, round crowns packed together, and near the centre two or three giant emergent trees rising high above the canopy with broad flat crowns. The canopy line stays between 40% and 65% from the top of the image, and meets both side edges at exactly 64% from the top. Above the canopy line the image is the flat background colour. Below, the canopy fades into a flat deep green haze that is solid from 85% down to the bottom edge.
```

**F18 · `w1-rootwood/layer-140-b`**
```text
Layer at 140 metres: gently rolling hills of dense rainforest canopy, round crowns packed together, no emergent trees, no buildings. The canopy line stays between 40% and 65% from the top of the image, and meets both side edges at exactly 64% from the top. Above the canopy line the image is the flat background colour. Below, the canopy fades into a flat deep green haze that is solid from 85% down to the bottom edge.
```

## 7. Chân dung đủ (C9–C22)

- Cách ghép: STYLE + PORTRAIT + LOOK (nếu ô ghi) + phần riêng + dòng nền.
- Dáng, màu, đồ chép từ file Tripo: Lam (`01-tripo-characters-enemies.md`, P7), Mộc Tinh (P17); Tre (VS1), Chuồn Chuồn Tre (VS2), thân thợ chung, bảng màu áo và bộ gắn K01–K24 (VS5), Đại Bàng Tinh (VS11), trâu Mộng (VS12) ở `01-tripo-characters-enemies-vs.md` (đối chiếu lại ngày 22/10). Có ảnh Tripo (`art-src/td/heroes/`, `workers/`, `bosses/`, `animals/`) thì đính kèm và thêm dòng REF. Khi file 01 và file này khác nhau, theo file 01.
- Lam được có lửa trong chân dung (23.11: ảnh có lửa dùng cho chân dung). Mộc Tinh, Đại Bàng Tinh được có vệt Mực Câm, vì trong game shader vẽ vệt này lên model (22.7).
- Tự quyết: id tổ thợ là `crew-<id nhà>`. Tổ có 2–3 người thì vẽ chung một ảnh, mặt vẫn to. Biểu cảm theo tính cách ở 22.4.
- C17 nền M vì bó mạ xanh (K17). C21 nền B: tán lá xanh cùng vệt mực tím đen, mà tím gần màu khóa hồng.

| Mã | id | Ai | Nền | Lưu |
|---|---|---|---|---|
| C9 | `lam` | Lam, Tướng chạy nhanh | G | `art-src/td/portraits/lam.png` |
| C10 | `tre` | Tre, Tướng thợ | M | `art-src/td/portraits/tre.png` |
| C11 | `crew-keep` | Lão Gác Cổng (Lũy Chữ) | G | `art-src/td/portraits/crew-keep.png` |
| C12 | `crew-archer` | Chị Én và Em Sẻ (Tháp Cung) | G | `art-src/td/portraits/crew-archer.png` |
| C13 | `crew-cannon` | Bác Đồng và cậu Lửa (Tháp Pháo) | M | `art-src/td/portraits/crew-cannon.png` |
| C14 | `crew-scribe` | Thầy Đồ Mực (Tháp Thư Pháp) | G | `art-src/td/portraits/crew-scribe.png` |
| C15 | `crew-barracks` | Đội trưởng Sấm (Trại Lính) | G | `art-src/td/portraits/crew-barracks.png` |
| C16 | `crew-gold-mine` | Ba anh em thợ mỏ (Mỏ Vàng) | G | `art-src/td/portraits/crew-gold-mine.png` |
| C17 | `crew-farm` | Cô Mạ và trâu Mộng (Ruộng Lúa) | M | `art-src/td/portraits/crew-farm.png` |
| C18 | `crew-lumber` | Chú Tiều (Trại Gỗ) | G | `art-src/td/portraits/crew-lumber.png` |
| C19 | `crew-seal-dais` | Trò Mực (Đài Ấn) | G | `art-src/td/portraits/crew-seal-dais.png` |
| C20 | `crew-infirmary` | Bà Lang Thơm (Nhà Thuốc) | M | `art-src/td/portraits/crew-infirmary.png` |
| C21 | `moc-tinh` | Mộc Tinh, boss bản đồ 1 và 3 | B | `art-src/td/portraits/moc-tinh.png` |
| C22 | `dai-bang-tinh` | Đại Bàng Tinh, boss bản đồ 2 | G | `art-src/td/portraits/dai-bang-tinh.png` |

**LOOK-LAM** (chép từ file 01, P7; thêm lửa cho chân dung)
```text
Lam, the Azureflame Courier: a young cat warrior of the fire-cat folk who carries letters, chibi about 2.5 heads tall, the head about 40 percent of the total height. A white face and white muzzle with a black fur mask across the eyes like a little bandit mask, very big bright blue eyes, a small pink nose; two tall pointed black cat ears with cobalt-blue (#2F6BFF) tips. A fantasy techwear courier jacket of quilted navy-black fabric in big puffy panels with thin cobalt-blue rune lines along the seams and cuffs; the hood up and fitted, the ears standing up through two openings, a small embroidered winged-envelope badge on the front of the hood; two dark leather straps crossing the chest in an X with a round cobalt buckle; a chunky mail satchel on the right hip; a fat letter tube strapped diagonally across the back, its round cap above the left shoulder; fingerless navy gloves with white fur fingers and short blunt claws; slim dark trousers and thick-soled navy running shoes with white soles and cobalt laces; a long, thick black cat tail with a cobalt-blue tip. Matte vinyl-toy surface. Blue flames with white edges flicker around the shoulders, the tail tip and the ear tips.
```

**LOOK-TRE** (chép từ file 01-vs, VS1, VS2)
```text
Tre, the Bamboo Wright: a 15-year-old village carpenter girl, chibi about 2.5 heads tall, practical and cheeky. Dark hair in a round bun on top with a bamboo pencil pushed through it; a checked scarf in bamboo green (#A8D05A) and cream tied around the neck with a short knot; a brown collarless traditional blouse with the sleeves rolled up to the elbows; a dark leather work apron with three big pockets; wide dark trousers; wooden clogs; a bamboo backpack basket with a folded bamboo crane arm strapped along its side. Her big carpenter's mallet has a fat barrel-shaped hardwood head bound with two dark iron rings and a leather grip; her bamboo slingshot is a thick Y-shaped tan bamboo fork with a wide flat leather band. Beside her flies her bamboo dragonfly: a small round bamboo head with two big round painted eyes, a short thick bamboo body with three darker bands, two long wide flat bamboo wings with rounded tips and one bamboo-green stripe each.
```

**LOOK-WORKER** (thân thợ chung, chép từ file 01-vs, VS5a; dùng cho C11–C20)
```text
A small Van Dien village worker, chibi about 2.25 heads tall, a round friendly face; a plain collarless work tunic with short sleeves (undyed cream unless a colour is given below), a brown cloth belt, knee-length brown trousers, bare forearms, simple straw sandals. Children in the crew are a little smaller.
```

- Màu áo, đồ đầu, đồ nghề của từng tổ chép từ bảng màu áo và bộ gắn K01–K24 ở file 01-vs, mục 5.

| Mã | Phần riêng |
|---|---|
| C9 | `LOOK-LAM. Framing: head and upper body. Expression: cocky and kind, a big grin, one fist raised, the blue flames bright and clean.` |
| C10 | `LOOK-TRE. Framing: head and upper body. Expression: practical and mischievous, a sly grin, the mallet resting on her shoulder, the bamboo dragonfly near her cheek.` |
| C11 | `LOOK-WORKER. The old gatekeeper of the Bastion, wearing a brown quilted cotton tunic: a small round iron helmet, silver side hair joining a long full silver beard and moustache, bushy white eyebrows under the helmet rim; holding a huge old wooden crossbow with thick solid bow arms, a chunky stock with iron fittings and a thick rope string, no bolt loaded; stern but kind, one eyebrow raised. Framing: head and upper body.` |
| C12 | `LOOK-WORKER, two of them side by side. The elder sister archer, Swallow, in a navy tunic with white trim: dark hair in two round buns on top, each tied with a stiff navy ribbon cut like a swallow's forked tail, holding a short village bow of bamboo and horn with a cord-wrapped grip. Her little brother, Sparrow, a little smaller, in a brown tunic: short round brown hair with one messy tuft sticking up at the back like a sparrow's crest (no hat), a small round bamboo quiver of arrows on the back, puffed cheeks. The two are mid-argument, both faces large and clear. Framing: heads and upper bodies.` |
| C13 | `LOOK-WORKER, two of them. The grumpy old cannoneer, Uncle Bronze, in a smoky grey-brown tunic: short grey hair with round bronze goggles pushed up on the forehead, grey sideburns joining a thick grey moustache, holding a cannon rammer with a fat round swab head of dark wool. Beside him his eager young helper, Ember, a little smaller, in the undyed cream tunic: short spiky dark hair in a few big chunky spikes, a knotted rust-brown cloth headband with two short stiff tails, hugging a round iron cannonball with one bold turquoise stripe and a small iron loop on top. Framing: heads and upper bodies, the old man in front.` |
| C14 | `LOOK-WORKER. The old ink teacher, in a deep ink-blue tunic: a soft black scholar's hat, a thin tapered white goatee and a solid white moustache, raising a big calligraphy brush (a straight bamboo handle with two nodes, a small cream cord ring at the top end, a solid ink-black pointed teardrop tip) in a dramatic flourish, as if reciting a poem, eyes half closed. Framing: head and upper body.` |
| C15 | `LOOK-WORKER. Captain Thunder of the village militia, in a brown tunic under a vest of small lacquered bamboo plates laced together in rows: a deep blue cloth headband knotted at the back with two short stiff tails, dark sideburns joining a big black moustache, one big thick wooden drumstick with a round padded leather head in each hand, shouting loudly. Framing: head and upper body.` |
| C16 | `LOOK-WORKER, three brothers in a row of slightly different heights, in dusty brown tunics: each wears a soft brown cloth cap with a small unlit brass oil lamp fixed at the front (no flame, no light) and carries a sturdy pickaxe with a curved iron head on the shoulder; dusty cheerful faces, all three singing a work chant with mouths wide open. Framing: heads and upper bodies, all three faces large and clear.` |
| C17 | `LOOK-WORKER. Miss Seedling, a cheerful young rice farmer in a brown tunic: a straw-coloured conical palm-leaf hat with a cream chin tie over a long dark braid, holding a bundle of young green rice seedlings tied with a straw band, a small clump of brown roots at its bottom. Beside her, the gentle water buffalo Mong, chibi and sturdy: soft slate-grey hide, a lighter cream chin, two wide thick crescent horns sweeping back, a small white flower tucked behind one horn, small calm eyes, a broad pale muzzle, a woven straw saddle pad on its back. Framing: her head and upper body with the buffalo's head beside her.` |
| C18 | `LOOK-WORKER. Uncle Woodcutter, burly and calm, in the undyed cream tunic: a brown-and-cream checked headscarf knotted at the back with one short stiff tail, a short black beard, a woodcutter's axe with a broad iron head over his shoulder, a slow easy smile. Framing: head and upper body.` |
| C19 | `LOOK-WORKER, a child. Ink Pupil, a shy young student in a grey-blue tunic: neat short dark hair with a small top-knot tied with a grey-blue cloth band (no hat), holding a blank rolled paper scroll with round wooden end knobs tied with one thick cord band, one finger raised to his lips as if whispering. Framing: head and upper body.` |
| C20 | `LOOK-WORKER. Granny Fragrant, a kind old village herbalist in a brown tunic: soft grey hair combed back into a round bun held by one short thick wooden hairpin (no headscarf), round cheeks, a small woven herb basket with a thick handle, full of fresh green herbs in a few big solid bunches, on her arm. Framing: head and upper body.` |
| C21 | `Moc Tinh, the Nameless Banyan, a huge ancient banyan tree spirit (a tree goblin, not a god), massive and chunky, not chibi: smooth silver-grey banyan bark with deep vertical folds; long heavy arms of thick braided aerial roots; a broad old face carved into the upper trunk with a heavy brow ridge, a long sad mouth and deep-set amber eyes; a dark knot-hole cavity in the middle of the chest with violet-black living ink oozing out of it; a wide mane-like crown of six or seven huge rounded leaf masses, deep green with lighter yellow-green tops, with a few clusters of small round amber-brown figs. Calm, sorrowful, ancient. Framing: head, crown and chest.` |
| C22 | `Dai Bang Tinh, the Storm Eagle, a giant greedy eagle (a monster, not a god), majestic and menacing but storybook-friendly, not chibi: dark umber-brown feathers with a copper sheen along the feather edges, grouped into large overlapping plates; a big hooked ivory beak; fierce golden-brown eyes; violet-black living ink stains spreading over its wings; a heavy necklace of big seashells and old bronze coins (bronze, not bright gold) on a thick cord resting on its chest. Beak half open. Framing: head, neck, chest and the tops of the raised wings.` |

Với C9–C20: chữ `LOOK-LAM`, `LOOK-TRE` hay `LOOK-WORKER` ở đầu ô nghĩa là dán khối LOOK đó vào chỗ này. Trẻ con trong tổ thợ (Em Sẻ, cậu Lửa, Trò Mực) nhỏ hơn một chút, như file 01-vs.

## 8. Ảnh trượt Tối Thượng (C23–C25)

- 23.8: chân dung 2D trượt vào từ mép trái 0,6 s, cao ≤ 30 % màn hình, dải nền màu Tướng. Không dừng hình, không di chuyển camera.
- Tự quyết: ảnh vẽ luôn dải nền màu Tướng, không tách nền. Lửa và hào quang mà tách khóa màu sẽ lem viền. Game cắt mép chéo bằng mặt nạ.
- Cách ghép: STYLE + SLIDE-IN + LOOK của Tướng + phần riêng. Không dòng nền.
- Màu Tướng (22.2): Draconis cam đào `#F2994A`, Lam cobalt `#2F6BFF`, Tre lục tre `#A8D05A`.
- Tự quyết (22/10, đổi được): C23 và tranh truyện T1, T2 dùng LOOK-DRACONIS (dáng ảnh 3.png, file chính mục 7). Muốn dáng đỏ của model tạm v2 thì AI viết lại các prompt này.
- Tự quyết: game cắt ảnh thành dải ngang (khoảng 3 : 1, cao ≤ 30 % màn hình), nên mặt, tay và đòn chính nằm trong nửa giữa chiều cao ảnh.

| Mã | id | Tối Thượng | Lưu |
|---|---|---|---|
| C23 | `draconis-ult` | Mưa Lông Lửa | `art-src/td/portraits/draconis-ult.png` |
| C24 | `lam-ult` | Hỏa Tốc | `art-src/td/portraits/lam-ult.png` |
| C25 | `tre-ult` | Giàn Giáo Thần Tốc | `art-src/td/portraits/tre-ult.png` |

| Mã | Phần riêng |
|---|---|
| C23 | `Ultimate "Rain of Fire Feathers": Draconis rising with wings spread wide, scattering a rain of glowing fire feathers downward and to the right. Hero colour band: peach orange (#F2994A).` |
| C24 | `Ultimate "Express Fire": Lam dashing to the right inside a blue comet streak, a trail of blue fire behind, the satchel flying. Hero colour band: cobalt blue (#2F6BFF).` |
| C25 | `Ultimate "Lightning Scaffold": Tre leaping to the right with her mallet raised while bamboo scaffold poles snap into place around a rising house frame. Hero colour band: bamboo green (#A8D05A).` |

## 9. Tranh truyện (T1–T6)

- 23.13 (bậc C3): mỗi chương 3–6 tranh 16 : 9, phụ đề và giọng kể do game thêm. VS làm 2 tranh mỗi Tướng (27.2).
- Tự quyết: tranh 1 là xuất thân và động cơ, tranh 2 là cung truyện của Tướng (22.2). Cảnh cụ thể là tự chọn.
- Tự quyết: tạo 1536 × 1024 (khổ 3 : 2); game cắt thành 16 : 9 (1536 × 864), tức bỏ khoảng 8 % trên và 8 % dưới.
- Cách ghép: STYLE + STORY + LOOK của Tướng chính + phần riêng. Không dòng nền. Có chân dung Tướng thì đính kèm và thêm REF.
- Không chữ trong tranh: phong bì, sổ, bảng đều để trống hoặc chỉ có nét mờ.

| Mã | Tướng | Tranh | Lưu |
|---|---|---|---|
| T1 | Draconis | 1 · chòm sao bị mực nuốt | `art-src/td/story/draconis/1.png` |
| T2 | Draconis | 2 · đậu mái kho lúa giữ làng | `art-src/td/story/draconis/2.png` |
| T3 | Lam | 1 · lá thư chưa gửi của bà | `art-src/td/story/lam/1.png` |
| T4 | Lam | 2 · lửa chuyển từ cam khói sang xanh | `art-src/td/story/lam/2.png` |
| T5 | Tre | 1 · cầu sập, bố kẹt bên kia sông | `art-src/td/story/tre/1.png` |
| T6 | Tre | 2 · cả làng cùng dựng cầu | `art-src/td/story/tre/2.png` |

**T1**
```text
Scene: high in a deep blue night sky full of stars, Draconis, guardian of the Star Sea, hovers with wings spread, staring in sorrow and anger as a river of violet-black living ink swallows the stars of one constellation, leaving dark empty gaps; a faint glowing tear in the sky shows in the distance.
```

**T2**
```text
Scene: dawn in the green valley; Draconis, who once scoffed at small houses and small fields, now perches proudly on the roof of a little rice barn to guard it; villagers cheer below; terraced rice fields, a silver waterfall and a soft rainbow behind.
```

**T3**
```text
Scene: a cosy attic room lit by a warm lamp; young Lam sits on the floor holding grandmother's old unsent letter; the place for the recipient's name on the envelope is a blank faded smudge with no readable writing; a mail satchel nearby and grandmother's old courier cap hanging on a hook; quiet and tender.
```

**T4**
```text
Scene: Lam sprints along a winding valley road at full speed, the letters safe in the satchel; the flames on the shoulders and tail change from smoky orange at the back to bright clean blue at the front as Lam focuses, eyes sharp and calm; terraced fields streak past.
```

**T5**
```text
Scene: a collapsed bamboo bridge over a wide river; on the far bank, Tre's father waves both arms; on the near bank, Tre clutches her father's blueprint notebook, half of its pages blank and faded; worried but determined.
```

**T6**
```text
Scene: Tre and the villagers raise a new bamboo bridge together over the river, many hands on ropes and beams; Tre smiles as she lets others help, her bamboo dragonfly buzzing above; warm afternoon light.
```

## 10. Atlas cảnh Neon (`meadow-neon`, N1–N12)

- 23.12: Neon cần atlas cảnh riêng, vì viền mực và cách tô đã nướng vào tranh sách tranh. VS dựng bản đồ 1 với StylePack Neon để kiểm việc đổi bộ (26.2 bước 5).
- Cách ghép: NEON (thay STYLE) + SCENERY + phần riêng S1–S12 ở file chính + NEON-RECOLOUR (mục 1.9) + một dòng biến thể + nền G.
- Tự quyết: 12 loại như bản đồ 1; không làm S13 (gốc cây tô màu được). 4 biến thể theo 23.10. Làm v1, v2 trước để kiểm; đạt thì làm v3, v4.
- Tự quyết: bản đồ thử dùng lại phông xa bản đồ 1, StylePack đổi màu. Lệch quá thì làm phông Neon ở lượt sau.
- Lưu `art-src/td/scenery/meadow-neon/<id>-v<n>.png`, id giữ như S1–S12.

| Mã | id | Phần riêng lấy từ | Khổ | Nền | Lưu (v1) |
|---|---|---|---|---|---|
| N1 | `almond-tree` | S1 | 1024×1536 | G | `art-src/td/scenery/meadow-neon/almond-tree-v1.png` |
| N2 | `mountain-pine` | S2 | 1024×1536 | G | `art-src/td/scenery/meadow-neon/mountain-pine-v1.png` |
| N3 | `bamboo-clump` | S3 | 1024×1536 | G | `art-src/td/scenery/meadow-neon/bamboo-clump-v1.png` |
| N4 | `raspberry-bush` | S4 | 1024×1024 | G | `art-src/td/scenery/meadow-neon/raspberry-bush-v1.png` |
| N5 | `tall-grass` | S5 | 1024×1024 | G | `art-src/td/scenery/meadow-neon/tall-grass-v1.png` |
| N6 | `reed-clump` | S6 | 1024×1536 | G | `art-src/td/scenery/meadow-neon/reed-clump-v1.png` |
| N7 | `wildflowers` | S7 | 1024×1024 | G | `art-src/td/scenery/meadow-neon/wildflowers-v1.png` |
| N8 | `fern` | S8 | 1024×1024 | G | `art-src/td/scenery/meadow-neon/fern-v1.png` |
| N9 | `rock-small` | S9 | 1024×1024 | G | `art-src/td/scenery/meadow-neon/rock-small-v1.png` |
| N10 | `rock-medium` | S10 | 1536×1024 | G | `art-src/td/scenery/meadow-neon/rock-medium-v1.png` |
| N11 | `rotten-log` | S11 | 1536×1024 | G | `art-src/td/scenery/meadow-neon/rotten-log-v1.png` |
| N12 | `canopy-block` | S12 | 1536×1024 | G | `art-src/td/scenery/meadow-neon/canopy-block-v1.png` |

Dòng NEON-RECOLOUR bắt lá, rêu, quả trong phần riêng S1–S12 thành màu đêm có mạch sáng, không còn xanh lá. Vì vậy mọi ảnh Neon dùng nền G. Ảnh Neon nào còn sót màu xanh lá thì làm lại, vì nền G sẽ xóa mất phần đó.

## 11. Thú nền (A1–A4)

- Thêm vào VS: 23.10 có cột thú nền 2D (cò, hải âu, đom đóm, bướm); 22.9 ghi đàn cò (bản đồ 1), hải âu (bản đồ 2), đom đóm và bướm (bản đồ 3).
- Cách ghép A1, A2, A4: STYLE + VFX + phần riêng + FAUNA (mục 1.6) + dòng nền. A3 (đom đóm, cộng màu): STYLE + VFX + phần riêng + nền K, không FAUNA. Lưới 4 × 4, 16 khung lặp liền (khung 16 nối về khung 1).
- Game cho bay theo đàn, đổi cỡ, lật hướng.
- Lưu ở `art-src/td/fauna/` (file chính, mục 2), không lưu ở `animals/` của ảnh gửi Tripo.

| Mã | id | Là gì · bản đồ | Nền | Lưu |
|---|---|---|---|---|
| A1 | `egret` | Cò trắng bay · bản đồ 1 | G | `art-src/td/fauna/egret.png` |
| A2 | `gull` | Hải âu bay · bản đồ 2 | G | `art-src/td/fauna/gull.png` |
| A3 | `firefly` | Đom đóm nhấp nháy · bản đồ 3, đợt boss | K | `art-src/td/fauna/firefly.png` |
| A4 | `butterfly` | Bướm vỗ cánh · bản đồ 3 | G | `art-src/td/fauna/butterfly.png` |

| Mã | Phần riêng |
|---|---|
| A1 | `FLIPBOOK: 16 frames of one white egret flying to the right in a seamless loop, seen from the side: neck folded into an S, long dark legs trailing, broad white wings going through one full flap cycle; chunky simple shapes.` |
| A2 | `FLIPBOOK: 16 frames of one seagull flying to the right in a seamless loop, seen from the side: grey back, white body, black wing tips, yellow beak, one full flap-and-glide cycle; chunky simple shapes.` |
| A3 | `FLIPBOOK: 16 frames of one firefly in a seamless loop, seen from the side: a tiny dark beetle body with a round tail light that pulses from off to bright warm yellow-green and back. Additive effect: bright glowing shapes, soft edges, no outline.` |
| A4 | `FLIPBOOK: 16 frames of one butterfly in a seamless loop, seen from slightly above: bright blue wings with black edges and small white dots going through one full flap cycle, a slim dark body.` |

## 12. Icon nhà VS (U29–U31)

- Thêm vào VS: ba nhà này vào game ở VS (11.1, 26.2 bước 5). Icon cùng bộ với U1–U7 của file chính.
- Cách ghép: STYLE + ICON + phần riêng + dòng nền. Cờ đuôi nheo màu họ nhà ở góc sau trái, như mục 9.1 file chính.
- Dáng theo ảnh Tripo cấp 1 ở `02-tripo-buildings-props-vs.md` (V1–V3). Có ảnh `art-src/td/buildings/<id>.png` thì đính kèm và thêm dòng BUILDREF.
- Tự quyết: thảo dược trên icon Nhà Thuốc vẽ màu khô (nâu, vàng), dù model có lá tươi. Lá xanh buộc dùng nền M, mà nền M dễ ăn mất cờ tím nhạt.

| Mã | id | Nhà | Nền | Lưu |
|---|---|---|---|---|
| U29 | `scribe` | Tháp Thư Pháp | G | `art-src/td/ui/buildings/scribe.png` |
| U30 | `lumber` | Trại Gỗ | M | `art-src/td/ui/buildings/lumber.png` |
| U31 | `infirmary` | Nhà Thuốc | G | `art-src/td/ui/buildings/infirmary.png` |

| Mã | Phần riêng |
|---|---|
| U29 | `Icon of the Scribe Tower, a scholar's two-storey study tower, not a pagoda: a ground floor of vermilion-red lacquered timber with round paper windows under a terracotta porch roof; a smaller upper writing room with cream paper windows under a gently curved terracotta roof; a big black inkstone on the upper balcony with a giant calligraphy brush resting in a wooden rack, its solid black tip pointing forward and up; a small deep pink pennant (#D9479B) at the back left.` |
| U30 | `Icon of the Lumber Camp: an open-sided timber shed under a broad wheat-gold thatched roof; a big log on a sawhorse with a broad two-man saw half sunk into it; a neat stack of round logs with pale ringed ends; a stump with a chunky axe in it; a small green pennant (#49AE45) at the back left.` |
| U31 | `Icon of the Infirmary: a cosy round cottage of warm ochre rammed earth under a thick rounded wheat-gold straw roof, a small front porch; a golden-tan bamboo drying rack hung with bundles of dried herbs in brown and gold; a big round clay medicine pot on a small clay stove with one curl of white steam; a small lavender pennant (#8F72E8) at the back left.` |

## 13. Kiểm tra thêm cho VS

- Cảnh, phông, chân dung, icon: kiểm như mục 12 file chính.
- S30: 8 hướng cùng cỡ, cùng chỗ chân, đúng thứ tự xoay; mái, thang, dây leo ở đúng phía.
- Ảnh trượt: nhân vật nằm ở 60 % bên trái, quay sang phải; mặt, tay, đòn chính nằm trong nửa giữa chiều cao; dải màu phủ kín ảnh.
- Tranh truyện: không chữ, không bong bóng thoại; phần quan trọng nằm trong dải giữa (bỏ được 8 % trên và 8 % dưới).
- Neon: không xanh lá, không xanh ngọc; mạch sáng nằm trên mặt vật, không tỏa ra nền.
- Thú nền: đúng 16 khung, khung 16 nối liền khung 1.
- Tổ thợ: đúng thân thợ chung, màu áo và bộ gắn K01–K24 của file 01-vs (mũ, râu, đồ nghề). So với ảnh mẫu thợ nếu đã có.
- Cảnh tranh truyện là tự chọn. Chủ dự án duyệt T1 trước khi làm các tranh còn lại.
