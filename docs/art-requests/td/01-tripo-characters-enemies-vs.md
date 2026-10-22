# Prompt ảnh 2D cho Tripo: bậc VS — Typing Defense (22/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh bằng ChatGPT, dựng model bằng Tripo); ChatGPT (đọc file này rồi tạo ảnh); AI ghép file sau đó (Blender, manifest).
> **Lấy từ:** `docs/td/TYPING_DEFENSE_DESIGN.md` mục 0.6, 3.2, 7.8, 8.4, 11.4, 12.3, 13, 22.2–22.4, 22.6, 22.7, 22.10, 23.1–23.3, 23.7–23.12, 27.2.
> **File chính:** [`01-tripo-characters-enemies.md`](01-tripo-characters-enemies.md). Ở đó có cách làm và đường dẫn (mục 1), màu giữ riêng (mục 3.7), kiểm ảnh (mục 4), thiết lập Tripo (mục 5), bậc P và bậc Sau. File này chỉ có bậc VS.
> **Chân dung và ảnh trượt** của các nhân vật dưới đây (không gửi Tripo): [`03-2d-scenery-ui-vfx-vs.md`](03-2d-scenery-ui-vfx-vs.md).
> **Khi nào làm:** sau bậc P, cho bước 5 "Lát dọc" (26.2).

```text
Instructions for ChatGPT
- You make source images that the owner uploads to an image-to-3D tool (Tripo).
- Every image in this file has a code (VS1a, VS5-K01, ...), an exact file name, a size and a
  recipe line "Ghép: ...". Build the prompt by joining, in this order: the common block named
  in the recipe (section 1), the item prompt, then the background line named in the recipe
  (BG-G, BG-M or BG-B). Keep every sentence; do not shorten, soften or "improve" them.
- One image per subject: one character, creature or object per image. Never put two views or
  two subjects in one image. Extra views (-side, -back, -front) are separate images built with
  the VIEW lines, with the approved main image of the same item attached as the only reference.
- Use the exact size given. Above each image, write its exact file name so the owner can save
  it under that name.
- No text, letters, numbers, logos or watermarks inside any image. Scrolls stay blank.
- Keep one character identical across its views (colours, proportions, pose, scale). For the
  worker kits (VS5-K01 to K24), ask the owner to attach worker-base.png; for the owlet items
  (VS14a, VS14b), helper-owlet.png. That image is only a scale and colour reference: draw the
  object alone, never the character.
- Before drawing, list the images you will make (code, file name, size) in a short table.
- If anything is unclear or conflicts with this file, ask the owner a short question in
  Vietnamese instead of guessing.
```

## 1. Khối chung (bản sao của file chính, mục 3)

Giống hệt file chính. Sửa ở đó thì sửa cả ở đây. Ví dụ "Khối A + prompt + BG-G": dán khối A, rồi prompt của mục, rồi dòng BG-G.

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

Góc phụ: khối của mục + dòng VIEW + prompt của mục + dòng nền. Chỉ đính kèm ảnh chính đã duyệt của mục đó. Dòng VIEW thay dòng "Camera" và chữ "facing the viewer" của khối; VIEW FRONT thay cả dòng "Framing". Chữ trái, phải trong prompt của mục tả ảnh chính; dòng VIEW nói cách đổi.

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

```text
[BG-G] Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no green at all.
[BG-M] Flat pure #FF00FF magenta background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no pink, magenta or bright purple at all.
[BG-B] Flat pure #0000FF blue background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no blue at all.
```

BG-G mặc định. BG-M khi vật có màu xanh lá, không có hồng hay tím hồng. BG-B khi vật có cả xanh lá và hồng hoặc tím hồng. Ba dòng này giống từng chữ ở mọi file ảnh của bộ (file 03 viết tắt G, M, B).

## 2. Danh sách VS

Cột ảnh bỏ tiền tố `art-src/td/`. Model cùng đường dẫn dưới `art-src/3d/td/`, đuôi `.glb`.

| Mã | id | Tên · là gì | Ảnh 2D |
|---|---|---|---|
| VS1a | `tre` | Tướng Tre, cô thợ mộc tre | `heroes/tre.png` (+ `-side`, `-back`) |
| VS1b | `tre-mallet` | Búa gỗ to của Tre | `heroes/tre-mallet.png` |
| VS1c | `tre-slingshot` | Ná tre của Tre | `heroes/tre-slingshot.png` |
| VS2 | `chuon-chuon-tre` | Chuồn Chuồn Tre, bạn đồng hành của Tre | `animals/chuon-chuon-tre.png` |
| VS3a | `linh-khien` | Lính Khiên (nhánh Khiên Đồng) | `units/linh-khien.png` |
| VS3b | `linh-khien-shield` | Khiên đồng | `units/linh-khien-shield.png` |
| VS4a | `linh-giao-dai` | Lính Giáo Dài (nhánh Giáo Dài) | `units/linh-giao-dai.png` |
| VS4b | `linh-giao-dai-spear` | Giáo dài | `units/linh-giao-dai-spear.png` |
| VS5a | `worker-base` | Thân thợ chung của 10 tổ thợ | `workers/worker-base.png` |
| VS5-K01…K24 | `worker-kit-*` | Bộ gắn đầu, đồ nghề, áo giáp theo tổ thợ | `workers/worker-kit-*.png` |
| VS6a | `oni` | Quỷ Oni, phá nhà | `enemies/oni.png` |
| VS6b | `oni-club` | Chùy sắt của Oni | `enemies/oni-club.png` |
| VS7 | `tat-phuong` | Tất Phương, chim một chân tự nổ | `enemies/tat-phuong.png` |
| VS8 | `ma-da` | Ma Da, hồn nước tàng hình | `enemies/ma-da.png` |
| VS9a | `dokkaebi` | Yêu Tinh Dokkaebi, gọi Ma Trơi | `enemies/dokkaebi.png` |
| VS9b | `dokkaebi-club` | Gậy của Dokkaebi | `enemies/dokkaebi-club.png` |
| VS10 | `kamaitachi` | Chồn Liềm, bay thấp trên lốc | `enemies/kamaitachi.png` |
| VS11 | `dai-bang-tinh` | Boss Đại Bàng Tinh | `bosses/dai-bang-tinh.png` (+ `-front`) |
| VS12 | `trau` | Trâu (trâu Mộng của Ruộng Lúa) | `animals/trau.png` |
| VS13 | `piggy` | Heo Đất Vàng | `animals/piggy.png` |
| VS14a | `helper-book` | Sách nhỏ Thư Đồng lật ở nhà hỗ trợ | `helpers/helper-book.png` |
| VS14b | `helper-fan` | Quạt nan Thư Đồng quạt nồi ở nhà hỗ trợ | `helpers/helper-fan.png` |

Không cần ảnh:
- Ma Trơi nhỏ (`ma-troi-nho`): VFX, dùng hình X11, X12 ở `03-2d-scenery-ui-vfx.md`.
- Nuppeppō con (`nuppeppo-con`): dùng lại model P11 thu nhỏ.
- Cương Thi Đầu Đàn (`cuong-thi-lead`): model P9 phóng to + mũ P10.
- Mộc Tinh bản đồ 3: cùng model P17.

## 3. Tướng

### VS1 · `tre` — Thợ Cả Tre Xanh (Bamboo Wright) và đồ nghề

| Mục | Giá trị |
|---|---|
| Bậc | VS (27.2) |
| Là gì | Tướng hỗ trợ, kỹ sư: sửa nhà, Rào Tre, bắc Cầu Tre; ná bắn đất và bay thấp (22.2). |
| Ảnh 2D | VS1a `art-src/td/heroes/tre.png` · 1024×1536 · VS1b `art-src/td/heroes/tre-mallet.png` · 1536×1024 · VS1c `art-src/td/heroes/tre-slingshot.png` · 1024×1024 |
| Góc phụ (nên có) | `tre-side.png`, `tre-back.png` · 1024×1536 (thấy rõ gùi và cần cẩu) · Khối A + VIEW SIDE (hoặc VIEW BACK) + prompt VS1a + BG-M |
| Model 3D | `art-src/3d/td/heroes/tre.glb`, `tre-mallet.glb`, `tre-slingshot.glb` |
| Ghép | VS1a: Khối A + prompt + **BG-M** (khăn xanh tre) · VS1b, VS1c: Khối C + prompt + BG-G |
| Tripo | VS1a: face limit 20.000 · rig biped · clip Tripo: idle, run · VS1b, VS1c: face limit 2.000 · không rig |
| Blender thêm | `Hero_Idle`, `Hero_Run`, `Hero_Attack` (bắn ná), `Hero_Skill1` (Rào Tre), `Hero_Skill2` (thả Chuồn Chuồn Tre), `Hero_Ult` (Giàn Giáo Thần Tốc), `Hero_Assist` (lặp: gõ búa lên cột), `Hero_Hit`, `Hero_Death` (ngồi bệt, sao xoay), `Hero_Respawn`, `Hero_Victory`; nên có `Hero_Idle_Fidget`, `Hero_Ult_Echo`, `Hero_Assist_Beat`, `Hero_Bridge` |
| Socket | `FX_HAND_R` (búa), `FX_HAND_L` (ná), `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_TOOL` (miệng gùi: Mảnh Chữ bay vào, 23.8) |
| Cao trong game | 2,6–2,9 m (23.2). Đặt 2,6 m. |
| Model tạm | Chưa có |
| Hình 2D | Chân dung C10, ảnh trượt Tối Thượng C25: `03-2d-scenery-ui-vfx-vs.md` |

- Tự quyết: khăn rằn ô xanh tre `#A8D05A` và kem (màu Tướng Tre, 23.3), thay cho ô đen trắng.
- Tự quyết: búa và ná là món rời; trong ảnh chính hai tay nắm hờ, không cầm gì. Búa dài ≈ 0,9 m, ná cao ≈ 0,35 m. Màu áo 2 (Tướng cấp 3, 15.1) là biến thể texture.

**VS1a**
```text
Tre, the Bamboo Wright: a 15-year-old village carpenter girl, chibi proportions about 2.5 heads
tall, practical and cheeky. Dark hair in a round bun on top with a bamboo pencil pushed through it
(the pencil fused into the bun); a checked scarf in bamboo green (#A8D05A) and cream tied around the
neck with a short knot, the ends short and stiff; a brown collarless traditional Vietnamese blouse
(ao ba ba) with the sleeves rolled up to the elbows; a dark leather work apron with three big
pockets; wide dark trousers; wooden clogs. A bamboo backpack basket on her back with a folded bamboo
crane arm strapped flat along its side, every part touching the basket. Both hands are loose closed
fists as if gripping handles that are not there; nothing in the hands (her mallet and slingshot are
separate items). Confident closed-mouth grin. Symmetrical except the basket and the hair pencil.
```

**VS1b**
```text
Tre's big carpenter's mallet: a fat barrel-shaped hardwood head bound with two dark iron rings, a
straight sturdy handle about three times as long as the head, a leather grip wrap near the end.
Lying horizontally across the image, exact side view instead of the three-quarter view, head
pointing right.
```

**VS1c**
```text
Tre's bamboo slingshot: a thick Y-shaped forked frame of dry tan bamboo with a cord-wrapped handle,
a wide flat leather band joined to both prong tips and hanging slack between them as one solid strip
(no thin rubber strings), a small leather pouch in the middle of the band.
```

### VS2 · `chuon-chuon-tre` — Chuồn Chuồn Tre

| Mục | Giá trị |
|---|---|
| Bậc | VS (27.2: "chuồn chuồn") |
| Là gì | Bạn đồng hành luôn bay cạnh Tre. Kỹ năng 2: sửa nhà hư nặng nhất, lộ tàng hình; bậc 3 có vòng hút Mảnh Chữ riêng (22.2). |
| Ảnh 2D → Model | `art-src/td/animals/chuon-chuon-tre.png` → `art-src/3d/td/animals/chuon-chuon-tre.glb` · 1536×1024 |
| Ghép | Khối C + prompt + **BG-M** (sọc xanh tre) |
| Tripo | Face limit 2.000 · không rig · không clip |
| Blender thêm | `Helper_Idle` (bay lơ lửng), `Helper_Walk` (bay theo Tre), `Helper_Assist.craft` (sửa nhà), `Helper_Cheer` |
| Socket | `FX_CORE` (tia sửa nhà, vòng hút), `FX_HEAD` |
| Cao trong game | Sải cánh 1,0 m, bay quanh vai Tre |

- Tự quyết: góc 3/4 nhìn từ trên 35°, không nhìn ngang. Cánh nằm ngang; nhìn ngang thì cánh thành một vạch và Tripo mất cánh.
- Tự quyết: 23.9 không có hàng clip cho thú. Chuồn chuồn mượn tên clip Trợ Thủ vì nó làm việc giống Trợ Thủ (sửa nhà). Sải cánh 1,0 m; face limit 2.000 như món gắn.

```text
Chuon Chuon Tre, Tre's magical bamboo dragonfly, like the classic balancing bamboo toy come to life:
a small round bamboo head with two big round painted eyes (black dots on cream); a short, thick,
straight bamboo body with three darker bands; two long, wide, flat wings carved from dry bamboo,
each a broad paddle shape with rounded tips and one painted bamboo-green (#A8D05A) stripe, spread
straight out left and right and angled slightly down, joined solidly to the body. No legs, no thin
parts. Camera: three-quarter view from the front and about 35 degrees above, so the full wing
shapes show.
```

## 4. Lính

Lính Khiên, Lính Giáo Dài là lính của hai nhánh Trại Lính (12.3, 3.2). Cùng bảng màu dân quân với Lính Giáo (P8): áo chàm, đai xanh `#3B7DDD`. Cao 1,7–2,0 m (23.2), đặt 1,85 m. Mọi lính: face limit 5.000 · rig biped · clip Tripo: idle, walk. Món gắn: face limit 2.000 · không rig.

Blender thêm cho mọi lính: `Unit_Idle`, `Unit_Walk`, `Unit_Attack`, `Unit_Hit`, `Unit_Death`, `Unit_Cheer`; nên có `Unit_Charge`. Lính Khiên thêm `Unit_Skill` (giơ khiên, Khiên Tường).

### VS3 · `linh-khien` — Lính Khiên và khiên đồng

| Mục | Giá trị |
|---|---|
| Là gì | Lính nhánh Khiên Đồng: chặn 2 chỗ, khiên "đoang", Khiên Tường vòm đồng mờ (12.3, 13, 23.8). |
| Ảnh 2D | VS3a `art-src/td/units/linh-khien.png` · 1024×1536 · VS3b `art-src/td/units/linh-khien-shield.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/units/linh-khien.glb`, `linh-khien-shield.glb` |
| Ghép | VS3a: Khối A + prompt + BG-G · VS3b: Khối C + prompt + BG-G |
| Socket | `FX_HAND_L` (khiên), `FX_HAND_R` (giáo ngắn), `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_TOOL` (giữa khiên: vòm đồng) |
| Model tạm | Chưa có |

- Tự quyết: khiên là món rời để Blender giơ khiên trong `Unit_Skill`. Khiên rộng ≈ 0,9 m. Giáo ngắn dùng lại `linh-giao-spear` (P8b) thu ×0,7, không cần ảnh mới.

**VS3a**
```text
Linh Khien, a shield soldier of the Van Dien village militia: a broad, stocky young man, chibi
proportions about 2.5 heads tall, sturdier than the spearman. A rounded bronze helmet with a short
brim and a small knob on top; a padded deep-indigo tunic with a wide sky-blue (#3B7DDD) sash; a short
vest of overlapping bronze scale plates over the chest; dark brown knee trousers, cream leg wraps,
straw sandals. Steady, protective face. Both hands are loose closed fists as if gripping handles
that are not there (shield and spear are added later). Nothing in the hands, nothing on the arms.
```

**VS3b**
```text
A round bronze militia shield: thick and slightly domed, warm hammered bronze with a raised rim,
decorated with simple concentric rings, a ring of small triangles and a small sun-star in the centre
(inspired by ancient bronze drums; no writing, no figures), a round boss in the middle. Seen in a
front three-quarter view; the grip side is hidden.
```

### VS4 · `linh-giao-dai` — Lính Giáo Dài và giáo dài

| Mục | Giá trị |
|---|---|
| Là gì | Lính nhánh Giáo Dài: 150 máu, 12–18 VL, đâm xuyên 2 (12.3). |
| Ảnh 2D | VS4a `art-src/td/units/linh-giao-dai.png` · 1024×1536 · VS4b `art-src/td/units/linh-giao-dai-spear.png` · 1536×1024 |
| Model 3D | `art-src/3d/td/units/linh-giao-dai.glb`, `linh-giao-dai-spear.glb` |
| Ghép | VS4a: Khối A + prompt + BG-G · VS4b: Khối C + prompt + BG-G |
| Socket | `FX_HAND_R` (giáo), `FX_HAND_L`, `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_TOOL` (mũi giáo) |
| Model tạm | Chưa có |

- Tự quyết: thân riêng có giáp lá tre sơn, trông dày dạn hơn Lính Giáo. Giáo dài khoảng 3 m.

**VS4a**
```text
Linh Giao Dai, a long-spear veteran of the Van Dien village militia: a tall, confident man, chibi
proportions about 2.5 heads tall. A pointed straw-coloured bamboo hat with a sky-blue (#3B7DDD)
cloth band; a lamellar vest of small lacquered dark-brown bamboo plates laced in rows over a
deep-indigo tunic; padded shoulder guards; a wide sky-blue sash; dark brown trousers, cream leg
wraps, straw sandals. Both hands are loose closed fists as if gripping a long pole that is not
there. Nothing in the hands.
```

**VS4b**
```text
A long militia war spear: a straight sturdy dark-lacquered wooden shaft about eighteen times as long
as it is thick, a long narrow iron blade with two short blunt side spurs at its base, plain
silver-grey, one compact sky-blue (#3B7DDD) cloth knot below the blade (no hanging strands), an iron
butt cap. Lying horizontally across the image, exact side view instead of the three-quarter view,
blade pointing right.
```

## 5. Thợ (tổ thợ ở nhà)

Mỗi nhà có tổ thợ biết nói (22.4). Thợ nhỏ, cao 1,2–1,4 m (23.2), 2–2,5 đầu (23.1). Thợ đứng ở `FX_crew` của nhà (vị trí ghi ở `02-tripo-buildings-props.md`), làm việc theo nhịp chữ. Chân dung tổ thợ (2D) là C11–C20 ở `03-2d-scenery-ui-vfx-vs.md`.

- Tự quyết: một thân thợ chung (VS5a) + bộ gắn theo tổ (K01–K24). Lý do: CivKit 23.12 chỉ đổi áo, mũ, đồ theo văn minh; một khung xương cho mọi tổ; vẽ instanced rẻ (25.12).
- Tự quyết: đồ đầu, râu, đồ nghề và màu áo của từng tổ ghi ở bảng dưới và ở K01–K24. Chân dung C11–C20 (`03-2d-scenery-ui-vfx-vs.md`) chép theo đây; hai file khác nhau thì theo file này. Blender tô lại màu áo của thân chung theo bảng.
- Tự quyết: trẻ con (Em Sẻ, cậu Lửa, Trò Mực) thu ×0,85. Ba anh em thợ mỏ dùng chung bộ gắn, cỡ ×1,0 / 0,95 / 0,9.
- Tự quyết: Em Sẻ là em trai của Chị Én, khớp giọng `archer-em-se` ở `04-audio.md` và chân dung C12.
- Tự quyết: Thầy Đồ Mực cầm bút `helper-brush` (P5a ở file chính) phóng ×1,6. Không cần ảnh mới.
- Tripo hay bít kín lỗ mặt và lòng mũ của đồ đầu. Lòng mũ đặc không sao (nằm trong đầu). Lớp bít ở lỗ mặt thì Blender xóa.
- Trâu Mộng của Cô Mạ ở VS12.

| Tổ thợ | Màu áo (Blender tô) | Chân dung |
|---|---|---|
| Lão Gác Cổng | Nâu, áo bông | C11 |
| Chị Én | Xanh than viền trắng | C12 |
| Em Sẻ | Nâu | C12 |
| Bác Đồng | Nâu xám ám khói | C13 |
| Cậu Lửa | Kem (giữ nguyên) | C13 |
| Thầy Đồ Mực | Xanh mực đậm | C14 |
| Đội trưởng Sấm | Nâu, thêm áo giáp tre K24 | C15 |
| Ba anh em thợ mỏ | Nâu bụi | C16 |
| Cô Mạ | Nâu | C17 |
| Chú Tiều | Kem (giữ nguyên) | C18 |
| Trò Mực | Xám xanh | C19 |
| Bà Lang Thơm | Nâu (tạp dề) | C20 |

### VS5a · `worker-base` — Thân thợ chung

| Mục | Giá trị |
|---|---|
| Ảnh 2D → Model | `art-src/td/workers/worker-base.png` → `art-src/3d/td/workers/worker-base.glb` · 1024×1536 |
| Ghép | Khối A + prompt + BG-G |
| Tripo | Face limit 5.000 · rig biped · clip Tripo: idle, walk |
| Blender thêm | `Worker_Work`, `Worker_Strike` (một nhát mỗi chữ); nên có `Worker_Cheer` |
| Socket | `FX_HEAD` (bộ gắn đầu), `FX_HAND_R` (đồ nghề), `FX_HAND_L`, `FX_CORE`, `FX_FEET`, `FX_TOOL` (đầu đồ nghề: tia lửa cuốc, mùn gỗ) |
| Cao trong game | 1,4 m; trẻ con ×0,85 ≈ 1,2 m (23.2: thợ 1,2–1,4 m) |
| Model tạm | Chưa có |

```text
A small village worker of Van Dien, the base body shared by every building crew (hats, hair and
tools are added later as separate pieces): a friendly adult villager, chibi proportions about 2.25
heads tall, average build, a round face with a calm closed-mouth smile, short neat dark hair as one
smooth cap close to the head so hats fit on top; a plain collarless undyed-cream work tunic with
short sleeves, a brown cloth belt, knee-length brown trousers, bare forearms and calves, simple straw
sandals. Both hands are loose closed fists as if gripping tool handles that are not there. Nothing
in the hands, nothing on the head.
```

### VS5-K01…K24 · Bộ gắn theo tổ thợ

Mọi bộ gắn: Khối C + prompt + nền ghi ở bảng · face limit 2.000 · không rig · không clip. Ảnh ở `art-src/td/workers/<id>.png`, model ở `art-src/3d/td/workers/<id>.glb`. Đồ đầu gắn `FX_HEAD`. Đồ nghề gắn `FX_HAND_R` (dùi trống: cả hai tay; ống tên: sau lưng; quả đạn: ôm trước bụng). Áo giáp tre K24 ép sát lên ngực, gắn xương ngực.

| Mã | id | Tổ thợ (nhà) | Món | Cỡ | Nền |
|---|---|---|---|---|---|
| K01 | `worker-kit-gatekeeper-head` | Lão Gác Cổng (Lũy Chữ) | Mũ sắt tròn + râu bạc dài, lông mày rậm | 1024×1024 | BG-G |
| K02 | `worker-kit-gatekeeper-crossbow` | Lão Gác Cổng | Nỏ gỗ to | 1536×1024 | BG-G |
| K03 | `worker-kit-en-head` | Chị Én (Tháp Cung) | Tóc búi, nơ đuôi én | 1024×1024 | BG-G |
| K04 | `worker-kit-en-bow` | Chị Én | Cung ngắn | 1024×1536 | BG-G |
| K05 | `worker-kit-se-head` | Em Sẻ (Tháp Cung) | Tóc tròn, chỏm như mào sẻ | 1024×1024 | BG-G |
| K06 | `worker-kit-se-quiver` | Em Sẻ | Ống tên | 1024×1024 | BG-G |
| K07 | `worker-kit-dong-head` | Bác Đồng (Tháp Pháo) | Kính đồng đẩy lên trán + ria xám dày | 1024×1024 | BG-G |
| K08 | `worker-kit-dong-rammer` | Bác Đồng | Cây thông nòng | 1536×1024 | BG-G |
| K09 | `worker-kit-lua-head` | Cậu Lửa (Tháp Pháo) | Tóc dựng + băng đô | 1024×1024 | BG-G |
| K10 | `worker-kit-lua-shot` | Cậu Lửa | Quả đạn vằn xanh ngọc | 1024×1024 | **BG-M** |
| K11 | `worker-kit-scholar-head` | Thầy Đồ Mực (Tháp Thư Pháp) | Mũ mềm đen + râu dê trắng | 1024×1024 | BG-G |
| K12 | `worker-kit-sam-head` | Đội trưởng Sấm (Trại Lính) | Băng đô xanh đậm + ria đen to | 1024×1024 | BG-G |
| K13 | `worker-kit-sam-drumstick` | Đội trưởng Sấm | Dùi trống to (Blender nhân đôi) | 1536×1024 | BG-G |
| K14 | `worker-kit-miner-head` | Ba anh em thợ mỏ (Mỏ Vàng) | Mũ vải có đèn dầu nhỏ (không lửa) | 1024×1024 | BG-G |
| K15 | `worker-kit-miner-pickaxe` | Ba anh em thợ mỏ | Cuốc chim | 1536×1024 | BG-G |
| K16 | `worker-kit-ma-head` | Cô Mạ (Ruộng Lúa) | Nón lá + bím tóc | 1024×1024 | BG-G |
| K17 | `worker-kit-ma-seedlings` | Cô Mạ | Bó mạ xanh | 1024×1024 | **BG-M** |
| K18 | `worker-kit-tieu-head` | Chú Tiều (Trại Gỗ) | Khăn ô nâu kem + râu đen ngắn | 1024×1024 | BG-G |
| K19 | `worker-kit-tieu-axe` | Chú Tiều | Rìu | 1536×1024 | BG-G |
| K20 | `worker-kit-tro-head` | Trò Mực (Đài Ấn) | Tóc búi nhỏ buộc dây xám xanh | 1024×1024 | BG-G |
| K21 | `worker-kit-tro-scroll` | Trò Mực | Cuộn giấy trắng | 1536×1024 | BG-G |
| K22 | `worker-kit-lang-head` | Bà Lang Thơm (Nhà Thuốc) | Búi tóc bạc | 1024×1024 | BG-G |
| K23 | `worker-kit-lang-basket` | Bà Lang Thơm | Giỏ thảo dược | 1024×1024 | **BG-M** |
| K24 | `worker-kit-sam-vest` | Đội trưởng Sấm | Áo giáp lá tre | 1024×1024 | BG-G |

- K10 là chỗ duy nhất dùng xanh ngọc: quả đạn vằn xanh ngọc là đạn chữ của Tháp Pháo (23.8), đúng nghĩa "sức gõ" (23.3).

**K01**
```text
Old gatekeeper's head piece for a small chibi villager: a small round iron helmet, joined at the
cheeks by silver side hair to a long full silver beard and moustache, with bushy white eyebrows fused
under the helmet rim; one solid piece, open where the round face shows and hollow inside so it fits
over a round head.
```

**K02**
```text
A huge old wooden crossbow for a small villager: thick solid bow arms, a chunky wooden stock with
iron fittings, the string shown as a thick rope fused to both bow tips, no bolt loaded.
```

**K03**
```text
Elder sister archer's hair piece for a small chibi villager girl: dark hair with two round buns on
top, each tied with a stiff navy ribbon cut like a swallow's forked tail; one solid piece, hollow
underneath so it fits over a short hair cap.
```

**K04**
```text
A short village bow of bamboo and horn with a cord-wrapped grip, the string shown as a thick cord
fused to both tips. Exact side view instead of the three-quarter view, the bow standing upright.
```

**K05**
```text
Younger brother's hair piece for a small chibi villager boy: short round brown hair with one messy
tuft sticking up at the back like a sparrow's crest; one solid piece, hollow underneath.
```

**K06**
```text
A small round bamboo quiver with a short shoulder loop fused to it, full of arrows whose feathered
ends form one solid rounded bundle sticking out of the top.
```

**K07**
```text
Grumpy cannoneer's head piece for a small chibi villager: short grey hair with round bronze goggles
pushed up on the forehead, joined by grey sideburns to a thick grey moustache; one solid piece, open
where the face shows, hollow inside.
```

**K08**
```text
A cannon rammer: a sturdy wooden pole with a fat round swab head of dark wool at one end, one solid
mass. Lying horizontally, exact side view instead of the three-quarter view, swab head pointing right.
```

**K09**
```text
Young cannon helper's head piece for a small chibi villager: short spiky dark hair in a few big
chunky spikes, with a knotted rust-brown cloth headband with two short stiff tails; one solid piece,
hollow underneath.
```

**K10**
```text
A round iron cannonball about the size of a small child's head, with one bold painted turquoise
stripe around its middle (no letters, no symbols) and a small iron loop on top.
```

**K11**
```text
Old calligraphy teacher's head piece for a small chibi villager: a soft black scholar's hat, joined
at the cheeks to a thin tapered white goatee and a solid white moustache; one solid piece, open where
the face shows, hollow inside.
```

**K12**
```text
Loud militia captain's head piece for a small chibi villager: a deep blue cloth headband knotted at
the back with two short stiff tails, joined by dark sideburns to a big black moustache; one solid
piece, open where the face shows, hollow inside.
```

**K13**
```text
One big thick wooden drumstick with a round padded leather head. Lying horizontally, exact side view
instead of the three-quarter view, head pointing right.
```

**K14**
```text
Miner's head piece for a small chibi villager: a soft brown cloth cap with a small unlit brass oil
lamp fixed at the front (no flame, no light); hollow underneath.
```

**K15**
```text
A sturdy miner's pickaxe: a curved iron head with two blunt points on a short thick wooden handle.
Lying horizontally, exact side view instead of the three-quarter view, head to the right.
```

**K16**
```text
Young rice farmer's head piece for a small chibi villager woman: a conical palm-leaf hat in straw
colour with a cream cloth chin tie fused to it, over a long dark braid that hangs down the back as
one solid piece touching the hat; hollow underneath.
```

**K17**
```text
A bundle of young rice seedlings tied with a straw band: a thick bunch of green seedling blades
grouped into a few big solid masses, with a small clump of brown roots and mud at the bottom.
```

**K18**
```text
Woodcutter's head piece for a small chibi villager: a brown-and-cream checked headscarf knotted at
the back with one short stiff tail, joined to a short black beard; one solid piece, open where the
face shows, hollow inside.
```

**K19**
```text
A woodcutter's axe: a broad iron head on a sturdy, slightly curved wooden handle. Lying horizontally,
exact side view instead of the three-quarter view, head to the right.
```

**K20**
```text
Quiet ink student's head piece for a small chibi villager: neat short dark hair with a small top-knot
tied with a grey-blue cloth band; one solid piece, hollow underneath.
```

**K21**
```text
A rolled paper scroll with round wooden end knobs, tied with one thick cord band, completely blank.
Lying horizontally.
```

**K22**
```text
Herbal grandmother's head piece for a small chibi villager: soft grey hair combed back into a round
bun held by one short thick wooden hairpin; one solid piece, hollow underneath.
```

**K23**
```text
A small woven herb basket with a thick handle, filled with bundled herbs and leaves as a few big
solid green masses.
```

**K24**
```text
A militia captain's vest of small lacquered bamboo plates laced together in rows, sized for a small
chibi villager, shaped as if worn on an invisible round chest (the inside is empty), with two short
shoulder straps.
```

## 6. Quái

Luật chung như file chính, mục 9: vệt Mực Câm là shader (không vẽ); chết không máu; quái nhỏ 1,6–2,2 m, vừa 2,4–3,2 m, to 3,5–4,5 m; bóng hình đọc được từ camera 55° ở 58 m; không thần, không vật được thờ. Màu giữ riêng ở file chính, mục 3.7.

Blender thêm cho mọi quái: `Enemy_Move`, `Enemy_Idle`, `Enemy_Attack`, `Enemy_Hit`, `Enemy_Death`; nên có `Enemy_Skill`. Model tạm: chưa có.

### VS6 · `oni` — Quỷ Oni và chùy sắt

| Mục | Giá trị |
|---|---|
| Là gì | Quỷ phá nhà dân gian Nhật: rời đường tới nhà gần, đập 60 mỗi 3 s; Nổi Giận dưới 50 %. Cần 2 chỗ chặn (22.6). |
| Ảnh 2D | VS6a `art-src/td/enemies/oni.png` · 1024×1536 · VS6b `art-src/td/enemies/oni-club.png` · 1536×1024 |
| Model 3D | `art-src/3d/td/enemies/oni.glb`, `oni-club.glb` |
| Ghép | VS6a: Khối A + prompt + BG-G · VS6b: Khối C + prompt + BG-G |
| Tripo | VS6a: face limit 9.000 · rig biped · clip Tripo: idle, walk · VS6b: face limit 2.000 · không rig |
| Clip riêng | `Enemy_Attack` (giơ chùy qua đầu rồi đập), `Enemy_Death` (sừng gãy, chùy rơi "keng") |
| Socket | `FX_HAND_R` (chùy), `FX_TOOL` (đầu chùy: vết nứt đất), `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_HAND_L` |
| Cao trong game | 3,8 m (quái to). Không chibi. |
| Nhìn từ trên | Vai rộng, bờm đen, hai sừng kem, chùy sắt dài. |
| Báo trước đòn | Đập báo 0,8 s (22.6). |

- Tự quyết: da nâu đất nung (nâu rõ, không đỏ tươi, giữ đỏ cho nguy hiểm), sừng kem, khố sọc vàng đất. Chùy là món rời vì chùy rơi khi chết (22.6). Chùy dài ≈ 2,2 m.

**VS6a**
```text
An oni, a big brute ogre from Japanese folk tales, storybook style, bossy and clumsy rather than
scary, NOT chibi: a tall heavy body with a round belly, broad shoulders, thick arms and short thick
legs; weathered terracotta-brown skin (earthy and dark, clearly brown, not bright red); two short
thick cream horns on the forehead; a wild mane of dark charcoal hair as one big solid mass; bushy
eyebrows, big round cream-yellow eyes, a wide closed grin with two small blunt tusks; a striped
loincloth in ochre and dark brown with a thick rope belt; chunky iron cuffs on the wrists and ankles.
The right hand is a big loose closed fist as if gripping a club handle that is not there; the left
hand is open. Nothing in the hands.
```

**VS6b**
```text
A huge iron ogre club: a long heavy club that thickens toward the end, dark iron with rows of blunt
rounded studs, a wrapped leather grip at the thin end. Lying horizontally across the image, exact
side view instead of the three-quarter view, heavy end pointing right.
```

### VS7 · `tat-phuong` — Tất Phương (Bifang)

| Mục | Giá trị |
|---|---|
| Là gì | Chim một chân dân gian Trung Hoa. Lò cò tới nhà gần đường rồi nổ (nhà −45) (22.6). |
| Ảnh 2D → Model | `art-src/td/enemies/tat-phuong.png` → `art-src/3d/td/enemies/tat-phuong.glb` · 1024×1536 |
| Ghép | Khối B + prompt + BG-G |
| Tripo | Face limit 6.000 · không rig (một chân; Blender làm xương) · clip Tripo: không |
| Clip riêng | `Enemy_Move` (lò cò), `Enemy_Skill` (báo nổ: cúi người, vò rung), `Enemy_Death` (cầu lửa, lông bung) |
| Socket | `FX_TOOL` (vò đất: tâm nổ `jar-blast`), `FX_HEAD`, `FX_CORE`, `FX_FEET` |
| Cao trong game | 2,0 m (quái nhỏ) |
| Nhìn từ trên | Thân chim xám than, vò đất nung tròn trên lưng. |
| Báo trước đòn | Nổ báo 0,5 s (22.6). |

- Tự quyết: lông xám than, đốm cam tàn lửa vẽ lên lông (không dùng xanh lục lam như truyện gốc, để giữ xanh ngọc cho sức gõ). Vò đất nung trên lưng khớp đạn `jar-blast` (23.8).
- Prompt không gọi nó là "chim lửa": chữ "fire" dễ làm ChatGPT vẽ lửa (23.11).

```text
Tat Phuong (Bifang), a one-legged bird from ancient Chinese folk tales, mischievous: a
crane-like bird standing on ONE long sturdy leg under the middle of the body (it has only one leg),
a long neck, a round head with a short pale cream beak and bright round eyes; charcoal and ash-grey
plumage in big smooth masses with ember-orange feather tips and a few ember-orange spots painted on
the wings and tail (painted colour only, no flames); a short fan tail; on its back a round
terracotta clay jar held by a rope harness, sealed with a wooden plug (no fire, no smoke). Wings
half spread, not covering the jar.
```

### VS8 · `ma-da` — Ma Da (Water Wraith)

| Mục | Giá trị |
|---|---|
| Là gì | Hồn nước dân gian Việt. Tàng hình; Kéo Chân một lính; gõ trực tiếp Hiện Hình (22.6, 9.2). |
| Ảnh 2D → Model | `art-src/td/enemies/ma-da.png` → `art-src/3d/td/enemies/ma-da.glb` · 1024×1536 |
| Ghép | Khối A + prompt + BG-G |
| Tripo | Face limit 6.000 · rig biped (thân trôi, không thấy chân; lỗi thì không rig) · clip Tripo: idle |
| Clip riêng | `Enemy_Move` (trôi), `Enemy_Attack` (Kéo Chân), `Enemy_Death` (vũng nước, 8 cánh sen trắng bay lên) |
| Socket | `FX_HAND_R`, `FX_HAND_L` (kéo chân), `FX_HEAD` (cuộn Hiện Hình), `FX_CORE`, `FX_FEET` |
| Cao trong game | 2,6 m (quái vừa) |
| Nhìn từ trên | Tóc dài thành một mảng tối, vạt áo dài tỏa tròn, hoa sen trắng. |
| Báo trước đòn | Không có vệt báo. Tàng hình và lộ diện là shader. |

- Tự quyết: buồn, hiền, không đáng sợ, không máu; da xám bạc (không xanh nhạt), áo kem bạc màu, thắt lưng hồng sen, hoa sen trắng trên tóc (gợi 8 cánh sen khi chết).
- Ảnh gửi Tripo phải là thân đặc, không trong suốt. Mờ, tàng hình, lộ diện là shader.

```text
Ma Da, a sad water spirit from Vietnamese folk tales, gentle and melancholy, not scary, no blood: a
slender young woman, chibi proportions about 2.5 heads tall, floating with no visible feet: her long
faded robe ends in a rounded, gently rippled hem just above an invisible floor. Her body, hair and
robe are fully solid and opaque, like a painted toy: not transparent, not see-through, no mist, no
dripping water. Pale silver-grey skin, sorrowful downcast eyes (open), dark slate hair grouped into
one big smooth mass that falls down her back and ends in a single rounded curl at the waist, one
white lotus flower with no leaves tucked above her ear; a simple old-style long blouse and robe in
faded cream with a dusty lotus-pink sash; slender arms held down and slightly out, hands open.
Quiet and still.
```

### VS9 · `dokkaebi` — Yêu Tinh Dokkaebi và gậy

| Mục | Giá trị |
|---|---|
| Là gì | Yêu tinh dân gian Hàn. Gọi Ma Trơi nhỏ mỗi 10 s, tối đa 3 lần; gõ trực tiếp Phong Gậy. Cần 2 chỗ chặn (22.6, 9.2). |
| Ảnh 2D | VS9a `art-src/td/enemies/dokkaebi.png` · 1024×1536 · VS9b `art-src/td/enemies/dokkaebi-club.png` · 1536×1024 |
| Model 3D | `art-src/3d/td/enemies/dokkaebi.glb`, `dokkaebi-club.glb` |
| Ghép | VS9a: Khối A + prompt + BG-G · VS9b: Khối C + prompt + BG-G |
| Tripo | VS9a: face limit 6.000 · rig biped · clip Tripo: idle, walk · VS9b: face limit 2.000 · không rig |
| Clip riêng | `Enemy_Skill` (giơ gậy chuẩn bị gõ: lúc đó hiện cuộn Phong Gậy), `Enemy_Death` (gậy lăn lóc, khói xanh) |
| Socket | `FX_HAND_R` (gậy), `FX_TOOL` (đầu gậy: vòng Ma Trơi), `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_HAND_L` |
| Cao trong game | 2,8 m (quái vừa) |
| Nhìn từ trên | Người cao gầy, bờm nâu, một sừng, gậy u nần. |

- Tự quyết: người cao gầy, một sừng ngắn, da nâu cát, áo gi-lê vá màu chàm và vàng đất. Gậy là món rời vì gậy lăn lóc khi chết (22.6). Gậy dài ≈ 1,2 m.

**VS9a**
```text
A dokkaebi, a mischievous goblin from Korean folk tales, tricky and playful rather than scary: a tall
lanky body with long arms and big hands, a big head with one short stubby horn in the middle of the
forehead, big round eyes, a wide closed-mouth grin, a wild mane of dark brown hair as one big solid
mass; warm sand-tan skin; a patched sleeveless vest in faded indigo and ochre, baggy trousers tied at
the ankles, a rope belt with a small dried tan gourd fused at the hip. The right hand is a loose closed fist as
if gripping a club that is not there; the left hand is open.
```

**VS9b**
```text
A goblin's magic club: a knobbly wooden club with a few big rounded knots, thicker at the end,
wrapped with one band of faded indigo cloth at the grip. Lying horizontally across the image, exact
side view instead of the three-quarter view, heavy end pointing right.
```

### VS10 · `kamaitachi` — Chồn Liềm (Kamaitachi)

| Mục | Giá trị |
|---|---|
| Là gì | Chồn liềm dân gian Nhật. Bay thấp 1,5 m trên lốc; né 30 % đạn tháp yếu chuẩn (22.6). |
| Ảnh 2D → Model | `art-src/td/enemies/kamaitachi.png` → `art-src/3d/td/enemies/kamaitachi.glb` · 1536×1024 |
| Ghép | Khối B + prompt + BG-G |
| Tripo | Face limit 6.000 · rig quadruped (lỗi thì không rig) · clip Tripo: run |
| Clip riêng | `Enemy_Move` (ba con chạy vòng quanh trục lốc), `Enemy_Death` (lốc tan, ba chồn lăn chạy) |
| Socket | `FX_HAND_R`, `FX_HAND_L` (liềm), `FX_HEAD`, `FX_CORE`, `FX_FEET` |
| Cao trong game | Cả cụm lốc 1,6 m; mỗi con dài 0,8 m |
| Nhìn từ trên | Ba chồn xoay vòng; lốc là VFX. |

- Tự quyết: một ảnh một con chồn; game đặt 3 bản quanh lốc. Cả cụm 1,6 m (quái nhỏ), mỗi con dài 0,8 m.

```text
Chon Liem (a kamaitachi), a sickle weasel from Japanese folk tales, quick and cheeky: one slim weasel
with a long body, short legs, a long bushy tail as one solid mass curled up to one side, a pointed
face with big bright eyes and small round ears; each front leg ends in a broad curved sickle blade of
steel grey instead of a paw (thick, blunt-edged, solid); sandy cream fur with a darker brown mask and
back stripe.
```

## 7. Boss

### VS11 · `dai-bang-tinh` — Đại Bàng Tinh (the Storm Eagle)

| Mục | Giá trị |
|---|---|
| Bậc | VS (boss bản đồ 2) |
| Là gì | Đại bàng yêu tinh trong truyện Thạch Sanh, không phải thần. Bay cao 9 m, Sà Cắp nhấc nhà, Bão Cánh, trộm vàng (22.7). |
| Ảnh 2D | `art-src/td/bosses/dai-bang-tinh.png` · 1536×1024 |
| Góc phụ (nên có) | `dai-bang-tinh-front.png` · 1024×1024 · Khối B + VIEW FRONT + prompt + BG-G |
| Model 3D | `art-src/3d/td/bosses/dai-bang-tinh.glb` |
| Ghép | Khối B + prompt + BG-G |
| Tripo | Multiview (có ảnh trước) hoặc Image to 3D · face limit 30.000 · không rig (Blender: `build_winged_rig`, `make_flight_clips`) · clip Tripo: không |
| Blender thêm | `Boss_Intro`, `Boss_Idle`, `Boss_Move`, `Boss_Attack`, `Boss_Skill.snatch` (Sà Cắp), `Boss_Skill.gale` (Bão Cánh), `Boss_Skill.quill` (rũ mũi lông), `Boss_Skill.steal` (lao trộm vàng), `Boss_Channel`, `Boss_Stun` (rơi xuống đường), `Boss_Hit`, `Boss_Phase`, `Boss_Death`; nên có `Boss_Glide`, `Boss_Perch` (Tổ Đá) |
| Socket | `FX_FEET` (móng: nhấc nhà, vàng trộm), `FX_HEAD`, `FX_CORE`, `FX_HAND_R`, `FX_HAND_L` (đầu cánh: gió) |
| Cao trong game | Sải cánh 12 m (22.7); bay cao 9 m |
| Model tạm | Chưa có |
| Nhìn từ trên | Sải cánh nâu rất rộng, chuỗi vỏ ốc trên ngực. |
| Báo trước đòn | Sà Cắp báo 1,5 s bằng bóng đỏ dưới nhà (decal, 22.7). |
| Hình 2D | Chân dung C22: `03-2d-scenery-ui-vfx-vs.md` |

- Vệt Mực Câm loang trên cánh là shader (22.7). Không vẽ.
- Tự quyết: tên clip chiêu `Boss_Skill.snatch`, `.gale`, `.quill`, `.steal` (23.9 chỉ ghi `Boss_Skill.<tên>`).
- Tự quyết: chuỗi đồng xu màu đồng thau, không vàng kim, để vàng kim chỉ là tiền rơi.

```text
Dai Bang Tinh, the Storm Eagle, a giant greedy eagle from a Vietnamese folk tale (a monster, not a
god), majestic and menacing but storybook-friendly, NOT chibi: a huge eagle with a massive chest,
dark umber-brown feathers with a copper sheen painted along the feather edges, the feathers grouped
into large overlapping plates; a big hooked ivory beak, fierce golden-brown painted eyes, black
curved talons, open and empty; around its neck a heavy necklace of big seashells and old bronze
coins (bronze, not bright gold) on a thick cord, resting on the chest. Wings raised and half spread
above the back in a shallow V, without hiding the body, each wing made of a few broad layered
feather masses with blunt rounded tips; a broad fan tail held out behind.
```

## 8. Thú

- Tự quyết: 23.9 không có hàng clip cho thú. Mỗi con mượn tên clip của vai nó làm trong game (ghi ở từng mục).

### VS12 · `trau` — Trâu (trâu Mộng)

| Mục | Giá trị |
|---|---|
| Là gì | Trâu Mộng trong tổ thợ Ruộng Lúa (cùng Cô Mạ), và trâu húc của nhánh Chuồng Trâu (22.4, 12.3). Trâu "ọ" khi Ruộng Bùng Nổ (23.8). |
| Ảnh 2D → Model | `art-src/td/animals/trau.png` → `art-src/3d/td/animals/trau.glb` · 1536×1024 |
| Góc phụ | Không bắt buộc: `trau-front.png` · 1024×1024 · Khối B + VIEW FRONT + prompt + BG-G |
| Ghép | Khối B + prompt + BG-G |
| Tripo | Face limit 6.000 · rig quadruped · clip Tripo: walk, run |
| Blender thêm | `Worker_Work` (đứng ở ruộng, kéo cày), `Worker_Strike` (một nhịp mỗi chữ), `Worker_Cheer`; `Unit_Charge` (húc dọc đường) |
| Socket | `FX_HEAD` (sừng: điểm húc), `FX_CORE`, `FX_FEET` |
| Cao trong game | 1,6 m tới đỉnh sừng, dài 2,4 m |

- Tự quyết: cỡ 1,6 m × 2,4 m (design không ghi); face limit 6.000 như quái vừa. Bông hoa trắng sau sừng (chân dung C17 chép theo).

```text
Trau Mong, a friendly village water buffalo, chibi and sturdy, gentle and strong: a round heavy body
on four short thick legs with broad hooves, a big head with two wide crescent horns sweeping back
(thick and smooth) and a small white flower with no leaves tucked behind one horn, small calm eyes,
a broad pale muzzle, a short tail ending in one solid tuft; soft slate-grey hide with a lighter
cream chin and belly, a woven straw saddle pad tied on its back.
```

### VS13 · `piggy` — Heo Đất Vàng (Golden Piggy)

| Mục | Giá trị |
|---|---|
| Là gì | Sự kiện kho báu từ bản đồ 2: heo chạy dọc một làn 10 s, mang một từ. Gõ xong thì vỡ ra Vàng; tháp bắn vỡ được (7.8). |
| Ảnh 2D → Model | `art-src/td/animals/piggy.png` → `art-src/3d/td/animals/piggy.glb` · 1536×1024 |
| Ghép | Khối B + prompt + BG-G |
| Tripo | Face limit 6.000 · rig quadruped · clip Tripo: run |
| Blender thêm | `Enemy_Move` (chạy dọc làn), `Enemy_Idle`, `Enemy_Hit`, `Enemy_Death` (vỡ, đồng bung) |
| Socket | `FX_HEAD` (thẻ từ), `FX_CORE` (tâm vỡ, đồng bay ra), `FX_FEET` |
| Cao trong game | Cao 1,2 m, dài 1,6 m |

- Tự quyết: mượn tên clip quái, vì heo chạy dọc làn và tháp bắn vỡ được. Cỡ 1,2 m × 1,6 m để đọc được như quái nhỏ.
- Men vàng kim được dùng ở đây: heo là kho báu, đúng nghĩa màu Tiền (23.3).

```text
Heo Dat Vang, the Golden Piggy, a round ceramic piggy bank that came to life and runs away: a fat
round pig body of satin-glazed ceramic in warm golden yellow (it is treasure, soft painted sheen, no
strong highlights), a coin slot on its back, a painted cheeky face with big round eyes, a pink
snout, small triangular ears, four short stubby legs, a short curly tail as one solid curl, a few
simple painted cream flowers on its sides.
```

## 9. Đồ Thư Đồng cho nhóm hỗ trợ

### VS14 · Sách nhỏ (`helper-book`) và quạt nan (`helper-fan`)

Thư Đồng ở nhà hỗ trợ "quạt nồi, lật sách" (22.3). Hai món cho biến thể `Helper_Assist.support`. Món tay của nhóm khác (bút, trống con, búa con) ở file chính, mục P5.

| Mã | id | Ảnh 2D (`art-src/td/helpers/`) | Model 3D (`art-src/3d/td/helpers/`) | Cỡ | Ghép | Gắn vào |
|---|---|---|---|---|---|---|
| VS14a | `helper-book` | `helper-book.png` | `helper-book.glb` | 1024×1024 | Khối C + prompt + BG-G | `FX_HAND_L` ở Đài Ấn (lật sách) · rộng ≈ 0,3 m |
| VS14b | `helper-fan` | `helper-fan.png` | `helper-fan.glb` | 1024×1024 | Khối C + prompt + BG-G | `FX_HAND_R` ở Nhà Thuốc (quạt nồi) · dài ≈ 0,35 m |

- Tripo: Image to 3D · face limit 2.000 · không rig · không clip. Đính kèm `helper-owlet.png` chỉ để so cỡ và màu.
- Tự quyết: xếp vào VS. Nhà Thuốc là VS; Đài Ấn ở 27.2 chỉ "nếu kịp". Thiếu món thì Blender dùng clip `Helper_Assist` gốc (23.9).
- Tự quyết: sách cho Đài Ấn, quạt cho Nhà Thuốc (22.3 ghi chung "quạt nồi, lật sách").

**VS14a**
```text
A small thick book sized for a baby owl, lying half open like a shallow V: a chunky dark-brown cloth
cover, thick cream page blocks as two solid masses (no single pages fanning out), the pages
completely blank, one short stiff cloth bookmark fused to the pages.
```

**VS14b**
```text
A small round hand fan sized for a baby owl, the kind used to fan a cooking pot: a flat round fan
of tightly woven dry tan bamboo with a thick dark-brown rim and a short thick bamboo handle, one
solid piece with no gaps in the weave.
```
