# 2026-10-26 — Model Tripo "rainbow-tank" của chủ dự án vào game, trinh sát dùng chung model xe tăng

Commit: commit chứa file này. Nhánh `feat/space-typing-2026-10-18`. Làm trên Mac mini M4.

## Yêu cầu

- Chủ dự án tự tạo model 3D trên web Tripo từ ảnh 2D cũ (thư mục `_GLB` của gói giao nhận 25/10). Claude nhập vào các game; bảng đối chiếu ở `docs/games/3D_IMPORT_2026-10-26.md` của repo cha.
- Chủ dự án (26/10): ảnh `rainbow-scout.png` và `rainbow-tank.png` giống nhau, nên **dùng một model cho cả xe tăng và trinh sát**.

## Đã làm

- `art-src/3d/enemies/rainbow-tank.glb`: model Tripo mới (md5 `200f91fc…`), đã lên Drive, thêm vào `media.md5`.
- `scripts/models/presets/campaign3d-models.json`:
  - `enemies/rainbow-tank-3d`: bỏ `placeholder` (trước đây dựng tạm từ `prism-scout.glb`).
  - `enemies/rainbow-scout-3d`: mục mới, đọc cùng `rainbow-tank.glb` (game tự thu nhỏ trinh sát).
  - `enemies/rainbow-scout-lod` (đám đông Defense, 1.000 tam giác): đọc `rainbow-tank.glb`, bỏ chỗ dựng tạm từ `prism-destroyer.glb`.
  - **Hướng:** model Tripo này quay mặt theo trục +X, khác các model cầu vồng cùng đợt (mặt theo +Y sau phép xoay `rotate`). Ba mục dùng `"nose": "+X"`, không dùng `rotate`. Bản dựng đầu với `rotate` của họ cầu vồng bị lệch 90°; đã phát hiện qua ảnh render và sửa trước khi commit.
- `art-src/3d/SOURCES.json`: chạy lại `scripts/models/index-3d-sources.mjs`. `rainbow-tank.glb` có md5, dùng cho 3 mục; bỏ hai dòng "standIn" của `rainbow-scout.glb` và `rainbow-tank.glb`.
- Dựng lại 3 model runtime (`node scripts/models/prepare-campaign3d-models.mjs --only=<mục> --force`), cả ba PASS; `public/assets/space-typing/models/manifest.json` cập nhật. File GLB runtime lên Drive bằng `pnpm media:push`.
- `rainbow-scout-3d.high.glb` và `.medium.glb` là hai file GLB cũ còn được Git theo dõi (một trong 18 file ghi ở `2026-10-24-hygiene-dell.md`). Bản mới **không** commit vào Git: bỏ theo dõi (`git rm --cached`, file vẫn trên đĩa), `.gitignore` đã chặn, file đi Drive như mọi model khác.

## Mục review đã xử lý

| Mục | Nội dung | Kết quả |
|---|---|---|
| 74 | Asset tách đôi, GLB trong Git | Bớt 2 trong 18 GLB còn được Git theo dõi. 16 file còn lại không đổi. |

## Kiểm tra

- Render Blender Workbench ba góc (trên, từ phía +Y, cạnh +X) của `rainbow-tank-3d`, `rainbow-scout-lod` và `rainbow-shield-3d` (mẫu cùng họ). Sau khi sửa: nhìn từ +Y thấy mặt và càng như ảnh 2D; nhìn từ trên đầu ở phía +Y, cánh xếp về sau, giống quy ước của `rainbow-shield-3d`.
- `pnpm media:status`: khớp danh sách md5 sau khi đẩy.
- Chưa chơi thử trong trình duyệt (Campaign 3D và Defense của Space không đổi mã).

## Còn lại

- Chủ dự án xem model trong game khi tiện; `reviewed` của ba mục vẫn `false`.
- 16 GLB cũ khác vẫn được Git theo dõi (mục 74).
