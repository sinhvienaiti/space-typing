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
| 2026-10-24 | [Dọn sau khi nhận từ Mac (Dell): commit `media.md5`, `.gitignore` chặn media runtime, `td.html` báo Lời Gọi đã chuyển, cập nhật file process 17/10](./2026-10-24-hygiene-dell.md) | 74 (một phần) |
| 2026-10-23 | [Typing Defense 1A.6 "Lời Gọi", đợt R3: bot gõ và không gõ, báo cáo `td:balance`, cổng §12, bộ điều phối giữ ngân sách 20 s từng từ, cây 45 s ra 12 Gỗ, kịch bản `td-1a6-*`](./2026-10-23-td-1a6-r3.md) | Cổng 7 của review R1 (bot gõ làm ra ít hơn); ghi chú "Cho R3" của review R2 |
| 2026-10-23 | [Typing Defense 1A.6 "Lời Gọi", đợt R2: học (nghĩa, sổ ôn, Hỏi bài), Tab tới lời gọi mờ, tạm dừng chiến thuật, bong bóng, mũi tên mép, HUD, tiếng báo](./2026-10-23-td-1a6-r2.md) | 3 lỗi thấp của review R1 (NPC ở chế độ đi, dân chặt từ xa, op `mode` không đổi ngày đang chạy) |
| 2026-10-22 | [Kế hoạch chế độ Sinh Tồn: súng gắn từ vựng, tri thức thành năng lượng, hệ phản hồi chiến đấu dùng chung](../survival/SURVIVAL_MODE_PLAN.md) | (kế hoạch; chưa code) |
| 2026-10-22 | [Typing Defense 1A.6 "Lời Gọi", đợt R1: lời gọi, Ngày và Đêm, Ruộng, cây, dân, công trường, lượt mạnh](./2026-10-22-td-1a6-r1.md) | (mã mới TD) |
| 2026-10-22 | [Kế hoạch V3.1 "Lời Gọi": gõ theo lời gọi của NPC, Ngày và Đêm, kinh tế trồng và chặt](../td/CALLS_V3_1_PLAN.md) | (kế hoạch; chưa code) |
| 2026-10-22 | [Typing Defense bước 1A: bản chơi được đầu tiên (tổng hợp, cổng §7)](./2026-10-22-td-1a.md) | (mã mới TD) |
| 2026-10-22 | [Bộ prompt asset Typing Defense](./2026-10-22-td-asset-prompts.md) | (tài liệu) |
| 2026-10-22 | [Typing Defense 1A.5: sửa sau review (luật bot riêng mỗi lượt, file vàng so đủ trường, luồng chính của Chrome trong cổng 5, test người đọc và gợi ý nhịp, Nhanh ẩu ở cùng tải, tải đầy TK 25.12)](./2026-10-22-td-1a5-review.md) | (review mốc 1A.5, mục 1–7) |
| 2026-10-22 | [Typing Defense 1A.5: bot, báo cáo `td:balance`, test vàng, đo hiệu năng, cổng cứng §7, bộ ảnh cho chủ dự án](./2026-10-22-td-1a5-bot.md) | (mã mới TD) |
| 2026-10-22 | [Typing Defense 1A.4: sửa sau review (vàng gọi sớm, Tab không có ân hạn, chỗ trống gợi ý nhanh, chip lý do, test, chuột trên trình duyệt, thẻ trên HUD, Dải Chữ, Delete)](./2026-10-22-td-1a4-review.md) | (review mốc 1A.4, mục 1–10) |
| 2026-10-22 | [Typing Defense 1A.4: điều khiển, HUD, hộp cát (bàn phím đủ đường, chuột, camera, thẻ nhà, 4 chân dung, Tải, Chuỗi, ân hạn, `move`, Đặt sẵn 4 ô)](./2026-10-22-td-1a4-controls.md) | (mã mới TD) |
| 2026-10-22 | [Typing Defense 1A.3: sửa sau review (kẹt cạnh suối, ngắt trợ lực, cầu, dây, ngân sách 1A.4, test, tầng 2)](./2026-10-22-td-1a3-review.md) | (review mốc 1A.3, mục 1–7) |
| 2026-10-22 | [Typing Defense 1A.3: người và ô (A*, Draconis, Thư Đồng, đổi chỗ, ô theo Lũy)](./2026-10-22-td-1a3-agents.md) | (mã mới TD) |
| 2026-10-22 | [Thiết kế Typing Defense (TD)](./2026-10-22-td-design.md) | (thiết kế; thay một phần V5) |
| 2026-10-21 | [Đợt sửa 1: chống đứng hình, chống mất tiến độ và tiền](./2026-10-21-fix-batch-1.md) | 4, 6, 13 (một phần), 17, 18 (một phần), 19, 20, 21, 29, 30, 32, 35 |
| 2026-10-21 | [Thiết kế Rift Defense V5](../RIFT_DEFENSE_PLAN_V5_2026-10-21.md) | (thiết kế; các lỗi Defense 5, 7, 8, 14, 16 nằm trong kế hoạch V5) |
| 2026-10-21 | [Review mã nguồn](./2026-10-21-code-review.md) | (chỉ báo cáo, chưa sửa) |
