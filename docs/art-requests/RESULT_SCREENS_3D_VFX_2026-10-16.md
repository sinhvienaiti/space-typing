# Màn kết quả 3D: ngôi sao và khiên vỡ (16/10/2026)

> **Dành cho:** chủ dự án, ChatGPT (ảnh khái niệm, hướng dẫn Blender), Tripo3D / Meshy, Blender.
>
> **Code đã xong và chạy được ngay, không cần chờ mô hình.** Game tự dựng ngôi sao và tấm khiên bằng mã. Hai mô hình dưới đây chỉ để **thay** bản tự dựng bằng bản đẹp hơn, có chi tiết và texture thật. Thiếu file nào thì game vẫn dùng bản tự dựng.
>
> Cách làm chung (ảnh khái niệm, Tripo3D/Meshy, script Blender, `pnpm models:prepare`) giống hệt `3D_MODELS_PROMPT_PACK_2026-10-16.md`, mục 1–5. Tài liệu này chỉ ghi phần riêng.

## 0. Màn kết quả giờ chạy thế nào

Mã: `src/vfx/result-fx.ts`. Chạy từ chất lượng hình Medium trở lên. Ở Low, hoặc khi máy bật "giảm chuyển động", game giữ hiệu ứng CSS cũ.

**Stage Complete** (mức ăn mừng 1–5 theo số sao, độ chính xác, tốc độ gõ, điểm):

| Thời điểm | Chuyện gì xảy ra |
|---|---|
| 0,1 – 1,0 s | Ba ngôi sao 3D lao từ phía trước màn hình vào ô sao, xoay 3 vòng. Sao đạt được làm bằng vàng kim loại; sao chưa đạt màu thép xanh sẫm. |
| Lúc mỗi sao chạm ô | Tóe tia lửa, vòng sóng xung kích, lóe sáng, rung nhẹ màn hình, tiếng "reward" (sao cuối dùng tiếng lớn). |
| 0,5 – 5 s | Tia sáng xoay phía sau ngôi sao (mức 5 có ánh cầu vồng). Pháo giấy rơi từ trên xuống. Từ mức 3, thêm hai khẩu pháo giấy bắn từ hai góc dưới. |
| Sau đó | Sao lắc nhẹ, ánh sáng lướt trên mặt sao. Từ mức 4 có bụi vàng bay lên. Chỉ còn vẽ vùng nhỏ quanh sao, 30 khung/giây. |

**Run Over:**

| Thời điểm | Chuyện gì xảy ra |
|---|---|
| 0 – 1,4 s | Màn hình nhiễu "mất tín hiệu": dải màu xé ngang, nhiễu hạt, vạch quét. |
| 0,1 – 1,05 s | Tấm khiên lục giác của phi công hiện ra cạnh chữ DEFEATED, chập chờn như hologram hỏng. Các vết nứt đỏ dần lên. |
| 1,05 s | Khiên vỡ thành 36 mảnh, tóe tia lửa, vòng sóng đỏ, rung màn hình, tiếng "shield-break". |
| Sau đó | Các mảnh trôi lơ lửng, mép vỡ nguội từ trắng nóng sang cam rồi đỏ sẫm. Có khói và tàn lửa bay lên. |

**Hiệu năng** (đo trên Intel UHD 630 ở 1642×799, chất lượng High):

| | 4,5 giây đầu | Sau đó |
|---|---|---|
| Stage Complete, bản 3D | 17,7–18,1 ms/khung | 16,67 ms (đủ 60 khung/giây) |
| Stage Complete, bản CSS cũ | 18,7–20,7 ms/khung | 16,67 ms |
| Run Over, bản 3D | 17,3–17,8 ms/khung | 16,67 ms |
| Run Over, bản CSS cũ | 19–27 ms/khung | 19–28 ms |

Bản 3D nhẹ hơn bản cũ vì hai việc:
- tắt pháo giấy CSS;
- bỏ lớp làm mờ nền (backdrop-filter) đang tính lại mỗi khung hình.

**Cách xem và so sánh:**
- Chơi thật: thắng một màn, hoặc thua một màn.
- Thêm `?resultfx=off` vào địa chỉ để xem lại bản CSS cũ.
- Khi chạy dev (`pnpm dev`), mở Console và gõ `__resultPreview("clear", 3, 5)` (số sao, mức 1–5) hoặc `__resultPreview("over")`. Bản build không có lệnh này.

## 1. Danh sách mô hình (tùy chọn)

| Món | Đường dẫn file cuối | Loại trong `model-contracts.ts` | Tam giác |
|---|---|---|---|
| Ngôi sao xếp hạng | `art-src/models/items/result-star.glb` | `items` | 1.500–4.000 |
| Khiên phi công vỡ sẵn | `art-src/models/items/result-shield.glb` | `items` | 3.000–8.000 (tổng các mảnh) |

Sau khi có file: chạy `pnpm models:prepare --only items/result-star` (hoặc `items/result-shield`), rồi ở thư mục gốc chạy `pnpm build:space`.

## 2. Ngôi sao — `items/result-star`

**Game dùng nó thế nào:**
- Một mô hình cho cả ba ô.
- Sao **đạt được** giữ nguyên vật liệu của file.
- Sao **chưa đạt** được game phủ lớp thép xanh sẫm.
- Game tự xoay, tự phóng to thu nhỏ và tự thêm quầng sáng phía sau. Không cần hoạt ảnh.

**Hướng:**
- Mặt trước của sao nhìn về **-Y trong Blender** (thấy mặt trước khi bấm phím số 1, Front view).
- Đỉnh sao chĩa lên **+Z**.
- Tâm ở giữa sao.

**Phần riêng của lời nhắc ảnh khái niệm** (dán sau phần chung ở mục 3 của bộ prompt 3D):

```
A five-pointed rating star trophy piece for a sci-fi space game results screen: chunky faceted star like a
cut gemstone, each arm split into two bevelled facets meeting at a raised central ridge, polished gold metal
(#ffc83f) with a thin white-gold chamfered rim, a small glowing amber core crystal (#ff8418) set in the centre
of the front face, subtle engraved circuit lines on the facets, slightly rounded tips, thick enough to read as
a solid 3D object from a three-quarter view. Clean, premium, readable at 60 px on screen.
```

**Tripo3D / Meshy:**
- Image to 3D từ ảnh `-34`, hoặc Multiview với 4 góc.
- Bật PBR. Face limit 4000. Symmetry bật.

**Blender:**
- Chạy script với `kind="items"`, `id="result-star"`, `target_triangles=3000`, `make_sockets=False`.
- Script xoay mũi về +Y. Ngôi sao **không có mũi**, nên sau khi chạy hãy xoay lại cho đúng hướng ở trên: mặt trước nhìn -Y, đỉnh sao lên +Z.
- Vật liệu:
  - Base Color vàng kim loại; Metallic 1; Roughness 0,15–0,25.
  - Lõi giữa dùng Emission màu cam (#ff8418), độ mạnh 2–3.
- Không cần Empty, không cần hoạt ảnh.

**Lời nhắn mẫu gửi ChatGPT** (dán kèm mẫu ở mục 5.2 của bộ prompt 3D):

```
Model: items/result-star. It is a rating star shown face-on to the camera. Front face must point to Blender -Y,
top point to +Z, origin at the centre, longest edge 2 m. Triangle budget 3000. Gold PBR (metallic 1, roughness
0.2), the centre crystal uses Emission strength 2.5, colour #ff8418. No sockets, no animation, no lights.
Help me: <what you need, e.g. "add a crisp bevel on all facet edges so they catch light">.
```

## 3. Khiên vỡ sẵn — `items/result-shield`

**Game dùng nó thế nào:**
- Mỗi **mesh con** trong file là một mảnh vỡ.
- Game tự đẩy các mảnh bay ra từ điểm va chạm (hơi lệch phải, xuống dưới tâm), tự xoay, tự cho trôi.
- Vật liệu có tên chứa **`Fracture`** được game thay bằng màu "kim loại nóng": trắng, rồi cam, rồi đỏ sẫm.
- Vật liệu còn lại là mặt khiên; game cho phần phát sáng (emissive) của nó chập chờn rồi tắt.
- Không cần hoạt ảnh.

**Hình dạng và hướng:**
- Lục giác **đỉnh nhọn ở trên** (một đỉnh chĩa lên +Z), mặt trước nhìn **-Y** trong Blender.
- Dày khoảng 1/10 bề rộng.
- Tâm ở giữa.

**Phần riêng của lời nhắc ảnh khái niệm:**

```
A hexagonal pilot holo-shield emblem for a sci-fi space game, pointy-top hexagon, about one tenth as thick as
it is wide: gunmetal blue armour plate (#24324a) with a raised bevelled rim, an engraved inner hexagon line
and a winged chevron insignia in the centre, glowing cyan emissive lines (#5fe3ff) along the inner hexagon and
the insignia outline, light scratches and wear on the metal. Single intact object, front view shows the
insignia clearly.
```

**Tripo3D / Meshy:**
- Image to 3D, PBR, face limit 4000 (khiên còn nguyên).
- Tải về, lưu bản gốc ở `art-src/3d/items/result-shield.glb`. Không sửa file này.
- Món này không có ảnh 2D trong `art-src/`, nên dùng thư mục theo loại (`items`). Quy tắc chung: `art-src/3d/README.md`.

**Blender – cắt vỡ bằng Cell Fracture:**
1. Import file, chạy script với `kind="items"`, `id="result-shield"`, `target_triangles=3000`, `make_sockets=False`, `export=False`. Xoay lại cho đúng hướng ở trên.
2. Bật add-on **Cell Fracture** (Edit > Preferences > Add-ons, tìm "Cell Fracture").
3. Tạo nguồn điểm vỡ:
   - Thêm một Empty hoặc một đám hạt (particles) nhỏ, đặt **hơi lệch phải và xuống dưới tâm** khiên, chỗ trúng đòn.
   - Mảnh nhỏ dày ở gần điểm này, thưa dần ra mép.
4. Chọn khiên, chạy Object > Quick Effects > Cell Fracture với:
   - Source Limit: 30–40 mảnh.
   - Noise: 0,3.
   - Bật **Interior material slot** và đặt tên vật liệu đó là **`Fracture`**: màu đen ánh kim, Emission đỏ cam yếu. Game sẽ thay vật liệu này khi chạy.
   - Bật **Recenter** để mỗi mảnh có tâm riêng.
5. Xóa khiên gốc. Đặt tên các mảnh `Shard_01`, `Shard_02`… Gom tất cả vào một Collection.
6. Tổng tam giác các mảnh: 3.000–8.000.
7. Chạy lại script, chỉ để `export = True`. Script xuất `art-src/models/items/result-shield.glb`.

**Lời nhắn mẫu gửi ChatGPT:**

```
Model: items/result-shield, a pointy-top hexagon emblem that the game shatters at runtime. Front faces Blender -Y,
one corner points to +Z, origin at the centre, longest edge 2 m. I need it pre-fractured with Cell Fracture into
30-40 separate mesh objects (Shard_01...), denser near an impact point slightly right of and below the centre,
each shard with its own origin (Recenter). The inner fracture faces must use a material named exactly
"Fracture"; the outer faces keep the gunmetal PBR material with cyan Emission lines (strength 2). Total triangles
3000-8000. No animation, no lights. Help me: <what you need>.
```

## 4. Âm thanh

Màn kết quả dùng lại âm thanh có sẵn, **không cần file mới**. Các âm này đọc file trong `src/assets/audio/ui/` nếu có, không có thì game tự tổng hợp:
- `reward-small`, `reward-big`: sao chạm ô;
- `shield-break`: khiên vỡ.

Nếu muốn âm riêng, theo đúng kiểu "phim chiến tranh" đã thống nhất cho Duel:

| File | Thư mục | Mô tả để tạo |
|---|---|---|
| `result-star-slam.ogg` | `src/assets/audio/ui/` | Cú đập kim loại nặng, ngắn 0,4 s: tiếng "thụp" trầm và vang kim loại, có lớp lửa xẹt ở cuối. Không chuông, không "ting". |
| `result-star-final.ogg` | cùng thư mục | Như trên nhưng dày hơn, thêm một hồi kèn đồng ngắn 1 s. |
| `result-shield-shatter.ogg` | cùng thư mục | Giáp năng lượng vỡ: tiếng điện chập, kính kim loại vỡ, rồi đuôi lửa cháy âm ỉ 1,5 s. |

Có file rồi thì báo để nối vào `Sfx.ts`. Hiện chưa nối.
