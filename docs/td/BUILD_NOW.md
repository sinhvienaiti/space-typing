# BUILD_NOW — Bước 1A "Cổng vui"

Ngày: 22/10/2026. Làm ngay sau tài liệu thiết kế `TYPING_DEFENSE_DESIGN.md` (gọi tắt **TK**).

Mã: submodule `games/space-typing`, nhánh `feat/space-typing-2026-10-18`, HEAD `1979389f`. Đường dẫn tính từ `games/space-typing/`.

---

## 0. Mục tiêu

**Một câu:** trong khoảng 5.000 dòng mã, cho chủ dự án chơi được vòng lõi "đưa người tới nhà → nhà phát chữ bay lên → gõ → nhà mạnh ngay" với 1, 2, 3 và 4 ô trợ lực, ở 1280 × 720, trước khi làm bất cứ thứ gì khác.

**Chủ dự án làm được ở cuối 1A:**
- Đặt Tháp Cung, Tháp Pháo, Trại Lính, Mỏ Vàng trên một bản đồ 2D nhìn từ trên.
- Gửi Draconis và 1–3 Thư Đồng tới nhà. Thư Đồng đi bộ qua cầu (A*).
- Chọn nhịp từng nhà: Dừng, 6, 4, 3, 2, 1 s (8 s ở Dễ).
- Gõ chữ bay lên trên nhiều nhà cùng lúc. Thấy ngay Tên Chữ, Đạn Chữ, đồng vàng, tiếng trống.
- Thấy Nhiệt (5 đèn), Chuỗi, Tải, hào quang.
- Đổi số ô 1–4, cấp nhà L1–L3, tốc kỳ vọng E, độ khó, cấp từ vựng trong **hộp cát**.

**Câu hỏi 1A phải trả lời:** dòng chữ có vui không; 3–4 nhà cùng phát có đọc kịp không; nhịp và số ô có làm người chơi thấy mình mạnh lên theo sức gõ không.

### 0.1 Có trong 1A

| Nhóm | Có |
|---|---|
| Bản đồ | Sân thử 2D: đường chữ S tách đôi, Suối Bạc với 2 cầu, 3 node quặng, Lũy (TK 22.9, rút gọn) |
| Nhà | Lũy Chữ (cấp 1–4 qua hộp cát, nỏ thủ thành), Tháp Cung, Tháp Pháo, Trại Lính, Mỏ Vàng (L1–L3 qua hộp cát) |
| Quái | Cương Thi (bầy nhanh), Đàn Ma Trơi (bay thấp), Thuồng Luồng (giáp nặng) |
| Chiến đấu | Máu, giáp, KP, chí mạng, đạn bay, nổ vùng, lính chặn, lọt, đợt, gọi sớm |
| Người | Draconis bay, tự đánh khi rảnh (không kỹ năng, không Tối Thượng). Chấm, Phẩy, Gạch đi bộ A*, sở trường. |
| Gõ | Dòng chữ đủ luật TK 6: lịch phát, so le, trần chữ, tuổi từ, gia hạn, chữ đầu tầng 1–2, nghỉ chữ, dự trữ, OSA, bộ định tuyến, chấm theo số lỗi, Nhiệt, Dư âm, Chuỗi, Mượt riêng từng nhà, hào quang có k_N, phần thưởng từ, ân hạn ra lệnh, Dừng tất cả, chip Tải, gợi ý nhịp |
| UI | Bản vẽ 2D (canvas), thẻ chữ DOM, HUD tối thiểu, bảng hộp cát, tiếng gõ tổng hợp |
| Kiểm | Test đơn vị, test thuộc tính, chạy lại khớp mã băm, đo hiệu năng, kịch bản trình duyệt gõ thật qua CDP |

### 0.2 Không có trong 1A (để 1B, 1C)

Loot bay, túi, Từ Nhặt, Mảnh Chữ; nâng cấp có giá và bán (hộp cát đặt cấp miễn phí); Lúa, Ruộng; Đài Ấn; boss; gõ trực tiếp; Tối Thượng, Chữ Chiêu, kỹ năng Tướng; cụm chốt, Bùng Nổ; Từ Hiếm, Từ Ôn, nghĩa tiếng Việt; Lam; chế độ truyện; 3D; cảnh 2D; chuyển Credit Crystal; lưu ván; sự kiện học; thoại.

---

## 1. Thứ tự làm

| Mốc | Làm | Xong khi |
|---|---|---|
| **1A.0 Khung** | `td.html`, đầu vào Vite, `src/td/main.ts`, `src/platform/rng.ts`, test ranh giới, sửa `mode-isolation` | `pnpm check` xanh; `td-1a-boot.mjs` chụp được trang trống, không lỗi console |
| **1A.1 Nội dung + chiến đấu** | Kiểu dữ liệu, dữ liệu 1A, biên dịch, kiểm tra; kho; làn; đặt nhà; quái đi, tháp bắn, lính chặn, mỏ tự sản, nỏ Lũy, đợt, lọt; mã băm; bản vẽ 2D | Test chiến đấu, kinh tế, đặt nhà xanh; `td-1a-combat.mjs`: 2 đợt tự chạy, `stats().kills > 0` |
| **1A.2 Gõ lõi** | `typing/*`; hệ dòng chữ, từ, Nhiệt, Chuỗi, phần thưởng, hào quang; thẻ chữ DOM; tiếng gõ tổng hợp | Test gõ xanh (gồm thuộc tính 10.000 tick trên từ vựng thật); `td-1a-stream.mjs`: gõ thật 40 WPM qua CDP một đợt |
| **1A.3 Người và ô** | Lưới đi bộ, A*, kéo dây, BFS lối đi; Tướng bay; Thư Đồng; lệnh gửi, đổi chỗ, gọi về; có mặt, Dư âm; ô theo cấp Lũy | Test người, đường xanh; `td-1a-slots.mjs`: 4 ô, Gạch qua cầu tới mỏ bên kia suối |
| **1A.4 Điều khiển, HUD, hộp cát** | Chuột, bàn phím (đủ đường bàn phím), menu xây, vòng menu nhà có núm nhịp, thanh trợ lực 4 chân dung, chip Tải, bộ đếm Chuỗi, ân hạn ra lệnh, bảng hộp cát | Test đầu vào xanh; `td-1a-keyboard-only.mjs`, `td-1a-words-dense.mjs`, `td-1a-ime.mjs` đạt |
| **1A.5 Bot, báo cáo, chủ dự án chơi** | Bộ sinh phím, người đọc giả lập, chính sách; test vàng; `pnpm td:balance` in báo cáo; đo hiệu năng | Mọi cổng cứng mục 7 đạt; chủ dự án chơi theo danh sách mục 8 |

Mỗi mốc tự đứng được: `pnpm check` xanh, V4 vẫn chạy (`scripts/visual/scenarios/defense.mjs` khói). Không chép media vào Git.

---

## 2. File và ngân sách dòng

Mục tiêu ≤ 5.000 dòng mã (không tính test). Trần cứng 5.500; chạm trần thì cắt bớt UI trước, không cắt luật.

| Nhóm | File | Dòng |
|---|---|---|
| Trang | `td.html` (mới); `vite.config.ts` thêm `td: resolve(projectRoot, "td.html")` vào `rollupOptions.input` | 30 |
| Platform | `src/platform/rng.ts` (mulberry32, luồng có tên, trạng thái băm được) | 50 |
| Nội dung | `src/td/content/types.ts`, `rules.ts` (hằng số TK Phụ lục A, phần 1A), `slice-1a.ts` (nhà, quái, Tướng, Trợ Thủ, bản đồ, đợt), `compile.ts` (giây → tick, bảng cấp), `schema.ts` | 800 |
| Gõ (thuần) | `src/td/typing/router.ts`, `letters.ts`, `distance.ts`, `picker.ts`, `scorer.ts`, `decks.ts`, `tempo.ts` | 700 |
| Sim lõi (thuần) | `src/td/sim/world.ts` (thứ tự tick TK 25.6), `commands.ts`, `events.ts`, `hash.ts`, `stats.ts`, `lanes.ts` (chép `src/defense/rules/path.ts`, đổi `Math.hypot` → `Math.sqrt`), `placement.ts` | 550 |
| Kho | `src/td/sim/stores/{enemies,units,agents,buildings,projectiles,words}.ts` | 250 |
| Đường | `src/td/sim/nav/{grid,astar,connectivity}.ts` | 200 |
| Hệ chiến đấu | `src/td/sim/systems/{spawn,move,block,combat,projectile,deaths,waves,production}.ts` | 450 |
| Hệ gõ | `src/td/sim/systems/{stream,words,heat,chain,rewards,aura,agents}.ts` | 600 |
| App | `src/td/main.ts`, `app/{session,input,selection,sandbox,dev-handle,vocab}.ts` | 450 |
| View, UI | `src/td/view/debug-2d.ts`, `view/words/{cards,lanes}.ts`, `view/audio-min.ts`, `ui/{hud,team-bar,tempo-control,build-menu,ring-menu}.ts`, `ui/td.css` | 900 |
| **Tổng** | | **≈ 4.980** |
| Test | `tests/td-*.test.ts`, `tests/platform-rng.test.ts`, `tests/td/{bot,keystrokes,reader}.ts`, `tests/td/policies/*.ts`, `tests/golden/td-1a.json` | ≈ 2.000 |
| Kịch bản | `scripts/visual/scenarios/td-1a-*.mjs` (7 file), `scripts/td/balance.ts`, `package.json` thêm `td:balance`, `td:golden:update` | ≈ 500 |

**Ngoại lệ import cho 1A** (`LEGACY_IMPORTS` trong `tests/td-boundary.test.ts`, chỉ cho `app/` và `view/`):
- `src/scene3d/keys.ts` (`typedLetter`, `isComposingKey`, `vietnameseInputSign`) — dùng ở `app/input.ts`.
- `src/logic.ts` (`typingText`) — dùng ở `app/vocab.ts`.
- `src/vocabulary.ts` (`loadVocabularyIndex`, `loadVocabularyLevel`) — dùng ở `app/vocab.ts`.
- `@fontsource/be-vietnam-pro` — ở `ui/td.css`.

**Sửa file có sẵn:**
- `tests/mode-isolation.test.ts`: thêm `"td/"` vào danh sách được import `scene3d/`; thêm ca "không file nào ngoài `td/` import `td/`" và "`td/` chỉ ghi khóa lưu bắt đầu bằng `td.`".
- `vite.config.ts`: thêm đầu vào `td`.
- `.gitignore`: `public/assets/td/**` (mở lại `README.md`, `**/manifest.json`) — chuẩn bị cho 1C, không có file nào ở 1A.
- `package.json`: script `td:balance` (`node --import tsx scripts/td/balance.ts`), `td:golden:update`.
- Không sửa gì trong `src/defense/**`, `src/scene3d/**`, `src/vfx/**`, `src/audio/**`.

---

## 3. Dữ liệu 1A

Số lấy từ TK. File dữ liệu là nguồn thật.

### 3.1 Sân thử `td-sandbox`

- Vùng ±48 m. Cổng quái (−10, −46). Lũy (0, 40), cấm xây trong 11 m.
- **Làn đất:** (−10, −46) → (−4, −40) → (6, −34) → tách: Tây (−12, −20) → (−10, 0); Đông (16, −20) → (12, 2) → nhập (0, 12) → (−6, 20) → (6, 30) → (0, 40). Bầy chọn nhánh luân phiên theo luồng RNG `spawn`. Nửa rộng làn 1,9 m.
- **Đường bay thấp** (Ma Trơi, cao 3 m): (−10, −46) → (20, −20) → (0, 40). Không bị chặn.
- **Suối Bạc:** dải x ∈ [−25,5; −22,5] dọc cả bản đồ. Cầu (rộng 3 m) ở z ∈ [−15,5; −12,5] và z ∈ [24,5; 27,5]. Nước chặn đi bộ, chặn xây. Draconis bay qua.
- **Node quặng:** N1 (26, −30) ★★★ ×1,25 (tiền tuyến); N2 (−12, 32) ★ ×0,8 (sát Lũy); N3 (−34, 8) ★★ ×1,0 (bên kia suối, để thử A* qua cầu).
- Đồi, cảnh vật: không có ở 1A.

### 3.2 Nhà

| Nhà | Vòng | Giá L1 | Máu L1 / L2 / L3 | Tự chạy L1 / L2 / L3 | Phần thưởng mỗi từ |
|---|---|---|---|---|---|
| Lũy | — | — | Không máu, 20 mạng | Nỏ mỗi 1,2 s, tầm 9 m: 10–14 / 14–20 / 20–28 (2 mục tiêu) / 26–36 (2 mục tiêu) VL theo cấp Lũy 1–4 | 1,5 Vàng × qA × T_eco × lenF + 1 mũi nỏ |
| Tháp Cung | S 2,0 m | 70 | 300 / 360 / 440 | 6–9 / 9–13 / 13–18 VL; 0,9 / 0,8 / 0,7 s; tầm 10 / 11 / 12 m; chí mạng 10 %; đất và bay | Phát Chữ D̄ 7,5 / 11 / 15,5; xuyên +1 |
| Tháp Pháo | M 2,3 m | 110 | 300 / 360 / 440 | 12–20 / 20–32 / 30–48 VL; 2,6 / 2,4 / 2,2 s; tầm 9 / 9,5 / 10 m; nổ 2,2 / 2,5 / 2,8 m, rìa 50 %; chỉ đất | Phát Chữ D̄ 13 / 21 / 32; nổ ×1,15 |
| Trại Lính | M 2,3 m | 70 | 380 / 450 / 540 | 3 lính; máu 60 / 90 / 130; 3–5 / 5–8 / 8–12 VL; 1,0 / 1,0 / 0,9 s; giáp 0 / 10 / 20 %; hồi sinh 10 s; **không tốn Lúa ở 1A** | Lính chết lâu nhất về sớm 3 s × qQ × T_atk × lenF; không ai chết thì mọi lính hồi 8 % × qQ × T_atk × lenF |
| Mỏ Vàng | L 2,7 m, chỉ trên node | 90 | 260 / 310 / 370 | 3 / 5 / 7 Vàng mỗi 8 s vào đống (60 / 90 / 120); có người: đống về kho khi tới rồi mỗi 5 s; hết đợt: về kho | G 2,0 / 2,4 / 2,8 × lenF × qA × qS × T_eco × độ giàu |

- Nhịp mở theo cấp nhà (6, 4, 3 s ở L1; 2 s ở L2; 1 s ở L3). **Hộp cát bật cờ mở mọi nhịp.** Nhịp ở Lũy: tối đa 2 s khi Lũy cấp 2.
- Trần 1A: 6 nhà tấn công, 3 Trại Lính, mỏ theo node, tổng 16.
- Lính: chặn 1 chỗ, quái nhỏ cần 1, Thuồng Luồng cần 2; tối đa 3 lính một quái; dây 5 m; hồi 5 %/s sau 3 s không đánh.

### 3.3 Quái

| id | Bậc | Máu | Giáp / KP | Tốc | Bay | Lọt | Vàng | Đánh lính | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| `cuong-thi` | Bầy | 35 | 0 / 0 | 3,8 | — | 1 | 4 | 2–4 mỗi 1 s | Đi theo bầy 5 |
| `ma-troi` | Nhỏ | 90 | 0 / 60 | 2,6 | thấp 3 m | 2 | 8 | — | Lính và Pháo không nhắm được; nổ vùng vẫn trúng ×1,5 |
| `thuong-luong` | Vừa | 320 | 60 / 0 | 1,9 | — | 3 | 20 | 10–14 mỗi 1,2 s | Cần 2 chỗ chặn. Không có kỹ năng ở 1A. |

**Đợt hộp cát** (chờ giữa đợt 30 s, gọi sớm `Shift+Enter`: +1 Vàng mỗi giây còn lại, tối đa 30; thưởng cuối đợt 10 + 2 × đợt):

| Đợt | Thành phần |
|---|---|
| 1 | 8 Cương Thi |
| 2 | 10 Cương Thi, 1 Ma Trơi |
| 3 | 12 Cương Thi, 2 Ma Trơi |
| 4 | 2 Thuồng Luồng, 10 Cương Thi |
| 5 | 3 Thuồng Luồng, 12 Cương Thi, 3 Ma Trơi |
| 6 | 4 Thuồng Luồng, 20 Cương Thi, 4 Ma Trơi |
| 7+ | "Vô tận hộp cát": thành phần đợt 6 × (1 + 0,15 × (đợt − 6)) |

- Vàng đầu 220 (hộp cát đặt được). Mạng 20. Độ khó Thường mặc định.

### 3.4 Người trợ lực

| Ai | Di chuyển | Chiến đấu | Trợ lực |
|---|---|---|---|
| Draconis (`draconis`) | Bay thẳng 6 m/s; cất, hạ 0,6 s; đậu mái khi trợ lực | Rảnh: cầu lửa 22–34 P, nổ 1,8 m, mỗi 1,6 s, tầm 9 m, đánh đất và bay. Quái không đánh được Draconis ở 1A. | Ô 1. Ái lực Thư Pháp (chưa có), Pháo: Phát Chữ thêm cháy 3 P/s 2 s. Không phạt ở nhà kinh tế. |
| Chấm (`helper-cham`) | Đi bộ A* 4,0 m/s | Không | Sở trường Xạ +10 % (Cung, Pháo) |
| Phẩy (`helper-phay`) | Như trên | Không | Sở trường Trống +10 % (Trại Lính, Lũy) |
| Gạch (`helper-gach`) | Như trên | Không | Sở trường Thợ +10 % (Mỏ) |

- Ô = min(cấp Lũy, 1 + số Trợ Thủ mang theo). Hộp cát mang cả 3, chọn cấp Lũy 1–4.
- Vào việc 0,4 s trong 3,0 m của ổ; từ đầu sau 0,6 s; ra quá 4,5 m thì ngắt. Gửi tới nhà có người: đổi chỗ.
- Có mặt +15 %. Không có hoảng ở 1A (không boss, không quái Săn).

### 3.5 Luật gõ (tập con TK Phụ lục A)

Dùng nguyên các khối `TEMPO`, `LENGTH_BY_E`, `LIFE`, `EMIT`, `LETTERS`, `SCORE`, `WORD_D` (chỉ `known`, `learning`), `HEAT`, `CHAIN`, `ORDER_GRACE`, `PRESENCE`, `AURA_ATTACK`, `AURA_ECONOMY`, `AURA_MILITARY`, `REWARD`, `WORD_SHOT_DBAR`, `ECON_WORD`, `BARRACKS_WORD`, `FIVE_GOOD` (chỉ Mỏ và Trại Lính), `RICHNESS`, `HELPER`, `ASSIST`. Bỏ: `OVERDRIVE`, `HARMONY`, `RARE`, `REVIEW`, `ULT_*`, `RUSH`, `SPELL_WORDS`, `PIGGY`, `DIRECT_*`, `SEAL`, `LOOT` (trừ vàng ghi ngay).

- **Chỉ một loại từ:** `stream`. Bảng chữ đầu, bộ định tuyến, thứ tự ưu tiên vẫn viết cho đủ loại (test bằng loại giả) để 1B không phải sửa.
- **E** lấy từ hộp cát (mặc định 35). Độ khó mặc định Thường (sàn E = 20).
- **Từ vựng:** hộp cát chọn cấp 1, cấp 1–3 (mặc định), cấp 1–5. Trình duyệt nạp bằng `loadVocabularyIndex()` + `loadVocabularyLevel(n, index)`; test đọc thẳng `../../../shared/vocabulary/levels/00N.json` qua `import.meta.url`. Chưa dùng chủ đề theo nhà, chưa dùng kế hoạch học 60 / 25 / 15: lấy đều từ các cấp đã chọn theo dải độ dài.
- **Mọi từ coi như "đã thuộc"** (d = 1,0) ở 1A.

---

## 4. Luật phải làm đúng (trỏ về TK)

| Luật | TK | Ghi chú cho 1A |
|---|---|---|
| Thứ tự tick | 25.6 | Bỏ bước 13–14 (cửa sổ, boss), bước 16 (túi) |
| Lịch phát, so le 0,2 s / lùi tối đa 0,6 s, chờ đầy rồi bỏ, đổi nhịp đặt lại | 6.4, 25.8 | Thêm `setAllTempo` (Dừng tất cả / trả lại) |
| Trần chữ = clamp(A − 6; 4; 12) | 6.5 | A tính lúc vào trận từ bộ từ đã biên dịch |
| Tuổi từ, gia hạn +0,6 s | 6.4 | |
| Chữ đầu tầng 1, nghỉ 1,0 s, 3 dự trữ, tránh q x z j, tầng 2 sớm ở cấp ≤ 3, OSA ≤ 1 | 6.5 | |
| Bộ định tuyến | 6.15 | Esc: nhả khóa → đóng menu → bỏ chọn → dừng |
| Chấm theo số lỗi, A_w, S_w, Q, kết quả | 6.6 | |
| Nhiệt, Dư âm 4 + 2C rồi −0,25/s; Dừng tất cả giữa đợt đóng băng | 6.7 | |
| Chuỗi: +1; Ẩu ÷2; tan đã gõ ÷2; tan chưa chạm −2; bậc r_c | 6.8 | Mốc 10 / 25 / 50 / 100 chỉ hiện số |
| Mượt riêng từng nhà | 6.9 | |
| Hào quang có k_N, trần, có mặt ngoài trần | 6.10 | |
| Phần thưởng từ, lenF chung, Hoàn hảo chắc chắn chí mạng, pháo hoa khi không mục tiêu | 6.11 | |
| Ân hạn ra lệnh 2 s, hồi 3 s (lệnh `uiFocus`) | 6.14 | Mở bởi menu xây, vòng menu nhà, kéo chân dung |
| Tải, chip, gợi ý nhịp (không tự đổi) | 6.2, 6.13 | |
| Sát thương, giáp, chí mạng, ai đánh được gì | 10 | Trạng thái: chỉ cháy (ái lực Draconis) |
| Đặt nhà: thứ tự kiểm, node, BFS lối đi | 12.5–12.6 | Không có cảnh vật, không san phẳng |
| A*, kéo dây, đổi chỗ | 25.9 | |
| Mỏ, đống vàng mỗi 5 s | 11.5 | |
| Không vòng lặp tiền | 11.12 | 1A chỉ có xây và hoàn tác 5 s (hoàn 100 %) |

**Lệnh 1A:** `build`, `sell` (chỉ hoàn tác 5 s), `rally`, `assignUnit`, `move`, `recall`, `setTempo`, `setAllTempo`, `uiFocus`, `key`, `backspace`, `unlock`, `callWave`, `sandbox`. Lệnh `sandbox` (đặt cấp Lũy, cấp nhà, vàng, E, độ khó, cấp từ vựng, tốc game, sinh đợt) chỉ nhận khi cờ hộp cát bật, và vào nhật ký lệnh để chạy lại khớp.

---

## 5. Hình, tiếng, điều khiển ở 1A

### 5.1 Ảnh tạm (không có media)

- **Không model 3D, không ảnh, không file âm.** Mọi hình vẽ bằng Canvas 2D, mọi tiếng tổng hợp bằng WebAudio. Trang chạy được khi `public/assets/td/` trống.
- Bản đồ: nền cỏ `#7DBA5A`; làn đất `#C9A66B` viền sẫm; suối `#5DA9E9`; cầu nâu `#8B5A2B`; vòng cấm xây quanh Lũy nét đứt.
- Nhà: hình tròn đúng bán kính vòng, màu họ nhà (TK 23.3), chữ cái viết tắt (C, P, L, M, Lũy), vạch cấp 1–3, **5 chấm đèn lồng** trên nóc (Nhiệt), huy hiệu nhịp nhỏ (số giây), vòng tầm mảnh, vòng Mượt (vùng thật), thanh máu hổ phách khi bị thương.
- Quái: chấm tròn cỡ theo bậc (bầy 0,6 m, nhỏ 0,9 m, vừa 1,4 m) màu tím Mực Câm; quái bay có vòng sáng; giáp có viền dày; thanh máu đỏ khi mất máu.
- Lính: chấm lam nhỏ, cờ tập kết.
- Draconis: tam giác cam đào có cánh; bóng dưới đất khi bay. Thư Đồng: tròn có chữ C / P / G, màu tím / hồng / nâu đồng; đường A* nét đứt màu người đó khi đang đi.
- Đạn: vạch ngắn (tên), chấm (đạn pháo) có bóng rơi, Phát Chữ có đầu xanh ngọc và vệt chữ cái của từ.
- Dây trợ lực: đường màu người trợ lực từ người tới tâm nhà, đốm sáng chạy dọc mỗi phím đúng.
- Font: Be Vietnam Pro (đã có trong `package.json`).

### 5.2 Thẻ chữ (DOM trên canvas)

- Pool 20 nút. Mỗi khung chỉ đổi `transform` và `opacity`.
- Neo ở điểm chiếu của nóc nhà (tâm nhà − 2,5 m theo trục dọc màn hình).
- **Luật cột** (TK 23.4): `y_time = 120 px × tuổi / L_w`; xếp từ mới (dưới) tới cũ (trên), mỗi thẻ cách thẻ dưới ≥ 40 px; cột ≤ 240 px.
- **Bộ xếp làn:** hai làn chồng thì đẩy ra hai bên, lệch tối đa 160 px; kẹp trong vùng an toàn (trừ HUD).
- Thẻ: giấy kem, viền mực, chữ đầu đậm gạch chân màu họ nhà, chấm màu người trợ lực, vạch đồng hồ, 0,6 s cuối viền cam; đang gõ: ×1,2, phần đã gõ xanh ngọc, trượt phải 18 px, bay chậm 30 %, thẻ khác mờ 30 %; phím sai: rung, nền chữ kế tiếp hồng nhạt.
- Kết quả: Chớp (dấu mộc nhỏ), Hoàn hảo, Tốt, Vừa, Ẩu, Tan (tro), Hủy (gấp lại) — đúng tên TK 0.6.
- Chữ trúng: thẻ thu nhỏ bay vào tâm nhà 0,22 s. Mỏ, Lũy: "+N" vàng nổi lên (chưa có đồng bay).

### 5.3 HUD tối thiểu

- Trên trái: Mạng, Vàng, Đợt n/N, nút gọi sớm.
- Dưới trái: **thanh trợ lực** 4 chân dung (Draconis + 3 Thư Đồng; ô khóa có ổ khóa "Lũy cấp n"), số 1–4 ở góc, trạng thái (rảnh, đang đi + ETA, tên nhà đang trợ lực); **chip Tải** (xanh ngọc ≤ 100 %, hổ phách 100–125 %, cam > 125 %; rê chuột thấy danh sách nhà và nhịp, nút "Giảm tải").
- Dưới giữa: **Dải Chữ gọn** (từ đang khóa to, bộ đếm Chuỗi và bậc).
- Dưới phải: nút Xây (mở menu xây), nút Dừng tất cả.
- Vòng menu nhà (bấm trái): núm nhịp Dừng / 6 / 4 / 3 / 2 / 1 (8 ở Dễ), gửi người đang chọn, tập kết (Trại Lính), hoàn tác (5 s đầu). Thẻ nhỏ: tên, cấp, ai đang ở đây, "Mỗi từ: ~N", chip gợi ý nhịp.
- **Bảng hộp cát** (`?sandbox=1`, bật mặc định ở 1A; F9 ẩn hiện): cấp Lũy 1–4; cấp từng nhà L1–L3 (nút trên vòng menu); Vàng; E (12–140); độ khó; cấp từ vựng (1 / 1–3 / 1–5); tốc game (0,75 / 1 / 2); nút "Đặt sẵn 4 ô" (dựng sẵn bố cục: Tháp Cung, Tháp Pháo, Trại Lính ở khúc nhập, Mỏ ở N3 bên kia suối; gửi Draconis, Chấm, Phẩy, Gạch); nút sinh đợt.

### 5.4 Điều khiển

| Việc | Chuột | Bàn phím |
|---|---|---|
| Chọn người | Trái vào chân dung hoặc người | `Digit1`–`Digit4`; `Backquote` vòng |
| Gửi người | Phải vào nhà; Shift + phải: Thư Đồng rảnh gần nhất; kéo chân dung thả lên nhà | `Tab` / `Shift+Tab` tô nhà (theo khoảng cách), `Enter` gửi |
| Gọi về Lũy | — | `Digit0` |
| Nhịp | Núm trên vòng menu; lăn chuột trên huy hiệu | `Minus` / `Equal` (nhà đang tô hoặc rê); `Shift+Minus` Dừng tất cả; `Shift+Equal` trả lại |
| Xây | Nút Xây hoặc trái lên đất trống → menu → đặt (vòng đỏ khi sai, chip lý do) | `Insert` → chỗ trống gợi ý kế tiếp (Tab đổi chỗ, số chọn nhà, Enter xây, Esc hủy) |
| Gọi đợt sớm | Nút cờ | `Shift+Enter` |
| Gõ | — | a–z; Backspace; Esc; Space nuốt |
| Camera | Lăn để zoom 1–2,5×, kéo trái hoặc giữa để kéo | Mũi tên |
| Tạm dừng | Nút | `Pause` |

- Người đang chọn không đổi sau lệnh. Mặc định là Draconis.
- Mọi phím đọc theo `event.code`. Bỏ `isTrusted === false` (trừ cờ dev cho kịch bản), phím IME, phím giữ lặp, phím có Ctrl / Meta. Alt không dùng ở 1A.
- **Chỗ trống gợi ý** (`Insert`): sim tính sẵn danh sách điểm hợp lệ gần làn (lưới 2 m, lọc bằng `canPlace`), xếp theo khoảng cách tới khúc cua gần nhất; mỏ thì là node trống.

### 5.5 Tiếng tổng hợp (`view/audio-min.ts`)

| Sự kiện | Tiếng |
|---|---|
| Từ ra | "Tích" rất nhỏ, 3 âm sắc (tháp, quân, kinh tế), ≤ 6 mỗi giây |
| Phím đúng | Click ngắn < 20 ms, nâng 1 bán cung mỗi chữ |
| Phím sai, phím lạc | "Tóc" đục, nhỏ hơn 12 dB |
| Xong từ | Nốt ngũ cung theo bậc Chuỗi; Hoàn hảo thêm "ting" |
| Tan | Nhiễu ngắn lọc thấp ("phù") |
| Phát Chữ, nổ | Nhiễu + quét cao độ ngắn |
| Vàng vào kho | Tick sine |

- Một nút tắt tiếng. Không file âm.

---

## 6. Test

### 6.1 Test đơn vị và thuộc tính (Vitest, chạy trong `pnpm check`)

| File | Kiểm |
|---|---|
| `td-boundary.test.ts` | Luật ranh giới TK 25.3; `LEGACY_IMPORTS` đúng danh sách mục 2; `sim/`, `typing/`, `content/` không có hàm cấm |
| `mode-isolation.test.ts` (sửa) | `td/` được dùng `scene3d/`; không ai ngoài `td/` import `td/`; khóa lưu `td.` |
| `platform-rng.test.ts` | Luồng độc lập; cùng seed cùng dãy; trạng thái băm được |
| `td-content.test.ts` | Tham chiếu đúng; nhịp dày thì T_N không giảm, độ dài tối đa không tăng; trần chữ ≤ 16 / 12 / 4; vàng và lọt của quái trong khoảng bậc; trần hào quang cố định; **A và trần chữ trên từ vựng thật cấp 1, 1–3, 1–5** khớp bảng TK 6.5 |
| `td-sim-combat.test.ts` | Công thức sát thương, giáp, KP, chí mạng theo luồng `crit`; nổ vùng và rìa 50 %; đạn nổ khi mục tiêu chết; Pháo không nhắm quái bay; Ma Trơi ăn nổ ×1,5 |
| `td-sim-block.test.ts` | Sức nặng chặn; quái chưa bị chặn đủ đi 50 % tốc; dây 5 m; hồi sinh 10 s |
| `td-sim-economy.test.ts` | Mỏ tự sản vào đống, đầy thì ngừng; có người: về kho khi tới rồi mỗi 5 s; hết đợt về kho; độ giàu; **không chuỗi xây / hoàn tác nào sinh vàng** (thuộc tính) |
| `td-placement.test.ts` | Thứ tự kiểm cố định; Mỏ chỉ trên node; cách đường 1,9 + r; Lũy 11 m; nước; nhà chặn lối đi bị từ chối (BFS) |
| `td-nav.test.ts` | A* đi qua cầu, không qua nước; hòa theo chỉ số ô; kéo dây không cắt ô chặn; tính lại đường sau khi đặt nhà; một lần A* ≤ 0,5 ms |
| `td-agents.test.ts` | Ô = min(cấp Lũy, 1 + Trợ Thủ); đổi chỗ; vào việc 0,4 s, từ đầu sau 0,6 s; rời đi thì ngừng phát nhưng từ đang sống vẫn tính cho nhà; có mặt +15 %; Tướng không đánh khi trợ lực; Draconis bay thẳng, cất và hạ 0,6 s |
| `td-stream-schedule.test.ts` | Lịch không trôi; **so le ≥ 0,2 s trừ khi đã lùi hết 0,6 s, chạy ở 4 nhà × 1 s**; đầy thì chờ rồi bỏ; đổi nhịp đặt lại, không từ tức thì; Dừng tất cả; phát suốt lúc chờ đợt; pha chuẩn bị Nhiệt ≤ 2,5 |
| `td-letters.test.ts` | **Thuộc tính 10.000 tick, 4 ô nhịp 1 s, trên từ vựng thật cấp 1, 1–3, 1–5:** chữ đầu không mơ hồ; không từ trùng; không cặp OSA ≤ 1; ≤ trần chữ; ≤ 4 mỗi nhà; ≤ 16 tổng. Nghỉ chữ 1 s; 3 dự trữ (với loại giả ưu tiên cao); tầng 2 sớm ở cấp ≤ 3; in tỉ lệ nghẽn chữ theo cấp |
| `td-router.test.ts` | Khóa tầng 1; nhóm tầng 2; đổi khóa mềm tính 1 lỗi chung, không lỗi cho từ cũ; phím sai không tiến; Backspace về 0 nhả khóa; Esc theo thứ tự; Space nuốt; phím lạc; hết tuổi khi đang khóa |
| `td-scorer.test.ts` | Bảng A_w và kết quả cho độ dài 3, 5, 8, 12 (TK 6.6); S_w đo từ lúc từ hiện; Chớp ở S_w ≥ 0,7; tốc gõ thuần tách riêng; phím dồn trong một tick không làm sai |
| `td-heat-chain.test.ts` | Bảng Nhiệt; không giảm khi còn đứng và còn phát; Dư âm 4 + 2C rồi −0,25/s; Chuỗi −2 khi tan chưa chạm, ÷2 khi tan đã gõ và khi Ẩu; ân hạn ra lệnh không trừ; r_c theo bậc; **Mượt riêng từng nhà: gõ Ẩu ở mỏ không đổi Mượt của pháo** |
| `td-rewards.test.ts` | Phát Chữ = D̄ × (0,8 + 1,2·Q) × T_atk × lenF; Hoàn hảo chắc chắn chí mạng; pháo hoa khi không có mục tiêu (vẫn tính Nhiệt, Chuỗi); vàng Mỏ phần nghìn có qA·qS; Lũy; Trại Lính; 5 từ tốt liền; **không có `min` nào trên đường trả thưởng** |
| `td-aura.test.ts` | Trần ×1,5 / ×1,4 / ×1,5 / +2 với mọi đầu vào; k_N nhân vào m; có mặt nhân ngoài trần |
| `td-lanes.test.ts` | Luật cột: không chồng khi L = 7,5 s và N = 1–2 s; cột ≤ 240 px; làn đẩy ngang, thứ tự ổn định; ≤ 0,3 ms với 20 thẻ |
| `td-input.test.ts` | `event.code` cho mọi phím mục 5.4; bỏ IME, giữ lặp, `isTrusted`; chữ cái không bao giờ thành lệnh; có đường bàn phím cho mọi việc trong đợt |
| `td-golden.test.ts` | Bot chơi 3 đợt với seed cố định; mã băm mỗi 60 tick khớp `tests/golden/td-1a.json`; chạy lại từ nhật ký lệnh = chạy thật |
| `td-sim-perf.test.ts` | Một bước ≤ 2 ms trên CI với 300 quái, 9 lính, 200 đạn, 10 nhà, 4 ô nhịp 1 s |
| `td-balance-smoke.test.ts` | 3 bot nhanh (25, 35, 70 WPM) chạy 3 đợt không lỗi; số liệu nằm trong khoảng thô (không chặn theo mục tiêu cân bằng) |

### 6.2 Kịch bản trình duyệt

Chạy: `node scripts/visual/cdp-run.mjs scripts/visual/scenarios/td-1a-*.mjs --width=1280 --height=720` và một lần `--width=1920 --height=1080`. Gõ thật qua CDP `Input.dispatchKeyEvent` theo WPM đặt sẵn, đọc từ đang sống bằng `__td.liveWords()`. Mọi kịch bản kiểm: không lỗi console, không ngoại lệ trang.

| Kịch bản | Làm | Ảnh | Kiểm |
|---|---|---|---|
| `td-1a-boot.mjs` | Mở `td.html?sandbox=1` không media | `td-1a-boot` | Trang dựng, HUD hiện |
| `td-1a-combat.mjs` | Đặt 2 Tháp Cung, 1 Trại Lính; 2 đợt không gõ | `td-1a-combat` | `stats().kills > 0`; lính chặn; không lỗi |
| `td-1a-stream.mjs` | 1 ô, Tháp Cung nhịp 4 s; gõ thật 40 WPM một đợt | `td-1a-stream`, `td-1a-lock` | `stats().streamDone > 0`; chữ đầu khác nhau; Phát Chữ bắn ra |
| `td-1a-slots.mjs` | "Đặt sẵn 4 ô"; Gạch đi qua cầu tới N3; gõ 70 WPM hai đợt | `td-1a-route` (đường A* qua cầu), `td-1a-four-slots` | 4 nhà cùng phát; Gạch tới mỏ; không hai thẻ chồng; ≥ 18 px; trong vùng an toàn; chữ đầu khác nhau |
| `td-1a-words-dense.mjs` | 4 nhà trong 20 m, nhịp 1 s; E = 12 Dễ (L = 7,5 s) và E = 35 Thường | `td-1a-dense-easy`, `td-1a-dense-normal` | Không chồng; cột ≤ 240 px; diện tích thẻ ≤ 6 % màn hình. **Bắt buộc đạt.** |
| `td-1a-keyboard-only.mjs` | 3 đợt chỉ bằng bàn phím: `Insert` xây, Tab + Enter gửi, `-` `=` nhịp, `Shift+Enter` gọi đợt, gõ chữ | `td-1a-keyboard` | Có ≥ 3 nhà, ≥ 2 lệnh gửi, ≥ 1 đổi nhịp; thắng 3 đợt |
| `td-1a-ime.mjs` | Theo `campaign3d-ime.mjs`: chuỗi Telex, VNI, số, `-`, `=`, Tab, Enter | — | Không phím chữ nào thành lệnh; số chọn người; Backquote an toàn |

### 6.3 Bot và báo cáo (`pnpm td:balance`, chỉ in, không chặn)

- **Bộ sinh phím** (`tests/td/keystrokes.ts`): WPM, độ chuẩn mỗi phím (lỗi theo seed), sửa bằng Backspace theo xác suất.
- **Người đọc giả lập** (`tests/td/reader.ts`): nhận ra từ mới sau 0,35–0,6 s; mỗi lúc gõ một từ; chọn từ gấp nhất, ưu tiên nhà có quái trong tầm.
- **Chính sách** (`tests/td/policies/*`): đứng cố định theo bố cục; nhịp cố định; nhịp theo gợi ý; Tướng con lắc giữa tháp và mỏ.
- **Báo cáo in ra:** tỉ lệ trúng theo nhịp và theo E; tải trung bình; DPS theo nguồn (tháp thường, Phát Chữ, lính, Draconis); vàng theo nguồn (hạ quái, tự sản, gõ, thưởng đợt); mạng mất; tỉ lệ nghẽn chữ theo cấp từ vựng; **so sánh 1, 2, 3, 4 ô** ở 25, 35, 50, 70, 100 WPM; so sánh Chuẩn 35 WPM 98 % với Nhanh ẩu 50 WPM 85 %. Ghi kèm bảng mục tiêu TK 19.7 để so, không chặn.

---

## 7. Cổng cứng để xong 1A

1. `pnpm check` xanh (test + build). V4 vẫn chạy (`defense.mjs` khói).
2. Mọi test mục 6.1 xanh. `tests/credit-*.test.ts`, `tests/campaign3d-keys.test.ts`, `tests/defense-frame-error.test.ts` không sửa và xanh.
3. **Bất biến:** chữ đầu không mơ hồ, không trùng, không OSA ≤ 1, đúng trần, so le đúng luật, không vòng lặp tiền.
4. **Tất định:** test vàng khớp; chạy lại hai lần ra cùng mã băm; Node và Chrome cùng mã băm cho cùng nhật ký lệnh (kiểm một lần bằng `__td.hash()` sau khi chạy nhật ký mẫu).
5. **Hiệu năng:** sim ≤ 0,5 ms mỗi bước trên máy chủ dự án (≤ 2 ms trên CI) với 300 quái và 4 ô nhịp 1 s; bản vẽ 2D + thẻ chữ ≤ 8 ms mỗi khung ở 1280 × 720.
6. Mọi kịch bản mục 6.2 đạt, không lỗi console.
7. Chủ dự án đã chơi theo danh sách mục 8 và đã ghi nhận xét.

Mục tiêu cân bằng (sao, tỉ lệ nguồn vàng, ×1,15 của ô thêm…) **không** là cổng của 1A. Chúng chỉ in trong báo cáo.

---

## 8. Chủ dự án chơi thử (1280 × 720)

Mở `td.html?sandbox=1`. Khoảng 20–30 phút.

1. **1 ô:** đặt Tháp Cung ở khúc nhập. Gửi Draconis. Chơi đợt 1–2 ở nhịp 6 s, rồi 4 s, rồi 3 s. Có thấy "chữ thành tên bắn" không?
2. **Con lắc:** thêm Mỏ ở N1. Giữa đợt, dời Draconis sang mỏ lúc lặng, về tháp lúc đông.
3. **2 ô:** hộp cát Lũy cấp 2. Chấm đứng mỏ, Draconis ở tháp.
4. **3 ô:** Lũy cấp 3. Thêm Tháp Pháo, gửi Phẩy.
5. **4 ô:** bấm "Đặt sẵn 4 ô". Gạch đi qua cầu tới mỏ bên kia suối. Chơi đợt 4–6 với 4 cột chữ. Thử một nhà ở nhịp 1 s.
6. **Bàn phím:** chơi một đợt không chạm chuột.
7. **Từ vựng:** đổi cấp từ vựng 1 và 1–5. Đổi E 20 và 60.
8. Trả lời nhanh:
   - Chữ sống khoảng 3 s có đủ không? Muốn dài hơn hay ngắn hơn?
   - Ở 3 và 4 ô, có đọc kịp không? Chỗ nào rối nhất?
   - Thẻ chữ, chấm đèn lồng, chip Tải có dễ hiểu không?
   - Nhịp nào thấy vui nhất? Có muốn đổi cách chọn nhịp không?
   - Có thấy mình mạnh lên khi gõ nhanh và chuẩn hơn không?
   - Muốn thêm hoặc bỏ gì trước khi làm 1B?

---

## 9. Sau 1A

- **1B** (TK 26.1): nâng cấp và bán có giá; Lũy mở ô trong truyện; Ruộng và Lúa; túi, Từ Nhặt, bùa; Mảnh Chữ; Đài Ấn; Tối Thượng và Chữ Chiêu; gõ trực tiếp Ngắt, Neo, Phá Khiên; Từ Vàng, Từ Ôn, nghĩa tiếng Việt; cụm chốt, Bùng Nổ; quái bản đồ 1 + Troll; Mộc Tinh nhỏ; bản đồ 1 theo bảng dạy TK 20.4; Lam dạng khối; kế hoạch học và khởi động lạnh; thử thách Bốn Ô. Cổng như 1A + báo cáo đủ bảng TK 19.7.
- **1C** (TK 26.1): hình 3D với model tạm và model Tripo đã có; cảnh 2D cơ bản; đồng bay về HUD, Mảnh Chữ về Tướng, túi về người nhặt; Dải Chữ, khay mép; chuyển Credit Crystal sang `src/platform` qua `pickup-lab`. Kịch bản `td-words`, `td-loot`, `td-scale`, `td-hud-budget`.
- Sau khi 1A chạy: viết file prompt ảnh bậc P (ảnh 2D sẵn cho Tripo: tư thế, góc nhìn theo TK 23.11). Sau 1B: file prompt âm thanh bậc P (TK 27.2).

---

## 10. Rủi ro của 1A

| Rủi ro | Chặn |
|---|---|
| Vượt 5.000 dòng | Cắt UI trước (vòng menu thành thanh đơn giản, bỏ kéo chân dung); không cắt luật, test |
| Bản 2D không cho cảm giác "đã tay" | Thẻ chữ, chữ bay vào nhà, Phát Chữ có vệt chữ cái, tiếng xong từ theo thang nốt đều có ở 1A |
| Từ vựng cấp 1 thiếu chữ đầu | Trần chữ theo A; tầng 2 sớm; test trên từ vựng thật |
| Đường bàn phím xây nhà khó dùng | Chỗ trống gợi ý tính sẵn trong sim; chuột vẫn là đường chính |
| Gõ qua CDP khác gõ thật | Kịch bản dùng `Input.dispatchKeyEvent` (có `isTrusted`); chủ dự án vẫn chơi bằng tay ở mục 8 |
| Chủ dự án muốn thấy 3D ngay | 1A ngắn; 1C bắt đầu ngay khi có model Tripo đầu tiên |
