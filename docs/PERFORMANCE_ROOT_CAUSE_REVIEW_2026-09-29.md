# Space Typing — điều tra giật/lag trên máy Mac của chủ dự án

Ngày kiểm tra: **2026-09-29**, múi giờ Asia/Ho_Chi_Minh.

## 1. Phạm vi và kết luận chính

Đây là **report phân tích, không phải bản sửa code**. Reviewer không sửa source, asset, cấu hình game, Git history hay save của chủ dự án. Chỉ file Markdown này được tạo trong repository. Bộ đo, bản sao source, hồ sơ Chrome kiểm thử và ảnh chụp nằm ngoài repository, trong `/private/tmp/space-perf-review-Dp1C2A/`.

**Nút thắt được xác nhận mạnh nhất là bóng mờ Canvas 2D (`shadowBlur`) được vẽ lại liên tục trong luồng render địch, không phải chỉ kích thước hình cá voi hay việc CPU i9 không đủ mạnh.**

Trong cảnh đối chứng 8 địch, vẫn giữ High, nền WebGL, độ phân giải và artwork:

- Bản nguyên trạng đạt khoảng **7,77 FPS**, frame p95 **133,4 ms**.
- Bỏ nền nhưng giữ bóng mờ vẫn chỉ **7,92 FPS**.
- Chỉ vô hiệu hóa bóng mờ động bên trong `drawEnemy()` trong bộ nhớ phiên kiểm thử: **59,87 FPS**, p95 **16,7 ms**.
- Giữ cá voi lớn giữa màn hình, giữ toàn bộ nền, vô hiệu hóa bóng mờ trên Canvas gameplay: **60,00 FPS**, p95 **16,8 ms**.

Đây là phép **loại trừ để tìm nguyên nhân**, không phải đề xuất bỏ hết glow khỏi sản phẩm. Hướng sửa ưu tiên là giữ diện mạo bằng sprite/texture glow cache sẵn, đồng thời chặn shadow kế thừa ngoài ý muốn, thay cho việc tính blur lại cho hàng loạt nét vẽ mỗi frame.

Ngoài ra đã xác nhận: adaptive resolution bỏ qua các frame chậm nhất; một bước giảm tải nền không thực sự giảm lượt vẽ ở đường chạy mặc định; texture nền cũ còn được giữ sau khi đổi World cùng Galaxy. Những vấn đề này khiến chất lượng Low/High không giải quyết đúng nút thắt.

## 2. Phiên bản, môi trường và giới hạn phép đo

### 2.1 Phiên bản được kiểm tra

- Repository: `games/space-typing`.
- HEAD local: `3d698e8fcd957507412d293b9570aad47c743d06` — hệ thống nhạc 13 bài.
- Có nhiều thay đổi chưa commit và một phiên khác đang bổ sung skill/VFX trong lúc review. **Không pull, checkout, reset hoặc ghi đè các thay đổi đó.** Không khẳng định HEAD này là GitHub/main mới nhất vì không fetch trong cuộc điều tra này.
- Đã đọc `docs/VISUAL_TESTING.md`, tham chiếu yêu cầu hiệu năng trong `docs/PROJECT_CONTEXT.md`, và kiểm tra trực tiếp code/asset trên máy.
- Đợt đo cơ sở: source tại HEAD nói trên, cộng snapshot asset đang có trên máy. Asset bổ sung chưa commit không bị bỏ qua.
- Đã mở bản Play thực tế từ `https://space.typing-game.local/`, bundle `index-8Q2_ancO.js`, build trên đĩa lúc 01:11 ngày 29/09. Không rebuild hoặc thay thế bản Play này.
- Đợt xác minh cuối dùng snapshot working tree mới hơn, gồm code skill/VFX vừa bổ sung. SHA-256 `src/Game.ts`: `8628b387994d76be7fe1d0a98529cb0b507f897ecf647e58e859747e31de659e`; `src/enemies/renderer.ts`: `e53060cb65930490a2e86d1f6a98d7602236f34035034b6ae15b16fb52869192`.

Vị trí dòng dưới đây lấy từ working tree trong cuộc review; nếu code tiếp tục đổi, tìm theo tên hàm đi kèm. Đừng áp dụng số dòng vào một phiên bản khác mà không đối chiếu.

### 2.2 Phần cứng và trình duyệt

- Intel Core i9-9880H, 8 nhân vật lý / 16 luồng, RAM 16 GiB.
- WebGL của cảnh nền báo **AMD Radeon Pro 560X qua ANGLE Metal**. Máy cũng có Intel UHD Graphics 630; không được mặc định toàn bộ Canvas/compositor luôn dùng cùng GPU chỉ từ tên GPU WebGL.
- Các lượt đối chứng có lưu thông tin trình duyệt: **Chrome 154.0.8037.58**, Canvas 2D và GPU compositing được bật, backend mặc định `GraphiteDawnMetal`.
- Lượt thăm dò đầu chạy tiến trình Chrome 153; updater Chrome xuất hiện trong lúc kiểm tra. Vì vậy không gộp các số thăm dò đầu và số đối chứng sau thành một benchmark cùng phiên bản trình duyệt.
- Có đối chứng riêng với `--disable-skia-graphite`; thông tin GPU xác nhận chuyển sang `GaneshGL`. Cờ chỉ dùng cho Chrome tạm, không đổi thiết lập Chrome thật.

### 2.3 Cách đo

- Theo kích thước trong `VISUAL_TESTING.md`: viewport **1642 × 799**, device DPR **2**.
- Canvas gameplay thực tế ở High: **2709 × 1242**, effective DPR **1,65**, khoảng **3,36 triệu pixel**. Chiều cao gameplay nhỏ hơn viewport do phần UI phía trên.
- Chạy Chrome headless có GPU, CDP, hồ sơ tạm riêng. Tắt đầu ra âm thanh của Chrome kiểm thử; TTS tắt trong settings tạm. Không kiểm thử chất lượng nghe.
- Mỗi lượt lấy khoảng **15 giây rAF**, tính FPS trung bình, p95/p99, tỷ lệ frame >20 ms; đo riêng CPU của update/draw; ghi long task, JavaScript exception, GPU, texture và thermal limit.
- Cảnh đối chứng: 8 scout, vị trí cố định, scheduler/simulation đóng băng, khóa adaptive để không tự đổi độ phân giải giữa các phương án. Đây là **cảnh render stress có kiểm soát**, không phải tuyên bố Stage 1 bình thường luôn có 8 địch hoặc gameplay thực tế luôn chỉ 8 FPS.
- Cảnh vẫn giữ phần render/UI/ship/nền. Các ablation chỉ thay method/property trong bộ nhớ Chrome riêng. Cache bóng mờ đã rasterize sẵn trên canvas phụ vẫn tồn tại khi tắt shadow của canvas chính.
- Mỗi lượt tải lại cảnh; không phải toàn bộ dữ liệu ngẫu nhiên giống nhau từng bit. Kết quả được củng cố bằng nhiều kiểu ablation và kiểm tra source, không dùng chênh lệch vài FPS để kết luận nhân quả.

**Giới hạn:** headless không thay thế trace từ đúng tab/Portal người dùng đang chơi. Chưa đo đủ mọi Stage, Recall, boss, combo skill mới, Safari, cấu hình Ultra, hoặc phiên chơi dài 30 phút. FPS ở đây là nhịp callback rAF, không phải phép đo độc lập thời điểm từng pixel xuất hiện trên màn hình. Không có số nhiệt độ °C hoặc GPU execution time đáng tin cậy.

## 3. Kết quả đối chứng

### 3.1 Cảnh cố định — source HEAD, asset snapshot hiện tại

| Thử nghiệm | FPS | Frame p95 | Ý nghĩa |
|---|---:|---:|---|
| High, 8 địch, nền đầy đủ, native shadow nguyên trạng | 7,77 | 133,4 ms | Baseline bị chậm |
| Không render/chép nền, giữ native shadow gameplay | 7,92 | 133,4 ms | Bỏ nền không giải quyết nút thắt |
| Vẫn render WebGL nhưng bỏ bước chép sang Canvas 2D | 6,90 | 183,4 ms | Không đủ bằng chứng quy lỗi chính cho blit |
| Nền đầy đủ, tắt native shadow trên Canvas gameplay | 60,00 | 16,7 ms | Bóng mờ động là biến tác động rất lớn |
| Nền đầy đủ, **chỉ tắt shadow trong `drawEnemy()`** | 59,87 | 16,7 ms | Khoanh vùng xuống renderer địch |
| Cá voi lớn hiện ở giữa màn hình, shadow nguyên trạng | 6,18 | 200,0 ms | Cảnh này cũng chậm; chưa chứng minh cá voi là nguyên nhân gốc |
| Cá voi lớn vẫn hiện, tắt shadow gameplay | 60,00 | 16,8 ms | Có thể giữ cá voi và High mà vẫn đạt nhịp 60 FPS trong cảnh này |
| Backend GaneshGL, 8 địch, shadow nguyên trạng | 12,13 | 83,4 ms | Chuyển backend không chữa được vấn đề |
| GaneshGL, cá voi, shadow nguyên trạng | 6,09 | 250,0 ms | Không nên hứa đổi flag Chrome sẽ hết lag |

CPU draw p95 ở baseline khoảng **2,8 ms**, nhưng frame p95 **133,4 ms**. Đây là lý do đọc riêng “draw CPU rất thấp” rồi kết luận renderer nhẹ là sai. Raster/GPU/compositor hoàn thành bất đồng bộ, không được đo đầy đủ bằng thời gian gọi hàm JavaScript.

### 3.2 Thăm dò gameplay và bản Play

- Stage 1 High, khoảng 2–3 địch, adaptive bật: một lượt đạt **29,34 FPS**, p95 **50 ms**, cuối lượt adaptive gameplay đã xuống **0,72** và background load level **3**.
- Bản Play có sẵn cũng tái hiện nhịp thấp: **15,13 FPS**, p95 **83,4 ms** trong lượt thăm dò. Không có Game handle để xác nhận toàn bộ state; không dùng số này để so trực tiếp production với dev.
- `?bgPresent=layered` và `?bg=legacy` không tạo ra cải thiện đáng tin trong lượt thăm dò; bản legacy còn dùng GPU WebGL khác khi truy vấn cuối lượt. Không coi chúng là giải pháp đã được xác minh.

Những số này chứng minh hiện tượng không chỉ tồn tại trong một vòng `for` mô phỏng, nhưng **không phải các cặp benchmark tương đương**: state, adaptive, browser version và thermal đã thay đổi.

## 4. Các issue xác nhận và giải pháp đề xuất

### P1 — High: bóng mờ địch tính lại liên tục, còn bị kế thừa sang các chi tiết khác

**Vị trí:** `src/Game.ts`, `drawEnemy()` khoảng dòng 9433; rank aura khoảng 9480–9500; thiết lập `context.shadowBlur` trước `drawModularEnemy()` khoảng 9554–9602. `src/enemies/renderer.ts`: `drawAura()` dòng 99/114, `drawOrbit()`, `drawWing()`, `drawHead()` dòng 574, `StaticEnemyBodyCache` dòng 771, `drawModularEnemy()` dòng 840 trở đi.

**Vấn đề:**

1. Mỗi enemy vẽ rank aura có blur động.
2. `drawEnemy()` đặt shadow blur khoảng 14/20/25 nhân rank, sau đó gọi renderer modular mà không reset shadow.
3. `drawAura()` lại có shadow riêng. `drawOrbit()`, cánh và các nét vẽ không chủ động reset có thể kế thừa shadow của caller: `save()` giữ nguyên state hiện có, không reset về mặc định.
4. Cache hiện có chỉ bao phủ body/face ở điều kiện phù hợp, không toàn bộ aura/orbit/wing/head. Một lần `drawEnemy()` vì vậy có thể tạo nhiều thao tác có blur ngoài phần body cache.
5. Shadow của caller nhân `rankVisual.glowScale`, **không nhân `qualityProfile(...).glowScale`**. Một số đường vẽ kế thừa vì thế không giảm đúng theo Low/Medium như các phần còn lại.

**Vì sao:** Canvas shadow trên nhiều path, nhiều layer, backing canvas Retina lớn tạo chi phí raster/GPU. CPU gửi lệnh nhanh không chứng minh GPU đã làm xong. Kết quả chỉ tắt shadow trong `drawEnemy()` mà vẫn giữ nền/ship đạt gần 60 FPS là bằng chứng mạnh nhất của cuộc điều tra.

**Đề xuất sửa, chưa thực hiện:**

- Xác định rõ state contract của renderer; reset `shadowBlur = 0` trước khi vào các chi tiết không cần shadow, tránh glow kế thừa.
- Bake các vòng glow/aura và chi tiết dùng lại vào sprite/atlas/cache kích thước nhỏ. Animate `drawImage`, alpha, rotation, scale thay vì blur lại mỗi nét.
- Mở rộng cơ chế cache hiện có có giới hạn; không tạo thêm một renderer song song cho cùng loại enemy.
- Với targeted/hit/rank thay đổi, dùng tint/overlay hoặc một số sprite variant hữu hạn. Không dùng mọi giá trị thời gian/alpha làm cache key.
- Áp dụng quality policy đồng nhất cho những đường vẫn cần blur; tránh “preset có tên Low nhưng một phần bóng mờ vẫn như High”.
- Kiểm tra cả Recall: nhánh `fillBody=false`/`drawFace=false` không hưởng cache body hiện tại, và word panel còn shadow theo từng ký tự. Đây là phạm vi cần xác minh tiếp, chưa có số FPS Recall để quy kết.

**Độ chắc chắn:** cao đối với nút thắt shadow trong cảnh đã đo; chưa lượng hóa riêng từng nét aura/cánh/head. Không khẳng định native shadow là nguyên nhân duy nhất ở mọi tình huống.

### P2 — High: adaptive loại bỏ luôn frame chậm thật, khiến recovery bị kẹt

**Vị trí:** `src/performance/adaptive-resolution.ts:44`, `:57`; caller `Game.frame()`.

**Vấn đề:** `observe()` return khi `frameSeconds > 0.15`, với giả định đó là background tab/debugger. Nhưng foreground GPU stall hoàn toàn có thể dài hơn 150 ms. Nếu frame thường xuyên là 200 ms (5 FPS), controller không thu mẫu, không giảm `timeToReview`, không hạ tải.

**Xác minh:** tạo controller và gọi `observe('high', 0.2, 2)` 600 lần: `scale` vẫn **1**. Trường hợp này không phải giả thuyết về debugger; đó là input frame time hợp lệ khi renderer chậm.

Ngoài ra `timeToReview -= min(frameSeconds, 0.05)` làm cửa sổ review 3,5 giây kéo dài theo thời gian thực khi FPS thấp. Đây là bộ điều khiển phản ứng chậm hơn đúng lúc cần phản ứng nhanh.

**Đề xuất:** dùng visibility/resume flag và trạng thái pause để loại đúng mẫu không hợp lệ. Với foreground stall, clamp giá trị cho thống kê nếu cần nhưng vẫn ghi nhận overload; thêm recovery nhanh dựa trên một số frame rất chậm liên tiếp, có cooldown để không dao động. Review theo thời gian thực, không theo thời gian simulation bị clamp.

**Độ chắc chắn:** xác nhận bằng code và phép gọi trực tiếp. Không đổi dt gameplay chỉ để sửa bộ điều khiển render.

### P3 — Medium: bước “half-rate” không hoạt động trên đường render mặc định

**Vị trí:** `src/background/stage.ts:58`, `:178` (`stepDown`), `:388–408`; `src/background/budget.ts:43`; `src/main.ts`, `backgroundOptions()` mặc định `blit`.

**Vấn đề:** load level 2 và 3 có cùng DPR multiplier 0,65, cùng tắt flow; khác nhau duy nhất `halfRate`. Nhưng điều kiện skip chỉ đúng khi `presentation === 'layered'`. Mặc định game dùng `blit`, nên bước 2 → 3 được báo thành công dù không giảm lượt render.

**Xác minh trong browser:** level 2: **61 frame / 61 draw**; level 3: **60 frame / 60 draw** trong các khoảng khoảng 1 giây. Low đặt `frameInterval=2` cũng không có tác dụng half-rate ở blit.

**Vì sao:** controller chờ thêm một chu kỳ review sau một bước không có ích. Settings và comment về giảm tải không phản ánh thực tế đường chơi chính.

**Đề xuất:** hoặc bỏ bước no-op đối với blit và báo `false` khi không còn giảm tải thật; hoặc thiết kế lưu frame nền vào render target/texture có thể tái sử dụng để render nền 30 Hz nhưng giữ gameplay 60 Hz. Không chỉ bỏ điều kiện `layered`: WebGL hiện dùng `preserveDrawingBuffer: false`, cần xử lý lifetime của frame. Không chuyển toàn bộ gameplay xuống 30 FPS.

**Độ chắc chắn:** xác nhận trực tiếp; là lỗi adaptive bổ sung, không phải nút thắt lớn nhất so với P1.

### P4 — Medium: texture các World cùng kit tích lũy, đổi Low chưa giải phóng hết

**Vị trí:** `src/background/stage.ts:278`, `:317–365`; `src/background/budget.ts` comment ngân sách và `preferredSize()` trong stage.

**Vấn đề:** sau khi kích hoạt World mới, chỉ gọi `dropKitTextures(previousKit)` nếu đổi kit. World 01–05 cùng `g01-celestial`, nên các plate/hero chỉ dùng ở World cũ vẫn nằm trên GPU. Đổi quality chỉ thay variant các texture World hiện tại dùng, không dọn các texture cũ không còn cần.

**Xác minh, `renderer.textureBytes`/MiB ước lượng từ texture dimensions + mipmaps:**

| World đã duyệt lần lượt | Texture đang giữ |
|---|---:|
| 01 | 47,75 MiB |
| 02 | 56,93 MiB |
| 03 | 67,93 MiB |
| 04 | 77,98 MiB |
| 05 | 88,96 MiB |
| Sau đó chọn Low ở World 05 | 66,79 MiB |

Danh sách texture runtime xác nhận vẫn giữ `hero-w01`…`hero-w05` và các plate cũ. Đây không phải số RSS toàn browser hay đo VRAM vật lý trực tiếp; cũng **không phải memory leak vô hạn đã được chứng minh**. Nó là retention không có eviction theo World/quality, trái với comment “only current World's hero is resident”.

**Đề xuất:** xây tập texture cần giữ từ composition hiện tại + scene đang chuyển; giải phóng texture ngoài tập sau khi switch hoàn tất. Nếu cần cache cho quay lại World, dùng LRU với ngân sách byte thực tế. Khi đổi quality, dọn variant không còn cần. Giữ texture dùng chung, không xóa toàn bộ kit mỗi lần đổi World.

**Độ chắc chắn:** cao về retention; chưa chứng minh nó gây giật ở Stage 1. Có thể làm giảm dư địa bộ nhớ khi chơi lâu, không nên gọi đây là root cause chính của tất cả lag.

### P5 — Medium: số “render ms” chưa phản ánh toàn bộ render cost

**Vị trí:** `Game.frame()` / `getRenderDiagnostics()`; `src/background/stage.ts:391–410`; `scripts/visual/evals/bg-gpu-stress.js`; các performance gate trong Test Lab.

**Vấn đề:**

- `performance.now()` quanh `draw()` đo thời gian CPU gửi lệnh, không đo đầy đủ raster/GPU/compositor và present.
- BGV đặt mốc bắt đầu **sau** `processUploads()`, bỏ chi phí CPU upload/mipmap trong frame đó khỏi `BackgroundDiagnostics.renderP95Ms`.
- Stress test trong tài liệu chủ yếu đo background gallery; nó không chạy đầy đủ enemy Canvas + HUD + background như trận thực.
- Frame profiler hiện giới hạn sample ở 250 ms; stall dài hơn bị mất độ lớn thực. P95/window ngắn cũng có thể không phản ánh một cú khựng hiếm.

**Đề xuất:** giữ CPU timing nhưng đặt tên rõ `cpuSubmitMs`; ghi thêm toàn frame rAF p95/p99/max, missed frames, upload timing, main-thread long tasks, và latency từ keydown đến frame feedback. Lưu telemetry có giới hạn. Bổ sung bài integrated gameplay stress; khi cần phân biệt GPU/compositor, lấy Chrome trace thay vì suy ra GPU ms từ CPU draw ms.

**Độ chắc chắn:** cao về khoảng trống đo đạc; đây chủ yếu là lý do vấn đề dễ bị bỏ sót, không tự nó làm game chậm.

### P6 — Medium: pause/menu vẫn render liên tục với các hiệu ứng đắt

**Vị trí:** `Game.frame()`, `advanceSimulation()`, `renderBackgroundStage()`; hook visibility trong `src/main.ts`.

**Vấn đề:** frame loop vẫn `draw()` và lên lịch rAF ở mọi phase. Pause chỉ ngừng gameplay chính; giảm `timeScale` nền xuống 0,25 làm chuyển động chậm, **không giảm số lần vẽ**. Đồng thời adaptive chỉ được gọi trong phase `playing`.

**Vì sao:** nếu người chơi pause một cảnh có nhiều địch, native shadow vẫn bị tính lại phía sau UI; menu/pause tiếp tục giữ GPU hoạt động. Điều này có thể tăng điện/nhiệt và giảm dư địa cho lúc quay lại chơi.

**Đề xuất:** freeze/cached screenshot gameplay khi pause; cập nhật menu có chủ đích theo dirty state; nếu cần nền sống thì giới hạn riêng cadence của nền/menu. Xử lý tab hidden/resume rõ ràng, không tích lũy simulation debt. Không sửa persistence hoặc music contract để đạt mục tiêu này.

**Độ chắc chắn:** xác nhận hành vi source; chưa có cặp số công suất/°C để lượng hóa tác động nhiệt riêng của pause.

## 5. Yếu tố máy Mac: có giới hạn tốc độ, nhưng không phải lời giải duy nhất

- Trước đo: macOS báo CPU speed limit **100**, không ghi nhận thermal/performance warning; toàn máy khoảng 92% idle ở một interval. Không có bằng chứng toàn bộ CPU đang quá tải lúc đó.
- Trong các lượt render: `CPU_Speed_Limit` có lúc **29–47**, rồi tăng lại ở cảnh nhẹ. Máy đang dùng **AC Power**, pin 100%.
- Đây là bằng chứng có **giới hạn hiệu năng động** trong cuộc đo. Không suy ra trực tiếp nhiệt độ, %CPU sử dụng hay đúng mức GHz từ con số này; chưa đủ dữ liệu để kết luận quạt bẩn, keo tản nhiệt, lỗi phần cứng hay nguyên nhân nguồn điện cụ thể.
- Các cặp baseline/native-shadow-off đầu bắt đầu cùng limit **39**; shadow-off vẫn đạt 60 FPS. Ngược lại GaneshGL/native-shadow-on vẫn chỉ 12,13 FPS khi limit **100**. Vì vậy không thể đổ toàn bộ lag cho giảm xung hoặc “máy yếu”.
- RAM 16 GiB có swap đang dùng khoảng 3,08 GiB trong một thời điểm, nhưng memory pressure level được đọc là 1 và chưa chứng minh có paging spike trùng frame lag. Không dùng swap đã tích lũy để quy lỗi cho game.

Tổng hợp: **chi phí renderer là nút thắt đã đo được; trạng thái nguồn/nhiệt và các ứng dụng khác là yếu tố gây nhiễu/khuếch đại cần kiểm soát khi nghiệm thu**.

## 6. Những kết luận không nên đưa ra

1. Không kết luận cá voi “quá nặng” chỉ vì cảm giác giật trùng lúc nó hiện. Atlas được tải trước khi director active; đường `startPass()` không fetch/decode ảnh mới. Đã có cảnh cá voi vẫn hiện mà đạt 60 FPS khi xử lý bóng mờ gameplay trong bộ đo.
2. Không kết luận `drawImage(WebGLCanvas)` chắc chắn gây CPU readback mỗi frame. Source chỉ chứng minh có copy/composition; muốn xác định đường driver cần trace. Bỏ copy trong đối chứng không chữa lag.
3. Không hứa `?bgPresent=layered` là fix miễn phí. Ngoài kết quả không cải thiện ở lượt thăm dò, additive blending trên gameplay canvas trong suốt có thể khác cách hiện tại cộng sáng vào nền đã blit; cần duyệt hình ảnh.
4. Không đề nghị đổi mặc định sang Low, giảm mọi texture, tắt toàn bộ hardware acceleration, hoặc viết lại cả game bằng WebGL trước khi sửa P1.
5. Không coi size bundle, số file source hay số game trong repository là lời giải cho render lag. Trong cuộc kiểm tra này bản Play tĩnh cũng chậm; chưa có bằng chứng Vite/build server là nguyên nhân chính.
6. Không coi test unit/TypeScript PASS là bằng chứng High/Ultra mượt trên máy chủ dự án.

## 7. Thay đổi đang diễn ra và phần chưa được kết luận

Trong lúc một phiên khác đang thêm skill VFX, snapshot khoảng 07:36 có lời gọi `persistentFxState()` và nhiều helper chưa được định nghĩa. TypeScript báo thiếu hàm; Chrome xác nhận exception dừng vòng frame ngay. Sau đó các helper đã được bổ sung và **lượt TypeScript kiểm tra lại đã PASS**.

Đây được ghi lại để tránh nhầm “renderer bị crash trong code đang viết dở” với “FPS thấp trong bản người dùng đang chơi”. **Không giữ lỗi thiếu helper đó như một bug hiện hành đã được xác nhận ở cuối review.**

Code skill mới có cap effects/smoke, dùng cached glow ở nhiều chỗ — là hướng phù hợp. Tuy nhiên chưa có bài phối hợp nhiều skill, boss và typing liên tục trên working tree để chứng minh không phát sinh allocation/raster spike. Các gradient/path/lightning động và overlay lớn cần vào bài regression sau tối ưu; chưa đủ chứng cứ để gọi tất cả các đoạn này là bug.

## 8. Thứ tự cải thiện đề xuất — chưa thực hiện

1. **P1 trước:** sửa shadow inheritance, cache glow enemy, đo riêng native-shadow draw count. Giữ silhouette, độ sáng, đọc chữ, animation và số enemy như hiện tại.
2. **P2/P3:** adaptive phải nhận foreground slow frames và mỗi bước giảm tải phải thực sự làm ít công việc hơn. Không đổi simulation speed theo quality.
3. **P4:** cleanup/LRU texture theo composition và quality; kiểm tra chuyển World lặp lại.
4. **P5/P6:** bổ sung integrated telemetry và giảm render thừa ở pause/menu.
5. Chỉ sau khi có số đo mới cân nhắc thay cách composite hoặc backend. Không mở rộng thành một cuộc viết lại renderer thiếu benchmark.

### Acceptance/retest cần giao người triển khai

- High, viewport 1642×799 DPR2, browser/GPU/version giống nhau; luân phiên baseline/candidate thay vì luôn chạy candidate lúc máy nóng hơn.
- Test 2, 8 và số địch tối đa hợp lệ trong gameplay; normal + Recall; có/không cá voi; boss + projectile + skill burst; typing liên tục.
- Ghi ít nhất 30–60 giây/cảnh và một lượt chơi kéo dài; tách warm-up/load khỏi steady state.
- Mục tiêu: gần 60 FPS ở cảnh bình thường, p95 gần ngân sách 16,7 ms và ít frame rớt; p99/max và key-to-feedback không được xấu đi. Không che bằng average FPS hoặc tự hạ quality trong lúc A/B.
- Kiểm tra visual: glow/aura/rank/target/hit vẫn đọc đúng, không bỏ cá voi, không hạ độ nét chữ để đạt số đẹp.
- Unit tests: foreground frame 200–500 ms vẫn kích hoạt recovery; hidden-tab/resume không gây hạ tải sai; `stepDown()` không báo giảm tải cho một bước no-op.
- Integration/browser tests: một giây half-rate thực sự giảm lượt draw; chuyển World và High→Low giải phóng texture không dùng; pause không tiếp tục raster scene nặng ở full cadence.
- Thêm guard chống blur kế thừa trong renderer con; Recall cần test cache/label riêng.

## 9. Bằng chứng và tham khảo

Số đo chi tiết, ảnh và probe giữ ở `/private/tmp/space-perf-review-Dp1C2A/`. Các file tiêu biểu:

- `fixed-blit-1790642731939.json`: baseline 7,77 FPS.
- `fixed-blit-noBg-1790642696434.json`: bỏ nền, 7,92 FPS.
- `fixed-blit-noshadow-1790642767073.json`: bỏ shadow canvas chính, 60 FPS.
- `fixed-blit-enemyNoShadow-1790643001549.json`: chỉ bỏ shadow renderer enemy, 59,87 FPS.
- Các file `fixed-blit-whale-noshadow-*.json`, `audit-*.json`: cá voi còn hiện, đếm half-rate, texture retention và adaptive stall.
- Các file `gpu-*.json`: browser version, backend và trạng thái hardware acceleration thực đo.

Thư mục `/private/tmp` có thể bị hệ thống dọn; **report này đã chứa phương pháp, điều kiện, số liệu và kết luận để gửi độc lập cho người/AI triển khai**. Probe là diagnostic tạm, không phải test production đã tích hợp. Không chạy lại probe ngoài đúng snapshot/harness mà không đọc các thao tác thay đổi state trong hồ sơ test.

Nguồn kỹ thuật hỗ trợ hướng cải thiện:

- [MDN — Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas): cache hình lặp lại, tránh `shadowBlur` khi có thể, chia layer khi phù hợp. Nguồn này hỗ trợ phương pháp tối ưu, **không thay thế số đo của game**.
- [MDN — WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): quản lý GPU resource, texture upload và tránh những thao tác đồng bộ gây stall.
- [Chromium — GPU feature configuration](https://chromium.googlesource.com/chromium/src/gpu/+/master/config/gpu_finch_features.cc): cơ chế flag Graphite được dùng cho đối chứng tạm; **không có kết luận cần đổi flag Chrome của chủ dự án**.

**Kết luận bàn giao:** ưu tiên sửa cách render bóng mờ của địch và những phần thích ứng đang không hoạt động đúng. Có căn cứ để cải thiện High mà vẫn giữ artwork/cá voi; không có căn cứ bắt người dùng dùng Low như giải pháp cuối cùng.
