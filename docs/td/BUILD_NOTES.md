# Ghi chú khi làm 1A

Đi kèm `BUILD_NOW.md`. Cập nhật cuối mỗi mốc.

---

## 1. Ngân sách dòng (BUILD_NOW §2)

Đếm bằng `wc -l` trên `td.html`, `src/platform/rng.ts` và mọi file trong `src/td/`. Không tính test, kịch bản, `scripts/`. Test `td-boundary` đọc trần cứng 5.500 từ BUILD_NOW §2 và hỏng khi tổng vượt.

### 1.1 Sau 1A.2

| Nhóm | Kế hoạch | Sau 1A.1 | Sau 1A.2 | Còn lại |
|---|---|---|---|---|
| Trang (`td.html`) | 30 | 18 | 18 | 12 |
| Platform (`rng.ts`) | 50 | 69 | 69 | −19 |
| Nội dung | 800 | 644 | 654 | 146 |
| Gõ thuần (`typing/`) | 700 | 0 | 441 | 259 |
| Sim lõi (`sim/*.ts`) | 550 | 671 | 779 | −229 |
| Kho | 250 | 259 | 330 | −80 |
| Đường (`nav/`) | 200 | 108 | 108 | 92 |
| Hệ chiến đấu | 450 | 534 | 586 | −136 |
| Hệ gõ | 600 | 0 | 598 | 2 |
| App | 450 | 199 | 330 | 120 |
| View, UI | 900 | 377 | 788 | 112 |
| **Tổng** | **4.980** | **2.879** | **4.701** | **799 tới trần 5.500** |

1A.2 tiêu 1.822 dòng, vượt phần 1.580 của mình 242 dòng. Đã thu gọn trong mốc (cột của kho tự về 0 khi lấy ô trong `Slots.take`, CSS thẻ chữ một luật một dòng, kiểu `Typing` suy ra từ hàm tạo), nhưng chưa bù hết. Phần vượt nằm ở chỗ nối vào mã có sẵn: kho thêm cột (nhà: nhịp, lịch phát, Nhiệt, 5 từ gần nhất; quái: cháy; đạn: từ; lính: lính tạm), `world.ts`, `commands.ts`, `combat.ts`, `main.ts`.

### 1.2 Phần cho từng mốc còn lại (tính lại sau 1A.2)

| Mốc | Phần mới | Tối đa | Cộng dồn tối đa |
|---|---|---|---|
| 1A.3 Người và ô | `nav/astar` 90; kho `agents` 40; hệ `agents` 80 (gọi `setAssist` trong `systems/stream.ts` khi tới ổ); vẽ người, dây 60 | 270 | 4.971 |
| 1A.4 Điều khiển, HUD | `app/{selection,sandbox}` + phần còn lại của `app/input` 150; `ui/*` 330 | 480 | 5.451 |
| 1A.5 Bot, báo cáo | Bot, chính sách, báo cáo nằm ở `tests/` và `scripts/` | 40 | 5.491 |

- 1A.4 có 480 thay vì 640: làm theo BUILD_NOW §10 ngay từ đầu (vòng menu nhà thành thanh đơn giản, bỏ kéo chân dung). Không cắt luật, không cắt test.
- Mốc nào vượt phần của mình thì bù ngay trong mốc đó, không đẩy sang mốc sau.

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

`td-1a-combat.mjs` và `td-1a-stream.mjs` ghi `td-1a-<tên>-replay-<cỡ>.json` (seed, mã nội dung, mã bộ từ, nguồn từ, tick, mã băm, nhật ký lệnh) vào `OUT_DIR` rồi tự chạy `scripts/td/replay.ts` trên Node. `td-1a-stream` gõ phím thật qua CDP (`WPM=40` mặc định, đổi được bằng biến môi trường), nên nhật ký của nó có lệnh `key` và chạy lại kiểm cả phần gõ. Cổng `nodeReplaysToBrowserHash` đạt khi Node ra đúng mã băm của Chrome (BUILD_NOW §7 cổng 4). Chạy lại bằng tay:

```bash
node --import tsx scripts/td/replay.ts <thư mục tạm>/td-1a-combat-replay-1280x720.json
```
