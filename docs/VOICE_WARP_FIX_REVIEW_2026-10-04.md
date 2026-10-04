# Voice + Warp Charge — kiểm tra và sửa lỗi 2026-10-04

## Kết luận

Đã sửa lỗi tải model gây `Offline model checksum failed`, lỗi từ counter mặc định chặn Voice/Hybrid và vị trí hiển thị Warp Charge. **Chưa được coi toàn bộ Voice combat là PASS:** kiểm tra Portal + gameplay trên máy hiện tại vẫn tái hiện quá tải xử lý âm thanh. Nhận dạng chạy riêng đã đọc được lời nói tổng hợp, nhưng đó không thay thế kiểm tra dưới tải game hay micro thật.

**Lượt review tiếp theo cùng ngày:** đã tối ưu resampler, sửa lifecycle mic và bảo vệ dữ liệu giao dịch Warp đang chờ ghi, bổ sung giá/lý do khóa Refuel. 77 test Voice và 134 test game liên quan pass. Hai lần kiểm tra **lời nói tổng hợp + combat** vẫn overflow; không lấy lần silence-only pass để chứng nhận Voice combat.

Không reset save, không sửa số dư tài khoản của chủ máy, không commit/push. Mọi test trình duyệt dùng profile Chrome tạm và âm thanh tổng hợp. Giữ nguyên thay đổi media đang có trong working tree.

## Phạm vi

- Parent repository HEAD lúc bắt đầu: `85e705f`, branch `feat/space-voice-platform`.
- Space Typing HEAD lúc bắt đầu: `57501cf`, bao gồm các commit người dùng chỉ định: `c312dd5`, `65f1c43`, `58109b1`, `2a6436b`, `33275b3` và bản sửa progress/timeout mới hơn.
- Kiểm tra cả Portal (nơi giữ micro/model/Worker) lẫn game (nơi nhận detection, quản lý mode, ví Warp và UI).
- Đọc `docs/PROJECT_CONTEXT.md`, tài liệu visual testing và code liên quan. Đây không phải chứng nhận mọi tính năng/mọi đường đi của repository không còn lỗi.

## 1. High — server trả archive như HTTP gzip encoding: ĐÃ SỬA

**Vị trí:** parent `scripts/offline-vosk-plugin.mjs`, mới `scripts/voice-model-middleware.mjs`.

Model trên đĩa đúng pin:

- File: `vosk-small-en-us-0.15-space-endpoint-v1.tar.gz`.
- Kích thước: 41,116,554 byte.
- SHA-256: `45237278eca199c8d4d3040e95b59cf2d9c0cc388727f65bcd0b2352719057f6`.

Trước sửa, dev HTTP trả `Content-Encoding: gzip` cho chính archive. Fetch tự giải nén theo HTTP; dữ liệu nhận được không còn là `.tar.gz` mà verifier đang so hash. Vì vậy có thể cấp quyền mic thành công nhưng vẫn lỗi checksum. Đã tái hiện cả qua Vite và đường HTTPS nginx proxy.

**Sửa:** middleware đúng một URL model, phục vụ archive nguyên byte với `Content-Type: application/gzip`, đúng Content-Length, không Content-Encoding; hỗ trợ GET/HEAD và dev/preview. Thiếu model trả 404, không trả index.html. Không đổi hash, không tắt kiểm tra toàn vẹn.

**Độ chắc chắn:** cao, đã đối chiếu file, HTTP header và chạy model thật trong Chrome sau sửa.

Production hosting khác vẫn phải giữ đúng quy tắc HTTP này. Middleware Vite không tự cấu hình mọi CDN/web server bên ngoài.

## 2. Medium — cache hỏng gây lỗi lặp lại: ĐÃ SỬA

**Vị trí:** parent `portal/src/voice/model-cache.ts`, `shared/voice/verified-asset.mjs` và declaration/test tương ứng.

Cache cũ có thể chứa dữ liệu không đúng pin. Bản sửa xác minh cả cache; khi sai thì xóa đúng entry hỏng, tải lại từ local server một lần và tiếp tục kiểm tra size/hash. Dữ liệu network sai không được dùng hoặc ghi cache. CacheStorage không khả dụng không ngăn sử dụng dữ liệu local đã xác minh. Abort không kích hoạt tải sửa cache.

Không cần xóa toàn bộ dữ liệu site hoặc save game để chữa lỗi này.

## 3. High — từ boss `unbind` chặn mọi Voice/Hybrid: ĐÃ SỬA

**Vị trí:** game `src/boss/skills.ts` → `COUNTER_WORDS.break`; `Game.getVoiceVocabularyForms()` đưa toàn bộ counter vào preflight.

Model pinned không có `unbind`, nhưng game kiểm tra từ đó ngay cả khi chưa gặp boss. Sau sửa checksum, Portal thực tế báo `Model cannot recognize: unbind…`.

**Sửa:** thay từ counter này bằng `unlock`, có trong từ điển đã xác minh. Spawn và preflight dùng chung danh sách nên không tạo tình trạng preflight pass nhưng boss lại spawn từ cũ. Thêm regression test. Không bỏ qua unsupported-vocabulary gate; bộ từ tùy chỉnh ngoài model vẫn có thể bị từ chối đúng thiết kế.

**Độ chắc chắn:** cao, quan sát thông báo thực tế và đối chiếu dictionary.

## 4. Medium — stamina có dữ liệu nhưng nằm sai vùng UI: ĐÃ SỬA

**Vị trí:** game `index.html`, `src/main.ts::renderWarpHud`, `src/ui/warp-charge.css`, mới `src/ui/warp-hud.ts`.

- HUD cũ bị ẩn trên title screen, nên người dùng không thấy Warp cạnh tên/level tàu.
- Depot đặt trong Campaign card bị clipping ở viewport thực tế.
- Đã đặt progress bar Active Warp dưới phần level/stage trong thẻ phi công, kèm số dư, Reserve và ETA hồi +1.
- Nút `+` mở dialog Refuel/Reserve/abandon/correct-clock, không bị Campaign card cắt mất.
- Thông báo thao tác/lỗi hiển thị cả trong dialog, tránh chỉ hiện toast phía sau modal.
- UI đọc cùng account đã reconcile; không tạo ví thứ hai, không sửa giá hay cap.

**Kiểm chứng số dư:** Chrome profile tạm thực sự deploy: IndexedDB `100 → 90`, attempt `active`, HUD `90/100`. Practice qua Portal giữ `100/100`.

## 5. High — quá tải ASR dưới tải combat: CHƯA PASS

**Vị trí:** parent `portal/src/voice/runtime.ts`, `capture.worklet.ts`, `decoder.ts`; tải renderer game cũng liên quan nhưng chưa cô lập đầy đủ tỷ trọng CPU của từng phần.

Phép đo ban đầu cho thấy first-window decoding có lần khoảng 1,3 giây; hàng đợi cũ chỉ có 3 block × 100 ms. Runtime có thể tự ngắt ngay sau khi kết nối. Không phải lỗi cấp quyền micro.

Đã triển khai các giảm nhẹ có giới hạn:

- Prime **chính recognizer sẽ nhận live audio** bằng một giây im lặng trước khi mở capture gate. Prime recognizer tạm khác không đủ vì chi phí first-window còn nằm ở mỗi recognizer.
- Trừ đúng prefix synthetic khỏi sample origin để timestamp lời nói thật không lệch một giây.
- Abort/timeout hữu hạn cho bước prime, không nhận audio muộn sau hủy.
- Cùng một policy cho worklet/runtime: block 100 ms, tối đa 10 block outstanding. Đây là trần đệm một giây, **không phải đợi đủ một giây mới giải mã**.
- Bỏ qua overflow từ generation cũ. Vẫn dừng an toàn khi thực sự quá tải; không lặng lẽ bỏ audio, không nối sai timestamp, không nới freshness/ownership gates để nhận kết quả cũ.
- Thông báo overload phân biệt với checksum/permission.

**Kết quả thực tế:**

- Chạy riêng trong Chrome: 150 block/15 giây, nhận `apple`, `reactor`, `shield`, `energy`, `hello`, `world`; không runtime error trong lần kiểm chứng cuối. Dùng WAV tổng hợp qua Web Audio MediaStream → AudioWorklet → Worker thật, không mock ASR.
- Portal + game: vượt qua model/checksum/vocabulary, tới `Listening · English`, nhưng vẫn có lần overflow khi gameplay chạy. Vì vậy KHÔNG chứng nhận đã sửa triệt để độ ổn định Voice combat.
- Quan sát tiến trình tại thời điểm đo có hai Chrome renderer khoảng 100% CPU mỗi tiến trình. Đây là dấu hiệu cạnh tranh tài nguyên, chưa chứng minh riêng tab nào là nguyên nhân duy nhất. Không tự đóng tab hay tiến trình của chủ máy.
- Fake WAV device trên Chrome headless ở máy này có lần cho PCM toàn số 0. Các lần đó chỉ là kiểm tra kết nối/silence, không được tính là kiểm tra nhận dạng lời nói. Smoke lời nói dùng MediaStream tổng hợp với peak PCM > 0 và transcript không rỗng.

**Việc còn cần làm trước khi đánh dấu PASS toàn bộ:**

1. Profile capture → dispatch Worker → decode → ACK dưới đúng tải combat, tách stall main thread và decoder, chạy một cửa sổ kiểm thử tại một thời điểm; so với lúc đóng các tab game thừa do chủ máy chủ động đóng.
2. Nếu main-thread forwarding là nút thắt: chuyển PCM/credit sang MessagePort trực tiếp Worklet–Worker, giữ generation và thứ tự sample; không chỉ tăng đệm vô hạn.
3. Nếu decoder là nút thắt: đánh giá tối ưu cấu hình/model hoặc native local ASR. Không tự đổi sang cloud và không ép grammar nhỏ chỉ để tạo kết quả “đúng” giả.
4. Test lời nói thật, âm thanh game, pause/resume, TTS gate, chuyển mode, đổi vocabulary và reconnect; xác nhận không auto-complete từ đang typing.
5. Giữ TTL kết quả hiện tại; không lấy hàng đợi dài làm cách che latency hoặc cho đạn trúng mục tiêu đã hết hạn.

## Warp logic đã đối chiếu

- Active cap 100; Reserve cap 300; giá deployment 10.
- Active hồi +1/6 phút; khi đầy mới hồi Reserve +1/12 phút.
- Reserve cần consent; Refuel +20, giá 8/12/18 Star Crystals, tối đa 3 lần/ngày; UI vẫn hỏi xác nhận.
- Chuỗi prepare/activate và intent receipts chống double-spend khi callback lặp; writer lock/fence chống tab thứ hai cùng ghi.
- Practice/test-preview không dùng rewarded wallet/settlement.
- Không thay migration schema hay balance policy trong lần sửa này.

Các kiểm tra này không thể bảo đảm chống gian lận tuyệt đối trong app offline: người sở hữu máy vẫn có thể sửa code, IndexedDB hoặc đồng hồ. Không nên mô tả cơ chế local là chống hack như server-authoritative economy.

## 6. Medium — tính lại hệ số lọc âm thanh trên từng sample: ĐÃ TỐI ƯU

**Vị trí:** parent `shared/voice/audio-resampler.mjs`.

Trước sửa, bộ lọc 32 tap tính lại sin/cos cho từng mẫu đầu ra dù thiết bị 48 kHz lặp đúng một phase và 44.1 kHz chỉ có số phase hữu hạn. Đã cache hệ số FIR chuẩn hóa theo fractional phase, giới hạn 512 entry; không bỏ low-pass filter, không đổi sample clock.

Microbenchmark cục bộ xử lý 5 giây PCM 48 kHz giảm từ khoảng 508 ms xuống 18 ms; đây là **thời gian CPU riêng của resampler**, không phải FPS hay độ trễ toàn bộ Voice. Test đối chiếu công thức trực tiếp, chunk invariance, giới hạn cache và chống aliasing đều pass. Bổ sung từ chối output rate không hữu hạn và số tap lẻ.

**Độ chắc chắn:** cao về giảm tính toán dư và tương đương số học trong test; không khẳng định đã giải quyết nút thắt decoder.

## 7. High — lỗi mic/Worker cũ và lỗi khi paused xử lý sai lifecycle: ĐÃ SỬA

**Vị trí:** parent `portal/src/voice/runtime.ts`, `host-factory.mjs`, `shared/voice/host.mjs` và declaration tương ứng.

- Factory cũ gửi lỗi runtime trực tiếp ra bridge, không ràng buộc generation: callback muộn của phiên cũ có thể làm phiên mới báo lỗi.
- Runtime cũ bỏ qua lỗi khi `enabled=false`: mic ngắt/Worker lỗi lúc paused có thể vẫn để trạng thái sẵn sàng.
- `resume()` đồng thời khi warmup chưa xong có thể tạo hai recognizer. `close()` đánh dấu đóng sau một điểm await, để lại cửa sổ tạo mới trong lúc teardown.

Đã đưa lỗi runtime qua host với generation fence; invalidate session, trả microphone ownership và stop tracks trước khi đợi decoder đóng; không phát lại lỗi trùng. Runtime ghi nhận lỗi cả khi paused, bỏ lỗi recognizer generation cũ, gom resume đồng thời về một promise và đánh dấu closed trước await.

Test production class bằng fake device kiểm tra: concurrent resume, suspend/hủy warmup rồi resume mới, close/resume race, paused error và callback cũ. Host tests kiểm tra lỗi trong preparation, giải phóng mic ngay cả khi close đang chờ, và phiên cũ không làm hỏng phiên mới. Đây là lỗi lifecycle chứng minh từ code/test, **không phải nguyên nhân của checksum ban đầu**.

## 8. Medium — dữ liệu giao dịch Warp có thể đổi sau khi enqueue: ĐÃ SỬA

**Vị trí:** game `src/persistence/account-transactions.ts`.

Fingerprint giao dịch được lấy trước khi chờ queue/digest, nhưng closure dùng lại object context/quote/intent của caller. Nếu caller đổi object trong khoảng chờ, dữ liệu thực thi có thể khác dữ liệu đã fingerprint; có thể làm thất bại giao dịch hoặc phá tính nhất quán của retry.

Đã snapshot intent, context của admit/activate và quote của refuel ngay khi nhận yêu cầu. Test chủ động sửa object ngay sau lời gọi: deploy vẫn chỉ trừ 10 đúng một lần, activate giữ context ban đầu, refuel chỉ nạp 20 với giá 8 và retry không trừ lần nữa.

Không thay giá, schema, cơ chế receipt hay policy migration. Đây là bảo vệ tính nhất quán nội bộ, không phải chống người dùng có toàn quyền sửa code local.

## 9. Low — Refuel không nói rõ chi phí và tiền nạp đi đâu: ĐÃ SỬA

**Vị trí:** game `src/ui/warp-hud.ts`, `src/main.ts`, `index.html`.

Nút hiện `Refuel +20 · 8 SC` (tăng theo 8/12/18), giải thích thiếu Star Crystals, hết quota hoặc thiếu chỗ chứa. Khi nạp được, hiển thị tách `Active +N · Reserve +M`; người chơi không còn hiểu nhầm nạp không tác dụng khi Active đang 100. Thiếu tiền được disable ngay trong UI; transaction vẫn kiểm tra lại canonical wallet và quote, không tin UI. Hộp xác nhận chi tiền vẫn giữ nguyên.

## Kết quả browser sau lượt review tiếp theo

Chỉ một Chrome kiểm thử tại một thời điểm, profile tạm, không thu microphone thật. Fixture WAV lời nói đi qua Web Audio MediaStream → production AudioWorklet → production Vosk Worker. Không mock transcript/detection.

| Kịch bản | Kết quả |
|---|---|
| Portal + combat, fake device PCM silence | 264 block / 264 ACK; max pending 5; max ACK khoảng 505 ms; Listening trong cửa sổ kiểm tra. **Không chứng minh nhận dạng lời nói.** |
| Nhận dạng riêng, WAV có lời nói | 150 block/15 giây; max pending 2; peak PCM 0.703; 8 transcript, gồm apple/reactor/shield/energy/hello/world; không lỗi |
| Portal + combat + WAV, lần 1 | 20 block, 10 ACK; queue chạm 10 rồi overflow; peak 0.703; chưa có transcript |
| Portal + combat + WAV, lần 2 | 13 block, 3 ACK; queue chạm 10 rồi overflow; peak 0.664; chưa có transcript |

Main-thread timer stall lớn nhất ở hai lần fail khoảng 433/444 ms; vẫn nhận PCM theo nhịp gần 100 ms trong lúc ACK dừng. Điều này **gợi ý đường decode/Worker ACK dưới tải combat cần điều tra tiếp**, nhưng chưa đo trực tiếp thời gian xử lý bên trong Worker nên chưa kết luận toàn bộ do Vosk hay toàn bộ do GPU/main thread. Không tăng queue/TTL, không tự đổi model, hạ graphics hoặc bật cloud để che lỗi.

Ưu tiên tiếp theo: đo timestamp nhận block / bắt đầu-kết thúc decode ngay bên trong Worker cùng CPU/memory/frame trace. Chỉ chuyển PCM sang MessagePort trực tiếp nếu xác nhận dispatch là nút thắt; nếu decode chậm thì đánh giá cấu hình/model với corpus accuracy/latency trước khi thay. Giữ các acceptance gate về ownership, freshness và âm thanh ngoài mục tiêu. **Voice combat hiện vẫn chưa đạt nghiệm thu.**

## Kiểm thử và ảnh

- Parent `node --test shared/voice/*.test.mjs`: **77 tests pass**, có HTTP integration, resampler equivalence và runtime lifecycle mới.
- Game targeted 12 file: Warp HUD/charge/controls/economy, account transactions, Voice session/gameplay/adapter/profiles/feedback/UI, boss skills: **134 tests pass**.
- Chạy toàn game: **1.632 pass / 3 fail**, tổng 1.635 test. Hai timeout (`loot-simulation`, `m22-economy-audit`) chạy lại riêng với `--maxWorkers=1` đều pass, không sửa timeout/test assertion. Lỗi `combat-vfx-sprites` vẫn fail ở kiểm tra alpha pixel >128.
- Kiểm tra đọc-only artwork hiện có: `spark-burst.webp` max alpha 98, `debris-burst.webp` 51, `precision-burst.webp` 95; **`missile-salvo.webp` max alpha 0** (toàn trong suốt). Những asset này không được sửa trong lượt Voice/Warp. Không đánh dấu toàn repository xanh; cần review media riêng, không nới test để che mất ảnh.
- Portal TypeScript + production build pass.
- Game TypeScript pass; `pnpm exec vite build` pass, còn cảnh báo chunk lớn. Không chạy hook prebuild tái sinh artwork để tránh đụng media người dùng đang sửa; không tuyên bố đã chạy đầy đủ chuỗi art-budget gate.
- Đã đọc `docs/VISUAL_TESTING.md`, chụp 1642×799 DPR 2 và tự mở xem các ảnh liên quan.

Ảnh local trong thư mục gitignored `.visual/`:

- `warp-pilot-final.png`: thanh Warp cạnh tên/level tàu.
- `warp-dialog-after.png`: nút Refuel/Reserve không bị clipping.
- `warp-deployment-after.png`: gameplay, Warp 90/100 sau một deployment.
- `voice-portal-after.png`: bằng chứng lỗi quá tải còn tồn tại, không phải ảnh PASS.
- `voice-connected-title.png`: Voice kết nối được qua Portal, dừng đúng ở `Microphone paused` khi chưa chơi, Warp 100/100.
- `voice-combat-speech-reviewed.png`, `voice-combat-speech-repeat.png`: hai lần lời nói tổng hợp dưới tải combat còn overflow.
- `voice-speech-isolated-reviewed.png`: pipeline riêng nhận được speech fixture; transcript nằm trong JSON của script, không suy ra từ ảnh trang Portal.
- `warp-refuel-reviewed.png`: dialog có giá Refuel và lý do thiếu Star Crystals; dùng profile mới.

## Cách dùng bản sửa

Sửa trải ở **hai repository**: parent Portal/shared/scripts và child Space Typing. Chỉ cập nhật child không đủ chữa checksum của Portal.

Với dev server hiện tại: reload toàn bộ trang `https://typing-game.local/space-typing` bằng Cmd+Shift+R để đóng runtime cũ và nạp cả Portal lẫn iframe mới. Nếu server chưa nạp plugin mới, khởi động lại launcher theo cách người dùng đang dùng. Không cần xóa save.

Với Play/static: cần build cả Portal và Space Typing theo workflow của dự án; không được chỉ build game rồi giữ Portal cũ.
