# Galaxy 02 — Bộ prompt ChatGPT (11 ảnh)

Tạo bộ source art cho **Galaxy 02 — Hoả ngục (`infernal`)** theo pipeline BGV.

- Chế độ cảnh theo plan: **OW**.
- Palette: **near-black #050102 and #3A0A06; lava #FF4A1C and #FF9A2E; ember #FFD37A; smoke #2A2224**.
- Thư mục source đề xuất: `games/space-typing/art-src/g02/`.
- Đây là source art; runtime WebP/atlas/kit.json phải do pipeline xử lý, không sửa tay.

## Bước 0 — Chuẩn bị cuộc trò chuyện

1. Mở một chat mới, tên gợi ý: **“Space Typing — G02 Hoả ngục art”**. Làm cả 11 ảnh trong cùng chat.
2. Đính kèm `docs/background-reboot/style-ref-player-ships.png` và 1–3 ảnh cinematic reference bạn thích.
3. Gửi prompt mở đầu sau:

```text
You are the art director and illustrator for the background art of my game.

The game is a 2D top-down space typing shooter. The player ship sits at the bottom center;
enemies descend from the top with readable word labels.

Match the attached player ship art quality: painterly, glossy, richly detailed,
premium mobile-game illustration, cinematic fantasy sci-fi, sharp focus.

This conversation is ONLY for Galaxy 02 — Hoả ngục.
Core palette: near-black #050102 and #3A0A06; lava #FF4A1C and #FF9A2E; ember #FFD37A; smoke #2A2224.
Lighting for every image: hot orange-white key light from the UPPER LEFT, deep red-orange rim light from the RIGHT; shadow sides sink into near black.

Rules for EVERY image in this conversation:
1. Cinematic fantasy game art, premium painterly detail, coherent materials.
2. High contrast. Preserve large areas of true or near black; bright accents are concentrated.
3. Top-down / orbital camera consistent with a vertical shooter. No contradictory ground-level horizon.
4. No text, letters, numbers, logos, watermark, UI, frame or border.
5. Background art is slightly less saturated than the player ships.
6. Keep the central gameplay corridor and lower third calmer/darker whenever the composition allows it.
7. Do not draw flat vector shapes, low-poly placeholders, hexagon rocks or generic clip-art.
8. Keep one coherent art style, palette, material language and lighting across all 11 images.

Confirm briefly, then wait for Image 1.
```

**Mẹo chung cho mọi ảnh:**

- Tạo **2–4 lần** cho mỗi ảnh rồi chọn bản đẹp nhất.
- Sau khi duyệt Ảnh 1, mọi ảnh sau phải giữ đúng câu **“Same art style, palette and lighting as the approved Image 1.”**
- Hero/atlas ưu tiên **PNG gốc**. Nếu transparency không hoạt động, dùng chroma-key theo hướng dẫn cuối file.
- Không chấp nhận: chữ, watermark, logo, UI, khung, border, fake checkerboard, vật thể bị cắt ở mép.
- Không dùng ảnh kiểu icon phẳng, low-poly, vector đơn giản hoặc “concept sketch”.
- Vật thể background phải kém bão hoà hơn tàu người chơi một chút để chữ/quái vẫn nổi.

## Ảnh 1 — `g02-plate.png` — Nền chính (16:9)

Ảnh quan trọng nhất. Duyệt ảnh này trước khi tạo Ảnh 2–11.

```text
Image 1 — main background plate for Galaxy 02 "Hoả ngục".
Landscape 16:9, highest resolution and quality.

A top-down high-altitude volcanic world surface. Black cracked basalt crust, branching rivers of
incandescent lava, occasional deep calderas and charred plateaus. Thick smoky regions and ash veils
create depth, but the central gameplay corridor and lower third stay calmer and darker. Near the far
upper-right edge, only a partial distant dying red giant is visible, heavily cropped by the frame,
with restrained solar prominences. No buildings, no hero landmark, no creatures, no ships.

The scene must feel suitable for slow vertical parallax. Prefer natural continuity at the top and
bottom so the art can be adapted into a vertically repeating over-world surface if needed.

Palette and light: near-black #050102 and #3A0A06; lava #FF4A1C and #FF9A2E; ember #FFD37A; smoke #2A2224. hot orange-white key light from the UPPER LEFT, deep red-orange rim light from the RIGHT; shadow sides sink into near black.
Do not add the five World hero landmarks; they are separate transparent layers.
```

**Đạt khi:** riêng plate đã đẹp, sâu, có vùng tối thật, không có hero lớn và không phá vùng đọc chữ.

## Ảnh 2 — `g02-glow-a.png` — Lớp sáng (1:1)

```text
Image 2 — same art style, palette and lighting as the approved Image 1.
Square 1:1, highest resolution.
dense rolling infernal smoke and luminous red-orange volcanic haze, with hot ember-lit filaments, on
PURE BLACK #000000; 40–50% coverage
No stars, no solid objects, no hard rectangular edge.
The texture should read as one organic field, not a 2x2 grid of repeated mini-images.
```

## Ảnh 3 — `g02-glow-b.png` — Lớp sáng (1:1)

```text
Image 3 — same art style, palette and lighting as the approved Image 1.
Square 1:1, highest resolution.
thin delicate sulfur-orange and dark crimson heat wisps, sparse glowing ember streaks, on PURE BLACK
#000000; 25–35% coverage
No stars, no solid objects, no hard rectangular edge.
The texture should read as one organic field, not a 2x2 grid of repeated mini-images.
```

## Ảnh 4 — `g02-dust.png` — Dust mask (1:1, nền trắng)

```text
Image 4 — square 1:1, highest resolution.
black soot clouds, ash plumes and smoke lanes on PURE WHITE #FFFFFF, soft feathered edges, about 30%
coverage
No colour except grayscale. No stars. No solid objects.
```

## Ảnh 5–9 — Hero riêng cho từng World (1:1, alpha)

Dán câu chung này vào cuối từng hero prompt:

```text
Square 1:1, highest resolution. Transparent background PNG with REAL alpha transparency
(not a painted checkerboard). The complete hero object is visible and centered, filling about
80–88% of the square, with nothing cut off. It must remain readable when later shown at
roughly 30–60% of the gameplay screen.
hot orange-white key light from the UPPER LEFT, deep red-orange rim light from the RIGHT; shadow sides sink into near black.
No text, no logo, no UI, no border.
```

### Ảnh 5 — `g02-hero-w06.png` — World 06: Ember Orchard

```text
Image 5 — same art style, palette and lighting as the approved Image 1.
a floating volcanic orchard: twisted black basalt tree-like formations growing from levitating lava
rocks, with glowing molten veins and ember-fruit lights; several rock islands connected by thin lava
roots.

[append the shared hero transparency block]
```

### Ảnh 6 — `g02-hero-w07.png` — World 07: Imp Furnace

```text
Image 6 — same art style, palette and lighting as the approved Image 1.
a colossal infernal forge complex: black iron furnace, hanging chains, molten cauldron, anvils and
vents, all fused into one readable top-down landmark.

[append the shared hero transparency block]
```

### Ảnh 7 — `g02-hero-w08.png` — World 08: Scarlet Halo

```text
Image 7 — same art style, palette and lighting as the approved Image 1.
a gigantic burning crimson ring surrounding a black sun-like core, with violent solar prominences
and a thin corona of orange-red plasma.

[append the shared hero transparency block]
```

### Ảnh 8 — `g02-hero-w09.png` — World 09: Cinder Cathedral

```text
Image 8 — same art style, palette and lighting as the approved Image 1.
a ruined black-stone gothic cathedral burning from within, broken spires, glowing lava cracks,
drifting ash and a few molten windows.

[append the shared hero transparency block]
```

### Ảnh 9 — `g02-hero-w10.png` — World 10: Demon Crown

```text
Image 9 — same art style, palette and lighting as the approved Image 1.
a crown-shaped ring of jagged volcano peaks surrounding a huge swirling fiery eye/vortex, ominous
but majestic rather than gory.

[append the shared hero transparency block]
```

## Ảnh 10 — `g02-atlas-rocks.png` — Atlas environment (4:3, alpha)

```text
Image 10 — same art style, palette and lighting as the approved Image 1.
Landscape 4:3, highest resolution.
12 SEPARATE infernal drift objects: dark volcanic asteroids with lava cracks, burning meteor
fragments, broken black-iron chain segments, and a few giant fossil/bone-like fragments. Exactly 12
isolated objects, strong size variation: 3 very large, 4 medium, 5 small. Solid painterly material,
not flat polygons.
Spread all 12 objects apart with generous transparent empty space; no overlap, no touching the border.
Transparent background PNG with real alpha. Keep every object fully visible.
```

## Ảnh 11 — `g02-atlas-life.png` — Atlas life/events (4:3, alpha)

```text
Image 11 — same art style, palette and lighting as the approved Image 1.
Landscape 4:3, highest resolution.
SEPARATE background subjects: (1) one colossal serpentine fire-dragon / fire-wyrm silhouette, long
and elegant, glowing cracks but clearly a distant background creature; (2) 5 small infernal skiffs /
black-metal ships with dim orange engines; (3) one huge derelict iron war-barge or furnace ship; (4)
2 shadowy winged demon silhouettes gliding through smoke, readable as background life rather than
gameplay enemies; (5) 2 small probe-like ember lantern drones. All subjects isolated with generous
empty space.
No overlap. Nothing touches the border. Transparent background PNG with real alpha.
Background subjects must not resemble the game's cute round typing enemies.
```

## Runtime-only / không cần vẽ thành ảnh riêng

- Heat shimmer and lava breathing are runtime effects; do NOT paint strong distortion across the whole plate.
- Stars, generic sparkle FX, dither/noise and simple particles are generated by the BGV engine.
- Do not paint flashing states or boss-state colour changes into the base source images.

## Nếu transparency không hoạt động

Tạo lại hero/atlas trên nền chroma-key phẳng. Chọn màu nền **không xuất hiện trong subject**.

```text
Transparency did not work. Recreate the exact same subject on a flat, perfectly uniform
chroma-key background with no shadows, gradients or texture on the background.
Do not use the chroma-key colour anywhere in the subject.
```

## Bảng tên file

| # | Tên file | Tỷ lệ | Nền |
|---|---|---|---|
| 1 | `g02-plate.png` | 16:9 | đục |
| 2 | `g02-glow-a.png` | 1:1 | đen |
| 3 | `g02-glow-b.png` | 1:1 | đen |
| 4 | `g02-dust.png` | 1:1 | trắng |
| 5 | `g02-hero-w06.png` | 1:1 | trong suốt |
| 6 | `g02-hero-w07.png` | 1:1 | trong suốt |
| 7 | `g02-hero-w08.png` | 1:1 | trong suốt |
| 8 | `g02-hero-w09.png` | 1:1 | trong suốt |
| 9 | `g02-hero-w10.png` | 1:1 | trong suốt |
| 10 | `g02-atlas-rocks.png` | 4:3 | trong suốt |
| 11 | `g02-atlas-life.png` | 4:3 | trong suốt |

Đặt source đã chọn vào: `games/space-typing/art-src/g02/`.

Khi đủ hoặc đã có plate + vài hero để ghép thử, nhắn: **“xong ảnh G02”**.
