# Prompt ảnh 2D → Tripo: nhà, bộ phận nhà, đồ rơi (Typing Defense, 22/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh bằng ChatGPT, dựng model bằng Tripo); ChatGPT (đọc file theo đường dẫn repo, tạo ảnh); AI làm tiếp (Blender, manifest).
> **Lấy từ:** `docs/td/TYPING_DEFENSE_DESIGN.md` mục 0.6, 8.4, 11, 12, 17.4, 20.4, 22.1–22.4, 22.7, 22.9, 23.1–23.12, 25.2, 25.12, 26.1, 27.2, 27.4. Bước đang làm là 1A, bản 2D không model (`docs/td/BUILD_NOW.md`). Bậc P ở đây phục vụ 1B và 1C.
> **File này:** bậc P và danh sách bậc Sau. **Bậc VS:** [`02-tripo-buildings-props-vs.md`](02-tripo-buildings-props-vs.md). Nhân vật, thợ, lính, quái, boss, trâu, heo đất, chuồn chuồn: `01-tripo-characters-enemies.md`. Mục lục và bảng việc của cả bộ: [`README.md`](README.md).

```text
Instructions for ChatGPT
1. The owner asks for items by number, for example "P1-P4". Make one image per file name, one subject per image.
2. Build each prompt from the parts on the item's "Prompt =" line, in that order, copied word for word:
   the blocks from section 4, then the item's English prompt, then its background line.
   Do not shorten, reorder or add style words.
3. Use the exact image size written on the item: 1024x1024 (square), 1024x1536 (portrait) or 1536x1024 (landscape).
4. Never draw text, letters, numbers, logos, signatures or watermarks.
5. Before showing an image, check it against the checklist in section 3.7.
   If it fails, regenerate it once yourself and say what you fixed.
6. With each image, give the exact file name and the full save path from the item,
   for example art-src/td/buildings/keep.png.
7. The owner may attach an approved image as a style sample. Match only its painting style,
   materials, lighting and camera angle. Never copy its shape or its parts.
8. If anything is unclear, or two rules disagree, ask the owner. Do not guess.
```

## 1. Cách làm (chủ dự án)

1. Mở một cuộc trò chuyện mới với ChatGPT. Gõ, ví dụ: `Trong repo sinhvienaiti/space-typing, nhánh feat/space-typing-2026-10-18, đọc docs/art-requests/td/02-tripo-buildings-props.md và tạo ảnh cho mục P1–P4.` Luôn ghi tên repo và nhánh: file chưa có ở `main`.
2. Xem từng ảnh theo bảng kiểm ở mục 3.7. Chưa đạt thì bảo ChatGPT làm lại.
3. Khi ảnh Lũy (P1) đã đạt, đính kèm `keep.png` làm ảnh mẫu phong cách cho mọi món sau. Thiết kế 27.4 dặn: prompt chung + ảnh mẫu.
4. Tải ảnh PNG gốc. Lưu đúng tên, đúng thư mục ghi ở món đó. Thư mục chưa có thì tạo.
5. Mở Tripo, chọn **Image to 3D**, đặt như mục 5. Tải **GLB**. Lưu đúng đường dẫn `art-src/3d/td/...` ghi ở món.
6. Ở thư mục gốc repo `typing-game`: chạy `node games/space-typing/scripts/models/index-3d-sources.mjs`, rồi `pnpm media:push`.
7. Báo AI tên các món đã xong.

- Mọi đường dẫn tính từ thư mục game `games/space-typing/`. Ví dụ: ảnh Lũy lưu ở `games/space-typing/art-src/td/buildings/keep.png`. Repo cha không có `art-src`.
- Quy tắc tên: ảnh `art-src/td/<loại>/<id>.png` → model `art-src/3d/td/<loại>/<id>.glb`.
- `art-src/` không vào Git. Ảnh, tiếng, model không bao giờ lên Git. `pnpm media:push` sao lưu chúng lên Google Drive (xem `docs/MEDIA_STORAGE.md` ở repo cha).
- Trước khi có model Tripo, 1C dùng model tạm (thiết kế 25.2): nhà `items/tower-*`, Lũy `items/defense-core`, túi `items/prop-crystal-a`, đạn `skills/dragon-fireball`.

Tự quyết: `<loại>` là `buildings`, `kits`, `branches`, `ruins`, `landmarks`, `props`, `loot`, `projectiles`.

## 2. Danh sách việc

### 2.1 Bậc P (cho 1B và 1C)

Thứ tự là thứ tự nên làm; P17, P18 (thêm sau) làm lúc nào cũng được. Model 3D: cùng đường dẫn trong `art-src/3d/td/`, đuôi `.glb`.

| Số | id | Tên | Ảnh 2D (trong `art-src/td/`) | Cỡ ảnh | Nền | Face limit |
|---|---|---|---|---|---|---|
| P1 | `keep` | Lũy Chữ cấp 1 | `buildings/keep.png` | 1024×1536 | BG-G | 15000 |
| P2 | `archer` | Tháp Cung cấp 1 | `buildings/archer.png` | 1024×1536 | BG-G | 10000 |
| P3 | `cannon` | Tháp Pháo cấp 1 (chưa có nòng) | `buildings/cannon.png` | 1024×1024 | BG-G | 10000 |
| P4 | `cannon-barrel` | Nòng Tháp Pháo cấp 1–2 | `buildings/cannon-barrel.png` | 1536×1024 | BG-G | 2000 |
| P5 | `barracks` | Trại Lính cấp 1 | `buildings/barracks.png` | 1024×1024 | BG-G | 10000 |
| P6 | `gold-mine` | Mỏ Vàng cấp 1 | `buildings/gold-mine.png` | 1024×1024 | BG-G | 10000 |
| P7 | `gold-mine-cart` | Xe goòng của Mỏ | `props/gold-mine-cart.png` | 1024×1024 | BG-G | 2000 |
| P8 | `gold-pile-1` … `gold-pile-4` | Đống vàng 4 bậc | `props/gold-pile-1.png` … `props/gold-pile-4.png` | 1024×1024 | BG-G | 2000 mỗi cái |
| P9 | `arrow` | Mũi tên Tháp Cung | `projectiles/arrow.png` | 1536×1024 | BG-G | 2000 |
| P10 | `shell` | Quả đạn Tháp Pháo | `projectiles/shell.png` | 1024×1024 | BG-G | 2000 |
| P11 | `keep-bolt` | Mũi nỏ Lũy | `projectiles/keep-bolt.png` | 1536×1024 | BG-G | 2000 |
| P12 | `farm` | Ruộng Lúa cấp 1 | `buildings/farm.png` | 1024×1024 | BG-M | 10000 |
| P13 | `bag-cloth` | Túi vải | `loot/bag-cloth.png` | 1024×1024 | BG-G | 2000 |
| P14 | `bag-basket` | Giỏ tre | `loot/bag-basket.png` | 1024×1024 | BG-G | 2000 |
| P15 | `chest-boss` | Rương Boss | `loot/chest-boss.png` | 1024×1024 | BG-G | 2000 |
| P16 | `seal-dais` | Đài Ấn cấp 1 (27.2: "nếu kịp") | `buildings/seal-dais.png` | 1024×1024 | BG-G | 10000 |
| P17 | `level-pennant` | Cờ cấp chung của mọi nhà | `props/level-pennant.png` | 1024×1536 | BG-G | 2000 |
| P18 | `root-burst` | Rễ Trồi của Mộc Tinh | `projectiles/root-burst.png` | 1024×1024 | BG-G | 4000 |

Tổng: 21 model. Bảng 27.2 ghi 6 nhà (Đài Ấn nếu kịp), túi vải, giỏ tre, Rương Boss; từ 22/10 ghi thêm Rễ Trồi. Tự quyết (22/10, đổi được): file này thêm 6 nhóm vào P, mỗi nhóm một lý do:
- `cannon-barrel`: nòng tách riêng để quay theo quái và giật khi bắn; cấp 3 chỉ cần đổi nòng.
- `gold-mine-cart`: 23.8 có "goòng chạy"; xe phải là model riêng mới chạy được.
- `gold-pile-1..4`: 17.4 và 22.4 cần đống vàng lớn dần theo 4 bậc mesh ở `FX_pile`; đây là một phần của Mỏ Vàng.
- `arrow`, `shell`, `keep-bolt`: 1C có "đạn và Phát Chữ" (26.1), mỗi loại đạn là một InstancedMesh (23.8). Model tạm duy nhất ở 25.2 là cầu lửa `skills/dragon-fireball`, không giống tên, đạn pháo hay mũi nỏ.
- `level-pennant`: 23.8 cần "cờ có vạch cấp" ở mọi nhà. Bộ cấp ở bậc VS, nên ở 1C cờ này là dấu cấp nhà duy nhất trên model.
- `root-burst`: 22.7 cho Rễ Trồi của Mộc Tinh dùng model `root-burst.glb` của chủ dự án, nhưng file đó chưa có ở đâu. Mộc Tinh là P (27.2) và Rễ Trồi là đòn chính của boss bản đồ 1.

### 2.2 Bậc VS

70 model ở file [`02-tripo-buildings-props-vs.md`](02-tripo-buildings-props-vs.md):

| Nhóm | Số model |
|---|---|
| Nhà cấp 1: Tháp Thư Pháp, Nhà Thuốc, Trại Gỗ | 3 |
| Skin Ruộng: Ao Cá (bản đồ 2), Nương (bản đồ 3) | 2 |
| Bộ cấp L2, L3 mọi nhà; Lũy L2–L4; nòng pháo cấp 3 | 22 |
| Nhánh A/B của 9 nhà | 18 |
| Đống đổ nát S, M, L, XL | 4 |
| Mốc cảnh có luật chơi (3 bản đồ) | 12 |
| Đồ dùng: giàn tre, Rào Tre, Cầu Tre, Gỗ Lăn | 4 |
| Đạn: viên ná, đá lửa, lông Đại Bàng, hạt Mộc Tinh, lông lửa Draconis | 5 |

### 2.3 Bậc Sau

Chỉ liệt kê, ở mục 7.

## 3. Luật chung

### 3.1 Góc nhìn và khung hình

- Nhà, bộ cấp, nhánh, đổ nát, mốc cảnh: nhìn 3/4 từ trước. Nhà xoay khoảng 30° để thấy mặt trước và mặt phải. Nhìn xuống khoảng 35°. Gần trực giao, không méo phối cảnh.
- **Mặt trước** là mặt có cửa chính và mề đay `FX_core`. Bục trợ lực ở góc trước bên phải. Trong game, mặt trước và bục quay về phía Lũy (8.4).
- Đáy cắt phẳng, như đồ chơi đặt trên bàn. Không đất, không cỏ, không bóng quanh chân.
- Đồ nhỏ đứng được (túi, rương, đống vàng, xe goòng, quả đạn, cờ cấp): cùng góc 3/4.
- Đồ dài (mũi tên, mũi nỏ, nòng pháo): nhìn ngang 90°, nằm ngang.
- Không có ảnh phụ. Mục 23.11 chỉ cho nhà và mốc cảnh một ảnh.

### 3.2 Vòng chiếm chỗ và chiều cao

| Cỡ | Bán kính r | Đường kính | Nhà | Cao trong game (23.2) |
|---|---|---|---|---|
| S | 2,0 m | 4,0 m | Tháp Cung, Đài Ấn | Tháp Cung 6–7,5 m. Đài Ấn là đài thấp, đỉnh cột sau cách đất khoảng 5 m. |
| M | 2,3 m | 4,6 m | Tháp Pháo, Tháp Thư Pháp, Trại Lính, Nhà Thuốc | Tháp Thư Pháp 6–7,5 m. Tháp Pháo 3,5–4,5 m (ngoại lệ ở 23.2; xem P3). Trại Lính khoảng 4,5–5 m (xem P5). Nhà Thuốc 5–6 m. |
| L | 2,7 m | 5,4 m | Mỏ Vàng, Trại Gỗ | 5–6 m |
| XL | 3,5 m | 7,0 m | Ruộng Lúa; Lũy Chữ | Ruộng: đỉnh chòi khoảng 5 m. Lũy 10–12 m. |

- Nhìn từ trên xuống, chân nhà phủ gần kín vòng tròn và không lòi ra ngoài vòng.
- Bục trợ lực nằm trên mép vòng (8.4), có thể lòi ra ngoài vòng một chút. Khi đo bề ngang chân, không tính bục.
- Mục 12.5 không ghi cỡ Lũy. Mã (`src/td/content/slice-1a.ts`) cho Lũy cỡ XL. File này theo mã.

### 3.3 Socket: ảnh phải chừa chỗ

Socket là điểm Blender gắn vào model (23.9). Ảnh không vẽ socket, nhưng phải có chỗ cho nó.

| Socket | Dùng làm gì | Chỗ mặc định | Ảnh phải có |
|---|---|---|---|
| `FX_assist` | Ổ trợ lực, quay về phía Lũy (8.4). Tướng đi bộ đứng trên bục (23.7). Draconis đậu ở `FX_perch`. | Góc trước bên phải, trên mép vòng | Bục gỗ thấp một bậc, bàn viết nhỏ nghiêng ở mép trước bục |
| `FX_core` | Lõi nhà: chữ gõ xong bay vào, dây trợ lực nối vào | Giữa mặt trước | Mề đay đá tròn khắc nét cọ, không chữ |
| `FX_top` | Gốc cột chữ (giữa đỉnh mái) | Đỉnh mái | Chóp mái bằng, dày, chắc; không cột cờ, không đồ trang trí cao |
| `FX_perch` | Chỗ Draconis đậu khi trợ lực (8.4, 23.9) | `FX_top` + 0,6 m; nhà không mái: xem P3, P16 | Như `FX_top`: chóp mái chắc |
| `FX_word` | Chỗ thẻ chữ bật ra | Ngay trên `FX_top` | Như trên |
| `FX_lantern_0..4` | 5 đèn lồng Nhiệt | Dưới mép mái trước, cách đều, đánh số trái sang phải (Đài Ấn: xem P16) | Xà mái trước thẳng, dày, không treo gì |
| `FX_crew` | Chỗ tổ thợ làm việc. Thư Đồng đứng cạnh tổ thợ (22.3, 23.7). | Ghi ở từng nhà | Một khoảng sàn trống đủ cho tổ thợ và 1 Thư Đồng |
| `FX_banner` | Cờ cấp chung (P17); cờ phần phật khi Bùng Nổ (23.4) | Góc sau bên trái | Để trống (trừ cờ chữ của Lũy) |
| `FX_muzzle` | Chỗ đạn ra | Tháp, Lũy | Sàn bắn hoặc miệng nòng rõ |
| `FX_pile` | Đống vàng | Mỏ Vàng | Sàn trống cạnh đường ray |

Tự quyết: bục trợ lực luôn ở góc trước bên phải; người trên bục quay mặt ra ngoài, bàn viết ở trước mặt, để camera thấy mặt Tướng.
Tự quyết: mỗi nhà có một mề đay đá tròn ở mặt trước làm `FX_core`, để chữ bay vào có chỗ đến; Blender làm nó sáng.
Tự quyết: đèn lồng là ảnh 2D (27.2), nên ảnh chỉ chừa xà mái trước trống; nhà không mái dùng cột hoặc móc, ghi ở từng món; đèn đánh số 0–4 từ trái sang phải nhìn từ trước.
Tự quyết: ảnh nhà để trống góc sau trái (trừ cờ chữ của Lũy). Cờ cấp chung (P17) gắn ở đó từ cấp 1 và hiện 1–3 vạch (23.8: "cờ có vạch cấp").
Tự quyết (22/10, đổi được): tổ thợ ở trên cao (chòi canh Lũy, từ cấp 2 là chòi nỏ; sàn canh Tháp Cung; ban công Tháp Thư Pháp) thì Thư Đồng đi vào cửa nhà rồi hiện ở `FX_crew`; khi hoảng thì hiện lại ở cửa và chạy về Lũy. Vì vậy các nhà này có cửa rõ ở mặt trước.
Draconis đậu ở `FX_perch` khi trợ lực (8.4, 22.2, 23.9), nên đỉnh mái phải chắc. Pháo cấp 1 và Đài Ấn không có mái: điểm đậu riêng ghi ở P3, P16 và mục 8.

### 3.4 Phong cách làng Văn Điền (CivKit "Liên Minh Làng")

| Mục | Luật |
|---|---|
| Vật liệu | Đá vôi trắng mạch xám; gỗ nâu sẫm; tre khô vàng nâu (không tre xanh); mái rơm vàng lúa; tường đất nện vàng đất; phên tre đan; ngói đất nung nâu đỏ; điểm sơn đỏ son nhỏ; đồ đồng cũ màu nâu ấm, không gỉ xanh (gỉ xanh lẫn với nền xanh). |
| Bảng màu vùng (22.1) | Xanh mạ, vàng lúa, bạc nước, nâu tre, đỏ son, trắng đá vôi. |
| Văn hóa (22.1) | Không đình, chùa, miếu, đền, torii, tháp Chăm, thánh giá, bàn thờ, hương. Không cổng đứng riêng gồm hai cột và một xà. Mái chỉ cong nhẹ, không rồng trên nóc. |
| Màu dành riêng (23.3) | Không dùng xanh ngọc trên model: đó là màu của sức gõ. Vàng kim sáng để cho tiền: đồ rơi, quặng, đống vàng. |
| Chữ | Chữ trang trí trong game là chữ Latin viết cọ (22.1). Ảnh không được có chữ, nên vẽ nét cọ trừu tượng. |
| Bóng hình (23.12) | Bóng hình theo chức năng giữ ở mọi văn minh: Tháp Cung cao mảnh, Pháo thấp tròn nòng to, Trại Lính rộng có trống. Văn minh chỉ đổi mái, vật liệu, cờ, hoa văn. |

Tự quyết: chữ Latin thật (cờ chữ của Lũy, cột Đài Ấn) thêm sau bằng decal trong Blender.

### 3.5 Không có trong ảnh

- Người, thợ, lính, thú. Thợ và trâu ở file 01.
- Đèn lồng. Đèn là ảnh 2D riêng (`03-2d-scenery-ui-vfx.md`, mục 8).
- Lửa, khói, hơi nước, tia lửa, hạt, hào quang, tia sáng, vệt chuyển động. Đó là VFX.
- Cờ bay phần phật. Cờ chỉ rủ yên.
- Đất, cỏ, đá rời, đường quanh chân. Bóng đổ.
- Chữ, số, logo. Viền đen vẽ sẵn (shader tự vẽ viền).
- Món đã tách thành model riêng: nòng pháo, xe goòng, đống vàng, cờ cấp.

### 3.6 Chừa chỗ cho bộ cấp

- Cấp 1 giản dị hơn. Bộ cấp 2, 3 gắn thêm lên model gốc (12.1: mái, cờ, ốp). Nhánh là model riêng.
- Bộ cấp có ba kiểu: vỏ mái to hơn chụp lên mái cũ; vòng ôm quanh chân hay quanh sàn; món đặt vào chỗ trống đã chừa.
- Vì vậy mái cấp 1 gọn, đỉnh mái bằng (chỗ đặt tầng trên), và mỗi nhà để trống vài chỗ. Chỗ trống ghi ở dòng "Chừa cho cấp sau" của từng nhà.

### 3.7 Bảng kiểm ảnh (trước khi đưa Tripo)

- [ ] Đúng một vật. Thấy đủ từ chân tới đỉnh. Ở giữa, lề đều, không bị cắt.
- [ ] Nhà: góc 3/4 từ trước, thấy mặt trước và mặt phải, nhìn xuống khoảng 35°. Đồ dài: nhìn ngang.
- [ ] Không méo phối cảnh: cạnh đứng vẫn đứng thẳng, không chụm vào nhau.
- [ ] Đáy cắt phẳng. Không đất, cỏ, đá rời, bóng quanh chân.
- [ ] Không người, thú, đèn lồng, lửa, khói, hạt, ánh sáng, chữ, số.
- [ ] Ánh sáng đều. Không bóng đổ. Không viền đen vẽ sẵn.
- [ ] Không sợi mảnh, không phần lơ lửng. Cờ, vải rủ yên.
- [ ] Nền đúng màu, phẳng tuyệt đối, không loang.
- [ ] Nhà có bục gỗ có bàn viết ở góc trước bên phải, mề đay đá ở mặt trước, xà mái trước trống (hoặc cột, móc đèn).
- [ ] Không vẽ món đã tách riêng: nòng pháo, xe goòng, đống vàng, cờ cấp.
- [ ] Đồ đồng màu nâu ấm, không gỉ xanh. Hoa văn là nét xoáy, không giống chữ của bất kỳ thứ chữ nào.
- [ ] Tre màu vàng nâu, không xanh. Không xanh ngọc. Không có gì giống đền, chùa.

## 4. Khối prompt (copy nguyên văn)

### A-BUILD: đầu prompt mọi nhà, bộ cấp, nhánh, đổ nát, mốc cảnh

```text
Single 3D-ready concept image of one game building, building part or landmark for a charming storybook fantasy tower-defense game, made to look like a hand-painted vinyl toy: chunky rounded shapes, thick sturdy proportions, a bold silhouette that still reads clearly from high above, matte hand-painted colours with soft, simple shading. As symmetrical as its design allows.
Camera: front three-quarter view, the subject turned about 30 degrees so its front face and its right side both show, looking down from about 35 degrees above, near-orthographic with no perspective distortion. The whole subject is in frame from its base to its top, centred, with a small even margin; nothing is cropped.
Its base is cut flat like a toy standing on a table: no ground, grass, loose rocks, path or props around it, and no shadow under it.
Flat, even front lighting: no cast shadows, no strong highlights, no rim light, no glow. No painted black outlines.
One connected solid object: every part touches the main body and nothing floats; every post, pole and rope is thick and sturdy, with no thin wires, strings or gaps; thatch, leaves, straw and cloth are grouped into a few big solid masses; cloth and flags hang still and close.
No fire, flames, smoke, steam, sparks, particles, magic glow, light rays or motion lines. No people, animals or creatures. No lanterns. No text, letters, numbers, logos or signatures. No frame, border or second view.
```

### A-PROP: đầu prompt đồ nhỏ, đồ dài, đạn

Góc nhìn nằm ở dòng `Camera:` đầu prompt của từng món.

```text
Single 3D-ready concept image of one small game prop for a charming storybook fantasy tower-defense game, made to look like a hand-painted vinyl toy: chunky rounded shapes, thick sturdy proportions, a bold silhouette that reads at a small size, matte hand-painted colours with soft, simple shading.
The whole prop is in frame, centred, with a small even margin; nothing is cropped. It is alone: no ground, no shadow, nothing else in the image.
Flat, even front lighting: no cast shadows, no strong highlights, no rim light, no glow. No painted black outlines.
One connected solid object: every part touches and nothing floats; no thin strings, wires or gaps.
No fire, flames, smoke, sparks, particles, magic glow or motion lines. No people or animals. No text, letters, numbers or logos. No frame, border or second view.
```

### B-VILLAGE: phong cách làng (khi dòng "Prompt =" có ghi)

```text
World style "Van Dien valley": a cosy Vietnamese-inspired countryside of rice fields, bamboo villages and white limestone shores, in storybook fantasy. Village materials: limestone-white stone with soft grey seams, dark-brown timber, golden-tan dry bamboo (never green bamboo), wheat-gold rice-straw thatch, warm ochre rammed earth, woven bamboo mats, warm red-brown terracotta tiles, small vermilion-red lacquer accents and warm brown aged bronze fittings with no green patina. No teal or turquoise anywhere. Decoration is simple swirling brush-stroke ornament that is clearly not letters or characters of any writing system. Everything is humble village craft: no temple, pagoda, shrine, altar, incense, statue or religious symbol, no free-standing gate made of two posts and a crossbeam, and roofs curve only gently, with no dragons, figures or ornaments on their ridges.
```

### Dòng nền (cuối prompt)

| Tên | Khi nào | Dòng nền |
|---|---|---|
| BG-G | Vật không có màu xanh lá | `Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no green at all.` |
| BG-M | Vật có xanh lá (lúa, lá, rêu), không có hồng hay tím hồng | `Flat pure #FF00FF magenta background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no pink, magenta or bright purple at all.` |
| BG-B | Vật có cả xanh lá và hồng hoặc tím hồng | `Flat pure #0000FF blue background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no blue at all.` |

- Ba dòng nền này giống từng chữ ở mọi file ảnh của bộ (01, 02, 03 và các file `-vs`). File 03 viết tắt G, M, B.

## 5. Thiết lập Tripo

| Mục | Đặt |
|---|---|
| Chế độ | **Image to 3D**, một ảnh. Multiview to 3D chỉ dùng khi món có ảnh phụ; file này không có. |
| Tách nền | Bật nếu Tripo có nút này, để không sót viền màu nền. |
| Texture | Bật, chất lượng cao nhất (HD). |
| PBR | Bật. |
| Face limit | Theo từng món (bảng 2.1). Dạng tam giác: Quad tắt, Smart Low Poly tắt. |
| Rig | Không. Không món nào trong file này có khung xương. |
| Animation của Tripo | Không. Clip nhà do Blender làm (23.9). |
| Xuất | **GLB**. Đổi tên đúng id, lưu đúng đường dẫn. |

- Tripo ra sai dáng: bấm tạo lại (Regenerate). Vẫn sai: sửa ảnh rồi làm lại.
- Mặt sau do Tripo tự đoán. Mặt sau vỡ rõ thì tạo lại.

**Face limit chung** của hai file prompt Tripo (01 và 02). Blender hạ số tam giác cho game sau.

| Loại | Face limit |
|---|---|
| Tướng | 20000 |
| Trợ Thủ | 8000 |
| Lính, thợ | 5000 |
| Quái nhỏ, vừa | 6000 |
| Quái lớn | 9000 |
| Boss | 30000 |
| Nhà | 10000 |
| Bộ cấp, phần nhánh | 4000 |
| Mốc cảnh | 8000 |
| Đồ rơi, đồ gắn | 2000 |

Tự quyết: Lũy dùng 15000, vì Lũy có ba tầng và lớn gấp rưỡi tới gấp đôi nhà khác trên màn hình (160–200 px so với 90–130 px, 23.2).
Tự quyết: đạn, nòng pháo, xe goòng, đống vàng, cờ cấp dùng mức đồ gắn 2000.
Các thay đổi khác (nhánh, bộ cấp Lũy, đổ nát, đồ dùng) ghi ở file VS.

## 6. Bậc P: từng món

### P1 · `keep` · Lũy Chữ, cấp 1

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Nhà chính, giữ 20 mạng. Tướng hồi sinh ở đây. Thư Đồng hoảng chạy về đây. Có nỏ thủ thành. Trợ lực được. |
| Ảnh 2D | `art-src/td/buildings/keep.png` · 1024×1536 (dọc) |
| Model 3D | `art-src/3d/td/buildings/keep.glb` |
| Vòng, cao | XL · r 3,5 m (Ø 7 m) · cao 10–12 m |
| Bóng hình | Nhà cao nhất. Ba tầng thu dần, chòi canh trên đỉnh, cờ chữ ở góc sau. Nhìn từ trên: khối vuông nhiều lớp mái giữa một vòng sân đá. |
| Socket | `FX_assist`: bục ở góc trước phải, trên sân đá ngoài · `FX_core`: mề đay trên cổng · `FX_top`, `FX_word`: chóp mái chòi canh · `FX_lantern_0..4`: xà mái tầng 2, mặt trước · `FX_crew`, `FX_muzzle`: sàn chòi canh, phía trước · `FX_banner`: đầu cột cờ, góc sau trái |
| Chừa cho cấp sau | Vòng sân đá ngoài để trống (L2: tường đá cao, cổng có trống, chòi nỏ). Chòi canh nhỏ, gọn (L3: tháp canh hai tầng chụp lên). Mái chòi đơn giản (L4: mái vàng chụp lên). |
| Chất liệu | Đế và tầng 1 đá vôi trắng. Tầng 2 cột gỗ nâu sẫm, phên tre. Mái ngói nâu đỏ. Cổng gỗ đinh đồng. Cờ vải ngà viền đỏ son. |
| Không vẽ | Lão Gác Cổng, lính, đèn lồng, nỏ gắn cố định, trống (trống thuộc bộ L2), lửa, đất. |
| Prompt = | A-BUILD + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 15000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết: Lão Gác Cổng đứng ở chòi canh để bắn được mọi phía; `FX_crew` và `FX_muzzle` đặt ở đó.
Tự quyết: hai cánh cổng có viền sâu rõ, để Blender tách cánh và làm cổng mở trong lễ mở ô (23.7).
Tự quyết: ảnh dọc 1024×1536. Nhìn 3/4 từ trên, Lũy cao gần gấp 1,8 lần bề ngang, như Tháp Cung; khung vuông bỏ phí gần nửa ảnh.

```text
The Bastion, the village's main fort and the biggest building, about one and a half times as tall as it is wide. It stands on a low, round limestone foundation that fills its whole footprint; the outer ring of that foundation is an empty, flat stone apron about one sixth of the width, all the way round. On it rises a three-tier fort. Tier one: a sturdy, slightly tapered body of limestone blocks, with a big arched timber double gate in the middle of the front, set in a deep frame, each door clearly outlined and studded with bronze, three wide stone steps up to the gate, and a round carved stone medallion above the gate. Tier two: a timber hall with thick dark-brown posts and woven bamboo-mat walls under a wide, gently curved terracotta tile roof; along the front, under the roof edge, a straight, thick eave beam with nothing hanging from it. Tier three: a small square timber watch hut on top, open on all four sides above a waist-high timber railing, under a small terracotta hip roof that ends in a short, thick, flat-topped ridge cap. At the back left of the tier-two roof, a thick timber pole, its top lower than the watch hut's roof, carries a tall ivory cloth banner with a vermilion border and one bold abstract ink swirl on it that is not a letter or character of any writing system, hanging still and close to the pole. On the apron at the front right corner: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Proud and welcoming, clearly the heart of the village.
```

### P2 · `archer` · Tháp Cung, cấp 1

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Tháp bắn tên, đánh đất và bay. Thiết kế 22.4: "Chòi tre trên chân đá, mái lá". |
| Ảnh 2D | `art-src/td/buildings/archer.png` · 1024×1536 (dọc) |
| Model 3D | `art-src/3d/td/buildings/archer.glb` |
| Vòng, cao | S · r 2,0 m (Ø 4 m) · cao 6–7,5 m |
| Bóng hình | Cao mảnh, cao gần gấp đôi bề ngang. Nhìn từ trên: mái chóp vuông nhỏ trên chân tròn. |
| Socket | `FX_assist`: bục ở góc trước phải, cạnh chân đá · `FX_core`: mề đay trên cửa · `FX_top`, `FX_word`: chóp tròn đỉnh mái · `FX_lantern_0..4`: xà mái trước, ngay trên sàn canh · `FX_crew`, `FX_muzzle`: mép trước sàn canh (Chị Én, Em Sẻ bắn từ đây) · `FX_banner`: góc sau trái của mái |
| Chừa cho cấp sau | Mái lá gọn (L2: vỏ mái ngói chụp lên). Sàn canh không lan can (L2: lan can ôm sàn). Chóp mái bằng (L3: tầng canh thứ hai đặt lên). |
| Chất liệu | Chân đá vôi trắng. Thân 4 cột tre vàng nâu, vách phên tre. Sàn ván gỗ. Mái lá cọ màu vàng rơm. |
| Không vẽ | Cung thủ, cung, tên, lan can, cờ, đèn lồng, thang tre mảnh. |
| Prompt = | A-BUILD + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 10000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết: ảnh dọc 1024×1536 vì tháp cao gần gấp đôi bề ngang; khung vuông bỏ phí nhiều chỗ hai bên.

```text
The Archer Tower, tall and slim, almost twice as tall as it is wide. A round foot of limestone-white fieldstones with grey seams, wide at the bottom and narrowing upward, with a small arched wooden door in the middle of the front and a round carved stone medallion above the door. On the foot stands a square shaft: four thick golden-tan bamboo corner posts with woven bamboo-mat walls filling the sides, braced by thick crossed bamboo beams. On top, a square plank lookout platform that juts out a little on every side, open all round with no railing, under a steep pyramid roof of wheat-gold palm-leaf thatch carried on four thick corner posts; the roof ends in a small, thick, flat round cap at the very top. Along the front, under the thatch edge, a straight, thick eave beam with nothing hanging from it. At the front right of the stone foot: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Light, alert and watchful.
```

### P3 · `cannon` · Tháp Pháo, cấp 1 (chưa có nòng)

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Tháp bắn đạn nổ vùng, chỉ đánh đất. Thiết kế 22.4: "Ụ đất nện, nòng đồng ngắn". Nòng là món P4. |
| Ảnh 2D | `art-src/td/buildings/cannon.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/buildings/cannon.glb` |
| Vòng, cao | M · r 2,3 m (Ø 4,6 m) · thân ụ có tường khoảng 3 m; có nòng thì đỉnh khoảng 4 m |
| Bóng hình | Thấp, tròn, nặng, rộng hơn cao, nòng to ở giữa. Nhìn từ trên: vòng tròn đất có mâm xoay ở tâm. |
| Socket | `FX_assist`: bục ở góc trước phải, chân ụ · `FX_core`: mề đay trên tường ụ, phía trên bậc thang · `FX_top`, `FX_word`: điểm trên tâm mâm xoay (cấp 1 chưa có mái) · `FX_lantern_0..4`: chốt gỗ trên đầu 5 cột ở nửa trước tường ụ · `FX_crew`: sàn pháo bên trái, cạnh giá đạn (Bác Đồng, cậu Lửa) · `FX_muzzle`: miệng nòng (ở model P4) · `FX_banner`: góc sau trái tường ụ · `FX_perch`: mép sau tường ụ (cấp 1 không mái) · Trục quay nòng: tâm mâm xoay |
| Chừa cho cấp sau | Mặt trên tường ụ phẳng (L2: vòng đá ốp lên). Nửa sau sàn pháo trống phía trên (L2: mái che). Góc sau trái trống (L3: cờ đỏ). Nòng tách riêng (L3: đổi nòng vằn). |
| Chất liệu | Ụ đất nện vàng đất, có vân lớp ngang. Sàn ván gỗ. Mâm xoay gỗ nâu sẫm. Đạn sắt đen. |
| Không vẽ | Nòng pháo, thợ, khói, lửa, đèn lồng, mái che, cờ. |
| Prompt = | A-BUILD + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 10000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết: nòng là model riêng (P4) đặt trên mâm xoay; game quay nòng theo quái, Blender làm clip nòng giật khi bắn.
Tự quyết: giữ dáng "thấp tròn nòng to" (23.12). Nòng dài 3 m, chếch 40°, giữa nòng đặt trên mâm, nên đỉnh Pháo chỉ khoảng 4 m.
Tự quyết (22/10, đổi được): Pháo là ngoại lệ của dòng Nhà đánh 6–7,5 m: 23.2 ghi Tháp Pháo thấp tròn 3,5–4,5 m. `td-scale` đo Pháo theo mức này.
Tự quyết: cấp 1 không có mái, nên 5 cột gỗ ngắn có chốt trên tường ụ giữ chỗ cho 5 đèn lồng.

```text
The Cannon Tower, low, round and heavy, wider than tall. A round mound of warm ochre rammed earth with visible horizontal layer lines, slightly tapered and about half as tall as it is wide, topped by a thick, waist-high round earthen parapet around a flat timber-plank gun floor. Wide earthen steps with timber edges climb the middle of the front up to the gun floor, and a round carved stone medallion is set into the parapet above the steps. In the centre of the gun floor sits an empty round wooden turntable with two thick timber cradle blocks facing each other, waiting for a cannon barrel; there is no barrel in this image. On the inner left of the floor, a sturdy wooden rack holds a neat pyramid of round dark-iron cannonballs. Five short, thick wooden posts stand evenly spaced along the front half of the parapet, each with one short, thick wooden peg near its top pointing outward, with nothing hanging from them. At the front right, at the foot of the mound: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Squat, solid and ready to boom.
```

### P4 · `cannon-barrel` · Nòng Tháp Pháo, cấp 1–2

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Nòng đồng ngắn của Tháp Pháo. Blender gắn vào giữa hai khối kẹp trên mâm xoay của P3. |
| Ảnh 2D | `art-src/td/buildings/cannon-barrel.png` · 1536×1024 (ngang) |
| Model 3D | `art-src/3d/td/buildings/cannon-barrel.glb` |
| Cỡ | Dài khoảng 3 m. Góc nâng cố định khoảng 40° khi gắn. |
| Socket | `FX_muzzle`: miệng nòng |
| Chất liệu | Đồng cũ, vòng gia cố màu đồng sẫm, vài nét khắc cọ. |
| Không vẽ | Bánh xe, giá đỡ, khói, lửa, quả đạn. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

```text
Camera: exact side view at 90 degrees, near-orthographic, the barrel lying horizontal with its mouth to the left.
A short, fat cannon barrel of aged bronze for a storybook village cannon tower: a wide flared mouth with a thick lip on the left, three thick raised reinforcing rings along its length, one broad smooth band around its middle where it rests in its mount, and a rounded knob at the back end on the right. Warm bronze with darker bronze rings and a little swirling brush-stroke engraving that is clearly not letters. Stubby, heavy and charming.
```

### P5 · `barracks` · Trại Lính, cấp 1

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Nhà sinh 3 lính chặn đường ở điểm tập kết. Thiết kế 22.4: "Trại gỗ rào cọc, cổng có trống". |
| Ảnh 2D | `art-src/td/buildings/barracks.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/buildings/barracks.glb` |
| Vòng, cao | M · r 2,3 m (Ø 4,6 m) · cao khoảng 4,5–5 m |
| Bóng hình | Rộng, chắc, có trống to cạnh cổng. Nhìn từ trên: mái rơm rộng trong vòng rào tròn. |
| Socket | `FX_assist`: bục ngoài rào, góc trước phải · `FX_core`: mề đay trên vách trước nhà trại, ngay trên rào · `FX_top`, `FX_word`: chóp nóc bằng giữa mái rơm · `FX_lantern_0..4`: xà mái trước nhà trại · `FX_crew`: cạnh trống, trước trái (Đội trưởng Sấm) · `FX_banner`: góc sau trái mái · Lính ra: giữa cổng |
| Chừa cho cấp sau | Sân trống góc sau phải trong rào (L2: chòi canh). Mái rơm gọn (L3: vỏ mái ngói và cờ đỏ chụp lên). |
| Chất liệu | Rào cọc gỗ nâu sẫm. Nhà trại vách gỗ, mái rơm vàng lúa. Trống da nâu đỏ, vành đinh đồng. Khiên mây đan. |
| Không vẽ | Lính, giáo, cờ, chòi canh, đèn lồng, đất trong sân. |
| Prompt = | A-BUILD + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 10000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết: Trại Lính cao khoảng 4,5–5 m, hơi thấp hơn mức 5–6 m của 23.2, để giữ dáng "rộng" (23.12) trên vòng Ø 4,6 m. Mức lệch vẫn dưới 20 % mà `td-scale` cho phép.

```text
The Barracks, wide and sturdy, a little wider than tall. A round palisade of thick sharpened timber stakes, as thick as legs and packed tightly with no gaps, about one third as tall as the building, encircles the whole footprint. In the middle of the front, the palisade opens on a heavy timber gate with two thick doors hung between two extra-thick stakes of the palisade. To the left of the gate stands a big round village war drum with a red-brown hide face and a bronze-studded rim, held upright on a sturdy timber stand. Inside the palisade, filling most of it, a long, low barracks hall with dark-brown timber walls under a broad, low, gently curved roof of thick wheat-gold rice-straw thatch, much wider than it is tall, ending in a short, thick, flat-topped ridge cap in the middle. Along the front, under the thatch edge, a straight, thick eave beam with nothing hanging from it, and a round carved stone medallion on the hall's front wall just above the palisade. Three round woven-rattan shields hang flat on the outside of the palisade, right of the gate. The back right corner inside the palisade is an empty yard. At the front right, just outside the palisade: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Disciplined, loud and ready to march.
```

### P6 · `gold-mine` · Mỏ Vàng, cấp 1

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Nhà ra Vàng, đặt trên node quặng. Vàng tự sản dồn thành đống ở cửa mỏ. Thiết kế 22.4: "Cửa hầm trên vách, xe goòng, ròng rọc". |
| Ảnh 2D | `art-src/td/buildings/gold-mine.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/buildings/gold-mine.glb` |
| Vòng, cao | L · r 2,7 m (Ø 5,4 m) · cao 5–6 m |
| Bóng hình | Đồi đá nhỏ có giá ròng rọc trên đỉnh, cửa hầm và đường ray ở trước. Nhìn từ trên: khối đá tròn, bánh xe gỗ ở giữa, sàn ván phía trước. |
| Socket | `FX_assist`: bục ở góc trước phải, trên sàn ván · `FX_core`: mề đay trên cửa hầm · `FX_top`, `FX_word`: xà bằng trên đỉnh giá ròng rọc · `FX_lantern_0..4`: xà mái hiên cửa hầm · `FX_pile`: sàn trống bên trái đường ray · `FX_crew`: hai bên cửa hầm (ba anh em thợ mỏ) · `FX_banner`: góc sau trái, trên đỉnh đá · Đường chạy của goòng: ray từ cửa hầm ra mép trước |
| Chừa cho cấp sau | Vai đá bên phải trơn (L2: tời quay tay). Mặt đá bên trái trơn (L3: guồng nước). |
| Chất liệu | Đá granit xám, mạch quặng vàng ấm vẽ phẳng. Khung gỗ nâu sẫm. Mái hiên ngói nâu đỏ. Ray sắt, tà vẹt gỗ. |
| Không vẽ | Xe goòng (P7), đống vàng (P8), thợ mỏ, cuốc, đèn lồng, dây treo, thùng treo, rêu xanh. |
| Prompt = | A-BUILD + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 10000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

```text
The Gold Mine, a small rocky hill about as tall as it is wide. A rounded outcrop of big grey granite boulders fills the back two thirds of the round footprint, with a few broad warm-gold ore veins painted flat on the rock, without shine or glow. In the middle of its front, a mine tunnel mouth framed by thick square timbers set into the rock, its inside a shallow dark recess, under a small porch roof of terracotta tiles; along the front, under the porch roof edge, a straight, thick eave beam with nothing hanging from it, and a round carved stone medallion above the tunnel. A pair of chunky iron mine rails on thick sleepers runs from the tunnel straight to the front edge across a flat plank floor that fills the front third of the footprint; the rails are empty, with no cart. Left of the rails, the plank floor is a clear, empty space. On top of the outcrop, a sturdy timber hoist frame holds a big solid wooden pulley wheel with a thick rope coiled tightly around its axle; nothing hangs from it, and the top beam of the frame is a flat plank. The right shoulder of the rock and its left face are plain and uncluttered. At the front right: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Busy, rich and a little rough.
```

### P7 · `gold-mine-cart` · Xe goòng của Mỏ Vàng

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Xe goòng chở quặng, chạy ra vào trên ray của P6 khi mỏ làm việc (23.8: "goòng chạy"). |
| Ảnh 2D | `art-src/td/props/gold-mine-cart.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/props/gold-mine-cart.glb` |
| Cỡ | Dài khoảng 1,2 m, vừa khổ ray của P6. |
| Chất liệu | Ván gỗ nâu sẫm, đai sắt, bánh sắt, quặng vàng. |
| Không vẽ | Ray, người đẩy, bụi. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

```text
Camera: front three-quarter view looking down from about 35 degrees above, seeing the cart's front and right side, near-orthographic.
A small, chunky wooden mine cart with a flat bottom line: a deep box of thick dark-brown planks with iron corner bands, four small, thick iron wheels set close under it, and a heap of chunky gold ore nuggets filling it into one solid rounded mound. Sturdy, cute and hard-working.
```

### P8 · `gold-pile-1` … `gold-pile-4` · Đống vàng 4 bậc

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Đống Vàng tự sản ở cửa mỏ, lớn dần theo 4 bậc (17.4, 22.4). Quái trộm lấy từ đống này. Bốn ảnh, bốn model. |
| Ảnh 2D | `art-src/td/props/gold-pile-1.png`, `gold-pile-2.png`, `gold-pile-3.png`, `gold-pile-4.png` · 1024×1024 mỗi ảnh |
| Model 3D | `art-src/3d/td/props/gold-pile-1.glb` … `gold-pile-4.glb` |
| Cỡ | Ø khoảng 0,6 / 0,9 / 1,2 / 1,5 m |
| Socket | Đặt ở `FX_pile` của P6 |
| Không vẽ | Sàn, thùng, xẻng, lấp lánh. |
| Prompt = | A-PROP + prompt chung + dòng cỡ của từng ảnh + BG-G |
| Tripo | Image to 3D · face limit 2000 mỗi cái · không rig · không clip Tripo |
| Ảnh phụ | Không |

Prompt chung:

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A heap of chunky gold ore nuggets and thick round gold coins with a flat bottom, as piled up at a mine entrance: warm yellow gold with darker gold shading and a few pale cream touches, no shine or sparkle, all pieces pressed together into one solid heap.
```

| Ảnh | Dòng cỡ |
|---|---|
| `gold-pile-1.png` | `Tiny: a low heap of about a dozen pieces, about four times wider than tall.` |
| `gold-pile-2.png` | `Small: a low mound about three times wider than tall.` |
| `gold-pile-3.png` | `Medium: a rounded mound about twice as wide as tall, with two bigger nuggets on top.` |
| `gold-pile-4.png` | `Large: a tall, overflowing mound almost as tall as it is wide, with a few big nuggets and a short stack of coins on top.` |

### P9 · `arrow` · Mũi tên Tháp Cung

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Đạn `arrow` của Tháp Cung (23.8). Phát Chữ `word-arrow` và Mưa Tên `arrow-rain` dùng lại model này; game tô đầu xanh ngọc và thêm vệt chữ cho Phát Chữ. |
| Ảnh 2D | `art-src/td/projectiles/arrow.png` · 1536×1024 (ngang) |
| Model 3D | `art-src/3d/td/projectiles/arrow.glb` |
| Cỡ | Dài khoảng 1,2 m trong game, to hơn thật để đọc được. |
| Không vẽ | Vệt bay, dây cung, tay người. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

```text
Camera: exact side view at 90 degrees, near-orthographic, the arrow lying horizontal and pointing to the right.
A single chunky storybook arrow, much thicker than a real one: a straight dark-brown wooden shaft, a broad leaf-shaped iron head on the right, and at the left end three thick fins of warm white feathers, each fin one smooth solid shape. Simple and bold.
```

### P10 · `shell` · Quả đạn Tháp Pháo

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Đạn `shell` của Tháp Pháo, bay cầu vồng (23.8). Phát Chữ `word-shell` dùng lại model, game tô vằn xanh ngọc. |
| Ảnh 2D | `art-src/td/projectiles/shell.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/projectiles/shell.glb` |
| Cỡ | Ø khoảng 0,5 m trong game. |
| Không vẽ | Ngòi đang cháy, tia lửa, khói. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A round cannonball of dark iron with one raised bronze band around its middle and a short, thick, capped fuse stub on top, not lit. Heavy and simple.
```

### P11 · `keep-bolt` · Mũi nỏ Lũy

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Đạn `keep-bolt` của nỏ thủ thành (23.8). Mỗi từ gõ ở Lũy cũng bắn một mũi nỏ sáng (game tô sáng). |
| Ảnh 2D | `art-src/td/projectiles/keep-bolt.png` · 1536×1024 (ngang) |
| Model 3D | `art-src/3d/td/projectiles/keep-bolt.glb` |
| Cỡ | Dài khoảng 1,0 m: ngắn hơn mũi tên nhưng dày hơn nhiều. |
| Không vẽ | Vệt bay, cái nỏ. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

```text
Camera: exact side view at 90 degrees, near-orthographic, the bolt lying horizontal and pointing to the right.
A heavy crossbow bolt, shorter and much thicker than an arrow: a thick dark-brown wooden shaft, a wide flat iron head on the right, and two thick solid wooden fins at the left end. Bulky and simple.
```

### P12 · `farm` · Ruộng Lúa, cấp 1

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Ra Lúa nuôi lính, đặt tự do trên cỏ phẳng. Thiết kế 22.4: "Ô ruộng nước, bờ đất, bù nhìn". |
| Ảnh 2D | `art-src/td/buildings/farm.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/buildings/farm.glb` |
| Vòng, cao | XL · r 3,5 m (Ø 7 m) · ruộng thấp; đỉnh chòi canh khoảng 5 m (khoảng 2/3 bề ngang ruộng) |
| Bóng hình | Ruộng rộng, phẳng; một chòi canh cao trên cọc ở góc sau phải; bù nhìn giữa ruộng. Nhìn từ trên: ô ruộng vuông bo tròn chia đôi, chòi ở góc sau phải. |
| Socket | `FX_assist`: bục ở góc trước phải, trên bờ · `FX_core`: mề đay trên cọc đá mốc ruộng, giữa bờ trước · `FX_top`, `FX_word`: chóp nóc bằng của chòi · `FX_lantern_0..4`: xà mái trước của chòi · `FX_crew`: mặt nước trước trái (Cô Mạ, trâu Mộng) · `FX_banner`: góc sau trái mái chòi |
| Chừa cho cấp sau | Bờ góc sau trái trống (L2: đống rơm). Giữa bờ trái trống (L3: cối giã gạo nước). |
| Chất liệu | Bờ đất nâu ấm. Nước bạc xanh phẳng. Khóm mạ xanh mạ. Chòi tre vàng nâu, phên tre, mái rơm. Cọc mốc đá vôi. |
| Không vẽ | Cô Mạ, trâu, cò, đèn lồng, đống rơm, cỏ quanh bờ, bóng nước. |
| Prompt = | A-BUILD + B-VILLAGE + prompt dưới + BG-M |
| Tripo | Image to 3D · face limit 10000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết: có chòi canh ruộng trên cọc cao ở góc sau phải, để Ruộng có chiều cao (23.2: nhà sản xuất 5–6 m), mái treo đèn và `FX_top`.
Tự quyết: ảnh vuông 1024×1024. Nhìn 3/4 từ trên, mặt ruộng cộng chòi cao cho hình gần vuông; ảnh ngang sẽ bỏ phí hai bên.
Tự quyết: "lúa chín" của cấp 2 là đổi màu khóm lúa trong Blender; bộ cấp 2 chỉ mang đống rơm.

```text
The Rice Field, a wide, flat working paddy with one tall field-watch hut at its back right corner. A flooded rice paddy shaped like a rounded square fills the round footprint, edged by low, flat-topped banks of warm brown earth, with one low bank across the middle making two paddies. The water is a calm, flat silver-blue surface with no reflections. Neat rows of young rice seedlings stand in it, each clump a chunky rounded tuft of fresh rice-green. In the middle of the paddy stands a cheerful scarecrow: a wooden post, a plump rice-straw body, a conical palm-leaf hat, and arms made of one thick straight crossbar wrapped in straw sleeves. At the back right corner, a raised field-watch hut on tall, thick stilts, the tallest part of the farm: the top of its roof is about two thirds as high as the whole field is wide. It has a golden-tan bamboo frame, woven bamboo-mat walls and a steep wheat-gold rice-straw thatch roof ending in a short, thick, flat-topped ridge cap; along its front, under the thatch edge, a straight, thick eave beam with nothing hanging from it. On the front bank in the middle, a short, round-topped limestone field-marker stone with a round carved medallion. The back left corner and the middle of the left bank are plain, empty banks. At the front right corner, on the bank: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Peaceful, fresh and full of life.
```

### P13 · `bag-cloth` · Túi vải

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Túi chiến lợi rơi từ quái Vừa, Nặng (17.4). Mang một Từ Nhặt. Trong túi là Vàng hoặc Gỗ. |
| Ảnh 2D | `art-src/td/loot/bag-cloth.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/loot/bag-cloth.glb` |
| Cỡ | Cao khoảng 0,8 m trong game. |
| Không vẽ | Vòng sáng dưới túi, thẻ chữ, mặt đất. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết: id `bag-cloth`, `bag-basket`, `chest-boss`; bảng 0.6 chỉ có `bag`, mã có sự kiện `chestOpened`.
Tự quyết: túi vải cho quái Vừa, Nặng; giỏ tre cho quái Tinh nhuệ (luôn rơi túi, viền vàng, 14.2).

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A plump loot sack sitting upright on a flat bottom: thick cream-and-ochre homespun cloth with one darker square patch, its neck gathered and tied shut with a thick golden cord in a big knot, the cloth puffing out above the knot, and three thick gold coins tucked tightly into the folds of that puffed top. Soft, heavy and tempting.
```

### P14 · `bag-basket` · Giỏ tre

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Túi của quái Tinh nhuệ (17.4): Vàng nhiều hơn, hoặc một bùa. Trông quý hơn túi vải. |
| Ảnh 2D | `art-src/td/loot/bag-basket.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/loot/bag-basket.glb` |
| Cỡ | Cao khoảng 0,9 m trong game. |
| Không vẽ | Vòng sáng, thẻ chữ, bùa giấy rời, mặt đất. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A round lidded basket of chunky woven golden-tan bamboo, sitting upright on a flat bottom: a thick rim band painted bright gold, a domed woven lid tied down with a thick golden cord that ends in a big knot on top, and a small round gold medallion on the front. Solid and valuable-looking, clearly a special prize.
```

### P15 · `chest-boss` · Rương Boss

| Mục | Nội dung |
|---|---|
| Bậc | P |
| Là gì | Rương rơi giữa sân khi boss gục, tự mở sau 1,5 s, mưa đồng về HUD (17.4). Dùng cho mọi boss Thế giới 1. |
| Ảnh 2D | `art-src/td/loot/chest-boss.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/loot/chest-boss.glb` |
| Cỡ | Rộng khoảng 1,6 m trong game. |
| Không vẽ | Rương đang mở, đồng bay, ánh sáng trong rương, mặt đất. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Đường nối nắp phải sâu và thẳng, để Blender tách nắp làm hoạt ảnh mở.

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A big storybook treasure chest won from a boss, standing on a flat bottom: a deep box and a rounded, domed lid of thick vermilion-red lacquered wood, broad gold bands over the lid and down the sides, gold corner plates, a large round gold lock plate on the front with a simple swirl emblem, and two big chunky gold hinges at the back. A clear, straight, deep seam runs all the way round between the lid and the box. Closed. Heavy, grand and exciting.
```

### P16 · `seal-dais` · Đài Ấn, cấp 1 (nếu kịp)

| Mục | Nội dung |
|---|---|
| Bậc | P (27.2 ghi "nếu kịp") |
| Là gì | Đài đá trên node Mạch Chữ. Nơi gõ cụm từ, nghe rồi gõ, ấn boss. Phát Sóng Chữ làm chậm quái. Thiết kế 22.4: "Đài đá tròn ba bậc, cột khắc chữ Latin, chuông gió". Không bàn thờ, không hương (22.1). |
| Ảnh 2D | `art-src/td/buildings/seal-dais.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/buildings/seal-dais.glb` |
| Vòng, cao | S · r 2,0 m (Ø 4 m) · đài ba bậc cao khoảng 0,8 m; cột thường cao khoảng 2 m trên mặt đài (nửa bề ngang đài), cột sau khoảng 4 m (bằng bề ngang đài), đỉnh cột sau cách đất khoảng 5 m |
| Bóng hình | Đài tròn ba bậc, vòng 5 cột đá, một cột sau cao mang chuông gió. Nhìn từ trên: đĩa tròn có nan khắc và 5 chấm cột. |
| Socket | `FX_assist`: bục ở góc trước phải, chân bậc · `FX_core`: đĩa ấn đá giữa sân · `FX_top`, `FX_word`: trên tâm đĩa ấn · `FX_lantern_0..4`: móc trên 5 cột, đánh số theo chiều kim đồng hồ nhìn từ trên, bắt đầu từ cột trước trái · `FX_crew`: sân đài, sau trái đĩa ấn (Trò Mực) · `FX_banner`: đỉnh cột sau · `FX_perch`: mép sau mặt đài (đài không mái) |
| Chừa cho cấp sau | Bậc dưới cùng trơn (L2: bậc đá thứ tư ôm quanh). Đầu cột sau gọn (L3: chuông gió lớn gắn lên). |
| Chất liệu | Đá vôi trắng mạch xám, rãnh khắc nông. Móc sắt. Tay đỡ và chuông đồng. |
| Không vẽ | Bàn thờ, hương, tượng, đồ cúng, đèn lồng, ánh sáng trong rãnh, chữ đọc được. |
| Prompt = | A-BUILD + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 10000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết: đài không mái, nên 5 cột đá quanh mép đài mang 5 móc đèn (`FX_lantern_0..4`).
Tự quyết: đỉnh cột sau cách đất khoảng 5 m, để Đài Ấn gần cỡ nhà hỗ trợ trên màn hình (23.2).

```text
The Seal Dais, a low round stone stage, wider than tall; it is not a shrine and not an altar. A round dais of three wide limestone steps; its top is a flat round stage with shallow carved channels running out from the centre like the spokes of a wheel, and a big, flat, round carved stone seal disc set level in the very centre. Five square limestone posts, each rising about half as high as the dais is wide, stand evenly spaced around the edge of the top step, leaving the front open between two of them; each post is carved with swirling brush-stroke ornament that is clearly not letters, and has one small, thick iron hook near its top, facing outward, with nothing hanging from it. The post at the back centre is about twice as tall as the others, rising about as high as the dais is wide, and carries a short curved bronze arm holding a compact bronze wind chime: four short, thick chime tubes fused together into one solid cluster hanging close under the arm. At the front right, at the foot of the steps: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Calm, clear and quietly powerful. No altar, incense, statue or offerings.
```

### P17 · `level-pennant` · Cờ cấp chung

| Mục | Nội dung |
|---|---|
| Bậc | P (món thêm, lý do ở mục 2.1) |
| Là gì | Cờ đuôi nheo nhỏ dùng chung cho mọi nhà trừ Lũy. Game gắn ở `FX_banner`, tô màu họ nhà (23.3), hiện 1–3 vạch theo cấp (23.8: "cờ có vạch cấp"). Khi Bùng Nổ, cờ phần phật (23.4) bằng shader. |
| Ảnh 2D | `art-src/td/props/level-pennant.png` · 1024×1536 (dọc) |
| Model 3D | `art-src/3d/td/props/level-pennant.glb` |
| Cỡ | Cao khoảng 2,2 m trong game: cán khoảng 2 m, lá cờ dài khoảng 1,2 m. |
| Chất liệu | Cán gỗ nâu sẫm, núm gỗ tròn. Lá cờ vải trắng ngà trơn, để game tô màu. |
| Không vẽ | Vạch, hoa văn, chữ trên cờ; cờ bay; dây mảnh; chân đế rời. |
| Prompt = | A-PROP + B-VILLAGE + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 2000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết (22/10, đổi được): một cờ chung thay cho cờ riêng ở từng bộ cấp. Blender làm 3 bản texture có 1, 2, 3 vạch; game tô màu họ nhà.
Tự quyết: nhà đã có cờ riêng ở góc sau trái (Lũy; Tháp Pháo và Trại Lính cấp 3) thì không gắn cờ chung; vạch cấp dán lên cờ riêng bằng decal.

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A small village pennant on a short, thick, straight dark-brown wooden pole with a rounded wooden knob on top and a flat-cut bottom end. The pennant is a long swallow-tailed strip of plain ivory-white cloth, fixed along the upper part of the pole and hanging straight down, close beside the pole and touching it, its two tails ending in thick rounded points. The cloth is one smooth solid mass, completely plain, with no stripes, pattern or emblem. Simple and sturdy.
```

### P18 · `root-burst` · Rễ Trồi của Mộc Tinh

| Mục | Nội dung |
|---|---|
| Bậc | P (món thêm, lý do ở mục 2.1) |
| Là gì | Cụm rễ đa trồi lên dưới nhà khi Mộc Tinh dùng Rễ Trồi: nhà −30 máu, tê 3 s (22.7; đạn `root-burst` ở bảng 23.8). Dùng cho Mộc Tinh bản đồ 1 và bản đồ 3. |
| Ảnh 2D | `art-src/td/projectiles/root-burst.png` · 1024×1024 |
| Model 3D | `art-src/3d/td/projectiles/root-burst.glb` |
| Cỡ | Rộng khoảng 3 m, cao khoảng 2,5 m trong game. Blender co theo vòng nhà. |
| Chất liệu | Vỏ đa xám bạc có rãnh sẫm, như thân Mộc Tinh (`01-tripo-characters-enemies.md`, P17). Gò đất nâu nứt ở đáy. |
| Không vẽ | Lá, rễ con mảnh, đất văng, bụi, vệt mực, nhà. |
| Prompt = | A-PROP + prompt dưới + BG-G |
| Tripo | Image to 3D · face limit 4000 · không rig · không clip Tripo |
| Ảnh phụ | Không |

Tự quyết: 22.7 ghi Rễ Trồi dùng `root-burst.glb` của chủ dự án, nhưng file này không có trong repo, trong `art-src/` hay trong `media.md5` (kế hoạch Rift Defense V5 để nó ở đợt D, chưa làm). Chủ dự án có file thật thì dùng file đó và bỏ P18.
Tự quyết: lưu ở `projectiles/` như `seed-drop` (file VS, V69), vì bảng đạn 23.8 xếp hai món này cùng một hàng. Face 4000 (mức bộ cấp): to hơn đồ gắn nhưng ít chi tiết.

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A burst of giant tree roots erupting from the ground, made as one solid piece: five thick, twisting banyan roots of smooth silver-grey bark with darker grooves rise from a low, round mound of cracked brown earth with a flat underside, curling up and outward like a grasping hand; the tallest root is about as tall as the mound is wide, every tip is blunt and rounded, and all roots touch each other near the base. A few chunky earth clods cling to the roots near the bottom. Thick, chunky and menacing, but storybook-friendly. No leaves, no thin rootlets.
```

## 7. Bậc Sau (chỉ liệt kê)

| Số | Món | Ghi chú |
|---|---|---|
| S1 | `chest-small`: Rương nhỏ của boss phụ | 17.4 có bậc boss phụ, nhưng Thế giới 1 chưa có boss phụ. |
| S2 | Bộ nhà Thế giới 2 "Cồn Cát Hổ Phách": 10 nhà, bộ cấp, nhánh, đổ nát theo CivKit đoàn lữ hành | 26.3. Giữ bóng hình theo chức năng. |
| S3 | Bộ nhà Thế giới 3 "Bắc Phong Tuyết Ngâm", thêm nhà sưởi (nhà hỗ trợ mới) | 26.3 |
| S4 | Thế giới 4 "Quần Đảo Biển Sao": dùng lại GLB, đổi vật liệu bằng StylePack Neon; mốc mới (cầu sáng, pha lê Khe Nứt) | 23.12, 26.3 |
| S5 | Bộ nhà Thế giới 5 "Cao Nguyên Hỏa Thạch" | 26.3 |
| S6 | Mốc cảnh bản đồ phụ "Đồi Chè" và bản đồ neon "Khe Nứt Biển Sao" | 26.2: thuộc MVP, làm sau VS |
| S7 | Biến thể nhà (Xưởng Bản Vẽ), trang phục | 15.3, 27.2 |

## 8. Cho AI làm tiếp (Blender, manifest)

| Việc | Cách làm |
|---|---|
| Đầu vào | `art-src/3d/td/<loại>/<id>.glb`. Đây là bản gốc của chủ dự án, không sửa. |
| Công cụ | `scripts/models/blender/space_typing_model_tools.py`. Thêm `--kind buildings` (việc mới ở 23.9) cho nhà, bộ cấp, nhánh, đổ nát, mốc cảnh. Đề xuất `--kind items` cho đồ rơi, đạn, đồ dùng. AI không dựng model bằng mã (23.9). |
| Chuẩn hóa | Mét, +Y lên, mặt trước (mặt có cửa và mề đay; bục ở góc trước phải) quay về −Z như `src/render3d/model-contracts.ts`. Khác hợp đồng đó (gốc ở tâm hình): nhà và mốc cảnh đặt gốc ở tâm vòng chiếm chỗ, trên mặt đất. Phóng đều ba chiều cho bề ngang chân bằng 2r (bảng 3.2), không tính bục. Không kéo dãn riêng chiều cao. Đối chiếu chiều cao với dòng "Vòng, cao" của từng món; lệch quá 20 % thì báo chủ dự án. |
| Chiều cao Pháo | Tự quyết (22/10, đổi được): giữ dáng thấp tròn khoảng 4 m (P3, 23.12). 23.2 ghi Tháp Pháo 3,5–4,5 m, ngoại lệ của dòng Nhà đánh; `td-scale` dùng mức này cho Pháo. |
| Socket | Theo dòng "Socket" của từng món. Thêm tầng (bộ cấp 3, Lũy 3–4) thì dời `FX_top`, `FX_perch`, `FX_word`, `FX_crew`, `FX_muzzle` lên; ghi vị trí theo từng cấp. |
| Thư Đồng | Đứng cạnh tổ thợ ở `FX_crew` (22.3, 23.7), không đứng trên bục. Tổ thợ ở trên cao (Lũy, Tháp Cung, Tháp Thư Pháp): Thư Đồng đi vào cửa nhà, hiện ở `FX_crew`; khi hoảng thì hiện lại ở cửa rồi chạy về Lũy. |
| Đậu mái | Tự quyết (22/10, đổi được): `FX_perch` = `FX_top` + 0,6 m ở mọi nhà có mái, để thân Draconis không che gốc cột chữ (23.4, 23.9). Pháo cấp 1 và Đài Ấn không có mái, dù Draconis đậu ở đó (22.2): Pháo đậu ở mép sau tường ụ, Đài Ấn ở mép sau mặt đài. |
| `level-pennant` | Gắn ở `FX_banner` mọi nhà trừ Lũy, từ cấp 1. Tô màu họ nhà (23.3). Đổi texture 1, 2, 3 vạch theo cấp. Bùng Nổ: sóng vải bằng shader. Ẩn khi nhà có cờ riêng ở góc đó (Pháo, Trại Lính cấp 3); khi đó dán vạch lên cờ riêng. |
| `cannon-barrel` | Trục quay đứng ở tâm mâm xoay của `cannon`. Quay theo mục tiêu. Góc nâng khoảng 40°. Giật lùi trong `Building_Fire`. `FX_muzzle` ở miệng nòng. |
| `gold-mine-cart` | Chạy ra vào trên ray trong `Building_Work`. |
| `gold-pile-1..4` | Đặt ở `FX_pile`. Chọn bậc theo độ đầy của đống (dòng Tự quyết dưới bảng). |
| `chest-boss` | Tách nắp theo đường nối, bản lề ở sau. Mở sau 1,5 s (17.4). Đặt `gold-pile-2` vào lòng rương. |
| `root-burst` | Gốc ở tâm đáy gò đất. Co đều theo vòng nhà (S–XL). Trồi lên khi đòn đánh (sau 1,5 s báo trước bằng decal, 23.5), rút xuống khi nhà hết tê 3 s (22.7). |
| Cổng | Lũy: tách hai cánh cổng cho lễ mở ô. Trại Lính: lính ra từ giữa cổng (thiết kế không có socket riêng cho cổng). |
| Đèn lồng | Ảnh 2D đặt ở `FX_lantern_0..4`, đánh số trái sang phải nhìn từ trước. Đài Ấn đánh số theo chiều kim đồng hồ (P16). |
| Ruộng cấp 2 | Đổi màu khóm lúa sang vàng chín (xem P12). |
| Clip nhà (23.9) | Bắt buộc `Building_Idle`, `Building_Fire`. Nên có `Building_Work`, `Building_Hit`, `Building_Ruin`, phần lớn bằng shader. Không chuyển động gốc. |
| Hiệu năng (25.12) | ≤ 150 draw call ở High. Nhà vẽ instanced (26.2, bước 4). Mỗi model nên một vật liệu, một atlas. Giữ vùng vật liệu rõ (gỗ, đá, ngói, đồng, vải) để StylePack Neon đổi vật liệu (23.12). |
| Lũy | Lũy không có máu (mã: `hp: [0, 0, 0]`), nên không có đống đổ nát cho Lũy. |
| Manifest | `public/assets/td/models/manifest.json` (25.2). Chuỗi asset trong `src/td` bắt đầu bằng `/assets/td/` (25.3). Preset `scripts/models/presets/td-models.json` sinh từ bảng 23.9; file này chưa có. |
| Duyệt | Ảnh xem trước gửi chủ dự án duyệt trước khi đưa vào game (23.9). |
| Sao lưu | Sau khi thêm GLB, ở gốc repo cha: `node games/space-typing/scripts/models/index-3d-sources.mjs` (cập nhật `art-src/3d/SOURCES.json`), rồi `pnpm media:push`. |

Tự quyết: đống vàng dùng bậc 1 khi đống > 0 %, bậc 2 từ 25 %, bậc 3 từ 50 %, bậc 4 từ 75 % sức chứa đống.
Tự quyết: cỡ trong game của đồ rơi, đạn, nòng pháo, xe goòng, đống vàng, cờ cấp (dòng "Cỡ" ở từng món) do thiết kế chưa ghi; chỉnh sau khi xem trong game.
