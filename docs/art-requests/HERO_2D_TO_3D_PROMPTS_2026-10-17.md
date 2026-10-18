# Prompt tạo ảnh 2D → mô hình 3D cho nhân vật bay (Draconis v2) — 17/10/2026

> **Dành cho:** chủ dự án (tạo ảnh 2D bằng ChatGPT, rồi tạo mô hình trên Meshy/Tripo) và AI xử lý tiếp trong Blender.
> **Lý do làm lại:** chủ dự án chơi thử Campaign 3D và thấy Draconis hiện tại không hợp góc máy. Nhìn từ sau lưng và hơi từ trên xuống, nhân vật trông như đang **đứng**. Khi đánh, **tay không khớp** với tia bắn ra.
> **Hướng giải quyết:** tạo nhân vật mới có hình dáng hợp với lối bay **nằm ngang, nhìn từ sau lưng**, rồi làm hoạt ảnh bay riêng cho góc máy đó.
> **Quy trình của chủ dự án:** ảnh 2D (ChatGPT) → Meshy Image to 3D → GLB.

## 1. Vì sao Draconis hiện tại khó dùng

| Vấn đề | Hậu quả trong game |
|---|---|
| Mô hình ở dáng đứng; lúc bay chỉ nghiêng 24° | Từ sau lưng trông như đứng yên giữa không trung |
| Tay buông sát hông, vai bị cánh che | Lúc ra đòn không thấy tay; tia như bắn ra từ hông |
| Cánh làm từ nhiều lông nhọn, mảnh | Viền cánh lởm chởm, rối mắt khi phóng to; khó gắn xương |
| Không có ảnh sau lưng khi tạo 3D | Mặt sau (phần người chơi nhìn nhiều nhất) ít chi tiết |

## 2. Yêu cầu hình dáng (để gắn xương và làm hoạt ảnh tốt)

**Góc máy trong game:** máy quay ở sau lưng, hơi cao hơn nhân vật. Nhân vật bay **vào sâu trong màn hình**, thân gần nằm ngang. Đầu ngẩng nhìn về trước, chân và đuôi duỗi về phía máy quay. Vì vậy:

1. **Lưng và mặt sau cánh là phần quan trọng nhất.** Lưng cần có điểm nhấn: đường sáng dọc sống lưng, giáp lưng, gốc cánh rõ.
2. **Cánh mọc từ bả vai**, tách hẳn khỏi tay, có khoảng trống giữa cánh và tay. Cánh to, bản rộng, viền đơn giản. Dùng màng cánh rồng đặc, có gân sáng. Chỉ thêm vài "lông lửa" lớn, dày ở mép sau. Không dùng lông mảnh.
3. **Tay dang 45° (A-pose)**, khuỷu hơi cong, **bàn tay mở**, lòng bàn tay hướng ra trước, có vòng sáng ở lòng bàn tay (nơi tia bắn ra). Giáp vai nhỏ gọn, để tay giơ được qua đầu.
4. **Chân thẳng, hơi tách nhau.** Đuôi **dài vừa phải** (khoảng bằng chân), không chạm chân hay mặt đất. Lúc bay, đuôi chĩa về phía máy quay; đuôi quá to sẽ che màn hình.
5. **Sừng vuốt ra sau**, cổ đủ dài để ngẩng đầu khi thân nằm ngang.
6. **Không có phần lủng lẳng:** áo choàng, vải, tóc, dây xích, dải lụa, tua rua. Các phần này không gắn xương được và dễ vỡ khi giảm số mặt.
7. **Không vẽ hiệu ứng lên người:** lửa, khói, hạt sáng, quầng sáng. Mọi hiệu ứng do game vẽ. Nếu vẽ vào ảnh, chúng sẽ thành khối 3D dính trên thân.
8. **Đối xứng trái phải**, nền trơn, ánh sáng đều, toàn thân, không bị cắt.

## 3. Prompt cho ChatGPT

**Cách dùng:**

- Mở **một cuộc trò chuyện mới** và gửi lần lượt từng prompt dưới đây. Làm cùng một cuộc trò chuyện để ChatGPT giữ đúng một nhân vật.
- Chỉ gửi prompt tiếp theo khi ảnh trước đã đạt các điểm ở mục 4.
- Nếu ChatGPT đổi chi tiết (màu, sừng, giáp), tải ảnh 1 lên lại, kèm câu: `Use this image as the exact character reference.`
- Nếu ảnh có cảnh nền, dáng động hoặc bị cắt mất phần nào, trả lời: `Redo it: plain flat light-grey background, neutral A-pose, full body with nothing cropped, same character.`
- Tải ảnh về ở độ phân giải gốc (PNG).

Prompt viết bằng tiếng Anh để mô tả chính xác. ChatGPT không có ô "negative prompt", nên phần cần tránh đã nằm sẵn trong từng prompt (dòng `Avoid:`).

### 3.1 Ảnh 1 — mặt trước, A-pose (ảnh chính cho Meshy)

```
Create a landscape image (3:2). Full-body character concept art that will be turned into a 3D game model with an image-to-3D tool. Front view, orthographic with no perspective, the character centered with a small empty margin on every side, everything visible from the horn tips and wing tips down to the feet. Plain flat light-grey background, soft even studio lighting, no cast shadows, no ground.

Character: "Draconis", a heroic winged dragon-humanoid fire guardian. Athletic humanoid body with a slim waist and dragon features. Head: dragon head with a short snout, glowing amber eyes, two pairs of horns swept straight back along the skull. Body: crimson-red dragon scales, gold armor plates on the chest, forearms and shins, ivory-white belly scales, thin glowing orange energy lines along the collarbones and forearms. Small, compact shoulder armor so the arms can be raised overhead.

Wings: one pair of large dragon wings growing from the shoulder blades, fully spread out to the sides and slightly upward, perfectly symmetrical, clearly separate from the arms with open space between each wing and arm. Each wing has a strong gold wing-arm bone in three segments and wide, solid crimson membrane panels with glowing orange veins. The trailing edge ends in a few large, thick, blade-like flame-feather shapes. No thin wispy feathers.

Pose: neutral A-pose, standing straight, arms straight out at 45 degrees from the body, elbows slightly bent, open hands with palms facing forward, fingers together, small claws, a glowing orange circle in each palm. Legs straight and slightly apart, clawed dragon feet. Tail: medium-length tapered dragon tail, about as long as the legs, hanging down behind and curving out to one side, not touching the legs or the ground, gold ridge on top, glowing ember tip.

Style: stylized semi-realistic action game character, clean readable shapes, bold silhouette, crisp PBR-friendly materials. Single character only.

Avoid: weapons, shields, capes, cloth, robes, hair strands, chains, ribbons, tassels, fire, flames, smoke, particles, sparks, glow halos, aura, motion blur, scenery, background objects, pedestal, text, logos, watermark, extra limbs, extra wings, wings attached to the arms, bat-wing arms, cropped body parts, perspective distortion, dynamic or asymmetrical pose.
```

### 3.2 Ảnh 2 — sau lưng (gửi tiếp trong cùng cuộc trò chuyện)

Ảnh này quan trọng nhất, vì người chơi nhìn nhân vật từ sau lưng suốt trận.

```
Now draw exactly the same character from directly behind (back view). Keep everything identical to the previous image: the same A-pose, proportions, colors, scales, armor, horns and wings, the same framing and size, landscape 3:2, plain flat light-grey background, soft even lighting, no cast shadows.

Show the back clearly: the wing roots on the shoulder blades, the back side of the wing membranes with glowing orange veins, a glowing orange energy line running down the spine, gold armor plates on the upper back, the tail base above the hips, the back of the swept-back horns. Full body, nothing cropped, single character.

Avoid: fire, flames, smoke, particles, aura, glow halos, scenery, text, perspective, any change to the design.
```

### 3.3 Ảnh 3 — bên hông (gửi tiếp trong cùng cuộc trò chuyện)

```
Now draw exactly the same character in an exact left side view (profile). Keep the same A-pose, proportions, colors and armor. The wings are fully spread, seen edge-on from the side. The tail hangs down behind the legs. Square image (1:1), plain flat light-grey background, soft even lighting, no cast shadows, full body with nothing cropped, single character.

Avoid: fire, flames, smoke, particles, aura, scenery, text, perspective, any change to the design.
```

### 3.4 Ảnh 4 — dáng trong game (tùy chọn, chỉ để duyệt, không đưa vào Meshy)

Ảnh này giúp anh/chị xem trước nhân vật **ở góc máy của game** trước khi tạo 3D. Claude cũng dùng ảnh này làm mẫu khi làm hoạt ảnh.

```
Now show the same character in action, for a game mood reference. It flies away from the camera into deep space, seen from behind and slightly above, like a third-person chase camera in an action game. The body is almost horizontal like a diving dragon, the head lifted and looking forward, the wings spread wide in a powerful downstroke, legs and tail streaming back towards the camera. The right arm is stretched forward past the head, with a glowing fire bolt leaving the open palm. Dark space background with purple nebula and stars. Dramatic but readable lighting, landscape 16:9.
```

### 3.5 Đổi sang nhân vật khác

Giữ nguyên bố cục prompt 3.1. Chỉ thay tên, phần **Head / Body / Wings** (màu, chất liệu) và màu ở phần **Tail**:

- **Solar Wyvern:** đỏ thẫm và vàng kim, mắt hổ phách, gân cam (gần giống Draconis; nên chọn một trong hai).
- **Astral Sentinel:** giáp bạc và xanh thẫm, mắt xanh lơ, màng cánh pha lê xanh có đốm như sao, gân xanh lơ.
- **Shadow Abyss:** vảy đen ánh tím, mắt tím, màng cánh tối có gân tím phát sáng, đuôi có lưỡi.
- **Nature Guardian:** vảy xanh ngọc và đồng, mắt xanh lục, màng cánh có gân như lá, sừng như gạc nai.

Luật chung vẫn giữ: không có phần lủng lẳng, không vẽ lửa hay hạt sáng lên người.

## 4. Chọn ảnh trước khi tạo 3D

Chỉ đưa ảnh vào Meshy/Tripo khi đạt **đủ** các điểm sau:

- [ ] Thấy toàn thân, kể cả đầu cánh, sừng và bàn chân; nền trơn.
- [ ] Cánh tách khỏi tay, có khoảng trống rõ.
- [ ] Tay dang khoảng 45°, bàn tay mở, thấy rõ khuỷu và cổ tay.
- [ ] Hai chân tách nhau; đuôi không chạm chân.
- [ ] Không có lửa, khói, hạt, quầng sáng hay vũ khí.
- [ ] Trái phải gần đối xứng.
- [ ] Ảnh mặt trước, sau lưng và bên hông cùng một nhân vật (màu, giáp, sừng khớp nhau).

## 5. Tạo 3D trên Meshy / Tripo

**Meshy (Image to 3D):**

- Nếu có chế độ **nhiều ảnh** (multi-image), đưa vào ảnh 1, 2, 3. Nếu không có, chỉ đưa ảnh 1.
- **Symmetry (đối xứng):** bật.
- **Pose:** chọn A-pose nếu có tùy chọn này.
- **Số mặt:** khoảng 30–50 nghìn (Claude sẽ giảm xuống khoảng 22 nghìn).
- **Texture:** bật, PBR, độ phân giải cao nhất của gói.
- **Gắn xương:** thử chức năng **Rigging** (gắn xương tự động dạng người).
  - Được thì tải cả bản **có xương**. Claude sẽ giữ xương thân, tay, chân của Meshy và thêm xương cánh, xương đuôi. Cách này cho trọng lượng da tốt hơn tự gắn hoàn toàn.
  - Báo lỗi (thường do có cánh) thì chỉ cần bản không xương.

**Tripo3D:** dùng **Multiview to 3D** với ảnh trước, hông, sau. Các lựa chọn khác giống Meshy. Tripo cũng có gắn xương tự động; nếu được thì tải thêm bản có xương.

**Lưu tệp:**

| Tệp | Nơi lưu |
|---|---|
| Ảnh 2D (trước, sau, hông, dáng trong game) | `art-src/concepts/heroes/draconis-v2-front.png`, `-back.png`, `-side.png`, `-flight.png` |
| Mô hình không xương | `art-src/models/raw/heroes/draconis-v2.meshy.glb` (hoặc `.tripo.glb`) |
| Mô hình có xương (nếu có) | `art-src/models/raw/heroes/draconis-v2.meshy-rigged.glb` |

Giữ nguyên tệp Draconis cũ (`raw/ships/Draconis.meshy.glb`), để còn so sánh.

## 5b. Kết quả (18/10/2026)

Chủ dự án đã tạo 5 ảnh (trước, sau, trái, phải, dáng bay) và GLB Meshy (1,6 triệu tam giác, không xương). Claude đã làm mục 6. Chi tiết, số đo và cách làm lại: mục 10 của `docs/CAMPAIGN_3D_2026-10-17.md`.

## 6. Claude sẽ làm gì khi có mô hình

1. **Blender:** gắn xương (giữ xương Meshy nếu có, thêm cánh 3 đốt mỗi bên và đuôi 4 đốt), giảm số mặt, làm vùng phát sáng, đặt điểm gắn hiệu ứng (lòng bàn tay, ngực, miệng, đầu cánh, đầu đuôi).
2. **Hoạt ảnh bay mới, làm riêng cho góc máy sau lưng:**
   - **Bay:** thân gần nằm ngang (khoảng 70°), đầu ngẩng, cánh vỗ biên độ lớn, chân và đuôi duỗi về sau, đuôi lượn nhẹ;
   - **Tăng tốc:** thân nằm hẳn, cánh khép về sau như lao xuống;
   - **Đánh tay trái / phải:** vai xoay, tay vươn ra trước qua đầu. Tia bắn ra từ lòng bàn tay đúng lúc tay duỗi thẳng;
   - **Tung chiêu:** thân hơi ngẩng lên, hai tay cùng đẩy ra trước, cánh xòe rộng;
   - **Trúng đòn, thắng, chết, xuất hiện:** làm lại theo dáng bay.
3. **Ảnh xem trước từ đúng góc máy của game** cho từng hoạt ảnh. Claude tự xem, rồi gửi chủ dự án duyệt trước khi đưa vào game.
4. **Trong game:** đổi Campaign 3D sang mô hình mới. Thân nghiêng theo hoạt ảnh thay vì do code. Tia lấy vị trí lòng bàn tay tại lúc tay duỗi thẳng. Chụp so sánh trước/sau.
