# Prompt âm thanh cho Typing Defense: bậc VS (22/10/2026)

> **Dành cho:** chủ dự án (tạo tiếng bằng công cụ AI), ChatGPT (đọc file, viết và chỉnh prompt), AI tích hợp về sau.
>
> **Lấy từ thiết kế** `docs/td/TYPING_DEFENSE_DESIGN.md`: 0.6, 11–12 (nhà, nhánh), 17.4, 22.2–22.4, 22.6–22.9, 23.8, 24, 26.2 (bước 5 là lát dọc VS), 27.2.
>
> **File chính:** [`04-audio.md`](04-audio.md) (bậc P). Cách làm, công cụ, tên file, định dạng, độ lớn, sổ nguồn, đuôi prompt chung và thiết kế giọng của người nói bậc P đều ở đó. File này chỉ có món bậc **VS**.
>
> **VS gọn hơn P:** prompt tiếng ngắn gom theo nhóm, mỗi dòng `Mã id · tên Việt | dài | số bản | prompt`. Bus, ưu tiên, trần lấy theo bảng mặc định ở mục 3.7. Mã tiếp số file chính: **A71+** tiếng ngắn, **V37+** câu thoại, **M13+** nhạc, **N01+** âm nền.

```text
Instructions for ChatGPT
1. This is the tier VS part of the Typing Defense audio pack. Read 04-audio.md first
   (same folder, same repo and branch):
   it holds the rules, the Common SFX tail (3.1), the LOOP and SOFTPITCH lines (3.2),
   file naming (2.4), the music method (section 8) and the voice designs of tier P speakers (7.2).
2. Each SFX line here is "code id · Vietnamese name | length | variants | prompt".
   Final prompt = that prompt, ending with its length (e.g. "1.2 seconds"),
   + the Common SFX tail (+ LOOP when the length says "loop",
   + SOFTPITCH when the line says "add SOFTPITCH"). Notes in parentheses are instructions,
   not prompt text. One final prompt per file (one per layer for layered items).
   Save as sfx/<id>-v<n>.wav unless the item says otherwise. Sound effects are mono
   unless the line says stereo.
3. Voice: build the voice from its Voice design block, then the spoken text is only the
   line text, copied exactly. Never read the delivery notes; if the tool has a style or
   direction field, put a short English version of the note there. Text in parentheses is
   a wordless sound (giggle, hiss): never read it as words; use its prompt in section 2.9.
4. Exact file names only. One sound per prompt. No music or speech inside SFX unless asked.
   Never name commercial games, brands, real people or living artists.
5. If something is unclear or seems to contradict the design, ask the owner. Do not guess.
```

## 1. Tóm tắt VS

| Nhóm | Số | Ghi chú |
|---|---|---|
| Câu thoại | 156 câu (V37–V192) + 8 tiếng gắng sức | Thêm bản thu 2 và 3 cho mọi câu Tướng (27.2 "2–3 bản") |
| Tiếng ngắn | 161 id (A71–A231) | 14 bộ quái × 4 nhóm, mọi vũ khí và va chạm, nhà, sự kiện, người, 2 boss |
| Âm nền | 3 bản đồ × 2 lớp (N01–N06) | Lớp nền lặp + lớp chi tiết |
| Nhạc | 3 bản mới (1 tùy chọn) + 1 bản boss + 4 câu ngắn (M13–M20) | Cùng cách làm mục 8 file chính |

- Có liên quan tới bậc P nhưng để VS: 7 câu Draconis, 7 câu Bà Cú Mực, Bùng Nổ Ruộng, tiếng hết Bùng Nổ, Từ Vàng xong, khiên vòm Troll, Mộc Tinh đi.
- Tiếng đi, đánh của 7 quái bậc P đã ở file chính (A41–A65). Ở đây chỉ có các nhóm còn thiếu.
- Phần ghi "Tự quyết" là chỗ thiết kế chưa nói.

## 2. Giọng VS

### 2.1 Luật

- Như file chính 7.1: câu hô thu tiếng Anh trước; Bà Cú Mực thu tiếng Việt trước; giọng Việt cho câu hô ở Sau.
- Câu Tướng: mỗi câu 2–3 bản: `<id>-en.wav`, `<id>-en-v2.wav`, `<id>-en-v3.wav` (cách đặt tên ở file chính 2.4). Câu bậc P (V01–V12) thu thêm `-en-v2`, `-en-v3` ở đây.
- Bà Cú Mực: thêm bản tiếng Anh cho cả 13 câu (`-en`), tùy chọn, cho người chọn ngôn ngữ thoại "Anh".
- Câu hô quái tối đa 1 lần mỗi 4 s mỗi loài, tắt khi boss báo đòn (22.6). Thoại boss đổi cao độ không quá ±1 % (24.5).

### 2.2 Thiết kế giọng mới

**`lam`** · Lam, Tướng. Tự quyết: giọng nữ trẻ (đổi được).
```text
Voice of Lam, a fire-cat courier hero: quick, boastful, kind-hearted and fussy about every letter being right. Young adult woman, bright energetic mid-range voice with a playful rasp, fast talker, big confident shouts. Neutral English.
```
**`tre`** · Tre, Tướng (cô thợ mộc 15 tuổi)
```text
Voice of Tre, a fifteen-year-old carpenter girl, voiced by a young adult: practical, witty and steady, a confident craftsperson with a teasing grin. Clear mid voice, medium pace. Neutral English.
```
**`cannon-cau-lua`** · cậu Lửa (EN "Ember", từ câu 22.4), tổ thợ Tháp Pháo
```text
Voice of Ember, a teenage cannon apprentice, voiced by a young adult: eager, a bit clumsy, voice cracking with excitement, quick. Neutral English.
```
**`scribe-thay-do`** · Thầy Đồ Mực, tổ thợ Tháp Thư Pháp
```text
Voice of Thay Do Muc, an elderly calligraphy teacher who speaks as if reciting poetry: measured sing-song cadence, gentle authority, soft breathy elegance. Neutral English.
```
**`lumber-chu-tieu`** · Chú Tiều, tổ thợ Trại Gỗ
```text
Voice of Chu Tieu, a hearty woodcutter around forty: deep, simple and cheerful, outdoorsy, a little gruff. Neutral English.
```
**`seal-dais-tro-muc`** · Trò Mực, tổ thợ Đài Ấn (nói thì thầm)
```text
Voice of Tro Muc, a young apprentice at a stone word-dais who always whispers: soft, airy, careful whisper, calm and respectful of words, still clearly understandable. Neutral English.
```
**`infirmary-ba-lang`** · Bà Lang Thơm, tổ thợ Nhà Thuốc
```text
Voice of Ba Lang Thom, an old village herbalist: kind and motherly, gently scolding, warm, slightly nasal, unhurried. Neutral English.
```
**`linh-giao`**, **`linh-khien`**, **`linh-giao-dai`** · ba loại lính. Tự quyết: id như model ở `01-tripo-characters-enemies.md` (P8) và file `-vs` (VS3, VS4): Lính Giáo (lính thường; cùng giọng với tiếng gắng sức bậc P), Lính Khiên (nhánh Khiên Đồng), Lính Giáo Dài (nhánh Giáo Dài).
```text
linh-giao: A young village militia man, light and eager voice, short punchy shouts. Neutral English.
linh-khien: A sturdy militia shield-bearer, deeper steady voice, calm firm shouts. Neutral English.
linh-giao-dai: A lanky long-spear militia man, bold slightly nasal voice, cocky shouts. Neutral English.
```
**`boss-moc-tinh`** · Mộc Tinh
```text
Voice of the Nameless Banyan, a huge ancient tree spirit that forgot its own name: extremely deep, slow, creaking and wooden, sorrowful and confused rather than evil, every word heavy like a branch bending. Neutral English.
```
**`boss-dai-bang-tinh`** · Đại Bàng Tinh
```text
Voice of the Storm Eagle, a giant greedy eagle spirit: loud, arrogant, raspy and sharp, screeching edges on big words, fast boastful delivery. Neutral English.
```
**`enemy-<id>`** · câu hô quái. Tự quyết: mỗi loài một giọng nhỏ, có vang (engine thêm vang 20–30 %).
```text
Small creature voice for short enemy shouts in a storybook fantasy game: one or two words, silly-menacing, never scary for children. Adjust per species: hopping undead = stiff monotone; ogre = deep and dim; troll = gravelly; golden bird = shrill and greedy; raccoon-dog = chirpy and cheeky; water wraith = cold whisper; goblin = jolly and loud; one-legged fire bird = crackly and excitable.
```

### 2.3 Tướng

Lưu: `voice/<người nói>/<id>-en.wav`, bản thu thêm `-en-v2.wav`, `-en-v3.wav`. VI ở cột thứ tư dùng cho phụ đề và khi có giọng Việt (Sau).

**Draconis** (7 câu còn lại, giọng ở file chính 7.2)

| Mã | id | EN | VI | Cách đọc |
|---|---|---|---|---|
| V37 | `td.vo.draconis.select-2` | This sky has a name. | Bầu trời này cũng có tên. | Trầm, như nhắc chuyện cũ |
| V38 | `td.vo.draconis.shards` | Their names return. | Tên của chúng trở về rồi. | Nhẹ, hài lòng |
| V39 | `td.vo.draconis.chain-50` | A whole constellation. | Cả chòm sao sáng rồi. | Thán phục rõ |
| V40 | `td.vo.draconis.chain-100` | I've never seen this. | Ta chưa thấy ai gõ thế này. | Ngạc nhiên thật, chậm |
| V41 | `td.vo.draconis.harmony` | Two fires, one song. | Hai ngọn lửa, một bài ca. | Ấm, gần như hát |
| V42 | `td.vo.draconis.ult-words` | More feathers, fall! | Lông lửa, rơi nữa! | Hô mạnh |
| V43 | `td.vo.draconis.idle` | Small houses. Pretty, though. | Nhà các ngươi nhỏ thật. Đẹp, nhưng nhỏ. | Hài khô |

**Lam** (18 câu nói; "Kỹ năng 2" là tiếng lửa A132)

| Mã | id | EN | VI | Cách đọc |
|---|---|---|---|---|
| V44 | `td.vo.lam.select-1` | Express delivery! | Thư hỏa tốc đây! | Tươi, nhanh |
| V45 | `td.vo.lam.select-2` | Blue flame, ready! | Lửa lam, sẵn sàng! | Tự tin |
| V46 | `td.vo.lam.move` | On my way! | Chạy liền! | Nhanh |
| V47 | `td.vo.lam.assist` | Type fast, shoot fast! | Gõ nhanh, bắn nhanh! | Hăng |
| V48 | `td.vo.lam.skill-1` | Blue claws! | Vuốt lam! | Hô gọn |
| V49 | `td.vo.lam.ult` | Express fire! Move! | Hỏa tốc, tránh đường! | To nhất |
| V50 | `td.vo.lam.low-hp` | My flame's flickering... | Lửa em chập chờn... | Hụt hơi |
| V51 | `td.vo.lam.down` | Undelivered... | Thư... chưa gửi... | Nhỏ dần |
| V52 | `td.vo.lam.respawn` | Couriers never quit! | Phi Thư không bỏ cuộc! | Bật lại, mạnh |
| V53 | `td.vo.lam.victory` | Delivered! | Giao thành công! | Khoe |
| V54 | `td.vo.lam.shards` | Got every letter! | Nhặt hết, không sót chữ nào! | Vui |
| V55 | `td.vo.lam.chain-10` | Every letter, perfect! | Chuẩn từng chữ! | Hài lòng |
| V56 | `td.vo.lam.chain-25` | Right on time! | Thư đi đúng giờ! | Nhanh, vui |
| V57 | `td.vo.lam.chain-50` | Faster than wind! | Nhanh hơn gió! | Hứng khởi |
| V58 | `td.vo.lam.chain-100` | Grandma, I did it! | Bà ơi, cháu làm được rồi! | Xúc động, nghẹn nhẹ |
| V59 | `td.vo.lam.harmony` | Whole team's on fire! | Cả đội cùng cháy! | Reo |
| V60 | `td.vo.lam.ult-words` | Express, again! | Hỏa tốc lần hai! | Hô |
| V61 | `td.vo.lam.idle` | Standing still itches. | Đứng yên lâu, đuôi ngứa quá. | Sốt ruột, hài |

**Tre** (17 câu nói). Hai câu không có chữ tiếng Anh (Hồi sinh "(chạy ra)", Hút nhiều Mảnh Chữ "(tiếng gỗ gõ)"): bản EN dùng tiếng A141, A142; chữ Việt "Em về rồi!", "Gom đủ rồi!" thu khi có giọng Việt (Sau), id `td.vo.tre.respawn` và `td.vo.tre.shards`.

| Mã | id | EN | VI | Cách đọc |
|---|---|---|---|---|
| V62 | `td.vo.tre.select-1` | Tre, reporting! | Thợ cả Tre đây! | Lanh lợi |
| V63 | `td.vo.tre.select-2` | Measure twice, cut once. | Đo hai lần, cắt một lần. | Chậm, chắc |
| V64 | `td.vo.tre.move` | Let me check it. | Để em xem chỗ đó. | Thực tế |
| V65 | `td.vo.tre.assist` | Steady hands, more gold! | Gõ đều tay, mỏ ra vàng! | Khích lệ |
| V66 | `td.vo.tre.skill-1` | Barricade! | Rào lại! | Hô gọn |
| V67 | `td.vo.tre.skill-2` | Fly, dragonfly! | Bay đi, chuồn chuồn! | Vui |
| V68 | `td.vo.tre.ult` | Everyone, scaffolds up! | Cả làng, dựng giàn! | Gọi to |
| V69 | `td.vo.tre.low-hp` | Can't hammer this... | Cái này búa không sửa được... | Lo |
| V70 | `td.vo.tre.down` | Keep Dad's notebook... | Sổ của bố... giữ giùm em... | Nhỏ dần |
| V71 | `td.vo.tre.victory` | Done! Solid as stone. | Xong! Chắc như đá tảng. | Tự hào |
| V72 | `td.vo.tre.chain-10` | Steady now! | Đều tay rồi đó! | Khen |
| V73 | `td.vo.tre.chain-25` | Fits like a joint! | Khớp như mộng gỗ! | Thích thú |
| V74 | `td.vo.tre.chain-50` | Whole workshop humming! | Cả xưởng chạy êm! | Hớn hở |
| V75 | `td.vo.tre.chain-100` | Dad, look! | Bố ơi, nhìn nè! | Xúc động |
| V76 | `td.vo.tre.harmony` | Two houses, one beat! | Hai nhà một nhịp! | Reo |
| V77 | `td.vo.tre.ult-words` | One more floor! | Dựng thêm tầng nữa! | Hô |
| V78 | `td.vo.tre.idle` | Who built this crooked? | Ai dựng cái tháp này lệch hai phân vậy? | Càu nhàu, hài |

### 2.4 Thư Đồng Phẩy, Gạch (giọng ở file chính 7.2)

| Mã | id | EN | VI | Cách đọc |
|---|---|---|---|---|
| V79 | `td.vo.helper-phay.select` | Yes, um, here! | Dạ, em, à, đây! | Lúng túng, nhanh |
| V80 | `td.vo.helper-phay.go` | Going, going! | Đi, đi, đi nè! | Lăng xăng |
| V81 | `td.vo.helper-phay.arrive` | Where's the drum? | Trống đâu, trống đâu? | Nhìn quanh |
| V82 | `td.vo.helper-phay.gold-word` | Ooh, gold! | Ôi, ôi, vàng! | Reo |
| V83 | `td.vo.helper-phay.scared` | Run, run! | Ối, chạy, chạy! | Hoảng |
| V84 | `td.vo.helper-phay.victory` | Great, great! | Hay quá, hay, hay! | Vỗ tay |
| V85 | `td.vo.helper-gach.select` | Yep. | Ừ. | Bằng giọng |
| V86 | `td.vo.helper-gach.go` | Going. | Đi. | Gọn |
| V87 | `td.vo.helper-gach.arrive` | On it. | Vào việc. | Gọn |
| V88 | `td.vo.helper-gach.gold-word` | Nice. | Được. | Hơi cười |
| V89 | `td.vo.helper-gach.scared` | Oof. | Ui. | Khẽ |
| V90 | `td.vo.helper-gach.victory` | Done. | Xong. | Bằng, ấm |

### 2.5 Tổ thợ (57 câu còn lại, 22.4)

Tự quyết: người nói ghi ở cột 3. Cột "Lúc" theo bảng 22.4. Cách đọc theo tính cách ở thiết kế giọng.

| Mã | id | Người nói | Lúc | EN | VI |
|---|---|---|---|---|---|
| V91 | `td.vo.crew-keep.upgrade` | `keep-lao-gac` | Nâng cấp | The walls rise. | Tường cao thêm một thước. |
| V92 | `td.vo.crew-keep.hit` | `keep-lao-gac` | Bị đánh | One got through! | Lọt một đứa rồi! |
| V93 | `td.vo.crew-keep.nice-word` | `keep-lao-gac` | Chữ đẹp | That word deserves the gate. | Chữ này lão treo lên cổng được đấy. |
| V94 | `td.vo.crew-keep.weak` | `keep-lao-gac` | Lũy yếu | While I stand, it stands. | Lão còn đứng, Lũy còn đứng. |
| V95 | `td.vo.crew-archer.build` | `archer-chi-en` | Xây | Bows up! | Chòi dựng xong! |
| V96 | `td.vo.crew-archer.upgrade` | `archer-em-se` | Nâng cấp | New strings! | Tên mới, dây mới! |
| V97 | `td.vo.crew-archer.hit` | `archer-em-se` | Bị đánh | Hey! Our tower! | Ê! Chòi tụi em mà! |
| V98 | `td.vo.crew-archer.nice-word` | `archer-chi-en` | Chữ đẹp | Bullseye! | Trúng hồng tâm! |
| V99 | `td.vo.crew-archer.rush` | `archer-chi-en` | Cơn Gấp | So many! Type faster! | Đông quá! Gõ nhanh lên! |
| V100 | `td.vo.crew-cannon.build` | `cannon-bac-dong` | Xây | Cannon's set. Stand back. | Ụ pháo đây. Đứng xa ra. |
| V101 | `td.vo.crew-cannon.upgrade` | `cannon-cau-lua` | Nâng cấp | Bigger barrel! | Nòng to hơn, tai điếc hơn. |
| V102 | `td.vo.crew-cannon.hit` | `cannon-bac-dong` | Bị đánh | Who's touching my cannon?! | Đứa nào đụng pháo tao?! |
| V103 | `td.vo.crew-cannon.nice-word` | `cannon-bac-dong` | Chữ đẹp | Good! Load it! | Được! Nạp đạn! |
| V104 | `td.vo.crew-cannon.rush` | `cannon-bac-dong` | Cơn Gấp | Ember! All the shot! | Thằng Lửa! Khuân hết đạn ra! |
| V105 | `td.vo.crew-scribe.build` | `scribe-thay-do` | Xây | Ink ground. Brush ready. | Nghiên đã mài, bút đã sẵn. |
| V106 | `td.vo.crew-scribe.upgrade` | `scribe-thay-do` | Nâng cấp | A new stroke. | Nét mới, ý mới. |
| V107 | `td.vo.crew-scribe.assist` | `scribe-thay-do` | Người tới | Your words, my ink. | Chữ của con, mực của thầy. |
| V108 | `td.vo.crew-scribe.overdrive` | `scribe-thay-do` | Bùng Nổ | The great letter! | Đại tự, hạ bút! |
| V109 | `td.vo.crew-scribe.hit` | `scribe-thay-do` | Bị đánh | Mind the inkstone! | Đừng làm đổ nghiên! |
| V110 | `td.vo.crew-scribe.nice-word` | `scribe-thay-do` | Chữ đẹp | A dragon's stroke! | Nét như rồng bay! |
| V111 | `td.vo.crew-scribe.rush` | `scribe-thay-do` | Cơn Gấp | More ink! | Mực đâu! Mài thêm mực! |
| V112 | `td.vo.crew-barracks.build` | `barracks-sam` | Xây | Militia, fall in! | Dân quân tập hợp! |
| V113 | `td.vo.crew-barracks.upgrade` | `barracks-sam` | Nâng cấp | Longer spears! | Giáo dài hơn, khiên dày hơn! |
| V114 | `td.vo.crew-barracks.hit` | `barracks-sam` | Bị đánh | Hold the camp! | Giữ trại! |
| V115 | `td.vo.crew-barracks.nice-word` | `barracks-sam` | Chữ đẹp | All present! | Đếm đủ! Một, hai, ba! |
| V116 | `td.vo.crew-barracks.rush` | `barracks-sam` | Cơn Gấp | Drums! | Chúng tới đông lắm! Trống lên! |
| V117 | `td.vo.crew-gold-mine.build` | `gold-mine-anh-em` | Xây | Heave-ho, a mine! | Hò dô, có mỏ rồi! |
| V118 | `td.vo.crew-gold-mine.upgrade` | `gold-mine-anh-em` | Nâng cấp | Dig deeper! | Đào sâu thêm chút nữa! |
| V119 | `td.vo.crew-gold-mine.hit` | `gold-mine-anh-em` | Bị đánh | Thieves! | Có trộm! Giữ goòng! |
| V120 | `td.vo.crew-gold-mine.nice-word` | `gold-mine-anh-em` | Chữ đẹp | Look at this nugget! | Cục này to nè! |
| V121 | `td.vo.crew-gold-mine.rush` | `gold-mine-anh-em` | Cơn Gấp | Golden hour! | Giờ vàng! Gõ lẹ lên! |
| V122 | `td.vo.crew-farm.build` | `farm-co-ma` | Xây | Planting! | Ruộng cày xong, cấy thôi! |
| V123 | `td.vo.crew-farm.upgrade` | `farm-co-ma` | Nâng cấp | Big harvest! | Lúa năm nay sai hạt! |
| V124 | `td.vo.crew-farm.hit` | `farm-co-ma` | Bị đánh | Off my rice! | Đừng giẫm lúa tôi! |
| V125 | `td.vo.crew-farm.nice-word` | `farm-co-ma` | Chữ đẹp | So steady! | Đều tay quá! |
| V126 | `td.vo.crew-farm.rush` | `farm-co-ma` | Cơn Gấp | Harvest time! | Mùa gặt tới! Ra đồng hết! |
| V127 | `td.vo.crew-lumber.build` | `lumber-chu-tieu` | Xây | Sharp axe, good wood. | Rìu sắc, gỗ tốt. |
| V128 | `td.vo.crew-lumber.upgrade` | `lumber-chu-tieu` | Nâng cấp | More saws! | Thêm cưa, thêm người. |
| V129 | `td.vo.crew-lumber.assist` | `lumber-chu-tieu` | Người tới | A word per tree! | Gõ một chữ, đốn một cây! |
| V130 | `td.vo.crew-lumber.overdrive` | `lumber-chu-tieu` | Bùng Nổ | Timber! | Cây đổ! Tránh ra! |
| V131 | `td.vo.crew-lumber.hit` | `lumber-chu-tieu` | Bị đánh | My shed! | Lán của tôi! |
| V132 | `td.vo.crew-lumber.nice-word` | `lumber-chu-tieu` | Chữ đẹp | Clean cut! | Nhát này ngọt! |
| V133 | `td.vo.crew-lumber.rush` | `lumber-chu-tieu` | Cơn Gấp | Logs downstream! | Gỗ trôi kìa! Vớt nhanh! |
| V134 | `td.vo.crew-seal-dais.build` | `seal-dais-tro-muc` | Xây | The word-vein glows. | Mạch chữ đang sáng lên. |
| V135 | `td.vo.crew-seal-dais.upgrade` | `seal-dais-tro-muc` | Nâng cấp | Another ring. | Thêm một vòng chữ. |
| V136 | `td.vo.crew-seal-dais.assist` | `seal-dais-tro-muc` | Người tới | Slow and clear. | Đọc chậm, đọc rõ nha. |
| V137 | `td.vo.crew-seal-dais.overdrive` | `seal-dais-tro-muc` | Bùng Nổ | Seal! | Ấn! |
| V138 | `td.vo.crew-seal-dais.hit` | `seal-dais-tro-muc` | Bị đánh | The letters fade... | Chữ đang tắt... |
| V139 | `td.vo.crew-seal-dais.nice-word` | `seal-dais-tro-muc` | Chữ đẹp | Beautiful. | Cụm này đẹp quá. |
| V140 | `td.vo.crew-seal-dais.boss-window` | `seal-dais-tro-muc` | Boss mở cửa sổ | Hero, to the dais! | Tướng ơi, về đài! |
| V141 | `td.vo.crew-infirmary.build` | `infirmary-ba-lang` | Xây | Medicine's brewing. | Thuốc sắc rồi. |
| V142 | `td.vo.crew-infirmary.upgrade` | `infirmary-ba-lang` | Nâng cấp | More herbs! | Thêm lá, thêm rễ. |
| V143 | `td.vo.crew-infirmary.assist` | `infirmary-ba-lang` | Người tới | Type the right dose. | Gõ cho đúng liều nghe con. |
| V144 | `td.vo.crew-infirmary.overdrive` | `infirmary-ba-lang` | Bùng Nổ | Drink up! | Uống đi, khỏe liền! |
| V145 | `td.vo.crew-infirmary.hit` | `infirmary-ba-lang` | Bị đánh | My pot's spilled! | Đổ nồi thuốc rồi! |
| V146 | `td.vo.crew-infirmary.nice-word` | `infirmary-ba-lang` | Chữ đẹp | Perfect dose! | Đúng liều! |
| V147 | `td.vo.crew-infirmary.soldiers-down` | `infirmary-ba-lang` | Lính chết nhiều | Slow down! | Từ từ thôi các con! |

### 2.6 Bà Cú Mực (7 câu còn lại, thu tiếng Việt trước)

| Mã | id | VI | EN (tùy chọn) | Cách đọc |
|---|---|---|---|---|
| V148 | `td.vo.narrator.wave` | Chúng đến rồi. Giữ chữ cho chắc! | Here they come. Hold your words! | Chắc, ấm |
| V149 | `td.vo.narrator.last-wave` | Đợt cuối. Gõ cho đẹp nào. | Last wave. Type it beautifully. | Khích lệ |
| V150 | `td.vo.narrator.ult-ready` | Sẵn sàng rồi đó. | Your power is ready. | Nhẹ, gợi ý |
| V151 | `td.vo.narrator.rush` | Nhà kia đang cần người! | That house needs hands! | Gấp vừa |
| V152 | `td.vo.narrator.piggy` | Heo đất chạy lạc kìa! Gõ tên nó đi! | A lost piggy! Type it! | Vui, buồn cười |
| V153 | `td.vo.narrator.victory` | Thung lũng còn nhớ tên mình. | The valley remembers. | Chậm, ấm |
| V154 | `td.vo.narrator.defeat` | Không sao. Đọc lại từ đầu nhé. | Let's read it again. | Dịu, an ủi |

### 2.7 Lính (3 loại × 4 câu + 2 tiếng gắng sức)

Thiết kế chỉ có 5 câu hô tiếng Anh (23.8), không có chữ Việt. Tự quyết: chia 5 câu cho 3 loại, mỗi loại 4 câu + "Hup!" + "Á!" (đủ 6, trong khoảng 5–7 của 27.2).

Tự quyết: chữ Việt dưới đây dùng cho phụ đề và giọng Việt sau này. "Xung trận!" lấy từ 23.8 (Bùng Nổ Trại Lính).

| Câu EN | VI |
|---|---|
| Militia ready! | Dân quân sẵn sàng! |
| Hold the road! | Giữ đường! |
| Hooray! | Hoan hô! |
| Charge! | Xung trận! |
| Shields up! | Giơ khiên lên! |

| Mã | id | Người nói | EN |
|---|---|---|---|
| V155–V158 | `td.vo.linh-giao.ready`, `.hold`, `.hooray`, `.charge` | `linh-giao` | Militia ready! · Hold the road! · Hooray! · Charge! |
| V159–V162 | `td.vo.linh-khien.ready`, `.shields`, `.hold`, `.hooray` | `linh-khien` | Militia ready! · Shields up! · Hold the road! · Hooray! |
| V163–V166 | `td.vo.linh-giao-dai.ready`, `.charge`, `.hold`, `.hooray` | `linh-giao-dai` | Militia ready! · Charge! · Hold the road! · Hooray! |

- Ưu tiên P5, chờ 6–10 s mỗi trại, 1,2 s chung (24.3).

### 2.8 Boss (2 × 6, 22.7)

Tự quyết: lúc phát mỗi câu ghi ở cột "Lúc". Thư mục giọng: `boss-moc-tinh`, `boss-dai-bang-tinh`. Bus `dialogue`, P3.

| Mã | id | Lúc | EN | VI |
|---|---|---|---|---|
| V167 | `td.vo.moc-tinh.intro` | Ra mắt | Where... is my name? | Tên ta ở đâu? |
| V168 | `td.vo.moc-tinh.taunt` | Rút lui (bản đồ 1), pha 2 | My roots outlast your words. | Rễ ta sâu hơn chữ các ngươi. |
| V169 | `td.vo.moc-tinh.root-wall` | Cắm Rễ, Tường Rễ | Earth, hold them! | Đất ơi, giữ chúng lại! |
| V170 | `td.vo.moc-tinh.name-near` | Cửa sổ "Gọi Tên" đúng | That name... I know it... | Cái tên đó... quen quá... |
| V171 | `td.vo.moc-tinh.roots` | Rễ Trồi | Roots, rise! | Rễ ơi, mọc lên! |
| V172 | `td.vo.moc-tinh.remember` | Gục (bản đồ 3) | Ah... I remember. | À... ta nhớ rồi. |
| V173 | `td.vo.dai-bang-tinh.intro` | Ra mắt | Gold! Boats! All mine! | Vàng! Thuyền! Của ta hết! |
| V174 | `td.vo.dai-bang-tinh.sky` | Sà Cắp | The sky is mine. | Trên trời, ta là vua. |
| V175 | `td.vo.dai-bang-tinh.gust` | Bão Cánh | Winds, scatter them! | Gió ơi, thổi bay chúng! |
| V176 | `td.vo.dai-bang-tinh.fall` | Rơi xuống (ấn đúng hoặc tự rơi) | Let go! My wings! | Buông ra! Cánh ta! |
| V177 | `td.vo.dai-bang-tinh.storm` | Vào pha 2, Bão Lớn | Storm, rise! | Bão lên! |
| V178 | `td.vo.dai-bang-tinh.death` | Gục | My wings... so light... | Cánh ta... nhẹ quá... |

### 2.9 Câu hô quái (1 câu mỗi loài, 3 bản)

Sáu câu đầu có trong 22.6. Tự quyết: tám câu sau (thiết kế chưa có), và chữ Việt cho phụ đề (22.6 chỉ có EN). Lưu: `voice/enemy-<id quái>/<id câu>-en.wav`, `-en-v2.wav`, `-en-v3.wav`; câu không lời lưu như tiếng gắng sức: `voice/enemy-<id quái>/<id câu>-v1.wav` … `-v3.wav`.

| Mã | id | Câu EN | VI |
|---|---|---|---|
| V179 | `td.vo.enemy-cuong-thi.bark` | Hop... hop... | Nhảy... nhảy... |
| V180 | `td.vo.enemy-oni.bark` | Smash! | Đập! |
| V181 | `td.vo.enemy-troll.bark` | Stone, shield! | Đá ơi, che! |
| V182 | `td.vo.enemy-alicanto.bark` | Mine! | Của ta! |
| V183 | `td.vo.enemy-tanuki.bark` | Belly drum! | Trống bụng! |
| V184 | `td.vo.enemy-ma-da.bark` | So cold... | Lạnh quá... |
| V185 | `td.vo.enemy-cuong-thi-lead.bark` | Hop! Hop! Faster! | Nhảy! Nhảy! Nhanh lên! |
| V186 | `td.vo.enemy-tat-phuong.bark` | Hop... boom! | Nhảy... bùm! |
| V187 | `td.vo.enemy-dokkaebi.bark` | Lights, come out! | Đèn ơi, ra đây! |
| V188 | `td.vo.enemy-kamaitachi.bark` | (cười khúc khích, không lời) | — |
| V189 | `td.vo.enemy-nuppeppo.bark` | (tiếng "blub-blub", không lời) | — |
| V190 | `td.vo.enemy-thuong-luong.bark` | (tiếng rít "Sssss...", không lời) | — |
| V191 | `td.vo.enemy-ma-troi.bark` | (thì thầm cười khẽ, không lời) | — |
| V192 | `td.vo.enemy-mam-go.bark` | (tiếng "eep!" nhỏ, không lời) | — |

Câu không lời: làm bằng công cụ tiếng ngắn, dán prompt dưới + đuôi chung (file chính 3.1). Mỗi câu 3 bản.

```text
V188 td.vo.enemy-kamaitachi.bark: A tiny mischievous weasel giggle, quick, airy and squeaky, 0.6 seconds.
V189 td.vo.enemy-nuppeppo.bark: A soft wet "blub-blub" gurgle of a silly dough blob creature, 0.5 seconds.
V190 td.vo.enemy-thuong-luong.bark: A long low serpent hiss "sssss", wet and cold but not scary, 0.8 seconds.
V191 td.vo.enemy-ma-troi.bark: A faint breathy whispering giggle of tiny ghost lights, airy and playful, 0.7 seconds.
V192 td.vo.enemy-mam-go.bark: A tiny squeaky "eep!" of a small sapling creature, 0.3 seconds.
```

### 2.10 Tiếng gắng sức VS (tự thu rồi đổi giọng, cách làm ở file chính 7.4)

| Mã | id | Tiếng | Bản |
|---|---|---|---|
| V-E4–V-E7 | `td.vo.linh-khien.hup`, `.death`; `td.vo.linh-giao-dai.hup`, `.death` | "Hup!", "Á!" cho Lính Khiên và Lính Giáo Dài | 4 mỗi id |
| V-E8 | `td.vo.lam.hurt` | Lam trúng đòn: "hự" ngắn | 4 |
| V-E9 | `td.vo.tre.hurt` | Tre trúng đòn: "ui" ngắn | 4 |
| V-E10 | `td.vo.crowd.healed` | Lính được hồi: "À" khoan khoái (Nhà Thuốc, 23.8) | 4 |
| V-E11 | `td.vo.crew.do` | Dân làng hô "Dô!" (Tối Thượng của Tre, 23.8) | 4 |

- Lính Giáo dùng luôn bộ P (`voice/linh-giao/td.vo.linh-giao.hup`, `.death`, file chính 7.4), không thu lại.

## 3. Tiếng ngắn VS

### 3.1 Quái: 14 bộ × 4 nhóm (22.6)

Tự quyết: 14 bộ = 12 loài của MVP + Cương Thi Đầu Đàn + Mầm Gỗ. Ma Trơi nhỏ dùng bộ Ma Trơi nâng 5 bán cung; Nuppeppō con dùng bộ Nuppeppō nâng 4 bán cung. Loài không có kỹ năng thì nhóm 4 là câu hô (2.9). "P" là đã có ở file chính; "—" là không có. Tự quyết: chất liệu của Cương Thi Đầu Đàn, Tất Phương, Dokkaebi, Mầm Gỗ (23.8 không ghi).

| Bộ | Đi | Đánh | Kỹ năng | Chết | Chất liệu |
|---|---|---|---|---|---|
| Cương Thi | P | P | câu hô | P | cloth |
| Cương Thi Đầu Đàn | A71 | A72 | A73 | A74 | cloth |
| Đàn Ma Trơi | P | — | — | P | spirit |
| Nuppeppō | P | P | A75 | P | dough |
| Thuồng Luồng | P | P | P | P | scale |
| Tanuki | P | P | P | P | flesh |
| Oni | A76 | A77 | A78 | A79 | flesh |
| Troll | P | P | A80, A81 | P | stone |
| Alicanto | P | — | P (trộm), A82 | P | metal |
| Tất Phương | A83 | — | A84 | A85 | flesh |
| Ma Da | A86 | A87 | A88, A89 | A90 | spirit |
| Dokkaebi | A91 | A92 | A93 | A94 | flesh |
| Chồn Liềm | A95 | A96 | A97 | A98 | wind (A100) |
| Mầm Gỗ | P | P | A99 | P | wood |

Ba bản mỗi id; muốn thì thêm bản thứ tư cho các nhóm P (22.6 cho 3–4 bản).

```text
A71 td.enemy.cuong-thi-lead.move · Đầu Đàn đi | 1.2 s | 3 | Heavier stiff hopping of a bigger robed creature leading a pack: thumping two-footed hops, paper charms flapping, a small bell jingling on each hop.
A72 td.enemy.cuong-thi-lead.attack · Đầu Đàn đánh | 0.4 s | 3 | A heavy stiff-armed shove: a cloth swish and a firm papery thump.
A73 td.enemy.cuong-thi-lead.skill · Đầu Đàn rung chuông giục bầy | 1.5 s | 3 | A pack leader ringing a small handbell twice to hurry its pack, a bright urgent jingle, quick hops gathering around.
A74 td.enemy.cuong-thi-lead.death · Đầu Đàn chết | 1.2 s | 3 | A large blank paper charm burning up from the bottom with crackles, crumbling to ash, ending with a deeper bell "tinng".
A75 td.enemy.nuppeppo.skill · Nuppeppō tách đôi | 0.8 s | 3 | A dough blob splitting in two: a stretchy rubbery pull and a wet "plop" as the halves separate.
A76 td.enemy.oni.move · Oni đi | 1.2 s | 3 | A big ogre stomping: heavy bare feet thudding, an iron-studded club tapping the ground.
A77 td.enemy.oni.attack · Oni đập nhà | 0.8 s | 3 | An ogre slamming an iron-studded club into a wooden building: a deep swing whoosh and a crunching wood-and-stone smash.
A78 td.enemy.oni.skill · Oni Nổi Giận | 1.5 s | 3 | An ogre flying into a rage: a deep huffing snort, stomping feet and the club pounding the ground three times.
A79 td.enemy.oni.death · Oni chết | 1.2 s | 3 | An ogre horn snapping off with a crack, then a heavy club falling with a ringing metallic "klang".
A80 td.enemy.troll.skill · Troll khiên vòm | 3 s loop | 1 | A dome shield of earth magic humming: a low earthy drone with a faint crystal-rock shimmer.
A81 td.enemy.troll.skill-break · Khiên vòm vỡ (Phá Khiên) | 0.8 s | 3 | A stone dome shield shattering into pebbles with a glassy crack.
A82 td.enemy.alicanto.sack · Bao vàng của Alicanto bục | 1 s | 3 | A small sack of stolen coins bursting open: a cloth rip and coins spilling out with bright jingles.
A83 td.enemy.tat-phuong.move · Tất Phương lò cò | 1 s | 3 | A one-legged fire bird hopping: quick single-foot hops "tok, tok", ruffled feathers, a crackle of embers.
A84 td.enemy.tat-phuong.skill · Tất Phương nổ | 1 s | 3 | A clay jar fuse hissing fast for half a second, then a punchy fire blast "fwoomp" with crackling embers.
A85 td.enemy.tat-phuong.death · Tất Phương chết | 1 s | 3 | A small fireball puff and a burst of feathers fluttering down.
A86 td.enemy.ma-da.move · Ma Da đi | 2 s loop | 1 | Invisible wet footsteps: slow drips and soft squelching steps with a faint watery shimmer.
A87 td.enemy.ma-da.attack · Ma Da Kéo Chân | 1 s | 3 | Something grabbing a leg and pulling it into water: a sudden splash, a gurgle and bubbles.
A88 td.enemy.ma-da.skill · Ma Da tàng hình | 1 s | 3 | A water wraith turning invisible: a glassy shimmer fading out with a soft watery hush.
A89 td.enemy.ma-da.skill-reveal · Ma Da lộ hình (Hiện Hình) | 0.8 s | 3 | A hidden water spirit revealed: a bright glassy pop and a splash ripple.
A90 td.enemy.ma-da.death · Ma Da chết | 1.2 s | 3 | A spirit dissolving into a puddle with a soft splash, then eight lotus petals floating up with a gentle airy chime.
A91 td.enemy.dokkaebi.move · Dokkaebi đi | 1.2 s | 3 | A sturdy goblin stomping cheerfully, a knobbly wooden club tapping the ground in rhythm.
A92 td.enemy.dokkaebi.attack · Dokkaebi đánh gậy | 0.6 s | 3 | A goblin bonking with a knobbly wooden club: a comic hollow "bonk" with a swing whoosh.
A93 td.enemy.dokkaebi.skill · Dokkaebi gọi Ma Trơi nhỏ | 1.5 s | 3 | A goblin knocking a magic club on the ground three times, then small wisp lights whooshing out with glassy twinkles.
A94 td.enemy.dokkaebi.death · Dokkaebi chết | 1.2 s | 3 | A wooden club rolling and clattering away, then a puff of green smoke "poof".
A95 td.enemy.kamaitachi.move · Chồn Liềm lốc chạy | 2 s loop | 1 | A small whirlwind racing low over the ground: a swirling gust with dry leaves.
A96 td.enemy.kamaitachi.attack · Chồn Liềm chém | 0.3 s | 3 | A sickle-clawed weasel slashing: a sharp airy "shhing" swipe.
A97 td.enemy.kamaitachi.skill · Chồn Liềm né | 0.4 s | 3 | A quick dodge in the wind: a fast airy whoosh zipping aside.
A98 td.enemy.kamaitachi.death · Chồn Liềm chết | 1.2 s | 3 | A whirlwind collapsing, then three small weasels tumbling away with tiny squeaks and scampering paws.
A99 td.enemy.mam-go.skill · Mầm Gỗ mọc lên | 0.8 s | 3 | A sapling sprouting out of the soil: a soft earthy push and a leafy pop.
A100 td.mat.wind · Chất liệu gió | 0.25 s | 3 | An airy, sharp "shhk" as a hit cuts through a small whirlwind, swishing air, soft onset.
```

### 3.2 Vũ khí và va chạm

Tháp cấp cao (23.8): L2 thêm lớp trầm, L3 đuôi dài hơn. Tháp Thư Pháp, 18 nhánh (id theo tên Việt viết ASCII, Tự quyết), Tướng, phép, bùa.

```text
A101 td.archer.fire.l2 · Tháp Cung L2, lớp trầm | 0.3 s | 3 | Low layer only: a deeper wooden bow thump under an arrow shot, soft onset.
A102 td.archer.fire.l3 · Tháp Cung L3, đuôi dài | 0.6 s | 3 | Tail only: a longer bow-string ring and an arrow whistle trailing away.
A103 td.cannon.fire.l2 · Tháp Pháo L2, lớp trầm | 0.5 s | 3 | Low layer only: a heavy sub-bass cannon thump, soft onset.
A104 td.cannon.fire.l3 · Tháp Pháo L3, đuôi dài | 1 s | 3 | Tail only: a long rolling smoke hiss and a distant boom tail.
A105 td.scribe.fire · Tháp Thư Pháp bắn | 0.4 s | 3 | A big calligraphy brush swung through the air: a soft silky "swish" with a crisp rustle of paper.
A106 td.scribe.hit · Nét mực trúng (lưu sfx/td.scribe.hit.<lớp>-v<n>.wav) | 3 lớp × 3 | transient: a wet ink-splat tip, about 20 ms / body (ground): ink splashing onto earth, a soft wet patter, 0.2 s / tail: tiny paper letters scattering with a light flutter, 0.5 s.
A107 td.scribe.wordshot · Nét Chữ (Phát Chữ Thư Pháp) | 0.6 s | 3 | A long sweeping brush stroke of light flying straight: an extended silky "swiiish" with a bright paper shimmer.
A108 td.scribe.fire.l2 · Thư Pháp L2, lớp trầm | 0.4 s | 3 | Low layer only: a soft deep whoosh of a heavy brush, soft onset.
A109 td.scribe.fire.l3 · Thư Pháp L3, đuôi dài | 0.8 s | 3 | Tail only: a long paper rustle and fading ink shimmer.
A110 td.overdrive.scribe · Bùng Nổ Thư Pháp: Đại Tự | 2 s | 2 | A giant letter painted onto the ground: one huge slow brush stroke, ink splashing, a soft low gong-like shimmer.
A111 td.branch.en-bao.fire · Én Bão bắn | 0.35 s | 3 | Two light bamboo bows releasing almost together: a quick double "thwip-thwip" with twin arrow whooshes.
A112 td.branch.than-tien.fire · Thần Tiễn bắn | 0.6 s | 3 | A huge tower crossbow firing a heavy bolt: a deep wooden thunk, a taut cable twang and a piercing whistle.
A113 td.branch.coi-lon.fire · Cối Lớn bắn | 0.8 s | 3 | A big mortar firing straight up: a deep hollow "thoom" with a long rising whoosh.
A114 td.branch.vac-lua.fire · Vạc Lửa hắt dầu | 0.8 s | 3 | A fire cauldron on a tripod flinging burning oil: a sloshing whoosh and a crackling flame burst.
A115 td.branch.vac-lua.pool · Vũng lửa Vạc Lửa | 3 s loop | 1 | A small pool of fire burning on the ground: a steady soft crackle and hiss.
A116 td.branch.but-loi.fire · Bút Lôi | 0.7 s | 3 | A brush of lightning: a bright electric crackle jumping between targets in quick zaps.
A117 td.branch.muc-bang.fire · Mực Băng bắn | 0.6 s | 3 | An icy ink stroke: a cold glassy swish and a crackle of frost forming.
A118 td.branch.muc-bang.freeze · Mực Băng đóng băng | 0.8 s | 3 | An enemy freezing solid: crunchy ice growing fast with a glassy creak.
A119 td.branch.khien-dong.bash · Khiên Đồng đập khiên | 0.4 s | 3 | A bronze shield bash "doang": a ringing metallic clang with a soft thud.
A120 td.branch.khien-dong.wall · Tường Đồng | 3 s loop | 1 | A dome of faint bronze light humming: a steady warm metallic resonance.
A121 td.branch.giao-dai.thrust · Giáo Dài đâm xuyên | 0.4 s | 3 | A long spear thrust piercing two targets: a long whoosh and a double "thup-thup".
A122 td.branch.ham-sau.work · Hầm Sâu làm việc | 0.8 s | 3 | Deep mine work: a hollow pickaxe strike far down a shaft and a heavy cart rumble.
A123 td.branch.lo-duc-tien.work · Lò Đúc Tiền dập tiền | 0.8 s | 3 | A coin press stamping: a heavy metal "chunk", a hiss of steam and coins clinking into a tray.
A124 td.branch.bac-thang.work · Bậc Thang nước chảy | 1.5 s | 2 | Water flowing down rice terraces: gentle trickling streams filling one paddy after another.
A125 td.branch.chuong-trau.charge · Chuồng Trâu: trâu húc | 1.5 s | 3 | A water buffalo charging down a dirt road: heavy hooves pounding, a snort, a deep "mooo" at the start.
A126 td.branch.xuong-cua.work · Xưởng Cưa | 2 s loop | 1 | A water-wheel saw cutting wood: a steady creaking wheel, rhythmic saw strokes, falling wood chips.
A127 td.branch.xuong-rao.build · Xưởng Rào dựng rào | 1 s | 3 | A wooden fence springing up on a road: stakes hammered quickly and planks snapping into place.
A128 td.branch.phong-an.cast · Phong Ấn xích chữ | 1 s | 3 | Chains of glowing letters binding a boss: rattling magical chains and a firm stone-seal thump.
A129 td.branch.vang-am.chime · Vang Âm chuông gió | 1.5 s | 3 | Hollow bamboo wind chimes clacking softly in a breeze, airy and clear.
A130 td.branch.vuon-thao-duoc.cleanse · Vườn Thảo Dược gỡ trạng thái | 1 s | 3 | Herbs swirling: a leafy whoosh, a fresh sparkle and a soft rinse of water.
A131 td.branch.tram-cuu-thuong.revive · Trạm Cứu Thương hồi sinh lính | 1 s | 3 | A bamboo stretcher clattering down and a quick puff of healing light, someone hopping back up.
A132 td.hero.lam.skill-2 · Lam: vệt lửa lam | 2 s loop | 1 | A trail of blue fire burning along a road: a soft rushing flame crackle.
A133 td.hero.lam.attack · Lam đánh | 0.3 s | 3 | Two quick claw slashes "shhk-shhk" with small flame sparks crackling.
A134 td.hero.lam.skill-1 · Lam: Vuốt Lam Liên Hoàn | 0.8 s | 3 | Three fast fanned claw arcs "shhk-shhk-shhk", a flame whoosh on each.
A135 td.hero.lam.dash · Lam lướt | 0.4 s | 3 | A fast dash: a sharp air whoosh with a flick of flame.
A136 td.hero.lam.ult · Lam Tối Thượng: Hỏa Tốc | 2 s | 2 | Winding up, then a comet-like dash: a rising wind howl, a streaking fire roar and a flame burst on landing.
A137 td.hero.lam.death · Lam gục | 1 s | 2 | A small flame shrinking to a tiny ember with a soft hiss.
A138 td.hero.lam.respawn · Lam hồi sinh | 0.8 s | 2 | A flame flaring back to life with a bright "whoomp".
A139 td.hero.tre.attack · Tre bắn ná | 0.3 s | 3 | A rubber slingshot release "fwip" and a pebble flying off.
A140 td.hero.tre.skill-1 · Tre: Rào Tre | 1 s | 3 | A bundle of bamboo thrown down and a fence springing up with a bouncy wooden rattle.
A141 td.hero.tre.respawn · Tre hồi sinh (chạy ra) | 0.6 s | 2 | Quick light running footsteps out of a wooden gate.
A142 td.hero.tre.shards · Tre gõ gỗ (hút nhiều Mảnh Chữ) | 0.6 s | 2 | Three quick happy knocks on a wooden beam.
A143 td.hero.tre.skill-2 · Tre: Chuồn Chuồn Tre | 1.5 s | 2 | A bamboo dragonfly toy whirring into flight: a light spinning buzz.
A144 td.hero.tre.ult · Tre Tối Thượng: Giàn Giáo Thần Tốc | 2 s | 2 | Many bamboo scaffold poles clattering into place around a house: layered wooden clacks and hammer taps.
A145 td.hero.tre.bridge · Tre bắc Cầu Tre | 1.5 s | 2 | A bamboo bridge laid across a stream: poles dropping, ropes tightening, quick lashing knocks.
A146 td.hero.tre.death · Tre gục | 0.8 s | 2 | Someone plopping down to sit with a dizzy cartoon twinkle.
A147 td.hero.draconis.ult-feather · Draconis: lông lửa rơi | 0.8 s | 3 | A flaming feather falling from high: a fiery whoosh descending, then a soft ember burst on the ground.
A148 td.hero.draconis.ult-word · Draconis: trống mỗi Chữ Chiêu | 0.6 s | 4 | One big festival drum hit; make v1 soft, v2 medium, v3 strong, v4 strongest (one per extra ult word, 23.8).
A149 td.hero.draconis.takeoff · Draconis cất cánh | 0.8 s | 3 | Huge feathered wings beating hard to take off: two deep whooshing wingbeats and a gust.
A150 td.hero.draconis.land · Draconis đậu mái | 0.6 s | 3 | A large winged creature landing on a tiled roof: a wing flutter and a firm claw grip on tiles.
A151 td.hero.draconis.death · Draconis gục | 1.5 s | 2 | A fiery creature collapsing into ash and feathers: a soft crumble, embers crackling down, a fading low rumble.
A152 td.hero.draconis.respawn · Draconis hồi sinh | 1.5 s | 2 | A phoenix rising from flames: a deep fire bloom whoosh and a bright crackling burst.
A153 td.power.meteor · Mưa Đá Lửa | 1.2 s | 3 | A flaming rock falling at an angle: a rising fiery whistle, a heavy impact and crackling flames.
A154 td.power.reinforce · Viện Binh | 1 s | 2 | Two soldiers dropping in on a road: a thud of boots, a puff of dust and a short horn call.
A155 td.charm-mend.use · Bùa Sửa | 1 s | 2 | Quick magical repair: hammer taps and a warm sparkle as wood knits together.
A156 td.charm-frost.use · Bùa Băng | 0.8 s | 2 | A burst of frost: a crisp icy crackle spreading outward.
A157 td.charm-gale.use · Bùa Gió | 1 s | 2 | A friendly gust of wind sweeping past, light and fast.
A158 td.charm.pickup · Nhặt bùa | 0.5 s | 3 | A paper charm fluttering into a pocket with a soft sparkle.
```

- A148: engine phát v1 → v4 theo thứ tự, không ngẫu nhiên. Tự quyết.
- Draconis vẫn dùng bộ CC0 có sẵn cho cầu lửa, hơi thở, gầm (file chính, mục 4).
- Trúng của ná Tre, vuốt Lam, giáo, khiên: lớp thân lấy theo chất liệu (`td.mat.*`), như luật ở file chính 3.3.
- Chuông đôi của Nét Chữ (23.8) làm bằng mã, như chuông nhỏ của Tên Chữ ở bậc P.

### 3.3 Nhà

```text
A159 td.building.hit.wood · Nhà gỗ bị đánh | 0.4 s | 3 | A blow on a wooden building: a cracking thud and splinters.
A160 td.building.hit.stone · Nhà đá bị đánh | 0.4 s | 3 | A blow on a stone wall: a heavy knock and crumbling grit.
A161 td.building.damaged · Nhà hư, khói | 4 s loop | 1 | A damaged hut smoldering: a soft crackle and a creaking beam.
A162 td.building.ruin · Nhà Đổ Nát | 1.5 s | 3 | A small building collapsing: wood and roof tiles crashing down and a big whoosh of dust.
A163 td.building.repair · Sửa bằng gõ | 0.6 s | 3 | A repair word: a sparkly hammer strike and a new plank nailed in.
A164 td.building.branch · Chọn nhánh | 1 s | 2 | A building changing form in a puff of smoke: a whoosh, a rattle and a bright pop.
A165 td.building.relocate · Dời nhà | 1 s | 2 | A building lifted and set down: a creak, a swish and a firm thump.
A166 td.keep.upgrade · Nâng Lũy | 3 s | 1 | A fortress growing taller: stones stacking, beams hammered, a big gate creaking, a solid final thud.
A167 td.infirmary.idle · Nhà Thuốc tự chạy | 4 s loop | 1 | A small clay pot of herbal medicine bubbling at a soft simmer.
A168 td.infirmary.word · Nhà Thuốc mỗi từ | 0.6 s | 3 | A pouch of herbs tossed: a soft leafy whoosh and a cool minty sparkle.
A169 td.lumber.idle · Trại Gỗ tự chạy | 2 s loop | 1 | Two people pulling a long saw through a log: a rhythmic push-pull rasp, sawdust falling.
A170 td.lumber.word · Trại Gỗ mỗi từ | 0.5 s | 3 | An axe chop "kok" and a split log knocking "kok".
A171 td.seal-dais.idle · Đài Ấn tự chạy | 4 s loop | 1 | Gentle wooden wind chimes and a faint humming glow.
A172 td.seal-dais.wave · Sóng Chữ | 1.5 s | 3 | A ring of glowing letters rippling outward over the ground: a soft magical whoosh with chime tinkles.
A173 td.seal-dais.word · Đài Ấn mỗi cụm | 0.6 s | 3 | A streak of starlight flying away: a soft sparkle whoosh.
A174 td.overdrive.farm · Bùng Nổ Ruộng: Gặt Vàng | 2 s | 2 | A golden wave through rice fields, egrets taking off with flapping wings, and a water buffalo's deep "mooo".
A175 td.overdrive.lumber · Bùng Nổ Trại Gỗ: Gỗ Lăn | 2 s | 2 | Logs rolling down a road: heavy wooden rumbling and knocking.
A176 td.overdrive.seal-dais · Bùng Nổ Đài Ấn: Ấn Trấn | 1.5 s | 2 | A pillar of light made of letters rising, then a stunning shockwave: a deep magic boom and a crystal ring.
A177 td.overdrive.infirmary · Bùng Nổ Nhà Thuốc: Thang Thuốc Nóng | 1.5 s | 2 | A ring of hot healing steam bursting outward: a soft whoosh and a warm bubbling sigh.
A178 td.overdrive.end · Hết Bùng Nổ | 0.5 s | 2 | A column of light pulling back into a roof: a soft reverse whoosh and a small clock tick.
```

- Hợp âm thủy tinh ở Đài Ấn, hợp âm chọn nhánh, hợp âm Hợp Tấu: làm bằng mã (đúng giọng nhạc).

### 3.4 Sự kiện

```text
A179 td.rare.gold.done · Từ Vàng xong | 1 s | 2 | A golden word cashed in: a sparkling jackpot burst with coins showering. (add SOFTPITCH)
A180 td.rare.star.spawn · Từ Sao hiện | 1 s | 2 | A purple star lantern appearing: soft cosmic twinkles and a gentle shimmer. (add SOFTPITCH)
A181 td.rare.star.done · Từ Sao xong | 0.8 s | 2 | Starlight flying to a hero: a bright twinkling whoosh.
A182 td.rare.leaf.spawn · Từ Lá hiện | 1 s | 2 | A green leaf lantern appearing: leaves rustling in a soft breeze with a fresh sparkle.
A183 td.rare.leaf.done · Từ Lá xong | 0.8 s | 2 | A wave of healing leaves: a fresh leafy whoosh and a warm minty shimmer.
A184 td.spell.word · Ấn Phụ hiện | 0.5 s | 2 | A paper charm fluttering open at the spot where a spell landed.
A185 td.rush.warn · Báo Cơn Gấp | 4 s | 1 | A building calling for help: a quick wooden clapper rhythm speeding up for four seconds.
A186 td.rush.start · Cơn Gấp bắt đầu | 1 s | 2 | A rush begins: a bright rising whoosh and one festive drum hit.
A187 td.rush.success · Gấp Đạt | 1.2 s | 2 | A rush achieved: a cheerful burst of drums and coins.
A188 td.piggy.run · Heo Đất chạy | 2 s loop | 1 | A small clay piggy bank trotting fast: tiny hooves clip-clopping and coins jingling inside.
A189 td.piggy.oink · Heo Đất kêu | 0.5 s | 3 | A cute squeaky happy piggy oink.
A190 td.piggy.break · Heo Đất vỡ | 1 s | 2 | A clay piggy bank breaking: a ceramic crack and a gush of coins.
A191 td.seal.open · Mở cửa sổ ấn | 1.5 s | 2 | A seal window opening: a deep stone rumble and a rising glow.
A192 td.seal.success · Ấn đúng | 1.2 s | 2 | A seal stamped successfully: a heavy stone stamp "thunk" and a bright magic chime burst.
A193 td.seal.fail · Ấn sai | 1 s | 2 | A seal failing: a dull cracking stamp and a fizzling sigh of magic.
A194 td.direct.success · Gõ trực tiếp xong | 0.6 s | 3 | A red-edged paper scroll stamped and folded shut: a crisp paper snap and a firm stamp.
A195 td.direct.anchor · Neo | 0.8 s | 2 | A glowing chain of letters anchoring a creature in place: a heavy chain clank and a stone thump.
A196 td.direct.interrupt · Ngắt | 0.6 s | 2 | A drumming creature cut off: a muffled thump on a drum skin and a comic deflating puff.
A197 td.direct.seal-club · Phong Gậy | 0.8 s | 2 | A paper charm wrapping a wooden club: a fast paper swirl and a dull wooden clunk.
A198 td.chest.small · Rương nhỏ | 1.5 s | 2 | A small treasure chest popping open with coins and a sparkle.
A199 td.warn.keep-weak · Lũy yếu | 1.2 s | 2 | An old fortress in danger: a low horn note twice and a creaking gate.
A200 td.warn.boss-attack · Boss báo đòn (chung) | 1 s | 2 | A big danger is coming: a deep rising whoosh and a low drum hit.
A201 td.ui.slot-unlock · Lễ mở ô | 1.5 s | 1 | A fortress gate swinging open and a puff of chalk dust, small footsteps running out.
```

### 3.5 Người và thú

```text
A202 td.helper.step · Thư Đồng đi | 0.8 s | 3 | A tiny owlet waddling: soft little footsteps "pat-pat" with a fluffy rustle.
A203 td.helper.arrive · Thư Đồng tới nhà | 0.4 s | 3 | A puff of chalk dust "poof" on a small slate.
A204 td.helper.chirp · Thư Đồng reo "chíp!" | 0.3 s | 4 | A tiny owlet chirp "cheep!", bright and happy.
A205 td.helper.scared · Thư Đồng hoảng | 0.8 s | 3 | A startled owlet: frantic little wing flaps, a few loose feathers, a tiny squeak.
A206 td.helper.catch · Thư Đồng bắt túi | 0.4 s | 3 | Small wings catching a soft bag: a fluffy flap and a soft thump.
A207 td.helper.chalk · Thư Đồng viết bảng đá | 0.3 s | 3 | Chalk scratching quickly on a small slate.
A208 td.soldier.spawn · Lính ra cổng | 0.8 s | 3 | Small soldiers running out of a wooden gate: quick footsteps and a puff of dust.
A209 td.soldier.shield · Lính Khiên đỡ | 0.3 s | 3 | A small shield blocking a blow: a short metallic "doang".
A210 td.crowd.walla · Tiếng ồn trận | 6 s loop | 1 | A small cartoon skirmish in the distance: many tiny clashes and scuffles with muffled wordless shouts.
A211 td.animal.buffalo · Trâu kêu | 1 s | 3 | A water buffalo's deep, calm "mooo".
A212 td.animal.egrets · Đàn cò bay | 1.5 s | 2 | A flock of egrets taking off: many soft wing flaps and light calls.
```

- A210 bật khi có ít nhất 4 trận giáp lá cà trên màn hình (24.4).

### 3.6 Boss

Mộc Tinh đầy đủ (bản đồ 3, thêm vào bộ P) và Đại Bàng Tinh. Tự quyết: trúng Đại Bàng Tinh dùng `td.mat.flesh` (lông), 23.8 không ghi.

```text
A213 td.boss.moc-tinh.move · Mộc Tinh đi | 1.5 s | 3 | A giant tree creature stepping slowly: a deep creaking trunk and roots thudding into soil.
A214 td.boss.moc-tinh.seed · Mộc Tinh rải hạt | 0.8 s | 3 | A big seed falling from a canopy: a rustling drop and a heavy wooden "thok".
A215 td.boss.moc-tinh.wall · Tường Rễ mọc | 2 s | 2 | A wall of roots rising across a road: roaring soil, twisting wood creaks, a solid final thud.
A216 td.boss.moc-tinh.wall-end · Tường Rễ tan | 1.5 s | 2 | A root wall crumbling into soil and splinters.
A217 td.boss.moc-tinh.sleep · Ngủ Rễ | 4 s loop | 1 | A giant tree breathing in sleep: a slow creaking inhale and exhale with rustling leaves.
A218 td.boss.moc-tinh.stun · Mộc Tinh choáng | 1.5 s | 2 | A giant tree staggering: a confused groan of wood and leaves falling.
A219 td.boss.moc-tinh.chase · Rễ đuổi Tướng | 2 s loop | 1 | A single root burrowing fast under the ground: a crunching, ripping trail of soil.
A220 td.boss.moc-tinh.finale · Mộc Tinh hóa lại thành cây | 3 s | 1 | A tree spirit remembering its name: a soft magical exhale, leaves settling, wood relaxing into a calm tree.
A221 td.boss.dai-bang-tinh.wings · Đại Bàng vỗ cánh | 2 s loop | 1 | Huge eagle wings beating slowly overhead: deep whooshing gusts.
A222 td.boss.dai-bang-tinh.screech · Đại Bàng rít | 1.5 s | 3 | A giant storm eagle screech: a piercing, raspy cry, powerful but cartoon-friendly.
A223 td.boss.dai-bang-tinh.swoop-warn · Báo Sà Cắp | 1.5 s | 2 | A giant bird diving: a descending whistle of wind growing louder.
A224 td.boss.dai-bang-tinh.grab · Đại Bàng nhấc nhà | 1.2 s | 2 | Talons gripping a wooden building and lifting it: creaking timber and a heavy gust.
A225 td.boss.dai-bang-tinh.drop · Nhà rơi xuống | 1 s | 3 | A building dropped from the air: a heavy crashing thud with rattling roof tiles.
A226 td.boss.dai-bang-tinh.gust · Bão Cánh | 1.5 s | 2 | A storm blast from huge wings: a roaring gust sweeping across.
A227 td.boss.dai-bang-tinh.quill · Mũi lông | 0.6 s | 3 | Three sharp quills thunking into wood one after another.
A228 td.boss.dai-bang-tinh.steal · Đại Bàng cướp vàng | 1 s | 2 | A giant eagle snatching gold: a swooping whoosh and a jangling sack of coins.
A229 td.boss.dai-bang-tinh.fall · Đại Bàng rơi xuống | 1.5 s | 2 | A stunned giant eagle crashing onto a road: a heavy feathered thud and scattering feathers.
A230 td.boss.dai-bang-tinh.death · Đại Bàng gục | 2.5 s | 1 | A giant eagle fading away: light feathers drifting down in a soft calming wind.
A231 td.boss.dai-bang-tinh.phase · Đại Bàng đổi pha | 2 s | 2 | A storm gathering around a giant eagle: rising wind, distant thunder rumble, wings flaring.
```

### 3.7 Mặc định manifest VS

Như file chính mục 6: `gainJitterDb 1.5`, `noRepeat true`, `beatQuantizeMs 0`, `license` từ sổ nguồn. Tiếng lặp: `maxInstances 1` mỗi nhà hoặc mỗi vật. Tiếng ngắn mono, trừ khi dòng ghi stereo.

| Nhóm | bus | Ưu tiên | Trần, chờ | reverbSend | spatial |
|---|---|---|---|---|---|
| Quái đi | `crowd` | P5 | 2 tiếng quái chung; chờ 3000 ms mỗi loài | 0.25 | true |
| Quái đánh, kỹ năng | `crowd` | P4 | 2 chung; tiếng gầm 400 ms chung | 0.25 | true |
| Quái chết | `crowd` | P4 | 2; `minGapMs 40` | 0.25 | true |
| Câu hô quái | `crowd` | P5 | 1 lần mỗi 4 s mỗi loài; tắt khi boss báo đòn | 0.20–0.30 | true |
| Vũ khí, va chạm, tiếng Tướng | `world` | P4 | `maxInstances 4`, `minGapMs 25`; nổ `minGapMs 30` (24.3) | 0.10–0.20 | true |
| Cú đáp mỗi từ (A107, A168, A170, A173) | `world` | P3 | 2 | 0.12 | true |
| Bùng Nổ, sự kiện thưởng | `world` hoặc `rewards` | P3 | 1 | 0.20 | true |
| Cảnh báo (A162 Đổ Nát, A185, A191, A199, A200, A223) | `warnings` | P1 (24.3) | 1 | 0.05 | true |
| Thư Đồng | `crowd` | P5 (A205 là P3) | 2 s chung; nhỏ hơn Tướng 3 dB | 0.25 | true |
| Lính | `crowd` | P4–P5 | hô 6–10 s mỗi trại, 1,2 s chung | 0.20–0.30 | true |
| Âm nền | `ambience` | — | 1 lớp nền + 2 tiếng chi tiết cùng lúc | 0 | false |
| Nhạc | `music` | — | — | 0 | false |

## 4. Âm nền: 3 bản đồ × 2 lớp (22.9, 24.9)

Tự quyết: lớp 1 là **nền lặp** (stereo, 90 s, lặp kín). Lớp 2 là **bộ tiếng chi tiết** (mono, 6 bản, 2–6 s mỗi bản). Engine rải lớp 2 ngẫu nhiên 4–12 s một lần, pan ngẫu nhiên. Độ to −26 LUFS.

Lưu: `ambience/td.amb.<bản đồ>.bed.wav`; `ambience/td.amb.<bản đồ>.detail-v1.wav` … `-v6`. Lớp nền thêm dòng LOOP. Không dán đuôi chung tiếng ngắn (âm nền cần không gian); thay bằng: `No music, no speech, natural and calm.`

- Công cụ không cho tạo dài 90 s thì tạo 3–4 đoạn cùng prompt, mỗi đoạn dài nhất công cụ cho. Lưu `td.amb.<bản đồ>.bed-part1.wav`, `-part2`… AI tích hợp nối thành một vòng 90 s.

```text
N01 td.amb.w1-silverfall.bed · Nền Đồng Cỏ Thác Bạc | 90 s stereo loop | Highland meadow at 7:30 in the morning after rain: a distant silver waterfall rumbling softly, gentle wind over short grass and reeds, very calm and wide, no birds.
N02 td.amb.w1-silverfall.detail · Chi tiết Đồng Cỏ Thác Bạc | 2-6 s mono × 6 | One natural sound per file: a cheerful morning songbird call; a far egret call; water drops falling from leaves; a bee buzzing past; a soft gust through bamboo; a distant buffalo neck bell.
N03 td.amb.w1-whitestone.bed · Nền Vịnh Đá Trắng | 90 s stereo loop | White limestone shore at golden hour: gentle waves washing over rocks, a warm sea wind, wide and calm, no gulls.
N04 td.amb.w1-whitestone.detail · Chi tiết Vịnh Đá Trắng | 2-6 s mono × 6 | One natural sound per file: seagull calls; hollow bamboo wind chimes; a wooden boat creaking against a pier; a small wave splashing on rocks; a fishing net rustling; a far gull flock.
N05 td.amb.w1-rootwood.bed · Nền Rừng Rễ Cổ | 90 s stereo loop | Humid rainforest at mid-morning: a dense soft insect hum, a flowing river nearby, slow drips from leaves, wide and calm.
N06 td.amb.w1-rootwood.detail · Chi tiết Rừng Rễ Cổ | 2-6 s mono × 6 | One natural sound per file: an exotic forest bird call; a distant wood creak; a frog croak; leaves rustling as a small animal passes; a branch dropping; a far hornbill-like call.
```

## 5. Nhạc VS (24.8)

Cách làm, prompt mẫu, lấy stem, kiểm tra: như file chính mục 8. Mỗi bản có ba lớp `calm`, `combat`, `drums` (bản boss có hai lớp). Lưu như file chính: `music/<id>.full.wav`, `.calm.wav`, `.combat.wav`, `.drums.wav`.

Tự quyết: mọi bản Thế giới 1 dùng cùng bộ nốt của Đô trưởng (Đô trưởng, La thứ, Rê Dorian, Mi Phrygian). Nhờ vậy thang nốt chữ và câu nhạc bậc P hợp mọi bản. BPM chọn để một ô là số nguyên mẫu ở 48 kHz.

| Mã | id | Dành cho | Giọng · nhịp | Dài | Không khí, nhạc cụ |
|---|---|---|---|---|---|
| M13 | `td.music.w1-whitestone` | Bản đồ 2 | La thứ · 96 BPM | 64 ô = 160 s | Biển 18:00 giờ vàng, gió biển; trống nhỏ, sáo, đàn tranh, dây ấm |
| M14 | `td.music.w1-rootwood` | Bản đồ 3 | Rê Dorian · 90 BPM | 64 ô ≈ 170,7 s | Rừng mưa ẩm, tò mò, đất; nhạc cụ tre, đàn t'rưng, trống, sáo |
| M15 | `td.music.w1-teahill` (tùy chọn) | Bản đồ phụ "Đồi Chè" | Đô trưởng · 120 BPM | 64 ô = 128 s | Vui, nhiều Cơn Gấp; sáo, đàn nguyệt, trống hội |
| M16 | `td.music.w1-boss` | Mộc Tinh (bản đồ 3), Đại Bàng Tinh | Mi Phrygian · 120 BPM | 48 ô = 96 s | Căng, mạnh; dây trầm, trống hội lớn, sáo gấp, đàn tranh vê. Hai lớp: `base` và `drums` (pha cuối). Mở bằng M04 |

```text
M13 Instrumental loop for a storybook fantasy tower-defense map: Whitestone Bay, a white limestone coast at 6 pm golden hour, warm sea wind, a village of otter folk on stilts. Warm, nostalgic, gently adventurous. Key A minor (natural minor, the same notes as C major, melodies on A C D E G). Exactly 96 BPM, 4/4, steady. Exactly 64 bars (2:40), starting in full groove with no intro and leading straight back to bar 1 with no ending. Three separate groups: 1) bamboo flute, dan tranh zither, warm strings; 2) plucked bass, light hand drums, shaker; 3) deep festival barrel drums. No vocals, no synths, no sound effects.
M14 Instrumental loop for a storybook fantasy tower-defense map: Old Rootwood, a humid rainforest at 10:30 in the morning with sunbeams through the canopy and giant roots across the paths. Curious, earthy, mysterious but friendly. Key D dorian (the same notes as C major). Exactly 90 BPM, 4/4, steady. Exactly 64 bars, starting in full groove with no intro and leading straight back to bar 1 with no ending. Three separate groups: 1) bamboo flute, bamboo xylophone, dan tranh zither; 2) plucked bass, bamboo tube percussion, shaker; 3) deep frame drums and barrel drums. No vocals, no synths, no sound effects.
M15 Instrumental loop for a bonus tower-defense map on bright tea hills: playful, busy, festive. Key C major, pentatonic melodies. Exactly 120 BPM, 4/4. Exactly 64 bars, seamless loop with no intro and no ending. Three separate groups: 1) bamboo flute, moon lute, dan tranh; 2) plucked bass, hand drums, wooden clapper; 3) festival drums. No vocals, no synths, no sound effects.
M16 Instrumental boss battle loop for a storybook fantasy tower-defense game: a giant ancient tree spirit or a storm eagle attacking a village. Tense, powerful, heroic, never horror. Key E phrygian (the same notes as C major). Exactly 120 BPM, 4/4. Exactly 48 bars (1:36), seamless loop with no intro and no ending. Two separate groups: 1) low strings ostinato, urgent bamboo flute, tremolo dan tranh, plucked bass; 2) huge festival barrel drums and frame drums with rolls. No vocals, no synths, no sound effects.
```

Câu nhạc ngắn VS (dùng đuôi chung câu nhạc của file chính 8.7, đổi "in C major" thành giọng của bản):

```text
M17 td.stinger.w1-whitestone.wave-start · Đầu đợt, Vịnh Đá Trắng | 3 s | A rousing call in A minor: a festival drum roll into a rising bamboo flute call and a zither strum, ending on a held E chord.
M18 td.stinger.w1-whitestone.wave-clear · Hết đợt, Vịnh Đá Trắng | 3 s | A warm relieved cue in A minor: zither run and flute phrase landing on an A minor chord that brightens to C.
M19 td.stinger.w1-rootwood.wave-start · Đầu đợt, Rừng Rễ Cổ | 3 s | A curious call in D dorian: bamboo xylophone roll into a rising flute call, ending suspended on A.
M20 td.stinger.w1-rootwood.wave-clear · Hết đợt, Rừng Rễ Cổ | 3 s | A gentle relieved cue in D dorian: bamboo xylophone and flute landing softly on D.
```

- Bản boss nối với bản đồ: kiểm bằng `pnpm music:handovers --pair=<bản đồ>,td.music.w1-boss` (file chính 8.6).
- Bản Neon và nhạc Thư Thành: ở Sau (file chính mục 9).

## 6. Chỗ thiết kế chưa nói ở VS (đã tự quyết ở trên)

- 27.2 ghi "14 loài", 22.6 có 12 loài + quái gọi. Đã chọn 14 bộ ở 3.1.
- 27.2 ghi "lính 3 loại × 5–7", 23.8 chỉ có 5 câu tiếng Anh, không có chữ Việt. Đã chia ở 2.7.
- Câu hô quái chỉ có 6 ví dụ. Đã thêm 8 câu ở 2.9.
- Câu tổ thợ hai người, câu boss không ghi lúc phát. Đã gán ở 2.5 và 2.8.
- Tre có hai câu không có chữ tiếng Anh. Bản EN dùng tiếng ngắn A141, A142.
- Giới của Lam không ghi. Đã chọn giọng nữ trẻ, đổi được.
- Nhánh chưa có id trong mã. Đã dùng tên Việt viết ASCII (`td.branch.en-bao.*`…).
- Giọng, nhịp của nhạc bản đồ 2, 3 và bản boss chưa có. Đã đặt ở mục 5.
