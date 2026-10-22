# Prompt ảnh 2D → Tripo, bậc VS: nhà, bộ cấp, nhánh, mốc cảnh (Typing Defense, 22/10/2026)

> **Dành cho:** chủ dự án (tạo ảnh bằng ChatGPT, dựng model bằng Tripo); ChatGPT (đọc file theo đường dẫn repo, tạo ảnh); AI làm tiếp (Blender, manifest).
> **Lấy từ:** `docs/td/TYPING_DEFENSE_DESIGN.md` mục 11, 12.1–12.5, 16.1, 20.4, 22.1, 22.2, 22.4, 22.7, 22.9, 23.4, 23.6, 23.8–23.12, 25.2, 26.2, 27.2, 27.4. Mọi món ở đây là bậc **VS** (lát dọc, bước 5 ở 26.2). Làm sau bậc P.
> **File chính:** [`02-tripo-buildings-props.md`](02-tripo-buildings-props.md): luật chung (mục 3), bảng kiểm (3.7), Tripo (mục 5), việc của AI (mục 8). Khối prompt được chép lại ở mục 1 dưới đây.

```text
Instructions for ChatGPT
1. The owner asks for items by number, for example "V1-V4". Make one image per file name, one subject per image.
2. Build each prompt from the parts on the item's "Prompt =" line, in that order, copied word for word:
   the blocks from section 1 of this file, then the item's English prompt, then its background line.
   Do not shorten, reorder or add style words.
3. An item with a "Tham chiếu" (reference) line needs that approved image attached. If the owner has not
   attached it, ask for it first. Use it only as a reference for style, materials, scale and camera angle.
4. Use the exact image size written on the item: 1024x1024 (square), 1024x1536 (portrait) or 1536x1024 (landscape).
5. Never draw text, letters, numbers, logos, signatures or watermarks.
6. Before showing an image, check it against the checklist in section 1.
   If it fails, regenerate it once yourself and say what you fixed.
7. With each image, give the exact file name and the full save path from the item.
8. If anything is unclear, or two rules disagree, ask the owner. Do not guess.
```

## 1. Khối prompt (chép từ file chính, giữ y hệt)

Sửa khối nào thì sửa cả hai file.

### A-BUILD: đầu prompt nhà, bộ cấp, nhánh, đổ nát, mốc cảnh

```text
Single 3D-ready concept image of one game building, building part or landmark for a charming storybook fantasy tower-defense game, made to look like a hand-painted vinyl toy: chunky rounded shapes, thick sturdy proportions, a bold silhouette that still reads clearly from high above, matte hand-painted colours with soft, simple shading. As symmetrical as its design allows.
Camera: front three-quarter view, the subject turned about 30 degrees so its front face and its right side both show, looking down from about 35 degrees above, near-orthographic with no perspective distortion. The whole subject is in frame from its base to its top, centred, with a small even margin; nothing is cropped.
Its base is cut flat like a toy standing on a table: no ground, grass, loose rocks, path or props around it, and no shadow under it.
Flat, even front lighting: no cast shadows, no strong highlights, no rim light, no glow. No painted black outlines.
One connected solid object: every part touches the main body and nothing floats; every post, pole and rope is thick and sturdy, with no thin wires, strings or gaps; thatch, leaves, straw and cloth are grouped into a few big solid masses; cloth and flags hang still and close.
No fire, flames, smoke, steam, sparks, particles, magic glow, light rays or motion lines. No people, animals or creatures. No lanterns. No text, letters, numbers, logos or signatures. No frame, border or second view.
```

### A-PROP: đầu prompt đồ nhỏ, đồ dài, đạn

```text
Single 3D-ready concept image of one small game prop for a charming storybook fantasy tower-defense game, made to look like a hand-painted vinyl toy: chunky rounded shapes, thick sturdy proportions, a bold silhouette that reads at a small size, matte hand-painted colours with soft, simple shading.
The whole prop is in frame, centred, with a small even margin; nothing is cropped. It is alone: no ground, no shadow, nothing else in the image.
Flat, even front lighting: no cast shadows, no strong highlights, no rim light, no glow. No painted black outlines.
One connected solid object: every part touches and nothing floats; no thin strings, wires or gaps.
No fire, flames, smoke, sparks, particles, magic glow or motion lines. No people or animals. No text, letters, numbers or logos. No frame, border or second view.
```

### B-VILLAGE: phong cách làng Văn Điền

```text
World style "Van Dien valley": a cosy Vietnamese-inspired countryside of rice fields, bamboo villages and white limestone shores, in storybook fantasy. Village materials: limestone-white stone with soft grey seams, dark-brown timber, golden-tan dry bamboo (never green bamboo), wheat-gold rice-straw thatch, warm ochre rammed earth, woven bamboo mats, warm red-brown terracotta tiles, small vermilion-red lacquer accents and warm brown aged bronze fittings with no green patina. No teal or turquoise anywhere. Decoration is simple swirling brush-stroke ornament that is clearly not letters or characters of any writing system. Everything is humble village craft: no temple, pagoda, shrine, altar, incense, statue or religious symbol, no free-standing gate made of two posts and a crossbeam, and roofs curve only gently, with no dragons, figures or ornaments on their ridges.
```

### K-KIT: bộ cấp (sau B-VILLAGE)

```text
This image shows ONLY one add-on upgrade piece for the building in the attached reference image, drawn alone without the building. Match the reference exactly: the same camera angle, the same scale it would have on that building, and the same materials, colours and painting style. The piece is one connected solid object, with clean flat undersides or clean open frames where it fits onto the building.
```

### R-BRANCH: nhánh (sau B-VILLAGE)

```text
This is a specialised, more powerful version of the building in the attached reference image, drawn as one complete building: the same round footprint size, the same camera angle, scale and painting style, and the same small, low wooden platform with a little slanted writing desk at the front right corner. Keep the reference's other fixed features in the same places: the round carved stone medallion on the front, the straight, thick, empty eave beam along the front (or the same five lantern posts or hooks), the front door or gate if it has one, and, where there is a roof, a short, thick, flat-topped cap at its very top. Make it a little grander, with a silhouette clearly different from the reference, as described below.
```

### Dòng nền (cuối prompt)

| Tên | Khi nào | Dòng nền |
|---|---|---|
| BG-G | Vật không có màu xanh lá | `Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no green at all.` |
| BG-M | Vật có xanh lá (lúa, lá, rêu), không có hồng hay tím hồng | `Flat pure #FF00FF magenta background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no pink, magenta or bright purple at all.` |
| BG-B | Vật có cả xanh lá và hồng hoặc tím hồng | `Flat pure #0000FF blue background, perfectly uniform, no gradient, no shadow, no glow on it; the subject contains no blue at all.` |

- Ba dòng nền này giống từng chữ ở mọi file ảnh của bộ (01, 02, 03 và các file `-vs`). File 03 viết tắt G, M, B.

### Bảng kiểm ngắn (đủ ở mục 3.7 file chính)

- [ ] Một vật, đủ từ chân tới đỉnh, ở giữa, không bị cắt. Đúng góc ghi ở món.
- [ ] Đáy cắt phẳng. Không đất, cỏ, bóng quanh chân. Nền đúng màu, phẳng tuyệt đối.
- [ ] Không người, thú, đèn lồng, lửa, khói, hạt, ánh sáng, chữ. Không viền đen vẽ sẵn.
- [ ] Không sợi mảnh, không phần lơ lửng. Cờ, vải rủ yên.
- [ ] Bộ cấp: chỉ có món gắn thêm, không vẽ nhà. Nhánh, skin: vẫn có bục gỗ có bàn viết ở góc trước phải, mề đay đá ở mặt trước, xà mái trước trống (hoặc cột, móc đèn), cửa trước (nếu nhà gốc có), chóp mái bằng.
- [ ] Tre vàng nâu, không xanh. Không xanh ngọc. Đồ đồng nâu ấm, không gỉ xanh. Không có gì giống đền, chùa. Không dấu chữ thập.

### Tripo

Đặt như mục 5 file chính. Mọi món ở đây: Image to 3D, texture và PBR bật, **không rig**, không clip Tripo, xuất GLB, không ảnh phụ.

Tự quyết: nhánh là model trọn (12.1 "nhánh có model riêng", 23.8 "đổi model"), nên dùng mức nhà 10000, không dùng 4000 của "phần nhánh".
Tự quyết: `keep-kit-l2` dùng 8000 vì vòng tường lớn ngang mốc cảnh.
Tự quyết: đống đổ nát dùng 8000 (mức mốc cảnh): đống thấp, ít chi tiết hơn nhà, nhưng rộng bằng cả vòng nhà. Đồ dùng vừa (giàn tre, Rào Tre, Cầu Tre) 4000 như bộ cấp; Gỗ Lăn, nòng cấp 3 và đạn 2000 như đồ gắn.
Tự quyết: món cao mảnh (Thần Tiễn, cờ Pháo cấp 3, cọ cấp 3, hải đăng) dùng ảnh dọc 1024×1536; món rộng thấp (đổ nát XL, cầu, vách, thềm, đồ dài) dùng ảnh ngang 1536×1024; còn lại 1024×1024. Skin và nhánh Ruộng dùng ảnh vuông như `farm`, vì có chòi canh cao (P12 file chính).

## 2. Bảng VS

Ảnh 2D ở `art-src/td/<đường dẫn>`. Model ở `art-src/3d/td/<đường dẫn>`, đuôi `.glb`. Mọi đường dẫn tính từ thư mục game `games/space-typing/`.

| Số | id | Tên | Ảnh 2D | Cỡ ảnh | Nền | Face |
|---|---|---|---|---|---|---|
| V1 | `scribe` | Tháp Thư Pháp cấp 1 | `buildings/scribe.png` | 1024×1024 | BG-G | 10000 |
| V2 | `infirmary` | Nhà Thuốc cấp 1 | `buildings/infirmary.png` | 1024×1024 | BG-M | 10000 |
| V3 | `lumber` | Trại Gỗ cấp 1 | `buildings/lumber.png` | 1024×1024 | BG-G | 10000 |
| V4 | `farm-ao-ca` | Ruộng, skin Ao Cá | `buildings/farm-ao-ca.png` | 1024×1024 | BG-M | 10000 |
| V5 | `farm-nuong` | Ruộng, skin Nương | `buildings/farm-nuong.png` | 1024×1024 | BG-M | 10000 |
| V6 | `keep-kit-l2` | Lũy cấp 2 | `kits/keep-kit-l2.png` | 1024×1024 | BG-G | 8000 |
| V7 | `keep-kit-l3` | Lũy cấp 3 | `kits/keep-kit-l3.png` | 1024×1024 | BG-G | 4000 |
| V8 | `keep-kit-l4` | Lũy cấp 4 | `kits/keep-kit-l4.png` | 1024×1024 | BG-G | 4000 |
| V9 | `archer-kit-l2` | Tháp Cung cấp 2 | `kits/archer-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V10 | `archer-kit-l3` | Tháp Cung cấp 3 | `kits/archer-kit-l3.png` | 1024×1024 | BG-G | 4000 |
| V11 | `cannon-kit-l2` | Tháp Pháo cấp 2 | `kits/cannon-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V12 | `cannon-kit-l3` | Tháp Pháo cấp 3: cờ | `kits/cannon-kit-l3.png` | 1024×1536 | BG-G | 4000 |
| V13 | `cannon-barrel-l3` | Tháp Pháo cấp 3: nòng vằn | `kits/cannon-barrel-l3.png` | 1536×1024 | BG-G | 2000 |
| V14 | `barracks-kit-l2` | Trại Lính cấp 2 | `kits/barracks-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V15 | `barracks-kit-l3` | Trại Lính cấp 3 | `kits/barracks-kit-l3.png` | 1024×1024 | BG-G | 4000 |
| V16 | `gold-mine-kit-l2` | Mỏ Vàng cấp 2 | `kits/gold-mine-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V17 | `gold-mine-kit-l3` | Mỏ Vàng cấp 3 | `kits/gold-mine-kit-l3.png` | 1024×1024 | BG-G | 4000 |
| V18 | `farm-kit-l2` | Ruộng Lúa cấp 2 | `kits/farm-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V19 | `farm-kit-l3` | Ruộng Lúa cấp 3 | `kits/farm-kit-l3.png` | 1024×1024 | BG-G | 4000 |
| V20 | `seal-dais-kit-l2` | Đài Ấn cấp 2 | `kits/seal-dais-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V21 | `seal-dais-kit-l3` | Đài Ấn cấp 3 | `kits/seal-dais-kit-l3.png` | 1024×1024 | BG-G | 4000 |
| V22 | `scribe-kit-l2` | Tháp Thư Pháp cấp 2 | `kits/scribe-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V23 | `scribe-kit-l3` | Tháp Thư Pháp cấp 3: cọ lơ lửng | `kits/scribe-kit-l3.png` | 1024×1536 | BG-G | 4000 |
| V24 | `infirmary-kit-l2` | Nhà Thuốc cấp 2 | `kits/infirmary-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V25 | `infirmary-kit-l3` | Nhà Thuốc cấp 3 | `kits/infirmary-kit-l3.png` | 1024×1024 | BG-M | 4000 |
| V26 | `lumber-kit-l2` | Trại Gỗ cấp 2 | `kits/lumber-kit-l2.png` | 1024×1024 | BG-G | 4000 |
| V27 | `lumber-kit-l3` | Trại Gỗ cấp 3 | `kits/lumber-kit-l3.png` | 1024×1024 | BG-G | 4000 |
| V28 | `archer-en-bao` | Cung, nhánh Én Bão | `branches/archer-en-bao.png` | 1024×1024 | BG-G | 10000 |
| V29 | `archer-than-tien` | Cung, nhánh Thần Tiễn | `branches/archer-than-tien.png` | 1024×1536 | BG-G | 10000 |
| V30 | `cannon-coi-lon` | Pháo, nhánh Cối Lớn | `branches/cannon-coi-lon.png` | 1024×1024 | BG-G | 10000 |
| V31 | `cannon-vac-lua` | Pháo, nhánh Vạc Lửa | `branches/cannon-vac-lua.png` | 1024×1024 | BG-G | 10000 |
| V32 | `scribe-but-loi` | Thư Pháp, nhánh Bút Lôi | `branches/scribe-but-loi.png` | 1024×1024 | BG-G | 10000 |
| V33 | `scribe-muc-bang` | Thư Pháp, nhánh Mực Băng | `branches/scribe-muc-bang.png` | 1024×1024 | BG-G | 10000 |
| V34 | `barracks-khien-dong` | Trại Lính, nhánh Khiên Đồng | `branches/barracks-khien-dong.png` | 1024×1024 | BG-G | 10000 |
| V35 | `barracks-giao-dai` | Trại Lính, nhánh Giáo Dài | `branches/barracks-giao-dai.png` | 1024×1024 | BG-G | 10000 |
| V36 | `gold-mine-ham-sau` | Mỏ, nhánh Hầm Sâu | `branches/gold-mine-ham-sau.png` | 1024×1024 | BG-G | 10000 |
| V37 | `gold-mine-lo-duc-tien` | Mỏ, nhánh Lò Đúc Tiền | `branches/gold-mine-lo-duc-tien.png` | 1024×1024 | BG-G | 10000 |
| V38 | `farm-bac-thang` | Ruộng, nhánh Bậc Thang | `branches/farm-bac-thang.png` | 1024×1024 | BG-M | 10000 |
| V39 | `farm-chuong-trau` | Ruộng, nhánh Chuồng Trâu | `branches/farm-chuong-trau.png` | 1024×1024 | BG-M | 10000 |
| V40 | `lumber-xuong-cua` | Trại Gỗ, nhánh Xưởng Cưa | `branches/lumber-xuong-cua.png` | 1024×1024 | BG-G | 10000 |
| V41 | `lumber-xuong-rao` | Trại Gỗ, nhánh Xưởng Rào | `branches/lumber-xuong-rao.png` | 1024×1024 | BG-G | 10000 |
| V42 | `seal-dais-phong-an` | Đài Ấn, nhánh Phong Ấn | `branches/seal-dais-phong-an.png` | 1024×1024 | BG-G | 10000 |
| V43 | `seal-dais-vang-am` | Đài Ấn, nhánh Vang Âm | `branches/seal-dais-vang-am.png` | 1024×1024 | BG-G | 10000 |
| V44 | `infirmary-vuon-thao-duoc` | Nhà Thuốc, nhánh Vườn Thảo Dược | `branches/infirmary-vuon-thao-duoc.png` | 1024×1024 | BG-M | 10000 |
| V45 | `infirmary-tram-cuu-thuong` | Nhà Thuốc, nhánh Trạm Cứu Thương | `branches/infirmary-tram-cuu-thuong.png` | 1024×1024 | BG-M | 10000 |
| V46 | `ruin-s` | Đổ nát cỡ S | `ruins/ruin-s.png` | 1024×1024 | BG-G | 8000 |
| V47 | `ruin-m` | Đổ nát cỡ M | `ruins/ruin-m.png` | 1024×1024 | BG-G | 8000 |
| V48 | `ruin-l` | Đổ nát cỡ L | `ruins/ruin-l.png` | 1024×1024 | BG-G | 8000 |
| V49 | `ruin-xl` | Đổ nát cỡ XL | `ruins/ruin-xl.png` | 1536×1024 | BG-G | 8000 |
| V50 | `vach-thac-bac` | Vách Thác Bạc | `landmarks/vach-thac-bac.png` | 1536×1024 | BG-M | 8000 |
| V51 | `cau-go` | Cầu gỗ | `landmarks/cau-go.png` | 1536×1024 | BG-G | 8000 |
| V52 | `choi-canh-doi` | Chòi canh trên đồi | `landmarks/choi-canh-doi.png` | 1024×1024 | BG-G | 8000 |
| V53 | `hai-dang` | Hải đăng | `landmarks/hai-dang.png` | 1024×1536 | BG-G | 8000 |
| V54 | `cau-tau` | Cầu tàu | `landmarks/cau-tau.png` | 1536×1024 | BG-G | 8000 |
| V55 | `nha-rai-da` | Nhà Rái Đá trên cọc | `landmarks/nha-rai-da.png` | 1024×1024 | BG-G | 8000 |
| V56 | `them-da-trang` | Thềm Đá Trắng | `landmarks/them-da-trang.png` | 1536×1024 | BG-G | 8000 |
| V57 | `goc-da-rong` | Gốc đa rỗng | `landmarks/goc-da-rong.png` | 1024×1024 | BG-M | 8000 |
| V58 | `cau-do` | Cầu Đỏ | `landmarks/cau-do.png` | 1536×1024 | BG-G | 8000 |
| V59 | `da-ke` | Đá Kê | `landmarks/da-ke.png` | 1536×1024 | BG-G | 8000 |
| V60 | `re-vom` | Rễ khổng lồ uốn qua đường | `landmarks/re-vom.png` | 1024×1024 | BG-M | 8000 |
| V61 | `thac-ho-sut` | Thác đổ vào Hố Sụt | `landmarks/thac-ho-sut.png` | 1536×1024 | BG-M | 8000 |
| V62 | `scaffold-bamboo` | Giàn tre | `props/scaffold-bamboo.png` | 1024×1024 | BG-G | 4000 |
| V63 | `rao-tre` | Rào Tre | `props/rao-tre.png` | 1536×1024 | BG-G | 4000 |
| V64 | `cau-tre` | Cầu Tre | `props/cau-tre.png` | 1536×1024 | BG-G | 4000 |
| V65 | `go-lan` | Gỗ Lăn | `props/go-lan.png` | 1536×1024 | BG-G | 2000 |
| V66 | `pebble` | Viên ná của Tre | `projectiles/pebble.png` | 1024×1024 | BG-G | 2000 |
| V67 | `meteor` | Đá lửa (Mưa Đá Lửa) | `projectiles/meteor.png` | 1024×1024 | BG-G | 2000 |
| V68 | `quill` | Lông Đại Bàng Tinh | `projectiles/quill.png` | 1536×1024 | BG-G | 2000 |
| V69 | `seed-drop` | Hạt Mộc Tinh | `projectiles/seed-drop.png` | 1024×1024 | BG-G | 2000 |
| V70 | `fire-feather` | Lông lửa Draconis | `projectiles/fire-feather.png` | 1536×1024 | BG-G | 2000 |

Tự quyết: id nhánh là `<id nhà>-<tên nhánh không dấu>`; id mốc cảnh và đồ dùng của Tre là tên tiếng Việt không dấu (cách đặt id quái ở 22.6); id đạn theo bảng 23.8.

Thêm vào 27.2 (lý do một dòng mỗi nhóm):
- V4, V5: bản đồ 2 và 3 (VS) dùng Ao Cá và Nương làm Ruộng (22.4, 22.9).
- V13: Tháp Pháo cấp 3 là "nòng vằn" (22.4), mà nòng là model riêng (P4).
- V62: 22.4 và 23.8 có trạng thái công trường, nâng cấp bằng giàn tre; Tối Thượng của Tre dựng giàn quanh nhà.
- V63–V65: kỹ năng của Tre (22.2), nhánh Xưởng Rào (12.3) và Bùng Nổ Trại Gỗ (11.6) cần các vật này.
- V66–V70: bảng đạn 23.8 cần model cho đạn của Tre, Phép Chỉ huy, hai boss VS và Tối Thượng của Draconis.

## 3. Nhà cấp 1 và skin Ruộng (V1–V5)

Luật socket, vòng, chất liệu như mục 3 file chính. Bục trợ lực ở góc trước phải. V1–V3 chưa có ảnh gốc: đính kèm `keep.png` đã duyệt làm ảnh mẫu phong cách (27.4); chỉ lấy phong cách, vật liệu, góc nhìn, không lấy dáng.

### V1 · VS · `scribe` · Tháp Thư Pháp, cấp 1

- **Là gì:** tháp phép, đánh đất và bay; Phát Chữ là nét mực xuyên (11.3). Thiết kế 22.4: "Tháp gỗ son hai tầng, nghiên mực, cây cọ".
- **Ảnh:** `art-src/td/buildings/scribe.png` · 1024×1024 · **Tham chiếu:** `keep.png` (chỉ phong cách) → **Model:** `art-src/3d/td/buildings/scribe.glb`
- **Vòng, cao:** M · r 2,3 m (Ø 4,6 m) · cao 6–7,5 m. **Bóng hình:** tháp vuông hai tầng, cây cọ khổng lồ ở ban công.
- **Socket:** `FX_assist` bục trước phải · `FX_core` mề đay trên cửa · `FX_top`, `FX_word` chóp mái tầng trên · `FX_lantern_0..4` xà mái hiên tầng dưới · `FX_crew` ban công tầng trên (Thầy Đồ Mực) · `FX_muzzle` đầu cọ · `FX_banner` góc sau trái.
- **Chừa cho cấp sau:** mái tầng trên trơn (L2: khung cuộn giấy); khoảng trống trước góc trái tầng trên (L3: cọ lơ lửng).
- **Không vẽ:** thầy đồ, cuộn giấy treo, mực bay, đèn lồng, cờ.
- **Prompt =** A-BUILD + B-VILLAGE + prompt dưới + BG-G · **Tripo:** face 10000 · **Ảnh phụ:** không.

```text
The Scribe Tower, a scholar's two-storey study tower, not a pagoda, about one and a half times as tall as it is wide, on a square limestone footing that fills the footprint. Ground floor: vermilion-red lacquered timber walls with two round paper windows and a front door, under a wide porch roof of terracotta tiles; along the front, under that roof edge, a straight, thick eave beam with nothing hanging from it, and a round carved stone medallion above the door. Upper floor: a smaller square writing room with big cream paper windows under a gently curved terracotta hip roof that ends in a short, thick, flat-topped ridge cap; its eaves are plain. On the upper floor's front balcony, a big flat black inkstone, and above it, resting in a sturdy wooden rack, a giant calligraphy brush with a thick bamboo handle and a solid black teardrop-shaped tip pointing forward and up. At the front right: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Learned, elegant and a little magical.
```

### V2 · VS · `infirmary` · Nhà Thuốc, cấp 1

- **Là gì:** hồi máu lính và Tướng quanh nhà, không hồi nhà (11.8). Thiết kế 22.4: "Nhà tranh, giàn phơi thảo dược, nồi sắc thuốc".
- **Ảnh:** `art-src/td/buildings/infirmary.png` · 1024×1024 · **Tham chiếu:** `keep.png` (chỉ phong cách) → **Model:** `art-src/3d/td/buildings/infirmary.glb`
- **Vòng, cao:** M · r 2,3 m (Ø 4,6 m) · cao 5–6 m. **Bóng hình:** nhà tranh tròn mái rơm dày, giàn phơi bên trái.
- **Socket:** `FX_assist` bục trước phải · `FX_core` mề đay trên cửa · `FX_top`, `FX_word` chóp nóc · `FX_lantern_0..4` xà hiên trước · `FX_crew` cạnh nồi thuốc, trước trái (Bà Lang Thơm) · `FX_banner` góc sau trái.
- **Chừa cho cấp sau:** vách phải trơn (L2); góc sau phải trống (L3).
- **Không vẽ:** bà lang, lửa, hơi thuốc, lá bay, đèn lồng, hoa hồng, dấu chữ thập.
- **Prompt =** A-BUILD + B-VILLAGE + prompt dưới + BG-M · **Tripo:** face 10000 · **Ảnh phụ:** không.

```text
The Infirmary, a cosy round village cottage, about as tall as it is wide. Warm ochre rammed-earth walls on a low limestone footing that fills the footprint, a thick, rounded roof of wheat-gold rice-straw thatch ending in a short, thick, flat-topped ridge cap, and a small front porch on two thick posts; along the front, under the porch roof edge, a straight, thick eave beam with nothing hanging from it, and a round carved stone medallion above the door. On the left, a sturdy golden-tan bamboo drying rack hung with bundles of fresh green herbs grouped into a few big solid clumps. In front on the left, a big round clay medicine pot on a small clay stove, cold, with no fire or steam. The right side and the back right of the cottage are plain. At the front right: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. No cross symbol or medical emblem anywhere. Warm and caring.
```

### V3 · VS · `lumber` · Trại Gỗ, cấp 1

- **Là gì:** ra Gỗ, đặt trên node rừng (11.6). Thiết kế 22.4: "Lán gỗ, chồng gỗ, cưa hai người kéo".
- **Ảnh:** `art-src/td/buildings/lumber.png` · 1024×1024 · **Tham chiếu:** `keep.png` (chỉ phong cách) → **Model:** `art-src/3d/td/buildings/lumber.glb`
- **Vòng, cao:** L · r 2,7 m (Ø 5,4 m) · cao 5–6 m. **Bóng hình:** lán mái hai mái, chồng gỗ tròn bên trái.
- **Socket:** `FX_assist` bục trước phải · `FX_core` mề đay trên cột trước · `FX_top`, `FX_word` chóp nóc · `FX_lantern_0..4` xà mái trước · `FX_crew` gốc cây có rìu, trước trái (Chú Tiều) · `FX_banner` góc sau trái.
- **Chừa cho cấp sau:** bên phải sàn trống (L2); phía sau lán trống (L3).
- **Không vẽ:** tiều phu, mùn cưa bay, cây sống, lá xanh, đèn lồng.
- **Prompt =** A-BUILD + B-VILLAGE + prompt dưới + BG-G · **Tripo:** face 10000 · **Ảnh phụ:** không.

```text
The Lumber Camp, an open woodcutters' shed, wider than tall. On a flat floor of planks and packed earth that fills the footprint stands an open-sided timber shed on thick posts under a broad gable roof of wheat-gold thatch that ends in a short, thick, flat-topped ridge cap; along the front, under the roof edge, a straight, thick eave beam with nothing hanging from it, and a round carved stone medallion on the front post. Under the roof, a sturdy sawhorse trestle holds a big log with a broad, thick two-man saw half sunk into it, its two thick wooden handles sticking up. On the left, a neat tall stack of round logs with pale cut ends showing rings. In front on the left, a broad tree stump with a chunky axe sunk into it. The right side of the floor and the space behind the shed are clear. At the front right: a small, low wooden platform, one step high, with a little slanted writing desk at its front edge. Hearty and outdoorsy.
```

### V4 · VS · `farm-ao-ca` · Ruộng Lúa, skin Ao Cá (bản đồ 2)

- **Là gì:** Ruộng của bản đồ 2, nằm trong Vũng Thuyền; Thủy Triều làm sản lượng lên xuống (22.9).
- **Ảnh:** `art-src/td/buildings/farm-ao-ca.png` · 1024×1024 · **Tham chiếu:** `farm.png` → **Model:** `art-src/3d/td/buildings/farm-ao-ca.glb`
- **Socket:** như `farm`. `FX_crew` ở mặt nước trước trái. Bờ góc sau trái và giữa bờ trái để trống cho bộ cấp Ruộng (V18, V19).
- **Prompt =** A-BUILD + B-VILLAGE + prompt dưới + BG-M · **Tripo:** face 10000 · **Ảnh phụ:** không.

Tự quyết: skin giữ nguyên chòi, bục, cọc mốc của `farm`, để bộ cấp Ruộng lắp được cả ba.

```text
The Fish Pond, the seashore version of the Rice Field in the reference: keep the field hut at the back right, the field-marker stone on the front bank and the small wooden platform at the front right exactly as they are. Replace the rice paddy with a round village fish pond edged by low, flat-topped banks of pale sandy earth: calm, flat silver-blue water, a few round lily pads with two white water-lily flowers as solid shapes, and, instead of the scarecrow, two chunky woven bamboo fish traps standing in the water on a short, thick post. The back left corner and the middle of the left bank stay plain, empty bank. No fish visible. Breezy and peaceful.
```

### V5 · VS · `farm-nuong` · Ruộng Lúa, skin Nương (bản đồ 3)

- **Là gì:** Ruộng của bản đồ 3, đặt ở vùng Nương trên sườn (22.9).
- **Ảnh:** `art-src/td/buildings/farm-nuong.png` · 1024×1024 · **Tham chiếu:** `farm.png` → **Model:** `art-src/3d/td/buildings/farm-nuong.glb`
- **Socket:** như `farm`. Bờ góc sau trái và giữa bờ trái để trống cho bộ cấp Ruộng (V18, V19).
- **Prompt =** A-BUILD + B-VILLAGE + prompt dưới + BG-M · **Tripo:** face 10000 · **Ảnh phụ:** không.

```text
The Hill Field, the forest version of the Rice Field in the reference: keep the field hut at the back right, the field-marker stone at the front and the small wooden platform at the front right exactly as they are. Replace the flooded paddy with a dry upland field on two low, curved earth terraces stepping down toward the front, held by low walls of stone and earth, planted with rows of chunky clumps of upland rice and a few sturdy corn plants whose leaves are grouped into solid shapes; instead of the scarecrow, a wooden post topped with a small bamboo clapper, fused solid. The back left corner and the middle of the left edge stay plain, empty earth bank. Sunny and hard-working.
```

## 4. Bộ cấp L2, L3 (V6–V27)

- Bộ cấp là món gắn thêm lên model cấp 1 (12.1). Khi nâng, bộ cấp rơi từ trên xuống và nảy (23.8).
- **Tham chiếu** là ảnh cấp 1 đã duyệt của nhà đó. **Lắp vào** là chỗ Blender đặt bộ cấp.
- Mọi bộ cấp: **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt + nền ghi ở món (trừ V13, V23 dùng A-PROP). Tripo không rig. Ảnh phụ: không.

### V6 · VS · `keep-kit-l2` · Lũy cấp 2: tường đá cao, cổng có trống, chòi nỏ

- **Lắp vào:** đứng trên vòng sân đá ngoài của `keep`; cổng mới ôm cổng cũ; chừa góc trước phải cho bục.
- **Ảnh:** `art-src/td/kits/keep-kit-l2.png` · 1024×1024 · **Tham chiếu:** `keep.png` → **Model:** `art-src/3d/td/kits/keep-kit-l2.glb` · face 8000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

Tự quyết: từ cấp 2, `FX_muzzle` và `FX_crew` của Lũy chuyển sang chòi nỏ: Lão Gác Cổng bắn nỏ lớn ở đó.

```text
The level-2 wall ring for the Bastion: a ring of tall limestone-block walls with terracotta-tiled tops, shaped to stand on the empty outer stone apron of the reference all the way round, leaving one gap at the front right corner for the small wooden platform. In the middle of the front, a sturdy stone gatehouse that frames the fort's gate, open in the middle and low enough to leave the round medallion above the fort's gate in view, under a small terracotta-tiled roof that shelters a big round war drum with a red-brown hide face. At the front left corner, a round stone crossbow turret, a little taller than the walls, with a flat, roomy top floor behind a waist-high parapet and a big mounted crossbow with thick wooden bow arms and no string. The inside of the ring is empty.
```

### V7 · VS · `keep-kit-l3` · Lũy cấp 3: tháp canh hai tầng

- **Lắp vào:** chụp lên chòi canh trên đỉnh `keep`, che kín chòi cũ. `FX_top`, `FX_perch`, `FX_word` dời lên tầng trên. `FX_crew` ở lại chòi nỏ (V6).
- **Ảnh:** `art-src/td/kits/keep-kit-l3.png` · 1024×1024 · **Tham chiếu:** `keep.png` → **Model:** `art-src/3d/td/kits/keep-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-3 watchtower for the Bastion: a two-storey square timber watchtower shell made to slip over the small watch hut on top of the reference and hide it. Each storey has an open lookout floor with a waist-high railing and its own gently curved terracotta hip roof; the upper roof ends in a short, thick, flat-topped ridge cap. The bottom is an open square frame that fits over the old watch hut.
```

### V8 · VS · `keep-kit-l4` · Lũy cấp 4: mái vàng

- **Lắp vào:** chụp lên mái trên cùng của tháp canh cấp 3. "Vòng chữ lơ lửng" của cấp 4 (22.4) là VFX, không vào ảnh.
- **Ảnh:** `art-src/td/kits/keep-kit-l4.png` · 1024×1024 · **Tham chiếu:** `keep.png` và `keep-kit-l3.png` → **Model:** `art-src/3d/td/kits/keep-kit-l4.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-4 golden roof for the Bastion: a gently curved hip roof of glazed golden-yellow tiles with a short, thick, flat-topped ridge cap trimmed in gold, made to sit over the top roof of the level-3 watchtower and hide it. Hollow underneath.
```

### V9 · VS · `archer-kit-l2` · Tháp Cung cấp 2: mái ngói, lan can

- **Lắp vào:** mái ngói chụp kín mái lá; lan can ôm sàn canh; bốn cột góc nối hai phần.
- **Ảnh:** `art-src/td/kits/archer-kit-l2.png` · 1024×1024 · **Tham chiếu:** `archer.png` → **Model:** `art-src/3d/td/kits/archer-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-2 roof and railing for the Archer Tower: a pyramid roof of terracotta tiles, slightly larger than the thatch roof of the reference so it covers it completely, ending in a small, thick, flat round cap; along the front, under the tile edge, a straight, thick eave beam with nothing hanging from it; its four thick corner posts reach down to a waist-high square timber railing with vermilion-red caps that wraps the lookout platform. Roof, posts and railing are one connected frame, hollow inside.
```

### V10 · VS · `archer-kit-l3` · Tháp Cung cấp 3: chòi hai tầng

- **Lắp vào:** đế ván đặt trên chóp bằng của mái cấp 2. `FX_top`, `FX_perch`, `FX_word`, `FX_crew`, `FX_muzzle` dời lên tầng mới.
- **Ảnh:** `art-src/td/kits/archer-kit-l3.png` · 1024×1024 · **Tham chiếu:** `archer.png` → **Model:** `art-src/3d/td/kits/archer-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-3 upper storey for the Archer Tower: a small square bamboo lookout hut, open on all sides above a waist-high railing, with its own small terracotta pyramid roof and a flat round cap, standing on a thick square plank base made to sit on the flat cap of the level-2 roof.
```

### V11 · VS · `cannon-kit-l2` · Tháp Pháo cấp 2: viền đá, mái che

- **Lắp vào:** vòng đá đặt trên mặt tường ụ; mái che phủ nửa sau sàn pháo; giữa để trống cho nòng. `FX_perch` dời từ mép sau tường ụ lên mép sau mái che (file chính, mục 8).
- **Ảnh:** `art-src/td/kits/cannon-kit-l2.png` · 1024×1024 · **Tham chiếu:** `cannon.png` → **Model:** `art-src/3d/td/kits/cannon-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-2 stone rim and canopy for the Cannon Tower: a ring of thick limestone capstones made to sit on top of the round earthen parapet of the reference, with five notches at the front where the five short lantern posts of the reference stand, joined at the back to a small lean-to canopy of terracotta tiles on two thick timber posts that shelters the back half of the gun floor, leaving the centre open to the sky.
```

### V12 · VS · `cannon-kit-l3` · Tháp Pháo cấp 3: cờ đỏ

- **Lắp vào:** chân đá đặt ở góc sau trái tường ụ (`FX_banner`).
- **Ảnh:** `art-src/td/kits/cannon-kit-l3.png` · 1024×1536 · **Tham chiếu:** `cannon.png` → **Model:** `art-src/3d/td/kits/cannon-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-3 banner for the Cannon Tower: one thick timber flagpole on a heavy square stone foot, carrying a vermilion-red cloth flag with a simple bronze-coloured swirl emblem, hanging still and close to the pole.
```

### V13 · VS · `cannon-barrel-l3` · Tháp Pháo cấp 3: nòng vằn

- **Lắp vào:** thay `cannon-barrel` trên mâm xoay; cùng cỡ, cùng điểm gắn, cùng `FX_muzzle`.
- **Ảnh:** `art-src/td/kits/cannon-barrel-l3.png` · 1536×1024 · **Tham chiếu:** `cannon-barrel.png` → **Model:** `art-src/3d/td/kits/cannon-barrel-l3.glb` · face 2000 · BG-G
- **Prompt =** A-PROP + B-VILLAGE + prompt dưới + BG-G.

```text
Camera: exact side view at 90 degrees, near-orthographic, the barrel lying horizontal with its mouth to the left.
The level-3 cannon barrel, the same size and shape as the level-1 bronze barrel in the reference but grander: bold alternating bands of dark bronze and vermilion-red lacquer along its length, a wide flared mouth with a thick lip on the left, one broad smooth band around its middle where it rests in its mount, and a rounded knob at the back end on the right.
```

### V14 · VS · `barracks-kit-l2` · Trại Lính cấp 2: chòi canh

- **Lắp vào:** bốn chân cột đứng ở sân trống góc sau phải trong rào.
- **Ảnh:** `art-src/td/kits/barracks-kit-l2.png` · 1024×1024 · **Tham chiếu:** `barracks.png` → **Model:** `art-src/3d/td/kits/barracks-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-2 watch hut for the Barracks: a small square timber watch hut on four thick posts, its floor higher than the palisade, open on all sides above a waist-high railing, under a small wheat-gold thatch roof, made to stand in the empty back-right yard inside the palisade of the reference.
```

### V15 · VS · `barracks-kit-l3` · Trại Lính cấp 3: cờ đỏ, mái ngói

- **Lắp vào:** mái ngói chụp kín mái rơm của nhà trại; hai cờ ở hai góc sau.
- **Ảnh:** `art-src/td/kits/barracks-kit-l3.png` · 1024×1024 · **Tham chiếu:** `barracks.png` → **Model:** `art-src/3d/td/kits/barracks-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-3 roof for the Barracks: a broad, low, gently curved roof of terracotta tiles, slightly larger than the thatch roof of the reference so it covers it completely, with a short, thick, flat-topped ridge cap, and two short, thick flagpoles fixed at its back corners carrying vermilion-red flags that hang still. Hollow underneath.
```

### V16 · VS · `gold-mine-kit-l2` · Mỏ Vàng cấp 2: tời quay tay

- **Lắp vào:** đế đá và ván đặt trên vai đá bên phải.
- **Ảnh:** `art-src/td/kits/gold-mine-kit-l2.png` · 1024×1024 · **Tham chiếu:** `gold-mine.png` → **Model:** `art-src/3d/td/kits/gold-mine-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-2 hand winch for the Gold Mine: a big wooden winch drum wrapped in thick coiled rope on a sturdy timber stand with a thick crank handle, built on a flat footing of rock and planks made to sit on the plain right shoulder of the rock outcrop in the reference.
```

### V17 · VS · `gold-mine-kit-l3` · Mỏ Vàng cấp 3: guồng nước

- **Lắp vào:** khung gỗ áp vào mặt đá bên trái. Nước là shader, không vào ảnh.
- **Ảnh:** `art-src/td/kits/gold-mine-kit-l3.png` · 1024×1024 · **Tham chiếu:** `gold-mine.png` → **Model:** `art-src/3d/td/kits/gold-mine-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-3 water wheel for the Gold Mine: a big wooden water wheel with thick paddles and an iron hub, fed by a short open wooden flume on thick supports, all mounted on a flat timber frame made to sit against the plain left rock face of the outcrop in the reference. No water.
```

### V18 · VS · `farm-kit-l2` · Ruộng Lúa cấp 2: đống rơm (lúa chín)

- **Lắp vào:** đế đất đặt ở bờ góc sau trái. Cùng lúc, Blender đổi khóm mạ sang màu lúa chín (xem P12 file chính).
- **Ảnh:** `art-src/td/kits/farm-kit-l2.png` · 1024×1024 · **Tham chiếu:** `farm.png` → **Model:** `art-src/3d/td/kits/farm-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-2 harvest stack for the Rice Field: a big rounded rice-straw stack built around a thick centre pole, beside a short, sturdy golden-tan bamboo drying rack draped with thick sheaves of golden ripe rice, both on one flat earth footing made to sit on the empty back-left bank of the reference.
```

### V19 · VS · `farm-kit-l3` · Ruộng Lúa cấp 3: cối giã gạo nước

- **Lắp vào:** đế đất đá đặt ở giữa bờ trái.
- **Ảnh:** `art-src/td/kits/farm-kit-l3.png` · 1024×1024 · **Tham chiếu:** `farm.png` → **Model:** `art-src/3d/td/kits/farm-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-3 water-powered rice pounder for the Rice Field: a thick wooden seesaw beam on a sturdy post, a heavy wooden pestle at its front end over a round stone mortar, and a carved wooden scoop at its back end under a short, thick bamboo water pipe, all on one flat footing of earth and stone made to sit on the empty middle of the left bank of the reference. No water.
```

### V20 · VS · `seal-dais-kit-l2` · Đài Ấn cấp 2: bậc đá thứ tư

- **Lắp vào:** vòng bậc ôm sát bậc dưới cùng; chừa khe ở góc trước phải cho bục.
- **Ảnh:** `art-src/td/kits/seal-dais-kit-l2.png` · 1024×1024 · **Tham chiếu:** `seal-dais.png` → **Model:** `art-src/3d/td/kits/seal-dais-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

Tự quyết: 22.4 chỉ ghi "vòng chữ lơ lửng" (VFX) cho cấp sau của Đài Ấn; bộ cấp 2 là bậc đá thứ tư, bộ cấp 3 là chuông gió lớn.

```text
The level-2 outer step for the Seal Dais: one wide, low, ring-shaped step of carved limestone made to wrap closely around the bottom step of the reference, with swirling brush-stroke ornament carved along its edge that is clearly not letters, and a gap at the front right for the small wooden platform.
```

### V21 · VS · `seal-dais-kit-l3` · Đài Ấn cấp 3: chuông gió lớn

- **Lắp vào:** kẹp lên đầu cột sau, thay chùm chuông nhỏ. `FX_banner` dời lên đầu tay đồng.
- **Ảnh:** `art-src/td/kits/seal-dais-kit-l3.png` · 1024×1024 · **Tham chiếu:** `seal-dais.png` → **Model:** `art-src/3d/td/kits/seal-dais-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-3 great wind chime for the Seal Dais: a tall curved bronze arm made to clamp onto the top of the tall back post of the reference, holding a big cluster of six short, thick bronze chime tubes fused together into one solid piece hanging close under the arm.
```

### V22 · VS · `scribe-kit-l2` · Tháp Thư Pháp cấp 2: cuộn giấy treo

- **Lắp vào:** khung đặt ngay dưới mái tầng trên; cuộn giấy rủ sát vách.
- **Ảnh:** `art-src/td/kits/scribe-kit-l2.png` · 1024×1024 · **Tham chiếu:** `scribe.png` → **Model:** `art-src/3d/td/kits/scribe-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-2 hanging scrolls for the Scribe Tower: a thick square timber rail frame made to sit just under the eaves of the upper floor of the reference, with four long cream paper scrolls with vermilion-red rollers hanging still and flat against the walls below it, one on each side, each showing only a few swirling brush strokes that are clearly not letters.
```

### V23 · VS · `scribe-kit-l3` · Tháp Thư Pháp cấp 3: cọ lơ lửng xoay

- **Lắp vào:** không chạm nhà. Blender cho cọ lơ lửng trước góc trái tầng trên, cao ngang mái, xoay chậm (22.4). `FX_muzzle` chuyển sang đầu cọ này.
- **Ảnh:** `art-src/td/kits/scribe-kit-l3.png` · 1024×1536 · **Tham chiếu:** `scribe.png` → **Model:** `art-src/3d/td/kits/scribe-kit-l3.glb` · face 4000 · BG-G
- **Prompt =** A-PROP + B-VILLAGE + prompt dưới + BG-G.

Tự quyết: cọ không bay trên nóc, vì nóc là gốc cột chữ (`FX_top`) và là chỗ Draconis đậu ở Tháp Thư Pháp (22.2).

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
The level-3 great brush for the Scribe Tower, matching the style of the reference: a giant calligraphy brush standing upright with its tip down, a thick vermilion-red lacquered bamboo handle banded with bronze, a bronze collar, and a big solid teardrop-shaped tip of black bristles grouped into one smooth mass. Grand and magical, with no glow.
```

### V24 · VS · `infirmary-kit-l2` · Nhà Thuốc cấp 2: kệ lọ thuốc

- **Lắp vào:** áp vào vách phải của nhà.
- **Ảnh:** `art-src/td/kits/infirmary-kit-l2.png` · 1024×1024 · **Tham chiếu:** `infirmary.png` → **Model:** `art-src/3d/td/kits/infirmary-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

Tự quyết: 22.4 không tả cấp 2, 3 của Nhà Thuốc; cấp 2 là kệ lọ thuốc, cấp 3 là bồn thảo dược.

```text
The level-2 jar shelf for the Infirmary: a small lean-to porch of wheat-gold thatch on two thick posts over a sturdy two-level wooden shelf of round clay medicine jars with cloth-tied lids, all fused into one solid piece, made to stand against the plain right side of the cottage in the reference.
```

### V25 · VS · `infirmary-kit-l3` · Nhà Thuốc cấp 3: bồn thảo dược

- **Lắp vào:** đế đặt ở góc sau phải của nhà.
- **Ảnh:** `art-src/td/kits/infirmary-kit-l3.png` · 1024×1024 · **Tham chiếu:** `infirmary.png` → **Model:** `art-src/3d/td/kits/infirmary-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-M · **Ảnh phụ:** không.

```text
The level-3 herb planter for the Infirmary: a raised wooden planter box full of chunky clumps of medicinal herbs grouped into solid shapes, with a heavy stone mortar and pestle at one end, on a flat footing made to sit at the back right of the cottage in the reference.
```

### V26 · VS · `lumber-kit-l2` · Trại Gỗ cấp 2: giá trượt gỗ

- **Lắp vào:** đế đặt ở bên phải sàn (chỗ trống).
- **Ảnh:** `art-src/td/kits/lumber-kit-l2.png` · 1024×1024 · **Tham chiếu:** `lumber.png` → **Model:** `art-src/3d/td/kits/lumber-kit-l2.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

Tự quyết: 22.4 ghi cấp 2 của Trại Gỗ là "…"; chọn giá trượt gỗ.

```text
The level-2 log skid for the Lumber Camp: a sloped skid ramp of thick timber rails with two big logs resting on it, on a flat footing made to sit on the clear right side of the floor of the reference.
```

### V27 · VS · `lumber-kit-l3` · Trại Gỗ cấp 3: guồng nước kéo cưa

- **Lắp vào:** đế đặt phía sau lán. Nước là shader.
- **Ảnh:** `art-src/td/kits/lumber-kit-l3.png` · 1024×1024 · **Tham chiếu:** `lumber.png` → **Model:** `art-src/3d/td/kits/lumber-kit-l3.glb` · face 4000
- **Prompt =** A-BUILD + B-VILLAGE + K-KIT + prompt dưới + BG-G · **Ảnh phụ:** không.

```text
The level-3 water-powered saw for the Lumber Camp: a big wooden water wheel with thick paddles, fed by a short open wooden flume, linked by a thick wooden crank arm to an upright frame saw with a broad, thick blade, all on one flat timber footing made to sit at the back of the floor of the reference, behind the shed. No water.
```

## 5. Nhánh (V28–V45)

- Nhánh mở bằng bản vẽ, cần Lũy cấp 3 (12.3). Mỗi nhà hai nhánh, chọn một lần. Nhánh là model trọn, đổi trong khói 0,4 s (23.8).
- Cùng vòng chiếm chỗ với nhà gốc. Bục trợ lực vẫn ở góc trước phải. Socket như nhà gốc, trừ chỗ ghi khác.
- Mọi nhánh: **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt + nền ghi ở món. **Tham chiếu:** ảnh cấp 1 của nhà gốc. Face 10000. Ảnh 2D ở `art-src/td/branches/<id>.png`, model ở `art-src/3d/td/branches/<id>.glb`.

### V28 · VS · `archer-en-bao` · Tháp Cung, nhánh A: Én Bão

- **Là gì:** 2 cung thủ, bắn 2 mục tiêu, tầm 12,5 m; Phát Chữ tách 3 mũi (12.3). Hình 22.4: mái cong cánh én.
- **Ảnh:** `art-src/td/branches/archer-en-bao.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/archer-en-bao.glb` · **Tham chiếu:** `archer.png`. **Socket:** hai sàn canh dưới hai cánh mái; Blender đặt `FX_crew`, `FX_muzzle` cho cả hai.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Swallow Storm, the archer tower's fast branch: a bamboo-and-timber tower on a slim stone foot, a little wider at the top than the reference, with a terracotta roof whose two sides sweep up and out like the spread wings of a swallow, and two open lookout platforms, one under each wing, for two archers. The two wing tips end in thick carved wooden swallow-tail points. Light, quick and airy.
```

### V29 · VS · `archer-than-tien` · Tháp Cung, nhánh B: Thần Tiễn

- **Là gì:** bắn tỉa 40–60 VL, tầm 15 m, thấy tàng hình (12.3). Hình 22.4: tháp cao mảnh, nỏ lớn.
- **Ảnh:** `art-src/td/branches/archer-than-tien.png` · 1024×1536 → **Model:** `art-src/3d/td/branches/archer-than-tien.glb` · **Tham chiếu:** `archer.png`. **Socket:** `FX_muzzle` ở đầu nỏ.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Eagle Eye, the archer tower's sniper branch: a very tall, very slim tower of stacked limestone blocks and dark timber, clearly taller than the reference, topped by a small square sniper's nest with a waist-high railing and a terracotta hip roof ending in a flat-topped cap; a big mounted crossbow with thick wooden bow arms and no string rests on the railing, pointing forward. A carved swirl shaped like an eagle's head sits under the nest. Patient, precise and deadly.
```

### V30 · VS · `cannon-coi-lon` · Tháp Pháo, nhánh A: Cối Lớn

- **Là gì:** 55–85 VL, nổ 3,5 m, tầm 11 m (12.3). Hình 22.4: chĩa trời.
- **Ảnh:** `art-src/td/branches/cannon-coi-lon.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/cannon-coi-lon.glb` · **Tham chiếu:** `cannon.png`. **Socket:** nòng cối liền model, chĩa thẳng lên, không quay; `FX_muzzle` ở miệng cối.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Great Mortar, the cannon tower's heavy branch: an even lower and wider round emplacement of limestone blocks over rammed earth, with a fat, short bronze mortar in its centre pointing straight up at the sky, its wide mouth ringed by a thick lip and bound by heavy iron bands, and a rack of big dark-iron shells on the left of the gun floor. Massive, squat and thunderous.
```

### V31 · VS · `cannon-vac-lua` · Tháp Pháo, nhánh B: Vạc Lửa

- **Là gì:** để vũng cháy 3 m (12.3). Hình 22.4: vạc trên giá ba chân. Lửa là VFX.
- **Ảnh:** `art-src/td/branches/cannon-vac-lua.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/cannon-vac-lua.glb` · **Tham chiếu:** `cannon.png`. **Socket:** `FX_muzzle` ở mép rót của vạc.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Fire Cauldron, the cannon tower's fire branch: a round stone emplacement carrying a big bronze cauldron on a heavy timber tripod, tilted forward on a thick pivot, with a broad bronze pouring lip at the front, above a stone fire pit filled with dark coals painted with ember-orange spots and no flames. Hot and menacing.
```

### V32 · VS · `scribe-but-loi` · Tháp Thư Pháp, nhánh A: Bút Lôi

- **Là gì:** sét nối 4 mục tiêu (12.3). Hình 22.4: vân sét.
- **Ảnh:** `art-src/td/branches/scribe-but-loi.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/scribe-but-loi.glb` · **Tham chiếu:** `scribe.png`. **Socket:** `FX_muzzle` ở đầu cọ đồng.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Thunder Brush, the scribe tower's lightning branch: the scholar's two-storey tower restyled for storms, with storm-blue glazed roof tiles, pale-gold zigzag lightning patterns inlaid along the vermilion beams, and on the upper balcony a giant upright brush with a copper-banded handle and a pointed copper tip like a lightning rod. Charged and dramatic.
```

### V33 · VS · `scribe-muc-bang` · Tháp Thư Pháp, nhánh B: Mực Băng

- **Là gì:** làm chậm 35 %, đóng băng quái mạnh nhất (12.3). Hình 22.4: nghiên băng.
- **Ảnh:** `art-src/td/branches/scribe-muc-bang.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/scribe-muc-bang.glb` · **Tham chiếu:** `scribe.png`. **Socket:** `FX_muzzle` ở đầu cọ.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Frost Ink, the scribe tower's frost branch: the scholar's two-storey tower restyled for winter, with pale sky-blue glazed roof tiles (sky blue, never teal or turquoise), chunky solid icicle shapes along the upper roof's eaves only, and on the upper balcony a big inkstone of pale sky-blue ice crystal with a giant brush whose tip is frosted white. Cool, calm and crisp.
```

### V34 · VS · `barracks-khien-dong` · Trại Lính, nhánh A: Khiên Đồng

- **Là gì:** 3 Lính Khiên, mỗi lính chặn 2 chỗ (12.3, 13).
- **Ảnh:** `art-src/td/branches/barracks-khien-dong.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/barracks-khien-dong.glb` · **Tham chiếu:** `barracks.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Bronze Shield, the barracks' shield branch: the camp rebuilt stronger, on a low limestone wall base, its palisade faced with overlapping bronze-rimmed timber shields, a heavy gate with a big round bronze shield on each door, the war drum kept beside the gate, and a broad terracotta roof on the hall. Steady and unbreakable.
```

### V35 · VS · `barracks-giao-dai` · Trại Lính, nhánh B: Giáo Dài

- **Là gì:** lính 150 máu, đâm xuyên 2 (12.3).
- **Ảnh:** `art-src/td/branches/barracks-giao-dai.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/barracks-giao-dai.glb` · **Tham chiếu:** `barracks.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Long Spear, the barracks' spear branch: the camp with a taller palisade of extra-long sharpened stakes, a tall timber rack beside the gate holding thick spears bundled tightly into one solid sheaf, the war drum on the other side of the gate, and a raised plank drill platform at the back. Fierce and forward-leaning.
```

### V36 · VS · `gold-mine-ham-sau` · Mỏ Vàng, nhánh A: Hầm Sâu

- **Là gì:** tự sản ×1,5, đống ×1,5, máu −20 % (12.3).
- **Ảnh:** `art-src/td/branches/gold-mine-ham-sau.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/gold-mine-ham-sau.glb` · **Tham chiếu:** `gold-mine.png`. **Socket:** `FX_top` ở xà bằng trên đỉnh tháp giếng; `FX_pile` như cấp 1.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Deep Shaft, the gold mine's deep branch: the rock outcrop now crowned by a tall timber headframe tower with a big solid wooden wheel near its flat plank top, a square shaft opening with a heavy timber collar in front of the tunnel, and more, bigger warm-gold ore veins painted flat on the rock. Deep, rich and a little daring.
```

### V37 · VS · `gold-mine-lo-duc-tien` · Mỏ Vàng, nhánh B: Lò Đúc Tiền

- **Là gì:** đổi Lúa, Gỗ dư ra Vàng; tối đa 1 (12.3).
- **Ảnh:** `art-src/td/branches/gold-mine-lo-duc-tien.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/gold-mine-lo-duc-tien.glb` · **Tham chiếu:** `gold-mine.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Coin Mint, the gold mine's trading branch: a squat brick-and-stone furnace with a short thick chimney and no smoke, built against the rock, a heavy wooden coin press with a big screw handle, neat stacks of thick gold coins on a bench, and sacks of rice and bundles of logs waiting to be traded. Clever, bustling and prosperous.
```

### V38 · VS · `farm-bac-thang` · Ruộng Lúa, nhánh A: Bậc Thang

- **Là gì:** Lúa ×1,6 (12.3).
- **Ảnh:** `art-src/td/branches/farm-bac-thang.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/farm-bac-thang.glb` · **Tham chiếu:** `farm.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-M · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Terraces, the rice field's harvest branch: the paddy rebuilt as three curved rice terraces stepping down toward the front, each with flat silver-blue water and neat rows of chunky rice-green clumps, held by curved earth walls, with small bamboo water spouts between the terraces and the field hut on the top terrace. Generous, flowing and beautiful.
```

### V39 · VS · `farm-chuong-trau` · Ruộng Lúa, nhánh B: Chuồng Trâu

- **Là gì:** trâu húc 10 m đường mỗi 20 s (12.3). Trâu là nhân vật ở file 01; ảnh không vẽ trâu.
- **Ảnh:** `art-src/td/branches/farm-chuong-trau.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/farm-chuong-trau.glb` · **Tham chiếu:** `farm.png`. **Socket:** mái chuồng thay mái chòi cho `FX_top`, `FX_lantern_0..4`; trâu ra từ cửa chuồng.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-M · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Buffalo Pen, the rice field's buffalo branch: a smaller paddy at the front, and at the back a sturdy pen of thick logs with a tall thatched byre roof, its top about as high as the field hut of the reference, that ends in a short, thick, flat-topped ridge cap; along the byre's front, under the thatch edge, a straight, thick eave beam with nothing hanging from it; a wide byre door at the front, a big wooden feeding trough and a heap of hay inside; no buffalo. Earthy and strong.
```

### V40 · VS · `lumber-xuong-cua` · Trại Gỗ, nhánh A: Xưởng Cưa

- **Là gì:** Gỗ ×1,5 (12.3).
- **Ảnh:** `art-src/td/branches/lumber-xuong-cua.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/lumber-xuong-cua.glb` · **Tham chiếu:** `lumber.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Sawmill, the lumber camp's production branch: a bigger timber sawmill shed with a broad thatched gable roof, a long saw bench with a big upright frame saw with a broad, thick blade, neat stacks of fresh planks and a pile of round logs at the side. Productive and orderly.
```

### V41 · VS · `lumber-xuong-rao` · Trại Gỗ, nhánh B: Xưởng Rào

- **Là gì:** dựng rào trên đường mỗi 25 s (12.3). Rào dùng model `rao-tre` (V63).
- **Ảnh:** `art-src/td/branches/lumber-xuong-rao.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/lumber-xuong-rao.glb` · **Tham chiếu:** `lumber.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Fence Workshop, the lumber camp's barricade branch: an open workshop shed with a thatched roof, stacks of sharpened bamboo and timber stakes, finished barricade panels leaning in a neat row against the wall, and a big wooden mallet on a chopping block. Crafty and defensive.
```

### V42 · VS · `seal-dais-phong-an` · Đài Ấn, nhánh A: Phong Ấn

- **Là gì:** cửa sổ ấn boss +2 s, Dễ Tổn Thương +10 % (12.3). Không phải bàn thờ.
- **Ảnh:** `art-src/td/branches/seal-dais-phong-an.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/seal-dais-phong-an.glb` · **Tham chiếu:** `seal-dais.png`. **Socket:** `FX_core` ở khối ấn đồng.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Sealing, the seal dais's binding branch: the round stone stage with five taller posts joined to each other by low, thick, solid stone bars carved with a chain-link pattern, leaving the front open, and a big square bronze seal block with a short thick handle standing on the central disc. Heavy and binding, solemn but not religious.
```

### V43 · VS · `seal-dais-vang-am` · Đài Ấn, nhánh B: Vang Âm

- **Là gì:** nửa số cụm là nghe rồi gõ (12.3).
- **Ảnh:** `art-src/td/branches/seal-dais-vang-am.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/seal-dais-vang-am.glb` · **Tham chiếu:** `seal-dais.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-G · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

Tự quyết: dùng đàn tre (kiểu đàn T'rưng) và chuông gió tre thay chuông đồng lớn, để không giống chuông chùa.

```text
Echo, the seal dais's listening branch: the round stone stage with a big village bamboo xylophone of thick hollow bamboo tubes on a curved timber frame at the back, and two big bamboo wind chimes, each fused into one solid piece, hanging close under short arms on the front posts. Musical and airy.
```

### V44 · VS · `infirmary-vuon-thao-duoc` · Nhà Thuốc, nhánh A: Vườn Thảo Dược

- **Là gì:** gỡ cháy, chậm, choáng (12.3).
- **Ảnh:** `art-src/td/branches/infirmary-vuon-thao-duoc.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/infirmary-vuon-thao-duoc.glb` · **Tham chiếu:** `infirmary.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-M · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
Herb Garden, the infirmary's cleansing branch: the cottage surrounded by raised wooden beds of lush medicinal herbs grouped into big solid clumps, a small bamboo trellis with chunky gourds, and flat stepping stones between the beds. Fresh and soothing.
```

### V45 · VS · `infirmary-tram-cuu-thuong` · Nhà Thuốc, nhánh B: Trạm Cứu Thương

- **Là gì:** lính chết hồi sinh tại trạm sau 3 s (12.3).
- **Ảnh:** `art-src/td/branches/infirmary-tram-cuu-thuong.png` · 1024×1024 → **Model:** `art-src/3d/td/branches/infirmary-tram-cuu-thuong.glb` · **Tham chiếu:** `infirmary.png`.
- **Prompt =** A-BUILD + B-VILLAGE + R-BRANCH + prompt dưới + BG-M · **Tripo:** face 10000, không rig · **Ảnh phụ:** không.

```text
First-Aid Station, the infirmary's rescue branch: the cottage joined to a wide open-sided aid shelter of thatch on thick posts, two sturdy bamboo stretchers leaning against it, a field kitchen with a big clay stove and two pots without fire or steam, and stacked rolls of cream bandage cloth. No cross symbol or medical emblem anywhere. Busy, kind and ready.
```

## 6. Đống đổ nát (V46–V49)

- Nhà hết máu thành Đổ Nát: vẫn chiếm chỗ, chờ sửa (11.11). Mesh đổ nát chung theo cỡ (22.4).
- **Prompt =** A-BUILD + B-VILLAGE + prompt chung + dòng cỡ + nền. Face 8000. Ảnh 2D `art-src/td/ruins/<id>.png`, model `art-src/3d/td/ruins/<id>.glb`.

Tự quyết: đổ nát XL làm theo dáng Ruộng, vì Ruộng là nhà XL duy nhất có máu (Lũy không có máu).

Prompt chung:

```text
A collapsed village building after a battle: a low, rounded heap of broken dark timber beams, fallen terracotta tiles, cracked limestone blocks and flattened clumps of straw thatch, with one broken post still standing, shaped to fill a round footprint and much wider than tall. Sad but tidy; no fire, smoke or dust.
```

| Số | id | Dùng cho | Ảnh 2D → Model | Cỡ ảnh | Nền | Dòng cỡ |
|---|---|---|---|---|---|---|
| V46 · VS | `ruin-s` | Tháp Cung, Đài Ấn (Ø 4 m) | `art-src/td/ruins/ruin-s.png` → `art-src/3d/td/ruins/ruin-s.glb` | 1024×1024 | BG-G | `Small: for a slim tower or a small stone stage; the heap is about one third as tall as it is wide.` |
| V47 · VS | `ruin-m` | Pháo, Thư Pháp, Trại Lính, Nhà Thuốc (Ø 4,6 m) | `art-src/td/ruins/ruin-m.png` → `art-src/3d/td/ruins/ruin-m.glb` | 1024×1024 | BG-G | `Medium: for a cannon tower, a two-storey tower, a camp or a cottage; a little wider and fuller.` |
| V48 · VS | `ruin-l` | Mỏ Vàng, Trại Gỗ (Ø 5,4 m) | `art-src/td/ruins/ruin-l.png` → `art-src/3d/td/ruins/ruin-l.glb` | 1024×1024 | BG-G | `Large: for a mine or a lumber camp; add a few grey granite boulders and short pieces of broken mine rail.` |
| V49 · VS | `ruin-xl` | Ruộng Lúa (Ø 7 m) | `art-src/td/ruins/ruin-xl.png` → `art-src/3d/td/ruins/ruin-xl.glb` | 1536×1024 | BG-G | `Extra large: for a rice field; a wide, flat ring of broken earth banks around a dry, cracked paddy, trampled straw, and a collapsed small field hut at the back right.` |

Mỗi dòng là một ảnh, một model. Tripo không rig. Ảnh phụ: không.

## 7. Mốc cảnh có luật chơi (V50–V61)

- Mốc cảnh là vùng cấm xây (12.5). Phần lớn mốc cũng chặn lối đi (25.9); cầu, Đá Kê và vòm rễ thì cho đi qua theo luật của từng mốc. Mỗi bản đồ ≤ 6 mốc (23.10). Mốc nào có luật riêng thì ghi ở dòng "Luật chơi".
- **Prompt =** A-BUILD + (B-VILLAGE nếu là vật do người làm) + prompt + nền; dòng "Prompt =" của từng mốc ghi rõ. Face 8000. Tripo không rig. Ảnh phụ: không.

Tự quyết: cỡ gợi ý dưới đây do thiết kế chưa ghi; AI chỉnh khi khóa bố cục bản đồ.

### V50 · VS · `vach-thac-bac` · Vách Thác Bạc (bản đồ 1)

- **Luật chơi:** Khe Nứt ở chân thác (−10, −46), quái ra từ đây. Dòng thác là shader trên mesh riêng (22.9). **Cỡ gợi ý:** rộng 24 m, cao 16 m.
- **Ảnh:** `art-src/td/landmarks/vach-thac-bac.png` · 1536×1024 → **Model:** `art-src/3d/td/landmarks/vach-thac-bac.glb` · **Prompt =** A-BUILD + prompt + BG-M (có rêu).

```text
The Silverfall Cliff, the near rock wall at the foot of a tall waterfall: a broad block of grey granite, wider than tall, with rounded chunky ledges and a few cushions of moss grouped into solid shapes; down the middle of its front runs a smooth, dark, wet-looking vertical rock chute where the waterfall will flow, with no water drawn; the foot of the cliff spreads into a flat base. Majestic, cool and fresh.
```

### V51 · VS · `cau-go` · Cầu gỗ (bản đồ 1, đặt 2 lần)

- **Luật chơi:** Suối Bạc rộng 3 m; người đi bộ chỉ qua suối ở 2 cầu (−24, −14) và (−24, 26); Draconis bay qua. **Cỡ gợi ý:** dài 6 m, mặt cầu rộng 3 m.
- **Ảnh:** `art-src/td/landmarks/cau-go.png` · 1536×1024 → **Model:** `art-src/3d/td/landmarks/cau-go.glb` · **Prompt =** A-BUILD + B-VILLAGE + prompt + BG-G.

```text
A small wooden footbridge for a three-metre stream: a gently arched deck of thick planks, about twice as long as it is wide, chunky square timber railings on both sides, and a squat limestone footing at each end. Sturdy, rustic and welcoming.
```

### V52 · VS · `choi-canh-doi` · Chòi canh trên đồi (bản đồ 1)

- **Luật chơi:** Đồi Cầu Vồng (2, −21; bán kính 8 m, cao 2,6 m): nhà trên đồi +10 % tầm. Chòi báo cho người chơi đây là chỗ cao. Không đặt chòi trên node Mạch Chữ ở đỉnh đồi. **Cỡ gợi ý:** cao 6 m, chân Ø 4 m.
- **Ảnh:** `art-src/td/landmarks/choi-canh-doi.png` · 1024×1024 → **Model:** `art-src/3d/td/landmarks/choi-canh-doi.glb` · **Prompt =** A-BUILD + B-VILLAGE + prompt + BG-G.

```text
The hill lookout hut: a small open timber watch hut on a squat round limestone platform, with four thick posts, a waist-high railing, a steep wheat-gold thatch roof and a stair of solid timber steps up the front. A cheerful landmark that tells everyone this hill is the high ground.
```

### V53 · VS · `hai-dang` · Hải đăng (bản đồ 2)

- **Luật chơi:** mốc cấm xây, chặn lối đi. Thiết kế chưa ghi luật riêng cho hải đăng. **Cỡ gợi ý:** cao 14 m, chân Ø 6 m.
- **Ảnh:** `art-src/td/landmarks/hai-dang.png` · 1024×1536 → **Model:** `art-src/3d/td/landmarks/hai-dang.glb` · **Prompt =** A-BUILD + B-VILLAGE + prompt + BG-G.

```text
The Whitestone lighthouse: a tall, slightly tapered round tower of limestone-white blocks with two broad vermilion-red bands, a small balcony with a thick railing near the top, and a round lamp room with thick window frames under a domed red-brown roof, standing on a chunky base of white limestone rocks. The lamp is unlit. Bright, friendly, a seaside landmark.
```

### V54 · VS · `cau-tau` · Cầu tàu (bản đồ 2)

- **Luật chơi:** ở Vũng Thuyền phía tây. Thủy Triều đổi mỗi 2 đợt: triều xuống thì Ao Cá ×1,5 và cổng Tây đông quái hơn; triều lên thì Ao Cá ×0,8 và cổng Đông đông hơn (22.9). **Cỡ gợi ý:** dài 12 m, rộng 3 m.
- **Ảnh:** `art-src/td/landmarks/cau-tau.png` · 1536×1024 → **Model:** `art-src/3d/td/landmarks/cau-tau.glb` · **Prompt =** A-BUILD + B-VILLAGE + prompt + BG-G.

Tự quyết: cọc cầu có 3 vạch màu để người chơi đọc mực triều.

```text
A village fishing pier: a long, straight deck of thick weathered planks on rows of thick round wooden piles, about four times as long as it is wide, with a chunky mooring post at the far end; each pile is painted with three bands from light to dark to show the tide level. Sturdy, salty and busy.
```

### V55 · VS · `nha-rai-da` · Nhà Rái Đá trên cọc (bản đồ 2)

- **Luật chơi:** nhà làng Rái Đá (22.1); mốc cấm xây, chặn lối đi. Ảnh không vẽ rái cá. **Cỡ gợi ý:** cao 7 m, chân Ø 6 m.
- **Ảnh:** `art-src/td/landmarks/nha-rai-da.png` · 1024×1024 → **Model:** `art-src/3d/td/landmarks/nha-rai-da.glb` · **Prompt =** A-BUILD + B-VILLAGE + prompt + BG-G.

```text
A sea-otter family's stilt house: a round hut of woven bamboo mats and dark timber on thick wooden stilts over a flat base of rocks, a wide thatched roof shaped a little like an upturned boat, a small front deck reached by a stair of solid timber steps, coils of thick rope and a rolled fishing net bundled into one solid mass on the deck, and a round woven basket boat leaning against the stilts. No otters. Cosy, playful and seaside.
```

### V56 · VS · `them-da-trang` · Thềm Đá Trắng (bản đồ 2)

- **Luật chơi:** ở (0, −14); hai đường quái vòng quanh thềm rồi nhập ở (0, 16). Cấm xây trên thềm. **Cỡ gợi ý:** Ø 16 m, cao 3 m.
- **Ảnh:** `art-src/td/landmarks/them-da-trang.png` · 1536×1024 → **Model:** `art-src/3d/td/landmarks/them-da-trang.glb` · **Prompt =** A-BUILD + prompt + BG-G.

```text
The White Stone Terrace: a broad, low, flat-topped outcrop of white limestone with smooth eroded edges stepping down in two wide natural terraces, a few cracks and shallow clear pale-blue rock pools painted flat, with no seaweed, much wider than tall. Bright, calm and sun-washed.
```

### V57 · VS · `goc-da-rong` · Gốc đa rỗng (bản đồ 3)

- **Luật chơi:** ở (0, −32); mốc cấm xây, chặn lối đi. **Cỡ gợi ý:** Ø 12 m, cao 8 m.
- **Ảnh:** `art-src/td/landmarks/goc-da-rong.png` · 1024×1024 → **Model:** `art-src/3d/td/landmarks/goc-da-rong.glb` · **Prompt =** A-BUILD + prompt + BG-M.

```text
A giant hollow banyan stump: a huge, wide, broken-off trunk made of many thick fused roots, hollow inside with a big dark opening at the front, thick roots spreading out over a flat base, and a few big cushions of moss and two clumps of ferns grouped into solid shapes. Ancient and mysterious, but friendly.
```

### V58 · VS · `cau-do` · Cầu Đỏ (bản đồ 3)

- **Luật chơi:** ở (0, 18), qua Sông Rễ; ai cũng đi được (22.9). **Cỡ gợi ý:** dài 10 m, rộng 3 m.
- **Ảnh:** `art-src/td/landmarks/cau-do.png` · 1536×1024 → **Model:** `art-src/3d/td/landmarks/cau-do.glb` · **Prompt =** A-BUILD + B-VILLAGE + prompt + BG-G.

```text
The Red Bridge: a small, high, round-arched footbridge of vermilion-red lacquered timber over a forest river, with chunky red railings with dark caps, broad steps up each side of the arch and squat grey stone footings; no roof. Striking, cheerful, the way across.
```

### V59 · VS · `da-ke` · Đá Kê (bản đồ 3)

- **Luật chơi:** ở (0, −20); chỉ Lam nhảy qua. Người khác đi Cầu Đỏ hoặc Cầu Tre. **Cỡ gợi ý:** dài 10 m, 5 đá, mỗi đá Ø 1,5 m.
- **Ảnh:** `art-src/td/landmarks/da-ke.png` · 1536×1024 → **Model:** `art-src/3d/td/landmarks/da-ke.glb` · **Prompt =** A-BUILD + prompt + BG-G.

Tự quyết: các đá nối nhau bằng một tấm đá ngầm (nằm dưới mặt nước trong game), để model liền một khối.

```text
A river crossing of five big flat-topped stepping stones in a gentle curve, with wide gaps between them, all rising from one shared, flat, low rock shelf that joins them at the bottom (in the game the shelf is under water); grey weathered stone with paler tops. Simple, inviting a daring jump.
```

### V60 · VS · `re-vom` · Rễ khổng lồ uốn qua đường (bản đồ 3)

- **Luật chơi:** quái đi dưới vòm; chân rễ là vùng cấm xây. **Cỡ gợi ý:** nhịp vòm 10 m, cao 11 m.
- **Ảnh:** `art-src/td/landmarks/re-vom.png` · 1024×1024 → **Model:** `art-src/3d/td/landmarks/re-vom.glb` · **Prompt =** A-BUILD + prompt + BG-M.

Tự quyết: khoảng trống dưới vòm cao ít nhất 8 m, để Mộc Tinh (7 m) đi qua.

```text
A giant banyan root arching high over a forest road: one enormous, thick, twisting root rising from the ground on the left, curving up and over, and plunging back into the ground on the right, leaving a tall open archway beneath it about as high as it is wide; a few smaller roots fused along it and cushions of moss grouped into solid shapes. Both feet stand on flat bases. Ancient and awe-inspiring.
```

### V61 · VS · `thac-ho-sut` · Thác đổ vào Hố Sụt (bản đồ 3)

- **Luật chơi:** Sông Rễ đổ xuống Hố Sụt (0, 0). Chỉ qua sông ở Cầu Đỏ (mọi người), Đá Kê (chỉ Lam), Cầu Tre (Tre bắc, ai đi bộ cũng qua). Dòng thác là shader. **Cỡ gợi ý:** rộng 12 m, cao 6 m.
- **Ảnh:** `art-src/td/landmarks/thac-ho-sut.png` · 1536×1024 → **Model:** `art-src/3d/td/landmarks/thac-ho-sut.glb` · **Prompt =** A-BUILD + prompt + BG-M.

```text
The lip of a forest sinkhole where a river pours in: a curved wall of mossy grey rock with a smooth, dark, wet-looking notch in the middle of its top edge where the waterfall will flow over, with no water drawn, thick roots gripping the rock, cushions of moss grouped into solid shapes, and a flat base. Wild, deep and dramatic.
```

## 8. Đồ dùng (V62–V65)

Mọi đồ dùng: Tripo không rig, không clip Tripo, ảnh phụ không.

### V62 · VS · `scaffold-bamboo` · Giàn tre

- **Là gì:** giàn tre khi xây (nhà mọc 1,2 s), khi nâng cấp (1 s), và khi Tre tung Tối Thượng (22.2, 22.4, 23.8).
- **Ảnh:** `art-src/td/props/scaffold-bamboo.png` · 1024×1024 → **Model:** `art-src/3d/td/props/scaffold-bamboo.glb` · face 4000 · **Prompt =** A-BUILD + B-VILLAGE + prompt + BG-G.

Tự quyết: một model giàn tre; Blender co giãn theo 4 cỡ vòng S, M, L, XL.

```text
A square ring of chunky golden-tan bamboo scaffolding around an empty centre, two levels high: thick bamboo poles lashed with thick rope bands, broad walkboards of woven bamboo mats on each level, and woven bamboo-mat screens filling most of the outer sides, all one connected frame. Busy and cheerful, a building site.
```

### V63 · VS · `rao-tre` · Rào Tre

- **Là gì:** Rào Tre của Tre (150 máu, chặn 3 quái đất, 8 s) và rào của nhánh Xưởng Rào (12.3, 22.2). **Cỡ gợi ý:** dài 4 m (đường rộng 3,8 m), cao 1,5 m.
- **Ảnh:** `art-src/td/props/rao-tre.png` · 1536×1024 → **Model:** `art-src/3d/td/props/rao-tre.glb` · face 4000 · **Prompt =** A-PROP + B-VILLAGE + prompt + BG-G.

Tự quyết: Rào Tre và rào của Xưởng Rào dùng chung model này.

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A bamboo road barricade: a row of thick, sharpened golden-tan bamboo stakes lashed into a chunky X-braced frame with thick rope bands, about three times as long as it is tall, standing on two flat, sled-like base beams. Sturdy and prickly.
```

### V64 · VS · `cau-tre` · Cầu Tre

- **Là gì:** Tre bắc mỗi đợt ở điểm đánh dấu (bản đồ 3: (0, −8)); ai đi bộ cũng dùng (22.2, 22.9). **Cỡ gợi ý:** dài 8 m, rộng 2 m.
- **Ảnh:** `art-src/td/props/cau-tre.png` · 1536×1024 → **Model:** `art-src/3d/td/props/cau-tre.glb` · face 4000 · **Prompt =** A-PROP + B-VILLAGE + prompt + BG-G.

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic, the bridge running from left to right.
A quick handmade bamboo footbridge: a flat deck of thick bamboo poles lashed side by side into one solid raft, about four times as long as it is wide, a chunky bamboo handrail on thick posts along one side, and a fat bundle of bamboo at each end as a footing. Clever and light.
```

### V65 · VS · `go-lan` · Gỗ Lăn

- **Là gì:** Bùng Nổ của Trại Gỗ: khúc gỗ lăn 12 m trên đường, 8 VL, đẩy lùi 1,5 m (11.6). **Cỡ gợi ý:** dài 3,6 m, Ø 1 m.
- **Ảnh:** `art-src/td/props/go-lan.png` · 1536×1024 → **Model:** `art-src/3d/td/props/go-lan.glb` · face 2000 · **Prompt =** A-PROP + B-VILLAGE + prompt + BG-G.

```text
Camera: front three-quarter view looking down from about 35 degrees above, the log lying from left to right, near-orthographic.
A big round rolling log for knocking enemies back: a thick, straight tree trunk with rough dark-brown bark, two thick iron bands near its ends, and flat cut ends showing pale wood rings. Heavy and simple.
```

## 9. Đạn (V66–V70)

Id theo bảng đạn 23.8. Ảnh 2D `art-src/td/projectiles/<id>.png`, model `art-src/3d/td/projectiles/<id>.glb`, face 2000.

Tự quyết: `quill` và `seed-drop` là đạn của boss; file 01 chỉ làm thân boss, nên hai đạn này nằm ở đây. Mọi đạn: Tripo không rig, ảnh phụ không.

### V66 · VS · `pebble` · Viên ná của Tre

- **Là gì:** ná của Tre bắn "viên đất nâu" (23.8). **Cỡ gợi ý:** Ø 0,3 m.
- **Ảnh:** `art-src/td/projectiles/pebble.png` · 1024×1024 → **Model:** `art-src/3d/td/projectiles/pebble.glb` · **Prompt =** A-PROP + prompt + BG-G.

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A small round slingshot pellet of hard-baked brown clay with a few chunky dents. Simple.
```

### V67 · VS · `meteor` · Đá lửa của Mưa Đá Lửa

- **Là gì:** Phép Chỉ huy Mưa Đá Lửa: 3 khối đá lửa, mỗi khối 80 VL và cháy (16.1). Lửa và vệt bay là VFX. **Cỡ gợi ý:** Ø 1,2 m.
- **Ảnh:** `art-src/td/projectiles/meteor.png` · 1024×1024 → **Model:** `art-src/3d/td/projectiles/meteor.glb` · **Prompt =** A-PROP + prompt + BG-G.

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A chunky falling fire rock: a rough rounded boulder of dark basalt with deep cracks painted ember-orange and a few flat orange-red patches, painted colour only, with no flames and no glow. Heavy and dramatic.
```

### V68 · VS · `quill` · Lông Đại Bàng Tinh

- **Là gì:** pha 3, Đại Bàng Tinh rũ 3 mũi lông vào 3 nhà (22.7, 23.8). **Cỡ gợi ý:** dài 2 m.
- **Ảnh:** `art-src/td/projectiles/quill.png` · 1536×1024 → **Model:** `art-src/3d/td/projectiles/quill.glb` · **Prompt =** A-PROP + prompt + BG-G.

```text
Camera: exact side view at 90 degrees, near-orthographic, the feather lying horizontal with its sharp tip to the right.
A huge, stiff eagle flight feather used as a dart: dark brown with a coppery sheen painted flat, the vane one smooth solid shape with a few broad stripes, a thick pale quill and a hard pointed tip. Sharp and simple.
```

### V69 · VS · `seed-drop` · Hạt Mộc Tinh

- **Là gì:** pha 3, tán Mộc Tinh rải 3 hạt mỗi 6 s, 40 VL, vùng 2,5 m (22.7). **Cỡ gợi ý:** Ø 0,8 m.
- **Ảnh:** `art-src/td/projectiles/seed-drop.png` · 1024×1024 → **Model:** `art-src/3d/td/projectiles/seed-drop.glb` · **Prompt =** A-PROP + prompt + BG-G.

```text
Camera: front three-quarter view looking down from about 35 degrees above, near-orthographic.
A big round banyan fig used as a falling seed: a hard, plump amber-brown sphere with a few shallow ridges, a short thick stem on top and a small dark dimple at the bottom. Heavy and simple.
```

Tự quyết: hạt là quả đa màu hổ phách nâu, khớp quả đa trên tán Mộc Tinh (file 01). Vệt Mực Câm làm bằng shader như ở quái (22.6), không vẽ vào ảnh.

### V70 · VS · `fire-feather` · Lông lửa của Draconis

- **Là gì:** Tối Thượng Mưa Lông Lửa: 12 lông lửa rơi trong 2 s, mỗi chiếc 60 P và để vũng cháy (22.2, 23.8). Lửa, vệt bay, vũng cháy là VFX. **Cỡ gợi ý:** dài 1,5 m.
- **Ảnh:** `art-src/td/projectiles/fire-feather.png` · 1536×1024 → **Model:** `art-src/3d/td/projectiles/fire-feather.glb` · **Prompt =** A-PROP + prompt + BG-G.

Tự quyết: bậc VS, vì Tối Thượng vào chế độ truyện ở bản đồ 2 (20.4). Hộp cát 1B, 1C dùng model tạm `skills/dragon-fireball` (25.2).
Tự quyết (22/10, đổi được): màu theo dáng ảnh 3.png của Draconis (22.2; P18 ở `01-tripo-characters-enemies.md`): lông vàng kem, chóp lông tô đỏ cam. Muốn dáng đỏ của model tạm v2 thì AI viết lại câu màu.

```text
Camera: exact side view at 90 degrees, near-orthographic, the feather lying horizontal with its tip to the right.
One big, stiff flight feather: the vane is one smooth solid cream-gold shape, and its tip is a band painted warm red-orange like a ripe persimmon, painted colour only; a thick pale-gold quill and a rounded pointed tip. No flames, no glow, no loose fibres. Bold and simple.
```

## 10. Cho AI làm tiếp (riêng bậc VS)

| Việc | Cách làm |
|---|---|
| Bộ cấp | Căn theo dòng "Lắp vào". Bộ cấp rơi từ trên xuống, nảy, lóe viền (23.8). Ghi vị trí socket theo từng cấp. |
| Nhánh | Model trọn; cùng gốc, cùng hướng, cùng vị trí bục với nhà cấp 1. Gắn đủ socket như nhà gốc (mề đay, xà đèn, chóp bằng, cửa); `FX_banner` vẫn mang cờ cấp chung. Đổi model trong khói 0,4 s (23.8). |
| Skin Ruộng | Cùng socket với `farm`; bộ cấp Ruộng dùng chung. |
| Cọ cấp 3 | `scribe-kit-l3` lơ lửng trước góc trái tầng trên, cao ngang mái, xoay chậm, không chạm nhà. Không đặt trên nóc. |
| Đổ nát | Một mesh mỗi cỡ, dùng chung mọi nhà cùng cỡ (22.4). Hư dưới 50 % (nứt, khói) làm bằng shader và VFX. |
| Mốc cảnh | Mặt nước, dòng thác: shader. Tấm đá ngầm của `da-ke` nằm dưới mặt nước. Vùng cấm và ô chặn lấy từ dữ liệu bản đồ, không lấy từ mesh. |
| Giàn tre | Co giãn theo vòng S, M, L, XL. Hiện từng thanh khi Tre tung Tối Thượng. |
| `rao-tre` | Một model cho Rào Tre và Xưởng Rào. |
| Còn lại | Như mục 8 file chính. |
