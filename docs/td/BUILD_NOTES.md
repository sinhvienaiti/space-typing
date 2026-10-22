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

### 1.2 Phần cho từng mốc còn lại (ước lượng lại sau review 1A.2)

Mốc đang làm: **1A.3**. Test `td-boundary` đọc dòng này và cột "Cộng dồn tối đa" của mốc đó, rồi hỏng khi tổng vượt (ngoài trần cứng 5.500). Bắt đầu mốc mới thì đổi dòng trên trước khi viết mã.

| Mốc | Phần mới (ước lượng theo mã thật đã có) | Tối đa | Cộng dồn tối đa |
|---|---|---|---|
| 1A.2 Gõ lõi (xong, gồm sửa review) | 1.703 thật | — | 4.582 |
| 1A.3 Người và ô (xong) | 337 thật (mục 1.4): `nav/astar` 107, kho `agents` 36, hệ `agents` 174, `stream` −29, nối `commands` `world` `placement` `compile` `events` `main` +13, vẽ người, đường A*, dây +36 | 340 | 4.922 |
| 1A.4 Điều khiển, HUD | Kê từng phần: phím lệnh ở `app/input` +75 (hôm nay 35); `app/selection` + chỗ trống gợi ý trong sim 80; chuột và camera 70; thanh nhà (nhịp, gửi, tập kết, hoàn tác, cấp, "Mỗi từ", gợi ý nhịp) gộp với menu xây 85; thanh 4 chân dung 35; HUD (chuyển chip trạng thái ra khỏi `main.ts`, −25) 30; chip Tải, Chuỗi 30; hộp cát 50; CSS 45; ân hạn ra lệnh 5. Cộng 505, nên cắt theo BUILD_NOW §10 trước khi làm: danh sách rê chuột của chip Tải là `title`, hộp cát dựng từ một bảng điều khiển | 500 | 5.422 |
| 1A.5 Bot, báo cáo | Bot, chính sách, báo cáo nằm ở `tests/` và `scripts/`; `src/` chỉ thêm móc đo | 40 | 5.462 |

- Còn 38 dòng tới trần cứng 5.500. Mục tiêu 5.000 không giữ được; BUILD_NOW §2 cho vượt mục tiêu nhưng không vượt trần.
- Mốc nào vượt phần của mình thì bù ngay trong mốc đó, không đẩy sang mốc sau. Test chặn theo cột "Cộng dồn tối đa", nên vượt là đỏ ngay trong mốc.

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

| Nhóm | Sau sửa review 1A.2 | Sau 1A.3 | Đổi |
|---|---|---|---|
| Trang, Platform | 87 | 87 | 0 |
| Nội dung | 571 | 572 | +1 (`hero` đã biên dịch) |
| Gõ thuần | 453 | 453 | 0 |
| Sim lõi (`sim/*.ts`) | 774 | 786 | +12 |
| Kho | 331 | 367 | +36 (`agents`) |
| Đường (`nav/`) | 108 | 215 | +107 (`astar`) |
| Hệ chiến đấu | 585 | 585 | 0 |
| Hệ gõ (gồm `agents` theo BUILD_NOW §2) | 629 | 774 | +145 (`agents` 174, `stream` −29) |
| App | 330 | 330 | 0 (`state()` dựng bằng `live().map`, thêm người) |
| View, UI | 714 | 750 | +36 |
| **Tổng** | **4.582** | **4.919** | **+337 / 340** |

Bản đầu của 1A.3 dài 5.013 dòng (vượt 91 trước khi có phần vẽ). Để vừa phần 340 dòng, không cắt luật nào của TK 25.9 và BUILD_NOW §3.4; đã đổi:

- Kiểm tầm nhìn (kéo dây) lấy mẫu dưới 1 m một bước và cho mỗi bước qua `grid.open` (qua góc thì hai ô bên cũng phải trống), thay cho duyệt ô chính xác: vẫn không bao giờ cắt ô chặn hay góc chặn (test `td-nav` dò từng đoạn bằng bước 5 mm).
- A* tìm từ đích về người đi, nên đọc cha từ người đi ra đúng thứ tự đi, không cần đảo mảng.
- Đặt nhà thì mọi Thư Đồng đang đi tìm đường lại (TK: chỉ người bị cắt). Cùng kết quả cho người bị cắt; người không bị cắt có thể đổi sang đường dài bằng. Một lần A* ≤ 0,13 ms (trung vị).
- Đường chỉ tính khi ra lệnh (bước 1), không có cờ "tìm lại ở bước 3".
- `move` (Tướng tới một điểm) dời sang 1A.4 cùng chuột phải vào đất: BUILD_NOW §4 ghi là lệnh 1A, nhưng mục 1A.3 ở §1 không có.
- Đốm sáng chạy dọc dây trợ lực mỗi phím đúng (BUILD_NOW §5.1) chưa vẽ: cần view đọc sự kiện phím. Để 1A.4 hoặc 1C.
- Bỏ `KEEP_SLOT` không ai dùng; `stream.ts` mất phần người có mặt ngay (−29).

Còn 3 dòng tới cột "Cộng dồn tối đa" của 1A.3, cho bản sửa review. Phần của 1A.4 (500) và 1A.5 (40) không đổi; còn 38 dòng tới trần 5.500.

### 1.5 Lệch so với BUILD_NOW, TK ở 1A.3 (có lý do)

- **Chỗ đứng trợ lực:** Thư Đồng ở ổ (mép vòng + 1 m, phía Lũy); Draconis đậu trên mép mái phía Lũy (đúng bán kính nhà), để hình tam giác không che chữ cái của nhà. Lũy tự nó không có "phía Lũy": ổ của Lũy quay về nam (đất trống, xa đường).
- **Vào và ra việc đo từ chỗ đứng:** vào khi đứng trên đất trong 3,0 m (Draconis: sau khi hạ cánh xong); ra khi xa quá 4,5 m. TK 8.4 đo "từ mép vòng", TK 25.9 và BUILD_NOW §3.4 đo "của ổ": theo ổ. Có trễ giữa 3,0 và 4,5 m: người được gửi đi vẫn trợ lực tới khi xa 4,5 m (Draconis: 0,6 s cất cánh + 0,75 s bay); tới nhà mới trước thì nhà cũ ngắt trước.
- **Nghỉ ở đâu:** Thư Đồng đứng một hàng cách Lũy 5,5 m về phía tây, cách nhau 2,4 m (TK 23.7 "đứng cạnh Lũy"; `ASSIST.homeSideM`, `homeGapM`). Draconis nghỉ ở chỗ đứng trợ lực Lũy (mép mái nam), nên gửi tới Lũy từ chỗ nghỉ không phải bay.
- **Đổi chỗ khi người gửi đi không có nhà:** người bị thay về chỗ nghỉ.
- **Lệnh mới lúc đang hạ cánh:** cất cánh lại (0,6 s). Lúc đang cất cánh hay đang bay: đổi đích trên không.
- **Tướng tự đánh:** chỉ khi đứng trên đất và không trợ lực (không đánh lúc cất, bay, hạ); cầu lửa vào quái đi xa nhất trong 9 m, không nhận hào quang. Quái không đánh Draconis (1A).
- **Thư Đồng bị nhà mới đè lên** (đang đi qua đúng chỗ đặt): lùi ra theo bán kính tới r + 0,75 m (ô của nó chắc chắn trống) rồi tìm đường lại. TK 12.5 không có bước kiểm người đứng.
- **Hoàn tác nhà đang được trợ lực:** dây trợ lực ngắt ngay (nhà mất), người được gửi tới đó về chỗ nghỉ; đường tính sau khi ô của nhà đã mở.
- **Hạ cấp Lũy trong hộp cát:** người ở ô đã đóng về chỗ nghỉ; trợ lực ngắt khi xa 4,5 m như mọi lần rời. Lệnh cho ô đóng bị từ chối (`noSlot`). Thư Đồng ở ô đóng không vẽ khi đứng ở chỗ nghỉ (TK 23.7: mở ô thì "Thư Đồng chạy ra").
- **Sự kiện:** `agentOrdered`, `agentArrived`, `agentLeft` (TK 25.11) thay sự kiện `assist` của 1A.2.
- **Test 1A.2 đổi theo:** `assisted()` chờ mọi người tới nơi; `td-letters` cài `Letters` riêng trước từ đầu tiên (Lũy phát trong lúc Thư Đồng còn đi) và nhận các từ đang sống lúc bắt đầu; `td-sim-perf`, `td-aura`, `td-heat-chain` chờ người tới trước khi đo.

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
MAPS=halo-garden ISLANDS=0 URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense.mjs
```

Chạy thêm một lần mỗi kịch bản `td-1a-*` với `--width=1920 --height=1080`.

`td-1a-stream.mjs` gõ đợt 1 ở nhịp 4 s (mỗi lúc một từ), rồi cho tháp sang nhịp 1 s trong 12 s: đòi ≥ 2 từ sống cùng lúc và một lần đổi khóa mềm cố ý, chụp thêm `td-1a-stream-dense`. Tầng 2 cần 3–4 nhà bận nên để `td-1a-slots` (1A.3) kiểm.

`td-1a-slots.mjs` (1A.3) làm "Đặt sẵn 4 ô" bằng lệnh: Lũy cấp 4, 1.000 Vàng hộp cát, Tháp Pháo (7, 12), Tháp Cung (−8, 12), Trại Lính (3, 18) ở khúc nhập, Mỏ trên N3 (−34, 8); Draconis tới Pháo (ái lực), Chấm tới Cung, Phẩy tới Trại Lính, Gạch tới Mỏ (đúng sở trường). Chụp `td-1a-route` khi Gạch đang đi (đường A* nét đứt qua cầu nam), gõ 70 WPM, gọi đợt 1 khi Gạch tới mỏ, gọi đợt 2 ngay khi được, rồi cả bốn nhà nhịp 1 s trong 10 s; chụp `td-1a-four-slots` khi bốn nhà cùng có từ. Mỗi lần nhìn đều kiểm thẻ: không chồng, chữ ≥ 18 px, trong vùng an toàn và không dưới chip HUD, chữ đầu không mơ hồ. Đường của Gạch chỉ qua suối ở cầu. Với lệnh Vite thường, kịch bản này vẫn đạt (bằng từ dự phòng); `td-1a-boot` hỏng hai cổng phông như mục trên.

`td-1a-combat.mjs`, `td-1a-stream.mjs` và `td-1a-slots.mjs` ghi `td-1a-<tên>-replay-<cỡ>.json` (seed, mã nội dung, mã bộ từ, nguồn từ, tick, mã băm, nhật ký lệnh) vào `OUT_DIR` rồi tự chạy `scripts/td/replay.ts` trên Node. `td-1a-stream` gõ phím thật qua CDP (`WPM=40` mặc định, đổi được bằng biến môi trường), nên nhật ký của nó có lệnh `key` và chạy lại kiểm cả phần gõ. Cổng `nodeReplaysToBrowserHash` đạt khi Node ra đúng mã băm của Chrome (BUILD_NOW §7 cổng 4). Chạy lại bằng tay:

```bash
node --import tsx scripts/td/replay.ts <thư mục tạm>/td-1a-combat-replay-1280x720.json
```
