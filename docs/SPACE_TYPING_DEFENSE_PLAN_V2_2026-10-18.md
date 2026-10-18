# Space Typing Defense — Kế hoạch V2 (bản để duyệt)

- **Ngày:** 18/10/2026
- **Người viết:** Claude, theo yêu cầu của chủ dự án
- **Trạng thái:** bản nháp để chủ dự án và Codex duyệt. **Chưa viết mã cho chế độ này.** Đã có một trang đo hiệu năng riêng (mục 9a).
- **Cập nhật 18/10, tối:**
  - đã đưa vào 4 quyết định của chủ dự án (mục 14);
  - thêm số đo hiệu năng thật (mục 9a);
  - thêm ước tính chi phí Cloudflare khi chơi online, và mốc cần lên gói 5 USD/tháng (mục 11a);
  - sửa nhận định về đấu xếp hạng (mục 11, giai đoạn D);
  - cập nhật phần bộ gõ tiếng Việt (mục 2, điều 9).
- **Dựa trên:**
  - bản V1: `SPACE_TYPING_DEFENSE_MASTER_PLAN_V1.md` (nguyên văn chủ dự án gửi ngày 18/10, đã lưu vào repo);
  - đánh giá của Claude về bản V1;
  - quyết định của chủ dự án: **ưu tiên trụ gây hiệu ứng, không ưu tiên trụ diệt quái**.

---

## 0. Tóm tắt

**Là gì:** một chế độ chơi mới, tạm gọi là **Rift Defense** (thủ thành bằng gõ chữ). Quái đi theo đường về Lõi. Người chơi đặt trụ dọc đường và gõ từ tiếng Anh để rồng phun lửa diệt quái.

**Năm điều cốt lõi:**

1. **Chỉ từ gõ đúng mới diệt được quái, và mỗi từ chỉ diệt đúng con quái mang từ đó.** Chỉ khi từ đó kích hoạt một vụ nổ (từ bom, mục 5.6) thì quái xung quanh mới bị diệt theo. Trụ không gây sát thương.
2. **Trụ là công cụ giúp gõ kịp và giúp nhớ từ:** làm chậm, gom quái, phá giáp, gợi ý, đọc to.
3. **Mọi chữ trên quái là từ vựng thật**, lấy từ cấp từ vựng của người chơi. Từ nào cũng có nghĩa tiếng Việt, phiên âm IPA và phát âm. Không có "từ lệnh" cố định.
4. **Bàn phím là chính.** Chuột chỉ dùng khi xây trụ, lúc thời gian đang dừng.
5. **Là chế độ riêng**, giống cách đã làm Campaign 3D. Chế độ bắn hiện tại vẫn là chế độ chính, không bị thay hay sửa.

**Lộ trình:**

1. Bản thử A: khoảng 2–3 nghìn dòng mã.
2. Bản dọc B: một World hoàn chỉnh.
3. Chiến dịch C.
4. Chơi cùng nhau, **tối đa 4 người** (D): chỉ làm khi A–C ổn, và phải duyệt riêng.

Chế độ 8 người **không nằm trong lộ trình**. Đấu xếp hạng để xem lại sau giai đoạn D.

**Câu hỏi đầu tiên cần trả lời:** một màn 8–12 phút, trong đó trụ chỉ hỗ trợ còn người chơi gõ để diệt, có vui và có giúp nhớ từ không?

---

## 1. Thay đổi so với V1

| Chủ đề | V1 | V2 | Lý do |
|---|---|---|---|
| Vai trò của trụ | Trụ tự bắn, tự diệt quái | Trụ chỉ gây hiệu ứng; sát thương bằng 0, nhiều nhất là phá lớp khiên hay giáp | Trụ mà tự diệt quái thì gõ chữ thành thừa. Chính V1 cũng ghi đây là điều kiện thất bại. |
| Chữ để gõ | Từ lệnh cố định ("overload", "ignition", "restore") | Từ vựng theo cấp của người chơi, cộng danh sách từ yếu | Từ cố định thì người chơi thuộc khoảng 10 từ rồi gõ lặp lại, không học thêm gì. |
| Quái thường | Không mang chữ | Mỗi con mang một từ. Chỉ khoảng 8 con gần Lõi nhất hiện chữ, những con khác chưa hiện. | Mỗi từ là một con quái: gõ nhiều mà màn hình vẫn gọn. Theo quyết định của chủ dự án (mục 14). |
| Rồng | Bấm vào bản đồ để di chuyển | Đứng trên Lõi, tự phun lửa vào mục tiêu vừa gõ xong; phím 1–4 để dùng kỹ năng | `PROJECT_CONTEXT.md` mục 2.1: người chơi không điều khiển di chuyển. Mục 2.3: chữ cái dành riêng cho việc gõ. |
| Thần chú | Gõ thẳng một từ đặc biệt | Kỹ năng gắn với phím số, nạp năng lượng bằng combo | Tránh thần chú trùng với chữ trên quái. |
| Thời lượng | 20 đợt, 15–20 phút | 8–12 đợt, 8–12 phút | Phiên ngắn hợp với người học từ hơn. |
| Bản tối thiểu (MVP) | 4 trụ, 8 quái, boss 5 pha, cổ vật | Bản thử A: 2 trụ, 3 loại quái, chưa có boss | Trả lời câu hỏi "có vui không" trước, rồi mới đầu tư nhiều. |
| Tiến trình | Chương 1-1…, sao, cổ vật, mở khóa riêng | Dùng chung cấp từ vựng. Bản đồ chia theo World. Có sao. Chưa nối ví ở bản thử. | Tránh một hệ tiến trình thứ hai chạy song song với cửa hàng, ví và Warp hiện có. |
| Online | 1–8 người, đấu xếp hạng, Weekly Rift | Tối đa 4 người, ở giai đoạn cuối. Đấu xếp hạng xem lại sau. | Theo quyết định của chủ dự án. Gói Free có giới hạn số giờ mở phòng mỗi ngày (mục 11a). Duel 1 đấu 1 còn chưa chuyển lên Cloudflare. |
| Theme tàu / rồng | Cả hai ngay từ đầu | Bản thử chỉ có rồng. Phần hình ảnh tách khỏi phần luật ngay từ đầu, nên thêm theme tàu về sau sẽ rẻ. | Giảm khối lượng bản thử. |

**Giữ nguyên từ V1:**
- thứ tự: chơi một mình trước;
- tiêu chí thất bại rõ ràng;
- không tăng sức mạnh vô hạn theo cấp tài khoản;
- không bán sức mạnh;
- cấu trúc dữ liệu cho trụ, quái và đợt;
- tách luật khỏi phần hình ảnh.

---

## 2. Luật không được phá

1. **Từ gõ đúng là đòn kết liễu duy nhất, và một từ diệt đúng một con.**
   - Trụ không gây sát thương. Trụ chỉ được làm chậm, giữ, gom, phá lớp, gợi ý hoặc đọc to.
   - Quái xung quanh chỉ bị diệt theo khi từ vừa gõ kích hoạt một vụ nổ: từ bom (mục 5.6), hoặc kỹ năng Hơi thở lửa của rồng (mục 7).
2. **Mọi chữ trên quái là từ vựng thật.** Diệt xong, game hiện nghĩa tiếng Việt, IPA và phát âm, như chế độ bắn đang làm (`PROJECT_CONTEXT.md` mục 4.3).
3. **Bàn phím là chính:**
   - chữ cái chỉ dùng để gõ;
   - phím 1–4 dùng cho kỹ năng;
   - phím Space dùng cho đòn mạnh nhất;
   - phím Esc để tạm dừng;
   - chuột chỉ dùng trong pha xây, lúc thời gian đang dừng;
   - pha xây cũng phải chơi được hoàn toàn bằng phím.
4. **Không điều khiển di chuyển rồng.**
5. **Trụ giúp gõ kịp và giúp nhớ, không gõ thay người chơi.**
6. **Gõ sai phải có giá:** mất combo, và từ đó bị đánh dấu để ôn lại (`PROJECT_CONTEXT.md` mục 2.2).
7. **Ghi nhận việc học cho đúng:** từ gõ nhờ gợi ý thì gửi `hintUsed: true`. Chỉ tính "đã thuộc" khi người chơi tự gõ đúng mà không có gợi ý.
8. **Màn hình phải đọc được:**
   - cùng lúc tối đa 8 nhãn chữ, đặt trên những con quái gần Lõi nhất. Con nào bị diệt thì con kế tiếp hiện chữ;
   - chữ cái đầu của các nhãn khác nhau (`WordPicker` của Campaign 3D đã làm việc này).
9. **Bộ gõ tiếng Việt không được gây lỗi.** Có hai loại bộ gõ, và chúng tới trang web theo hai cách khác nhau:
   - **Bộ gõ của hệ điều hành hoặc trình duyệt** (bàn phím tiếng Việt có sẵn của Windows và macOS). Phím đang ghép dấu tới trang với `event.isComposing`, `key === "Process"` hoặc mã phím 229. Bỏ qua các phím này, như `src/main.ts` dòng 11931 đang làm.
     - **Đã sửa cho Campaign 3D ngày 18/10** (`src/campaign3d/keys.ts`, bài kiểm thử `tests/campaign3d-keys.test.ts`).
   - **UniKey và EVKey chạy ngoài trình duyệt.** Chúng nuốt phím đặt dấu, rồi gửi phím xóa lùi kèm chữ có dấu. Ví dụ: chữ "o" thứ hai của "good" thành "ô", chữ "s" của "is" thành "í", chữ "w" của "how" thành "ơ". Phím gốc không bao giờ tới trang, nên game không đọc lại được.
     - Bản Monkeytype của nền tảng phải dựng hẳn một lớp xử lý riêng và thử trên máy thật có UniKey/EVKey (`games/monkeytype/docs/CUSTOM_VIETNAMESE_IME_ACCEPTANCE.md`).
     - **Hiện nay:** Campaign 3D nhận ra dấu hiệu bộ gõ đang bật và hiện lời nhắc tắt bộ gõ. Có thêm công cụ ghi lại các phím (`__campaign3d.keyTrace(true)`) để lấy mẫu trên máy thật.
     - **Cho Defense:** làm lớp khôi phục phím Telex (đoán lại phím gốc từ chữ có dấu) sau khi có mẫu phím ghi trên máy thật có UniKey và EVKey.
     - Chế độ 2D cũng bị vấn đề này. Cần duyệt riêng trước khi sửa.
10. **Tách khỏi chế độ 2D:** dùng cùng ranh giới với Campaign 3D, và mở rộng bài kiểm thử `tests/mode-isolation.test.ts` cho `src/defense/`.

---

## 3. Vòng chơi

```text
Chọn bản đồ → [Pha xây → Pha đợt → Kết đợt] × 8–12 → Kết màn
```

### 3.1 Pha xây (thời gian dừng)

- Người chơi có **Năng lượng**, là tiền dùng trong trận.
- Việc làm được:
  - đặt trụ vào **ô có sẵn** dọc đường đi;
  - nâng cấp trụ;
  - bán trụ (lấy lại 70 %).
- Điều khiển:
  - chuột: bấm vào ô rồi chọn trụ;
  - phím: dùng ↑↓←→ chọn ô, 1–4 chọn trụ, `U` nâng cấp, `Backspace` bán.
  - Lúc này không có chữ để gõ, nên dùng được phím chữ.
- Bấm `Enter` để bắt đầu đợt.
- Không giới hạn thời gian ở mức Dễ và Thường. Mức Khó có đếm ngược 20 giây.

### 3.2 Pha đợt (gõ chữ)

- Quái ra từ cổng, men theo đường về Lõi.
- **Mỗi con quái mang một từ.** Gõ đúng thì rồng phun cầu lửa diệt **đúng con đó**.
- Chỉ khoảng 8 con gần Lõi nhất hiện chữ. Những con xa hơn đi tới mà chưa có chữ, và nhận chữ khi tới lượt. Nhờ vậy màn hình gọn dù quái đông.
- Quái mạnh mang **2–3 từ**: mỗi từ đúng phá một lớp, từ cuối diệt nó.
- **Từ bom** (mục 5.6): gõ xong thì nổ, diệt luôn quái thường trong vòng nổ, và phá một lớp của quái mạnh.
- Cách ngắm giữ như hiện nay: gõ chữ cái đầu để khóa mục tiêu, rồi gõ tiếp cho hết từ.
- Không xây trụ trong pha này. Nhờ vậy hai tay luôn ở trên bàn phím.
- Phím 1–4 dùng kỹ năng của rồng (mục 7), năng lượng nạp bằng combo.

### 3.3 Lọt vào Lõi

- Lõi có **20 mạng**.
- Quái thường lọt vào Lõi mất 1 mạng, quái mạnh mất 3.
- Lõi còn 0 mạng là thua.

### 3.4 Kết đợt (5–8 giây)

- Cộng Năng lượng: thưởng đợt, cộng thêm phần thưởng theo độ chính xác.
- **Ôn nhanh:** hiện tối đa 3 từ vừa gõ sai hoặc gõ chậm, kèm nghĩa, IPA và phát âm. Bấm Enter để bỏ qua.
- Những từ này sẽ quay lại ở 1–2 đợt sau (mục 4.5).

### 3.5 Kết màn

Màn kết quả có:
- số sao;
- số từ mỗi phút;
- độ chính xác;
- danh sách từ mới đã thuộc, từ cần ôn, và số quái bị diệt khi đang dính hiệu ứng.

**Thời lượng mục tiêu:** mỗi đợt 40–60 giây, mỗi pha xây 10–20 giây, cả màn 8–12 phút.

---

## 4. Gõ chữ và học từ

### 4.1 Nguồn từ

- Cấp từ vựng người chơi đang chọn: `shared/vocabulary/levels/NNN.json`, mỗi từ có `en`, `vi`, `ipa`.
- Từ tùy chỉnh của người chơi, nếu đang dùng.
- **Màn "Ôn từ yếu":** nền tảng chung gửi danh sách từ cần ôn qua tin `typing-game:learning:v1:review-dataset`. Space Typing đã đọc tin này (`src/learning/shared.ts`, `parseSpaceReviewDataset`). Defense dùng danh sách đó làm kho từ cho một màn.

### 4.2 Ba kiểu hiện chữ

| Kiểu | Trên quái hiện gì | Người chơi phải làm | Mức khó |
|---|---|---|---|
| **Nhìn chữ** | Từ tiếng Anh | Chép lại | Dễ (giống chế độ bắn hiện nay) |
| **Nhìn nghĩa** | Nghĩa tiếng Việt; từ tiếng Anh ẩn, gõ đúng chữ nào hiện chữ đó | Nhớ ra từ | Vừa (dùng lại `src/recall/model.ts`) |
| **Nghe** | Chỉ có biểu tượng loa; phát âm khi quái vào tầm | Nghe rồi gõ | Khó |

- **Bản thử A:** tất cả nhìn chữ. Có thêm tùy chọn "Quái mạnh dùng kiểu nhìn nghĩa".
- **Bản B:**
  - quái thường dùng kiểu nhìn chữ;
  - quái mạnh dùng kiểu nhìn nghĩa;
  - boss dùng kiểu nhìn nghĩa và nghe;
  - người chơi chỉnh được trong cài đặt (mức "Dễ" thì mọi quái đều nhìn chữ).

### 4.3 Gõ sai

- Chữ gõ sai không được tính. Từ đang gõ không bị xóa.
- Combo về 0.
- Từ đó bị đánh dấu để ôn lại.
- Không thêm hình phạt khác ở bản thử. Mất combo đã làm chậm việc nạp kỹ năng, như vậy là đủ áp lực.

### 4.4 Sau mỗi từ

Diệt xong, game hiện nghĩa và IPA ở giữa phía trên màn hình, rồi đọc to từ đó (dùng lại `speakEnglish` và phần hiện chữ của Campaign 3D). Khi nhiều từ xong liền nhau, phát âm không được chồng lên nhau.

### 4.5 Ôn lại trong màn

- Từ gõ sai, hoặc gõ chậm hơn 2,5 lần mức trung bình của người chơi, sẽ quay lại sau 1–2 đợt.
- Mỗi từ quay lại tối đa 3 lần trong một màn.
- Gõ đúng mà không có gợi ý thì bỏ từ đó khỏi danh sách ôn.

### 4.6 Gửi sự kiện học lên nền tảng

Dùng `buildCombatLearningEvent` và `buildRecallLearningEvent` (`src/learning/shared.ts`) qua tin `typing-game:learning:v1:attempt`, như chế độ bắn đang làm:
- `activityType`: `"typing"` cho kiểu nhìn chữ, `"recall"` cho kiểu nhìn nghĩa, `"listening"` cho kiểu nghe (giá trị mới, cần báo cho nền tảng);
- `hintUsed: true` khi trụ gợi ý đã hiện chữ;
- `replayUsed: true` khi người chơi bấm nghe lại.

### 4.7 Chỉ số học cần đo

- Số từ gõ mỗi phút **trong pha đợt**.
- Độ chính xác.
- Tỉ lệ từ có gợi ý trên từ không có gợi ý.
- Số từ "đã thuộc" mỗi màn.

Mục tiêu bản thử: số từ mỗi phút **không thấp hơn 70 %** so với chế độ bắn hiện tại, với cùng người chơi và cùng cấp từ vựng.

---

## 5. Trụ: ưu tiên hiệu ứng

### 5.1 Luật chung của trụ

- Trụ có sát thương bằng 0. Trụ chỉ gây hiệu ứng, hoặc phá một lớp khiên hay giáp.
- Mỗi hiệu ứng có thời gian hồi.
- **Quái quen dần:** quái bị cùng một hiệu ứng nhiều lần trong 6 giây thì tác dụng giảm dần: 100 % → 60 % → 30 %. Nhờ vậy không thể giữ quái đứng yên mãi.
- Một số loại quái miễn nhiễm một hiệu ứng (mục 6), buộc người chơi phối hợp nhiều loại trụ.
- **Thưởng khi phối hợp:** gõ diệt quái đang dính hiệu ứng thì được thêm thưởng. Ví dụ quái đang đóng băng vỡ tan, bắn mảnh băng làm chậm con bên cạnh. Như vậy trụ "có công" mà không cần diệt quái.

### 5.2 Danh sách trụ

| # | Trụ (tên trong game) | Làm gì | Giúp người gõ | Giúp học | Có ở bản |
|---|---|---|---|---|---|
| 1 | **Trụ Băng** (Frost Spire) | Làm chậm 40 % trong tầm. Nâng cấp: đóng băng 1 giây khi quái mới vào tầm. | Có thêm thời gian gõ | Có thêm thời gian nhớ từ | A |
| 2 | **Trụ Xích** (Gravity Chain) | Kéo quái trong tầm sát lại thành cụm và giữ chúng chậm lại 20 %. Không làm một từ diệt được nhiều con. | Gom quái cho vụ nổ của từ bom cuốn được nhiều con hơn; giữ cụm quái lại một chỗ | — | A |
| 3 | **Trụ Phá Giáp** (Breaker) | Quái mạnh trong tầm mất một lớp (bớt một từ phải gõ), 8 giây một lần | Quái mạnh chết nhanh hơn | Từ không bị cắt ngắn; người chơi vẫn học trọn từ | B |
| 4 | **Trụ Gợi Ý** (Oracle Lantern) | Quái kiểu nhìn nghĩa trong tầm hiện chữ cái đầu. Nâng cấp: hiện IPA. | Dễ nhớ ra từ | Có gợi ý khi chưa nhớ. Từ đó được ít điểm hơn và ghi `hintUsed`. | B |
| 5 | **Trụ Vang** (Echo Bell) | Đọc to từ của quái gần nhất khi nó vào tầm | Biết trước từ sắp phải gõ | Luyện nghe; là cách chính để chơi kiểu nghe | B |
| 6 | **Trụ Khiên Lõi** (Core Ward) | Chặn 1 quái lọt vào Lõi mỗi đợt | Có chỗ sai | — | B |
| 7 | **Trụ Dò** (Seer Eye) | Làm lộ quái tàng hình, cho phép gõ nó | Thấy được mục tiêu | — | C |
| 8 | **Trụ Thời Gian** (Chrono Obelisk) | Gõ đúng một từ từ 7 chữ trở lên thì cả màn chậm lại 2 giây | Thưởng cho từ dài | Khuyến khích gõ từ khó | C |
| 9 | **Trụ Đánh Dấu** (Hunter Mark) | Quái trong tầm cho điểm ×1,5 khi bị diệt, nhưng đi nhanh hơn 15 % | Đổi rủi ro lấy điểm | — | C |
| 10 | **Trụ Mồi Nổ** (Volatile Beacon) | Cứ 10 giây biến từ của một quái trong tầm thành **từ bom** (mục 5.6) | Tạo vụ nổ đúng chỗ quái đông | Thường chọn từ dài hơn, nên người chơi được luyện từ khó | B |

**Ghi chú về Trụ Gợi Ý:** đây là chỗ chiến thuật gắn với trình độ tiếng Anh.
- Người mới hoặc cấp từ vựng khó sẽ đặt nhiều Trụ Gợi Ý và Trụ Băng.
- Người giỏi sẽ bỏ gợi ý để lấy đủ điểm, và chọn Trụ Xích, Trụ Phá Giáp để diệt nhanh hơn.

### 5.3 Nâng cấp

- Mỗi trụ có 3 cấp.
- Từ bản B, một số trụ có **2 nhánh** ở cấp 3 (không phải trụ nào cũng có). Ví dụ:
  - Trụ Băng: "Đóng băng sâu" (giữ quái lâu hơn) hoặc "Băng lan" (tầm rộng hơn, làm chậm ít hơn);
  - Trụ Xích: "Xích chặt" (gom chặt hơn) hoặc "Xích dài" (tầm xa hơn).

### 5.4 Ô đặt trụ

- Dùng **ô cố định** dọc đường đi, mỗi bản đồ 6–10 ô.
- Lý do:
  - dễ cân bằng;
  - chọn ô bằng phím được;
  - không cần tìm đường động.
- Chọn ô nào là chiến thuật: ô ở khúc cua thì trụ Băng giữ quái lâu hơn, ô gần cổng thì trụ Xích gom quái sớm hơn.

### 5.5 Năng lượng (tiền trong trận)

- **Chỉ kiếm được bằng gõ chữ**, vì trụ không diệt quái:
  - mỗi từ đúng;
  - thưởng theo mốc combo;
  - đợt không để quái lọt;
  - thưởng theo độ chính xác.
- Chặn tình trạng giàu càng thêm giàu (gõ giỏi → nhiều trụ → càng dễ gõ):
  - giá trụ cùng loại tăng dần;
  - số ô có hạn;
  - quái quen dần với hiệu ứng.
- **Số khởi điểm để thử** (sẽ chỉnh sau khi đo):

| Mục | Năng lượng |
|---|---|
| Lúc bắt đầu màn | 120 |
| Mỗi từ đúng | 4 |
| Mỗi mốc combo 10 | 10 |
| Đợt không để quái lọt | 25 |
| Trụ Băng | 60 (nâng cấp: 50, 90) |
| Trụ Xích | 80 (nâng cấp: 60, 110) |

### 5.6 Từ bom: cách duy nhất để một từ diệt nhiều con

- Một số con quái mang **từ bom**: chữ có viền đỏ cam và nhấp nháy nhẹ, đủ để nhìn là nhận ra ngay.
- Gõ xong từ bom thì con quái đó nổ thành quả cầu lửa:
  - diệt luôn quái thường trong bán kính 3 mét;
  - phá một lớp của quái mạnh trong vòng nổ;
  - không làm hại Lõi, trụ hay rồng.
- **Nguồn từ bom:**
  - quái **Volatile** (bản A), lúc nào cũng mang từ bom;
  - **Trụ Mồi Nổ** (bản B), cứ 10 giây gắn từ bom cho một quái trong tầm;
  - kỹ năng **Hơi thở lửa** của rồng (mục 7): trong 6 giây, mọi từ gõ đúng đều thành từ bom.
- **Phối hợp:** Trụ Xích gom quái thành cụm, nên vụ nổ cuốn được nhiều con hơn. Đây là cách phối hợp trụ chính ở bản A.
- **Học từ:** từ bom thường là từ dài hơn trong cấp từ vựng. Người chơi được thưởng vì gõ đúng từ khó.
- **Ghi nhận việc học:** quái bị nổ cuốn theo không tính là "đã gõ". Chỉ từ bom tính là một lần gõ đúng.

---

## 6. Quái

Dùng lại 14 loại quái của chế độ bắn, cùng tên (`scout`, `tank`, `shield`…), với cách hành xử hợp kiểu thủ thành:

| Quái | Hành xử | Số từ | Quan hệ với trụ | Có ở bản |
|---|---|---|---|---|
| **Scout** | Nhanh, đi thành đàn | 1 từ mỗi con | Bị ảnh hưởng đủ | A |
| **Tank** | Chậm, chịu đòn | 2–3 từ | Chỉ bị làm chậm 50 % so với bình thường | A |
| **Volatile** | Đi giữa đàn Scout, mang **từ bom** (mục 5.6) | 1 từ bom | Bị Trụ Xích gom cùng đàn, nên một vụ nổ cuốn được nhiều con | A |
| **Shield** | Che khiên cho quái bên cạnh: chúng miễn hiệu ứng băng cho tới khi Shield bị diệt | 1 từ | Buộc người chơi gõ nó trước | B |
| Splitter | Chết thì tách thành 2 con nhỏ, mỗi con một từ ngắn | 1 + 2 | — | B |
| Healer | Hồi lại một lớp giáp cho quái mạnh quanh nó | 1 | Nên gõ trước | B |
| Jammer | Làm nhiễu Trụ Gợi Ý trong tầm (tắt gợi ý) | 1 | Chống lại việc dựa vào gợi ý | B |
| Cloaker | Tàng hình, chữ ẩn cho tới khi vào tầm Trụ Dò | 1 | Cần Trụ Dò | C |
| Carrier | Thả quái con dọc đường | 2 | — | C |
| Commander | Làm nhóm quanh nó đi nhanh hơn 20 % | 2 | Miễn nhiễm xích | C |
| Boss | 3 pha (mục 8) | nhiều | — | B |

**Hình ảnh quái:**
- dùng mô hình 3D có sẵn (ví dụ `enemies/rainbow-scout-3d`);
- loại nào chưa có mô hình thì dùng ảnh vẽ dựng thành tấm phẳng, như `src/campaign3d/actors.ts` đang làm;
- họ quái (`rainbow`, `frost`…) đi theo World.

---

## 7. Rồng

- Rồng Draconis v3 lượn trên Lõi. Đây là **nguồn sát thương duy nhất**: gõ xong một từ thì rồng phun cầu lửa vào mục tiêu.
  - Dùng lại cầu lửa 3D, vệt sáng, tiếng phun và hiệu ứng nổ đã làm cho Campaign 3D.
  - Hình ảnh người chơi thấy: gõ đúng → rồng phun lửa.
- Không điều khiển di chuyển. Rồng quay đầu về phía mục tiêu đang khóa.
- **Kỹ năng** (nạp năng lượng bằng combo, giống thanh Nova hiện có):
  - **Phím 1 — Hơi thở lửa:** trong 6 giây, mọi từ gõ đúng đều thành từ bom (mục 5.6). Đòn diệt vẫn bắt đầu từ một từ gõ đúng.
  - **Phím 2 — Tiếng gầm:** đẩy lùi mọi quái 4 mét theo đường đi.
  - **Phím 3 — Cánh chắn** (bản B): Lõi không mất mạng trong 5 giây.
  - **Space — Nova** (bản B): chỉ dùng được khi thanh đầy. Mọi nhãn chữ trên màn hình chuyển sang từ ngắn (≤ 4 chữ) trong 8 giây.
- **Bản thử A** chỉ có phím 1 và phím 2.

---

## 8. Lõi, thắng thua và boss

- **Thắng:** qua hết các đợt mà Lõi còn mạng.
- **Sao:**
  - 1 sao: thắng;
  - 2 sao: Lõi còn ≥ 80 % mạng;
  - 3 sao: độ chính xác ≥ 95 %.
  - Sao thứ ba gắn với gõ chính xác, tức là gắn với việc học.
- **Mức khó:** Dễ, Thường, Khó. Mức khó đổi nhiều thứ, không chỉ máu quái:
  - kiểu hiện chữ (mục 4.2);
  - tốc độ quái;
  - cách quái trộn trong đợt;
  - thời gian của pha xây.
- **Boss (bản B), 3 pha:**
  1. Boss đi theo đường và thả quái con. Người chơi gõ để phá 3 lớp giáp.
  2. Boss dừng lại và chặn một trụ. Người chơi gõ một **cụm từ ngắn** lấy từ kho câu chung (`shared/typing-texts`) để gỡ chặn.
  3. Boss chạy về Lõi. Mỗi từ đúng đẩy nó lùi lại. Đây là cuộc đua tốc độ gõ.

---

## 9. Góc nhìn, bản đồ, hình ảnh, âm thanh

- **Góc nhìn:**
  - nhìn chéo từ trên cao, kiểu isometric (góc chéo từ trên xuống);
  - xoay nhẹ hai bên bằng phím `[` `]`, hoặc kéo chuột. Dùng lại `viewYaw` của `SpaceStage`;
  - bản thử không cần kéo bản đồ, vì cả bản đồ vừa một màn hình.
- **Bản đồ:**
  - một đường đi (đường cong spline) trên một mỏm đá nổi giữa không gian;
  - phía sau là vòm trời của World (`src/scene3d/world.ts`, phần bầu trời);
  - bản thử có 1 bản đồ, 1 cổng, 1 đường đi.
- **Mô hình cần thêm** (Claude viết prompt Meshy/Tripo, chủ dự án tạo, Claude xử lý trong Blender):
  - Lõi (khối tinh thể);
  - Trụ Băng và Trụ Xích, mỗi trụ 3 cấp (có thể dùng 1 mô hình kèm phần gắn thêm cho mỗi cấp);
  - ô đặt trụ;
  - cổng.
- **Nhãn chữ:** nhãn HTML như Campaign 3D, cùng lúc tối đa 8 nhãn.
- **Hiệu năng và cách vẽ quái:** theo số đo ở mục 9a.
- **Âm thanh:**
  - theo quy tắc của chủ dự án: chỉ dùng bản thu thật có giấy phép CC0 (Freesound), không dùng âm tổng hợp;
  - cần tìm thêm: tiếng băng đóng, tiếng xích, tiếng Lõi bị đánh, tiếng cổng mở;
  - dùng lại tiếng rồng và tiếng giao diện đã có.

---

## 9a. Hiệu năng: 2D hay 3D, và tối đa bao nhiêu quái (đo ngày 18/10/2026)

### 9a.1 Câu hỏi của chủ dự án

- Hình 2D có thể hiện được việc quái di chuyển và quay mình không, hay phải dùng 3D?
- Nếu dùng 3D thì xử lý thế nào khi quái đông?
- Nên cho hiện tối đa bao nhiêu quái?

### 9a.2 Cách đo

- **Trang đo riêng:** `defense-bench.html` và `src/bench/defense-bench.ts`.
  - Chỉ được build khi bật `SPACE_BENCH=1`. Bản build bình thường không có trang này.
  - Kịch bản đo: `scripts/visual/scenarios/defense-bench.mjs`.
- **Cảnh đo dựng như một màn Defense thật**, giống nhau ở mọi lần đo:
  - bầu trời World 1, sao, và ánh sáng lan (bloom) ở mức High;
  - mặt đất, đường đi dài 254 m, 8 trụ phát sáng;
  - rồng Draconis v3 đang bay (khoảng 60.000 tam giác, có xương);
  - 6 nhãn chữ bám theo quái;
  - mỗi giây 2 quả cầu lửa trúng quái, nổ bằng ảnh lửa thật;
  - 1/3 số quái nhuốm màu lạnh, như đang bị Trụ Băng làm chậm.
- **Quái** là Rainbow Scout. Chúng bay theo đường, quay mặt theo hướng đi và vỗ cánh.
- **Máy đo:**
  - laptop của chủ dự án, card NVIDIA RTX 3050 Ti Laptop, trình duyệt Chrome;
  - cửa sổ 1920×1080;
  - tắt giới hạn 60 khung hình/giây, để đo được sức chịu thật.
- **Cách lấy số:** mỗi cấu hình đo 3 lần, mỗi lần 2,5 giây, thứ tự xen kẽ giữa các lần; lấy số ở giữa.
- **Giả máy yếu:** thêm một lượt dùng công cụ của Chrome làm chậm CPU 4 lần, để giả một laptop có CPU yếu. Card đồ họa thì không giả được.

### 9a.3 Sáu cách vẽ đã đo

| Cách vẽ | Là gì | Thấy di chuyển | Thấy quay mình | Số lệnh vẽ cho N quái |
|---|---|---|---|---|
| **Tranh phẳng** (Campaign 3D đang dùng khi quái chưa có mô hình) | Ảnh vẽ 2D; mỗi quái 3 tấm: thân, lớp lóe sáng, quầng | Có | **Không.** Luôn cùng một mặt, chỉ lật trái phải được | 3N |
| Tranh phẳng theo lô | Như trên, nhưng mọi quái chung 1 lệnh vẽ | Có | Không | 1 |
| **Ảnh chụp sẵn nhiều góc** | Mô hình 3D được chụp sẵn từ 16 hướng × 4 nhịp cánh, gói trong một ảnh 448 KB. Mọi quái chung 1 lệnh vẽ; mỗi con hiện tấm ảnh đúng phía nó đang quay về máy quay | Có | **Có**, theo từng bước 22,5° | 1 |
| Mô hình riêng (Campaign 3D đang dùng khi có mô hình) | Mỗi quái một bản sao mô hình 7.000 tam giác, chất liệu và hoạt ảnh riêng | Có | Có, mượt | 2N (cả quầng) |
| Mô hình theo lô | Mô hình 7.000 tam giác, mọi quái chung 1 lệnh vẽ | Có | Có, mượt | 1 |
| **Mô hình rút gọn theo lô** | Bản 1.500 tam giác của cùng mô hình, mọi quái chung 1 lệnh vẽ | Có | Có, mượt | 1 |

So sánh trên ảnh chụp (lưu ở máy, `.visual/scenarios/bench/`):
- tranh phẳng: mọi con là cùng một bức tranh nhìn thẳng, kể cả khi đang đi ngang;
- ảnh chụp sẵn và mô hình: con đi ngang thấy rõ thân bên, con đi xuống thấy mặt trước.

### 9a.4 Kết quả

Số trong bảng là **mili giây cho một khung hình**. Để đạt 60 khung hình/giây, mỗi khung phải xong trong **16,7 ms**. Dấu "—" là cấu hình không đo, vì cách vẽ đó quá chậm ở số quái này.

**Mức High** (có ánh sáng lan), máy đo:

| Cách vẽ | 50 quái | 100 | 200 | 400 | 800 |
|---|---|---|---|---|---|
| Tranh phẳng | 1,4 | 1,7 | 2,7 | 4,4 | — |
| Tranh phẳng theo lô | 1,3 | 1,3 | 1,3 | 1,3 | 1,4 |
| Ảnh chụp sẵn | 1,3 | 1,3 | 1,4 | 1,4 | 1,6 |
| Mô hình riêng | 1,5 | 1,9 | 2,9 | 5,4 | — |
| Mô hình theo lô | 1,5 | 1,8 | 2,2 | 3,1 | 4,9 |
| Mô hình rút gọn theo lô | 1,4 | 1,6 | 1,9 | 2,3 | 3,3 |

**Mức High, CPU chậm 4 lần** (giả laptop có CPU yếu):

| Cách vẽ | 50 quái | 100 | 200 | 400 | 800 |
|---|---|---|---|---|---|
| Tranh phẳng | 8,0 | 9,3 | 12,7 | **21,6** | — |
| Tranh phẳng theo lô | 4,8 | 4,6 | 4,4 | 4,3 | 5,4 |
| Ảnh chụp sẵn | 4,7 | 4,8 | 4,5 | 5,4 | 6,0 |
| Mô hình riêng | 9,1 | 10,4 | 14,5 | **23,0** | — |
| Mô hình theo lô | 4,5 | 5,1 | 5,1 | 5,6 | 6,0 |
| Mô hình rút gọn theo lô | 4,8 | 5,4 | 5,8 | 4,7 | 5,2 |

**Mức Medium** (không có ánh sáng lan), máy đo:

| Cách vẽ | 50 quái | 100 | 200 | 400 | 800 |
|---|---|---|---|---|---|
| Tranh phẳng | 1,1 | 1,6 | 2,2 | 4,0 | — |
| Tranh phẳng theo lô | 0,9 | 0,9 | 0,9 | 0,9 | 0,9 |
| Ảnh chụp sẵn | 0,9 | 0,9 | 0,9 | 1,0 | 1,0 |
| Mô hình riêng | 1,1 | 1,6 | 2,9 | 4,8 | — |
| Mô hình theo lô | 1,1 | 1,4 | 1,9 | 2,7 | 4,1 |
| Mô hình rút gọn theo lô | 1,0 | 1,2 | 1,5 | 2,0 | 2,7 |

**Số khác:**
- Số tam giác ở 800 quái: mô hình theo lô 5,7 triệu, mô hình rút gọn 1,3 triệu, ảnh chụp sẵn gần như không thêm.
- Tạo 400 bản sao mô hình mất 15 ms, và 50 ms khi CPU chậm 4 lần. Nếu tạo giữa trận thì đủ để thấy giật.
- Bộ nhớ JavaScript ở mọi cấu hình: 25–45 MB.

### 9a.5 Đọc kết quả

1. **Vẽ theo lô gần như không tốn thêm khi quái đông. Vẽ từng con thì nghẽn ở CPU.**
   - Với CPU yếu, cách "mô hình riêng" hiện nay mất 14,5 ms ở 200 quái và 23 ms ở 400 quái. Mức 400 đã quá 16,7 ms, mà chưa tính phần luật chơi, nhãn chữ và âm thanh. Tranh phẳng từng con cũng vậy.
   - Với CPU yếu, mọi cách vẽ theo lô chỉ mất 4,3–6,0 ms, kể cả ở 800 quái.
2. **Phần nền tốn nhiều hơn đám quái.** Bầu trời, ánh sáng lan, rồng và cầu lửa mất khoảng 1,2 ms trên máy đo, và khoảng 4,5 ms khi CPU chậm 4 lần.
3. **Card đồ họa yếu: chưa đo, chỉ là ước tính.**
   - Card tích hợp kiểu Intel Iris Xe chậm hơn RTX 3050 Ti khoảng 3 lần. Intel UHD đời cũ (ví dụ UHD 620) chậm khoảng 10 lần.
   - Nhân cả thời gian khung hình lên theo tỉ lệ đó (cách tính dè dặt):
     - Iris Xe, mức High, 300 quái mô hình rút gọn: khoảng 6–7 ms, chơi tốt;
     - UHD đời cũ: không nên dùng mức High, vì riêng phần nền đã khoảng 12 ms;
     - UHD đời cũ, mức Medium, 150 quái mô hình rút gọn: khoảng 13 ms;
     - UHD đời cũ, 300 quái bằng ảnh chụp sẵn: khoảng 9–10 ms.
   - Cần đo thật trên một laptop yếu (mục 9a.7) trước khi chốt.

### 9a.6 Trả lời và đề xuất

**Hình 2D có làm được hiệu ứng di chuyển không?**
- **Tranh phẳng:** di chuyển, nhún, nghiêng, lật trái phải và lóe sáng được, nhưng **không thể hiện được việc quay mình**. Đi vòng cua thì quái vẫn cùng một mặt. Chỉ nên dùng tạm cho loại quái chưa có mô hình.
- **Ảnh chụp sẵn nhiều góc** (vẫn là ảnh 2D):
  - quay mình được (16 hướng), có nhịp cánh, và là cách rẻ nhất;
  - nhược điểm: ánh sáng cố định; đổi hướng theo từng bước 22,5°; nhìn gần thấy hơi phẳng;
  - mỗi loại quái cần một bộ ảnh riêng. Script `scripts/models/blender/bake_impostor.py` dựng một bộ trong khoảng 30 giây.

**Cách vẽ đề xuất cho Defense:**
- **Mức High và Medium:**
  - quái thường dùng **mô hình rút gọn theo lô**: khoảng 1.500 tam giác, mỗi loại quái 1 lệnh vẽ;
  - quái tinh nhuệ và boss (ít con) dùng mô hình đầy đủ, có hoạt ảnh riêng.
- **Mức Low** (mức mới, cho máy yếu): **ảnh chụp sẵn nhiều góc**, tắt ánh sáng lan.
- **Quái ở xa máy quay:** dùng ảnh chụp sẵn được ở mọi mức.
- **Không** dùng cách "mỗi quái một bản sao" của Campaign 3D cho đám đông. Cách này chỉ dùng cho quái tinh nhuệ và boss.

**Số quái tối đa trên màn hình:**
- **Theo nhịp chơi:** mỗi từ diệt một con (trừ từ bom). Người gõ 30–40 từ/phút diệt khoảng 0,5–0,7 con mỗi giây. Vì vậy:
  - một đợt thường nên có **20–60 con** cùng lúc trên màn hình;
  - chỉ đợt dồn có nhiều từ bom mới lên **150** con.
- **Theo hiệu năng:** đặt trần **300 con cùng lúc** cho mọi mức. Với cách vẽ đề xuất, máy đo còn dư rất nhiều ngay cả ở 800 con. Trần 300 để chừa chỗ cho máy yếu và cho hiệu ứng.

**Chuyển động và góc quay khi vẽ theo lô:**
- Vẽ theo lô không chạy được hoạt ảnh xương riêng cho từng con. Chuyển động lấy từ ba nguồn:
  - **bộ đổ bóng đỉnh** (đoạn mã chạy trên card đồ họa, dịch từng điểm của mô hình): vỗ cánh, nhún, nghiêng khi rẽ, lóe sáng khi trúng đòn. Trang đo đã có phần vỗ cánh;
  - **quái có chân đi bộ:** ghi sẵn chu kỳ bước vào một ảnh dữ liệu, rồi phát lại trong bộ đổ bóng (kỹ thuật "vertex animation texture"). Đây là việc của bản B, cần thử với một mô hình có chân;
  - **hướng quay:** tính theo hướng đi trên đường, xoay mượt.
- **Tạo quái không giật:** tạo sẵn một kho quái khi vào màn, rồi lấy ra dùng lại.
- **Tự hạ mức đồ họa:** đo thời gian mỗi khung hình trong 5 giây đầu. Nếu quá 20 ms thì gợi ý, hoặc tự hạ một mức.

**VFX và âm thanh:**
- VFX đã dùng kho hạt có giới hạn theo mức đồ họa (High: 2.400 hạt). Mỗi vụ nổ lấy một ô trong kho 14 ảnh lửa. Các con số đo ở trên đã gồm phần này.
- **Âm thanh chưa được đo trong trang đo.** Cần:
  - giới hạn số tiếng nổ cùng lúc, ví dụ tối đa 6;
  - gộp các vụ nổ sát nhau thành một tiếng lớn hơn. `SceneAudio` đã có khoảng cách tối thiểu giữa hai tiếng giống nhau.

### 9a.7 Đo lại hoặc đo trên máy khác

1. Build có trang đo: chạy `SPACE_BENCH=1 pnpm build:space`.
2. Xem bằng mắt: mở `https://space.typing-game.local/defense-bench.html?q=high`. Đổi cách vẽ và số quái bằng `__bench.set({ mode: "lod", count: 300, vfx: true })` trong DevTools.
3. Đo tự động:
   ```text
   CHROME_FLAGS="--disable-gpu-vsync --disable-frame-rate-limit --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling" \
   URL=https://space.typing-game.local/ REPEAT=3 Q=high \
   node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense-bench.mjs --headful --width=1920 --height=1080
   ```
   Kết quả JSON nằm ở `.visual/scenarios/bench/`.
4. Nên đo thêm trên một laptop dùng card tích hợp trước khi chốt các con số cho bản A.

---

## 10. Kỹ thuật

### 10.1 Vị trí mã

- **Trang riêng:** `defense.html`.
- **Mã riêng:** `src/defense/`, chia hai phần:
  - `src/defense/rules/`: **luật**, chỉ là TypeScript thuần, không dùng three.js và không đụng tới trang web. Chạy theo bước thời gian cố định, ví dụ 1/30 giây.
  - `src/defense/view/`: **phần hình ảnh và âm thanh**, chỉ đọc trạng thái từ phần luật.
- **Dùng lại:**
  - `src/scene3d/`: sân khấu 3D, hiệu ứng, âm thanh rồng, bầu trời World;
  - `src/campaign3d/actors.ts` và `words.ts`: chuyển ra chỗ dùng chung (ví dụ `src/scene3d/`), để Defense không phải nạp mã của Campaign 3D;
  - `src/recall/model.ts`, `src/learning/shared.ts`, `src/vocabulary.ts`, `src/speech.ts`.

### 10.2 Vì sao tách luật khỏi hình ảnh

- Kiểm thử tự động được: luật đợt quái, hiệu ứng, quái quen dần, Lõi, Năng lượng.
- **Người chơi máy:** một bộ giả lập gõ ở 30, 45 và 60 từ mỗi phút với độ chính xác 92–98 %. Bộ này chạy hàng nghìn màn trong vài giây, để kiểm cân bằng trước khi người thật chơi.
- Về sau, chế độ chơi cùng 2 người chạy chung đúng bộ luật này.
- Thêm theme tàu chỉ cần viết thêm phần hình ảnh.

### 10.3 Dữ liệu

- Trụ, quái, đợt và bản đồ ghi trong tệp dữ liệu (`src/defense/data/`), có bước kiểm tra cấu trúc khi build.
- Trang Admin chỉnh được dữ liệu này từ bản C, theo kiểu thẻ có hình và chú thích, như V1 mục 39–40.

### 10.4 Lưu trữ

- Chỉ dùng các khóa bắt đầu bằng `spaceTypingDefense` (sao, cài đặt, bản đồ đã mở).
- Bản thử không ghi vào bản lưu 2D, không dùng ví, không dùng IndexedDB.
- Đọc: cài đặt chung, nguồn từ vựng, cài đặt giảm chuyển động.

### 10.5 Bộ gõ tiếng Việt

Bỏ qua phím đang ghép dấu (mục 2, điều 9). Thêm bài kiểm thử cho trường hợp Telex: gõ `a`, `a` thành `â`.

### 10.6 Công cụ kiểm tra

- Lệnh `__defense` trên trang, như `__campaign3d`: bắt đầu màn, nhảy tới một đợt, làm chậm thời gian, xem số liệu.
- Kịch bản chụp màn hình bằng CDP (cách chụp hiện có), chụp ở mức High và Medium.
- Người chơi máy (mục 10.2), chạy trong vitest.

### 10.7 Khối lượng ước tính (ước lượng thô)

| Bản | Mã mới | Mô hình mới | Ghi chú |
|---|---|---|---|
| A | khoảng 2–3 nghìn dòng | 4–5 (Lõi, 2 trụ, ô, cổng) | Dùng lại nhiều từ Campaign 3D |
| B | thêm khoảng 5–8 nghìn dòng | thêm 6–10 | Boss, 4 trụ mới, 3 quái mới, ôn từ, sao |
| C | tùy số World | nhiều | Admin, theme tàu, vẽ theo lô |

So sánh: Campaign 3D hiện khoảng 6.000 dòng (`src/scene3d` cộng `src/campaign3d`).

---

## 11. Lộ trình

### A. Bản thử

- **Trả lời:** có vui không? Gõ chữ có thấy quan trọng không? Trụ có thấy hữu ích không?
- **Nội dung:**
  - 1 bản đồ, 1 cổng, 1 đường, 8 ô đặt trụ, 8–10 đợt;
  - 2 trụ: Băng và Xích;
  - 3 loại quái: Scout, Tank, Volatile (mang từ bom);
  - rồng có 2 kỹ năng;
  - Lõi 20 mạng;
  - kiểu nhìn chữ, cộng tùy chọn nhìn nghĩa cho quái mạnh;
  - ôn nhanh cuối đợt;
  - gửi sự kiện học;
  - màn kết quả có số liệu (mục 3.5).
- **Chưa làm:** boss, nhánh nâng cấp, sao, Admin, ví, theme tàu, online.
- **Cách thử:**
  - người chơi máy chạy trước để chỉnh số;
  - sau đó chủ dự án và 3–5 người chơi thật thử;
  - ghi số liệu ở mục 12.

### B. Bản dọc

- 1 World (Rainbow Reach) với 3 bản đồ.
- 7 trụ (thêm Phá Giáp, Gợi Ý, Vang, Khiên Lõi, Mồi Nổ) và 7 loại quái (thêm Shield, Splitter, Healer, Jammer).
- 1 boss 3 pha.
- Đủ 3 kiểu hiện chữ.
- Nhánh nâng cấp và sao.
- Màn "Ôn từ yếu" dùng danh sách từ của nền tảng.

### C. Chiến dịch Defense

- Bản đồ cho từng World.
- Trang Admin chỉnh dữ liệu.
- Nối phần thưởng vào ví chung, sau khi cân bằng xong và được duyệt riêng.
- Theme tàu.
- Vẽ quái theo lô nếu cần.

### D. Chơi cùng nhau, tối đa 4 người (chỉ khi C ổn, cần duyệt riêng)

- **Cách làm đề xuất:** mỗi phòng là một Durable Object, tức một "phòng" trên máy chủ Cloudflare, giữ kết nối WebSocket (kênh hai chiều) với cả 4 người.
  - **Phòng tự chạy bộ luật** (mục 10.2), khoảng 20 lần mỗi giây, và là bên quyết định kết quả.
  - Cloudflare tính tiền theo **thời gian phòng mở**, không theo việc phòng làm gì. Vậy để phòng tự chạy luật cũng tốn đúng bằng để phòng chỉ chuyển tin.
  - Đổi lại được ba điều:
    - khó gian lận;
    - chủ phòng thoát thì trận không vỡ;
    - không phải chọn máy người chơi nào làm chủ.
  - **Cần thử thật ở đầu giai đoạn D:** chạy luật 20 lần mỗi giây trong Durable Object, đo CPU và thời gian bị tính tiền. Nếu không ổn thì lùi về cách "máy một người chơi chạy luật, phòng chỉ chuyển tin".
- **Gửi gì qua mạng:**
  - Người chơi gửi lên **mỗi từ gõ xong và mỗi lệnh xây trụ**, không gửi từng phím. Trung bình khoảng 1 tin mỗi giây mỗi người.
  - Phòng gửi xuống trạng thái khoảng 10 lần mỗi giây. Cloudflare không tính tiền tin gửi xuống.
  - Mỗi người tối đa 5 tin mỗi giây. Phòng bỏ phần vượt, để một máy gửi bừa không làm hết hạn mức chung của cả game.
- **Chia việc:** mỗi người giữ một cổng, hoặc một đoạn đường. Có chung Lõi và chung một hũ Năng lượng nhỏ (V1 mục 10.3).
- **Rớt mạng:** trụ của người rớt mạng vẫn đứng đó và vẫn gây hiệu ứng. Quái phía họ vẫn tới, người khác gõ hộ được. Vào lại trong 60 giây thì nhận lại chỗ của mình.
- **Chi phí và giới hạn:** xem mục 11a.
- **Đấu xếp hạng:** phòng tự chạy luật nên chống gian lận cơ bản được. Nhưng còn cần ghép trận, cân bằng và quản lý, nên để xem lại sau giai đoạn D. Nếu đông người chơi xếp hạng thì sẽ cần gói 5 USD (mục 11a).
- **Duel 1 đấu 1** hiện vẫn chạy trên máy chủ Node ở máy local. Nên chuyển Duel lên Durable Objects trước, rồi dùng chung cách làm phòng cho Defense.

### E. Không làm

- Chế độ 8 người, nhiều cổng.
- Weekly Rift.
- Mùa giải.
- Bán vật phẩm hoặc sức mạnh.

---

## 11a. Chơi online trên Cloudflare: gói Free đủ tới đâu, khi nào cần gói 5 USD/tháng

### 11a.1 Giới hạn

Đã kiểm trên trang tài liệu của Cloudflare ngày 18/10/2026, và khớp với trang thanh toán gói Workers Paid chủ dự án gửi.

| Phần | Gói Free (mỗi ngày) | Gói 5 USD (gồm trong giá, mỗi tháng) | Vượt mức ở gói 5 USD |
|---|---|---|---|
| Worker (API tài khoản, bản lưu, ví) | 100.000 yêu cầu; 10 ms CPU mỗi yêu cầu | 10 triệu yêu cầu; 30 triệu ms CPU; tối đa 30 giây CPU mỗi yêu cầu | 0,30 USD mỗi triệu yêu cầu; 0,02 USD mỗi triệu ms CPU |
| D1, dòng ghi | 100.000 | 50 triệu | 1 USD mỗi triệu |
| D1, dòng đọc | 5 triệu | 25 tỉ | 0,001 USD mỗi triệu |
| D1, dung lượng | 5 GB cả tài khoản, 500 MB mỗi cơ sở dữ liệu | 5 GB | 0,75 USD mỗi GB-tháng |
| Durable Objects, yêu cầu | 100.000 (20 tin WebSocket gửi lên tính 1 yêu cầu) | 1 triệu | 0,15 USD mỗi triệu |
| Durable Objects, thời gian mở | 13.000 GB-giây | 400.000 GB-giây | 12,50 USD mỗi triệu GB-giây |
| Tệp tĩnh (HTML, ảnh, mô hình, nhạc) | không giới hạn, không tính tiền | như gói Free | — |

**Cách tính:**
- **Thời gian mở phòng:** Cloudflare tính mỗi phòng 128 MB, dù thực dùng ít hơn. Một phòng mở 1 giây tốn 0,128 GB-giây. Phòng không có tin nào thì ngủ, và lúc ngủ không bị tính.
- **Làm tròn khi vượt mức:** phần vượt được làm tròn lên đơn vị tính tiền kế tiếp. Ví dụ trong tài liệu Cloudflare: 10,66 triệu GB-giây vượt mức được tính thành 11 triệu. Nghĩa là vượt thời gian mở phòng dù chỉ một chút cũng tốn tối thiểu 12,50 USD.
- **Hạn mức theo ngày** của gói Free đặt lại lúc 7:00 sáng giờ Việt Nam. Vượt hạn thì yêu cầu bị từ chối. Cloudflare không tự trừ tiền.
- **Bản build hiện có 1.325 tệp, 268 MB**, tệp lớn nhất 12 MB. Vẫn nằm trong giới hạn của Pages: 20.000 tệp, 25 MB mỗi tệp.

### 11a.2 Một người chơi tốn bao nhiêu

- **Chơi một mình**, đã đăng nhập, 30 phút mỗi ngày. Số đã tính ở `ONLINE_CLOUDFLARE_DEPLOY.md` mục 6.0:
  - khoảng 95–110 yêu cầu Worker;
  - khoảng 115–135 dòng ghi D1.
- **Một màn Defense** thêm khoảng 2 yêu cầu (bắt đầu, kết thúc) và khoảng 4 dòng ghi khi đã nối ví (bản C). Mức này tương đương một màn Campaign, nên không làm số trên thay đổi đáng kể.
- **Một trận chơi cùng, 10 phút:**

| Mục | Ước tính |
|---|---|
| Phòng mở | khoảng 12 phút (2 phút chờ, 10 phút chơi) = 720 giây × 0,128 = **khoảng 92 GB-giây**. Như nhau với 2, 3 hay 4 người. |
| Tin gửi lên | 4 người × 1 tin/giây × 600 giây ≈ 2.400 tin, tức khoảng 120 yêu cầu, cộng các lần kết nối: **khoảng 130 yêu cầu** |
| Dòng ghi D1 | khoảng 4 dòng mỗi người, tức **khoảng 16 dòng** |

### 11a.3 Gói Free đủ cho bao nhiêu

| Giới hạn | Đủ cho | Chạm khi |
|---|---|---|
| D1: 100.000 dòng ghi/ngày | **khoảng 800 người chơi mỗi ngày** (30 phút/người) | Chạm trước tiên. Không liên quan tới Defense. |
| Durable Objects: 13.000 GB-giây/ngày | **khoảng 140 trận chơi cùng mỗi ngày** (10 phút/trận), tức khoảng 28 giờ phòng mở mỗi ngày | Dùng chung với chat và với Duel (khi Duel chuyển lên). Nên tính khoảng 120 trận cho an toàn. |
| Durable Objects: 100.000 yêu cầu/ngày | khoảng 700 trận chơi cùng mỗi ngày | Không phải giới hạn chính |
| Worker: 100.000 yêu cầu/ngày | khoảng 900–1.000 người chơi mỗi ngày | Chạm sau D1 |

### 11a.4 Khi nào cần gói 5 USD/tháng

Cần lên gói 5 USD khi gặp **một** trong các điều sau:

1. Quá khoảng **800 người chơi mỗi ngày** (hết dòng ghi D1). Điểm này đã có từ trước, không phải do Defense.
2. Quá khoảng **120 trận chơi cùng mỗi ngày** (hết thời gian mở phòng), tính chung với chat và Duel.
3. Bản lưu thường xuyên lớn hơn 150 KB (10 ms CPU mỗi yêu cầu ở gói Free).
4. Mở đấu xếp hạng đông người.

**Đề xuất:**
- Ra mắt trên gói Free, theo dõi bảng điều khiển Cloudflare.
- Lên gói 5 USD khi một hạn mức nào đó vượt 70 % trong 3 ngày liền.
- Không cần mua trước.

### 11a.5 Gói 5 USD tốn bao nhiêu khi đông người

Ước lượng thô, đã tính làm tròn khi vượt mức:

| Quy mô | Worker | D1 ghi | Thời gian mở phòng | Tổng mỗi tháng |
|---|---|---|---|---|
| 1.000 người/ngày, 100 trận chơi cùng/ngày | 3,3 triệu (gồm trong giá) | 3,9 triệu (gồm trong giá) | 276.000 GB-giây (gồm trong giá) | **5 USD** |
| 3.000 người/ngày, 400 trận/ngày | 9,9 triệu (gồm trong giá) | 11,7 triệu (gồm trong giá) | 1,1 triệu GB-giây: vượt 0,7 triệu, làm tròn 1 triệu = 12,50 USD. Yêu cầu phòng vượt nhẹ: 0,15 USD. | **khoảng 18 USD** |
| 10.000 người/ngày, 1.500 trận/ngày | 33 triệu: vượt 23 triệu = 6,90 USD | 39 triệu (gồm trong giá) | 4,1 triệu GB-giây: vượt, làm tròn 4 triệu = 50 USD. Yêu cầu phòng: 0,75 USD. | **khoảng 63 USD** |

- Khi đông người, **thời gian mở phòng** là phần tốn nhất.
- Có thể giảm bằng cách cho người chơi kết nối thẳng với nhau (WebRTC), phòng chỉ dùng để mời nhau vào. Nhưng một số mạng không kết nối thẳng được, phải đi qua máy chủ chuyển tiếp TURN của Cloudflare, giá 0,05 USD mỗi GB. Tính ra cũng gần bằng tiền mở phòng, mà làm phức tạp hơn nhiều. Nên **chưa** làm cách này.
- **Dung lượng D1:** sổ thưởng tăng khoảng 1,1 MB mỗi người mỗi năm (`ONLINE_CLOUDFLARE_DEPLOY.md` mục 6.4). Phải gộp sổ thưởng trước khi đông người, ở gói nào cũng vậy.

---

## 12. Đo lường và tiêu chí

### 12.1 Số liệu ghi trong mỗi màn

- số từ mỗi phút trong pha đợt;
- độ chính xác;
- thời gian một màn;
- số lần chơi lại;
- tỉ lệ quái bị diệt khi đang dính hiệu ứng của trụ;
- tỉ lệ từ có gợi ý trên từ không có gợi ý (từ bản B);
- số từ đã thuộc và số từ cần ôn;
- Lõi còn bao nhiêu mạng ở cuối màn;
- trụ nào được chọn, đặt ở ô nào.

### 12.2 Bản thử A đạt khi

- Người mới hiểu luật trong dưới 3 phút, không cần đọc hướng dẫn dài.
- Số từ mỗi phút không thấp hơn 70 % so với chế độ bắn, với cùng người chơi và cùng cấp từ vựng.
- Có ít nhất 2 cách đặt trụ khác nhau đều thắng được ở mức Thường.
- 30–70 % số quái bị diệt khi đang dính hiệu ứng. Dưới 30 % thì trụ thừa; trên 70 % thì cần xem trụ có quá mạnh không.
- Người thử muốn chơi lại.

### 12.3 Bản thử A không đạt khi

- Đặt trụ bừa vẫn thắng dễ (trụ không có ý nghĩa).
- Không đặt trụ nào vẫn thắng được ở mức Thường.
- Gõ quá căng, người chơi không còn sức nghĩ tới trụ.
- Người thử nói "chán vì trụ không làm gì".

Nếu không đạt thì dừng lại và đánh giá lại hướng đi trước khi làm bản B.

---

## 13. Rủi ro

| Rủi ro | Dấu hiệu | Cách giảm |
|---|---|---|
| Trụ hiệu ứng quá mạnh, mất áp lực | Quái đứng yên, gõ thong thả | Quái quen dần; thời gian hồi; quái miễn nhiễm (mục 5.1) |
| Trụ bị thấy nhàm vì không diệt quái | Người thử nói trụ "không làm gì" | Hiệu ứng nhìn rõ; thưởng khi diệt quái đang dính hiệu ứng; màn kết quả ghi công của trụ |
| Gõ ít hơn chế độ bắn | Số từ mỗi phút dưới 70 % | Nhóm quái dày hơn; đợt dồn hơn; rút ngắn pha xây |
| Gợi ý làm người chơi lười nhớ | Tỉ lệ từ có gợi ý cao mãi không giảm | Từ có gợi ý được ít điểm hơn; không tính "đã thuộc"; quái Jammer tắt gợi ý |
| Màn hình rối khi nhiều hiệu ứng | Khó đọc nhãn chữ | Tối đa 6 nhãn; nhãn luôn nằm trên mọi hiệu ứng; có tùy chọn giảm hạt |
| Phình mã | Bản thử vượt 4 nghìn dòng | Giữ đúng phạm vi bản A; mọi thứ khác ghi vào danh sách bản B |
| Hiệu năng với nhiều quái | Dưới 50 khung hình mỗi giây ở mức Medium | Giới hạn số quái theo số đo ở mục 9a; dùng cách vẽ theo lô đã đo |
| Phần chơi trực tuyến vượt gói Free | Hết hạn mức trong ngày | Gửi theo từ, không theo phím; giới hạn 5 tin/giây mỗi người; lên gói 5 USD theo mốc ở mục 11a.4 |

---

## 14. Câu hỏi cần chủ dự án quyết

Theo cách làm đã thống nhất: nếu chủ dự án không chọn khác, Claude làm theo phương án đề xuất.

| # | Câu hỏi | Trạng thái |
|---|---|---|
| 1 | Tên chế độ trong game | Đề xuất: **Rift Defense** |
| 2 | Trụ có được gây sát thương không? | **Đã chốt (chủ dự án, 18/10): không.** Trụ chỉ gây hiệu ứng, hoặc phá lớp khiên hay giáp. |
| 3 | Một từ diệt cả nhóm hay từng con? | **Đã chốt (chủ dự án, 18/10): mỗi từ diệt đúng một con.** Chỉ từ bom, hoặc kỹ năng biến từ thành bom, mới diệt quái xung quanh (mục 5.6). |
| 4 | Có cho xây trụ trong lúc đợt đang chạy không? | Đề xuất: **không** ở bản thử, để hai tay luôn ở trên bàn phím. Xem lại sau khi đo. |
| 5 | Kiểu hiện chữ mặc định | Đề xuất: **bản A** nhìn chữ, cộng tùy chọn nhìn nghĩa cho quái mạnh; **bản B** đủ 3 kiểu theo loại quái. |
| 6 | Phần thưởng Defense có vào ví chung (Credits) không? | **Đã chốt (chủ dự án, 18/10): chưa.** Nối ở bản C, sau khi cân bằng. |
| 7 | Defense có tính vào chiến dịch 1.000 màn không? | Đề xuất: **không.** Defense có danh sách bản đồ riêng theo World. |
| 8 | Theme tàu | Đề xuất: để bản C. |
| 9 | Chơi cùng nhau mấy người? | **Đã chốt (chủ dự án, 18/10): tối đa 4 người**, ở giai đoạn D, duyệt riêng. Không làm 8 người. |
| 10 | Người chơi thử thật cho bản A | Đề xuất: chủ dự án cùng 3–5 người chơi. Claude chuẩn bị bảng ghi số liệu. |
| 11 | Cách vẽ quái và số quái tối đa | Đề xuất ở mục 9a, theo số đo. |

---

## 15. Tài liệu liên quan

- `docs/PROJECT_CONTEXT.md`: mục 2 (luật chiến đấu không được phá), mục 3 (từ vựng chung), mục 4.3 (phản hồi khi diệt xong một từ).
- `docs/CAMPAIGN_3D_2026-10-17.md`: rồng, cầu lửa, quái 3D, âm thanh, cách tách khỏi 2D (mục 17–18).
- `docs/ONLINE_CLOUDFLARE_DEPLOY.md` mục 6: giới hạn gói Free.
- `src/learning/shared.ts`: sự kiện học và danh sách từ ôn.
- `src/recall/model.ts`: kiểu nhìn nghĩa, gợi ý, nghe lại.
- `src/campaign3d/words.ts`: chọn từ sao cho chữ cái đầu không trùng nhau.
