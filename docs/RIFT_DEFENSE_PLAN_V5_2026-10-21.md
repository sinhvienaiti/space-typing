# Rift Defense V5 — Thiết kế chốt (21/10/2026)

Bản này là bản chốt. Nó thay hẳn:
- `docs/SPACE_TYPING_DEFENSE_PLAN_V4_2026-10-21.md` (đảo nổi, ô xây);
- `docs/art-requests/DEFENSE_MAPS_PROMPTS_2026-10-21.md` (prompt bản đồ đảo).

Bản này đã áp dụng toàn bộ 32 điểm phản biện. Bảng đối chiếu ở mục 25.

## Số liệu đối chiếu với mã ở HEAD `e11a0e3c`

Nhánh `feat/space-typing-admin-uiux`. Đợt sửa lỗi 1 đã vào nhánh.

- `src/platform/frame-loop.ts` đã có, dùng cho Campaign (`src/Game.ts`), Campaign 3D (`src/campaign3d/main.ts`) và Defense: `runFrameLoop` xin khung kế trước khi chạy, bắt lỗi riêng cho update và draw, dừng một tầng sau 3 lỗi liên tiếp, thử lại mỗi 1 s. `handleEach` xử lý hết sự kiện dù một cái lỗi. `src/defense/frame-error.ts` chỉ dừng ván khi đang xây hoặc đang đánh. `src/platform/canvas-state.ts` đã có. V5 dùng lại, không viết vòng lặp mới.
- `rules/data.ts`: tầm trụ 6–9 m. Cao điểm +25 % tầm, Mạch +15 % sức. `LABELS` = 8. Pha xây 25 s. Bán hoàn 60 %.
- `rules/engine.ts`:
  - Mỗi quái chết, **mọi** Thu Năng trong tầm đều trả `perKill` (cộng dồn).
  - Mỗi Đền có đồng hồ hồi Lõi riêng (cộng dồn).
  - Mỗi Mồi Nổ có nhịp đánh dấu riêng (chu kỳ tối thiểu 2 s).
  - Engine dùng `Math.hypot` 28 chỗ, `Math.sin/cos` 2 chỗ, `Math.atan2` 1 chỗ. Bản chạy thật tạo engine không có seed (`main.ts:385`), nên `Math.random` được dùng.
- `rules/maps.ts`: `ROAD_HALF_WIDTH` 1,6 m. 82 ô xây, 8–13 ô mỗi bản đồ. Ô gần đường nhất 3,15 m, gần Lõi nhất 8,4 m. Bản đồ 3 (ember-hollow) mở Băng, Sét, Thu Năng, Trọng Lực, Mồi Nổ. Chưa có Đền.
- `view/camera.ts`: nghiêng 30–85°, mặc định 57°, khoảng cách 24–112 m, tâm nhìn trong vòng 32 m. FOV dọc 50°.
- `view/towers.ts`: một model mỗi loại trụ, mỗi trụ một bản clone, có `AnimationMixer`, vòng, hào quang riêng. Cấp lên thì phóng to (tối đa ×1,34).
- `main.ts` (2.041 dòng):
  - `updateLabels` chỉ ẩn nhãn khi ở sau camera. Không ghim nhãn vào mép màn hình. Nhãn đặt theo `ROAD_Y` cố định.
  - Phím đọc ở `window keydown`, không có ô nhập. Backspace và Delete vẫn bán trụ (`main.ts:1607`). Phím chữ q/e/w/s/a/d xoay camera trong pha xây.
- VFX hiện tại:
  - Defense nạp `public/assets/space-typing/combat-vfx/<tên>.webp`. Các file này do `prepare-combat-vfx.mjs` cắt từ ảnh vẽ 2048² của chủ dự án (`art-src/combat-vfx/*.png`).
  - Mỗi ảnh chỉ **một khung**. Hoạt ảnh chỉ là "phóng to rồi mờ đi". `vfx.json` còn trỏ tới bản vector SVG khoảng 1,8 KB (gradient tròn viết bằng mã), `frameCount` 1.
  - Có sẵn 13 chuỗi hoạt ảnh 12 khung, 256 px, trong `art-src/combat-vfx-sequences/` và script `combat-vfx-sequences:prepare`. Defense chưa dùng.
- Loot của Space Typing đã có và đã có test: `src/vfx/credit-crystal-pickups.ts` (bung → lơ lửng → hút), `credit-crystal-renderer.ts`, `credit-crystal-fx.ts`, `credit-crystal-art.ts`, `src/audio/credit-sound.ts` (thang nốt theo chuỗi), `tests/credit-*.test.ts`. Ảnh đồng vẽ tay có 8 bậc: `src/assets/pickups/credits/{common, refined, high, elite, elite-golden, mini-boss, boss, major-boss}.webp`.
- Model `art-src/3d/pickups/credits/common.glb` có 28.314 tam giác, 2,8 MB. Không dùng làm đồng trong trận.
- Defense có 14 file TS. 8 file import mã Space Typing: 38 lệnh import (không tính `../platform/frame-loop`, được phép), 24 module. Thêm 2 chuỗi đường dẫn asset ngoài vùng Defense (`/assets/space-typing/combat-vfx/`, `/assets/audio/`). `tests/defense-rules.test.ts` import `src/scene3d/words`, `src/types` và đọc manifest model của Space Typing.
- `src/learning/shared.ts:151` từ chối mọi `gameId` khác `"space-typing"`. Portal ở repo cha (`portal/src/main.ts:143`) cũng xét theo `"space-typing"`.
- Ảnh chụp 2834 × 1488 của chủ dự án là màn Retina (DPR 2) của cửa sổ **1417 × 744 px CSS**. Bảng xây hiện cao khoảng 226 px CSS, tức 30 % chiều cao.
- Hiệu năng V4 (High, 442 quái, Mac Apple Silicon): trung bình 3,7 ms, p95 6,3 ms, 108 draw call. CPU chậm 4 lần: 6,6 / 9,4 ms.

---

## 0. Tóm tắt các quyết định

1. **Camera chuột như game chiến thuật.** Kéo trái hoặc giữa: kéo bản đồ. Kéo phải: xoay và nâng hạ góc. Lăn chuột: zoom vào đúng chỗ con trỏ. Không phím chữ nào điều khiển camera. Trong đợt vẫn chỉnh được camera bằng phím mũi tên và F1–F3.
2. **Không bao giờ mất chữ cần gõ.** Nhãn ra khỏi màn hình thì ghim vào mép, có mũi tên và màu khẩn cấp. "Theo dõi nguy hiểm" (bật mặc định) tự lướt camera khi có nhãn bị khuất.
3. **Mọi thứ có cỡ hợp lý.** HUD co giãn theo cửa sổ. Thanh xây một hàng, cao tối đa 10 % màn hình. Vật che tầm nhìn thì mờ đi.
4. **VFX làm lại bằng flipbook và shader.** Dùng ngay 13 chuỗi hoạt ảnh có sẵn. Thêm hòa tan theo nhiễu, hạt mềm khi chạm đất, vệt kéo, sóng xung kích méo hình. Ảnh VFX mới của chủ dự án là việc đầu tiên trong đợt art A.
5. **Loot dùng lại hệ Credit Crystal của Space Typing** qua lớp `src/platform`. Diệt quái thì đồng bung ra, nảy, rồi bay về ô Năng lượng. Có thêm Điểm trận.
6. **Đặt trụ tự do có vùng chiếm chỗ.** Vòng 2,0 / 2,3 / 2,7 m. Hai vòng cách nhau ≥ 1 m. Không xây trong 11 m quanh Lõi. Tối đa 16 trụ mỗi bản đồ. Thu Năng tối đa 3, Đền 2, Mồi Nổ 3.
7. **Hỗ trợ cùng loại không cộng dồn.** Thu Năng trả theo trụ mạnh nhất. Hồi Lõi một đồng hồ chung. Mồi Nổ có thời gian chờ chung.
8. **Không có vòng lặp kiếm tiền.** Hoàn tác, dời, bán, thạch anh, Chim Vàng đều có luật kín. Có test thuộc tính.
9. **8 vùng đất thật**, liền tới chân trời. Đường, mép nước, vách đá vẽ từ dữ liệu luật. Ảnh nền của chủ dự án chỉ lo màu đất.
10. **Hai bộ phong cách:** 6 bản đồ sách tranh, 2 bản đồ neon. Cùng một renderer.
11. **Bộ quái mới:** 17 sinh vật thường (12 đi, 5 bay), 1 quái con, 4 boss. Không có thần thánh.
12. **Luật tính toán chỉ dùng số học an toàn.** Độ cao lưu bằng milimét nguyên. Kết quả giống nhau trên Chrome, Safari, Firefox.
13. **Trụ vẽ instanced.** Số trụ không làm tăng draw call. Texture nén KTX2.
14. **Cảm ứng V5 = máy tính bảng có bàn phím rời.** Điện thoại để bản sau.
15. **Defense tách được khỏi Space Typing.** Test ranh giới có từ bước 0. Việc chuyển module sang `src/platform` làm cuối cùng.
16. Luật cốt lõi giữ nguyên: **trụ không bao giờ giết**. Một từ gõ đúng diệt một quái, trừ bom.

---

## 1. Mục tiêu

- Chủ dự án cầm chuột điều khiển camera tự nhiên, không phải học phím.
- Người gõ luôn thấy chữ cần gõ, ở mọi góc camera.
- Màn hình luôn thoáng. Zoom gần không bị trụ, rồng hay bảng xây che hết.
- Mỗi hành động có phản hồi rõ, đẹp, "đã tay". Diệt quái có tiền rơi và thu về.
- Chiến thuật phong phú nhờ đặt trụ tự do, nhưng không có một chỗ hay một cách xếp áp đảo.
- Bản đồ đầy, đẹp, có địa hình, cây cối, sông, cầu, mốc cảnh.
- Quái độc đáo, mỗi con một bài toán.
- Giữ 300–400 quái mượt.
- Defense sẵn sàng thành game riêng.

## 2. Luật chủ dự án (khóa)

- Trụ không giết. Chỉ chữ giết. Bom là ngoại lệ duy nhất.
- Chủ dự án làm mọi model 3D bằng Tripo/Meshy từ ảnh 2D. Ảnh 2D làm bằng ChatGPT/Gemini.
- AI chỉ chỉnh model trong Blender. AI không dựng model 3D bằng mã. Được làm bằng mã: height field địa hình, decal, gradient trời, hạt, shader, VFX, shader biến dạng model có sẵn, dải đường vẽ từ dữ liệu.
- Không giảm hiệu năng. 300–400 quái phải mượt.
- Hình phải là art thật. Không dùng sọc, khối CSS hay shader làm hình tạm lâu dài.
- Tài liệu tiếng Việt, câu ngắn. Prompt ảnh viết tiếng Anh.
- Ảnh, âm thanh, model không đưa lên Git. CI và test chạy được khi chỉ có manifest.

---

## 3. Camera và nhãn chữ

### 3.1 Chuột

| Thao tác | Tác dụng |
|---|---|
| Giữ chuột **trái** và kéo trên bản đồ | Kéo bản đồ. Điểm đất dưới con trỏ đi theo con trỏ. |
| Giữ chuột **giữa** và kéo | Như chuột trái. |
| Giữ chuột **phải** và kéo | Kéo ngang: xoay quanh tâm nhìn. Kéo dọc: nâng hạ góc. |
| Alt + kéo trái | Như chuột phải (trackpad, chuột một nút). |
| Lăn chuột | Zoom vào đúng điểm dưới con trỏ. Một nấc (100 px) = ×1,16. |
| Chụm hai ngón trên trackpad (`ctrlKey`) | Zoom, hệ số e^(Δ × 0,01). |
| Nháy đúp lên đất | Lướt tâm nhìn tới đó trong 0,35 s. |
| Nháy đúp lên quái | Bám theo quái đó. Kéo chuột là thôi bám. |
| Nháy đúp lên Lõi | Góc "Dọc đường". |
| Nháy đúp chuột giữa | Về góc mặc định. |
| Bấm (không kéo) trái | Chọn trụ, đặt trụ, chọn quái, bấm ghim nhãn. |
| Bấm (không kéo) phải | Hủy đặt trụ, bỏ chọn. |

- Ngưỡng bấm và kéo: **6 px**. Kéo quá 6 px thì không tính là bấm.
- **Khi đang cầm trụ mờ, mọi thao tác nháy đúp bị tắt.** Lần bấm đầu đặt trụ, lần bấm thứ hai không làm gì.
- Kéo bản đồ ăn ngay theo tay. Thả tay thì trôi theo quán tính, hãm 6/s.
- Xoay và zoom có làm mượt: k = 1 − e^(−12·dt).
- Tốc độ xoay 0,30°/px ngang. Nâng hạ 0,22°/px dọc.
- Cuộn mép màn hình: tắt mặc định. Có ô bật trong cài đặt.
- Chặn menu chuột phải trên toàn trang khi đang chơi.

### 3.2 Bàn phím

Bàn phím dành cho gõ. Không phím chữ nào điều khiển camera. Bỏ q/e/w/s/a/d (chúng đụng Telex).

Phím camera dùng được **ở mọi pha, kể cả trong đợt**:

| Phím | Tác dụng |
|---|---|
| ← / → | Xoay 15° mỗi lần bấm |
| ↑ / ↓ | Nâng / hạ góc 6° mỗi lần bấm |
| Shift + mũi tên | Kéo bản đồ 5 m theo hướng camera |
| F1 / F2 / F3 | Góc Mặc định / Dọc đường / Từ trên. Trên Mac có thể cần giữ Fn. |
| Tab (chỉ trong đợt) | Đổi lần lượt 3 góc có sẵn |
| Home, PageUp, PageDown | Giữ làm phím phụ: về góc mặc định, nâng, hạ |

- `typedLetter()` chỉ nhận chữ cái, nên mũi tên và F1–F3 không đụng việc gõ hay Telex.
- Bỏ qua mọi phím có Ctrl, Cmd hoặc Alt. Shift chỉ được dùng với mũi tên.
- Bỏ qua phím giữ lặp (`event.repeat`) và phím đang ghép IME (`isComposing`).
- Mỗi lần bấm lướt 0,25 s, không giật.
- Luôn `preventDefault` cho Tab, để trình duyệt không đổi focus.
- Khi đang cầm trụ mờ: mũi tên dịch trụ mờ 0,5 m. Shift + mũi tên vẫn kéo bản đồ. Chi tiết ở mục 11.3.
- Nút HUD gọi `preventDefault` ở `pointerdown`, nên bấm chuột không để focus lại trên nút. Đầu hàm `keydown`: nếu focus đang ở nút HUD thì bỏ focus và chặn Enter, Space. Sửa lỗi Enter bắn lại kỹ năng vừa bấm chuột.

### 3.3 Số liệu

| Thông số | Giá trị | Lý do |
|---|---|---|
| FOV dọc | 50° | Như cũ. |
| Khoảng cách | 22–120 m | Ở 120 m thấy trọn vùng chơi 96 m. |
| Góc nghiêng | 12–85° | 12° đủ thấp để nhìn quái trực diện. |
| Góc mặc định | 57° ở 80 m | Như V4. |
| Góc tự động theo zoom | 30° + 27° × smoothstep(22, 80, d) | Zoom gần thì góc hạ dần. |
| Góc người chơi chỉnh | Lưu dạng độ lệch −18° … +28° so với góc tự động | Kéo phải vẫn hạ được tới 12°. F1 xóa độ lệch. |
| Góc < 25° | Khoảng cách tối đa 60 m. Tâm nhìn nâng lên y = đất + 1,5 m. **Vị trí camera luôn trong ±46 m.** | Không nhìn xuyên ra mép, không đứng ngoài lưới độ cao. |
| Góc < 20° | **Khoảng cách tối thiểu 26 m** | Ở 22 m và 12°, camera chỉ cao 4,6 m, thấp hơn trụ. |
| Độ cao tối thiểu | Camera cao hơn đất ≥ 2,5 m, hơn mặt nước ≥ 2 m | Đọc độ cao từ hàm chung, **gồm cả vành đất xa** (mục 3.7). |
| Giới hạn tâm nhìn | Hình vuông ±44 m | Nội dung bản đồ trong ±37 m. |
| near / far | 0,3 / 1.500 m | Cho vành đất xa và bầu trời. |
| Rung | Biên độ theo khoảng cách, tối đa 6 px | Tôn trọng "Rung màn hình" và "Giảm chuyển động". |

### 3.4 Góc có sẵn

Nút "Camera" (40 × 40 px, góc dưới phải) mở 3 lựa chọn. F1–F3 làm cùng việc.
- **Mặc định:** 57°, 80 m, theo `map.camera`.
- **Dọc đường:** đứng sau Lõi 10 m và **lệch sang bên 7 m**, nhìn ngược đường về cổng có quái gần nhất. Nghiêng 16°, cách tâm 30 m, tâm ở 20 m trên đường. Lõi thuộc nhóm vật mờ khi che (mục 3.7).
- **Từ trên:** 85°, 100 m.

Khi cầm trụ mờ để đặt, camera tự nâng lên ít nhất 50°. Đặt xong hoặc hủy thì trả lại góc cũ.

### 3.5 Toán camera

**Zoom vào con trỏ, giữ đúng ở mọi khung:**
- Khi lăn chuột, lấy điểm đất G dưới con trỏ và điểm màn hình p của nó. Lưu cặp (G, p) làm "neo".
- Mỗi khung, khoảng cách và góc vẫn lướt dần. Tâm nhìn **tính lại từ neo** theo khoảng cách và góc hiện tại: dựng hướng tia qua p, rồi giải T sao cho tia qua p đi qua G.
- Công thức: s = −d'·u'_y / r'_y; T'_xz = G_xz − s·r'_xz − d'·u'_xz; T'.y = G.y. (u' là hướng từ tâm tới camera, r' là hướng tia qua p.)
- Một hàm `anchorTarget` dùng chung cho lăn chuột, chụm ngón, góc tự động và trụ mờ.
- Neo bị xóa khi người chơi kéo chuột hoặc khi lướt xong.

**Kéo bản đồ:**
- Lúc nhấn, lấy G0: giao của tia con trỏ với **mặt phẳng ở độ cao tâm nhìn**.
- Mỗi lần di chuyển: T += G0 − G(p). Áp thẳng, không làm mượt.
- Tia chỉ xét tới **150 m**. Tia không cắt mặt phẳng (r_y > −0,05), cắt quá 150 m, hoặc con trỏ ở trên trời: chuyển sang kéo theo tỉ lệ khoảng cách, Δ = px × d × 1,6 / chiều cao màn hình. Mỗi sự kiện tối đa 0,25·d.

**Lăn chuột:**
- Chuẩn hóa: `deltaMode` 0 giữ nguyên, 1 (dòng) × 33, 2 (trang) × `innerHeight`.
- Kẹp |Δ| ≤ 240 mỗi sự kiện. Cộng dồn các Δ rất nhỏ của chuột Mac.
- Hệ số zoom = e^(Δ × 0,00148). 100 px = ×1,16.
- Trackpad: khi đã thấy một lần chụm ngón (`ctrlKey`) trong phiên, cuộn hai ngón (không `ctrlKey`) sẽ kéo bản đồ. Trước đó cuộn là zoom. Cài đặt "Cuộn hai ngón để kéo bản đồ" cho chọn hẳn.

### 3.6 Nhãn chữ: ghim mép và Theo dõi nguy hiểm

Luật này bắt buộc. Camera tự do mà không có nó thì người gõ phải đoán chữ.

**Vị trí nhãn:**
- Tối đa 8 nhãn (`LABELS` = 8), như cũ.
- Độ cao nhãn lấy từ đất thật: quái đi bộ dùng bảng độ cao dọc đường (`roadY` theo s) + chiều cao quái × 0,85 (boss × 1,1). Quái bay dùng độ cao bay + 1,2 m.
- Nhãn không nằm dưới HUD. Nhãn rơi vào HUD thì đẩy ra mép "vùng an toàn".
- Vùng an toàn là màn hình trừ các bảng HUD, đo bằng `ResizeObserver`.

**Ghim mép:**
- Nhãn ra ngoài vùng an toàn, hoặc ở sau camera, thì thành **ghim** trên mép vùng an toàn, cách mép 10 px.
- Ghim gồm phần chữ còn lại (tối đa 18 ký tự), cỡ 13–15 px, và mũi tên 10 px chỉ về phía quái.
- Quái ở sau camera: lấy hướng đối xứng để chọn mép.
- Màu khẩn cấp theo thời gian tới Lõi (ETA): dưới 5 s đỏ `#FF4A4A`; dưới 10 s cam `#FFB020`; còn lại trắng.
- Ghim vẫn gõ được như nhãn. Việc gõ không phụ thuộc nhãn có thấy hay không.
- Các ghim cùng mép xếp cách nhau 4 px, không chồng.
- Bấm vào ghim: camera lướt tới quái đó trong 0,45 s.

**Theo dõi nguy hiểm** (cài đặt, bật mặc định):
- Chỉ trong đợt.
- Điều kiện: con trỏ và phím camera không động tới trong 4 s, và có ít nhất một quái mang nhãn đang bị ghim.
- Camera lướt 0,8 s để khung cả 8 quái mang nhãn trong vùng an toàn, lề 12 %. Giữ hướng xoay. Giữ góc nghiêng, trừ khi góc dưới 25° thì nâng lên 35°. Khoảng cách tối đa 120 m.
- Lướt xong thì đếm lại 4 s.
- Không chạy khi đang kéo chuột hay đang bám một quái.

**Đo cỡ nhãn:** chỉ khi chữ đổi. Không đọc `offsetWidth` mỗi khung.

### 3.7 Góc thấp và vật che

**Vật mờ khi che** (dither Bayer 4×4, không cần sắp xếp):
- Áp cho: trụ, props, mốc cảnh, Lõi, rồng.
- Mờ còn 35 % khi một trong các điều sau đúng:
  - vật nằm trong **trụ tầm nhìn** từ camera tới tâm nhìn (bán kính 3 m);
  - vật che đoạn camera → một quái mang nhãn, quái bị khóa, boss, trụ đang chọn hoặc trụ mờ;
  - vật cách camera dưới 8 m;
  - **chiều cao chiếu của vật vượt 35 % chiều cao màn hình**.
- Mờ đi 0,12 s, hiện lại 0,35 s.
- Quái và boss không bao giờ mờ.

**Vành địa hình che tầm nhìn:**
- Phần vành (dải viền và vành đất xa) nằm giữa camera và tâm, trong góc ±30° quanh hướng camera, bị **hạ thấp trong vertex shader** khi nó cắt tia nhìn. Hạ tối đa 12 m.

**Bóng xuyên (x-ray) cho quái bị khuất:**
- Chỉ cho ≤ 8 quái mang nhãn và boss.
- Vẽ thêm một lần với `depthFunc GREATER`, màu Rift của bản đồ, độ mờ 45 %.
- Mỗi loài có quái mang nhãn thêm 1 draw call. Trần 8, thường 2–4.

**Va chạm camera:**
- Hàm `heightAtAny(x, z)` trả độ cao cho mọi bán kính: lưới gần ±56 m và vành đất xa tới 800 m.
- Camera lấy mẫu 7 điểm trên đoạn tâm → camera. Điểm nào thấp hơn đất + 0,8 m thì rút ngắn khoảng cách vẽ (giữ khoảng cách đích), tối thiểu 6 m. Hồi lại 3/s.

### 3.8 Cảm ứng

- **V5 hỗ trợ máy tính bảng có bàn phím rời.** Gõ chữ vẫn bằng bàn phím.
- Điện thoại và bàn phím ảo để bản sau.
- Máy có `pointer: coarse` hiện mẹo một lần: "Rift Defense cần bàn phím rời để gõ."
- Cửa sổ hẹp dưới 640 px: hiện thông báo "Màn hình quá hẹp. Hãy xoay ngang hoặc dùng máy lớn hơn." Không đo HUD ở cỡ này.
- Cử chỉ trên máy tính bảng:
  - Một ngón kéo: kéo bản đồ (ngưỡng 10 px).
  - Hai ngón: chụm để zoom vào tâm hai ngón, xoay hai ngón để xoay, kéo dọc hai ngón để nâng hạ góc.
  - Đặt trụ bằng kéo từ nút (mục 11.4).

### 3.9 Cấu trúc mã

- `view/camera-rig.ts`: toán thuần, không DOM. `anchorTarget`, `grabPan`, `orbit`, `pitchCurve`, `clampTarget`, `clampEye`, `collide(heightAtAny)`, `fitPoints`, `normalizeWheel`. Test bằng vitest.
- `view/camera.ts`: chỉ gắn chuột, cảm ứng, bàn phím vào rig.
- `ui/labels.ts`: nhãn, ghim, xếp chồng, Theo dõi nguy hiểm. Tách từ `main.ts`.
- `view/occlusion.ts`: luật mờ, hạ vành, x-ray.
- Rung không cấp phát `Vector3` mỗi khung.

---

## 4. Kích thước trên màn hình và HUD gọn

### 4.1 Thang HUD

- Biến CSS `--ui = clamp(0,8; min(rộng/1600, cao/900); 1,2)`. Mọi kích thước HUD nhân với `--ui`.
- Màn chủ dự án 1417 × 744 CSS: `--ui` = 0,83.

### 4.2 Ngân sách diện tích

| Thành phần | Vị trí | Cỡ tối đa (ở `--ui` = 1) |
|---|---|---|
| Bảng đợt (đợt n/10, tên, quái sắp tới dạng icon, nút gọi đợt) | Trên trái | 260 × 72 px |
| Dải tài nguyên (Năng lượng, Lõi, Điểm, Combo, **Trụ n/16**) | Trên phải | 420 × 48 px |
| Thanh kỹ năng rồng (3 nút + thanh nạp) | Dưới giữa, chỉ trong đợt | 600 × 72 px |
| Thanh xây (6 nút trụ 72 × 72, giá, số trụ loại đó/trần, nút Bắt đầu) | Dưới giữa, chỉ pha xây | 760 × 88 px |
| Thẻ chi tiết trụ | Bật ra cạnh trụ, kẹp trong vùng an toàn | 280 × 220 px |
| Nút camera, nút dừng | Dưới phải, trên phải | 40 × 40 px mỗi nút |
| Banner | 22 % từ trên | Cao ≤ 1/8 màn hình, **rộng ≤ 50 %**, tự tắt sau 1,4 s |

Luật cứng, có test:
- Trong đợt: HUD chiếm ≤ 10 % diện tích. Pha xây: ≤ 15 %.
- Banner thoáng qua không tính vào tổng diện tích, nhưng phải rộng ≤ 50 % và cao ≤ 1/8.
- Không bảng nào ở mép dưới cao quá 10 % chiều cao màn hình. Ở 1417 × 744, thanh xây cao 73 px (9,8 %).
- Cỡ cửa sổ được test: 1280 × 720, 1417 × 744 (DPR 2), 1920 × 1080, 2560 × 1440, 1024 × 768, 768 × 1024, 1100 × 1488, 1920 × 1488. Không test điện thoại.
- Mô tả trụ hiện trong tooltip khi rê hoặc focus nút, không chiếm chỗ cố định.
- Bỏ dòng hướng dẫn phím dưới thanh xây. Mẹo hiện một lần ở 3 lần chơi đầu.

### 4.3 Nhãn chữ

- Cỡ chữ: `clamp(14px, 0,6vw + 7px, 19px)`. Boss: `clamp(16px, 0,7vw + 8px, 22px)`.
- Thuật toán xếp chồng giữ như cũ, cộng ghim mép (mục 3.6).
- Sách tranh: nền giấy sáng, chữ mực sẫm. Neon: nền tối, viền sáng như cũ.

### 4.4 Kích thước 3D

| Vật | Hiện nay | V5 | Lý do |
|---|---|---|---|
| Trụ | 3,4–5,0 m, cấp 3 ×1,34 | Giữ chiều cao gốc. Cấp 0–3: ×1 / 1,06 / 1,12 / 1,2 (tối đa 6,0 m) | Cấp hiện bằng VFX và vòng trang trí. |
| Quái thường | 2,9–4,8 m | 1,8–3,2 m | Nhỏ hơn 25–30 %. |
| Boss | 6,0–7,8 m | 5,5–7,5 m | |
| Rồng | 3,6 m, y 8,5 m cạnh Lõi | Đậu trên Lõi ở y 11 m. Cỡ trên màn hình ≤ 14 % chiều cao. Mờ theo luật vật che. Ở góc Dọc đường, bay lệch 8 m. | Chủ dự án báo rồng chiếm hết màn hình. |
| VFX trang trí | Cỡ cố định theo mét | Kẹp 14 px … 35 % chiều cao | Xa vẫn thấy, gần không che hết. |
| VFX luật chơi | — | **Luôn đúng cỡ thật** (mục 5.3) | Vùng nổ, vòng sóng phải đúng phạm vi. |

- Đo cỡ ở **hai chỗ**: giữa màn hình và dải 15 % dưới cùng. Ở 22 m và 30°, điểm đất ở mép dưới cách camera chỉ 13,4 m, nên trụ 6 m ở đó có thể chiếm 44 %. Luật mờ "chiều cao chiếu > 35 %" (mục 3.7) lo việc này.

---

## 5. VFX, loot và cảm giác "đã tay"

### 5.1 Vì sao VFX hiện trông yếu

- Mỗi ảnh VFX chỉ có một khung. Hiệu ứng chỉ phóng to rồi mờ đi.
- Mọi cú diệt dùng chung một công thức hạt cộng màu. Gặp bloom thì thành một đốm trắng.
- Quái biến mất ngay khi chết.
- Bản vector SVG trong `vfx.json` là gradient tròn viết bằng mã. Không được dùng làm hình lâu dài.

### 5.2 Nguyên tắc

- Mỗi sự kiện có 3 nhịp: **báo trước** (sáng lên, ngắm), **va chạm** (lóe, nổ, rung), **dư âm** (khói, mảnh, vết cháy, tiền).
- Mỗi va chạm có ít nhất 3 lớp: lóe sáng, hình chính, hạt hoặc mảnh. Cộng âm thanh. Cộng rung nếu mạnh.
- Hình trước, hạt sau. Không dùng "súp hạt sáng".
- Nền tối (neon) dùng ánh sáng cộng màu. Nền sáng (sách tranh) dùng hình đục có viền tối.
- Màu theo nguồn: mỗi trụ một màu (`TOWER_COLOR`), lửa rồng cam vàng, Rift theo `palette.vein`.
- Mọi đòn quái nhắm trụ có báo trước ≥ 0,5 s.
- Tất cả lấy từ pool. Không tạo object trong đợt. Không cấp phát mỗi khung.
- Mọi độ trễ chạy bằng **Sequencer** theo đồng hồ trận. Không dùng `setTimeout`. `clearRun()` xóa sạch Sequencer.

### 5.3 Kỹ thuật VFX

**Flipbook:**
- Shader đọc `frameCount`, `fps`, số cột, số hàng từ manifest. Khung = floor(tuổi × fps), dừng ở khung cuối hoặc lặp.
- High: trộn hai khung liền nhau cho mượt.
- Dùng ngay 13 chuỗi 12 khung có sẵn (`art-src/combat-vfx-sequences/`). Script `scripts/defense-art/prepare-vfx.mjs` đóng gói thành atlas trong `public/assets/defense/vfx/`.
- Chưa có atlas (máy khác, CI): dùng ảnh tĩnh combat-vfx cũ.

**Hòa tan theo nhiễu (alpha erosion):**
- Ảnh tĩnh của chủ dự án là một hình khối duy nhất. Độ sáng của nó làm mặt nạ.
- alpha = smoothstep(ngưỡng − 0,1; ngưỡng; mặt nạ × nhiễu). Ngưỡng tăng theo tuổi. Hình tan từ mép vào.
- Thêm méo UV theo nhiễu và đổi màu theo tuổi.

**Hạt mềm khi chạm đất:**
- Mỗi điểm ảnh của hạt so với độ cao đất (texture độ cao): alpha × smoothstep(0; 0,6; y − độ cao đất).
- Hiệu ứng không còn cắt vệt cứng vào đất ở góc 12–30°. Không cần thêm pass.

**Vệt kéo (ribbon):** mọi tia, vệt đạn, vệt cầu lửa dùng chung một geometry. Một draw call.

**Sóng xung kích méo hình:**
- Lưới vòng sóng vẽ véc-tơ méo vào một render target 1/4 độ phân giải.
- Pass méo đọc màu cảnh và lệch UV. Chỉ ở High. Tắt pass khi không có nguồn méo.
- Khi có `GradedOutputPass` (bước 8), gộp méo vào pass đó, không còn pass riêng.

**Đèn chớp:** pool cố định 2 `PointLight` tạo lúc dựng sân khấu. Không thêm, bớt đèn khi đang chạy (tránh biên dịch lại shader).

**Đạo diễn VFX (`view/fx/director.ts`):**
- Nhận mọi sự kiện engine. Lấy vị trí từ `x, z` của sự kiện qua một hàm chung `eventPoint(event)`. Bước 5 chỉ sửa hàm này.
- Gộp sự kiện: từ 3 con chết cùng khung, cùng ô 4 m thì thành một "cụm chết" (một vụ nổ cỡ √n, mỗi con thêm 2 hạt, tối đa 20).
- Trần sinh mới mỗi khung (High): 260 hạt, 24 billboard, 8 vòng, 4 decal, 1 đèn chớp (giữ cái mạnh nhất), 6 tiếng.
- Ưu tiên: P0 (chữ gõ, diệt, báo trước đòn đánh trụ, Lõi trúng) không bao giờ cắt. P1 (đòn trụ, bom, loot). P2 (khói, bụi, trang trí) cắt trước.
- **Quái đang chết:** crowd giữ instance thêm 0,15–0,4 s, shader bẹp, phồng hoặc tan. Trần 64 (High).

**Kẹp cỡ:**
- Chỉ kẹp **lớp trang trí** (lóe, tia lửa, khói, mảnh): 14 px … 35 % chiều cao màn hình.
- **Vòng và decal luật chơi luôn đúng cỡ thật:** bán kính bom 2,8 m (+30 % Wide Blast, +40 % Singularity), sóng Băng, rễ Mộc Tinh 8 m, khiên Troll 4 m, tầm Gargoyle 8 m, vùng nổ Tất Phương 2,2 m.
- Tổng diện tích chiếu của billboard cộng màu ≤ **1,5 màn hình**. Vượt thì thu nhỏ và bỏ khói cũ trước.
- Chuỗi nổ: mắt xích thứ n có cỡ × 0,85^(n−1), tối thiểu 0,5.

**Thay ảnh khi có art mới:** ảnh VFX đợt A (mục 23) thay dần combat-vfx. Bước VFX chỉ xong khi chủ dự án xem ảnh trước/sau (`defense-juice.mjs`).

### 5.4 Loot: tiền rơi và thu về

**Dùng lại Credit Crystal của Space Typing.**
- Phần trình diễn chuyển vào `src/platform`, có shim ở chỗ cũ:
  - `src/platform/loot/pickup-sim.ts`: các pha bung → lơ lửng → hút, trần, gộp. Lấy từ `credit-crystal-pickups.ts` và `credit-crystal-fx.ts`. Loại bậc đồng là tham số, không import kiểu của Space Typing.
  - `src/platform/loot/draw-list.ts`: danh sách vẽ trung lập.
  - `src/platform/audio/pickup-ladder.ts`: thang nốt, khoảng cách tick. Lấy từ `credit-sound.ts`.
- Space Typing giữ bộ vẽ canvas 2D của nó. `tests/credit-*.test.ts` phải xanh, không sửa.
- Defense chỉ thêm cấu hình: nảy trên đất thật, đích là ô Năng lượng trên HUD, bộ vẽ WebGL.

**Luật không đổi:** năng lượng vẫn cộng ngay lúc diệt trong engine. Đồng bay chỉ là hình.

**Nguồn đồng và ảnh:** dùng 8 bậc ảnh có sẵn `src/assets/pickups/credits/*.webp` cho cả hai pha.
- Quái thưởng 1 / 2 / 3: rơi 1 / 2 / 3 đồng bậc `common` / `refined` / `high`.
- Quái tinh nhuệ: bậc `elite`.
- Boss phụ: 10 đồng bậc `mini-boss`, mỗi đồng 3. Boss chính: 15 đồng bậc `major-boss`, mỗi đồng 4.
- Thưởng Fuel, Twin Sights: cộng vào giá trị đồng, không thêm đồng.
- Thu Năng: đồng `refined` bay từ quái về trụ, rồi từ trụ về HUD.
- Thưởng hết đợt và gọi đợt sớm: đồng `elite-golden` phun từ Lõi hoặc từ nút.
- Bán trụ, hoàn tiền: đồng `common` bung từ trụ. Số đồng = min(12, ⌈số tiền / 10⌉). Đồng cuối mang phần dư.
- Chim Vàng bị diệt: đồng bay từ chim về HUD (mục 13).
- Bản sách tranh dùng ảnh `coin-energy` của chủ dự án khi có (đợt A). Trước đó dùng ảnh credits cho cả hai phong cách.
- Không dùng GLB credits 28k tam giác. Nếu sau này có model đồng, model phải ≤ 300 tam giác (test hợp đồng).

**Đường bay (High), cấu hình Defense của `pickup-sim`:**
1. 80 ms sau tiếng nổ: đồng bật lên 3,5–5 m/s, văng ngang 0,8–1,6 m/s. Trọng lực 14 m/s².
2. Nảy một lần trên đất thật (`heightAt`), hệ số nảy 0,35. Tổng khoảng 0,45 s.
3. Lơ lửng, xoay 0,15 s.
4. Hút về ô Năng lượng trong 0,5–0,6 s theo đường cong trên màn hình, nhanh dần. Thu nhỏ 1 → 0,55. Vệt 6 đốm lấp lánh.
5. 110 ms cuối: chuyển sang một nút DOM trong pool 24 nút (chỉ đổi transform và opacity), để đồng không bị bảng HUD che.
6. Tới nơi: icon phồng ×1,18 trong 120 ms, tiếng tick theo thang nốt của `pickup-ladder`, số lăn lên trong 0,25 s, hiện "+N".

**Số hiển thị:**
- Số hiện = max(0; năng lượng thật − giá trị đồng đang bay).
- Khi chi tiền, hoặc khi rê chuột lên nút xây hay nâng cấp: mọi đồng đang bay về đích trong 0,15 s.
- Rời pha đánh: mọi đồng về đích trong 0,3 s. Không đồng nào bay quá 1,5 s.
- Nút xây luôn dùng năng lượng thật.

**Trần:** tối đa 120 đồng cùng lúc (High), 60 (Medium). Vượt trần thì gộp giá trị vào đồng đang bay gần nhất. Đồng to dần theo 1 + 0,15 × log2(giá trị). Không bao giờ mất tiền.

**Giảm chuyển động:** bỏ nảy và lơ lửng, bay thẳng 0,3 s, không rung.

**Vẽ:**
- Một atlas dựng lúc nạp từ 8 ảnh bậc đồng và glyph số (0–9, +, −, ×) trong canvas 1024 × 512.
- Pha 3D: một lô sprite instanced quay về camera, có depth test.
- Pha màn hình và số nổi: một lô quad instanced theo tọa độ màn hình, không depth test.
- Tổng 2 draw call. Bỏ hoàn toàn canvas 2D phủ màn hình. Lô rỗng thì không vẽ.

### 5.5 Điểm trận

- Mỗi từ diệt quái: 10 × số chữ × hệ số combo (1 / 1,25 / 1,5 / 2 cho chưa có / Ignite / Inferno / Rift Fury).
- Mỗi quái chết vì bom: +25. Đợt hoàn hảo: +500. Thắng: +100 × số mạng Lõi còn lại.
- Engine tính bằng số nguyên (hệ số nhân 4 rồi chia). Tất định.
- Lưu điểm cao nhất theo bản đồ và độ khó trong storage của Defense.
- Hiệu ứng: "+N" vàng bật ở đầu quái (phồng 0 → 1,25 → 1 trong 0,18 s, bay lên 30 px, tắt ở 0,7 s). Ô Điểm lăn số.
- Điểm không ảnh hưởng sao.

### 5.6 Bảng VFX theo sự kiện

Cột "Cap" là giới hạn cùng lúc hoặc mỗi giây.

**Gõ chữ**

| Sự kiện | VFX | Âm thanh | Camera |
|---|---|---|---|
| Khóa mục tiêu | Vòng ngắm xoay dưới chân quái (vòng đất, màu lửa). Rồng quay đầu. | "tách" nhẹ | — |
| Mỗi chữ đúng | Chữ đã gõ lóe vàng. Tia lửa nhỏ ở quái (cap 6/s mỗi quái). | Tiếng gõ ngắn, cao dần theo vị trí chữ | — |
| Gõ sai | Nhãn rung + chớp đỏ 0,15 s | "thịch" trầm | — |
| Gãy combo (từ 10) | Số combo vỡ thành mảnh đỏ | Tiếng vỡ thủy tinh nhỏ | — |
| Hoàn tất từ | Cầu lửa có vệt kéo | Tiếng phun | — |
| Bóc một lớp giáp | Mảnh giáp văng (tô màu quái) + vòng sóng nhỏ + một vạch giáp trên nhãn nổ | Kim loại "keng" | — |
| Lên bậc combo | Banner "IGNITE!" 0,8 s. Ignite: rồng có vệt lửa. Inferno: viền màn hình ánh than 20 %. Rift Fury: cầu lửa xanh trắng, nổ to hơn 30 %. | "vụt" + hợp âm | — |

**Diệt quái** (theo thời gian)

| Thời điểm | Lớp |
|---|---|
| 0 ms | Quái lóe trắng 60 ms. Lóe sáng điểm. |
| 0–60 ms | Nổ chính (flipbook, tô màu Rift, cỡ theo quái). |
| 0–400 ms | 12–24 tia lửa, 6 mảnh. Quái bẹp và tan (0,15–0,4 s). |
| 80 ms | Đồng bung ra. "+N" điểm bật lên. |
| 100 ms – 1,2 s | Hiệu ứng chết riêng của sinh vật (mục 13). |
| 0,5 s | Vết cháy sém trên đất, mờ trong 4 s. |

Âm thanh: va chạm + tiếng chết riêng + tick đồng. Diệt boss: dừng hình 70 ms (chỉ lúc này và khi giết quái cuối đợt), chuỗi nổ 3 nhịp, mưa đồng lớn, banner "HẠ BOSS".

**Bom và chuỗi nổ**

| Sự kiện | VFX | Âm thanh | Camera |
|---|---|---|---|
| Mồi Nổ khóa mục tiêu | Tia khóa + vòng rune đỏ xoay dưới quái + nhãn `is-bomb` | Tích tắc | — |
| Nổ | Lóe + nổ chính + lửa lớn + **vòng sóng đúng bán kính nổ** + mảnh + khói nóng + vết cháy 6 s + đèn chớp 0,15 s + méo hình (High) | Nổ lớn | Giật 0,07 |
| Chuỗi | Mỗi tầng cao hơn nửa cung. Chữ "CHAIN ×n". Mắt sau nhỏ dần. | Như trên, nhỏ dần | Giật 0,03 |
| Chuỗi ≥ 5 | Banner "SIÊU CHUỖI" | Hợp âm vang | Rung 0,25 |

**Kỹ năng rồng**

| Kỹ năng | VFX |
|---|---|
| Hơi Thở (6 s, mọi từ là bom) | Quầng lửa quanh rồng, viền màn hình ấm, mọi nhãn chuyển kiểu bom. |
| Gầm | Sóng hình nón từ Lõi dọc các đường, bụi cuộn, quái bị đẩy có vệt. |
| Nova | Lõi lóe trắng, sóng tròn 40 m (đúng cỡ), nhãn lật sang từ ngắn. |

**Trụ đánh**

| Trụ, nhánh | VFX |
|---|---|
| Băng: sóng | Vòng sương lan trên đất (đúng tầm) + tinh thể băng + quái trúng ám lam 1,6 s. |
| Băng A: đóng băng, vỡ | Quái bọc băng (shader). Vỡ: mảnh băng + sương lạnh. |
| Băng B: giáo băng | Giáo băng có vệt kéo, cắm vào quái, nhãn có ❄. |
| Trọng Lực | Xoáy tím trên đất, hạt bị hút vào tâm. |
| Trọng Lực: sụp, Singularity | Lóe ngược vào tâm, vòng co lại, lõi đen, sao choáng. |
| Trọng Lực B: Event Horizon | Sóng đẩy ra, quái bay lùi có vệt. |
| Sét | Tia sét phân nhánh + tia lửa ở mỗi quái trúng + lách tách. |
| Sét A: quá tải | Lóe trắng lớn, biểu tượng choáng. |
| Sét B: Disruptor | Ký hiệu câm trên đầu quái 5 s. |
| Đền Hồi Phục | Tia hồi về Lõi (chỉ từ Đền đang giữ nhịp hồi), hạt vàng. Hồi sinh trụ: cột sáng. Bastion: vòm khiên trên Lõi. |
| Thu Năng | Đầu đợt: đồng phun từ trụ về HUD. Mỗi quái chết trong tầm: đốm năng lượng bay từ quái về **trụ đang trả tiền**, rồi trụ nhả đồng. |

**Xây, nâng cấp, bán, dời, sửa** (phá môi trường ở mục 10)

| Sự kiện | VFX |
|---|---|
| Xây | Phá môi trường (0–0,3 s) → bụi và vòng sáng → trụ mọc từ đất (0,4 s, nảy ×1,08) → "thịch". |
| Nâng cấp | Vòng sáng chạy dọc thân + lấp lánh + trụ phồng ×1,08. |
| Chọn nhánh | Màu nhánh quét từ chân lên đỉnh + huy hiệu nhánh lóe. |
| Bán | Trụ lún xuống + bụi + đồng hoàn tiền bung ra rồi bay về HUD. |
| Dời | Cột sáng nhấc trụ, trụ tan thành hạt, hiện lại ở chỗ mới. |
| Sửa | Tia lửa xanh vàng + tiếng cờ lê. |
| Trụ trúng đòn | Tia lửa + thanh máu rung. |
| Trụ gục | Sụp, nghiêng, khói, lửa. |

**Lõi, đợt, kết quả**

| Sự kiện | VFX | Âm thanh |
|---|---|---|
| Quái lọt vào Lõi | Lõi lóe đỏ + vòng sóng + viền màn hình đỏ 0,4 s + số mạng rung | Trầm |
| Lõi ≤ 5 mạng | Khói liên tục, nứt sáng | Nhịp tim |
| Bắt đầu đợt | Cột sáng Rift 45 m ở mọi cổng bùng lên, banner "Đợt 3 · Heavy steps" | Tù và |
| Hết đợt | Banner + đồng thưởng phun từ Lõi | Chuông |
| Đợt hoàn hảo | Dấu "HOÀN HẢO +8" đóng xuống | Hợp âm |
| Boss xuất hiện | Cổng lóe, trời ngả màu Rift 20 %, banner tên boss, đổi nhạc. Camera không tự di chuyển. | Gầm |
| Thắng / thua | Pháo lửa rồng quanh Lõi / Lõi nứt và sụp | Nhạc kết |

### 5.7 Giới hạn

- Hạt chiến đấu: tối đa 2.400 (High), 1.200 (Medium). Hạt thời tiết là hồ riêng.
- Decal vết cháy: vẽ vào bản đồ hư hại (mục 10), tối đa 64 vết đang mờ.
- Số nổi (sát thương, hồi, điểm): trong lô WebGL, tối đa 64. Chữ nổi ngắn ("Chặn", "HOÀN HẢO") là DOM, tối đa 8.
- Âm thanh: mỗi nhóm có trần (tối đa 4 tiếng nổ trong 120 ms). Tick đồng theo luật của `pickup-ladder` (cách nhau ≥ 30 ms, trễ ≤ 90 ms).
- Medium: hạt và đồng còn một nửa. Bỏ vệt lấp lánh, bỏ méo hình, bỏ trộn khung flipbook.
- Chớp toàn màn hình tối đa 2 lần/s, độ mờ ≤ 0,35. Viền đỏ tối đa 3 lần/s.

---
## 6. Tách Defense khỏi Space Typing

### 6.1 Hiện trạng

- 8/14 file Defense import mã Space Typing: 38 lệnh import tới 24 module (không tính `../platform/frame-loop`).
- Từ `main.ts`, Defense kéo theo khoảng 11.000 dòng mã Space Typing (44 file).
- Rò lớn nhất: `boss/identity` (kéo cả campaign, worlds, enemies registry) và `scene3d/world` FlightWorld.
- Defense đọc 2 khóa storage của Space Typing và dùng manifest model của Space Typing.
- Learning event của Defense mang `gameId` "space-typing".

### 6.2 Lớp nền chung `src/platform`

Chỉ chứa hệ thống, không chứa nội dung game. Chỉ import `src/platform` và gói npm.

- Đã có: `frame-loop.ts`, `canvas-state.ts`.
- `types.ts`: VocabularyEntry, VocabularyLevel, VisualQuality, PlayerSettings.
- `host.ts`: `PlatformHost { gameId, storage, settings, vocabulary, audio, models, learning, account, motion }`. Tạo bằng `createHost(config)`. Tên khóa storage của Space Typing truyền vào như dữ liệu.
- `typing/`: keys, text, word-picker, `keyboard-intent.ts` (bước 0).
- `vocabulary/`, `speech/`, `settings/`, `storage/kv.ts` (có try/catch sẵn).
- `audio/`: `pickup-ladder.ts` (bước 4), audio-bus, music-player (phát stream).
- `loot/`: `pickup-sim.ts`, `draw-list.ts` (bước 4).
- `fx/sequencer.ts` (bước 0).
- `render/`: stage-core, graded-output-pass, rigged-actor, fx-kit.
- `assets/model-library.ts`: nhận URL manifest làm tham số.
- `learning/bridge.ts`: gắn `gameId`.
- `account/account-bridge.ts`: bắt đầu bản offline.

### 6.3 Defense

- `src/defense/` chỉ import chính nó, `@platform/*` và npm.
- `main.ts` mỏng: gọi `createHost` rồi khởi động app.
- `app/`: hud, build-ui, input, menu, dev-handle. Vòng lặp khung dùng `runFrameLoop` có sẵn.
- `rules/`: thuần TS, không three, không DOM, số học an toàn (mục 17).
- `styles/`: dữ liệu phong cách.
- `view/`, `ui/`, `assets/` (hợp đồng model, catalog URL).
- Alias `@platform/*` khai báo trong tsconfig, vite và mọi script tsx.

### 6.4 Vùng asset riêng

- Runtime: `public/assets/defense/{models,textures,sky,vfx,icons,creatures,maps,audio,basis}/`. Git bỏ qua hết, trừ manifest JSON và README.
- Nguồn 2D: `art-src/defense/...`. Nguồn 3D: `art-src/3d/defense/...`.
- Preset model riêng: `scripts/models/presets/defense-models.json`. Script `prepare-campaign3d-models.mjs` thêm cờ `--preset`.
- Kind model của Defense: towers, creatures, bosses, structures (core, rift-gate), props, landmarks, pickups, heroes, fx.
  - props: 50–3.000 tam giác (kind `items` hiện đòi tối thiểu 500).
  - pickups: **≤ 300 tam giác**.
- Model dùng chung chuyển khóa: `items/tower-*` → `towers/<loại>`, `items/defense-core` → `structures/core`, `items/defense-gate` → `structures/rift-gate`, `items/prop-crystal-*` → `props/crystal-*`. Rồng và cầu lửa chép sang `heroes/draconis`, `fx/dragon-fireball`.
- Quái `-lod` và boss cũ chỉ dùng tạm qua `src/defense/legacy/st-content.ts`, xóa khi có bộ quái mới.

### 6.5 Test ranh giới (có từ bước 0)

`tests/defense-boundary.test.ts` (vitest, chạy trong `pnpm check`):
1. Mọi import, import động, `import.meta.glob` trong `src/defense/**` phải ở trong `src/defense`, `src/platform`, hoặc npm cho phép (three, three/examples/jsm/*, @fontsource/*).
2. Ngoại lệ ghi trong 3 danh sách, kiểu "chỉ được ngắn đi" (mục nào không còn dùng thì test báo lỗi):
   - `LEGACY_IMPORTS`: file + đường import. Bắt đầu đúng bằng các lệnh đang có ở HEAD (hiện 38). `../platform/frame-loop` là hợp lệ, không nằm trong danh sách.
   - `LEGACY_ASSET_STRINGS`: `view/vfx.ts` → `/assets/space-typing/combat-vfx/`; `view/sounds.ts` → `/assets/audio/`.
   - `LEGACY_TEST_IMPORTS`: `tests/defense-rules.test.ts` → `src/scene3d/words`, `src/types`, và chuỗi đường dẫn manifest model của Space Typing.
3. `src/platform/**` không import Space Typing. Không có chuỗi `/assets/space-typing/` hay `spaceTyping`.
4. Chuỗi `/assets/` trong Defense phải bắt đầu bằng `/assets/defense/` hoặc `/assets/shared/`, trừ danh sách ở điểm 2.
5. `rules/**` và `styles/**` không import three, không dùng DOM, không dùng hàm toán bị cấm (mục 17).
6. Space Typing không import `src/defense`. Platform không import Space Typing.
7. `tests/defense-*.test.ts` chỉ import Defense và platform, trừ `LEGACY_TEST_IMPORTS`.

Ảnh không có trong Git, nên CI chỉ dựa vào manifest. Mọi test và kịch bản hình chạy được khi thiếu media.

### 6.6 Lộ trình

- Bước 0: test ranh giới với 3 danh sách ngoại lệ. Không chuyển mã.
- Bước 4: chuyển phần trình diễn loot và thang nốt sang `src/platform/loot` và `src/platform/audio`, có shim.
- Bước 8: sân khấu riêng của Defense (`view/battle-stage.ts`). Defense bỏ SpaceStage và FlightWorld.
- Bước 10: model-library nhận URL manifest. Preset và manifest model riêng của Defense.
- Bước 16 (cuối cùng, sau khi chủ dự án duyệt camera, HUD, VFX):
  1. Repo cha đổi trước: `src/learning/shared.ts` và portal (`portal/src/main.ts`, `shared/learning/*`) nhận cả `"space-typing"` và `"rift-defense"`, gộp về cùng một bộ dữ liệu người học. Test vòng đi về trong portal.
  2. Sau đó submodule mới đổi learning bridge sang `"rift-defense"`.
  3. Chuyển các module thuần còn lại sang platform, có shim. stage-core, audio-bus, model-library, fx-kit.
  4. Fork thẻ thưởng, HeroFx phần Defense dùng. Icon, chân dung riêng.
  5. `LEGACY_*` về 0. `main.ts` chỉ còn điểm ghép.
- Ngoài V5 (khi chủ dự án quyết): tách submodule `games/rift-defense`, nginx `defense.typing-game.local`, lưu game theo `(account_id, game_id)`.

---

## 7. Bộ phong cách bản đồ (style pack)

### 7.1 Ba mảnh ghép

Hình của một bản đồ ghép từ 3 phần:
- **StylePack:** cách vẽ. Shading, hậu kỳ, màu, VFX, kiểu nhãn, prompt cho chủ dự án.
- **BiomeRecipe:** đất ra sao. Công thức địa hình, nước, luật rải props theo **vai trò** (cây tròn, cây thông, đá to, cỏ...). Không phụ thuộc phong cách. Nằm trong `rules/` vì luật cần mặt nạ xây.
- **BiomeArt:** art của phong cách cho vùng đó. Texture lát, model gắn với vai trò props, trời, ánh sáng, sương, thời tiết, âm nền, nhạc, danh sách art cần làm.

`resolveMapLook(map, quality)` gộp 3 phần, cộng phần ghi đè của bản đồ và mức chất lượng, ra `MapLook` đã kiểm tra. Luật chơi không bao giờ đọc phong cách. Test: cùng bản đồ, cùng seed, đổi phong cách thì chuỗi sự kiện engine giống hệt.

### 7.2 Hai bộ phong cách V5

| | Sách tranh (`storybook`) | Neon (`neon-rift`) |
|---|---|---|
| Bản đồ | 1–6 | 7, 8 |
| Shading | Ramp hoạt hình 3 bậc trên vật liệu model, viền mực fresnel. Viền ngoài (hull) **chỉ cho trụ đang chọn hoặc đang rê chuột, và boss** (High). | PBR, viền sáng màu Rift, mạch phát sáng trên đất |
| Màu | Bão hòa ×1,15, ấm, bóng ngả tím nhẹ | Tối, tương phản cao, điểm neon |
| Tone mapping | Neutral | ACES |
| Bloom | 0,25 (chỉ VFX vượt ngưỡng) | 0,6 |
| Đất | Ảnh vẽ tay sáng, khối màu lớn | Ảnh vẽ tay tối, mạch sáng |
| Nhãn chữ | Nền giấy sáng, chữ mực sẫm, viền gỗ | Nền tối trong suốt, viền sáng |
| VFX | Hình đục có viền, trộn alpha | Cộng màu |
| Đồng năng lượng | Đồng vàng `coin-energy` (khi có) | Tinh thể credits |
| Âm | Gỗ, chuông, nhạc dân gian sáng | Tổng hợp, điện tử |
| Prompt | Tiền tố "bright hand-painted storybook" | Tiền tố "dark painterly fantasy with neon glow" |

- Viền hull cần pháp tuyến mịn. Meshy xuất pháp tuyến tách mép, làm hull nứt. Trong Blender, AI nướng **pháp tuyến mịn vào thuộc tính riêng `_OUTLINE_NORMAL`** cho trụ, boss. Shader hull đọc thuộc tính này.
- Mốc cảnh chỉ dùng viền mực fresnel (không tốn draw call).
- Không ghi tên game khác trong prompt hay tài liệu cho người chơi.
- Mọi shader của bản đồ biên dịch sẵn khi nạp bằng `compileAsync`.
- Thêm phong cách mới chỉ cần: một file `styles/packs/<id>.ts`, thư mục art, danh sách kiểm tra.

---

## 8. Đặt trụ tự do: luật và số

### 8.1 Vòng chiếm chỗ

| Cỡ | Trụ | Bán kính r | Tầm cấp 1 / r |
|---|---|---|---|
| Nhỏ (S) | Tháp Băng, Trụ Sét, Mồi Nổ | 2,0 m | 3,5 / 3,5 / 4,0 |
| Vừa (M) | Giếng Trọng Lực, Đền Hồi Phục | 2,3 m | 2,6 / 3,0 |
| Lớn (L) | Trụ Thu Năng | 2,7 m | 2,6 |

- 2,0 m trùng vòng chân trụ hiện tại (2,05 m). Người chơi đã quen.
- Trụ trường lực to hơn. Thu Năng to nhất: kiếm tiền phải trả thuế đất.

### 8.2 Luật (số chính xác)

| Luật | Giá trị | Lý do |
|---|---|---|
| Lưới bám | 0,25 m, lưu số nguyên phần tư mét | Tất định, so sánh bình phương chính xác. |
| Trần trụ | **16 trụ mỗi bản đồ**, hiện "Trụ n/16" trên HUD. Bản đồ có thể ghi đè (`towerCap`), nhưng không vượt **trần an toàn 40** (cỡ buffer instanced của engine và bộ vẽ). | Pad cũ giới hạn 8–13 trụ. Trần 16 giữ cân bằng. Trần 40 giữ hiệu năng, có bài đo chịu tải. |
| Trần theo loại | **Thu Năng 3, Đền 2, Mồi Nổ 3.** Băng, Trọng Lực, Sét chỉ theo trần chung. Nút xây hiện "2/3". | Chặn dồn trụ hỗ trợ. |
| Hai trụ | Tâm cách nhau ≥ rA + rB + 1,0 m (S–S 5,0; S–M 5,3; M–M 5,6; S–L 5,7; M–L 6,0; L–L 6,4) | Chủ dự án muốn hai trụ không sát nhau. |
| Đường | Tâm cách tim mọi đường ≥ 1,6 + 0,3 + r (S 3,9; M 4,2; L 4,6) | Vòng không chạm đường, còn 0,3 m lề. |
| Lõi | **Tâm cách tâm Lõi ≥ 11,0 m** | Chặn dồn trụ ở đoạn chung cuối đường. Ô cũ gần nhất là 8,4 m. |
| Cổng Rift | Tâm cách cổng ≥ 3,5 + r (S 5,5) | Vùng đất cháy quanh cổng. |
| Biên | Cả vòng nằm trong ±46 m | Vùng chơi ±48 m. |
| Vùng cấm | Xét **mọi ô 0,5 m có tâm nằm trong đĩa vòng** (khoảng 50 ô). Một ô cấm là không đặt được. | Chính xác, rẻ, tất định. Không lọt suối hẹp. |
| Dốc | Chênh cao giữa ô cao nhất và thấp nhất trong đĩa ≤ 1.200 mm. Không có ô vách (> 35°). | Trụ đặt trên nền san phẳng. |
| Năng lượng | Xét cuối cùng | Chỉ nói "thiếu N" khi chỗ đó hợp lệ. |

- Thứ tự xét cố định: pha → trần chung → trần loại → biên → vùng cấm → đường → Lõi → cổng → dốc → trụ khác → mốc cảnh → năng lượng.
- Trụ đã gục vẫn chiếm chỗ và vẫn tính vào trần.

### 8.3 Sức chứa

- Đường thẳng, trụ S cấp 1 (tầm 7 m): tối đa 6 trụ cùng với tới một điểm trên đường. Mật độ ô cũ cũng cho 6.
- Cấp 3 (8,5 m): 8 trụ. Trên Cao điểm (8,75 m): 9.
- Mỗi chỗ giao đường có sông, vách hoặc mốc cảnh ở bên, để chỉ còn 3–4 chỗ tốt.
- **Mọi bản đồ: 15 m đường cuối trước quảng trường Lõi có nước, vách hoặc mốc cảnh ở ít nhất một bên.** Test lấy mẫu mỗi 1 m: mỗi mẫu có ít nhất một bên có ô cấm trong khoảng 2,5–8 m tính từ tim đường.

### 8.4 Hỗ trợ cùng loại không cộng dồn

Engine áp các luật sau. Đây là sửa lỗi cân bằng, không phải tùy chọn.

- **Thu Năng, tiền mỗi quái chết:** chỉ trụ có `perKill` cao nhất trong tầm trả tiền. Hòa thì id nhỏ hơn. Một sự kiện `siphon` duy nhất. Tiền đầu đợt (`income`) vẫn tính riêng từng trụ.
- **Đền, hồi Lõi:** một đồng hồ chung. Chu kỳ = chu kỳ ngắn nhất trong các Đền còn đứng (đã tính Mạch). Mỗi chu kỳ +1 mạng. Đền thứ hai trở đi chỉ sửa và hồi sinh trụ.
- **Mồi Nổ:**
  - Thời gian chờ chung: sau mỗi lần đánh dấu (từ bất kỳ Mồi Nổ nào), mọi Mồi Nổ chờ ít nhất **2,5 s**. Cặp dấu của Twin Sights tính là một lần.
  - Không đánh dấu quái cách một dấu bom còn sống dưới **4 m**. Áp cả cho cặp của Twin Sights.
- **Tăng tốc:** Conduit lấy mức cao nhất (+20 %). Restoration lấy mức cao nhất (+15 %). Tổng phần cộng (Mạch + Conduit + Restoration) tối đa **+35 %**.
- Làm chậm, hút đã lấy mạnh nhất. Giữ.
- Khiên Bastion đã không cộng dồn. Giữ.

### 8.5 Mã luật

- `rules/place.ts` thuần. `canPlace(state, type, x, z)` trả `{ ok: true, x, z, cost, clear, cleared[], high, power, twist }` hoặc `{ ok: false, reason, need?, tower? }`.
- Giao diện xem trước và engine dùng **cùng một hàm**.
- Engine bỏ chỉ số ô. Trụ có `id` tăng dần, không dùng lại, cộng `x`, `z`, `r`, `y`, `high`, `power` chốt lúc xây.
- Sự kiện mang `tower` (id). Sự kiện xây, bán, dời, sửa, hồi sinh, gục mang thêm `x, z`.
- Chỉ đặt trụ ở pha xây, ôn tập, chọn thưởng. Mỗi đợt là hàm thuần của (bản đồ, seed, trụ lúc đầu đợt, chữ gõ).
- Đặt, bán, dời không dùng số ngẫu nhiên.

---

## 9. Vùng địa hình thay đặc tính ô

Vùng là **dữ liệu bản đồ**, vẽ bằng hình tròn, viên nang hoặc đa giác. Không đoán từ ảnh. `rules/land.ts` dựng lưới 0,5 m (225 × 225 ô trên 112 m) gồm độ cao (milimét nguyên, `Int32Array`) và cờ vùng (`Uint8Array`). Luật và hình dùng chung kết quả này.

| Vùng | Cách xét | Tác dụng | Thay cho |
|---|---|---|---|
| **Trống** | Không có cờ nào | Xây không phí | normal |
| **Cao điểm** | Tâm trụ nằm trong vùng `high`. Vùng cao hơn đường gần nhất ≥ 2 m (test). | Tầm +25 % | high |
| **Mạch** | Tâm trụ trong vòng `power` bán kính 2,0 m | Sức +15 %. Mỗi vòng chỉ chứa một tâm trụ. Mỗi bản đồ 2–3 chỗ. | ley |
| **Rậm** | Có vật cản (cây, đá, tàn tích) | Xây được, phá vật cản, trả phí dọn | rubble |
| **Cấm** | Nước, dung nham, vách, mốc cảnh, dải viền | Không xây | — |
| **Đặc thù** | Tối đa 1 loại mỗi bản đồ | Mục 14 | ice |

- Không có luật che tầm bắn (line of sight) ở V5.
- Mục tiêu mỗi bản đồ: đất xây được 30–55 % vùng chơi. Cao điểm đủ 4–8 trụ. Rậm 15–40 % đất xây được.
- **Vùng đặc thù gây hại phải có cách khắc chế trên chính bản đồ đó.** Mỗi vùng ghi `counter`: một loại trụ được mở trên bản đồ, hoặc `"floor"` (có sàn an toàn). Test kiểm tra.

---

## 10. Phá môi trường khi đặt trụ

### 10.1 Vật cản

| Lớp | Ví dụ | Cao | Phí dọn | Ghi chú |
|---|---|---|---|---|
| Phủ đất | Cỏ, hoa, sậy | 0,3–1,5 m | 0 | Chỉ ở view. Bị xóa trong vòng. |
| Nhỏ | Đá cuội, bụi thấp, nấm | 0,4–1,5 m | 0 | Chỉ ở view. |
| Vừa | Tảng đá, bụi lớn, cột đổ | 1,5–5 m | 5 | Có trong luật: id, x, z, bán kính tán, bán kính gốc, phí. |
| Lớn | Cây, trụ đá, tàn tích | 5–16 m | 10 | Có trong luật. |
| Mốc cảnh | Thác, lâu đài, tháp Chăm, hải đăng | 10–30 m | Không phá được | Chặn xây. |

- Tổng phí dọn tối đa 30 mỗi lần đặt. Tháp Băng giá 70.
- Vật cản vừa và lớn sinh theo seed trong `land.ts`.
- **Vật cản bị phá khi đĩa tán của nó chạm vòng trụ** (dùng bán kính tán). Cây 14 m có tán chìa vào vòng thì bị phá, không đâm xuyên trụ.
- Đếm che chắn cho "Tán Che" (bản đồ 6) dùng **bán kính gốc**.
- Xem trước ghi giá tách: "Tháp Băng 70 + dọn 15".

**Luật rải vật cản quanh đường** (giữ đường dễ nhìn ở mọi góc):
- Trong 6 m tính từ tim đường: chỉ phủ đất và vật nhỏ (< 1,5 m).
- Vật vừa: từ 6 m trở ra.
- Cây và vật lớn: tâm cách tim đường ≥ max(10 m; 1,6 + bán kính tán + 0,5 m).

### 10.2 Diễn biến

| Thời điểm | Chuyện xảy ra |
|---|---|
| 0 s | Cột sáng xây. Vòng xung kích nở từ 0,5 tới 3,6 m, màu theo đất. |
| 0,05–0,30 s | Props vỡ, gần tâm vỡ trước. Cây nghiêng đổ, thu nhỏ trong 0,25 s. Đá văng mảnh. Băng, pha lê vỡ vụn. |
| 0,20–0,55 s | Đất trong vòng về độ cao phẳng. |
| 0,25 s | Vết đất lộ hoặc cháy sém hiện dần. |
| 0,40 s | Trụ mọc lên. |

- Tối đa 12 props có hiệu ứng vỡ mỗi lần. Pool 48 mảnh đá. Tối đa 4 tiếng vỡ trong 120 ms.
- Âm theo vật liệu: gỗ gãy và lá xào xạc; đá vỡ; pha lê vỡ; bì bõm.

### 10.3 San phẳng

- Độ cao phẳng = trung vị độ cao các ô trong đĩa, lượng tử về milimét. Lưu vào trụ (`tower.y`).
- Dải chuyển tiếp từ **r tới r + 0,5 m** (nửa khoảng hở 1 m giữa hai vòng).
- Trọng số dải = 0 trên ô đường (trong 1,85 m tính từ tim đường), ô quảng trường Lõi và ô sân cổng. San phẳng không bao giờ đổi độ cao đường.
- Hai dải chồng nhau thì lấy trọng số lớn nhất. Hòa thì trụ id nhỏ thắng. Kết quả không phụ thuộc thứ tự xây.
- **Độ cao sau san phẳng ghi vào lưới của luật**, không chỉ vào hình. Chọn đất bằng chuột, va chạm camera, xét dốc lần sau đều đọc cùng một lưới.

### 10.4 Kỹ thuật (không dựng lại lưới lớn)

- Props: một InstancedMesh mỗi loại mỗi LOD. Lưới băm ô 4 m. Phá = đổi chỗ với instance cuối, giảm `count`, chỉ tải lại đoạn buffer đổi.
- Phủ đất: mặt nạ R8 256² trên 96 m. Giá trị 0 thì cỏ co về 0, 0,5 thì cỏ rạp.
- Vết: bản đồ hư hại RGBA8 1024² trên 96 m (khoảng 9 cm mỗi điểm). R = đất lộ hoặc cháy, G = viền hố, A = bóng tiếp đất của props. Vết cháy của bom cũng vẽ vào đây.
- San phẳng: sửa mảng độ cao lưới gần, chỉ cập nhật đỉnh trong vòng (khoảng 35 KB), tính lại pháp tuyến tại chỗ.
- Khung đặt trụ ≤ 10 ms, giật không quá 1 khung.

### 10.5 Hoàn tác, bán, dời (luật kín, không có vòng lặp tiền)

- **Bán cùng pha xây đã xây** (trụ còn `fresh`): hoàn 100 % số đã chi và mọi phí dọn đã trả trong pha này. Vết biến mất.
- **Vật cản bị phá trong pha này mọc lại theo luật sau:** mỗi vật cản nhớ tập các vòng đang chạm nó. Khi vòng cuối cùng chạm nó bị gỡ trong cùng pha, nó mọc lại. Còn vòng khác chạm thì nó vẫn bị phá, nhưng phí dọn của nó vẫn được hoàn cho trụ đã trả.
- **Bán sau một đợt:** 60 % tiền trụ (80 % với Salvage). Không hoàn phí dọn. Vết ở lại, props không mọc lại.
- Xây lại trên vết cũ: không mất phí dọn.
- **Dời trụ:** chỉ ở pha xây.
  - Trụ vừa xây trong pha này: miễn phí dời.
  - Trụ cũ hơn: phí 15 % số đã chi (tối thiểu 10, làm tròn 5). Phí này không bao giờ được hoàn.
  - **Dời không bao giờ đổi `spent` hay `fresh`.** Trụ cũ dời rồi bán vẫn chỉ được 60 %.
  - Giữ cấp, nhánh, máu. Trụ đã gục không dời được. Chỗ mới trả phí dọn bình thường.
- **Thạch anh (bản đồ 5):** thưởng +5 cho mỗi cụm trả vào **đầu đợt**, chỉ cho cụm vẫn còn bị phá lúc đó. Tối đa 3 cụm mỗi trụ.
- **Test thuộc tính:** mọi chuỗi xây, bán, dời ngẫu nhiên (theo seed, 200 chuỗi × 50 thao tác) trong một pha xây, rồi bán hết trụ `fresh`, cho mã băm trạng thái giống hệt lúc đầu: năng lượng, vật cản, vết, thạch anh, che chắn.
- Lưu ván dở: seed, phiên bản và mã băm vùng đất, danh sách trụ (id, loại, x, z, cấp, nhánh, spent, máu), id vật cản đã phá, vết. Khôi phục: chạy lại không hiệu ứng. Phiên bản hoặc mã băm vùng đất khác thì từ chối bản lưu.

---

## 11. UX đặt trụ

### 11.1 Chuột

1. Bấm nút trụ ở thanh xây. Trụ mờ hiện dưới con trỏ.
2. Trụ mờ bám lưới 0,25 m trên đất. Con trỏ chọn đất bằng ray-march trên hàm độ cao, không raycast vào lưới tam giác.
3. Trụ mờ hiện:
   - model trụ trong suốt 55 %;
   - vòng chiếm chỗ: **xanh lá #46E08A** khi đặt được, **đỏ #FF4A4A** khi không, kèm chip lý do;
   - vòng tầm màu trụ (đã tính Cao điểm);
   - đoạn đường trong tầm sáng lên, chip "Phủ 14 m đường";
   - props sắp phá tô đỏ nhấp nháy, chip "Phá 2 cây · −15";
   - chip vùng: "Cao điểm · tầm +25 %", "Mạch · +15 %";
   - sao hợp (1–3) theo `fitAt(type, x, z)`, cache theo ô lưới;
   - vòng các trụ đã xây trong 14 m hiện mờ trắng 30 %.
4. Bấm trái: đặt. Shift + bấm: đặt và giữ loại trụ. Bấm phải hoặc Esc: hủy. Kéo trái quá 6 px vẫn kéo bản đồ.
5. Nháy đúp bị tắt khi đang cầm trụ mờ.
6. Chip lý do (tiếng Việt): "Trên đường", "Sát trụ Băng", "Nước", "Dung nham", "Vách đá", "Dốc quá", "Gần Lõi", "Gần cổng Rift", "Ngoài bản đồ", "Mốc cảnh", "Đủ 16 trụ", "Đủ 3 Thu Năng", "Thiếu 15 năng lượng".

### 11.2 Trụ đã xây

- **Rê chuột lên trụ: hiện vòng đỏ** của trụ đó (yêu cầu của chủ dự án), cộng vòng tầm.
- Bấm trụ: thẻ chi tiết bật ra cạnh trụ. Có Nâng cấp (hai nhánh là hai thẻ nhỏ), Sửa, Dời, Bán.
- **Bán cần hai bước:** bấm Bán, nút đổi thành "Chắc chắn? +42" trong 3 s; hoặc giữ nút 0,6 s.
- **Backspace không bao giờ bán.** Delete mở bước xác nhận.
- Bấm Dời: trụ mờ tách ra theo con trỏ, trụ gốc mờ 50 %.
- Thanh máu chỉ hiện cho trụ bị thương, gần camera trước, tối đa 15.

### 11.3 Bàn phím (pha xây)

- **1–6:** chọn trụ. Trụ mờ hiện ở **chỗ gợi ý tốt nhất** cho loại đó, không hiện dưới con trỏ (con trỏ có thể đang nằm trên HUD). Khi chuột di quá 6 px trên bản đồ, trụ mờ theo chuột.
- **Tab:** khi cầm trụ mờ, đổi lần lượt 3 chỗ gợi ý. Khi không cầm, chọn lần lượt trụ đã xây.
- **Mũi tên:** khi cầm trụ mờ, dịch trụ mờ 0,5 m theo hướng camera. Khi không cầm, xoay và nâng hạ camera như mục 3.2.
- **Shift + mũi tên:** luôn kéo bản đồ.
- **Enter:**
  - Khi cầm trụ mờ: đặt nếu hợp lệ. Không hợp lệ thì trụ mờ rung, chip lý do nháy. **Không bao giờ bắt đầu đợt.**
  - Khi không cầm: bắt đầu đợt. Nếu vừa đặt trụ dưới 1 s trước, lần Enter đầu chỉ hiện "Bấm Enter lần nữa để bắt đầu đợt". Lần thứ hai trong 2 s mới bắt đầu.
- **Esc:** hủy trụ mờ. Không cầm thì mở menu dừng.
- Không có phím chữ nào trong pha xây.
- Bỏ qua phím có Ctrl, Cmd, Alt, phím giữ lặp, phím đang ghép IME. Banner cảnh báo bộ gõ tối đa một lần mỗi 10 s.

### 11.4 Cảm ứng (máy tính bảng)

- Kéo từ nút trụ. Trụ mờ hiện cao hơn ngón tay 72 px. Di 10 px mới hiện.
- Thả tay: trụ mờ chờ, có nút ✓ và ✕ (44 px) bên cạnh. Kéo bất kỳ đâu để nhích trụ mờ với tốc độ 0,5×.
- Thả vào chỗ sai: trụ mờ đỏ ở lại để sửa, không tự hủy.

### 11.5 Gợi ý cho người mới

- Bản đồ 1 hiện 3 đốm gợi ý.
- Mọi bản đồ: nút "Gợi ý" hiện 3 chỗ hợp nhất cho trụ đang chọn. Tính lười lần đầu chọn trụ (khoảng 500 ứng viên × 0,015 ms).

### 11.6 Thời gian

- Pha xây 30 s (từ 25 s). Pha đầu tiên vẫn chờ người chơi. Thưởng gọi đợt sớm giữ nguyên (1 mỗi giây, tối đa 15).

---

## 12. Quái đánh trụ khi trụ đặt tự do

- **Mọi khoảng cách tới trụ tính tới mép vòng** (khoảng cách tới tâm − r).
- **Chọn mục tiêu:** ưu tiên trụ có tầm phủ chỗ quái đang đứng; rồi mép gần nhất; hòa thì id nhỏ hơn. Có test ghim luật hòa.
- **Quái nổ (Tất Phương):** nổ khi cách mép trụ ≤ 2,2 m. Quái đi lệch tối đa 0,9 m. Trụ có tâm cách tim đường ≤ 3,1 + r (S: ≤ 5,1 m) có thể bị nổ. Ôm sát đường thì phải chịu.
- **Bắn xa (Gà Rắn):** nhắm trụ có mép cách nó ≤ 7 m, hoặc trụ có tầm phủ nó.
- **Cận chiến (Oni 5 m, Bulgasari 4 m):** rời đường tới trụ. Chỉ chọn trụ khi đoạn thẳng từ đường tới mép trụ **không cắt vùng cấm**.
- **Quái bay:** nhắm trụ gần đường bay (mục 13.2).
- **Boss:** đòn diện rộng (rễ Mộc Tinh 8 m) đánh mọi trụ trong vùng.
- Mỗi bản đồ tối đa 3 loại quái đánh trụ.

---

## 13. Bộ quái mới

### 13.1 Nguyên tắc

- Chỉ lấy sinh vật, yêu quái, hồn ma dân gian. Không thần, Phật, thánh, tổ tiên được thờ.
- Đã loại: Tứ Linh, Nghê (làm quái), chim Lạc, Garuda, Naga, Rakshasa, Sơn Tinh, Thủy Tinh, Thổ Công, Kitsune của Inari, Tengu, Djinn, Golem, Thunderbird, Wendigo, Barong, Ma Lai và các hồn máu me.
- Vẽ tôn trọng: bùa Cương Thi để trống, Hồ Tinh không có đền hay torii, Gargoyle không thánh giá, Ma Da là hồn buồn không máu.
- **Ít loại hơn mà độc hơn:** 21 model (17 quái thường + 4 boss; quái con dùng chung model).
- Banshee để dành bản sau.
- Họ quái cũ chỉ còn là **màu và tên của Rift** trên mỗi bản đồ.

### 13.2 Luật quái bay

- Mỗi bản đồ có 1–2 **đường bay** từ vùng cổng tới Lõi, dài 60–80 % đường bộ ngắn nhất. Pha xây hiện đường bay bằng vệt gió và bóng chấm trên đất.
- **Độ cao bay tính sẵn trong luật:** mỗi đường bay có bảng độ cao mỗi 1 m = đất cao nhất trong hành lang rộng 3 m + độ cao bay. Lưu milimét nguyên. Vì vậy quái bay không chui qua karst 8–12 m (bản đồ 6), vành hố +5 m (bản đồ 8), vách 16 m (bản đồ 5).
- Độ cao bay: thấp ≤ 3,5 m (Ma Trơi 3 m, Chồn Liềm 1,5 m). Cao 6–9 m.
- Tháp Băng làm chậm quái bay bằng 70 % mức thường. Đóng băng làm quái bay cao rơi xuống: rơi 0,8 s, nằm đất 2,5 s, bay lên 1,0 s (boss một nửa).
- Giếng Trọng Lực kéo quái bay **xuống** 2,5 m/s. Từ 1,5 m trở xuống coi như ở đất, thêm 1,5 s sau khi ra khỏi tầm. Singularity làm rơi ngay.
- Trụ Sét đánh quái bay như thường.
- Bom tính theo khoảng cách 3D, bán kính 2,8 m. Quái bay mang bom nổ trên không, trúng cả quái đất trong 2,8 m.
- Nhãn chữ cao hơn đầu 1,2 m.
- **8 nhãn xếp theo thời gian tới Lõi (ETA)** = quãng còn lại / tốc độ gốc của loài (không tính làm chậm, để nhãn không nhảy). Hòa thì id nhỏ. Không còn trộn độ dài đường bộ và đường bay.
- Combo chiến thuật: Trọng Lực kéo quái bay xuống cụm quái đất, một từ bom diệt cả hai.

### 13.3 Bảng quái

Vẽ: A = shader chuyển động trên InstancedMesh; S = sprite; F = khung xương bay có sẵn; M = Meshy auto-rig dạng người; N = cần hàm Blender mới.

| # | id | Tên | Nguồn | Dáng · cách đi | Vai trò | Tốc | Lớp | Lọt | Thưởng | Cao | Vẽ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | cuong-thi | Cương Thi | Trung Hoa, Việt | người · nhảy hai chân | trinh sát | 3,8 | 1 | 1 | 1 | 2,0 | A |
| 2 | tat-phuong | Tất Phương | Trung Hoa | chim · lò cò một chân | quái nổ | 3,0 | 1 | 2 | 2 | 2,2 | A |
| 3 | nuppeppo | Nuppeppō | Nhật | khối bột · nảy | phân tách | 2,6 | 1 | 1 | 2 | 2,0 | A |
| 3b | nuppeppo-con | Nuppeppō con | — | như trên, ×0,55 | con | 4,0 | 1 | 1 | 1 | 1,1 | A |
| 4 | thuong-luong | Thuồng Luồng | Việt Nam | rắn · trườn | giáp + Dập Bom | 1,9 | 3 | 3 | 3 | 1,8 (dài 7) | A |
| 5 | bulgasari | Bất Khả Sát | Hàn | thú 4 chân · lê bước | Nuốt Trụ | 1,7 | 3→5 | 3 | 3 | 3,0 | N |
| 6 | oni | Quỷ Oni | Nhật | người to · chạy | phá trụ | 2,0 | 2 | 4 | 3 | 2,8 | M |
| 7 | tanuki | Lửng Chó Tanuki | Nhật | 2 chân · lạch bạch | hồi giáp | 2,4 | 1 | 1 | 3 | 1,8 | A |
| 8 | dokkaebi | Yêu Tinh Dokkaebi | Hàn | người gầy · đi | tàu mẹ (gọi Ma Trơi) | 1,8 | 2 | 3 | 3 | 2,6 | M |
| 9 | tsuchigumo | Thổ Tri Chu | Nhật | nhện 8 chân · bò | gây nhiễu | 2,2 | 1 | 1 | 3 | 1,6 | A |
| 10 | ma-da | Ma Da | Việt Nam | hồn · trôi | tàng hình + phục kích | 3,2 | 1 | 2 | 3 | 2,0 | A |
| 11 | ga-ran | Gà Rắn (Cockatrice) | châu Âu | chim 2 chân · sải bước | hóa đá trụ | 2,6 | 1 | 1 | 3 | 2,0 | N |
| 12 | troll | Quỷ Núi Troll | Bắc Âu | người to · đi nặng | khiên | 2,0 | 2 | 2 | 3 | 3,2 | M |
| 13 | ma-troi | Ma Trơi | Việt (cả Á, Âu) | đàn lửa · trôi, bay thấp 3 m | đàn | 2,6 | 1 cả đàn | 2 | 2 | 0,6/đốm | S |
| 14 | kamaitachi | Chồn Liềm | Nhật | chồn trên lốc · bay thấp 1,5 m | trinh sát bay | 4,6 | 1 | 1 | 2 | 1,4 | A |
| 15 | alicanto | Chim Vàng Alicanto | Chile | chim · bay cao 6 m | cướp năng lượng | 3,2 | 1 | 1 | 2 | 1,6 | F |
| 16 | gargoyle | Quỷ Đá Gargoyle | Pháp | có cánh · bay cao 6 m | đậu trụ | 2,6 | 2 | 2 | 3 | 2,2 | F |
| 17 | griffin | Sư Ưng Griffin | Hy Lạp, Ba Tư | 4 chân có cánh · bay cao 7 m | chở quân | 2,4 | 2 | 3 | 3 | 2,6 | F |
| B1 | moc-tinh | Mộc Tinh | Việt Nam | cây người · lê bước | boss | 1,4 | 5 / 9 | hết | 30 / 60 | 7,0 | M |
| B2 | dai-bang-tinh | Đại Bàng Tinh | Việt Nam (Thạch Sanh) | đại bàng · bay 9 m | boss | 1,8 | 5 / 9 | hết | 30 / 60 | 5,5 (sải 12) | F |
| B3 | hydra | Thủy Xà Hydra | Hy Lạp | rắn nhiều đầu · bò | boss | 1,2 | 7 → 10 | hết | 60 | 7,5 | N |
| B4 | ho-tinh | Hồ Tinh Cửu Vĩ | Việt Nam (Hồ Tây), Trung, Hàn | cáo 9 đuôi · rình, phi | boss | 1,3 | 9 đuôi | hết | 60 | 6,5 | N |

### 13.4 Kỹ năng (số dùng lại hằng số `ABILITY` khi cùng vai)

**Đi bộ**
- **Cương Thi.** Nhảy cú 1,2 m mỗi 0,32 s, 40 % thời gian trên không: Trọng Lực chỉ hút 60 %. Đi theo tốp 5 cùng nhịp; một con chết thì con trong 3 m khựng 0,3 s. VFX bụi chạm đất (40 con gần camera). Chết: bùa cháy từ dưới lên, thân thành tro, chuông "tinh".
- **Tất Phương.** Luôn mang bom. Cách mép trụ ≤ 2,2 m thì tự nổ: trụ mất 45 máu, cháy thêm 3 s × 5 máu (không cháy nếu có Tháp Băng trong 7 m). Bị gõ chết thì nổ bom 2,8 m. VFX vệt tàn lửa; chết: cầu lửa, lông bung, vết cháy.
- **Nuppeppō.** Chết thì tách 2 con. Chết trong 1,5 s sau một lần Sụp Đổ trùm tới nó thì bị nén dẹt, không tách. VFX bóp giãn, phụt bột kem.
- **Thuồng Luồng.** Mỗi 8 s phun nước vòng 5 m: quái trong vòng mất dấu bom (đồng hồ Mồi Nổ không hoàn). Bị đóng băng thì không phun. Tối đa 2 con có Phun Nước mỗi đợt. VFX cột nước 3 m, khói hơi khi dập bom; chết: cột nước, vảy ngọc, chìm.
- **Bulgasari.** Trụ có mép trong 4 m từ đường: dừng ăn 3 s, trụ mất 10 máu/s, nó +1 lớp (tối đa 5). Mỗi trụ bị ăn một lần, nghỉ 6 s. Đóng băng hủy bữa ăn. Event Horizon ném lùi. VFX tia lửa phun từ trụ, mảnh thép, lưng sáng dần; chết: tấm sắt bật, mưa hạt gạo vàng.
- **Oni.** Rời đường tới trụ trong 5 m (đường đi không cắt vùng cấm). Vung 0,8 s, đập 60, nghỉ 8 s. Mất lớp đầu thì Nổi Giận 4 s: +30 % tốc, vung 0,5 s. VFX vệt ngắm đỏ trên đất, nứt đất, rung nhẹ; chết: sừng gãy, chùy rơi.
- **Tanuki.** Mỗi 4 s hồi 1 lớp cho quái trong 4,5 m (không boss). Một lần mỗi đời: dấu bom trên nó nhảy sang quái gần nhất trong 3 m. VFX trống bụng, hai vòng hổ phách; chết: khói be, chiếc lá xoay rơi.
- **Dokkaebi.** Mỗi 10 s gõ gậy gọi đàn Ma Trơi 12 đốm, tối đa 3 lần. VFX vòng 8 lửa xanh.
- **Thổ Tri Chu.** Trụ có mép trong 6 m bị bọc tơ, ngừng đánh khi nó còn sống; lưới cháy rụi 2 s sau khi nó chết. Bị Trọng Lực hút thì bắn tơ kéo mình đi 3 m (nghỉ 6 s). VFX sợi tơ võng tới trụ, ảnh lưới phủ trụ.
- **Ma Da.** Tàng hình như Bóng Ma (lộ khi Băng 3 / Sét 3 chạm, hoặc trong 12 m quanh Lõi). Bản đồ có nước: một nửa số Ma Da nổi lên ở 1–3 điểm nước, trôi tới đường gần nhất (≤ 12 m). VFX vòng gợn, cột té; chết: vũng nước, 8 cánh sen trắng.
- **Gà Rắn.** Nhìn trụ 2,5 s (vệt ngắm vàng, trụ xám dần), rồi trụ hóa đá: tê 4 s, mất 20 máu. Nghỉ 6 s. Gõ chết lúc đang nhìn thì hủy. Sét Gây Rối hủy. Phục Sinh làm trụ trong tầm miễn.
- **Troll.** Khiên vòm đá 4 m: quái trong vòng không gõ được tới khi khiên vỡ (Sét vỡ 6 s; giết Troll vỡ hẳn). Trong tầm Đền Hồi Phục: chậm 30 %, da xám dần. Chết: hóa đá, vỡ 3 tảng.

**Bay**
- **Ma Trơi.** Một từ diệt cả đàn. Mỗi 5 s đàn mờ 0,4 s (chỉ hình). Chết: từng đốm tắt từ giữa ra, "plinh" thủy tinh.
- **Chồn Liềm.** Miễn bị Băng làm chậm (vẫn bị đóng băng). Trọng Lực kéo một nửa. Ba chồn xoay quanh trục lốc 0,6 m, 1,6 vòng/s. Lốc hạt theo vùng (cát, lá, tuyết), chỉ 12 lốc gần camera đủ hạt. Không đánh trụ.
- **Alicanto.** Bay qua trong 5 m của Thu Năng: sà xuống 1,2 s, cướp 3 năng lượng (khi người chơi có ≥ 3), tối đa 3 lần. Sau 2 lần cướp thì no: bay thấp 2 m, chậm 30 %. **Bị diệt thì trả lại đúng số đã cướp, cộng phần thưởng thường. Không có thưởng gấp đôi.** Lọt Lõi thì số đã cướp mất luôn. Có test: bị cướp rồi diệt không bao giờ lời hơn không bị cướp. VFX đồng bay ngược từ HUD tới chim, ô Năng lượng lóe đỏ "−3".
- **Gargoyle.** Đậu lên trụ cấp cao nhất trong 8 m quanh đường bay (0,8 s). Trụ bị tắt khi nó đậu. Đang đậu thì Sét không bóc lớp, Băng không đóng băng; chỉ chữ hạ được. Sau 10 s tự bay tiếp, nghỉ 8 s.
- **Griffin.** Mỗi 9 s, quắp tối đa 2 quái đất cao ≤ 2,2 m (không boss) trong 4 m bên dưới, chở 15 m về trước rồi thả (khựng 0,5 s). Tối đa 3 lần. Bị đóng băng hoặc kéo xuống thì thả ngay. Quái đang bị chở vẫn gõ được.

**Boss** (bộ kỹ năng mở dần theo số bản đồ)
- **Mộc Tinh.** Mỗi 12 s rễ trồi dưới mọi trụ có mép trong 8 m: 30 máu, tê 3 s (số `stomp`). Còn 2 lớp: cắm rễ 5 s; không bị Sét hay bom trúng thì hồi 1 lớp (một lần). Rễ là model `root-burst.glb` của chủ dự án.
- **Đại Bàng Tinh.** Mỗi 14 s lao xuống trụ nhiều máu nhất trong 10 m, nhấc lên 4 m, tắt 4 s, thả xuống mất 35. Còn ≤ 3 lớp: mỗi 10 s vỗ cánh đẩy quái đất trong 8 m tới trước 3 m. Đóng băng: rơi xuống 1,25 s.
- **Hydra.** Mỗi từ chém một đầu. Chỗ cụt sáng 5 s; nếu bị Sét, sóng Băng, Giáo Băng hoặc bom trúng thì hàn lại; không thì mọc 2 đầu (+1 lớp, tối đa 10, tối đa 3 lần). Mỗi 6 s phun độc vào trụ trong 14 m: 25 máu, trụ chậm 30 % trong 4 s. Còn 5 lớp: gọi 2 Thuồng Luồng. Còn 3: lao tới (2,6). Mọc đầu từ bản đồ 3.
- **Hồ Tinh.** 9 đuôi = 9 lớp. Mỗi 6 s bắn 3 lửa cáo vào tối đa 3 trụ trong 14 m (10 máu mỗi quả). Còn 5 đuôi: 2 cáo ảo (1 từ ngắn, thưởng 0, lọt không mất mạng, sống 12 s; Băng 3 / Sét 3 làm lộ). Còn 3 đuôi (từ bản đồ 4): mỗi 10 s mê hoặc trụ gần nhất trong 8 m trong 5 s (Băng làm quái nhanh 20 %, Trọng Lực đẩy ra 1 m/s, Sét và Mồi Nổ đứng yên), rồi lao tới.

### 13.5 Quy trình hoạt ảnh

- **Shader chuyển động** trong `crowd.ts` (thêm vào chỗ `STATE_DISPLACE`): nhảy, lò cò, nảy bóp giãn, trườn, lạch bạch, bò 8 chân, trôi có gợn thân dưới, xoay quanh trục, vỗ cánh (FLAP có sẵn). Chỉ biến dạng model của chủ dự án.
- **Khung xương bay có sẵn** (`build_winged_rig`, `make_flight_clips`, `make_dragon_clips`): Alicanto, Gargoyle, Griffin, Đại Bàng Tinh. Chim không tay: đặt `split.arm_y` = −99 (thử trong Blender trước).
- **Meshy auto-rig dạng người**: Oni, Dokkaebi, Troll, Mộc Tinh. Boss thêm `make_boss_bone_clips`.
- **Hàm Blender mới**: kind `defense-enemies`; `make_gait_clips` (thú 4 chân); `make_walk_clips` (bước chim); dáng rắn và `make_slither_clips` (Hydra); `make_perch_clips` (Gargoyle, Đại Bàng). Thử Tripo auto-rig loại quadruped/octopod/serpentine trước.
- **VAT** (`bake_vat.py`, 2 clip × 32 khung, khoảng 0,5 MB mỗi clip) cho quái có chân tay đông con. Trước khi có VAT: skinned mesh cho 2 boss và tối đa 12 tinh nhuệ gần camera.
- Tên clip: `Enemy_Move`, `Enemy_Idle`, `Enemy_Skill`, `Enemy_Hit`, `Enemy_Death`; boss thêm `Boss_*`.
- Tam giác trong trận: bầy 1.500, vừa 2.500, tinh nhuệ 4.000, boss 20.000.
- Hướng mặt: rắn và thú 4 chân quay theo hướng đi; dạng người quay nửa về camera.

### 13.6 Âm thanh sinh vật

- Tổng hợp bằng Web Audio: trống bụng, chuông, gió lốc, nhện lách cách, tiếng trườn, ù Ma Trơi, "cốc" gỗ.
- Mẫu âm CC0 (Kenney, Freesound CC0), ghi nguồn vào `art-src/defense/audio/SOURCES.md`. Không dùng `art-src/Dota-Sounds`.

---
## 14. Tám vùng đất

Giữ id bản đồ để không mất sao. Chỉ đổi tên hiển thị. Đường đi giữ hình dạng V4 (bot đã cân theo độ dài đường). Vùng chơi 96 × 96 m (±48), lưới gần 112 m, vành đất xa tới 800 m.

Luật chung mọi bản đồ:
- Đường, mép nước, vách đá và màu vùng (Mạch, Cao điểm) **vẽ từ dữ liệu luật**, đè lên ảnh nền. Ảnh nền chỉ lo màu đất. Đường là một dải lưới phủ texture đường (`path-*`) của chủ dự án.
- 15 m đường cuối có nước, vách hoặc mốc cảnh ở ít nhất một bên (mục 8.3). Gợi ý từng bản đồ ghi bên dưới.
- Luật rải vật cản quanh đường ở mục 10.1.
- 4 quái nền (Cương Thi, Ma Trơi, Thuồng Luồng, Tất Phương) để người chơi học một lần; 3 quái đặc trưng; 1 quái bay (từ bản đồ 2); 2 boss. Tối đa 8 loại thường, tối đa 3 loại đánh trụ (Tất Phương luôn là một).
- Bố cục mỗi bản đồ được **đóng băng** (mã băm bố cục) sau khi bot cân bằng đạt. Chỉ sau đó mới xuất ảnh khung cho chủ dự án vẽ.

### 14.1 Đồng Cỏ Thác Bạc — `rainbow-reach` (bản đồ 1)
- **Phong cách:** sách tranh. **Rift:** hồng #ff7ad9.
- **Khí hậu, giờ:** cao nguyên ôn đới, 7:30 sáng sau mưa. Cầu vồng trên thác.
- **Địa hình:** đường chữ S. Đồi Cầu Vồng (2, −21) r 8 m cao 2,6 m. Gò Đá Đông dọc x ≈ 27 (z −20…8) cao 2,8 m. Hồ suối (9, −3) r 3 m. Suối Bạc rộng 3 m dọc phía tây. Rừng (−30…−14, 16…34). Đồi chè (12…34, 14…34), phí dọn 0.
- **15 m cuối:** một lạch nước nhỏ từ hồ suối chạy dọc một bên.
- **Vùng:** Cao điểm 2 (đồi, gò). Mạch "Bụi Cầu Vồng" 2 chỗ quanh hồ. Rậm: rừng. Cấm: suối, hồ, vách thác. Không có vùng đặc thù (bản dạy chơi).
- **Mốc cảnh:** vách thác bạc phía bắc (thác là dải texture chảy + hạt bụi nước), cầu gỗ nơi đường qua suối, cầu đỏ cong trên hồ, cối xay gió trên đồi xa, lầu ngắm cảnh.
- **Trời, thời tiết:** trời xanh, mây trắng, cầu vồng. Phấn hoa, sương sớm (sương thấp tính bằng shader). Bão đợt 6, 8: mưa, sấm xa không chớp. Đợt 10: tạnh, nắng xuyên mây.
- **Quái:** nền + Nuppeppō, Tanuki, Troll. Không quái bay riêng (chỉ Ma Trơi).
- **Boss:** Mộc Tinh (đợt 5), Hồ Tinh bộ nhẹ (đợt 10: chỉ Hồ Hỏa và Ảo Ảnh).

### 14.2 Vịnh Đá Trắng — `halo-garden` (bản đồ 2)
- **Phong cách:** sách tranh. **Rift:** vàng #ffd36b.
- **Khí hậu, giờ:** bờ biển đá vôi, 18:00 giờ vàng. Gió biển.
- **Địa hình:** hai cổng trên bãi cát phía bắc, biển ở z < −44. Thềm Đền Trắng (0, −14) cao 2,4 m giữa hai đường. Mỏm đá vôi x = ±31…±38 cao 3 m. Vũng triều (−8…8, −36…−30). Vườn ô-liu hai góc nam.
- **15 m cuối:** một bậc đá vôi (vách thấp) dọc một bên.
- **Vùng:** Cao điểm 3. Mạch "Sân Khảm Cổ" 2 chỗ (−4,5, 3) và (6, 21). Rậm: vườn ô-liu. Cấm: biển, vũng triều, vách. Không vùng đặc thù.
- **Mốc cảnh:** hải đăng trên mũi đá, cổng đền đổ, cầu tàu gỗ, lều đánh cá sọc, thúng chai, 8–14 đảo đá kiểu Hạ Long ngoài khơi.
- **Trời, thời tiết:** phía bắc trời xanh hồng mát, mặt trời sau lưng camera. Bọt biển. Bão: mưa xiên.
- **Quái:** nền + Ma Da (nổi từ biển), Troll, Gà Rắn. Bay: Chồn Liềm.
- **Boss:** Đại Bàng Tinh, Hydra (không mọc đầu ở bản đồ 2).

### 14.3 Cao Nguyên Tro Lửa — `ember-hollow` (bản đồ 3)
- **Phong cách:** sách tranh (núi lửa hoạt hình, đá bazan khối to). **Rift:** cam đỏ #ff5a1f.
- **Khí hậu, giờ:** núi lửa, 19:00 chạng vạng dưới mây tro. Trời xám tro, đỏ chỉ quanh núi lửa.
- **Địa hình:** Đảo Bazan (mesa giữa hai nhánh, x −3,5…3,5, z −17…11, cao 3 m, đủ 4 trụ). Gò Tro (−15, 0) cao 2,4 m. Hồ dung nham đông (12…30, −22…6). Sông dung nham phía tây.
- **15 m cuối:** một rãnh dung nham nhỏ dọc một bên.
- **Vùng:** Cao điểm 2. Mạch "Lỗ Phun Nhiệt" quanh hồ dung nham. Rậm: cột bazan, gai obsidian. Cấm: dung nham.
- **Đặc thù (đã sửa):** trụ đứng trên Lỗ Phun Nhiệt được +15 % sức như Mạch, nhưng **mỗi lần đánh mất 1 máu, không bao giờ xuống dưới 50 % máu tối đa.** Trụ đánh liên tục (Trọng Lực cấp 1–2, Thu Năng, Đền) tính 1 lần đánh mỗi 2 s. `counter: "floor"`. Lý do: bản đồ 3 chưa mở Đền, bản cũ (−1 máu/s) làm trụ cấp 1 gục mỗi đợt mà không có cách chữa.
- **Mốc cảnh:** cổng pháo đài đổ, bộ xương thú khổng lồ, cầu xích qua dung nham, núi lửa phun ở chân trời.
- **Trời, thời tiết:** tro 1.800 hạt, tàn lửa 250. Đợt 5, 10: phun trào (trời quanh núi sáng ×3 trong 1,5 s, rung 0,25, đá lửa xa).
- **Quái:** nền + Oni, Dokkaebi, Nuppeppō. Bay: Gargoyle (đá nứt lửa). Đánh trụ: Tất Phương, Oni, Gargoyle.
- **Boss:** Đại Bàng Tinh, Hydra (mọc đầu từ đây).

### 14.4 Lãnh Nguyên Sông Băng — `frost-veil` (bản đồ 4)
- **Phong cách:** sách tranh. **Rift:** lam băng #7fe8ff.
- **Khí hậu, giờ:** lãnh nguyên cực, giờ xanh, cực quang.
- **Địa hình:** các đoạn đường thẳng là sông đóng băng (vùng băng V4 giữ nguyên). Ba dải bờ tuyết cao 1,2 m giữa các đoạn. Mỏm Đá Gió (29, −12) và (−29, −2) cao 2,8 m. Hồ băng (14, 22) r 5 m. Rừng thông.
- **15 m cuối:** hồ băng hoặc một dải sông băng (cấm xây) dọc một bên.
- **Vùng:** Cao điểm 2. Mạch "Mạch Băng Cực Quang" 2 chỗ. Rậm: rừng thông. Cấm: hồ băng.
- **Đặc thù:** đường băng: quái nhanh 15 %, Tháp Băng mạnh 25 % (giữ V4). `counter: frost`.
- **Tương phản:** mặt băng là băng đen. Tuyết trắng dày chỉ ở xa và trên tán thông.
- **Mốc cảnh:** đồn gỗ có hàng rào cọc và lều tròn, cầu gỗ, ngà voi ma mút, sông băng lớn ở chân trời.
- **Trời, thời tiết:** tuyết 3.000 hạt; bão tuyết đợt 6, 8 (4.800, gió ×2,5). Đợt 5, 10: cực quang bùng.
- **Quái:** nền + Troll, Ma Da, Thổ Tri Chu. Bay: Chồn Liềm (lốc tuyết).
- **Boss:** Mộc Tinh (thông tuyết), Hồ Tinh (cáo trắng; Mê Hoặc mở từ đây).

### 14.5 Hẻm Núi Lăng Kính — `prism-spire` (bản đồ 5)
- **Phong cách:** sách tranh. **Rift:** tím #8f7bff.
- **Khí hậu, giờ:** hẻm đá đỏ sa mạc, 16:00.
- **Địa hình:** đường tự cắt ở (0, 0). Bàn Đá Vòng (15, −0,5): mesa đỉnh 3 m, cao 3,2 m, một trụ phủ 4 đoạn đường. Tháp Đá Bắc (0, −9). Bãi đá đổ đông bắc. Lòng suối cạn phía nam. Vách đỏ 10–16 m quanh viền; cổng tây bắc trong khe hẹp.
- **15 m cuối:** chân vách đỏ dọc một bên.
- **Góc thấp:** vách viền nằm trong hàm va chạm camera. Vách che tia nhìn thì bị hạ trong shader (mục 3.7). Dưới 25°, camera không ra ngoài ±46 m.
- **Vùng:** Cao điểm 2 (chỗ đáng giành nhất). Mạch "Mạch Thạch Anh" 2 chỗ. Rậm: bãi đá. Cấm: vách.
- **Đặc thù (đã sửa):** phá cụm thạch anh khi đặt trụ được +5 năng lượng mỗi cụm, **trả vào đầu đợt** cho cụm vẫn còn bị phá. Tối đa 3 cụm mỗi trụ.
- **Mốc cảnh:** vòm đá tự nhiên, đoàn lều lữ hành, cầu dây qua khe, cụm tinh thể selenite khổng lồ.
- **Trời, thời tiết:** bụi, 2 lốc bụi. Bão cát đợt 6, 8 (2.500 hạt, nắng ×0,55).
- **Quái:** nền + Gà Rắn, Bulgasari, Nuppeppō. Bay: Alicanto. Đánh trụ: Tất Phương, Gà Rắn, Bulgasari.
- **Boss:** Đại Bàng Tinh, Hydra.

### 14.6 Rừng Già Đền Rễ — `verdant-wild` (bản đồ 6)
- **Phong cách:** sách tranh. **Rift:** xanh lá #9dff6b.
- **Khí hậu, giờ:** rừng mưa, 10:30 ẩm sau mưa.
- **Địa hình:** hai đường riêng. Sông Rễ chảy dọc giữa, đổ vào Hố Sụt (0, 0) r 4 m có thác nhỏ. Thềm Đền (0, 13) cao 2,6 m phủ đoạn cuối cả hai đường. Rễ Thiêng (±18,5, −2). Trụ karst (±10,5, −21) cao 8–12 m.
- **Rừng và đường:** rừng phủ gần hết đất, **nhưng cây lớn cách tim đường ≥ 10 m**. Dải 6–10 m là bụi và cây vừa. Trong 6 m là cỏ, dương xỉ thấp. Ở 57°, 35° và 15°, đường phải lộ ≥ 90 % (test ảnh).
- **15 m cuối:** tháp Chăm (mốc cảnh) và Sông Rễ.
- **Vùng:** Cao điểm 1. Mạch "Rễ Thiêng" 2 chỗ. Rậm: gần hết. Cấm: sông, hố sụt, karst.
- **Đặc thù "Tán Che":** trụ có ≥ 3 vật cản vừa hoặc lớn chưa phá, gốc nằm trong 1,5 m ngoài vòng của nó, nhận ít hơn 40 % sát thương từ đòn bắn xa (Gà Rắn, lửa cáo, độc Hydra). `counter: "floor"` (không gây hại).
- **Tương phản:** đất quanh đường là đất đỏ bazan và lá mục. Màu xanh nằm trên tán.
- **Mốc cảnh:** tháp Chăm cổ bị rễ ôm, cầu đỏ qua sông, làng nhà sàn, thác đổ vào hố sụt, tượng nghê đá (chỉ trang trí).
- **Trời, thời tiết:** sương thấp đặc (shader), côn trùng, tia nắng xuyên tán (High). Bão: mưa như trút 4.000 hạt, tắt côn trùng (tổng ≤ 5.000).
- **Quái:** nền + Thổ Tri Chu, Tanuki, Dokkaebi. Bay: Griffin.
- **Boss:** Mộc Tinh, Hydra.

### 14.7 Đầm U Minh — `shadow-rift` (bản đồ 7)
- **Phong cách:** **neon**. **Rift:** tím #c08bff.
- **Khí hậu, giờ:** đầm tràm, 23:00 đêm trăng, sương, đom đóm.
- **Địa hình:** mặt đầm phần lớn đất thấp (cấm). Ba đường là ba bờ đê rộng 5,5 m. Khoảng 14 gò xây được r 3,5–6 m. Gò Cây Chết (−6,5, −11) và (7, −14,5) cao 2,4 m.
- **15 m cuối:** mặt đầm hai bên đê.
- **Vùng:** Cao điểm 2. Mạch "Gò Ma Trơi" 1 chỗ (−6, 15). Rậm: tràm trên gò. Cấm: nước.
- **Đặc thù "Bãi bùn":** đoạn đường chung (0, 9) → (0, 17), quái chậm 10 %. `counter: "floor"`.
- **Lưu ý cân bằng:** ít chỗ xây; bot kiểm tra không quá chật. Có thể đặt `towerCap` thấp hơn 16.
- **Mốc cảnh:** nhà sàn bỏ hoang, lối ván gỗ, cột đá cổ phát sáng.
- **Trời, thời tiết:** trăng tròn, sương thấp 3 tầng màu (shader), đom đóm 260. Bão: sương dâng, sét tím câm.
- **Quái:** nền + Ma Da, Thổ Tri Chu, Nuppeppō. Bay: Gargoyle. Đánh trụ: Tất Phương, Thổ Tri Chu, Gargoyle.
- **Boss:** Mộc Tinh, Hydra (đầm Lerna).

### 14.8 Hố Sao Rơi — `cosmic-throne` (bản đồ 8)
- **Phong cách:** **neon**. **Rift:** lam #6fc3ff. Tên hiển thị đổi từ "Cosmic Throne".
- **Khí hậu, giờ:** sa mạc cao nguyên, 02:00 đêm quang, Ngân Hà, mưa sao băng.
- **Địa hình:** đường xoắn ốc đi xuống hố thiên thạch cổ. Vành hố cao +5 m ở bán kính 41–46 m. Thành hố hạ dần từ +1,5 m xuống −1,5 m, bậc thềm giữa các vòng đường. Gò Văng (0, −25) và (−13, 7,5) cao hơn đường 2,5 m. Lõi trên ụ đá giữa hố.
- **Điểm xoắn ốc:** ghi sẵn thành bảng số trong dữ liệu (không tính bằng sin, cos khi chạy).
- **15 m cuối:** dốc đá của ụ Lõi (vách) một bên.
- **Vùng:** Cao điểm 2. Mạch "Mảnh Thiên Thạch" 2 chỗ. Rậm: đá văng xếp theo tia. Cấm: vách vành hố.
- **Mốc cảnh:** đài thiên văn cổ, vòng 8 cự thạch, ruộng muối, núi lửa tuyết ở chân trời.
- **Trời, thời tiết:** sao băng mỗi 2–5 s (bão: mỗi 0,5–1,5 s). Đợt 5, 10: mưa sao băng và một cầu lửa lớn bay ngang.
- **Quái:** nền + Oni, Dokkaebi, Troll. Bay: Griffin.
- **Boss:** Đại Bàng Tinh, Hồ Tinh bộ đầy đủ.

---

## 15. Bầu trời, ánh sáng, thời tiết, nước

### 15.1 Bỏ không gian

- Defense bỏ `FlightWorld` và nền vũ trụ (sao, bụi, tinh vân, hành tinh khí, đèn viền cyan và hồng). Campaign 3D không đổi.
- Sửa luôn review #54 (sky ẩn vẫn tải và vẽ).

### 15.2 Bầu trời

- Dải panorama hình trụ từ −6° tới +45°, mỗi nửa 180° là một ảnh. Trên +45° là gradient.
- Ở góc mặc định 57° không thấy trời. Trời phục vụ góc thấp, phản chiếu nước và màu sương. Vì vậy ảnh trời nằm ở đợt art C/D.
- Một shader, một lệnh vẽ: gradient + ảnh + trộn lên đỉnh + dải hơi nước ở chân trời + đĩa mặt trời hoặc quầng trăng + chớp sét, nhiễm Rift, cực quang.
- Chưa có ảnh: gradient 3 màu theo vùng.
- Runtime 3072 × 864 mỗi nửa (High), 2048 × 576 (Medium), nén KTX2, không mipmap. Thiếu nửa sau thì lật gương nửa trước.
- Script `pnpm defense-skies:prepare <land>` cắt dải, trộn mối nối 6°, đo dải 256 màu chân trời và màu đỉnh.

### 15.3 Sương và độ sâu

- `near = max(70, D + offset)`, `far = near + span` (D = khoảng cách camera). Cổng xa nhất mờ ≤ 25 %.
- Màu sương theo hướng nhìn, lấy từ dải 256 màu chân trời.
- **Sương thấp tính bằng công thức trong `fog_fragment`**: mật độ theo độ cao trên mặt đất (đặc nhất sát đất, hết ở 2–3 m tùy vùng). Không dùng tấm sương phẳng. Không tốn fill-rate thêm.
- Vành đất xa: lưới cực từ mép vùng chơi tới 800 m, một lệnh vẽ, hình theo vùng.
- Cột sáng Rift ở mỗi cổng (rộng 4 m, cao 45 m): pha xây 30 %, đợt 100 %.
- Trong đợt: sương và chân trời ngả 10 % về màu Rift; đợt boss 20 %.

### 15.4 Ánh sáng

- Đèn chính (mặt trời hoặc trăng), hemisphere, đèn phụ ngược hướng. Ban ngày: PMREM dựng từ trời lúc nạp. Ban đêm (bản đồ 7, 8): giữ RoomEnvironment.
- Bóng: High dùng shadow map tĩnh 2048, chỉ vẽ lại khi trụ hoặc props đổi (≤ 4 lần/s, ≤ 2 ms). Quái dùng bóng mờ có sẵn, xoay theo hướng nắng. Bóng mây trôi trên đất.
- Đổi bậc chất lượng chỉ áp dụng ở pha xây.

### 15.5 Thời tiết

- Hạt chạy trên GPU, mỗi lớp một lệnh vẽ, CPU chỉ đổi uniform. Hồ hạt riêng.
- Cường độ theo đợt: pha xây 0,3; đợt 1–4: 0,4 → 0,6; đợt 6 "Storm" và đợt 8 "Great storm" 1,0; đợt 7 "Lull" 0,3.
- **Góc dưới 25° hoặc góc Dọc đường: mật độ × 0,5.**
- Tổng hạt thời tiết ≤ 5.000 (High), ≤ 2.000 (Medium) ở mọi lúc, kể cả bão.
- Sét tối đa một lần mỗi 6 s. Không bao giờ có khung trắng toàn màn. Giảm chuyển động: mật độ ×0,3, không chớp.
- Tùy chọn: Thời tiết Đầy đủ / Nhẹ / Tắt. Mặc định Đầy đủ ở High, Nhẹ ở Medium.

### 15.6 Nước

- Chỉ shader trên mặt phẳng: màu theo độ sâu, bọt mép, gợn, fresnel, soi dải trời, lóe nắng.
- Mép nước lấy từ dữ liệu luật (mức nước và độ cao), không từ ảnh nền.
- Loại: suối trong (1), biển (2), dung nham phát sáng có vỏ nứt (3), băng (4), sông bùn (6), đầm (7).
- Không đặt trụ trên nước hay dung nham.

---

## 16. Kinh tế và cân bằng

- **Giá trụ, tầm, chỉ số:** giữ như `data.ts`.
- **Phí dọn:** 0 / 5 / 10, tối đa 30. Thay phí dọn đống đá 40.
- **Bán:** 60 % (Salvage 80 %); 100 % trong pha vừa xây. **Dời:** miễn phí trong pha vừa xây, sau đó 15 % (tối thiểu 10). Luật kín ở mục 10.5.
- **Pha xây:** 30 s.
- **Trần:** 16 trụ mỗi bản đồ; Thu Năng 3, Đền 2, Mồi Nổ 3.
- **Hỗ trợ cùng loại không cộng dồn:** mục 8.4.
- **Không xây trong 11 m quanh Lõi.**
- **Chim Vàng:** trả lại đúng số đã cướp (mục 13.4).
- **Quái nổ có tác dụng thật** (mục 12).

### 16.1 Bot cân bằng

Bot chọn chỗ trên lưới ứng viên: mọi gợi ý + các điểm dọc đường mỗi 2 m ở độ lệch (1,9 + r), +1,5, +3, +5 m. Lọc bằng `canPlace`, thứ tự cố định.

| Bot | Cách chơi | Điều phải đúng |
|---|---|---|
| Cân bằng | Chọn theo điểm hợp, trải các loại trụ | 40 wpm thắng bản đồ 1 có trụ, thua khi không trụ. 60 wpm thắng bản đồ 4 và 8. 40 wpm thua bản đồ 8. Đỉnh 300–550 quái ở bản đồ 5. |
| Tham | Mỗi pha xây: rải trụ rẻ nhất lên các chỗ tốt nhất tới hết tiền | Không thắng ở wpm thấp hơn bot Cân bằng. Ở đợt 5 có ≤ (số trụ của bot Cân bằng + 3) và ≤ 12 trụ. |
| Vòng Thu Năng ở Lõi | Thu Năng tối đa sát vùng cấm Lõi, còn lại như Cân bằng | Năng lượng 10 đợt ≤ 1,15 × bot Cân bằng. Không làm "40 wpm thua bản đồ 8" thành thắng. |
| Chồng Đền | Đền tối đa đặt sát nhau | Như trên. Mạng Lõi hồi không vượt bot Cân bằng quá 15 %. |
| Chồng Mồi Nổ | Mồi Nổ tối đa đặt sát nhau | Như trên. Số từ bom mỗi phút không vượt bot Cân bằng quá 15 %. |
| Ôm Lõi | Mọi trụ trong 11–15 m quanh Lõi | So với bot **Trải** (trụ trải đều dọc đường). Ôm Lõi thắng ở wpm thấp hơn Trải thì cờ đỏ cho bản đồ. |
| Ôm đường | Mọi trụ đặt sát đường hết mức | Ở bản đồ 3 phải dính ít nhất 1 vụ nổ của quái nổ. |

### 16.2 Chỉ số dồn trụ (liên tục)

- Với mỗi loại trụ, mỗi chỗ p: **giá trị(p) = tổng số giây-đường có trọng số giao thông trong tầm.**
  - Lấy mẫu đường mỗi 0,25 m. Mỗi mẫu trong tầm cộng (0,25 / 2,6 m/s) × k.
  - k = số đường đi qua mẫu đó (đoạn chung của 2 đường tính 2, của 3 đường tính 3).
- So chỗ tốt nhất với **chỗ tốt nhất cách nó ≥ 12 m**. Tỉ số > 1,8 thì cờ đỏ: sửa bố cục (thêm sông, vách, mốc cảnh) rồi chạy lại.
- Thay cho luật cũ "chỗ tốt nhất ≤ 2 lần chỗ thứ hai" (luật cũ không bao giờ báo, vì chỗ thứ hai chỉ cách 0,25 m).

- Giữ sao cũ (id bản đồ giữ nguyên).

---

## 17. Tất định trên mọi trình duyệt

Test vàng chạy trên Node (V8). Người chơi dùng Safari (JSC). Bản lưu khôi phục bằng chạy lại. Vì vậy luật phải ra kết quả giống hệt ở mọi máy.

- `rules/` chỉ dùng: + − × ÷, `Math.sqrt`, `floor`, `ceil`, `round`, `trunc`, `abs`, `min`, `max`, `sign`, `imul`, `clz32`.
- Cấm trong `rules/`: `Math.sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `exp`, `expm1`, `pow`, `log`, `log2`, `log10`, `log1p`, `hypot`, `cbrt`, `sinh`, `cosh`, `tanh` và toán tử `**`. Test ranh giới quét các tên này.
- 28 chỗ `Math.hypot` đổi thành `Math.sqrt(dx*dx + dz*dz)`, hoặc so bình phương khi chỉ cần so.
- Góc cố định (hướng cụm bom Cluster Charge, điểm xoắn ốc bản đồ 8) là bảng hằng số ghi sẵn.
- Hướng quay của quái (`atan2` ở `path.ts`) chuyển sang view.
- Độ cao: milimét nguyên (`Int32Array`). Tọa độ trụ: phần tư mét nguyên. So sánh bình phương khoảng cách.
- Nhiễu địa hình chỉ dùng hash số nguyên và nội suy đa thức (như `hash`/`valueNoise` của `painter.ts`).
- **Seed:** PRNG mulberry32 (dùng `Math.imul`). Mỗi ván có seed. Bản chạy thật truyền seed vào engine. Seed nằm trong bản lưu.
- **Golden:** kịch bản xây theo thứ tự ô tăng dần. Mã băm tính trên phép chiếu chuẩn (chỉ số ô ↔ id trụ), nên đổi thứ tự lặp không làm lệch.
- Golden và mã băm vùng đất chạy trong Node, Playwright Chromium, WebKit và Firefox. Phải trùng.
- Bản lưu mang phiên bản và mã băm vùng đất. Khác thì từ chối.

---

## 18. Hình khi chưa có art

Game phải ổn ngay khi chủ dự án chưa vẽ xong, nhưng không coi hình tạm là bản cuối:
- **Đất:** `painter.ts` vẽ đất tạm từ bảng màu và vùng. Texture lát đợt A về sớm nên chi tiết đất là art thật sớm. Đường vẽ bằng texture đường của chủ dự án ngay khi có.
- **Trời:** gradient 3 màu, đĩa mặt trời hoặc trăng, sương theo hướng.
- **Model:** trụ, Lõi, cổng, rồng, cầu lửa hiện có. Pha lê `prop-crystal-a/b/c` làm pha lê Rift và Mạch.
- **Đồng:** ảnh credits 8 bậc có sẵn.
- **Quái:** model `-lod` hiện có, ánh xạ theo vai qua `legacy/st-content.ts`, tô màu Rift.
- **VFX:** 13 chuỗi flipbook có sẵn + ảnh tĩnh combat-vfx.
- Thiếu GLB không được làm vỡ game: mỗi model có try riêng, `allSettled`, fallback là sprite vẽ tay hoặc bỏ qua loại props đó. Có test.
- Bản dev hiện huy hiệu "Thiếu art: N" và danh sách.
- **Giới hạn thật:** chưa có props thì vùng Rậm chỉ có đất vẽ. Vì vậy props đợt B đi sớm.

---

## 19. Yêu cầu art cho chủ dự án

### 19.1 Thứ tự làm

1. **Đợt A (2D, nhanh):**
   1. 6 ảnh VFX: `dust-burst`, `wood-splinters`, `leaf-burst`, `ground-scar-01`, `water-splash`, `explosion`. Ưu tiên cao nhất.
   2. Ảnh đồng `coin-energy`.
   3. Texture lát cho cả 8 vùng (5 tấm mỗi vùng, 40 tấm).
   4. Ảnh nền bản đồ 1, khi AI gửi ảnh khung đã đóng băng (cuối bước 9).
2. **Đợt B (3D):**
   1. 6 props chung (shader tô lại màu theo từng vùng).
   2. 8 cây đặc trưng, mỗi vùng một cây.
   3. 5 mốc cảnh bản đồ 1.
   4. Lõi và cổng Rift kiểu sách tranh.
3. **Đợt C:**
   1. 4 quái nền (Cương Thi, Thuồng Luồng, Tất Phương; Ma Trơi là ảnh sprite) và 2 boss đầu (Mộc Tinh, Hồ Tinh).
   2. 7 ảnh nền bản đồ còn lại.
   3. 8 ảnh trời nửa trước.
4. **Đợt D:**
   1. Props và mốc cảnh còn lại theo từng vùng.
   2. Quái đặc trưng theo thứ tự mở bản đồ, 2 boss còn lại, bản neon ưu tiên.
   3. 6 trụ kiểu sách tranh (một model mỗi loại).
   4. VFX còn lại: `fox-fire`, `feather-burst`, `lotus-petals`, `web-overlay`, `stone-overlay`, `venom-splash`, `ground-crack`, `snow-burst`, `ground-scar-02…03`, bản neon của 6 VFX đợt A. Model `root-burst.glb`.
   5. Ảnh trời nửa sau (không bắt buộc).

Tài liệu đầy đủ: `docs/art-requests/RIFT_DEFENSE_V5_ART_2026-10-21.md`. Bước 0 viết phần đợt A và B. Bước 9 thêm ảnh khung. Bước 12 thêm prompt quái.

### 19.2 Ảnh khung bản đồ

- Script `scripts/visual/scenarios/defense-land-guides.mjs` (thay `defense-map-guides.mjs`) xuất 2048² phủ 112 × 112 m:
  - `art-src/defense/guides/NN-<id>-layout.png`: màu phẳng.
  - `art-src/defense/guides/NN-<id>-relief.png`: bóng địa hình xám, đường đồng mức mỗi 1 m.
- Bảng màu: `#FF00FF` đường; `#FFD700` quảng trường Lõi; `#FF2020` cổng Rift; viền `#00FFFF` Cao điểm; `#00FF80` Mạch; `#808000` đất dưới rừng hoặc bãi đá; `#0050FF` lòng nước; `#FF7A00` dung nham; `#A0F0FF` băng; nét đen dày mép vách; `#5A5A5A` đất trống; `#2A2A2A` đất nối dài ra ngoài.
- Chỉ xuất sau khi bố cục đã đóng băng. Mã băm bố cục ghi vào `public/assets/defense/maps/art-manifest.json` cùng ảnh khung. Test báo lỗi khi bố cục đổi mà ảnh khung chưa xuất lại.
- Lưu ảnh nền: `art-src/defense/ground/<land>/map.png` (lớn nhất có thể; tối thiểu 2048²).

### 19.3 Tiền tố prompt theo phong cách

Sách tranh (S):
```
Bright hand-painted storybook fantasy style: chunky rounded shapes, thick readable silhouettes, warm saturated colours, soft painted shading, clean dark painted outlines.
```
Neon (N):
```
Dark painterly fantasy style: deep rich colours, crisp clean edges, glowing neon accents painted on the surface as thin veins, cracks and tips (no loose light rays).
```

### 19.4 Prompt ảnh nền bản đồ (dán sau tiền tố phong cách)

Game tự vẽ đường, mép nước, mép vách và ánh vùng lên trên. Ảnh nền chỉ cần màu đất.
```
Paint over the attached layout image to make a top-down ground texture of a real landscape for a game. Keep every area exactly where it is. The game draws its own road, water surface, cliff rims and glowing areas on top of your painting, so paint only the ground. The magenta band is where the game lays its road: paint it as plain flat ground of the surrounding type, with no road, no path and no paving. The yellow circle becomes a plain round patch of packed earth. Each red circle becomes scorched, cracked ground. Blue areas are water beds (sand, pebbles or mud, darker toward the middle). Orange areas are dark cooled lava crust. Pale cyan areas are smooth dark ice. Olive areas are the ground under dense forest or boulders (roots, leaf litter, moss, gravel only). Bright green areas are the special ground named below, painted subtly (the game adds the glow). Cyan-outlined areas are hilltops and plateaus (same land, a little drier and rockier). Thick black lines are cliff edges: paint plain ground on both sides and no rim (the game draws the cliff). Grey is open ground. The dark grey border is the same land continuing outward: paint it fully, never fade to black. The second grey image only shows hills and slopes: put rocky ground on steep slopes, do not copy its shading. Straight top-down orthographic view, no perspective, no horizon. Flat, even, shadowless lighting with no sun direction. Everything lies flat; nothing stands up: no trees, bushes, rocks, crystals, columns or buildings. Large clear colour areas, fine even small detail. No hexagons, no platforms, no text, no UI, no characters. Square image, the largest size available, 4096 × 4096 if possible, at least 2048 × 2048.
```
Dòng riêng mỗi bản đồ (dán cuối):
1. `World: Silverfall Meadows. Lush highland grass with damp patches, a silver stream bed of grey pebbles, a misty spring pond ringed with bright moss (the green areas), flower specks pressed flat.`
2. `World: Whitecliff Bay. Damp golden sand by the sea, tide-pool rock beds, grey-olive dry scrub, ancient white-and-gold mosaic floors (the green areas), pale limestone ground near the cliffs.`
3. `World: Ashfall Badlands. Grey-brown ash and cinder ground with basalt plates, ropy cooled lava crust, yellow sulfur crust around vents (the green areas).`
4. `World: Frostriver Tundra. Brown-olive tundra moss with patchy snow, frost on dark rock, dark clear river ice with white cracks (pale cyan areas), pale gravel, frozen springs with faint aurora-blue veins (the green areas).`
5. `World: Prism Canyon. Layered red-orange sandstone with wind-swept sand, cracked clay in the wash, white and violet quartz veins inlaid flat in the rock (the green areas).`
6. `World: Rootshrine Jungle. Red laterite earth and leaf litter, flat roots and moss on limestone, a river bed of round pebbles and a dark sinkhole floor, golden-green sacred roots spread flat (the green areas).`
7. `World: Umbral Mire at night. Dark peat mud under shallow water (blue areas), grey-green mud hummocks with flat dry reed mats, a hummock with faint cyan wisp light (the green area).`
8. `World: Starfall Crater, high desert at night. Pale ochre gravel and dark ejecta in rays from the centre, white salt crust patches, pale tuff terraces between the spiral turns, flat blue meteorite glass shards (the green areas).`

### 19.5 Texture lát

Lưu `art-src/defense/ground/<land>/<tên>.png`. 5 tấm mỗi vùng. Tấm `path-*` là texture đường game dùng. Tấm đá là texture vách.
```
A seamless tileable square texture of <MATERIAL>, seen straight from above, flat even lighting with no shadows, no highlights and no sun direction, no perspective, uniform detail spread evenly over the whole image with no large single features, no vignette, no border, so it repeats without visible seams; crisp fine detail; the largest square size available (2048 × 2048 if possible, at least 1024 × 1024).
```
Dán tiền tố phong cách (S cho vùng 1–6, N cho vùng 7–8) ở đầu.

| Vùng | 5 tấm (tấm đường in đậm, tấm vách in nghiêng) |
|---|---|
| meadow | grass-short, soil-wet, *granite-moss*, streambed-pebbles, **path-dirt** |
| coast | sand-golden, sand-wet-dark, maquis-scrub, *limestone*, **flagstone-warm** |
| volcano | ash-cinder, *basalt-rock*, lava-crust, sulfur-crust, **path-basalt-slabs** |
| tundra | black-ice, snow-patchy, tundra-moss-lichen, *granite-frost*, **path-packed-snow** |
| canyon | *sandstone-layers*, sand-orange, clay-cracked, gypsum-crust, **path-packed-sand** |
| jungle | leaf-litter, laterite-mud, *limestone-moss*, river-pebbles, **path-laterite-stones** |
| swamp (N) | black-mud, *peat-roots*, swamp-bed, dry-reed-mat, **path-causeway** |
| crater (N) | gravel-ochre, salt-crust, regolith-dark, *tuff-pale*, **path-stone-slabs** |

AI xử lý tiếp: làm liền mép, tạo normal từ độ sáng, phóng to ảnh 1k lên 2k nếu cần, nén KTX2.

### 19.6 Trời

Lưu `art-src/defense/skies/<land>.png` (nửa trước) và `<land>-back.png` (nửa sau, không bắt buộc). `<land>`: meadow, coast, volcano, tundra, canyon, jungle, swamp, crater.
```
Paint a wide panoramic skyline backdrop for a 3D strategy game. Ultra-wide landscape (21:9 if available, else 16:9), the largest size available. Someone standing on open ground looking straight at a level horizon: no tilt, no fisheye. The horizon is one straight line at exactly 70% from the top. Above it: sky, clouds, light and very distant landforms in a thin hazy strip (at most 10% of the image height). Below it: only soft haze fading to a flat colour. No foreground, no trees or rocks near the viewer, no people, no creatures, no text, no frame, no lens flare. The left and right 10% are calm (open sky, low hills) so the image can be joined.
```
Dòng riêng:
- meadow: `Morning after rain, sun behind the viewer; fresh blue sky, big white cumulus, last grey rain clouds leaving to the right; a soft rainbow over the left half (ends at 6% and 50%, top at 36%); soft blue-green hills and mist in valleys.`
- coast: `Golden hour, sun behind the viewer; cool blue sky with a pink band at the horizon; calm open sea on the left 60% with gold reflections; a white chalk headland on the right with a slender lighthouse at 75%.`
- volcano: `Dusk under a heavy ash cloud; dark grey-purple ash lit dull red from below; a great volcano with its peak at 58%/58%, glowing lava rivers, an ash plume bending right; keep the sky mostly ash-grey, red only near the volcano.`
- tundra: `Polar blue hour; deep indigo to pale teal; green aurora curtains with violet hems from 15% to 85%; a glacier and snowy mountains in a thin strip; a few faint stars.`
- canyon: `Late afternoon, sun behind the viewer; clear pale blue; layered red sandstone mesas and buttes on the horizon; on one mesa at 40%, huge violet and cyan crystal formations; warm heat haze.`
- jungle: `Mid-morning after rain; bright overcast with towering cumulus; layered jungle ridges fading into mist; a thin waterfall at 30%; the top of an overgrown ancient stepped stone temple above the canopy at 62%; deep teal-green, avoid bright yellow-green.`
- swamp: `Night; a large full moon at 61%/52% with a halo; silver-blue fog banks; dead cypress silhouettes on a flat marsh horizon; a faint violet glow in some clouds; readable, not pitch black.`
- crater: `Clear high-desert night; the Milky Way arcs from lower right to upper left; a crescent moon at 17%/54%; distant snowy volcano cones and a pale salt flat on the horizon; a faint ancient observatory ruin on a ridge at 70%.`

Nửa sau: tải nửa trước lên, dán `The attached image is the front half of a 360° panorama. Paint the back half in the same size, horizon at 70%, same style and light; its LEFT edge continues the attached RIGHT edge and its RIGHT edge continues the attached LEFT edge; calmer, no main landmark.`

### 19.7 Props, mốc cảnh, Lõi, cổng, trụ

Cách ghép prompt: tiền tố phong cách + phần chung + mô tả riêng + dòng nền.

Phần chung:
```
Single environment prop for a tower-defense game: one object alone, front 3/4 view about 25 degrees from above, near-orthographic, centred, the whole object visible, base cut flat (no ground, no soil, no grass around it), one connected solid opaque piece (no floating parts, no thin strands, no see-through gaps), foliage as a few big solid clumps, soft even front lighting, no cast shadow, no text, no frame.
```
Dòng nền:
- Mặc định: `Flat pure #00FF00 green background, perfectly uniform; the subject contains no green at all.`
- Vật có màu xanh lá: `Flat pure #FF00FF magenta background, perfectly uniform; the subject contains no pink or magenta at all.`
- Vật có cả xanh lá và hồng (hoa): `Flat pure #0000FF blue background, perfectly uniform; the subject contains no blue at all.`

Lưu ảnh: `art-src/defense/props/<land>/<id>.png`. Model: `art-src/3d/defense/props/<land>/<id>.glb`. Mốc cảnh: `art-src/defense/landmarks/<land>/<id>.png` → `art-src/3d/defense/landmarks/<land>/<id>.glb`. Lõi, cổng: `art-src/defense/structures/<id>.png`. Trụ: `art-src/defense/towers/<loại>.png`.

Meshy: lớn 6.000 tam giác, vừa 3.000, nhỏ 1.500. AI giảm LOD, gộp atlas, nướng pháp tuyến mịn cho hull trong Blender.

| Vùng | Props (lớp, cao) | Mốc cảnh |
|---|---|---|
| common | boulder-round (vừa 2,5), boulder-slab (vừa 1,5), pebble-cluster (nhỏ 0,6), dead-tree (lớn 7), fallen-log (vừa), grass-tuft (phủ 0,6) | — |
| meadow | **oak-tree** (lớn 10), birch-trio (lớn 8), tea-bush (nhỏ 1,2), wildflower-clump (phủ 0,5, nền lam), mossy-boulder (vừa 2,5), stone-wall (vừa) | waterfall-cliff, wooden-bridge, red-arch-bridge, windmill, lookout-pavilion |
| coast | **olive-tree** (lớn 6), cypress-tree (lớn 10), agave (nhỏ), limestone-rock (vừa), marble-column (vừa 4), fishing-tent (vừa), basket-boat (nhỏ) | lighthouse, temple-arch-ruin, wooden-pier, sea-stack |
| volcano | basalt-columns (lớn 6), obsidian-spire (vừa), lava-boulder (vừa), sulfur-vent (vừa), **charred-tree** (lớn 6), ash-shrub (nhỏ) | fortress-gate-ruin, beast-ribcage, chain-bridge |
| tundra | **snow-fir** (lớn 10), young-fir (vừa 4), ice-spire (lớn 6), snow-boulder (vừa), dwarf-birch (nhỏ), stone-cairn (vừa) | log-fort-with-yurts, wooden-bridge-snow, mammoth-tusks |
| canyon | hoodoo (lớn 9), red-boulder (vừa), quartz-cluster (vừa), **desert-juniper** (vừa 3), barrel-cactus (nhỏ), prickly-pear (vừa) | rock-arch, caravan-tents, rope-bridge, selenite-beams |
| jungle | **banyan-giant** (lớn 14), buttress-tree (lớn 16), fan-palm (vừa 6), bamboo-clump (lớn 9), banana-plant (vừa), tree-fern (vừa), undergrowth (phủ) | cham-tower-ruin, red-lacquer-bridge, stilt-village, sinkhole-waterfall, nghe-statue |
| swamp (N) | **melaleuca-tree** (lớn 9), mangrove-tree (vừa 5), nipa-palm (vừa), reed-clump (phủ 1,5), cypress-dead (lớn 8), white-lotus (nhỏ), mushroom-log (nhỏ) | stilt-hut-ruin, plank-boardwalk, glowing-stone-pillar |
| crater (N) | iron-meteorite (lớn 4), ejecta-rock (vừa), **cardon-cactus** (lớn 5), tola-shrub (phủ), llareta (nhỏ), carved-menhir (vừa 3), salt-pillar (vừa) | star-dial-observatory, menhir-ring |

Cây in đậm là **cây đặc trưng** của vùng (đợt B).

### 19.8 Quái

- Tiền tố quái S: `Single creature concept for a bright, hand-painted storybook fantasy tower-defense game...` Tiền tố N: `Single creature concept for a dark fantasy tower-defense game...` (bản đầy đủ trong tài liệu art: góc 3/4, 25° từ trên, một khối liền, không hạt rời, không chữ, không bóng).
- Mô tả riêng từng con lấy từ báo cáo bộ quái ngày 21/10 (ví dụ Cương Thi: `a jiangshi ... a long blank paper talisman (yellow paper with an abstract red swirl, no letters)`). Bước 12 chép đủ vào tài liệu art.
- Nền: xanh lá mặc định; hồng tím cho Thuồng Luồng, Ma Da, Mộc Tinh.
- Ảnh góc nghiêng `<id>-side.png` cho Hydra, Hồ Tinh, Griffin, Gargoyle, Đại Bàng Tinh, Thổ Tri Chu, Bulgasari.
- Lưu: `art-src/defense/creatures/<id>.png` (bản neon `<id>-neon.png`), model `art-src/3d/defense/creatures/<id>.glb`, boss `art-src/3d/defense/bosses/<id>.glb`.
- Mỗi con một model. Bản neon riêng chỉ khi xuất hiện ở bản đồ 7–8 và chất liệu khác hẳn.
- Ma Trơi là sprite: `art-src/defense/creatures/ma-troi.png`, nền đen.

### 19.9 VFX và đồng

Luật chung cho ảnh VFX:
- Mỗi ảnh **một hình khối duy nhất**, ruột sáng hơn mép, để độ sáng làm mặt nạ hòa tan. Lề trống 15 %.
- Ảnh trộn alpha (bụi, mảnh gỗ, lá, nước, cánh sen, mạng nhện, vân đá, nổ sách tranh): nền trong suốt; không có thì nền phẳng `#00FF00` (vật không có màu xanh lá) hoặc `#FF00FF` (vật có màu xanh lá).
- Ảnh cộng màu (lửa, tia lửa, lóe, bản neon): nền đen thuần `#000000`.
- Ảnh mặt nạ (vết cháy, vết nứt): trắng trên nền đen, nhìn từ trên xuống.
- Lưu `art-src/defense/vfx/<tên>.png`. Ảnh vuông, lớn nhất có thể (tối thiểu 1536²).
- Prompt từng ảnh đợt A ở mục 23.

### 19.10 Âm thanh

- Âm nền mỗi vùng hai lớp (nền, thời tiết): `public/assets/defense/audio/ambience/<land>-<lớp>.ogg`. Thiếu thì tổng hợp gió bằng nhiễu lọc.
- Nhạc theo phong cách: sách tranh (dân gian sáng), neon (điện tử). Nhạc phát dạng stream.

---

## 20. Ngân sách hiệu năng

**Cảnh đo:** 400–420 quái, bão đỉnh đợt 8, đủ props, **16 trụ (trần bản đồ) có vòng rê chuột, 2 trụ đang cháy**, đồng đang bay. Đo ở **3 góc: 57°, 35°, 15°**. Thêm một lần đo chịu tải 40 trụ (ép bằng dev handle).

| Mục | High (Apple Silicon, DPR 2) | Medium (GPU tích hợp, DPR 1) |
|---|---|---|
| Thời gian khung | Trung bình ≤ 5,5 ms, p95 ≤ 8,5 ms (cả 3 góc) | Trung bình ≤ 12 ms |
| CPU chậm 4 lần | Trung bình ≤ 8,5 ms, p95 ≤ 12 ms | — |
| Draw call tổng | ≤ 150 (V4: 108) | ≤ 120 |
| Môi trường (đất, đường, vành, nước, props, phủ đất) | ≤ 32 draw call, ≤ 750k tam giác, ≤ 2.000 instance props, ≤ 4.000 phủ đất | ≤ 26, ≤ 300k, ≤ 1.200, ≤ 1.600 |
| Khí quyển (trời, thời tiết, cột Rift) | ≤ 10 draw call, ≤ 5.000 hạt | ≤ 2.000 hạt |
| Quái | Khoảng 12 draw call + x-ray ≤ 8, ≤ 280k tam giác | Như High, dùng LOD |
| **Trụ** | **Instanced: ≤ 20 draw call** (6 loại × tối đa 2 primitive = 12; 1 lớp vòng và hào quang; ≤ 4 bản clone chọn/rê/đang xây ≤ 7). Số trụ không đổi draw call. 40 trụ: draw call không tăng quá 2. | Như High |
| VFX + loot | ≤ 20 draw call, 2.400 hạt chiến đấu, 120 đồng; loot ≤ 2 draw call | 1.200 hạt, 60 đồng |
| Tải mỗi bản đồ (lần đầu) | ≤ 12 MB | ≤ 6 MB |
| Khung đặt trụ | ≤ 10 ms | ≤ 16 ms |
| DOM | ≤ 8 nhãn hoặc ghim, ≤ 15 thanh máu trụ, ≤ 8 chữ nổi | Như High |
| Overdraw cộng màu | ≤ 1,5 màn hình | ≤ 1,0 |

**Trụ vẽ instanced:**
- Mỗi loại trụ một `InstancedMesh` cho mỗi primitive. Cấp hiện bằng tỉ lệ và vòng trang trí trong attribute.
- Hoạt ảnh trụ (nảy, giật khi bắn, xoay đỉnh) bằng shader theo attribute.
- Clip GLB (nếu có) chỉ chạy trên tối đa 4 bản clone: trụ đang chọn, đang rê chuột, đang xây, đang nâng cấp.
- Viền hull chỉ cho trụ đang chọn hoặc rê và boss.

**Bộ nhớ texture (nén KTX2/Basis):**
- Script chuẩn bị (`scripts/defense-art/prepare-textures.mjs`) dùng KTX-Software `toktx`. Đất và texture lát: UASTC (có RDO + zstd). Atlas props: ETC1S. Model: `gltf-transform` nén texture trong GLB.
- Chạy: `KTX2Loader`. File transcoder lấy từ gói three, phục vụ ở `/assets/defense/basis/`.
- Máy chưa cài `toktx`: giữ WebP và báo, không dừng.
- Ảnh nguồn 1–2k: phóng ×2 bằng sharp lanczos3 và làm nét nhẹ. Manifest ghi `upscaled: true`.

| Mục | Kích thước | GPU High | GPU Medium |
|---|---|---|---|
| Ảnh nền bản đồ | 2048² UASTC (4096² chỉ khi ảnh nguồn ≥ 3000 px: 22 MB) | 5,6 MB | 2,8 MB (ETC1S) |
| Texture lát | 5 × 1024² UASTC | 7,0 MB | 1,8 MB (512²) |
| Normal lát | 5 × 512² | 1,8 MB | — |
| Atlas props (màu + normal) | 2 × 2048² | 11,2 MB | 2,8 MB (1024²) |
| Mốc cảnh | ≤ 6 × 1024² | 8,4 MB | 2,1 MB |
| Bản đồ hư hại + mặt nạ + độ cao | 1024² RGBA8 + 256² R8 + 225² R32F | 4,3 MB | 1,3 MB |
| **Môi trường cộng** | | **≤ 48 MB** (≤ 70 MB với nền 4096²) | **≤ 16 MB** |
| Trời (2 nửa) + PMREM | 3072 × 864 UASTC + 256 | ≤ 14 MB | ≤ 6 MB |
| VFX + loot | 2 atlas 2048² + atlas đồng 1024 × 512 | ≤ 16 MB | ≤ 6 MB |
| Nhân vật (quái, boss, trụ, Lõi, cổng, rồng) | 1024² mỗi loại, boss 2048² | ≤ 48 MB | ≤ 24 MB |
| Render target mới (bóng 2048², méo hình 1/4) | | ≤ +24 MB so với V4 | ≤ +4 MB |

- Đo bằng sổ texture của Defense (cộng byte từng texture khi nạp), đối chiếu `renderer.info.memory`. `defense-perf.mjs` báo lỗi khi vượt.

Luật:
- Không cấp phát mỗi khung. Không `Math.random` tạo object mỗi khung.
- Buffer instanced chỉ tải phần đổi (`addUpdateRange`).
- Mọi shader biên dịch sẵn khi nạp bản đồ.
- Props: chia LOD và lọc khung nhìn trên CPU chỉ khi camera dời > 2 m, xoay > 4° hoặc zoom > 8 %, tối đa 10 lần/s.
- Engine: ≤ 0,5 ms mỗi bước với 640 quái và 16 trụ.
- Giữ cơ chế tự hạ chất lượng, nhưng chỉ đổi phần bóng ở pha xây kế tiếp.
- Không còn canvas 2D phủ toàn màn hình.

---

## 21. Kiểm thử và kiểm tra hình

### 21.1 Test tự động (vitest)

- `defense-boundary.test.ts`: luật ở mục 6.5, gồm cấm hàm toán ở mục 17.
- `defense-keyboard.test.ts`: Backspace không bán; Delete mở xác nhận; bỏ phím có modifier, phím lặp, phím ghép; Enter không bỏ pha xây khi cầm trụ; mũi tên và F1–F3 điều khiển camera; phím chữ không bao giờ đổi camera.
- `defense-camera.test.ts`: neo zoom giữ đúng ≤ 1 px ở **mọi khung lướt** (200 ca ngẫu nhiên, nghiêng 12–85°); kéo bản đồ ≤ 1 px khi nghiêng ≥ 20°; gần chân trời không ra NaN; chuẩn hóa `deltaMode`; trackpad; giới hạn góc, khoảng cách, ±46 m; chống chui đất kể cả vành xa.
- `defense-labels.test.ts`: nhãn ngoài màn hình hoặc sau camera thành ghim đúng mép; màu khẩn cấp theo ETA; Theo dõi nguy hiểm kích hoạt sau 4 s và khung đủ 8 quái.
- `defense-fx-director.test.ts`: mọi loại sự kiện có công thức; trần mỗi khung; gộp sự kiện; vòng luật chơi không bị kẹp cỡ; overdraw ≤ 1,5 màn hình; không dùng `setTimeout`.
- `defense-loot.test.ts`: tổng giá trị đồng = năng lượng nhận; gộp khi vượt trần không mất tiền; số hiện không bao giờ âm và khớp số thật sau ≤ 1,5 s; tua nhanh khi chi tiền; giảm chuyển động.
- `credit-*.test.ts` (Space Typing): xanh, không sửa.
- `defense-golden.test.ts`: băm chuỗi sự kiện theo phép chiếu chuẩn. Trước và sau khi đổi sang id phải trùng.
- `defense-determinism.test.ts` + kịch bản Playwright: golden và mã băm vùng đất trùng trên Node, Chromium, WebKit, Firefox.
- `defense-place.test.ts`: mỗi lý do của `canPlace`, kể cả đúng ở mép; đĩa vòng quét ô; trần chung và trần loại; Lõi 11 m; Cao điểm, Mạch, Rậm; phí dọn; xây lại trên vết; vật cản mọc lại đúng luật; bán sau đợt; dời không đổi `spent`/`fresh`; id không dùng lại.
- `defense-economy.test.ts`: test thuộc tính hoàn tác (mục 10.5); thạch anh trả đầu đợt; Chim Vàng không bao giờ lời.
- `defense-support.test.ts`: Thu Năng trả theo trụ mạnh nhất; đồng hồ hồi Lõi chung; Mồi Nổ chờ chung 2,5 s và cách dấu 4 m; tăng tốc ≤ +35 %.
- `defense-land.test.ts`: cùng seed cùng lưới (băm); vùng không đè đường, Lõi, cổng; Cao điểm cao hơn đường ≥ 2 m; 15 m cuối có một bên bị chặn; mỗi 10 m đường có ≥ 2 chỗ xây hợp lệ trong 7 m; đặt trụ phá đúng vật cản; san phẳng không đổi độ cao đường; dải san phẳng chồng nhau không phụ thuộc thứ tự; vùng đặc thù có cách khắc chế; luật rải vật cản quanh đường; mã băm bố cục khớp art manifest.
- `defense-balance.test.ts`: các bot ở mục 16.1; chỉ số dồn trụ mục 16.2.
- `defense-creatures.test.ts`: mỗi kỹ năng một ca; luật bay (rơi khi đóng băng, kéo xuống, nổ 3D, độ cao theo bảng, nhãn theo ETA); quái nổ chạm trụ ôm đường; cận chiến không vượt sông; luật hòa chọn mục tiêu.
- `defense-styles.test.ts`: mọi bản đồ ra `MapLook` hợp lệ; đổi phong cách không đổi chuỗi sự kiện; đường dẫn art hợp lệ.
- `defense-lands.test.ts` (khí quyển): `far` lớn nhất < bán kính vành; số hạt ≤ ngân sách kể cả bão; nguồn sáng 0–60°.
- `defense-model-contracts.test.ts`: pickups ≤ 300 tam giác; props ≥ 50; creatures có socket FX_CORE, FX_HEAD.
- Bench engine và job hiệu năng hằng đêm.

### 21.2 Kịch bản hình (Playwright, `scripts/visual/scenarios`)

- `defense-camera.mjs`: kéo trái, kéo phải, lăn chuột vào khúc cua (điểm biết trước lệch ≤ 2 px); góc Dọc đường (đường lộ giữa màn hình); zoom 22 m vào cổng ở đợt 3 thì **cả 8 nhãn thấy được hoặc đã ghim**; Theo dõi nguy hiểm.
- `defense-hud-layout.mjs`: 8 cỡ cửa sổ ở mục 4.2. Đo diện tích HUD (≤ 10 % trong đợt, ≤ 15 % pha xây, không tính banner), thanh dưới ≤ 10 % chiều cao, banner ≤ 50 % rộng, nhãn không đè HUD. Zoom 22 m: trụ ở giữa màn hình ≤ 30 %; vật ở 15 % dưới cùng vượt 35 % thì đã mờ; rồng ≤ 14 %.
- `defense-juice.mjs`: chuỗi khung lúc diệt quái (0, 80, 300, 600, 1.000 ms); bom chuỗi; xây, nâng cấp, bán; Lõi trúng; boss chết. Chụp bản V4 làm mốc "trước".
- `defense.mjs`: trụ mờ hợp lệ và không hợp lệ; vòng đỏ khi rê chuột; phá props trước và sau; thẻ trụ; dời trụ; bán hai bước; "Trụ 16/16".
- `defense-lands.mjs`: mỗi bản đồ: 57° pha xây, 35° đợt 3, 15° Dọc đường đợt 4 (khoảng 150 quái), như vậy ở bão đỉnh đợt 8, nhìn về phía mặt trời, 85°. Đo tương phản quái và nền: ΔL* ≥ 25. **Đo phần đường không bị che ≥ 90 % ở 57°, 35°, 15°** (vẽ mặt nạ đường có và không có vật che, so số điểm ảnh).
- `defense-land-guides.mjs`: xuất ảnh khung và mã băm.
- `defense-perf.mjs`: từng bản đồ, cảnh đo ở mục 20, 3 góc, High và Medium, cờ bật tắt props, sổ texture.
- `determinism.mjs`: chạy golden trên Chromium, WebKit, Firefox.
- Mọi kịch bản chạy được khi thiếu media.

### 21.3 Kiểm tra bằng tay (trình duyệt thật)

- Gõ thật với Telex bật và tắt: không phím nào bán trụ hay bỏ qua pha xây.
- Chỉnh camera bằng mũi tên trong đợt mà không rời bàn phím.
- Trackpad Mac và chuột ba nút.
- Máy tính bảng có bàn phím rời.
- Nghe bằng loa thật: tick đồng, nổ, không vỡ tiếng.

---
## 22. Kế hoạch triển khai

Thứ tự: bước an toàn → camera → HUD → VFX và loot (chủ dự án thấy sớm) → đổi id → đặt trụ → vùng đất → bộ quái → tách platform cuối cùng.

Luật chung cho mọi bước:
- Bắt đầu từ HEAD hiện tại (`e11a0e3c` hoặc mới hơn). Đọc diff, không dựa vào nhánh song song.
- Mỗi bước build được, test được một mình, và có commit riêng.
- Mỗi bước giữ xanh: `pnpm check`, toàn bộ test Space Typing, `defense-boundary.test.ts`.
- Mỗi bước đo `defense-perf.mjs`. Không chậm hơn mốc trước quá 0,3 ms (trừ khi bước đó ghi ngân sách riêng).
- Mỗi bước có ảnh chụp trình duyệt thật ở 1417 × 744 (DPR 2) và 1920 × 1080, gửi chủ dự án.
- Code mới đọc vị trí sự kiện qua `eventPoint(event)` và `x, z` của sự kiện, không đọc chỉ số ô.

### Bước 0 — Nền an toàn, test ranh giới, tài liệu V5

- **Mục tiêu:** sửa phần an toàn còn thiếu sau đợt 1, khóa ranh giới import, gửi yêu cầu art đợt A và B để chủ dự án vẽ song song.
- **Giữ nguyên:** `runFrameLoop`, `handleEach`, `pausesOnFrameError`, `resetCanvas2D`.
- **Làm:**
  - Thiếu GLB: `try` riêng từng model, `Promise.allSettled`, sprite vẽ tay cho Lõi, cổng, rồng, boss, quái. `.catch` cho mọi đường `chooseMap`, `startRun`, `prepareMap` còn thiếu.
  - Resize bằng `ResizeObserver`, gộp theo rAF.
  - `src/platform/typing/keyboard-intent.ts`: Backspace không bao giờ bán (sửa `main.ts:1607`); Delete mở xác nhận; bỏ phím có Ctrl/Cmd/Alt, phím lặp, phím ghép IME; Enter lặp không bỏ pha xây; banner IME tối đa 1 lần/10 s. Bỏ phím chữ q/e/w/s/a/d, U, R, C.
  - Nút HUD không giữ focus (`preventDefault` ở `pointerdown`, bỏ focus ở `keydown`).
  - Dừng khi mất focus hoặc ẩn tab, `AudioContext.suspend`.
  - Dispose đầy đủ khi đổi bản đồ: ô, ánh cổng, props, đống đá, vòng và hào quang trụ, material clone, lớp crowd, `bossTemplates` (giữ tối đa 2). Cache template GLB.
  - `src/platform/fx/sequencer.ts` thay `setTimeout` trong `spit()` và `bossDown()`. `clearRun()` xóa Sequencer.
  - `tests/defense-boundary.test.ts` với `LEGACY_IMPORTS` (38 mục ở HEAD), `LEGACY_ASSET_STRINGS` (2), `LEGACY_TEST_IMPORTS` (3).
  - `.gitignore`: `public/assets/defense/**` trừ manifest và README.
  - Viết `docs/RIFT_DEFENSE_PLAN_V5_2026-10-21.md` (từ bản này) và `docs/art-requests/RIFT_DEFENSE_V5_ART_2026-10-21.md` (đợt A, B). Đánh dấu tài liệu V4 và prompt bản đồ cũ là đã thay.
- **File:** `src/defense/main.ts`, `src/defense/view/{terrain,towers,crowd}.ts`, `src/platform/typing/keyboard-intent.ts`, `src/platform/fx/sequencer.ts`, `tests/defense-boundary.test.ts`, `tests/defense-keyboard.test.ts`, `tests/defense-sequencer.test.ts`, `scripts/visual/scenarios/defense.mjs`, `.gitignore`, 2 tài liệu.
- **Kiểm tra để xong:**
  - Vitest: keyboard-intent, Sequencer bị xóa khi `clearRun`, test ranh giới xanh.
  - Playwright: chặn GLB Lõi thì game vẫn chạy (ảnh chụp sprite thay thế); đổi cỡ cửa sổ thì canvas đúng cỡ; đổi bản đồ 5 lần thì `renderer.info.memory` về mức ban đầu ±2.
  - Gõ thật với Telex: Backspace không bán trụ.
  - Hiệu năng ≤ mốc V4 + 0,1 ms.

### Bước 1 — Camera chuột, nhãn ghim mép, Theo dõi nguy hiểm

- **Mục tiêu:** camera theo mục 3. Không bao giờ mất chữ cần gõ.
- **Làm:** `camera-rig.ts` thuần (neo zoom, kéo trên mặt phẳng, chuẩn hóa lăn chuột, trackpad, giới hạn ±44 m, ±46 m khi < 25°, 26 m khi < 20°). `camera.ts` gắn chuột, phím mũi tên, Shift, F1–F3, Tab trong đợt. Nút Camera với 3 góc, Dọc đường lệch 7 m. `ui/labels.ts`: nhãn đặt theo độ cao thật (tạm thời đất phẳng, giao diện `heightAtAny` sẵn), ghim mép, màu khẩn cấp, Theo dõi nguy hiểm. Rung không cấp phát. Nháy đúp có cờ tắt khi cầm trụ (dùng ở bước 7).
- **File:** `src/defense/view/camera-rig.ts`, `src/defense/view/camera.ts`, `src/defense/ui/labels.ts`, `src/defense/main.ts`, `defense.html`, `src/defense/defense.css`, `tests/defense-camera.test.ts`, `tests/defense-labels.test.ts`, `scripts/visual/scenarios/defense-camera.mjs`.
- **Kiểm tra để xong:**
  - Vitest: neo ≤ 1 px ở mọi khung lướt (200 ca); kéo ≤ 1 px khi ≥ 20°; không NaN gần chân trời; `deltaMode` 0/1/2; phím.
  - Playwright 3 cỡ cửa sổ: kéo trái, kéo phải, lăn chuột vào khúc cua (≤ 2 px); ảnh góc Dọc đường thấy đường giữa màn hình; zoom 22 m vào cổng ở đợt 3 thì 8/8 nhãn thấy hoặc ghim; để yên 4 s thì camera khung đủ nhãn.
  - Camera + nhãn ≤ 0,3 ms mỗi khung với 400 quái.
  - Ảnh chụp gửi chủ dự án.

### Bước 2 — HUD gọn, cỡ trên màn hình, vật mờ khi che

- **Mục tiêu:** HUD theo mục 4, vật che theo mục 3.7.
- **Làm:** `--ui`; bảng đợt, dải tài nguyên (thêm ô Điểm, ô "Trụ n/16" để sẵn), thanh kỹ năng, thanh xây một hàng; tooltip; thẻ chi tiết bật cạnh trụ; banner ≤ 50 % rộng; thông báo màn hẹp < 640 px. `LEVEL_SCALE` 1/1,06/1,12/1,2. Rồng đậu trên Lõi, kẹp ≤ 14 %. `view/occlusion.ts`: dither cho trụ, Lõi, rồng (trụ tầm nhìn, đoạn tới quái mang nhãn, < 8 m, chiều cao chiếu > 35 %). Tách `app/hud.ts`, `app/build-ui.ts` khỏi `main.ts`.
- **File:** `defense.html`, `src/defense/defense.css`, `src/defense/app/hud.ts`, `src/defense/app/build-ui.ts`, `src/defense/main.ts`, `src/defense/view/towers.ts`, `src/defense/view/occlusion.ts`, `tests/defense-occlusion.test.ts`, `scripts/visual/scenarios/defense-hud-layout.mjs`.
- **Kiểm tra để xong:**
  - `defense-hud-layout.mjs` ở 8 cỡ cửa sổ: các luật ở mục 4.2 và 21.2.
  - Ảnh zoom 22 m: giữa màn hình và 15 % dưới cùng. Góc Dọc đường: Lõi mờ, đường lộ giữa màn hình.
  - Vitest: luật mờ, `--ui`.
  - Ảnh chụp gửi chủ dự án.

### Bước 3 — VFX nền: flipbook, shader, đạo diễn VFX

- **Mục tiêu:** VFX theo mục 5.2, 5.3, 5.6. Chủ dự án thấy khác biệt ngay.
- **Làm:**
  - `scripts/defense-art/prepare-vfx.mjs`: đóng gói 13 chuỗi có sẵn và ảnh `art-src/defense/vfx/*` thành atlas trong `public/assets/defense/vfx/` + manifest. Thiếu thì dùng ảnh tĩnh cũ.
  - Shader flipbook, hòa tan theo nhiễu, hạt mềm theo texture độ cao, vệt kéo (một lô), sóng méo hình (pass riêng chỉ ở High, tắt khi không có nguồn; SpaceStage thêm móc tùy chọn, Campaign 3D không đổi).
  - Pool 2 đèn chớp. Quái đang chết (`aDeath`, trần 64). Kẹp cỡ chỉ lớp trang trí. Overdraw ≤ 1,5 màn hình. Chuỗi nổ nhỏ dần.
  - `view/fx/director.ts`, `recipes.ts`, `emitters.ts` (viết lại `vfx.ts`), `event-point.ts`.
  - Bỏ `new THREE.Color` và `splice` mỗi khung, tải buffer bằng `addUpdateRange`, `compileAsync` sau khi nạp bản đồ.
- **File:** `src/defense/view/fx/{director,recipes,emitters,event-point,flipbook,shaders}.ts`, `src/defense/view/vfx.ts`, `src/defense/view/crowd.ts`, `src/scene3d/space.ts` (móc tùy chọn), `scripts/defense-art/prepare-vfx.mjs`, `tests/defense-fx-director.test.ts`, `scripts/visual/scenarios/defense-juice.mjs`.
- **Kiểm tra để xong:**
  - Vitest: mọi loại sự kiện có công thức; trần; vòng luật chơi không kẹp; tính khung flipbook; không `setTimeout`.
  - `defense-juice.mjs`: ảnh **trước (V4) và sau** ở 0/80/300/600/1.000 ms cho diệt quái, bom chuỗi, xây, bán, Lõi trúng, boss chết. **Chủ dự án xem và duyệt trước khi coi là xong.**
  - Cảnh bão 400 quái + chuỗi 12 mắt: VFX ≤ 20 draw call, CPU VFX p95 ≤ 1,2 ms.
  - Ảnh Campaign 3D không đổi.

### Bước 4 — Loot và Điểm trận (dùng lại Credit Crystal)

- **Mục tiêu:** loot theo mục 5.4, điểm theo mục 5.5.
- **Làm:**
  - Chuyển phần trình diễn sang `src/platform/loot/pickup-sim.ts`, `draw-list.ts`, `src/platform/audio/pickup-ladder.ts`, `src/platform/types.ts` (VisualQuality). Shim ở `src/vfx/credit-crystal-*.ts` và `src/audio/credit-sound.ts`. Bậc đồng là tham số.
  - `src/defense/view/fx/loot.ts`: cấu hình Defense (nảy trên đất, đích ô Năng lượng), bộ vẽ WebGL 2 lô, atlas đồng + số dựng lúc nạp, pool 24 nút DOM cho 110 ms cuối.
  - Engine: sự kiện `kill` mang phần thưởng đủ; `stats.score` số nguyên; lưu điểm cao.
  - HUD: số hiện = max(0, …), tua nhanh khi chi hoặc rê nút xây.
- **File:** `src/platform/loot/*`, `src/platform/audio/pickup-ladder.ts`, `src/platform/types.ts`, `src/vfx/credit-crystal-pickups.ts`, `src/vfx/credit-crystal-fx.ts`, `src/audio/credit-sound.ts`, `src/defense/view/fx/loot.ts`, `src/defense/rules/{engine,data}.ts`, `src/defense/app/hud.ts`, `tests/defense-loot.test.ts`, `tests/defense-rules.test.ts`, `scripts/visual/scenarios/defense-juice.mjs`.
- **Kiểm tra để xong:**
  - `tests/credit-*.test.ts` xanh, không sửa. Ảnh nhặt credit của Campaign không đổi.
  - Vitest loot (mục 21.1) và điểm tất định.
  - Ảnh khung: đồng bung, nảy, bay về ô Năng lượng; số không âm.
  - Loot CPU ≤ 0,08 ms cho 200 đồng, ≤ 2 draw call.

**Điểm duyệt của chủ dự án:** sau bước 4, chủ dự án chơi thử camera, HUD, VFX, loot. Góp ý sửa trước khi sang bước 5.

### Bước 5 — Engine tất định và id trụ (không đổi hành vi)

- **Mục tiêu:** mục 17 và mục 8.5, giữ đúng hành vi V4.
- **Làm:**
  - 5a. Số học an toàn: đổi `Math.hypot` → `Math.sqrt`, xoắn ốc bản đồ 8 thành bảng số, hướng cụm bom thành bảng hằng, `atan2` sang view. PRNG mulberry32 có seed; bản chạy thật truyền seed. Ghi lại golden có chủ đích trên 5a.
  - 5b. Id trụ: `Tower { id, x, z, r, y, high, power }`; 22 loại sự kiện đổi `pad` → `tower`; xây, bán, sửa, hồi sinh, gục mang `x, z`; `bombBy`, `actPad`, `PendingHit` theo id; ô cũ thành `hints`; `build(x, z, type)` với luật tạm nới. `towerViews`, `bars`, `jammedBefore` thành `Map` theo id, dispose khi bán. Ghim luật hòa `nearestTower` (id nhỏ thắng). Xóa `sanctumTimer`. `eventPoint` đọc `x, z` mới.
  - Dev handle chỉ bật khi DEV hoặc `?dev=1`: `build(x, z, …)`, `buildHint`, `canPlace`, `towers()`.
  - Bản lưu: seed, phiên bản và mã băm vùng đất.
- **File:** `src/defense/rules/{engine,fit,maps,path,rng}.ts`, `src/defense/main.ts`, `src/defense/view/towers.ts`, `src/defense/view/fx/event-point.ts`, `src/defense/app/dev-handle.ts`, `tests/defense-golden.test.ts`, `tests/defense-rules.test.ts`, `tests/defense-determinism.test.ts`, `scripts/visual/determinism.mjs`, `scripts/visual/scenarios/{defense,defense-perf}.mjs`.
- **Kiểm tra để xong:**
  - Golden 5b trùng 5a theo phép chiếu chuẩn (xây theo thứ tự ô tăng dần).
  - 21 test cũ xanh qua `buildHint`. Id không dùng lại: bán rồi xây lại không nhận đòn hay dấu bom cũ.
  - Golden trùng trên Node, Chromium, WebKit, Firefox.
  - Test ranh giới cấm hàm toán trong `rules/`.
  - Engine ≤ 0,5 ms với 640 quái + 16 trụ.
  - Ảnh `defense.mjs` giống trước bước.

### Bước 6 — Luật đặt tự do, không cộng dồn, trần, luật tiền kín

- **Mục tiêu:** mục 8, 9 (bản tạm), 10.5, 12, 16.
- **Làm:**
  - `rules/land.ts` bản 1: lưới 0,5 m phẳng (milimét nguyên) với cờ vùng dựng từ đặc tính ô cũ quanh `hints`, mặt nạ đường, Lõi, cổng. Vật cản có id quanh ô đá cũ.
  - `rules/place.ts`: `canPlace` theo bảng 8.2, quét đĩa, trần chung 16 và trần loại, Lõi 11 m.
  - Engine: Thu Năng trả theo trụ mạnh nhất; đồng hồ hồi Lõi chung; Mồi Nổ chờ chung 2,5 s và cách 4 m; tăng tốc ≤ +35 %; dời, hoàn tác, vật cản mọc lại, thạch anh đầu đợt; quái đánh trụ tính tới mép vòng, luật chọn mục tiêu, cận chiến không cắt vùng cấm. Pha xây 30 s.
  - Bot: Cân bằng, Tham, Vòng Thu Năng, Chồng Đền, Chồng Mồi Nổ, Ôm Lõi vs Trải, Ôm đường. Chỉ số dồn trụ.
  - Golden cập nhật có chủ đích, ghi rõ lý do trong commit.
- **File:** `src/defense/rules/{land,place,data,engine,maps,fit}.ts`, `tests/defense-place.test.ts`, `tests/defense-economy.test.ts`, `tests/defense-support.test.ts`, `tests/defense-balance.test.ts`, `tests/defense-rules.test.ts`.
- **Kiểm tra để xong:**
  - Mọi test ở mục 21.1 cho đặt trụ, kinh tế, hỗ trợ, bot.
  - Bot lạm dụng ≤ +15 % năng lượng, không lật kết quả "40 wpm thua bản đồ 8". Bot Tham không hơn bot Cân bằng.
  - Test thuộc tính hoàn tác: 200 chuỗi đều về đúng mã băm.
  - 4 kết quả cân bằng cũ vẫn đạt.
  - Ảnh chụp: đặt một trụ ở chỗ tự do qua dev handle.

### Bước 7 — UI đặt trụ và trụ instanced

- **Mục tiêu:** mục 11 và phần trụ ở mục 20.
- **Làm:** `view/placement.ts` (ray-march chọn đất, trụ mờ, vòng xanh/đỏ, chip lý do, vòng tầm, đoạn đường được phủ, vật cản sắp phá, sao hợp, vòng trụ khác trong 14 m). Bàn phím: 1–6 ở chỗ gợi ý tốt nhất, Tab đổi gợi ý, mũi tên nhích, Enter không bắt đầu đợt khi cầm trụ, Enter hai bước khi vừa đặt < 1 s. Tắt nháy đúp khi cầm trụ. Thẻ chi tiết: Nâng cấp, Sửa, Dời, Bán hai bước. Rê chuột hiện vòng đỏ. "Trụ n/16" và "2/3" trên nút. Cảm ứng máy tính bảng. **Trụ vẽ instanced**, hoạt ảnh bằng shader, ≤ 4 bản clone. Thanh máu chỉ trụ bị thương, gần trước, ≤ 15. Bỏ mọi chữ "Pad", "Choose a pad", nút dọn đống đá.
- **File:** `src/defense/view/placement.ts`, `src/defense/view/towers.ts`, `src/defense/app/{build-ui,input}.ts`, `src/defense/main.ts`, `defense.html`, `src/defense/defense.css`, `tests/defense-placement-ui.test.ts`, `scripts/visual/scenarios/defense.mjs`.
- **Kiểm tra để xong:**
  - `defense.mjs` chụp: trụ mờ hợp lệ, trụ mờ trên đường (đỏ, "Trên đường"), vòng đỏ khi rê, thẻ chi tiết, dời trụ, bán hai bước, "Trụ 16/16".
  - Vitest: ray-march chọn đất; lý do → chuỗi tiếng Việt; luật Enter, Tab.
  - Hiệu năng ở 16 trụ có vòng rê và 2 trụ cháy: trụ ≤ 20 draw call. 40 trụ: draw call tăng ≤ 2.
  - Gõ thật với Telex: không phím nào bán trụ hay bắt đầu đợt nhầm.

### Bước 8 — Bộ phong cách và sân khấu Defense (bỏ không gian)

- **Mục tiêu:** mục 7, mục 15.1, phần đầu mục 15.2–15.4.
- **Làm:** `styles/*` và `resolveMapLook`. `view/battle-stage.ts` riêng của Defense (renderer, composer RenderPass → bloom → GradedOutputPass có gộp méo hình, ResizeObserver, dispose). Shading toon, mực fresnel, hull (đọc `_OUTLINE_NORMAL`, chỉ trụ chọn/rê và boss). `atmosphere.ts` giai đoạn 1: trời gradient, đĩa mặt trời/trăng, sương theo khoảng cách camera, sương thấp tính bằng công thức, bộ đèn theo vùng, PMREM ban ngày, near 0,3 far 1.500. `MapSpec.skyStage` → `land`, thêm `look`. Bench dùng sân khấu mới. Blender: thêm bước nướng `_OUTLINE_NORMAL`.
- **File:** `src/defense/styles/{types,biomes,resolve}.ts`, `src/defense/styles/packs/{storybook,neon-rift}.ts`, `src/defense/view/battle-stage.ts`, `src/defense/view/shading/{toon,ink,outline}.ts`, `src/defense/view/{atmosphere,lands}.ts`, `src/defense/rules/maps.ts`, `src/bench/defense-bench.ts`, `scripts/models/blender/space_typing_model_tools.py`, `tests/defense-styles.test.ts`.
- **Kiểm tra để xong:**
  - Vitest: `MapLook` hợp lệ; đổi phong cách không đổi chuỗi sự kiện.
  - Playwright: 8 bản đồ ở 57° và 15° với trời gradient.
  - Hiệu năng chênh ≤ 0,2 ms. Ảnh Campaign 3D không đổi.

### Bước 9 — Vùng đất: độ cao nguyên, 8 bản đồ, đường từ dữ liệu, ảnh khung

- **Mục tiêu:** mục 9, 10.3, 14, phần địa hình của mục 3.7.
- **Làm:**
  - `rules/land.ts` bản 2: nhiễu hash nguyên, khối đồi/thềm/vách/kênh/hồ/cồn/hố/bậc, khắc đường (dốc dọc ≤ 6 %), lưới 225 × 225 milimét nguyên + cờ vùng, vật cản Poisson theo luật rải quanh đường, bảng `roadY` mỗi 0,25 m, bảng độ cao đường bay, cache theo băm.
  - 8 bản đồ viết lại theo mục 14 (giữ id, giữ đường), có `skyLanes`, `waterSpawns`, `landmarks`, vùng đặc thù có `counter`, đoạn 15 m cuối.
  - View: lưới gần (High 0,5 m, Medium 1 m), **dải đường vẽ từ dữ liệu với texture đường**, mép nước, mép vách, màu vùng từ dữ liệu; triplanar trên vách > 35°; vành cực tới 800 m; nước/dung nham/băng bằng shader. Bỏ `underGeometry`, mép đảo, pha lê treo, `ISLAND_RADIUS`.
  - Crowd đọc độ cao theo `roadY`. Camera dùng `heightAtAny` thật (cả vành), hạ vành che tầm nhìn. Nhãn theo độ cao thật.
  - Chạy bot, đóng băng mã băm bố cục, rồi mới xuất ảnh khung. **Bản đồ 1 xuất trước** để chủ dự án vẽ.
- **File:** `src/defense/rules/land.ts`, `src/defense/rules/maps/*.ts`, `src/defense/view/{ground,water,distant,painter,terrain,crowd,occlusion}.ts`, `src/defense/view/camera-rig.ts`, `scripts/visual/scenarios/defense-land-guides.mjs`, `public/assets/defense/maps/art-manifest.json`, `tests/defense-land.test.ts`.
- **Kiểm tra để xong:**
  - Vitest `defense-land.test.ts` (mục 21.1). Mã băm vùng đất trùng trên 4 môi trường.
  - Bot và chỉ số dồn trụ trên 8 bản đồ.
  - 16 ảnh khung và mã băm trong art manifest.
  - `defense-lands.mjs` chụp 57°/35°/15°/85° mỗi bản đồ. Đường lộ ≥ 90 %.

### Bước 10 — Props, mốc cảnh, phá môi trường, pipeline model, KTX2

- **Mục tiêu:** mục 10, 19.7, phần texture mục 20.
- **Làm:** preset `defense-models.json`, cờ `--preset`, kind mới (props từ 50 tam giác, pickups ≤ 300, landmarks, structures, towers, creatures, bosses). Model-library nhận URL manifest. Blender: LOD1, atlas mỗi vùng, pháp tuyến mịn. `prepare-textures.mjs` (KTX2, phóng to). `scatter.ts` (instanced mỗi loại mỗi LOD, lưới băm 4 m, phá bằng đổi chỗ, cập nhật đoạn buffer, gió trong shader, dither theo luật vật che). Phủ đất đọc mặt nạ. Bản đồ hư hại. Diễn biến phá 0–0,55 s. Mốc cảnh. Thiếu GLB thì bỏ qua loại đó.
- **File:** `src/defense/view/{scatter,landmarks,damage-map}.ts`, `src/defense/assets/{model-contracts,catalog}.ts`, `src/render3d/model-loader.ts`, `scripts/models/presets/defense-models.json`, `scripts/models/prepare-campaign3d-models.mjs`, `scripts/models/blender/space_typing_model_tools.py`, `scripts/defense-art/prepare-textures.mjs`, `public/assets/defense/models/manifest.json`, `tests/defense-model-contracts.test.ts`, `tests/defense-scatter.test.ts`.
- **Kiểm tra để xong:**
  - Vitest: phá đúng id trong luật và đúng instance trong view; vật cản mọc lại đúng luật; khôi phục ván dở tái tạo vết; hợp đồng model.
  - `defense-perf.mjs` có cờ props: môi trường ≤ 32 draw call; khung đặt trụ ≤ 10 ms; sổ texture ≤ ngân sách.
  - `defense-lands.mjs`: đường lộ ≥ 90 % ở 3 góc mỗi bản đồ.
  - Ảnh trước và sau khi phá.

### Bước 11 — Trời vẽ tay, thời tiết, bóng, âm nền

- **Mục tiêu:** phần còn lại của mục 15.
- **Làm:** dải trời hình trụ (KTX2), lật gương khi thiếu nửa sau, `skyYawDeg`, màu sương theo hướng, cột Rift, nhiễm Rift. `defense-skies:prepare`. `weather.ts` (hạt GPU theo lớp, lịch theo đợt, mật độ × 0,5 khi < 25° hoặc Dọc đường, tổng ≤ 5.000). Bóng tĩnh High, bóng mờ quái theo nắng, bóng mây. Âm nền hai lớp.
- **File:** `src/defense/view/{atmosphere,sky,weather,lands,sounds}.ts`, `scripts/defense-skies-prepare.mjs`, `package.json`, `tests/defense-lands.test.ts`, `scripts/visual/scenarios/defense-lands.mjs`.
- **Kiểm tra để xong:**
  - Vitest: `far` < 800 m; hạt ≤ ngân sách mọi lúc; sét cách ≥ 6 s.
  - `defense-lands.mjs` 7 ảnh mỗi bản đồ, ΔL* ≥ 25.
  - `defense-perf` ở bão đỉnh, 3 góc: High ≤ 5,5 / 8,5 ms.

### Bước 12 — Bộ quái: dữ liệu, quái bay, kỹ năng thường

- **Mục tiêu:** mục 13.1–13.4 (phần quái thường).
- **Làm:** `CreatureId` + vai trò thay `EnemyType`. Đường bay với bảng độ cao, rơi khi đóng băng, kéo xuống, nổ 3D. **8 nhãn theo ETA.** Kỹ năng quái thường. Alicanto trả đúng số đã cướp. Dàn quái mỗi bản đồ (≤ 8 loại, ≤ 3 loại đánh trụ). Chép prompt quái vào tài liệu art.
- **File:** `src/defense/rules/{creatures,data,engine,path}.ts`, `src/defense/rules/maps/*.ts`, `tests/defense-creatures.test.ts`, `tests/defense-rules.test.ts`, `docs/art-requests/RIFT_DEFENSE_V5_ART_2026-10-21.md`.
- **Kiểm tra để xong:** mỗi kỹ năng một ca; luật bay; Alicanto không bao giờ lời; bot chạy lại 8 bản đồ; ảnh chụp với model tạm.

### Bước 13 — Boss mới

- **Mục tiêu:** phần boss mục 13.4.
- **Làm:** Mộc Tinh, Đại Bàng Tinh, Hydra, Hồ Tinh, bộ kỹ năng mở theo bản đồ.
- **File:** `src/defense/rules/{creatures,engine,data}.ts`, `tests/defense-creatures.test.ts`.
- **Kiểm tra để xong:** mỗi kỹ năng boss một ca; Hydra ≤ 10 lớp; cáo ảo lọt không mất mạng; Mê Hoặc không ảnh hưởng Đền, Thu Năng; bản đồ 1 Hồ Tinh không có Mê Hoặc; bot 40/60 wpm đạt.

### Bước 14 — Hình bộ quái

- **Mục tiêu:** mục 13.5, 13.6 và VFX riêng từng con.
- **Làm:** chuyển động shader theo `move`, hướng mặt theo dáng, nhánh sprite Ma Trơi, độ cao bay và bóng chấm, x-ray cho quái mang nhãn. Boss view có AnimationMixer, prewarm. VFX và âm từng con. Blender: kind `defense-enemies`, các hàm clip mới; `bake_vat.py` sau model đầu tiên. Bỏ import `enemies/families`, `familyStyle`.
- **File:** `src/defense/view/{crowd,bosses,occlusion,sounds}.ts`, `src/defense/view/fx/recipes.ts`, `src/defense/legacy/st-content.ts`, `scripts/models/blender/{space_typing_model_tools,bake_vat}.py`, `scripts/visual/scenarios/defense-creatures.mjs`.
- **Kiểm tra để xong:** ảnh từng con ở 57° và 15°; đợt nặng nhất: quái ≤ 12 draw call + x-ray ≤ 8, ≤ 280k tam giác, skinned ≤ 14; hợp đồng model creatures.

### Bước 15 — Cân bằng cuối, cổng hiệu năng, bộ ảnh cuối

- **Mục tiêu:** chốt V5.
- **Làm:** chạy toàn bộ bot và chỉ số dồn trụ trên 8 bản đồ với bộ quái mới; chỉnh `towerCap`, bố cục nếu có cờ đỏ (bố cục đổi thì xuất lại ảnh khung và báo chủ dự án). Bench engine và job `defense-perf` hằng đêm (p50/p95). Cập nhật tài liệu V5.
- **File:** `tests/defense-balance.test.ts`, `bench/defense-engine.bench.ts`, `scripts/visual/scenarios/*.mjs`, `.github/workflows`, `docs/RIFT_DEFENSE_PLAN_V5_2026-10-21.md`.
- **Kiểm tra để xong:** mọi bảng ở mục 16 và 20 đạt trên 8 bản đồ, 3 góc, High và Medium; bộ ảnh `defense`, `defense-lands`, `defense-juice`, `defense-hud-layout`, `defense-camera` đầy đủ; chơi thử thật với Telex, trackpad, máy tính bảng.

### Bước 16 — Tách platform (cuối cùng)

- **Mục tiêu:** mục 6.6, bước 16.
- **Làm:** repo cha nhận cả hai `gameId` trước (portal, `shared/learning`, `src/learning/shared.ts`), test vòng đi về; rồi submodule đổi learning bridge sang `"rift-defense"`. Chuyển module thuần còn lại sang platform có shim (keys, words, vocabulary, speech, motion, storage, settings, stage-core, audio-bus, music-player, model-library, fx-kit). Fork thẻ thưởng, HeroFx phần dùng, Hero thành rigged-actor. Icon, chân dung Defense. Xóa `st-content.ts` khi bộ quái có art. `main.ts` chỉ còn điểm ghép.
- **File:** `src/platform/**`, `src/defense/main.ts`, `src/defense/app/menu.ts`, `src/defense/ui/cards.ts`, `src/defense/view/hero-fx.ts`, `src/learning/shared.ts`, `tests/defense-boundary.test.ts`, và các file repo cha `portal/src/main.ts`, `shared/learning/*` (commit riêng ở repo cha, làm trước).
- **Kiểm tra để xong:** `LEGACY_*` rỗng; ảnh Campaign 3D và Space Typing không đổi; learning event Defense về portal đúng; toàn bộ test xanh.

---

## 23. Art chủ dự án làm trước (theo thứ tự)

Prompt đầy đủ sẽ nằm trong `docs/art-requests/RIFT_DEFENSE_V5_ART_2026-10-21.md` (viết ở bước 0). Dưới đây là đủ để bắt đầu ngay.

**Tiền tố VFX sách tranh (dán đầu prompt 1–5, 7):**
```
Single game VFX element for a bright hand-painted storybook fantasy tower-defense game: one single connected shape, chunky rounded forms, bold dark outline, 2–3 tone painted shading, the centre lighter than the edges, centred with 15% empty margin on every side, nothing else in the image, no text, no frame. Square image, the largest size available.
```

1. **`dust-burst`** (nền `Flat pure #00FF00 green background, perfectly uniform; the subject contains no green at all.`):
   `A puff of dust bursting outward from the ground: a ring of soft rounded cloud lumps, neutral warm grey (the game tints it), lighter in the middle, darker rims.`
2. **`wood-splinters`** (nền #00FF00):
   `A burst of broken wood splinters and bark chips flying outward from the centre, all pieces touching in one star-shaped cluster, warm brown bark and pale fresh wood.`
3. **`leaf-burst`** (nền `Flat pure #FF00FF magenta background, perfectly uniform; the subject contains no pink or magenta at all.`):
   `A burst of twelve chunky cartoon leaves flying outward from the centre, overlapping into one cluster, fresh green and yellow-green with darker veins.`
4. **`water-splash`** (nền #00FF00):
   `A cartoon water splash bursting up and out: a crown of chunky water drops around a short central column, every drop touching the crown, clear light blue with white highlights and dark blue outlines.`
5. **`explosion`** (nền #00FF00):
   `A chunky cartoon explosion: a big rounded fireball cloud made of overlapping puffs, white-yellow core, orange body, red-brown edges, a few small chunky sparks attached at the rim.`
6. **`ground-scar-01`** (không dùng tiền tố; đây là mặt nạ):
   `A game texture mask: a scorch mark with a small crater seen straight from above, a rough round burnt patch with cracked edges and a few short radial streaks. Pure white mark on a pure black background: white means burnt, black means untouched ground. No colour, no shading outside the mark, nothing else in the image. Square image, the largest size available.`
7. **`coin-energy`** (nền #00FF00):
   `A single thick chunky gold coin seen from the front, slightly tilted, a raised rim, an embossed leaf-and-flame emblem in the centre, soft painted metallic shading.`
8. **40 texture lát** (mục 19.5, tiền tố S cho vùng 1–6, N cho vùng 7–8). `<MATERIAL>` theo bảng:

| Vùng | Tấm và `<MATERIAL>` |
|---|---|
| meadow | grass-short: `short lush highland grass with small darker damp patches` · soil-wet: `damp dark-brown soil with tiny pebbles and grass roots` · granite-moss: `grey granite rock with cushions of bright moss in the cracks` · streambed-pebbles: `a stream bed of smooth grey and tan pebbles with wet sand between them` · path-dirt: `a pale packed-earth footpath with flat stepping stones pressed in` |
| coast | sand-golden: `dry golden beach sand with fine wind ripples` · sand-wet-dark: `wet dark golden sand with small shells pressed flat` · maquis-scrub: `grey-olive dry scrub ground of low dusty herbs, gravel and dry grass` · limestone: `pale cream limestone rock with smooth erosion pits and thin cracks` · flagstone-warm: `a road of warm grey worn flagstones with thin earth joints` |
| volcano | ash-cinder: `grey-brown volcanic ash and black cinder grit` · basalt-rock: `dark grey basalt rock with hexagonal joint lines` · lava-crust: `dark cooled ropy lava crust with a few thin dull-orange cracks` · sulfur-crust: `yellow sulfur crust over grey rock with small crystal grains` · path-basalt-slabs: `a road of dark basalt slabs with thin glowing ember seams in the joints` |
| tundra | black-ice: `dark clear river ice over black water with white crack lines and trapped bubbles` · snow-patchy: `patchy wind-packed snow over brown frozen ground` · tundra-moss-lichen: `brown-olive tundra moss with pale green and orange lichen spots` · granite-frost: `dark granite rock covered with white frost crystals` · path-packed-snow: `a road of trampled packed snow with pale gravel showing through` |
| canyon | sandstone-layers: `red-orange sandstone rock with horizontal layer bands` · sand-orange: `wind-swept orange desert sand with soft ripples` · clay-cracked: `cracked dry pale clay in polygon plates` · gypsum-crust: `white and pale violet gypsum crust with small crystal glints` · path-packed-sand: `a road of pale cream packed sand with small embedded stones` |
| jungle | leaf-litter: `brown-red fallen tropical leaves and twigs on damp earth` · laterite-mud: `damp red laterite earth with small puddle marks` · limestone-moss: `grey limestone rock with thick green moss and fine roots` · river-pebbles: `a river bed of round brown and grey pebbles` · path-laterite-stones: `a road of red earth with old sunken flat stones` |
| swamp (N) | black-mud: `black wet peat mud with a dull sheen` · peat-roots: `dark peat with tangled exposed roots` · swamp-bed: `a shallow swamp bed of dark silt and rotten leaves` · dry-reed-mat: `flattened dry reed mats on grey-green mud` · path-causeway: `a raised causeway road of light packed earth with old plank edging` |
| crater (N) | gravel-ochre: `pale ochre desert gravel` · salt-crust: `white salt flat crust with hexagonal ridges` · regolith-dark: `dark iron-rich crushed rock and dust` · tuff-pale: `pale volcanic tuff rock with small pores` · path-stone-slabs: `a road of pale stone slabs with sand in the joints` |

9. **Ảnh nền bản đồ 1** (mục 19.4 + dòng 1), khi AI gửi ảnh khung đã đóng băng.
10. **6 props chung** (mục 19.7: tiền tố S + phần chung + mô tả + dòng nền):
    - `boulder-round` (#00FF00): `A large rounded granite boulder, weathered grey stone with fine cracks and pale grey lichen spots, wider than tall.`
    - `boulder-slab` (#00FF00): `A broken flat slab boulder of grey stone, tilted, sharp fractured edges, layered strata lines.`
    - `pebble-cluster` (#00FF00): `A small cluster of five smooth river stones of different sizes fused together at their bases, grey and tan.`
    - `dead-tree` (#00FF00): `A tall leafless dead tree with a thick twisted trunk and five thick crooked branches reaching up, bare silver-grey weathered wood, no thin twigs.`
    - `fallen-log` (#00FF00): `A thick fallen tree log lying on its side, broken jagged ends, rough bark, a few thick root stubs at one end.`
    - `grass-tuft` (#FF00FF): `A dense tuft of tall wild grass, blades grouped into a few thick clumps fanning out from one base, soft yellow-green.`
11. **8 cây đặc trưng** (tiền tố S cho 1–6, N cho 7–8):
    - meadow `oak-tree` (#FF00FF): `A broad old oak tree, thick gnarled trunk splitting into three heavy limbs, a wide rounded crown made of six big solid clumps of fresh spring-green leaves.`
    - coast `olive-tree` (#FF00FF): `An ancient olive tree with a thick twisted hollow trunk and a wide silvery grey-green crown of five solid leaf clumps.`
    - volcano `charred-tree` (#00FF00): `A burnt dead tree, charred black trunk and broken stubby branches, ember-orange glowing cracks in the bark, no leaves.`
    - tundra `snow-fir` (#FF00FF): `A tall snow-laden fir tree, layered dark-green branches bent down under thick white snow, short brown trunk.`
    - canyon `desert-juniper` (#FF00FF): `A gnarled desert juniper tree, twisted silver-grey trunk, a few dense dark blue-green foliage clumps.`
    - jungle `banyan-giant` (#FF00FF): `A giant banyan tree, a massive trunk made of many fused aerial roots, thick root pillars reaching the ground around it, a broad dark-green crown of big solid leaf clumps.`
    - swamp `melaleuca-tree` (#FF00FF): `A slender melaleuca cajuput swamp tree, pale papery peeling bark in layers, a narrow crown of dull grey-green solid leaf clumps.`
    - crater `cardon-cactus` (#FF00FF): `A tall Andean cardon cactus with a thick ribbed trunk and four upright arms, pale spines.`
12. **5 mốc cảnh bản đồ 1** (#00FF00, trừ thác dùng #FF00FF vì có rêu):
    - `waterfall-cliff`: `A tall grey granite cliff block with a silver waterfall pouring down its front as one solid painted ribbon of water, moss on the ledges, flat base.`
    - `wooden-bridge`: `A short wooden footbridge with a gentle arch, thick plank deck and simple railings, two stone footings at the ends.`
    - `red-arch-bridge`: `A small red lacquered arched footbridge, tall round arch, red railings with dark caps, stone footings.`
    - `windmill`: `A stone windmill on a round tower base with four big wooden sail frames and a cone roof.`
    - `lookout-pavilion`: `A small open wooden lookout pavilion on a stone platform, four thick posts, a curved tiled roof.`
13. **Lõi và cổng Rift** (#00FF00):
    - `core`: `The defenders' Core: a round three-step stone platform carrying a large faceted warm-gold crystal heart, held by four carved stone arms that curl up around it, simple runes carved on the steps, chunky and sturdy.`
    - `rift-gate`: `A rift gate: two cracked ancient stone pillars leaning apart, joined at the top by a broken lintel, and between them a jagged vertical tear in the air painted as a solid violet-and-white crack attached to both pillars.`

Sau đó: đợt C và D theo mục 19.1.

---

## 24. Câu hỏi còn mở (có mặc định)

1. Cỏ, hoa, sậy phủ đất (2.000–4.000 bụi mỗi bản đồ): thẻ 2D từ ảnh anh vẽ, hay model 3D? **Mặc định:** thẻ 2D từ ảnh anh vẽ; cây, đá, props vừa và lớn là model 3D.
2. Trần 16 trụ mỗi bản đồ, Thu Năng 3, Đền 2, Mồi Nổ 3 có ổn không? **Mặc định:** dùng các số này; bước 15 có thể chỉnh theo bot.
3. Cảm ứng V5 = máy tính bảng có bàn phím rời, điện thoại để bản sau. **Mặc định:** như vậy.
4. Rồng Draconis vẫn là nhân vật của Rift Defense khi tách game? **Mặc định:** giữ, chép model sang kho Defense ở bước 16.

---

## 25. Đối chiếu phản biện

| # | Mức | Vấn đề | Sửa ở |
|---|---|---|---|
| 0 | Nghiêm trọng | Hỗ trợ cùng loại cộng dồn khi bỏ ô | 8.2 (trần), 8.4, 16.1 (bot lạm dụng) |
| 1 | Nghiêm trọng | VFX một khung, chỉ phóng to rồi mờ; SVG gradient | Mục đầu, 5.1, 5.3, 19.1 (VFX đầu đợt A), 23, bước 3 (duyệt trước/sau) |
| 2 | Nghiêm trọng | Nhãn mất khỏi màn hình | 3.6, 21.2, bước 1 |
| 3 | Cao | Ôm Lõi áp đảo, luật dồn trụ không báo | 8.2 (Lõi 11 m), 8.3 (15 m cuối), 16.1, 16.2 |
| 4 | Cao | Vòng lặp tiền từ hoàn tác và dời | 10.5, 14.5, 21.1 |
| 5 | Cao | Model đồng 28k tam giác | 5.4, 6.4 (pickups ≤ 300) |
| 6 | Cao | Làm lại loot từ đầu | 5.4, 6.6, bước 4 |
| 7 | Cao | Không chỉnh camera bằng phím trong đợt | 3.2, 11.3 |
| 8 | Cao | Cảm ứng không gõ được | 3.8 |
| 9 | Cao | Test HUD mâu thuẫn ở 390 × 844 | 4.2 (bỏ điện thoại, banner) |
| 10 | Cao | Vật che ở góc thấp | 3.3, 3.7, 10.1 (luật rải), 14.5, 14.6, 21.2 |
| 11 | Cao | Trụ không giới hạn phá ngân sách draw call | 8.2, 20 (instanced), bước 7 |
| 12 | Cao | Ngân sách texture và tải không khớp | 20 (KTX2, bảng MB, phóng to) |
| 13 | Cao | Tất định giữa trình duyệt | 17, 6.5, bước 5 |
| 14 | Trung bình | Dải san phẳng chồng đường và trụ khác | 10.3 |
| 15 | Trung bình | Lỗ Phun Nhiệt bản đồ 3 không có cách chữa | 14.3, 9 (`counter`) |
| 16 | Trung bình | Chim Vàng trả gấp đôi | 13.4 |
| 17 | Trung bình | Toán camera trôi neo, kéo gần chân trời, lăn chuột | 3.5 |
| 18 | Trung bình | Cỡ đo ở giữa màn hình | 3.3 (26 m), 3.4 (lệch 7 m), 3.7, 4.4 |
| 19 | Trung bình | Kẹp mọi VFX làm sai vùng luật chơi | 5.3 |
| 20 | Trung bình | Overdraw góc thấp, canvas 2D | 5.4, 15.3, 15.5, 20 |
| 21 | Trung bình | Thứ tự và yêu cầu art | 19.1, 19.9, 7.2 (pháp tuyến mịn), 23 |
| 22 | Trung bình | Ảnh nền lệch bố cục | 14 (luật chung), 19.2, 19.4 |
| 23 | Trung bình | Test ranh giới và bước 0 lệch HEAD | Mục đầu, 6.5, bước 0 |
| 24 | Trung bình | Đổi gameId làm gãy portal | 6.6, bước 16 |
| 25 | Trung bình | Golden không khớp, không có seed | 17, 10.5, bước 5 |
| 26 | Trung bình | Test cân bằng rỗng | 16.1 |
| 27 | Thấp | Chi tiết xét vòng, tán cây | 8.2, 10.1 |
| 28 | Thấp | Độ cao bay, xếp nhãn | 13.2 |
| 29 | Thấp | Số hiển thị âm | 5.4 |
| 30 | Thấp | Nháy đúp, Enter, Tab | 3.1, 3.2, 11.1, 11.3 |
| 31 | Thấp | Thứ tự bước | 22 |

Ghi chú về điểm 1: ảnh `.webp` Defense đang nạp được cắt từ ảnh vẽ 2048² của chủ dự án, không phải từ SVG. Điều đúng của phản biện vẫn giữ: ảnh chỉ một khung, hoạt ảnh nghèo, `vfx.json` trỏ tới SVG gradient. Cách sửa áp dụng đủ.

---

## 26. Việc cần chốt trước từng bước (kết quả kiểm tra bản thiết kế)

Agent kiểm tra đối chiếu 32 góp ý phản biện: 27 đã xử lý, 5 mới một phần. Chốt các điểm sau trước bước liên quan:

- **5 (high) Money loops from quartz, move and undo** (§10.5, §14.5, §16, §21.1 defense-economy, Step 6): Fixes (a), (b) and (c) are in. Gaps: (1) Quartz 'paid at wave start for clusters still destroyed' is not marked once per cluster, so it reads as income every wave. quartz-cluster is a medium prop (§19.7), so its clear fee of 5 cancels the +5 bonus unless its fee is 0. 'Max 3 per tower' does not say per lifetime or per placement; with fee 0, moving an old tower for 10 onto 3 new clusters nets +5 every phase. (2) The property test cannot pass if random operations move or sell towers built before the phase, because the 15 % move fee and the 60 % sale are never refunded. Limit operations to towers built this phase, or assert energy_end ≤ energy_start with equal obstacle, scar and quartz state. (3) Fee dodge: build a cheap tower A over a tree, build B touching the same tree (no fee), then sell A for 100 % including the fee. B keeps a free clearing worth up to 30. Fix: move the fee to the ring that remains, or do not refund it.
- **7 (high) Loot rebuilt instead of reusing Credit Crystal** (§5.4, §6.2, §6.6, Step 4): pickup-sim, draw-list and pickup-ladder move to src/platform with shims, and the credit-*.test.ts files stay untouched. The renderer is not shared: Space Typing keeps its 2D canvas and Defense gets WebGL, which finding 21 justifies. Gap: the tier images load through Space Typing's src/vfx/credit-crystal-art.ts (import.meta.glob '../assets/pickups/credits/*.webp'). Step 4 neither moves that module into platform nor copies the 8 tiers to /assets/shared or /assets/defense. With shrink-only LEGACY lists (§6.5), Defense has no legal path to the images, so step 4 fails the boundary test.
- **13 (high) Texture and download budgets do not close** (§19.4, §19.5, §20 (KTX2, per-item GPU table, texture ledger in defense-perf)): GPU memory now closes: about 38 MB of environment at 2048², about 55 MB with a 4096² ground. The download budget does not. '≤ 12 MB first load per map' has no per-item table. A 4096² UASTC ground with mips is about 21 MB raw (about 8–11 MB after RDO+zstd), before the sky halves, tiles and normals, props atlas, landmark GLBs and ambience. The upscale rule is ambiguous: '1–2k sources ×2' against '4096² only if source ≥ 3000 px'. Owner minimums (ground ≥ 2048², VFX ≥ 1536²) may exceed what ChatGPT or Gemini output. Say 'largest available; AI upscales'.
- **23 (medium) Ground paintings drift from the layout; later terrain edits force repaints** (§14 common rules, §19.2, §19.4, §21.1 (layout hash vs art-manifest), Steps 9 and 15): Road, water, cliff rims and zone tints are drawn from data. Magenta is painted as plain ground. The layout hash is frozen and checked. The repaint risk remains: layouts freeze in step 9 with the legacy roster, then steps 12 and 15 re-run bots with the new creatures and may still change layouts ('re-export guides and tell the owner'). After the freeze, limit tuning to waves, costs and towerCap, or freeze after step 13.
- **24 (medium) Boundary test and step 0 do not match HEAD** (Header facts, §6.5, Step 0): Added: LEGACY_ASSET_STRINGS and LEGACY_TEST_IMPORTS, frame-loop reuse, the Backspace-sells fix (main.ts:1607), manifests-only CI. The count is still wrong: HEAD has 38 static imports leaving src/defense (including the side-effect import of src/ui/reward-cards.css; 24 modules), plus import.meta.glob('../../assets/audio/ui/*.ogg') in view/sounds.ts:12. Rule 1 covers globs, but no list includes this one, so the test fails on day 0 as specified. No step moves the two legacy asset strings (the combat-vfx fallback in §5.3 and /assets/audio/) to /assets/defense or /assets/shared before step 16 requires LEGACY_* = 0.

Sơ đồ luật đặt trụ (ảnh, chỉ ở máy local): `art-src/defense/design/placement-rules.png` và `.svg`.
