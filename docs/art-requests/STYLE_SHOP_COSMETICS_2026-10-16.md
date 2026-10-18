# Style Shop: ảnh 2D cho avatar, khung và ảnh nền (16/10/2026)

> **Dành cho:** chủ dự án và công cụ tạo ảnh 2D (ChatGPT Images hoặc tương tự).
>
> **Code đã xong, chạy ngay không cần ảnh.**
> - Avatar hiện bằng biểu tượng và màu chuyển.
> - Khung vẽ bằng CSS.
> - Ảnh nền thẻ phi công dùng màu chuyển (gradient).
>
> Ảnh vẽ chỉ để **thay** bản dựng bằng mã cho đẹp hơn. Thiếu ảnh nào thì món đó vẫn dùng bản dựng bằng mã.
>
> Danh mục đầy đủ (tên, giá, cách mở khóa): `src/cosmetics/catalog.ts`.

## 0. Cách đưa ảnh vào game

1. Lưu ảnh **WebP** đúng tên và đúng thư mục ở bảng dưới (tính từ `games/space-typing/`).
2. Chạy `pnpm cosmetics:manifest` trong `games/space-typing`. Lệnh này ghi `public/assets/space-typing/cosmetics/manifest.json`, liệt kê ảnh nào đã có. Game chỉ tải ảnh có trong danh sách, nên không phát sinh lỗi 404.
3. Ở thư mục gốc chạy `pnpm build:space`, rồi tải lại trang.

| Loại | Thư mục | Kích thước | Nền |
|---|---|---|---|
| Avatar | `public/assets/space-typing/cosmetics/avatars/<id>.webp` | 256×256 | Kín (không trong suốt). Game tự cắt hình tròn. |
| Khung | `public/assets/space-typing/cosmetics/frames/<id>.webp` | 320×320 | **Trong suốt**. Chỉ vẽ vòng khung; giữa trống để lộ avatar. Game phủ ảnh rộng hơn avatar 12% mỗi phía. |
| Ảnh nền | `public/assets/space-typing/cosmetics/banners/<id>.webp` | 1200×400 | Kín. Game phủ lên thẻ phi công với độ mờ 55%, nên giữ phần giữa và bên trái tối, không nhiều chi tiết sau chữ. |

Nén WebP chất lượng 82–88. Avatar và khung mỗi file dưới 60 KB, ảnh nền dưới 150 KB.

## 1. Phong cách chung

Dán đoạn này **ở đầu mọi lời nhắc**:

```
Game UI art for "Space Typing", a sci-fi fantasy space shooter where you type English words. Holo Command
style: dark navy space, glassy holographic surfaces, crisp neon rim light, premium mobile/PC game quality,
clean readable silhouette that still reads at 40 px, no text, no letters, no numbers, no logo, no watermark.
```

**Màu theo độ hiếm** (thêm một dòng tương ứng):

| Độ hiếm | Dòng thêm |
|---|---|
| Common | `Simple, clean, one main colour, soft glow.` |
| Rare | `Two-tone, brighter glow, a few fine engraved details.` |
| Epic | `Rich detail, layered glow, small floating particles, polished metal and crystal.` |
| Legendary | `Spectacular: gold or iridescent materials, strong bloom, orbiting light streaks, feels precious.` |

## 2. Avatar (16 ảnh) — `avatars/<id>.webp`

Thêm sau phần chung:

```
A circular pilot emblem portrait for a profile avatar, centred subject filling about 70% of a square canvas,
dark radial background in the given colours, subtle starfield. Subject: <SUBJECT>. Colours: <C1> to <C2>.
```

| id | Tên | Độ hiếm | `<SUBJECT>` | `<C1>`, `<C2>` |
|---|---|---|---|---|
| `avatar-cadet` | Cadet | Common | a young pilot helmet seen from the front, visor glowing | #2a4a7a, #5fe3ff |
| `avatar-rocket` | Launch | Common | a small rocket blasting upward with a bright exhaust | #173a6b, #7dd8ff |
| `avatar-keys` | Keysmith | Common | three glowing keyboard keys floating in a row, keycaps blank | #20304f, #a8c4ff |
| `avatar-book` | Scholar | Common | an open glowing holographic book with light rising from the pages | #2b2350, #c4a8ff |
| `avatar-shield` | Guardian | Common | a hexagonal energy shield emblem | #123b3a, #5dffc8 |
| `avatar-target` | Marksman | Rare | a precise targeting reticle locking on a tiny star | #4a1622, #ff6f86 |
| `avatar-zap` | Overcharge | Rare | a crackling lightning bolt splitting into branches | #3a3000, #ffe066 |
| `avatar-flame` | Wildfire | Rare | a stylised flame shaped like a comet | #4a1400, #ff8a3d |
| `avatar-ghost` | Phantom | Rare | a translucent hooded phantom pilot, eyes glowing | #1d1838, #b9a4ff |
| `avatar-globe` | Polyglot | Rare | a holographic planet with orbit rings of light | #0b3550, #6fd6ff |
| `avatar-skull` | Reaper | Epic | a sleek armoured skull mask with glowing eye slits | #2a0a14, #ff3d6a |
| `avatar-sparkle` | Starborn | Epic | a figure made of stardust and constellations | #291a4a, #ffd166 |
| `avatar-trophy` | Champion | Epic | a gleaming trophy cup with a star on top | #3a2a00, #ffc83f |
| `avatar-calendar` | Devoted | Epic | a glowing ring of 14 small lit dots around a crescent moon | #0f3a2a, #7dffb5 |
| `avatar-crown` | Sovereign | Legendary | a radiant crown of light crystals | #3a1f00, #fff1b8 |
| `avatar-star` | Supernova | Legendary | an exploding star with pink and gold shock rings | #2a0f3a, #ff9ad5 |

## 3. Khung (10 ảnh) — `frames/<id>.webp`

Thêm sau phần chung:

```
A circular avatar frame ring on a fully TRANSPARENT background (alpha), the centre 76% of the circle left
completely empty and transparent for a portrait. Ring style: <STYLE>. Colours: <COLOURS>.
Front view, perfectly round, symmetrical.
```

| id | Tên | Độ hiếm | `<STYLE>` | `<COLOURS>` |
|---|---|---|---|---|
| `frame-basic` | Standard | Common | thin brushed steel ring with two small rivets | #3b5f86 |
| `frame-cyan` | Holo Ring | Common | thin glowing holographic ring | #5fe3ff |
| `frame-emerald` | Emerald | Common | polished green crystal band | #5dffaa |
| `frame-dual-dawn` | Dawn Split | Rare | ring split in two halves, gold top and pink bottom, a tiny sun at the top | #ffd166, #ff6fae |
| `frame-dual-ice` | Cryo Split | Rare | ice crystal ring, frosted top half, deep blue bottom half, small ice spikes | #c8f4ff, #4d85ff |
| `frame-ember` | Ember Edge | Rare | hot metal ring with glowing cracks and drifting sparks | #ff8a3d, #ff3d3d |
| `frame-prism` | Prism | Epic | faceted prism ring refracting a rainbow | #5fe3ff, #a07bff, #ff6fae, #ffd166 |
| `frame-void` | Void Prism | Epic | dark obsidian ring with violet energy veins and a magenta glow | #7a3dff, #1c0b3a, #ff3d9a |
| `frame-orbit-gold` | Golden Orbit | Legendary | ornate gold ring with small winged ornaments at the four sides | #fff1b8, #ffc83f, #ff8418 |
| `frame-orbit-aurora` | Aurora Orbit | Legendary | ring of flowing aurora ribbons, green to cyan to violet | #7dffb5, #5fe3ff, #a07bff |

Ghi chú: hai khung Orbit vẫn có "sao chổi" chạy quanh vòng, do game vẽ thêm phía trên ảnh. Không cần vẽ sao chổi vào ảnh.

## 4. Ảnh nền thẻ phi công (8 ảnh) — `banners/<id>.webp`

Thêm sau phần chung:

```
A wide 3:1 background banner for a pilot profile card, darker and calm on the left 60% where the name and
avatar sit, the interesting detail on the right third. Scene: <SCENE>.
```

| id | Tên | Độ hiếm | `<SCENE>` |
|---|---|---|---|
| `banner-default` | Hangar | Common | inside a dim spaceship hangar, soft blue floor lights, a ship silhouette far right |
| `banner-nebula` | Nebula | Common | soft purple and magenta nebula clouds with a few stars |
| `banner-ocean` | Deep Ocean | Common | a teal alien ocean planet horizon seen from orbit |
| `banner-sunset` | Red Giant | Rare | a huge red giant star rising on the right, warm haze |
| `banner-aurora` | Aurora | Rare | green and violet aurora over a frozen moon surface |
| `banner-circuit` | Circuit | Epic | glowing cyan circuit lines on dark glass, fading to the left |
| `banner-inferno` | Inferno | Epic | a volcanic planet with rivers of lava glowing from below right |
| `banner-galaxy` | Spiral Galaxy | Legendary | a bright golden spiral galaxy on the right, deep violet space |

## 5. Phần không cần ảnh

- **Danh hiệu (Titles):** là chữ, game tự vẽ.
- **Vệt động cơ, màu đạn:** game tự đổi màu lửa động cơ và vệt đạn.
- **Màu sơn tàu:** game tự tô lại ảnh tàu đã vẽ, một lần, không tốn thời gian mỗi khung hình. Khi tàu có mô hình 3D (`models/ships/<id>`), màu sơn sẽ đổi vật liệu của mô hình. Phần này làm sau, khi có mô hình tàu đầu tiên.
- **Gói vật phẩm, bùa Credits:** dùng biểu tượng có sẵn.
