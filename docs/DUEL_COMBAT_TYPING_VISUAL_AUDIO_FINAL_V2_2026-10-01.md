# SPACE TYPING — PvP Combat, Random Typing, Visual & Audio — FINAL V2

Ngày: 2026-10-01. Baseline kiểm tra: local HEAD `000c3aa`, kèm working tree hiện có; không xác nhận bằng GitHub main. Loại tài liệu: đặc tả triển khai production, chưa phải tính năng đã được code.

## 0. Phạm vi và cách dùng tài liệu

Tài liệu này viết lại phương án tổng thể cho PvP của **Space Typing**, bổ sung yêu cầu mới: từ gõ phải phong phú, có random được kiểm soát; mục tiêu xuất hiện hấp dẫn hơn; hình, chuyển động và tiếng combat tiến gần ảnh tham chiếu của chủ dự án.

Đây là bản bàn giao độc lập về thiết kế/triển khai. Báo cáo điều tra gốc được giữ nguyên tại [DUEL_VISUAL_AUDIO_ROOT_CAUSE_AND_PRODUCTION_PLAN_2026-10-01.md](./DUEL_VISUAL_AUDIO_ROOT_CAUSE_AND_PRODUCTION_PLAN_2026-10-01.md) để truy lại bằng chứng. Nếu chi tiết thiết kế typing trong các tài liệu cũ mâu thuẫn với bản này, dùng bản này cho phần nâng cấp mới; không sửa luật gameplay ngoài phạm vi được chỉ rõ.

Trong lượt soạn tài liệu này **chưa sửa source, asset hoặc luật game**. Cụm “viết lại toàn bộ” đang được hiểu là viết lại bản thiết kế, theo phạm vi phân tích trước đó; không mặc nhiên cho phép thay toàn bộ engine. Muốn thực thi code cần xác nhận riêng.

Người triển khai phải phân biệt:

- **Hiện trạng đã xác nhận:** có file/vị trí hoặc phép kiểm tra kèm theo.
- **Quyết định thiết kế:** yêu cầu cho bản mới, chưa hiện hữu trong repo.
- **Gate nghiệm thu:** phải có kết quả thật trước khi báo hoàn thành; tài liệu không tự chứng minh game đạt chất lượng.

Không làm bản demo bỏ đi. Các bước bên dưới đều thuộc bản production. Kiểm thử, đo đạc và nghiệm thu vẫn bắt buộc; “làm thật” không có nghĩa bỏ kiểm chứng.

## 1. Kết quả trải nghiệm cần đạt

Người chơi thấy tàu mình phía dưới và đối thủ phía trên, field mở, HUD gọn góc. Trong field là asteroid, crystal, drone/module có khối và vật liệu đẹp. Mỗi mục tiêu có **từ cần gõ thay đổi giữa các lần xuất hiện**, đồng thời vẫn nhận biết nó cho hành động gì.

Ví dụ mô tả, không phải danh sách vocabulary đủ dùng:

| Hành động | Từ của lần xuất hiện A | Từ của lần xuất hiện B | Điều không đổi |
| --- | --- | --- | --- |
| Laser | `orbit` | `comet` | Art laser core, action ID, damage/energy/cooldown |
| Missile | `journey` | `captain` | Art missile, khả năng tích trữ/phóng theo luật thật |
| Bomb | `nova` | `star` | Art bomb và cách resolve hiện có |

Các ví dụ giữ số ký tự bằng token gốc tương ứng; chưa thể suy ra độ khó gõ hoàn toàn bằng nhau. Không thay `bomb` bốn ký tự bằng từ mười ký tự rồi giữ nguyên phần thưởng và gọi là chỉ đổi mỹ thuật.

Nhịp mong muốn: nhận ra vật thể → đọc từ → khóa mục tiêu → gõ với phản hồi chính xác → hoàn thành tạo kết quả hành động → mục tiêu tiếp theo xuất hiện có chuyển tiếp ngắn. Chữ luôn rõ; sức mạnh nằm ở chuyển động và âm thanh có chủ đích, không phải mọi thứ cùng chớp sáng.

## 2. Hiện trạng và nguyên nhân cần xử lý

### 2.1 Từ lặp vì content gắn cứng vào action

- `src/duel/actions.ts`: 18 action cơ sở, mỗi action có một `answerToken` cố định.
- `src/duel/map-actions.ts:20–60`: map thay ba token của `shield`, `reflect`, `barrier`; không có ngân hàng hàng trăm từ cho từng lần xuất hiện.
- `src/duel/draft.ts:168` trở đi: đã random action bằng RNG có seed, trọng số phase/map/strategy; tránh trùng action đang còn trên field khi đủ lựa chọn. Không có lịch sử vocabulary để chống lặp giữa các offer.
- `src/duel/model.ts:3`: mặc định **5 private offers**. `battle-ui.ts:60` có cap hiển thị **10**, không có nghĩa hiện game luôn tạo 10.

Đã chạy fixture read-only với map Frost Wastes, phase War cố định, seed 123456, 5 slot, hoàn thành luân phiên slot 500 lần: **18 từ khác nhau**; `bomb` 52, `missile` 49, `laser` 46, `railgun` 46. Không có hai từ giống nhau liền nhau trong fixture này. Đây không phải thống kê trận thật hoặc chứng minh RNG hỏng; nó cho thấy vocabulary bị giới hạn dù action draft đã random.

### 2.2 UI hiện tại không thích hợp để gắn thêm animation một cách trực tiếp

- `src/duel/battle-ui.ts:637`: `renderOffers()` gọi `replaceChildren()`, tạo lại toàn bộ button, sprite placeholder và label.
- Hàm đó được gọi trong `renderCore()` và `setPrediction()`; cập nhật trạng thái hoặc prediction có thể thay cả node, không chỉ chữ vừa gõ.
- `:61` có 10 tọa độ cố định; `:710` chọn theo **index trong danh sách đã lọc**, không phải một layout assignment bền vững theo instance.
- Hệ quả chắc chắn ở cấu trúc: DOM identity mất sau render. Rủi ro cần kiểm tra bằng video/profile: animation bắt đầu lại, focus mất, target còn lại đổi vị trí khi index đổi, churn khi gõ nhanh. Không khẳng định đã đo được bao nhiêu ms lag từ riêng việc này.

### 2.3 Đường token đang trải trên nhiều thành phần

Các nơi đọc token cần đồng bộ khi thay đổi:

| Thành phần | File/vị trí liên quan | Trách nhiệm |
| --- | --- | --- |
| Schema | `src/duel/model.ts` | Action và offer instance |
| Draft | `src/duel/draft.ts` | Deal/refill |
| Typing | `src/duel/typing.ts:40` | Tìm offer theo prefix |
| Authority engine | `src/duel/engine.ts:1376`, `:1435`, `:1564` | Match ký tự, khóa, hoàn thành |
| UI | `src/duel/battle-ui.ts:685`, `:1234` | Label/progress/current input |
| Prediction | `src/duel/network-client.ts:687`, `:741` | Prefix/target local |
| Bot | `src/duel/bots.ts:389` | Chọn và gõ token |
| Public telegraph | `src/duel/authority.ts:592` | Tính tiến độ nhưng không lộ private word |
| Match hosts | `src/duel/local-match.ts`, `src/duel/authority.ts` | State, refill, projection, round lifecycle |
| Wire/version | `src/duel/protocol.ts`, network/server consumers | Đồng bộ phiên bản, validation |

**Phát hiện thêm:** network prediction hiện đọc `DUEL_ACTIONS_BY_ID` cơ sở, trong khi engine theo map dùng token map. Frost shield thực tế là `icewall`; fixture `matchingDuelOffers("i", [shieldOffer], baseMap)` cho 0 match nhưng map-specific cho 1 match. Đây là mismatch code đã xác nhận, có thể gây prediction không phản hồi hoặc bị authority sửa lại. Chưa tái hiện độ giật trong phiên multiplayer thật. Đưa về một nguồn token theo offer sẽ xử lý cả vấn đề này nếu cập nhật đầy đủ consumers.

### 2.4 Những vấn đề visual/audio đã có bằng chứng

- 13/13 WebP combat VFX được kiểm tra không có alpha; pipeline còn `.removeAlpha()` tại `scripts/bg-art/prepare-combat-vfx.mjs:192`.
- Chrome minimal reproduction đã tái hiện black matte khi sprite screen nằm trong nhóm ghép không phù hợp; đổi cấp blend bỏ matte nhưng làm khói sáng/xuyên nền.
- CSS map `.duel-battle[data-map=...]` thắng `.duel-battle` cuối file; Frost giữ gradient tối tới alpha 0.75 thay vì 0.18 ở phần cuối.
- Target phần lớn dùng gradient shape; explosion dùng một ảnh scale/rotate/fade.
- Hook `src/main.ts:1147` đang gọi nhạc theo phase, chưa route combat events tới SFX trong đường đã kiểm tra.
- Map blast có cap riêng, không dùng chung budget mọi FX; chưa đo đủ để kết luận phần trăm CPU/GPU do nó gây ra.

Các finding này vẫn phải sửa. Thêm random vocabulary không tự làm hiệu ứng đẹp hoặc hết lag.

## 3. Các quyết định không được làm sai

1. **Tách action khỏi typing prompt.** Action định nghĩa tác dụng; prompt thuộc từng offer instance định nghĩa chữ cần gõ.
2. Authority quyết định prompt và kết quả. Client không tự random chữ, gửi đáp án tự chọn hoặc tự tính thưởng/damage.
3. Một offer có đúng một token bất biến từ lúc được phát tới lúc kết thúc. Gõ sai, hủy khóa, prediction rollback hoặc reconnect không đổi token.
4. Cùng content/version/seed/event history phải tái hiện cùng kết quả; thay FPS, quality, viewport hoặc số particle không đổi vocabulary/action.
5. Giữ damage, energy, cooldown, inventory, phase, hazard, response windows hiện tại trừ khi có thay đổi balance riêng được duyệt.
6. Không tăng private offer count từ 5 lên 10 chỉ để giống ảnh; thêm lựa chọn ảnh hưởng chiến thuật. 10 là giới hạn hiện có của private word field, không phải lý do giấu counter/objective khẩn cấp.
7. Giữ token chữ cái ASCII tiếng Anh cho scope này: input hiện nhận `[a-z]`. Không âm thầm thêm câu, dấu cách, dấu tiếng Việt hoặc cơ chế bài thi vào luồng này. Cần một thiết kế input riêng nếu mở rộng ngôn ngữ.
8. Không giữ một danh sách 5–10 từ mới rồi gọi đó là random phong phú.
9. Không random lại vị trí mỗi frame/tick/ký tự. Không làm chữ bay vòng, nhòe, xoay hoặc biến mất trong lúc đang gõ.
10. Cosmetic FX không phải nguồn authority. Nổ kết thúc, audio kết thúc hay ảnh decode chậm không quyết định thắng thua.

## 4. Thiết kế dữ liệu typing mới

### 4.1 Action definition

Giữ `id`, category, effect, resolve mode, energy/cooldown, capacity và visual identity. Bổ sung typing policy rõ ràng; không coi `typingCostBand` là số ký tự vì hiện `bomb` là medium nhưng chỉ 4 ký tự, `railgun` là long nhưng 7.

Đề xuất policy production đầu tiên: **độ dài chính xác bằng token hiệu lực của action trên map hiện tại**. Sinh bảng budget tường minh trong content mới từ baseline rồi đóng phiên bản, không phụ thuộc vĩnh viễn vào tên hiển thị. Trên các action hiện tại cần audit các độ dài 4–11; không mặc định mọi map có cùng tập độ dài.

Tên hành động dùng cho icon/tooltip/nhãn phụ. Token gõ không còn lấy từ tên hành động. Legacy `answerToken` nếu giữ cho replay cũ phải tách rõ đường version cũ, không fallback âm thầm trong trận mới.

### 4.2 Prompt gắn với offer

Các trường đề xuất, chưa phải type hiện có:

```ts
type DuelTypingPrompt = {
  promptId: string;       // identity của lần cấp prompt, không chỉ word ID
  wordId: string;         // khóa trong lexicon được đóng phiên bản
  answerToken: string;    // ASCII lower-case, validate ở authority
  lexiconVersion: string;
  difficultyClass: string;
};
// DuelActionOffer mới có typingPrompt: DuelTypingPrompt.
```

- Owner nhận token thực trong snapshot của mình; UI, bot và prediction dùng token đó.
- Opponent nhận telegraph tiến độ cần thiết, không nhận private token/word ID/lịch sử bag/seed tương lai.
- `promptId` phải unique trong match/round/owner context; reconnect dùng lại identity, không cấp mới.
- `difficultyClass` từ content được tin cậy; client không được sửa để nhận word dễ.
- Không có `Math.random()` trong rendering để tạo `answerToken` hoặc xử lý lỗi thiếu trường.
- Thiếu/malformed prompt trong protocol mới: lỗi dữ liệu rõ ràng, resync hoặc từ chối start; không hiện một từ trong khi engine đòi từ khác.

### 4.3 Dictionary/lexicon

Lexicon là content local đã kiểm duyệt, không gọi LLM/server ngoài để tạo từ giữa trận.

Mỗi entry: `wordId`, token chuẩn hóa, length, difficulty class, topic tags và version. Độ khó dựa trên tiêu chí được ghi thành bảng: mức phổ biến, pattern ký tự/độ khó gõ; không gán con số đẹp nhưng không có cách kiểm tra.

Mục tiêu content ban đầu: **ít nhất 64 từ hợp lệ cho mỗi độ dài được dùng**, không tính trùng sau chuẩn hóa. Nếu dùng đủ 4–11 thì tối thiểu 512 từ. Đây là yêu cầu mới để tránh pool nhỏ, không phải repo đã có 512 từ hoặc 512 là bảo đảm toán học hết mọi collision.

Yêu cầu duyệt:

- Từ có nghĩa, không chuỗi vô nghĩa để lấp quota; không profanity, thông tin cá nhân, từ có vấn đề về nội dung.
- Không gom số nhiều/biến hình của cùng một từ để giả tăng độ phong phú; lưu family nếu dùng biến thể và cân nhắc cooldown family.
- Không tự bỏ dấu/khoảng trắng của một phrase rồi coi thành từ tiếng Anh mới hợp lệ.
- Map/theme tags chỉ là ưu tiên mềm, không ép map chỉ còn vài từ về băng/lửa. Có thể dùng từ phổ thông khi themed pool thiếu.
- Nếu tái dùng word packs của game khác, kiểm tra format, license, ngôn ngữ và dependencies; không import cả bundle game khác.
- Tách curated common pool và reserve pool; reserve cũng phải được duyệt, không dùng lại tên skill làm fallback mặc định.
- Có registry reserved tokens đóng phiên bản cho tên/trigger action và các counter/objective liên quan. Không để một bomb có chữ `repair` hoặc một buff mang chữ `missile` gây hiểu nhầm tác dụng. Mức loại trừ full-prefix áp dụng theo input context ở mục 5, không tự loại mọi từ có cùng chữ cái đầu.

## 5. Thuật toán random: action draft riêng, word draft riêng

### 5.1 Không thay cả hai hệ random cùng lúc

Giữ action selection phase/map/strategy trước. Sau khi đã chọn action, word director chọn prompt phù hợp budget của action đó. RNG word-content tách khỏi RNG action, hazard, fate, bot và cosmetic.

`src/duel/rng.ts` đã có domain RNG; cần bổ sung/version domain mới hoặc cấu trúc tương đương. Không hút thêm random numbers từ stream action mỗi lần đổi vocabulary, nếu không cùng seed sẽ đổi cả diễn biến combat.

Lưu ý hiện `draft.ts` gán category weight lên từng eligible action. Không được hiểu các số trọng số là tỷ lệ category đã đo chính xác: số action còn eligible và prefix weighting cũng tác động. Bản này **không âm thầm sửa phân phối action** trong tác vụ vocabulary; baseline và test phải giữ hoặc báo thay đổi riêng.

### 5.2 Shuffle bag và bộ nhớ chống lặp

Mỗi player/round có word-director state: bags theo budget/difficulty, cursor, RNG state, lịch sử token đã **phát** và lần cấp prompt. Tính lịch sử cả từ đã bỏ qua/hết hạn, không chỉ từ hoàn thành, để không spam refill lấy lại từ dễ.

Quy trình đề xuất:

1. Nhận action, map, exact length budget, active offers và typing acquisition hiện tại.
2. Lọc pool theo độ dài/chính sách độ khó; topic chỉ ảnh hưởng ưu tiên trong pool hợp lệ.
3. Bỏ token đang hiển thị; bỏ full-prefix conflicts với token có thể auto-acquire trong cùng input context. `star`/`starlight` là xung đột; `star`/`stone` chỉ chung ký tự đầu, có thể phân biệt sau thêm ký tự.
4. Loại các token phản ứng cố định được dành riêng theo phạm vi cần thiết; không làm counter đang gõ bị một private offer mới chiếm prefix.
5. Chống lặp: ưu tiên không phát lại **20 token gần nhất toàn player** và **16 token gần nhất trong bucket độ dài**. Đây là cửa sổ thiết kế, phải audit đủ content để đạt.
6. Ưu tiên khác initial với các offer đang hiện để giảm phải gõ nhiều ký tự mới khóa. Initial diversity là soft constraint, không buộc bỏ cả một action tốt.
7. Chọn bằng seeded shuffled order, quét hữu hạn toàn bag/candidate set; không `while random` không giới hạn. Chỉ commit state khi cấp offer thành công.
8. Gắn prompt vào offer; snapshot state đầy đủ cho reconnect/replay theo khả năng persistence thật của hệ thống.

Không re-random token sau khi người chơi nhìn thấy. Shuffle lại bag khi hết lượt hợp lệ theo policy, giữ cooldown lịch sử qua ranh giới bag.

### 5.3 Thứ tự xử lý khi pool khó chọn

1. Bỏ ưu tiên theme.
2. Bỏ yêu cầu khác chữ đầu; vẫn giữ không duplicate/full-prefix conflict.
3. Dùng reserve pool cùng độ dài và độ khó hợp lệ.
4. Nếu chỉ cooldown chống lặp làm hết pool, chọn least-recently-issued trong các từ an toàn; ghi diagnostic `antiRepeatRelaxed`. Không phát lặp sát nhau nếu còn lựa chọn an toàn khác.
5. Nếu không còn token an toàn: không đổi chữ của offer cũ, không đổi action sang loại dễ, không lặp vô hạn. Ghi lỗi content và giữ pending refill có giới hạn, cấp lại khi có điều kiện; nếu không khôi phục được theo timeout được định nghĩa thì dừng trận với lỗi kỹ thuật theo policy hiện có, không xử người chơi thua vì content lỗi.

Pending refill phải được thiết kế trong match host, không giả định engine hiện đã hỗ trợ. Release gate là production lexicon không rơi vào nhánh thiếu token cứng trong các state generator/stress cases quy định. Không được dùng fallback mềm để che pool không đạt.

### 5.4 Không làm thay đổi target khi đang acquisition

Nếu người chơi đã gõ một prefix nhưng còn nhiều candidate, refill mới không được bất ngờ tham gia candidate set làm thay đổi ý định. Chọn token không match prefix đang dở; nếu không có thì trì hoãn riêng refill đó. Không trì hoãn toàn trận hoặc reset prefix.

Offer đã locked giữ token/prompt ID cho đến kết thúc. Nếu cancel, cùng offer và cùng token trở lại; không biến cancel thành nút reroll miễn phí.

Hệ hiện chỉ auto-acquire private offers; counter/objective có đường chọn riêng. Không tự mở auto-acquire mọi loại mục tiêu cùng lúc mà không thiết kế priority/ambiguity tương ứng.

## 6. Công bằng PvP và balance

### 6.1 Random có seed không đồng nghĩa công bằng tuyệt đối

Giữ cùng exact length cho cùng action/map giúp không đổi số phím hoàn thành, nhưng người biết từ và pattern bàn phím khác nhau vẫn có lợi thế. Cần dùng pool độ khó đồng nhất, audit phân phối giữa hai bên và đo thời gian hoàn thành; không hứa mọi từ cùng độ dài khó như nhau.

Không ép hai bên thấy cùng từ cùng thời điểm: tiến độ và action draw hiện khác nhau, snapshot từ riêng tư. Không đồng bộ bằng một global cursor bị thứ tự message của player-1/player-2 chi phối.

RNG word director tách theo player/round/budget với policy giống nhau. Đánh giá parity **có điều kiện theo cùng action/budget**, không so tổng ký tự của hai người chọn chiến thuật khác nhau rồi kết luận sai lệch. Không làm adaptive difficulty bí mật ưu ái bên đang thua trong ranked.

### 6.2 Những luật giữ nguyên

- Số private offers mặc định 5; cap 10 trong UI không phải thay đổi cân bằng mặc định.
- Lifetime hiện: attack 18s, defense 22s, support 20s, tactical 22s, fate/mystery 24s.
- Offer available đếm thời gian; locked tạm dừng lifetime hiện có. Cancel tiếp tục phần thời gian còn lại; không làm mới TTL.
- Hoàn thành action banked nhận item vào inventory, không tự phóng ngay chỉ vì vừa gõ xong. Action instant mới resolve theo luật instant.
- Wrong key không tự trừ thêm Hull hoặc reset cả từ nếu luật hiện không như vậy.
- Skill/map effects như freeze, drift, reshuffle vẫn có tác dụng theo contract hiện có. “Giữ ổn định vị trí khi gõ” áp dụng cho motion trang trí; không âm thầm vô hiệu hóa một tactical effect có authority.

### 6.3 Seed, replay, version và bảo mật

- Pin lexicon + budget policy + RNG algorithm/content version cho cả match; không update dictionary giữa round.
- Bump content/protocol phù hợp với thay đổi required fields. Client cũ/server mới phải fail compatibility rõ ràng, không im lặng lấy token cũ.
- Snapshot/reconnect giữ bag/cursor/history phía authority; owner nhận active prompt từ snapshot, không tự tái phát toàn bộ seed.
- Nếu hệ chưa có persistent replay/match resume thì ghi rõ; không hứa phục hồi qua server restart chỉ vì lưu được token trong RAM.
- Không gửi full bag, future prompts hoặc RNG state cho opponent. Kiểm tra protocol hiện có xem match seed nào được public: một deterministic PRNG không phải cơ chế chống đoán. Online competitive cần authority giữ word seed riêng; replay có thể lưu riêng hoặc công bố sau trận theo policy.
- Local bot offline vẫn dùng cùng word director/engine. Không giả vờ chống gian lận được người sở hữu toàn bộ local process.

## 7. Cách từ/mục tiêu xuất hiện hấp dẫn hơn

### 7.1 Ngữ nghĩa hiển thị

Một target gồm world sprite, token chính đọc rõ, dấu hiệu action phụ và vòng selection. Token là thứ người chơi phải gõ; action badge/silhouette cho biết nhận được gì. Không dùng cùng độ nổi cho hai dòng `LASER` và `orbit` làm người chơi gõ nhầm tên skill.

Đề xuất: chữ lớn `orbit`; nhãn phụ nhỏ `LASER`/icon cố định. Có tooltip/selected detail cho energy, cooldown, banked/instant. Chữ render bằng DOM/UI, tuyệt đối không bake vào ảnh.

### 7.2 State presentation theo instance

`new → readable/available → selected/typing → completed hoặc expired → cleanup` là lifecycle **presentation**; mapping rõ với status authority, không thay enum engine một cách máy móc.

- New: phát reveal một lần khi thấy instance mới, trừ resync giữa trận không replay hàng loạt intro.
- Available: label hiện rõ ngay khi offer được phép gõ. Decorative arrival có thể chạy phía sau nhưng không che label hoặc khóa input chờ animation.
- Selected: giảm bobbing trang trí; viền nhỏ, phần đã gõ khác màu, giữ chiều rộng nhãn ổn định.
- Completed: detach presentation residue không còn nhận input; tiếp tục impact/collect FX ngắn mà không giữ offer authority đã hoàn thành.
- Expired: fade/break-up nhẹ, không cùng tiếng nổ/flash như người chơi đạt thành công; không tính là typing miss.
- Cleanup: node/pool/voice/timer được thu hồi kể cả khi animationend không đến.

Không trì hoãn offer refill ở authority chỉ để chờ vụ nổ hết. Residue cũ và target mới có thể coexist nhưng residue không có label/hitbox và không che target mới.

### 7.3 Ba kiểu arrival có bản sắc

| Nhóm | Arrival đề xuất | Khi gõ | Khi hoàn thành |
| --- | --- | --- | --- |
| Attack object/asteroid | Trượt ngắn từ vùng lân cận, dust puff nhỏ, xoay vật thể nhẹ | Khe năng lượng sáng dần, label đứng yên | Vỡ/thu năng lượng rồi launch hoặc bank theo action thật |
| Defense/support crystal | Materialize bằng ring mảnh, scale rất nhẹ về 1 | Facet sáng theo progress | Ribbon/particle đi về tàu, shield/energy/repair cue đúng kết quả |
| Tactical/drone/special | Warp seam ngắn, drone ổn định vị trí | Reticle/module charge | Scan/distortion/drone action đặc trưng, không tái dùng bom cho mọi loại |

Thông số khởi đầu cho bản production, phải nghiệm thu để chốt: arrival 180–260 ms; pulse đúng phím 40–70 ms; completion accent 120–220 ms; expiry fade 120–180 ms. Không stagger việc cho phép gõ theo độ dài intro. Không flash trắng toàn màn trên từng ký tự.

### 7.4 Layout random có ràng buộc

Thay ten positions theo array index bằng **layout assignment lưu theo match/round/offer instance**, nằm trong một field layout manager.

Thuật toán:

1. Tính safe rectangle trừ HUD, tàu, vùng counter/objective và mép viewport.
2. Chuẩn bị anchors/candidate cells ở tọa độ chuẩn hóa; mirror tương đối nếu cần cho hai view, không random lại gameplay.
3. Khi có offer mới, chọn candidate bằng cosmetic seed riêng; kiểm tra rectangle gồm cả sprite, label và selection ring, không chỉ khoảng cách giữa tâm sprite.
4. Ưu tiên chỗ trống, tránh vừa xuất hiện sát cùng slot cũ liên tiếp nếu còn chỗ; vẫn không dồn mọi target mới ra góc xa.
5. Quét hữu hạn candidate set; nếu hết, dùng reserved stable slot layout và thu nhỏ khoảng trang trí trước. Không overlap chữ hoặc giấu target còn hợp lệ để giữ vẻ đẹp.
6. Target cũ không chuyển vị trí vì target khác bị xóa. Target locked không tự di chuyển bởi layout thông thường; resize xử lý tối thiểu để không ra ngoài màn.
7. Tactical reshuffle/drift được xử lý như event riêng: chuyển bố cục có chủ đích, không đổi chữ, không đánh tráo hitbox/instance. Định nghĩa rõ ưu tiên với locked target theo luật đã duyệt.

Random vị trí có thể tạo lợi thế/khó khăn đọc; vì vậy giới hạn các vùng nhìn tương đương, không cho một bên targets sát HUD hoặc toàn ngoài vùng trung tâm. Cosmetic seed không cần quyết định damage nhưng QA vẫn phải kiểm tra fairness về khả năng nhìn.

Trên màn hẹp: dùng layout hợp lệ khác, ưu tiên chữ và giảm decorative sprite. Không ẩn bớt action/counter mà authority vẫn cho chọn. Nếu không thể hiển thị tối thiểu một cách sử dụng được, có unsupported-viewport message rõ trước khi vào trận.

### 7.5 Nhịp xuất hiện không thành show hiệu ứng liên tục

Giữ default 5 private targets giúp mắt có khoảng thở. Lúc bắt đầu round, có thể biến thiên phase animation nhỏ giữa sprites nhưng mọi label phải đọc/gõ được khi authority bắt đầu.

Không auto tạo wave 10 targets chỉ vì ảnh concept có nhiều object. Dùng decorative asteroid ở nền để tạo độ sâu nhưng không gắn glow/label giống target. Không để object trang trí giống hệt mục tiêu đang khóa.

Thay đổi cảm giác theo phase bằng âm nền, màu cảnh, mật độ particle có cap và những action thật đang được draft; không bí mật rút ngắn thời gian đọc hoặc thay từ dài hơn ở cuối trận trong scope mỹ thuật này.

## 8. Điều kiện kỹ thuật trước khi thêm motion

### 8.1 Keyed reconciliation

- Dùng `Map<instanceId, targetView>` hoặc cơ chế tương đương; update prefix/timer/classes trên node đang có.
- Chỉ mount khi offer mới, unmount khi lifecycle kết thúc. Initial mount/round transition/resync cần phân biệt để không replay spawn FX nhiều lần.
- Một DOM target giữ listener ổn định; delegation hoặc listener per-instance có teardown rõ.
- Khi prediction đổi một ký tự, không recreate tất cả targets, threats và objective nếu dữ liệu không đổi.
- Timer text cập nhật theo nhịp hiển thị phù hợp, authority vẫn dùng clock thật. Không serialize toàn view hoặc đo layout tất cả chữ mỗi frame.
- Cache kích thước label theo token/font/viewport; đọc layout theo batch khi mount/resize/font ready, tách read/write để tránh forced layout.

### 8.2 Token resolver và prediction

Tạo một hàm lấy token theo target instance/type được các consumers dùng thống nhất; private offer mới đọc `typingPrompt.answerToken`, counter/objective đọc token authority hiện có. Không dùng default action token cho prediction trong trận mới.

Reconcile cần giữ đúng pending input: kiểm tra sequence acknowledgment, round identity, target đã expire/complete, snapshot đến trễ và resync. Nếu cần replay pending intents, phải giữ payload chứ không chỉ số sequence. Không tự hứa prediction chuẩn sau khi mới sửa lookup token.

Authority vẫn validate ký tự/target/energy/cooldown/capacity. Client prediction chỉ giúp gõ phản hồi nhanh, không spawn authoritative damage/reward trước khi xác nhận. FX thành công phải có dedup, tránh một lần predicted và một lần confirmed phát hai vụ nổ.

## 9. Art direction và asset production

### 9.1 Giữ bố cục, sửa chất lượng từng lớp

Giữ engine và scene concept combat-first. Nền thiên hà có chiều sâu nhưng hạ tương phản cục bộ ở vùng chữ; không dùng overlay đen mạnh phủ cả màn để đạt readability. HUD gọn, tàu/target có material riêng, đạn dẫn mắt tới điểm trúng.

Không copy ping, Rage hoặc số liệu concept nếu runtime không có cơ chế/dữ liệu thật. Màn bot offline không được gắn số ping giả.

### 9.2 Bộ art và cách tái sử dụng

- Ship V3/background: giữ nếu qua audit alpha, palette, padding, scale, memory; không tạo lại chỉ vì viết bản thiết kế mới.
- 18 action IDs phải có mapping visual: `laser`, `missile`, `railgun`, `bomb`, `siege-lance`, `shield`, `reflect`, `barrier`, `repair`, `energy`, `amplify`, `drone`, `lock-on`, `gravity`, `disrupt`, `scan`, `fate-crystal`, `black-hole`.
- Mỗi ID có silhouette/material nhận biết; có thể dùng chung base geometry với attachment khác nếu nhìn nhỏ vẫn phân biệt, không chỉ recolor mọi thứ.
- Word thay đổi không cần tạo ảnh mới: `orbit`, `comet` trên laser vẫn dùng laser core art. Không tạo hàng trăm ảnh ứng với hàng trăm từ.
- Tách sprite world target, projectile và effect; một missile target không phải một ảnh missile trail khổng lồ.
- Reuse drone/equipment/crystal assets đã có sau khi kiểm tra camera/style/license; không dùng icon có frame thành world object, không làm lẫn credit pickup với PvP action.

### 9.3 Alpha và animation contract bắt buộc

| Loại | Cách xuất/ghép | Không được làm |
| --- | --- | --- |
| Tàu, đá, drone, crystal | RGBA thật, source-over | Dùng nền đen rồi screen làm mất chi tiết tối |
| Khói/mảnh vỡ | Alpha che phủ mềm, source-over | Xóa toàn bộ pixel tối hoặc screen cả khói |
| Lửa sáng, glow, flash, năng lượng | Alpha hoặc black-backed emissive trong blend pass đúng | Đặt screen lên cả scene/HUD để che matte |
| Explosion/fire loop | Sequence/flipbook có frame/pivot chuẩn | Phóng một poster ảnh tĩnh rồi coi là animation hoàn chỉnh |

Metadata cần id/version/hash/dimensions/frame rects/FPS/pivot/bounds/alpha convention/blend/loop/lifetime/quality variants/decoded-byte estimate. Pipeline phải bảo toàn alpha đúng loại asset; không còn `.removeAlpha()` vô điều kiện cho tất cả.

Ưu tiên image generation cho world objects/key visual chất lượng cao; dùng công cụ VFX/3D/compositing hoặc sequence có license cho chuyển động nhất quán. Không mặc định AI sinh một sprite sheet nhiều ô là các frame đã đồng nhất, đúng layout và animate tốt.

Phải inspect alpha thật, không tin nền checkerboard vẽ trong ảnh hoặc đuôi PNG. Atlas đóng gói sau chuẩn hóa frame; không tự trim mỗi frame khác pivot rồi ghép.

### 9.4 Renderer và budget

HUD/label/input có thể giữ DOM; transient VFX có một owner/pool/timeline. Không bắt buộc đổi toàn game sang WebGL. Chọn CSS/Canvas/WebGL theo profile, nhưng dù renderer nào alpha/compositing phải đúng.

Tổng FX cap phải quản tất cả paths: projectile arrival, map blast, secondary explosion, typing spark, target reveal và damage loop theo nhóm đã định nghĩa. Không cap 24 node ở một hàm nhưng append hàng chục node ở đường khác. Giới hạn cả diện tích phủ, số heavy blasts và decoded textures.

## 10. Chuyển động combat và audio đồng bộ

### 10.1 Bắn và trúng

- Gõ đúng: feedback gọn tại chữ/target; không dùng map-wide blast.
- Hoàn thành instant attack: muzzle/launch → projectile → impact theo presentation clock, authority resolve theo luật thật.
- Hoàn thành banked attack: collect vào inventory với cue khác; khi item được dùng mới có launch/impact.
- Missile có hướng, trail theo quãng đường có cap; smoke puff tan theo tuổi, không kéo giãn một ảnh khói dài.
- Energy/shield/repair chạy đúng visual đích và chỉ biểu đạt kết quả hợp lệ; không giả healing khi state không tăng.

### 10.2 Bom nhiều pha

Contact flash 0–60 ms; fire expansion 40–220 ms; pressure ring 80–350 ms; debris 120–700 ms; smoke/tail 200–1000 ms. Đây là mốc thiết kế để dựng animation, không số đo hiện tại và có thể tune khi nghiệm thu.

Các pha chồng nhau; fire nhanh, smoke chậm, fragments độc lập. Giữ nhãn đọc được. Bom thường không bao trùm gần toàn màn; ultimate/finisher nếu luật có mới được dùng mức lớn hơn. Screen shake nhẹ, có reduced-motion, không pause input/network/authority để làm hit-stop.

### 10.3 Âm thanh

Combat audio router nhận event đã được phân loại và gắn cue time: shot, launch, impact, shield break, bomb, bank/collect, resource gain, destruction, round result. Reuse Sfx/sample-bank hiện có sau khi nghe đánh giá; không tạo một AudioContext mỗi target.

Tiếng bom gồm transient sắc + body mid-bass + sub ngắn + debris/tail; nghe trên loa Mac vẫn phải có body, không chỉ tăng bass sâu/gain. Có vài variant chất lượng để tránh lặp; word random không có nghĩa sample phải random không kiểm soát.

Dedup theo match/round/event/presentation identity có thật trong schema. Cap voice và ưu tiên major cue/warning; duck nhạc vừa phải; không clip khi đồng thời nhiều event. Giữ settings/mute/user gesture audio startup. Offline dùng audio files local, không cần sinh âm thanh bằng model trong lúc chơi.

Sync impact hình/tiếng từ timeline; không phụ thuộc duy nhất `animationend`, vì node có thể bị cap/remove. Hủy cue/timer/voice đúng khi round thay, exit, reconnect hay tab resume; không phát dồn cả burst lịch sử sau resync.

## 11. Kế hoạch triển khai theo thứ tự phụ thuộc

### Bước 1 — Chụp baseline và khóa phạm vi

Đọc `docs/PROJECT_CONTEXT.md`, `docs/VISUAL_TESTING.md`, report gốc và code hiện tại. Ghi HEAD, dirty files, map/mode/quality/viewport/DPR. Bảo toàn edits của người dùng. Không reset/checkout/ghi đè art sources.

Quay/chụp idle, typing, refill, map action, bomb, low Hull, round end; đo frame/input-paint. Kiểm tra script hooks: `pnpm build/dev` có art preparation trước, có thể ghi asset; không dùng như lệnh read-only.

### Bước 2 — Content/schema và token path hoàn chỉnh

Thiết kế lexicon, budget table, prompt schema/version, reserved tokens; cập nhật mọi consumer trong bảng mục 2.3. Local và online dùng cùng core word-director logic, không copy hai implementation rồi để khác nhau.

PASS bước này khi engine/UI/bot/prediction/public progress thống nhất cùng prompt, còn counter/objective đúng loại; malformed/version mismatch xử lý rõ. Không chỉ sửa chữ nhìn thấy.

### Bước 3 — Random director và replay/lifecycle

Thêm independent word RNG, shuffled bags, history, finite collision resolution, reconnect state và private projection. Test trước mọi nhánh fallback. Không đổi action/category balance ngoài kế hoạch.

PASS khi repeated words bị kiểm soát trên production pools, seed/replay ổn định và quality/viewport không đổi gameplay sequence; hai player không phụ thuộc arrival order của messages vào một shared word cursor.

### Bước 4 — Keyed target UI và layout manager

Loại recreate-all ở private targets; gắn instance → node/layout bền vững. Update đúng chữ, không reset animation. Thêm placement collision với labels/HUD/counters, resize và tactical effects. Hoàn thiện input trước khi phủ nhiều VFX.

PASS khi spam gõ/prediction/snapshots không remount targets cũ, chữ không nhảy/đổi, clicked target không bị thay bằng instance khác.

### Bước 5 — Sửa alpha/cascade và sản xuất art

Chốt art direction bằng asset thật ở kích thước runtime; tách emissive/occluding và decode readiness; sửa selector overlay. Mapping đủ 18 action IDs bằng asset đã duyệt. Không coi missing art fallback là hoàn thành mỹ thuật.

PASS khi không có matte vuông trên nhiều background, khói có thể che nền tự nhiên, labels dễ đọc và styles thống nhất.

### Bước 6 — Arrival/typing/completion/combat motion + audio

Triển khai recipes ở mục 7 và 10, lifecycle pool/caps, event/SFX router và cue timeline. Chuẩn hóa action banked/instant để hình không nói sai luật. Reduced-motion không đổi mechanic.

PASS khi video tốc độ thật và nghe audio đạt, không double-trigger, không spawn FX từ mọi snapshot của cùng offer.

### Bước 7 — Nghiệm thu production

Chạy unit/integration/E2E, sáu map, local bot và online có latency/reconnect, nhiều quality/viewport, chuỗi round dài. Báo kết quả thật, lỗi còn lại và thay đổi balance nếu có. Không ghi “PASS toàn bộ” nếu mới pass unit tests.

## 12. Ma trận kiểm thử bắt buộc

| Nhóm | Case bắt buộc | Điều kiện đạt |
| --- | --- | --- |
| Token contract | Cùng action ở hai instance có hai token khác | Cả engine/UI/prediction/bot gõ đúng token instance |
| Map regression | Frost shield/reflect/barrier và cả sáu map | Không lookup base token sai trong prediction |
| Prefix | Chung initial, full-prefix pair, duplicate sau normalize | Không khóa/hoàn thành nhầm target; invalid set không được cấp |
| Acquisition | Refill trong khi đang gõ prefix chưa lock | Không chen candidate mới làm đổi target dự định |
| Immutable | Wrong key/cancel/expiry/reconnect/snapshot lặp | Token không đổi ngoài lifecycle được cấp mới |
| Anti-repeat | Bag boundary, nhiều action cùng length, bỏ qua offer | History tính lúc phát; fallback có lý do/diagnostic |
| Exhaustion | Empty/corrupt/tiny pool, mọi initial trùng | Hữu hạn, không freeze, không đổi action/word đang gõ |
| Fairness | 1.000 seed × 500 refill mô phỏng mỗi bên theo lịch xác định | Không hard collision/exhaustion; báo repeat/fallback và phân phối theo action/budget |
| Determinism | Cùng input history; thay quality/FPS/viewport | Gameplay/prompt output giữ nguyên |
| Isolation | Một bên gõ nhanh hơn hoặc messages interleave khác | Không làm stream từ của bên kia trôi do shared cursor |
| Privacy | Inspect wire/snapshots/logs cho từng viewer | Không lộ private opponent word/bag/future seed |
| Protocol | Client cũ/new, missing fields, oversized/invalid strings | Reject/resync rõ, không fallback nhầm |
| Reconcile | Latency/out-of-order/duplicate snapshot, pending inputs | Không mất gõ đã ack; không phát hai FX/SFX thành công |
| DOM identity | 100 updates của offer không đổi | Node/placement giữ nguyên, reveal count đúng một |
| Layout | Longest word, resize, 5 rồi stress tới cap 10 | Không overlap chữ/HUD hoặc mất khả năng chọn |
| Tactical | Freeze/drift/reshuffle/cooldown/counter/objective | Luật được giữ, không nhầm motion trang trí với status |
| Banked vs instant | Gõ xong missile/bomb so với laser | Bank item chưa dùng không có fake damage/launch |
| Alpha | White/black/checker + nền map sáng/tối, cây render thật | Không square matte; khói/glow đúng loại blend |
| Lifecycle | Round đổi khi explosion/arrival/audio đang chạy | Không node/voice/timer rò hoặc FX lịch sử replay |
| Accessibility | Reduced motion, màu/contrast, mute | Word và telegraph vẫn đủ rõ, không đổi luật |

Với simulation chống lặp: báo tỷ lệ duplicate visible, prefix conflict, repeat trong cửa sổ, soft relaxation, hard exhaustion. Gate hard conflicts/invalid token/hard exhaustion phải bằng 0 trên bộ fixture production đã nêu. Không dùng “tỷ lệ unique toàn trận phải 100%” vì pool hữu hạn; không hứa không bao giờ lặp lại một từ.

Với parity: dùng cùng policy và lịch action để so từng bucket; báo distributions/confidence phù hợp thay vì đặt một số phần trăm “công bằng” tùy ý. Không tuyên bố công bằng người chơi chỉ từ statistical word counts.

Với fixture thiếu/corrupt pool cố ý: mục tiêu là chứng minh fallback/error handling hữu hạn và an toàn, không yêu cầu vẫn đủ target như pool production. Chỉ áp gate hard exhaustion bằng 0 cho lexicon production hợp lệ; không lẫn hai nhóm test.

## 13. Hiệu năng và chất lượng hình/âm

Budget hiện trong `src/duel/performance.ts`: frame p95 20 ms, p99 28 ms, input-paint p95 50 ms, projectile 18, FX nodes 24. Đây là gate hiện có, không số đo của tính năng mới; p95 20 ms không bảo đảm 60 FPS đều.

- Thêm reveal/word director không chạy full scan dictionary mỗi frame hoặc mỗi phím. Build pools/index lúc load; chọn prompt chỉ khi cấp offer.
- Snapshot chỉ gửi active data cần thiết, không gửi cả dictionary/history mỗi tick.
- Một 16-frame sheet 512×512/frame tương đương 16 MiB RGBA trước overhead; có budget tổng decoded memory và preload theo scene, không load mọi theme/quality.
- Đếm sprite/voice sống thật nếu đổi renderer; không khoe DOM nodes ít trong khi overdraw GPU tăng mạnh.
- So baseline và bản mới cùng viewport/DPR/mode/quality/seed/thời gian warm-up, nhất là Ultra trên Mac người dùng. Không yêu cầu chuyển Low để né lỗi.
- Visual QA chuẩn theo `docs/VISUAL_TESTING.md`: 1642×799 DPR 2, thêm viewport Portal thực tế của người dùng. Video chứ không chỉ một frame đẹp.
- Nghe loa Mac và tai nghe, ở volume tương đương, với nhiều vụ nổ chồng nhau. Cảm giác “bùng nổ” không được đổi lấy clipping, ù hoặc át mọi cảnh báo.

## 14. Bằng chứng hiện có và trạng thái bàn giao

Trong lượt kiểm tra typing này đã chạy:

```text
pnpm exec vitest run tests/duel-draft.test.ts tests/duel-offer-lifecycle.test.ts tests/duel-network-client.test.ts tests/duel-map-actions.test.ts tests/duel-local-match.test.ts
5 files / 39 tests PASS
```

Đã chạy fixture 500 refill và fixture base/map prefix mismatch bằng Node + tsx loader, không ghi source. Lần thử CLI `tsx` đầu bị sandbox chặn IPC; đã chuyển sang loader và phép kiểm tra hoàn tất. Các test hiện tại chưa bao phủ schema/director/visual mới trong tài liệu này.

Report trước có 14 test visual-contract/audio-profile/manifest pass và Chrome alpha/compositing/cascade diagnostics; không cộng các số đó thành tuyên bố full suite hoặc runtime acceptance.

**Trạng thái: tài liệu thiết kế và phân tích; chưa triển khai code, chưa sinh art/audio mới, chưa đo FPS của bản đề xuất.** Bản cuối cần bàn giao implementation, asset manifest, migration/version notes và bộ evidence nghiệm thu trước khi gọi production PASS.

## 15. Chỉ dẫn ngắn để giao AI triển khai

> Đọc toàn bộ tài liệu này và report root-cause liên kết. Reconstruct code local hiện tại, bảo toàn dirty worktree. Triển khai theo thứ tự mục 11: token-per-offer và seeded word director, cập nhật tất cả authority/UI/prediction/bot/protocol consumers, keyed UI và layout ổn định, sửa alpha/cascade, art/motion/audio production. Không đổi balance, offer count hoặc input language ngoài phạm vi. Không random từ ở client/render. Không chỉ thay label. Không dùng ảnh nổ đen gộp khói cho mọi blend layer. Không ghi hoàn tất nếu còn fallback art chưa được duyệt hoặc chưa có visual/audio/performance evidence. Mỗi bước báo file đã thay, test đã chạy, giới hạn chưa chứng minh; không tuyên bố tuyệt đối không còn lỗi.
