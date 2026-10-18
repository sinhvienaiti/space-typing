# Hoàn thiện ví server và nghiệm thu boss G01 — 17/10/2026

Đọc cùng `CLAUDE_PROCESS_2026-10-17.md` và `VISUAL_TESTING.md`.

## Thay đổi

- Mua hàng gửi mã loại/món hàng. Worker đối chiếu giá với danh mục dùng chung, gồm Style Shop, hàng trong shop, gói sửa chữa, thuộc tính và nâng cấp trang bị. Sai giá hoặc món không hợp lệ thì từ chối trước khi trừ tiền.
- Tách công thức giá thuần sang `src/shops/service-prices.ts` và `src/progression/attribute-price.ts`. Game và Worker dùng cùng công thức.
- Mua hàng có biên nhận chờ trên server và nhật ký phục hồi theo tài khoản ở trình duyệt. Món hàng và mã mua được ghi cùng bản lưu IndexedDB. Lưu thành công thì xác nhận; lưu thất bại thì khôi phục cả trạng thái và snapshot phục hồi rồi hoàn tiền. Mở lại game tiếp tục xác nhận/hoàn tiền theo biên nhận đã lưu.
- Biên nhận mua chưa giải quyết tồn tại qua ngày mới. Không giới hạn vào sổ giao dịch của hôm nay.
- Gửi lại yêu cầu khi mất phản hồi dùng cùng `opId`. Nạp Warp giữ mã qua lần thử lại. Phản hồi của tài khoản cũ bị bỏ khi tài khoản đổi. Thao tác mua bị chặn nếu không ghi được nhật ký phục hồi.
- Không dùng số dư local để mua khi một phiên online mở ví thất bại. Không Deploy hoặc đổi màn trong lúc đang lưu giao dịch mua.
- Trận đã kết thúc không nhận thưởng lại bằng một `opId` khác. Server dùng màn đã ghi khi bắt đầu trận để kiểm tra thưởng, và chỉ cho bắt đầu màn đã mở khóa.
- Biên nhận thưởng Daily Lessons giữ riêng trong 90 ngày. Không thể nhận lại chỉ bằng cách đẩy mã cũ khỏi danh sách thử lại. Ngày tương lai hoặc quá thời hạn bị từ chối.
- Sửa nhãn đồng bộ đám mây từ 15 giây thành tối đa một lần/phút.
- G01 có thể tìm mô hình theo ID, kể cả khi không có ảnh 2D đi kèm. Lỗi tải GLB có thông báo khi chạy dev; bản Play vẫn dùng fallback.
- Công cụ chụp dùng cổng CDP trống do hệ điều hành cấp, chờ game thực sự sẵn sàng, có timeout và dọn hồ sơ Chrome trên Windows. Script đo boss từ chối số đo nếu mô hình chưa tải hoặc trận đã kết thúc.

## Migration

Chạy migration trước khi dùng Worker mới:

- `0004_wallets.sql`: ví do Claude triển khai.
- `0005_pending_purchases.sql`: biên nhận mua chưa giải quyết.
- `0006_fixed_reward_receipts.sql`: biên nhận thưởng bài học.

Các migration mới chỉ thêm cột. Production chưa được triển khai trong công việc này.

## Bằng chứng đã có

- TypeScript: game, Duel server và Worker đã qua ở lượt kiểm tra cuối.
- 8 tệp kiểm thử tập trung: 57/57 qua. Có SQLite thật trong bộ nhớ để kiểm tra đổi ngày, biên nhận, hoàn tiền, shadow mode và kết thúc trận.
- E2E trên Worker/D1/Chat thật ở cổng riêng: lượt cuối 112/112 qua, gồm chặn màn chưa mở khóa.
- UI thật, hồ sơ Chrome tạm: nhận 300 Credits → mua Holo Ring giá 300 → còn 0 ở server và IndexedDB; có món hàng và một biên nhận.
- UI thật với lỗi ghi IndexedDB giả lập: hoàn về 300 Credits, không có món hàng, không có biên nhận mua thành công. Lỗi console trong bài thử này là lỗi được chủ động tạo.
- Sau lỗi lưu, nhận thêm quà tháng và lưu độc lập: server và local đều 450 Credits, món mua thất bại vẫn không có, snapshot phục hồi giữ nguyên. Điều này kiểm tra giao dịch lỗi không xuất hiện trở lại ở lần lưu sau.
- Practice khi giả lập mất mạng: vào `playing`, Warp 100 → 100, không gửi yêu cầu ví.
- Chụp chuẩn 1642×799, DPR 2: intro, lance, quake, surge, tether, cataclysm, chết. GLB thật được dùng ở cả High và Medium; không có exception JavaScript. Đã tự mở ảnh tổng hợp để xem bố cục, chữ, lớp hiệu ứng và hình boss.
- Chrome dùng GPU RTX 3050 Ti qua ANGLE/D3D11.
- Đo A/B hai lượt cho mỗi mức: Medium lớp hiệu ứng tăng thời gian CPU vẽ trung bình 0,20 / 0,25 ms; High 0,35 / 0,29 ms. Tổng CPU vẽ trung bình bật đầy đủ 2,42–2,62 ms, p95 3,6–4,0 ms. Frame interval p95 dao động 17,8–22,5 ms trong đợt đo đang chạy kiểm thử nền; đây không phải cam kết 60 FPS trên mọi thiết bị hoặc phép so sánh với một bản release lịch sử.
- Migration `0005`, `0006` đã áp dụng thành công vào database local của bản Play, không xóa dữ liệu.

Ảnh và log tạm: `.visual/codex/`. Ảnh tổng hợp: `acceptance-contact-sheet.jpg`. Cảnh báo shared vocabulary ở Vite riêng là do không phục vụ thư viện của Portal; bản Play cần được kiểm tra lại sau build.

## Giới hạn cần giữ rõ

- Các giai đoạn ví 1–3 vẫn giữ inventory, cấp thuộc tính và kết quả học trong bản lưu phía game. Server kiểm tra giá theo mô tả món/nâng cấp, chưa xác minh quyền sở hữu toàn bộ inventory. Kết quả trận còn do client báo, có trần và kiểm tra thời gian. Không coi đây là hệ thống chống gian lận hoàn chỉnh để thanh toán hoặc xếp hạng có giải thưởng.
- Giá server hiện dùng danh mục đi kèm bản game. Shop đã được Admin chỉnh giá khác danh mục này sẽ bị từ chối với `price-changed`; cần đồng bộ danh mục đã publish lên Worker trước khi dùng giá tùy chỉnh online. Không nhận một giá tùy ý từ client để vượt qua kiểm tra.
- Tách bản lưu trên máy dùng chung theo tài khoản vẫn là công việc riêng trong mục 5 của bàn giao Claude.
- Danh sách thử lại giao dịch thường có giới hạn; biên nhận mua đang chờ và thưởng bài học có nơi giữ riêng. Phục hồi mua cần dữ liệu local của thiết bị; xóa toàn bộ dữ liệu thiết bị là một tình huống khác.
- AI kiểm tra hình ảnh và số đo; mức âm thanh vẫn cần chủ dự án nghe duyệt.

## Kết quả cuối

- Đủ 344 tệp game test, 2.107 kiểm thử qua. Chạy thành hai nhóm không trùng: 155 tệp / 1.294 kiểm thử đã qua, rồi 189 tệp / 813 kiểm thử còn lại với sáu worker. Danh sách tổng hợp ở `.visual/codex/test-batches.json`; log ở `full-tests.log` và `remaining-tests.log`.
- Admin account bridge: 3/3 qua. E2E Worker: 112/112 qua.
- Build chuẩn `pnpm build:space` và `pnpm build:portal` qua; các kiểm tra art/audio/ship/background qua. Sau sửa rollback snapshot cuối, đã chạy lại TypeScript game, Worker và Vite để bản Play chứa đúng source cuối.
- Play qua Portal: iframe đủ 1642×751 trong viewport 1642×799, không có lỗi console/JavaScript.
- Mua hàng trên bundle Play qua nginx: nhận 300 → mua giá 300 → server/local cùng 0, có Holo Ring và receipt. Không có lỗi console/JavaScript.
- Deploy trên bundle Play: vào trận, Warp 100 → 90, một yêu cầu sortie thành công; các debug handle dev không có trong bản build. Lượt bấm ban đầu khi khởi tạo còn chạy chưa vào trận; đã thử lại với điều kiện tài khoản/ví/nút sẵn sàng và xác nhận đúng luồng.
- Đã tự mở ảnh Play để xem: `play-portal.png`, `play-wallet-purchase.png`, `play-combat.png`; ảnh boss ở `acceptance-contact-sheet.jpg`.
- Source chưa commit/push. Không deploy production, không reset bản lưu của chủ dự án. E2E dùng database test riêng; các lượt Play dùng hồ sơ Chrome tạm và tài khoản guest mới, không dùng hồ sơ chơi của chủ dự án. Bản Play local đã được build lại và migration đã áp dụng.

Đợt code và nghiệm thu tự động/hình ảnh đã hoàn tất. Chủ dự án có thể tải lại `https://typing-game.local/space-typing` để xem và nghe. Những giới hạn ở mục trên vẫn còn; đợt tiếp theo nên xử lý bản lưu theo tài khoản trên máy dùng chung và đồng bộ danh mục Admin lên Worker.
