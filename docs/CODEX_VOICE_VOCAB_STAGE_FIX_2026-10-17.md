# Sửa voice đổi giọng, từ lặp và Admin Unlock all stages — 17/10/2026

## Hiện tượng và nguyên nhân đã xác nhận

- **Voice nam rồi nữ:** `speech.ts` gọi lại bộ chọn voice ở mỗi từ. Chrome Windows trả danh sách rỗng lúc đầu, rồi nạp Microsoft/Google voice bất đồng bộ. Từ đầu có thể dùng giọng mặc định của Windows; các từ sau chuyển sang Google US English có điểm ưu tiên cao hơn. Trên hồ sơ Chrome tạm đã quan sát danh sách từ 0 lên 22 voice.
- **Lặp vài từ:** thư viện dùng chung có **18.000 mục**, nhưng game chỉ nạp nguồn người chơi chọn. Mặc định là Level 1, **150 từ**. `buildPatternVocabulary` lọc Long word của Level 1 xuống **6 từ**. Bộ nhớ chống lặp chỉ nhìn thấy nhóm nhỏ này; ngoài ra cửa sổ điểm độ khó có thể lặp trước khi dùng hết nguồn. Mô phỏng trước sửa: Long word, 120 lượt chọn, chỉ 6 từ khác nhau.
- **Admin unlock không mở màn:** API Play thực sự trả `testing.unlockAllStages: true`, revision `r-20261015185358-293863f63174`. Tuy nhiên `stage-selection-access.ts` luôn từ chối override khi stage runtime có source `published`. Vì vậy 9/10 Galaxy vẫn bị khóa dù cờ Admin đã tới game. Không phải do người dùng chưa publish.

## Đã sửa

### Giọng đọc từ vựng

- Chờ một voice tiếng Anh cụ thể, tối đa 1,8 giây, trước khi phát câu đầu; không phát bằng voice mặc định không xác định.
- Cố định voice đã chọn trong cả phiên trang, kể cả sau khi pause/stop. Danh sách voice nạp thêm không làm đổi giọng.
- Giữ cơ chế chỉ đọc yêu cầu mới nhất, hủy yêu cầu đang chờ khi stop, dọn listener/timer, watchdog 20 giây và giới hạn âm lượng.
- Nếu trình duyệt không cung cấp voice tiếng Anh, bỏ lượt đọc đó và thử lại ở từ tiếp theo; không tự chuyển sang voice khác ngôn ngữ.
- Đây là **TTS phát âm**, không phải thay đổi hay chứng nhận hệ thống nhận diện microphone Voice/Hybrid.

### Chọn từ trong màn

- Ưu tiên từ chưa dùng trong vùng điểm gần độ khó trước, sau đó mở rộng ra toàn bộ nguồn đã chọn trước khi lặp.
- Khi nhóm Long word/Short burst cạn từ mới, dùng từ chưa xuất hiện trong nguồn gốc người chơi đã chọn. Vì vậy Long word vẫn mở đầu bằng nhóm từ dài; sau đó có thể dùng từ ngắn hơn để tránh xoay vòng vài từ.
- Giữ cấu trúc nhiều từ của Phrase/Boss sentence, không thay chúng bằng từ đơn.
- Nếu đã dùng hết nguồn hữu hạn, ưu tiên từ có số lần xuất hiện ít nhất. Loại từ trùng theo dạng gõ, không chỉ theo ID từ điển; tránh trùng với mục tiêu đang hiện.
- Cache điểm theo từng nguồn bằng WeakMap. Không thêm công việc trong vòng vẽ mỗi khung hình, không đổi GPU/VFX.
- Không tự trộn 18.000 mục vào bài học/nguồn Custom/Topic đang được người chơi chọn.

### Quyền mở màn thử nghiệm

- Đọc cờ Admin làm nguồn quyết định quyền mở màn cho phiên published; cài đặt local cũ không thể bật ngược một cờ Admin đang OFF.
- Luồng màn chưa mở vẫn là Testing preview: không ghi tiến độ, checkpoint hay phần thưởng Campaign; không trừ Warp.
- Giữ hạn chế Stage Select của Ascension. Publish vẫn áp dụng khi tải lại/bắt đầu phiên mới.

## Kiểm tra

- **14 file / 90 test liên quan đạt:** speech lifecycle, nguồn từ thực Level 1, Long word/Short burst, chống lặp, authority Admin, Stage Select, pattern runtime, vocabulary loader, Voice/Hybrid gameplay/session/UI.
- **8 file / 68 test Combat bổ sung đạt:** nhịp màn, rank/layer, enemy typing profile, độ khó từ, word admission, formation, enemy/boss identity và Test Lab. Tổng hai lượt không trùng: **22 file / 158 test đạt**. Log bổ sung: `.visual/codex-fixes/combat-tests.log`.
- TypeScript game đạt.
- Chrome thật, hồ sơ tạm, 1642×799 DPR 2:
  - Ba yêu cầu đọc `orbit`, `planet`, `meteor` đều truyền cùng voice `Google US English`; bắt đầu với 0 voice, sau đó có 22. Đây là kiểm tra voice mà trình duyệt nhận, không phải tuyên bố AI đã nghe âm thanh.
  - Nguồn thực 150 từ, Long word ban đầu 6 từ: **150 lượt chọn / 150 từ khác nhau**. Sáu lượt đầu giữ nhóm Long word. CPU chọn từ đo trong lượt kiểm tra này: trung bình 1,92 ms, p95 4 ms; không phải benchmark FPS.
  - Đủ 10 Galaxy đều mở, chọn được World 50 / Stage 1000 và thấy cảnh báo Testing preview.
  - Deploy Stage 1000 thực sự vào trận; Warp **100 → 100**, không có request wallet phát sinh từ Deploy preview.
  - Không có lỗi trang hay console trong các lượt kiểm tra trên.
- Ảnh và log ở `.visual/codex-fixes/`: `stage-before.png`, `stage-after-dev.png`, `voice-variety-dev.png`, `preview-combat-dev.png`, `tests.log`, `types.log`.

## Bàn giao bản Play

- `pnpm build:space` **PASS**, gồm kiểm tra audio/background/Expansion/Credit art, TypeScript game và Duel server, Vite, bundle report, ship/background art guard. Bundle Play mới: `assets/game-BTulKXfz.js`, build 17/10/2026 13:02 giờ máy.
- Đã kiểm tra lại trực tiếp `https://space.typing-game.local/` trên Chrome với hồ sơ tạm, không dùng save của chủ dự án:
  - Stage Select mở đủ 10 Galaxy; chọn được Stage 1000.
  - Deploy Stage 1000 thực sự vào trận; Warp **100 → 100**, server `maxStage` **1 → 1**, không có giao dịch ví từ thao tác preview.
  - Qua nút **Start recall** và **Replay audio** thật của bản build: ba yêu cầu đọc/replay đều dùng `Google US English`, trong khi danh sách voice ban đầu rỗng. Không import source dev hay sửa bundle để chạy lượt này.
  - `logs: []`, `exceptions: []` ở cả ba lượt Play. Đã mở ảnh để tự kiểm tra.
- Ảnh Play: `.visual/codex-fixes/stage-after-play.png`, `voice-play.png`, `preview-combat-play.png`. Build log: `.visual/codex-fixes/build.log`.
- Người chơi tải lại `https://typing-game.local/space-typing` để bắt đầu phiên có code mới. Cờ Unlock đã publish trước đó được giữ nguyên.

Không reset save của người dùng, không thay cờ Admin đã publish, không commit/push/deploy production.
Vite kiểm thử riêng ở cổng 3096 đã được dừng; dịch vụ Play/Admin/online của chủ dự án được giữ nguyên.
