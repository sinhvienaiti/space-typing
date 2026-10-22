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

Mốc đang làm: **1A.2**. Test `td-boundary` đọc dòng này và cột "Cộng dồn tối đa" của mốc đó, rồi hỏng khi tổng vượt (ngoài trần cứng 5.500). Bắt đầu mốc mới thì đổi dòng trên trước khi viết mã.

| Mốc | Phần mới (ước lượng theo mã thật đã có) | Tối đa | Cộng dồn tối đa |
|---|---|---|---|
| 1A.2 Gõ lõi (xong, gồm sửa review) | 1.703 thật | — | 4.582 |
| 1A.3 Người và ô | `nav/astar` 90 (heap trên mảng có sẵn, kéo dây; cỡ `grid` 69 + `connectivity` 39); kho `agents` 40 (cỡ `units` 49); hệ `agents` 130 (đi, bay cất/hạ, vào việc, ra, đổi chỗ, tính lại đường, Draconis tự đánh; cỡ `block` 136); nối `commands`, `world` 20; vẽ người, đường A*, dây 60 (cỡ khối `buildings()` của `debug-2d`, 42) | 340 | 4.922 |
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
MAPS=halo-garden ISLANDS=0 URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense.mjs
```

Chạy thêm một lần mỗi kịch bản `td-1a-*` với `--width=1920 --height=1080`.

`td-1a-stream.mjs` gõ đợt 1 ở nhịp 4 s (mỗi lúc một từ), rồi cho tháp sang nhịp 1 s trong 12 s: đòi ≥ 2 từ sống cùng lúc và một lần đổi khóa mềm cố ý, chụp thêm `td-1a-stream-dense`. Tầng 2 cần 3–4 nhà bận nên để `td-1a-slots` (1A.3) kiểm.

`td-1a-combat.mjs` và `td-1a-stream.mjs` ghi `td-1a-<tên>-replay-<cỡ>.json` (seed, mã nội dung, mã bộ từ, nguồn từ, tick, mã băm, nhật ký lệnh) vào `OUT_DIR` rồi tự chạy `scripts/td/replay.ts` trên Node. `td-1a-stream` gõ phím thật qua CDP (`WPM=40` mặc định, đổi được bằng biến môi trường), nên nhật ký của nó có lệnh `key` và chạy lại kiểm cả phần gõ. Cổng `nodeReplaysToBrowserHash` đạt khi Node ra đúng mã băm của Chrome (BUILD_NOW §7 cổng 4). Chạy lại bằng tay:

```bash
node --import tsx scripts/td/replay.ts <thư mục tạm>/td-1a-combat-replay-1280x720.json
```
