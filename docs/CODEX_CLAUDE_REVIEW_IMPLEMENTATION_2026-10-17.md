# Codex thực hiện 12 bước review của Claude — 17/10/2026

Đầu vào: `CLAUDE_REVIEW_CODEX_2026-10-17.md`, mục 3. Giữ các sửa đổi Claude
đã thực hiện ở mục 2. Đã đọc `VISUAL_TESTING.md`; kiểm tra hình bằng Chrome
Windows/GPU thật, 1642×799, DPR 2, hồ sơ tạm.

## Các thay đổi

| Bước | Kết quả trong source |
|---|---|
| 1 | `openWallet` chỉ nhận seed khi tài khoản được tạo trước `WALLET_SEED_BEFORE`. Tài khoản mới bỏ qua cả seed từ máy lẫn cloud save tải lên trước lần mở ví. Thiếu/sai cutoff thì không nhận seed. Tài khoản cũ ưu tiên cloud save; máy không có cloud save bị giới hạn Stage 20 và gắn cờ `migration-stage`. Trần tiền cũ giữ nguyên. |
| 2 | `/wallet/op` có bộ đếm trong bộ nhớ, tối đa 30 yêu cầu/phút/tài khoản trên mỗi Worker isolate; vượt trả `429 rate-limited`. Client giữ hàng đợi và thử lại cùng opId. Bộ đếm không ghi D1. |
| 3 | Mở ví tự hoàn các pending purchase quá 7 ngày, ghi `refund:auto:<id>`. Admin thấy danh sách và có Refund/Confirm, bắt buộc lý do và idempotency key; audit cùng batch với cập nhật ví. `purchaseInFlight` và `actionBusy` ngăn mở ví phục hồi nhầm giao dịch đang thực hiện/lưu. |
| 4 | Phase 2 áp cùng kiểm tra earn/sortie và trần ngày như phase 3. Khi server thấy mở ví trong phase 0, ví được đánh dấu đối chiếu; lần mở authoritative tiếp theo nhận số dư máy trong trần chuyển dữ liệu, một lần, gắn cờ. Client bỏ hàng đợi/baseline cũ khi nhận `reconciled`. |
| 5 | Cho đối chiếu đúng một màn kế tiếp frontier của server khi cloud save có frontier tương ứng và receipt `:clear` của màn trước. Receipt mới lưu kèm stage; receipt cũ chỉ được dùng nếu khớp sortie server đã mở. Gắn cờ `stage-recovered`. Không mở tùy ý các màn xa. |
| 6 | Audit Admin chỉ ghi khi UPDATE ví thực sự thành công; Portal gửi idempotency key. Refuel gửi/đối chiếu giá và index đã xác nhận, giữ nguyên quote khi thử lại. Giữ start intent đến khi save xác nhận; reload/thử lại dùng đúng ID cũ. Chặn namespace opId sai loại; bỏ phản hồi cũ theo epoch/accountId. Daily Lessons ghi receipt cùng save rồi báo bằng ID cố định theo ngày, kể cả offline qua ngày. Sổ ngày chỉ tiến; archive không ghi đè; thêm chỉ mục ngày; sửa ngân sách hai lần ghi cho mỗi mua hàng. |
| 7 | Boss có tranh/model contract không vẽ thân module hoặc thân hình học tạm khi ảnh/model chưa sẵn sàng, kể cả Low, lỗi hoặc context loss. Bắt đầu màn boss nạp và giải mã sớm tranh. Hào quang/hiệu ứng xuất hiện vẫn hoạt động. |
| 8 | Campaign và đối thủ Duel dùng Medium kể cả Settings High. Title hủy model sau 10 giây không active; Low hủy ngay và quay về ảnh. Rời Duel hủy hai hull, chặn cả tải trễ lẫn preload tiếp nối. Hủy geometry/material/texture/skeleton, đóng ImageBitmap, hủy shadow, PMREM render target và force context loss cho renderer sở hữu riêng; đường tạo lỗi cũng dọn tài nguyên. |
| 9 | Manifest có URL `?v=<10 ký tự SHA-256 của GLB>`. `models:prepare --only` cũng cập nhật hash cho các entry được giữ lại. Đã tạo lại Vanguard và cập nhật cả ba model trong manifest; test đối chiếu hash với byte file thật. |
| 10 | Khói Campaign dùng socket động cơ của model, có tôn trọng ảnh Admin. Manifest lỗi được thử lại sau 30 giây; không tải GLB thô 12,5 MB khi thiếu manifest. Hủy bone texture; tạo lại PMREM khi WebGL phục hồi. Giới hạn phát sáng 1,6 lần. Đọc query một lần cho Campaign; dùng lại bộ điểm/mảng socket mỗi khung. Thêm kiểm tra socket/generation/tier/boss fallback và Intro/Hit/Death. |
| 11 | Lưu voiceURI và ưu tiên ở phiên sau; lần chọn đầu đợi ổn định 300 ms hoặc sự kiện thứ hai. Lỗi backend bỏ ghim, canceled/interrupted giữ giọng. Tìm voice trước khi vào audio-output gate để không giữ mic trong lúc đợi. Warmup khi mở game/lần bấm đầu; chỉ báo thiếu voice một lần khi người chơi yêu cầu đọc. “Already playing” không tắt mic. |
| 12 | Long Word chọn 24 từ dài nhất phân biệt, vẫn giữ bản sao làm trọng số Recall; hết nhóm dùng từ chưa gặp theo độ dài. Boss weak-point/rapid-rage giữ nhóm độ dài riêng, có cache; không rơi vào từ sai độ dài khi cạn. Lọc chưa dùng trước admitCandidate ở quét toàn nguồn. Công tắc unlock local chỉ hiệu lực DEV và ẩn trong Settings production; Admin publish vẫn có quyền. Dọn preview khi lỗi bắt đầu/về title; có nhãn Preview thường trực, không che Stage HUD. |

## Chính sách và migration

- Config local hiện đặt cutoff **2026-10-17T00:00:00.000Z**. Khi triển khai production,
  đặt một lần theo thời điểm bật ví; không đẩy cutoff về sau ở mỗi lần deploy.
- `0007_wallet_reconciliation.sql` là migration cộng dồn: thêm
  `wallets.reconcile_required` và chỉ mục `wallet_days(day)`. Không tạo lại bảng,
  không reset hoặc xóa save. Đã áp dụng local cho Play; không chạy remote.
- Đối chiếu rollback chỉ áp cho ví đã được server đánh dấu trong phase 0.
  Tài khoản chưa từng có ví vẫn theo chính sách seed ở bước 1.
- Rate limit trong bộ nhớ là giới hạn theo isolate, theo đề xuất của Claude;
  không phải hạn mức bền vững dùng chung giữa mọi instance trên production.
- Hoàn tiền 7 ngày/Admin là xử lý debit treo. Inventory vẫn ở save client như
  thiết kế hiện tại; Confirm của Admin cần đối chiếu việc nhận vật phẩm.

## Kiểm tra và bằng chứng

- `account:check`, TypeScript game/Duel đã đạt ở các mốc kiểm tra liên quan.
- Nhóm ví đạt 58 test trước khi thêm ca accountId; nhóm voice/từ/boss liên quan
  đạt 100 test; 38 test mới/được mở rộng cho model, boss và wallet đều đạt.
  Kết quả tổng thể cuối xem nhật ký dưới đây, không cộng chồng các nhóm test.
- Account E2E **112/112** trên Worker **3026**, SQLite lưu riêng tại
  `.visual/codex-review/account-state`; không chạy E2E vào Worker Play 3016.
- HTTP rate E2E: 30 yêu cầu thành công, yêu cầu 31 bị 429, số dư vẫn là 30.
- HTTP support E2E trên 3026: xem pending, Confirm, Refund và thử lại cùng
  idempotency key đều đúng. Hai ảnh Admin cuối dùng dữ liệu mẫu và `writes: 0`;
  đã tự xem danh sách/lý do/hộp thoại, không gửi hỗ trợ vào ví thật.
- Test SQLite dùng `node:sqlite :memory:`, không dùng save của chủ dự án.
- Ảnh/log/JSON ở `.visual/codex-review/`: `boss-high`, `boss-medium`,
  `boss-low-switch`, `campaign-high`, `preview`, `preview-fail`, `preview-back`,
  `duel-high`. Đã tự mở ảnh boss High/Medium và Preview; phát hiện nhãn che
  Stage HUD ở lượt đầu và đã sửa bố cục trước build cuối.
- Duel được kiểm tra bằng renderer thật cho hai vai, không phải trận multiplayer online.

## Bộ nhớ Vanguard, trước/sau

Chrome thật, hồ sơ mới mỗi lượt; đo `performance.memory` khi mở game,
tải hai Vanguard (self/rival, Settings High), rồi dispose cả hai.

| JS heap đang dùng (MiB) | Trước sửa | Sau sửa |
|---|---:|---:|
| Trước tải hai model | 28,07 | 28,98 |
| Sau tải | 45,74 | 50,28 |
| Sau dispose/chờ 1 giây | 45,36 | 50,40 |

Không ép GC; bộ đệm tải model và chương trình vẫn do trình duyệt thu gom.
Số này **không chứng minh JS heap giảm**, cũng không phải số đo VRAM.
Ảnh/log ở `memory-before.*`, `memory-after.*`.

Byte/texture kiểm tra trực tiếp: trước cả self/rival dùng bốn texture 2048²;
sau self vẫn High, rival dùng bốn texture 1024². Với RGBA8 chưa tính mipmap,
phần texture của hull nhỏ giảm ước tính **64 → 16 MiB**; Campaign áp cùng Medium.
Đây là ước tính từ kích thước ảnh decode, không bao gồm render target/shadow.
Test lifecycle xác nhận bitmap dùng chung chỉ đóng một lần và bone texture được dispose.

Kiểm tra GPU thật bổ sung (`.visual/codex-review/gpu-dispose.js`): self có
1 geometry/6 texture (bao gồm môi trường), rival 1 geometry/4 texture.
Sau `dispose`: cả hai **0 geometry, 0 texture**, `isContextLost() === true`;
**8/8 ImageBitmap** của hai model đã gọi close. Console và exception rỗng.

## Bản Play đã kiểm tra

- Game build `assets/game-DOm4thT2.js`; Portal `assets/index-3m4ror0t.js`.
- Title High; Settings Medium → Low → High: Medium/High đúng URL có hash;
  Low không còn canvas hull và ảnh 2D hiện lại.
- Deploy thật Stage 001: Warp **100 → 90**, không có dev handle.
- Admin publish mở Stage 1000: Preview có nhãn dưới HUD, Warp **100 → 100**,
  frontier **1 → 1**. Backend trả accountId, xác nhận code ví mới đang chạy local.
- Rời title quá 10 giây: hull cũ bị hủy; về title tải lại High. Preview được xóa,
  Deploy trở lại Stage 001 và nhãn Preview ẩn.
- Fixture TTS trên **bundle Play thật**, qua Start Recall và Replay: backend chỉ
  có voice OS lúc đầu, voice URI đã lưu tới trễ 700 ms tính từ lần dò đầu;
  cả hai lượt chọn `review-cloud`, không tự đổi sang voice OS.
  Đây là kiểm tra chọn voice bằng dữ liệu kiểm soát, không phải nghe âm thanh.
- Đã tự xem ảnh Play, Duel, Admin và ba ảnh crop boss/động cơ/Preview. Nhãn
  không che Stage HUD; thân tàu đặc, lửa bám hai động cơ, không có khung ảnh lửa.
- Các ảnh nghiệm thu cuối có `logs: []`, `exceptions: []`. Ảnh/lượt debug
  fixture cũ không phải kết quả nghiệm thu.

## Nhật ký nghiệm thu cuối

- **352 tệp / 2.167 test đạt, 0 lỗi.** Lượt đầu phát hiện Long Word làm mất
  trọng số Recall; đã sửa và kiểm tra lại. Với source cuối cố định, 154 tệp đạt
  ở lượt bốn luồng, 198 tệp còn lại đạt ở lượt 12 luồng; script đối chiếu **đúng
  toàn bộ tập đường dẫn 352 tệp**, không chỉ cộng số lượng. Bằng chứng:
  `.visual/codex-review/all-tests-verified.json`, `test-checkpoint.json`,
  `remaining-results.json`, `all-tests-final.log`. Không dùng log lượt cũ
  `all-tests.log` để kết luận source cuối.
- **3/3 Admin bridge tests** đạt (`admin-bridge.log`).
- **66 test hồi quy cuối** và **15 voice tests** đạt; các nhóm này giao nhau
  với bộ đầy đủ, không cộng chồng để tăng số test.
- TypeScript game, Duel server, Worker đạt. `pnpm build:space` và
  `pnpm build:portal` đạt; đã kiểm tra đúng hai bundle nêu trên qua Play.
- **112/112 account E2E** và hai kiểm tra HTTP riêng cho rate limit/support
  đạt trên Worker/DB riêng 3026.
- Migration **0007** đã áp dụng vào DB **local** của Play; không chạy migration
  remote. Đã xem ảnh/crop và kiểm tra Play sau build, không reset save của chủ dự án.
- Kết quả Play/fixture cuối đều không có console warning/error hay page exception.
- Chưa commit, push hoặc deploy production. Source các bước review đã hoàn tất;
  các việc dài hạn (inventory/nguồn thu nhập server tin cậy, limit dùng chung
  giữa các isolate, triển khai production) vẫn là phần roadmap riêng.
