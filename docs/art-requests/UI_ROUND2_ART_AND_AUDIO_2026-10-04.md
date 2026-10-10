# Yêu cầu ảnh và âm thanh: làm đẹp giao diện đợt 2 (04/10/2026)

> **Trạng thái (04/10/2026): đã xong.**
> - **Phần A:** 12 biểu tượng vật phẩm ở `src/assets/icons/items/`, 256×256, nền tối. Hàng phím tắt và Shop đã dùng. Ở hàng phím tắt, ảnh được hòa vào ô bằng `mix-blend-mode: screen` cộng mặt nạ tròn để không lộ mép vuông.
> - **Phần B:** `public/assets/audio/stingers/victory.ogg` đã thay: 5,25 giây, −15,4 LUFS, đỉnh −2,3 dBFS; qua bước kiểm tra âm thanh khi build.

> **Dành cho:** chủ dự án và AI tạo ảnh, tạo nhạc được giao làm.
>
> **Bối cảnh:** `docs/UI_POLISH_ROUND2_2026-10-04.md`.
>
> Code đã sẵn tên file và đường dẫn. Đặt đúng chỗ, đúng tên là lần build sau game tự nhận. Món nào chưa có thì game vẫn chạy như hiện tại (ký hiệu chữ, âm cũ).

## A. Biểu tượng vật phẩm tiêu hao (12 ảnh)

Các vật phẩm này đang hiện bằng ký hiệu chữ (✚ ⬡ ⚡ ✹…) ở hàng phím tắt 1–9 trong trận và ở Shop. Trang bị và kỹ năng thì đã có ảnh vẽ.

### A.1 Cách làm
1. Tạo ảnh vuông **1024×1024** theo lời nhắc. Mỗi lời nhắc = **phần chung** (A.2) + **phần riêng** (A.3).
2. Lưu ảnh gốc vào `games/space-typing/art-src/icons/items/<tên>.png` (chỉ để lưu trữ).
3. Chuyển sang **WebP 256×256** và đặt ở **`games/space-typing/src/assets/icons/items/<tên>.webp`**. Chạy trong `games/space-typing`:

   ```bash
   mkdir -p src/assets/icons/items
   node -e "require('sharp')(process.argv[1]).resize(256,256).webp({quality:88}).toFile(process.argv[2]).then(()=>console.log('ok'))" \
     art-src/icons/items/repair-kit.png src/assets/icons/items/repair-kit.webp
   ```

4. `pnpm build:space` (ở thư mục gốc `typing-game`), rồi tải lại trang.

**Ghi chú:**
- Nền tối vẽ sẵn trong ảnh (giống bộ biểu tượng trang bị), **không cần nền trong suốt**.
- Không có chữ, số hay khung.
- Code đọc ảnh ở `src/ui/painted-icons.ts` (`paintedItemIcon`).

### A.2 Phần chung (dán trước mọi lời nhắc)

```
Square game UI icon, 1:1, painterly sci-fi game art in the style of a premium space shooter,
one single consumable item centred and filling about 70% of the frame, bold clean silhouette
readable at 32 px, dramatic rim light, glowing energy accents in the colour given below,
deep navy-black background (#0a0f1e) with a soft radial glow behind the item,
no text, no letters, no numbers, no frame, no border, no watermark, no UI elements.
```

### A.3 Danh sách

Làm thử 2 ảnh đầu (`repair-kit`, `nova-bomb`) để chủ dự án duyệt phong cách, rồi mới làm phần còn lại.

| Tên file | Vật phẩm | Phần riêng của lời nhắc |
|---|---|---|
| `repair-kit` | Repair Kit | `a compact armoured field repair kit case with a glowing green cross panel and nanite sparks, accent colour emerald green #5dffaa` |
| `nova-bomb` | Nova Bomb | `a spherical nova bomb core with a white-hot star inside a cage of curved plates, light bursting through the seams, accent colour hot gold #ffd166` |
| `shield-cell` | Shield Cell | `a hexagonal shield battery cell with a glowing blue hex-grid core, accent colour shield blue #5fb0ff` |
| `energy-cell` | Energy Cell | `a slim cylindrical energy cell with a crackling violet lightning core in a glass tube, accent colour violet #b48bff` |
| `emp-charge` | EMP Charge | `a disc-shaped EMP grenade with electric arcs jumping between three prongs, accent colour electric cyan #7fe8ff` |
| `time-crystal` | Time Crystal | `a floating hourglass-shaped crystal with slow-motion light rings around it, accent colour pale teal #9ff4e8` |
| `word-bomb` | Word Bomb | `a round bomb whose fuse spark is a glowing letter glyph, rune letters etched on the shell, accent colour magenta #ff6fd8` |
| `supply-beacon` | Supply Beacon | `a small orbital supply beacon with a pulsing gold light on an antenna mast, accent colour amber #ffb347` |
| `lucky-dice` | Lucky Dice | `a pair of glowing crystal dice tumbling, star-shaped pips shining, accent colour gold and violet` |
| `salvage-anchor` | Salvage Anchor | `a heavy magnetic salvage anchor with a tractor-beam glow at its tip, accent colour steel blue #8fb8ff` |
| `stage-revival-core` | Stage Revival Core | `a pulsing heart-shaped reactor core in a protective cage, rebirth light rising from it, accent colour rose gold #ff9d7d` |
| `phoenix-core` | Phoenix Core | `a fiery phoenix-feather reactor core with flame wings wrapping around it, accent colour phoenix orange #ff7a3c` |

## B. Nhạc chúc mừng qua màn

Màn hoàn thành mới đã có tia sáng quay, mưa giấy màu, sao bật lên và điểm số đếm lên. Âm hiện tại là một đoạn ngắn có sẵn (`/assets/audio/stingers/victory.ogg`) cộng hợp âm tổng hợp. Nên có một đoạn nhạc chúc mừng đúng chất game.

| File | Thời lượng | Mô tả |
|---|---|---|
| `games/space-typing/public/assets/audio/stingers/victory.ogg` (thay file cũ, giữ nguyên tên) | 4–6 giây | Fanfare khoa học viễn tưởng hào hùng: kèn đồng và dàn dây, trống trận ngắn ở đầu, kết bằng một hợp âm trưởng sáng ngân dài. Không có lời. Âm lượng chuẩn −16 LUFS, đỉnh không quá −1 dBTP. |

**Lời nhắc cho AI tạo nhạc** (Suno, Udio, Stable Audio…):

```
Short triumphant sci-fi victory fanfare, 5 seconds, cinematic orchestra: bold brass, soaring
strings, a quick war-drum roll at the start, ends on a bright sustained major chord with a
shimmering synth pad tail. Epic space-shooter level complete jingle. No vocals, no lyrics.
```

**Ghi chú:**
- Định dạng OGG Vorbis 44,1 kHz stereo.
- Game tự đổi tốc độ phát nhẹ theo mức thành tích (`Sfx.stageClear`), nên không cần làm nhiều phiên bản.
- Sau khi thay file, chạy `pnpm build:space`. Bước kiểm tra âm thanh (`scripts/check-audio-assets.mjs`) chạy cùng lúc build.

## C. Không cần tạo mới

| Chỗ dùng | Ảnh đã có, dùng lại |
|---|---|
| Quái bonus (hộp tiếp tế, hòm lựa chọn, hòm Anomaly) | ảnh hòm và tàu chở hàng trong bộ Credit puzzle; đã xử lý vào `src/assets/puzzle/` bằng `pnpm puzzle:prepare` |
| Bản đồ chiến dịch | ảnh nền Galaxy và vật thể của từng thế giới (`public/assets/space-typing/backgrounds/<kit>/hero-wNN.512.webp`) |
| Ô trùm trên bản đồ | ảnh trùm |
| Hangar | ảnh tàu 3D (`public/assets/space-typing/ships/3d/<tàu>/color.webp`) |
