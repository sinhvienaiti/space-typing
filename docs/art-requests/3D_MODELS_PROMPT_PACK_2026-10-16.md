# Bộ prompt 3D: tàu, quái, boss, kỹ năng, trang bị, shop (16/10/2026)

> **Cập nhật 16/10/2026 (chủ dự án chốt):** chủ dự án chỉ tạo mô hình trên Tripo3D / Meshy, còn AI chỉnh trong Blender. Prompt dán thẳng vào Tripo/Meshy (109 món) nằm ở **`docs/art-requests/3D_TRIPO_MESHY_PROMPTS_2026-10-16.md`**. Script Blender đã chạy được không cần giao diện (`--input … --kind … --id …`). Mục 3 (ảnh khái niệm ChatGPT) và mục 5 (tự chỉnh Blender) dưới đây không còn bắt buộc. Quy chuẩn ở mục 2 (hướng, điểm gắn, tên hoạt ảnh) vẫn giữ.

> **Dành cho:**
> - chủ dự án;
> - ChatGPT (tạo ảnh khái niệm và hướng dẫn Blender);
> - Tripo3D và Meshy (tạo mô hình 3D);
> - Blender (chỉnh và thêm hiệu ứng).
>
> **Bối cảnh:** đề xuất ở `docs/ONLINE_RETENTION_UIUX_3D_PROPOSAL_2026-10-16.md` (phần C); việc đã làm ở `docs/LIVEOPS_UIUX_3D_IMPLEMENTATION_2026-10-16.md`.
>
> **Code đã sẵn sàng.** Đặt file `.glb` đúng tên, đúng thư mục, chạy `pnpm models:prepare` rồi build. Game tự dùng mô hình ở mức Medium trở lên. Thiếu mô hình nào thì món đó vẫn dùng ảnh vẽ 2D như cũ.

## 0. Làm theo thứ tự nào

**Đợt 1 – bản thử (làm ngay, 6 món):**

| Món | Đường dẫn file |
|---|---|
| Tàu Vanguard | `ships/vanguard` |
| Quái Dart (khung chung cho cả 8 họ) | `enemies/scout` |
| Boss G01 thêm 3 đoạn hoạt ảnh | `bosses/tyrant-g01` |
| Tên lửa của kỹ năng Missile Swarm | `skills/micro-missile` |
| Súng Pulse Laser Mk.I (trang bị) | `items/pulse-laser-mk1` |
| Hộp Repair Kit (vật phẩm shop) | `items/repair-kit` |

**Sau đó:** chủ dự án chơi thử qua portal, so sánh với bản 2D (thêm `?model3d=off` vào địa chỉ để xem bản cũ). Chỉ khi duyệt xong mới làm **đợt 2** (mục 7). Như vậy, nếu cần chỉnh phong cách thì không phải làm lại hàng chục mô hình.

## 1. Quy trình 5 bước cho mỗi mô hình

| Bước | Công cụ | Đầu ra (đường dẫn tính từ `games/space-typing/`) |
|---|---|---|
| 1. Ảnh khái niệm | ChatGPT Images | `art-src/models/concepts/<kind>/<id>-front.png`, `-left.png`, `-back.png`, `-right.png`, `-34.png` |
| 2. Tạo mô hình | Tripo3D hoặc Meshy | `art-src/3d/<đường dẫn ảnh 2D>/<tên ảnh 2D>.glb` (bản gốc tải về, giữ để làm lại; xem ghi chú dưới bảng) |
| 3. Chỉnh trong Blender | Blender + script có sẵn + ChatGPT hướng dẫn | `art-src/models/blend/<kind>/<id>.blend` (file làm việc) |
| 4. Xuất file game | Blender (script tự xuất) | **`art-src/models/<kind>/<id>.glb`** |
| 5. Đóng gói | `pnpm models:prepare` | `public/assets/space-typing/models/<kind>/<id>/<id>.high.glb`, `.medium.glb` và `models/manifest.json` |

- `<kind>` là một trong: `ships`, `enemies`, `bosses`, `skills`, `items`.
- `<id>` viết thường, chỉ chữ, số và gạch ngang (ví dụ `vanguard`, `tyrant-g01`, `pulse-laser-mk1`).
- Thư mục `art-src/` không đưa lên Git (đã có trong `.gitignore`). Từ 21/10/2026 các file GLB trong `public/assets/space-typing/models/` cũng không đưa lên Git; chỉ `manifest.json` được commit.
- Bản gốc ở bước 2 nằm cùng đường dẫn với ảnh 2D: `art-src/<đường dẫn>/<tên>.png` → `art-src/3d/<đường dẫn>/<tên>.glb`.
  - Ví dụ: `art-src/enemies/frost-healer.png` → `art-src/3d/enemies/frost-healer.glb`.
  - Tàu: `art-src/ships/ship-NN-<id>-2d.png` → `art-src/3d/ships/ship-NN-<id>.glb`. Vanguard: `art-src/3d/ships/ship-01-vanguard.glb`.
  - Quy tắc đầy đủ: `art-src/3d/README.md`.
  - Bước 2 lấy đường dẫn của **ảnh 2D trong game** (`art-src/enemies/…`, `art-src/bosses/…`), không phải ảnh khái niệm ở bước 1. Bước 1 nay thay bằng `docs/art-requests/3D_TRIPO_MESHY_PROMPTS_2026-10-16.md` (tải thẳng ảnh 2D của game lên Tripo/Meshy).

**Bước 5 làm gì:**
- Kiểm tra mô hình đủ điểm gắn, đủ hoạt ảnh và đúng số tam giác.
- Nén hình học (meshopt) và đổi texture sang WebP.
- Tạo hai bản: High dùng texture 2048, Medium dùng texture 1024. Nếu vượt ngân sách tam giác thì bản Medium được giảm tam giác.
- Ví dụ thật với boss G01: 12,6 MB còn 3,2 MB (bản High) và 1,4 MB (bản Medium).

Chạy trong `games/space-typing`:

```bash
pnpm models:prepare                        # tất cả
pnpm models:prepare --only ships/vanguard  # một mô hình
```

Rồi ở thư mục gốc `typing-game`: `pnpm build:space`, tải lại trang.

## 2. Quy chuẩn chung (mọi mô hình)

| Mục | Quy định |
|---|---|
| Phong cách | Game khoa học viễn tưởng pha huyền ảo, tạo hình gọn và rõ. Vật liệu PBR thật (kim loại, gốm, kính, pha lê), có phần **tự phát sáng** (emissive) cho lõi năng lượng, động cơ và đường viền. Hợp với tranh vẽ hiện có của game. |
| Hướng | Trong Blender: **mũi tàu hướng +Y**, phía trên là +Z, tâm ở giữa vật. Xuất glTF dùng "+Y up" (script tự đặt). |
| Kích thước | Không quan trọng, vì game tự co theo khung bao. Script đặt cạnh dài nhất = 2 m. |
| Tam giác | Tàu 8–15 nghìn · Quái 2–5 nghìn · Boss 20–40 nghìn · Đạn/kỹ năng 0,3–3 nghìn · Trang bị/vật phẩm 2–8 nghìn. Script `models:prepare` báo lỗi nếu quá ít; nếu quá nhiều thì tự giảm ở bản Medium. |
| Texture | PBR: Base Color, Metallic-Roughness, Normal, Emissive. Bản gốc 2048 (boss, tàu) hoặc 1024 (quái, vật phẩm). Không dùng texture 4K. |
| Điểm gắn hiệu ứng | Là **Empty** trong Blender, đặt tên **chính xác** như bảng dưới, gắn (parent) vào mesh hoặc armature. Game treo lửa động cơ, ánh sáng, hạt vào đây. |
| Hoạt ảnh | Mỗi đoạn là một **Action** đẩy vào **NLA track** có tên **chính xác** như bảng dưới. 24 khung hình/giây. |
| Cấm | Không chữ, không logo, không mặt đất, không bóng đổ nướng sẵn dưới đáy, không đèn hay camera trong file. |

**Điểm gắn và hoạt ảnh theo loại** (theo `src/render3d/model-contracts.ts`):

| Loại | Điểm gắn bắt buộc | Điểm gắn tùy chọn | Hoạt ảnh |
|---|---|---|---|
| `ships` | `FX_ENGINE_L`, `FX_ENGINE_R` (miệng 2 động cơ), `FX_MUZZLE` (mũi súng), `FX_CORE` (lõi năng lượng) | `FX_ENGINE_C` (động cơ giữa, tàu 3 động cơ), `FX_WING_L`, `FX_WING_R` (đèn đầu cánh) | `Ship_Idle` (tùy chọn, 2 giây, lặp) |
| `enemies` | `FX_CORE` | `FX_MUZZLE`, `FX_WEAKPOINT` | `Enemy_Idle` (1 giây, lặp; game chụp thành 16 khung) |
| `bosses` | `FX_CORE`, `FX_CAST_L`, `FX_CAST_R`, `FX_HALO` | `FX_WEAKPOINT`, `FX_MOUTH` | `Boss_Idle_Hover` (bắt buộc), một đoạn tung chiêu có `Boss_Skill` trong tên, và tùy chọn `Boss_Hit`, `Boss_Death`, `Boss_Intro` |
| `skills` | không | `FX_TRAIL` (đuôi) | không cần (game tự xoay) |
| `items` | không | `FX_CORE` | `Item_Idle` (tùy chọn) |

## 3. Bước 1 – ảnh khái niệm (ChatGPT Images)

Tripo3D và Meshy dựng mô hình tốt nhất từ **nhiều góc cùng một vật**. Tạo **5 ảnh riêng**, mỗi ảnh một góc, trong cùng một cuộc trò chuyện để giữ đúng thiết kế:
- `front`, `left`, `back`, `right`: dùng cho chế độ nhiều góc (Multiview) của Tripo3D;
- `34`: góc 3/4 từ trên, dùng cho chế độ một ảnh, hoặc làm ảnh chính trong Meshy.

**Phần chung (dán đầu mọi lời nhắc ảnh khái niệm):**

```
3D model reference image for an image-to-3D tool. One single object, centred, full object visible with
margin, orthographic-looking camera (no strong perspective), plain neutral light-grey background (#d9d9d9),
soft even studio lighting with no harsh shadows, no cast shadow on the ground, clean readable shapes,
physically based materials (painted metal, ceramic armour, glass, crystal) with clearly separated glowing
emissive parts, premium sci-fi fantasy game style, no text, no logo, no watermark, no other objects.
```

**Dòng góc nhìn** (thêm vào cuối, mỗi ảnh một dòng):

| Tên file đuôi | Dòng thêm vào cuối lời nhắc |
|---|---|
| `-front` | `View: exact FRONT view, looking straight at the nose/face of the object.` |
| `-left` | `View: exact LEFT SIDE view (profile), nose pointing to the left of the image.` |
| `-back` | `View: exact BACK view, looking straight at the rear/engines.` |
| `-right` | `View: exact RIGHT SIDE view (profile), nose pointing to the right of the image.` |
| `-34` | `View: three-quarter view from above and slightly in front, showing top, front and one side.` |

Với ảnh thứ 2 trở đi, thêm câu: `Keep exactly the same design, proportions, colours and details as the previous image.`

## 4. Bước 2 – Tripo3D hoặc Meshy

Tên nút và chế độ có thể đổi theo phiên bản. Ý chính như sau.

**Tripo3D (ưu tiên cho tàu, quái, vật phẩm):**
1. Chọn **Multiview to 3D** và đưa 4 ảnh `front/left/back/right`. Nếu không có chế độ này, dùng **Image to 3D** với ảnh `-34`.
2. Bật **texture chất lượng cao (HD)** và **PBR**.
3. Giới hạn số mặt (face limit) theo ngân sách ở mục 2 (ví dụ tàu 15000).
4. Hình học: dạng **tam giác**. Không cần quad.
5. **Auto-rig:** chỉ bật cho boss có tay chân (dạng người hoặc thú). Tàu, quái nhỏ, đạn, vật phẩm thì tắt.
6. Tải về dạng **GLB**, lưu vào `art-src/3d/`, cùng đường dẫn và cùng tên với ảnh 2D (xem mục 1).

**Meshy (ưu tiên cho boss lớn, nhiều chi tiết):**
1. Chọn **Image to 3D** (hoặc Multi-image, tối đa 4 ảnh).
2. Đối xứng (**Symmetry**): bật cho tàu, quái và boss đối xứng.
3. Hình học (**Topology**): Triangle. Số đa giác mục tiêu (**Target polycount**) theo ngân sách.
4. Bật **PBR**. Texture 2K.
5. Nếu cần khung xương: dùng chức năng **Rigging/Animation** của Meshy cho boss dạng người. Lưu ý: G01 hiện có khung xương 64 khớp làm từ Meshy.
6. Tải **GLB**, lưu như trên.

**Dự phòng bằng văn bản:** khi chỉ có chữ (Text to 3D), dùng **phần riêng** của mỗi món (mục 6, 7) và thêm:

```
game asset, PBR textures, clean topology, emissive glowing parts, symmetrical, sci-fi fantasy, no base, no ground
```

## 5. Bước 3 – Blender (ChatGPT hướng dẫn và thêm hiệu ứng)

### 5.1 Script có sẵn
File: **`games/space-typing/scripts/models/blender/space_typing_model_tools.py`**

Cách chạy:
1. Mở Blender, xóa cảnh mặc định: **File > New > General**, rồi xóa Cube, Light, Camera.
2. **File > Import > glTF 2.0**, chọn file gốc trong `art-src/3d/...`.
3. Mở tab **Scripting**, mở script, sửa khối `CONFIG` (`kind`, `id`, `target_triangles`…) theo bảng của từng món.
4. Bấm **Run**.

Script tự làm 7 việc:
1. gộp mesh;
2. căn tâm, xoay mũi về +Y;
3. giảm tam giác;
4. tăng độ phát sáng cho phần emissive;
5. tạo các Empty `FX_...` ở vị trí mặc định;
6. tạo các đoạn hoạt ảnh mẫu;
7. xuất `art-src/models/<kind>/<id>.glb`.

Sau khi chạy: **kéo các Empty `FX_...` về đúng chỗ** (miệng động cơ, nòng súng, lõi). Sau đó chạy lại riêng bước xuất: đặt các mục khác `False`, chỉ để `export = True`.

### 5.2 Lời nhắn mẫu gửi ChatGPT (dán khi cần trợ giúp trong Blender)

```
I am preparing a game-ready GLB for my browser game "Space Typing" (three.js). Help me step by step in
Blender (version: <your version>). Model: <kind>/<id>. Requirements:
- Nose along Blender +Y, Z up, origin at the visual centre; export glTF 2.0 binary (.glb), +Y up.
- Triangle budget: <budget>. PBR materials (Base Color, Metallic/Roughness, Normal, Emission).
  Glowing parts must use Emission (strength 2–5) so the game bloom picks them up.
- Sockets are Empties parented to the mesh/armature, named exactly: <socket list>.
- Animation clips are Actions pushed to NLA tracks named exactly: <clip list>, 24 fps.
  Export with Animation mode "NLA Tracks" (or "Actions"), include skins if rigged.
- No lights, cameras, ground planes or text in the file.
I already ran scripts/models/blender/space_typing_model_tools.py. Now I need: <what you need, e.g.
"place FX_ENGINE_L/R exactly at the two engine nozzle exits", "make the Boss_Hit clip feel heavier",
"add a glowing hex pattern to the shield emission texture", "rig the wings to flap in Enemy_Idle">.
```

### 5.3 Hiệu ứng nên làm trong Blender (theo loại)
- **Tàu:**
  - Vẽ emissive cho đường viền giáp, lõi pha lê và miệng động cơ (màu theo bảng tàu).
  - Không làm lửa động cơ trong Blender: game tự vẽ lửa theo tốc độ gõ, gắn tại `FX_ENGINE_*`.
- **Quái:**
  - Thân màu **trắng gốm/bạc trung tính** với lõi phát sáng trắng. Game tô màu họ (Rainbow, Devil, Frost…) bằng đèn viền, nên một mô hình dùng được cho cả 8 họ.
  - Muốn bản riêng cho một họ thì đặt tên `<họ>-<loại>` (ví dụ `devil-scout`).
- **Boss:**
  - Các đoạn hoạt ảnh nặng, rõ:
    - `Boss_Hit`: giật lùi khi trúng đòn, 0,5 giây;
    - `Boss_Death`: gục, xoắn, rơi, 2 giây;
    - `Boss_Intro`: bay vào từ xa, vươn mình, 2,5 giây.
  - Emissive mạnh ở lõi và hai tay tung chiêu (`FX_CAST_L/R`).
- **Kỹ năng:** chỉ làm vật có hình khối (tên lửa, đạn ray, drone). Các hiệu ứng thuần ánh sáng (khiên lục giác, sóng EMP, vùng làm chậm) game làm bằng shader, **không cần mô hình**.
- **Trang bị, vật phẩm:** emissive ở bộ phận năng lượng. Game chụp mô hình xoay một vòng (24 khung) và cho xoay khi rê chuột vào thẻ.

## 6. Đợt 1 – bản thử (6 món)

### 6.1 Tàu Vanguard — `ships/vanguard`
- **Ảnh tham chiếu đính kèm khi tạo ảnh khái niệm:**
  - `docs/art-requests/vanguard-3d-pilot/vanguard-reference.png`
  - `art-src/ships/vanguard-top-hd.png`
- **Màu:** chính #84f6ff, phụ #4d85ff, lõi #7af2ff. Dáng "spear" (ngọn giáo), 2 động cơ, tàu khởi đầu cân bằng.
- **Phần riêng của lời nhắc ảnh khái niệm** (dán sau phần chung, kèm ảnh tham chiếu):

```
Use the attached spaceship as the exact design reference and turn it into a clean 3D model reference.
Vanguard, a sleek spear-shaped starter interceptor: long pointed nose, a glowing cyan crystal spine running
along the top centre (energy core), swept-back wings with small upturned tips, two engines at the rear on
either side of the spine, pearl-white ceramic armour with royal blue panels (#4d85ff) and thin glowing cyan
lines (#84f6ff), dark blue glass canopy, twin small cannons under the nose. Balanced, heroic, readable
from straight above.
```

- **Tripo/Meshy:** face limit 15000, Symmetry bật, auto-rig tắt.
- **CONFIG trong Blender:** `kind="ships"`, `id="vanguard"`, `target_triangles=12000`, `nose_axis` tùy hướng file tải về (xem mũi đang hướng trục nào).
- **Điểm gắn:**
  - `FX_ENGINE_L`, `FX_ENGINE_R`: tâm miệng hai động cơ, ở đuôi;
  - `FX_MUZZLE`: đầu nòng dưới mũi;
  - `FX_CORE`: giữa sống pha lê;
  - `FX_WING_L`, `FX_WING_R`: đầu cánh.
- **Hoạt ảnh:** `Ship_Idle` (script tạo sẵn). Có thể thêm cánh phụ khẽ chuyển động.
- **File cuối:** `art-src/models/ships/vanguard.glb`.
- **Trong game:** tàu 3D thay ảnh vẽ ở Campaign (Medium trở lên). Khi tàu chao, thân nghiêng thật. Lửa động cơ và đèn bám đúng các điểm gắn. Thêm `?model3d=off` để so với bản 2D.

### 6.2 Quái Dart (khung chung) — `enemies/scout`
- **Ảnh tham chiếu:** `src/assets/enemies/rainbow-scout@2x.webp` (chỉ lấy dáng, **không lấy màu**).
- **Phần riêng:**

```
Dart, a small agile alien scout drone shaped like a dart with swept-back wings, built for speed: a narrow
pointed body, two swept wings, a small tail fin, one round glowing core in the centre of the back.
Neutral materials so it can be recoloured by light: pearl-white ceramic shell with light silver metal
joints, the core and the wing edges glowing pure white. Cute but dangerous, chunky readable shape.
```

- **Tripo/Meshy:** face limit 4000, Symmetry bật.
- **CONFIG:** `kind="enemies"`, `id="scout"`, `target_triangles=3500`.
- **Điểm gắn:** `FX_CORE` (lõi), `FX_MUZZLE` (mũi).
- **Hoạt ảnh:** `Enemy_Idle` 1 giây (script tạo sẵn; có thể thêm cánh rung).
- **File cuối:** `art-src/models/enemies/scout.glb`.
- **Trong game:** mọi quái Dart ở mọi họ dùng mô hình này, có đèn viền theo màu họ. Game chụp sẵn 16 khung khi tải thế giới, nên không tốn GPU trong trận.

### 6.3 Boss G01 Auriel — thêm 3 đoạn hoạt ảnh — `bosses/tyrant-g01`
- **Làm trên file Blender đang có của G01.** Giữ nguyên 2 đoạn cũ: `__SPACE_TYPING_EXPORT__00_Boss_Idle_Hover_V3` và `__SPACE_TYPING_EXPORT__01_Boss_Skill_Prismatic_Burst_V3`. Giữ khung xương 64 khớp và 4 điểm gắn `FX_CORE`, `FX_CAST_L`, `FX_CAST_R`, `FX_HALO`.
- **Thêm 3 Action, mỗi cái một NLA track, tên chính xác:**
  - `Boss_Hit` (12 khung = 0,5 s): giật mạnh ra sau, cánh khựng lại rồi về tư thế đứng.
  - `Boss_Death` (48 khung = 2 s): rùng mình, cánh gãy gập, xoay nghiêng, rơi xuống và nhỏ dần.
  - `Boss_Intro` (60 khung = 2,5 s): từ xa bay tới, cánh xòe dần, kết thúc đúng tư thế đầu của `Boss_Idle_Hover`.
- **Cách nhanh:** chạy script với `kind="bosses"`, `id="tyrant-g01"`, `join_meshes=False`, `normalize=False`, `target_triangles=0`, `make_sockets=False`. Script sẽ tạo 3 đoạn bằng chuyển động thân (không động vào xương).
- **Cách đẹp hơn:** nhờ ChatGPT hướng dẫn tạo 3 đoạn bằng **xương cánh và thân**, dùng lời nhắn ở 5.2.
- **Xuất:** `art-src/models/bosses/tyrant-g01.glb` (file này được ưu tiên hơn bản gốc `art-src/3d/bosses/tyrant-g01.glb`).
- **Trong game (code đã có):**
  - `Boss_Intro` chạy khi boss bay vào;
  - `Boss_Hit` chạy mỗi lần boss nhận sát thương (gõ xong từ, trúng kỹ năng, phản đòn);
  - `Boss_Death` chạy khi xác boss rơi.

### 6.4 Tên lửa Missile Swarm — `skills/micro-missile`
- **Phần riêng:**

```
A compact homing micro-missile for a spaceship: slim white body with orange warning bands, a dark sensor
tip, four small swept tail fins, a glowing orange exhaust nozzle at the rear, tiny blue status light on the side.
Clean military sci-fi design.
```

- **Tripo/Meshy:** face limit 1000.
- **CONFIG:** `kind="skills"`, `id="micro-missile"`, `target_triangles=800`; mũi hướng +Y.
- **Điểm gắn:** `FX_TRAIL` ở miệng xả (script đặt sẵn ở đuôi).
- **File cuối:** `art-src/models/skills/micro-missile.glb`.
- **Trong game:** 8 tên lửa của kỹ năng Missile Swarm dùng mô hình này, vừa bay vừa xoay quanh trục; khói và lửa vẫn do game vẽ.

### 6.5 Súng Pulse Laser Mk.I — `items/pulse-laser-mk1`
- **Ảnh tham chiếu:** `src/assets/icons/equipment/pulse-laser-mk1.webp`.
- **Phần riêng:**

```
Pulse Laser Mk.I, a compact ship-mounted twin-barrel pulse laser cannon module: two short parallel barrels
with glowing cyan emitter rings at the tips, an armoured gunmetal housing with white panels, cooling fins,
a small cyan energy cell visible on the side, a mounting bracket underneath.
```

- **Tripo/Meshy:** face limit 5000.
- **CONFIG:** `kind="items"`, `id="pulse-laser-mk1"`, `target_triangles=4000`, `make_sockets=False`.
- **File cuối:** `art-src/models/items/pulse-laser-mk1.glb`.
- **Trong game:** biểu tượng ở hộp thoại Trang bị và Shop thành ảnh 3D có ánh sáng, tự xoay khi rê chuột vào thẻ.

### 6.6 Repair Kit — `items/repair-kit`
- **Ảnh tham chiếu:** `src/assets/icons/items/repair-kit.webp`.
- **Phần riêng:**

```
Repair Kit, a compact armoured field repair case: rounded rectangular box of white and graphite armour,
a glowing emerald green cross panel on the lid (#5dffaa), small handle on top, side latches, tiny nanite
sparks hovering around it.
```

- **CONFIG:** `kind="items"`, `id="repair-kit"`, `target_triangles=3000`, `make_sockets=False`.
- **File cuối:** `art-src/models/items/repair-kit.glb`.

## 7. Đợt 2 – sau khi duyệt bản thử

Mỗi dòng dưới đây gồm **phần chung** (mục 3), **ảnh tham chiếu** và **phần riêng** ghi trong bảng. Cách làm giống đợt 1.

### 7.1 Tàu (10) — `ships/<id>`
- **Ảnh tham chiếu:** `art-src/ships/<id>-top-hd.png`.
- **Ngân sách:** 8–15 nghìn tam giác.
- **Điểm gắn:** như Vanguard. Tàu 3 động cơ thêm `FX_ENGINE_C`. Tàu 1 động cơ đặt `FX_ENGINE_L` và `FX_ENGINE_R` sát nhau ở miệng động cơ.

| id | Dáng, động cơ | Màu (chính / phụ / lõi) | Phần riêng |
|---|---|---|---|
| `aegis` | fortress, 3 | #8ff4da / #4b8f84 / #ffd77d | `Aegis, a heavy defensive frigate shaped like a flying fortress: broad armoured hull, layered shield plates on both flanks, three rear engines, mint and teal armour with a warm gold core` |
| `volt` | arc, 2 | #65e8ff / #536dff / #fff174 | `Volt, an energy caster ship with curved arc-shaped wings holding tesla coils, crackling yellow-white core, cyan and indigo armour` |
| `wraith` | phantom, 2 | #b89aff / #4d416f / #8be7ff | `Wraith, a stealth phantom ship with thin blade-like wings and a narrow body, smoky violet armour, cyan glowing slits` |
| `fortune` | crown, 2 | #ffe37a / #d58d42 / #8ff7d5 | `Fortune, a lucky treasure-hunter ship with a crown-shaped bow, gold and bronze plating, mint gem core` |
| `arsenal` | blade, 3 | #ff9c71 / #9d3d47 / #ffe06c | `Arsenal, a weapon platform ship with blade wings carrying many gun pods, coral orange and wine red armour, three engines` |
| `oracle` | crown, 1 | #f1a2ff / #694b9e / #74ecff | `Oracle, a precision seer ship with a large lens eye at the nose and a crown crest, orchid and violet armour, one engine` |
| `bastion` | fortress, 3 | #78efc3 / #3d756e / #83dfff | `Bastion, a shield support carrier with four floating shield emitters around a square fortress hull, seafoam armour` |
| `reaper` | blade, 2 | #ff7894 / #6b2848 / #d9a0ff | `Reaper, an aggressive raider with scythe-shaped wings and a sharp hooked nose, crimson-pink and dark plum armour` |
| `celestial` | arc, 2 | #91bfff / #6658c9 / #fff19b | `Celestial, a late-game hybrid ship with halo-like arc wings and star motifs, periwinkle and indigo armour, pale gold star core` |
| `zenith` | spear, 3 | #8ffcff / #956dff / #fff3a0 | `Zenith, the apex flagship: long spear hull with prism fins, three engines, white-cyan and violet armour, radiant gold core` |

### 7.2 Quái (13 khung chung còn lại) — `enemies/<kind>`
- **Phần riêng:** lấy câu của loại tương ứng trong `docs/art-requests/ENEMIES_BOSSES.md` (mục 5), rồi thêm câu vật liệu trung tính:

```
Neutral materials so it can be recoloured by light: pearl-white ceramic shell with light silver metal parts,
glowing parts pure white.
```

- **Ảnh tham chiếu (lấy dáng):** `src/assets/enemies/<họ>-<loại>@2x.webp` của một họ bất kỳ.
- **Ngân sách:** 2–5 nghìn tam giác.
- **Điểm gắn:** `FX_CORE` (+ `FX_MUZZLE` nếu bắn).
- **Hoạt ảnh:** `Enemy_Idle` 1 giây.
- **Các loại:** `mine`, `tank`, `destroyer`, `oppressor`, `shield`, `carrier`, `jammer`, `cloaker`, `healer`, `splitter`, `sniper`, `leech`, `commander`.
- **Bản riêng theo họ (tùy chọn, sau cùng):** `enemies/<họ>-<loại>`. Dùng câu vật liệu của họ trong `ENEMIES_BOSSES.md` mục 4, thay cho câu trung tính.

### 7.3 Boss (25 còn lại) — `bosses/<id>`
- **Phần riêng:** câu mô tả boss trong `docs/art-requests/ENEMIES_BOSSES.md` (mục 6).
- **Ảnh tham chiếu:** `src/assets/bosses/<id>@2x.webp`.
- **Danh sách id:**
  - `tyrant-g02` … `tyrant-g10`;
  - `warden-<họ>` ×8;
  - `lieutenant-<họ>` ×8.
- **Ngân sách:** Tyrant 25–40 nghìn, Warden 20–30 nghìn, Lieutenant 12–20 nghìn tam giác.
- **Điểm gắn:** `FX_CORE`, `FX_CAST_L`, `FX_CAST_R`, `FX_HALO`.
- **Hoạt ảnh:** `Boss_Idle_Hover`, `Boss_Skill_<tên>`, `Boss_Hit`, `Boss_Death`, `Boss_Intro`. Boss dạng người hoặc thú thì auto-rig rồi làm bằng xương. Boss dạng vật thể (mắt, cây, khối pha lê) thì dùng chuyển động thân từ script.
- **Lưu ý code:** hiện code chỉ nối sẵn mô hình 3D cho G01. Thêm boss khác cần một dòng hợp đồng trong `src/boss/model-3d-contract.ts`. AI làm code sẽ thêm khi file tới.

### 7.4 Kỹ năng có hình khối — `skills/<id>`

| id | Dùng cho | Phần riêng |
|---|---|---|
| `railgun-slug` | Railgun | `a glowing magnetic railgun slug: elongated tungsten dart with blue-white plasma rings around it` |
| `orbital-lance` | Orbital Strike | `a long orbital strike lance: white-gold spear-shaped kinetic rod with glowing runes and stabiliser fins` |
| `sentinel-drone` | Sentinel Drones | `a small round escort drone with a single cyan lens eye, two side thrusters and a tiny shield emitter` |
| `gravity-core` | Singularity | `a fist-sized gravity bomb: dark metal cage holding a swirling black sphere with a violet accretion ring` |

Hiện chỉ `micro-missile` được nối vào code. Các món trên cần nối thêm khi file tới.

### 7.5 Trang bị (41 còn lại) và vật phẩm (11 còn lại) — `items/<id>`
- **id:** đúng tên file biểu tượng hiện có:
  - `src/assets/icons/equipment/<id>.webp` (ví dụ `ion-cannon-mk1`, `phase-shield-mk3`);
  - `src/assets/icons/items/<id>.webp` (ví dụ `nova-bomb`, `phoenix-core`).
- **Phần riêng:** lấy câu của món đó trong `docs/art-requests/SKILLS_EQUIPMENT_ICONS.md` (mục 5) hoặc `docs/art-requests/UI_ROUND2_ART_AND_AUDIO_2026-10-04.md` (mục A.3).
- **Ảnh tham chiếu:** chính biểu tượng hiện có.
- **Ngân sách:** 2–6 nghìn tam giác. Không cần điểm gắn.
- **Trong game:** code đã nối cho mọi id. Có file là thẻ Trang bị và Shop tự đổi sang 3D xoay.

## 8. Kiểm tra trước khi báo xong
1. `pnpm models:prepare` không có dòng `ERROR`. Nếu có `note: … Medium tier will be simplified` thì vẫn được.
2. Mở `public/assets/space-typing/models/manifest.json` và thấy mục `<kind>/<id>`.
3. `pnpm build:space`, chơi qua portal ở mức **Medium** và **Ultra**.
4. So với bản 2D bằng `?model3d=off`.
5. **Lỗi thường gặp:**

| Hiện tượng | Nguyên nhân | Cách sửa |
|---|---|---|
| Mô hình nằm ngang hoặc ngược đầu | Sai `nose_axis` | Đổi `nose_axis`, chạy lại script |
| Lửa động cơ lệch khỏi tàu | Empty `FX_ENGINE_*` đặt sai | Kéo Empty về đúng miệng động cơ, xuất lại |
| Tối hoặc xám | Thiếu Base Color, hoặc emissive bằng 0 | Kiểm tra vật liệu; script tự tăng Emission Strength |
| `missing clip` | Tên NLA track sai | Sửa tên track, xuất bằng chế độ "NLA Tracks" |
| File quá nặng | Texture 4K hoặc quá nhiều tam giác | Giảm `target_triangles`; texture tối đa 2048 |
