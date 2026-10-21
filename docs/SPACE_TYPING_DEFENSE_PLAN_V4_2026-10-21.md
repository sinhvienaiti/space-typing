# Rift Defense — Thiết kế V4 (làm lại)

- **Ngày:** 21/10/2026
- **Người viết:** Claude, theo phản hồi của chủ dự án (21/10, sau khi chơi bản A+).
- **Thay cho:** V3 (`SPACE_TYPING_DEFENSE_PLAN_V3_2026-10-21.md`). V3 vẫn giữ để đối chiếu.
- **Dành cho:** chủ dự án (duyệt), AI làm tiếp (triển khai).

---

## 0. Vì sao làm lại

Chủ dự án chơi bản A+ và đánh giá **chưa đạt** ở mọi mặt. Bảng dưới ghi từng ý và cách V4 sửa.

| # | Phản hồi của chủ dự án | Nguyên nhân ở bản A+ | V4 sửa thế nào |
|---|---|---|---|
| 1 | Thẻ phước lành xấu, trong khi game đã có thẻ bài sẵn | Thẻ vẽ bằng khung CSS trơn | Dùng lại khung thẻ và tranh đã có của game (mục 13.4) |
| 2 | Không thấy trụ nào tấn công hay gây hiệu ứng | Trụ chỉ đổi số trong luật, không có đòn đánh nhìn thấy được | Mỗi trụ có **đòn đánh riêng** có nhịp: sóng băng, lốc hút, chuỗi sét, tia ngắm, tia hồi máu, dòng năng lượng (mục 6, 11) |
| 3 | Đường đi vẽ bằng CSS/shader như băng chuyền | Dải đường có mũi tên chạy | Bản đồ là **ảnh vẽ địa hình** phủ lên một hòn đảo nổi có độ cao thật: đường lõm, bệ trụ nổi, mép vực (mục 8) |
| 4 | Không đổi bản đồ theo màn | Chỉ có 1 bản đồ | **8 bản đồ**, mỗi bản đồ một bố cục chiến thuật và một họ quái (mục 8) |
| 5 | Không chỉnh được góc nhìn | Camera cố định | Xoay, nghiêng, phóng to, kéo bản đồ bằng chuột; có nút và phím ở pha xây (mục 10) |
| 6 | Trụ, tàu bị đánh không có cháy, khói, lửa | Chỉ nhấp nháy màu | Trụ và Lõi có **máu**. Bị đánh thì tóe lửa, mảnh vỡ; yếu thì bốc khói; sắp hỏng thì cháy; hỏng thì nổ, tắt đèn, cháy âm ỉ (mục 9) |
| 7 | Không có âm thanh cho từng trụ, từng hiệu ứng | Chỉ có tiếng rồng và tiếng nổ | Bảng âm thanh cho mọi sự kiện (mục 12) |
| 8 | Xây trụ không cần suy nghĩ. Đợt 4–5 đã xây kín. | Tiền dư, trụ rẻ, ô nào cũng như nhau | Kinh tế khan hiếm, trụ có nhánh nâng cấp đắt, ô xây có đặc tính, quái phá trụ (mục 5) |
| 9 | Cần trụ hồi máu Lõi, quái đánh được trụ | Không có | Trụ **Đền Hồi Phục**; quái **Phá Hoại, Kẻ Nổ, Kẻ Hủy Diệt, Kẻ Gây Nhiễu**, boss đều nhắm vào trụ (mục 6, 7) |
| 10 | Thiếu phân tích | Thiết kế theo cảm tính | Mục 1 tham khảo các game thủ thành; mục 2 bản sắc riêng; mọi con số có lý do |

---

## 1. Tham khảo các game thủ thành

| Game | Làm hay ở đâu | V4 lấy gì | V4 tránh gì |
|---|---|---|---|
| **Kingdom Rush** | Ô xây cố định đặt ở chỗ đáng tranh giành; 4 loại trụ; mỗi trụ cấp 4 chọn 1 trong 2 nhánh; gọi đợt sớm được thưởng; bản đồ nhiều đường | Ô xây cố định có đặc tính; nhánh nâng cấp ở cấp 4; gọi sớm có thưởng; mỗi bản đồ một bố cục | Lính chặn đường (không hợp game gõ chữ) |
| **Bloons TD 6** | Quái có thuộc tính buộc phải dùng đúng trụ (tàng hình, chì, bọc giáp); trụ kinh tế (Banana Farm) đánh đổi giữa phòng thủ và tiền | Quái **tàng hình, khiên, giáp** buộc phải có đúng trụ; trụ kinh tế **Thu Năng** | Quá nhiều trụ và nâng cấp (3 nhánh × 5 cấp): người học từ sẽ ngợp |
| **Arknights** | Quái nhắm vào đơn vị của người chơi; đơn vị có máu; có người hồi máu | Quái bắn trụ, trụ có máu, **Đền Hồi Phục** sửa trụ | Triển khai đơn vị theo điểm (DP) |
| **Defense Grid** | Lõi rất rõ ràng, quái đi xa thì nguy hiểm; trụ phụ trợ tăng sức trụ khác | Lõi là trung tâm cảm xúc; trụ **Thu Năng (nhánh Dẫn Năng)** tăng tốc trụ bên cạnh | Xây mê cung tự do (khó đọc khi gõ chữ) |
| **Plants vs. Zombies** | Mỗi quái có một "bài toán" rõ, nhìn là biết; tiền đến từ cây kinh tế | Mỗi quái một cơ chế đọc được bằng mắt (khiên phát sáng, đường ngắm đỏ của Phá Hoại) | Chia làn cố định |
| **Orcs Must Die** | Bẫy đặt ở điểm thắt, phối hợp bẫy | Phối hợp trụ: Trọng Lực gom → Mồi Nổ đánh dấu → một từ nổ cả cụm | — |
| **Epistory, The Typing of the Dead, Nanotale** | Gõ chữ là vũ khí; chữ hiện trên quái; gõ từ dài thì đòn mạnh | Chữ là đạn, rồng là khẩu pháo; từ bom; chữ học thật có nghĩa và phát âm | Thần chú cố định (đã bỏ từ V2) |

**Kết luận:** game thủ thành hay khi người chơi luôn phải chọn, và luôn có hậu quả:
- **chọn chỗ:** ô này hợp trụ nào;
- **chọn tiền:** xây mới, nâng cấp, hay để dành;
- **chọn thời điểm:** gọi đợt sớm lấy thưởng, hay chờ;
- **chọn mục tiêu:** gõ con nào trước.

Bản A+ chỉ có lựa chọn cuối. V4 thêm đủ ba lựa chọn đầu.

---

## 2. Bản sắc riêng của Rift Defense

1. **Chữ là đạn, trụ là chiến thuật.**
   - Chỉ từ gõ đúng mới kết liễu (luật đã chốt ngày 18/10, giữ nguyên).
   - Trụ làm mọi việc khác: làm chậm, gom, phá giáp, bóc khiên, đánh dấu bom, làm lộ quái tàng hình, hồi máu, sinh tiền.
   - Mỗi trụ có đòn đánh **nhìn thấy và nghe thấy** được, nhưng sát thương kết liễu bằng 0.
2. **Một từ, một bùng nổ.** Trọng Lực gom quái, Mồi Nổ biến một con thành bom, rồi một từ gõ đúng nổ cả cụm. Đây là khoảnh khắc "đã" nhất của game.
3. **Mỗi World một hòn đảo, một họ quái.** 8 bản đồ ứng với 8 họ quái của Campaign (rainbow, angel, devil, frost, prism, nature, shadow, cosmic). Dùng đúng 112 model quái và 16 model boss chủ dự án đã tạo.
4. **Biển quái mà vẫn đọc được.** Tới 400 quái, chỉ 8 nhãn chữ gần Lõi nhất (cộng boss).
5. **Học thật.** Từ thật theo cấp; nghĩa, IPA, phát âm sau mỗi lần diệt; ôn cuối đợt.

---

## 3. Luật

**Giữ nguyên từ V2 và V3:**
- từ gõ đúng là đòn kết liễu duy nhất; một từ diệt đúng một con;
- quái xung quanh chỉ chết theo khi vụ nổ từ bom chạm tới (nổ dây chuyền tối đa 12 vụ);
- đàn bầy là một quái;
- tối đa 8 nhãn chữ;
- phím chữ chỉ dùng để gõ; số cho kỹ năng; Space cho Nova; Esc tạm dừng;
- chưa nối ví chung; chế độ riêng; lưu riêng (`spaceTypingDefense…`).

**Thay đổi so với V2/V3 (theo phản hồi 21/10):**

| Luật cũ | Luật mới | Lý do |
|---|---|---|
| Chuột chỉ dùng ở pha xây | Chuột dùng để **xoay, nghiêng, phóng to, kéo** camera mọi lúc. Xây, nâng, bán vẫn chỉ ở pha xây. | Chủ dự án yêu cầu góc nhìn tự do. Camera không cần bàn phím, nên không tranh phím với việc gõ. |
| Trụ không bị tấn công | Trụ có máu. Một số quái và boss đánh trụ. | Thêm áp lực và thêm lý do để có trụ hồi máu. |
| Trụ chỉ đổi số | Trụ có **đòn đánh theo nhịp** (sóng, sét, tia, lốc), mỗi đòn có hình và tiếng | Người chơi phải thấy trụ làm việc. |

---

## 4. Vòng chơi

```text
Chọn bản đồ (8 bản đồ, mở dần)
  └─ Pha xây (đếm ngược 25 giây; bấm Gọi đợt sớm thì được thưởng)
       └─ Đợt quái: gõ từ → rồng bắn; trụ đánh theo nhịp; quái đánh trụ
            └─ Hết đợt: thưởng năng lượng, ôn nhanh từ sai
                 └─ Sau đợt 3, 6, 9: chọn 1 trong 3 thẻ phước lành
  Đợt 5: boss phụ (Lieutenant của họ quái). Đợt 10: boss chính (Warden).
  Thắng: 1–3 sao theo máu Lõi còn lại. Thua: Lõi về 0.
```

- Một bản đồ: 10 đợt, khoảng 10–14 phút.
- **Gọi đợt sớm:** thưởng 1 năng lượng cho mỗi giây còn lại, tối đa 15.
- Bản đồ sau mở khi thắng bản đồ trước (bản thử: mở hết để chủ dự án chơi thử).

---

## 5. Kinh tế và chiến thuật xây

### 5.1 Mục tiêu

- **Cuối đợt 5, người chơi khá có khoảng 3–4 trụ cấp 1–2.** Cả trận chỉ đủ tiền nâng hết khoảng 4–5 trụ, trong khi bản đồ có 8–11 ô.
- Nâng một trụ lên nhánh cấp 4 tốn khoảng 4,5 lần giá xây. Muốn có một trụ nhánh thì phải bỏ 2–3 trụ cấp 1.
- Câu hỏi luôn có: "xây thêm, nâng cấp, sửa, hay để dành?"

### 5.2 Nguồn năng lượng

| Nguồn | Số | Ghi chú |
|---|---|---|
| Vốn đầu bản đồ | 120–180 | Tăng theo bản đồ (nhiều loại trụ hơn) |
| Diệt Trinh Sát, Mảnh | +1 | Quái đông nhất, rẻ nhất |
| Diệt Đàn Drone, Kẻ Nổ, Phân Tách | +2 | — |
| Diệt quái có vai trò | +3 | Giáp Sắt, Mang Khiên, Hồi Giáp, Phá Hoại, Bóng Ma, Tàu Mẹ, Gây Nhiễu, Hủy Diệt |
| Diệt boss | +30 (phụ), +60 (chính) | — |
| Hết đợt | +10 + 2 × số đợt | Đợt 10 cho 30 |
| Đợt không lọt quái | +8 | — |
| Gọi đợt sớm | +1 mỗi giây còn lại, tối đa 15 | Đánh đổi: ít thời gian nghĩ. Thưởng nhỏ để không thành cách "cày" tiền |
| Mốc combo 10 / 25 / 50 | +5 / +10 / +15 | Mỗi chuỗi một lần |
| Trụ Thu Năng | xem mục 6.6 | Đánh đổi: chiếm một ô, là mục tiêu của Phá Hoại |

### 5.3 Giá trụ

| Trụ | Xây (cấp 1) | Cấp 2 | Cấp 3 | Nhánh (cấp 4) | Tổng tới nhánh |
|---|---|---|---|---|---|
| Tháp Băng | 70 | 60 | 90 | 150 | 370 |
| Giếng Trọng Lực | 90 | 70 | 100 | 160 | 420 |
| Trụ Sét | 100 | 80 | 110 | 170 | 460 |
| Đèn Mồi Nổ | 110 | 80 | 110 | 170 | 470 |
| Đền Hồi Phục | 120 | 90 | 120 | 180 | 510 |
| Trụ Thu Năng | 80 | 70 | 90 | 150 | 390 |

- **Bán:** hoàn 60 % số đã tiêu. Bán ngay trong pha xây vừa xây thì hoàn 100 % (hoàn tác).
- **Sửa trụ hỏng:** 30 % giá xây. Hoặc để Đền Hồi Phục sửa.
- **Ô đổ nát:** một số bản đồ có ô phủ đá. Dọn tốn 40 rồi mới xây được.

### 5.4 Ô xây có đặc tính

| Đặc tính | Dấu hiệu trên bản đồ | Tác dụng |
|---|---|---|
| Thường | Bệ đá lục giác | — |
| **Cao điểm** | Bệ cao hơn, viền vàng | Tầm +25 % |
| **Mạch năng lượng** | Bệ có mạch sáng tím | Hiệu ứng mạnh hơn 15 % (làm chậm, lực hút, tốc độ đòn, hồi máu) |
| **Đổ nát** | Đá vụn phủ bệ | Phải dọn (40) mới xây được |

### 5.5 Mỗi trụ hợp một kiểu đoạn đường

Khi chọn một ô, khung xây trụ hiện **độ hợp (1–3 sao)** của từng trụ, tính từ hình dạng con đường trong tầm:
- **Tháp Băng:** càng nhiều mét đường trong tầm càng tốt. Hợp đoạn thẳng dài, hoặc ô nằm giữa hai đoạn đường song song.
- **Giếng Trọng Lực:** hợp khúc cua gắt và chỗ hai đường nhập làm một. Quái dồn lại ở đó.
- **Trụ Sét:** hợp chỗ quái đi dày: gần cổng hoặc sau chỗ đường nhập.
- **Đèn Mồi Nổ:** hợp chỗ quái bị gom (cạnh Giếng Trọng Lực).
- **Đền Hồi Phục:** hợp ô gần Lõi và gần nhiều trụ khác.
- **Trụ Thu Năng:** đặt đâu cũng được, nhưng nên tránh xa đường (Phá Hoại bắn trụ trong tầm 7 m).

Khung xây hiện thêm một câu ngắn, ví dụ: "Ô này phủ 26 m đường: Tháp Băng rất hợp."

---

## 6. Trụ

Mỗi trụ: 3 cấp thẳng, rồi chọn **1 trong 2 nhánh** ở cấp 4. Bản đồ 1 có Băng, Sét, Thu Năng. Bản đồ 2 thêm Trọng Lực. Bản đồ 3 thêm Mồi Nổ. Bản đồ 4 thêm Hồi Phục.

**Máu trụ:** 100 / 140 / 180 / 230 theo cấp. Hết máu thì trụ hỏng (mục 9).

### 6.1 Tháp Băng (Frost Spire) — làm chậm

| Cấp | Tầm | Nhịp | Hiệu ứng |
|---|---|---|---|
| 1 | 7 m | 1,4 s | Sóng băng: chậm 35 % trong 1,6 s |
| 2 | 7,5 m | 1,2 s | Chậm 45 % |
| 3 | 8,5 m | 1,0 s | Chậm 50 %. Sóng băng làm lộ Bóng Ma 3 s |
| 4A **Tim Băng Hà** | 8,5 m | 1,0 s | Mỗi 7 s đóng băng cả vùng 1,2 s (đóng băng lặp lại thì yếu dần: 100/60/30 %). Diệt quái đang đóng băng thì vỡ băng, làm chậm quái quanh nó |
| 4B **Giáo Sương** | 9 m | 1,0 s | Thêm: mỗi 3 s phóng giáo băng vào quái lì nhất, làm nó **giòn** 4 s: từ gõ kế tiếp trên nó bóc 2 lớp thay vì 1 |

- **Hình:** vòng băng xanh lan trên mặt đất; mảnh băng bay; sương lạnh. Quái bị chậm phủ màu xanh và tóe tinh thể. Quái bị đóng băng có lớp băng trắng xanh.
- **Tiếng:** "tách" giòn của băng; đóng băng là tiếng pha lê vỡ.

### 6.2 Giếng Trọng Lực (Gravity Well) — gom quái

| Cấp | Tầm | Hiệu ứng |
|---|---|---|
| 1 | 6 m | Hút quái về tâm giếng (điểm trên đường gần trụ nhất), chậm 15 % |
| 2 | 7 m | Hút mạnh hơn 50 %, chậm 20 % |
| 3 | 7 m | Thêm: mỗi 7 s **sụp đổ**: hút cực mạnh 1,5 s, quái dồn thành cụm |
| 4A **Điểm Kỳ Dị** | 7,5 m | Sụp đổ mỗi 6 s, sau đó choáng 1,2 s. Vụ nổ trong lòng giếng rộng thêm 40 % |
| 4B **Chân Trời Sự Kiện** | 7,5 m | Mỗi 9 s đẩy mọi quái trong tầm lùi 4 m theo đường |

- **Hình:** đĩa xoáy tím trên mặt đất; hạt sáng xoáy vào tâm; vòng méo không gian. Sụp đổ: chớp sáng, vòng co lại, rung nhẹ camera.
- **Tiếng:** tiếng ù trầm khi có quái trong tầm; sụp đổ là tiếng "ùm" hút vào.

### 6.3 Trụ Sét (Arc Pylon) — phá giáp, bóc khiên

| Cấp | Tầm | Nhịp | Số mục tiêu | Hiệu ứng |
|---|---|---|---|---|
| 1 | 7 m | 2,2 s | 3 | Chuỗi sét: bóc 1 lớp giáp của quái có giáp, phá khiên của quái được che chắn. Quái khác bị choáng 0,25 s |
| 2 | 7,5 m | 1,8 s | 4 | — |
| 3 | 8 m | 1,5 s | 5 | Làm lộ Bóng Ma bị trúng 4 s |
| 4A **Bão Tố** | 8,5 m | 1,5 s | 7 | Mỗi đòn thứ 4 quá tải: choáng 1 s mọi quái trúng |
| 4B **Gây Rối** | 8 m | 1,5 s | 5 | Câm lặng 5 s: Mang Khiên thôi che, Hồi Giáp thôi hồi, Phá Hoại thôi bắn, Gây Nhiễu thôi nhiễu, Tàu Mẹ thôi thả drone |

- Ưu tiên: quái có khiên hoặc giáp, rồi quái có kỹ năng, rồi quái gần Lõi nhất.
- **Hình:** cuộn dây trên trụ sáng dần; tia sét gấp khúc trắng xanh nhảy giữa các quái; tóe tia lửa; giáp bóc thì mảnh giáp văng ra.
- **Tiếng:** "xẹt" điện, tiếng nổ lách tách.

### 6.4 Đèn Mồi Nổ (Volatile Beacon) — tạo từ bom

| Cấp | Tầm | Nhịp | Hiệu ứng |
|---|---|---|---|
| 1 | 8 m | 10 s | Tia ngắm đỏ khóa con quái nằm giữa cụm đông nhất, biến từ của nó thành **từ bom** |
| 2 | 8 m | 8 s | — |
| 3 | 8 m | 6,5 s | Bán kính nổ +15 % |
| 4A **Bom Chùm** | 8 m | 6,5 s | Bom nổ văng thêm 3 bom nhỏ (bán kính 1,8 m) |
| 4B **Ngắm Kép** | 8 m | 6,5 s | Mỗi lần đánh dấu 2 con. Mỗi quái chết vì bom cho thêm +1 năng lượng |

- **Hình:** tia laser đỏ từ ống kính tới mục tiêu; vòng ngắm dưới chân; tia lửa ngòi nổ trên quái. Nổ: quả cầu lửa, vòng xung kích, mảnh vỡ, chớp sáng.
- **Tiếng:** bíp khóa mục tiêu nhanh dần; xì ngòi nổ; tiếng nổ lớn.

### 6.5 Đền Hồi Phục (Sanctum) — hồi máu Lõi, sửa trụ

| Cấp | Tầm sửa | Hồi Lõi | Sửa trụ | Thêm |
|---|---|---|---|---|
| 1 | 7 m | +1 mạng mỗi 25 s | 3 máu/s | — |
| 2 | 8 m | +1 mỗi 20 s | 5 máu/s | — |
| 3 | 8 m | +1 mỗi 15 s | 7 máu/s | Trụ hỏng trong tầm tự hồi sinh sau 6 s |
| 4A **Thành Lũy** | 8 m | +1 mỗi 15 s | 7 máu/s | Lõi có khiên chặn 3 quái lọt đầu tiên mỗi đợt |
| 4B **Phục Sinh** | 9 m | +1 mỗi 15 s | 10 máu/s | Trụ trong tầm đánh nhanh hơn 15 %; hồi sinh ngay; xóa nhiễu |

- Hồi Lõi không phụ thuộc khoảng cách. Lõi không vượt quá mạng tối đa.
- **Hình:** tia sáng vàng lục từ đền tới Lõi; hạt sáng bay lên; vòng hồi máu lan; trụ được sửa tóe tia xanh lục.
- **Tiếng:** chuông ngân nhẹ; "+1" của Lõi là hợp âm sáng.

### 6.6 Trụ Thu Năng (Energy Siphon) — kinh tế

| Cấp | Mỗi đầu đợt | Mỗi quái chết trong tầm 7 m |
|---|---|---|
| 1 | +6 | +1 |
| 2 | +10 | +1 |
| 3 | +15 | +2 |
| 4A **Lò Tinh Luyện** | +28 | +2 |
| 4B **Dẫn Năng** | +15 | +2, và trụ trong 7 m đánh nhanh hơn 20 % |

- Thu Năng cấp 1 hoàn vốn sau khoảng 7–8 đợt. Xây sớm thì lời, xây muộn thì lỗ.
- **Hình:** hạt năng lượng bay từ quái chết vào trụ; đầu đợt, trụ phun một cột sáng và dòng hạt bay về ô năng lượng.
- **Tiếng:** tiếng "ting" năng lượng.

### 6.7 Phối hợp đáng thử

- Trọng Lực + Mồi Nổ: gom rồi nổ cả cụm.
- Băng + Sét: quái giáp bị giữ lâu trong vùng sét, bóc hết giáp trước khi tới Lõi.
- Hồi Phục cạnh trụ ở tuyến đầu: chống Phá Hoại.
- Sét nhánh Gây Rối ở bản đồ có Mang Khiên và Hồi Giáp.

---

## 7. Quái

Mỗi bản đồ dùng model của **một họ** (ví dụ bản đồ 2 dùng toàn quái angel). Cột "Model" là loại quái trong bộ 14 loại chủ dự án đã tạo.

| Quái | Model | Tốc độ | Lớp (số từ) | Lọt thì mất | Cơ chế | Khắc chế |
|---|---|---|---|---|---|---|
| Trinh Sát | scout | 4,0 | 1 (từ ngắn) | 1 | Nhanh | Băng |
| Đàn Drone | scout thu nhỏ | 2,6 | 1 | 2 | 24–60 drone, một từ diệt cả đàn | Gõ sớm; bom |
| Giáp Sắt | tank | 1,9 | 3 | 3 | Chịu chậm một nửa | Sét bóc giáp; Giáo Sương |
| Kẻ Nổ | mine | 3,0 | 1 (từ bom) | 2 | Luôn là từ bom. Đi qua cạnh trụ (2 m) thì tự nổ, trụ mất 45 máu | Gõ trước khi tới trụ |
| Mang Khiên | shield | 2,3 | 2 | 2 | Che khiên cho quái trong 4 m: quái được che **không gõ được** cho tới khi khiên vỡ | Sét phá khiên; diệt Mang Khiên |
| Hồi Giáp | healer | 2,4 | 1 | 1 | Mỗi 4 s hồi 1 lớp giáp cho quái gần | Diệt trước; Sét Gây Rối |
| Phá Hoại | sniper | 2,6 | 1 | 1 | Gặp trụ trong 7 m thì dừng 3 s, bắn 3 phát, mỗi phát 12 máu | Gõ ngay; Hồi Phục |
| Bóng Ma | cloaker | 3,4 | 1 (từ ngắn) | 2 | Tàng hình: nhãn chữ ẩn cho tới khi bị lộ (Băng cấp 3, Sét cấp 3) hoặc vào 12 m quanh Lõi | Băng, Sét |
| Phân Tách | splitter | 2,8 | 1 | 1 | Chết thì tách 2 Trinh Sát nhỏ (từ ngắn) | Bom |
| Tàu Mẹ | carrier | 1,6 | 2 | 3 | Mỗi 10 s thả một Đàn Drone (12 drone), tối đa 3 lần | Ưu tiên diệt; Sét Gây Rối |
| Gây Nhiễu | jammer | 2,2 | 1 | 1 | Trụ trong 6 m ngừng đánh (nhiễu) khi nó còn sống | Gõ sớm; Phục Sinh xóa nhiễu |
| Kẻ Hủy Diệt | destroyer | 2,0 | 2 | 4 | Rời đường tới trụ gần nhất trong 5 m, đập 1 phát 60 máu, rồi quay lại đường | Băng giữ chân; gõ sớm |
| Boss phụ (đợt 5) | lieutenant-<họ> | 1,4 | 5 | Hết Lõi | Mỗi 12 s dậm đất: trụ trong 8 m mất 30 máu và tê liệt 3 s | — |
| Boss chính (đợt 10) | warden-<họ> | 1,2 | 9 | Hết Lõi | 3 pha: giáp → gọi quái → lao tới. Bắn trụ, dậm đất | — |

- Quái nào cũng có **dấu hiệu nhìn thấy được**: khiên là bong bóng sáng; Hồi Giáp có tia xanh nối tới quái được hồi; Phá Hoại có đường ngắm đỏ tới trụ; Gây Nhiễu có vòng nhiễu tĩnh điện; Bóng Ma mờ như ảo ảnh.
- Mỗi bản đồ mở dần quái mới (mục 8).

---

## 8. Bản đồ

### 8.1 Cách vẽ

- Mỗi bản đồ là **một hòn đảo nổi** giữa không gian của World đó.
- **Mặt đất là một ảnh vẽ từ trên xuống** (2048 × 2048) phủ lên lưới địa hình có độ cao:
  - đường đi lõm xuống, có mép;
  - bệ trụ nổi lên;
  - mép đảo là vực, bên dưới là rễ đá treo lơ lửng.
- **Bây giờ:** Claude vẽ tạm ảnh địa hình bằng mã (đá, mạch tinh thể, đường lát đá, rune) theo bảng màu từng World. Không dùng mũi tên chạy.
- **Sau đó:** chủ dự án tạo ảnh đẹp từ prompt và **ảnh khung bố cục** Claude xuất sẵn (đường đi, ô xây, Lõi, cổng đúng vị trí). Claude chỉ cần thay ảnh, không sửa luật. Xem `docs/art-requests/DEFENSE_MAPS_PROMPTS_2026-10-21.md`.

### 8.2 Tám bản đồ

- Mỗi đường dài 70–250 m. Quái đi nhanh hơn trên đường dài và chậm hơn trên đường ngắn (`pace` trong `maps.ts`), để thời gian quái đi tới Lõi gần như nhau.
- Áp lực tăng dần theo bản đồ (`rhythm(scale, …)`): số quái mỗi đợt nhân với `scale`.

| # | Tên | Họ quái | Bố cục | Điểm chiến thuật | Quái mới | Trụ mới |
|---|---|---|---|---|---|---|
| 1 | Cầu Vồng (Rainbow Reach) | rainbow | 1 cổng, đường chữ S | Học cách đặt trụ ở khúc cua | Trinh Sát, Đàn Drone, Giáp Sắt, Kẻ Nổ, Phá Hoại | Băng, Sét, Thu Năng |
| 2 | Vườn Hào Quang (Halo Garden) | angel | 2 cổng, hai đường **nhập** làm một giữa bản đồ | Ô ở chỗ nhập phủ cả hai đường | Mang Khiên, Hồi Giáp | Trọng Lực |
| 3 | Hố Dung Nham (Ember Hollow) | devil | 1 cổng, đường **tách đôi** rồi nhập lại | Ô cao điểm ở đảo giữa phủ cả hai nhánh | Kẻ Hủy Diệt | Mồi Nổ |
| 4 | Màn Sương Băng (Frost Veil) | frost | Đường zigzag với **đoạn thẳng dài trên băng** | Trên băng quái nhanh hơn 15 %, Tháp Băng mạnh hơn 25 % | Bóng Ma, Phân Tách | Hồi Phục |
| 5 | Tháp Lăng Kính (Prism Spire) | prism | Đường xoắn đi qua vùng giữa **ba lần** | Ô giữa phủ ba đoạn đường | Gây Nhiễu | Mở nhánh cấp 4 cho mọi trụ |
| 6 | Rừng Hoang (Verdant Wild) | nature | 2 cổng hai bên, **hai đường riêng** tới Lõi | Phải chia tiền cho hai phía; nhiều ô đổ nát | Tàu Mẹ | — |
| 7 | Khe Bóng Tối (Shadow Rift) | shadow | **3 cổng**, ba đường ngắn hội tụ | Áp lực từ ba phía; nhiều Bóng Ma | — (trộn) | — |
| 8 | Ngai Vũ Trụ (Cosmic Throne) | cosmic | Đường **xoắn ốc** vào Lõi ở giữa | Ô ở giữa phủ nhiều vòng xoắn | Tất cả | — |

---

## 9. Trụ và Lõi bị tấn công

### 9.1 Máu và trạng thái trụ

| Máu còn | Hình | Tiếng |
|---|---|---|
| 100–60 % | Bình thường. Bị trúng đòn: tóe lửa, mảnh vỡ, rung | Tiếng kim loại va |
| 60–35 % | Khói xám bốc lên | — |
| 35–1 % | Khói đen dày, lửa nhỏ, tia lửa điện lóe | Tiếng lửa tí tách |
| 0 (hỏng) | Nổ nhỏ; trụ tối đèn, nghiêng; lửa và khói âm ỉ; không đánh | Nổ, rồi tiếng lửa |

- Thanh máu chỉ hiện khi trụ bị thương.
- **Sửa:** bấm Sửa ở pha xây (30 % giá xây), hoặc Đền Hồi Phục sửa dần, hoặc cấp 3 trở lên hồi sinh.

### 9.2 Lõi

- 20 mạng (tối đa 24 với phước lành Gia Cố).
- Quái lọt vào: Lõi rung, sóng xung kích, tia lửa, vết nứt sáng.
- Dưới 50 %: khói. Dưới 25 %: lửa, tia điện, còi báo động.
- Đền Hồi Phục hồi mạng: Lõi lóe vàng, hiện "+1".

---

## 10. Góc nhìn camera

| Thao tác | Chuột | Bàn phím (chỉ ở pha xây) | Nút trên màn hình |
|---|---|---|---|
| Xoay quanh bản đồ | Kéo chuột phải | Q / E | ⟲ ⟳ |
| Nghiêng (cao, thấp) | Kéo chuột phải lên xuống | R / F | ▲ ▼ |
| Phóng to, thu nhỏ | Lăn chuột | Z / X | + − |
| Kéo bản đồ | Kéo chuột giữa, hoặc Shift + kéo chuột trái | W A S D | — |
| Về góc mặc định | Nhấp đúp chuột giữa | Home | ⌂ |

- Nghiêng từ 30° tới 85°. Không kéo ra ngoài đảo.
- Khi đang có đợt quái, bàn phím chỉ để gõ. Camera dùng chuột hoặc nút.

---

## 11. Hiệu ứng hình ảnh

| Sự kiện | Hình |
|---|---|
| Rồng bắn | Cầu lửa của rồng (giữ từ bản A+) |
| Diệt quái | Nổ theo màu họ quái, tia lửa, mảnh vỡ |
| Đòn trụ | Mục 6 |
| Bom nổ | Ảnh nổ `explosion-core`, vòng `shockwave-ring`, mảnh `debris-burst`, chớp sáng, rung camera |
| Trụ/Lõi trúng đòn | `spark-burst`, mảnh vỡ, rung |
| Khói | Hạt khói `smoke-dark`/`smoke-hot` bay lên, xoay, to dần, mờ dần |
| Cháy | Lửa động (shader lửa của Campaign 3D) cộng tàn lửa |
| Xây trụ | Cột sáng từ trời, vòng bụi, trụ mọc lên |
| Nâng cấp | Vòng rune xoay, chớp sáng, trụ to và sáng hơn |
| Bán | Trụ tan thành hạt sáng bay về ô năng lượng |

- Ảnh nổ, khói, tia lửa đã có ở `public/assets/space-typing/combat-vfx/`.
- Mọi hiệu ứng đều lấy từ hồ chứa (pool) dựng sẵn. Không tạo mới trong lúc chơi.

---

## 12. Âm thanh

| Sự kiện | Tiếng |
|---|---|
| Sóng băng / đóng băng | Băng tách giòn / pha lê vỡ |
| Trọng lực hút / sụp đổ | Ù trầm / "ùm" hút vào |
| Chuỗi sét | Xẹt điện |
| Khóa bom / nổ | Bíp nhanh dần / nổ lớn |
| Hồi máu Lõi / sửa trụ | Chuông ngân / tiếng sửa máy |
| Thu năng | "Ting" |
| Phá Hoại bắn trụ | Tiếng súng năng lượng |
| Trụ trúng đòn / hỏng | Kim loại va / nổ nhỏ rồi lửa tí tách |
| Lõi trúng đòn / nguy | Va mạnh / còi báo động |
| Xây / nâng / bán | Tiếng đặt máy / nâng cấp / hoàn tiền |
| Boss xuất hiện / dậm đất | Còi lớn / tiếng dậm rung |

- Dùng file có sẵn (Kenney, Freesound CC0 trong `public/assets/audio/`) và tiếng tổng hợp (Web Audio) cho băng, sét, trọng lực.
- Giới hạn: tối đa 6 tiếng cùng loại trong 120 ms, để biển quái không thành tiếng ồn.

---

## 13. Giao diện

1. **Chọn bản đồ:** 8 thẻ, mỗi thẻ có ảnh xem trước của bản đồ, họ quái, sao đạt được.
2. **Xây:** bấm một ô → khung thẻ trụ hiện cạnh ô: biểu tượng, tên, giá, vai trò, **độ hợp ở ô này**. Vùng tầm bắn và các đoạn đường trong tầm sáng lên.
3. **Trụ đã xây:** bảng bên: cấp, máu, chỉ số; nút Nâng cấp (giá), Sửa, Bán. Tới cấp 3 thì hiện **hai thẻ nhánh** để chọn.
4. **Thẻ phước lành:** dùng khung thẻ và tranh có sẵn của game, không vẽ khung CSS trơn.
5. **HUD:** năng lượng, mạng Lõi, đợt X/10, xem trước quái đợt sau (ảnh quái), nút Gọi đợt sớm (có số thưởng), thanh kỹ năng rồng, nút camera.

---

## 14. Rồng, kỹ năng, combo, phước lành

- Giữ từ V3: rồng trên Lõi, cầu lửa khi gõ xong từ; kỹ năng 1 Hơi thở lửa, 2 Gầm, Space Nova; mốc combo 10/25/50.
- Phước lành (chọn 1/3 sau đợt 3, 6, 9) cập nhật theo bộ trụ mới, ví dụ: "Trụ Sét bóc thêm 1 lớp mỗi đòn thứ 3", "Thu Năng +4 mỗi đợt", "Trụ hỏng tự hồi 40 % sau đợt".

---

## 15. Hiệu năng (300–400 quái)

- Giữ cách vẽ theo lô của V3: mỗi loại quái một InstancedMesh, trạng thái quái đọc trong shader.
- Mỗi bản đồ nạp model của một họ: khoảng 12 loại. Trinh Sát và drone dùng model giảm tam giác (`-lod`). Quái hiếm (dưới 30 con) dùng model `-3d`.
- Hiệu ứng: hồ hạt dựng sẵn, tối đa 2.400 hạt; tối đa 24 tia sét và 12 cột khói cùng lúc.
- Địa hình: một lưới 160 × 160, một ảnh 2048 px (máy yếu 1024 px).
- Đo lại với 400 quái, có giới hạn CPU 4 lần.

---

## 16. Lộ trình triển khai

1. Luật: bản đồ, trụ, nhánh, quái mới, máu trụ, kinh tế. Có test và bot cân bằng.
2. Bản đồ: địa hình có độ cao, ảnh vẽ tạm, ô xây có đặc tính.
3. Camera.
4. Hiệu ứng và âm thanh của trụ, quái, trụ hỏng, Lõi.
5. Giao diện: chọn bản đồ, thẻ xây, bảng trụ, thẻ nhánh, thẻ phước lành bằng tranh có sẵn.
6. Kiểm tra hình ảnh từng bản đồ; đo hiệu năng; xuất ảnh khung bố cục và prompt ảnh bản đồ.

**Mục tiêu cân bằng (bot gõ máy):**
- 40 từ/phút, có trụ, mức Thường: thắng bản đồ 1–3.
- 40 từ/phút, không trụ: thua từ bản đồ 1.
- Tiền tích lũy tới hết đợt 5 không đủ xây kín ô.
- Đợt bão: 300–400 quái cùng lúc ở bản đồ 4 trở đi.

---

## 16a. Đã làm (21/10)

**Mã:**
- Luật: `src/defense/rules/` — `data.ts` (quái, 6 trụ với nhánh, kinh tế, phước lành), `maps.ts` (8 bản đồ và đợt quái), `engine.ts` (đòn trụ, quái đánh trụ, máu trụ, hồi sinh, Lõi), `fit.ts` (độ hợp ô xây).
- Hình: `src/defense/view/` — `painter.ts` (ảnh đảo tạm và ảnh khung), `terrain.ts` (đảo có độ cao, vực, đá treo, pha lê, đá vụn), `camera.ts`, `crowd.ts` (quái theo họ, bóng đổ, viền sáng, khiên, tàng hình), `towers.ts`, `vfx.ts` (nổ, khói, lửa, sét, tia, vòng), `sounds.ts`.
- Trang: `src/defense/main.ts`, `defense.html`, `src/defense/defense.css`. Thẻ phước lành và thẻ nhánh dùng `src/ui/reward-card.ts` của game.
- Model mới đóng gói: `items/tower-arc`, `items/tower-sanctum`, `items/tower-siphon` (model relic của chủ dự án), `items/prop-crystal-a/b/c` (pha lê), `enemies/<họ>-scout-lod` cho 6 họ còn thiếu.
- `FlightWorld.skyOnly` (chỉ vẽ trời và hành tinh mốc) và `SceneAudio.preload/playFile/synth` thêm cho Defense; Campaign 3D không đổi.

**Cân bằng (bot gõ máy, độ chính xác 96 %, mức Thường, 3 seed):**

| Bản đồ | 40 từ/phút, có trụ | 60 từ/phút, có trụ | 40 từ/phút, không trụ | Đông nhất |
|---|---|---|---|---|
| 1 Cầu Vồng | 3/3 thắng | 3/3 | thua | ~360 |
| 2 Vườn Hào Quang | 3/3 | 3/3 | thua | ~305 |
| 3 Hố Dung Nham | 2/3 | 3/3 | thua | ~305 |
| 4 Màn Sương Băng | 3/3 | 3/3 | thua | ~465 |
| 5 Tháp Lăng Kính | 3/3 | 3/3 | thua | ~410 |
| 6 Rừng Hoang | thua | 3/3 | thua | ~365 |
| 7 Khe Bóng Tối | thua | 3/3 | thua | ~290 |
| 8 Ngai Vũ Trụ | thua | 3/3 | thua | ~520 |

- Bot chỉ xây toàn trụ rẻ nhất: tới đợt 5 chỉ được 5–8 trên 8–13 ô. Bot xây có tính toán: 3–4 trụ ở đợt 5.
- Test khóa các con số này: `tests/defense-rules.test.ts` (21 test).

**Hiệu năng (Chrome, Mac Apple Silicon, High, 6 trụ đang đánh, 2 trụ cháy):**
- 442 quái: trung bình 3,7 ms/khung, 95 % khung dưới 6,3 ms; 108 lệnh vẽ.
- CPU chậm 4 lần: 6,6 ms trung bình, 95 % dưới 9,4 ms.

**Còn lại:**
- Ảnh bản đồ đẹp: chờ chủ dự án tạo theo `docs/art-requests/DEFENSE_MAPS_PROMPTS_2026-10-21.md`.
- Chơi thử với người thật để chỉnh lại số (đặc biệt bản đồ 6–8).
- Bản đồ đang mở hết để chơi thử (câu hỏi 2).

---

## 17. Câu hỏi mở cho chủ dự án

1. Giữ luật "trụ không gây sát thương kết liễu" (đã chốt 18/10)? V4 giữ nguyên: trụ đánh để khống chế, phá giáp, bóc khiên, còn cú kết liễu luôn là chữ gõ đúng. Nếu chủ dự án muốn trụ được diệt quái yếu, cần chốt lại.
2. Bản đồ mở dần hay mở hết? Bản thử đang mở hết để dễ chơi thử.
