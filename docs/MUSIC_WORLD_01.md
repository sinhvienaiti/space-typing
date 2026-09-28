# Space Typing — Nhạc nền World 01 "Signal in the Void": tài liệu bàn giao

> **Ngày:** 28/09/2026 · **Người viết:** Claude Code · **Người nhận:** chủ dự án, và ChatGPT/Codex làm tiếp.
>
> **Phạm vi:** bài nhạc nền riêng cho World 01 (bản thử, chờ chủ dự án nghe duyệt). Các World khác vẫn dùng nhạc chung như cũ.

## 1. Tóm tắt

- Yêu cầu của chủ dự án: *"bài nhạc nền hay, phù hợp với game ở map 1, nhịp điệu có thể là chill, hồi hộp, gay cấn, lên xuống"*. ("child" trong tin nhắn được hiểu là "chill".)
- Kết quả: **một bài nhạc, hai bản** cùng cung, cùng nhịp, cùng hợp âm, cùng giai điệu, cùng độ dài:

  | File | Khi nào phát | Tính chất | Độ to |
  |---|---|---|---|
  | `public/assets/audio/music/world-01/calm.ogg` | `WORLD_NORMAL` (đầu màn, lúc nghỉ) | chill, hồi hộp: trống nửa nhịp, chuông pha lê hát giai điệu | −15,7 LUFS |
  | `public/assets/audio/music/world-01/intense.ogg` | `WORLD_INTENSE` (lúc dồn quái, hỗn hợp, cuối màn) | gay cấn: trống 4 phách, bass dồn, lead điện tử | −13,9 LUFS |

- Game vốn tự đổi giữa "êm" và "căng" theo nhịp của màn (`musicStateForStagePhase`: mở đầu và nghỉ → êm; dồn quái, hỗn hợp, cuối màn → căng). Hai bản có chung `syncGroup: "world-01-theme"`, nên khi đổi, **bản mới bắt đầu đúng vị trí bản cũ đang phát** và hoà tiếng trong 1,8 giây. Nghe như một bài nhạc tự dâng lên rồi lắng xuống theo trận, không phải đổi bài.
- Mỗi vòng dài **2 phút 17 giây** (bài cũ chỉ 43–66 giây nên dễ nhàm), lặp liền mạch.
- Nhạc gốc do script trong repo tạo ra (`scripts/music/`), không dùng mẫu âm thanh hay nhạc của người khác, nên không cần ghi công. Dựng lại: `pnpm music:world-01`.
- Dung lượng: 1,9 MB + 1,7 MB (Opus 96 kbps, stereo, 48 kHz).

## 2. Thiết kế bài nhạc

**La thứ, 112 nhịp/phút, 4/4, 64 ô nhịp.** Bản êm để trống ở nửa nhịp, nên nghe như 56 nhịp/phút (thư thái); bản căng dùng đủ 112.

| Đoạn | Ô nhịp | Hợp âm | Bản êm | Bản căng |
|---|---|---|---|---|
| Drift (Trôi dạt) | 1–8 | Am · F · Dm · E (mỗi hợp âm 2 ô) | pad tối, bass trầm dài, vài tiếng chuông xa, nhịp tim nhẹ | "cú thả" sau đoạn dồn cuối vòng: kick 4 phách, clap, hi-hat, bass dồn, arp |
| Signal (Tín hiệu) | 9–24 | Am F Dm E ×4 | **giai điệu A** trên chuông pha lê, arp nốt móc đơn, trống nửa nhịp | giai điệu A trên lead điện tử (chuông nhắc lại quãng 8 trên), đủ trống |
| Tension (Căng thẳng) | 25–32 | F G Em Am F G E E | tiếng "tích tắc" leo cao dần mỗi 2 ô (Mi → Fa → Sol → Sol#), bass nhịp đều, lọc âm mở dần, tiếng rít dâng | lùi lại nửa nhịp 4 ô đầu, rồi snare dồn (móc đơn → móc kép → cuộn), tiếng rít dâng, tiếng chũm chọe ngược |
| Surge (Bùng nổ) | 33–48 | F G Am Am F G E E · F G Am C Dm E Am Am | **giai điệu B** (cao trào), trống dày hơn | cao trào: lead gấp đôi quãng 8, pad sáng nhất, chũm chọe mỗi 4 ô, tiếng nổ trầm ở ô 33 |
| Void (Hư không) | 49–56 | Am · F · Dm · E (mỗi hợp âm 2 ô) | chỉ còn pad, bass trầm, **nhịp tim "thình-thịch"**, tiếng chuông cao vọng lại → hồi hộp | trống rút về nhịp tim, mảnh giai điệu A vọng qua delay |
| Return (Trở lại) | 57–64 | Am F Dm E ×2 | arp trở lại, lọc âm mở dần, dâng nhẹ về đầu vòng | kick trở lại từ ô 59, snare cuộn 4 ô cuối, dâng vào "cú thả" ở đầu vòng |

- **Giai điệu A** (ô 9–16): *La Đô Mi · Rê Đô Si | Đô La Fa La Đô | Rê Fa La · Sol Fa Mi | Sol# Si Mi · Rê | …*. Lần thứ hai (ô 17–24) đổi 2 ô cuối để leo lên đoạn Căng thẳng.
- **Giai điệu B** (ô 33–48): mở ở La cao, lần hai đẩy lên Đô cao trên hợp âm C (điểm sáng nhất bài), kết về La.
- Hợp âm E (Mi trưởng, có Sol#) ở cuối mỗi câu tạo cảm giác chờ đợi, kéo về Am. Đây là nguồn "hồi hộp" chính.
- Arp: hình 6 nốt lên-xuống chạy trên nốt móc kép, nên trọng âm trượt dần so với ô nhịp và vòng lặp đỡ máy móc.

**Độ to từng đoạn (LUFS, đo trên bản đã master) — đường "lên xuống" của bài:**

| | Drift | Signal | Tension | Surge | Void | Return |
|---|---|---|---|---|---|---|
| Bản êm | −18,7 | −14,7 | −16,2 | −14,2 | −18,8 | −16,4 |
| Bản căng | −14,8 | −13,4 | −14,6 | −12,9 | −16,2 | −13,7 |

## 3. Cách tạo ra (`scripts/music/`)

| File | Vai trò |
|---|---|
| `synth.mjs` | Bộ tổng hợp âm thanh nhỏ, không cần thư viện: saw chống răng cưa (polyBLEP), bộ lọc SVF, pad nhiều giọng lệch nhau, pluck, chuông FM, lead có glide và vibrato, bass, kick, snare/clap, hi-hat, tom, tiếng rít dâng, chũm chọe ngược, tiếng nổ trầm, gió vũ trụ; delay ping-pong, reverb Freeverb, sidechain; đo độ to BS.1770; master (nén nhẹ, giới hạn đỉnh −1,2 dB); ghi WAV. Nhiễu có hạt giống cố định, nên chạy lại ra đúng bài đó. |
| `world-01-theme.mjs` | Bản nhạc: hợp âm, giai điệu, phối khí cho 2 bản, bảng cân bằng `MIX`, mục tiêu độ to `TARGET_LUFS`; dựng, master, nén Opus bằng `ffmpeg`. |

```bash
cd games/space-typing
pnpm music:world-01                       # dựng cả 2 bản vào public/assets/audio/music/world-01/
node scripts/music/world-01-theme.mjs --stem=calm --out=.visual/music --preview=.visual/music
node scripts/music/world-01-theme.mjs --balance           # in độ to từng nhạc cụ
node scripts/music/world-01-theme.mjs --solo=bass,kick     # chỉ nghe/đo vài nhạc cụ
node scripts/music/world-01-theme.mjs --mute=pad           # tắt một nhạc cụ
```

- `--preview=<thư mục>` ghi thêm WAV, ảnh sóng và ảnh phổ.
- `--bitrate=96k` (mặc định). Cần `ffmpeg` có `libopus` (máy chủ dự án đã có ở `/usr/local/bin/ffmpeg`).
- Mỗi lần dựng mất khoảng 1 phút. Script in ra JSON: độ to, đỉnh, độ to từng đoạn, dung lượng.

**Vòng lặp liền mạch:** dựng dư 6 giây sau ô 64, rồi cộng phần dư đó vào đầu bài, nên tiếng vang và nốt ngân cuối vòng chảy sang đầu vòng. Lớp gió vũ trụ hoà đầu–cuối 3 giây. Tệp Opus giải mã ra đúng 6.582.857 mẫu, không có khoảng lặng ở cuối.

## 4. Gắn vào game

- `src/audio/music-profile.ts`: `WORLD_THEMES` khai báo World nào có bài riêng. World 01: nhạc êm = `world-01/calm.ogg`, nhạc căng = `world-01/intense.ogg`, chung `syncGroup`. Chỗ ghi đè riêng trên máy vẫn giữ: `/local-assets/music/world-01.ogg` và `/local-assets/music/world-01-intense.ogg` (có file thì dùng file đó trước).
- `src/audio/MusicController.ts`: khi đổi giữa hai bản cùng `syncGroup`, bản mới đặt `currentTime` bằng bản cũ; khi bản mới thật sự bắt đầu phát (sự kiện `playing`), khớp lại một lần nữa để bù thời gian tải. Lúc đó âm lượng bản mới còn gần 0, nên lần tua nhỏ này không nghe thấy. Boss, cửa hàng, thắng, thua… là bài khác, vẫn phát từ đầu.
- Hạ nhạc khi đọc phát âm tiếng Anh (`duckingProfile`) giữ nguyên như cũ.
- `scripts/check-audio-assets.mjs` kiểm tra 2 file khi build.
- Test: `tests/music-profile.test.ts` (World 01 dùng bài riêng, World khác giữ nhạc cũ), `tests/music-controller.test.ts` (đổi êm ↔ căng giữ vị trí, khớp lại khi `playing`, bài boss phát từ đầu).

## 5. Đã kiểm tra thế nào

AI không nghe được, nên kiểm bằng số đo:

1. **Độ to tổng** so với nhạc đang có: bài cũ −13,2 … −15,2 LUFS; bài mới −15,7 (êm) và −13,9 (căng).
2. **Cân bằng nhạc cụ** (`--balance`): giai điệu to nhất, bass và kick ngay dưới, pad và tiếng vang là lớp nền thấp hơn.
3. **Độ to từng đoạn** (bảng ở mục 2): có lên, có xuống rõ.
4. **Chỗ nối vòng:** bước nhảy mẫu ở chỗ nối không lớn hơn bước nhảy bình thường trong bài.
5. **Chrome mở được** cả 2 file (`canPlayType('audio/ogg; codecs="opus"')` = "probably"), và trong trận thật game đã tải `world-01/calm.ogg`.

**Chú ý khi soi ảnh phổ:** ảnh `showspectrumpic` của ffmpeg (thang log) làm vùng trầm và trung trông sáng hơn thực tế, dễ đọc nhầm là "pad lấn át". Hãy đo năng lượng theo dải tần (`ffmpeg -af "lowpass=…,astats"`) hoặc dùng `--balance`/`--solo`.

## 6. Lỗi đã gặp khi làm

1. **Tiếng vang (reverb) to nhất bài**, to hơn cả giai điệu (−16,4 so với −23 LUFS): bộ Freeverb bị nhân 3 lần ở đầu ra → bỏ hệ số đó, và đặt mức trộn theo số đo.
2. **Arp gần như không nghe thấy** (−43 LUFS) và **kick bản căng lấn hết** (−14 LUFS) → bảng `MIX` cân theo số đo.
3. **Khâu nén làm bài phẳng lì** (bản căng các đoạn chỉ chênh dưới 1 dB) → nén chỉ tác động phần to nhất (ngưỡng −13 dBFS), và phối khí có chủ đích: đoạn Hư không rút trống, đầu đoạn Căng thẳng lùi lại rồi mới dồn.
4. **Độ to thấp hơn mục tiêu 1–2,5 dB** vì khâu nén ăn bớt → lặp lại khâu master tới khi đạt mục tiêu (sai số ≤ 0,25).
5. **Gió vũ trụ bị chồng đôi 6 giây đầu rồi tụt đột ngột** (dựng cả phần dư rồi cộng vào đầu) → dựng đúng một vòng, hoà đầu–cuối 3 giây.

## 7. Việc còn lại

1. **P0 — Chủ dự án nghe duyệt:** `pnpm build:space`, tải lại trang, vào World 01. Đầu màn là bản êm; khi quái dồn lên, nhạc tự chuyển sang bản căng. Góp ý thường gặp và chỗ sửa:
   - nhanh/chậm → `BPM`; buồn/vui → hợp âm `CHORDS` và giai điệu `THEME_A`/`THEME_B`;
   - nhạc cụ nào to/nhỏ → `MIX`;
   - to/nhỏ cả bài → `TARGET_LUFS`, hoặc âm lượng nhạc trong phần cài đặt game.
2. **P1 — World 02 trở đi:** chép `world-01-theme.mjs` thành `world-02-theme.mjs`, đổi cung, nhịp, hợp âm, giai điệu, màu nhạc cụ; thêm dòng vào `WORLD_THEMES` và vào `check-audio-assets.mjs`; thêm lệnh vào `package.json`. Mỗi World khoảng 3,6 MB.
3. **P2 — Một số bản Safari cũ không phát được Ogg Opus.** Game vốn đã dùng `.ogg` cho các nhạc khác, và chủ dự án chơi bằng Chrome, nên chưa ảnh hưởng. Nếu cần, xuất thêm MP3 và thêm đường dẫn dự phòng.
4. **P2 — `HTMLAudioElement.loop` có thể hở rất ngắn ở chỗ lặp** tuỳ trình duyệt. Nếu nghe thấy, chuyển nhạc sang Web Audio (`AudioBufferSourceNode.loop`) để lặp không hở.

## 8. Nếu muốn nhạc do công cụ AI làm (tuỳ chọn)

Bài này dựng bằng bộ tổng hợp âm thanh tự viết (phong cách synthwave/space ambient, hợp với bộ tổng hợp). Nếu chủ dự án muốn nhạc có chất lượng sản xuất như nhạc thật, có thể tạo bằng công cụ AI tạo nhạc (Suno, Udio…) với prompt dưới đây, rồi đặt file vào `public/local-assets/music/world-01.ogg` (bản êm) và `public/local-assets/music/world-01-intense.ogg` (bản căng). Game ưu tiên hai file này, không cần sửa code. Lưu ý: hai bài AI tạo riêng sẽ không cùng nhịp, nên chuyển êm ↔ căng sẽ không liền mạch như hai bản hiện tại.

> *Instrumental space synthwave for a sci-fi typing game, A minor, 112 BPM, loopable. Calm version: chill and suspenseful, half-time drums, warm analog pads, glassy bell lead, soft arpeggios, deep sub bass, heartbeat pulses in the quiet parts. Intense version: same theme with driving four-on-the-floor drums, pumping sidechained bass, bright saw lead, snare build-ups and risers. Dynamic rises and falls, no vocals.*
