# Space Typing — Plan riêng: chống xung đột từ cho Voice / Hybrid

Ngày: 2026-10-04.

**Trạng thái: đặc tả cần triển khai; chưa sửa code, chưa xác nhận runtime đã khắc phục.**

Tài liệu đi kèm [Voice Input Platform + Space Typing — Final V2](VOICE_INPUT_PLATFORM_SPACE_TYPING_3_MODE_FINAL_V2_2026-10-04.md). Khi giao AI triển khai Voice/Hybrid, phải gửi cả hai file. Tài liệu này cụ thể hóa mục 11 của Final V2; không thay thế các luật ownership, audio freshness, reward, persistence và coverage trong đó.

## 1. Quyết định cần thực hiện

1. Tận dụng bộ chọn từ, rank/difficulty và lịch sử tránh lặp đang có; không xây một hệ thống random từ độc lập cho Voice.
2. Trong Voice/Hybrid, không cho hai đơn vị tương tác đồng thời có từ trùng nhau hoặc **toàn bộ từ này là tiền tố của từ kia**, ví dụ `react` / `reactor`.
3. Áp dụng trên toàn bộ mục tiêu có thể tương tác trong cùng ngữ cảnh combat: không chỉ giữa các enemy.
4. Từ đã bắt đầu typing không nhận voice, nhưng vẫn giữ chỗ trong tập chống xung đột cho đến khi đơn vị đó kết thúc. Không dùng danh sách voice-eligible làm toàn bộ danh sách chống xung đột.
5. Không ép sinh từ xung đột khi hết ứng viên. Có quy trình chờ, xử lý nội dung bắt buộc và báo lỗi rõ ràng.
6. Giữ hành vi chọn từ Typing-only hiện tại trong phạm vi thay đổi này. Muốn siết luật Typing-only phải là quyết định sản phẩm riêng, có regression và cân bằng lại.
7. Không mở Voice/Hybrid cho Duel trong release này; chỉ tham khảo quy tắc prefix tốt đã có của Duel.

“Triển khai” ở đây là làm đầy đủ cho production scope được công bố. Unit test, shadow diagnostics và benchmark là bước kiểm chứng bắt buộc, không phải tính năng thử nghiệm thay thế sản phẩm thật. File plan không tự cho phép commit/push hay sửa code khi chưa có yêu cầu triển khai.

## 2. Hiện trạng đã kiểm tra trong source

Các vị trí dưới đây được đọc từ working tree; tra bằng tên hàm vì số dòng có thể thay đổi. Không coi HEAD là toàn bộ trạng thái máy người dùng.

| Vị trí | Hành vi hiện tại | Hệ quả |
|---|---|---|
| `src/typing/prefix-clarity.ts`: `prefixConflictBreakdown`, `clarityOrderEntries` | Tính điểm phạt rồi sắp xếp theo độ rõ prefix | Điểm phạt không phải lệnh cấm |
| `src/enemies/stage-word-variety.ts`: `StageWordLedger.pick` | Loại exact duplicate theo `typingText`; vẫn xếp hạng ứng viên prefix bằng điểm, kết hợp độ mới và difficulty | `react` / `reactor` vẫn có thể qua selector |
| `src/Game.ts`: `activeEnemyWords`, `selectVariedEnemyEntry` | Thu từ enemy, selector thêm boss; có bypass khi Test Lab bật | Chưa phải tập chống xung đột thống nhất cho mọi mục tiêu |
| `src/Game.ts`: `spawnEnemy` | `wanted ?? selectVariedEnemyEntry(...)` | Wanted entry đi vòng qua selector này |
| `src/Game.ts`: `pickBossEntry`, `pickEnemyLayerEntry` | Có fallback `?? preferred` / `?? entry` | Nếu chỉ siết selector mà giữ fallback, caller vẫn có thể nhận từ không an toàn |
| `src/Game.ts`: `spawnSupplyPod`, `spawnTreasureDrone` | Chọn ngẫu nhiên từ nguồn theo độ dài, có fallback | Không qua bộ lọc prefix toàn combat |
| `src/duel/word-director.ts`: `prefixConflict`, `isSafeCandidate`, `issuePrompt` | Kiểm tra `startsWith` hai chiều với active/reserved tokens; không có safe candidate thì trả `null` | Đã có tiền lệ hard prefix rule, nhưng chỉ trong phạm vi dữ liệu đưa vào director |

Kiểm chứng selector đã thực hiện: với pool nhỏ chỉ chứa `react`, `reactor`, ghi nhận một từ đang active rồi gọi `StageWordLedger.pick`, selector có thể chọn từ còn lại ở cả hai chiều. Điểm conflict là 104, không phải exact duplicate. Đây là bằng chứng đường code cho phép, **không phải bằng chứng đã quan sát hai từ này cùng xuất hiện trong stage hiện tại của người dùng**. Việc thực sự xuất hiện còn phụ thuộc nguồn vocabulary và lịch spawn.

Carrier, splitter, formation, boss counter, Recall và các nhánh special khác phải tiếp tục được audit ở bước triển khai. Không kết luận mọi nhánh này đều sai chỉ vì chưa đi qua kiểm tra trên.

## 3. Luật xung đột: hard filter trước, soft ranking sau

| Quan hệ | Ví dụ | Chính sách Voice/Hybrid |
|---|---|---|
| Cùng canonical typing key | `React` / `react` | Không cùng được admit trong ngữ cảnh tương tác |
| Một từ là toàn bộ tiền tố của từ kia | `react` / `reactor`, theo cả hai chiều | Hard reject |
| Chỉ chung chữ đầu | `red` / `robot` | Không cấm tuyệt đối; dùng điểm clarity để ưu tiên |
| Chung nhiều chữ đầu nhưng không chứa toàn bộ nhau | `reactor` / `reaction` | Không tự bị cấm bởi luật full-prefix; vẫn chịu soft ranking và kiểm tra spoken forms |
| Spoken form/alias trùng nhau | Hai unit nhận cùng một lời nói | Hard conflict trong cùng ngữ cảnh; không chọn nearest để đoán |
| Homophone đã biết trong content | `right` / `write` | Không đồng thời admit làm hai đáp án voice khác nhau |
| Hai từ xuất hiện ở các thời điểm không chồng nhau | `react` kết thúc rồi mới đến `reactor` | Được phép, nhưng result/audio cũ không được đánh target mới |

### 3.1 Normalization

- Giữ riêng display text, canonical typing key và spoken forms. Không gộp ba khái niệm thành một field.
- Tái sử dụng `typingText` cho quan hệ ký tự hiện có, kiểm thử rõ case, dấu câu và khoảng trắng; không mặc định hàm này là bộ chuẩn hóa phát âm.
- Full-prefix predicate áp dụng hai chiều trên key không rỗng: `a.startsWith(b) || b.startsWith(a)`. Key rỗng là nội dung không hợp lệ, không dùng làm một prefix chặn toàn pool.
- Kiểm tra mọi alias được engine thật sự chấp nhận. Không thêm alias ngắn tùy tiện để tăng recognition vì có thể tạo collision mới.
- Homophone dùng metadata/lexicon có provenance và phiên bản; không tự suy ra “không xung đột phát âm” chỉ vì chữ khác nhau. Với custom vocabulary thiếu phonetic metadata, ghi rõ giới hạn, preflight tokenization và giữ matcher no-match/ambiguous; không hứa bao phủ mọi giọng nói.
- Không thêm một model AI phụ hoặc remote API để kiểm tra từng cặp từ mỗi lần spawn.

### 3.2 Thứ tự lựa chọn

1. Xác định nguồn vocabulary và ràng buộc mechanic/rank/difficulty hợp lệ.
2. Loại ứng viên không hợp lệ, hard conflict với reservations hiện tại và batch đang chuẩn bị.
3. Trong phần còn lại, áp dụng ledger tránh lặp, soft clarity, khoảng difficulty và random có kiểm soát như hệ thống hiện có.
4. Kiểm tra lại tại thời điểm commit spawn/đổi unit nếu trạng thái đã thay đổi trong lúc chuẩn bị.
5. Chỉ record lịch sử dùng từ sau admission thành công; rollback reservation và ledger nếu cả formation thất bại.

Không được để ưu tiên “từ chưa dùng” thắng hard conflict. Không mở rộng sang từ ngoài bộ học hay ngoài difficulty policy chỉ để đủ số enemy.

## 4. Một inventory mục tiêu, hai góc nhìn

Dùng chung inventory/lifecycle identity với registry của Final V2. Không tạo một danh sách spawn và một danh sách voice độc lập rồi hy vọng chúng tự đồng bộ.

- **Reservations:** các đơn vị đang tương tác, bao gồm KEYBOARD_OWNED và các đơn vị đã được giữ chỗ trong batch admission. Dùng để xét từ mới có được xuất hiện không.
- **Voice eligibility:** tập con được phép nhận kết quả voice lúc này, phụ thuộc ownership, mechanic window, ready ACK và các điều kiện Final V2.

Ví dụ: A = `react`, người chơi đã gõ `rea`. A không còn voice-eligible, nhưng reservation vẫn là **toàn bộ `react`**, không phải phần còn lại `ct`. Không spawn B = `reactor` chỉ vì A đã biến mất khỏi voice snapshot.

### 4.1 Phạm vi phải rà soát

- Enemy thường; carrier/splitter/minion/formation và respawn.
- Đổi layer/word trên enemy; boss word và counter word.
- Supply pod, treasure drone, bonus và mọi mục tiêu phụ thật sự nhận input.
- Recall, puzzle, wanted word, scripted answer và các input context đặc biệt.
- Restore/checkpoint, stage transition, restart, mode transition theo quyền chuyển mode trong Final V2.

Chỉ xét context có thể tương tác đồng thời. Text trang trí, tên HUD, đáp án ở modal đã khóa combat không mặc định tranh cùng input. Phải chứng minh boundary bằng input priority map, không loại mục tiêu khỏi inventory chỉ để tránh bị phát hiện collision.

### 4.2 Identity và lifetime

- Reservation gắn với target/unit identity, không dùng chữ làm ID.
- Khi đổi layer: chuẩn bị và kiểm tra unit mới; thay reservation cũ bằng mới theo transaction, không tự conflict với unit đang được thay thế. Vẫn xét mọi unit khác.
- Khi target kết thúc/despawn hợp lệ: release reservation đúng một lần. Pending result của unit cũ bị chặn bằng version/audio provenance, không chuyển sang unit mới cùng chữ.
- Khi prepare spawn async hoặc nhận ready ACK trễ: validate lại reservation/version trước khi bật tương tác. Không giữ reservation rò rỉ nếu request bị hủy.
- Formation kiểm tra từng thành viên với cả targets live lẫn các từ đã giữ chỗ trong cùng batch. Không check mọi thành viên trên một snapshot trống giống nhau.
- Pause/resume không xóa ownership/reservation. Reset session phải hủy pending admissions và kết quả cũ.

## 5. Hết từ an toàn: không có fallback xuyên qua luật

### 5.1 Spawn thông thường và bonus

1. Duyệt tập ứng viên trong các cửa sổ difficulty đang được policy cho phép, với công việc có giới hạn.
2. Nếu không có từ an toàn, trả trạng thái có nghĩa rõ ràng, ví dụ `deferred: no-safe-candidate`, không trả lại preferred mặc định.
3. Giữ yêu cầu spawn pending có giới hạn; retry khi reservation/context thay đổi hoặc theo scheduler có backoff. Không random vô hạn, không quét lại toàn bộ vocabulary mỗi frame.
4. Chưa sinh thì chưa bắt đầu lifetime/timer của target và chưa ghi bonus missed, completion hay reward.
5. Khi có slot từ an toàn, admission lại theo luật bình thường. Không tích hàng đợi vô hạn rồi xả dồn tất cả vào một frame.

Phân biệt “chưa có từ an toàn tại thời điểm này” với “content không thể hoàn thành”. Pool `react` + `reactor` có thể dùng tuần tự; không được từ chối toàn bộ bộ học chỉ vì hai từ xung đột nếu chưa bao giờ bắt buộc đồng thời.

### 5.2 Boss, layer và đáp án authored bắt buộc

- Không dùng `?? preferred`, `?? entry` hay `FALLBACK_ENTRIES` sau một hard rejection để vẫn tiếp tục combat.
- Với nội dung cho phép thay đáp án: chọn một đáp án tương đương theo policy đã duyệt, **trước khi hiển thị**.
- Với đáp án cố định: sắp lịch context để không trùng cửa sổ, trước khi bắt đầu đòn/timer bắt buộc. Không đổi từ đang hiện hoặc đang gõ, không thay đáp án học bằng từ bất kỳ.
- Layer transition cần trạng thái chuyển tiếp có giới hạn và không tạo enemy bất tử vẫn tấn công vô hạn. Với mechanic không thể chờ an toàn, phải giải quyết bằng scheduling/preflight, không vá bằng chờ vô thời hạn.
- Nếu stage bắt buộc hai đáp án xung đột đồng thời và chưa có thiết kế hợp lệ, coverage chưa đạt: không bật Voice cho stage đó. Hiển thị nguyên nhân và lựa chọn Typing rõ ràng; không tự chuyển mode giữa trận.
- Nếu lỗi kỹ thuật bất ngờ tạo collision sau khi stage đã bắt đầu: ghi diagnostic, fail closed với kết quả voice. Voice-only pause theo recovery của Final V2; Hybrid có thể tiếp tục keyboard nếu mechanic cho phép, đồng thời báo voice unavailable ở targets bị ảnh hưởng. Không biến giải pháp recovery thành cách vận hành thường xuyên.

### 5.3 Test Lab

Giữ khả năng tạo fixture prefix cố ý cho QA bằng cờ diagnostic rõ ràng, không dùng bypass Test Lab chung làm bằng chứng production đã an toàn. Test được hard admission phải chạy với production policy. Fixture cố ý vi phạm chỉ dùng để kiểm tra matcher/ownership fail closed; không được mở lại voice completion mơ hồ.

## 6. Chặn spawn không thay thế bảo vệ recognition

1. `react` không được complete từ partial result `react...` trong lúc người chơi còn đang nói `reactor`. Dùng điều kiện kết thúc utterance/decoder và acceptance policy của engine đã được kiểm chứng; không match text prefix rồi gây damage.
2. Lời nói ngoài target list được no-match, không forced choice về từ gần nhất còn hiển thị.
3. Chưa resolve được nhiều unit/alias thì trả ambiguous, không tự chọn mục tiêu gần tàu.
4. Bắt đầu typing A phải chặn cả kết quả voice A đến muộn. Không retarget lời nói đó sang B sau khi A bị loại khỏi eligibility.
5. Gõ A và voice B vẫn hoạt động nếu B hợp lệ, không xóa lock/progress của A.
6. Giữ nguyên dedupe receipt, unitVersion, ownership/eligibility validation, audio epochs và TTS contamination windows của Final V2.

Full-prefix khác phonetic-prefix: `react` / `reactor` là ca kiểm tra ký tự, không phải mô hình cho mọi lỗi phát âm. Corpus tiếng Anh của người học Việt Nam, homophone và negative audio vẫn bắt buộc.

## 7. Trình tự triển khai gắn với Final V2

| Bước | Việc phải làm | Điều kiện xong |
|---|---|---|
| C0 — cùng V00 | Đọc source/diff mới nhất; lập bảng mọi nơi cấp/đổi word, input contexts và fallback; xác nhận Test Lab boundaries | Có route inventory, không chỉ sửa một selector |
| C1 — chuẩn bị V04 | Viết pure conflict predicate/policy và tests; tham khảo Duel, tái sử dụng normalization/ledger phù hợp | Hard filter khác soft score; Typing default không đổi |
| C2 — V04 trước V05 | Tích hợp reservations với target registry; nối normal spawn, batch, cancellation và bounded deferral | Không có normal target Voice/Hybrid được commit khi hard conflict |
| C3 — V05/V06 | Nối readiness và runtime recognition guards; partial-keyboard reservations, stale results, no retarget | Voice/Hybrid normal combat end-to-end đạt tests |
| C4 — V07 | Nối boss/layer/supply/treasure/Recall/special; gỡ fallback bypass theo mode; scheduling/coverage | Tất cả routes trong stage được mở đều có admission hợp lệ |
| C5 — V08 | Regression Typing/Duel; tiny/large custom pool, restore, soak/perf và visual evidence | Có báo cáo PASS/FAIL/BLOCKED, không chỉ build pass |

Tên module/API mới do người triển khai quyết định sau audit; đây là contract hành vi, không phải yêu cầu tạo thêm nhiều lớp trừu tượng. Nếu trích một helper dùng chung với Duel thì phải chứng minh semantics không đổi; không chuyển cả Duel director sang Voice.

## 8. Test matrix bắt buộc

Mỗi ID phải có assertion và evidence. Unit tests pure không thay thế integration tại nơi spawn/đổi từ thật.

| ID | Tình huống | Kết quả bắt buộc |
|---|---|---|
| WC01 | Active `react`, candidate `reactor` | Voice/Hybrid hard reject |
| WC02 | Active `reactor`, candidate `react` | Hard reject chiều ngược lại |
| WC03 | Hai entry khác ID nhưng cùng normalized word/accepted alias | Không admit đồng thời |
| WC04 | `red` / `robot`; hoặc `reactor` / `reaction` không có spoken conflict khác | Không hard reject chỉ vì shared initial/prefix một phần; soft score vẫn áp dụng |
| WC05 | Safe word đã dùng, conflicting word chưa dùng | Không chọn conflicting word để tăng variety |
| WC06 | Enemy với supply/treasure/boss counter | Cùng policy khi cùng input context |
| WC07 | Gõ `rea` của `react`, thử sinh `reactor` | Reservation vẫn giữ toàn bộ từ; candidate bị chặn |
| WC08 | Đổi layer/boss word, selector hết ứng viên | Không lọt qua `?? entry`/`?? preferred`; không tạo dead-end gây damage vô hạn |
| WC09 | Wanted/scripted word xung đột | Defer/schedule hợp lệ, không bypass; không đổi đáp án tùy tiện |
| WC10 | Formation có hai từ xung đột nội bộ | Batch không commit sai; rollback ledger/reservations đúng |
| WC11 | Pool chỉ có `react`, `reactor` | Không vòng lặp vô hạn; có thể sinh tuần tự khi reservation được giải phóng |
| WC12 | Pool không có từ hợp lệ hoặc key rỗng | Lỗi/preflight/defer rõ ràng; không vô tình chặn toàn runtime bằng empty prefix |
| WC13 | Target kết thúc, target mới xuất hiện, old result đến muộn | Old result không complete target mới; reservation không rò rỉ |
| WC14 | Chuẩn bị async, state đổi trước ready ACK hoặc user restart | Revalidate/cancel, không spawn theo snapshot lỗi thời |
| WC15 | Known homophone `right` / `write`, alias từ custom content | Conflict hoặc unsupported rõ ràng; không đoán target |
| WC16 | Speech `reactor`, partial engine result `react` | Không damage vì nhận prefix sớm |
| WC17 | Gõ A, nói B, rồi callback cũ A đến | B hoàn thành đúng; A giữ lock/progress và không bị voice hoàn thành |
| WC18 | Typing-only cùng fixtures/random như baseline | Không bị áp hard policy mới ngoài ý muốn; không tải mic/model |
| WC19 | Duel director với prefix conflict và pool cạn | Giữ hành vi reject/null hiện có; không mở Voice Duel |
| WC20 | Forced-prefix QA fixture và production-equivalent fixture | Chỉ QA explicit được dựng conflict; matcher vẫn fail closed |
| WC21 | Custom vocabulary lớn, repeated deferred attempts | Công việc bounded; không full-sort/full-scan mỗi frame hoặc compile model lại liên tục |
| WC22 | Pause/resume, restore checkpoint, mode entry | Reservations dựng lại từ live units đúng; không bật voice trước validation/readiness |
| WC23 | Bonus bị defer trước spawn | Không trừ lifetime/ghi missed/reward trước khi xuất hiện |
| WC24 | Hai đáp án cố định bắt buộc đồng thời xung đột | Preflight/coverage chặn stage-mode chưa hỗ trợ, không treo giữa trận |

Thêm punctuation, spaces và casing fixtures theo normalization thật của repo. Test seed/determinism ở các route vốn dùng seeded RNG; không tự tuyên bố toàn game deterministic vì một selector có seed.

## 9. Performance, chẩn đoán và evidence

- Chạy admission khi cấp/đổi word hoặc context thay đổi, không theo từng draw frame.
- Tái sử dụng cache difficulty/index của ledger; cache normalized keys/spoken metadata theo content version. Không bắt buộc trie hay một subsystem mới nếu số target nhỏ đã đáp ứng budget.
- Đo với vocabulary lớn và target count tối đa của scope. Báo thời gian admission p50/p95/max, deferred retry count và frame-time spike; so với baseline cùng thiết bị/browser. Chưa có số đo thì không ghi “đã tối ưu”.
- Diagnostics có reason code: exact-duplicate, full-prefix, spoken-conflict, no-safe-candidate, stale-admission, unsupported-context; tránh log audio/transcript cá nhân mặc định.
- Development invariant kiểm tra live reservations không có hard conflict ngoài fixture được đánh dấu. Không quét tất cả cặp trong mỗi render frame ở production.
- Với thay đổi UI/lifecycle nhìn thấy được: đọc `docs/VISUAL_TESTING.md`, chụp và tự xem qua đúng đường chạy game; screenshot chỉ chứng minh UI, không chứng minh an toàn audio.

## 10. Checklist bàn giao và điều kiện PASS

- [ ] Đọc Final V2 và file này, không dùng riêng rule chống prefix thay cho ownership.
- [ ] Inventory bao phủ mọi route trong stage-mode được công bố hỗ trợ.
- [ ] Hard filtering xảy ra trước soft variety/rank tie-breaking, commit có revalidation khi cần.
- [ ] KEYBOARD_OWNED vẫn giữ reservation, không unlock do idle/pause/backspace ngoài luật Final V2.
- [ ] Không còn fallback production xuyên qua hard rejection trong Voice/Hybrid.
- [ ] Pool nhỏ chạy có giới hạn, có đường tiến triển hoặc thông báo không hỗ trợ rõ ràng.
- [ ] Boss/layer/authored answers không bị đổi sai nội dung hoặc tạo trạng thái mắc kẹt.
- [ ] WC01–WC24 và test bổ sung theo route có kết quả/evidence thật.
- [ ] Typing-only và Duel không regression; inference không được khởi động ở Typing.
- [ ] Có số đo performance và giới hạn phonetic/custom vocabulary trung thực.

Chỉ PASS khi các mục áp dụng cho phạm vi phát hành đều đạt. Route chưa nối, test chưa chạy hoặc mechanic chưa chốt là BLOCKED/chưa hoàn thành, không phải “đã fix”. Tài liệu hiện tại chỉ là plan để sửa cùng đợt triển khai Voice/Hybrid.
