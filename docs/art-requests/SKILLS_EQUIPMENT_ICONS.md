# Yêu cầu ảnh: biểu tượng kỹ năng và trang bị

> **Dành cho:** chủ dự án và AI tạo ảnh (Gemini, ChatGPT Images…) được giao làm ảnh.
>
> **Mục đích:** thay các ký hiệu chữ (◈, ϟ, ⌖…) trên thanh kỹ năng và bảng trang bị bằng biểu tượng vẽ tay.
> Không cần sửa code: game tự nhận file đặt đúng thư mục, đúng tên ở lần build sau.
> Món nào chưa có ảnh thì vẫn hiện ký hiệu cũ, không lỗi.

## 1. Cách làm (cho AI tạo ảnh)

1. Tạo ảnh vuông **1024×1024** theo lời nhắc (prompt) ở mục 3–5. Mỗi lời nhắc = **phần chung** (mục 2) + **phần riêng** của món đó.
2. Lưu ảnh gốc (PNG hoặc JPG) vào `games/space-typing/art-src/icons/<loại>/<tên>.png`. Thư mục này chỉ để lưu trữ, game không đọc.
3. Chuyển sang file game dùng, **WebP 256×256**, đặt ở `games/space-typing/src/assets/icons/<loại>/<tên>.webp`.
   Chạy trong thư mục `games/space-typing` (công cụ `sharp` đã có sẵn trong dự án):

   ```bash
   node -e "require('sharp')(process.argv[1]).resize(256,256).webp({quality:88}).toFile(process.argv[2]).then(()=>console.log('ok'))" \
     art-src/icons/skills/railgun.png src/assets/icons/skills/railgun.webp
   ```

4. Build lại để thấy trong game: `pnpm build:space` (ở thư mục gốc `typing-game`), rồi tải lại trang.

**Quy tắc đặt tên (bắt buộc đúng từng ký tự):**

| Loại | Thư mục game dùng | Tên file |
|---|---|---|
| Kỹ năng | `src/assets/icons/skills/` | mã kỹ năng ở cột "Tên file" bên dưới + `.webp` |
| Trang bị | `src/assets/icons/equipment/` | mã trang bị ở cột "Tên file" bên dưới + `.webp` |

- Chỉ dùng chữ thường, số và dấu gạch ngang, đuôi `.webp`. Sai một ký tự là game không nhận.
- Nền đã vẽ sẵn trong ảnh (màu tối), **không cần nền trong suốt**, không cần tách nền.
- Không có chữ, số, khung viền hay chữ ký trong ảnh (khung màu theo độ hiếm do game tự vẽ).

## 2. Phần chung (dán trước mọi lời nhắc)

```
Square game UI icon, 1:1, painterly sci-fi game art in the style of a premium space shooter,
one single subject centred and filling about 70% of the frame, bold clean silhouette that stays
readable at 32 px, dramatic rim light, glowing energy accents in the colour given below,
deep navy-black background (#0a0f1e) with a soft radial glow behind the subject,
no text, no letters, no numbers, no frame, no border, no watermark, no UI elements.
```

Gợi ý cho trang bị theo cấp (để cả bộ nhìn đồng bộ):
- **Mk.I**: thép chải, đơn giản, ít chi tiết phát sáng.
- **Mk.II**: chế tác tinh hơn, có đường năng lượng màu chạy dọc.
- **Mk.III**: cao cấp, lõi phát sáng mạnh, viền kim loại quý, hạt sáng bay quanh.

## 3. Làm thử trước (3 ảnh)

Làm 3 ảnh này trước để chủ dự án duyệt phong cách, rồi mới làm phần còn lại:

| Tên file | Thư mục | Phần riêng của lời nhắc |
|---|---|---|
| `railgun` | `skills` | `a hyper-velocity railgun slug tearing along a straight ice-blue beam, shock rings along the beam, accent colour ice blue #8fe8ff` |
| `arc-projector-mk2` | `equipment` | `Mk.II fork-tipped arc projector weapon crackling with lightning between its prongs, accent colour electric blue with violet sparks` |
| `escort-drone-mk2` | `equipment` | `Mk.II sleek arrowhead escort drone with twin cyan engines, flying nose up, accent colour cyan #8fe8ff` |

## 4. Kỹ năng (26 ảnh) — thư mục `skills`

### Kỹ năng cơ bản

| Tên file | Tên trong game | Phần riêng của lời nhắc |
|---|---|---|
| `barrier` | Hex Shield | `a hexagonal energy shield dome made of glowing hex cells, accent colour cyan #5ce1ff` |
| `reflect-field` | Mirror Field | `floating mirrored crystal shards deflecting an incoming bolt, accent colour violet #d98bff` |
| `time-shell` | Stasis Field | `a stasis sphere with clock-like rings freezing bullets in mid-air, accent colour indigo #9d8bff` |
| `emergency-repair` | Nanite Repair | `a swarm of tiny nanites welding a cracked hull plate, accent colour mint green #6dffb0` |
| `guardian-drone` | Sentinel Drones | `three small golden sentinel drones orbiting in a ring, accent colour gold #ffd76a` |
| `emp-burst` | EMP Shockwave | `an expanding electric shockwave ring with lightning crackling on it, accent colour electric blue #7fdcff` |
| `chain-lightning` | Arc Lance | `a lightning bolt jumping between three targets in a chain, accent colour pale blue #9ab8ff` |
| `mark-of-weakness` | Target Lock | `a red targeting reticle with brackets locking onto a dark alien silhouette, accent colour red #ff5a6e` |

### Hệ thống chiến thuật

| Tên file | Tên trong game | Phần riêng của lời nhắc |
|---|---|---|
| `sanctuary` | Fortress Dome | `a golden fortress dome with light rays over a small starfighter, accent colour warm gold #ffcf6a` |
| `gravity-well` | Singularity | `a micro black hole with a spinning purple accretion disk pulling in debris, accent colour purple #b36bff` |
| `cleanse` | System Purge | `a bright scanning line sweeping over a circuit-board surface, wiping red glitches away, accent colour mint #9fffe0` |
| `meteor` | Orbital Strike | `three beams of light lancing down from orbit onto target circles, accent colour warm gold #ffe2a0` |
| `missile-swarm` | Missile Swarm | `a volley of eight micro-missiles fanning out with curved smoke trails, accent colour orange #ff9a4a` |
| `railgun` | Railgun | *(xem mục 3)* |
| `tractor-beam` | Tractor Beam | `a green cone tractor beam with rings hauling a spiky alien craft, accent colour green #7dff9e` |

### Kỹ năng riêng của phi thuyền

| Tên file | Tên trong game | Phần riêng của lời nhắc |
|---|---|---|
| `vanguard-barrier-pulse` | Barrier Pulse | `a cyan shield pulse bursting outward from a sleek starfighter, accent colour cyan #5ce1ff` |
| `aegis-reflect-field` | Aegis Mirror | `an ornate golden mirror shield reflecting violet light, accent colour violet and gold` |
| `volt-emp-burst` | Storm Coil | `a tesla storm coil crackling with electric arcs, accent colour electric blue #7fdcff` |
| `wraith-phase-cloak` | Phase Cloak | `a dark starfighter silhouette dissolving into violet phase shimmer, solid opaque shapes, accent colour violet #b98cff` |
| `fortune-lucky-star` | Lucky Star | `a radiant golden star with sparkles and small gold coins, accent colour gold #ffd65a` |
| `arsenal-weapon-overclock` | Weapon Overclock | `a cluster of red-hot gun barrels with heat shimmer and orange glow, accent colour orange #ff8a3d` |
| `oracle-mark-of-weakness` | Deep Scan | `an eye-shaped scanner lens projecting pink scan lines, accent colour pink #ff6b9a` |
| `bastion-guardian-matrix` | Guardian Matrix | `a hexagonal matrix of small golden drones linked by light, accent colour gold #ffd76a` |
| `reaper-execute` | Execute | `a crimson energy scythe slash cutting through the dark, accent colour crimson #ff4d6d` |
| `celestial-stance` | Celestial Stance | `a halo of constellation stars around a white crystal, accent colour starlight #cfe0ff` |
| `zenith-shift` | Zenith Shift | `a white-cyan prism gate splitting light into beams, accent colour white and cyan #8ff4ff` |

## 5. Trang bị (42 ảnh) — thư mục `equipment`

| Tên file | Tên trong game | Phần riêng của lời nhắc |
|---|---|---|
| `pulse-laser-mk1` | Pulse Laser Mk.I | `Mk.I compact twin-barrel pulse laser cannon, cyan muzzle glow` |
| `precision-laser-mk1` | Precision Laser Mk.I | `Mk.I long slim precision laser with scope rings, green-cyan glow` |
| `ion-cannon-mk1` | Ion Cannon Mk.I | `Mk.I heavy ion cannon with glowing blue coils along the barrel` |
| `arc-projector-mk2` | Arc Projector Mk.II | *(xem mục 3)* |
| `rail-driver-mk2` | Rail Driver Mk.II | `Mk.II long magnetic rail cannon with two parallel rails and a glowing slug between them, ice blue` |
| `plasma-lance-mk3` | Plasma Lance Mk.III | `Mk.III ornate plasma lance with a magenta-white plasma core and heat vents, premium` |
| `plated-armor-mk1` | Plated Armor Mk.I | `Mk.I layered riveted steel armour plates` |
| `adaptive-armor-mk1` | Adaptive Armor Mk.I | `Mk.I segmented armour plate with shifting panels and teal seams` |
| `kinetic-shell-mk1` | Kinetic Shell Mk.I | `Mk.I thick rounded kinetic hull shell section, dark grey, lightly dented` |
| `ablative-plating-mk2` | Ablative Plating Mk.II | `Mk.II sacrificial ablative armour tiles with orange-hot scorched edges, one tile flaking off` |
| `reactive-armor-mk2` | Reactive Armor Mk.II | `Mk.II explosive-reactive armour blocks with small glowing amber charges` |
| `nanoweave-hull-mk3` | Nanoweave Hull Mk.III | `Mk.III hull lattice woven from glowing green nanite threads, premium` |
| `deflector-shield-mk1` | Deflector Shield Mk.I | `Mk.I round shield emitter projecting a cyan energy disc` |
| `prism-shield-mk1` | Prism Shield Mk.I | `Mk.I prism crystal emitter splitting light into a shield` |
| `capacitor-shield-mk1` | Capacitor Shield Mk.I | `Mk.I cylindrical capacitor bank with a hexagonal shield glow` |
| `discharge-shield-mk2` | Discharge Shield Mk.II | `Mk.II shield generator crackling with stored electricity, blue-white arcs` |
| `harmonic-shield-mk2` | Harmonic Shield Mk.II | `Mk.II tuning-fork shaped shield emitter with concentric cyan wave rings` |
| `phase-shield-mk3` | Phase Shield Mk.III | `Mk.III phase shield emitter with a shimmering violet rift in front of it, premium` |
| `compact-reactor-mk1` | Compact Reactor Mk.I | `Mk.I small cylindrical ship reactor with a yellow glowing core` |
| `overclock-reactor-mk1` | Overclock Reactor Mk.I | `Mk.I reactor with red-hot overclocked coils and heat sinks` |
| `fusion-reactor-mk1` | Fusion Reactor Mk.I | `Mk.I spherical fusion reactor with a white-gold core inside a torus` |
| `efficient-reactor-mk2` | Efficient Reactor Mk.II | `Mk.II sleek reactor with clean blue energy lines and cooling fins` |
| `siphon-reactor-mk2` | Siphon Reactor Mk.II | `Mk.II reactor with siphon tubes drawing glowing scrap particles in, teal` |
| `cryo-reactor-mk3` | Cryo Reactor Mk.III | `Mk.III frost-covered reactor with an icy blue core and ice crystals, premium` |
| `targeting-module-mk1` | Targeting Module Mk.I | `Mk.I targeting module with a lens and a red reticle` |
| `salvage-module-mk1` | Salvage Module Mk.I | `Mk.I mechanical salvage claw module` |
| `fortune-module-mk1` | Fortune Module Mk.I | `Mk.I ship module with a golden four-leaf circuit pattern` |
| `hunter-killer-pod-mk2` | Hunter-Killer Pod Mk.II | `Mk.II wing pod with a rack of micro-missiles with orange tips` |
| `threat-scanner-mk2` | Threat Scanner Mk.II | `Mk.II radar dish scanner with a sweeping green scan and jamming waves` |
| `overcharge-module-mk3` | Overcharge Module Mk.III | `Mk.III module with a crimson capacitor overflowing with energy, premium` |
| `support-drone-mk1` | Support Drone Mk.I | `Mk.I small round support drone with a green repair light` |
| `assault-drone-mk1` | Assault Drone Mk.I | `Mk.I small aggressive drone with twin guns and red lights` |
| `ward-drone-mk1` | ECM Drone Mk.I | `Mk.I drone with an antenna array emitting purple jamming waves` |
| `escort-drone-mk2` | Escort Drone Mk.II | *(xem mục 3)* |
| `interceptor-drone-mk2` | Interceptor Drone Mk.II | `Mk.II point-defence drone with a small turret and amber lights` |
| `wing-drones-mk3` | Wing Drones Mk.III | `Mk.III pair of elegant white escort drones flying in formation, cyan engines, premium` |
| `overdrive-core-mk1` | Overdrive Core Mk.I | `Mk.I glowing hexagonal core crystal, orange` |
| `salvage-core-mk1` | Salvage Core Mk.I | `Mk.I ship core assembled from salvaged brass parts` |
| `balanced-core-mk1` | Balanced Core Mk.I | `Mk.I round core with two-tone swirling energy, blue and gold` |
| `ignition-core-mk2` | Ignition Core Mk.II | `Mk.II ship core with a fiery orange ignition chamber` |
| `momentum-core-mk2` | Momentum Core Mk.II | `Mk.II ship core with spinning flywheel rings and motion streaks` |
| `quantum-core-mk3` | Quantum Core Mk.III | `Mk.III quantum core with floating fragments around a white-violet singularity, premium` |

## 6. Kiểm tra sau khi đặt ảnh

- Tên file khớp đúng bảng, nằm trong `src/assets/icons/skills/` hoặc `src/assets/icons/equipment/`.
- Chạy `pnpm build:space`, mở game qua Portal, tải lại trang:
  - thanh kỹ năng (phím 1–9) hiện ảnh thay cho ký hiệu;
  - mục **Equipment** hiện ảnh cho món đang lắp.
- Code nhận ảnh: `src/ui/painted-icons.ts` (không cần sửa).
