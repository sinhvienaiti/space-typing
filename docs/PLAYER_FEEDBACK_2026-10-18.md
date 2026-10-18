# Góp ý, báo lỗi và liên hệ từ trong game — 18/10/2026

Người chơi gửi ý tưởng, báo lỗi hoặc tin nhắn cho đội ngũ ngay trong game. Admin đọc và xử lý ở `https://typing-game.local/admin/space-typing/feedback` (Admin > Players & Live Ops > Feedback).

## 1. Phía người chơi
- **Nơi mở:**
  - nút có biểu tượng bóng thoại ở hàng nút trên cùng của màn hình chính, trước nút Settings (`#titleFeedbackButton`);
  - nút "Report a bug" trong màn tạm dừng (`#pauseFeedbackButton`), tự chọn loại "Report a bug";
  - liên kết "Report a bug" trong Campaign 3D (menu và màn tạm dừng), dẫn tới `/?feedback=bug&from=campaign-3d`. Hộp thoại mở sau khi màn hình chờ tắt.
- **Hộp thoại** (`#feedbackDialog`, `src/ui/feedback-dialog.ts`, kiểu dáng `.fb-*` trong `src/ui/online.css`):
  - chọn loại: Report a bug / Idea / Contact;
  - nội dung từ 10 đến 2.000 ký tự, có bộ đếm;
  - email để nhận trả lời: không bắt buộc. Tài khoản đã đăng ký thì tự điền sẵn email;
  - ô "Attach game details", bật sẵn. Mục "What is attached" liệt kê đúng những gì sẽ gửi:
    - màn hình, giai đoạn chơi, chế độ, màn chơi, tàu, mức đồ họa;
    - phiên bản game (0.1.0) và phiên bản bản lưu;
    - trang, cỡ cửa sổ, ngôn ngữ, trạng thái online, trình duyệt;
    - tối đa 5 lỗi script gần nhất.
  - Không gửi mật khẩu, bản lưu hay tệp nào.
- **Bản nháp** lưu ở `spaceTypingFeedbackDraftV1` trong lúc gõ, và xóa sau khi gửi.
- **Khi mất mạng:** tin chờ trong `spaceTypingFeedbackOutboxV1` (tối đa 3 tin), và tự gửi khi game online trở lại. Tin bị máy chủ từ chối (sai định dạng, quá giới hạn) thì bỏ, để không chặn các tin sau.
- **Ghi lỗi:** module ghi lại các lỗi `error` và `unhandledrejection` ngay từ lúc game tải.

## 2. Máy chủ (Cloudflare Worker + D1, vẫn trong gói Free)
- **Bảng** `player_feedback` (migration `cloud/migrations/0008_player_feedback.sql`), có 2 chỉ mục (index): `(status, created_at)` và `account_id`.
- **Luật kiểm tra dùng chung** cho máy chủ và hộp thoại: `src/online/feedback-rules.ts`.
  - Bỏ ký tự điều khiển và ký tự ẩn, nhưng giữ xuống dòng.
  - Bối cảnh chỉ giữ các khóa cho phép, mỗi giá trị có giới hạn độ dài.
- **Gửi:** `POST /api/account/feedback` (`cloud/src/feedback.ts`).
  - Cần phiên đăng nhập. Khách (guest) cũng gửi được, vì game tự tạo tài khoản khách.
  - Mỗi người chơi tối đa 5 tin mỗi giờ, mỗi mạng (IP) tối đa 20 tin mỗi giờ.
  - Bộ đếm chỉ ghi vào cơ sở dữ liệu cùng lúc với tin, trong cùng một batch. Tin bị từ chối không tốn lần ghi nào.
- **Xóa tài khoản:** tin vẫn giữ để đọc, nhưng xóa liên kết tới tài khoản, tên người gửi và email.
- **Xuất dữ liệu** (`GET /export`): có danh sách góp ý của chính người chơi.
- **Dọn dẹp hằng ngày** (`maintenance.ts`): xóa tin đã xử lý (resolved) quá 365 ngày. Tin mới và tin đã đọc không bị xóa.
- **API cho admin** (`cloud/src/admin.ts`):
  - `GET /feedback`: lọc theo `status` (`open` = mới + đã đọc, `new`, `read`, `resolved`), theo `category`, và theo chữ `q`; phân trang; trả kèm số lượng của từng trạng thái;
  - `POST /feedback/:id/status`: đổi trạng thái, kèm ghi chú;
  - `POST /feedback/:id/reply`: gửi một thư trong game, không kèm phần thưởng, tới hộp thư Daily Hub của người chơi, rồi đánh dấu tin là đã xử lý.
  - Mọi thay đổi đều ghi `admin_audit`.
  - `GET /stats` có thêm `newFeedback`.

## 3. Admin
- **Trang** `portal/src/admin/v2/feedback.ts`:
  - ô đếm New / Read / Resolved;
  - bộ lọc (mặc định Open), tìm kiếm, phân trang;
  - xem đầy đủ tin, người gửi, bối cảnh game và các lỗi gần nhất;
  - nút: Mark read, Mark resolved, Move back to New, ghi chú cho admin khác, Reply by in-game mail.
  - Mở một tin mới thì tin đó tự thành "đã đọc".
- **Quyền mới** (`admin/admin-security.mjs`):

  | Quyền | Cho phép |
  |---|---|
  | `feedback.read` | Đọc |
  | `feedback.manage` | Đổi trạng thái, trả lời |

  | Vai trò | Quyền được thêm |
  |---|---|
  | Player Support, Live Ops | đọc + xử lý |
  | Developer / QA | chỉ đọc |
  | Super Admin | có tất cả |

- **Cầu nối** `admin/account-bridge.mjs` thêm 2 đường dẫn: `GET /feedback` và `POST /feedback/:uuid/(status|reply)`.

## 4. Đưa lên máy chủ thật (chưa làm)
1. Chạy migration trước: `wrangler d1 migrations apply space-typing --remote -c cloud/wrangler.jsonc`.
2. Sau đó deploy Worker.
3. Sau đó deploy Admin và Portal.

Không có biến môi trường (secret) mới.

## 5. Đã kiểm tra (18/10/2026)
- `tests/feedback-rules.test.ts` (3 bài) và `tests/cloud-feedback.test.mjs` (5 bài, chạy trên SQLite giả lập với đủ các migration thật):
  - lưu và làm sạch tin;
  - giới hạn số tin, chặn email sai;
  - lọc danh sách, đổi trạng thái, trả lời bằng thư, ghi audit;
  - xóa tài khoản, dọn dẹp.
- `pnpm admin:test`: 47 bài đạt. TypeScript của game, Worker và Portal đều sạch. Đã build Portal và game.
- **Trên bản Play:**
  - đã áp migration 0008 vào cơ sở dữ liệu Play ở máy (chỉ thêm bảng);
  - đã khởi động lại máy chủ Admin (cổng 3199) bằng `setsid nohup node admin/server.mjs`, như `play.sh`;
  - đã gửi một tin thử từ màn hình chính và đọc được ở trang admin.
  - Tin thử ghi rõ "[Claude test]", loại Bug report, để mẫu ở trạng thái "đã đọc". Chủ dự án có thể bấm Mark resolved.
