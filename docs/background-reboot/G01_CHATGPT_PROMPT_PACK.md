# Galaxy 01 — Bộ prompt ChatGPT (11 ảnh)

Tài liệu này hướng dẫn tạo 11 ảnh nền cho **Galaxy 01 — Thiên hà Cầu vồng** bằng ChatGPT Images.
Thiết kế tổng thể xem ở [BACKGROUND_VISUAL_REBOOT_PLAN.md](../BACKGROUND_VISUAL_REBOOT_PLAN.md), mục 6.

**Bạn chỉ cần làm 3 việc:** tạo ảnh → chọn ảnh ưng ý → tải về, đặt vào thư mục
`games/space-typing/art-src/g01/` (hoặc để nguyên trong Downloads rồi báo cho Claude).
Không bắt buộc đổi tên: Claude sẽ tự xem từng ảnh và đặt tên theo bảng cuối tài liệu.

Tất cả 11 ảnh đều là **hình nền của map**. Ảnh tàu nhắc tới ở Bước 0 chỉ là ảnh mẫu để
ChatGPT tham khảo phong cách, không phải ảnh cần tạo.

Script sẽ tự lo phần khó:

- làm ảnh tinh vân và bụi **lặp liền mạch**, nên ChatGPT không cần làm hoàn hảo;
- **tách từng thiên thạch/tàu** ra khỏi ảnh chung, nên không cần xếp lưới chính xác;
- đổi ảnh bụi "đen trên nền trắng" thành lớp trong suốt;
- tách nền xanh lá nếu ChatGPT không cho nền trong suốt thật;
- kiểm tra kích thước, nền, và báo lại ảnh nào cần làm lại.

---

## Bước 0 — Chuẩn bị cuộc trò chuyện

1. Mở **một cuộc trò chuyện mới** trong ChatGPT, đặt tên "Space Typing — G01 art". Làm cả 11 ảnh trong **cùng một cuộc trò chuyện** để phong cách đồng bộ. Giữ lại cuộc trò chuyện này để sửa ảnh sau và làm các Galaxy khác.
2. Chuẩn bị ảnh đính kèm. Đây là **ảnh mẫu để ChatGPT tham khảo phong cách, KHÔNG phải ảnh cần tạo**:
   - **Ảnh tàu đang có trong game**: chỉ để ChatGPT vẽ hình nền cùng chất liệu (bóng bẩy, màu rực, chi tiết) với tàu. ChatGPT sẽ **không** vẽ những con tàu này:
     `games/space-typing/docs/background-reboot/style-ref-player-ships.png`
   - **1–3 hình nền vũ trụ bạn thích nhất** (ví dụ các ảnh trong bài gamek bạn đã gửi), để ChatGPT hiểu không khí bạn muốn.
3. Gửi tin nhắn đầu tiên dưới đây, kèm các ảnh trên:

```text
You are the art director and illustrator for the background art of my game.

The game: a 2D top-down space shooter where the player types words to shoot enemies.
The camera looks straight down into space. The player ship sits at the bottom center.
Cute glossy enemies fly down from the top, each with a word label.

Attached (STYLE REFERENCES ONLY — do not draw these ships or copy these pictures):
(A) my player ship sprite sheet — the backgrounds must match its art quality: painterly,
    glossy, richly detailed, saturated, premium mobile-game illustration.
    Never put these player ships into any background image;
(B) wallpapers whose mood I love: deep cinematic space, very dark, with brilliant highlights.

Everything you create in this conversation is BACKGROUND art for the game's maps.

Rules for EVERY image in this conversation:
1. Fantasy space game art, cinematic digital painting, rich fine detail, sharp focus.
2. Deep pitch-black space with very high contrast: most of the frame is near black,
   only small areas are very bright.
3. One lighting setup for everything: warm white key light from the UPPER LEFT,
   cool cyan rim light from the RIGHT. Shadow sides fade to black.
4. Top-down camera: no horizon, no ground, no perspective floor.
5. No text, letters, numbers, logos, watermark, UI, frame or border.
6. These are background layers: slightly less saturated than the ships,
   so the gameplay stays readable.

Confirm briefly, then wait for my image requests.
```

**Mẹo chung cho mọi ảnh:**

- Chọn **chất lượng cao nhất** và **đúng tỷ lệ khung** (16:9, 1:1 hoặc 4:3) trong ô chọn của ChatGPT nếu có. Nếu không có ô chọn thì tỷ lệ đã ghi sẵn trong prompt.
- Mỗi ảnh nên tạo 2–4 lần rồi chọn cái đẹp nhất.
- Ảnh gần đạt nhưng có lỗi nhỏ: dùng tính năng **bình luận trên ảnh** (Images 2.5) để khoanh chỗ lỗi và nói cần sửa gì, thay vì tạo lại từ đầu.
- Sau khi chốt ảnh 1, mọi ảnh sau đều bắt đầu bằng câu: *"Same art style, palette and lighting as the approved Image 1."* (đã ghi sẵn trong prompt).
- **Tải bản gốc** (PNG). Đổi tên theo bảng cuối tài liệu nếu tiện; không đổi cũng được.

---

## Ảnh 1 — `g01-plate.png` — Nền chính (16:9)

Đây là ảnh quan trọng nhất. Duyệt xong ảnh này mới làm các ảnh khác.

```text
Image 1 — the main background plate for Galaxy 01 "Rainbow Reach".
Landscape 16:9, highest resolution and quality.

A vast deep-space vista seen from above (top-down), pitch-black void.
A huge iridescent nebula: the brightest clouds sit in the UPPER-LEFT corner and along the
RIGHT edge, glowing magenta (#C2338F), cyan (#22C7E0) and violet (#6B3FD6) with thin gold
(#FFC55C) highlights, cut through by dark dust lanes that hide some stars.
Only thin, dim wisps cross the middle.
A faint Milky-Way-like band of countless tiny stars runs diagonally.
One small distant spiral galaxy near the upper right.
A dense field of tiny sharp stars, plus 6–10 brighter blue-white stars with soft glow.

Composition: the center and the bottom third are darker and calmer (words and ships will
be drawn there). Strong depth: bright, detailed clouds at the edges, deep black gaps between.
No planets, no spaceships, no creatures, no large objects — those are separate layers.
```

**Nếu muốn kiểm soát bố cục chắc hơn:** gõ `@Sketch` (Images 2.5), vẽ phác vài nét — mảng tinh vân ở góc trên-trái và mép phải, khoảng giữa để trống — rồi gửi kèm prompt trên.

**Đạt khi:** nhìn riêng ảnh này đã thấy đẹp, sâu, tối, có điểm sáng mạnh; giữa ảnh và phần dưới tối hơn; không có hành tinh hay tàu.

---

## Ảnh 2 — `g01-glow-a.png` — Tinh vân sáng, dày (1:1, nền đen)

```text
Image 2 — same art style, palette and lighting as the approved Image 1.
Square 1:1, highest resolution.
A seamless tileable texture of glowing nebula gas: soft luminous wisps and filaments in
magenta and cyan with a few violet tones, on a PURE BLACK #000000 background.
The gas fills about 40–50% of the square; the rest is pure black.
No stars, no objects, no hard edges.
```

**Đạt khi:** nền đen thuần, khí mềm, không có sao hay vật thể.

---

## Ảnh 3 — `g01-glow-b.png` — Tinh vân mỏng (1:1, nền đen)

```text
Image 3 — same art style, palette and lighting as the approved Image 1.
Square 1:1, highest resolution.
A second seamless tileable nebula texture, thinner and more delicate than Image 2:
fine violet and gold wisps and curls, on a PURE BLACK #000000 background,
about 25–35% coverage. No stars, no objects.
```

---

## Ảnh 4 — `g01-dust.png` — Bụi tối (1:1, nền trắng)

Ảnh này dùng làm "mặt nạ": phần đen sẽ che bớt sao và tinh vân để tạo chiều sâu.

```text
Image 4 — square 1:1, highest resolution.
A seamless tileable texture of dark cosmic dust clouds used as a mask:
PURE BLACK smoky dust lanes and filaments on a PURE WHITE #FFFFFF background,
soft feathered edges, about 30% coverage. No stars, no color, only black on white.
```

**Đạt khi:** chỉ có đen và trắng (xám ở mép khói là được), không có màu.

---

## Ảnh 5–9 — Hero (1:1, nền trong suốt)

Hero là vật thể chính của mỗi World, sẽ hiển thị rất lớn (30–60% màn hình, thường bị mép màn hình cắt bớt).

**Câu chung dán vào cuối mỗi prompt hero:**

```text
Square 1:1, highest resolution. Transparent background PNG with REAL alpha transparency
(not a painted checkerboard). The whole object is fully visible, centered, filling about
85% of the square, with nothing cut off at the edges.
Warm key light from the upper left, cool cyan rim light on the right edge,
shadow side fading to near black.
```

### Ảnh 5 — `g01-hero-w01.png` — Rainbow Reach

```text
Image 5 — same art style, palette and lighting as the approved Image 1.
A colossal gas giant planet with swirling violet and deep-blue cloud bands and wide
prismatic rainbow rings, seen from above at a slight tilt. The rings refract light into
rainbow colors. A thin bright atmospheric rim glows on the upper-left edge;
the night side fades to near black.
[dán câu chung]
```

### Ảnh 6 — `g01-hero-w02.png` — Halo Garden

```text
Image 6 — same art style, palette and lighting as the approved Image 1.
An ancient colossal golden halo-ring megastructure floating in space around a small
brilliant white star. Three small floating garden islands (lush trees, glowing flowers)
orbit inside the ring; waterfalls spill off the islands and dissolve into glittering
light mist. Seen from above at a slight angle.
[dán câu chung]
```

### Ảnh 7 — `g01-hero-w03.png` — Prismatic Tide

```text
Image 7 — same art style, palette and lighting as the approved Image 1.
A cluster of gigantic floating prismatic crystal shards — translucent, iridescent,
refracting rainbow light — with a flowing river of glowing prismatic dust winding
between them. Seen from above.
[dán câu chung]
```

### Ảnh 8 — `g01-hero-w04.png` — Cherub Falls

```text
Image 8 — same art style, palette and lighting as the approved Image 1.
A floating celestial island of white marble cliffs and golden temple ruins.
Luminous waterfalls of liquid light pour off its edges and fall away into space as
sparkling mist. A few soft white feathers drift nearby. Seen from above.
[dán câu chung]
```

### Ảnh 9 — `g01-hero-w05.png` — Aurora Gate

```text
Image 9 — same art style, palette and lighting as the approved Image 1.
A colossal ancient ring-shaped stargate made of dark metal and glowing crystal runes.
A shimmering aurora curtain (green, cyan, magenta) is stretched inside the ring like a
portal. Seen from above at a slight angle.
[dán câu chung]
```

**Đạt khi (cả 5 hero):** nền trong suốt thật; vật thể trọn vẹn, không bị cắt; cùng hướng sáng với ảnh 1; nhìn là nhận ra ngay World đó.

---

## Ảnh 10 — `g01-atlas-rocks.png` — 12 thiên thạch (4:3, nền trong suốt)

```text
Image 10 — same art style, palette and lighting as the approved Image 1.
Landscape 4:3, highest resolution. A game sprite sheet of 12 SEPARATE space asteroids,
spread out with generous empty space between them — no overlapping, nothing touching,
nothing touching the image border.
Sizes vary a lot: 3 very large, 4 medium, 5 small.
Shapes vary: rounded, elongated, jagged, split in two.
Material: dark basalt rock with craters and cracks; about half have glowing prismatic
crystal veins in cyan and magenta.
Lit from the upper left, cool cyan rim light on the right edge, shadow side near black.
Transparent background PNG with real alpha (not a checkerboard).
```

**Đạt khi:** 12 cục tách rời nhau, nhiều cỡ, đá trông đặc và thật (không phải hình lục giác phẳng), không chạm nhau.

---

## Ảnh 11 — `g01-atlas-life.png` — Tàu, sinh vật, vệ tinh (4:3, nền trong suốt)

```text
Image 11 — same art style, palette and lighting as the approved Image 1.
Landscape 4:3, highest resolution. A game sprite sheet with SEPARATE background subjects,
spread out with lots of empty space between them, no overlapping, nothing touching the border:
(1) a colossal luminous "sky whale" space creature with bioluminescent spots and long
    flowing fins;
(2) 5 small sleek light-ships with glowing cyan engines (each ship separate, not touching);
(3) a huge derelict mothership: broken hull, dark and mysterious, a few dim red lights;
(4) 2 small drifting satellites / probes with solar panels.
Everything is seen from directly above (top-down), same lighting as before.
These are distant background elements: slightly hazy and a little less saturated than the
player ships. Transparent background PNG with real alpha (not a checkerboard).
```

**Đạt khi:** mọi thứ tách rời nhau; nhìn từ trên xuống; không lẫn với quái của game (quái trong game là các sinh vật tròn, dễ thương, màu sáng).

---

## Nếu ChatGPT không cho nền trong suốt thật

Dấu hiệu: ảnh tải về có **ô caro xám-trắng vẽ luôn vào ảnh**, hoặc nền là một màu đục.

Gửi thêm câu sau rồi tạo lại (script sẽ tự tách nền xanh):

```text
Transparency did not work. Recreate the same image on a flat, perfectly uniform
pure green #00FF00 background with no shadows or gradients on the background.
Do not use pure green anywhere in the subject.
```

Riêng **ảnh 9 (Aurora Gate)** có cực quang màu xanh lá, nên dùng nền hồng tím thay cho nền xanh:

```text
... on a flat, perfectly uniform pure magenta #FF00FF background ...
Do not use pure magenta anywhere in the subject.
```

---

## Bảng tên file (đặt vào `games/space-typing/art-src/g01/`)

| # | Tên file | Tỷ lệ | Nền |
|---|---|---|---|
| 1 | `g01-plate.png` | 16:9 | đục |
| 2 | `g01-glow-a.png` | 1:1 | đen |
| 3 | `g01-glow-b.png` | 1:1 | đen |
| 4 | `g01-dust.png` | 1:1 | trắng |
| 5 | `g01-hero-w01.png` | 1:1 | trong suốt |
| 6 | `g01-hero-w02.png` | 1:1 | trong suốt |
| 7 | `g01-hero-w03.png` | 1:1 | trong suốt |
| 8 | `g01-hero-w04.png` | 1:1 | trong suốt |
| 9 | `g01-hero-w05.png` | 1:1 | trong suốt |
| 10 | `g01-atlas-rocks.png` | 4:3 | trong suốt |
| 11 | `g01-atlas-life.png` | 4:3 | trong suốt |

- File `.webp` hoặc `.jpg` cũng được, miễn đúng tên (trừ phần đuôi).
- Không cần đủ 11 ảnh mới báo. Có **ảnh 1 + vài hero** là tôi đã ghép thử được.
- Xong thì nhắn: **"xong ảnh G01"** (hoặc liệt kê ảnh nào đã có).
games/space-typing/docs/background-reboot/style-ref-player-ships.png
games/space-typing/docs/background-reboot/G01_CHATGPT_PROMPT_PACK.md