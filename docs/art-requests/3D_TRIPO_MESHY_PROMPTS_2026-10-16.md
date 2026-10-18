# Prompt 3D cho Tripo3D và Meshy: tàu, quái, boss, kỹ năng, trang bị, vật phẩm (16/10/2026)

> **Dành cho:** chủ dự án (tạo mô hình trên Tripo3D / Meshy) và AI làm tiếp (chỉnh trong Blender, đưa vào game).
> **Cách chia việc** (chủ dự án chốt ngày 16/10/2026):
> 1. Chủ dự án dán prompt dưới đây vào Tripo3D hoặc Meshy, tải về **GLB**.
> 2. AI chỉnh trong Blender bằng script `scripts/models/blender/space_typing_model_tools.py` (chạy tự động): dọn hình, giảm tam giác, đặt điểm gắn hiệu ứng, tạo vùng phát sáng, làm hoạt ảnh, xuất file game, nối vào code.
> **Tài liệu này được tạo tự động** bởi `node scripts/models/build-3d-prompt-pack.mjs` từ các bảng mô tả của tranh 2D, nên mô hình 3D giữ đúng thiết kế đang có. Muốn sửa mô tả: sửa bảng gốc rồi chạy lại lệnh.
> **Thay cho phần "ảnh khái niệm ChatGPT" và "tự chỉnh Blender"** trong `docs/art-requests/3D_MODELS_PROMPT_PACK_2026-10-16.md`. Quy chuẩn mô hình (hướng, điểm gắn, tên hoạt ảnh) vẫn theo tài liệu đó, mục 2.

## 1. Làm theo thứ tự

**Đợt 1, làm thử 6 món** (để duyệt phong cách trước khi làm hàng loạt):

| Món | Mục | Vì sao |
|---|---|---|
| `ships/vanguard` | 4.1 | Tàu khởi đầu, thấy nhiều nhất |
| `enemies/scout` | 4.2 | Quái đông nhất |
| `bosses/tyrant-g02` | 4.3 | Thử quy trình boss có khung xương (G01 đã có) |
| `skills/micro-missile` | 4.4 | Đã nối sẵn trong code |
| `items/pulse-laser-mk1` | 4.5 | Trang bị đầu tiên |
| `items/repair-kit` | 4.6 | Vật phẩm shop |

Gửi 6 file cho AI. AI chỉnh, đưa vào game, chụp so sánh với bản 2D. Duyệt xong mới làm phần còn lại.

**Boss G01 (Auriel) đã xong phần Blender:** thêm 3 hoạt ảnh bằng xương (`Boss_Hit`, `Boss_Death`, `Boss_Intro`) và bản đồ phát sáng cho cánh pha lê. Không cần tạo lại.

## 2. Thiết lập trên Tripo3D và Meshy

Tên nút có thể đổi theo phiên bản. Giá trị dưới đây lấy từ hướng dẫn của bên thứ ba (Scenario, ComfyUI) cho Tripo P2 / 3.1 và Meshy 7, tra cứu ngày 16/10/2026, nên cần đối chiếu với giao diện thật. Prompt tối đa 600 ký tự (giới hạn của Meshy).

| Mục | Tripo3D | Meshy |
|---|---|---|
| Chế độ | **Image to 3D** với ảnh ở mục 4; không có ảnh thì **Text to 3D** với prompt | **Image to 3D** (hoặc Multi-image nếu có thêm góc); không có ảnh thì **Text to 3D** |
| Prompt | Ô mô tả của Text to 3D | Ô prompt (Text to 3D) hoặc ô **Texture prompt** nếu dùng Image to 3D |
| Texture | **HD**, **PBR bật** | **PBR bật** (mặc định đang tắt), texture 2K |
| Số mặt | **Face limit** = số ở mục 4, dạng **tam giác** (Quad tắt), Smart Low Poly tắt | **Remesh bật**, Topology **Triangle**, **Target polycount** = số ở mục 4 |
| Đối xứng | — | **Symmetry: On** (tàu, quái, trang bị); Auto với boss |
| Ánh sáng | — | **Remove lighting: On** (bỏ bóng sáng vẽ sẵn trong ảnh) |
| Tư thế | — | Boss dạng người: **Pose: A-pose**; còn lại: None |
| Khung xương | Auto-rig **tắt** (AI làm hoạt ảnh) | Boss dạng người: **Rigging/Auto-Rig** sau khi tạo; còn lại tắt |
| Tải về | **GLB** | **GLB** |

**Mẹo:**
- Ảnh tải lên là tranh 2D hiện có của game. Nếu ảnh có lửa động cơ hay tia sáng, mô hình có thể có một khối "lửa": **không sao, AI cắt bỏ trong Blender**.
- Có thể tạo **cả hai** (Tripo và Meshy) cho cùng một món, lưu `<id>.tripo.glb` và `<id>.meshy.glb`: AI chọn bản đẹp hơn.
- Nếu bản tạo ra sai dáng, chạy lại (Tripo: Regenerate; Meshy: Retry) hoặc thử Text to 3D với cùng prompt.

## 3. Sau khi tải về (AI làm)

1. Đặt file vào `games/space-typing/art-src/models/raw/<loại>/` (ví dụ `art-src/models/raw/ships/vanguard.tripo.glb`), báo AI.
2. AI chạy Blender không giao diện, ví dụ:
   ```
   blender -b --factory-startup -P scripts/models/blender/space_typing_model_tools.py -- \
     --input art-src/models/raw/ships/vanguard.tripo.glb --kind ships --id vanguard \
     --project . --auto-emissive 0.08 --preview .visual/models/vanguard
   ```
   Script tự làm:
   - nạp file;
   - gộp các phần, quay mũi về +Y, căn tâm, đặt cạnh dài nhất 2 m;
   - giảm tam giác theo ngân sách;
   - tạo bản đồ phát sáng từ những vùng sáng và đậm màu nhất (Tripo/Meshy không xuất bản đồ này);
   - đặt điểm gắn `FX_*` theo hình học (miệng động cơ, mũi súng, lõi, đầu cánh);
   - tạo hoạt ảnh: `Ship_Idle`, `Enemy_Idle`, `Item_Idle`; với boss có xương thì tạo `Boss_Hit`, `Boss_Death`, `Boss_Intro` bằng xương;
   - render ảnh xem trước để AI tự soi;
   - xuất `art-src/models/<loại>/<id>.glb`.
   Quái thêm `--neutralize` (màu gốc thành trắng gốm, vùng phát sáng thành trắng). Boss có xương thêm `--boss-clips`. Trên máy chủ dự án, Blender ở `D:\Blender\blender.exe`.
3. AI soi ảnh, chỉnh tay khi cần:
   - cắt khối lửa;
   - kéo điểm gắn cho đúng.
4. AI chạy `pnpm models:prepare --only <loại>/<id>` (nén, tạo bản High/Medium, cập nhật manifest), nối code nếu cần (boss khác G01 cần thêm hợp đồng), build, chụp so sánh trong game.

## 4. Prompt từng món

Bảng chất liệu theo họ, dùng khi muốn **bản riêng cho một họ** (`enemies/<họ>-<loại>`, làm sau cùng): thay câu "Neutral materials…" trong prompt quái bằng câu của họ.

| Họ | Câu chất liệu |
|---|---|
| `rainbow` | `made of glossy iridescent candy-glass and soap-bubble membranes, pastel pink, sky cyan, gold and lavender, tiny star sparkles on the shell` |
| `angel` | `white porcelain and polished gold armour, small feathered wings of light, a golden halo, ivory and warm gold with soft blue accents` |
| `devil` | `obsidian-black armour plates cracked with glowing lava veins, curved horns, ember eyes, crimson and molten orange` |
| `frost` | `carved from solid frosted glacier ice and frost crystals, snowflake engravings, pale cyan, white and deep blue` |
| `prism` | `faceted crystal prism body refracting rainbow light, violet and cyan facets, thin gold filigree` |
| `nature` | `living plant creature of bark, leaves and moss with yellow and white blossoms, leaf green, bark brown and warm yellow` |
| `shadow` | `solid ink-black shadow body with sharp flowing edges, glowing violet and pink runes and eyes` |
| `cosmic` | `star-metal starship armour with deep-blue nebula glass panels, gold trim and tiny constellation lights` |

### 4.1 Phi thuyền (11) — `ships/<id>`

#### `ships/vanguard` — Vanguard
- Ảnh tải lên: `art-src/ships/vanguard-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/vanguard.tripo.glb` hoặc `vanguard.meshy.glb`

```text
Vanguard, a sleek spear-shaped starter interceptor: long pointed nose, a glowing cyan crystal spine along the top centre, swept-back wings with small upturned tips, pearl-white ceramic armour with royal blue panels and thin glowing cyan lines, dark blue glass canopy, twin small cannons under the nose. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, two engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi game asset, PBR textures, glowing emissive parts, single object, no base, no text, fire or smoke only as painted glow.
```

#### `ships/aegis` — Aegis
- Ảnh tải lên: `art-src/ships/aegis-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/aegis.tripo.glb` hoặc `aegis.meshy.glb`

```text
Aegis, a heavy defensive frigate shaped like a flying fortress: broad armoured hull, layered shield plates on both flanks, mint and teal armour with a warm gold core. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, three engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/volt` — Volt
- Ảnh tải lên: `art-src/ships/volt-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/volt.tripo.glb` hoặc `volt.meshy.glb`

```text
Volt, an energy caster ship with curved arc-shaped wings holding tesla coils, crackling yellow-white core, cyan and indigo armour. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, two engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/wraith` — Wraith
- Ảnh tải lên: `art-src/ships/wraith-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/wraith.tripo.glb` hoặc `wraith.meshy.glb`

```text
Wraith, a stealth phantom ship with thin blade-like wings and a narrow body, smoky violet armour, cyan glowing slits. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, two engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/fortune` — Fortune
- Ảnh tải lên: `art-src/ships/fortune-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/fortune.tripo.glb` hoặc `fortune.meshy.glb`

```text
Fortune, a lucky treasure-hunter ship with a crown-shaped bow, gold and bronze plating, mint gem core. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, two engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/arsenal` — Arsenal
- Ảnh tải lên: `art-src/ships/arsenal-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/arsenal.tripo.glb` hoặc `arsenal.meshy.glb`

```text
Arsenal, a weapon platform ship with blade wings carrying many gun pods, coral orange and wine red armour. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, three engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/oracle` — Oracle
- Ảnh tải lên: `art-src/ships/oracle-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/oracle.tripo.glb` hoặc `oracle.meshy.glb`

```text
Oracle, a precision seer ship with a large lens eye at the nose and a crown crest, orchid and violet armour. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, one large engine nozzle at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/bastion` — Bastion
- Ảnh tải lên: `art-src/ships/bastion-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/bastion.tripo.glb` hoặc `bastion.meshy.glb`

```text
Bastion, a shield support carrier with four floating shield emitters around a square fortress hull, seafoam armour. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, three engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/reaper` — Reaper
- Ảnh tải lên: `art-src/ships/reaper-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/reaper.tripo.glb` hoặc `reaper.meshy.glb`

```text
Reaper, an aggressive raider with scythe-shaped wings and a sharp hooked nose, crimson-pink and dark plum armour. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, two engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/celestial` — Celestial
- Ảnh tải lên: `art-src/ships/celestial-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/celestial.tripo.glb` hoặc `celestial.meshy.glb`

```text
Celestial, a late-game hybrid ship with halo-like arc wings and star motifs, periwinkle and indigo armour, pale gold star core. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, two engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `ships/zenith` — Zenith
- Ảnh tải lên: `art-src/ships/zenith-top-hd.png` · Số mặt: **15,000**
- Lưu về: `art-src/models/raw/ships/zenith.tripo.glb` hoặc `zenith.meshy.glb`

```text
Zenith, the apex flagship: long spear hull with prism fins, white-cyan and violet armour, radiant gold core. Player starfighter for a top-down space shooter, nose pointing forward, symmetrical, three engine nozzles at the rear with glowing rims and no exhaust flame. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

### 4.2 Quái (14 khung chung, chất liệu trung tính) — `enemies/<loại>`

Một mô hình cho mỗi loại, dùng cho cả 8 họ: game tô màu họ bằng đèn viền. Ảnh tải lên chỉ để lấy **dáng**; màu cầu vồng trên ảnh sẽ được tôi đổi sang trắng gốm trong Blender.

#### `enemies/scout` — Scout (nhanh, đông)
- Ảnh tải lên: `src/assets/enemies/rainbow-scout@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/scout.tripo.glb` hoặc `scout.meshy.glb`

```text
A small agile dart-shaped flyer with swept-back wings, built for speed. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/mine` — Mine (bom trôi)
- Ảnh tải lên: `src/assets/enemies/rainbow-mine@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/mine.tripo.glb` hoặc `mine.meshy.glb`

```text
A round floating mine covered in thick spikes with a glowing core in the middle. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/tank` — Tank (tường giáp)
- Ảnh tải lên: `src/assets/enemies/rainbow-tank@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/tank.tripo.glb` hoặc `tank.meshy.glb`

```text
A heavy armoured juggernaut, broad and bulky, with thick layered armour plates. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/destroyer` — Destroyer (tấn công dồn dập)
- Ảnh tải lên: `src/assets/enemies/rainbow-destroyer@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/destroyer.tripo.glb` hoặc `destroyer.meshy.glb`

```text
An aggressive attack craft with two long forward blades like pincers. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/oppressor` — Oppressor (bắn loạt)
- Ảnh tải lên: `src/assets/enemies/rainbow-oppressor@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/oppressor.tripo.glb` hoặc `oppressor.meshy.glb`

```text
A tall floating obelisk with one menacing eye and floating rune rings. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/shield` — Shield (mang khiên)
- Ảnh tải lên: `src/assets/enemies/rainbow-shield@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/shield.tripo.glb` hoặc `shield.meshy.glb`

```text
A guardian holding a large curved shield plate in front of its body. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/carrier` — Carrier (thả quân)
- Ảnh tải lên: `src/assets/enemies/rainbow-carrier@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/carrier.tripo.glb` hoặc `carrier.meshy.glb`

```text
A wide flat mothership with glowing hangar bays underneath. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/jammer` — Jammer (gây nhiễu)
- Ảnh tải lên: `src/assets/enemies/rainbow-jammer@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/jammer.tripo.glb` hoặc `jammer.meshy.glb`

```text
A creature covered in antenna arrays and small radar dishes. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/cloaker` — Cloaker (tàng hình)
- Ảnh tải lên: `src/assets/enemies/rainbow-cloaker@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/cloaker.tripo.glb` hoặc `cloaker.meshy.glb`

```text
A sleek manta-ray stealth flyer with thin fins and a narrow body. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/healer` — Healer (hồi máu đồng đội)
- Ảnh tải lên: `src/assets/enemies/rainbow-healer@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/healer.tripo.glb` hoặc `healer.meshy.glb`

```text
A gentle floating jellyfish with glowing tendrils and a healing cross mark on its dome. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/splitter` — Splitter (chết thì tách đôi)
- Ảnh tải lên: `src/assets/enemies/rainbow-splitter@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/splitter.tripo.glb` hoặc `splitter.meshy.glb`

```text
A blobby cell-like creature with two nuclei visible inside, about to divide. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/sniper` — Sniper (bắn tỉa xa)
- Ảnh tải lên: `src/assets/enemies/rainbow-sniper@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/sniper.tripo.glb` hoặc `sniper.meshy.glb`

```text
A long-barrelled marksman with one big lens eye and a thin cannon pointing down. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/leech` — Leech (hút năng lượng)
- Ảnh tải lên: `src/assets/enemies/rainbow-leech@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/leech.tripo.glb` hoặc `leech.meshy.glb`

```text
A tentacled parasite with a round sucker mouth facing down. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `enemies/commander` — Commander (chỉ huy)
- Ảnh tải lên: `src/assets/enemies/rainbow-commander@2x.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/enemies/commander.tripo.glb` hoặc `commander.meshy.glb`

```text
A regal flagship with a crown-like crest and a flowing banner. Small alien enemy for a space shooter, seen mostly from above, chunky readable shape, symmetrical. Neutral materials so the game can recolour it: pearl-white ceramic shell, light silver metal joints, the core and edge lights glowing pure white. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

### 4.3 Boss (25; G01 đã có mô hình) — `bosses/<id>`

#### `bosses/tyrant-g02` — Vorgrath, Crown of Cinders
- Ảnh tải lên: `src/assets/bosses/tyrant-g02@2x.webp` · Số mặt: **40,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/tyrant-g02.tripo.glb` hoặc `tyrant-g02.meshy.glb`

```text
A colossal four-armed demon king of obsidian and magma, a burning crown of horns, molten cracks across his chest, crimson and fiery orange. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/tyrant-g03` — Nivalis, Voice of the Frozen Choir
- Ảnh tải lên: `src/assets/bosses/tyrant-g03@2x.webp` · Số mặt: **40,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/tyrant-g03.tripo.glb` hoặc `tyrant-g03.meshy.glb`

```text
A towering ice empress made of solid frosted crystal, a cathedral-like crown of icicles, singing, pale cyan, white and silver. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/tyrant-g04` — Sylvarch, Heart of the Ancient Grove
- Ảnh tải lên: `src/assets/bosses/tyrant-g04@2x.webp` · Số mặt: **40,000** · không cần khung xương
- Lưu về: `art-src/models/raw/bosses/tyrant-g04.tripo.glb` hoặc `tyrant-g04.meshy.glb`

```text
An ancient colossal tree titan with a mossy bark body, glowing amber heart, antler branches with yellow blossoms, green and bark brown. Giant boss for a space shooter, full body facing the viewer, floating as one solid body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/tyrant-g05` — Umbraxis, the Eclipse Hollow
- Ảnh tải lên: `src/assets/bosses/tyrant-g05@2x.webp` · Số mặt: **40,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/tyrant-g05.tripo.glb` hoặc `tyrant-g05.meshy.glb`

```text
A looming eclipse wraith with a black sun for a head, a ring of violet fire, long clawed shadow arms, black, violet and hot pink. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/tyrant-g06` — Novakern, Forgemaster of the Cosmic Engine
- Ảnh tải lên: `src/assets/bosses/tyrant-g06@2x.webp` · Số mặt: **40,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/tyrant-g06.tripo.glb` hoặc `tyrant-g06.meshy.glb`

```text
A gigantic star-forge golem of dark star-metal, a blazing reactor core in its chest, hammer arms, lightning arcs, deep blue and gold. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/tyrant-g07` — Abyssion, Maw of the Black Halo
- Ảnh tải lên: `src/assets/bosses/tyrant-g07@2x.webp` · Số mặt: **40,000** · không cần khung xương
- Lưu về: `art-src/models/raw/bosses/tyrant-g07.tripo.glb` hoặc `tyrant-g07.meshy.glb`

```text
A horrifying abyssal beast with a huge fanged maw ringed by a black halo, obsidian scales and crimson glowing veins, dark red and ember orange. Giant boss for a space shooter, full body facing the viewer, floating as one solid body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/tyrant-g08` — Polaris, the Frozen Singularity
- Ảnh tải lên: `src/assets/bosses/tyrant-g08@2x.webp` · Số mặt: **40,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/tyrant-g08.tripo.glb` hoặc `tyrant-g08.meshy.glb`

```text
A celestial ice guardian holding a frozen black hole between its hands, star-dust cloak, crystal armour, periwinkle blue and white. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/tyrant-g09` — Eventide, the Silent Throne
- Ảnh tải lên: `src/assets/bosses/tyrant-g09@2x.webp` · Số mặt: **40,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/tyrant-g09.tripo.glb` hoặc `tyrant-g09.meshy.glb`

```text
A fallen archangel seated on a floating throne of dusk, golden broken halo, dark-violet feathered wings, gold and dusk violet. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/tyrant-g10` — Aeternus, the Cosmic Crown
- Ảnh tải lên: `src/assets/bosses/tyrant-g10@2x.webp` · Số mặt: **40,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/tyrant-g10.tripo.glb` hoặc `tyrant-g10.meshy.glb`

```text
The ultimate cosmic emperor, a crown of floating prism shards and galaxies, armour of every realm fused together, violet, cyan and gold. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/warden-rainbow` — Iridessa, Warden of the Prismatic Tide
- Ảnh tải lên: `src/assets/bosses/warden-rainbow@2x.webp` · Số mặt: **30,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/warden-rainbow.tripo.glb` hoặc `warden-rainbow.meshy.glb`

```text
A graceful bubble-glass siren with flowing iridescent fins and a pearl crown, pastel pink and cyan. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/warden-angel` — Seraphiel, Archangel of the Halo Garden
- Ảnh tải lên: `src/assets/bosses/warden-angel@2x.webp` · Số mặt: **30,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/warden-angel.tripo.glb` hoặc `warden-angel.meshy.glb`

```text
A noble armoured archangel with four golden wings and a radiant double halo, ivory and gold. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/warden-devil` — Malgorath, Demon Lord of the Furnace
- Ảnh tải lên: `src/assets/bosses/warden-devil@2x.webp` · Số mặt: **30,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/warden-devil.tripo.glb` hoặc `warden-devil.meshy.glb`

```text
A hulking demon lord with a forge furnace in his belly, iron horns, chains, black and molten orange. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/warden-frost` — Glacia, Queen of the Glacier Choir
- Ảnh tải lên: `src/assets/bosses/warden-frost@2x.webp` · Số mặt: **30,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/warden-frost.tripo.glb` hoặc `warden-frost.meshy.glb`

```text
An ice queen with a gown of solid frosted crystal and a snowflake crown, pale cyan and white. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/warden-prism` — Prismarch, Archon of Refracted Light
- Ảnh tải lên: `src/assets/bosses/warden-prism@2x.webp` · Số mặt: **30,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/warden-prism.tripo.glb` hoặc `warden-prism.meshy.glb`

```text
A faceted crystal archon with a prism head that splits light, floating shard armour, violet and cyan. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/warden-nature` — Elder Bloomheart, Keeper of the Ancient Grove
- Ảnh tải lên: `src/assets/bosses/warden-nature@2x.webp` · Số mặt: **30,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/warden-nature.tripo.glb` hoặc `warden-nature.meshy.glb`

```text
A gentle giant of living wood and vines with a blooming flower heart, yellow and white flowers, green and brown. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/warden-shadow` — The Umbral Eye, Watcher of the Eclipse
- Ảnh tải lên: `src/assets/bosses/warden-shadow@2x.webp` · Số mặt: **30,000** · không cần khung xương
- Lưu về: `art-src/models/raw/bosses/warden-shadow.tripo.glb` hoặc `warden-shadow.meshy.glb`

```text
A giant floating eye of shadow wrapped in black tendrils, violet iris, pink glowing runes. Giant boss for a space shooter, full body facing the viewer, floating as one solid body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/warden-cosmic` — Astraeon, Emperor of the Star Forge
- Ảnh tải lên: `src/assets/bosses/warden-cosmic@2x.webp` · Số mặt: **30,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/warden-cosmic.tripo.glb` hoặc `warden-cosmic.meshy.glb`

```text
A star-metal emperor mech with a nebula glass cape and a crown of tiny stars, deep blue and gold. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/lieutenant-rainbow` — Chroma Knight
- Ảnh tải lên: `src/assets/bosses/lieutenant-rainbow@2x.webp` · Số mặt: **20,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/lieutenant-rainbow.tripo.glb` hoặc `lieutenant-rainbow.meshy.glb`

```text
A candy-glass knight with a rainbow lance and a bubble shield, pastel pink and gold. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/lieutenant-angel` — Choir Sentinel
- Ảnh tải lên: `src/assets/bosses/lieutenant-angel@2x.webp` · Số mặt: **20,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/lieutenant-angel.tripo.glb` hoặc `lieutenant-angel.meshy.glb`

```text
A porcelain sentinel with a golden bell for a head and small light wings, ivory and gold. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/lieutenant-devil` — Brimstone Baron
- Ảnh tải lên: `src/assets/bosses/lieutenant-devil@2x.webp` · Số mặt: **20,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/lieutenant-devil.tripo.glb` hoặc `lieutenant-devil.meshy.glb`

```text
A stout imp noble in lava-cracked armour with a smoking top hat of obsidian, crimson and orange. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/lieutenant-frost` — Frost Oracle
- Ảnh tải lên: `src/assets/bosses/lieutenant-frost@2x.webp` · Số mặt: **20,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/lieutenant-frost.tripo.glb` hoặc `lieutenant-frost.meshy.glb`

```text
A hooded ice oracle holding a glowing frost orb, crystal robes, cyan and white. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/lieutenant-prism` — Prism Sentinel
- Ảnh tải lên: `src/assets/bosses/lieutenant-prism@2x.webp` · Số mặt: **20,000** · không cần khung xương
- Lưu về: `art-src/models/raw/bosses/lieutenant-prism.tripo.glb` hoặc `lieutenant-prism.meshy.glb`

```text
A floating crystal sentinel made of stacked prisms with one lens eye, violet and cyan. Giant boss for a space shooter, full body facing the viewer, floating as one solid body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/lieutenant-nature` — Thornback
- Ảnh tải lên: `src/assets/bosses/lieutenant-nature@2x.webp` · Số mặt: **20,000** · không cần khung xương
- Lưu về: `art-src/models/raw/bosses/lieutenant-nature.tripo.glb` hoặc `lieutenant-nature.meshy.glb`

```text
A thorn-covered beetle guardian with a mossy shell and yellow flowers, green and brown. Giant boss for a space shooter, full body facing the viewer, floating as one solid body, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/lieutenant-shadow` — Night Stalker
- Ảnh tải lên: `src/assets/bosses/lieutenant-shadow@2x.webp` · Số mặt: **20,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/lieutenant-shadow.tripo.glb` hoặc `lieutenant-shadow.meshy.glb`

```text
A lean shadow hunter with long blade arms and violet glowing eyes. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `bosses/lieutenant-cosmic` — Forge Golem
- Ảnh tải lên: `src/assets/bosses/lieutenant-cosmic@2x.webp` · Số mặt: **20,000** · Meshy: **Pose A-pose**, rồi Auto-Rig
- Lưu về: `art-src/models/raw/bosses/lieutenant-cosmic.tripo.glb` hoặc `lieutenant-cosmic.meshy.glb`

```text
A compact star-metal golem with a glowing reactor chest and gold rivets, deep blue and gold. Giant boss for a space shooter, full body facing the viewer, standing in a relaxed A-pose with the arms slightly away from the body, wings spread wide, a wide dramatic silhouette, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

### 4.4 Vật thể của kỹ năng (5) — `skills/<id>`

Chỉ những kỹ năng có vật thể (tên lửa, đạn, drone). Khiên, sóng EMP, vùng làm chậm là hiệu ứng ánh sáng do game vẽ, không cần mô hình.

#### `skills/micro-missile` — Missile Swarm
- Ảnh tải lên: `(không có ảnh: dùng Text to 3D)` · Số mặt: **1,500**
- Lưu về: `art-src/models/raw/skills/micro-missile.tripo.glb` hoặc `micro-missile.meshy.glb`

```text
A compact homing micro-missile: slim white body with orange warning bands, a dark sensor tip, four small swept tail fins, a glowing orange exhaust nozzle at the rear, a tiny blue status light on the side, pointing forward along its length, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `skills/railgun-slug` — Railgun
- Ảnh tải lên: `(không có ảnh: dùng Text to 3D)` · Số mặt: **1,500**
- Lưu về: `art-src/models/raw/skills/railgun-slug.tripo.glb` hoặc `railgun-slug.meshy.glb`

```text
A glowing magnetic railgun slug: elongated tungsten dart with blue-white plasma rings around it, pointing forward along its length, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `skills/orbital-lance` — Orbital Strike
- Ảnh tải lên: `(không có ảnh: dùng Text to 3D)` · Số mặt: **1,500**
- Lưu về: `art-src/models/raw/skills/orbital-lance.tripo.glb` hoặc `orbital-lance.meshy.glb`

```text
A long orbital strike lance: white-gold spear-shaped kinetic rod with glowing runes and stabiliser fins, pointing forward along its length, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `skills/sentinel-drone` — Sentinel Drones
- Ảnh tải lên: `(không có ảnh: dùng Text to 3D)` · Số mặt: **1,500**
- Lưu về: `art-src/models/raw/skills/sentinel-drone.tripo.glb` hoặc `sentinel-drone.meshy.glb`

```text
A small round escort drone with a single cyan lens eye, two side thrusters and a tiny shield emitter, pointing forward along its length, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `skills/gravity-core` — Singularity
- Ảnh tải lên: `(không có ảnh: dùng Text to 3D)` · Số mặt: **1,500**
- Lưu về: `art-src/models/raw/skills/gravity-core.tripo.glb` hoặc `gravity-core.meshy.glb`

```text
A fist-sized gravity bomb: dark metal cage holding a swirling black sphere with a violet accretion ring, pointing forward along its length, symmetrical. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

### 4.5 Trang bị (42) — `items/<id>`

#### `items/pulse-laser-mk1` — Pulse Laser Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/pulse-laser-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/pulse-laser-mk1.tripo.glb` hoặc `pulse-laser-mk1.meshy.glb`

```text
Pulse Laser Mk.I: compact twin-barrel pulse laser cannon, cyan muzzle glow. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/precision-laser-mk1` — Precision Laser Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/precision-laser-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/precision-laser-mk1.tripo.glb` hoặc `precision-laser-mk1.meshy.glb`

```text
Precision Laser Mk.I: long slim precision laser with scope rings, green-cyan glow. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/ion-cannon-mk1` — Ion Cannon Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/ion-cannon-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/ion-cannon-mk1.tripo.glb` hoặc `ion-cannon-mk1.meshy.glb`

```text
Ion Cannon Mk.I: heavy ion cannon with glowing blue coils along the barrel. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/arc-projector-mk2` — Arc Projector Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/arc-projector-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/arc-projector-mk2.tripo.glb` hoặc `arc-projector-mk2.meshy.glb`

```text
Arc Projector Mk.II: fork-tipped arc projector weapon crackling with lightning between its prongs, accent colour electric blue with violet sparks. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/rail-driver-mk2` — Rail Driver Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/rail-driver-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/rail-driver-mk2.tripo.glb` hoặc `rail-driver-mk2.meshy.glb`

```text
Rail Driver Mk.II: long magnetic rail cannon with two parallel rails and a glowing slug between them, ice blue. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/plasma-lance-mk3` — Plasma Lance Mk.III
- Ảnh tải lên: `src/assets/icons/equipment/plasma-lance-mk3.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/plasma-lance-mk3.tripo.glb` hoặc `plasma-lance-mk3.meshy.glb`

```text
Plasma Lance Mk.III: ornate plasma lance with a magenta-white plasma core and heat vents, premium. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/plated-armor-mk1` — Plated Armor Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/plated-armor-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/plated-armor-mk1.tripo.glb` hoặc `plated-armor-mk1.meshy.glb`

```text
Plated Armor Mk.I: layered riveted steel armour plates. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/adaptive-armor-mk1` — Adaptive Armor Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/adaptive-armor-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/adaptive-armor-mk1.tripo.glb` hoặc `adaptive-armor-mk1.meshy.glb`

```text
Adaptive Armor Mk.I: segmented armour plate with shifting panels and teal seams. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/kinetic-shell-mk1` — Kinetic Shell Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/kinetic-shell-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/kinetic-shell-mk1.tripo.glb` hoặc `kinetic-shell-mk1.meshy.glb`

```text
Kinetic Shell Mk.I: thick rounded kinetic hull shell section, dark grey, lightly dented. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/ablative-plating-mk2` — Ablative Plating Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/ablative-plating-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/ablative-plating-mk2.tripo.glb` hoặc `ablative-plating-mk2.meshy.glb`

```text
Ablative Plating Mk.II: sacrificial ablative armour tiles with orange-hot scorched edges, one tile flaking off. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/reactive-armor-mk2` — Reactive Armor Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/reactive-armor-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/reactive-armor-mk2.tripo.glb` hoặc `reactive-armor-mk2.meshy.glb`

```text
Reactive Armor Mk.II: explosive-reactive armour blocks with small glowing amber charges. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/nanoweave-hull-mk3` — Nanoweave Hull Mk.III
- Ảnh tải lên: `src/assets/icons/equipment/nanoweave-hull-mk3.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/nanoweave-hull-mk3.tripo.glb` hoặc `nanoweave-hull-mk3.meshy.glb`

```text
Nanoweave Hull Mk.III: hull lattice woven from glowing green nanite threads, premium. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/deflector-shield-mk1` — Deflector Shield Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/deflector-shield-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/deflector-shield-mk1.tripo.glb` hoặc `deflector-shield-mk1.meshy.glb`

```text
Deflector Shield Mk.I: round shield emitter projecting a cyan energy disc. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/prism-shield-mk1` — Prism Shield Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/prism-shield-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/prism-shield-mk1.tripo.glb` hoặc `prism-shield-mk1.meshy.glb`

```text
Prism Shield Mk.I: prism crystal emitter splitting light into a shield. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/capacitor-shield-mk1` — Capacitor Shield Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/capacitor-shield-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/capacitor-shield-mk1.tripo.glb` hoặc `capacitor-shield-mk1.meshy.glb`

```text
Capacitor Shield Mk.I: cylindrical capacitor bank with a hexagonal shield glow. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/discharge-shield-mk2` — Discharge Shield Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/discharge-shield-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/discharge-shield-mk2.tripo.glb` hoặc `discharge-shield-mk2.meshy.glb`

```text
Discharge Shield Mk.II: shield generator crackling with stored electricity, blue-white arcs. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/harmonic-shield-mk2` — Harmonic Shield Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/harmonic-shield-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/harmonic-shield-mk2.tripo.glb` hoặc `harmonic-shield-mk2.meshy.glb`

```text
Harmonic Shield Mk.II: tuning-fork shaped shield emitter with concentric cyan wave rings. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/phase-shield-mk3` — Phase Shield Mk.III
- Ảnh tải lên: `src/assets/icons/equipment/phase-shield-mk3.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/phase-shield-mk3.tripo.glb` hoặc `phase-shield-mk3.meshy.glb`

```text
Phase Shield Mk.III: phase shield emitter with a shimmering violet rift in front of it, premium. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/compact-reactor-mk1` — Compact Reactor Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/compact-reactor-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/compact-reactor-mk1.tripo.glb` hoặc `compact-reactor-mk1.meshy.glb`

```text
Compact Reactor Mk.I: small cylindrical ship reactor with a yellow glowing core. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/overclock-reactor-mk1` — Overclock Reactor Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/overclock-reactor-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/overclock-reactor-mk1.tripo.glb` hoặc `overclock-reactor-mk1.meshy.glb`

```text
Overclock Reactor Mk.I: reactor with red-hot overclocked coils and heat sinks. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/fusion-reactor-mk1` — Fusion Reactor Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/fusion-reactor-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/fusion-reactor-mk1.tripo.glb` hoặc `fusion-reactor-mk1.meshy.glb`

```text
Fusion Reactor Mk.I: spherical fusion reactor with a white-gold core inside a torus. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/efficient-reactor-mk2` — Efficient Reactor Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/efficient-reactor-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/efficient-reactor-mk2.tripo.glb` hoặc `efficient-reactor-mk2.meshy.glb`

```text
Efficient Reactor Mk.II: sleek reactor with clean blue energy lines and cooling fins. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/siphon-reactor-mk2` — Siphon Reactor Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/siphon-reactor-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/siphon-reactor-mk2.tripo.glb` hoặc `siphon-reactor-mk2.meshy.glb`

```text
Siphon Reactor Mk.II: reactor with siphon tubes drawing glowing scrap particles in, teal. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/cryo-reactor-mk3` — Cryo Reactor Mk.III
- Ảnh tải lên: `src/assets/icons/equipment/cryo-reactor-mk3.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/cryo-reactor-mk3.tripo.glb` hoặc `cryo-reactor-mk3.meshy.glb`

```text
Cryo Reactor Mk.III: frost-covered reactor with an icy blue core and ice crystals, premium. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/targeting-module-mk1` — Targeting Module Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/targeting-module-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/targeting-module-mk1.tripo.glb` hoặc `targeting-module-mk1.meshy.glb`

```text
Targeting Module Mk.I: targeting module with a lens and a red reticle. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/salvage-module-mk1` — Salvage Module Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/salvage-module-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/salvage-module-mk1.tripo.glb` hoặc `salvage-module-mk1.meshy.glb`

```text
Salvage Module Mk.I: mechanical salvage claw module. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/fortune-module-mk1` — Fortune Module Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/fortune-module-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/fortune-module-mk1.tripo.glb` hoặc `fortune-module-mk1.meshy.glb`

```text
Fortune Module Mk.I: ship module with a golden four-leaf circuit pattern. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/hunter-killer-pod-mk2` — Hunter-Killer Pod Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/hunter-killer-pod-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/hunter-killer-pod-mk2.tripo.glb` hoặc `hunter-killer-pod-mk2.meshy.glb`

```text
Hunter-Killer Pod Mk.II: wing pod with a rack of micro-missiles with orange tips. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/threat-scanner-mk2` — Threat Scanner Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/threat-scanner-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/threat-scanner-mk2.tripo.glb` hoặc `threat-scanner-mk2.meshy.glb`

```text
Threat Scanner Mk.II: radar dish scanner with a sweeping green scan and jamming waves. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/overcharge-module-mk3` — Overcharge Module Mk.III
- Ảnh tải lên: `src/assets/icons/equipment/overcharge-module-mk3.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/overcharge-module-mk3.tripo.glb` hoặc `overcharge-module-mk3.meshy.glb`

```text
Overcharge Module Mk.III: module with a crimson capacitor overflowing with energy, premium. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/support-drone-mk1` — Support Drone Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/support-drone-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/support-drone-mk1.tripo.glb` hoặc `support-drone-mk1.meshy.glb`

```text
Support Drone Mk.I: small round support drone with a green repair light. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/assault-drone-mk1` — Assault Drone Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/assault-drone-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/assault-drone-mk1.tripo.glb` hoặc `assault-drone-mk1.meshy.glb`

```text
Assault Drone Mk.I: small aggressive drone with twin guns and red lights. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/ward-drone-mk1` — ECM Drone Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/ward-drone-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/ward-drone-mk1.tripo.glb` hoặc `ward-drone-mk1.meshy.glb`

```text
ECM Drone Mk.I: drone with an antenna array emitting purple jamming waves. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/escort-drone-mk2` — Escort Drone Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/escort-drone-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/escort-drone-mk2.tripo.glb` hoặc `escort-drone-mk2.meshy.glb`

```text
Escort Drone Mk.II: sleek arrowhead escort drone with twin cyan engines, flying nose up, accent colour cyan #8fe8ff. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/interceptor-drone-mk2` — Interceptor Drone Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/interceptor-drone-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/interceptor-drone-mk2.tripo.glb` hoặc `interceptor-drone-mk2.meshy.glb`

```text
Interceptor Drone Mk.II: point-defence drone with a small turret and amber lights. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/wing-drones-mk3` — Wing Drones Mk.III
- Ảnh tải lên: `src/assets/icons/equipment/wing-drones-mk3.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/wing-drones-mk3.tripo.glb` hoặc `wing-drones-mk3.meshy.glb`

```text
Wing Drones Mk.III: pair of elegant white escort drones flying in formation, cyan engines, premium. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/overdrive-core-mk1` — Overdrive Core Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/overdrive-core-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/overdrive-core-mk1.tripo.glb` hoặc `overdrive-core-mk1.meshy.glb`

```text
Overdrive Core Mk.I: glowing hexagonal core crystal, orange. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/salvage-core-mk1` — Salvage Core Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/salvage-core-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/salvage-core-mk1.tripo.glb` hoặc `salvage-core-mk1.meshy.glb`

```text
Salvage Core Mk.I: ship core assembled from salvaged brass parts. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/balanced-core-mk1` — Balanced Core Mk.I
- Ảnh tải lên: `src/assets/icons/equipment/balanced-core-mk1.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/balanced-core-mk1.tripo.glb` hoặc `balanced-core-mk1.meshy.glb`

```text
Balanced Core Mk.I: round core with two-tone swirling energy, blue and gold. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/ignition-core-mk2` — Ignition Core Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/ignition-core-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/ignition-core-mk2.tripo.glb` hoặc `ignition-core-mk2.meshy.glb`

```text
Ignition Core Mk.II: ship core with a fiery orange ignition chamber. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/momentum-core-mk2` — Momentum Core Mk.II
- Ảnh tải lên: `src/assets/icons/equipment/momentum-core-mk2.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/momentum-core-mk2.tripo.glb` hoặc `momentum-core-mk2.meshy.glb`

```text
Momentum Core Mk.II: ship core with spinning flywheel rings and motion streaks. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/quantum-core-mk3` — Quantum Core Mk.III
- Ảnh tải lên: `src/assets/icons/equipment/quantum-core-mk3.webp` · Số mặt: **5,000**
- Lưu về: `art-src/models/raw/items/quantum-core-mk3.tripo.glb` hoặc `quantum-core-mk3.meshy.glb`

```text
Quantum Core Mk.III: quantum core with floating fragments around a white-violet singularity, premium. A compact spaceship equipment module shown as a floating game item, three-quarter view friendly, clean mechanical detail. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

### 4.6 Vật phẩm dùng một lần (12) — `items/<id>`

#### `items/repair-kit` — Repair Kit
- Ảnh tải lên: `src/assets/icons/items/repair-kit.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/repair-kit.tripo.glb` hoặc `repair-kit.meshy.glb`

```text
Repair Kit: a compact armoured field repair kit case with a glowing green cross panel and nanite sparks. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/nova-bomb` — Nova Bomb
- Ảnh tải lên: `src/assets/icons/items/nova-bomb.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/nova-bomb.tripo.glb` hoặc `nova-bomb.meshy.glb`

```text
Nova Bomb: a spherical nova bomb core with a white-hot star inside a cage of curved plates, light bursting through the seams. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/shield-cell` — Shield Cell
- Ảnh tải lên: `src/assets/icons/items/shield-cell.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/shield-cell.tripo.glb` hoặc `shield-cell.meshy.glb`

```text
Shield Cell: a hexagonal shield battery cell with a glowing blue hex-grid core. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/energy-cell` — Energy Cell
- Ảnh tải lên: `src/assets/icons/items/energy-cell.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/energy-cell.tripo.glb` hoặc `energy-cell.meshy.glb`

```text
Energy Cell: a slim cylindrical energy cell with a crackling violet lightning core in a glass tube. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/emp-charge` — EMP Charge
- Ảnh tải lên: `src/assets/icons/items/emp-charge.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/emp-charge.tripo.glb` hoặc `emp-charge.meshy.glb`

```text
EMP Charge: a disc-shaped EMP grenade with electric arcs jumping between three prongs. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/time-crystal` — Time Crystal
- Ảnh tải lên: `src/assets/icons/items/time-crystal.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/time-crystal.tripo.glb` hoặc `time-crystal.meshy.glb`

```text
Time Crystal: a floating hourglass-shaped crystal with slow-motion light rings around it. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/word-bomb` — Word Bomb
- Ảnh tải lên: `src/assets/icons/items/word-bomb.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/word-bomb.tripo.glb` hoặc `word-bomb.meshy.glb`

```text
Word Bomb: a round bomb whose fuse spark is a glowing letter glyph, rune letters etched on the shell. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/supply-beacon` — Supply Beacon
- Ảnh tải lên: `src/assets/icons/items/supply-beacon.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/supply-beacon.tripo.glb` hoặc `supply-beacon.meshy.glb`

```text
Supply Beacon: a small orbital supply beacon with a pulsing gold light on an antenna mast. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/lucky-dice` — Lucky Dice
- Ảnh tải lên: `src/assets/icons/items/lucky-dice.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/lucky-dice.tripo.glb` hoặc `lucky-dice.meshy.glb`

```text
Lucky Dice: a pair of glowing crystal dice tumbling, star-shaped pips shining. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/salvage-anchor` — Salvage Anchor
- Ảnh tải lên: `src/assets/icons/items/salvage-anchor.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/salvage-anchor.tripo.glb` hoặc `salvage-anchor.meshy.glb`

```text
Salvage Anchor: a heavy magnetic salvage anchor with a tractor-beam glow at its tip. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/stage-revival-core` — Stage Revival Core
- Ảnh tải lên: `src/assets/icons/items/stage-revival-core.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/stage-revival-core.tripo.glb` hoặc `stage-revival-core.meshy.glb`

```text
Stage Revival Core: a pulsing heart-shaped reactor core in a protective cage, rebirth light rising from it. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

#### `items/phoenix-core` — Phoenix Core
- Ảnh tải lên: `src/assets/icons/items/phoenix-core.webp` · Số mặt: **4,000**
- Lưu về: `art-src/models/raw/items/phoenix-core.tripo.glb` hoặc `phoenix-core.meshy.glb`

```text
Phoenix Core: a fiery phoenix-feather reactor core with flame wings wrapping around it. A consumable game item, small and iconic, three-quarter view friendly. Stylized sci-fi fantasy game asset, hand-painted PBR textures, crisp readable silhouette, glowing emissive energy parts, single object centred, no base, no ground, no text, any fire, lightning or smoke painted as glow on the surface, not as separate shapes.
```

