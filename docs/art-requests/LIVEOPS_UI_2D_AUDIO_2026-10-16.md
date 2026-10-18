# Yêu cầu ảnh 2D và âm thanh: Daily Hub (quà online) và âm thanh giao diện (16/10/2026)

> **Dành cho:** chủ dự án và AI tạo ảnh/âm thanh được giao (ChatGPT Images, Gemini, ElevenLabs Sound Effects…).
>
> **Bối cảnh:** `docs/ONLINE_RETENTION_UIUX_3D_PROPOSAL_2026-10-16.md` và `docs/LIVEOPS_UIUX_3D_IMPLEMENTATION_2026-10-16.md`.
>
> Code đã sẵn tên file và đường dẫn. Đặt đúng chỗ, đúng tên thì lần build sau game tự nhận. Món nào chưa có thì game vẫn chạy, dùng hình dựng bằng CSS hoặc âm tổng hợp.

## A. Ảnh 2D cho Daily Hub (18 ảnh)

### A.1 Cách làm
1. Tạo ảnh vuông **1024×1024** theo lời nhắc (riêng `hub-banner` là ảnh ngang **1536×384**). Mỗi lời nhắc = **phần chung** (A.2) + **phần riêng** (A.3).
2. Lưu ảnh gốc PNG vào **`games/space-typing/art-src/liveops/<tên>.png`** (thư mục này không đưa lên Git; tự tạo nếu chưa có).
3. Chạy trong `games/space-typing`:

   ```bash
   pnpm liveops-art:prepare
   ```

   Script sẽ tự làm 4 việc: tách nền, cắt sát vật, căn giữa, rồi xuất WebP vào **`games/space-typing/src/assets/liveops/<tên>.webp`** đúng kích thước game cần.
   Muốn làm lại một ảnh: `pnpm liveops-art:prepare streak-flame`.
4. Ở thư mục gốc `typing-game`: `pnpm build:space`, rồi tải lại trang.

**Nền ảnh:**
- Tốt nhất: **nền trong suốt** (ghi "transparent background").
- Nếu không được: **nền phẳng một màu xanh lá #00FF00**. Riêng vật có màu xanh lá thì dùng **hồng tím #FF00FF**.
- Không đổ bóng xuống đất, không sao, không chữ, không khung.
- `hub-banner` là tranh phong cảnh có nền thật, không cần tách nền.

**Làm thử trước:** 3 ảnh `chest-daily-closed`, `streak-flame`, `currency-star-crystal`. Chủ dự án duyệt kiểu vẽ rồi mới làm phần còn lại.

### A.2 Phần chung (dán trước mọi lời nhắc, trừ `hub-banner`)

```
Premium sci-fi fantasy game UI asset, 1:1 square, glossy stylised 3D render look like a high-end
mobile space RPG (clean shapes, soft global illumination, crisp rim light, subtle bloom on glowing parts),
one single object centred, filling about 75% of the frame, three-quarter view from slightly above,
bold silhouette readable at 48 px, colour palette built on cyan #5fe3ff and violet #a07bff accents
unless the object says otherwise, transparent background (if transparency is not possible: perfectly flat
pure green #00FF00 background with no gradient), no cast shadow on the ground, no text, no letters,
no numbers, no frame, no border, no watermark, no UI elements.
```

### A.3 Danh sách

| Tên file (`art-src/liveops/…png`) | Dùng ở đâu | Kích thước game | Phần riêng của lời nhắc |
|---|---|---|---|
| `chest-daily-closed` | Rương điểm năng động ngày (chưa mở) | 256 | `a compact sci-fi supply chest, closed, armoured cyan and white panels with gold trim, glowing cyan seams and a small holographic lock on the front` |
| `chest-daily-open` | Rương ngày đã mở, màn mở quà | 256 | `the same compact sci-fi supply chest wide open, lid tilted back, bright golden light and floating crystal shards bursting out of it` |
| `chest-weekly-closed` | Rương tuần (chưa mở) | 256 | `a larger ornate sci-fi treasure chest, closed, deep violet and gold armour plates, glowing violet runes, crystal ornaments on the corners` |
| `chest-weekly-open` | Rương tuần đã mở | 256 | `the same ornate violet and gold sci-fi treasure chest wide open, intense white-gold light and a fountain of gems and star crystals pouring out` |
| `chest-milestone` | Quà mốc chuỗi ngày (3, 7, 14… ngày) | 320 | `a legendary celestial reward chest with angel-like metal wings on its sides, white-gold and cyan, a radiant star emblem on the lid, light rays behind it` |
| `streak-flame` | Ngọn lửa chuỗi ngày học | 256 | `a stylised magical flame made of layered orange, gold and white fire with a cyan crystal core at its base, energetic and alive, slight swirl (accent colours: orange #ff9b3d and gold #ffd76a instead of cyan)` |
| `streak-shield` | Lá chắn giữ chuỗi | 128 | `a small kite-shaped energy shield emblem, gold metal rim, glowing amber hexagon pattern inside, a tiny flame symbol in the centre (accent colour amber #ffb547)` |
| `calendar-gift` | Ô điểm danh thường | 160 | `a small gift box wrapped in glowing cyan light ribbons, metallic white box with a hologram bow on top` |
| `calendar-gift-big` | Ô điểm danh lớn (ngày 7/14/21/28) | 192 | `a bigger luxurious gift box, violet and gold with a glowing star-shaped bow, sparkles orbiting it` |
| `mail-crate` | Thư trong hộp thư | 160 | `a sealed holographic space mail capsule, white and cyan with a glowing envelope symbol projected on its side` |
| `supply-drop` | Quà Warp miễn phí theo giờ | 192 | `a small orbital supply drop pod descending with blue thruster glow beneath it, carrying a glowing cyan energy cell, white armour panels` |
| `playtime-gift` | Quà thời gian chơi | 160 | `a gift box shaped like a little hourglass capsule, pink and cyan glowing sand inside, chrome caps (accent colours: pink #ff8ad8 and cyan)` |
| `currency-credits` | Biểu tượng tiền Credits | 96 | `a single thick gold coin with a stylised C-shaped engraving and cyan circuit lines, slightly tilted, shiny (accent colour gold #ffd76a)` |
| `currency-alloy` | Biểu tượng Alloy | 96 | `a hexagonal ingot of blue-silver metal alloy with brushed surface and glowing blue edges (accent colour steel blue #9fd0ff)` |
| `currency-star-crystal` | Biểu tượng Star Crystal | 96 | `a faceted violet star-shaped crystal with inner light and tiny sparkles (accent colour violet #c69bff)` |
| `currency-quantum-core` | Biểu tượng Quantum Core | 96 | `a small glowing sphere core with orbiting energy rings, teal and white (accent colour teal #63ffd8)` |
| `currency-warp` | Biểu tượng Warp (thể lực) | 96 | `a lightning-bolt shaped energy cell, cyan glass with white electric core and small arcs (accent colour cyan #5fe3ff)` |
| `hub-banner` | Ảnh đầu hộp thoại Daily Hub | 1600×400 | Xem lời nhắc riêng dưới đây |

**Lời nhắc riêng cho `hub-banner`** (dán nguyên văn, không dùng phần chung):

```
Wide cinematic game banner 4:1 (1536x384), the hangar deck of a space carrier at night seen from inside,
large window showing a colourful nebula and a planet, holographic mission boards and floating gift crates
glowing cyan and violet, soft depth of field, the left two-thirds darker and calm so white text can sit on it,
painterly sci-fi fantasy game art, no characters, no text, no letters, no logo, no watermark.
```

**Ghi chú code:**
- Code đọc ảnh ở `src/ui/liveops-art.ts`.
- Màn mở quà dùng `chest-*-open`, `chest-milestone`, `mail-crate`, `supply-drop`.
- Chip tiền tệ trong Daily Hub dùng `currency-*`.

## B. Âm thanh giao diện (8 file)

Hiện game tự tổng hợp các âm này bằng code. Có file thật thì game dùng file.

### B.1 Cách làm
1. Tạo âm theo mô tả (ElevenLabs Sound Effects, hoặc thư viện có giấy phép rõ như Sonniss GDC, Kenney).
2. Xuất **OGG Vorbis, 44,1 kHz, mono hoặc stereo**. Cắt sạch khoảng lặng đầu (âm phải bắt đầu ngay).
3. Đặt vào **`games/space-typing/src/assets/audio/ui/<tên>.ogg`**.
4. `pnpm build:space`.
5. Ghi nguồn và giấy phép vào `public/assets/audio/ATTRIBUTION.md`.

**Mức to:**
- `hover`: khoảng −30 LUFS.
- `tab`, `open`, `close`, `error`: khoảng −24 LUFS.
- `reward-*`, `streak`: khoảng −18 LUFS.
- Đỉnh không quá −1 dBFS.

**Hướng âm:** công nghệ quân sự, chắc, ấm. **Không** dùng chuông cao kiểu "tinh tinh". Riêng âm tiền tệ được phép có tiếng đá quý va nhẹ.

### B.2 Danh sách

| Tên file | Khi nào phát | Dài | Mô tả gửi AI tạo âm (tiếng Anh) |
|---|---|---|---|
| `hover` | Rê chuột qua nút, thẻ | 0,05–0,08 s | `very short soft holographic UI tick, low-mid, airy, no pitch, sci-fi interface` |
| `tab` | Đổi tab, đổi lựa chọn | 0,1 s | `short tactile sci-fi UI click with a tiny servo blip, dry, crisp` |
| `open` | Mở hộp thoại | 0,25 s | `soft rising holographic panel open whoosh, airy, subtle low body, sci-fi menu` |
| `close` | Đóng hộp thoại | 0,2 s | `soft falling holographic panel close whoosh, airy, short tail` |
| `error` | Không nhận được, thiếu tiền | 0,25 s | `two short low muted buzzer pulses, sci-fi console denial, not harsh` |
| `reward-small` | Màn mở quà nhỏ | 0,8 s | `small supply crate unlocking: mechanical latch clack, soft energy whoosh, a few light crystal clinks` |
| `reward-big` | Rương lớn, quà mốc | 1,6 s | `big treasure vault opening: heavy latch release, deep energy swell, bright burst of light, cascade of gems and coins clinking, cinematic` |
| `streak` | Đạt mục tiêu ngày, chuỗi tăng | 1,0 s | `fire ignition whoosh building into a warm roar, energetic, short tail, no voice` |

**Ghi chú code:** `src/audio/Sfx.ts` (`uiHover`, `uiTab`, `uiOpen`, `uiClose`, `uiError`, `rewardReveal`, `streakIgnite`), nạp file qua `import.meta.glob("../assets/audio/ui/*.ogg")`.
