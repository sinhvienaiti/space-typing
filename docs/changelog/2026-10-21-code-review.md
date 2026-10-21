# Review mã nguồn Space Typing (21/10/2026)

> **Dành cho:** chủ dự án và AI làm tiếp.
> **Cách làm:** 14 agent rà soát 14 vùng code. Mỗi phát hiện được một agent khác đọc lại code để bác bỏ. Sau đó gộp theo nguyên nhân gốc và xếp hạng.
> **Kết quả:** 185 phát hiện, 173 xác nhận, 10 có khả năng (plausible), 2 bị bác. Gộp lại còn **85 vấn đề**.
> **Mã nguồn tại:** commit `f19a4ebf` (nhánh `feat/space-typing-2026-10-18`). Báo cáo không sửa code; các bản sửa ghi trong `docs/changelog/README.md`, trỏ tới số mục ở đây.

## 1. Tóm tắt

Tổng hợp cuối cho Space Typing. Đầu vào là 185 finding từ 14 scope và 6 finding của critic. Verifier bác 2 finding; 10 finding chỉ ở mức plausible. Sau khi gộp theo nguyên nhân gốc còn 85 mục: 1 critical, 17 high, 56 medium và 11 nhóm low.

Bốn rủi ro lớn nhất:
(1) Backend online chưa sẵn sàng để launch. Một người chơi tạo được hàng nghìn trận Duel song song. Vài script đủ làm cạn hạn mức ghi hoặc lấp đầy D1. Ví server chưa lưu quyền sở hữu, nên refund vẫn giữ được hàng, và kênh 'earn' cho client tự in tiền.
(2) Nhiều luồng đổi state rồi mới commit mà không rollback. Hậu quả: mất thưởng stage, khóa mua hàng kẹt, Deploy thất bại để lại màn hình trống, và cloud sync hay tab chỉ đọc có thể ghi đè save.
(3) Thiếu error boundary. Chỉ một exception là vòng lặp frame của Campaign 2D và Defense dừng hẳn. Defense không boot được khi thiếu GLB core/gate. Không có telemetry nên mọi lỗi này đều im lặng.
(4) Nguồn sự thật bị chép tay ở nhiều nơi và đã lệch nhau: sát thương boss ở 13 chỗ, reset theo stage, bộ lọc phím, chuẩn hóa văn bản, bootstrap của Defense và Campaign 3D, Admin 'SUPPORTED NOW', giá ví.

Hai god file Game.ts (14,2k dòng) và main.ts (12,4k dòng), cùng hai script entry 3D mới, chặn việc mở rộng. Test so chuỗi mã nguồn còn cản việc tách các file này.

Lộ trình 5 pha:
1. Sửa khẩn cấp các lỗi người chơi gặp ngay, và đóng các cổng chặn trước khi mở Duel/Cloud.
2. Quick win cỡ S.
3. Hiệu năng: boot, save, GPU, âm thanh, voice.
4. Refactor dần qua facade và test replay, không viết lại một lần.
5. Lưới an toàn: CI trên mọi nhánh, lint và ranh giới import, test hành vi, telemetry, ngân sách bundle và hiệu năng.

## 2. Số đo

Đầu vào gồm 185 finding từ 14 scope (game-a 14, game-b 13, main-a 12, main-b 12, architecture 11, duel 15, cloud 15, state 13, security-sweep 12, input 13, render2d 11, render3d 15, audio 15, tooling 14), cộng 6 finding của completeness critic chưa qua verifier (đã spot-check source).

Verdict:
- 173 confirmed, 10 plausible, 2 refuted (main-a loader vocabulary và state auxiliary crash-recovery; cả hai đã bị loại).
- Mức sau verify: 1 critical, 17 high, 92 medium, 73 low.

Kết quả gộp: 3 bản tổng hợp nhóm (31 + 33 + 45 = 109 mục) gộp theo nguyên nhân gốc còn 85 mục:
- 1 critical, 17 high, 56 medium, 11 mục low (đã gom nhóm).
- Các gộp liên nhóm: vòng lặp frame (Game.ts + Defense); Admin 'SUPPORTED NOW'; boot TLA + Storage patch + no-store; Test Lab + bundle 1,7 MB; hardening production; save phình + save 5 s; versioning save; lint; test so chuỗi; dependency; bàn phím; script entry god file; WebGL context; reflow.

Số đo code (HEAD f19a4ebf):
- Kích thước: Game.ts 14.232 dòng (khoảng 230 field, 380 method, 128 import, 84 hooks.*, 13 chỗ trừ HP boss, 46–47 nhánh characterId). main.ts 12.435 dòng (0 export, 125 biến let, 220 import, hooks 984 dòng, onStageClear 637 dòng). defense/main.ts 2.015, campaign3d/main.ts 1.862. Duel: battle-ui 3.025, engine 2.812, authority 2.309. Sfx.ts 1.486, MusicController.ts 1.441.
- Đồ thị: 488 file TS (172k dòng), 0 runtime cycle, 15 module domain import src/admin, 8 runtime-policy dùng TLA (6 chạy nối tiếp trong dist, tối đa khoảng 9 s).
- Bundle: game.js 1.700.596 B (khoảng 500 KB gzip), CSS 361 KB, dist 681 MB; 360/378 URL GLB không có trong Git.
- Chất lượng: tsc sạch; noUnused* ra 28–32 lỗi; 103 export không được tham chiếu; 2.307 test pass trong khoảng 14,5 s; 0 test import main.ts hay ws-server.ts; src/defense chỉ có 1 file test; nhánh hiện tại hơn main 971 commit và chưa chạy CI.
- Online (probe): 1.200 trận Duel tốn 21,9 ms mỗi tick; snapshot Duel khoảng 84 KB/s mỗi người; trong khoảng 40 route Cloud chỉ /wallet/op có limiter; save tổng hợp 229 KB / 599 KB / 1,89 MB ở stage 100 / 300 / 1000; kênh earn ở stage 1 cho 8.247 Cr, 35 SC, 3 QC mỗi ngày.
- Hiệu năng: bộ lọc Voice 2,5–10 ms mỗi lần spawn; crowd Defense upload khoảng 295 KB mỗi frame; PCM nhạc Defense khoảng 44 MiB; engine Defense chỉ 0,03–0,06 ms mỗi bước ở 640 quái (nút cổ chai là render và DOM).
- Bảo mật: 0/8 trang có CSP; pnpm audit báo 10 advisory, đều dev-only (2 critical, 4 high).

## 3. Điểm mạnh nên giữ

Type và cấu trúc:
- TypeScript strict với noUncheckedIndexedAccess, sạch trên app, server và cloud.
- Không có any hay ts-ignore; 0 runtime import cycle; dependency production tối thiểu và không có lỗ hổng đã biết.
- Bộ 2.307 test tất định và nhanh.

Luật thuần, test được:
- Có sẵn nhiều module nhỏ: boss/model, skills/engine, status/engine, stage-clear-gate, defense/rules (bước cố định, RNG inject được, 640 quái chỉ tốn vài phần trăm ms), luật kinh tế và liveops dùng chung giữa client và Worker.
- Engine Duel authoritative có tính tất định, và parser protocol chặt.

Hiệu năng có ý thức:
- Crowd Defense dùng instancing (khoảng một chục draw call cho 400 quái); FX và particle dùng pool.
- Có LRU text-width, trần particle, sprite glow thay shadowBlur, adaptive render budget.
- shared-renderer cho Campaign 2D; DuelShip3D.warm là mẫu prewarm tốt.

Bảo mật client và server:
- Mọi SQL đều tham số hóa; CSRF chặn bằng header và không mở CORS.
- Token phiên 32 byte, server chỉ lưu SHA-256, cookie HttpOnly.
- PBKDF2 cộng HMAC có pepper; OAuth có PKCE và attempt dùng một lần.
- postMessage luôn kiểm cả source lẫn origin; text không tin cậy đi qua textContent.
- Token Duel dùng HMAC so sánh timingSafeEqual.

Lưu trữ và kinh tế có nền tốt:
- IndexedDB durability strict, Web Lock một writer với fence.
- Mua hàng pay-first có receipt; opId idempotent; audit admin.
- Route, rest hub và hidden encounter có snapshot và rollback; settings theo mô hình draft/commit.

Voice và input:
- VoiceAdapter kiểm origin, session và epoch, và mỗi detection được resolve đúng một lần.
- scene3d/keys.ts mô tả đúng hai cách bộ gõ tiếng Việt chạm tới trang.

Âm thanh:
- Fail-soft nhất quán (Web Audio → HTMLAudio → synth); MusicController có token request và crossfade equal-power.
- Credit và Duel lập lịch theo audio clock.

Tooling:
- Build kiểm toàn vẹn asset.
- CI có audit hợp đồng Admin và smoke test R01 trên trình duyệt thật.
- Ma trận capability của Admin là tài liệu kiến trúc tốt; Test Lab là seam tất định cho test cấp Game.

## 4. Nhóm vấn đề

### Backend online chưa sẵn sàng để launch (Duel + Cloud)

Chưa có rate limit, quota hay entitlement ở server, và server Duel không quản lý vòng đời trận. Đây là cổng chặn trước khi mở online.

Gồm: Duel: vòng đời trận không được quản lý (START_MATCH nhân bản trận, trận cũ không được giải phóng, khách bị treo); Cloud: API ghi và guest đăng nhập lại không có rate limit, cạn 100.000 dòng ghi D1 mỗi ngày; Cloud: save tối đa 1,9 MB, backup cưỡng bức, không có quota cho guest; vài script đủ lấp đầy D1 500 MB; Ví server không lưu quyền sở hữu: refund vẫn giữ hàng, chat nhận cosmetic chưa mua, rollback phase cho client tự đặt số dư; Kênh 'earn' chung cho client tự in tiền (cả Star Crystal và Quantum Core) tới trần ngày mà không cần chơi; Daily Hub cấp lại toàn bộ hạn mức ở mỗi report: spam /liveops/progress hoàn thành mọi nhiệm vụ trong vài giây; Khóa đăng nhập kiểu check-then-write, chỉ đếm theo email, ai biết email cũng khóa được tài khoản người khác; Kick thành viên nhóm chat vô tác dụng: mã mời cố định, mọi thành viên đều thấy, không có danh sách chặn; Chat World chống spam theo từng socket, một tài khoản mở không giới hạn socket; presence O(N) mỗi lần connect; Server Duel thiếu phòng vệ transport: frame rác không bị đếm, không giới hạn kết nối, một exception làm sập cả process; Duel chưa có nguồn phát token cho production; danh tính Ranked do cookie dev tự tạo; Duel: kết nối lại bị từ chối khi socket cũ half-open; người chơi bị đá khỏi trận, Ranked bị xử thua; Duel: dự đoán phía client bị ghi đè ở mọi update 20 Hz mà không replay input chưa xác nhận; D1 thiếu index: cron hằng ngày scan cả bảng; mỗi session bị xóa scan oauth_attempts; Cloud (low): cổng /internal/admin chỉ dựa vào token tĩnh; register race, xóa tài khoản sót dữ liệu, tên cho phép ký tự bidi; Duel (low): Ranked chưa có anti-cheat theo nhịp phím, mật khẩu phòng dò được, map ID chép tay 5 chỗ

### Đổi state trước, commit sau: mất tiến độ và tiền

Nhiều luồng đổi biến global hoặc trừ tiền trước bước có thể thất bại, mà không rollback; thêm vào đó là race giữa tab, cloud và IndexedDB.

Gồm: onStageClear đặt cờ settled trước khi commit và không có catch; claim mission bỏ qua blocker và không rollback; Mỗi lần load, kể cả ở tab chỉ đọc, đều ghi đè save chuẩn bằng sanitizer của build đang chạy; Khóa mua hàng bị chia giữa payFirst và finishWalletPurchase; 4 chuỗi .then không có catch; Cloud sync khởi động trước khi save cục bộ được nạp, có thể ghi đè tiến độ của thiết bị khác (plausible); WalletSync coi 401 'signed-out' là từ chối vĩnh viễn và bỏ thu nhập trong hàng đợi; Deploy thất bại để lại title bị ẩn và nhạc chiến đấu; startStage() có thể không chạy sau khi đã trừ Warp; Cờ busy/guard chép tay với tập con khác nhau; nhiều điểm vào thiếu chống chạy lặp; Trạng thái người chơi là ~20 biến global; danh sách field chép tay ở 6–9 chỗ và phần aux đã lệch; Versioning save: migration 27 nhánh chép tay, factory 24 tham số vị trí, validation backup lệch (bỏ sót v21, v26, v27)

### Thiếu error boundary và fallback

Một exception hoặc một asset lỗi là đủ dừng cả chế độ chơi, và không có telemetry nên các lỗi này đều im lặng.

Gồm: Vòng lặp frame dừng vĩnh viễn khi gặp một exception (Game.ts và Rift Defense); Rift Defense không có fallback khi thiếu GLB: core/gate lỗi là không boot được, boss có thể vô hình; localStorage không được bảo vệ: trắng màn hình khi storage bị chặn; settings và từ vựng áp dở dang khi ghi lỗi; Không có telemetry lỗi hay hiệu năng phía client: mọi lỗi im lặng không để lại dấu vết; Asset tách đôi: manifest được track liệt kê 360 GLB không có trong Git; 324 MiB media chưa ignore; dist không tái lập được

### Nguồn sự thật bị chép tay và đã lệch

Cùng một luật được viết lại ở nhiều nơi, và các bản đã khác nhau. Mỗi bản sửa phải lặp lại, nên lỗi cân bằng và lỗi hành vi nhân lên.

Gồm: Sát thương boss chép ở 13 chỗ với luật lệch nhau (shield, parts, Mark, Exposed); công thức cooldown boss chép 4 lần; Thứ tự hạ boss sai: HUD 0 HP hiện lại sau khi hạ boss; từ cuối hạ bằng sát thương phím bị ghi là interrupted; State theo stage reset bằng danh sách viết tay đã lệch: hiệu ứng skill đóng băng trên title, hidden encounter dùng context của stage trước; Bàn phím: Campaign 2D không lọc Ctrl/Cmd, phím giữ, ô nhập và IME; bốn handler và ba engine chọn mục tiêu lệch nhau; Không có dạng gõ chuẩn: khoảng 8 bộ chuẩn hóa lệch nhau, chữ có dấu bị xóa, từ vựng tùy chỉnh tạo quái không thể hạ; Bootstrap của Defense và Campaign 3D là bản chép đã lệch: âm lượng mặc định, nguồn từ vựng, learning event; Admin báo 'SUPPORTED NOW' cho Skill/Equipment/Ship/dịch vụ shop nhưng game không đọc; validator viết hai lần, revision bị từ chối không có tín hiệu; Ví server chỉ tính giá theo BUNDLED_SHOP_POLICY: đổi giá là mua hàng từ shop đã tạo bị 409 vĩnh viễn; Snapshot stage-policy của Expedition là biến global dùng một lần, bị lookup stage bất kỳ tiêu thụ; Hành vi nhân vật viết bằng chuỗi if/ternary (46–47 nhánh) ở Game.ts, main.ts và test-lab, không kiểm exhaustive; Số liệu skill hard-code trong Game.ts, tooltip lặp lại số; thêm skill hay enemy phải sửa rải rác; 5 loại bonus target là state machine chép song song; khối phím đúng chép 8 lần, label từ chép 6 lần; Code chết và helper chép (low): 3 mô hình crash-recovery, 4 bản EnemyKind, route-events.ts, glow sprite và validator chép, VFX nguyên khối

### God file chặn mở rộng

Game.ts, main.ts, hai script entry 3D, các file Duel và engine âm thanh đều quá lớn và có side effect khi import, nên mọi feature dồn vào cùng chỗ và không unit-test được.

Gồm: Game.ts là god class 14.232 dòng, gồm cả ~3.400 dòng renderer Canvas trộn với luật gameplay; Script entry là god file không test được: main.ts 12.435 dòng, defense/main.ts và campaign3d/main.ts ~2.000 dòng; Duel: file quá lớn và tầng transport không test được (battle-ui 3.025, engine 2.812, authority 2.309 dòng; ws-server có side effect); Hai engine âm thanh 60+ method và ba stack song song, không có master bus hay lifecycle chung; Gameplay vẫn chạy khi pause (updateEffects); simulation đọc đồng hồ và socket do draw() ghi; Game.ts và input (low): destroy() rò boss relief, tạo Enemy chép 3 lần, reward clear-normal bỏ qua kế toán, hook đồng bộ, voice ownership chỉ sống trong test

### Khởi động và tải nặng; bề mặt dev lọt vào production

Boot phải chờ 6 fetch nối tiếp, entry nặng 1,7 MB, và save phình theo thời gian chơi. Trong khi đó công cụ QA, file riêng tư và handle cheat vẫn đi theo bản build.

Gồm: Boot chờ chuỗi top-level await runtime policy chạy nối tiếp, domain import src/admin, patch Storage.prototype toàn cục; Test Lab và QA override có trong bản production, chạm được Daily Expedition; entry game 1,7 MB nạp sẵn Duel; Build chép public/local-assets (lời announcer DotA, nhạc riêng) vào dist; runtime luôn thử /local-assets trước; Save phình (tới 6 bản RunPersistentState, shop instance không được dọn) và save đồng bộ đầy đủ mỗi 5 s combat; Bản build production chưa harden: không có CSP/frame-ancestors, admin-preview được deploy, handle __defense/__campaign3d, PARENT_ORIGIN cứng (low)

### Mượt mà khi chơi: GPU, render, voice và mạng

Các chi phí cố định và rò rỉ mỗi frame đi ngược mục tiêu FPS cao và 300–400 quái trong Defense.

Gồm: Đổi map và chơi lại Defense rò bộ nhớ GPU; bốn cách dispose khác nhau; loader rò khi thoát sớm; Defense không xử lý resize: canvas giữ kích thước lúc tải và bị kéo giãn; Bầu trời skyOnly của Defense vẫn tải, cập nhật và vẽ mọi lớp mây ở alpha 0; Boss, tháp và boss Campaign 3D compile shader và upload texture ở frame đầu xuất hiện (không prewarm); Buffer instanced và particle upload lại toàn bộ capacity mỗi frame; Nhiều WebGL context riêng trái quy tắc shared renderer (DuelShip3D mỗi hull một context, result-fx MSAA); Nền 2D legacy đắt (filter và shadowBlur mỗi frame, tải thêm ~4 MB), ~2.100 dòng chết, BGV lỗi thì hiện nền world cũ; Half-rate của BGV không chạy ở chế độ 'blit' mặc định: ngân sách Low và một bước adaptive vô tác dụng; Voice mode dừng simulation 2D mỗi khi mục tiêu xuất hiện, vì danh sách chỉ được gửi theo poll 50 ms; Bộ lọc từ Voice/Hybrid chuẩn hóa lại mọi cặp, tốn 2,5–10 ms mỗi lần spawn; Duel gửi nguyên snapshot ~4 KB cho mỗi người mỗi 50 ms (~84 KB/s), không kiểm soát backpressure; Chốt kết quả Ranked ghi đồng bộ toàn bộ file JSON pretty-print nhiều lần ngay trong vòng tick; Cập nhật skill definitions giữa stage xóa cooldown, charge và giới hạn mỗi stage (plausible); Rift Defense: Backspace/Delete bán tháp ngay, UniKey/EVKey gửi Backspace giả; phím tắt bỏ qua Ctrl/Cmd và phím giữ; Render (low): DPR tàu 3D, rác và particle mỗi frame, shadowBlur, ảnh không giải phóng, setTimeout gameplay, cấp phát ở Defense, vẽ nền đất; DOM (low): restart animation ép reflow (HUD, 3D, chat, hud-fire), menu dựng lại dialog đang đóng, render gây autosave

### Âm thanh: lifecycle và mix

Không có lifecycle chung để suspend, resume hay phục hồi; nhạc 3D có race; SFX mẫu đi qua HTMLAudio. Âm thanh là yêu cầu chất lượng mà chủ dự án nhấn mạnh.

Gồm: Mất focus hoặc ẩn tab không dừng combat và âm thanh (2D Typing, Defense, Campaign 3D); SceneAudio.playMusic: request cũ thắng race (nhạc chạy ở menu sau khi thoát) và giải mã cả bài thành PCM giữ mãi (~46 MB); Sfx.noise tạo buffer theo lần gọi đầu: lớp noise dài bị cắt ở 0,35 s và attack bị bỏ qua; Không phục hồi AudioContext sau khi bị suspend hoặc interrupted: nhạc có thể im tới khi reload (plausible); SFX mẫu chạy trên 117 HTMLAudio: iOS bỏ qua volume, phát trễ và cắt nhau (plausible); Âm thanh (low): crossfade vẫn kêu khi pause, churn node, setTimeout nối âm, tạo buffer giữa combat, resolver nhạc trùng, thiếu test lifecycle

### Lưới an toàn: CI, test, lint, dependency

CI chưa chạy trên nhánh đang làm, test so chuỗi mã nguồn, không có lint, rule ranh giới hay cổng hiệu năng. Thiếu những thứ này thì refactor sẽ rủi ro.

Gồm: CI chưa từng chạy trên nhánh đang làm (971 commit); pipeline yếu: lockfile không frozen, tsc chạy cuối, action cũ; Test đọc file của repo cha (../../../shared/vocabulary): chắc chắn ENOENT trên CI; Code Worker không được type-check hay test tích hợp trong CI; các cổng bảo mật không có test tự động; Test gắn với văn bản mã nguồn và field private, cản refactor; luồng launch, mua hàng và settings không có test hành vi; Không có linter, formatter hay rule ranh giới import; bật noUnused* ra 28–32 lỗi, có cái là lỗi hành vi; Không có cổng hiệu năng tự động cho mục tiêu Defense 300–400 quái và Campaign FPS cao; Dependency có CVE ở toolchain dev (2 critical, 4 high), three.js ghim r170, hai bản sharp, không có bot cập nhật (low); Cloud và state (low): cookie hỏng gây 500, OAuth không log, restore và outbox race, mail không được dọn, milestoneGrants vượt trần, code gift chết; Tooling (low): GLB boss legacy 12,5 MB chết, mirror GitLab force-push --prune, 73 script và pnpm check khác CI

## 5. Lộ trình sửa

### 1. Sửa khẩn cấp

**Mục tiêu:** Chặn các lỗi người chơi gặp ngay (đứng hình, mất tiến độ, mất tháp, không boot được), và đóng các cổng chặn bắt buộc trước khi mở Duel/Cloud.

- Helper runFrameLoop dùng chung (re-arm rAF trước, try/catch, pause khi lỗi) cho Game.ts, Defense và Campaign 3D
- Defense: fallback khi thiếu GLB (try/catch, allSettled), xử lý resize, bỏ bán tháp bằng Backspace và lọc modifier/repeat
- Luồng launch: prepare/commit cho deploySortie, abortLaunch() khôi phục title và nhạc, startStage trả kết quả
- onStageClear: settlement thuần, chỉ đặt token sau khi commit; runWalletPurchase có rollback/refund; claim mission dùng blocker chung
- Sửa thứ tự hạ boss trong typeBoss kèm tests/boss-defeat-flow.test.ts
- safe-storage cho mọi truy cập localStorage và xóa patch Storage.prototype
- Persistence: load bằng readonly; WalletSync giữ hàng đợi khi 401; chỉ start cloud sync sau initializePlayerProgress
- Gate Test Lab sau DEV và lazy import; testForce* từ chối mọi run không phải 'qa'; loại local-assets khỏi dist
- Cổng trước khi launch Duel: chặn START_MATCH khi có trận active, giải phóng trận cũ và trận alternative, ROOM_CLOSED cho khách, takeover khi half-open, try/catch quanh tick và handler
- Cổng trước khi launch Cloud: binding ratelimits hoặc WAF, limiter theo tài khoản cho mọi route ghi, /guest dùng lại session, hạn mức save và dọn guest (sau khi thu nhỏ save)

### 2. Quick win (effort S, giá trị cao)

**Mục tiêu:** Đóng nhiều lỗ hổng và lỗi bằng thay đổi nhỏ, ít rủi ro.

- Cloud: bảng chat_group_bans và đổi mã mời sau kick; bucket bền cho liveops progress; bộ đếm đăng nhập nguyên tử theo (email, IP); thêm index D1
- Expedition: truyền override stage tường minh thay cho snapshot dùng một lần
- SkillEngine.setDefinitions giữ cooldown, charge và usesThisStage
- Âm thanh: Sfx.noise loop và ramp attack; pause khi blur hoặc ẩn tab kèm suspend AudioContext
- Render: addUpdateRange cho buffer instanced; skyOnly không tạo field; stepDown bỏ qua level chỉ khác halfRate
- Voice/Hybrid: tính trước key và trie cho bộ lọc từ
- CI: trigger mọi nhánh, --frozen-lockfile, job typecheck sớm (gồm cloud), fixture thay cho file của repo cha
- Bảo mật nhẹ: gate __defense/__campaign3d, PARENT_ORIGIN từ env, _headers với CSP, thay token trong doc và xoay token
- Dọn dẹp: xóa route-events.ts, crash-recovery chết, GLB legacy; bỏ --prune ở mirror

### 3. Mượt mà và hiệu năng

**Mục tiêu:** Giảm thời gian boot, giật trong combat và rò bộ nhớ, ưu tiên Defense 300–400 quái và Voice.

- runtime-config: một lần Promise.allSettled có deadline thay cho 8 TLA; bỏ /worlds trùng; cờ build khi production chưa có endpoint; cache từ vựng bằng ETag
- Lazy-load Duel, chat, feedback, liveops; ngân sách byte cho entry (≤ 300 KB gzip, siết dần)
- Thu nhỏ save (delta snapshot, dọn shop instance, mirror nhỏ), save ở ranh giới thay vì mỗi 5 s; sau đó mới hạ SAVE_MAX_BYTES
- Defense: dispose thống nhất qua disposeObjectResources, cache template qua các map, prewarm bằng compileAsync, dùng chung một renderer
- Voice: publish mục tiêu theo sự kiện; bỏ gửi lại từ vựng khi revision không đổi
- Âm thanh: SFX mẫu qua AudioBuffer, ensureRunning/statechange, token cho playMusic và stream nhạc
- Nền 2D: fallback nhỏ thay stack legacy, retry BGV có backoff
- Duel: chỉ gửi map một lần, gửi delta hoặc 5–10 Hz, kiểm bufferedAmount; Ranked chuyển sang SQLite WAL
- Nhóm cleanup low về render, DOM và âm thanh, mỗi PR đo trước và sau bằng profiler

### 4. Refactor cấu trúc từng bước (không viết lại một lần)

**Mục tiêu:** Tách god file sau các facade, lấy test replay và test hành vi làm lưới an toàn, mỗi PR một lát mỏng.

- Bước 0: test replay tất định cho Game (seed + chuỗi phím → snapshot GameStats) và fixture JSON cho từng version save
- Game.ts: giữ facade; tách Test Lab API và Duel bridge → StageRuntime → applyBossDamage/nextBossActionCooldown → BonusTargetSystem → CharacterKit (Record<CharacterId>) → SkillBehavior với params → CampaignRenderer đọc CombatView
- main.ts: composition root; tách stage-clear-settlement (thuần), game-hooks, vocabulary-source, settings dạng bảng, expedition; PlayerStateStore với PERSISTENT_KEYS; app-flow state thay các cờ busy
- Defense và Campaign 3D: src/platform (settings, storage, vocabulary, learning, audio-bus) và scene3d/page-shell; tách DefenseController khỏi view; registry presenter thay switch 353 dòng
- Persistence: createPlayerSave nhận object; migration từng bước vN → vN+1; validation backup dạng bảng
- Admin/runtime: defineRuntimePolicy generic, allow-list suy từ registry; quyết định nối hay hạ status từng capability, dùng chung validator TS
- Kinh tế server: entitlement trên server, registry nguồn thu, giá theo configRevision
- Duel: createDuelServer có thể test được, tách MatchLifecycle/RoomService; tách battle-ui
- Âm thanh: AudioEngine mỗi trang với bus và limiter; cue dạng dữ liệu

### 5. Tooling và lưới an toàn

**Mục tiêu:** Làm cho regression bị bắt tự động, và chặn tái phát các lỗi đã thấy.

- pnpm verify (typecheck → lint → test → audit → build) dùng chung cho dev và CI; CI xanh là required check cho main
- Biome hoặc typescript-eslint (no-floating-promises, no-restricted-globals localStorage, no-unsanitized) và bật noUnused*
- dependency-cruiser: không runtime cycle, domain không import admin/features, closure server không chạm DOM; thêm knip
- Test hành vi bằng happy-dom thay cho test so chuỗi; coverage-v8; test kiến trúc cho 'SUPPORTED NOW'
- Test tích hợp Worker (vitest-pool-workers): CSRF, token admin, Origin của chat, kick, putSave
- vitest bench cho engine Defense, Game.update và tick Duel; job nightly defense-perf (p50/p95)
- Telemetry lỗi và frame qua sendBeacon tới Workers Logs
- Kiểm tra manifest asset với file thật; build gói deploy trong CI; gitleaks; Renovate và pnpm audit; nâng sharp, vite, vitest, rồi three từng bước

## 6. Danh sách đầy đủ (xếp theo mức độ)

### Mức Nghiêm trọng (1)

#### 1. Duel: vòng đời trận không được quản lý (START_MATCH nhân bản trận, trận cũ không được giải phóng, khách bị treo)

- **File:** `src/duel/authority.ts:1233`, `src/duel/authority.ts:2283`, `server/duel/ws-server.ts:1015`, `server/duel/alternative-coordinator.ts:129`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (critical); probe đã tái hiện. Phần alternative và phần phòng bị xóa: confirmed (medium). Duel online hiện mới chạy local, nên đây là cổng chặn trước khi launch.
- **Vấn đề:** startMatch chỉ kiểm tra canStart(), không xét trận đang chạy, nên mỗi lần gửi START_MATCH sinh thêm một trận tick 20 Hz. Trận cũ, kể cả trận trước một lần rematch hợp lệ, nằm lại trong Map vĩnh viễn. Reflex không có điều kiện kết thúc. Khi phòng bị xóa, khách không nhận ROOM_CLOSED. Probe: 1.200 trận tốn 21,9 ms mỗi tick và đẩy 4,56 MB vào một socket.
- **Ảnh hưởng:** Một tài khoản spam khoảng 10 giây là làm mọi trận khác giật hoặc treo, có thể gây OOM. Rematch rò bộ nhớ suốt đời process. Khách bị kẹt trong trận mà không có kết quả.
- **Cách sửa:** 1) Từ chối START_MATCH khi đang có trận active; reset cờ ready. 2) Xóa trận cũ khi rematch. 3) Cho Reflex điều kiện kết thúc; release coordinator khi xóa phòng. 4) cleanup() trả danh sách session để ws-server gửi ROOM_CLOSED kèm kết quả. 5) Test cho cả ba đường.
- **Gộp từ:** duel:START_MATCH không chặn trận đang chạy; duel:Trận alternative không bao giờ được giải phóng; duel:Phòng/trận bị xóa âm thầm khi chủ phòng hết thời gian chờ

### Mức Cao (15)

#### 2. Cloud: API ghi và guest đăng nhập lại không có rate limit, cạn 100.000 dòng ghi D1 mỗi ngày

- **File:** `cloud/src/accounts.ts:297`, `cloud/src/db.ts:51`, `cloud/src/worker.ts:177`, `cloud/wrangler.jsonc:1`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (high); security-sweep đánh giá medium. Backend chưa deploy production, nên đây là cổng chặn trước khi launch.
- **Vấn đề:** Chỉ /wallet/op có limiter, và limiter đó nằm trong bộ nhớ của từng isolate. PUT /save, wallet, liveops và social ghi D1 mà không giới hạn. POST /guest với device đã có tạo session mới mỗi lần (5–6 dòng ghi). hitRateLimit tốn một lần ghi ngay cả khi từ chối.
- **Ảnh hưởng:** Khoảng 20.000 request script mỗi ngày đủ chặn save, ví, đăng nhập và Daily Hub của mọi người chơi tới lần reset trong ngày.
- **Cách sửa:** 1) Thêm binding ratelimits hoặc WAF theo IP trước mọi thao tác D1. 2) Đặt limiter theo tài khoản cho mọi route ghi. 3) /guest dùng lại session còn hạn. 4) Peek bộ đếm trước khi ghi. 5) Ghi vào deploy guide rằng lớp này bắt buộc.
- **Gộp từ:** cloud:Cheap unauthenticated requests use up the D1 write quota; security-sweep:Không giới hạn tần suất cho các API ghi dữ liệu

#### 3. Cloud: save tối đa 1,9 MB, backup cưỡng bức, không có quota cho guest; vài script đủ lấp đầy D1 500 MB

- **File:** `cloud/src/saves.ts:16`, `cloud/src/saves.ts:182`, `cloud/src/maintenance.ts:24`, `src/online/session.ts:102`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (high). Verifier sửa con số: cần khoảng 500 guest, tức vài giờ từ nhiều IP.
- **Vấn đề:** PUT /save nhận tới 1,9 MB từ mọi tài khoản, trong khi save thật chỉ 16–90 KB. Mỗi upload force sao chép dòng hiện tại sang bảng backup (giữ 6 bản). Guest được tạo tự động, và maintenance không bao giờ dọn dữ liệu của guest bỏ rơi.
- **Ảnh hưởng:** Khi D1 đầy, mọi lệnh ghi thất bại: cloud save, ví và đăng nhập đều ngừng với tất cả người chơi.
- **Cách sửa:** 1) Hạ SAVE_MAX_BYTES (khoảng 256 KB), nhưng chỉ sau khi đã thu nhỏ save (xem mục save phình). 2) Giới hạn backup cưỡng bức theo thời gian. 3) Rate limit PUT /save. 4) Dọn guest không hoạt động 60–90 ngày. 5) Cảnh báo dung lượng DB.
- **Gộp từ:** cloud:Cloud saves up to 1.9 MB with forced backups and no quota

#### 4. Vòng lặp frame dừng vĩnh viễn khi gặp một exception (Game.ts và Rift Defense)

- **File:** `src/Game.ts:4932`, `src/defense/main.ts:1847`, `src/defense/main.ts:651`, `src/ui/feedback-dialog.ts:55`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (high, Game.ts) + confirmed (medium, Defense); critic xếp Defense ở high
- **Vấn đề:** frame() của cả hai chế độ chỉ gọi lại requestAnimationFrame ở dòng cuối và không có try. Một throw trong update, hook DOM hay draw là canvas đứng hình. Defense còn có non-null assertion trong handle(), và các promise chooseMap/startRun không có catch. Campaign 3D làm đúng: re-arm rAF ngay dòng đầu.
- **Ảnh hưởng:** Canvas đứng trong khi HUD và bàn phím vẫn chạy; người chơi phải reload và mất run.
- **Cách sửa:** Viết helper chung runFrameLoop(step, {onError}): re-arm rAF trước, try/catch riêng cho simulation và draw, chuyển sang pause ở lỗi đầu, dừng simulation sau 3 lỗi liên tiếp, gửi telemetry. Dùng cho Game, Defense, Campaign 3D và các bench. Thêm .catch cho chooseMap/startRun.
- **Gộp từ:** game-a:One exception permanently stops the game loop; render3d:Defense's frame loop dies on any exception; critic:Rift Defense lặp lại đúng lỗi vòng lặp của Game.ts

#### 5. Rift Defense không có fallback khi thiếu GLB: core/gate lỗi là không boot được, boss có thể vô hình

- **File:** `src/defense/view/terrain.ts:338`, `src/defense/main.ts:260`, `src/defense/main.ts:369`, `src/defense/main.ts:505`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (high), đã tái hiện
- **Vấn đề:** loadCore và loadGates await mà không có catch, và prepareMap dùng Promise.all. Hai file GLB này không được track trong Git, nên mọi checkout sạch hay bản preview đều hỏng. Thiếu template thì bossIn() return và boss vô hình.
- **Ảnh hưởng:** Mất cả chế độ Defense sau một lỗi mạng thoáng qua hoặc trên build sạch.
- **Cách sửa:** Bọc các loader trong try/catch, dùng mesh thay thế; prepareMap dùng allSettled; thêm fallback sprite hoặc billboard cho crowd và boss; test với manifest rỗng.
- **Gộp từ:** render3d:Rift Defense has no fallback when a GLB is missing

#### 6. Deploy thất bại để lại title bị ẩn và nhạc chiến đấu; startStage() có thể không chạy sau khi đã trừ Warp

- **File:** `src/main.ts:9484`, `src/main.ts:9535`, `src/main.ts:9543`, `src/Game.ts:3925`, `src/economy/warp-charge.ts:111`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (high) + confirmed (medium), cùng gốc
- **Vấn đề:** Luồng launch ghi autosave, đổi nhạc và chạy animation trước khi gọi deploySortie, bước vẫn thường thất bại (hết Warp, hủy Reserve, server từ chối). Catch chỉ hiện notice, không gỡ th-launching. Theo chiều ngược lại, Game.startStage return im lặng khi voice chưa sẵn sàng, dù Warp đã bị trừ.
- **Ảnh hưởng:** Người chơi hết Warp thấy hangar trống kèm nhạc chiến đấu và phải reload; trường hợp mic rớt thì mất Warp.
- **Cách sửa:** Chạy các bước có thể thất bại trước (prepare/commit); thêm abortLaunch() khôi phục title, nhạc và cờ practice; startStage trả kết quả để caller abandon sortie hoặc hoàn Warp; disable nút Deploy khi thiếu Warp.
- **Gộp từ:** main-b:Failed Deploy after the launch animation leaves the title screen invisible; game-a:startStage() silently does nothing when voice isn't ready

#### 7. Rift Defense: Backspace/Delete bán tháp ngay, UniKey/EVKey gửi Backspace giả; phím tắt bỏ qua Ctrl/Cmd và phím giữ

- **File:** `src/defense/main.ts:1557`, `src/defense/main.ts:1604`, `src/defense/rules/engine.ts:440`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (high)
- **Vấn đề:** Ở pha build, Backspace gọi sell() ngay mà không xác nhận. Ở Telex, bộ gõ gửi Backspace thật khi gặp tổ hợp trùng phím camera (a/s/d/w/e), nên chỉ xoay camera cũng có thể bán tháp. Ctrl+R chạy repair, và giữ Enter thì bỏ qua pha build.
- **Ảnh hưởng:** Người chơi Việt, khán giả chính, mất tháp và năng lượng mà không hiểu vì sao.
- **Cách sửa:** Bỏ qua sự kiện có modifier và event.repeat; bỏ Backspace khỏi phím bán; bán qua hai bước hoặc có undo; dùng helper keyboard-intent chung; throttle banner IME.
- **Gộp từ:** input:Rift Defense: Backspace/Delete instantly sells a tower

#### 8. Defense không xử lý resize: canvas giữ kích thước lúc tải và bị kéo giãn

- **File:** `src/defense/main.ts:132`, `src/scene3d/space.ts:159`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (high)
- **Vấn đề:** SpaceStage.resize() chỉ chạy trong constructor và setQuality(). Trang Defense không có listener resize hay ResizeObserver, trong khi Campaign 3D có.
- **Ảnh hưởng:** Phóng to cửa sổ, vào fullscreen hay xoay máy làm chiến trường méo và mờ.
- **Cách sửa:** SpaceStage tự gắn ResizeObserver cộng matchMedia theo DPR; trước mắt thêm listener resize có debounce trong defense/main.ts.
- **Gộp từ:** render3d:Defense never handles window resize

#### 9. Duel: kết nối lại bị từ chối khi socket cũ half-open; người chơi bị đá khỏi trận, Ranked bị xử thua

- **File:** `src/duel/authority.ts:707`, `src/duel/network-client.ts:703`, `server/duel/ws-server.ts:412`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (high), probe đã tái hiện
- **Vấn đề:** Reconnect chỉ được chấp nhận khi server đã đánh dấu disconnectedAt, mà việc đó phải chờ ping timeout 20 s. Client nhận RECONNECT_EXPIRED rồi HELLO thành một session mới. Session heartbeatStale bị xóa ngay, bỏ qua grace 30 s.
- **Ảnh hưởng:** Một lần rớt mạng vài trăm ms cũng làm mất trận; ở Ranked bị trừ rating.
- **Cách sửa:** Cho takeover khi token và accountId khớp, rồi đóng socket cũ; heartbeatStale chỉ đặt disconnectedAt; test reconnect khi half-open.
- **Gộp từ:** duel:Kết nối lại thất bại khi server chưa phát hiện socket cũ đã chết

#### 10. Duel: dự đoán phía client bị ghi đè ở mọi update 20 Hz mà không replay input chưa xác nhận

- **File:** `src/duel/network-client.ts:727`, `src/duel/battle-ui.ts:2816`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (high), probe đã tái hiện
- **Vấn đề:** reconcile() gán prediction bằng state server ngay cả khi còn sequence chưa được xác nhận, và pendingSequences không lưu intent. Gõ 'las' mà server mới xác nhận 1 ký tự thì chữ lùi về 'l', rồi hiệu ứng gõ được bắn lại.
- **Ảnh hưởng:** Chữ đang gõ online nhấp nháy, lùi rồi nhảy lại, ngay ở trải nghiệm cốt lõi.
- **Cách sửa:** Lưu hàng đợi {sequence, intent}; lấy state server làm gốc rồi áp lại các intent chưa xác nhận; đặt key cho typing feedback theo vị trí ký tự; thêm test.
- **Gộp từ:** duel:Dự đoán phía client bị ghi đè ở mọi update 20 Hz

#### 11. Ví server chỉ tính giá theo BUNDLED_SHOP_POLICY: đổi giá là mua hàng từ shop đã tạo bị 409 vĩnh viễn

- **File:** `src/economy/wallet-price.ts:32`, `src/shops/state.ts:340`, `cloud/src/wallet.ts:446`, `cloud/wrangler.jsonc:34`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (high)
- **Vấn đề:** ShopInstance lưu giá vĩnh viễn từ policy lúc tạo, còn Worker (WALLET_PHASE=3) tính lại bằng bảng bundled gắn cứng và trả 'price-changed'. Client không xử lý lỗi này. Manifest A10 vẫn ghi shop prices là 'SUPPORTED NOW'.
- **Ảnh hưởng:** Một lần Admin publish giá hoặc một bản vá cân bằng làm hỏng mọi giao dịch mua liên quan của tất cả người chơi.
- **Cách sửa:** Gắn configRevision vào request mua và để Worker tra giá theo revision đó (hoặc server tự giữ shop instance); trước mắt khóa sửa giá khi phase ≥ 2 và định giá lại khi nhận price-changed; thêm test với giá đã publish.
- **Gộp từ:** state:Server wallet prices only BUNDLED_SHOP_POLICY

#### 12. Admin báo 'SUPPORTED NOW' cho Skill/Equipment/Ship/dịch vụ shop nhưng game không đọc; validator viết hai lần, revision bị từ chối không có tín hiệu

- **File:** `src/admin/skill-runtime-policy.ts:197`, `src/admin/equipment-runtime-policy.ts:172`, `src/admin/a6-skill-equipment-capabilities.ts:37`, `src/admin/ship-runtime-policy.ts:400`, `src/shops/service-prices.ts:22`, `src/main.ts:6813`
- **Loại:** bug · **Công sức:** L · **Xác minh:** confirmed (high) + confirmed (medium) x2; phần Ship và innerHTML: confirmed (low)
- **Vấn đề:** Policy skill và equipment không được module production nào import. Override Ship (text, stat) chỉ dùng cho unlockStage. Giá dịch vụ nằm ở 3 nơi. Validator của Admin server là bản viết lại bằng JS; một mục sai có thể revert cả revision mà không ai biết. renderCharacters gán innerHTML từ activeName, nên XSS tiềm ẩn khi nối override.
- **Ảnh hưởng:** Người vận hành publish cân bằng mà game không đổi gì, và tưởng đã xong. Dev và agent xây trên năng lực không tồn tại.
- **Cách sửa:** Với mỗi capability: nối end-to-end, hoặc hạ xuống REQUIRES CANONICAL MIGRATION và khóa editor. Thêm test kiến trúc: mọi 'SUPPORTED NOW' phải có resolver được production import. Dùng chung validator TS; ghi log và health khi từ chối revision; dùng textContent thay innerHTML.
- **Gộp từ:** architecture:Admin báo 'SUPPORTED NOW' cho chỉnh Skill/Equipment; main-b:Character card builds HTML from strings; Admin ship overrides never reach UI; state:Admin capability manifests mark skill, equipment and shop-service 'SUPPORTED NOW'; state:Admin policy validation is duplicated

#### 13. Boot chờ chuỗi top-level await runtime policy chạy nối tiếp, domain import src/admin, patch Storage.prototype toàn cục

- **File:** `src/admin/stage-runtime-policy.ts:204`, `src/admin/game-testing-policy-bootstrap.ts:57`, `src/characters/state.ts:1`, `src/campaign/stage.ts:1`, `src/vocabulary.ts:454`
- **Loại:** performance · **Công sức:** M · **Xác minh:** confirmed (high) + confirmed (medium) x2 + confirmed (low); critic xác nhận 6 TLA nối tiếp trong dist
- **Vấn đề:** 8 module policy dùng `export const X = await fetch` và 15 module domain import chúng, nên dist chạy 6 TLA nối tiếp (tệ nhất khoảng 9 s), /worlds bị gọi 2 lần, và production nhận 404. 8 file (1.791 dòng) lặp validator và allow-list ID viết tay. game-testing-policy-bootstrap ghi đè Storage.prototype cho cả trang và đọc localStorage ở top-level. JSON từ vựng tải với no-store, và lookup 344 KB không được memoize.
- **Ảnh hưởng:** Mọi lượt tải chậm thêm 0,4–1,5 s trên di động; Defense và Campaign 3D cũng phải chờ; module domain không dùng được trong worker hay tool; thêm một điểm crash khi storage bị chặn.
- **Cách sửa:** 1) Tạo runtime-config với Promise.allSettled và deadline chung; app shell gọi tường minh và truyền config. 2) Viết defineRuntimePolicy generic, lấy allow-list từ registry. 3) Xóa patch prototype, dùng readSettings/writeSettings. 4) Cờ build khi production chưa có endpoint. 5) Tải từ vựng với cache 'no-cache' và memoize.
- **Gộp từ:** architecture:Tầng domain phụ thuộc src/admin và chặn khởi động bằng TLA; architecture:8 runtime-policy gần như giống hệt nhau; state:Boot waits on serialized top-level-await runtime policy fetches; input:Static vocabulary JSON always fetched with no-store; critic:Boot bị chặn bởi chuỗi 6 top-level await; critic:Monkey-patch toàn cục Storage.prototype

#### 14. Đổi map và chơi lại Defense rò bộ nhớ GPU; bốn cách dispose khác nhau; loader rò khi thoát sớm

- **File:** `src/defense/view/crowd.ts:206`, `src/defense/view/terrain.ts:222`, `src/defense/view/towers.ts:147`, `src/render3d/model-sheet.ts:99`, `src/campaign3d/actors.ts:55`
- **Loại:** performance · **Công sức:** M · **Xác minh:** confirmed (high) + confirmed (low)
- **Vấn đề:** Crowd không dispose texture GLTF; Terrain chỉ removeFromParent và tải lại core/gate mỗi map; TowerViews bỏ material clone; bossTemplates giữ texture 2048² của mọi boss. modelTemplate dừng ở candidate lỗi đầu tiên và cache null.
- **Ảnh hưởng:** Duyệt map hoặc chơi lại tích lũy hàng trăm MB VRAM, dẫn tới mất context WebGL hoặc crash tab trên GPU yếu.
- **Cách sửa:** Mọi teardown dùng disposeObjectResources; cache template qua các map; bossTemplates chỉ giữ boss của map hiện tại; dùng try/finally và continue trong loader; test đếm dispose qua hai lần đổi map.
- **Gộp từ:** render3d:Switching maps and restarting runs leaks GPU memory; render3d:Model loaders leak on early exits

#### 15. Game.ts là god class 14.232 dòng, gồm cả ~3.400 dòng renderer Canvas trộn với luật gameplay

- **File:** `src/Game.ts:974`, `src/Game.ts:10829`, `src/Game.ts:13165`
- **Loại:** maintainability · **Công sức:** L · **Xác minh:** confirmed (high) + confirmed (medium)
- **Vấn đề:** Một class khoảng 230 field, 380 method, 128 import, 84 lời gọi hooks; chứa simulation, spawn, boss AI, 11 bộ kỹ năng, voice, Duel bridge, Test Lab API và renderer. File đã gấp 3 lần kể từ review ff1845a. drawEnemy dài ~497 dòng.
- **Ảnh hưởng:** Mọi feature đều sửa chung một file; field dùng chung khiến sửa chỗ này hỏng chỗ khác (xem các mục boss, reset, pause). Renderer không test hay dùng lại được.
- **Cách sửa:** Tách dần sau một facade Game, khởi đầu bằng test replay tất định. Thứ tự: Test Lab/Duel bridge → StageRuntime → SpawnDirector/BonusTargetSystem → CharacterKit/BossDirector → CampaignRenderer đọc một CombatView chỉ đọc. Thêm ngưỡng kích thước trong CI.
- **Gộp từ:** game-a:God class: Game.ts is 14,232 lines; game-b:About 3,400 lines of Canvas rendering live inside Game; architecture:Hai god-file (phần Game.ts)

#### 16. Script entry là god file không test được: main.ts 12.435 dòng, defense/main.ts và campaign3d/main.ts ~2.000 dòng

- **File:** `src/main.ts:4895`, `src/main.ts:5089`, `src/main.ts:11674`, `src/defense/main.ts:546`, `src/campaign3d/main.ts:87`
- **Loại:** maintainability · **Công sức:** L · **Xác minh:** confirmed (high) x3 + confirmed (medium) x3; critic xác nhận phần 3D
- **Vấn đề:** Cả ba file có side effect khi import, 0 export và state global dạng let. main.ts có object hooks dài 984 dòng, onStageClear 637 dòng, 8 bản nạp từ vựng và khoảng 20 listener settings gần giống nhau. handle() của Defense là switch 353 dòng. Hai trang 3D chép helper của nhau, và src/defense chỉ có 1 file test.
- **Ảnh hưởng:** Mọi mode hay màn hình mới đều dồn vào các file này, gây conflict liên tục; logic kinh tế và view 3D không unit-test được; Defense V4 có nguy cơ thành một main.ts thứ hai.
- **Cách sửa:** Đưa mỗi entry về composition root mỏng. Tách controller theo feature nhận context inject: stage-clear-settlement (hàm thuần), game-hooks, vocabulary-source (strategy), settings (bảng), expedition. 3D dùng scene3d/page-shell.ts, tách DefenseController khỏi view, dùng registry presenter. Thêm test khi tách từng phần.
- **Gộp từ:** main-a:main.ts là 'god file' 12.435 dòng; main-b:main.ts is a 12.4k-line entry module; architecture:Hai god-file (phần main.ts); main-b:Core flows are copy-pasted (vocabulary, expedition, settings); render3d:defense/main.ts and campaign3d/main.ts are monolithic; render3d:No tests for 3D view lifecycle; critic:Defense và Campaign 3D lặp lại mô hình god-script

### Mức Trung bình (58)

#### 17. onStageClear đặt cờ settled trước khi commit và không có catch; claim mission bỏ qua blocker và không rollback

- **File:** `src/main.ts:5091`, `src/main.ts:5224`, `src/main.ts:5724`, `src/main.ts:3707`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium) + confirmed (low); trigger QuotaExceeded ở mức plausible
- **Vấn đề:** Hàm gán settledEncounterToken ngay đầu, rồi chạy try/finally không có catch. Một throw giữa chừng, ví dụ saveRecallMemory gọi setItem trần trước bước cộng Credits, làm mất phần thưởng và không thể retry. Claim mission sửa credits rồi mới autosave, không kiểm canWrite hay walletPurchaseBusy và không rollback.
- **Ảnh hưởng:** Người chơi mất Credits, XP hoặc checkpoint của stage vừa clear. Ở tab chỉ đọc, phần thưởng claim hiện ra rồi biến mất sau reload.
- **Cách sửa:** 1) Tính settlement bằng hàm thuần; chỉ gán state và token khi commit thành công; thêm catch để retry. 2) Dời saveRecallMemory ra sau autosave, coi là best-effort, và đặt trần số entry. 3) Viết claimWithRollback dùng chung rewardClaimBlocker.
- **Gộp từ:** main-a:onStageClear không chịu được exception; main-a:Claim mission bỏ qua claim blocker chung

#### 18. Mỗi lần load, kể cả ở tab chỉ đọc, đều ghi đè save chuẩn bằng sanitizer của build đang chạy

- **File:** `src/persistence/player-save.ts:1707`, `src/persistence/account-transactions.ts:98`, `src/items/inventory.ts:40`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium); chỉ xảy ra khi hai tab chạy hai build khác nhau
- **Vấn đề:** loadPlayerSave luôn mở transaction readwrite và put lại kết quả đã sanitize; sanitizer bỏ các id lạ. Tab không giữ lock gọi hàm này mỗi lần nhận BroadcastChannel. Tab chạy build cũ vì thế xóa item mới, còn tab build mới migrate save lên version mà tab writer cũ không đọc được.
- **Ảnh hưởng:** Deploy nội dung mới trong lúc người chơi mở hai tab có thể âm thầm xóa item đã mua, hoặc khóa tab writer.
- **Cách sửa:** 1) Load bằng transaction readonly; chỉ ghi khi giữ writer lock và thật sự cần migrate. 2) Lưu build stamp và từ chối ghi từ build cũ hơn. 3) Sanitizer giữ nguyên id lạ.
- **Gộp từ:** state:Every load, including in read-only tabs, rewrites the canonical save

#### 19. Khóa mua hàng bị chia giữa payFirst và finishWalletPurchase; 4 chuỗi .then không có catch

- **File:** `src/main.ts:1681`, `src/main.ts:1722`, `src/main.ts:7757`, `src/main.ts:8219`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (medium) x2; phần 'Style Shop' bị bác
- **Vấn đề:** payFirst đặt walletPurchaseBusy và chỉ finally của finishWalletPurchase mới nhả khóa. Bốn caller nối .then (apply, render, finish) mà không có catch. Nếu apply hoặc render ném lỗi, khóa kẹt cả phiên; tiền phía server đã trừ và chỉ được hoàn ở lần mở game sau.
- **Ảnh hưởng:** Một lỗi UI nhỏ là khóa shop, claim, Deploy và cloud sync tới khi reload. Người chơi thấy mất tiền mà chưa nhận hàng.
- **Cách sửa:** Viết runWalletPurchase({costs, apply, rollback, rerender}) giữ khóa trong try/catch/finally; lỗi xảy ra sau khi đã trả tiền thì rollback rồi refund. Thêm test: apply ném lỗi thì khóa được nhả và có refund.
- **Gộp từ:** main-a:Khóa mua hàng bị chia đôi giữa payFirst và finishWalletPurchase; main-b:Core flows are copy-pasted (phần wallet purchase)

#### 20. Cloud sync khởi động trước khi save cục bộ được nạp, có thể ghi đè tiến độ của thiết bị khác (plausible)

- **File:** `src/main.ts:12328`, `src/main.ts:12434`, `src/online/cloud-save.ts:111`
- **Loại:** bug · **Công sức:** S · **Xác minh:** plausible (medium): race có thật trong code, thời điểm mạng chưa đo được
- **Vấn đề:** onlineSession.start() chạy song song với initializePlayerProgress(). Khi currentSave() còn null, CloudSave coi đây là thiết bị mới và tự restore. Revision cloud được ghi nhận trước khi restore xong, nên lần upload sau âm thầm ghi đè tiến độ của thiết bị kia.
- **Ảnh hưởng:** Có thể mất tiến độ ở thiết bị khác mà không có cảnh báo, hoặc tab bị chuyển sang chế độ chỉ đọc.
- **Cách sửa:** Chỉ start online, CloudSave và WalletSync sau khi `await initializePlayerProgress()` xong. Callback restore từ chối khi chưa persistenceReady, đang sortie hoặc đang mua. Chỉ ghi nhớ revision sau khi restore thành công.
- **Gộp từ:** main-b:Cloud sync starts before the local save is loaded

#### 21. WalletSync coi 401 'signed-out' là từ chối vĩnh viễn và bỏ thu nhập trong hàng đợi

- **File:** `src/online/wallet-sync.ts:445`, `src/online/wallet-sync.ts:479`, `cloud/src/worker.ts:111`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (medium)
- **Vấn đề:** flush() shift mọi op gặp lỗi 4xx (trừ 429/busy) và đánh dấu op đó là reported. Khi phiên hết hạn hoặc bị thu hồi, cả hàng đợi bị bỏ. Lúc đăng nhập lại, adopt() trừ phần đã bỏ khỏi số dư.
- **Ảnh hưởng:** Người chơi mất thưởng sortie và Daily Lessons mà không thấy lỗi nào.
- **Cách sửa:** Coi 401/403 là lỗi tạm thời: giữ hàng đợi, đánh dấu cần đăng nhập lại, retry sau khi đăng nhập. Chỉ bỏ op nằm trong allow-list lỗi nghiệp vụ. Thêm test cho 401.
- **Gộp từ:** state:WalletSync treats 401 'signed-out' as a permanent refusal

#### 22. Ví server không lưu quyền sở hữu: refund vẫn giữ hàng, chat nhận cosmetic chưa mua, rollback phase cho client tự đặt số dư

- **File:** `cloud/src/wallet.ts:396`, `cloud/src/wallet.ts:474`, `cloud/src/chat-rules.ts:88`, `src/economy/wallet-rules.ts:63`
- **Loại:** security · **Công sức:** L · **Xác minh:** confirmed (medium)
- **Vấn đề:** Hàng đã mua chỉ được ghi trong save do client gửi lên. Client tự quyết định confirm hay refund, và giao dịch pending quá 7 ngày được tự refund. Chat chỉ kiểm look có trong catalogue. Khi resume sau WALLET_PHASE=0, server tin số dư của client tới trần migration.
- **Ảnh hưởng:** Chặn request confirm là có hàng miễn phí; cosmetic premium giả xuất hiện trong chat; một lần rollback vận hành biến thành đợt in tiền.
- **Cách sửa:** 1) Lưu entitlement ở server; từ chối refund khi hàng đã giao. 2) Giao dịch pending hết hạn chuyển sang Admin duyệt. 3) Chat kiểm tra quyền sở hữu. 4) Khi resume: min(client, server + delta đã xác minh).
- **Gộp từ:** cloud:Entitlements live only in the client-written save

#### 23. Kênh 'earn' chung cho client tự in tiền (cả Star Crystal và Quantum Core) tới trần ngày mà không cần chơi

- **File:** `src/online/wallet-sync.ts:406`, `cloud/src/wallet.ts:513`, `src/economy/wallet-rules.ts:97`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (medium, hạ từ high vì không có tiền thật hay leaderboard)
- **Vấn đề:** Mọi chênh lệch dương không giải thích được đi thành op earn, với source do client chọn. Worker chỉ áp trần theo sortie và trần ngày, kèm DAILY_CAP_FLOOR. Ngay ở stage 1, một ngày nhận được 8.247 Cr, 35 SC và 3 QC, trong khi người chơi nặng chỉ được 2.200 Cr.
- **Ảnh hưởng:** Script nhận gấp 3–4 lần thu nhập thật cộng tiền premium, và guest thì miễn phí.
- **Cách sửa:** Tạo registry nguồn thu ở server (mission, dismantle, Expedition có trần riêng). Bucket 'other' chỉ nhận credits với trần nhỏ, không SC/QC. Thêm test Worker.
- **Gộp từ:** state:Generic 'earn' channel lets any client mint currencies

#### 24. Daily Hub cấp lại toàn bộ hạn mức ở mỗi report: spam /liveops/progress hoàn thành mọi nhiệm vụ trong vài giây

- **File:** `cloud/src/liveops-rules.ts:63`, `cloud/src/liveops.ts:194`, `cloud/src/wallet.ts:680`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (medium)
- **Vấn đề:** plausibleProgress cho mỗi report một hạn mức cố định (ALLOWANCE) cộng phần theo thời gian, rồi reset progress_at. Khoảng 20–30 request là đủ mọi mục tiêu ngày và tuần. claimIntoWallet không áp trần thu nhập ngày.
- **Ảnh hưởng:** Bot nhận toàn bộ thưởng Daily Hub mà không cần chơi, và mỗi request spam còn tốn một lần ghi D1.
- **Cách sửa:** Dùng token bucket lưu bền (ngân sách hồi theo thời gian, không reset), hoặc trả 429 khi report cách lần trước dưới 30 s. Test: 20 report liên tiếp không vượt lượng của một report.
- **Gộp từ:** cloud:Daily Hub progress allowance is granted again on every report

#### 25. Khóa đăng nhập kiểu check-then-write, chỉ đếm theo email, ai biết email cũng khóa được tài khoản người khác

- **File:** `cloud/src/accounts.ts:409`, `cloud/src/accounts.ts:468`, `cloud/src/db.ts:55`
- **Loại:** security · **Công sức:** S · **Xác minh:** confirmed (medium) ở cả hai scope
- **Vấn đề:** Bộ đếm chỉ tăng sau khi sai, nên một burst đồng thời có N lần thử. Không có trần theo IP. Khoảng 8 request mỗi 5 phút giữ nạn nhân bị khóa mãi. changePassword và deleteAccount không có giới hạn nào.
- **Ảnh hưởng:** Dò mật khẩu dễ hơn mức thiết kế giả định, và kẻ xấu có thể khóa có chủ đích tài khoản của học sinh hoặc giáo viên.
- **Cách sửa:** Tăng bộ đếm nguyên tử trước khi verify; khóa theo cặp (email, IP) cộng trần theo IP; dùng backoff mũ; xóa khóa sau khi reset mật khẩu; áp cùng bộ đếm cho đổi mật khẩu và xóa tài khoản.
- **Gộp từ:** cloud:Login throttle is check-then-write; security-sweep:Khóa đăng nhập chỉ đếm theo email

#### 26. Kick thành viên nhóm chat vô tác dụng: mã mời cố định, mọi thành viên đều thấy, không có danh sách chặn

- **File:** `cloud/src/social.ts:142`, `cloud/src/social.ts:180`, `cloud/migrations/0001_init.sql:170`
- **Loại:** security · **Công sức:** S · **Xác minh:** confirmed (medium)
- **Vấn đề:** kickFromGroup chỉ xóa dòng thành viên. invite_code không bao giờ đổi và được trả cho mọi thành viên, nên joinGroup cho người bị kick vào lại ngay.
- **Ảnh hưởng:** Kick tạo cảm giác an toàn giả và không xử lý được quấy rối trong nhóm của người chơi nhỏ tuổi.
- **Cách sửa:** Thêm bảng chat_group_bans; joinGroup từ chối tài khoản bị ban; chỉ owner thấy mã mời; tự đổi mã sau mỗi lần kick; test luồng kick rồi rejoin.
- **Gộp từ:** security-sweep:Chủ nhóm 'kick' thành viên không có tác dụng

#### 27. Chat World chống spam theo từng socket, một tài khoản mở không giới hạn socket; presence O(N) mỗi lần connect

- **File:** `cloud/src/chat.ts:157`, `cloud/src/chat.ts:293`, `cloud/src/chat-rules.ts:26`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (medium, hạ từ high)
- **Vấn đề:** Bucket spam và bộ phát hiện tin trùng nằm trong attachment của từng socket. openSocket không đếm số socket của tài khoản, và /chat/connect không có rate limit. Mỗi lần connect hoặc close, server broadcast presence tới cả phòng.
- **Ảnh hưởng:** Một tài khoản đã đăng ký có thể flood kênh World, làm Durable Object tốn CPU và chat giật với mọi người online.
- **Cách sửa:** Tối đa 2–3 socket mỗi tài khoản; bucket theo accountId kèm trần tin mỗi ngày; gộp presence; rate limit /chat/connect; chỉ gửi nonce về socket của người gửi.
- **Gộp từ:** cloud:Chat flood control is per socket; security-sweep:Chat chống spam theo từng socket

#### 28. Server Duel thiếu phòng vệ transport: frame rác không bị đếm, không giới hạn kết nối, một exception làm sập cả process

- **File:** `server/duel/ws-server.ts:531`, `server/duel/ws-server.ts:973`, `src/duel/authority.ts:1564`, `src/duel/engine.ts:1271`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** Frame parse lỗi, kể cả trước HELLO, chỉ nhận lại ERROR mà socket không bị đóng. INTENT sai round bị loại trước bước đếm tốc độ, nên không bị tính. Không giới hạn socket theo IP. message handler và vòng tick không có try/catch, trong khi engine có throw thật.
- **Ảnh hưởng:** Kẻ không có token vẫn làm chậm tick của mọi trận. Một bug hiếm là mọi người chơi online rớt và mất hết phòng.
- **Cách sửa:** Token bucket theo socket và IP cho mọi frame; đóng socket chưa xác thực gửi sai; giới hạn kết nối khi upgrade; bọc handler và từng tick trong try/catch, chỉ kết thúc trận lỗi; thêm handler cấp process và supervisor.
- **Gộp từ:** duel:Có thể vượt bộ giới hạn tốc độ; duel:Server không cô lập lỗi

#### 29. Test Lab và QA override có trong bản production, chạm được Daily Expedition; entry game 1,7 MB nạp sẵn Duel

- **File:** `src/main.ts:6425`, `src/main.ts:562`, `src/expedition/session.ts:314`, `scripts/report-bundle-metrics.mjs:40`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (medium) x4
- **Vấn đề:** mountTestLab được gọi vô điều kiện, nên mọi người chơi thấy nút 'Developer Test Lab' (?testLab=1 còn tự mở). forcePhase và forceEncounter chạy trên cả run Daily và được lưu lại. main.ts có 220 import tĩnh (Test Lab, Duel, chat, liveops), nên game.js nặng 1,7 MB (~500 KB gzip). Script đo bundle chỉ báo cáo, không fail.
- **Ảnh hưởng:** Người chơi có thể làm phồng PB, ghost và evolution tier của Daily rồi đồng bộ lên cloud. Máy yếu phải parse 1,7 MB trước khi menu dùng được.
- **Cách sửa:** 1) Chỉ mount Test Lab khi DEV hoặc có cờ admin, nạp bằng dynamic import. 2) testForce* từ chối mọi run không phải 'qa'. 3) Lazy-load Duel, chat, feedback, liveops. 4) Đặt ngân sách byte theo entry, đọc từ manifest Vite.
- **Gộp từ:** main-a:Duel và Developer Test Lab được import tĩnh; main-b:Developer Test Lab and Expedition QA overrides ship in production; architecture:Trang chính nạp một khối JS 1.7 MB; tooling:Main game ships as one 1.7 MB entry chunk; security-sweep:Developer Test Lab có trong bản production

#### 30. Build chép public/local-assets (lời announcer DotA, nhạc riêng) vào dist; runtime luôn thử /local-assets trước

- **File:** `vite.config.ts`, `src/audio/duel-sound.ts:45`, `src/audio/music-profile-legacy.ts:176`, `src/audio/MusicController.ts:1179`
- **Loại:** security · **Công sức:** S · **Xác minh:** confirmed (medium) + confirmed (low)
- **Vấn đề:** Vite chép toàn bộ public/ vào dist mà không loại trừ thư mục local-assets đã bị gitignore. Runtime luôn thử localPath trước, nên mỗi lần chuyển nhạc tốn một request lỗi, và mỗi World tạo một track ambient 404. Trong danh sách còn một id có từ tục.
- **Ảnh hưởng:** Rủi ro pháp lý khi một bản build từ máy dev phát tán âm thanh có bản quyền; nhạc boss và victory vào trễ.
- **Cách sửa:** Thêm bước post-build xóa hoặc fail khi dist có local-assets (trừ khi LOCAL_ASSETS=1). Chỉ thêm localPath khi DEV hoặc có cờ. Thay lời DotA bằng nguồn có giấy phép và đổi id.
- **Gộp từ:** audio:Build doesn't exclude gitignored private assets; audio:Music state assets try /local-assets first

#### 31. Duel chưa có nguồn phát token cho production; danh tính Ranked do cookie dev tự tạo

- **File:** `server/duel/local-session.ts:16`, `src/duel/online-room-controller.ts:108`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (medium); là chặn deploy, chưa phải lỗ hổng đang mở
- **Vấn đề:** Cloud Worker không ký token Duel. Nguồn token duy nhất là local-session, cấp 'local-<uuid>' theo cookie, nên xóa cookie là có một tài khoản Ranked mới. Client đọc token từ sessionStorage mà không có gate DEV.
- **Ảnh hưởng:** Friend và Ranked online chưa thể deploy an toàn; rating Ranked mất ý nghĩa.
- **Cách sửa:** Worker ký token ngắn hạn (sub là tài khoản thật, có aud và kid); client lấy token mới mỗi lần kết nối; gate khóa sessionStorage sau DEV.
- **Gộp từ:** duel:Chưa có nguồn phát token Duel cho production

#### 32. localStorage không được bảo vệ: trắng màn hình khi storage bị chặn; settings và từ vựng áp dở dang khi ghi lỗi

- **File:** `src/main.ts:835`, `src/main.ts:2170`, `src/main.ts:10497`, `src/main.ts:10977`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (medium) + confirmed (low)
- **Vấn đề:** Code top-level đọc localStorage mà không có try (loadGameplayMode, feature flags, ExpeditionStorageAdapter), nên SecurityError chặn cả boot. 11 lệnh setItem trần ghi sau khi đã đổi state; commitSettingsDraft lỗi thì dialog đứng im.
- **Ảnh hưởng:** Máy trường học hoặc máy công ty chặn cookie không vào được game; khi quota đầy, settings chỉ áp một nửa.
- **Cách sửa:** Tạo persistence/safe-storage.ts (try, fallback Map, trả boolean, có notice) và inject vào các adapter; áp state trong bộ nhớ trước, persistence là best-effort; thêm test boot khi storage ném lỗi.
- **Gộp từ:** main-a:Game không khởi động được khi trình duyệt chặn localStorage; main-b:Unguarded localStorage writes leave settings/vocabulary half-applied

#### 33. Bàn phím: Campaign 2D không lọc Ctrl/Cmd, phím giữ, ô nhập và IME; bốn handler và ba engine chọn mục tiêu lệch nhau

- **File:** `src/main.ts:11956`, `src/Game.ts:4670`, `src/scene3d/keys.ts:29`, `src/duel/typing.ts:26`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium); tác động IME theo keyCode 229 ở Duel và 2D là plausible
- **Vấn đề:** Ở 2D, Ctrl+F hay Cmd+C bị chấm trúng/trượt, và phím giữ bị tính là trượt. <select> trong HUD nhận chữ cùng lúc với game. 2D không báo khi bộ gõ tiếng Việt đang bật. Mỗi chế độ tự đặt luật IME/modifier/repeat riêng.
- **Ảnh hưởng:** Mất accuracy và streak ở chế độ chơi nhiều nhất; người dùng UniKey đổ lỗi cho game; mỗi bản sửa phải làm bốn lần.
- **Cách sửa:** Tạo src/input/keyboard-intent.ts (bỏ qua modifier, repeat, composition/229 và ô nhập; đọc chữ số theo event.code) cộng imeNotice; dùng cho 2D, 3D, Defense và Duel; thêm bảng test chung.
- **Gộp từ:** architecture:Ba bộ lọc phím/IME khác nhau; input:2D main game keydown lacks modifier, key-repeat and focused-field guards; input:2D game gives no sign that a Vietnamese input method is on; input:Four separate keyboard handlers and three targeting engines diverge

#### 34. Không có dạng gõ chuẩn: khoảng 8 bộ chuẩn hóa lệch nhau, chữ có dấu bị xóa, từ vựng tùy chỉnh tạo quái không thể hạ

- **File:** `src/logic.ts:11`, `src/duel/typing.ts:6`, `src/vocabulary.ts:703`, `src/Game.ts:7017`, `src/main.ts:11662`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** typingText xóa mọi ký tự ngoài a-z ('café' thành 'caf'), trong khi Duel fold theo NFKD. Parser từ vựng tùy chỉnh nhận '2024' hay 'C++', nên sinh quái có từ rỗng không thể hạ. setItem lưu danh sách không có try và không giới hạn kích thước.
- **Ảnh hưởng:** Giáo viên dán danh sách có số hoặc dấu sẽ gặp stage không thể thắng mà không có giải thích.
- **Cách sửa:** Tạo src/text/forms.ts (typingForm, spokenForm, lookupKey) dùng ở mọi nơi; tính một lần khi nạp từ; loại và báo lại các dòng không gõ được; giới hạn số dòng và độ dài; viết golden test.
- **Gộp từ:** input:Custom vocabulary accepts entries that cannot be typed; input:About eight separate text normalisers disagree

#### 35. Thứ tự hạ boss sai: HUD 0 HP hiện lại sau khi hạ boss; từ cuối hạ bằng sát thương phím bị ghi là interrupted

- **File:** `src/Game.ts:7730`, `src/Game.ts:7722`, `tests/boss-depth-runtime.test.ts:180`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (medium) x2 + confirmed (low); đã tái hiện bằng vitest
- **Vấn đề:** typeBoss gửi onBossUpdate cho object boss đã chết sau defeatBoss. Sát thương phím được áp trước bước kiểm tra từ hoàn thành, nên chữ cuối hạ boss gọi defeatBoss mà không qua completeBossWord. Test hiện gọi thẳng defeatBoss private.
- **Ảnh hưởng:** Thanh boss 0 HP hiện dưới modal thưởng; từ quan trọng nhất không được ghi vào dữ liệu học (ước 10–15% số lần hạ boss).
- **Cách sửa:** Kiểm tra hoàn thành từ trước rồi mới tới hp ≤ 0; return khi this.boss !== boss; chỉ emit HUD khi boss còn sống. Thêm tests/boss-defeat-flow.test.ts gồm 3 ca, đi qua handleKey.
- **Gộp từ:** game-b:Typed boss kill re-shows the boss HUD at 0 HP; game-b:A boss word whose last letter kills through key damage is recorded as interrupted; game-b:Boss defeat paths lack runtime regression tests

#### 36. Sát thương boss chép ở 13 chỗ với luật lệch nhau (shield, parts, Mark, Exposed); công thức cooldown boss chép 4 lần

- **File:** `src/Game.ts:3426`, `src/Game.ts:11524`, `src/Game.ts:5436`, `src/skills/offensive.ts:39`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium, hạ từ high) + confirmed (medium) + confirmed (low)
- **Vấn đề:** Chỉ sát thương phím, từ và counter tôn trọng shield/parts; nhiều skill và ultimate bỏ qua. Mark (+35%) và Exposed (×1,5) chỉ áp cho từ và counter, trái với tooltip. onBossUpdate được gửi từ 24 chỗ. Nhánh Recall của công thức cooldown bỏ hệ số ascension.
- **Ảnh hưởng:** Skill xuyên cơ chế boss, tooltip sai, và lỗi cân bằng nhân lên theo mỗi nguồn sát thương mới.
- **Cách sửa:** Chốt quyết định thiết kế về shield cho skill; viết applyBossDamage({amount, source, respectShield, respectParts}) và thay cả 13 chỗ; thêm nextBossActionCooldown() trong boss/model.ts; viết test dạng bảng.
- **Gộp từ:** game-a:Boss damage is copy-pasted at 13 sites; game-b:Character abilities hard-coded; boss-damage block copied 6 times (phần sát thương); game-a:Boss action-cooldown formula is copied 4 times

#### 37. State theo stage reset bằng danh sách viết tay đã lệch: hiệu ứng skill đóng băng trên title, hidden encounter dùng context của stage trước

- **File:** `src/Game.ts:3916`, `src/Game.ts:4216`, `src/main.ts:9271`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** startStage reset khoảng 130 field; backToTitle và 4 hàm khác mỗi hàm reset một tập con riêng. Timer barrier, stasis, overdrive vẫn được vẽ ở title. startActiveHiddenEncounter không xóa expansionEncounterContext, nên dùng pattern, recipe và RNG của stage Campaign trước.
- **Ảnh hưởng:** Lỗi hình ở menu; độ khó hidden encounter không tái lập được, và bằng chứng học bị gắn sai encounter.
- **Cách sửa:** Gom field theo stage vào StageRuntime để reset chỉ còn một phép gán. Trước mắt thêm resetCombatTimers() và gọi setExpansionEncounterContext(null). Thêm test hồi quy.
- **Gộp từ:** game-a:Per-stage state is reset by hand-written lists that have already drifted; main-b:Hidden encounters inherit the previous Campaign stage's Expansion V2 context

#### 38. Gameplay vẫn chạy khi pause (updateEffects); simulation đọc đồng hồ và socket do draw() ghi

- **File:** `src/Game.ts:4944`, `src/Game.ts:10548`, `src/Game.ts:9041`, `src/Game.ts:12026`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium) + confirmed (low)
- **Vấn đề:** updateEffects chạy ở mọi phase, nhưng bên trong có perk strike, đếm ngược reward prompt (mở modal đè lên pause) và nhặt credit. Ngược lại, bossPosition và shipNose dùng lastDrawTime, và bossSockets do drawBossDepth ghi.
- **Ảnh hưởng:** Bấm Esc ngay sau một kill vẫn đổi state và có thể mở dialog chồng nhau. Phụ thuộc hai chiều này chặn việc tách renderer.
- **Cách sửa:** Tách tick presentation (luôn chạy) khỏi tick gameplay (chỉ khi phase là 'playing'); lái sway bằng đồng hồ simulation; socket chỉ dùng cho VFX.
- **Gộp từ:** game-a:Gameplay changes run in updateEffects() while paused; game-b:Simulation reads the render clock and sockets written during draw

#### 39. Snapshot stage-policy của Expedition là biến global dùng một lần, bị lookup stage bất kỳ tiêu thụ

- **File:** `src/admin/stage-runtime-policy.ts:223`, `src/main.ts:6043`, `src/campaign/difficulty.ts:52`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (medium)
- **Vấn đề:** activeStageRuntimeOverride trả snapshot cho lần gọi đầu rồi xóa nó. Ngay dòng sau, difficultyFor nhận session ACTIVE. Khi encounter là null, snapshot còn arm và rò sang stage Campaign kế tiếp.
- **Ảnh hưởng:** Khi Admin publish giữa run, encounter trộn hai revision policy (đúng trường hợp snapshot được tạo ra để xử lý).
- **Cách sửa:** Truyền override tường minh vào createStageConfig(stage, override) và difficultyFor; bỏ session mutable; thêm test.
- **Gộp từ:** state:Expedition stage-policy snapshot is a one-shot global

#### 40. Bootstrap của Defense và Campaign 3D là bản chép đã lệch: âm lượng mặc định, nguồn từ vựng, learning event

- **File:** `src/defense/main.ts:100`, `src/campaign3d/main.ts:156`, `src/main.ts:743`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium)
- **Vấn đề:** storage, readJson, gameSettings được chép lại với mặc định khác (nhạc 0,5 thay vì 0,26; ambient 0,4 thay vì 0,08) và không clamp. loadWords chỉ đọc level, bỏ qua topic, word-type, grammar và custom. Campaign 3D không gửi learning event. Có 3 AudioContext và 5 đường synth.
- **Ảnh hưởng:** Người chơi mới nghe nhạc to gấp đôi và ambient gấp 5 lần; người chọn chủ đề lại gặp từ chung chung; tiến độ học trong Campaign 3D bị mất.
- **Cách sửa:** Tạo src/platform/ (settings, safe-storage, vocabulary-source, learning-bridge, audio-bus) dùng chung cho mọi entry; viết test so sánh settings giữa các entry.
- **Gộp từ:** architecture:Bootstrap của Defense và Campaign 3D là bản chép đã lệch

#### 41. Mất focus hoặc ẩn tab không dừng combat và âm thanh (2D Typing, Defense, Campaign 3D)

- **File:** `src/main.ts:11952`, `src/defense/main.ts:1711`, `src/campaign3d/main.ts:1674`, `src/scene3d/sfx.ts:462`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** 2D chỉ pause khi blur ở Voice; Defense không có handler blur hay visibilitychange. Không chỗ nào gọi AudioContext.suspend(), nên nhạc vẫn chạy khi pause và khi tab ở nền.
- **Ảnh hưởng:** Người chơi mất máu sau khi click vào Portal; nhạc vẫn kêu sau menu pause; tốn pin trên điện thoại.
- **Cách sửa:** Pause khi blur hoặc tab ẩn trong combat, resume chủ động; thêm SceneAudio.suspend/resume; suspend context ở trang chính qua helper ensureRunning.
- **Gộp từ:** input:Losing keyboard focus does not pause typing combat; audio:Audio is never suspended when the tab is hidden or the game is paused

#### 42. Cập nhật skill definitions giữa stage xóa cooldown, charge và giới hạn mỗi stage (plausible)

- **File:** `src/skills/engine.ts:91`, `src/Game.ts:2608`, `src/main.ts:2505`
- **Loại:** bug · **Công sức:** S · **Xác minh:** plausible (medium): cơ chế reset chắc chắn có, tần suất phụ thuộc thời điểm ví/mạng
- **Vấn đề:** setDefinitions luôn gọi resetStage(). refreshPersistentStateUi gọi set* mà không kiểm phase, kể cả từ callback adoptBalances khi reconnect.
- **Ảnh hưởng:** Ultimate hồi sớm và perStageLimit bị vượt, có thể bị khai thác.
- **Cách sửa:** setDefinitions giữ state runtime (clamp cooldown, giữ usesThisStage); chỉ resetStage khi bắt đầu stage; bỏ qua set* khi đang chơi; thêm test.
- **Gộp từ:** render2d:Refreshing skill definitions mid-stage wipes all cooldowns

#### 43. SceneAudio.playMusic: request cũ thắng race (nhạc chạy ở menu sau khi thoát) và giải mã cả bài thành PCM giữ mãi (~46 MB)

- **File:** `src/scene3d/sfx.ts:606`, `src/defense/main.ts:397`, `src/campaign3d/main.ts:828`
- **Loại:** bug · **Công sức:** M · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** playMusic(null) hoặc đổi bài trong lúc đang chờ giải mã không hủy được request cũ. Nhạc 57–64 s được decode cả bài vào buffer và cache không bao giờ được xóa.
- **Ảnh hưởng:** Nhạc chiến đấu lặp trên menu, hoặc sai bài cả wave; áp lực bộ nhớ cao ở chế độ nặng nhất.
- **Cách sửa:** Thêm token request; stream nhạc bằng HTMLAudio + MediaElementSource, chỉ giữ buffer cho SFX; viết unit test cho race.
- **Gộp từ:** audio:SceneAudio.playMusic race: a stale request wins; audio:3D modes decode whole music tracks to PCM and keep them forever

#### 44. Sfx.noise tạo buffer theo lần gọi đầu: lớp noise dài bị cắt ở 0,35 s và attack bị bỏ qua

- **File:** `src/audio/Sfx.ts:1418`, `src/audio/Sfx.ts:1452`
- **Loại:** bug · **Công sức:** S · **Xác minh:** confirmed (medium), có repro
- **Vấn đề:** Buffer dùng chung có độ dài theo lần gọi đầu (thường là tiếng ngắn) và không loop, nên tiếng gồng, gầm và nổ của boss bị cụt kèm tiếng click. shape.attack không được đọc.
- **Ảnh hưởng:** Âm thanh boss cụt, chưa đạt mức 'VFX/sound thấy rõ' mà chủ dự án yêu cầu.
- **Cách sửa:** Tạo buffer cố định 2 s hoặc đặt loop=true; thêm ramp attack; viết test hồi quy.
- **Gộp từ:** audio:Sfx.noise sizes its shared noise buffer from the first call

#### 45. Không phục hồi AudioContext sau khi bị suspend hoặc interrupted: nhạc có thể im tới khi reload (plausible)

- **File:** `src/audio/MusicController.ts:899`, `src/audio/Sfx.ts:232`, `src/scene3d/sfx.ts:496`
- **Loại:** bug · **Công sức:** M · **Xác minh:** plausible (medium, hạ từ high): khớp code, chưa thử trên thiết bị
- **Vấn đề:** Listener gesture bị gỡ vĩnh viễn sau lần context chạy đầu tiên, và không có handler statechange. Trạng thái 'interrupted' (cuộc gọi, Siri, mở micro) không được resume. new AudioContext của Sfx không có try.
- **Ảnh hưởng:** Người chơi Safari di động mất toàn bộ nhạc sau cuộc gọi hoặc khi dùng micro.
- **Cách sửa:** Viết helper ensureRunning dùng chung; nghe onstatechange và gắn lại gesture; gọi ở visibilitychange và pageshow; bọc khởi tạo trong try.
- **Gộp từ:** audio:No AudioContext recovery after suspend/interruption

#### 46. Cờ busy/guard chép tay với tập con khác nhau; nhiều điểm vào thiếu chống chạy lặp

- **File:** `src/main.ts:7126`, `src/main.ts:9354`, `src/main.ts:10872`, `src/main.ts:8840`
- **Loại:** design · **Công sức:** M · **Xác minh:** confirmed (medium)
- **Vấn đề:** Có ít nhất 10 cờ ad-hoc, mỗi call site tự tổ hợp. startSelectedStage không kiểm walletPurchaseBusy; importSaveFile cũng vậy; nút Tier/Skip của hidden encounter không có gate; callback restore của CloudSave không có guard.
- **Ảnh hưởng:** Quên một cờ là có bug thoáng qua khó tái hiện (Deploy hỏng, rollback sai thứ tự).
- **Cách sửa:** Dùng một app-flow state tường minh với các predicate có tên (canStartSortie, canPurchase); dùng withGate cho mọi async handler.
- **Gộp từ:** main-b:Busy/guard predicates are copied by hand with different subsets

#### 47. Save phình (tới 6 bản RunPersistentState, shop instance không được dọn) và save đồng bộ đầy đủ mỗi 5 s combat

- **File:** `src/persistence/player-save.ts:636`, `src/shops/state.ts:686`, `src/main.ts:12158`, `src/persistence/account-transactions.ts:291`
- **Loại:** performance · **Công sức:** L · **Xác minh:** confirmed (medium, hạ từ high) + plausible (medium) cho jank 5 s
- **Vấn đề:** Save tổng hợp nặng 229 KB ở stage 100, 599 KB ở stage 300 và 1,89 MB ở stage 1000, sát giới hạn 1,9 MB. Mỗi commit sanitize mọi bản sao, chạy structuredClone, JSON.stringify và ghi localStorage mirror đồng bộ, rồi broadcast cho các tab. Trong combat, autosave chạy mỗi 5 s vì credits đổi theo từng kill.
- **Ảnh hưởng:** Giật định kỳ tăng dần theo tuổi save; người chơi lâu năm nhận lỗi 413 cloud; mirror chiếm quota localStorage. Phải làm mục này trước khi hạ giới hạn server.
- **Cách sửa:** Snapshot chỉ lưu delta; dọn shop instance cũ; mirror chỉ giữ account + campaign hoặc nén; chỉ save ở ranh giới (hết wave, pause) hoặc khi idle; thêm test ngân sách save; profile trước.
- **Gộp từ:** state:Save holds up to 6 copies of RunPersistentState; main-b:Every 5 s of combat triggers a full synchronous save

#### 48. Voice mode dừng simulation 2D mỗi khi mục tiêu xuất hiện, vì danh sách chỉ được gửi theo poll 50 ms

- **File:** `src/Game.ts:4936`, `src/input/voice-session.ts:307`, `src/Game.ts:4527`
- **Loại:** performance · **Công sức:** M · **Xác minh:** confirmed (medium); mức giật chưa đo
- **Vấn đề:** update() chỉ chạy khi mọi unitKey đã được Portal xác nhận. Quái mới, đạn hay đổi layer đều làm world đứng tới tick 50 ms kế tiếp cộng một vòng postMessage. Mỗi lần resume, toàn bộ từ vựng được gửi lại.
- **Ảnh hưởng:** Giật thấy được ở Voice, nhiều nhất khi đánh boss.
- **Cách sửa:** Publish theo sự kiện khi dirty, giữ poll làm dự phòng; signature theo key thay vì JSON.stringify; bỏ gửi lại từ vựng khi revision không đổi.
- **Gộp từ:** input:Voice mode stops the 2D simulation each time a target appears

#### 49. Bộ lọc từ Voice/Hybrid chuẩn hóa lại mọi cặp, tốn 2,5–10 ms mỗi lần spawn

- **File:** `src/input/word-conflict.ts:16`, `src/input/target-registry.ts:16`, `src/enemies/stage-word-variety.ts:144`
- **Loại:** performance · **Công sức:** S · **Xác minh:** confirmed (medium), đo bằng tsx
- **Vấn đề:** Mỗi ứng viên copy mảng rồi chạy typingText và NFKC cho mọi cặp; band near bị kiểm hai lần.
- **Ảnh hưởng:** Spike frame khi spawn ở Hybrid và Voice, cộng dồn với giật ở mục Voice.
- **Cách sửa:** Tính trước Set key và trie tiền tố cho mỗi filter; cache form theo entry (WeakMap); không kiểm near hai lần.
- **Gộp từ:** input:Voice/Hybrid word filter re-normalises every candidate

#### 50. SFX mẫu chạy trên 117 HTMLAudio: iOS bỏ qua volume, phát trễ và cắt nhau (plausible)

- **File:** `src/audio/sample-bank.ts:316`, `src/audio/Sfx.ts:646`, `src/audio/MusicController.ts:930`
- **Loại:** performance · **Công sức:** M · **Xác minh:** plausible (medium, hạ từ high): phần iOS và độ trễ chưa thử trên thiết bị
- **Vấn đề:** 39 id mẫu phát qua pool HTMLAudio, và round-robin cướp cả voice đang phát. Trên iOS, element.volume không đặt được, nên gain mix và ducking bị bỏ qua.
- **Ảnh hưởng:** Người chơi iPhone/iPad nghe tiếng boss to hơn 10–20 dB và không chỉnh được; tiếng trúng đòn trễ trên mọi nền tảng.
- **Cách sửa:** Decode thành AudioBuffer và phát qua gain → limiter; giữ HTMLAudio làm fallback; chuyển track 'element' sang graph khi unlock.
- **Gộp từ:** audio:Combat/boss sample SFX run on 117 HTMLAudio elements

#### 51. Nền 2D legacy đắt (filter và shadowBlur mỗi frame, tải thêm ~4 MB), ~2.100 dòng chết, BGV lỗi thì hiện nền world cũ

- **File:** `src/worlds/layered-background-renderer.ts:606`, `src/worlds/scene-renderer.ts:2711`, `src/background/stage.ts:258`, `src/Game.ts:10864`
- **Loại:** performance · **Công sức:** L · **Xác minh:** confirmed (medium) x2 + confirmed (low)
- **Vấn đề:** Fallback legacy đặt context.filter và shadowBlur cho từng layer mỗi frame, và luôn preload khoảng 4 MB PNG. 41/53 hàm của scene-renderer không bao giờ chạy. Khi kit BGV lỗi, nền của world trước vẫn hiện suốt stage mà không retry.
- **Ảnh hưởng:** Máy không có WebGL2 nhận nền đắt nhất; mọi người chơi tốn thêm băng thông; một request lỗi là sai nền cả stage.
- **Cách sửa:** Thay bằng fallback nhỏ (plate cộng gradient); không preload legacy; retry có backoff; xóa policy legacy-hybrid và code chết.
- **Gộp từ:** render2d:Legacy 2D background runs a CSS filter every frame; render2d:About 2,100 unreachable lines in scene-renderer.ts; render2d:When a BGV kit fails to load, the previous world's background keeps showing

#### 52. Half-rate của BGV không chạy ở chế độ 'blit' mặc định: ngân sách Low và một bước adaptive vô tác dụng

- **File:** `src/background/stage.ts:58`, `src/background/budget.ts:43`, `src/performance/adaptive-resolution.ts:72`
- **Loại:** performance · **Công sức:** S · **Xác minh:** confirmed (medium)
- **Vấn đề:** Chế độ blit vẽ lại mỗi frame, nên frameInterval: 2 vô tác dụng. stepDown từ level 2 lên 3 báo thành công mà không đổi gì, làm adaptive chờ thêm 3,5 s mới hạ độ phân giải.
- **Ảnh hưởng:** Tier Low chịu chi phí GPU full-rate; máy quá tải giật lâu hơn.
- **Cách sửa:** Bỏ qua level chỉ khác halfRate khi đang blit; sau đó render vào target bền và blit frame đã cache.
- **Gộp từ:** render2d:BGV half-rate rendering never runs in the default blit presentation

#### 53. Nhiều WebGL context riêng trái quy tắc shared renderer (DuelShip3D mỗi hull một context, result-fx MSAA)

- **File:** `src/duel/ship3d.ts:224`, `src/duel/combat-visuals.ts:694`, `src/vfx/result-fx.ts:1140`, `src/render3d/shared-renderer.ts`
- **Loại:** performance · **Công sức:** L · **Xác minh:** confirmed (medium) + confirmed (low); scope duel đánh giá plausible (low)
- **Vấn đề:** Mỗi thân tàu Duel có WebGLRenderer riêng (MSAA, shadow PCFSoft) và mỗi frame drawImage chéo context. result-fx giữ context suốt phiên; khi đổi quality chỉ gọi dispose() mà không forceContextLoss().
- **Ảnh hưởng:** Có thể tốn vài ms mỗi frame trong PvP và tăng nguy cơ chạm giới hạn context (trình duyệt loại context BGV).
- **Cách sửa:** Render hai hull qua sharedRenderer với scissor/viewport; result-fx gọi forceContextLoss và giải phóng khi đóng; đo trước và sau.
- **Gộp từ:** render3d:DuelShip3D opens a separate WebGL context per hull; render2d:result-fx keeps a separate persistent MSAA WebGL context; duel:Hai thân tàu 3D trong Duel dùng hai WebGLRenderer

#### 54. Bầu trời skyOnly của Defense vẫn tải, cập nhật và vẽ mọi lớp mây ở alpha 0

- **File:** `src/defense/main.ts:138`, `src/scene3d/world.ts:482`
- **Loại:** performance · **Công sức:** S · **Xác minh:** confirmed (medium)
- **Vấn đề:** build() vẫn tạo SpriteField và tải texture; write() upload 5 attribute mỗi frame; mesh không frustum cull và shader không discard alpha 0.
- **Ảnh hưởng:** Lãng phí fill-rate và VRAM đúng ở chế độ nhắm 300–400 quái.
- **Cách sửa:** Biến skyOnly thành option của constructor để không tạo các lớp này; tối thiểu đặt visible=false và bỏ write.
- **Gộp từ:** render3d:Defense's skyOnly sky still loads, updates and draws every layer

#### 55. Boss, tháp và boss Campaign 3D compile shader và upload texture ở frame đầu xuất hiện (không prewarm)

- **File:** `src/defense/main.ts:498`, `src/campaign3d/main.ts:793`, `src/duel/ship3d.ts:393`
- **Loại:** performance · **Công sức:** M · **Xác minh:** confirmed (medium); mức giật chưa đo
- **Vấn đề:** Clone boss và tháp chỉ được render lần đầu lúc spawn, nên compile skinned material và upload texture 2048² chạy đồng bộ. Boss Campaign 3D tải GLB ngay lúc pha boss bắt đầu.
- **Ảnh hưởng:** Giật hàng chục tới hàng trăm ms đúng khoảnh khắc kịch tính nhất.
- **Cách sửa:** Làm theo mẫu DuelShip3D.warm: initTexture + compileAsync với clone ẩn sau khi tải; preload boss khi stage bắt đầu.
- **Gộp từ:** render3d:Bosses, towers and Campaign 3D bosses compile shaders on first visible frame

#### 56. Buffer instanced và particle upload lại toàn bộ capacity mỗi frame

- **File:** `src/defense/view/crowd.ts:302`, `src/defense/view/vfx.ts:185`, `src/scene3d/particles.ts:107`
- **Loại:** performance · **Công sức:** S · **Xác minh:** confirmed (medium, sát ranh giới)
- **Vấn đề:** Crowd đánh dấu needsUpdate cho cả 13 layer mà không dùng updateRanges, nên upload khoảng 295 KB mỗi frame bất kể số quái. Billboards, Rings, ParticlePool và SpriteField cũng vậy.
- **Ảnh hưởng:** Tốn CPU và băng thông bus, nặng nhất trên GPU tích hợp ở kịch bản 400 quái.
- **Cách sửa:** clearUpdateRanges rồi addUpdateRange(0, count*itemSize); bỏ upload khi count bằng 0; áp dụng cho mọi pool.
- **Gộp từ:** render3d:Instanced and particle buffers re-upload their full capacity every frame

#### 57. Duel gửi nguyên snapshot ~4 KB cho mỗi người mỗi 50 ms (~84 KB/s), không kiểm soát backpressure

- **File:** `src/duel/authority.ts:2149`, `server/duel/ws-server.ts:307`
- **Loại:** performance · **Công sức:** M · **Xác minh:** confirmed (medium)
- **Vấn đề:** 4.754/4.800 update không có event; map tĩnh chiếm 1.327 B mỗi update. send() không kiểm bufferedAmount.
- **Ảnh hưởng:** Khoảng 300 MB/giờ mỗi người, tăng độ trễ trên mạng di động, client parse JSON 20 lần mỗi giây; buffer phình làm tăng tác hại của lỗi nhân bản trận.
- **Cách sửa:** Chỉ gửi map một lần; gửi delta hoặc chỉ khi có thay đổi; snapshot đầy đủ 5–10 Hz; drop hoặc ngắt khi buffer vượt ngưỡng.
- **Gộp từ:** duel:Server gửi nguyên snapshot khoảng 4,2 KB mỗi 50 ms

#### 58. Chốt kết quả Ranked ghi đồng bộ toàn bộ file JSON pretty-print nhiều lần ngay trong vòng tick

- **File:** `server/duel/ranked-service.ts:241`, `server/duel/ranked-history-store.ts:305`, `server/duel/ranked-settlement-journal.ts:392`
- **Loại:** performance · **Công sức:** M · **Xác minh:** confirmed (medium)
- **Vấn đề:** Mỗi lần chốt gọi writeFileSync toàn bộ Map (profile, lịch sử, journal) với JSON.stringify(null, 2), và không fsync. Chi phí tỉ lệ số tài khoản × 512 event.
- **Ảnh hưởng:** Càng nhiều người chơi Ranked, tick của mọi trận càng khựng; mất điện có thể mất dữ liệu.
- **Cách sửa:** Chuyển sang SQLite WAL hoặc D1/DO; tối thiểu dùng log append-only, ghi async ngoài tick và fsync.
- **Gộp từ:** duel:Chốt kết quả Ranked ghi đồng bộ toàn bộ file JSON

#### 59. D1 thiếu index: cron hằng ngày scan cả bảng; mỗi session bị xóa scan oauth_attempts

- **File:** `cloud/migrations/0009_social_auth.sql:15`, `cloud/src/maintenance.ts:24`
- **Loại:** performance · **Công sức:** S · **Xác minh:** confirmed (medium)
- **Vấn đề:** FK session_id và account_id của oauth_attempts không có index. Cleanup xóa tới 5.000 session trước khi xóa attempt. Các bảng sessions, tokens, rate_limits và outbox đều bị scan toàn bộ.
- **Ảnh hưởng:** Kẻ tấn công thổi phồng hai bảng là cron ăn hết 5 triệu lượt đọc/ngày hoặc timeout.
- **Cách sửa:** Migration thêm các index cần thiết; xóa oauth_attempts đầu batch; kiểm bằng EXPLAIN QUERY PLAN.
- **Gộp từ:** cloud:Missing indexes: the daily cron scans whole tables

#### 60. Hành vi nhân vật viết bằng chuỗi if/ternary (46–47 nhánh) ở Game.ts, main.ts và test-lab, không kiểm exhaustive

- **File:** `src/Game.ts:2788`, `src/Game.ts:2981`, `src/main.ts:2791`, `src/characters/visuals.ts:30`
- **Loại:** maintainability · **Công sức:** M · **Xác minh:** confirmed (medium) x2 + confirmed (low)
- **Vấn đề:** refreshSkillDefinitions là ternary 11 tầng kết thúc bằng `: []`; activateSkillEffect, ultimateVisual và các passive đều rẽ nhánh theo characterId. activateOverdrive dài 358 dòng.
- **Ảnh hưởng:** Nhân vật thứ 12 vẫn compile sạch nhưng không có active, ultimate hay passive; cân bằng một phi công phải sửa 4–6 chỗ.
- **Cách sửa:** Định nghĩa CharacterKit trong từng characters/*.ts và gom vào CHARACTER_KITS: Record<CharacterId, …>; dùng UltimateSpec với một executor chung; Game, main.ts và test-lab cùng tra bảng này.
- **Gộp từ:** game-a:Character behaviour is hard-coded in if/else ladders; game-b:Character abilities are hard-coded across Game.ts (phần nhân vật); main-a:Ánh xạ nhân vật → active skill viết bằng chuỗi if

#### 61. Số liệu skill hard-code trong Game.ts, tooltip lặp lại số; thêm skill hay enemy phải sửa rải rác

- **File:** `src/Game.ts:3299`, `src/Game.ts:924`, `src/skills/progression.ts:52`, `src/skills/defensive.ts:21`
- **Loại:** maintainability · **Công sức:** L · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** 18 nhánh if theo id skill dùng số literal; mô tả lặp lại các số đó và không scale theo level (sai từ level 3–5). Có 30 timer giảm bằng tay và 113 phép so kind.
- **Ảnh hưởng:** Cân bằng phải sửa god class, tooltip lệch hành vi thật, và Admin không chỉnh được các thông số.
- **Cách sửa:** Thêm params có kiểu vào SkillDefinition; sinh mô tả từ params; mỗi skill một SkillBehavior; enemy dùng EnemyBehavior theo kind; mỗi PR làm 1–2 skill kèm test replay.
- **Gộp từ:** game-a:Skill tuning numbers are hard-coded in Game.ts; architecture:Thêm skill/enemy mới phải sửa rải rác nhiều nơi

#### 62. 5 loại bonus target là state machine chép song song; khối phím đúng chép 8 lần, label từ chép 6 lần

- **File:** `src/Game.ts:1250`, `src/Game.ts:5056`, `src/Game.ts:8128`, `src/Game.ts:5941`
- **Loại:** maintainability · **Công sức:** M · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** Mỗi loại có field, hàm spawn/update và cặp type/complete riêng. Cổng spawn chép 4 lần; khối 'phím đúng' có 8 bản với hằng số khác nhau, nhánh voice đã lệch.
- **Ảnh hưởng:** Thêm một event target cần khoảng 12 chỗ sửa; quên một chỗ là soft-lock ở stage-clear gate.
- **Cách sửa:** Tạo interface BonusTarget và BonusTargetSystem với bảng lịch spawn; thêm registerCorrectKey() và drawTypedWordLabel() có cache.
- **Gộp từ:** game-a:Five bonus-target types are copy-pasted parallel state machines; game-b:Bonus targets and the per-key hit path are copied several times

#### 63. Trạng thái người chơi là ~20 biến global; danh sách field chép tay ở 6–9 chỗ và phần aux đã lệch

- **File:** `src/main.ts:1497`, `src/main.ts:2320`, `src/main.ts:1545`, `src/main.ts:9659`
- **Loại:** maintainability · **Công sức:** M · **Xác minh:** confirmed (medium, hạ từ high): chưa có hỏng dữ liệu thật
- **Vấn đề:** Init khôi phục 7 nhóm aux, cross-tab khôi phục 5, practice reload chỉ 2; restoreTestingStagePersistentState trùng từng dòng với applyAutosaveSnapshot.
- **Ảnh hưởng:** Mỗi field persistent mới phải sửa 6–9 chỗ; quên một chỗ là mất dữ liệu âm thầm.
- **Cách sửa:** Tạo PlayerStateStore với snapshot/apply; khai báo PERSISTENT_KEYS một lần; mọi đường restore gọi chung; thêm test round-trip.
- **Gộp từ:** main-a:Trạng thái người chơi là ~20 biến global

#### 64. Versioning save: migration 27 nhánh chép tay, factory 24 tham số vị trí, validation backup lệch (bỏ sót v21, v26, v27)

- **File:** `src/persistence/player-save.ts:680`, `src/persistence/player-save.ts:778`, `src/persistence/backup.ts:302`, `src/persistence/checkpoint.ts:104`
- **Loại:** maintainability · **Công sức:** M · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** migratePlayerSave dài khoảng 727 dòng, mỗi nhánh dựng lại toàn bộ save. createPlayerSave nhận 24 tham số vị trí, nhiều tham số liền nhau cùng kiểu. backup.ts lặp khoảng 450 dòng danh sách theo version. Có hai type cùng tên CrashRecoverySnapshot.
- **Ảnh hưởng:** Truyền nhầm thứ tự tham số thì tsc không bắt, và người chơi mất tiến độ; đây là module rủi ro dữ liệu cao nhất.
- **Cách sửa:** Chốt fixture JSON cho từng version trước; đổi factory sang nhận object; migration theo các bước vN → vN+1 rồi sanitize một lần; viết validation backup dạng bảng.
- **Gộp từ:** architecture:player-save.ts: 27 nhánh migration chép tay; state:Save versioning is a copy-paste ladder

#### 65. Duel: file quá lớn và tầng transport không test được (battle-ui 3.025, engine 2.812, authority 2.309 dòng; ws-server có side effect)

- **File:** `src/duel/battle-ui.ts:581`, `src/duel/engine.ts:404`, `server/duel/ws-server.ts:114`
- **Loại:** maintainability · **Công sức:** L · **Xác minh:** confirmed (medium)
- **Vấn đề:** installDuelBattleUi là một closure khoảng 2.440 dòng. ws-server đọc env, tạo interval và listen ngay khi import, nên không test nào import được.
- **Ảnh hưởng:** Lỗi vòng đời trận, half-open và rate limit đều lọt qua dù 64 file test Duel đều xanh.
- **Cách sửa:** Tách createDuelServer(config, deps) với entrypoint mỏng và test bằng ws thật trên port 0; tách authority thành SessionRegistry, RoomService, MatchLifecycle; tách battle-ui thành renderer nhỏ.
- **Gộp từ:** duel:File quá lớn (god file) và transport không test được

#### 66. Hai engine âm thanh 60+ method và ba stack song song, không có master bus hay lifecycle chung

- **File:** `src/audio/Sfx.ts:147`, `src/audio/MusicController.ts:901`, `src/scene3d/sfx.ts:496`
- **Loại:** maintainability · **Công sức:** L · **Xác minh:** confirmed (medium)
- **Vấn đề:** Sfx.ts (1.486 dòng) trộn engine với dữ liệu cue, và Game gọi 67 method sfx. Loader, noise và impulse bị nhân ba lần. Nhạc ra destination không qua limiter.
- **Ảnh hưởng:** Mỗi bản sửa lifecycle phải làm ba lần, và mix 2D lệch với 3D.
- **Cách sửa:** Một AudioEngine mỗi trang (bus, limiter, lifecycle); cue dạng dữ liệu; Game phát sự kiện ngữ nghĩa; tách MusicController thành các phần nhỏ, làm từng bước.
- **Gộp từ:** audio:Two engines with 60+ methods and three parallel audio stacks

#### 67. CI chưa từng chạy trên nhánh đang làm (971 commit); pipeline yếu: lockfile không frozen, tsc chạy cuối, action cũ

- **File:** `.github/workflows/ci.yml:3`, `.github/workflows/ci.yml:24`, `package.json:7`
- **Loại:** tooling · **Công sức:** S · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** CI chỉ chạy trên main và PR, trong khi nhánh hiện tại hơn main 971 commit (2.179 file) và không có PR. Pipeline dùng --no-frozen-lockfile, tsc chỉ chạy trong build sau test, không có cache hay timeout, và action @v4 nhắm Node 20 đã deprecated.
- **Ảnh hưởng:** Defense V4, OAuth và ví D1 chưa từng được build trên runner sạch; bisect qua 971 commit rất tốn.
- **Cách sửa:** Trigger CI cho mọi nhánh; dùng --frozen-lockfile và cache pnpm; thêm job typecheck sớm (app, server, cloud, scripts); nâng và pin action; thêm timeout và permissions; mở draft PR sớm.
- **Gộp từ:** tooling:CI has never run on the active branch; tooling:CI install uses --no-frozen-lockfile

#### 68. Test đọc file của repo cha (../../../shared/vocabulary): chắc chắn ENOENT trên CI

- **File:** `tests/game-word-variety-regression.test.ts:20`
- **Loại:** tooling · **Công sức:** S · **Xác minh:** confirmed (medium, hạ từ high)
- **Vấn đề:** Test đọc shared/vocabulary của repo cha, mà CI chỉ checkout repo space-typing.
- **Ảnh hưởng:** Bước Test đỏ ngay ở PR đầu tiên, che các bước sau và tập cho mọi người quen bỏ qua build đỏ.
- **Cách sửa:** Chép snapshot vào tests/fixtures; thêm test chặn mọi path thoát khỏi gốc package.
- **Gộp từ:** tooling:Test reads the parent repo (../../../shared/vocabulary)

#### 69. Code Worker không được type-check hay test tích hợp trong CI; các cổng bảo mật không có test tự động

- **File:** `cloud/tsconfig.json:1`, `cloud/src/worker.ts:95`, `scripts/account-e2e.mjs:97`
- **Loại:** test-gap · **Công sức:** M · **Xác minh:** confirmed (medium) + confirmed (low)
- **Vấn đề:** CI không chạy account:check, và wrangler bundle bằng esbuild nên không type-check. saves, social, chat, worker và liveops không có test nào import. CSRF header, token admin, Origin của chat và kick chưa được test.
- **Ảnh hưởng:** Một thay đổi có thể gỡ mất CSRF hay phân quyền mà CI không phát hiện.
- **Cách sửa:** Thêm account:check vào CI; viết test bằng vitest-pool-workers hoặc node:sqlite cho worker.fetch; thêm một job chạy account-e2e với wrangler dev.
- **Gộp từ:** cloud:Worker code is not type-checked or integration-tested in CI; security-sweep:Các cổng bảo mật quan trọng của backend chưa có test

#### 70. Test gắn với văn bản mã nguồn và field private, cản refactor; luồng launch, mua hàng và settings không có test hành vi

- **File:** `tests/integration-polish.test.ts:12`, `tests/duel-battle-dom-contract.test.ts:14`, `tests/duel-ship3d.test.ts:63`
- **Loại:** test-gap · **Công sức:** L · **Xác minh:** confirmed (medium) x2
- **Vấn đề:** Không test nào import được main.ts; coverage chỉ là các assert toContain trên mã nguồn (16 ở integration-polish, khoảng 66 ở duel-dom). 139 cast `as unknown as` chọc vào field private. Test asset rẽ nhánh theo file local, nên CI kiểm ít hơn máy dev. Không có coverage provider.
- **Ảnh hưởng:** Regression như Deploy hỏng lọt qua; test đỏ khi refactor đúng và vẫn xanh khi hành vi hỏng, nên cản chính việc tách god file.
- **Cách sửa:** Controller nhận context inject và được test bằng happy-dom; thay assert chuỗi bằng assert hành vi; không nhận test mới đọc mã nguồn; thêm coverage-v8; dùng skipIf có lý do.
- **Gộp từ:** main-b:Launch, purchase, route and hidden-encounter flows have no behavioral tests; tooling:Tests are coupled to source text and private internals

#### 71. Không có linter, formatter hay rule ranh giới import; bật noUnused* ra 28–32 lỗi, có cái là lỗi hành vi

- **File:** `tsconfig.json:13`, `src/Game.ts:1130`, `src/Game.ts:13747`, `src/defense/rules/engine.ts:291`
- **Loại:** tooling · **Công sức:** M · **Xác minh:** confirmed (medium) x2 + confirmed (low) x2
- **Vấn đề:** Repo không có eslint, biome hay dependency-cruiser. bossReliefLoading được ghi nhưng không ai đọc, nên việc chờ được mô tả trong doc không xảy ra. Format đã vỡ ở code nóng, và có biểu thức `A || B || C && D` không ngoặc. 15 module domain import src/admin, mà không có rule nào chặn.
- **Ảnh hưởng:** Promise nổi, localStorage trần và innerHTML lọt qua review; một import UI lọt vào duel/engine là vỡ build server.
- **Cách sửa:** Bật noUnused* và sửa; dùng typescript-eslint (no-floating-promises, no-restricted-globals) hoặc Biome; thêm dependency-cruiser với rule chống cycle, chặn domain→admin và server→DOM; thêm knip; ghi cấu trúc đích vào docs.
- **Gộp từ:** architecture:Không có ranh giới module nào được ép buộc; game-b:No lint or unused-code checks; main-a:Chưa có linter hay kiểm tra unused; tooling:No linter or formatter; tsc finds 32 dead symbols

#### 72. Không có cổng hiệu năng tự động cho mục tiêu Defense 300–400 quái và Campaign FPS cao

- **File:** `scripts/visual/scenarios/defense-perf.mjs:1`, `tests/defense-rules.test.ts:328`
- **Loại:** test-gap · **Công sức:** M · **Xác minh:** confirmed (medium)
- **Vấn đề:** Đo frame time chỉ có trong các kịch bản CDP chạy tay. Engine chỉ tốn 0,03–0,06 ms mỗi bước ở 640 quái, nên ngân sách thật nằm ở render và DOM, mà phần này không được đo.
- **Ảnh hưởng:** Regression hiệu năng lọt qua mà không ai biết.
- **Cách sửa:** Thêm vitest bench cho engine Defense, Game.update và tick Duel, kèm baseline; job nightly chạy defense-perf trên vite preview và xuất p50/p95.
- **Gộp từ:** tooling:No automated performance gate

#### 73. Không có telemetry lỗi hay hiệu năng phía client: mọi lỗi im lặng không để lại dấu vết

- **File:** `src/ui/feedback-dialog.ts:32`, `cloud/wrangler.jsonc:47`
- **Loại:** design · **Công sức:** M · **Xác minh:** critic, chưa qua verifier; đã spot-check source
- **Vấn đề:** Handler toàn cục chỉ giữ 5 lỗi trong RAM, và chỉ gửi đi khi người chơi tự mở Feedback. Worker không có route nhận lỗi hay số liệu frame.
- **Ảnh hưởng:** Chủ dự án không biết khi game đứng hay giật trên máy người chơi, và không có dữ liệu để chỉnh adaptive quality.
- **Cách sửa:** Thêm route client-log ghi vào Workers Logs (không ghi D1); dùng sendBeacon khi pagehide, theo fingerprint; kèm build hash và p95 frame; lấy mẫu và rate limit.
- **Gộp từ:** critic:Không có telemetry lỗi hay hiệu năng phía client

#### 74. Asset tách đôi: manifest được track liệt kê 360 GLB không có trong Git; 324 MiB media chưa ignore; dist không tái lập được

- **File:** `public/assets/space-typing/models/manifest.json:1`, `src/render3d/model-loader.ts:11`, `.gitignore`
- **Loại:** tooling · **Công sức:** M · **Xác minh:** confirmed (medium, hạ từ high)
- **Vấn đề:** Checkout sạch thiếu khoảng 180 model. dist local nặng 681 MB và có .DS_Store. Deploy là cp thủ công. Một lần `git add -A` lỡ tay sẽ đẩy art riêng lên repo công khai.
- **Ảnh hưởng:** Build CI khác máy dev; Defense không boot được trên build sạch; deploy không rollback được.
- **Cách sửa:** Sinh manifest từ file thật hoặc thêm bước media:pull; ignore models/**; viết check-model-manifest; build gói deploy trong CI.
- **Gộp từ:** tooling:Asset split-brain: manifest lists 360 GLBs not in Git

### Mức Thấp (11)

#### 75. Cloud (low): cổng /internal/admin chỉ dựa vào token tĩnh; register race, xóa tài khoản sót dữ liệu, tên cho phép ký tự bidi

- **File:** `cloud/src/worker.ts:286`, `cloud/src/crypto.ts:58`, `cloud/src/accounts.ts:374`, `cloud/src/accounts.ts:513`, `docs/CLAUDE_PROCESS_2026-10-17.md:287`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (low) x6, hạ từ medium
- **Vấn đề:** Token rỗng khớp chuỗi rỗng; LOCAL_DEV bật giá trị mặc định công khai; header actor giả được; một token E2E nằm trong doc được track. register bỏ qua change count nên verify token gắn sai email. deleteAccount sót liveops, ledger và nhóm sở hữu. Tên phi công cho phép bidi và zero-width.
- **Ảnh hưởng:** Một lỗi cấu hình là toàn quyền với kinh tế game; người chơi có thể giả danh 'Fleet Command'.
- **Cách sửa:** Token ≥ 32 ký tự, từ chối secret rỗng, LOCAL_DEV chỉ khi host loopback, rate limit 401, dùng Cloudflare Access; thay token trong doc và thêm gitleaks; kiểm changes trong register; xóa đủ dữ liệu khi xóa tài khoản; dùng chung một sanitizer cho tên và chat.
- **Gộp từ:** cloud:Admin API is public behind one static token; security-sweep:Cổng /internal/admin chỉ dựa vào một token tĩnh; cloud:Admin token committed in a tracked doc; cloud:Guest→registered upgrade ignores a failed UPDATE; cloud:Account deletion leaves data behind; security-sweep:Tên phi công cho phép ký tự bidi

#### 76. Bản build production chưa harden: không có CSP/frame-ancestors, admin-preview được deploy, handle __defense/__campaign3d, PARENT_ORIGIN cứng (low)

- **File:** `vite.config.ts:62`, `src/admin/asset-preview-main.ts:57`, `src/defense/main.ts:1884`, `src/campaign3d/main.ts:1759`, `src/learning/shared.ts:10`
- **Loại:** security · **Công sức:** S · **Xác minh:** confirmed (low) x5; finding critic đã spot-check
- **Vấn đề:** 0/8 trang có CSP hay frame-ancestors. admin-preview lấy origin cha từ document.referrer. window.__defense cho cộng năng lượng, finish(true) và gửi learning event giả. PARENT_ORIGIN = 'https://typing-game.local' được gắn cứng.
- **Ảnh hưởng:** Hiện chưa khai thác được, nhưng không có lớp chặn XSS hay clickjacking; tích hợp portal sẽ hỏng khi lên domain thật.
- **Cách sửa:** Chỉ build admin-preview và character-demo khi có cờ; thêm public/_headers (CSP, nosniff); chỉ đăng ký handle khi DEV hoặc ?dev; đọc PARENT_ORIGIN từ VITE_ allowlist; grep dist trong build.
- **Gộp từ:** security-sweep:Không có Content-Security-Policy; security-sweep:PARENT_ORIGIN hard-code host dev; main-a:PARENT_ORIGIN hard-code 'https://typing-game.local'; critic:Build production phát hành admin-preview, character-demo; render3d:Dev/cheat handles ship in production; tooling:window.__defense ships in production

#### 77. Duel (low): Ranked chưa có anti-cheat theo nhịp phím, mật khẩu phòng dò được, map ID chép tay 5 chỗ

- **File:** `src/duel/authority.ts:109`, `src/duel/room.ts:257`, `src/duel/protocol.ts:760`, `src/duel/maps.ts:234`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (low, hạ từ medium)
- **Vấn đề:** Kiểm soát duy nhất là trần 40 ký tự/s. JOIN_ROOM sai mật khẩu không bị làm chậm, và mật khẩu chỉ cần 4 ký tự. Danh sách 6 DuelMapId chép tay ở 5 module.
- **Ảnh hưởng:** Auto-typer leo được Ranked; người lạ chen vào phòng riêng; thêm map mà quên một chỗ thì lobby trống.
- **Cách sửa:** Hạ trần ký tự/s và gắn cờ khi phương sai nhịp phím quá thấp; khóa sau 5 lần sai mật khẩu; export DUEL_MAP_IDS từ maps.ts.
- **Gộp từ:** duel:Ranked thiếu kiểm soát gian lận; duel:Mật khẩu phòng riêng có thể bị dò; duel:Danh sách map ID bị copy tay ở 5 module

#### 78. Dependency có CVE ở toolchain dev (2 critical, 4 high), three.js ghim r170, hai bản sharp, không có bot cập nhật (low)

- **File:** `package.json:85`, `pnpm-lock.yaml`
- **Loại:** security · **Công sức:** M · **Xác minh:** confirmed (low): chỉ ở devDependencies
- **Vấn đề:** pnpm audit báo tinypool, sharp 0.34.5, vite 7.3.6 và vitest; dependency production sạch. sharp 0.34 và 0.35 cùng nạp trong một process test. Không có engines hay .nvmrc.
- **Ảnh hưởng:** Rủi ro trên máy dev khi xử lý asset từ bên ngoài; bỏ lỡ bản sửa của three.
- **Cách sửa:** Nâng sharp ≥ 0.35.5, vite ≥ 7.3.7, vitest ≥ 4.1.11; thêm audit vào CI; bật Renovate; nâng three từng bước với visual test; thêm engines.
- **Gộp từ:** security-sweep:Toolchain dev có lỗ hổng đã công bố; tooling:Vulnerable dev toolchain; tooling:Major dependencies are behind

#### 79. Cloud và state (low): cookie hỏng gây 500, OAuth không log, restore và outbox race, mail không được dọn, milestoneGrants vượt trần, code gift chết

- **File:** `cloud/src/http.ts:63`, `cloud/src/oauth.ts:232`, `cloud/src/admin.ts:235`, `cloud/src/liveops.ts:55`, `src/persistence/account-transactions.ts:470`, `src/liveops/runtime.ts:59`
- **Loại:** reliability · **Công sức:** M · **Xác minh:** confirmed (low) x6
- **Vấn đề:** decodeURIComponent trong readCookie không có try. Restore đọc rồi upsert revision+1 mà không kiểm phiên bản; outbox gửi trước rồi mới đánh dấu đã gửi. GET /liveops đọc mọi mail từng gửi. milestoneGrants tăng mãi tới trần 20.000 rồi làm tài khoản 'corrupt'. Router nguyên khối khiến auth phải opt-in theo từng route.
- **Ảnh hưởng:** Người chơi kẹt lỗi 500; restore của Admin bị mất; email gửi trùng; tài khoản lâu năm có thể nhận quà hai lần.
- **Cách sửa:** readCookie trả undefined khi lỗi và dùng prefix __Host-; log lỗi OAuth; upsert có điều kiện phiên bản; claim outbox trước khi gửi; dọn mail cũ; prune milestoneGrants theo ngày; xóa code gift phía client; dùng bảng route tập trung.
- **Gộp từ:** cloud:Robustness gaps (OAuth, cookie, restore, outbox); security-sweep:readCookie ném URIError; cloud:Every GET /liveops reads every broadcast mail; cloud:Monolithic routers make auth opt-in; state:account.milestoneGrants grows forever; state:Dead client-side gift-code matching

#### 80. Render (low): DPR tàu 3D, rác và particle mỗi frame, shadowBlur, ảnh không giải phóng, setTimeout gameplay, cấp phát ở Defense, vẽ nền đất

- **File:** `src/Game.ts:4879`, `src/Game.ts:11139`, `src/characters/ship-media-runtime.ts:152`, `src/enemies/painted-sprites.ts:82`, `src/campaign3d/main.ts:1115`, `src/defense/view/vfx.ts:123`, `src/defense/view/painter.ts:254`
- **Loại:** performance · **Công sức:** M · **Xác minh:** confirmed (low) nhiều finding; phần particle là plausible (low)
- **Vấn đề:** applyAdaptiveRenderScale không gọi setShip3DQuality. tickStatuses tạo mảng mới mỗi frame; chuỗi hsla được dựng cho từng particle; shadowBlur còn ở 22 chỗ. Ship art tải tuần tự và hỏng cả khi một ảnh lỗi; sprite vẽ tay không bao giờ được giải phóng. Campaign 3D hẹn sát thương boss bằng setTimeout bất chấp pause. Defense tạo Color mỗi frame và dùng splice O(n). paintGround tốn 6–12 ms cho mỗi thumbnail.
- **Ảnh hưởng:** Mỗi điểm đều nhỏ, nhưng cộng lại đi ngược mục tiêu FPS cao và không scale tới 400 quái.
- **Cách sửa:** Đo trước khi sửa. Gọi setShip3DQuality; dùng ring buffer và pool; cache style và dùng sprite glow thay shadowBlur; tải ảnh bằng allSettled kèm LRU; scheduler theo clock của run; dùng hằng Color và scratch vector; thu nhỏ và cache ảnh nền đất.
- **Gộp từ:** game-a:Adaptive resolution never tells the 3D ship renderer; game-a:Per-frame garbage; game-b:Particle draw builds one hsla string per particle; game-b:shadowBlur is still used; render2d:Published ship art loads all-or-nothing; render2d:Painted enemy/boss images are never evicted; render3d:Campaign 3D schedules gameplay with setTimeout; render3d:Per-frame allocations in Defense; render3d:Ground painting runs heavy work on the main thread

#### 81. DOM (low): restart animation ép reflow (HUD, 3D, chat, hud-fire), menu dựng lại dialog đang đóng, render gây autosave

- **File:** `src/main.ts:2567`, `src/main.ts:9742`, `src/main.ts:7563`, `src/campaign3d/main.ts:904`, `src/ui/chat-panel.ts:133`, `src/ui/hud-fire.ts:161`
- **Loại:** performance · **Công sức:** M · **Xác minh:** plausible (low) cho HUD + confirmed (low) x3
- **Vấn đề:** Mẫu `remove → offsetWidth → add` xuất hiện ở 7 chỗ trong main.ts và ở đường gõ sai của 3D. Lịch sử chat gây tới 50 lần reflow. renderServiceShop chạy lúc boot dù dialog đang đóng, và resolveRuntimeShop có thể autosave ngay trong render.
- **Ảnh hưởng:** Khựng nhẹ khi combat dày và khi mở chat; menu chậm dần; thứ tự lưu khó lường.
- **Cách sửa:** Dùng element.animate(); gom ghi HUD vào một rAF; append chat qua DocumentFragment; chỉ render dialog khi mở; resolve shop trong action open chứ không trong render; dừng spin của model-icon khi element bị gỡ khỏi DOM.
- **Gộp từ:** main-a:HUD trong combat ép layout đồng bộ; main-b:Menus rebuild full DOM and a render function triggers autosaves; input:3D modes force a synchronous layout on every missed key; render2d:Forced synchronous layouts: chat history and HUD fire loop

#### 82. Âm thanh (low): crossfade vẫn kêu khi pause, churn node, setTimeout nối âm, tạo buffer giữa combat, resolver nhạc trùng, thiếu test lifecycle

- **File:** `src/audio/MusicController.ts:609`, `src/audio/Sfx.ts:1342`, `src/audio/duel-sound.ts:518`, `src/audio/music-library.ts:27`, `src/audio/world-music-adapter.ts:21`
- **Loại:** performance · **Công sức:** M · **Xác minh:** confirmed (low) nhiều finding; phần churn node là plausible (low)
- **Vấn đề:** setPaused bỏ qua các track đang fade out. Một từ hạ quái tạo khoảng 74 node, và Sfx không có ngân sách voice. 25 offset nhạc dùng setTimeout. Impulse của Duel được tạo ở lần play đầu. Game và Admin preview đi qua hai resolver catalog khác nhau, và chỉ dùng nguồn đầu tiên. SceneAudio không có test.
- **Ảnh hưởng:** Nhạc vẫn kêu sau menu pause; có thể crackle; khựng ở đầu trận Duel; preview có thể khác nhạc trong game.
- **Cách sửa:** Pause cả track retiring; dùng voice group và ngân sách voice; lập lịch theo currentTime; dựng buffer khi unlock; dùng một resolver duy nhất và truyền mọi candidate; thêm test lifecycle bằng fake AudioContext.
- **Gộp từ:** audio:Pausing during a music crossfade leaves the outgoing track playing; audio:Per-event Web Audio node churn; audio:setTimeout sequencing in Sfx; audio:Reverb impulse and noise buffers generated at first use; audio:Duplicated music-catalog resolvers; audio:Test gaps on lifecycle paths

#### 83. Game.ts và input (low): destroy() rò boss relief, tạo Enemy chép 3 lần, reward clear-normal bỏ qua kế toán, hook đồng bộ, voice ownership chỉ sống trong test

- **File:** `src/Game.ts:1341`, `src/Game.ts:6903`, `src/Game.ts:9120`, `src/main.ts:5046`, `src/input/target-registry.ts:28`, `src/Game.ts:4477`
- **Loại:** maintainability · **Công sức:** M · **Xác minh:** confirmed (low) x6; phạm vi một phần đã được verifier thu hẹp
- **Vấn đề:** destroy() không dispose bossRelief, và load muộn vẫn gắn vào instance đã chết. Enemy được tạo bằng 3 object literal; split fragment bỏ RNG seeded. clear-normal chỉ filter danh sách enemy. onCombatCreditReward đổi ví trong lúc giải quyết kill. TargetRegistry chỉ được test dùng; getVoiceTargets() có side effect.
- **Ảnh hưởng:** Rò GPU khi QA lâu trong Test Lab; luật enemy mới phải thêm ở 3 chỗ; luật công bằng của voice dễ vỡ khi refactor.
- **Cách sửa:** Thêm cờ destroyed và dispose; viết factory createEnemy; cài clear-normal qua resolveSkillEnemyKill hoặc gỡ; emit stats tối đa một lần mỗi frame; tách syncVoiceUnits khỏi snapshotVoiceTargets; nối hoặc xóa TargetRegistry.
- **Gộp từ:** game-a:destroy() leaks GPU resources; game-b:Copy-pasted Enemy construction has drifted; game-b:The 'clear-normal' reward removes enemies without accounting; game-b:Game is tightly coupled to main.ts through 24 synchronous hooks; input:Tests cover TargetRegistry, which production never uses; input:getVoiceTargets() changes state

#### 84. Code chết và helper chép (low): 3 mô hình crash-recovery, 4 bản EnemyKind, route-events.ts, glow sprite và validator chép, VFX nguyên khối

- **File:** `src/persistence/checkpoint.ts:104`, `src/persistence/crash-recovery.ts:171`, `src/Game.ts:919`, `src/vfx/skill-fx.ts:75`, `src/equipment/loadout.ts:409`
- **Loại:** maintainability · **Công sức:** M · **Xác minh:** confirmed (low) x4
- **Vấn đề:** Có 103 export không được tham chiếu, và route-events.ts không được import. Hai hàm sanitizeCrashRecoverySnapshot khác kiểu nhưng trùng tên. ALL_ENEMY_KINDS là bản thứ 4 của danh sách. Có 4–5 factory glow giống nhau; clamp được chép ở 6 file; 4 validator equipment gần như giống hệt nhau. SkillFxSystem dài 1.439 dòng và dùng một switch.
- **Ảnh hưởng:** Dễ auto-import nhầm và làm sai dữ liệu crash recovery; hành vi lệch giữa các bản chép.
- **Cách sửa:** Xóa bằng knip; export ENEMY_KINDS as const; gom helper toán, màu và DOM vào một module; validator dạng bảng; dùng registry effect, mỗi họ effect một file; chuyển src/balance sang tools/.
- **Gộp từ:** architecture:Code chết và các mô hình trùng tên; game-a:Dead code, misleading public APIs and a 4th enemy-kind list; render2d:The same helpers and sprite factories are copy-pasted; render2d:VFX modules are monolithic closed unions

#### 85. Tooling (low): GLB boss legacy 12,5 MB chết, mirror GitLab force-push --prune, 73 script và pnpm check khác CI

- **File:** `src/boss/model-3d-contract.ts:20`, `.github/workflows/gitlab-mirror.yml:46`, `package.json:25`
- **Loại:** tooling · **Công sức:** S · **Xác minh:** confirmed (low) x3
- **Vấn đề:** tyrant-g01.glb được track và deploy dù runtime không đọc. Mirror force-push kèm --prune mỗi lần push và mỗi giờ, nên một lần xóa nhầm lan sang GitLab. Lệnh check khác bộ kiểm tra CI chạy.
- **Ảnh hưởng:** 12 MB thừa trong mỗi deploy; mirror không dùng được làm backup; dev không tái lập được CI bằng một lệnh.
- **Cách sửa:** Xóa GLB legacy và field url; bỏ --prune và bảo vệ nhánh trên GitLab; thêm `pnpm verify` dùng chung cho CI và dev; gom các audit vào một process.
- **Gộp từ:** tooling:Dead 12.5 MB legacy boss GLB; tooling:GitLab mirror force-pushes with --prune; tooling:Tooling sprawl: 73 npm scripts

