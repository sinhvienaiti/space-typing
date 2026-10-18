# Demo nhân vật có cánh thay cho phi thuyền — 17/10/2026

> **Dành cho:** chủ dự án (xem demo, quyết định hướng đi) và AI làm tiếp (Codex, Claude).
> **Câu hỏi của chủ dự án:** nếu chuyển từ phi thuyền sang một nhân vật có cánh như ảnh tham khảo (rồng hình người: Solar Wyvern, Astral Sentinel, Shadow Abyss, Nature Guardian), để có nhiều dáng bay và nhiều VFX hơn, thì nền tảng web có làm được không?

## 1. Trả lời ngắn

**Làm được trên web.** Game đã dùng three.js (WebGL). Nhân vật có xương (skinned mesh) với nhiều đoạn hoạt ảnh là việc three.js làm tốt. Các game web 3D nhân vật hiện nay cũng chạy theo cách này.

Phần khó **không nằm ở nền tảng**. Phần khó là:

1. **Gắn xương cho cánh.** Meshy/Tripo tự gắn xương tốt cho dáng người (tay, chân, đầu). Cánh thường phải gắn xương thêm trong Blender.
2. **Làm hoạt ảnh đủ đẹp.** Mỗi hành động là một đoạn hoạt ảnh trên xương. AI làm được bằng script Blender, nhưng muốn mượt như phim cần chỉnh tay hoặc dùng nguồn chuyển động có sẵn.
3. **Độ dễ nhìn trong trận.** Phi thuyền có hình dáng gọn. Nhân vật có cánh rộng hơn nhiều, nên phải chỉnh góc máy và cỡ để không che từ và đạn.

## 2. Xem demo

- **Bản Play:** `https://space.typing-game.local/character-demo.html` (sau `pnpm build:space`; nhấn Ctrl+F5 lần đầu).
- **Dev server:** `http://127.0.0.1:3097/character-demo.html`.
  - Khi vừa thêm model mới vào `public/`, phải khởi động lại Vite, vì cấu hình polling bỏ qua thư mục `public/`.
- **Tham số trên URL:**
  - `?quality=medium`: dùng mức Medium;
  - `?camera=side|show|orbit`: chọn góc máy lúc mở;
  - `?auto=0`: tắt tự trình diễn.

**Cách dùng:**

- Trang tự trình diễn đủ các hành động, lặp khoảng 30 giây một vòng. Bấm phím hay nút bất kỳ là chuyển sang điều khiển tay.
- Gõ chữ trên các tinh thể để bắn. Tay trái và tay phải thay nhau ra đòn. Chữ cuối cùng bắn đạn vàng và phá tinh thể.
- Phím `←` `→` hoặc kéo chuột trên màn hình để lượn. Thân nhân vật nghiêng theo hướng bay.
- Giữ `Shift` để tăng tốc. Phím `Enter` tung chiêu.
- Phím số `1`–`9` cho từng hành động, phím `0` bật hoặc tắt tự trình diễn.
- Phím `Tab` đổi góc máy: góc chơi (sau lưng), trưng bày (trước mặt), bên hông, xoay quanh.
- Khung bên phải chọn Medium/High, góc máy và âm thanh. Khung này cũng hiện FPS, số lệnh vẽ, số tam giác và cỡ model.

**Mô hình tạm:** demo mượn khung xương của boss G01 (6 cánh, 64 xương) và đặt tên là "Auriel". Mô hình này **chỉ để thử chuyển động và hiệu ứng**. Nhân vật rồng thật sẽ tạo theo mục 5.

## 3. Demo có gì

| Hành động (theo ảnh tham khảo) | Hoạt ảnh | VFX |
|---|---|---|
| Idle / Hover | `Boss_Idle_Hover` (có sẵn) | Thân nhấp nhô, vệt sáng ở đầu cánh |
| Fly | `Hero_Fly` (mới, 1 giây, 2 lần vỗ cánh) | Thân chúi về trước 24°, nhấp nhô theo nhịp vỗ, 6 vệt sáng đầu cánh, tia lông vũ sáng, sao lướt qua |
| Boost | `Hero_Boost` (mới, cánh xếp về sau) | Chúi 45°, góc nhìn rộng ra, đường tốc độ, vòng sóng, luồng hạt phía sau |
| Attack | `Hero_Attack_L` / `Hero_Attack_R` (mới) | Tay sáng lên, đạn cong có đuôi bay tới mục tiêu, tia lửa và vòng khi trúng |
| Skill cast | `Hero_Cast` (mới) | Vòng phù chú 2 lớp xoay, hạt sáng hút vào, chùm tia lớn, rung màn hình, phá mọi mục tiêu |
| Bùng nổ (thêm) | `Boss_Skill_Prismatic_Burst` (có sẵn) | Tụ sáng ở ngực, 4 vòng sóng nhiều màu, vỏ hạt cầu vồng |
| Hit reaction | `Boss_Hit` | Đạn đỏ bay tới, khiên tổ ong lóe sáng, thân bị đẩy lùi, viền màn hình đỏ |
| Victory | `Hero_Victory` (mới) | Máy quay chuyển ra trước mặt, cột sáng vàng, tia sáng bay lên, vòng vàng |
| Death | `Boss_Death` | Lóe trắng, nổ lớn, thân tan dần thành lông vũ ánh sáng, tự hồi sinh sau 3 giây |
| (Hồi sinh) | `Boss_Intro` | Vòng dịch chuyển, hạt sáng hút vào |

**Cảnh nền:** khoảng 1.800 ngôi sao lướt qua, nhiều hơn khi tăng tốc. Ngoài ra có 8 mảng tinh vân và một hành tinh nhỏ.

**Âm thanh:** dùng lại mẫu âm Duel có sẵn (bắn, trúng, nổ, khóa mục tiêu, gõ sai, tích chiêu, tia, bùng nổ, trúng khiên, tăng tốc, thắng, chết, dịch chuyển). Âm thanh bật sau lần bấm hay gõ đầu tiên, do trình duyệt chặn tự phát.

**Medium và High khác nhau thế nào:**

- **Medium:** GLB Medium (1,9 MB, texture 1K), độ phân giải ×1, không bloom (hiệu ứng tỏa sáng), ít hạt hơn, mỗi bên 2 vệt cánh.
- **High:** GLB High (4,2 MB, texture 2K), độ phân giải tới ×2, có bloom, mỗi bên 3 vệt cánh.

## 4. Số đo

Đo trên máy chủ dự án: Chrome thật, RTX 3050 Ti, 1642×799. Chrome chạy chế độ không giao diện, nên không bị giới hạn 60 khung hình/giây.

| | Medium | High |
|---|---|---|
| Khung hình/giây (không giới hạn) | 210–240 | 186–240 |
| Lệnh vẽ mỗi khung | 16–38 | 31–52 |
| Tam giác mỗi khung | 30–36 nghìn | 30–38 nghìn |
| Cỡ model | 1,9 MB | 4,2 MB |

Đây là máy mạnh. Máy văn phòng hay máy học sinh cần thử riêng trước khi kết luận. Số lệnh vẽ và số tam giác thấp, nên chi phí chính sẽ là bloom và độ phân giải. Cả hai đã giảm ở Medium.

**Ảnh đã tự xem:**

- từng hành động: `.visual/scenarios/char-high-*.jpg`, `char-medium-*.jpg`;
- ảnh gộp: `.visual/scenarios/m-char-high.jpg`, `m-char-medium.jpg`;
- chụp lại: `node scripts/visual/cdp-run.mjs scripts/visual/scenarios/character-demo.mjs` (thêm `Q=medium` cho mức Medium).

## 5. Làm nhân vật thật (khi chủ dự án muốn đi tiếp)

### 5.1 Tạo mô hình trên Meshy / Tripo3D

**Cách nên dùng: Image to 3D.** Cắt ảnh nhìn thẳng từ phía trước của từng nhân vật trong ảnh tham khảo, mỗi nhân vật một ảnh, nền trơn. Nếu công cụ cho thêm ảnh nhiều góc (multiview), thêm cả ảnh nghiêng và ảnh sau lưng.

**Cài đặt khi tạo:**

- **Dáng đứng:** A-pose (tay dang 45°, chân hơi tách), cánh **mở hết, đối xứng**, không cầm vũ khí, không có bệ đứng.
- **Chất lượng:** cao nhất của gói đang dùng, texture PBR 2K, số mặt khoảng 30–60 nghìn (script sẽ giảm xuống).
- **Gắn xương tự động:**
  - nếu công cụ có auto-rig dạng người (humanoid/biped) thì bật, và xuất GLB **có xương**;
  - nếu không có, xuất GLB không xương; AI sẽ gắn xương trong Blender.
- **Xuất file:** GLB.
- **Nơi đặt file:** `art-src/models/raw/heroes/<id>.meshy.glb` (hoặc `.tripo.glb`).

**Prompt (Text to 3D, hoặc kèm ảnh khi làm Image to 3D):**

1. **Solar Wyvern** (`id: solar-wyvern`)
   ```
   Stylized fantasy sci-fi game character, winged dragon-humanoid warrior "Solar Wyvern", athletic armored body with crimson and gold dragon scales, horned dragon head with glowing amber eyes, large membrane wings fully spread with gold-trimmed wing bones, long tail with ember tip, glowing orange energy lines on chest and arms, A-pose, arms out at 45 degrees, legs slightly apart, symmetrical, full body, single character, no base, no weapon, PBR textures
   ```
2. **Astral Sentinel** (`id: astral-sentinel`)
   ```
   Stylized fantasy sci-fi game character, winged dragon-humanoid guardian "Astral Sentinel", sleek silver and deep blue armored scales, crested dragon head with glowing cyan eyes, large wings fully spread made of translucent blue crystal membranes with star-like specks, long tail with crystal tip, glowing cyan lines on chest and arms, A-pose, arms out at 45 degrees, legs slightly apart, symmetrical, full body, single character, no base, no weapon, PBR textures
   ```
3. **Shadow Abyss** (`id: shadow-abyss`)
   ```
   Stylized dark fantasy game character, winged dragon-humanoid "Shadow Abyss", obsidian black and deep purple scales, spiked dragon head with glowing violet eyes, large tattered membrane wings fully spread with violet glowing veins, long bladed tail, glowing violet cracks across chest and arms, A-pose, arms out at 45 degrees, legs slightly apart, symmetrical, full body, single character, no base, no weapon, PBR textures
   ```
4. **Nature Guardian** (`id: nature-guardian`)
   ```
   Stylized fantasy game character, winged dragon-humanoid "Nature Guardian", jade green and bronze scales with leaf-like armor plates, antlered dragon head with glowing emerald eyes, large leaf-veined wings fully spread with emerald glow, long tail with leaf fin, glowing green lines on chest and arms, small vines on shoulders, A-pose, arms out at 45 degrees, legs slightly apart, symmetrical, full body, single character, no base, no weapon, PBR textures
   ```

Mỗi prompt dưới 600 ký tự. Nếu công cụ có ô "negative prompt", thêm: `extra limbs, extra wings, fused wings, weapon, base, text, logo, blurry`.

**Nên làm thử một nhân vật trước** (đề xuất: Solar Wyvern), xử lý trọn quy trình, rồi mới tạo ba nhân vật còn lại.

### 5.2 Blender (AI làm, chạy script không giao diện)

Script `scripts/models/blender/space_typing_model_tools.py` đã có:

- **chuẩn hóa model:** xoay hướng, đưa về giữa, đổi cỡ;
- **giảm tam giác** (`--tris`);
- **tạo vùng phát sáng tự động** (`--auto-emissive`);
- **điểm gắn từ tệp JSON** (`--sockets-json`);
- **hoạt ảnh boss** (`--boss-clips`) và **hoạt ảnh nhân vật** (`--hero-clips`, mới 17/10): `Hero_Fly`, `Hero_Boost`, `Hero_Attack_L/R`, `Hero_Cast`, `Hero_Victory`, dựng trên các nhóm xương thân, đầu, cánh, tay và phần dưới.

**Phải thêm khi làm nhân vật thật:**

1. **Kiểu model mới `heroes`:**
   - thêm vào `KINDS` của `scripts/models/prepare-models.ts`;
   - thêm hợp đồng (số tam giác, texture, socket bắt buộc) trong `src/render3d/model-contracts.ts`.
2. **Gắn xương cánh** khi GLB chưa có xương cánh:
   - mỗi cánh 3–4 xương nối tiếp từ vai ra đầu cánh, thêm chuỗi xương đuôi;
   - gắn trọng lượng tự động (`ARMATURE_AUTO`), rồi kiểm tra bằng ảnh xem trước.
3. **Bảng vai trò xương** dạng JSON (`--roles-json`): chỉ rõ xương nào là thân, đầu, tay trái/phải, cánh trái/phải, đuôi. Hiện hàm `bone_roles` đoán theo vị trí, đủ cho G01 nhưng không chắc đúng với rig mới.
4. **Hoạt ảnh còn thiếu:**
   - `Hero_Idle` riêng (hiện mượn idle của boss);
   - `Hero_Hit`, `Hero_Death`, `Hero_Intro` theo dáng người (hiện mượn bản của boss);
   - lượn trái/phải (`Hero_Bank_L/R`), để trộn với dáng bay.
5. **Điểm gắn:**
   - `FX_CAST_L`, `FX_CAST_R` ở lòng bàn tay;
   - `FX_CORE` ở ngực, `FX_HALO` sau đầu;
   - `FX_WING_L1..3`, `FX_WING_R1..3` ở đầu cánh (demo hiện tự dò xương lá ở xa nhất);
   - `FX_TAIL` ở đầu đuôi;
   - `FX_MOUTH` cho chiêu phun lửa.

**Lệnh mẫu** (sau khi thêm kiểu `heroes`):

```powershell
& 'D:\Blender\blender.exe' -b --factory-startup `
  -P 'D:\typing-game\games\space-typing\scripts\models\blender\space_typing_model_tools.py' -- `
  --input 'D:\typing-game\games\space-typing\art-src\models\raw\heroes\solar-wyvern.meshy.glb' `
  --kind heroes --id solar-wyvern --project 'D:\typing-game\games\space-typing' `
  --tris 30000 --auto-emissive 0.08 --boss-clips --hero-clips `
  --preview 'D:\typing-game\games\space-typing\.visual\models\solar-wyvern'
```

Sau đó, trong WSL: `pnpm models:prepare --only heroes/solar-wyvern`, rồi đổi `MODEL_ID` của demo sang nhân vật mới để xem trước.

### 5.3 Đưa vào game (nếu chủ dự án chọn chuyển hẳn)

Mỗi bước nên làm xong, chụp ảnh và cho chủ dự án duyệt rồi mới làm bước sau.

1. **Lớp vẽ nhân vật trong Campaign/Recall.**
   - Dùng renderer 3D chung, giống `src/render3d/ship-model.ts` đang vẽ Vanguard.
   - Vẽ nhân vật ở chỗ phi thuyền, nhìn từ sau lưng chếch trên.
   - Đạn bắn từ `FX_CAST_L/R`. Vệt cánh lấy từ `FX_WING_*`.
2. **Bộ chọn hoạt ảnh theo sự kiện trận:**
   - gõ đúng → `Attack` (tay luân phiên);
   - kỹ năng → `Cast`;
   - mất máu → `Hit`;
   - qua màn → `Victory`;
   - hết máu → `Death`;
   - lúc bay vào màn → `Intro`;
   - di chuyển ngang → nghiêng thân, trộn với `Bank_L/R`.
   - Dùng lại cách trộn trọng số của `Hero` trong `src/demo/character-demo.ts`.
3. **Chuyển VFX của demo vào game.** Gồm: dải sáng đầu cánh, hạt, đạn cong, vòng phù chú, chùm tia, khiên, cột sáng.
   - Lớp hạt và dải sáng đã viết cho WebGL. Trong game nên vẽ chung lần render với nhân vật để không tốn thêm lần copy.
4. **Hangar:** thêm mục "Heroes" cho 4 nhân vật.
   - Có thể giữ nguyên chỉ số của 11 tàu: mỗi nhân vật dùng chỉ số của một tàu, hoặc thêm kiểu chỉ số riêng.
   - **Giữ mọi `id` cũ.**
5. **Duel:** renderer Duel (`src/duel/ship3d.ts`) cũng cần bản cho nhân vật, gồm góc nhìn mình và góc nhìn đối thủ.
6. **Màn hình chính:** thay tàu trưng bày bằng nhân vật đang chọn, phát hoạt ảnh idle và vỗ cánh.
7. **Hiệu năng:**
   - Nhân vật trong trận chỉ cao khoảng 110–150 px, nên texture 1K là đủ cho Campaign và Duel. Texture 2K chỉ cần cho màn chính và Hangar. Mỗi bộ 4 texture 2K tốn khoảng 85 MB bộ nhớ GPU.
   - Đo A/B giống cách Codex đã đo Vanguard.

**Ước lượng công:** 1 nhân vật đi trọn bước 1–3 mất khoảng 2–4 ngày làm việc của AI, cộng thời gian chủ dự án tạo và duyệt model. Ba nhân vật sau nhanh hơn, vì đã có quy trình và code.

### 5.4 Đề xuất

- **Làm thử một nhân vật** (Solar Wyvern) ở bước 5.1–5.2. Xem trong demo với rig thật **trước khi** quyết định chuyển game.
- **Giữ phi thuyền** cho tới khi nhân vật đạt cả hai tiêu chí: dễ nhìn trong trận và chạy mượt ở Medium.
- **Nếu đạt:** đưa nhân vật vào như một lựa chọn trong Hangar ("Heroes"), chạy song song với tàu. Cách này không phá save cũ hay id cũ, và chủ dự án có thể so sánh trực tiếp khi chơi.

## 6. Tệp của demo

| Tệp | Vai trò |
|---|---|
| `character-demo.html` | Trang demo (đã thêm vào `rollupOptions.input` trong `vite.config.ts`) |
| `src/demo/character-demo.ts` | Toàn bộ cảnh, nhân vật, hoạt ảnh, VFX, âm thanh, điều khiển |
| `src/demo/character-demo.css` | Giao diện Holo Command của demo |
| `art-src/models/bosses/auriel-hero.glb` | Nguồn: G01 + hoạt ảnh nhân vật (Blender, `--hero-clips`) |
| `public/assets/space-typing/models/bosses/auriel-hero/*.glb` | High 4,2 MB, Medium 1,9 MB (có trong manifest; game không dùng) |
| `scripts/models/blender/space_typing_model_tools.py` | Thêm `make_hero_bone_clips` và cờ `--hero-clips` |
| `scripts/visual/scenarios/character-demo.mjs` | Kịch bản chụp từng hành động |

**Trước khi deploy production:** demo là trang thử. Muốn bỏ thì xóa dòng `characterDemo` trong `vite.config.ts` và mục `bosses/auriel-hero` trong manifest. Việc này giúp bản production nhẹ hơn khoảng 6 MB.
