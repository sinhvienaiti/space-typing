# Prompt ảnh bản đồ cho Rift Defense (21/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh), AI làm tiếp (đưa ảnh vào game).
> **Kế hoạch:** `docs/SPACE_TYPING_DEFENSE_PLAN_V4_2026-10-21.md`, mục 8.
> **Hiện tại:** game tự vẽ tạm mặt đảo của 8 bản đồ bằng mã. Ảnh trong tài liệu này để **thay** ảnh tạm cho đẹp và chân thật hơn. Chưa có ảnh thì game vẫn chạy.

## 1. Cách làm (mỗi bản đồ)

1. Mở thư mục `docs/art-requests/defense-maps/`. Mỗi bản đồ có hai ảnh:
   - `NN-<id>-layout.png`: **ảnh khung bố cục**. Đường, ô xây, Lõi, cổng nằm đúng chỗ game cần.
   - `NN-<id>-now.jpg`: ảnh game đang vẽ tạm, để so sánh.
2. Mở ChatGPT (tạo ảnh) hoặc Gemini. **Tải ảnh khung lên**, rồi dán prompt chung (mục 2) và prompt riêng của bản đồ đó (mục 3).
3. Chọn ảnh đẹp nhất. Kiểm tra theo mục 4.
4. Lưu ảnh tên `<id>.png` (ví dụ `rainbow-reach.png`), để vào `art-src/defense/maps/` (tạo thư mục nếu chưa có), rồi báo AI.

**Ý nghĩa màu trong ảnh khung:**

| Màu | Là gì | Trong ảnh vẽ phải thành |
|---|---|---|
| Hồng tím `#FF00FF` | Đường quái đi | Con đường lát đá, **đúng hình và đúng bề rộng** dải hồng |
| Xanh dương `#00A0FF` | Ô xây thường | Bệ đá lục giác, trống |
| Xanh lơ `#00FFFF` | Ô cao điểm | Bệ lục giác cao hơn, viền vàng |
| Xanh lá `#00FF80` | Ô mạch năng lượng | Bệ lục giác có mạch sáng tím |
| Vàng ô-liu `#808000` | Ô đổ nát | Bệ lục giác phủ đá vụn |
| Vàng `#FFD700` | Lõi | Quảng trường tròn lát đá, vòng rune |
| Đỏ `#FF2020` | Cổng Rift | Nền đá cháy sém quanh một vết nứt sáng |
| Xám | Mặt đảo | Mặt đất của World đó |
| Đen | Ngoài đảo | Giữ màu đen tuyền (game không dùng phần này) |

## 2. Prompt chung (dán trước prompt riêng)

> Paint over the attached layout image to make a top-down game battlefield map. Keep the layout EXACTLY: the magenta band becomes a paved stone road with the same shape, position and width; every hexagon becomes an empty hexagonal stone tower platform at the same spot and size (no towers on them); the yellow circle becomes a round stone plaza with a ring of glowing runes; each red circle becomes scorched rock around a glowing rift crack; the grey disc becomes the island ground; everything outside the island stays pure black. Straight top-down orthographic view (camera at 90°, no perspective, no horizon). Paint it like a floor texture: flat, even, shadowless lighting with no cast shadows, no highlights and no sun direction (the game lights the 3D ground itself). Everything lies flat on the ground: cracks, inlays, moss, frost, lava seams, rune lines. Nothing stands up: no columns, trees, rocks, crystals or mushrooms sticking up (the game adds those as 3D models). Rich, realistic hand-painted game environment, crisp fine detail that still reads from far away and up close at a low angle. No text, no letters, no numbers, no UI, no characters, no monsters, no buildings on the pads. Square image, as large as possible (2048 × 2048 if available).

## 3. Prompt riêng từng bản đồ

### 3.1 Cầu Vồng — `rainbow-reach` (ảnh khung `01-rainbow-reach-layout.png`)

> World: Rainbow Reach. The island ground is dark violet slate rock with fine cracks, a few iridescent crystal veins glowing pink and cyan, flat rainbow crystal inlays near the island edge. The road is smooth lavender-grey cobblestone with pale silver curb stones and small cyan rune lights along both edges. Mood: magical, calm, starlit.

### 3.2 Vườn Hào Quang — `halo-garden` (`02-halo-garden-layout.png`)

> World: Halo Garden, an angelic sky garden. The island ground is dusky grey-violet marble with thin gold inlay lines, patches of pale moss and tiny white flowers pressed flat, cracked marble slabs set into the ground near the edge. The road is warm cream flagstone with gold curb stones and small golden rune lights. The plaza is white marble with gold rings. Mood: holy, serene, golden light.

### 3.3 Hố Dung Nham — `ember-hollow` (`03-ember-hollow-layout.png`)

> World: Ember Hollow, a volcanic hell crater. The island ground is dark basalt with glowing orange lava cracks and small pools of molten lava away from the road, ash and scorched rock. The road is dark brown volcanic flagstone with glowing orange curb seams. The two high-ground pads in the middle stand on a raised basalt island between the two roads. Mood: hot, dangerous, ember glow.

### 3.4 Màn Sương Băng — `frost-veil` (`04-frost-veil-layout.png`)

> World: Frost Veil, a frozen tundra. The island ground is deep blue-grey frozen rock with frost patterns, thin snow dust at the edges, frost crystals lying flat on the rock. The long straight stretches of the road are glossy polished ice with frost streaks (enemies slide on them); the bends are pale blue cobblestone. Curb stones are icy blue with small cyan rune lights. Mood: cold, crisp, misty.

### 3.5 Tháp Lăng Kính — `prism-spire` (`05-prism-spire-layout.png`)

> World: Prism Spire, a crystal world. The island ground is dark indigo glass-like crystal rock with faceted surfaces and violet light refracting inside, flat prism shard inlays along the edge. The road is deep violet stone with lilac curbs and pink rune lights; where the road crosses itself in the middle, paint a clear stone crossroads. Mood: mysterious, prismatic sparkle.

### 3.6 Rừng Hoang — `verdant-wild` (`06-verdant-wild-layout.png`)

> World: Verdant Wild, an overgrown jungle island. The island ground is dark green moss and earth with flat roots, glowing green spores and seeds, bioluminescent moss patches. The two roads are old brown flagstone half covered by moss, with tan curbs. The olive hexagons are tower platforms covered with vines and scattered rubble chips (still clearly hexagonal). Mood: wild, lush, glowing green.

### 3.7 Khe Bóng Tối — `shadow-rift` (`07-shadow-rift-layout.png`)

> World: Shadow Rift, a cursed dark realm. The island ground is ash-grey stone with violet shadow fog pooling in hollows, thin purple veins of corrupted light, dead thorny roots lying flat. The three roads are dark slate cobblestone with violet curbs and small lavender rune lights, joining into one road before the plaza. Mood: eerie, haunted, but readable (not pitch black).

### 3.8 Ngai Vũ Trụ — `cosmic-throne` (`08-cosmic-throne-layout.png`)

> World: Cosmic Throne, the final throne among the stars. The island ground is deep blue star-dusted stone with golden constellation lines, tiny glowing star points, flat meteor-stone inlays at the edge. The spiral road is dark blue polished stone with gold curb stones and soft blue rune lights. The central plaza is a golden throne circle with ornate rings. Mood: epic, majestic, celestial.

## 4. Kiểm tra trước khi gửi

- Đặt ảnh vẽ chồng lên ảnh khung (giảm độ mờ 50 %): đường, bệ, Lõi, cổng phải **trùng khớp**. Lệch quá nửa bề rộng đường thì tạo lại.
- Nhìn thẳng từ trên xuống, không có đường chân trời.
- Không có bóng đổ, không có vật đứng lên (cột, cây, đá, pha lê, nấm). Mọi chi tiết nằm phẳng trên mặt đất, vì người chơi có thể hạ camera nhìn ngang; vật đứng lên do game thêm bằng mô hình 3D.
- Không có chữ, quái, trụ hay nhân vật.
- Đường đủ sáng để nhãn chữ và quái đọc rõ trên đó. Mặt đất **tối hơn quái** của họ đó (quái angel trắng vàng, frost xanh trắng, nên đất phải tối).

## 5. AI đưa ảnh vào game

1. Thu ảnh về 2048 × 2048, chuyển WebP, lưu `public/assets/space-typing/defense/maps/<id>.webp`.
2. Thêm `art: "/assets/space-typing/defense/maps/<id>.webp"` vào bản đồ đó trong `src/defense/rules/maps.ts`. Game dùng ảnh này thay cho ảnh tạm. Độ cao địa hình (đường lõm, bệ nổi, vực) vẫn tính từ bố cục, nên ảnh khớp khung thì khớp địa hình.
3. Chụp kiểm tra bằng `scripts/visual/scenarios/defense.mjs`.
4. Muốn xuất lại ảnh khung (khi đổi bố cục): `URL=http://127.0.0.1:3098/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense-map-guides.mjs`.

## 6. Mô hình 3D cho trụ, Lõi và cổng

Prompt ảnh 2D và cách tạo model cho cả 6 trụ, Lõi và cổng nay ở `DEFENSE_ASSETS_PROMPTS_2026-10-21.md` (mục 3). Ảnh lưu ở `art-src/defense/`, model ở `art-src/3d/defense/`.
