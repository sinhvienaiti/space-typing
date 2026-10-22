# Ghi chú khi làm 1A

Đi kèm `BUILD_NOW.md`. Cập nhật cuối mỗi mốc.

---

## 1. Ngân sách dòng (BUILD_NOW §2)

Đếm bằng `wc -l` trên `td.html`, `src/platform/rng.ts` và mọi file trong `src/td/`. Không tính test, kịch bản, `scripts/`. Test `td-boundary` đọc trần cứng 5.500 từ BUILD_NOW §2 và hỏng khi tổng vượt.

### 1.1 Sau 1A.1 (đã sửa theo review)

| Nhóm | Kế hoạch | Đã dùng | Còn lại |
|---|---|---|---|
| Trang (`td.html`) | 30 | 18 | 12 |
| Platform (`rng.ts`) | 50 | 69 | −19 |
| Nội dung | 800 | 644 | 156 |
| Gõ thuần (`typing/`) | 700 | 0 | 700 |
| Sim lõi (`sim/*.ts`) | 550 | 671 | −121 |
| Kho | 250 | 259 | −9 |
| Đường (`nav/`) | 200 | 108 | 92 |
| Hệ chiến đấu | 450 | 534 | −84 |
| Hệ gõ | 600 | 0 | 600 |
| App | 450 | 199 | 251 |
| View, UI | 900 | 377 | 523 |
| **Tổng** | **4.980** | **2.879** | **2.101** |

Ba nhóm đã vượt kế hoạch (sim lõi, kho, hệ chiến đấu: tổng −214). Nếu mọi nhóm chưa làm tiêu đúng kế hoạch, tổng cuối khoảng 5.200: vượt mục tiêu 5.000, còn dưới trần 5.500 khoảng 300 dòng.

### 1.2 Phần cho từng mốc còn lại

| Mốc | Phần mới | Tối đa | Cộng dồn tối đa |
|---|---|---|---|
| 1A.2 Gõ lõi | `typing/*` 700; hệ `stream`, `words`, `heat`, `chain`, `rewards`, `aura` 520; kho `words` 40; thẻ chữ, `audio-min` 260; `app/vocab` 60 | 1.580 | 4.459 |
| 1A.3 Người và ô | `nav/astar` 90; kho `agents` 40; hệ `agents` 80; vẽ người, dây 60 | 270 | 4.729 |
| 1A.4 Điều khiển, HUD | `app/{input,selection,sandbox}` 190; `ui/*` 450 | 640 | 5.369 |
| 1A.5 Bot, báo cáo | Bot, chính sách, báo cáo nằm ở `tests/` và `scripts/` | 50 | 5.419 |

- Mốc nào vượt phần của mình thì bù ngay trong mốc đó, không đẩy sang mốc sau.
- Chạm trần: cắt UI trước (BUILD_NOW §10): vòng menu nhà thành thanh đơn giản, bỏ kéo chân dung. Không cắt luật, không cắt test.
- Vòng lặp nguội (lệnh, kiểm đặt nhà, cuối đợt, `__td`) dùng `Slots.live(from)`. Hệ chạy mỗi tick vẫn lặp thẳng theo ô để không cấp phát.

---

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
- file `public/` nào worktree không có thì đọc từ `public/` của bản checkout chính, chỉ đọc. File của worktree vẫn được ưu tiên.

Các cổng của một mốc:

```bash
npx tsc -p tsconfig.json --noEmit
npx vitest run
# server ở trên chạy nền, rồi:
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-boot.mjs --width=1280 --height=720
URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-combat.mjs --width=1280 --height=720
MAPS=halo-garden ISLANDS=0 URL=http://127.0.0.1:3110/ OUT_DIR=<thư mục tạm> node scripts/visual/cdp-run.mjs scripts/visual/scenarios/defense.mjs
```

Chạy thêm một lần mỗi kịch bản `td-1a-*` với `--width=1920 --height=1080`.

`td-1a-combat.mjs` ghi `td-1a-combat-replay-<cỡ>.json` (seed, mã nội dung, tick, mã băm, nhật ký lệnh) vào `OUT_DIR` rồi tự chạy `scripts/td/replay.ts` trên Node. Cổng `nodeReplaysToBrowserHash` đạt khi Node ra đúng mã băm của Chrome (BUILD_NOW §7 cổng 4). Chạy lại bằng tay:

```bash
node --import tsx scripts/td/replay.ts <thư mục tạm>/td-1a-combat-replay-1280x720.json
```
