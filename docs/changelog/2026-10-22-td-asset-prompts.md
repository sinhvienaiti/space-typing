# 2026-10-22 — Bộ prompt asset Typing Defense (ảnh 2D cho Tripo, ảnh 2D dùng thẳng, âm thanh)

Commit: `69e62670` (bộ prompt và các quyết định), `60879396` (sửa sau phản biện).

## Yêu cầu

- Sau thiết kế TD, chủ dự án cần prompt để tạo asset: ảnh 2D đúng tư thế và góc nhìn để Tripo dựng 3D, ảnh 2D dùng thẳng trong game, và file prompt âm thanh.
- Chủ dự án nhờ ChatGPT đọc file prompt theo đường dẫn trên GitHub, nên file phải được đẩy lên Git (không kèm media).
- Chủ dự án giao: tự quyết các điểm còn mở, không chờ duyệt.

## Đã làm

- Thư mục mới [`docs/art-requests/td/`](../art-requests/td/README.md), 9 file, chia bậc P / VS / Sau theo mục 27.2 của thiết kế:
  - `README.md`: mục lục, thứ tự làm, "Đợt đầu" 11 mục, cách nhờ ChatGPT (ghi repo và nhánh), cách lưu, Tripo, sao lưu Drive, bảng 236 mục bậc P có cột "Xong?", các điểm đã tự quyết.
  - `01-tripo-characters-enemies.md` (+ `-vs`): Thư Đồng và bộ gắn, Lam, Draconis dáng mới (P18), Lính Giáo, 7 quái, boss Mộc Tinh.
  - `02-tripo-buildings-props.md` (+ `-vs`): 6 nhà và Đài Ấn, nòng pháo, goòng, đống vàng, đạn, túi, rương, cờ cấp, Rễ Trồi.
  - `03-2d-scenery-ui-vfx.md` (+ `-vs`): cảnh bản đồ 1, phông xa, chân dung, đèn lồng, icon, VFX.
  - `04-audio.md` (+ `-vs`): 70 tiếng ngắn, 36 câu thoại, 3 tiếng gắng sức, nhạc bản đồ 1 và 11 câu nhạc ngắn ở bậc P.
- Quyết định (ghi ở README mục 7, đổi được):
  - Draconis theo ảnh 3.png (thân trắng, cánh lông vũ vàng kem). Bốn model Draconis có sẵn đều là rồng đỏ cánh màng, nên `draconis-v2` chỉ là model tạm.
  - Tháp Pháo được ngoại lệ chiều cao 3,5–4,5 m.
  - Thêm socket `FX_perch` (chỗ Draconis đậu).
  - Dùng một cờ cấp chung cho mọi nhà.
  - Thuồng Luồng đo theo chiều cao đầu ngóc.
  - Âm thanh bậc P có 70 id.
- Thiết kế `docs/td/TYPING_DEFENSE_DESIGN.md` cập nhật cho khớp: 22.2 (Draconis model tạm), 23.2 (Pháo), 23.9 (`FX_perch`), 27.2 (món thêm vào bậc P, trỏ tới bộ prompt).

## Cách làm và kiểm tra

- Workflow 9 agent: 4 agent viết 4 nhóm file, 4 agent phản biện từng nhóm và sửa ngay (85 lỗi đã sửa), 1 agent tổng hợp README, soát chéo và đối chiếu 27.2.
- Workflow hoàn thiện 6 agent: áp các quyết định; 2 agent đóng vai ChatGPT ghép thử prompt các mục mẫu; 1 agent soát rủi ro khi Tripo dựng 3D; 1 agent soát độ khớp giữa các file. Tìm ra 30 lỗi (3 nặng); sửa 25, bác 2 có lý do.
- Ba lỗi nặng đã sửa: dòng câu lệnh cho ảnh góc phụ mâu thuẫn với khối chung; Draconis P18 phải dựng không rig để Blender dựng cánh; cánh P18 giơ cao để không dính tay.
- Kiểm bằng script: code fence cân, số cột bảng đúng, link nội bộ mở được, mỗi file dưới 90 KB, bảng P ở README khớp các file.

## Mục review đã xử lý

Không có (chỉ tài liệu).

## Còn lại

- Chủ dự án tạo ảnh theo "Đợt đầu", lưu vào `art-src/td/...`, chạy `pnpm media:push`.
- Ảnh mẫu 2.png, 3.png, 4.webp nên lưu vào `art-src/td/refs/` (không vào Git).
- File âm thanh viết trước 1B; có thể chỉnh lại sau 1B.
- Bộ Blender cho TD (`--kind helpers|units|buildings`, dựng cánh Draconis, VAT) làm ở bước 1C.
