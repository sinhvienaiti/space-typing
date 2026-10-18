# SPACE TYPING — EXPANSION V2 FINAL 2

## Bản thiết kế hợp nhất V2.1: chiều sâu gameplay, chơi lại và mở rộng 1000 stage

- Ngày soạn: **2026-09-30**.
- Deliverable: tài liệu thiết kế và kế hoạch nghiệm thu; **không phải mã đã triển khai**.
- Trạng thái: **bản đề xuất hợp nhất để chủ dự án duyệt và giao từng phase**. “FINAL 2” là tên phiên bản tài liệu, không có nghĩa gameplay đã qua playtest hay được phép tự động triển khai toàn bộ.
- Baseline đối chiếu: repository `games/space-typing`, HEAD `996be26d92f416c33bce038b9a340b0e73074035`. Working tree có thay đổi local; cần kiểm tra lại trước khi code.
- Ngôn ngữ: tiếng Việt; giữ tên hệ thống/ID tiếng Anh để thuận tiện giao AI lập trình.

### Nguồn hợp nhất và quyền ưu tiên

1. Bản gốc [EXPANSION V2 FINAL](../../../docs/SPACE_TYPING_1000_STAGE_EXPANSION_V2_FINAL.md).
2. [Review V2 ngày 2026-09-30](EXPANSION_V2_DESIGN_REVIEW_2026-09-30.md).
3. [Image Prompt Pack V2](SPACE_TYPING_1000_STAGE_EXPANSION_V2_IMAGE_PROMPT_PACK.md).
4. Code được đối chiếu có mục tiêu trong review, không phải một lần audit lại toàn repository.

Tài liệu này được viết để đọc độc lập khi giao việc. Không sao chép lại 58 prompt ảnh; thư viện prompt gốc vẫn được dùng, với scope/batch/manifest mới ở §20. Không sửa hay xóa các tài liệu nguồn.

Nếu chủ dự án chọn FINAL 2 làm kế hoạch triển khai, thứ tự ưu tiên là: yêu cầu mới nhất của chủ dự án → hợp đồng thiết kế trong FINAL 2 → manifest asset đã duyệt → prompt ảnh → tài liệu V2 cũ. Code mới hơn là bằng chứng cần đối chiếu, không được tự ghi đè hoặc âm thầm đổi thiết kế để khớp một giả định cũ.

### Nhãn quyết định

- **[RULE]**: ràng buộc bắt buộc nếu triển khai theo bản này.
- **[DEFAULT]**: phương án thiết kế được đề xuất chọn làm mặc định; thay đổi cần ghi rõ lý do.
- **[TUNE]**: thông số ban đầu để thử, không phải số đã được chứng minh cân bằng.
- **[GATE]**: điều kiện phải đạt trước khi mở rộng phase.
- **[LATER]**: giữ trong tầm nhìn, không thuộc prototype.

Các nhãn không thay thế sự cho phép triển khai của chủ dự án. Không tự pull, sửa code, tạo ảnh, commit hoặc push chỉ vì tài liệu có checklist triển khai.

## Mục lục

1. Mục tiêu và định nghĩa thành công
2. Quyết định thay đổi so với V2
3. Nguyên tắc, thuật ngữ và phạm vi
4. Vai trò Campaign, Expedition và Learning
5. Expedition: hợp đồng một lượt chơi
6. Lượt mẫu và Macro Pacing
7. Typing Patterns và input contract
8. Encounter Recipes
9. Sector Conditions
10. Elite Affixes
11. Build, relic, synergy và lựa chọn thưởng
12. Flow, Rage và progression
13. Threat, compatibility và workload
14. Boss Mechanics 2.0
15. Route events và ý tưởng mở rộng
16. Learning, Codex, Nemesis và Ghost
17. Kiến trúc, combat events và determinism
18. Persistence, migration và rollback
19. UX, audio và performance
20. Art production và prompt-pack override
21. Campaign 1000 stage
22. Roadmap theo cổng kiểm chứng
23. Test Lab, regression và playtest
24. Rủi ro, quyết định còn mở và Definition of Done
25. Handoff cho AI triển khai
26. Ma trận truy vết review

Cuối tài liệu có phụ lục A–C: ví dụ input/reward/save có expected outcome, checklist phiên triển khai đầu và cách cập nhật hợp đồng khi giả định sai.

## 1. Mục tiêu và định nghĩa thành công

Mục tiêu không phải “thêm thật nhiều quái và màn”. Mục tiêu là:

> Người chơi gặp một tình huống quen nhưng có nhiều cách xử lý; lựa chọn trước đó làm cách xử lý thay đổi; sau một lượt họ biết mình muốn thử gì tiếp theo.

Bốn trụ cột giữ từ V2:

1. **Typing Mastery:** chính xác, nhịp gõ, đọc tình huống, ưu tiên mục tiêu và tiến bộ cá nhân.
2. **Buildcraft:** các lựa chọn tạo lối chơi khác nhau, không chỉ cộng nhiều phần trăm hơn.
3. **Encounter Variety:** recipe, pattern, điều kiện và mục tiêu phối hợp có chủ đích.
4. **Long-Term Surprise:** World, boss, sự kiện, khám phá và tiến bộ học tập có điểm nhấn.

Art, âm thanh và cinematic hỗ trợ bốn trụ cột, không thay thế chúng.

### 1.1 Ba tầng chiều sâu

| Tầng | Quyết định người chơi | Dấu hiệu thiết kế đạt |
|---|---|---|
| Trong vài giây | Gõ mục tiêu nào trước? Hoàn thành ngay hay tận dụng một cửa sổ? | Có ít nhất hai lựa chọn hợp lý tùy trạng thái, chữ luôn rõ |
| Trong một lượt | Chọn relic, đường đi, đổi build hay giữ tài nguyên? | Những lựa chọn làm đổi thứ tự mục tiêu hoặc cách phân bổ rủi ro |
| Qua nhiều phiên | Thử build/World nào, luyện điểm yếu nào, hoàn thành khám phá nào? | Người chơi có mục tiêu tự chọn, không chỉ bị kéo bằng chỉ số sức mạnh |

[GATE] Nếu hai build chỉ khác màu đạn/DPS nhưng cùng một hành vi tối ưu trong mọi cảnh, chưa đạt chiều sâu build.

[RULE] Không cam kết “chơi mãi không chán” hoặc tăng retention khi chưa có dữ liệu. Playtest ban đầu tìm lỗi thiết kế, không chứng minh thống kê về thị trường.

## 2. Quyết định thay đổi so với V2

| V2 trước | FINAL 2 |
|---|---|
| Variety expansion trước build; Expedition ở Phase 4 | Một lượt nhỏ có choice + pacing + replay được thử trước khi nhân rộng nội dung |
| Khoảng 20 encounter mặc định | Prototype 8 encounter; mục tiêu thời lượng phải được đo trước khi nâng 10/20 |
| Choose-1-of-3 giới thiệu ở stage 101–250 | Agency cơ bản trong phiên đầu; không đợi hàng trăm stage |
| Full trigger migration 0B–0D trước vertical slice | Chỉ migrate event cần cho slice, giữ đường mở rộng; test behavior parity bắt buộc |
| Phrase/sentence chưa chọn chính sách input | Bản đầu chỉ gõ chữ a–z; giữ Space cho Rage; literal typing là feature riêng về sau |
| Flow có một bonus chưa định nghĩa | Prototype Flow chỉ biểu diễn streak/audio; chưa thêm nguồn sức mạnh mới |
| 12 relic theo 4 family | Mục tiêu mở rộng vẫn khoảng 12 tổng; không ép chia đều hoặc tạo đủ trước playtest |
| Learning/UI sâu ở cuối | Ghi bằng chứng học đúng từ đầu; thử loop nhỏ sớm, constellation lớn làm sau |
| Art Batch 1 gồm gần toàn bộ bộ điều kiện/affix/pattern | Chỉ làm asset đã có consumer trong slice; placeholder được phép |
| Variety audit có thể fail chỉ vì lặp pattern | Tách lỗi tổ hợp bất công khỏi cảnh báo lặp; cho phép luyện tập/callback có chủ đích |
| Save “reset as designed” | Quy định rõ dữ liệu run-local, profile, reward commit, reload và invalidation |

## 3. Nguyên tắc, thuật ngữ và phạm vi

### 3.1 Những điều không thương lượng

- [RULE] Gõ chữ vẫn là tương tác chiến đấu chính. Không biến game thành né đạn/action yêu cầu chuột liên tục.
- [RULE] Một trạng thái có một chủ sở hữu; ưu tiên mở rộng module hiện có.
- [RULE] Không thêm target manager riêng cho boss parts, adaptive director thứ hai, cây evolution thứ hai hoặc Archive song song Codex.
- [RULE] Không dùng chữ nhấp nháy, bị đảo/ngược/gương, bị che bắt buộc để tạo độ khó thông thường.
- [RULE] Low/Medium/High/Ultra không đổi damage, từ cần gõ, target, cooldown, AI, spawn hoặc RNG gameplay.
- [RULE] Tín hiệu cần để đối phó phải có ở mọi quality; audio không là kênh duy nhất.
- [RULE] Không dùng WPM tuyệt đối làm cửa khóa build. Ngưỡng thời gian cần dựa trên ngữ cảnh và profile người chơi.
- [RULE] Không đổi hàng loạt cấu trúc thư mục để giống một sơ đồ đề xuất.
- [RULE] Mỗi hệ thống mới phải có off-switch trong quá trình rollout và đường xử lý save khi bị tắt.

### 3.2 Thuật ngữ canonical

| Tên | Ý nghĩa và owner hướng tới |
|---|---|
| Sector Condition | Luật môi trường encounter; mở rộng stage events/hazards, không dùng lại tên Anomaly chest |
| Elite Affix | Biến thể hành vi dưới elite/enemy hiện có |
| Typing Pattern | Cấu trúc yêu cầu gõ của một target/group/phase |
| Encounter Recipe | Bộ cấu hình có ràng buộc để tạo một kiểu quyết định chiến đấu |
| Macro Pacing | Nhịp qua nhiều encounter/stage; bổ sung, không thay stage pacing nội bộ |
| Flow | Biểu diễn mức duy trì streak/combo, không phải Rage/Overdrive mới |
| Threat | Áp lực có giới hạn từ difficulty/adaptive/active-pressure hiện hữu |
| Rage Awakening | Lớp trình bày mở rộng cho ultimate Rage |
| Expedition | Lượt chơi lại hữu hạn, dùng production combat nhưng có run state riêng |
| Wanted Word | Mục tiêu ôn từ được chọn có kiểm soát, không phải hình phạt |
| Lexicon Boss | Encounter học tập có nhịp boss, không phải đống từ yếu dồn bất công |

### 3.3 Code hiện có cần reuse

Module tham chiếu: `events/stage-scheduler.ts`, `events/galaxy-hazards.ts`, `enemies/elite.ts`, `enemies/threat.ts`, `campaign/active-pressure.ts`, `campaign/adaptive-profile.ts`, `campaign/stage-pacing.ts`, `events/reward-choice.ts`, `relics/registry.ts`, `relics/state.ts`, `synergy/build.ts`, `boss/typing-mechanics.ts`, `recall/model.ts`, `learning/shared.ts`, `codex/state.ts`, persistence modules, background và audio controllers.

Tên/path là điểm bắt đầu kiểm tra, không đảm bảo mọi interface vẫn giữ nguyên ở branch tương lai. Không coi phần chưa triển khai trong tài liệu này là bug của game hiện tại.

## 4. Vai trò Campaign, Expedition và Learning

| Mode | Vai trò | Sức mạnh và nội dung | So sánh thành tích |
|---|---|---|---|
| Campaign | Hành trình, mở World, dạy mechanic, progression dài hạn | Giữ hệ thống trang bị/progression hiện hành; thay đổi có migration riêng | Theo stage/difficulty hiện hành |
| Expedition thử nghiệm | Chứng minh vòng chơi lại và build | Start kit chuẩn hóa, relic tạm theo lượt, content allowlist | PB nội bộ cùng preset/version |
| Personal Learning Expedition [LATER] | Ôn tập với variety và mục tiêu cá nhân | Pool từ cá nhân hóa, pressure phù hợp Recall | Không xếp chung với fixed challenge |
| Fixed/Daily Challenge [LATER] | Cùng điều kiện để thử chiến thuật/thành tích | Khóa rules, pool, loadout, assist, seed và adaptive policy | Theo đúng challenge identity |

[DEFAULT] Bản thử dùng một start kit được cho mượn, không đọc sức mạnh enhancement/ascension của campaign vào trận. Thông báo rõ đây là cấu hình thử chuẩn hóa; không xóa, unequip hoặc ghi đè gear thật.

[DEFAULT] Khi mở rộng Personal Expedition, cho chọn các tàu đã mở với cấu hình chuẩn hóa theo preset. Khả năng mang nguyên campaign loadout vào một mode tự do có thể đánh giá sau, không lẫn bảng điểm chuẩn.

[RULE] Một production combat engine, nhiều cấu hình khởi tạo; không copy `Game` thành bản Expedition riêng.

## 5. Expedition: hợp đồng một lượt chơi

### 5.1 Cấu hình prototype

| Thành phần | Mặc định đề xuất |
|---|---|
| Độ dài | [TUNE] 8 encounter, mục tiêu 12–20 phút tính cả lựa chọn ngắn; không ép bằng tăng tốc địch |
| World | Một World có art ổn định, không chờ asset mới |
| Start kit | [DEFAULT] Vanguard hoặc tàu starter tương đương sau đối chiếu; stat/skill/hotbar snapshot chuẩn hóa, công khai |
| Relic | 0 relic khi vào màn setup; draft trước encounter 1; tối đa 3 equipped như nền hiện có |
| Draft | 4 lần tổng: trước encounter 1, sau 2, sau 4, sau 6 |
| Pacing | 3 recipe; một condition sau khi học luật; một boss hiện có ở cuối |
| Target pattern | NORMAL_WORD, SHORT_BURST với từ ngắn hợp lệ, LONG_WORD |
| Choice | Dừng simulation, trạng thái vào/ra modal được quản lý rõ |
| Reward ngoài lượt | Prototype chỉ run record/PB và bằng chứng học hợp lệ; không thêm campaign currency/gear |
| Pause/resume | Pause trong trận; durable resume ở safe boundary, không hứa khôi phục chính xác giữa một từ |
| Content lock | Frozen allowlist + ruleset version khi bắt đầu; không thay pool giữa lượt |

Đây là preset thử nghiệm, không thay độ dài stage campaign. Nếu 8 encounter vẫn dài, giảm workload/budget encounter, không bỏ phần nghỉ/chọn để chạy đủ số lượng.

### 5.2 State machine

```text
SETUP → DRAFT → ENCOUNTER → SETTLEMENT → DRAFT / REST / NEXT
                          ↘ DEFEAT → FINAL SUMMARY
                                         ↑
                   FINAL BOSS CLEAR → VICTORY

PAUSE: đóng băng combat clock, có thể trở lại ENCOUNTER
ABANDON: xác nhận → terminal record → bỏ run-local state
RELOAD: khôi phục safe boundary; interrupted encounter chơi lại từ đầu
```

- SETUP: chọn seed/preset, xác nhận start kit và chính sách reset.
- DRAFT: hiện offer đã materialize; lựa chọn xác nhận một lần, không auto-pick do timeout.
- ENCOUNTER: combat mutations chỉ nằm trong run; không ghi campaign progression.
- SETTLEMENT: tổng kết encounter và commit safe snapshot; transition chỉ tiến khi write thành công hoặc người chơi chọn kết thúc phiên không lưu với cảnh báo.
- FINAL SUMMARY: snapshot bất biến của kết quả; nút xem build, chơi lại seed/preset, lượt mới và trở về.

### 5.3 Thành công, thất bại và retry

- Victory khi hoàn thành boss cuối theo production clear gate; không kết thúc chỉ vì timer hết trong khi còn mục tiêu bắt buộc.
- Defeat dùng luật chết hiện hành của start kit; không cho death-protection campaign tiêu hao tài nguyên thật.
- Abandon không đổi stage campaign, không cấp clear reward; giữ kết quả encounter đã commit như bằng chứng luyện tập nếu có.
- Reload giữa encounter quay về snapshot đầu encounter với cùng offer/seed/config đã chốt. Đánh dấu `interrupted/retried` để không lẫn PB clean-run.
- Sau khi commit terminal defeat, không dùng checkpoint cũ tự hồi sinh lượt thành scored run. Có thể cung cấp practice replay riêng.
- Local-only không chống gian lận tuyệt đối; không tuyên bố đây là bảng điểm bảo mật.

### 5.4 Định danh và điểm prototype

Run identity gồm: `runId`, seed, ruleset/content versions, mode, difficulty, assist, start-kit ID, word-pool hash, profile snapshot, route/offer history. `runId` khác seed: cùng seed chơi hai lần là hai lượt khác nhau.

[DEFAULT] PB ưu tiên thứ tự: số encounter hoàn thành → score chuẩn hóa → accuracy; active time là thông tin, không ép thưởng gõ nhanh tuyệt đối ở prototype.

[TUNE] Score thử nghiệm trên mỗi encounter clear:

```text
baseClear = 100
accuracyBonus = round(50 × correctAcceptedLetters / acceptedLetterAttempts)
optionalObjectiveBonus = 0 hoặc 25 theo objective đã công bố
```

- Không có accepted attempts thì accuracyBonus = 0, không chia cho 0.
- Mỗi encounter tính tối đa một lần; bỏ qua points do spawn vô hạn, kill proc hoặc repeatedly farming một target.
- Gameplay score hiện hành vẫn có thể hiển thị cho feedback nhưng không tự trở thành Expedition comparison score.
- Offer RNG khác lựa chọn có thể dẫn tới score khác, đó là chiến thuật hợp lệ; thay config/version phải tạo bảng PB khác.
- Không bonus vì không nghỉ; pause không được tạo lợi thế farm timer/regen ngoài luật hiện hành.

## 6. Lượt mẫu và Macro Pacing

### 6.1 Kịch bản 8 encounter

| Vị trí | Nhịp | Nội dung | Quyết định/học được |
|---|---|---|---|
| Trước 1 | Setup | Choose 1 of 3 + giải thích tác dụng | Chọn hướng thử, thấy tác dụng sớm |
| 1 | Làm quen | Normal recipe, ít đích | Học từ/cue và kiểm tra độ dễ đọc |
| 2 | Bùng nhịp ngắn | Swarm Assault | Nối mục tiêu ngắn hay xử lý đích nguy hiểm trước; draft sau clear |
| 3 | Tập trung | Sniper Ambush, không condition | Cam kết từ dài trong cửa sổ báo trước |
| 4 | Hồi nhịp | Normal có một cơ hội bonus dễ hiểu | Tránh mọi encounter đều căng; draft + rest sau clear |
| 5 | Quyết định cấu trúc | Fortress Siege | Support trước hay đích chính, reward không thiên về một đáp án cố định |
| 6 | Một biến đổi | Recipe đã biết + Solar Storm | Học condition trên nền quen; draft sau clear |
| 7 | Callback/prelude | Biến thể nhẹ của recipe 2 hoặc 5 | Nhìn thấy build trưởng thành xử lý khác lần đầu |
| 8 | Kết thúc | Boss cũ với cơ chế đã có | Vận dụng build; không bắt đợi Boss Parts 2.0 |

[RULE] Bảng này là kịch bản tham chiếu dùng production rules, không phải test giả riêng cho demo. Không xếp cả affix mới + condition mới + pattern mới trong một encounter giới thiệu.

### 6.2 Rest và đổi hướng

[DEFAULT] Sau encounter 4 chọn một trong hai: hồi phục theo mức preset hoặc salvage một relic. Không thêm tiền tệ mới; lựa chọn này là chi phí cơ hội.

Salvage: chọn relic đang equipped → xem tối đa 3 replacement hợp lệ đã seed → xác nhận đổi hoặc giữ nguyên. Tối đa một salvage/lượt trong prototype. Dismantle không cấp campaign currency, không reroll vô hạn bằng reload.

### 6.3 Nhịp dài hạn

Macro Pacing cung cấp slot intent: giới thiệu, luyện, áp lực, thưởng, hồi phục, callback, climax. Existing stage-pacing vẫn quyết định wave bên trong slot.

- [TUNE] Không quá 2 encounter high-complexity liên tiếp trong lượt thử.
- Sau một mechanic mới cần khoảng luyện lại hoặc biến thể nhỏ, không bắt đổi pattern để tăng entropy.
- Recovery có workload thấp hơn, không chỉ đổi tên rồi spawn như cũ.
- Milestone/boss có quyền override cadence nhưng phải giải thích trong authored plan.
- Campaign dùng arc khoảng 5–10 stage, không bắt sao chép nguyên lượt Expedition.

## 7. Typing Patterns và input contract

### 7.1 Hợp đồng input bản đầu

[DEFAULT] Giữ tương thích với engine hiện tại:

- Chỉ a–z là ký tự phải gõ; normalize lowercase theo đường xử lý hiện hành.
- Space vẫn kích hoạt Rage/Overdrive, Escape vẫn pause theo context. Không âm thầm đổi phím.
- Phrase hiển thị đúng khoảng trắng/dấu câu, nhưng tiến độ bám vào chữ phải gõ; tooltip lần đầu: “Chỉ gõ chữ; bỏ qua dấu cách và dấu câu”.
- Giữ hành vi Backspace hiện có; không thêm cơ chế sửa sai mới trong phase pattern mà chưa kiểm tra ảnh hưởng perfect/streak. “Word missed” không được xóa chỉ vì sửa lại chữ.
- Khi input đang ở UI field/modal, không gửi sang combat. IME composition, repeat và key routing phải được kiểm thử với policy hiện hữu; không tự đổi scoring của campaign.
- Literal phrase typing có Space/punctuation là [LATER], cần remap Rage, nhập liệu, tutorial, dữ liệu và migration controls riêng.

### 7.2 Quy tắc target chung

- Một owner quyết định target; pattern/parts không thêm bộ chọn riêng.
- Target đã khóa không đổi chỉ vì đối tượng khác xuất hiện hoặc di chuyển.
- Với nhiều target chung prefix: ưu tiên theo policy hiện hành; trước boss-parts phase phải viết rõ tie-break ổn định và cue thể hiện target sẽ được nhận. Không resolve theo render order ngẫu nhiên.
- Target bị hạ bởi proc trước chữ tiếp theo: release lock an toàn, không gán sai chữ đã gõ sang target mới.
- Progress của target giữ theo luật engine; không reset khi Phase đổi vị trí.
- Group/part chuyển phase phải xác định chữ đang gõ còn hợp lệ hay bị kết thúc bởi authored transition; không để token mồ côi.

### 7.3 Pattern definitions

| Pattern | Luật gõ và tác dụng | Reward/edge case | Phase |
|---|---|---|---|
| NORMAL_WORD | Một word target theo pipeline hiện tại | Là baseline regression | Slice |
| SHORT_BURST | Nhiều target ngắn nối tiếp, [TUNE] từ 2–4 chữ có nghĩa, không random alphabet swarm | Giới hạn density; áp short-word proc policy; từ 1 chữ chỉ khi dataset/lesson cho phép, không mặc định | Slice |
| LONG_WORD | Một word dài hợp pool, [TUNE] 8+ chữ, có deadline tương xứng | Ít đích đồng thời; reward bù commitment; thiếu pool thì fallback hợp lệ | Slice |
| PHRASE | Collocation thật, typed sequence nối chữ của phrase | Một phrase attempt; không chia phần thưởng thành N từ chỉ để farm | Sau slice |
| SHARED_TARGET | Một typing token đại diện formation liên kết | Một typed completion, nhiều kill facts nếu thực sự hạ; không giả là đã gõ mọi từ của nhóm | Sau slice |
| CHAIN | Hoàn thành target mở/tăng lợi thế cho target tiếp theo | Mỗi word thật gõ có credit riêng; hỏng chain mất bonus, không auto-death | Sau slice |
| RECALL_WORD | Prompt từ hệ thống Recall, cue và thời gian nhớ hợp lý | Perfect motor input và recall success là hai trường khác nhau | Learning slice |
| BOSS_SENTENCE | Câu ngắn curated, chia phase rõ, dùng policy chữ-only ở bản đầu | Timeout làm mất cơ hội/nhận hậu quả có giới hạn; không chết tức thì vì dataset dài | Boss expansion |

### 7.4 Dataset và fallback

- Mỗi pattern khai báo yêu cầu dữ liệu: độ dài typed, display text, ngôn ngữ, mode, tags đã xác thực.
- Không dùng nối từ ngẫu nhiên để giả phrase/sentence. Không giả định mọi từ có POS đáng tin.
- Pool chuẩn hóa không rỗng, không có typed string rỗng, không collision không giải quyết được ở target bắt buộc.
- Thiếu candidate: chọn fallback đã khai báo cùng scope difficulty; nếu không có, thay slot bằng NORMAL_WORD recipe an toàn và ghi diagnostic.
- Fixed Challenge có manifest pool bất biến; nếu thiếu dữ liệu chuẩn, không ghi kết quả vào cùng bảng chuẩn.
- Sentence/phrase được tính workload theo typed chars + buffer nhận diện, không theo độ dài chuỗi hiển thị gồm punctuation.

## 8. Encounter Recipes

Recipe không phải hệ thống combat mới. Nó resolve configuration qua scheduler/spawn/profile hiện hữu.

### 8.1 Contract tối thiểu

Mỗi recipe có: canonical ID, quyết định muốn tạo, roles, pattern pool, min/max workload, target/concurrency cap, allowed conditions/affixes, forbidden combinations, objective, reward profile, fallback, World/stage/mode constraints, recent-history cooldown, Test Lab seed.

### 8.2 Danh mục và hành vi

| Recipe | Quyết định trọng tâm | Điều kiện để không thành “đổi skin” |
|---|---|---|
| Swarm Assault | Xử lý chuỗi nhanh để kiểm soát số lượng hoặc ưu tiên một đích nguy hiểm | SHORT_BURST có cap; không trộn summoner nhân đàn ở bản đầu; chống perfect-proc farming |
| Sniper Ambush | Cam kết một từ dài hay dọn đích phụ trước khi charge hết | Ít mục tiêu, telegraph rõ, deadline theo workload; không thêm Chrono khi giới thiệu |
| Fortress Siege | Phá support để bỏ bảo vệ hay chấp nhận xử lý trực tiếp | Protection bounded; không tạo vòng support bảo vệ nhau vô tận; dùng behavior hiện hữu nếu đã có |
| Escort Break | Chọn mắt xích để làm yếu đội hình | Link visible; clear không đòi một escort đã biến mất; không chặn bằng animation |
| Elite Hunt | Chọn lúc tập trung elite giữa các đích khác | Elite có vai trò thực, normal enemies không chỉ là spam không giới hạn |
| Recall Rupture | Cân nhắc hoàn thành prompt nhớ với xử lý áp lực | Mode hợp lệ, thời gian đọc được bảo vệ; không ghép Chrono/obscure |
| Boss Prelude | Chuẩn bị, nhận biết cơ chế boss sắp tới | Không thêm mechanic mới chưa giải thích ngay trước climax |

[RULE] Ba recipe đầu đủ cho slice. Bốn recipe sau có thể được lưu trong design registry nhưng chưa cần code/art.

### 8.3 Mẫu thẻ gameplay phải điền trước implementation

```text
ID / phiên bản:
Người chơi nhìn thấy gì:
Hai hành động hợp lý và chi phí cơ hội:
Trigger / thời điểm hiệu lực / clock:
Outcome / reward unit:
Counterplay:
Timeout / target mất / không có từ phù hợp:
Tổ hợp cấm / workload cost:
UI cue ở mọi quality / audio khi mute:
Pause / reload / cleanup:
Test Lab preset / acceptance:
```

## 9. Sector Conditions

[RULE] Mở rộng stage events/hazards hiện hành. Condition gameplay không được phụ thuộc việc texture nền tải thành công. Có off-switch; disable trong QA không được tính như cùng challenge preset.

### 9.1 Solar Storm — condition đầu tiên đề xuất

- **Tín hiệu:** indicator nhỏ báo pulse sắp đến, không phủ trắng vùng chữ.
- **Luật [DEFAULT]:** cửa sổ pulse thưởng thêm một lượng energy giới hạn cho typed perfect completion đủ điều kiện. Ngoài cửa sổ vẫn đánh bình thường, không bị penalty chỉ vì bỏ lỡ.
- **Đề xuất đầu [TUNE]:** chu kỳ 12 giây active combat, cue trước 2 giây, cửa sổ 4 giây; tối đa một bonus/pulse. Energy amount phải chốt theo start-kit economy trong phase test.
- **Quyết định:** kết thúc ngay để an toàn hay canh một completion gần cửa sổ để lấy energy; không ép phải đứng chờ mới qua màn.
- **Chống exploit:** chỉ direct typed completion; không proc chain; không nhiều credit từ shared-target; token quá ngắn theo §11.5 không auto-farm bonus.
- **Pause/Recall:** combat clock dừng khi pause/modal; ở encounter có reading gate bắt buộc, pulse không hết hạn chỉ vì đang đọc.
- **Giới hạn:** không tăng spawn chỉ vì player nhận energy; không ghép thêm timing condition khác trong slice.

### 9.2 Meteor Shower — sau khi loop chính ổn

- Tách meteor trang trí nền với meteor gameplay target có ID/cue rõ; meteor trang trí không gây damage.
- [DEFAULT] Gameplay meteor là mục tiêu thưởng tùy chọn dùng typing pipeline hiện hữu, không phải yêu cầu né bằng chuột.
- Chọn chuyển mục tiêu để lấy bonus hoặc giữ ưu tiên địch; bỏ qua không chặn clear, không gây mất mạng bất ngờ.
- [TUNE] Tối đa một meteor target tùy chọn cùng lúc; consume cả entity cap và workload budget.
- Khi hết hạn, target cleanup/release lock an toàn; không đánh chữ tiếp theo thành lỗi lên một target đã mất trong cùng transition.
- Reward lấy từ bảng encounter đã cap, không thêm currency mới hoặc spawn farm không giới hạn.

### 9.3 Gravity Well — sau slice

- Dùng visual Singularity/black-hole resource có sẵn nhưng gameplay ownership ở combat.
- [DEFAULT] Pull làm đổi vị trí nhóm địch nhẹ trong giới hạn, tạo cơ hội chain/AoE; không kéo text khỏi safe area hoặc đột ngột rút ngắn deadline không báo.
- Anchored cung cấp counter-identity bằng giảm pull, không vô hiệu hóa mọi cách gây damage.
- Không giật target lock; label layout chống chồng chữ. Nếu layout không giải quyết được, giảm effect hoặc không spawn tổ hợp đó.
- Boss/sentence phase không tự áp pull nếu chưa có authored compatibility.

### 9.4 Time Fracture — sau slice, cần đo kỹ

- [DEFAULT] Vùng/thời kỳ nhanh-chậm tác động chuyển động địch theo cue; không thay tốc độ input, key repeat, đồng hồ ghi accuracy hoặc ngầm thay cooldown người chơi.
- Deadline được tính theo motion đã áp dụng; đổi trạng thái phải có transition/grace.
- Chọn ưu tiên địch đang vào fast zone thay vì luôn địch gần nhất.
- Ban đầu cấm ghép Chrono, Sniper charge sát deadline, Recall bắt buộc hoặc boss sentence.
- Nếu không giải thích được luật trong một câu và chơi thử vẫn nhầm, hoãn thay vì thêm VFX để che.

## 10. Elite Affixes

### 10.1 Nâng mức dễ nhận biết của cái có sẵn

Swift, Armored, Frenzy, Volatile giữ identity và behavior đang có. Kiểm tra code thực tế trước khi viết tooltip; không gán cơ chế mới chỉ vì prompt art mô tả đẹp. Một affix có thể cần cue procedural và mô tả Codex, không nhất thiết ảnh mới.

### 10.2 Danh mục mới có điều kiện

| Affix | Luật đề xuất | Guardrail |
|---|---|---|
| Guardian | Bảo vệ đồng đội trong phạm vi; hạ Guardian bỏ protection | Kiểm tra overlap shield/commander trước; không cyclic invulnerability; tối đa link theo budget |
| Chrono | Sau khoảng idle hợp lệ thì tăng tốc có cap và telegraph | Chỉ active input window, không lúc pause/reading/no target; ngưỡng dựa profile; cấm Recall/Time Fracture ban đầu |
| Berserker | Tăng áp lực khi tới một vùng khoảng cách đã báo | Ramp giới hạn, không teleport/instant unavoidable hit |
| Phase | Đổi làn theo cue | Giữ target/progress, không giấu chữ, không chuyển chồng label hoặc vào player tức thì |
| Anchored | Giảm tác dụng pull/stun | Không miễn damage; vẫn có giá trị cho build control; không hard-counter toàn bộ lượt |

[DEFAULT] Slice không bắt buộc affix mới. Nếu Fortress Siege dùng được protection hiện hữu thì không thêm Guardian chỉ để đủ roadmap.

[RULE] Không thêm Splitter/Leech/Cloaked/Commander/Summoner như một bộ identity song song. Dùng enemy kind/behavior tương ứng hiện hành.

[TUNE] Khi mở affix mới, bắt đầu một affix mới trên một target tại một thời điểm. Chỉ cho đa-affix sau audit pairwise, workload và UI. Champion 4 affix vẫn [LATER].

## 11. Build, relic, synergy và lựa chọn thưởng

### 11.1 Inventory bắt buộc trước khi thêm relic

Baseline có sáu relic sau. Các effect dưới đây là mô tả để map, phải xác nhận lại code mới nhất trước implementation.

| ID hiện có | Identity hiện có | Vai trò / việc cần quyết định |
|---|---|---|
| `first-light-seed` | Hồi Hull ở từ combat đầu mỗi stage | Sustain chung; trong Expedition phải định nghĩa rõ stage tương ứng encounter, tránh heal khi mở modal |
| `storm-script` | Perfect words chain sang normal enemies | Precision/chain; test short-word và proc-source |
| `frost-rhythm` | Streak kích hoạt freeze | Combo/control; giữ đơn vị streak theo code, không tự coi là số từ |
| `giant-word-lens` | Bonus boss word dài | Long Word nhưng hiện chỉ boss; nếu dùng làm build cả lượt cần thử mở scope theo quy trình bên dưới |
| `mirror-vow` | Bảo vệ mistake bằng Shield, giới hạn mỗi stage | Protection/sustain; không xóa raw error khỏi dữ liệu học |
| `cosmic-conductor` | Bổ sung chain và bonus từ boss dài | Hybrid; kiểm tra stacking với Storm/Lens, không luôn tốt hơn mọi lựa chọn |

[RULE] Giữ ID và ownership trong save cũ. Không đổi tên/ghi đè registry identity theo tên một prompt ảnh.

[DEFAULT] Prototype dùng allowlist của sáu relic sẵn có, override unlock **chỉ trong preset thử**, không cấp ownership campaign. Không yêu cầu tạo sáu món mới để hoàn thành demo.

[GATE] Chưa được gọi đây là hai build hoàn chỉnh nếu một nhánh chỉ có tác dụng ở boss cuối. Nếu cần, tạo **một thí nghiệm có feature flag**: Giant Word Lens tác dụng lên typed long-word target hợp lệ trong Expedition, giữ behavior campaign nguyên trạng. Ghi effect profile vào ruleset/UI; không lặng lẽ sửa mô tả hoặc balance toàn game. Nếu thử vẫn không đổi cách chơi, điều chỉnh một effect có chủ đích trước khi tăng roster.

### 11.2 Build family là hành vi, không phải nhãn màu

| Family | Hành vi muốn khuyến khích | Chi phí cơ hội cần có |
|---|---|---|
| Precision | Tập trung completion sạch vào đích giá trị cao để tạo lợi thế có kiểm soát | Không luôn dọn swarm nhanh nhất; không mất toàn bộ build vì một typo |
| Combo | Chọn chuỗi mục tiêu để giữ momentum/control | Có lúc phải bỏ chuỗi đẹp để xử lý đích nguy hiểm |
| Long Word | Chấp nhận commitment dài để có payoff mạnh | Đổi lấy khả năng phản ứng chậm hơn trước nhiều đích ngắn |
| Recall | Tận dụng cơ hội retrieval thật trong mode có hỗ trợ | Cần thời gian suy nghĩ; không dùng thành hình phạt hoặc offer chết trong normal mode |

Một relic có thể thuộc nhiều family; relic sustain chung không bắt buộc bị ép vào Precision. Mục tiêu mở rộng là khoảng 12 tổng, không bắt buộc 3 × 4 chính xác.

### 11.3 Cách mở roster lên 12 mà không bịa trùng cơ chế

1. Liệt kê effect hiện tại của relic, ship passive, perk và synergy vào một bảng trigger → outcome.
2. Đánh dấu effect trùng hoặc chỉ khác tỷ lệ.
3. Giữ identity đang phục vụ tốt gameplay; ưu tiên sửa cách nhận/giải thích thay vì viết bản sao.
4. Xác định tối đa sáu **khoảng trống hành vi**, chưa phải sáu relic được duyệt: target focus; handoff control; long-word defense; long-word spillover; Recall recovery; Recall-to-combat payoff.
5. Với mỗi khoảng trống, trả lời: vì sao effect sẵn có không đáp ứng, người chơi đổi quyết định gì, trigger có bị short-word exploit không, nó mất giá trị khi nào.
6. Viết card theo mẫu bên dưới; review tương tác trên pool nhỏ.
7. Chỉ sau đó cấp canonical ID, tên, art filename và thêm registry. Nếu chỉ tìm được 9 món có ý nghĩa, không bịa thêm 3 để đủ số.

```text
Relic card:
ID / existing-or-new / retained-save-ID:
Mô tả người chơi, không ẩn điều kiện quan trọng:
Family / mode eligibility / opportunity guaranteed:
Trigger / origin allowlist / target allowlist:
Value / cap / cooldown / reset boundary:
Stacking / priority / competing effects:
Chi phí cơ hội / trường hợp không nên chọn:
Known synergies / no-recursion rule:
Test examples / expected totals:
Canonical art mapping:
```

### 11.4 Offer và replacement policy

- Tạo offer từ pool đã unlock/cho mượn trong mode, chưa owned/equipped theo policy lượt; không đưa ba bản cùng một ID.
- Tối thiểu một option dùng được ngay trong các encounter còn lại; không offer Recall nếu không có Recall opportunity đã xác nhận.
- Ưu tiên một option phù hợp build, một sidegrade, một support/pivot; đây là heuristic, không ép family nếu pool không đủ.
- Hiện effect, trigger, cap, điều kiện và interaction liên quan. Có thể giấu tên “synergy discovered”, không giấu tác dụng cơ bản.
- Đủ slot: chọn món mới → xem compare → chọn slot thay → confirm. Cancel không reroll offer; state đổi một lần sau confirm.
- Món bị thay rời loadout và được đánh dấu đã bỏ trong run history; không tự đưa lại vào pool cùng lượt. Không tạo kho relic vô hạn ngầm.
- Pool dưới 3 hợp lệ: hiển thị số còn lại và option “giữ build/nhận hồi phục giới hạn” nếu preset có định nghĩa; tuyệt đối không loop tìm mãi hoặc clone item. Không ghi “3 lựa chọn” nếu chỉ có 2.
- Prototype không có paid reroll. Reroll về sau có quota, lưu draw counter và offer đã chốt; reload không nhận miễn phí.
- Click hai lần, Enter lặp hoặc callback modal cũ không được cấp reward hai lần.
- Simulation/audio combat cần pause đồng bộ khi draft; một hook pause không có quyền tự resume nếu modal khác còn mở.

### 11.5 Đơn vị reward và chống farm

Tách ba lớp:

1. **Typed attempt/completion:** một token thật được người chơi gõ xong.
2. **Combat outcome:** damage, layer break, kill, interrupt; có thể nhiều outcome từ một completion.
3. **Learning evidence:** điều gì người chơi thật sự gõ/nhớ; không suy ra từ mọi enemy kill.

[DEFAULT] Prototype áp coefficient cho **các bonus per-word mới hoặc được migrate trong preset**, không tự đổi mọi passive campaign:

```text
effortWeight = min(1, acceptedTypedLetterCount / 5)
```

Đây là [TUNE], không tuyên bố tối ưu. Chỉ accepted correct letters của token, không tăng coefficient bằng cố ý gõ sai. Với bonus integer/charge, dùng accumulator/cooldown có cap, không làm tròn từng token khiến mất toàn bộ reward của người gõ từ ngắn.

- Baseline damage, per-letter score, streak hiện hành không bị nhân lại một cách mù quáng.
- Bonus “long word” có contract riêng, không nhân lặp cả length multiplier và effortWeight vượt 1.
- Storm/proc-kill không được gọi lại `WORD_COMPLETED` như người chơi vừa gõ thêm từ.
- Shared Target: một completionId, một eligibility check và một learning event; kill count có thể >1 nhưng loot/objective theo group policy đã chốt.
- Boss parts có kill semantics riêng ở §14; không tự nhận normal loot/kill proc.
- Raw typo được ghi dù Mirror Vow bảo vệ streak; motor accuracy không được tô đẹp nhờ gear.
- Test đối chiếu cùng 40 typed letters thành 20 từ 2 chữ, 8 từ 5 chữ và 4 từ 10 chữ: giải thích chênh lệch reward; không bắt buộc bằng tuyệt đối nhưng không chấp nhận lợi thế vô hạn từ số completion.

### 11.6 Synergy

- Reuse `synergy/build.ts` và existing triggers; không thêm registry song song chỉ để dùng tên mới.
- Mỗi synergy phải mô tả input cần thiết, outcome, cap, thứ tự với passive/relic/perk.
- Tác dụng xảy ra được ghi ngắn gọn trong summary: số lần proc, damage/control/defense đóng góp, không spam popup mỗi phím.
- Discovery chỉ là presentation/meta record, không điều kiện bí mật làm cùng loadout có hai kết quả không giải thích được.
- Bắt đầu 1–2 interaction có thể quan sát trong slice; mục tiêu 3–4 synergy khi roster 12 ổn, không build toàn bộ cross-product.

## 12. Flow, Rage và progression

### 12.1 Flow

[DEFAULT] Slice dùng NORMAL/FOCUS/FLOW/HYPER derived từ streak/combo hiện hữu. Threshold lấy nguồn duy nhất, được test boundary; không có meter độc lập tích và tiêu riêng.

- Flow đổi aura/trail/audio ở mức bounded; không che target.
- Không thêm gameplay buff mới trong slice. Existing combo rewards vẫn giữ; không nhân thêm layer bí mật.
- Có thể dùng hysteresis ngắn chỉ cho presentation để tránh nhấp nháy/audio flip khi qua ngưỡng; không cho presentation tier sửa stats.
- Nếu về sau thêm bonus, chỉ một bonus có card riêng, cap và test stacking; cập nhật ruleset, không lén tăng sức mạnh trong phase art.
- Soft visual transition và existing combo protection giảm cảm giác “một typo mất hết”; không sửa raw typing error để giả perfect.

### 12.2 Rage Awakening và projectile evolution

- Giữ resource/cooldown/ultimate owner hiện có; Space vẫn Rage ở input mode đầu.
- Awakening là visual/audio envelope quanh ultimate, cleanup khi chết, restart, pause/resume, stage switch.
- Projectile evolution đọc Mk/grade/skill rank hiện tại; không thêm progression tree hoặc currency.
- Nâng chất lượng bằng silhouette, layering và hit feedback có giới hạn; không tăng hàng loạt particle count ở Ultra.
- Phase này không cần để chứng minh slice vui; làm sau khi core loop pass.

## 13. Threat, compatibility và workload

### 13.1 Pressure model

Reuse difficulty/adaptive/active-pressure. Dùng workload đã có nếu phù hợp, mở rộng schema chứ không thêm Director thứ hai.

```text
estimatedTypingSeconds ≈ typedChars × 12 / referenceWpm
requiredWindow = estimatedTypingSeconds + acquisitionBuffer + modeReadingBuffer
```

Đây là estimate cho sizing, không bảo đảm mỗi người gõ mọi từ cùng tốc độ. Clamp profile để tránh NaN/0/cực trị; dùng dữ liệu hợp lệ và smoothing, không chỉ màn vừa qua.

- Pressure xét deadlines chồng nhau và entity actions, không chỉ tổng số chữ/enemy count.
- Shared Target không tính toàn bộ group như N word tasks nhưng vẫn tính physical threats.
- Long word có buffer nhận diện; Recall có reading/retrieval buffer riêng.
- Không biến người 100 WPM thành phải gánh địch nhanh gấp đôi 50 WPM theo tuyến tính.

### 13.2 Adaptive policy

[DEFAULT] Prototype khóa profile trong một encounter, chỉ điều chỉnh có giới hạn ở safe boundary. Nếu existing runtime adaptive bắt buộc, document clamp và test thay đổi cụ thể; không âm thầm giữ policy khác giữa hai lượt so sánh.

- Không đổi HP địch đang sống để bù sức mạnh build.
- Không tăng pressure ngay sau draft chỉ vì vừa được buff.
- Threat indicator giải thích mức dự kiến, không hiển thị giả chính xác như GPU/FPS.
- Fixed Challenge freeze adaptive configuration; Personal Learning có thể adaptive nhưng PB tách scope.

### 13.3 Compatibility validation theo thứ tự

1. Check mode/vocabulary capability.
2. Check mechanic đã được giới thiệu/unlock.
3. Check World/recipe allowlist.
4. Check target/layer/group semantics.
5. Check text visibility và temporal constraints.
6. Check entity, workload, VFX/audio budgets.
7. Check pacing/recent history.
8. Resolve reward feasibility cho loadout/pool.
9. Nếu không có tổ hợp: fallback an toàn đã authored; không random retry vô hạn.

| Tổ hợp | Policy đầu |
|---|---|
| Recall bắt buộc + Chrono | Reject |
| Time Fracture + Chrono | Reject |
| Cloaker + điều kiện che chữ | Reject; điều kiện che chữ vốn ngoài scope |
| Swarm + summoner + nhân entity | Reject hoặc bỏ ít nhất một nguồn nhân; phải có cap chứng minh được |
| Boss Sentence + nhiều deadline địch độc lập | Reject ban đầu |
| Guardian bảo vệ Guardian theo vòng | Reject vòng bảo vệ không thể phá |
| Gravity Well + Anchored | Cho phép nếu counter-identity dễ đọc, không hard-lock build |
| Short Burst + per-perfect procs | Chỉ cho sau reward policy/tests |
| Shared Target + normal kill reward | Chỉ cho nếu group policy explicit |
| Cosmetic Ultra + bất kỳ mechanic | Không đổi validity/RNG gameplay |

Không cần tạo DSL tổng quát phức tạp. Ưu tiên typed config + validator nhỏ, reason code dễ test và đọc trong Test Lab.

## 14. Boss Mechanics 2.0

### 14.1 Phạm vi

Sau slice, prototype một boss reference: Vorgrath/G02 hoặc Tyrant tương đương ở code mới nhất; hai parts, một interruptible ultimate, một rage phase. Dùng lại interrupt-charge/shield/weak-point/phase machinery.

### 14.2 Part contract

Mỗi part: stable instance ID, parentBossId, type, anchor/local transform, target token, HP/layer policy, destroyed flag, vulnerability, damage allowlist, status allowlist và cleanup policy.

[RULE] Mặc định:

- `countsForKillObjective = false`;
- `dropsLoot = false`;
- không normal elite/affix roll;
- không normal on-kill rewards trừ trường hợp explicitly authored;
- không tính thêm spawn slot như một normal enemy ngoài boss envelope;
- boss chết/despawn thì parts release target và cleanup;
- part chết không tự complete boss encounter.

### 14.3 Luật thứ tự và chống soft lock

1. Resolve typed completion vào target đã khóa.
2. Resolve damage/status theo part/body policy, không áp AoE hai lần vì vừa hit part vừa hit parent cùng alias.
3. Mark destruction/interrupt một lần.
4. Evaluate phase transition trên state đã cập nhật.
5. Cleanup target không còn hợp lệ; cấp target tiếp theo theo engine policy.
6. Chỉ clear encounter khi canonical boss clear gate pass.

- Khi part không bắt buộc đã chết, body vẫn có đường gây damage hợp lệ.
- Nếu scripted phase yêu cầu part đã bị phá từ trước, skip yêu cầu đó hoặc chuyển nhánh rõ; không chờ event sẽ không bao giờ xảy ra.
- Stun/phase/ultimate xảy ra cùng tick có priority explicit và test; không để timer animation quyết định gameplay.
- Boss/body/parts share prefix phải kiểm thử; art anchor không được quyết định target priority.
- Asset part chưa tải: fallback procedural cue, không mất gameplay target.

## 15. Route events và ý tưởng mở rộng

### 15.1 Biết trước một phần để chọn route

Route preview thể hiện mechanic chính, expected workload band và loại reward, không tiết lộ tất cả spawn. Ví dụ “đông mục tiêu ngắn / cơ hội control” so với “ít đích dài / payoff burst”. Không có một nhánh luôn lợi hơn bất kể build.

Reuse `campaign/route.ts`; nếu thêm node `event`, update exhaustive switches, sanitize, checkpoint và UI cùng phase. Không thêm node enum mà để reader cũ crash.

### 15.2 Event families

| Event | Lựa chọn mẫu | Trạng thái và follow-up |
|---|---|---|
| Derelict Ship | Lấy sửa chữa nhỏ hoặc nhận thử thách lấy draft tốt hơn | Run flag cho cuộc gặp tiếp; không auto nhận cả hai |
| Distress Signal | Dành một encounter cứu hộ hoặc đi tiếp | Có follow-up ally/support bounded; không trừng phạt người bỏ qua |
| Merchant | Đổi tài nguyên đã có trong run hoặc giữ build | Không đưa campaign wallet vào prototype |
| Ancient Gate | Chọn nhánh risky có preview hoặc đường ổn định | Ghi route choice, chưa mở secret campaign trái phép |
| Memory Fragment | Ôn từ ngắn để nhận bonus hoặc bỏ qua | Learning evidence thực, không cho fake mastery bằng click |

Mỗi event khai báo requirements, choices, effects, run/profile scope, flags, followUp, cooldown, mode/World constraints, fallback và transaction ID. Hai chain có follow-up là đủ cho phase reference; chưa cần cả thư viện event.

### 15.3 Ý tưởng thử tùy chọn

- **Timing support payoff:** hạ support trong cửa sổ báo trước để chuyển lợi thế; không làm người chơi phải đứng chờ vô ích. Reuse recipe/target state.
- **Salvage:** đã có ở lượt mẫu; không cần hệ tiền mới.
- **Tactical callback:** cùng recipe trở lại với một biến đổi để thấy mình tiến bộ; cho phép qua anti-repeat bằng authored reason.

[RULE] Không đưa mọi ý tưởng vào slice cùng lúc. Một ý tưởng không chứng minh tác dụng có thể bị bỏ, không phải giữ chỉ vì đã viết tài liệu.

## 16. Learning, Codex, Nemesis và Ghost

### 16.1 Bằng chứng học

Lưu riêng: số lần gặp; typed attempts/correct/mistakes; prompt type; Recall success/failure; có hint hay không; thời điểm/session; word/collocation ID; mode; nguồn gõ hay proc. Không nâng mastery từ enemy chết vì laser/chain.

Một phrase completion không chứng minh tất cả thành phần đều nhớ nghĩa. Text reading và retrieval không trộn thành một accuracy duy nhất.

### 16.2 Wanted Words nhỏ, thử sớm

- Chọn từ cần ôn từ learning state đáng tin, có quota và cooldown.
- [TUNE] Bắt đầu tối đa một cơ hội ôn có chủ đích trong lượt slice learning; không biến mọi quái thành từ yếu.
- Có giải thích/gợi ý phù hợp, lần thử lại có buffer; bỏ qua không làm hỏng build.
- Reward cải thiện/genuine retrieval, không thưởng vô hạn bằng cố tình sai lần trước.
- Ghi “tiến bộ” khi evidence hỗ trợ; cần thử lại ở phiên sau trước khi coi là thành thạo bền vững.
- Không tự thêm spaced-repetition engine song song nếu hệ learning hiện có đã sở hữu lịch ôn.

### 16.3 Codex/Mastery

Mở rộng Codex: World/enemy/boss/reward + vocabulary/synergy/secrets. Vocabulary entry có en/IPA/vi/POS khi dữ liệu thật có; thiếu metadata thì hiện thiếu, không bịa.

Mastery Constellation là UI sau, đọc cùng learning state. Chặn duplicate store và render hàng nghìn entry mỗi frame; pagination/windowing khi thực sự cần, không thêm framework chỉ vì có danh sách.

### 16.4 Lexicon Boss

Curated pool gồm từ yếu, từ đã tiến bộ và theme; workload cap, có recovery giữa cụm. Không dồn toàn bộ từ dài khó vào một ultimate ngắn. Dùng boss pipeline, không biến test học thành content gate bất khả thi.

### 16.5 Nemesis [LATER]

Elite gây defeat có thể trở lại dưới record giới hạn: identity, encounter context, counterplay đã biết, return eligibility. Tối đa một chain active ban đầu; có kết thúc và reward rõ. Không stat inflation vô hạn, không khóa campaign vì người chơi gõ yếu. Return outcome commit một lần.

### 16.6 Personal Ghost [LATER]

Chỉ là timing/route echo, không target/collision gameplay. Chỉ so record có cùng preset/input/vocab/rules phù hợp. Nếu điều kiện không khớp, hiển thị tham khảo chứ không gọi “bạn chậm hơn” như kết luận kỹ năng. Tắt được, art thấp, không chặn readability.

## 17. Kiến trúc, combat events và determinism

### 17.1 Ownership

| Dữ liệu | Owner duy nhất | Consumer không được tự sửa |
|---|---|---|
| Enemies, targets, boss, conditions, skills, combat clock | Game và modules combat hiện có | DOM, renderer, audio |
| Recipe/plan đã resolve | Immutable encounter config được inject vào Game | Renderer/random cosmetic |
| Run phase, draft, route, record | Run orchestration qua ranh giới rõ với main/persistence | Relic listeners, UI text |
| Relic/passive effects | Compiler/resolver hiện hữu mở rộng | Không scan inventory mỗi frame |
| Flow presentation tier | Derived từ combat snapshot | Music không tự tăng streak |
| Background timeline/assets | Background system | Không phát sinh damage |
| Music/SFX | Audio controllers | Không quyết định elapsed gameplay |
| Campaign, learning, persistent records | Persistence orchestration hiện hữu | Game không parse localStorage save |

Tên file mới chỉ được chọn sau mapping owner. Một run orchestration module có thể hợp lý vì responsibility mới; không đồng nghĩa cho phép dựng thêm hàng chục manager.

### 17.2 Event contract tối thiểu

Schema minh họa, không phải code bắt buộc copy nguyên:

```ts
type EventMeta = {
  eventId: string;
  causeId: string;
  runId?: string;
  encounterId: string;
  simulationTick: number;
  origin: 'typing' | 'skill' | 'proc' | 'environment' | 'script';
  targetId?: string;
  completionId?: string;
  depth: number;
};
```

Events typed synchronous, handler trả command, không async global bus. Listeners không mutate authoritative state trực tiếp. Không dùng `Date.now()` làm tie-break combat order.

### 17.3 Pre-resolution và post-resolution

Không dùng một `PLAYER_HIT` mơ hồ cho cả chống hit và ghi nhận hit:

1. **Intent:** damage/typed action yêu cầu resolve.
2. **Pre-resolution policy:** invulnerability, shield/guard, validity, cap.
3. **Apply:** Game commit damage/progress đã resolve.
4. **Facts:** hit thực, word hoàn thành, layer break, kill, phase.
5. **Reactions:** ordered passive/relic/perk/synergy commands.
6. **Summary/learning:** đọc facts, không sửa ngược combat.

`blockDamage()` chỉ hợp lệ ở bước pre-resolution. Statistics phải ghi raw attempts và damage thực ở đúng bước; không đếm damage trước rồi quên trừ khi block.

Với typed completion: dùng một completion fact có `perfect: boolean`; nếu cần adapter `PERFECT_WORD`, cùng completionId và subscription policy chống listener đếm cả hai. Không gọi hai đường cũ/mới cho cùng trigger.

### 17.4 Trigger order và cap

[DEFAULT] Khi không có pre-resolution đặc thù: ship passive → relic → perk → synergy → derived Flow/Threat → meta projection. Giữ thứ tự cũ nếu migration phải bảo toàn behavior; nếu thứ tự cũ khác, ghi quyết định và regression test thay vì giả định mới là đúng.

- Commands có stable order; không dựa iteration của object sinh từ input không chuẩn hóa.
- Proc nguồn không quay lại như typed input. Allowlist trigger graph chặn vòng lặp trước runtime depth guard.
- [TUNE] Depth guard/budget phải được chốt trong baseline contract; chạm guard là diagnostic/test failure, không âm thầm bỏ reward người chơi.
- Cosmetic commands có thể drop theo quality budget; gameplay commands không được drop chỉ vì máy yếu.
- Không tạo object graph/event log không giới hạn cho mỗi phím; logs chỉ bật khi đo/debug và có ring buffer.

### 17.5 Migrate tối thiểu, không refactor tất cả trước khi chơi thử

1. Ghi tests snapshot outcome cho word completion/perfect/streak cần dùng.
2. Thêm adapter/resolver vào owner hiện có.
3. Chuyển một trigger family, đảm bảo đường cũ tắt cho family đó.
4. Run regression về score, energy, Shield, chain, streak và hooks.
5. Chỉ chuyển kill/player-hit/skill/boss khi phase tiếp theo thật sự cần.
6. Không thay event behavior và visual overhaul trong cùng patch khó kiểm chứng.

### 17.6 Seed contract

- Tách gameplay PRNG streams theo mục đích: encounter selection, vocabulary, offers, loot/event. Cosmetic RNG không tiêu cùng stream.
- Snapshot stream state hoặc derive bằng stable keys/counters; không seed lại tùy ý mỗi reload.
- Cùng seed + ruleset + config + choice history tạo cùng encounter structure/offers. Same seed một mình không bảo đảm cùng kết quả chiến đấu.
- Browser timing không được thay offer chỉ vì render thêm frame. Chưa có fixed-step determinism thì không hứa bit-identical replay/input simulation.
- Debug override ghi vào run identity, không nhận scored record giả như chơi thường.

## 18. Persistence, migration và rollback

### 18.1 Bảng permanence

| Dữ liệu | Trong run | Sau clear/defeat/abandon | Campaign có đổi không? |
|---|---|---|---|
| HP/Energy/Rage/status | Run-local | Bỏ khi terminal | Không |
| Relic draft/loadout tạm | Run-local, snapshot ở safe point | Bỏ; lưu bản copy trong summary | Không cấp sở hữu relic thật |
| Loaner ship/gear/consumables | Run config/local inventory | Bỏ | Không consume gear/items campaign |
| Offer/route history/PRNG | Run snapshot | Giữ phần cần tái hiện record theo retention cap | Không đổi campaign route |
| Clear stage/World | Run counters | Chỉ thành run record | Không mở campaign stage/World |
| Learning facts đã commit | Pending encounter → profile projection | Giữ facts hợp lệ | Có thể cập nhật learning dùng chung, không cộng combat reward |
| Synergy discovery trong prototype | Run-local preview | Giữ trong run record | Chưa cấp campaign discovery; production policy duyệt riêng |
| Currency/gear reward ngoài run | Không có ở prototype | Không có | Muốn thêm phải mở economy/save gate mới |
| PB/result | Record riêng | Giữ có cap/version | Không can thiệp campaign checkpoint |
| Route event flags | Run-local mặc định | Bỏ khi terminal | Persistent flag chỉ khi card explicitly cho phép về sau |

### 18.2 Safe boundary snapshot

Snapshot cần tối thiểu: schemaVersion, ruleset/content versions, runId, run mode/preset, phase, revision, encounter index/plan, start kit, run stats/resources, relic loadout/history, route flags, offer pending/selected, PRNG state/counters, committed encounter IDs, terminal marker, interrupted/retried eligibility, result accumulator.

- Sau draft confirmation: ghi choice và next-entry snapshot trước khi spawn.
- Sau clear: ghi settlement và next safe state trước khi tăng UI sang encounter kế.
- Trong encounter: không serialise mọi particle/projectile mỗi frame; giữ entry snapshot, progress hiện hành chỉ phục vụ phiên sống.
- Death/abandon: terminal marker commit theo cùng nguồn dữ liệu được recovery dùng; không chỉ đổi DOM rồi còn checkpoint scored sống.
- Storage failure: báo không thể lưu, không giả “đã lưu”. Cho retry/export; không reset campaign.

### 18.3 Idempotency và transaction

Mỗi settlement có stable ID, ví dụ `runId/encounterIndex/settlementVersion`. Apply learning/result một lần theo ID, không theo số lần modal được mount.

Nếu run và profile dùng nhiều storage key, **không giả chúng atomic**. Chọn phương án sau khi đọc persistence hiện tại:

1. Một authoritative transaction/envelope có run settlement + pending profile projection và revision; hoặc
2. Journal/outbox với idempotent consumer + replay recovery đã test.

Chỉ chọn cơ chế tối thiểu phù hợp adapter hiện hành, không tự thêm database/server. Crash sau write run nhưng trước profile apply phải recover không mất/nhân đôi evidence. Pending learning của encounter chưa clear mặc định không commit; chính sách này phải hiển thị/giữ nhất quán, không đẩy Portal hooks sớm rồi đếm lại khi retry.

### 18.4 Old/new/invalid save

- Save cũ thiếu section mới → defaults, không mất inventory/stage.
- Unknown optional field/ID → xử lý tolerant và ghi diagnostic theo policy; không yêu cầu exact count IDs.
- Future schema không đọc được → giữ bản raw/export, chặn mutation liên quan; không sanitize thành empty rồi overwrite.
- Unknown active-run ruleset không thể resume → offer archive/export và kết thúc run chưa hỗ trợ với xác nhận, giữ campaign; không chạy bằng rule mới như cùng seed.
- Corrupt/oversized run section → isolate phần hỏng, không xóa toàn profile; record limits theo cấu hình.
- Backup/export/import bao gồm section mới có version. Kiểm tra imported active run trùng runId trước merge.
- Hai tab cùng run: single writer revision/lease hoặc compare-and-check cơ chế phù hợp adapter; tab stale trở thành read-only/nhắc reload, không last-write-wins âm thầm.

### 18.5 Rollback

- Feature flag off đưa menu về đường cũ, không xoá dữ liệu mới để “dọn”.
- Active run dùng feature đã disable cần policy archive/finish rõ; không mở bằng engine không tương thích.
- Rollback không được giảm save schema bằng force overwrite; backup và forward-compatibility có test.
- Chỉ chủ dự án mới quyết định deploy/commit/push; tài liệu không cho phép reset lịch sử Git.

## 19. UX, audio và performance

### 19.1 Thứ tự hiển thị

Active target text → immediate danger → mechanic cue → player ship → combat FX → background/cinematic. Text vẽ sau hiệu ứng không đủ nếu contrast vẫn kém; kiểm tra trực tiếp trên cảnh sáng/tối.

- Briefing một câu: mechanic gì, hành động có lợi, cue nào cần nhìn. Không mở bảng giải thích dài giữa lúc đồng hồ địch còn chạy.
- Draft focus/keyboard accessible; key đang giữ từ combat không được chọn reward ngay khi modal mở. Cần release/debounce policy ở transition.
- Transition không nuốt phím đầu encounter hoặc bắn Rage vì Space từ thao tác UI cũ.
- HUD không hiện đồng thời 10 badge quan trọng ngang nhau; context ưu tiên mechanic đang hoạt động.
- Visual reduced-motion/flash policy không mất cue quan trọng. Mute audio vẫn chơi được.
- Small viewport: ưu tiên vùng chữ và target spacing, không chỉ thu nhỏ tất cả đến mức khó đọc.

### 19.2 Audio

Reuse MusicController/SFX hiện tại. Flow thay lớp calm/intense theo state-derived cue có hysteresis, không restart track mỗi lần tier đổi.

- Combat SFX có voice cap và policy ưu tiên; important telegraph cao hơn cosmetic hit spam.
- Pronunciation cần ducking/mix phù hợp; không ghép nhiều audio từ mới chồng nhau.
- Pause/hidden tab/stage transition dọn hoặc suspend đúng owner; không leak loop sound qua run mới.
- Audio loading failure có visual fallback, không block clear hoặc draft.
- AI không nghe được thì ghi “chưa duyệt bằng tai”, không suy ra “nghe tốt” chỉ từ waveform/peak.

### 19.3 Baseline mới, không dùng mã lỗi P2/P6 mơ hồ

Đọc `docs/PERFORMANCE_ROOT_CAUSE_REVIEW_2026-09-29.md` và `docs/VISUAL_TESTING.md` như tài liệu chẩn đoán. Kiểm tra lại tình trạng từng vấn đề bằng tên/symptom, không kết luận còn lỗi chỉ vì report cũ có:

- Dynamic Canvas shadow/filter cost trên renderer enemy;
- frame-time/adaptive sampling bỏ sót slow frames;
- background rendering/throttle/copy path;
- texture residency qua World và đổi quality;
- CPU submit time bị hiểu sai thành toàn frame/GPU time.

Không sửa tất cả vấn đề hiệu năng cũ dưới danh nghĩa một phase gameplay nếu chưa được giao phạm vi đó. Nếu baseline chưa đủ ổn để đo slice, báo blocker và đề nghị phase sửa riêng.

### 19.4 Ma trận đo bắt buộc

| Scenario | Điều cần ghi |
|---|---|
| Cold start vào encounter đầu | Asset decode/upload, first interaction, exceptions |
| Heavy encounter ổn định | FPS, full-frame p50/p95/p99/max, frame vượt budget, entity/particle/audio counts |
| Giant background object + combat | So với cùng combat không có pass, giữ DPR/quality |
| Chain/relic/skill đồng thời | Proc count, key feedback latency, VFX/audio peaks |
| Draft/rest/transition | Có pause thật, layout/DOM spike, input queue |
| Boss phase/death/restart | Cleanup, repeated load, target/state correctness |
| Nhiều lượt/World liên tiếp | Texture/heap/resident object trend, plateau sau warm-up |
| Low/Medium/High/Ultra | Logic parity + cue readability; High/Ultra đo riêng performance |

[DEFAULT] Duyệt visual ở viewport **1642×799, DPR 2** theo VISUAL_TESTING, đồng thời có một viewport hẹp hơn. Ghi CSS viewport, device DPR và internal canvas scale riêng; không đánh tráo chúng.

[TUNE] Gate khởi đầu trên máy/browser tham chiếu: High hướng tới gần 60 FPS, p95 ≤20 ms ở steady heavy scenario, p99 ≤33,4 ms; keydown-to-visible-feedback p95 hướng tới ≤50 ms trong active window. Đây là mục tiêu chờ baseline/harness xác nhận, không phải cam kết mọi máy đều đạt.

- Nếu baseline không đạt, báo không đạt; không sửa threshold để tự pass mà không quyết định ghi nhận.
- Ít nhất ba lượt đo cùng điều kiện; ghi số từng lượt và phạm vi dao động. Không chọn riêng lượt đẹp nhất.
- Warm/cold measurements tách; không bỏ spike bằng cách loại tất cả frame dài.
- Kiểm soát nguồn điện/thermal/load/background apps và renderer/browser; không chạy cả dàn build game khác để so A/B.
- Headless là một phần bằng chứng; cần xác nhận foreground trên đường Play/Portal người dùng chơi nếu phase ảnh hưởng cảm giác gõ.
- Fixed-quality A/B phải tắt hoặc ghi rõ adaptive scaling; không báo hiệu năng giữ nguyên khi canvas đã tự hạ nhiều.
- Không suy GPU ms từ thời gian JavaScript draw; dùng full-frame timing và trace phù hợp nếu cần phân biệt raster/compositor.

### 19.5 Budget bắt buộc ghi trước merge

Một bảng có giá trị số hiện hành, nguồn đo và worst-case cho: concurrent targets, projected typing workload, proc commands/tick, particles theo nhóm, audio voices, active source/runtime textures, background full-screen passes, HUD update rate, draft DOM size.

- Gameplay cap không phụ thuộc graphics quality. Cosmetic cap có thể khác.
- At most one fullscreen distortion/lensing pass trừ khi có phê duyệt perf mới.
- Không new per-frame native blur/shadow cho hàng loạt entities nếu chưa chứng minh budget.
- Không DOM write/render inventory/scan all relics mỗi key hoặc frame.
- Load cache có eviction/ownership; không preload 58 icons chỉ vì manifest có chúng.
- Memory phải ổn định sau warm-up trên test lặp; ghi object/texture count, không đòi heap byte tuyệt đối cố định vì GC.

## 20. Art production và prompt-pack override

### 20.1 Source art không phải runtime asset

PNG 1024² là master hợp lý khi cần. Runtime size/format chọn theo kích thước hiển thị thực và pipeline sẵn có. Không đưa source art vào initial bundle tự động.

Manifest cho mỗi asset:

```text
canonicalAssetId / featureId / approved phase:
existing asset to reuse, nếu có:
consumer (HUD/Codex/draft/target/background):
display CSS size / expected DPR / runtime resolution:
source path / runtime path / filename mapping:
alpha/background mode / anchor / safe margin:
palette + shape + motion cue:
byte budget / decoded pixel budget:
load group / release owner / fallback:
prompt ID / approval evidence / status:
```

Tạo manifest không có nghĩa được tạo ảnh. Chỉ khi phase có consumer đã duyệt mới yêu cầu generation/processing.

### 20.2 Batch mới thay Batch 1–6 cũ

| Batch mới | Chỉ làm khi nào | Asset tối đa theo nhu cầu |
|---|---|---|
| B0 — Prototype placeholders | P10/P20 | Reuse icon/cue hiện hành; chưa cần new source art |
| B1 — Slice identity | P30 sau mechanic/UI ổn | Solar Storm; 3 recipe; 3 pattern nếu UI cần; elite cũ chưa đọc rõ; không bắt đủ từng nhóm |
| B2 — Approved build roster | P40 | Chỉ các relic mapping đã duyệt; giữ asset existing phù hợp |
| B3 — Boss/UI reference | P50 | Chỉ part UI cần thiết; overlay boss-specific sau anchor proof |
| B4 — Route/Expedition/Learning | P60/P70 | Mode/event/learning consumer thật; không tạo trước layout |
| B5 — Cinematic | P90, perf gate pass | Một reference sequence, không toàn bộ World |

Trong prompt pack cũ:

- A01–A04/B01–B09/C01–C08 là thư viện, **không** danh sách phải làm ngay ở 1A/1B.
- Recipe icons không phải đợi tới batch muộn nếu slice cần; ngược lại không cần tạo nếu label/cue sẵn có rõ hơn.
- Flow emblems vẫn REUSE-FIRST/optional; illustrated icon không cần hiển thị cạnh từng target.
- Nhóm E: **approved code-to-art mapping thắng filename template**. Nhóm khác dùng tên pack trừ manifest có quyết định đổi rõ.
- Universal boss-part icon không thay thế sprite component gắn đúng perspective/anchor.
- “REQUIRED” nghĩa feature đã duyệt cần identity thích hợp, không nghĩa bắt buộc ảnh AI mới.

### 20.3 Quy trình tạo một asset

1. Xác nhận asset có consumer, ID, phase và budget trong manifest.
2. Kiểm tra asset hiện tại/procedural có giải được không; nếu có thì dừng generation.
3. Chọn đúng một prompt; reset palette/subject như pack.
4. Một filename → một generation call; không collage/contact sheet/variants trong cùng canvas.
5. Kiểm alpha bằng file thực; checkerboard vẽ lên ảnh không phải alpha.
6. Lưu source riêng; không overwrite source cũ chưa backup/được phép.
7. Chuyển runtime qua tooling hiện có, validate dimensions/bytes/manifest refs.
8. Chụp **nhóm icon cạnh nhau** tại kích thước UI thật; test nền sáng/tối, grayscale, target clutter.
9. Tích hợp fallback; thử asset tải lỗi.
10. Chỉ đánh dấu accepted khi đã xem trong game, không chỉ ảnh gốc.

### 20.4 Ngôn ngữ hình ảnh

Giữ polished sci-fi/fantasy, material depth, controlled glow, không text/watermark. Tuy nhiên, không cấm glyph đơn giản ở combat HUD chỉ vì prompt muốn premium painted art. Tách illustrated reward/Codex art với combat cue nhỏ.

Chrono và Phase không chỉ đổi sắc cyan/violet: Chrono cue hướng tiến và nhịp thời gian; Phase cue dịch ngang; silhouette/cue phải phân biệt ngay khi giảm size. Guardian thể hiện link đồng đội, Armored thể hiện bảo vệ bản thân.

### 20.5 Cinematic reference [LATER]

Một World, một sequence có start/end/skip/cleanup. Trước art phải có aspect, camera, safe text region, layer order, anchors và lifetime. Repeated playback, background disabled, low quality, context loss và transition đều phải về state hợp lệ. Không bake distortion đã làm bằng WebGL rồi áp lại lần hai.

## 21. Campaign 1000 stage

### 21.1 Giữ quy mô, thay cách phân phối agency

1000 stage là horizon của hành trình, không phải điều kiện để nhận mechanic thú vị đầu tiên. Không renumber stage, xóa completion hoặc thay ID World làm hỏng save.

| Band đề xuất | Mục tiêu |
|---|---|
| Stage 1–10 | Core typing/readability, choice đơn giản sớm, một payoff build thấy được; không dồn tutorial |
| 11–30 | 2–3 recipe nền, preview một condition, đủ quen để thử Expedition nếu người chơi muốn |
| 31–100 | Củng cố lựa chọn, elite cue, nhịp hồi phục/callback, một mục tiêu học tùy chọn |
| 101–250 | Mở sâu build, conditions/affixes đã test, route preview; không mới bắt đầu cho agency |
| 251–400 | Tổ hợp có chủ đích, mở rộng synergy và boss reference phù hợp |
| 401–600 | Boss parts đã chứng minh, phối hợp 2–3 hệ có cap; không bật tất cả |
| 601–800 | Event chains, Lexicon Boss được chọn lọc, learning/meta sâu |
| 801–950 | Champion/Nemesis nếu được duyệt, thử thách curated/mastery |
| 951–1000 | Endgame callbacks, gauntlet có nghỉ, culmination của kiến thức đã học |

Các band là [DEFAULT] về intent, không phải script bắt buộc gán số mà không đọc existing scheduler. Mốc đang tồn tại có quyền được giữ nếu migration/tính nhất quán tốt hơn; ghi mapping thay vì âm thầm đè.

[TUNE] First meaningful choice trong 5–10 phút đầu thực chơi, một tương tác build trong 10–15 phút. Kiểm tra theo thời gian người chơi, không chỉ nói “stage 5 là sớm”. Nếu không đạt, giảm độ trì hoãn tutorial/reward chứ không tăng tốc địch.

### 21.2 Audit 1000 stage

Audit windows 5/10/25/50/100 và toàn campaign; xuất seed, ruleset, mode, profile, pool, exact repeats, near repeats, recipe/role/pattern/condition/affix distributions, recovery gaps, choice cadence, workload peaks, boss/objective spacing, fallback counts.

Phân loại:

- **ERROR:** impossible input, soft lock, invalid stack, vượt gameplay cap, unknown asset required không fallback, reward bất khả dụng, không có recovery bắt buộc theo preset.
- **WARNING:** lặp pattern/recipe, thiếu variety, quá nhiều fallback, choice quá xa nhau.
- **AUTHORED EXCEPTION:** tutorial, recovery, tactical callback có reason và phạm vi.

Không fail chỉ vì NORMAL_WORD xuất hiện bốn lần nếu intent là luyện/giảm áp lực. Không tối ưu entropy bằng đổi palette mà workload/decision vẫn giống hệt.

## 22. Roadmap theo cổng kiểm chứng — runbook triển khai

### 22.1 Quy trình bắt buộc cho mọi phase

1. Nhận **phase được giao rõ**. Nếu người dùng chỉ yêu cầu review/tài liệu, dừng ở phân tích; không chạy phần implementation.
2. Đọc AGENTS áp dụng, PROJECT_CONTEXT và docs liên quan. Ghi branch, HEAD, dirty paths và baseline command results.
3. Đối chiếu owner/module hiện tại với bản này; gửi danh sách khác biệt. Không fetch/pull/reset hay thay branch trong dirty tree chỉ để “reconstruct” nếu chưa được cho phép.
4. Lập checklist gồm contract IDs/test IDs của phase. Tách prerequisite chưa đạt khỏi công việc được làm.
5. Viết characterization/regression test trước khi đổi behavior có sẵn.
6. Implement phần nhỏ nhất đủ contract; feature flag/new preset mặc định chưa bật rộng.
7. Run focused tests → full regression → build → runtime/visual/perf liên quan. Không skip bước sau bằng lý do “unit test pass”.
8. Rà lại input, state ownership, reload, reward, cleanup và quality parity; xem diff tránh thay file ngoài scope.
9. Tạo evidence packet và báo PASS/FAIL/NOT RUN/BLOCKED từng gate.
10. Dừng để review trước phase sau. Không tự commit/push/deploy trừ khi người dùng yêu cầu rõ.

### 22.2 P00 — Inventory, baseline và chốt contract

**Lưu ý thứ tự:** các mã Pxx là nhóm công việc, không phải mọi phase đều phải chờ tất cả số nhỏ hơn. Chuỗi bắt buộc ban đầu là P00 → P10 → P20 → P30. Sau đó dùng dependency table sau, chủ dự án chọn nhánh cần làm; không tự triển khai đồng thời chỉ vì bảng cho phép.

| Nhánh | Phụ thuộc thực sự | Không phải đợi |
|---|---|---|
| P40 roster/variety | P30 fun/save/perf gates + quyết định của mechanic sắp thêm | Cinematic, full campaign rollout |
| P50 boss parts | P30 + input/target/event contracts đủ cho parts | Đủ 12 relic hoặc mọi affix mới |
| P60 campaign band nhỏ | P30 + economy/migration review riêng | Boss parts, toàn bộ P40, Daily |
| P70A learning pilot | P30 + genuine learning events/commit path | Roster 12, route chains, P50/P60 |
| P70B fixed challenge | Stable run/rules/pool/score + persistence gates | Full learning UI hoặc Nemesis |
| P70C ghost | Record identity/compatibility đã ổn | Daily online/leaderboard |
| P80 presentation hoặc Nemesis | Core gate và contract tương ứng | Cinematic; hai subphase độc lập |
| P90 cinematic | Core performance ổn + reference layout approved | 1000-stage content hoàn chỉnh |

Như vậy loop học nhỏ có thể thử ngay sau P30, còn Mastery Constellation/Lexicon Boss đầy đủ vẫn để sau. Agency campaign sớm cũng không bị buộc đợi boss mới.

**Đọc:** PROJECT_CONTEXT, VISUAL_TESTING, performance report, `Game.ts`, `main.ts`, `package.json`, files ở §3.3, persistence và tests tương ứng.

**Làm theo thứ tự:**

1. Ghi HEAD/working-tree; xác định dev/Play path và server đang dùng, không tắt chúng.
2. Lập bảng feature → module owner → tests → save impact → UI consumer.
3. Xác nhận 6 relic/3 slots/current reward/input policy còn đúng; nếu khác cập nhật mapping trước code.
4. Đọc scripts trước khi chạy; xác nhận command không auto-migrate assets/save ngoài scope.
5. Chạy baseline unit/build theo §23 trong môi trường test, ghi lỗi có sẵn và lỗi do thiếu shared assets.
6. Đo baseline scenarios §19, không dùng save thật để force stage.
7. Chốt preset sample: start kit, word pool, difficulty/profile, score, draft positions, duration, reward/reset.
8. Chốt budget sheet và open decisions §24 bằng giá trị/config cụ thể hoặc đánh dấu blocker.

**Bàn giao:** inventory table, baseline logs/measurements, contract decision sheet, exact proposed files. **Không** viết gameplay mới trong phase inventory nếu chưa có yêu cầu mở scope.

**Gate:** nếu input/save/performance assumption chưa kiểm tra được, báo rõ; không tuyên bố ready bằng việc đọc docs.

### 22.3 P10 — Run isolation, seed, safe snapshot và draft shell

**Đọc trước:** `main.ts`, `Game.ts` init/setters, `events/reward-choice.ts`, `relics/state.ts`, `campaign/replay.ts`, `campaign/route.ts`, toàn bộ đường save/checkpoint/crash/death-protection/backup liên quan.

**Bước triển khai:**

1. Dùng campaign fixture để chụp trạng thái trước run, bao gồm gear/items/currency/progression/pity/shop/route.
2. Viết run config/snapshot validation tối thiểu, có version và owner rõ.
3. Thêm entry/exit mode orchestration qua production Game; inject loaner kit, không mutate shared campaign references.
4. Tạo deterministic encounter plan tối thiểu bằng existing normal encounter; tách RNG streams gameplay/cosmetic.
5. Materialize offer, pause-safe modal, confirm/replacement/cancel/fallback dưới 3 options.
6. Implement safe boundary writes, journal/projection cần thiết, terminal marker và recovery policy.
7. Wire summary/return, cleanup toàn bộ run hooks và trả quyền UI về campaign.
8. Thêm Test Lab force seed/phase/offer và artificial storage failure bằng adapter test, không sửa storage thật.

**Test bắt buộc:** T01–T06, T10–T15, T19 ở §23.3. So campaign fixture trước/sau; chỉ learning/result projection đã cho phép được khác.

**Gate:** run normal nhỏ hoạt động từ setup tới terminal/reload mà không chạm economy campaign. Không đợi có art.

### 22.4 P20 — Build choice + trigger migration tối thiểu

**Đọc trước:** `Game.ts` completion/passive/perk hooks, `relics/registry.ts`, `relics/state.ts`, `equipment/perks.ts`, `synergy/build.ts`, character passives, results/learning hooks.

**Bước triển khai:**

1. Lập call-path từ một key đúng/sai tới word completion, passive, relic, perk, kill và learning.
2. Viết characterization tests cho ship/relic combos liên quan; ghi đơn vị streak thật.
3. Introduce completionId/origin và resolver typed đồng bộ tối thiểu; không chuyển cả boss/skill nếu không cần.
4. Chuyển một trigger family; chứng minh đường cũ không chạy lại.
5. Implement short-word coefficient/cooldown policy chỉ ở run/preset được giao, test stacking.
6. Đưa draft trước encounter 1 và sau 2/4/6; replacement/salvage thao tác atomic theo boundary.
7. Hiển thị effect và contribution summary đủ giải thích, không update DOM mỗi phím.
8. Thử hai loadout có chủ đích; nếu Long Word chỉ phát huy ở boss cuối, đề xuất thí nghiệm Lens bounded như §11.1 và xin duyệt thay behavior đó trước.

**Test:** T04–T09, T16–T19; legacy campaign relic tests phải giữ nguyên trừ thay đổi được duyệt riêng.

**Gate:** reward không nhân đôi, hai hướng có giả thuyết hành vi cụ thể và có thể kiểm chứng. Chưa mở roster 12.

### 22.5 P30 — Vertical slice 8 encounter: patterns, recipes, pacing, một condition

**Đọc trước:** logic/input/targeting, enemy spawn/word/profile/threat, scheduler/hazards, stage-pacing, active-pressure, UI briefing và music.

**Bước triển khai:**

1. Add pattern config normal/short/long; dataset validation và deterministic fallback.
2. Định nghĩa ba recipe card, resolve bằng scheduler hiện có.
3. Áp workload/concurrency constraints và forbidden pairs; viết reason codes.
4. Xây arc 8 encounter §6 bằng configuration, giữ production stage clear gate.
5. Tạo một Solar Storm theo §9.1, value energy sau khi đo start-kit economy; cue đơn giản ở mọi quality.
6. Add Flow presentation nếu cần; không thêm buff.
7. Wire briefings/reward/rest/summary thành một lượt thật; target practice/debug không được thay production combat logic.
8. Test full loop hai build, viewport chuẩn và hẹp, muted audio và quality matrix.
9. Chạy playtest nhỏ §23.6 trước art mở rộng. Nếu fail fun gate, chỉnh scope/decision rồi test lại, không chữa bằng thêm effect.

**Test:** toàn bộ nhóm core T01–T22 thích hợp, đặc biệt T07/T08/T16/T20/T21. **Gate:** loop hoàn chỉnh, ổn định, người chơi phân biệt được ít nhất hai cách xử lý; chưa tuyên bố retention.

### 22.6 P40 — Roster, recipe/condition/affix expansion có kiểm soát

**Prerequisite:** P30 gate có bằng chứng, không chỉ merge code.

1. Review pick/contribution/target-order evidence; xác định dominant/unused relic.
2. Map retained relics và gaps, viết card cho từng ứng viên; dừng ở roster nhỏ nếu đã đủ depth.
3. Thêm effect/interaction từng món và tests trước khi cấp art; không batch 6 relic chưa đo.
4. Mở PHRASE/SHARED_TARGET/CHAIN theo contract input/reward; không đổi literal typing.
5. Thêm condition/affix một loại mỗi lần, kiểm overlap behavior trước khi tạo ID.
6. Pairwise compatibility + representative 3-way stacks; không giả pairwise đã bao phủ mọi tương tác.
7. Update Test Lab, audit, telemetry bounded và art manifest sau gameplay acceptance.
8. Chạy regression/perf cùng preset trước/sau; ghi thay đổi ruleset/offer pool.

**Gate:** mỗi addition có một quyết định mới quan sát được hoặc làm rõ hệ cũ; không có dead offers/hard-counter bất khả thi. Roster khoảng 12 là mục tiêu, không điều kiện số học để pass.

### 22.7 P50 — Boss reference và part integration

1. Characterize boss phase/interrupt/current target tests.
2. Chốt part metadata/body-part damage graph và thứ tự §14.
3. Tạo hai parts bằng target pipeline hiện có, dùng placeholder overlay.
4. Thêm state destroyed/cleanup/phase fallback, suppress normal loot/objectives/procs.
5. Test shared-prefix, part chết cùng body, AoE hit cả hai, phase transition giữa word, Rage/skill/stun cùng tick, asset fail.
6. Force từng trạng thái qua production Test Lab; chơi full boss không debug.
7. Chốt anchor/perspective/layout rồi mới xin art-specific overlays.

**Test:** T23 và mọi regression boss/target/reward liên quan. **Gate:** không soft lock, không nhân reward, target readability ổn, perf không vượt budget. Chưa nhân ra 26 boss trước reference pass.

### 22.8 P60 — Campaign rollout, route events và arc dài

1. Đối chiếu stage access/replay/checkpoint/death protection và current milestones; lập bảng giữ/đổi.
2. Đưa agency sớm vào campaign với kinh tế thưởng riêng đã review; không copy run-local relic reset lên campaign.
3. Thử một band nhỏ trước, có feature flag; không regenerate toàn campaign không kiểm diff.
4. Add route preview, một event và follow-up; rõ run/profile flags.
5. Validate 1000-stage plan nhiều profile/mode/pool; curated exceptions có reason.
6. Test existing saves ở đầu/giữa/cuối campaign và old replay; không renumber IDs đã lưu.
7. Sau reference pass mới mở chain thứ hai và mở dần World.

**Test:** T10–T15, T24, campaign access/replay/economy regressions. **Gate:** save và early agency đều pass; chưa release chỉ vì audit không có repeat.

### 22.9 P70 — Learning reference, Daily và Ghost theo nhánh riêng

P70 không phải một patch khổng lồ. Chia ba subphase, chỉ làm subphase được giao:

- **P70A Learning:** verify learning ownership; one Wanted Word loop; raw typing vs Recall evidence; hint policy; commit once; summary; mới mở Vocabulary Codex/mastery khi evidence đáng tin.
- **P70B Fixed Challenge:** khóa preset/rules/pool/adaptive, define day-key/timezone nếu Daily, tách retried/assisted records; test đổi ngày/clock/versions; không hứa anti-cheat local.
- **P70C Ghost:** record schema bounded, same-comparison key, replay cue cosmetic, tắt được; không tạo enemy/target mới.

Day-key [DEFAULT] dùng UTC nếu chọn Daily bản local; hiển thị giờ reset, lưu day-key lúc start, không đổi seed giữa lượt vì qua nửa đêm. Đổi local clock không được báo là đã được bảo vệ chống gian lận.

**Test:** T08/T13/T25/T26; **Gate:** dữ liệu học/so sánh không sai nghĩa và không ảnh hưởng campaign trái scope.

### 22.10 P80 — Rage presentation, evolution visuals, Nemesis tùy chọn

Tách visual progression khỏi Nemesis gameplay thành subphase khác nhau. Với visual: trace source progression → profile → renderer, kiểm quality/cue/audio/cleanup, không buff stats. Với Nemesis: single active chain, bounded return, one-time reward, persistence và abandon/reload cases. Không tự làm Hunter Fleet/Quantum Echo.

### 22.11 P90 — Một cinematic reference

1. Reprofile baseline trước, bảo đảm core không lag chưa giải quyết.
2. Layout greybox sequence có start/end/skip; text-safe zone, no gameplay state owner.
3. Test repeated play/stop/World switch/context loss trước art thật.
4. Giao art request exact size/layers/anchors; reuse trước generate.
5. Tích hợp một sequence, measure High/Ultra và foreground key feedback.
6. Chỉ nhân nội dung sau reference pass và chủ dự án duyệt bằng mắt/tai.

### 22.12 P100 — Release candidate, không tự push

- Regression toàn bộ + build + asset validators + representative runtime/perf + full campaign audit.
- Import/export/migration/rollback tests; test sạch và upgrade từ fixture cũ.
- Chơi từ entry point production/Portal với test profile riêng; không chỉ Test Lab.
- Soát flags, debug globals/QA bypass và data collection defaults.
- Changelog, known limitations, exact manual gates còn mở, bằng chứng commit/working-tree được test.
- Chủ dự án quyết định phát hành. Không force push, không dùng reset hard hay bỏ test để “hoàn thành”.

## 23. Test Lab, regression và playtest

### 23.1 Test Lab phải gọi production logic

Thêm controls theo phase: seed/preset; condition exact; enemy kind/affix; pattern/pool; profile/threat freeze; relic/loadout/trigger origin; offer choice; run phase/storage-failure adapter; boss part/phase; macro plan simulation; cinematic start/stop.

QA preset chứa config chứ không chứa bản sao công thức damage/learning. Test Lab save cách ly; force/reset không sửa profile người dùng. Debug-created run không chen vào PB normal.

### 23.2 Command runbook tham chiếu

Các lệnh dưới đây **chỉ dành cho phiên được giao triển khai/kiểm thử**, không phải yêu cầu chạy khi chỉ soạn tài liệu. Chạy từ repository game và đọc `package.json` mới nhất trước. Tại baseline hiện có các scripts `test`, `build`, `check`, `visual:shot`.

Read-only preflight:

```bash
cd /Users/jokerit/htdocs/typing-game/games/space-typing
git status --short
git branch --show-current
git rev-parse HEAD
git diff --stat
node --version
pnpm --version
```

Baseline/focused checks:

```bash
pnpm exec tsc -p tsconfig.json --noEmit
pnpm exec vitest run tests/relics.test.ts tests/build-synergy.test.ts tests/game-input-priority.test.ts
pnpm test
pnpm build
```

Full handoff check có thể dùng `pnpm check` thay lặp `pnpm test` + `pnpm build`. Ghi command đã chạy và exit code thực tế. `pnpm build` tạo build output; không mô tả nó như hoàn toàn read-only. Không tự `pnpm install`/upgrade tooling nếu lockfile và dependency scope chưa được xác nhận.

Visual server tạm, ưu tiên một terminal/session giữ được PID:

```bash
pnpm exec vite --host 127.0.0.1 --port 3098 --strictPort
```

Nếu port đã có người dùng, chọn port khác và thay URL; không kill service theo port để chiếm chỗ. Từ terminal khác, với thư mục output tạm đã chuẩn bị:

```bash
pnpm -s visual:shot 'http://127.0.0.1:3098/' .visual/expansion-v2-game.png --click='#startButton' --wait=20000 --eval-file=scripts/visual/evals/game-assets.js
```

Lệnh này kiểm entry gameplay hiện tại, **không tự chứng minh Expedition đã được mở đúng**. Khi phase thêm UI/preset mới, tìm selector/config thực trong code, ghi URL/steps/preset chính xác; không bịa selector rồi chụp title screen như bằng chứng combat.

Mở ảnh thực, không chỉ đọc JSON. Kiểm screenshot chuẩn + crop vùng chữ/target/cue; runtime exceptions phải được xem và phân loại. Kết thúc server bằng session/Ctrl-C hoặc PID đã xác nhận do chính phiên này tạo; không `killall node`, không kill mọi process nghe port.

Play/Portal verification đọc command build ở repository cha trước. `pnpm build:space` chỉ dùng nếu script đó vẫn tồn tại và được giao scope build. Dùng test profile/storage riêng; không force stage/clear save trên origin dữ liệu thật.

### 23.3 Ma trận test bắt buộc

Tên test file mới có thể chọn theo repo convention. IDs dưới đây phải xuất hiện trong evidence packet để truy vết, không nhất thiết làm ID trong production code.

| ID | Ca kiểm thử | Kết quả mong đợi |
|---|---|---|
| T01 | Start run rồi abandon | Stage, equipment, wallet, item, pity campaign giữ nguyên |
| T02 | Victory rồi mở campaign | Run result đúng, không cấp campaign loot/progression ngoài policy |
| T03 | Cùng seed/config/choices nhưng quality khác | Encounter/offers/typed strings giống; cosmetic khác được phép |
| T04 | Double click/Enter repeat reward | Một confirm, một grant, một snapshot revision |
| T05 | Full 3 slots → replace → cancel/reload | Slot change chỉ sau confirm, offer không reroll |
| T06 | Pool còn 0/1/2 eligible relics | Fallback hữu hạn, không duplicate/loop vô tận |
| T07 | Cùng 40 typed chars, short/normal/long | Proc/reward bounded và chênh lệch giải thích được |
| T08 | Shared target/proc kill/skill kill | Không tạo giả typed completions hay learning evidence |
| T09 | Mirror Vow bảo vệ sai phím | Streak protection theo rule; raw mistake vẫn ghi |
| T10 | Reload trước/sau draft confirmation | Khôi phục chính xác boundary, không mất/nhân offer |
| T11 | Crash giữa run settlement và profile projection | Journal/recovery apply đúng một lần |
| T12 | Defeat rồi reload hoặc click restart nhiều lần | Terminal không trở thành scored resurrection; cleanup idempotent |
| T13 | Save cũ/missing optional/unknown ID/future version | Không mất profile; unsupported data không overwritten |
| T14 | Storage quota/write failure | Có lỗi rõ, không giả saved/tiến state không recover được |
| T15 | Hai tab stale writer / import trùng runId | Không silently overwrite hoặc nhân reward |
| T16 | Phrase/Space/Escape/shared-prefix/target chết giữa input | Không Rage/input collision mới, target release hợp lệ |
| T17 | Pause/modal/tab hidden vào đúng pulse/charge | Clock policy nhất quán, không tiêu cửa sổ đọc bắt buộc |
| T18 | Event old/new adapters cùng tồn tại | Mỗi completion chỉ xử lý một lần; parity với legacy |
| T19 | Feature flag off giữa có run/save mới | Không xóa dữ liệu, có archive/unsupported path rõ |
| T20 | Word pool rỗng/không đủ long/normalize rỗng | Deterministic fallback, không target không thể gõ |
| T21 | Compatibility triple + workload vượt cap | Reject/fallback với reason; không hard-lock |
| T22 | 10 lượt restart + đổi World/quality | Counts/memory plateau hợp lý, không listener/texture/audio leak tích lũy |
| T23 | Boss parts + AoE + phase + simultaneous death | Không double damage/reward, không soft lock/orphan target |
| T24 | 1000-stage audit + old milestone/replay saves | Access/checkpoint đúng, authored repeats được phân biệt |
| T25 | Wanted Word hint/skip/retry/Recall vs visible typing | Learning metric đúng nghĩa, không phạt skip hoặc fake mastery |
| T26 | Daily qua UTC midnight/clock change/rules update | Run đang chơi giữ config, comparison key tách đúng |
| T27 | Asset/audio fail, WebGL unavailable/context loss | Gameplay/cue fallback, không mất target/clear gate |
| T28 | Small viewport + High/Ultra + muted/reduced motion | Required text/cue vẫn đọc được; logic parity |
| T29 | Frame chậm, input burst, long task | Không loại mọi slow frame khỏi metric; queue/state bounded |
| T30 | DOM/reward modal focus và held key transition | Không auto-pick reward/nuốt chữ đầu do phím từ phase trước |

### 23.4 Những test hiện có nên đọc để mở rộng, không thay bằng fake tests

- Input/typing: `tests/logic.test.ts`, `tests/game-input-priority.test.ts`.
- Build/economy: `tests/relics.test.ts`, `tests/build-synergy.test.ts`, `tests/campaign-rewards.test.ts`, cùng tests ship/passive thực dùng.
- Scheduler/pressure: `tests/stage-scheduler.test.ts`, `tests/stage-pacing-runtime.test.ts`, `tests/active-typing-pressure.test.ts`, `tests/difficulty-word-pressure.test.ts`, `tests/threat-budget.test.ts`.
- Save: `tests/backup.test.ts`, `tests/autosave.test.ts`, `tests/m22-recovery-integrity.test.ts`, các tests checkpoint/player-save hiện có được tìm bằng `rg --files tests`.
- Boss: `tests/boss.test.ts`, `tests/boss-typing-mechanics.test.ts`.
- Learning/QA: `tests/shared-learning.test.ts`, `tests/recall-bonus.test.ts`, `tests/test-lab-production-qa.test.ts`.
- Perf/quality: `tests/performance-quality.test.ts`, `tests/adaptive-resolution.test.ts`, `tests/m22-runtime-stress.test.ts`.

Danh sách dựa baseline, không đảm bảo file luôn còn tên cũ. Tìm và map lại nếu khác; không xóa tests cũ vì plan dùng tên khác.

### 23.5 Evidence packet mỗi phase

Một packet tối thiểu gồm: phase ID, HEAD + local diff scope, contracts covered, fixtures/presets/seeds, test commands/results, screenshots đã mở, runtime logs/exceptions, perf sample metadata/raw results, save before/after comparison, known gaps và next safe step.

Artifacts tạm để `.visual/` hoặc nơi scratch đã thống nhất; không commit hàng trăm MB trace/master PNG. Report nhỏ trong docs chỉ khi scope cho phép. Không thu thập dữ liệu cá nhân/telemetry cloud để phục vụ playtest mà chưa có yêu cầu.

### 23.6 Playtest protocol và fun gate

1. Mời khoảng 5–8 người cho vòng định tính, gồm người gõ chậm/nhanh và mới/cũ. Ghi đây không phải mẫu thống kê retention.
2. Mỗi người thử baseline ngắn và slice; xen kẽ thứ tự nếu có thể để giảm ảnh hưởng làm quen/máy nóng.
3. Cho hai lượt với hướng build khác nhau. Một lượt có hướng dẫn tối thiểu, một lượt để họ tự quyết định.
4. Quan sát target order, thời điểm dùng skill, lý do draft, lần phải dừng đọc, cue bị hiểu sai; không gợi ý đáp án trong lúc đo.
5. Sau lượt hỏi: lựa chọn nào làm khác cách chơi? Khi thua muốn đổi gì? Có tự muốn bắt đầu lượt khác không? Chỗ nào chỉ thấy nhiều hiệu ứng hơn?
6. Ghi duration, completion, time to first choice, offer/pick và contribution; phân biệt không thích gameplay với lag/không hiểu UI.
7. Có người tham gia thì xin phản hồi phiên sau nếu thuận tiện; không dùng lời hứa “sẽ chơi” như retention thật.

[GATE] Chỉ mở rộng khi có bằng chứng người chơi hiểu lựa chọn và hai build làm đổi quyết định. Nếu tất cả chọn cùng món hoặc chỉ cần gõ nhanh hơn để giải mọi tình huống, sửa loop trước. Chủ dự án duyệt kết quả định tính; không tự đặt một tỷ lệ tùy ý rồi gọi đó là bằng chứng khoa học.

## 24. Rủi ro, quyết định còn mở và Definition of Done

### 24.1 Decision register: không tự đoán phần chưa chốt

| ID | Điểm cần đóng | Default/đề xuất | Đóng trước |
|---|---|---|---|
| D01 | Start kit stats/skills/hotbar chính xác | Loaner starter, reuse resolver, không campaign power | P10 |
| D02 | Word pool/profile thử nghiệm | Snapshot/allowlist có hash, không phụ thuộc vô tình vào save thật | P10 |
| D03 | Snapshot store và cross-key transaction | Reuse adapter; envelope hoặc journal idempotent có test | P10 |
| D04 | Two-tab writer policy | Single writer/revision guard, thông báo tab stale | P10 |
| D05 | Relic short-word normalization phạm vi | §11.5 cho run/preset, legacy campaign giữ nguyên | P20 |
| D06 | Long Word build ngoài boss | Thí nghiệm Lens run-only nếu cần; xin duyệt behavior change | P20 |
| D07 | Solar Storm energy amount/pressure limits | Chu kỳ mẫu §9, lượng thưởng đo economy trước | P30 |
| D08 | Exact numeric caps/perf reference | Budget sheet với máy/browser/viewport/rules rõ | P30 integration |
| D09 | Boss prefix/tie-break/body-part damage/status | Single target owner, explicit transition contract | P50 |
| D10 | Campaign unlock/reward changes | Không tự copy Expedition rewards; review economy và old saves | P60 |
| D11 | Learning mastery advancement | Dữ liệu thật, hint/Recall riêng; không fake mastery | P70A |
| D12 | Daily comparison/timezone/retry eligibility | Fixed preset, UTC day-key, split interrupted records | P70B |
| D13 | Runtime asset resolution/budgets | Theo consumer, không nguyên 1024 mặc định | Batch art tương ứng |

AI phải điền decision bằng code facts, prototype proposal và tests; nếu cần lựa chọn sản phẩm vượt scope đã giao, hỏi chủ dự án. “Chưa chốt” là blocker của phase liên quan, không lý do dựng thêm hệ thống tùy ý, cũng không chặn mọi phase độc lập trước đó.

### 24.2 Rủi ro và cách xử lý

| Rủi ro | Tín hiệu | Hành động |
|---|---|---|
| Feature soup | Người chơi không giải thích được đang xảy ra gì | Giảm mechanic đồng thời, giữ một lesson/encounter |
| Build giả | Target order không khác giữa loadouts | Sửa trigger/payoff/tradeoff, chưa thêm relic |
| Power creep | Món mới luôn thay món cũ | Sidegrade/cap, review toàn trigger stack |
| Too much reading | Draft/briefing dài hơn combat vui | Rút mô tả, progressive disclosure, pause thật |
| Punish learning | Từ yếu gây áp lực cao nhất/Chrono phạt suy nghĩ | Tách mode/buffer, giảm quota, skip an toàn |
| Performance che bằng Low | A/B không cùng scale | Khóa preset và báo budget fail rõ |
| Art-led implementation | Có ảnh rồi mới invent mechanic | Consumer/contract trước asset |
| Save corruption | Run callbacks đụng campaign references | Isolation, before/after assertions, transactional boundary |
| Impossible seed | Pool/compatibility không có solution | Deterministic fallback + reason, không retry vô hạn |
| QA diverges | Test Lab pass, game thật fail | Gọi production logic, run entry-point test |

### 24.3 Reject / merge / hold

**Reject trong scope này:** text corruption bắt buộc, mirror/reverse typing generic, absolute-WPM build gate, async global bus, duplicate target/director/evolution/archive, folder rewrite vì đề xuất, tự thêm online service/leaderboard/monetization.

**Merge vào existing:** Affix→elite; Flow→streak/audio; Awakening→Rage; Evolution→Mk/grade/mastery; learning UI→Codex/learning; Threat→adaptive/pressure; selection→reward-choice.

**Hold:** Lost Signal, Gravity Inversion, Champion 4 affix, POS-based build chưa audit, Hunter Fleet, Quantum Echo, literal punctuation input, full cinematic rollout, 20-encounter standard trước duration evidence.

### 24.4 Definition of Done một phase

- [ ] Scope được giao rõ, không lấn phase sau.
- [ ] Owner/data flow và contracts ghi rõ; không state duplicate.
- [ ] Reuse inventory/check cho code mới hơn đã làm.
- [ ] Input/reward/learning semantics không mơ hồ.
- [ ] Relevant decision-register entries đã đóng hoặc blocked minh bạch.
- [ ] Focused tests + regression + build pass; lỗi cũ và lỗi mới tách riêng.
- [ ] Test Lab gọi production path, seed tái hiện được.
- [ ] Save/migration/abandon/reload/terminal và storage failure đã kiểm nếu có impact.
- [ ] Pause/restart/transition/listeners/audio/texture cleanup đạt.
- [ ] Quality parity và text/audio accessibility đạt.
- [ ] Perf cùng baseline/preset có raw evidence; chưa đo thì ghi NOT RUN.
- [ ] Ảnh được mở xem, không chỉ tồn tại trên disk.
- [ ] Manual/fun gate thích hợp có phản hồi hoặc để OPEN, không giả pass.
- [ ] Feature flag/rollback/unknown-version policy rõ.
- [ ] Tài liệu và evidence cập nhật, không ghi “đã có” cho phần chỉ đề xuất.
- [ ] Git diff chỉ có file trong scope; không commit/push khi chưa được yêu cầu.

## 25. Handoff cho AI triển khai

### 25.1 Prompt mẫu để chủ dự án giao một phase

```text
Hãy đọc SPACE_TYPING_1000_STAGE_EXPANSION_V2_FINAL_2.md đầy đủ,
AGENTS áp dụng và docs/PROJECT_CONTEXT.md trước khi hành động.

Tôi giao phase: <Pxx/subphase cụ thể>.
Phạm vi được phép: <analysis-only / implementation + tests / art integration>.
Không làm phase khác, không tự tạo ảnh, không commit/push/deploy.

Trước sửa code:
1. Báo HEAD/branch, dirty files và current-code mapping.
2. Liệt kê prerequisite, contracts, quyết định còn mở và test IDs.
3. Nếu plan không khớp code, giải thích trước; không overwrite code mới.

Khi thực hiện:
- giữ campaign save/economy và dirty changes ngoài scope;
- reuse owner và production logic;
- test theo runbook, không coi build pass là fun/perf/save pass;
- nếu cần mở rộng scope hoặc quyết định sản phẩm chưa có, dừng điểm đó và hỏi.

Khi bàn giao:
- file/behavior đã đổi;
- commands đã chạy + kết quả thật;
- evidence seed/preset/screenshots/perf/save;
- gate PASS/FAIL/NOT RUN/BLOCKED;
- known risks và phase tiếp theo có thể giao, nhưng chưa thực hiện.
```

### 25.2 Mẫu báo cáo cuối phase

```text
Phase / scope:
Baseline HEAD / tested HEAD + local diff:
Current-code discrepancies:
Decisions closed (Dxx):
Contracts implemented:
Files changed / files deliberately untouched:
Tests (Txx → test file → command → result):
Save/isolation/recovery evidence:
Visual/audio evidence actually inspected:
Perf metadata/raw samples/comparison:
Playtest/manual gates:
Unexpected results / pre-existing failures:
Remaining risks:
Feature flag / rollback behavior:
Overall status: PASS / PARTIAL / BLOCKED
Next authorized step needed:
```

### 25.3 Khi bị chặn

Không sửa test expectation để bỏ lỗi, không nới budget cho pass, không dùng fake Test Lab implementation, không cắt yêu cầu save/quality mà không báo. Báo: blocker cụ thể, bằng chứng, phần vẫn làm được, lựa chọn giải quyết và quyết định cần chủ dự án cung cấp.

Không thể đảm bảo tuyệt đối “không còn thiếu sót” chỉ bằng tài liệu. Cách giảm bỏ sót là contracts có test ID, phase có gate, evidence có trạng thái thật, và cập nhật kế hoạch khi code/playtest cho thấy giả định sai.

## 26. Ma trận truy vết review

| Finding trong review | Được xử lý tại | Bằng chứng cần khi triển khai |
|---|---|---|
| R01 Agency/replay quá muộn | §2, §5–6, §21–22 | Time-to-choice, slice playtest trước expansion |
| R02 Run contract thiếu | §5, §18 | T01–T06, T10–T15 |
| R03 Mechanic chưa cụ thể | §8–10 | Card có counterplay/fallback + production preset |
| R04 Short/shared reward exploit | §7, §11.5, §17 | T07–T09, T18 |
| R05 Phrase/Space/target | §7, §14 | T16, T23, T30 |
| R06 Build tương tự/offer chết | §11 | Pick/contribution/target order + T06 |
| R07 Chrono/adaptive phạt học | §9–10, §13 | T17/T21 và slow-WPM/Recall playtest |
| R08 Audit không phải fun | §21.2, §23.6 | Warning/error/exception phân biệt + feedback thật |
| R09 Event refactor/collision | §17, P20 | Characterization/parity + T18 |
| R10 Seed/save fairness | §5.4, §17.6, §18, P70B | T03/T10–T15/T26 |
| R11 Mastery giả | §16 | T08/T09/T25 + learning field semantics |
| R12 Perf gate thiếu rõ | §19, §23 | Scenario metadata, raw frames, foreground confirmation |
| A01 Art batch lệch slice | §20.2 | Consumer/phase manifest |
| A02 Icons khó phân biệt | §19.1, §20.4 | Actual-size group screenshots/cue playtest |
| A03 Filename conflict | §20.2 | Approved code-to-art map thắng template E |
| A04 Runtime asset budget | §19.5, §20.1 | Resolution/load/unload/memory tests |

## Kết luận cuối

Ưu tiên tiếp theo được đề xuất là **P00 rồi P10–P30 để có một lượt chơi nhỏ, có lựa chọn, có nhịp và có lý do chơi lại**. Giữ tầm nhìn 1000 stage nhưng không dùng quy mô đó để trì hoãn việc chứng minh gameplay.

Một kết quả tốt không nhất thiết có đủ mọi mechanic trong tài liệu. Nó phải giúp người chơi nói được: **“Lượt sau tôi muốn chọn khác và xử lý khác.”**

---

**Kết thúc phần thiết kế chính. Các phụ lục dưới đây là phần của hợp đồng bàn giao, không được bỏ qua khi triển khai.**

## Phụ lục A — Ví dụ có expected outcome để AI không tự diễn giải

### A.1 Phrase chữ-only, Space vẫn Rage

**Given:** pattern PHRASE có display text `take off`, expected typed sequence `takeoff`; target đang alive, input mode chữ-only.

**When/Then:**

1. Người chơi gõ `t`, `a`, `k`, `e`: progress = 4 accepted letters; display đánh dấu phần chữ tương ứng, giữ khoảng trắng hiển thị.
2. Người chơi bấm Space: không tăng typed progress, không tính thêm correct letter, không coi là ký tự phrase sai; xử lý Rage như policy hiện hành nếu được phép.
3. Người chơi gõ `o`, `f`, `f`: một completion cho phrase, không phát thêm hai standalone completions `take` và `off`.
4. Learning record ghi loại phrase và evidence thực có, không tự cấp hai word-meaning mastery records.
5. Giữ Space trước khi draft mở: không được chuyển thành confirm draft vì keydown lặp còn trong queue.

**Test negative:** typed string sau normalization rỗng; target chết ở bước 2; phrase và target khác cùng prefix; Escape trong bước 3; key events vào input field của modal. Mỗi case phải có state assertion, không chỉ “không throw”.

### A.2 Short-word effort weighting

**Given:** một bonus thử nghiệm được định nghĩa `10 Energy / eligible perfect completion`, áp effortWeight §11.5, không chạm cap Energy để quan sát tổng thuần. Đây là ví dụ test giả lập, không phải Solar Storm value đã được duyệt.

| Input hoàn hảo | Weight/completion | Tổng Energy từ bonus mẫu |
|---|---:|---:|
| 20 token × 2 accepted letters | 0,4 | 80 |
| 8 token × 5 accepted letters | 1 | 80 |
| 4 token × 10 accepted letters | 1 | 40 |

**Ý nghĩa:** rule mẫu loại lợi thế chỉ do chẻ 5-letter workload thành 2-letter completions. Nó không làm mọi length ngang nhau; Long Word payoff là cơ chế khác cần cân bằng. Không lấy bảng này làm bảo đảm tổng sức mạnh ba build bằng nhau.

Nếu outcome là charge nguyên, dùng fractional accumulator có test, ví dụ năm completion weight 0,4 tạo tổng 2 charge chứ không 0 hoặc 5. Quy định carry/reset scope theo relic card; không bỏ phần lẻ khi đổi HUD.

**Negative tests:** gõ sai rồi đúng không tăng `acceptedTypedLetterCount` vượt chiều dài token; typo-protection không biến raw-missed thành perfect; proc completion không vào accumulator; stat cap chỉ clamp sau tính reward đúng, không tạo negative resource khi overflow.

### A.3 Shared Target và ba enemy kills

**Given:** group G có token W; hoàn thành W làm chết targets E1/E2/E3 theo recipe, đều chưa chết.

**Expected:**

- Một completionId cho W, một event typed completion, một perfect eligibility check.
- Ba kill facts có cùng causeId, mỗi target unique, origin phản ánh shared-group effect chứ không ba input mới.
- Một learning completion cho W; không bịa rằng người chơi đã gõ E1/E2/E3 nếu chúng có display identity riêng.
- Group loot/objective policy quyết định reward có thể là một group reward hoặc các bounded kill rewards; phải khai báo trước, không vô tình chạy cả hai.
- Kill E2 notification lặp lại do cleanup: không tăng kill/reward thêm lần hai.
- Nếu E3 đã chết trước completion, không phát kill fact mới cho E3. Clear gate vẫn đánh giá sống/chết thật.

### A.4 Crash trong settlement

**Given:** encounter index 2 vừa clear; settlement ID S chưa projected vào learning; người chơi có run entry snapshot R2 và campaign profile C.

**Crash điểm 1 — trước durable settlement:** reload về R2, encounter 2 replay từ đầu, marked interrupted; không có S được cấp cho profile. Không gọi Portal learning hook trước durable policy rồi cấp lại khi replay.

**Crash điểm 2 — đã ghi settlement/outbox S nhưng chưa profile projection:** reload đọc S, apply projection idempotently một lần, tiếp tục safe boundary sau encounter 2. Không quay lại R2 như chưa clear nếu authoritative journal đã commit S.

**Crash điểm 3 — profile đã nhận S, outbox chưa được dọn:** replay consumer thấy S đã applied hoặc revision tương đương, không cộng lại; dọn pending state an toàn.

**Crash điểm 4 — sau draft confirm của boundary tiếp:** reload giữ đúng món đã chọn và loadout, không tạo offer mới hoặc grant lại.

**Storage write failure:** UI không thông báo saved/advance scored run khi chưa có durable confirmation. Có retry hoặc exit-without-save path được giải thích. Test dùng mock adapter/fault injection, không cố làm đầy disk của chủ dự án.

### A.5 Isolation khi run dùng chung class Game

**Given:** campaign đã sở hữu equipment/relics/currency, start kit Expedition chuẩn hóa khác với loadout thật.

1. Snapshot các field campaign trước run bằng fixture trong test storage.
2. Start Expedition, dùng skill/consumable được cho mượn, draft/replace, chết hoặc abandon.
3. Assert deep equality cho equipment, owned relics, wallet, inventory, pity, route, campaign progression và checkpoint.
4. Assert các field được phép đổi nằm đúng result/learning namespace và mỗi projection có cause/settlement ID.
5. Về campaign, assert Game được inject lại profile thật; không chỉ assert save không đổi trong khi HUD vẫn dùng stat loaner.
6. Start run thứ hai, assert không giữ HP/status/listener/offer/particle/audio từ lượt trước.

### A.6 Boss part và phase transition cùng tick

**Given:** Cannon part còn một hit; body có một phase transition đang đủ điều kiện; typed completion vào Cannon đồng thời một skill gây damage body.

**Expected:** resolver dùng priority đã chốt, part destruction đúng một lần, interrupt nếu rule cho phép, phase mới không chờ Cannon đã chết như một target bắt buộc, current target không trỏ entity destroyed, không normal loot/learning giả từ part kill.

Test cả hai thứ tự arrival của input/skill theo event queue policy. Không chấp nhận test chỉ chạy một thứ tự ngẫu nhiên rồi pass.

## Phụ lục B — Checklist “cầm tay chỉ việc” cho phiên đầu tiên

Phụ lục này dùng khi chủ dự án giao **P00**, không tự cho phép implementation.

1. Xác nhận đang ở đúng repository game, không root repo cha; đọc AGENTS đúng scope.
2. Ghi branch/HEAD/dirty state. Nếu branch khác tên trong plan nhưng code mới hơn, báo khác biệt, không checkout cưỡng bức.
3. Đọc PROJECT_CONTEXT, FINAL 2 và VISUAL_TESTING; đọc tài liệu nguồn bổ sung khi có xung đột cần kiểm chứng.
4. Tìm bằng `rg` các entry: `handleKey`, `typingText`, word completion, relic compiler, reward choice, run start/end, save/load hooks.
5. Vẽ hoặc viết call chain một key → completion → reactions → hooks → persistence. Ghi nơi có side effect ra campaign/Portal.
6. Đọc tests tương ứng để biết invariant đang được bảo vệ, không chỉ scan tên hàm.
7. Xác nhận dependency/tool versions từ manifest, không upgrade.
8. Chọn test profile riêng; kiểm origin/storage không đụng save người dùng.
9. Chạy baseline TypeScript/test/build nếu scope P00 bao gồm checks; ghi output và exit code, không sửa lỗi ngoài scope.
10. Lập owner map + decision D01–D08 với bằng chứng; các entry chưa quyết định ghi OPEN và tác động.
11. Đo visual/performance nếu quyền và harness cho phép; không đo được thì NOT RUN với lý do, không suy từ CPU draw.
12. So từng finding R01–R12/A01–A04 với code/tài liệu hiện tại; đánh dấu đã giải quyết, còn đúng, hoặc obsolete có bằng chứng.
13. Đề xuất file list và patch sequence cho P10, chưa sửa code nếu chỉ được giao P00 inventory.
14. Gửi báo cáo theo §25.2; yêu cầu quyết định chỉ ở điểm ảnh hưởng thiết kế/authority, không bắt chủ dự án trả lời những thứ code đã cho biết.
15. Dừng tại gate. Không tự tiếp P10 vì “đã thấy cần làm”.

## Phụ lục C — Cập nhật tài liệu và quản lý sai lệch

Khi triển khai phát hiện tài liệu chưa khớp thực tế:

1. Ghi assumption cũ, bằng chứng code/test/playtest mới và phạm vi ảnh hưởng.
2. Phân loại: sửa factual reference; tune số trong phạm vi được giao; đổi behavior; đổi save/economy; mở scope.
3. Factual reference có thể cập nhật trong handoff nếu được giao docs; thay đổi behavior/save/economy/scope cần quyết định đúng thẩm quyền trước.
4. Ghi decision ID, version/date, alternatives, lựa chọn và migration/test cần bổ sung.
5. Update contract, test expectation và art manifest liên quan cùng nhau; không đổi test chỉ để khớp bug.
6. Với content/rules thay đổi, bump comparison ruleset phù hợp; không trộn PB cũ/mới mà không nhãn.
7. Duy trì một bản canonical do chủ dự án chọn; không âm thầm tạo “FINAL 3” rồi bỏ bản đang được người khác dùng.

**Hoàn tất tài liệu FINAL 2. Việc triển khai bắt đầu chỉ khi có yêu cầu phase riêng.**
