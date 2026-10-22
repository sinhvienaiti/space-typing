# Bước 1A.6 "Lời Gọi": đặc tả thực thi (22/10/2026)

> **Dành cho:** AI làm code và AI phản biện.
> **Kế hoạch gốc (luật, lý do):** [`CALLS_V3_1_PLAN.md`](CALLS_V3_1_PLAN.md). File này chốt **số liệu và quyết định** để code. Hai file khác nhau thì theo file này.
> **Nền:** bản 1A đã xong (`BUILD_NOW.md`, `BUILD_NOTES.md`, changelog `2026-10-22-td-1a.md`). Worktree `games/.wt-td-1a6`, nhánh `feat/td-1a6`.
> **Chủ dự án đã duyệt kế hoạch.** Không cần hỏi lại các mặc định ở đây.

## 0. Luật không đổi

- Sim tất định: chỉ dùng luồng ngẫu nhiên có tên (`src/platform/rng.ts`), không đồng hồ, không DOM. Test ranh giới `td-boundary` vẫn phải xanh.
- Chữ cái chỉ để gõ. Phím lệnh không phải chữ cái.
- Giữ lõi gõ: `typing/letters.ts`, `typing/router.ts`, `typing/scorer.ts`, `typing/picker.ts`, `typing/decks.ts`, thẻ chữ, làn thẻ.
- Không media trong Git. Không đụng `src/defense`, `src/scene3d` (trừ import đã có), `src/vfx`, `src/audio`.
- Ngân sách mã TD (không tính test, kịch bản): **≤ 7.300 dòng** (hiện 5.319). Ghi số thật vào `BUILD_NOTES.md` mục mới "1A.6".

## 1. Bỏ khỏi 1A

| Bỏ | Thay bằng |
|---|---|
| `systems/stream.ts` (phát theo nhịp), `typing/tempo.ts`, núm nhịp, Dừng tất cả, chip Tải, hằng số `TEMPO`, `DEFAULT_TEMPO_S`, `LOAD`, `EMIT` (phần nhịp) | Hệ lời gọi `systems/calls.ts` và `systems/attention.ts` |
| `systems/heat.ts`, `systems/aura.ts`, Nhiệt, Dư âm, hào quang Tốc / Chuẩn / Mượt, `HEAT`, `AURA_*`, `PRESENCE`, `CANNON_AURA`, `FIVE_GOOD` | Lượt mạnh của tháp, tiến độ việc, Thư Đồng tự giúp |
| Phạt khi từ tan (Chuỗi −2, ÷2 khi tan đã gõ) | Không phạt. Chuỗi chỉ ÷2 khi Ẩu |
| Ô trợ lực "người đứng ở ổ nhà" | Vòng giúp quanh người (mục 6). Số người dùng được vẫn theo cấp Lũy |
| Pha `prep` / `battle` | `day` / `night` / `dawn` (mục 2) |
| `ORDER_GRACE` | Bỏ (lời gọi không hết hạn nên không cần ân hạn) |

Test cũ của phần bỏ thì xóa hoặc viết lại theo luật mới. Test của lõi gõ giữ nguyên.

## 2. Ngày, Đêm, Bình minh

| Chế độ (`mode`) | Ngày | Lời gọi sáng tối đa | Gõ trong 20 s, tối đa | Máu quái | Sàn E | Tạm dừng chiến thuật |
|---|---|---|---|---|---|---|
| `relax` (Thư giãn) | 120 s | 2 | 6 s | ×0,75 | 12 | Có |
| `balanced` (Cân bằng, mặc định) | 75 s | 3 | 8 s | ×1,0 | 20 | Không |
| `challenge` (Thử thách) | 50 s | 4 | 11 s | ×1,15 | 35 | Không |
| `learn` (Học) | 120 s | 2 | 6 s | ×0,75 | 12 | Có; mọi lời gọi hiện nghĩa trước |

- `mode` thay cho `difficulty` của 1A. Tuổi từ, sàn E đọc theo bảng này.
- Trận bắt đầu bằng **Ngày 1**. Hết Ngày thì sang **Đêm** (đợt kế tiếp sinh quái). Đêm hết khi đợt đã sinh xong và không còn quái. Rồi **Bình minh** 3 s (đồng bay về, tổng kết), rồi Ngày kế.
- Gọi Đêm sớm: Shift + Enter trong Ngày. Thưởng như gọi đợt sớm của 1A (`earlyCall`).
- Thưởng hết đêm như `waveBonus` của 1A.
- Ban đêm việc kinh tế vẫn chạy. Xây ban đêm chậm hơn: thời gian xây ×1,5.

## 3. Tài nguyên

| id | Tên | Đầu trận | Ghi chú |
|---|---|---|---|
| `gold` | Vàng | 220 | Như 1A (phần nghìn) |
| `wood` | Gỗ | 40 | Mới |
| `food` | Lúa | 0 | Mới |
| `seeds` | Hạt giống | 4 | Mới. Mua ở thẻ Ruộng |
| `knowledge` | Tri thức | 0 | Chỉ đếm (thống kê), chưa dùng |

- **Giá nhà** đổi thành Vàng + Gỗ: với giá cũ G (bảng `costs` 1A), Gỗ = round(0,3 × G), Vàng = G − Gỗ. Hoàn tác 5 s hoàn đủ cả hai.
- **Bán Lúa:** thẻ Lũy có nút "Bán 10 Lúa" (10 Vàng).
- **Lính ăn Lúa:** mỗi lần Trại Lính hồi một lính tốn 1 Lúa. Không đủ Lúa thì hồi chậm gấp đôi (không chặn hẳn).

## 4. Nhà và việc mới

### 4.1 Ruộng (`farm`)

- Mở ở hộp cát từ đầu. Đặt tự do trên đất cỏ, khuôn `L`. Giá cũ G = 60 (tức 42 Vàng + 18 Gỗ).
- 4 ô (2 × 2). Mỗi ô: trống → gieo (2 s) → lớn (40 s) → chín → gặt → ra **5 Lúa** → trống.
- **Nông dân:** mỗi Ruộng có 1 nông dân (NPC, đi bộ trong khuôn ruộng, không cần A\*).
- **Hạt giống:** gieo một ô tốn 1 hạt. Thẻ Ruộng có:
  - nút "Mua 4 hạt" (30 Vàng);
  - công tắc "Tự mua hạt" (mặc định **bật**): hết hạt thì tự mua 1 hạt giá 8 Vàng khi cần gieo, nếu đủ vàng.
- **Gặt:** nông dân tự gặt 1 ô hết **12 s**. Bắt đầu gặt thì tạo lời gọi **Gặt** (3 từ).
- Bấm một ô chín (hoặc Tab tới Ruộng rồi Enter khi không có người được chọn) thì nông dân gặt ô đó trước.

### 4.2 Dân và cây (Gỗ)

- **Cây:** bản đồ có danh sách cây (`map.trees`). Mỗi cây: vị trí, cỡ (bán kính chặn 1,5 m), ra **8 Gỗ**. Cây chặn đặt nhà. Chặt xong để lại gốc (không chặn).
- Thêm khoảng **36 cây** vào `td-sandbox`, thành 4–5 cụm: hai bên cổng quái, ven suối phía tây (hai bên suối), góc đông bắc, góc đông nam gần Lũy. Không đặt trên đường, nước, cầu, node, trong vòng 11 m quanh Lũy. Cụm gần Lũy nhất cách Lũy 14–22 m.
- **Dân:** đầu trận có **2 dân**. Thuê thêm ở thẻ Lũy hoặc Shift + `\`: 25 Vàng + 5 Lúa mỗi người. Tối đa **3 / 5 / 7 / 9** dân theo cấp Lũy 1–4.
- Dân rảnh tự đi chặt: cây **được đánh dấu** gần nhất trước; nếu không có cây đánh dấu thì cây gần Lũy nhất trong 30 m. Mỗi cây tối đa 1 dân.
- Bấm một cây: đánh dấu hoặc bỏ đánh dấu (lệnh `markTree`).
- **Chặt:** dân tự chặt hết **20 s**. Bắt đầu chặt thì tạo lời gọi **Chặt** (4 từ). Cây đổ thì cộng Gỗ ngay (không có bước chở về), dân đi tìm cây kế.
- Dân đi bằng A\* như Thư Đồng. Ban đêm dân vẫn chặt. Quái không đánh dân (1A.6).

### 4.3 Xây có thời gian

- Đặt nhà tạo **công trường**. Nhà chưa chạy cho tới khi xong.
- **Thợ xây:** Lũy có số thợ = cấp Lũy (1–4). Thợ rảnh đi tới công trường đang chờ lâu nhất.
- Thời gian xây theo khuôn: `S` 8 s, `M` 14 s, `L` 18 s. Nâng cấp: 0,75 × thời gian xây của khuôn đó. Ban đêm ×1,5.
- Bắt đầu xây thì tạo lời gọi **Xây**: số từ `S` 2, `M` 3, `L` 4, nâng cấp 3.
- Lũy không xây lại (có sẵn). Nâng cấp Lũy trong hộp cát vẫn tức thì (nút hộp cát), không qua thợ.
- Hoàn tác 5 s của 1A vẫn có: hủy công trường, hoàn đủ.

### 4.4 Mỏ Vàng

- Giữ sản lượng vào đống như 1A. Thợ mỏ tự đổ đống về kho mỗi **10 s**.
- Đống đạt **50 %** sức chứa thì tạo lời gọi **Đào** (2 từ). Mỗi từ: đổ cả đống về kho ngay và +1 Vàng.

### 4.5 Tháp và lượt mạnh

- Mỗi nhà đánh (Tháp Cung, Tháp Pháo, Lũy) có **lượt mạnh** 0–5. Phát bắn thường khi còn lượt thì thành phát mạnh và trừ 1 lượt:
  - Tháp Cung: sát thương ×1,6, xuyên +1.
  - Tháp Pháo: sát thương ×1,4, bán kính nổ ×1,3.
  - Lũy: bắn 2 mục tiêu (cấp 3–4 thì 3).
- **Lời gọi Bắn mạnh:** chỉ ban Đêm. Điều kiện: có quái trong tầm, lượt mạnh < 5, đã qua thời gian hồi của tháp đó (Thư giãn 12 s, Cân bằng 8 s, Thử thách 6 s, Học 12 s). Lời gọi có 1 từ, **sống 6 s**; hết giờ thì tắt, không phạt.
- Từ của Bắn mạnh xong: bắn ngay một Phát Chữ (giữ cách tính Phát Chữ của 1A với Q của từ) và +2 lượt mạnh (Hoàn hảo hoặc Chớp: +3).

### 4.6 Trại Lính

- Không có lời gọi ở 1A.6 (để 1B). Lính tốn Lúa khi hồi (mục 3).

## 5. Lời gọi

### 5.1 Loại

| Loại (`kind`) | Ai | Từ | Hạn | Mỗi từ xong | Cả lời gọi Hoàn hảo |
|---|---|---|---|---|---|
| `harvest` | Nông dân | 3 | Không | +1/3 tiến độ ô | +3 Lúa |
| `chop` | Dân | 4 | Không | +1/4 tiến độ cây | +2 Gỗ |
| `build` | Thợ xây | 2–4 | Không | +1/N tiến độ | Nhà xong +10 % máu tối đa |
| `mine` | Thợ mỏ | 2 | Không | Đổ đống, +1 Vàng | +5 Vàng |
| `power` | Tổ tháp | 1 | 6 s | Phát Chữ, +2 lượt | +1 lượt |
| `quiz` | Thư Đồng | 1 | Hết Ngày | +1 Tri thức | +1 Tri thức |

- Tự làm và gõ giúp **cộng dồn**: tiến độ tự làm vẫn chạy trong lúc gõ.
- Từ **Ẩu** (nhiều lỗi): tiến độ ×0,6; Chuỗi ÷2; mất thưởng Hoàn hảo của lời gọi đó.
- "Cả lời gọi Hoàn hảo": mọi từ của lời gọi đều Chớp hoặc Hoàn hảo.
- Việc xong trước khi gõ hết (tự làm xong) thì lời gọi đóng, không phạt, phần đã gõ vẫn tính.

### 5.2 Vòng đời

```text
tạo ─▶ CHỜ (xếp hàng, NPC hiện "…") ─▶ MỞ ─▶ (trong vòng giúp) SÁNG: có từ, gõ được
                                         └▶ (ngoài vòng) MỜ: không có từ, mũi tên mép màn hình
SÁNG ─gõ chữ đầu─▶ KHÓA ─từ xong─▶ từ kế (vẫn KHÓA) … ─từ cuối─▶ XONG
bất kỳ ─việc xong / nhà mất / hết hạn (power, quiz)─▶ ĐÓNG (không phạt)
```

- **Chỉ lời gọi SÁNG giữ một từ** trong `WordStore` và một chữ đầu trong `Letters`. Lời gọi rời vòng giúp mà không đang khóa thì trả từ và chữ (không phạt), khi sáng lại thì chọn từ mới.
- Lời gọi đang KHÓA giữ từ tới khi xong hoặc Esc, kể cả khi người rời đi.
- Từ của lời gọi: kind mới `call` trong `KIND`. Lời gọi không có hạn thì từ không bao giờ hết hạn. `power` sống 6 s.
- Chủ đề từ (`TYPING_DEFENSE_DESIGN.md` 22.5): chưa có thẻ chủ đề trong từ vựng thì lấy từ chung theo cấp. Để móc `topic` trong code, chưa dùng.
- Độ dài từ theo `LENGTH_BY_E`. `power` dùng nửa dưới của dải (từ ngắn).

### 5.3 AttentionDirector (`systems/attention.ts`, trong sim)

Mỗi tick:
1. Đếm lời gọi SÁNG. Đủ trần (mục 2) thì lời gọi mới vào CHỜ.
2. Ưu tiên khi có chỗ trống: `power` > `build` > `harvest` = `chop` = `mine` > `quiz`. Cùng loại thì cũ trước.
3. Đo **giây gõ**: một tick tính là gõ khi có khóa. Tổng trong 20 s gần nhất vượt mức tối đa (mục 2) thì chỉ cho `power` và `build` mở thêm; loại khác chờ.
4. Ban Đêm: `quiz` không mở; `harvest`, `chop`, `mine` mở tối đa 1 cùng lúc.

### 5.4 Chuỗi và chấm điểm

- Chấm từ như 1A (`scoreWord`, Chớp / Hoàn hảo / Tốt / Ẩu). Thời gian từ tính từ lúc từ **sáng**, không phải lúc tạo lời gọi.
- Chuỗi: +1 mỗi từ không Ẩu; Ẩu ÷2. **Không có phạt khác.** Bậc Chuỗi (`CHAIN.tiers`) nhân thưởng Hoàn hảo, trần ×1,3.

## 6. Người và vòng giúp

- Tướng (Draconis) và Thư Đồng (theo cấp Lũy như 1A: Lũy cấp n mở n người) đi tới **điểm, nhà, NPC hoặc cây** (lệnh `move`, Enter, bấm). Không còn "trợ lực ở ổ".
- **Vòng giúp:** Tướng 10 m, Thư Đồng 6 m. Lời gọi trong vòng bất kỳ người nào thì SÁNG.
- **Thư Đồng tự giúp:** việc kinh tế trong 6 m của một Thư Đồng chạy ×1,5 (không cộng dồn giữa nhiều Thư Đồng).
- Draconis vẫn tự đánh khi có quái trong tầm (như 1A) và vẫn bay.
- **Hỏi bài:** ban Ngày, mỗi Thư Đồng tạo 1 lời gọi `quiz` mỗi 25 s nếu có từ cần ôn (mục 7). Lời gọi ở ngay Thư Đồng đó.

## 7. Học

- Bộ từ (`typing/decks.ts`) mang thêm `vi` (nghĩa) và `ipa` từ file từ vựng. Chỉ view đọc; sim không băm hai trường này.
- Từ xong: thẻ hiện nghĩa `vi` 1 s.
- Chế độ `learn`: từ hiện nghĩa ngay khi sáng.
- **Sổ ôn:** từ gõ Ẩu, hoặc có ≥ 2 lỗi, vào sổ ôn (tối đa 20, bỏ cũ nhất). Lời gọi `quiz` lấy từ trong sổ: thẻ hiện **nghĩa `vi` và chữ đầu** (ví dụ "tốt; hay · g _ _ _"). Gõ đúng thì xóa khỏi sổ.
- Không có từ trong sổ thì không có `quiz`.

## 8. Điều khiển

| Phím / chuột | Việc |
|---|---|
| a–z | Gõ |
| Esc | Nhả khóa → đóng menu → bỏ chọn → tạm dừng (như 1A) |
| 1–4, `` ` `` | Chọn Tướng, Thư Đồng |
| Tab / Shift + Tab | Tô nhà kế tiếp, rồi lời gọi đang MỜ gần nhất |
| Enter | Người đang chọn tới chỗ đang tô |
| `\` / Insert | Xây |
| Shift + `\` / Shift + Insert | Thuê 1 dân |
| Shift + Enter | Gọi Đêm sớm |
| Space | Tạm dừng chiến thuật ở `relax`, `learn`; nơi khác bị nuốt |
| Delete | Hoàn tác (như 1A) |
| Bấm NPC, bong bóng | Người đang chọn tới đó |
| Bấm ô ruộng chín | Ưu tiên gặt ô đó |
| Bấm cây | Đánh dấu / bỏ đánh dấu chặt |
| Bỏ | `-`, `=`, Shift + `-`, Shift + `=` (không còn nhịp) |

- **Tạm dừng chiến thuật:** session ngừng bước sim. Vẫn mở menu, thẻ, đặt nhà được; lệnh xếp hàng và chạy ở tick kế khi bỏ dừng. Lệnh gõ không nhận khi dừng.

## 9. Hình (view 2D, không media)

- Cây: hình tròn xanh đậm; gốc: chấm nâu. Cây đánh dấu: viền vàng.
- Ruộng: 4 ô vuông màu theo giai đoạn (đất nâu, mạ xanh nhạt, lúa xanh, lúa vàng). Thanh tiến độ nhỏ khi gặt.
- NPC: chấm nhỏ có chữ tắt (N nông dân, D dân, X thợ xây, M thợ mỏ). Đang làm: "!" nhỏ; đang CHỜ: "…".
- Công trường: khuôn nét đứt và vòng tiến độ.
- Bong bóng lời gọi: dùng thẻ chữ hiện có, đặt trên đầu NPC, thêm biểu tượng loại việc (chữ hoặc emoji đơn giản, không media) và chấm số từ còn lại (●●○). MỜ: thẻ mờ không có chữ. Ngoài màn hình: mũi tên ở mép, màu theo loại.
- Lượt mạnh: 5 chấm dưới tháp (thay 5 đèn lồng).
- Vòng giúp: vòng tròn mảnh quanh Tướng và Thư Đồng đang chọn.
- HUD:
  - Vàng, Gỗ, Lúa, Hạt, Mạng.
  - "Ngày 2 · 0:41" hoặc "Đêm 2 · còn 12 quái".
  - Chip "Đang gọi 2/3" thay chip Tải.
  - Thẻ Ruộng: số hạt, "Mua 4 hạt", "Tự mua hạt".
  - Thẻ Lũy: dân 2/3, "Thuê dân", "Bán 10 Lúa".
- Bảng hộp cát: thay "Độ khó" bằng "Chế độ" (Thư giãn, Cân bằng, Thử thách, Học); giữ Lũy, Vàng (+ thêm "+Gỗ"), E, Từ vựng, Tốc game, Đặt sẵn, Sinh đêm.
- Âm (`view/audio-min.ts`, tổng hợp bằng mã): mỗi loại lời gọi một tiếng báo ngắn khi SÁNG (gặt: chuông cao; chặt: gõ gỗ thấp; xây: hai tiếng búa; đào: leng keng; bắn mạnh: tù và ngắn; hỏi bài: tiếng chim). Giữ tiếng phím và nốt xong từ của 1A.

## 10. Đặt sẵn (hộp cát "Đặt sẵn")

Xây ngay không qua thợ: Tháp Cung khúc nhập, Tháp Pháo, Trại Lính, Mỏ ở N1, 1 Ruộng gần Lũy; Lũy cấp 3; 5 dân; 8 cây gần Lũy được đánh dấu.

## 11. Chia đợt làm

| Đợt | Nội dung | Ai |
|---|---|---|
| R1 | Mục 1–6 trong sim, dữ liệu, lệnh, test, file vàng mới; view chỉ sửa đủ để build và chơi được ở mức thô | Agent làm, sau đó phản biện |
| R2 | Mục 7–10: view, HUD, thẻ, học, chế độ, tạm dừng, âm | Agent làm, sau đó phản biện |
| R3 | Bot, báo cáo, kịch bản trình duyệt, cổng | Agent làm, sau đó phản biện |

## 12. Cổng cứng (hết R3)

1. `pnpm check` xanh (chạy từng bước nếu ở worktree). `td-boundary` xanh.
2. Chạy lại tất định: file vàng mới khớp; Node và Chrome cùng mã băm.
3. Sim ≤ 0,5 ms mỗi bước với 300 quái, 20 cây, 9 dân, 4 ruộng.
4. **Bot không gõ** (chính sách xây chuẩn, có ruộng, chặt cây, nâng Lũy theo vàng) qua **Đêm 1–4** ở `balanced`, mọi seed của báo cáo.
5. Bot gõ 35 WPM, 95 %: mọi cửa sổ 20 s có ≤ 8 s gõ ở `balanced`; tỉ lệ gõ Ngày 30–45 %, Đêm 15–25 % (in báo cáo; lệch thì chỉnh số trong `rules.ts` và ghi lý do).
6. Bất biến (test thuộc tính): lời gọi SÁNG ≤ trần; tối đa 1 khóa; mọi từ sống có chữ đầu không trùng; bỏ qua mọi lời gọi thì Chuỗi không giảm và không mất tài nguyên nào.
7. Bot gõ có lợi rõ so với bot không gõ: Lúa + Gỗ + Vàng tăng ≥ 25 % sau 3 Ngày.
8. Kịch bản trình duyệt ở 1280×720 và 1920×1080, không lỗi console:
   - `td-1a6-day.mjs`: gieo, gặt có gõ, chặt có gõ, xây có gõ;
   - `td-1a6-night.mjs`: Bắn mạnh, lượt mạnh;
   - `td-1a6-keyboard.mjs`: một Ngày và một Đêm chỉ bằng bàn phím;
   - `td-1a6-attention.mjs`: nhiều lời gọi, kiểm trần và xếp hàng;
   - `td-1a6-learn.mjs`: chế độ Học, nghĩa hiện trước, Hỏi bài;
   - `td-1a6-tour.mjs`: bộ ảnh cho chủ dự án.

   Kịch bản 1A không còn đúng luật thì xóa hoặc chuyển. Chạy với `scripts/dev/vite.worktree.config.ts` (phục vụ `/vocabulary/`).
9. Ngân sách mã ≤ 7.300 dòng.
