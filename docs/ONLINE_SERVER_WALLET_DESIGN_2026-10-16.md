# Thiết kế: ví tiền và Warp trên máy chủ, chạy trên gói Free của Cloudflare (16/10/2026)

> **Dành cho:** chủ dự án và AI làm tiếp.
> **Trạng thái (17/10/2026):** **đã làm giai đoạn 1–3** và trang Admin xem, sửa ví. Giai đoạn 4 chưa làm. Mục 12 ghi các quyết định đã chọn. Mục 13 ghi những gì đã làm, khác bản thiết kế ở đâu, và các con số.
> **Đọc kèm:**
> - `docs/ONLINE_CLOUDFLARE_DEPLOY.md` (giới hạn gói Free, mục 6);
> - `cloud/src/wallet.ts` (máy chủ), `src/economy/wallet-rules.ts` (luật dùng chung), `src/online/wallet-sync.ts` (phía game).
>
> **Từ dùng trong tài liệu:**
> - **ví**: số tiền của người chơi (Credits, Alloy, Star Crystal, Quantum Core) cộng với Warp;
> - **máy chủ**: Worker `space-typing-api` trên Cloudflare;
> - **D1**: cơ sở dữ liệu của Cloudflare (SQLite);
> - **dòng ghi**: mỗi dòng D1 được thêm, sửa hoặc xóa. Gói Free cho 100.000 dòng ghi mỗi ngày cho cả game.

## 0. Tóm tắt

- **Hiện nay tiền nằm trong bản lưu trên máy người chơi.** Máy chủ chỉ ghi sổ quà đã trả. Ai sửa bản lưu (IndexedDB) là có tiền.
- **Đề xuất:** máy chủ giữ số dư và Warp. Bản lưu chỉ giữ một bản sao để hiển thị. Mọi lần cộng hoặc trừ tiền đi qua máy chủ, kèm một mã thao tác, để gửi lại không bị trả hai lần.
- **Vẫn chạy được trên gói Free**, với 3 điều kiện:
  1. mỗi lần đổi tiền chỉ ghi **1 dòng**;
  2. sổ ghi chép gộp theo ngày;
  3. gửi gộp nhiều việc vào một yêu cầu.

  Khi đó đủ cho khoảng **1.000–1.300 người chơi mỗi ngày**.
- **Làm theo 4 giai đoạn.** Giai đoạn đầu chỉ chạy song song để so sánh, không ảnh hưởng người chơi.

## 1. Vì sao cần

| Việc | Hiện nay | Hậu quả |
|---|---|---|
| Số dư Credits, Star Crystal… | Lưu trong bản lưu. Máy chủ nhận nguyên bản lưu mà không kiểm tra. | Sửa bản lưu là có tiền. |
| Quà Daily Hub | Máy chủ xác nhận, ghi sổ. Game tự cộng tiền vào bản lưu. | Sổ của máy chủ không khớp với tiền thật trong bản lưu. |
| Mua hàng, nâng cấp | Game tự trừ tiền. | Máy chủ không biết. |
| Thưởng khi qua màn | Game tự tính, tự cộng. | Không giới hạn được. |
| Warp | Tính trong bản lưu (`src/economy/warp-charge.ts`). | Sửa bản lưu là có Warp vô hạn. |

Phải có ví trên máy chủ thì Season Pass, gói nạp, bảng xếp hạng mới công bằng.

## 2. Nguyên tắc

1. **Máy chủ quyết định:** số dư, giá, lượng Warp, giờ chuẩn.
2. **Mỗi thao tác có mã riêng** (`opId`, chuỗi ngẫu nhiên do game tạo). Gửi lại cùng mã thì máy chủ trả lại kết quả cũ, không cộng hay trừ lần nữa.
3. **Ít dòng ghi:** một lần đổi tiền ghi đúng 1 dòng D1.
4. **Ít yêu cầu:** việc nào gộp được thì gộp. Ví dụ: kết thúc màn, nhận thưởng màn và bắt đầu màn sau đi chung một yêu cầu.
5. **Không chặn việc học:** Practice, Recall ôn tập, Smart Review vẫn chơi được khi mất mạng.
6. **Luật tính tiền viết một lần, dùng hai nơi.** Đặt trong các tệp hàm thuần (không phụ thuộc giao diện), như `src/liveops/` hiện nay. Game và máy chủ dùng chung.

## 3. Bảng dữ liệu (D1)

### 3.1 `wallets`: mỗi người chơi 1 dòng

| Cột | Ý nghĩa |
|---|---|
| `account_id` (khóa chính) | người chơi |
| `credits`, `alloy`, `star_crystal`, `quantum_core` | số dư |
| `warp_active`, `warp_reserve`, `warp_active_ms`, `warp_reserve_ms`, `warp_at` | Warp và mốc giờ tính hồi Warp, như `WarpCharge` hiện nay |
| `refills_day`, `refills` | số lần nạp nhanh Warp trong ngày |
| `sortie` | màn đang chơi: mã, màn, giờ bắt đầu, Warp đã trừ. Rỗng khi không chơi. |
| `today_day`, `today_ops` | sổ của ngày hôm nay, dạng JSON: danh sách `{mã, thay đổi, nguồn, giờ}` |
| `flags` | cờ nghi ngờ cho Admin xem |
| `version` | số phiên bản, tăng mỗi lần ghi. Dùng để chặn hai yêu cầu ghi đè nhau. |
| `updated_at` | |

Bảng này **không có chỉ mục phụ**. Mỗi lần sửa chỉ tính **1 dòng ghi**.

Sổ của ngày hôm nay nằm ngay trong dòng ví, nên ghi sổ không tốn thêm dòng. Cách kiểm tra "mã này đã làm chưa": tìm trong `today_ops` và trong sổ của hôm qua.

### 3.2 `wallet_days`: sổ của các ngày trước

| Cột | Ý nghĩa |
|---|---|
| `account_id`, `day` (khóa chính chung) | người chơi, ngày game (đổi ngày lúc 04:00 giờ VN) |
| `ops` | JSON: mọi thao tác của ngày đó |
| `totals` | JSON: tổng cộng và trừ theo từng loại tiền, để Admin xem nhanh |

- **Khi nào ghi:** lần đổi tiền đầu tiên của một ngày mới. Máy chủ chép `today_ops` cũ sang đây (thêm 1 dòng), rồi bắt đầu sổ ngày mới.
- **Xóa:** dòng cũ hơn 90 ngày, do việc dọn dẹp hằng ngày (Cron Trigger đã có). Mỗi người mỗi ngày chỉ 1 dòng, nên xóa rẻ.
- **So với bây giờ:** `reward_ledger` tốn 4 dòng ghi cho mỗi lần nhận quà (1 dòng và 3 chỉ mục), khoảng 300 byte.

### 3.3 Bảng hiện có thay đổi thế nào

| Bảng | Thay đổi |
|---|---|
| `reward_ledger` | Ngừng ghi từ giai đoạn 2. Dữ liệu cũ giữ để tra soát, xóa sau 90 ngày. |
| `liveops_states` | Giữ nguyên. Giai đoạn 4 có thể gộp vào dòng ví, để mỗi lần nhận quà còn 1 dòng ghi. |
| `player_saves` | Giữ nguyên. Tiền trong bản lưu chỉ còn là bản sao để hiển thị. |

## 4. Các yêu cầu mới (API)

API ở đây là các địa chỉ trên máy chủ mà game gọi tới.

| Yêu cầu | Làm gì |
|---|---|
| `GET /wallet` | Số dư và Warp (Warp đã tính hồi theo giờ máy chủ). Gộp vào `GET /liveops` để không thêm yêu cầu. |
| `POST /wallet/spend` | Mua hàng: `{opId, loại, món, giá theo bản danh mục}`. Máy chủ tra giá trong danh mục dùng chung, kiểm tra đủ tiền, trừ tiền. |
| `POST /wallet/sortie` | Kết thúc màn trước (nếu có) và bắt đầu màn mới, trong một yêu cầu: `{opId, finish: {...kết quả màn}, start: {màn, chế độ}}`. |
| `POST /wallet/refuel` | Nạp nhanh Warp bằng Star Crystal. |
| Nhận quà Daily Hub, mã quà, thư | Như hiện nay, nhưng máy chủ cộng tiền thẳng vào ví trong cùng một lần ghi. |
| Admin: `POST /internal/admin/players/:id/wallet` | Điều chỉnh ví, có lý do. Ghi nhật ký Admin. |

Mọi yêu cầu đổi tiền trả về **số dư mới**. Game chỉ việc hiển thị con số đó.

## 5. Các luồng trong game thay đổi thế nào

### 5.1 Mua hàng (shop, Style Shop, nâng cấp, gói vật phẩm, bùa Credits)
- **Hiện nay:** hàm thuần tính giá → `main.ts` trừ tiền → lưu.
- **Sau:**
  1. Game gọi `POST /wallet/spend`.
  2. Máy chủ trừ tiền, trả số dư mới.
  3. Game thêm món đồ vào bản lưu.
- **Nếu yêu cầu lỗi giữa chừng:** gửi lại cùng `opId`. Máy chủ trả lại kết quả cũ.
- **Đồ vật vẫn nằm trong bản lưu ở giai đoạn này.** Đồ có giá trị lớn (tàu, trang bị cấp cao) chuyển lên máy chủ ở giai đoạn 4.

### 5.2 Thưởng khi qua màn
- **Hiện nay:** game tự tính Credits, Alloy… khi qua màn.
- **Sau:** kết quả màn (màn số mấy, số sao, độ chính xác, số từ, thời gian) đi trong `POST /wallet/sortie`. Máy chủ tính lại phần thưởng bằng cùng luật, rồi cộng vào ví.
- **Máy chủ kiểm tra hợp lý:**
  - thời gian chơi không ngắn hơn mức tối thiểu của màn đó (tính từ lúc bắt đầu màn, theo giờ máy chủ);
  - số từ trên giây không quá khoảng 4 (240 từ/phút);
  - không quá số màn có thể chơi trong khoảng thời gian đó;
  - trần thu nhập mỗi ngày. Vượt trần thì thưởng giảm dần và gắn cờ cho Admin.
- **Không chứng minh được** người chơi gõ thật trên trình duyệt. Mục tiêu là làm gian lận khó, chậm và dễ bị phát hiện.

### 5.3 Warp
- Máy chủ tính Warp hồi theo giờ thật, dùng chung hàm của `src/economy/warp-charge.ts`.
- Bắt đầu màn: máy chủ trừ Warp, ghi màn đang chơi vào cột `sortie`.
- Quà Warp (Daily Hub, thư): máy chủ cộng thẳng. Không còn cảnh "bình Warp đầy nên quà phải chờ" như hiện nay. Máy chủ có thể cho vượt bình một chút, hoặc giữ phần dư làm "Warp chờ".
- Nạp nhanh bằng Star Crystal: qua `POST /wallet/refuel`.

### 5.4 Daily Hub
- Nhận quà: một lần ghi gồm 2 dòng: trạng thái Daily Hub và dòng ví (đã có sổ ngày trong đó).
- "Sổ giao quà" ở trình duyệt (làm ở đợt rà soát 2) không còn cần cho tiền nữa. Vẫn giữ nó cho món đồ trao kèm quà, nếu sau này có.

### 5.5 Khi mất mạng
- Practice, ôn tập: chơi bình thường, không tốn Warp, không có tiền.
- Campaign (tốn Warp): **cần mạng**, đối với người đã có ví trên máy chủ. Đây là quyết định chủ dự án cần chọn (mục 10).
- Nếu muốn cho chơi Campaign khi mất mạng, cách an toàn:
  - giữ một hàng chờ tối đa 3 màn;
  - khi có mạng, gửi lên. Máy chủ áp cùng kiểm tra hợp lý, thêm trần riêng cho màn chơi lúc mất mạng.

### 5.6 Khách (chưa đăng ký) và bản lưu chỉ có ở máy
- Khách cũng có ví trên máy chủ, vì khách đã có tài khoản khách.
- Chơi hoàn toàn không mạng (máy chưa từng kết nối): giữ cách cũ, tiền ở bản lưu. Khi kết nối lần đầu, chuyển theo mục 6.

## 6. Chuyển dữ liệu cũ sang ví

1. **Lần đầu một tài khoản gọi tới ví**, máy chủ tạo ví từ bản lưu đám mây của tài khoản đó: số dư và Warp.
2. **Có trần**, để gian lận cũ không chuyển sang ví. Ví dụ:
   - Credits tối đa 2.000.000;
   - Star Crystal tối đa 20.000;
   - Quantum Core tối đa 500;
   - Warp tối đa bình đầy.

   Tài khoản vượt trần: lấy mức trần và gắn cờ cho Admin xem.
3. **Chưa có bản lưu đám mây:** chờ game tải bản lưu lên, rồi làm như bước 1.
4. **Đánh dấu bản lưu đã chuyển**, ví dụ `save.wallet = "server-v1"`. Từ đó game ghi đè số tiền trong bản lưu bằng số dư từ máy chủ mỗi lần tải.
5. **Hai máy, hai bản lưu:** ví thuộc tài khoản, không thuộc bản lưu. Chọn "giữ bản trên máy" hay "giữ bản đám mây" khi xung đột không còn làm thay đổi tiền.

## 7. Mô hình chống gian lận

| Mối nguy | Cách chặn |
|---|---|
| Sửa bản lưu để có tiền | Tiền ở máy chủ. Bản lưu chỉ là bản sao. |
| Gửi lại yêu cầu để nhận hai lần | `opId` + sổ ngày. Nhận quà còn có trạng thái Daily Hub kiểm tra thêm. |
| Hai yêu cầu cùng lúc ghi đè nhau | Cột `version`: chỉ ghi nếu phiên bản chưa đổi. Lệch thì thử lại. Cách này đang dùng cho Daily Hub. |
| Chỉnh giờ máy | Mọi phép tính giờ dùng giờ máy chủ. |
| Báo kết quả màn giả (gõ siêu nhanh, qua màn trong 1 giây) | Kiểm tra hợp lý (mục 5.2), trần thu nhập ngày, cờ cho Admin. |
| Tạo nhiều tài khoản khách để lấy quà tân thủ | Đã có: giới hạn tạo khách theo IP. Thêm: quà lớn chỉ cho tài khoản đã đăng ký và xác minh email. |
| Lợi dụng lỗi | Sổ theo ngày giúp tra soát. Admin điều chỉnh ví, có nhật ký. |

Không làm được trên web, chấp nhận:
- không chứng minh được người chơi thật sự gõ phím;
- công cụ tự gõ (bot) vẫn chơi được. Nó chỉ bị giới hạn bởi tốc độ hợp lý và trần ngày.

## 8. Ngân sách mỗi người chơi (gói Free)

Ước tính một người chơi 30 phút/ngày, khoảng 10 màn, 15 lần nhận quà, 4 lần mua.

| Việc | Yêu cầu Worker | Dòng ghi D1 |
|---|---|---|
| Mở game (đăng nhập, bản lưu, Daily Hub kèm ví) | 4–5 | 1–2 |
| 10 màn: kết thúc màn trước và bắt đầu màn sau gộp làm 1 yêu cầu; tiến độ học đi kèm | 11 | 11 |
| Tiến độ khi màn dài (1 lần/phút, chỉ khi chưa gửi kèm) | 5–10 | 5–10 |
| Nhận quà 15 lần | 15 | 30 (trạng thái + ví) |
| Mua 4 lần | 4 | 4 |
| Lưu đám mây (1 lần/phút, chỉ khi có thay đổi) | 10–15 | 10–15 |
| Gia hạn phiên, chép sổ ngày cũ | 0 | khoảng 10 |
| **Cộng** | **khoảng 50–60** | **khoảng 75–85** |

- Dòng ghi: 100.000 ÷ 80 ≈ **1.250 người chơi mỗi ngày**.
- Yêu cầu: 100.000 ÷ 60 ≈ **1.650 người chơi mỗi ngày**.
- Hiện nay (chưa có ví): khoảng 120–170 dòng ghi mỗi người, tức khoảng 600–850 người. Ví theo thiết kế này còn **rẻ hơn** hiện nay, vì bỏ 3 chỉ mục của `reward_ledger` và gộp tiến độ vào yêu cầu kết thúc màn.
- **Dung lượng:**
  - mỗi dòng ví khoảng 2–4 KB;
  - sổ ngày khoảng 1 KB mỗi người mỗi ngày, xóa sau 90 ngày;
  - 1.000 người chơi mỗi ngày → khoảng 90 MB sổ, cộng bản lưu → dưới 500 MB.
- **CPU:** tính thưởng màn và Warp là phép tính nhỏ, dưới 1 ms. Không cần gói trả tiền.

## 9. Các giai đoạn

| Giai đoạn | Làm gì | Người chơi thấy gì | Ước lượng |
|---|---|---|---|
| 0 (đã xong) | Sổ thưởng; giao quà đúng một lần (sổ giao quà, đợt rà soát 2) | Không mất quà khi mạng chập chờn | — |
| 1. Ví chạy song song | Tạo bảng `wallets`, chuyển dữ liệu cũ (mục 6). Máy chủ tính số dư song song từ các thao tác game báo lên, không chặn gì. Admin xem chênh lệch giữa ví và bản lưu. | Không thấy gì | 1 tuần làm, 1–2 tuần chạy thử |
| 2. Quà và mua hàng | Daily Hub, thư, mã quà cộng thẳng vào ví. Mua hàng và Warp đi qua máy chủ. | Số dư lấy từ máy chủ. Campaign cần mạng (nếu chọn vậy). | 1–2 tuần |
| 3. Thưởng màn chơi | `POST /wallet/sortie` với kiểm tra hợp lý và trần ngày. Bản lưu không còn quyết định tiền. | Không đổi, trừ người gian lận | 1–2 tuần |
| 4. Đồ vật, Season Pass, nạp tiền | Đồ giá trị lên máy chủ. Có thể gộp trạng thái Daily Hub vào dòng ví. | Tính năng mới | lớn, cần tư vấn pháp lý |

- Mỗi giai đoạn có một công tắc (biến `WALLET_PHASE` trong `cloud/wrangler.jsonc`) để quay về giai đoạn trước nếu có lỗi.
- Trước mỗi giai đoạn: chạy bộ kiểm tra đầu cuối, thêm phép thử cho luồng mới.

## 10. Khi nào phải lên gói 5 USD

- Quá khoảng **1.200 người chơi mỗi ngày**: hết 100.000 dòng ghi D1 hoặc 100.000 yêu cầu Worker.
- Muốn giữ sổ chi tiết lâu (vài năm) mà không chia dữ liệu: vượt 500 MB mỗi cơ sở dữ liệu. Gói Free cho 10 cơ sở dữ liệu, có thể chia người chơi theo mã tài khoản, nhưng việc này phức tạp hơn.
- Muốn máy chủ chấm lại cả màn chơi từ dữ liệu từng phím gõ: vượt 10 ms CPU mỗi yêu cầu.
- Duel online đông người.
- Gói 5 USD (theo trang giá Cloudflare, cần xem lại lúc nâng cấp): 10 triệu yêu cầu Worker mỗi tháng, D1 50 triệu dòng ghi và 25 tỷ dòng đọc mỗi tháng, 10 GB mỗi cơ sở dữ liệu.

**Không bắt buộc phải lên gói trả tiền** chỉ để có ví:
- D1 với cột `version` đủ để xếp thứ tự các lần ghi;
- không cần Durable Object riêng cho mỗi người chơi.

## 11. Chủ dự án cần chọn

1. Campaign (tốn Warp) có bắt buộc có mạng không? Đề xuất: **có**, cho người đã có ví; khách chưa từng kết nối vẫn chơi như cũ.
2. Mức trần khi chuyển dữ liệu cũ (mục 6).
3. Giữ sổ chi tiết bao lâu: đề xuất 90 ngày.
4. Trần thu nhập mỗi ngày cho từng loại tiền (mục 5.2).
5. Quà lớn (tân thủ ngày 7, mốc chuỗi 100 ngày) chỉ cho tài khoản đã xác minh email?

## 12. Quyết định đã chọn theo đề xuất, 17/10/2026

Chủ dự án giao: việc nào cần chọn thì làm theo đề xuất.

1. **Campaign cần mạng.**
   - Áp dụng cho máy đã từng có ví trên máy chủ (giai đoạn 2 trở lên).
   - Khi mất mạng, máy đó không mở được Campaign và không mua được hàng. Game báo rõ lý do.
   - Khách chưa từng kết nối vẫn chơi như cũ, tiền ở bản lưu.
   - Practice, Recall ôn tập, Smart Review, Daily Lessons luôn chơi được khi mất mạng. Chúng không tốn Warp.
   - Quà Daily Lessons: khi có mạng lại, game báo lên máy chủ. Mỗi ngày, mỗi mốc quà chỉ được trả một lần, đúng số tiền trong bảng.
2. **Trần khi chuyển dữ liệu cũ:**
   - Credits 2.000.000; Alloy 50.000; Star Crystal 20.000; Quantum Core 500;
   - Warp tối đa đầy bình;
   - vượt trần: cắt về trần, gắn cờ `migration-cap` cho Admin.
3. **Sổ theo ngày (`wallet_days`) giữ 90 ngày.**
   - Việc dọn dẹp hằng ngày xóa các ngày cũ hơn.
   - Sổ của hôm nay giữ đủ từng thao tác.
   - Các ngày trước được gộp theo loại và nguồn: số lần và tổng tiền. Nếu giữ đủ từng thao tác thì tốn khoảng 6 KB mỗi người mỗi ngày, tức khoảng 540 MB cho 1.000 người chơi mỗi ngày trong 90 ngày, vượt 500 MB. Gộp lại thì còn khoảng 0,6 KB.
4. **Trần thu nhập mỗi ngày** (bảng ở mục 13.2):
   - bằng 3 lần thu nhập dự kiến của một người chơi nặng tại màn cao nhất của họ;
   - người chơi nặng: 60 phút mỗi ngày, khoảng 40 lần xuất kích;
   - vượt trần: phần vượt chỉ được trả 25% và ví bị gắn cờ `daily-cap`.
5. **Quà lớn cần tài khoản đã đăng ký và đã xác minh email.**
   - Quà lớn gồm: quà ngày 7 tân thủ, mốc chuỗi từ 30 ngày, mã quà Admin đánh dấu "big".
   - Khách và tài khoản chưa xác minh: quà được giữ lại. Khi xác minh email, máy chủ tự trả.
   - Daily Hub báo: "Big reward · kept for you until your account email is confirmed…". Hộp thoại tài khoản cũng nhắc.

## 13. Đã làm (17/10/2026)

### 13.1 Các phần và tệp

| Phần | Tệp |
|---|---|
| Bảng `wallets`, `wallet_days`; cột `gift_codes.big` | `cloud/migrations/0004_wallets.sql` |
| Luật dùng chung (game và máy chủ): trần, kiểm tra hợp lý, chuyển dữ liệu, Warp, gộp sổ | `src/economy/wallet-rules.ts` |
| Nguồn các con số trần (từ luật thưởng thật của game) | `src/balance/wallet-cap-audit.ts` |
| Máy chủ: mở ví, mua, hoàn tiền, báo thu nhập, xuất kích, nạp Warp, quà lớn, Admin | `cloud/src/wallet.ts` |
| Nhận quà Daily Hub và mua lá chắn trả thẳng vào ví (cùng một lần ghi với trạng thái Daily Hub) | `cloud/src/liveops.ts` |
| Phía game: báo thay đổi tiền, mua trước khi trao hàng, xuất kích trên máy chủ, nhận số dư máy chủ | `src/online/wallet-sync.ts` |
| Nối vào game: mua hàng, Style Shop, nâng cấp, xuất kích, nạp Warp, Daily Lessons, nhiệm vụ | `src/main.ts` |
| Warp từ máy chủ | `src/persistence/account-transactions.ts` (`adoptServerWarp`, `admit(…, serverWarp)`) |
| Trang Admin: xem ví, cờ, sổ hôm nay và 7 ngày trước; sửa ví kèm lý do | `portal/src/admin/v2/players.ts`; quyền ở `admin/account-bridge.mjs` (`players.save`) |
| Công tắc giai đoạn | `cloud/wrangler.jsonc`: `WALLET_PHASE` (0 tắt · 1 chạy song song · 2 mua, Warp, Daily Hub qua máy chủ · 3 thêm kiểm tra xuất kích và trần ngày). Đang đặt 3. |

Khác bản thiết kế:
- **Không có ví máy chủ hoặc mất máy chủ (máy dev không chạy Worker):** game dùng tiền ở bản lưu như cũ. Console ghi "Server wallet unavailable · local balances in use".
- **Tiền ngoài xuất kích** (nhiệm vụ, Daily Lessons, Expedition, phần thưởng chưa có đường riêng):
  - game không gửi từng khoản;
  - mỗi lần lưu, game so số tiền với lần báo trước và gửi phần chênh;
  - mỗi lần báo tối đa bằng 3 lần trần của một lần xuất kích, rồi tính vào trần ngày.
- **Mua hàng mà lưu thất bại:** máy chủ hoàn lại một lần (`refund`).
- **Hai yêu cầu chưa gộp làm một:** bắt đầu xuất kích và kết thúc xuất kích vẫn là 2 yêu cầu riêng.

### 13.2 Trần thu nhập ngày và trần một lần xuất kích

Màn cao nhất trên máy chủ: lấy từ bản lưu khi chuyển dữ liệu. Sau đó mỗi lần qua màn chỉ được tăng tối đa 1.

| Màn cao nhất | Trần ngày: Credits | Alloy | Star Crystal | Quantum Core | Một lần xuất kích: Credits | Alloy | Star Crystal | Quantum Core |
|---|---|---|---|---|---|---|---|---|
| 1 | 6.600 | 300 | 30 | 3 | 470 | 12 | 2 | 1 |
| 10 | 9.696 | 414 | 30 | 3 | 1.257 | 52 | 9 | 1 |
| 50 | 17.220 | 438 | 36 | 3 | 2.054 | 58 | 13 | 1 |
| 100 | 27.648 | 510 | 60 | 25 | 3.054 | 77 | 27 | 7 |
| 200 | 46.464 | 648 | 66 | 25 | 5.048 | 85 | 28 | 7 |
| 500 | 104.712 | 1.098 | 84 | 25 | 11.035 | 108 | 33 | 9 |
| 1.000 | 206.340 | 1.872 | 114 | 37 | 26.635 | 212 | 52 | 17 |

- Trần ngày bằng 3 lần thu nhập dự kiến của người chơi nặng:
  - Balanced, chính xác 97%, 3 huy hiệu, có quà boss;
  - chơi lại 10 màn gần nhất, 40 lần mỗi ngày;
  - có mức sàn: 6.000 Credits, 300 Alloy, 30 Star Crystal, 3 Quantum Core.
- Trần một lần xuất kích bằng mức tối đa theo công thức, cộng thêm 25%. Mức tối đa tính với mọi chế độ, mọi bậc Ascension, đủ mọi thưởng, mốc khu vực, bùa Credits.
- Quà Daily Hub và thư Admin không tính vào trần ngày, vì số tiền do máy chủ quyết định.
- Kiểm tra hợp lý một lần xuất kích:
  - **xong dưới 15 giây** (theo giờ máy chủ, từ lúc bắt đầu): chỉ trả 10%;
  - **gõ nhanh hơn 4 từ mỗi giây**: chỉ trả 25%;
  - **vượt trần một lần xuất kích**: cắt về trần;
  - **máy chủ không thấy lần xuất kích bắt đầu**: vẫn tính trần, nhưng gắn cờ.
- Mọi trường hợp trên đều gắn cờ cho Admin.

### 13.3 Ngân sách mỗi người chơi (30 phút mỗi ngày)

Giả định: khoảng 10 lần xuất kích, 15 lần nhận quà, 4 lần mua.

| Việc | Yêu cầu Worker | Dòng ghi D1 |
|---|---|---|
| Mở game (kèm mở ví) | 5 | 1–2 |
| Gửi tiến độ (1 lần/phút, thêm 1 lần khi xong màn) | 30–40 | 30–40 |
| Lưu đám mây | 15–20 | 17–24 |
| 10 lần xuất kích (bắt đầu + kết thúc) | 20 | 20 |
| 15 lần nhận quà (trạng thái + ví; không còn ghi `reward_ledger`) | 15 | 30 |
| 4 lần mua (trừ tiền + xác nhận lưu) | 8 | 8 |
| Báo thu nhập khác (bài học, nhiệm vụ) | 2–5 | 2–5 |
| Gia hạn phiên, chép sổ ngày cũ | 0 | khoảng 10 |
| **Cộng** | **khoảng 99–114** | **khoảng 119–139** |

- Dòng ghi: 100.000 ÷ 129 ≈ **775 người chơi mỗi ngày**.
- Yêu cầu: 100.000 ÷ 107 ≈ **935 người chơi mỗi ngày**.
- So với trước khi có ví (khoảng 120–170 dòng ghi): bằng hoặc tốt hơn. Lý do: mỗi lần nhận quà còn 2 dòng thay vì 5.
- **Muốn đạt mục tiêu 1.250 người** ở mục 8, còn phải:
  - gộp "kết thúc + bắt đầu" xuất kích làm một yêu cầu;
  - gửi tiến độ kèm yêu cầu kết thúc xuất kích.
- Dung lượng:
  - dòng ví: khoảng 10–30 KB mỗi người (sổ hôm nay + 300 mã thao tác gần nhất);
  - sổ ngày đã gộp: khoảng 0,6 KB mỗi người mỗi ngày;
  - 1.000 người chơi mỗi ngày trong 90 ngày: khoảng 55 MB.

### 13.4 Còn lại cho giai đoạn 4

- **Đồ vật** (trang bị, tàu, vật phẩm, đồ trang trí): vẫn nằm ở bản lưu. Máy chủ chỉ giữ tiền và Warp.
- **Giá hàng:**
  - máy chủ kiểm tra số dư, nhưng chưa kiểm tra giá theo danh mục;
  - sửa bản lưu vẫn có thể lấy đồ, nhưng không lấy được tiền.
- **Season Pass, gói nạp tiền, thanh toán:** chưa làm (cần tư vấn pháp lý).
- **Gộp trạng thái Daily Hub vào dòng ví:** nhận quà còn 1 dòng ghi thay vì 2.
- **Nhiệm vụ một lần:** chỉ chống trả hai lần trong 300 mã thao tác gần nhất. Nên đưa danh sách nhiệm vụ đã nhận lên máy chủ.
- **Expedition và Duel:** nếu có thưởng tiền, nên có đường báo riêng, có kiểm tra hợp lý riêng. Hiện chúng đi theo đường "báo phần chênh".
