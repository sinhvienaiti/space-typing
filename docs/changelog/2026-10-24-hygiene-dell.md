# 2026-10-24 — Dọn sau khi nhận từ Mac (Dell): khoá media, chặn media runtime khỏi Git, trang `td.html` báo Lời Gọi đã chuyển

Commit: `9445341b` (`media.md5`), `27a987b1` (`.gitignore`), `fe048d6a` (`td.html`), `63f63cf6` (file này và mục 9 của `docs/CLAUDE_PROCESS_2026-10-17.md`). Sửa sau review (mục cuối file): commit kế tiếp. Nhánh `feat/space-typing-2026-10-18`.

## Yêu cầu

- Máy Dell (Windows 11, WSL Ubuntu 24.04) làm tiếp từ bản chép của Mac (24/10). Space chỉ dọn, không làm tính năng lõi mới (file process chung của repo cha, mục 6, bước A.4).
- Commit `media.md5` mà `media:push` trên Mac đã viết.
- Review mục 74: một lần `git add -A` lỡ tay sẽ đưa 409 file media runtime chưa track lên repo công khai.
- `docs/games/SPLIT_PLAN.md` mục 7 (repo cha): `td.html` trong Space hiện dòng "Lời Gọi đã chuyển sang trang mới" kèm liên kết, tới bước dọn S8.
- `docs/CLAUDE_PROCESS_2026-10-17.md` còn ghi "detached HEAD, mọi thay đổi chưa commit"; nhật ký dừng ở sáng 21/10.

## Đã làm

- **`media.md5`:** commit riêng, chỉ thêm 70 dòng `art-src/td/**` (ảnh 2D gốc của TD, Mac đẩy lên Drive lúc 09:08), không bớt dòng nào.
- **`.gitignore`:**
  - `public/assets/space-typing/models/**` và `public/assets/space-typing/ships/3d/**`: bỏ qua mọi file, trừ thư mục, `*.json` (`manifest.json`, `model.json`) và file văn bản `*.md`, `*.txt` (README, CREDITS, LICENSE.txt đặt cạnh model). Cùng kiểu với khối `public/assets/td/**` có sẵn. Bản đầu (`27a987b1`) chỉ chừa `*.json`, nên README/LICENSE mới đặt cạnh model bị bỏ qua mà không báo. Commit sửa sau review ghi ở mục "Sửa sau review".
  - `docs/art-requests/defense-maps/*`: bỏ qua ảnh, trừ `*.md` và `*.txt`. Thư mục này chỉ có 16 ảnh (8 PNG khung bố cục, 8 JPG ảnh chụp), đều có trong `media.md5`. Prompt nằm ở `docs/art-requests/DEFENSE_MAPS_PROMPTS_2026-10-21.md`, đã track từ trước, nên không có file văn bản nào cần commit thêm.
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

- `git status` sau khi đổi `.gitignore`: 0 file chưa track (trước đó 409). `git check-ignore`: 409/409 file media runtime trong `media.md5` bị bỏ qua. Số file track giữ nguyên 2.707. `manifest.json`, `model.json` không bị bỏ qua. `git diff --check` sạch. Bản đầu file này ghi thêm "`*.md` mới không bị bỏ qua": chỉ đúng ở `defense-maps`, sai ở `models/` và `ships/3d/` (đã sửa, xem mục "Sửa sau review").
- `pnpm check`: 407 file / 2.694 test đạt (gồm `td-boundary` 16, `mode-isolation` 14); `pnpm build` đạt (tsc hai cấu hình, `vite build`, các bước kiểm ảnh). 1.163 s.
- Trình duyệt, `scripts/dev/vite.worktree.config.ts` ở cổng 3004 (phục vụ `/vocabulary/`):
  - kịch bản tạm `tmp/dell-2026-10-24/td-moved-notice.mjs` ở 1280 × 720 và 1920 × 1080: đạt 13/13 (chữ và hai liên kết đúng, không đè bảng HUD, bấm trúng khung, thẻ chữ nằm trên, thu gọn được, game vẫn chạy, phông Be Vietnam Pro, không cuộn trang, không lỗi console). Ô phông lúc đó chỉ đọc `font-family` tính ra, chưa chứng minh phông đã tải; kiểm lại bằng `document.fonts` ở mục "Sửa sau review";
  - `td-1a-boot` 11/11 ở hai cỡ; `td-1a6-keyboard` 21/21 và `td-1a6-day` 18/18 ở 1280 × 720, kể cả phát lại trên Node ra cùng mã băm.
  - Ảnh: `tmp/dell-2026-10-24/shots/` (Git bỏ qua).
- `pnpm build` ghi lại `dist/` bằng bản mặc định. `dist/` cũ cũng là bản mặc định (không có `local-assets`).

## Còn lại

- **Mục 74:** bản clone mới vẫn thiếu 393 file model và hull (360 GLB), phải chạy `pnpm media:pull --only runtime`. Chưa sinh manifest từ file thật, chưa có `check-model-manifest`, chưa dựng gói deploy trong CI.
- Dòng báo trong `td.html` mất cùng `td.html` ở bước dọn S8 (`SPLIT_PLAN.md` mục 12): sau 2 tuần ổn định, hoặc khi chủ dự án đồng ý.
- Liên kết `td.typing-game.local` chỉ mở được khi máy đã dựng host mới (file process chung, mục 7.3).
- File văn bản không có đuôi (`LICENSE`, `COPYING`) đặt cạnh model vẫn bị bỏ qua. Đặt tên `LICENSE.txt` hoặc `LICENSE.md`.

## Sửa sau review

Review nhỏ sau `63f63cf6`, 3 mục.

- **`.gitignore` chừa file văn bản cạnh model.** `models/**` và `ships/3d/**` chừa thêm `*.md`, `*.txt`. `defense-maps/*` chừa thêm `*.txt`. Media vẫn bị bỏ qua. Kiểm bằng file thử, tạo rồi xoá ngay (`git check-ignore -v --non-matching`, `git status --untracked-files=all`):
  - không bị bỏ qua: `README.md`, `CREDITS.md`, `LICENSE.txt` ở `models/`; `README.md`, `LICENSE.txt` trong một thư mục con mới của `models/`; `CREDITS.md`, `LICENSE.txt` ở `ships/3d/aegis/`; `README.md` trong một thư mục con mới của `ships/3d/`; `*.md`, `*.txt` ở `defense-maps/`;
  - bị bỏ qua: `.glb`, `.png`, `.fbx` ở `models/`; `.glb`, `.webp`, `.bin` ở `ships/3d/`; `.png`, `.jpg` ở `defense-maps/`; `LICENSE` không đuôi;
  - 409/409 file media chưa track trên đĩa vẫn bị bỏ qua (14 dòng còn lại trong danh sách là GLB đã track từ trước, `check-ignore` không xét file đã track). 0 file chưa track. Không còn file thử nào trên đĩa.
- **Dòng trỏ ở changelog repo cha.** Repo cha có `docs/changelog/2026-10-24.md` (file mới, hiện chỉ có phần Space Typing) và một dòng 24/10 ở bảng `docs/changelog/README.md`. Hai file này chưa commit, để người giữ repo cha commit cùng con trỏ submodule.
- **Kiểm phông bằng `document.fonts`.** Kịch bản tạm `tmp/dell-2026-10-24/td-moved-notice.mjs` có thêm hai ô, ô cũ đổi tên thành `fontFamilySet` (chỉ đọc `font-family`):
  - `fontFacesLoaded`: mọi ký tự của khung, ở độ đậm của đoạn chữ chứa nó (500 cho đoạn thường, 800 cho tiêu đề và liên kết), nằm trong `unicode-range` của một face "Be Vietnam Pro" đã tải, và `document.fonts.check` ra `true`. Kết quả: 9/9 face đã tải (500, 700, 800, mỗi độ đậm có vietnamese, latin-ext, latin), không thiếu ký tự nào.
  - `drawnWithFont`: phông Chrome thật sự dùng để vẽ, đọc qua DevTools (`CSS.getPlatformFontsForNode`). Tiêu đề và hai liên kết là "Be Vietnam Pro ExtraBold", đoạn chữ là "Be Vietnam Pro Medium". Cả hai là phông web, không rơi về phông hệ thống.
  - Chạy trên Dell, Windows Chrome 155, RTX 3050 Ti (ANGLE D3D11), Node 24.11 bản Windows, Vite `scripts/dev/vite.worktree.config.ts` ở cổng 3004: 15/15 ở 1280 × 720 và 1920 × 1080, không lỗi console. Đây là kiểm chức năng, không đo hiệu năng. Kết quả: `tmp/dell-2026-10-24/gpu/td-moved-notice-fonts-*.json` (Git bỏ qua).
- Không đổi mã, nên không chạy `pnpm check`. `git diff --check` sạch.
