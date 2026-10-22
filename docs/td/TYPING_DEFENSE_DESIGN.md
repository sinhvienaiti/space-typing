# Typing Defense — Thiết kế tổng (bản chốt)

Ngày: 22/10/2026. Mã tạm: **TD** (`src/td/`, trang `td.html`).

Tài liệu này **thay cả bốn bản nháp** `01-systems-v2`, `02-content-world1-v2`, `03-presentation-v2`, `04-architecture-and-build-v2`. Chỗ nào khác các bản đó thì tài liệu này thắng. Việc cần làm ngay nằm ở `BUILD_NOW.md`.

**Cách đọc**
- Trang đầu là **Bản chốt**: tên chuẩn, id, số chính, phạm vi bản thử. Đọc trang này là đủ để bắt đầu.
- Mục 1–3: bản sắc, thị trường, nhận xét hai bản nháp ChatGPT.
- Mục 4–21: luật và số (mục 19 là cân bằng và chiến thuật).
- Mục 22: nội dung Thế giới 1.
- Mục 23–24: hình, UI, âm thanh.
- Mục 25: kiến trúc.
- Mục 26–28: lộ trình, sản xuất art và âm, quyết định mặc định.
- Phụ lục A: hằng số. Phụ lục B: các sửa theo phản biện.

**Luật về số**
- Mọi số là **số khởi điểm**. Bot cân bằng chỉnh lại. Đổi số ở file dữ liệu, không sửa luật.
- Thập phân viết dấu phẩy: 1,5 s. Trong mã viết dấu chấm.
- Bảng số "khi có người gõ" ở tài liệu này tính bằng một script mô hình tạm (hồ sơ người gõ, tỉ lệ trúng theo tải). Bot thật (`pnpm td:balance`) thay chúng từ bước 1A.

---

## 0. Bản chốt (2 trang)

### 0.1 Game là gì, trong một câu

> Thủ thành kiểu Kingdom Rush trên nhiều vùng đất. Nhà tự chạy. Tướng và các Trợ Thủ chạy tới nhà để **trợ lực**. Nhà được trợ lực **phát chữ bay lên**. Gõ đúng trước khi chữ tan thì nhà mạnh ngay: tháp bắn, mỏ ra vàng, trại hồi lính. Càng nhiều nhà, nhịp càng dày, càng khó đọc kịp, càng mạnh. Không có trần thưởng.

### 0.2 Mười hai luật khóa

1. Quái và boss **có máu**. Tháp, lính, Tướng, phép đều giết được.
2. **Nhà luôn tự chạy.** Có người đứng thì +15 % (có mặt). Có người và có gõ thì mới thật mạnh.
3. **Trợ lực = đưa một nhân vật tới nhà.** Mỗi nhà một người. Ô 1 là Tướng. Ô 2–4 là Trợ Thủ. Nâng Lũy Chữ để mở ô.
4. **Nhịp chọn theo từng nhà:** Dừng, 8 s (Dễ), 6 s, 4 s, 3 s, 2 s, 1 s. Nhịp dày mở theo cấp nhà. Nhịp dày thì khó hơn và thưởng hơn.
5. **Không trần thưởng từ gõ.** Chỉ có trần số chữ hiện cùng lúc (đọc được) và trần chỗ tiêu (số nhà, cấp nhà).
6. **Chính xác trước, nhanh sau.** Chấm theo số lỗi, có nới cho từ dài.
7. **Chữ cùng sống có chữ đầu khác nhau.** Gõ chữ đầu là khóa từ đó.
8. **Gõ trực tiếp lên quái hiếm và có ý nghĩa.** Chỉ để phá cơ chế. Không giết thẳng.
9. **Ghi sổ trong mô phỏng ngay tick xảy ra.** Đồng bay, chữ bay chỉ là hình.
10. **Mô phỏng tất định:** 60 Hz, lệnh có tick, RNG theo seed, số nguyên cho máu và tiền.
11. **Chữ cái chỉ để gõ.** Không phím chữ nào là phím tắt (tránh Telex, UniKey).
12. **Máy bàn trước:** chuột và bàn phím, màn từ 1280 × 720. Cảm ứng làm sau.

### 0.3 Số chính

| Thứ | Số |
|---|---|
| Ô trợ lực | 1 → 4. Lũy cấp 2 / 3 / 4 mở ô 2 / 3 / 4. Giá Lũy 150 / 260 + 40 Gỗ / 400 + 60 Gỗ. |
| Nhịp mở | 6, 4, 3 s ở nhà L1. 2 s ở L2. 1 s ở L3. 8 s chỉ mức Dễ. |
| Nhịp mặc định nhà mới | 6 s khi E < 30 WPM. 4 s khi E ≥ 30. Game nhớ lựa chọn theo loại nhà. |
| Tuổi từ | 3–6 s theo tốc độ riêng E và độ dài từ. Dễ ×1,25. |
| Độ dài từ | Theo E: < 25 → 3–5; 25–44 → 3–6; 45–64 → 4–7; ≥ 65 → 4–8. Nhịp 1 s tối đa 5 chữ, 2 s tối đa 6. |
| Trần chữ cùng lúc | 16 mọi loại. Dòng chữ ≤ min(12, số chữ đầu khả dụng − 6). Mỗi nhà ≤ 4. |
| So le phát | Hai lần phát cách nhau ≥ 0,2 s, lùi tối đa 0,6 s. |
| Chấm lỗi | 0 lỗi: Hoàn hảo. 1 lỗi: Tốt (từ ≥ 6 chữ) hoặc Vừa (≤ 5 chữ). Hơn: Ẩu. Cụm ≥ 12 chữ được 2 lỗi. |
| Nhiệt | 0–5 mỗi nhà, hiện bằng 5 đèn lồng. Chớp +1,5; Hoàn hảo, Tốt +1; Vừa +0,5; Ẩu −1; tan −1. |
| Chuỗi | Chung cả trận. Tốt +1. Ẩu ÷2. Tan sau khi đã gõ ÷2. Tan chưa chạm −2. Bậc 0/5/10/20/40. |
| Hào quang | Tốc bắn ≤ ×1,5. Sát thương ≤ ×1,4. Vùng ≤ ×1,5. +2 mục tiêu. Nhân thêm hệ số nhịp k_N. |
| Hệ số nhịp T_N | Tấn công: 0,85 / 0,9 / 1,0 / 1,1 / 1,2 / 1,35 (8/6/4/3/2/1 s). Kinh tế: 0,85 / 0,9 / 1,0 / 1,0 / 1,05 / 1,1. |
| Bùng Nổ | Nhiệt 5 và Chuỗi ≥ 8 → cụm chốt 2 từ → 6 s + 2 s × Mượt. Nghỉ lò 20 s. |
| Vàng đầu | 220 (bản đồ 1). Lúa 15. Gỗ 0 (Gỗ từ VS). Mạng 20. |
| Boss | Bản đồ có boss: boss là đợt cuối. Bản đồ 1: 8 đợt. Bản đồ 2: 10. Bản đồ 3: 12. |

### 0.4 Tên chuẩn (rút gọn; bảng đủ ở mục 0.6)

Lũy Chữ · Tháp Cung · Tháp Pháo · Tháp Thư Pháp · Trại Lính · Mỏ Vàng · Ruộng Lúa · Trại Gỗ · Đài Ấn · Nhà Thuốc · Tướng · Trợ Thủ (Thế giới 1: Thư Đồng Chấm, Phẩy, Gạch) · Dòng chữ · Nhịp · Nhiệt · Dư âm · Chuỗi · Tốc / Chuẩn / **Mượt** · Phát Chữ · Bùng Nổ · Cụm chốt · Hợp Tấu · Tối Thượng · Chữ Chiêu · Ấn Phụ · Từ Vàng / Từ Sao / Từ Lá · Từ Ôn · Từ Nhặt · Túi · Bùa · Mảnh Chữ · Cơn Gấp · Gõ trực tiếp · Cửa sổ ấn · Tải · Dải Chữ · Khay mép.

Mã dùng `tempo` (không dùng `density`). Kênh thứ ba trong mã là `flow`.

### 0.5 Bản thử chia ba phần

| Phần | Nội dung | Ai chơi | Cổng cứng |
|---|---|---|---|
| **1A — Cổng vui** (≤ 5.000 dòng mã) | Bản đồ 2D nhìn từ trên. 5 nhà (Lũy, Cung, Pháo, Trại Lính, Mỏ). 3 loại quái. Dòng chữ đầy đủ: phát, khóa, chấm, Nhiệt, Chuỗi, phần thưởng, hào quang. Tướng bay + 3 Thư Đồng đi bộ A*. Thẻ chữ DOM, HUD tối thiểu. **Hộp cát:** đặt 1–4 ô, nhịp từng nhà, mọi nhịp mở sẵn. | Chủ dự án, ở 1280 × 720, gồm chơi 3 và 4 ô | Bất biến, chạy lại khớp mã băm, hiệu năng, không lỗi console |
| **1B — Đủ luật bản đồ 1** | Loot và túi, nâng cấp và bán, Lũy mở ô thật, Ruộng và Lúa, Đài Ấn, Tối Thượng và Chữ Chiêu, gõ trực tiếp, Từ Vàng, Từ Ôn, Bùng Nổ, quái bản đồ 1 + Troll, boss Mộc Tinh nhỏ, Lam dạng khối | Chủ dự án, bản đồ 1 chế độ truyện | Như 1A + `td:balance` in báo cáo |
| **1C — Hình 3D** | Cảnh 3D, model tạm, cảnh 2D cơ bản, đồng bay về HUD, Mảnh Chữ bay về Tướng, Dải Chữ, khay mép, chuyển Credit Crystal sang `src/platform` | Chủ dự án | Như 1A + kịch bản hình |

- Bản thử là **hộp cát**: cờ dev mở mọi nhịp, mọi ô. Chế độ truyện theo bảng dạy ở mục 20.4.
- Mục tiêu cân bằng (sao, tỉ lệ nguồn vàng, thời gian hạ boss) **chỉ in báo cáo** ở bước 1. Chúng thành cổng cứng ở lát dọc (VS).

### 0.6 Bảng thuật ngữ chuẩn

| VI (người chơi thấy) | EN | id trong mã | Nghĩa |
|---|---|---|---|
| Tướng | Hero | `hero` | Nhân vật chính, giữ ô 1, biết đánh |
| Trợ Thủ | Helper | `helper` | Nhân vật phụ, giữ ô 2–4, không đánh |
| Thư Đồng Chấm, Phẩy, Gạch | Dot, Comma, Dash | `helper-cham`, `helper-phay`, `helper-gach` | Trợ Thủ Thế giới 1 (cú non) |
| Ô trợ lực | Assist slot | `slot` | Số nhà được trợ lực cùng lúc |
| Trợ lực | Assist | `assist` | Một nhân vật đứng ở ổ của nhà |
| Có mặt | Presence | `presence` | +15 % khi có người đứng, kể cả không gõ |
| Dòng chữ | Word stream | `stream` | Chuỗi từ nhà phát khi được trợ lực |
| Nhịp | Tempo | `tempo`, `TempoOption`, `setTempo` | Cứ N giây phát một từ |
| Dừng | Stop | `tempo = 0` | Không phát từ, chỉ còn có mặt |
| Tuổi từ | Word life | `life` | Thời gian một từ sống |
| Nhiệt | Heat | `heat` | Độ ấm của nhà, 0–5, hiện bằng 5 đèn lồng |
| Dư âm | Afterglow | `afterglow` | Nhiệt còn giữ khi người rời nhà |
| Chuỗi | Chain | `chain` | Số từ tốt liên tiếp, chung mọi nhà |
| Tốc / Chuẩn / Mượt | Speed / Accuracy / Flow | `speed`, `accuracy`, `flow` | Ba kênh hào quang |
| Hào quang | Aura | `aura` | Hiệu ứng liên tục theo Nhiệt, có trần |
| Phần thưởng từ | Word reward | `wordReward` | Thứ nhà nhận ngay khi một từ xong |
| Phát Chữ | Word shot | `wordShot` | Phát bắn ngay của tháp khi một từ xong |
| Cụm chốt | Finisher | `finisher` | Cụm 2 từ mở Bùng Nổ |
| Bùng Nổ | Overdrive | `overdrive` | Trạng thái rất mạnh 6–8 s của một nhà |
| Nghỉ lò | Cooldown | `overdriveRest` | 20 s sau Bùng Nổ, không ra cụm chốt |
| Hợp Tấu | Harmony | `harmony` | Hai nhà trở lên Bùng Nổ cùng lúc (VS) |
| Tối Thượng | Ultimate | `ultimate` | Chiêu cuối của Tướng |
| Chữ Chiêu | Ult words | `ultWord` | Từ hiện sau Tối Thượng, gõ để thêm sức |
| Ấn Phụ | Spell words | `spellWord` | Cụm 2 từ sau Phép Chỉ huy (VS) |
| Phép Chỉ huy | Command power | `power` | Mưa Đá Lửa, Viện Binh |
| Từ Hiếm: Vàng, Sao, Lá | Rare word: gold, star, leaf | `rare.gold`, `rare.star`, `rare.leaf` | Từ thưởng lớn, trượt không phạt |
| Từ Ôn | Review word | `review` | Từ vừa trượt quay lại |
| Từ mới | New word | `isNew` | Từ chưa học, có nghĩa tiếng Việt |
| Từ Nhặt | Pickup word | `pickup` | Từ trên túi rơi |
| Túi | Bag | `bag` | Túi chiến lợi rơi từ quái |
| Bùa: Sửa, Băng, Gió | Charm: Mend, Frost, Gale | `charm-mend`, `charm-frost`, `charm-gale` | Đồ dùng một lần trong túi |
| Mảnh Chữ | Letter shard | `shard` | Chữ cái của tên quái, nạp Tối Thượng |
| Cơn Gấp | Rush | `rush` | Sự kiện 12 s dồn chữ ở một nhà (VS) |
| Heo Đất Vàng | Golden piggy | `piggy` | Sự kiện kho báu (VS) |
| Gõ trực tiếp | Direct typing | `direct` | Gõ chữ trên quái để phá cơ chế |
| Cửa sổ ấn, cụm ấn | Seal window, seal phrase | `seal` | Gõ ở Đài Ấn để phá đại chiêu boss |
| Tải | Load | `load` | Từ mỗi phút đang phát so với sức gõ |
| Sức gõ | Capacity | `capacity` | Số từ mỗi phút gõ được khi vẫn nhìn bản đồ |
| Dải Chữ | Word strip | `wordStrip` | Dải dưới giữa màn hình |
| Khay mép | Edge tray | `edgeTray` | Chữ của nhà khuất màn hình |
| Đổ Nát | Ruined | `ruined` | Nhà hết máu, chờ sửa |
| Node | Node | `node` | Điểm đặt Mỏ, Trại Gỗ, Đài Ấn |
| Lũy Chữ | Bastion | `keep` | Nhà chính, giữ 20 mạng |
| Tháp Cung | Archer tower | `archer` | |
| Tháp Pháo | Cannon tower | `cannon` | |
| Tháp Thư Pháp | Scribe tower | `scribe` | Tháp phép (VS) |
| Trại Lính | Barracks | `barracks` | |
| Mỏ Vàng | Gold mine | `gold-mine` | |
| Ruộng Lúa | Rice field | `farm` | |
| Trại Gỗ | Lumber camp | `lumber` | VS |
| Đài Ấn | Seal dais | `seal-dais` | |
| Nhà Thuốc | Infirmary | `infirmary` | VS |
| Vàng, Lúa, Gỗ | Gold, Rice, Wood | `gold`, `food`, `wood` | Tài nguyên trong trận |
| Tri thức | Knowledge | `knowledge` | Tiền ngoài trận, đến từ việc học |

**Kết quả một từ** (luật và hình dùng chung tên):

| Tên | id `grade` | Khi nào |
|---|---|---|
| Chớp | `flash` | 0 lỗi và nhanh (S_w ≥ 0,7) |
| Hoàn hảo | `perfect` | 0 lỗi |
| Tốt | `good` | Trong mức lỗi cho phép và từ ≥ 6 chữ |
| Vừa | `ok` | Trong mức lỗi cho phép và từ ≤ 5 chữ |
| Ẩu | `sloppy` | Quá mức lỗi cho phép |
| Tan | `expired` | Hết tuổi mà chưa xong |
| Hủy | `cancelled` | Chủ của từ mất (nhà bị phá, quái chết). Không tính trượt. |

**Sự kiện học** (`activityType`, giữ `gameId: "space-typing"`): `defense-assist`, `defense-direct`, `defense-boss`, `defense-review`, `defense-recall` (gõ theo nghĩa), `defense-listen`.

---

## 1. Bản sắc

### 1.1 Định vị

- Game riêng, không phải "Space Typing đặt vào bản đồ thủ thành".
- Không phải "Kingdom Rush mà quái nào cũng có chữ trên đầu".
- Dùng chung nền của Space Typing: tài khoản, lớp nhận phím và bộ gõ tiếng Việt, bộ từ vựng và học, lưu, âm thanh.
- **Không đặt trong vũ trụ.** Nhiều vùng đất, nền văn minh, dân tộc, địa hình. Vài bản đồ dùng phong cách neon kỳ ảo của Space Typing (mục 26.3).
- Câu định vị: **Thủ thành + Điều người trợ lực + Nhà tự chạy + Dòng chữ khuếch đại + Gõ trực tiếp chọn lọc + Học từ + Nhân vật có truyện.**

### 1.2 Bảy trụ cột

| # | Trụ cột | Người chơi cảm thấy |
|---|---|---|
| 1 | Thủ thành chiến thuật | Đặt nhà tự do, chọn nâng cấp, đọc đợt quái, khắc chế |
| 2 | Điều người | "Đưa ai tới nhà nào, lúc nào?" Đi bộ tốn thời gian, nên mỗi lần dời là một quyết định |
| 3 | Dòng chữ trợ lực | Chữ bay lên trên nhà. Gõ trúng là thấy ngay mũi tên, đồng vàng, tiếng trống |
| 4 | Chiến đấu có máu | Quái và boss có máu, giáp, trạng thái. Đọc được như thủ thành bình thường |
| 5 | Gõ trực tiếp chọn lọc | Vài quái mở cửa sổ gõ để phá cơ chế. Hiếm, nên đáng nhớ |
| 6 | Học | Từ đúng cấp, từ cần ôn, nghĩa tiếng Việt, nghe rồi gõ. Không chen ngang trận |
| 7 | Nhân vật và thế giới | Tướng có truyện, giọng, kỹ năng, VFX. Mỗi nhà có tổ thợ biết nói |

### 1.3 Điều không làm

- Không đặt chữ trên mọi quái. Không để gõ là nguồn sát thương duy nhất.
- Không để nhà vô dụng khi không có người.
- Không quái nào phá phím, đảo chữ, giấu chữ.
- Không VFX che chữ. Không thưởng tốc hơn chuẩn.
- Không 10 loại tiền. Không bán sức mạnh. Không gacha.
- Không viết riêng lõi cho từng thế giới. Thế giới mới chỉ thêm dữ liệu và asset.

---

## 2. Thị trường (tóm tắt)

Nguồn: hiểu biết chung về thể loại tới giữa 2026, và tìm hiểu đặt nhà tự do ở bản V5. Không có số bán hàng chính xác ở đây; chỉ rút bài học.

| Nhóm | Game tham khảo | Bài học cho ta |
|---|---|---|
| Thủ thành có tướng | Kingdom Rush (1, Frontiers, Origins, Vengeance, Alliance) | Nhiều vùng đất vẽ tay rực rỡ. Mỗi màn dạy một ý. Tổ thợ, lính, quái đều có tiếng và câu hô ngắn: đó là cảm giác "sống". Điểm trừ hay bị nhắc: điều khiển tướng vi mô thành việc vặt; nhạc ít bản. |
| Thủ thành đặt tự do | Bloons TD 6 | Đặt tự do với vòng chiếm chỗ đọc được rõ. Vật cản trả tiền để dọn. Nhà kinh tế chiếm chỗ lớn (một kiểu "thuế đất"). |
| Thủ thành tối giản có anh hùng chạy | Thronefall | Anh hùng chạy giữa nhà là vui. Nhà kinh tế sinh tiền theo đợt. Điểm trừ hay bị nhắc: quái khó phân biệt. Ta phải giữ bóng hình rõ. |
| Hành động bằng gõ | The Typing of the Dead, Epistory, Nanotale, ZType | Gõ là hành động thì rất đã tay. Người chơi ghét bị phạt nặng vì một lỗi. Epistory cho chọn chữ bằng chữ đầu: dễ hiểu. Game gõ thường thiếu chiều sâu chiến thuật dài hơi. |
| Luyện gõ, giáo dục | Monkeytype, TypingClub, Nitro Type | Người học cần phản hồi tức thì, cần thấy tiến bộ, cần nhịp vừa sức. Trẻ em gõ 10–30 WPM. Cạnh tranh tốc độ dễ làm trẻ chán. |

**Chỗ trống của ta:** chưa có game nào ghép **thủ thành có điều người** với **dòng chữ khuếch đại nhà** và **học từ vựng**. Người chơi tự chọn mức gõ (số ô, nhịp), nên người mới học và người gõ 100 WPM cùng chơi một bản đồ được.

**Rủi ro thị trường và cách chặn:**
1. Mệt vì gõ liên tục → nhịp do người chơi chọn, nút Dừng, quãng nghỉ có thiết kế (mục 18.6).
2. Rối mắt khi nhiều chữ → luật chữ đầu, trần chữ, bộ xếp làn, chip Tải.
3. Người gõ chậm bị bỏ lại → tuổi từ co giãn theo tốc độ riêng; nhịp 6 s, 8 s; cổng bot 25 WPM.
4. Bộ gõ tiếng Việt nuốt phím → lớp nhận phím có sẵn của Space Typing, không phím tắt chữ cái.
5. Chi phí art lớn → 2D cho cảnh lặp lại, Tripo cho nhân vật, sản xuất theo bậc (mục 27).

---

## 3. Nhận xét hai bản nháp ChatGPT

Hai bản: `DEFENSE_GAMEPLAY_SYSTEMS_MASTER_V2` (gọi tắt **Hệ thống**) và `DEFENSE_GAME_CONTENT_CATALOG_MASTER_V2` (gọi tắt **Danh mục**).

**Điểm chung:** Hệ thống **7/10**. Nền đúng (máu, nhà tự chạy, tướng khuếch đại, gõ trực tiếp chọn lọc, chính xác trước). Thiếu số. Mô hình trợ lực "một ô gõ cố định" đã bị hướng 22/10 thay. Đề xuất ô đặt cố định và "chỉ có Vàng" đi ngược ý chủ dự án. Danh mục **6/10**. Là thực đơn tốt cho nhiều năm. Quá rộng cho một thế giới (12 lớp tướng, 10 tháp, 24 quái). Nhiều loại nên gộp thành nhánh.

### 3.1 Hệ thống: giữ, đổi, bỏ, thêm

| Mục bản nháp | Kết luận | Lý do một dòng | Nay ở đâu |
|---|---|---|---|
| §1 Bản sắc, §2 Trụ cột | **Giữ** | Đúng ý chủ dự án | Mục 1 |
| §3 Chiến đấu có máu | **Giữ** | Luật khóa 1 | Mục 10 |
| §4 Mô hình 3 lớp | **Đổi** | Lớp 2 thành **dòng chữ theo nhịp từng nhà**, không còn một ô gõ cố định | Mục 6 |
| §5 Tỉ lệ thời gian gõ | **Đổi** | Người chơi tự đặt tải bằng số ô và nhịp. Gõ trực tiếp ≈ 5–10 % số chữ | Mục 6.13, 9 |
| §6–8 Điều tướng | **Đổi** | Thêm Trợ Thủ và ô trợ lực. Có câu hỏi "Tướng ra trận hay trợ lực?" | Mục 8 |
| §7 Kiểu di chuyển | **Giữ một phần** | Bộ, bộ nhanh, bay. Dịch chuyển và "nhờ phương tiện" để sau MVP | Mục 8.2 |
| §9 Nhà tự chạy | **Giữ** | Luật khóa 2 | Mục 11.2 |
| §10 Trạng thái trợ lực | **Đổi** | Vào việc 0,4 s, từ đầu sau 0,6 s, từ phát theo nhịp | Mục 6.4 |
| §11 Trọng số 45/25/15/10/5 | **Đổi** | Thay bằng công thức rõ: Chuẩn nặng hơn Tốc; Chuỗi qua r_c; độ đều tay chỉ cho Dư âm | Mục 6.6–6.9 |
| §12 Mức nền cá nhân | **Giữ** | Tốc đo theo mức nền B | Mục 6.6 |
| §13 Chính xác trước | **Giữ** | Luật khóa 6 | Mục 6.6 |
| §14 Nghĩa của từng kênh | **Đổi** | Tốc → tốc bắn; Chuẩn → sát thương, chí mạng; Mượt (nhanh + chuẩn + Chuỗi) → vùng, mục tiêu thêm | Mục 6.10 |
| §15 Xử lý lỗi | **Giữ** | Không reset, không phạt thêm | Mục 6.14 |
| §16–19 Gõ trực tiếp | **Giữ** | Thành phần riêng, thất bại thì cơ chế quái chạy tiếp | Mục 9 |
| §20–21 Bùng Nổ | **Đổi** | Mở bằng cụm chốt khi Nhiệt 5 và Chuỗi ≥ 8; nghỉ lò 20 s | Mục 6.12 |
| §22 Nâng cấp L1–L3, nhánh A/B | **Giữ** | Thêm: cấp mở nhịp dày | Mục 12 |
| §23–25 Kinh tế, tham hay an toàn | **Giữ** | Có số và chống lăn cầu tuyết | Mục 17 |
| §26 Chỉ Vàng ở bản thử | **Đổi** | Chủ dự án muốn ruộng, mỏ. Vàng + Lúa ở bản thử; Gỗ ở VS. Tri thức là tiền ngoài trận | Mục 17.1 |
| §27 Ruộng | **Giữ** | Ruộng nuôi lính bằng Lúa, không thành game xây thành | Mục 11.6 |
| §28–30 Lính, AI | **Giữ** | | Mục 13, 14 |
| §31–33 Đợt, xem trước, nhịp đợt | **Giữ** | Thêm quãng nghỉ có luật | Mục 18 |
| §34 Giữa hai đợt | **Đổi** | Không cửa hàng, không chọn phúc lợi. Xây, nâng, dời người, nghỉ tay | Mục 18.3 |
| §35–38 Boss | **Giữ** | Mỗi pha thêm một cơ chế; cửa sổ ấn ở Đài Ấn | Mục 18.7 |
| §39 Lớp bản đồ | **Giữ** | | Mục 22.9 |
| §40 Ô đặt cố định | **Bỏ** | Chủ dự án chọn đặt tự do có vòng chiếm chỗ. Node chỉ cho Mỏ, Trại Gỗ, Đài Ấn | Mục 12.5–12.6 |
| §41 Lối tắt | **Giữ, giới hạn** | Không có ở bản đồ 1–2; từ bản đồ 3 tối đa 2 | Mục 8.2 |
| §42–46 Địa hình | **Giữ 1–2 luật mỗi bản đồ**; bỏ danh sách chung | Mỗi bản đồ có luật riêng | Mục 22.9 |
| §47–48 Thế giới là dữ liệu | **Giữ** | | Mục 25 |
| §49–53 Truyện, thoại, trình bày nhân vật | **Giữ** | | Mục 22, 23 |
| §54 Hướng art | **Giữ** | Thêm: cảnh lặp là 2D | Mục 23 |
| §55 Camera | **Đổi** | Camera chuột tự do; không tự chạy giữa đợt | Mục 23.6 |
| §56 Chữ không bị che | **Giữ** | Thẻ chữ là DOM trên canvas | Mục 23.3 |
| §57–59 UI máu, nhà, tướng | **Giữ** | Thêm thanh trợ lực 4 chân dung | Mục 23.5 |
| §60–61 Cửa hàng | **Đổi** | Không có cửa hàng trong trận. Chợ ngoài trận. Chưa tiền thật | Mục 16.3 |
| §62–65 Tiến trình | **Giữ** | Lựa chọn ngang, trần +15 % | Mục 15 |
| §66 Trang bị | **Bỏ khỏi MVP** | Chưa chứng minh được | — |
| §67–69 Phần thưởng, mục tiêu phụ | **Giữ** | Huy chương chữ | Mục 7.9 |
| §70–71 Độ khó | **Giữ** | Dễ, Thường, Khó + thử thách | Mục 20 |
| §72–81 Học | **Giữ** | Câu dài và ngữ pháp để ngoài trận | Mục 21 |
| §82–86 Âm thanh, VFX | **Giữ** | Có số ưu tiên và trần | Mục 23–24 |
| §87–88 Trợ năng, hiệu năng | **Giữ** | | Mục 20.6, 25.12 |
| §89–90 Dữ liệu, tách hai hồ sơ gõ | **Giữ** | `StreamProfile` và `DirectTypingInteraction` tách riêng | Mục 25.3 |
| §91–94 Sự kiện, lưu, đo, chống lợi dụng | **Giữ** | | Mục 25 |
| §97–99 Bản thử | **Đổi** | Chia 1A / 1B / 1C; 1A là cổng vui | Mục 26.1 |
| §103 Điều không làm | **Giữ** | | Mục 1.3 |

**Thêm mới (bản nháp không có):** ô trợ lực và Trợ Thủ; nhịp từng nhà; không trần thưởng; Nhiệt và Dư âm; Chuỗi chung; luật chữ đầu và bộ định tuyến phím; chip Tải; Phát Chữ; các hệ gõ vui (mục 7); rơi đồ hai đích (HUD và nhân vật); an toàn bộ gõ tiếng Việt; mô phỏng tất định; bot và cổng; cảnh 2D; quy trình Tripo; âm thanh "sống"; lộ trình thế giới.

### 3.2 Danh mục: giữ, gộp, hoãn, bỏ

| Nhóm bản nháp | Kết luận | Thế giới 1 dùng |
|---|---|---|
| 12 lớp tướng (H01–H12) | **Giữ làm phân loại dài hạn.** Bỏ lớp "Lai" (H12). | 3 tướng: Draconis (H10 rồng), Lam (H03/H07 nhanh), Tre (H05/H09 kỹ sư, kinh tế) |
| Tướng bản thử "Kỹ sư" | **Đổi** | Draconis (đã có model). Lam ở 1B dạng khối, model thật khi có Tripo |
| Tháp D01–D10 | **Gộp** | 3 tháp: Cung, Pháo, Thư Pháp. Bắn tỉa, chống bay → nhánh Cung. Lửa → nhánh Pháo. Băng, sét → nhánh Thư Pháp. Độc → để sau. Bẫy → Xưởng Rào, Rào Tre |
| Quân sự M01–M06 | **Gộp, hoãn** | Trại Lính (nhánh Khiên Đồng, Giáo Dài). Kỵ, thú, triệu hồi, ổ rồng → thế giới sau. Bỏ Trạm gác |
| Kinh tế E01–E05 | **Gộp, bỏ** | Mỏ Vàng. Chợ → nhánh Lò Đúc Tiền. Bỏ Trạm buôn, Kho bạc, Sở thuế |
| Tài nguyên R01–R05 | **Gộp** | Ruộng (Lúa), Trại Gỗ (Gỗ, VS). Mỏ đá, mỏ pha lê là skin Gỗ của thế giới khác. Giếng mana → Đài Ấn |
| Sản xuất P01–P04 | **Bỏ, gộp** | Lò rèn, xưởng → kỹ năng nhánh và Rào. Giả kim, xưởng đạn → để sau |
| Hỗ trợ S01–S05 | **Gộp, bỏ** | Nhà Thuốc, Đài Ấn. Bỏ Đền (luật tôn trọng văn hóa). Nhà nhạc, máy khiên → để sau |
| Nghiên cứu RS01–RS04 | **Ra ngoài trận** | Học Viện, Cây Chữ ở Thư Thành. Đài quan sát → nhánh Thần Tiễn và Sóng Chữ |
| Lính U01–U08 | **Gộp** | Lính Giáo, Lính Khiên (VS), Lính Giáo Dài (nhánh), lính tạm. Còn lại để sau |
| Quái EN01–EN24 | **Giữ 16 vai** | 12 loài Thế giới 1 + quái do boss gọi (mục 22.6) |
| Gõ trực tiếp DT01–DT08 | **Giữ 6 động từ** | Neo, Ngắt, Phá Khiên, Hiện Hình, Phong Gậy, Bắt. "Kết liễu" chỉ là đòn kết boss tùy chọn. Đẩy lùi, giải buff → để sau |
| Boss BS01–BS08 | **Giữ phân loại** | Mộc Tinh (đổi địa hình + triệu hồi), Đại Bàng Tinh (boss bay) |
| Tài nguyên: Vàng, Vật liệu, Tri thức | **Đổi** | Vàng, Lúa, Gỗ trong trận. Tri thức ngoài trận |
| Cửa hàng SH01–SH05 | **Bỏ, hoãn** | Không cửa hàng trong trận. Chợ ngoài trận. Trang phục sau MVP. Không cửa hàng sự kiện. Bản vẽ kiếm bằng chơi, không bán |
| Trang bị | **Bỏ khỏi MVP** | — |
| Vật phẩm | **Giữ ít** | 4 vật phẩm mang theo + 3 bùa rơi |
| Loại đồ rơi | **Đổi** | Vàng, Lúa, Gỗ, Mảnh Chữ, túi có bùa. Không mảnh bản vẽ trong trận |
| CGI C1–C3 | **Giữ C1–C2 cho MVP** | C3 dựng sẵn để sau (quyết định chủ dự án, mục 28) |
| Cổng chất lượng, ma trận khắc chế | **Giữ** | Ma trận Thế giới 1 ở mục 22.10 |

### 3.3 Trả lời 25 câu hỏi của bản Hệ thống

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Mô hình 3 lớp đúng chưa? | Đúng khung. Lớp 2 đổi thành dòng chữ theo nhịp từng nhà. Lớp 3 giữ hiếm. |
| 2 | Điều tướng đủ làm điểm bán? | Một mình thì chưa. **Điều nhiều người + dòng chữ không trần** mới là điểm bán. |
| 3 | Gõ trực tiếp bao nhiêu là vừa? | 5–10 % số chữ gõ; trung bình một cửa sổ mỗi 25–40 s; không có trước đợt 5 bản đồ 1. |
| 4 | Tướng tự đánh? | Có, khi rảnh. Khi trợ lực thì không đánh (trừ đánh trả cận chiến 50 %). |
| 5 | Vi mô bao nhiêu là quá? | Lệnh chỉ là "ai tới nhà nào" và "nhịp nào". Kỹ năng thường tự dùng. Chỉ Tối Thượng và phép bấm tay. Có ân hạn ra lệnh và đường bàn phím cho mọi việc. |
| 6 | Nhà có bị phá vĩnh viễn? | Không. Hết máu thành Đổ Nát, sửa bằng từ sửa hoặc tự dựng lại cuối đợt (25 % giá). |
| 7 | Trọng số hợp lý? | Thay bằng công thức: chất lượng Q = 0,6·Chuẩn + 0,4·Tốc hiệu dụng. |
| 8 | Chuẩn hóa WPM công bằng? | Mức nền B riêng; tuổi từ và "nhanh" đo theo B; tốc gõ thuần chỉ để cập nhật B. |
| 9 | Hiệu ứng gõ trực tiếp nào tốt nhất? | Ngắt (hủy chiêu), Phá Khiên, Neo (đứng sững), Hiện Hình, Phong Gậy, Bắt (lấy lại vàng). |
| 10 | Chỉ Vàng ở bản thử? | Vàng ở 1A. Lúa ở 1B (chủ dự án muốn ruộng). |
| 11 | Khi nào thêm Vật liệu? | Gỗ ở VS, chỉ cho Lũy cấp cao, L3, nhánh. |
| 12 | Ruộng có ích hay rối? | Có ích nếu chỉ một vai: Lúa nuôi lính, Lúa dư đổi Vàng 1 : 1. |
| 13 | Ô đặt cố định? | Không. Đặt tự do có vòng chiếm chỗ. Node cho Mỏ, Trại Gỗ, Đài Ấn. |
| 14 | Lối tắt bao nhiêu? | 0 ở bản đồ 1–2; tối đa 2 từ bản đồ 3, mỗi lối có giá. |
| 15 | Đường động? | Sau MVP. Thủy triều, Tường Rễ là dạng nhẹ đã có. |
| 16 | Boss gõ bao lâu một lần? | Một cửa sổ ấn mỗi lần chuyển pha (2–3 lần một boss). |
| 17 | Boss kéo dài? | Boss nhỏ 45–75 s, boss thế giới 2–3 phút, boss cuối 3–4 phút. |
| 18 | Tránh rối UI khi boss? | Khi cửa sổ ấn mở, mọi dòng chữ dừng phát. Tối đa 3 chữ không thuộc dòng chữ. |
| 19 | Học gì trong trận? | Từ, cụm ngắn, nghe rồi gõ, gõ theo nghĩa (ở Đài Ấn). |
| 20 | Học gì ngoài trận? | Ngữ pháp, câu, đọc hiểu, ôn trận, phòng luyện nhịp. |
| 21 | Bỏ trang bị khỏi MVP? | Bỏ. |
| 22 | Sức mạnh vĩnh viễn bao nhiêu là an toàn? | Tài khoản tối đa mạnh hơn tài khoản mới khoảng +25 % ở cùng sức gõ. Sức gõ là đường tăng chính. |
| 23 | Kiến trúc dữ liệu? | Module TS có kiểu, tách khối luật và khối hình; mã băm nội dung; sau này JSON cho Admin. |
| 24 | Kiến trúc sự kiện? | Hai kênh: vòng mảng dày cho chiến đấu, danh sách sự kiện hiếm. View chỉ đọc. |
| 25 | 2,5D hay 3D đầy đủ? | 3D đầy đủ cho nhân vật, nhà, quái, boss, mốc cảnh. Cảnh lặp lại là tranh 2D. |

**Trả lời 15 yêu cầu của bản Danh mục:** thiếu (Trợ Thủ, tổ thợ biết nói, túi có Từ Nhặt, Mảnh Chữ); thừa và gộp (bảng 3.2); hoãn (bảng 3.2); danh mục bản thử (mục 0.5, 26.1); danh mục MVP (mục 26.2); danh mục Thế giới 1 (mục 22); ma trận khắc chế (mục 22.10); xếp hạng chi phí asset (mục 27.3); rủi ro sản xuất (mục 27.4); gõ trực tiếp (mục 9); boss (mục 22.7); cửa hàng (mục 16.3); tài nguyên (mục 17); phân loại V2.1 (mục 3.2).

---

## 4. Vòng chơi

### 4.1 Ba vòng lồng nhau

| Vòng | Thời lượng | Nội dung |
|---|---|---|
| Vi mô | 3–30 s | Liếc các từ đang bay → gõ từ quan trọng nhất trước → nhà bắn, đào, hồi ngay → chỉnh nhịp → dời người khi tình hình đổi |
| Trung | 1 đợt: 45–90 s + 20–30 s chờ | Xem trước đợt → xây, nâng (tham hay an toàn) → chia ô → chọn nhịp từng nhà → gọi đợt sớm hay ở lại gõ mỏ |
| Vĩ mô | 1 bản đồ: 10–15 phút | Sao → Thư Thành (Sảnh Tướng, Học Viện, Xưởng Bản Vẽ, Cây Chữ) → bản đồ kế |

### 4.2 Một phiên

1. **Ngoài trận:** chọn bản đồ, Tướng, Trợ Thủ mang theo, 2 vật phẩm.
2. **Mở bản đồ:** bay lướt 4–6 s trong engine, bỏ qua được. Tướng nói một câu.
3. **Pha chuẩn bị:** không giới hạn giờ. Xây nhà đầu. Dòng chữ chạy để khởi động: Nhiệt tối đa 2,5, không thưởng, không Chuỗi.
4. **Đợt 1 → đợt cuối.** Xây, nâng, dời người lúc nào cũng được. Đợt cuối của bản đồ boss là boss.
5. **Kết thúc:** sao, Xu, XP Tướng, Tri thức, bản vẽ.
6. **Ôn trận** (tùy chọn, 60–90 s): ôn từ trượt và từ mới. +10 Tri thức, +10 % Xu.

### 4.3 Tải gõ của một bản đồ 12 phút (bot Cân bằng 35 WPM, 95 %)

- 180–280 từ dòng chữ. 10–20 chữ gõ trực tiếp. 2–3 cụm ấn boss (từ bản đồ 3). 5–12 chữ đặc biệt.
- Người chơi **tự đặt tải** bằng số ô và nhịp. Có nút Dừng từng nhà và "Dừng tất cả".
- Game không bao giờ đòi gõ quá sức gõ K (mục 6.13) để thắng ở mức Thường.

---

## 5. Ô trợ lực

### 5.1 Ai giữ ô

| Ô | Nhân vật | Mở bằng |
|---|---|---|
| 1 | Tướng | Luôn có |
| 2 | Trợ Thủ thứ nhất | Lũy Chữ cấp 2 (trong trận) |
| 3 | Trợ Thủ thứ hai | Lũy Chữ cấp 3 (VS) |
| 4 | Trợ Thủ thứ ba | Lũy Chữ cấp 4 (cần Học Viện cấp 5) |

- **Ô thật = min(cấp Lũy, 1 + số Trợ Thủ mang theo).**
- Trợ Thủ có trong tài khoản theo truyện: người thứ nhất ở bản đồ 1, người thứ hai sau boss Thế giới 1, người thứ ba sau boss Thế giới 2.
- **Hộp cát và chế độ Thử thách** cho chơi 3–4 ô ngay (Lũy cấp 3–4, đủ Trợ Thủ). Đây là cách chủ dự án thử cảm giác 1 → 2 → 3 → 4 nhà trước khi có nội dung Thế giới 2.
- Mỗi nhà chỉ một người. Gửi người tới nhà đã có người: hai người **đổi chỗ**.
- Ô không đến từ cấp Tướng. Tướng mới mở không bị thiệt số ô.

### 5.2 Có mặt

- Người đứng ở nhà, kể cả không gõ, cho nhà **+15 %** đầu ra: tốc bắn (tấn công), sản lượng tự chạy (kinh tế), tốc hồi sinh (Trại Lính), hiệu ứng tự chạy (hỗ trợ).
- Trợ Thủ cấp cao: +16 → +20 %. Tướng ở nhà ái lực từ cấp 7: +20 %.
- Có mặt là phần nhỏ. Phần lớn sức mạnh đến từ gõ.

### 5.3 Vì sao nâng Lũy là quyết định thật

- Lũy cấp 2 giá 150 Vàng = 2 Tháp Cung L1.
- Đổi lại: một ô (có mặt +15 %, gõ thêm một nhà, chống trộm ở mỏ, giữ ấm hai nhà cho Hợp Tấu) và trần nhà tấn công +2.
- Người gõ chậm: xây tháp trước, nâng Lũy muộn. Người gõ nhanh: nâng Lũy sớm.
- Kiểm bằng số (mục 6.16): bot 35 WPM với 2 ô (nhịp 4 s + 6 s) cho tổng giá trị **×1,19** so với 1 ô (3 s). Ngay cả khi quá tải (3 s + 6 s, tải 126 %) vẫn **×1,18**. Ô thêm không bao giờ làm yếu đi.

---

## 6. Dòng chữ trợ lực (cơ chế lõi)

### 6.1 Tóm tắt trong 10 dòng

1. Đưa một người (Tướng hoặc Trợ Thủ) tới nhà. Người đó đứng ở ổ trợ lực.
2. Nhà phát từ. Cứ N giây một từ. N do người chơi chọn trong các nhịp nhà đã mở.
3. Từ hiện trên nóc nhà, bay chậm lên khoảng 3 s, mờ dần rồi tan.
4. Gõ chữ đầu là khóa từ đó. Gõ tiếp cho xong.
5. Xong trước khi tan: nhà nhận **phần thưởng từ** ngay. Tháp bắn một Phát Chữ. Mỏ ra vàng. Trại hồi lính.
6. Phần thưởng tính theo độ chuẩn (nặng nhất), độ nhanh kể từ lúc từ hiện, và nhịp đã chọn.
7. Từ tan: nhà mất 1 Nhiệt. Chuỗi bị trừ (−2 nếu chưa chạm, chia đôi nếu đã gõ dở).
8. Nhiệt cao làm nhà mạnh liên tục: tốc bắn, sát thương, sản lượng (hào quang).
9. Chuỗi chung cả trận. Chuỗi cao nới vùng và thêm mục tiêu cho mọi nhà đang được trợ lực.
10. Nhiều nhà, nhịp dày: nhiều từ cùng bay. Khó đọc, khó gõ đủ. Đó là thử thách. Không có trần thưởng.

### 6.2 Nhịp

| Nhịp | Từ mỗi phút | T_N tấn công, lính, hỗ trợ | T_N kinh tế (Mỏ, Ruộng, Gỗ, Lũy) | k_N (hào quang) | Mở khi |
|---|---|---|---|---|---|
| Dừng | 0 | — | — | 0 | Luôn có. Chỉ còn có mặt. |
| 8 s | 7,5 | 0,85 | 0,85 | 0,5 | Chỉ mức Dễ |
| 6 s | 10 | 0,9 | 0,9 | 0,6 | Nhà L1 |
| 4 s | 15 | 1,0 | 1,0 | 0,75 | Nhà L1 |
| 3 s | 20 | 1,1 | 1,0 | 0,85 | Nhà L1 |
| 2 s | 30 | 1,2 | 1,05 | 1,0 | Nhà L2 (Lũy: Lũy cấp 2) |
| 1 s | 60 | 1,35 | 1,1 | 1,0 | Nhà L3 |

- **T_N nhân vào phần thưởng mỗi từ.** Nhịp dày được thưởng cả số từ lẫn giá trị mỗi từ.
- **T_N kinh tế phẳng hơn** để vàng không lăn cầu tuyết theo cấp mỏ.
- **k_N nhân vào Nhiệt khi tính hào quang** (mục 6.10). Nhà phát dày thì "nóng" thật hơn.
- Đài Ấn dùng nhịp cụm riêng: 8 / 6 / 5 s theo cấp. Lũy Chữ và Nhà Thuốc dày nhất 2 s (Lũy mở 2 s ở Lũy cấp 2).
- **Mặc định** nhà mới: 6 s nếu E < 30 WPM, 4 s nếu E ≥ 30. Game nhớ nhịp người chơi chọn lần trước cho từng loại nhà.
- **Đổi nhịp:**
  - chuột: núm nhịp trên vòng menu nhà; lăn chuột trên huy hiệu nhịp;
  - bàn phím: nhà đang tô (Tab) hoặc đang rê chuột: `Minus` chậm hơn, `Equal` dày hơn (cả `NumpadSubtract`, `NumpadAdd`);
  - `Shift+Minus`: **Dừng tất cả**. `Shift+Equal`: trả lại nhịp trước đó cho mọi nhà.
  - Đổi có hiệu lực từ lần phát kế. Bộ đếm phát đặt lại theo nhịp mới. Không có từ tức thì.
- **Gợi ý nhịp:** sau 10 từ ở một nhà, trúng ≥ 95 % và chưa ở nhịp dày nhất: chip "Bạn bắt 95 %. Thử 2 s?". Trúng < 70 %: gợi ý chậm lại. **Game không bao giờ tự đổi nhịp.**

### 6.3 Độ dài từ

Độ dài theo **tốc độ riêng E**, không theo nhịp. Nhịp chỉ cắt trần.

| E (WPM) | Dải độ dài | ℓ̄ đo trên từ vựng cấp 1–5 |
|---|---|---|
| < 25 | 3–5 | 4,1 |
| 25–44 | 3–6 | 4,5 |
| 45–64 | 4–7 | 5,1 |
| ≥ 65 | 4–8 | 5,6 |

- Nhịp 1 s: tối đa 5 chữ. Nhịp 2 s: tối đa 6 chữ.
- Lý do: bản cũ cho nhịp chậm nhất dùng từ dài nhất (5–8 chữ). Người mới học vừa chậm vừa phải gõ từ dài. Nay người chậm luôn có từ ngắn.
- Đài Ấn: cụm 2–4 từ. Gõ trực tiếp: 3–6 chữ. Từ Hiếm, Từ Nhặt, Chữ Chiêu: 3–5 chữ.

### 6.4 Vòng đời một từ

**Vào việc và phát:**
- Người tới ổ, chờ 0,4 s (vào việc). Từ đầu hiện sau 0,6 s nữa. Sau đó cứ N giây một từ.
- Lịch **không trôi**: lần phát thứ k luôn ở mốc gốc + k × N.
- **So le:** hai lần phát (ở mọi nhà) cách nhau ≥ 0,2 s. Trùng thì lần sau lùi 0,2 s, lùi tối đa 0,6 s. Lùi hết 0,6 s mà vẫn trùng thì vẫn phát. Bất biến: "khoảng cách ≥ 0,2 s, trừ khi đã lùi hết 0,6 s". Ở 4 nhà × 1 s (4 từ mỗi giây, khoảng trung bình 0,25 s) luật này đứng được.
- **Trần:** mỗi nhà ≤ 4 từ sống. Dòng chữ toàn bản đồ ≤ trần chữ (mục 6.5). Mọi loại chữ ≤ 16. Đầy thì lần phát chờ, nhà hiện "…". Tới mốc kế mà vẫn đầy thì bỏ lần đó (không tính trượt). Đây là trần để đọc được, **không phải** trần thưởng.

**Tuổi từ:**
```
L_w = clamp(1,2 + 12·(len + 1)/(E·d); 3,0; 6,0) × k_L
k_L: Dễ 1,25 · Thường 1,0 · Khó 0,9 (Khó tối thiểu 2,7 s)
```
- Ví dụ Thường, từ 5 chữ, d = 1: E = 20 → 4,8 s; E = 35 → 3,3 s; E = 60 → 3,0 s. Người gõ trung bình và nhanh thấy "khoảng 3 s". Người mới học có thêm thời gian.
- Hệ số theo loại: Từ Hiếm ×1,3. Từ Ôn ×1,4. Cụm từ dùng cùng công thức với tổng chữ, kẹp 5–12 s. Cụm chốt +1 s.
- **Gia hạn:** từ đang khóa và đã gõ ≥ 50 % được thêm 0,6 s, một lần.
- 0,6 s cuối: viền thẻ chuyển cam, vẫn gõ được.

**Kết thúc:**

| Kết quả | Khi nào | Nhiệt | Chuỗi | Khác |
|---|---|---|---|---|
| Trúng (Chớp, Hoàn hảo, Tốt, Vừa) | Gõ xong trước khi tan | Bảng 6.7 | Bảng 6.8 | Phần thưởng từ, nạp Tối Thượng |
| Ẩu | Gõ xong nhưng quá mức lỗi | −1 | ÷2 | Phần thưởng theo công thức (không nhân phạt thêm) |
| Tan sau khi đã gõ dở | Hết tuổi, đã gõ ≥ 1 chữ | −1 | ÷2 | Vào sổ trượt |
| Tan chưa chạm | Hết tuổi, chưa gõ chữ nào | −1 | −2 | Vào sổ trượt |
| Hủy | Nhà bị phá, bán, Đổ Nát; quái mang chữ chết | 0 | 0 | Không tính trượt |

- Từ nhà phát khi người đã rời đi vẫn sống tới hết tuổi và vẫn gõ được, vẫn tính cho nhà đó.
- **Miễn phạt:** từ tan trong cửa sổ ấn boss, trong Cơn Gấp, trong ân hạn ra lệnh (mục 6.14): không mất Nhiệt, không mất Chuỗi.

### 6.5 Chọn từ và chữ đầu

**Tầng 1 (một chữ cái):**
- Mọi chữ đang sống (dòng chữ, gõ trực tiếp, cụm ấn, chữ đặc biệt) có **chữ đầu khác nhau**.
- Chữ đầu vừa được trả (từ tan hoặc xong) **nghỉ 1,0 s** rồi mới dùng lại.
- Giữ **3 chữ đầu dự trữ** cho chữ ưu tiên cao. Dòng chữ và Từ Ôn không lấy khi chỉ còn ≤ 3 chữ trống.
- Tránh q, x, z, j làm chữ đầu ở cấp từ vựng ≤ 10.

**Trần chữ theo số chữ đầu khả dụng:**
- A = số chữ cái có ≥ 3 từ hợp lệ trong bộ từ hiện tại (cấp từ vựng, dải độ dài).
- **Trần dòng chữ = clamp(A − 6; 4; 12).**
- Đo trên từ vựng thật (`shared/vocabulary/levels`, cộng dồn cấp 1 tới cấp đang học):

| Cấp từ vựng | Dải 3–5 | Dải 3–6 | Dải 4–7 | Dải 4–8 |
|---|---|---|---|---|
| 1 | 122 từ, A = 16 → trần 10 | 140 từ, A = 16 → 10 | 123 từ, A = 15 → 9 | 58 từ, A = 9 → 4 |
| 1–3 | 291 từ, A = 19 → 12 | 362 từ, A = 20 → 12 | 355 từ, A = 21 → 12 | 237 từ, A = 19 → 12 |
| 1–5 | 499 từ, A = 22 → 12 | 626 từ, A = 22 → 12 | 635 từ, A = 23 → 12 | 453 từ, A = 22 → 12 |

- Người ở cấp 1 với E < 45 dùng dải 3–5 hoặc 3–6, nên có trần 10. Dải 4–8 ở cấp 1 chỉ xảy ra khi E ≥ 65 mà cấp từ vựng vẫn là 1: trần 4. Đây là ca hiếm, bot báo riêng.

**Tầng 2 (hai chữ cái, dự phòng):**
- Khi không còn chữ đầu trống. Ở cấp từ vựng ≤ 3, bật sớm hơn: khi còn ≤ 5 chữ trống.
- Cho hai từ chung chữ đầu nếu chữ thứ hai khác nhau, không từ nào là tiền tố của từ kia, và từ cũ chưa bị gõ chữ nào.
- Thẻ gạch chân hai chữ đầu.
- Vẫn không được thì bỏ lần phát. Không tính trượt. Ghi "nghẽn chữ" (analytics).

**Luật phân biệt khác:**
- Không hai từ giống nhau cùng sống.
- Không hai từ sống có khoảng cách sửa chữ (OSA) ≤ 1, ví dụ "form" và "from". Chỉ kiểm từ ≤ 8 chữ.
- Hai từ liền nhau ở cùng một nhà không chung chữ đầu.
- Chữ đầu vẽ đậm, gạch chân, để mắt quét nhanh.

**Thứ tự ưu tiên lấy chữ đầu:** cụm ấn → gõ trực tiếp → Chữ Chiêu → cụm chốt → Từ Nhặt → Ấn Phụ → Từ Hiếm → dòng chữ → Từ Ôn.

**Kế hoạch từ** (mục 21.1): 60 % từ đến hạn ôn, 25 % từ cấp hiện tại, 15 % từ mới.

**Khởi động lạnh (tài khoản mới):**
- Chưa có từ "đã thuộc" (độ thuộc ≥ 2): Từ Hiếm, Từ Nhặt, Chữ Chiêu lấy 50 từ thông dụng đầu danh sách của cấp hiện tại.
- Hàng ôn rỗng: phần 60 % lấy từ cấp hiện tại.
- Từ mới vẫn tối đa 8 mỗi bản đồ, chỉ ở nhịp ≥ 3 s, Đài Ấn, Thư Pháp.

### 6.6 Chấm một từ

```
e        = số phím sai khi đang khóa từ đó (không tính phím lạc, không tính phím đổi khóa mềm)
p(len)   = clamp(1,5 / len; 0,15; 0,40)          // một lỗi nặng bao nhiêu theo độ dài
A_w      = clamp(1 − e · p(len); 0; 1)            // Chuẩn
t_done   = lúc xong − lúc từ hiện (giây, tính bằng tick)
t_type_E = 12·(len + 1)/(E·d)                      // giây để gõ ở tốc kỳ vọng
t_fast   = 0,35 + 0,8·t_type_E
S_w      = clamp((L_w − t_done)/(L_w − t_fast); 0; 1)   // Tốc, đo từ lúc từ hiện
S_eff_w  = S_w · (0,4 + 0,6·A_w)                  // Chuẩn chặn Tốc
Q_w      = 0,6·A_w + 0,4·S_eff_w                  // chất lượng, 0–1
```

**Mức lỗi cho phép:** a(len) = 1 khi len ≤ 11; 2 khi len ≥ 12 (cụm).

| Kết quả | Điều kiện |
|---|---|
| Chớp | e = 0 và S_w ≥ 0,7 |
| Hoàn hảo | e = 0 |
| Tốt | 1 ≤ e ≤ a(len) và len ≥ 6 |
| Vừa | 1 ≤ e ≤ a(len) và len ≤ 5 |
| Ẩu | e > a(len) |

**Ví dụ (đã kiểm bằng script):**

| Độ dài | 0 lỗi | 1 lỗi | 2 lỗi | 3 lỗi |
|---|---|---|---|---|
| 3 | A 1,00 · Hoàn hảo | A 0,60 · Vừa | A 0,20 · Ẩu | A 0 · Ẩu |
| 5 | A 1,00 · Hoàn hảo | A 0,70 · Vừa | A 0,40 · Ẩu | A 0,10 · Ẩu |
| 8 | A 1,00 · Hoàn hảo | A 0,81 · Tốt | A 0,62 · Ẩu | A 0,44 · Ẩu |
| 12 (cụm) | A 1,00 · Hoàn hảo | A 0,85 · Tốt | A 0,70 · Tốt | A 0,55 · Ẩu |

- Một lỗi ở từ ngắn không còn bị xử như cẩu thả. Nhịp dày dùng từ ngắn nên không bị phạt oan.
- Hình hiện **đúng tên kết quả của luật** (mục 23.4). Không có thang riêng ở view.
- **Tốc gõ thuần** (phím đầu tới phím cuối) chỉ dùng cập nhật mức nền B. B không bị kéo xuống vì người chơi bận đọc bản đồ.

**Mức nền B và kỳ vọng E:**
- Lưu theo tài khoản. Lần đầu lấy từ hồ sơ gõ chung (`AdaptiveProfile.smoothedWpm`). Không có: bài thử 30 s. Bỏ bài thử: B = 25.
- Sau bản đồ có ≥ 40 từ tốt: W = trung vị tốc gõ thuần. W > B: B += 0,20·(W − B). W < B: B += 0,08·(W − B). Kẹp 12–140.
- E = max(B, sàn). Sàn: Dễ 12, Thường 20, Khó 35. B chụp lúc vào trận; chạy lại ván ra cùng kết quả.

**Hệ số độ khó từ d:** đã thuộc 1,00 · đang học 0,85 · cụm 0,90 · từ mới 0,70 · nghe rồi gõ, gõ theo nghĩa 0,60.

### 6.7 Nhiệt và Dư âm

Mỗi nhà có Nhiệt h ∈ [0; 5], bước 0,5 (lưu phần nghìn). m = h / 5.

| Sự kiện ở nhà đó | Nhiệt |
|---|---|
| Chớp | +1,5 |
| Hoàn hảo, Tốt | +1 |
| Vừa | +0,5 |
| Ẩu | −1 |
| Tan (đã chạm hay chưa) | −1 |
| Từ Hiếm tan | 0 |

- **Nhiệt không tự giảm** khi người còn đứng và nhà còn phát. Nhịp chậm không thiệt vì khoảng chờ dài.
- **Dư âm** (người rời, Trợ Thủ hoảng, Tướng gục, nhà đặt Dừng): giữ nguyên Nhiệt trong H = 4 + 2·C giây (C là độ đều tay, mục 6.14), rồi giảm 0,25 mỗi giây. Nhà giữ S̄, Ā lúc bắt đầu Dư âm.
- **Nghỉ giữa đợt:** trong lúc chờ đợt kế, nếu người chơi bấm "Dừng tất cả", Nhiệt mọi nhà và Chuỗi **đóng băng**. Nghỉ tay chỉ tốn phần vàng không kiếm thêm.
- Pha chuẩn bị: Nhiệt tối đa 2,5.
- **Trung bình nhà:** S̄_b, Ā_b là trung bình S_w, A_w của 5 từ gần nhất đã xong ở nhà đó. S̄_eff_b = S̄_b·(0,4 + 0,6·Ā_b).

### 6.8 Chuỗi

Một số cho cả trận.

| Sự kiện | Chuỗi |
|---|---|
| Chớp, Hoàn hảo, Tốt ở bất kỳ nhà nào | +1 |
| Cụm từ tốt, Từ Hiếm tốt | +2 |
| Gõ trực tiếp thành công | +1 |
| Ấn boss thành công | +2 |
| Vừa | Giữ nguyên |
| Ẩu | c = floor(c / 2) |
| Tan sau khi đã gõ dở | c = floor(c / 2) |
| Tan chưa chạm | c = max(0; c − 2) |
| Gõ trực tiếp hết giờ, Từ Hiếm tan | Giữ nguyên |
| Cửa sổ ấn, Cơn Gấp, ân hạn ra lệnh, nghỉ giữa đợt | Đóng băng phần trừ |

| Bậc | c | r_c | Tỉ lệ Từ Hiếm | Hình |
|---|---|---|---|---|
| 0 | 0–4 | 0,40 | 4 % | — |
| 1 | 5–9 | 0,55 | 5 % | Vòng Mượt sáng nhẹ |
| 2 | 10–19 | 0,70 | 6 % | Tiếng phím lên một nốt |
| 3 | 20–39 | 0,85 | 7 % | Viền màn hình ấm nhẹ |
| 4 | 40+ | 1,00 | 8 % | Hào quang mảnh trên mọi nhà đang trợ lực |

- **Mốc gọi tên:** 10, 25, 50, 100. Tướng nói một câu, chữ nổi "Chuỗi 25!".
- Lý do đổi so với bản cũ: với 2–4 nhà, vài từ tan là khó tránh. Nếu mỗi lần tan đều chia đôi Chuỗi thì ô thêm làm yếu mọi nhà. Nay bỏ một từ chưa chạm (một lựa chọn chiến thuật) chỉ mất 2.

### 6.9 Kênh Mượt (riêng từng nhà)

```
F_b = min(S̄_eff_b; Ā_b) · r_c
```
- Tính **riêng từng nhà** từ 5 từ gần nhất của nhà đó. Gõ ẩu ở mỏ không làm co vùng của pháo.
- Chuỗi chỉ góp qua r_c.
- Khi Chuỗi đang chặn vùng (r_c ≤ 0,70 trong khi min(S̄_eff_b; Ā_b) ≥ 0,6), vòng Mượt dưới nhà hiện **biểu tượng mắt xích**. Người chơi biết vì sao vòng nhỏ.

### 6.10 Ba kênh và hào quang

Mỗi nhà được trợ lực có **hai lớp**: phần thưởng từ (tức thì, không trần, mục 6.11) và hào quang (liên tục, có trần, mục này).

Hào quang dùng **m_eff = m × k_N** (k_N ở bảng 6.2).

| Kênh | Nghĩa | Nhà tấn công | Nhà kinh tế | Trại Lính |
|---|---|---|---|---|
| Tốc | Gõ nhanh từ lúc từ hiện | Tốc bắn × (1 + 0,5·S̄_eff_b·m_eff), trần ×1,5 | Chu kỳ tự sản × (1 + 0,4·S̄_eff_b·m_eff) | Hồi sinh × (1 − 0,4·S̄_eff_b·m_eff) |
| Chuẩn | Gõ ít lỗi | Sát thương × (1 + 0,4·Ā_b·m_eff), trần ×1,4; chí mạng + 15 %·Ā_b·m_eff | Mỗi lần tự sản × (1 + 0,25·Ā_b·m_eff) | Sát thương, giáp lính + 30 %·Ā_b·m_eff |
| Mượt | Nhanh + chuẩn + Chuỗi | Vùng × (1 + 0,5·F_b·m_eff), trần ×1,5; mục tiêu thêm = floor(0,5 + 2·F_b·m_eff), tối đa +2 | — | F_b·m_eff ≥ 0,6: +1 lính tạm, tiếng hô +10 % tốc đánh |

- Có mặt ×1,15 nhân **ngoài** trần hào quang.
- Đúng ý chủ dự án: gõ nhanh → bắn nhanh; gõ chuẩn → đau hơn, từ hoàn hảo chí mạng; vừa nhanh vừa chuẩn → vùng rộng, trúng nhiều.
- Trần giữ tháp dễ đọc. **Phần thưởng từ thì không trần.**

**Hình trên nhà:** vòng rune dưới chân quay nhanh hơn = Tốc; lõi `FX_core` sáng hơn = Chuẩn; vòng nở đúng bán kính vùng thật = Mượt; 5 đèn lồng = Nhiệt.

### 6.11 Phần thưởng mỗi từ

```
lenF = clamp((len + 1)/6; 0,8; 1,2)      // dùng cho MỌI phần thưởng
qA   = 0,4 + 0,6·A_w
qS   = 0,8 + 0,4·S_w
qQ   = 0,5 + 0,5·Q_w
```

| Nhà | Mỗi từ xong | Số theo cấp L1 / L2 / L3 |
|---|---|---|
| Tháp Cung | **Phát Chữ** "Tên Chữ": D̄ × (0,8 + 1,2·Q_w) × T_N × lenF. Xuyên thêm 1. | D̄ = 7,5 / 11 / 15,5 |
| Tháp Pháo | **Phát Chữ** "Đạn Chữ": như trên. Vùng nổ ×1,15. | D̄ = 13 / 21 / 32 |
| Tháp Thư Pháp (VS) | **Phát Chữ** "Nét Chữ": như trên. Xuyên thêm 1 theo đường thẳng. | D̄ = 15 / 24 / 36 |
| Trại Lính | Lính chết lâu nhất về sớm 3 s × qQ × T_N × lenF. Không ai chết: mọi lính của trại hồi 8 % máu × qQ × T_N × lenF. | Như nhau |
| Mỏ Vàng | Vàng = G × lenF × qA × qS × T_N × độ giàu | G = 2,0 / 2,4 / 2,8 |
| Ruộng Lúa | Lúa = R × lenF × qA × qS × T_N × độ màu | R = 0,5 / 0,6 / 0,7 |
| Trại Gỗ (VS) | Gỗ = W × lenF × qA × qS × T_N × độ giàu | W = 0,4 / 0,5 / 0,6 |
| Đài Ấn (mỗi cụm) | Tối Thượng +8 × Q_w × T_N. Phép Chỉ huy hồi nhanh 2 s. Một Sóng Chữ nổ ngay. | Sóng theo cấp |
| Nhà Thuốc (VS) | Một nhịp hồi H × qQ × T_N × lenF cho đồng minh trong tầm | H = 10 / 14 / 18 |
| Lũy Chữ | 1,5 Vàng × qA × T_N × lenF, và nỏ bắn thêm 1 phát | Nỏ theo cấp Lũy |
| Nhà Đổ Nát | Từ sửa: +12 % máu tối đa × (0,5 + 0,5·A_w). Tre: 16 %. | — |

- **Phát Chữ từ một từ Hoàn hảo hoặc Chớp luôn chí mạng** (×1,75). Không lấy RNG.
- Phát Chữ bắn ngay, không chờ nhịp bắn của tháp, không làm trễ phát thường.
- Không có quái trong tầm: Phát Chữ bay lên thành **pháo hoa nhỏ** (`fizzle`). Từ vẫn tính Nhiệt, Chuỗi. Không giữ đạn chờ.
- Trong Bùng Nổ của nhà đó: phần thưởng ×1,25.
- Sở trường Trợ Thủ (+10 → +22 %) và ái lực Tướng (+5 % ở bậc 2) nhân thêm.
- Ẩu **không** có hệ số phạt riêng. Công thức đã cho từ ẩu khoảng 40–60 % (A_w thấp).
- Tiền, Lúa, Gỗ tính phần nghìn. Trả phần nguyên, giữ phần lẻ.

**Năm từ tốt liền ở cùng một nhà** (đếm riêng, reset khi Ẩu hoặc tan ở nhà đó):

| Nhà | Thưởng |
|---|---|
| Mỏ Vàng | Cục Vàng +5 × độ giàu |
| Ruộng Lúa | Bội Thu +3 Lúa |
| Trại Gỗ | Cây Đổ +3 Gỗ |
| Trại Lính | Đủ Đội: +1 lính tạm 15 s (tối đa 2 mỗi trại) |
| Nhà Thuốc | Hồi mạnh: nhịp hồi kế ×2 |
| Tháp | Không có. Mượt và Chuỗi lo phần nhiều mục tiêu. |

### 6.12 Bùng Nổ và Hợp Tấu

**Bùng Nổ (từng nhà):**
1. Nhiệt 5 và Chuỗi ≥ 8, không nghỉ lò → lần phát kế là **cụm chốt**: 2 từ, viền riêng, tuổi theo công thức cụm + 1 s.
2. Gõ xong: không quá 1 lỗi mỗi từ → Bùng Nổ 6 s + 2 s × F_b. Nhiều lỗi hơn → Bùng Nổ yếu 3 s. Không có thất bại.
3. Cụm chốt tan: Nhiệt −1, không Bùng Nổ.
4. Trong Bùng Nổ: hiệu ứng riêng của nhà (mục 11). Dòng chữ vẫn chạy. Phần thưởng ×1,25.
5. Hết Bùng Nổ: Nhiệt về 2. **Nghỉ lò 20 s:** Nhiệt tối đa 3, không ra cụm chốt. Muốn Bùng Nổ tiếp thì dời người sang nhà khác.

**Hợp Tấu (VS):**
- Một nhà bắt đầu Bùng Nổ khi nhà khác đang Bùng Nổ → cả hai thêm 2 s (mỗi lần Bùng Nổ một lần).
- Ba nhà cùng Bùng Nổ (Đại Hợp Tấu): mỗi nhà thêm 3 s, lính trong 12 m hồi 20 %, Tối Thượng +5.
- **Sợi chỉ Chuỗi** (chỉ là hình, không có luật): từ trúng ở nhà khác nhà của từ trước → một sợi chỉ sáng ngắn nối hai nhà.

### 6.13 Tải và sức gõ

```
K = 0,75 · E · 5 / (ℓ̄ + 1)     // từ mỗi phút gõ được khi vẫn nhìn bản đồ
W = Σ 60 / N_i                  // từ mỗi phút các nhà đang phát
Tải = W / K
```

| E (WPM) | ℓ̄ | K (từ/phút) | Cách chia gợi ý (tải ≤ ~100 %) |
|---|---|---|---|
| 20 | 4,1 | 14,7 | 1 nhà 6 s (68 %). Ô 2 để có mặt. |
| 25 | 4,5 | 17,0 | 1 nhà 4 s (88 %), hoặc 1 nhà 6 s + có mặt |
| 35 | 4,5 | 23,9 | 1 nhà 3 s (84 %), hoặc 2 nhà 6 s (84 %) |
| 50 | 5,1 | 30,7 | 2 nhà 4 s, hoặc 1 nhà 2 s, hoặc 3 s + 6 s, hoặc 3 nhà 6 s (đều 98 %) |
| 70 | 5,6 | 39,8 | 2 nhà 3 s, hoặc 2 s + 6 s, hoặc 4 s + 4 s + 6 s, hoặc 4 nhà 6 s (đều ~100 %) |
| 100 | 5,6 | 56,8 | 2 s + 4 s + 6 s (97 %), hoặc 3 nhà 4 s + 1 nhà 6 s (97 %) |

- Ô 2 dùng thật từ ~35 WPM. Ô 3 từ ~50 WPM. Ô 4 từ ~70 WPM. Người chậm hơn vẫn có lợi: có mặt +15 %, chống trộm, đổi chú ý tức thì thay vì chờ người đi bộ.
- **Chip Tải** cạnh thanh trợ lực: "Tải 85 %". Xanh ngọc ≤ 100 %, hổ phách 100–125 %, cam > 125 %. Không dùng đỏ (đỏ dành cho địch).
- Rê chuột vào chip: danh sách nhà và nhịp, nút "Giảm tải" (đặt nhà có giá trị thấp nhất về Dừng).

### 6.14 Lỗi, ân hạn ra lệnh, nghỉ tay

**Lỗi:**
- Phím sai: chữ rung 0,15 s, nền chữ kế tiếp hồng nhạt (chỉ trong thẻ), tiếng "tóc" nhỏ hơn 12 dB. Không còi.
- Không reset gì. Không có phạt ngoài bảng Nhiệt và Chuỗi.
- Sai 3 lần trong một từ: chữ kế tiếp sáng lên. Từ mới hiện lại nghĩa.
- **Độ đều tay C:** CV = độ lệch chuẩn / trung bình của 30 khoảng phím gần nhất. C = clamp((0,7 − CV)/0,4; 0; 1). Dùng cho thời gian giữ Dư âm, thống kê, chống macro.

**Ân hạn ra lệnh:**
- Mỗi lần ra lệnh bằng chuột lấy tay khỏi bàn phím. Vì vậy: khi vòng menu nhà, menu xây, hoặc con trỏ chọn đích (Tối Thượng, phép, vật phẩm) đang mở, **từ tan không bị phạt** (không mất Nhiệt, không trừ Chuỗi).
- Tối đa 2 s mỗi lần mở. Mở lại trong 3 s sau đó không được thêm ân hạn.
- Là lệnh có tick (`uiFocus`), nên vẫn tất định.
- Mọi việc trong đợt có **đường bàn phím** (mục 8.3). Kịch bản kiểm một bản đồ chơi chỉ bằng bàn phím.

**Nghỉ tay:**
- `Shift+Minus` "Dừng tất cả". Giữa hai đợt: Nhiệt và Chuỗi đóng băng (mục 6.7). Trong đợt: Dư âm như thường.
- Đợt thở không có Cơn Gấp (mục 18.6).
- Trước boss có 12 s không phát chữ, Nhiệt và Chuỗi đóng băng.
- Nhắc nghỉ sau 30 phút chơi liên tục (20 phút với hồ sơ trẻ em). Tắt được.

### 6.15 Bộ định tuyến phím

Chạy thuần trong `typing/router.ts`, trong mô phỏng (phím là lệnh có tick).

1. **Có từ đang khóa:**
   - đúng chữ kế: tiến một chữ; xong thì chấm, nhả khóa;
   - **đổi khóa mềm:** từ đang khóa mới gõ đúng đúng 1 chữ, phím sai lại là chữ đầu của chữ khác đang sống → khóa chuyển sang chữ kia (tiến 1). Từ cũ về chưa gõ, không bị tính lỗi. Phím này tính một lỗi vào độ chính xác chung;
   - ngược lại: lỗi trên từ đó (rung, không tiến, không xóa tiến độ).
2. **Không khóa:**
   - phím trùng chữ đầu tầng 1 → khóa từ đó;
   - phím trùng chữ đầu của cặp tầng 2 → mở nhóm; phím thứ hai chọn từ; không khớp thì tính lỗi cho từ cũ hơn;
   - không trùng gì → **phím lạc**: tiếng "tóc" rất nhỏ, tính vào độ chính xác chung.
3. **Backspace:** xóa một chữ của từ đang khóa (lỗi đã gõ vẫn tính). Về 0 thì nhả khóa. Không bao giờ bán nhà.
4. **Esc:** nhả khóa → đóng menu → bỏ chọn (về Tướng) → menu dừng.
5. **Space:** nuốt, không làm gì.
- Lớp đầu vào giữ luật `keys.ts`: bỏ phím IME (`isComposingKey`), bỏ phím giữ lặp, bỏ phím có Ctrl / Alt / Meta, bỏ `event.isTrusted === false`.
- Khóa **không dừng** đồng hồ của từ.

### 6.16 Kiểm tra số

Script mô hình: người chơi theo hồ sơ (WPM, độ chuẩn mỗi phím), tỉ lệ trúng theo tải và sức gõ, Nhiệt và Chuỗi mô phỏng 3.000–4.000 từ. Bot thật (`pnpm td:balance`) thay từ 1A.

**Hồ sơ "Gõ đều" (bot Cân bằng 35 WPM, 95 %) ở nhịp 3 s:** trúng 92 %, A 0,93, S 0,50, S̄_eff 0,48, Q 0,75, m 0,97, r_c 0,79, F 0,38, 79 % từ Hoàn hảo.

**Tháp Cung, DPS một mục tiêu** (gốc L1 9,0; L2 14,8; L3 23,8, đã gồm chí mạng thường):

| Hồ sơ | L1 6 s | L1 4 s | L1 3 s | L2 2 s | L3 1 s |
|---|---|---|---|---|---|
| Mới học 20 WPM, 97 % | 18,6 (tải 68 %) | 19,3 (102 %) | 19,5 (136 %) | 28,1 (204 %) | 40,2 (408 %) |
| Cẩn thận 25, 98 % | 19,0 | 21,6 (88 %) | 22,5 (117 %) | 32,4 | 44,1 |
| Gõ đều 35, 95 % | 18,5 | 22,1 | **24,2** (84 %) | 38,9 (126 %) | 50,8 (233 %) |
| Chuẩn 35, 98 % | 19,0 | 22,7 | 24,9 | 40,3 | 52,4 |
| Nhanh ẩu 50, 85 % | 16,5 | 19,4 | 21,9 | 39,8 (96 %) | 53,3 |
| Khá 50, 96 % | 18,9 | 22,7 | 26,3 | 48,6 | 63,1 |
| Giỏi 70, 98 % | 19,4 | 23,4 | 27,2 | 52,8 (69 %) | **83,9** (126 %) |
| Ẩu nhanh 80, 85 % | 16,5 | 19,3 | 21,8 | 42,5 | 70,2 |

Kết luận:
- Có người gõ đều thì tháp mạnh ×2,1–3,5 so với không ai.
- **Chuẩn thắng ẩu:** 35 WPM 98 % ≥ 50 WPM 85 % ở cùng nhịp. 50 WPM 96 % > 80 WPM 85 %.
- **Quá tải không lời:** người 35 WPM ở L3 nhịp 1 s (tải 233 %) yếu hơn nhịp 3 s (60,2). Luật ngón tay cái: **chọn nhịp dày nhất mà bạn vẫn bắt ≥ 85 % số từ.**
- Người giỏi ở nhịp dày rất mạnh, nhưng dồn toàn bộ sức gõ vào một nhà. Dồn hay chia là chiến thuật.

**Giá trị ô thêm** (35 WPM, Tháp Cung L1 + Mỏ L1; sát thương quy 0,05 Vàng mỗi máu, 60 % thời gian có quái):

| Cách chơi | Tải | Giá trị mỗi phút | So với 1 ô |
|---|---|---|---|
| 1 ô: Tướng ở tháp 3 s, mỏ không người | 84 % | 65,8 | ×1,00 |
| 2 ô: tháp 4 s + Thư Đồng ở mỏ 6 s | 105 % | 78,0 | ×1,19 |
| 2 ô quá tải: tháp 3 s + mỏ 6 s | 126 % | 77,7 | ×1,18 |
| 2 ô, Thư Đồng chỉ có mặt ở mỏ | 84 % | 69,2 | ×1,05 |

- Cổng bot (mục 19.7): ô thêm ở tải hợp lý ≥ ×1,15; ô thêm khi quá tải 120 % không yếu hơn 1 ô.

---

## 7. Các hệ gõ vui

Chủ dự án muốn càng gõ càng vui. Dưới đây là quyết định. Không cần chờ duyệt.

### 7.1 Bảng quyết định

| Hệ | Quyết định | Pha | Vì sao |
|---|---|---|---|
| Chuỗi và mốc chuỗi | Làm | 1A | Lõi của kênh Mượt. Thưởng người gõ đều qua nhiều nhà. |
| Cụm chốt, Bùng Nổ | Làm | 1B | Cao trào ngắn ở từng nhà |
| Từ Vàng | Làm | 1B | Khoảnh khắc "trúng thưởng". Không phạt khi trượt. |
| Từ Ôn (sổ trượt) | Làm | 1B | Học lại chữ vừa trượt ngay trong trận |
| Nghĩa tiếng Việt dưới từ mới | Làm | 1B | Học nghĩa khi gõ |
| Nghe rồi gõ ở Đài Ấn | Làm | 1B | Đã có giọng đọc (`src/speech.ts`) |
| Chữ Chiêu cho Tối Thượng | Làm | 1B | Tối Thượng là đỉnh cao gõ phím của Tướng |
| Từ Nhặt cho túi | Làm | 1B | Nhặt đồ bằng gõ, không cần đi bộ |
| Hợp Tấu | Làm | VS | Thưởng việc giữ ấm nhiều nhà |
| Từ Sao, Từ Lá | Làm | VS | Thêm lựa chọn: Tối Thượng hay sửa nhà |
| Cơn Gấp | Làm | VS | Lý do dời người. Cao trào 12 s. |
| Ấn Phụ cho Phép Chỉ huy | Làm | VS | Phép mạnh hơn nếu gõ, không bao giờ chậm lại |
| Gõ theo nghĩa ở Đài Ấn | Làm | VS | Nhớ lại từ, không chỉ chép |
| Heo Đất Vàng | Làm | VS | Vui, trẻ em thích, một lần mỗi bản đồ |
| Huy chương chữ | Làm | VS | Mục tiêu phụ, không thêm sức mạnh |
| Sợi chỉ Chuỗi (hình) | Làm | 1C | Thấy mình đang "chạy" giữa các nhà. Không có luật riêng. |
| Đèn Trời, Trống Hội, Cơn Lốc Chữ | Để sau | — | Chồng lên Cơn Gấp. Xem lại sau VS. |
| Lóng ngóng khi lỡ chữ, nhà "nghỉ" khi vắng quái | Bỏ | — | Thêm phạt và thêm trạng thái không cần |
| Từ Nối (một từ cho hai nhà) | Để sau | — | Khó đọc, phá luật "một từ một nhà" |
| Quái phá phím, đảo chữ, giấu chữ | Bỏ | — | Phạt người học, rối mắt |
| Trợ Thủ tự gõ hộ | Bỏ | — | Mất lý do gõ |
| Câu dài, ngữ pháp trong trận | Bỏ | — | Để ngoài trận |
| Phím tắt bằng chữ cái | Bỏ | — | Đụng Telex, UniKey |

### 7.2 Từ Hiếm

- Mỗi lần phát: xác suất 4 % + 1 % × bậc Chuỗi (tối đa 8 %). Tối đa 1 sống. Không ra trong cửa sổ ấn, Cơn Gấp.
- Lấy từ đã thuộc (khởi động lạnh: mục 6.5). Tuổi ×1,3. Trượt không phạt.

| Loại | Tỉ lệ | Khi gõ xong |
|---|---|---|
| Từ Vàng | 50 % (bản thử: 100 %) | Phần thưởng ×3 ở nhà đó, +3 Vàng. Ở tháp: Phát Chữ xuyên mọi quái trên đường thẳng 12 m. |
| Từ Sao (VS) | 30 % | Tối Thượng +10 |
| Từ Lá (VS) | 20 % | Nhà hồi 15 % máu, lính trong 10 m hồi 25 %. Không nhà nào mất máu thì đổi thành Từ Vàng. |

### 7.3 Cơn Gấp (VS)

| Tên | Nhà | Kích hoạt |
|---|---|---|
| Giờ Vàng | Mỏ Vàng | Theo kịch bản đợt |
| Mùa Gặt | Ruộng Lúa | Theo kịch bản đợt |
| Gỗ Trôi | Trại Gỗ | Theo kịch bản đợt |
| Trống Trận | Trại Lính | Nhóm quái lớn sắp tới điểm tập kết |
| Hỏa Lực | Tháp | ≥ 12 quái trong tầm |

- 2–4 lần mỗi bản đồ, tối đa 1 lần trong 2 đợt. Không trong pha boss, **không trong đợt thở**.
- Báo trước 4 s. Dài 12 s. Chỉ có tác dụng khi có người ở nhà đó.
- Nhịp 1 s (Dễ 2 s), từ 3–5 chữ. Thưởng ×1,5 thay T_N. Từ tan không mất Nhiệt, không mất Chuỗi.
- Trúng ≥ 70 %: "Gấp Đạt": Mỏ +20 Vàng × độ giàu; Ruộng +6 Lúa; Trại Gỗ +6 Gỗ; Trại Lính 2 lính tạm 15 s; Tháp Bùng Nổ 4 s (không tính nghỉ lò).

### 7.4 Từ Ôn

- Từ tan hoặc Ẩu vào sổ trượt. 25–45 s sau, quay lại ở một nhà đang được trợ lực, ưu tiên cùng nhóm nhà.
- Thẻ xanh "Ôn", hiện nghĩa tiếng Việt. Tuổi ×1,4, d = 0,85.
- Gõ không lỗi hoặc Tốt: "Chuộc lại", thưởng ×1,2 (Học Viện cấp 2: ×1,3).
- Tối đa 1 sống, 1 lần mỗi 10 s, ≤ 25 % số lần phát. Mỗi từ quay lại tối đa 2 lần mỗi trận.

### 7.5 Ấn Phụ (VS)

- Phép Chỉ huy **nổ ngay** đủ sức. Sau đó một cụm 2 từ hiện ở điểm thả, 4 s (giãn theo E như tuổi từ).
- Gõ xong: đợt hai = 50 % hiệu ứng thêm (Mưa Đá Lửa +2 khối; Viện Binh +1 lính, +6 s). Không gõ: không mất gì.

### 7.6 Chữ Chiêu (1B)

- Alt+1 (hoặc nút), chọn vùng. Tối Thượng **nổ ngay** ở mức gốc.
- Trong 2,5 s sau, 3 từ ngắn (3–5 chữ, đã thuộc) hiện lần lượt quanh vùng, cách nhau 0,6 s, mỗi từ sống 3 s.
- Mỗi từ xong: +20 % hiệu ứng. Tướng cấp 5: từ thứ tư.
- Draconis: mỗi từ +3 lông lửa. Lam: lao thêm 5 m. Tre: +10 % hồi máu, buff dài thêm 2 s.

### 7.7 Từ Nhặt (1B)

- Túi rơi có một từ 3–5 chữ (đã thuộc), sống 6 s. Gõ xong thì nhận đủ. Chi tiết ở mục 17.4.

### 7.8 Heo Đất Vàng (VS, từ bản đồ 2)

- Một lần mỗi bản đồ, ở quãng lặng. Heo chạy dọc một làn 10 s, mang một từ 4–6 chữ.
- Gõ xong: vỡ, 30 Vàng × hệ số bản đồ. Tháp bắn vỡ (120 máu): 10 Vàng. Không lọt, không trừ mạng.

### 7.9 Huy chương chữ (VS)

Chỉ cho huy chương và Xu nhỏ, không thêm sức mạnh. Ví dụ: "Không tan từ nào trong đợt 3", "Chuỗi 50", "Gõ mọi Từ Vàng", "Hợp Tấu 3 lần", "Chuộc lại mọi Từ Ôn".

---

## 8. Tướng và Trợ Thủ

### 8.1 Vai

- **Tướng** giữ ô 1 **và** là chiến binh.
  - Rảnh: tự đánh quái trong tầm, tự dùng 2 kỹ năng thường, hút Mảnh Chữ trong vòng hút.
  - Trợ lực: đứng ở ổ, không tấn công; chỉ đánh trả quái cận chiến đang đánh mình (50 % sát thương). Vẫn hút Mảnh Chữ, nhưng chỉ quái chết **trong vòng hút quanh chỗ Tướng đứng**.
- **Trợ Thủ** chỉ trợ lực. Không đánh, không chặn, không máu.
- Có từ 2 ô: câu hỏi chiến thuật **"Tướng ra trận hay Tướng trợ lực?"**
  - Ra trận: chặn đường, đánh quái bay, hút nhiều Mảnh Chữ, nạp Tối Thượng nhanh.
  - Trợ lực: nạp bằng từ gõ, nhà mạnh hơn.
  - Đứng gần Đài Ấn: sẵn sàng ấn boss.
- Sức Tướng khi đánh nhắm khoảng 1–1,5 tháp cấp 2. Tháp vẫn là xương sống.

### 8.2 Di chuyển

| Kiểu | Tốc | Đặc điểm | Ai |
|---|---|---|---|
| Bộ | 4,5 m/s | A* trên lưới 1 m. Chặn được quái. | Tre |
| Bộ nhanh | 6,5 m/s | Tự lướt 8 m khi đường còn > 10 m, hồi 6 s. Chặn được quái. | Lam |
| Bay | 6,0 m/s | Đi thẳng. Cất, hạ cánh mỗi lần 0,6 s. Không chặn. Quái cận chiến không đánh được khi đang bay. | Draconis |
| Trợ Thủ | 4,0 → 4,8 m/s | A* như Bộ. Không chặn, không đánh. | Mọi Trợ Thủ |
| Dịch chuyển | — | Sau MVP | — |

- Khoảng cách giữa các nhà quan trọng 15–35 m: đi 3–8 s.
- Lối tắt: không có ở bản đồ 1–2. Từ bản đồ 3 tối đa 2, mỗi lối có giá (một chiều, hồi 15 s, hoặc theo sự kiện). Tre bắc Cầu Tre cho mọi người đi bộ.

### 8.3 Điều khiển

**Chuột:**

| Thao tác | Việc |
|---|---|
| Trái vào nhà | Chọn nhà, mở vòng menu (nâng, nhánh, nhịp, tập kết, gửi người, bán) |
| Trái vào chân dung hoặc nhân vật | Chọn người đó |
| **Phải (không kéo, < 6 px) vào nhà** | Người đang chọn tới trợ lực nhà đó |
| **Shift + phải vào nhà** | Gửi Trợ Thủ rảnh gần nhất (không ai rảnh thì Trợ Thủ gần nhất) |
| **Kéo chân dung thả lên nhà** | Gửi đúng người đó |
| Phải vào đất hoặc quái | Tướng đi tới, đánh, chặn. Trợ Thủ tới đứng chờ. |
| Kéo chuột phải | Xoay, nâng camera |
| Lăn chuột trên huy hiệu nhịp | Đổi nhịp |

- Người đang chọn **không đổi** sau lệnh. Mặc định là Tướng.
- Rê chuột lên nhà khi đã chọn người: đường đi nét đứt, chip ETA "2,8 s", một dòng tác dụng ("Gõ ở đây: Phát Chữ, bắn nhanh hơn").

**Bàn phím (không dùng chữ cái; mọi phím đổi được):**

| Phím (`event.code`) | Việc |
|---|---|
| a–z | Chỉ để gõ |
| `Digit1`–`Digit4` | Chọn người: 1 Tướng, 2–4 Trợ Thủ |
| `Backquote` | Chọn người kế tiếp theo vòng (an toàn cả khi bật VNI) |
| `Tab` / `Shift+Tab` | Tô nhà kế tiếp: theo tín hiệu cần giúp, rồi theo khoảng cách |
| `Enter` | Người đang chọn tới nhà đang tô |
| `Digit0` | Người đang chọn về Lũy |
| `Minus` / `Equal` | Nhịp chậm / dày hơn cho nhà đang tô hoặc đang rê |
| `Shift+Minus` / `Shift+Equal` | Dừng tất cả / trả lại nhịp |
| `PageUp` (bấm 2 lần) | Nâng cấp nhà đang tô |
| `Delete` (bấm 2 lần) | Bán nhà đang tô |
| `Insert` | Mở menu xây ở chỗ trống gợi ý kế tiếp (Tab đổi chỗ, số chọn nhà, Enter xây) |
| `Shift+Enter` | Gọi đợt sớm |
| Phím lệnh + `1` | Tối Thượng. Đích mặc định: vùng nhà đang tô, không có thì cụm quái đông nhất trong khung nhìn. Enter xác nhận, Esc hủy. |
| Phím lệnh + `2` / `3` | Phép Chỉ huy A / B (đích như trên) |
| Phím lệnh + `4` / `5` | Vật phẩm, bùa ô 1 / ô 2 |
| `Backspace` | Xóa một chữ của từ đang khóa. Không bao giờ bán nhà. |
| `Esc` | Nhả khóa → đóng menu → bỏ chọn (về Tướng) → menu dừng |
| `Space` | Nuốt |
| Mũi tên, Shift + mũi tên, F1–F3 | Camera |
| F4 | Bám theo người đang chọn |
| `Pause` | Tạm dừng |

- **Phím lệnh** mặc định: Alt trên Windows và macOS. Trên Linux mặc định Shift (Alt + số chuyển tab ở Chrome, Firefox Linux). Game phát hiện Linux và gợi ý. Đổi được trong cài đặt.
- Mọi việc có **nút bấm chuột** tương ứng.
- UniKey kiểu VNI có thể nuốt số gõ sau nguyên âm. Đường luôn an toàn: chuột, `Backquote`, Tab + Enter.
- Trợ năng "Chậm khi ra lệnh": khi đang kéo chân dung, mô phỏng chạy 0,5×. Bật sẵn ở mức Dễ. Ở Thường, Khó: ván không vào bảng xếp hạng.

### 8.4 Ổ trợ lực

- Mỗi nhà có một ổ trên mép vòng chiếm chỗ, quay về phía Lũy (socket `FX_assist`).
- Tới ổ thì dừng. Trợ lực bật sau 0,4 s (Trợ Thủ cấp 4: 0,2 s).
- Trong 3,0 m tính từ mép vòng là còn trợ lực. Ra quá 4,5 m thì ngắt.
- Bị đẩy, bị choáng trong vùng: ngừng phát từ mới, không ngắt. Từ đang sống vẫn gõ được.
- Draconis đậu mái khi trợ lực. Trợ Thủ đứng cạnh tổ thợ, làm động tác theo nhóm nhà.

### 8.5 Chi phí cơ hội của Tướng khi trợ lực

- Không tấn công, không đuổi trộm. Tướng bộ vẫn chặn quái đi qua ổ.
- Chỉ hút Mảnh Chữ của quái chết trong vòng hút quanh chỗ đứng.
- Quái Săn (Thế giới 2) ưu tiên Tướng đang đứng yên trợ lực.
- Kỹ năng thường vẫn hồi, không tự dùng khi đang trợ lực.

### 8.6 Kỹ năng và Tối Thượng

Mỗi Tướng có: 1 đòn thường (tự động); 2 kỹ năng thường (tự dùng khi có mục tiêu hợp lệ, hồi 9–18 s); 1 nội tại ái lực (gắn nhóm nhà); 1 Tối Thượng bấm tay, có Chữ Chiêu.

**Nạp Tối Thượng (0–100):**

| Nguồn | Điểm |
|---|---|
| Mỗi từ dòng chữ trúng (mọi nhà) | +1,2 × (0,5 + 0,5·Q_w) |
| Từ Sao | +10 |
| Cụm ở Đài Ấn | +8 × Q_w × T_N |
| Gõ trực tiếp thành công | +3 |
| Mảnh Chữ hút về Tướng | +0,6 mỗi mảnh |
| Tướng trong 7 m quanh Đài Ấn | +0,5 mỗi giây |
| Thời gian trong đợt | +0,3 mỗi giây |
| Đại Hợp Tấu | +5 |

- Hồi tối thiểu 45 s. Người không gõ: 170–250 s một lần. Người gõ đều 35 WPM: 100–120 s. Người nhanh: chạm 45 s.
- Giữ điểm khi Tướng gục.

### 8.7 Gục và hồi sinh

- Hết máu: nằm 1 s, tan, hồi sinh ở Lũy. Draconis 20 s, Lam 14 s, Tre 12 s. Nhà Thuốc trong 15 m: nhanh hơn 30 %.
- Hồi 3 % máu mỗi giây sau 4 s không bị đánh.
- Gục khi đang trợ lực: nhà sang Dư âm. Ô 1 trống tới khi hồi sinh.

### 8.8 Trợ Thủ

- **Đi bộ** A*, 4,0 m/s (cấp 5: 4,8). Không đánh, không chặn, **không máu**.
- Quái thường bỏ qua Trợ Thủ.
- Đòn boss trúng chỗ đứng, hoặc quái Săn (Thế giới 2) đi qua: Trợ Thủ **hoảng**: chạy về Lũy, đứng 5 s (cấp 3: 2,5 s), rồi chạy lệnh đang chờ. Nhà sang Dư âm.
- Mỗi Trợ Thủ có một **sở trường**: +10 % phần thưởng từ ở một nhóm nhà (cấp 5: +22 %).

| Sở trường | Nhóm nhà |
|---|---|
| Xạ | Tháp Cung, Tháp Pháo, Tháp Thư Pháp |
| Trống | Trại Lính, Lũy Chữ |
| Thợ | Mỏ Vàng, Ruộng Lúa, Trại Gỗ, sửa nhà |
| Lang | Nhà Thuốc, Đài Ấn |

- Gói sản xuất mỗi Trợ Thủ (nhỏ, rẻ): một model chibi chung khung xương, bộ gắn riêng; clip ở mục 23.9; 6 câu thoại; một màu dây.

### 8.9 Tín hiệu cần giúp

Biểu tượng nhỏ trên nhà, ghim mép khi khuất. Tối đa 3 trên màn hình. Tab duyệt nhà theo đúng thứ tự này.

| Ưu tiên | Tín hiệu | Khi nào |
|---|---|---|
| 1 | Bị đánh | Nhà mất máu trong 2 s gần nhất |
| 1 | Có trộm | Quái trộm trong 10 m |
| 2 | Cơn Gấp sắp tới | 4 s trước Cơn Gấp |
| 2 | Đổ Nát | Nhà về 0 máu |
| 3 | Sẵn cụm chốt | Nhiệt 5, Chuỗi ≥ 8, hết nghỉ lò, không người |
| 4 | Nhà nguội | Nhà đang trợ lực mà Nhiệt giảm 2 lần liền vì từ tan |
| 5 | Kho đầy | Đống vàng ở mỏ ≥ 80 % |

---

## 9. Gõ trực tiếp

### 9.1 Nguyên tắc

- Chỉ một số quái có thành phần `DirectTypingInteraction`. Quái thường không có chữ.
- Chữ chỉ hiện khi cơ chế bắt đầu (bắt đầu niệm, dựng khiên, vừa cướp…).
- Gõ được từ bất cứ đâu, kể cả khi Tướng đang đi.
- Không chém chết ngay. Không sát thương thô (trừ đòn kết boss tùy chọn).
- Chiếm 5–10 % số chữ gõ.

### 9.2 Sáu động từ Thế giới 1

| Động từ | Quái | Kích hoạt | Thành công | Thất bại | Dạy ở |
|---|---|---|---|---|---|
| Ngắt | Lửng Tanuki | Bắt đầu Trống Bụng Lớn | Hủy chiêu, choáng 2 s, rơi Lá Tanuki +5 Vàng | Hồi máu bầy | Bản đồ 1, đợt 5 |
| Neo | Cương Thi Đầu Đàn | Bầy ≥ 4 con, cách nhà < 20 m | Bầy trong 6 m đứng sững 3 s; Đầu Đàn +30 % sát thương nhận 6 s | Bầy đi tiếp | Bản đồ 2 |
| Phá Khiên | Quỷ Núi Troll | Dựng Vòm Đá | Vòm vỡ, choáng 1,5 s, không dựng lại 10 s | Vòm giữ | Bản đồ 2 |
| Bắt | Chim Vàng Alicanto | Vừa cướp xong | Vàng về đống cũ hoặc HUD, chim rơi 2 s | Bay đi với vàng | Bản đồ 3 |
| Hiện Hình | Ma Da | Tới gần nhà hoặc Lũy 12 m | Lộ mọi Ma Da trong 8 m trong 8 s, chậm 30 % | Vẫn tàng hình | Bản đồ 3 |
| Phong Gậy | Dokkaebi | Chuẩn bị gõ gậy | Khóa gậy, +15 Vàng | Gọi Ma Trơi | Bản đồ 3 |

- Trước khi dạy động từ, quái đó vẫn có cơ chế nhưng **không mở cửa sổ gõ**.

### 9.3 Thời gian và nhường nhịp

```
T = clamp(0,8 + k·(len + 1)·12/E; 3; 7) giây      k: Dễ 2,8 · Thường 2,2 · Khó 1,6
```
- Ví dụ: 6 chữ, E = 35, Thường → 6,1 s.
- Khi một cửa sổ mở, mọi nhà đang phát **lùi lần phát kế 1,0 s** (nhường nhịp).
- Tối đa 2 cửa sổ trên màn hình (3 khi có boss). Cái thứ ba xếp hàng.
- Thành công: +2 Vàng, +3 Tối Thượng, +1 Chuỗi, một sự kiện học. Thất bại: cơ chế quái chạy tiếp, Chuỗi giữ.
- Trung bình một cửa sổ mỗi 25–40 s; tối đa 3 mỗi phút lúc cao điểm; trước bản đồ 4 tối đa 2 quái có cửa sổ mỗi đợt.

---

## 10. Chiến đấu có máu

### 10.1 Sát thương

```
dmg = round( base × trợ_lực × (1 − giáp_hiệu_dụng) × chí_mạng × dễ_tổn_thương )
```
- `base`: số đều trong [min, max], luồng RNG "combat". Làm tròn một lần ở cuối. Tối thiểu 1.
- Dễ tổn thương: đánh dấu +15 %, Dễ Tổn Thương của boss +50 %. Cùng loại không cộng; khác loại thì nhân.

### 10.2 Loại sát thương, giáp, chí mạng

- Vật lý (VL) bị giáp chặn. Phép (P) bị kháng phép (KP) chặn. Chuẩn: không gì chặn (hiếm).
- Giáp, KP quái theo bậc 0 / 30 / 60 / 80 %. Phá giáp: −1 bậc.
- Lửa, băng, sét, độc là trạng thái, không phải loại sát thương.
- Chí mạng gốc: Tháp Cung 10 %, Thư Pháp 5 %, Pháo 0 %, Tướng 5 %. + 15 %·Ā·m_eff từ hào quang. ×1,75. Phát Chữ từ từ Hoàn hảo luôn chí mạng.

### 10.3 Trạng thái

| Trạng thái | Tác dụng | Cộng dồn | Boss |
|---|---|---|---|
| Chậm | −x % tốc | Lấy mạnh nhất, trần 60 % | Trần 30 % |
| Choáng | Đứng yên | Lần 3 trong 6 s còn nửa thời gian | Chỉ trong Dễ Tổn Thương; ngoài ra nửa thời gian |
| Đóng băng | Như choáng, quái bay rơi | Như choáng | Như choáng |
| Cháy | 4 P/s, 3 s | Tối đa 3 lớp | Như thường |
| Độc | 3 chuẩn/s, 4 s, −50 % hồi máu | Lấy mạnh nhất | Như thường |
| Đánh dấu | +15 % sát thương nhận | Không | Như thường |
| Lộ diện | Hết tàng hình | Không | — |
| Câm | Không dùng kỹ năng | Không | 50 % thời gian |
| Phá giáp | −1 bậc giáp | Không | Như thường |

- Mỗi quái tối đa 4 ô trạng thái.

### 10.4 Chọn mục tiêu, ai đánh được gì

- Mặc định: quái đi xa nhất trên đường. Đổi trên vòng menu: Mạnh nhất, Bay trước, Gần nhất. Hòa: id nhỏ.

| | Quái đất | Bay thấp (≤ 3,5 m) | Bay cao |
|---|---|---|---|
| Tháp Cung, Tháp Thư Pháp, Draconis, nỏ Lũy | Có | Có | Có |
| Tháp Pháo | Có | Không nhắm (vùng nổ vẫn trúng) | Không |
| Lính, Lam | Có, chặn được | Không | Không |
| Tre | Có, chặn được | Có | Không |
| Mưa Đá Lửa | Có | Có | Không |

- Mọi bản đồ có ít nhất 2 loại nhà đánh được quái bay. Quái bay tối đa 30 % ngân sách đợt.

---

## 11. Công trình

### 11.1 Danh sách

| Nhóm | Nhà | id | Vòng | Đặt ở | Pha |
|---|---|---|---|---|---|
| Chỉ huy | Lũy Chữ | `keep` | — | Sẵn trên bản đồ | 1A |
| Tấn công | Tháp Cung | `archer` | S 2,0 m | Tự do | 1A |
| Tấn công | Tháp Pháo | `cannon` | M 2,3 m | Tự do | 1A |
| Tấn công | Tháp Thư Pháp | `scribe` | M 2,3 m | Tự do | VS |
| Quân sự | Trại Lính | `barracks` | M 2,3 m | Tự do, có điểm tập kết hợp lệ | 1A |
| Kinh tế | Mỏ Vàng | `gold-mine` | L 2,7 m | Node quặng | 1A |
| Tài nguyên | Ruộng Lúa | `farm` | XL 3,5 m | Tự do trên cỏ phẳng (độ màu theo vùng đất) | 1B |
| Tài nguyên | Trại Gỗ | `lumber` | L 2,7 m | Node rừng | VS |
| Hỗ trợ | Đài Ấn | `seal-dais` | S 2,0 m | Node Mạch Chữ | 1B |
| Hỗ trợ | Nhà Thuốc | `infirmary` | M 2,3 m | Tự do | VS |

- Đã gộp hoặc bỏ (mục 3.2): Chợ → nhánh Lò Đúc Tiền; Kho bạc, Sở thuế bỏ; Xưởng chế tác → Rào; Thư viện, Học viện ra ngoài trận; Đền, Giếng mana → Đài Ấn; tháp nguyên tố → nhánh.
- Mọi nhà đều trợ lực được, kể cả Lũy.
- Mỗi nhà có **tổ thợ** biết nói 7 câu (mục 22.4).

### 11.2 Tự vận hành

- Mọi nhà chạy ngay khi xây xong, không cần người.
- **Thời gian trận** = từ lúc đợt 1 bắt đầu tới hết bản đồ, kể cả lúc chờ đợt kế. Tự sản và phần thưởng từ chạy suốt thời gian trận.
- Pha chuẩn bị: không tự sản, không phần thưởng từ.
- Có trợ lực thì tổ thợ làm nhanh hơn (tốc hoạt ảnh × (1 + 0,5·m_eff)).

### 11.3 Tháp tấn công

| Tháp | Cấp | Sát thương | Nhịp bắn | Tầm | DPS gốc | Ghi chú |
|---|---|---|---|---|---|---|
| Tháp Cung | L1 / L2 / L3 | 6–9 / 9–13 / 13–18 VL | 0,9 / 0,8 / 0,7 s | 10 / 11 / 12 m | 8,3 / 13,8 / 22,1 | Đất và bay. Chí mạng 10 %. |
| Tháp Pháo | L1 / L2 / L3 | 12–20 / 20–32 / 30–48 VL | 2,6 / 2,4 / 2,2 s | 9 / 9,5 / 10 m | 6,2 / 10,8 / 17,7 mỗi quái | Nổ 2,2 / 2,5 / 2,8 m, rìa 50 %. L3: Vỡ Giáp. Chỉ đất. |
| Tháp Thư Pháp | L1 / L2 / L3 | 12–18 / 20–28 / 30–42 P | 1,4 / 1,3 / 1,2 s | 9 / 9,5 / 10 m | 10,7 / 18,5 / 30 | Đất và bay. L3: chữ nổ 1 m. |

- Tháp Cung: Ā·m_eff ≥ 0,5 thì tên không bị né (khắc Chồn Liềm). Mục tiêu thêm = tên chẻ.
- Tháp Pháo: Chuẩn làm rìa nổ giảm ít hơn (50 % → 30 % khi Ā·m_eff = 1). Không có mục tiêu thêm. Mượt chỉ nới vùng nổ (tối đa +40 %).
- Tháp Thư Pháp: mục tiêu thêm = xuyên theo nét.

**Phát Chữ một từ và DPS khi có người** (mô hình, một mục tiêu):

| Tháp | Hồ sơ | L1 6 s | L1 4 s | L1 3 s | L2 2 s | L3 1 s |
|---|---|---|---|---|---|---|
| Cung | Gõ đều 35 | 18 · 18,5 | 21 · 22,1 | 22 · 24,2 | 32 · 38,6 | 47 · 50,4 |
| Cung | Giỏi 70 | 22 · 19,4 | 24 · 23,2 | 27 · 27,2 | 40 · 52,9 | 52 · 83,2 |
| Pháo (mỗi quái) | Gõ đều 35 | 31 · 15,8 | 35 · 20,3 | 37 · 23,5 | 61 · 42,6 | 97 · 62,9 |
| Pháo (mỗi quái) | Giỏi 70 | 38 · 17,1 | 42 · 22,3 | 46 · 27,7 | 76 · 61,6 | 107 · 114 |
| Thư Pháp | Gõ đều 35 | 36 · 25,2 | 41 · 31,1 | 43 · 34,9 | 71 · 61,2 | 108 · 84,9 |
| Thư Pháp | Giỏi 70 | 44 · 26,7 | 49 · 33,5 | 54 · 40,5 | 88 · 86,1 | 120 · 149 |

Ô ghi "sát thương trung bình một Phát Chữ · DPS tổng". Pháo bắn chậm nên mỗi Phát Chữ là phát nặng; gõ ở Pháo lời nhất khi quái dồn cục.

**Bùng Nổ:**

| Tháp | Bùng Nổ |
|---|---|
| Tháp Cung | Mưa Tên: mỗi 0,5 s, 5 mũi rơi trong vùng 4 m quanh mục tiêu |
| Tháp Pháo | Loạt Ba: mỗi phát tách 3 quả rải quanh mục tiêu |
| Tháp Thư Pháp | Đại Tự: vẽ chữ khổng lồ 5 m trên đất (chữ đầu của cụm chốt), 40 P/s trong 3 s, chậm 30 % |

### 11.4 Trại Lính

- 3 lính chặn đường ở điểm tập kết. Lính chết hồi sinh sau 10 s. Mỗi lần sinh hoặc hồi sinh tốn 1 Lúa (lần đầu miễn phí; ở 1A không tốn Lúa). Hết Lúa thì chờ Lúa.

| Cấp | Máu lính | Sát thương | Nhịp đánh | Giáp |
|---|---|---|---|---|
| L1 | 60 | 3–5 VL | 1,0 s | 0 % |
| L2 | 90 | 5–8 VL | 1,0 s | 10 % |
| L3 | 130 | 8–12 VL | 0,9 s | 20 % |

- **Trợ lực:** gõ đều 35 WPM nhịp 3 s → hồi sinh ~7,3 s (gồm có mặt); mỗi từ rút ~2,6 s của lính chết lâu nhất. Lính gần như không bao giờ vắng.
- **Bùng Nổ, Hô Xung Trận:** 6 s. Lính +30 % sát thương, lao 4 m, đẩy lùi quái 1 m, +1 lính tạm.

### 11.5 Mỏ Vàng

| Cấp | Tự sản | Đống tối đa | G (Vàng gốc mỗi từ) |
|---|---|---|---|
| L1 | 3 Vàng mỗi 8 s | 60 | 2,0 |
| L2 | 5 Vàng mỗi 8 s | 90 | 2,4 |
| L3 | 7 Vàng mỗi 8 s | 120 | 2,8 |

- Độ giàu node: ★ ×0,8, ★★ ×1,0, ★★★ ×1,25. Nhân vào tự sản và phần thưởng từ.
- **Đống vàng:** tự sản dồn ở cửa mỏ. Đầy thì ngừng tự sản (biểu tượng Kho đầy). Có người ở mỏ: đống về kho khi người tới, rồi **mỗi 5 s**. Hết đợt mà mỏ còn đứng: đống về kho. Mỏ Đổ Nát: mất đống.
- **Vàng gõ đi thẳng về kho**, không vào đống, nên trộm không lấy được.
- Đặt một Trợ Thủ ở mỏ là cách chống trộm: đống luôn gần rỗng.

**Vàng mỗi phút** (node ★★, mô hình):

| Cách dùng | L1 6 s | L1 4 s | L1 3 s | L2 2 s | L3 1 s |
|---|---|---|---|---|---|
| Không người | 22,5 | 22,5 | 22,5 | 37,5 | 52,5 |
| Chỉ có mặt | 25,9 | 25,9 | 25,9 | 43,1 | 60,4 |
| Gõ đều 35 WPM | 50 (gõ 16) | 63 (gõ 28) | 69 (gõ 33) | 101 (gõ 46, tải 126 %) | 121 (gõ 56, tải 233 %) |
| Giỏi 70 WPM | 53 | 68 | 80 | 141 (gõ 75) | 190 (gõ 111) |

- Hoàn vốn Mỏ L1 (90 Vàng), một chu kỳ đợt khoảng 100 s: không người 2,4 chu kỳ; có mặt 2,1; gõ đều nhịp 4 s 0,9.
- Thẻ mỏ luôn hiện "Hoàn vốn ≈ n đợt" theo cách đang dùng.
- **Bùng Nổ, Mạch Vàng Lộ:** +25 Vàng × độ giàu ngay.

### 11.6 Ruộng Lúa và Trại Gỗ

| Nhà | Cấp | Tự sản | Gốc mỗi từ |
|---|---|---|---|
| Ruộng Lúa | L1 / L2 / L3 | 1 Lúa mỗi 6 / 5 / 4 s | R = 0,5 / 0,6 / 0,7 |
| Trại Gỗ (VS) | L1 / L2 / L3 | 1 Gỗ mỗi 8 / 6,5 / 5 s | W = 0,4 / 0,5 / 0,6 |

- Ruộng đặt tự do trên cỏ phẳng. **Độ màu** theo vùng đất bản đồ vẽ sẵn: phù sa gần nước ×1,25, cỏ thường ×1,0, đất khô ×0,8.
- Lúa vào kho chung. Kho 30, +10 khi có Ruộng từ L2. Lúa dư cuối đợt đổi Vàng 1 : 1. Ruộng không bao giờ vô dụng.
- Một Ruộng L1 có người gõ nhịp 4 s ≈ 22 Lúa mỗi phút (không người 10). Ba lính chết liên tục tốn khoảng 18 Lúa mỗi phút.
- **Bùng Nổ:** Ruộng: Gặt Vàng, +6 Lúa, lính trong 15 m hồi 30 %. Trại Gỗ: Gỗ Lăn, +6 Gỗ, khúc gỗ lăn 12 m trên đường: 8 VL, đẩy lùi 1,5 m.

### 11.7 Đài Ấn

- Đài đá tròn trên node Mạch Chữ. Tối đa 1. Nơi gõ **cụm từ**, **nghe rồi gõ**, **gõ theo nghĩa** (VS), và **ấn boss**.

| Cấp | Sóng Chữ tự chạy (mỗi 15 s) | Nhịp cụm khi có người |
|---|---|---|
| L1 | Vòng 7 m: chậm 15 % 3 s, lộ quái tàng hình 3 s | 8 s |
| L2 | Vòng 8 m, chậm 20 % | 6 s |
| L3 | Vòng 9 m, chậm 25 %, +20 P | 5 s |

- Tướng đứng trong 7 m: Tối Thượng +0,5 mỗi giây (dù không gõ).
- Trợ lực: Tốc → nạp Tối Thượng nhiều hơn (qua Q_w). Chuẩn → ấn boss mạnh hơn (Dễ Tổn Thương +0–2 s theo Ā·m_eff). Mượt → Sóng Chữ rộng × (1 + 0,5·F_b·m_eff).
- Nghe rồi gõ: giọng đọc đọc cụm khi hiện. Nút loa để nghe lại. Chưa gõ chữ nào sau 2 s thì tự đọc lại một lần.
- **Bùng Nổ, Ấn Trấn:** choáng mọi quái trong 9 m 1,5 s (boss 0,5 s). Tối Thượng +15.

### 11.8 Nhà Thuốc (VS)

| Cấp | Hồi mỗi 2 s | Tầm | Khác |
|---|---|---|---|
| L1 | 8 | 8 m | Tướng gục trong 15 m hồi sinh nhanh hơn 30 % |
| L2 | 12 | 9 m | |
| L3 | 16 | 10 m | Lính đầy máu +10 % giáp |

- Hồi lính và Tướng, không hồi nhà. Hai nhà chồng vùng: lấy nhà mạnh nhất. Nhịp dày nhất 2 s.
- **Bùng Nổ, Thang Thuốc Nóng:** đồng minh trong 12 m hồi 60 %, nhà trong 12 m sửa 10 %.

### 11.9 Lũy Chữ

- 20 mạng. Tướng hồi sinh ở đây. Trợ Thủ hoảng chạy về đây.
- Tự tạo 1 Lúa mỗi 10 s trong thời gian trận.
- Nỏ thủ thành theo cấp (mục 12.4).
- **Điểm ấn dự phòng:** cửa sổ ấn boss gõ được ở đây, thời gian ×0,75.
- Trợ lực ở Lũy: ≈ 1,3 Vàng và một mũi nỏ mỗi từ. Thấp nhất trong các nhà: chỗ an toàn khi mọi nơi khác yên.
- **Bùng Nổ, Khiên Lũy:** chặn 3 lần lọt kế trong 10 s.
- Lũy không có Cơn Gấp. Không bán được.

### 11.10 Trần

| Loại | Trần |
|---|---|
| Tổng nhà (không tính Lũy) | 16. Bản đồ ghi đè được, không vượt 40. |
| Nhà tấn công (Cung + Pháo + Thư Pháp) | Bản thử 6 cố định. Từ VS: 4 / 6 / 8 theo cấp Lũy. |
| Trại Lính | 3 |
| Mỏ, Trại Gỗ | Theo số node |
| Ruộng Lúa | 3 |
| Đài Ấn | 1 |
| Nhà Thuốc | 2 |

- Nút xây hiện "2/6". Hết trần thì nút xám, có chip lý do.
- Hỗ trợ cùng loại không cộng dồn: lấy mạnh nhất.

### 11.11 Máu, Đổ Nát, sửa

| Nhóm | L1 | L2 | L3 | Nhánh |
|---|---|---|---|---|
| Tấn công | 300 | 360 | 440 | 520 |
| Trại Lính | 380 | 450 | 540 | 620 |
| Kinh tế, tài nguyên | 260 | 310 | 370 | 440 |
| Hỗ trợ | 280 | 340 | 400 | 480 |

- Chỉ quái đánh nhà, quái nổ và boss làm nhà mất máu.
- 0 máu → **Đổ Nát**: ngừng chạy, vẫn chiếm chỗ, vẫn tính vào trần. Từ đang bay của nhà bị **hủy** (không tính trượt). Người đang đứng chuyển sang gõ **từ sửa**.
- Sửa: từ sửa (mục 6.11), tới 50 % máu thì nhà chạy lại; hoặc tự dựng lại khi hết đợt (25 % số vàng đã chi, về 50 % máu); hoặc Từ Lá, Bùa Sửa, Tối Thượng của Tre.

### 11.12 Bán, hoàn tác, dời

- Hoàn tác: bán trong 5 s sau khi xây, hoặc trong pha chuẩn bị: hoàn 100 % và phí dọn cảnh.
- Bán sau đó: 60 % số đã chi, bấm hai lần. Đổ Nát: 30 %.
- Dời: chỉ khi bản đồ sạch quái. Phí 15 % (tối thiểu 10).
- Test thuộc tính: không chuỗi xây, bán, dời, nâng nào sinh vàng.

---

## 12. Nâng cấp, nhánh, đặt nhà

### 12.1 Nâng nhà: luật chung

```
Cấp 1 → Cấp 2 → Cấp 3 → chọn Nhánh A hoặc B (một lần, không đổi)
```

Mỗi cấp đổi năm thứ:
1. **Chỉ số tự chạy:** DPS tháp × khoảng 1,65 mỗi cấp. Sản lượng kinh tế +60–70 %.
2. **Máu nhà** (mục 11.11).
3. **Phần thưởng mỗi từ:** D̄, G, R, W, H tăng.
4. **Nhịp mở thêm:** L2 mở 2 s, L3 mở 1 s.
5. **Hình:** bộ cấp gắn thêm (mái, cờ, ốp) trên cùng model gốc. Nhánh có model riêng.

```
DPS_L     ≈ DPS_1 × 1,65^(L − 1)        // lập sẵn bảng, mô phỏng không dùng lũy thừa
DPS_nhánh ≈ DPS_3 × 1,4–1,5 (hoặc đổi vai)
Giá cộng dồn: C_2 ≈ 2,2·C_1 · C_3 ≈ 4·C_1 · C_nhánh ≈ 7·C_1 (+ Gỗ)
```

- DPS mỗi 100 Vàng giảm dần theo cấp. Nâng đắt hơn xây mới, nhưng **tiết kiệm trần nhà tấn công**, tăng máu, mở nhịp dày, và **một người trông một nhà mạnh** lời hơn trông nhà yếu.
- Xây 1,5 s (S, M), 2,5 s (L, XL). Nâng 1 s: nhà vẫn chạy, dòng chữ dừng 1 s.
- **Bản thử:** L1–L3 không cần cấp Lũy. **VS:** cấp nhà tối đa theo Lũy (Lũy 1 → L2, Lũy 2 → L3, Lũy 3 → nhánh, Lũy 4 → kỹ năng nhánh bậc 3). L3 cần thêm 10 Gỗ.

### 12.2 Giá và chỉ số

| Nhà | L1 | L2 | L3 | Nhánh | Thứ tăng |
|---|---|---|---|---|---|
| Tháp Cung | 70 | 160 | 290 | 490 + 20 Gỗ | DPS 8,3 / 13,8 / 22,1; tầm 10 / 11 / 12 m; D̄ 7,5 / 11 / 15,5 |
| Tháp Pháo | 110 | 230 | 390 | 630 + 25 Gỗ | DPS 6,2 / 10,8 / 17,7 mỗi quái; D̄ 13 / 21 / 32 |
| Tháp Thư Pháp | 100 | 210 | 360 | 590 + 25 Gỗ | DPS 10,7 / 18,5 / 30; D̄ 15 / 24 / 36 |
| Trại Lính | 70 | 150 | 270 | 490 + 20 Gỗ | Máu lính 60 / 90 / 130, sát thương, giáp |
| Mỏ Vàng | 90 | 190 | 330 | 530 + 15 Gỗ | Tự sản 3 / 5 / 7, đống 60 / 90 / 120, G 2,0 / 2,4 / 2,8 |
| Ruộng Lúa | 60 | 130 | 230 | 390 + 15 Gỗ | Chu kỳ 6 / 5 / 4 s, R 0,5 / 0,6 / 0,7 |
| Trại Gỗ | 80 | 170 | 290 | 470 | Chu kỳ 8 / 6,5 / 5 s, W 0,4 / 0,5 / 0,6 |
| Đài Ấn | 120 | 220 | 350 | 570 + 20 Gỗ | Sóng 7 / 8 / 9 m, nhịp cụm 8 / 6 / 5 s |
| Nhà Thuốc | 100 | 200 | 330 | 530 + 20 Gỗ | Hồi 8 / 12 / 16, tầm 8 / 9 / 10 m, H 10 / 14 / 18 |

Giá là giá **cộng dồn** (đã chi tới cấp đó). Bán 60 % của số này.

### 12.3 Nhánh (VS; mở bằng bản vẽ, cần Lũy cấp 3)

- Nhánh đổi vai, cách nhắm, **cách Phát Chữ hoạt động**, VFX, model.
- Mỗi nhánh 2 kỹ năng, mỗi kỹ năng 3 bậc. Giá bậc 120 / 160 / 200 Vàng. Bậc 3 cần Lũy cấp 4.
  - Bậc 1 mở kỹ năng. Bậc 2: hiệu ứng ×1,3 hoặc hồi −20 %. Bậc 3: một hiệu ứng ngang.

| Nhà | Nhánh A | Phát Chữ ở A | Nhánh B | Phát Chữ ở B |
|---|---|---|---|---|
| Tháp Cung | **Én Bão:** 2 cung thủ, 8–12 VL mỗi 0,6 s, tầm 12,5 m, bắn 2 mục tiêu. Kỹ năng: Tên Chẻ Ba, Gió Lùa. | Tách 3 mũi, mỗi mũi 50 % | **Thần Tiễn:** 40–60 VL mỗi 2,0 s, tầm 15 m, chí mạng 25 %, thấy tàng hình. Kỹ năng: Đinh Bóng, Mắt Ưng. | Từ Hoàn hảo ghim bóng: choáng 1 s, quái bay rơi 1 s |
| Tháp Pháo | **Cối Lớn:** 55–85 VL, nổ 3,5 m, mỗi 3,0 s, tầm 11 m. Kỹ năng: Đạn Chùm, Đất Rung. | Nổ hai lần (lần hai 50 %) | **Vạc Lửa:** 18–28 VL, vũng cháy 3 m 4 s 10 P/s. Kỹ năng: Tường Lửa, Dầu Loang. | Để vũng cháy 3 s |
| Tháp Thư Pháp | **Bút Lôi:** sét nối 4 mục tiêu, −20 % mỗi lần nảy. Kỹ năng: Nét Sấm, Mây Tích Điện. | Nảy thêm 2 mục tiêu | **Mực Băng:** chậm 35 % 2 s, đóng băng quái mạnh nhất mỗi 8 s. Kỹ năng: Băng Lan, Sương Giá. | Chậm 40 %; từ Hoàn hảo đóng băng 1 s |
| Trại Lính | **Khiên Đồng:** 3 Lính Khiên. Kỹ năng: Tường Đồng, Giáp Vảy. | Lính nhận khiên 10 % máu 4 s | **Giáo Dài:** lính 150 máu, 12–18 VL, đâm xuyên 2. Kỹ năng: Xung Phong, Giáo Dài Hơn. | Từ Hoàn hảo: mọi lính đâm một nhát ngay |
| Mỏ Vàng | **Hầm Sâu:** tự sản ×1,5, đống ×1,5, máu −20 %. Kỹ năng: Mạch Sâu, Xe Goòng. | G = 3,6 | **Lò Đúc Tiền:** đổi Lúa, Gỗ dư ra Vàng; nâng rẻ 10 % khi có người. Tối đa 1. Kỹ năng: Đúc Nhanh, Lò Bạc. | Mỗi từ giảm 1 % giá lần nâng kế (tối đa 10 %) |
| Ruộng Lúa | **Bậc Thang:** Lúa ×1,6. Kỹ năng: Nước Về, Cò Bay. | R ×1,6 | **Chuồng Trâu:** trâu húc 10 m đường mỗi 20 s. Kỹ năng: Trâu Mộng, Trâu Kéo Cày. | 5 từ tốt: trâu húc ngay |
| Trại Gỗ | **Xưởng Cưa:** Gỗ ×1,5. Kỹ năng: Cưa Đôi, Bè Gỗ. | W ×1,5 | **Xưởng Rào:** dựng rào trên đường mỗi 25 s. Kỹ năng: Rào Gai, Rào Chắc. | 5 từ tốt: dựng rào ngay |
| Đài Ấn | **Phong Ấn:** cửa sổ boss +2 s, Dễ Tổn Thương +10 %. Kỹ năng: Xích Chữ, Bùa Hồi. | Mỗi cụm Tối Thượng +2 | **Vang Âm:** nửa số cụm là nghe-gõ; cụm nghe Hoàn hảo cho tháp trong 20 m +8 % tốc 6 s. Kỹ năng: Chuông Gió, Vang Xa. | Cụm Hoàn hảo: Sóng Chữ đôi |
| Nhà Thuốc | **Vườn Thảo Dược:** gỡ cháy, chậm, choáng. Kỹ năng: Hương Thảo, Rễ Thuốc. | Mỗi từ gỡ 1 trạng thái xấu | **Trạm Cứu Thương:** lính chết hồi sinh tại trạm 3 s. Kỹ năng: Cáng Tre, Bếp Dã Chiến. | Mỗi từ rút 1 s hồi sinh |

- Hai nhánh của mỗi nhà phải có lúc hơn nhau. Bot kiểm: mỗi nhánh được chọn 35–65 %.
- Số chi tiết từng bậc kỹ năng nhánh nằm trong file dữ liệu nhánh (VS).

### 12.4 Lũy Chữ: cơ sở chỉ huy trong trận

| Cấp | Giá | Ô | Trần tấn công (VS) | Cấp nhà tối đa (VS) | Nỏ (mỗi 1,2 s, tầm 9 m) | Khác |
|---|---|---|---|---|---|---|
| 1 | Sẵn | 1 | 4 | L2 | 10–14 VL | +1 Lúa / 10 s. Nhịp ở Lũy: 6, 4, 3 s. |
| 2 | 150 Vàng (VS: +20 Gỗ) | 2 | 6 | L3 | 14–20 VL | Mở nhịp 2 s ở Lũy |
| 3 (VS) | 260 Vàng + 40 Gỗ | 3 | 8 | Nhánh | 20–28 VL, 2 mục tiêu | |
| 4 (VS) | 400 Vàng + 60 Gỗ | 4 | 8 | Kỹ năng nhánh bậc 3 | 26–36 VL, 2 mục tiêu | +2 mạng một lần (≤ 20). Cần Học Viện cấp 5. |

- Nâng Lũy mất 3 s. Lũy vẫn chạy.
- Ô chỉ mở khi có Trợ Thủ mang theo.
- **1B:** Lũy cấp 1–2 trong chế độ truyện; trần tấn công 6 cố định. Hộp cát cho Lũy 1–4.

### 12.5 Đặt nhà tự do

| Cỡ | Bán kính r | Nhà |
|---|---|---|
| S | 2,0 m | Tháp Cung, Đài Ấn |
| M | 2,3 m | Tháp Pháo, Tháp Thư Pháp, Trại Lính, Nhà Thuốc |
| L | 2,7 m | Mỏ Vàng, Trại Gỗ |
| XL | 3,5 m | Ruộng Lúa |

- Lưới bám 0,25 m. Hai nhà: tâm cách nhau ≥ rA + rB + 1,0 m. Đường: tâm cách tim đường ≥ 1,9 + r.
- Không xây trong 11 m quanh Lũy. Cả vòng trong ±46 m. Chênh cao trong đĩa ≤ 1,2 m, không ô vách > 35°.
- Vùng cấm: nước, dung nham, vách, mốc cảnh, dải viền.
- Rê chuột: nhà mờ; **vòng đỏ** khi không đặt được, kèm chip lý do.
- **Thứ tự kiểm** (cố định): pha → trần chung → trần loại → biên → node (nếu cần) → vùng cấm → đường → Lũy → dốc → nhà khác → mốc cảnh → điểm tập kết (Trại Lính) → **lối đi của người trợ lực** → vàng.
- Lối đi: sau khi đặt, mọi ổ trợ lực vẫn tới được từ Lũy trên lưới 1 m (BFS). Không thì từ chối, chip "Chặn lối đi". Giao diện và mô phỏng dùng chung hàm `canPlace`.
- **Phá cảnh khi đặt:** vòng nhà chạm tán cảnh vật thì cảnh vật bị phá. Phí dọn: nhỏ 0, vừa 5, lớn 10, tối đa 30 mỗi lần. San phẳng theo trung vị độ cao, dải chuyển 0,5 m, không đổi độ cao đường.

### 12.6 Node và độ giàu

- Mỏ Vàng, Trại Gỗ, Đài Ấn **chỉ** đặt trên node. Mỗi node một nhà. Ruộng đặt tự do (độ màu theo vùng đất).
- Độ giàu ★ ×0,8, ★★ ×1,0, ★★★ ×1,25.
- Node giàu gần tiền tuyến hoặc dưới đường bay. Node an toàn gần Lũy. Đây là lựa chọn tham hay an toàn.
- Node quyết định quãng đường người phải đi và đường của quái trộm.

---

## 13. Lính

- 3 lính mỗi trại. Tối đa 64 lính trên bản đồ (gồm lính tạm, Viện Binh).
- **Điểm tập kết:** chọn trại → nút cờ → kéo chuột. Trong 12 m quanh trại, cách tim đường ≤ 3 m. 3 lính đứng tam giác cách nhau 1,2 m. Không ra lệnh từng lính.
- **Chặn:** mỗi lính chặn 1 chỗ (Lính Khiên 2). Sức nặng quái: nhỏ và vừa 1, to 2. Boss không bị chặn. Quái dừng khi tổng chỗ chặn ≥ sức nặng; chưa đủ thì đi tiếp 50 % tốc. Tối đa 3 lính đánh một quái. Quái bay và quái xuyên chặn không bị chặn.
- **Trí khôn:** Đứng → Giao chiến → Đánh → Quay về. Lính rảnh chọn quái chưa bị chặn đủ, gần nhất trong 3 m quanh cờ. Dây giữ 5 m.
- Lính hồi 5 % máu mỗi giây sau 3 s không đánh.
- **Viện Binh** (Phép Chỉ huy): 2 lính cấp 2 trong 18 s, thả trên đường. Hồi 18 s.

---

## 14. Quái

### 14.1 Chế độ mục tiêu

| Chế độ | Hành vi |
|---|---|
| Lũy (mặc định) | Đi theo làn. Bị chặn thì đánh lính. |
| Phá nhà | Rời đường tới nhà có mép trong 4–5 m, nếu lối thẳng không cắt vùng cấm |
| Trộm | Nhắm đống vàng ở Mỏ |
| Săn (Thế giới 2) | Đuổi Tướng trong 10 m, ưu tiên Tướng đang trợ lực. Đi qua chỗ Trợ Thủ thì Trợ Thủ hoảng. |
| Bay | Đường bay riêng |

- Mỗi bản đồ tối đa 3 loại quái đánh nhà. Quái thường bỏ qua Trợ Thủ.

### 14.2 Bậc quái

| Bậc | Máu (bản đồ 1, Thường) | Giáp / KP | Tốc (m/s) | Vàng | Lọt | Sức nặng chặn |
|---|---|---|---|---|---|---|
| Bầy (mỗi con) | 15–40 | 0 | 2,6–4,0 | 1–4 | 1 | 1 |
| Nhỏ | 50–120 | 0 / 30 / 60 | 2,4–4,6 | 4–12 | 1–2 | 1 |
| Vừa | 140–380 | 30 / 60 | 1,8–3,4 | 12–25 | 2–3 | 1–2 |
| Nặng | 500–900 | 30–60 | 1,4–2,0 | 25–35 | 3–4 | 2 |
| Tinh nhuệ | Gốc + 60 % | +1 bậc | Như gốc | 30–45 | 3–5 | 2 |
| Boss | Mục 18.8 | Theo boss | 1,2–1,8 | 150–300 | Thua | Không chặn |

- Test dữ liệu: vàng và lọt của mọi loài nằm trong khoảng của bậc.
- Máu tăng theo bản đồ × (1 + 0,12·(bản đồ − 1)), lập sẵn bảng. Thưởng tăng chậm hơn giá nhà.
- **Tinh nhuệ:** +60 % máu, +1 bậc giáp, viền vàng, luôn rơi túi. **Cuồng nộ:** dưới 40 % máu +30 % tốc.

### 14.3 Vai (nguyên mẫu)

| # | Vai | Bài toán | Khắc chế | Gõ trực tiếp | Thế giới 1 |
|---|---|---|---|---|---|
| 1 | Chạy nhanh | Lọt qua tầm | Lính chặn, làm chậm | Neo (con dẫn bầy) | Cương Thi |
| 2 | Bầy | Đông, máu ít | Pháo, sét chuỗi, Phát Chữ xuyên | — | Đàn Ma Trơi |
| 3 | Tách đôi | Chết sinh 2 con | Sát thương nổ | — | Nuppeppō |
| 4 | Giáp nặng | Chịu vật lý | Thư Pháp, Draconis, Pháo L3 | — | Thuồng Luồng |
| 5 | Chữa trị | Hồi máu bầy | Dồn hỏa, Ngắt | Ngắt | Lửng Tanuki |
| 6 | Phá nhà | Đập công trình | Lính, Rào, Thư Pháp | — | Quỷ Oni |
| 7 | Khiên | Che quái quanh nó | Cận chiến, Phá Khiên | Phá Khiên | Quỷ Núi Troll |
| 8 | Trộm | Cướp đống vàng | Người đứng mỏ, Tháp Cung, Bắt | Bắt | Chim Vàng Alicanto |
| 9 | Tự nổ | Nổ vào nhà | Bắn xa, Rào, đặt nhà cách đường | — | Tất Phương |
| 10 | Tàng hình | Tháp không thấy | Đài Ấn, Thần Tiễn, Tre | Hiện Hình | Ma Da |
| 11 | Triệu hồi | Thêm quái | Diệt sớm, Phong Gậy | Phong Gậy | Yêu Tinh Dokkaebi |
| 12 | Né đạn | Né tháp yếu chuẩn | Tháp có Ā·m_eff ≥ 0,5, phép | — | Chồn Liềm |
| 13 | Săn | Phạt đứng yên, dọa Trợ Thủ | Lính quanh nhà, Tướng ra trận | — | Thế giới 2 |
| 14 | Bay đậu | Tắt tháp khi đậu | Tháp Cung, Tướng | — | Thế giới 2 |
| 15 | Bay chở quân | Chở quái đất vượt chặn | Thần Tiễn | Neo | Thế giới 2 |
| 16 | Bắn xa | Đánh lính, nhà từ xa | Lính áp sát, Pháo | — | Thế giới 2 |

### 14.4 Điểm đe dọa

```
đe_dọa        = round(máu_hiệu_dụng / 10 × tốc / 2,4) + điểm_kỹ_năng
máu_hiệu_dụng = máu / (1 − giáp_bậc_trung_bình)
điểm_kỹ_năng  : 0 · 5 (thường) · 10 (đánh nhà, trộm, khiên, săn) · 20 (triệu hồi, chở quân)
```

---

## 15. Tăng trưởng ngoài trận

### 15.1 Tướng: cấp, kỹ năng, ái lực

```
XP cần (L → L+1) = 250 + 100·(L − 1)                         // tổng tới cấp 10: 5.850
XP mỗi bản đồ    = (300 + 40·(i − 1)) × (0,8 + 0,1·sao)      // i: số thứ tự bản đồ
Chơi lại ×0,5. Tướng không ra trận nhận 25 %.
Máu, sát thương Tướng × (1 + 0,02·(L − 1))                   // tối đa +18 %
```

- Cấp 1–10, lưu theo tài khoản. Không lên cấp trong trận.
- 1 điểm kỹ năng ở mỗi cấp 2–10 (9 điểm). 4 kỹ năng (Kỹ năng 1, Kỹ năng 2, Nội tại ái lực, Tối Thượng) × 3 bậc. Bậc 2 tốn 1 điểm, bậc 3 tốn 2. Cần 12, có 9: phải chọn. Đặt lại miễn phí.

| Bậc | Kỹ năng thường | Nội tại ái lực | Tối Thượng |
|---|---|---|---|
| 1 | Gốc | Gốc | Gốc, 3 Chữ Chiêu |
| 2 | Hiệu ứng ×1,3 hoặc hồi −20 % | Phần thưởng từ ở nhà ái lực +5 % | Sát thương (hoặc lượng hồi) gốc +20 % |
| 3 | Một hiệu ứng ngang | Dư âm ở nhà ái lực +2 s; vào việc 0,2 s | Hồi tối thiểu 45 → 35 s |

| Cấp | Mở |
|---|---|
| 3 | Câu thoại Chuỗi mới, màu áo 2 |
| 5 | Chữ Chiêu thứ tư (+20 %) |
| 7 | Có mặt của Tướng ở nhà ái lực +20 % (thay +15 %) |
| 10 | Lửa riêng khi Bùng Nổ, chương truyện cuối |

- Hết Thế giới 1 thường ở cấp 4.
- **Ô trợ lực không đến từ cấp Tướng.**

### 15.2 Trợ Thủ: cấp

| Cấp | Giá (Tri thức) | Có mặt | Sở trường | Tốc đi | Khác |
|---|---|---|---|---|---|
| 1 | — | +15 % | +10 % | 4,0 m/s | |
| 2 | 40 | +16 % | +13 % | 4,2 m/s | |
| 3 | 90 | +17 % | +16 % | 4,4 m/s | Hoảng 2,5 s (thay 5 s) |
| 4 | 150 | +18 % | +19 % | 4,6 m/s | Vào việc 0,2 s |
| 5 | 220 | +20 % | +22 % | 4,8 m/s | Từ Hiếm ở nhà mình +1 % |

### 15.3 Thư Thành (cơ sở ngoài trận)

Một màn hình làng. Mỗi cơ sở là một nhà bấm được. Không có thời gian chờ xây.

| Cơ sở | Tiền | Làm gì |
|---|---|---|
| Sảnh Tướng | XP từng Tướng | Cấp Tướng, điểm kỹ năng, đặt lại, chương truyện |
| Học Viện | Tri thức | Cấp Trợ Thủ, ô thứ tư, tính năng học |
| Xưởng Bản Vẽ | Bản vẽ | Mở nhánh A/B, biến thể nhà |
| Cây Chữ (cây nghiên cứu) | Sao | 5 nhánh × 5 bậc, tối đa +15 % |
| Chợ | Xu | Vật phẩm mang theo; trang phục sau MVP |

**Học Viện:**

| Cấp | Giá (Tri thức) | Mở |
|---|---|---|
| 1 | Sẵn | Trợ Thủ tối đa cấp 2. Ôn trận cuối bản đồ. |
| 2 | 120 | Trợ Thủ cấp 3. Từ Ôn ×1,3. |
| 3 | 250 | Trợ Thủ cấp 4. Gõ theo nghĩa ở Đài Ấn. Đổi sở trường miễn phí. |
| 4 | 400 | Trợ Thủ cấp 5. Phòng luyện nhịp. |
| 5 | 600 | Lũy cấp 4 (ô thứ tư), khi đã có Trợ Thủ thứ ba |

**Tri thức (tiền của việc học):** +1 mỗi từ tăng độ thuộc trong trận; +5 mỗi từ mới đạt độ thuộc 3; +10 ôn trận; +20 hoàn thành bản đồ lần đầu; +1 mỗi Từ Ôn chuộc lại. Một bản đồ cho 40–80. Trần mềm 200 mỗi ngày (phần vượt ×0,25). Học Viện cấp 5 (tổng 1.370) đạt khoảng cuối Thế giới 2. **Học càng nhiều, càng sớm có ô thứ tư.**

**Cây Chữ:**
- 5 nhánh (Tấn Công, Quân Sự, Kinh Tế, Hỗ Trợ, Chỉ Huy) × 5 bậc. Giá 1 / 2 / 3 / 4 / 5 Sao. Mỗi bậc chọn một trong hai. Đặt lại miễn phí.
- Trần cả cây: +15 % sức chiến đấu hiệu dụng. **Không bậc nào tăng trần hào quang hay T_N.**
- Mỗi cặp có một lựa chọn hợp người gõ nhiều và một hợp người gõ ít. Ví dụ bậc 1 Tấn Công: "Tên Tẩm Dầu" (Tháp Cung gây cháy 2 P/s 2 s) hoặc "Nòng Nhẹ" (Pháo rẻ 10 Vàng). Danh sách bậc 1–3 ở mục 22.8.

**Xưởng Bản Vẽ:** bản vẽ từ mốc sao (6, 12, 18…), hạ boss lần đầu, mốc độ thuộc từ (100, 250, 500 từ). Không cộng chỉ số.

### 15.4 Ngân sách sức mạnh

| Lớp | Tăng tối đa | Ghi chú |
|---|---|---|
| Cấp nhà | DPS ×2,7 (L3), ×3,6–4 (nhánh) | Trong trận, tốn vàng |
| Có mặt | ×1,15 (ái lực ×1,2) | Không cần gõ |
| Hào quang | Tốc ×1,5, sát thương ×1,4, vùng ×1,5, +2 mục tiêu | Mỗi nhà, có trần, nhân k_N |
| Phần thưởng từ | Không trần | Theo sức gõ |
| Bùng Nổ, Hợp Tấu | 6–12 s mạnh, có nghỉ lò | |
| Cây Chữ | +15 % hiệu dụng | Ngoài trận |
| Cấp Tướng | +18 % máu, sát thương của Tướng | Ngoài trận |
| Cấp Trợ Thủ | +5 % có mặt, +12 % sở trường | Ngoài trận |

- Tài khoản tối đa mạnh hơn tài khoản mới khoảng +25 % ở cùng sức gõ. **Sức gõ là đường tăng chính.**

---

## 16. Phép Chỉ huy, vật phẩm, cửa hàng

### 16.1 Phép Chỉ huy (trong trận, miễn phí)

| Phép | Tác dụng | Hồi | Ấn Phụ (VS) |
|---|---|---|---|
| Mưa Đá Lửa | 3 khối đá lửa trong 3 m, mỗi khối 80 VL + cháy | 70 s | +2 khối |
| Viện Binh | 2 lính cấp 2, 18 s | 18 s | +1 lính, +6 s |

- Nổ ngay khi thả. Hồi nhanh hơn khi gọi đợt sớm và khi gõ cụm ở Đài Ấn.

### 16.2 Vật phẩm mang theo

- 2 ô. Mỗi ô dùng tối đa 3 lần mỗi bản đồ. Mua ở Chợ bằng Xu. Mỗi loại giữ tối đa 5.

| Vật phẩm | Tác dụng | Giá (Xu) |
|---|---|---|
| Bùa Sửa lớn | Sửa một nhà về 100 % (cả Đổ Nát) | 60 |
| Bùa Băng lớn | Đóng băng quái trong 6 m, 3 s | 80 |
| Bom Lửa | 200 VL trong 3 m | 80 |
| Tù Và Viện Binh | 3 lính cấp 3, 20 s | 100 |

### 16.3 Cửa hàng

- Trong trận: **không** có màn cửa hàng.
- Ngoài trận (Chợ): vật phẩm. Trang phục sau MVP. Tướng và Trợ Thủ mở bằng truyện.
- Xu mỗi bản đồ: 30 / 50 / 80 theo 1 / 2 / 3 sao lần đầu. Chơi lại 20 %, tối đa 5 lần mỗi ngày. Huy chương +5 Xu.
- Tiền thật: chưa có. Nguyên tắc khóa: không bán sức mạnh, không gacha.

---

## 17. Kinh tế và rơi đồ

### 17.1 Tài nguyên

| Tài nguyên | Ở đâu | Từ đâu | Dùng cho | Có từ |
|---|---|---|---|---|
| Vàng | Trong trận | Hạ quái, Mỏ, Lũy, túi, thưởng đợt, gọi sớm | Xây, nâng, nhánh, kỹ năng nhánh, Lũy, sửa | 1A |
| Lúa | Trong trận | Ruộng, Lũy | Sinh và hồi sinh lính. Dư cuối đợt đổi Vàng 1 : 1. | 1B |
| Gỗ | Trong trận | Trại Gỗ, túi | Lũy cấp 2–4, L3, nhánh | VS |
| Sao | Ngoài trận | Kết quả bản đồ | Cây Chữ | 1B |
| Xu | Ngoài trận | Hoàn thành bản đồ, huy chương | Chợ | VS |
| Tri thức | Ngoài trận | Học, ôn, độ thuộc từ | Học Viện | VS |
| Bản vẽ | Ngoài trận | Mốc sao, boss, mốc học | Nhánh, biến thể | VS |

- Không có gỗ + đá + sắt + mana cùng lúc. Một loại Gỗ, đổi hình theo vùng (gỗ, đá, tinh thể).

### 17.2 Số khởi điểm

- Vàng đầu: 220 / 260 / 300 / 340 / 380 / 420 / 460 / 500 (bản đồ 1–8). Lúa 15, kho 30. Gỗ 0, kho 60.
- Thưởng cuối đợt: 10 + 2 × số đợt.
- **Gọi sớm:** thưởng Vàng = số giây còn lại × 1 (tối đa 30); Phép hồi nhanh = số giây còn lại × 0,5.

### 17.3 Tỉ lệ nguồn vàng mục tiêu

| Nguồn | Bot 35 WPM, 2 ô từ đợt 4 |
|---|---|
| Hạ quái (cả túi) | 45–55 % |
| Nhà tự sản | 18–25 % |
| Phần thưởng từ (Mỏ, Lũy, Từ Vàng) | 18–28 % |
| Thưởng đợt, gọi sớm, Heo Đất | 5–10 % |

- Người không gõ có ≥ 70 % tổng vàng của bot Cân bằng.
- Người 70 WPM có 140–200 % (không trần), và **vàng từ gõ ≤ 45 % tổng vàng** ở bản đồ 1–4. Vượt thì giảm G trong dữ liệu, không thêm trần.

### 17.4 Rơi đồ và thu nhặt

**Nguyên tắc:**
1. **Ghi sổ ngay tick xảy ra.** Đồng bay, chữ bay chỉ là hình. Không bao giờ mất tiền vì hình.
2. **Không bắt bấm để nhặt.** Mắt và tay để gõ. Thu tự động, bằng gõ (Từ Nhặt), hoặc đi qua.
3. **Hai đích bay:** HUD cho tài nguyên (đọc số rõ nhất); **nhân vật** cho sức mạnh (Mảnh Chữ về Tướng, túi về người nhặt). Đây là cách Space Typing: đồ bay về nhân vật.
4. Giữ cảm giác Space Typing: **bung → nảy → lơ lửng → hút**, thang nốt khi nhặt, gộp khi quá nhiều.

**Bảng rơi theo bậc:**

| Bậc | Vàng (ghi ngay) | Đồng hiện (bậc ảnh) | Mảnh Chữ | Túi |
|---|---|---|---|---|
| Bầy (mỗi con) | 1–4 | 1 `common` | 50 %: 1 | — |
| Nhỏ | 4–12 | 1–2 `common` | 1 | — |
| Vừa | 12–25 | 2–3 `refined` | 2 | 5 % |
| Nặng | 25–35 | 3 `high` | 3 | 15 % |
| Tinh nhuệ | 30–45 | 1 `elite` lớn + 3 nhỏ | 3 | 100 % |
| Boss phụ | 80–150 | 10 `mini-boss` | 6 | Rương nhỏ |
| Boss | 150–300 | 15 `major-boss` | 10 | Rương Boss |

- Rơi theo kỹ năng: Tanuki bị Ngắt rơi Lá Tanuki +5 Vàng. Dokkaebi bị Phong Gậy rơi Đồng Tiền Yêu Tinh +15 Vàng.
- Xác suất túi lấy từ luồng RNG "loot".

**Vàng hạ quái:**
- Cộng vào kho **ngay** tick quái chết.
- Hình: 80 ms sau tiếng chết, đồng bật lên 3,5–5 m/s, nảy một lần trên đất (hệ số 0,35), lơ lửng 0,15 s, rồi hút về ô Vàng trên HUD trong 0,5–0,6 s, nhanh dần, thu nhỏ 1 → 0,55, vệt 6 đốm. Pha bung và lơ lửng **bám mặt đất** khi kéo camera.
- Tới nơi: ô Vàng phồng ×1,18 trong 120 ms, tiếng tick theo thang nốt, số lăn 0,25 s.
- **Số hiện** = max(0; Vàng thật − giá trị đồng đang bay). Nút xây dùng Vàng thật. Rê chuột lên nút xây hay nâng: mọi đồng về đích trong 0,15 s.

**Mảnh Chữ (về Tướng):**
- Mỗi mảnh là **một chữ cái trong tên tiếng Anh của quái** (Oni rơi "o", "n", "i"). Truyện: Mực Câm xóa tên quái; hạ quái là trả tên lại.
- **Vòng hút:** Draconis 12 m, Lam 10 m, Tre 8 m. Cây Chữ +2 m. Tính quanh **chỗ Tướng đang đứng**, kể cả khi đang trợ lực.
- Quái chết **trong vòng** tick đó: Tối Thượng +0,6 mỗi mảnh, ghi ngay. Chữ cái bay cong về ngực Tướng 0,5–0,9 s, "ting" thủy tinh theo bậc Chuỗi, Tướng lóe màu riêng.
- Quái chết **ngoài vòng**: chữ cái bay lên, tan thành hạt. **Không nạp gì** (mất).
- Ý chiến thuật: Tướng ra trận gần chỗ đánh nhau thì nạp nhanh; Tướng trợ lực ở hậu phương thì nạp bằng từ gõ.
- Vòng hút mờ hiện dưới chân Tướng khi có mảnh trong 10 m quanh đó: người chơi học bán kính mà không cần đọc số.
- Tối đa 40 chữ cái bay. Quá thì gộp thành chữ to hơn.

**Túi và bùa:**
- Túi rơi tại chỗ quái chết, nảy một lần, nằm trên đất có vòng sáng.
- Túi mang một **Từ Nhặt** (3–5 chữ, đã thuộc) và vòng đồng hồ **6 s**.
- Tối đa 3 Từ Nhặt cùng lúc. Túi thứ tư nằm chờ, chưa có chữ, chưa chạy đồng hồ; vẫn nhặt được bằng đi qua.
- Tối đa 6 túi trên đất. Túi thứ bảy: túi cũ nhất tự nhặt 100 %.

| Nguồn | Trong túi (RNG "loot") |
|---|---|
| Vừa, Nặng | 15–25 Vàng (70 %) hoặc 3–5 Gỗ (30 %, chỉ bản đồ có Gỗ; không thì Vàng) |
| Tinh nhuệ | 20–40 Vàng (75 %) hoặc 1 bùa (25 %) |
| Rương nhỏ (boss phụ) | 40–60 Vàng và 1 bùa |

| Cách nhặt | Nhận |
|---|---|
| Gõ xong Từ Nhặt | 100 % |
| Tướng hoặc Trợ Thủ đi qua trong 3 m | 100 % |
| Hết 6 s | Vàng, Gỗ: 50 % tự về HUD. Bùa: mất. |

- Hình khi nhặt: túi bay tới **người gần nhất** trong 0,4 s; "+25" nổi trên đầu; người đó làm động tác bắt; đồng chảy từ người đó lên ô Vàng (Gỗ lên ô Gỗ); bùa bay vào ô vật phẩm.
- **Bùa** (dùng một lần, vào ô vật phẩm trống; hai ô đầy thì đổi 20 Vàng): Bùa Sửa (sửa một nhà 50 %, cả Đổ Nát), Bùa Băng (đóng băng quái trong 6 m, 2 s), Bùa Gió (Tướng và Trợ Thủ +30 % tốc đi 10 s).
- Test thuộc tính: tổng giá trị túi sinh ra = đã nhặt + phần mất do hết hạn (ghi riêng).

**Đồ cướp:**
- Alicanto cướp tối đa 15 Vàng mỗi lần từ đống, tối đa 2 lần. Đồng bay theo cung vào bao trên chân chim.
- Hạ chim hoặc Bắt: bao bục, đồng về đống cũ (mỏ còn đứng) hoặc về HUD. Chim lọt Lũy: mất.
- **Không bao giờ lời hơn khi không bị cướp.** Test thuộc tính.

**Rương Boss:** rơi giữa sân, tự mở sau 1,5 s, mưa đồng về HUD. Phần thưởng ngoài trận hiện ở màn kết thúc.

**Phần thưởng từ bay ra sao:** tháp: chữ của từ kéo thành vệt sau Phát Chữ; Mỏ: từ vỡ thành min(4; ⌈giá trị / 1,5⌉) đồng bay thẳng lên ô Vàng; Ruộng: bó lúa nhỏ lên ô Lúa; Trại Gỗ: khúc gỗ lên ô Gỗ; Trại Lính: đốm sáng tới lính được hồi; Đài Ấn: tia sao về chân dung Tướng; Nhà Thuốc: lá xanh xoay quanh đồng minh; Lũy: đồng vàng và một mũi nỏ sáng.

**Đống vàng ở Mỏ:** lớn dần theo 4 bậc mesh. Khi về kho: bung thành min(12; ⌈giá trị / 10⌉) đồng.

**Trần và giảm chuyển động:** đồng bay cùng lúc 120 (High), 60 (Medium), 28 (Low); vượt thì gộp vào đồng gần nhất. Rời pha đánh: mọi đồng về đích trong 0,3 s; không đồng nào bay quá 1,5 s. Giảm chuyển động: bỏ nảy, bay thẳng 0,3 s.

### 17.5 Chống lăn cầu tuyết

- Không lãi suất. Node có hạn. Thưởng quái về cuối tăng chậm hơn giá nhà. Nâng cấp kém hiệu quả dần. T_N kinh tế phẳng. Hỗ trợ cùng loại không cộng dồn. Bán 60 %. Đống vàng chỉ trả khi mỏ còn đứng. Nghỉ lò 20 s.
- **Vàng dư cuối bản đồ:** đổi điểm trận (1 điểm mỗi Vàng) và Xu = min(15; floor(Vàng dư / 60)). Không đáng để giữ vàng.
- Chỗ tiêu có hạn: 16 nhà, trần tấn công, cấp nhà, cấp Lũy, kỹ năng nhánh. Một bản đồ dựng tối đa tốn 5.000–7.000 Vàng.

---

## 18. Đợt, nghỉ, boss

### 18.1 Số đợt

| Bản đồ | Đợt |
|---|---|
| Bản đồ không boss | 6–10 |
| Bản đồ boss | Boss là **đợt cuối**. Bản đồ 1: 8 đợt. Bản đồ 2: 10. Bản đồ 3: 12. |

### 18.2 Cấu trúc một đợt

- Dài 45–90 s. 2–3 đỉnh áp lực. Giữa hai đỉnh có quãng lặng ≥ 10 s.
- Ngân sách đe dọa tăng 12–18 % mỗi đợt (bảng trong dữ liệu).
- Tối đa 8 loại quái thường mỗi bản đồ. Quái cùng lúc 20–150; đợt bầy lớn tới 300–400 (thử tải).

### 18.3 Giữa hai đợt

- Đồng hồ đợt kế bắt đầu khi đợt hiện tại sinh hết quái. Chờ 30 s (bản đồ 1–2), 20 s (sau đó).
- Nhà tự sản và phần thưởng từ vẫn chạy.
- Xây, nâng, dời người. Không cửa hàng, không chọn phúc lợi.
- Chọn: gọi sớm lấy vàng chắc, hay ở lại gõ mỏ thêm, hay **nghỉ tay** (Dừng tất cả, Nhiệt và Chuỗi đóng băng).

### 18.4 Xem trước đợt

- Cờ ở mỗi cổng, 10 s trước đợt. Rê chuột: biểu tượng và số lượng từng loại quái ở cổng đó.
- Dấu riêng: quái bay (cánh), có gõ trực tiếp (cuộn giấy), phá nhà (búa), trộm (bao tải), săn (mắt đỏ), boss (vương miện).

### 18.5 Sự kiện trong đợt

- Cơn Gấp (VS) và Heo Đất (VS). Không có hai sự kiện cùng lúc. Không có sự kiện trong 10 s đầu đợt.

### 18.6 Nghỉ tinh thần

- Cứ 3–4 đợt có một **đợt thở**: ngân sách −30 %, không gõ trực tiếp, **không Cơn Gấp**.
- Trước boss: 20 s nghỉ. 12 s đầu **không phát chữ**, Nhiệt và Chuỗi đóng băng. Có thể ôn nhanh 5 từ trong sổ trượt (không phạt).
- Tạm dừng luôn được phép. Rời cửa sổ trình duyệt: tự tạm dừng. Tạm dừng: mọi thẻ chữ mờ nhòe.

### 18.7 Boss: mẫu

| Phần | Máu | Nội dung |
|---|---|---|
| Ra mắt | 100 % | Khung cận cảnh nhỏ 2,5 s. Mô phỏng chạy tiếp. Boss nói một câu. |
| Pha 1 | 100–70 % | Đòn chính |
| Chuyển pha 1 | 70 % | Cửa sổ ấn |
| Pha 2 | 70–40 % | Thêm **một** cơ chế |
| Chuyển pha 2 | 40 % | Cửa sổ ấn |
| Pha 3 | 40–0 % | Thêm một cơ chế. Có thể cuồng nộ ở 15 %. |
| Gục | 0 % | Cảnh 2–3 s. Rương Boss. |

- Báo trước đòn trên đất ≥ 1,2 s (Dễ 1,8 s, Khó 1,0 s).
- Boss đánh nhà, Tướng; đòn trúng chỗ Trợ Thủ đứng thì Trợ Thủ hoảng.
- **Cửa sổ ấn có từ khi được dạy** (bản đồ 3). Trước đó, ở mốc chuyển pha boss chỉ "rơi xuống" hoặc "choáng" 5 s, Dễ Tổn Thương +25 %, không cần gõ.

### 18.8 Thời lượng và máu boss

| Loại | Thời gian mục tiêu |
|---|---|
| Boss nhỏ | 45–75 s |
| Boss thế giới | 2–3 phút |
| Boss cuối | 3–4 phút |

```
Máu_boss = DPS_bot × T_mục_tiêu × 0,85
DPS_bot  = DPS trung bình của bot Cân bằng lúc boss trong tầm
```
- Số khởi điểm: Mộc Tinh 4.000 (bản đồ 1) / 12.000 (bản đồ 3), Đại Bàng Tinh 8.000.

### 18.9 Cửa sổ ấn

1. Boss vào thế Đại chiêu: chuẩn bị 6 s (báo lớn), rồi niệm 6–10 s (Dễ dài hơn).
2. **Mọi dòng chữ tạm dừng:** không phát từ mới; từ đang sống vẫn bay và vẫn gõ được; tan lúc này không mất Nhiệt, Chuỗi; Nhiệt và Chuỗi đóng băng.
3. **Chỉ Tướng ấn được.** Tướng ở Đài Ấn (đủ thời gian) hoặc Lũy (×0,75). Tới nơi thì hiện cụm ấn 2–4 từ. Chưa có Tướng: dải xám "Đưa Tướng tới Đài Ấn".
4. Thành công: hủy Đại chiêu, boss choáng 2–3 s, **Dễ Tổn Thương** 8 s (+50 % sát thương nhận), Chuỗi +2.
5. Thất bại: Đại chiêu xảy ra. Sống được, không thua ngay.
6. Hết cửa sổ: dòng chữ chạy lại, lần phát đầu mỗi nhà sau 1 s.
- Trong Dễ Tổn Thương, Phát Chữ là cách dồn sát thương tốt nhất. Lúc này nên đổi tháp lên nhịp dày nhất.
- **Đòn kết** (tùy chọn): boss dưới 5 % máu hiện một từ. Gõ xong thì boss gục ngay với cảnh đẹp hơn.
- Chống chịu: chậm tối đa 30 %; choáng chỉ đủ trong Dễ Tổn Thương; boss không bị chặn, lính bị đẩy lùi khi boss đi qua.

---

## 19. Cân bằng và chiến thuật

### 19.1 Mô hình cân bằng

1. Bot Cân bằng (35 WPM, 95 %) chơi mỗi bản đồ ở mức Thường.
2. Đo DPS thật của phòng thủ mỗi đợt, gồm Phát Chữ và hào quang.
3. Chỉnh **ngân sách đe dọa** mỗi đợt để bot thắng 2–3 sao, lọt 0–4 mạng.
4. Kiểm bot Không gõ: thắng Dễ, thua Thường từ bản đồ 2.
5. Kiểm tỉ lệ nguồn vàng (17.3) và các lối chơi trội (19.6).
6. Số đổi trong dữ liệu. Luật không đổi.

**Quy về Vàng để so:** sát thương 0,05 Vàng mỗi máu hiệu dụng; Lúa 1 Vàng (giá đổi dư); Gỗ 3 Vàng; một mạng Lũy 30–50 Vàng (mất sao).

### 19.2 Một từ đáng bao nhiêu (L1, bot 35 WPM)

| Nhà | Một từ cho | Quy ra Vàng | Đáng nhất khi |
|---|---|---|---|
| Mỏ Vàng (4 s) | ~1,9 Vàng + Cục Vàng chia đều ~0,4 | ~2,3 | Lúc lặng, đầu bản đồ |
| Ruộng Lúa (4 s) | ~0,45 Lúa + Bội Thu ~0,3 | ~0,8 (cao hơn nhiều khi lính chết liên tục) | Kho Lúa thấp |
| Tháp Cung (3 s) | Phát Chữ ~22 sát thương + giữ hào quang | ~1,6 | Có quái trong tầm, nhất là quái bay |
| Tháp Pháo (3 s) | Đạn Chữ ~37 mỗi quái × 2–4 quái | ~4–7 trong đám đông, ~1,9 với quái lẻ | Bầy đông, quái tách đôi |
| Trại Lính (3 s) | Hồi sinh sớm ~2,6 s hoặc hồi ~7 % máu | ~1,5–4 (giữ chặn, chống lọt) | Nút cổ chai đang bị ép |
| Lũy Chữ | ~1,3 Vàng + 1 mũi nỏ | ~1,8 | Mọi nơi khác yên |

**Kết luận:** lúc lặng gõ ở Mỏ; lúc đám đông gõ ở Pháo; lúc nút cổ chai bị ép gõ ở Trại Lính; lúc quái bay gõ ở Tháp Cung. Từ ở tháp không ra nhiều vàng nhưng **chống lọt**, và lọt là mất sao. Đây là thế giằng co tham hay an toàn ở từng từ.

### 19.3 Chọn nhịp

- **Luật ngón tay cái:** chọn nhịp dày nhất mà bạn vẫn bắt ≥ 85 % số từ.
- Người 35 WPM: điểm ngọt một nhà là 3 s. Lên 2 s (tải 126 %) gần như không thêm gì mà làm vỡ Chuỗi (bảng 6.16).
- Người 70 WPM: 2 s ở một nhà thêm khoảng 25 % so với 3 s; 1 s gần như hết sức gõ.
- Người 20 WPM: 6 s. Lên 4 s không thêm gì.
- Cái giá của từ tan: Nhiệt −1 (hào quang giảm tới 20 %), Chuỗi −2 hoặc ÷2.

### 19.4 Chia ô và dời người

| Ô | Mẫu | Cách chơi |
|---|---|---|
| 1 | Con lắc | Tướng ở tháp lúc cao điểm, sang mỏ lúc lặng. Đi 3–8 s mỗi lần. |
| 2 | Trực mỏ | Thư Đồng đứng mỏ (vàng + chống trộm). Tướng ở tháp nút cổ chai. Dừng mỏ lúc cao điểm. |
| 2 | Tướng ra trận | Thư Đồng ở tháp chính. Tướng chặn đường, hút Mảnh Chữ, Tối Thượng nhanh. |
| 3 | Tam giác | Hai tháp kề nhau (canh Hợp Tấu) + một mỏ. Tháp 3–4 s, mỏ 6 s. |
| 4 | Người nhanh | Hai tháp 3 s + mỏ 4 s + Đài Ấn trước boss. Hoặc Trại Lính 2 s ở nút cổ chai: lính gần như không chết. |

**Khi nào dời:**
- Xem trước đợt kế đổi cổng: dời người sang làn mới trước 10 s.
- Nhà vừa Bùng Nổ, đang nghỉ lò: dời sang nhà khác.
- Có trộm ở mỏ không người. Nhà bị đánh hoặc Đổ Nát.
- Boss báo Đại chiêu (6 s): Tướng về Đài Ấn ngay; Thư Đồng giữ tháp chính.
- Tướng vừa hồi sinh ở Lũy: chọn nhà gần Lũy trước.

**Đặt nhà cho dễ trợ lực:**
- Nhà gần nhau: đi ít, Hợp Tấu dễ. Nhưng Rễ Trồi, quái nổ, quái phá nhà đánh trúng cả cụm.
- Nhà trải rộng: phủ nhiều làn, đi nhiều.
- Node giàu ở tiền tuyến: nhiều vàng, nhưng trộm và quái phá nhà tới trước. Đặt Trợ Thủ ở đó.

### 19.5 Mở màn (220 Vàng, bản đồ 1)

| Lối | Xây | Trợ lực | Điểm yếu |
|---|---|---|---|
| An toàn | Tháp Cung + Trại Lính ở khúc cua đầu (140) | Tướng ở Tháp Cung, nhịp mặc định | Ít vàng giữa trận |
| Tham | Mỏ ★★★ + Tháp Cung (160) | Tướng ở mỏ lúc lặng, tháp lúc đỉnh | Đợt 1–2 dễ lọt nếu đoán sai cổng |
| Lính | 2 Trại Lính | Tướng ở Trại Lính nút cổ chai | Quái bay |

### 19.6 Kiểm lối chơi trội

| Lối chơi | Vì sao không trội | Bot kiểm |
|---|---|---|
| Mọi ô ở mỏ | Tháp nguội, lọt quái, mất sao | Đứng Mỏ |
| Nhịp 1 s mọi nhà khi gõ chậm | Quá tải: từ tan, Chuỗi vỡ, Nhiệt thấp | Nhịp dày ẩu |
| Đặt người mà không gõ | Chỉ +15 % | Treo máy |
| Chỉ trợ lực Lũy | Phần thưởng thấp nhất | Chỉ Lũy |
| Chỉ xây tháp | Trần tấn công, thiếu chặn | Toàn tháp |
| Giữ vàng tới cuối | Vàng dư đổi rất ít | — |
| Cố để từ tan để lấy Từ Ôn | ×1,2 không bù Nhiệt và Chuỗi mất | Test đơn vị |
| Đứng mãi một tháp | Nghỉ lò, không Hợp Tấu | Đứng Một Chỗ |
| Để từ chưa chạm tan để giữ Chuỗi | Vẫn mất Nhiệt; −2 Chuỗi | Test đơn vị |

### 19.7 Cổng bot

**Cổng cứng ở bước 1** (1A, 1B, 1C) — không phụ thuộc cân bằng:

| Cổng | Điều phải đúng |
|---|---|
| Bất biến chữ | Mọi tick: chữ đầu không mơ hồ, không từ trùng, không cặp OSA ≤ 1, ≤ 16 chữ sống, dòng chữ ≤ trần chữ, ≤ 4 mỗi nhà, ≤ 3 Từ Nhặt |
| So le | Khoảng cách hai lần phát ≥ 0,2 s, trừ khi đã lùi hết 0,6 s (test ở 4 nhà × 1 s) |
| Tiền | Không chuỗi lệnh nào sinh vàng. Bị cướp rồi lấy lại không lời. Giá trị túi bảo toàn. |
| Tất định | Cùng seed và lệnh → cùng mã băm mỗi 60 tick, trên Node và Chrome |
| Hiệu năng | Mục 25.12 |
| Không lỗi | Không lỗi console, không ngoại lệ trang trong mọi kịch bản |

**Báo cáo ở bước 1, cổng cứng từ VS** (`pnpm td:balance`):

| Bot | Cách chơi | Mục tiêu |
|---|---|---|
| Cân bằng 35 WPM, 95 % | Xây trải đều, Lũy 2 ở đợt 3–4, chia ô theo 19.4, tải 90–110 % | Thắng bản đồ 1–3 Thường, 2–3 sao. Nguồn vàng theo 17.3. Tải trung bình 85–110 %. |
| Mới học 20 WPM, 1 ô, nhịp 6 s | | Thắng bản đồ 1 Thường ≥ 1 sao |
| **25 WPM, nhịp mặc định** | | Trúng ≥ 85 % số từ |
| Không gõ | Đặt người, không gõ | Thắng Dễ. Vàng ≥ 70 % bot Cân bằng. Thua Thường từ bản đồ 2. |
| Đứng Mỏ | Mọi ô ở mỏ | Thua Thường bản đồ 1 hoặc ≤ 1 sao |
| Nhịp dày ẩu 35 WPM | Mọi nhà nhịp nhanh nhất | Kém bot Cân bằng về sát thương và vàng |
| Nhanh ẩu 80 WPM, 85 % | Như Cân bằng | Không vượt bot 50 WPM 96 % về sát thương trợ lực ở cùng tải |
| Nhanh 70 WPM, 98 % | 2–3 ô | Vàng 140–200 % bot Cân bằng; vàng gõ ≤ 45 % tổng |
| **Ô thêm** | 35 WPM: 1 ô (3 s) vs 2 ô (4 s + 6 s) | 2 ô ≥ ×1,15. 2 ô ở tải 120 % ≥ ×1,0. |
| Đứng Một Chỗ | Tướng không rời một tháp | Kém bot Cân bằng ≥ 15 % sát thương trợ lực |
| Toàn tháp, Không lính, Treo máy | | Như mục 19.6 |
| Nghẽn chữ | 4 ô nhịp 1 s, cấp từ vựng ≥ 5 | < 1 % lần phát. Cấp 1–3: chỉ báo cáo. |
| Boss | Bot Cân bằng | Thời gian hạ boss trong khoảng 18.8 |

**Cổng người thật** (chủ dự án chơi): hiểu "gõ chữ bay lên ở nhà thì nhà mạnh" trong 1 phút; tự đổi nhịp ít nhất một lần; dùng ô thứ hai không cần nhắc lần hai; vẫn nhìn bản đồ; người gõ cẩn thận mạnh hơn người gõ nhanh mà ẩu; nói được vừa nhặt gì và vì sao; chơi 3 và 4 ô vẫn đọc được chữ.

### 19.8 Khắc chế nhanh (Thế giới 1)

Ma trận đủ ở mục 22.10.

| Quái | Nhà, nhánh | Gõ | Người |
|---|---|---|---|
| Cương Thi (bầy nhanh) | Pháo, Trại Lính | Neo con dẫn bầy | Trại Lính nhịp dày ở nút cổ chai |
| Đàn Ma Trơi (bay thấp) | Tháp Cung, nổ của Draconis | Phát Chữ xuyên | Draconis ra trận |
| Nuppeppō (tách đôi) | Pháo, Thư Pháp L3 | Đạn Chữ (nổ) | — |
| Thuồng Luồng (giáp nặng) | Thư Pháp, Pháo L3 | Từ Hoàn hảo (chí mạng) | Draconis |
| Tanuki (hồi máu) | Tháp Cung dồn hỏa | Ngắt | — |
| Oni (phá nhà) | Lính Khiên, Rào, Thư Pháp | Từ sửa | Đứng ở nhà bị nhắm |
| Troll (khiên vòm) | Lính, Lam, hơi thở lửa | Phá Khiên | Lam ra trận |
| Alicanto (trộm) | Tháp Cung, Thần Tiễn | Bắt | Trợ Thủ đứng mỏ |
| Tất Phương (nổ) | Tháp Cung bắn xa, Mực Băng | — | — |
| Ma Da (tàng hình) | Đài Ấn, Thần Tiễn | Hiện Hình | Tre |
| Dokkaebi (triệu hồi) | Tháp Cung | Phong Gậy | Lam |
| Chồn Liềm (né) | Thư Pháp, tháp có Ā·m_eff ≥ 0,5 | Gõ chuẩn ở tháp | Bất kỳ ai ở tháp |

---

## 20. Độ khó, tiến trình, mở dần, trợ năng

### 20.1 Độ khó

| Thông số | Dễ (Thư Thả) | Thường | Khó (Lão Luyện) |
|---|---|---|---|
| Sàn kỳ vọng E | 12 | 20 | 35 |
| Hệ số tuổi từ k_L | 1,25 | 1,0 | 0,9 (tối thiểu 2,7 s) |
| Nhịp thêm | 8 s | — | — |
| Nhịp Cơn Gấp | 2 s | 1 s | 1 s |
| Hệ số cửa sổ gõ trực tiếp k | 2,8 | 2,2 | 1,6 |
| Ngân sách đe dọa | ×0,75 | ×1,0 | ×1,25 |
| Vàng đầu | ×1,15 | ×1,0 | ×0,9 |
| Báo trước đòn boss | 1,8 s | 1,2 s | 1,0 s |
| Nghĩa tiếng Việt | Luôn | 2 lần đầu | Lần đầu |
| Dải Chữ đầy đủ | Luôn | Khi có nhà khuất | Khi có nhà khuất |
| Chậm khi ra lệnh | Bật | Tắt | Tắt |
| Thắng khi không gõ | Có | Không, từ bản đồ 2 | Không |

- Khó tăng bằng thành phần đợt, thời điểm, kỹ năng quái. Không chỉ nhân máu.
- Thử thách (sau khi qua bản đồ): **Anh Hùng** (6 đợt tinh nhuệ, 1 mạng), **Sắt** (1 đợt lớn, giới hạn loại nhà, 1 mạng, cấm vật phẩm), **Một Ô** (chỉ Tướng), **Bốn Ô** (Lũy 4 và đủ Trợ Thủ ngay từ đầu, dành cho người gõ nhanh; mở từ 1B trong hộp cát), **Nhịp Lửa** (mọi nhà chỉ 2 s và 1 s). Vô Tận, Thử thách ngày: sau MVP.
- Thua 2 lần liền: gợi ý hạ độ khó. Thắng 3 sao Thường hai bản đồ liền với E ≥ 60: gợi ý Khó. Không ép.

### 20.2 Sao

| Kết quả | Sao |
|---|---|
| Thắng với 18–20 mạng | 3 |
| 6–17 mạng | 2 |
| 1–5 mạng | 1 |
| Thử thách Anh Hùng, Sắt | +1 mỗi cái (tối đa 5 sao mỗi bản đồ) |

### 20.3 Mở khóa tài khoản

Thế giới, Tướng, Trợ Thủ, thử thách, chương truyện, bách khoa quái.

### 20.4 Bảng dạy (một bảng duy nhất)

Mỗi tính năng mới có một câu của Bà Cú Mực và một chip mẹo. Không có màn chữ dài.

| Khi nào | Mở và dạy | Cách dạy |
|---|---|---|
| Bản đồ 1, đợt 1 | Dòng chữ, nhịp mặc định (6 s hoặc 4 s), Nhiệt (đèn lồng), Tháp Cung | "Đưa Draconis tới tháp. Gõ chữ bay lên." |
| Bản đồ 1, đợt 2 | Đổi nhịp; Trại Lính chặn đường; quái bay thấp | Chip gợi ý nhịp |
| Bản đồ 1, đợt 3 | Mỏ Vàng có trợ lực; Từ Vàng đầu tiên chắc chắn ra | Huy chương "Đợt 3 Không Tan Từ" |
| Bản đồ 1, đợt 4 | **Lũy cấp 2, Thư Đồng Chấm, ô thứ hai**; Tháp Pháo cho bầy | Chấm chạy ra từ cổng Lũy; gợi ý Shift + chuột phải |
| Bản đồ 1, đợt 5 | Gõ trực tiếp đầu tiên: **Ngắt** (Tanuki) | Quái đầu tiên có cuộn giấy |
| Bản đồ 1, đợt 6 | Đợt thở; Alicanto cướp đống vàng → để Chấm đứng mỏ | Câu cảnh báo "Có trộm ở mỏ" |
| Bản đồ 1, đợt 7 | Tổng hợp | — |
| Bản đồ 1, đợt 8 | Boss nhỏ Mộc Tinh: máu, Rễ Trồi làm nhà tê, rút lui ở 50 %. **Không cửa sổ ấn.** | 12 s nghỉ trước boss |
| Bản đồ 2 | Ruộng (Ao Cá) và Lúa; Neo; Phá Khiên; túi và Từ Nhặt; cụm chốt và Bùng Nổ; Đài Ấn (cụm, nghe rồi gõ); Tối Thượng (chưa có Chữ Chiêu); nhà L2 và nhịp 2 s; Heo Đất; Tất Phương; Chồn Liềm | Mỗi đợt tối đa 1 ý mới |
| Bản đồ 3 | Oni và từ sửa; Bắt; Phong Gậy; Hiện Hình; Cơn Gấp; nhà L3 và nhịp 1 s; Hợp Tấu; Từ Sao, Từ Lá; **cửa sổ ấn và Chữ Chiêu** ở boss | Mỗi đợt tối đa 1 ý mới |
| Hết Thế giới 1 | Trợ Thủ thứ hai (Phẩy), Lũy cấp 3, nhánh, Gỗ | — |
| Hết Thế giới 2 | Trợ Thủ thứ ba (Gạch) | — |
| Học Viện cấp 5 | Lũy cấp 4, ô thứ tư | — |

- Bản đồ 1 dạy 9 ý trong 8 đợt; mỗi đợt nhiều nhất 2 ý.
- Hộp cát và thử thách bỏ qua bảng này (mọi thứ mở bằng cờ).
- Chơi lại bản đồ đã qua: tính năng đã học thì bật (ví dụ boss bản đồ 2 có cửa sổ ấn khi đã qua bản đồ 3).

### 20.5 Lưu

| Lớp | Nội dung |
|---|---|
| Hồ sơ | Cài đặt, trợ năng, mức nền B, **nhịp ưa thích theo loại nhà**, phím đã đổi, vị trí Dải Chữ |
| Chiến dịch | Sao, kỷ lục, huy chương, thử thách đã qua, tính năng đã dạy |
| Tướng | Cấp, XP, điểm kỹ năng |
| Trợ Thủ | Đã có, cấp, sở trường |
| Cơ sở | Cấp Học Viện, Cây Chữ, bản vẽ |
| Kho | Xu, Tri thức, vật phẩm |
| Học | Độ thuộc và ngày ôn từng từ, sổ trượt chưa ôn |
| Ván dở | Đầu ván (phiên bản luật, mã băm nội dung, bản đồ, seed, độ khó, Tướng, Trợ Thủ, danh sách từ, B) + nhật ký lệnh |

- Dùng `src/platform/safe-storage.ts`. Khóa bắt đầu bằng `td.`. Mỗi lớp có số phiên bản và hàm nâng phiên bản.
- Ván dở: tự lưu đầu mỗi đợt. Khôi phục bằng chạy lại lệnh, so mã băm.

### 20.6 Trợ năng

- **Chữ:** cỡ chữ cần gõ 80–150 %; chế độ khay (mọi từ xếp ở Dải Chữ thay vì bay trên nhà); chữ đứng yên (không bay, chỉ vạch đồng hồ ngắn dần); nghĩa tiếng Việt luôn hiện / chỉ từ mới / ẩn.
- **Nhịp:** khóa nhịp tối đa (chỉ cho chọn tới 2 s); tốc độ game 0,75×; Chậm khi ra lệnh.
- **Màu:** chế độ mù màu đỏ–lục và lam–vàng; mép thẻ có hoa văn theo họ nhà; mọi báo trước có hoa văn.
- **Chuyển động:** giảm rung, giảm chớp (toàn màn ≤ 1 lần mỗi giây, độ mờ ≤ 0,2), giảm chuyển động.
- **Âm thanh:** thanh trượt riêng mỗi bus; tần suất câu hô Đầy đủ / Ít / Tắt; phụ đề.
- **Không cần chuột:** mọi việc trong đợt có phím (mục 8.3).
- Nhắc nghỉ sau 30 phút (20 phút hồ sơ trẻ em).

---

## 21. Học trong game

### 21.1 Kế hoạch từ mỗi bản đồ

| Phần | Tỉ lệ | Khởi động lạnh |
|---|---|---|
| Từ đã thuộc đến hạn ôn | 60 % | Hàng ôn rỗng → lấy từ cấp hiện tại |
| Từ ở cấp hiện tại | 25 % | — |
| Từ mới | 15 % (tối đa 8 mỗi bản đồ) | — |

- Từ mới chỉ ra ở nhịp ≥ 3 s, Thư Pháp, Đài Ấn. Không làm Từ Hiếm, Từ Nhặt, Chữ Chiêu.
- Lần đầu gặp từ mới ở Đài Ấn: giọng đọc đọc to. Âm khác hạ xuống.
- Bộ từ theo nhà là **ưu tiên chủ đề** (mục 22.5). Thiếu thì lấy từ cùng cấp. Độ dài theo E thắng độ dài theo nhà.
- Không lặp từ tới khi hết dải (luật `WordPicker`). Bộ chọn từ nhận RNG theo seed, chạy trong mô phỏng.

### 21.2 Nghĩa tiếng Việt

- Hiện dưới từ trong 2 lần gặp đầu. Sau đó ẩn.
- Dễ và hồ sơ trẻ em: luôn hiện. Khó: chỉ lần đầu.
- Từ Ôn: luôn hiện. Sai 3 lần trong một từ: hiện lại nghĩa.

### 21.3 Độ thuộc (ôn cách quãng)

| Sự kiện | Độ thuộc (0–5) |
|---|---|
| Hoàn hảo hoặc Chớp, và tốc gõ thuần ≥ 0,8 × E × d | +1 |
| Ẩu | −1 (không dưới 0) |
| Đã gõ ≥ 1 chữ rồi để tan | Không trừ. Dời ngày ôn về hôm nay. |
| Tan mà chưa chạm | Không đổi (người chơi có thể đang chọn bỏ qua) |
| Chuộc lại Từ Ôn | Ghi "đã sửa". Không cộng thêm. |

- Lần ôn kế: 1 / 2 / 4 / 7 / 15 / 30 ngày theo độ thuộc.
- "Tan mà chưa chạm không phạt": chọn bỏ một từ để lo việc khác là chiến thuật, không phải quên từ.

### 21.4 Trong trận và ngoài trận

| Trong trận | Ngoài trận (Học Viện) |
|---|---|
| Từ ở nhà | Ngữ pháp, mẫu câu |
| Cụm từ, nghe rồi gõ, gõ theo nghĩa ở Đài Ấn | Đọc hiểu |
| Cụm ấn boss | Trắc nghiệm nghĩa Việt ↔ Anh |
| Phản hồi từng chữ cái | Phát âm |
| Từ Ôn | Ôn trận, phòng luyện nhịp |

### 21.5 Ôn trận cuối bản đồ

- Tùy chọn, 60–90 s. Thứ tự: từ tan sau khi đã gõ dở → từ Ẩu → từ mới.
- Mỗi từ: nghĩa, phát âm, gõ lại. Thưởng 10 Tri thức và +10 % Xu.

### 21.6 Sự kiện học

- Một sự kiện mỗi từ, gộp gửi mỗi 5 s.
- Giữ `gameId: "space-typing"` (cổng cha chỉ nhận id này, `src/learning/shared.ts`). Phân biệt bằng `activityType` (mục 0.6). Đổi `gameId` làm cuối cùng, khi repo cha nhận id mới.

### 21.7 Phân tích

- Lưu cục bộ trước. Gửi lên chỉ khi có đồng ý. Không thông tin cá nhân. Hồ sơ trẻ em không gửi.
- Sự kiện: `map_start`, `map_end`, `wave_start`, `wave_end`, `build`, `upgrade`, `branch`, `sell`, `ruined`, `repaired`, `keep_level`, `unit_assign` (người, từ nhà, tới nhà, ETA, chuột hay phím), `unit_scared`, `tempo_change`, `word_result` (gộp 5 s theo nhà và nhịp: phát, trúng theo kết quả, tan chạm / chưa chạm, t_done, lỗi), `chain_tier`, `rare_word`, `rush`, `overdrive`, `harmony`, `word_jam` (nghẽn chữ, theo cấp từ vựng), `loot_pickup` (cách nhặt), `direct_result`, `seal_result`, `ult_cast` (số Chữ Chiêu), `hero_death`, `leak`, `ui_focus` (ân hạn ra lệnh), `pause`, `quit`.
- Chỉ số: tải trung bình W / K; tỉ lệ trúng theo nhịp; số ô dùng thật; thời gian Tướng ra trận và trợ lực; tỉ lệ nguồn vàng; đợt người chơi bỏ cuộc.

### 21.8 Chống gian lận

- Bỏ phím `isTrusted === false`, phím giữ lặp. Không có đường dán chữ.
- Gắn cờ ván: > 200 WPM liên tục ≥ 10 từ; hoặc CV khoảng phím < 0,08 trên ≥ 30 phím; hoặc ≥ 5 khoảng liên tiếp < 15 ms.
- Ván bị cờ: không cập nhật mức nền bằng tốc tuyệt đối; không thưởng ngoài trận vượt mức gốc; không vào bảng xếp hạng. Không tố cáo trên màn hình.
- Pha chuẩn bị không thưởng. Đồng hồ đợt kế cố định. Tạm dừng che chữ.

---

## 22. Nội dung Thế giới 1: Miền Văn Điền

Id viết kebab-case, dùng thẳng trong `src/td/content`. **[1A] [1B] [VS]** là pha có mặt.

### 22.1 Thế giới, truyện, giọng điệu

- **Vạn Chữ** (EN *the Wordwoven Realm*): chữ là sức sống. Vật gì có tên được viết và đọc đúng thì đứng vững. Dưới đất chạy **Mạch Chữ**, những dòng sáng chở chữ đi khắp nơi.
- **Chữ bay và năm ngọn đèn:** mỗi nhà ở Văn Điền treo năm đèn lồng giấy dưới mái. Khi có người đốc việc, chữ từ Mạch Chữ trồi qua mái và bay lên. Ai đọc và viết lại kịp thì chữ thành sức cho nhà, một ngọn đèn sáng thêm. Không ai đọc thì chữ tan vào gió, một ngọn đèn tắt. Đây là lý do trong truyện của dòng chữ và của Nhiệt.
- **Khe Nứt:** một cơn **Lặng Chữ** làm người ta quên từ ngữ. Mạch Chữ khô, tấm vải thế giới mỏng đi và rách thành Khe Nứt. Bên kia là **Biển Truyện Lạc**, nơi trôi dạt truyện bị lãng quên của mọi miền đất; vì vậy quái đến từ nhiều nền văn hóa.
- **Mực Câm** (kẻ thù): vệt mực sống ăn chữ. Nó bám vào sinh vật truyện và xóa tên chúng. Hạ quái là trả tên lại: chữ cái của tên bung ra thành **Mảnh Chữ**.
- Khe Nứt cũng mở trên **Biển Sao** của Space Typing. Draconis bay qua một khe như vậy. Bí ẩn để dành: **Kẻ Cầm Tẩy**, bóng người đội nón rộng vành ở mép Khe Nứt.
- **Miền Văn Điền:** ruộng bậc thang, thác bạc, làng tre, bờ đá vôi, rừng rễ cổ. Bảng màu: xanh mạ, vàng lúa, bạc nước, nâu tre, đỏ son cầu, trắng đá vôi. Chữ trang trí là chữ Latin viết bằng cọ.
- **Cốt truyện:** Bản đồ 1 giữ Lũy đầu tiên; cây đa cổ mất tên thức dậy thành Mộc Tinh, bị đẩy lùi. Bản đồ 2: Đại Bàng Tinh cắp thuyền và vàng của làng Rái Đá; hạ nó, lấy chiếc lông khắc nửa tên cây đa. Bản đồ 3: theo rễ vào rừng; Lam đọc đúng tên người nhận trong lá thư của bà mình chính là cây đa; Mộc Tinh hóa lại thành cây, để lại hạt giống và một mảnh sao. Thông điệp: **đọc đúng, viết đúng thì giữ được thế giới; nhanh mà ẩu thì cháy thư.**
- **Giọng điệu:** sách tranh tươi, hài nhẹ, ấm. Không máu, không xác. Người và thú nhỏ chibi 2,5–3 đầu; quái lớn, boss giữ tỉ lệ to.
- **Tôn trọng văn hóa:** chỉ sinh vật, yêu quái, hồn dân gian. Không thần, Phật, thánh, tổ tiên, vật được thờ. Không đình, chùa, miếu, đền, torii, tháp Chăm, thánh giá. Bùa Cương Thi để trống. Đài Ấn là đài đá khắc chữ, không bàn thờ, không hương. Đèn lồng là đèn giấy làng quê.

**Dân tộc và phe:** Người Văn Điền (lính, tổ thợ); Hỏa Miêu (tộc mèo lửa trên vách thác, Lam); Rái Đá (rái cá biển, Vịnh Đá Trắng); Cú Thư (cú già giữ sách; cú non học việc là Thư Đồng); Rồng Biển Sao (chỉ Draconis). Phe: Hội Khắc Chữ (Bà Cú Mực), Dân Quân Văn Điền (Đội trưởng Sấm), Đội Phi Thư (Lam), Phường Thợ Tre (Tre), Mực Câm, Lạc Truyện (sinh vật bị mực bám, không ác bẩm sinh).

### 22.2 Tướng

| Tướng | Vai | Di chuyển | Vòng hút | Kênh mạnh | Nhà ái lực | Màu | Pha |
|---|---|---|---|---|---|---|---|
| Draconis | Quái thú bay, phép diện rộng, chống bay | Bay 6 m/s | 12 m | Chuẩn | Thư Pháp, Pháo, Đài Ấn | Cam đào `#F2994A` | 1A |
| Lam | Đấu sĩ nhanh, cận chiến | Chạy 6,5 m/s + lướt | 10 m | Tốc | Tháp Cung, Trại Lính | Cobalt `#2F6BFF` | 1B (khối tạm), model thật khi có Tripo |
| Tre | Hỗ trợ, kỹ sư | Chạy 4,5 m/s + bắc cầu | 8 m | Mượt | Mỏ, Ruộng, Trại Gỗ, Lũy, sửa nhà | Lục tre `#A8D05A` | VS |

**Draconis — Phượng Long Biển Sao** (`draconis`, EN *Star-sea Phoenix Dragon*). Model có sẵn `heroes/draconis-v2`. (model tạm: rồng đỏ cánh màng; dáng TD theo ảnh 3.png bên dưới; model mới là P18 trong `docs/art-requests/td/01-tripo-characters-enemies.md`)
- **Ngoại hình** (như ảnh 3.png): rồng hai chân, thân trắng, đuôi dài; cánh lông vũ vàng kem viền đỏ cam như lửa; móng và giáp đen vàng. Không chibi, to gấp 2–3 tướng khác. Đầu Thế giới 1 cánh có vệt mực tím, mờ dần qua từng bản đồ.
- **Chỉ số cấp 1:** máu 650; giáp 30 %, KP 30 %; cầu lửa 22–34 P, nổ 1,8 m, mỗi 1,6 s, tầm 9 m, đánh đất và bay; hồi sinh 20 s; không chặn.
- **Kỹ năng:**

| Kỹ năng | Bậc 1 | Bậc 2 | Bậc 3 |
|---|---|---|---|
| Hơi Thở Phượng Hỏa (tự động, ≥ 4 quái trong nón) | Nón 7 m, 3 s, 18 P mỗi 0,5 s, cháy 3 s. Hồi 14 s. | 23 P mỗi 0,5 s | Để vũng cháy 3 s, 5 P/s |
| Tiếng Gầm Cổ Tinh (tự động) | Choáng 1,2 s trong 6 m; quái bay rơi 2 s. Hồi 18 s. | Hồi 14,4 s | Quái trúng bị đánh dấu 4 s |
| Nội tại: Lửa Canh Mái | Ở Thư Pháp, Pháo, Đài Ấn: đậu mái (quái đất không với tới); Phát Chữ thêm cháy 3 P/s 2 s. **Không có phạt ở nhà kinh tế.** | +5 % phần thưởng từ ở nhà ái lực | Dư âm +2 s, vào việc 0,2 s |
| Tối Thượng: Mưa Lông Lửa | Vùng 12 m, 12 lông lửa trong 2 s, mỗi chiếc 60 P, vũng cháy 5 s 8 P/s. Chữ Chiêu: mỗi từ +3 lông. | Mỗi lông 72 P | Hồi tối thiểu 35 s |

- Từ Chữ Chiêu ưu tiên: fire, ash, wing, star, glow, burn, flame.
- **Tính cách:** cổ xưa, kiêu hãnh, nói chậm, hài khô, quý chữ. **Xuất thân:** người canh Biển Sao; Mực Câm ăn mất tên một chòm sao. **Động cơ:** tìm gốc Khe Nứt, lấy lại tên chòm sao. **Cung truyện:** từ coi thường "nhà nhỏ, ruộng nhỏ" tới chịu đậu trên mái kho lúa để giữ nó.

**Lam — Lam Hỏa Miêu** (`lam`, EN *Azureflame Courier*).
- **Ngoại hình** (cùng tinh thần ảnh 2.png, thiết kế riêng): mèo Hỏa Miêu chibi 2,5 đầu, tai nhọn, mắt xanh to, mõm trắng; lửa lam viền trắng quanh vai, đuôi, chỏm tai (lửa là VFX, không vào ảnh gửi Tripo); áo khoác đưa thư kiểu techwear kỳ ảo, vải chần xanh đen, dây đai chéo, viền rune xanh; mũ trùm có huy hiệu phong bì có cánh; túi thư, ống thư sau lưng; găng hở ngón, giày chạy đế dày. Lửa xanh khi Chuỗi cao, ngả cam khói khi Chuỗi vừa vỡ.
- **Chỉ số cấp 1:** máu 420; giáp 30 %; 14–20 VL + 4 P mỗi 0,8 s, cận chiến 1,8 m, chỉ đất; chạy 6,5 m/s, tự lướt 8 m (hồi 6 s); nhảy được Đá Kê; hồi sinh 14 s; chặn 1 quái thường.

| Kỹ năng | Bậc 1 | Bậc 2 | Bậc 3 |
|---|---|---|---|
| Vuốt Lam Liên Hoàn (≥ 3 quái trong 2,5 m) | 3 nhát quạt 120°, mỗi nhát 25 VL. Hồi 9 s. | 33 VL | Nhát cuối hất lùi 1,5 m |
| Dấu Lửa Phi Thư (khi chạy ≥ 10 m) | Vệt lửa 12 m, 4 s, 10 P/s. Hồi 12 s. | 13 P/s | Chậm 15 % |
| Nội tại: Phi Thư Tốc Hành | Tháp Cung: Tên Chữ của Lam xuyên thêm 1. Trại Lính: phần thưởng ×1,2. | +5 % ở nhà ái lực | Dư âm +2 s, vào việc 0,2 s |
| Tối Thượng: Hỏa Tốc | Lao 20 m dọc đường, 120 VL mỗi quái đất, vệt lửa 6 s; kết thúc ở nhà gần nhất trong 10 m và trợ lực ngay. Chữ Chiêu: mỗi từ lao thêm 5 m. | 144 VL | Hồi tối thiểu 35 s |

- Từ Chữ Chiêu ưu tiên: run, dash, fast, blue, mail, swift, wind.
- **Tính cách:** nhanh nhảu, hay khoe, tốt bụng, ghét chữ sai ("Sai một chữ, lạc cả lá thư!"). **Động cơ:** bà để lại một lá thư chưa gửi; Lặng Chữ xóa tên người nhận. **Cung truyện:** từ chạy ẩu, lửa ngả cam khói, tới hiểu "nhanh mà chuẩn thì lửa mới xanh". Bài học trùng bài học gõ phím.

**Tre — Thợ Cả Tre Xanh** (`tre`, EN *Bamboo Wright*).
- **Ngoại hình:** cô thợ mộc 15 tuổi chibi 2,5 đầu; tóc búi cắm bút chì tre, khăn rằn; áo bà ba nâu xắn tay, tạp dề da nhiều túi; quần ống rộng, guốc gỗ; gùi tre có cần cẩu gấp; búa gỗ to; ná cao su; bên cạnh luôn có Chuồn Chuồn Tre.
- **Chỉ số cấp 1:** máu 360; ná 8–12 VL mỗi 1,0 s, tầm 7 m, đánh đất và bay thấp; chạy 4,5 m/s; mỗi đợt bắc một Cầu Tre ở điểm đánh dấu (ai đi bộ cũng dùng); hồi sinh 12 s; chặn 1 quái thường.

| Kỹ năng | Bậc 1 | Bậc 2 | Bậc 3 |
|---|---|---|---|
| Rào Tre (quái tới 8 m nhà Tre đứng) | Rào 150 máu, chặn 3 quái đất, 8 s. Hồi 16 s. | 195 máu | Gai 5 VL/s |
| Chuồn Chuồn Tre | Sửa nhà hư nặng nhất trong 20 m 6 máu/s trong 6 s; không có nhà hư thì lộ tàng hình 6 m. Hồi 15 s. | Hồi 12 s | Chuồn chuồn có vòng hút Mảnh Chữ 4 m riêng |
| Nội tại: Thước Thợ Cả | Mỏ, Ruộng, Trại Gỗ, Lũy: phần thưởng ×1,15; từ sửa 16 %; nâng cấp khi Tre đứng đó rẻ 10 %. | +5 % ở nhà ái lực | Dư âm +2 s, vào việc 0,2 s |
| Tối Thượng: Giàn Giáo Thần Tốc | Mọi nhà trong 14 m: hồi 30 % máu, Đổ Nát dựng lại 50 %, +20 % sản lượng và tốc bắn 10 s. Chữ Chiêu: mỗi từ +10 % hồi, +2 s buff. | 36 %, +24 % | Hồi tối thiểu 35 s |

- Từ Chữ Chiêu ưu tiên: build, nail, beam, wood, saw, fix, roof.
- **Tính cách:** thực tế, lém lỉnh, "Đo hai lần, cắt một lần" (chuẩn trước). **Động cơ:** Lặng Chữ xóa nửa sổ bản vẽ của bố; cầu sập, bố kẹt bên kia sông. **Cung truyện:** từ "tự làm hết" tới tin bàn tay người khác.

**Thoại Tướng** (EN ≤ 5 từ là câu hô mặc định; VI dùng khi chọn giọng Việt và trong tranh truyện):

| Lúc | Draconis | Lam | Tre |
|---|---|---|---|
| Chọn 1 | I am listening. · Ta nghe. | Express delivery! · Thư hỏa tốc đây! | Tre, reporting! · Thợ cả Tre đây! |
| Chọn 2 | This sky has a name. · Bầu trời này cũng có tên. | Blue flame, ready! · Lửa lam, sẵn sàng! | Measure twice, cut once. · Đo hai lần, cắt một lần. |
| Di chuyển | Taking wing. · Cất cánh. | On my way! · Chạy liền! | Let me check it. · Để em xem chỗ đó. |
| Trợ lực | Speak true. I burn. · Đọc cho đúng. Ta thổi lửa theo. | Type fast, shoot fast! · Gõ nhanh, bắn nhanh! | Steady hands, more gold! · Gõ đều tay, mỏ ra vàng! |
| Kỹ năng 1 | Phoenix fire! · Lửa phượng! | Blue claws! · Vuốt lam! | Barricade! · Rào lại! |
| Kỹ năng 2 | Fall, sky-thieves! · Rơi xuống, lũ trộm trời! | (tiếng lửa) | Fly, dragonfly! · Bay đi, chuồn chuồn! |
| Tối Thượng | Feathers of flame, fall! · Lông lửa, hãy mưa! | Express fire! Move! · Hỏa tốc, tránh đường! | Everyone, scaffolds up! · Cả làng, dựng giàn! |
| Máu thấp | My scales crack. · Vảy ta nứt rồi. | My flame's flickering... · Lửa em chập chờn... | Can't hammer this... · Cái này búa không sửa được... |
| Gục | I return from ash. · Ta sẽ về từ tro. | Undelivered... · Thư... chưa gửi... | Keep Dad's notebook... · Sổ của bố... giữ giùm em... |
| Hồi sinh | Ash cannot hold me. · Tro không giữ nổi ta. | Couriers never quit! · Phi Thư không bỏ cuộc! | (chạy ra) · Em về rồi! |
| Thắng | Another name kept. · Thêm một cái tên được giữ. | Delivered! · Giao thành công! | Done! Solid as stone. · Xong! Chắc như đá tảng. |
| Hút nhiều Mảnh Chữ | Their names return. · Tên của chúng trở về rồi. | Got every letter! · Nhặt hết, không sót chữ nào! | (tiếng gỗ gõ) · Gom đủ rồi! |
| Chuỗi 10 | Letters, aligned like stars. · Từng chữ, như sao xếp hàng. | Every letter, perfect! · Chuẩn từng chữ! | Steady now! · Đều tay rồi đó! |
| Chuỗi 25 | The sky listens. · Bầu trời đang nghe ngươi. | Right on time! · Thư đi đúng giờ! | Fits like a joint! · Khớp như mộng gỗ! |
| Chuỗi 50 | A whole constellation. · Cả chòm sao sáng rồi. | Faster than wind! · Nhanh hơn gió! | Whole workshop humming! · Cả xưởng chạy êm! |
| Chuỗi 100 | I've never seen this. · Ta chưa thấy ai gõ thế này. | Grandma, I did it! · Bà ơi, cháu làm được rồi! | Dad, look! · Bố ơi, nhìn nè! |
| Hợp Tấu | Two fires, one song. · Hai ngọn lửa, một bài ca. | Whole team's on fire! · Cả đội cùng cháy! | Two houses, one beat! · Hai nhà một nhịp! |
| Đủ Chữ Chiêu | More feathers, fall! · Lông lửa, rơi nữa! | Express, again! · Hỏa tốc lần hai! | One more floor! · Dựng thêm tầng nữa! |
| Đứng chờ | Small houses. Pretty, though. · Nhà các ngươi nhỏ thật. Đẹp, nhưng nhỏ. | Standing still itches. · Đứng yên lâu, đuôi ngứa quá. | Who built this crooked? · Ai dựng cái tháp này lệch hai phân vậy? |

### 22.3 Thư Đồng (Trợ Thủ Thế giới 1) và người kể

- **Ngoại hình chung:** cú non tròn như cục bông, **cao 1,1–1,3 m trong game** (đọc được ở camera mặc định), 2 đầu. Lông tơ xám nâu, mắt to tròn, mỏ vàng nhỏ. Cánh còn ngắn: **đi bộ** lò dò, chỉ vỗ cánh khi sợ hoặc reo. Đeo **bảng đá** chéo trước ngực, bút lông cắm sau lưng, mũ học trò vải. Một model, ba bộ gắn, một khung xương chung.

| Thư Đồng | id | Màu dây | Hoa văn dây (mù màu đọc được) | Dấu riêng | Sở trường | Tính cách | Vào đội |
|---|---|---|---|---|---|---|---|
| Chấm (Dot) | `helper-cham` | Tím `#9B5DE5` | Chấm | Kính tròn to, khăn chấm trắng | Xạ | Cẩn thận | Bản đồ 1, đợt 4 |
| Phẩy (Comma) | `helper-phay` | Hồng `#FF8FB1` | Dấu phẩy | Lông đuôi cong như dấu phẩy | Trống | Lắm lời | Sau Mộc Tinh (hết Thế giới 1) |
| Gạch (Dash) | `helper-gach` | Nâu đồng `#B07A4F` | Gạch ngang | Sọc ngang trên cánh | Thợ | Ít nói | Sau boss Thế giới 2 |

- Sở trường Lang chưa ai có; Học Viện cấp 3 cho đổi sở trường.
- **Đứng ở đâu:** cạnh tổ thợ ở ổ. Động tác theo nhóm nhà: tháp → viết từ lên bảng đá, giơ cao; Trại Lính, Lũy → đánh trống con; kinh tế → quay tời, gõ búa con; hỗ trợ → quạt nồi, lật sách.

| Lúc | Chấm | Phẩy | Gạch |
|---|---|---|---|
| Được chọn | Here! · Có em! | Yes, um, here! · Dạ, em, à, đây! | Yep. · Ừ. |
| Đi | On my way. · Em đi liền. | Going, going! · Đi, đi, đi nè! | Going. · Đi. |
| Tới nơi | Slate ready. · Bảng sẵn rồi. | Where's the drum? · Trống đâu, trống đâu? | On it. · Vào việc. |
| Từ Vàng | Golden word! · Chữ vàng kìa! | Ooh, gold! · Ôi, ôi, vàng! | Nice. · Được. |
| Hoảng | My glasses! · Ái! Kính em! | Run, run! · Ối, chạy, chạy! | Oof. · Ui. |
| Thắng | Full stop! · Chấm hết câu! | Great, great! · Hay quá, hay, hay! | Done. · Xong. |

**Bà Cú Mực** (`narrator`), cú già của Hội Khắc Chữ, giọng ấm, chậm, hơi hài. Câu dạy chỉ nói lần đầu; không nói khi boss báo đòn.

| Lúc | EN · VI |
|---|---|
| Đợt tới | Here they come. Hold your words! · Chúng đến rồi. Giữ chữ cho chắc! |
| Đợt cuối | Last wave. Type it beautifully. · Đợt cuối. Gõ cho đẹp nào. |
| Boss tới | Something huge approaches... · Thứ gì to lắm đang tới... |
| Lũy yếu | The Bastion is failing! · Lũy Chữ sắp vỡ! |
| Tối Thượng sẵn | Your power is ready. · Sẵn sàng rồi đó. |
| Dạy đợt 1 | Send Draconis. Type the rising words. · Đưa Draconis tới tháp. Gõ chữ bay lên. |
| Lũy cấp 2 | Dot, go help them. · Chấm đâu, ra giúp đi con. |
| Có trộm ở mỏ | A thief at the mine! · Có trộm ở mỏ kìa! |
| Cơn Gấp | That house needs hands! · Nhà kia đang cần người! |
| Heo Đất | A lost piggy! Type it! · Heo đất chạy lạc kìa! Gõ tên nó đi! |
| Từ Hiếm đầu | Don't let that one go. · Chữ sáng thế kia, đừng để bay mất. |
| Thắng / Thua | The valley remembers. · Thung lũng còn nhớ tên mình. / Let's read it again. · Không sao. Đọc lại từ đầu nhé. |

### 22.4 Nhà: hình, tổ thợ, câu thoại

**Trạng thái hình mọi nhà:** công trường (giàn tre, model mọc lên 1,2 s); L1, L2, L3 (model gốc + bộ cấp); nhánh (model riêng); có người (người ở ổ, dây trợ lực); từ bay (nở từ `FX_word` trên nóc); **5 đèn lồng giấy** dưới mái = Nhiệt; huy hiệu nhịp ở chân nhà (1–4 chấm, quả lắc đúng nhịp phát; Dừng: quả lắc nằm yên); Bùng Nổ (cột sáng, cờ, hạt); nghỉ lò (đồng hồ xám trên mái); hư (< 50 %: nứt, khói); Đổ Nát (mesh đổ nát chung theo cỡ); bị khống chế (vòng xám + biểu tượng).

| Nhà | Hình L1 → L3; nhánh | Tổ thợ |
|---|---|---|
| Lũy Chữ | Đồn gỗ đá ba tầng, mái ngói, chòi canh, cờ chữ → tường đá cao, chòi nỏ, cổng có trống → tháp canh hai tầng → mái vàng, vòng chữ lơ lửng | Lão Gác Cổng (ông già râu bạc cầm nỏ to) |
| Tháp Cung | Chòi tre trên chân đá, mái lá → mái ngói, lan can → chòi hai tầng; Én Bão mái cong cánh én; Thần Tiễn tháp cao mảnh, nỏ lớn | Chị Én và Em Sẻ (lém, hay cãi) |
| Tháp Pháo | Ụ đất nện, nòng đồng ngắn → viền đá, mái che → nòng vằn, cờ đỏ; Cối Lớn chĩa trời; Vạc Lửa trên giá ba chân | Bác Đồng (khó tính) và cậu Lửa |
| Tháp Thư Pháp | Tháp gỗ son hai tầng, nghiên mực, cây cọ → cuộn giấy treo → cọ lơ lửng xoay; Bút Lôi vân sét; Mực Băng nghiên băng | Thầy Đồ Mực (nói như ngâm thơ) |
| Trại Lính | Trại gỗ rào cọc, cổng có trống → chòi canh → cờ đỏ, mái ngói; Khiên Đồng; Giáo Dài | Đội trưởng Sấm (to tiếng) |
| Mỏ Vàng | Cửa hầm trên vách, xe goòng, ròng rọc → tời quay tay → guồng nước; đống vàng 4 bậc; Hầm Sâu; Lò Đúc Tiền | Ba anh em thợ mỏ (vừa đào vừa hò) |
| Ruộng Lúa | Ô ruộng nước, bờ đất, bù nhìn → lúa chín, đống rơm → cối giã gạo nước; skin Ao Cá (bản đồ 2), Nương (bản đồ 3) | Cô Mạ và trâu Mộng |
| Trại Gỗ | Lán gỗ, chồng gỗ, cưa hai người kéo → … → guồng nước kéo cưa | Chú Tiều |
| Đài Ấn | Đài đá tròn ba bậc, cột khắc chữ Latin, chuông gió; Mạch Chữ sáng theo cụm → vòng chữ lơ lửng | Trò Mực (nói thì thầm) |
| Nhà Thuốc | Nhà tranh, giàn phơi thảo dược, nồi sắc thuốc | Bà Lang Thơm |

**Câu tổ thợ** (EN câu hô mặc định · VI):

| Nhà | Xây | Nâng cấp | Người tới | Bùng Nổ | Bị đánh | Chữ đẹp | Cơn Gấp |
|---|---|---|---|---|---|---|---|
| Lũy | — | The walls rise. · Tường cao thêm một thước. | Typing with me? Splendid. · Lâu lắm mới có người gõ cùng lão. | Shield up! None pass! · Khiên lên! Không đứa nào qua! | One got through! · Lọt một đứa rồi! | That word deserves the gate. · Chữ này lão treo lên cổng được đấy. | (Lũy yếu) While I stand, it stands. · Lão còn đứng, Lũy còn đứng. |
| Cung | Bows up! · Chòi dựng xong! | New strings! · Tên mới, dây mới! | You type, we shoot! · Gõ đi, tụi em bắn theo! | Arrow rain! · Mưa tên nè! | Hey! Our tower! · Ê! Chòi tụi em mà! | Bullseye! · Trúng hồng tâm! | So many! Type faster! · Đông quá! Gõ nhanh lên! |
| Pháo | Cannon's set. Stand back. · Ụ pháo đây. Đứng xa ra. | Bigger barrel! · Nòng to hơn, tai điếc hơn. | Type true. I won't miss. · Gõ chuẩn vào, tao không bắn trượt đâu. | Triple shot! · Ba quả một lúc! | Who's touching my cannon?! · Đứa nào đụng pháo tao?! | Good! Load it! · Được! Nạp đạn! | Ember! All the shot! · Thằng Lửa! Khuân hết đạn ra! |
| Thư Pháp | Ink ground. Brush ready. · Nghiên đã mài, bút đã sẵn. | A new stroke. · Nét mới, ý mới. | Your words, my ink. · Chữ của con, mực của thầy. | The great letter! · Đại tự, hạ bút! | Mind the inkstone! · Đừng làm đổ nghiên! | A dragon's stroke! · Nét như rồng bay! | More ink! · Mực đâu! Mài thêm mực! |
| Trại Lính | Militia, fall in! · Dân quân tập hợp! | Longer spears! · Giáo dài hơn, khiên dày hơn! | Someone's on the drum! · Anh em, có người đánh trống rồi! | Charge! · Xung trận! | Hold the camp! · Giữ trại! | All present! · Đếm đủ! Một, hai, ba! | Drums! · Chúng tới đông lắm! Trống lên! |
| Mỏ | Heave-ho, a mine! · Hò dô, có mỏ rồi! | Dig deeper! · Đào sâu thêm chút nữa! | Type steady, dig steady! · Gõ đều, cuốc đều! | Gold vein! · Mạch vàng! Mạch vàng! | Thieves! · Có trộm! Giữ goòng! | Look at this nugget! · Cục này to nè! | Golden hour! · Giờ vàng! Gõ lẹ lên! |
| Ruộng | Planting! · Ruộng cày xong, cấy thôi! | Big harvest! · Lúa năm nay sai hạt! | Steady, like planting rice. · Gõ nhịp nhàng như cấy lúa nha. | Hot rice! · Gặt! Cơm nóng đây! | Off my rice! · Đừng giẫm lúa tôi! | So steady! · Đều tay quá! | Harvest time! · Mùa gặt tới! Ra đồng hết! |
| Trại Gỗ | Sharp axe, good wood. · Rìu sắc, gỗ tốt. | More saws! · Thêm cưa, thêm người. | A word per tree! · Gõ một chữ, đốn một cây! | Timber! · Cây đổ! Tránh ra! | My shed! · Lán của tôi! | Clean cut! · Nhát này ngọt! | Logs downstream! · Gỗ trôi kìa! Vớt nhanh! |
| Đài Ấn | The word-vein glows. · Mạch chữ đang sáng lên. | Another ring. · Thêm một vòng chữ. | Slow and clear. · Đọc chậm, đọc rõ nha. | Seal! · Ấn! | The letters fade... · Chữ đang tắt... | Beautiful. · Cụm này đẹp quá. | (Boss mở cửa sổ) Hero, to the dais! · Tướng ơi, về đài! |
| Nhà Thuốc | Medicine's brewing. · Thuốc sắc rồi. | More herbs! · Thêm lá, thêm rễ. | Type the right dose. · Gõ cho đúng liều nghe con. | Drink up! · Uống đi, khỏe liền! | My pot's spilled! · Đổ nồi thuốc rồi! | Perfect dose! · Đúng liều! | (Lính chết nhiều) Slow down! · Từ từ thôi các con! |

### 22.5 Bộ từ theo nhà (ưu tiên chủ đề)

| Nhà | Loại từ | Ví dụ |
|---|---|---|
| Tháp Cung | Gió, hướng, săn | aim, bow, wind, swift, north |
| Tháp Pháo | Động từ hành động | drop, push, break, blast, roll |
| Tháp Thư Pháp | Từ mới có nghĩa (nhịp ≥ 3 s), từ đang học | ink, brush, letter, scroll |
| Trại Lính | Mệnh lệnh | march, hold, guard, stand |
| Mỏ Vàng | Từ tần suất cao | and, make, time, gold, dig |
| Ruộng Lúa | Thiên nhiên, đồ ăn | rice, rain, seed, corn, soup |
| Trại Gỗ | Dụng cụ, vật liệu | axe, saw, log, rope, wood |
| Đài Ấn | Cụm 2–4 từ | "old tree", "plant a seed", "name the river" |
| Nhà Thuốc | Cơ thể, sức khỏe, bếp | herb, warm, rest, hand, tea |
| Lũy Chữ | Làng, nhà cửa | wall, gate, home, roof |

### 22.6 Quái

Giáp, KP theo bậc 0 / 30 / 60 / 80 %. "Lọt" = mạng mất khi lọt Lũy. Quái to cần 2 chỗ chặn: Thuồng Luồng, Oni, Troll, Dokkaebi.

| id | Tên VI (EN) | Nguồn | Vai | Bậc | Máu | Giáp | KP | Tốc | Bay | Lọt | Vàng | Mảnh | Túi | Gõ | Pha |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `cuong-thi` | Cương Thi (Jiangshi) | Việt, Trung | Chạy nhanh, bầy | Bầy | 35 | 0 | 0 | 3,8 | — | 1 | 4 | 50 % | — | — | 1A |
| `cuong-thi-lead` | Cương Thi Đầu Đàn | Việt, Trung | Dẫn bầy (+20 % tốc bầy 6 m) | Vừa | 160 | 30 | 0 | 3,4 | — | 2 | 25 | 2 | 5 % | Neo | 1B |
| `ma-troi` | Đàn Ma Trơi (Wisp Flock) | Việt | Bầy bay thấp 3 m | Nhỏ | 90 | 0 | 60 | 2,6 | thấp | 2 | 8 | 1 | — | — | 1A |
| `nuppeppo` | Nuppeppō | Nhật | Tách đôi (chết vì nổ thì không tách) | Nhỏ | 90 | 0 | 0 | 2,6 | — | 1 | 6 | 1 | — | — | 1B |
| `nuppeppo-con` | Nuppeppō con | Nhật | Con | Bầy | 30 | 0 | 0 | 4,0 | — | 1 | 2 | 50 % | — | — | 1B |
| `thuong-luong` | Thuồng Luồng (River Serpent) | Việt | Giáp nặng; phun vòng nước 5 m đẩy lính | Vừa | 320 | 60 | 0 | 1,9 | — | 3 | 20 | 2 | 5 % | — | 1A |
| `tanuki` | Lửng Tanuki | Nhật | Hồi máu bầy; Trống Bụng Lớn 25 % | Nhỏ | 110 | 0 | 30 | 2,4 | — | 1 | 12 | 1 | — | Ngắt | 1B |
| `oni` | Quỷ Oni | Nhật | Phá nhà: đập 60 mỗi 3 s; Nổi Giận dưới 50 % | Nặng | 520 | 30 | 0 | 2,0 | — | 4 | 30 | 3 | 15 % | — | VS |
| `troll` | Quỷ Núi Troll | Bắc Âu | Khiên vòm 4 m: đạn −70 % | Nặng | 600 | 30 | 30 | 2,0 | — | 3 | 30 | 3 | 15 % | Phá Khiên | 1B |
| `alicanto` | Chim Vàng Alicanto | Chile | Trộm 15 Vàng từ đống, tối đa 2 lần | Nhỏ | 120 | 0 | 0 | 3,2 | cao | 1 | 10 | 1 | — | Bắt | 1B |
| `tat-phuong` | Tất Phương (Bifang) | Trung | Lò cò tới nhà gần đường rồi nổ (nhà −45) | Nhỏ | 60 | 0 | 0 | 3,0 | — | 2 | 7 | 1 | — | — | VS |
| `ma-da` | Ma Da (Water Wraith) | Việt | Tàng hình; Kéo Chân một lính | Vừa | 140 | 60 | 0 | 3,2 | — | 2 | 14 | 2 | 5 % | Hiện Hình | VS |
| `dokkaebi` | Yêu Tinh Dokkaebi | Hàn | Gọi Ma Trơi nhỏ mỗi 10 s, tối đa 3 lần | Vừa | 380 | 30 | 30 | 1,8 | — | 3 | 25 | 2 | 5 % | Phong Gậy | VS |
| `kamaitachi` | Chồn Liềm (Kamaitachi) | Nhật | Bay thấp 1,5 m; né 30 % đạn tháp có Ā·m_eff < 0,5 | Nhỏ | 70 | 0 | 30 | 4,6 | thấp | 1 | 6 | 1 | — | — | VS |
| `ma-troi-nho` | Ma Trơi nhỏ | Việt | Do Dokkaebi gọi | Bầy | 60 | 0 | 60 | 2,6 | thấp | 1 | 2 | 50 % | — | — | VS |
| `mam-go` | Mầm Gỗ | Việt | Do Mộc Tinh gọi | Bầy | 40 | 0 | 0 | 3,0 | — | 1 | 1 | 50 % | — | — | 1B |

- **1A dùng 3 loại:** Cương Thi (bầy nhanh), Đàn Ma Trơi (bay), Thuồng Luồng (giáp).
- **Hình chung:** vệt Mực Câm tím đen (shader). Chết không máu: vệt mực bong thành giấy vụn, chữ cái của tên bay ra (Mảnh Chữ), rồi hiệu ứng riêng của loài.
- **Hình và tiếng chết riêng:** Cương Thi: bùa cháy từ dưới lên, hóa tro, chuông "tinh". Ma Trơi: từng đốm tắt, "plinh" thủy tinh. Nuppeppō: bóp giãn, phụt bột kem. Thuồng Luồng: cột nước, vảy ngọc rơi. Tanuki: khói be, chiếc lá xoay rơi. Oni: sừng gãy, chùy rơi "keng". Troll: hóa đá, vỡ 3 tảng. Alicanto: lông vàng rụng thành đồng bay về HUD. Tất Phương: cầu lửa, lông bung. Ma Da: vũng nước, 8 cánh sen trắng bay lên. Dokkaebi: gậy lăn lóc, khói xanh. Chồn Liềm: lốc tan, ba chồn lăn chạy. Mầm Gỗ: héo rũ.
- **Tiếng quái:** mỗi loài 4 nhóm (đi, đánh, kỹ năng, chết) × 3–4 biến thể. 1–3 câu hô nhỏ có vang (ví dụ Cương Thi "Hop... hop...", Oni "Smash!", Troll "Stone, shield!", Alicanto "Mine!", Tanuki "Belly drum!", Ma Da "So cold..."). Câu hô tối đa 1 lần mỗi 4 s mỗi loài, tắt khi boss báo đòn.
- **Báo trước đòn:** vệt đỏ có sọc ≥ 0,5 s (Oni đập 0,8 s; Thuồng Luồng phun 0,6–0,8 s; Tất Phương nổ 0,5 s; Alicanto sà 1,2 s có bóng đỏ).

### 22.7 Boss

**Mộc Tinh** (`moc-tinh`, EN *the Nameless Banyan*). Tinh cây trong truyện dân gian Việt; yêu tinh, không phải thần.
- **Hình:** cây đa thành người cao 7 m; rễ cuộn thành chân, tán lá thành bờm; mặt khắc trong vỏ, mắt hổ phách; Mực Câm chảy từ hốc ngực. Rễ trồi dùng model `root-burst.glb` của chủ dự án.

| Chỉ số | Bản đồ 1 (boss nhỏ) [1B] | Bản đồ 3 (boss thế giới) [VS] |
|---|---|---|
| Máu | 4.000, rút lui ở 50 % | 12.000 |
| Giáp / KP | 30 % / 0 % | 30 % / 0 % |
| Đòn | Quật cành 40–60 VL, vùng 3 m, mỗi 2,5 s | như trên |
| Điểm yếu | Cháy gây ×1,25 | như trên |
| Thưởng | 150 Vàng (Rương), 10 Mảnh Chữ | 250 Vàng, 10 Mảnh Chữ |
| Lần đầu hạ | Bản vẽ nhánh Tháp Cung | Bản vẽ Nhà Thuốc, Trại Gỗ; hạt giống đa, mảnh sao |

- **Bản đồ 1:** Pha 1 (100 → 70 %): đi chậm; mỗi 12 s **Rễ Trồi** dưới mọi nhà có mép trong 8 m (báo 1,5 s): nhà −30 máu, tê 3 s (ngừng phát từ; từ đang bay vẫn gõ được); Thư Đồng ở nhà bị nứt thì hoảng. Ở 70 %: **choáng 5 s, Dễ Tổn Thương +25 %** (không có cửa sổ ấn). Pha 2 (70 → 50 %): gọi 4 Mầm Gỗ mỗi 15 s. Ở 50 %: cảnh rút lui, chui xuống đất. Thắng.
- **Bản đồ 3:** Pha 1 như trên. Chuyển pha 70 %: **cửa sổ ấn "Gọi Tên"** (cụm 2–3 từ). Đúng: choáng 3 s, Bóc Vỏ 8 s (Dễ Tổn Thương). Sai: Tường Rễ mọc 12 s, hồi 5 % máu. Pha 2: **Cắm Rễ** (đứng 6 s, Tường Rễ chặn một nhánh đường 12 s, luân phiên Tây, Đông; người đi bộ không qua), gọi 4 Mầm Gỗ. Chuyển pha 40 %: cửa sổ "Hạt Mầm". Pha 3: tán rải 3 hạt mỗi 6 s (40 VL, 2,5 m), một rễ đuổi Tướng 3 m/s (giữ 1,5 s), Ngủ Rễ hồi 1 %/s trừ khi đang cháy. Ở 20 %: cửa sổ "Tên Thật" (cụm 3–4 từ, ví dụ "old tree of silver falls"). **Đòn kết:** dưới 5 % hiện "remember".
- **Thoại:** Where... is my name? · Tên ta ở đâu? / My roots outlast your words. · Rễ ta sâu hơn chữ các ngươi. / Earth, hold them! · Đất ơi, giữ chúng lại! / That name... I know it... · Cái tên đó... quen quá... / Roots, rise! · Rễ ơi, mọc lên! / Ah... I remember. · À... ta nhớ rồi.

**Đại Bàng Tinh** (`dai-bang-tinh`, EN *the Storm Eagle*) [VS]. Từ truyện Thạch Sanh; yêu tinh, không phải thần.
- **Hình:** đại bàng sải cánh 12 m, lông nâu sẫm ánh đồng, mỏ ngà, móng đen; Mực Câm loang trên cánh; cổ đeo chuỗi vỏ ốc và đồng xu cướp được.
- **Chỉ số:** máu 8.000; giáp 0 %, KP 30 %; tốc 1,8 m/s, bay cao 9 m. Bay cao: chỉ Tháp Cung, Thư Pháp, nỏ Lũy, Draconis đánh được. Thưởng 250 Vàng, 10 Mảnh Chữ, vàng đã trộm trả lại.
- Pha 1 **Sà Cắp:** mỗi 14 s, bóng đỏ dưới nhà nhiều máu nhất trong 10 m quanh đường bay (báo 1,5 s); nhấc nhà 4 m, nhà tắt 4 s, rơi −35 máu; người ở đó bị đẩy ra (Thư Đồng hoảng). Lúc sà thấp 2 s: mọi đơn vị đánh được.
- Chuyển pha 70 % và 40 %: **lần đầu (chưa học ấn):** tự rơi xuống đường 5 s, Dễ Tổn Thương +25 %. **Khi đã học ấn:** cửa sổ "Ấn Lông Vũ" (đúng: rơi 6 s + Dễ Tổn Thương; sai: Bão Lớn đẩy mọi lính 3 m, mọi Thư Đồng hoảng) và "Thần Tiễn" (đúng: rơi 8 s, trả vàng trộm; sai: lao trộm 40 Vàng).
- Pha 2 **Bão Cánh:** mỗi 10 s đẩy quái đất trong 8 m tới trước 3 m, đẩy lính lùi 2 m; gọi 3 Alicanto một lần. Pha 3 **Tổ Đá:** ngoài tầm 3 s mỗi chu kỳ; rũ 3 mũi lông vào 3 nhà mỗi 8 s; lao trộm 20 Vàng mỗi 12 s.
- **Thoại:** Gold! Boats! All mine! · Vàng! Thuyền! Của ta hết! / The sky is mine. · Trên trời, ta là vua. / Winds, scatter them! · Gió ơi, thổi bay chúng! / Let go! My wings! · Buông ra! Cánh ta! / Storm, rise! · Bão lên! / My wings... so light... · Cánh ta... nhẹ quá...

### 22.8 Thư Thành và Cây Chữ

| Cơ sở | Hình | Người đón (chào · nâng xong · chưa đủ) |
|---|---|---|
| Sảnh Tướng | Nhà gỗ lớn Đội Phi Thư, sân tập rơm | Đội trưởng Sấm: Back for drills? · Stronger now! · More battles first. |
| Học Viện | Nhà sách nhiều tầng, tổ cú trên mái | Bà Cú Mực: A little more study? · Well done. · Not enough knowledge yet. |
| Xưởng Bản Vẽ | Xưởng mộc Làng Tre Ngà, bản vẽ ghim đầy tường | Chú Đẽo: New plans here! · Built! · Missing the plans. |
| Cây Chữ | Cây đa non giữa quảng trường, mỗi bậc là một chùm lá chữ sáng | Trò Mực: The tree awaits. · A new leaf glows. · More stars needed. |
| Chợ | Sạp thuyền Rái Đá dưới chân đồi (mở sau bản đồ 2) | Cô Rái Bông: Fresh goods! · Thank you! · Short on coins! |

- Thư Thành mặc định là **tranh 2D nhiều lớp** (rẻ, đẹp, đủ dùng).

**Cây Chữ bậc 1–3** (Thế giới 1 có tối đa 15 Sao; bậc 4–5 ở Thế giới 2):

| Nhánh | Bậc 1 (1 Sao) | Bậc 2 (2 Sao) | Bậc 3 (3 Sao) |
|---|---|---|---|
| Tấn Công | Tên Tẩm Dầu: Tháp Cung cháy 2 P/s 2 s · hoặc · Nòng Nhẹ: Pháo rẻ 10 Vàng | Mắt Ưng: Tháp Cung +1 m tầm · hoặc · Thuốc Nổ Mịn: Pháo +10 % bán kính nổ | Tên Chữ Xuyên: xuyên thêm 1 · hoặc · Đạn Chữ Nặng: vùng nổ ×1,25 |
| Quân Sự | Cơm Nắm: lính +10 % máu · hoặc · Trống Nhanh: hồi sinh −1 s | Giáo Đồng: lính +2 sát thương · hoặc · Khiên Mây: lính +8 % giáp | Đủ Đội Sớm: cần 4 từ tốt · hoặc · Dân Quân Dự Bị: Viện Binh +1 lính |
| Kinh Tế | Kho Rộng: kho Lúa +10 · hoặc · Cuốc Bén: Mỏ +1 Vàng mỗi chu kỳ | Mỏ Kín: đống +30, Alicanto cướp tối đa 10 · hoặc · Cục Vàng To: +2 | Chợ Phiên: Lúa dư đổi 1 : 1,5 · hoặc · Mạch Giàu: node ★ tính như ★★ |
| Hỗ Trợ | Chân Nhanh: Thư Đồng +0,4 m/s · hoặc · Gan Dạ: hoảng ngắn hơn 1 s | Dư Âm Dài: +1 s · hoặc · Sóng Rộng: Sóng Chữ +1 m | Vòng Hút Rộng: +2 m · hoặc · Từ Vàng Thêm: +1 % |
| Chỉ Huy | Đá Lửa To: 4 khối · hoặc · Viện Binh Nhanh: hồi 15 s | Nỏ Lũy Nặng: +30 % · hoặc · Lũy Rẻ: Lũy cấp 2 giá 130 | Cơn Gấp Dài: +2 s · hoặc · Ấn Phụ Dài: cụm sống 5 s |

**Bản vẽ:** Mộc Tinh bản đồ 1 → nhánh Tháp Cung. 6 Sao → nhánh Trại Lính. 100 từ đã thuộc → nhánh Mỏ, Ruộng. Đại Bàng Tinh → nhánh Thư Pháp, Đài Ấn. 12 Sao → nhánh Pháo. Mộc Tinh bản đồ 3 → nhánh Nhà Thuốc, Trại Gỗ. Nhánh dùng được khi Lũy cấp 3 (sau Thế giới 1, hoặc khi chơi lại).

### 22.9 Bản đồ

**Luật chung:** vùng chơi 96 × 96 m; Lũy ở phía nam; Khe Nứt ở phía bắc hoặc trên biển. Đường, mép nước, vách, node vẽ từ dữ liệu luật, đè lên ảnh nền. Tối đa 8 loại quái thường, 3 loại đánh nhà, 1–2 luật địa hình mỗi bản đồ. Khoảng cách giữa các nhà quan trọng 15–35 m. Bố cục khóa (mã băm bố cục) sau khi bot đạt; chỉ sau đó mới xuất ảnh khung cho chủ dự án vẽ.

**Bản đồ 1 — Đồng Cỏ Thác Bạc** (`w1-silverfall`, EN *Silverfall Meadow*) [1B]
- **Không khí:** cao nguyên ôn đới, 7:30 sáng sau mưa, cầu vồng trên thác; sáo trúc và đàn dây vui.
- **Bố cục:** Khe Nứt dưới chân thác (−10, −46). Đường chữ S xuống (6, −34), **tách đôi** quanh Đồi Cầu Vồng (2, −21; bán kính 8 m, cao 2,6 m): nhánh Tây qua (−12, −20) xuống (−10, 0); nhánh Đông qua (16, −20) xuống (12, 2). Nhập ở (0, 12), uốn chữ S tới Lũy (0, 40). **Suối Bạc** rộng 3 m dọc x ≈ −24, 2 cầu gỗ ở (−24, −14), (−24, 26). Đường bay chéo từ Khe Nứt sang đông, qua gần mỏ giàu.
- **Node:** quặng (26, −30) ★★★ tiền tuyến, dưới đường bay; quặng (−12, 32) ★ sát Lũy; Mạch Chữ (2, −21) đỉnh đồi (Đài Ấn mở từ bản đồ 2). **Vùng phù sa** cho Ruộng: (−32, 8) bên kia suối, (16, 28) gần Lũy.
- **Luật địa hình:** Suối Bạc (người đi bộ chỉ qua ở cầu; Draconis bay qua); Đồi Cầu Vồng (nhà trên đồi +10 % tầm).
- **Quái:** Cương Thi (+ Đầu Đàn, chưa có cửa sổ Neo), Ma Trơi, Nuppeppō, Thuồng Luồng, Tanuki, Alicanto (chưa có cửa sổ Bắt), Mầm Gỗ.
- **Ô:** 1 tới đợt 4; Lũy cấp 2 và Chấm ở đợt 4 → 2 ô. Chơi lại khi có Phẩy: 3.

| Đợt | Thành phần | Vàng hạ quái | Dạy |
|---|---|---|---|
| 1 | 8 Cương Thi (2 bầy) | 32 | Dòng chữ, nhịp, đèn lồng; Tháp Cung |
| 2 | 10 Cương Thi, 1 Ma Trơi | 48 | Đổi nhịp; Trại Lính; quái bay thấp |
| 3 | 6 Cương Thi, 3 Nuppeppō, 1 Ma Trơi | ~56 | Mỏ Vàng; Từ Vàng chắc chắn |
| 4 | Đầu Đàn + 7 Cương Thi, 2 Nuppeppō | ~70 | Lũy cấp 2, Chấm, ô 2; Tháp Pháo |
| 5 | 2 Tanuki, 6 Cương Thi, 1 Thuồng Luồng | 68 | Ngắt |
| 6 (thở) | 2 Alicanto, 4 Cương Thi, 1 Ma Trơi | 44 | Chấm đứng mỏ chống trộm |
| 7 | Đầu Đàn + 8 Cương Thi, 2 Tanuki, 2 Thuồng Luồng, 2 Ma Trơi, 1 Alicanto | ~147 | Tổng hợp |
| 8 (boss) | Mộc Tinh nhỏ, 2 bầy Cương Thi, Mầm Gỗ | ~198 (gồm Rương 150) | Boss: máu, Rễ Trồi, rút lui |

- Thưởng đợt tổng 152. Vàng đầu 220. Một thế trận đẹp cuối bản đồ 1 tốn khoảng 1.400–1.600: 2 Tháp Cung L2–L3, 1 Pháo L2, 1 Trại Lính L2, 1 Mỏ L2, Lũy 2, 1 Ruộng. Không nâng hết được; phải chọn.
- **Huy chương:** "Đợt 3 Không Tan Từ", "Không Mất Vàng" (Alicanto không cướp được đồng nào), "Ruộng Không Đổ".
- **Cảnh 2D:** cỏ thấp, cỏ lau, hoa dại trắng vàng, khóm tre, thông núi, cây bàng, đá xám rêu, bụi mâm xôi, đồi chè (dải xa), cối xay gió trên đồi xa, trâu và đàn cò (sprite động), cọc đá khắc tên ruộng.
- **Mốc cảnh 3D:** vách Thác Bạc (khối đá gần + dòng thác shader), 2 cầu gỗ, chòi canh trên đồi. **Phông xa:** núi xanh nhiều lớp, cầu vồng, mây sáng. **Âm nền:** thác xa, chim sáng, gió cỏ.

**Bản đồ 2 — Vịnh Đá Trắng** (`w1-whitestone`, EN *Whitestone Bay*) [VS]
- **Không khí:** bờ biển đá vôi, 18:00 giờ vàng, gió biển; trống nhỏ, sáo, tiếng sóng.
- **Bố cục:** biển phía bắc; hai Khe Nứt trên bãi cát: Tây (−30, −42), Đông (28, −42). Hai đường vòng quanh Thềm Đá Trắng (0, −14), nhập ở (0, 16), tới Lũy (0, 38). Vũng Thuyền phía tây. Đường bay từ góc đông bắc qua mỏm đá có mỏ giàu.
- **Node:** quặng (36, −8) ★★★; quặng (12, 30) ★; Mạch Chữ "Sân Khảm Cổ" (−4, 4); vùng phù sa Ao Cá (skin Ruộng) trong Vũng Thuyền; rừng ô-liu (34, 30) cho Trại Gỗ.
- **Luật địa hình, Thủy Triều** (đổi mỗi 2 đợt, HUD có đếm ngược): triều xuống Ao Cá ×1,5 và cổng Tây đông quái hơn; triều lên Ao Cá ×0,8 và cổng Đông đông hơn. Người chơi dời Thư Đồng giữa hai bờ.
- **Quái:** Cương Thi (+ Đầu Đàn, Neo), Ma Trơi, Tất Phương, Tanuki, Troll, Alicanto, Chồn Liềm.

| Đợt | Thành phần chính | Dạy |
|---|---|---|
| 1 | 10 Cương Thi chia hai cổng | Ao Cá và Lúa; bậc Chuỗi hiện |
| 2 | 8 Cương Thi, 2 Ma Trơi | Nhà L2, nhịp 2 s |
| 3 | 4 Tất Phương, 6 Cương Thi | Đặt nhà cách đường |
| 4 | Đầu Đàn **tinh nhuệ** + bầy 5, 2 Tanuki | Neo; túi tinh nhuệ và Từ Nhặt |
| 5 | 1 Troll, 6 Cương Thi, 2 Ma Trơi | Phá Khiên; Heo Đất ở quãng lặng |
| 6 (thở) | 2 Chồn Liềm, 4 Cương Thi | Gõ chuẩn ở tháp (khắc né) |
| 7 | 2 Alicanto, 1 Troll, Đầu Đàn + bầy | Đài Ấn: cụm, nghe rồi gõ; Tối Thượng |
| 8 | 2 Troll, 3 Chồn Liềm, 4 Tất Phương | Cụm chốt, Bùng Nổ |
| 9 | Đợt lớn ~60 quái | Tổng hợp |
| 10 (boss) | Đại Bàng Tinh, 3 Alicanto, bầy | Boss bay; lần đầu không cửa sổ ấn |

- **Huy chương:** "Trời Sạch" (không quái bay nào lọt), "Ao Đầy", "Chuỗi 50".
- **Cảnh 2D:** ô-liu, phi lao, cỏ biển, hoa muống biển, đá vôi trắng, lưới phơi, thuyền thúng úp, hải âu, bọt sóng. **Mốc 3D:** hải đăng, cầu tàu, nhà Rái Đá trên cọc, Thềm Đá Trắng. **Phông xa:** đảo đá vôi, mặt trời vàng, mây hồng. **Âm nền:** sóng, hải âu, gió, chuông gió.

**Bản đồ 3 — Rừng Rễ Cổ** (`w1-rootwood`, EN *Old Rootwood*) [VS]
- **Không khí:** rừng mưa, 10:30 ẩm, tia nắng xuyên tán, đom đóm khi trời tối dần ở đợt boss; nhạc cụ tre, trống, sáo.
- **Bố cục:** hai Khe Nứt Tây (−46, −28), Đông (46, −20); **hai đường riêng**, chỉ nhập ở 10 m cuối trước Lũy (0, 40). Sông Rễ chảy xuống Hố Sụt (0, 0). Qua sông: Cầu Đỏ (0, 18) ai cũng đi được; Đá Kê (0, −20) chỉ Lam nhảy qua; điểm bắc cầu (0, −8) cho Tre. Gốc đa rỗng khổng lồ (0, −32). Lối mòn nối các node; người đi bộ ngoài lối mòn chậm 30 %.
- **Node:** quặng (−30, −4) ★★, (30, −8) ★★; rừng (−34, 18) ★★★, (36, 6) ★★★; Mạch Chữ (−18, −2) và (18, −2), chỉ xây 1 Đài Ấn (phải chọn bên). Vùng Nương (Ruộng) trên sườn (26, 22).
- **Luật địa hình:** Tán Che (nhà có ≥ 3 cây chưa chặt trong 1,5 m ngoài vòng nhận ít hơn 40 % sát thương bắn xa; chặt cây khi đặt nhà +2 Gỗ mỗi cây, tối đa 30); Tường Rễ của Mộc Tinh (pha 2).
- **Quái:** Cương Thi, Tanuki, Oni, Troll, Dokkaebi (+ Ma Trơi nhỏ), Ma Da (từ sông), Chồn Liềm, Alicanto. Mầm Gỗ do boss gọi.
- **Đợt (12):** 1–3 Oni và từ sửa, chia người hai bờ sông; 4 Dokkaebi (Phong Gậy); 5 Ma Da (Hiện Hình), Từ Sao và Từ Lá bắt đầu ra; 6 Cơn Gấp đầu tiên (Giờ Vàng); 7 Alicanto (Bắt), nhà L3 và nhịp 1 s; 8 đợt thở; 9–10 Hợp Tấu, Đầu Đàn và Dokkaebi cùng lúc (tối đa 2 cửa sổ gõ); 11 đợt lớn hai đường; 12 boss Mộc Tinh đầy đủ: **cửa sổ ấn đầu tiên và Chữ Chiêu được dạy ở đây**.
- **Huy chương:** "Giữ Cây Mầm" (không quái nào lọt), "Giữ Tán Rừng" (chặt ≤ 10 cây), "Hợp Tấu 3 Lần".
- **Cảnh 2D:** cây rừng to (8–12 m), dây leo, dương xỉ, nấm, rễ nhỏ, phong lan, đá rêu, nhà sàn bỏ hoang (xa), đom đóm, bướm. **Mốc 3D:** gốc đa rỗng, Cầu Đỏ, Đá Kê, rễ khổng lồ uốn qua đường, thác đổ vào Hố Sụt. **Âm nền:** côn trùng, nước, chim rừng, gỗ kẽo kẹt xa.

### 22.10 Ma trận khắc chế

◎ rất mạnh · ○ được · △ yếu · ✕ không đánh được.

| Quái | Cung | Pháo | Thư Pháp | Lính Giáo | Lính Khiên | Lam | Draconis | Tre | Gõ trực tiếp |
|---|---|---|---|---|---|---|---|---|---|
| Cương Thi | ◎ | ○ (bầy) | ○ | ○ | ○ | ◎ | ○ | ○ | Đầu Đàn: Neo |
| Đàn Ma Trơi | ◎ | ✕ | △ (KP 60 %) | ✕ | ✕ | ✕ | ◎ (nổ ×1,5) | ○ | — |
| Nuppeppō | ○ | ◎ (không tách) | ○ | ○ | ○ | ○ | ◎ | △ | — |
| Thuồng Luồng | △ | ○ (L3 Vỡ Giáp) | ◎ | △ | ○ | △ | ◎ | △ | — |
| Tanuki | ◎ | ○ | ○ | ○ | ○ | ◎ | ○ | ○ | Ngắt |
| Oni | ○ | ○ | ◎ | △ | ◎ | ○ | ○ | ◎ (Rào) | — |
| Troll | △ (vòm) | △ (vòm) | △ (vòm) | ◎ | ◎ | ◎ | ○ | ○ | Phá Khiên |
| Alicanto | ◎ | ✕ | ○ | ✕ | ✕ | ✕ | ◎ | ✕ | Bắt |
| Tất Phương | ◎ | ○ | ○ | △ | ○ | △ | ○ | ◎ (Rào) | — |
| Ma Da | △ (khi lộ) | △ | ◎ (khi lộ) | △ | △ | ○ | ◎ | ◎ | Hiện Hình |
| Dokkaebi | ○ | ○ | ○ | ○ | ○ | ◎ | ○ | ○ | Phong Gậy |
| Chồn Liềm | ○ (◎ khi gõ chuẩn) | ✕ | ◎ | ✕ | ✕ | ✕ | ○ | △ | — |
| Mộc Tinh | ○ | ○ | ○ | △ | ○ | ○ | ◎ (lửa ×1,25) | ◎ (sửa) | Cửa sổ ấn |
| Đại Bàng Tinh | ◎ | ✕ (○ khi sà) | ○ | ✕ (○ khi rơi) | ✕ (○ khi rơi) | ✕ (○ khi sà) | ◎ | ✕ (○ khi sà) | Cửa sổ ấn |

- Mỗi loại tháp có ít nhất 2 quái nó yếu. Mỗi quái có ít nhất 2 cách khắc chế; gõ trực tiếp luôn chỉ là **một** cách.
- **Chỗ đứng của người** (ai ở nhà nào, nhịp nào) là một lớp khắc chế riêng: Alicanto, Oni, Chồn Liềm, boss đều đòi điều người đúng chỗ.

---

## 23. Trình bày: hình, chữ, UI

Phần này dựng lại bản 03 trên luật cuối của tài liệu này. **Đã bỏ khỏi 03:** mọi chỗ "nếu luật là…" và bảng phương án; các hệ không có luật (Đèn Trời, Trống Hội, Cơn Lốc Chữ, Lóng ngóng, Nhà nghỉ, thưởng Liên Hoàn); bảng "đồ hiếm" (thay bằng túi và bùa). **Đã đổi:** tên theo bảng 0.6; ô mở bằng Lũy; Thư Đồng đi bộ, không máu; dòng chữ chạy suốt thời gian trận; luật cột chữ có khoảng cách tối thiểu.

### 23.1 Phong cách chung

- **"3D chibi tranh truyện":** như đồ chơi vinyl sơn tay đặt trên bản đồ vẽ tay sáng. **Tranh 2D vẽ tay** cho cây, đá, cỏ, hoa, núi xa. Hai thứ dùng chung ramp 3 bậc, viền mực, bảng màu.
- **Tỉ lệ:** Tướng 2,5–3 đầu; lính, thợ, Trợ Thủ 2–2,5 đầu; quái khối to, chi tiết lớn; boss khối mập.
- **Shader chung:** ramp hoạt hình 3 bậc; viền mực (fresnel cho 3D, vẽ sẵn cho 2D); rim sáng nhẹ; viền ngoài chỉ cho thứ đang chọn, đang rê, và boss.
- **Bậc độ nổi** (nổi nhất trước): chữ (DOM) → nhân vật và quái → nhà → cảnh 2D (giảm tương phản 10–15 %) → mặt đất → đường (sáng hơn đất một bậc).
- **Kiểm tra "nheo mắt":** chụp, chuyển xám, mờ 2 px; chữ, lính, quái, Tướng, thanh máu vẫn phải nổi.

### 23.2 Tỉ lệ và cỡ trên màn hình

Camera mặc định 55° ở 58 m.

| Vật | Cao thật | Cỡ ở 1080p |
|---|---|---|
| Thợ nhỏ ở nhà | 1,2–1,4 m | 16–20 px |
| **Thư Đồng** | **1,1–1,3 m** | 18–20 px |
| **Lính** | **1,7–2,0 m** | 24–30 px |
| Quái nhỏ / vừa / to | 1,6–2,2 / 2,4–3,2 / 3,5–4,5 m | 22–32 / 34–46 / 50–65 px |
| Tướng đi bộ | 2,6–2,9 m | 40–50 px |
| Draconis (bay 4–6 m) | Thân 3,5 m, sải cánh 6 m | 60–90 px |
| Nhà đánh | 6–7,5 m | 100–130 px |
| Nhà sản xuất, hỗ trợ | 5–6 m | 90–110 px |
| Lũy Chữ | 10–12 m | 160–200 px |
| Boss | 7–10 m | 150–220 px |
| Cây lớn (2D) | 6–10 m | 90–160 px |

- Tháp Pháo thấp tròn (23.12): 3,5–4,5 m, ngoại lệ của dòng Nhà đánh.
- Kịch bản `td-scale.mjs` đo hộp bao trên ảnh chụp. Lệch quá 20 % thì báo lỗi.

### 23.3 Màu có nghĩa

**Màu dành riêng** (VFX, UI không dùng cho việc khác):

| Màu | Mã | Nghĩa |
|---|---|---|
| Đỏ | `#FF4A4A` | Nguy hiểm từ địch: báo trước đòn, vùng nổ của địch, quái nhắm nhà, cuộn giấy gõ trực tiếp |
| Cam | `#FFB020` | Khẩn: chữ sắp tan, sắp lọt |
| Vàng kim | `#FFC83A` | Tiền: đồng xu, Từ Vàng, túi, rương |
| Xanh ngọc | `#7FF5E0` (neon), `#0B8A78` (trên giấy) | Gõ: chữ đã gõ, sức mạnh có được nhờ gõ |

- **Luật "xanh ngọc = sức gõ":** đạn, buff, vòng nào mạnh lên nhờ chữ vừa gõ thì có ánh xanh ngọc trắng.
- Ngoại lệ đỏ duy nhất: phím sai làm nền chữ kế tiếp hồng nhạt `#FFD3D3` 0,15 s, chỉ trong thẻ.

**Màu họ nhà** (mép trái thẻ chữ, viền vòng menu, icon): Đánh hồng sẫm `#D9479B` · Quân lam `#3B7DDD` · Vàng (Mỏ) hổ phách `#C98A2E` · Tài nguyên lục `#49AE45` · Hỗ trợ tím nhạt `#8F72E8` · Chỉ huy trắng ngà `#EDE6D6`. Chế độ mù màu: mép thẻ thêm hoa văn (sọc chéo, chấm, ô vuông, sóng, vòng, viền kép).

**Màu người trợ lực** (dây, chấm 6 px trên thẻ, vòng chân, đường đi): Draconis cam đào, Lam cobalt, Tre lục tre, Chấm tím (hoa văn chấm), Phẩy hồng (hoa văn phẩy), Gạch nâu đồng (hoa văn gạch).

**Nguyên tố** (hình trước, màu sau): lửa cam vàng; lửa lam cobalt viền trắng; băng xanh nhạt; sét vàng trắng gãy khúc; mực đen ánh xanh ngọc; độc vàng xanh; đất nâu ochre; hồi máu trắng ấm và bạc hà; Mực Câm tím đen.

### 23.4 Thẻ chữ (Chữ Bay)

**Nguyên tắc:** từ ở ngay trên nhà của nó; bay lên là đồng hồ (cao hơn = gấp hơn); cỡ chữ cố định trên màn hình; mỗi từ trúng là một hành động thấy ngay; lỡ chữ không bị phạt bằng hình (không đỏ, không còi, không rung màn hình).

**Thẻ:** đèn giấy dẹt chữ mực. Font Be Vietnam Pro 700, chữ thường; chữ đầu 800 và gạch chân 2 px màu họ nhà. Cỡ 22 px × `--ui` × cỡ người chọn (80–150 %), kẹp 18–30 px. Nền giấy kem `#FFF4D6` (Neon: kính tối), viền mực 2 px, bóng cứng. Chữ đã gõ chuyển xanh ngọc. Dòng nghĩa tiếng Việt 12–13 px dưới từ mới. Icon họ nhà 16 px bên trái, chấm màu người trợ lực ở góc phải, vạch đồng hồ 3 px ngắn dần. Một sợi chỉ sáng 1 px nối đáy thẻ về đỉnh mái. Tương phản ≥ 7 : 1. Rộng tối đa 240 px; cụm dài dùng dải lụa, không xuống dòng.

**Vòng đời trên màn hình:**

| Pha | Hình | Tiếng |
|---|---|---|
| Báo trước (0,25 s trước lần phát) | Người trợ lực vung bút, thổi lửa, gõ búa; nét sáng mảnh bay lên mái. Lần phát bị hoãn: không nét sáng, người trợ lực gãi đầu, dấu "…". | "Sột" rất nhỏ |
| Hiện (0–0,15 s) | Thẻ bật ở đỉnh mái, cỡ 0,6 → 1,06 → 1, làn khói giấy nhỏ màu họ nhà | "Tích" theo loại nhà |
| Bay | Bay lên đều; vạch đồng hồ ngắn dần | — |
| Sắp tan (0,6 s cuối) | Viền và vạch chuyển cam, rung ±1 px | — |
| Gia hạn | Thẻ dừng bay, vạch cam nhấp nháy chậm | — |
| Tan | Thẻ cháy xém từ mép 0,3 s, tàn bay lên, chữ rơi 10 px thành tro; một mảnh giấy nhỏ bay về nút Sổ Từ | "Phù" giấy rất nhỏ |
| Hủy | Thẻ gấp đôi, biến mất 0,2 s | Không |

**Luật cột chữ (không chồng nhau ở mọi tốc độ):**
```
y_time(w) = H · tuổi(w) / L_w            H = 120 px × --ui × cỡ chữ
Xếp từ mới nhất (dưới) tới cũ nhất (trên):
  y(mới nhất) = y_time
  y(kế trên)  = max(y_time của nó; y(dưới nó) + 40 px)
Cột tối đa 240 px.
```
- Thẻ cao ~32 px, khoảng tối thiểu 40 px. Mỗi nhà ≤ 4 thẻ, nên cột ≤ 240 px kể cả khi L = 7,5 s và N = 1 s.
- Từ cũ luôn cao hơn từ mới. Độ cao vẫn gần đúng là đồng hồ.
- Bay dùng tọa độ màn hình (không bay theo mét trong thế giới): zoom xa gần không đổi khoảng cách.

**Bộ xếp làn** (view, mỗi khung, không ảnh hưởng luật): mỗi nhà đang có từ là một làn; neo ở `FX_top` + 0,6 m chiếu ra màn hình; hai làn chồng (khe < 10 px) thì đẩy cả hai ra **hai bên**, lệch tối đa 160 px; không đẩy dọc; kẹp trong vùng an toàn (trừ HUD, trừ dải dưới thanh boss); lò xo 150 ms; làn lệch > 24 px thì sợi chỉ thành nét chấm; > 4 làn dồn trong 360 px thì thẻ gọn ×0,9. ≤ 0,3 ms mỗi khung với 20 thẻ.

**Khay mép:** nhà đang trợ lực ra ngoài vùng an toàn → từ của nó vào khay ở mép đúng phía (icon nhà, mũi tên, ≤ 3 thẻ xếp dọc, không bay, vạch đồng hồ). ≤ 6 khay, mỗi cạnh ≤ 2. Bấm khay: camera lướt tới nhà 0,45 s. Gõ như thường.

**Khóa và gõ:**

| Trạng thái | Hình |
|---|---|
| Khóa (vừa gõ chữ đầu) | Thẻ ×1,1, viền xanh ngọc mảnh |
| Đổi khóa mềm | Thẻ cũ co lại; vệt sáng nhảy sang thẻ mới 0,12 s |
| Đang gõ (từ chữ thứ hai) | Thẻ ×1,2, viền trong xanh ngọc, nổi lớp trên, trượt phải 18 px, bay chậm còn 30 % (chỉ hình); thẻ khác mờ 30 % |
| Phím đúng | Chữ chuyển xanh ngọc, nảy 2 px; người trợ lực làm một nhịp tay; một đốm sáng chạy dọc dây |
| Phím sai | Thẻ rung ±3 px 120 ms; nền chữ kế tiếp hồng nhạt 0,15 s |
| Phím lạc | Không thẻ nào rung; Dải Chữ nháy một chấm xám |
| Sai 3 lần | Chữ kế tiếp sáng nhấp nháy; từ mới hiện lại nghĩa |

**Kết quả (đúng tên luật, mục 0.6):**

| Kết quả | Hình | Tiếng |
|---|---|---|
| Chớp | Dấu mộc tròn "Chớp!" xanh ngọc 0,5 s; chữ bay vào nhà có vệt sao; đèn lồng sáng xanh ngọc | Nốt Chuỗi + chuông sáng |
| Hoàn hảo | Chữ bay vào nhà, lấp lánh màu người trợ lực; đèn lồng trắng ấm | Nốt Chuỗi + "ting" |
| Tốt | Chữ bay vào nhà; đèn lồng trắng ấm | Nốt Chuỗi |
| Vừa | Chữ bay vào nhà, vệt mờ hơn; nửa đèn sáng | Nốt Chuỗi nhỏ hơn 2 dB |
| Ẩu | Vệt mờ; một đèn lồng tắt bớt (cam mờ) | Nốt thấp một bậc, nhỏ hơn 4 dB |
| Tan | Tro (bảng trên) | "Phù" |

**Chữ bay vào nhà:** thẻ thu còn 0,3, bay cong vào `FX_core` 0,22 s; tới nơi thẻ DOM tắt, WebGL bung 6–10 hạt là chính các chữ cái của từ; nhà phồng ×1,04 0,1 s; nhà làm **cú đáp** (mục 23.8).

**Thẻ đặc biệt:**

| Loại | Hình |
|---|---|
| Từ Vàng | Viền lá vàng kim, chữ vàng kim, dải ánh kim chạy ngang mỗi 1,2 s, icon đồng xu |
| Từ Sao / Từ Lá (VS) | Đèn tím có sao / đèn lục viền lá |
| Từ mới | Đèn cao hơn, dòng nghĩa, icon loa; khi đang gõ thì phát âm từ (một lần mỗi từ mỗi trận) |
| Từ Ôn | Dấu ↺, nghĩa hiện lại; xong thì ↺ nảy thành ✓, chữ "Chuộc lại!" |
| Từ sửa | Viền nâu xám, icon búa |
| Cụm chốt | Dải lụa dài, viền xanh ngọc dày, đầu dải màu họ nhà; khoảng trống giữa từ vẽ rõ (không cần gõ dấu cách) |
| Chữ Chiêu, Ấn Phụ | Đèn màu Tướng 26 px quanh vùng chiêu / lá bùa giấy ở điểm thả phép; chép ở Dải Chữ |
| Gõ trực tiếp | Cuộn giấy **viền đỏ có sọc chéo** ×1,1 cạnh đầu quái, icon tác dụng có vòng đếm giờ; quái viền trắng |
| Cụm ấn boss | Dải lụa rộng ở Đài Ấn, đồng hồ lớn, viền xanh ngọc, icon con dấu; bản sao chỉ để đọc dưới thanh boss |
| Từ Nhặt | Đèn nhỏ trên túi, icon túi, vòng 6 s |

**Không bao giờ bị VFX che:** thẻ là DOM trên canvas; **mặt nạ vùng yên** (mỗi khung vẽ hộp thẻ vào texture 64 × 36; hạt cộng màu nhân alpha với 1 − 0,6 × mặt nạ); chớp toàn màn ≤ 0,2 độ mờ chỉ trên canvas; rung camera không áp vào lớp thẻ; ảnh trượt Tối Thượng nằm dưới lớp thẻ; đồng nhỏ cắt qua thẻ < 0,1 s là chấp nhận được, chùm lớn bay vòng lên trên. Tạm dừng: thẻ mờ nhòe 6 px.

**Dải Chữ** (giữa dưới):
- **Gọn** (mặc định ở Thường, Khó): từ đang khóa (28–34 px, phần đã gõ xanh ngọc, nghĩa nếu là từ mới), Chuỗi, chip Tải. 360 × 44 px.
- **Đầy đủ** (tự bật khi có nhà được trợ lực đang khuất; luôn bật ở Dễ): thêm ≤ 6 chip của từ đang sống khác, xếp theo thời gian còn lại, và nút Sổ Từ. 680 × 60 px.
- **Chế độ khay** (trợ năng): bỏ thẻ trên bản đồ, mọi từ xếp 2 hàng chip trong dải.

**Huy hiệu nhịp và nhà:** huy hiệu tròn 20 px ở chân nhà, 1–4 chấm theo nhịp (8 s, 6 s: 1 chấm nhạt; 4 s: 1; 3 s: 2; 2 s: 3; 1 s: 4 xanh ngọc đậm), quả lắc lắc mỗi lần chữ ra. Đổi nhịp: huy hiệu nảy, chip 1,2 s "2 s", tiếng tích tắc. Nhịp 1 s: nét "hơi nóng" trên mái, thợ làm nhanh. Dấu trên mái: "…" (hoãn phát), đồng hồ xám (nghỉ lò), đèn giữa nhấp nháy (sẵn cụm chốt), mắt xích trên vòng Mượt (Chuỗi đang chặn vùng).

**Bùng Nổ:** cột sáng từ mái, cờ phần phật, 5 đèn lồng cháy rực, vòng rune nở to; hết thì cột thu về 0,4 s, đồng hồ nghỉ lò hiện. **Hợp Tấu:** dây sáng nối các nhà đang Bùng Nổ; ba nhà thành tam giác, vòng sáng trên đất giữa ba nhà; hợp âm thêm một nốt mỗi nhà. **Sợi chỉ Chuỗi:** từ trúng ở nhà khác nhà trước → ribbon xanh ngọc trắng 0,45 s nối hai nhà (≤ 8 cùng lúc). Không có luật riêng.

### 23.5 HUD (máy bàn)

- `--ui = clamp(0,8; min(rộng / 1600; cao / 900); 1,2)`. Cỡ hỗ trợ từ 1280 × 720 tới 2560 × 1440, DPR 1 và 2. Màn rộng 21 : 9: bảng bám góc thật.
- Luật cứng: HUD trong đợt ≤ 10 % diện tích; pha chuẩn bị ≤ 15 %; không bảng nào ở mép dưới cao quá 10 % chiều cao. Thẻ chữ có trần riêng ≤ 6 %.

| Thành phần | Vị trí | Cỡ (`--ui` = 1) |
|---|---|---|
| Mạng, Vàng, Lúa, Gỗ, Đợt n/N | Trên trái | 340 × 60 |
| Dừng, cài đặt, camera | Trên phải | 3 × 40 × 40 |
| Thanh boss (khi có) | Trên giữa | 560 × 34 (≤ 40 % rộng, ≤ 4 % cao) |
| Thanh trợ lực: 4 chân dung + chip Tải | Dưới trái | 260 × 64 |
| Dải Chữ | Dưới giữa | 360 × 44 (gọn) / 680 × 60 (đầy đủ) |
| 2 phép, 2 vật phẩm, nút Xây | Dưới phải | 300 × 64 |
| Cảnh báo mép (≤ 3) | Mép | 36 × 36 |

- Tổng khi có boss và Dải Chữ đầy đủ: khoảng 8,6 % diện tích. Gọn: khoảng 7 %.
- **Thanh trợ lực:** chân dung Tướng to nhất (vòng trong máu, vòng ngoài Tối Thượng, đầy thì sáng và hiện phím); chân dung Thư Đồng (khung màu, icon nhà đang trợ lực, chấm nhịp); số 1–4 ở góc; ô khóa có điều kiện ("Lũy cấp 2 · 150"). Kéo chân dung thả lên nhà để gửi. Nháy đúp: camera lướt tới.
- **Tài nguyên:** icon cũng là đích bay của loot. Số hiện = thật − đang bay. Lúa gần đầy: vạch hổ phách.
- **Vòng menu nhà** (≤ 6 nút 44 px): Nâng cấp (giá), Nhánh A/B (cấp cuối), Nhịp (Dừng / 6 / 4 / 3 / 2 / 1; nấc khóa ghi "L2", "L3"), Tập kết (Trại Lính), Gửi người (chân dung + ETA), Bán (bấm hai lần). Thẻ thông tin ≤ 260 × 150: tên, cấp, 3 chỉ số icon, ai đang ở đây, đèn lồng, "Mỗi từ: ~2 Vàng", "Hoàn vốn ≈ n đợt". Rê Nâng cấp: chỉ số mới màu lục, vòng tầm mới, model cấp mới mờ 50 %, nấc nhịp mới sáng.
- **Thanh boss:** tên, máu, vạch pha, biểu tượng trạng thái (Dễ Tổn Thương có đồng hồ). Báo trước đòn boss là decal trên đất đúng cỡ, không phải bảng UI.
- **Thanh máu** (một lô instanced): quái chỉ hiện khi đã mất máu; lính lam; nhà hổ phách chỉ khi bị thương; Tướng và Trợ Thủ thanh mảnh màu riêng.
- Hai skin HUD: Sách tranh (gỗ, giấy da, viền mực) và Neon (kính tối, viền sáng). Font UI Be Vietnam Pro; tiêu đề sách tranh dùng font tròn có đủ dấu tiếng Việt (ứng viên Baloo 2, phải kiểm bộ dấu).

### 23.6 Camera

- Chuột: kéo trái hoặc giữa để kéo bản đồ; kéo phải để xoay, nâng góc; lăn để zoom vào điểm dưới con trỏ; ngưỡng bấm và kéo 6 px. Bàn phím: mũi tên, Shift + mũi tên, F1–F3; F4 bám người đang chọn.
- Mặc định **55° ở 58 m**. Zoom 22–120 m. F3 "Toàn cảnh" 85° ở 100 m.
- **Camera không bao giờ tự chạy giữa đợt**, kể cả khi boss ra, khi tung Tối Thượng. Boss ra mắt: khung cận cảnh nhỏ 320 × 180 góc trên phải 2,5 s.
- Rung camera tối đa 6 px trong 120 ms, chỉ trên canvas.
- Vật che: dither 35 %. Được bảo vệ khỏi bị che: Tướng, Trợ Thủ, nhà đang trợ lực và khoảng trời trên nó tới hết cột chữ, mục tiêu gõ trực tiếp, boss, nhà đang chọn hay đang đặt.

### 23.7 Người trợ lực trên bản đồ

- **Gửi:** vòng đích nảy một lần; người đó nói một câu (50 % số lần, không lặp 3 câu gần nhất); đường nét đứt hiện thêm 1,5 s.
- **Xem trước** (rê chuột lên nhà hoặc Tab tô): Draconis có cung nét đứt trên không; người đi bộ có dải nét đứt theo đường A*; màu nét là màu người đi; chip ETA; dòng tác dụng ("Mỏ Vàng · 4 s · mỗi chữ ~2 Vàng"). Nhà đã có người: mũi tên "Đổi chỗ". Không tới được: nét đỏ, dấu chéo, lý do ("Qua suối phải đi cầu").
- **Tới nơi:** Tướng đứng lên bục trợ lực ở `FX_assist` (bệ gỗ nhỏ có bàn viết, thuộc model nhà); Draconis đậu mái. Thư Đồng đứng cạnh tổ thợ với bảng đá. Dây trợ lực màu người đó nối tay với lõi nhà (mỗi phím đúng một đốm sáng, tối đa 10 mỗi giây; mỗi từ trúng một xung). Thợ reo câu "Người tới".

| Người | Khi chữ ra | Mỗi phím đúng | Mỗi từ trúng |
|---|---|---|---|
| Draconis | Thổi đốm lửa lên đỉnh mái | Đốm lửa nhỏ ở mõm | Luồng lửa mảnh vào lõi |
| Lam | Vung vuốt, lửa lam bay lên | Lửa nhích cao | Vuốt chéo, lửa lam truyền vào nhà |
| Tre | Gõ búa lên cột | Búa nhỏ "cộc" | Đóng mạnh một nhát, mùn gỗ bay |
| Thư Đồng | Vẩy bút lên bảng đá, nét phấn bay lên | Nét phấn trên bảng | Giơ bảng đá lên, nét phấn lóe |

| Trạng thái | Trên bản đồ | Trên chân dung |
|---|---|---|
| Rảnh | Tướng tự đánh. Thư Đồng đứng cạnh Lũy lật sách. | Sáng |
| Đang đi | Đi bộ hoặc bay, ETA trên đầu khi được chọn | Mũi tên, icon nhà đích |
| Đang trợ lực | Ở ổ, dây trợ lực, hoạt ảnh làm việc | Icon nhà, chấm nhịp |
| Tướng đang đánh | Đánh quanh điểm được gửi | Icon kiếm |
| Thư Đồng hoảng | Chạy về Lũy, lông xù, giọt mồ hôi; đứng run 5 s | Viền đỏ, đồng hồ |
| Choáng, bị đẩy trong vùng | Sao quay; nhà ngừng phát (quả lắc đứng) | Xám |
| Tướng gục | Tan thành tro hoặc lửa, hồi sinh ở Lũy | Đồng hồ hồi sinh |

- **Mở ô** (nâng Lũy): cổng Lũy mở, Thư Đồng chạy ra có bụi phấn, "chíp!"; chân dung trượt vào thanh; banner 1,4 s "Thêm một người trợ lực"; Bà Cú Mực nói câu mở ô; lần đầu có bong bóng "Kéo em thả lên một nhà".
- **Ái lực trên thẻ:** Draconis tàn lửa cam ở mép thẻ; Lam lửa lam liếm mép (ngả cam khói khi gõ Ẩu); Tre vân tre. Phát Chữ mang nguyên tố của Tướng (ví dụ đuôi lửa).

### 23.8 VFX và tiếng theo thực thể

**Ngữ pháp một đòn:** lên đạn (lóe nhỏ ở nguồn) → bắn (lóe nòng, khói) → bay (đạn instanced, ribbon chung) → trúng (lóe trắng 60 ms trên mục tiêu, hình chính, mảnh theo chất liệu; tiếng 3 lớp: đầu nhọn 20 ms, thân, đuôi) → dư âm (khói, vết cháy, đồng xu). Đòn được mạnh lên nhờ chữ có **đầu đạn xanh ngọc**, **vệt màu người trợ lực**, và một tiếng "ting" cao ngắn trên cùng. Mọi Phát Chữ có vệt là chữ cái của chính từ vừa gõ.

**Chất liệu khi trúng:** vải, giấy (Cương Thi) "bụp" mềm; thịt, lông (Tanuki, Oni) "thịch"; bột (Nuppeppō) "bọp" ướt; vảy, nước (Thuồng Luồng) "cạch" ướt; đá (Troll) "cộc"; kim loại (Alicanto) "keng"; hồn (Ma Da, Ma Trơi) "vút" thủy tinh; gió (Chồn Liềm) "xoẹt"; gỗ (Mộc Tinh) "cộp".

**Đạn** (dữ liệu `ProjectileDef`):

| id | Ai | Quỹ đạo | Bay | Trúng | Mục tiêu chết trước |
|---|---|---|---|---|---|
| `arrow` | Tháp Cung | Thẳng, cong 0,3 m | 25 m/s | Đơn | Cắm đất, tan 1 s |
| `word-arrow` | Phát Chữ Tháp Cung | Thẳng | 32 m/s | Xuyên +1 | Bay hết tầm |
| `arrow-rain` | Mưa Tên | Rơi đứng | 0,6 s | 5 mũi mỗi 0,5 s, vùng 4 m | — |
| `shell` | Tháp Pháo | Cầu vồng, bóng chỗ rơi đúng bán kính | 1,0 s | Nổ vùng, rìa 50 % | Vẫn nổ |
| `word-shell` | Phát Chữ Tháp Pháo | Cầu vồng | 0,8 s | Nổ ×1,15 | Vẫn nổ |
| `ink-stroke` | Tháp Thư Pháp | Dải lụa đuổi | 18 m/s | Đơn | Tan thành chữ |
| `word-stroke` | Phát Chữ Thư Pháp | Thẳng 12 m | 24 m/s | Xuyên +1 | Bay hết |
| `keep-bolt` | Nỏ Lũy | Thẳng | 28 m/s | Đơn | Cắm đất |
| `fireball` | Draconis | Cong nhẹ | 16 m/s | Nổ 1,8 m | Nổ ở điểm cuối |
| `flame-cone` | Hơi Thở | Nón 7 m | Mỗi 0,5 s, 3 s | Vùng + cháy | — |
| `fire-feather` | Mưa Lông Lửa | Rơi, bóng báo 0,8 s | 0,8 s | 60 P + vũng | — |
| `pebble` | Ná của Tre | Cong nhẹ | 20 m/s | Đơn | Rơi đất |
| `melee` | Lam, lính, quái cận chiến | Tức thì ở khung đòn | — | Đơn hoặc quạt | — |
| `meteor` | Mưa Đá Lửa | Rơi chéo | 0,9 s | 80 VL + cháy | — |
| `water-ring` | Thuồng Luồng | Vòng 5 m, báo 0,8 s | — | Đẩy lính 1,5 m | — |
| `jar-blast` | Tất Phương | Nổ tại thân, báo 0,5 s | — | Nhà 45, lính 30 | — |
| `seed-drop`, `root-burst` | Mộc Tinh | Rơi / từ đất, báo 1,2–1,5 s | — | 40 VL / nhà 30 + tê 3 s | — |
| `quill` | Đại Bàng Tinh | Thẳng xuống | 20 m/s | Nhà 10 VL | — |

- Sát thương tính ở tick đạn tới. Tối đa 512 đạn. Mỗi loại một `InstancedMesh`. Không có quái trong tầm: Phát Chữ bay lên thành pháo hoa nhỏ.

**Nhà** (tự chạy · cú đáp mỗi từ · Bùng Nổ):

| Nhà | Tự chạy | Mỗi từ trúng | Bùng Nổ |
|---|---|---|---|
| Lũy | Nỏ bắn, vệt trắng. "Tchk", "phập". | Một đồng bay về ô Vàng + một mũi nỏ sáng. "Tchk" + tick đồng. | Vòm chữ trong suốt quanh Lũy; "boong" mỗi lần chặn |
| Tháp Cung | Dây cung chớp, tên trắng. "Thwip" ×4 biến thể, trúng "thock". | Tên Chữ đầu xanh ngọc, vệt chữ cái. "Thwip" nặng + chuông nhỏ. Chí mạng: dấu "!" và "tách". | Mưa tên có vệt sáng, rào rào |
| Tháp Pháo | Lửa nòng, khói, bóng chỗ rơi; nổ bụi, vết cháy. "Thoomp", rít 0,4 s, nổ 3 lớp. Nhiều quái trúng: một tiếng nặng hơn. | Thợ nhét quả đạn vằn xanh ngọc, bắn ngay; nổ bung mảnh chữ. "Cạch", "pụp", nổ có lấp lánh. | Ba quả cùng lúc, nổ lệch 60–80 ms |
| Tháp Thư Pháp | Cọ vung, dải mực đuổi, vỡ thành chữ nhỏ. "Swish", giấy sột soạt. | Chữ của từ bay thành nét sáng thẳng. "Swish" dài + chuông đôi. | Chữ khổng lồ trên đất; cọ dài, chiêng nhẹ |
| Trại Lính | Lính ra cổng có bụi, vòng hồi sinh đầy dần. Trống da, tiếng hô. | Trống đập một nhịp, đốm sáng tới lính được hồi. "Tùng", lính hô "Hup!". | Cờ phần phật, lính lao 4 m, "Xung trận!" |
| Mỏ Vàng | Cuốc tóe lửa, goòng chạy, đống lớn dần. "Tink", goòng lăn. | Thợ cuốc mạnh, 1–4 đồng bay lên ô Vàng. "Ching" theo thang nốt. | Cột vàng phun, mưa đồng |
| Ruộng Lúa | Lúa đung đưa, gặt định kỳ. Xào xạc, liềm "xoẹt". | Khóm lúa mọc vọt, bó lúa bay lên ô Lúa. "Bụp", "sột". | Sóng lúa vàng, đàn cò bay, trâu "ọ" |
| Trại Gỗ | Cưa hai người kéo, mùn cưa. | Rìu bổ, khúc gỗ bay lên ô Gỗ. "Cộc", "cốc". | Gỗ lăn ầm ầm |
| Đài Ấn | Sóng Chữ gợn đúng bán kính, Mạch Chữ sáng theo nhịp. Chuông gió. | Vòng chữ chạy dọc mạch đất, tia sao bay về chân dung Tướng. Hợp âm thủy tinh. | Cột sáng toàn chữ cái, vòng choáng 9 m |
| Nhà Thuốc | Lá xanh xoay quanh người được hồi, hơi thuốc. Nồi sôi, chuông nhỏ. | Bà Lang ném túi lá, hạt bạc hà tới lính bị thương nặng nhất. "À" khoan khoái. | Vòng hơi nóng 12 m |

**Trạng thái chung mọi nhà:** xây (giàn tre, bụi, model mọc 1,2 s; búa, "hò dô"); nâng cấp (giàn giáo 1 s, bộ cấp rơi từ trên xuống nảy, lóe viền, vòng tầm mới quét ra; búa dồn, stinger 2 nốt, câu thợ); chọn nhánh (màu nhánh quét từ chân lên, đổi model trong khói 0,4 s, hợp âm 3 nốt); bán (nhà tháo thành ván bay đi, đồng bung); bị đánh (khung lóe đỏ, mảnh theo chất liệu, câu thợ chờ 8 s); hư (nứt, khói); Đổ Nát (sập, bụi lớn, "ầm"); sửa bằng gõ (tia lửa vàng xanh mỗi từ, ván mới đóng vào).

**Mỗi nâng cấp có dấu hiệu thấy được trong trận:** thêm ô → chân dung mới và lễ mở ô; bán kính hút lớn hơn → vòng hút hiện 1 s đầu mỗi đợt; mở nhịp mới → nấc nhịp sáng, huy hiệu thêm chấm; cấp nhà → bộ cấp, cờ có vạch cấp, đạn và lóe ×1 / ×1,1 / ×1,2 (nhánh ×1,25, chỉ lớp trang trí), tiếng bắn L2 thêm lớp trầm, L3 đuôi dài hơn; Tướng mạnh hơn → hào quang sáng thêm ở cấp 4, 7, 10; Lũy cấp cao → tường, chòi, cờ mới, trần nhà đánh đổi số.

**Tướng:**

| Tướng | Đòn thường | Kỹ năng | Tối Thượng | Gục, hồi sinh |
|---|---|---|---|---|
| Draconis | Lóe cam ở miệng, cầu lửa có vệt lông cháy; nổ cam, vết cháy. "Whoom", rít, nổ 2 lớp. | Nón lửa cuộn (hơi thở lặp); vòng méo không khí 6 m, quái bay rơi (gầm sâu, vang 0,6 s) | Câu Tối Thượng → ảnh trượt → bay cao rải lông, bóng tròn báo 0,8 s mỗi chiếc, vũng than đỏ; mỗi Chữ Chiêu một nhịp trống to dần | Tan thành tro và lông, gầm nhỏ dần / bùng lửa phượng ở Lũy |
| Lam | Hai vệt vuốt cobalt, tia lửa xanh. "Shhk" ×3. | 3 vòng cung vuốt; vệt lửa lam trên đường | Lấy đà, vệt sao chổi xanh 20 m, sóng lửa khi tiếp đất; gió rít rồi nổ lửa | Lửa thu nhỏ thành đốm, tiếng xì / bùng lửa |
| Tre | Viên đất nâu, vệt bụi mảnh. Ná "phựt", trúng "cộp". | Bó tre ném, rào mọc có nảy; chuồn chuồn bay, số máu xanh | Giàn giáo hiện từng thanh quanh nhà, số máu xanh bay lên; "lách cách" nhiều lớp, dân hô "Dô!" | Ngồi bệt, sao xoay / chạy ra từ Lũy |

- **Ảnh trượt Tối Thượng:** chân dung 2D trượt vào từ mép trái 0,6 s, cao ≤ 30 % màn hình, dải nền màu Tướng. Không dừng hình, không di chuyển camera.
- **Hút Mảnh Chữ:** chữ cái bay cong vào ngực (Draconis), túi thư (Lam), gùi (Tre); lóe màu riêng; "ting" theo bậc Chuỗi.

**Thư Đồng** (nhỏ, vui, không lấn Tướng): đi (bước lò dò, lông tơ rơi, "lạch bạch"); tới nhà (bụi phấn ở bảng đá, "pụp"); bắt chữ (nét phấn lóe, đốm sáng dọc dây; tiếng của nhóm nhà nhỏ hơn Tướng 3 dB); Từ Vàng (vỗ cánh reo, "chíp!"); hoảng (vỗ cánh loạn, vài sợi lông, "á!" nhỏ có vang); bắt túi (`Helper_Catch`). Tối đa 1 câu Thư Đồng mỗi 2 s cho cả bản đồ.

**Lính:** Lính Giáo đâm (vệt giáo trắng ngắn, "xoạt", trúng "phập"); giáp lá cà (tia lửa giữa lính và quái, trần 8 mỗi giây); mạnh lên nhờ chữ (mũi giáo lóe xanh ngọc); chết (ngã ngồi, tan thành chữ cái bay lên, "Á!"); hồi sinh (chạy ra từ cổng). Lính Khiên: khiên "đoang", Khiên Tường vòm đồng mờ. Câu hô: "Militia ready!", "Hold the road!", "Hooray!", "Charge!", "Shields up!".

**Quái và boss:** hình, tiếng, báo trước ở mục 22.6–22.7. Đổi pha boss: gầm, trời và sương ngả màu boss 20 %, banner tên pha. Bóc Vỏ hay Dễ Tổn Thương: mảnh vỡ, vòng sóng, chữ "DỄ TỔN THƯƠNG 8 s".

**Trạng thái trên quái** (shader đám đông, không thêm draw call): chậm ám lam; choáng sao quay; đóng băng vỏ băng; cháy lửa nhỏ trên lưng; độc bong bóng; đánh dấu dấu chéo dưới chân; lộ diện viền trắng; phá giáp icon giáp nứt; câm dấu kín miệng.

**Giới hạn VFX:** 2.400 hạt chiến đấu (High), 1.200 (Medium); mỗi khung sinh mới ≤ 260 hạt, 24 billboard, 8 vòng, 4 decal; overdraw cộng màu ≤ 1,5 màn hình; chớp toàn màn ≤ 2 lần mỗi giây; đòn vùng trúng N quái: một vụ nổ cỡ √N, 2 hạt mỗi con, tối đa 20; hạt chữ cái ≤ 120 (một atlas chữ).

### 23.9 Hoạt ảnh: bảng clip chuẩn

Đây là **bảng duy nhất**. Preset Blender, file prompt ảnh và `scripts/models/presets/td-models.json` sinh từ bảng này. Không có chuyển động gốc (game di chuyển thân). Mọi đòn một lần bắt đầu và kết thúc ở tư thế đầu của Idle. Biến thể theo nhóm nhà dùng hậu tố chấm: `Helper_Assist.tower`, `.drum`, `.craft`, `.support`; thiếu biến thể thì dùng clip gốc.

| Loại | Bắt buộc | Nên có | Bí danh cho model có sẵn |
|---|---|---|---|
| Tướng đi bộ | `Hero_Idle`, `Hero_Run`, `Hero_Attack`, `Hero_Skill1`, `Hero_Skill2`, `Hero_Ult`, `Hero_Assist` (lặp), `Hero_Hit`, `Hero_Death`, `Hero_Respawn`, `Hero_Victory` | `Hero_Idle_Fidget`, `Hero_Dash` (Lam), `Hero_Ult_Echo`, `Hero_Assist_Beat` (cộng, một nhịp mỗi phím đúng), `Hero_Bridge` (Tre) | — |
| Tướng bay (Draconis) | `Hero_Fly`, `Hero_Idle`, `Hero_Attack`, `Hero_Skill1`, `Hero_Skill2`, `Hero_Ult`, `Hero_Assist`, `Hero_Takeoff`, `Hero_Land`, `Hero_Hit`, `Hero_Death`, `Hero_Victory` | `Hero_Perch_Idle`, `Hero_Ult_Echo`, `Hero_Ground_Idle` | `Hero_Idle` → `Hero_Idle_Hover`; `Hero_Attack` → `Hero_Attack_Both` (biến thể `_L`, `_R`); `Hero_Ult` tạm → `Hero_Cast`; `Hero_Assist` tạm → `Hero_Idle_Hover` tới khi có `Hero_Perch_Assist` |
| Trợ Thủ | `Helper_Idle`, `Helper_Walk`, `Helper_Assist` (+ hậu tố nhóm), `Helper_Cheer`, `Helper_Catch`, `Helper_Scared` | `Helper_Intro` (lễ mở ô) | Model tạm `guides/draconis-v4`: `Guide_Idle`, `Guide_Hop`, `Guide_Talk`, `Guide_Wave`, `Guide_Bow`, `Guide_Flap` |
| Lính | `Unit_Idle`, `Unit_Walk`, `Unit_Attack`, `Unit_Hit`, `Unit_Death`, `Unit_Cheer` | `Unit_Skill` (Lính Khiên), `Unit_Charge` | — |
| Thợ ở nhà | `Worker_Work`, `Worker_Strike` (một nhát mỗi chữ) | `Worker_Cheer` | — |
| Quái | `Enemy_Move`, `Enemy_Idle`, `Enemy_Attack`, `Enemy_Hit`, `Enemy_Death` | `Enemy_Skill` | — |
| Boss | `Boss_Intro`, `Boss_Idle`, `Boss_Move`, `Boss_Attack`, `Boss_Skill.<tên>`, `Boss_Channel`, `Boss_Stun`, `Boss_Hit`, `Boss_Phase`, `Boss_Death` | `Boss_Retreat` (Mộc Tinh bản đồ 1), `Boss_Glide`, `Boss_Perch` | `bosses/lieutenant-nature`: `Boss_Idle_Hover`, `Boss_Hit`, `Boss_Death`, `Boss_Intro` |
| Nhà | `Building_Idle`, `Building_Fire` | `Building_Work`, `Building_Hit`, `Building_Ruin` (phần lớn bằng shader) | — |

- **Khung xương thật (skinned) tối đa 8 cùng lúc:** Tướng, ≤ 3 Trợ Thủ, boss, ≤ 3 quái tinh nhuệ gần camera. Mọi thứ khác dùng VAT (nướng clip thành texture) hoặc shader trên instanced mesh; model Tripo có khung xương mà vẽ instanced phải nướng tư thế đứng.
- **Socket:** nhân vật `FX_HAND_R`, `FX_HAND_L`, `FX_HEAD`, `FX_CORE`, `FX_FEET`, `FX_TOOL`; nhà `FX_muzzle`, `FX_core`, `FX_top` (chỗ cột chữ mọc, giữa đỉnh mái), `FX_perch` (chỗ Draconis đậu khi trợ lực, cao hơn `FX_top` 0,6 m để không che gốc cột chữ; Tháp Pháo và Đài Ấn không có mái che đỉnh nên có điểm đậu riêng ở mép sau, xem `docs/art-requests/td/02-tripo-buildings-props.md` mục 8), `FX_word`, `FX_assist` (bục trợ lực), `FX_crew`, `FX_banner`, `FX_pile` (Mỏ), `FX_lantern_0..4`.
- **Ai làm gì:** Tripo (chủ dự án) dựng model từ ảnh 2D, tự rig dạng người hoặc bốn chân, clip tại chỗ (đứng, đi, chạy). Blender (AI, `scripts/models/blender/space_typing_model_tools.py`) chuẩn hóa cỡ và hướng, giảm tam giác, gắn socket, làm clip đánh, chiêu, trợ lực, thắng, chết theo bảng này. **AI không dựng model bằng mã.** Việc mới cho bộ Blender: `--kind helpers|units|buildings`, ánh xạ xương Tripo sang vai trò, `make_ground_hero_clips`, `make_helper_clips`, `make_soldier_clips`, `make_worker_clips`, `bake_vat.py`, ảnh xem trước cho chủ dự án duyệt.

### 23.10 Cảnh vật 2D

| Dùng 3D (Tripo → Blender) | Dùng 2D (tranh vẽ) |
|---|---|
| Tướng, Trợ Thủ, lính, thợ, trâu, chuồn chuồn | Cây, tre, bụi, cỏ, hoa, lau, dương xỉ |
| Nhà, bộ cấp, nhánh, đống đổ nát | Đá nhỏ và vừa, sỏi, khúc gỗ mục |
| Quái, boss | Núi, đồi, đảo, mây, bầu trời xa |
| ≤ 6 mốc cảnh có luật chơi mỗi bản đồ (cầu, Đá Kê, gốc đa, hải đăng, vách thác gần) | Thú nền: cò, hải âu, đom đóm, bướm |
| Địa hình, đường, mặt nước (mesh + shader) | Vết đất, vũng, hoa trên đất, vết cháy (decal) |

**Dạng:** billboard trục đứng (cây, bụi, đá tròn; quay quanh trục đứng theo camera, ngả về camera 0,3–0,5 góc nhìn, tối đa 35°); **khối tán** cho mép rừng (3–5 tán tròn dính nhau, xếp 2–4 hàng lệch, hàng sau cao và tối hơn 8 %, như ảnh 4.webp); cỏ cao gần camera (hai tấm vuông góc); cỏ thấp, hoa nhỏ, sỏi vẽ vào texture đất lúc nạp; impostor 8 hướng cho đá lệch, tàn tích; phông xa 2–3 trụ (140 / 220 / 320 m) + vòm trời; sprite động (flipbook) cho thú nền.

**Làm đẹp dưới camera xoay tự do:**
- Tranh gốc **ánh sáng phẳng**, không bóng đổ. Script tạo **pháp tuyến phồng** từ alpha; shader dùng chung ramp 3 bậc với model 3D; đáy tối 25 %; rim ngược sáng 15 %; tint theo vùng và giờ.
- **Bóng theo dáng tranh** (High): alpha của tranh ép dẹt theo độ cao mặt trời, xoay theo hướng nắng, vẽ **một lần** vào texture bóng của đất lúc nạp. Medium, Low: quad bóng tròn mờ.
- Đung đưa theo gió (hai tần số 0,3 và 1,1 Hz, pha theo vị trí); nổ gần làm cây nghiêng rồi bật lại 0,6 s (tối đa 4 xung mỗi khung); cỏ rẽ theo texture giẫm 128² (bước 1C chỉ đung đưa; giẫm và gió giật ở bước 2).
- **Viền mực chuẩn** do script thêm (1,5–2 px trên màn hình ở camera mặc định); nở màu 8 px ra ngoài alpha để không có quầng trắng.
- Vẽ ở lượt đục: cắt alpha 0,5 và ghi chiều sâu; High thêm alpha-to-coverage (MSAA 4×). Ẩn hiện bằng dither. Góc > 75° (F3): cây lớn trộn sang decal tán nhìn từ trên.
- Chống lặp: ≥ 4 biến thể mỗi loại; mỗi bản sao tỉ lệ ±15 %, lật ngang, lệch màu ±4 %; hai cây liền nhau khác biến thể; rải Poisson có cụm, theo seed bản đồ.
- **Phá khi đặt nhà:** cây lật ra ngoài 0 → 85° trong 0,25–0,35 s, 3–5 mảnh lá hoặc gỗ, decal gốc cây ở lại, vẽ lại vùng bóng nhỏ. Tiếng "rắc" theo vật liệu.

**Ngân sách duy nhất:** High 1.500 vật lớn (cây, đá, bụi, khối tán) + 4.000 cỏ và hoa chữ thập; Medium 1.000 + 1.600; Low 600 + 0 (cỏ vẽ vào nền). ≤ 6 draw call cảnh 2D + 2–3 trụ phông. Atlas màu + pháp tuyến 2 × 4096² (High), 2 × 2048² (Medium). Đo ở góc thấp 15° (nặng nhất).

**Quy trình tranh:** chủ dự án tạo tranh bằng ChatGPT theo file prompt → `art-src/td/scenery/<vùng>/<id>-v<n>.png` (không vào Git) → `scripts/td/prepare-scenery.mjs` (sharp): tách nền theo khóa màu, cắt sát, lề 8 px, thêm viền mực, nở màu, tạo pháp tuyến phồng và tấm bóng, xếp atlas, ghi manifest → KTX2 khi có `toktx`, không thì WebP. **Luật prompt tranh cảnh:** một vật, toàn thân, giữa ảnh, chân ở giữa đáy; nhìn ngang cao hơn mắt ~10°; ánh sáng phẳng từ trước; tán lá gom thành khối tròn lớn, đáy hơi tối; viền mực đều; không đất, không cỏ quanh chân, không phần mờ, không sợi mảnh; nền phẳng `#00FF00` (vật xanh lá: `#FF00FF`; có cả xanh lá và hồng: `#0000FF`); cạnh dài ≥ 1024 px.

### 23.11 Ảnh 2D gửi Tripo

| Loại | Ảnh dựng 3D | Ảnh phụ |
|---|---|---|
| **Có khung xương dạng người** (Tướng, Trợ Thủ, lính, thợ, quái hai chân, boss dạng người) | Toàn thân, **nhìn thẳng từ trước, gần trực giao**, tư thế A (tay xuôi 30–45°, chân hơi dang), mặt bình thường, ánh sáng phẳng không bóng đổ | Nghiêng 90° và sau lưng cùng tư thế (không bắt buộc) |
| **Bốn chân, rắn, chim** (Thuồng Luồng, Alicanto, Đại Bàng Tinh, heo đất, trâu) | **Nhìn ngang 90° gần trực giao**, chân thẳng, cánh dang vừa | Nhìn thẳng từ trước |
| **Nhà, mốc cảnh** | Nhìn 3/4 từ trước, cao 25–45°, đáy cắt phẳng, không đất quanh chân, không thợ, không đèn lồng Nhiệt | — |
| **Chân dung, ảnh trượt, tranh truyện** | 3/4 tự do, có hành động, có lửa và hiệu ứng | Không gửi Tripo |

- Chung: nền phẳng `#00FF00` (nhân vật có xanh lá: `#FF00FF`). Không lửa, hạt, hào quang, vệt chuyển động (làm bằng VFX). Tóc, lông, lá gom thành mảng to. Vũ khí cầm chắc trong tay; vũ khí dài mỏng vẽ riêng để Blender gắn vào socket. Đuôi vòng ra một bên. Áo choàng không bay.
- Thư Đồng: cú non đứng thẳng, cánh mở nửa ngang vai, hai chân rõ, bảng đá đeo chéo, bút lông cắm sau lưng.
- Ảnh 2.png (chiến binh mèo lửa xanh) là mẫu cho Lam: giữ tỉ lệ đầu ~40 %, mắt to, mặt trắng có mặt nạ lông đen, bề mặt mờ như vinyl; **bỏ lửa khỏi ảnh gửi Tripo** (Tripo dựng lửa thành mảnh rời, gãy khung xương); ảnh có lửa dùng cho chân dung.

### 23.12 Bộ phong cách và vùng đất

| Mảnh | Lo việc gì | Ví dụ |
|---|---|---|
| StylePack | Cách vẽ: shading, hậu kỳ, kiểu VFX, kiểu thẻ chữ, kiểu HUD | Sách tranh (bão hòa ×1,15, tone Neutral, bloom 0,25); Neon (mạch phát sáng, tone ACES, bloom 0,6) |
| BiomeRecipe | Địa hình, nước, luật rải cảnh | Đồng cỏ, bờ biển, rừng mưa |
| BiomeArt | Texture đất, bộ tranh cảnh, phông xa, trời, âm nền | Tán đa, đá vôi, đồi chè |
| CivKit | Trang trí nhà, áo lính và thợ, cờ, nhạc cụ, hoa văn HUD | "Liên Minh Làng" (Văn Điền) |

- Bóng hình theo chức năng giữ ở mọi văn minh (Tháp Cung cao mảnh, Pháo thấp tròn nòng to, Trại Lính rộng có trống…). Văn minh chỉ đổi mái, vật liệu, cờ, hoa văn.
- **Neon cần atlas cảnh riêng**, vì viền mực và cách tô đã nướng vào tranh sách tranh. Model GLB dùng chung được (đổi vật liệu bằng StylePack).
- Việc VS: dựng bản đồ 1 với StylePack Neon để kiểm việc đổi bộ (mục 26.2).

### 23.13 Phim và cảnh

| Bậc | Là gì | Khi nào |
|---|---|---|
| C0 | Chuyển động UI: chân dung nảy, banner, ảnh trượt Tối Thượng, lễ mở ô | Trong trận |
| C1 | Trong trận: boss ra mắt (khung cận cảnh nhỏ), Tối Thượng, thắng thua | Trong trận |
| C2 | Trong engine có dàn dựng: bay lướt mở bản đồ 4–6 s; giới thiệu Tướng 6–8 s; thắng `Hero_Victory` + camera xoay 3 s | Ngoài đợt; bỏ qua bằng Esc |
| C3 | Tranh truyện: mỗi chương 3–6 tranh 16 : 9, lướt chậm, phụ đề, giọng kể tiếng Việt | Giữa các bản đồ |
| C4 | CGI dựng sẵn (render Blender từ model Tripo) | Sau MVP: mở đầu thế giới, kết lớn (quyết định mục 28) |

### 23.14 Kiểm tra hình (kịch bản `scripts/visual/scenarios/td-*.mjs`)

Chạy được khi chỉ có manifest, không có media. Gõ thật qua CDP `Input.dispatchKeyEvent` theo WPM đặt sẵn. Mọi kịch bản kiểm: không lỗi console, draw call trong ngân sách.

1. `td-words.mjs`: 4 nhà nhịp 1 s đặt sát nhau trong 20 m, 1280 × 720 và 1920 × 1080. Không hai thẻ chồng; mọi thẻ trong vùng an toàn; cỡ ≥ 18 px; tương phản ≥ 7 : 1; chữ đầu khác nhau; xoay camera cho 2 nhà ra ngoài → khay mép đúng phía; diện tích thẻ ≤ 6 %. Thêm ca L = 7,5 s (Dễ, E = 12) với N = 1 s và 2 s. **Bắt buộc đạt.**
2. `td-words-vfx.mjs`: nổ ngay dưới một cột chữ; đo độ sáng quanh thẻ có và không có mặt nạ vùng yên.
3. `td-scale.mjs`, `td-readability.mjs`, `td-hud-budget.mjs` (mọi cỡ màn hình).
4. `td-routing.mjs`: chọn người bằng chân dung, số, Backquote; gửi bằng chuột phải, Shift + phải, kéo chân dung, Tab + Enter; đổi chỗ; lễ mở ô; người đang chọn không đổi sau lệnh.
5. `td-keyboard-only.mjs`: một bản đồ chơi trọn chỉ bằng bàn phím.
6. `td-loot.mjs`: đồng về ô Vàng và bám đất khi kéo camera; Lúa, Gỗ về ô của chúng; Mảnh Chữ về Tướng chỉ khi trong vòng; túi mở khi gõ đúng hoặc đi qua, tự mở một nửa khi hết giờ; số HUD đúng sau khi đồng tới.
7. `td-scenery.mjs`: 3 góc × 4 hướng xoay; không quầng trắng; bóng đúng nắng; cây nghiêng ở góc cao.
8. `td-ime.mjs`: Telex, VNI, số, Backquote, `-`, `=`, Tab, Enter, phím lệnh.
9. Âm thanh (chỉ tai người quyết): 4 nhà nhịp 1 s không ồn; nốt chữ đúng giọng nhạc; thoại không đè phát âm từ.
10. Chủ dự án xem ảnh trước và sau mọi bước đổi hình.

---

## 24. Âm thanh

### 24.1 Mục tiêu

- Kingdom Rush "sống" vì gần như mọi hành động có một tiếng hoặc một câu ngắn. **Đủ độ phủ quan trọng hơn nhiều câu.**
- Dòng chữ liên tục từ nhiều nhà dễ gây ồn. Luật: **chữ là giai điệu, trận là trống.** Tiếng xong chữ là nốt trên thang ngũ cung cùng giọng với nhạc nền. Tiếng đánh nhau là tiếng gõ, tiếng nổ. Tiếng chữ ra rất nhỏ và được dời vào nhịp nhạc.
- Tiếng gõ không bao giờ bị trận đánh hay thoại đè. Nó chỉ nhường phát âm từ.

### 24.2 Bus và nhường tiếng

```
music · ambience · world (va chạm, đạn, nổ, cú đáp) · crowd (lính, quái, thợ, Trợ Thủ)
dialogue (Tướng, boss, người kể) · typing (keys tổng hợp + words) · rewards · warnings · ui
→ master → limiter (DynamicsCompressor, ngưỡng −3 dB, tỉ lệ 20, attack 1–3 ms)
Một ConvolverNode chung làm vang, đổi theo vùng đất.
```
- Bus `typing` có bộ nén nhẹ riêng để 4 nhà nhịp 1 s không dồn cục.
- Mỗi tiếng là một bản ghi manifest: `{ id, bus, files[], layers[{files, delayMs, gainDb}], gainDb, pitchJitter, gainJitterDb, priority, maxInstances, minGapMs, cooldownMs, noRepeat, spatial, reverbSend, beatQuantizeMs, license{tool, plan, date, prompt} }`.
- **Thiếu file thì dùng tiếng tổng hợp hoặc tiếng CC0 có sẵn.** Game không bao giờ vỡ vì thiếu âm.

| Khi | Hạ | Thời gian |
|---|---|---|
| Phát âm từ (học) | Giữ `PRONUNCIATION_DUCK`; hoãn mọi thoại và câu hô | Như hiện có |
| Thoại Tướng, boss, người kể | music −6, ambience −6, world −3, crowd −6 dB | Xuống 80–150 ms, lên 400–600 ms |
| Đang gõ Chữ Chiêu, cụm ấn | world −3, crowd −6, music −3 | Theo dải |
| Boss báo đòn | world −4, music −3; tắt câu hô vui | — |
| Nhà có chữ đang khóa | Tiếng lặp của nhà đó +3 dB | Để tai theo mắt |
| Tạm dừng | world qua lọc thấp 800 Hz | — |

### 24.3 Ưu tiên và trần

| Mức | Gồm | Luật |
|---|---|---|
| P0 | Phát âm từ | Luôn phát. Hoãn mọi thoại trừ P1. |
| P1 | Boss báo đòn, mở cửa sổ gõ trực tiếp, mở cửa sổ ấn, nhà Đổ Nát, Lũy yếu, Cơn Gấp báo | Luôn phát. Cắt P4–P5. |
| P2 | Phản hồi gõ: chữ ra, khóa, phím đúng sai, xong chữ, tan | Không bao giờ bị P3–P5 che |
| P3 | Thoại Tướng, Trợ Thủ; mốc Chuỗi; Bùng Nổ; Từ Hiếm hiện; boss ra mắt, đổi pha | Không lặp 3–5 câu gần nhất. Câu gửi người phát 50 %. |
| P4 | Đạn, va chạm, nổ, câu hô chiến đấu | Có thời gian chờ |
| P5 | Câu vui, đứng chờ, tiếng hô lính, tổ thợ, môi trường | Câu vui 20–40 s một lần |

- Cùng lúc tối đa: 1 giọng thoại; 2 tiếng hô (3 ở High); 2 tiếng quái; 24 tiếng thế giới (12 ở Low); cùng một tiếng ≤ 4 lần mỗi 100 ms; nổ ≤ 4 trong 120 ms; tiếng nhặt ≤ 6 mỗi 100 ms; tiếng "chữ ra" ≤ 6 mỗi giây cho cả bản đồ.
- Thời gian chờ: giữa hai câu thoại 1,5–2,5 s; câu khen Chuỗi 8–12 s (chỉ từ mốc 10); lính hô 6–10 s mỗi trại (1,2 s chung); thợ reo khi người tới 10 s mỗi nhà; Thư Đồng 2 s chung; quái gầm 0,4 s chung. Câu thoại bắt đầu 50–150 ms sau va chạm thấy được.

### 24.4 Giọng nhỏ vang vọng

- Giọng → lọc cao 120–180 Hz → nén nhẹ → khô + gửi vào vang chung.
- **Vang theo vùng** tạo bằng mã (nhiễu tắt dần), không cần file: đồng cỏ 0,6 s; bờ biển 0,9 s; rừng 0,9 s (tối); hẻm núi 1,6 s, trễ đầu 60 ms; đầm 0,8 s; băng nguyên 1,2 s.
- Mức gửi vang: Tướng 10–15 %, Trợ Thủ 25 %, lính và quái 20–30 %. Người nói ở xa hay ngoài màn hình: nhỏ hơn, vang hơn 10 %, lọc thấp.
- Lính, Trợ Thủ: nâng cao độ +2 bán cung cho giọng "tí hon". Kho 3–6 câu hô mỗi loại, đổi cao độ ±5 % để một giọng nghe như nhiều người.
- Tiếng ồn trận (walla): vòng lặp, bật khi có ≥ 4 trận giáp lá cà trên màn hình.

### 24.5 Va chạm nhiều lớp

- Mỗi va chạm: đầu nhọn (~20 ms), thân, đuôi, thêm tiếng trầm cho đòn nặng; mỗi lớp tạo riêng, ghép trong engine, lệch 0–12 ms. Chọn theo chất liệu mục tiêu.
- 3–6 biến thể, xoay vòng, không lặp ngay; tốc phát 0,96–1,04, gain ±1,5 dB. Thoại Tướng, boss: không đổi cao độ quá ±1 %.
- Đòn vùng trúng N quái trong 50 ms: một tiếng nặng hơn + lớp "nhiều mục tiêu". Pháo rít 0,4 s trước chỗ rơi.

### 24.6 Âm gõ và chữ

| Sự kiện | Tiếng | Trần |
|---|---|---|
| Từ ra | "Tích" rất nhỏ (−24 dB so với nổ), âm sắc theo loại nhà, có vị trí trái phải; **dời tối đa 70 ms vào nốt móc đơn gần nhất của nhạc** (chỉ tiếng, luật không đổi) | 6 mỗi giây |
| Từ Vàng ra | Lấp lánh riêng (P3) | Luôn phát |
| Khóa / đổi khóa | "Tách" 12 ms / hai "tách" nhanh | — |
| Phím đúng | Tổng hợp theo loại nhà (dây cung, sắt, cọ, trống, cuốc, gõ gỗ, rìu, chuông, chày, nỏ); mỗi chữ cái nâng 1 bán cung, tối đa 12, về lại khi xong từ | — |
| Phím sai, phím lạc | "Tóc" đục, nhỏ hơn 12 dB. **Không còi.** | — |
| Trúng | Nốt trên thang Chuỗi (ngũ cung như `credit-sound.ts`) + tiếng cú đáp của nhà (bus world) | Nốt cách nhau ≥ 30 ms |
| Chớp, Hoàn hảo | Thêm chuông sáng / "ting" | — |
| Tan | "Phù" giấy −18 dB | 2 mỗi giây |
| Mốc Chuỗi | Câu nhạc 3 nốt đúng giọng nhạc nền | 1 lần mỗi mốc |
| Chuỗi bị trừ | Dây đàn chùng "tưng" nhỏ | — |
| Cụm chốt ra | Tiếng dây căng 0,6 s | — |
| Hợp Tấu | Hợp âm sáo trúc 2 / 3 nốt | — |
| Đổi nhịp | "Click" bánh răng | — |

- Tiếng phím bắt đầu dưới 20 ms, dài dưới 60 ms. **Tiếng phím tổng hợp bằng mã, không làm bằng AI.**
- Với bộ gõ tiếng Việt: chỉ phát khi chữ cái đã xác nhận.
- Tiếng bắt từ ở nhà của Tướng to hơn nhà của Thư Đồng 3 dB.

### 24.7 Không gian âm

- Người nghe đặt ở **điểm đất camera đang nhìn**. Pan = clamp(0,8 × x màn hình; −0,8; 0,8), StereoPanner. To nhỏ theo khoảng cách nghịch đảo.
- Ngoài màn hình quá 10 % lề: −9 dB, lọc thấp 2,5 kHz, bỏ P4–P5. Tiếng chữ của nhà ở khay mép giữ lại, pan về phía khay.
- Zoom xa: world −4 dB, vang +6 dB, bỏ P5.

### 24.8 Nhạc

| Trạng thái | Nhạc |
|---|---|
| Bản đồ, pha chuẩn bị | Lớp êm |
| Trong đợt | Lớp êm + lớp chiến đấu |
| Đợt cuối | Thêm lớp trống |
| Boss | Đoạn boss, mở bằng câu nhạc ngắn |
| Thắng / thua | Đoạn kết ngắn |

- Các lớp cùng nhịp, cùng giọng, bắt đầu cùng thời điểm; chuyển lớp mờ 2 s. Manifest nhạc ghi giọng và BPM; thang nốt của chữ và đồng dịch theo giọng bản đang phát; lưới nhịp để dời tiếng "chữ ra" lấy từ BPM.
- Câu nhạc ngắn 2–5 s: đầu đợt, hết đợt, boss đổi pha, mở nhà mới, mở ô, Bùng Nổ, mốc Chuỗi 20 và 40.
- Mỗi thế giới 3–4 bản và 1 bản boss. Sách tranh: dân gian sáng (sáo trúc, đàn tranh, trống, dây). Neon: điện tử. Giữ `scripts/music/render-songs.mjs`, `transition-check.mjs`.

### 24.9 Định dạng, độ lớn, công cụ

- Bản gốc WAV 48 kHz 24-bit, ngoài Git (kế hoạch lưu media Google Drive). Bản trong game OGG Vorbis; mono cho va chạm và giọng (≤ 1,5 s); stereo cho nhạc và âm nền (nhạc phát stream).
- Độ lớn: giọng −16 LUFS-I; nhạc −18; âm nền −26; tiếng ngắn đỉnh −1 dBTP; bản trộn cuối −18 … −16 LUFS.
- Bộ nhớ đã giải mã 40–60 MB, nạp gói âm theo bản đồ.
- Script ffmpeg: cắt lặng đầu (giữ 0–5 ms), mờ cuối 10 ms, chuẩn hóa, mã hóa OGG, ghi manifest.
- **Công cụ:** ChatGPT viết và chỉnh prompt, kịch bản câu thoại; nếu ChatGPT không xuất được file âm thì dán prompt vào công cụ tạo tiếng có gói thương mại (ví dụ tiếng ngắn, thiết kế giọng, âm nền, nhạc). Mỗi file ghi công cụ, gói, ngày, prompt.
- Tiếng gắng sức (hự, đau, cười) có thể tự thu rồi đổi giọng; tốt hơn đọc bằng TTS.
- Phụ đề cho mọi câu thoại; ô tắt riêng cho câu hô. Ngôn ngữ thoại: Anh / Việt / Cả hai.

---

## 25. Kiến trúc

Mã đối chiếu: submodule `games/space-typing`, nhánh `feat/space-typing-2026-10-18`, HEAD `1979389f`. Đường dẫn tính từ `games/space-typing/`. TypeScript, Vite, Three.js 0.170, Vitest.

### 25.1 Mười hai quyết định

1. **Game mới cạnh V4:** `src/td/`, trang `td.html`. Rift Defense V4 chạy nguyên trạng tới khi chủ dự án duyệt bản mới.
2. **Không sửa engine V4.** Viết mô phỏng mới có máu, giáp, đạn bay, lính chặn.
3. **`src/td` không bao giờ import `src/defense`.** Phần dùng lại thì chép sang và ghi nguồn.
4. **Dữ liệu điều khiển tất cả.** Mỗi định nghĩa tách khối luật và khối `view`. Đổi hình không đổi mã băm luật.
5. **Mô phỏng tất định 60 Hz, thuần TypeScript.** Không three, không DOM, không đồng hồ máy, không `Math.random`, không lượng giác, không lũy thừa. Phát từ, chọn từ, chấm từ, Nhiệt, Chuỗi, loot, tìm đường đều trong sim.
6. **Kho mảng cột**, không cấp phát trong vòng lặp nóng.
7. **Mọi chữ đang sống chung một bảng chữ đầu** (dòng chữ, cụm chốt, Từ Hiếm, Từ Ôn, gõ trực tiếp, cụm ấn, Từ Nhặt, Chữ Chiêu, Ấn Phụ).
8. **Hai lớp hiệu ứng:** phần thưởng từ (không trần) và hào quang (có trần mỗi nhà).
9. **Ô = người trợ lực.** Tướng ô 1, Trợ Thủ ô 2–4. Số ô = min(cấp Lũy, 1 + Trợ Thủ mang theo). Người phải đi tới nhà.
10. **Ghi sổ trong sim, bay chỉ là hình.**
11. **Thẻ chữ là DOM trên canvas.** VFX không bao giờ che chữ.
12. **Kiểm tra trên trình duyệt từ mốc đầu** bằng bản vẽ 2D nhìn từ trên (`?view=debug2d`); **ranh giới có test từ ngày đầu**.

### 25.2 Dùng lại gì

| Phần | File hiện có | Cách dùng |
|---|---|---|
| Vòng lặp khung | `src/platform/frame-loop.ts` | Dùng nguyên |
| Lưu an toàn | `src/platform/safe-storage.ts` | Dùng nguyên, khóa `td.*` |
| Lọc phím, IME | `src/scene3d/keys.ts` (`typedLetter`, `isComposingKey`, `vietnameseInputSign`) | 1A dùng qua danh sách ngoại lệ; 1C chuyển sang `src/platform/typing/keys.ts` có shim |
| Chọn từ | `src/scene3d/words.ts` (`WordPicker`) | Ý tưởng "dùng hết dải mới lặp"; TD viết `typing/picker.ts` riêng, nhận RNG |
| Chuẩn hóa chữ | `typingText` trong `src/logic.ts` | Qua ngoại lệ; 1C chuyển sang platform |
| Từ vựng | `src/vocabulary.ts` (`loadVocabularyIndex`, `loadVocabularyLevel`) | Qua ngoại lệ ở `app/` |
| Mức nền gõ | `src/campaign/adaptive-profile.ts` | Hàm làm mượt chuyển sang platform ở 1B |
| Sự kiện học | `src/learning/shared.ts` | Giữ `gameId: "space-typing"` |
| Giọng đọc | `src/speech.ts` | Nghe rồi gõ, phát âm từ mới (1B) |
| Đường đi V4 | `src/defense/rules/path.ts` | **Chép** thành `src/td/sim/lanes.ts`; `Math.hypot` → `Math.sqrt` |
| Camera, đám đông, VFX V4 | `src/defense/view/{camera,crowd,vfx,terrain,painter}.ts` | **Chép** ở 1C |
| Hạt, âm, rig Tướng | `src/scene3d/{particles,sfx,hero}.ts`, `src/audio/mix.ts` | Qua ngoại lệ ở `view/`, `legacy/` |
| Bộ nạp model | `src/render3d/{model-loader,model-contracts}.ts` | Qua ngoại lệ; manifest riêng `public/assets/td/models/manifest.json` |
| Credit Crystal | `src/vfx/credit-crystal-{pickups,fx,renderer}.ts`, `src/audio/credit-sound.ts` | 1C: tách lõi bay, bộ vẽ, thang nốt sang `src/platform/loot`, `src/platform/audio`; file cũ thành lớp bọc giữ nguyên export |
| Ảnh đồng | `src/assets/pickups/credits/*.webp` | Dự phòng cho đồng TD (qua `legacy/st-loot-art.ts`) |
| Ảnh giả 3D | `scripts/models/blender/bake_impostor.py` | Impostor cảnh (VS) |
| Kiểm tra hình | `scripts/visual/cdp-run.mjs` | Dùng nguyên; viết `scenarios/td-*.mjs` |

**Model tạm** (GLB ở máy chủ dự án, không trong Git): Tướng `heroes/draconis-v2`; Trợ Thủ `guides/draconis-v4` thu nhỏ ×0,6; đạn `skills/dragon-fireball`; boss `bosses/lieutenant-nature`; nhà `items/tower-*`, `items/defense-core`; túi `items/prop-crystal-a`; quái họ `rainbow-*-3d`. 1A không dùng model (bản vẽ 2D).

### 25.3 Thư mục và ranh giới

```
td.html                      trang mới (thêm vào rollupOptions.input)
src/td/
  main.ts
  app/      session.ts input.ts selection.ts sandbox.ts dev-handle.ts save.ts learning.ts analytics.ts
  sim/      (THUẦN TS) world.ts commands.ts events.ts hash.ts stats.ts spatial.ts lanes.ts placement.ts props.ts
            nav/ grid.ts astar.ts connectivity.ts
            stores/ enemies.ts units.ts agents.ts buildings.ts projectiles.ts words.ts bags.ts
            systems/ spawn.ts agents.ts move.ts block.ts combat.ts projectile.ts status.ts production.ts
                     stream.ts words.ts heat.ts chain.ts rewards.ts aura.ts overdrive.ts specials.ts
                     direct.ts seal.ts boss.ts waves.ts deaths.ts loot.ts bags.ts upgrades.ts
  typing/   (THUẦN TS) router.ts letters.ts distance.ts picker.ts scorer.ts decks.ts tempo.ts
  content/  types.ts schema.ts compile.ts hash.ts slice/*.ts
  view/     debug-2d.ts words/ (cards.ts lanes.ts) ; 1C: stage.ts camera.ts ground.ts scenery/ crowd.ts
            actors.ts buildings.ts badges.ts projectiles.ts hpbars.ts loot/ fx/ audio/
  ui/       hud.ts team-bar.ts tempo-control.ts build-menu.ts ring-menu.ts word-strip.ts result.ts td.css
  legacy/   st-models.ts st-audio.ts st-loot-art.ts
src/platform/ rng.ts (1A) · typing/ (1C) · loot/ (1C) · audio/ (1C)
public/assets/td/            Git bỏ qua, trừ README.md và manifest JSON
tests/td/  bot.ts keystrokes.ts reader.ts policies/*.ts
tests/td-*.test.ts  tests/golden/td-*.json  scripts/td/*  scripts/visual/scenarios/td-*.mjs
```

**Luật ranh giới** (`tests/td-boundary.test.ts`, chạy trong `pnpm check`):
1. `src/td/**` chỉ import `src/td`, `src/platform`, `three`, `three/examples/jsm/*`, `@fontsource/*`, và danh sách ngoại lệ `LEGACY_IMPORTS` (chỉ được ngắn đi). Chỉ `app/`, `view/`, `legacy/` có ngoại lệ.
2. `src/td/**` không import `src/defense/**`. Không ngoại lệ.
3. `sim/`, `typing/`, `content/` cấm: `three`, `window`, `document`, `performance`, `Date`, `localStorage`, `requestAnimationFrame`, `setTimeout`, `Math.random`, `sin`, `cos`, `tan`, `atan2`, `exp`, `pow`, `log*`, `hypot`, `cbrt`, toán tử `**`.
4. Chuỗi `/assets/` trong `src/td/**` phải bắt đầu bằng `/assets/td/` hoặc `/assets/shared/` (trừ `legacy/`).
5. `src/platform/**` không import Space Typing.
6. File Space Typing được chuyển giữ nguyên export; `tests/credit-*.test.ts`, `tests/campaign3d-keys.test.ts`, `tests/defense-frame-error.test.ts` không sửa một dòng và phải xanh.
- `tests/mode-isolation.test.ts`: thêm `td/` được dùng `scene3d/`; không file nào ngoài `td/` import `td/`; `td/` chỉ ghi khóa lưu bắt đầu bằng `td.`.
- `.gitignore`: `public/assets/td/**`, mở lại `README.md` và `**/manifest.json`. **Ảnh, tiếng, model không bao giờ vào Git.** Thiếu media: hình khối gỡ lỗi, atlas tạm vẽ bằng canvas, tiếng tổng hợp.

### 25.4 Dữ liệu định nghĩa

- `id` kebab-case. Thời gian ghi **giây**, `compile.ts` đổi sang **tick** một lần. Khoảng cách **mét**, đặt nhà lượng tử 0,25 m. Máu, sát thương, giá **số nguyên**; kho tài nguyên **phần nghìn**. Hệ số số thực, làm tròn một lần. Đường cong là bảng tuyến tính từng đoạn; bảng theo cấp lập sẵn.
- Khối `view` không vào mã băm nội dung (`contentHash`: FNV-1a trên JSON chuẩn hóa).

```ts
type ResourceId = "gold" | "food" | "wood";
type Family = "core" | "attack" | "military" | "economy" | "resource" | "support";
type WordKind = "stream" | "finisher" | "rare" | "review" | "direct" | "seal" | "pickup" | "ultWord" | "spellWord";
type Grade = "flash" | "perfect" | "good" | "ok" | "sloppy" | "expired" | "cancelled";

interface TempoOption {               // mục 6.2
  periodS: number;                    // 0 = Dừng
  tAttack: number; tEconomy: number;  // T_N
  auraK: number;                      // k_N
  minLevel: 1 | 2 | 3; easyOnly?: boolean; maxLen?: number;   // 1 s: 5, 2 s: 6
  newWords: boolean;                  // từ mới chỉ ở nhịp ≥ 3 s
}
interface TypingRules {
  life: { base: number; perChar: number; min: number; max: number; kL: Record<Difficulty, number>; hardMin: number;
          rareMul: number; reviewMul: number; phrase: { min: number; max: number }; finisherPlusS: number;
          graceS: number; graceAt: number };
  lengthByE: readonly { minE: number; len: readonly [number, number] }[];          // mục 6.3
  emit: { settleS: number; firstDelayS: number; staggerS: number; staggerMaxS: number;   // 0,4 / 0,6 / 0,2 / 0,6
          perBuildingLive: number; streamLiveMax: number; streamLiveMin: number; totalLive: number;  // 4 / 12 / 4 / 16
          letterSlack: number; directYieldS: number; afterSealS: number; upgradePauseS: number };   // 6 / 1 / 1 / 1
  letters: { cooldownS: number; reserve: number; avoid: string; avoidUntilLevel: number;
             tier2EarlyFreeLetters: number; tier2EarlyMaxLevel: number; maxEditCheckLen: number };  // 1,0 / 3 / "qxzj" / 10 / 5 / 3 / 8
  scoring: { errPerLenNum: number; errMin: number; errMax: number; phraseLen: number;               // 1,5 / 0,15 / 0,40 / 12
             fastBase: number; fastK: number; effBase: number; effK: number; qA: number; qS: number; flashS: number };
  heat: { max: number; flash: number; good: number; ok: number; sloppy: number; expired: number; rareExpired: number;
          prepCap: number; holdBase: number; holdC: number; decayPerS: number; window: number };
  chain: { good: number; special: number; direct: number; seal: number; untouchedExpire: number;     // +1 / +2 / +1 / +2 / −2
           tiers: readonly { from: number; rc: number; rare: number }[]; callouts: readonly number[] };
  aura: { presence: number; attack: {...}; economy: {...}; military: {...}; caps: {...} };
  overdrive: {...}; ult: {...}; orderGrace: { maxS: number; cooldownS: number };                    // 2 / 3
  baseline: {...}; wordD: Record<"known" | "learning" | "phrase" | "new" | "listen", number>;
}
interface StreamProfile { id: string; deck: DeckId; tempos: readonly TempoOption[];
  phrase?: { words: readonly [number, number] }; listen?: { share: number; replayAfterS: number };
  reward: WordReward; aura: AuraSpec; fiveGood?: EffectSpec; overdrive: readonly EffectSpec[] }
type WordReward =
  | { kind: "shot"; dBar: readonly number[]; pierce: number; splashMul?: number }
  | { kind: "resource"; resource: ResourceId; perLevel: readonly number[]; richness: boolean }  // qA·qS luôn dùng
  | { kind: "soldiers"; respawnCutS: number; healPct: number }
  | { kind: "seal"; ultPerPhrase: number; powerCdS: number; wave: boolean }
  | { kind: "heal"; perLevel: readonly number[] } | { kind: "keep"; goldPerWord: number; crossbowShot: boolean }
  | { kind: "repair"; pct: number };
interface HelperDefinition { id: string; specialty: "craft" | "shot" | "drum" | "healer";
  levels: readonly { presence: number; specialty: number; speed: number; scaredS: number; settleS: number;
                     rarePlus: number; knowledgeCost: number }[]; view: ViewBlock }        // Trợ Thủ luôn đi bộ
interface HeroDefinition { move: "ground" | "fastGround" | "flying"; magnetM: number;
  affinity: readonly { building: string; presenceMul: number; rewardMul: number }[]; /* … */ view: ViewBlock }
interface KeepLevel { stepCost: Cost; slots: number; attackCap: number; maxBuildingLevel: number;
  crossbow: AttackSpec; foodEveryS: number; tempoUnlock?: number; extraLivesOnce?: number }
interface MapDefinition { /* … */ nodes: readonly { kind: "ore" | "forest" | "ley"; x: number; z: number; richness: 1 | 2 | 3 }[];
  fertility: readonly { shape: Shape; mul: number }[];   // vùng phù sa cho Ruộng
  walk: { water: readonly Shape[]; bridges: readonly Shape[]; cliffs: readonly Shape[] } }
```

**Kiểm tra dữ liệu** (`tests/td-content.test.ts`):
- Nhịp càng dày thì T_N không giảm, độ dài tối đa không tăng. 1 s chỉ từ L3; 2 s từ L2. Nhà Thuốc không dưới 2 s.
- Mọi từ gõ kịp: với mọi E 12–140 và mọi nhịp, L_w ≥ 1,2 + 12·(len + 1)/(E·d) (liệt kê ô bị kẹp ở 6 s).
- `totalLive ≤ 16`, `streamLiveMax ≤ 12`, `perBuildingLive ≤ 4`, Từ Nhặt ≤ 3.
- **Vàng và lọt của mọi quái nằm trong khoảng của bậc** (mục 14.2).
- Trần hào quang, T_N không đổi theo cây nghiên cứu, cấp Tướng, cấp Trợ Thủ. Tổng `statPct` Cây Chữ ≤ 15 %.
- Lũy: ô tăng dần, ≤ 4. Vàng trong túi ≤ 1,5 × vàng của bậc rơi ra nó.
- Cảnh vật có phần luật thì `canopyR ≥ rootR`, phí ≤ 10; mỗi loại ≥ 4 biến thể.
- Mọi định nghĩa có đủ khóa VFX/SFX bắt buộc, hoặc ghi rõ dùng mặc định của họ (`tests/td-view-coverage.test.ts`).
- Chữ đầu khả dụng (`A`) tính trên từ vựng thật cấp 1–3 (`../../../shared/vocabulary/levels/00N.json` qua `import.meta.url`), trần dòng chữ đúng công thức.

### 25.5 Mô phỏng

- `STEP = 1/60`. Tối đa 10 bước mỗi khung. Tạm dừng: không bước. Tốc game 0,75×: bớt số bước, không đổi độ dài bước. Hitstop, rung chỉ ở view.
- Toán cho phép: `+ − × ÷`, `Math.sqrt`, `floor`, `ceil`, `round`, `trunc`, `abs`, `min`, `max`, `sign`, `imul`, `clz32`.
- Vị trí `Float64`; máu, sát thương `Int32`; kho tài nguyên và Nhiệt `Int32` phần nghìn.
- RNG `src/platform/rng.ts` (mulberry32), luồng có tên: `spawn`, `combat`, `crit`, `words`, `rare`, `loot`, `ai`, `props`. Thêm lần gọi ở luồng này không làm lệch luồng kia.
- **Hai đồng hồ khi chấm từ:** tuổi từ và `t_done` tính bằng tick; tốc gõ thuần (cập nhật B) tính bằng `atMs` thật trong lệnh `key`. Cả hai nằm trong nhật ký lệnh.
- Mọi vòng lặp theo thứ tự ô. Hòa: id nhỏ thắng. Id ổn định = `(thế hệ << 10) | ô`.
- Chữ của từ không là chuỗi trong sim: `typing/decks.ts` biên dịch bộ từ thành `Uint8Array` mã chữ + bảng vị trí, độ dài, id từ vựng, cờ.

**Kho** (sức chứa là chỗ dư; **trần luật** ở mục 6 và 13 mới là con số có hiệu lực):

| Kho | Sức chứa | Trần luật |
|---|---|---|
| Quái | 640 | Đợt thường 20–150; thử tải 400 |
| Lính | 96 | 64 |
| Người trợ lực | 8 | 4 |
| Từ sống | 24 | 16 |
| Túi | 8 | 6 |
| Đạn | 512 | 512 |
| Nhà | 40 | 16 (+ Lũy), bản đồ ghi đè ≤ 40 |
| Cảnh vật có phần luật | 1.024 | Theo bản đồ |

### 25.6 Thứ tự hệ thống mỗi tick

1. Áp lệnh của tick. Lệnh `key` qua bộ định tuyến ngay. Từ xong được chấm và áp: phần thưởng từ, Nhiệt, Chuỗi, Tối Thượng, sự kiện.
2. Sinh quái.
3. Người trợ lực: lệnh, tìm đường, di chuyển, vào việc, rời việc, hoảng, nhặt túi khi đi qua.
4. Di chuyển quái.
5. Lính nhận đối thủ, chặn.
6. Chọn mục tiêu (hào quang tính ở tick trước).
7. Tấn công: đạn thường, Phát Chữ đang chờ, cận chiến.
8. Đạn tới, sát thương.
9. Trạng thái, sát thương theo thời gian.
10. Tự sản, đống vàng, hồi máu tự chạy.
11. **Dòng chữ:** hết tuổi (tan), gia hạn, lịch phát, so le, chờ đầy, chọn loại từ, phát từ.
12. **Nhiệt:** Dư âm, nghỉ lò, Bùng Nổ hết giờ; tính lại hào quang mỗi nhà.
13. Cửa sổ gõ trực tiếp, cửa sổ ấn, Chữ Chiêu: mở, hết giờ.
14. Pha boss.
15. Chết, lọt, chia tách, trả đồ cướp, rơi loot.
16. Túi: hết hạn, gộp khi quá 6.
17. Trạng thái đợt, thắng thua.
18. Băm trạng thái (chỉ khi test).

### 25.7 Lệnh

```ts
type Command = { tick: number } & (
  | { t: "build"; def: number; qx: number; qz: number }
  | { t: "upgrade"; building: number; branch?: 0 | 1 }        // Lũy cũng dùng
  | { t: "sell"; building: number }
  | { t: "rally"; building: number; qx: number; qz: number }
  | { t: "assignUnit"; agent: number; building: number }
  | { t: "move"; agent: number; qx: number; qz: number }
  | { t: "recall"; agent: number }
  | { t: "setTempo"; building: number; idx: number }           // gồm Dừng
  | { t: "setAllTempo"; stop: boolean }                        // Dừng tất cả / trả lại
  | { t: "uiFocus"; on: boolean }                              // ân hạn ra lệnh
  | { t: "key"; letter: number; atMs: number }                 // letter 0–25
  | { t: "backspace"; atMs: number } | { t: "unlock" }
  | { t: "ultimate"; qx: number; qz: number }
  | { t: "power"; id: number; qx: number; qz: number }
  | { t: "item"; slot: 0 | 1; qx?: number; qz?: number }
  | { t: "callWave" }
  | { t: "sandbox"; op: SandboxOp }                            // chỉ khi cờ hộp cát; ghi vào nhật ký
);
```
- Chơi thật, bot, chạy lại bản lưu đều qua cùng một `apply()`.
- Một ván xác định bởi: phiên bản luật, `contentHash`, bản đồ, seed, danh sách id từ vựng và độ thuộc lúc vào trận, B, độ khó, tốc game, Tướng và cấp, Trợ Thủ và cấp, nút nghiên cứu, nhật ký lệnh.
- Chọn người, tô nhà, mở menu là trạng thái của `app/selection.ts`, không vào sim. Riêng ân hạn ra lệnh vào sim qua `uiFocus`.

### 25.8 Dòng chữ trong mã

```
stream.ts ── lịch phát ──► picker.ts ── xin chữ đầu ──► letters.ts ──► kho từ (wordSpawn)
app/input ── key ──► router.ts ── tiến / lỗi / khóa / đổi khóa ──► (wordLock, wordSwitch, key)
words.ts ── xong ──► scorer.ts (e, A, S, S_eff, Q, grade) ──► rewards.ts · heat.ts · chain.ts · specials.ts · learning
                                                         └──► aura.ts (tick sau) ──► combat, production
words.ts ── hết tuổi ──► heat −1, chain (−2 hoặc ÷2), sổ trượt (wordMiss)
```

**Lịch phát** (mỗi tick, mỗi nhà theo thứ tự ô):
```
nếu không phát được → bỏ qua   (không có người đã vào việc; Dừng; đang nâng 1 s; sealPause; pha chuẩn bị chỉ khởi động)
nếu tick < b.nextEmitTick → bỏ qua
nếu b.live ≥ 4 hoặc streamLive ≥ trần chữ hoặc totalLive ≥ 16:
    b.waiting = true; tới mốc lịch kế mà vẫn đầy → bỏ lần này, đếm "chờ đầy"; bỏ qua
nếu tick − lastGlobalSpawnTick < 12 và b.shiftTicks < 36:        // 0,2 s và 0,6 s
    b.shiftTicks += 12; b.nextEmitTick += 12; bỏ qua
kind = chọn loại từ (cụm chốt → Từ Ôn → Từ Hiếm → dòng chữ)
picker trả từ → phát (wordSpawn), lastGlobalSpawnTick = tick;  không có → "nghẽn chữ" (không tính trượt)
b.anchorK += 1; b.nextEmitTick = b.anchorTick + b.anchorK × b.periodTicks; b.shiftTicks = 0
```
- Vào việc: `anchorTick = tick tới ổ + settle + firstDelay`. Đổi nhịp: `anchorTick = tick + periodMới`, `anchorK = 0`. Nhường nhịp (gõ trực tiếp mở): +60 tick. Hết cửa sổ ấn: `anchorTick = tick + 60`. Nâng nhà: lùi 60 tick.
- **Trần chữ** = clamp(A − 6; 4; 12), A tính lúc vào trận từ bộ từ đã biên dịch.

**Chọn từ** (`typing/picker.ts`, luồng `words`): dải độ dài theo E, cắt theo nhịp; trộn kế hoạch học (60 / 25 / 15, có khởi động lạnh); từ mới chỉ ở nhịp ≥ 3 s; Từ Hiếm, Từ Nhặt, Chữ Chiêu chỉ từ đã thuộc (hoặc 50 từ thông dụng của cấp); không lặp tới khi hết dải; thử tối đa 12 ứng viên, ứng viên đầu tiên qua `letters.claim()` thắng.

**Chữ đầu** (`typing/letters.ts`, `typing/distance.ts`): `letterOwner: Int8Array(26)`, `letterFreeTick: Int32Array(26)`, cặp tầng 2; nghỉ 1,0 s; 3 dự trữ; tầng 2 sớm ở cấp từ vựng ≤ 3; OSA ≤ 1 bị cấm với từ ≤ 8 chữ (bộ đệm cố định, dừng sớm).

**Bộ định tuyến** (`typing/router.ts`): mục 6.15. Trạng thái `lock`, `lockGroup`, `lockHard`.

**Chấm** (`typing/scorer.ts`): mục 6.6. Grade dùng chung cho luật và hình.

**Test thuộc tính `td-letters`:** 10.000 tick, 4 ô nhịp 1 s, gõ trực tiếp, Từ Nhặt, Chữ Chiêu, cụm ấn cùng chạy, **trên từ vựng thật cấp 1, cấp 1–3, cấp 1–5**. Mọi tick: chữ đầu không mơ hồ; không từ trùng; không cặp OSA ≤ 1; các trần đúng. Báo tỉ lệ nghẽn chữ theo cấp.

### 25.9 Người trợ lực và tìm đường

- Lệnh `assignUnit`, `move`, `recall`. Tướng bay (Draconis): cất 0,6 s, bay thẳng 6 m/s, hạ 0,6 s, đậu mái khi trợ lực. Đi bộ (Trợ Thủ; Tướng bộ từ 1B):
  - lưới 1 m trên 96 × 96 m = 9.216 ô; `Uint8Array` ô chặn (nước trừ cầu, vách, vòng nhà, mốc cảnh, cảnh vật chặn);
  - A* chi phí nguyên (thẳng 10, chéo 14), ước lượng octile; hòa: f nhỏ, rồi h nhỏ, rồi chỉ số ô nhỏ; heap nhị phân trên mảng có sẵn; không cấp phát;
  - kéo dây bằng kiểm tầm nhìn theo ô; ≤ 64 điểm;
  - đặt hoặc bán nhà → dựng lại ô chặn vùng đổi, tính lại đường người bị cắt;
  - lối đi: BFS từ Lũy tới mọi ổ trong `canPlace`.
- Vào việc trong 3,0 m của ổ sau 0,4 s; ra quá 4,5 m thì ngắt; một nhà một người; gửi tới nhà có người thì đổi chỗ.
- Hoảng: đòn boss trúng chỗ đứng (hoặc quái Săn) → về Lũy, đứng 5 s, rồi chạy lệnh chờ.

### 25.10 Loot trong mã

- `deaths.ts` cộng vàng ngay, đẩy `coin {x, z, value, tier}`.
- `loot.ts`: Mảnh Chữ không phải vật trong kho. Tick quái chết: Tướng sống và quái trong vòng hút (so bình phương) → Tối Thượng +0,6 mỗi mảnh. Sự kiện `letterDrop {x, z, n, toHero}`.
- `bags.ts` (kho 8): nội dung lăn ngay lúc sinh (luồng `loot`); Từ Nhặt 6 s; ≤ 3 từ; đi qua 3 m; hết hạn 50 %; túi thứ bảy tự nhặt; bùa vào ô hoặc 20 Vàng. Sự kiện `pickupSpawn`, `pickupCollected {by: "word" | agentId | "expire" | "overflow"}`.
- Hình (1C): `src/platform/loot/pickup-flight.ts` (lõi bung → lơ lửng → hút; gộp khi đầy; thang chuỗi 1,6 s; thêm `groundShift` để bám đất và cờ giảm chuyển động), `burst-renderer-2d.ts`, `burst-fx.ts`; TD vẽ trên **một canvas phủ** trên WebGL và HUD, dưới menu, `pointer-events: none`, chỉ vẽ khi có đồng bay. Đo > 1 ms mỗi khung khi đầy trần thì chuyển bộ vẽ sang lô WebGL, giữ lõi bay.
- Chuyển Credit Crystal (1C), theo thứ tự: trang dev `pickup-lab.html` chụp 6 khung bằng mã Space Typing hiện tại (ảnh gốc) → tách sang platform → file cũ thành lớp bọc → `tests/credit-*.test.ts` không sửa phải xanh → chụp lại, lệch ≤ 0,5 % mỗi khung.

### 25.11 Sự kiện

- **`CombatRing`** (dày, mảng cột, 8.192): `fire`, `hit`, `death`, `heal`, `spawn`, `block`, `statusOn`, `smash`, `coin`, `grain`, `log`, `key`, `wordShot`, `fizzle`, `letterDrop`. Tràn thì bỏ loại ưu tiên thấp và đếm.
- **`RareEvent[]`**: `wordSpawn`, `wordLock`, `wordSwitch`, `wordHit` (grade, lỗi, Q, tuổi, loại, phần thưởng), `wordMiss` (chạm hay chưa), `wordCancel`, `streamDeferred` (đầy, nghẽn), `tempoChanged`, `lockLenChanged`, `chainStep`, `chainTier`, `chainBreak`, `finisherReady`, `overdriveStart`, `overdriveEnd`, `harmony`, `rushWarn`, `rushStart`, `rushEnd`, `agentOrdered`, `agentArrived`, `agentLeft`, `agentDown`, `agentBack`, `agentScared`, `helperUnlocked`, `ultimateReady`, `ultimateCast`, `powerCast`, `pickupSpawn`, `pickupCollected`, `pileCollected`, `stolen`, `lootReturned`, `chestOpened`, `directOpen`, `directSuccess`, `directFail`, `sealOpen`, `sealSuccess`, `sealFail`, `bossPhase`, `waveStart`, `waveEnd`, `built`, `upgraded`, `keepUpgraded`, `sold`, `ruined`, `repaired`, `leak`, `victory`, `defeat`.
- Người đọc mỗi khung, theo thứ tự: HUD → thẻ chữ → VFX → loot → âm → học → analytics. Người đọc không sửa sim.

### 25.12 Hiệu năng

- **Sim:** ≤ 0,5 ms mỗi bước với 640 quái, 64 lính, 512 đạn, 20 nhà, 4 người trợ lực, 16 từ, 6 túi (Node, Apple Silicon). CI chặn ở 2 ms. Một lần A* ≤ 0,5 ms.
- **Hiển thị (High):** khung trung bình ≤ 5,5 ms, p95 ≤ 8,5 ms, ≤ 150 draw call. Thẻ chữ DOM ≤ 20, chỉ đổi `transform`, `opacity`; bộ xếp làn ≤ 0,3 ms; mặt nạ vùng yên < 0,05 ms; nhân vật có xương ≤ 8 (ngoài màn hình 15 Hz); thanh máu, huy hiệu, số nổi mỗi loại 1 draw call; đồng 120 / 60 / 28.
- Thử tải `__td.flood(400)`.
- **1A** (bản vẽ 2D): khung ≤ 8 ms ở 300 quái, 4 ô nhịp 1 s, 1280 × 720.

### 25.13 Lưu, học, phân tích

| Lớp | Khóa | Ghi khi |
|---|---|---|
| Cài đặt | `td.settings.v1` | Đổi cài đặt |
| Hồ sơ | `td.profile.v1` (B, Tướng, Trợ Thủ, Học Viện, Tri thức, Sao, nghiên cứu, bản vẽ, nhịp ưa thích theo loại nhà, sổ trượt chờ ôn, tính năng đã dạy) | Cuối ván, mở khóa |
| Ván dở | `td.run.v1` (đầu ván + nhật ký lệnh tới đầu đợt gần nhất + mã băm) | Đầu mỗi đợt |
| Học | Không lưu ở TD; sự kiện qua cổng cha, gộp 5 s | — |

- TD không đọc, không ghi khóa `spaceTyping*`.
- `sim/stats.ts` đếm bằng mảng số; bot, màn kết quả, `__td.stats()` dùng chung.

### 25.14 Bỏ V4 (bước 7)

- TD không import `src/defense`, nên xóa V4 không vỡ TD. Module dùng chung chuyển sang `src/platform` kèm shim ở đường cũ. V4 chỉ nhận sửa lỗi trong bước 1–6.
- Bước 7: bỏ `src/defense/rules/*`, `main.ts`, `defense.css`, `defense.html` (hoặc chuyển hướng sang `td.html`), `tests/defense-rules.test.ts`, `scripts/visual/scenarios/defense*.mjs`; đổi tên `tests/defense-frame-error.test.ts`; nút `defenseButton` trỏ sang `td.html` khi chủ dự án duyệt.
- Tách hẳn (sau bước 7): repo cha nhận `gameId` mới trước; TD đổi `gameId`; `LEGACY_IMPORTS` về 0; có thể tách submodule.

### 25.15 Rủi ro kỹ thuật

| Rủi ro | Cách chặn |
|---|---|
| Quá nhiều chữ, rối | Nhịp do người chọn; chip Tải; gợi ý nhịp; trần chữ; dừng phát khi ấn; nhường nhịp; Dải Chữ; cổng 25 WPM |
| Hết chữ đầu | Trần chữ theo A; tầng 2 sớm ở cấp thấp; bỏ lần phát khi nghẽn; test trên từ vựng thật |
| Gõ nhầm chữ đầu | Đổi khóa mềm không phạt từ cũ |
| Vàng không trần làm vỡ kinh tế | Trần ở chỗ tiêu; T_N kinh tế phẳng; cổng vàng gõ ≤ 45 %; chỉnh G trong dữ liệu |
| Trợ Thủ kẹt | BFS lối đi trong `canPlace` |
| Khung giật làm sai tốc gõ | Tuổi từ theo tick; tốc gõ thuần theo `atMs`; hitstop chỉ ở view |
| Bộ gõ tiếng Việt nuốt phím | `-`, `=`, Backquote, Tab, Enter không bị Telex, VNI dùng; chuột luôn có |
| Alt + số đổi tab trên Linux | Phím lệnh đổi được, Linux mặc định Shift, có nút bấm |
| Chuyển Credit Crystal làm hỏng Space Typing | Ảnh gốc `pickup-lab`; test `credit-*` không sửa; lệch ≤ 0,5 % |
| Số còn đổi trong lúc làm | Số chỉ ở file dữ liệu; test vàng dùng nội dung đóng băng `tests/td/fixtures/content-golden.ts` |
| Phạm vi phình | Chia 1A / 1B / 1C; cổng cứng chỉ là bất biến, tất định, hiệu năng |

---

## 26. Lộ trình

### 26.1 Bản thử (Prototype): 1A → 1B → 1C

Chi tiết 1A ở `BUILD_NOW.md`.

| Phần | Làm | Không làm | Chủ dự án chơi | Cổng cứng |
|---|---|---|---|---|
| **1A — Cổng vui** (≤ 5.000 dòng mã) | Bản đồ 2D nhìn từ trên (sân thử chữ S tách đôi, suối, 2 cầu). Lũy, Tháp Cung, Tháp Pháo, Trại Lính, Mỏ Vàng (L1–L3 qua hộp cát). 3 quái: Cương Thi, Ma Trơi, Thuồng Luồng. Mô phỏng có máu. Dòng chữ, bộ định tuyến, chấm, Nhiệt, Chuỗi, Mượt, phần thưởng, hào quang, ân hạn ra lệnh. Draconis bay, tự đánh khi rảnh; 3 Thư Đồng đi bộ A*. Thẻ chữ DOM, HUD tối thiểu, tiếng gõ tổng hợp. **Hộp cát:** 1–4 ô, nhịp từng nhà, mọi nhịp mở, E, độ khó, sinh đợt. | Loot bay, túi, nâng cấp có giá, Lúa, Đài Ấn, boss, gõ trực tiếp, Tối Thượng, 3D, cảnh 2D, chuyển Credit Crystal | Có, 1280 × 720, gồm 3 và 4 ô | Bất biến chữ và tiền, tất định, hiệu năng 1A, không lỗi console. `td:balance` chỉ in báo cáo. |
| **1B — Đủ luật bản đồ 1** | Nâng cấp và bán có giá; Lũy mở ô trong chế độ truyện; Ruộng và Lúa; túi, Từ Nhặt, bùa; Mảnh Chữ (ghi sổ); Đài Ấn (cụm, nghe rồi gõ); Tối Thượng và Chữ Chiêu (hộp cát); gõ trực tiếp Ngắt, Neo, Phá Khiên; Từ Vàng, Từ Ôn, nghĩa tiếng Việt; cụm chốt và Bùng Nổ; quái bản đồ 1 + Troll; boss Mộc Tinh nhỏ; bản đồ 1 theo bảng dạy; Lam dạng khối đi bộ (model thật khi có Tripo); bot và test vàng | 3D, cảnh 2D | Có, bản đồ 1 truyện + hộp cát | Như 1A + `td:balance` in đủ bảng mục 19.7 |
| **1C — Hình 3D** | Cảnh three.js, camera RTS, model tạm và model Tripo đã có, đám đông instanced, nhà có bục và hào quang, đạn và Phát Chữ, cảnh 2D cơ bản (billboard, khối tán, phông, đung đưa, phá khi đặt), thẻ chữ trên 3D (bộ xếp làn, khay mép, mặt nạ vùng yên), Dải Chữ, đồng bay về HUD, Mảnh Chữ bay về Tướng, túi bay về người nhặt, chuyển Credit Crystal sang platform | Giẫm cỏ, gió giật, impostor, VAT | Có | Như 1A + `td-words`, `td-loot`, `td-scale`, `td-hud-budget`, `pickup-lab` |

### 26.2 Sau bản thử

| Bước | Nội dung | Cổng |
|---|---|---|
| 2 — "Sống" | Bus đầy đủ, vang theo vùng, `voice-director`, tiếng hô lính, tiếng quái, thoại Tướng, Thư Đồng, tổ thợ; VFX theo ngữ pháp từng thực thể; tín hiệu cần giúp; xem trước đợt; art và âm bậc P vào qua manifest | Đo âm lượng file; tai người nghe 4 nhà nhịp 1 s |
| 3 — Tướng bộ | Lam đầy đủ (model Tripo, clip `make_ground_hero_clips`, lướt, chặn); chọn Tướng trước trận | Bot với Tướng bộ |
| 4 — Đặt nhà đầy đủ, nhánh, camera | Luật đặt V5 đầy đủ (san phẳng, chip lý do), nhánh A/B và kỹ năng nhánh, nhà instanced, vật che dither | Bot: mỗi nhánh được chọn 35–65 % |
| **5 — Lát dọc (VS)** | Tháp Thư Pháp, Nhà Thuốc, Trại Gỗ, Gỗ, Lũy 3–4, ô 3–4 trong truyện (Phẩy); Hợp Tấu, Từ Sao, Từ Lá, Cơn Gấp, Ấn Phụ, gõ theo nghĩa, Heo Đất, huy chương; Oni, Tất Phương, Ma Da, Dokkaebi, Chồn Liềm; Đại Bàng Tinh; Mộc Tinh đầy đủ có cửa sổ ấn; 3 bản đồ với tranh cảnh và phông thật; impostor; art và âm bậc VS; **dựng bản đồ 1 với StylePack Neon để kiểm việc đổi bộ** | **Mục tiêu cân bằng mục 19.7 thành cổng cứng.** Bot trên 3 bản đồ, golden mỗi bản đồ, ảnh mỗi bản đồ ở High và Medium |
| 6 — Meta, truyện | Thư Thành (Sảnh Tướng, Học Viện, Xưởng Bản Vẽ, Cây Chữ, Chợ), Tri thức, ôn trận đầy đủ, tranh truyện, cảnh trong engine | `td-meta`: không nút nào đổi trần hào quang hay T_N; tổng ≤ +15 % |
| 7 — Bỏ V4, tách game | Mục 25.14 | `pnpm check` xanh khi không còn `src/defense` |

**MVP:** Thế giới 1 đủ: 3 bản đồ truyện + 1 bản đồ phụ "Đồi Chè" (không boss, nhiều Cơn Gấp, Heo Đất) + 1 bản đồ neon "Khe Nứt Biển Sao" (nơi Draconis rơi xuống, StylePack Neon); 3 Tướng; 9 nhà + nhánh; 12 loài quái + quái gọi; 2 boss; thử thách Anh Hùng, Sắt, Một Ô, Bốn Ô, Nhịp Lửa; Thư Thành; ôn trận; tranh truyện; âm đầy đủ; trợ năng; lưu và tiếp ván; phân tích có đồng ý.

**Sau MVP:** Thế giới 2+; Tướng dịch chuyển; Vô Tận, thử thách ngày; trang phục; CGI dựng sẵn (C4); cảm ứng, di động; tách game khỏi Space Typing.

### 26.3 Các thế giới

Mỗi thế giới: một nền văn minh (CivKit), 1–2 dạng địa hình chính (BiomeRecipe, BiomeArt), một StylePack, 3–5 bản đồ, 1 bộ Trợ Thủ (cùng khung xương), 1–2 Tướng mới, 6–8 loài quái mới, 1–2 boss, 1 luật địa hình mới mỗi bản đồ. Không thần, không vật được thờ (luật 22.1).

| Thế giới | Bối cảnh | Văn minh, dân tộc | Địa hình và luật | StylePack | Ghi chú |
|---|---|---|---|---|---|
| 1 Miền Văn Điền | Thung lũng lúa, thác, bờ đá vôi, rừng rễ | Làng Việt và Đông Á dân gian; Hỏa Miêu, Rái Đá, Cú Thư | Suối và cầu, thủy triều, tán rừng | Sách tranh tươi | MVP (+ 1 bản đồ neon) |
| 2 Cồn Cát Hổ Phách | Sa mạc, ốc đảo, hẻm đá đỏ, chợ đoàn lữ hành | Liên minh đoàn lữ hành (cảm hứng con đường tơ lụa); cáo sa mạc đưa tin, thợ đồng hồ cát | Bão cát (giảm tầm theo đợt), cồn cát dời lối, ốc đảo màu mỡ | Sách tranh ấm | Quái Săn, quái bay đậu, quái chở quân, quái bắn xa xuất hiện. Boss: Nhân Sư Cát ra câu đố (cụm ấn là câu đố từ vựng). Trợ Thủ thứ ba vào đội. |
| 3 Bắc Phong Tuyết Ngâm | Hồ băng, rừng thông tuyết, cảng hải mã | Dân làng phương bắc (cảm hứng Bắc Âu và vòng Bắc Cực, không biểu tượng tín ngưỡng); hải mã thợ rèn, chim cánh cụt đưa thư | Băng làm trượt, tuyết làm chậm, nhà sưởi (nhà hỗ trợ mới) | Sách tranh lạnh | Gỗ đổi hình thành tinh thể băng |
| 4 Quần Đảo Biển Sao | Đảo nổi dưới trời sao của Space Typing, cầu ánh sáng, pha lê Khe Nứt | Hội giữ sao; tinh linh sao | Cầu sáng bật tắt theo đợt, trọng lực thấp (quái bay nhiều) | **Neon** (atlas cảnh riêng) | Nối truyện với Space Typing; lộ mặt Kẻ Cầm Tẩy |
| 5 Cao Nguyên Hỏa Thạch | Ruộng bậc thang núi lửa, hang dung nham | Làng chăn lạc đà không bướu, thợ đá (cảm hứng núi cao Nam Mỹ, không đền đài) | Dòng dung nham mở, đóng làn; mạch nóng tăng sản lượng | Sách tranh rực | Gỗ đổi hình thành đá bọt |

### 26.4 Thứ tự việc ngay sau tài liệu này

1. Làm 1A theo `BUILD_NOW.md`. Chủ dự án chơi 1A (gồm 3 và 4 ô).
2. Song song, chủ dự án làm ảnh bậc P theo file prompt ảnh (viết sau khi 1A chạy) và đưa vào Tripo.
3. Làm 1B. Viết file prompt âm thanh bậc P. Chủ dự án chơi bản đồ 1.
4. Làm 1C khi có model Tripo đầu tiên. Chủ dự án chơi bản 3D.

---

## 27. Sản xuất art và âm theo bậc

### 27.1 Luật

- Ảnh, tiếng, model **không bao giờ vào Git**. Lưu theo `docs/MEDIA_STORAGE.md` (Google Drive, có md5).
- Chủ dự án tạo ảnh 2D bằng ChatGPT; model 3D bằng Tripo (ảnh sang 3D, tự rig, clip có sẵn nếu được); âm bằng ChatGPT và công cụ âm AI theo file prompt. AI chỉnh model trong Blender, **không dựng model bằng mã**.
- Mỗi file ghi nguồn (công cụ, gói, ngày, prompt) trong manifest.
- File prompt ảnh và file prompt âm **chia ba bậc: P, VS, Sau**. Sinh danh sách từ các bảng của tài liệu này (bảng clip 23.9, bảng quái 22.6, bảng thoại 22.2–22.4, bảng VFX 23.8).

### 27.2 Ba bậc

| Bậc | Model Tripo | Ảnh 2D | Âm thanh |
|---|---|---|---|
| **P** (cho 1B, 1C) | Thư Đồng (1 model + 3 bộ gắn); 6 nhà (Lũy, Tháp Cung, Tháp Pháo, Trại Lính, Mỏ Vàng, Ruộng Lúa; Đài Ấn nếu kịp); 7 quái có model (Cương Thi, Nuppeppō, Thuồng Luồng, Tanuki, Troll, Alicanto, Mầm Gỗ; Ma Trơi là VFX); Mộc Tinh; Lam nếu kịp; túi vải, giỏ tre, Rương Boss; Lính Giáo + giáo; Draconis dáng mới (P18, sau Đợt đầu); Rễ Trồi (chưa có file `root-burst.glb`) | Cảnh bản đồ 1 (~12 loại × 2 biến thể đầu), 1 phông xa; chân dung Draconis, 3 Thư Đồng (vui, hoảng), Bà Cú Mực; đèn lồng 3 trạng thái; 3 bùa; icon 6 nhà, 6 nhịp | **~40–60 tiếng:** bắn và trúng của Cung, Pháo, nỏ Lũy (3 lớp, 3 biến thể chính); trống, giáo, hô, chết của lính; cuốc, goòng, lúa; Từ Vàng, cụm chốt, Bùng Nổ 5 nhà; túi, rương; tiếng đi, đánh, chết của 7 quái; Mộc Tinh (gỗ, rễ, gầm); UI xây, nâng, bán. **~30–35 câu thoại:** Draconis 12, Chấm 6, Bà Cú Mực 6, tổ thợ 6 nhà × "Người tới" + "Bùng Nổ". Nhạc: 1 bản bản đồ 1 + câu nhạc ngắn. Tiếng phím và "chữ ra" tổng hợp bằng mã. |
| **VS** | Tre; bộ gắn Phẩy, Gạch; Thư Pháp, Nhà Thuốc, Trại Gỗ; bộ cấp L2, L3 mọi nhà; Lũy cấp 3–4; 18 model nhánh; đống đổ nát 4 cỡ; Oni, Tất Phương, Ma Da, Dokkaebi, Chồn Liềm; Đại Bàng Tinh; ~12 mốc cảnh; trâu, heo đất, chuồn chuồn | Cảnh 3 bản đồ (~25 loại, ≥ 4 biến thể); phông 3 bản đồ; chân dung đủ (3 Tướng, 10 tổ thợ, 2 boss); ảnh trượt Tối Thượng 3; tranh truyện 2 mỗi Tướng; atlas cảnh Neon cho bản đồ thử | Thoại đủ: 3 Tướng × 19 câu × 2–3 bản; 3 Thư Đồng × 6; tổ thợ 10 × 7; Bà Cú Mực 12; lính 3 loại × 5–7; boss 2 × 6; câu hô quái. Tiếng: 14 loài × 4 nhóm × 3–4 biến thể; mọi vũ khí và va chạm; âm nền 3 bản đồ × 2 lớp. Nhạc: 3–4 bản + 1 boss + câu ngắn. |
| **Sau** | Thế giới 2+, trang phục | Thư Thành đầy đủ, bách khoa | CGI C4, giọng Việt đầy đủ |

- Bộ prompt theo bậc: `docs/art-requests/td/README.md`. Món thêm ngoài bảng này có lý do ở từng file.

### 27.3 Chi phí asset (rẻ → đắt)

1. Icon UI, tiếng ngắn: rẻ từng cái.
2. Tranh cảnh 2D: rẻ từng cái, nhưng nhiều (25 loại × 4 biến thể × mỗi vùng).
3. Câu thoại: vừa (cần đúng giọng nhân vật, 2–3 bản).
4. Nhà: vừa (Tripo + Blender socket + bộ cấp + đống đổ nát chung).
5. Lính, quái có khung xương: vừa–cao (rig, clip, nướng VAT).
6. Tướng: cao (model đẹp, nhiều clip, VFX riêng, thoại, chân dung, tranh truyện).
7. Boss: cao nhất trong trận (khung lớn, pha, báo trước, nhiều clip).
8. CGI dựng sẵn: rất cao. Để sau MVP.

### 27.4 Rủi ro sản xuất

| Rủi ro | Cách chặn |
|---|---|
| Tripo dựng lửa, sợi mảnh thành mảnh rời | Ảnh gửi Tripo không lửa, không sợi mảnh (mục 23.11); lửa làm bằng VFX |
| Tự rig hỏng với cú, rắn, chim | Blender làm clip tay theo bảng 23.9; ảnh nhìn trực giao |
| Phong cách ChatGPT không đều | Một đoạn mở đầu prompt chung cho mọi ảnh + ảnh mẫu; script tự thêm viền mực chuẩn cho tranh cảnh |
| Khối lượng âm lớn | Chia bậc P / VS / Sau; tiếng phím tổng hợp; mỗi tiếng 3 biến thể là đủ ở P |
| Bản quyền | Gói thương mại; manifest ghi nguồn |
| Mất file | Kế hoạch Google Drive với md5 |

---

## 28. Đã quyết thay chủ dự án (đổi được)

Chủ dự án nói không cần chờ duyệt. Đây là mặc định. Đổi bằng dữ liệu hoặc một dòng ở đây.

1. **Bản chơi đầu tiên là 1A: bản đồ 2D nhìn từ trên**, để thử độ vui của dòng chữ trước khi làm hình 3D.
2. **CGI:** cảnh trong engine và tranh truyện vẽ tay ở MVP; CGI dựng sẵn (render từ model Tripo) sau MVP.
3. **Lam** vào bản thử ngay khi có model Tripo; tới lúc đó dùng khối tạm (1B).
4. **Trợ Thủ Thế giới 1 là ba cú non Thư Đồng đi bộ**, không máu; hoảng khi đòn boss trúng chỗ đứng.
5. **Ô mở bằng Lũy Chữ** trong trận (150 / 260 / 400), cần Trợ Thủ trong tài khoản; Học Viện cấp 5 mở ô thứ tư.
6. **Lúa nuôi lính** (Ruộng có ích; dư đổi Vàng 1 : 1). Ruộng đặt tự do trên cỏ, có vùng phù sa.
7. **Nhịp hiện bằng số giây** ("4 s"), không đặt tên riêng. Có thêm 6 s cho mọi mức và 8 s cho mức Dễ.
8. **Mảnh Chữ** chỉ nạp khi quái chết trong vòng hút quanh chỗ Tướng đứng; ngoài vòng là mất.
9. **Bản đồ 1 không có cửa sổ ấn.** Cửa sổ ấn và Chữ Chiêu dạy ở bản đồ 3.
10. **Dải Chữ gọn** mặc định ở Thường, Khó; tự mở rộng khi có nhà khuất; luôn đầy đủ ở Dễ.
11. **Phím lệnh** Alt + số (Windows, macOS), Shift + số (Linux); đổi được; mọi việc có nút.
12. **Thư Thành** là tranh 2D nhiều lớp.
13. **Tên** theo bảng 0.6. Câu hô tiếng Anh, tranh truyện và người kể tiếng Việt, có tùy chọn giọng Việt.

---

## Phụ lục A. Hằng số khởi điểm

File dữ liệu là nguồn thật. Đây là bản chụp ngày 22/10.

```ts
// Mô phỏng
STEP = 1/60; MAX_STEPS_PER_FRAME = 10
STORE = { enemies: 640, soldiers: 96, projectiles: 512, buildings: 40, agents: 8, words: 24, bags: 8, simProps: 1024 }  // chỗ dư
CAP   = { soldiers: 64, agents: 4, liveWords: 16, streamLiveMax: 12, streamLiveMin: 4, wordsPerBuilding: 4,
          liveDirect: 2, liveDirectBoss: 3, livePickupWords: 3, bagsOnGround: 6, letterMotes: 40 }        // trần luật

// Nhịp (mục 6.2)
TEMPO = [ { s: 0 },                                                       // Dừng
  { s: 8, tAtk: 0.85, tEco: 0.85, k: 0.5,  minLevel: 1, easyOnly: true, newWords: true },
  { s: 6, tAtk: 0.90, tEco: 0.90, k: 0.6,  minLevel: 1, newWords: true },
  { s: 4, tAtk: 1.00, tEco: 1.00, k: 0.75, minLevel: 1, newWords: true },
  { s: 3, tAtk: 1.10, tEco: 1.00, k: 0.85, minLevel: 1, newWords: true },
  { s: 2, tAtk: 1.20, tEco: 1.05, k: 1.0,  minLevel: 2, maxLen: 6, newWords: false },
  { s: 1, tAtk: 1.35, tEco: 1.10, k: 1.0,  minLevel: 3, maxLen: 5, newWords: false } ]
DEFAULT_TEMPO_S = { slowE: 6, normal: 4, slowEBelow: 30 }
LENGTH_BY_E = [ { minE: 0, len: [3, 5] }, { minE: 25, len: [3, 6] }, { minE: 45, len: [4, 7] }, { minE: 65, len: [4, 8] } ]
SEAL_DAIS_PHRASE_S = [8, 6, 5]; INFIRMARY_MIN_S = 2

// Từ
LIFE = { base: 1.2, perChar: 12, min: 3.0, max: 6.0, kEasy: 1.25, kNormal: 1.0, kHard: 0.9, hardMin: 2.7,
         rareMul: 1.3, reviewMul: 1.4, phraseMin: 5, phraseMax: 12, finisherPlusS: 1, graceS: 0.6, graceAt: 0.5 }
EMIT = { settleS: 0.4, firstDelayS: 0.6, staggerS: 0.2, staggerMaxS: 0.6, letterSlack: 6,
         directYieldS: 1.0, afterSealS: 1.0, upgradePauseS: 1.0, preBossQuietS: 12 }
LETTERS = { cooldownS: 1.0, reserve: 3, avoid: "qxzj", avoidUntilLevel: 10, tier2EarlyFree: 5, tier2EarlyMaxLevel: 3,
            maxEditCheckLen: 8, minWordsPerLetter: 3 }
WORD_PLAN = { review: 0.60, current: 0.25, fresh: 0.15, freshMaxPerMap: 8, coldKnownTop: 50 }

// Chấm (mục 6.6)
SCORE = { errNum: 1.5, errMin: 0.15, errMax: 0.40, phraseLen: 12, fastBase: 0.35, fastK: 0.8,
          effBase: 0.4, effK: 0.6, qA: 0.6, qS: 0.4, flashS: 0.7 }
WORD_D = { known: 1.0, learning: 0.85, phrase: 0.9, new: 0.7, listen: 0.6, recall: 0.6 }
BASELINE = { seed: 25, alphaUp: 0.20, alphaDown: 0.08, min: 12, max: 140, minWords: 40, floor: { easy: 12, normal: 20, hard: 35 } }

// Nhiệt, Chuỗi, Mượt
HEAT  = { max: 5, flash: 1.5, good: 1, ok: 0.5, sloppy: -1, expired: -1, rareExpired: 0, prepCap: 2.5,
          holdBase: 4, holdC: 2, decayPerS: 0.25, window: 5 }
CHAIN = { good: 1, special: 2, direct: 1, seal: 2, untouchedExpire: -2,
          tiers: [ { from: 0, rc: 0.40, rare: 0.04 }, { from: 5, rc: 0.55, rare: 0.05 }, { from: 10, rc: 0.70, rare: 0.06 },
                   { from: 20, rc: 0.85, rare: 0.07 }, { from: 40, rc: 1.00, rare: 0.08 } ],
          callouts: [10, 25, 50, 100], chainIconBelowRc: 0.70, chainIconMinBase: 0.6 }
ORDER_GRACE = { maxS: 2, cooldownS: 3 }

// Hào quang, có mặt, phần thưởng
PRESENCE = 0.15
AURA_ATTACK   = { rate: 0.5, dmg: 0.4, crit: 0.15, area: 0.5, targets: 2, caps: { rate: 1.5, dmg: 1.4, area: 1.5, targets: 2 } }
AURA_ECONOMY  = { cycle: 0.4, perProduce: 0.25 }
AURA_MILITARY = { respawn: 0.4, buff: 0.30, tempSoldierAt: 0.6, shout: 0.10 }
REWARD = { lenDiv: 6, lenMin: 0.8, lenMax: 1.2, qA: [0.4, 0.6], qS: [0.8, 0.4], qQ: [0.5, 0.5],
           shotQ: [0.8, 1.2], perfectCrit: 1.75, cannonSplashMul: 1.15, overdriveMul: 1.25 }
WORD_SHOT_DBAR = { archer: [7.5, 11, 15.5], cannon: [13, 21, 32], scribe: [15, 24, 36] }
ECON_WORD = { gold: [2.0, 2.4, 2.8], food: [0.5, 0.6, 0.7], wood: [0.4, 0.5, 0.6], keepGold: 1.5 }
BARRACKS_WORD = { respawnCutS: 3, healPct: 0.08 }
FIVE_GOOD = { mineGold: 5, food: 3, wood: 3, tempSoldierS: 15, tempSoldierMax: 2 }
RICHNESS = [0.8, 1.0, 1.25]

// Bùng Nổ, Hợp Tấu
OVERDRIVE = { heat: 5, chain: 8, words: 2, maxErrPerWord: 1, baseS: 6, perFS: 2, weakS: 3, heatAfter: 2, restS: 20, restHeatCap: 3 }
HARMONY = { two: 2, three: 3, threeHealPct: 0.2, threeUlt: 5 }

// Hệ gõ vui
RARE   = { base: 0.04, perTier: 0.01, max: 0.08, split: { gold: 0.5, star: 0.3, leaf: 0.2 }, goldMul: 3, goldFlat: 3, goldPierceM: 12 }
REVIEW = { delayS: [25, 45], mul: 1.2, mulAcademy2: 1.3, maxLive: 1, gapS: 10, maxShare: 0.25, maxReturns: 2 }
ULT_WORDS = { count: 3, countLv5: 4, gapS: 0.6, lifeS: 3, len: [3, 5], perWord: 0.20 }
RUSH   = { perMap: [2, 4], minWaveGap: 2, warnS: 4, durS: 12, tempoS: 1, tempoEasyS: 2, mul: 1.5, successAt: 0.7 }
SPELL_WORDS = { words: 2, windowS: 4, bonus: 0.5 }
PIGGY  = { fromMap: 2, runS: 10, hp: 120, goldTyped: 30, goldShot: 10 }

// Tối Thượng
ULT = { perStreamWord: 1.2, perStar: 10, perSealPhrase: 8, perDirect: 3, perShard: 0.6, nearDaisPerS: 0.5, nearDaisM: 7,
        perWaveS: 0.3, grandHarmony: 5, minGapS: 45 }

// Người trợ lực
ASSIST = { enterM: 3.0, exitM: 4.5, settleS: 0.4 }
HELPER = { speed: [4.0, 4.2, 4.4, 4.6, 4.8], presence: [0.15, 0.16, 0.17, 0.18, 0.20],
           specialty: [0.10, 0.13, 0.16, 0.19, 0.22], scaredS: [5, 5, 2.5, 2.5, 2.5], settleS: [0.4, 0.4, 0.4, 0.2, 0.2] }
HERO = { draconis: { fly: 6.0, takeoffS: 0.6, landS: 0.6, respawnS: 20, magnetM: 12 },
         lam: { run: 6.5, dashM: 8, dashCdS: 6, respawnS: 14, magnetM: 10 }, tre: { run: 4.5, respawnS: 12, magnetM: 8 } }

// Gõ trực tiếp, boss
DIRECT_K = { easy: 2.8, normal: 2.2, hard: 1.6 }; DIRECT_T = { base: 0.8, min: 3, max: 7 }
DIRECT_REWARD = { gold: 2, ult: 3, chain: 1 }
SEAL = { prepS: 6, channelS: { easy: 10, normal: 8, hard: 6 }, keepTimeMul: 0.75, stunS: [2, 3], vulnS: 8, vulnMul: 1.5,
         untaughtStaggerS: 5, untaughtVuln: 0.25 }
TELEGRAPH_S = { easy: 1.8, normal: 1.2, hard: 1.0 }

// Loot
LOOT = { coinFlightS: [0.5, 0.6], coinCap: { high: 120, medium: 60, low: 28 }, bagLifeS: 6, bagExpireShare: 0.5,
         bagChance: { medium: 0.05, heavy: 0.15, elite: 1.0 }, bagWalkM: 3, charmFullToGold: 20,
         shards: { swarm: 0.5, small: 1, medium: 2, heavy: 3, elite: 3, miniBoss: 6, boss: 10 },
         rewardCoinsMax: 4, rewardCoinValue: 1.5, pileCoinsMax: 12, pileEveryS: 5 }
THIEF = { maxPerSteal: 15, maxSteals: 2 }

// Kinh tế
START_GOLD = [220, 260, 300, 340, 380, 420, 460, 500]
FOOD = { start: 15, cap: 30, farmL2Cap: 10, keepEveryS: 10, respawnCost: 1 }; WOOD = { start: 0, cap: 60 }
WAVE_GAP_S = { early: 30, later: 20 }; EARLY_CALL = { goldPerS: 1, goldCap: 30, cdPerS: 0.5 }
WAVE_BONUS = { base: 10, perWave: 2 }; LEFTOVER = { scorePerGold: 1, coinPer: 60, coinMax: 15 }
SELL = { undoWindowS: 5, rate: 0.6, ruinedRate: 0.3 }; MOVE_FEE = { rate: 0.15, min: 10 }
REPAIR = { autoRate: 0.25, word: 0.12, wordTre: 0.16, runAt: 0.5 }; LIVES = 20
TYPED_GOLD_SHARE_MAX = 0.45

// Lũy, công trình
KEEP = [ { cost: 0,   wood: 0,  slots: 1, attackCap: 4, maxLevel: 2, crossbow: [10, 14] },
         { cost: 150, wood: 20, slots: 2, attackCap: 6, maxLevel: 3, crossbow: [14, 20], tempoUnlock: 2 },
         { cost: 260, wood: 40, slots: 3, attackCap: 8, maxLevel: 4, crossbow: [20, 28], targets: 2 },
         { cost: 400, wood: 60, slots: 4, attackCap: 8, maxLevel: 4, crossbow: [26, 36], targets: 2, bonusLives: 2 } ]
PROTO = { attackCap: 6, keepNeedsWood: false, buildingMaxLevel: 3 }
CAPS = { total: 16, barracks: 3, farm: 3, sealDais: 1, infirmary: 2 }
FOOTPRINT_R = { S: 2.0, M: 2.3, L: 2.7, XL: 3.5 }; GAP_M = 1.0; ROAD_CLEAR = 1.9; KEEP_CLEAR = 11
BUILD_TIME_S = { S: 1.5, M: 1.5, L: 2.5, XL: 2.5 }; UPGRADE_TIME_S = 1; KEEP_UPGRADE_S = 3
BRANCH_SKILL_COST = [120, 160, 200]

// Lính, đợt
SOLDIER = { perBarracks: 3, respawnS: 10, engageM: 3, leashM: 5, regenPctS: 0.05, regenDelayS: 3 }
RALLY = { radiusM: 12, roadMaxM: 3 }
THREAT_GROWTH = [0.12, 0.18]; LULL_MIN_S = 10; BREATHER_EVERY = [3, 4]; BREATHER_MULT = 0.7; FLYER_SHARE_MAX = 0.30

// Ngoài trận
HERO_XP = { base: 250, perLevel: 100, mapBase: 300, mapStep: 40, starStep: 0.1, replay: 0.5, bench: 0.25 }
HERO_STAT_PER_LEVEL = 0.02
ACADEMY_COST = [0, 120, 250, 400, 600]; HELPER_LEVEL_COST = [0, 40, 90, 150, 220]
KNOWLEDGE = { masteryUp: 1, newMastered: 5, review: 10, firstClear: 20, redeem: 1, dailySoft: 200, overRate: 0.25 }
RESEARCH_CAP = 0.15

// Chống macro
MACRO_FLAG = { wpm: 200, minWords: 10, cv: 0.08, cvKeys: 30, fastGapMs: 15, fastRun: 5 }
```

---

## Phụ lục B. Các sửa theo phản biện

| # | Phản biện | Sửa | Ở đâu |
|---|---|---|---|
| 1 | 03 cũ lệch 01, 02, 04 và còn phương án treo | Viết lại phần trình bày trên luật cuối; bỏ mọi "nếu luật…"; bỏ Đèn Trời, Trống Hội, Cơn Lốc Chữ, Lóng ngóng, Nhà nghỉ, thưởng Liên Hoàn (giữ sợi chỉ Chuỗi chỉ là hình); bảng đồ hiếm thay bằng túi và bùa; Mảnh Chữ ghi sổ ngay, ngoài vòng là mất; túi 6 s, tinh nhuệ 100 %; boss 10 mảnh; cửa sổ ấn dừng mọi dòng chữ; trần 16; Phát Chữ không có mục tiêu thành pháo hoa | Mục 23, 17.4 |
| 2 | Tên và id lệch; "Nhịp" hai nghĩa | Một bảng thuật ngữ VI · EN · id; kênh thứ ba tên Mượt (`flow`); mã dùng `tempo`; id `helper-cham`…; `activityType` `defense-*` | Mục 0.6 |
| 3 | Gợi ý chia ô vượt sức gõ | Thêm 6 s cho mọi mức, 8 s cho Dễ; độ dài từ theo E (không còn từ dài ở nhịp chậm); mặc định 6 s khi E < 30; tính lại bảng gợi ý, mọi gợi ý ~≤ 100 %; cổng 25 WPM trúng ≥ 85 % | Mục 6.2, 6.3, 6.13, 19.7 |
| 4 | Chuỗi chung và Mượt chung làm ô thêm có hại | Mượt tính riêng từng nhà; tan chưa chạm chỉ −2 Chuỗi; ÷2 chỉ cho Ẩu và tan đã gõ dở; biểu tượng mắt xích khi Chuỗi chặn vùng; cổng ô thêm ≥ ×1,15 | Mục 6.8, 6.9, 6.16 |
| 5 | Chấm chuẩn phạt từ ngắn | Chấm theo số lỗi có nới theo độ dài; A_w = 1 − e·p(len); hình dùng đúng tên kết quả; test độ dài 3, 5, 8, 12 | Mục 6.6, 23.4 |
| 6 | Chữ đầu không đủ với từ vựng thật; khởi động lạnh | Trần dòng chữ = clamp(A − 6; 4; 12) đo trên từ vựng thật; tầng 2 sớm ở cấp ≤ 3; khởi động lạnh; cổng nghẽn chữ chỉ từ cấp 5, cấp 1–3 báo cáo | Mục 6.5, 25.8 |
| 7 | So le 0,3 s không đứng ở 4 × 1 s | So le 0,2 s, lùi tối đa 0,6 s; bất biến có ngoại lệ "đã lùi hết"; test 4 × 1 s | Mục 6.4, 19.7 |
| 8 | Cột chữ chồng khi tuổi từ dài | Luật cột: bay theo thời gian, đẩy giữ ≥ 40 px, cột ≤ 240 px; bay trong tọa độ màn hình; test L = 7,5 s | Mục 23.4, 23.14 |
| 9 | Bước 1 quá lớn | Chia 1A (≤ 5.000 dòng, chơi được sớm), 1B, 1C | Mục 0.5, 26.1, `BUILD_NOW.md` |
| 10 | Điều kiện xong bước 1 dựa vào cân bằng | Cổng cứng chỉ là bất biến, tất định, hiệu năng, không lỗi; mục tiêu cân bằng in báo cáo, thành cổng ở VS | Mục 19.7 |
| 11 | Không ai chơi thử 3–4 ô | Hộp cát và thử thách Bốn Ô; danh sách chơi thử của chủ dự án có 3 và 4 ô; `td-words` 4 nhà bắt buộc đạt | Mục 5.1, 20.1, `BUILD_NOW.md` |
| 12 | Bản đồ 1 dạy quá nhiều | Bản đồ 1 dạy 9 ý, một gõ trực tiếp (Ngắt); bản đồ 2 Neo, Phá Khiên, túi, Bùng Nổ, Đài Ấn; bản đồ 3 cửa sổ ấn, Chữ Chiêu; huy chương dời sang đợt 3; một bảng dạy duy nhất | Mục 20.4, 22.9 |
| 13 | Lệnh chuột đánh vào việc gõ | Ân hạn ra lệnh (lệnh có tick, 2 s); đường bàn phím cho mọi việc; kịch bản chơi chỉ bàn phím | Mục 6.14, 8.3 |
| 14 | Không có nghỉ | Dừng tất cả giữa đợt đóng băng Nhiệt, Chuỗi; không Cơn Gấp ở đợt thở; 12 s không chữ trước boss | Mục 6.14, 18.6 |
| 15 | Kinh tế lăn cầu tuyết | T_N kinh tế phẳng; G hạ còn 2,0 / 2,4 / 2,8; bảng tính lại ở đúng cấp mở nhịp; cổng vàng gõ ≤ 45 % | Mục 6.2, 11.5, 17.3 |
| 16 | lenF chỉ cho tài nguyên | Một lenF (0,8–1,2) cho mọi phần thưởng; T_N tấn công 1 s = 1,35 | Mục 6.11 |
| 17 | Ruộng, Trại Gỗ bỏ qua Tốc | Thêm qS | Mục 6.11 |
| 18 | Phạt Ẩu hai lần | Bỏ hệ số phạt riêng | Mục 6.11 |
| 19 | Chọn người sau lệnh lệch | Người đang chọn không đổi; Shift + phải để gửi nhanh; Esc: nhả khóa → đóng menu → bỏ chọn → dừng | Mục 8.3, 6.15 |
| 20 | Cờ dữ liệu thừa | Bỏ `slotSource`, `insideBuilding`; `move` chỉ ở Tướng | Mục 25.4 |
| 21 | Tên clip lệch | Một bảng clip chuẩn có bí danh Draconis và hậu tố biến thể | Mục 23.9 |
| 22 | Tư thế ảnh Tripo lệch | Có khung xương: nhìn thẳng trực giao tư thế A; bốn chân, rắn, chim: nhìn ngang 90°; 3/4 chỉ cho nhà, mốc cảnh, chân dung, tranh truyện | Mục 23.11 |
| 23 | Cỡ lệch | Thư Đồng 1,1–1,3 m; lính 1,7–2,0 m | Mục 22.3, 23.2 |
| 24 | Số lệch nhỏ | Boss là đợt cuối; khoảng vàng, lọt của bậc nới và có test; sức chứa kho ghi là chỗ dư; một ngân sách cảnh 2D; Lũy cấp 2 mở 2 s; đống vàng về kho mỗi 5 s | Mục 14.2, 18.1, 23.10, 25.5, 12.4, 11.5 |
| 25 | Hộp cát hay truyện không rõ | Bản thử là hộp cát (mọi thứ mở bằng cờ); chế độ truyện theo bảng dạy; chủ dự án chơi hộp cát ở 1A, bản đồ 1 truyện ở 1B | Mục 0.5, 26.1 |
| 26 | Draconis bị phạt ở nhà kinh tế | Bỏ phạt | Mục 22.2 |
| 27 | Thế giới và phong cách chưa có lịch | Bảng 5 thế giới, có thế giới Neon; bản đồ neon trong MVP; việc VS dựng bản đồ 1 bằng StylePack Neon; atlas neon riêng | Mục 26.2, 26.3, 23.12 |
| 28 | Thiếu nhận xét bản nháp ChatGPT | Bảng giữ, đổi, bỏ, thêm và trả lời 25 câu hỏi | Mục 3 |
| 29 | CGI và Lam bị lệch ý chủ dự án mà không nói | Ghi thành quyết định mặc định | Mục 28 |
| 30 | Alt + số trên Linux; nhặt Mảnh Chữ khi trợ lực; Ruộng trên node | Phím đổi được, Linux mặc định Shift, có nút; Tướng trợ lực vẫn hút trong vòng quanh chỗ đứng; Ruộng đặt tự do có vùng phù sa | Mục 8.3, 17.4, 12.6 |
| 31 | Tài liệu dài, khối lượng sản xuất lớn | Bản chốt 2 trang; một tài liệu thay bốn; prompt chia bậc P / VS / Sau, bậc P ~40–60 tiếng, ~30–35 câu thoại | Mục 0, 27 |
