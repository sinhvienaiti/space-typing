# Prompt âm thanh cho Typing Defense: tiếng ngắn, giọng, nhạc, bậc P (22/10/2026)

> **Dành cho:** chủ dự án (tạo tiếng bằng công cụ AI), ChatGPT (đọc file, viết và chỉnh prompt), AI tích hợp về sau (cắt, chuẩn hóa, manifest, engine).
>
> **Lấy từ thiết kế** `docs/td/TYPING_DEFENSE_DESIGN.md`: 0.6 (tên, id), 22.2–22.4 (câu thoại), 22.6–22.7 (quái, boss), 22.9 (bản đồ 1), 23.4 và 23.8 (tiếng theo thực thể, chất liệu), 24 (âm thanh), 26.1 (bước), 27.1–27.4 (bậc), 28.13 (ngôn ngữ). Thêm: `docs/td/BUILD_NOW.md` 5.5, `docs/MUSIC_SYSTEM.md`, `scripts/music/`, `src/audio/credit-sound.ts`.
>
> **Bước hiện tại:** 1A, chỉ có tiếng tổng hợp bằng mã. Tiếng bậc P phục vụ 1B và 1C.
>
> **Bậc VS:** file [`04-audio-vs.md`](04-audio-vs.md) cùng thư mục. **Bậc Sau:** mục 9 cuối file này. Mục lục và bảng việc của cả bộ: [`README.md`](README.md).
>
> **Đường dẫn** tính từ `games/space-typing/`. Mọi file âm gốc nằm trong `art-src/td/audio/`. `art-src` không vào Git. Sao lưu lên Google Drive bằng `pnpm media:push`, chạy ở thư mục `typing-game` (xem `docs/MEDIA_STORAGE.md` của repo cha).

```text
Instructions for ChatGPT
1. This file is the audio prompt pack for the game Typing Defense, tier P.
   Work only on the item codes, ids or sections the owner names
   (e.g. "A01-A08", "td.archer.*", "V13-V18", "section 5.9").
2. Sound effects (codes A..): final prompt = the item prompt (or one layer prompt)
   + the Common SFX tail in section 3.1 (+ a line from 3.2 when the item says so).
   In blocks with one line per id, each line starts with the id and a colon:
   drop that id, keep only the text after the colon.
   One final prompt per layer. Variants come from generating the same prompt again.
3. Voice (codes V..): first build the speaker's voice from its Voice design block (7.2).
   Then the spoken text is only the line text, copied exactly. Never read delivery notes aloud.
   If the voice tool has a separate style or direction field, put a short English
   version of the delivery note there, never in the spoken text.
4. Music (codes M..): follow section 8 exactly: key, BPM, bar count, loop, layers.
5. Write the exact save path (folder + id + -v<n> or -en/-vi) above every final prompt.
   When one prompt makes several variants, list every variant path.
   Never invent other names, ids or items.
6. One sound per prompt. No music and no speech inside a sound effect unless the item asks.
   Never name commercial games, brands, real people or living artists.
7. If you can export audio, deliver WAV 48 kHz 24-bit (or the best format you can).
   If not, deliver the final prompts ready to paste into a commercial-licence
   SFX, voice or music generator.
8. For every file, give one CSV row in the format of section 2.5 (file,tool,plan,date,prompt,notes).
   Fill file and prompt; leave tool, plan, date and notes empty for the owner. Do not ask about them.
9. If something is unclear, rules conflict, or a needed detail is missing, ask the owner. Do not guess.
```

## 1. Tóm tắt

| Nhóm | Bậc P (file này) | Bậc VS (`04-audio-vs.md`) |
|---|---|---|
| Tiếng ngắn (A) | 70 id (A01–A70), mỗi id 1–4 bản | 14 bộ quái × 4 nhóm, mọi vũ khí và va chạm, nhà, sự kiện, 2 boss |
| Câu thoại (V) | 36 câu + 3 tiếng gắng sức | Thoại đủ: 3 Tướng, 3 Thư Đồng, 10 tổ thợ, Bà Cú Mực, lính, 2 boss, câu hô quái |
| Nhạc (M) | 1 bản bản đồ 1 (3 lớp) + 11 câu nhạc ngắn | 2–3 bản mới + 1 bản boss + câu ngắn |
| Âm nền | Không (27.2 xếp ở VS) | 3 bản đồ × 2 lớp |

- Mã mục: **A** tiếng ngắn, **V** câu thoại, **M** nhạc. File VS dùng tiếp số (A71, V37, M13…).
- Tiếng phím và tiếng "chữ ra" làm bằng mã, không có prompt (mục 4).
- Thiếu file nào thì game dùng tiếng tổng hợp. Game không vỡ vì thiếu âm (24.2).

## 2. Cách làm

### 2.1 Công cụ

| Việc | Loại công cụ | Ví dụ |
|---|---|---|
| Viết, chỉnh prompt và câu thoại | ChatGPT | — |
| Tiếng ngắn | Công cụ tạo tiếng ngắn từ chữ | ví dụ ElevenLabs Sound Effects |
| Giọng nhân vật | TTS có thiết kế giọng bằng mô tả | ví dụ ElevenLabs Voice Design |
| Đổi giọng tiếng tự thu | Công cụ đổi giọng (speech-to-speech) | ví dụ ElevenLabs Voice Changer |
| Nhạc | Công cụ tạo nhạc AI | ví dụ Suno |
| Tách stem khi công cụ nhạc không cho tải stem | Công cụ tách stem | ví dụ Demucs (mã nguồn mở) |

- Chọn gói cho phép dùng thương mại. Ghi tên gói vào sổ nguồn (2.5).
- File này không nói giá hay tính năng của công cụ nào. Cột cuối chỉ là ví dụ.
- Tính năng và điều khoản của công cụ đổi theo thời gian. Trước khi dùng, xem gói có cho tải file (WAV hoặc stem) và dùng thương mại không.
- Câu nhạc ngắn M02–M12 (2–8 s, mục 8.7): dùng công cụ tiếng ngắn và đặt độ dài như bảng, hoặc công cụ nhạc cho đặt độ dài ngắn. Công cụ nhạc chỉ làm bài dài thì không dùng cho các câu này; công cụ đó (ví dụ Suno ở bảng trên) dùng cho M01.

### 2.2 Tiếng ngắn: từng bước

1. Nhắn ChatGPT, ví dụ: `Trong repo sinhvienaiti/space-typing, nhánh feat/space-typing-2026-10-18, đọc docs/art-requests/td/04-audio.md, làm prompt cho mục A01–A08.` Luôn ghi tên repo và nhánh: file chưa có ở `main`.
2. Dán từng prompt vào công cụ tiếng ngắn. Đặt độ dài như mục ghi. Công cụ không cho ngắn như vậy (ví dụ lớp 20 ms) thì để mức ngắn nhất nó cho.
3. Tạo vài lần. Giữ đủ số bản ở mục, mỗi bản nghe khác nhau rõ.
4. Tải WAV nếu có. Đổi tên đúng như mục ghi, lưu vào `art-src/td/audio/sfx/`.
5. Ghi một dòng sổ nguồn. Xong một nhóm thì `pnpm media:push`, rồi báo AI tích hợp.

- **Tiếng nhiều lớp:** mỗi lớp là một prompt riêng, một file riêng (24.5). Công cụ thường trả file dài hơn cần. Script sẽ cắt. Chỉ cần lớp đó nghe đúng.

### 2.3 Giọng: từng bước

1. Tạo giọng từ khối "Voice design" của người nói (7.2). Nghe thử một câu. Công cụ cần câu mẫu dài (ví dụ khoảng 100 ký tự trở lên) thì nối nhiều câu của chính người đó (ví dụ Draconis V01–V12); chưa đủ dài thì thêm câu của người đó ở `04-audio-vs.md`. Bà Cú Mực: nối V19–V24 bằng tiếng Việt. Không dùng câu mẫu tự sinh bằng tiếng Anh cho Bà Cú Mực.
2. Lưu giọng trong công cụ, đặt tên bằng tên thư mục người nói (ví dụ `draconis`).
3. Mỗi câu tạo riêng. Chỉ dán chữ của câu. Tạo 2–3 lần, giữ bản đúng "cách đọc".
4. Thu ở cao độ tự nhiên. Engine tự nâng +2 bán cung cho lính và Trợ Thủ (24.4).

### 2.4 Tên file, định dạng, độ lớn (24.9)

| Loại | Lưu trong `art-src/td/audio/` | Ví dụ |
|---|---|---|
| Tiếng một lớp | `sfx/<id>-v<n>.wav` | `sfx/td.archer.fire-v2.wav` |
| Tiếng nhiều lớp | `sfx/<id>.<lớp>-v<n>.wav` | `sfx/td.archer.hit.tail-v1.wav` |
| Câu thoại | `voice/<người nói>/<id câu>-<en hoặc vi>.wav` | `voice/draconis/td.vo.draconis.ult-en.wav` |
| Bản thu thêm của cùng câu | thêm `-v<n>` | `voice/draconis/td.vo.draconis.ult-en-v2.wav` |
| Tiếng gắng sức | `voice/<người nói>/<id>-v<n>.wav` | `voice/linh-giao/td.vo.linh-giao.hup-v3.wav` |
| Nhạc, câu nhạc ngắn | `music/<id>[.<lớp>][-v<n>].wav` | `music/td.music.w1-silverfall.calm.wav` |

Tự quyết: lớp viết sau dấu chấm (`.transient`, `.body`, `.tail`, `.low`, `.multi`…), ngôn ngữ viết `-en` hoặc `-vi`.

- Bản gốc: WAV 48 kHz 24-bit, ngoài Git. Công cụ chỉ cho MP3 (hoặc điện thoại ghi M4A) thì đổi: `ffmpeg -i vao.mp3 -ar 48000 -c:a pcm_s24le ra.wav`.
- Chủ dự án không cần chỉnh âm lượng hay cắt. Script ffmpeg của AI tích hợp làm việc đó: cắt lặng đầu (giữ 0–5 ms), mờ cuối 10 ms, chuẩn hóa, mã hóa OGG Vorbis, ghi manifest.
- Tiếng lặp (A23, A44, mọi mục có dòng LOOP): không cắt lặng đầu, không mờ cuối. Script cắt vòng ở điểm qua 0 và nối vòng bằng mờ chéo 10–20 ms, như nhạc (8.4). Nghe chỗ nối 3 lần liền.
- Bản trong game là OGG Vorbis. Mono cho va chạm và giọng (≤ 1,5 s). Stereo cho nhạc và âm nền; nhạc phát stream (24.9). Công cụ ra stereo cũng được: script trộn về mono.
- Tự quyết: mọi câu thoại để mono, kể cả câu dài hơn 1,5 s. Tiếng dài hơn 1,5 s nhưng phát ở một chỗ trên bản đồ (goòng, quái, Mộc Tinh) cũng để mono, vì engine pan theo vị trí (24.7).
- Độ lớn đích: giọng −16 LUFS-I; nhạc −18; âm nền −26; tiếng ngắn đỉnh −1 dBTP; bản trộn cuối −18 … −16 LUFS.

### 2.5 Sổ nguồn (giấy phép)

- Mỗi file một dòng trong `art-src/td/audio/sources.csv`: `file,tool,plan,date,prompt,notes`.
- `prompt` là chữ thật đã dán vào công cụ. Prompt có dấu phẩy và dấu ngoặc kép, nên bọc cả ô trong `"…"`; dấu `"` bên trong viết hai lần (`""`).
- AI tích hợp chép sang `license{tool, plan, date, prompt}` của manifest (27.1).
- Không ghi email, khóa, mật khẩu. Repo công khai.

Tự quyết: sổ nguồn là file `sources.csv` cạnh các file âm.

## 3. Khối prompt dùng chung (tiếng ngắn)

### 3.1 Đuôi chung (dán sau mọi prompt tiếng ngắn)

```text
Storybook fantasy game sound effect, warm and clean, close and dry with no reverb or echo, no music, no speech, no background noise, no silence before the sound.
```

- Đuôi này không ghi "mạnh" hay "bật ngay": lớp `body` và `tail` cần đầu mềm (soft onset), vì engine đặt lớp `transient` lên trước. Độ "chắc, mạnh" ghi trong prompt riêng của từng mục.

### 3.2 Dòng thêm khi mục yêu cầu

| Mã | Khi | Dán thêm |
|---|---|---|
| LOOP | Tiếng lặp | `Seamless loop, even texture, no start or end accents.` |
| SOFTPITCH | Tiếng có cao độ, dễ lệch giọng nhạc | `Keep pitched content subtle, no clear melody.` |

### 3.3 Luật chung

- Sách tranh, đồ chơi, ấm. Không máu, không tiếng đau thật, không súng, không chiến tranh hiện đại.
- Lớp `transient` khoảng 20 ms. Lớp `body` 0,1–0,3 s. Lớp `tail` 0,3–0,8 s. Engine ghép các lớp lệch 0–12 ms (24.5).
- Đòn trúng một quái (mũi nỏ, tên, giáo): engine lấy `transient` và `tail` của vũ khí, còn lớp thân lấy theo chất liệu quái (`td.mat.*`, mục 5.2). Lớp `body` riêng của vũ khí chỉ phát khi trúng đất (bắn trượt, quái chết trước).
- Đạn pháo nổ: lớp `body` (tiếng nổ) và lớp `low` (tiếng trầm cho đòn nặng, 24.5) luôn phát, vì đạn vẫn nổ khi trượt. Trúng từ 3 quái trở lên trong 50 ms: cả tiếng to thêm 2 dB và thêm lớp `multi` (24.5).
- Lính đâm trúng: `transient` của A04 + lớp thân chất liệu, không `tail`.
- Tiếng có cao độ rõ (chuông, "boong", "ting"): AI tích hợp chỉnh về một nốt trong thang Đô trưởng khi cần, để không lệch giọng nhạc (24.1).
- Engine đổi tốc 0,96–1,04 và ±1,5 dB mỗi lần phát, không lặp ngay bản vừa phát (24.5).

Tự quyết: lớp thân theo chất liệu là 8 id dùng chung cho mọi đòn trúng một quái. Nổ không thêm lớp chất liệu cho từng quái, để tiếng không dồn. Mốc "3 quái" của lớp `multi` cũng là tự quyết (24.5 chỉ ghi "N quái").

## 4. Không cần prompt

| Tiếng | Làm bằng | Ghi chú |
|---|---|---|
| Phím đúng (âm sắc theo loại nhà, +1 bán cung mỗi chữ), phím sai, phím lạc | Mã (24.6) | 1A đã có bản đơn giản (`src/td/view/audio-min.ts`, một âm sắc cho mọi nhà); âm sắc theo loại nhà thêm sau |
| "Sột" rất nhỏ 0,25 s trước khi từ ra (23.4) | Mã | Tự quyết: nhiễu lọc ngắn, cùng nhóm với tiếng "chữ ra" |
| Từ ra "tích" | Mã | Dời tối đa 70 ms vào nốt móc đơn gần nhất của nhạc |
| Khóa "tách", xong từ (nốt ngũ cung theo bậc Chuỗi), Chớp và Hoàn hảo (chuông, "ting"), tan "phù" | Mã | Thang ngũ cung Đô trưởng, dịch theo giọng nhạc (24.8) |
| "Ting" trên đòn được mạnh nhờ chữ và chuông nhỏ của Tên Chữ (23.8), "tách" khi Tên Chữ chí mạng (23.8), mốc Chuỗi 5 và 10 (3 nốt), Chuỗi bị trừ, đổi nhịp, 2 nốt khi nâng cấp | Mã | Tự quyết: các tiếng này phải đúng giọng nhạc hoặc rất ngắn |
| Đồng về ô Vàng, "ching" mỗi đồng ở Mỏ | Mã | Kiểu `credit-sound.ts`, theo thang nốt |
| Rít đạn pháo 0,4 s trước chỗ rơi | Mã (quét cao độ) | Tự quyết |
| Phát âm từ (P0), nghe rồi gõ | Giọng đọc có sẵn `src/speech.ts` | — |
| Draconis: cầu lửa, hơi thở, gầm, nổ | Bộ CC0 có sẵn `public/assets/audio/dragon/` | Tự quyết: 27.2 bậc P không có tiếng Draconis; tiếng mới cho Tối Thượng ở VS |
| Vang theo vùng đất | Mã (24.4) | Không cần file |

## 5. Tiếng ngắn bậc P (70 id)

Mỗi mục ghi: việc, bus (24.2), ưu tiên (24.3), độ dài, một lần hay lặp, số bản, lớp, mono hay stereo, chỗ lưu, prompt. Mọi mục ở đây là bậc **P**.

- 7 quái của 27.2 (Cương Thi, Nuppeppō, Thuồng Luồng, Tanuki, Troll, Alicanto, Mầm Gỗ) đủ tiếng đi, đánh, chết. Alicanto không đánh: tiếng trộm vàng thay chỗ đó.
- Tự quyết: thêm Ma Trơi (đi, chết). Nó có từ 1A nhưng không có model, nên tiếng là cách nghe thấy nó.
- Tự quyết: thêm tiếng kỹ năng Trống Bụng của Tanuki (đợt 5 bản đồ 1 dạy Ngắt trên trống bụng) và vòng nước của Thuồng Luồng (đòn có báo trước 0,6–0,8 s).
- Tự quyết: thêm 2 tiếng cảnh báo (quái lọt, mở cửa sổ gõ trực tiếp). Bản đồ 1 ở 1B cần chúng.
- Tự quyết: thêm tiếng lúa xào xạc của Ruộng (A23). 23.8 ghi nó là tiếng tự chạy của Ruộng; 27.2 ghi "lúa".
- Tự quyết: "Bùng Nổ 5 nhà" là Lũy, Tháp Cung, Tháp Pháo, Trại Lính, Mỏ Vàng (5 nhà của 1A). Bùng Nổ của Ruộng có file riêng ở VS. Ở P, Ruộng dùng `td.farm.harvest` và câu nhạc Bùng Nổ.
- Tự quyết (22/10, đổi được): tổng 70 id, trên mức ~40–60 của 27.2. Lý do: giữ đủ đi, đánh, chết của 7 quái và 8 lớp thân chất liệu dùng chung (23.8). 24.1: đủ độ phủ quan trọng hơn nhiều câu.

### 5.1 Tháp và nỏ Lũy

#### A01 `td.keep.fire` · Nỏ Lũy bắn
Nỏ trên Lũy tự bắn, "tchk". Cũng là cú đáp mỗi từ ở Lũy. `world` · P4 · 0,3 s · một lần · 3 bản · 1 lớp · mono.
Lưu: `sfx/td.keep.fire-v1.wav` … `-v3.wav`
```text
Heavy wooden wall crossbow firing: a sharp trigger click and a deep, short string thunk "tchk", the bolt leaving with a quick whoosh. Sturdy and solid, 0.3 seconds.
```

#### A02 `td.keep.hit` · Mũi nỏ trúng
Mũi nỏ trúng, "phập". `world` · P4 · một lần · 3 lớp × 3 bản · mono.
Lưu: `sfx/td.keep.hit.transient-v1.wav` … `-v3`, tương tự `.body`, `.tail`
- `transient`:
```text
A crossbow bolt tip striking: one hard, dry "tock" attack, about 20 milliseconds, nothing after it.
```
- `body` (trúng đất):
```text
A heavy crossbow bolt thudding deep into packed earth, a short firm "thup", 0.2 seconds, soft onset.
```
- `tail`:
```text
A wooden bolt shaft quivering after impact, a short "brrr" wobble that fades, 0.4 seconds, soft onset.
```

#### A03 `td.archer.fire` · Tháp Cung bắn
Dây cung bật, "thwip" (23.8 ghi 4 bản). `world` · P4 · 0,3 s · một lần · 4 bản · 1 lớp · mono.
Lưu: `sfx/td.archer.fire-v1.wav` … `-v4.wav`
```text
Bamboo longbow release: a taut string snaps "thwip" and a light arrow whooshes away fast, a tiny wood creak at the start. Crisp and small, 0.3 seconds.
```

#### A04 `td.archer.hit` · Tên trúng
Tên trúng, "thock". `world` · P4 · một lần · 3 lớp × 3 bản · mono.
Lưu: `sfx/td.archer.hit.transient-v1.wav` … `-v3`, tương tự `.body`, `.tail`
- `transient`:
```text
An arrowhead striking: one crisp "tock" tick, about 20 milliseconds, nothing after it.
```
- `body` (cắm đất):
```text
An arrow sticking into soft dirt and grass, a short muted "thuk", 0.15 seconds, soft onset.
```
- `tail`:
```text
A thin arrow shaft vibrating after impact, a very short twang-rattle that dies away, 0.3 seconds, soft onset.
```

#### A05 `td.archer.wordshot` · Tên Chữ
Phát Chữ của Tháp Cung, "thwip nặng". Chuông nhỏ do mã thêm. `world` · P3 · 0,45 s · một lần · 3 bản · 1 lớp · mono.
Lưu: `sfx/td.archer.wordshot-v1.wav` … `-v3.wav`
```text
Empowered magic bow shot: a deep, heavy string release "thwoom" with a strong tearing whoosh of an arrow flying fast and straight, bigger and brighter than a normal shot, 0.45 seconds.
```

#### A06 `td.cannon.fire` · Tháp Pháo bắn
"Thoomp" và khói. `world` · P4 · 0,5 s · một lần · 3 bản · 1 lớp · mono.
Lưu: `sfx/td.cannon.fire-v1.wav` … `-v3.wav`
```text
Short bronze cannon on an earthen mound firing: a round, deep, punchy "thoomp" with a quick puff-of-smoke hiss. Toy-like and friendly, not realistic war, 0.5 seconds.
```

#### A07 `td.cannon.hit` · Đạn pháo nổ
Nổ 3 lớp + lớp `low` (đòn nặng, luôn phát). Trúng từ 3 quái trở lên thì thêm lớp `multi` (24.5, mục 3.3). `world` · P4 · một lần · 3 lớp × 3 bản + `low` 3 bản + `multi` 3 bản · mono. Mỗi lớp 3 bản, vì 24.5 cần 3–6 biến thể mỗi va chạm (2 bản thì nghe A-B-A-B).
Lưu: `sfx/td.cannon.hit.transient-v1.wav` … `-v3`, tương tự `.body`, `.tail`; `sfx/td.cannon.hit.low-v1.wav` … `-v3`; `sfx/td.cannon.hit.multi-v1.wav` … `-v3`
- `transient`:
```text
The first crack of a small black-powder blast, a sharp "kssh" snap, about 20 milliseconds, nothing after it.
```
- `body`:
```text
A round, chunky cartoon explosion "boomf" with a puff of dust, short and full, 0.3 seconds, soft onset.
```
- `tail`:
```text
Dirt clods and small pebbles pattering down after a blast, a light rain of debris, 0.8 seconds, soft onset, fading out.
```
- `low` (luôn phát):
```text
A deep low thump with sub-bass weight under a small cartoon blast, 0.4 seconds, soft onset, no high frequencies.
```
- `multi` (từ 3 quái):
```text
Several small soft thuds and puffs of cloth and paper overlapping in one quick scatter, as if many small creatures are knocked back at once, 0.5 seconds, soft onset.
```

#### A08 `td.cannon.wordshot` · Đạn Chữ
Thợ nhét đạn vằn rồi bắn ngay: "cạch", "pụp". Tiếng nổ dùng A07, lấp lánh do mã thêm. `world` · P3 · một lần · 2 lớp × 3 bản · mono.
Lưu: `sfx/td.cannon.wordshot.clack-v1.wav` … `-v3`; `sfx/td.cannon.wordshot.pop-v1.wav` … `-v3`
- `clack`:
```text
A heavy iron cannonball slammed into a short bronze barrel: one metallic "clack" with a little rattle, 0.25 seconds.
```
- `pop` (engine phát sau `clack` 90 ms):
```text
A quick, light cannon launch "poonk", rounder and softer than a full shot, 0.3 seconds.
```

### 5.2 Lớp thân theo chất liệu (23.8)

Một lớp `body`, 3 bản mỗi id. `world` · P4 · 0,2–0,25 s · một lần · mono. Lưu: `sfx/<id>-v1.wav` … `-v3.wav`. Thay lớp `body` của vũ khí khi đòn trúng một quái có chất liệu đó; nổ thì không (mục 3.3). Lính đâm quái cũng dùng các id này.

| Mã | id | Chất liệu, quái (bậc P) | Tiếng |
|---|---|---|---|
| A09 | `td.mat.cloth` | Vải, giấy: Cương Thi | "bụp" mềm |
| A10 | `td.mat.flesh` | Thịt, lông: Tanuki (Oni ở VS) | "thịch" |
| A11 | `td.mat.dough` | Bột: Nuppeppō | "bọp" ướt |
| A12 | `td.mat.scale` | Vảy, nước: Thuồng Luồng | "cạch" ướt |
| A13 | `td.mat.stone` | Đá: Troll | "cộc" |
| A14 | `td.mat.metal` | Kim loại: Alicanto | "keng" |
| A15 | `td.mat.spirit` | Hồn: Ma Trơi (Ma Da ở VS) | "vút" thủy tinh |
| A16 | `td.mat.wood` | Gỗ: Mộc Tinh; Mầm Gỗ (tự quyết, 23.8 không ghi) | "cộp" |

```text
td.mat.cloth: A soft muffled "bup" thump into layered cloth robes, with a short papery rustle of paper charms, 0.2 seconds, soft onset.
td.mat.flesh: A padded cartoon "thud" into a chubby, furry body, soft and springy, no blood, no gore, 0.2 seconds, soft onset.
td.mat.dough: A wet, squishy "blop" into a soft dough-like blob, like slapping thick bread dough, a slightly sticky release, 0.25 seconds, soft onset.
td.mat.scale: A hard, glossy "clack" on wet serpent scales with a small splash of droplets, 0.25 seconds, soft onset.
td.mat.stone: A dull, solid "tock" on hard rock with a tiny crumble of grit, 0.2 seconds, soft onset.
td.mat.metal: A bright, short "ting-clank" on thin golden metal feathers, a light ring that dies quickly, 0.25 seconds, soft onset.
td.mat.spirit: An airy, glassy "whsst" as a hit passes through a ghostly light, a faint crystal shimmer, 0.25 seconds, soft onset.
td.mat.wood: A hollow "kok" knock on living tree bark, woody and resonant, with a tiny splinter crack, 0.2 seconds, soft onset.
```

### 5.3 Lính và Trại Lính

#### A17 `td.barracks.drum` · Trống trại
"Tùng", cú đáp mỗi từ ở Trại Lính; lính hô "Hup!" theo (id giọng riêng phát kèm, mục 7.4). `world` · P3 · 0,6 s · một lần · trống 3 bản + giọng 6 bản · mono.
Lưu: `sfx/td.barracks.drum-v1.wav` … `-v3`; giọng `voice/linh-giao/td.vo.linh-giao.hup-v1.wav` … `-v6`
```text
One strong hit on a big wooden barrel drum with a hide head: a round, warm "toong" with a short natural ring-out, rallying and festive, 0.6 seconds.
```

#### A18 `td.soldier.spear` · Lính Giáo đâm
"Xoạt". Tiếng trúng "phập" là `transient` của A04 + lớp thân theo chất liệu quái (5.2, mục 3.3). `crowd` · P4 · 0,2 s · một lần · 3 bản · mono.
Lưu: `sfx/td.soldier.spear-v1.wav` … `-v3.wav`
```text
A quick spear thrust: a short, sharp whoosh of a wooden spear shaft and a light cloth rustle, 0.2 seconds.
```

#### A19 `td.soldier.death` · Lính ngã
Ngã ngồi, tan thành chữ cái; kêu "Á!" (id giọng riêng phát kèm, mục 7.4). `crowd` · P4 · 0,8 s · một lần · 3 bản + giọng 6 bản · mono.
Lưu: `sfx/td.soldier.death-v1.wav` … `-v3`; giọng `voice/linh-giao/td.vo.linh-giao.death-v1.wav` … `-v6`
```text
A small cartoon soldier plopping down to sit: a soft cloth-and-leather thump, then a light flutter of paper letters lifting up and fading, gentle and not sad, 0.8 seconds.
```

### 5.4 Mỏ Vàng và Ruộng Lúa

#### A20 `td.gold-mine.pick` · Cuốc mỏ
"Tink" tóe lửa. Tự chạy (nhỏ) và cú đáp mỗi từ (+3 dB). `world` · P4 · 0,4 s · một lần · 3 bản · mono.
Lưu: `sfx/td.gold-mine.pick-v1.wav` … `-v3.wav`
```text
A pickaxe striking a gold-flecked rock face: a bright metallic "tink" with a tiny spark crackle and a few pebbles trickling, 0.4 seconds.
```

#### A21 `td.gold-mine.cart` · Goòng lăn
Goòng chạy khi mỏ tự chạy. `world` · P5 · 1,8 s · một lần · 2 bản · mono.
Lưu: `sfx/td.gold-mine.cart-v1.wav`, `-v2.wav`
```text
A small wooden mine cart rolling on short iron rails: rumbling wooden wheels, rhythmic rail clicks and gold nuggets rattling inside, passing by in 1.8 seconds, fading in and out softly.
```

#### A22 `td.farm.harvest` · Liềm gặt
Ruộng gặt định kỳ, "xoẹt". `world` · P5 · 0,7 s · một lần · 3 bản · mono.
Lưu: `sfx/td.farm.harvest-v1.wav` … `-v3.wav`
```text
A sickle slicing a bunch of ripe rice stalks: a crisp "shhk" cut with dry grain rustle, then a soft bundle dropped on the ground, 0.7 seconds.
```

#### A23 `td.farm.rustle` · Lúa xào xạc
Lúa đung đưa khi Ruộng tự chạy (23.8). Thêm dòng LOOP. `world` · P5 · 4 s · **lặp** · 1 bản · mono.
Lưu: `sfx/td.farm.rustle-v1.wav`
```text
Ripe rice plants swaying in a light breeze over a small wet paddy: a soft, continuous dry rustle of stalks and leaves, gentle and even, 4 seconds.
```

#### A24 `td.farm.word` · Lúa mọc vọt
Cú đáp mỗi từ ở Ruộng: "bụp", "sột". `world` · P3 · 0,6 s · một lần · 3 bản · mono.
Lưu: `sfx/td.farm.word-v1.wav` … `-v3.wav`
```text
Rice shoots springing up from wet paddy mud with a soft "bup" pop and a leafy rustle, then a small rice bundle swishing up into the air, 0.6 seconds.
```

### 5.5 Từ Vàng, cụm chốt, Bùng Nổ

#### A25 `td.rare.gold.spawn` · Từ Vàng hiện
Lấp lánh riêng, luôn phát (24.6). Thêm dòng SOFTPITCH. `rewards` · P3 · 1 s · một lần · 2 bản · mono.
Lưu: `sfx/td.rare.gold.spawn-v1.wav`, `-v2.wav`
```text
A precious golden word appearing: a soft sparkling shimmer of tiny bright chimes and gold dust swirling up, warm and inviting, 1 second.
```

#### A26 `td.finisher.spawn` · Cụm chốt hiện
Tiếng dây căng 0,6 s (24.6). `typing` · P2 · 0,6 s · một lần · 2 bản · mono.
Lưu: `sfx/td.finisher.spawn-v1.wav`, `-v2.wav`
```text
A thick bow string or rope being drawn tight: a rising creak and a tense stretched hum building for 0.6 seconds, then stopping, full of anticipation.
```

#### A27 `td.overdrive.keep` · Bùng Nổ Lũy: Khiên Lũy
Vòm chữ quanh Lũy, "boong". Phát khi bật và mỗi lần chặn một quái lọt. `world` · P3 · 1,2 s · một lần · 3 bản · mono.
Lưu: `sfx/td.overdrive.keep-v1.wav` … `-v3.wav`
```text
A magical shield of glowing letters blocking a blow: a deep, round bronze "boong" with a soft glassy shimmer, warm and protective, 1.2 seconds.
```

#### A28 `td.overdrive.archer` · Bùng Nổ Tháp Cung: Mưa Tên
Mưa tên "rào rào", phát mỗi loạt 0,5 s. `world` · P3 · 1,2 s · một lần · 3 bản · mono.
Lưu: `sfx/td.overdrive.archer-v1.wav` … `-v3.wav`
```text
A volley of many arrows: a rushing whoosh as a dozen arrows rise together, then a fast pattering rain of arrows landing like heavy rain on a tent, 1.2 seconds.
```

#### A29 `td.overdrive.cannon` · Bùng Nổ Tháp Pháo: Loạt Ba
Ba quả cùng lúc. Engine thêm 3 tiếng nổ A07 lệch 60–80 ms. `world` · P3 · 0,8 s · một lần · 2 bản · mono.
Lưu: `sfx/td.overdrive.cannon-v1.wav`, `-v2.wav`
```text
Three small cannons firing in quick succession, "boom-boom-boom" about 70 milliseconds apart, round and punchy with a smoke hiss, 0.8 seconds.
```

#### A30 `td.overdrive.barracks` · Bùng Nổ Trại Lính: Hô Xung Trận
Cờ phần phật, lính lao lên. Câu "Charge!" của Đội trưởng Sấm phát cùng (V28). `world` · P3 · 1,5 s · một lần · 2 bản · mono.
Lưu: `sfx/td.overdrive.barracks-v1.wav`, `-v2.wav`
```text
A fast rolling beat on a big barrel drum, a cloth banner snapping in the wind and a quick stampede of small running feet, rousing, 1.5 seconds.
```

#### A31 `td.overdrive.gold-mine` · Bùng Nổ Mỏ: Mạch Vàng Lộ
Cột vàng phun, mưa đồng. `rewards` · P3 · 1,8 s · một lần · 2 bản · mono.
Lưu: `sfx/td.overdrive.gold-mine-v1.wav`, `-v2.wav`
```text
Gold bursting up from the ground like a geyser: a big whoosh upward, then a shower of coins jingling and raining down, a joyful jackpot, 1.8 seconds.
```

### 5.6 Túi và rương (17.4)

#### A32 `td.bag.drop` · Túi rơi
Túi rơi chỗ quái chết, nảy một lần. `rewards` · P4 · 0,4 s · một lần · 3 bản · mono.
Lưu: `sfx/td.bag.drop-v1.wav` … `-v3.wav`
```text
A small cloth loot bag dropping and bouncing once on grass: a soft thud with a few coins jingling inside, 0.4 seconds.
```

#### A33 `td.bag.pickup` · Nhặt túi
Túi bay tới người gần nhất, người đó bắt. `rewards` · P3 · 0,5 s · một lần · 3 bản · mono.
Lưu: `sfx/td.bag.pickup-v1.wav` … `-v3.wav`
```text
A loot bag zipping through the air into small hands: a quick whoosh, a soft cloth catch "fwump" and a short bright coin jingle, 0.5 seconds.
```

#### A34 `td.chest.open` · Rương Boss
Rơi giữa sân, tự mở sau 1,5 s (17.4). Một id, 2 lớp; engine phát lớp `open` sau 1500 ms. `rewards` · P3 · một lần · 2 lớp × 2 bản · mono.
Lưu: `sfx/td.chest.open.land-v1.wav`, `-v2`; `sfx/td.chest.open.open-v1.wav`, `-v2`
- `land`:
```text
A heavy wooden treasure chest landing on the ground: a solid wooden thump with iron corners rattling, 0.5 seconds.
```
- `open`:
```text
A wooden treasure chest lid creaking open quickly, then a bright gush of gold coins spilling out with a magical shimmer, 1.5 seconds.
```

### 5.7 Xây, nâng cấp, bán (23.8)

#### A35 `td.build.place` · Xây nhà
Giàn tre, búa, bụi. Thợ hô "Hò dô!" (id giọng riêng phát kèm, mục 7.4). `world` · P4 · 1,3 s · một lần · 3 bản + giọng 6 bản · mono.
Lưu: `sfx/td.build.place-v1.wav` … `-v3`; giọng `voice/crew/td.vo.crew.heave-ho-v1.wav` … `-v6`
```text
A small builder crew putting up a hut: bamboo poles clattering into a scaffold, quick hammer taps and a puff of dust, cheerful and busy, 1.3 seconds.
```

#### A36 `td.build.upgrade` · Nâng cấp
Giàn giáo, búa dồn, bộ cấp rơi xuống nảy. Hai nốt nhạc do mã thêm. `world` · P3 · 1 s · một lần · 3 bản · mono.
Lưu: `sfx/td.build.upgrade-v1.wav` … `-v3.wav`
```text
Bamboo scaffold rattling, a quick flurry of hammer blows, then a heavy wooden roof piece dropping into place with a solid "clunk" and a small bounce, 1 second.
```

#### A37 `td.build.sell` · Bán nhà
Nhà tháo thành ván bay đi, đồng bung. `world` · P4 · 0,9 s · một lần · 3 bản · mono.
Lưu: `sfx/td.build.sell-v1.wav` … `-v3.wav`
```text
A small wooden building being taken apart: planks popping loose and clattering away, then a quick burst of jingling coins, 0.9 seconds.
```

### 5.8 Cảnh báo

#### A38 `td.warn.leak` · Quái lọt Lũy
Mất mạng. `warnings` · P3 · 0,8 s · một lần · 3 bản · mono, không theo vị trí.
Lưu: `sfx/td.warn.leak-v1.wav` … `-v3.wav`
```text
An enemy slipping past the gate: a low wooden alarm clapper knocking twice and a short deep horn note, urgent but not harsh, 0.8 seconds.
```

#### A39 `td.warn.direct` · Mở cửa sổ gõ trực tiếp
Cuộn giấy viền đỏ hiện cạnh quái (Ngắt, Neo, Phá Khiên). `warnings` · P1 · 0,6 s · một lần · 2 bản · mono.
Lưu: `sfx/td.warn.direct-v1.wav`, `-v2.wav`
```text
A paper scroll snapping open: a sharp, crisp paper unroll with two quick tense wooden knocks, alerting, 0.6 seconds.
```

### 5.9 Quái (22.6)

`crowd` · mono · một lần (trừ A44 lặp) · 1 lớp · 3 bản mỗi id. Lưu: `sfx/<id>-v1.wav` … `-v3.wav`. Ưu tiên: đi P5, đánh và kỹ năng P4, chết P4. Khi chết, engine phát A40 rồi tiếng chết riêng của loài. Trúng quái: lớp thân theo chất liệu ở cột cuối (5.2).

Tự quyết: Cương Thi Đầu Đàn dùng bộ Cương Thi, hạ 3 bán cung, +3 dB. Nuppeppō con dùng bộ Nuppeppō, nâng 4 bán cung.

| Mã | id | Việc | Dài | Chất liệu khi trúng |
|---|---|---|---|---|
| A40 | `td.enemy.ink-peel` | Chung mọi quái: vệt mực bong thành giấy vụn | 0,5 s | — |
| A41 | `td.enemy.cuong-thi.move` | Cương Thi nhảy cả bầy | 1 s | cloth |
| A42 | `td.enemy.cuong-thi.attack` | Cương Thi vồ lính | 0,3 s | cloth |
| A43 | `td.enemy.cuong-thi.death` | Bùa cháy từ dưới lên, hóa tro, chuông "tinh" | 1 s | cloth |
| A44 | `td.enemy.ma-troi.move` | Đàn Ma Trơi bay thấp, **lặp** (thêm LOOP) | 4 s | spirit |
| A45 | `td.enemy.ma-troi.death` | Từng đốm tắt, "plinh" thủy tinh | 0,6 s | spirit |
| A46 | `td.enemy.nuppeppo.move` | Nuppeppō lạch bạch | 1 s | dough |
| A47 | `td.enemy.nuppeppo.attack` | Nuppeppō vỗ | 0,3 s | dough |
| A48 | `td.enemy.nuppeppo.death` | Bóp giãn, phụt bột kem | 0,8 s | dough |
| A49 | `td.enemy.thuong-luong.move` | Thuồng Luồng trườn | 1,5 s | scale |
| A50 | `td.enemy.thuong-luong.attack` | Thuồng Luồng cắn, quật đuôi vào lính | 0,5 s | scale |
| A51 | `td.enemy.thuong-luong.skill` | Phun vòng nước 5 m đẩy lính | 0,8 s | scale |
| A52 | `td.enemy.thuong-luong.death` | Cột nước, vảy ngọc rơi | 1,2 s | scale |
| A53 | `td.enemy.tanuki.move` | Tanuki chạy | 1 s | flesh |
| A54 | `td.enemy.tanuki.attack` | Tanuki cào | 0,4 s | flesh |
| A55 | `td.enemy.tanuki.skill` | Trống Bụng (đích của Ngắt) | 1,5 s | flesh |
| A56 | `td.enemy.tanuki.death` | Khói be, chiếc lá xoay rơi | 0,9 s | flesh |
| A57 | `td.enemy.troll.move` | Troll đi | 1,5 s | stone |
| A58 | `td.enemy.troll.attack` | Troll đấm nắm tay đá xuống đất | 0,6 s | stone |
| A59 | `td.enemy.troll.death` | Hóa đá, vỡ 3 tảng | 1,4 s | stone |
| A60 | `td.enemy.alicanto.move` | Alicanto vỗ cánh kim loại | 1 s | metal |
| A61 | `td.enemy.alicanto.skill` | Sà xuống trộm vàng ở đống | 0,8 s | metal |
| A62 | `td.enemy.alicanto.death` | Lông vàng rụng thành đồng | 1 s | metal |
| A63 | `td.enemy.mam-go.move` | Mầm Gỗ đi | 1 s | wood |
| A64 | `td.enemy.mam-go.attack` | Mầm Gỗ quất cành | 0,3 s | wood |
| A65 | `td.enemy.mam-go.death` | Mầm Gỗ héo rũ | 0,7 s | wood |

```text
td.enemy.ink-peel: Living ink peeling away and tearing into paper scraps: a quick paper rip and a flutter of small paper pieces, 0.5 seconds.
td.enemy.cuong-thi.move: Small stiff hopping creatures in long robes: soft rhythmic two-footed hops on dirt, paper charms fluttering, a little comic, not scary, 1 second.
td.enemy.cuong-thi.attack: A stiff-armed lunge: a quick cloth swish and a soft papery smack, 0.3 seconds.
td.enemy.cuong-thi.death: A blank paper charm catching fire from the bottom up with a soft crackle, crumbling to ash, ending with one small clear bell "ting", 1 second.
td.enemy.ma-troi.move: A flock of tiny will-o'-the-wisp lights drifting low: a soft airy shimmering hum with faint glassy flickers, magical and a little eerie but gentle, 4 seconds.
td.enemy.ma-troi.death: Small floating lights going out one by one: three quick soft glassy "plink" pops, like tiny crystal bubbles, 0.6 seconds.
td.enemy.nuppeppo.move: A soft dough blob creature waddling: slow squishy squelches on dirt, gentle and silly, 1 second.
td.enemy.nuppeppo.attack: A squishy blob creature slapping: a wet doughy "splat" of a soft arm, 0.3 seconds.
td.enemy.nuppeppo.death: A soft dough blob squeezed and stretched with a rubbery squeak, then a gentle "poof" of cream-colored powder, 0.8 seconds.
td.enemy.thuong-luong.move: A heavy river serpent sliding over wet ground: slow wet scales scraping, small splashes, a low rumble, 1.5 seconds.
td.enemy.thuong-luong.attack: A river serpent snapping its jaws and slapping its tail: a wet bite clack and a splashy thump, 0.5 seconds.
td.enemy.thuong-luong.skill: A river serpent spitting a ring of water: a short gurgle, then a strong splash wave whooshing outward in a circle, 0.8 seconds.
td.enemy.thuong-luong.death: A tall column of water bursting up and splashing down, then small jade scales clinking onto stones, 1.2 seconds.
td.enemy.tanuki.move: A chubby raccoon-dog trotting: quick soft paw pats on dirt, playful, 1 second.
td.enemy.tanuki.attack: A chubby raccoon-dog swiping with stubby claws: a quick fur swish and a soft padded smack, 0.4 seconds.
td.enemy.tanuki.skill: A chubby raccoon-dog drumming its round belly: hollow, bouncy "pom-pom-pom" hand-drum beats, playful and cheeky, 1.5 seconds.
td.enemy.tanuki.death: A soft "poof" of beige smoke, then a single dry leaf spinning down with a tiny rustle, a comic vanishing, 0.9 seconds.
td.enemy.troll.move: A big mountain troll walking: slow heavy stony footsteps with grinding pebbles, 1.5 seconds.
td.enemy.troll.attack: A big mountain troll slamming a huge stone fist down: a heavy whoosh and a deep rocky "crunch" thud, 0.6 seconds.
td.enemy.troll.death: A troll turning to stone with a grinding crackle, then breaking into three big rock chunks that thud down, 1.4 seconds.
td.enemy.alicanto.move: A golden bird with metal feathers flying past: quick wingbeats with a light jingle of metallic feathers, 1 second.
td.enemy.alicanto.skill: A golden bird diving fast with a sharp whoosh and scooping coins: a quick greedy jingle of coins dropping into a small sack, 0.8 seconds.
td.enemy.alicanto.death: Golden metal feathers bursting and falling with bright tinkles that turn into a cascade of coins, 1 second.
td.enemy.mam-go.move: A small sapling creature walking: tiny twig feet pattering, small leaves rustling, a light wooden creak, 1 second.
td.enemy.mam-go.attack: A small sapling creature whipping a thin branch: a quick twiggy swish and a light woody tap, 0.3 seconds.
td.enemy.mam-go.death: A small sapling creature wilting: a soft wooden creak, leaves drooping with a dry rustle, a tiny groan of bending wood, 0.7 seconds.
```

### 5.10 Mộc Tinh, boss nhỏ bản đồ 1 (22.7)

Một lần · 1 lớp · mono. Lưu: `sfx/<id>-v1.wav` … theo số bản ở bảng.

| Mã | id | Việc | Bus · ưu tiên | Dài · bản |
|---|---|---|---|---|
| A66 | `td.boss.moc-tinh.attack` | Quật cành, vùng 3 m | `world` · P4 | 1 s · 3 |
| A67 | `td.boss.moc-tinh.roots-warn` | Báo trước Rễ Trồi 1,5 s | `warnings` · P1 | 1,5 s · 2 |
| A68 | `td.boss.moc-tinh.roots` | Rễ trồi dưới nhà | `world` · P4 | 1 s · 3 |
| A69 | `td.boss.moc-tinh.roar` | Gầm: ra mắt, choáng ở 70 %, đổi pha | `crowd` · P3 | 2 s · 3 |
| A70 | `td.boss.moc-tinh.retreat` | Rút lui ở 50 %, chui xuống đất | `world` · P3 | 3 s · 1 |

- Gọi 4 Mầm Gỗ (pha 2): ở P dùng A68 nhỏ hơn 6 dB. Tiếng mọc lên riêng là A99 ở VS.
- Trúng Mộc Tinh: lớp thân `td.mat.wood` (A16).

```text
td.boss.moc-tinh.attack: A giant tree creature whipping a huge branch down: a deep creaking swing and a massive woody "crack-thud" slam on the ground, leaves shaking, 1 second.
td.boss.moc-tinh.roots-warn: A deep underground rumble building for 1.5 seconds: roots shifting under the earth, low creaks and soil crackling, rising tension, ending abruptly.
td.boss.moc-tinh.roots: Thick tree roots bursting up through the ground: an eruption of soil, cracking wood and roots slapping against stones, 1 second.
td.boss.moc-tinh.roar: A colossal ancient tree spirit roaring: a deep groaning wooden roar like a huge trunk bending in a storm, with rustling leaves, sad and powerful rather than evil, 2 seconds.
td.boss.moc-tinh.retreat: A giant tree creature sinking into the earth: a long grinding rumble, roots pulling back with creaks, soil pouring in, a low groan fading away, 3 seconds.
```

### 5.11 Mỗi nhà phát tiếng nào (cho AI tích hợp)

| Nhà | Tự chạy | Mỗi từ trúng (cú đáp, 23.8) | Bùng Nổ |
|---|---|---|---|
| Lũy | A01 → A02 | A01 +2 dB, tick đồng (mã) | A27 khi bật và mỗi lần chặn |
| Tháp Cung | A03 → A04 | A05 + chuông nhỏ (mã) → A04 | A28 mỗi loạt |
| Tháp Pháo | A06 → rít (mã) → A07 | A08 → A07 + lấp lánh (mã) | A29 + 3 × A07 lệch 60–80 ms |
| Trại Lính | A18 → trúng (A04 `transient` + chất liệu); A17 −6 dB khi lính ra | A17 (có "Hup!") | A30 + câu V28 |
| Mỏ Vàng | A20 −6 dB; A21 khoảng 6 s một lần | A20 +3 dB + "ching" (mã) | A31 |
| Ruộng Lúa | A23 lặp; A22 mỗi lần gặt | A24 | A22 + câu nhạc M07 (file riêng ở VS) |

- Đòn được mạnh nhờ chữ thêm "ting" bằng mã (23.8).
- Câu thợ "Người tới" phát khi người trợ lực tới nhà. Câu thợ "Bùng Nổ" phát cùng tiếng Bùng Nổ.
- Tiếng bắt từ ở nhà Tướng đứng to hơn ở nhà Thư Đồng đứng 3 dB (24.6).
- Nhà có chữ đang khóa: tiếng lặp của nhà đó +3 dB (24.2).

## 6. Bảng manifest bậc P

Trường theo 24.2. Bảng dùng dấu chấm như trong mã. Số là số khởi điểm; AI tích hợp chỉnh khi nghe.

- Mọi id: `gainJitterDb 1.5`, `noRepeat true`. Cột `files` ghi bản (v1–v3). Cột `layers` ghi lớp và độ trễ.
- `license{tool, plan, date, prompt}`: chép từ sổ nguồn (2.5) khi có file. Chưa có file thì để trống (cột ghi "sổ nguồn").
- `beatQuantizeMs` = 0 cho mọi id ở đây. Chỉ tiếng "chữ ra" (mã) dùng 70.
- `maxInstances` là số bản của id đó được kêu cùng lúc. Trần tốc độ của 24.3 ghi bằng `minGapMs`: cùng một tiếng ≤ 4 lần mỗi 100 ms → 25; nổ ≤ 4 trong 120 ms → 30; tiếng nhặt ≤ 6 mỗi 100 ms → 16.
- Quái: tối đa 2 tiếng quái cùng lúc cho cả nhóm (24.3). Engine lo, không ghi theo id.

| Mã | id | bus | files | layers | gainDb | pitchJitter | priority | maxInstances | minGapMs | cooldownMs | spatial | reverbSend | beatQuantizeMs | license |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A01 | td.keep.fire | world | v1–v3 | 1 | -3 | 0.04 | P4 | 3 | 40 | 0 | true | 0.10 | 0 | sổ nguồn |
| A02 | td.keep.hit | world | v1–v3 ×3 | transient 0 ms, body 4 ms, tail 10 ms (-4 dB) | -2 | 0.04 | P4 | 4 | 25 | 0 | true | 0.15 | 0 | sổ nguồn |
| A03 | td.archer.fire | world | v1–v4 | 1 | -4 | 0.04 | P4 | 4 | 25 | 0 | true | 0.10 | 0 | sổ nguồn |
| A04 | td.archer.hit | world | v1–v3 ×3 | transient 0, body 4, tail 10 (-4 dB) | -3 | 0.04 | P4 | 4 | 25 | 0 | true | 0.12 | 0 | sổ nguồn |
| A05 | td.archer.wordshot | world | v1–v3 | 1 | -1 | 0.03 | P3 | 2 | 60 | 0 | true | 0.12 | 0 | sổ nguồn |
| A06 | td.cannon.fire | world | v1–v3 | 1 | -2 | 0.04 | P4 | 3 | 60 | 0 | true | 0.12 | 0 | sổ nguồn |
| A07 | td.cannon.hit | world | v1–v3 ×3, low v1–v3, multi v1–v3 | transient 0, body 6, tail 12, low 0 (-3 dB); multi 0 khi ≥ 3 quái trong 50 ms (cả tiếng +2 dB) | 0 | 0.04 | P4 | 4 | 30 | 0 | true | 0.20 | 0 | sổ nguồn |
| A08 | td.cannon.wordshot | world | v1–v3 ×2 | clack 0, pop 90 | -1 | 0.03 | P3 | 2 | 80 | 0 | true | 0.12 | 0 | sổ nguồn |
| A09–A16 | td.mat.* | world | v1–v3 | thay body khi trúng một quái | 0 | 0.05 | P4 | 4 | 25 | 0 | true | 0.12 | 0 | sổ nguồn |
| A17 | td.barracks.drum | world | v1–v3 | 1; engine phát kèm `td.vo.linh-giao.hup` sau 120 ms | -2 | 0.03 | P3 | 2 | 150 | 0 | true | 0.20 | 0 | sổ nguồn |
| A18 | td.soldier.spear | crowd | v1–v3 | 1 | -6 | 0.05 | P4 | 3 | 60 | 0 | true | 0.20 | 0 | sổ nguồn |
| A19 | td.soldier.death | crowd | v1–v3 | 1; engine phát kèm `td.vo.linh-giao.death` sau 40 ms | -4 | 0.05 | P4 | 2 | 200 | 0 | true | 0.25 | 0 | sổ nguồn |
| A20 | td.gold-mine.pick | world | v1–v3 | 1 | -6 | 0.05 | P4 | 2 | 120 | 0 | true | 0.15 | 0 | sổ nguồn |
| A21 | td.gold-mine.cart | world | v1–v2 | 1 | -10 | 0.03 | P5 | 1 | 0 | 6000 | true | 0.15 | 0 | sổ nguồn |
| A22 | td.farm.harvest | world | v1–v3 | 1 | -8 | 0.05 | P5 | 1 | 0 | 2000 | true | 0.15 | 0 | sổ nguồn |
| A23 | td.farm.rustle | world | v1 | 1, lặp | -16 | 0 | P5 | 2 | 0 | 0 | true | 0.15 | 0 | sổ nguồn |
| A24 | td.farm.word | world | v1–v3 | 1 | -3 | 0.04 | P3 | 2 | 100 | 0 | true | 0.15 | 0 | sổ nguồn |
| A25 | td.rare.gold.spawn | rewards | v1–v2 | 1 | -4 | 0 | P3 | 1 | 0 | 0 | true | 0.15 | 0 | sổ nguồn |
| A26 | td.finisher.spawn | typing | v1–v2 | 1 | -8 | 0.02 | P2 | 2 | 100 | 0 | true | 0.10 | 0 | sổ nguồn |
| A27 | td.overdrive.keep | world | v1–v3 | 1 | -2 | 0.02 | P3 | 1 | 150 | 0 | true | 0.30 | 0 | sổ nguồn |
| A28 | td.overdrive.archer | world | v1–v3 | 1 | -2 | 0.03 | P3 | 2 | 450 | 0 | true | 0.20 | 0 | sổ nguồn |
| A29 | td.overdrive.cannon | world | v1–v2 | 1 | -1 | 0.03 | P3 | 1 | 0 | 0 | true | 0.20 | 0 | sổ nguồn |
| A30 | td.overdrive.barracks | world | v1–v2 | 1 | -2 | 0.02 | P3 | 1 | 0 | 0 | true | 0.20 | 0 | sổ nguồn |
| A31 | td.overdrive.gold-mine | rewards | v1–v2 | 1 | -2 | 0.02 | P3 | 1 | 0 | 0 | true | 0.20 | 0 | sổ nguồn |
| A32 | td.bag.drop | rewards | v1–v3 | 1 | -6 | 0.05 | P4 | 3 | 50 | 0 | true | 0.10 | 0 | sổ nguồn |
| A33 | td.bag.pickup | rewards | v1–v3 | 1 | -4 | 0.05 | P3 | 6 | 16 | 0 | true | 0.10 | 0 | sổ nguồn |
| A34 | td.chest.open | rewards | v1–v2 ×2 | land 0, open 1500 | -1 | 0.02 | P3 | 1 | 0 | 0 | true | 0.20 | 0 | sổ nguồn |
| A35 | td.build.place | world | v1–v3 | 1; engine phát kèm `td.vo.crew.heave-ho` sau 300 ms | -4 | 0.03 | P4 | 2 | 200 | 0 | true | 0.15 | 0 | sổ nguồn |
| A36 | td.build.upgrade | world | v1–v3 | 1 | -3 | 0.03 | P3 | 2 | 200 | 0 | true | 0.15 | 0 | sổ nguồn |
| A37 | td.build.sell | world | v1–v3 | 1 | -4 | 0.03 | P4 | 2 | 200 | 0 | true | 0.15 | 0 | sổ nguồn |
| A38 | td.warn.leak | warnings | v1–v3 | 1 | -3 | 0 | P3 | 1 | 400 | 0 | false | 0.05 | 0 | sổ nguồn |
| A39 | td.warn.direct | warnings | v1–v2 | 1 | -3 | 0 | P1 | 1 | 300 | 0 | true | 0.05 | 0 | sổ nguồn |
| A40 | td.enemy.ink-peel | crowd | v1–v3 | 1 | -8 | 0.05 | P4 | 4 | 25 | 0 | true | 0.20 | 0 | sổ nguồn |
| A41 | td.enemy.cuong-thi.move | crowd | v1–v3 | 1 | -12 | 0.05 | P5 | 1 | 0 | 3000 | true | 0.25 | 0 | sổ nguồn |
| A42 | td.enemy.cuong-thi.attack | crowd | v1–v3 | 1 | -8 | 0.05 | P4 | 2 | 80 | 0 | true | 0.25 | 0 | sổ nguồn |
| A43 | td.enemy.cuong-thi.death | crowd | v1–v3 | 1 | -6 | 0.05 | P4 | 2 | 40 | 0 | true | 0.25 | 0 | sổ nguồn |
| A44 | td.enemy.ma-troi.move | crowd | v1–v3 | 1, lặp | -14 | 0.03 | P5 | 1 | 0 | 0 | true | 0.30 | 0 | sổ nguồn |
| A45 | td.enemy.ma-troi.death | crowd | v1–v3 | 1 | -6 | 0.05 | P4 | 2 | 40 | 0 | true | 0.30 | 0 | sổ nguồn |
| A46 | td.enemy.nuppeppo.move | crowd | v1–v3 | 1 | -12 | 0.05 | P5 | 1 | 0 | 3000 | true | 0.25 | 0 | sổ nguồn |
| A47 | td.enemy.nuppeppo.attack | crowd | v1–v3 | 1 | -8 | 0.05 | P4 | 2 | 80 | 0 | true | 0.25 | 0 | sổ nguồn |
| A48 | td.enemy.nuppeppo.death | crowd | v1–v3 | 1 | -6 | 0.05 | P4 | 2 | 40 | 0 | true | 0.25 | 0 | sổ nguồn |
| A49 | td.enemy.thuong-luong.move | crowd | v1–v3 | 1 | -12 | 0.04 | P5 | 1 | 0 | 3000 | true | 0.25 | 0 | sổ nguồn |
| A50 | td.enemy.thuong-luong.attack | crowd | v1–v3 | 1 | -6 | 0.04 | P4 | 2 | 80 | 0 | true | 0.25 | 0 | sổ nguồn |
| A51 | td.enemy.thuong-luong.skill | crowd | v1–v3 | 1 | -4 | 0.03 | P4 | 1 | 0 | 400 | true | 0.25 | 0 | sổ nguồn |
| A52 | td.enemy.thuong-luong.death | crowd | v1–v3 | 1 | -4 | 0.03 | P4 | 2 | 40 | 0 | true | 0.25 | 0 | sổ nguồn |
| A53 | td.enemy.tanuki.move | crowd | v1–v3 | 1 | -12 | 0.05 | P5 | 1 | 0 | 3000 | true | 0.25 | 0 | sổ nguồn |
| A54 | td.enemy.tanuki.attack | crowd | v1–v3 | 1 | -8 | 0.05 | P4 | 2 | 80 | 0 | true | 0.25 | 0 | sổ nguồn |
| A55 | td.enemy.tanuki.skill | crowd | v1–v3 | 1 | -4 | 0.03 | P4 | 1 | 0 | 400 | true | 0.25 | 0 | sổ nguồn |
| A56 | td.enemy.tanuki.death | crowd | v1–v3 | 1 | -6 | 0.05 | P4 | 2 | 40 | 0 | true | 0.25 | 0 | sổ nguồn |
| A57 | td.enemy.troll.move | crowd | v1–v3 | 1 | -10 | 0.04 | P5 | 1 | 0 | 3000 | true | 0.25 | 0 | sổ nguồn |
| A58 | td.enemy.troll.attack | crowd | v1–v3 | 1 | -4 | 0.03 | P4 | 1 | 0 | 400 | true | 0.25 | 0 | sổ nguồn |
| A59 | td.enemy.troll.death | crowd | v1–v3 | 1 | -3 | 0.03 | P4 | 1 | 0 | 0 | true | 0.25 | 0 | sổ nguồn |
| A60 | td.enemy.alicanto.move | crowd | v1–v3 | 1 | -10 | 0.05 | P5 | 1 | 0 | 2500 | true | 0.25 | 0 | sổ nguồn |
| A61 | td.enemy.alicanto.skill | crowd | v1–v3 | 1 | -3 | 0.03 | P4 | 1 | 0 | 0 | true | 0.25 | 0 | sổ nguồn |
| A62 | td.enemy.alicanto.death | crowd | v1–v3 | 1 | -5 | 0.03 | P4 | 2 | 40 | 0 | true | 0.25 | 0 | sổ nguồn |
| A63 | td.enemy.mam-go.move | crowd | v1–v3 | 1 | -14 | 0.05 | P5 | 1 | 0 | 3000 | true | 0.25 | 0 | sổ nguồn |
| A64 | td.enemy.mam-go.attack | crowd | v1–v3 | 1 | -10 | 0.05 | P4 | 2 | 80 | 0 | true | 0.25 | 0 | sổ nguồn |
| A65 | td.enemy.mam-go.death | crowd | v1–v3 | 1 | -8 | 0.05 | P4 | 2 | 40 | 0 | true | 0.25 | 0 | sổ nguồn |
| A66 | td.boss.moc-tinh.attack | world | v1–v3 | 1 | 0 | 0.02 | P4 | 1 | 0 | 0 | true | 0.20 | 0 | sổ nguồn |
| A67 | td.boss.moc-tinh.roots-warn | warnings | v1–v2 | 1 | -2 | 0 | P1 | 1 | 0 | 0 | true | 0.15 | 0 | sổ nguồn |
| A68 | td.boss.moc-tinh.roots | world | v1–v3 | 1 | -1 | 0.03 | P4 | 4 | 30 | 0 | true | 0.20 | 0 | sổ nguồn |
| A69 | td.boss.moc-tinh.roar | crowd | v1–v3 | 1 | 0 | 0.01 | P3 | 1 | 0 | 0 | true | 0.25 | 0 | sổ nguồn |
| A70 | td.boss.moc-tinh.retreat | world | v1 | 1 | 0 | 0 | P3 | 1 | 0 | 0 | true | 0.25 | 0 | sổ nguồn |

Tự quyết: tiếng cú đáp mỗi từ (A05, A08, A17, A24, A20 khi có từ) ưu tiên P3, trên tiếng đánh thường P4, để phần thưởng của gõ luôn nghe được.

## 7. Giọng bậc P (36 câu)

### 7.1 Luật thu

- Ngôn ngữ (28.13): **câu hô thu tiếng Anh trước** (Tướng, Thư Đồng, tổ thợ). **Bà Cú Mực thu tiếng Việt trước.** Giọng Việt cho câu hô là tùy chọn, xếp ở Sau.
- Chép đúng từng chữ của câu. Không thêm, không bớt.
- Thu ở cao độ tự nhiên. Engine nâng +2 bán cung cho lính và Trợ Thủ, và đổi cao độ ±5 % để một giọng nghe như nhiều người (24.4). Vì vậy đừng chọn giọng Thư Đồng quá cao.
- Phụ đề cho mọi câu. Có ô tắt riêng cho câu hô (24.9). AI tích hợp lo.
- Giọng xuất ra khô: không vang, không nhạc nền, không hiệu ứng. Engine lọc, nén và thêm vang theo vùng (24.4).
- Tiếng Việt: chọn công cụ đọc tiếng Việt tốt. Nghe kỹ dấu thanh; sai dấu thì tạo lại. Đọc sai "Draconis" thì khi tạo viết "Đra-cô-nít", phụ đề vẫn giữ chữ đúng.
- Tự quyết: giọng tiếng Anh trung tính, không giả giọng vùng miền.
- Tự quyết: nhân vật nhỏ (Thư Đồng, Em Sẻ) mô tả là "nhân vật hoạt hình, người trẻ lồng tiếng". Không tạo giọng giống trẻ em thật.

### 7.2 Thiết kế giọng (dán vào công cụ thiết kế giọng)

**`draconis`** · Draconis, Tướng (22.2)
```text
Voice of Draconis, an ancient phoenix dragon who guards the star sea. Deep, resonant bass-baritone with a warm chest tone and a faint smoky rasp. Speaks slowly and deliberately with small pauses, proud and calm, with dry understated humor. Clear neutral English, no regional accent. Sounds old and wise, timeless rather than elderly. Never monstrous or growling; battle cries are powerful but still noble.
```

**`helper-cham`** · Thư Đồng Chấm, cẩn thận (22.3)
```text
Voice of Cham, a tiny round owlet apprentice scribe in a storybook fantasy game, voiced by a young adult with a light, high, youthful timbre. Careful, polite and a little nervous; soft, clear, precise diction; medium-slow pace; small gasps when startled. A cute cartoon creature, not a real child's voice. Neutral English.
```

**`helper-phay`** · Thư Đồng Phẩy, lắm lời (câu ở VS; thiết kế cùng lúc để ba giọng khác nhau rõ)
```text
Voice of Phay, a chatty owlet apprentice, voiced by a young adult with a bright, bubbly, high youthful timbre. Talks fast, repeats words, fills gaps with "um", excited and warm, slightly breathless. A cartoon creature, not a real child's voice. Neutral English.
```

**`helper-gach`** · Thư Đồng Gạch, ít nói (câu ở VS)
```text
Voice of Gach, a quiet owlet apprentice, voiced by a young adult with a slightly lower, husky youthful timbre. Terse, one or two words at a time, flat but kind, unhurried, a tiny dry humor. A cartoon creature, not a real child's voice. Neutral English.
```

**`narrator`** · Bà Cú Mực, người kể (22.3). Tự quyết: giọng Bắc chuẩn.
```text
Voice of Ba Cu Muc, an old grandmother owl who keeps the books and tells the story. Elderly woman, warm low-mid alto, slow and unhurried, a smile in the voice, gently teasing and a little funny, an occasional soft chuckle. Native Vietnamese speaker with a standard Northern (Hanoi) accent and very clear diction that children can follow. Not shrill, not shaky.
```

Tự quyết: tuổi của tổ thợ dưới đây. 22.4 chỉ cho tên, vai và tính cách. Id người nói của tổ thợ là `<id nhà ở 0.6>-<tên không dấu>`, ví dụ `gold-mine-anh-em`.

**`keep-lao-gac`** · Lão Gác Cổng, tổ thợ Lũy
```text
Voice of the old gatekeeper of a village fortress, a white-bearded elder who mans a giant crossbow. Old man, gravelly and warm, slow, proud, a grandfather who loves company; when he shouts, a strong rough bark. Neutral English.
```

**`archer-chi-en`** · Chị Én, tổ thợ Tháp Cung
```text
Voice of Chi En, a teenage girl archer of about fifteen, voiced by a young adult. Bright mid-high voice, quick and cheeky, confident, playful bossy-big-sister energy. Neutral English.
```

**`archer-em-se`** · Em Sẻ, tổ thợ Tháp Cung. Tự quyết: em trai nhỏ của Chị Én.
```text
Voice of Em Se, a cheeky little boy archer, the younger brother of a teenage archer girl, voiced by a young adult with a high, squeaky youthful timbre. Excitable, loud for his size, always arguing back. A cartoon character, not a real child's voice. Neutral English.
```

**`cannon-bac-dong`** · Bác Đồng, tổ thợ Tháp Pháo
```text
Voice of Bac Dong, a grumpy cannon master in his fifties. Gruff, raspy and loud, short-tempered in a funny way, clipped sentences, very proud of his cannon. Neutral English.
```

**`barracks-sam`** · Đội trưởng Sấm, tổ thợ Trại Lính
```text
Voice of Captain Sam, leader of the village militia, about forty. Booming chest voice, very loud, enthusiastic drill-sergeant energy, but kind and funny. Neutral English.
```

**`gold-mine-anh-em`** · Ba anh em thợ mỏ. Tự quyết: một giọng, mỗi câu thu 3 lần hơi khác nhau; AI tích hợp chồng 3 bản lệch 30–80 ms, cao độ ±3 % thành một nhóm (24.4).
```text
Voice of a hearty young miner, 25 to 35, cheerful and strong, rhythmic work-chant delivery as if swinging a pickaxe, slightly breathless from digging. Neutral English.
```

**`farm-co-ma`** · Cô Mạ, tổ thợ Ruộng Lúa
```text
Voice of Co Ma, a young rice farmer of about twenty-five. Warm, gentle, sing-song and cheerful, relaxed country calm, smiling while she talks. Neutral English.
```

### 7.3 Câu thoại

Lưu: `art-src/td/audio/voice/<người nói>/<id>-en.wav` (Bà Cú Mực: `-vi.wav`). Cột "Thu trước" là ngôn ngữ thu ở bậc P.

**Draconis** (12 câu, thư mục `draconis`). Tự quyết: chọn 12 trong 19 câu cho các việc có ở 1B, 1C. Bảy câu còn lại (Chọn 2, Hút nhiều Mảnh Chữ, Chuỗi 50, Chuỗi 100, Hợp Tấu, Đủ Chữ Chiêu, Đứng chờ) ở VS.

| Mã | id | EN | VI | Cách đọc | Thu trước |
|---|---|---|---|---|---|
| V01 | `td.vo.draconis.select-1` | I am listening. | Ta nghe. | Trầm, chậm, bình thản, hơi mỉm cười | EN |
| V02 | `td.vo.draconis.move` | Taking wing. | Cất cánh. | Điềm tĩnh, dứt khoát | EN |
| V03 | `td.vo.draconis.assist` | Speak true. I burn. | Đọc cho đúng. Ta thổi lửa theo. | Hai câu tách rõ, chữ "burn" ấm | EN |
| V04 | `td.vo.draconis.skill-1` | Phoenix fire! | Lửa phượng! | Hô mạnh, kiêu hãnh | EN |
| V05 | `td.vo.draconis.skill-2` | Fall, sky-thieves! | Rơi xuống, lũ trộm trời! | Ra lệnh, gằn nhẹ | EN |
| V06 | `td.vo.draconis.ult` | Feathers of flame, fall! | Lông lửa, hãy mưa! | To nhất, kéo dài "fall" | EN |
| V07 | `td.vo.draconis.low-hp` | My scales crack. | Vảy ta nứt rồi. | Thấp, nén đau, không than | EN |
| V08 | `td.vo.draconis.down` | I return from ash. | Ta sẽ về từ tro. | Nhỏ dần, bình thản | EN |
| V09 | `td.vo.draconis.respawn` | Ash cannot hold me. | Tro không giữ nổi ta. | Mạnh, tự tin | EN |
| V10 | `td.vo.draconis.victory` | Another name kept. | Thêm một cái tên được giữ. | Chậm, ấm, hài lòng | EN |
| V11 | `td.vo.draconis.chain-10` | Letters, aligned like stars. | Từng chữ, như sao xếp hàng. | Thán phục nhẹ | EN |
| V12 | `td.vo.draconis.chain-25` | The sky listens. | Bầu trời đang nghe ngươi. | Gần như thì thầm, trang trọng | EN |

**Thư Đồng Chấm** (6 câu, thư mục `helper-cham`)

| Mã | id | EN | VI | Cách đọc | Thu trước |
|---|---|---|---|---|---|
| V13 | `td.vo.helper-cham.select` | Here! | Có em! | Nhanh, lễ phép | EN |
| V14 | `td.vo.helper-cham.go` | On my way. | Em đi liền. | Nhẹ, ngoan | EN |
| V15 | `td.vo.helper-cham.arrive` | Slate ready. | Bảng sẵn rồi. | Cẩn thận, tự hào nhỏ | EN |
| V16 | `td.vo.helper-cham.gold-word` | Golden word! | Chữ vàng kìa! | Reo khẽ, mắt sáng | EN |
| V17 | `td.vo.helper-cham.scared` | My glasses! | Ái! Kính em! | Hốt hoảng, hụt hơi | EN |
| V18 | `td.vo.helper-cham.victory` | Full stop! | Chấm hết câu! | Vui, dứt khoát như chấm câu | EN |

**Bà Cú Mực** (6 câu, thư mục `narrator`, đọc tiếng Việt). Tự quyết: chọn 6 câu bản đồ 1 cần ở 1B. Bảy câu còn lại ở VS. Câu dạy chỉ nói lần đầu; không nói khi boss báo đòn (22.3).

| Mã | id | VI (thu trước) | EN (VS, tùy chọn) | Cách đọc |
|---|---|---|---|---|
| V19 | `td.vo.narrator.teach-wave-1` | Đưa Draconis tới tháp. Gõ chữ bay lên. | Send Draconis. Type the rising words. | Chậm, rõ, như dạy cháu |
| V20 | `td.vo.narrator.rare-first` | Chữ sáng thế kia, đừng để bay mất. | Don't let that one go. | Tinh nghịch, nhắc khẽ |
| V21 | `td.vo.narrator.keep-level-2` | Chấm đâu, ra giúp đi con. | Dot, go help them. | Gọi trìu mến |
| V22 | `td.vo.narrator.mine-thief` | Có trộm ở mỏ kìa! | A thief at the mine! | Nhanh hơn, hơi gấp |
| V23 | `td.vo.narrator.boss-arrives` | Thứ gì to lắm đang tới... | Something huge approaches... | Hạ giọng, hồi hộp |
| V24 | `td.vo.narrator.keep-weak` | Lũy Chữ sắp vỡ! | The Bastion is failing! | Gấp, rõ, không la hét |

- V24 dùng ưu tiên P1: 24.3 xếp "Lũy yếu" vào nhóm luôn phát. Các câu khác của Bà Cú Mực là P3.

**Tổ thợ** (12 câu: 6 nhà × "Người tới" + "Bùng Nổ"). Tự quyết: ai nói câu nào ghi ở cột "Người nói".

| Mã | id | Người nói | EN | VI | Cách đọc | Thu trước |
|---|---|---|---|---|---|---|
| V25 | `td.vo.crew-keep.assist` | `keep-lao-gac` | Typing with me? Splendid. | Lâu lắm mới có người gõ cùng lão. | Vui như ông gặp cháu | EN |
| V26 | `td.vo.crew-keep.overdrive` | `keep-lao-gac` | Shield up! None pass! | Khiên lên! Không đứa nào qua! | Hô mạnh, khàn | EN |
| V27 | `td.vo.crew-barracks.assist` | `barracks-sam` | Someone's on the drum! | Anh em, có người đánh trống rồi! | Vang, phấn khởi | EN |
| V28 | `td.vo.crew-barracks.overdrive` | `barracks-sam` | Charge! | Xung trận! | Gầm to nhất | EN |
| V29 | `td.vo.crew-archer.assist` | `archer-chi-en` | You type, we shoot! | Gõ đi, tụi em bắn theo! | Lém, nhanh | EN |
| V30 | `td.vo.crew-archer.overdrive` | `archer-em-se` | Arrow rain! | Mưa tên nè! | Reo to, khoái chí | EN |
| V31 | `td.vo.crew-cannon.assist` | `cannon-bac-dong` | Type true. I won't miss. | Gõ chuẩn vào, tao không bắn trượt đâu. | Cộc, chắc nịch | EN |
| V32 | `td.vo.crew-cannon.overdrive` | `cannon-bac-dong` | Triple shot! | Ba quả một lúc! | Khoái chí, to | EN |
| V33 | `td.vo.crew-gold-mine.assist` | `gold-mine-anh-em` | Type steady, dig steady! | Gõ đều, cuốc đều! | Như hò, có nhịp | EN |
| V34 | `td.vo.crew-gold-mine.overdrive` | `gold-mine-anh-em` | Gold vein! | Mạch vàng! Mạch vàng! | Reo chồng nhau | EN |
| V35 | `td.vo.crew-farm.assist` | `farm-co-ma` | Steady, like planting rice. | Gõ nhịp nhàng như cấy lúa nha. | Dịu, ngân nga | EN |
| V36 | `td.vo.crew-farm.overdrive` | `farm-co-ma` | Hot rice! | Gặt! Cơm nóng đây! | Vui, gọi to | EN |

### 7.4 Tiếng gắng sức (tự thu rồi đổi giọng)

| Mã | id | Tiếng | Ai | Số bản | Dùng ở |
|---|---|---|---|---|---|
| V-E1 | `td.vo.linh-giao.hup` | "Hup!" ngắn, gọn | Lính Giáo (nam trẻ) | 6 | A17 |
| V-E2 | `td.vo.linh-giao.death` | "Á!" ngắn, kiểu hoạt hình, không đau đớn | Lính Giáo | 6 | A19 |
| V-E3 | `td.vo.crew.heave-ho` | "Hò dô!" của 2–3 người | Thợ (3 giọng × 2 lần) | 6 | A35 |

Tự quyết (22/10, đổi được): "hô" của lính ở 27.2 bậc P là tiếng "Hup!" (V-E1). Câu hô có lời ("Militia ready!"…) ở VS (V155–V166).

Tự quyết: người nói là lính dùng id lính của `01-tripo-characters-enemies.md` (`linh-giao`; ở VS thêm `linh-khien`, `linh-giao-dai`), để giọng, model và manifest cùng một id. Tiếng ngắn `td.soldier.*` dùng chung cho mọi loại lính.

Cách làm:
1. Thu bằng điện thoại hoặc micro USB, trong phòng nhỏ có rèm, chăn (ít vang).
2. Miệng cách micro 15–20 cm, hơi lệch sang bên để hơi thở không bật vào micro.
3. Mỗi tiếng thu 8–10 lần, to nhỏ và dài ngắn hơi khác nhau. Giữ đủ số bản ở cột "Số bản", mỗi bản nghe hơi khác nhau.
4. Đưa vào công cụ đổi giọng. Chọn giọng gần nhân vật. Giữ nguyên cao độ gốc. Không thêm vang hay hiệu ứng: engine thêm (24.4).
5. "Hò dô!" nhiều người: đổi 6 bản sang 3 giọng khác nhau, mỗi giọng 2 bản, lưu `-v1` … `-v6`. AI tích hợp chồng 3 bản khác giọng thành một tiếng nhiều người.
6. Lưu đúng tên ở 2.4 (thư mục `voice/linh-giao/`, `voice/crew/`). Điện thoại ghi M4A thì đổi sang WAV bằng lệnh ở 2.4. Ghi sổ nguồn: công cụ đổi giọng, gói, ngày, "self-recorded".
- Chỉ thu giọng của chính mình hoặc người đã đồng ý. Không thu trẻ em.

### 7.5 Mặc định manifest giọng

| Nhóm | bus | Ưu tiên | Trần, chờ | reverbSend | pitchJitter | spatial |
|---|---|---|---|---|---|---|
| Draconis | `dialogue` | P3 | 1 giọng thoại; 1,5–2,5 s giữa hai câu; không lặp 3–5 câu gần nhất; câu gửi người phát 50 % | 0.10–0.15 | 0.01 | true, ngoài màn hình nhỏ hơn và vang hơn |
| Chấm | `crowd` | P3 | 2 s chung cho mọi Thư Đồng; nhỏ hơn Tướng 3 dB | 0.25 | +2 bán cung, 0.05 | true |
| Bà Cú Mực | `dialogue` | P3; V24 P1 | Câu dạy chỉ một lần; im khi boss báo đòn | 0 (khô) | 0 | false |
| Tổ thợ | `crowd` | P5; câu "Bùng Nổ" P3 | "Người tới" 10 s mỗi nhà | 0.20 | 0.02 | true |
| Lính (gắng sức) | `crowd` | "Hup!" P5, "Á!" P4 | Id riêng, engine phát kèm A17 (sau 120 ms, −6 dB) và A19 (sau 40 ms); trần chung 2 tiếng hô (24.3) | 0.20–0.30 | +2 bán cung, 0.05 | true |
| Thợ "Hò dô!" | `crowd` | P5 | Id riêng, engine phát kèm A35 (sau 300 ms, −6 dB) | 0.20 | 0.03 | true |

- Chờ 6–10 s mỗi trại (1,2 s chung) của 24.3 dành cho câu hô lính ("Militia ready!"…), ở VS.
- Thoại Tướng, boss, người kể: music −6, ambience −6, world −3, crowd −6 dB; xuống 80–150 ms, lên 400–600 ms (24.2). Câu thoại bắt đầu 50–150 ms sau va chạm thấy được (24.3).
- Tự quyết: câu "Bùng Nổ" của tổ thợ theo ưu tiên P3 của Bùng Nổ; giọng Bà Cú Mực để khô.

## 8. Nhạc bậc P

### 8.1 Quyết định

Tự quyết: làm **cả hai**.
1. **Bản bằng mã làm trước.** AI tích hợp viết dữ liệu bài cho `scripts/music/song-engine.mjs`. Chủ dự án không phải làm gì. Ba lớp khớp từng mẫu. Đúng giọng và BPM cho nốt chữ và lưới nhịp. Đây là bản chạy ở 1B, 1C và luôn là bản dự phòng.
2. **Bản công cụ nhạc AI là bản nâng cấp.** Tiếng sáo trúc, đàn tranh thật hơn. Chỉ thay bản mã khi qua kiểm tra ở 8.6.
- Lý do: công cụ AI khó cho ba lớp khớp nhau và đúng nhịp; bản mã thì khớp sẵn.

### 8.2 Thông số M01 `td.music.w1-silverfall` (dùng cho cả hai bản)

| Mục | Giá trị |
|---|---|
| Không khí (22.9) | Cao nguyên sau mưa, 7:30 sáng, cầu vồng trên thác; sáo trúc và đàn dây vui |
| Giọng | Đô trưởng. Giai điệu chính chỉ dùng ngũ cung C D E G A, cùng thang nốt chữ ở `audio-min.ts` |
| Nhịp | 100 BPM, 4/4. Một ô đúng 2,4 s (115.200 mẫu ở 48 kHz) |
| Dài | 64 ô = 153,6 s |
| Vòng lặp | Cả bài: đầu 0,000 s, cuối 153,600 s. Ô 64 nối thẳng về ô 1. Không mở dần, không kết, không mờ cuối |
| Cấu trúc | Ô 1–16: A (sáo). 17–32: B (đàn tranh đáp). 33–48: A' (sáo và dây). 49–64: C (nhẹ, dẫn về A) |
| Độ to | Ba lớp cùng phát: −18 LUFS-I, đỉnh ≤ −1 dBTP. Mỗi lớp giữ đúng mức như trong bản đủ, **không chuẩn hóa riêng từng lớp** |
| Chuyển lớp | Ba lớp bắt đầu cùng lúc, luôn chạy; bật tắt bằng mờ 2 s (24.8) |

Tự quyết: Đô trưởng, 100 BPM, 64 ô. Lý do: thang nốt chữ đã là ngũ cung Đô trưởng; 100 BPM cho một ô đúng số nguyên mẫu, cắt vòng lặp chính xác.

| Lớp (24.8) | Khi nào | Gồm |
|---|---|---|
| `calm` | Bản đồ, pha chuẩn bị (phát một mình) | Sáo trúc, đàn tranh, dây êm, đàn nguyệt gảy nhẹ. Không trống |
| `combat` | Trong đợt (cùng `calm`) | Bass gảy tròn, ostinato gảy, trống tay nhỏ, lắc, phách gỗ |
| `drums` | Đợt cuối (cùng hai lớp kia). Bản đồ 1: đợt boss là đợt cuối | Trống cái hội làng, trống khung lớn, dồn trống vào mỗi câu 8 ô |

Tự quyết: bậc P chưa có bản boss (27.2 xếp VS). Đợt boss bản đồ 1 phát đủ ba lớp, mở bằng câu nhạc M04.

### 8.3 Prompt cho công cụ nhạc AI

Lưu bản đủ: `music/td.music.w1-silverfall.full.wav`. Dán khối dưới vào ô mô tả.

```text
Instrumental loop for a storybook fantasy tower-defense map called Silverfall Meadow: a highland valley at 7:30 in the morning after rain, a rainbow over a silver waterfall, rice terraces and a bamboo village. Bright, warm, hopeful, playful and gently adventurous.
Key: C major. Main melodies use only the C major pentatonic notes C D E G A. Tempo exactly 100 BPM in 4/4, steady, no tempo changes, no ritardando.
Exactly 64 bars (2:33.6). Start on bar 1 already in full groove: no intro, no fade-in, no count-in. Bar 64 leads straight back into bar 1: no ending, no final chord, no fade-out, so the track loops seamlessly.
Form: bars 1-16 main tune on bamboo flute; bars 17-32 the zither answers with a second tune; bars 33-48 the main tune returns with flute and soft strings; bars 49-64 a lighter bridge that builds back toward bar 1.
Three clearly separate instrument groups:
1) Melody and harmony: bamboo transverse flute, Vietnamese 16-string zither (dan tranh) plucks and glissandi, soft warm strings, a gently plucked moon lute.
2) Groove: round plucked bass, a light plucked ostinato, small hand drum, shaker, wooden clapper.
3) Big drums: deep village festival barrel drums and large frame drums, strong accents, short rolls into each 8-bar phrase.
No vocals, no choir, no synths, no electric guitar, no sound effects. Leave room in the upper-middle range so short pentatonic chimes can sit on top.
```

Công cụ chỉ có ô mô tả ngắn thì dùng dòng này:
```text
instrumental, bright Vietnamese folk fantasy, bamboo flute, dan tranh zither, soft strings, plucked bass, hand drums, festival barrel drums, C major, 100 BPM, seamless loop, no vocals
```

- Tạo nhiều bản. Giữ bản nhịp đều, ba nhóm nhạc cụ nghe tách rõ.
- Công cụ cho kéo dài thì kéo tới hơn 2:40, để còn chỗ cắt đủ 64 ô.
- Công cụ AI thường không giữ đúng BPM và số ô. Không sao: AI tích hợp đo nhịp thật, cắt đúng 64 ô (hoặc 32), ghi BPM thật vào manifest.

### 8.4 Lấy ba lớp (stem)

Tải bản đủ và mọi stem công cụ cho. Lưu: `music/td.music.w1-silverfall.<tên stem của công cụ>.wav`. AI tích hợp ghép thành ba lớp như bảng:

| Công cụ cho | `calm` | `combat` | `drums` |
|---|---|---|---|
| Nhiều stem (bộ gõ nhỏ tách khỏi trống lớn) | Stem giai điệu + hòa âm | Bass + bộ gõ nhỏ | Trống |
| 4 stem (drums, bass, other, vocals) | other | bass | drums: tắt ở pha chuẩn bị, −10 dB trong đợt, 0 dB ở đợt cuối |
| Không có stem | Tách bằng công cụ tách stem, rồi làm như dòng trên | | |

- Tự quyết: ở dòng "4 stem", trống lớn và trống nhỏ nằm chung một stem. Vì vậy lớp `drums` chạy nhỏ (−10 dB) trong đợt thường và lên 0 dB ở đợt cuối. Manifest nhạc ghi gain từng lớp theo trạng thái (chuẩn bị, trong đợt, đợt cuối).
- Ba lớp cuối: `music/td.music.w1-silverfall.calm.wav`, `.combat.wav`, `.drums.wav`, cùng số mẫu, cắt ở cùng mẫu, nối vòng mờ 10–20 ms tại điểm qua 0.

### 8.5 Bản bằng mã (việc của AI tích hợp)

- Viết bài theo 8.2 trong một bộ riêng, ví dụ `scripts/music/songs/td/w1-silverfall.mjs`, giống cách bộ Duel làm (`songs/duel/`, `--set=duel`, thư mục ra và file metadata riêng). Không thêm vào `SONGS` của Campaign: bài trong `SONGS` vào `src/audio/music-tracks.json`, danh sách nhạc Galaxy và chế độ Random.
- Nhạc cụ có sẵn: `flute`, `strings`, `taiko`, `shaker`, `rim`, `drone`… (`scripts/music/instruments.mjs`) và `pluck` (`scripts/music/synth.mjs`). Chưa có đàn tranh thật: dùng `pluck` thay.
- `song-engine.mjs` hiện dựng **2 bản** (`calm`, `intense`) có đoạn mở và kết để nối bài. TD cần **3 lớp cộng dồn** và **vòng lặp kín**: chuyển vai pad, giai điệu, arp vào `calm`; bass, bè đối, bộ gõ nhỏ vào `combat`; trống vào `drums`; thêm chế độ lặp không mở, không kết.

### 8.6 Kiểm tra (cả hai bản)

1. Ba lớp cùng số mẫu, cùng điểm đầu (`ffprobe`).
2. Nghe chỗ nối vòng 3 lần liền: không tiếng tách, không hụt nhịp.
3. `pnpm music:handovers --pair=<id>,<id>` (`scripts/music/transition-check.mjs`): đo độ to khi chuyển từ bài này sang bài khác (mờ 7 s từ `mixOut`). Dùng khi bản đồ chuyển sang bản boss hay đoạn kết (VS). Script chỉ đọc `src/audio/music-tracks.json` (đường dẫn viết cứng), nên AI tích hợp thêm vào script một cờ đọc file metadata của bộ TD. Không thêm bài TD vào file của Campaign (8.5). Đạt như `docs/MUSIC_SYSTEM.md`: chỗ lặng ≥ −4 dB, chỗ to ≤ +4,5 dB, không chỗ im. Script này không kiểm vòng lặp kín (vòng lặp không mờ chéo) và không kiểm ba lớp khớp nhau; bước 1 và 2 làm việc đó.
4. Đo giọng và BPM thật, ghi vào manifest nhạc. Thang nốt chữ và đồng dịch theo giọng (24.8).
5. Độ to theo 2.4.
6. Tai người (23.14 mục 9): 4 nhà nhịp 1 s không ồn; nốt chữ đúng giọng nhạc; thoại không đè phát âm từ. Thêm: nhạc không lấn tiếng gõ (24.1).

### 8.7 Câu nhạc ngắn (11, theo 24.8)

Tự quyết: bản bằng mã làm trước (song-engine, bài 1–2 ô, đúng Đô trưởng). Prompt dưới cho bản công cụ AI, tùy chọn. Kèm "Victory" và "Defeat" (đoạn kết ngắn, 24.8) vì bản đồ 1 ở 1B có màn thắng, thua.

Chung: `music` · P3 · stereo · không theo vị trí · một lần · 2 bản. Lưu: `music/<id>-v1.wav`, `-v2.wav`. Độ to: −18 LUFS đo trên cả câu, đỉnh −1 dBTP. Câu nhạc ra giọng khác Đô thì AI tích hợp dịch cao độ về Đô.

Công cụ: dùng công cụ tiếng ngắn và đặt độ dài như bảng dưới, hoặc công cụ nhạc cho đặt độ dài ngắn. Công cụ nhạc chỉ làm bài dài (dùng cho M01) không làm được câu 2–8 s.

Đuôi chung (dán sau mỗi prompt câu nhạc):
```text
Short instrumental music cue in C major, bamboo flute, dan tranh zither, soft strings and village drums, storybook fantasy, no vocals, light natural room sound, ends cleanly with a natural tail under one second.
```

| Mã | id | Khi nào | Dài | Kết ở |
|---|---|---|---|---|
| M02 | `td.stinger.wave-start` | Đầu đợt | 2,5–3 s | Treo ở Sol |
| M03 | `td.stinger.wave-clear` | Hết đợt | 3 s | Đô |
| M04 | `td.stinger.boss-intro` | Boss ra mắt | 4–5 s | Treo, màu La thứ |
| M05 | `td.stinger.boss-phase` | Boss đổi pha | 2–3 s | Treo |
| M06 | `td.stinger.building-unlock` | Mở nhà mới | 2 s | Đô |
| M07 | `td.stinger.overdrive` | Bùng Nổ (chờ 4 s chung) | 2 s | Một nhát mạnh |
| M08 | `td.stinger.slot-unlock` | Mở ô (lễ mở ô) | 3 s | Đô |
| M09 | `td.stinger.chain-20` | Mốc Chuỗi 20 | 2 s | Mi hoặc Sol, sáng |
| M10 | `td.stinger.chain-40` | Mốc Chuỗi 40 | 3 s | Hợp âm Đô rực |
| M11 | `td.stinger.victory` | Thắng | 6–8 s | Hợp âm Đô ngân |
| M12 | `td.stinger.defeat` | Thua | 5–6 s | La thứ sang Đô, nhẹ |

Tự quyết: Thắng 6–8 s, Thua 5–6 s; câu Bùng Nổ chờ 4 s chung để nhiều nhà Bùng Nổ không dồn tiếng.

```text
td.stinger.wave-start: A rousing call: a festival barrel drum roll into a bright rising three-note bamboo flute call and a zither strum, ending on a held G chord, 3 seconds.
td.stinger.wave-clear: A relieved little victory: a playful zither run and a flute phrase falling to a warm C major chord, light hand drum, 3 seconds.
td.stinger.boss-intro: An ominous swell: deep barrel drums and low strings rising, the flute holding one tense note, ending on an unresolved A minor color, 4.5 seconds.
td.stinger.boss-phase: A short tense hit: one big drum hit and a rising low string swell with a fluttering flute, ending suspended, 2.5 seconds.
td.stinger.building-unlock: A bright reward: an upward zither glissando and two bell-like flute notes landing on C, 2 seconds.
td.stinger.overdrive: A powerful burst: a fast drum roll, a rising zither sweep and a bold flute shout, ending on one strong hit, 2 seconds.
td.stinger.slot-unlock: A warm welcome: a soft drum tap, a friendly four-note flute melody and a gentle C major zither chord, 3 seconds.
td.stinger.chain-20: A quick sparkle: a fast ascending pentatonic run C D E G A on flute and zither with a light shaker, ending bright, 2 seconds.
td.stinger.chain-40: A bigger sparkle: the same rising pentatonic run doubled by strings and festival drums, ending on a triumphant C major chord, 3 seconds.
td.stinger.victory: A joyful victory jingle: bamboo flute melody, zither, strings and festival drums, triumphant but warm, ending on a held C major chord, 7 seconds.
td.stinger.defeat: A gentle "try again": soft solo flute and zither, a falling melody, warm rather than sad, moving from A minor to a soft hopeful C major chord, 5.5 seconds.
```

## 9. Bậc Sau (chỉ liệt kê)

| Món | Vì sao ở Sau |
|---|---|
| Âm cho phim CGI dựng sẵn (C4): nhạc, tiếng, giọng | 27.2, 28.2 |
| Giọng Việt đầy đủ cho mọi câu hô (Tướng, Thư Đồng, tổ thợ, lính, boss, quái) | 27.2, 28.13 |
| Giọng kể tranh truyện (C3, tiếng Việt) | 23.13; 27.2 chưa xếp bậc; bước 6 |
| Câu người đón ở Thư Thành (22.8: 5 người × 3 câu), nhạc và âm nền Thư Thành | Bước 6; 27.2 chưa xếp bậc |
| Nhạc và tiếng cho StylePack Neon, bản đồ neon "Khe Nứt Biển Sao" | 24.8 (Neon: điện tử). Bản thử Neon ở VS dùng tạm thư viện nhạc có sẵn của Space Typing |
| Nhạc riêng bản đồ phụ "Đồi Chè" | MVP; làm ở đây nếu VS không làm bản thứ 4 |
| Thế giới 2 trở đi: nhạc cụ, âm nền, quái mới | 26.3 |
| Vô Tận, thử thách ngày, trang phục | 26.2, sau MVP |

## 10. Chỗ thiết kế chưa nói (đã tự quyết ở trên)

- 27.2 ghi "Bùng Nổ 5 nhà" nhưng bậc P có 6 nhà có Bùng Nổ. Đã chọn 5 nhà của 1A.
- 27.2 ghi ~40–60 tiếng, nhưng đủ đi, đánh, chết của 7 quái cộng 8 lớp chất liệu đã vượt mức đó. Bậc P có 70 id (mục 5).
- 27.2 bậc P không có tiếng cảnh báo, dù 24.3 xếp mở cửa sổ gõ trực tiếp, Lũy yếu, Đổ Nát vào P1. Đã thêm 2 tiếng; Lũy yếu ở P có câu V24; phần còn lại ở VS.
- 24.5 ghi "N quái" cho lớp nhiều mục tiêu, không ghi N. Đã chọn 3.
- Manifest 24.2 không có bus riêng cho từng lớp. Vì vậy "Hup!", "Á!", "Hò dô!" là id giọng riêng, engine phát kèm tiếng chính.
- Thiết kế không chọn 12 câu Draconis và 6 câu Bà Cú Mực cho bậc P. Đã chọn theo việc có ở 1B.
- Tổ thợ hai, ba người không ghi ai nói câu nào. Đã gán ở 7.3.
- Không có tuổi của tổ thợ, giới của Em Sẻ và ba anh em thợ mỏ. Đã tự đặt ở 7.2.
- Không có giọng, nhịp, độ dài cho nhạc bản đồ 1. Đã đặt ở 8.2.
- Không nói bậc P có bản boss hay không (27.2 xếp bản boss ở VS). Đợt boss bản đồ 1 dùng đủ ba lớp.
- Không có độ dài cho đoạn kết thắng, thua. Đã đặt 6–8 s và 5–6 s.
- `transition-check.mjs` đo chuyển bài, không đo ba lớp khớp nhau. Đã thêm bước kiểm số mẫu và nghe chỗ nối.
