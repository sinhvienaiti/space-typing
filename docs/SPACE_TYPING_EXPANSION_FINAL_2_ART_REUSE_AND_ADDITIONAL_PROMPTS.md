# SPACE TYPING — FINAL 2: GIỮ ẢNH NÀO, TẠO THÊM ẢNH NÀO?

Ngày: 2026-09-30. Tài liệu bàn giao cho chủ dự án, AI tạo ảnh và AI tích hợp game.

Nguồn đối chiếu:

- [Thiết kế FINAL 2](SPACE_TYPING_1000_STAGE_EXPANSION_V2_FINAL_2.md), đặc biệt §11, §20 và roadmap §22.
- [Image Prompt Pack V2 gốc](SPACE_TYPING_1000_STAGE_EXPANSION_V2_IMAGE_PROMPT_PACK.md).
- [Review V2](EXPANSION_V2_DESIGN_REVIEW_2026-09-30.md).
- `src/relics/registry.ts`, `src/ui/painted-icons.ts` và tên file trong các thư mục art hiện có.

**Phạm vi:** lập kế hoạch tái sử dụng, mapping và prompt bổ sung. Không tạo ảnh, không sửa code, không đổi tên/di chuyển/xóa bất kỳ ảnh nào trong lần soạn tài liệu này.

## 1. Kết luận cần đọc trước

**Giữ toàn bộ 36 ảnh A/B/C/F/G/H đã tạo. Không có ảnh nào trong 36 ảnh bị yêu cầu xóa hoặc vẽ lại chỉ vì chuyển từ V2 sang FINAL 2.**

FINAL 2 chủ yếu đổi thứ tự triển khai, thu nhỏ prototype và chốt luật gameplay. Các khái niệm Solar Storm, elite, typing patterns, encounter recipes, Expedition và learning vẫn tồn tại.

Tuy nhiên, cần phân biệt ba câu hỏi:

1. **Ý tưởng hình ảnh còn phù hợp không?** Phần lớn vẫn phù hợp với tên/identity cũ; bảng từng ảnh ở §3.
2. **Ảnh đã tạo có đạt alpha, độ rõ, silhouette và palette không?** Chưa thể xác nhận khi chưa xem ảnh thực tế.
3. **Copy ảnh vào repo là game dùng được ngay không?** Không. Cần manifest/consumer và tích hợp riêng; icon minh họa không tự tạo mechanic hay VFX.

### Quyết định ngắn gọn

| Việc | Quyết định |
|---|---|
| Xóa 36 ảnh đã tạo | **Không** |
| Tạo lại cả bộ cho FINAL 2 | **Không cần** |
| Tạo thêm ảnh bắt buộc để bắt đầu prototype | **0 ảnh**; có thể dùng ảnh đang có và fallback |
| Nhóm nên kiểm tra thiếu tiếp theo | **6 identity relic thực tế trong code** |
| Tự động tạo hết 12 E templates | **Không**; map vào roster trước |
| Tạo mới D/I/J cho đủ 58 | **Không**; chỉ khi UI/feature tương ứng thật sự cần |
| Có nên giữ các E đã tạo, nếu đã tạo rồi? | **Có**; xem bảng §5 để tái sử dụng, không vứt bỏ |

**Số ảnh mới chưa thể chốt chỉ từ danh sách tên.** Với sáu relic hiện có, số cần tạo là từ **0 đến 6**, tùy ảnh hiện có/E-template nào vượt qua kiểm tra. Nếu E06 dùng tốt cho Storm Script và E09 dùng tốt cho Giant Word Lens thì có thể giảm tối đa xuống 4 trước khi xét các nguồn reuse khác. Đây là điều kiện, không phải xác nhận hai ảnh đó đã đạt.

## 2. Giới hạn bằng chứng và cách dùng tài liệu

Người dùng xác nhận đã tạo 36 ảnh REQUIRED thuộc A/B/C/F/G/H. Câu về 12 E templates chưa xác định rõ tất cả đã render thành ảnh hay mới có prompt; tài liệu xử lý cả hai trường hợp.

Ở lần đối chiếu này chưa tìm thấy 36 ảnh theo các tên canonical của pack trong các đường art được kiểm tra. Ảnh có thể nằm ở Downloads, folder khác, tên khác hoặc file nén. Không suy ra chúng chưa được tạo hoặc bị mất.

Vì chưa được xem ảnh thực:

- “GIỮ” là quyết định bảo toàn source và identity, không phải visual approval.
- “DÙNG SỚM” nghĩa phù hợp với consumer dự kiến, không tự xác nhận đã tích hợp runtime.
- “TẠO NẾU THIẾU” nghĩa trước hết phải kiểm tra các ảnh đã có.
- Không có yêu cầu chấm điểm/chỉnh sửa trực tiếp ảnh thực trong report này.

Không cần gửi lại tất cả prompt để audit hình. Chỉ cần cung cấp đường dẫn folder hoặc ảnh thật khi muốn duyệt visual sau này.

### Nhãn dùng trong bảng

- **GIỮ / SỚM:** ứng viên dùng ở prototype hoặc UI của lượt chơi sớm.
- **GIỮ / SAU:** feature vẫn nằm trong FINAL 2 nhưng chưa cần tích hợp sớm.
- **GIỮ / ĐIỀU KIỆN:** cần mapping hoặc UI/feature được duyệt trước.
- **SỬA NẾU FAIL QA:** chỉ sửa khi đã nhìn thấy lỗi cụ thể, không vẽ lại theo phỏng đoán.

## 3. Bảng xử lý từng ảnh trong 36 ảnh đã tạo

Các tên file dưới đây là tên trong pack gốc. Không tự rename file thật nếu chưa xác minh chúng tương ứng.

### 3.1 Nhóm A — Sector Conditions: giữ cả 4

| ID | File | Quyết định | Consumer / lúc dùng | Điều phải lưu ý |
|---|---|---|---|---|
| A01 | `sector-solar-storm.png` | GIỮ / SỚM | Briefing/cue legend Solar Storm ở P30 | FINAL 2 ưu tiên cửa sổ thưởng energy, không phải xung sát thương toàn màn hình. Dùng icon stellar flare, nhưng tooltip/cue không được báo sai cơ chế |
| A02 | `sector-meteor-shower.png` | GIỮ / SAU | Briefing condition P40 | Là icon về meteor; **không** dùng nguyên icon nhóm thiên thạch như sprite target. Meteor nền và meteor gameplay là hai consumer khác nhau |
| A03 | `sector-gravity-well.png` | GIỮ / SAU | Briefing/Codex condition P40 | Không biến thành một ảnh toàn màn hình; pull/lensing dùng renderer hiện có, word label luôn rõ |
| A04 | `sector-time-fracture.png` | GIỮ / SAU | Briefing/Codex P40 | Phân biệt với Chrono affix; icon condition không có nghĩa input người chơi bị time-warp |

**Không cần vẽ lại A01** chỉ vì luật đổi sang bonus window; hình biểu tượng mặt trời vẫn đúng chủ đề. Cần sửa presentation/description trong game khi tích hợp, không nhất thiết sửa source art.

### 3.2 Nhóm B — Elite/Affix: giữ cả 9

| ID | File | Quyết định | Consumer / lúc dùng | Kiểm tra riêng |
|---|---|---|---|---|
| B01 | `elite-swift.png` | GIỮ / SỚM | Codex/briefing elite hiện có | Dáng mảnh, hướng chuyển động; không nhầm Berserker |
| B02 | `elite-armored.png` | GIỮ / SỚM | Elite readability hiện có | Bảo vệ bản thân; không giống Guardian liên kết đồng đội |
| B03 | `elite-frenzy.png` | GIỮ / SỚM | Elite readability hiện có | Cảm giác nhịp tấn công/aggression; không mặc định tooltip chỉ tăng tốc nếu code có hành vi khác |
| B04 | `elite-volatile.png` | GIỮ / SỚM | Elite readability hiện có | Core còn nguyên nhưng bất ổn; không hình nổ toàn màn hình |
| B05 | `affix-chrono.png` | GIỮ / SAU | P40 khi Chrono được duyệt | Temporal progression khác lateral Phase; không cần remake nếu đã phân biệt tốt |
| B06 | `affix-guardian.png` | GIỮ / SAU | P40 nếu cần affix Guardian thật | Nếu dùng behavior bảo vệ hiện có trong Fortress Siege, không thêm affix mới chỉ để dùng icon này |
| B07 | `affix-berserker.png` | GIỮ / SAU | P40 | Cần phân biệt với Swift/Frenzy bằng shape/cue, không chỉ sắc đỏ |
| B08 | `affix-phase.png` | GIỮ / SAU | P40 | Dịch ngang rõ; không đọc như một Chrono thứ hai |
| B09 | `affix-anchored.png` | GIỮ / SAU | P40 | Stabilizer nặng, không neo tàu biển; không hứa miễn nhiễm mọi damage |

Chín ảnh này là **identity icons**. Combat cue có thể là vòng/link/glyph procedural nhỏ riêng, không buộc dán icon 1024² cạnh từng enemy. Không tạo sprite quái mới từ icon chỉ vì đã có ảnh.

### 3.3 Nhóm C — Typing Patterns: giữ cả 8

| ID | File | Quyết định | Consumer / lúc dùng | Thay đổi FINAL 2 có làm bỏ ảnh không? |
|---|---|---|---|---|
| C01 | `typing-normal-word.png` | GIỮ / SỚM | Pattern legend/Test Lab | Không |
| C02 | `typing-short-burst.png` | GIỮ / SỚM | P30 | Không; vài token/pulse ngắn vẫn đúng dù prototype ưu tiên từ thật 2–4 chữ |
| C03 | `typing-long-word.png` | GIỮ / SỚM | P30 | Không; giữ extended token silhouette |
| C04 | `typing-phrase.png` | GIỮ / SAU | P40 | Không; hai cụm token vẫn biểu đạt phrase dù chỉ gõ a–z, không cần vẽ Space key |
| C05 | `typing-shared-target.png` | GIỮ / SAU | P40 | Không; một nguồn token nối nhiều target là đúng identity |
| C06 | `typing-chain.png` | GIỮ / SAU | P40 | Không; chuỗi handoff khác một nguồn chia nhánh |
| C07 | `typing-recall-word.png` | GIỮ / SAU | Learning/Recall đã duyệt | Không; không đưa gợi ý đáp án vào ảnh tĩnh |
| C08 | `typing-boss-sentence.png` | GIỮ / SAU | Boss sentence phase khi được duyệt | Không; icon không phải text gameplay, câu thật phải do runtime render |

**Không tạo lại C04/C08 chỉ vì Space vẫn dùng cho Rage.** Đây là thay đổi input contract và hướng dẫn UI, không phải thay identity phrase/sentence.

### 3.4 Nhóm F — Encounter Recipes: giữ cả 7

| ID | File | Quyết định | Consumer / lúc dùng | Giới hạn |
|---|---|---|---|---|
| F01 | `recipe-swarm-assault.png` | GIỮ / SỚM | P30 briefing/preview | Không dùng làm ảnh nguyên cả wave |
| F02 | `recipe-sniper-ambush.png` | GIỮ / SỚM | P30 | Không có nghĩa cần vẽ enemy sniper mới |
| F03 | `recipe-fortress-siege.png` | GIỮ / SỚM | P30 | Hình structure/defensive links hợp recipe; không đòi building sprite mới |
| F04 | `recipe-escort-break.png` | GIỮ / SAU | P40 | Chỉ hiện khi recipe đúng nghĩa đã có |
| F05 | `recipe-elite-hunt.png` | GIỮ / SAU | P40 | Không ép elite hunting objective vào slice vì icon đã xong |
| F06 | `recipe-recall-rupture.png` | GIỮ / SAU | Recipe Recall được duyệt | Giữ word/memory clarity; không phải hiệu ứng làm chữ lỗi |
| F07 | `recipe-boss-prelude.png` | GIỮ / SỚM | Preview encounter 7/đoạn chuẩn bị boss, nếu UI có nhãn này | Có thể dùng trước khi có dedicated recipe implementation; chỉ label đúng content, không giả mechanic chưa có |

### 3.5 Nhóm G — Expedition: giữ cả 4

| ID | File | Quyết định | Consumer / lúc dùng | Giới hạn |
|---|---|---|---|---|
| G01 | `expedition-emblem.png` | GIỮ / SỚM | Mode entry/setup P10–P30 | Không bắt đợi Phase 4 của roadmap V2 cũ |
| G02 | `expedition-daily-seed.png` | GIỮ / SAU | P70B Fixed/Daily Challenge | Không đưa nút Daily hoạt động giả khi mode chưa có |
| G03 | `expedition-score-medal.png` | GIỮ / SỚM | Result/PB summary | Medal không đồng nghĩa mọi defeat đều được thông báo victory; UI label quyết định |
| G04 | `expedition-reroll-chip.png` | GIỮ / SAU | Reroll nếu có về sau | Prototype không paid reroll. **Không tự gán thành Salvage**, hai hành động khác nhau |

Nếu về sau muốn tái sử dụng G04 cho một generic reroute chip, cần duyệt semantic/UI mapping; không coi đó là mặc định trong bản này.

### 3.6 Nhóm H — Learning/Mastery: giữ cả 4

| ID | File | Quyết định | Consumer / lúc dùng | Giới hạn |
|---|---|---|---|---|
| H01 | `learning-wanted-word.png` | GIỮ / SAU | P70A pilot, có thể ngay sau P30 | Giọng điệu theo dõi mục tiêu học, không truy nã/phạt người học |
| H02 | `learning-mastery-star.png` | GIỮ / SAU | Mastery/Codex | Có icon không có nghĩa chỉ gõ đúng một lần đã “mastered” |
| H03 | `learning-lexicon-boss.png` | GIỮ / SAU | Lexicon encounter đã duyệt | Là emblem, không phải sprite boss mới hoặc AI tự sinh chữ |
| H04 | `learning-review-token.png` | GIỮ / SAU | Learning reminder/summary nếu UI cần | Không tạo tiền tệ “review token” chỉ vì tên file có token |

### 3.7 Gói ưu tiên từ 36 ảnh

**14 ứng viên dùng sớm:** A01; B01–B04; C01–C03; F01–F03 và F07; G01 và G03.

**22 ảnh còn lại:** giữ master, phân loại theo feature/phase; chưa cần load vào runtime sớm.

“14 ứng viên” không có nghĩa HUD phải hiển thị đồng thời 14 icon hoặc bắt prototype tích hợp đủ cả 14. UI có consumer nào thì dùng consumer đó; Codex/briefing/result có thể dùng cùng source art.

## 4. E01–E12: giải quyết cả trường hợp đã tạo và chưa tạo

### Nếu mới có prompt E, chưa tạo ảnh

- Chưa chạy cả 12 prompt.
- Dùng bảng relic thực ở §6 để chọn identity cần hình.
- Có thể dùng prompt bổ sung R01–R06 ở §8 khi không có ảnh reuse phù hợp.
- Giữ các E còn lại làm thư viện ý tưởng cho roster về sau; không tạo mechanic để hợp thức hóa ảnh.

### Nếu đã tạo cả 12 ảnh E

- Giữ cả 12 source, không xóa/overwrite.
- Kiểm tra E06 cho Storm Script và E09 cho Giant Word Lens trước: đây là hai cặp có sự tương ứng rõ nhất về mô tả.
- Các cặp khác cần duyệt hình/semantic, không chỉ tên gần giống.
- Một ảnh không được gán cho hai relic cùng xuất hiện trong một offer nếu khiến người chơi không phân biệt được.
- Ảnh chưa map được để `UNASSIGNED_SOURCE`, không cấp code ID mới tự động.
- Không cần vẽ lại chỉ vì tên file template khác tên relic: có thể copy/derive sang canonical source name sau khi mapping được duyệt, vẫn giữ file gốc.

## 5. Bảng mapping từng E-template

Đây là **mapping ứng viên**, chưa phải roster approved hoặc xác nhận ảnh đã đạt.

| ID | File template | Quyết định hiện tại | Khả năng reuse / vì sao |
|---|---|---|---|
| E01 | `relic-precision-lens.png` | GIỮ / ĐIỀU KIỆN | Reserve cho approved precision identity; có thể là nguồn lens nếu E09 không có, nhưng Giant Word Lens cần dáng nặng khác precision nhẹ |
| E02 | `relic-perfect-capacitor.png` | GIỮ / ĐIỀU KIỆN | Capacitor không tự là First Light Seed; chỉ map khi hình/description thực sự phù hợp, tránh hứa reward perfect cho relic hồi ở word đầu |
| E03 | `relic-crystal-focus.png` | GIỮ / ĐIỀU KIỆN | Reserve precision/prism; chưa có identity code đã chốt tương ứng tên này |
| E04 | `relic-combo-coil.png` | GIỮ / ĐIỀU KIỆN | Có thể làm nguồn thiết kế Cosmic Conductor nếu thể hiện điều phối energy; không tự coi coil generic là Frost Rhythm |
| E05 | `relic-streak-reactor.png` | GIỮ / ĐIỀU KIỆN | Có motif streak nhưng Frost Rhythm cần cue cold/control; nếu ảnh hiện có đủ cue và rõ khi đặt cạnh relic khác thì reuse, không tự duyệt bằng tên |
| E06 | `relic-arc-conductor.png` | ƯU TIÊN KIỂM TRA REUSE | Candidate mạnh cho Storm Script: một energy input chia nhánh; giữ tên/ID Storm Script, không tạo Arc Conductor relic mới |
| E07 | `relic-heavy-core.png` | GIỮ / ĐIỀU KIỆN | Heavy payoff source; chưa phải relic code tương ứng. Không đổi Giant Word Lens thành core chỉ để tận dụng ảnh nếu mất identity |
| E08 | `relic-syllable-forge.png` | GIỮ / ĐIỀU KIỆN | Source cho một approved length-fusion mechanic sau; game hiện không có “syllable forge” chỉ vì có template |
| E09 | `relic-titan-lens.png` | ƯU TIÊN KIỂM TRA REUSE | Candidate mạnh cho Giant Word Lens: siege-grade focusing lens; map tên source, giữ code ID `giant-word-lens` |
| E10 | `relic-echo-core.png` | GIỮ / SAU | Recall art reserve; chưa có relic Recall tương ứng được duyệt |
| E11 | `relic-memory-orbit.png` | GIỮ / SAU | Recall art reserve; không ép vào cosmic chỉ vì đều có orbit |
| E12 | `relic-mnemonic-prism.png` | GIỮ / SAU | Mnemonic crystal không mặc định là Mirror Vow. Tính “trong suốt/phản chiếu” chưa đủ để đổi semantic từ nhớ sang bảo vệ |

**Không có yêu cầu phải dùng hết 12 E.** Một asset chưa dùng hiện tại là source dự phòng, không phải code debt cần tạo thêm tính năng để trả.

## 6. Sáu relic thực tế và hàng đợi hình ảnh bổ sung

Các ID dưới đây được đọc từ `src/relics/registry.ts` trong lần soạn tài liệu. Cơ chế không được thay đổi bởi prompt ảnh.

| Prompt mới | Code ID / tên giữ nguyên | Source filename đề xuất | Reuse trước | Khi nào tạo mới? |
|---|---|---|---|---|
| R01 | `first-light-seed` / First Light Seed | `relic-first-light-seed.png` | Tìm icon relic đã có; E02 chỉ khi semantic thực sự phù hợp | Không có ảnh rõ về nguồn hồi phục/ánh sáng đầu tiên |
| R02 | `storm-script` / Storm Script | `relic-storm-script.png` | E06 ưu tiên | E06/ảnh cũ không đạt clarity hoặc trùng Cosmic Conductor |
| R03 | `frost-rhythm` / Frost Rhythm | `relic-frost-rhythm.png` | E05/E04 chỉ khi hình thực thể hiện cold rhythm phù hợp | Không có ảnh phân biệt cold/control với reactor/combo generic |
| R04 | `giant-word-lens` / Giant Word Lens | `relic-giant-word-lens.png` | E09 ưu tiên; E01 nguồn phụ nếu phù hợp | Không có heavy-lens identity đủ rõ |
| R05 | `mirror-vow` / Mirror Vow | `relic-mirror-vow.png` | Tìm asset bảo vệ/phản chiếu hiện có đúng identity | Không có ảnh phù hợp; không ép mnemonic-prism thành mirror theo tên |
| R06 | `cosmic-conductor` / Cosmic Conductor | `relic-cosmic-conductor.png` | Tìm ảnh existing; E04 có thể làm source nếu khác Storm rõ | Không có identity điều phối năng lượng khác branching-discharge của Storm |

### Thứ tự đề xuất nếu muốn làm art relic ngay

1. Audit E06 và E09 trước; nếu đạt, **không tạo R02/R04**.
2. Kiểm tra R01/R03/R05/R06 có source phù hợp trong kho đã tạo không.
3. Chỉ tạo các ô vẫn thiếu. Nếu thiếu cả bốn: ưu tiên **R01 → R03 → R05 → R06** để bổ sung những silhouette ít được đại diện trong template hiện tại.
4. Tạo R02/R04 sau chỉ khi cần, không phải để đủ “bộ sáu ảnh mới”.

Tên source mới là **đề xuất mapping**, không yêu cầu rename code ID hay sửa save. AI tích hợp cần thống nhất manifest canonical trước khi import.

### Lưu ý về pipeline hiện tại

`src/ui/painted-icons.ts` đang có đường icon equipment và skills; chỉ đặt một relic PNG vào folder không bảo đảm consumer relic đã hỗ trợ. Tạo source art và tích hợp runtime là hai công việc khác nhau. Không tự sửa glob/code ở bước tạo ảnh.

## 7. Cách sử dụng các prompt bổ sung

**Chỉ chạy một prompt R cho identity còn thiếu sau bước audit.** Không đưa cả §8 vào một lần generation rồi yêu cầu đủ sáu ảnh.

Mỗi prompt dưới đây tự chứa yêu cầu đầu ra, background, style, subject và negatives. Có thể copy riêng nguyên code block đó vào công cụ tạo ảnh.

### Reference image

- Nếu có một ảnh đã duyệt trong bộ 36, đính kèm như **style reference**: giữ polish/material/lighting, không copy palette hoặc silhouette không liên quan.
- Nếu sửa chính một ảnh E có sẵn để phục vụ relic, đính kèm **ảnh E đó làm source chính**, nêu rõ muốn chỉnh nó; không để AI đoán ảnh nào phải edit.
- Prompt yêu cầu true alpha không bảo đảm công cụ sẽ xuất alpha đúng; kiểm tra file sau generation. Không accept checkerboard in sẵn.
- 1024×1024 là master size mong muốn. Nếu tool không hỗ trợ chính xác, dùng square size hỗ trợ rồi xử lý ở pipeline riêng; không giả file đã đúng size chỉ vì prompt có số.
- Không hard-code thông số balance lên ảnh; effect values/rarity/level do UI render.

### Quy tắc tên

R01–R06 chỉ là ID prompt trong tài liệu này, không phải relic ID mới. Tool không kiểm soát filename thì người dùng đặt lại tên tải xuống theo mapping; việc đổi tên không được ghi đè source cũ chưa kiểm tra.

## 8. Prompt bổ sung đầy đủ cho 6 identity relic

### R01 — First Light Seed

**Tạo nếu thiếu.** Identity hiện có: word combat đầu tiên mỗi stage hồi Hull. Ảnh thể hiện nguồn hồi phục ban đầu, không biến thành relic cây cối/nature hay buff mỗi perfect word.

**Silhouette chủ đạo:** lõi dạng hạt giọt nước nằm trong cradle mở. **Khác:** Storm là phiến chia nhánh, Frost là vòng lạnh, Mirror là hai bản phản chiếu.

```text
Create exactly ONE standalone source-art image for the filename:
relic-first-light-seed.png

OUTPUT CONTRACT
- One icon, one image, one file. No contact sheet, collage, variants, split panels, or additional assets.
- Square composition; target source size 1024 x 1024 pixels; PNG with genuine transparent alpha.
- No background scene, black backdrop, white backdrop, or painted checkerboard.
- Keep every part of the object and its soft glow inside the canvas with approximately 15 percent clear margin.
- No words, letters, numerals, logos, watermark, UI frame, rarity border, or filename in the image.

SUBJECT
Design a premium science-fantasy relic called First Light Seed.
The relic is a small luminous teardrop-shaped energy seed held upright inside a partially open, compact aerospace-metal cradle. Two short protective cradle petals support its lower sides without resembling leaves or wings. The upper point of the seed emits one gentle sunrise-like halo. A few thick, clean repair-energy channels curve inward toward the seed, suggesting restoration and a fresh beginning rather than an explosion.

MATERIALS AND PALETTE
Use dark desaturated titanium for the cradle, warm ivory and restrained pale gold for the inner light, and very subtle cool-cyan technical seams. The seed may have translucent depth, but its outer silhouette must remain clearly defined. Keep the overall palette warm and restorative, not green or forest-themed.

COMPOSITION AND STYLE
One centered upright relic, slightly elevated three-quarter presentation, strong teardrop silhouette. Premium polished RPG inventory art with convincing material thickness, controlled cinematic lighting, and broad readable forms. The object should still be recognizable at 64 to 96 pixels. Secondary detailing must not carry the meaning.

DO NOT INCLUDE
Leaves, roots, vines, a literal plant seed, a flower, a medical cross, a sun landscape, hands, a pedestal, a full spaceship, decorative alphabet marks, a generic battery, or rays covering the whole canvas. Do not depict damage, ammunition, or an explosive bomb.

REFERENCE HANDLING
If a Space Typing style reference is attached, borrow only its material polish, lighting quality, and edge finish. Do not copy its palette, subject, silhouette, or background. Generate only this one requested relic.
```

**Accept khi:** vẫn nhận được hình hạt/cradle ở 64 px; không thành lá cây, viên gem chung chung hoặc mặt trời giống A01.

### R02 — Storm Script

**Chỉ tạo nếu E06 hoặc ảnh hiện có không dùng được.** Identity hiện có: perfect enemy words gây chain effect sang mục tiêu gần. Không đưa con số target lên ảnh, không vẽ chữ “script”.

**Silhouette chủ đạo:** một phiến kỹ thuật mở, năng lượng tách thành các nhánh. Không dùng vòng nhạc trưởng Cosmic Conductor.

```text
Create exactly ONE standalone source-art image for the filename:
relic-storm-script.png

OUTPUT CONTRACT
- One relic icon only, delivered as one image for one file.
- Square, target 1024 x 1024 pixels, PNG with real transparent alpha.
- No collage, contact sheet, alternative versions, scene background, or fake transparency grid.
- Preserve approximately 15 percent empty margin around all geometry and contained glow.
- No readable text, alphabet letters, numbers, runes resembling writing, logos, watermark, UI panels, or rarity frame.

SUBJECT
Create Storm Script as a compact engineered storm-routing artifact: a short, slightly fanned arrangement of two or three dark-metal data plates held together as ONE physical device. The plates have broad abstract conductive channels, not written characters. One bright energy input enters the center and separates into three short, clean electrical branches ending near three small contact terminals around the outer edge.

MECHANICAL VISUAL IDEA
The viewer should immediately perceive one successful input distributing energy outward to nearby contacts. The branches belong to the artifact and must stay close to it; do not turn them into a battle scene or actual enemy targets. The artifact should be wider than it is tall, with a distinctive plate-and-branch silhouette.

MATERIALS AND PALETTE
Dark gunmetal plates with crisp thickness and subdued violet-blue energy. Use pale cyan-white only at the input and branch tips. Electrical arcs should be few, thick, deliberate, and readable at small size, not a noisy lightning cloud. Avoid a broad circular orbital ring so the relic remains distinct from Cosmic Conductor.

STYLE
Premium cinematic science-fantasy inventory illustration, refined material finish, controlled bloom, clear foreground edges, detailed enough at full size but unmistakable at 64 to 96 pixels. Use a stable three-quarter presentation with no detached background elements.

DO NOT INCLUDE
A book, parchment scroll, actual script, circuit-board writing, a magical wand, a handheld weapon, a trident, a full thunderstorm, a humanoid, a planet, or a large explosion. Do not draw a separate icon for each branch.

REFERENCE HANDLING
Use any attached style reference only for rendering quality and finish. If a specific existing arc-conductor image is explicitly supplied as the editing source, preserve its successful central silhouette where possible while meeting this identity. Otherwise generate a new single asset, not a comparison with the reference.
```

**Accept khi:** một nguồn chia nhánh đọc rõ, không glyph giống chữ, không nhầm skill Chain Lightning hoặc ảnh conductor còn lại khi nhìn trong cùng draft.

### R03 — Frost Rhythm

**Tạo nếu không có source phù hợp.** Identity hiện có: streak kích hoạt freeze. Không vẽ số streak; không đổi mechanic thành một reactor cộng damage.

**Silhouette chủ đạo:** cộng hưởng lạnh dạng vòng hở, các cánh cộng hưởng ngắn. Không tạo snowflake mảnh quá mức hoặc ảnh snowstorm.

```text
Create exactly ONE standalone source-art image for the filename:
relic-frost-rhythm.png

OUTPUT CONTRACT
- One centered relic only. One image, one file, no collage or multiple variants.
- Square composition, target 1024 x 1024 pixels, PNG with genuine transparent alpha.
- No solid background, sky, scenery, pedestal, or painted checkerboard.
- Keep approximately 15 percent transparent margin, including all frost and glow.
- No text, numbers, musical notation, labels, watermark, logo, UI frame, or rarity border.

SUBJECT
Design Frost Rhythm as a compact cryogenic resonance instrument built for a futuristic spacecraft. A thick open circular resonator surrounds a small icy-blue core. Three broad mechanical resonance tabs of staggered length sit along one side of the ring, giving the silhouette a distinctive rhythmic stepped contour. A single restrained frozen wave connects the tabs to the core.

READABLE IDENTITY
Communicate sustained rhythm becoming controlled freezing power. Frost is concentrated on the edges of the metal and inside a few thick crystalline facets. Use a few evenly spaced pulse segments within the object to suggest cadence. The relic must remain one solid, functional artifact, not a collection of ice particles or a generic luminous ring.

MATERIALS AND PALETTE
Desaturated dark blue steel, frosted glass, pale icy cyan, and small cold-white highlights. Keep substantial dark structure visible. No orange fire, warm reactor glow, foliage green, or dominant purple energy. The silhouette should remain understandable in grayscale.

STYLE AND COMPOSITION
Premium polished science-fantasy RPG inventory art with tangible depth, controlled cinematic lighting, and crisp edges. Slight three-quarter view. Large readable structural forms first; subtle material detailing second. Recognizable at 64 to 96 pixels without depending on tiny shards or thin lines.

DO NOT INCLUDE
A literal snowflake symbol, a blizzard scene, a musical staff, notes, an equalizer UI, a clock face, a household fan, a gun, a full engine, a frozen planet, or a huge ice explosion. Do not use a generic battery or stacked hot reactor bands.

REFERENCE HANDLING
An attached reference may define polish and rendering finish only. Use this asset's own cold palette and resonance silhouette. Do not copy unrelated World colors or decorative symbols.
```

**Accept khi:** lạnh + nhịp đọc được bằng form/cue; không chỉ là coil tím đổi sang xanh; Frost và Flow emblems không giống nhau đến mức cần đọc tên mới phân biệt.

### R04 — Giant Word Lens

**Ưu tiên reuse E09 trước.** Identity hiện tại là bonus cho từ boss dài; FINAL 2 có thể thử scope rộng hơn theo phase. Art cần giữ nghĩa “cam kết dài → tập trung lực”, không cố định chỉ boss hoặc viết “8+”.

**Silhouette chủ đạo:** lens công nghiệp nặng với khung chữ nhật bo góc và aperture rộng, khác precision lens nhỏ.

```text
Create exactly ONE standalone source-art image for the filename:
relic-giant-word-lens.png

OUTPUT CONTRACT
- One relic, one square image, one file. No contact sheet, collage, alternate angles, or second variant.
- Target source size 1024 x 1024 pixels, PNG with true transparent alpha.
- Approximately 15 percent clear margin around the entire object and contained light.
- No background scene, fake checkerboard, text, letters, numbers, logos, watermark, UI card, or rarity border.

SUBJECT
Create a siege-grade focusing lens artifact with a broad reinforced industrial frame, a deep optical aperture, and two heavy side braces. The outer structure should have a compact rounded-rectangular mass, while the inner aperture is clearly circular. Several broad, abstract input-light segments compress through the aperture into one dense, short output glow.

IDENTITY
This relic represents deliberate long-input commitment producing a concentrated payoff. It should feel substantially heavier and more powerful than a delicate precision lens, without becoming a weapon or a whole spacecraft component scene. Keep the output glow close to the aperture; do not extend a laser beam out of the canvas.

MATERIALS AND PALETTE
Dark aerospace gunmetal, restrained deep-navy metal accents, thick clear optical glass with visible depth, rich cyan internal energy, and a small warm gold-white concentrated focal point. Avoid overexposed bloom. Preserve readable dark structure around the bright aperture.

STYLE AND COMPOSITION
One three-quarter-view object, centered, premium cinematic science-fantasy RPG inventory art. Tangible beveled edges, broad structural shapes, controlled glow. The heavy frame and deep lens must read clearly at 64 to 96 pixels, even without seeing tiny bolts or surface markings.

DO NOT INCLUDE
A real camera lens, telescope, sniper scope, crosshair, readable word, alphabet token, boss portrait, cannon barrel, projectile scene, giant gem, or a generic circular energy orb. Do not paint gameplay numbers or the relic name into the art.

REFERENCE HANDLING
If an existing titan-lens asset is explicitly supplied as an editing source, retain its successful heavy-lens identity and refine only what is required. Do not generate a new asset merely because its current filename differs. Any other reference is only a rendering-style anchor.
```

**Accept khi:** nhìn nhỏ vẫn là lens nặng; không vẽ lại E09 nếu khác biệt duy nhất là filename.

### R05 — Mirror Vow

**Tạo nếu thiếu.** Identity hiện có: dùng Shield để bảo vệ streak/Power khi có mistake, giới hạn theo stage. Hình không cần mô tả chuyện gõ sai, không biến thành Recall prism.

**Silhouette chủ đạo:** hai mảnh gương dày nghiêng vào nhau quanh một lõi/đường nối bảo vệ, không bubble shield generic.

```text
Create exactly ONE standalone source-art image for the filename:
relic-mirror-vow.png

OUTPUT CONTRACT
- One complete relic icon only, one image for one file.
- Square, target 1024 x 1024 pixels, PNG with genuine transparent alpha.
- No background environment, black or white backdrop, fake transparency grid, pedestal, or extra panel.
- Preserve approximately 15 percent transparent margin around all surfaces and controlled glow.
- No words, letters, numerals, runes, watermark, logo, UI border, rarity frame, or captions.

SUBJECT
Design Mirror Vow as a protective paired-mirror artifact. Two thick, slightly asymmetrical polished mirror plates lean inward around a narrow luminous central connection. A compact dark-metal hinge or clasp joins them into ONE coherent device at the lower center. The broad mirror faces catch restrained blue-white reflections, while the central connection appears stable and guarded.

MEANING
The visual should suggest preserving continuity by redirecting one disruptive impact. Represent this with a single short angled light path meeting one mirror and turning away harmlessly near its edge. Keep this cue subtle and contained. The relic is defensive and precise, not a magical memory prism or a damage-reflection combat screenshot.

MATERIALS AND PALETTE
Polished silver-blue reflective surfaces, dark titanium backing, pale cyan protective energy, and a tiny restrained gold fastening detail. Use depth and clean large reflective planes, not noisy environment reflections. Do not reflect a landscape, a face, letters, or another full object inside the mirrors.

COMPOSITION AND STYLE
Centered upright pair, broad recognizable split silhouette, premium cinematic science-fantasy inventory rendering. The plates must feel thick and physical. Keep the silhouette distinct from a circular shield generator, a faceted gemstone, and a floating memory crystal. Recognizable at 64 to 96 pixels.

DO NOT INCLUDE
A bathroom mirror, ornate medieval frame, human face, angel wings, shields with heraldry, a full bubble, shattered-glass explosion, brain imagery, ghost images of text, blood, or a whole spaceship. No tiny cracks that make it look broken or unusable.

REFERENCE HANDLING
Borrow polish and lighting quality from any attached style reference, not its subject or palette. Render only this requested protective mirror relic.
```

**Accept khi:** bảo vệ/phản chiếu khác mnemonic Recall; không cần người xem đọc tooltip mới phân biệt với E12 về silhouette.

### R06 — Cosmic Conductor

**Tạo nếu thiếu.** Identity hiện có: kết hợp tăng chain và bonus từ boss dài. Không tạo một skill nhạc mới hoặc relic thứ bảy tên khác.

**Silhouette chủ đạo:** một cụm điều phối khép vòng quanh aperture, các channel tụ lại, đối lập Storm Script chia nhánh ra ngoài.

```text
Create exactly ONE standalone source-art image for the filename:
relic-cosmic-conductor.png

OUTPUT CONTRACT
- One relic icon only. One image, one file, no variants, contact sheet, collage, split screen, or companion assets.
- Square composition, target source size 1024 x 1024 pixels, PNG with true transparent alpha.
- No background scene or painted checkerboard. Keep approximately 15 percent clear margin around the full silhouette and glow.
- No text, letters, numbers, musical notation, logos, watermark, UI framing, or rarity border.

SUBJECT
Design a premium cosmic energy-coordination artifact. Three substantial curved metal conductor arms form a compact triangular-orbital enclosure around one deep central aperture. Broad energy channels travel inward along the arms and converge cleanly at the aperture, where a restrained gold-white focus is suspended. The three arms are physically joined into one engineered object; this is not a solar-system diagram.

DISTINCTION FROM STORM SCRIPT
The main visual verb is coordination and convergence, not branching lightning. Use a stable closed or nearly closed orbital silhouette with dark structural mass and disciplined flowing channels. Do not use a fanned data tablet, three electrical bolts spraying outward, or the same silhouette as a storm-routing relic.

MATERIALS AND PALETTE
Dark titanium and deep indigo surfaces, controlled blue-violet energy, pale cyan channel edges, and a small gold-white focal point. Rich material depth and subtle glass-like energy containment are welcome, but the object must not become a generic purple orb or jewel. Keep sufficient dark-to-light contrast at small size.

COMPOSITION AND STYLE
Centered three-quarter-view engineered artifact, premium polished science-fantasy RPG inventory art. The outer three-arm shape and inner focus must remain distinct at 64 to 96 pixels. Use a few large readable energy paths; avoid dozens of tiny orbiting particles.

DO NOT INCLUDE
A conductor person, baton, musical notes, an orchestra, a literal galaxy background, planets, a clock, a wand, a trident, an infinity logo, letters, a giant lens barrel, or a full electrical storm. Do not make a recolored duplicate of Storm Script or Giant Word Lens.

REFERENCE HANDLING
An attached reference may supply only rendering polish, edge treatment, and controlled lighting. Preserve this asset's own coordinated orbital identity and specified palette.
```

**Accept khi:** nhìn cạnh Storm Script thấy rõ “hội tụ/điều phối” so với “chia nhánh”; không phải cùng một ảnh đổi màu/grade.

## 9. Có cần prompt sửa 36 ảnh cũ không?

**Chưa có bằng chứng cần sửa hàng loạt.** Hai cặp cần ưu tiên so cạnh nhau: B05/B08 (Chrono/Phase), B02/B06 (Armored/Guardian). Cũng cần xem B03/B07 và C05/C06 nếu thực tế bị giống.

Dưới đây là hai prompt sửa dự phòng cho trường hợp QA xác nhận Chrono/Phase khó phân biệt. **Không chạy nếu ảnh đã rõ.** Không tạo thêm hai affix mới, không giữ hai bản cùng identity như hai game items khác nhau.

### Q01 — Chỉnh Chrono nếu đang giống Phase

**Điều kiện:** phải đính kèm đúng `affix-chrono.png` làm ảnh cần sửa. Bản edit lưu tạm, duyệt rồi mới thay runtime; bảo toàn master gốc.

```text
Edit ONLY the attached affix-chrono image. Produce ONE revised icon, not a comparison sheet and not a new gameplay identity.

Preserve the original icon's successful premium Space Typing material finish, central enemy-core identity, square composition, and general visual quality. The specific repair is to make Chrono read as TEMPORAL ACCELERATION rather than SIDEWAYS DISPLACEMENT.

Keep one crisp main core, add at most two close, subtle sequential echoes behind it along a single forward-depth trajectory, and use a few thick segmented temporal arcs to imply progressing time. Do not place two equal full bodies side by side. Avoid large portal slits or lateral mirrored copies; those belong to Phase.

Use cyan, spectral blue, restrained violet, and dark metal. Preserve a strong silhouette and contained glow that remains recognizable at 64 to 96 pixels. Do not depend on color alone. No clock face, numbers, letters, hourglass, text, logo, watermark, or full background.

Output one square PNG with genuine transparent alpha, target 1024 x 1024 pixels, approximately 15 percent clear margin. No checkerboard painted into the image, collage, extra variant, caption, or filename text. Keep the original untouched outside this edited output.
```

### Q02 — Chỉnh Phase nếu đang giống Chrono

**Điều kiện:** phải đính kèm đúng `affix-phase.png`, không lấy Chrono làm source chính rồi đổi màu.

```text
Edit ONLY the attached affix-phase image. Produce ONE revised icon, not a comparison sheet and not a new gameplay identity.

Preserve the original icon's successful premium Space Typing finish and compact enemy-core identity. The required repair is to make Phase read as LATERAL SPATIAL DISPLACEMENT, clearly different from temporal acceleration.

Keep one solid primary core and one nearby partial translucent echo offset horizontally. Join the two states with a single narrow vertical displacement seam, like a restrained spatial slice. The primary core must remain dominant, and both states must clearly belong to the same unit. Avoid multiple sequential rearward echoes, clock-like segmented rings, or a long forward motion trail.

Use dark metal, indigo, pale cyan highlights, and restrained spectral violet. Prioritize the sideways split silhouette rather than adding more bloom or particles. It must remain understandable at 64 to 96 pixels and in grayscale.

Do not add text, numbers, runes, mirror imagery, a clock, a full portal scene, extra enemies, a logo, watermark, UI frame, or decorative background.

Output exactly one square PNG with genuine transparent alpha, target 1024 x 1024 pixels, approximately 15 percent safe margin around geometry and glow. No fake checkerboard, collage, second variant, or comparison panel. Preserve the original source separately.
```

## 10. Các ảnh KHÔNG cần tạo tiếp lúc này

| Nhóm/ý tưởng | Quyết định | Khi nào xem lại? |
|---|---|---|
| D01–D04 Flow emblems | Chưa cần; Flow có thể dùng tier label/aura/cue hiện tại | UI có consumer cần emblem riêng và art hiện tại chưa đủ |
| I01–I04 boss-part icons | Chưa cần cho slice dùng boss cũ | P50 target UI/Test Lab thực sự cần; dùng prompt cũ tương ứng, không mặc định tạo cả 4 |
| Boss-specific detachable sprites | Hoãn | Reference boss có anchor, perspective, part types, scale, layering đã chốt |
| J01 Nemesis | Hoãn | Nhánh Nemesis được duyệt, record/return flow có thật |
| J02 Personal Ghost | Hoãn | P70C có UI và echo rendering contract |
| Toàn bộ 12 relic mới | Không tạo | Roster mục tiêu 12 tổng bao gồm 6 cũ; chưa chốt 6 identity mới |
| Cinematic/planet explosion/fleet layers | Hoãn | P90 layout và perf pass |
| Background World mới chỉ vì chuyển FINAL 2 | Không cần | Chỉ theo yêu cầu background riêng đã duyệt |
| Sprite Chrono/Guardian mới nguyên con | Không bắt buộc | Existing enemy + overlay/cue không đủ identity thì mới có art request riêng |
| Literal Space/punctuation icon cho phrase | Không cần | Literal input mode riêng được duyệt |
| Ảnh Choose-1-of-3 gồm ba thẻ trong một file | Không tạo | UI dựng ba option động từ từng icon + text, không ảnh chụp UI cố định |
| Reroll/Salvage/Victory/Defeat cùng một banner | Không tạo | Dùng UI state/label động, không bake sai state vào artwork |

### Salvage có cần một icon mới không?

Không phải yêu cầu bắt buộc. Repo có asset equipment mang tên salvage, nhưng **tên gần giống không đủ để duyệt dùng làm nút hành động**. Cần xem ảnh và tránh việc icon của một món gear cũng dùng như hành động đổi món gây nhầm.

Ưu tiên label/glyph hành động nhỏ từ UI, hoặc source đã được duyệt cho consumer đó. Không tự đổi G04 Reroll thành Salvage và không thêm prompt mới chỉ để mọi nút đều có painted icon.

## 11. QA ảnh: làm từng bước trước khi yêu cầu tạo lại

### Bước 1 — Kiểm kê file thật

Tạo một bảng inventory có: prompt ID, filename gốc, đường dẫn source thực, dimensions, alpha, tên identity, consumer, phase và trạng thái QA. Ở bước này không rename/move/delete hàng loạt.

Nếu có tên tải xuống tự động như `image_123.png`, xem ảnh rồi map; không đoán chỉ từ thứ tự generation. Nếu E đã tạo, nhập đủ 12 vào bảng dưới dạng template/source chưa gán trước.

### Bước 2 — Kiểm technical

- File mở được, không hỏng và đúng loại ảnh thực, không chỉ đổi extension.
- Alpha thật; nhìn trên nền sáng và tối để phát hiện viền/fake checkerboard.
- Không crop silhouette/glow quan trọng; safe margin đủ.
- Không chữ/filename/logo do model vẽ nhầm.
- Không collage/multiple variants trong một source được yêu cầu một icon.
- Không upscale vội rồi gọi ảnh nét hơn; giữ master nguyên, xử lý runtime riêng.

### Bước 3 — Kiểm phân biệt theo nhóm

Xếp ảnh cạnh nhau để **kiểm tra**, khác với cấm model generate nhiều asset trong một ảnh. Có thể dùng một contact sheet QA sau khi từng source đã tồn tại riêng.

Các nhóm bắt buộc so:

1. Chrono ↔ Phase ↔ Time Fracture.
2. Armored ↔ Guardian ↔ boss shield icon nếu có.
3. Swift ↔ Frenzy ↔ Berserker.
4. Shared Target ↔ Chain ↔ Short Burst.
5. Storm Script ↔ Cosmic Conductor ↔ skill Chain Lightning.
6. Giant Word Lens ↔ Precision Lens nếu cùng được dùng.
7. Mirror Vow ↔ Memory/Mnemonic imagery.

Test ở 64/96 px cho illustrated icons, và kích thước thực nếu HUD dùng 24/32 px. Một ảnh đạt 96 px nhưng không đọc ở 24 px có thể **giữ cho Codex/draft**, dùng glyph nhỏ cho combat; không bắt vẽ lại toàn bộ.

### Bước 4 — Kiểm semantic

- Icon chỉ minh họa identity, không tự áp gameplay.
- Word/number/rarity/level/remaining charge do runtime render, không bake vào image.
- Meteor illustration không là collision target; boss-part UI icon không là painted boss attachment.
- Flow icon không có nghĩa thêm resource meter/buff.
- Review token illustration không là currency mới.
- Relic có tên canonical thật, không dùng tên E-template làm ID gameplay tự phát.

### Bước 5 — Kết luận đúng loại

| Kết quả QA | Hành động |
|---|---|
| Đạt cho consumer sớm | Duyệt mapping và runtime preparation |
| Đạt nhưng feature chưa tới | Giữ source, chưa preload/import |
| Đẹp ở lớn, khó đọc ở nhỏ | Dùng Codex/draft, glyph/cue khác cho HUD |
| Sai alpha/halo nhưng concept đúng | Chỉnh technical qua pipeline hoặc edit có kiểm soát; không tự bỏ cả concept |
| Khó phân biệt silhouette | Chỉnh đúng source và đúng vấn đề, không regenerate cả bộ |
| Không map được mechanic hiện tại | Giữ UNASSIGNED_SOURCE, không invent relic mới để dùng |

## 12. Source staging, runtime và hiệu năng

### Source staging đề xuất

Nếu các ảnh đã có folder ổn định, **giữ folder đó** và dùng manifest. Chỉ khi cần tổ chức bộ mới, có thể dùng convention sau, không phải lệnh tự di chuyển:

```text
art-src/expansion-v2/
  conditions/          # A
  elite/               # B
  typing-patterns/     # C
  encounter-recipes/   # F
  expedition/          # G
  learning/            # H
  relics/
    templates/         # E chưa map, nếu đã tạo
    canonical/         # R hoặc source reuse đã map
```

Không dùng staging path làm runtime URL mặc định. Runtime phải theo cấu trúc thật được phase integration duyệt. Không tạo folder/icon giả hoặc sửa manifest game trong nhiệm vụ chỉ viết tài liệu này.

### Runtime rules

- Master PNG không mặc định được preload. Chọn derivative size theo CSS size × DPR mục tiêu và test nét/bytes.
- Draft/Codex có thể tải theo màn; chỉ nhóm active cần giữ resident.
- Trên Retina, cần đủ resolution để không mờ nhưng không bắt tất cả icon dùng 1024².
- Nén file giảm transfer, không tự giảm decoded texture memory nếu dimensions giữ nguyên.
- 36 ảnh RGBA 1024² cùng decode tương đương khoảng **144 MiB pixel base**; 48 ảnh tương đương **192 MiB**, chưa tính bản sao/mipmap. Đây là tính toán tình huống, không khẳng định game hiện đang load như vậy.
- Quality có thể đổi derivative/fidelity; không mất cue, không đổi mechanic hoặc gameplay RNG.
- Có fallback khi asset thiếu; không để một ảnh icon 404 block draft, target selection hoặc clear stage.

## 13. Manifest bàn giao cho AI tích hợp

Một dòng cho mỗi source đã map:

```text
promptId:
existingSourcePath:
canonicalGameplayId:
playerFacingName:
canonicalSourceFilename:
consumer: draft | Codex | briefing | mode-entry | result | HUD
phase:
status: candidate | visually-approved | deferred | unassigned
reuseDecision: existing | mapped-template | new-R-prompt
sourceDimensions / hasRealAlpha:
expectedDisplaySize / DPR:
runtimeDerivativePath: to-be-decided-by-integration
fallback:
loadGroup / releaseOwner:
visualQANotes:
doNotChangeGameplay: true
```

Ví dụ mapping **đề xuất**, chỉ đánh dấu approved sau khi xem ảnh thật:

```text
promptId: E09 -> R04 identity
existingSourcePath: <đường dẫn thật của relic-titan-lens.png>
canonicalGameplayId: giant-word-lens
playerFacingName: Giant Word Lens
canonicalSourceFilename: relic-giant-word-lens.png
consumer: draft / Codex
status: candidate
reuseDecision: mapped-template
doNotChangeGameplay: true
```

Không cần generation chỉ để đổi `relic-titan-lens.png` thành `relic-giant-word-lens.png`. Dùng alias/copy đúng manifest sau khi duyệt, bảo toàn source gốc.

## 14. Checklist hành động cho chủ dự án

### Làm ngay

- [ ] Giữ master của 36 ảnh, không xóa/tạo lại cả bộ.
- [ ] Xác định 12 E đã là ảnh hay mới có prompt; nếu là ảnh, giữ cả 12.
- [ ] Chuẩn bị folder/đường dẫn để duyệt ảnh thật; chưa cần tự upload toàn bộ lên runtime.
- [ ] Đưa 14 ứng viên sớm ở §3.7 vào danh sách UI integration, không phải preload tất cả.
- [ ] Kiểm E06 → Storm Script, E09 → Giant Word Lens.
- [ ] Đánh dấu sáu relic ở §6: đã có source đạt / cần sửa source / cần tạo mới.

### Chỉ tạo nếu sau audit còn thiếu

- [ ] R01 First Light Seed.
- [ ] R03 Frost Rhythm.
- [ ] R05 Mirror Vow.
- [ ] R06 Cosmic Conductor.
- [ ] R02 Storm Script **chỉ nếu E06/ảnh khác không đạt**.
- [ ] R04 Giant Word Lens **chỉ nếu E09/ảnh khác không đạt**.

### Chưa làm

- [ ] Không chạy cả 12 E chưa map.
- [ ] Không tạo D/I/J chỉ để đủ bộ 58.
- [ ] Không generate cinematic/boss overlays trước layout.
- [ ] Không dùng prompt sửa Q01/Q02 khi chưa có lỗi visual thực tế.
- [ ] Không đổi code, mechanic, save ID hoặc balance để khớp ảnh vừa tạo.

## 15. Prompt ngắn giao AI tạo ảnh

```text
Đọc SPACE_TYPING_EXPANSION_FINAL_2_ART_REUSE_AND_ADDITIONAL_PROMPTS.md.

Lần này tôi chỉ yêu cầu tạo: <R01/R02/R03/R04/R05/R06 cụ thể>.
Ảnh đã kiểm tra và không có source phù hợp để reuse: <xác nhận của tôi>.
Style reference: <ảnh đính kèm nếu có>.
Nếu là edit, source cần sửa chính xác: <ảnh đính kèm>.

Chỉ dùng prompt tương ứng. Một asset = một generation call = một file.
Không tạo cả bộ, không tạo biến thể trong cùng canvas, không tạo UI screenshot.
Không thêm chữ/filename vào hình. Giữ true alpha và safe margin.
Không đổi tên relic/ID/gameplay. Tạo ảnh không đồng nghĩa được sửa code.
```

## 16. Kết luận bàn giao

**Ảnh đã tạo không bị bỏ phí bởi FINAL 2.** Giữ source; 36 identity vẫn có chỗ trong kế hoạch, chỉ không phải tất cả đều dùng ngay. E01–E12 vẫn hữu ích dưới dạng thư viện source, không phải roster đã được duyệt.

**Không có ảnh mới nào là điều kiện bắt buộc để bắt đầu prototype.** Nếu muốn hoàn thiện phần thưởng/build về mặt hình ảnh, ưu tiên sáu identity relic đang có; dùng mapping và sáu prompt ở đây để lấp đúng chỗ thiếu. Không tạo mới khi source hiện có đã đáp ứng.

Tài liệu này có **6 prompt tạo bổ sung có điều kiện** và **2 prompt edit dự phòng có điều kiện**. Nó không phải yêu cầu tạo 8 ảnh ngay. Chỉ sau khi xem ảnh thật mới có thể xác nhận cuối cùng chính xác những file nào phải sửa hoặc tạo.
