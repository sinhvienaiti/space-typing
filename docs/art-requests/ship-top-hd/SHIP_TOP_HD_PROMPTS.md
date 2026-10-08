# Yêu cầu ảnh: bức vẽ nhìn từ trên, nét cao, cho 10 tàu (để dựng 3D như Vanguard)

Ngày: 2026-10-03. Người viết: Claude. Người làm: ChatGPT Images hoặc Gemini.

## Mục đích

Trong Duel, tàu của mình được dựng 3D từ **một bức vẽ nhìn thẳng từ trên xuống**: phương án B mà chủ dự án đã chọn cho Vanguard. Ảnh tàu hiện có (tấm gom chung `player-ships-v3.webp`) chỉ khoảng 240 px mỗi tàu, dựng 3D lên sẽ mờ. Vì vậy mỗi tàu cần **1 bức vẽ nét cao** giống ảnh `art-src/ships/vanguard-top-hd.png` của Vanguard.

Có ảnh rồi thì không cần sửa code. Claude chạy một lệnh: game tự tìm lửa động cơ, mũi, đầu cánh, nòng súng và màu riêng của tàu, rồi gửi ảnh demo để chủ dự án duyệt trước khi bật.

## Lưu ảnh ở đâu

Thư mục `games/space-typing/art-src/ships/`. Thư mục này không đưa lên Git; tự sao lưu.

| Tàu | Ảnh mẫu (đính kèm khi gửi prompt) | Lưu thành |
|---|---|---|
| Aegis | `aegis-reference.png` | `aegis-top-hd.png` |
| Volt | `volt-reference.png` | `volt-top-hd.png` |
| Wraith | `wraith-reference.png` | `wraith-top-hd.png` |
| Fortune | `fortune-reference.png` | `fortune-top-hd.png` |
| Arsenal | `arsenal-reference.png` | `arsenal-top-hd.png` |
| Oracle | `oracle-reference.png` | `oracle-top-hd.png` |
| Bastion | `bastion-reference.png` | `bastion-top-hd.png` |
| Reaper | `reaper-reference.png` | `reaper-top-hd.png` |
| Celestial | `celestial-reference.png` | `celestial-top-hd.png` |
| Zenith | `zenith-reference.png` | `zenith-top-hd.png` |

Ảnh mẫu nằm cùng thư mục với tệp này (`docs/art-requests/ship-top-hd/`). Nhận `.png`, `.webp` hoặc `.jpg`.

**Thứ tự nên làm:** làm 1–2 tàu trước, ví dụ Aegis và Reaper (Reaper cũng là tàu địch mặc định). Gửi Claude kiểm tra rồi mới làm các tàu còn lại.

## Yêu cầu chung cho mọi ảnh

- **Nhìn thẳng từ trên xuống**, mũi tàu hướng thẳng lên trên, hai bên đối xứng, tàu nằm giữa khung.
- **Đúng thiết kế ảnh mẫu**: cùng hình dáng, bộ phận, màu và tỉ lệ. Chỉ vẽ lại cho nét và chi tiết hơn.
- **Giữ lửa động cơ ngắn và sáng**, ngay dưới mỗi miệng phụt, chĩa thẳng xuống. Game dựa vào lửa này để tìm vị trí động cơ, rồi tự cắt đi và thay bằng lửa thật.
- **Nền trong suốt** (PNG có alpha). Nếu không làm được thì dùng nền một màu hồng tím phẳng `#FF00FF`.
- Khung vuông, **từ 1254×1254 trở lên**. Tàu chiếm khoảng 85% bề ngang, còn chừa lề ở cả 4 phía.
- **Không** bóng đổ, mặt đất, sao, tinh vân, chữ hay khung viền. Chỉ 1 tàu, 1 góc nhìn.

## Prompt (dán vào ChatGPT, kèm ảnh mẫu của tàu đó)

Chép đoạn chung dưới đây và thay `[MÔ TẢ TÀU]` bằng dòng mô tả của tàu ở bảng tiếp theo.

```text
Use the attached spaceship as the exact design reference: same silhouette, parts, colours and proportions. Repaint THIS SAME ship as a high-resolution game asset seen from directly above (top-down), nose pointing straight up, perfectly symmetrical left and right, centred in the frame. [MÔ TẢ TÀU] Keep short, bright engine flames directly below each engine nozzle, pointing straight down. Polished high-end sci-fi game art, crisp clean edges, rich detail in the armour panels and glowing parts, soft light from the upper left. One single ship only, one view only: no turnaround, no extra angles, no copies, no side view. Fully transparent background (PNG with alpha). No shadow, no ground, no stars, no nebula, no text, no frame. Square canvas 1254x1254 or larger; the ship fills about 85% of the width with empty margins on every side.
```

| Tàu | `[MÔ TẢ TÀU]` |
|---|---|
| Aegis | `A heavy armoured gunship: white armour plates over dark gunmetal, a large emerald-green crystal canopy in the middle, a twin-barrel turret on top of each side pod, teal-green glowing trims, three green engine flames.` |
| Volt | `A fast interceptor: royal blue and white armour with gold edges, a golden-yellow diamond crystal in the centre, two slim side pods crackling with blue lightning arcs, two blue engine flames.` |
| Wraith | `A stealth ship: dark gunmetal and black plating with violet glowing seams, a purple crystal in the middle, long swept blade wings, violet engine flames.` |
| Fortune | `A luxury gold ship: polished gold and white armour, a golden diamond gem in the centre, a thin golden halo ring behind the nose, small floating gold diamond crystals beside it, round gold engine pods with golden flames.` |
| Arsenal | `A missile frigate: crimson red and black armour with orange glow, a red crystal canopy, many forward blade fins and four missile launcher pods, orange-red engine flames.` |
| Oracle | `A mystic ship: white and pale lilac armour with gold trim, a magenta gem canopy, a glowing pink halo with a cross-shaped spire at the nose, pink crystal wing blades, pink engine flames.` |
| Bastion | `A fortress ship: heavy dark-grey armour, emerald-green glowing crescent wing blades, a large round green reactor core in the centre, three green engine flames.` |
| Reaper | `A predator ship: black and crimson armour with scythe-shaped curved wings, a hot-pink crystal canopy, round target-ring emblems on the wings, pink engine flames.` |
| Celestial | `A royal deep-blue and gold ship: a golden four-point star emblem inside a ring in the centre, a golden halo arc above it, small gold star sparkles, sapphire blade wings, a violet-blue engine flame.` |
| Zenith | `An elite ship: white and silver armour with violet and cyan blade wings, a cyan crystal canopy, a thin glowing halo ring at the nose, many slim fins, cyan engine flames.` |

**Muốn các tàu cùng độ nét và phong cách với Vanguard** (nên làm): đính kèm thêm `art-src/ships/vanguard-top-hd.png` làm ảnh thứ hai, và thêm câu sau vào cuối prompt:

```text
Match the rendering quality, line work and lighting of the second image, but keep the design of the first image.
```

## Câu nhắn sửa nhanh (gửi tiếp trong cùng cuộc trò chuyện nếu ảnh sai)

- **Ra nhiều góc hoặc nhiều tàu:** `Only one ship, seen from directly above, nose up. Remove all other views and copies.`
- **Bị nghiêng hoặc nhìn chéo:** `Straight top-down view, perfectly symmetrical, no perspective, no tilt.`
- **Mất lửa động cơ:** `Add short bright engine flames directly below each engine nozzle, pointing straight down.`
- **Nền không trong suốt:** `Make the background fully transparent (PNG alpha). If impossible, use a flat #FF00FF background.`
- **Sai thiết kế:** `Keep the exact design of the attached reference: same parts, colours and proportions; only add detail and sharpness.`
- **Tàu chạm mép khung:** `Center the ship and leave empty margins on all sides.`

## Sau khi có ảnh (phần Claude làm)

1. Chạy `pnpm ship3d:prepare <id>` (ví dụ `pnpm ship3d:prepare aegis reaper`). Lệnh này ra `public/assets/space-typing/ships/3d/<id>/`:
   - cắt lửa vẽ sẵn;
   - tìm vị trí động cơ, mũi, buồng lái, đầu cánh và nòng súng (nòng súng lấy theo dữ liệu bắn sẵn có của tàu);
   - lấy màu lửa và màu đèn.
2. Xem ảnh đánh dấu `.visual/ship3d-overlay.jpg`: vòng vàng là động cơ, đỏ là nòng súng, xanh lá là đầu cánh, trắng là mũi, tím là buồng lái. Sai chỗ nào thì chỉnh tay trong bảng `ANCHORS` của `scripts/bg-art/prepare-ship-3d.mjs` (kể cả `nozzles`).
3. Gửi chủ dự án ảnh demo trong trận (cùng góc, cùng thời điểm) để duyệt. Duyệt xong mới build và commit.

Đã chạy thử bằng ảnh nhỏ hiện có (`pnpm ship3d:prepare --sheet-test`, kết quả trong `.visual/ship3d-sheet-test/overlay.jpg`):
- mũi, đầu cánh, buồng lái và màu lửa của cả 11 tàu dò đúng;
- vị trí động cơ đúng ở đa số tàu; Arsenal và Reaper còn lệch, sẽ chỉnh tay khi có ảnh nét cao.
