# Voice Final V2 — đánh giá và checkpoint triển khai

Ngày: 2026-10-04. Baseline: `ff8c17a7fb7873d8b11ee24775c528ff3ea4c729`.
Branch child: `feat/bgv-integration-current`. Phần Portal/canonical contract ở parent
`typing-game`, branch `feat/space-voice-platform`; parent cần pin đúng commit child.

## Kết luận

Final V2 là đặc tả đủ rõ để bắt đầu triển khai. Bản checkpoint này triển khai các
bất biến có thể kiểm chứng độc lập với nhận diện: ownership theo unit, keyboard
seam, conditional lock release, contract và policy chống stale/replay, transactional
admission, lifecycle với runtime được inject trong test.

**Chưa sẵn sàng bật Voice/Hybrid để chơi.** Engine offline, model/tokenizer,
capture/worker/resampler, gameplay completion theo nguồn, reward/passive/learning,
save/profile và nghiệm thu qua mic vẫn cần hoàn tất. Không có mode selector mới
hoặc voice damage trong checkpoint này. Portal trả `offlineEngineAvailable=false`.

## Đã thay đổi

| Phần | Đã có | Giới hạn hiện tại |
| --- | --- | --- |
| Keyboard | Controller sau modal/hotbar/control checks; bỏ key đang composition | Default luôn Typing, chưa có UI chọn Voice |
| Ownership | Accepted-key path claim trước progress/passive; enemy, boss word, counter, bonus targets | Không suy owner từ `typed` hoặc `targetId`; meteor chưa có mapping Voice |
| Unit generation | Encounter, enemy layer, boss word/phase và Test Lab replacement tạo identity mới | Unit/runtime không được ghi vào save |
| Enemy lock | Complete B giữ lock/progress A; tự clear khi A chết hoặc complete A | Đây là sửa semantic seam; chưa phải end-to-end Hybrid |
| Admission | Exact/full prefix hai chiều, alias/homophone group; owned và pending vẫn reservation; prepare/commit/cancel | Registry chưa nối vào mọi spawn route. Typing vẫn dùng chính sách cũ |
| Variety | Predicate lọc hard constraint trước unseen/ranking; không có safe candidate trả null | Caller mặc định không bật predicate mới; spawn fallback/wanted/batch còn cần chuyển sang transaction |
| Contract | Bounds, normalized spoken forms, epochs, identity, ACK; bản child được generate từ parent kèm SHA-256 | Protocol v1 hiện là draft nội bộ; không dùng raw PCM trong iframe message |
| Result policy | ACK/window/eligibility/source guards; registry revision mới không tự loại B; terminal receipt; overlapping-audio dedupe | Caller phải revalidate gameplay, claim unit và mutation đồng bộ; duplicate receipt không được thực hiện effect lần hai |
| Host foundation | Permission/cancel/late worker, suspend/resume, gate-before-TTS, tail/flush, route fencing | Dùng injected test runtime; chưa có AudioWorklet/worker/model-cache production |
| Portal | Lazy import chỉ khi nhận voice metadata từ đúng iframe/origin; capability gate đóng | Không xin mic, fetch weights hoặc tạo inference worker trong Typing |

`react/reactor` bị cấm bởi hard policy; `red/robot` vẫn được phép, dùng soft
prefix ranking và keyboard lock. Spoken form giữ khoảng trắng, Unicode và dấu
câu; không dùng `typingText()` làm transcript matcher. Phonetic conflicts cần
metadata đã xác minh, không tự suy homophone từ chữ đầu.

## V01: engine gate còn thiếu bằng chứng

Đã kiểm tra source Sherpa ONNX **v1.13.8**, commit
`11afbd009a7f8c08f4bcf2fc1b265d0df4670fbf`:

- [WASM KWS wrapper](https://github.com/k2-fsa/sherpa-onnx/blob/11afbd009a7f8c08f4bcf2fc1b265d0df4670fbf/wasm/kws/sherpa-onnx-kws.js): `createStream()` gọi API tạo stream thông thường, không nhận keyword list động.
- [WASM export list](https://github.com/k2-fsa/sherpa-onnx/blob/11afbd009a7f8c08f4bcf2fc1b265d0df4670fbf/wasm/kws/CMakeLists.txt): chưa export API tạo keyword stream với keywords; cấu hình initial memory là 512 MB.
- [Native C API](https://github.com/k2-fsa/sherpa-onnx/blob/11afbd009a7f8c08f4bcf2fc1b265d0df4670fbf/sherpa-onnx/c-api/c-api.h): có `SherpaOnnxCreateKeywordStreamWithKeywords`.

Điều này xác nhận cần build/binding riêng hoặc baseline ASR khác; không chứng
minh KWS chậm hay không thể đáp ứng. Chưa chạy recognition benchmark và chưa
chọn engine production. Không dùng native API làm bằng chứng WASM đã hỗ trợ.

Trước khi nối voice damage cần:

1. Chốt một engine bằng benchmark KWS/streaming-ASR; pin build, model, tokenizer,
   license, byte size, SHA-256 và artifact phân phối offline.
2. Chứng minh keyword churn không mất lời nói B, disposal không leak và sample
   clock do capture sở hữu. Hoàn thiện clock anchors qua iframe, bounded PCM,
   resampler chống aliasing, backpressure và device-loss behavior.
3. Nối registry vào normal/carrier/splitter/formation/wanted/layer/bonus/counter,
   commit admission trước history/objective/hooks. Đóng unsafe fallback và bảo
   đảm deferral có giới hạn, không deadlock stage hoặc boss.
4. Nối semantic completion, policy U/reward/passive, speaking aggregation riêng,
   run metadata và best/profile riêng trước khi mở mode cho người chơi.
5. Qua corpus ít nhất 1.000 readings, negative audio ít nhất 3 giờ, ngưỡng
   false-trigger/latency của V2, browser/device matrix và game-under-load/soak.

Không chặn normal Voice vì chưa quyết định projectile/puzzle; normal có thể đi
tiếp sau engine gate và các điều kiện normal ở trên. Không tuyên bố cả campaign
đã hỗ trợ trước khi có coverage matrix.

## Kiểm chứng checkpoint

- Space Typing: full Vitest, **245 files / 1.523 tests PASS**.
- Space Typing: `pnpm build` PASS, gồm asset checks và TypeScript client/server.
- Portal: `pnpm --dir portal build` PASS.
- Shared Voice: `node --test shared/voice/*.test.mjs` — **28 tests PASS**.
- Canonical contract: `node scripts/sync-space-voice-contract.mjs --check --target <space-typing>` PASS.

Test runtime là fixture trong test. Kết quả này không chứng minh nhận diện, audio
continuity, latency, offline cold start, GPU/frame performance hoặc TTS echo thực
tế. Chưa có screenshot/manual Voice qua Portal vì chưa có engine để chạy.

## Milestone thực tế

| Milestone V2 | Trạng thái |
| --- | --- |
| V00 audit | Đã làm; mechanic decisions và coverage release còn mở |
| V01 engine harness/benchmark | Chưa đủ bằng chứng GO |
| V02 contract/lifecycle | Foundation có test; capture/cache/worker/mic UI chưa xong |
| V03 keyboard/semantic seam | Ownership/controller/lock fix có test; source-aware voice completion chưa nối |
| V04 registry/shadow | Policy và transaction có test; real-engine/live-route shadow chưa chạy |
| V05–V08 | Chưa hoàn tất |
