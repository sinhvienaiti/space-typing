# Prompt ảnh 2D → mô hình 3D cho Rift Defense (21/10/2026, bản V4)

> **Cập nhật V5:** prompt trụ, Lõi, cổng ở đây là phong cách neon của Space Typing, dùng cho bản đồ neon (vùng 7–8). Bản đồ sách tranh (vùng 1–6) có Lõi, cổng và trụ kiểu sách tranh, prompt ở `docs/RIFT_DEFENSE_PLAN_V5_2026-10-21.md`, mục 23. Danh sách quái "đã có 2D, chỉ cần tạo 3D" (mục 5) vẫn đúng cho Campaign 3D. Bộ quái riêng của Defense V5 ở mục 13 của bản V5.

> **Dành cho:** chủ dự án (tạo ảnh 2D, rồi tạo mô hình 3D), AI làm tiếp (đưa vào game).
> **Kế hoạch:** `docs/SPACE_TYPING_DEFENSE_PLAN_V4_2026-10-21.md`.
> **Hiện tại:** game đã chạy đủ. 6 trụ, Lõi và cổng đang dùng tạm model relic và duel-target của chủ dự án. Ảnh và model trong tài liệu này để **thay** bản tạm cho đúng chất Defense.
> **Ảnh bản đồ** (8 đảo): `DEFENSE_MAPS_PROMPTS_2026-10-21.md`.

## 1. Cần làm gì

| Đợt | Món | Ảnh 2D lưu ở | Model 3D lưu ở | Đang dùng tạm |
|---|---|---|---|---|
| 1 | Lõi Rift | `art-src/defense/defense-core.png` | `art-src/3d/defense/defense-core.glb` | duel-target fate-crystal |
| 1 | Cổng Rift | `art-src/defense/defense-gate.png` | `art-src/3d/defense/defense-gate.glb` | duel-target black-hole |
| 1 | Trụ Băng (Frost Spire) | `art-src/defense/tower-frost.png` | `art-src/3d/defense/tower-frost.glb` | relic frost-rhythm |
| 1 | Trụ Hút (Gravity Well) | `art-src/defense/tower-gravity.png` | `art-src/3d/defense/tower-gravity.glb` | duel-target gravity |
| 2 | Trụ Sét (Arc Pylon) | `art-src/defense/tower-arc.png` | `art-src/3d/defense/tower-arc.glb` | duel-target disrupt |
| 2 | Trụ Mồi Nổ (Volatile Beacon) | `art-src/defense/tower-beacon.png` | `art-src/3d/defense/tower-beacon.glb` | duel-target lock-on |
| 2 | Đền Hồi Phục (Sanctum) | `art-src/defense/tower-sanctum.png` | `art-src/3d/defense/tower-sanctum.glb` | relic first-light-seed |
| 2 | Trụ Thu Năng (Energy Siphon) | `art-src/defense/tower-siphon.png` | `art-src/3d/defense/tower-siphon.glb` | relic perfect-capacitor |
| 3 | Quái Rainbow Scout, Rainbow Tank (vẽ lại 2D) | `art-src/enemies/rainbow-scout.png`, `rainbow-tank.png` | `art-src/3d/enemies/rainbow-scout.glb`, `rainbow-tank.glb` | model của họ prism |
| 3 | 8 quái và 1 boss đã có ảnh 2D | (đã có) | xem mục 5 | model gần giống |

- **Mỗi trụ chỉ cần một model.** Game tự thể hiện cấp và nhánh bằng kích thước, độ sáng, vòng sáng và màu.
- Thư mục `art-src/defense/` chưa có thì tạo mới.

## 2. Cách làm

1. **Ảnh 2D** (ChatGPT hoặc Gemini): ảnh vuông 1024×1024. Prompt = **phần chung** (mục 3.1) + **phần riêng** của món đó + **dòng nền**.
2. Chọn ảnh đẹp nhất, lưu đúng tên ở bảng mục 1.
3. **Model 3D** (Meshy hoặc Tripo): chọn **Image to 3D**, tải ảnh 2D vừa lưu lên. Thiết lập như mục 2 của `3D_TRIPO_MESHY_PROMPTS_2026-10-16.md` (PBR bật, tam giác).
   - Bật **tách nền** khi tải ảnh (Meshy: Remove Background), để không sót viền xanh hay hồng. Viền sót sẽ thành vệt phát sáng trên model.
   - Meshy bản mới bỏ qua nút đối xứng và nút Remove lighting, nên ảnh 2D phải tự đối xứng và sáng đều. Prompt ở mục 3 đã dặn sẵn.
   - Số tam giác: Lõi và cổng **9.000**; trụ **7.000**; quái **6.000**; boss **30.000**.
   - Tải về **GLB**, đặt cùng tên ảnh 2D (đuôi `.glb`), lưu đúng chỗ ở bảng mục 1.
4. Báo AI. AI trỏ preset sang file mới, chỉnh hướng, build và chụp kiểm tra.

## 3. Prompt ảnh 2D

### 3.1 Phần chung (dán đầu mọi prompt ở mục 3)

```
Single game asset concept for a fantasy tower-defense game: one structure standing on a low,
compact hexagonal base of dark obsidian stone with thin gold trim, the base about half as wide
as the structure is tall, one corner of the hexagon pointing straight at the viewer, seen from
the front and slightly above (3/4 view, about 25 degrees down, near-orthographic, no perspective
distortion), centred with a small margin, the whole object visible from base to tip, symmetrical,
one connected solid piece with every part touching (nothing floating, no thin wires or gaps),
bold readable silhouette that still reads from high above, painterly cinematic fantasy game art,
crisp clean edges, solid opaque materials (no glass, no transparency), soft even front lighting
with no harsh shadows or bright highlights, any energy, frost or lightning painted as glowing
veins on the surface (no loose bolts, sparks, smoke or debris), no motion blur, no glow spilling
onto the background, no text, no frame, no ground, no shadow.
```

### 3.2 Dòng nền (dán cuối)

- Mọi món **trừ Trụ Thu Năng**:
  `Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow; the subject contains no green at all.`
- **Trụ Thu Năng** (năng lượng màu ngọc lam, dễ lẫn nền xanh):
  `Flat pure #FF00FF magenta background, perfectly uniform, no gradient, no shadow; the subject contains no pink or magenta at all.`

### 3.3 Phần riêng

Mỗi trụ có **đỉnh khác hẳn nhau** để nhìn từ trên cao vẫn phân biệt: Băng là ngôi sao 6 cánh, Hút là quả cầu đen, Sét là vòng xuyến sáng, Mồi Nổ là con mắt đỏ, Đền là mái vòm vàng, Thu Năng là cột ngọc lam. Thân trụ dùng kim loại sáng (bạc, đồng, thép) để nổi trên nền map tối.

**Lõi Rift — `defense-core.png`** (thứ quái muốn phá, phải to và nổi bật nhất):
```
The Rift Core: a tall faceted violet-pink crystal heart held up by four thick curved obsidian
claws, two broad engraved gold rune bands wrapped tight around the crystal, the solid crystal
glowing bright magenta-white, the base is a wide round obsidian dais with gold runes instead
of the hexagon. Majestic, the heart of the island.
```

**Cổng Rift — `defense-gate.png`** (nơi quái đi ra; màu đỏ thẫm để khác Lõi):
```
The Rift Gate: a tall vertical ring portal of jagged black stone and short thick dark crimson
crystal spikes, a solid opaque swirling crimson, violet and black vortex disc filling the ring
edge to edge, two thick crystal pylons at its feet, cracked scorched rock instead of the hexagon
base. Menacing, an open wound in space.
```

**Trụ Băng — `tower-frost.png`** (làm chậm, màu băng `#7fd8ff`):
```
Frost Spire tower: a tall slender spire of frosted, opaque pale ice-blue crystal rising from the
base, surrounded at mid-height by a crown of six thick jagged ice shards splaying outward and up
like a snowflake (a six-pointed star when seen from above), frosted silver bands at its foot,
cyan frost runes carved and glowing along the facets, a sharp faceted crystal tip. Cold, elegant,
icy cyan glow.
```

**Trụ Hút — `tower-gravity.png`** (gom quái lại, màu tím `#b07bff`):
```
Gravity Well tower: a squat heavy pylon of polished silver-grey metal with violet enamel plates,
four thick curved claw arms holding a large charcoal-black sphere on top, open to the sky, with
glowing violet swirls on its surface, a thick violet band set flush around the sphere's equator
and fused to the arms, violet glowing seams on the pylon. Heavy, ominous, deep violet glow.
```

**Trụ Sét — `tower-arc.png`** (phá giáp, sét lan, màu trắng xanh `#9fc4ff`):
```
Arc Pylon tower: a tall tesla-coil tower of polished bronze with three thick stacked
copper-and-crystal coil rings hugging the column, topped by a thick glowing blue-white torus
(a doughnut-shaped discharge crown) with a short thick lightning rod rising from its centre,
short thick lightning-rod spikes around the base, electricity painted as bright blue-white veins
along the coils. Charged, technical, crackling blue-white glow.
```

**Trụ Mồi Nổ — `tower-beacon.png`** (đánh dấu quái để nổ, màu cam đỏ `#ff6a3d`):
```
Volatile Beacon tower: a short sturdy armoured mast of polished steel topped by a large red-orange
targeting lens like a single eye, tilted up toward the sky and framed by a thick metal reticle ring
fused to its rim, glowing ember-orange vents along the mast, orange warning chevrons on the plates,
small round bomb pods clamped to the base. Dangerous, alert, hot orange glow.
```

**Đền Hồi Phục — `tower-sanctum.png`** (hồi máu Lõi và sửa trụ, màu vàng ấm `#ffd36b`):
```
Sanctum tower: a small open shrine of white marble and gold with four sturdy pillars under a
domed gold canopy, a warm golden healing crystal standing on a short pedestal in the centre,
a short gold spire crowning the dome, leaf-shaped gold ornaments on the pillars. Holy, calm,
warm golden light.
```

**Trụ Thu Năng — `tower-siphon.png`** (kiếm thêm năng lượng, màu ngọc lam `#5cf2c8`; dùng nền hồng tím):
```
Energy Siphon tower: a squat reactor of polished silver metal with a tall solid column of opaque
glowing teal crystal in the middle, swirling energy patterns painted on it, three thick curved
collector arms hugging the column, glowing teal pipes running down the base, small gold energy
cells set around the rim. Busy, valuable, teal and gold glow.
```

### 3.4 Prompt dự phòng cho Text to 3D (khi không dùng ảnh)

Mỗi món dùng phần riêng ở trên, thêm đuôi:
`Stylized fantasy game asset, hand-painted PBR textures, single object, symmetrical, no ground, no text, energy only as painted glow.`

## 4. Quái Rainbow Scout và Rainbow Tank: vẽ lại 2D

Ảnh hiện tại của hai quái này là cùng một con bọ tím tối, quay ngang, không giống bộ Rainbow (vỏ kẹo thủy tinh óng ánh, viền vàng). Vẽ lại theo công thức của `ENEMIES_BOSSES.md`.

Ảnh mẫu đúng bộ: `art-src/enemies/rainbow-shield.png`. Nếu công cụ cho đính kèm ảnh, gửi kèm ảnh này và thêm dòng `Use the attached image only as a reference for material and colours, not for shape.` Hai prompt này giữ "rim light", vì ảnh còn dùng làm sprite cho game 2D.

> Lưu ý: ảnh trong `art-src/enemies/` cũng là ảnh quái của **game 2D**. Thay ảnh rồi chạy `pnpm sprites:prepare` thì quái Rainbow Scout và Tank trong Campaign 2D cũng đổi theo (đúng bộ Rainbow hơn).

**Rainbow Scout — `art-src/enemies/rainbow-scout.png`:**
```
Single game sprite for a vertical space shooter: one alien creature-craft seen from slightly
above and in front (3/4 top-down view), facing DOWN toward the viewer, centred with a small
margin, whole body visible, bold readable silhouette that still reads at 64 px,
painterly cinematic fantasy game art, crisp clean edges, solid opaque body, rim light,
no motion blur, no glow spilling onto the background, no text, no frame, no shadow on the ground.
Made of glossy iridescent candy-glass and soap-bubble membranes, pastel pink, sky cyan, gold
and lavender, tiny star sparkles on the shell. A small agile dart-shaped flyer with swept-back
wings, built for speed.
Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow; the subject contains no green at all.
```

**Rainbow Tank — `art-src/enemies/rainbow-tank.png`:**
```
Single game sprite for a vertical space shooter: one alien creature-craft seen from slightly
above and in front (3/4 top-down view), facing DOWN toward the viewer, centred with a small
margin, whole body visible, bold readable silhouette that still reads at 64 px,
painterly cinematic fantasy game art, crisp clean edges, solid opaque body, rim light,
no motion blur, no glow spilling onto the background, no text, no frame, no shadow on the ground.
Made of glossy iridescent candy-glass and soap-bubble membranes, pastel pink, sky cyan, gold
and lavender, tiny star sparkles on the shell. A heavy armoured juggernaut, broad and bulky,
with thick layered armour plates.
Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow; the subject contains no green at all.
```

Sau đó tạo model 3D từ ảnh mới (6.000 tam giác), lưu `art-src/3d/enemies/rainbow-scout.glb` và `rainbow-tank.glb`.

## 5. Đã có ảnh 2D, chỉ cần tạo 3D

Tải thẳng ảnh có sẵn lên Meshy/Tripo (Image to 3D), lưu model cùng tên:

| Ảnh 2D có sẵn | Lưu model ở | Đang dùng tạm |
|---|---|---|
| `art-src/enemies/devil-destroyer.png` | `art-src/3d/enemies/devil-destroyer.glb` | devil-cloaker |
| `art-src/enemies/frost-destroyer.png` | `art-src/3d/enemies/frost-destroyer.glb` | frost-commander |
| `art-src/enemies/frost-leech.png` | `art-src/3d/enemies/frost-leech.glb` | frost-healer |
| `art-src/enemies/prism-splitter.png` | `art-src/3d/enemies/prism-splitter.glb` | prism-healer |
| `art-src/enemies/rainbow-cloaker.png` | `art-src/3d/enemies/rainbow-cloaker.glb` | rainbow-commander |
| `art-src/enemies/rainbow-destroyer.png` | `art-src/3d/enemies/rainbow-destroyer.glb` | rainbow-shield |
| `art-src/enemies/shadow-destroyer.png` | `art-src/3d/enemies/shadow-destroyer.glb` | shadow-cloaker |
| `art-src/enemies/magma-tank.png` | `art-src/3d/enemies/magma-tank.glb` | (chưa dùng trong game) |
| `art-src/bosses/tyrant-g03.png` (30.000 tam giác) | `art-src/3d/bosses/tyrant-g03.glb` | warden-frost |

## 6. Không bắt buộc: drone đàn bầy theo họ

Hiện drone của quái Carrier dùng model Trinh Sát thu nhỏ của từng họ. Muốn drone riêng: phần chung quái ở mục 4 + phần họ trong `ENEMIES_BOSSES.md` mục 4 + `A tiny insect-like swarm drone with two pairs of thin wings and a small glowing core, readable at a very small size.` + dòng nền. Lưu `art-src/defense/<họ>-drone.png`, model `art-src/3d/defense/<họ>-drone.glb` (1.500 tam giác).

## 7. AI đưa vào game

- Trỏ `source` của `items/<id>` (quái: `enemies/<id>-3d`; boss: `bosses/<id>`) trong `scripts/models/presets/campaign3d-models.json` sang file mới; bỏ `placeholder` nếu có.
- Chạy `node scripts/models/index-3d-sources.mjs`, rồi `node scripts/models/prepare-campaign3d-models.mjs`. Pipeline báo REVIEW cho model mới: chỉnh `rotate` cho đúng hướng, chạy lại với `--force --only=<khóa>`.
- Chụp kiểm tra trong Defense và Campaign 3D.
