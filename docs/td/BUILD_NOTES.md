# Ghi chú khi làm 1A

Đi kèm `BUILD_NOW.md`. Cập nhật cuối mỗi mốc.

---

## 1. Ngân sách dòng (BUILD_NOW §2)

Đếm bằng `wc -l` trên `td.html`, `src/platform/rng.ts` và mọi file trong `src/td/`. Không tính test, kịch bản, `scripts/`. Test `td-boundary` đọc trần cứng 5.500 từ BUILD_NOW §2 và hỏng khi tổng vượt.

### 1.1 Sau 1A.2

| Nhóm | Kế hoạch | Sau 1A.1 | Sau 1A.2 (`5be5919b`) | Sau sửa review 1A.2 | Còn lại |
|---|---|---|---|---|---|
| Trang (`td.html`) | 30 | 18 | 18 | 18 | 12 |
| Platform (`rng.ts`) | 50 | 69 | 69 | 69 | −19 |
| Nội dung | 800 | 644 | 654 | 571 | 229 |
| Gõ thuần (`typing/`) | 700 | 0 | 441 | 453 | 247 |
| Sim lõi (`sim/*.ts`) | 550 | 671 | 779 | 774 | −224 |
| Kho | 250 | 259 | 330 | 331 | −81 |
| Đường (`nav/`) | 200 | 108 | 108 | 108 | 92 |
| Hệ chiến đấu | 450 | 534 | 586 | 585 | −135 |
| Hệ gõ | 600 | 0 | 598 | 629 | −29 |
| App | 450 | 199 | 330 | 330 | 120 |
| View, UI | 900 | 377 | 788 | 714 | 186 |
| **Tổng** | **4.980** | **2.879** | **4.701** | **4.582** | **918 tới trần 5.500** |

1A.2 có phần 1.580 dòng (cộng dồn 4.459). Bản `5be5919b` tiêu 1.822, vượt 242, và không bù trong mốc, trái luật ở 1.2. Lần sửa review:

- Sửa các lỗi review trong mã thêm 55 dòng (sàn E, Dừng tất cả khi xây, kiểm lại nhịp khi đổi độ khó và cấp, `shift` khi bỏ lần phát, chặn lỗi ở 255, đưa từ tầng 2 lên tầng 1, túi không bỏ phần còn lại, khoảng cột theo chiều cao thẻ).
- Bù 174 dòng chỗ trùng thật: kiểu đã biên dịch suy ra từ hàm biên dịch (như `Typing`) thay vì khai lại từng trường; CSS trang một luật một dòng như CSS thẻ; bảng màu `debug-2d` và cờ tập kết; cột của vòng sự kiện là trường; kiểu dữ liệu thuần (`AttackSpec`, `HeroDef`, `MapDef`, quái đã biên dịch) gộp dòng.
- Còn vượt phần của 1A.2: 4.582 − 4.459 = 123 dòng. Không cắt thêm chú thích luật (chúng giữ tham chiếu TK). Phần này trừ vào phần của 1A.3–1A.5, ước lượng lại bằng số thật ở 1.2.

### 1.2 Phần cho từng mốc còn lại (ước lượng lại sau review 1A.3; 1A.4 ghi số thật)

Mốc đang làm: **1A.6**. Test `td-boundary` đọc dòng này và cột "Cộng dồn tối đa" của mốc đó, rồi hỏng khi tổng vượt (ngoài trần cứng của `BUILD_1A6.md` §0). Bắt đầu mốc mới thì đổi dòng trên trước khi viết mã. Từ 1A.6 đếm như `BUILD_1A6.md` §0: chỉ TypeScript trong `src/td` (1A đếm thêm `td.html`, `rng.ts`, `td.css`: 178 dòng; mục 3).

| Mốc | Phần mới (ước lượng theo mã thật đã có) | Tối đa | Cộng dồn tối đa |
|---|---|---|---|
| 1A.2 Gõ lõi (xong, gồm sửa review) | 1.703 thật | — | 4.582 |
| 1A.3 Người và ô (xong, gồm sửa review) | 378 thật: 337 của mốc (mục 1.4: `nav/astar` 107, kho `agents` 36, hệ `agents` 174, `stream` −29, nối `commands` `world` `placement` `compile` `events` `main` +13, vẽ người, đường A*, dây +36) và 41 của bản sửa review 1A.3 (mục 1.6: `nav` +18, hệ `agents` +4, `debug-2d` +17, `cards` +2) | 340 + 41 | 4.960 |
| 1A.4 Điều khiển, HUD (xong, gồm sửa review) | 496 thật: 499 của mốc (mục 1.7; bản đầu đủ mục 5.3–5.4 dài 822, cắt UI theo mục 1.8) và −3 của bản sửa review 1A.4 (mục 1.10) | 500 | 5.460 |
| 1A.5 Bot, báo cáo (xong) | 41 thật (mục 1.11): op hộp cát `flood` (TK 25.12) ở `spawn.ts` +19 và `commands.ts` +6, đo khung ở `main.ts` +16; bot, chính sách, báo cáo nằm ở `tests/` và `scripts/` | 40 | 5.500 |
| 1A.6 Lời Gọi (R1, R2 xong, R3 còn; đếm mới, chỉ `.ts` của `src/td`) | R1: 5.319 → 5.540 thật (mục 3, gồm sửa review); R2: 5.540 → 5.850 thật (mục 4) | R1 tới 6.600; R2 tới 7.000; R3 phần còn lại | 7.300 |

Ước lượng lại 1A.4 (review 1A.3, mục 5), tính cả `move` và đốm sáng dọc dây trợ lực mà 1A.3 dời sang, cùng 41 dòng của bản sửa review 1A.3. Bản sửa đó dùng hết 38 dòng dự phòng dưới trần, nên phần của 1A.4 giữ 500 mà phải chứa thêm hai việc. Cắt theo BUILD_NOW §10 (cắt UI trước, không cắt luật, test) trước khi viết mã 1A.4:

| Phần của 1A.4 | Trước | Sau review 1A.3 | Cắt |
|---|---|---|---|
| Phím lệnh ở `app/input` (hôm nay 35) | 75 | 75 | |
| `app/selection` + chỗ trống gợi ý trong sim | 80 | 80 | |
| Chuột và camera | 70 | 50 | Bỏ kéo chân dung thả lên nhà (§10 nêu tên) và Shift + phải "Thư Đồng rảnh gần nhất". Còn: trái chọn, phải vào nhà để gửi, lăn zoom, kéo camera |
| `move`: lệnh sim (người trong ô mở, điểm trong sân, Thư Đồng cần ô trống), phải vào đất | — | 16 | |
| Thanh nhà (nhịp, gửi, tập kết, hoàn tác, cấp, "Mỗi từ", gợi ý nhịp) gộp menu xây, thay vòng menu (§10) | 85 | 80 | Bỏ lăn chuột trên huy hiệu nhịp; nhịp đổi bằng núm trên thanh, `Minus` / `Equal` |
| Thanh 4 chân dung | 35 | 35 | |
| HUD (chuyển chip trạng thái ra khỏi `main.ts`, −25) | 30 | 30 | |
| Chip Tải, Chuỗi | 30 | 30 | Danh sách rê chuột của chip Tải là `title` (đã cắt từ trước) |
| Hộp cát | 50 | 45 | Dựng từ một bảng điều khiển; "Đặt sẵn 4 ô" là một bảng dữ liệu như kịch bản `td-1a-slots` |
| CSS | 45 | 40 | Không có bóng kéo, không có vòng menu |
| Ân hạn ra lệnh | 5 | 5 | |
| Đốm sáng dọc dây mỗi phím đúng (view đọc `wordKey`) | — | 14 | |
| **Cộng** | **505** | **535 → 500** | **−35** |

- Không còn dòng dự phòng: 4.960 + 500 + 40 = 5.500, đúng trần cứng. Mục tiêu 5.000 không giữ được; BUILD_NOW §2 cho vượt mục tiêu nhưng không vượt trần.
- Từ 1A.4, mốc nào vượt phần của mình thì bù ngay trong mốc đó (cắt thêm UI theo §10, không cắt luật, test), không đẩy sang mốc sau. Test chặn theo cột "Cộng dồn tối đa", nên vượt là đỏ ngay trong mốc. 1A.4 bù được bằng chỗ trùng thật thì trả lại theo thứ tự: lăn chuột trên huy hiệu nhịp, Shift + phải.

### 1.3 Lệch so với BUILD_NOW, TK ở 1A.2 (có lý do)

- **Bảng TK 6.5, cột 4–8:** số trong TK (58 / 237 / 453 từ, A = 9 / 19 / 22) là đếm trên 5–8 chữ. Dải 4–8 thật: 124 / 375 / 676 từ, A = 15 / 21 / 23, trần 9 / 12 / 12. `td-content` kiểm số thật và kiểm riêng rằng 5–8 cho 58 / 237 / 453.
- **Tầng 2 của dòng chữ** bật khi số chữ trống ≤ mức sàn của chính loại đó (dòng chữ: 3, vì dòng chữ đã dừng ở dự trữ), không đợi tới 0. Đọc chữ "khi không còn chữ đầu trống" theo nghĩa "không còn chữ trống loại này được lấy"; nếu đợi tới 0 thì từ cấp 4 trở lên dòng chữ nghẽn ở 1–3 chữ trống mà không có tầng 2.
- **Neo thẻ chữ:** bán kính nhà + 1,4 m (ngay trên hàng đèn lồng, đúng ý TK 23.4 "FX_top + 0,6 m"), không phải 2,5 m cố định. Neo 2,5 m che đèn lồng của mọi nhà rộng hơn 2 m.
- **Người trợ lực ở 1A.2 có mặt ngay** (`assignUnit` đặt người vào ổ, vào việc 0,4 s, từ đầu sau 0,6 s). Đi bộ, bay, A* là 1A.3.
- **Phát Chữ** không nhân hào quang sát thương (phần thưởng từ là lớp riêng, không trần); vùng nổ có nhân hào quang vùng × 1,15. Chí mạng thường vẫn quay ở luồng `crit` khi từ không Hoàn hảo.
- **Có mặt +15 %** nhân vào kênh nhịp: tốc bắn, chu kỳ tự sản, tốc hồi sinh (khớp số "hồi sinh ~7,3 s gồm có mặt" ở TK 11.4 và "chỉ có mặt 25,9" ở TK 11.5).
- **5 từ tốt liền** đếm mọi kết quả không Ẩu (gồm Vừa); Ẩu và tan đặt lại.
- **Nỏ Lũy** nhận hào quang tấn công; phần thưởng từ của Lũy dùng T_N kinh tế.
- **Pháo** theo TK 11.3: Chuẩn làm rìa nổ còn 70 %, Mượt nới vùng tối đa 40 %, không mục tiêu thêm.
- **Khó:** tuổi từ × 0,9 nên ở 317 ô (E, độ dài) tuổi từ ngắn hơn 1,2 s + thời gian gõ. Test in danh sách và kiểm thời gian gõ vẫn vừa.
- **Sàn E** (TK 6.6 "E = max(B, sàn)"): hộp cát đặt B (`w.expected`); tuổi từ, chấm, dải độ dài, nhịp mặc định đọc `expectedE(w)`. Đổi độ khó thì dựng lại dải và trần chữ.
- **Xây nhà lúc "Dừng tất cả"** (TK không nói): nhà mới đứng ở Dừng, nhịp của nó được cất như mọi nhà khác; "trả lại" cho nó nhịp đó. Đóng băng Nhiệt và Chuỗi giữa đợt vẫn giữ.
- **Nhịp đóng sau khi đổi độ khó hoặc cấp** (TK không nói): chuyển sang nhịp mở gần nhất, chậm hơn nếu đang quá dày (Lũy về cấp 1: 2 s → 3 s), dày hơn nếu nhịp chậm bị đóng (8 s rời Dễ → 6 s). Nhịp do "Dừng tất cả" cất cũng được kiểm lại. Người chơi tự chọn nhịp thì nhịp đã cất bị xóa.
- **Túi từ:** phần còn lại của một vòng mà lúc này không từ nào lọt thì mở đầu vòng sau, trước các từ vừa phát (xáo lại). Lấy một từ thì các từ chưa phát giữ thứ tự (`copyWithin`), nên phần mang sang luôn ra trước khi từ khác lặp lại.
- **Khoảng cột thẻ** = max(40, ⌈1,2 × cao thẻ⌉ + 4) px, để thẻ đang gõ (×1,2, phóng từ đáy) không chạm thẻ trên; thẻ cao ~33 px (~35 ở `--ui` 1,2), nên khoảng là 44–46 px thay vì 40. Thẻ đang khóa nổi lớp trên.
- **Dự trữ 3 chữ ở cấp từ vựng ≤ 3** gần như không bao giờ chạm khi chơi thường: chữ hiếm (u, y, i bắt đầu 1–2 từ của dải 3–5) luôn trống, nên số chữ trống không xuống dưới 4; tầng 2 sớm (≤ 5 chữ trống) là cơ chế làm việc ở đó. Test `td-letters` dùng một loại giả ưu tiên cao giữ chữ tới đúng mức dự trữ để kiểm luật ở mọi cấp.
- **Từ dự phòng:** máy chủ không phục vụ `/vocabulary/` (Vite thường ở 127.0.0.1) thì trang dùng 129 từ thông dụng cấp 1–3 có sẵn, HUD ghi "Từ dự phòng", `__td.flags().vocabulary = "fallback"`. Chạy lại trên Node dựng đúng bộ từ trang đã dùng.

### 1.4 Sau 1A.3

| Nhóm | Sau sửa review 1A.2 | Sau 1A.3 | Đổi | Sau sửa review 1A.3 (mục 1.6) |
|---|---|---|---|---|
| Trang, Platform | 87 | 87 | 0 | 87 |
| Nội dung | 571 | 572 | +1 (`hero` đã biên dịch) | 572 |
| Gõ thuần | 453 | 453 | 0 | 453 |
| Sim lõi (`sim/*.ts`) | 774 | 786 | +12 | 786 |
| Kho | 331 | 367 | +36 (`agents`) | 367 |
| Đường (`nav/`) | 108 | 215 | +107 (`astar`) | 233 (+14 `nearestOpen`, +4 `grid`) |
| Hệ chiến đấu | 585 | 585 | 0 | 585 |
| Hệ gõ (gồm `agents` theo BUILD_NOW §2) | 629 | 774 | +145 (`agents` 174, `stream` −29) | 778 (+4 `agents`) |
| App | 330 | 330 | 0 (`state()` dựng bằng `live().map`, thêm người) | 330 |
| View, UI | 714 | 750 | +36 | 769 (+17 `debug-2d`, +2 `cards`) |
| **Tổng** | **4.582** | **4.919** | **+337 / 340** | **4.960 (+41)** |

Bản đầu của 1A.3 dài 5.013 dòng (vượt 91 trước khi có phần vẽ). Để vừa phần 340 dòng, không cắt luật nào của TK 25.9 và BUILD_NOW §3.4; đã đổi:

- Kiểm tầm nhìn (kéo dây) lấy mẫu dưới 1 m một bước và cho mỗi bước qua `grid.open` (qua góc thì hai ô bên cũng phải trống), thay cho duyệt ô chính xác: vẫn không bao giờ cắt ô chặn hay góc chặn (test `td-nav` dò từng đoạn bằng bước 5 mm).
- A* tìm từ đích về người đi, nên đọc cha từ người đi ra đúng thứ tự đi, không cần đảo mảng.
- Đặt nhà thì mọi Thư Đồng đang đi tìm đường lại (TK: chỉ người bị cắt). Cùng kết quả cho người bị cắt; người không bị cắt có thể đổi sang đường dài bằng. Một lần A* ≤ 0,13 ms (trung vị).
- Đường chỉ tính khi ra lệnh (bước 1), không có cờ "tìm lại ở bước 3".
- `move` (Tướng tới một điểm) dời sang 1A.4 cùng chuột phải vào đất: BUILD_NOW §4 ghi là lệnh 1A, nhưng mục 1A.3 ở §1 không có. Đã tính vào phần của 1A.4 (mục 1.2).
- Đốm sáng chạy dọc dây trợ lực mỗi phím đúng (BUILD_NOW §5.1) chưa vẽ: cần view đọc sự kiện phím (`wordKey`). Làm ở 1A.4, đã tính vào phần của mốc đó (mục 1.2).
- Bỏ `KEEP_SLOT` không ai dùng; `stream.ts` mất phần người có mặt ngay (−29).

Sau 1A.3 còn 3 dòng tới cột "Cộng dồn tối đa" của mốc, cho bản sửa review. Bản sửa review 1A.3 tốn 41 dòng (mục 1.6), viết thẳng, không nén dòng; review 1A.3 (mục 5) yêu cầu tính phần này vào ước lượng lại 1A.4, nên phần vượt lấy từ 38 dòng dự phòng dưới trần, và 1A.4 cắt UI như bảng ở mục 1.2.

### 1.5 Lệch so với BUILD_NOW, TK ở 1A.3 (có lý do)

- **Chỗ đứng trợ lực:** Thư Đồng ở ổ (mép vòng + 1 m, phía Lũy); Draconis đậu trên mép mái phía Lũy (đúng bán kính nhà); bản vẽ đặt hình tam giác ra ngoài mép 1 m khi đậu hay bay thấp, để không che chữ cái và vạch cấp (review 1A.3, mục 4). Lũy tự nó không có "phía Lũy": ổ của Lũy quay về nam (đất trống, xa đường).
- **Vào và ra việc đo từ chỗ đứng:** vào khi đứng trên đất trong 3,0 m (Draconis: sau khi hạ cánh xong); ra khi xa quá 4,5 m, hoặc khi người đã được gửi đi nơi khác dừng lại. Chỗ nghỉ có thể nằm trong 4,5 m của chỗ trợ lực (Draconis nghỉ đúng chỗ trợ lực Lũy; nhà đặt sát hàng nghỉ của Thư Đồng): chỉ đo 4,5 m thì gọi về không bao giờ ngắt, Draconis không đánh nữa, và hạ cấp Lũy để lại hai nhà được trợ lực với một ô (review 1A.3, mục 2). TK 8.4 đo "từ mép vòng", TK 25.9 và BUILD_NOW §3.4 đo "của ổ": theo ổ. Có trễ giữa 3,0 và 4,5 m: người được gửi đi vẫn trợ lực tới khi xa 4,5 m (Draconis: 0,6 s cất cánh + 0,75 s bay); tới nhà mới trước thì nhà cũ ngắt trước.
- **Nghỉ ở đâu:** Thư Đồng đứng một hàng cách Lũy 5,5 m về phía tây, cách nhau 2,4 m (TK 23.7 "đứng cạnh Lũy"; `ASSIST.homeSideM`, `homeGapM`). Draconis nghỉ ở chỗ đứng trợ lực Lũy (mép mái nam), nên gửi tới Lũy từ chỗ nghỉ không phải bay.
- **Đổi chỗ khi người gửi đi không có nhà:** người bị thay về chỗ nghỉ.
- **Lệnh mới lúc đang hạ cánh:** cất cánh lại (0,6 s). Lúc đang cất cánh hay đang bay: đổi đích trên không.
- **Tướng tự đánh:** chỉ khi đứng trên đất và không trợ lực (không đánh lúc cất, bay, hạ); cầu lửa vào quái đi xa nhất trong 9 m, không nhận hào quang. Quái không đánh Draconis (1A).
- **Thư Đồng bị nhà mới đè lên** (đang đi qua đúng chỗ đặt): bước sang tâm ô trống gần nhất (trong 6 ô, hòa thì ô có chỉ số nhỏ hơn) mà từ đó còn đi tới được đích, không bao giờ vào nước hay nhà khác; không ô nào tới được thì ô trống gần nhất. Bản đầu 1A.3 lùi theo bán kính tới r + 0,75 m, nên người cạnh suối bị đẩy vào ô nước và kẹt tới hết ván (review 1A.3, mục 1). A* cũng nhận ô xuất phát bị chặn: người đứng trên ô chặn vẫn đi ra được khi được gửi. TK 12.5 không có bước kiểm người đứng.
- **Hoàn tác nhà đang được trợ lực:** dây trợ lực ngắt ngay (nhà mất), người được gửi tới đó về chỗ nghỉ; đường tính sau khi ô của nhà đã mở.
- **Hạ cấp Lũy trong hộp cát:** người ở ô đã đóng về chỗ nghỉ; trợ lực ngắt khi xa 4,5 m hoặc khi người dừng ở chỗ nghỉ, như mọi lần rời. Lệnh cho ô đóng bị từ chối (`noSlot`). Thư Đồng ở ô đóng không vẽ khi đứng ở chỗ nghỉ (TK 23.7: mở ô thì "Thư Đồng chạy ra").
- **Ô trên suối:** ô bị chặn khi có phần nước vẽ không nằm trọn trên một cầu (xét cả ô, không chỉ tâm ô). Cầu vẽ rộng 3 m (z 24,5–27,5), nên phần đi được là 2 m giữa (z 25–27); ô bờ nửa trên cầu vẫn mở. Người đi không bao giờ bước lên nước vẽ (review 1A.3, mục 3).
- **Dây trợ lực** dừng ở 0,3 r bên trong mép nhà, không tới tâm như BUILD_NOW §5.1: dây tới tâm cắt ngang chữ cái và vạch cấp (review 1A.3, mục 4).
- **Thẻ của từ cũ trong cặp tầng 2** cũng gạch chân hai chữ đầu: bộ định tuyến cần hai phím cho cả hai từ của cặp (TK 6.5 "Thẻ gạch chân hai chữ đầu"). Chỉ đổi ở view; `W.tier` vẫn là tầng lúc phát. Thấy khi làm kịch bản tầng 2 (review 1A.3, mục 7).
- **Cột thẻ bay qua nhà bên cạnh:** hai nhà gần nhau (bố cục "Đặt sẵn 4 ô": Trại Lính cách Tháp Pháo 7 m) thì cột thẻ của nhà dưới bay lên qua đĩa nhà trên. TK 23.4 cho thẻ bay lên từ mái nhà mình làm đồng hồ, bộ xếp làn chỉ tách thẻ với thẻ và với HUD; giữ nguyên ở 1A (phần này của review 1A.3, mục 4 không sửa).
- **Sự kiện:** `agentOrdered`, `agentArrived`, `agentLeft` (TK 25.11) thay sự kiện `assist` của 1A.2.
- **Test 1A.2 đổi theo:** `assisted()` chờ mọi người tới nơi; `td-letters` cài `Letters` riêng trước từ đầu tiên (Lũy phát trong lúc Thư Đồng còn đi) và nhận các từ đang sống lúc bắt đầu; `td-sim-perf`, `td-aura`, `td-heat-chain` chờ người tới trước khi đo.

### 1.6 Sửa review 1A.3

Bản sửa đầu bị ngắt trước khi commit. Bản này giữ phần đúng của nó (luật, test, pha tầng 2), viết lại thẳng những chỗ nó nén dòng chỉ để vừa 3 dòng còn lại (gán qua mảng, nối lệnh vẽ sau `Object.assign`), rồi làm nốt phần còn thiếu. 41 dòng, tính ở mục 1.2.

1. **Thư Đồng bị đẩy vào nước khi nhà mới đè lên (cao).** `rerouteAgents` đưa người bị đè sang tâm ô trống gần nhất còn đi tới được đích (`nearestOpen` ở `nav/astar.ts`); `findPath` nhận ô xuất phát bị chặn (`grid.open(…, pass)`). Test `td-nav`: lúc Gạch đi tới cầu nam (10 thời điểm cách nhau 10 tick), Tháp Cung đặt đè lên Gạch ở mọi chỗ hợp lệ cách nhau 0,5 m, 361 lần, có 13 lần cách cũ đẩy vào ô nước: Gạch luôn tới mỏ; ô trống gần nhất bị vây kín thì bỏ qua; người đứng trên ô nước được gửi lại thì đi ra. Dò lại của review: probe-d tới mỏ; probe-g 875 chỗ đặt, không ai kẹt (15 chỗ chặn lối ra cầu nam, Gạch đi vòng cầu bắc, tới chậm hơn ≤ 3,5 s).
2. **Trợ lực không ngắt khi chỗ nghỉ trong 4,5 m (vừa).** Ngắt khi người không còn được gửi tới nhà đó và đã dừng, hoặc xa quá 4,5 m (mục 1.5). Test `td-agents`: Phẩy ở Tháp Cung (−13; 40) được gọi về chỗ nghỉ cách ổ đúng 4,5 m thì ngắt khi dừng, nhà thôi phát và hết có mặt; hạ Lũy về cấp 2 cũng vậy; Draconis trợ lực Lũy được gọi về thì ngắt ngay trong tick đó và lại ném cầu lửa. probe-a, probe-b, probe-e: hết lỗi.
3. **Đường đi cắt góc cầu qua nước vẽ (thấp).** Xét cả ô (mục 1.5). Test `td-nav` đo mọi đoạn đã kéo dây với nước và cầu như được vẽ, mẫu 2 cm: 150 đường trên sân có nhà, 400 đường ngẫu nhiên qua suối. probe-f: 1.238 đường, không đoạn nào trên nước vẽ.
4. **Dây trợ lực đè chữ cái, Draconis che vạch cấp (thấp).** Dây dừng ở 0,3 r trong mép; Draconis vẽ ra ngoài mép 1 m khi đậu hay bay thấp. Thẻ bay qua đĩa nhà bên cạnh: không sửa, lý do ở mục 1.5.
5. **Ước lượng 1A.4 chưa tính `move`, đốm sáng, bản sửa review (thấp).** Ước lượng lại ở mục 1.2: cần 535, phần 500, cắt 35 dòng UI theo BUILD_NOW §10, ghi trước khi làm 1A.4.
6. **Test bỏ sót (thấp).** Test mới: mỏ có người tới lại trong 5 s sau lần gom thì đống về kho ngay lúc tới, rồi mỗi 5 s; Tướng không bắn lúc cất cánh, bay, hạ cánh; `clearLine` gặp tường dày 1 ô ở 400 độ dài, độ dốc, vị trí; A* so với A* mẫu trên 300 sân (240 sân dày, nơi các đường bằng chi phí gặp nhau); cùng các test của mục 1–3. Đột biến (bản sao worktree, 12 file test TD): 36 đột biến, 30 của review và 6 cho bản sửa, cả 36 bị bắt, gồm 4 đột biến sống của review. Đột biến "hòa về ô lớn hơn" làm A* lặp mãi nên bị bắt bằng cách treo. Giới hạn 0,5 ms một lần A* (TK 25.12) vẫn chặn theo trung vị: chạy riêng `td-nav`, trung vị 0,14 ms, p95 0,48–0,50 ms; chạy cả bộ, p95 1,6–2,3 ms là do các luồng Vitest khác chiếm CPU, không phải do A*, nên chặn p95 chỉ làm test chập chờn.
7. **Chưa kịch bản nào thấy cặp tầng 2 (thấp).** `td-1a-slots` thêm pha tầng 2 và cổng `tier2PairOnScreen` (mục 2). Khi nhìn cặp, thẻ của từ cũ chỉ gạch một chữ: sửa ở view (mục 1.5).

### 1.7 Sau 1A.4

| Nhóm | Sau sửa review 1A.3 | Sau 1A.4 | Đổi |
|---|---|---|---|
| Trang, Platform | 87 | 87 | 0 (`td.html`: lớp HUD dưới lớp thẻ, dòng "đang tải") |
| Nội dung | 572 | 576 | +4 (`preset` của bản đồ) |
| Gõ thuần | 453 | 453 | 0 |
| Sim lõi (`sim/*.ts`) | 786 | 824 | +38 (`move`, op `preset`, `freeSpots`, `canPlace(…, free)`) |
| Kho, Đường, Hệ chiến đấu | 1.185 | 1.185 | 0 |
| Hệ gõ (gồm `agents`) | 778 | 786 | +8 (`moveAgent`) |
| App | 330 | 521 | +191 (`selection` 156, `input` +38, `sandbox` 28, `main` +12, `dev-handle` −43) |
| View, UI | 769 | 1.027 | +258 (`hud` 79, `build-menu` 48, `team-bar` 36, `td.css` +51, `debug-2d` +42, `cards` +2) |
| **Tổng** | **4.960** | **5.459** | **+499 / 500** |

`dev-handle.ts` thôi khai lại từng trường của `window.__td` (kiểu `TdState`, `TdWord`, `TdDevHandle`): `main.ts` dựng đối tượng đó, nên kiểu là cái `main.ts` trả về (cùng cách 1A.2 suy kiểu đã biên dịch từ hàm biên dịch). Ghi chú cần cho kịch bản (đơn vị tick, `mode`, `path`) nằm cạnh chỗ dựng.

### 1.8 Cắt UI ở 1A.4 (BUILD_NOW §10)

Bản đầu làm đủ mục 5.3–5.4 dài 822 dòng, vượt phần 500. Theo luật ở 1.2 (bù trong mốc, cắt UI trước, không cắt luật, test), ngoài hai cắt đã ghi trước (kéo chân dung, Shift + phải, lăn chuột trên huy hiệu nhịp) đã cắt thêm, theo thứ tự ít giá trị trước:

1. **Chọn điểm tập kết trên thẻ Trại Lính.** Điểm tập kết vẫn tự đặt ở chỗ gần đường nhất khi xây (1A.1); lệnh `rally` vẫn có trong sim.
2. **Nút "Giảm tải" trên chip Tải.** Chip vẫn đổi màu theo ngưỡng; rê chuột thấy danh sách nhà và nhịp (`title`).
3. **Rê chuột để chọn nhà cho `−` / `=`.** Phím nhịp tác động lên nhà đang mở thẻ (Tab hoặc bấm trái).
4. **Bấm trái lên người trên bản đồ để chọn.** Chọn bằng chân dung, `Digit1`–`Digit4`, `Backquote`.
5. **"Mỗi từ: ~N" trên thẻ nhà.** `rewardValue` vẫn là hàm thuần dùng chung với phần thưởng.
6. **ETA (giây) và dòng trạng thái của người đang chọn.** Huy hiệu trên chân dung vẫn cho biết nhà người đó trợ lực (viền liền) hay đang đi tới (viền nét đứt); dòng trên thanh còn tên người đang chọn.

Không cắt: bàn phím đủ đường, chuột (chọn nhà, xây, gửi, `move`, zoom, kéo), menu xây có nhà mờ đỏ kèm lý do, thẻ nhà có núm nhịp, gửi, hoàn tác, cấp hộp cát, gợi ý nhịp; thanh 4 chân dung; chip Tải; Chuỗi và bậc; Dải Chữ gọn; ân hạn ra lệnh; bảng hộp cát đủ mục; `move`; đốm sáng dọc dây; Dừng tất cả, tạm dừng, tắt tiếng.

Cách làm rẻ hơn, giữ chức năng: E đổi bằng nút −5 / −1 / +1 / +5 thay thanh kéo (không phải giữ và trả tiêu điểm); thẻ chữ nằm trên lớp HUD thay vì bị đẩy ngang ra khỏi bảng (mục 1.9); đốm sáng là một đốm theo phần đã gõ thay vì một đốm mỗi phím (mục 1.9).

Có dòng trống thì trả lại theo thứ tự: 6, 5, 3, 4, 2, 1.

### 1.9 Lệch so với BUILD_NOW, TK ở 1A.4 (có lý do)

- **Vòng menu nhà thành thẻ cố định** ở góc dưới phải, trên nút Xây (BUILD_NOW §10 "vòng menu thành thanh đơn giản"; mục 1.2). Menu xây dùng chung chỗ đó. `ui/ring-menu.ts` và `ui/tempo-control.ts` của BUILD_NOW §2 gộp vào `ui/build-menu.ts`: núm nhịp chỉ là một hàng nút trên thẻ. Nhà đang mở thẻ có vòng xanh ngọc trên bản đồ.
- **Cột thẻ tách ngay, về chậm** (TK 23.4 "lò xo 150 ms"): cột phải tránh nhau thì nhảy ngay tới chỗ mới, chỉ lúc về gần nhà mình mới đi theo lò xo 150 ms; đi dần về một chỗ không chồng thì không bao giờ chồng. Thẻ đang khóa được tính cỡ lúc gõ (×1,2, lệch phải 18 px) ngay từ chữ đầu, nên cột bên cạnh tránh trước khi thẻ lớn lên. Trước đó `td-1a-slots` ở 1920 × 1080 bắt được thẻ chồng 3 lần trong 3 lần chạy, lúc hai cột đang trượt hoặc thẻ đang gõ lấn sang cột bên phải (1A.4 cho bản đồ nhỏ đi 7 % để chừa Dải Chữ, nhà gần nhau hơn trên màn hình).
- **Thẻ chữ nằm trên HUD** (TK 23.4 kẹp thẻ trong vùng an toàn trừ HUD). Ở 16 : 9, HUD nằm ở lề hai bên bản đồ và dải dưới, nên ở zoom 1 thẻ hầu như không chạm HUD; khi zoom thì thẻ đè lên bảng chứ không bị bảng che, lớp thẻ cho mọi cú bấm đi qua. Bản đầu đẩy cột ngang ra khỏi bảng tốn 18 dòng. Từ review 1A.4, `td-1a-slots` và `td-1a-words-dense` đo mỗi lần nhìn phần thẻ nằm trên từng bảng HUD (mọi `.td-panel`, không chỉ bảng trạng thái) và in ra `cardsOverHud`; ở zoom 1 cổng `cardsClearOfHudPanels` đòi không thẻ nào chạm bảng. Khi zoom hay khi làn bị đẩy ngang, thẻ vẫn có thể đè dock hay thanh trợ lực: chưa có cổng, kẹp cột tránh bảng để 1C (cùng `td-hud-budget`).
- **Đốm sáng dọc dây trợ lực** (TK 23.7 "mỗi phím đúng một đốm sáng") vẽ một đốm ở vị trí bằng phần đã gõ của từ đang khóa: mỗi phím đúng đẩy đốm tới, tới nhà khi từ xong. Bản đọc sự kiện `wordKey` từng phím tốn 19 dòng.
- **Bản đồ vừa khung trên dải 60 px** (×`--hud`) dành cho Dải Chữ, để Dải Chữ không che Lũy ở giữa dưới. Zoom 1–2,5× quanh điểm dưới con trỏ, kéo trái hoặc giữa, mũi tên 60 px; tâm sân không ra quá nửa cỡ sân khỏi giữa. Đổi cỡ cửa sổ thì camera về zoom 1.
- **Chỗ trống gợi ý** (sim thuần): `spotCandidates` lấy từ bản đồ ứng viên của một loại nhà (mỏ: các node; nhà khác: điểm lưới 2 m trong 2 m ngoài khoảng cách đường, gần khúc cua nhất trước); `nextSpot` đi từ chỗ đang chọn theo chiều Tab và trả chỗ đầu tiên `canPlace` cho (không xét vàng). BUILD_NOW §5.4 nói "sim tính sẵn danh sách … lọc bằng `canPlace`": danh sách ứng viên tính sẵn, phần lọc chạy tới đâu lọc tới đó. Bản đầu 1A.4 (`freeSpots`) lọc cả ~500 ứng viên mỗi lần bấm Insert hay số, mỗi ứng viên qua đường một lần BFS: 41 ms trên sân trống, 56 ms sau "Đặt sẵn 4 ô", tức một khung treo 3 khung trở lên (review 1A.4, mục 3).
- **"Đặt sẵn 4 ô" là op hộp cát trong sim** (`sandbox: preset`), bố cục là dữ liệu bản đồ (`map.preset`, như kịch bản `td-1a-slots`): Lũy cấp 4, bốn nhà đặt miễn phí (hoàn tác trả 0), mỗi nhà một người. Một lệnh, chạy lại khớp. Bấm lần hai không đổi gì (chỗ đã có nhà).
- **`move`:** Tướng bay tới mọi ô trong sân; Thư Đồng cần ô trống (không nước, không nhà), ngoài sân hay ô chặn bị từ chối `blocked`. Người được `move` không trợ lực ai (đã có từ 1A.3: ra quá 4,5 m hoặc dừng thì ngắt).
- **Esc bước 4 bật / tắt tạm dừng** (1A chưa có menu dừng). Tạm dừng thì phím chữ không gửi đi và thẻ mờ 6 px (TK 23.4); lệnh khác vẫn xếp hàng, chạy khi chơi tiếp.
- **Tab** xếp nhà theo khoảng cách tới người đang chọn (1A chưa có tín hiệu cần giúp, TK 8.9), gồm cả Lũy.
- **Ân hạn ra lệnh** (TK 6.14, BUILD_NOW §4 "mở bởi menu xây, vòng menu nhà, kéo chân dung"): bật khi menu xây mở (Insert, nút Xây, bấm đất) và khi thẻ nhà mở bằng bấm chuột. Tab chỉ tô nhà và hiện thẻ (TK 8.3), không xin ân hạn; bấm chuột lên bản đồ sau Tab thì thẻ đang mở được ân hạn (tay đã rời phím), Tab sau đó thì thôi. Bản đầu 1A.4 cho cả Tab xin ân hạn: cứ 5 s có 2 s miễn phạt bằng một phím, chạm Tab ngay trước khi một từ tan là từ đó không mất Nhiệt, Chuỗi (review 1A.4, mục 2). Menu xây mở bằng Insert vẫn có ân hạn: TK 6.14 kể "menu xây" không phân biệt cách mở, và lúc chọn chỗ thì mắt ở bản đồ chứ không ở thẻ chữ; hồi 3 s chặn lặp. Chủ dự án muốn Insert cũng không có ân hạn thì chỉ cần đổi điều kiện ở `Selection.update`. Trần 2 s và hồi 3 s vẫn ở sim.
- **Delete hoàn tác** nhà đang mở thẻ, bấm một lần (TK 8.3: Delete hai lần để bán). 1A chỉ có hoàn tác trong 5 s, trả đủ tiền, nên bấm nhầm không mất gì; bán có giá (1B) sẽ đòi bấm hai lần. Lũy và lúc không mở thẻ thì Delete không làm gì. Nút "Hoàn tác" trên thẻ ghi phím `Del`.
- **Phím Insert:** bàn phím Mac và nhiều laptop gọn không có Insert, mà 1A chưa có đổi phím (TK 8.3 "mọi phím đổi được"). Tự quyết (22/10, đổi được): thêm `Backslash` (`\`) làm phím dự phòng cho Insert. Phím này không dùng để gõ và nằm cạnh Return trên bàn phím Mac. Trên Mac, PageUp là Fn + ↑ và Delete là Fn + Delete. Thêm vào cùng dòng của `KEY_ACTIONS`, không tốn dòng ngân sách.
- **Chip lý do** (TK 12.5): nhà mờ ở chỗ không đặt được có vòng đỏ, lý do nằm trên chip giấy viền mực ngay dưới nhà mờ (bản đầu là chữ mực không nền, đè lên nhãn và đèn lồng của Lũy). Mọi lý do sim có thể trả (`canPlace` và lệnh) đều có câu tiếng Việt; test `td-hud` đọc mã nguồn sim để giữ đủ.
- **"Đợt n/N"**: quá đợt cuối của danh sách (đợt vô tận của hộp cát) thì chỉ ghi "Đợt n".
- **Kiểu nút HUD khi rê chuột và khi tắt** nằm trọn trong `:where(…)` (độ ưu tiên 0), đúng ý chú thích CSS "lớp của thành phần thắng": trước đó `:hover` ngoài `:where` làm nút gọi đợt mất nền xanh ngọc (chữ trắng trên nền hổ phách nhạt, thấy ở ảnh `td-1a-combat` khi chuột còn trên nút) và chân dung mất màu khi rê.
- **Phím đọc theo `event.code`, chữ cái theo `event.key`** (`typedLetter`, như 1A.2): bàn phím khác kiểu (AZERTY) vẫn gõ đúng chữ, và chữ cái không bao giờ thành lệnh. Mũi tên được giữ lặp (camera chạy tiếp); mọi phím khác giữ lặp bị bỏ.
- **Hai lần bấm trong cùng một khung** (dưới 16 ms) đọc trạng thái trước tick: `−` hai lần liền chỉ lùi một nấc. Người bấm tay không chạm; test bấm từng khung.
- **Nút HUD chạy khi nhấn xuống** (`pointerdown`, không lấy tiêu điểm): HUD viết lại khi đổi, nên `click` có thể rơi vào nút vừa thay; Enter và Space vẫn là của game.

### 1.10 Sửa review 1A.4

| Nhóm | Sau 1A.4 | Sau sửa review 1A.4 | Đổi |
|---|---|---|---|
| Trang, Platform | 87 | 87 | 0 |
| Nội dung | 576 | 573 | −3 (`FLIGHT` không file nào đọc) |
| Gõ thuần | 453 | 453 | 0 |
| Sim lõi (`sim/*.ts`) | 824 | 831 | +7 (`spotCandidates` + `nextSpot` thay `freeSpots`) |
| Kho, Đường, Hệ chiến đấu | 1.185 | 1.188 | +3 (`earlyCallBonus`) |
| Hệ gõ (gồm `agents`) | 786 | 786 | 0 |
| App | 521 | 525 | +4 (`selection` +5: cờ bấm chuột, `nextSpot`, Delete không chạm Lũy; `input` −1) |
| View, UI | 1.027 | 1.013 | −14 (`hud` +3, chip lý do +8, gộp chỗ trùng ở `debug-2d` −21, `cards` −3, `audio-min` −1) |
| **Tổng** | **5.459** | **5.456** | **−3** (cột "Cộng dồn tối đa" của 1A.4: 5.460) |

Các bản sửa cần 26 dòng; phần của 1A.4 chỉ còn 1. Bù trong mốc (mục 1.2) bằng chỗ trùng thật và mã chết, không cắt luật, test hay việc UI nào, không nén dòng:

- `debug-2d`: một hàm `shape` vẽ Draconis và cờ tập kết (hai khối dịch, tô, viền, dịch lại giống nhau; cờ nay có viền mực như mọi hình khác); tên và mũi nỏ đi qua `polyline` (thêm tham số độ dày) thay khối vẽ đường riêng; ván cầu vẽ một đường cho cả cầu (một lần `stroke` thay một lần mỗi ván); vòng cấm xây quanh Lũy là `disc`; vòng tầm không cần biến tạm; node đã có mỏ đọc `live(1)`.
- `cards`: tạo phần tử bằng `Object.assign` như `hud`. `input`: một hàm nghe lăn chuột. `audio-min`: `new GainNode(ctx, { gain })`.
- `rules`: bỏ `FLIGHT` (bay thấp ≤ 3,5 m, TK 10.4). Không file nào đọc: độ cao của quái là loại (đất, thấp, cao), không phải mét. 1C cần độ cao vẽ thì thêm lại cùng chỗ dùng.

1. **Nút gọi sớm hứa nhiều hơn số trả (vừa).** HUD tính `min(30, ⌈giây còn⌉)`, sim trả `min(30, ⌊giây còn⌋)`: lệch 1 Vàng gần như mọi lúc. Nay một hàm thuần `earlyCallBonus` ở `waves.ts` cho cả `callWave` lẫn nút; `⌈ ⌉` chỉ còn ở số giây đếm ngược. Lệnh bấm lúc HUD đang hiện được đóng dấu đúng tick HUD đọc (`Session.tick`), nên số trên nút là số trả. Test `td-hud`: 7 tick của lượt đếm (0, 1, 31, 59, 60, 61, 1799 tick sau khi bắt đầu đếm; 29,48 s còn lại ghi "30 s · +29"), số trên nút bằng `bonus` của sự kiện `waveCalled`.
2. **Tab là tấm khiên miễn phạt (vừa).** Sửa như mục 1.9 "Ân hạn ra lệnh": cờ `clicked` trong `Selection`, Tab xóa, bấm bản đồ đặt. Test: thẻ mở bằng Tab không có ân hạn, bấm chuột lên Lũy thì có, Tab sau đó thì hết; một từ tan ngay sau Tab mất Chuỗi −2 và Nhiệt −1, sau khi thẻ mở bằng bấm thì không mất gì.
3. **Chỗ trống gợi ý 41–56 ms mỗi lần bấm (thấp).** Sửa như mục 1.9 "Chỗ trống gợi ý". Đo trên Node, sau "Đặt sẵn 4 ô": bấm Insert ≈ 3 ms (2,5 ms dựng ~490 ứng viên từ bản đồ, ≈ 0,5 ms tìm chỗ đầu: 87 ứng viên bị loại ở bước rẻ, một lần BFS), Tab ≈ 0,5 ms. Test: mỗi lần bấm Insert, Tab, Shift+Tab, số (11 lần, sau "Đặt sẵn 4 ô") chạy tối đa 3 lần BFS lối đi (bản cũ: ~120 lần một lần bấm); Tab hai chiều đi qua đúng các chỗ `canPlace` cho, theo thứ tự khúc cua.
4. **Lý do không nền, thiếu câu (thấp).** Chip giấy viền mực (mục 1.9); `REASON` thêm `noBuilding`, `noBarracks`, `badValue`, `noSandbox`, `badKey`. Test `td-hud` đọc các chuỗi `commands.ts` và `typeKey` trả về cùng `PLACE_CHECKS`, đòi mỗi lý do có câu.
5. **Test còn lỗ (thấp).** Thêm: Tab sau khi dời Draconis tới (24; −14) đi Pháo, Cung rồi Lũy (theo người, không theo Lũy); bấm phải khi menu xây mở chỉ đóng menu; Draconis `move` tới ô nước và lên mái Tháp Cung được nhận; Delete; nút gọi sớm; chip Tải ở 95, 100, 105, 125, 133 % (xanh ngọc tới 100, hổ phách tới 125, cam sau đó; Bastion nhịp 4 s, từ 4 chữ, E 21 / 20 / 19 / 16 / 15 ở Dễ); "Đợt n/N". Đột biến tại chỗ (mỗi lần một đột biến, chạy `td-input` và `td-hud`, rồi trả file): 15 đột biến, cả 15 bị bắt, gồm ba đột biến sống của review: (a) Tab xếp theo khoảng cách tới Lũy, (b) bấm phải trong menu xây lại xây, (c) từ chối `move` của Tướng lên nước hay lên nhà; và nút gọi sớm dùng `⌈ ⌉`, Tab xin ân hạn, bấm chuột không xin ân hạn, Tab không bỏ ân hạn, ngưỡng chip Tải `<` thay `≤` (hai đột biến), thiếu câu lý do, "Đợt 7/6", lọc hết chỗ trống mỗi lần bấm, Tab đi qua chỗ không hợp lệ, bỏ phím Delete, Delete trên Lũy.
6. **Thiếu bằng chứng chuột trên trình duyệt (thấp).** `td-1a-combat` dựng bố cục và ra lệnh bằng chuột thật (mục 2), có ảnh menu xây, nhà mờ đỏ có chip, thẻ nhà, bản đồ đã zoom.
7. **Cổng vùng an toàn chỉ nhìn bảng trạng thái (thấp).** `td-1a-slots` và `td-1a-words-dense` đo mọi bảng HUD (mục 1.9 "Thẻ chữ nằm trên HUD", mục 2): ở cả hai cỡ, mọi lần nhìn (549 và 482 lần ở `td-1a-slots`, 92 và 93 lần ở `td-1a-words-dense`, 1280 × 720 và 1920 × 1080) không thẻ nào chạm bảng nào (`cardsOverHud` rỗng), nên ở zoom 1 đây là cổng `cardsClearOfHudPanels`, không chỉ là số in ra. Kẹp cột thẻ tránh bảng khi zoom để 1C (mục 1.9).
8. **HUD vượt luật cứng TK 23.5 (thấp).** Không phải cổng của 1A (`td-hud-budget` thuộc 1C): ghi thành lệch đã biết cho 1C. Đo lại trên Chrome sau bản sửa: ở 1280 × 720, trong đợt, có từ đang khóa, các bảng phủ 9,4 % màn hình nếu không tính bảng hộp cát, 17,5 % nếu tính; mở thẻ nhà: 13,6 % và 21,7 %; pha chuẩn bị (bảng trạng thái có nút bắt đầu): 10,5 % và 18,6 %. Thanh trợ lực 284 × 110 px, bằng 15,2 % chiều cao (TK: ≤ 10 %, 260 × 64). Ở 1920 × 1080: 5,7 % và 10,5 % (trong đợt), 8,1 % và 13,0 % (mở thẻ); thanh trợ lực 341 × 124 px, 11,5 % chiều cao. Chữ của từ đang khóa ở Dải Chữ nay `clamp(28px, 2.2em, 34px)`: 28,6 px ở 1280 × 720, 34 px ở 1920 × 1080 (TK 23.4: 28–34 px; trước là 24,7 px). Thu gọn thanh trợ lực (TK: 260 × 64, chân dung 44 px, một hàng) và bảng trạng thái để đạt 10 % là việc của 1C, cùng skin HUD.
9. **"Đợt 7/6" (thấp).** Sửa như mục 1.9.
10. **Bàn phím chưa đủ đường (thấp).** Delete hoàn tác (mục 1.9). Thiếu phím Insert trên Mac và laptop gọn: ghi cho chủ dự án ở mục 1.9, chưa thêm phím dự phòng.

Thấy thêm khi nhìn ảnh: kiểu rê chuột của nút HUD làm nút gọi đợt mất màu (mục 1.9, sửa trong CSS, 0 dòng).

### 1.11 Sau 1A.5

| Nhóm | Sau sửa review 1A.4 | Sau 1A.5 | Đổi |
|---|---|---|---|
| Trang, Platform | 87 | 87 | 0 |
| Nội dung | 573 | 573 | 0 |
| Gõ thuần | 453 | 453 | 0 |
| Sim lõi (`sim/*.ts`) | 831 | 837 | +6 (`commands.ts`: op hộp cát `flood`) |
| Kho, Đường, Hệ chiến đấu | 1.188 | 1.207 | +19 (`spawn.ts`: `flood`) |
| Hệ gõ (gồm `agents`) | 786 | 786 | 0 |
| App | 525 | 541 | +16 (`main.ts`: đo giá khung, `__td.flood`, `__td.costs`) |
| View, UI | 1.013 | 1.013 | 0 |
| **Tổng** | **5.456** | **5.497** | **+41 / 40** |

Phần của 1A.5 là 40; 1A.4 để dư 4 dòng dưới cột cộng dồn của nó (5.456 / 5.460), nên tổng 5.497 vẫn dưới cột "Cộng dồn tối đa" của 1A.5 (5.500, đúng trần cứng). Không còn dòng dự phòng cho 1A: sửa review 1A.5 phải bù trong chính nó.

Bot, chính sách, báo cáo, test vàng nằm ở `tests/` và `scripts/` (không tính vào ngân sách): `tests/td/{keystrokes,reader,bot,golden,balance,perf}.ts`, `tests/td/policies/{stand,tempo,hero,layouts}.ts`, `tests/td-golden.test.ts`, `tests/td-balance-smoke.test.ts`, `tests/golden/td-1a.json`, `scripts/td/{balance,golden}.ts`, `scripts/visual/scenarios/td-1a-{perf,tour}.mjs`.

### 1.12 Lệch so với BUILD_NOW, TK ở 1A.5 (có lý do)

- **Test vàng đóng băng từ, không đóng băng nội dung.** `tests/golden/td-1a.json` giữ 425 từ cấp 1–3 (chụp từ `shared/vocabulary` lúc làm), seed, mã nội dung, mã bộ từ, mã băm mỗi 60 tick. TK 25.15 nói "nội dung đóng băng `tests/td/fixtures/content-golden.ts`": không làm, vì hằng số `rules.ts` được hệ thống import thẳng (một bản chép `slice-1a.ts` không đóng băng chúng), còn từ vựng chung thì repo cha sinh lại định kỳ ("data: generate trusted vocabulary library") và sẽ làm test vàng đỏ mà repo này không đổi gì. Đổi luật hay số: test báo mã nội dung khác trước tiên, `pnpm td:golden:update` (hay `node --import tsx scripts/td/golden.ts`) làm lại file và in tick đầu tiên mã băm lệch.
- **Bot của test vàng** là bot Cân bằng 35 WPM, 95 % chơi 3 đợt; thêm một Tháp Cung đặt rồi hoàn tác ở giây 4–5, để nhật ký có cả `sell`. Test đòi nhật ký có `build`, `sell`, `assignUnit`, `setTempo`, `key`, `backspace`, `callWave`, `sandbox`.
- **Op hộp cát `flood`** (TK 25.12 "Thử tải `__td.flood(400)`"; BUILD_NOW §4 không kể): n quái ba loại lần lượt, rải đều trên nửa đầu mỗi làn (quái bay trên đường bay), lệch ngang theo tỉ lệ vàng (không rút số ngẫu nhiên), tính vào đợt đang chạy. Là lệnh có tick, vào nhật ký, Node chạy lại khớp. Đây là móc đo của 1A.5: kịch bản `td-1a-perf` dùng nó cho cổng 5.
- **`__td.costs()`**: giá 600 khung gần nhất, tính bằng ms, của phần cập nhật (bước sim, HUD, âm) và phần vẽ (bản 2D và thẻ chữ). Đo ngay trong vòng khung của trang, không phải trang đo riêng.
- **Hai kịch bản ngoài bảy kịch bản của BUILD_NOW §6.2:** `td-1a-perf.mjs` (cổng 4 và 5, mục 2) và `td-1a-tour.mjs` (bộ ảnh cho chủ dự án, mục 2).
- **Chỗ của báo cáo:** phần tính và in nằm ở `tests/td/balance.ts`, vì `tsconfig.json` kiểm kiểu `tests/` mà không kiểm `scripts/`; `scripts/td/balance.ts` chỉ đọc tham số và in. `td-sim-perf` chuyển thế giới thử tải sang `tests/td/perf.ts` (báo cáo dùng chung), thêm ca tải đầy của TK 25.12 (640 quái, 64 lính, 512 đạn, 20 nhà; từ bản sửa review 1A.5, mục 1.15) và test op `flood`.
- **Người đọc giả lập** làm đúng BUILD_NOW §6.3 (nhận ra từ mới sau 0,35–0,6 s, mỗi lúc một từ, từ gấp nhất trước, nhà có quái trong tầm được coi như gấp hơn 1 s) và bỏ qua từ không còn kịp gõ. Bot không bao giờ rời mắt khỏi thẻ để nhìn bản đồ, nên tỉ lệ trúng là mức trần: 35 WPM, 95 %, nhịp 3 s trúng 99 % (mô hình TK 6.16: 92 %).
- **Bot vặn nhịp từng nhà một, cách nhau 1,5 s.** Đổi nhịp đặt lại lịch của nhà đó (TK 6.2), nên đổi nhiều nhà trong một tick làm các nhà cùng nhịp phát cùng lúc (cách 0,2 s, TK 6.4): ở 35 WPM, từ thứ hai của mỗi cặp không gõ kịp trong tuổi của nó (bản đầu: 2 ô 35 WPM chỉ trúng 66 %). Game có cùng hiện tượng sau "Trả lại nhịp" (`Shift+=`) hay khi đổi độ khó, cấp làm nhiều nhịp bị kiểm lại một lúc. TK không nói; ghi cho chủ dự án và 1B.
- **Nhịp theo tải** (bot Cân bằng, TK 19.7 "tải 90–110 %") bắt đầu mọi nhà ở Dừng rồi lần lượt dày lên, tháp trước, khi tải còn ≤ 110 %; nhà không vừa nấc nào ở lại Dừng, người ở đó chỉ còn có mặt (TK 6.13 "1 nhà 6 s + có mặt").
- **Thêm hai dòng báo cáo ngoài BUILD_NOW §6.3:** "Tướng ra trận" (TK 19.4: Draconis không trợ lực, đứng ở khúc nhập ném cầu lửa) và nhà L2, để thấy cách nào qua được đợt 4–6 (mục 1.14). Từ bản sửa review 1A.5 thêm dòng "Nhanh ẩu 80 / 85 % và 50 / 96 % cùng nhịp 3 s" ở bảng TK 19.7, chỉ để so với dòng cùng tải của TK (mục 1.15).
- **`pnpm` trong worktree:** `pnpm <script>` chạy kiểm phụ thuộc, kiểm này gọi `pnpm install`, và pnpm từ chối xóa `node_modules` là liên kết tượng trưng (`ERR_PNPM_UNSAFE_MODULES_DIR`). Không có gì bị đổi (đã kiểm `node_modules` của bản checkout chính), nhưng trong worktree hãy gọi thẳng `node --import tsx scripts/td/balance.ts`. Vì vậy cổng 1 (`pnpm check`) chạy từng bước một (mục 1.13).


### 1.13 Cổng cứng BUILD_NOW §7 ở cuối 1A.5

| Cổng | Kết quả |
|---|---|
| 1. `pnpm check` xanh; V4 chạy | Trong worktree `pnpm check` không chạy được thành một lệnh (pnpm gọi `pnpm install`, mục 1.12); chạy từng bước bằng `node` và `npx`, mọi bước exit 0: `vitest run tests`, `prepare-local-art` (không ghi gì), `check-audio-assets`, `check-background-assets`, `check-expansion-v2`, `check-credit-puzzle-art`, `tsc` cả `tsconfig.json` và `tsconfig.server.json`, `vite build` (có `td.html`), `report-bundle-metrics`, `check-ship-art-integrity`, `check-background-art`; xóa `dist/` sau đó. Khói V4 (`defense.mjs`, halo-garden, không đảo): xây 5 tháp, tới đợt 6, 60 khung/giây (p95 16,7 ms), không lỗi console. |
| 2. Test mục 6.1 xanh; `credit-*`, `campaign3d-keys`, `defense-frame-error` không sửa | `npx vitest run`: 408 file, 2.669 test đạt, 1 bỏ qua sau bản sửa review 1A.5 (cuối 1A.5: 2.666; trước 1A.5: 406 file, 2.654; 1A.5 thêm 4 test `td-golden`, 6 test `td-balance-smoke`, 2 test `td-sim-perf`; bản sửa thêm 3 test `td-balance-smoke`). Có đủ file của §6.1 (`td-golden`, `td-balance-smoke` mới ở 1A.5). Sáu file test được bảo vệ không đổi từ `1979389f` (`git diff` rỗng), 38 test xanh; `src/defense`, `src/scene3d`, `src/vfx`, `src/audio` không đổi. |
| 3. Bất biến chữ và tiền | `td-letters` (10.000 tick, 4 ô 1 s, từ vựng thật cấp 1, 1–3, 1–5), `td-stream-schedule` (so le ở 4 nhà × 1 s), `td-sim-economy` (thuộc tính: không chuỗi xây, hoàn tác, cấp hộp cát nào sinh vàng). Thêm ở 1A.5: mọi lượt bot (test vàng, ba bot nhanh, mọi dòng báo cáo) kiểm trần, chữ đầu, từ trùng, OSA ≤ 1 mỗi tick: không vỡ lần nào, không lệnh nào bị từ chối. |
| 4. Tất định | Test vàng khớp 124 mã băm (7.491 tick); chạy hai lần như nhau; nhật ký chạy lại ra cùng mã băm. Chrome: `td-1a-perf` chạy nhật ký của lượt vàng trong trang, 124 / 124 mã băm bằng của Node; `td-1a-combat`, `-stream`, `-slots`, `-keyboard-only`, `-perf` ghi nhật ký của trang và Node chạy lại ra đúng `__td.hash()`, ở cả hai cỡ. |
| 5. Hiệu năng | Sim (Node, Apple M4): một bước với 300 quái, 9 lính, 200 đạn, 10 nhà, 4 ô nhịp 1 s, trung vị 0,007–0,013 ms, p95 ≤ 0,05 ms; tải đầy TK 25.12 (640 quái, 64 lính, 512 đạn, 20 nhà, 4 ô nhịp 1 s; trần nhà của 1A bỏ qua) 0,020–0,024 ms (≤ 0,5 ms; CI ≤ 2 ms). Trong Chrome (`td-1a-perf`, 300 quái trên sân, 4 ô nhịp 1 s, gõ 70 WPM, ~610 khung): bản 2D và thẻ chữ (thời gian JS) trung bình 0,72–0,77 ms, p95 1,2–1,4 ms; cả luồng chính của trang theo Chrome (CDP `Performance.getMetrics`: script, style, layout, paint, cùng phần kịch bản tự đọc trang) trung bình 2,25–2,46 ms mỗi khung (script 0,94–1,01, style 0,44–0,47, layout 0,06), p95 theo từng quãng 0,5 s 3,0–3,3 ms; 60 khung/giây, ở 1280 × 720 và 1920 × 1080 (cổng ≤ 8 ms cho cả hai số; mục 1.15). |
| 6. Kịch bản §6.2 đạt, không lỗi console | Bảy kịch bản §6.2 và `td-1a-perf` đạt ở 1280 × 720 và 1920 × 1080 (16 / 16), không lỗi console, không ngoại lệ trang; `td-1a-tour` đạt ở 1280 × 720. Chạy bằng cấu hình Vite của worktree (mục 2): với lệnh `npx vite` thường, phông trả 403 và không có từ vựng thật (đã biết từ 1A.0). Sau bản sửa review 1A.5 (mục 1.15): bảy kịch bản ở 1280 × 720 và `td-1a-perf` ở cả hai cỡ chạy lại, đạt (9 / 9), cùng `td-1a-perf` với lệnh `npx vite` thường; khói V4 tới đợt 6, 60 khung/giây. |
| 7. Chủ dự án chơi theo §8 | Chưa: việc của chủ dự án. Bộ ảnh `td-1a-tour` để xem trước. |

### 1.14 Báo cáo bot: điều chủ dự án nên biết trước khi chơi (không là cổng)

Số của `node --import tsx scripts/td/balance.ts` (3 seed, 6 đợt hộp cát, Thường, từ vựng cấp 1–3) sau bản sửa review 1A.5. Bản đầu của mục này lấy số từ một báo cáo lỗi: luật của bot dùng chung giữa các seed, nên ở seed 2 và 3 núm nhịp bị khóa và con lắc không đổi chỗ (mục 1.15). Bot tất định: cùng mã cho cùng số, trừ mục 8 (thời gian).

- **Ở L1, gần như mọi cách chơi thua ở đợt 4–6.** Một ô (mọi nhịp, mọi tốc 20–100 WPM), hai ô, bot Cân bằng: thua ở đợt 5 hoặc 6, còn 14–17 mạng sau đợt 3; 4 ô ở 50–70 WPM và 3 ô ở 100 WPM thua 1/3 lượt, 3 ô ở 70 WPM thua 2/3. Qua đủ 6 đợt cả 3 lượt chỉ có: 4 ô ở 100 WPM (còn 7,7 mạng), 4 ô với nhà L2 ở 35 WPM (13,7 mạng), và 4 ô ở 35 WPM khi Draconis không trợ lực mà đứng ở khúc nhập đánh (6,3 mạng; cầu lửa 9,2 sát thương/s). Lý do: Thuồng Luồng (320 máu, giáp 60 %) chỉ nhận 40 % sát thương vật lý của tháp L1; cầu lửa phép của Draconis là khắc chế (TK 19.8), mà bot trợ lực thì Draconis không đánh. Mục 8 của BUILD_NOW cho chủ dự án chơi đợt 4–6 với 4 ô: nên thử cả nhà L2 (hộp cát) và để Draconis ra trận.
- **Ô thêm có giá trị** (TK 19.7 đạt): 2 ô (4 s + 6 s) ×1,29 so với 1 ô 3 s; 2 ô quá tải (127 %) ×1,36. Bảng 1–4 ô: ×1,13–1,69 so với 1 ô, tăng theo tốc gõ; 3–4 ô giữ mạng tốt hơn rõ (sau đợt 3 còn 19–20 so với 14–15).
- **Nhịp dày không bị phạt đủ:** bot "Nhịp dày ẩu" (mọi nhà nhịp nhanh nhất, 35 WPM) hơn bot Cân bằng (sát thương 109 %, vàng 103 %; TK 19.7 muốn kém hơn). Một ô ở 35 WPM: nhịp 1 s (tải 253 %) trúng 67 % nhưng Phát Chữ vẫn mạnh nhất (6,4 so với 3,6 sát thương/s ở 3 s). Ở 1A, từ tan chỉ mất Nhiệt và Chuỗi, mà hào quang có trần; TK 6.16 nói quá tải không lời.
- **Gợi ý nhịp của game đẩy vào quá tải:** bot theo gợi ý (TK 6.2: sau 10 từ, trúng ≥ 95 % thì dày một nấc, dưới 70 % thì thưa một nấc) đi từ nhịp mặc định lên tới 2 s ở 25 WPM (tải 112 %, trúng 89 %) và đưa đẩy giữa 2 s và 1 s ở 35 WPM (tải 130 %, trúng 89 %; Phát Chữ 5,5 so với 2,6 ở nhịp mặc định 4 s). Gợi ý chỉ nhìn tỉ lệ trúng, không nhìn Tải; bot không rời mắt khỏi thẻ nên trúng cao hơn người thật (mục 1.12).
- **Nhanh ẩu hơn Giỏi ở cùng tải** (TK 19.7 chưa đạt): chơi như bot Cân bằng, E theo tốc gõ, bot 80 WPM 85 % có Phát Chữ bằng 139 % bot 50 WPM 96 % (tải 89 % và 94 %): nhịp theo E cho bot nhanh nhiều từ hơn, mà điểm chất lượng từ không bù được. Cùng nhịp 3 s ở 3 ô (không cùng tải) thì 87 %. Bản đầu so ở cùng nhịp và ghi nhầm là cùng tải ("81 %, đạt").
- **Đứng Một Chỗ kém Cân bằng 9 %** (91 % Phát Chữ; TK 19.7 muốn kém ≥ 15 %): 1A chưa có Bùng Nổ, Hợp Tấu, nghỉ lò, nên chỉ con lắc của Draconis làm nên khác biệt.
- **Nguồn vàng của bot Cân bằng:** hạ quái 51 %, tự sản 19 %, phần thưởng từ 14 % (TK 17.3: 18–28 %), thưởng đợt và gọi sớm 16 % (TK: 5–10 %, vì lượt ngắn và gọi sớm ngay khi sân trống). Tải trung bình 97 % (TK: 85–110 %). Không gõ: vàng 75 % bot Cân bằng (TK ≥ 70 %).
- **Trúng:** 25 WPM nhịp mặc định 99 % (TK ≥ 85 %); 35 WPM nhịp 3 s 99 % (mô hình TK 6.16: 92 %; bot không nhìn bản đồ). Chuẩn 35 / 98 % hơn Nhanh ẩu 50 / 85 % về Phát Chữ ở 3 s (3,7 và 3,1 sát thương/s, hơn 19 %; TK 6.16: 24,9 và 21,9; Hoàn hảo 90 % và 55 %).
- **Nghẽn chữ: 0 %** ở cấp 1, 1–3, 1–5 với 4 ô nhịp 1 s; trần chữ đầy trước (bỏ vì đầy: 539 lần ở cấp 1, 112–121 ở 1–3, 1–5).
- **Phát cùng lúc sau khi đổi nhiều nhịp một lúc** (mục 1.12): "Trả lại nhịp" và đổi độ khó, cấp đặt lại lịch của mọi nhà trong cùng tick, nên các nhà cùng nhịp phát từ cách nhau 0,2 s. TK 6.4 cho phép; cảm giác "dồn từ" là điều nên để ý khi chơi.

### 1.15 Sửa review 1A.5

Bảy mục của review 1A.5; sáu sửa, một phần của mục 7 không làm (có lý do). Không đổi dòng nào trong `src/`: ngân sách vẫn 5.497 / 5.500.

1. **Luật của bot dùng chung giữa các seed (cao).** `plan()` của báo cáo nhận một hàm tạo luật (`plan(BALANCED, () => [pendulum(0, 2), loadTempo(1.1)])`), nên mỗi lượt `runBot` có núm nhịp, con lắc, bộ nhớ tải riêng; kiểu của `plan` không còn nhận luật đã tạo. `createReport` có thêm `runs` (các lượt của một dòng) và `played` (mọi dòng đã chạy: dòng "Kiểm thêm" nay đếm lệnh bị từ chối, bất biến vỡ trên mọi dòng, không chỉ dòng của mục 7). Test mới ở `td-balance-smoke`: một dòng hai seed liên tiếp cho đúng log, stats của hai lượt chạy riêng và đúng `Totals` của chúng; seed 2 vặn nhịp trước tick 1000. Đột biến (luật tạo một lần như cũ): test đỏ (seed 2: 102 lệnh thay vì 117). Chạy lại báo cáo; số mới ở mục 1.14 (đổi: Đứng Một Chỗ 100 → 91 %, Nhịp dày ẩu 103 / 101 → 109 / 103 %, vàng từ gõ 11 → 14 %, tải bot Cân bằng 94 → 97 %, 70 WPM 3 ô ×1,55 thua 3/3 → ×1,69 thua 2/3, nhà L2 còn 15 → 13,7 mạng, Chuẩn và Nhanh ẩu ở 3 s 3,5 / 3,4 → 3,7 / 3,1). Kết luận đạt hay chưa đạt của các dòng cũ không đổi.
2. **`td:golden:update` không thấy đổi nội dung (vừa).** `scripts/td/golden.ts` so mọi trường của file vàng (`content`, `deck`, `every`, `ticks`, `commands`, `hashes`, `summary`, `words`, `seed`, `about`); file được ghi khi có trường nào khác, `--check` thoát 1 cũng khi đó (đúng lúc `td-golden` đỏ, nên cổng `goldenSameInNodeAndChrome` của `td-1a-perf` không còn đạt khi Vitest đỏ). In `changed`: từng trường đổi, trước → sau (danh sách theo độ dài), và tick đầu tiên mã băm lệch (gồm khi chỉ khác độ dài). Thử: đợt 6 Cương Thi 20 → 21: `--check` in `changed: { content: "ca3c2578 → 7868f665" }` và thoát 1, lệnh không cờ ghi file, `td-golden` xanh lại; trả về như cũ.
3. **Cổng 5 chỉ đo thời gian JS (thấp).** `td-1a-perf` đọc thêm số của Chrome qua CDP `Performance.getMetrics` (`TaskDuration`, `ScriptDuration`, `RecalcStyleDuration`, `LayoutDuration`) mỗi ~0,5 s trong cửa sổ đo, chia cho số khung: cổng mới `mainThreadWithin8msPerFrame` đòi trung bình cả cửa sổ và p95 theo quãng ≤ 8 ms (đo: 2,25–2,46 ms và 3,0–3,3 ms), và `holds55fps` (60 khung/giây). Raster và GPU chạy ở luồng khác; số khung giữ 60 cho thấy chúng theo kịp. `fourBuildingsDealtAt1s` nay đòi cả 4 nhà không phải Lũy ở nhịp index 6 (1 s) mỗi lần nhìn trong cửa sổ đo, không chỉ có 4 nhà phát chữ.
4. **Test người đọc không chạm luật "quái trong tầm" (thấp).** Test mới: một Cương Thi đặt cách Tháp Cung 3 m; khoảng cách tới Tháp Cung (≤ 10 m) và tới Pháo (> 9 m) tính riêng trong test, `busy` của Tháp Cung đổi từ sai sang đúng, của Pháo vẫn sai; từ của Tháp Cung được chọn khi từ của Pháo ít hơn 0,83 s, từ của Pháo được chọn khi ít hơn 1,17 s; bỏ quái thì từ ít thời gian hơn lại được chọn. Test cũ khẳng định sân không có quái và so thời gian còn lại thuần, không dùng `busy` ở cả hai vế. Đột biến đảo dấu (`leftMs + …`): test mới đỏ.
5. **`hintTempo` chưa ai dùng (thấp).** Mục 2 của báo cáo có thêm bảng "nhịp theo gợi ý" ở 25 và 35 WPM một ô (số từ phát ở từng nhịp, trúng, tải). Test: 9 từ chưa đổi; 10 / 10 và 19 / 20 dày một nấc (4 s → 3 s); 18 / 20 và 7 / 10 giữ; 6 / 10 và 20 / 30 thưa một nấc (4 s → 6 s). Đột biến đảo hướng: test đỏ.
6. **Nhãn nói nhiều hơn số đo (thấp).** Dòng TK 19.7 "Nhanh ẩu 80 WPM, 85 %" nay đúng điều kiện của TK: cả hai bot chơi như bot Cân bằng (bố cục, con lắc, nhịp theo tải ≤ 110 %, E theo tốc gõ), in kèm tải của hai bot; kết quả đổi thành chưa đạt (mục 1.14). Dòng cùng nhịp 3 s giữ lại ngay dưới, ghi "chỉ để so". Ca kho đầy nay là tải đầy của TK 25.12: `fullWorld()` (`tests/td/perf.ts`) thêm 10 nhà bằng `placeBuilding` ở những chỗ `canPlace` nhận nếu bỏ trần 1A (16 nhà, 6 tháp, 3 trại; chỗ tìm bằng một lần quét với trần nâng tạm, chỉ ở thư mục tạm), rồi thêm lính loại "5 từ tốt" (TK 6.11) cho đủ 64 lính, máu đủ để không ai ngã trong lúc đo. `td-sim-perf` kiểm 20 nhà, 64 lính trước và sau khi đo, 4 người đang trợ lực; báo cáo mục 8 ghi đủ tải của từng dòng.
7. **Số trong mục 1.14 và changelog (thấp).** Sửa theo báo cáo mới (mục 1.14; changelog 1A.5 và changelog của bản sửa này). **Danh tính commit không đổi:** `toandx <toandx@192.168.52.5>` là danh tính của mọi commit trong cả repo cha lẫn bản checkout chính (`1979389f`, `695cfdf4`, `0a78bfbb`…), không riêng worktree. `git config user.email` trong worktree ghi vào cấu hình chung với bản checkout chính (việc này không được chạm), còn đổi tác giả của 13 commit 1A thì đổi mã commit mà BUILD_NOTES và changelog đang trích. Chủ dự án quyết trước khi push (ví dụ đặt email toàn cục rồi `git rebase --exec "git commit --amend --no-edit --reset-author"`).

## 2. Chạy cổng trong worktree

Worktree `games/.wt-*` có `node_modules` là liên kết tượng trưng tới bản checkout chính (`games/space-typing`). Với lệnh thường `npx vite --host 127.0.0.1 --port 3110 --strictPort`:

- Vite chỉ phục vụ file trong worktree. Phông Be Vietnam Pro nằm ở đường dẫn thật của liên kết, nên trả 403. `td-1a-boot` hỏng hai cổng `fontLoaded` và `noFailedLoads`.
- Bộ nhớ đệm phụ thuộc `node_modules/.vite` là của bản checkout chính (ghi qua liên kết).
- Media không bao giờ vào Git (model, ảnh tàu 3D trong `public/assets/space-typing/models/**`, `ships/3d/**`) chỉ có ở bản checkout chính. Rift Defense V4 báo "Could not load Rift Defense: Unexpected token '<'", khói V4 không vào được bản đồ.

Dùng cấu hình riêng cho worktree (không sửa `vite.config.ts`; đổi file đó chỉ vì worktree cần chủ dự án đồng ý):

```bash
npx vite --config scripts/dev/vite.worktree.config.ts --host 127.0.0.1 --port 3110 --strictPort
```

Cấu hình này:
- cho phép đường dẫn thật của `node_modules` (hết 403 phông);
- để bộ nhớ đệm Vite trong thư mục tạm của hệ thống, không ghi vào bản checkout chính;
- file `public/` nào worktree không có thì đọc từ `public/` của bản checkout chính, chỉ đọc. File của worktree vẫn được ưu tiên;
- phục vụ `/vocabulary/` từ `shared/vocabulary` của kho, chỉ đọc, như cấu hình nginx dev (`infra/nginx/typing-game.local.dev.conf`). Với lệnh Vite thường, `/vocabulary/` trả 404 và `td.html` chạy bằng từ dự phòng (mục 1.3).

Các cổng của một mốc (từ 1A.6 R3; cổng 3110 của 1A thành 3140 ở worktree R3):

```bash
npx tsc -p tsconfig.json --noEmit
npx tsc -p tsconfig.server.json --noEmit
npx vitest run
npx vite build --outDir <thư mục tạm ngoài repo>
node --import tsx scripts/td/golden.ts --check
# server ở trên chạy nền, rồi mỗi kịch bản ở hai cỡ (--width=1280 --height=720 và --width=1920 --height=1080):
URL=http://127.0.0.1:3140/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/<tên>.mjs --width=1280 --height=720
#   <tên>: td-1a-boot, td-1a-ime, td-1a6-day, td-1a6-night, td-1a6-keyboard, td-1a6-attention, td-1a6-learn, td-1a6-perf, td-1a6-tour
MAPS=halo-garden ISLANDS=0 URL=http://127.0.0.1:3140/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense.mjs
```

Bot và báo cáo, trong worktree gọi thẳng bằng `node` (mục 1.12):

```bash
node --import tsx scripts/td/balance.ts [--seeds=5] [--nights=4]   # pnpm td:balance (mục 5.2)
node --import tsx scripts/td/golden.ts [--check] [--fresh-words]   # pnpm td:golden:update
node --import tsx scripts/td/replay.ts <thư mục tạm>/td-1a6-day-replay-1280x720.json
```

Kịch bản 1A.6 và việc từng cái kiểm: mục 5.7. Bảy kịch bản 1A viết theo dòng chữ, nhịp và trợ lực ở ổ (`td-1a-combat`, `td-1a-stream`, `td-1a-slots`, `td-1a-keyboard-only`, `td-1a-words-dense`, `td-1a-perf`, `td-1a-tour`) đã xóa ở R3 (luật của chúng không còn; xem git trước `ce740e0c`). Giữ `td-1a-boot` (khởi động không media, phông, HUD) và `td-1a-ime`: kiểu UniKey / EVKey (chữ đầu, Backspace, chữ có dấu không mã phím: Telex "aa", "dd", "ee", VNI "a1", "o6") và kiểu bộ gõ hệ điều hành (phím "Process", keyCode 229); phím tiếng Việt chỉ ra lệnh `key` và `backspace`; số chọn người, Backquote bước sang người kế, Tab và Enter ra đúng lệnh; từ R3 `-` và `=` (núm nhịp cũ) không ra lệnh nào. Đây là phím giả qua CDP: không thay được kiểm tra UniKey và EVKey thật (BUILD_NOW §8).

---

## 3. 1A.6 "Lời Gọi", đợt R1 (`BUILD_1A6.md` §1–§6)

Worktree `games/.wt-td-1a6`, nhánh `feat/td-1a6`. R1 làm phần sim, dữ liệu, lệnh, test và file vàng; view chỉ sửa đủ để build và chơi thô (R2 làm view, HUD, thẻ, học, tạm dừng, âm; R3 làm bot, báo cáo, kịch bản, cổng).

### 3.1 Đã làm

- **§1 Bỏ:** `systems/stream.ts`, `systems/heat.ts`, `systems/aura.ts`, `typing/tempo.ts`; `systems/words.ts` gộp vào `systems/calls.ts`, `systems/production.ts` gộp vào `systems/economy.ts`. Hằng số `TEMPO`, `DEFAULT_TEMPO_S`, `LOAD`, `EVENNESS`, `HEAT`, `AURA_*`, `PRESENCE`, `CANNON_AURA`, `FIVE_GOOD`, `ORDER_GRACE`, `CHAIN.untouchedExpire`, `EMIT` (trừ `letterSlack` mà `decks.ts` còn dùng). Lệnh `setTempo`, `setAllTempo`, `uiFocus`; phím `-`, `=`, `Shift+-`, `Shift+=`; chip Tải; trợ lực ở ổ (`at`, `assist`), có mặt, sở trường Thư Đồng, lính tạm. `WordReward` thành `ShotSpec` (Phát Chữ) và `PowerSpec` (phát mạnh).
- **§2:** pha `day` / `night` / `dawn` / `defeat`, `w.day`, `w.phaseEnd`; `w.mode` với bảng `MODES` trong `rules.ts` (ngày, trần lời gọi, giây gõ trong 20 s, máu quái, sàn E, hồi lời gọi tháp, `lifeK` cho đồng hồ chấm điểm). Lệnh `callNight` (thưởng như `earlyCall`), op hộp cát `night`, `mode`. Hết đêm trả `waveBonus`, bình minh 3 s.
- **§3:** `w.wood`, `w.food`, `w.seeds`, `w.knowledge`, `w.autoSeeds`. Giá nhà `gold`/`wood` tính trong `compile.ts` (Gỗ = round(0,3 G)). Hoàn tác 5 s hoàn đủ hai thứ. `sellFood`. Trại Lính: mỗi lần hồi ăn 1 Lúa, thiếu thì chờ gấp đôi rồi đứng dậy (`units.hungry`).
- **§4.1** Nhà `farm` (khuôn L, 60 → 42 Vàng + 18 Gỗ), 4 ô (`buildings.plot`, `plotWork`), nông dân (NPC, đi thẳng trong ruộng 1,5 m/s, không A*), gieo 2 s, lớn 40 s, gặt 12 s ra 5 Lúa, lời gọi Gặt khi bắt đầu gặt; `buySeeds`, `autoSeeds` (mặc định bật, 8 Vàng một hạt), `harvestPlot`. **§4.2** 36 cây trong 5 cụm (`map.trees`, test `td-content` kiểm luật đặt), `TreeStore`; 2 dân đầu trận, `hire` (25 Vàng + 5 Lúa, trần 3/5/7/9), dân rảnh chặt cây đánh dấu gần nhất, không thì cây gần Lũy nhất trong 30 m; chặt 20 s ra 8 Gỗ, lời gọi Chặt; `markTree`; cây chặn đặt nhà (kiểm `tree` sau `overlap`), gốc không chặn. **§4.3** Công trường: `upTo`, `progress`, `ready`, thợ xây = cấp Lũy (`staffBuilders`), thợ rảnh lấy công trường chờ lâu nhất, S 8 s / M 14 s / L 18 s, ban đêm ×1,5, lời gọi Xây 2/3/4 từ. Lệnh `upgrade` (giá chênh giữa hai cấp, 0,75 thời gian, 3 từ; nhà vẫn chạy ở cấp cũ). **§4.4** Mỏ: đống như 1A, thợ mỏ chở mỗi 10 s (lệch 1), đống ≥ 50 % thì lời gọi Đào 2 từ. **§4.5** Lượt mạnh 0–5 (`charges`), phát mạnh tiêu 1 lượt (Cung ×1,6 sát thương +1 mục tiêu, Pháo ×1,4 và nổ ×1,3, Lũy +1 mục tiêu), lời gọi Bắn mạnh chỉ ban đêm (quái trong tầm, < 5 lượt, qua thời gian hồi của chế độ, 1 từ, sống 6 s), từ xong bắn Phát Chữ ngay và +2 lượt. **§4.6** như §3.
- **§5:** `stores/calls.ts` (`CallStore`), `systems/calls.ts` (tạo, cho từ, trả từ, gõ, chấm, tiến độ, đóng, thưởng Hoàn hảo), `systems/attention.ts` (AttentionDirector trong sim, bước 11). Kind `call` trong `KIND_PRIORITY`, giữ chỗ dự trữ như dòng chữ cũ. Chỉ lời gọi SÁNG giữ một từ và một chữ đầu; mờ thì trả; khóa giữ từ, từ kế đến khóa ngay; Esc nhả. Tự làm và gõ cộng dồn; Ẩu ×0,6 tiến độ, Chuỗi ÷2, mất thưởng; Chuỗi +1 mỗi từ không Ẩu, không phạt khác; bậc Chuỗi nhân thưởng Hoàn hảo (`CHAIN.tiers[].mul`, trần ×1,3). Kind `quiz` có ưu tiên và hạn, nhưng R1 chưa tạo (sổ ôn là R2).
- **§6:** vòng giúp (`inRing`: Tướng 10 m, Thư Đồng đã mở 6 m), Thư Đồng tự giúp ×1,5 (`passive`: ruộng, cây, công trường, mỏ), `assignUnit` tới cạnh nhà, `move` tới điểm (NPC, cây: app gửi điểm), Tướng tự đánh khi đứng.
- **Lệnh mới:** `upgrade`, `callNight`, `markTree`, `hire`, `buySeeds`, `autoSeeds`, `sellFood`, `harvestPlot`; op hộp cát `wood`, `mode`, `night`; `preset` làm §10 (Lũy 3, đặt sẵn đã xây, 5 dân, 8 cây gần Lũy được đánh dấu) vì op cũ phải còn chạy.
- **View, UI (thô):** cây, gốc, viền vàng khi đánh dấu, thanh tiến độ chặt; 4 ô ruộng theo giai đoạn; NPC chấm có chữ (N, D, X) với "!" và "…"; công trường nét đứt với cung tiến độ; 5 chấm lượt mạnh; vòng giúp của người đang chọn; thẻ chữ đặt trên NPC, màu theo loại lời gọi, thanh thời gian chỉ cho Bắn mạnh; HUD Vàng / Gỗ / Lúa / Hạt / Mạng, "Ngày n · m:ss", "Đêm n · còn k quái", nút gọi đêm sớm, chip "Đang gọi n/N"; thẻ nhà có nút nâng cấp, thẻ Ruộng (hạt, mua, tự mua), thẻ Lũy (dân, thuê, bán Lúa); bảng hộp cát có Chế độ, +Gỗ, Sinh đêm. Bấm cây đánh dấu, bấm ô chín gặt trước; `Shift+\` thuê dân, `Shift+Enter` gọi đêm, `Digit5` chọn Ruộng trong menu xây.

### 3.2 Lệch (có lý do)

1. **Thợ mỏ chở một gùi, không cả đống.** §4.4 nói thợ mỏ đổ đống mỗi 10 s và đống ≥ 50 % thì gọi. Đổ cả đống thì đống không bao giờ quá ~5 Vàng (Mỏ cấp 1 ★★★ ra 3,75 Vàng / 8 s, sức chứa 60), lời gọi Đào không bao giờ có. Thợ mỏ chở `MINE.haulK` = 0,8 × sản lượng một lần của cấp mỗi 10 s: ★ đủ chở hết (không gọi), ★★ đầy nửa sau ~220 s, ★★★ sau ~130 s. Không gõ thì mỏ giàu chỉ ra phần gùi. Số này để R3 chỉnh theo bot.
2. **Thưởng Hoàn hảo khi việc xong trước từ cuối.** Tự làm cộng với gõ nên việc thường xong trước khi gõ hết (gặt 12 s: 1/3 tự làm mất 4 s, ba từ ở 35 WPM mất ~6–7 s). Đọc chữ nghĩa "mọi từ" thì thưởng gần như không bao giờ có. R1 trả thưởng khi việc xong lúc lời gọi còn sống, đã gõ ≥ 1 từ và mọi từ đã gõ đều Chớp hoặc Hoàn hảo (`finished` của lời gọi). Mỏ và Bắn mạnh không có việc riêng: từ cuối là việc xong. *Review R1 siết lại (mục 3.6, số 4): một từ gõ phải là nhát làm xong việc.*
3. **Trần đếm lời gọi MỞ (sáng và mờ), không chỉ sáng.** Đếm chỉ lời gọi sáng thì đi giữa nhiều lời gọi mờ làm sáng quá trần cùng lúc. Lời gọi sáng là tập con của lời gọi mở, nên "sáng ≤ trần" (§12 cổng 6) vẫn đúng; chip "Đang gọi n/N" đếm lời gọi mở. *Review R1 bỏ lệch này (mục 3.6, số 1): trần đếm lời gọi sáng như §5.3.*
4. **Bắn mạnh đang khóa sống quá 6 s** tới khi gõ xong hoặc Esc (§5.2: lời gọi khóa giữ từ tới khi xong hoặc Esc).
5. **Lời gọi không dùng tầng 2.** Chữ đầu tầng 2 bị tính như kẹt chữ và chờ tick sau, để mọi từ sống có chữ đầu khác nhau (§12 cổng 6). Với ≤ 4 từ sống thì chữ không bao giờ thiếu.
6. **Thêm lệnh `upgrade`.** §4.3 cho thời gian và số từ của nâng cấp nhưng 1A chỉ có cấp hộp cát. Nâng cấp trả giá chênh (Vàng + Gỗ), đi qua thợ xây; hoàn tác 5 s hủy nâng cấp. Op hộp cát `level` vẫn tức thì, miễn phí (như 1A), nhưng không áp cho công trường chưa xong (`notReady`).
7. **Từ Ẩu ở Mỏ và Bắn mạnh:** "tiến độ ×0,6" thành 0,6 Vàng thưởng (đống vẫn chở cả) và round(2 × 0,6) = 1 lượt mạnh.
8. **Phát Chữ** giữ công thức 1A trừ T_N (không còn nhịp) và sở trường Thư Đồng (bỏ): D̄ × (0,8 + 1,2·Q) × lenF. **Cháy** (ái lực Draconis với Pháo) nay là: Draconis trong vòng 10 m của Tháp Pháo khi từ Bắn mạnh xong.
9. **Biên pha:** ngày là các tick [đầu ngày, `phaseEnd`); đêm bắt đầu ở tick `phaseEnd`. Một việc N tick tính cả tick bắt đầu.
10. **Tiến độ là phân số, xong khi ≥ 1 − 10⁻⁹** (`DONE` trong `stores/slots.ts`): cộng 1/2400 đủ 2400 lần có thể thiếu một chút dưới 1.
11. **Cách đếm dòng** theo `BUILD_1A6.md` §0 (chỉ `.ts` của `src/td`, 5.319 ở cuối 1A). `td-boundary` đổi theo: đọc trần 7.300 từ `BUILD_1A6.md` §0 và dòng 1A.6 của mục 1.2.
12. **Hỏi bài** (`quiz`) có trong bảng ưu tiên, luật đêm, thưởng, nhưng chưa tạo (sổ ôn là §7, R2). **Chủ đề từ** (§5.2) là chú thích móc ở `bagFor`: từ vựng chưa gắn chủ đề.
13. **Số không có trong đặc tả** (đặt ở `rules.ts`): NPC đi 3 m/s (A*), nông dân 1,5 m/s trong ruộng; ô ruộng cách tâm 1,1 m; dân và thợ mới hiện thành cột ngắn phía đông Lũy.
14. **Người:** `assignUnit` không còn đổi chỗ (hai người đứng cạnh một nhà được); Tướng tự đánh mỗi khi đứng trên đất.
15. **Test:** `world({ gold })` của test cho thêm Gỗ bằng số Vàng (ngân sách xây của test), trừ khi truyền `wood`. Bot, chính sách và báo cáo cũ (nhịp, con lắc, tải) bỏ; bot R1 mới ở `tests/td/{bot,reader}.ts`, `policies/{stand,layouts,hero}.ts`: xây theo bố cục (Ruộng trước), Chấm đứng cạnh Ruộng, Tướng bay tới lời gọi mờ cũ nhất mỗi 2 s, đánh dấu 5 cây bờ đông suối, thuê tới 4 dân, gọi đêm sau 45 s ngày. `pnpm td:balance` in một bảng ngắn (gõ 35 WPM so với không gõ); R3 làm lại báo cáo và cổng.

### 3.3 Số dòng (cách đếm của §0: `.ts` trong `src/td`)

| Nhóm | Cuối 1A | Sau R1 | Đổi |
|---|---|---|---|
| Nội dung (`content/`) | 573 | 610 | +37 (bảng chế độ, giá, cây, Ruộng) |
| Gõ thuần (`typing/`) | 453 | 394 | −59 (`tempo.ts` bỏ) |
| Sim lõi (`sim/*.ts`) | 837 | 945 | +108 (`commands.ts` lệnh mới, `world.ts`) |
| Kho (`sim/stores/`) | 367 | 442 | +75 (`calls`, `npcs`, `trees`, `walkers`) |
| Đường (`sim/nav/`) | 233 | 233 | 0 |
| Hệ (`sim/systems/`) | 1.393 | 1.428 | +35 (`calls`, `attention`, `economy` thay `stream`, `heat`, `aura`, `words`, `production`) |
| App (`app/`, `main.ts`) | 541 | 537 | −4 |
| UI, view (`ui/*.ts`, `view/`) | 922 | 938 | +16 |
| **Tổng** | **5.319** | **5.527** | **+208** (đích R1 ≤ 6.600; trần 7.300 cuối R3) |

Cách đếm cũ của 1A (`td.html`, `rng.ts`, mọi file `src/td` gồm `td.css`): 5.497 → 5.705.

### 3.4 Kiểm ở cuối R1

- `npx tsc -p tsconfig.json --noEmit`, `npx tsc -p tsconfig.server.json --noEmit`: sạch.
- `npx vitest run`: 405 file, 2.644 test đạt, 1 bỏ qua (cuối 1A: 408 file, 2.670); TD riêng: 18 file, 178 test. Bỏ `td-stream-schedule`, `td-heat-chain`, `td-aura`, `td-balance-smoke`; thêm `td-calls`; viết lại `td-agents`, `td-hud`, `td-rewards` (lượt mạnh), `td-sim-economy` (ngày đêm, Ruộng, cây, dân, công trường, mỏ, không sinh tiền), phần đổi của `td-content`, `td-input`, `td-placement`, `td-scorer`, `td-router`, `td-letters` (bỏ phần thuộc tính của dòng chữ cũ, giữ test chữ đầu), `td-sim-block` (Lúa), `td-sim-combat`, `td-nav`, `td-sim-perf`, `td-golden`.
- Thuộc tính (`td-calls`): 3 seed × 240 s chơi ngẫu nhiên trên từ vựng thật, mỗi tick: lời gọi mở ≤ trần, chỉ lời gọi sáng giữ từ (của nó), khóa nằm trên từ của lời gọi sáng, chữ đầu không trùng; nhật ký chạy lại ra đúng mã băm. Bỏ qua mọi lời gọi 300 s: Chuỗi không đổi, Vàng chỉ giảm vì hạt tự mua, Lúa chỉ giảm vì lính ăn, Gỗ không giảm.
- File vàng làm lại bằng `node --import tsx scripts/td/golden.ts` (cùng từ của file cũ): 3 ngày và 3 đêm, 16.754 tick, 279 mã băm, 320 lệnh, 50 từ gõ, 24 lời gọi Hoàn hảo; `--check` thoát 0. Sim một bước (Node, `td-sim-perf`): 300 quái, 9 dân, 4 ruộng, 20 cây đánh dấu, ban đêm: trung vị 0,017 ms; tải đầy TK 25.12: 0,028 ms.
- `npx vite build --outDir <thư mục tạm>`: đạt.
- Trình duyệt (cấu hình Vite của worktree, cổng 3110): `td-1a-boot` đạt 11/11 ở 1280 × 720 và 1920 × 1080, không lỗi console. Một kịch bản thử tạm ngoài repo (đặt sẵn, gõ phím thật qua CDP cho lời gọi sáng, gọi đêm) ở cả hai cỡ: không lỗi console, không ngoại lệ trang.
- `node --import tsx scripts/td/balance.ts --seeds=3 --nights=4`: cả bot gõ 35 WPM và bot không gõ qua 4 đêm ở mọi seed; không bất biến nào vỡ. Số chỉ để xem, chưa phải cổng (R3).

### 3.5 Kịch bản trình duyệt 1A sau R1

Viết theo dòng chữ, nhịp, trợ lực ở ổ; R3 thay bằng `td-1a6-*` (`BUILD_1A6.md` §12 cổng 8). Chạy ở 1280 × 720, giới hạn 150 s mỗi kịch bản:

| Kịch bản | Kết quả | Cổng hỏng (lý do) |
|---|---|---|
| `td-1a-boot` | Đạt | — |
| `td-1a-combat` | Hỏng, không lỗi console | `builtByMouse`, `built`, `kills`, `twoWavesEnded`… (Vàng + Gỗ, công trường chưa xong, ân hạn và `callWave` đã bỏ) |
| `td-1a-stream` | Hỏng, không lỗi console | `streamDone`, `severalWordsLive`, `softSwitch` (không còn dòng chữ) |
| `td-1a-words-dense` | Hỏng, không lỗi console | `fourWithin20m`, `cardsPiledUp` (nhịp 1 s) |
| `td-1a-ime` | Hỏng, không lỗi console | `minusEqualSetTempo` (phím `-` `=` đã bỏ); phần bộ gõ tiếng Việt vẫn đạt |
| `td-1a-perf` | Hỏng, không lỗi console | `presetAssisted`, `fourBuildingsDealtAt1s`, `noRejectedCommand` (`setTempo`) |
| `td-1a-slots`, `td-1a-keyboard-only`, `td-1a-tour` | Hết 150 s | chờ trợ lực, nhịp, đợt mà luật mới không có |

### 3.6 Review R1 (phản biện độc lập, 23/10)

Đọc diff `8ab227eb..e77ceeae` theo `BUILD_1A6.md` §1–§6 và ý của kế hoạch; dựng lại từng lỗi bằng test thăm dò; thử 24 đột biến luật (tắt ×1,5 ban đêm, bỏ kiểm vàng khi tự mua hạt, hai dân một cây…): bộ test TD bắt cả 24, nhưng 2 cái chỉ file vàng bắt (nay có test riêng).

| # | Mức | Lỗi (cách dựng lại) | Sửa |
|---|---|---|---|
| 1 | Cao | Lệch 3 (trần đếm lời gọi MỞ) làm bỏ qua có phạt: lời gọi Đào không tự đóng, mờ ở xa vẫn giữ chỗ mãi. Hai mỏ bị bỏ qua ở Thư giãn (ba ở Cân bằng) làm một lời gọi Xây ngay cạnh Tướng nằm CHỜ 30 s; Bắn mạnh cũng không mở được | Trần đếm lời gọi SÁNG (§5.3). Lời gọi mờ không giữ chỗ; lời gọi mở trong vòng chỉ sáng khi còn chỗ, theo ưu tiên, nên đi vào giữa nhiều lời gọi vẫn không sáng quá trần. Luật đêm đếm lời gọi kinh tế đang sáng. Chip "Đang gọi n/N" đếm lời gọi sáng |
| 2 | Cao | Từ kế của lời gọi đến KHÓA với 0 chữ: Backspace trừ `typed` (Uint8) thành 255, từ kẹt, mọi phím sau đó là lỗi (5 lỗi trên một từ gõ đúng); gõ chữ đầu của lời gọi khác là lỗi, không đổi khóa (trái kế hoạch 4.6: không cướp bàn phím) | `router.ts`: đổi khóa mềm khi đã gõ ≤ 1 chữ, chưa lỗi (0 chữ với từ kế); Backspace không trừ dưới 0, ở 0 thì nhả khóa. `firstMs` của từ kế lấy từ phím đầu của chính nó (tốc thô) |
| 3 | TB | Hoàn tác trong 5 s sau một nâng cấp đã xong (gõ 3 từ, 23 tick) xóa cả nhà, chỉ hoàn giá nâng cấp; hoàn tác lần hai sau khi hủy nâng cấp hoàn tiền lần nữa (+63 Vàng, +27 Gỗ) và xóa nhà | Chỉ hoàn tác việc đang xây (công trường, nâng cấp dở); việc xong trả `finished` ("Xây xong rồi, không hoàn tác") |
| 4 | TB | Lệch 2 quá rộng: gõ 1 từ Hoàn hảo rồi bỏ đi, thợ tự làm xong, vẫn được thưởng "cả lời gọi Hoàn hảo" (Chặt: +2 Gỗ cho 1 từ trong 4) | Thưởng cần một từ gõ là nhát làm xong việc (đã trả lời tới cùng), mọi từ đã gõ Chớp hoặc Hoàn hảo; tự làm tha cho các từ cuối thì vẫn được. Mỏ, Bắn mạnh: từ cuối là việc xong, như cũ |
| 5 | Thấp | Hủy một nâng cấp đóng mọi lời gọi của nhà (Đào của mỏ, Gặt của ruộng) | `stopSite` chỉ đóng lời gọi Xây; xóa nhà vẫn đóng hết |
| 6 | Thấp | Op hộp cát `level` trong lúc nâng cấp: nâng cấp xong ghi đè cấp | Từ chối `notReady` khi đang nâng cấp |
| 7 | Thấp | Nhà "nền chắc" mất +10 % máu khi nâng cấp không Hoàn hảo | `finishSite` giữ ×1,1 |
| 8 | Thấp | Esc giữ chữ và lỗi của từ dở; gõ lại thì lỗi cũ vẫn tính (kế hoạch §8 câu 6: Esc bỏ từ dở, không tính lỗi) | `unlock` xóa chữ đã gõ và lỗi của từ đang khóa |

Test thêm: `td-calls` (mỏ bị bỏ qua không chặn lời gọi trong vòng; quá trần thì chờ, sáng theo ưu tiên khi có chỗ; từ kế: đổi khóa, Backspace, tốc thô; thưởng chỉ khi gõ tới cùng; thuộc tính đếm sáng ≤ trần), `td-router` (khóa 0 chữ, Esc), `td-sim-economy` (hoàn tác việc xong và lần hai, op `level` khi nâng cấp, hủy nâng cấp giữ lời gọi Đào, nền chắc, tự mua hạt khi thiếu vàng, thợ lấy công trường cũ trước). Mỗi test mới đỏ trên mã R1.

**Lệch của R1:** giữ 1, 4–15. Số 2 siết lại, số 3 bỏ (bảng trên). Ghi chú số 1: "★ không gọi" gần đúng (đống ★ lên 40 % sau 15 phút).

**Để R2/R3 (thấp, chưa sửa):** Bắn mạnh tạo cuối đêm còn sống tối đa 3 s sang ngày (vô hại: lượt mạnh giữ lại); NPC đang làm bị `reroute` để ở chế độ đi (chỉ hình); dân không có đường thì chặt tại chỗ (hiếm); op `mode` không đổi độ dài ngày đang chạy. Báo cáo bot (3 seed, 4 đêm) sau sửa: cả hai bot qua 4 đêm, nhưng bot gõ còn 107 Vàng, 7 Gỗ, 124 Lúa, bot không gõ 186 Vàng, 28 Gỗ, 67 Lúa: cổng 7 cần chỉnh ở R3.

**Số sau review:** 5.540 dòng (+13). File vàng làm lại vì luật đổi (lệch từ tick 780): 16.406 tick, 273 mã băm, 330 lệnh, 44 lời gọi, 52 từ, 22 lời gọi Hoàn hảo. `tsc` hai cấu hình sạch; `npx vitest run` 405 file, 2.655 đạt, 1 bỏ qua (TD 18 file, 189 test); `vite build` đạt; trình duyệt (1280 × 720, 1920 × 1080): `td-1a-boot` đạt và một kịch bản tạm ngoài repo (đặt sẵn, gõ phím thật cho lời gọi sáng, Backspace sau từ, gọi đêm) không lỗi console.

## 4. 1A.6 "Lời Gọi", đợt R2 (`BUILD_1A6.md` §7–§10)

Worktree `games/.wt-td-1a6`, nhánh `feat/td-1a6`, trên R1 và bản sửa review R1 (`fc5aad95`). R2 làm học, điều khiển, hình, HUD, thẻ, âm, đặt sẵn, và ba lỗi thấp review R1 để lại. R3 làm bot, báo cáo, kịch bản `td-1a6-*`, cổng §12.

### 4.1 Đã làm

- **§7 Học.** `typing/decks.ts`: mỗi từ có thêm `vi`, `ipa` (lấy từ file từ vựng qua `app/vocab.ts`; từ dự phòng không có). Mã băm của bộ từ và của thế giới không đọc hai trường này (test). `gloss()` rút nghĩa cho thẻ: bỏ ghi chú trong ngoặc, lấy nghĩa đầu, thêm nghĩa sau khi còn ≤ 22 chữ, quá 26 chữ thì cắt ("…").
  - Từ xong: thẻ đổi thành "từ · nghĩa" (nền ngọc), đứng 1 s trong cột của lời gọi, trên từ kế của lời gọi. Lời gọi đã đóng thì thẻ nghĩa đứng ở chỗ cũ, thành một cột riêng để cột khác vẫn tránh nó. Dấu chấm điểm (Chớp, Hoàn hảo…) vẫn bay lên như 1A. Bộ từ không có nghĩa thì thẻ bay về NPC như R1.
  - Chế độ `learn`: thẻ có dòng nghĩa dưới từ ngay khi sáng; dải chữ dưới cùng hiện nghĩa và IPA của từ đang khóa.
  - **Sổ ôn** trong sim (`w.typing.review`, `reviewN`, có trong mã băm): từ gõ Ẩu hoặc có ≥ 2 lỗi vào cuối sổ (đã có thì dời xuống cuối), tối đa 20, đầy thì bỏ từ cũ nhất; Hỏi bài gõ đúng thì xóa từ khỏi sổ (`review()` trong `systems/calls.ts`).
  - **Hỏi bài:** ban Ngày, mỗi Thư Đồng đang mở tạo một lời gọi `quiz` (1 từ, ở ngay Thư Đồng: cột `agent` của `CallStore`) mỗi 25 s (`agents.quizAt`), khi sổ còn nhiều từ hơn số Hỏi bài đang sống; mỗi Thư Đồng một Hỏi bài một lúc. Lời gọi lấy từ cũ nhất của sổ có chữ đầu trống lúc nó sáng (chưa có thì chờ, không đếm kẹt chữ). Thẻ hiện nghĩa và chữ đầu với chỗ trống ("khá, hơi · r _ _ _ _ _"), chữ gõ đúng hiện dần; dải chữ cũng giấu từ. Gõ xong: +1 Tri thức, cả lời gọi Hoàn hảo +1 nữa (thưởng của R1). Hết Ngày (kể cả gọi Đêm sớm) thì Hỏi bài đóng, trừ cái đang khóa. HUD có dòng "Tri thức n · Sổ ôn m" khi đã có.
- **§8 Điều khiển.** Tab / Shift + Tab đi qua các nhà rồi các lời gọi MỜ, gần người đang chọn trước; dock hiện thẻ của lời gọi đó ("🪓 Chặt · 4 từ · đang mờ", nút "Gửi …"). Enter gửi người tới nhà của lời gọi (Gặt, Xây, Đào, Bắn mạnh) hoặc chỗ NPC đứng (Chặt). Bấm NPC: tới lời gọi của nó; nông dân không có lời gọi thì tới Ruộng; còn lại tới chỗ NPC đứng. Bấm bong bóng (thẻ chữ, hay bong bóng mờ trên bản đồ) gửi người tới lời gọi đó. Space: tạm dừng chiến thuật ở `relax`, `learn` (`Selection.tactical`): session ngừng bước; menu, thẻ, đặt nhà vẫn chạy; lệnh xếp hàng và chạy ở tick kế; phím gõ không nhận; chip trạng thái ghi "Tạm dừng chiến thuật · Space để chạy tiếp"; nút ▶ và nút "Chạy tiếp" của thanh hành động cũng tắt nó. Chế độ khác: Space bị nuốt; đổi sang chế độ không có tạm dừng thì tạm dừng tắt. Shift + `\` / Shift + Insert thuê dân, bấm ô chín, bấm cây: đã có từ R1. Test input thêm Space, Space và Shift + `\` khi bộ gõ đang soạn, Space giữ phím.
- **§9 Hình.** Cây tròn xanh đậm có đỉnh sáng; gốc chấm nâu; cây đánh dấu viền vàng dày. Ô ruộng 4 màu (đất nâu, mạ xanh nhạt ở nửa đầu lúc lớn, lúa xanh, lúa vàng) có viền; thanh tiến độ chỉ khi gặt. NPC chấm có chữ (N, D, X, và M thợ mỏ cạnh mỗi mỏ) với "!" khi làm, "…" khi lời gọi CHỜ. Công trường nét đứt và cung tiến độ (R1). Bong bóng lời gọi SÁNG là thẻ chữ có biểu tượng loại việc (emoji: 🏹 🔨 🌾 🪓 ⛏️ 📖) và chấm số từ còn lại (●●○; lời gọi 1 từ không có). Lời gọi MỜ: bong bóng mờ trên canvas có biểu tượng và chấm, không có chữ, chạm nhau thì xếp chồng lên. Lời gọi nằm ngoài khung sân của zoom 1: mũi tên ở mép khung, màu theo loại. 5 chấm lượt mạnh dưới tháp, tối thiểu 7 px ở mọi zoom. HUD: thẻ Ruộng ("Chín 1 · Lớn 2 · Trống 1", hạt, "Mua 4 hạt · 30 vàng", "Tự mua hạt"); thẻ Lũy ("Dân 5/7 · Thợ xây 3 · Lúa n", "Thuê dân · 25 vàng, 5 lúa", "Bán 10 Lúa · +10 vàng", mỗi nút một hàng); thẻ tháp ("Lượt mạnh n/5"); nút nâng cấp một hàng riêng (R1 bị tràn chữ); hàng "Chế độ" của hộp cát đặt nhãn lên trên để bốn tên chế độ không bị cắt.
- **§9 Âm** (`view/audio-min.ts`, tổng hợp bằng mã): khi một lời gọi SÁNG, một tiếng báo theo loại (Gặt chuông cao, Chặt gõ gỗ thấp, Xây hai nhát búa, Đào leng keng, Bắn mạnh tù và ngắn, Hỏi bài tiếng chim), tối đa 3 tiếng một giây. Bỏ tiếng tích khi lời gọi nhận từ mới của R1 (trùng với tiếng báo). Giữ tiếng phím và nốt xong từ của 1A.
- **§10 Đặt sẵn:** như R1, thêm: 4 ô của Ruộng có đủ giai đoạn (chín, lớn 70 %, lớn 30 %, trống) để làng có việc ngay.
- **Lỗi thấp của review R1:** NPC đang làm mà bị nhà mới phủ thì được đưa ra ô trống và đứng làm tiếp (không còn ở chế độ đi). Dân không có đường tới cây thì bỏ cây đó (`worker` = −2) đi tìm cây khác, không chặt từ xa; đánh dấu lại cây thì thử lại. Op `mode` ban ngày đổi luôn độ dài ngày đang chạy, giữ phần đã trôi (không phải chờ ngày sau).

### 4.2 Lệch (có lý do)

1. **Hỏi bài nhường chỗ.** §5.3 chỉ xếp ưu tiên khi còn chỗ. Hỏi bài luôn nằm trong vòng của Thư Đồng nên luôn sáng được: hai Hỏi bài giữ đủ trần của `relax`, `learn` (2) và mọi lời gọi việc phải mờ. Nay ở trần, một Hỏi bài chưa ai gõ (không khóa) tắt sáng để nhường cho lời gọi khác trong vòng (kế hoạch 4.5: Hỏi bài "bỏ được"). Hỏi bài đang gõ không nhường. Test `td-learn`.
2. **Từ của Hỏi bài chọn lúc sáng**, không gắn khi tạo: lời gọi lấy từ cũ nhất của sổ có chữ đầu trống. Nhờ đó Hỏi bài không kẹt vì một từ khác đang giữ chữ đầu, và hai Hỏi bài không hỏi trùng (luật chữ đầu không cho hai từ giống nhau cùng sống).
3. **Hỏi bài không có hạn** (`expire` = −1): đóng khi pha không còn là Ngày (§5.1 "Hết Ngày"), nên cũng đóng khi gọi Đêm sớm. Bot đọc `expire` để ưu tiên Bắn mạnh nên không nhầm Hỏi bài là lời gọi gấp.
4. **"≥ 2 lỗi" trùng với Ẩu** ở mọi từ của bộ (3–8 chữ chỉ cho phép 1 lỗi). Luật vẫn viết đủ hai điều kiện (`CALL.reviewErrors`).
5. **Cột thẻ đẩy ngang tới 240 px** (1A: 160). Bốn dân chặt bốn cây cạnh nhau cho bốn bong bóng gần cùng một chỗ; 160 px không đủ tách bốn thẻ rộng ~140 px. Thêm: khi các cột co về, nếu hai cột sắp chạm (hai cột đổi bên cho nhau) thì mọi cột lấy ngay chỗ đích, không trượt qua nhau. Thẻ nghĩa nhảy ngay vào chỗ của nó trong cột (không trượt), như luật "cột tách ngay" của 1A.
6. **Đặt sẵn có ruộng đủ giai đoạn** (mục 4.1): §10 không nói; chỉ ở hộp cát, để ảnh và lần chơi đầu có Gặt ngay.
7. **Thẻ đang rời** có lớp `is-gone` (`is-mean` khi đang hiện nghĩa) để kịch bản đo được thẻ sống (R3).
8. **Thẻ lời gọi ở dock** chỉ có cho lời gọi MỜ mà Tab tô; bấm bong bóng thì gửi người ngay, không mở thẻ.
9. **Bấm NPC** trúng khi trong 0,7 m (bằng chấm NPC): nông dân đứng trong Ruộng, nên bấm vào rìa Ruộng vẫn mở thẻ Ruộng.

### 4.3 Số dòng (cách đếm của §0: `.ts` trong `src/td`)

| Nhóm | Sau R1 (gồm review) | Sau R2 | Đổi |
|---|---|---|---|
| Nội dung (`content/`) | 610 | 611 | +1 |
| Gõ thuần (`typing/`) | 395 | 412 | +17 (`vi`, `ipa`, `gloss`) |
| Sim lõi (`sim/*.ts`) | 949 | 953 | +4 |
| Kho (`sim/stores/`) | 442 | 447 | +5 |
| Đường (`sim/nav/`) | 233 | 233 | 0 |
| Hệ (`sim/systems/`) | 1.437 | 1.492 | +55 (sổ ôn, Hỏi bài, nhường chỗ, ba lỗi thấp) |
| App (`app/`, `main.ts`) | 537 | 582 | +45 (tạm dừng, Tab tới lời gọi, bấm NPC và bong bóng) |
| UI, view (`ui/*.ts`, `view/`) | 937 | 1.120 | +183 (thẻ, bong bóng mờ, mũi tên, thẻ dock, âm) |
| **Tổng** | **5.540** | **5.850** | **+310** (đích R2 ≤ 7.000; trần 7.300 cuối R3) |

### 4.4 Kiểm ở cuối R2

- `npx tsc -p tsconfig.json --noEmit`, `npx tsc -p tsconfig.server.json --noEmit`: sạch.
- `npx vitest run`: 406 file, 2.676 đạt, 1 bỏ qua (sau review R1: 405 file, 2.655); TD 19 file, 210 test (189). File mới `td-learn`: nghĩa không vào mã băm, `gloss`, sổ ôn (Ẩu vào, 1 lỗi không, 20 từ, dời xuống cuối, xóa), Hỏi bài (có khi sổ có từ, ở Thư Đồng, sáng, đúng từ; gõ đúng xóa khỏi sổ, gõ Ẩu giữ lại; 25 s, một cái mỗi Thư Đồng, không quá số từ của sổ; nhường chỗ ở trần; đóng khi hết Ngày trừ cái đang khóa). Thêm ở `td-input`: Space ở bốn chế độ, nút ▶, lệnh xếp hàng khi dừng (qua `Session`), Tab qua nhà rồi lời gọi mờ, Enter, Esc, bấm NPC, `toCall`, đặt sẵn có ruộng đủ giai đoạn, phím khi bộ gõ đang soạn. Thêm ở `td-hud`: dòng Tri thức, dải chữ giấu từ Hỏi bài và hiện nghĩa ở `learn`, thẻ Ruộng, Lũy, tháp, thẻ lời gọi mờ, nút Space. Thêm ở `td-sim-economy`: op `mode` đổi ngày đang chạy, cây không có đường, NPC đang làm bị phủ (ba test này đỏ trên mã R1). Hai test cũ đổi theo luật: Space nay là hành động `space`; Hỏi bài ban đêm đóng chứ không chờ.
- File vàng **làm lại vì luật sim đổi** (sổ ôn, Hỏi bài, nhường chỗ; kho thêm cột): `node --import tsx scripts/td/golden.ts` trên cùng từ của file cũ: 16.406 tick, 273 mã băm, 348 lệnh, 47 lời gọi (3 Hỏi bài), 55 từ, 23 lời gọi Hoàn hảo; lệch từ tick 60 (mã băm có cột mới); `--check` thoát 0.
- `npx vite build --outDir <thư mục tạm ngoài repo>`: đạt.
- Trình duyệt (cấu hình Vite của worktree, cổng 3110), một kịch bản tạm ngoài repo: `td.html?sandbox=1` → Đặt sẵn, một công trường, Chấm tới Ruộng, Tướng tới cụm cây, chuột thật đánh dấu 5 cây ven suối; một Ngày gõ phím thật qua CDP (45 WPM, vài từ Ẩu cho sổ ôn); `learn`; lời gọi mờ, Tab, Enter; bấm Ruộng, Lũy; Space; một Hỏi bài gõ thật; Shift + Enter, một Đêm gõ Bắn mạnh. Ở 1280 × 720 và 1920 × 1080: mọi kiểm đạt; có lúc 3 lời gọi sáng; không hai thẻ sống nào chồng (ngưỡng 1 px như 1A); không thẻ nào chạm bảng HUD ở zoom 1; chữ ≥ 18 px; không lỗi console, không ngoại lệ trang. Thêm một lần zoom vào làng: lời gọi ngoài khung hiện mũi tên ở mép. Âm thanh chỉ kiểm là không lỗi (máy không đầu, không nghe).

### 4.5 Để R3

- Kịch bản `td-1a6-*` (§12 cổng 8) thay các kịch bản `td-1a-*` cũ; dùng lớp `is-gone`, `is-mean` để đo thẻ sống; `__td.state()` có `review` và `agent` của lời gọi, `__td.ui()` có `call`, `tactical`.
- Bot mới, báo cáo, cổng 5 và 7 (mục 3.6: bot gõ chưa lợi hơn bot không gõ). Bot nên gõ cả Hỏi bài.
- Ở zoom 1 cả sân 96 m nằm trong 660 px (1280 × 720): làng nhỏ, chấm NPC chỉ ~10 px. Bộ ảnh cho chủ dự án nên có thêm một ảnh zoom 2× vào làng.
- Còn từ R1: Bắn mạnh tạo cuối đêm sống tối đa 3 s sang ngày.

### 4.6 Review R2 (phản biện độc lập, 23/10)

Đọc diff `fc5aad95..4913aea1` theo `BUILD_1A6.md` §7–§10 và ý của kế hoạch (kéo không đẩy, bỏ qua không mất gì, thư giãn, học); dựng lại từng lỗi bằng test thăm dò và trình duyệt thật (CDP, phím và chuột thật, cổng 3130, 1280 × 720 và 1920 × 1080); thử 14 đột biến luật R2: test bắt 9, 4 cái lọt nay có test riêng (dưới bảng).

| # | Mức | Lỗi (cách dựng lại) | Sửa |
|---|---|---|---|
| 1 | TB | Dấu chấm điểm (Chớp, Hoàn hảo…) che nghĩa 1 s: ở lời gọi nhiều từ (Gặt, Chặt, Xây, Đào) thẻ nghĩa dời lên trên từ kế, dấu vẫn ở chỗ cũ nên nằm đè chữ ("rather · [Chớp] hơi"; đo: dấu chồng thẻ nghĩa) | Dấu đi theo thẻ nghĩa, đứng trên nó; đo lại 12 mẫu mỗi cỡ: chồng 0 px |
| 2 | TB | Tạm dừng chiến thuật: lệnh tay xếp hàng mà không hiện gì tới khi chạy tiếp, người chơi bấm lại: "Mua 4 hạt" hai lần thành 8 hạt (60 vàng), bấm cây hai lần thành bỏ đánh dấu (chuột thật) | Trong tạm dừng chiến thuật, lệnh tay chạy ngay, đóng dấu tick đang chờ (`Session.orders`); bước của tick đó cũng chạy lệnh trước mọi hệ, nên nhật ký chạy lại ra cùng thế giới. Phím gõ và Backspace vẫn chờ; lúc thua không nhận. `replayTo` (`sim/world.ts`) và `scripts/td/replay.ts` cộng các lệnh đóng dấu đúng tick đang chờ (ảnh chụp giữa lúc dừng). Tạm dừng thường (Esc, ▶) vẫn xếp hàng như 1A |
| 3 | TB | Space theo thói quen sau một từ ("rather" rồi Space sau 60 ms) bật tạm dừng ở Thư giãn và Học; phím của từ kế (đến đã khóa) bị bỏ im lặng; báo dừng chỉ ở góc trái trên | Space trong 800 ms sau một chữ game đã nhận là dấu cách giữa từ: bị nuốt (`WORD_SPACE_MS`, `installKeys`); chữ bị bỏ vì đang dừng không tính, nên Space để chạy tiếp ăn ngay; nút "Tạm dừng" không bị chặn. Dải chữ ghi "Tạm dừng · Space" cạnh từ đang khóa |
| 4 | TB | Nghĩa ở chế độ Học 13,5 px trên thẻ ở 1280 × 720 (dải chữ 13 px), ngọc trên giấy 3,9 : 1; nghĩa Hỏi bài xanh 3,7 : 1 | Nghĩa ≥ 18 px, ngọc đậm `#07695c` (6 : 1); nghĩa Hỏi bài `#1f5bb5` (5,9 : 1). Đo lại: không chữ nào của thẻ < 18 px |
| 5 | Thấp | 4 lời gọi sáng (Thử thách, cụm cây đông nam), thẻ Lũy mở ở dock, 1280 × 720: thẻ "maybe" bị đẩy (lệch 5, 240 px) đè mép trái dock | Cột tránh bảng HUD hai bên ở chiều cao của nó khi còn chỗ (`besidePanels`, đặt lại mỗi lượt tách); không còn chỗ (`lanesTouch`) thì như cũ: thẻ đè HUD chứ không đè nhau. Vòng tách 8 → 40 lượt để hội tụ. Đo lại: không thẻ nào đè bảng ở cả hai cỡ |
| 6 | Thấp | Nghĩa dài cắt giữa chữ: 12/765 từ ("chưa bao giờ, không bao g…", "cơ sở kinh …") | Cắt ở dấu phẩy cuối còn vừa, không thì ở chữ trọn cuối và "…"; test chạy cả bộ từ thật |
| 7 | Thấp | Thẻ dock của lời gọi mờ luôn ghi "Ngoài vòng giúp" kể cả khi lời gọi ở trong vòng mà chờ chỗ (trần đầy, Hỏi bài nhường): gửi người tới không làm nó sáng | Ghi "Trong vòng giúp: sáng khi bớt lời gọi đang sáng" |
| 8 | Thấp | Hàng Chế độ của hộp cát vẫn cắt "Cân bằng" ở 1280 × 720 (mục 4.1 nói đã hết) | Bốn nút thành 2 × 2 |

Test thêm (mỗi test đỏ trên mã R2, trừ 4 test chặn đột biến): `td-input` (Space sau chữ bị nuốt, sau chữ bị bỏ thì không; tạm dừng chiến thuật chạy lệnh ngay, phím chờ, `replayTo` giữa lúc dừng và sau đó cùng mã băm, tạm dừng thường vẫn xếp hàng), `td-hud` (dải chữ khi dừng; thẻ dock của lời gọi mờ trong vòng), `td-lanes` (bảng hai bên, có chỗ thì không đè dock, hết chỗ thì `lanesTouch`), `td-learn` (cắt nghĩa ở dấu phẩy hoặc chữ trọn, cả bộ từ thật). Chặn đột biến lọt: Hỏi bài lấy từ cũ nhất có chữ đầu trống (`td-learn`), Tab bỏ qua lời gọi sáng, bấm thợ xây đang làm thì tới công trường của lời gọi (`td-input`), chấm từ ●●●○ (`td-hud`). Đột biến còn lọt: cổng phím trong `main.ts` (nay `Session` cũng giữ phím trong tạm dừng chiến thuật), dòng nghĩa của thẻ ở chế độ Học và trần tiếng báo (DOM và âm: chỉ kiểm bằng trình duyệt); Hỏi bài tạo ban đêm chỉ file vàng bắt (đóng ngay trong tick, không ai thấy).

**Lệch của R2 (mục 4.2):** giữ cả 9. Số 1 (Hỏi bài nhường) hợp ý "bỏ được"; số 5 giữ, thêm tránh HUD (số 5 bảng trên). **Lệch mới của review:** §8 "lệnh xếp hàng và chạy ở tick kế khi bỏ dừng" thành lệnh chạy ngay trên tick đang chờ (số 2), vì người chơi không thấy lệnh đã nhận; tick đóng dấu và thứ tự như cũ, nên nhật ký và file vàng không đổi. Space không dừng trong 800 ms sau một chữ (số 3).

**Không sửa (thấp, ghi lại):** chế độ Học ở Lũy 1 không có Hỏi bài (chưa có Thư Đồng; §6 chỉ Thư Đồng hỏi); Hỏi bài sáng mà chưa có từ (chữ đầu của mọi từ trong sổ đang bận) giữ một chỗ trần không thấy, nhường khi trần đầy; Esc khi đang tạm dừng chiến thuật bật thêm tạm dừng thường (Esc như 1A); lời gọi ra vào mép vòng giúp kêu lại tiếng báo (đo 100 s ở Thư giãn: Hỏi bài sáng lại 7 lần; trần 3 tiếng/giây); mũi tên mép tính theo khung sân ở zoom 1, đúng phía; phím Tab qua hết nhà rồi mới tới lời gọi mờ (đúng §8). Kế hoạch Q10 "Cân bằng: tạm dừng chỉ xem" khác §8 "Esc … tạm dừng (như 1A)": giữ như 1A.

**Tất định:** Node chạy lại nhật ký trình duyệt ra cùng mã băm: tour R2 (Học, Hỏi bài, tạm dừng, một Đêm; 1280 × 720: 5.000 tick, 121 lệnh; 1920 × 1080: 5.002 tick, 124 lệnh) và kịch bản tạm dừng (giữa lúc dừng có lệnh đã chạy, và sau khi chạy tiếp) ở cả hai cỡ. File vàng không đổi (`--check` khớp: luật sim không đổi).

**Số sau review:** 5.955 dòng (+105: app 614, UI và view 1.177, gõ 419, sim lõi 962; còn lại như mục 4.3). `tsc` hai cấu hình sạch; `npx vitest run` 406 file, 2.685 đạt, 1 bỏ qua (TD 19 file, 219 test); `vite build` đạt (thư mục ngoài repo). Trình duyệt sau sửa: tour R2 đạt mọi kiểm ở hai cỡ, không lỗi console.

**Cho R3:** kịch bản bấm Space để dừng phải chờ ≥ 800 ms sau phím chữ cuối; trong tạm dừng chiến thuật lệnh tay (và `__td.send` không phải phím) chạy ngay, phím chờ tới khi chạy tiếp; so mã băm với `scripts/td/replay.ts` (đã dùng `replayTo`).

## 5. 1A.6 "Lời Gọi", đợt R3 (`BUILD_1A6.md` §11–§12: bot, báo cáo, kịch bản, cổng)

Worktree `games/.wt-td-1a6-r3`, nhánh `feat/td-1a6-r3`, trên `feat/td-1a6` (`4913aea1`), đã gộp bản sửa review R2 (`2663f794`). R3 làm bot, báo cáo `td:balance`, kịch bản `td-1a6-*`, cổng §12; sửa một luật của bộ điều phối và hai số trong `rules.ts` để cổng 5 và 7 đạt (mục 5.4, 5.5).

### 5.1 Bot (`tests/td/`)

- **Mắt** (`reader.ts`): từ của lời gọi SÁNG thấy sau 0,35–0,6 s; từ kế của lời gọi đang khóa sau 0,15–0,3 s (mắt đã ở đó); từ Hỏi bài nhớ ra từ nghĩa sau 0,8–1,6 s. Chọn Bắn mạnh trước (còn kịp gõ thì gõ), rồi từ cũ nhất. Luồng ngẫu nhiên riêng, không chạm luồng của thế giới.
- **Tay** (`keystrokes.ts`, giữ từ 1A): WPM (5 chữ một từ), khoảng phím ±50 %, trượt sang phím bên cạnh theo độ chuẩn, 30 % lần trượt bấm thêm Backspace (router không nhận phím sai, nên Backspace xóa một chữ đúng và phải gõ lại).
- **Người gõ** (`bot.ts`): một phím mỗi tick khi tay rảnh; gõ từ đang khóa khi đã đọc nó, không thì từ mắt chọn. **Bot không gõ**: `hands: null`, cùng kế hoạch.
- **Kế hoạch chuẩn** (`policies/stand.ts`, `layouts.ts` `STANDARD`, §12 cổng 4): mua theo thứ tự khi đủ Vàng và Gỗ: Ruộng cạnh rừng đông nam (18, 30), Tháp Cung khúc nhập, Trại Lính, Mỏ trên N1 ★★★, Lũy cấp 2, Tháp Cung đường đông, Tháp Pháo, Lũy cấp 3, rồi nâng cấp (Tháp Cung khúc nhập, Tháp Cung tây, Pháo, Mỏ, Trại Lính). Lũy lên cấp bằng hộp cát (1A.6 chỉ có nút hộp cát, §4.3) nhưng bot trả giá TK 2 (150 / 260 / 400) cắt như §3 (Gỗ = round(0,3 G)): 105 V + 45 G, 182 + 78, 280 + 120. Chấm đứng ở Ruộng, Phẩy ở Mỏ (khi Lũy mở chỗ). Giữ số cây đánh dấu còn đứng = số dân + 2, theo từng cụm (đông nam, bờ đông suối, bờ tây, cạnh cổng tây, cổng, đông bắc). Thuê tới 4 dân (giữ 20 Vàng), bán 10 Lúa khi quá 20, không thuê trong tick vừa mua (giá chỉ trừ khi lệnh chạy). Ngày chạy hết, không gọi Đêm sớm.
- **Tướng** (`policies/hero.ts`), chỉ bằng lệnh bàn phím có (Tab tới nhà hay lời gọi mờ, Enter: `assignUnit` tới nhà, hoặc `move` tới chỗ NPC đứng). Ban Ngày, mỗi 0,5 s khi không khóa từ và đang đứng: cân mỗi chỗ bằng số từ còn lại của lời gọi mở hay chờ trong vòng 10 m mà không vòng Thư Đồng nào thắp, chia cho (1 + đường bay / 60 m); đi khi hơn chỗ đứng 1,5 từ (hay chỗ đứng không có gì). Ban Đêm: tới tháp (hay Lũy) có nhiều quái trong tầm và lời gọi Bắn mạnh đang mờ; ở đó Tướng cũng đánh.
- **Đo** (`bot.ts`): tick gõ (có khóa) theo Ngày và Đêm, theo từng ngày; số đếm 20 s của bộ điều phối ở mức cao nhất; tài nguyên làm ra (Vàng mọi nguồn, Gỗ, Lúa, Tri thức; không tính vốn đầu, không tính bán Lúa) ở mỗi lúc chạng vạng và bình minh; lời gọi (tạo, từng sáng, có gõ, gõ xong việc, Hoàn hảo, sáng mà bỏ qua, chưa từng sáng) theo loại; giá mỗi bước sim; bất biến lời gọi mỗi tick.

### 5.2 Báo cáo `td:balance`

`node --import tsx scripts/td/balance.ts [--seeds=5] [--nights=4]` (5,6 s): mỗi chế độ (Thư giãn, Cân bằng, Thử thách, Học) chạy bot gõ và bot không gõ ở 5 seed, 4 đêm, từ vựng thật. In: bảng cổng §12 (Cân bằng); hai bot (đêm qua, mạng, tỉ lệ gõ Ngày và Đêm, cửa sổ 20 s đầy nhất, từ gõ, lời gọi Hoàn hảo, làm ra sau 3 Ngày); tỉ lệ gõ theo từng Ngày và Đêm; lời gọi theo loại; tài nguyên mỗi Ngày; bảng theo chế độ; giá một bước sim. `gates()` là bảng cổng; `tests/td-balance-gates.test.ts` giữ cổng 4, 5, 6, 7 trên đúng các seed đó (sim tất định, nên cùng số).

### 5.3 Vì sao cổng 7 hỏng ở R1 (bot gõ "làm ra ít hơn")

1. **R1 so số tồn cuối trận, không so cái làm ra.** Bot gõ có Lúa sớm hơn nên thuê dân, mua hạt, xây sớm hơn: tiêu nhiều hơn. Đo lại trên mã R1 (3 seed, hết Đêm 3), Vàng mọi nguồn + Gỗ + Lúa làm ra: gõ 486, không gõ 440, tức +10 %, không phải thua.
2. **Bot R1 dở.** Tướng bay tới lời gọi mờ cũ nhất mỗi 2 s, qua lại giữa Ruộng cạnh Lũy và 5 cây bờ đông suối cách 60 m (bay mất ~10 s mỗi lượt); gọi Đêm ở giây 45 của 75; Mỏ ★ ở N2 không bao giờ đầy nửa đống nên không có lời gọi Đào.
3. **Cây tự đổ nhanh quá:** 20 s một cây, phần lớn lời gọi Chặt xong trước khi Tướng tới; gõ chỉ góp một hai từ.
4. **Cây hết:** 36 cây × 8 Gỗ = 288 Gỗ cả bản đồ; bot gõ chặt hết trước Ngày 4, Ngày 4 không còn lời gọi Chặt (tỉ lệ gõ Ngày 4 còn 15–24 %).

Sửa: kế hoạch và Tướng (mục 5.1), Mỏ N1, đủ ngày; cây 45 s ra 12 Gỗ (mục 5.5). Sau sửa: +35,7 % (5 seed), +38 % (20 seed).

### 5.4 Vì sao cổng 5 hỏng, và luật mới của bộ điều phối

Bộ điều phối R1 chỉ nhìn 20 s đã qua lúc thắp: ba lời gọi thắp cùng lúc lúc vắng được bot gõ liền nhau (17 s trong 20 s ở 35 WPM); Bắn mạnh và Xây thắp cả khi đã quá 8 s (một lời gọi Xây 4 từ đưa lên 11 s). Giữ cửa sổ bằng cách giữ chỗ cả lời gọi (mọi từ còn lại) thì chặn quá tay: tỉ lệ gõ Ngày còn 9–25 % (lời gọi 3 từ chiếm chỗ ~6 s, và tự làm thường xong trước khi gõ hết).

**Luật mới (`systems/attention.ts`, giữ từng từ):** một từ chỉ được bắt đầu khi gõ nó từ giờ (thời gian khóa ở tốc E: các chữ trừ chữ đầu, `typeSeconds(len − 1)` × `CALL.paceK`, cộng `CALL.slipS` cho phím trượt), sau từ đang gõ dở, vẫn giữ mọi cửa sổ 20 s trong số giây của chế độ, có tính các tick gõ cũ rời cửa sổ trong lúc đó; hoặc khi 20 s qua không gõ gì (một từ dài hơn ngân sách vẫn tới, một mình). Lời gọi chỉ thắp khi một từ dài nhất của dải vừa; lời gọi SÁNG có từ chưa gõ chữ nào thì MỜ lại (trả từ, không mất gì) khi từ đó không còn vừa, kể cả từ kế của lời gọi đang khóa (lệch §5.2 "từ kế vẫn KHÓA": ở mép ngân sách lời gọi nhả khóa và chờ). Bắn mạnh và Xây vẫn đứng đầu hàng nhưng cũng chờ chỗ (lệch §5.3 "vượt mức thì chỉ cho power và build mở thêm"). Test: `td-calls` (cửa sổ đầy thì không gì thắp, từ chưa gõ mờ lại không mất gì; cửa sổ trống thì thắp theo ưu tiên tới trần; 8 s gõ từ lâu rời cửa sổ thì vừa, 8 s vừa gõ thì không).

**Biên trượt:** bot trượt và Backspace làm một từ dài hơn ước tính. Biên lớn thì cửa sổ an toàn nhưng tỉ lệ gõ Ngày giảm. Đo trên bản cuối, 20 seed, Cân bằng:

| `slipS` | Cửa sổ 20 s đầy nhất | Gõ Ngày | Gõ Đêm |
|---|---|---|---|
| 0,6 s | 8,72 s (hỏng) | 32,2 % | 21,7 % |
| 1,0 s | 8,68 s (hỏng) | 31,1 % | 20,5 % |
| **1,1 s (chọn)** | **8,00 s** | **30,6 %** | 20,2 % |
| 1,5 s | 8,00 s | 28,4 % (hỏng) | 20,7 % |
| 2,0 s | 7,87 s | 26,8 % (hỏng) | 19,4 % |

Hai cổng (≤ 8 s mọi cửa sổ, ≥ 30 % ban Ngày) sát nhau với một người gõ có trượt: mức đầy nhất 8 s là 40 %, nên trung bình 30 % đòi cửa sổ luôn gần đầy. Một từ trượt ba bốn lần ngay mép vẫn có thể vượt: ở Thư giãn (ngân sách 6 s, không là cổng) báo cáo có một cửa sổ 7,0 s, từ "right" trượt 4 lần (4,5 s).

### 5.5 Đổi luật (số trong `rules.ts`, mã ở `attention.ts`)

| Chỗ | Trước | Sau | Lý do |
|---|---|---|---|
| `attention.ts` | Thắp khi 20 s qua ≤ ngân sách; quá thì chỉ Bắn mạnh, Xây | Giữ ngân sách từng từ, nhìn trước (mục 5.4) | Cổng 5a: 17 s và 11 s trong 20 s |
| `CALL.paceK` | — | 1 | Thời gian khóa một từ ước theo TK 6.3 ở tốc E |
| `CALL.slipS` | — | 1,1 s | Biên cho phím trượt (bảng mục 5.4) |
| `TREE.chopS` | 20 s | 45 s | Lời gọi Chặt có thời gian được trả lời; không gõ thì Gỗ chậm hơn (cổng 7) |
| `TREE.wood` | 8 | 12 | Dân tự chặt ra 0,27 Gỗ/s (trước 0,4); 36 cây giữ 432 Gỗ, đủ tới Ngày 4 cho người gõ (cổng 5b ở Ngày 4) |

Đã thử mà không giữ: `ECONOMY.woodShare` 0,4 và 0,5 (Gỗ dư, Vàng thiếu; thêm ~0,5 điểm tỉ lệ gõ nhưng 0,5 cần nhiều Gỗ hơn cả bản đồ có), lời gọi Chặt 3 từ và Xây L 3 từ (cần khi còn giữ chỗ cả lời gọi; giữ từng từ thì 4 từ của §5.1 lại tốt hơn: nhiều từ hơn mỗi cây), Ruộng thứ hai (hạt 8 Vàng ra 5 Lúa bán 5 Vàng: lỗ Vàng, không giúp).

### 5.6 Cổng cứng §12 cuối R3

| Cổng | Kết quả |
|---|---|
| 1. `pnpm check` từng bước, `td-boundary` | `tsc` hai cấu hình sạch; `npx vitest run` 407 file, 2.693 đạt, 1 bỏ qua (TD 20 file, 227 test); `vite build` đạt (thư mục ngoài repo) |
| 2. Tất định | File vàng **làm lại** (luật sim đổi và bot chuẩn mới): 19.080 tick, 318 mã băm, 326 lệnh (có `callNight`: bot vàng gọi Đêm sau 60 s), 54 từ, 17 lời gọi Hoàn hảo; `--check` khớp. Chrome chạy nhật ký vàng ra đủ 318 mã băm (`td-1a6-perf`, hai cỡ); Node chạy lại nhật ký trang của `td-1a6-day`, `-night`, `-keyboard`, `-learn`, `-perf` ra đúng mã băm |
| 3. Bước sim ≤ 0,5 ms (300 quái, 20 cây, 9 dân, 4 Ruộng) | Node: trung vị 0,0097 ms, p95 0,012 ms; Chrome (`td-1a6-perf`): trung vị 0,01 ms, p95 0,04 ms |
| 4. Bot không gõ qua Đêm 1–4, Cân bằng, mọi seed | Đạt: mạng 10 / 13 / 13 / 10 / 9 (5 seed); 20 seed: thấp nhất 9 |
| 5. Bot gõ 35 WPM 95 % | Cửa sổ 20 s đầy nhất 7,95 s (5 seed; 20 seed 8,00 s); Ngày 30,3 %; Đêm 20,5 % |
| 6. Bất biến | Test thuộc tính `td-calls` xanh; mọi tick của mọi lượt bot (4 chế độ × 2 bot × 5 seed): 0 bất biến vỡ, 0 lệnh bị từ chối |
| 7. Gõ hơn không gõ ≥ 25 % sau 3 Ngày | 505 / 372 = +35,7 % (Thư giãn, Học +37 %, Thử thách +58 %) |
| 8. Kịch bản 1280 × 720 và 1920 × 1080 | Đạt cả 9 ở hai cỡ, không lỗi console (mục 5.7) |
| 9. Ngân sách mã ≤ 7.300 | 6.012 dòng |

Theo chế độ (5 seed, 4 đêm): Thư giãn và Học gõ Ngày 19 %, Đêm 15 % (ngân sách 6 s); Thử thách gõ Ngày 43 %, Đêm 31 %, bot không gõ thua Đêm 4 ở 1 trong 5 seed (Thử thách không là cổng 4). Lời gọi (Cân bằng, bot gõ, 5 seed): 424 tạo, 298 từng sáng, 254 có gõ, 176 gõ xong việc, 130 Hoàn hảo, 44 sáng mà bỏ qua; Xây ít sáng (30 tạo, 6 sáng): Tướng ít tới công trường, thợ tự xây.

### 5.7 Kịch bản trình duyệt (§12 cổng 8)

Chạy với `scripts/dev/vite.worktree.config.ts`, cổng 3140; phím thật qua CDP; mọi kịch bản kiểm không lỗi console, không ngoại lệ trang, và (trừ boot, IME) thẻ sống không chồng nhau, không đè bảng HUD, chữ ≥ 18 px, trong màn hình. Helper chung `td-1a6-common.mjs`.

| Kịch bản | Kiểm |
|---|---|
| `td-1a6-day` | Đặt sẵn, gõ 45 WPM: Gặt, Chặt, Xây đều xong bởi một từ gõ (`callEnd.finished`); Lúa, hạt, Gỗ, cây đổ, nhà đứng; Node chạy lại ra cùng mã băm |
| `td-1a6-night` | Shift + Enter gọi Đêm; từ Bắn mạnh gõ thật, lượt mạnh lên 3 rồi được tiêu, Phát Chữ bắn ra; hết Đêm còn mạng; chạy lại trên Node |
| `td-1a6-keyboard` | Một Ngày và một Đêm không một sự kiện chuột: Insert / Digit / Enter xây, Tab tới lời gọi mờ rồi Enter, Esc nhả khóa, Digit0 gọi về, Shift + `\` thuê dân, Shift + Enter; mọi lệnh trong nhật ký là lệnh phím; chạy lại trên Node |
| `td-1a6-attention` | Nhiều lời gọi (đặt sẵn, thêm công trường, cây đánh dấu); mỗi chế độ trên trang mới: sáng tối đa đúng trần (Thư giãn 2, Cân bằng 3, Thử thách 4), có lời gọi chờ khi trần đầy, lời gọi chờ sáng khi có chỗ; ~140 lần nhìn mỗi cỡ: 0 chồng, 0 đè HUD |
| `td-1a6-learn` | Chế độ Học: mọi thẻ có nghĩa trước phím đầu, dải chữ có nghĩa và IPA; hai từ Ẩu vào sổ ôn; Hỏi bài "khá, hơi · r _ _ _ _ _" gõ đúng: Tri thức lên, từ rời sổ; Space dừng và chạy tiếp (chờ 0,8 s sau chữ cuối: review R2) |
| `td-1a6-perf` | Làng bận (Lũy 4, 9 dân, 4 Ruộng, 20 cây đánh dấu, công trường) và Đêm đông (`flood(300)`), gõ 70 WPM 10 s: vẽ và thẻ p95 1,0 / 0,9 ms (1280 / 1920; trần 8 ms), bước và HUD p95 0,3 ms, 60 khung/s, luồng chính Chrome 1,2–1,3 ms/khung; bước sim trong Chrome trung vị 0,01 ms; nhật ký vàng chạy trong Chrome ra đủ mã băm của Node; nhật ký trang chạy lại trên Node |
| `td-1a6-tour` | Bộ ảnh cho chủ dự án (mục 5.8), mỗi ảnh kiểm đúng trạng thái của nó |
| `td-1a-boot` | Giữ từ 1A, đạt |
| `td-1a-ime` | Chuyển: `-` và `=` không còn ra lệnh; phần bộ gõ tiếng Việt giữ nguyên |

Thẻ đang khóa phóng ×1,2 từ mép dưới nhưng hộp cột tính chiều cao chưa phóng, nên đè cột bên 2–5 px (gặp ở `td-1a6-day` 1920, `td-1a6-tour`): `view/words/cards.ts` nay tính hộp cột tới đỉnh đã phóng của thẻ khóa; `day`, `night`, `tour` chặn thẻ sạch như `attention`.

### 5.8 Bộ ảnh cho chủ dự án (`td-1a6-tour`, 1280 × 720 và 1920 × 1080)

`01-village` (làng ban Ngày, zoom 1), `02-village-zoom` (zoom 2× vào làng, lời gọi xa thành mũi tên ở mép), `03-bright-calls` (lời gọi sáng, một từ đang gõ, thẻ nghĩa), `04-dim-bubbles` (Tướng bay đi, bong bóng mờ), `05-tab-dim-call` (Tab tới lời gọi mờ, thẻ dock), `06-farm-card`, `07-keep-card`, `08-learn` (nghĩa trên thẻ), `09-quiz`, `10-tactical-pause`, `11-night-power`, `12-night-charges`, `13-night-zoom` (khúc nhập 2× ban Đêm), `14-sandbox`. Ảnh nằm ở `OUT_DIR` (ngoài repo, không media trong Git).

### 5.9 Số dòng (cách đếm của §0: `.ts` trong `src/td`)

5.955 (sau review R2) → 6.012: `attention.ts` +45 (ngân sách từng từ), `rules.ts` +7 (hai số và chú thích), `cards.ts` +1. Bot, báo cáo, test và kịch bản không tính (`tests/td/*`, `tests/td-balance-gates.test.ts`, `scripts/visual/scenarios/td-1a6-*`: ~2.770 dòng).

### 5.10 Còn lại (cho review R3)

- Cổng 5a và 5b sát mép (mục 5.4): một bản gộp đổi luật sim nào cũng nên chạy lại `td:balance`; `td-balance-gates` sẽ báo.
- Thư giãn và Học: một cửa sổ 7,0 s trên ngân sách 6 s (một từ trượt 4 lần); không là cổng.
- Thử thách: bot không gõ thua Đêm 4 ở 1 / 5 seed; bot gõ qua cả 5.
- Lời gọi Xây ít khi sáng (thợ xây đứng xa Tướng); các bước nâng cấp của kế hoạch chuẩn chưa tới trong 4 đêm (thiếu Vàng).
- Từ R1: Bắn mạnh tạo cuối Đêm sống tối đa 3 s sang Ngày (vô hại).
