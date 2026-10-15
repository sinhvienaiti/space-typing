# Yêu cầu ảnh: tàu Vanguard 3D (bản thử)

Ngày: 2026-10-03. Người viết: Claude. Người làm: ChatGPT Images (hoặc AI tạo ảnh khác).

## Mục đích

Trong góc nhìn chiều sâu của Duel, camera nằm **phía sau và hơi trên** tàu mình. Ảnh tàu hiện tại lại vẽ **thẳng từ trên xuống**, nên tàu trông phẳng.

Bản thử này cần:
1. Vanguard được nhìn **từ phía sau, chếch trên**: thấy đuôi, động cơ và mặt trên tàu theo phối cảnh.
2. **5 góc nghiêng** (lắc thân trái/phải). Khi tàu né, game chuyển mượt giữa các góc nên thân tàu xoay như mô hình 3D thật.

Game chỉ đổi ảnh theo góc, nên **không nặng thêm khi chơi**. Chưa có ảnh thì game vẫn dùng ảnh cũ.

## Ảnh tham chiếu (bắt buộc đính kèm)

`docs/art-requests/vanguard-3d-pilot/vanguard-reference.png`

Đây là Vanguard hiện tại. Đính kèm ảnh này vào ChatGPT cùng prompt để giữ đúng thiết kế tàu.

## Lưu ảnh ở đâu

Lưu vào `games/space-typing/art-src/ships/`. Thư mục này không đưa lên Git; tự tạo thư mục `ships` nếu chưa có.

| Cách làm | Tên file |
| --- | --- |
| Cách A: một tấm có đủ 5 góc (ưu tiên) | `vanguard-chase-sheet.png` |
| Cách B: 5 ảnh riêng | `vanguard-chase-L35.png`, `vanguard-chase-L15.png`, `vanguard-chase-C00.png`, `vanguard-chase-R15.png`, `vanguard-chase-R35.png` |
| Phương án phụ: nhìn từ trên xuống, có nghiêng | `vanguard-topdown-sheet.png` |

Lưu xong thì báo Claude. Claude sẽ tự cắt khung, căn tâm, tách nền, đóng gói và gắn vào game.

## Nền ảnh

- Tốt nhất là **nền trong suốt (PNG có alpha)**. ChatGPT có tùy chọn này: ghi rõ "transparent background".
- Nếu không được trong suốt, dùng **nền một màu hồng tím phẳng #FF00FF**. Không dùng nền xanh lá: tàu Vanguard màu trắng/xanh lam, nền hồng tím tách sạch hơn và không bị lem màu ở viền.
- Tuyệt đối không có bóng đổ, mặt đất, sao, tinh vân hay chữ.

---

## Prompt 1 — Cách A: một tấm 5 góc (dùng cái này trước)

Đính kèm `vanguard-reference.png`, rồi dán nguyên văn:

```text
Use the attached spaceship as the exact design reference. Create a game sprite sheet of THIS SAME spaceship (same silhouette, armor panels, colors, cockpit, wing shape and engine layout) seen from a chase camera: the camera is directly behind the ship and about 30 degrees above it, and the ship flies away from the viewer toward the top of the image, so we see the rear, the engines and the top of the hull in perspective.

Show exactly 5 poses in ONE horizontal row, evenly spaced, each ship centered in its own equal-width slot, all at the same size and the same height on the canvas:
1) banking hard left (rolled 35 degrees, left wing down),
2) banking slightly left (rolled 15 degrees),
3) level flight,
4) banking slightly right (rolled 15 degrees),
5) banking hard right (rolled 35 degrees, right wing down).

Only the roll angle changes between poses; design, colors, lighting, scale and camera stay identical. When the ship rolls, show the side of the fuselage and the thickness of the wings so it clearly reads as a solid 3D model. The engine nozzles face the viewer and glow bright cyan. White and silver armor with cyan and blue light accents, as in the reference.

Style: polished high-end sci-fi game art, like a rendered 3D game model, crisp details, clean sharp edges, soft key light from the upper left, subtle rim light.

Background: fully transparent (PNG with alpha). No ground shadow, no stars, no nebula, no exhaust trails, no text, no labels, no numbers, no grid or divider lines, nothing else in the image.

Landscape canvas 1536x1024.
```

**Kiểm tra trước khi lưu:**
- Đúng 5 tàu, cùng một thiết kế (không thành 5 tàu khác nhau), cùng kích thước, cùng đường ngang.
- Ảnh giữa là bay thẳng. Hai bên nghiêng đối xứng: trái 2 ảnh, phải 2 ảnh.
- Thấy rõ động cơ phát sáng ở đuôi, hướng về phía người xem.
- Không có chữ, đường kẻ hay bóng.

Nếu 5 tàu trông khác nhau quá nhiều, chuyển sang Prompt 2.

---

## Prompt 2 — Cách B: từng ảnh một (khi Cách A không đồng đều)

Làm trong **cùng một cuộc trò chuyện**, để ChatGPT nhớ đúng con tàu.

**Bước 1:** đính kèm `vanguard-reference.png`, rồi dán:

```text
Use the attached spaceship as the exact design reference. Render THIS SAME spaceship (same silhouette, armor panels, colors, cockpit, wing shape and engine layout) in level flight, seen from a chase camera directly behind the ship and about 30 degrees above it; the ship flies away from the viewer toward the top of the image, so we see the rear, the glowing cyan engine nozzles and the top of the hull in perspective. Polished high-end sci-fi game art like a rendered 3D model, crisp clean edges, soft key light from the upper left, subtle rim light. One ship only, centered, filling about 70% of the canvas height. Fully transparent background (PNG with alpha). No shadow, no stars, no exhaust trails, no text. Square canvas 1024x1024.
```

Lưu thành `vanguard-chase-C00.png`.

**Bước 2:** dán lần lượt 4 câu dưới. Mỗi câu tạo một ảnh:

```text
Now render the exact same ship with the exact same camera, size, position, lighting and transparent background, but banking slightly left: rolled 15 degrees, left wing lower. Show the side of the fuselage a little. Nothing else changes.
```
→ lưu `vanguard-chase-L15.png`

```text
Same ship, same camera, size, position, lighting and transparent background, now banking hard left: rolled 35 degrees, left wing clearly down, the side of the fuselage and the wing thickness visible. Nothing else changes.
```
→ lưu `vanguard-chase-L35.png`

```text
Same ship, same camera, size, position, lighting and transparent background, now banking slightly right: rolled 15 degrees, right wing lower. Nothing else changes.
```
→ lưu `vanguard-chase-R15.png`

```text
Same ship, same camera, size, position, lighting and transparent background, now banking hard right: rolled 35 degrees, right wing clearly down, the side of the fuselage and the wing thickness visible. Nothing else changes.
```
→ lưu `vanguard-chase-R35.png`

---

## Prompt 3 — Phương án phụ: nhìn từ trên xuống, có nghiêng

Prompt này không bắt buộc. Dùng khi muốn giữ góc nhìn từ trên xuống như ảnh hiện tại, chỉ thêm độ nghiêng (cho bản ngang và Campaign).

```text
Use the attached spaceship as the exact design reference. Create a game sprite sheet of THIS SAME spaceship seen from directly above (top-down, nose pointing straight up, exactly like the reference). Show exactly 5 poses in ONE horizontal row, evenly spaced, same size and centered in equal slots: banking hard left (rolled 35 degrees), slightly left (15 degrees), level, slightly right (15 degrees), hard right (35 degrees). As the ship rolls, its outline narrows and the side of the fuselage and the lower wing's underside become visible, so it reads as a solid 3D model rotating. Same design, colors, lighting and scale in every pose; only the roll changes. Polished high-end sci-fi game art, crisp clean edges, soft light from the upper left. Fully transparent background (PNG with alpha). No shadow, no text, no lines, nothing else. Landscape canvas 1536x1024.
```

Lưu thành `vanguard-topdown-sheet.png`.

---

## Sau khi có ảnh (phần Claude làm)

1. Script chuẩn bị ảnh:
   - Tách nền (trong suốt hoặc #FF00FF).
   - Tìm từng tàu, căn theo trục dọc thân tàu, đưa về cùng chiều dài.
   - Đóng thành atlas WebP 5 ô kèm file JSON.
2. Góc nhìn chiều sâu dùng ảnh nhìn từ sau cho tàu mình. Khi tàu trôi/né, game chọn góc nghiêng và chuyển mờ giữa hai góc gần nhất.
3. Đặt lại vị trí lửa động cơ cho khớp ảnh mới.
4. Chụp ảnh so sánh trước/sau để chủ dự án duyệt. Ưng thì làm tiếp cho tàu địch (góc nhìn từ phía trước), vật phẩm xoay 360° và các tàu khác.

---

## Cập nhật 2026-10-03: chỉ cần 1 ảnh nhìn từ phía sau

ChatGPT vẽ bảng "các mặt của tàu" (front/back/top/side) có chữ và nền tối, thay vì 5 góc nghiêng. Trong bảng đó, con tàu "MẶT SAU / BACK VIEW" đúng góc cần. Claude đã cắt nó ra:

`docs/art-requests/vanguard-3d-pilot/vanguard-back-view-ref.png`

Nhìn từ phía sau, độ nghiêng gần giống xoay cả hình, nên game tự tạo nghiêng từ **một ảnh**. Ảnh nhìn từ trên xuống ChatGPT vẽ lại (nền trong suốt, 1254 px) được giữ ở `art-src/ships/vanguard-top-hd.png` để dùng sau.

**Prompt 4: chỉ đính kèm `vanguard-back-view-ref.png`.** Không đính kèm ảnh khác, để ChatGPT khỏi chọn nhầm con tàu.

```text
Redraw the attached spaceship exactly as it is: same design, same camera angle (seen from BEHIND and slightly above, the three engines facing the viewer and glowing cyan), same colors and lighting. Do NOT change it to a top view and do not show the cockpit glass from above. One ship only, centered, on a fully transparent background (PNG with alpha). Remove the dark background and the haze, no text, no shadow, nothing else. Clean crisp edges, polished high-end sci-fi game art. Square canvas 1024x1024, the ship filling about 75% of the width.
```

Nếu không được nền trong suốt: *"Use a flat solid #FF00FF magenta background instead."*

Lưu thành `art-src/ships/vanguard-chase-C00.png`.

---

## Prompt 5: bản chi tiết (dùng thay Prompt 4)

Chỉ đính kèm `vanguard-back-view-ref.png`, rồi dán nguyên văn:

```text
TASK: Recreate the attached spaceship as a single clean game sprite. Same ship, same viewing angle, studio-quality render, transparent background. This is an EDIT/RECREATION of the attached image, not a new design.

CAMERA (most important):
- The camera is BEHIND the ship and about 25-30 degrees ABOVE it, looking forward in the same direction the ship is flying.
- The ship flies AWAY from the viewer, toward the top of the image.
- Therefore: the REAR of the ship is nearest to the viewer, at the BOTTOM of the image, and looks bigger. The nose is farthest away, at the TOP of the image, pointing straight up, and looks narrower because of perspective.
- We see the three engine nozzles from behind and the top of the hull strongly foreshortened.
- The ship is perfectly level and perfectly centered: no roll, no yaw, no tilt, left and right halves symmetrical, nose-to-tail axis exactly vertical.

THE SHIP (keep the attached design exactly):
- Long central fuselage with a sharp spike nose, white armor plates on a gunmetal/black frame, a glowing electric-blue light strip running along the spine.
- One LARGE round main engine nozzle at the bottom center, with a bright glowing cyan core inside a dark metal ring.
- Two side engine pods (left and right of the fuselage), cylindrical nacelles, each ending in a round nozzle with a glowing cyan core, slightly smaller than the main nozzle.
- Swept wings behind the pods with glowing blue light panels near the wingtips.
- Materials: matte white armor, dark gunmetal structure, emissive cyan/electric-blue accents. Same colors and proportions as the attached image.

LIGHTING AND STYLE:
- Polished high-end sci-fi game art, like a rendered 3D game model; crisp details, clean sharp outer edges.
- Soft key light from the upper left, a thin cyan rim light along the edges.
- The engine glow stays TIGHT around the nozzles (a short bright core, at most about 5% of the ship width beyond the nozzle). No long flames, no exhaust trails, no lens flare, no bloom haze around the ship.

COMPOSITION AND FORMAT:
- Exactly ONE ship. Centered. It fills about 75% of the canvas width and about 70% of the canvas height, with empty margins on all sides (nothing touches the edges).
- Square canvas 1024 x 1024.
- Background: FULLY TRANSPARENT (PNG with alpha channel). Every pixel outside the ship and its tight engine glow must be completely transparent.

DO NOT:
- Do NOT draw a top-down view, a front view, a side view or a 3/4 front view.
- Do NOT show the cockpit glass/crystal from above (it must be hidden, because we look from behind).
- Do NOT draw a sheet with several views, labels, titles, text, numbers, arrows, logos, watermarks or divider lines.
- Do NOT add a background, gradient, stars, nebula, planet, floor, shadow or reflection.
- Do NOT change the design, colors or proportions; do NOT add new parts or weapons.

SELF-CHECK BEFORE YOU OUTPUT: the three glowing engine nozzles are at the bottom facing the viewer; the nose is at the top pointing away; no cockpit glass is visible; there is only one ship; there is no text; the background is transparent. If any of these is wrong, fix it before giving me the image.
```

### Câu nhắn sửa nhanh (dán thêm vào cùng cuộc trò chuyện nếu ảnh sai)

- **Lại vẽ nhìn từ trên xuống / thấy buồng lái pha lê:**
  `Wrong angle. Keep the exact view of the attached image: from BEHIND and slightly above, engines facing me at the bottom, nose pointing away at the top, cockpit glass not visible. Redraw.`
- **Nền không trong suốt:**
  `The background must be fully transparent (PNG with alpha). If you cannot, use one flat solid #FF00FF magenta color with no gradient, no glow and no shadow on it.`
- **Thiết kế bị đổi:**
  `You changed the design. Match the attached ship exactly: same parts, same white/gunmetal/cyan colors, same proportions. Only clean it up and remove the background.`
- **Hào quang hoặc lửa quá lớn:**
  `Make the engine glow much tighter: only a short bright core at each nozzle, no flames, no haze, no bloom around the ship.`
- **Tàu bị lệch, nghiêng hoặc chạm mép:**
  `Center the ship, make it perfectly symmetrical and level, and leave empty margins on all sides.`

---

## Trạng thái 2026-10-03: ĐÃ GẮN VÀO GAME (bản thử)

- Ảnh đạt: `art-src/ships/vanguard-chase-C00.png` (ChatGPT, Prompt 5, 1254 px, nền trong suốt).
- Xử lý: `pnpm chase:prepare` → `public/assets/space-typing/ships/chase/vanguard.webp` (512×470, 63 KB) và `manifest.json`. Vị trí 3 động cơ tự dò: (0,233; 0,823), (0,500; 0,821), (0,767; 0,822).
- Game: `src/characters/chase-art.ts` nạp ảnh. `DuelCombatVisuals.drawChase()` vẽ tàu mình trong góc nhìn chiều sâu:
  - tàu nghiêng theo hướng trôi/né, tối đa ±0,42 rad, có làm hẹp nhẹ;
  - thêm các pha né nhanh định kỳ;
  - giật nghiêng khi trúng đạn;
  - lửa động cơ và quầng sáng đặt đúng 3 lỗ phun.
- So sánh: thêm `?chase=0` để xem lại ảnh cũ. Ảnh trước/sau: `.visual/chase-compare.jpg`.
- Bước tiếp theo nếu chủ dự án duyệt: góc nhìn từ phía trước cho tàu địch (cùng quy trình), rồi đến các tàu khác (`<characterId>-chase-C00.png` vào `art-src/ships/`, chạy `pnpm chase:prepare`).

---

## Trạng thái 2026-10-03 (lần 2): TÀU 3D THẬT CHO VANGUARD

Chủ dự án thấy ảnh nhìn từ sau "không khác gì 2D", đã xem bản demo 3D và yêu cầu làm thật với Vanguard.

- **Không cần ảnh mới.** Mô hình dựng từ ảnh nhìn từ trên có sẵn `art-src/ships/vanguard-top-hd.png` (1254 px, nền trong suốt).
- `pnpm ship3d:prepare` (`scripts/bg-art/prepare-ship-3d.mjs`) tạo `public/assets/space-typing/ships/3d/vanguard/`:
  - `color.webp`: lớp sơn thân tàu, đã cắt bỏ 2 ngọn lửa vẽ sẵn sau động cơ (lửa thật do game vẽ);
  - `emissive.webp`: chỉ các phần phát sáng xanh;
  - `height.bin`: độ cao thân tàu, dựng bằng cách "thổi phồng" hình bóng (ghép các quả cầu nằm trong đường viền): thân giữa dày, cánh và vây mỏng;
  - `model.json`: tỉ lệ, vị trí và bán kính 2 vòi động cơ (tự dò từ chỗ lửa bị cắt);
  - `../manifest.json`: danh sách tàu có mô hình.
- Game (`src/duel/ship3d.ts`): three.js dựng khối nổi, mặt dưới mỏng và tối hơn, 2 chuông động cơ kim loại có lõi sáng. Ánh sáng thật: đèn chính, đèn viền đổi màu theo bậc chuỗi gõ đúng, đèn chớp theo vụ nổ trên thân, phản chiếu môi trường nhẹ.
- Mở bằng file `.glb` thật: chưa làm. Đây là bước nâng cấp nếu chủ dự án muốn chi tiết mặt sau đẹp hơn nữa (xem handoff 0.8).
- So sánh trong game: `?ship3d=0` quay về ảnh nhìn từ sau. Ảnh so sánh: `.visual/compare-2d-3d.jpg`, `.visual/lab7-lab.jpg`.

## Trạng thái 2026-10-03 (lần 3): MÔ HÌNH 3D DỰNG BẰNG CODE

Chủ dự án thấy khối nổi vẫn "ra hình 2D". Vanguard giờ là mô hình 3D thật dựng bằng code (`src/duel/vanguard-model.ts`) theo bố cục ảnh nhìn từ trên. Mô hình có vật liệu phản sáng, bóng đổ, đèn mũi và đầu cánh, chớp nòng súng, lửa phản lực theo chuỗi gõ đúng. Không cần ảnh mới. Khối nổi cũ xem bằng `?ship3d=relief`. Chi tiết: handoff mục 0.9.

## Trạng thái 2026-10-03 (lần 4): CHỐT PHƯƠNG ÁN B

Chủ dự án chê mô hình dựng bằng code ("nhìn như mô hình"). Sau khi xem demo A/B/C, chủ dự án chọn **B**: bức vẽ nhìn từ trên dựng nổi 3D, có bóng đổ, đèn mũi và đầu cánh, nòng súng có chớp sáng, lửa phản lực theo chuỗi. B giờ là mặc định. Các điểm đèn và nòng súng đo trên chính bức vẽ (`ANCHORS` trong `scripts/bg-art/prepare-ship-3d.mjs`). Muốn tàu khác dùng được cách này thì cần ảnh nhìn từ trên nét cao của tàu đó, cộng bảng `ANCHORS` cho tàu đó.
