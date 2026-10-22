# Prompt ảnh 2D cho Tripo: Tướng, Trợ Thủ, lính, quái, boss — Typing Defense (22/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh bằng ChatGPT, dựng model bằng Tripo); ChatGPT (đọc file này rồi tạo ảnh); AI ghép file sau đó (Blender, manifest).
> **Lấy từ:** `docs/td/TYPING_DEFENSE_DESIGN.md` mục 0.6 (tên, id), 8.4 và 8.8 (Trợ Thủ), 22.1–22.4, 22.6, 22.7, 22.10 (nội dung Thế giới 1), 23.1–23.3 và 23.7–23.11 (phong cách, cỡ, màu, người trợ lực, clip, socket, luật ảnh gửi Tripo), 25.12 (hiệu năng), 26.1 (bước 1B, 1C), 27.2–27.4 (bậc P / VS / Sau, rủi ro), 28 (mặc định).
> **Bước đang làm:** `docs/td/BUILD_NOW.md` (1A, bản đồ 2D, chưa dùng model). Model trong file này dùng từ 1B và 1C.
> **File liên quan:** bậc VS ở [`01-tripo-characters-enemies-vs.md`](01-tripo-characters-enemies-vs.md). Nhà, đồ rơi và socket của nhà ở [`02-tripo-buildings-props.md`](02-tripo-buildings-props.md). Ảnh 2D không gửi Tripo (chân dung, ảnh trượt Tối Thượng, Ma Trơi, cảnh vật) ở [`03-2d-scenery-ui-vfx.md`](03-2d-scenery-ui-vfx.md) và [`03-2d-scenery-ui-vfx-vs.md`](03-2d-scenery-ui-vfx-vs.md). Mục lục và bảng việc của cả bộ: [`README.md`](README.md).

```text
Instructions for ChatGPT
- You make source images that the owner uploads to an image-to-3D tool (Tripo).
- Every image in this file has a code (P1, P2a, ...), an exact file name, a size and a
  recipe line "Ghép: ...". Build the prompt by joining, in this order: the common block named
  in the recipe (section 3), the item prompt, then the background line named in the recipe
  (BG-G, BG-M or BG-B). Keep every sentence; do not shorten, soften or "improve" them.
- One image per subject: one character, creature or object per image. Never put two views or
  two subjects in one image. Extra views (-side, -back, -front) are separate images built with
  the VIEW lines, with the approved main image of the same item attached as the only reference.
- Use the exact size given. Above each image, write its exact file name so the owner can save
  it under that name.
- No text, letters, numbers, logos or watermarks inside any image. Talismans, slates and
  scrolls stay blank.
- Keep one character identical across its views and kits (colours, proportions, pose, scale).
  For the dressed references (P6), ask the owner to attach helper-owlet.png. For the owlet's
  loose items (P2a, P2b, P3a, P4a, P5a-P5c) that image is only a scale and colour reference:
  draw the object alone, never the owlet.
- For the main image of P18 (Draconis) the owner's reference picture 3.png is recommended. If it
  is not attached, remind the owner once, then work from the text prompt alone.
- Extra views (-side, -back) never use 2.png or 3.png: do not add their reference sentence and do
  not remind the owner about them for an extra view.
- Flat cloth textures (Block T: P2c, P3b, P4b) fill the whole image edge to edge and have no
  background line.
- Before drawing, list the images you will make (code, file name, size) in a short table.
- If anything is unclear or conflicts with this file, ask the owner a short question in
  Vietnamese instead of guessing.
```

## 1. Cách làm

1. Mở cuộc trò chuyện mới với ChatGPT. Gõ, ví dụ: `Trong repo sinhvienaiti/space-typing, nhánh feat/space-typing-2026-10-18, đọc docs/art-requests/td/01-tripo-characters-enemies.md và tạo ảnh cho mục P1–P4.` Luôn ghi tên repo và nhánh: file chưa có ở `main`.
2. ChatGPT ghép prompt: **khối chung** + **prompt riêng** + **dòng nền** (mục 3). Mỗi ảnh một vật.
3. Chọn ảnh đạt danh sách kiểm ở mục 4. Lưu đúng tên, đúng chỗ ghi ở dòng "Ảnh 2D". Thư mục chưa có thì tạo.
4. Tải ảnh lên Tripo theo mục 5. Tải GLB về. Lưu đúng tên ở dòng "Model 3D".
5. Ở thư mục gốc repo `typing-game`: chạy `node games/space-typing/scripts/models/index-3d-sources.mjs`, rồi `pnpm media:push`. Bỏ lệnh đầu thì push từ chối khi có GLB mới.
6. Báo AI. AI chỉnh trong Blender, gắn socket, làm clip, đưa vào game.

**Lưu file.** Ảnh và model nằm trong `art-src/`. Git bỏ qua thư mục này. Bước 5 sao lưu lên Google Drive (xem `docs/MEDIA_STORAGE.md` của repo cha). Không đưa ảnh, tiếng, model lên Git.

**Ảnh mẫu.** Lưu các ảnh mẫu chủ dự án đã gửi vào `art-src/td/refs/`: `2.png` (Lam), `3.png` (Draconis). Git bỏ qua thư mục này, bước 5 sao lưu nó. Nhờ vậy đính kèm được trong ChatGPT, và AI làm sau xem được. P7: đính kèm 2.png là tùy chọn, prompt chữ đã đủ. P18: nên đính kèm 3.png khi làm ảnh chính. Ảnh góc phụ chỉ đính kèm ảnh chính đã duyệt, không đính kèm 2.png, 3.png.

**Đường dẫn.**
- Ảnh 2D gốc: `art-src/td/<loại>/<id>.png`. Loại: `heroes`, `helpers`, `units` (lính), `workers` (thợ), `enemies`, `bosses`, `animals`.
- Model Tripo: cùng đường dẫn, thêm `3d/` sau `art-src/`, đổi đuôi `.glb`. Ví dụ `art-src/td/enemies/troll.png` → `art-src/3d/td/enemies/troll.glb`.
- Ảnh góc phụ nằm cạnh ảnh chính: `<id>-side.png` (nhìn bên trái), `<id>-back.png` (sau lưng), `<id>-front.png` (nhìn thẳng, cho thú). Góc phụ không có GLB riêng.
- TD không dùng ngoại lệ `art-src/3d/heroes/` của Space Typing. Tướng TD theo đúng quy tắc trên.
- Tự quyết: tên thư mục loại như trên (design chỉ ghi `--kind helpers|units|buildings` ở 23.9).

## 2. Danh sách bậc P

**Thứ tự làm:**

| Đợt | Mục | Vì sao |
|---|---|---|
| 1 | P1–P6 (Thư Đồng) | Có từ 1A. Cần cho 1C. |
| 2 | P8, P9, P12 | Lính và 2 quái có model của 1A (Ma Trơi là VFX). |
| 3 | P10, P11, P13–P16 | Quái thêm ở 1B. |
| 4 | P17 (Mộc Tinh) | Boss nhỏ bản đồ 1 (1B). |
| 5 | P18 (Draconis) | Tướng của Thế giới 1, có từ 1A. Model tạm `draconis-v2` chạy tới khi có model này. Làm sau "Đợt đầu" ở `README.md`. |
| 6 | P7 (Lam) | 27.2 ghi "nếu kịp". Lam vào game ngay khi có model (28.3). |

**Bảng tổng.** Cột ảnh bỏ tiền tố `art-src/td/`. Cột model bỏ tiền tố `art-src/3d/td/`.

| Mã | id | Tên · là gì | Ảnh 2D | Model 3D |
|---|---|---|---|---|
| P1 | `helper-owlet` | Thân cú non chung của 3 Thư Đồng | `helpers/helper-owlet.png` (+ `-side`, `-back`) | `helpers/helper-owlet.glb` |
| P2a | `helper-cham-glasses` | Kính tròn to của Chấm | `helpers/helper-cham-glasses.png` | `helpers/helper-cham-glasses.glb` |
| P2b | `helper-cham-scarf` | Khăn tím chấm trắng của Chấm | `helpers/helper-cham-scarf.png` | `helpers/helper-cham-scarf.glb` |
| P2c | `helper-cham-strap` | Vải dây đeo bảng đá của Chấm (texture phẳng, không gửi Tripo) | `helpers/helper-cham-strap.png` | Không có |
| P3a | `helper-phay-tail` | Lông đuôi cong dấu phẩy của Phẩy | `helpers/helper-phay-tail.png` | `helpers/helper-phay-tail.glb` |
| P3b | `helper-phay-strap` | Vải dây đeo bảng đá của Phẩy (texture phẳng, không gửi Tripo) | `helpers/helper-phay-strap.png` | Không có |
| P4a | `helper-gach-wingband` | Băng cánh sọc ngang của Gạch | `helpers/helper-gach-wingband.png` | `helpers/helper-gach-wingband.glb` |
| P4b | `helper-gach-strap` | Vải dây đeo bảng đá của Gạch (texture phẳng, không gửi Tripo) | `helpers/helper-gach-strap.png` | Không có |
| P5a | `helper-brush` | Bút lông cầm tay của Thư Đồng | `helpers/helper-brush.png` | `helpers/helper-brush.glb` |
| P5b | `helper-drum` | Trống con Thư Đồng đánh ở Trại Lính, Lũy | `helpers/helper-drum.png` | `helpers/helper-drum.glb` |
| P5c | `helper-hammer` | Búa con Thư Đồng gõ ở nhà kinh tế | `helpers/helper-hammer.png` | `helpers/helper-hammer.glb` |
| P6a–c | `helper-cham-ref`, `helper-phay-ref`, `helper-gach-ref` | Ảnh mẫu 3 Thư Đồng mặc đủ (không gửi Tripo) | `helpers/helper-<tên>-ref.png` | Không có |
| P7 | `lam` | Tướng Lam, mèo lửa lam đưa thư | `heroes/lam.png` (+ `-side`, `-back`) | `heroes/lam.glb` |
| P18 | `draconis` | Tướng Draconis Phượng Long, model mới theo ảnh 3.png (`draconis-v2` là model tạm) | `heroes/draconis.png` (+ `-side`, `-back`) | `heroes/draconis.glb` |
| P8a | `linh-giao` | Lính Giáo (dân quân cầm giáo) | `units/linh-giao.png` | `units/linh-giao.glb` |
| P8b | `linh-giao-spear` | Cây giáo của Lính Giáo | `units/linh-giao-spear.png` | `units/linh-giao-spear.glb` |
| P9 | `cuong-thi` | Cương Thi, quái bầy nhảy | `enemies/cuong-thi.png` | `enemies/cuong-thi.glb` |
| P10 | `cuong-thi-lead-hat` | Mũ cho Cương Thi Đầu Đàn | `enemies/cuong-thi-lead-hat.png` | `enemies/cuong-thi-lead-hat.glb` |
| P11 | `nuppeppo` | Nuppeppō, khối bột tách đôi | `enemies/nuppeppo.png` | `enemies/nuppeppo.glb` |
| P12 | `thuong-luong` | Thuồng Luồng, rắn sông giáp nặng | `enemies/thuong-luong.png` (+ `-front`) | `enemies/thuong-luong.glb` |
| P13 | `tanuki` | Lửng Tanuki, hồi máu bầy | `enemies/tanuki.png` | `enemies/tanuki.glb` |
| P14 | `troll` | Quỷ Núi Troll, khiên vòm | `enemies/troll.png` (+ `-back`) | `enemies/troll.glb` |
| P15 | `alicanto` | Chim Vàng Alicanto, trộm vàng | `enemies/alicanto.png` (+ `-front`) | `enemies/alicanto.glb` |
| P16 | `mam-go` | Mầm Gỗ, quái bầy do boss gọi | `enemies/mam-go.png` | `enemies/mam-go.glb` |
| — | `ma-troi` | Đàn Ma Trơi: chỉ là VFX | Xem `03-2d-scenery-ui-vfx.md` | — |
| P17 | `moc-tinh` | Boss Mộc Tinh, cây đa thành người | `bosses/moc-tinh.png` (+ `-side`, `-back`) | `bosses/moc-tinh.glb` |

## 3. Khối prompt chung

Mỗi mục ghi dòng "Ghép". Ví dụ "Khối A + prompt + BG-G": dán khối A, rồi prompt của mục, rồi dòng BG-G.

### 3.1 Khối A — nhân vật có khung xương, nhìn thẳng

Dùng cho Tướng, Trợ Thủ, lính, thợ, quái hai chân, boss dạng người (23.11).

```text
[BLOCK A - rigged character, front view]
Image-to-3D source picture of ONE character for a stylized 3D tower-defense game; the model will
be auto-rigged and animated later.
Framing: the whole character from the top of the head (or hat) to the soles of the feet, centred,
with a small even empty margin on every side, nothing cut off.
Camera: straight front view at chest height, near-orthographic, no perspective distortion, no tilt.
Pose: neutral A-pose. Standing straight and facing the viewer, arms straight down and out 30-45
degrees away from the body, elbows almost straight, hands relaxed unless stated, legs straight and
slightly apart, both feet flat on an invisible floor. Seen from the front, a clear gap of empty
background separates each arm from the body from the armpit down, and nothing else (sleeve cloth,
a bag, a tail, a wing, a cape) touches an arm below the shoulder, except an object gripped in the
hand. Neutral calm face (a slight closed-mouth smile is fine), eyes open.
Style: charming storybook fantasy, like a hand-painted matte vinyl toy: chunky rounded shapes, a few
large details instead of many small ones, a bold silhouette that still reads from a high top-down
camera. Matte hand-painted colours, soft shading, no glossy shine.
Light: flat, even and frontal; no cast shadows, no strong highlights, no rim light.
Build rules: hair, fur, feathers, leaves and tassels grouped into a few big solid masses; no thin
strands, wires, strings or gaps; nothing floating, every part touches the body. Clothes, capes,
scarves and robes hang still and close to the body. Symmetrical left and right except where the
prompt says otherwise. Anything held is gripped firmly with closed fingers.
Never draw: outlines or black contour lines, fire, flames, smoke, sparks, particles, glow, aura,
light rays, motion lines, trails, text, letters, numbers, logos, a frame, ground, grass, a floor
shadow, props lying around, a second view or a second character.
```

### 3.2 Khối B — thú bốn chân, rắn, chim: nhìn ngang

```text
[BLOCK B - creature, side view]
Image-to-3D source picture of ONE creature for a stylized 3D tower-defense game; it will be rigged
and animated later.
Framing: the whole creature from nose (or beak) to tail tip, centred, with a small even empty
margin on every side, nothing cut off.
Camera: exact side view of the creature's left side, head pointing to the left edge of the image,
camera at body height, near-orthographic, no perspective distortion. In this side view the far
wing stays hidden behind the near one; do not offset it or turn the body to show it.
Pose: neutral and calm. Legs straight and all visible, feet flat on an invisible floor; wings (if
any) raised and half spread, neither folded nor fully stretched, not covering the body; tail held
out and curled slightly to one side, clear of the legs. Eyes open, mouth closed.
Style: charming storybook fantasy, like a hand-painted matte vinyl toy: chunky rounded shapes, a few
large details, a bold silhouette that still reads from a high top-down camera. Matte hand-painted
colours, soft shading, no glossy shine.
Light: flat, even and frontal; no cast shadows, no strong highlights, no rim light.
Build rules: fur, feathers, fins and manes grouped into a few big solid masses; no thin strands,
wires or gaps; nothing floating, every part touches the body.
Never draw: outlines or black contour lines, fire, flames, smoke, sparks, particles, glow, aura,
water splashes, motion lines, trails, text, letters, logos, a frame, ground, grass, a floor shadow,
props, a second view or a second creature.
```

### 3.3 Khối C — món gắn rời (bộ gắn, vũ khí, đồ cầm)

```text
[BLOCK C - loose prop for a 3D socket]
Image-to-3D source picture of ONE small object that a game character wears or holds; it will be
attached to the character in Blender.
Framing: the whole object, centred, with a small even empty margin, nothing cut off.
Camera: three-quarter view from the front and about 25 degrees above, near-orthographic, no
perspective distortion (unless the prompt asks for a flat side view).
Object: solid, chunky and a little thicker than real life, one connected piece with every part
touching; no thin wires, strings or gaps. Nobody wears or holds it: no hands, no body, no
mannequin, no stand. If a picture of a character is attached, use it only to match scale,
colours and style, and draw the object alone.
Style: charming storybook fantasy, matte hand-painted colours like a painted vinyl toy, soft shading.
Light: flat, even and frontal; no cast shadows, no strong highlights, no rim light.
Never draw: outlines, fire, flames, smoke, sparks, particles, glow, aura, motion lines, text,
letters, logos, a frame, ground, a shadow, a second object.
```

### 3.4 Khối R và khối T — ảnh không gửi Tripo

Khối R: ảnh mẫu Thư Đồng mặc đủ (P6).

```text
[BLOCK R - dressed reference, not for 3D]
Reference picture of ONE character for checking a design; it is not sent to the 3D tool.
Use the attached base image (helper-owlet.png) as the exact base: the same owlet, the same pose
with wings half open, the same proportions, the same straight front near-orthographic camera, the
same framing and size in the frame, the same colours and the same matte storybook vinyl-toy style.
Add only the items listed below, fitted snugly to the body. Flat even frontal light, no cast shadows.
Never draw: outlines, fire, glow, particles, motion lines, text, letters, logos, ground, a floor
shadow, a second view or a second character.
```

Khối T: vải phẳng có hoa văn (P2c, P3b, P4b). Blender phủ lên dây đeo bảng đá. Không có dòng nền, vì hoa văn phủ kín ảnh.

```text
[BLOCK T - flat cloth texture, not for 3D]
A flat, seamless, tileable texture swatch of woven cloth for a game character's strap, seen
straight on with no perspective, filling the whole image edge to edge; the pattern repeats cleanly
on all four sides. Matte hand-painted storybook style, soft and even, no lighting direction, no
shadows, no folds, no wrinkles, no border, no seams, no text, no letters, no logos.
```

### 3.5 Góc phụ

Góc phụ là ảnh riêng. Ghép: khối của mục + dòng VIEW + prompt của mục + dòng nền. Khi tạo, chỉ đính kèm ảnh chính đã duyệt của mục đó. Không đính kèm ảnh mẫu 2.png, 3.png, không thêm câu ảnh mẫu. Dòng VIEW thay dòng "Camera" và chữ "facing the viewer" của khối; VIEW FRONT thay cả dòng "Framing". Chữ trái, phải trong prompt của mục tả ảnh chính; dòng VIEW nói cách đổi.

```text
[VIEW SIDE] This is an extra view of the same character as the attached front image (the
approved main image of this item, not a reference picture): identical design, colours,
proportions, pose and scale. This line replaces the camera line and the words "facing the viewer"
above: exact left-side profile, the whole character, head included, faces the left edge of the
image; camera at chest height, near-orthographic. Arms and wings stay exactly where they are in
the front image and are only seen from the side: arms that angle out to the sides look as if they
hang straight down beside the body; wings that spread to the left and right point toward and away
from the camera, so the near wing shows only its edge and hides the far wing. Do not swing arms or
wings forward or back, and do not turn a wing to show its flat face. Left and right in the prompt
below (such as "the viewer's right") describe the front image: keep every part on the same side of
the character's own body; parts on its right side are hidden behind the body in this view.
[VIEW BACK] This is an extra view of the same character as the attached front image (the
approved main image of this item, not a reference picture): identical design, colours,
proportions, pose and scale. This line replaces the camera line and the words "facing the viewer"
above: seen straight from behind, near-orthographic, camera at chest height; the character faces
straight away from the camera, the head is not turned and the face does not show. Left and right
in the prompt below describe the front image and are swapped in this view: a part the prompt puts
on the viewer's right is on the viewer's left here, and the reverse; every part stays on the same
side of the character's own body.
[VIEW FRONT] This is an extra view of the same creature as the attached side image (the approved
main image of this item): identical design, colours, proportions, pose and scale. This line
replaces the camera line and the framing line above: seen straight from the front with the head
facing the viewer, near-orthographic, camera at body height; the whole creature fits in the frame,
centred, with a small even margin. Parts that are behind the body in this view, such as the rest
of a long body and the tail, stay hidden.
```

### 3.6 Dòng nền

```text
[BG-G] Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no green at all.
[BG-M] Flat pure #FF00FF magenta background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no pink, magenta or bright purple at all.
[BG-B] Flat pure #0000FF blue background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no blue at all.
```

| Dòng | Khi nào |
|---|---|
| BG-G | Mặc định: vật không có màu xanh lá |
| BG-M | Vật có màu xanh lá (lá, rêu, khăn xanh), không có hồng hay tím hồng |
| BG-B | Vật có cả xanh lá và hồng hoặc tím hồng |

- Ba dòng nền này giống từng chữ ở mọi file ảnh của bộ (01, 02, 03 và các file `-vs`). File 03 viết tắt G, M, B.

### 3.7 Màu giữ riêng (design 23.3)

| Màu | Mã | Nghĩa trong game | Luật cho ảnh |
|---|---|---|---|
| Đỏ | `#FF4A4A` | Nguy hiểm từ địch | Không tô mảng lớn trên quái, lính, Trợ Thủ |
| Cam | `#FFB020` | Khẩn: chữ sắp tan, sắp lọt | Không tô mảng lớn |
| Vàng kim | `#FFC83A` | Tiền | Chỉ cho của cải. Alicanto dùng đồng thau, đồng đỏ, sẫm hơn |
| Xanh ngọc | `#7FF5E0`, `#0B8A78` | Sức gõ | Không tô quái, lính, Tướng, Trợ Thủ |
| Tím đen | — | Mực Câm | Không vẽ vệt mực lên quái. Game tự phủ bằng shader (22.6) |
| Màu người trợ lực | Draconis `#F2994A`, Lam `#2F6BFF`, Tre `#A8D05A`, Chấm `#9B5DE5`, Phẩy `#FF8FB1`, Gạch `#B07A4F` | Dây trợ lực, vòng chân, chấm trên thẻ | Chỉ dùng cho chính người đó |

- Quái cần nổi trên cỏ xanh và đường đất sáng (kiểm "nheo mắt", 23.1). Màu quái nên vừa tới sáng, để vệt mực tím đen hiện rõ.
- Tự quyết: quái đông con không tô xanh nhạt, vì trạng thái Chậm ám lam lên quái (23.8).

## 4. Kiểm ảnh trước khi gửi Tripo

- [ ] Một vật duy nhất. Thấy trọn, không bị cắt, lề đều.
- [ ] Đúng góc: nhân vật nhìn thẳng, tư thế A (Thư Đồng: cánh mở nửa, ngang vai; Draconis: tay buông chéo, cánh giơ chữ V trên vai, có khe nền giữa cánh và tay); thú nhìn ngang, đầu quay sang trái; món gắn nhìn 3/4 (hoặc ngang nếu mục ghi).
- [ ] Nhân vật: có khe nền giữa tay và thân. Không gì (tay áo, túi, đuôi, cánh) chạm tay dưới vai, trừ đồ cầm trong tay.
- [ ] Nền một màu phẳng đúng mã, không bóng, không chuyển màu.
- [ ] Không lửa, khói, hạt, quầng sáng, vệt chuyển động, chữ.
- [ ] Thân đặc, không trong suốt, kể cả hồn ma.
- [ ] Không viền đen vẽ quanh hình (viền sẽ thành đường nứt trên texture).
- [ ] Tóc, lông, lá thành mảng to. Không sợi mảnh. Không phần lơ lửng.
- [ ] Ánh sáng đều, không bóng đổ, không bóng loáng.
- [ ] Ảnh góc phụ cùng nhân vật, cùng tư thế, cùng cỡ.
- [ ] Ảnh `-back`: đồ lệch một bên nằm ở phía ngược với ảnh chính (đuôi Lam, đuôi Draconis ở bên phải ảnh chính thì ở bên trái ảnh `-back`). Đầu không ngoái lại, không thấy mặt. Ảnh `-side`: tay buông thẳng; cánh to chỉ thấy cạnh, không thấy mặt cánh. Ảnh `-front` của thú: thân dài và đuôi khuất sau thân, không bẻ sang bên.
- [ ] Màu đúng mô tả. Không dùng màu giữ riêng (mục 3.7).
- [ ] Texture P2c, P3b, P4b (không gửi Tripo): hoa văn phủ kín ảnh, đều, không viền, không bóng.

Ảnh lỗi: nhờ ChatGPT vẽ lại, kèm một câu nói rõ lỗi. Ví dụ `Redo it: same character, plain flat #00FF00 background, neutral A-pose, full body, nothing cropped, no flames.` Đổi mã nền cho đúng dòng nền của mục.

## 5. Thiết lập Tripo

| Mục | Chọn |
|---|---|
| Chế độ | **Image to 3D** với ảnh chính. Có ảnh góc phụ: **Multiview to 3D** |
| Ô ảnh Multiview | Nhân vật: ảnh chính vào ô Front, `-side` vào ô Left, `-back` vào ô Back. Thú: `-front` vào ô Front, ảnh chính (nhìn ngang, đầu quay trái) vào ô Left |
| Tách nền | Bật nếu có. Viền xanh hay hồng sót lại sẽ thành vệt màu trên model |
| Texture | Bật, mức HD cao nhất của gói |
| PBR | Bật |
| Face limit | Theo từng mục |
| Lưới | Tam giác (Quad tắt). Smart Low Poly tắt |
| Auto-rig | Theo từng mục: **biped** (dạng người), **quadruped** (bốn chân) hoặc **không rig** |
| Hoạt ảnh Tripo | Chỉ **idle, walk, run** tại chỗ (in place), khi mục ghi. Không xin đánh, chiêu, trợ lực, reo, trúng đòn, chết, thắng: Blender làm theo bảng 23.9 |
| Tải về | **GLB** (bản có xương nếu đã rig) |
| Tên file | Đúng dòng "Model 3D" |

- Góc phụ lệch nhiều so với ảnh chính (khác màu, khác dáng): bỏ góc phụ, dùng Image to 3D với ảnh chính. Riêng P15 (góc phụ bắt buộc): làm lại ảnh trước, không bỏ.
- Model Multiview ra ngược hay méo: đổi ảnh từ ô Left sang ô Right, tạo lại.
- Rig báo lỗi: tải bản không rig, lưu cùng tên. Blender gắn xương bằng tay (27.4).
- Clip Tripo có trượt về trước: vẫn dùng được. Blender khóa gốc (23.9: không có chuyển động gốc).
- Tripo có loại rig chim hoặc rắn: có thể thử. Đường chính vẫn là Blender (27.4).
- Face limit mặc định: Tướng 20.000; Trợ Thủ 8.000; lính, thợ 5.000; quái nhỏ, vừa 6.000; quái to 9.000; boss 30.000; món gắn 2.000. Mục nào ghi số riêng thì theo mục (Draconis P18: 30.000). Blender giảm số tam giác chạy trong game sau.
- Có thể tạo 2–3 lần (Regenerate), giữ bản đẹp nhất.

## 6. Thư Đồng (P1–P6)

Ba cú non học việc của Cú Thư: Chấm, Phẩy, Gạch. Chúng đi bộ, không đánh, không máu (8.8). **Một model, ba bộ gắn, một khung xương chung** (22.3). Làm P1 trước. P6 bắt buộc đính kèm ảnh P1. Món gắn 3D (P2a, P2b, P3a, P4a, P5a–P5c) đính kèm P1 chỉ để so cỡ và màu.

- 27.2 ghi bộ gắn Phẩy, Gạch ở cả bậc P lẫn VS. File này xếp cả ba bộ vào P, vì hộp cát 1A, 1B, 1C dùng cả ba Thư Đồng.
- Tự quyết: dây đeo bảng đá mang màu và hoa văn của từng Thư Đồng (cùng màu, cùng hoa văn với dây trợ lực, 22.3 và 23.3). Thân chung có dây kem trơn. Dây màu là texture phẳng (P2c, P3b, P4b), Blender phủ lên vùng dây kem. Không dựng dây bằng Tripo: vòng vải mỏng rỗng giữa dễ bị bít kín hoặc méo (23.11, 27.4).

### P1 · `helper-owlet` — Thân cú non chung

| Mục | Giá trị |
|---|---|
| Bậc | P (Thư Đồng có từ 1A; model cần cho 1C) |
| Là gì | Thân cú non dùng chung cho Chấm, Phẩy, Gạch. Bộ gắn riêng ở P2–P4. |
| Ảnh 2D | `art-src/td/helpers/helper-owlet.png` · 1024×1024 |
| Góc phụ (nên có) | `helper-owlet-side.png`, `helper-owlet-back.png` · 1024×1024 · Khối A + VIEW SIDE (hoặc VIEW BACK) + prompt + BG-G |
| Model 3D | `art-src/3d/td/helpers/helper-owlet.glb` |
| Ghép | Khối A + prompt dưới + BG-G (không có màu xanh lá) |
| Tripo | Multiview to 3D (có góc phụ) hoặc Image to 3D · face limit 8.000 · rig biped (lỗi thì không rig, 27.4) · clip Tripo: idle, walk |
| Blender thêm | `Helper_Idle`, `Helper_Walk` (khi clip Tripo không dùng được), `Helper_Assist` + `.tower`, `.drum`, `.craft`, `.support` (đồ cầm theo biến thể ở P5), `Helper_Cheer`, `Helper_Catch`, `Helper_Scared`; nên có `Helper_Intro` |
| Socket | `FX_HAND_R`, `FX_HAND_L` (đầu cánh), `FX_HEAD` (đỉnh mũ), `FX_CORE` (ngực), `FX_FEET`, `FX_TOOL` (giữa bảng đá: nét phấn lóe, 23.7) |
| Cao trong game | 1,1–1,3 m (22.3, 23.2). Đặt 1,2 m. |
| Model tạm | `guides/draconis-v4` (clip `Guide_Idle`, `Guide_Hop`, `Guide_Talk`, `Guide_Wave`, `Guide_Bow`, `Guide_Flap`) |

- Dáng theo 23.11: đứng thẳng, cánh mở nửa ngang vai, hai chân rõ, bảng đá đeo chéo, bút lông cắm sau lưng, mũ học trò vải.
- Tự quyết: id thân chung `helper-owlet`; mũ vải màu kem viền nâu, mắt đen to, bảng đá xám khung gỗ, dây kem có khóa gỗ vuông, chóp bút đen nhô trên vai phải (22.3 không ghi màu). Mũ kem sáng giúp nhận ra Thư Đồng từ camera cao.
- Chân dung C2–C7 (khối LOOK-OWLET, `03-2d-scenery-ui-vfx.md`) chép dáng và màu từ mục này. Hai file khác nhau thì theo file này (file 03 cũng ghi vậy).
- Bảng đá dính liền bụng trong model Tripo. Để Thư Đồng "giơ bảng đá lên" mỗi từ trúng (23.7), Blender tách bảng đá lên một xương riêng và vá chỗ bụng sau bảng bằng màu be của bụng. Không tách được thì làm động tác giơ bằng thân và cánh.

```text
Thu Dong, a baby owl apprentice scribe and helper (the shared base body for three helpers): a round
fluffy owlet like a ball of soft down, about two heads tall (the head is half of the total height),
standing upright on two short legs. Soft grey-brown down grouped into a few big smooth masses; a
lighter warm-beige face disc and belly; very big round dark eyes with one painted white highlight
each; a small yellow beak; two short rounded ear tufts.
Instead of the A-pose arm angle, the short stubby wings are held half open at shoulder height like
little arms, each wing tip ending in three broad rounded feather tips joined as one solid shape.
Short legs with yellow-orange owl feet, three thick toes in front, both feet flat and fully visible.
A soft cream cloth scholar cap with a thin dark-brown band, round and low, sitting snugly on the
head between the ear tufts. A small blank dark-grey slate board with a light wooden frame, worn
diagonally across the chest on a wide plain undyed cream cloth strap with a small square wooden
buckle on the front; the strap runs from the owlet's right shoulder (viewer's left) to its left
hip (viewer's right); the slate rests flat on the belly.
A short thick calligraphy brush with a dry tan bamboo handle tucked behind the back under the
strap, its dark brush tip (one solid pointed mass) poking up above the owlet's right shoulder.
Curious, gentle and a little shy. Symmetrical except the strap, the slate and the brush.
```

### P2 · Bộ gắn Chấm (`helper-cham`, tím `#9B5DE5`, hoa văn chấm)

Bậc P. Chấm cẩn thận, sở trường Xạ, vào đội ở bản đồ 1 đợt 4. Dấu riêng: kính tròn to, khăn chấm trắng (22.3).

| Mã | id | Ảnh 2D (`art-src/td/helpers/`) | Model 3D (`art-src/3d/td/helpers/`) | Cỡ | Ghép | Gắn vào |
|---|---|---|---|---|---|---|
| P2a | `helper-cham-glasses` | `helper-cham-glasses.png` | `helper-cham-glasses.glb` | 1024×1024 | Khối C + prompt + BG-G | Xương đầu, trước mắt · rộng ≈ 0,45 m |
| P2b | `helper-cham-scarf` | `helper-cham-scarf.png` | `helper-cham-scarf.glb` | 1024×1024 | Khối C + prompt + BG-G | Xương cổ, ngực · vòng ngoài ≈ 0,5 m |
| P2c | `helper-cham-strap` | `helper-cham-strap.png` | Không có (texture) | 1024×1024 | Khối T + prompt (không dòng nền) | Blender phủ lên vùng dây kem của P1 |

- Tripo cho món gắn P2a, P2b, P3a, P4a, P5a–P5c: Image to 3D · face limit 2.000 · không rig · không clip. Món gắn đi theo clip của thân (P1).
- P2c, P3b, P4b không gửi Tripo. Chỉ lưu PNG.
- Tự quyết: cỡ món gắn ghi ở cột "Gắn vào" (design không ghi), tính theo Thư Đồng cao 1,2 m, đầu bằng nửa thân.

**P2a**
```text
Cham's big round glasses for a baby owl: two large perfectly round, thick frames joined by a short
arched bridge, frames painted purple (#9B5DE5); opaque milky pale-blue lens discs with one soft
white highlight each (solid, not transparent); two short thick temple arms curving back. Sized for
a ball-shaped owl head: the whole frame is as wide as two very big owl eyes side by side.
```

**P2b**
```text
Cham's knitted scarf for a baby owl: a thick soft ring of purple (#9B5DE5) knit with round white
polka dots, shaped as if wrapped once around an invisible round owl neck (the inside is empty), one
short fat knot at the front and two short stubby ends hanging straight down, the ends touching each
other and the ring.
```

**P2c** (Khối T, không dòng nền)
```text
Cham's strap cloth: purple (#9B5DE5) woven cloth with neat, evenly spaced rows of round white
dots, each dot about one tenth of the image width.
```

### P3 · Bộ gắn Phẩy (`helper-phay`, hồng `#FF8FB1`, hoa văn dấu phẩy)

Bậc P. Phẩy lắm lời, sở trường Trống, vào đội sau Mộc Tinh. Dấu riêng: lông đuôi cong như dấu phẩy (22.3).

| Mã | id | Ảnh 2D (`art-src/td/helpers/`) | Model 3D (`art-src/3d/td/helpers/`) | Cỡ | Ghép | Gắn vào |
|---|---|---|---|---|---|---|
| P3a | `helper-phay-tail` | `helper-phay-tail.png` | `helper-phay-tail.glb` | 1024×1024 | Khối C + prompt + BG-G | Xương hông, sau mông · cao ≈ 0,45 m |
| P3b | `helper-phay-strap` | `helper-phay-strap.png` | Không có (texture) | 1024×1024 | Khối T + prompt (không dòng nền) | Blender phủ lên vùng dây kem của P1 |

**P3a**
```text
Phay's comma tail feather for a baby owl: one big thick soft feather curled into the shape of a
comma, a round full head at the top tapering into a curled tip at the bottom; soft grey-brown like
the owlet's down, the curled tip pink (#FF8FB1); a short thick quill stub at the base that plugs
into the owl's rump. One smooth solid piece. Exact flat side view instead of the three-quarter view.
```

**P3b** (Khối T, không dòng nền)
```text
Phay's strap cloth: pink (#FF8FB1) woven cloth with neat, evenly spaced rows of small white comma
marks (simple curled teardrops, all curling the same way), each mark about one tenth of the image
width.
```

### P4 · Bộ gắn Gạch (`helper-gach`, nâu đồng `#B07A4F`, hoa văn gạch ngang)

Bậc P. Gạch ít nói, sở trường Thợ, vào đội sau boss Thế giới 2. Dấu riêng: sọc ngang trên cánh (22.3).

| Mã | id | Ảnh 2D (`art-src/td/helpers/`) | Model 3D (`art-src/3d/td/helpers/`) | Cỡ | Ghép | Gắn vào |
|---|---|---|---|---|---|---|
| P4a | `helper-gach-wingband` | `helper-gach-wingband.png` | `helper-gach-wingband.glb` | 1024×1024 | Khối C + prompt + BG-G | Xương cánh trên; Blender soi gương cho cánh kia · dài ≈ 0,15 m |
| P4b | `helper-gach-strap` | `helper-gach-strap.png` | Không có (texture) | 1024×1024 | Khối T + prompt (không dòng nền) | Blender phủ lên vùng dây kem của P1 |

- Tự quyết: "sọc ngang trên cánh" làm thành băng vải sọc quấn cánh, để là món gắn rời như hai bộ kia.

**P4a**
```text
Gach's wing band for a baby owl: one thick soft cloth cuff like a short puffy sleeve, shaped as if
wrapped around an invisible stubby wing (the inside is empty), bronze brown (#B07A4F) with three
bold horizontal cream stripes around it. Only one cuff; the other wing gets a mirrored copy.
```

**P4b** (Khối T, không dòng nền)
```text
Gach's strap cloth: bronze brown (#B07A4F) woven cloth with neat, evenly spaced rows of short white
horizontal dashes, each dash about one sixth of the image width.
```

### P5 · Đồ cầm khi trợ lực (bút, trống con, búa con)

Thư Đồng làm động tác theo nhóm nhà (22.3, 8.4). Mỗi biến thể clip cần một món cầm tay.

| Mã | id | Ảnh 2D (`art-src/td/helpers/`) | Model 3D (`art-src/3d/td/helpers/`) | Cỡ | Ghép | Gắn vào |
|---|---|---|---|---|---|---|
| P5a | `helper-brush` | `helper-brush.png` | `helper-brush.glb` | 1536×1024 | Khối C + prompt + BG-G | `FX_HAND_R` trong `Helper_Assist` gốc và `.tower` (vẩy bút lên bảng đá, 23.7) · dài ≈ 0,4 m |
| P5b | `helper-drum` | `helper-drum.png` | `helper-drum.glb` | 1024×1024 | Khối C + prompt + BG-G | `FX_HAND_L` trong `.drum` (Trại Lính, Lũy); cánh phải vỗ mặt trống · rộng ≈ 0,3 m |
| P5c | `helper-hammer` | `helper-hammer.png` | `helper-hammer.glb` | 1536×1024 | Khối C + prompt + BG-G | `FX_HAND_R` trong `.craft` (Mỏ, Ruộng, Trại Gỗ, sửa nhà) · dài ≈ 0,3 m |

- Bậc P. Khi cầm P5a, bút sau lưng thu về 0 bằng một xương riêng. Khi cầm P5b, P5c thì bút sau lưng giữ nguyên.
- Tự quyết: thêm P5a vào P. 23.11 giữ bút sau lưng trong ảnh Tripo, nhưng 23.7 cần bút trong tay khi trợ lực.
- Tự quyết: thêm P5b, P5c vào P (nên có). 22.3 cho Thư Đồng đánh trống con ở Trại Lính, Lũy và gõ búa con ở nhà kinh tế; các nhà này có ở 1B, 1C. Thiếu món thì Blender dùng clip gốc (23.9).
- Nhóm hỗ trợ (`.support`: lật sách, quạt nồi ở Đài Ấn, Nhà Thuốc) ở file VS, mục VS14.

**P5a**
```text
A short thick calligraphy brush sized for a baby owl's wing, the same brush the owlet carries on its
back: a straight dry tan bamboo handle with two visible nodes, a small solid cream cord ring at the
top end, a dark ink-black brush head shaped like one solid pointed teardrop (no separate hairs).
Lying horizontally across the image, exact side view instead of the three-quarter view, brush head
pointing right.
```

**P5b**
```text
A small toy hand drum sized for a baby owl: a short round wooden drum body painted warm brown with
one ring of round brass studs, a pale cream drum skin on the top and the bottom, and one short thick
wooden handle sticking straight out of the side; chunky and solid, no strings, no tassels.
```

**P5c**
```text
A small wooden mallet sized for a baby owl: a fat round wooden head bound with one dark iron ring, a
short straight sturdy handle about twice as long as the head, a cream cord wrap at the end of the
handle. Lying horizontally across the image, exact side view instead of the three-quarter view,
head pointing right.
```

### P6 · Ảnh mẫu ba Thư Đồng mặc đủ (không gửi Tripo)

Bậc P. Ảnh để chủ dự án duyệt, và để Blender canh vị trí bộ gắn. **Không tải lên Tripo.** Không có GLB. Góc phụ: không.

| Mã | id | Ảnh 2D | Cỡ | Ghép |
|---|---|---|---|---|
| P6a | `helper-cham-ref` | `art-src/td/helpers/helper-cham-ref.png` | 1024×1024 | Khối R + prompt + BG-G |
| P6b | `helper-phay-ref` | `art-src/td/helpers/helper-phay-ref.png` | 1024×1024 | Khối R + prompt + BG-G |
| P6c | `helper-gach-ref` | `art-src/td/helpers/helper-gach-ref.png` | 1024×1024 | Khối R + prompt + BG-G |

- Tự quyết: hậu tố `-ref` để không ai nhầm đây là ảnh gửi Tripo. Chân dung vui, hoảng của Thư Đồng (C2–C7) nằm ở `03-2d-scenery-ui-vfx.md`.

**P6a**
```text
Dress the base owlet as Cham (Dot): big round purple (#9B5DE5) glasses with milky pale-blue lenses in
front of the eyes; a purple scarf with white polka dots wrapped once around the neck with a short
knot; the cream slate strap replaced by a purple strap with rows of white dots. Everything else
stays exactly as in the attached base image.
```

**P6b**
```text
Dress the base owlet as Phay (Comma): one big comma-curled tail feather with a pink (#FF8FB1) tip,
rising behind the body and curling out so it shows beside the owlet's left hip; the cream slate
strap replaced by a pink strap with rows of small white comma marks. Everything else stays exactly
as in the attached base image.
```

**P6c**
```text
Dress the base owlet as Gach (Dash): bronze brown (#B07A4F) cloth cuffs with three bold horizontal
cream stripes on both wings; the cream slate strap replaced by a bronze strap with rows of short
white dashes. Everything else stays exactly as in the attached base image.
```

## 7. Tướng

### P7 · `lam` — Lam Hỏa Miêu (Azureflame Courier)

| Mục | Giá trị |
|---|---|
| Bậc | P (27.2 ghi "nếu kịp"; viết đủ để làm ngay khi có thời gian) |
| Là gì | Tướng đi bộ nhanh, cận chiến, chặn quái, lướt 8 m. Mèo tộc Hỏa Miêu, Đội Phi Thư (22.2). |
| Ảnh 2D | `art-src/td/heroes/lam.png` · 1024×1536 |
| Góc phụ (nên có) | `lam-side.png`, `lam-back.png` · 1024×1536 · Khối A + VIEW SIDE (hoặc VIEW BACK) + prompt + BG-G |
| Model 3D | `art-src/3d/td/heroes/lam.glb` |
| Ghép | Khối A + prompt dưới + BG-G |
| Ảnh mẫu | `art-src/td/refs/2.png`, ảnh chủ dự án gửi (23.11). Đính kèm là tùy chọn. Không có 2.png thì prompt chữ vẫn đủ. |
| Tripo | Multiview to 3D (có góc phụ) hoặc Image to 3D · face limit 20.000 · rig biped · clip Tripo: idle, run (thêm walk nếu có) |
| Blender thêm | `Hero_Idle`, `Hero_Run` (khi clip Tripo không dùng được), `Hero_Attack` (vuốt), `Hero_Skill1` (Vuốt Lam Liên Hoàn), `Hero_Skill2` (Dấu Lửa Phi Thư), `Hero_Ult` (Hỏa Tốc), `Hero_Assist` (lặp), `Hero_Hit`, `Hero_Death`, `Hero_Respawn`, `Hero_Victory`; nên có `Hero_Idle_Fidget`, `Hero_Dash`, `Hero_Ult_Echo`, `Hero_Assist_Beat` |
| Socket | `FX_HAND_R`, `FX_HAND_L` (vuốt), `FX_HEAD`, `FX_CORE`, `FX_FEET` (vệt lửa, lướt), `FX_TOOL` (miệng túi thư: Mảnh Chữ bay vào, 23.8) |
| Cao trong game | 2,6–2,9 m (23.2). Đặt 2,7 m. |
| Model tạm | Khối tạm ở 1B (22.2, 28.3) |
| Lửa | Lửa lam viền trắng quanh vai, đuôi, chỏm tai là VFX (22.2). Không vẽ vào ảnh này. Lửa bám xương vai, đuôi, đầu. Ảnh có lửa: chân dung C9 và ảnh trượt Tối Thượng C24 ở `03-2d-scenery-ui-vfx-vs.md`. |
| Màu áo 2 | Tướng cấp 3 mở "màu áo 2" (15.1): biến thể texture trong Blender, không cần ảnh mới. |

- Giữ theo 23.11: đầu khoảng 40 % chiều cao, mắt to, mặt trắng có mặt nạ lông đen, bề mặt mờ như vinyl, không lửa.
- Tự quyết: lông mặt, mõm, ngón tay trắng; mặt nạ, tai, đuôi đen; chỏm tai và chóp đuôi tô cobalt (chỗ lửa VFX bám).
- Tự quyết: mũ trùm đội lên, hai tai xuyên qua, huy hiệu phong bì có cánh ở trước mũ (22.2 chỉ ghi "mũ trùm có huy hiệu").
- Tự quyết: ống thư đeo chéo sau lưng; túi thư đeo hông phải để thấy từ trước và làm `FX_TOOL` (22.2 ghi "túi thư, ống thư sau lưng").
- Prompt không dùng tên "Azureflame" và chữ "fire" để tả hình: các chữ đó dễ làm ChatGPT vẽ lửa (23.11). Chữ "fire" chỉ có trong câu cấm (Khối A, câu 2.png).

```text
Lam, a young cat warrior and letter courier, chibi proportions about 2.5 heads tall, the head about
40 percent of the total height (big head, small sturdy body).
Face: white face and white muzzle with a black fur mask across the eyes like a little bandit mask,
very big bright blue eyes, a small pink nose, a confident friendly look with the mouth closed. Two
tall pointed cat ears, black, with solid cobalt-blue (#2F6BFF) tips painted on the fur (colour only,
smooth ear outline).
Outfit: a fantasy techwear courier jacket of quilted navy-black fabric in big puffy panels, hip
length and closed, with thin cobalt-blue rune lines painted along the seams and cuffs (painted, not
glowing); the hood is up and fitted, the ears standing up through two openings, a small embroidered
winged-envelope badge on the front of the hood; two dark leather straps crossing the chest in an X
with a round cobalt buckle where they meet; a chunky mail satchel worn flat against the front of
Lam's right hip (the viewer's left) on a cross-body strap, not sticking out past the hip, with a
clear gap between it and the right arm; a fat cylindrical letter tube strapped diagonally across the
back, its round cap showing above Lam's left shoulder (the viewer's right); fingerless navy gloves
with white fur fingers and short blunt claw tips; slim dark trousers tucked into thick-soled running
shoes, navy with white soles and cobalt laces.
A long, thick black cat tail with a cobalt-blue tip, curled out to the viewer's right and up, clear
of the legs and of the left arm and hand. Hands relaxed and slightly open. Symmetrical except the
satchel, the letter tube and the tail.
The fur and clothes are plain and matte everywhere: no flames, no glow and no sparks on the ears,
the shoulders or the tail.
```

Chỉ khi làm ảnh chính `lam.png` và chủ dự án đính kèm 2.png, thêm câu này vào cuối prompt (trước dòng nền):

```text
Use the attached image only as a reference for head proportions, the face mask, the eyes and the
matte vinyl-toy material. Do not copy its fire, pose, background or any outfit detail that this
prompt does not describe.
```

Ảnh `-side`, `-back`: chỉ đính kèm `lam.png` đã duyệt. Không đính kèm 2.png, không thêm câu trên.

### P18 · `draconis` — Draconis Phượng Long (model mới theo 3.png)

| Mục | Giá trị |
|---|---|
| Bậc | P (Tướng của Thế giới 1, có từ 1A. Chân dung và tranh truyện dùng dáng này. `draconis-v2` chỉ là model tạm.) |
| Là gì | Tướng bay, giữ ô 1, phép diện rộng, chống bay. Đậu mái khi trợ lực (8.4). Rồng hai chân theo ảnh 3.png (22.2). |
| Ảnh 2D | `art-src/td/heroes/draconis.png` · 1536×1024 (hai cánh xòe chữ V rộng nên hình rộng) |
| Góc phụ (rất nên có) | `draconis-side.png`, `draconis-back.png` · 1536×1024 · Khối A + VIEW SIDE (hoặc VIEW BACK) + prompt + BG-G · chỉ đính kèm `draconis.png` đã duyệt; không đính kèm 3.png, không thêm câu 3.png |
| Model 3D | `art-src/3d/td/heroes/draconis.glb` |
| Ghép | Khối A + prompt dưới + BG-G (trắng, kem, vàng, đỏ cam, đen: không có xanh lá) |
| Ảnh mẫu | `art-src/td/refs/3.png`, ảnh chủ dự án gửi. Nên đính kèm khi làm ảnh chính `draconis.png`, kèm câu thêm ở cuối mục. Ảnh góc phụ không dùng 3.png. |
| Tripo | Multiview to 3D (ảnh chính, `-side`, `-back`) · face limit 30.000 (Tướng to nhất, cánh nhiều khối lông) · **không rig, không clip Tripo**: tải GLB không xương. Blender dựng cả khung xương (thân, tay, cánh, chân, đuôi) bằng `build_winged_rig` với preset mới đo trên model này (`"flight": true`, tên xương như `draconis-v2-rig.json`), rồi làm clip bay. Lý do: Tripo không rig được cánh (27.4); GLB đã có xương Tripo thì `build_winged_rig` bị bỏ qua và clip bay không có chuyển động. |
| Blender thêm | Dựng lại bộ clip của v2 trên khung xương mới, giữ đúng tên: `Hero_Fly`, `Hero_Idle_Hover`, `Hero_Boost`, `Hero_Attack_L`, `Hero_Attack_R`, `Hero_Attack_Both`, `Hero_Cast`, `Hero_Hit`, `Hero_Death`, `Hero_Victory`, `Hero_Intro`. Thêm clip Tướng bay của 23.9 còn thiếu: `Hero_Skill1`, `Hero_Skill2`, `Hero_Ult`, `Hero_Takeoff`, `Hero_Land`, `Hero_Perch_Assist`; nên có `Hero_Perch_Idle`, `Hero_Ult_Echo`, `Hero_Ground_Idle`. Việc của từng clip: xem mục v2 dưới đây. Hàm có sẵn dùng được: `build_winged_rig`, `make_flight_clips`, `make_dragon_clips` (mục 13). |
| Socket | 6 socket nhân vật của 23.9 (`FX_HAND_R`, `FX_HAND_L`, `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_TOOL`), thêm tên của v2: `FX_MOUTH` (cầu lửa, nón lửa), `FX_CORE` (Mảnh Chữ bay vào, 23.8), `FX_WING_L`, `FX_WING_L2`, `FX_WING_R`, `FX_WING_R2`, `FX_TAIL` (5 vệt bay ở cánh và đuôi, theo `src/scene3d/hero.ts`). `FX_TOOL` = `FX_MOUTH` như v2. |
| Cao trong game | Thân 3,5 m, sải cánh 6 m, bay ở 4–6 m (23.2). To gấp 2–3 lần Tướng khác. Không chibi. Đo 3,5 m từ gót chân tới đỉnh đầu, không tính sừng, cánh, đuôi. Sải cánh 6 m là hai đầu cánh khi duỗi hết trong `Hero_Fly`; dáng nghỉ trong ảnh hẹp hơn. Blender đặt tỉ lệ theo đỉnh đầu, không theo hộp bao, vì đầu cánh giơ cao hơn đầu. |
| Model tạm | `heroes/draconis-v2`: rồng đỏ cánh màng; clip và bí danh ở mục dưới |
| Lửa | Cầu lửa, nón lửa, lông lửa, tro là VFX (22.2, 23.8). Không vẽ vào ảnh này. Chóp lông đỏ cam chỉ là màu sơn. |
| Shader | Vệt Mực Câm tím trên cánh đầu Thế giới 1 là shader (mặt nạ cánh + tham số theo bản đồ, 22.2). Không vẽ vào ảnh. |
| Hình 2D | Chân dung C1 (`03-2d-scenery-ui-vfx.md`), ảnh trượt C23 và tranh truyện T1, T2 (`03-2d-scenery-ui-vfx-vs.md`) dùng khối LOOK-DRACONIS, cùng dáng với mục này. |
| Màu áo 2 | Tướng cấp 3 mở "màu áo 2" (15.1): biến thể texture trong Blender, không cần ảnh mới. |

- Tự quyết: mắt vàng hổ phách, hai sừng đen viền vàng, như khối LOOK-DRACONIS ở file 03 (22.2 không nói). Hai file khác nhau thì theo file này. Ảnh chính có đính kèm 3.png mà 3.png khác về đầu, sừng, mắt, giáp thì theo 3.png, vì dáng TD theo 3.png.
- Tự quyết: hai tay buông chéo 30–45°, móng mở; hai cánh giơ cao thành chữ V trên vai, xòe nửa; lông thấp nhất của cánh cao hơn khuỷu tay, có khe nền giữa cánh và tay. Đuôi nằm thấp, dưới tầm tay. Tay, cánh, thân tách rời nhau, nên Tripo dựng dễ và Blender gắn xương dễ (27.4).
- Tự quyết: mỗi cánh 5–7 lớp lông to chồng lên nhau, không vẽ từng lông mảnh (23.11). Giáp ít mảnh, mảnh to.
- Tự quyết: chóp lông đỏ cam là dải hẹp ở đầu lông, không thành mảng lớn, để không lẫn với đỏ nguy hiểm và cam khẩn (23.3).
- Tự quyết: giữ cả các tên socket khác của v2 (`FX_CAST_L`, `FX_CAST_R`, `FX_HALO`, `FX_FOOT_L`, `FX_FOOT_R`, `FX_WING_L2`, `FX_WING_R2`), đặt trùng socket 23.9 như ánh xạ ở mục v2. Đổi model thì mã game không phải sửa.
- Prompt không dùng các chữ "Phoenix", "fire", "flame", "ember" để tả hình: các chữ đó dễ làm ChatGPT vẽ lửa (23.11). Các chữ này chỉ có trong câu cấm (Khối A, câu cuối prompt, câu 3.png). Màu chóp lông tả bằng màu quả hồng chín.

```text
Draconis, a great ancient dragon, majestic and NOT chibi: grown-up proportions, an upright
two-legged body standing on two powerful legs, a huge and heavy build, a strong neck and a noble
head that is small compared with the tall body. The whole dragon fits in the frame, both wing tips
and the tail tip included.
Body: smooth white scales grouped into a few big plates, a pale cream belly with wide belly bands,
and a long, thick white tail lying low along the invisible floor and curled out to the viewer's
right below the level of the hands, clear of the legs and of the left hand, ending in a blunt
rounded tip.
Head: a proud dragon head with a short strong snout, mouth closed, calm golden-amber eyes (painted,
not glowing) and two thick horns swept back, black with gold edges.
Armour and claws: a few big black armour plates with gold rims on the chest, the shoulders, the
forearms and the shins (few and big, not many small ones); black claws with gold bases on the
hands and the feet.
Instead of the A-pose arm line: the arms hang down and out 30-45 degrees from the body, hands open
with the claws relaxed, and two very big feathered wings grow from the upper back, raised high and
half spread in a wide V above the shoulders, neither folded nor fully stretched; the lowest
feathers of each wing end above the elbows, so a clear gap of empty background separates each wing
from the arm below it, and no part of an arm overlaps a wing. Each wing is made of five to seven
big overlapping layers of broad, solid, cream-gold feathers; the tip of every feather is a narrow
band painted warm red-orange like a ripe persimmon. No single thin feathers, no loose fibres.
Proud, calm and ancient. Symmetrical except the tail.
The scales, feathers and armour are plain and matte everywhere: no flames, no glow, no sparks and
no smoke on the wings, the mouth or the tail.
```

Khi làm ảnh chính `draconis.png` và chủ dự án đính kèm 3.png (nên làm), thêm câu này vào cuối prompt (trước dòng nền):

```text
Use the attached reference picture 3.png only as a reference for this dragon's look: the head, the
horns, the eyes, the body shape, the feathered wings, the colours and the armour. Where 3.png and
this text differ on the head, the horns, the eyes or the armour, follow 3.png. Do not copy its
fire, glow, pose, background or any detail that this prompt does not describe.
```

Ảnh `-side`, `-back`: chỉ đính kèm `draconis.png` đã duyệt làm ảnh mặt trước. Không đính kèm 3.png, không thêm câu trên. Chân dung C1 ở file 03 dùng lại câu này khi chỉ có 3.png.

### Draconis v2 (`heroes/draconis-v2`) — model tạm, không cần ảnh

Model `heroes/draconis-v2` (22.2) chạy trong game cho tới khi có model mới P18. Không tạo ảnh, không chạy Tripo cho v2. Việc cần làm cho v2 nằm ở Blender.

| Mục | Giá trị |
|---|---|
| Bậc | P (có từ 1A; model tạm) |
| Là gì | Tướng bay, giữ ô 1, phép diện rộng, chống bay. Đậu mái khi trợ lực (8.4). |
| Cao trong game | Thân 3,5 m, sải cánh 6 m, bay ở 4–6 m (23.2). To gấp 2–3 lần Tướng khác (22.2). Không chibi. |
| Clip có sẵn (bí danh 23.9) | `Hero_Idle` → `Hero_Idle_Hover`; `Hero_Attack` → `Hero_Attack_Both` (biến thể `_L`, `_R`); `Hero_Ult` tạm → `Hero_Cast`; `Hero_Assist` tạm → `Hero_Idle_Hover`. Model có sẵn `Hero_Fly`, `Hero_Boost`, `Hero_Hit`, `Hero_Death`, `Hero_Victory`, `Hero_Intro` (manifest ngày 22/10). |
| Blender cần làm | `Hero_Skill1` (Hơi Thở Phượng Hỏa: nón lửa từ miệng 3 s), `Hero_Skill2` (Tiếng Gầm Cổ Tinh), `Hero_Takeoff`, `Hero_Land` (mỗi lần 0,6 s, 8.2), `Hero_Perch_Assist` (đậu mái, thay bí danh của `Hero_Assist`), `Hero_Ult` thật (Mưa Lông Lửa: bay cao rải lông); nên có `Hero_Perch_Idle`, `Hero_Ult_Echo`, `Hero_Ground_Idle`. Khung xương: `scripts/models/presets/draconis-v2-rig.json`. |
| Socket | Model có `FX_CAST_L`, `FX_CAST_R`, `FX_MOUTH`, `FX_CORE`, `FX_HALO`, `FX_FOOT_L`, `FX_FOOT_R`, `FX_WING_*`, `FX_TAIL`. Cầu lửa và nón lửa ra từ `FX_MOUTH`. Mảnh Chữ bay vào ngực (`FX_CORE`, 23.8). |
| Shader | Vệt Mực Câm tím trên cánh đầu Thế giới 1, mờ dần qua từng bản đồ (22.2): mặt nạ cánh + một tham số theo bản đồ. |
| Đậu mái | Đậu ở `FX_perch` của nhà đang trợ lực. Tự quyết (22/10, đổi được): `FX_perch` = `FX_top` + 0,6 m ở mọi nhà có mái (23.9); Tháp Pháo (cấp 1 không mái, cấp 2–3 chỉ có mái che nửa sau) và Đài Ấn có điểm đậu riêng (`02-tripo-buildings-props.md`, mục 8). |
| Hình 2D | Chân dung C1 ở `03-2d-scenery-ui-vfx.md`; ảnh trượt Tối Thượng C23, tranh truyện T1, T2 ở `03-2d-scenery-ui-vfx-vs.md`. Các ảnh này theo dáng 3.png (P18), không theo màu v2. |

- Tự quyết: socket chuẩn 23.9 lấy từ socket có sẵn: `FX_HAND_R` = `FX_CAST_R`, `FX_HAND_L` = `FX_CAST_L`, `FX_HEAD` = `FX_HALO`, `FX_FEET` = điểm giữa `FX_FOOT_L` và `FX_FOOT_R` (chỗ chạm mái khi đậu), `FX_TOOL` = `FX_MOUTH` (chỗ thổi đốm lửa khi trợ lực, 23.7).
- Tự quyết (22/10, đổi được): dáng TD của Draconis theo ảnh 3.png như 22.2 tả: rồng hai chân, không chibi, thân trắng, đuôi dài, cánh lông vũ to màu vàng kem, chóp lông tô đỏ cam (chỉ là màu, không phải lửa), móng và giáp đen vàng; đầu Thế giới 1 cánh có vệt mực tím (shader, không vẽ). Lý do: tên Phượng Long và bộ chiêu (đạn lông lửa, Mưa Lông Lửa, "tan thành tro và lông") dựa vào cánh lông vũ. Cả 4 model Draconis có sẵn đều đỏ vàng (đã kiểm 22/10). v2 (rồng đỏ cánh màng) là model tạm trong game, giữ clip và bí danh, tới khi có model mới P18.

## 8. Lính

### P8 · Lính Giáo (`linh-giao`) và cây giáo (`linh-giao-spear`)

- Thêm vào P: Trại Lính là nhà P (có từ 1A) và lính đánh trên đường suốt trận. Từ 22/10, cột model của 27.2 ghi "Lính Giáo + giáo".
- Lính tạm (Bùng Nổ Trại Lính) và Viện Binh dùng lại model này.

| Mục | Giá trị |
|---|---|
| Bậc | P (thêm, lý do ở trên) |
| Là gì | Dân Quân Văn Điền cầm giáo, 3 lính mỗi Trại Lính, chặn quái ở điểm tập kết (11.4, 13). |
| Ảnh 2D | P8a `art-src/td/units/linh-giao.png` · 1024×1536 · P8b `art-src/td/units/linh-giao-spear.png` · 1536×1024 |
| Góc phụ | Không bắt buộc: `linh-giao-side.png`, `linh-giao-back.png` · 1024×1536 · Khối A + VIEW SIDE (hoặc VIEW BACK) + prompt P8a + BG-G |
| Model 3D | `art-src/3d/td/units/linh-giao.glb`, `art-src/3d/td/units/linh-giao-spear.glb` |
| Ghép | P8a: Khối A + prompt + BG-G · P8b: Khối C + prompt + BG-G |
| Tripo | P8a: face limit 5.000 · rig biped · clip Tripo: idle, walk · P8b: face limit 2.000 · không rig |
| Blender thêm | `Unit_Idle`, `Unit_Walk`, `Unit_Attack` (đâm giáo), `Unit_Hit`, `Unit_Death` (ngã ngồi, tan thành chữ cái), `Unit_Cheer`; nên có `Unit_Charge` |
| Socket | `FX_HAND_R` (giáo), `FX_HAND_L`, `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_TOOL` (mũi giáo: lóe xanh ngọc khi được chữ tiếp sức, 23.8) |
| Cao trong game | 1,7–2,0 m (23.2). Đặt 1,85 m. |
| Model tạm | Chưa có (1A vẽ chấm lam) |

- Tự quyết: áo chàm, đai xanh `#3B7DDD` (màu họ Quân, 23.3), không dùng đỏ, để đỏ chỉ là nguy hiểm.
- Tự quyết: giáo dài khoảng 2,2 m (1,2 lần chiều cao lính).

**P8a**
```text
Linh Giao, a spear soldier of the Van Dien village militia: a cheerful, sturdy young man, chibi
proportions about 2.5 heads tall. A small pointed conical hat of straw-coloured woven bamboo with a
round wooden knob on top and a dark chin strap; a short cross-collar tunic dyed deep indigo, tied
with a wide sky-blue (#3B7DDD) cloth sash knotted at the front with two short stiff ends; a plain
round brass disc on the chest (no symbols); knee-length dark brown trousers, cream cloth leg wraps, straw
sandals. Brave, friendly face. The right hand is a loose closed fist as if gripping a pole that is
not there; the left hand is open and relaxed. Nothing in the hands.
```

**P8b**
```text
A village militia spear: a straight sturdy dry tan bamboo shaft with three visible nodes, about
twelve times as long as it is thick; a leaf-shaped iron blade with a raised centre ridge, plain
silver-grey; one compact sky-blue (#3B7DDD) cloth knot tied just below the blade (no hanging
strands); a rounded iron cap on the butt end. Lying horizontally across the image, exact side view instead of the
three-quarter view, blade pointing right.
```

## 9. Quái

Luật chung cho quái (22.6, 23.2):
- Hình chung có vệt Mực Câm tím đen. Vệt này là shader. **Không vẽ vệt mực vào ảnh.**
- Chết không máu: vệt mực bong thành giấy vụn, chữ cái của tên bay ra (Mảnh Chữ). Hiệu ứng chết riêng của loài là VFX hoặc clip `Enemy_Death`.
- Cỡ trong game: quái nhỏ 1,6–2,2 m; vừa 2,4–3,2 m; to 3,5–4,5 m.
- Tự quyết: quái bầy (23.2 không có dòng riêng) dùng đầu dưới cỡ quái nhỏ, 1,6–1,8 m.
- Bóng hình phải đọc được từ camera mặc định 55° ở 58 m (23.2). Mỗi mục ghi "Nhìn từ trên".
- Không thần, không vật được thờ (22.1). Bùa Cương Thi để trống.
- Báo trước đòn là vệt đỏ có sọc trên đất (VFX, ≥ 0,5 s). Clip chỉ cần dáng báo trước rõ.

### P9 · `cuong-thi` — Cương Thi (Jiangshi)

| Mục | Giá trị |
|---|---|
| Bậc | P (có từ 1A) |
| Là gì | Quái bầy chạy nhanh 3,8 m/s, nhảy hai chân. Đông nhất bản đồ 1. |
| Ảnh 2D | `art-src/td/enemies/cuong-thi.png` · 1024×1536 |
| Góc phụ | Không bắt buộc: `cuong-thi-side.png`, `cuong-thi-back.png` · 1024×1536 · Khối A + VIEW SIDE (hoặc VIEW BACK) + prompt + BG-G |
| Model 3D | `art-src/3d/td/enemies/cuong-thi.glb` |
| Ghép | Khối A + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 6.000 · rig biped · clip Tripo: idle (dáng nhảy làm ở Blender) |
| Blender thêm | `Enemy_Move` (nhảy hai chân, tay duỗi trước), `Enemy_Idle`, `Enemy_Attack`, `Enemy_Hit`, `Enemy_Death` (bùa cháy từ dưới lên, hóa tro) |
| Socket | `FX_HEAD` (Mảnh Chữ; cuộn gõ trực tiếp Neo của Đầu Đàn), `FX_CORE`, `FX_FEET` (bụi chạm đất), `FX_HAND_R`, `FX_HAND_L` |
| Cao trong game | 1,7 m (bầy) |
| Model tạm | Chưa có (1A vẽ 2D) |
| Nhìn từ trên | Vành mũ đen tròn nổi trên áo vàng đất. Khi nhảy, hai tay duỗi trước. |
| Báo trước đòn | Không có (22.6). Đọc bằng dáng nhảy. |

- Tự quyết: áo vàng đất (không phải vàng kim), viền xanh đen, da xám tro, mắt lờ đờ, dễ thương không đáng sợ (22.6 không tả hình).

```text
Cuong Thi, a hopping jiangshi from East Asian folk tales, made silly and cute for children, not
scary: chibi proportions about 2.5 heads tall, a stiff upright body. Pale ash-grey skin with
rosy-grey cheeks, sleepy heavy-lidded round eyes (still open), a small flat mouth. A round black
official hat with a flat brim and a small brass knob on top. A completely blank cream paper talisman
strip (no writing, no symbols) hanging from the front of the hat brim and lying flat on the forehead
down to the eyebrows, thick and stiff like card. A stiff old-fashioned court robe in warm faded
mustard ochre (earthy yellow-brown with no green tint, not shiny gold) reaching the ankles, with
wide navy-black bands at the collar, cuffs and hem, and a plain square chest panel with one simple
cream cloud shape; long, fitted tube sleeves that hang close around each arm and cover the hands
except the fingertips, with a clear gap of empty background between each sleeve and the robe;
black cloth shoes with thick white soles. Arms down in the A-pose (the arms-forward hop is animated
later).
```

### P10 · `cuong-thi-lead-hat` — Mũ Cương Thi Đầu Đàn

| Mục | Giá trị |
|---|---|
| Bậc | P (Đầu Đàn `cuong-thi-lead` có từ 1B) |
| Là gì | Mũ đội lên Cương Thi phóng to để thành Đầu Đàn: quái vừa, dẫn bầy, +20 % tốc bầy trong 6 m; gõ trực tiếp Neo (22.6, 9.2). |
| Ảnh 2D → Model | `art-src/td/enemies/cuong-thi-lead-hat.png` → `art-src/3d/td/enemies/cuong-thi-lead-hat.glb` · 1024×1024 |
| Ghép | Khối C + prompt + BG-G |
| Tripo | Face limit 2.000 · không rig · không clip |
| Gắn vào | `FX_HEAD` của Cương Thi, phủ lên mũ thường |
| Cao trong game | Đầu Đàn ≈ 2,6 m (model Cương Thi ×1,5). Mũ rộng hơn mũ thường khoảng 10 %, cao gấp đôi. |

- Tự quyết: Đầu Đàn dùng lại model Cương Thi phóng to ×1,5 và đội mũ này. Thêm vào P vì 1B có Đầu Đàn (đợt 4, 7 bản đồ 1) mà 27.2 không có model riêng; cần nhận ra nó giữa 8–10 con bầy.

```text
A swarm leader's hat for a jiangshi: a tall stiff black official hat with a flat top, two short,
thick, paddle-shaped side wings sticking straight out left and right, a wide brass band around the
base and a big round brass knob on top; made a little larger than a normal hat and hollow
underneath so it fits over a smaller round hat. No talisman, no text.
```

### P11 · `nuppeppo` — Nuppeppō

| Mục | Giá trị |
|---|---|
| Bậc | P (1B) |
| Là gì | Khối bột thịt dân gian Nhật. Chết thì tách 2 con; chết vì nổ thì không tách (22.6). |
| Ảnh 2D | `art-src/td/enemies/nuppeppo.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/enemies/nuppeppo.glb` |
| Ghép | Khối A + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 6.000 · rig biped (thân tròn dễ lỗi; lỗi thì không rig, Blender làm khung đơn giản) · clip Tripo: không |
| Blender thêm | `Enemy_Move` (nảy, bóp giãn), `Enemy_Idle`, `Enemy_Attack`, `Enemy_Hit`, `Enemy_Death` (bóp giãn, phụt bột kem) |
| Socket | `FX_HEAD`, `FX_CORE` (chỗ tách đôi), `FX_FEET`, `FX_HAND_R`, `FX_HAND_L` |
| Cao trong game | 2,0 m (quái nhỏ) |
| Model tạm | Chưa có |
| Nhìn từ trên | Khối tròn sáng màu, không có chi nổi. Nảy bóp giãn. |
| Báo trước đòn | Không có. |

- Tự quyết: bột màu mơ kem, nếp gấp nâu quế, má hồng (22.6 không tả màu).
- Tự quyết: Nuppeppō con (`nuppeppo-con`) dùng lại model này thu ×0,8 (1,6 m). Không cần ảnh.

```text
Nuppeppo, a wobbly folk-tale blob creature, silly and soft rather than gross: a round pear-shaped
lump of soft rice dough, a little wider at the bottom and about as wide as it is tall, with three
deep soft sagging folds around the middle; a sleepy wrinkled face low on the front with two small
dark bead eyes (open), a tiny round nose bump and a small pursed mouth; two stubby round arms held
out at the sides; two stubby round feet flat at the bottom. Colours: warm apricot-cream dough,
darker cinnamon-brown shading inside the folds, soft rosy patches on the cheeks. No hair, no clothes.
```

### P12 · `thuong-luong` — Thuồng Luồng (River Serpent)

| Mục | Giá trị |
|---|---|
| Bậc | P (có từ 1A) |
| Là gì | Rắn sông dân gian Việt. Giáp nặng 60 %. Phun vòng nước 5 m đẩy lính. Cần 2 chỗ chặn (22.6). |
| Ảnh 2D | `art-src/td/enemies/thuong-luong.png` · 1536×1024 |
| Góc phụ (nên có) | `thuong-luong-front.png` · 1024×1024 · Khối B + VIEW FRONT + prompt + BG-G |
| Model 3D | `art-src/3d/td/enemies/thuong-luong.glb` |
| Ghép | Khối B + prompt dưới + BG-G |
| Tripo | Image to 3D (hoặc Multiview với ảnh trước) · face limit 6.000 · không rig (Blender làm xương sống chuỗi; có thể thử rig rắn của Tripo) · clip Tripo: không |
| Blender thêm | `Enemy_Move` (trườn lượn ngang), `Enemy_Idle`, `Enemy_Attack`, `Enemy_Hit`, `Enemy_Death` (cột nước, vảy rơi); nên có `Enemy_Skill` (phun vòng nước) |
| Socket | `FX_HEAD` (đỉnh đầu), `FX_TOOL` (miệng: tâm vòng nước), `FX_CORE`, `FX_FEET` (dưới cổ) |
| Cao trong game | Đầu ngóc cao 2,4 m; dài khoảng 6 m. `td-scale` đo chiều cao đầu ngóc (khoảng 2,4 m), không đo chiều dài thân. |
| Model tạm | Chưa có (1A vẽ 2D) |
| Nhìn từ trên | Thân dài chữ S, hàng giáp đá trên lưng, đầu bẹt to. |
| Báo trước đòn | Phun nước báo 0,6–0,8 s. `Enemy_Skill`: ngóc cao hơn, túi cổ phồng lên. |

- Tự quyết: dài khoảng 6 m, đầu ngóc 2,4 m (23.2 chỉ có cỡ quái vừa 2,4–3,2 m).
- Tự quyết: thân xanh đá sẫm, viền giáp đồng, bụng kem. Không dùng xanh ngọc (màu gõ). "Vảy ngọc" khi chết là vảy trắng ánh ngọc trai.

```text
Thuong Luong, a giant river serpent from Vietnamese folk tales (a wild water beast, not a dragon and
not a god), heavy and armoured. It has no legs: a long thick serpent body; a broad flat armoured
head like a smooth river-stone helmet with two short blunt horns pointing back, small fierce but
goofy eyes, mouth closed, two short thick whisker barbels fused to the jaw; a big pale throat pouch
under the jaw; heavy overlapping armour plates along the whole back like a row of rounded slate river
stones edged with dull bronze; a low solid dorsal crest along the spine as one smooth fin; wide
cream belly bands; a broad paddle-shaped tail fin. Colours: deep slate blue body, cream belly, dull
bronze plate edges, small pearly scales on the cheeks; the body is a cool blue-grey with no green or
teal tint. Pose instead of legs: the front third of the body rises in one smooth gentle curve so
the head is held high and level; the rest of the body lies straight back behind the head along an
invisible floor, ending in the broad tail fin; no coils, no loops, no part of the body crossing
another.
```

### P13 · `tanuki` — Lửng Tanuki

| Mục | Giá trị |
|---|---|
| Bậc | P (1B) |
| Là gì | Lửng chó dân gian Nhật. Hồi máu bầy; Trống Bụng Lớn; gõ trực tiếp Ngắt (22.6, 9.2). |
| Ảnh 2D | `art-src/td/enemies/tanuki.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/enemies/tanuki.glb` |
| Ghép | Khối A + prompt dưới + **BG-M** (lá xanh trên đầu) |
| Tripo | Image to 3D · face limit 6.000 · rig biped · clip Tripo: idle, walk |
| Blender thêm | `Enemy_Move` (lạch bạch), `Enemy_Idle`, `Enemy_Attack`, `Enemy_Hit`, `Enemy_Death` (khói be, chiếc lá xoay rơi); nên có `Enemy_Skill` (Trống Bụng Lớn) |
| Socket | `FX_CORE` (bụng: vòng hồi máu), `FX_HEAD` (cuộn Ngắt), `FX_HAND_R`, `FX_HAND_L`, `FX_FEET` |
| Cao trong game | 1,8 m (quái nhỏ) |
| Model tạm | Chưa có |
| Nhìn từ trên | Bụng tròn, lá xanh trên đỉnh đầu, đuôi khoang. |
| Báo trước đòn | `Enemy_Skill`: hai tay vỗ bụng như trống; lúc đó hiện cuộn gõ Ngắt. |

- Tự quyết: lông nâu xám, mặt nạ nâu đậm, bụng kem như mặt trống, lá xanh trên đầu (lá rơi khi chết, 22.6).
- Lá dính liền đầu trong model. Blender tách khối lá lên một xương riêng để lá rơi được khi chết.

```text
A tanuki (raccoon dog) from Japanese folk tales standing on two legs, plump, cheeky and lovable: a
round barrel body with a huge round belly that works as its drum (a smooth pale cream belly patch
like a drum skin), short legs with dark brown fur socks, short arms with small dark paws, a round
raccoon-dog face with a dark brown mask around the eyes, a cream muzzle, a small black nose, round
ears and a cheeky closed-mouth grin. One big broad leaf lies flat on top of its head, fresh leaf
green with a pale midrib, firmly attached. A thick bushy tail with three dark brown rings, curled out
to one side. A simple straw rope tied around the waist under the belly, knotted at the side.
Colours: warm grey-brown fur, dark brown mask and limbs, cream belly and muzzle.
```

### P14 · `troll` — Quỷ Núi Troll

| Mục | Giá trị |
|---|---|
| Bậc | P (1B: "quái bản đồ 1 + Troll") |
| Là gì | Quỷ núi Bắc Âu. Khiên vòm đá 4 m: đạn −70 %. Gõ trực tiếp Phá Khiên. Cần 2 chỗ chặn (22.6, 9.2). |
| Ảnh 2D | `art-src/td/enemies/troll.png` · 1024×1024 |
| Góc phụ (nên có) | `troll-back.png` (thấy rõ khiên đá tròn có rãnh vòng trên lưng) · 1024×1024 · Khối A + VIEW BACK + prompt + BG-M |
| Model 3D | `art-src/3d/td/enemies/troll.glb` |
| Ghép | Khối A + prompt dưới + **BG-M** (rêu xanh) |
| Tripo | Multiview to 3D (ảnh chính ô Front, `troll-back` ô Back) khi có ảnh sau; không có thì Image to 3D · face limit 9.000 · rig biped · clip Tripo: idle, walk |
| Blender thêm | `Enemy_Move` (đi nặng), `Enemy_Idle`, `Enemy_Attack`, `Enemy_Hit`, `Enemy_Death` (hóa đá, vỡ 3 tảng); nên có `Enemy_Skill` (dựng Vòm Đá) |
| Socket | `FX_TOOL` (giữa khiên: tâm vòm đá), `FX_HEAD` (cuộn Phá Khiên), `FX_HAND_R`, `FX_HAND_L`, `FX_CORE`, `FX_FEET` |
| Cao trong game | 4,0 m (quái to). Không chibi (22.1: quái lớn giữ tỉ lệ to). |
| Model tạm | Chưa có |
| Nhìn từ trên | Lưng gù to với khiên đá tròn như mai rùa; tay dài chạm gối. |
| Báo trước đòn | `Enemy_Skill`: khom lưng, hai nắm tay đấm xuống đất; vòm đá mọc lên từ khiên trên lưng (VFX ở `FX_TOOL`). |

- Tự quyết: da đá granite xám có mảng rêu, bờm rơm vàng, khiên đá tròn đeo sau lưng (vòm đá là VFX).
- Khiên dính liền lưng trong model, không tháo ra được. Vì vậy dáng báo trước không gỡ khiên.

```text
A big lumbering mountain troll from Nordic folk tales, storybook style, grumpy but goofy, NOT chibi:
a huge hunched upper body, very long thick arms reaching the knees with big rounded knuckles, short
bowed legs with wide flat feet, a small head sunk between massive shoulders, a big grey stone
potato nose, two short blunt tusks pointing up from the lower jaw, tiny deep-set eyes under a heavy
brow. Skin of rough cool-grey granite with a few big flat moss patches on the shoulders and the top
of the head; a shaggy mane of dry straw-yellow hair as one big solid mass down the back of the neck;
a rough brown hide kilt with a thick rope belt. A large round stone-slab shield carved with simple
concentric ring grooves, strapped flat on its back like a turtle shell, its rim showing behind the
shoulders.
```

### P15 · `alicanto` — Chim Vàng Alicanto

| Mục | Giá trị |
|---|---|
| Bậc | P (1B) |
| Là gì | Chim kho báu dân gian Chile. Bay cao. Trộm 15 Vàng từ đống ở Mỏ, tối đa 2 lần. Gõ trực tiếp Bắt (22.6, 9.2). |
| Ảnh 2D | `art-src/td/enemies/alicanto.png` · 1536×1024 |
| Góc phụ (bắt buộc) | `alicanto-front.png` · 1024×1024 · Khối B + VIEW FRONT + prompt + BG-G. Ảnh nhìn ngang không cho thấy hai cánh xòe rộng tới đâu; ảnh trước thấy rõ hai cánh xòe chữ V hai bên thân |
| Model 3D | `art-src/3d/td/enemies/alicanto.glb` |
| Ghép | Khối B + prompt dưới + BG-G |
| Tripo | Multiview to 3D: `alicanto-front` vào ô Front, ảnh chính vào ô Left · face limit 6.000 · không rig (Blender: `build_winged_rig`; có thể thử rig chim của Tripo) · clip Tripo: không |
| Blender thêm | `Enemy_Move` (bay vỗ cánh), `Enemy_Idle` (lượn), `Enemy_Attack` (khép cánh sà xuống, quắp), `Enemy_Hit`, `Enemy_Death` (lông rụng thành đồng bay về HUD); nên có `Enemy_Skill` |
| Socket | `FX_FEET` (móng: vàng trộm treo ở đây), `FX_HEAD` (cuộn Bắt), `FX_CORE`, `FX_HAND_R`, `FX_HAND_L` (đầu cánh) |
| Cao trong game | Thân dài khoảng 1,8 m, sải cánh khoảng 3 m (quái nhỏ) |
| Model tạm | Chưa có |
| Nhìn từ trên | Đôi cánh đồng thau xòe rộng, đuôi ba lông bản to. |
| Báo trước đòn | Sà 1,2 s có bóng đỏ trên đất (bóng là VFX). |

- Tự quyết: thân 1,8 m, sải cánh 3 m. Cánh đồng thau, đồng đỏ, sẫm hơn vàng kim của tiền (23.3).

```text
The Alicanto, a greedy treasure bird from Chilean folk tales, mischievous rather than scary: a plump
round chest, a short neck, a round head with big round greedy eyes (pale amber, painted, not
glowing) and a short hooked beak, a small crest of three broad stiff feathers; broad wings made of
overlapping metal-like feather plates in burnished antique brass and copper (deeper and browner than
bright coin gold), darker bronze wing tips; a long tail of three broad plate feathers; sturdy
copper-coloured legs with big curled talons, open and empty; warm copper belly feathers. Pose:
standing on both legs, wings raised and half spread above the back in a shallow V, without hiding
the body, tail feathers held straight out behind, angled slightly to one side.
```

### P16 · `mam-go` — Mầm Gỗ

| Mục | Giá trị |
|---|---|
| Bậc | P (1B) |
| Là gì | Quái bầy do Mộc Tinh gọi ở pha 2 (22.6, 22.7). |
| Ảnh 2D | `art-src/td/enemies/mam-go.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/enemies/mam-go.glb` |
| Ghép | Khối A + prompt dưới + **BG-M** (lá xanh) |
| Tripo | Image to 3D · face limit 6.000 · rig biped (lỗi thì không rig) · clip Tripo: idle, walk |
| Blender thêm | `Enemy_Move`, `Enemy_Idle`, `Enemy_Attack`, `Enemy_Hit`, `Enemy_Death` (héo rũ) |
| Socket | `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_HAND_R`, `FX_HAND_L` |
| Cao trong game | 1,6 m (bầy) |
| Model tạm | Chưa có |
| Nhìn từ trên | Hai lá to xòe trên đỉnh đầu, như cánh quạt. |
| Báo trước đòn | Không có. |

- Tự quyết: thân vỏ đa nâu xám, hai lá vàng chanh sáng hơn cỏ, để nổi trên đồng cỏ.

```text
Mam Go, a tiny living sapling spirit called up by an old banyan, grumpy and cute: a short stubby
body of smooth grey-brown banyan bark shaped like a thick root, two short root legs ending in flat
splayed root feet, two short twig arms ending in three blunt twig fingers, a simple face carved into
the bark (two round dark knot-hole eyes, a small surprised round dark mouth). On top of the head a
short thick stem with two big round leaves spreading left and right like a sprout, light
lime-yellow-green with darker veins, thick and solid. Colours: warm grey-brown bark, darker brown cracks,
lime-yellow-green leaves.
```

### Đàn Ma Trơi (`ma-troi`) — chỉ là VFX

- Bầy đốm lửa ma bay thấp 3 m (22.6). Không có model, không có ảnh Tripo (27.2).
- Ảnh ở `03-2d-scenery-ui-vfx.md`: X11 `ma-troi-wisp` (đốm, flipbook) và X12 `ma-troi-sheet` (tờ tham khảo dáng đàn và cảnh chết).
- Ma Trơi nhỏ (`ma-troi-nho`, VS) dùng cùng hình đó.

## 10. Boss

### P17 · `moc-tinh` — Mộc Tinh (the Nameless Banyan)

| Mục | Giá trị |
|---|---|
| Bậc | P (boss nhỏ bản đồ 1 ở 1B; bản đầy đủ bản đồ 3 ở VS dùng cùng model) |
| Là gì | Tinh cây đa dân gian Việt, yêu tinh chứ không phải thần. Cây đa thành người cao 7 m (22.7). |
| Ảnh 2D | `art-src/td/bosses/moc-tinh.png` · 1024×1536 |
| Góc phụ (nên có) | `moc-tinh-side.png`, `moc-tinh-back.png` · 1024×1536 · Khối A + VIEW SIDE (hoặc VIEW BACK) + prompt + BG-M |
| Model 3D | `art-src/3d/td/bosses/moc-tinh.glb` |
| Ghép | Khối A + prompt dưới + **BG-M** (tán lá xanh) |
| Tripo | Multiview to 3D (có góc phụ) hoặc Image to 3D · face limit 30.000 · rig biped · clip Tripo: idle, walk |
| Blender thêm | `Boss_Intro`, `Boss_Idle`, `Boss_Move`, `Boss_Attack` (quật cành), `Boss_Skill.root-burst` (Rễ Trồi), `Boss_Skill.summon` (gọi Mầm Gỗ), `Boss_Skill.root-wall` (Cắm Rễ, bản đồ 3), `Boss_Skill.seed-drop` (rải hạt, bản đồ 3), `Boss_Channel` (Ngủ Rễ hồi máu), `Boss_Stun` (choáng ở 70 %), `Boss_Hit`, `Boss_Phase`, `Boss_Death` (hóa lại thành cây, bản đồ 3); nên có `Boss_Retreat` (chui xuống đất ở 50 %, bản đồ 1) |
| Socket | `FX_CORE` (hốc ngực: Mực Câm chảy ra), `FX_HEAD` (mặt), `FX_HAND_R`, `FX_HAND_L` (quật cành), `FX_FEET` (tâm Rễ Trồi) |
| Cao trong game | 7 m (22.7; boss 7–10 m, 23.2). Không chibi, khối mập (23.1). |
| Model tạm | `bosses/lieutenant-nature` (clip `Boss_Idle_Hover`, `Boss_Hit`, `Boss_Death`, `Boss_Intro`, 23.9) |
| Nhìn từ trên | Tán lá to như bờm, hai tay rễ bện dài. |
| Báo trước đòn | Rễ Trồi báo 1,5 s bằng decal trên đất đúng cỡ (23.5). Rễ trồi dùng model `root-burst.glb` của chủ dự án (22.7); file này chưa có, ảnh Tripo ở `02-tripo-buildings-props.md`, P18. |
| Hình 2D | Chân dung C21 ở `03-2d-scenery-ui-vfx-vs.md` |

- Một ảnh gốc, dáng trung tính. Dáng các pha là việc texture và VFX: Bóc Vỏ (vỏ bong, Dễ Tổn Thương), cháy, Ngủ Rễ, độ đậm của mực chảy từ hốc ngực, Tường Rễ. Không cần ảnh Tripo cho từng pha.
- Tự quyết: tên clip chiêu `Boss_Skill.root-burst`, `.summon`, `.root-wall`, `.seed-drop` (23.9 chỉ ghi `Boss_Skill.<tên>`).
- Tự quyết: vỏ đa xám bạc, mắt hổ phách vẽ (không phát sáng), quả đa nâu hổ phách (không đỏ, giữ đỏ cho nguy hiểm).

```text
Moc Tinh, the Nameless Banyan: a huge ancient banyan tree spirit from Vietnamese folk tales (a tree
goblin, not a god) that has become a giant standing on two root legs, massive and chunky, NOT
chibi. A broad trunk-like body of smooth silver-grey banyan bark with deep vertical folds; two thick legs of twisted roots braided
together, ending in wide splayed root feet flat on the floor; two long heavy arms of thick braided
aerial roots (thick braided columns, never thin strands) ending in big gnarled root hands with four
blunt fingers; a broad old face carved into the upper trunk: a heavy brow ridge, a long sad mouth,
deep-set amber eyes (painted amber, no glow); an empty dark knot-hole cavity in the middle of the
chest; a wide mane-like crown of banyan leaves made of six or seven huge rounded leaf masses around
the head and shoulders, deep green with lighter yellow-green tops, with a few clusters of small round
amber-brown figs; a few short thick aerial-root braids hanging from the crown and fused to the
shoulders. Calm, sorrowful, ancient.
```

## 11. Bậc VS

Ở file [`01-tripo-characters-enemies-vs.md`](01-tripo-characters-enemies-vs.md):

| Nhóm | Mục |
|---|---|
| Tướng | Tre (`tre`) + búa gỗ, ná tre; Chuồn Chuồn Tre (`chuon-chuon-tre`) |
| Lính | Lính Khiên (`linh-khien`) + khiên đồng; Lính Giáo Dài (`linh-giao-dai`) + giáo dài |
| Thợ | Một thân thợ chung (`worker-base`) + 24 bộ gắn (đồ đầu, đồ nghề, áo giáp) cho 10 tổ thợ (22.4). Chân dung tổ thợ ở `03-2d-scenery-ui-vfx-vs.md` chép theo các bộ gắn này |
| Quái | Oni (`oni`) + chùy, Tất Phương (`tat-phuong`), Ma Da (`ma-da`), Dokkaebi (`dokkaebi`) + gậy, Chồn Liềm (`kamaitachi`) |
| Boss | Đại Bàng Tinh (`dai-bang-tinh`) |
| Thú | Trâu (`trau`), Heo Đất Vàng (`piggy`) |
| Đồ Thư Đồng | Sách nhỏ (`helper-book`), quạt nan (`helper-fan`) cho biến thể `.support` (Đài Ấn, Nhà Thuốc) |

## 12. Bậc Sau (chỉ danh sách)

| Món | Ghi chú |
|---|---|
| Thế giới 2 Cồn Cát Hổ Phách | 1–2 Tướng mới, 1 bộ Trợ Thủ (cùng khung xương), 6–8 loài quái (Săn, bay đậu, chở quân, bắn xa), boss Nhân Sư Cát; dân cáo sa mạc đưa tin, thợ đồng hồ cát (26.3) |
| Thế giới 3 Bắc Phong Tuyết Ngâm | Như trên; hải mã thợ rèn, chim cánh cụt đưa thư |
| Thế giới 4 Quần Đảo Biển Sao | Như trên; tinh linh sao; Kẻ Cầm Tẩy lộ mặt (22.1) |
| Thế giới 5 Cao Nguyên Hỏa Thạch | Như trên; làng chăn lạc đà không bướu, thợ đá |
| Tổ thợ thế giới mới | Bộ gắn mới trên thân thợ chung (CivKit, 23.12) |
| Trang phục | Tướng và Trợ Thủ, sau MVP (3.2, 26.2) |
| CGI dựng sẵn (C4) | Dùng lại model Tripo, không cần ảnh mới (23.13) |

- Không gửi Tripo: Bà Cú Mực (người kể, chân dung C8 ở `03-2d-scenery-ui-vfx.md`). Ở Thư Thành, người đón (Đội trưởng Sấm, Chú Đẽo, Trò Mực, Cô Rái Bông) là tranh 2D (22.8, 28.12).
- Trong trận, Đội trưởng Sấm và Trò Mực vẫn là thợ 3D ở nhà (file VS, mục 5).

## 13. Cho AI ghép file

- Công cụ: `scripts/models/blender/space_typing_model_tools.py`. Việc mới theo 23.9: `--kind helpers|units|buildings`, ánh xạ xương Tripo sang vai trò, `make_ground_hero_clips`, `make_helper_clips`, `make_soldier_clips`, `make_worker_clips`, `bake_vat.py`, ảnh xem trước cho chủ dự án duyệt. Hàm có sẵn: `make_boss_bone_clips`, `build_winged_rig`, `make_flight_clips`, `make_dragon_clips`, `make_guide_clips`, `make_hero_bone_clips`.
- Preset `scripts/models/presets/td-models.json` sinh từ bảng 23.9. Manifest chạy: `public/assets/td/models/manifest.json` (Git giữ manifest, bỏ media).
- Chuẩn hóa: mét, +Y lên, mặt trước −Z (`src/render3d/model-contracts.ts`). Cỡ theo dòng "Cao trong game" của từng mục.
- Không chuyển động gốc. Mọi đòn một lần bắt đầu và kết thúc ở tư thế đầu của Idle (23.9).
- Món gắn: đặt vào socket hoặc xương ghi ở dòng "Gắn vào". `FX_TOOL` của lính đặt ở mũi giáo.
- Mọi nhân vật có đủ 6 socket của 23.9. Socket nào mục không ghi thì đặt trùng `FX_CORE`. Không có tay (Thuồng Luồng): `FX_HAND_R`, `FX_HAND_L` đặt ở hai bên miệng.
- Dây màu P2c, P3b, P4b: tách vùng dây kem của P1 một lần (mặt chọn tay), trải UV thẳng theo dây, tạo 3 vật liệu từ 3 texture. Mỗi Thư Đồng dùng một vật liệu. Lắp ba Thư Đồng theo ảnh mẫu P6.
- Khung xương thật tối đa 8 cùng lúc (Tướng, ≤ 3 Trợ Thủ, boss, ≤ 3 quái tinh nhuệ gần camera). Quái bầy, lính: nướng VAT hoặc shader trên instanced mesh; model có xương vẽ instanced thì nướng tư thế đứng (23.9).
- Giảm tam giác theo ngân sách 25.12 (High: khung ≤ 5,5 ms, ≤ 150 draw call).
- Manifest ghi nguồn từng file: công cụ (ChatGPT, Tripo), gói, ngày, mã mục và prompt trong file này (27.1).
- Vệt Mực Câm là shader chung của quái (22.6); viền vàng tinh nhuệ cũng là shader (14.2).

**Chỗ design chưa nói và việc đã tự quyết:**

| Việc | Tình trạng |
|---|---|
| Màu model Draconis v2 khác mô tả 22.2 | Tự quyết (22/10, đổi được): dáng ảnh 3.png; model mới P18, v2 là model tạm (mục 7) |
| Ảnh mẫu 2.png (Lam), 3.png (Draconis) | Tự quyết (22/10, đổi được): chủ dự án lưu ở `art-src/td/refs/`. 2.png tùy chọn; 3.png nên đính kèm cho ảnh chính P18. Ảnh góc phụ không dùng 2.png, 3.png |
| `root-burst.glb` (22.7) | Không có trong repo, `art-src/` hay `media.md5` (kế hoạch V5 để ở đợt D, chưa làm). Đã thêm ảnh Tripo: `02-tripo-buildings-props.md`, P18 |
| Lính, thợ không có ở cột model của 27.2 | Lính Giáo vào P (lý do ở mục 8; 27.2 đã ghi từ 22/10); còn lại vào VS |
| Bộ gắn Phẩy, Gạch ghi ở cả P và VS (27.2) | Xếp vào P (mục 6) |
| 23.2 không có cỡ cho quái bầy | Tự quyết 1,6–1,8 m (mục 9) |
| 23.9 không có hàng clip cho thú (trâu, heo đất, chuồn chuồn) | Mượn tên clip theo vai (file VS, mục 8) |
| 23.9 chưa ghi `--kind` cho thợ (chỉ `helpers`, `units`, `buildings`) | Đề xuất thợ đi chung `units`; AI ghép quyết khi làm `make_worker_clips` |
| Chân dung ở file 03 (LOOK-OWLET, C9–C22) chép từ file này và file VS | Đã đối chiếu ngày 22/10. Sửa ở đây thì báo người giữ file 03 sửa theo |
| `04-audio.md` A58 từng tả Troll "đập chùy đá" | Đã sửa (22/10): A58 nay là Troll đấm nắm tay đá, khớp P14 |
| `td-scale.mjs` (23.2) đo hộp bao, nhưng Thuồng Luồng dài 6 m | Tự quyết (22/10, đổi được): `td-scale` đo Thuồng Luồng theo chiều cao đầu ngóc (khoảng 2,4 m), không theo thân dài 6 m |
| Đậu mái của Draconis | Tự quyết (22/10, đổi được): `FX_perch` = `FX_top` + 0,6 m ở nhà có mái (23.9); Tháp Pháo (mọi cấp), Đài Ấn theo file 02, mục 8 |
| `td-scale.mjs` (23.2) đo hộp bao, nhưng đầu cánh Draconis giơ cao hơn đầu | Tự quyết (22/10, đổi được): đo Draconis từ gót chân tới đỉnh đầu (thân 3,5 m), không tính sừng, cánh, đuôi; Blender đặt tỉ lệ theo đỉnh đầu (mục 7, P18) |
| Draconis P18 qua Tripo: rig biped hay không rig | Tự quyết (22/10, đổi được): không rig. `build_winged_rig` chỉ chạy trên một mesh chưa có xương; Blender dựng cả khung xương và clip bay (mục 7, P18). Muốn dùng rig biped của Tripo thì phải viết thêm hàm gắn xương cánh vào khung Tripo |
