# Space Typing Defense — Kế hoạch V3 (bản triển khai)

- **Ngày:** 21/10/2026
- **Người viết:** Claude, theo yêu cầu của chủ dự án (21/10).
- **Trạng thái:** **đã thay bằng V4** (`SPACE_TYPING_DEFENSE_PLAN_V4_2026-10-21.md`) sau phản hồi của chủ dự án ngày 21/10. Giữ để đối chiếu.
- **Dựa trên:**
  - V1: `SPACE_TYPING_DEFENSE_MASTER_PLAN_V1.md` (ý tưởng gốc của chủ dự án);
  - V2: `SPACE_TYPING_DEFENSE_PLAN_V2_2026-10-18.md` (luật đã chốt, số đo hiệu năng);
  - quy trình: `CLAUDE_PROCESS_2026-10-17.md`.
- **Yêu cầu mới của chủ dự án (21/10):**
  - bổ sung để game **lôi cuốn, hấp dẫn** hơn;
  - hiệu ứng và hình ảnh thật kỹ, tận dụng tài sản sẵn có;
  - tài sản còn thiếu thì Claude gửi prompt để chủ dự án tạo;
  - **300–400 quái cùng lúc** mà vẫn mượt, không giảm hình ảnh và hiệu ứng.

---

## 0. Tóm tắt thay đổi so với V2

| Chủ đề | V2 | V3 | Lý do |
|---|---|---|---|
| Số quái | 20–60 con thường, trần 300 | **Tới 400 con** trong đợt dồn | Yêu cầu 21/10. Đạt được nhờ **đàn bầy** (mục 4.2) và vẽ theo lô (mục 15). |
| Diệt nhiều con | Chỉ từ bom | Từ bom, **nổ dây chuyền**, và **đàn bầy** (một từ diệt cả đàn, vì đàn là một quái) | Biển quái mà vẫn giữ luật "một từ diệt một quái". |
| Bản thử | A: 2 trụ, 3 quái, chưa có boss | **A+:** 3 trụ, 4 loại quái, **boss cuối màn**, chọn phước lành, mốc combo | Bản thử phải đủ hấp dẫn thì người thử mới trả lời được câu "có vui không". |
| Kỹ năng | Phím 1–2 | Phím 1–2 và **Space Nova** | Nova đã có ở Campaign 3D, dùng lại được. |
| Phần thưởng giữa trận | Không | **Phước lành Rift:** chọn 1 trong 3 sau đợt 3, 6, 9 (mục 9) | Lấy từ "relic draft" của V1. Mỗi lần chơi một khác. |
| Tâm lý trận | Không nói | **Nhịp đợt** êm → dồn → bão → boss; **mốc combo** tăng dần hình ảnh và nhạc (mục 3, 8) | Lấy từ V1 mục 1.2 E và 20.2. |
| Mô hình | Chờ chủ dự án tạo Lõi, trụ, cổng | Dùng ngay model relic và duel-target chủ dự án vừa tạo | Không phải chờ tài sản mới. |
| Góc nhìn | Isometric | Chéo từ trên cao; Lõi ở gần máy quay, cổng ở xa | Quái tiến về phía người chơi, mặt quái luôn đọc rõ. |

**Giữ nguyên từ V2:** mọi luật ở V2 mục 2; trụ không gây sát thương; chỉ từ gõ đúng mới diệt; tối đa 8 nhãn chữ; chưa nối ví; chế độ riêng; tối đa 4 người ở giai đoạn D.

---

## 1. Bốn trụ cột trải nghiệm

1. **Gõ là vũ khí.** Mỗi từ gõ xong là một cầu lửa của rồng. Không có cách nào khác để giết.
2. **Một từ, một bùng nổ.** Từ bom, nổ dây chuyền và đàn bầy biến một từ gõ đúng lúc thành cảnh nổ lớn.
3. **Biển quái, màn hình vẫn đọc được.** Tới 400 con, nhưng chỉ 8 nhãn chữ. Nhãn luôn nằm trên mọi hiệu ứng.
4. **Học thật.** Từ thật theo cấp; nghĩa, IPA và phát âm sau mỗi lần diệt; ôn nhanh cuối đợt.

---

## 2. Luật không được phá

Giữ đủ 10 điều ở V2 mục 2. Thêm hai điều:

11. **Đàn bầy là một quái.**
    - Một đàn gồm 24–60 drone bay quanh một tâm, mang **một từ**. Gõ đúng thì cả đàn nổ dây chuyền.
    - Drone không mang chữ và không bị diệt riêng lẻ.
    - Vụ nổ từ bom chạm tâm đàn thì cả đàn nổ.
12. **Nổ dây chuyền chỉ đi qua quái mang từ bom.**
    - Vụ nổ diệt một quái Volatile (hoặc quái đã bị Trụ Mồi Nổ đánh dấu) thì quái đó nổ tiếp sau 0,15 giây.
    - Mỗi chuỗi tối đa 12 vụ, để không thành "một từ dọn cả màn".

---

## 3. Vòng chơi và nhịp đợt

```text
Chọn mức → [Pha xây → Pha đợt → Kết đợt (ôn nhanh / phước lành)] × 10 → Kết màn
```

- Pha xây, pha đợt, kết đợt, Lõi 20 mạng: giữ như V2 mục 3.
- **Nhịp 10 đợt** (bản đồ "Rainbow Reach Rift"):

| Đợt | Nhịp | Nội dung chính |
|---|---|---|
| 1–2 | Êm | Scout; Volatile đầu tiên ở đợt 2 |
| 3 | Dồn | Tank đầu tiên → **phước lành** |
| 4 | Giới thiệu | **Đàn bầy** đầu tiên |
| 5 | Dồn | Tank, đàn, nhiều Volatile |
| 6 | **Bão** | Khoảng 200 con → **phước lành** |
| 7 | Hồi | Ít quái hơn, để thở |
| 8 | **Bão lớn** | Khoảng 300–400 con |
| 9 | Dồn | Tank và đàn → **phước lành** |
| 10 | **Boss** | Rift Warden cùng quân hộ tống |

- **Báo trước đợt:** trong pha xây, bảng "Đợt kế tiếp" hiện biểu tượng và số lượng từng loại quái. Cổng bắt đầu rực sáng 3 giây trước khi đợt mở.

---

## 4. Quái (bản A+)

### 4.1 Bảng quái

Đơn vị: mét; tốc độ tính bằng mét/giây. Số liệu sẽ chỉnh lại qua người chơi máy (mục 16).

| Quái | Mô hình | Tốc độ | Số từ | Lọt Lõi mất | Ghi chú |
|---|---|---|---|---|---|
| **Scout** | `angel-scout` | 3,0 | 1 | 1 mạng | Đi thành đàn nhỏ |
| **Tank** | `angel-tank` | 1,5 | 3 | 3 mạng | Hiệu ứng làm chậm chỉ có tác dụng một nửa. Kiểu nhìn nghĩa (tùy chọn). |
| **Volatile** | `rainbow-mine` | 2,2 | 1 từ bom | 1 mạng | Luôn mang từ bom |
| **Đàn bầy** (Swarm) | `prism-scout` (drone) | 2,0 | 1 | 2 mạng | 24–60 drone. Một từ diệt cả đàn. |
| **Rift Warden** (boss) | `bosses/warden-rainbow` | 1,0 | 3 lớp × 2 từ | thua ngay | 3 pha (mục 10) |

### 4.2 Vì sao có đàn bầy

- Người gõ 40 từ/phút diệt khoảng 0,7 con mỗi giây. Nếu mỗi con một từ thì 400 con là quá sức.
- Đàn bầy cho màn hình cảm giác "biển quái" (đợt 8 có tới 300–400 drone và quái), mà số từ phải gõ vẫn vừa sức.
- Gõ trúng một đàn là một màn nổ dây chuyền đẹp. Đây là phần thưởng thị giác chính của Defense.

### 4.3 Hình dáng và hướng quay

- Mọi quái vẽ theo lô (mục 15).
- Quái hướng mặt về máy quay, ngả ra sau khoảng 20°, và lệch tối đa ±30° theo hướng đi. Nhờ vậy mặt quái (thiết kế 2D gốc) luôn đọc được.
- Quái nhún và lắc theo nhịp riêng. Khi trúng đòn thì lóe trắng. Bị Trụ Băng thì nhuốm xanh băng. Bị Trụ Xích giữ thì nhuốm tím. Mang từ bom thì có quầng đỏ cam nhấp nháy.

---

## 5. Trụ (bản A+)

Luật chung giữ như V2 mục 5.1: sát thương bằng 0; quái quen dần với hiệu ứng (100 % → 60 % → 30 % trong 6 giây); thưởng khi diệt quái đang dính hiệu ứng.

| Trụ | Mô hình | Giá (nâng cấp) | Cấp 1 | Cấp 2 | Cấp 3 |
|---|---|---|---|---|---|
| **Trụ Băng** (Frost Spire) | `items/tower-frost` | 60 (50, 90) | Tầm 7, chậm 40 % | Chậm 50 %; đóng băng 0,8 s khi quái mới vào tầm | Tầm 9; đóng băng 1,2 s |
| **Trụ Xích** (Gravity Well) | `items/tower-gravity` | 80 (60, 110) | Tầm 6, kéo quái vào giữa đường, chậm 20 % | Tầm 7,5, kéo mạnh hơn | Mỗi 6 s: **Sụp trọng lực**, gom chặt cụm quái trong 1,5 s |
| **Trụ Mồi Nổ** (Volatile Beacon) | `items/tower-beacon` | 90 (70, 120) | Tầm 8; mỗi 10 s biến từ của quái đi xa nhất trong tầm thành **từ bom** | Mỗi 8 s | Mỗi 6 s; bán kính nổ +20 % |

- **Ô đặt trụ:** 8 ô cố định, hiện bằng vòng sáng. Ô ở khúc cua giữ quái lâu hơn.
- **Phối hợp có thưởng:**
  - **Vỡ băng:** diệt quái đang đóng băng thì nó vỡ thành mảnh băng, làm chậm quái bên cạnh 1,5 s.
  - **Sụp nổ:** từ bom nổ trong vùng Trụ Xích thì bán kính nổ +40 %.

---

## 6. Từ bom và nổ dây chuyền

- Từ bom có viền đỏ cam, chữ hơi nhấp nháy; là từ dài hơn trong cấp từ vựng.
- Gõ xong thì nổ, bán kính 3 m:
  - diệt quái thường và đàn bầy trong vòng nổ;
  - phá một lớp của Tank và boss;
  - không hại Lõi, trụ hay rồng.
- **Nổ dây chuyền:** quái mang từ bom bị nổ cuốn theo thì nổ tiếp (mục 2, điều 12).
- Màn hình hiện **"CHAIN ×N"**. Mỗi vụ trong chuỗi cho thêm Năng lượng.
- **Ghi nhận việc học:** chỉ từ bom được gõ mới tính là một lần gõ.

---

## 7. Rồng và kỹ năng

- Draconis v3 lượn trên Lõi, quay đầu về mục tiêu đang khóa, phun cầu lửa (dùng lại toàn bộ cầu lửa 3D, âm thanh và vụ nổ của Campaign 3D).
- **Thanh Rift:** mỗi từ đúng +6; mốc combo cho thêm.

| Phím | Kỹ năng | Tốn | Hồi | Tác dụng |
|---|---|---|---|---|
| 1 | **Hơi thở lửa** | 50 | 18 s | 6 s: mọi từ gõ đúng thành từ bom |
| 2 | **Tiếng gầm** | 35 | 12 s | Đẩy lùi mọi quái 4 m theo đường, choáng 0,6 s |
| Space | **Nova** | 100 | — | 8 s: mọi nhãn chữ đổi sang từ ngắn (≤ 4 chữ cái) |

---

## 8. Combo và bùng nổ

| Mốc combo | Tên | Hiệu ứng |
|---|---|---|
| 10 | **Bén lửa** | Cầu lửa to hơn, vệt sáng dài hơn; +10 Năng lượng |
| 25 | **Hỏa ngục** | Quầng lửa quanh rồng; nhạc lên lớp dồn dập; thanh Rift nạp ×1,25 |
| 50 | **Cơn thịnh nộ Rift** | Viền màn hình đỏ cam; cầu lửa nổ to hơn (chỉ là hình ảnh); thanh Rift nạp ×1,5 |

- Gõ sai thì combo về 0 (giữ V2). Có phước lành "Giữ lửa" để chỉ mất nửa combo.
- Có tiếng xướng ở mỗi mốc ("Inferno!"). Tiếng xướng không đè tiếng phát âm từ vựng.

---

## 9. Phước lành Rift

- Sau đợt 3, 6, 9: chọn 1 trong 3 thẻ, bằng phím 1/2/3 hoặc chuột.
- Không bán, không mang sang màn khác.

| Phước lành | Tác dụng |
|---|---|
| Bom lan rộng | Bán kính nổ +30 % |
| Băng sâu | Thời gian đóng băng +0,6 s |
| Lửa hồi năng | Mỗi từ đúng +2 Năng lượng |
| Giữ lửa | Gõ sai chỉ mất nửa combo |
| Gom chặt | Trụ Xích kéo mạnh hơn 30 % |
| Mồi nhanh | Trụ Mồi Nổ hồi nhanh hơn 2 s |
| Lõi gia cố | +4 mạng (không vượt 24) |
| Chuỗi dài | Nổ dây chuyền tối đa 20 vụ |
| Rồng hăng | Thanh Rift +25 % mỗi từ |

---

## 10. Boss: Rift Warden (đợt 10)

- **Pha 1:** đi theo đường, mang 3 lớp giáp. Mỗi lớp cần gõ 2 từ. Trụ chỉ làm chậm boss 50 %.
- **Pha 2:** còn 1 lớp thì boss dừng lại, gầm, và gọi 2 đàn bầy. Boss vẫn nhận từ.
- **Pha 3:** lớp cuối vỡ thì boss lao về Lõi. Mỗi từ gõ đúng đẩy boss lùi 2 m. Diệt được thì cả màn hình nổ chậm (slow-motion).
- Boss lọt vào Lõi là thua ngay.

---

## 11. Lõi, thắng thua, sao

- **Lõi:** 20 mạng. Có hiệu ứng nứt dần khi mất mạng; còn 5 mạng thì báo động đỏ.
- **Thắng:** qua 10 đợt.
- **Sao** (giữ V2):
  - 1 sao: thắng;
  - 2 sao: Lõi còn ≥ 80 % mạng;
  - 3 sao: độ chính xác ≥ 95 %.
- **Mức khó:**
  - Dễ: quái chậm 25 %, Năng lượng +25 %;
  - Thường;
  - Khó: quái nhanh 20 %, pha xây có đếm ngược 20 giây.

---

## 12. Học từ

- Giữ V2 mục 4: từ theo cấp, nghĩa/IPA/phát âm sau mỗi lần diệt, ôn nhanh cuối đợt, ôn lại trong màn.
- Sự kiện học gửi qua `typing-game:learning:v1:attempt` khi trang chạy trong portal.
- Tank có tùy chọn "Quái mạnh dùng kiểu nhìn nghĩa".

---

## 13. Hình ảnh và VFX

**Tận dụng:**
- bầu trời World và hạt sáng (`src/scene3d`);
- cầu lửa 3D, vệt sáng, nổ ảnh lửa thật (`HeroFx`);
- ảnh nổ, sóng xung kích, khói, tia lửa (`public/assets/space-typing/combat-vfx`);
- mô hình quái, boss, vật thể chủ dự án đã tạo.

| Sự kiện | Hiệu ứng |
|---|---|
| Gõ đúng một chữ | Nhãn bật sáng; rồng nghiêng về mục tiêu |
| Diệt một con | Cầu lửa bay cong → nổ lửa + tia lửa màu họ quái + lóe sáng tại chỗ |
| Diệt đàn bầy | Drone nổ dây chuyền từ tâm ra ngoài trong khoảng 0,4 s, mỗi con một chấm lửa nhỏ, cùng một sóng xung kích lớn |
| Từ bom | Cầu lửa lớn + vòng xung kích + rung màn hình + **dừng hình 70 ms** (hitstop) |
| Nổ dây chuyền | Mỗi vụ một sóng nhỏ; chữ "CHAIN ×N" phóng to dần |
| Đóng băng | Quái phủ xanh băng; vỡ băng thì mảnh băng văng ra |
| Trụ Xích | Vòng xoáy tím dưới chân trụ; tia kéo về tâm |
| Trụ Mồi Nổ | Tia đỏ từ trụ tới quái được đánh dấu; vòng ngắm quay |
| Quái lọt Lõi | Lõi chớp đỏ, mảnh vỡ, rung nhẹ, tiếng va đập |
| Mở đợt | Cổng xoáy sáng dần, tiếng mở cổng |
| Boss xuất hiện | Dải đen điện ảnh, cột sáng ở cổng, tên boss |
| Thắng | Quay chậm, pháo sáng quanh Lõi |

**Luật đọc được:**
- nhãn chữ luôn ở lớp trên cùng (HTML);
- không có ảnh nổ nào phủ lên nhãn đang khóa;
- tôn trọng cài đặt "giảm chuyển động": tắt rung và dừng hình.

---

## 14. Âm thanh

- Chỉ dùng bản thu có sẵn trong game (đều CC0 hoặc có ghi nguồn).
  - Tiếng rồng: `audio/dragon`.
  - Nổ: `duel/war/explosion-*`.
  - Trụ: `duel/sfx` (scan, energy).
  - Giao diện: Kenney.
- **Giới hạn:** tối đa 6 tiếng nổ trong 120 ms. Nổ dây chuyền gộp thành một tiếng lớn hơn.
- **Nhạc theo cường độ:** êm → đợt → bão → boss → thắng, dùng nhạc World có sẵn và đổi âm lượng lớp.
- Tiếng phát âm từ vựng không bị đè: các tiếng khác nhỏ đi khi đang đọc từ.

---

## 15. Hiệu năng (yêu cầu 300–400 quái)

**Kiến trúc:**

1. **Luật chạy riêng**, bước cố định 1/60 giây, dữ liệu quái trong mảng số (typed array, tối đa 512 quái). Không tạo đối tượng mới mỗi khung.
2. **Vẽ theo lô:** mỗi loại mô hình là một `InstancedMesh`. 400 quái chỉ tốn 4–6 lệnh vẽ.
   - Quái thường dùng bản rút gọn (`-lod`, 800–1.200 tam giác).
   - Boss dùng mô hình đầy đủ.
3. **Chuyển động trong bộ đổ bóng đỉnh** (vertex shader): nhún, lắc, vỗ cánh. Màu trạng thái (băng, xích, bom, lóe sáng) lấy theo từng con.
4. **Kho dựng sẵn:** tạo đủ chỗ cho 512 quái khi vào màn. Giữa trận không tạo hay xóa mô hình.
5. **Nhãn chữ:** tối đa 8 thẻ HTML, chỉ đổi nội dung khi chữ thay đổi.
6. **Hạt hiệu ứng:** dùng kho hạt có giới hạn sẵn có (High 2.400, Medium 1.000). Drone nổ lấy hạt theo lượt, không vượt kho.
7. **Âm thanh:** giới hạn số tiếng cùng lúc (mục 14).
8. **Tự hạ mức:** đo 5 giây đầu. Nếu trung bình quá 20 ms thì chuyển High → Medium.

**Ngân sách** (đo bằng `__defense.measure()` và kịch bản `defense-perf`):

| Máy | Mục tiêu ở 400 quái |
|---|---|
| Máy chủ dự án, High | ≤ 8 ms/khung |
| CPU chậm 4 lần (giả laptop yếu), High | ≤ 16,7 ms/khung |
| Medium | Thấp hơn High |

---

## 16. Kỹ thuật

- **Mã:**
  - `src/defense/rules/`: luật thuần TypeScript, không dùng three.js;
  - `src/defense/view/`: hình ảnh và âm thanh;
  - `src/defense/main.ts`: trang.
- **Dùng chung với Campaign 3D:** `keys.ts` (bộ gõ) và `words.ts` (chọn từ) chuyển về `src/scene3d/`, vì Defense không được nạp mã của Campaign 3D.
- **Ranh giới:** mở rộng `tests/mode-isolation.test.ts` cho `src/defense/`. Khóa lưu bắt đầu bằng `spaceTypingDefense`.
- **Người chơi máy:** bộ giả lập gõ 30/45/60 từ/phút, chạy cả màn trong vitest, để kiểm cân bằng và tiêu chí V2 mục 12.2 (ví dụ: không đặt trụ thì không thắng ở mức Thường).
- **Công cụ:** `window.__defense` (bắt đầu, nhảy đợt, đợt dồn N quái, làm chậm, đo hiệu năng); kịch bản chụp `scripts/visual/scenarios/defense*.mjs`.

---

## 17. Tài sản

**Dùng ngay:**

| Vai trò | Tài sản |
|---|---|
| Lõi | `items/defense-core` (fate-crystal) |
| Cổng | `items/defense-gate` (black-hole) |
| 3 trụ | `items/tower-frost` (relic frost-rhythm), `items/tower-gravity` (duel-target gravity), `items/tower-beacon` (duel-target lock-on) |
| Quái | `enemies/*-lod` vẽ theo lô; boss `bosses/warden-rainbow` |
| Rồng và cầu lửa | `heroes/draconis-v3`, `skills/dragon-fireball` |
| Nền | bầu trời World 1, hạt sáng |

**Cần tạo thêm** (prompt ở `docs/art-requests/DEFENSE_ASSETS_PROMPTS_2026-10-21.md`):
- đảo nổi làm nền bản đồ;
- 3 cấp cho mỗi trụ;
- drone đàn bầy riêng cho từng họ quái;
- biểu tượng 2D cho trụ, kỹ năng và phước lành.

Khi có tài sản mới, chỉ cần đóng gói lại và đổi tên trong `src/defense/rules/data.ts`.

---

## 18. Lộ trình

- **A+ (đang làm, 21/10):**
  - 1 bản đồ, 10 đợt, 3 trụ, 4 loại quái, boss;
  - 3 kỹ năng, phước lành, mốc combo, sao, 3 mức khó;
  - ôn nhanh, người chơi máy, đo hiệu năng 400 quái.
- **B, C, D:** giữ như V2 mục 11. Thêm vào B:
  - Trụ Gợi Ý, Trụ Vang;
  - quái Shield, Healer;
  - kiểu chơi Vô tận ("Rift Endless") dùng đàn bầy.
- **Không làm:** như V2 mục 11 E.

---

## 18a. Đã làm (21/10, bản A+)

**Chơi thử:**
- vào `defense.html`, hoặc nút **Rift Defense** trên thẻ Campaign ở màn hình chính;
- chọn mức khó, bấm Defend.

**Mã:**
- `src/defense/rules/`: `data.ts` (bảng số), `path.ts` (đường), `engine.ts` (luật);
- `src/defense/view/`: `crowd.ts` (vẽ đám đông theo lô), `map.ts` (bản đồ, trụ, Lõi, cổng);
- `src/defense/main.ts`, `src/defense/defense.css`, `defense.html`.
- `keys.ts` và `words.ts` đã chuyển về `src/scene3d/` (dùng chung với Campaign 3D).
- `WordPicker` có thêm nhóm từ ngắn cho Nova.

**Mô hình mới đóng gói** (`scripts/models/presets/campaign3d-models.json`):
- `items/defense-core`, `items/defense-gate`, `items/tower-frost`, `items/tower-gravity`, `items/tower-beacon`;
- `enemies/angel-scout-lod`, `enemies/angel-tank-lod`, `enemies/rainbow-mine-lod`, `enemies/prism-scout-lod`.

**Cân bằng, đo bằng người chơi máy** (`tests/defense-rules.test.ts`, 6 lần chạy mỗi kiểu):

| Người chơi | Kết quả |
|---|---|
| 38 từ/phút có trụ, Thường | Thắng 6/6 |
| 38 từ/phút không trụ, Thường | Thua 6/6 |
| 45 từ/phút có trụ, Thường | Thắng 6/6; lúc đông nhất 260–377 quái |
| 30 từ/phút, Dễ | Thắng 6/6 |
| 60 từ/phút, Khó | Thắng 6/6; lúc đông nhất 321–403 quái |

**Hiệu năng** (`scripts/visual/scenarios/defense-perf.mjs`, máy Mac Apple Silicon, High, không giới hạn khung hình, có trụ và gõ chữ liên tục):

| Điều kiện | Kết quả |
|---|---|
| 473 quái | trung bình 2,65 ms, p95 4,7 ms |
| CPU chậm 4 lần, 393 quái | trung bình 3,52 ms, p95 5,6 ms |

Khoảng 75 lệnh vẽ. Đạt ngân sách ở mục 15. Vẫn nên đo thêm trên laptop dùng card tích hợp.

**Ảnh chụp kiểm tra** (`scripts/visual/scenarios/defense.mjs`):
- menu, pha xây, cầu lửa, từ bom, đợt Bão (417 quái, 60 khung hình/giây), Dragon Breath;
- phước lành, boss, màn kết quả;
- không có lỗi JavaScript.

**Chưa làm ở A+:**
- tùy chọn "Tank dùng kiểu nhìn nghĩa";
- trụ có model riêng theo cấp (đang phóng to và sáng dần cùng một model);
- thử với người chơi thật (V2 mục 12).

## 19. Quyết định Claude đã chọn theo đề xuất (21/10)

1. Tên: **Rift Defense**.
2. Đàn bầy tính là một quái mang một từ.
3. Bản A+ có boss và phước lành (V2 để ở B).
4. Dùng model relic và duel-target làm Lõi, cổng và trụ cho tới khi có model riêng.
5. Rồng là pilot duy nhất ở A+. Phi thuyền để bản C, như V2.
6. Không cho xây trụ trong pha đợt (giữ đề xuất V2).
