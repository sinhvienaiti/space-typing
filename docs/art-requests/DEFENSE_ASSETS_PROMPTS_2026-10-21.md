# Prompt tài sản cho Rift Defense (21/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh và mô hình), AI làm tiếp (đưa vào game).
> **Kế hoạch:** `docs/SPACE_TYPING_DEFENSE_PLAN_V3_2026-10-21.md`, mục 17.
> **Hiện tại:** Rift Defense đã chạy bằng tài sản có sẵn:
> - Lõi, cổng và 3 trụ dùng model relic và duel-target chủ dự án đã tạo;
> - quái và boss dùng model quái và boss đã đóng gói.
>
> Tài sản trong tài liệu này để **thay dần** cho đẹp và riêng hơn. Không có thì game vẫn chạy.
>
> **Cập nhật V4 (21/10):**
> - Game có **6 trụ**. Trụ Sét, Đền Hồi Phục, Trụ Thu Năng dùng tạm model có sẵn của chủ dự án (Trụ Sét: duel-target `disrupt`; hai trụ kia: relic). Prompt model riêng cho 3 trụ này ở `DEFENSE_MAPS_PROMPTS_2026-10-21.md` mục 6.
> - **Ảnh bản đồ** (8 đảo, có ảnh khung bố cục) ở `DEFENSE_MAPS_PROMPTS_2026-10-21.md`. Mục 3.7 "Đảo nổi" dưới đây không cần làm nữa.
> - Drone đàn bầy (mục 3.8) vẫn có ích: hiện drone dùng model Trinh Sát thu nhỏ của từng họ.

## 1. Thứ tự đề xuất

| Đợt | Món | Vì sao |
|---|---|---|
| 1 | Lõi (3.1), cổng (3.2), Trụ Băng 3 cấp (3.3) | Thấy nhiều nhất, quyết định "chất" của chế độ |
| 2 | Trụ Xích và Trụ Mồi Nổ 3 cấp (3.4, 3.5), ô đặt trụ (3.6) | Hoàn thiện bộ trụ |
| 3 | Drone đàn bầy theo họ quái (3.8) | Đàn bầy đẹp và đúng màu từng World |
| 4 | Đảo nổi (3.7), biểu tượng 2D (mục 4) | Hoàn thiện khung cảnh và giao diện |

## 2. Cách tạo

- **Mô hình 3D:** dùng Meshy hoặc Tripo, thiết lập như mục 2 của `3D_TRIPO_MESHY_PROMPTS_2026-10-16.md`.
  - Mục 3 có cả prompt ảnh 2D. Nên tạo ảnh 2D trước (Gemini/ChatGPT), chọn ảnh đẹp, rồi dùng **Image to 3D**. Không có ảnh thì dán prompt 3D vào **Text to 3D**.
  - Ảnh 2D: **nhìn thẳng từ trước, hơi chếch từ trên (khoảng 20°)**, vật thể nằm trọn trong khung, **nền xanh lá trơn #00FF00**, không chữ, không khung.
  - Số tam giác: Lõi và cổng 9.000; trụ 7.000; ô đặt trụ 2.000; drone 1.500; đảo nổi 20.000.
- **Tải về GLB**, đặt tên đúng như tên file ở tiêu đề mỗi mục, để vào `art-src/3d/defense/` (cả drone), rồi báo AI.
  - Ảnh 2D dùng để tạo model thì để vào `art-src/defense/`, cùng tên (đuôi `.png`).
  - Không lưu vào `~/Downloads/img-typing/` hay `art-src/models/raw/` nữa.
- **AI làm phần còn lại:**
  - file chưa nằm đúng chỗ thì chép vào `art-src/3d/defense/`;
  - trỏ trường `source` của mục `items/<id>` (drone: `enemies/<id>`) trong `scripts/models/presets/campaign3d-models.json` tới `defense/<tên file>.glb`;
  - dò hướng, giảm tam giác, thêm phát sáng;
  - đóng gói bằng `node scripts/models/prepare-campaign3d-models.mjs --only=<loại>/<id>` (`items` hoặc `enemies`). Bản đã xử lý ra `art-src/models/<loại>/`, bản chạy game ra `public/assets/space-typing/models/<loại>/`;
  - trụ 3 cấp: game hiện chỉ tải một model mỗi loại trụ (`items/tower-<loại>`, xem `src/defense/view/towers.ts`), nên cần thêm mã chọn model theo cấp;
  - chụp kiểm tra.

## 3. Mô hình 3D

Phong cách chung (đã có trong mỗi prompt): cosmic fantasy, crystal and dark metal, glowing energy, đọc rõ từ góc nhìn chéo trên cao.

### 3.1 Lõi Rift — `defense-core.glb`

**Ảnh 2D:**
> Game asset concept, a floating "Rift Core": a tall faceted violet crystal heart wrapped in three slowly orbiting gold rings with engraved runes, a cradle of dark obsidian claws holding it from below, inner light pulsing magenta and white, small crystal shards hovering around. Front view slightly from above, whole object in frame, centered, symmetrical, plain #00FF00 background, no text, painterly high-detail sci-fi fantasy style.

**3D (Text to 3D):**
> Floating rift core crystal: tall faceted violet crystal heart, three thin gold rune rings around it, dark obsidian claw cradle below, small hovering crystal shards, glowing magenta-white core, symmetrical, game prop, PBR, clean silhouette, no base plate.

### 3.2 Cổng Rift — `defense-gate.glb`

**Ảnh 2D:**
> Game asset concept, a "Rift Gate" portal: a vertical ring of jagged black stone and crystal spikes, a swirling vortex of violet, pink and cyan light inside, chains of floating rock fragments around the rim, two crystal pylons at the base. Front view slightly from above, whole object in frame, symmetrical, plain #00FF00 background, no text.

**3D:**
> Vertical rift portal gate: ring of jagged black stone with crystal spikes, swirling violet-pink vortex membrane inside, floating rock fragments around the rim, two crystal pylons at the base, symmetrical, game prop, PBR, readable silhouette from above.

### 3.3 Trụ Băng 3 cấp — `tower-frost-1.glb`, `tower-frost-2.glb`, `tower-frost-3.glb`

Cùng một thiết kế, cấp sau to và nhiều chi tiết hơn. Tạo ảnh cấp 1 trước, rồi sửa prompt để có cấp 2 và cấp 3.

**Ảnh 2D (cấp 1):**
> Game asset concept, "Frost Spire" tower level 1: a slim pale-blue ice crystal obelisk on a round dark-metal base with silver trim, a ring of frost runes glowing cyan around the middle, cold mist at the foot. Front view slightly from above, whole tower in frame, symmetrical, plain #00FF00 background, no text.

- **Cấp 2:** thêm *"two smaller crystal spikes flanking the obelisk, a floating snowflake halo above the tip"*.
- **Cấp 3:** thêm *"a crown of six ice spikes, a large rotating snowflake halo, frozen shards orbiting, brighter cyan core"*.

**3D (cấp 1):**
> Frost spire tower: slim pale-blue ice crystal obelisk on a round dark metal base with silver trim, glowing cyan frost rune ring around the middle, symmetrical, game tower, PBR, clean silhouette from above.

### 3.4 Trụ Xích 3 cấp — `tower-gravity-1/2/3.glb`

**Ảnh 2D (cấp 1):**
> Game asset concept, "Gravity Well" tower level 1: a squat dark-metal pylon holding a small black-violet singularity sphere between two curved arms, a faint violet distortion ring around the sphere, purple glow lines on the base. Front view slightly from above, whole tower in frame, symmetrical, plain #00FF00 background, no text.

- **Cấp 2:** *"four curved arms, a larger singularity, two orbiting rings"*.
- **Cấp 3:** *"an open cage of arms, a big singularity with a bright accretion disk, gravity chains hanging down"*.

**3D (cấp 1):**
> Gravity well tower: squat dark metal pylon with two curved arms holding a black-violet singularity sphere, violet distortion ring, purple glow lines, symmetrical, game tower, PBR.

### 3.5 Trụ Mồi Nổ 3 cấp — `tower-beacon-1/2/3.glb`

**Ảnh 2D (cấp 1):**
> Game asset concept, "Volatile Beacon" tower level 1: a narrow dark tower with a red-orange targeting lens on top like an eye, a rotating reticle ring around the lens, ember vents on the sides, warning chevrons in orange. Front view slightly from above, whole tower in frame, symmetrical, plain #00FF00 background, no text.

- **Cấp 2:** *"twin lenses, a taller mast, a bigger reticle ring"*.
- **Cấp 3:** *"a large burning lens, three reticle rings, small bomb pods on the base"*.

**3D (cấp 1):**
> Volatile beacon tower: narrow dark metal tower topped by a glowing red-orange targeting lens eye, a reticle ring around it, ember vents, orange warning chevrons, symmetrical, game tower, PBR.

### 3.6 Ô đặt trụ — `tower-pad.glb`

> Hexagonal tower build pad: low dark obsidian hexagon platform with thin glowing violet circuit lines, a recessed center circle, four small crystal studs on the corners, flat top, game prop, PBR, top-down readable.

### 3.7 Đảo nổi làm bản đồ — `defense-island.glb`

> Large floating island battlefield seen from above: a flat wide plateau of dark rock and violet crystal veins, smooth flat top area for a winding road, broken jagged underside with hanging crystals and roots, small crystal clusters on the edges, game environment piece, PBR.

### 3.8 Drone đàn bầy theo họ — `<họ>-drone.glb` (8 file)

Prompt chung, thay phần trong ngoặc theo họ:

> Tiny swarm drone creature, insect-like, two pairs of thin wings and a small glowing core, (STYLE), symmetrical, readable at small size, game enemy, PBR.

| Họ | STYLE |
|---|---|
| rainbow | pearlescent white shell with rainbow iridescent wings |
| angel | gold and ivory plates with feather-shaped wings |
| devil | black and crimson horned shell with lava-red glow |
| frost | ice-blue crystal shell with frosted transparent wings |
| prism | violet-blue prism crystal shell with rainbow refractions |
| nature | green leaf wings and wooden shell with glowing seeds |
| shadow | dark purple smoke-like shell with violet flame wings |
| cosmic | deep blue starry shell with gold trims and nebula wings |

## 4. Biểu tượng 2D (Gemini / ChatGPT)

- Cỡ 512×512, nền trong suốt (hoặc nền xanh #00FF00 để AI tách), không chữ.
- Phong cách Holo Command của game: viền phát sáng, kim loại tối, năng lượng tím, cam và xanh.
- Đặt tên như bảng, để vào `art-src/defense/icons/` (tạo thư mục nếu chưa có).

| Tên file | Prompt |
|---|---|
| `icon-tower-frost.png` | Game UI icon, a slim ice crystal obelisk tower with a cyan rune ring, glowing frost aura, dark holographic frame, centered. |
| `icon-tower-gravity.png` | Game UI icon, a dark pylon holding a black-violet singularity sphere with a distortion ring, purple glow, centered. |
| `icon-tower-beacon.png` | Game UI icon, a dark tower with a red-orange targeting lens eye inside a rotating reticle, ember glow, centered. |
| `icon-skill-breath.png` | Game UI icon, a dragon head breathing a cone of fire full of tiny bomb sparks, orange and gold, centered. |
| `icon-skill-roar.png` | Game UI icon, a dragon roaring with golden shockwave rings pushing outward, centered. |
| `icon-skill-nova.png` | Game UI icon, a bright white-violet nova burst with short letter glyphs flying out, centered. |
| `boon-wide-blast.png` … `boon-eager-dragon.png` (9 tấm) | Game card art, (TÊN PHƯỚC LÀNH: mô tả ở V3 mục 9), dark violet card background with glowing rune border, centered emblem. |
| `rift-defense-keyart.png` (1600×900) | Key art: a winged fire dragon hovering over a glowing violet crystal core on a floating island, a winding energy road to a swirling rift portal, a horde of crystal creatures pouring out, frost and gravity towers along the road, cosmic nebula sky, epic, cinematic. |
