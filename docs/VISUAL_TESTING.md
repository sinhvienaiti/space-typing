# Kiểm tra hình ảnh tự động (cho Codex và Claude)

> **Dành cho:** AI lập trình (Codex, Claude Code, …) chạy trong Cursor/VS Code trên máy của chủ dự án, và chủ dự án.
>
> **Mục đích:** AI tự chụp màn hình game rồi tự xem ảnh, để kiểm tra hình nền, đạn, hiệu ứng **trước khi** báo chủ dự án. Test tự động đạt không có nghĩa là đẹp: chủ dự án duyệt bằng mắt, nên AI cũng phải nhìn thấy những gì chủ dự án sẽ thấy.

## 1. Cách hoạt động

```
pnpm visual:shot <url> <file.png>
   │
   ├─ mở Google Chrome ở chế độ ngầm (headless), hồ sơ tạm, dùng GPU thật
   ├─ điều khiển Chrome qua Chrome DevTools Protocol (CDP):
   │    đặt khung nhìn 1642×799, DPR 2 → mở trang → (bấm nút) → chờ
   │    → chạy một đoạn JS lấy số liệu → chụp màn hình
   ├─ lưu PNG (3284×1598 điểm ảnh) và in 1 dòng JSON: số liệu, cảnh báo console, lỗi trang
   └─ tắt Chrome, xoá hồ sơ tạm
AI mở file PNG bằng công cụ xem ảnh của mình để nhìn.
```

**Xem ảnh:**
- **Claude Code:** dùng công cụ đọc file (`Read`) với đường dẫn PNG hoặc JPG.
- **Codex:** dùng công cụ xem ảnh cục bộ của Codex nếu phiên bản của bạn có (ví dụ `view_image`).
- Nếu AI không tự mở được ảnh: nhờ chủ dự án kéo file PNG vào khung chat.

## 2. Yêu cầu

- Google Chrome ở `/Applications/Google Chrome.app` trên macOS. Chrome ở chỗ khác thì đặt biến `CHROME_PATH`.
- Node 22 trở lên (cần WebSocket có sẵn). Máy chủ dự án đang dùng Node 24.
- Đã chạy `pnpm install` trong `games/space-typing` (lệnh phóng to cần `sharp`).
- Một địa chỉ để mở:
  - **máy chủ dev** tạm: nhanh, thấy ngay code vừa sửa;
  - hoặc **chế độ Play** qua nginx (`https://space.typing-game.local/`): bản build tĩnh, giống hệt chủ dự án chơi. Sau khi sửa phải chạy `pnpm build:space` trước.
- **Codex trong Cursor:** lệnh mở Chrome và cổng mạng nội bộ có thể bị chế độ an toàn (sandbox) chặn. Khi đó cần cho phép lệnh chạy, hoặc dùng chế độ toàn quyền. Không có quyền thì nhờ chủ dự án chạy lệnh.

## 3. Quy trình chuẩn

```bash
cd /Users/jokerit/htdocs/typing-game/games/space-typing

# 1) Bật máy chủ dev tạm ở cổng riêng (không đụng cổng 3004 của chủ dự án)
mkdir -p .visual
(pnpm exec vite --host 127.0.0.1 --port 3098 --strictPort > .visual/vite.log 2>&1 &)
curl -s --retry 20 --retry-connrefused --retry-delay 1 -o /dev/null http://127.0.0.1:3098/

# 2) Chụp
pnpm -s visual:shot "http://127.0.0.1:3098/bg-gallery.html?grid=1&q=high&panel=0" .visual/worlds.png \
  --wait=4000 --eval-file=scripts/visual/evals/bg-state.js

# 3) Mở .visual/worlds.png để xem. Cần soi chi tiết thì phóng to một vùng:
pnpm -s visual:crop .visual/worlds.png .visual/zoom.jpg --rect=1300,900,900,700 --width=800

# 4) Tắt máy chủ tạm theo SỐ CỔNG (không tắt theo tên tiến trình, dễ sót)
lsof -ti tcp:3098 | xargs kill
```

- Ảnh chụp tạm để trong **`.visual/`**; thư mục này đã bị Git bỏ qua.
- Chỉ ảnh dùng làm minh hoạ cho tài liệu bàn giao mới đưa vào `docs/`, nén JPEG khoảng 150 KB.

### Tham số của `visual:shot`

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `--width` / `--height` / `--dpr` | 1642 / 799 / 2 | **Khu vực chơi thật của chủ dự án trong Portal** (tỉ lệ khoảng 2,2:1, màn Retina). Luôn chụp ở cỡ này khi duyệt. |
| `--wait` | 6000 | Số mili giây chờ trước khi chụp (sau khi trang tải xong và sau khi bấm nút). |
| `--click` | — | Bộ chọn CSS để bấm, ví dụ `#startButton` để vào trận. |
| `--click-delay` | 4000 | Chờ bao lâu rồi mới bấm (để game nạp xong). |
| `--eval` / `--eval-file` | — | Đoạn JS chạy ngay trước khi chụp; kết quả in trong JSON. Có thể trả về Promise. |

`CHROME_PATH=<đường dẫn>` để dùng Chrome ở chỗ khác.

## 4. Các công thức chụp hay dùng

| Muốn xem | Lệnh (sau `pnpm -s visual:shot`) |
|---|---|
| 5 World hình nền Galaxy 01 | `"http://127.0.0.1:3098/bg-gallery.html?grid=1&q=high&panel=0" .visual/worlds.png --wait=4000 --eval-file=scripts/visual/evals/bg-state.js` |
| Một World, có chữ mẫu để kiểm tra độ dễ đọc | `"http://127.0.0.1:3098/bg-gallery.html?world=world-03&q=high&labels=1&panel=0" .visual/w03.png` |
| Trong trận thật (sau 20 giây là có tàu hoặc cá voi bay ngang) | `"http://127.0.0.1:3098/" .visual/game.png --click=#startButton --wait=20000 --eval-file=scripts/visual/evals/game-assets.js` |
| Như trên nhưng đúng bản chủ dự án chơi (chế độ Play) | `"https://space.typing-game.local/" .visual/game-play.png --click=#startButton --wait=20000 --eval-file=scripts/visual/evals/game-assets.js` |
| Nền cũ để so sánh | thêm `?bg=legacy` vào địa chỉ game |
| Đạn Vanguard ở tốc độ thật | `"http://127.0.0.1:3098/shot-gallery.html?panel=0&cps=10" .visual/shots.png --wait=6000 --eval-file=scripts/visual/evals/shot-state.js` |
| Đạn quay chậm, để soi hình dạng | `"http://127.0.0.1:3098/shot-gallery.html?panel=0&t=0.1" .visual/shots-slow.png --wait=8000` |
| Đạn vẽ bằng code (không ảnh vẽ tay) | thêm `&art=0` |
| Chọn bậc chất lượng | `q=low|medium|high|ultra` ở gallery; trong game thì đổi ở Settings |

**Portal** (`https://typing-game.local/space-typing`) nhúng game trong iframe khác nguồn gốc (origin), nên công cụ không bấm được vào bên trong. Muốn chụp trong trận, mở thẳng `https://space.typing-game.local/`: cùng game, cùng dữ liệu lưu.

## 5. Các đoạn đo có sẵn (`scripts/visual/evals/`)

| File | Dùng ở | Trả về |
|---|---|---|
| `bg-state.js` | `bg-gallery.html` | Số liệu từng World: `active`, bậc, DPR, MB texture, số sprite, thời gian CPU p95 |
| `shot-state.js` | `shot-gallery.html` | Số đạn đang bay, ảnh đạn đã nạp, trạng thái các mục tiêu |
| `game-assets.js` | trang game | Nền mới có bật không (`blit (BGV on)`), những file hình nền và ảnh đạn đã tải |
| `bg-gpu-stress.js` | `bg-gallery.html?world=…` (một World, không lưới) | Tên GPU; số khung/giây khi vẽ nền 1, 3, 6, 10 lần mỗi khung. Dùng để ước độ dư sức |
| `sfx-levels.js` | bất kỳ trang nào của máy chủ dev (ví dụ `shot-gallery.html?idle=1`) | **Âm thanh, không phải hình:** dựng từng tiếng động của `Sfx` ngoài thời gian thực, trả về đỉnh (dBFS), độ to 100 ms, độ dài, độ lệch trái/phải. AI không nghe được, nên dùng số này để so với một tiếng chủ dự án đã nghe rõ |

Trang dev để lộ sẵn các "tay cầm" để gỡ lỗi:
- `window.__bgGalleryCells[i].stage`: `.diagnostics()`, `.triggerPass()`, `.triggerMeteorShower()`, `.director` (trường private vẫn đọc được lúc chạy).
- `window.__shotGallery`: `{ shots, targets }`.

Ví dụ đặt xác tàu mẹ vào giữa đường bay rồi chụp:

```bash
pnpm -s visual:shot "http://127.0.0.1:3098/bg-gallery.html?world=world-01&q=high&panel=0" .visual/derelict.png --wait=5000 \
  --eval="new Promise(r => { const d = window.__bgGalleryCells[0].stage.director; const p = d.passes.find(q => q.spec.id === 'derelict'); d.startPass(p); p.start = d.clock - p.duration * 0.5; setTimeout(() => r('ok'), 600); })"
```

## 6. Soi ảnh thế nào cho đúng

1. **Nhìn tổng thể trước** ở cỡ chụp chuẩn: bố cục, độ đông, chữ có đọc được không.
2. **Phóng to** (`visual:crop`) những chỗ dễ lỗi:
   - viền vật thể: có lem xanh hoặc tím của nền cũ không, có viền đen không;
   - đuôi đạn: có cạnh cứng như lưỡi dao không;
   - vật thể có bị trong suốt không (chủ dự án muốn vật thể đặc);
   - ảnh cộng sáng: có khung chữ nhật mờ quanh ảnh không.

   Toạ độ `--rect` tính theo điểm ảnh của PNG, tức CSS px × 2.
3. **Quay chậm** (`t=0.1`) để thấy hình dạng; **tốc độ thật** để thấy cảm giác.
4. **So sánh trước và sau**: chụp cùng địa chỉ, cùng kích thước, cùng thời gian chờ.
5. Đọc dòng JSON: `exceptions` phải rỗng; cảnh báo trong `logs` phải hiểu được. Cảnh báo "Shared vocabulary unavailable" khi chạy dev không có Portal là bình thường.

## 7. Đo hiệu năng GPU

- `bg-gpu-stress.js` vẽ nền nhiều lần mỗi khung. Hãy **chạy 2–3 lần** và chỉ so sánh các số **đo trong cùng một đợt**, vì máy nóng lên sau nhiều lần build hoặc đo làm số tụt rõ.
- Ở High (2053×950, máy đã nóng), số đo từng thấy: Radeon Pro 560X vẽ 3 lần được khoảng 55 khung/giây, Intel UHD 630 khoảng 44.
- Không dùng `EXT_disjoint_timer_query` qua ANGLE/Metal: số ra không tin được (có lần Ultra lại "nhanh hơn" High).
- Mọi thay đổi làm nặng GPU (độ phân giải, lượt vẽ toàn màn hình, số vật thể) phải đo trước và sau, vì chủ dự án yêu cầu **không giảm hiệu năng**.

## 8. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `Chrome not found` | Đặt `CHROME_PATH`. |
| Chụp ra nền đen hoặc nền cũ | Chờ lâu hơn (`--wait`), vì ảnh nền nạp mỗi khung một texture. Kiểm tra `game-assets.js`. WebGL2 cần GPU, nên đừng tắt `--ignore-gpu-blocklist`. |
| `click target not found` | Trang chưa tải xong: tăng `--click-delay`. Hoặc sai bộ chọn CSS. |
| Ảnh ở chế độ Play vẫn là bản cũ | Chưa chạy `pnpm build:space`. `./play.sh` không build lại khi chỉ `public/` đổi. |
| `Cannot find package 'sharp'` khi tự viết script | Chạy `node` **từ thư mục `games/space-typing`**, hoặc dùng `pnpm visual:crop`. |
| zsh báo `no matches found` | Đặt địa chỉ và mẫu `*` trong dấu nháy. |
| Máy chủ dev tạm còn chạy | `lsof -ti tcp:3098 \| xargs kill`. |

## 9. Checklist cho mỗi thay đổi về hình ảnh

- [ ] Chụp ở 1642×799 DPR 2: gallery (tổng thể) và trong trận (`--click=#startButton --wait=20000`).
- [ ] Phóng to 2–3 vùng dễ lỗi (mục 6).
- [ ] `exceptions` rỗng.
- [ ] Nếu đụng tới GPU: đo `bg-gpu-stress.js` trước và sau.
- [ ] Chủ dự án chơi bằng Play mode: đã `pnpm build:space` và chụp lại `https://space.typing-game.local/`.
- [ ] Gửi chủ dự án (tiếng Việt): đã sửa gì, ảnh chụp ở đâu, chỉ cần tải lại trang (Cmd+R).
