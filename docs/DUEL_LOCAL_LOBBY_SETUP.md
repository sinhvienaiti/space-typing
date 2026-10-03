# Duel Lobby local — sửa kết nối và thao tác phòng

Ngày: 2026-10-03. Phạm vi: lobby, session API, proxy và khởi động server; không sửa gameplay/renderer horizontal-auto-combat.

## Nguyên nhân đã xác nhận

1. Bản Play trả HTML của SPA cho `/api/duel/session` thay vì JSON. Trình duyệt không lấy được session token, nên Create/Join/Ranked không kết nối. Practice dùng engine local nên vẫn chạy.
2. Duel WebSocket server chưa được khởi động bởi `dev.sh`/`play.sh`; nginx chưa proxy `/duel` và `/api/duel/session`. Server trước đó chỉ có HTTP `/healthz`, không có bộ cấp session local.
3. Phòng Practice `LOCAL-*` giữ state sau Return to Lobby nhưng Start/Leave bị ẩn và handler chỉ xử lý phòng remote. Ranked chặn vì còn ở phòng; thông báo lại nằm cuối form dài.

## Thay đổi

- Hiện Start/Leave cho cả local và remote; local Start kiểm tra `canStart`, local Leave giải phóng state phòng.
- Chặn vào Practice khi còn trong Friend Room hoặc đang xếp hàng Ranked; cần Leave trước.
- Hiện thông báo ngay đầu lobby, giữ thông báo trong vùng nhìn khi cuộn; cuộn đến phòng vừa tạo/join. Các nút không khả dụng được làm mờ.
- Lỗi API trả HTML, HTTP lỗi, không kết nối được có hướng dẫn cụ thể. Session fetch có timeout 8 giây và chống gọi `connect` đồng thời trong lúc đang lấy token.
- Vite và hai template nginx Dev/Play proxy session API + WebSocket về `127.0.0.1:3014`. Vite giữ nguyên Host bằng `changeOrigin: false` để không bị API từ chối 403.
- Script local server dùng chung cho Dev/Play, khởi động idempotent và có lệnh stop/restart. Không dừng tiến trình không thuộc script.
- Session khách chỉ bật bằng `DUEL_LOCAL_SESSIONS=1`, chỉ cho `NODE_ENV=development` và bind loopback. Có kiểm tra Host/Origin/peer, ký token với secret ngẫu nhiên, cookie HttpOnly/SameSite, không gửi secret cho frontend. Production vẫn cần hệ thống đăng nhập thật.

## Dùng ngay trên máy này

Bản Play đã được build trực tiếp bằng Vite; nginx đang chạy đã được bổ sung hai route và reload sau khi `nginx -t` thành công. Duel server local đã được khởi động. Tải lại trang bằng Cmd+R.

Các lần sau, `./dev.sh space`, `./dev.sh` hoặc `./play.sh` sẽ khởi động/reuse Duel server. Lưu ý: **dev.sh có hành vi git pull/bootstrap từ trước**; thay đổi này không thêm hoặc tự chạy git pull. Nếu chỉ muốn khởi động Duel mà không cập nhật Git:

```bash
cd /Users/jokerit/htdocs/typing-game/games/space-typing
pnpm duel:local
```

Chẩn đoán hoặc dừng khi không chơi:

```bash
node scripts/local-duel.mjs status
pnpm duel:local:stop
```

Sau khi sửa code backend, dùng `pnpm duel:local:restart`. Restart **kết thúc phòng/trận local đang chạy**, làm mới secret và xóa Ranked trong bộ nhớ. Tải lại trang để lấy phiên mới. Server là tiến trình nền dùng chung, không tự tắt khi đóng tab hay dừng Vite.

Log và metadata tiến trình: `.duel-local/` (Git ignore). Secret chỉ nằm trong môi trường tiến trình, không ghi vào source/client/log.

## Hiểu đúng Create/Join/Ranked

- Practice không cần server. Mã `LOCAL-*` không dùng để mời người khác.
- Friend Room sử dụng mã phòng do server cấp. Tạo phòng → thêm Bot hoặc người thứ hai Join → người chơi Ready → chủ phòng Start Duel.
- Ranked không tự tạo đối thủ khi chỉ có một người trong hàng đợi. Hai phiên độc lập phải cùng vào một Duel server; có thể dùng Chrome thường + cửa sổ ẩn danh để kiểm tra trên cùng máy.
- Cookie khách được dùng chung giữa các tab cùng hồ sơ. Dùng hai hồ sơ/phiên ẩn danh độc lập, không chỉ hai tab thường, để mô phỏng hai tài khoản. Tên Friend Room lấy từ session (`Local Pilot` với bộ cấp phiên local); ô Pilot name vẫn dùng cho Practice.
- Ranked ở chế độ này là **ghép trận nội bộ, dữ liệu trong RAM**, không phải bảng xếp hạng công khai. Không tự kết nối người chơi Internet, không triển khai public server hoặc LAN discovery.
- Không mở port 3014 ra Internet và không bật local guest issuer trên production. Vận hành public cần identity provider, TLS, origin policy và persistence phù hợp, nằm ngoài bản sửa lobby này.

## Kiểm chứng

- TypeScript client/server và Vite build: đạt. Không chạy prebuild/art preparation để tránh sửa artwork hiện có.
- 56 test auth, local session, room, network client, authority và ranked: đạt. Build còn cảnh báo chunk lớn hơn 500 kB, không phải lỗi lobby và không được giải quyết trong phạm vi này.
- `node scripts/visual/duel-lobby-check.mjs` kiểm tra trên bản Play với các browser context độc lập:
  - Practice → Return handler → Remove/Add Bot → Start lại → Leave.
  - Queue Ranked sau khi Leave local → hủy queue.
  - Create remote → Add/Remove Bot → người khác Join → Leave/Rejoin → cả hai Ready → chủ phòng Start → cả hai vào battlefield.
  - Hai khách mới vào Ranked → được ghép trận và vào battlefield.
  - Chặn session API để mô phỏng mất dịch vụ → hiện lỗi → Practice vẫn chạy.
- Bước Return từ Practice trong automation gọi handler trực tiếp để không phải chờ hết trận; đây không phải test hoàn thành toàn bộ trận.
- Ảnh ở `.visual/duel-lobby-local-actions.png`, `.visual/duel-lobby-two-players-ready.png`, `.visual/duel-lobby-service-unavailable.png` (1642×799, DPR 2). Đã mở ảnh để kiểm tra, không chỉ dựa vào test.
- Dev trực tiếp `http://127.0.0.1:3004/`: session + WebSocket online, Create Room thành công; đã xem ảnh `.visual/duel-lobby-dev.png`. Cảnh báo thiếu shared vocabulary khi chạy Vite độc lập dùng bundled fallback, không phải lỗi Duel. Vite tạm đã được tắt sau kiểm tra; Duel server local được giữ chạy để sử dụng.

## Phạm vi file và cấu hình máy

Có thay đổi trong **hai repo**: Space Typing (UI/server/test/script/docs) và platform cha (dev.sh, play.sh, hai nginx template). Không commit/push, không thay artwork có sẵn của chủ dự án.

Nginx thực tế: `/usr/local/etc/nginx/servers/typing-game.local.conf`.
Bản sao trước sửa: `/usr/local/etc/nginx/typing-game.local.conf.before-duel-20261003.bak` (nằm ngoài thư mục nginx tự include). Không xóa cấu hình cũ.
