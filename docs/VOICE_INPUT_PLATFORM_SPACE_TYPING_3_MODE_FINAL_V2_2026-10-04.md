# Voice Input Platform + Space Typing — Final V2

Ngày: 2026-10-04. Ngôn ngữ tài liệu: tiếng Việt.

**Trạng thái: đặc tả triển khai, chưa triển khai hoặc benchmark.**

Quyết định mới của chủ dự án: **mục tiêu đã bắt đầu typing không còn được voice hoàn thành**. Bản này thay thế các quy tắc Hybrid xung đột trong master plan ngày 2026-10-04, đặc biệt quy tắc cũ cho phép nói nốt từ đang gõ.

Tài liệu này không tự cho phép commit, push, đổi branch, ghi đè thay đổi của người khác hoặc sửa các game khác. Người triển khai chỉ bắt đầu code khi nhận yêu cầu triển khai riêng.

## 0. Kết quả sản phẩm cần đạt

Một game, ba phương thức nhập:

| Mode | Đánh mục tiêu bằng chữ | Đánh mục tiêu bằng tiếng nói | Mic/model |
|---|---|---|---|
| Typing | Giữ hành vi hiện tại | Không | Không tự tải/khởi động |
| Voice | Không dùng chữ để gây tiến độ typing | Có | Local, chuẩn bị trước khi chơi |
| Hybrid | Có | Có, nhưng không trên từ đã bắt đầu gõ | Local, lỗi mic không khóa bàn phím |

Voice ở đây là **nói từ/cụm từ tiếng Anh đang được phép tương tác**, không phải chấm phát âm, hội thoại, TTS hoặc điều khiển toàn bộ UI bằng giọng nói. Giao diện tiếng Việt vẫn được hỗ trợ. Nhận diện tiếng Việt/mixed-language là phạm vi sau, không được mặc định model tiếng Anh hỗ trợ.

Esc, chuột, nút UI và hotbar vẫn hoạt động theo luật điều khiển ở cả ba mode. Tách chữ dùng để đánh mục tiêu khỏi phím điều khiển; không vô hiệu hóa toàn bộ bàn phím trong Voice.

Trong Hybrid: **có thể gõ A đồng thời nói để đánh B**. Voice đánh B không được đổi tiến độ, khóa gõ hoặc keyboard streak của A. Đây là quyết định thiết kế của V2 nhằm giữ hai input hữu ích, không phải khóa toàn bộ voice mỗi khi người chơi gõ.

Không có mixed completion trên cùng một từ/layer. Một trận Hybrid có cả keyboard completions và voice completions, nhưng từng đơn vị hoàn thành chỉ có một nguồn input người chơi.

## 1. Những quyết định đã chốt

1. Runtime dùng chung thuộc parent `typing-game`; game chỉ có adapter.
2. Offline-only trong release đầu: không tự gửi audio lên dịch vụ remote và không tự fallback sang Web Speech không xác minh local.
3. KWS là ứng viên ưu tiên cho bộ từ giới hạn; chọn engine production bằng số đo, không mặc định KWS thắng ASR.
4. Không sinh phím giả từ lời nói; không ghi spoken words thành typed characters.
5. Lần gõ đúng đầu tiên chiếm quyền keyboard cho đúng từ/layer đó.
6. Đã chiếm quyền keyboard thì không trả lại voice chỉ vì ngừng gõ, chuyển focus hoặc hết timeout.
7. Target khác còn hợp lệ vẫn nhận voice; không dùng một global input lock cho toàn trận.
8. Candidate voice không chiếm quyền input, không gây damage/reward.
9. Game có quyết định cuối cùng khi nhận result, kể cả engine còn dùng danh sách cũ.
10. Đổi một phần danh sách target không tự làm vô hiệu mọi kết quả cũ.
11. TTS gate phải kiểm tra cả thời gian audio được thu, không chỉ thời điểm callback.
12. Gameplay/learning/persistence/UX tối thiểu phải hoàn thiện cùng Voice combat, không để đến cuối mới nối.
13. Không bật competitive Duel Voice/Hybrid trong release này.
14. Các ngưỡng hiệu năng trong tài liệu là **tiêu chuẩn nghiệm thu đề xuất**, không phải số đo đã đạt.

## 2. Baseline và cách đọc repository

Baseline kiểm tra lúc viết:

- Parent `main`: `13e6a6de0cc8fd5ac254235a4692ca5ed9322390`.
- Space `feat/bgv-integration-current`: `3ea8fd5bc73f547bfe3c54065fc74a9ae4b89f82`.
- Working tree có thay đổi chưa commit; không coi HEAD là toàn bộ trạng thái thực tế.
- Nội dung `Game.ts` đã dịch chuyển dòng so với review trước. Tra theo tên hàm, không áp patch dựa vào số dòng cũ.

Trước mỗi milestone, đọc lại diff/status và các phần liên quan:

| Vị trí | Cần hiểu trước khi thay đổi |
|---|---|
| Parent `docs/PROJECT_CONTEXT.md` | Portal, offline/local, submodule, Shared Learning |
| Space `docs/PROJECT_CONTEXT.md` | Luật gameplay, input ownership, progression |
| Space `docs/VISUAL_TESTING.md` | Quy trình chụp và tự xem evidence |
| Parent `portal/src/main.ts` | Route, iframe ownership và lifecycle |
| Parent `portal/src/learning/bridge.ts` | Kiểm tra source/origin/gameId |
| Parent `shared/learning/` | Parser, persistence, activity aggregation |
| Space `src/main.ts` | keydown/hotbar/modal, onWordComplete, onRecallPrompt |
| Space `src/Game.ts` | handleKey, typeTarget, currentTarget, completeWord, boss/special input |
| Space `src/combat/completion-events.ts` | origin, acceptedTypedLetters, typed reward |
| Space `src/speech.ts` | Speech synthesis lifecycle, không phải recognition |
| Space `src/learning/shared.ts` | Hiện ghi typing/recall và spelling errors |
| Space `src/persistence/` | Stage entry/checkpoint/crash recovery |

**Cảnh báo tích hợp cụ thể:** `completeWord()` hiện có các nhánh gán `this.targetId = null`. Nếu voice hoàn thành B trong lúc đang gõ A, gọi nguyên hàm đó có thể mất khóa A. Không sửa bằng cách tạm gán global target sang B rồi khôi phục mù quáng.

## 3. Phạm vi và cách phát hành

### 3.1 Release production đầu

- Portal + Space Typing; không sửa gameplay của Monkeytype, Recall Typing, Shooter, Karaoke.
- Ba mode selectable trên màn chuẩn bị stage.
- Mic setup, model readiness, lỗi/retry, offline, pause, target ownership và telemetry đầy đủ.
- PvE: triển khai theo thứ tự normal enemies, boss/Recall, rồi special mechanics đã được audit.
- Chỉ hiển thị Voice như lựa chọn chơi một stage khi toàn bộ cơ chế bắt buộc của stage đó đã có giải pháp hợp lệ.
- Không xuất bản một campaign Voice có thể đi tới stage bắt buộc gõ mà không báo trước.

### 3.2 Không thuộc release đầu

- Voice PvP/ranked, chấm accent/phát âm, nhận diện người nói, free-form speech.
- Custom acoustic decoder, nhiều model chạy song song thường trực.
- UI điều khiển hoàn toàn bằng voice, tính năng wake-word toàn nền.
- Tự thay bộ engine/model không thông báo trong một lượt chơi.

Các milestone kỹ thuật không phải những bản demo bỏ đi. Benchmark, harness và tests được giữ làm công cụ production regression.

## 4. Kiến trúc tối thiểu

```text
Portal: mic → AudioWorklet → Voice Worker → detection
                                           ↓
                         snapshot matcher + audio/session guards
                                           ↓ versioned postMessage
Space: keyboard → InputController ← VoiceBridge
                         ↓
              per-target ownership + validation
                         ↓
             semantic gameplay completion/effects
```

### 4.1 Parent `shared/voice/`

Contracts, bounded parsers, normalization, model metadata, snapshot matcher, error codes, replay fixtures. Không chứa enemy/ship/stage/score rules.

### 4.2 Parent `portal/src/voice/`

Mic permission, capture, worklet, worker, engine adapter, cache, token compiler, session, offline checks, user-facing microphone state. Nắm một microphone owner cho phiên Portal; xử lý tab cạnh tranh bằng thông báo/explicit ownership, không giả định chỉ có một tab đang mở.

### 4.3 Space `src/input/`

Mode selection, keyboard adapter, voice bridge, target registry, ownership, semantic routing, metrics và game UI. Không chứa model weights, audio decoder hoặc một bản copy Voice Host.

Dùng các capability tổng quát (`word`, `phrase`, `action`) ở shared contract. Các kind `enemy`, `boss-counter`, `crate` chỉ là metadata/route nội bộ của game; parent không diễn giải combat priority hay quyết định damage.

### 4.4 Standalone và local

Typing chạy khi mở game trực tiếp. Voice/Hybrid cần mở qua Portal ở release đầu. Khi thiếu Host, hiển thị thông báo và link Portal; không âm thầm bật microphone riêng trong child.

Parent sở hữu mic nên không cần mở quyền microphone cho mọi iframe. `getUserMedia` cần secure context và permission; kiểm tra HTTPS local/certificate hoặc localhost được hỗ trợ. Không coi HTTP trên một domain `.local` bất kỳ là tương đương localhost. [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## 5. Đơn vị input: target, layer và ownership

### 5.1 Không dùng chữ làm ID

Một `targetUnit` là **một yêu cầu nhập có thể hoàn thành một lần**:

- Một từ của enemy layer.
- Một câu/đoạn boss có completion riêng.
- Một lượt Recall.
- Một counter hoặc bonus có luật hoàn thành riêng.

Ví dụ định danh nội bộ: `encounter:27/enemy:845/layer:2`. Cùng enemy đổi layer phải có unit mới, kể cả text giống nhau. Retry stage có encounter mới. Không tái sử dụng unit ID trong cùng run.

### 5.2 State tối thiểu

| Trạng thái unit | Keyboard | Voice | Ý nghĩa |
|---|---|---|---|
| AVAILABLE | Theo mode/luật game | Theo eligibility/ready | Chưa có input người chơi sở hữu |
| KEYBOARD_OWNED | Tiếp tục theo routing hiện tại | Cấm | Đã nhận ít nhất một ký tự đúng thực sự |
| RESOLVING | Cấm completion mới | Cấm | Đã claim transaction, đang xử lý synchronous |
| COMPLETED | Cấm | Cấm | Đã hoàn thành |
| INVALIDATED | Cấm | Cấm | Chết/đổi phase/despawn/không còn yêu cầu |

Quyền keyboard là thuộc tính của unit, không phải chỉ của con trỏ `targetId` toàn game. Game hiện có nhiều partial target như enemy/bonus/boss; registry phải loại **mọi unit đã gõ**, không chỉ unit được highlight hiện tại.

### 5.3 Khi nào chiếm quyền keyboard

Trong cùng một lượt xử lý synchronous:

1. Kiểm tra mode, phase, modal, frozen/status và routing hợp lệ.
2. Xác định phím có được chấp nhận cho unit nào không.
3. Nếu là ký tự đúng đầu tiên: set KEYBOARD_OWNED và tăng eligibilityVersion.
4. Xóa candidate/hint voice cho unit này; cập nhật matcher deny ngay ở game.
5. Áp dụng tiến độ và side effect typing hiện có.
6. Sau đó gửi registry delta cho Portal, không await trước khi cho bàn phím chạy.

Phím sai không tiến bộ, modifier, hotbar, Esc, focus input form, IME chưa commit không chiếm quyền của một enemy mới. Lỗi phím trên unit đã sở hữu không mở lại voice.

### 5.4 Khi nào kết thúc quyền keyboard

- Hoàn thành unit: terminal, không biến chính unit đó về AVAILABLE.
- Chết/despawn/phase hủy: INVALIDATED.
- Sang layer mới: tạo unit mới AVAILABLE, chỉ nhận lời nói mới có audio window hợp lệ.
- Pause/resume, blur/focus, đổi candidate, ngừng gõ lâu: **giữ KEYBOARD_OWNED**.
- Nếu cơ chế hiện tại đưa tiến độ về 0 nhưng vẫn cùng bài/từ: giữ ownership latch. Không suy ownership chỉ từ `typed > 0`.
- V1 không thêm timeout auto-unlock hoặc nút hủy typing để chuyển sang voice. Esc vẫn là pause. Thay đổi luật này phải có yêu cầu sản phẩm riêng.

### 5.5 Tiến độ do hệ thống tạo

Một skill có thể làm mềm target hoặc tăng tiến độ không do phím. Ghi `systemProgress` riêng; không gán KEYBOARD_OWNED chỉ vì trường `typed` tăng do hệ thống.

Voice có thể hoàn thành phần còn lại nếu luật target cho phép, nhưng không cấp lại phần input-effort mà hệ thống đã bỏ qua. Không ghi đây là mixed keyboard/voice. Chi tiết ở mục 14.

## 6. Ma trận Hybrid bắt buộc

| Trường hợp | Hành vi |
|---|---|
| A chưa gõ, nói A hợp lệ | Voice có thể hoàn thành A |
| A đã gõ 1 ký tự, nói A | Reject keyboard-owned; giữ nguyên A |
| Voice candidate A xuất hiện, sau đó gõ đúng A | Keyboard chiếm quyền; candidate hủy |
| Gõ A trước; voice result cũ của A đến sau | Reject dù engine chưa nhận update |
| Voice đã commit A; sau đó keydown đến | A đã terminal; routing keyboard theo trạng thái game mới, không hoàn thành A lần nữa |
| Đang gõ A, nói B | B được xử lý nếu hợp lệ; khóa/tiến độ A giữ nguyên |
| B chết gây AoE giết A | A bị invalidated bởi gameplay thật; không phục hồi khóa A đã chết |
| Gõ A sai rồi nói A | Vẫn reject; không có cơ chế voice cứu từ gõ dở |
| Pause khi gõ A, resume rồi nói A | Vẫn reject; không mất ownership |
| Gõ xong layer 1, layer 2 text trùng | Audio cũ không hoàn thành layer 2; phải có detection mới |
| Có nhiều partial target | Tất cả partial do keyboard đều bị loại voice |
| Engine lag hoặc crash | Keyboard không chờ; UI voice error |

### 6.1 Cấm retarget âm thầm

Nếu đang gõ A=`orbit`, B cũng có spoken alias `orbit`, nói `orbit` không được tự động đánh B như cách lách ownership của A.

V1 suppress voice alias trùng chính xác của keyboard-owned unit khỏi các target khác, hiển thị lý do nếu cần. Khi A terminal, chỉ audio bắt đầu sau khi B được re-enable mới được nhận cho B. Với homophone/near-confusion dùng nhóm dữ liệu và luật mục 11; không mở fuzzy matcher tùy tiện.

### 6.2 Cấm phá khóa gõ A khi xử lý B

Semantic completion phải nhận unit explicit, không dựa trên global keyboard target.

- Chỉ clear keyboard lock nếu unit được clear đúng là unit sở hữu lock, hoặc lock không còn hợp lệ.
- Source B của passive/AoE dùng tọa độ/ID B; không lấy `currentTarget()` A làm source thay thế.
- Candidate voice B chỉ tạo reticle phụ; không đổi chữ được keyboard highlight.
- Completion B không sửa `wordMissed`, hits, streak typing của A.
- Khi B tạo status ảnh hưởng A, áp dụng status theo luật game, không coi đó là lỗi ownership.

## 7. Identity, revision và thời gian

### 7.1 Các trường cần phân biệt

| Trường | Thay đổi khi nào | Dùng để |
|---|---|---|
| sessionId | Mỗi mic session/restart | Loại message từ phiên cũ |
| inputEpoch | Pause/resume barrier, modal block, đổi mode, encounter/phase boundary | Loại input không còn thuộc thời điểm gameplay hợp lệ |
| audioEpoch | Parent flush capture context, TTS gate/recovery, audio discontinuity | Loại audio cũ dù gameplay epoch chưa đổi |
| targetUnitId | Unit mới | Không dùng lại chữ/ID enemy làm identity |
| unitVersion | Đổi text/luật/phase của unit còn tồn tại | Phát hiện semantic mutation |
| eligibilityVersion | Voice eligibility thay đổi | Không replay audio qua lần disable/re-enable |
| registryRevision | Snapshot/delta registry mới | Đồng bộ, không phải global kill switch |
| snapshotId | Matcher context mà audio dùng | Không rematch audio cũ sang target mới |
| streamEpoch | Reset/replace decoder | Chẩn đoán và quy đổi timestamp, không tạo quyền damage mới |
| detectionId | Một detection cụ thể | Dedupe delivery/result |
| audioStart/EndSample | Khoảng audio detection dùng | Freshness, TTS contamination, replay dedupe |

Game giữ lịch sử snapshot/tombstone có giới hạn tối thiểu bao trùm mọi audio buffer và result TTL được cho phép. Sau khi hết lịch sử: reject result, không đoán.

### 7.2 Quy tắc chấp nhận result cũ

Registry revision cũ không tự động reject. Chấp nhận chỉ khi tất cả đúng:

- Session, inputEpoch và audioEpoch đúng, snapshot từng được publish/acknowledge.
- Unit có trong snapshot tương ứng và vẫn cùng unitVersion/eligibilityVersion.
- Unit hiện còn voice-eligible, không keyboard-owned, chưa resolving/terminal.
- Khoảng audio nằm trong cửa sổ voice eligibility của unit, không trước spawn/re-enable.
- Audio không bị TTS/paused/overflow contamination; result chưa hết hạn.
- Detection không bị xử lý trước và matcher không ambiguous.
- Game-specific constraints đúng ở thời điểm commit: frozen, deadline counter, status, modal, resources.

Không backdate damage để cứu một enemy đã chết hay counter đã hết hạn.

### 7.3 Clock

Dùng một audio sample timeline tại capture owner. Với timestamp UI/worker/iframe, chuẩn hóa clock origin rồi mới trừ. Không lấy trực tiếp `performance.now()` của hai context để tính latency. [MDN timeOrigin](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timeOrigin).

Timestamp token engine không mặc định là thời điểm word end. Adapter phải mô tả ý nghĩa, quy đổi offset qua stream reset; khi không có span đáng tin, dùng span bảo thủ của cả utterance/chunk đã tiêu thụ. Không giả timestamp để vượt stale gate.

## 8. Contract Portal ↔ Space

Namespace đề xuất: `typing-game:voice:v1:*`. File schema và fixtures là chuẩn, không sao chép nhiều bộ parser khác nhau rồi để lệch.

### 8.1 Message và acknowledgement

| Hướng | Message | Nội dung/hành vi |
|---|---|---|
| Child → Parent | hello | protocol versions, game instance; chưa mở mic |
| Parent → Child | capabilities | offline engine capabilities thực tế |
| Child → Parent | configure | mode, language, inputEpoch, policyVersion |
| Child → Parent | start | user intent; parent permission UI nếu cần |
| Parent → Child | ready | session + engine/model ID; chưa đồng nghĩa targets ready |
| Child → Parent | targets | bounded snapshot/delta + versions |
| Parent → Child | targets-applied | snapshotId, compiled/ready/unsupported units |
| Parent → Child | listening | capture + engine + snapshot thực sự sẵn sàng |
| Parent → Child | candidate | Optional, chỉ khi engine có bằng chứng theo target |
| Parent → Child | detection | keyword/phrase và snapshot/audio provenance; chưa phải damage |
| Child → Parent | resolution | accepted/rejected + reason + detectionId |
| Child → Parent | suspend / resume | epoch barrier; không xử lý audio của pause |
| Child → Parent | audio-output-intent | Đóng TTS gate trước phát |
| Parent → Child | gate-closed | Ack đã chặn recognition/audio window |
| Child → Parent | audio-output-ended | TTS end/cancel/error và generation |
| Parent → Child | listening-resumed | Đã flush/reset cần thiết, echo tail qua, epoch mới |
| Cả hai | stop / stopped / error | Idempotent; không sống lại phiên cũ |

Tên `detection` thay cho `commit` ở biên parent→game để tránh hiểu nhầm engine có quyền commit gameplay. Trong nội bộ game mới có `accepted commit`.

### 8.2 Payload tối thiểu của detection

Session/inputEpoch/audioEpoch/snapshot, detectionId, streamEpoch, recognized lexical key, matched targetUnitId + versions (nếu duy nhất), audio span, engine/model version, thời điểm emit, optional score kèm score-kind.

Game sở hữu inputEpoch; parent sở hữu audioEpoch và gửi qua ready/listening/resumed. Mỗi thay đổi audioEpoch phải có barrier/ack trước detection mới. Không để parent tự sửa inputEpoch của game. Stream reset nội bộ thông thường không tự tăng audioEpoch nếu audio vẫn liên tục; dedupe vẫn phải giữ qua reset.

`score` là optional, không mặc định 1.0 khi engine không có confidence. Không so hai engine bằng score chưa được calibrate.

### 8.3 Security và bounds

- Parent kiểm tra source chính là iframe hiện tại, origin chính xác, gameId/instance/session/schema.
- Child kiểm tra source chính là parent và origin được cấu hình tin cậy; không dùng wildcard cho dữ liệu voice.
- Không tự mở microphone chỉ vì một message tới; quyền đồng ý ở Portal phải rõ ràng.
- Parser loại NaN/Infinity, ID quá dài, duplicate unit ID, text dài bất thường và timestamps không hữu hạn.
- Giới hạn protocol ban đầu: tối đa 64 descriptors/snapshot, 200 ký tự/spoken form, tối đa 4 aliases/unit; đây là transport ceiling, không phải density gameplay mục tiêu.
- Overflow phải báo lỗi/quá khả năng; không cắt bỏ âm thầm một target nguy hiểm.
- Unknown major version: Typing vẫn chạy, Voice thông báo không tương thích.
- Delivery ACK không phải ACK gameplay accepted. Retry phải giữ nguyên detectionId và không áp dụng lần hai.
- Không gửi PCM/raw audio qua iframe. Parent tự xử lý audio; child chỉ nhận metadata cần cho gameplay.

## 9. Luồng xử lý input chuẩn

### 9.1 Keyboard

Giữ nguyên routing priority hiện có: modal/hotbar/control/status/boss counter/current target/special targets. Lớp adapter không tự tái sắp xếp luật này.

Sau khi xác định một ký tự thực sự được chấp nhận, cập nhật ownership trước khi các side effect có thể phát event ra ngoài. Không `await` trong thao tác này.

### 9.2 Voice

1. Validate envelope/source/session/schema.
2. Tra detectionId; duplicate đã xử lý thì trả lại outcome trước, không làm lại.
3. Validate audio span, epoch, snapshot và freshness.
4. Resolve đúng unit có trong snapshot; không lookup theo text trên danh sách live để tìm địch thay thế.
5. Revalidate ownership/current eligibility/status/deadline/resource trong game.
6. Nếu reject: đánh dấu detection terminal với reason, không phạt typing hoặc learning.
7. Nếu accept: chuyển unit sang RESOLVING và ghi receipt trước khi emit hooks.
8. Chạy semantic progress/completion, reward và state mutation synchronous theo luật unit.
9. Đánh dấu COMPLETED hoặc chuyển sang unit mới; xuất VFX/SFX/learning facts từ receipt.
10. Cập nhật registry; trả resolution; không chờ animation impact mới khóa dedupe.

Không cần cơ chế transaction database cho mỗi từ. Cần critical section synchronous, completion receipt và quy tắc một lần; nếu exception sau mutation thì pause an toàn, không tự retry mutation một phần.

### 9.3 Thứ tự chạy đua

Dùng thứ tự event được game authoritative xử lý, không đảo lại thứ tự theo timestamp do engine gửi.

- Ký tự đúng được nhận trước: keyboard owns; voice A đến sau bị loại.
- Voice claim hợp lệ trước: unit terminal; key đến sau đi qua routing bình thường của game mới.
- Không chặn keydown chờ worker hoặc giữ keyboard event để voice thắng.
- Không khóa unit chỉ vì VAD nghe tiếng hoặc candidate yếu.

### 9.4 Dedupe đúng đơn vị

Tách `utteranceId` (một đoạn nói) và `detectionId` (một keyword/phrase được nhận).

Một hơi nói “orbit gravity” có thể có hai detections, mỗi cái tối đa một unit. Hai lần nói “orbit” thật sự khác nhau được nhận nếu audio span khác và unit còn hợp lệ.

Nếu replay một đoạn audio khi đổi stream, dedupe theo audio span + lexical identity + session, không chỉ ID mới của stream. V1 không cho một audio event tấn công nhiều target trừ khi gameplay effect của một completion vốn là AoE.

Reject là terminal cho detection đó: không giữ result keyboard-owned rồi tự áp dụng khi keyboard lock kết thúc.

## 10. Engine và audio pipeline

### 10.1 Chọn engine bằng capability và số đo

Ứng viên ưu tiên: Sherpa KWS tiếng Anh phù hợp bộ từ. Baseline đối chiếu: một streaming ASR local + strict matcher. Không bắt buộc ship cả hai.

Wrapper WASM KWS được kiểm tra lúc viết chỉ có `createStream()` không nhận keyword động. Native có API tương ứng nhưng cần binding/build đã xác minh. Pin commit/release của library, model và tokenizer; không ghi “dùng latest” vào production manifest. [Wrapper WASM KWS](https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/wasm/kws/sherpa-onnx-kws.js).

KWS result công khai có keyword/tokens/timestamps/start time; không mặc định có target-ranked confidence hay partial candidates. Capability phải trung thực. [KeywordResult](https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/sherpa-onnx/csrc/keyword-spotter.h).

### 10.2 Pipeline

`getUserMedia → AudioWorklet → bounded PCM transport → Worker → optional VAD → engine → matcher`.

- Worklet không chạy model nặng, DOM, logging liên tục hoặc cấp phát lớn mỗi callback.
- Dùng MessagePort/transferable buffers và pool ở bản single-thread khi phù hợp. Không bắt buộc SharedArrayBuffer/ring buffer shared memory.
- WASM SIMD + worker một inference thread là baseline. Không bật COOP/COEP toàn platform chỉ vì copy cấu hình demo.
- Sample rate của mic có thể khác model; resampler phải giữ state qua chunks và có anti-aliasing phù hợp, không đơn giản bỏ mỗi N sample.
- Xin mono, echo cancellation/noise suppression/AGC như constraints có thể hỗ trợ; đo settings thực tế và chất lượng, không coi browser luôn làm đúng mong muốn.
- Không ghi raw audio mặc định; fixture recording phải do developer bật rõ ràng.

### 10.3 VAD và buffers

Không chờ toàn bộ câu kết thúc mới phản hồi nếu engine có streaming trigger. Tuy nhiên không loại sạch silence tùy tiện: decoder có thể cần trailing blanks để phát hiện keyword.

Nếu dùng VAD để tiết kiệm CPU, giữ pre-roll/hangover có giới hạn và audio timeline liên tục. Benchmark mất phụ âm đầu, âm cuối, lời nói nhỏ và hai từ sát nhau. Chưa chứng minh VAD lợi hơn thì cho engine streaming liên tục trong combat; VAD vẫn có thể chỉ phục vụ UI/segmentation.

Giới hạn khởi điểm, phải đo trước khi chốt production:

- Audio backlog tối đa 300 ms; vượt giới hạn thì bỏ context cũ và recovery, không xử lý chậm dần vô hạn.
- Result age tối đa 750 ms tính từ cuối span bằng clock đã đồng bộ; chưa cho phép dùng token emission timestamp thay span thật.
- Echo tail TTS khởi điểm 300 ms, phải kiểm tra với loa thực tế.
- Retention history/dedupe ít nhất 10 giây và lớn hơn toàn bộ buffer + retry + TTL tối đa.

Overflow Voice: pause và hiển thị “nhận diện không theo kịp”. Overflow Hybrid: keyboard tiếp tục, voice tạm unavailable. Không replay audio qua overflow barrier để “bắn bù”.

### 10.4 Đổi target mà không mất lời nói

Tách ba tập:

1. **Lexical decoder context:** các từ đã compile cho engine, có thể rộng hơn tập hợp lệ hiện tại.
2. **Snapshot matcher:** target units cụ thể gắn với khoảng audio/phiên nhận diện.
3. **Live game eligibility:** quyết định cuối cùng lúc commit.

Khi A bắt đầu typing, tập (3) loại A ngay; parent loại A khỏi matcher hiện tại ngay khi nhận delta. Engine có thể còn graph chứa từ A trong context lịch sử, nhưng điều đó không tạo quyền gây damage.

Gom các update graph không khẩn cấp để áp dụng ở ranh giới nói/decoder thích hợp. Không destroy model hoặc stream mỗi lần enemy dịch chuyển, đổi tọa độ hoặc nhận thêm một ký tự. Nếu cần stream replacement, benchmark memory, audio continuity và dedupe replay.

Spawn target mới: precompile từ sắp xuất hiện khi có thể. Hiện trạng thái voice-ready chỉ sau snapshot được engine/matcher áp dụng. Với Voice-only, chuẩn bị snapshot trước khi bắt đầu đồng hồ phản ứng của target mới; không để khoảng warm-up recognition tiêu hết counter window. Sau khi ready, timer chạy bình thường, không gia hạn vì người chơi nói sai.

Nếu không thể chuẩn bị target mới đúng hạn, xem là lỗi kỹ thuật và pause Voice; không âm thầm bỏ target. Không đổi snapshot của audio đã bắt đầu để cho nó đánh target mới sinh.

### 10.5 Tokenization và custom words

- Canonical display text, typing text và spoken forms là ba khái niệm khác nhau.
- Index compile keyed theo model/tokenizer version + normalized spoken form.
- Built-in vocabulary precompute lúc chuẩn bị content; custom vocabulary compile/cache lúc load bộ từ hoặc chuẩn bị stage.
- Unsupported words phải được thông báo trước combat. Không tải ASR thứ hai giữa trận chỉ để chữa một từ chưa compile.
- Không thay đáp án Recall bằng cách fuzzy-match một từ khác có nghĩa gần giống.

## 11. Từ dễ nhầm, prefix và homophone

1. Không commit dựa trên text prefix đơn thuần. “react” không được nhận từ nửa đầu của “reactor” khi còn khả năng nhầm.
2. Tránh sinh đồng thời nhóm từ giống âm/prefix trong mode Voice/Hybrid nếu không phá yêu cầu content.
3. Exact homophones phải có thiết kế disambiguation hoặc không cho đồng thời voice-targetable. Không hứa ASR phân biệt được “right/write” chỉ bằng âm thanh.
4. Cùng spoken form nhiều unit: matcher trả ambiguous, không tự chọn nearest sau khi nói, trừ một action explicit đã có luật chọn target trước.
5. Khi một unit trong nhóm bắt đầu typing, áp dụng suppression mục 6.1, kể cả old snapshot.
6. Recognition ngoài target list trả no-match; không forced choice.
7. Threshold/boost được calibrate với dữ liệu tiếng Anh của người học Việt Nam và negative audio. Không tăng boost chỉ để làm tỷ lệ accepted đẹp hơn.
8. Target visibility phải giải thích trường hợp tạm không nhận voice; không có “địch bất tử vì engine bỏ từ”. Voice-only stage không đạt coverage thì không được bắt đầu.

## 12. TTS, nhạc, âm thanh và quyền mic

### 12.1 Chính sách sản phẩm

- Typing: giữ pronunciation hiện tại.
- Voice/Hybrid: mặc định tắt auto-pronounce mỗi completion; giữ replay chủ động.
- Recall Voice: không tự đọc đáp án trước khi yêu cầu nhớ; replay là trợ giúp và phải ghi nhận.
- Không tắt BGM/SFX toàn game mặc định. Có hướng dẫn tai nghe và mic-friendly mix tùy chọn nếu benchmark chứng minh cần.
- SFX/announcer chứa lời nói cũng phải audit, không chỉ `speechSynthesis`.

### 12.2 Gate trước, phát tiếng sau

1. Child chặn voice locally ngay và gửi audio-output-intent(generation).
2. Parent đóng gate, đánh dấu capture boundary, trả gate-closed.
3. Child mới phát TTS. Ack lỗi/timeout thì không phát trong trạng thái vẫn nhận voice.
4. onend/onerror/cancel theo generation gửi ended; callback stale không mở gate của generation mới.
5. Parent chờ echo tail, bỏ context audio nhiễm, reset decoder khi cần, mở audioEpoch mới và đồng bộ child trước detection mới.
6. Result từ khoảng bị chặn bị reject kể cả đến sau khi gate mở.

Trong Voice-only, replay chủ động pause combat cho cả lượt nghe và tail rồi resume ở barrier sạch; timer gameplay không chạy lúc player không có input. Đánh dấu assist để không ghi thành unassisted Recall. Hybrid có thể giữ combat chạy bằng keyboard, nhưng phải hiển thị voice đang tạm ngắt.

### 12.3 Permission/lifecycle

Tách đời sống **model** khỏi đời sống **capture**. Model warm giữa stage được; mic phải phản ánh trạng thái thật trên UI. Pause ngắn có thể suspend processing không teardown model. Rời route/stop/device-lost phải đóng capture theo policy, loại phiên cũ trước khi restart.

Nếu user bỏ qua permission prompt, có Cancel. Khi Promise getUserMedia giải quyết muộn sau cancel, stop tracks vừa nhận; không tự khởi động phiên đã bị hủy.

AudioContext suspended, page hidden, OS sleep/wake, Bluetooth đổi profile và worker stall đều phải được nhận diện. Không chỉ lắng nghe track ended. Watchdog dựa trên capture/processing heartbeat, không dựa trên “lâu không có từ được nhận” vì im lặng là bình thường.

### 12.4 State machine Host

| Trạng thái | Được làm | Không được làm |
|---|---|---|
| IDLE | Capability check, chờ user chọn mode | Tự mở mic/tải model vì mở trang |
| REQUESTING_PERMISSION | User thấy permission/cancel | Tự bắt đầu stage |
| PREPARING | Load/verify model, worklet, tokenizer | Báo LISTENING khi engine chưa sẵn sàng |
| READY | Engine/capture sẵn, chờ snapshot và stage | Gửi damage input từ snapshot không có |
| LISTENING | Nhận audio vào context được ack | Nhận result sai epoch |
| SUSPENDED | Pause, TTS hoặc UI block; có thể giữ model | Đẩy audio của thời gian bị chặn vào combat sau đó |
| STOPPING | Invalidate session, stop tracks, dispose stream | Chấp nhận start cũ đang resolve muộn |
| ERROR | Retry rõ ràng hoặc fallback do user chọn | Tự lặp permission prompt vô hạn |

Start/stop phải serialize bằng generation/cancellation token; user đổi mode trong PREPARING không làm worker hoàn tất muộn tự bật lại. Model resident chỉ là cache, không đồng nghĩa mic đang nghe.

**Không có voice targets** là trạng thái hợp lệ: giữa wave hoặc khi tất cả targets thuộc keyboard trong Hybrid, UI báo “Không có mục tiêu voice”, keyboard/game vẫn chạy theo phase. Không coi đó là engine crash, không pause Hybrid hoặc tự mở lại target đang gõ.

## 13. Gameplay semantics và mức hỗ trợ

| Cơ chế | Voice semantics | Điều kiện trước khi mở stage |
|---|---|---|
| Enemy một từ | Nói đầy đủ spoken form, hoàn thành một unit | Registry/owner/ledger hoạt động |
| Enemy nhiều layer | Một detection chỉ xong layer hiện tại | Layer ID mới + audio freshness |
| Boss từ đơn | Semantic word progress/damage theo boss hiện có | Không bypass HP/phase/status |
| Boss counter | Đúng từ counter trong window, một lần | Snapshot ready trước window; late result không backdate |
| Recall | Nói đáp án tiếng Anh | Không auto đọc đáp án; assist/learning riêng |
| Crate/pod/bonus | Nói target explicit để hoàn thành theo luật | Không bypass affordability/choice/dialog |
| Phrase/sentence | Nhận cả phrase được chỉ định; không nhặt một keyword con làm xong câu | Engine/task có coverage thật |
| Ordered chain | Một unit mỗi phần tử; bắt buộc thứ tự | Không dùng audio cũ qua phần tử tiếp theo |
| Shared target | Một user completion + system AoE | Chỉ ghi một voice word, không nhân theo số địch trúng |
| Projectile chữ đơn | Không giả định đọc tên chữ tương đương gõ | Mapping riêng phải được phê duyệt trong audit trước khi bật stage |
| Puzzle/ngữ pháp/reverse-spelling | Không tự dùng normal-word completion | Có đặc tả accepted answers/learning evidence riêng hoặc stage chưa hỗ trợ |
| Duel | Typing theo hiện trạng | Voice/Hybrid chưa mở ở release này |

Projectile có thể dùng một lệnh hành động riêng như “intercept” cho một projectile đã chọn theo luật, nhưng đó là **thay đổi mechanic**, không tự chốt bằng suy luận của AI. Milestone coverage phải trình danh sách cụ thể để chủ dự án quyết định trước khi code nhánh này. Không dùng phần chưa hỗ trợ để trì hoãn các stage normal đã đủ đặc tả.

Frozen/hard CC chặn input combat theo luật tương ứng cho cả voice lẫn keyboard; không cho voice vượt status chỉ vì nó không đi qua `handleKey`. Menu/modal/skill selection cũng là input context, không chỉ `phase === playing`.

## 14. Reward, passive, score và công sức

### 14.1 Bất biến

- Typing-only giữ nguyên số học và trigger order hiện tại.
- Một unit không nhận cả keyboard effort và voice effort.
- Một detection accepted chỉ sinh một completion receipt.
- Kill/layer reward, loot, credit, death traits, quest progress mỗi completion chỉ chạy một lần.
- Stats về gõ luôn là phím thật, kể cả khi gameplay cần đơn vị công sức để cân bằng Voice.
- No-match, mic lag, ownership reject, stale callback không tự làm người học sai hoặc mất typing streak.

### 14.2 Policy khởi điểm cho Voice

Đây là baseline thiết kế để triển khai rồi đo cân bằng, không phải tuyên bố ngang sức Typing:

| Thành phần | Chính sách V1 |
|---|---|
| acceptedTypedLetters/hits | 0 cho completion voice |
| acceptedVoiceWords | +1 cho unit từ đơn; phrase có metric riêng |
| typing WPM/streak/multiplier | Không cộng hoặc reset bởi voice |
| voice word streak | +1 mỗi word accepted; không dùng để giả typing accuracy |
| Công sức voice U | min(8, số typing units còn phải giải quyết), không âm |
| Completion với 0 remaining effort | Không nhận voice như một user completion mới |
| Điểm input voice | 10 × U, voice score multiplier ban đầu 1 |
| Power input voice | 1.8 × U, đi qua resource caps/modifiers hiện có một lần |
| Điểm layer/kill | Dùng hàm reward chung theo enemy, với voice score multiplier 1 |
| Power layer/kill | Dùng reward chung đúng một lần, không thêm một bản voice copy |
| Loot/economy | Dùng receipt chung, source=voice; không gắn nhãn typed-kill giả |
| Thống kê học tập | Speaking/recognition success, không spelling success |

Các hệ số 10 và 1.8 lấy làm baseline từ input normal hiện tại, cap 8 là đề xuất bảo thủ cho voice. Đưa vào policy version có test, không rải magic numbers. Đo throughput/reward trên corpus ngắn/dài; thay policy chỉ ở stage boundary và lưu version.

`remaining effort` không suy mù từ `word.length`: nếu skill/shared effect cho system progress, phần đó không nhận lại input reward. Nếu keyboard ownership đã có, voice bị reject trước khi tính U dù tiến độ typing sau đó về 0.

### 14.3 Passive không được bị mất âm thầm

Trước release phải lập bảng **tất cả** consumers của correct-key, streak, perfect-word, word-complete, typed-kill, effortWeight, cooldown reduction, equipment và relic. Không chỉ sửa những hàm có tên “voice”.

Hướng chuyển đổi:

- Word-complete không phụ thuộc kỹ năng gõ: nhận semantic completion một lần, biết inputSource.
- Bonus perfect typing: vẫn chỉ là perfect typing ở thống kê học tập.
- Voice có `cleanVoiceCompletion` riêng: detection không ambiguous, đúng unit/window, không dùng trợ giúp; **không có nghĩa phát âm hoàn hảo**.
- Passive gameplay cần “perfect” có thể ánh xạ sang cleanVoiceCompletion trong profile Voice/Hybrid, nhưng tên UI và analytics không gộp hai khái niệm.
- Passive chạy mỗi N phím đúng: giữ đường keyboard hiện tại; voice dùng accumulator công sức **chỉ nhận voice** riêng theo passive, không cộng chung với `stats.streak` hoặc tiến độ gõ A.
- Với mỗi threshold N: `total = oldRemainder + U`; nếu total ≥ N thì trigger tối đa một lần và đặt remainder = min(N−1, total−N); nếu chưa đạt thì remainder = total. Không bank nhiều proc để một lần nói sau giải phóng hàng loạt.
- Accumulator voice reset ở encounter mới hoặc khi unit voice-eligible thực sự bị bỏ lỡ theo luật gameplay; không reset do no-match, owned/stale reject, technical pause hoặc mic retry. Chuyển sang Typing rồi quay lại ở stage mới không được giữ credit cũ.
- Keyboard trong Hybrid chỉ dispatch đúng đường keyboard; voice chỉ dispatch mapping voice của passive. Không gọi cả legacy correct-key và voice accumulator cho cùng input. Cooldown và giới hạn tài nguyên của cùng passive vẫn là một, không tạo hai bản skill để né cooldown.
- Damage multiplier đọc streak hiện tại phải được phân loại: typing skill multiplier giữ cho keyboard; voice dùng combat policy riêng, không hưởng thêm typing streak A đang tích từ một mục tiêu khác nếu không có rule explicit.

Không chuyển đổi tất cả passive bằng vòng lặp gọi correct-key handler U lần. Tách pure progress/reward khỏi SFX, shots và proc dispatch. Từng passive phải có entry mapping + test; entry chưa phân loại là release blocker, không được im lặng tắt build của người chơi.

### 14.4 Không có mixed completion

V2 loại `mixed completion` khỏi kết quả gameplay mới. Nếu schema chung sau này cần giữ field legacy, giá trị ở Space V2 phải luôn 0 và được test. Trận Hybrid tổng hợp hai nhóm completion, không pha nguồn trên một unit.

## 15. Learning và metrics

### 15.1 Metrics sản phẩm

- Typing: hits/misses/typed characters/WPM như cũ.
- Voice: accepted words, speech segments, no-match, ambiguous, stale/owned rejects, technical failures, latency.
- Hybrid: keyboard completions và voice completions riêng; không có “gõ dở + nói nốt”.
- Không gọi acceptance rate là pronunciation score hoặc recognition accuracy tuyệt đối.
- Recognition accuracy/false-trigger rate có nhãn ground truth chỉ đến từ corpus/benchmark.

### 15.2 Learning event

Trước Voice damage production phải có additive contract truyền input source + learning task. Có thể thêm activity `speaking` và `speaking-recall`, nhưng phải kiểm tra parser, aggregation, backup/import và dashboard của parent, không chỉ đổi string ở child.

V1 learning policy:

- Voice normal: lưu bằng chứng nhận diện từ, không tăng bằng chứng spelling mastery.
- Voice Recall: lưu task recall + source voice + hint/replay; không kết luận accent đúng chuẩn.
- Engine no-match/permission/lifecycle failure không tự ghi `wrong` hay `spelling`.
- Khi chưa có bộ quy tắc speaking mastery được duyệt, lưu event tách biệt mà không đưa vào điểm mastery typing/recall cũ. Không im lặng bỏ sự kiện và không giả loại cũ cho tiện.
- Unit bị system AoE hoàn thành không nhận một voice learning event riêng.

Không được gọi nguyên `buildCombatLearningEvent` hiện tại cho voice vì nó gắn activity typing/perfect→spelling.

## 16. UI/UX cụ thể

### 16.1 Trước stage

Selector Typing / Voice / Hybrid; mô tả ngắn:

- Typing: “Gõ để chiến đấu.”
- Voice: “Đọc từ tiếng Anh để tấn công. Kỹ năng vẫn dùng phím/nút.”
- Hybrid: “Gõ một mục tiêu, đọc mục tiêu khác. Từ đã gõ không nhận giọng nói.”

Readiness: Host → microphone → model → vocabulary/tokenizer → targets ready. Chỉ Start khi toàn bộ điều kiện của mode đạt. Cho phép quay lại Typing bất kỳ lúc setup; không yêu cầu mic với Typing.

### 16.2 Trong trận

- Target chưa gõ: nhãn bình thường, icon mic nhỏ khi sẵn sàng nếu không làm rối.
- KEYBOARD_OWNED: giữ highlight phần chữ đã gõ; thêm icon bàn phím hoặc “ĐANG GÕ”.
- **Chỉ làm mờ/tắt indicator voice**, không bôi xám toàn bộ từ đang cần đọc để gõ.
- Mic HUD: OFF / READY / LISTENING / HEARD / SPEECH PLAYBACK / RETRY / ERROR.
- Candidate target chỉ hiển thị khi engine có capability; VAD chỉ bật nhịp nghe/tích năng lượng chung.
- Nói A đang gõ: thông báo nhẹ có rate limit “Từ này đang được nhập bằng bàn phím”; không spam toast hoặc rung sai phím.
- Đang gõ A, voice B thành công: shot/impact tại B; A vẫn highlight và con trỏ giữ chỗ.

### 16.3 Results

Hiển thị input mode lúc bắt đầu, mode thực tế đã dùng, số completion theo nguồn, số lần technical fallback và profileVersion. Không quảng cáo “100% chính xác” chỉ vì mọi result được chấp nhận đều nằm trong target list.

### 16.4 Accessibility

Không dùng mỗi màu để biểu thị ownership; có icon/text. Không auto focus Portal làm mất phím của iframe sau mic setup; trả focus về game có chủ đích. Mic permission/retry buttons phải dùng được bằng bàn phím.

## 17. Pause, lỗi và mode switching

### 17.1 Pause barrier

Khi pause/modal chặn combat: game tăng inputEpoch trước, local reject ngay, báo parent suspend. Resume: snapshot mới, audio boundary mới, ready rồi mới cho Voice combat chạy. Không tái dùng audio đã nói trong pause để tấn công sau resume.

Ownership keyboard của unit vẫn còn nếu combat state giữ nguyên; inputEpoch mới không reset unit về AVAILABLE.

### 17.2 Voice failure

Pause combat; hiển thị Retry / Switch to Typing / Exit. Chuyển mode là thao tác rõ ràng của người chơi, không tự ý.

Retry hủy session cũ, flush audio, prepare snapshot. Không tự resume chỉ vì permission cũ vẫn granted khi còn modal chưa đóng.

### 17.3 Hybrid failure

Keyboard tiếp tục. Không đổi toàn run thành Typing thuần trong lịch sử; ghi Hybrid có voice downtime. Retry phải có session mới và không ảnh hưởng lock A.

### 17.4 Chuyển Voice → Typing do lỗi

Không despawn/reseed hoặc làm mất tiến độ hiện tại. Giữ encounter profile cho phần còn lại của encounter; đổi profile mới ở boundary an toàn. Ghi `modeChanged=true`/mixed-mode run, không đưa kết quả này vào best Typing thuần.

Mode thông thường chỉ chọn trước stage. Không cung cấp live toggle liên tục để farm reward/pacing.

## 18. Persistence và migration

Tách:

1. Preference: mode mong muốn cho lần chơi sau, ngôn ngữ, mic device preference nếu hợp lệ.
2. Run metadata: requested/effective modes, profileVersion, fallback history, source totals.
3. Ephemeral: mic session, candidate, audio buffers, detection caches, engine handles — **không lưu vào save game**.

Old save thiếu mode → Typing. New run metadata additive và có sanitizer/schema tests; unknown mode → safe Typing preference nhưng không viết lại lịch sử run thành Typing.

Recovery đi theo checkpoint/stage-entry hiện tại, không tự thêm một hệ mid-combat snapshot mới. Nếu có luồng phục hồi partial unit, ownership phải được phục hồi an toàn hoặc encounter bắt đầu lại từ checkpoint; không phục hồi `typed > 0` nhưng quên keyboard ownership.

Save/load khi thiếu Voice Host vẫn mở được dữ liệu; hỏi dùng Typing cho run kế tiếp/recovery có đánh dấu chuyển mode. Không giả serialise lại microphone permission.

Leaderboard/best score cần key theo profile/mode; không ghi đè best Typing bằng Voice/Hybrid. Shared currency/progression có thể dùng chung nhưng chỉ nhận từ completion receipts đã kiểm soát; kiểm tra farm rate trong balance gate.

## 19. Offline, model delivery và versioning

- Model/runtime/tokenizer nằm ở parent một bản, được chuẩn bị trước khi export.
- Manifest: ID, task, language, library build revision, model/tokenizer version, file sizes, hashes và nguồn/license từng artifact.
- Không mặc định license library bao gồm mọi pretrained model; xác minh trước phân phối.
- Không commit model lớn vào Git thường một cách tự động.
- Cache write/update phải atomic theo version; failed download không đè model tốt bằng file dở.
- Kiểm tra storage quota, cache eviction, corrupt weights, tokenizer mismatch, WASM thiếu và offline cold start.
- Không auto cập nhật model giữa combat; đổi model làm session cũ hết hiệu lực.
- Lazy load code/model Voice; Typing startup không fetch weights, không xin mic, không tạo inference worker.

Web Speech không nằm trong fallback mặc định của V1. API `processLocally` mặc định false, browser có thể xử lý remote; chỉ được thêm nếu capability local và offline language pack được kiểm chứng, hoặc user phê duyệt remote riêng. [MDN processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally).

## 20. Hiệu năng và benchmark bắt buộc

### 20.1 Không dùng benchmark rời làm bằng chứng duy nhất

Đo cùng scene nặng của Space: background creature lớn, boss, nhiều projectile/VFX, BGM/SFX. So Typing baseline với Voice/Hybrid cùng quality/DPR/seed/viewport và thiết bị. Worker vẫn tranh CPU/RAM/nhiệt với game.

Model memory trên đĩa không phải peak RAM. Đo warm-up, inference, tokenizer, WASM heap, buffers và release/reload. Không copy nguyên cấu hình demo rồi coi là production.

### 20.2 Mục tiêu nghiệm thu ban đầu

| Chỉ số | Mục tiêu đề xuất |
|---|---|
| Word end thật → game accepted commit | median ≤250 ms; p95 ≤450 ms |
| Host detection → game resolution | p95 ≤1 frame mục tiêu trong foreground, đo thực tế |
| Game accepted → phản hồi nhìn thấy | ≤1 frame mục tiêu, không chờ model lần nữa |
| Frame-time tăng so baseline | p95 tăng không quá 2 ms ở scene ổn định 60 Hz; nếu baseline đã fail phải báo riêng |
| Audio backlog | Không tăng vô hạn; recovery ở 300 ms |
| False commit do stale/owned/replay/TTS fixture | 0 trong bộ deterministic/integration tests |
| Correct target acceptance, môi trường yên | ≥95% trên corpus có nhãn tối thiểu 1.000 lần đọc |
| Wrong-target commit | ≤0.5% trên corpus; báo số tuyệt đối và nhóm từ gây lỗi |
| Negative audio | 0 observed false commit trong tối thiểu 3 giờ audio thử; không gọi là zero risk |
| Soak | 30 phút combat liên tục + 50 lần stage/session transition; không tăng tài nguyên không giới hạn |
| Typing-only | 0 model fetch, 0 mic request, 0 voice inference worker |

Nhóm noisy/speaker audio phải báo riêng, không trộn với quiet để che lỗi. Chốt ngưỡng với chủ dự án sau baseline nhưng không tự nới ngưỡng chỉ để ghi PASS. p95 tính cả các lượt chậm có kết quả; no-trigger/miss rate báo riêng để không loại mẫu thất bại khỏi đánh giá.

### 20.3 Corpus và browser matrix

- English tự nhiên từ người học Việt Nam, nhiều người/giọng; train/tune và acceptance không cùng một bộ audio duy nhất.
- Từ ngắn/dài, homophone, prefix, unknown words, nhiều từ liền, im lặng, tiếng bàn phím, tiếng game, TTS giống đáp án.
- Mac Apple Silicon và Intel nếu còn hỗ trợ; Chrome/Safari; Windows/browser thuộc danh sách hỗ trợ thực tế.
- Mic tích hợp/tai nghe, loa ngoài, Bluetooth disconnect/reconnect; màn hình Retina và quality người dùng thật.
- Báo máy, OS/browser version, mic, model hash, runtime build và policyVersion.

### 20.4 Pacing theo mode, không tự coi ba mode ngang sức

Tạo `TypingProfile` giữ nguyên và hai profile có version riêng `VoiceProfile`, `HybridProfile`. Profile được chốt trước encounter, không thay mỗi khi engine chậm.

Các knob phải có config/test và được đo: số target voice đồng thời, spawn interval, thời gian tiếp cận, độ dài/độ khó phát âm, counter response window, số unit/phút, reward/phút. Dùng benchmark 5/10/15 active lexical forms để tìm phạm vi, không mặc định protocol ceiling 64 là gameplay density tốt.

Thời gian tối thiểu của counter Voice phải dựa trên thời gian người chơi đọc cue + phát âm thực tế + recognition p95 + biên an toàn. Không chỉ cộng 450 ms vào một typing window rồi cho là đủ. Chọn hệ số từ corpus/encounter measurements và ghi vào profile, không dùng tốc độ ASR thay cho thời gian phát âm.

Hybrid có khả năng giải quyết A bằng keyboard và B bằng voice nên throughput có thể cao hơn cả hai mode riêng. Giữ bảng điểm/profile riêng và đo rate progression; không giả định cap reward mỗi từ đã giải quyết fairness. Không tự tắt hiệu ứng hình ảnh hoặc giảm địch của Typing để cân bằng Voice.

Trong mode Voice-only, hạn chế target khó phân biệt qua spawn selection nhưng không tự bỏ từ khỏi thư viện học hoặc tạo enemy không thể xử lý. Nếu stage script ép xuất hiện nhóm không phân biệt được, đó là coverage decision trước release chứ không phải việc matcher tự chọn bừa khi chạy.

## 21. Kế hoạch file — không dựng framework quá mức

Tên đề xuất, có thể gom module nhỏ khi code thực tế:

```text
parent/
  shared/voice/
    protocol.mjs + types/declarations + tests
    target-snapshot.mjs + tests
    result-policy.mjs + tests
    models/manifest.json
    fixtures/
  portal/src/voice/
    host.ts
    session.ts
    capture.ts
    capture.worklet.ts
    engine.ts
    engines/<engine được chọn>.ts
    workers/voice.worker.ts
    model-cache.ts
    keyword-compiler.ts
    microphone-ui.ts
  scripts/voice-models-prepare.mjs
  scripts/voice-models-check.mjs

space-typing/
  src/input/
    mode.ts
    input-controller.ts
    keyboard-adapter.ts
    voice-bridge.ts
    target-registry.ts
    target-ownership.ts
    input-policy.ts
    input-metrics.ts
  src/ui/input-mode.ts
  src/ui/voice-status.ts
  tests/voice-*.test.ts
  tests/hybrid-*.test.ts
```

Không tạo đồng thời cả KWS/ASR/Whisper/WebSpeech production nếu một engine đủ scope. Fake/replay engine là test support. Không import tương đối vượt ra parent từ child độc lập để dùng runtime; giao tiếp theo protocol, giữ contract fixture/version thống nhất.

## 22. Milestones và đầu ra từng bước

### V00 — Audit và đóng phạm vi

1. Ghi HEAD + working-tree state; đọc source mới nhất.
2. Lập input priority map và inventory mọi completion/reward/learning consumer.
3. Phân loại target kinds/patterns/stages: supported mapping, cần thiết kế, excluded.
4. Ghi rõ không mixed completion và keyboard-owned suppression cho all partial units.
5. Chốt reference device/browser và corpus consent.

Đầu ra: audit matrix + baseline test commands + các decision còn thiếu (đặc biệt projectile/puzzle), chưa thay combat. Không tự nhận toàn campaign supported khi bảng coverage chưa đủ.

### V01 — Chứng minh engine local bằng harness dùng lại được

1. Chọn KWS và ASR baseline; pin versions/license/artifacts.
2. Chứng minh dynamic context, tokenization, stream disposal và worker integration.
3. Đo audio continuity, no partial-confidence assumption, CPU/RAM khi game đang render.
4. Thử keyword churn khi đang nói, no-match và TTS replay.
5. Chọn đúng một engine cho production scope; ghi lý do dựa số đo.

Đầu ra: benchmark report + model manifest + replay corpus. Nếu không engine nào đạt: báo NO-GO kỹ thuật và giới hạn; không chữa bằng tắt hiệu ứng hoặc giảm tốc game vô hạn.

### V02 — Contracts, Host và audio lifecycle

Implement parser, handshake/ack, state machine, permission/cancel, bounded buffers, model cache, capture/worker, epochs và TTS gate. Test với FakeEngine trước khi nối engine thật. Test origin spoof/late permission/reload/stop ngay trong milestone.

Đầu ra: Portal mic UI + host harness chạy offline; child gameplay chưa nhận damage từ voice.

### V03 — Keyboard seam và semantic completion

1. Bọc keydown sau modal/hotbar/control checks; giữ priorities hiện tại.
2. Tách completion source-specific nhưng chưa bật Voice.
3. Đưa unit identity và ownership latch vào đúng accepted-key path.
4. Sửa clear-target có điều kiện, không phá partial special targets.
5. Regression keyboard reward/procs/boss/Recall/controls/save.

Đầu ra: Typing hành vi tương đương baseline; không fake voice qua handleKey.

### V04 — Registry và shadow detections, không damage

Publish target snapshots/eligibility, compile-ready acknowledgements, stale/ownership/audio guards. Test real engine chỉ hiển thị diagnostic accepted/rejected, chưa mutation gameplay. Kiểm chứng A gõ thì B vẫn voice-eligible và engine churn không làm mất lời nói B.

Đầu ra: protocol + target lifecycle tests, shadow report. Đây là chế độ kiểm chứng nội bộ, không thay thế release thật.

### V05 — Voice normal combat hoàn chỉnh

Nối semantic completion + receipt/reward policy + VFX/SFX + learning source + mic setup + pause/error/recovery + run metadata. Không để analytics và recovery chờ milestone cuối.

Đầu ra: normal stage Voice end-to-end, offline, không typed metrics giả. Chưa tuyên bố toàn campaign hoàn tất.

### V06 — Hybrid theo ownership V2

Implement toàn bộ ma trận mục 6, đặc biệt typing A / voice B, conditional lock release, suppression duplicate aliases và stale results trước keyboard claim. UI keyboard-only indicator và no mixed completion. Đo mechanic throughput riêng, không giả định cân bằng giống Typing.

Đầu ra: Hybrid deterministic tests + browser evidence. Không còn đường cho voice hoàn thành unit KEYBOARD_OWNED.

### V07 — Boss, Recall, bonus và coverage

Mỗi mechanic mapping riêng, status/window/resource/candidate restrictions giữ đúng. Việc cần đổi luật như single-letter projectile phải được quyết định trước branch đó; không tự bỏ qua. Audit lại passive builds, stage routes và bắt buộc không có input dead-end trong scope được công bố.

Đầu ra: coverage matrix toàn stage/pattern được mở Voice/Hybrid + tests. Unsupported stages chỉ được giới hạn rõ ràng nếu chủ dự án đồng ý phạm vi release; không âm thầm giảm scope.

### V08 — Offline export, stress, migration và nghiệm thu

Build/export parent + Space, cold offline start, error paths, soak/perf corpus, screenshots tự xem qua Portal, regression các child routes. Không chạy inference regression có physical mic bắt buộc trong CI; deterministic fixtures + manual mic suite riêng.

Đầu ra: acceptance report PASS/FAIL/BLOCKED từng gate, versions/hash, ảnh, logs, measurements, known limits. Không commit/push nếu chưa được yêu cầu.

## 23. Test matrix tối thiểu

Mỗi ID phải có expected outcome và test/evidence tương ứng; test name không đủ nếu assertion chỉ kiểm tra DOM text.

| ID | Tình huống | Expected |
|---|---|---|
| H01 | Gõ đúng ký tự đầu A | Owner A=keyboard trước side effects |
| H02 | Gõ sai khi A chưa sở hữu | Không chiếm một target mới |
| H03 | Nói A sau khi A có owner keyboard | Reject, không damage/reward |
| H04 | Candidate A rồi gõ A | Candidate hủy; result trễ reject |
| H05 | Gõ A, nói B | B xong; A giữ khóa/tiến độ |
| H06 | Voice B đi nhánh layer-return | Không clear khóa A |
| H07 | Voice B đi nhánh kill/end hooks | Không clear khóa A nếu A còn hợp lệ |
| H08 | B completion AoE giết A | A invalidated; không resurrect lock |
| H09 | Enemy A và bonus C đều partial | Cả hai excluded voice |
| H10 | Partial progress về 0 do mechanic | Ownership latch vẫn keyboard |
| H11 | System soften B không có typing | Không nhầm B thành keyboard-owned; reward remaining-only |
| H12 | A và B cùng spoken alias, A đang gõ | Không retarget lời nói A sang B |
| H13 | A complete; alias B re-enable | Chỉ audio mới được nhận |
| H14 | Pause/resume đang gõ A | Giữ ownership, đổi inputEpoch |
| H15 | Voice wins trước keydown | Một completion; keyboard không sửa unit terminal |
| H16 | Cả một stage Hybrid | mixed completions=0 |
| H17 | Mọi target hiện tại đều keyboard-owned | Voice báo no-targets; keyboard/game không bị pause |
| R01 | B spawn lúc đang nói A | A vẫn được nhận nếu versions/eligibility giữ nguyên |
| R02 | A đổi layer/text giữa nhận diện | Old result reject |
| R03 | Stage retry dùng lại enemy numeric ID | Encounter/unit identity ngăn stale hit |
| R04 | Result tới hai lần | Một receipt, một reward |
| R05 | Stream replay sinh result ID khác | Audio-span dedupe ngăn double hit |
| R06 | Nói hai keyword trong một hơi | Hai detections riêng nếu valid; không dedupe cả hơi |
| R07 | Nói cùng từ hai lần thật | Không loại lần thứ hai chỉ vì trùng text |
| R08 | Result rejected rồi unit mở lại | Không resurrect rejected result |
| R09 | Counter window hết hạn | Reject, không backdate |
| R10 | Game frozen/modal nhưng phase playing | Voice bị chặn đúng input context |
| A01 | TTS keyword, result tới sau gate reopen | Reject theo audio provenance |
| A02 | Cancel TTS A rồi phát TTS B | Callback A không mở gate B |
| A03 | AudioWorklet input rate khác model | Resample đúng; không rơi âm đầu/cuối |
| A04 | VAD cắt silence giữa/chót từ | Không mất trailing frames cần decoder |
| A05 | Worker xử lý chậm kéo dài | Bounded backlog, controlled recovery |
| A06 | Permission resolves sau user cancel | Tracks bị stop, không mở session ma |
| A07 | Mic unplug/AudioContext suspended/OS wake | Trạng thái lỗi/retry rõ, không stale commits |
| A08 | Loa BGM/SFX/TTS, người dùng không nói | Không false commit trong acceptance corpus |
| A09 | Audio epoch mới nhưng result epoch cũ tới sau | Reject độc lập với target registry revision |
| E01 | Engine không có confidence/partial | UI/contract không fake field |
| E02 | Target update khi đang nói | Không drop prefix do rebuild mỗi spawn |
| E03 | Unknown/custom token | Preflight error rõ; không bắt đầu stage không chơi được |
| E04 | react/reactor, right/write | Không early wrong-target; ambiguous policy đúng |
| P01 | Voice completion | Typed letters/hits không tăng |
| P02 | Voice receipt retry | Không nhân score/power/loot/proc/learning |
| P03 | Voice + system progress | Không thưởng input phần đã được system cấp |
| P04 | Per-key passive thresholds | Một dispatcher, cap theo policy, không fake shots |
| P05 | Typing-only golden fixtures | Score, resource, procs và order như baseline |
| P06 | Hybrid nhận voice + keyboard cho hai target | Hai nguồn không nhân đôi dispatcher/cooldown của cùng passive |
| L01 | Recognition reject kỹ thuật | Không ghi spelling wrong |
| L02 | Voice Recall replay | Assist đúng, không pronunciation mastery giả |
| S01 | Old save | Default Typing, dữ liệu không mất |
| S02 | Voice failure chuyển Typing | Run đánh dấu modeChanged, profile không nhảy giữa encounter |
| S03 | Recovery không có Host | Save mở được, không khởi động voice ghost session |
| O01 | Offline cold start | Không fetch remote model/CDN/service |
| O02 | Cache corrupt/quota failure | Lỗi rõ, không dùng artifact một phần |
| O03 | Standalone child | Typing chạy; Voice giải thích cần Portal |
| X01 | Spoof origin/source/session/version | Parser/gate reject |
| X02 | Iframe reload rồi event cũ tới | Session cũ vô hiệu |
| X03 | Route sang game khác | Stop capture đúng; không ảnh hưởng child khác |
| F01 | 30 phút game nặng | Frame/audio/memory/thermal evidence đạt gate |
| F02 | 50 lần start/stop/stage transition | Không leak tracks/workers/streams vô hạn |

## 24. Visual/manual testing qua Portal

Đọc lại `docs/VISUAL_TESTING.md` lúc thực hiện. Công cụ screenshot hiện có hướng dẫn mở child trực tiếp để bấm dễ hơn, nhưng Voice production cần Host ở Portal. **Không dùng screenshot standalone làm bằng chứng end-to-end Voice.**

- Chụp toàn Portal bằng browser automation có frame targeting/CDP phù hợp, hoặc harness có Host thật.
- Nếu cần mở rộng công cụ visual để thao tác cross-origin frame, giới hạn ở test tooling; không copy runtime voice vào child để né vấn đề.
- Screenshot trực tiếp child chỉ chứng minh phần UI/render độc lập hoặc fake input harness và phải ghi nhãn.
- Chụp trước/sau cùng viewport/DPR/quality/scene/timepoint theo tài liệu hiện tại.
- Bắt buộc có ảnh: readiness; A đang gõ; voice B đang bắn mà A vẫn highlight; rejected A; mic lỗi; results phân nguồn.
- Tự mở và xem ảnh trước báo PASS. Screenshot không chứng minh mic accuracy; cần logs/corpus/audio test thật riêng.

## 25. Những điều không được làm

1. Không vòng lặp `handleKey` từ transcript.
2. Không voice-complete target đã bắt đầu gõ dù chỉ còn một chữ.
3. Không vô hiệu toàn bộ Voice khi keyboard gõ A.
4. Không global revision reject mọi result khi địch khác spawn.
5. Không chỉ dựa vào việc remove keyword ở engine để ngăn stale result.
6. Không để voice B xóa keyboard lock A vô điều kiện.
7. Không reload weights mỗi target update hoặc compile toàn thư viện mỗi frame.
8. Không fake confidence, partial transcript, typed WPM hay perfect pronunciation.
9. Không tự remote fallback khi offline engine lỗi.
10. Không TTS gate chỉ dựa callback-time.
11. Không thưởng lại event/audio đã dùng hoặc rewrite rejected result thành accepted về sau.
12. Không đưa mic/audio/candidate ephemeral vào save game.
13. Không nhận một benchmark đứng riêng thay cho game-under-load evidence.
14. Không đánh dấu toàn campaign/ba mode hoàn tất khi còn stage input dead-end.
15. Không tự push/commit hay reset working tree.

## 26. Checklist cho AI nhận bàn giao

- [ ] Đọc V2 này và loại rule cũ “typing dở rồi voice cùng từ”.
- [ ] Xác nhận từ đang gõ excluded voice, nhưng các từ khác vẫn nhận voice.
- [ ] Ghi baseline HEAD + local diff, không reset về hash trong tài liệu.
- [ ] Hoàn thành input/reward/target coverage audit trước chỉnh Game.ts.
- [ ] Chốt decisions chưa có của projectile/puzzle nếu mở các stage đó.
- [ ] Chọn engine bằng số đo, pin model/tokenizer/binding; capability trung thực.
- [ ] Protocol có target-level versions, audio span, ack, session/epoch và bounded history.
- [ ] Keyboard-only regression pass trước nối Voice damage.
- [ ] Conditional keyboard lock release và no mixed completion có tests.
- [ ] Reward/learning/persistence/UX cùng hoàn thiện khi bật Voice.
- [ ] Offline và failure recovery có evidence, không silent cloud fallback.
- [ ] Visual evidence qua Portal + mic/performance tests thật.
- [ ] Báo rõ PASS / FAIL / BLOCKED / NOT RUN từng gate.
- [ ] Không gọi tài liệu này là bằng chứng tính năng đã hoạt động.

## 27. Tóm tắt thay đổi so với master plan ban đầu

| Điểm cũ | Quyết định V2 |
|---|---|
| Có thể nói nốt từ đang gõ | Cấm; ownership keyboard theo unit |
| Keyboard partial lock chặn chuyển sang enemy khác bằng voice | Voice vẫn đánh B; không được phá khóa gõ A |
| Mixed completion | Không có trên cùng unit |
| Mọi registry revision cũ đều invalid | Validate unit/version/epoch/audio thực sự liên quan |
| Cứ đổi stream khi target đổi | Stable snapshot/lexical context, update có ranh giới và audio continuity |
| Confidence/candidate như khả năng mặc định | Optional theo API thực tế |
| TTS gate chỉ đóng lúc phát | Pre-play ACK + audio contamination window + reset/barrier |
| Web Speech fallback tổng quát | Offline-only; không silent remote fallback |
| Learning mở rộng sau | Phải đúng nguồn input trước Voice production |
| UX/recovery/perf tới cuối mới đầy đủ | Tối thiểu có ngay từ vertical slice; hardening cuối |
| Chỉ lưu mode preference | Thêm run mode/profile attribution, không lưu audio runtime |

**Quy tắc ngắn nhất để nhớ:** gõ A thì A thuộc bàn phím đến hết từ/layer; nói B thì xử lý B độc lập. Kết quả voice đến trễ không được lấy lại A, và hoàn thành B không được làm mất chỗ đang gõ A.
