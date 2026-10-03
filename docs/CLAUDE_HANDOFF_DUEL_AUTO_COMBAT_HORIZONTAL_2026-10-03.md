# Handoff — Space Typing PvP Duel: auto-combat, impact pass, Depth View

Cập nhật lần cuối: 2026-10-03, bởi Claude. Phần **0** là đợt mới nhất và ưu tiên hơn mọi phần bên dưới. Phần 1–7 là bàn giao gốc của Codex (horizontal + auto-combat). Phần đó vẫn đúng với gameplay, trừ những chỗ ghi "ĐÃ THAY".

## 0. Đợt 2026-10-03 (Claude): hỏa lực, âm thanh chiến tranh, KO, Depth View

### 0.1. Chủ dự án yêu cầu gì (theo thứ tự trong phiên)

1. Combat chưa "bùng nổ": đòn đánh thiếu lực, gõ đúng liên tục không thấy mạnh lên, âm thanh dở, hiệu ứng nhạt, thắng/thua không có gì. High/Ultra phải đẹp hơn hẳn.
2. Đạn bay quá nhanh, không kịp cảm nhận.
3. Âm thanh phải là **hỏa lực chiến tranh** (súng, pháo, nổ). **Không dùng tiếng "tinh tinh" trẻ con.**
4. Bố cục ngang nhìn xấu. Muốn **dọc nhưng có cảm giác 3D**: tàu mình gần và rõ, địch rất xa, đạn tới gần thì to và rõ, xung quanh chuyển động. Viết plan rồi triển khai. Plan nằm ở `docs/DUEL_DEPTH_VIEW_PLAN_2026-10-03.md`.

### 0.2. Nguyên nhân gốc đã tìm ra (có bằng chứng)

| Vấn đề | Nguyên nhân |
| --- | --- |
| Thắng/thua không có gì | `local-match.ts`/`authority.ts` gọi `beginNextRound()` ngay tick kế tiếp (sau 50 ms). Không có màn KO, không có kết quả. `ship-destruction.ogg` chưa từng được phát |
| Đòn trúng không lực | Chỉ có chớp sáng nhỏ của `PlayerShotSystem`. Không rung, không khựng hình, không mảnh vỡ/khói, tàu không giật. Số sát thương là DOM nhỏ |
| Đạn quá nhanh | Pháo chính 360 ms cho ~1.250 px (~3.500 px/s). Ở 30 fps đạn chỉ hiện ~11 khung |
| Âm thanh "tinh tinh", nhỏ, trễ | Pack `public/assets/audio/duel/sfx` đo spectral flatness 0,01–0,14 (tone tổng hợp, `precision.ogg` = 0,001), centroid tiếng trúng 3–5,5 kHz. Phát qua pool `<audio>`: trễ, không chồng lớp, không stereo, cắt tiếng khi pool quay vòng |
| Ảnh nổ vẽ tay hiện sai | WebP động làm CSS background: mọi instance chung một đồng hồ animation |
| Đạn Reaper bị cắt phẳng | Đạn vẽ vào canvas dải cao 260 px rồi composite |
| Lag CPU khi có chữ nổi | Gán `ctx.font` mỗi nhãn mỗi khung (~300 ms trong profile 12 s). Đã thay bằng bitmap nhãn cache |

### 0.3. Đã triển khai

**Gameplay timing (đổi protocol):**
- `DUEL_ROUND_BREAK_SECONDS = 5` (`presentation-timing.ts`). Practice và authority giữ hiệp đã kết thúc 5 s, bỏ qua phím, rồi mới chia hiệp mới. Authority tăng `serverSequence` và gửi view trong lúc nghỉ.
- Pháo chính `DUEL_CANNON_TRAVEL_MS = 600` (cũ 360). Đòn tấn công `DUEL_PROJECTILE_BASE_TRAVEL_MS = 860` (cũ 720). Sát thương vẫn theo đồng hồ authority.
- `DUEL_PROTOCOL_VERSION = 7`, `DUEL_CONTENT_VERSION = "duel-final-v7-impact"`. **Phải restart Duel server** và reload cả hai client.

**Hiệu ứng (chỉ trình bày, không đổi HP):**
- `src/duel/combat-juice.ts` (mới), vẽ trên Game canvas:
  - Nổ nhiều lớp theo loại vũ khí (`HIT` profiles), tia lửa có hướng (gộp theo màu/alpha/độ dày thành vài lệnh `stroke`), mảnh vỡ đặc (đúng ý chủ dự án: vật thể đặc), khói, tàn lửa, sóng xung kích.
  - Khiên lục giác (bitmap cache) khi trúng khiên, vỡ khiên.
  - Tàu giật theo hướng đạn và chớp trắng (vẽ lại thân bằng `lighter`). Rung camera (`Game.duelShake`), khựng hình (hit-stop), slow-mo KO.
  - Tàu cháy/khói/tia lửa theo % máu. Chớp đỏ viền màn hình khi mình trúng, chớp màn hình, viền đen điện ảnh khi KO.
  - Chữ nổi theo làn: sát thương bên phải; thông báo (CRITICAL!, SHIELD BREAK!, tên bậc chuỗi) và hồi phục bên trái. Số sát thương liên tiếp gộp trong 0,4 s.
  - KO: nổ dây chuyền theo `DUEL_KO_TIMELINE` → nổ cuối (flipbook vẽ tay, tia sáng mềm, mảnh vỡ) → ẩn xác → hồi sinh "warp-in" ở hiệp mới.
  - Ngân sách: Low/Medium/High/Ultra = 90/200/320/520 hạt. Ảnh nổ vẽ tay chỉ ở High/Ultra; Ultra nối khung (cross-fade) và có nổ phụ.
- `src/duel/painted-flipbooks.ts` (mới): giải mã WebP động bằng `ImageDecoder` thành atlas khung hình (explosion-core/wide, bomb-impact, shockwave-ring, spark-burst; ~12 MB). Mỗi vụ nổ có đồng hồ riêng. Không có `ImageDecoder` thì chỉ dùng hạt vẽ bằng code.
- `src/duel/momentum.ts` (mới): chuỗi gõ đúng. Bậc trùng mốc precision của engine: 10 ON FIRE, 20 BLAZING, 35 INFERNO, 50 UNSTOPPABLE, 75 GODLIKE, 100 LEGENDARY. Hiệu ứng: đạn pháo to dần (power 0,85 → 1,55, từ bậc 4 dùng art finisher), hào quang tàu, lửa động cơ mạnh hơn, vòng tiến trình, bộ đếm "×N", màu ô gõ. **Không đổi sát thương.**
- `battle-ui.ts`:
  - Lớp DOM `#duelCinematic`: tem "ROUND N · FIGHT!", "K.O."/"TIME!", "PHASE … / ALL-OUT WAR / CRISIS / CATACLYSM", bảng VICTORY/DEFEAT/DRAW có thống kê (chuỗi tốt nhất, độ chính xác, sát thương gây/nhận), "ROUND N · GET READY", nút Return to Lobby khi hết trận.
  - Chặn phím khi hiệp không active.
  - Ghi DOM có cache (`setText`/`setVar`/`setData`/`setClass`). Bỏ dựng lại threats/objective/strategy/intel khi không đổi.
  - DOM painted blasts/damage overlays bị ẩn khi có canvas renderer (`battle-juice.css`).
- `src/vfx/player-shots.ts` (dùng chung Campaign, mặc định không đổi):
  - `flightEase`, `horizonY` + `depthBase` (phối cảnh thật), `confirmArrival(..., onConfirm)`, `ShotArrival.angle`, `visitLiveShots()`.
  - Vụ nổ khi trúng và chớp nòng theo khoảng cách chỉ khi có `horizonY`.
- `combat-visuals.ts`: vẽ thẳng lên Game canvas (bỏ dải 260 px), tối đa 24 đạn, nhiều viên/đòn (`VOLLEY`: missile 3, laser 2, combo 4…), tia railgun/lance, vệt khói tên lửa.

**Âm thanh (`src/audio/duel-sound.ts`, mới; `Game.playDuelCombatAudioCue` gọi nó trước, pool cũ là fallback):**
- Web Audio, decode một lần. Bus +9 dB (gain 2,8) → compressor → limiter. Reverb sinh bằng code 2,2 s. Stereo theo bố cục: Depth View ±0,12; side view ±0,55.
- Lớp âm: Kenney CC0 `explosion-crunch` (flatness 0,315), `explosion-low` (centroid 106 Hz), `thruster`. Pack Duel chỉ giữ file nhiễu (impact/shield/destruction), có lowpass. **Bỏ hẳn file có cao độ** (laser-launch, energy-impact, precision, launches, round-*).
- Giọng tổng hợp: súng (crack + body méo + thump + vang), pháo, nổ (crunch + sub + rumble méo + crackle mảnh vỡ), click cơ khí cho mỗi phím đúng (nặng dần theo chuỗi, **không leo nốt**), trống trận + kèn đồng trầm (FIGHT/thắng/thua), còi báo động (Crisis/Cataclysm), klaxon cảnh báo.
- Cue mới: `type-tick`, `streak-tier`, `streak-break`, `shield-hit`, `shield-break`, `ko-blast`, `ko-final`, `match-win`, `match-loss`, `round-ready`, `fight`, `phase-shift`. Router nhận `beats` từ battle-ui (`onPresentationState(view, events, beats)`). KO chain/stinger theo `DUEL_KO_TIMELINE`. `main.ts` duck nhạc khi `ko-final`/match result.
- Đo offline (OfflineAudioContext, master 0,5; dB, 100 ms loudness):
  - gun mình −29 (cũ −33), trúng đạn −22,6 (vào mình −19,9).
  - tên lửa trúng −13,1 (cũ −27,7), bom −9,9, KO cuối −8,9, gõ phím −41.
  - Centroid tiếng trúng 0,6–1,4 kHz (cũ 3,3–5,5 kHz).
  - Test `tests/duel-sound.test.ts` chặn mọi oscillator > 400 Hz cho tick/gun/impact/streak-break, để giữ lựa chọn không "tinh tinh".

**Depth View (mặc định, thay cho bố cục ngang):**
- `combat-layout.ts`: `duelArenaLayout()` → `"depth"`. `?duelView=side` (chỉ màn rộng) giữ bố cục ngang để so sánh. `data-layout` là `depth` | `horizontal` (không còn `vertical`).
- Tàu mình 50%/79%, rộng clamp(128px, 10.5vw, 176px). Địch 50%/21%, rộng clamp(44px, 3.6vw, 62px).
- Đường chân trời `H = (yR·sP − yP·sR)/(sP − sR)`. Đạn có `horizonY`: đạn mình nhỏ dần về phía địch, đạn địch nhỏ ở xa rồi lớn tới cỡ thường khi tới tàu mình (`depthBase = cỡ tàu bắn / cỡ tàu mình`).
- Tàu trôi/né/nghiêng, luồng sao `depth-field.ts`, khung ngắm đỏ quanh địch, nổ ở xa nhỏ theo khoảng cách (≥ 58%).
- Camera Game (`Game.setDuelCombatRenderer(draw, camera)`): zoom 1,07 vào tàu thua khi KO, đẩy nhẹ khi trúng nặng. HUD DOM không zoom.
- Mục tiêu chữ: `DUEL_DEPTH_TARGET_POSITIONS` chừa làn giữa 40–60%. Hướng dẫn ở trên giữa (ẩn trên điện thoại).

### 0.4. Kiểm chứng đã làm

- `pnpm exec tsc` (client + server) PASS. `pnpm build:space` PASS.
- Vitest: **1.392 pass / 1 fail**. Lỗi duy nhất là `combat-vfx-sprites.test.ts` (alpha của `missile-salvo`/`spark-burst`/`debris-burst`/`precision-burst`), có từ trước, xem mục 6 gốc.
- Test mới: `duel-momentum`, `duel-round-break`, `duel-combat-juice`, `duel-sound`. Test cập nhật theo hằng số mới: `duel-typing-cannon`, `duel-audio`, `duel-authority` (giữ hiệp khi nghỉ), `duel-combat-canvas` (vẽ thẳng, depth mặc định, side view), `duel-battle-dom-contract`.
- Ảnh đã tự mở xem (đều trong `.visual/`):
  - `depth2-t6.5.jpg` (desktop High), `portrait2-t4.jpg` (390×844), `depth-ko-sheet.jpg` (KO depth), `ko2-sheet.jpg` (KO side), `ko2-ko-4100.jpg` (GET READY), `play-ko-t3.jpg` (bản Play, không exception/log).
- Kịch bản dùng lại (`.visual/`, bị gitignore):
  - `duel-burst.mjs` (CDP, chụp nhiều khoảnh khắc qua `__snap()`, `--quality`, `--jpeg`, `--profile`).
  - `duel-fight.js`, `fight-warm2.js`, `duel-ko-depth.js` (dùng hook dev `window.__duelPractice()` để ép KO).
  - `depth-ab.js` (A/B bật/tắt hiệu ứng), `war-audio.js` (đo âm offline).

### 0.5. Hiệu năng: chưa thể gọi là PASS

- Lúc đo, máy có một Chrome renderer của chủ dự án chạy ~120–138% CPU (3 h 44 m) và load average ~10. Headless dường như khóa ở 30 fps, nên số tuyệt đối nhiễu.
- A/B cùng lượt ở High: CPU `render()` p50 khoảng +1–2 ms khi bật hiệu ứng lúc giao tranh thường, cao hơn trong vài giây KO (tối đa ~520 hạt ở Ultra).
- Đã bớt chi phí cũ:
  - Bỏ composite dải 2463×390 mỗi khung.
  - Bỏ DOM painted blasts có `mix-blend-mode`.
  - Bỏ DOM pulse năng lượng mỗi tick.
  - Cache ghi DOM.
- Cần chủ dự án chơi thật ở High/Ultra để xác nhận mượt.

### 0.6. Còn mở / bước tiếp theo

1. Chờ chủ dự án duyệt cảm giác Depth View: tỉ lệ xa/gần 3:1, tốc độ né của địch, độ dày luồng sao, mức zoom KO.
2. Hai client + server V7 thật (Friend Room): nghỉ giữa hiệp, phím bị bỏ qua lúc nghỉ, KO đồng bộ.
3. Art tùy chọn: xem mục 7 của plan Depth View. Âm thanh thật hơn nữa: có thể thay lớp Kenney bằng file chiến tranh CC0 thu âm thật (ví dụ Sonniss GDC bundle) đặt cùng tên/đường dẫn.
4. Lỗi alpha asset (mục 6 gốc) vẫn mở.

---

# Bàn giao gốc của Codex (horizontal + auto-combat)

Ngày bàn giao: 2026-10-03. Đây là trạng thái **working tree local**, không phải bản đã commit/push. File này ưu tiên hơn phần hướng dẫn tích kho trong các plan/handoff V5 cũ.

## 1. Yêu cầu mới nhất của chủ dự án

Chủ dự án muốn combat PvP liên tục, nhìn thấy đạn bay, dùng lại hình tàu và đạn đẹp của Campaign. Hai thay đổi đang triển khai:

1. Desktop đổi từ hai tàu trên/dưới sang trái/phải để tăng khoảng cách giao tranh. Chữ, HUD và các mục tiêu vẫn đọc bình thường, không xoay cả màn hình.
2. **Bỏ việc tích vật phẩm vào kho rồi nhấn Space/1–7 để dùng. Gõ hoàn thành từ là tự kích hoạt vật phẩm.**

Trước đó chủ dự án yêu cầu bôi xám target khi kho đầy vì không gõ được chữ `e` cuối của `provide`/ICE WALL. Sau đó họ đổi yêu cầu sang bỏ tích kho hoàn toàn. Vì vậy **không khôi phục gameplay kho đồ chỉ để giải quyết lỗi chữ cuối**. Màu xám ở bản mới dùng cho thiếu năng lượng/hồi chiêu.

Yêu cầu kiểm chứng bắt buộc: đọc `docs/VISUAL_TESTING.md`, chụp game thật và **tự mở ảnh xem**, không coi test pass là hình ảnh đẹp. Chủ dự án từng phản ánh lag trên Mac, nên không tùy tiện tăng DPR, full-screen effects hoặc đề xuất chọn Low là giải pháp chính.

Yêu cầu cuối của lượt này là tạo handoff để Claude tiếp tục. Chưa được coi toàn bộ PvP/art/performance là hoàn tất.

## 2. Repo và nguyên tắc bảo toàn

- Workspace: `/Users/jokerit/htdocs/typing-game`.
- Repo game: `/Users/jokerit/htdocs/typing-game/games/space-typing`.
- Branch khi bàn giao: `feat/bgv-integration-current`.
- HEAD đọc trực tiếp: `a1036e4d1e03ac1797d9d6f4c81b1b73274e7866`.
- `git status --porcelain` có **153 đường dẫn dirty** khi kiểm tra. Có nhiều thay đổi code/art từ trước lượt này, không được xem tất cả là thay đổi cần revert.
- **Không tự checkout main, reset, clean, restore file, pull/rebase, commit hoặc push.** Không xóa save/localStorage của người dùng.
- Bộ artwork đang được người dùng thay: có SVG bị xóa, WebP chưa tracked, manifest sửa, thư mục audio/FX/background mới, `art.zip`, v.v. Không tự sinh đè artwork để làm test xanh.
- Chưa tạo thêm ảnh/âm thanh trong lượt này.

## 3. Những phần đã triển khai

### 3.1. Bố cục ngang (ĐÃ THAY: mặc định là Depth View, ngang chỉ còn qua `?duelView=side`, xem 0.3)

- `duelHorizontalLayout(width,height)` chọn ngang khi container rộng >=960 CSS px và width >= height × 1,25. Điện thoại/portrait giữ dọc.
- Desktop: tâm YOU tại x=12%, RIVAL x=88%, cả hai y=50%. Tàu YOU quay phải, RIVAL quay trái.
- Word targets phân bố trên/dưới corridor đạn. HUD YOU dưới trái, RIVAL dưới phải, timer trên phải.
- Xoay cả điểm nòng/động cơ và cập nhật threat telegraph, tactical fields; không chỉ xoay CSS ảnh tàu.
- Dùng `drawCharacterShip`, `PlayerShotSystem`, `ShipExhaust` từ Campaign. Không thêm hệ tàu/đạn song song mới.
- `flatDepth` là tùy chọn của shot dùng cho Duel ngang; mặc định false để không đổi perspective Campaign.
- (ĐÃ THAY: không còn surface FX riêng ở chế độ Game canvas, đạn vẽ thẳng lên canvas.) Surface FX ngang full width nhưng chỉ cao tối đa260 CSS px, DPR cap1,5. Thân tàu cache surface nhỏ, repaint tối đa30Hz. Đây là giới hạn chi phí, **không phải chứng minh FPS đạt**.

### 3.2. Vật phẩm tự kích hoạt

- Production Practice và authority Friend/Ranked tạo engine với `autoActivateItems: true`.
- Engine chuyển action từng `banked` thành `instant`, `capacityPolicy: none`, **giữ nguyên** effect, energy cost, cooldown, chất lượng gõ.
- Các action này đi qua pipeline resolve có sẵn; không store rồi giả lập thêm phím USE_ITEM. Không có auto-use queue ẩn.
- Hoàn thành attack -> phát `action-fired` và effects; damage vẫn theo flight clock khi typingCannon bật. Support/defense/tactical cũng phát `action-fired` để **cả hai bên** có hình/âm thanh, không phụ thuộc event `action-completed` vốn private.
- Bỏ bảng inventory khỏi DOM và bỏ shortcut dùng vật phẩm Space/1–7. Banner mới nói hoàn thành từ -> tự kích hoạt.
- Engine generic vẫn để mặc định `autoActivateItems: false` nhằm giữ các simulation/regression inventory cũ; đó **không phải lựa chọn trong live UI**. Các factory live và Duel Test Lab đã bật true.
- Snapshot/protocol vẫn còn type inventory và USE_ITEM vì subsystem legacy; không tích item trong gameplay live mới. Không cần xóa toàn bộ các subsystem này để bàn giao yêu cầu hiện tại.

### 3.3. Năng lượng/hồi chiêu/input

- Click và acquisition từ bàn phím bị chặn ngay khi skill không đủ năng lượng/hồi chiêu. UI làm xám icon/từ và hiện `CẦN … NĂNG LƯỢNG` hoặc `HỒI CHIÊU …s`.
- Phím bị chặn không cộng spelling mistake/cannon charge. Khi tài nguyên thay đổi giữa lúc gõ, prefix được giữ; có thể Esc đổi từ. Client prediction cũng dùng luật này.
- Chưa thêm cơ chế reserve energy từ lúc bắt đầu gõ. Nếu bị drain trong lúc gõ, từ có thể chuyển xám và phải đợi nạp/đổi target; đây là giới hạn phải đánh giá UX tiếp, không được quảng cáo là mọi từ luôn hoàn thành bất kể năng lượng.
- Energy được reserve trong cùng authority tick để nhiều intent completion không tiêu quá tài nguyên.
- Draft live có `ensureEnergyOffer: true`: luôn duy trì một mục ENERGY miễn phí/không cooldown để có đường nạp năng lượng và không bị ba skill cùng không đủ tiền. Từ phải gõ vẫn do Word Director random, không cố định `energy`. Gõ mục này cũng bắn pháo chính.
- Hệ quả thiết kế: trong ba mục tiêu, một mục là nguồn hồi năng lượng. Cần chủ dự án duyệt cảm giác nhịp game; không tự bỏ guard này nếu chưa có giải pháp tránh cạn năng lượng khiến cả màn không gõ được.

### 3.4. Tương thích

- (ĐÃ THAY bằng V7, xem 0.3) `DUEL_PROTOCOL_VERSION = 6`.
- (ĐÃ THAY) `DUEL_CONTENT_VERSION = "duel-final-v6-auto-combat"`.
- Bắt đầu trận mới. Online phải restart Duel server từ code mới và reload cả hai client; không ghép client mới với authority V5. Agent chưa tự restart server của người dùng.
- Không có thay đổi persistence Campaign hay migration save trong phạm vi này. Trận cũ không được chuyển đổi nóng sang luật mới.

## 4. Bản đồ code để đọc tiếp

| File | Vai trò/thay đổi |
| --- | --- |
| `src/duel/engine.ts` | Config auto-use, đổi action definitions, chặn unavailable input, reserve/resolve, phát support action-fired; cũng chứa typing cannon/delayed damage từ các lượt trước |
| `src/duel/offer-availability.ts` | `autoActivateDuelAction`, `duelAutoActionBlock`; còn helper full-bank cho legacy tests |
| `src/duel/map-actions.ts` | Cache live action maps cho client, giữ map labels/effects |
| `src/duel/network-client.ts` | Prediction theo live actions, energy/cooldown, prefix preservation |
| `src/duel/local-match.ts`, `authority.ts` | Bật auto-use và energy recovery draft cho live; truyền cùng chế độ cho bot |
| `src/duel/draft.ts`, `bots.ts` | Recovery offer; bot không chọn skill không đủ năng lượng trong live mode |
| `src/duel/battle-ui.ts`, `battle.css` | Không inventory/hotkeys; gray reason; horizontal layout, HUD, FX dispatch |
| `src/duel/combat-layout.ts`, `combat-visuals.ts` | Container orientation, Campaign adapter, shot corridor/cache |
| `src/vfx/player-shots.ts` | `flatDepth` cho horizontal; giữ default Campaign |
| `src/test-lab/duel-test-lab.ts` | Bật cùng live auto-use/draft/bot flags |
| `src/duel/model.ts`, `protocol.ts` | Content/protocol V6 |

Các thay đổi Campaign reuse ở `src/Game.ts`, `src/main.ts`, `src/vfx/player-shot-sprites.ts`, audio và một phần adapter có từ các lượt trước. Đừng mặc định diff với HEAD chỉ phản ánh yêu cầu auto-use hiện tại.

## 5. Kiểm thử đã thực hiện

### Code

- TypeScript client **PASS**: `pnpm exec tsc -p tsconfig.json --noEmit` (bao gồm tests).
- TypeScript server **PASS**: `pnpm exec tsc -p tsconfig.server.json --noEmit`.
- Vite build trực tiếp **PASS**, còn cảnh báo chunk >500kB.
- Full Vitest: **1376 pass / 1 fail**, 225 test files (224 pass/1 fail).
- Failure duy nhất ở `tests/combat-vfx-sprites.test.ts:82`: kiểm tra asset alpha. Không được ghi là toàn repo PASS.
- `git diff --check` không báo lỗi.

Tests mới/chính: `duel-auto-activation.test.ts` (13 cases), `duel-local-match.test.ts`, `duel-network-client.test.ts`, `duel-combat-canvas.test.ts`, `duel-battle-dom-contract.test.ts`. `duel-bank-availability.test.ts` kiểm tra legacy + layout, không đại diện luật live mới.

Coverage đã có: từng action banked cũ tự kích hoạt đúng một lần, kho rỗng, energy một lần, chống replay, delayed damage, same-tick overspend, unavailable acquisition, prediction/recharge, recovery word random, Practice wiring, hướng tàu khi resize. Chưa chạy hai browser thật kết nối Friend Room với latency/reconnect.

### Browser thật và ảnh đã mở xem

Đã đọc `docs/VISUAL_TESTING.md` và chụp **bản build Play** trên `https://space.typing-game.local/`, không chỉ dev gallery.

- `.visual/duel-auto-horizontal-play.png` — 1642×799 CSS, DPR2. Tự gõ12 từ qua keyboard events, hoàn thành12/12; inventory buttons0, bank events0, action-fired17 (có cả đối thủ). YOU center=(197,399,5), RIVAL=(1445,399,5). Đã mở xem: tàu/đạn ngang, không có kho, target thiếu năng lượng có lý do xám.
- `.visual/duel-auto-portrait-play.png` — 390×844 CSS, DPR2. Layout vertical, inventory0, target3, exceptions rỗng. **Đã thấy lỗi UI còn tồn tại: banner auto-combat ở đáy che phần HUD YOU. Cần sửa tiếp.**
- `.visual/duel-horizontal-bank.png`, `.visual/duel-horizontal-reopened.png` là ảnh bước trung gian trước khi người dùng bỏ kho; **không dùng làm bằng chứng V6**.
- `.visual/duel-auto-play.js` là script nhập12 từ, quan sát event feed và frame intervals; không dùng Space/1–7. `.visual/` bị Git ignore, chỉ có local.
- Browser logs/exceptions trong lượt Play desktop/portrait rỗng. Desktop screenshot command cuối cùng exit1 do cleanup profile tạm `ENOTEMPTY` sau khi đã xuất PNG+JSON; không phải page exception hay build failure.

### Hiệu năng — CHƯA PASS

Lượt Play desktop auto-combat: 170 mẫu RAF sau warm-up ngắn, p50 **50ms**, p95 **83,3ms**, 118 mẫu >33,4ms. Đây là kết quả thực, không được bỏ qua để chỉ báo cáo test logic.

Không chạy build/Vitest đồng thời lượt browser này. Tuy nhiên snapshot tiến trình sau đó cho thấy tải nền cao: hai Cursor Renderer khoảng184,9% và69,6% CPU, WindowServer55,2%, các Chrome renderer cũng đang hoạt động. `%CPU` trên macOS có thể vượt100% khi dùng nhiều core. Không có đủ bằng chứng quy toàn bộ lag cho adapter hoặc cho Cursor; chưa đo nhiệt/throttling và chưa có baseline cùng seed/tải.

Đã hoàn thành A/B renderer bằng `.visual/duel-render-ab.js`, ảnh `.visual/duel-auto-render-ab.png` đã mở xem. Bốn pha, mỗi pha150RAF, bỏ10 mẫu đầu:

| Pha | Frame p50 | Frame p95 | CPU adapter p95 |
| --- | --- | --- | --- |
| Bật renderer lần1 | 22,8ms | 44,4ms | 3,3ms |
| Tắt renderer lần1 | 17,7ms | 30,6ms | — |
| Bật renderer lần2 | 29,8ms | 49,3ms | 4,3ms |
| Tắt renderer lần2 | 33,8ms | 49,8ms | — |

Không có page exceptions; dev có warning shared vocabulary fallback do không dùng endpoint Portal, khác với Play. Script tạm tắt/bật presentation trong cùng browser rồi khôi phục; không đổi gameplay/save. Cảnh vẫn tiến triển và chỉ bot gõ, không phải benchmark deterministic replay hay cùng tải như12 từ ở Play. Kết quả biến động lớn, không đủ để khẳng định renderer không gây regression; **performance vẫn chưa PASS**.

## 6. Lỗi artwork cần xử lý riêng

Đã đọc pixel alpha bằng `sharp`, không chỉ nhìn manifest:

| File trong `public/assets/space-typing/combat-vfx/` | Max alpha (0–255) | Kết luận |
| --- | --- | --- |
| `missile-salvo.webp` | 0 | Toàn ảnh trong suốt, không thể nhìn thấy khi render |
| `spark-burst.webp` | 98 | Không có pixel >128, fail gate hiện tại; cần xem ảnh/compositing trước khi kết luận toàn bộ art hỏng |
| `debris-burst.webp` | 51 | Tương tự, alpha rất thấp |
| `precision-burst.webp` | 95 | Tương tự |

Không sửa các ảnh này, không chỉnh test threshold để làm xanh. Đây là artwork đã có trong dirty tree, không phải được tạo bởi phần horizontal/auto-use. Claude nên xác minh nguồn xuất alpha và quy ước additive/source-over, nhất là `missile-salvo`. Đừng tạo lại bộ ảnh mới hàng loạt trước khi xem có sửa đúng nguồn/export được không.

## 7. Thứ tự làm tiếp đề xuất

1. Đọc file này kiểm tra git status/HEAD và những file liên quan; **không restart thiết kế từ các plan V5**.
2. Sửa overlap banner/HUD ở portrait và kiểm tra thêm desktop chiều cao thấp. Không đổi hướng ngang của desktop đã được người dùng yêu cầu.
3. Chạy Play desktop/portrait sau build mới, tự mở ảnh. Kiểm tra typing liên tục, auto missile/shield/repair, target energy gray rồi sáng lại, round end/rematch, resize. Kiểm tra cả meta label không bị CSS cũ ẩn.
4. Đo performance trong điều kiện ít tải hơn (không tự tắt app người dùng), cùng kích thước/DPR/seed nếu làm được. Tách CPU update/DOM, Campaign adapter, background GPU và CSS effects. Chưa nên tăng art density/bloom.
5. Xác minh hai client/server V6: auto-use, energy/cooldown authority vs prediction, không damage hai lần, reconnect không tự kích lại item, support VFX không bị lọc vì private event.
6. Xử lý asset alpha sau khi hiểu nguồn; báo rõ nếu cần người dùng cung cấp ảnh gốc. Kiểm tra cả screenshot và asset gate, không chỉ một trong hai.
7. Cập nhật chính file handoff này bằng bằng chứng mới. Chỉ báo phần nào PASS thực sự; không cam kết “không còn lỗi”, “60 FPS ổn định” hoặc “đẹp như concept” khi chưa chứng minh.

