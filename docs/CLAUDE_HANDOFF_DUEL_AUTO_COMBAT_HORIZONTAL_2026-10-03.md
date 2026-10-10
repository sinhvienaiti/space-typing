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

### 0.7. Đợt 2 cùng ngày: lobby, âm thanh hỏa lực thật, thoại Dota, nhạc PvP, mục tiêu chữ, bay Campaign

**Phản hồi của chủ dự án sau khi chơi Depth View:**
- PvP đã khá tốt.
- Popup lobby không tự tắt khi vào trận.
- Chọn "Random map" nhưng đấu bot vẫn ra một bản đồ cố định.
- Âm thanh "như ném đá vào chảo", chưa phải hỏa lực phi cơ.
- Vật phẩm gõ chữ cần đẹp hơn.
- Muốn dùng thư mục thoại Dota.
- Nhạc PvP cần nhanh và vui hơn.
- Muốn đưa hiệu ứng bay "gió, lướt" sang Campaign.

**Lobby:**
- `createPracticeDuelRoom()` (`room.ts`) nhận `settings` của lobby. Trước đó nút Practice ép `mapSelection: fixed` và bỏ hết cài đặt.
- `room-ui.ts` truyền `duelRoomSettingsFromUi()`. Map mode Random/Vote chọn theo seed trận.
- `main.ts` (`onMatchUpdate` online) đóng `#duelRoomDialog` khi trận chạy. Trước đó chỉ Practice và Ranked mới đóng.
- Đã kiểm tra trên trình duyệt: 4 lượt Practice ra Celestial Void, Terra Core, Celestial Void, Inferno Rift, không còn dialog mở.
- Test: `duel-practice-settings.test.ts`.

**Âm thanh vũ khí (lần 3):**
- Nguyên nhân "đá vào chảo": mẫu `explosion-crunch` bị tăng tốc 1,25× cho các phát trúng nhỏ ("đá"), và các bộ lọc cộng hưởng hẹp Q 7–10 tạo tiếng kim loại ngân ("chảo").
- Thay bằng 16 âm thanh **CC0 từ Freesound** trong `public/assets/audio/duel/war/`.
  - Chọn theo lượt tải, đánh giá và số đo phổ (`scratchpad` có script `analyze.mjs`). Nguồn, tác giả và link ghi trong `public/assets/audio/ATTRIBUTION.md`.
  - Pháo chính dùng `gun-a`/`gun-b` luân phiên (Sci Fi Gun Shot, plasmapistol); từ bậc chuỗi 3 thêm `gunshot-real`.
  - Trúng đạn dùng `hit-a`/`hit-b` (Projectile Hit, small explosion); trúng tàu mình thêm `hit-heavy`.
  - Đòn lớn: tên lửa `missile`+`rocket`, railgun `railgun`, bom `tank-fire`, nổ `explosion-a/b/big`, laser impact, shield, impact-design.
- Không còn lọc Q > 2 và không mẫu nào tăng tốc > 1,1×. Có test chặn trong `duel-sound.test.ts`.
- Bus nén nới ra (ngưỡng −10, tỉ lệ 3), vì make-up gain của Chrome ép to/nhỏ sát nhau.
- Đo offline ở master 0,5 (loudness 100 ms):
  - gun mình −20,2; gun địch −25.
  - trúng địch −17,7; trúng mình −12,9.
  - tên lửa −11,7; railgun −8,8; nổ −7,6 đến −9,2; KO −7.
  - gõ phím −45,5.

**Thoại Dota (người dẫn trận):**
- 15 câu chuyển sang Opus vào `public/local-assets/announcer/` (gitignored, chỉ dùng cá nhân), kèm `manifest.json`. Ghi chú trong `docs/LOCAL_ASSETS_README.md`.
- Duel (`audio.ts` cue `announce` với `voice` và `priority`; `duel-sound.ts`):
  - **First Blood** ở lần mất máu đầu của hiệp.
  - Chuỗi gõ đúng = bậc momentum (đổi nhãn theo Dota): 10 KILLING SPREE, 20 DOMINATING, 35 MEGA KILL, 50 UNSTOPPABLE, 75 WICKED SICK, 100 MONSTER KILL, 150 GODLIKE, 200 HOLY SHIT.
  - **Double/Triple/Ultra Kill/Rampage**: mỗi đòn tấn công của mình (tính theo từ, không theo viên đạn) trúng trong vòng 3,5 s, tính lúc đạn tới đích.
  - **Combowhore** khi mình dùng combo. **Ownage** khi mình hạ gục đối thủ.
  - Mỗi lúc chỉ một câu; câu ngang hoặc cao hơn mới được cắt câu đang nói. Nhạc tự duck qua event `space-typing:announcer`.
- Campaign (`announcer.ts`, `Sfx.announcer`, `Game.ts`):
  - First Blood ở lần hạ quái đầu tiên của màn.
  - Thang Killing Spree → Holy Shit theo `stats.streak` (mốc 10/20/30/45/60/80/100, mất chuỗi khi gõ sai hoặc trúng đòn).
  - Chuỗi quái tinh anh dùng đúng câu Dota.
  - Không có file cục bộ thì chuỗi tinh anh dùng tiếng mặc định, các câu mới thì im lặng.

**Nhạc PvP:**
- Hai bài gốc soạn bằng `scripts/music`, xuất qua `node scripts/music/render-songs.mjs --set=duel` vào `public/assets/audio/duel/music/songs/`. Metadata nằm ở `src/audio/duel-music-tracks.json`; bài không lọt vào playlist hay Random của Campaign.
  - **Neon Dogfight**: Rê trưởng, 158 BPM, dùng cho build → crisis (calm → intense).
  - **Afterburner Finale**: 168 BPM, dùng cho Cataclysm.
- Spec bài nằm trong `scripts/music/songs/duel/`.

**Mục tiêu chữ (`battle-juice.css` + `battle-ui.ts`):**
- Màu theo loại vật phẩm, quầng sáng thở nhịp, vòng năng lượng xoay. Khi khóa mục tiêu thì có vòng tiến trình theo `--duel-typing-progress` và khung ngắm 4 góc.
- Hiệu ứng xuất hiện "warp-in" (mờ hiện + nhô lên, vật phẩm bật ra). Sắp hết hạn thì nhấp nháy đỏ. Thiếu năng lượng thì xám.
- Gõ xong: `juice.collect()` nổ tại vật phẩm và tia năng lượng bay về tàu mình.
- Lỗi đã gặp: các thuộc tính `rotate`/`scale` riêng được áp dụng trước `transform: translate(-50%,-50%)` nên vòng bị quay lệch tâm. Đã chuyển sang thuộc tính `translate`.

**Bay Campaign:**
- `FlightStreakField` (chuyển từ `src/duel/depth-field.ts` sang `src/vfx/flight-field.ts`) được vẽ trong `Game.drawFlightStreaks()`.
- Điểm tụ ở trên giữa, có tùy chọn `fold` để sao chỉ tỏa xuống.
- Sao đứng yên khi tạm dừng, nhanh hơn khi chuỗi tăng hoặc khi Overdrive.

**Kiểm chứng:**
- Vitest **1.402 pass / 1 fail** (lỗi alpha cũ).
- `pnpm build:space` PASS. Bản Play chạy không exception.
- Ảnh đã xem: `.visual/targets2-sheet.jpg`, `.visual/campaign-streaks2.jpg`, `.visual/lobby-typing.jpg`, `.visual/play3-t6.5.jpg`.

### 0.8. Đợt 3 cùng ngày: tàu mình nhìn từ sau, rồi tàu 3D thật (Vanguard)

> Phần "khối nổi" bên dưới đã được thay bằng mô hình dựng bằng code ở mục 0.9. Khối nổi vẫn giữ để so sánh (`?ship3d=relief`).

**Yêu cầu:** chủ dự án hỏi có nên chuyển một số hình sang 3D không (sợ nặng). Đã thống nhất làm thử 1 tàu trước.

**Bước 1 — ảnh nhìn từ sau (chase sprite):**
- Ảnh ChatGPT `art-src/ships/vanguard-chase-C00.png` → `pnpm chase:prepare` → `public/assets/space-typing/ships/chase/`.
- `src/characters/chase-art.ts` nạp ảnh. `DuelCombatVisuals.drawChase()` xoay nghiêng theo chuyển động ngang. Tắt bằng `?chase=0`.
- Chủ dự án nhận xét: "không khác gì 2D". Lý do: chỉ xoay một tấm hình, không thấy độ dày, ánh sáng không đổi. Sau khi xem bản demo 3D, chủ dự án duyệt làm thật.

**Bước 2 — tàu 3D thật (`src/duel/ship3d.ts`, mặc định BẬT):**
- Dựng từ ảnh nhìn từ trên có sẵn (`art-src/ships/vanguard-top-hd.png`), không cần ảnh mới. Lớp sơn giữ nguyên nét vẽ của chủ dự án.
- `pnpm ship3d:prepare` (`scripts/bg-art/prepare-ship-3d.mjs`) ra `public/assets/space-typing/ships/3d/`:
  - `vanguard/color.webp` (cắt bỏ lửa vẽ sẵn), `emissive.webp`, `height.bin` (byte thô 256×244), `model.json`;
  - `manifest.json` liệt kê tàu có mô hình, để game không bao giờ gọi tệp không tồn tại.
- Độ cao: "thổi phồng" hình bóng bằng cách ghép các quả cầu trong đường viền (h = max √(d(q)² − |p−q|²)). Lúc chạy, phần vòm lớn được ép phẳng thành tấm giáp (`PLATE`), mặt dưới mỏng hơn (`UNDER` 0,45) và tối hơn.
  - Đã thử và bỏ: hàm theo khoảng cách viền (cánh phồng như gối); "leo đỉnh" (cánh leo lên đỉnh thân, có sọc).
- Hiển thị: three.js 0.170 vẽ lên canvas WebGL riêng nhỏ (≈1,42× bề ngang tàu), rồi `drawImage` vào canvas Game. Nhờ vậy đạn, nổ, chữ vẫn nằm trên.
  - Camera sau-trên 27°, FOV 28.
  - Ánh xạ màu `NeutralToneMapping` (ACES làm xanh bạc trắng).
  - Đèn chính, đèn viền theo màu bậc momentum (cường độ tăng theo heat), đèn điểm theo vụ nổ (`DuelCombatJuice.shipLight()`), phản chiếu `RoomEnvironment` 0,3.
  - Chuông động cơ kim loại + lõi sáng ở 2 vòi. Lửa và quầng sáng 2D đặt theo vị trí vòi đã chiếu ra màn hình (quầng to hơn 1,3×).
  - Nghiêng tối đa ±0,62 rad (ảnh 2D chỉ ±0,42), có quay nhẹ theo hướng rẽ và gật mũi khi trúng đạn.
- Tải: `import("three")` là gói riêng (688 KB, 177 KB gzip), chỉ tải khi mở sảnh Duel (`main.ts` → `duelBattle.preload()`, trễ 350 ms cho dialog hiện trước). Campaign không bao giờ tải.
  - Phần nặng chia nhỏ: dựng lưới, tải texture từng khung, biên dịch shader bằng `compileAsync` (không chặn luồng chính khi trình duyệt hỗ trợ).
- Dự phòng: Low → ảnh nhìn từ sau. Không có WebGL hoặc mất context → ảnh nhìn từ sau. Tàu không có mô hình → ảnh sau hoặc ảnh trên như cũ. `?ship3d=0` để so sánh.

**Đo đạc (Chrome headless, máy đang tải nặng nên số khung hình tuyệt đối bị nhiễu):**
- Chi phí vẽ tàu mỗi khung: 3D 0,6–0,8 ms (p95 1,1–1,2) so với ảnh 2D 0,2–0,3 ms. Medium (dpr 1) 0,5 ms. Low 0,1 ms (không dùng 3D).
- Long task: phần nặng (≈160–220 ms) dồn vào lúc mở sảnh. Trong trận, tổng long task 3D 501/579/355 ms so với 2D 661/375/565 ms (3 lần mỗi bên): không khác biệt.
- Trước khi tối ưu: đọc độ cao qua canvas 81 ms, dựng lưới 35 ms, lần vẽ đầu 228 ms → khựng 200–347 ms giữa trận. Đã sửa như trên.

**Kiểm chứng:**
- Test mới: `duel-ship3d.test.ts` (cờ tắt, không WebGL thì không fetch, tính toàn vẹn mô hình), thêm 1 test `shipLight` trong `duel-combat-juice.test.ts`.
- Vitest 1.406 pass. 2 lỗi không liên quan: lỗi alpha cũ của ảnh VFX cục bộ (`combat-vfx-sprites`, tệp do `art:prepare` sinh lúc 21:57 ngày 2/10) và `m22-economy-audit` quá giờ khi máy tải nặng (chạy riêng thì qua).
- `pnpm build` PASS.
- Ảnh: `.visual/compare-2d-3d.jpg` (hàng trên 2D, hàng dưới 3D, cùng thời điểm), `.visual/lab7-lab.jpg` (các góc nghiêng, heat, vụ nổ). Trang thử riêng: `.visual/ship3d-lab.html` (mở qua Vite dev).

**Còn mở:**
1. Chờ chủ dự án chơi thử và so với `?ship3d=0`.
2. Nếu duyệt, mở rộng sang tàu khác: mỗi tàu cần 1 ảnh nhìn từ trên, nét cao, nền trong suốt (`art-src/ships/<id>-top-hd.png`, hiện mới có Vanguard; ảnh trong `player-ships-v3.webp` quá nhỏ). Sau đó chạy `pnpm ship3d:prepare`. Tàu địch ở xa nên lợi ích 3D thấp hơn; nên làm sau.
3. Mặt sau tàu (vòi động cơ) đang dựng bằng khối đơn giản, kém chi tiết hơn ảnh nhìn từ sau. Muốn đẹp hơn nữa thì dùng mô hình `.glb` tạo bằng công cụ AI 3D từ ảnh Vanguard. Đường nạp `.glb` chưa viết.

### 0.9. Đợt 4: lửa phản lực theo chuỗi gõ, Vanguard dựng lại bằng mô hình 3D thật

> Mô hình Vanguard dựng bằng code trong mục này KHÔNG còn là mặc định: chủ dự án chê "nhìn như mô hình" (đồ chơi nhựa). Xem mục 0.10. Phần lửa phản lực, đèn thân tàu, nòng súng, bóng đổ và bộ vẽ chung vẫn dùng.

**Phản hồi của chủ dự án:**
- Lửa phản lực sau tàu quá nhỏ và yếu. Lửa phải to dần khi gõ đúng liên tục, và High/Ultra phải mạnh hơn hẳn.
- Tàu 3D "kiểu gì cũng ra hình 2D", chỉ xoay được chút. Cần thiết kế đẹp hơn, mượt hơn, có hiệu ứng ở mũi và cánh, chớp sáng khi bắn, sắc nét hơn.
- "Hình ảnh bị giới hạn".

**Nguyên nhân gốc:**
- Tia lửa `ShipExhaust` có kích thước cố định 1–2 px, không phóng theo cỡ tàu. Quầng sáng vòi chỉ là 2 chấm tròn.
- Khối nổi dựng từ ảnh vẽ nên giữ nguyên ánh sáng và bóng đã vẽ sẵn: góc nào cũng thấy như tranh phẳng.
- Giới hạn hình ảnh: khung 3D chặn 640 px, độ nét tối đa 1,5×, khung vuông chỉ 1,42 lần bề ngang tàu nên đầu cánh có thể bị cắt khi nghiêng mạnh.

**Lửa phản lực (`src/duel/afterburner.ts`, lớp `DuelAfterburner`):**
- Độ mạnh `power`:
  - mức nền 0,25 + 0,75 × (1 − e^(−chuỗi/45)): chuỗi 10 ≈ 0,4, chuỗi 35 ≈ 0,66, chuỗi 75 ≈ 0,85;
  - cộng nhịp theo phím: mỗi phím đúng +0,24, tối đa 1, hệ số 0,32, tắt dần e^(−3,2t);
  - lên bậc momentum thì bùng thêm (+0,35, tắt trong 1,4 s);
  - đứt chuỗi (từ ≥ 5) thì lửa chập chờn 0,7 s.
- Các lớp vẽ (đều là sprite dựng sẵn, cộng sáng): quầng sáng hắt ra không gian, hào quang màu bậc chuỗi, lửa ngoài, thân lửa, lưỡi lửa uốn lượn, lõi trắng nóng, vòng sáng nối tiếp trong luồng lửa (shock diamond), quầng ở miệng vòi, vệt lóa ống kính ngang, vòng sóng khi lên bậc.
- Bảng theo mức chất lượng `AFTERBURNER_LOOK`:

  | Mức | Độ dài | Vòng sáng | Lưỡi lửa | Vệt lóa | Hắt sáng |
  |---|---|---|---|---|---|
  | Low | 0,6 | 0 | 0 | 0 | 0 |
  | Medium | 0,85 | 0 | 0 | 0 | 0,55 |
  | High | 1,05 | 3 | 1 | 0,7 | 1 |
  | Ultra | 1,3 | 5 | 2 | 1 | 1,35 |

- Tia lửa: `ShipExhaust.update(..., size)` có thêm tham số cỡ. Với tàu mình là `ship.scale × SPARK_SIZE`: Medium 1,25, High 1,6, Ultra 1,9. Campaign giữ 1, không đổi gì.
- Lửa được vẽ đè lên thân (gần camera hơn thân). Hướng lửa lấy từ phép chiếu 3D của trục đuôi.

**Mô hình Vanguard dựng bằng code (`src/duel/vanguard-model.ts`, `buildVanguard`):**
- Theo bố cục ảnh vẽ (dài 1, mũi z = −0,5):
  - mũi pha lê;
  - buồng lái là viên ngọc 6 cạnh, cao nhất thân, có khung tối;
  - 2 vai giáp trắng, gờ sáng nối mũi với buồng lái;
  - 2 khối hông có vòng "mắt" sáng và nòng súng ở mũi khối;
  - 2 động cơ có đai sáng và loa phụt;
  - cánh xuôi có vát cạnh, cạnh trước phát sáng, thanh tối ngang cánh và khe gió;
  - khối kính xanh trong khung tối ở đầu cánh;
  - phần cánh trong tối nối thân với khối hông;
  - 2 lưỡi đuôi trắng với sống lưng phát sáng.
- Cách dựng: `loft` dựng mặt cắt dọc thân, mượt theo chiều dài nhưng giữ cạnh sắc giữa các mặt. Mỗi vật liệu gộp thành 1 mesh, tổng 8 lệnh vẽ.
- Vật liệu:
  - giáp trắng: MeshPhysical, phủ bóng 0,6, kèm texture đường ghép giáp và đinh tán dựng bằng canvas;
  - khung tối: kim loại 0,86;
  - dải sáng: emissive, texture dòng năng lượng chạy từ mũi về đuôi, nhanh dần theo chuỗi;
  - pha lê và kính: flatShading, phản chiếu mạnh.
- `tick(time, heat)` tăng độ sáng dải, kính và pha lê theo chuỗi.

**Bộ vẽ 3D chung (`src/duel/ship3d.ts`):**
- Nhận `BuiltShip`: mô hình dựng (Vanguard) hoặc khối nổi (`relief-model.ts`, tách từ bản cũ).
- `?ship3d=0` tắt (về ảnh nhìn từ sau); `?ship3d=relief` xem khối nổi cũ để so sánh.
- Bóng đổ thật: đèn chính `castShadow`, bản đồ bóng 1024, PCF mềm. Cập nhật mỗi khung trên High/Ultra, 3 khung một lần trên Medium.
- Đèn:
  - đèn động cơ sau vòi: Medium 0,9, High 1,8, Ultra 2,6 × power;
  - mỗi nòng súng 1 đèn chớp: Medium 1,6, High 3,2, Ultra 4,4; tắt dần e^(−20t);
  - đèn vụ nổ và đèn viền như cũ.
- Độ nét: High tối đa 1,75×, Ultra 2× (trước 1,5×). Khung tối đa 1024 px (trước 640). Khung rộng 1,6 lần bề ngang tàu (trước 1,42), nên khi nghiêng không bị cắt.
- Camera nâng lên 31° (trước 27°) để thấy mũi và buồng lái. Độ phơi sáng 0,88.
- Mỗi khung trả về vị trí trên màn hình của vòi, nòng súng, mũi, buồng lái, mắt và đầu cánh.

**Trong `combat-visuals.ts`:**
- `selfGun()`: đạn thường của mình xen kẽ 2 nòng ở khối hông, phát kết liễu (power ≥ `FINISHER_POWER`) bắn từ mũi. Kèm chớp đèn 3D và quầng sáng 2D ở nòng.
- `player-shots.ts` thêm `exactOrigin` để không cộng thêm vị trí nòng mặc định của công thức đạn.
- `drawShipLights()` theo bảng `SHIP_LIGHTS`:
  - đèn mũi thở nhịp, sáng theo chuỗi;
  - quầng buồng lái (High/Ultra);
  - mắt khối hông;
  - đèn đầu cánh chớp đôi mỗi 1,6 s (High/Ultra);
  - vệt khí đầu cánh khi power > 0,45 (High ×1, Ultra ×1,5).
- Chớp khi trúng đạn trên thân 3D giảm từ 0,75 xuống 0,38, vì đèn vụ nổ đã chiếu thật; lúc lên bậc mà trúng đạn thì thân không còn bị trắng xoá.

**Đo đạc (Chrome chạy ngầm, GPU Intel UHD 630):**
- Chi phí vẽ tàu mỗi khung ở Ultra: 1,1–1,2 ms (p95 1,9). Gồm dựng 3D 0,7 ms, lửa 0,1 ms, đèn ≈ 0. Ảnh 2D là 0,3 ms.
- Tải (đều ở sảnh, trễ 350 ms sau khi bấm Duel):
  - tạo WebGL context ≈ 175 ms (một lần bất thường 8 s khi trình duyệt chạy ngầm);
  - dựng mô hình 36–55 ms;
  - bản đồ phản chiếu (PMREM) 173–210 ms;
  - phần đồng bộ của biên dịch 19–26 ms, còn lại chạy nền;
  - vẽ mồi 28–42 ms: biên dịch shader bóng đổ, việc `compileAsync` không làm được. Trước khi có bước này, khung đầu trong trận khựng 33 ms.
- Trong trận, tổng long task của bản 3D ngang bản 2D.

**Kiểm chứng:**
- Test mới:
  - `duel-afterburner.test.ts`: lửa to theo chuỗi, bùng theo phím, bùng khi lên bậc, chập chờn khi đứt, bảng chất lượng tăng dần;
  - `duel-vanguard-model.test.ts`: ≤ 10 mesh, < 20k tam giác, pháp tuyến hợp lệ, đối xứng, vị trí vòi/nòng/mũi, sáng theo chuỗi.
- Đã sửa `duel-ship3d.test.ts` (chế độ `relief`).
- Vitest 1.415 pass, 1 fail cũ (`combat-vfx-sprites`: ảnh hiệu ứng cục bộ do `art:prepare` sinh). `pnpm build` PASS. Đã kiểm tra qua portal: không có exception.
- Ảnh:
  - `.visual/mlab2-lab.jpg` (các góc nghiêng và mức chuỗi);
  - `.visual/mbig3-lab.jpg` (cận cảnh);
  - `.visual/qsheet-lab.jpg` (Medium/High/Ultra × chuỗi 12/90);
  - `.visual/m3d-crops.jpg` (trong trận, Ultra);
  - `.visual/portal2-portal.jpg`.
- Trang thử: `.visual/ship3d-lab.html` (`?q=`, `?big=<roll>`, `?sheet=q`).

**Còn mở:**
1. Chờ chủ dự án chơi thử. Các thông số đều ở đầu tệp: `AFTERBURNER_LOOK`, `SHIP_LIGHTS`, `SPARK_SIZE`, `ENGINE_LIGHT`, `GUN_LIGHT`, `RESOLUTION`, `ELEVATION`.
2. Vai giáp trắng còn hơi gồ ghề ở mặt trên. Nếu muốn mịn hơn: bớt `bumpScale`, hoặc làm mặt cắt `PLATE` nhiều cạnh hơn.
3. PMREM 173–210 ms ở sảnh có thể thay bằng bản đồ môi trường nhỏ tự dựng nếu thấy khựng.
4. Tàu khác và tàu địch chưa có mô hình. Muốn chi tiết như mô hình chuyên nghiệp thì cần tệp `.glb` (đường nạp chưa viết).

### 0.10. Đợt 5: chủ dự án chọn phương án B (bức vẽ dựng nổi 3D) qua demo A/B/C

**Phản hồi:**
- Với mô hình dựng bằng code: "sao nhìn như mô hình vậy… nhìn nó xấu như mô hình".
- "Đáng lẽ bạn nên gửi tôi demo trc chứ."

**Bài học (quy tắc cho AI làm tiếp):** mọi thay đổi về hình ảnh phải gửi ảnh demo so sánh trước, cùng thời điểm và cùng góc camera. Chỉ đổi mặc định sau khi chủ dự án chọn. Hình ghép từ khối cơ bản trong code trông như đồ chơi bên cạnh tranh vẽ; hãy dùng tranh của chủ dự án, hoặc mô hình 3D do người làm hay công cụ AI dựng 3D tạo ra.

**Demo đã gửi** (Ultra, gõ thật, khoảng chuỗi 60):
- `.visual/demo-clean-ABC.jpg`: tạm ẩn khiên và hiệu ứng trúng đạn chỉ cho ảnh demo.
- `.visual/demo-ABC.jpg`: cảnh đánh thật.
- Ba phương án:
  - A: mô hình dựng bằng code;
  - B: bức vẽ dựng nổi 3D, có bóng đổ, đèn, nòng súng và lửa mới;
  - C: ảnh vẽ nhìn từ sau, xoay 2D, có lửa mới.
- Chủ dự án chọn **B** ("B cũng khá đẹp đó").

**Đã làm cho B (mặc định):**
- `ship3dMode()` mặc định là `relief`. `?ship3d=model` mở mô hình dựng bằng code, `?ship3d=0` về ảnh nhìn từ sau.
- `prepare-ship-3d.mjs`:
  - ảnh sơn dùng đủ độ phân giải (giới hạn 1600, thực tế 1170×1114; trước 1024);
  - thêm bảng `ANCHORS` đo trên tranh, ghi vào `model.json` → `anchors`: mũi (0,5; 0,03), buồng lái (0,5; 0,35), mắt (0,258/0,742; 0,568), nòng súng ở mũi khối hông (0,262/0,738; 0,375), đầu cánh (0,045/0,955; 0,735). Ảnh kiểm tra: `.visual/anchors.jpg`.
- `relief-model.ts` đặt các điểm này lên bề mặt nổi của tranh (độ cao lấy từ `height.bin`). Nhờ vậy B có đủ đèn mũi, buồng lái, mắt, đèn chớp và vệt khí đầu cánh, đạn bắn từ 2 nòng có chớp sáng, cùng bóng đổ như mục 0.9.
- Tia lửa: `SPARK_SIZE` đổi thành Medium 1, High 1,12, Ultra 1,25, nhân với √scale (trước nhân thẳng scale nên trông như bong bóng).

**Đo:**
- Vẽ tàu mỗi khung: Ultra 0,9 ms (dựng 3D 0,5), Medium 0,6 ms.
- Sảnh: bước lâu nhất 171–224 ms.
- Trong trận, tổng long task 3D 478/565/567 ms so với 2D 480/436/539 ms: ngang nhau.

**Kiểm chứng:**
- Vitest 1.415 pass, 1 fail cũ (`combat-vfx-sprites`).
- `pnpm build` PASS. Đã kiểm tra qua portal: `.visual/portal3-portal.jpg`, không có exception.

**Còn mở:**
- Muốn 3D vừa thật vừa chi tiết như tranh thì cần mô hình `.glb` từ công cụ AI dựng 3D (Meshy, Tripo…). Mới chỉ đề xuất; chủ dự án chưa trả lời.

### 0.11. Đợt 6: chuẩn bị 3D cho cả 10 tàu còn lại, lửa lúc nghỉ, khoảng cách địch, giải thích vũ khí

**Yêu cầu của chủ dự án:**
- Lửa lúc chưa gõ quá nhỏ ("ủa sao vẫn vậy nhỉ").
- Muốn tàu địch xa hơn một chút.
- Không hiểu khi nào tên lửa và vũ khí khác được bắn.
- "Bắt đầu làm tương tự cho các phi thuyền luôn", rồi: "phải tạo hình ảnh cho từng loại phi thuyền chứ ảnh 2D khả năng k dùng đc".

**Lửa lúc nghỉ (đã gửi demo `.visual/demo-flame-idle.jpg`; chủ dự án trả lời "khá tốt r"; CHƯA build):**
- `afterburner.ts`: `IDLE` 0,45 (trước 0,25), `RUN` 0,6.
- Sprite lửa phai chậm hơn (mũ 0,95), lõi nóng dài 0,6L.
- Test `duel-afterburner.test.ts` đã cập nhật.

**Tàu địch xa hơn (CHỜ CHỌN, chưa đổi code):**
- Demo `.visual/demo-rival-distance.jpg`: hiện tại (21%, khoảng 1/3 cỡ tàu mình), xa hơn chút (17%, 1/3,7), xa hơn nữa (14%, 1/4,5).
- Khi chọn: sửa `battle-juice.css` (`.duel-rival-zone .duel-ship-frame` top/width, `.duel-opponent-charge` top). Đạn tự theo phối cảnh mới.

**Vũ khí (đã giải thích cho chủ dự án):**
- Đạn thường: cứ 2 chữ đúng là 1 phát.
- Vũ khí lớn: gõ từ hiện dưới vật phẩm. Cần năng lượng: vào trận có 25, gõ ENERGY được +22.
- Mốc chuỗi chỉ nạp sát thương cho đòn tấn công kế tiếp.
- Chỗ thiếu: SIEGE LANCE không gọi `fire()` (chỉ có `threat-created` và `threat-resolved`); không có màn hướng dẫn Duel.
- Đề xuất A–D (ghi rõ trên vật phẩm, chữ phóng vũ khí, thẻ hướng dẫn, thanh năng lượng): CHỜ chủ dự án chọn, phải gửi demo trước.

**3D cho các tàu khác:**
- `scripts/bg-art/prepare-ship-3d.mjs` viết lại để chạy cho mọi tàu:
  - Lửa vẽ sẵn: dò theo cụm pixel sáng (bão hoà, hoặc lõi trắng) ở nửa dưới, treo ở đáy hình, kéo dài theo chiều dọc và thon dần. Không phụ thuộc màu hay số động cơ. Động cơ chỉ tìm thấy một bên thì lấy đối xứng sang bên kia.
  - Màu: `colors` = hot/plume/outer lấy từ lửa, `accent` lấy từ vùng phát sáng của thân.
  - Mốc: mũi, đầu cánh, buồng lái (cụm phát sáng lớn nhất gần trục giữa). Nòng súng đổi từ `MUZZLES` của công thức đạn sang toạ độ ảnh mới, rồi hút về điểm gần nhất trên thân.
  - Bảng `ANCHORS` (cả `nozzles`) để chỉnh tay. `KEEP` giữ Vanguard (dữ liệu đã duyệt, không tự tạo lại). `COLORS` của Vanguard là màu bộ đèn cũ.
  - Nhận nền `#FF00FF` nếu ảnh không trong suốt.
  - `--sheet-test` chạy thử trên ảnh 256 px trong `player-ships-v3.webp`, ghi ra `.visual/ship3d-sheet-test/` cùng `overlay.jpg`.
  - Mỗi lần chạy thật đều ghi `.visual/ship3d-overlay.jpg` để kiểm tra.
- Game:
  - `relief-model.ts` đọc `colors`.
  - `DuelShip3D.colors`.
  - `combat-visuals.ts`: lửa, tia lửa (giờ có cho mọi tàu, không cần bộ đèn riêng) và đèn thân dùng màu của tàu. Vanguard không có `accent` nên giữ nguyên các màu xanh cũ.
- Đã kiểm tra trọn đường chạy bằng dữ liệu Aegis từ ảnh nhỏ (tạm thời, đã xoá): `.visual/aegis-check.jpg` cho thấy 3 luồng lửa xanh ngọc, đèn xanh, nghiêng 3D.
- Ảnh nét cao: chủ dự án muốn có ảnh mới cho từng tàu. Tệp yêu cầu là `docs/art-requests/ship-top-hd/SHIP_TOP_HD_PROMPTS.md`, kèm `<id>-reference.png` (512 px). Lưu thành `art-src/ships/<id>-top-hd.png`, rồi chạy `pnpm ship3d:prepare <id>`, xem overlay, và gửi demo trước khi bật.

### 0.12. Đợt 7: ảnh nét cao của 10 tàu (Codex) và tàu địch 3D

**Ảnh của Codex:**
- `output/ship-top-hd-10-claude-review-v1/` (gói kiểm tra, không đưa lên git).
- Claude đã soi từng ảnh với ảnh mẫu (`.visual/ships10-review.jpg`): cả 10 đúng thiết kế, nét, nền trong suốt thật.
- Các điểm Codex nêu đều không ảnh hưởng pipeline:
  - lề hẹp 92–96%: pipeline cắt theo khung bao, có thêm lề 1,5%;
  - alpha thân 252–253: pipeline dùng ngưỡng 128;
  - chi tiết rời (vòng hào quang, sao, tinh thể): nổi thành khối mỏng, mốc vẫn đúng.
- Đã chép vào `art-src/ships/<id>-top-hd.png` (Aegis trùng khít bản đã duyệt), rồi chạy `pnpm ship3d:prepare <10 id>`.
- Kiểm tra bằng overlay `.visual/ship3d-overlay.jpg`:
  - số động cơ: Aegis 3, Arsenal 2, Bastion 3, Celestial 1, Fortune 2, Oracle 3, Reaper 2, Volt 2, Wraith 2, Zenith 3. Tranh mới của Arsenal và Reaper thật sự chỉ có 2 lửa; ở giữa là mũi nhọn;
  - nòng súng, mũi, đầu cánh, buồng lái đều đúng;
  - lửa cắt sạch; đường cắt lùi xuống 1% chiều cao để giữ viền sáng của miệng phụt (`+ Math.round(h * 0.01)`).
- Ảnh tổng hợp 11 tàu 3D: `.visual/allships-lab.jpg` (trang `.visual/ships-all-lab.html`).
- Demo Aegis trong trận: `.visual/demo-aegis.jpg`.

**Tàu địch 3D (`drawRival3D` trong `combat-visuals.ts`; vai trò `rival` trong `ship3d.ts`):**
- Cùng dữ liệu hull, quay 180° (mũi về phía bạn), nghiêng theo đường lượn.
- Camera 58°: ở 31° tàu xa nhỏ bị dẹt thành một vệt.
- Cỡ bằng bản 2D (78 px × scale) để vẫn trông xa.
- Lửa ngắn (×0,55) vẽ sau thân. Đèn mũi và chớp nòng theo màu tàu; đạn địch bắn từ nòng 3D (`rivalGun`).
- Bản nhẹ: không bóng đổ, không PMREM, độ nét tối đa 1,5×, lưới 96 ô (tàu mình 176).
- Thời điểm nạp:
  - `preload` nạp tàu mình trước, xong mới tới tàu địch;
  - `battle-ui` gọi `preload` khi `round.status !== "active"` và đặt `setShip3DCalm`;
  - các bước nạp nặng của tàu địch (`step()`) tạm dừng khi đang có hiệp đấu, nạp tiếp lúc nghỉ giữa hiệp;
  - chưa sẵn sàng thì tàu địch giữ bản 2D.
- `?rival3d=0` để so sánh với bản 2D. Demo: `.visual/demo-rival-reaper.jpg` (cảnh sạch, theo vị trí tàu địch).
- Đo (máy đang bận, số nhiễu):
  - tàu mình sẵn sàng sau khoảng 1,5–3 s từ lúc mở sảnh, tàu địch sau đó thêm khoảng 1–2 s;
  - lần cả 2 nạp xong trong sảnh: trận đánh không khựng thêm (tổng long task 725 ms, lớn nhất 213 ms);
  - lần máy quá tải, tàu mình nạp 4–6 s, còn tàu địch tự dừng và giữ 2D.

**Kiểm chứng:**
- Vitest pass, trừ lỗi alpha cũ (`combat-vfx-sprites`). Đã sửa test 3D: Arsenal có 4 nòng theo công thức đạn.
- `pnpm build` PASS. Build này đã cập nhật bản portal đang chạy TRƯỚC khi chủ dự án duyệt. Đã báo chủ dự án; gỡ phần nào nếu không duyệt.

**Còn mở:**
- Chủ dự án duyệt 10 tàu 3D và tàu địch 3D.
- Khoảng cách tàu địch: mức 17% hay 14%.
- Các mục A–D về hướng dẫn vũ khí.

### 0.13. Đợt 8: tàu địch đúng tàu của đối thủ, bot ra tàu ngẫu nhiên

**Phản hồi:** "sao tàu địch lại chỉ có 1 mẫu"; tàu địch phải là tàu người chơi kia chọn, bot phải ngẫu nhiên.

**Nguyên nhân gốc (lỗi có từ trước):**
- Phòng bạn bè: client không bao giờ gọi `setLoadout`, nên `slot.characterId = null` và `battle-ui` rơi về Vanguard (mình) / Reaper (địch) cho cả hai bên.
- Ranked: `startRankedMatch` gán cứng Vanguard / Reaper.
- Bot (Practice và bot trong phòng): không gán tàu, nên luôn là Reaper.

**Đã sửa:**
- `room.ts`:
  - `randomDuelBotCharacter(exclude, random)`;
  - `setBot` cho bot mới một tàu ngẫu nhiên theo mã phòng (`seededRandom(roomId)`, ổn định trong một phòng). Bot được chỉnh lại thì giữ tàu cũ; tránh trùng tàu của chủ phòng;
  - `peekPracticeBotCharacter` / `takePracticeBotCharacter`: bốc tàu bot Practice ngay khi mở sảnh để `main.ts` nạp sẵn 3D, rồi dùng đúng tàu đó khi bấm Practice (`startLocalDuelPractice` ghi đè `slots[1].characterId`).
- `online-room-controller.ts`: config thêm `characterId()` (main truyền `characters.selected`) và `onRoomSnapshot`. Khi có snapshot phòng, gửi `client.setLoadout(roomId, { characterId })` một lần cho mỗi cặp phòng + tàu.
- `main.ts`: `onRoomSnapshot` nạp sẵn 3D tàu đối thủ ngay trong phòng chờ.
- Ranked:
  - `QUEUE_RANKED` có thêm `characterId` tuỳ chọn (`protocol.ts`; client cũ không gửi vẫn được chấp nhận);
  - `ws-server` gọi `authority.setRankedCharacter()` (bỏ qua mã tàu lạ);
  - `startRankedMatch` dùng tàu của từng session, chỉ dùng Vanguard / Reaper khi client không gửi.
  - Lưu ý: `exactKeys` chỉ kiểm tra không có khoá lạ, không đòi đủ khoá; phải dò `"characterId" in value`.
- Tàu địch 3D chạy cho mọi tàu (cả 11 đều có dữ liệu). Màu lửa và đạn đúng theo tàu.

**Kiểm chứng:**
- Test mới:
  - `duel-bot-hull.test.ts`: ngẫu nhiên, loại trừ tàu chủ phòng, đa dạng giữa các phòng, giữ tàu khi chỉnh bot, bốc trước rồi dùng;
  - `duel-authority`: Ranked dùng tàu từng người, mã lạ thì dùng mặc định;
  - `duel-protocol`: hàng chờ có kèm tàu.
- Đã sửa `duel-local-match` (tàu bot ổn định theo phòng, không còn cố định Reaper).
- Vitest 1.420 pass, 1 fail cũ. `pnpm build` PASS.
- Demo: `.visual/demo-random-rival.jpg` (4 lần Practice: Celestial, Bastion, Celestial, Zenith).
- Chưa thử bằng 2 client thật. Cần khởi động lại backend Duel (`pnpm duel:local:restart`) để máy chủ nhận giao thức mới; client mới gửi `characterId` tới server cũ sẽ bị từ chối lệnh vào hàng chờ.

### 0.14. Đợt 9: 5 loại vũ khí có hình, vệt sáng, vụ nổ và âm thanh riêng

**Yêu cầu:** "làm hết luôn 5 loại": đạn trông 3D, vụ nổ đẹp và bùng nổ, âm thanh bùng nổ, vệt sáng sau đạn đẹp.

**Hiện trạng trước khi sửa** (đã chụp khi máy tự chơi; gõ đúng từ là phóng đúng vũ khí và gây đúng sát thương):
- Mọi vũ khí bay bằng hình viên đạn của tàu, chỉ khác số viên, độ to và khói.
- SIEGE LANCE không có gì bay ra (chỉ có `threat-created` và `threat-resolved`).
- Trúng khi địch còn khiên thì chỉ có gợn sóng khiên, không có vụ nổ.

**Đã làm:**
- `src/duel/ordnance.ts` (`DuelOrdnance`). Hình vẽ sẵn có đổ sáng; đường bay theo phối cảnh (`perspective()`: thân nhỏ và chậm dần khi bay xa, to và nhanh dần khi lao tới); vệt sáng là dải cộng sáng 18 điểm.
  - LASER: 2 tia thuôn từ 2 nòng, dài dần trong 35% thời gian bay; xung sáng chạy dọc tia; toé lửa ở điểm chạm; nổ khi tới.
  - MISSILE: 3 quả cách nhau 7% thời gian bay. Thân có đổ sáng, 8 khung xoay quanh trục, dải băng màu tàu, lửa đuôi (`drawFlameStreak`), dải sáng màu lửa và khói (`juice.trail`). Bay vòng sang bên rồi lao vào (`lateral`); mỗi quả một vụ nổ.
  - RAILGUN: 72% thời gian đầu tụ sáng ở mũi (tia hội tụ, vòng); sau đó viên siêu tốc kèm vệt sáng thuôn. Lúc rời nòng tạo 4 vòng sóng hình elip dọc đường bay. Khi trúng có vệt xuyên qua sau địch và vệt sáng đọng lại 0,4 s.
  - BOMB: quả cầu kim loại, lõi đập theo nhịp, 2 vòng năng lượng quay kiểu 3D (nửa sau vẽ dưới, nửa trước vẽ trên quả cầu), đuôi sao chổi, đường cong. Khi trúng có vòng sóng lớn và chớp sáng.
  - SIEGE LANCE: `lanceCharge` / `lanceStrike` / `lanceBreak`, do `battle-ui` gọi theo `threat-created` / `threat-resolved` / `threat-countered`. Giáo pha lê to dần ở mũi, có đường ngắm nét đứt, năng lượng hội tụ, vòng sóng 2 lần mỗi giây. Hết giờ thì phóng tia khổng lồ (vụ nổ vẫn do `impactShip` vẽ); bị chặn thì giáo vỡ thành mảnh.
  - Precision ordnance và combo dùng cùng hệ thống (`combo` = bầy 4 tên lửa).
- `combat-visuals.ts`:
  - `ORDNANCE` ánh xạ variant sang loại vũ khí; `launchOrdnance()` chọn nòng: tên lửa và laser dùng 2 nòng 3D (kèm chớp nòng), railgun và bomb bắn từ mũi; tàu 2D dùng độ lệch tính từ tâm;
  - `weaponColor` lấy màu đạn của tàu;
  - đạn gõ phím (cannon) giữ nguyên hệ thống cũ.
- `shipPoint()` giờ trả vị trí đang lượn, nên vụ nổ và chữ nằm đúng trên tàu. Trước đây lấy vị trí gốc nên lệch.
- `combat-juice.ts`: vũ khí nặng trúng khiên vẫn nổ (cầu lửa, tàn lửa, khói, sóng) ngay trên mặt khiên. `launch(..., beams=false)` để bỏ tia cũ của railgun.
- Âm thanh: `audio.ts` hẹn giờ khớp hình; `duel-sound.ts` thêm các cue:
  - `beam-launch` / `beam-impact` (LASER; đạn gõ phím vẫn dùng `laser-launch`);
  - `missile-launch` / `missile-impact` theo `step` (3 lần phóng cách 65 ms, 3 vụ nổ lúc travel × 1 / 1,07 / 1,14);
  - `rail-charge` (lúc 0, `seconds` = 72% thời gian bay), `heavy-launch` lúc 72%, `rail-impact` lúc tới;
  - `bomb-impact` thêm tiếng mảnh vỡ (`debris()`);
  - `lance-charge` dâng dần suốt thời gian chờ chặn, `lance-impact` (cực lớn), `lance-break`.
  - Tất cả giữ đúng giới hạn chống "tinh tinh" (test kiểm tra cả cue mới).
  - Đo offline ở master 0,5, độ to 100 ms: rail-charge −16, beam-launch −15,6, beam-impact −10,2, missile mỗi quả −10,7, rail-impact −8,8, bomb −8,8, lance-impact −8,3, KO −6,9.

**Kiểm chứng:**
- Test mới `duel-ordnance.test.ts`. Đã sửa `duel-audio` (laser là `beam-*`, lance có charge và break, nhịp tên lửa và railgun) và `duel-sound` (thêm cue mới vào kiểm tra).
- Vitest 1.425 pass, 1 fail cũ.
- Ảnh:
  - `.visual/weapons-new-overview.jpg` (5 vũ khí × 5 thời điểm, gọi `fire()` giống hệt khi gõ xong từ);
  - `.visual/olab-lab.jpg` (trang thử `.visual/ordnance-lab.html`, dải khung lúc bay);
  - ảnh trước khi sửa: `.visual/weapons-overview.jpg`.
- Hiệu năng (Ultra, hai bên bắn liên tục, 21 vũ khí cùng bay): vẽ vũ khí 0,5 ms (p95 0,7); render tổng 3,0 ms so với 1,8 ms lúc không bắn.
- Ghi chú: Chrome chạy ngầm đôi khi chụp ra khung vỡ (ô lặp lại) trong vài giây đầu trận. Đó là lỗi của trình duyệt khi chụp, không phải của game.
- CHƯA build vào portal: chờ chủ dự án duyệt demo.

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

