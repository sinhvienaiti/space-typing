# Changelog Space Typing

Mỗi bản cập nhật có một file trong thư mục này. File ghi rõ đã làm gì, sửa mục nào của báo cáo review, kiểm tra ra sao, và còn lại gì.

## Quy tắc

- Tên file: `YYYY-MM-DD-<chủ-đề>.md`. Một ngày có thể có nhiều file nếu là các bản cập nhật khác nhau.
- Mỗi file có các mục: **Yêu cầu**, **Đã làm**, **Mục review đã xử lý** (theo số trong báo cáo review), **Kiểm tra**, **Còn lại**.
- Ghi commit của bản cập nhật ở đầu file.
- Thêm một dòng vào bảng dưới đây, mới nhất ở trên.
- Changelog của cả nền tảng (repo cha `typing-game`) vẫn ở `docs/changelog/` của repo cha. Bản cập nhật Space Typing thì ghi ở đây, rồi repo cha ghi một dòng trỏ sang.

## Báo cáo review

| Ngày | Báo cáo | Ghi chú |
|---|---|---|
| 2026-10-21 | [Review mã nguồn](./2026-10-21-code-review.md) | 85 vấn đề đã xác minh, đánh số 1–85 theo mức độ. Các file cập nhật trỏ tới số này. |

## Các bản cập nhật

| Ngày | Bản cập nhật | Mục review đã xử lý |
|---|---|---|
| 2026-10-22 | [Typing Defense 1A.3: sửa sau review (kẹt cạnh suối, ngắt trợ lực, cầu, dây, ngân sách 1A.4, test, tầng 2)](./2026-10-22-td-1a3-review.md) | (review mốc 1A.3, mục 1–7) |
| 2026-10-22 | [Typing Defense 1A.3: người và ô (A*, Draconis, Thư Đồng, đổi chỗ, ô theo Lũy)](./2026-10-22-td-1a3-agents.md) | (mã mới TD) |
| 2026-10-22 | [Thiết kế Typing Defense (TD)](./2026-10-22-td-design.md) | (thiết kế; thay một phần V5) |
| 2026-10-21 | [Đợt sửa 1: chống đứng hình, chống mất tiến độ và tiền](./2026-10-21-fix-batch-1.md) | 4, 6, 13 (một phần), 17, 18 (một phần), 19, 20, 21, 29, 30, 32, 35 |
| 2026-10-21 | [Thiết kế Rift Defense V5](../RIFT_DEFENSE_PLAN_V5_2026-10-21.md) | (thiết kế; các lỗi Defense 5, 7, 8, 14, 16 nằm trong kế hoạch V5) |
| 2026-10-21 | [Review mã nguồn](./2026-10-21-code-review.md) | (chỉ báo cáo, chưa sửa) |
