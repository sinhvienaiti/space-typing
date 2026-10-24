# 2026-10-24 — Dọn sau khi nhận từ Mac (Dell): khoá media, chặn media runtime khỏi Git, trang `td.html` báo Lời Gọi đã chuyển

Commit: `9445341b` (`media.md5`), `27a987b1` (`.gitignore`), `fe048d6a` (`td.html`). File này và mục 9 của `docs/CLAUDE_PROCESS_2026-10-17.md`: commit kế tiếp. Nhánh `feat/space-typing-2026-10-18`.

## Yêu cầu

- Máy Dell (Windows 11, WSL Ubuntu 24.04) làm tiếp từ bản chép của Mac (24/10). Space chỉ dọn, không làm tính năng lõi mới (file process chung của repo cha, mục 6, bước A.4).
- Commit `media.md5` mà `media:push` trên Mac đã viết.
- Review mục 74: một lần `git add -A` lỡ tay sẽ đưa 409 file media runtime chưa track lên repo công khai.
- `docs/games/SPLIT_PLAN.md` mục 7 (repo cha): `td.html` trong Space hiện dòng "Lời Gọi đã chuyển sang trang mới" kèm liên kết, tới bước dọn S8.
- `docs/CLAUDE_PROCESS_2026-10-17.md` còn ghi "detached HEAD, mọi thay đổi chưa commit"; nhật ký dừng ở sáng 21/10.

## Đã làm

- **`media.md5`:** commit riêng, chỉ thêm 70 dòng `art-src/td/**` (ảnh 2D gốc của TD, Mac đẩy lên Drive lúc 09:08), không bớt dòng nào.
- **`.gitignore`:**
  - `public/assets/space-typing/models/**` và `public/assets/space-typing/ships/3d/**`: bỏ qua mọi file, trừ thư mục và `*.json` (`manifest.json`, `model.json`). Cùng kiểu với khối `public/assets/td/**` có sẵn.
  - `docs/art-requests/defense-maps/*`: bỏ qua ảnh, trừ `*.md`. Thư mục này chỉ có 16 ảnh (8 PNG khung bố cục, 8 JPG ảnh chụp), đều có trong `media.md5`. Prompt nằm ở `docs/art-requests/DEFENSE_MAPS_PROMPTS_2026-10-21.md`, đã track từ trước, nên không có file văn bản nào cần commit thêm.
  - `tmp/`: bằng chứng chạy cổng, như ba game kia. Bỏ khối "Local archives" bị chép trùng.
  - Luật bỏ qua không gỡ file đã track: 18 GLB trong `models/` và 33 file `webp`/`bin` trong `ships/3d/` vẫn được Git theo dõi.
  - `pnpm media:push` không đổi: `scripts/media/lib/sets.mjs` của repo cha lấy file trên đĩa trừ `git ls-files`, không đọc `.gitignore`.
- **`td.html`:** khung giấy viền mực ở giữa mép trên, cùng kiểu với bảng HUD của TD. Dòng "Lời Gọi đã chuyển sang trang mới", liên kết `https://td.typing-game.local/` (bản Play) và `http://127.0.0.1:3006/` (dev). Bấm dòng tiêu đề để thu gọn. Không dùng script. Khung nằm dưới lớp thẻ chữ, nên thẻ chữ không bị che. Bàn phím và mọi cú bấm ngoài khung vẫn vào game như cũ. Mã `src/td` không đổi.
- **`docs/CLAUDE_PROCESS_2026-10-17.md`:** sửa dòng nhánh ở mục 1; ghi chú mục 1 chỉ đúng cho máy Windows 16–17/10; thêm nhật ký 21/10–24/10 (đợt sửa 1, TD 1A–1A.6 gộp ở `36249a35`, nhãn `td-1a6-final`, tách ba game 23–24/10). File sống từ nay là `docs/CLAUDE_PROCESS_2026-10-24.md` của repo cha.

## Mục review đã xử lý

| Mục | Nội dung | Kết quả |
|---|---|---|
| 74 | Asset tách đôi: media chưa ignore, manifest liệt kê GLB không có trong Git, dist không tái lập | Sửa một phần: media runtime không còn hiện trong `git status`, `git add -A` không đưa lên được. Phần còn lại ở mục "Còn lại". |

## Kiểm tra

Đo trên Dell (WSL, 7 GB RAM, vitest 4 luồng; Chrome for Testing headless, không dùng GPU RTX 3050 Ti), không phải Mac M4.

- `git status` sau khi đổi `.gitignore`: 0 file chưa track (trước đó 409). `git check-ignore`: 409/409 file media runtime trong `media.md5` bị bỏ qua. Số file track giữ nguyên 2.707. `manifest.json`, `model.json`, `*.md` mới không bị bỏ qua. `git diff --check` sạch.
- `pnpm check`: 407 file / 2.694 test đạt (gồm `td-boundary` 16, `mode-isolation` 14); `pnpm build` đạt (tsc hai cấu hình, `vite build`, các bước kiểm ảnh). 1.163 s.
- Trình duyệt, `scripts/dev/vite.worktree.config.ts` ở cổng 3004 (phục vụ `/vocabulary/`):
  - kịch bản tạm `tmp/dell-2026-10-24/td-moved-notice.mjs` ở 1280 × 720 và 1920 × 1080: đạt 13/13 (chữ và hai liên kết đúng, không đè bảng HUD, bấm trúng khung, thẻ chữ nằm trên, thu gọn được, game vẫn chạy, phông Be Vietnam Pro, không cuộn trang, không lỗi console);
  - `td-1a-boot` 11/11 ở hai cỡ; `td-1a6-keyboard` 21/21 và `td-1a6-day` 18/18 ở 1280 × 720, kể cả phát lại trên Node ra cùng mã băm.
  - Ảnh: `tmp/dell-2026-10-24/shots/` (Git bỏ qua).
- `pnpm build` ghi lại `dist/` bằng bản mặc định. `dist/` cũ cũng là bản mặc định (không có `local-assets`).

## Còn lại

- **Mục 74:** bản clone mới vẫn thiếu 393 file model và hull (360 GLB), phải chạy `pnpm media:pull --only runtime`. Chưa sinh manifest từ file thật, chưa có `check-model-manifest`, chưa dựng gói deploy trong CI.
- Dòng báo trong `td.html` mất cùng `td.html` ở bước dọn S8 (`SPLIT_PLAN.md` mục 12): sau 2 tuần ổn định, hoặc khi chủ dự án đồng ý.
- Liên kết `td.typing-game.local` chỉ mở được khi máy đã dựng host mới (file process chung, mục 7.3).
