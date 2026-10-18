# Review khả năng triển khai — Credit Crystal và Duel Mode V2

Ngày review: 2026-09-30. Ngôn ngữ bàn giao: tiếng Việt.

Định hướng cập nhật theo yêu cầu chủ dự án: **triển khai đầy đủ tính năng trong phạm vi được duyệt, không làm bản rút gọn để quyết định có triển khai tiếp hay không.** Các bước bên dưới là thứ tự xây dựng và tích hợp production, không phải các phiên bản giảm scope. Kiểm thử, cân bằng và đo hiệu năng vẫn là yêu cầu nghiệm thu; không được bỏ qua vì đã quyết định triển khai.

## 1. Kết luận để ra quyết định

**Cả hai ý tưởng đều có thể triển khai, nhưng chưa nên dùng nguyên trạng hai bản V2 làm specification để AI tự code đến hoàn thành.**

| Đề xuất | Giá trị | Trạng thái nên chấp thuận | Điều chưa thể chấp thuận |
| --- | --- | --- | --- |
| Tiered Credit Crystal | Tăng cảm giác nhận thưởng, thể hiện giá trị địch, thay một phần chữ nổi bằng chuyển động | Triển khai đủ tier, economy, pickup VFX, HUD, audio và persistence sau khi chốt các contract còn mâu thuẫn | Cam kết mọi kill luôn có ít nhất 1 Credit, giữ gần nguyên economy, không mất khi đóng app, trong khi chưa giải quyết số địch phát sinh và recovery |
| Duel | Có tiềm năng tăng replayability qua đối thủ, lựa chọn từ và counter | Triển khai đầy đủ phạm vi Duel được duyệt, engine riêng, gồm gameplay, Bot, map và online theo thứ tự phụ thuộc | Để balance, performance và authority contract tới cuối; coi các luật còn thiếu là đã được giải quyết |
| Hòm giải đố ngôn ngữ — bổ sung theo yêu cầu owner | Kết hợp Recall, từ vựng, cấu trúc câu và bài tập vào Combat/PvP; trả lời đúng tạo lợi thế trong trận | Triển khai hệ question/answer dùng chung, carrier kéo hòm, reward adapters riêng từng mode; chi tiết §11 | Coi Recall hiện tại đã chấm được ngữ pháp; để input câu hỏi lẫn combat; cộng thưởng hai lần hoặc để RNG quyết định thắng PvP |

**Thứ tự triển khai:** chốt các quyết định Credit rồi xây production modules và tích hợp; Duel xây engine/input contracts trước các hệ thống phụ thuộc. Không gộp hai hệ thống lớn vào `Game.ts`, không dừng ở một bản ít tính năng rồi gọi là hoàn thành.

Giữ các mục optional, future và non-goals đúng trạng thái đã được duyệt trong plan gốc; yêu cầu triển khai đầy đủ không tự biến mọi ví dụ ý tưởng thành tính năng bắt buộc. Cần lập scope checklist để AI không tự cắt tính năng hoặc tự mở rộng ngoài yêu cầu.

Credit Crystal cải thiện **game feel**, không tự giải quyết chiều sâu chơi lâu dài. Duel có thể cải thiện chiều sâu, nhưng thêm nhiều RNG, hiệu ứng và category không đồng nghĩa với thêm quyết định có ý nghĩa.

Không phát hiện vấn đề cần xếp Critical trong phạm vi review kế hoạch. Các issue High bên dưới là rủi ro đáng kể **nếu triển khai đúng theo cách còn thiếu hoặc mâu thuẫn trong tài liệu**, không phải tuyên bố các tính năng chưa viết đang có bug production.

## 2. Phạm vi, nguồn và mức chắc chắn

Đã đọc toàn bộ:

- `docs/SPACE_TYPING_TIERED_CREDIT_CRYSTAL_MASTER_PLAN_REVIEWED_V2.md` — 2.142 dòng; gọi tắt **C-plan**.
- `docs/SPACE_TYPING_DUEL_MODE_MASTER_PLAN_REVIEWED_V2.md` — 2.300 dòng; gọi tắt **D-plan**.

Đối chiếu working tree hiện tại:

- Branch: `feat/bgv-integration-current`.
- HEAD: `66ee6a0896450ffc56bc0b6216e756c45cf5aafc`, khớp SHA mà hai plan ghi.
- Repo đang có thay đổi và asset/doc untracked của người dùng. Review dựa trên file thực tế đang có, không phải khẳng định working tree sạch hoặc đã đồng bộ GitHub.
- Không fetch, pull, checkout, commit, push; không sửa source, asset hoặc hai plan gốc.
- Đọc phần liên quan trong `PROJECT_CONTEXT.md`, policy performance hiện hành, code kill/reward, economy, save/recovery, Expedition, Test Lab, input, VFX và test liên quan.
- Không chạy build, toàn bộ test suite hoặc benchmark đồ họa trong lần review này. Không có dữ liệu để tuyên bố FPS, độ vui hoặc balance đã PASS.

Phân biệt kết luận:

- **Cao:** xác minh trực tiếp bằng source, mâu thuẫn giữa các đoạn tài liệu, hoặc phép tính có thể kiểm tra.
- **Trung bình:** dự báo rủi ro gameplay/performance; cần đo và kiểm thử trên implementation để xác nhận mức ảnh hưởng.
- Các thông số bổ sung trong report là **đề xuất**, không phải thông số đã benchmark hoặc được chủ dự án duyệt.

Vị trí `file:line` dưới đây tính tại working tree của lần review. Khi code thay đổi, tìm theo tên hàm/section trước khi dùng số dòng.

## 3. Những phần đúng và đáng giữ

### 3.1 Credit Crystal

- Dùng Credits hiện có, không tạo thêm ví Diamond: đúng và tránh nhầm với equipment grade.
- Tách amount kinh tế khỏi số lượng mảnh VFX: cần giữ nguyên.
- Tách commit reward khỏi animation bay vào tàu: đúng hướng, nhưng phải làm rõ “commit” là RAM hay durable save.
- Typed kill có projectile bay phải đặt death VFX tại impact; source xác nhận `firePlayerShot()` có cả travelling bolt lẫn fallback impact tức thời.
- Giữ score logic và chỉ bỏ kill-score popup: hợp lý. `spawnKillScorePopup()` hiện có caller ở final typed kill.
- Source-over body, cached glow, không mỗi mảnh một `shadowBlur`, SFX thấp hơn pronunciation: hợp lý.
- Loại `role: "reward"` và bonus targets tập trung: hợp lý nếu đây là quyết định product. **Không được suy rộng thành loại mọi enemy có trường `reward`**; một số support/elite/boss cũng có reward effect.

### 3.2 Duel

- Simultaneous typing, không strict turn-taking: phù hợp bản sắc game.
- `DuelEngine` riêng, không biến PvE `Game` thành network owner: đúng.
- Dùng cùng engine cho Human vs Bot và online; Bot gõ từng ký tự và không đọc hidden information: đúng. Xây engine/Bot trước adapter online là thứ tự phụ thuộc, không phải cắt online khỏi scope.
- Không nhân damage thêm theo WPM: tránh cộng lợi thế tốc độ hai lần.
- Normalized Ranked, server-authoritative online, RNG có seed, kiểm thử Cataclysm: đúng định hướng.
- D-plan đã có các mục chống gian lận, reconnect, accessibility và non-goals. Review **không kết luận các mục đó hoàn toàn vắng mặt**; vấn đề là chưa đủ hợp đồng cụ thể để triển khai/kiểm chứng.
- Đã kiểm tra 5 bảng phân bố category: **đều cộng đúng 100%**. Không có lỗi cộng phần trăm ở các bảng này.

## 4. Credit Crystal — issue và cách cải thiện

### C01 — High — Ràng buộc minimum payout đụng economy ngay ở early game

**Vị trí:** C-plan §10–10.3, dòng 873–995; §32.1 Economy gate, dòng 1969. Code: `src/economy/credits.ts:39` (`stageClearCreditReward`), `src/campaign/stage.ts:76` (`enemyBudget`), `src/main.ts:3808`.

**Chắc chắn:** Cao về số liệu/ràng buộc; tổng reward thực tế còn phụ thuộc difficulty, performance, accuracy và Salvage.

**Vấn đề:** Plan yêu cầu mỗi eligible kill ít nhất 1 Credit, chỉ chuyển một phần base stage reward sang kill, và giữ các performance/objective/checkpoint bonus. Plan có nhận diện khả năng thiếu budget nhưng chưa chốt giải pháp; đây là gate thực tế, không phải edge case xa.

Ví dụ từ source, trước các multiplier bên ngoài:

```text
Stage 1 scheduled enemy budget = 34
Base = 24 + floor(1 × 0.7) = 24 Credits
Accuracy >= 99%, Salvage = 0: floor(24 × 1.25) = 30 Credits
Nếu 34 địch đều eligible và đều bị kill: minimum payout = 34 Credits
```

34 scheduled enemies không có nghĩa mọi lượt chơi chắc chắn có 34 eligible kills: có thể escape hoặc khác composition. Nhưng đây là kịch bản budget phải hỗ trợ. Không thể tự lấy phần thưởng performance để bù mà vẫn nói giữ nguyên các khoản đó.

**Vì sao:** `max(0, oldBase - drops)` chỉ che phần âm; không bảo toàn economy. Làm art/integration trước rồi mới phát hiện phải đổi giá shop sẽ gây rework.

**Đề xuất:** Đưa economy feasibility lên Phase A, trước bật thưởng thật. Chọn rõ:

1. **Giữ integer Credits và >=1/eligible kill:** duyệt lại early-game curve, reward/minute và affordability; chấp nhận thay đổi economy có đo lường.
2. Nếu bắt buộc giữ curve cũ: phải xin đổi yêu cầu minimum/integer, chẳng hạn đơn vị con của cùng Credits. Đây vẫn kéo theo UI, rounding và migration; không phải “fix miễn phí”, không tự áp dụng.

Không gợi ý crystals giá trị 0 hoặc âm vì trái yêu cầu hiện tại.

### C02 — High — Budget hữu hạn không đủ để bảo đảm mọi summon đều trả >=1

**Vị trí:** C-plan §10.2.1, dòng 942–976; §21–23. Code: `src/Game.ts:5561` (`summon-scout`), `src/Game.ts:5649` (`spawnCarrierChild`), `src/Game.ts:7040` (`spawnSplitFragments`), `src/campaign/active-pressure.ts`.

**Chắc chắn:** Cao.

**Vấn đề:** Plan nói stage budget bảo vệ trước “future summons”, nhưng summon đã có. Active-enemy cap chỉ giới hạn địch đồng thời; nó không đồng nghĩa tổng số địch được sinh trong stage bị chặn bởi `enemyBudget`. Carrier có thể sinh tiếp sau khi các child trước đã chết.

Với ngân sách B và K eligible kills, `amount >= 1` kéo theo tổng payout >= K. Khi K > B, không thể đồng thời giữ cả hai cam kết. Chia theo expected kills/weight cũng chưa định nghĩa cách phát tiền online khi chưa biết K cuối cùng.

**Vì sao:** Dễ tạo farm kéo dài stage, hết tiền trước boss, hoặc phải trả 0 cho các kill cuối. Chỉ lưu `combatCreditsGrantedThisStage` không giải quyết bài toán admission.

**Đề xuất:** Chốt reward/spawn envelope trước. Nếu muốn hard stage cap và mọi địch combat đều có tiền, phải có **hữu hạn reward-bearing spawn slots**, gồm summon/split và boss reserve. Reserve trước minimum cho toàn bộ số slots tối đa còn có thể được admit; khi admission mới gắn phần đã reserve vào instance. Chỉ cấp premium từ phần dư sau reserve, không tiêu hết budget vào các kill sớm rồi để future spawns thiếu minimum. Slot đã trả không được reuse như một enemy mới. Khi hết envelope, không sinh thêm loại địch đó — đây là thay đổi gameplay cần được duyệt.

Nếu không muốn đổi spawn, bỏ cam kết hard stage cap và cân bằng theo amount/kill + tổng thu nhập/phút; công khai rằng total stage income có thể tăng. Không tự đổi summon thành “bonus không tiền” chỉ để né requirement.

### C03 — High — “Không mất khi đóng app” chưa tương thích save/recovery thực tế

**Vị trí:** C-plan §9, dòng 779–869; §20.4; §27. Code: `src/main.ts:1393`, `src/main.ts:2837`, `src/main.ts:7634`, `src/main.ts:9955`; `src/persistence/player-save.ts:1515`, `:1543`, `:1950`; `src/persistence/crash-recovery.ts::resolveCrashRecovery`; `src/persistence/autosave.ts`.

**Chắc chắn:** Cao về đường code; chưa chạy browser reproduction trong review này.

**Vấn đề:** Cộng Credits vào biến canonical trong RAM hoặc gọi hook không đồng nghĩa durable reward. Mid-encounter page lifecycle cố ý không tạo recovery point mới; load có thể lấy safe snapshot cũ, bỏ cả top-level Credits đã ghi vào mirror.

Ngoài ra đang có bất nhất cần giải quyết trước integration:

- UI/death navigation hiện nói giữ progression khi chết và không tự restore checkpoint ở luồng retry thông thường.
- `markCrashRecoveryDeathInvalid()` vẫn ghi marker; `resolvePlayerSaveRecovery()` gọi `resolveCrashRecovery()`, trong đó `deathInvalidated` restore checkpoint.
- Vì vậy không được viết spec dựa trên giả định “mọi death đều rollback” **hoặc** “mọi reload sau death đều giữ thưởng”. Có nguy cơ hành vi khác nhau giữa retry trực tiếp và reload trước khi resolve death.

**Vì sao:** Có thể thấy coin bay vào HUD nhưng reload mất coin; hoặc giữ coin nhưng replay cùng encounter trả lại. Mặt khác save toàn bộ PlayerSave/mirror sau mỗi kill tạo serialization và synchronous localStorage trên đường combat. `AutosaveQueue` chỉ coalesce khi pending chưa được flush; gọi schedule+flush cho từng kill không tự batch cả một đợt AoE.

**Đề xuất:** Viết ma trận lifecycle: kill trong RAM, save đang pending, save thành công, save thất bại, pagehide, hard close, death, retry, Phoenix, crash recovery, import. Chọn một trong hai chính sách:

- **Ít phức tạp hơn:** guarantee trước VFX/transition trong session, durable tại safe boundary; công khai cửa sổ mất tiến độ do crash. Cần owner duyệt vì yếu hơn lời hứa hiện tại.
- **Giữ mid-stage durable reward:** amount, dedupe metadata và attempt identity phải cùng transaction/recovery policy trong persistence hiện có. Không chỉ thêm một Set trong Game hoặc thêm ví localStorage song song. Xác định lại encounter replay trả thưởng hay không, và serialization/flush cadence có đo đạc.

Không hứa bảo toàn tuyệt đối khi browser/OS chết trước khi storage commit. Durability transaction cũng phải được hiểu đúng, không đánh đồng RAM acknowledgement với dữ liệu chắc chắn đã xuống disk. [MDN: IDBTransaction durability](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/durability)

Nếu thêm persisted receipt/attempt fields, cần migration, sanitization, export/import và tất cả checkpoint/crash/stage-entry copies. Không tăng schema chỉ vì thêm transient VFX.

### C04 — High — Chưa có reward scope cho Expedition, Preview, Test Lab và Recall

**Vị trí:** C-plan §9.3, §20.4, §28. Code: `src/main.ts:3490`, `:3588`, `:7639`; `src/expedition/session.ts:98`; `src/test-lab/session.ts`; `src/Game.ts:6692`.

**Chắc chắn:** Cao.

**Vấn đề:** Plan mô tả hook main/economy grant Credits nhưng chưa có mode matrix. Cùng `Game` hiện chạy cả Expedition và Recall; Expedition cố ý không làm thay đổi economy Campaign, Preview và Test Lab cũng có isolation riêng.

**Vì sao:** Guard chỉ trong `autosaveCampaign()` là chưa đủ: nếu hook đã mutate `credits`, UI hoặc một save sau khi thoát mode vẫn có thể nhận state sai. Test Lab spawn 50 rewards cũng không được đi tới ví thật.

**Đề xuất:** Adapter economy quyết định scope **trước mutation**:

| Context | Chính sách đề xuất |
| --- | --- |
| Campaign/Ascension hợp lệ | Canonical Credits, với attempt và reward rule được duyệt |
| Hidden encounter | Chốt budget/reward riêng; không vô tình nhận cả regular clear + hidden reward + drops |
| Recall | Quyết định bật/tắt rõ; nếu bật phải giảm nhiễu học tập, không tự thêm hostile Combat behavior |
| Expedition | Mặc định không mint Campaign Credits; không giả làm thu nhập thật bằng HUD Credits nếu chưa có contract |
| Testing preview/Test Lab | Ví mô phỏng hoặc VFX-only, không write production save |
| Duel tương lai | Không tự nhận kill-crystal Credits của PvE |

Test kiểm tra cả state trước/sau thoát mode, không chỉ spy vào hàm save.

### C05 — High — Audit kill paths chưa đủ; identity và delayed impact vẫn có khe hở

**Vị trí:** C-plan §1.3–1.5, §9.3, §21–23. Code: `src/Game.ts:6568`, `:6689`, `:6914`, `:8220`, `:8332`.

**Chắc chắn:** Cao.

**Vấn đề:** Ba entry point `completeWord`, `resolveSkillEnemyKill`, `defeatBoss` là nền tốt nhưng không bao phủ mọi removal. `activateDefinitionReward().clearNormalEnemies` dùng filter xóa địch thường trực tiếp, không qua `resolveSkillEnemyKill`.

Thêm nữa:

- Completion của layer chưa phải enemy death; grant trước nhánh `layersRemaining > 1` sẽ trả nhiều lần.
- `firePlayerShot()` có thể impact **đồng bộ** khi không tạo travelling bolt. Tạo transaction sau lời gọi này khiến impact đến trước reward record.
- Random `rewardId` mới ở mỗi callback không dedupe được cùng một kill. `sourceId` phải là enemy instance, không phải `definitionId`.
- VFX-only flush không giải quyết late impact thuộc attempt đã kết thúc hoặc quality cap khiến không tạo sprite.

**Đề xuất:** Tách hai operation, không dùng một tên `spawnCombatCreditDrop` cho cả grant và presentation:

```text
claimKillReward(attemptId, sourceInstanceId, cause)
    -> idempotent reward receipt
presentKillReward(receipt, deathPosition)
    -> transient VFX only
```

Claim trước bất kỳ synchronous/delayed impact callback nào; đặt guard trước side effects có thể gọi lồng nhau. Key có mode/attempt identity và namespace enemy/boss. Duplicate callback nhận cùng receipt hoặc no-op, không mint ID mới.

Audit mọi `enemies.filter/splice/=[]`: phân loại kill được thưởng, escape, cleanup, despawn. Với `clear-normal`, owner phải chốt đó là rewarded kill hay deliberate non-kill; không âm thầm đổi score/loot/objective/death traits của skill cũ khi centralize.

Test: multilayer final-only, bolt/fallback, double callback, Nova với `playDeathFx:false`, clear-normal, boss, stale impact sau restart. Lifetime dedupe phải bounded và phù hợp recovery policy, không giữ lịch sử từng enemy của 1000 stages vô hạn.

### C06 — High — Credits x2 không thể chỉ “reuse multiplier” mà giữ nguyên ý nghĩa cũ

**Vị trí:** C-plan §10.1–10.4. Code: `src/Game.ts:7316`, `src/main.ts:3808`; `src/enemies/reward-effects.ts:95`; `src/enemies/registry.ts:617`; `tests/enemy-reward-integration.test.ts:6`.

**Chắc chắn:** Cao.

**Vấn đề:** Hiện `getCreditsMultiplier()` đọc timer lúc stage clear. Prism Archon grant `credits-x2` khi boss chết; test còn gọi đây là stage-clear-friendly reward. Nếu chuyển phần lớn base sang kill trước boss, x2 cuối stage không còn nhân phần đã phát.

Ngược lại, x2 lúc kill rồi nhân toàn stage lần nữa có thể double-pay. Amount được tính lúc pickup thay vì kill cũng khác khi buff hết hạn giữa đường bay.

**Đề xuất:** Chốt công thức theo các thành phần riêng:

```text
unbonused base / combat allocation
accuracy + Salvage effects
difficulty + objective
timed credit bonus
performance reward riêng
checkpoint / hidden / ascension reward riêng
```

Hai lựa chọn:

- Giữ legacy x2-on-clear: clear settlement tính bonus trên base được định nghĩa, kể cả phần combat đã trả, rồi chỉ grant phần chưa trả. Không thu hồi tiền đã phát. Kill VFX không được nói đang x2 theo thời gian thực nếu rule không phải như vậy.
- Đổi sang true timed kill bonus: snapshot multiplier tại authoritative kill, apply một lần; thiết kế lại reward Prism Archon/clear component có chủ ý. Đây là economy change phải duyệt, không phải refactor tương đương.

Phải chốt rounding toàn bộ phép tính; chia rồi floor mỗi enemy có thể khác floor một lần lúc clear. Cần property test ledger tổng, không chỉ test mỗi amount >=0.

### C07 — Medium — Hard cap và “giữ mọi anchor” mâu thuẫn

**Vị trí:** C-plan §13, §25 dòng 1608–1628, §28 stress 50 drops.

**Chắc chắn:** Cao.

**Vấn đề:** Low cap 28 pieces, nhưng mỗi burst có ít nhất một anchor và rule khi đầy vẫn “keep anchor pieces”. 50 simultaneous bursts cần >=50 anchors dù bỏ hết satellites. Medium 44 cũng không đủ.

**Đề xuất:** Tách logical receipt khỏi admitted visual representation. Cap phải bao gồm anchors, satellites, trails/glints và pending queue có giới hạn. Khi đầy:

1. Bỏ hoặc gộp decorative satellites trước.
2. Coalesce cả low-tier anchors thành cluster/stream đại diện, hoặc present một compact HUD sync cho receipts chưa có sprite.
3. Dành capacity cho boss hero; không giữ queue vô hạn để sau này phát một “cơn bão pickup”.

Một representation có thể đại diện nhiều receipt; không giữ array reward IDs vô hạn trong VFX để làm accounting. Nếu giữ từng anchor của mọi kill là yêu cầu tuyệt đối, phải bỏ cap đó hoặc giới hạn admissions — không thể hứa cả hai.

### C08 — Medium — HUD thiếu contract khi amount earned khác wallet delta

**Vị trí:** C-plan §9.2–9.3, §17. Code: `src/economy/credits.ts:3`, `:19`; `src/main.ts:790`.

**Chắc chắn:** Cao về edge cases; lựa chọn UX cần owner duyệt.

**Vấn đề:** Wallet có cap `999_999_999`; reward 10 khi balance chỉ còn chỗ 2 thì actual delta chỉ 2. Pending fly-in cũng có thể trùng lúc shop spend, reset, import hoặc mode switch. Counter chỉ count-up theo nominal reward sẽ sai hoặc tăng lại sau khi vừa tiêu tiền.

**Đề xuất:** Receipt phân biệt `nominalEarned` và `walletDelta`; HUD phân biệt “earned this encounter” với “wallet available”. Purchases dùng canonical wallet. Khi navigation/spend/import/owner change, cancel pending animation epoch và sync về state hiện tại. Không để late arrival ghi balance cũ.

Không update DOM mỗi fragment mỗi frame. Coalesce reward arrivals thành một pulse/count animation; dùng value diff và cadence giới hạn.

### C09 — Medium — Caps riêng chưa chứng minh không làm game nặng hơn

**Vị trí:** C-plan §7, §25–26, §32 Phase G. Code: `src/vfx/light-sprites.ts`, `src/vfx/player-shots.ts:149`, `src/vfx/combat-fx.ts:13`, `src/vfx/skill-fx.ts:306`, `src/performance/quality.ts`, `src/test-lab/batch-f-performance-gate.ts`.

**Chắc chắn:** Cao về nhiều hệ VFX cùng tồn tại; Trung bình về mức regression thực tế.

**Vấn đề:** 68/92 crystal pieces vẫn chạy cùng shots, smoke, death particles, glows, background và ship FX. Mỗi piece ba pass + trails/rings có thể tăng overdraw đáng kể. “Batch draw” trong Canvas2D không tự biến nhiều `drawImage` thành một lệnh miễn phí.

**Đề xuất:** Tích hợp đo High/Ultra và worst-case ngay khi production pickup module hoạt động, không đợi Phase G. Reuse light sprite helpers bằng palette hữu hạn, tránh tạo cache entry cho màu động liên tục. Dùng một update/draw owner; chỉ tách renderer file khi thực sự đáng tách.

Không cần viết framework particle mới hoặc chuyển toàn bộ game sang renderer khác cho tính năng này. Atlas chỉ nên chọn khi profiling/pipeline chứng minh lợi ích; 8 WebP nhỏ là phương án hợp lệ.

Boss đẹp hơn nên đến từ silhouette, timing và một hero sprite, không phải chỉ tăng số pass. Khi đầy, ưu tiên bỏ decoration chứ không đổi gameplay hay ép người dùng chọn Low.

### C10 — Low — Vài chi tiết spec còn lệch nhau, nên sửa trước bàn giao

**Vị trí:** C-plan §4, §8, §24, §35 câu 9.

**Chắc chắn:** Cao.

- §24 đặt premium beat 0,9–1,4 giây, câu hỏi §35 lại dùng 1,2–1,8 giây. Chọn một nguồn timing duy nhất.
- Tier mapping dùng “high rarity” nhưng enum thực tế không có `high`; cần viết bảng exhaustive cho `common/uncommon/rare/elite/boss` và role/rank conflict. Làm rõ rare rank I có lên Refined không.
- `CreditDropBurst.id:number` và `CombatCreditRewardEvent.rewardId:string` cần mapping; `collectCommitted` dễ bị hiểu nhầm là persistence flag. Nên dùng `presentationCompleted` hoặc tên tương đương.
- Boss dialog hiện `game.pause()` ngay tại `main.ts:4283`, nhưng `advanceSimulation()` vẫn `updateEffects()` khi không playing. Vì vậy **không cần làm combat tiếp tục để animation chạy**. Cần test visibility dưới modal, hoặc thêm presentation state rõ ràng; không dùng timer mở dialog không kiểm tra scene token.

## 5. Duel — issue và phương án tốt hơn

### D01 — Medium — Roadmap cần rõ dependency và tiêu chí hoàn thành từng hệ thống

**Vị trí:** D-plan §17, §28–44, §59–62.

**Chắc chắn:** Cao về các contract còn thiếu; Trung bình về mức rework nếu không giải quyết sớm.

**Vấn đề:** Combo, banks, traps, information, conversion, Initiative, Fate/Mystery và director đều phụ thuộc vào input, target lifecycle và action economy. Roadmap chưa chỉ rõ contract đầu vào/đầu ra và điều kiện nghiệm thu cho các dependency đó.

**Vì sao:** Nếu mỗi hệ tự định nghĩa timing, cost hoặc target invalidation, integration dễ phải sửa nhiều nơi. Tạo đủ 15 module theo danh sách ngay cũng chưa chắc ít coupling hơn.

**Đề xuất:** Chốt schema, lifecycle và resolution order dùng chung, sau đó triển khai đầy đủ từng nhóm ở §7 theo dependency. Cân bằng và regression test đi cùng từng integration, không đợi mọi tính năng viết xong mới xử lý. Bot-vs-Bot dùng tìm lỗi/exploit, còn human playtest phục vụ nghiệm thu trải nghiệm; không dùng hai việc này làm lý do cắt scope đã duyệt.

### D02 — High — Input grammar và target ownership chưa đủ để implement

**Vị trí:** D-plan §8.1, §9–19, §43.1. Code đối chiếu: `src/logic.ts:11`, `src/Game.ts:3523`.

**Chắc chắn:** Cao.

**Vấn đề:** Ví dụ dùng `LAST STAND`, `BLACK HOLE`, `LOCK-ON`, trong khi PvE hiện strip mọi ký tự ngoài a–z; Space là Overdrive; Backspace không phải correction path. D-plan lại dùng “1 correction”, nhưng chưa định nghĩa lỗi giữ buffer hay không, sửa bằng phím nào, lỗi tính vào accuracy ra sao.

“First unambiguous typed prefix” chưa giải quyết `HEAL` và `HEALING`, hai bản cùng normalized text, hoặc một target bị reroll sau khi người chơi đã gõ. Reroll khi “ambiguous too long” nếu dựa wall-clock có thể khác giữa client/server.

**Đề xuất:** Chốt explicit policy cho production: normalized a–z, Space vẫn ultimate nếu có, tên hiển thị có thể chứa space/hyphen nhưng target cue chỉ rõ chuỗi cần gõ. Hoặc chọn phrase typing thật và chuyển phím ultimate; không trộn hai policy.

Policy này áp dụng cho regular combat targets. Answer mode của hòm giải đố bổ sung ở §11 có input owner riêng và hỗ trợ sentence punctuation/Space; không đưa câu trả lời của hòm qua regular-target parser.

Định nghĩa bằng test: key repeat, composition/IME, paste, modifier keys, wrong key, cancel, switch, blur, target invalidation. Wrong-key không tiến buffer là phương án đơn giản gần PvE; gọi là mistake chứ không tự giả định Backspace correction.

Spawner ưu tiên prefix-free trong tập target selectable; nếu corpus quá nhỏ dùng slot selector/fallback cố định, không reroll vô hạn. Không đổi answer của một target đã được lock. Client và authority phải dùng cùng parser; chỉ renderer được tự animate cursor/prefix.

### D03 — High — Spawn percentages chưa tạo thành word/action economy

**Vị trí:** D-plan §3–8, §17.1–17.2, §18–20, §35, §54.

**Chắc chắn:** Cao về thiếu contract; Trung bình về outcome balance.

**Vấn đề:** Chưa rõ mỗi người có bao nhiêu slot, word thay khi nào, expiration, shared hay private pool, type xong auto-fire hay vào bank, dùng đồ bằng phím/click nào, slot đầy thì làm gì. 52% Attack spawn không đồng nghĩa 52% actions hoặc damage.

Map affinity đổi `SHIELD` thành `FROST SHIELD` làm khác typing cost dù effect giống nhau. Ngược lại formula `Base effect × word difficulty` có thể thưởng độ dài thêm lần nữa khi base đã thiết kế theo cast time.

**Đề xuất:** Chốt `ActionDefinition` có effect, normalized answer/cost, energy cost, cooldown, target policy, resolve policy (`instant` hoặc `banked`), capacity policy và shared content version. Mỗi action chỉ có một cơ chế scaling theo effort được hiểu rõ.

Đánh giá sơ bộ:

```text
characters/second ≈ WPM × 5 / 60
typing time ≈ accepted character count / characters-per-second
effective action rate còn bị reaction, mistakes, switching và energy/cooldown giới hạn
```

Ví dụ 12 letters ở 60 WPM cần khoảng 2,4 giây chỉ cho typing, chưa tính suy nghĩ hoặc lỗi. Đừng thiết kế counter 1 giây rồi gọi đó là lựa chọn khả thi cho nhóm người chơi này.

Chuẩn hóa/mirror difficulty pool cho PvP; không lấy adaptive vocabulary riêng của từng người rồi cho cùng effect. Map skin có thể đổi display/action fantasy, nhưng answer cost phải được đối chiếu hoặc cân lại, không coi reskin là miễn phí.

### D04 — High — Chưa có kết thúc hữu hạn, draw và luật đồng thời

**Vị trí:** D-plan §1.2–1.3, §2, §7, §55, §63.

**Chắc chắn:** Cao.

**Vấn đề:** Mặc định regulation 4 phút, phase table bắt Cataclysm khoảng 4:15, ví dụ cuối lại 4:00. 3/5-minute rooms chưa có cách scale phase. Cataclysm tăng áp lực nhưng không bảo đảm trận kết thúc.

Chưa quy định cả hai Hull=0 cùng tick, counter và hit cùng tick, người chết nhưng projectile còn bay, Bo3/Bo5 có draw, hoặc tối đa overtime.

**Đề xuất:** Một config phase schedule tính từ regulation duration; ví dụ tỷ lệ 0–25–50–80–100%, overtime tại đúng 100% là baseline đề xuất. Chốt max overtime và terminal rule được UI công bố: bounded sudden-death nếu phù hợp, hoặc draw/no-contest tại hard deadline. Không tự đổi sang “HP cao hơn thắng” vì plan không chọn luật đó.

Engine phải có thứ tự resolve deterministic và kiểm tra terminal sau batch cùng tick để không thiên vị Player A do array order. Reset đủ round-local state, xử lý series win/draw và ultimate clash không kéo match vô hạn.

### D05 — High — Các event KEY_OK/WORD_COMPLETE chưa phải authority protocol an toàn

**Vị trí:** D-plan §49–50.1, §61. **Gate áp dụng:** thiết kế authority contract từ đầu; nghiệm thu protocol trước khi phát hành Friend Room online.

**Chắc chắn:** Cao.

**Vấn đề:** §50 liệt kê client gửi `KEY_OK`, `KEY_MISS`, `WORD_COMPLETE`, còn §50.1 yêu cầu server kiểm tra expected character sequence. Hai phần chưa nói payload nào chứng minh progression và ai được quyền quyết định completion.

Nếu client gửi “đã đúng/đã xong” và server tin, authority bị phá. Nếu gửi cả key cuối lẫn complete mà cả hai đều phát skill, action bị nhân đôi. Rate limit/WPM trần chỉ chống input phi lý, **không chứng minh người thật đang gõ**, không phát hiện mọi macro có timing hợp lệ.

**Đề xuất:** Client gửi intent như `TYPE_CHAR`/`CANCEL_TARGET`/`USE_ITEM` có `matchId`, `roundId`, `seq`, target instance và payload tối thiểu. Server tự suy ra correct/miss/completed và effect. Completion là output event, không phải một command grant thưởng độc lập.

Sequence dedupe, rejection/ack và authoritative snapshot phải rõ. Prediction chỉ hiển thị local feedback, không mint damage/winner. Timestamp client là hint có giới hạn, không quyền backdate tùy ý; stale input round cũ phải bị reject. Không hứa chống bot hoàn toàn chỉ bằng protocol này.

### D06 — High — Seed thôi chưa đủ deterministic; seed công khai có thể lộ Mystery

**Vị trí:** D-plan §43.1, §49, §51, §59.1. Code tham khảo: `src/Game.ts:2012`, `src/loot/pity.ts`, `src/expansion-v2/`.

**Chắc chắn:** Cao.

**Vấn đề:** `matchSeed + eventSequence` không quy định timestep, input ordering, effect ordering, version hoặc những call RNG bị bỏ qua. PvE hiện có cả seeded paths lẫn `Math.random`, không thể bê nguyên logic tùy tiện rồi coi deterministic.

Nếu full seed/state được gửi cho client để prediction/replay live, hidden Mystery và future event có thể bị suy ra dù UI không hiển thị. Bot cũng có thể vô tình đọc cả world state trong decision function.

**Đề xuất:** Engine pure, tick/time authority rõ, stable IDs, config/content version, input log, separate RNG domains: word offers, hazards, loot/fate, bot behavior, cosmetic. Chỉ share những helper thực sự pure; không refactor toàn bộ PvE sang deterministic để mở Duel.

Server giữ secret RNG và hidden outcomes; client nhận projection đủ chơi, không full engine state. Bot nhận cùng observation projection tương đương người chơi. Reveal đầy đủ seed/replay sau match là tùy chọn, không phải điều kiện để xây online đầu tiên.

Replay test cần config + accepted input/tick log + version, không chỉ seed. High/Ultra, sound on/off hoặc mất một frame không được đổi state hash authoritative.

### D07 — High — “Có counter” chưa bảo đảm người chơi thực sự được counter

**Vị trí:** D-plan §17.3, §24–26, §38, §50.1, §52.

**Chắc chắn:** Cao về thiếu policy; Trung bình về độ bất công thực tế.

**Vấn đề:** Đòn lớn telegraph 4 giây nhưng đối thủ có thể không có Defense target, thiếu Energy, đang bị freeze target hoặc phải gõ một từ dài hơn bên tấn công. Equivalent random pressure không tự tạo equivalent response opportunity.

Neutral objective “gõ xong trước thắng” cũng chưa nói tie/latency policy. Theo thời điểm packet tới server sẽ ưu ái RTT thấp; tin timestamp client tuyệt đối lại cho backdate.

**Đề xuất:** Cho một baseline counter luôn tiếp cận được với cost đã cân, hoặc guarantee defensive offer + usable response window. Reaction window phải tính typing cost và intended skill band; no-counter phải là hậu quả của lựa chọn trước đó, không do pool cạn ngẫu nhiên.

Online chốt một bounded adjudication policy cho contest: server time/arrival window hoặc lag compensation có giới hạn, luật tie công khai, không tie-break cố định cho slot 1. Test đối xứng đổi player side và mạng khác nhau. Fate race và các neutral objectives phải dùng contract này khi tích hợp; không tự hoãn hoặc loại bỏ chúng khỏi scope đã duyệt.

### D08 — Medium — Hazard compensation và hidden letters còn dễ tạo exploit hoặc bực bội

**Vị trí:** D-plan §8.1, §12.1, §24–25, §36, §58.1.

**Chắc chắn:** Cao về thiếu case; Trung bình về ảnh hưởng trải nghiệm.

**Vấn đề:** “Partial Energy/Pressure/Initiative” không có cap/idempotency. Người chơi có thể cố ý farm compensation bằng target hazard sắp phá, nhất là khi player-induced chaos cũng được hoàn effort. Protection gắn vào word vừa bị xóa không bảo vệ target mới.

“Hide letters” có thể khiến người chưa từng nhìn word phải đoán chính tả; đây là phạt thông tin, không phải kỹ năng counter. Reduced-motion không được vô tình tiết lộ thông tin mà người khác mất.

**Đề xuất:** Compensation tối đa một lần cho target instance, chỉ tính accepted manual effort đã tiêu và chưa được hoàn; không áp dụng cho voluntary cancel/reroll. Chính sách self-induced hazard phải tách riêng. Protection theo player targeting window nếu mục tiêu đã biến mất.

Triển khai word destruction và hidden-letter mechanics cùng telegraph, target invalidation, compensation và protection rules, không thêm hiệu ứng trước rồi bỏ trống cách xử lý input. Hidden-letter mechanic phải có memory reveal rõ hoặc công cụ reveal hợp lệ, nhất quán mọi quality/accessibility profile. Không nghiệm thu mechanic gây bắt buộc đoán một answer chưa từng được cung cấp.

### D09 — Medium — Normalized stats chưa loại hết lợi thế progression

**Vị trí:** D-plan §1.3, §40–41, §46, §53. Code: `src/characters/state.ts`, `src/loot/pity.ts`, `src/relics/registry.ts`.

**Chắc chắn:** Cao về policy còn thiếu; chưa có Ranked implementation để đánh giá win rate.

**Vấn đề:** Equal base stats nhưng người chơi cũ có nhiều character/skill options hoặc Luck/pity PvE carry vào Duel vẫn là khác biệt sức mạnh. Fortune có PvP perks riêng nhưng chưa có coefficient/cap xác định.

**Đề xuất:** Competitive ruleset có roster/skill availability thống nhất, loadout budget rõ, pity round-local và không đọc persisted PvE pity, không dùng permanent Salvage/XP/equipment scaling. Custom “owned PvE loadout” phải tách ruleset, warning và leaderboard, không so chung normalized match.

Triển khai normalized profiles cho toàn bộ roster thuộc scope, gồm character-specific coefficients và Fortune interactions; không chỉ giữ một profile rồi coi roster hoàn thành. Với Ranked, win/loss rating kết hợp typing band để hỗ trợ matching là phương án đơn giản hơn một score nhiều hệ số chưa hiệu chuẩn. Nếu chọn rating tổng hợp Typing Rating + Duel Rating, phải có công thức, version và cách hiệu chuẩn rõ trước nghiệm thu.

### D10 — Medium — Chưa chốt quan hệ với học từ và persistent rewards

**Vị trí:** D-plan §8–19, §45–49; `docs/PROJECT_CONTEXT.md:178`; `src/main.ts::postLearningEvent`, `src/expedition/session.ts`.

**Chắc chắn:** Cao về khoảng trống; lựa chọn product chưa được duyệt.

**Vấn đề:** Nếu chỉ gõ lặp `LASER`, `SHIELD`, `ENERGY`, Duel có thể vui nhưng nghèo luyện từ. Nếu dùng vocabulary pool cá nhân, tính công bằng lại thay đổi. Nếu reuse hooks PvE, Bot hoặc skill completion có thể vô tình trở thành learning evidence/reward thật.

**Đề xuất:** Tách `actionId/displayLabel` khỏi `answerToken/vocabularyEntryId`. Chọn rõ fixed competitive lexicon hay pool chung từ thư viện học, có normalized difficulty và dictionary version. Nếu dùng tactical lexicon riêng, ghi đây là ngoại lệ product có chủ ý, không tự tuyên bố đã giữ đầy đủ learning requirement.

Mặc định Duel không trả Campaign Credits/XP/loot, không thay unlock hoặc pity, vì plan chưa định nghĩa cross-mode progression reward. Đây là ranh giới dữ liệu, không phải giới hạn của một bản rút gọn. Chỉ manual player input hợp lệ mới có thể tạo evidence theo contract học đã chọn; bot, reveal/proc/autocomplete không được giả làm người học gõ đúng. Nếu owner muốn reward cross-mode, phải bổ sung contract đó vào scope trước khi implement.

Bổ sung hòm giải đố ở §11 giữ nguyên ranh giới này: Combat dùng reward economy adapter phù hợp; PvP dùng tài nguyên/effects trong trận. Sentence/grammar evidence không tự đồng nghĩa với vocabulary mastery.

### D11 — High — Friend Room cần server/operational contract, không chỉ protocol.ts

**Vị trí:** D-plan §45–50.1, §59 M-DUEL-09–12. **Gate áp dụng:** các hạng mục bắt buộc khi xây và nghiệm thu public/friend online.

**Chắc chắn:** Cao.

**Vấn đề:** Repo game hiện là Vite client; không thấy WebSocket/WebRTC runtime trong source/package đã kiểm tra. V2 chưa chỉ rõ server deployment, authentication/room authorization, match ownership, validation limits, reconnect identity, process restart, cleanup hoặc kết quả khi server chết.

**Đề xuất:** Xây production authoritative service cùng room/session contracts, authenticated/session-bound player slots, version handshake, input limit và disconnect/reconnect handling; UI dùng đúng contract này. Public/private rooms, join/create/ready, room options và matchmaking thuộc scope nào phải được hoàn thành theo checklist đó. Không cần tự thêm Redis hoặc nhiều region nếu deployment một service đáp ứng tải và yêu cầu vận hành đã duyệt.

Trước public launch phải có WSS, Origin allowlist, session authentication/authorization cho từng room action, schema/size/rate limits, heartbeat/room expiry và cách xử lý server restart. Password room không thay authentication; host không được mutate luật sau Ready mà không reset readiness. [OWASP: WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)

Reconnect dùng server snapshot đã lọc hidden state + last accepted sequence; không chạy lại input đã grant. Pause/bot takeover/grace period phải có default hữu hạn. Không tự pause online chỉ vì Esc hoặc tab mất focus; browser có thể dừng `requestAnimationFrame` ở tab nền nên client frame clock không thể là authority online. [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

### D12 — Medium — Performance và readable chaos phải được chứng minh sớm

**Vị trí:** D-plan §23, §27–37, §56–59. Code tham khảo: `src/performance/quality.ts`, `src/test-lab/batch-f-performance-gate.ts`.

**Chắc chắn:** Trung bình về chi phí thực; Cao rằng chưa có benchmark cho Duel.

**Vấn đề:** Hai tàu, projectiles, curved trajectories, word motion, hazards, BGM layers, neutral objectives và Cataclysm cùng tăng tải. Quality caps riêng cho mỗi hệ không tạo global frame budget. Match càng về cuối càng lag sẽ phá counter window và tính công bằng.

**Đề xuất:** Một renderer phục vụ scene hai người, không chạy hai full PvE `Game` loops. Engine không phụ thuộc Canvas/DOM/audio; renderer interpolate và giảm decoration độc lập. Chỉ share assets/math/render primitives có contract phù hợp, tránh ép reuse cả status/skill policy PvE.

Phân loại projectile–hazard interaction: tương tác ảnh hưởng hit/outcome phải có trajectory/collision logic deterministic; phần chỉ trang trí dùng renderer interpolation, không cần physics riêng. Giữ đầy đủ interactions đã duyệt nhưng không tính collision cho mọi hạt hiệu ứng. Profile full match và forced Cataclysm trong quá trình integration; High/Ultra polish cuối roadmap không có nghĩa performance QA được để cuối.

## 6. Kiến trúc Credit gọn hơn, nhưng không giấu trade-off

### 6.1 Ba trách nhiệm, không cần framework reward tổng quát mới

```text
Combat kill đã xác nhận
    -> reward policy / claim receipt
    -> adapter economy hiện có, có mode gate và persistence policy

Receipt + death impact
    -> pickup presenter bounded
    -> HUD presentation notification
```

- Một pure module cho eligibility, tier, amount và allocation rule.
- Một transient pickup update/draw module; tách renderer khi file thực sự quá phức tạp.
- Adapter tại owner economy hiện có. Không để VFX import save/wallet.
- Dùng receipt tối thiểu có stable identity, nominal amount, applied delta, tier và presentation origin. Không để reward phụ thuộc vào một particle tồn tại.
- Không dùng generic event bus nếu hooks hiện có đã đủ.

### 6.2 Thứ tự triển khai đầy đủ Credit Crystal

1. **C0 — Contracts:** đóng C01–C06; owner chọn income/recovery policy. Có test arithmetic và mode ownership trước production payout.
2. **C1 — Production pickup system và art:** triển khai đủ Common, Refined, High, Elite, Mini Boss, Boss, Major Boss và Golden variant; cached sprites, scatter/hover/magnet/absorb, one update owner và hard cap rõ. Test Lab là công cụ QA của cùng module production, không phải implementation riêng để làm demo.
3. **C2 — Real kill integration:** typed/skill/boss/removal audit; score logic nguyên vẹn; bỏ kill popup sau khi replacement sẵn sàng.
4. **C3 — Economy/persistence rollout:** migration nếu cần, fail-save behavior, double-callback/reload cases, results breakdown không grant lại drops.
5. **C4 — HUD/audio/polish và nghiệm thu:** hoàn thiện full tier identity, HUD count/pulse, SFX coalescing, reduced motion, bright/dark QA và High/Ultra performance.

Các bước trên là một scope production thống nhất. Không gọi Credit Crystal hoàn thành khi mới có VFX mà thiếu accounting, đủ tier, HUD hoặc persistence. Chốt gameplay/accounting trước integration để tránh rework; tối ưu số lớp draw, sprite nhỏ và DOM churn thay vì tự cắt tier hoặc hạ chất lượng art.

## 7. Triển khai đầy đủ Duel theo dependency, không cắt scope để làm bản rút gọn

### 7.1 Checklist phạm vi bàn giao

Checklist cần được đối chiếu với D-plan và quyết định product trước khi viết code. Không tự thêm spectator, clans, tournaments, voice chat, nhiều region hoặc các non-goals khác của tài liệu gốc.

| Nhóm | Phạm vi cần triển khai/nghiệm thu |
| --- | --- |
| Match core | Simultaneous typing, ownership, input grammar, action resolution, normalized/custom rulesets, 3/4/5 phút, Bo1/Bo3/Bo5, overtime/draw/reset |
| Word categories | Attack, Defense, Support, Tactical, Fate, Mystery; distribution theo phase, action costs, typo quality, instant/banked semantics |
| Strategy | Combo/recipe, resource banking, counters, neutral objectives, map control, traps, information tools, sacrifice/conversion, Initiative và các strategy paths thuộc scope được duyệt |
| Fate/Mystery | Outcome pools, bounded effects, pity round-local, reveal mechanics, Fortune coefficients, deterministic authority và hidden-state projection |
| Hòm giải đố — scope bổ sung §11 | Vocabulary/grammar/sentence questions, answer mode, mirrored/contested objectives, authoritative validation và PvP reward effects; dùng cùng question engine với Combat |
| Maps/director | Frost Wastes, Inferno Rift, Tempest Prime, Ocean Abyss, Terra Core, Celestial Void; hazard profiles, word affinity, controls, escalation và Cataclysm theo từng map |
| Bot | Human vs Bot; Bot vs Bot phục vụ QA; difficulty/personality, per-character typing, reaction/correction/decision timing, không đọc hidden information |
| Rooms/online | Human vs Human, create/join/ready, public/private và settings theo D-plan, server authority, prediction, validation, reconnect và deployment |
| Matchmaking/Ranked | Giữ milestone M-DUEL-12 của D-plan với fairness, rating và vận hành riêng; không gọi chế độ này hoàn thành chỉ vì Friend Room chạy được |
| Presentation | HUD, ship/projectile/word FX, audio escalation, readability, reduced motion, High/Ultra; Ultimate Clash theo scope được duyệt |

Các mục được D-plan ghi là optional, ví dụ World Instability, vẫn cần quyết định include/exclude rõ. Không dùng chữ optional để tự bỏ mục đã được owner duyệt; cũng không tự nâng optional thành bắt buộc chỉ vì có trong danh sách ý tưởng.

### 7.2 Tiêu chí nghiệm thu gameplay

Không chỉ “chạy được 4 phút”. Cần trả lời:

1. Người gõ chậm hơn một chút có cơ hội thắng nhờ dùng counter/đọc tài nguyên không, hay mọi lựa chọn đều thua spam attack?
2. Pure heal/shield có kéo trận tới hard deadline thường xuyên không?
3. Bank rồi xả có tạo unavoidable burst không?
4. Người mới có hiểu đang gõ từ nào, effect gì và tại sao thua không?
5. Cùng inputs/seed/config cho cùng terminal outcome trên các quality/frame schedules không?
6. Có một chiến thuật gần như luôn tốt nhất bất kể trạng thái không?

Tỷ lệ thắng hay duration mục tiêu phải có cohort/skill band và mẫu đo phù hợp; không bịa một tỷ lệ “cân bằng” từ vài trận bot. Các phép đo phục vụ sửa/tuning implementation để đạt nghiệm thu, không phải quy trình quyết định có tiếp tục xây tính năng đã duyệt hay không.

### 7.3 Thứ tự xây dựng và tích hợp production

1. **Contracts:** khóa scope checklist, input/target lifecycle, action/resource schemas, phase/end conditions, ruleset/content version và authority boundary.
2. **Engine:** deterministic simulation, command validation, state projections, round/match reset và replay tests. API dùng được cho cả local và server ngay từ thiết kế.
3. **Actions và Bot:** triển khai sáu category, inventory/cost/cooldown và toàn bộ difficulty/personality đã duyệt; Bot sử dụng cùng command path với player.
4. **Strategy:** tích hợp combo, counters, banking, information, traps, conversion, Initiative và neutral objectives theo dependencies; mỗi nhóm có integration/regression tests.
5. **Director và maps:** hoàn thành các map profiles, hazards, word affinity, map control, Fate/Mystery/pity, hòm giải đố §11, escalation và Cataclysm; kiểm tra hidden information và fairness khi các hệ chạy cùng nhau.
6. **Online/rooms:** production server, client prediction/reconciliation, room lifecycle/settings, ownership, security, reconnect, cleanup và deployment; kiểm thử với nhiều điều kiện mạng.
7. **Matchmaking/Ranked:** triển khai milestone tương ứng trong D-plan; chốt availability normalization, rating, anti-abuse, disconnect/forfeit và result integrity trước phát hành Ranked.
8. **Presentation và nghiệm thu tổng:** hoàn thiện HUD/art/audio/Ultimate Clash theo scope; đo High/Ultra và input latency, migration nếu có, teardown/rematch và regression PvE. Performance QA bắt đầu từ bước 2, không chờ bước 8.

Các bước có thể thực hiện xen kẽ khi dependency đã rõ; đây không phải yêu cầu viết xong toàn bộ logic mới được làm UI/art. Không kết thúc công việc ở bước Bot, một map hoặc ba category rồi ghi PASS toàn bộ Duel. Mục chưa xong phải ghi pending đúng milestone, không chuyển thành “để sau” khi chưa được owner duyệt thay đổi scope.

## 8. Performance gate chung cho cả hai đề xuất

Không dùng “máy tôi chơi thấy ổn” hoặc “đã có Low” làm acceptance.

### 8.1 Cách đo

- Baseline/candidate cùng browser, device, viewport, DPR, quality, background, stage/scenario và seed/input workload nếu có.
- Record thêm effective DPR/adaptive scale. Không chấp nhận “FPS không giảm” nếu candidate âm thầm giảm resolution mạnh hơn mà không được review.
- Warm-up rồi đo nhiều cửa sổ đủ dài để bắt spawn burst, boss transition hoặc Cataclysm. 120 samples hiện có chỉ là minimum validity của comparator, không đủ đại diện một trận dài.
- Máy phải có điều kiện nguồn/nhiệt tương đương. Số đo CPU throttling ở một phiên trước không chứng minh tính năng mới gây lag, cũng không được dùng làm baseline thiếu kiểm soát.
- Frame p95/p99, slow-frame ratio, input-to-visible-feedback, CPU update/draw, allocation/GC, DOM writes, active audio voices và load/decode time nếu có.
- Không preload mọi Duel map/art vào startup Campaign. Load theo mode/scene và giải phóng owner/listener/audio khi thoát; không đổi lazy-loading chỉ để chạy theo một byte cap cũ.

### 8.2 Tận dụng gate hiện có

`src/test-lab/batch-f-performance-gate.ts` hiện có comparator +1 ms p95 frame/render và +0,02 slow-frame ratio, minimum 120 samples. Có thể tái dùng cơ chế capture/comparison; không coi thresholds đó tự động đủ cho tất cả hardware hoặc Duel.

Project target là 60 FPS normal combat. Một baseline vốn lag và candidate lag ngang baseline chỉ đạt “không regression” tương đối, chưa đạt trải nghiệm mục tiêu. Input latency cần đo riêng, vì FPS trung bình tốt vẫn có thể có long task đúng lúc gõ.

### 8.3 Worst-case cần kiểm tra

- Credit: 50 synthetic mixed drops, nhiều kill liên tiếp, boss khi còn pending pickups, Nova cùng background/ship/death FX; quality switch khi pool đang đầy.
- Duel: hai phía burst cùng tick, nhiều counter/status expiry, forced Cataclysm, disconnect/reconnect và nhiều lượt rematch kiểm tra leak.
- High/Ultra phải được đo thật. Nếu fail, giảm redundant draw/overdraw và noise trước, không đổi amount, window counter hoặc outcome theo quality.

## 9. Test matrix cần bổ sung trước release

Các dòng này là acceptance đề xuất. **Chưa chạy và chưa PASS trong review này.**

| Nhóm | Case bắt buộc |
| --- | --- |
| C eligibility/tier | reward role vs combat enemy có reward effect; rank/rarity conflict; golden; boss role; undefined definition fallback |
| C kill semantics | multilayer final-only; typed bolt và instant fallback; Word Bomb; Nova `playDeathFx:false`; clear-normal; escape/despawn không grant |
| C ledger | duplicate/reentrant kill; same definition nhiều instances; stale attempt; boss namespace; rounding; MAX_CREDITS; exact stage settlement |
| C allocation | ít/nhiều kills hơn expected; zero eligible kills; child summons; boss reserve; retry/farming; actual payout >=1 dưới policy đã duyệt |
| C multiplier | x2 trước/sau kill; buff hết khi đang bay; Prism Archon; accuracy/Salvage/difficulty/objective; không nhân hai lần |
| C persistence | save pending/failure; top-level vs safe snapshot; death+reload; Phoenix; import/migration; crash/retry dedupe; multi-tab nếu hỗ trợ |
| C isolation | Campaign, Ascension, hidden, Recall, Expedition, preview, Test Lab; không rò state khi thoát mode |
| C visuals/HUD | cap thực kể cả anchors; moving pose/resize; arrival once; flush/clear; modal; spending/import trong lúc animate; muted/reduced motion |
| D input | normalized phrases; prefix collisions; repeat/paste/IME; wrong-key/cancel/switch; target invalidated trong lúc packet đang bay |
| D simulation | same inputs/seed/version; side-swap symmetry; same-tick KO/counter/hit; overtime deadline; round reset; no PvE rewards |
| D action economy | no counter starvation; full bank; energy clamp; heal stall; burst không có response; map word cost parity |
| D Bot/information | per-character timeline; configured vs observed typing; reaction cost; cannot read secret inventory/future RNG; no learning writes từ Bot |
| D online | forged complete; duplicate/stale seq; invalid owner/room; reconnect resend; latency/jitter/tie; session expiry; server restart |
| D lifetime/performance | rematch cleanup; tab hidden; High/Ultra terminal state giống nhau; forced Cataclysm không đánh đổi input responsiveness |

Có thể nghiệm thu riêng module đã hoàn thành, nhưng không suy ra toàn bộ tính năng đã PASS. Trước bàn giao scope có online, mọi gate online tương ứng phải được thực hiện; không dùng N/A để che phần chưa triển khai.

## 10. Những quyết định phải chốt trước khi giao AI implement

### Credit — bắt buộc trước bật economy thật

1. Giữ >=1 Credit/eligible kill hay giữ nguyên curve? Nếu giữ cả, ai duyệt phần rebalance và spawn envelope?
2. Reward survive death/retry/reload theo chính sách nào? “Guaranteed” có phạm vi nào và báo save failure thế nào?
3. Summon/split nằm trong finite admission budget hay income được phép tăng?
4. `credits-x2` giữ legacy stage-clear semantics hay chuyển kill-time bonus? Prism Archon được xử lý ra sao?
5. Recall/Hidden/Ascension/Expedition có nhận Credits không, và owner state nào?
6. Khi hết visual cap, có được coalesce low-tier anchors không?

### Duel — bắt buộc trước viết engine lõi

1. Chuỗi cần gõ/space/hyphen/correction/switch theo policy nào?
2. Word slots, expiry, refill, instant-vs-bank và sử dụng item cụ thể thế nào?
3. Regulation/phase/overtime/draw/simultaneous KO dùng rule nào?
4. Vocabulary/cost đối xứng và baseline counter được đảm bảo bằng cách nào?
5. Duel có trả learning evidence không, theo contract nào? Mặc định không đụng progression PvE.

Online-specific authentication, latency arbitration, deployment và rating phải có owner, dependency và acceptance của milestone tương ứng. Xây module theo thứ tự không làm các hạng mục này trở thành tùy chọn hoặc bị loại khỏi scope đã duyệt.

## 11. Bổ sung phạm vi: Hòm giải đố ngôn ngữ trong Combat và PvP

### 11.1 Quyết định sản phẩm và giá trị

**Bổ sung theo yêu cầu chủ dự án:** triển khai tính năng thật, dùng trong cả Combat và Duel/PvP; không phải một bản demo hoặc đề xuất làm thử rồi mới quyết định làm tiếp.

Một máy bay/drone vận chuyển kéo hòm quà đi vào chiến trường. Hòm giới thiệu một câu hỏi ngắn: nhớ từ, điền từ, chọn cấu trúc, sửa lỗi, sắp xếp hoặc viết lại câu. Người chơi chủ động nhận câu hỏi, gõ đáp án và nhận thưởng nếu trả lời đúng.

- **Combat:** Credits, vật phẩm, hồi tài nguyên hoặc buff theo reward pool được duyệt.
- **PvP:** buff, lá chắn, tài nguyên trong trận, đòn tấn công hoặc tactical effect lên đối thủ; không tự cộng tiền/XP Campaign.
- Dùng kiến thức ngôn ngữ để mở lợi thế; không chỉ thêm một từ dài để người chơi sao chép nhanh hơn.
- Xuất hiện thỉnh thoảng với cooldown và ngân sách event, không biến mỗi kill thành một bài kiểm tra.
- Các luật/pool/thông số dưới đây là thiết kế đề xuất để hoàn thiện scope mới, chưa phải balance hoặc performance đã được đo.

### 11.2 Tận dụng Recall, nhưng không nhầm phần đã có với phần phải xây

Đã đối chiếu source hiện tại tại cùng HEAD của report:

| Phần hiện có | Có thể tận dụng | Giới hạn cần biết |
| --- | --- | --- |
| `src/events/recall-bonus.ts` | Eligibility từ, mask/hint, cấu trúc bonus target | Chỉ nhận từ alphabet đơn 4–11 chữ và có nghĩa tiếng Việt; chưa có sentence/grammar validator |
| `src/Game.ts::createRecallBonusTarget`, `spawnRecallBonus`, `updateRecallBonus` | Bonus bay qua sân, lifetime, arrival sound và expiry | Thời gian đi ngang hiện không đủ để định nghĩa thời gian đọc/gõ câu; cần tách transit khỏi answer deadline |
| `src/Game.ts::typeRecallBonus` | Luồng completion và feedback | Hiện thưởng score, Power, roll equipment và word hook; không được giữ nguyên các side effects này rồi cộng thêm reward câu đố lần nữa |
| `BonusAim`, `fireBonusShot`, bonus ghost/pickup presentation | Đồng bộ shot impact/collection với hình ảnh | Chỉ là presentation, không phải nơi quyết định answer đúng hoặc commit reward |
| `src/recall/model.ts` | Hint/replay tracking, vocabulary Recall memory | Recall từ không tương đương đánh giá khả năng ngữ pháp/cấu trúc câu |
| `src/learning/shared.ts` | Vocabulary learning contract đã có | Event hiện chỉ có `entityType: "vocabulary"`, activity typing/recall; không được gửi một câu ngữ pháp như vocabulary evidence giả |

**Kiến trúc:** một question engine dùng chung, hai adapter Combat/Duel; không copy toàn bộ Recall engine thành hai hệ giải đố khác nhau. Hòm/drone là một presentation cho question event, không phải một enemy combat cần thêm HP/kill reward.

### 11.3 Các dạng bài đưa vào nội dung

Những ví dụ dưới đây là nội dung minh họa tự soạn, không phải đề thi chính thức hay hệ chấm chứng chỉ. Mỗi dạng phải có question bank đủ ngữ cảnh, version và đáp án được review.

| Dạng | Prompt minh họa | Người chơi cần gõ | Mục tiêu |
| --- | --- | --- | --- |
| Recall theo ngữ cảnh | “Quả táo”; gợi ý `a _ _ _ _` | `apple` | Nhớ nghĩa và chính tả; có thể tận dụng vocabulary hiện tại |
| Chia động từ | `She ___ to school every day. (go)` | `goes` | Hiện tại đơn, hòa hợp chủ ngữ–động từ |
| Điền giới từ | `The meeting starts ___ 9 a.m.` | `at` | Giới từ trong ngữ cảnh cụ thể |
| Chọn đáp án bằng typing | `Yesterday, he ___ home. (go / went / goes)` | `went`, không chỉ gõ nhãn A/B/C | Phân biệt dạng từ; ghi nhận là bài có lựa chọn, không phải free recall |
| Sắp xếp câu | `often / I / read / books`; yêu cầu đặt trạng từ tần suất trước động từ chính | `I often read books.` | Trật tự câu; instruction loại bớt đáp án mơ hồ |
| Sửa lỗi câu | `He don't like coffee.`; yêu cầu sửa câu | `He doesn't like coffee.` hoặc `He does not like coffee.` | Nhận diện và sửa lỗi, với variants đã duyệt |
| Viết lại theo mẫu | `Lan opens the door.` → bị động, giữ thì và tác nhân | `The door is opened by Lan.` | Chuyển cấu trúc theo constraint rõ |
| Đọc hiểu ngắn | `Mai has a blue bag and a red hat.` → `What color is Mai's bag?` | `blue` | Đọc hiểu, không đánh đố kiến thức ngoài prompt |

Không chọn một ngân hàng toàn câu động từ rồi gọi là đủ mọi dạng. Ngược lại, không tự thêm essay tự do, chấm phát âm, nghe bắt buộc hoặc đề dài nhiều trang vào combat: các loại đó cần contract khác và không thuộc scope cụ thể trên.

Độ khó câu hỏi dựa trên vocabulary/curriculum level và cấu trúc đã học, không lấy Campaign stage làm trình độ tiếng Anh. Combat có thể ưu tiên nội dung cần ôn; PvP phải dùng pool/effort band chung, không cho một bên bài dễ theo hồ sơ cá nhân còn bên kia bài khó.

### 11.4 Luồng Combat: carrier → nhận bài → trả lời → mở thưởng

```text
Director cho phép event
→ carrier kéo hòm vào vùng dễ nhìn
→ hiện loại bài + difficulty + loại phần thưởng có thể nhận
→ người chơi chọn “Giải câu hỏi”
→ panel đáp án nhận input độc quyền
→ submit
→ validator trả kết quả
→ đúng: commit reward một lần → hòm mở → VFX/HUD nhận thưởng
→ sai: feedback/cơ hội sửa theo policy → không phát thưởng khi chưa đúng
→ hết hạn/bỏ qua: đóng event, không tính enemy escaped
```

Quy tắc đề xuất:

1. Một question event đang hoạt động tại một thời điểm trên mỗi người chơi; dùng budget chung với Supply Pod/Recall Bonus/Reward Crate, không chồng nhiều panel.
2. Không spawn khi đang có boss reward modal, transition, game over hoặc một prompt bắt buộc khác. Không cắt ngang telegraph nguy hiểm chỉ để ép giải bài.
3. Carrier có thể hover/dock khi người chơi nhận bài. Answer deadline do question policy quyết định, không hết bất ngờ chỉ vì máy bay vừa ra khỏi màn hình.
4. Combat vẫn tiếp diễn khi nhận bài: đây là lựa chọn đổi thời gian tấn công lấy reward. Director chỉ offer ở khoảng áp lực phù hợp; không tự bật invulnerability/pause để người chơi spam nhận bài né đòn. Nút Pause của single-player vẫn theo policy hiện có và phải pause cả combat lẫn question clock.
5. Deadline tính cả thời gian đọc prompt + nhập đáp án + thao tác, có min/max theo dạng; không lấy độ dài answer làm toàn bộ thời gian cần thiết. Thông số phải nghiệm thu ở skill bands dự kiến.
6. Bỏ qua không mất Hull, không reset combat streak. Sai đáp án được ghi vào question accuracy, không giả làm wrong combat key hoặc một enemy escape.
7. Có giới hạn số lần submit và cooldown ngắn sau sai; không nhận vô hạn guesses. Giữ first-answer correctness, final correctness và assisted state riêng. Submit lại/cancel rồi mở lại không reset số lần hoặc deadline.
8. Stage clear không chờ bonus vô hạn. Offer chưa nhận được đóng; câu đang giải chỉ tiếp tục nếu UI kết quả có hỗ trợ một khoảng grace hữu hạn, nếu không thì cancel với lý do transition. Reward đã commit không bị thu hồi bởi animation bị cắt.

Phần này cần bổ sung vào `stageClearGate`/bonus lifecycle theo cấu trúc thật; không chỉ thêm một object rồi để nó giữ stage ở trạng thái playing mãi.

### 11.5 Input ownership: không để câu trả lời kích hoạt skill

Game hiện dành chữ cho typing và Space cho Overdrive. Trong **question-answer mode** phải có owner riêng:

- Kích hoạt bằng nút UI hoặc một action binding hiển thị rõ, không âm thầm chiếm chữ người chơi đang gõ vào enemy.
- Khi panel có focus: chữ, Space, apostrophe, hyphen và dấu câu đi vào answer buffer; Space không kích hoạt ultimate, chữ không bắn enemy, số không dùng consumable ngoài ý muốn.
- Enter gửi đáp án; Backspace sửa buffer; Escape đóng/thoát answer mode trước, không đồng thời pause/resume thêm một lần. PvP không pause match.
- Không chạy `typingText(...).replace(/[^a-z]/g, "")` cho mọi sentence answer: làm vậy có thể xóa khác biệt giữa contraction, possessive và cấu trúc.
- Preserve combat target/progress khi mở panel; khi đóng chỉ restore target nếu còn hợp lệ. Địch có thể đã chết hoặc rời sân trong thời gian đó.
- Quy định rõ IME/composition, repeated Enter, paste/autofill và mobile input. Competitive mode không coi cấm paste phía client là anti-cheat đầy đủ.
- Không phát chuỗi correct-letter feedback dựa trên secret answer trong lúc đang gõ bài free-answer; nếu có, người chơi có thể dò từng chữ. Chấm sau submit, trừ dạng Recall có hint policy được công bố.

### 11.6 Chấm đáp án: deterministic, có ngữ cảnh và không phụ thuộc LLM lúc chơi

Question definition cần tối thiểu:

```text
questionId + contentVersion
questionType + skillTags + vocabulary/curriculum references
prompt + displayed options/tokens nếu có
answerPolicy + acceptedAnswers/structured constraints
normalizationPolicy + case/punctuation requirements
difficulty/reading/typing cost band
maxSubmissions + deadlinePolicy + hintPolicy
rewardPoolId + rewardBudgetClass + allowedModes
shortExplanation
```

- Trim, gộp khoảng trắng hoặc bỏ dấu chấm cuối chỉ khi policy cho phép. Không bỏ tất cả punctuation/case nếu chính câu đang kiểm tra punctuation/capitalization.
- Các variant hợp lệ phải được biên soạn: contraction/full form, American/British spelling khi phù hợp. Không mặc định mọi paraphrase đều sai, nhưng cũng không dùng fuzzy string similarity để nhận câu sai ngữ pháp là đúng.
- Nếu dùng token reordering, xử lý repeated tokens và nhiều thứ tự đúng bằng constraint/accepted sequences; không chỉ compare một chuỗi rồi loại mọi cách khác.
- Prompt phải đủ ngữ cảnh để answer có tính xác định. Câu có nhiều đáp án đúng không được xử lý bằng cách bí mật chọn một đáp án ngẫu nhiên.
- Content linter kiểm tra ID/version, references, đáp án hợp lệ theo validator, collision sau normalization, options, độ dài và reward mapping. Human content review vẫn cần cho sự đúng đắn của câu tiếng Anh.
- Không gọi dịch vụ AI/network bên ngoài để chấm từng lần submit trong frame loop. AI có thể hỗ trợ soạn question bank ngoài runtime, nhưng nội dung phải được review/version trước khi phát hành.
- Khi nội dung lỗi được xác nhận, retire question version; không tính lỗi đó thành người chơi học kém. Chốt cách xử lý match/reward đang dùng version cũ, không thay answer giữa một attempt đang chạy.

### 11.7 Phần thưởng Combat: ngẫu nhiên có giới hạn, không phát hai lần

Các pool có thể gồm:

| Nhóm thưởng | Ví dụ | Guardrail |
| --- | --- | --- |
| Credits | Một khoản theo difficulty/budget đã duyệt | Cùng canonical wallet; không tạo currency “Question Coin” |
| Sustain | Hull/Shield/Energy restoration | Clamp max; tránh roll vào reward hoàn toàn vô dụng khi tài nguyên đầy |
| Buff | Shield tạm, damage-up hoặc cooldown benefit | Giới hạn duration, stacks, refresh và tương tác buff hiện có |
| Item | Consumable/equipment trong pool cho phép | Capacity/duplicate/fallback rule phải rõ; không mất reward khi túi đầy |

**Answer đúng là điều kiện nhận reward; RNG chỉ chọn phần thưởng trong pool, không quyết định một đáp án đúng có “trượt thưởng” hay không.**

- Weighted pool có budget theo difficulty/assist/attempt policy; thưởng không tỷ lệ đơn giản với số chữ, vì bài đọc/cấu trúc có effort khác nhau.
- Có thể hiển thị nhóm reward trước khi nhận câu, còn item/amount cụ thể random trong khoảng đã công bố. Không cam kết người chơi nhận tiền rồi bí mật đổi sang buff khác.
- Guard bằng `mode + run/attemptId + questionInstanceId + playerId`; successful submit chỉ resolve một reward. Animation/reconnect/duplicate Enter không roll lại.
- Pool eligibility và fallback phải deterministic tại thời điểm settlement; giữ receipt/outcome đã resolve, không cho cancel/reload để chọn lại kết quả trong cùng attempt.
- Credits hòm là **question reward**, không phải combat-kill reward. Hòm/carrier vẫn thuộc bonus exclusion của C-plan. Nếu dùng crystal fly-in để trình bày Credits, chỉ reuse presenter với receipt đã có, không gọi kill-grant API lần nữa.
- Thêm question rewards vào economy simulation của C01/C02/C06: kiểm tra thu nhập/phút, repeat-stage farming, x2 có áp dụng hay không. Không vừa giữ mọi bonus cũ vừa thêm toàn bộ hòm mà mặc định economy không đổi.
- Chốt persistence theo C03: save/recovery, retry, storage failure và reward receipt phải cùng policy. Không tuyên bố “never lost” chỉ vì hòm đã mở.

### 11.8 PvP: câu đố là neutral/tactical objective, không thành hệ RNG thứ bảy

Tích hợp question event vào Duel director và neutral objectives/Fate/Mystery đang được thiết kế. **Question là cách vượt thử thách; buff/attack/tactical là outcome.** Không tạo thêm một bộ HP, currency, scheduler và pity độc lập không cần thiết.

Đề xuất hai ruleset được đặt tên rõ:

**A. Mirrored challenge — mặc định cho Standard/Ranked:**

- Hai người nhận cùng question instance/content, mở và hết hạn theo server clock; có cùng prompt, hint policy, reading/typing cost.
- Mỗi người có thể trả lời đúng để nhận reward của mình trong cùng cửa sổ. Không mặc định “ai gõ nhanh hơn lấy hết” cho mọi hòm; kiến thức và quyết định bỏ thời gian giải vẫn có giá trị.
- Server chọn cùng reward profile/budget cho hai phía; effect áp dụng cho self/opponent theo người giải. Tránh một bên roll heal nhỏ còn bên kia roll sát thương cực lớn chỉ do may rủi.
- Không reveal đáp án/giải thích đúng cho người giải trước khi cửa sổ của đối thủ đóng, nhằm tránh UI hoặc event public vô tình tiết lộ answer. Server chỉ gửi feedback cần thiết cho từng người.

**B. Contested chest — hòm tranh chấp có telegraph:**

- Có thể tích hợp vào Fate/neutral contest trong cùng scope, nhưng phải công bố rõ chỉ một người thắng hoặc tie rule.
- Dùng adjudication/timestamp tolerance của D07, không ưu tiên cố định slot 1, không tin timestamp client vô điều kiện.
- Thua contest hoặc bỏ qua không bị tính answer sai. Có thể còn được lưu learning attempt hợp lệ nếu đã submit, nhưng không mint thêm combat reward.

Reward PvP có thể là shield, Energy, temporary attack buff, intercept/counter charge, một projectile attack, cooldown benefit hoặc bounded tactical debuff. Damage phải theo Duel coefficients, có telegraph/counter window khi đủ mạnh; không là random instant kill. Không khóa bàn phím, che toàn bộ đáp án hoặc dừng input lâu để “phạt” đối thủ.

Không pause trận khi người chơi mở hòm; trả lời tốn thời gian không đánh thường là opportunity cost. Match timer, hazards và opponent tiếp tục theo server clock. Question deadline vượt round deadline phải bị cancel/resolve theo một ordering công khai; không cho late submit gây damage sau khi trận kết thúc.

### 11.9 Authority, hidden answers và learning evidence

**Online:** client gửi answer intent/buffer theo protocol đã chốt; server giữ question identity, deadline, answer validator, submissions, reward roll và effect resolution. Client không được gửi `ANSWER_CORRECT` như một sự thật đáng tin.

- Shared engine nghĩa là dùng chung logic/schema, **không phải gửi toàn bộ accepted answers/hidden reward seed cho browser PvP**. Answer key/content riêng cho server không nằm trong public question payload hoặc client asset bundle cho match online.
- Với câu có options, các options đương nhiên hiển thị, nhưng không gửi kèm đáp án đúng. Điều này giảm việc đọc answer key trực tiếp, không thể bảo đảm chống công cụ giải bài ngoài game hoặc gian lận hoàn toàn.
- Dedupe sequence/receipt; chống duplicate submit, stale question/round, reconnect replay và oversized answer. Không cho spam validator để lấy unlimited hints.
- Bot trả lời qua cùng command/answer policy và giới hạn thông tin; không đọc `acceptedAnswers` hoặc kết quả roll kín từ engine state. Bot knowledge/accuracy theo dạng bài phải được định nghĩa riêng với tốc độ gõ.

**Learning:** tách answer correctness khỏi typing accuracy, first-attempt correctness, attempts/hints và assisted completion. Một câu cuối cùng đúng sau khi sửa không tương đương perfect recall lần đầu.

- Vocabulary question có thể dùng shared learning contract khi entity và semantics thực sự khớp.
- Grammar/sentence/reading evidence cần entity/skill contract được parent platform hỗ trợ; không nhét toàn câu vào `entityType: vocabulary` hoặc ghi mọi từ trong câu là đã mastered.
- Nếu parent chưa có grammar contract, ghi nhận session results trung thực; việc mở rộng cross-app persistence phải được phối hợp/duyệt riêng, không tự tạo một grammar progress store song song rồi coi đã tích hợp.
- Bot/debug/autofill/proc không tạo human learning evidence. Bỏ qua/transition cancellation không tự ghi “wrong knowledge”.

### 11.10 Performance và trình bày

- Carrier + hòm + câu hỏi là một event presentation có cap; không thêm một full scene hoặc một RAF loop thứ hai.
- Chuẩn bị question pools/indexes khi load content hoặc trước encounter, không scan toàn vocabulary/grammar bank mỗi frame.
- Chấm khi submit; không parse grammar phức tạp hoặc serialize save từng phím. UI buffer update theo input, không rebuild toàn combat HUD.
- Prompt phải đọc được trên bright/dark Worlds, không che enemy word hiện tại, boss tell hoặc PvP opponent telegraph. Giới hạn độ dài prompt theo loại bài/viewport.
- Reward VFX, pickup audio, carrier trail dùng cùng budget với combat; pronunciation không bị chime thưởng lấn át.
- PvP không dùng audio-only mandatory question khiến người tắt âm bị bất lợi; nếu thêm listening ruleset phải có thỏa thuận room/accessibility riêng.
- Low/High/Ultra chỉ đổi decoration, không đổi nội dung, answer deadline, reward value hoặc thông tin cần thiết để giải bài.

### 11.11 Thứ tự triển khai và tiêu chí nghiệm thu bổ sung

Đây là scope production bổ sung, không phải giai đoạn làm thử:

1. Chốt question schema, loại bài, bank/version, answer/input policy và learning boundary.
2. Implement pure validator, content linter và question lifecycle dùng chung; adapter source vocabulary/Recall thay vì duplicate dataset không cần thiết.
3. Tích hợp carrier/hòm và answer mode vào Combat; reward adapter, persistence, stage transitions và economy limits.
4. Tích hợp Duel director/neutral objectives, mirrored/contested policy, server validation, buff/attack effects và Bot answering behavior.
5. Hoàn thiện đủ dạng bài/content đã duyệt, art/audio/HUD và kiểm thử hồi quy Recall/Combat/PvP.

Nghiệm thu thêm:

| Nhóm | Case bắt buộc |
| --- | --- |
| Content/validator | Mọi accepted variant pass; đáp án sai gần giống fail; ambiguous prompt, repeated tokens, contraction, punctuation/case, empty/oversized input |
| Input | Space không bật ultimate khi đang nhập câu; Enter không double-submit; Escape không double-action; IME/paste/repeat policy; return combat target còn hợp lệ |
| Lifecycle | Hòm bỏ qua/timeout/sai/đúng; carrier bay khỏi screen; stage clear/death/pause/transition; không giữ stage vô hạn |
| Reward | Correct nhận đúng một reward; wrong chưa nhận; full wallet/túi/tài nguyên; no reroll exploit; no kill-credit duplication; recovery và mode isolation |
| PvP fairness | Mirrored offer/deadline/effort; contest tie/latency; reward budget; stale round; không late damage sau terminal; không reveal answer đối thủ còn đang giải |
| Authority/Bot | Forge correct, resend, secret answer payload leak, Bot không dùng answer key, server owns RNG/outcome |
| Learning/performance | Correctness khác typing accuracy; không false vocabulary mastery; không learning writes từ Bot; không grammar/network/save trong per-frame path; High/Ultra worst-case |

**Điều kiện hoàn thành:** giải đố hoạt động thật ở Combat và PvP, nhận input đúng owner, chấm đúng, phát thưởng đúng một lần, không phá economy/fairness/Recall, và có đủ nội dung cùng evidence nghiệm thu. Không gọi là hoàn thành nếu chỉ có hình máy bay kéo hòm hoặc một question panel chưa nối reward/authority.

## 12. Hình ảnh: giữ gì, cần bổ sung gì cho Credit, Duel và hòm giải đố?

### 12.1 Kết luận và giới hạn xác minh

**Có cần bổ sung art, nhưng không cần tạo lại toàn bộ bộ ảnh cũ hoặc tạo một ảnh cho từng câu hỏi.**

Theo hướng art production đề xuất, danh sách trọng tâm là **11 sprite đầu ra: 8 Credit Crystal + 1 carrier vận chuyển + 2 trạng thái hòm**. Đây là số asset cần có nếu không có source phù hợp để reuse, **không phải khẳng định bắt buộc thực hiện 11 lần tạo ảnh mới**. Golden có thể là một variant chỉnh từ Elite; hòm mở phải là biến thể đồng nhất của hòm đóng.

Kết quả kiểm tra filesystem/source trong lần bổ sung này:

- Có các WebP thuộc `src/assets/expansion-v2/typing-patterns`, `learning`, `conditions`, `encounter-recipes`, `relics` và các nhóm khác.
- Có ship atlas V3, equipment/skill icons, background kits g01–g10 và enemy/carrier art.
- Chưa tìm thấy bộ runtime/source riêng mang identity Credit pickup, puzzle chest hoặc puzzle delivery craft trong các thư mục asset đã kiểm tra theo tên và consumer. Chưa kiểm tra nội dung mọi file ZIP, Downloads hay ảnh đặt tên không thể nhận diện; không suy ra người dùng chưa từng tạo chúng.
- `drawSupplyPod`, `drawTreasureDrone`, `drawRecallBonus`, `drawRewardChoiceCrate` hiện vẽ hình bằng Canvas; chúng **không phải** bộ ảnh máy bay kéo hòm đã có sẵn.
- Chưa duyệt trực quan toàn bộ ảnh trong lượt này. “Reuse” dưới đây là ứng viên theo identity/consumer, không phải chứng nhận alpha, readability hoặc art quality đã PASS.

Các nhận định “chưa tìm thấy ảnh” trong tài liệu art cũ là trạng thái ở thời điểm soạn tài liệu đó; không dùng chúng để phủ nhận các WebP hiện đã có trong working tree.

### 12.2 Bộ Credit Crystal — 8 sprite production

Giữ đúng identity/tier trong C-plan §5–7; không đổi Credits thành Star Crystal hoặc dùng icon relic có hình tinh thể để thay tùy tiện.

| ID art mới | File source đề xuất | Vai trò/đặc điểm phải phân biệt |
| --- | --- | --- |
| CC01 | `art-src/pickups/credits/common.png` | Shard tím nhỏ, silhouette rõ, facet đơn giản, đọc được ở 7–9 CSS px cho anchor |
| CC02 | `art-src/pickups/credits/refined.png` | Prism dài hơn, cạnh cyan/trắng, khác Common về hình |
| CC03 | `art-src/pickups/credits/high.png` | Crystal đa mặt dạng crown/hex, cảm giác cao cấp hơn |
| CC04 | `art-src/pickups/credits/elite.png` | Imperial crystal lớn, core/facets rõ, có viền tối để đọc trên nền sáng |
| CC05 | `art-src/pickups/credits/elite-golden.png` | Cùng họ Elite nhưng viền warm-white/gold; không biến thành đồng xu vàng |
| CC06 | `art-src/pickups/credits/mini-boss.png` | Grand crystal có bước nhảy về silhouette/độ phức tạp |
| CC07 | `art-src/pickups/credits/boss.png` | Hero Crown crystal; không phải Common phóng to |
| CC08 | `art-src/pickups/credits/major-boss.png` | Sovereign/Galaxy crystal riêng, silhouette nổi bật, không chỉ Boss scale 1,2× |

Yêu cầu chung:

- Mỗi ảnh là **một crystal tách nền**, không cả một cơn mưa crystal, không ảnh chụp màn hình gameplay.
- Body đủ opaque, faceted highlights và dark contour. Không chỉ một đốm additive glow; halo động do renderer đảm nhiệm.
- Không số tiền, chữ tier, chữ “Diamond”, icon UI frame hoặc checkerboard vẽ giả vào nền.
- Chọn master đủ nét cho consumer; chẳng hạn 512² cho crystal nhỏ và 1024² cho hero là gợi ý authoring, không phải runtime bắt buộc dùng kích thước này.
- Satellites tái dùng sprite thu nhỏ/crop đã duyệt; sparkle, trails, scatter/magnet và absorption dùng runtime. Không cần thêm một bộ ảnh cho từng mảnh, từng quality hoặc từng giá trị Credits.
- HUD Credits có thể dùng một crop/derivative của crystal đã duyệt ở kích thước icon. Không cần tạo thêm ảnh thứ chín chỉ cho HUD nếu derivative đọc tốt.

### 12.3 Hòm giải đố — đề xuất thêm 3 sprite, dùng chung Combat/PvP

| ID art mới | File source đề xuất | Hướng hình ảnh và consumer |
| --- | --- | --- |
| PQ01 | `art-src/puzzle/puzzle-carrier.png` | Tàu/drone vận chuyển thân thiện, dáng ngang hoặc góc nhìn tương thích scene; có điểm gắn dây/năng lượng kéo hòm; không đọc thành địch đang tấn công |
| PQ02 | `art-src/puzzle/puzzle-chest-closed.png` | Hòm sci-fi đóng, khóa/core dễ nhận biết; không câu hỏi, chữ hay phần thưởng cố định bên ngoài |
| PQ03 | `art-src/puzzle/puzzle-chest-open.png` | Cùng đúng hòm, cùng camera, kích thước thân, palette và pivot với PQ02; nắp mở, ruột có ánh sáng nhẹ nhưng không phun sẵn một reward cụ thể |

Đây là đề xuất art production cho fantasy “máy bay kéo hòm”, không phải do engine bắt buộc cần bitmap. Nếu đã có craft/chest phù hợp trong kho chưa được kiểm tra, reuse sau visual QA thay vì tạo trùng.

Lưu ý tích hợp:

- Carrier và hòm là hai đối tượng ảnh riêng để kéo, hover và mở độc lập. **Không tạo một ảnh ghép cứng máy bay + dây + hòm + câu hỏi.**
- Tether/dây kéo, thruster, reward rays, success/error pulse và mở khóa được dựng bằng runtime hoặc animation assets hiện có; không cần tạo ảnh cho mỗi frame bay.
- PQ02/PQ03 phải dùng shared reference và kiểm tra alignment; tên giống nhau không bảo đảm hai ảnh sinh độc lập là cùng một chiếc hòm.
- Có thể dùng hai trạng thái với animation chuyển tiếp phù hợp; nếu yêu cầu nắp quay liên tục thì production pipeline cần layer body/lid hoặc frame sequence được duyệt. Không mặc định hai ảnh tự tạo được animation vật lý hoàn hảo.
- Enemy assets như `prism-carrier.webp` là quái Carrier, không tự đổi thành delivery craft chỉ vì trùng chữ “carrier”. Chỉ reuse nếu silhouette và gameplay readability phù hợp; không làm người chơi nhầm phải bắn hòm để nhận thưởng.
- Một bộ PQ dùng chung Combat và PvP; neutral/friendly/contested state do label, outline và marker runtime thể hiện. Không tạo lại toàn bộ bộ ảnh riêng cho từng mode.

### 12.4 Những ảnh hiện có nên giữ và tái sử dụng

| Nguồn hiện có | Consumer mới phù hợp | Điều không được suy ra |
| --- | --- | --- |
| `typing-recall-word.webp` | Badge cho câu Recall | Không phải answer key hay sprite hòm |
| `typing-phrase.webp`, `typing-boss-sentence.webp` | Badge phrase/sentence hoặc panel cấu trúc câu | Không bake câu hỏi thành ảnh; không đồng nghĩa mỗi dạng bài cần một ảnh AI mới |
| `learning-review-token.webp`, `learning-mastery-star.webp` | UI ôn tập/kết quả học khi đúng semantics | Không tự hiển thị “mastered” chỉ vì đúng một câu |
| `src/assets/icons/skills/*` | Reward buff, shield, repair, EMP, missile và attack cards | Icon không thay đạn/FX combat; phải map đúng effect thực tế |
| `src/assets/icons/equipment/*` | Card/tooltip khi thưởng equipment | Không dùng một equipment crystal làm currency pickup nếu gây nhầm |
| `public/assets/space-typing/ships/player-ships-v3.webp` | Hai tàu PvP và ship selection | Không cần vẽ lại 11 tàu chỉ vì thêm Duel; cần marker phân biệt hai phía |
| `sector-solar-storm`, `sector-meteor-shower`, `sector-gravity-well`, `sector-time-fracture` | Map/hazard briefing và telegraph legend | Đây là icons, không phải đủ mọi world background/physics hazard sprite |
| Background kits và projectile/ship FX hiện có | Scene Duel, shots, shields, aura | Cần composition/consumer và kiểm thử readability hai phía; không mặc định tái dùng nguyên scene PvE sẽ đẹp |

Giữ các ảnh A/B/C/F/G/H và E-template đang có; scope mới không là lý do xóa hoặc tạo lại chúng. Riêng các E là relic identities: không ép tất cả thành Credit Crystal, Mystery chest hay grammar icon.

**Một cảnh báo integration thực tế:** `src/expansion-v2/asset-map.ts` hiện gọi helper với prefix `icons/`, trong khi `src/expansion-v2/assets.ts` normalize theo subfolder thật và các file quan sát được nằm ở `typing-patterns/`, `learning/`... Với các file đó, key lookup cần được đối chiếu/sửa khi tích hợp. File có trên disk mà lookup không khớp là vấn đề mapping, **không phải lý do tạo ảnh mới**. Lượt này không sửa code hoặc tuyên bố toàn bộ consumer đã hoạt động.

### 12.5 Duel có cần thêm 6 background hoặc hàng chục icon không?

**Không tự động cần.** Sáu map là sáu bộ luật/presentation profiles; không đồng nghĩa phải sinh mới sáu tranh nền ngay cả khi đã có kit phù hợp.

- Frost Wastes: g03 Frost Prism là ứng viên reuse chủ đề.
- Inferno Rift: g02 Infernal là ứng viên reuse chủ đề.
- Ocean Abyss: g07 Abyssal là ứng viên cần xem ảnh thật; tên Abyssal không bảo đảm đúng cảnh đại dương mong muốn.
- Celestial Void: xem các kit cosmic/void hiện có để chọn composition phù hợp.
- Tempest Prime và Terra Core: audit kit/layers theo yêu cầu scene; nếu chưa có storm/earth identity đúng, mới bổ sung plate hoặc props còn thiếu.

Map control props như Heat Generator, Lava Gate, Storm Core cần consumer thật. Có thể reuse core/structure assets phù hợp cộng marker runtime; nếu thiếu silhouette riêng theo art direction thì tạo bổ sung cho đúng prop. Không thể chốt số ảnh này chỉ từ tên mechanic.

Các hạng mục **tạo nếu còn thiếu sau mapping/visual QA**, không tự cộng vào 11 sprite trọng tâm:

- Duel mode emblem nếu menu thực sự cần painted emblem riêng.
- Fate/Mystery/objective props nếu bộ existing core/crystal không biểu đạt được identity hoặc gây nhầm currency.
- Map plates/control structures chưa có nguồn phù hợp.
- Category badges cho tám dạng bài nếu design chọn painted icons thay cho bộ vector/UI hiện có.

“Tạo nếu thiếu” là tối ưu tái sử dụng art production, không phải trì hoãn tính năng. Từng consumer vẫn phải được hoàn thiện, bằng asset reuse đạt QA hoặc asset mới.

### 12.6 Những thứ không nên yêu cầu AI tạo thành ảnh

- Câu hỏi, đáp án, options, sentence tokens, timer, score, tên buff và amount thưởng: render bằng text/UI, để thay nội dung, localization, selection và accessibility.
- Một ảnh riêng cho từng từ/câu hoặc từng cấp độ khó.
- Dây kéo, curved flight path, glow pulses, sparkle từng frame, screen shake và damage number.
- Bốn bản art gần như nhau chỉ để dành cho Low/Medium/High/Ultra; runtime dùng quality profile và kích thước prepared phù hợp.
- Cả màn hình HUD hoặc puzzle panel đóng cứng thành bitmap; UI phải responsive và nhận keyboard/focus đúng.

Dùng renderer/CSS/vector cho các phần trên là giải pháp production, không phải cắt chất lượng xuống placeholder. Art authored tập trung vào vật thể và identity thực sự cần minh họa.

### 12.7 Bàn giao asset và nghiệm thu

1. Giữ nguyên source cũ. Kiểm tra folder/ZIP nếu người dùng đã tạo bộ tương ứng nhưng chưa đưa vào runtime.
2. Chốt style reference từ ship/enemy/FX hiện tại trước khi tạo 8 CC và 3 PQ còn thiếu.
3. Export source lossless/PNG với true alpha; runtime WebP theo prepare pipeline. Kiểm tra alpha thật, viền matte, canvas padding/pivot và dimensions, không tin checkerboard preview.
4. Sinh runtime derivatives bằng script; file `@2x`, crop HUD và atlas packing không được tính nhầm là những concept ảnh mới phải tạo lại.
5. Manifest/registry phải trỏ đúng đường dẫn và có consumer; validate required files ở build. Không để missing mapping âm thầm biến thành placeholder rồi báo đã hoàn thành art.
6. Kiểm tra ở **kích thước hiển thị thật**, cả bright/dark background, DPR thường/Retina, hai tàu PvP và reward overlap. Không duyệt chỉ dựa trên ảnh master phóng to.
7. Load/cache/decode ngoài hot path; giới hạn decoded memory và runtime draw cost theo measurement. Không preload cả kho master 1024² cho vài sprite 10 px; không áp lại các arbitrary bundle-byte caps đã bị policy bỏ.

**Danh sách cần chuẩn bị rõ nhất lúc này: CC01–CC08 và PQ01–PQ03, tổng 11 sprite đầu ra nếu chưa có source reuse đạt yêu cầu.** Prompt tạo ảnh đã được tách thành [Gemini Image Prompt Pack — Credit Crystals & Puzzle Chest](SPACE_TYPING_CREDIT_PUZZLE_GEMINI_IMAGE_PROMPT_PACK.md), gồm từng prompt copy độc lập, reference rules và checklist QA. Chưa sinh/sửa/xóa ảnh nào; file prompt không đồng nghĩa các ảnh đã được tạo hoặc tích hợp.

## 13. Kết quả tự rà report và giới hạn bàn giao

Đã rà lại các kết luận với hai plan và source liên quan, đặc biệt:

- Không nhầm combat Credits với một currency mới.
- Không nhầm toàn bộ income stage với base `24 + floor(stage × 0.7)`.
- Không khẳng định scheduled enemy count bằng actual eligible kills của mọi run.
- Không bỏ qua việc plan đã nhắc anti-cheat, batching ý tưởng, fallback và performance; issue là chỗ còn thiếu/mâu thuẫn cụ thể.
- Không nói boss pause làm mọi VFX dừng: source vẫn update effects ngoài playing.
- Không khẳng định normal death/reload đã đồng nhất: nêu đúng khác biệt source hiện thấy.
- Không coi feature tương lai chưa có là bug implementation hiện tại.
- Không tuyên bố PASS visual/performance/economy/fun khi chưa có execution evidence.
- Đã bỏ khuyến nghị làm bản rút gọn để quyết định có triển khai tiếp; thay bằng phạm vi đầy đủ, thứ tự dependency và tiêu chí nghiệm thu.
- Phần giải đố §11 là scope mới theo yêu cầu owner, không phải issue quy kết cho hai plan ban đầu; phân biệt rõ Recall single-word hiện có với sentence/grammar validation phải bổ sung.
- Danh sách art §12 phân biệt sprite đầu ra với số lần generation, reuse candidate với visual approval, và ảnh có sẵn với runtime mapping đã hoạt động. Không khẳng định đã xem mọi ảnh hoặc đã kiểm tra nội dung các ZIP.

**Trạng thái:** REVIEW HOÀN TẤT ở mức tài liệu + đối chiếu source. Định hướng là **triển khai đầy đủ phạm vi được duyệt**, giải quyết các issue/contract nêu trên và đạt nghiệm thu trước khi gọi là hoàn thành. Những quyết định kỹ thuật/product còn mở vẫn phải được chốt; đổi định hướng triển khai không tự làm các mâu thuẫn đó biến mất.

**Các cập nhật chỉ nằm ở tài liệu report này và prompt pack tạo ảnh riêng được liên kết tại §12. Không sửa code, ảnh hoặc hai bản kế hoạch gốc.**
