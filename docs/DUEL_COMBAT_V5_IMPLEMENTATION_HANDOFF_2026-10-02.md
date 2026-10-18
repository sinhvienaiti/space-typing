# Duel Combat V5 — Bàn giao triển khai

> **Cập nhật 2026-10-03: V6 auto-combat, xem mục 9.** Những hướng dẫn Arsenal/Space/1–7 và tích kho trong mục 1–8 là lịch sử V5, không còn áp dụng cho trận mới. Desktop đã đổi sang ngang; gõ xong vật phẩm tự kích hoạt.

> Bàn giao mới nhất cho Claude, gồm lỗi còn tồn tại và số đo thực: [CLAUDE_HANDOFF_DUEL_AUTO_COMBAT_HORIZONTAL_2026-10-03.md](CLAUDE_HANDOFF_DUEL_AUTO_COMBAT_HORIZONTAL_2026-10-03.md).

Ngày: 2026-10-02. Phạm vi: code Space Typing trong working tree hiện tại; không commit/push và không thay thế các thay đổi artwork có sẵn của chủ dự án.

> Cập nhật theo yêu cầu tái sử dụng Campaign: đường render chính hiện dùng `PlayerShotSystem` và `drawCharacterShip`, không còn dùng cặp vệt CSS xanh/cam làm đạn chính. CSS chỉ là fallback khi renderer không có sẵn.

## 1. Kết quả và giới hạn

Đã triển khai vòng combat chính: gõ đúng → hai nòng pháo bắn → đạn bay đến đối thủ → xác nhận va chạm/sát thương → phản hồi hình ảnh và âm thanh. Không còn phụ thuộc vào việc hoàn thành một từ thuộc nhóm tấn công mới có đạn chính.

Đây là thay đổi gameplay và cách trình diễn bằng asset hiện có, **không phải hoàn tất bộ artwork chất lượng như ảnh concept**. Thân tàu, động cơ, bolt/finisher/muzzle/impact và recipe đạn được dùng lại từ Campaign; các biểu tượng mục tiêu vẫn dùng bộ ảnh hiện tại. Chưa tạo thêm ảnh AI hay âm thanh mới. Chưa chứng nhận FPS ổn định mọi tình huống trên máy của chủ dự án, chất lượng nghe thực tế, cân bằng Ranked, hoặc đồng bộ qua mạng có độ trễ cao.

## 2. Những nguyên nhân đã xử lý

| Vấn đề trước | Thay đổi |
| --- | --- |
| Gõ từ hỗ trợ/tích trữ không tạo đòn đánh; micro-FX quá nhỏ | Pháo chính hoạt động theo tiến độ gõ đúng, độc lập với loại skill |
| Kỹ năng được tích trữ nhưng bảng sử dụng bị ẩn | Arsenal hiện ở dưới màn hình; click, Space và phím 1–7 |
| HP giảm ngay khi phát sự kiện bắn | Pháo chính và damage của attack/combo dùng hàng đợi sát thương theo thời gian bay |
| Đạn chạy bằng tọa độ phần trăm/viewport, không bám đúng tàu | Tính điểm xuất phát và đích từ hình học DOM của hai tàu |
| Threat đã gây damage lại mới phát animation bay | Khi threat kết thúc, phát impact trực tiếp; không thêm một chuyến bay giả sau sát thương |
| Quá nhiều mục tiêu phân tán sự chú ý | Mặc định ba private word targets ở hai bên, giữ hành lang giữa cho đạn |
| Tàu Campaign còn xuất hiện dưới PvP | Khi Duel hoạt động, giữ background nhưng bỏ draw/update combat Campaign; khôi phục khi thoát |
| Explosion thông thường chiếm quá nhiều màn hình | Pháo chính dùng impact gọn; thu nhỏ vùng blast/shockwave của đòn nặng |

## 3. Luật combat đang áp dụng

- Hai vị trí ký tự mới được gõ đúng nạp một phát pháo chính.
- Một phát thể hiện bằng **hai vệt đạn**, nhưng chỉ gây **1,5 damage tổng**, không nhân đôi damage theo số sprite.
- Thời gian bay pháo chính: 360 ms trên đồng hồ authority; sát thương đi qua hệ thống shield/hull hiện có.
- Giới hạn phát bắn cách nhau ít nhất 120 ms; lượng nạp chờ tối đa bốn đơn vị và chỉ phát tiếp khi có tiến độ gõ mới, không tự bắn lúc bỏ bàn phím.
- Ký tự sai hoặc input sequence gửi lại không tạo phát bắn mới.
- Hủy target rồi gõ lại cùng prefix không cho farm damage: hệ thống lưu mốc tiến độ theo player/target trong từng round.
- Attack thường và combo gây damage chờ thời gian bay theo projectile-speed modifier. Tiêu hao tài nguyên vẫn xảy ra lúc sử dụng.
- Hazard, fate và hiệu ứng khác không phải projectile vẫn theo luật riêng. Không khẳng định tất cả thay đổi HP đều bắt nguồn từ đạn.
- Round reset/kết thúc xóa damage còn đang bay. Damage được authority tính; callback animation không được quyền trừ HP.
- Local Practice, online authority và Duel Test Lab bật cơ chế mới. Cấu hình engine độc lập mặc định vẫn giữ chế độ cũ để các bài kiểm tra luật riêng không bị phụ thuộc vào pháo chính.

Các con số trên là balance đã đưa vào code, **chưa được xác nhận cân bằng dài hạn bằng dữ liệu người chơi**. Đặc biệt cần theo dõi thời lượng trận và lợi thế WPM trước khi sử dụng cho Ranked thực tế.

## 4. Điều khiển và trình diễn

1. Gõ từ đang thấy hoặc click chọn mục tiêu rồi gõ.
2. Trong quá trình gõ đúng, tàu bắn cặp đạn chính theo **recipe/ảnh của đúng phi thuyền**, không ép xanh/cam theo phe. Vanguard, Reaper, Volt, Arsenal… giữ hình dạng, màu, đuôi và chuyển động riêng từ Campaign.
3. Hoàn thành từ vẫn thực hiện chức năng skill tương ứng; có skill tác dụng ngay và có skill vào kho.
4. **Space:** dùng attack đầu tiên trong kho. **1–7:** dùng entry theo số hiện trên arsenal. Có thể click trực tiếp; khi thiếu năng lượng hoặc đang cooldown, nút bị vô hiệu hóa. Authority vẫn kiểm tra khi nhận phím tắt.
5. **Esc:** hủy target đang khóa.
6. Có muzzle flash, số damage, phản hồi shield/hull và hiệu ứng vỡ shield. Tàu đặt phía trên arsenal để không bị che.

Âm thanh tái sử dụng hệ thống cue hiện có: primary launch phát khi bắn, primary impact phát khi nhận `cannon-hit`; combo có launch/impact theo thời gian bay. Không coi test routing là bằng chứng âm thanh đã nghe hay hoặc đủ lực.

## 5. Các điểm kỹ thuật quan trọng

- `src/duel/engine.ts`: cannon, chống lặp prefix, damage queue, delay attack/combo.
- `src/duel/local-match.ts`, `src/duel/authority.ts`: bật luật mới cho trận thực tế.
- `src/test-lab/duel-test-lab.ts`: dùng cùng luật cannon cho lab.
- `src/duel/battle-ui.ts`: arsenal, phím tắt, hình học đường đạn, damage feedback, cleanup animation/timer, chống lặp event cannon gần đây.
- `src/duel/combat-visuals.ts`: adapter dùng chung renderer Campaign, không xử lý damage. Practice lấy tàu đang chọn trong Campaign nếu room chưa chỉ định; online vẫn theo appearance từ authority. Không nhập chỉ số nâng cấp Campaign vào Duel.
- `src/vfx/player-shots.ts`: thêm tùy chọn clock flight/authority impact và chu kỳ nòng riêng cho mỗi tàu; mặc định Campaign không đổi.
- `src/vfx/player-shot-sprites.ts`: giải mã nền đen của ảnh phát sáng sang alpha một lần khi tải; bảo toàn năng lượng RGB nhân alpha cho additive blending. Cache ImageBitmap nếu trình duyệt hỗ trợ. Không sửa file ảnh trên ổ đĩa.
- `src/duel/battle.css`: vùng chiến đấu, tracer, hit effects, arsenal và màu resource.
- `src/duel/audio.ts`: ánh xạ cue theo sự kiện mới và chỉnh thời điểm threat impact.
- `src/Game.ts`, `src/main.ts`: tách presentation Duel khỏi combat Campaign, vẫn giữ cả background blit và layered.
- `src/duel/model.ts`: private offer count = 3; content version `duel-final-v5-combat`.
- `src/duel/protocol.ts`: protocol version = 5. Online client và server phải cập nhật cùng phiên bản.

Số projectile visual vẫn có cap 18; transient FX giữ cap hiện có. Animation/shot pool được dọn khi đổi round/thoát. Mốc damage chính phụ thuộc authority, không phụ thuộc tốc độ render. Đây là các giới hạn kỹ thuật, không phải chứng nhận FPS.

Tối ưu renderer: không thêm canvas full-screen được composite lên DOM trong đường chạy chính. Hiệu ứng được cache/vẽ ở hành lang rộng tối đa 460 CSS px; thân tàu/light rig vẽ trên surface nhỏ 200×200 CSS px, cập nhật ánh sáng tối đa 30 Hz. Sau đó ghép vào canvas Game đang dùng. Projectile vẫn cập nhật theo frame. Không đổi lựa chọn High/Ultra của người dùng thành Low.

Adapter quy đổi tọa độ CSS của arena sang kích thước logic của Game khi ghép canvas: cần thiết vì Game giữ kích thước logic tối thiểu trên khung hẹp/thấp. Có test resize, tỷ lệ ghép, cân bằng save/restore và giới hạn tần suất repaint thân tàu. Đây chưa phải nghiệm thu toàn bộ giao diện mobile. Nếu trình duyệt tạo ImageBitmap thất bại, giữ canvas alpha đã giải mã làm nguồn ảnh thay vì bỏ mất artwork.

## 6. Kiểm tra đã chạy

- Toàn bộ Vitest ở bản bàn giao cuối: **1.356/1.356 test PASS**, 223 file, chạy `--maxWorkers=2`; không skip. Bao gồm ba test mới cho canvas scale/cache/resize. Một lần chạy trước đó đồng thời với Chrome có một lỗi audit economy; các lượt chạy lại toàn bộ với hai worker đã qua, không sửa test economy hoặc tăng timeout để bỏ qua lỗi.
- TypeScript client và server: kiểm tra riêng với `--noEmit`.
- Vite production build: đã chạy trực tiếp, tránh lifecycle tự prepare/rewrite asset.
- Có cảnh báo chunk JS vượt 500 kB; không coi bundle/performance là đã tối ưu hoàn toàn.
- `git diff --check` cho source/test: không có lỗi whitespace.
- Chrome Local Practice, viewport 1642×799, DPR 2: tự gõ và sử dụng skill; đã quan sát ba target, arsenal hiện, đạn hai phía và thay đổi shield/hull. Không có JavaScript exception trong các lần kiểm tra.
- Dev standalone có cảnh báo shared vocabulary không sẵn sàng và dùng fallback. Chưa chứng nhận endpoint từ vựng của Portal qua lần chạy standalone này.

Test mới bao phủ: damage chỉ đến sau flight; input sai/replay; giới hạn burst; hai phía cùng bắn; reset xóa projectile damage; chống cancel/retype farming; delay laser; delay combo cả direct và intent; audio launch/hit; Campaign không được vẽ lẫn với Duel.

Đã cập nhật test artwork vốn chỉ chấp nhận SVG để hỗ trợ WebP/PNG hiện có, đồng thời kiểm tra hash, kích thước, pixel alpha trong suốt và pixel vật thể. Không tự đổi asset để làm test qua. Kiểm tra alpha **không thay thế** duyệt viền/matte bằng mắt; ảnh raster chưa có OCR kiểm tra chữ.

Kết quả máy đọc được cuối: `../.visual/duel-reuse-tests-final.json` (1.356 test, success=true); lượt trước: `../.visual/duel-reuse-tests.json` (1.353 test). Thư mục `.visual` được Git ignore; các ảnh dưới đây là bằng chứng local, không tự đi kèm khi gửi riêng file Markdown.

### Ảnh đã mở và tự kiểm tra

- [Play mới nhất, gõ/bắn thời gian thật](../.visual/duel-reuse-play-final.png): `https://space.typing-game.local/`, 1642×799 DPR 2, sau production build. Đạn Reaper có hình cong đỏ và đuôi riêng; tàu dùng Campaign renderer; nhãn input lệch sang trái, không đè lên thân tàu. `logs=[]`, `exceptions=[]`.
- [Hai phía đang bắn — chẩn đoán dừng hình](../.visual/duel-reuse-flight.png) và [phóng to Vanguard/Reaper](../.visual/duel-reuse-flight-detail.jpg): hình dạng đạn xanh/đỏ khác nhau; không thấy nền chữ nhật đen trong vùng đã soi. Lượt này **đóng băng presentation để soi sprite**, không dùng làm bằng chứng về đồng bộ damage hoặc FPS. Authority vẫn chạy. Cả hai tàu đã tải đủ bolt/finisher/muzzle/impact.
- [Gallery Campaign sau thay đổi dùng chung](../.visual/campaign-shots-regression.png): Vanguard vẫn bắn đạn ảnh có đuôi/impact, đã tải đủ bốn sprite, không có lỗi JS. Đây là smoke test Vanguard, không phải duyệt bằng mắt đủ 11 tàu.
- Các ảnh `duel-combat-v5-final.png` (CSS cũ), `duel-reuse-after*.png`, `duel-reuse-shared-canvas.png`, `duel-reuse-final.png` là ảnh chẩn đoán trung gian, **không dùng thay ảnh bản bàn giao mới nhất**.

Đo sơ bộ cho thấy bản ghép renderer đầu tiên chậm đáng kể; đã đổi sang cache surface nhỏ/bitmap. Lượt cache không chạy full test đồng thời ghi nhận p50 ≈ 16,7 ms, p95 ≈ 33,3 ms, 6/431 khung vượt 33,4 ms. Baseline CSS trước đó p50 ≈ 16,7 ms, p95 ≈ 16,8 ms. Hai lượt khác seed/tải máy, nên không coi đây là benchmark đối chứng tuyệt đối; **chưa PASS mục tiêu không giảm hiệu năng**. Lượt chạy full test song song Chrome có p95 rất cao, không dùng để đánh giá chất lượng renderer. Cần đo lại ổn định, cùng seed và cùng điều kiện nhiệt/tải trước khi chốt performance.

### Đo lại sau tối ưu, không chạy build/test đồng thời Chrome

| Kiểm tra | p50 frame | p95 frame | Ghi chú |
| --- | --- | --- | --- |
| A/B cùng phiên: bật renderer, lượt 1 | 16,6 ms | 18,4 ms | CPU renderer p95 2,0 ms |
| A/B cùng phiên: tắt renderer, lượt 1 | 16,7 ms | 17,6 ms | Không vẽ tàu/FX của adapter |
| A/B cùng phiên: bật renderer, lượt 2 | 16,8 ms | 18,4 ms | CPU renderer p95 1,9 ms |
| A/B cùng phiên: tắt renderer, lượt 2 | 16,7 ms | 17,8 ms | Cùng browser/background |
| Play mới nhất, tự gõ 120 ký tự và kích skill | 16,7 ms | 33,3 ms | 665 mẫu, 15 mẫu >33,4 ms; không freeze |

A/B dùng `../.visual/duel-render-ab.js`, ảnh `duel-reuse-cached-ab.png`; bốn pha 150 RAF/pha, bỏ 10 mẫu đầu. Cảnh vẫn tiến triển theo thời gian, không phải benchmark cùng seed được replay chính xác; A/B cũng không tự gõ liên tục như bài Play. Kết quả cho thấy chi phí adapter đã giảm rõ so với bản đầu, nhưng **không chứng minh 60 FPS ổn định cả trận**. Lượt Play trước đó (`duel-reuse-play.png`) có p50 33,3 ms/p95 50 ms; giữ số này để thể hiện độ biến động theo tải/nhiệt, không xóa để chỉ báo cáo lượt tốt.

### Lệnh xác minh không tự prepare artwork

```bash
cd /Users/jokerit/htdocs/typing-game/games/space-typing
pnpm exec vitest run --maxWorkers=2
pnpm exec tsc -p tsconfig.json --noEmit
pnpm exec tsc -p tsconfig.server.json --noEmit
pnpm exec vite build
```

Các lệnh trên không tương đương tất cả asset-budget/integrity gates của `pnpm build`. Chưa tuyên bố toàn bộ pipeline `pnpm build` đã PASS; `prebuild` có bước tái tạo artwork nên không tự chạy trên bộ art đang sửa của chủ dự án.

## 7. Cách mở bản đã sửa và nghiệm thu tiếp

1. Tải lại trang game và bắt đầu **trận Practice mới**; không dùng trận cũ mở từ trước khi đổi code.
2. Gõ cả từ hỗ trợ: phải thấy pháo chính bay, dù từ chưa hoàn thành. Tắt tiếng vẫn phải hiểu hướng tấn công.
3. Xem shield trước hull: hull chưa giảm không có nghĩa là không gây damage.
4. Tích missile/bomb rồi Space; quan sát launch, flight, hit. Đòn có counter window tuân theo thời điểm resolve của threat.
5. Thoát Duel, kiểm tra màn Campaign/title hiện lại tàu bình thường và không còn FX Duel tồn đọng.
6. Nếu dùng online, khởi động lại Duel server bằng phiên bản mới và reload cả hai client; protocol cũ không tương thích. Chưa chạy nghiệm thu hai máy có jitter/reconnect trong đợt này.
7. Duyệt lại trên màn hình/mức chất lượng thường chơi và nghe loa/tai nghe. Đã có đo thăm dò/A–B trên máy Mac hiện tại như trên; chưa có benchmark lặp lại có kiểm soát cùng seed/nhiệt hoặc nghiệm thu đầy đủ giao diện mobile.

## 8. Phần chưa được gọi là hoàn tất

- Chưa thay bộ target đơn giản bằng artwork chi tiết giống ảnh demo; không nên hiểu việc có projectile là đã đạt toàn bộ art direction.
- Chưa làm flipbook/VFX atlas điện ảnh mới hay thiết kế lại pack âm thanh.
- Chưa chứng minh FPS/độ nóng máy được cải thiện bằng phép đo đối chứng.
- Online có thể có chênh lệch thời điểm visual theo độ trễ nhận event; primary HP vẫn do authority quyết định. Reconnect giữa chuyến bay chưa có cơ chế dựng lại projectile cũ từ snapshot.
- Những skill/control chiến thuật ngoài arsenal vẫn theo UI hiện tại; không tuyên bố đã thiết kế lại mọi hệ thống phụ của Duel.

Không có thao tác commit, push, reset Git, xóa save hoặc ghi đè artwork của người dùng trong phần triển khai này.

## 9. Cập nhật 2026-10-03 — Horizontal + auto-activation

### Luật hiện tại, thay thế yêu cầu kho đầy trước đó

- Tất cả vật phẩm nhận bằng typing được kích hoạt khi hoàn thành từ. Không cất kho, không cần click item/Space/1–7. Damage vẫn đi theo thời gian bay hiện có, không cộng thêm một lần do animation.
- Giữ nguyên effect, chi phí năng lượng, hồi chiêu, chất lượng gõ và phản đòn. Không có hàng đợi tự bắn ngầm khi thiếu năng lượng.
- Từ thiếu năng lượng/hồi chiêu được làm xám, hiển thị lý do và không nhận click/prefix từ bàn phím. Nếu tài nguyên thay đổi khi đang gõ, giữ prefix và hiện lý do; có thể Esc đổi từ. Không tính phím bị chặn là lỗi chính tả.
- Draft giữ một mục ENERGY không tốn năng lượng, không hồi chiêu để luôn có đường nạp lại. Token của nó vẫn qua Word Director, không cố định từ `energy`. Khi gõ từ nạp năng lượng, pháo chính vẫn hoạt động như các từ khác.
- Áp dụng cho Practice, Friend/Ranked authority, bot và Duel Test Lab. Engine generic vẫn giữ chế độ inventory cũ cho regression tests; không phải tùy chọn UI trong trận live. Không xóa dữ liệu Campaign hay item Campaign.
- Client prediction dùng cùng bản action instant như authority. Protocol tăng lên 6, content `duel-final-v6-auto-combat`: restart Duel server và reload cả hai client khi chơi online; bắt đầu trận mới. Không chuyển đổi trận đang mở từ V5.

### Bố cục và renderer

- Container rộng >=960 px và tỉ lệ >=1,25 dùng ngang: YOU ở 12% chiều rộng, RIVAL ở 88%, cùng 50% chiều cao. Màn hẹp/portrait giữ dọc.
- Xoay tàu, vị trí nòng, đuôi động cơ, đường đạn và telegraph; word targets trên/dưới corridor. HUD YOU dưới trái, RIVAL dưới phải, clock trên phải; chữ không bị xoay.
- Giữ `drawCharacterShip`/`PlayerShotSystem` Campaign; thêm flat-depth cho horizontal Duel, không đổi perspective Campaign.
- FX surface ngang giới hạn 260 CSS px chiều cao thay vì full-screen, DPR cap 1,5 như trước; cache thân tàu 30 Hz. Chưa tuyên bố mọi mức FPS đều ổn định.

### Kiểm thử và giới hạn

- Test riêng cho từng loại banked cũ: hoàn thành -> một activation, kho rỗng, chi phí một lần, chống replay; damage trì hoãn theo flight; chống tiêu quá năng lượng trong cùng tick; prediction và recovery word; Practice wiring.
- Kiểm tra TypeScript client/server và Vite trực tiếp, không chạy hook prepare-art của `pnpm build` để giữ nguyên artwork đang sửa.
- Asset gate hiện có lỗi: `spark-burst.webp` max alpha 98, `debris-burst.webp` 51, `precision-burst.webp` 95 nên không đạt assertion có pixel alpha >128; riêng `missile-salvo.webp` max alpha **0**, toàn ảnh trong suốt. Chưa sửa/ghi đè ảnh và chưa nới test để che lỗi. Đây là vấn đề riêng của asset, không phải lỗi logic auto-use; cần xử lý artwork trước khi gọi toàn bộ repo PASS.
- Các ảnh `duel-horizontal-bank.png` và `duel-horizontal-reopened.png` chỉ ghi nhận bước trung gian trước yêu cầu bỏ kho, không đại diện bản V6.
