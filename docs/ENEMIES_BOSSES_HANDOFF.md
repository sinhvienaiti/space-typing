# Bàn giao: quái vật và boss (tháng 9/2026)

> **Dành cho:** AI lập trình khác (Codex, Claude…) làm tiếp trên `games/space-typing`, và chủ dự án.
>
> **Tóm tắt:** vẽ quái nhanh hơn khoảng 4,5 lần (bỏ `shadowBlur`). Mỗi họ quái có chất liệu, tiếng, kiểu nổ và kiểu đạn riêng. Mỗi loại quái có chuyển động riêng. Hành động của quái có hiệu ứng dễ hiểu. Boss có tên, danh hiệu, bảng tên xuất hiện, hào quang, vòng ấn ký, kiểu bắn, tiếng gầm, màn đổi pha và màn nổ riêng. Game đã sẵn chỗ nhận ảnh vẽ tay cho quái và boss.

## 1. Hiệu năng: không dùng `shadowBlur` khi vẽ quái

Nguyên nhân giật đã được đo trong `docs/PERFORMANCE_ROOT_CAUSE_REVIEW_2026-09-29.md`: bóng mờ được tính lại cho từng nét vẽ của từng quái ở mọi khung hình.

- `src/vfx/light-sprites.ts`: ảnh sáng vẽ sẵn một lần cho mỗi màu (`drawGlow`, `drawRingGlow`).
- `Game.drawEnemy()`: vòng hào quang cấp bậc và quầng sáng thân dùng ảnh sáng này. Khung ngắm, đạn chữ của quái cũng vậy.
- `src/enemies/renderer.ts`: `drawModularEnemy()` đặt `shadowBlur = 0` trước khi vẽ cánh, quỹ đạo và đầu (trước đây các phần này thừa hưởng bóng mờ 14–25 px của hàm gọi). Vòng hào quang và vầng đầu vẽ bằng nét kép (nét rộng mờ + nét mảnh sáng).
- Đo trong Chrome không giao diện, DPR 2, 8 quái cố định (`scripts/visual/evals/enemy-perf.js`): **12,9 → 58,3 khung hình/giây**, p95 76,5 → 19,4 ms. Hình gần như giữ nguyên. Sau khi thêm mọi hiệu ứng mới: 57 khung hình/giây với 8 quái, 60 khung hình/giây khi đánh boss.

**Quy tắc:** không thêm `shadowBlur` vào đường vẽ chạy mỗi khung hình. Cần quầng sáng thì dùng `drawGlow` / `drawRingGlow`.

## 2. Bản sắc quái (`src/enemies/identity.ts`)

**Họ** = quái đến từ đâu (theo bối cảnh World). **Loại** = quái làm gì trong trận.

| Họ | Chất liệu (tiếng và tia khi trúng) | Kiểu nổ khi chết | Đạn |
|---|---|---|---|
| rainbow | bubble — tiếng bong bóng | bong bóng nhiều màu | bong bóng |
| angel | bell — tiếng chuông | lông vũ sáng | lông vũ |
| devil | ember — tiếng lửa nổ lách tách | than hồng + khói | quả cầu lửa có đuôi |
| frost | ice — tiếng băng nứt | mảnh băng | mảnh băng |
| prism | crystal — tiếng pha lê | mảnh lăng kính cầu vồng | lăng kính xoay |
| nature | wood — tiếng gỗ gõ | lá bay | hạt giống |
| shadow | void — tiếng trầm hư không | mực đen tan ra | cầu hư không |
| cosmic | metal — tiếng kim loại ngân | sao lấp lánh | ngôi sao xoay |

**Chuyển động theo loại** (`kindMotionPose`): scout lượn nghiêng, mine lắc nhẹ, tank lắc nặng, destroyer lao tới từng nhịp, oppressor lơ lửng, carrier trôi chậm, jammer rung giật, cloaker mờ tỏ, healer nhún, splitter co giãn như thạch, sniper đứng yên, leech ngoe nguẩy, commander uy nghi. **Chỉ là hình vẽ**: vị trí thật, chữ và vùng trúng đạn không đổi, nên lối chơi không đổi.

**Hiệu ứng hành động** (`Game.enemyCastFx`, `drawSkillCharge`):
- lúc tụ lực: vòng màu theo loại chiêu (tấn công đỏ cam ở nòng, phòng thủ xanh ngọc, khống chế tím có vòng rune xoay, hỗ trợ xanh lá);
- lúc ra chiêu: nháy ở nòng khi bắn; tia xanh từ healer sang đồng đội được hồi; dây tím hút Rage từ tàu về leech; tia vàng từ commander tới từng đồng đội; tia màu trạng thái (đóng băng, câm lặng, nguyền…) từ quái tới tàu; ánh sáng cửa hầm khi carrier thả scout.

**Đạn của quái** mang họ của người bắn (trường `family` của `EnemyProjectile`, vẽ bằng `drawEnemyShot`). Quầng đỏ cảnh báo quanh đạn vẫn giữ để luôn dễ thấy.

## 3. Âm thanh (`src/audio/Sfx.ts`)

- `enemyHit(material, weight, pan)`: lớp chất liệu phát chồng lên tiếng đạn của phi thuyền (`boltImpact`, do AI kia làm). `weight` lấy từ loại quái (tank nặng và trầm hơn scout).
- `layerBreak(material)`: khi quái mất một lớp khiên.
- `kill(pitch, material, weight, pan)`: có chất liệu thì phát tiếng vỡ theo chất liệu (`enemyDeath`). Không có thì phát tiếng cũ.
- `bossImpact(material, voice)`, `bossRoar(voice, material)`: tiếng trúng đòn và tiếng gầm theo "giọng" riêng của từng boss.
- Mức âm (đo bằng `scripts/visual/evals/sfx-levels.js`): lớp chất liệu nhỏ hơn tiếng đạn 2–6 dB (bảng hệ số `MATERIAL_HIT_TRIM` / `MATERIAL_DEATH_TRIM`). Tổng tiếng trúng chỉ to hơn trước 1–2 dB (đỉnh −19,6 đến −22,7 dBFS). Tiếng hạ quái khoảng −19 dBFS, ngang tiếng bắn chặn đạn.
- Giới hạn dồn tiếng: trúng ≥ 30 ms một lần, chết ≥ 45 ms, boss ≥ 45 ms.

## 4. Boss có thương hiệu (`src/boss/identity.ts`)

| Nhóm | Số lượng | Gặp ở đâu |
|---|---|---|
| Galaxy Tyrant | 10, mỗi Galaxy một con | màn 100 của mỗi Galaxy |
| World Boss (Warden) | 8, theo họ dẫn đầu của World | màn 20 của mỗi World |
| Mini Boss (Lieutenant) | 8, theo họ dẫn đầu của World | màn 10 của mỗi World |

Mỗi boss có tên, danh hiệu, hai màu, kiểu hào quang (tia sáng, than hồng, tuyết, cánh hoa, xúc tu hư không, bụi sao, mảnh pha lê, bong bóng, tia sét), kiểu bắn theo pha và "giọng" (cao độ). Ví dụ: *Auriel, the Rainbow Sovereign* (G01), *Vorgrath, Crown of Cinders* (G02), *Aeternus, the Cosmic Crown* (G10).

- **Tên** hiện trên thanh máu (`boss.name`), kèm nhãn ASC (Ascension, mức khó thêm) nếu có.
- **Xuất hiện** (`presentBossEntrance`): cột sáng, sóng xung kích, bảng tên giữa màn hình (nhóm / tên / danh hiệu), tiếng gầm, rung màn hình.
- **Luôn có**: quầng tối mềm phía sau (để ánh sáng nổi trên nền sáng như dung nham), hào quang riêng, vòng ấn ký xoay 2 lớp có rune.
- **Kiểu bắn** (`bossShotGeometry`): aimed, fan (quạt rộng), twin (hai tay bắn chéo), ring (vòng quanh boss), rain (rơi từ trên xuống), stream (một hàng tốc độ tăng dần). **Số viên đạn giữ nguyên như cũ**, chỉ đổi nơi xuất phát và hướng, nên độ khó gần như không đổi.
- **Đổi pha**: chớp sáng, vòng sóng, mảnh sáng tung ra, tiếng gầm cao hơn.
- **Tử trận**: chuỗi 6 vụ nổ trên thân boss rồi một vụ nổ lớn cuối, cộng kiểu nổ của họ và tiếng vỡ nặng.
- Mọi hiệu ứng nằm trong `src/vfx/combat-fx.ts` (`CombatFxSystem`, tối đa 360 hạt và 48 vòng; `drawBossAura`; `drawEnemyShot`).

### 4.1 Trùm Depth View và kỹ năng có phản đòn (04/10/2026)

Ở chế độ chiến dịch, trùm nằm xa cuối hành lang như đối thủ PvP, dựng thành khối 3D từ ảnh vẽ. Trùm có thêm kỹ năng Lance, Quake, Rush, Siphon và tuyệt chiêu Cataclysm. Mỗi kỹ năng có chữ phản đòn để gõ trong lúc trùm tích chiêu. Kiểu bắn ở trên vẫn là kỹ năng Glyph Volley. Chế độ Recall giữ nguyên cách cũ. Chi tiết: `docs/BOSS_DEPTH_VIEW_HANDOFF_2026-10-04.md`.

## 5. Ảnh vẽ tay cho quái và boss

- Danh sách ảnh, lời nhắc, tên file: `docs/art-requests/ENEMIES_BOSSES.md`. Làm thử trước 3 quái + 1 boss.
- Xử lý ảnh: `pnpm sprites:prepare` (`scripts/bg-art/prepare-sprites.mjs`). Từ **một ảnh nguồn 1024×1024**, lệnh tự xoá watermark của Gemini, tách nền phẳng xanh `#00FF00` (hoặc hồng tím `#FF00FF` cho họ nature), khử viền, cắt sát rồi xuất:
  - quái: 256 px chuẩn + 512 px `@2x`;
  - boss: 640 px chuẩn + 1024 px `@2x`.
- Game tự nhận (`src/enemies/painted-sprites.ts`):
  - quái chuẩn: `src/assets/enemies/<họ>-<loại>.webp`, fallback chung `<loại>.webp`;
  - quái chi tiết: cùng tên nhưng thêm `@2x`;
  - boss chuẩn/chi tiết: `<mã boss>.webp` và `<mã boss>@2x.webp`.
  Low/Medium ưu tiên bản chuẩn; High/Ultra ưu tiên bản chi tiết. Thiếu `@2x` tự fallback về chuẩn, thiếu painted sprite tự fallback renderer bằng code. Ảnh được tải trước theo World/quality tier rồi lưu bản theo cỡ màn hình (tối đa 72 bản). Chớp trúng đòn, chuyển động, hào quang và hiệu ứng vẫn chạy bằng code.
- Contract và giới hạn hiệu năng High/Ultra: `docs/HIGH_ULTRA_VISUAL_QUALITY_V2.md`.

## 6. Kiểm tra

- Kiểm thử: `tests/enemy-boss-identity.test.ts` (bản sắc họ và loại, 26 boss, kiểu bắn luôn nhắm vào tàu, giới hạn hạt, tên và đạn của Tyrant trong trận, tiếng vỡ đúng chất liệu), `tests/boss.test.ts`.
- Chụp ảnh (máy chủ dev, xem `docs/VISUAL_TESTING.md`):

  ```bash
  pnpm -s visual:shot "http://127.0.0.1:3098/#mode=deaths&at=160" .visual/deaths.png --click=#startButton --wait=3000 --eval-file=scripts/visual/evals/enemy-fx.js
  pnpm -s visual:shot "http://127.0.0.1:3098/#stage=200&at=900" .visual/boss.png --click=#startButton --wait=3000 --eval-file=scripts/visual/evals/boss-fx.js
  pnpm -s visual:shot "http://127.0.0.1:3098/" .visual/perf.png --click=#startButton --wait=3000 --eval-file=scripts/visual/evals/enemy-perf.js
  ```

## 7. Các file chính

`src/boss/skills.ts`, `src/boss/depth-view.ts`, `src/boss/boss-relief.ts` (trùm Depth View, mục 4.1), `src/vfx/light-sprites.ts`, `src/vfx/combat-fx.ts`, `src/enemies/identity.ts`, `src/enemies/painted-sprites.ts`, `src/enemies/renderer.ts`, `src/boss/identity.ts`, `src/boss/model.ts`, `src/audio/Sfx.ts` (khối "Target materials"), `src/types.ts` (`EnemyProjectile.family`), `src/Game.ts` (vẽ quái, `applyShotImpact`, boss xuất hiện / đổi pha / tử trận / bắn, khối "Enemy and boss identity"), `scripts/bg-art/prepare-sprites.mjs`, `scripts/visual/evals/{enemy-fx,boss-fx,enemy-perf,sfx-levels}.js`.
