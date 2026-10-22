# Typing Defense V3.1 "Lời Gọi": kế hoạch tương tác gõ và sự chú ý (22/10/2026)

> **Dành cho:** chủ dự án; ChatGPT (đọc để nắm game hiện có); AI làm tiếp.
> **Trạng thái:** **chỉ là kế hoạch.** Chưa sửa code. Làm khi chủ dự án duyệt.
> **Nguồn:**
> - Chủ dự án chơi thử bản 1A (22/10).
> - Bản nháp ChatGPT [`docs/DEFENSE_TYPING_INTERACTION_ATTENTION_MASTER_V3_2026-10-22.md`](../DEFENSE_TYPING_INTERACTION_ATTENTION_MASTER_V3_2026-10-22.md).
> - Ý của chủ dự án: trồng cây chờ chín, NPC gọi người tới giúp (như game trồng hoa có dấu "!" trên đầu NPC).
>
> **Thay cho:** luật "dòng chữ liên tục" của [`TYPING_DEFENSE_DESIGN.md`](TYPING_DEFENSE_DESIGN.md) mục 6. Phần còn lại của thiết kế giữ nguyên, trừ chỗ ghi ở mục 7.

## 0. Tóm tắt

1. Bản 1A **đẩy** chữ tới người chơi: cứ N giây một từ, từ tan là bị phạt. Người chơi bị giữ ở thẻ chữ, không làm được gì khác.
2. V3.1 đổi sang **kéo**: NPC làm việc và **gọi** khi cần giúp. Người chơi **chọn** lúc nào qua giúp. Không giúp thì việc vẫn chạy, chỉ chậm hơn. **Bỏ qua không bị phạt.**
3. Trận chia **Ngày** (trồng, xây, học, không có quái) và **Đêm** (đợt quái). Ban đêm tháp và lính tự đánh; lời gọi ngắn và ít.
4. Kinh tế theo kiểu game nông trại:
   - Vàng mua hạt giống. Gieo, chờ chín, nông dân gặt, ra Lúa.
   - Vàng và Lúa thuê dân. Dân chặt cây ra Gỗ. Gỗ dùng để xây.
5. Giữ toàn bộ phần lõi gõ đã làm ở 1A: chọn từ, khóa chữ đầu, chấm điểm, thẻ chữ. Chỉ đổi **luật phát chữ** và **phần thưởng**.

---

## 1. Game đang có gì (để người đọc ngoài nắm)

Bản 1A ("Cổng vui") xong ngày 22/10. Đã qua các cổng tự động. Changelog: [`docs/changelog/2026-10-22-td-1a.md`](../changelog/2026-10-22-td-1a.md).

| Phần | Có ở 1A |
|---|---|
| Bản đồ | Hộp cát 2D nhìn từ trên: 1 cổng quái, đường chia hai làn, suối Bạc có 2 cầu, 3 node mỏ |
| Nhà | Lũy Chữ (giữ 20 mạng, có nỏ), Tháp Cung, Tháp Pháo, Trại Lính (3 lính chặn đường), Mỏ Vàng. Đặt tự do theo ô, có kiểm lối đi |
| Quái | Cương Thi (bầy), Ma Trơi (bay thấp, kháng phép), Thuồng Luồng (giáp nặng). Đợt 1–6 |
| Người trợ lực | Draconis (bay) và 3 Thư Đồng (đi bộ, tìm đường A\*). Số ô trợ lực theo cấp Lũy (1–4) |
| Dòng chữ | Nhà có người trợ lực phát 1 từ mỗi N giây (Dừng, 6, 4, 3, 2, 1 s). Từ sống khoảng 3 s rồi tan |
| Gõ | Gõ chữ đầu để khóa từ. Chữ đầu không trùng giữa các từ đang hiện. Chấm theo tốc và lỗi (Chớp, Hoàn hảo, Tốt, Ẩu) |
| Thưởng | Phát Chữ (tháp bắn ngay một phát mạnh), vàng (Mỏ, Lũy), lính hồi (Trại). Nhiệt 0–5 (5 đèn lồng) làm nhà mạnh dần. Chuỗi chung mọi nhà |
| Phạt | Từ tan chưa chạm: Chuỗi −2. Gõ ẩu hoặc tan khi đang gõ: Chuỗi ÷2. Rời nhà: Nhiệt giữ một lúc (Dư âm) rồi tụt |
| Điều khiển | Chữ cái **chỉ để gõ**. Lệnh bằng Tab, Enter, số, `-`, `=`, Esc, `\` hoặc Insert (xây), chuột. Ra lệnh có 2 s ân hạn |
| Đo đạc | Bot gõ, báo cáo `pnpm td:balance`, chạy lại tất định, 9 kịch bản trình duyệt |

## 2. Vấn đề khi chơi thử

Chủ dự án: "game bắt người chơi tập trung gõ, không chú ý được thứ khác, không làm được gì, không thư giãn, không học được".

Nguyên nhân nằm ở **luật**, không ở UI:

| Nguyên nhân | Bằng chứng |
|---|---|
| Chữ được **đẩy** theo đồng hồ, tan sau khoảng 3 s | Muốn không mất từ thì mắt phải dán vào thẻ |
| **Bỏ qua bị phạt** | Chuỗi −2 mỗi từ tan chưa chạm |
| Nhiều nhà phát cùng lúc | Ảnh `td-1a-tour-5`: 4 ô, Tải 249 % |
| Không gõ thì thua, gõ hết sức cũng thua | Báo cáo bot: ở nhà cấp 1, kể cả bot gõ trần vẫn thua đợt 4–6 |
| Thời gian để học bằng 0 | Từ tan trong 3 s, không có lúc nào yên để xem nghĩa |

Kết luận: tháp phòng thủ và gõ chữ đang **giành nhau** sự chú ý, thay vì hỗ trợ nhau.

## 3. Đánh giá bản nháp V3 (ChatGPT)

Điểm: **7,5/10.** Chẩn đoán đúng (9/10). Hướng giải đúng (8/10). Chưa khớp game hiện có (6/10), vì ChatGPT chưa biết các thay đổi của TD.

| Ý của V3 | Quyết định | Lý do |
|---|---|---|
| Kết quả gõ được lưu lại (buff, lượt mạnh), gắn vào nhà (§7, §54, §55) | **Giữ** | Rời đi không mất công |
| Bỏ qua không phạt, gõ là lựa chọn (§9, §30, §102) | **Giữ** | Gốc của vấn đề |
| Không gõ vẫn sống được ở mức thường (§101, §120) | **Giữ** | Chiến thuật mới có thật |
| Mỗi từ là một lần tính, gõ dở không mất phần đã xong (§44–§47) | **Giữ** | |
| Giới hạn sự chú ý, AttentionDirector (§48–§51, §115) | **Giữ**, làm gọn | Mục 4.9 |
| Không cướp bàn phím, chuột luôn chạy (§18, §27) | **Đã có** ở 1A | Chữ cái chỉ để gõ |
| Học sâu để lúc yên (§68–§71, §90) | **Giữ** | Thành ban Ngày, mục 4.10 |
| Bấm "Assist Ready" mới được gõ (§17, §57) | **Bỏ** | Thêm một lần đổi tay ra chuột. Ở TD gõ chữ đầu là bắt đầu |
| Máy trạng thái 9 bước, ô gõ riêng ở giữa (§15, §63) | **Bỏ** | Mục 6 chỉ cần 4 trạng thái |
| Giảm dần, thời gian hồi và trần cùng lúc (§10, §11, §54) | **Chỉ giữ trần** | Ba cơ chế chồng nhau, khó hiểu |
| Câu dài theo tốc gõ (§6) | **Bỏ** | Từ đơn, độ dài theo tốc gõ (1A đã có) |
| Làm chậm thời gian (§38–§39) | **Bỏ** | Thay bằng tạm dừng chiến thuật ở chế độ Thư giãn và Học |
| Shop, Workshop, nhiều Tướng, bảng xếp hạng | **Để sau** | Chưa có trong game |

---

## 4. Mô hình mới: Lời Gọi

### 4.1 Sáu luật khóa

1. **Kéo, không đẩy.** Chữ chỉ hiện khi một NPC cần giúp. Người chơi chọn lúc giúp.
2. **Bỏ qua không phạt.** Không giúp thì việc chạy ở tốc độ gốc. Chuỗi chỉ đứt khi gõ sai hoặc ẩu, không đứt khi bỏ qua.
3. **Mỗi từ là một nhát.** Từ xong thì việc tiến ngay, thấy được, nghe được. Gõ dở rồi đi làm việc khác thì giữ phần đã xong.
4. **Kết quả ở lại.** Tháp giữ lượt bắn mạnh, ruộng giữ phần đã gặt, nhà giữ phần đã xây.
5. **Không gõ vẫn sống** ở Thường nếu xây khéo. Gõ giỏi thì mạnh hơn, giàu hơn, nhanh hơn.
6. **Một khóa một lúc.** Tối đa một lời gọi đang được gõ. Không cướp bàn phím, không chặn chuột.

### 4.2 Ngày và Đêm

| Pha | Dài | Có gì | Gõ |
|---|---|---|---|
| **Ngày** | 75 s (Thư giãn 120 s, Thử thách 50 s). Gọi đêm sớm bằng Shift + Enter, thưởng vàng như gọi đợt sớm | Không có quái. Gieo, gặt, chặt, xây, nâng cấp, Thư Đồng hỏi bài | Nhiều: 30–45 % thời gian |
| **Đêm** | Tới khi hết đợt | Quái tới. Tháp, lính, Lũy tự đánh. Ruộng vẫn lớn | Ít, ngắn: 15–25 % thời gian |
| **Bình minh** | 3 s | Tổng kết đêm, đồng bay về HUD | — |

- Bản đồ chơi theo vòng **Ngày → Đêm** cho tới hết số đợt.
- Ban đêm vẫn xây được, nhưng xây chậm hơn.

### 4.3 Vòng kinh tế (số khởi điểm, chỉnh khi thử)

| Tài nguyên | Từ đâu | Dùng cho |
|---|---|---|
| Vàng | Hạ quái, Mỏ, bán Lúa, thưởng đêm | Hạt giống, thuê dân, xây (một phần) |
| Hạt giống | Mua bằng Vàng ở Ruộng (không có cửa hàng riêng) | Gieo |
| Lúa | Gặt ruộng | Nuôi lính (Trại Lính hồi lính tốn Lúa), thuê dân, bán (1 Lúa = 1 Vàng) |
| Gỗ | Dân chặt cây hoặc làm ở Trại Gỗ | Xây và nâng cấp (phần lớn giá nhà chuyển sang Gỗ) |

| Việc | Số khởi điểm |
|---|---|
| Ruộng | 1 Ruộng = 4 ô. Mỗi ô: hạt 8 Vàng, chín sau 40 s, ra 5 Lúa |
| Gặt | Nông dân tự gặt 1 ô mất 12 s. Có người giúp: mỗi từ là một nhát, 3 từ xong ô |
| Dân | Thuê 25 Vàng + 5 Lúa. Tối đa 3 / 5 / 7 / 9 người theo cấp Lũy |
| Chặt cây | Cây lớn ra 8 Gỗ. Tự chặt 20 s. Có người giúp: 4 từ đổ cây |
| Xây | Nhà nhỏ 8 s, nhà vừa 14 s, Lũy nâng cấp 25 s. Có người giúp: 2–5 từ tùy cỡ |
| Mỏ Vàng | Giữ như 1A: tự đào vào đống, thợ mỏ gọi khi đống đầy hoặc khi có mạch vàng |

- Cây trên bản đồ là cây 2D trong bộ prompt (mục 23.10 thiết kế). Chặt hết thì mở đất để xây. Đây là phá cảnh mà chủ dự án muốn.
- Bấm vào ô ruộng chín (hoặc Tab tới rồi Enter) thì nông dân ưu tiên ô đó. Lúa, Gỗ, Vàng **tự bay về HUD**, không cần bấm thu.

### 4.4 Ai làm việc, ai gọi

| NPC | Làm gì | Gọi khi |
|---|---|---|
| Nông dân (thuộc Ruộng) | Gieo, tưới, gặt | Ô chín; sâu bệnh (VS) |
| Tiều phu (dân được điều) | Chặt cây, chở gỗ | Bắt đầu chặt một cây lớn |
| Thợ xây (thuộc Lũy) | Dựng, nâng cấp, sửa nhà | Bắt đầu một công trình; nhà bị đánh hỏng |
| Thợ mỏ (thuộc Mỏ) | Đào vàng | Đống đầy; mạch vàng lộ |
| Lính trên tháp (tổ thợ của tháp) | Bắn | Ban đêm, quái trong tầm, tháp còn dưới 5 lượt mạnh |
| Thư Đồng | Giúp chậm không cần gõ; hỏi bài | Ban ngày: "hỏi bài" (ôn từ) |

### 4.5 Một lời gọi

- **Trên đầu NPC:** khi làm việc hiện **"!"** nhỏ. Khi cần giúp hiện **bong bóng** có biểu tượng việc (bông lúa, rìu, búa, cung) và **1–5 từ**.
- **Đời sống:** lời gọi kinh tế **không hết hạn**. Lời gọi tháp sống 6 s; bỏ qua thì tắt, không phạt.
- **Sáng hay mờ:** lời gọi trong **vòng giúp** (mục 4.7) sáng và gõ được. Ngoài vòng thì mờ, có mũi tên ở mép màn hình.

| Loại | Từ mỗi lần | Không giúp | Có giúp | Gõ Hoàn hảo cả lời gọi |
|---|---|---|---|---|
| Gặt | 3 | 12 s / ô | Mỗi từ = 1/3 ô | +1 bó lúa vàng (+3 Lúa) |
| Chặt | 4 | 20 s / cây | Mỗi từ = 1/4 cây | +2 Gỗ quý (dùng cho nhánh nâng cấp, VS) |
| Xây | 2–5 | 8–25 s | Mỗi từ = một phần đều | Nhà xong có "nền chắc": +10 % máu |
| Sửa | 2 | Không tự sửa ban đêm | Mỗi từ hồi 15 % máu | — |
| Đào | 2 | Đống đầy thì ngừng | Đổ đống về kho ngay, +1 Vàng mỗi từ | +1 túi vàng nhỏ |
| Bắn mạnh (đêm) | 1 | Tắt sau 6 s | +2 lượt mạnh (tối đa 5) | +3 lượt |
| Hỏi bài (ngày) | 1 (nhìn nghĩa Việt, gõ từ Anh) | Bỏ được | +1 Tri thức | +1 Tri thức nữa |

- **Lượt mạnh** của tháp: Tháp Cung bắn Tên Chữ xuyên +1; Pháo nổ ×1,3 vùng; nỏ Lũy bắn đôi. Hiện bằng chấm quanh chân tháp. Tháp tự xài khi có quái.
- **Phát Chữ** của 1A (bắn ngay khi xong từ) giữ lại cho lời gọi Bắn mạnh: từ xong thì bắn ngay một phát, rồi nạp lượt mạnh.

### 4.6 Gõ

- **Bắt đầu:** gõ chữ đầu của một lời gọi đang sáng để khóa. Như 1A: chữ đầu không trùng, có tầng 2, khóa mềm.
- **Trong một lời gọi nhiều từ:** từ kế tiếp tự hiện khi xong từ trước. Khóa giữ trên lời gọi đó tới khi xong hoặc Esc.
- **Đổi việc giữa chừng:** Esc nhả khóa. Bấm chuột hoặc Tab, Enter vẫn ra lệnh được, khóa vẫn giữ. Gõ chữ đầu của lời gọi khác thì đổi khóa (1A đã có "đổi khóa mềm").
- **Độ dài từ** theo tốc gõ E (bảng `LENGTH_BY_E` của 1A). Người gõ chậm được từ ngắn, người gõ nhanh được từ dài, nên thời gian bỏ ra tương đương.
- **Tốc** làm việc xong sớm. **Chuẩn** mở thưởng Hoàn hảo. Không có công thức theo từng phím: một từ xong là một nhát, chấm theo kết quả từ (Chớp, Hoàn hảo, Tốt, Ẩu).
- **Gõ ẩu** (nhiều lỗi): nhát vẫn tính nhưng nhỏ hơn (60 %). Chuỗi ÷2.
- **Chủ đề từ theo việc** (thiết kế 22.5): gặt ưu tiên từ về đồng ruộng, đồ ăn; xây ưu tiên từ về nhà cửa; đêm ưu tiên từ ngắn. Thiếu thì lấy từ chung theo cấp.

### 4.7 Vòng giúp

- **Tướng:** vòng 10 m. Lời gọi trong vòng thì gõ được. Điều Tướng tới đâu là **chọn giúp ở đâu**: đây là lớp chiến thuật.
- **Thư Đồng:** vòng 6 m. Đứng gần NPC thì **tự giúp chậm** (việc nhanh 1,5 lần, không cần gõ). Lời gọi trong vòng Thư Đồng cũng gõ được. Số Thư Đồng vẫn theo cấp Lũy như 1A.
- Điều người như 1A: chọn bằng số hoặc chân dung, gửi bằng Enter hoặc bấm. Không cần rời bàn phím.
- Tướng đứng giữa nhiều NPC thì giúp được nhiều lời gọi, nhưng chỉ gõ **một lời gọi một lúc**.

### 4.8 Ngân sách chú ý (AttentionDirector)

| Mục | Thư giãn | Cân bằng (mặc định) | Thử thách |
|---|---|---|---|
| Lời gọi sáng cùng lúc tối đa | 2 | 3 | 4 |
| Lời gọi tháp mỗi tháp, hồi | 12 s | 8 s | 6 s |
| Gõ trong 20 s gần nhất, mục tiêu tối đa | 6 s | 8 s | 11 s |
| Thời gian ngày | 120 s | 75 s | 50 s |

- Lời gọi dư thì **xếp hàng**. NPC hiện "…" và tiếp tục làm ở tốc độ gốc.
- **Thứ tự ưu tiên:** boss báo đòn > Sửa (nhà sắp sập) > Bắn mạnh > Xây > Gặt, Chặt, Đào > Hỏi bài.
- Gõ nhiều quá trong 20 s gần nhất thì hoãn lời gọi ít quan trọng. Đây là chỉnh nhịp, không phải chỉnh độ khó.
- Chip "Tải" của 1A đổi thành **"Đang gọi: 2/3"**.

### 4.9 Kết quả ở lại

- Tháp: lượt mạnh tối đa 5, xài dần, không mất khi người rời đi.
- Ruộng, cây, nhà: phần đã gõ là phần đã xong.
- **Bỏ Nhiệt và Dư âm của 1A.** Đèn lồng chuyển thành **chỉ số lượt mạnh** của tháp (5 đèn = 5 lượt).
- **Chuỗi giữ lại:** +1 mỗi từ tốt. Đứt khi ẩu hoặc sai, không đứt khi bỏ qua. Bậc Chuỗi tăng thưởng Hoàn hảo một chút (trần ×1,3).

### 4.10 Học

- Gõ xong một từ: **nghĩa tiếng Việt hiện 1 s** trên bong bóng.
- Từ mới (`isNew`): bong bóng hiện **nghĩa trước** ở lần đầu.
- Từ gõ sai được ghi lại. Ban ngày, **Thư Đồng hỏi bài**: hiện nghĩa Việt, người chơi gõ từ Anh. Có phát âm (đã có ở Space Typing). Thưởng Tri thức.
- Chế độ **Học**: ngày dài hơn, mọi lời gọi hiện nghĩa trước, có tạm dừng chiến thuật.
- Học sâu (câu, ngữ pháp, nghe) để ở Thư Thành và giữa bản đồ, không đưa vào trận.

### 4.11 Báo bằng tiếng và hình

- Mỗi loại lời gọi một tiếng nhỏ: chuông tre (gặt), tiếng gõ gỗ (chặt), búa (xây), tù và ngắn (tháp), chim (hỏi bài).
- Lời gọi ngoài màn hình: mũi tên ở mép, cùng màu loại việc.
- Không nhấp nháy, trừ khi gấp (Sửa, boss).

### 4.12 Chế độ

| Chế độ | Khác biệt |
|---|---|
| Thư giãn | Ngày 120 s, 2 lời gọi, quái yếu hơn 25 %, tạm dừng chiến thuật (xây được khi dừng) |
| Cân bằng | Mặc định để cân bằng game |
| Thử thách | Ngày 50 s, 4 lời gọi, không tạm dừng chiến thuật |
| Học | Như Thư giãn, mọi lời gọi hiện nghĩa trước, nhiều Hỏi bài |

---

## 5. Điều khiển

| Phím / chuột | Việc |
|---|---|
| a–z | Chỉ để gõ (như 1A) |
| Gõ chữ đầu | Khóa một lời gọi đang sáng |
| Esc | Nhả khóa → đóng menu → bỏ chọn → dừng (như 1A) |
| 1–4, `` ` `` | Chọn Tướng, Thư Đồng (như 1A) |
| Tab / Shift + Tab | Tô nhà hoặc lời gọi kế tiếp (lời gọi gấp trước) |
| Enter | Người đang chọn tới chỗ đang tô |
| `\` hoặc Insert | Xây (như 1A) |
| Shift + Enter | Gọi đêm sớm hoặc gọi đợt sớm |
| Bấm NPC hoặc bong bóng | Tướng tới đó (như bấm nhà) |
| Bấm ô ruộng chín hoặc cây | Ưu tiên việc đó |
| Space | Tạm dừng chiến thuật ở Thư giãn và Học. Ở chế độ khác Space bị nuốt như 1A |
| Bỏ | Núm nhịp `-` và `=` của 1A (không còn nhịp phát chữ) |

## 6. Trạng thái nhập (đủ dùng)

```text
TỰ DO ──gõ chữ đầu──▶ ĐANG GÕ (khóa 1 lời gọi)
  ▲                     │  xong lời gọi / Esc / lời gọi mất
  └─────────────────────┘
TỰ DO ──\ / Insert / bấm đất──▶ XÂY (menu)  ──Enter / Esc──▶ TỰ DO
bất kỳ ──Space (Thư giãn, Học)──▶ TẠM DỪNG CHIẾN THUẬT ──Space──▶ trạng thái cũ
```

- Ở ĐANG GÕ, chuột và phím lệnh **vẫn chạy**, và khóa vẫn giữ. Chữ cái vẫn vào lời gọi đang khóa.
- Ở XÂY, chữ cái không làm gì (như 1A). Lời gọi vẫn hiện, không mất.

## 7. Đổi gì so với 1A (khi làm)

| Phần 1A | V3.1 |
|---|---|
| Chọn từ, khóa chữ đầu, tầng 2, chấm điểm, thẻ chữ, làn thẻ | **Giữ** |
| Bộ phát theo nhịp (`systems/stream.ts`), núm nhịp, Dừng tất cả, Tải | **Thay** bằng hệ lời gọi (`systems/calls.ts`) và AttentionDirector |
| Nhiệt, Dư âm, hào quang (Tốc, Chuẩn, Mượt) | **Bỏ.** Thay bằng lượt mạnh của tháp và tiến độ việc |
| Chuỗi | **Giữ**, bỏ phạt khi bỏ qua |
| Phát Chữ | **Giữ** cho lời gọi Bắn mạnh |
| Ô trợ lực theo cấp Lũy, Thư Đồng, A\*, Draconis bay | **Giữ.** Ô trợ lực thành vòng giúp |
| Mỏ, Trại Lính, đợt quái, đặt nhà, kiểm lối đi | **Giữ.** Thêm Ruộng, dân, Gỗ, cây chặt được, Ngày và Đêm |
| Bot, `td:balance`, chạy lại tất định | **Giữ.** Bot mới đọc lời gọi. Thêm bot "không gõ" |

## 8. Trả lời 17 câu hỏi của V3

1. **Bùng ngắn hay trợ lực liên tục?** Bùng ngắn. Ở V3.1 mỗi lời gọi chính là một lần bùng, khởi động bằng gõ chữ đầu, không cần bấm mở.
2. **Buff theo thời gian, theo lượt hay cả hai?** Theo lượt (lượt mạnh của tháp, nhát của việc). Dễ hiểu, không phụ thuộc tốc game. Thời gian chỉ dùng cho boss.
3. **Gõ bao nhiêu % trận?** Ngày 30–45 %, đêm 15–25 %.
4. **Một lần bùng dài bao lâu?** 1–3 s mỗi từ. Một lời gọi kinh tế 3–8 s. Lời gọi tháp dưới 2 s.
5. **Bấm ra ngoài thì ngắt ngay hay chờ hết từ?** Lệnh chạy ngay, khóa vẫn giữ. Không phải chọn.
6. **Từ dở có làm lại không?** Giữ chữ đã gõ trong lời gọi đang khóa. Esc mới bỏ từ dở, không tính lỗi.
7. **Gõ trực tiếp lên quái có phải chủ động bật không?** Có. Quái đặc biệt cũng là một lời gọi (sáng khi trong vòng giúp). Bỏ qua không phạt, trừ boss.
8. **Một mục tiêu gõ trực tiếp là đủ?** Một lời gọi gấp một lúc, xếp hàng tối đa 2.
9. **Thường có làm chậm thời gian không?** Không. Chế độ Thư giãn và Học có tạm dừng chiến thuật.
10. **Tạm dừng có cho xây không?** Thư giãn và Học: có. Cân bằng: chỉ xem. Thử thách: không có tạm dừng chiến thuật.
11. **Chống lợi dụng làm chậm?** Không có làm chậm. Tạm dừng không sinh tài nguyên, không cho gõ lời gọi.
12. **AttentionDirector cấu trúc thế nào?** Một hệ trong sim (tất định), chạy mỗi tick: đếm lời gọi sáng, giây gõ trong 20 s, ưu tiên, rồi cho phép hoặc xếp hàng lời gọi mới. Số ở mục 4.8.
13. **Phím nào còn dùng khi đang gõ?** Mọi phím lệnh không phải chữ cái và chuột.
14. **Ra lệnh cho Tướng khi đang gõ?** Được ngay. Tướng rời đi thì lời gọi đang khóa vẫn gõ xong được, sau đó mờ nếu ở ngoài vòng.
15. **Gõ với boss không gây ức chế?** Báo trước 5 s ("Ấn sau 5 s"). Gõ ở Đài Ấn 2–4 s. Bỏ qua thì trận khó hơn (boss giữ khiên), không thua ngay.
16. **Bỏ gì khỏi V3?** Xem bảng mục 3.
17. **Còn thiếu gì?** Kinh tế làm việc chậm và lời gọi (mục 4.3–4.5), Ngày và Đêm, chủ đề từ theo việc, học bằng nghĩa và Hỏi bài, tiếng báo theo loại việc, bot không gõ làm cổng.

---

## 9. Kế hoạch làm (khi chủ dự án duyệt)

Làm trên hộp cát 2D hiện có, gọi là **1A.6 "Lời Gọi"**, trước 1B. Cách làm như 1A: mỗi mốc gồm làm, phản biện độc lập, sửa.

| Mốc | Nội dung |
|---|---|
| 1A.6.0 | Thiết kế số liệu: cập nhật `TYPING_DEFENSE_DESIGN.md` mục 6 và Phụ lục A theo kế hoạch này; thêm hằng số mới |
| 1A.6.1 | Sim: Ngày và Đêm, Ruộng (hạt giống, chín, gặt), dân, cây chặt được, Gỗ, xây có thời gian |
| 1A.6.2 | Sim: hệ lời gọi, vòng giúp, AttentionDirector, lượt mạnh của tháp; bỏ nhịp phát, Nhiệt, hào quang |
| 1A.6.3 | View 2D: bong bóng trên đầu NPC, "!", mũi tên mép màn hình, chỉ số lượt mạnh, ô ruộng theo giai đoạn, nghĩa tiếng Việt |
| 1A.6.4 | Học và chế độ: Hỏi bài, ghi từ sai, chế độ Thư giãn, Cân bằng, Thử thách, Học, tạm dừng chiến thuật |
| 1A.6.5 | Bot mới, báo cáo, kịch bản, cổng |

**Ngân sách mã:** thêm tối đa khoảng 1.800 dòng ròng, trừ phần bỏ đi.

**Cổng cứng:**

1. `pnpm check` xanh; chạy lại tất định khớp; sim ≤ 0,5 ms mỗi bước với 300 quái.
2. **Bot không gõ** qua đợt 1–4 ở Cân bằng, nhà cấp 1–2, xây theo chính sách chuẩn.
3. Bot gõ 35 WPM: giây gõ trong mọi 20 s ≤ 8 s ở Cân bằng; tỉ lệ gõ ngày 30–45 %, đêm 15–25 %.
4. Lời gọi sáng không bao giờ vượt trần; không bao giờ có hai khóa.
5. Bỏ qua mọi lời gọi: Chuỗi không giảm, không mất gì ngoài tốc độ.
6. Kịch bản trình duyệt ở 1280×720 và 1920×1080, không lỗi console: `td-calls-day` (gieo, gặt, chặt, xây), `td-calls-night` (Bắn mạnh), `td-calls-keyboard` (một ngày và một đêm chỉ bằng bàn phím), `td-calls-attention` (nhiều lời gọi, kiểm trần và xếp hàng).
7. Chủ dự án chơi thử.

**Chủ dự án chơi thử (khoảng 20 phút):**
1. Một ngày chỉ trồng và gặt, không gõ. Rồi một ngày có gõ giúp. Có thấy khác không?
2. Một đêm không gõ gì. Có sống không?
3. Một đêm có giúp lời gọi tháp. Có thấy mình mạnh hơn không?
4. Trả lời nhanh: có thấy thư giãn không? Có nhớ được từ nào không? Có lúc nào thấy bị giữ chặt không?

## 10. Ảnh hưởng tới bộ prompt asset

Khi kế hoạch được duyệt, cập nhật `docs/art-requests/td/`:

- Đưa lên bậc P: thân thợ và bộ gắn cho **nông dân, tiều phu, thợ xây** (đang ở VS, file 01-vs). Thêm các bộ gắn: nón lá, liềm, rìu, búa.
- 2D mới bậc P: ô ruộng theo 4 giai đoạn (đất gieo, mạ, lúa xanh, lúa chín); cây lớn có thể chặt và gốc cây sau khi chặt (gốc cây S13 đã có); icon hạt giống, Gỗ, rìu, liềm, búa; bong bóng lời gọi và dấu "!"; chỉ số lượt mạnh.
- Âm bậc P: chuông tre, gõ gỗ, búa, tù và, tiếng chim (báo lời gọi); nhát liềm, nhát rìu, cây đổ, tiếng búa xây; câu gọi ngắn của nông dân, tiều phu, thợ xây ("Lúa chín rồi!", "Giúp một tay!").

## 11. Rủi ro

| Rủi ro | Chặn |
|---|---|
| Thành game treo máy, đêm nhạt | Đêm có quái đặc biệt và boss; lời gọi tháp mạnh rõ (+2 lượt, Phát Chữ) |
| Gõ ít quá thì học ít | Ngày nhiều lời gọi; Hỏi bài; chế độ Học |
| Kinh tế rối | Bản thử chỉ có Vàng, Hạt giống, Lúa, Gỗ |
| Lời gọi quá dày ở ruộng lớn | AttentionDirector, xếp hàng, Thư Đồng tự giúp chậm |
| Đổi lớn so với 1A | Giữ lõi gõ; chỉ thay bộ phát và thưởng; giữ test cũ của lõi |

## 12. Mặc định đã chọn (đổi được)

1. Ngày 75 s, gọi đêm sớm được.
2. Lời gọi kinh tế không hết hạn; lời gọi tháp sống 6 s.
3. Bỏ Nhiệt và núm nhịp phát chữ.
4. Lúa nuôi lính; giá nhà chuyển phần lớn sang Gỗ.
5. Thư Đồng tự giúp chậm, không cần gõ.
6. Space là tạm dừng chiến thuật chỉ ở Thư giãn và Học.
