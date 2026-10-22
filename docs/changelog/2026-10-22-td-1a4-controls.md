# 2026-10-22 — Typing Defense 1A.4: điều khiển, HUD, hộp cát

> **Commit:** `feat(td): 1A.4 controls, HUD and sandbox …` trên nhánh `feat/td-1a` (worktree `games/.wt-td-1a`), sau `67bef07d`.
> **Kế hoạch:** [`docs/td/BUILD_NOW.md`](../td/BUILD_NOW.md) §1 mốc 1A.4, §5.3–5.4; ghi chú, phần UI đã cắt và các lệch có lý do ở [`docs/td/BUILD_NOTES.md`](../td/BUILD_NOTES.md) mục 1.7, 1.8, 1.9.

## Yêu cầu

Mốc 1A.4 "Điều khiển, HUD, hộp cát": chuột, bàn phím đủ đường, menu xây, menu nhà có núm nhịp, thanh trợ lực 4 chân dung, chip Tải, bộ đếm Chuỗi, ân hạn ra lệnh, bảng hộp cát. Xong khi test đầu vào xanh và `td-1a-keyboard-only.mjs`, `td-1a-words-dense.mjs`, `td-1a-ime.mjs` đạt. Máy bàn từ 1280 × 720; gọn, dễ đọc, dùng phông của game.

## Đã làm

- **Bàn phím** (`app/input.ts`): mọi phím lệnh đọc theo `event.code`, chữ cái theo `event.key`, nên chữ cái không bao giờ thành lệnh; bỏ phím bộ gõ đang ghép, phím giữ lặp (trừ mũi tên), Ctrl / Alt / Meta, sự kiện giả. Phím và nút HUD gọi cùng một tên việc: chọn người (`1`–`4`, `` ` ``), gọi về (`0`), tô nhà (Tab, Shift+Tab), gửi (Enter), nhịp (`−` `=`, Shift: Dừng tất cả / trả lại), xây (Insert: chỗ gợi ý, Tab đổi chỗ, số chọn nhà, Enter xây), gọi đợt (Shift+Enter), Esc (nhả khóa → đóng menu → về Tướng → tạm dừng), Pause, F9, mũi tên.
- **Chuột:** bấm trái mở thẻ nhà hoặc menu xây ở chỗ đất trống, bấm trong menu xây thì xây (nhà mờ theo chuột, vòng đỏ và lý do khi không đặt được); bấm phải gửi người đang chọn tới nhà, hoặc tới đứng ở một điểm (lệnh `move` mới); lăn chuột zoom 1–2,5× quanh con trỏ, kéo trái hoặc giữa để kéo bản đồ.
- **Người đang cầm** (`app/selection.ts`): người được chọn, nhà đang mở thẻ, menu xây; mở thẻ hay menu là xin ân hạn ra lệnh (`uiFocus`), đóng hết là thôi.
- **HUD** (`ui/hud.ts`, `ui/team-bar.ts`, `ui/build-menu.ts`, `ui/td.css`): bảng giấy viền mực ở lề hai bên bản đồ và dải dưới. Trên trái: Mạng, Vàng, Đợt n/N và giây tới đợt kế, nút gọi sớm (+vàng), tạm dừng, âm, F9. Dưới trái: 4 chân dung có số phím, huy hiệu nhà đang trợ lực (nét đứt khi đang đi), ô khóa ghi "Lũy n"; chip Tải xanh ngọc / hổ phách / cam. Dưới giữa: Dải Chữ gọn (từ đang khóa, phần đã gõ xanh ngọc; lý do khi lệnh bị từ chối) và Chuỗi với 4 nấc bậc. Dưới phải: thẻ nhà (ai trợ lực, núm nhịp Dừng / 8 / 6 / 4 / 3 / 2 / 1, nấc chưa mở mờ, gửi, hoàn tác 5 s, cấp L1–L3 của hộp cát, gợi ý nhịp) hoặc menu xây (số phím, giá, nhà thiếu vàng mờ); nút Xây và Dừng tất cả.
- **Hộp cát** (`app/sandbox.ts`, F9): cấp Lũy 1–4, +100 / +1000 vàng, E ±1 / ±5 (12–140), độ khó, cấp từ vựng 1 / 1–3 / 1–5, tốc game 0,75 / 1 / 2, "Đặt sẵn 4 ô", sinh đợt. Mỗi nút là lệnh `sandbox`, nên nhật ký chạy lại khớp.
- **Sim:** lệnh `move`; op hộp cát `preset` đọc bố cục 4 ô từ dữ liệu bản đồ; `freeSpots` (chỗ trống gợi ý cho Insert: lưới 2 m sát đường mà `canPlace` cho, gần khúc cua trước; mỏ là node trống).
- **Bản vẽ:** camera zoom và kéo; vòng xanh ngọc quanh nhà đang mở thẻ và người đang chọn; nhà mờ của menu xây với tầm bắn; đốm sáng chạy dọc dây trợ lực theo phần đã gõ của từ đang khóa. Thẻ chữ nằm trên lớp HUD: không bao giờ bị che.
- **Thẻ chữ không chồng ở mọi khung:** cột thẻ phải tránh nhau thì tách ngay, chỉ lúc về mới theo lò xo 150 ms; thẻ đang khóa được tính cỡ lúc gõ ngay từ chữ đầu. `td-1a-slots` ở 1920 × 1080 trước đó bắt được thẻ chồng một lần mỗi lần chạy (3 / 3), vì bản đồ nhỏ đi 7 % để chừa Dải Chữ.
- Test mới `tests/td-input.test.ts` (14 test: mã phím, chữ cái, bộ gõ, đường bàn phím cho mọi việc trong đợt chạy qua selection và sim thật, chuột, `move`, `preset`, chỗ gợi ý); ba test đầu vào cũ ở `td-router` chuyển sang đây. Kịch bản mới `td-1a-keyboard-only.mjs`, `td-1a-words-dense.mjs`, `td-1a-ime.mjs`.
- Ngân sách dòng: 5.459 / 5.460 cộng dồn cho 1A.4 (+499 trên phần 500), trần cứng 5.500. Bản đầu làm đủ mục 5.3–5.4 dài 822 dòng; phần cắt ghi ở BUILD_NOTES mục 1.8.

## Mục review đã xử lý

Không có (mã mới của Typing Defense, không thuộc báo cáo review 2026-10-21).

## Kiểm tra

- `npx tsc -p tsconfig.json --noEmit`: sạch.
- `npx vitest run`: 405 file, 2.645 test đạt, 1 bỏ qua (file mới `td-input` 14 test; ba test đầu vào cũ của `td-router` chuyển sang đó).
- Kịch bản (Vite cấu hình worktree, cổng 3110), 1280 × 720 và 1920 × 1080, đều đạt, không lỗi console, không ngoại lệ:
  - `td-1a-keyboard-only`: 3 nhà, 2 lệnh gửi, 1 đổi nhịp, 3 lần gọi đợt, 114 phím chữ, thắng đợt 1–3 (còn 17 mạng); nhật ký chỉ có lệnh do phím tạo, Node chạy lại ra đúng mã băm của Chrome.
  - `td-1a-words-dense`: bốn nhà trong 15 m, nhịp 1 s; tới 12 thẻ cùng lúc, không chồng, cột cao nhất 178–209 px, thẻ phủ 1,7–2,7 % màn hình, chữ 18 px (24 px ở 1920 × 1080), ở cả E = 12 Dễ và E = 35 Thường.
  - `td-1a-ime`: phím Telex / VNI kiểu UniKey và phím đang ghép chỉ ra `key` / `backspace`, không đổi người, thẻ hay menu; HUD nhắc tắt bộ gõ; `2` `4` `1` chọn Chấm, Gạch, Draconis; `` ` `` bước sang người kế; Tab, `=` / `-`, Enter ra đúng lệnh.
  - `td-1a-boot`, `td-1a-combat`, `td-1a-stream`, `td-1a-slots` vẫn đạt; ba kịch bản ghi nhật ký chạy lại trên Node ra đúng mã băm.
- `td-1a-slots` ở 1920 × 1080 trước khi sửa cột thẻ: hỏng 3 / 3 lần (một cặp thẻ chồng mỗi lần); sau khi sửa: đạt 3 / 3.
- Khói V4 (`defense.mjs`, halo-garden, không đảo): xây 5 tháp, đánh tới đợt 5, 60 khung/giây (p95 16,8 ms), không lỗi.

## Còn lại

- UI đã cắt theo BUILD_NOW §10 (BUILD_NOTES mục 1.8): chọn điểm tập kết, nút "Giảm tải", rê chuột để chọn nhà cho `−` / `=`, bấm lên người trên bản đồ, "Mỗi từ: ~N", ETA. Trả lại theo thứ tự ghi ở mục đó khi có dòng.
- Kịch bản IME dùng phím giả qua CDP; UniKey và EVKey thật trên Windows và macOS vẫn cần chủ dự án thử tay (BUILD_NOW §8).
- Repo cha chưa có dòng trỏ sang file này (mốc chỉ được làm trong worktree).
