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

Mốc đang làm: **1A.4**. Test `td-boundary` đọc dòng này và cột "Cộng dồn tối đa" của mốc đó, rồi hỏng khi tổng vượt (ngoài trần cứng 5.500). Bắt đầu mốc mới thì đổi dòng trên trước khi viết mã.

| Mốc | Phần mới (ước lượng theo mã thật đã có) | Tối đa | Cộng dồn tối đa |
|---|---|---|---|
| 1A.2 Gõ lõi (xong, gồm sửa review) | 1.703 thật | — | 4.582 |
| 1A.3 Người và ô (xong, gồm sửa review) | 378 thật: 337 của mốc (mục 1.4: `nav/astar` 107, kho `agents` 36, hệ `agents` 174, `stream` −29, nối `commands` `world` `placement` `compile` `events` `main` +13, vẽ người, đường A*, dây +36) và 41 của bản sửa review 1A.3 (mục 1.6: `nav` +18, hệ `agents` +4, `debug-2d` +17, `cards` +2) | 340 + 41 | 4.960 |
| 1A.4 Điều khiển, HUD (xong, gồm sửa review) | 496 thật: 499 của mốc (mục 1.7; bản đầu đủ mục 5.3–5.4 dài 822, cắt UI theo mục 1.8) và −3 của bản sửa review 1A.4 (mục 1.10) | 500 | 5.460 |
| 1A.5 Bot, báo cáo | Bot, chính sách, báo cáo nằm ở `tests/` và `scripts/`; `src/` chỉ thêm móc đo | 40 | 5.500 |

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
- **Phím Insert:** bàn phím Mac và nhiều laptop gọn không có Insert, mà 1A chưa có đổi phím (TK 8.3 "mọi phím đổi được"). Không có Insert thì xây bằng chuột (nút Xây hoặc bấm đất), mọi việc khác vẫn có phím. Bước 6 của BUILD_NOW §8 (một đợt chỉ bằng bàn phím) vì vậy cần bàn phím có Insert. Thêm phím dự phòng là quyết định của chủ dự án (chưa thêm: TK chưa có phím nào khác cho xây, và mọi phím chữ để gõ).
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

Các cổng của một mốc:

```bash
npx tsc -p tsconfig.json --noEmit
npx vitest run
# server ở trên chạy nền, rồi:
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-boot.mjs --width=1280 --height=720
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-combat.mjs --width=1280 --height=720
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-stream.mjs --width=1280 --height=720
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-slots.mjs --width=1280 --height=720
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-keyboard-only.mjs --width=1280 --height=720
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-words-dense.mjs --width=1280 --height=720
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-ime.mjs --width=1280 --height=720
MAPS=halo-garden ISLANDS=0 URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense.mjs
```

Chạy thêm một lần mỗi kịch bản `td-1a-*` với `--width=1920 --height=1080`.

`td-1a-stream.mjs` gõ đợt 1 ở nhịp 4 s (mỗi lúc một từ), rồi cho tháp sang nhịp 1 s trong 12 s: đòi ≥ 2 từ sống cùng lúc và một lần đổi khóa mềm cố ý, chụp thêm `td-1a-stream-dense`. Tầng 2 cần 3–4 nhà bận nên để `td-1a-slots` (1A.3) kiểm.

`td-1a-slots.mjs` (1A.3) làm "Đặt sẵn 4 ô" bằng lệnh: Lũy cấp 4, 1.000 Vàng hộp cát, Tháp Pháo (7, 12), Tháp Cung (−8, 12), Trại Lính (3, 18) ở khúc nhập, Mỏ trên N3 (−34, 8); Draconis tới Pháo (ái lực), Chấm tới Cung, Phẩy tới Trại Lính, Gạch tới Mỏ (đúng sở trường). Chụp `td-1a-route` khi Gạch đang đi (đường A* nét đứt qua cầu nam), gõ 70 WPM, gọi đợt 1 khi Gạch tới mỏ, gọi đợt 2 ngay khi được, rồi cả bốn nhà nhịp 1 s trong 10 s; chụp `td-1a-four-slots` khi bốn nhà cùng có từ. Cặp tầng 2 cần ≤ 5 chữ đầu trống, tức 12 từ giữ chữ và 5 chữ đang nghỉ: bốn nhà nhịp 1 s chỉ chạm lúc đỉnh. Nên nếu chưa thấy cặp nào, pha cuối đặt E = 45 trong hộp cát và gõ 45 WPM, chờ tới khi có cặp, tối đa 120 s (Node, 60 seed: lúc này có khoảng 4 cặp mỗi phút, cặp đầu trong 60 s ở cả 60 seed); chụp `td-1a-tier2` và chặn bằng cổng `tier2PairOnScreen`: cả hai thẻ của cặp đều gạch chân hai chữ đầu (review 1A.3, mục 7). Mỗi lần nhìn đều kiểm thẻ: không chồng, chữ ≥ 18 px, trong vùng an toàn và không dưới chip HUD, chữ đầu không mơ hồ; từ review 1A.4, không thẻ nào chạm một bảng HUD (`cardsClearOfHudPanels`, phần chồng theo từng bảng in ở `cardsOverHud`). Đường của Gạch chỉ qua suối ở cầu. Với lệnh Vite thường, kịch bản này vẫn đạt (bằng từ dự phòng); `td-1a-boot` hỏng hai cổng phông như mục trên.

`td-1a-keyboard-only.mjs` (1A.4) chơi ba đợt chỉ bằng phím thật qua CDP, không một sự kiện chuột: Insert + Enter, Insert + Tab + Enter (hai Tháp Cung ở chỗ gợi ý), Insert + 3 + Enter (Trại Lính); Tab tới Tháp Cung đầu, Enter gửi Draconis, `=` nhịp dày hơn, Esc đóng thẻ, Shift+Enter gọi đợt; gõ 45 WPM; giữa hai đợt (sân trống, đợt kế đang đếm) Tab + Enter đưa Draconis sang Tháp Cung kia rồi gọi đợt kế. `__td` chỉ được đọc, nên mọi lệnh trong nhật ký đến từ phím; cổng `onlyKeyCommands` kiểm điều đó, cổng `nodeReplaysToBrowserHash` chạy lại nhật ký trên Node. Ảnh `td-1a-keyboard`.

`td-1a-words-dense.mjs` (1A.4) đặt bốn nhà trong 20 m (ba nhà của bố cục 4 ô và một Tháp Cung ở điểm trống gần giữa chúng nhất), mỗi nhà một người, nhịp 1 s; hai pha 20 s: E = 12 Dễ (từ 5 chữ sống 7,5 s) rồi E = 35 Thường; cứ ba lần nhìn thì gõ một phím, để có thẻ đang khóa (×1,2). Mỗi lần nhìn đo thẻ: không chồng, cột ≤ 240 px, tổng diện tích thẻ ≤ 6 % màn hình, chữ ≥ 18 px, trong màn hình, và (từ review 1A.4) không chạm bảng HUD nào (`cardsClearOfHudPanels`, `cardsOverHud`). Ảnh `td-1a-dense-easy`, `td-1a-dense-normal`.

`td-1a-combat.mjs` (1A.1; phần chuột từ review 1A.4) dựng bố cục chỉ bằng chuột thật qua CDP `Input.dispatchMouseEvent`: bấm trái lên đất mở menu xây, nhà mờ ở đó (ảnh `td-1a-mouse-menu`); bấm hàng "Trại Lính" của menu khi cần; bấm trái lần nữa để xây. Rồi nút Xây, rê nhà mờ vào vòng 11 m quanh Lũy: vòng đỏ và chip lý do (`td-1a-mouse-ghost-red`); bấm phải đóng menu. Chờ 3,3 s (xây xong, hết hồi ân hạn), bấm trái lên Tháp Cung đầu: thẻ nhà, có ân hạn (`td-1a-mouse-card`); bấm phải lên nó gửi Draconis, bấm phải lên đất dời Draconis; lăn chuột zoom quanh Tháp Cung thứ hai (`td-1a-mouse-zoom`), kéo bản đồ; nút 2× và nút gọi đợt của HUD. Cổng: ba lệnh `build` đúng chỗ (±0,25 m), chỗ đỏ có lý do `keep`, bấm phải trong menu chỉ đóng menu, thẻ mở bằng bấm có ân hạn, `assignUnit` và `move` của Draconis có trong nhật ký, zoom và kéo không ra lệnh nào, nút HUD đều tìm thấy; rồi như trước: lính chặn, hạ quái, hai đợt kết thúc, Node chạy lại ra đúng mã băm. Chỗ bấm tính theo cách `main.ts` và `DebugView.resize` đặt bản đồ ở zoom 1 (sân 100 m trên dải 60 px × `--hud`).

`td-1a-ime.mjs` (1A.4, theo `campaign3d-ime.mjs`): kiểu UniKey / EVKey (chữ đầu, Backspace, chữ có dấu không mã phím: Telex "aa", "dd", "ee", VNI "a1", "o6", số của VNI không tới trang) và kiểu bộ gõ hệ điều hành (phím "Process", keyCode 229, có cả số); rồi `Digit2`, `Digit4`, `Digit1`, `Backquote` hai lần ngay sau một chữ có dấu, Tab hai lần, `=`, `-`, Enter. Cổng: phím tiếng Việt chỉ ra lệnh `key` và `backspace`, không đổi người đang chọn, thẻ hay menu; HUD nhắc tắt bộ gõ; số chọn người; Backquote bước sang người kế và không gõ gì; Tab, `=` / `-`, Enter ra đúng lệnh. Đây là phím giả qua CDP: không thay được kiểm tra UniKey và EVKey thật (BUILD_NOW §8). Ảnh `td-1a-ime`.

`td-1a-combat.mjs`, `td-1a-stream.mjs` và `td-1a-slots.mjs` ghi `td-1a-<tên>-replay-<cỡ>.json` (seed, mã nội dung, mã bộ từ, nguồn từ, tick, mã băm, nhật ký lệnh) vào `OUT_DIR` rồi tự chạy `scripts/td/replay.ts` trên Node. `td-1a-stream` gõ phím thật qua CDP (`WPM=40` mặc định, đổi được bằng biến môi trường), nên nhật ký của nó có lệnh `key` và chạy lại kiểm cả phần gõ. Cổng `nodeReplaysToBrowserHash` đạt khi Node ra đúng mã băm của Chrome (BUILD_NOW §7 cổng 4). Chạy lại bằng tay:

```bash
node --import tsx scripts/td/replay.ts <thư mục tạm>/td-1a-combat-replay-1280x720.json
```
