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

Mốc đang làm: **1A.5**. Test `td-boundary` đọc dòng này và cột "Cộng dồn tối đa" của mốc đó, rồi hỏng khi tổng vượt (ngoài trần cứng 5.500). Bắt đầu mốc mới thì đổi dòng trên trước khi viết mã.

| Mốc | Phần mới (ước lượng theo mã thật đã có) | Tối đa | Cộng dồn tối đa |
|---|---|---|---|
| 1A.2 Gõ lõi (xong, gồm sửa review) | 1.703 thật | — | 4.582 |
| 1A.3 Người và ô (xong, gồm sửa review) | 378 thật: 337 của mốc (mục 1.4: `nav/astar` 107, kho `agents` 36, hệ `agents` 174, `stream` −29, nối `commands` `world` `placement` `compile` `events` `main` +13, vẽ người, đường A*, dây +36) và 41 của bản sửa review 1A.3 (mục 1.6: `nav` +18, hệ `agents` +4, `debug-2d` +17, `cards` +2) | 340 + 41 | 4.960 |
| 1A.4 Điều khiển, HUD (xong, gồm sửa review) | 496 thật: 499 của mốc (mục 1.7; bản đầu đủ mục 5.3–5.4 dài 822, cắt UI theo mục 1.8) và −3 của bản sửa review 1A.4 (mục 1.10) | 500 | 5.460 |
| 1A.5 Bot, báo cáo (xong) | 41 thật (mục 1.11): op hộp cát `flood` (TK 25.12) ở `spawn.ts` +19 và `commands.ts` +6, đo khung ở `main.ts` +16; bot, chính sách, báo cáo nằm ở `tests/` và `scripts/` | 40 | 5.500 |

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
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-perf.mjs --width=1280 --height=720
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-tour.mjs --width=1280 --height=720
MAPS=halo-garden ISLANDS=0 URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense.mjs
```

Chạy thêm một lần mỗi kịch bản `td-1a-*` với `--width=1920 --height=1080` (trừ `td-1a-tour`, bộ ảnh 1280 × 720).

Bot và báo cáo (1A.5), trong worktree gọi thẳng bằng `node` (mục 1.12):

```bash
node --import tsx scripts/td/balance.ts [--seeds=3] [--waves=6]   # pnpm td:balance
node --import tsx scripts/td/golden.ts [--check] [--fresh-words]   # pnpm td:golden:update
```

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

`td-1a-perf.mjs` (1A.5, BUILD_NOW §7 cổng 4 và 5): "Đặt sẵn 4 ô", đợi bốn người tới, cả bốn nhà nhịp 1 s (vặn từng nhà, cách 0,35 s), gọi đợt 1, rồi `__td.flood(300)`; gõ thật 70 WPM qua CDP trong 10 s và đọc `__td.costs()` của đúng các khung trong cửa sổ đó (đếm khung bằng một vòng `requestAnimationFrame` riêng). Cổng: phần vẽ (bản 2D và thẻ chữ) p95 ≤ 8 ms trên ≥ 200 khung, quái trên sân ≥ 240 suốt cửa sổ, bốn nhà cùng phát; Node làm lại lượt vàng (`scripts/td/golden.ts --check --log`), rồi trang chạy đúng nhật ký đó bằng chính các module `/src` mà Vite phục vụ, mỗi mã băm 60 tick phải bằng của Node; nhật ký của trang (gồm `flood`) chạy lại trên Node ra đúng `__td.hash()`. Ảnh `td-1a-perf`.

`td-1a-tour.mjs` (1A.5): bộ ảnh cho chủ dự án ở 1280 × 720, một lượt, từ vựng thật, gõ thật, bảng hộp cát ẩn (F9) trừ ảnh của nó: `1-placement` (menu xây, nhà mờ cạnh đường, vòng tầm), `2-tempo-card` (thẻ nhà có núm nhịp, đặt 2 s), `3-one-slot` (một Tháp Cung, Draconis trên mái, hai từ bay), `4-three-slots` (ba nhà phát, E = 55), `5-four-slots` (bốn nhà, Gạch ở mỏ bên kia suối), `6-sandbox` (bảng hộp cát), `7-wave` (đợt 4: hai Thuồng Luồng, lính, đạn). Cổng: mỗi ảnh chụp đúng trạng thái của nó, không lệnh nào bị từ chối, không lỗi console.
