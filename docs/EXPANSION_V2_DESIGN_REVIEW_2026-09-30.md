# Đánh giá thiết kế Expansion V2 — chiều sâu và khả năng chơi lại

Ngày: 2026-09-30. Phạm vi: đánh giá ý tưởng, tính sẵn sàng triển khai, thứ tự đầu tư và prompt hình ảnh; không triển khai tính năng, không sửa code.

## 1. Kết luận

**Đạt để làm một prototype có giới hạn; chưa nên duyệt nguyên lộ trình như một đặc tả triển khai đã hoàn tất.**

V2 tiến bộ đáng kể: không tạo hệ thống song song, giữ gõ chữ làm trung tâm, bổ sung lựa chọn build, cấu trúc encounter và Expedition. Đây là các hướng có khả năng tạo chiều sâu thật, không chỉ thay hình quái.

Tuy nhiên, tài liệu hiện mạnh về **danh mục hệ thống và nguyên tắc kiến trúc**, chưa đủ cụ thể về **những quyết định thú vị người chơi thực sự đưa ra trong một lượt**. Nhãn “FINAL/Approved” trong tài liệu không chứng minh tính hấp dẫn đã được kiểm nghiệm.

Rủi ro lớn nhất: làm xong nhiều conditions, affixes, icon, refactor và boss nhưng người chơi vẫn chỉ thấy “gõ hết chữ trên màn hình”. Thêm 1000 cấu hình khác nhau không tự động tạo 1000 trải nghiệm đáng chơi.

Đề nghị duyệt có điều kiện:

- Giữ hướng thiết kế và nguyên tắc reuse-first.
- Đưa **lựa chọn build + nhịp trận + một lượt chơi ngắn hoàn chỉnh** vào prototype đầu.
- Kiểm nghiệm bằng chơi thật trước khi mở rộng danh mục và sản xuất hàng loạt hình ảnh.
- Chốt các hợp đồng input, reward, save và độ khó nêu dưới đây trước những phase liên quan.

## 2. Nguồn và giới hạn đánh giá

Đã đọc toàn bộ:

1. `docs/SPACE_TYPING_1000_STAGE_EXPANSION_V2_FINAL.md` tại repository cha — 1941 dòng, gọi tắt **D**.
2. `games/space-typing/docs/SPACE_TYPING_1000_STAGE_EXPANSION_V2_IMAGE_PROMPT_PACK.md` — 2046 dòng, gọi tắt **A**.

Đã đối chiếu có mục tiêu với code: `relics/registry.ts`, `relics/state.ts`, `events/reward-choice.ts`, `synergy/build.ts`, `logic.ts`, `Game.ts`, `main.ts`, `campaign/stage-pacing.ts`; tham khảo review đề xuất cũ và đoạn ghi chú thời lượng trong `PROJECT_CONTEXT.md`.

Repository game đang ở branch `main`, HEAD `996be26d92f416c33bce038b9a340b0e73074035` khi kiểm tra. Có các thay đổi local và asset chưa tracked; không chỉnh chúng, không fetch/pull/reset. Baseline ghi trong D cùng commit nhưng dùng tên branch khác; không coi đây là lỗi gameplay.

Đây không phải audit toàn repository, không phải kết quả playtest của V2, không phải lần đo hiệu năng mới. Các vấn đề chưa triển khai dưới đây là **rủi ro/thiếu sót thiết kế**, không được báo thành bug runtime đã xảy ra. Các dòng tham chiếu là vị trí ở thời điểm review.

## 3. Những phần nên giữ

| Hướng | Đánh giá và điều kiện |
|---|---|
| Reuse-first, Game giữ trạng thái authoritative | Đúng hướng; code đã có nhiều nền tảng. Không cần một bộ manager mới cho từng tên tính năng. |
| Encounter Recipe + Typing Pattern | Ưu tiên cao nếu làm thay đổi cách chọn mục tiêu và nhịp gõ; chưa đủ nếu chỉ đổi trọng số spawn/độ dài từ. |
| Choose 1 of 3 + relic/synergy | Rất quan trọng; lựa chọn phải có chi phí cơ hội và tác dụng thấy được ngay. |
| Expedition | Phù hợp nhất với nhu cầu chơi lại; đưa bản tối giản lên sớm hơn. |
| Macro Pacing | Cần sớm để có căng thẳng và nghỉ; không đợi mở rộng nhiều nội dung mới làm. |
| Boss parts | Có tiềm năng tạo lựa chọn “phá súng hay phá lõi”; thử một boss sau khi input/target rõ. |
| Wanted Words và tiến bộ từ vựng | Hợp bản sắc game; không đồng nhất gõ đúng với hiểu/nhớ nghĩa. |
| Hoãn cinematic, giữ chữ rõ ở mọi quality | Đúng; hiệu ứng là phần hỗ trợ, không phải bằng chứng về replayability. |
| 12 relic tổng cộng, không 12 relic mới | Tốt; giữ ID/identity hiện tại khi phù hợp, không ép đủ mỗi nhánh bằng các món gần giống nhau. |

## 4. Các điểm cần chốt hoặc điều chỉnh

Severity dưới đây chỉ mức ảnh hưởng tới thành công của expansion. Không có cơ sở gọi bất kỳ điểm nào là Critical lúc này.

### R01 — High: Vòng chơi lại và agency xuất hiện quá muộn trong roadmap

**Vị trí:** D §19, dòng 1379; §20 Phase 1C/2A/3.5/4, dòng 1575/1598/1657/1676.

**Vấn đề:** mở rộng variety diễn ra trước build vertical slice; Macro Pacing và Expedition nằm sau cả Boss 2.0. Trong campaign, Choose-1-of-3 được giới thiệu ở band 101–250, build identity ở 251–400.

**Vì sao đáng lo:** người chơi cần thấy lý do thử cách chơi khác ngay trong các phiên đầu, không sau hàng trăm màn. `PROJECT_CONTEXT.md:3812` ghi ordinary stage có *mục tiêu* 90–150 giây, manual gate còn mở. Nếu đạt band này, 100 màn tương đương khoảng 2,5–4,2 giờ combat, chưa tính nghỉ/thua. Đây là phép tính điều kiện, không phải thời lượng thực tế đã đo.

**Đề xuất:** prototype phải có lựa chọn thay đổi lối chơi ngay từ các encounter đầu; cho thấy một tương tác build trong khoảng 10–15 phút thử nghiệm. Mở sâu dần về sau, không trì hoãn agency cơ bản. Chuyển Macro Pacing và Expedition tối giản lên trước việc nhân rộng conditions/affixes/boss parts.

**Chắc chắn:** cao về thứ tự tài liệu; trung bình về tác động giữ chân, cần playtest. Không có nghĩa code hiện tại hoàn toàn chưa có chọn thưởng.

### R02 — High: Chưa mô tả đủ “một lượt chơi” và quan hệ giữa build tạm thời với tiến trình lâu dài

**Vị trí:** D §3.3, §7, §8, §12 và §17 về state/save ownership; code `src/relics/state.ts:9`, `src/events/reward-choice.ts:116`.

**Vấn đề:** “~20 encounters/run”, run-local relics, reset “as designed” chưa trả lời đủ: lượt dài bao lâu, vào bằng tàu/trang bị nào, giữ sức mạnh campaign không, chết giữ gì, khi đầy slot đổi hay bỏ, có resume không, reward được commit lúc nào.

Code đã có 6 relic và **3 slot equipped**; boss đã có lựa chọn equipment/currency/relic. Thiếu ở V2 là chính sách chuyển chúng thành build theo lượt, không phải hoàn toàn thiếu nền lựa chọn/slot.

**Vì sao đáng lo:** mang toàn bộ sức mạnh campaign vào lượt có thể làm việc draft mất ý nghĩa; bỏ hết sức mạnh mà không giải thích lại làm progression vô nghĩa. Nếu 20 encounters dùng nguyên thời lượng ordinary stage mục tiêu hiện tại, riêng combat có thể thành 30–50 phút, chưa chắc là lượt ngắn.

**Đề xuất:** viết run contract một trang: duration target, start kit, slot/replacement, cadence thưởng, điều kiện thắng/thua/abandon, bảng reset/keep/commit cho từng tài nguyên. Prototype 8–10 encounter, mục tiêu thử khoảng 12–20 phút, là đề xuất để đo chứ không phải định mức đã chứng minh. Encounter có thể ngắn hơn stage campaign; không cần đổi campaign để ép đủ thời lượng.

**Chắc chắn:** cao về phần chưa chốt; rủi ro độ dài phụ thuộc cách triển khai encounter.

### R03 — High: Tên mechanic đã rõ hơn luật chơi và cách đối phó

**Vị trí:** D §3.1, dòng 228; §5, dòng 672; §20 Phase 1B, dòng 1532.

**Vấn đề:** bốn Sector Conditions có tên, acceptance và visual resources nhưng chưa có hợp đồng gameplay cụ thể. Recipe có roles/patterns/weights, song chưa bảo đảm người chơi phải quyết định khác.

**Vì sao đáng lo:** có thể triển khai đúng mọi interface nhưng vẫn chỉ thành đổi tốc độ, thêm glow, thêm nhãn. Review cũ có ví dụ mechanic, nhưng D tuyên bố supersede review đó; người triển khai không nên phải tự đoán phần nào còn hiệu lực.

**Đề xuất:** trước code, mỗi mechanic có thẻ ngắn: tín hiệu → hành động người chơi → thời điểm có hiệu lực → phần thưởng/hậu quả → cách đối phó → fallback → tổ hợp cấm. Ví dụ Fortress Siege phải làm rõ khi nào chọn diệt support trước đáng hơn đánh mục tiêu chính; không chỉ “nhiều quái giáp”. Chọn 2–3 mechanic có các quyết định thực sự khác nhau để thử.

**Chắc chắn:** cao về độ thiếu cụ thể; chưa thể kết luận mechanic sẽ chán khi chưa chơi.

### R04 — High: Short Burst/Shared Target có thể phá kinh tế trigger và dữ liệu học

**Vị trí:** D §4 dòng 595, §11 dòng 966; `src/Game.ts:6375`, `src/Game.ts:7015`, `src/relics/registry.ts:48`.

**Vấn đề:** code hoàn thành một từ gọi passive/Relic/perk; perfect word có thể hồi Shield cho Aegis, tăng Power cho Oracle, kích hoạt chain. Thay từ bình thường bằng nhiều từ một ký tự làm số lần kích hoạt trên cùng lượng gõ tăng mạnh. Shared Target còn đặt câu hỏi một lần gõ hạ nhiều quái là mấy word completions/learning events.

**Vì sao đáng lo:** build “gõ từ ngắn” có thể thắng không vì quyết định hay mà vì tận dụng đơn vị đếm; đánh lan có thể vô tình tạo learning credit cho từ không thực sự gõ. Ngược lại, chia tất cả reward theo ký tự một cách máy móc cũng có thể xóa bản sắc các build.

**Đề xuất:** định nghĩa rõ typed completion, kill, proc-generated kill và learning completion; event có nguồn gốc/target ID/pattern ID. Cân reward theo công sức và mục đích từng trigger, có cap/cooldown khi phù hợp; không cho damage proc tự giả làm perfect typed word. Test cùng tổng ký tự nhưng phân bổ short/normal/long khác nhau, và một shared word hạ nhiều quái.

**Chắc chắn:** cao về các trigger hiện hữu; exploit V2 là rủi ro có điều kiện, chưa phải bug đang tồn tại.

### R05 — High: PHRASE/BOSS_SENTENCE thiếu quyết định input tương thích

**Vị trí:** D §4, §3.7; `src/logic.ts:11`, `src/Game.ts:3304`, `src/main.ts:8709`.

**Bằng chứng:** `typingText()` bỏ mọi ký tự ngoài a–z; `handleKey()` dùng Space kích hoạt Overdrive/Rage và chỉ nhận chữ a–z cho typing.

**Vấn đề:** hiển thị một phrase không đồng nghĩa engine gõ được khoảng trắng/dấu câu. Nếu đổi normalize chung, nhiều target, tiến độ gõ, Recall và thống kê có thể đổi hành vi. Boss nhiều part còn cần luật ưu tiên khi các từ cùng prefix.

**Đề xuất:** chốt một trong hai hướng rõ ràng: (a) phrase có ngữ nghĩa nhưng chỉ gõ chữ, UI hướng dẫn nhất quán; hoặc (b) literal phrase typing với input mode/đổi phím Rage và migration controls tương ứng. Quy định chuyển target, Backspace/Escape, shared-prefix, target biến mất, bàn phím/layout. Không lặng lẽ biến dữ liệu collocation thành đặc tả phím mới.

**Chắc chắn:** cao về code và xung đột nếu yêu cầu literal typing; không khẳng định phrase là bất khả thi với engine hiện tại.

### R06 — Medium: Các build family có nguy cơ giống nhau hoặc thưởng kép cho cùng hành vi

**Vị trí:** D §3.3 dòng 353, §3.8, §7; `src/relics/registry.ts`, `src/synergy/build.ts:34`.

**Vấn đề:** Precision và Combo đều dễ quy về “gõ đúng liên tục”; Flow cũng thưởng streak. Recall là một loại hoạt động/chế độ, khác bản chất với các nhánh còn lại. Chia đều 12 relic vào 4 family không bảo đảm tạo 4 chiến thuật.

**Đề xuất:** với mỗi build ghi một câu “người chơi ưu tiên hành động nào, phải bỏ qua điều gì”. Ví dụ Precision chọn một đích đáng giá để tích lũy đòn; Combo chọn chuỗi mục tiêu ngắn để duy trì nhịp; Long Word chấp nhận cam kết dài để có burst. Đây là ví dụ thiết kế, cần cân bằng. Offer Recall chỉ khi lượt bảo đảm có cơ hội sử dụng; cho phép thay món/pivot khi điều kiện thay đổi. Hiện đầy đủ effect của món chưa khám phá; có thể giấu tên synergy/phần thưởng khám phá, không giấu thông tin cần để chọn.

**Chắc chắn:** trung bình; cần kiểm chứng bằng quan sát thứ tự chọn mục tiêu, không chỉ bảng DPS.

### R07 — Medium: Chrono và adaptive có thể phản tác dụng với việc đọc/học và cảm giác mạnh lên

**Vị trí:** D §3.2 dòng 304, §3.9 dòng 553, §9, §13.

**Vấn đề:** Chrono nhanh lên khi dừng gõ chưa phân biệt nghỉ đọc, nhớ nghĩa, chờ target hay mất focus. Đồng thời Flow/build tăng hiệu quả còn adaptive có thể tăng áp lực, làm người chơi không cảm nhận lợi ích vừa chọn.

**Đề xuất:** Chrono có telegraph/grace window, clock gameplay pause-safe; dùng đúng ngữ cảnh, không phạt cửa sổ Recall/đọc bắt buộc. Adaptive chậm và có giới hạn rõ; không lập tức bù sạch sức mạnh build. Tách áp lực theo workload cần gõ, deadline và cơ hội đọc, không chỉ enemy count. Dùng lại pressure model hiện hữu, mở rộng cost cho pattern/group mới.

**Chắc chắn:** trung bình; chưa có thông số/tổ hợp chạy thật để kết luận độ khó sai.

### R08 — Medium: Variety Audit không thay cho bằng chứng người chơi muốn chơi lại

**Vị trí:** D §18 dòng 1336; Phase 1C dòng 1588; Phase 2A dòng 1608.

**Vấn đề:** tránh 4 màn liên tiếp cùng pattern có thể khiến hệ thống đổi mechanic quá thường xuyên. Một scheduler ít lặp vẫn có thể tạo những trận đều giống nhau về quyết định; lặp có chủ đích lại hữu ích để làm chủ một mechanic.

**Đề xuất:** audit là guardrail cho tổ hợp bất công và phân bố, không phải điểm số “fun”. Cho phép đoạn tập luyện/recovery và curated repetition. Đo bằng playtest: người chơi có hiểu lựa chọn, thay đổi target order, kể được điều đặc biệt vừa xảy ra, và tự muốn thử build khác không. Không dùng entropy/số seed làm bằng chứng retention.

**Chắc chắn:** cao về giới hạn của audit; các ngưỡng cụ thể phải điều chỉnh bằng dữ liệu.

### R09 — Medium: Event pipeline hợp lý nhưng migration toàn diện không nên chặn việc kiểm chứng gameplay

**Vị trí:** D §11 dòng 966; Phase 0B–0D dòng 1456–1510.

**Vấn đề:** migration chia nhỏ là tốt, nhưng tổng scope vẫn bao phủ gần toàn bộ combat trước prototype. Thứ tự “statistics trước” và command `blockDamage()` chưa nói hit là sự kiện trước hay sau khi áp damage. `WORD_COMPLETED` và `PERFECT_WORD` chưa có quy tắc chống double count.

**Đề xuất:** migrate tối thiểu các trigger cần cho slice, có test giữ behavior; mở rộng tiếp khi cần. Phân biệt intent/pre-resolution với fact/post-resolution, quy định causal ID/proc nguồn, thứ tự apply command và chống đếm đôi. Recursion cap là bảo vệ cuối, không phải chính sách gameplay âm thầm bỏ reward khi quá tải. Không tạo async bus mới.

**Chắc chắn:** cao về khoảng trống contract; lợi ích chia lại roadmap là đề xuất kỹ thuật, không khẳng định refactor hiện tại chắc chắn thất bại.

### R10 — Medium: Daily Seed, cá nhân hóa học và sức mạnh meta chưa có hợp đồng so sánh

**Vị trí:** D §8 dòng 835, §9, §10.2, §17 save/migration.

**Vấn đề:** cùng seed chưa đủ để so điểm nếu vocabulary/profile, đồ mở khóa, adaptive và rule version khác nhau. Wanted Words cá nhân hóa còn có thể thay workload của cùng một encounter. Save ownership đã được đề cập nhưng chưa đủ để xác định giao dịch reward run/campaign.

**Đề xuất:** MVP ưu tiên personal best theo cùng preset. Nếu làm challenge so sánh, khóa/ghi rõ seed + rules/content version + word pool + loadout + difficulty/assist; tách personal-learning run khỏi chuẩn thi điểm. Chốt reward commit khi clear/abandon/death/crash để tránh duplicate hoặc mất thưởng. Không cần thêm server/leaderboard online cho slice đầu.

**Chắc chắn:** cao về điều kiện cần cho so sánh; tài liệu chưa hứa leaderboard công khai nên không đánh giá thiếu backend là lỗi.

### R11 — Medium: Learning progression cần tránh “mastery giả”

**Vị trí:** D §9 dòng 879.

**Vấn đề:** gõ đúng khi nhìn chữ, nhớ cách viết khi có gợi ý và hiểu/nhớ nghĩa là các tín hiệu khác nhau. Wanted Word xuất hiện dày có thể làm người chơi thấy bị phạt vì từ khó, dù ý định tài liệu là không phạt.

**Đề xuất:** giữ riêng typing accuracy và Recall accuracy như D đã hướng tới; thêm chính sách khi nào đủ bằng chứng nâng mastery, kiểm tra lại ở phiên sau, giới hạn quota từ yếu, cho skip/ôn nhẹ không phá run. Thử loop nhỏ “gặp từ → được giải thích → thử lại có kiểm soát → thấy tiến bộ” sớm; hoãn UI constellation lớn. Đây là đề xuất sản phẩm, chưa có dữ liệu chứng minh tăng khả năng học.

**Chắc chắn:** trung bình về hiệu quả của loop đề xuất; cao rằng perfect typing đơn lẻ không đủ chứng minh nhớ nghĩa.

### R12 — Medium: Performance gate có hướng đúng nhưng tham chiếu và tiêu chí còn thiếu cụ thể

**Vị trí:** D §15 dòng 1197; Phase 0A dòng 1437.

**Vấn đề:** “equivalent to P2/P6” không chỉ rõ report/version/symptom. p95 ≤20 ms một cảnh chưa bao phủ chuyển World, lần tải asset đầu, session dài, key-to-feedback hoặc nhiều hiệu ứng tương tác. Không được coi kết quả đo cũ là baseline hiện tại đã pass.

**Đề xuất:** ghi tên issue và nguồn chính xác; đo baseline trên commit thực sự chuẩn bị triển khai, cùng hardware/browser/viewport/DPR/preset. Giữ p95 nhưng bổ sung p99/max, frame rớt, độ trễ phản hồi phím và memory qua nhiều lượt/World. Cảnh mới phải so với cùng kịch bản cũ ở cùng quality; không dùng tự hạ resolution để che regression.

**Chắc chắn:** cao về độ thiếu chặt chẽ của gate; review này không khẳng định các vấn đề hiệu năng cũ còn nguyên.

## 5. Đánh giá riêng image prompt pack

### Điểm tốt

- 58 prompt có phân nhóm/status, không mặc định yêu cầu tạo tất cả ngay.
- Nhóm relic phải map registry trước; giữ lại identity đã có.
- Hoãn cinematic và boss-part sprites cho đến khi biết layout/anchor thật.
- Có yêu cầu alpha thật, margin, silhouette, không text/collage, không đổi palette theo ảnh trước.
- Phân biệt source art và runtime; không yêu cầu đưa toàn bộ PNG gốc vào game.

### A01 — Medium: Batch 1 không khớp phạm vi vertical slice

**Vị trí:** A dòng 1835–1848 so với D dòng 1532–1573.

Batch 1 yêu cầu 4 conditions + 9 elite/affix + 8 patterns, trong khi Phase 1B chỉ chọn 2 conditions, 2 affix mới, 3 patterns. Recipe là thành phần của 1B nhưng icon lại ở Batch 3. Đây là mâu thuẫn cụ thể giữa thứ tự art và scope implementation.

**Sửa đề xuất:** batch đầu chỉ gồm asset xuất hiện trong slice đã duyệt. Dùng placeholder/icon hiện có cho prototype; duyệt art sau khi mechanic/UI ổn. Không biến danh sách 58 prompt thành backlog phải hoàn thành mới được playtest. **Chắc chắn: cao.**

### A02 — Medium: “Premium icon” chưa bảo đảm phân biệt nhanh trong HUD

**Vị trí:** A §3–4, B05/B08, D01–D04, §23.

Nhiều mẫu cùng dùng core + ring + cyan/violet + echo. Chrono và Phase đặc biệt gần nhau về visual vocabulary. Pack yêu cầu đọc ở 64–96 px, nhưng HUD nhỏ hơn nếu có sẽ cần tiêu chuẩn riêng. Việc cấm nhiều biểu tượng thông dụng có thể làm icon đẹp nhưng khó đoán chức năng.

**Sửa đề xuất:** test theo nhóm ở kích thước UI thật, nền sáng/tối và thang xám; không chỉ duyệt từng ảnh 1024 px. Phân biệt bằng silhouette và motion cue, không chỉ màu. Tách illustrated icon cho Codex/reward khỏi dấu combat nhỏ/procedural cue. Giữ chất lượng art nhưng cho phép ký hiệu đơn giản ở nơi đọc nhanh quan trọng; không bắt icon trừu tượng tự giải thích toàn bộ luật, cần nhãn/ngắn gọn khi giới thiệu. **Chắc chắn: trung bình**, chưa có bộ ảnh thành phẩm để kiểm tra nhầm lẫn thực tế.

### A03 — Low: Quy tắc filename chung mâu thuẫn ngoại lệ nhóm relic

**Vị trí:** A §13 dòng 1009 trở đi; §24 gần cuối file.

Nhóm E yêu cầu adapt filename theo canonical roster; §24 lại nói dùng chính xác filename trong pack. Hai hướng này cần có thứ tự ưu tiên rõ.

**Sửa đề xuất:** approved mapping/manifest thắng filename template nhóm E. Các nhóm còn lại dùng tên pack. **Chắc chắn: cao.**

### A04 — Medium: Cần production manifest trước khi tích hợp, không chỉ prompt đẹp

**Vị trí:** A §4, §8, §23; D §14.1.

Source PNG 1024×1024 là hợp lý để lưu master, không có nghĩa phải dùng nguyên size lúc chạy. Nếu cả 58 ảnh RGBA 1024² cùng được decode, riêng pixel base đã khoảng **232 MiB** (`58 × 1024 × 1024 × 4`), chưa tính bản sao/mipmap. Đây là tình huống giả định để thiết kế budget, **không phải memory hiện tại hay hậu quả tất yếu của pack**.

**Sửa đề xuất:** manifest ghi feature consumer, kích thước hiển thị, runtime resolution/format, alpha, load/unload group, byte/pixel budget, fallback và canonical ID. Chỉ preload phần cần. Kiểm alpha thực tế bằng file, không tin prompt đã tự bảo đảm. **Chắc chắn: cao về phép tính; trung bình về rủi ro runtime tùy tích hợp.**

## 6. Prototype nên duyệt trước

Đây là thứ tự đề xuất thay cho việc triển khai nguyên roadmap, không phải lệnh tự triển khai.

1. **Baseline và contract tối thiểu:** xác nhận hiệu năng hiện tại; chốt input, reward event, start/end run và save boundary. Chỉ migrate trigger cần dùng.
2. **Một lượt hoàn chỉnh:** 8–10 encounter, một World hoặc tập art đang có, 3 recipe, 2–3 pattern, nhịp căng/nghỉ, một boss cũ làm kết thúc.
3. **Lựa chọn có tác dụng ngay:** reuse 6 relic hiện tại, chỉnh/chọn một subset phù hợp và chỉ thêm món cần thiết để chứng minh 2 build khác nhau. Không yêu cầu đủ 4 family hay 12 món trước khi test. Có 3–4 điểm lựa chọn và ít nhất một cơ hội đổi hướng build.
4. **Một condition rõ:** luật dễ giải thích, reuse visual; chỉ thêm affix mới nếu cần chứng minh quyết định khác. Không mặc định Chrono phải là mechanic đầu tiên.
5. **Kết thúc có lý do chơi lại:** summary cho biết lựa chọn nào tạo tác dụng, một hướng build khác có thể thử, replay cùng preset hoặc lượt mới. Không cần Daily/server/Nemesis ngay.
6. **Sau playtest mới mở rộng:** roster 12, thêm combinations, boss parts, route chains, learning UI sâu; cinematic cuối.

Campaign vẫn giữ vai trò mở World, kể hành trình, dạy hệ thống. Expedition dùng các hệ thống đó tạo lượt ngắn và lựa chọn mới. Không cần hai combat engine, cũng không cần dồn toàn bộ mechanic vào mọi mode.

## 7. Ý tưởng bổ sung đáng thử — không thêm một loạt hệ thống mới

### 7.1 “Gõ để tạo lợi thế”, không chỉ “gõ để xóa quái”

Ví dụ một support đang truyền Shield cho mục tiêu lớn; hoàn thành từ support đúng cửa sổ sẽ chuyển một phần lá chắn thành bonus cho người chơi. Người chơi chọn kết liễu ngay cho an toàn hay trì hoãn ngắn để lấy lợi thế, vẫn có lối đánh bình thường nếu bỏ qua.

Giá trị: lựa chọn về thứ tự và thời điểm, không cần gõ thêm phím kỹ năng. Rủi ro: chờ đợi có thể làm đứt nhịp; giới hạn thành encounter chọn lọc, không dùng timed window quá hẹp hoặc đo theo WPM cố định. Triển khai bằng recipe/target state hiện hữu nếu thử, không lập thêm manager.

### 7.2 “Biết trước một phần” để chọn đường theo build

Trước nhánh, cho thấy mechanic chính và loại phần thưởng: đông quái/ngắn từ để khai thác chain, hoặc ít mục tiêu/từ dài để lấy burst reward. Không chỉ đổi nhãn “easy/hard”.

Đây là làm sâu route/Expedition đã đề xuất, không phải phát minh một hệ thống route khác. Giá trị là biến build thành công cụ đưa quyết định; tránh luôn có một đường lợi hơn bất kể build.

### 7.3 Một lần salvage để cứu build lệch

Ở điểm nghỉ, cho đổi một relic đã chọn thành một lựa chọn phù hợp hơn, có chi phí cơ hội rõ. Nhờ đó người chơi có thể thử món lạ mà không cảm thấy lượt đã hỏng từ đầu.

Giá trị: tăng khả năng thử nghiệm; reuse station/shop và quy tắc 3 slot. Không cần tiền tệ mới. Cần giới hạn để các lựa chọn đầu lượt vẫn có trọng lượng.

### 7.4 “Biến thể chiến thuật” của encounter quen, không chỉ gặp điều mới mãi

Một encounter giới thiệu support/shield ở đầu lượt; cuối lượt tái xuất hiện cùng dấu hiệu nhưng thêm một biến đổi có chủ đích. Người chơi nhận ra mình biết xử lý tốt hơn hoặc build mới giải quyết khác đi.

Giá trị: tạo cảm giác làm chủ và câu chuyện nhỏ trong lượt; reuse Macro Pacing/recipe, cho phép repetition có chủ đích. Không thêm enemy/art chỉ để có tên mới.

Chỉ nên chọn **một hoặc hai** ý trên cho vòng thử tiếp theo. Tăng số ý tưởng không phải mục tiêu của lần review này.

## 8. Cách quyết định có mở rộng tiếp hay không

Đề nghị playtest định tính nhỏ trước, ví dụ 5–8 người có tốc độ gõ khác nhau, gồm người chơi cũ và người mới; đây là vòng tìm lỗi thiết kế, không đủ để tuyên bố retention tăng có ý nghĩa thống kê.

Mỗi người thử hai lượt có build khác nhau. Quan sát và hỏi:

- Sau vài encounter, họ giải thích được lựa chọn của mình mà không cần đọc tài liệu không?
- Hai build có làm đổi mục tiêu ưu tiên/nhịp xử lý, hay chỉ đổi damage và màu hiệu ứng?
- Khi thua, họ biết lần sau muốn đổi điều gì ngoài “gõ nhanh hơn” không?
- Họ có tự muốn thử lại hay chỉ tiếp tục vì người test yêu cầu?
- Có một lựa chọn mà gần như ai cũng lấy bất kể tình huống không?
- Người gõ chậm/đang Recall còn cảm thấy có quyền quyết định không?
- Chữ, cue và phản hồi phím có rõ khi nhiều mechanic cùng chạy không?

Ghi duration, số lần đổi target, offer/pick, proc contribution và lý do bỏ lượt ở mức cần thiết; không thêm telemetry cloud mặc định. So với bản hiện tại trong điều kiện gần nhau, phân biệt hứng thú vì nội dung mới với mong muốn thử chiến thuật mới sau vài lượt.

**Không mở rộng danh mục nếu:** người chơi không phân biệt được hai build; lựa chọn không ảnh hưởng cách chơi; chỉ một chiến thuật thắng; độ khó đến từ khó nhìn/giật; hoặc lượt thử quá dài khiến ít ai muốn bắt đầu lượt thứ hai. Chỉnh vòng chơi trước, chưa vội thêm icon/boss.

## 9. Nội dung ngắn gửi AI triển khai

> V2 được duyệt về hướng, chưa được duyệt như đặc tả hoàn chỉnh. Trước triển khai rộng, bổ sung: run contract và bảng permanence, thẻ gameplay/counterplay của slice, input contract cho phrase và boss parts, chuẩn reward/proc/learning events, offer/replacement policy, scope event migration tối thiểu, performance baseline có scenario, art manifest theo đúng slice. Đưa Choose-1-of-3, Macro Pacing và Expedition nhỏ lên sớm. Dùng playtest chứng minh hai build tạo quyết định khác nhau rồi mới mở rộng 12 relic/conditions/affixes/bosses. Không tự triển khai từ nội dung review này nếu chủ dự án chưa yêu cầu.

**Chốt:** game cần nhiều cách giải quyết một tình huống và lý do thử lại, không chỉ nhiều tình huống được đặt tên khác nhau. V2 có nền phù hợp để đạt điều đó, nhưng cần thay thứ tự kiểm chứng và chốt luật chơi trước khi tăng khối lượng sản xuất.
