# Đề xuất: tính năng online giữ chân người chơi, làm mượt UI/UX, nâng VFX/SFX/CGI và chuyển sang 3D (16/10/2026)

> **Dành cho:** chủ dự án và các AI làm tiếp (Claude, ChatGPT, Codex).
> **Yêu cầu gốc:** chuẩn bị đưa game lên online. Cần các tính năng như thể lực, quà theo giờ/ngày/tháng, gói quà để người chơi gắn bó; làm mượt giao diện; nâng hiệu ứng hình ảnh, âm thanh, đoạn phim; và chuyển phi thuyền, quái, boss, kỹ năng, trang bị, shop sang 3D cho mức Medium trở lên.
> **Trạng thái (16/10/2026):** đã bắt đầu làm. Phần đã xong và việc còn mở xem ở `docs/LIVEOPS_UIUX_3D_IMPLEMENTATION_2026-10-16.md`. Ảnh và mô hình cần làm xem ở `docs/art-requests/LIVEOPS_UI_2D_AUDIO_2026-10-16.md` và `docs/art-requests/3D_MODELS_PROMPT_PACK_2026-10-16.md`.
> **Cách đọc:** mục 1 là hiện trạng đã kiểm tra trong mã. Mục 2–4 là đề xuất. Mục 5 là lộ trình. Mục 6 là các quyết định cần chủ dự án chọn.

## 0. Tóm tắt khuyến nghị

1. **Làm nền tảng online trước, tính năng sau.** Hiện mọi tiền tệ, thể lực và tiến độ đều lưu trên máy người chơi (IndexedDB) và tính giờ theo đồng hồ máy. Khi lên online, người chơi chỉnh giờ máy hoặc sửa dữ liệu là nhận quà vô hạn. Phải có tài khoản, máy chủ giữ ví và giờ chuẩn, hộp thư, đo lường, rồi mới làm quà theo giờ, ngày, tháng.
2. **Giữ chân người chơi bằng thói quen học, không chỉ bằng thể lực.** Với game học tiếng Anh, "chuỗi ngày học" và mục tiêu hằng ngày là đòn bẩy mạnh nhất (Duolingo dùng cách này). Thể lực (Warp Charge) đã có; chỉ cần đưa lên máy chủ và thêm quà thể lực theo khung giờ. Không bao giờ để thể lực chặn việc học (Practice/Review vẫn miễn phí như hiện nay).
3. **UI/UX:** làm một bộ chuyển động dùng chung: mở và đóng hộp thoại, chuyển cảnh, trạng thái nút, nhận quà. Hiện chỉ có hiệu ứng mở hộp thoại; đóng thì tắt ngay, không có chuyển cảnh.
4. **3D:** đổi kiến trúc trước khi làm thêm mô hình. Mỗi mô hình 3D hiện chạy trong một vùng vẽ WebGL riêng; cách này không thể mở rộng cho hàng chục quái cùng lúc. Cần một cảnh 3D chung, mô hình nén chuẩn (glTF + meshopt + KTX2), một hệ hạt (particle) chạy trên GPU và hiệu ứng phát sáng (bloom) cho High/Ultra.
5. **Làm thử một mẫu trước khi làm hàng loạt:** Vanguard + một loại quái + boss G01 + một kỹ năng, quay video so sánh trước/sau, chủ dự án duyệt rồi mới làm tiếp.

## 1. Hiện trạng (đã kiểm tra trong mã, 16/10/2026)

### 1.1 Kinh tế và giữ chân người chơi

| Hệ thống | Có chưa | Ghi chú |
|---|---|---|
| Tiền tệ | Có 4 loại: Credits, Alloy, Star Crystal, Quantum Core | `src/economy/*`; không có tiền mua bằng tiền thật |
| Thể lực (Warp Charge) | Có | Active 100 (hồi 1/6 phút), Reserve 300 (hồi 1/12 phút), mỗi lần xuất kích tốn 10, nạp nhanh +20 giá 8/12/18 Star Crystal, tối đa 3 lần/ngày, mốc ngày 04:00 giờ VN. Practice/Smart Review miễn phí. `src/economy/warp-charge.ts` |
| Nhiệm vụ | Có 5 nhiệm vụ một lần | Không có nhiệm vụ ngày/tuần. `src/progression/missions.ts` |
| Thành tựu | Có 6 | Chưa có phần thưởng |
| Daily Expedition | Có | Đổi ngày lúc 0:00 UTC theo đồng hồ máy |
| Thử thách tuần | Có phần lõi | Chưa nối vào giao diện, chưa trả thưởng |
| Duel xếp hạng | Có | Điểm Elo tính trên máy chủ Duel; chưa có mùa giải |
| Điểm danh, hộp thư, mã quà, Season Pass, bảng xếp hạng, thông báo đẩy | **Chưa có** | |
| Thanh toán tiền thật | **Chưa có** | |

### 1.2 Máy chủ và lưu dữ liệu
- **Lưu tiến độ:** chỉ lưu trên máy người chơi (IndexedDB `space-typing`, bản sao dự phòng trong localStorage). Có xuất/nhập file. Chưa có tài khoản, chưa có lưu đám mây.
- **Máy chủ Duel:** WebSocket, có token ký bằng HMAC. Danh tính hiện chỉ là danh tính tạm trên máy (chính mã nguồn ghi rõ "không thay cho đăng nhập thật").
- **Admin:** máy chủ Node cục bộ (cổng 3199), quy trình nháp → kiểm tra → xuất bản → hoàn tác. Game đọc cấu hình đã xuất bản (tàu, trang bị, kỹ năng, quái, boss, thế giới, màn, shop). Các phần tiền tệ, sự kiện, ngày/tuần chỉ để xem, chưa chỉnh được.

### 1.3 Hình ảnh, âm thanh, giao diện
- **Vẽ trận đấu:** Canvas 2D (`src/Game.ts`). Nền dùng WebGL2 riêng. Boss 3D và tàu 3D của Duel mỗi cái một vùng vẽ three.js riêng, rồi chép ảnh sang Canvas 2D.
- **Boss G01 3D** (`public/assets/space-typing/bosses/3d/tyrant-g01.glb`):
  - khoảng 30.150 tam giác, khung xương 64 khớp, 2 đoạn hoạt ảnh (lơ lửng, tung chiêu), 4 điểm gắn hiệu ứng;
  - 3 texture JPEG 2048×2048, file 12,6 MB, chưa nén hình học và texture.
  - Trên màn hình boss chỉ cao khoảng 250 px, nên texture 2048 là thừa; khi giải nén lên GPU tốn khoảng 50–64 MB bộ nhớ.
- **VFX:** toàn bộ vẽ bằng Canvas 2D (18 tệp), "phát sáng" là cộng màu; chưa có hậu kỳ (bloom).
- **Âm thanh:** 13 bài nhạc theo thế giới, mỗi bài 2 lớp (nhẹ, dồn dập). Hiệu ứng âm thanh phần lớn tổng hợp bằng mã (95 âm `tone`, 36 âm `noise`), chỉ 34 mẫu âm thật.
- **Giao diện:** DOM + CSS thuần, 20 hộp thoại. Chỉ có hiệu ứng mở hộp thoại cài đặt; đóng là tắt ngay; chưa có chuyển cảnh giữa các màn hình. Phần lớn logic giao diện nằm trong `main.ts` (khoảng 11.000 dòng), khó sửa nhanh.

## 2. Phần A: tính năng online giữ chân người chơi

### A0. Nền tảng bắt buộc (làm trước)

| Việc | Vì sao |
|---|---|
| Tài khoản đăng nhập (email, Google; số điện thoại cho người chơi VN) | Lưu tiến độ, chơi nhiều máy, chống mất dữ liệu |
| Máy chủ giữ ví, thể lực và mốc giờ chuẩn | Người chơi không thể chỉnh giờ máy hay sửa dữ liệu để lấy quà |
| Sổ giao dịch (mỗi lần cộng/trừ tiền có một dòng ghi) | Tra soát, bồi thường, phát hiện gian lận |
| Hộp thư trong game | Gửi quà sự kiện, quà đền bù, quà mã; bắt buộc với game online |
| Cấu hình từ máy chủ (sự kiện, giá, phần thưởng) | Admin bật tắt sự kiện không cần phát hành bản mới; mở rộng từ hệ Admin hiện có |
| Đo lường | Tỉ lệ quay lại sau 1/7/30 ngày, thời lượng chơi, nguồn và chỗ tiêu tiền, để cân chỉnh |

**Lựa chọn máy chủ** (chủ dự án quyết, mục 6):
- **Nakama** (đề xuất). Máy chủ game mã nguồn mở, tự cài được. Có sẵn tài khoản, ví có sổ giao dịch, bảng xếp hạng có lịch đặt lại, giải đấu, bạn bè, bang hội, thông báo trong game và lưu dữ liệu. Logic máy chủ viết bằng TypeScript, hợp với đội hiện tại.
- **Tự viết bằng Node + PostgreSQL,** mở rộng từ máy chủ Duel và Admin sẵn có. Toàn quyền kiểm soát, nhưng phải tự làm ví, bảng xếp hạng, bạn bè và chống gian lận từ đầu.

### A1. Thể lực (Warp Charge): giữ, đưa lên máy chủ, thêm nguồn hồi
- Giữ nguyên luật hiện tại; chuyển phép tính sang máy chủ.
- **Quà thể lực theo khung giờ:**
  - 12:00–14:00 và 18:00–20:00 mỗi khung nhận +30 miễn phí;
  - lỡ khung thì có thể nhận bù bằng Star Crystal.
- **Lên cấp phi công:** nạp đầy Active.
- **Bạn bè tặng nhau:** mỗi ngày gửi và nhận tối đa 10 lần × 5 điểm.
- **Thông báo** khi thể lực đầy (thông báo trình duyệt hoặc ứng dụng).
- **Nguyên tắc:** Practice, Recall ôn tập và Smart Review luôn miễn phí. Thể lực chỉ giới hạn phần thưởng, không giới hạn việc học.

### A2. Chuỗi ngày học và mục tiêu hằng ngày (ưu tiên cao nhất cho game học)
- **Mục tiêu ngày** (người chơi tự chọn): 50 / 100 / 200 từ gõ đúng. Đạt thì giữ chuỗi.
- **Quà mốc chuỗi:** 3, 7, 14, 30, 60, 100 ngày (tiền, khung ảnh đại diện, hiệu ứng đạn, tàu ở mốc 100).
- **"Lá chắn chuỗi":** mua bằng Star Crystal, tự dùng khi lỡ một ngày, tối đa giữ 2 cái.
- Chuỗi hiện ở màn mở đầu, có hiệu ứng lửa khi chuỗi dài, giống thanh điểm "bốc cháy" đã làm.

### A3. Điểm danh
- **Tân thủ 7 ngày:** ngày 7 tặng một tàu mới hoặc một trang bị cấp Vàng.
- **Lịch tháng 28 ô:** mỗi ngày đăng nhập nhận 1 ô, không cần liên tục. Mốc 7/14/21/28 có quà lớn. Người có thẻ tháng nhận ×2.
- **Quà quay lại:** vắng từ 7 ngày trở lên thì nhận gói quay lại, kèm 3 ngày nhiệm vụ "hồi hương" có quà tăng.

### A4. Quà theo thời gian chơi trong ngày
- **Mốc nhận quà:** 5 / 15 / 30 / 45 / 60 phút chơi thật trong ngày, mỗi mốc mở một rương nhỏ (Credits, Alloy, +5 thể lực…).
- **Chỉ tính lúc đang chơi thật:** có gõ phím hoặc giọng nói trong 60 giây gần nhất; treo máy không được tính.
- **Giới hạn 60 phút mỗi ngày,** hợp với quy định giờ chơi cho người dưới 18 tuổi (mục A10).

### A5. Nhiệm vụ ngày và tuần, điểm năng động
- **Nhiệm vụ ngày:** 5 nhiệm vụ, đổi ngày lúc 04:00 như Warp, mỗi nhiệm vụ 20 điểm.
  - Ví dụ: gõ đúng 100 từ, qua 3 màn, hạ 1 boss, dùng kỹ năng 5 lần, đạt độ chính xác từ 95% trong 1 màn.
  - Rương mốc ở 20 / 40 / 60 / 80 / 100 điểm.
- **Nhiệm vụ tuần:** 7 nhiệm vụ lớn, có rương mốc tuần.
- **Nối Thử thách tuần** (phần lõi đã có) và trả thưởng thật cho nó.

### A6. Season Pass theo mùa
- **Thời lượng và cấu trúc:** 4–6 tuần, 50 bậc. Mỗi mùa theo chủ đề một Galaxy.
- **Điểm mùa:** từ nhiệm vụ, và từ số từ học được (từ gõ đúng × độ chính xác).
- **Hai nhánh:**
  - miễn phí: tiền, thể lực, vật phẩm;
  - cao cấp: giao diện tàu (skin), khung ảnh đại diện, hiệu ứng đạn, nhiều tiền hơn.
- **Không bán sức mạnh** ảnh hưởng tới Duel xếp hạng (Duel đã chuẩn hóa chỉ số).

### A7. Bảng xếp hạng và giải đấu
- **Giải tuần chia nhóm 30 người cùng trình độ** (giống giải đấu của Duolingo):
  - nhóm đầu lên hạng, nhóm cuối xuống hạng;
  - điểm tính theo kinh nghiệm học, không theo tiền đã nạp.
- **Bảng xếp hạng từng màn:** điểm, tốc độ gõ (WPM), độ chính xác.
- **Duel xếp hạng theo mùa:** Elo đã có; thêm mùa giải, bậc hạng và quà cuối mùa.

### A8. Sự kiện (admin lên lịch)
- **Cuối tuần:** ×2 Credits hoặc ×2 rơi đồ.
- **Boss thế giới hằng tuần:** cả máy chủ cùng trừ máu một boss lớn; quà theo mức đóng góp, kèm quà chung khi hạ được boss.
- **Sự kiện lễ:** Tết, Trung thu…, có bộ từ vựng chủ đề.
- **Phần lõi đã có:** sự kiện ngẫu nhiên trong màn và hiệu ứng Galaxy. Cần thêm lịch sự kiện từ máy chủ.

### A9. Xã hội
- **Bạn bè:** tặng thể lực, xem hangar của nhau, mời đấu Duel.
- **Bang hội** (giai đoạn sau): nhiệm vụ chung theo tuần, ví dụ cả bang cùng gõ 50.000 từ.

### A10. Gói quà, nạp tiền và pháp lý (nếu kiếm tiền)

**Các gói nên có:**
- **Nạp lần đầu:** nhân đôi lượng nạp.
- **Gói tân thủ:** bán một lần, giá rẻ, nhiều giá trị.
- **Thẻ tháng:** nhận tinh thể mỗi ngày trong 30 ngày, kèm ô điểm danh ×2.
- **Quỹ trưởng thành:** mua một lần, nhận quà theo mốc màn.
- **Gói giới hạn thời gian:** lễ, cuối tuần.
- **Season Pass cao cấp.**
- **Mã quà tặng:** dùng cho cộng đồng và quảng bá.

**Nguyên tắc:**
- không bán sức mạnh ảnh hưởng Duel xếp hạng;
- nếu có rương ngẫu nhiên thì công bố tỉ lệ rơi;
- người dưới 18 tuổi có giới hạn chi tiêu và bước xác nhận.

**Cổng thanh toán:**
- trên web: VNPay, MoMo, ZaloPay;
- nếu lên App Store hoặc Google Play: bắt buộc dùng thanh toán trong ứng dụng của họ cho hàng số.

**Pháp lý VN (cần luật sư xác nhận trước khi phát hành):** Nghị định 147/2024/NĐ-CP.
- Tài khoản phải định danh bằng số điện thoại VN hoặc tài khoản định danh điện tử.
- Người dưới 18 tuổi chơi không quá 60 phút mỗi lần và không quá 180 phút mỗi ngày cho mỗi trò chơi.
- Game có nạp tiền cần giấy phép phát hành và phê duyệt nội dung trước khi đưa ra công chúng.

### A11. Thứ tự ưu tiên phần A

| Ưu tiên | Tính năng | Công sức (ước lượng) |
|---|---|---|
| 1 | A0 nền tảng (tài khoản, ví máy chủ, giờ chuẩn, hộp thư, đo lường) | Lớn |
| 2 | A2 chuỗi ngày học, A5 nhiệm vụ ngày/tuần, A3 điểm danh | Vừa |
| 3 | A1 quà thể lực theo giờ, A4 quà thời gian chơi | Nhỏ |
| 4 | A7 bảng xếp hạng và giải tuần, A8 sự kiện | Vừa |
| 5 | A6 Season Pass, A10 gói và thanh toán | Lớn (cần pháp lý) |
| 6 | A9 bạn bè, bang hội | Vừa |

## 3. Phần B: làm mượt UI/UX

### B1. Bộ chuyển động dùng chung
- **Thời lượng chuẩn:** 120 ms (phản hồi nhỏ), 200 ms (bật/tắt), 320 ms (hộp thoại), 480 ms (chuyển cảnh); dùng 3 kiểu nhịp chuyển động.
- **Hàm dùng chung** `ui/motion.ts`:
  - `openDialog` / `closeDialog` có cả hiệu ứng đóng;
  - `transitionScreen` cho chuyển cảnh.
- **Thay toàn bộ** 22 chỗ mở và 30 chỗ đóng hộp thoại trong `main.ts` bằng hàm dùng chung.
- **Hộp thoại mở ra** từ đúng nút được bấm (phóng to từ vị trí nút), đóng thì thu về.

### B2. Chuyển cảnh
- **Màn mở đầu → vào màn chơi:** đường hầm warp khoảng 0,6 giây.
- **Màn chơi → kết quả:** làm chậm, tối dần, rồi bảng kết quả trồi lên.
- **Đổi tab trong hangar và shop:** trượt ngang.

### B3. Trạng thái và phản hồi nhất quán
- **Mọi nút** có đủ trạng thái: rê chuột, bấm, chọn bằng bàn phím, khóa, đang xử lý (vòng xoay và chặn bấm lặp).
- **Thông báo:** một hệ thống dùng chung, có mức thành công / cảnh báo / lỗi.
- **Chấm đỏ** báo có quà, có thư, có nhiệm vụ xong; hiện ở thanh dưới và trên từng thẻ.
- **Hiệu ứng nhận quà chuẩn:** rương mở, vật phẩm bay vào ví, số đếm lên. Dùng lại cho điểm danh, hộp thư, nhiệm vụ, Season Pass.
- **Âm thanh giao diện:** tiếng khẽ khi rê chuột, tiếng bấm, mở/đóng, nhận quà, lỗi.

### B4. Dễ đọc trong trận
- **Chữ của quái** luôn nằm trên ảnh boss. Ảnh chủ dự án gửi cho thấy chữ "jammer" bị boss che, do boss được vẽ sau quái.
- **Cách sửa:** vẽ toàn bộ chữ trong một lượt cuối, và đẩy các nhãn chữ tránh nhau.

### B5. Cách làm và kiểm tra
- **Tách `main.ts`** thành mô-đun theo màn hình (mở đầu, hangar, shop, nhiệm vụ…) để sửa giao diện nhanh và ít lỗi.
  - Các màn online mới (hộp thư, điểm danh, Season Pass) làm theo bộ thành phần dùng chung.
  - Có thể cân nhắc thư viện giao diện rất nhẹ như Preact (khoảng 3 KB), chỉ cho các màn mới.
- **Mỗi màn hình có danh sách kiểm tra:** trạng thái nút, mở/đóng, phím tắt, giảm chuyển động, điện thoại. Chụp ảnh tự động trước/sau mỗi lần sửa.
- **Giữ 60 khung hình/giây:** chỉ dùng hiệu ứng `transform` và `opacity`.

## 4. Phần C: VFX, SFX, CGI và 3D

### C1. Đánh giá bản 3D hiện tại
- **Vùng vẽ riêng:** mỗi mô hình 3D chạy trong một vùng vẽ WebGL riêng, rồi chép ảnh vào Canvas 2D.
  - Đã đo trước đây: thêm một vùng vẽ 3D làm khung hình chậm thêm khoảng 2–3 ms.
  - Không thể dùng cách này cho hàng chục quái 3D cùng lúc.
  - Mô hình không chung ánh sáng với cảnh.
- **Boss G01 nặng hơn cần:** 12,6 MB, texture 2048 cho vật chỉ cao khoảng 250 px trên màn hình.
- **Hiệu ứng quanh boss là 2D,** chưa có phát sáng thật (bloom). Boss chưa có hoạt ảnh khi trúng đòn, khi chết hay khi xuất hiện.

### C2. Kiến trúc đề xuất: một cảnh 3D chung
Thứ tự lớp vẽ:

1. Nền WebGL2 hiện có. Về sau có thể gộp vào cảnh 3D.
2. **Cảnh 3D chung (three.js, một vùng vẽ duy nhất):** tàu, quái, boss, đạn 3D, vật phẩm rơi, hạt hiệu ứng. Hậu kỳ phát sáng cho High/Ultra.
3. Canvas 2D: chữ để gõ, nhãn, vạch cảnh báo.
4. DOM: HUD và menu.

Cách vẽ trong cảnh 3D:
- **Quái cùng loại:** vẽ một lần cho nhiều con (InstancedMesh), đổi màu theo họ bằng chất liệu.
- **Boss:** mô hình có khung xương và hoạt ảnh.
- **Theo mức chất lượng:**

| Mức | Hình ảnh |
|---|---|
| Low | Giữ ảnh vẽ 2D như hiện nay |
| Medium | Mô hình 3D, chất liệu đơn giản (ánh sáng và bóng nướng sẵn vào texture), không bóng đổ, không hậu kỳ, độ phân giải ≤ 1 |
| High | Chất liệu đầy đủ (PBR), phát sáng, hạt nhiều hơn |
| Ultra | Thêm bóng đổ, méo không gian ở sóng xung kích, hạt dày nhất |

### C3. Quy trình làm mô hình (từ ảnh GPT sang 3D)
1. **Ảnh khái niệm:** GPT hoặc Gemini vẽ 3 góc (trước, bên, sau) trên nền trơn. Nhiều góc thì mô hình 3D chính xác hơn.
2. **Ảnh sang 3D:**
   - Meshy (đang dùng);
   - Tripo (lưới gọn, tự gắn xương);
   - Rodin (chất lượng cao);
   - Hunyuan3D 2.x hoặc TRELLIS (mã nguồn mở, chạy miễn phí trên máy có GPU).
3. **Dọn trong Blender:**
   - giảm tam giác theo ngân sách;
   - sửa pháp tuyến, nướng lại texture;
   - thêm lớp phát sáng;
   - đặt điểm gắn hiệu ứng (động cơ, nòng súng, lõi) theo tên chuẩn như hợp đồng của boss G01.
4. **Xương và hoạt ảnh:**
   - boss: lơ lửng, tích chiêu, tung chiêu, trúng đòn, chết, xuất hiện;
   - tàu: chuyển động bằng mã (nghiêng, giật lùi);
   - quái: 2–3 đoạn ngắn, hoặc rung bằng shader.
5. **Xuất và nén:** glTF → lệnh `pnpm models:prepare` (dùng gltf-transform: nén hình học meshopt, texture KTX2, thu nhỏ texture theo mức chất lượng) → kiểm tra tự động (số tam giác, cỡ texture, tên hoạt ảnh, điểm gắn). Mở rộng từ `scripts/bg-art/prepare-boss-3d.mjs`.
   - Ước tính boss G01 sau nén còn khoảng 2–3 MB, bộ nhớ GPU giảm mạnh.

### C4. Ngân sách mô hình

| Loại | Số lượng | Tam giác | Texture | Ghi chú |
|---|---|---|---|---|
| Phi thuyền | 11 | 8–15 nghìn | 1024 | Điểm gắn động cơ, nòng súng |
| Quái thường | 14 kiểu | 2–5 nghìn | 512 | Một mô hình gốc cho mỗi kiểu × 8 bộ chất liệu theo họ, thay vì 112 mô hình riêng |
| Boss | 26 (10 Tyrant, 8 Warden, 8 Lieutenant) | 20–40 nghìn | 1024 (Medium), 2048 (Ultra) | Đủ 6 đoạn hoạt ảnh |
| Đạn, tên lửa, khiên | Khoảng 20 | 0,5–2 nghìn | 256–512 | Dùng chung giữa các kỹ năng |
| Trang bị và shop | Khoảng 40 | 3–8 nghìn | 512 | Trong danh sách dùng ảnh xoay dựng sẵn (24–36 khung hình); chỉ món đang chọn mới xoay 3D thật |

**Ngân sách cả cảnh:**

| Mức | Tam giác trên màn hình | Lượt vẽ | Bộ nhớ texture | Hạt |
|---|---|---|---|---|
| Medium | ≤ 150 nghìn | ≤ 120 | ≤ 96 MB (kể cả nền) | ≤ 1.500 |
| High | ≤ 400 nghìn | ≤ 250 | ≤ 256 MB | ≤ 5.000 |

- **Tải theo Galaxy:** mỗi Galaxy một gói tài nguyên (Medium ≤ 25 MB), lưu bộ nhớ đệm.
- **Hiện 2D trước,** đổi sang 3D khi tải xong.

### C5. VFX
- **Hệ hạt chạy trên GPU** cho cảnh 3D: hạt cộng sáng, khói, dải ảnh động (flipbook), thay đổi màu và cỡ theo thời gian, phát ra từ điểm gắn của mô hình.
- **Thư viện shader:**
  - chớp trắng viền khi trúng đòn;
  - tan rã có viền sáng khi chết;
  - khiên lục giác sáng viền;
  - vệt sáng theo đạn;
  - sóng xung kích làm méo không gian (High trở lên);
  - nhịp phát sáng khi tích chiêu.
- **Dàn dựng chiêu của boss theo khung hình** đã ghi trong hợp đồng mô hình (bắt đầu tích, đỉnh tích, bắn, giật lùi, hồi):
  - tích chiêu: hạt hút về lõi, phát sáng tăng dần;
  - bắn: đạn ra từ điểm gắn, rung màn hình, phát sáng chớp;
  - giật lùi: mô hình lùi lại.
- **Ảnh động khói, lửa, nổ:** làm bằng EmberGen (có phí, khung hình đồng nhất) hoặc bộ miễn phí (Kenney). Không dùng ảnh AI rời rạc làm từng khung, vì các khung lệch nhau.
- **Camera:** đẩy nhẹ khi boss tung chiêu, giật khi trúng đòn nặng, giống camera của Duel.

### C6. SFX và nhạc
- **Phân lớp mỗi âm quan trọng:** tiếng đập đầu + thân + đuôi, kèm 3–5 biến thể đổi cao độ nhẹ để không nghe lặp. Thay dần 131 âm tổng hợp bằng mẫu âm thật.
- **Nguồn âm:**
  - bộ miễn phí bản quyền Sonniss GDC (rất lớn), Kenney (CC0);
  - bộ có phí (Boom Library, Soundly);
  - âm do AI tạo (ElevenLabs Sound Effects, Stable Audio).
  - Luôn chuẩn hóa độ to và kiểm tra giấy phép.
- **Thứ tự ưu tiên:** gõ phím, xong từ, quái trúng/chết theo 8 chất liệu, boss (tích/bắn/trúng/chết), 26 kỹ năng, giao diện, nhận quà, các tính năng online mới.
- **Nhạc:**
  - thêm nhạc riêng cho boss Tyrant;
  - thêm lớp "boss" vào hệ nhạc 2 lớp hiện có;
  - nhạc sự kiện và đoạn nhạc thắng/thua.
  - Bài thử "Hyperdrive Showdown" đã cho thấy làm nhạc bằng mã được, nhưng nhạc Suno sẽ dày và thật hơn.
- **Hướng âm thanh vẫn giữ:** Duel theo kiểu hỏa lực phim chiến tranh, không có tiếng chuông cao.

### C7. CGI (đoạn phim)
- **Boss xuất hiện:** dựng ngay trong cảnh 3D, dùng chính mô hình. Camera chạy theo đường định sẵn 3–4 giây, có dải đen điện ảnh, bảng tên. Bỏ qua được.
- **Mở đầu mỗi Galaxy:** đoạn phim dựng sẵn 6–10 giây.
  - Cách làm: render mô hình thật trong Blender, hoặc dùng AI tạo video (Kling, Runway, Veo) từ ảnh khái niệm.
  - Định dạng 1280×720, khoảng 2–4 MB.
  - Chỉ phát lần đầu vào Galaxy; bỏ qua được; mức Low thay bằng ảnh tĩnh.
- **Trailer quảng bá** 60–90 giây khi chuẩn bị ra mắt.

### C8. Làm thử một mẫu trước (theo cách làm đã thống nhất)
- **Nội dung mẫu:** Vanguard + một loại quái (Scout họ Rainbow) + boss G01 (nén lại, thêm hoạt ảnh trúng đòn và chết, hiệu ứng theo khung hình) + một kỹ năng (Barrier Pulse), chạy trong cảnh 3D chung.
- **Sản phẩm để duyệt:** video so sánh trước/sau ở Medium và Ultra; số đo khung hình trước/sau.
- **Sau khi duyệt:** làm tiếp theo từng Galaxy.

## 5. Lộ trình gợi ý
Thời gian là ước lượng khi làm cùng AI; mỗi giai đoạn kết thúc bằng bản chạy thử để chủ dự án duyệt.

| Giai đoạn | Nội dung | Thời gian |
|---|---|---|
| 0 | A0 nền tảng online; chọn máy chủ; chuyển ví, thể lực, giờ chuẩn lên máy chủ; hộp thư; đo lường | 2–3 tuần |
| 1 | Chuỗi ngày học, nhiệm vụ ngày/tuần, điểm danh, quà thể lực theo giờ, quà thời gian chơi, chấm đỏ | 2 tuần |
| 2 | Sự kiện có lịch, bảng xếp hạng và giải tuần, mùa Duel, bạn bè | 3–4 tuần |
| 3 | Season Pass, gói quà, thanh toán, thẻ tháng (sau khi xong pháp lý) | 3 tuần |
| Song song | UI/UX: bộ chuyển động, chuyển cảnh, chữ trong trận | 1–2 tuần |
| Song song | 3D: mẫu thử (C8) → quy trình nén → làm theo từng Galaxy | Mẫu 2–3 tuần, sau đó mỗi Galaxy khoảng 1–2 tuần |

## 6. Quyết định cần chủ dự án chọn
1. **Máy chủ:** Nakama (đề xuất) hay tự viết bằng Node + PostgreSQL?
2. **Có bán vật phẩm bằng tiền thật không?** Bán trên web, hay lên App Store / Google Play?
3. **Người chơi có trẻ em không?** Câu trả lời ảnh hưởng tới thể lực, giới hạn giờ chơi, thanh toán và định danh.
4. **Mức 3D cho Medium:** đề xuất có 3D, không hậu kỳ, không bóng đổ.
5. **Bắt đầu từ đâu:** đề xuất làm song song "nền tảng online" và "mẫu thử 3D (C8)", vì hai việc này độc lập.
