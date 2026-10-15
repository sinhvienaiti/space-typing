# Space Typing — Hệ thống nhạc nền: tài liệu bàn giao

> **Ngày:** 29/09/2026 · **Người viết:** Claude Code · **Người nhận:** ChatGPT/Codex làm tiếp, và chủ dự án.
>
> Thay cho tài liệu cũ `MUSIC_WORLD_01.md`: bài World 01 cũ "Signal in the Void" nay là 1 trong 13 bài của thư viện, và đã có đoạn mở/kết để nối bài.

## 1. Chủ dự án muốn gì

> *"làm 1 hệ thống âm nhạc trong game, không chỉ là 1 bài nhạc xuyên suốt cả game, mà là có nhiều bài theo các map hiện tại, có buồn, có vui, có thư giãn, có lãng mạn, có trầm lắng, có cao trào, có cô đơn, có u ám, có rực lửa, bốc cháy, có nhẹ nhàng… theo từng map hoặc có option random, nó sẽ tự chuyển qua bài random khác khi hết bài… khi chuyển bài cũng không có cảm giác bị ngắt giữa chừng, mà cảm tưởng việc giao thoa giữa 2 bài rất là mềm mượt."*

## 2. Kết quả

- **13 bài**, mỗi bài có 2 bản cùng độ dài, cùng nhịp:
  - **êm** (`calm`, phát ở `WORLD_NORMAL`);
  - **căng** (`intense`, phát ở `WORLD_INTENSE`).
- Game tự đổi giữa 2 bản theo nhịp trận, **tại đúng vị trí đang phát**. Dài 2:03–2:40 mỗi bài, tổng khoảng 30 phút nhạc, 38 MB (Opus 64 kbps).

| Bài | Tâm trạng | Giọng · nhịp | Nhạc cụ chính |
|---|---|---|---|
| Signal in the Void | hồi hộp (suspense) | La thứ · 112 | chuông pha lê / lead, trống nửa nhịp / 4 phách |
| Starlit Lullaby | nhẹ nhàng (gentle) | Rê trưởng · 84, **3/4** | hộp nhạc, pad trong, dây, sáo |
| Ember Rush | rực lửa (fiery) | Mi Phrygian trưởng · 142 | kèn đồng / lead rè, taiko, rock |
| Molten Crown | bốc cháy (blazing) | Đô thứ · 126 | dây, hợp xướng, kèn, trống hùng tráng |
| Glass Solitude | cô đơn (lonely) | Si thứ · 72 | piano nỉ, sáo, pad trong, tiếng băng |
| Crystal Echoes | trầm lắng (contemplative) | Fa# Dorian · 84 | chuông, hợp xướng "oo", tiếng vang |
| Canopy Breeze | thư giãn (relaxing) | Fa trưởng · 88 | piano điện, sáo, bass đi bộ, trống lo-fi đung đưa, tiếng đĩa than |
| Sunseed Parade | vui (happy) | Sol trưởng · 120 | pluck, chuông, bass nảy, trống shuffle |
| Hollow Roots | u ám (gloomy) | Rê thứ · 68 | nền trầm (drone), hợp xướng thấp, nhịp tim |
| Forge of Stars | cao trào (climactic) | Rê thứ · 128 | ostinato, kèn, búa đe, 4 phách |
| Aurora Serenade | lãng mạn (romantic) | Mi giáng trưởng · 76 | dàn dây, piano điện, chuông |
| Requiem of Light | buồn (sad) | Fa thứ · 66 | organ, hợp xướng, piano |
| Eternity Gate | hùng tráng (triumphant) | Đô thứ → Mi giáng · 134 | kèn, hợp xướng, taiko |

- **Hai chế độ** (Cài đặt → Sound → *Music mode*):
  - **By map** (mặc định): mỗi Galaxy có danh sách 3 bài hợp chủ đề. Mỗi World bắt đầu ở một bài khác trong danh sách đó. Hết bài thì sang bài kế. Sang World mới thì chuyển sang nhạc của World đó.
  - **Random**: trộn cả 13 bài. Không bài nào phát 2 lần liền nhau, và phải phát đủ cả 13 bài mới lặp lại. Đổi World cũng không cắt ngang bài đang phát.
- **Now playing** và nút **Next track ⏭** nằm trong Cài đặt. Khi đổi bài, một thẻ nhỏ "♪ Tên bài · Tâm trạng" hiện 4 giây ở góc phải dưới.
- Nhạc boss, cửa hàng, thắng, thua giữ nguyên như cũ. Hết đoạn boss thì nhạc bản đồ quay lại bằng **bài kế tiếp**, bắt đầu từ đoạn mở.

| Galaxy | Danh sách (World đầu tiên của Galaxy bắt đầu từ bài 1; World thứ 2 từ bài 2…) |
|---|---|
| 1 Celestial | Signal in the Void · Starlit Lullaby · Sunseed Parade |
| 2 Infernal | Ember Rush · Molten Crown · Forge of Stars |
| 3 Frost Prism | Glass Solitude · Crystal Echoes · Aurora Serenade |
| 4 Verdant | Canopy Breeze · Sunseed Parade · Starlit Lullaby |
| 5 Shadow Nature | Hollow Roots · Glass Solitude · Signal in the Void |
| 6 Cosmic Forge | Forge of Stars · Molten Crown · Ember Rush |
| 7 Abyssal | Hollow Roots · Requiem of Light · Glass Solitude |
| 8 Aurora Cosmic | Aurora Serenade · Crystal Echoes · Starlit Lullaby |
| 9 Void Cathedral | Requiem of Light · Crystal Echoes · Hollow Roots |
| 10 Eternity | Eternity Gate · Forge of Stars · Molten Crown |

## 3. Vì sao chuyển bài mượt

Chuyển bài dễ bị "ngắt" vì 3 lý do:
1. Hai bài đè nhau đúng lúc cả hai đang có trống và giai điệu, nên nhịp và hợp âm đá nhau.
2. Hoà âm lượng thẳng (tuyến tính) làm tụt khoảng 3 dB ở giữa.
3. Bài mới còn đang tải lúc bắt đầu chuyển.

Cách xử lý:

1. **Bài được soạn để nối:**
   - Mỗi bài mở bằng đoạn thưa, âm lượng tăng dần trong nửa ô nhịp đầu. **Trống chỉ vào sau 7 giây đầu**, nên không bao giờ đè lên đoạn kết của bài trước.
   - Mỗi bài kết bằng đoạn thưa dần; 2 ô nhịp cuối chỉ còn hợp âm chủ ngân, rồi tiếng vang tắt dần tới im lặng.
2. **Điểm bắt đầu chuyển (`mixOut`)** = 6,5 giây trước khi hết nhạc, ghi sẵn cho từng bài.
3. **Hoà âm lượng giữ công suất** (equal-power: bài vào theo sin, bài ra theo cos), dài 7 giây khi hết bài, kèm **quét lọc âm**:
   - bài cũ tối dần (lọc thông thấp từ 18 kHz xuống khoảng 520 Hz), như đang trôi xa;
   - bài mới sáng dần (từ khoảng 1,1 kHz mở hẳn ở 70% đoạn chuyển).
4. **Web Audio:** sau cú bấm hoặc phím đầu tiên, mỗi bài chạy qua `MediaElementAudioSourceNode` → bộ lọc → `GainNode`. Âm lượng đổi mượt từng mẫu âm thanh, và bộ lọc hoạt động được.
   - Trước cú bấm đầu tiên, khi chạy test, hoặc khi trình duyệt không có Web Audio: tự lùi về chỉnh `audio.volume`. Vẫn có đường cong giữ công suất, chỉ không có bộ lọc.
5. **Nạp trước:**
   - 20 giây trước khi chuyển, bài kế đã được tải sẵn (đúng bản êm hoặc căng đang cần).
   - Sau 3 giây phát, bản còn lại của bài hiện tại cũng được tải sẵn và tạm dừng. Nhờ vậy chuyển êm ↔ căng gần như tức thì. Bản vừa hoà ra được giữ lại, tạm dừng, để lần chuyển ngược lại dùng ngay.
6. **Chuyển êm ↔ căng:**
   - dài tối thiểu 1,2 giây;
   - dùng đường cong nằm giữa tuyến tính và giữ công suất, vì 2 bản có chung nhiều phần nên cộng tiếng một phần;
   - khớp lại vị trí khi bản mới thật sự bắt đầu phát.

**Đo được** (`pnpm music:handovers`, giả lập đúng cách game chuyển, trên 28 cặp bài liền nhau trong các danh sách):
- không có khoảnh khắc nào im lặng;
- độ to lúc chuyển chỉ thấp hơn tối đa 3,3 dB và cao hơn tối đa 4,1 dB so với trước và sau khi chuyển;
- các cặp trái tâm trạng có thể gặp ở chế độ Random (rực lửa → buồn, buồn → vui…): trong khoảng −3,7 đến +1,2 dB.

Trong Chrome thật:
- chuyển êm → căng lệch vị trí chỉ 8 ms;
- tự sang bài đúng điểm `mixOut`;
- bài mới chạy qua Web Audio.

## 4. Cấu trúc code

| File | Vai trò |
|---|---|
| `src/audio/music-library.ts` | Thư viện: kiểu `MusicTrack`, `MOOD_LABELS`, `GALAXY_PLAYLISTS`, `worldPlaylist(worldId)` (xoay theo vị trí World trong Galaxy), `ShuffleBag` (chế độ Random) |
| `src/audio/music-tracks.json` | **Sinh tự động** bởi `pnpm music:render`: tên, tâm trạng, giọng, nhịp, độ dài, `mixOut`, đường dẫn 2 bản kèm `?v=<sha>` (để chế độ Play không dùng bản cũ trong bộ nhớ đệm) |
| `src/audio/MusicController.ts` | Bộ phát. Phần mới: `setPlaybackMode`, `skipTrack`, `getNowPlaying`, `onNowPlaying`, tự sang bài (`checkSongProgress` mỗi 250 ms và sự kiện `ended` làm dự phòng), nạp trước (`warmNext`, `warmStem`), `fadeCurves`/`handoverCutoffs`, đường ra Web Audio (`createOutput`). Nhạc boss, cửa hàng, thắng, thua, hạ nhạc khi đọc phát âm, tạm dừng, file dự phòng: giữ nguyên |
| `src/audio/music-profile.ts` | Bỏ bảng `WORLD_THEMES` cũ. Các bài chung cũ chỉ còn là dự phòng khi thư viện trống |
| `src/main.ts`, `index.html`, `src/styles.css`, `src/types.ts` | Cài đặt `musicMode` (mặc định `"map"`), dòng Now playing, nút Next track, thẻ `#musicToast`. Có tay cầm gỡ lỗi `window.__spaceTypingMusic`, **chỉ ở bản dev** |
| `scripts/music/synth.mjs` | Bộ tổng hợp gốc (pad, pluck, chuông, lead có thêm `drive`, bass, trống, hiệu ứng, reverb, delay, sidechain, đo LUFS, master) |
| `scripts/music/instruments.mjs` | Nhạc cụ mới: piano điện (`keys`), piano nỉ, dàn dây, hợp xướng, sáo, hộp nhạc, organ, kèn đồng, taiko, shaker, gõ vành, nền trầm (drone), tiếng lửa/đĩa than, tiếng băng lấp lánh, búa đe |
| `scripts/music/theory.mjs` | Đọc tên hợp âm (`Am`, `Fmaj7`, `Bb/D`, `E7`…), xếp nốt chuyển mượt (voice leading), nốt bass |
| `scripts/music/song-engine.mjs` | Máy phối khí: `timeline` (các đoạn, ô nhịp, độ căng từng bản), `renderStem` (pad, bè đối, bass, arp, giai điệu, trống 12 kiểu, hiệu ứng, nền âm thanh), `mixStem` (tự cân bằng theo số đo, delay, reverb, độ to mục tiêu, báo độ to từng đoạn) |
| `scripts/music/songs/*.mjs` + `index.mjs` | "Bản thiết kế" của 13 bài: hợp âm, giai điệu (từng ô nhịp `[nốt, số phách]`), các đoạn và độ căng `[êm, căng]`, bảng nhạc cụ |
| `scripts/music/render-songs.mjs` | Dựng (song song), nén Opus, ghi `music-tracks.json` |
| `scripts/music/transition-check.mjs` | Đo độ mượt khi chuyển bài |
| `scripts/check-audio-assets.mjs` | Khi build: mọi tệp trong `music-tracks.json` phải có, đúng định dạng Ogg, và mã `?v=` khớp nội dung |
| Test | `tests/music-playlist.test.ts` (15), `tests/music-controller.test.ts`, `tests/music-profile.test.ts`, `tests/m22-audio-audit.test.ts` (đã cập nhật: nhạc bản đồ không lặp một bài; chuyển êm ↔ căng tối thiểu 1,2 giây) |

## 5. Lệnh

```bash
cd games/space-typing
pnpm music:render                               # dựng lại 13 bài (7 bài song song, khoảng 4–5 phút)
pnpm music:render --song=ember-rush             # một bài
node scripts/music/render-songs.mjs --song=ember-rush --stem=calm --bars=12 --preview=.visual/music   # nghe thử 12 ô nhịp (WAV)
pnpm music:handovers                            # đo độ mượt chuyển bài (bản êm)
pnpm music:handovers --stem=intense --pair=ember-rush,requiem-of-light
pnpm build:space                                # rồi tải lại trang trong Portal
```

- Cần `ffmpeg` có `libopus`. Máy chủ dự án có ở `/usr/local/bin/ffmpeg`.
- Mỗi lần dựng in ra: độ to (LUFS), đỉnh, độ to từng đoạn (đường "lên xuống" của bài), mức từng nhạc cụ trước khi cân bằng, dung lượng.
- Kiểm tra trong Chrome (máy chủ dev cổng 3098): `pnpm -s visual:shot "http://127.0.0.1:3098/" .visual/music.png --click=#startButton --eval="window.__spaceTypingMusic.getDebugSnapshot()"`.
  - `visual:shot` giờ **bấm chuột thật** qua DevTools, nên được tính là thao tác của người dùng: Chrome cho phát tiếng, Web Audio bật được.

## 6. Thêm hoặc sửa bài

1. Viết `scripts/music/songs/<id>.mjs`, sao chép một bài cùng kiểu rồi sửa. Các trường:
   - `bpm`, `meter` (3 hoặc 4), `progressions` (mỗi phần tử là 1 ô nhịp; `"Am G"` là 2 hợp âm trong một ô);
   - `themes` (mỗi ô nhịp phải đủ số phách; nếu thiếu, script báo lỗi ngay);
   - `sections`: `energy: [êm, căng]` từ 0 đến 1, `ramp`, `build` (tiếng rít dâng và cuộn trống), `echo` (giai điệu vọng qua delay), `heartbeat`, `ticks`, và `ending` ở đoạn cuối;
   - `palette`:
     - `pad`/`counter`: `supersaw`, `glass`, `strings`, `choir`, `organ`, `keys`, `piano`;
     - `arp`: `pluck`, `musicbox`, `piano`, `keys`, `bell`, `ostinato`;
     - `melody.kind` theo từng bản: `bell`, `keys`, `piano`, `flute`, `musicbox`, `brass`, `strings`, `choir`, `lead`, `dist`;
     - `bass`: `sub`, `pulse`, `drive`, `bounce`, `walk`, `drone`;
     - `drums`: `none`, `heartbeat`, `half`, `four`, `rock`, `tribal`, `epic`, `lofi`, `shuffle`, `waltz`, `ballad`, `requiem`;
     - `texture`: `air`, `fire`, `ice`, `deep`, `vinyl`, `forge`;
     - `swing`, `room`;
   - `loudness`, `finalNote`.
2. Thêm vào `songs/index.mjs`, thêm tâm trạng mới vào `MusicMood`/`MOOD_LABELS` nếu cần, và xếp vào `GALAXY_PLAYLISTS`.
3. `pnpm music:render --song=<id>`, rồi `pnpm music:handovers` (chỗ lặng nên ≥ −4 dB, chỗ to lên ≤ +4,5 dB, không có chỗ im lặng), rồi `pnpm test && pnpm build`.

## 7. Lỗi đã gặp khi làm

1. **Game lỗi ngay lúc khởi động** (`Cannot access 'lastToastSong' before initialization`): bộ phát báo "đang phát" ngay khi tạo, lúc biến của thẻ thông báo chưa được khai báo. Test tự động không bắt được, **chỉ lộ ra khi chạy thật trong Chrome**. Đã chuyển khai báo lên trước.
2. **`visual:shot` bấm bằng `el.click()`**, không được tính là thao tác người dùng, nên Chrome chặn phát tiếng: Web Audio không bật, bài đứng yên ở giây 0. Đã đổi sang bấm chuột thật.
3. **Chỗ lặng tới −5,4 dB và chỗ to lên tới +5,4 dB lúc chuyển bài.** Thử đổi mức lọc thì hầu như không đổi. Nguyên nhân thật:
   - đoạn kết bài cũ và đoạn mở bài mới đều tự nhỏ dần hoặc nhỏ, cộng dồn với đường cong chuyển;
   - trống của đoạn mở bản căng đè lên đoạn kết bài cũ.

   Cách xử lý: trống vào sau 7 giây, và `mixOut` lùi về 6,5 giây trước khi hết nhạc.
4. **Trong vòng lặp zsh, `$combo` không tự tách thành nhiều tham số.** Phải dùng `${=combo}`, nếu không công cụ đo ra toàn số 0.
5. **Ảnh phổ của ffmpeg (thang log) dễ đọc nhầm mức nhạc cụ.** Hãy tin số đo theo dải tần hoặc cờ `--balance` (đã ghi trong tài liệu cũ).

## 8. Việc còn lại

1. **P0 — Chủ dự án nghe duyệt** từng bài (Next track để nghe nhanh). Góp ý thường gặp và chỗ sửa:
   - nhanh/chậm → `bpm`; buồn/vui → hợp âm và giai điệu;
   - nhạc cụ nào to/nhỏ → `balance` trong bản thiết kế bài (cộng/trừ dB theo vai trò);
   - to/nhỏ cả bài → `loudness`.
2. **P1 — Thêm bài** cho các Galaxy (mỗi Galaxy 3 bài là tối thiểu). Mỗi bài thêm khoảng 2,5 MB.
3. **P2 — Nhạc boss và cửa hàng** vẫn là các bài chung cũ (`urgent.ogg`, `pulse.ogg`…). Có thể soạn bằng cùng máy phối khí: một bản thiết kế với `drums: "epic"`, không `ending`, rồi cho lặp.
4. **P2 — Nhạc từ công cụ AI** (Suno, Udio…) nếu muốn chất lượng sản xuất như nhạc thật: cần 2 bản cùng nhịp và cùng độ dài cho mỗi bài. Thêm thẳng vào `music-tracks.json`, tự điền `mixOut` (khoảng 6,5 giây trước khi hết nhạc), rồi chạy `pnpm music:handovers` để kiểm tra.
5. **P2 — Một số bản Safari cũ không phát được Ogg Opus.** Nếu cần, thêm bản MP3 dự phòng.
