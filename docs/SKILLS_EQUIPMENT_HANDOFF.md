# Bàn giao: kỹ năng và trang bị (tháng 9/2026)

> **Dành cho:** AI lập trình khác (Codex, Claude…) làm tiếp trên `games/space-typing`, và chủ dự án.
>
> **Tóm tắt:** kỹ năng được đặt lại tên cho hợp với phi thuyền, có hiệu ứng lớn riêng cho từng kỹ năng (sóng xung kích, tia sét, tên lửa, cột sáng quỹ đạo, khiên lục giác, hố đen…), thêm 3 hệ thống chiến thuật mới. Trang bị có thêm cấp **Mk.II / Mk.III** với **đặc tính riêng** (perk): drone bay kèm tự bắn, giáp chặn đòn, tên lửa sau chuỗi hạ quái…

## 1. Kỹ năng

### 1.1 Tên mới (mã lưu trong save **không đổi**)

| Mã (id) | Tên cũ | Tên mới |
|---|---|---|
| `barrier` | Barrier | Hex Shield |
| `reflect-field` | Reflect Field | Mirror Field |
| `time-shell` | Time Shell | Stasis Field |
| `emergency-repair` | Emergency Repair | Nanite Repair |
| `guardian-drone` | Guardian Drone | Sentinel Drones |
| `emp-burst` | EMP Burst | EMP Shockwave |
| `chain-lightning` | Chain Lightning | Arc Lance |
| `mark-of-weakness` | Mark of Weakness | Target Lock |
| `sanctuary` | Sanctuary | Fortress Dome |
| `gravity-well` | Gravity Well | Singularity |
| `cleanse` | Cleanse | System Purge |
| `meteor` | Meteor | Orbital Strike |
| `volt-emp-burst` | EMP Burst | Storm Coil |
| `aegis-reflect-field` | Reflect Field | Aegis Mirror |
| `oracle-mark-of-weakness` | Mark of Weakness | Deep Scan |
| Bastion (tuyệt chiêu) | Sanctuary | Citadel Protocol |

Mục "Support Spells" trong giao diện đổi thành **Tactical Systems** (hệ thống chiến thuật). Mỗi hệ thống có mô tả kèm giá Energy, thời gian hồi và số lần mỗi màn.

### 1.2 Ba hệ thống chiến thuật mới (`src/skills/support.ts`)

| Mã | Tên | Tác dụng | Energy / hồi / mỗi màn |
|---|---|---|---|
| `missile-swarm` | Missile Swarm | 8 tên lửa nhỏ từ hai cánh, tỏa ra rồi lượn vào tối đa 6 quái; mỗi quái mất 1 lớp khiên hoặc 2 chữ, boss mất 5% máu. **Sát thương rơi khi tên lửa tới nơi** (hàng chờ `pendingStrikes`). | 40 / 18 s / 2 |
| `railgun` | Railgun | Một phát xuyên cả làn của mục tiêu; mọi quái trong làn (rộng ±46 px) mất 1 lớp khiên hoặc 3 chữ, boss trong làn mất 6% máu. | 36 / 16 s / 2 |
| `tractor-beam` | Tractor Beam | Kéo quái gần nhất ngược lên (22% chiều cao trong 0,8 s), giữ chậm còn 45% trong 4 s, vũ khí của nó ngừng 2 s. | 24 / 12 s / 3 |

- Kỹ năng không bao giờ gõ hộ chữ cuối: `strikeTypingAdvance()` luôn để người chơi tự hoàn thành từ.
- Save cũ tự được mở 3 hệ thống này (`LATER_TACTICAL_SYSTEM_IDS` trong `sanitizeSupportSpellState`).
- **Không thêm mã kỹ năng lõi mới** (`UPGRADEABLE_SKILL_IDS`): kiểm tra save/backup đòi đúng số lượng. Kỹ năng mới luôn đi vào nhóm chiến thuật (`SUPPORT_SPELL_IDS`), nhóm này chấp nhận tập con.

### 1.3 Hiệu ứng kỹ năng (`src/vfx/skill-fx.ts`)

`Game` có một `SkillFxSystem` (`this.skillFx`). Các lớp vẽ trong `Game.draw()`:

| Lớp | Hàm | Vẽ gì |
|---|---|---|
| Dưới quái | `drawPersistentUnder` | hố đen Singularity, hào quang Overdrive |
| Trên quái | `draw` | sóng xung kích, tia sét, cột sáng quỹ đạo, railgun, tên lửa + khói, tia kéo, nanite, vòng xung, mưa sao, nhát chém, vầng hào quang, tia drone, nổ |
| Trên tàu | `drawPersistentOver` | khiên lục giác, mảnh gương, drone Sentinel, khung ngắm Target Lock, tàng hình, drone trang bị, giáp ablative, vòng Phase Shift, lớp màu Stasis |
| Trên cùng | `drawScreen` | chớp sáng toàn màn hình, vệt quét System Purge, mưa vàng |

Hiệu ứng kéo dài (khiên, hố đen, drone…) **không lưu trạng thái riêng**: `Game.persistentFxState()` đọc thẳng từ các bộ đếm thời gian có sẵn (`barrierTimer`, `gravityWellTimer`, `guardianBlocks`…). Muốn thêm hiệu ứng kéo dài: thêm trường vào `PersistentFxState` và vẽ theo trường đó.

Mỗi tuyệt chiêu Rage có dấu ấn riêng trong `Game.playUltimateFx()` (Vanguard sóng sét, Arsenal mưa tên lửa, Reaper chém đỏ + xích sét, Celestial mưa sao…).

**Quy tắc hiệu năng (bắt buộc giữ):**
- Không dùng `shadowBlur`. Ánh sáng dùng sprite gradient vẽ sẵn một lần (`glowSprite`, `beamSprite`, `smokeSprite`) rồi `drawImage`. (Báo cáo `docs/PERFORMANCE_ROOT_CAUSE_REVIEW_2026-09-29.md` cho thấy `shadowBlur` là nguyên nhân giật chính.)
- Giới hạn cứng: tối đa 96 hiệu ứng, 260 hạt khói; hiệu ứng cũ nhất bị bỏ khi đầy.
- Chất lượng `low` bỏ bớt hạt (tham số `fine`).
- Đo thực tế (Chrome không giao diện, tung tên lửa + hố đen + khiên + tuyệt chiêu cùng lúc với 12 quái): lớp hiệu ứng tốn **khoảng 1,1 ms mỗi khung hình**; tốc độ khung hình có và không có hiệu ứng như nhau.

## 2. Trang bị

### 2.1 Ba cấp

| Cấp | Số món | Khác biệt |
|---|---|---|
| Mk.I | 21 (có từ trước) | chỉ có chỉ số |
| Mk.II | 14 (2 món mỗi ô) | chỉ số ~1,4× + **1 đặc tính** |
| Mk.III | 7 (1 món mỗi ô) | chỉ số ~1,8× + **1 đặc tính mạnh** |

Danh sách ở `src/equipment/registry.ts` (trường `tier`, `perk`). Mã mới được thêm **sau** các mã Mk.I; save cũ vẫn hợp lệ.

### 2.2 Đặc tính (`src/equipment/perks.ts`)

| Ô | Món | Đặc tính |
|---|---|---|
| weapon | Arc Projector Mk.II | cứ 3 lần hạ quái, sét nhảy sang quái gần nhất (−1 chữ) |
| weapon | Rail Driver Mk.II | phát hạ quái xuyên tiếp sang quái phía sau cùng làn (−1 chữ) |
| weapon | Plasma Lance Mk.III | cứ 4 lần hạ quái bằng từ hoàn hảo: nổ plasma bán kính 170 px |
| armor | Ablative Plating Mk.II | chặn trọn đòn đầu tiên mỗi màn |
| armor | Reactive Armor Mk.II | khi trúng đòn: xung phá mọi đạn địch trong 240 px |
| armor | Nanoweave Hull Mk.III | tự sửa 0,6 Hull/giây sau 4 s không bị đánh |
| shield | Discharge Shield Mk.II | khi Shield vỡ: EMP làm vũ khí địch ngừng 2,5 s |
| shield | Harmonic Shield Mk.II | mỗi từ hoàn hảo hồi 3 Shield |
| shield | Phase Shield Mk.III | cứ 18 s, đòn kế tiếp xuyên qua tàu vô hại |
| reactor | Efficient Reactor Mk.II | mọi kỹ năng rẻ hơn 15% Energy |
| reactor | Siphon Reactor Mk.II | mỗi lần hạ quái hồi 3 Energy |
| reactor | Cryo Reactor Mk.III | thời gian hồi kỹ năng chạy nhanh hơn 18% |
| utility | Hunter-Killer Pod Mk.II | cứ 5 lần hạ quái: 2 tên lửa nhỏ vào 2 quái gần nhất (−1 chữ) |
| utility | Threat Scanner Mk.II | đạn địch bay chậm hơn 15% |
| utility | Overcharge Module Mk.III | Rage tăng nhanh hơn 20% |
| drone | Escort Drone Mk.II | 1 drone bay cạnh cánh, 7 s bắn 1 chữ khỏi quái gần nhất |
| drone | Interceptor Drone Mk.II | 5 s bắn hạ 1 viên đạn địch gần nhất |
| drone | Wing Drones Mk.III | 2 drone hộ tống, mỗi chiếc 6 s bắn 1 lần (thay phiên) |
| core | Ignition Core Mk.II | vào màn đã có 25 Rage |
| core | Momentum Core Mk.II | chuỗi ≥ 15: boss nhận thêm 12% sát thương |
| core | Quantum Core Mk.III | cứ 8 từ hoàn hảo: mọi kỹ năng giảm 3 s hồi |

Luồng dữ liệu: `main.ts applyEquipmentStats()` → `equippedPerkIds(equipment)` → `resolveEquipmentPerks()` → `game.setEquipmentPerks()`. Game chỉ đọc bảng số đã gộp (`EquipmentPerkEffects`), nên thêm đặc tính mới = thêm 1 mục vào `perks.ts` + chỗ dùng trong `Game`.

Thử nhanh: **Developer Test Lab** → Equipment → *Grant + Equip* một món Mk.II/Mk.III → *Start / Restart Arena* (đặc tính theo màn như giáp ablative, Rage đầu màn áp dụng khi bắt đầu lại).

Hiệu ứng khi hạ quái (sét, xuyên, plasma, tên lửa) **nổ đúng lúc đạn chạm quái**: `queuePerkKill()` quyết định lúc hạ, `releasePerkKill()` chạy trong nhánh `enemy-kill` của `applyShotImpact()`.

### 2.3 Rơi đồ và cửa hàng

- `EQUIPMENT_TIER_WEIGHTS` (`src/loot/equipment-loot.ts`): quái thường 85/15/0 (Mk.I/II/III), tinh anh 55/40/5, boss 15/50/35, rương báu 20/55/25, dị thường 10/50/40. Cấp độ hiếm (nhôm → kim cương) vẫn tính riêng như cũ.
- Cửa hàng: Mk.III chỉ có ở cửa hàng ẩn và chợ đen; Mk.II giá ×1,5, Mk.III ×2,2.

### 2.4 Giao diện

- Thẻ trang bị hiện cấp, chỉ số dễ đọc và dòng **★ đặc tính** màu vàng.
- Chỉ số `ward` hiện là **Hardening** (chống hiệu ứng xấu); "Ward Drone" đổi tên hiển thị thành "ECM Drone" (ECM: thiết bị gây nhiễu điện tử). Mã lưu không đổi.

## 3. Ảnh vẽ tay cho biểu tượng

- Danh sách ảnh cần làm, lời nhắc, thư mục và tên file: `docs/art-requests/SKILLS_EQUIPMENT_ICONS.md` (26 kỹ năng, 42 trang bị, làm thử 3 ảnh trước).
- Game tự nhận: `src/ui/painted-icons.ts` gom mọi `src/assets/icons/{skills,equipment}/<id>.webp` lúc build. Chưa có file thì hiện ký hiệu cũ. Không cần sửa code khi thêm ảnh.

## 4. Kiểm tra

- Kiểm thử: `tests/tactical-systems.test.ts`, `tests/equipment-perks.test.ts`, `tests/support-loadout.test.ts`, `tests/loot.test.ts`.
- Chụp hiệu ứng trong trận (máy chủ dev, xem `docs/VISUAL_TESTING.md`):

  ```bash
  pnpm -s visual:shot "http://127.0.0.1:3098/#fx=railgun&at=110" .visual/fx-railgun.png \
    --click=#startButton --wait=3000 --dpr=1 --eval-file=scripts/visual/evals/skill-fx.js
  ```

  `fx=` nhận mã kỹ năng hoặc `ultimate` (kèm `&ship=<mã tàu>`); `at=` là số mili giây chờ để chụp đúng đỉnh hiệu ứng; `&hit=1` bắn thử một đòn vào tàu. Đoạn đo dùng `window.__spaceTypingGame` (chỉ có ở máy chủ dev).

## 5. Các file chính

`src/vfx/skill-fx.ts`, `src/Game.ts` (khối "Skill signatures" và "Equipment perks"), `src/skills/{support,support-loadout,offensive,defensive,engine}.ts`, `src/equipment/{perks,registry,loadout,stat-labels,affixes}.ts`, `src/loot/equipment-loot.ts`, `src/shops/state.ts`, `src/ui/painted-icons.ts`, `src/main.ts` (thanh kỹ năng, bảng trang bị, Tactical Systems), `index.html`, `src/styles.css`, `scripts/visual/evals/skill-fx.js`.
