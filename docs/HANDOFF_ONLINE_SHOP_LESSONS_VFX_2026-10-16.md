# Bàn giao: online trên Cloudflare, Style Shop, Daily Lessons, VFX màn kết quả (16/10/2026)

> **Dành cho:** chủ dự án và AI làm tiếp (Claude, ChatGPT, Codex).
> **Đợt trước:** `docs/LIVEOPS_UIUX_3D_IMPLEMENTATION_2026-10-16.md` (Daily Hub, chuyển động, đường ống 3D).
> **Đưa lên mạng:** `docs/ONLINE_CLOUDFLARE_DEPLOY.md`.
> **Ảnh, mô hình cần làm:**
> - `docs/art-requests/RESULT_SCREENS_3D_VFX_2026-10-16.md` (ngôi sao, khiên vỡ: 3D, tùy chọn);
> - `docs/art-requests/STYLE_SHOP_COSMETICS_2026-10-16.md` (34 ảnh 2D: avatar, khung, ảnh nền; tùy chọn).
>
> Mọi phần dưới đây **chạy được ngay mà không cần ảnh**. Ảnh và mô hình chỉ để thay bản dựng bằng mã cho đẹp hơn.

## 0. Tóm tắt

| Phần | Đã làm | Còn mở |
|---|---|---|
| Online | API tài khoản, lưu đám mây, Daily Hub do máy chủ xác nhận, thư, mã quà, bạn bè, nhóm, chat thế giới/nhóm/riêng, trên **Cloudflare Workers + D1 + Durable Objects (gói Free)**. Bộ kiểm tra đầu cuối 63/63. | Duel online (Node, cổng 3014) và endpoint chính sách Admin (cổng 3199) chưa chuyển sang Cloudflare. Bảng xếp hạng. |
| Admin | Màn Players, Live-ops mail, Chat moderation trong trang Admin của Codex, có phân quyền và nhật ký. | Danh sách lỗi Admin ở mục 7. |
| Giao diện | Màn hình chính thoáng hơn; HUD v2 có lửa thật bằng shader; hộp thoại Warp mới; bỏ mọi `confirm/alert` của trình duyệt. | |
| VFX | Stage Complete và Run Over bằng 3D (WebGL). | Mô hình thật cho ngôi sao và khiên (tùy chọn). |
| Âm thanh | Voice boost tới 300%. | |
| Shop | **Style Shop**: 7 loại đồ trang trí (65 món), 4 gói, 2 bùa Credits. | Admin chỉnh danh mục. Màu sơn cho tàu 3D. |
| Học | **Daily Lessons**: chuỗi 5 bài mỗi ngày theo trình độ (Starter–C2) và chủ đề (101 chủ đề). | Bài ngữ pháp từ hệ thống nội dung tiếng Anh (cần gộp nhánh). Bảng xếp hạng bài học. |

## 1. Online (Cloudflare)

### 1.1 Máy chủ (`cloud/`)

| Tệp | Nội dung |
|---|---|
| `wrangler.jsonc` | Worker `space-typing-api`, D1 `DB`, Durable Object `CHAT`. |
| `migrations/0001_init.sql` | Các bảng: tài khoản, phiên, bản lưu và sao lưu, live-ops, sổ thưởng, thư, mã quà, bạn bè, nhóm, báo cáo chat, nhật ký Admin. |
| `src/accounts.ts` | Khách theo khóa thiết bị; đăng ký nâng cấp tài khoản khách và giữ nguyên id; đăng nhập; quên/đặt lại mật khẩu; xác minh email; xuất và xóa dữ liệu. |
| `src/saves.ts` | Lưu đám mây có số phiên bản (revision). Xung đột trả 409. Sao lưu theo giờ, giữ 12 bản. Tối đa 1,9 MB. |
| `src/liveops.ts` | Nhận quà Daily Hub: ghi sổ thưởng và trạng thái trong một `batch` có điều kiện (D1 không có giao dịch tương tác), nên không trả hai lần. |
| `src/chat.ts`, `src/chat-rules.ts` | Mỗi kênh là một Durable Object dùng WebSocket Hibernation. Chống spam theo "xô token", che từ tục (Việt/Anh), bỏ link ở kênh thế giới, khách chỉ đọc. **Mới:** tin nhắn mang "look" (avatar, khung, danh hiệu); máy chủ chỉ giữ mã có trong danh mục. |
| `src/social.ts` | Bạn bè theo mã phi công, nhóm có mã mời 8 ký tự. |
| `src/admin.ts` | Các lệnh `/internal/admin/*` cho Admin. |

Mật khẩu:
- **Trình duyệt** chạy PBKDF2-SHA256 310.000 vòng (muối = `space-typing:v1:` + email).
- **Máy chủ** chỉ lưu HMAC-SHA256 có "pepper", để mỗi yêu cầu dưới 10 ms CPU.

Phiên đăng nhập:
- cookie `st_session` dạng HttpOnly;
- mọi lệnh ghi phải có header `x-space-typing: 1` (chống giả mạo yêu cầu).

### 1.2 Chạy ở máy

- `pnpm account:local` khởi động `wrangler dev` ở 127.0.0.1:3016, dữ liệu lưu trong `.account-local/wrangler`. Tắt: `pnpm account:local:stop`.
- `play.sh` và `dev.sh` tự khởi động.
- Đường đi của yêu cầu:
  - nginx: `/api/account/` tới cổng 3016; riêng `/api/account/chat/connect` có header Upgrade cho WebSocket;
  - Vite (`vite.config.ts`): `ws: true`.
- Kiểm tra: `node scripts/account-e2e.mjs [địa-chỉ] [địa-chỉ-admin]`. Kết quả: 63/63 thẳng vào Worker; 61/61 qua Vite và qua nginx (trước khi thêm 2 phép thử "look").

### 1.3 Trình duyệt

| Tệp | Nội dung |
|---|---|
| `src/online/api.ts`, `session.ts`, `password-key.ts` | Gọi API; phiên khách hoặc tài khoản; băm mật khẩu. |
| `src/online/cloud-save.ts` | Tải bản lưu lên 15 giây sau thay đổi. Gặp xung đột thì cho người chơi chọn bản nào. |
| `src/online/liveops-remote.ts` | Daily Hub nhận quà qua máy chủ khi online. |
| `src/online/chat-client.ts`, `src/ui/chat-panel.ts` | Khung chat: tab World/Groups/Friends, báo cáo tin nhắn, avatar có khung. |
| `src/ui/account-dialog.ts` | Tạo tài khoản, đăng nhập, quên mật khẩu, hồ sơ, thiết bị, xuất/xóa dữ liệu. |

## 2. Admin (trang của Codex)

- `admin/account-bridge.mjs`:
  - bảng đường dẫn → quyền;
  - mọi lệnh ghi đi qua `runAuthorizedAdminMutation` (có nhật ký);
  - gọi Worker bằng `ACCOUNT_SERVICE_URL` và `ACCOUNT_ADMIN_TOKEN`.
- `admin/admin-security.mjs`:
  - quyền mới: `players.read`, `players.moderate`, `players.save`, `players.credentials`, `liveops.mail`, `chat.moderate`;
  - vai trò mới: `support`, `liveops`.
- Màn mới trong `portal/src/admin/v2/`: `players.ts`, `liveops-mail.ts`, `chat-moderation.ts`. Nằm ở nhóm menu "Players & Live Ops".
- Sửa lỗi P0: lưu System settings không còn xóa các trường khác (`space-typing-settings-phase-b-legacy.ts`).

## 3. Giao diện và VFX

### 3.1 Màn hình chính (`src/ui/holo.css`)

- Tiêu đề và thẻ chế độ co theo chiều cao màn hình. Mô tả thẻ tối đa 2 dòng (3 dòng nếu màn cao từ 900px).
- Ẩn gợi ý phím ESC/SPACE.
- Ô giọng nói thu gọn ở màn hình chính.
- Dưới 1360px, ẩn dải thông tin giữa thanh trên.
- Ở màn laptop (1181–1500px), thanh công cụ dưới dời sang trái để không chạm ô giọng nói.
- Đã kiểm tra ở 1280×720, 1366×768, 1642×799, 1920×1080: không chữ bị cắt, không chỗ đè nhau.
- Sửa ảnh hỏng ở thẻ Campaign: thiên hà g01 không có `plate-c`.

### 3.2 HUD v2 và lửa

- `src/vfx/hud-fire.ts`: lửa shader thật quanh khung HUD khi chuỗi gõ cao hoặc đầy Rage. Vẽ ở độ phân giải thấp theo chất lượng hình. Đo trên Intel UHD 630: 0 khung trễ trong 300 khung.
- Hộp thoại Warp mới (`src/ui/warp-charge.css`).
- `holoConfirm` (`src/ui/holo-confirm.ts`) thay mọi `confirm/prompt/alert` của trình duyệt.

### 3.3 Màn kết quả 3D (`src/vfx/result-fx.ts`)

- **Stage Complete:**
  - 3 ngôi sao 3D có mặt cắt, lao vào ô sao;
  - tóe tia lửa, vòng sóng, lóe sáng, rung màn hình, có tiếng;
  - tia sáng xoay sau ngôi sao; pháo giấy (thêm pháo hai góc dưới từ mức 3).
- **Run Over:**
  - nhiễu "mất tín hiệu";
  - khiên lục giác 36 mảnh nứt rồi vỡ, có tiếng; mảnh lơ lửng nguội dần;
  - khói, tàn lửa.
- Dùng **canvas WebGL riêng**, không dùng renderer chung. Lý do: chép một khung hình toàn màn hình ra khỏi renderer chung tốn khoảng 7 ms, và làm phình bộ đệm của nó cho mọi lần vẽ sau trong trận.
- Bỏ lớp làm mờ nền (`backdrop-filter`) ở hai màn kết quả: nó tính lại mỗi khung, tốn 2–4 ms.
- Số đo và hướng dẫn xem thử ở tài liệu art-request của màn kết quả. Bản 3D nhẹ hơn bản CSS cũ.
- `?resultfx=off` để so với bản CSS. Dev: `__resultPreview("clear", 3, 5)`, `__resultPreview("over")`.

### 3.4 Voice boost (`src/audio/mix.ts`, `MusicController.setPronunciationDepth`)

- Giọng đọc của trình duyệt không vượt được 100%.
- Thanh **Voice boost** (100–300%, mặc định 200%) hạ nhạc và tiếng hiệu ứng xuống còn 1/boost trong lúc đọc. Nhạc trở lại sau 320 ms, để nhiều từ liền nhau không làm nhạc nhấp nhô.
- Có ở khung chỉnh âm nhanh và trong Settings.

## 4. Style Shop (`src/cosmetics/`, `src/ui/style-shop.ts`)

- **Danh mục** (`catalog.ts`, không phụ thuộc DOM, Worker cũng dùng): 16 avatar, 10 khung, 11 danh hiệu, 8 ảnh nền, 6 màu sơn tàu, 7 vệt động cơ, 7 màu đạn.
- **Cách có đồ:** mua bằng Credits/Star Crystal, hoặc mở theo tiến độ (đạt màn X, chuỗi ngày Y). Đồ chỉ đổi vẻ ngoài, không đổi sức mạnh.
- **Gói:** 4 gói vật phẩm giảm giá, giới hạn số lần mua mỗi ngày.
- **Bùa Credits:** +50% hoặc +100% Credits khi thắng màn, trong 5 lần thắng; trả bằng Star Crystal.
- **Lưu:** `save.auxiliary.cosmetics`. Hàm thuần trả state mới và giá; `main.ts` trừ tiền và lưu một lần. Lưu lỗi thì hoàn lại tất cả.
- **Hiển thị:**
  - tàu trong trận: màu sơn (một bản tô sẵn, không tốn thêm mỗi khung), vệt động cơ (lửa và đèn rig), màu vệt đạn;
  - thẻ phi công: avatar có khung, danh hiệu, ảnh nền; bấm vào avatar là mở Style Shop;
  - chat.
- **Mở Style Shop:** Shops → Style Shop, hoặc bấm avatar trên thẻ phi công.
- **Ảnh vẽ:** đặt file vào `public/assets/space-typing/cosmetics/{avatars,frames,banners}/<id>.webp`, chạy `pnpm cosmetics:manifest`.
- **Kiểm thử:** `tests/cosmetics-state.test.ts` (7).

## 5. Daily Lessons (`src/lessons/`, `src/ui/daily-lessons.ts`)

- **Chuỗi 5 bài mỗi ngày, chơi theo thứ tự:**
  1. Word Warm-up (Combat, 12 từ);
  2. Listen & Recall (Recall, 10 từ);
  3. Passage Run (gõ từ khóa của một đoạn văn) với A1–A2, hoặc Stretch Round (từ khó hơn một bậc) với B1 trở lên;
  4. Fix Your Mistakes (mọi từ đã sai hoặc phải sửa trong ngày);
  5. Boss Exam (24 từ, màn có boss).
- **Cài đặt:** trình độ Starter, A1–C2 (đọc CEFR từ tên cấp từ vựng) và chủ đề (101 chủ đề của `shared/vocabulary/topics`). Cùng ngày, trình độ và chủ đề thì ra cùng bộ từ.
- **Cách chạy:** mỗi bài là một màn luyện tập miễn phí ("Smart Review"):
  - không tốn Warp, không đổi tiến độ chiến dịch, không đổi lựa chọn chế độ chơi đã lưu;
  - màn được chọn không vượt màn cao nhất đã mở (bài nhẹ tối đa màn 6 hoặc 14; Boss Exam là màn boss gần nhất, tối đa 50).
- **Thưởng:** 3 bài được 150 Credits; 5 bài được 400 Credits và 2 Star Crystal; có chuỗi ngày làm đủ 5 bài.
- **Lưu:** `save.auxiliary.lessons`.
  - Khi xong một bài, game vẫn đang ở chế độ ôn tập, nên tự động lưu cố ý bỏ qua. Vì vậy bài học được ghi thẳng bằng `accountTransactions.updateAuxiliary`.
  - Đã thử: xong bài 1 thì báo "✓ Lesson 1/5 saved", nút đổi thành "Next lesson · Listen & Recall".
- **Ở màn kết quả:** "Next lesson", "Replay lesson", "Retry lesson".
- **Mở:** nút **Lessons** ở thanh dưới; có chấm khi còn bài hoặc có quà chưa nhận.
- **Dữ liệu:** đọc từ `/vocabulary` và `/shared/typing-texts`, do nginx phục vụ từ `shared/`. Khi chạy thẳng Vite (cổng 3004), các thư mục này không có, nên bài học dùng bộ từ đang có của game.
- **Kiểm thử:** `tests/lesson-chain.test.ts` (7). Đã chạy thật qua nginx: danh sách có 101 chủ đề, bài 1 vào màn "DAILY LESSON 1/5 // WORD WARM-UP · 12 words".
- **Hệ thống nội dung tiếng Anh** (nhánh `feature/english-learning-content-system`, chưa gộp vào nhánh này):
  - có 300 chủ điểm ngữ pháp, 1.400 bài tập (điền chỗ trống, dịch, sửa lỗi, viết lại câu), lỗi hay gặp, hội thoại, cụm từ;
  - nhánh chỉ lọc được CEFR cho chủ điểm ngữ pháp, chưa lọc được theo chủ đề từ vựng;
  - khi gộp và phục vụ ở `/english-content`, có thể thêm một loại bài "Grammar" vào chuỗi (`LessonKind`) mà không đổi luật chuỗi.

## 6. Kiểm tra đã chạy

- Toàn bộ kiểm thử game: **334 tệp, 2.031 kiểm thử đều qua**.
- Kiểm tra kiểu dữ liệu: game, Worker.
- `pnpm build:space` và `pnpm build:portal`: qua. Các lối thử chỉ cho dev (`__resultPreview`, `__lessons`) không có trong bản build.
- Bộ kiểm tra đầu cuối online: 63/63.

## 7. Việc tiếp theo (đề xuất theo thứ tự)

1. **Chủ dự án duyệt qua portal**:
   - màn hình chính;
   - thắng và thua một màn (xem VFX);
   - Style Shop;
   - Daily Lessons (chơi đủ 5 bài để thấy chuỗi và quà);
   - Voice boost.
2. **Gộp nhánh nội dung tiếng Anh**, rồi thêm bài Grammar (cloze, error-correction) vào Daily Lessons.
3. **Bảng xếp hạng** cho Daily Lessons và Expedition, trên D1 (gói Free đủ).
4. **Duel online lên Durable Objects** (mỗi phòng một Durable Object).
5. **Admin, những việc còn lại từ đợt rà soát:**
   - nối các cài đặt Admin chưa có tác dụng trong game: chữ và chỉ số tàu, trang bị, kỹ năng, `minStage` của quái, tên và danh hiệu boss, âm thanh mặc định, nhạc theo thế giới;
   - lỗi "bản gốc đi kèm bị coi là đã publish";
   - hỏi xác nhận khi Discard và khi rời trang chưa lưu;
   - kiểm tra khoảng giá trị;
   - kiểm tra MIME khi tải media; kích thước tải lên ở nginx; đường dẫn xem trước;
   - độ ưu tiên font (`space-typing-ui.css:59-61`);
   - 7 trang chưa có giao diện; tab mô hình 3D;
   - đăng nhập Admin bằng token (P0 bảo mật);
   - trang Admin cho danh mục Style Shop và luật Daily Lessons.
6. **Màu sơn cho tàu 3D**, khi có mô hình tàu đầu tiên.
