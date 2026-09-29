# Yêu cầu ảnh: quái vật và boss

> **Dành cho:** chủ dự án và AI tạo ảnh (Gemini, ChatGPT Images…) được giao làm ảnh.
>
> **Mục đích:** thay thân quái "quả cầu" vẽ bằng code bằng tranh vẽ tay. Mỗi **loại quái** có hình dáng riêng (sniper có nòng dài, tank to và dày giáp, mine có gai…). Mỗi **họ** có chất liệu và màu riêng theo bối cảnh (lửa, băng, pha lê…). Mỗi **boss** có hình dáng riêng.
> Không cần sửa code. Code vẫn lo chuyển động, hào quang, hiệu ứng trúng đòn, tiếng và mảnh vỡ. Món nào chưa có ảnh thì game vẫn vẽ như cũ.

## 1. Cách làm (cho AI tạo ảnh)

1. Tạo ảnh vuông **1024×1024**. Lời nhắc (prompt) = **phần chung** + **phần họ** + **phần loại** + **dòng nền**. Riêng boss: **phần chung boss** + **mô tả boss** + **dòng nền**.
2. Lưu ảnh gốc đúng tên file (bảng ở mục 4–6):
   - quái: `games/space-typing/art-src/enemies/<tên>.png`
   - boss: `games/space-typing/art-src/bosses/<tên>.png`
3. Chạy lệnh xử lý trong thư mục `games/space-typing`:

   ```bash
   pnpm sprites:prepare                 # xử lý mọi ảnh mới
   pnpm sprites:prepare devil-sniper    # hoặc chỉ vài ảnh
   ```

   Lệnh này tự làm hết: xoá dấu ngôi sao của Gemini ở góc, tách nền xanh (hoặc hồng tím) thành trong suốt, cắt sát nhân vật, thu nhỏ, rồi lưu WebP vào `src/assets/enemies/` hoặc `src/assets/bosses/`. Nếu nền không đạt, lệnh báo lỗi. Khi đó tạo lại ảnh với đúng dòng nền.
4. Build lại để thấy trong game: `pnpm build:space` (ở thư mục gốc `typing-game`), rồi tải lại trang.

**Quy tắc bắt buộc:**
- Tên file đúng từng ký tự như bảng (chữ thường, gạch ngang).
- Nền phẳng một màu, không bóng đổ, không vân:
  - **xanh lá `#00FF00`** cho mọi họ, **trừ họ nature**;
  - họ **nature** (cây cỏ màu xanh lá) dùng **hồng tím `#FF00FF`**, và hoa vẽ màu vàng hoặc trắng (không hồng).
- Nhân vật **đặc, không trong suốt**, không nhoè chuyển động, không có quầng sáng loang ra nền. Nhân vật **không được chứa màu trùng màu nền**.
- Không chữ, không khung, không logo.

## 2. Phần chung

**Quái (dán đầu mọi lời nhắc quái):**

```
Single game sprite for a vertical space shooter: one alien creature-craft seen from slightly
above and in front (3/4 top-down view), facing DOWN toward the viewer, centred with a small
margin, whole body visible, bold readable silhouette that still reads at 64 px,
painterly cinematic fantasy game art, crisp clean edges, solid opaque body, rim light,
no motion blur, no glow spilling onto the background, no text, no frame, no shadow on the ground.
```

**Boss (dán đầu mọi lời nhắc boss):**

```
Epic boss sprite for a vertical space shooter: one colossal, awe-inspiring cosmic being seen
from the front and slightly above, facing DOWN toward the viewer, centred, whole body visible
with a small margin, strong symmetrical readable silhouette, painterly cinematic fantasy game
art of the highest quality, intricate detail, crisp clean edges, solid opaque body, dramatic rim
light, no motion blur, no glow spilling onto the background, no text, no frame.
```

**Dòng nền (dán cuối):**
- Mọi họ trừ nature: `Flat pure #00FF00 green background, perfectly uniform, no gradient, no shadow; the subject contains no green at all.`
- Họ nature: `Flat pure #FF00FF magenta background, perfectly uniform, no gradient, no shadow; the subject contains no pink or magenta at all.`

## 3. Làm thử trước (3 quái + 1 boss)

Làm 4 ảnh này trước để chủ dự án duyệt phong cách, rồi mới làm tiếp:

| Tên file | Thư mục | Ghép lời nhắc |
|---|---|---|
| `rainbow-scout` | `art-src/enemies` | chung quái + họ **rainbow** + loại **scout** + nền xanh |
| `rainbow-tank` | `art-src/enemies` | chung quái + họ **rainbow** + loại **tank** + nền xanh |
| `rainbow-sniper` | `art-src/enemies` | chung quái + họ **rainbow** + loại **sniper** + nền xanh |
| `tyrant-g01` | `art-src/bosses` | chung boss + mô tả **tyrant-g01** + nền xanh |

Sau khi duyệt, nên làm theo thứ tự: 3 họ của Galaxy 01 (`rainbow`, `angel`, `prism`) × 14 loại, sau đó các họ còn lại và các boss.

## 4. Phần họ (8 họ)

| Họ | Xuất hiện ở | Phần họ của lời nhắc |
|---|---|---|
| `rainbow` | Galaxy 01, 02, 04, 06 | `made of glossy iridescent candy-glass and soap-bubble membranes, pastel pink, sky cyan, gold and lavender, tiny star sparkles on the shell` |
| `angel` | Galaxy 01, 03, 04, 09 | `white porcelain and polished gold armour, small feathered wings of light, a golden halo, ivory and warm gold with soft blue accents` |
| `devil` | Galaxy 02, 05, 07 | `obsidian-black armour plates cracked with glowing lava veins, curved horns, ember eyes, crimson and molten orange` |
| `frost` | Galaxy 03, 08 | `carved from solid frosted glacier ice and frost crystals, snowflake engravings, pale cyan, white and deep blue` |
| `prism` | Galaxy 01, 03, 06, 08 | `faceted crystal prism body refracting rainbow light, violet and cyan facets, thin gold filigree` |
| `nature` | Galaxy 04, 05 | `living plant creature of bark, leaves and moss with yellow and white blossoms, leaf green, bark brown and warm yellow` |
| `shadow` | Galaxy 02, 05, 07, 09 | `solid ink-black shadow body with sharp flowing edges, glowing violet and pink runes and eyes` |
| `cosmic` | Galaxy 06, 07, 08, 09 | `star-metal starship armour with deep-blue nebula glass panels, gold trim and tiny constellation lights` |

Galaxy 10 dùng cả 8 họ.

## 5. Phần loại (14 loại)

| Loại | Vai trò trong trận | Phần loại của lời nhắc |
|---|---|---|
| `scout` | nhanh, đông | `a small agile dart-shaped flyer with swept-back wings, built for speed` |
| `mine` | bom trôi | `a round floating mine covered in thick spikes with a glowing core in the middle` |
| `tank` | tường giáp | `a heavy armoured juggernaut, broad and bulky, with thick layered armour plates` |
| `destroyer` | tấn công dồn dập | `an aggressive attack craft with two long forward blades like pincers` |
| `oppressor` | bắn loạt | `a tall floating obelisk with one menacing eye and floating rune rings` |
| `shield` | mang khiên | `a guardian holding a large curved shield plate in front of its body` |
| `carrier` | thả quân | `a wide flat mothership with glowing hangar bays underneath` |
| `jammer` | gây nhiễu | `a creature covered in antenna arrays and small radar dishes` |
| `cloaker` | tàng hình | `a sleek manta-ray stealth flyer with thin fins and a narrow body` |
| `healer` | hồi máu đồng đội | `a gentle floating jellyfish with glowing tendrils and a healing cross mark on its dome` |
| `splitter` | chết thì tách đôi | `a blobby cell-like creature with two nuclei visible inside, about to divide` |
| `sniper` | bắn tỉa xa | `a long-barrelled marksman with one big lens eye and a thin cannon pointing down` |
| `leech` | hút năng lượng | `a tentacled parasite with a round sucker mouth facing down` |
| `commander` | chỉ huy | `a regal flagship with a crown-like crest and a flowing banner` |

**Tên file quái:** `<họ>-<loại>`, ví dụ `devil-sniper`, `frost-healer`, `cosmic-carrier`. Đủ bộ là 8 × 14 = 112 ảnh.
Có thể làm trước một ảnh chung cho mọi họ, đặt tên chỉ bằng loại, ví dụ `sniper`. Game sẽ dùng ảnh chung này khi họ đó chưa có ảnh riêng.

## 6. Boss (26 ảnh) — thư mục `art-src/bosses`

### Galaxy Tyrant (boss lớn cuối mỗi Galaxy)

| Tên file | Tên trong game | Mô tả boss |
|---|---|---|
| `tyrant-g01` | Auriel, the Rainbow Sovereign | `a radiant rainbow seraph queen with six prismatic crystal wings, a tall crystal crown, flowing robes of iridescent light, pastel pink, cyan and gold` |
| `tyrant-g02` | Vorgrath, Crown of Cinders | `a colossal four-armed demon king of obsidian and magma, a burning crown of horns, molten cracks across his chest, crimson and fiery orange` |
| `tyrant-g03` | Nivalis, Voice of the Frozen Choir | `a towering ice empress made of solid frosted crystal, a cathedral-like crown of icicles, singing, pale cyan, white and silver` |
| `tyrant-g04` | Sylvarch, Heart of the Ancient Grove | `an ancient colossal tree titan with a mossy bark body, glowing amber heart, antler branches with yellow blossoms, green and bark brown` *(nền hồng tím)* |
| `tyrant-g05` | Umbraxis, the Eclipse Hollow | `a looming eclipse wraith with a black sun for a head, a ring of violet fire, long clawed shadow arms, black, violet and hot pink` |
| `tyrant-g06` | Novakern, Forgemaster of the Cosmic Engine | `a gigantic star-forge golem of dark star-metal, a blazing reactor core in its chest, hammer arms, lightning arcs, deep blue and gold` |
| `tyrant-g07` | Abyssion, Maw of the Black Halo | `a horrifying abyssal beast with a huge fanged maw ringed by a black halo, obsidian scales and crimson glowing veins, dark red and ember orange` |
| `tyrant-g08` | Polaris, the Frozen Singularity | `a celestial ice guardian holding a frozen black hole between its hands, star-dust cloak, crystal armour, periwinkle blue and white` |
| `tyrant-g09` | Eventide, the Silent Throne | `a fallen archangel seated on a floating throne of dusk, golden broken halo, dark-violet feathered wings, gold and dusk violet` |
| `tyrant-g10` | Aeternus, the Cosmic Crown | `the ultimate cosmic emperor, a crown of floating prism shards and galaxies, armour of every realm fused together, violet, cyan and gold` |

### World Boss (cuối mỗi World, theo họ dẫn đầu của World)

| Tên file | Tên trong game | Mô tả boss |
|---|---|---|
| `warden-rainbow` | Iridessa, Warden of the Prismatic Tide | `a graceful bubble-glass siren with flowing iridescent fins and a pearl crown, pastel pink and cyan` |
| `warden-angel` | Seraphiel, Archangel of the Halo Garden | `a noble armoured archangel with four golden wings and a radiant double halo, ivory and gold` |
| `warden-devil` | Malgorath, Demon Lord of the Furnace | `a hulking demon lord with a forge furnace in his belly, iron horns, chains, black and molten orange` |
| `warden-frost` | Glacia, Queen of the Glacier Choir | `an ice queen with a gown of solid frosted crystal and a snowflake crown, pale cyan and white` |
| `warden-prism` | Prismarch, Archon of Refracted Light | `a faceted crystal archon with a prism head that splits light, floating shard armour, violet and cyan` |
| `warden-nature` | Elder Bloomheart, Keeper of the Ancient Grove | `a gentle giant of living wood and vines with a blooming flower heart, yellow and white flowers, green and brown` *(nền hồng tím)* |
| `warden-shadow` | The Umbral Eye, Watcher of the Eclipse | `a giant floating eye of shadow wrapped in black tendrils, violet iris, pink glowing runes` |
| `warden-cosmic` | Astraeon, Emperor of the Star Forge | `a star-metal emperor mech with a nebula glass cape and a crown of tiny stars, deep blue and gold` |

### Mini Boss (giữa mỗi World)

| Tên file | Tên trong game | Mô tả boss |
|---|---|---|
| `lieutenant-rainbow` | Chroma Knight | `a candy-glass knight with a rainbow lance and a bubble shield, pastel pink and gold` |
| `lieutenant-angel` | Choir Sentinel | `a porcelain sentinel with a golden bell for a head and small light wings, ivory and gold` |
| `lieutenant-devil` | Brimstone Baron | `a stout imp noble in lava-cracked armour with a smoking top hat of obsidian, crimson and orange` |
| `lieutenant-frost` | Frost Oracle | `a hooded ice oracle holding a glowing frost orb, crystal robes, cyan and white` |
| `lieutenant-prism` | Prism Sentinel | `a floating crystal sentinel made of stacked prisms with one lens eye, violet and cyan` |
| `lieutenant-nature` | Thornback | `a thorn-covered beetle guardian with a mossy shell and yellow flowers, green and brown` *(nền hồng tím)* |
| `lieutenant-shadow` | Night Stalker | `a lean shadow hunter with long blade arms and violet glowing eyes` |
| `lieutenant-cosmic` | Forge Golem | `a compact star-metal golem with a glowing reactor chest and gold rivets, deep blue and gold` |

## 7. Kiểm tra sau khi đặt ảnh

- `pnpm sprites:prepare` báo `✓` cho từng ảnh, không có `✗`.
- File nằm trong `src/assets/enemies/` hoặc `src/assets/bosses/`, đúng tên.
- `pnpm build:space`, mở game qua Portal, tải lại trang.
- Code nhận ảnh: `src/enemies/painted-sprites.ts` (không cần sửa). Bảng tên boss: `src/boss/identity.ts`.
