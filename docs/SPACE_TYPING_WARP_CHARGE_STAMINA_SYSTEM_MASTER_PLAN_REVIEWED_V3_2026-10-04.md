# Space Typing — Warp Charge / Stamina: Reviewed V3

Ngày: 2026-10-04. Phạm vi: review thiết kế, đối chiếu source và cập nhật plan; **chưa triển khai code**.

V3 là bản thay thế V2 `SPACE_TYPING_WARP_CHARGE_STAMINA_SYSTEM_MASTER_PLAN_REVIEWED_V2_2026-10-04.md`, không phải phụ lục để ghép những quy tắc trái nhau. File V2 trong Downloads được giữ nguyên để đối chiếu.

**Verdict: khả thi, nhưng V2 chưa đủ an toàn để triển khai nguyên trạng.** Giữ nguyên hướng thu phí lúc bắt đầu rewarded attempt, Practice miễn phí và Reserve. Phải sửa transaction, recovery, Practice isolation, tính kinh tế và giới hạn cam kết chống gian lận trước khi phát hành.

Không commit/push, reset branch hoặc thay code game trong bước review này. Khi triển khai phải đọc working tree mới nhất; không reset về hash ghi trong tài liệu.

## 1. Giới hạn bảo vệ — không hứa “offline không thể hack”

Game offline chạy trên máy người chơi không có một authority độc lập với người chơi. Không thể bảo đảm chống người có quyền sửa JavaScript, IndexedDB, localStorage, đồng hồ, backup, browser profile hoặc gọi trực tiếp hàm trong DevTools. Mã hóa/checksum với khóa nằm trong client không thay đổi giới hạn này.

Phân biệt ba nhóm:

| Nhóm | Ví dụ | Mục tiêu V3 |
|---|---|---|
| Lỗi ứng dụng có thể ngăn | Double-click, callback lặp, stale autosave, race hai tab, Practice ghi thưởng | Phải chặn bằng invariant và test |
| Lợi dụng thao tác UI thông thường | Reload để chơi lại miễn phí, nhập backup cũ để hoàn tiền, đổi mode giữa trận để nhận thưởng | Chặn trong các luồng được ứng dụng quản lý; công khai ngoại lệ restore |
| Người chơi kiểm soát máy/save/code | Sửa save, xóa toàn bộ storage, tua giờ nhiều lần, rollback cả browser profile | Không thể bảo đảm chống tuyệt đối offline; không tuyên bố đã giải quyết |

“Account day” trong release offline thực chất là ngày của **local profile trên một storage origin**, không phải tài khoản toàn cầu. Không tuyên bố giới hạn 3 lần/ngày được enforce xuyên thiết bị, browser hoặc origin.

Nếu tương lai Warp/Crystal liên quan trả tiền thật, trao đổi tài sản hoặc xếp hạng có thưởng, cần server-authoritative economy/time/receipts. Không đưa local save sang làm bằng chứng sở hữu server. Đây là hướng tương lai, không thêm yêu cầu server cho release offline hiện tại.

## 2. Kết quả review và lỗi cần sửa

Severity đánh giá tác động nếu triển khai đúng như mô tả V2; không khẳng định tính năng Warp đã tồn tại và đang có các lỗi này.

| ID / Severity | Vị trí V2 và source liên quan | Vấn đề, bằng chứng và cách sửa | Chắc chắn |
|---|---|---|---|
| R01 Critical | V2 §29–31; `src/persistence/crash-recovery.ts: resolveCrashRecovery`, `src/main.ts: startSelectedStage` | V2 cho restart same attempt miễn phí nhưng không định nghĩa replay reward boundary. Recovery hiện là persistent snapshot, không phải toàn bộ simulation đang chạy. Restart từ đầu + giữ gains có thể nhân thưởng; rollback toàn bộ cũng cho retry/reroll vô hạn với một lần phí. V3 bỏ free restart sau activation nếu chưa có exact-resume đúng nghĩa. | Cao về thiếu contract; không khẳng định đã tái hiện exploit Warp chưa triển khai |
| R02 Critical | V2 §60, 70–73; `src/persistence/player-save.ts: writeSave, savePlayerProgress`; `src/persistence/autosave.ts` | Revision đọc ngoài transaction và BroadcastChannel không phải atomic compare-and-swap. Save hiện `put` toàn object; queue chỉ tuần tự trong một instance. Hai tab/stale snapshot vẫn có thể ghi đè. Đọc–validate–mutate–ghi trong cùng IDB transaction, mọi writer qua một authority. | Cao, source xác nhận |
| R03 High | V2 §24, 62–69; `choosePreferredPlayerSave`, `loadPlayerSave` | Chọn recovery theo campaign xa hơn rồi timestamp có thể chọn bản economy cũ; Warp top-level không đủ nếu Star Crystal trong snapshot bị hoàn lại sau refill. Mirror, rollback, import và toàn bộ account economics phải có thứ tự version/generation rõ ràng. | Cao về rủi ro tích hợp |
| R04 High | V2 §26, 73, 122 | Dedupe phí không phải dedupe phần thưởng. Clear callback lặp có thể trả reward hai lần, hoặc close attempt trước rồi crash khiến mất reward. Settlement và terminal receipt phải cùng transaction. Cache 32–64 ID không phải authority cho callback tùy ý cũ. | Cao |
| R05 High | V2 §27–28; `src/main.ts: resolvePhoenixDeath` | Đóng attempt ngay khi defeat mâu thuẫn Phoenix resume cùng encounter. Code hiện gọi revive trước khi await save. V3 cần defeat-pending-decision và commit tiêu Phoenix trước khi simulation chạy lại. | Cao |
| R06 High | V2 §12–13, 74, 118; `src/main.ts: onStageClear, activeCombatCreditMode, persistExpansionV2Profile` | Preview có ích nhưng không phải sandbox đầy đủ. Nemesis profile có write trước nhánh preview return; Recall/Hidden còn được chọn trước preview trong credit-mode resolver. Restore snapshot cuối session không hoàn tác write ngoài snapshot hoặc callback đến muộn. Dùng capability boundary ở mutation sink, practice context bất biến. | Cao về thứ tự code; mức phát sinh thực tế tùy trạng thái |
| R07 High | V2 §50–53, 101–103; currency/reward code | Baseline Impossible trong V2 không khớp khi không có objective/Ascension. Giá 8/12/18 không chứng minh no-self-funding: hai major boss replay có thể trả hơn 8 SC ngay cả Balanced. Sửa số và mô phỏng đường farm tốt nhất, không chỉ trung bình 1000 stage. | Cao về phép tính; khả năng farm thực tế còn phụ thuộc unlock/clear |
| R08 High | V2 §16, 18 | Để Hidden/Expedition “audit sau” nhưng vẫn cho thưởng chung có thể bỏ lọt đường bypass. Hidden hiện có đường reward riêng và dùng currencies chung. Mọi route phải có classification trước khi bật gate Warp toàn Campaign. | Cao |
| R09 High | V2 §66, 88–89, 119 | Missing field của save hiện hành không được tự thành 100 Warp; restore backup cũ và import có thể hoàn tiền/nhân migration grant. Clock caps chỉ giới hạn số dư tức thời, không giới hạn refill lặp bằng tua giờ. | Cao |
| R10 Medium | V2 §39–44, 57–58 | Chưa khóa thứ tự reconcile/spend/refill và fractional carry khi đổi pool/full cap; dễ double regen, mất carry hoặc bán refill thiếu chỗ do stale UI. Cần pure algorithm + property tests. | Cao |
| R11 Medium | V2 §82–85, 94 | Pacing 24/30 attempts/ngày là tốc độ dài hạn lý tưởng, không phải hard cap/ngày; Reserve/initial stock cho burst lớn hơn. Khi Active=Reserve=0 cần 60 phút tới 10, không thể mặc định 23:41. | Cao |
| R12 Medium | V2 §3, 46–47, 144–145 | Tên game khác và tỷ lệ cap không chứng minh giá refill đúng cho Space Typing; “FINAL/không exploit” vượt quá evidence. V3 bỏ dùng các thông số game ngoài chưa được kiểm chứng lại làm cơ sở nghiệm thu. | Cao về giới hạn bằng chứng |

## 3. Baseline đã kiểm tra và phạm vi evidence

- Space HEAD quan sát: `3ea8fd5bc73f547bfe3c54065fc74a9ae4b89f82`; working tree có nhiều thay đổi chưa commit của người dùng/AI khác.
- `PLAYER_SAVE_VERSION` trong source hiện là 27. Chọn version kế tiếp theo source tại ngày code, không hard-code rằng chắc chắn phải là 28.
- Đã đọc toàn bộ V2, đối chiếu các đường persistence, recovery, preview, death, launch và reward liên quan. Đây không phải audit toàn repository hay penetration test.
- Đã chạy đoạn Node read-only import công thức production để tính lại reward ở §12. Chưa chạy full economy simulator, chưa triển khai Warp, chưa chạy tests/runtime Warp.
- `docs/PROJECT_CONTEXT.md` có phần lịch sử schema khác source; tra source hiện tại và ghi rõ khi khác, không dùng một dòng lịch sử để suy ra version mới nhất.

Các entry point cần đọc lại trước code:

| File | Hàm/điểm quan trọng |
|---|---|
| `src/main.ts` | `currentAutosaveSnapshot`, `currentRunPersistentState`, `autosaveCampaign`, `beginTestingStagePreview`, `restoreTestingStagePersistentState`, `activeCombatCreditMode` |
| `src/main.ts` | `startSelectedStage`, `startActiveHiddenEncounter`, `onStageClear`, `resolveCheckpointDeath`, `resolvePhoenixDeath`, import/export và pagehide |
| `src/persistence/player-save.ts` | Schema, migration, `choosePreferredPlayerSave`, `loadPlayerSave`, `writeSave`, `savePlayerProgress`, recovery mirror |
| `src/persistence/autosave.ts` | `AutosaveQueue`, pending stale snapshot và flush |
| `src/persistence/checkpoint.ts` | `RunPersistentState`, `restoreCheckpointSnapshot`, các knowledge merge |
| `src/persistence/crash-recovery.ts`, `death-protection.ts`, `backup.ts` | Recovery, legacy resurrection, mirror/import validation |
| `src/economy/currencies.ts`, `src/rewards/campaign-rewards.ts` | Base currency, rounding, performance, sector |
| `src/campaign/expansion-state.ts`, `src/progression/ascension.ts` | Checkpoint eligibility, replay frontier, tier multipliers |
| `src/rewards/combat-credit-drops.ts` và mọi mutation hook | Reward trong combat, simulated wallet, settlement subtraction |

## 4. Product policy giữ lại và thay đổi đề xuất

| Nội dung | V3 |
|---|---|
| Tên | Warp Charge, không phải combat Energy |
| Active cap | 100 |
| Rewarded attempt | 10, phí lúc admission trước combat, không thu thêm lúc clear |
| Active regen | 1 / 6 phút khi Active chưa đầy |
| Reserve | Cap 300, 1 / 12 phút chỉ khi Active đầy |
| Practice / Smart Review | Miễn phí; learning được ghi, economy/power/campaign reward tắt |
| Fail / chủ động quit | Không hoàn Warp; giữ gains theo chính sách persistent-death hiện tại |
| Phoenix | Cùng encounter/attempt, không phí Warp lần hai; tiêu item đúng một lần |
| Crystal refill | Immediate +20, overflow Reserve, tối đa 3 lần/game-day; không auto-spend |
| Giá refill | 8/12/18 là **candidate cần kiểm chứng**, không còn được gọi là giá đã chống self-funding |
| Typing/Voice/Hybrid | Cùng phí; eligibility reward vẫn theo luật input-source của Voice Final V2 |
| Offline chống sửa save/giờ | Best-effort, không phải trusted economy |

Hai thay đổi hành vi lớn phải được owner biết trước khi code: **không free restart sau activated crash nếu chưa có exact-resume**, và **giá refill có thể phải tăng nếu giữ mục tiêu không có repeatable self-funding**. Đây là đề xuất review, chưa phải quyết định đã được owner xác nhận. Không tự thay chúng bằng một phương án dễ exploit khi gặp khó.

Nếu owner bắt buộc vừa free restart sau crash vừa giữ mọi gains, phải thiết kế recovery/event journal tương ứng trước; không triển khai hai lời hứa đó bằng snapshot hiện tại.

Về sản phẩm, stamina là lựa chọn pacing, không phải biện pháp bảo mật và không tự làm game hấp dẫn hơn. Cost10 tương đương60 phút regen, nên failure liên tiếp có thể làm learner hụt hẫng dù Practice miễn phí. V3 giữ các constants của bản gốc; nếu mục tiêu chính chỉ là khuyến khích quay lại mỗi ngày, một daily bonus không khóa progression sẽ đơn giản hơn về UX, nhưng đó là phương án sản phẩm khác cần owner đồng ý, không tự thay trong milestone này.

## 5. Activity classification và entry gate duy nhất

| Activity | Phí | Reward policy |
|---|---:|---|
| Base Campaign, Ascension, full-reward replay | 10 mỗi attempt | Theo luật hiện hành và transaction receipt |
| Combat/Recall, Typing/Voice/Hybrid trên rewarded Campaign | Như trên | Không phát typed metrics/procs giả cho Voice |
| Practice stage/boss/vocabulary | 0 | Learning only; simulated economy |
| Smart Review trong Space | 0 | Learning only; không âm thầm unlock Campaign |
| Testing Preview/Test Lab | 0 | QA/simulated; không được đẩy reward vào production |
| Duel | 0 Warp | Economy riêng; mọi bridge vào Campaign phải được audit, không mặc định an toàn |
| Expedition | 0 nếu chứng minh account economy được cách ly | Có Campaign-value reward thì cần limiter/classification rõ trước release |
| Hidden encounter | Cần audit và chốt từng route trước release | Không cho một generic free route trả Campaign currencies chỉ vì chưa phân loại |
| Shop/Rest Hub/settings/calibration | 0 | Transaction riêng; không phải lối gọi thẳng combat miễn phí |

Đề xuất Hidden: mỗi trận standalone có persistent Campaign reward dùng paid admission 10; nếu là một nhánh nằm trong paid attempt, phải giới hạn số sub-encounter/reward, gắn vào parent attempt và mô phỏng tổng giá trị. Không vừa thu parent vừa tự thu sub-encounter; không gộp chuỗi vô hạn vào một phí.

Không tự đổi phí Hidden đang tồn tại trong bước review này. Bảng coverage chưa đủ là release blocker cho lời hứa “mọi rewarded progression đã chịu gate”, không phải lý do âm thầm vô hiệu hóa content người dùng đang có.

Mọi nút Deploy/Retry/Next Stage/Rest Hub Continue/route/auto-next/hidden return/resume phải đi qua cùng admission service. `game.startStage()` không tự suy ra rewarded từ UI; nhận launch context đã validate. Practice context không thể đổi thành rewarded bằng toggle giữa trận.

## 6. Transaction authority — sửa persistence trước UI

### 6.1 Storage contract

Chọn IndexedDB làm canonical store cho managed Warp economy. Không tiếp tục dùng fallback tự động “IDB lỗi thì ghi localStorage như thành công” cho transaction kinh tế mới. Nếu không có canonical persistence khả dụng: giữ dữ liệu, báo lỗi, chỉ cho Practice trong phạm vi an toàn; không phát thưởng không lưu được.

Đọc save mới nhất, so revision/generation, kiểm tra eligibility, tính next state, ghi state + receipt trong **cùng một `readwrite` transaction** và chỉ ACK sau `transaction.oncomplete`. Không chỉ chờ `put.onsuccess`. Không await mic/network/assets/UI giữa transaction. IDB transaction có lifetime theo event loop, nên preflight phải nằm ngoài. [IDBTransaction — MDN](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction).

Canonical state tối thiểu cần:

- `profileId`, `saveGeneration`, `accountRevision`, schema/policy version.
- `warpCharge`: balances, fractional carry, clock/day state, refill count.
- Một active attempt tối đa trên profile; context và owner fencing token.
- Transaction receipts có request ID, loại thao tác, expected generation/context và outcome.
- Campaign/economy state liên quan đến reward/refill/consumption trong cùng transaction boundary.

Warp vẫn ở top-level ngoài `RunPersistentState`. **Nhưng chỉ đưa Warp ra ngoài rollback không bảo vệ Star Crystal đã chi**. Recovery không được phục hồi wallet, inventory, shop stock hay currency từ một snapshot trước account transaction mà không đối chiếu authority.

### 6.2 Không tin dữ liệu từ dialog/caller

- Caller gửi intent/request ID, không gửi một `nextPlayerSave` tùy ý để ghi đè.
- Giá, phí, amount, ngày, eligibility, stage unlock, reserve consent và currency balance phải đọc/tính lại trong authority.
- Mọi số là finite safe integer và trong bounds; không chấp nhận NaN, Infinity, âm, fraction, oversized array/string, stage ngoài range.
- Cùng request ID đã commit: trả lại receipt, không trừ/phát lần hai. Cùng ID khác payload: reject.
- `recentAttemptIds` chỉ là cache diagnostics. Chấp nhận callback phải dựa trên active attempt/context/phase/sequence; callback của attempt cũ sau eviction vẫn bị reject.
- Closed attempt không được tái mở qua callback. Một request cũ sau compaction không được coi là launch mới: launch generation/nonce đã dùng phải không còn hợp lệ.

### 6.3 Tất cả writers phải tham gia

Không chỉ Warp service dùng revision còn autosave/shop/pagehide vẫn blind-put snapshot cũ. Audit tất cả writers và chuyển qua cùng coordinator/version checks. Autosave cũ không được tự nâng revision rồi ghi object cũ thành “bản mới”. Khi stale, reload/recompute intent hoặc reject; không ghép field bằng `max()` tùy tiện.

Chặn transaction account trong lúc prepared/active/defeat-pending để giảm rollback phức tạp, trừ các thao tác in-attempt đã định nghĩa như consume/reward/Phoenix. Mở Refuel chỉ sau settlement hoàn tất ở safe menu.

### 6.4 Mirror và lỗi không rõ đã commit hay chưa

- localStorage mirror là bản phụ của **một committed revision**, không phải authority cạnh tranh timestamp với IDB.
- IDB commit thành công, mirror fail: transaction vẫn thành công; đánh dấu mirror degraded, không refund và không chạy lại debit.
- Mất response/timeout: query request receipt, không tự hoàn tiền hoặc retry bằng request ID mới.
- IDB transaction abort xác nhận: không publish next memory state, không launch.
- Khởi động thấy IDB khác mirror: ưu tiên canonical generation/revision hợp lệ, không campaign xa nhất. Mirror rescue là recovery flow có cảnh báo rollback risk, không tự merge các số dư có lợi nhất.
- Browser commit không đồng nghĩa bảo đảm tuyệt đối chống mất điện/hỏng ổ đĩa. Dùng durability option phù hợp khi được hỗ trợ và ghi rõ giới hạn; không coi `oncomplete` là chữ ký chống người dùng sửa storage.

### 6.5 Nhiều tab và origin

Web Locks có thể hỗ trợ exclusive session theo origin; BroadcastChannel chỉ dùng notification/refresh UI. Authority transaction vẫn bắt buộc. [Web Locks API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).

- Một writer session cho profile khi rewarded run đang chạy. Tab khác read-only/Practice cách ly, không thể mua đồ hay chạy paid run thứ hai.
- Owner có fencing generation do canonical transaction cấp; mọi reward/consume kiểm tra token. Tab cũ bị suspend rồi thức lại không ghi được sau takeover.
- Không coi heartbeat timeout là bằng chứng crash. Takeover phải qua transaction, tăng fence, giải quyết old attempt theo §7 trước khi cho launch mới.
- Không giữ IDB transaction mở suốt trận; lock/fence session và các transaction ngắn là hai khái niệm khác nhau.
- Khi không có Web Locks, vẫn dùng IDB fencing/ownership hoặc chặn rewarded ở cấu hình không thể bảo đảm; không giả lập mutex bằng `localStorage.setItem` rồi khẳng định atomic.
- `localhost:3004`, domain Space và origin khác không tự dùng chung storage/lock. Chốt origin production/local canonical, không hứa đồng bộ các origin bằng BroadcastChannel.

## 7. Attempt state machine, crash và Phoenix

### 7.1 Context bất biến

Attempt lưu ít nhất `attemptId`, request ID, profile/generation, stage, Ascension tier, activity kind, input/session mode, content/rules version, difficulty/reward-policy snapshot, launch seed/context digest, cost split Active/Reserve, owner fence và phase.

Không chỉ lưu `stage` vì replay, Ascension, mode và content khác nhau. Không hash toàn bộ file ảnh trong mỗi lần launch; dùng manifest/version của gameplay content.

### 7.2 Các trạng thái

```text
preflight (chưa phí)
  → prepared (đã commit -10 + attempt + safe baseline, chưa combat)
  → active (đã persist activation trước frame/gameplay mutation đầu)
  → defeat-pending-decision
       → active qua Phoenix đã commit item
       → failed khi chọn Retry/Menu/Stage Select
  → cleared / abandoned / interrupted (terminal)
```

Terminal settlement/receipt và reward delta liên quan commit cùng nhau. Phase là dữ liệu authority, không phải suy ra từ DOM/Game Over dialog.

### 7.3 Preflight và prepared

1. Validate activity/unlock, route/rest selection, vocabulary, difficulty, assets, input readiness, save capability và session ownership.
2. Voice cần permission/Host/model/context-ready; Hybrid tuân theo fallback đã được người chơi chọn, không âm thầm đổi cấu hình sau phí.
3. Tạo request ID và frozen preflight context; vô hiệu double-click ở UI nhưng vẫn chống duplicate ở service.
4. Trong transaction: đọc state mới nhất, reconcile, validate lại context/consent/balance, trừ đúng 10, lưu prepared và baseline **cùng commit**.
5. Publish committed balances. Chuẩn bị presentation không phát gameplay reward. Commit `active` rồi mới mở simulation/input gây damage.

Nếu crash khi chỉ có prepared: được tiếp tục đúng prepared attempt mà không trừ lần hai vì chưa có combat. V3 không tự refund/cancel tạo tài nguyên mới: UI cho `Continue prepared sortie` hoặc `Abandon without refund`; preflight phải giảm tối đa lỗi sau debit. Không khóa vĩnh viễn account nếu asset/content cũ mất: cho abandon có cảnh báo và Practice, ghi lỗi kỹ thuật.

Khoảng rất nhỏ giữa persisted active và frame đầu có thể bị crash và vẫn tiêu phí. Không thể chứng minh “chưa chơi frame nào” từ storage marker trước frame một cách tuyệt đối; nói rõ tradeoff, không thêm auto-refund suy đoán.

### 7.4 Policy crash được đề xuất cho release đầu

**Nếu không có exact-resume simulation snapshot: activated attempt bị gián đoạn được đóng interrupted; không tự khởi động lại stage miễn phí.** Giữ account gains đã commit theo canonical persistence; phần chưa commit theo policy autosave công khai. Không tự trừ thêm 10 lúc load. Chỉ trừ cho lần `Retry Rewarded · 10` mới do user xác nhận; Practice luôn miễn phí.

Đây là thay đổi so với §29 V2, cần owner xác nhận trước code. Lý do: snapshot persistent state hiện tại không chứa đầy đủ enemy HP, wave cursor, drops đã grant, RNG, consumables, timer và event sequence để resume đúng vị trí.

Nếu cần exact-resume sau này: phải atomically checkpoint simulation cursor/RNG, consumed resources, committed event receipts và account delta; load cùng attempt chỉ tiếp tục phần chưa xảy ra. Checkpoint cũ không được replay reward mới đã commit. Không gắn một `attemptId` lên `startStage()` từ đầu rồi gọi là resume.

Không giữ gains rồi restart free; cũng không gọi rollback entry + free retry/reroll là “đã chặn exploit”. Từ đó người chơi có thể thử lại boss vô hạn chỉ với một phí dù không tích thêm credits.

### 7.5 Phoenix và defeat

- Defeat phải persist `defeat-pending-decision` và freeze simulation. Không settle failed vĩnh viễn trước khi user chọn Phoenix.
- Phoenix: validate current attempt đang pending, còn item, current encounter còn trong memory; commit tiêu item + revive sequence + active phase, rồi mới resume gameplay. Không dùng lại thứ tự revive trước save hiện tại.
- Callback lặp/retry save không tiêu item lần hai và không revive lần hai.
- Reload ở defeat-pending không được thành prepared/active sống lại miễn phí. Không có simulation snapshot thì resolve interrupted/failed theo policy, không cung cấp Phoenix “resume” bằng restart stage.
- Nếu user chọn Retry/Menu/Stage Select: terminal failed + gains đã commit, sau đó route sang màn tương ứng; rewarded retry tạo attempt mới và phí mới.
- Consumables legacy rollback còn đọc được trong save không được trở thành đường hoàn Warp/Crystal. Không mở lại UI consumable đã bỏ chỉ để chữa recovery.

## 8. Mid-stage reward và terminal settlement

Không viết database theo từng particle hoặc mỗi chữ gõ. Reward có thể gom batch, nhưng từng batch cần sequence/receipt và atomic account delta. Mỗi producer phải có bounded budget hoặc kết thúc xác định; audit enemy summon/respawn/minion để một paid attempt không farm vô hạn.

Khi một event đã được xem là committed, resume/settle không được phát lại event đó. Nếu UI hiển thị số dư tạm trước flush, phân biệt pending, và quy định rõ mất phần pending khi crash. Không đánh dấu event committed trước authority ACK.

Clear transaction phải bao gồm:

1. Validate attempt/context/owner/phase và request.
2. Flush/settle phần mid-stage reward còn pending đúng một lần, trừ credits đã grant theo công thức hiện có.
3. Tính clear reward, performance, currencies, XP, items, Codex reward, progression, sector/Ascension milestone theo frozen context.
4. Ghi toàn bộ mutations cùng terminal receipt và phase cleared.
5. Sau ACK mới cho Next Stage/Refuel và render confirmed reward.

Nếu storage tách các sinks không thể ghi cùng transaction, cần outbox/event IDs và consumer idempotency đã kiểm chứng; không dùng nhiều `save()` nối tiếp rồi gọi là atomic. Không tạo event-sourcing toàn game nếu đưa các account fields liên quan vào canonical transaction là đủ.

Phân biệt scope receipt:

- Clear/performance repeatable: một lần mỗi paid attempt hợp lệ.
- One-time sector/tier/unlock reward: khóa theo profile + tier + milestone + policy version, không theo mỗi attempt mới.
- Replay Stage 1000 cần test riêng: source checkpoint branch ở cuối Campaign vẫn có thể trả `checkpointCommitted`; không mặc định mọi replay đều tránh được sector reward. Chốt reward nào cố ý repeatable, cái nào one-time, rồi mô phỏng đúng.
- Không tự đổi base reward để cứu giá refill. Nếu phải sửa duplicate một-time reward, ghi thành bug fix riêng với tests và migration receipt rõ ràng.

## 9. Practice / Smart Review: learning thật, economy mô phỏng

### 9.1 Reuse đúng phần

Tái sử dụng combat, stage selection, simulated credit VFX và preview lifecycle. Không coi snapshot-restore của Testing Preview là security boundary đủ dùng.

Tạo immutable session capability/context từ lúc bắt đầu, ví dụ `rewarded`, `practice`, `smart-review`, `qa`. Mọi economic/power mutation kiểm tra capability ở sink. Simulated state dùng clone/overlay riêng, không mutate object account thật rồi chờ cuối trận restore.

Practice kết thúc chỉ bỏ simulation state và reload latest canonical account view; không ghi snapshot cũ đè lên refill/regen/account changes hợp lệ trong lúc Practice. Callback/timer/audio event đến muộn phải có session generation và bị reject nếu session đã đổi.

### 9.2 Policy bề mặt

| Bề mặt | Practice/Smart Review |
|---|---|
| Shared Learning attempts, mistakes, review priority, word mastery | Ghi qua bridge dùng chung, source/session metadata đúng |
| Voice completion | Không giả typed characters/accuracy; không gọi là chấm phát âm khi engine chỉ nhận từ |
| Campaign records/unlock, Ascension, route, character XP/talents | Không thay account |
| Credits/currencies/items/equipment/relics/upgrades/shop/pity | Simulate; không cấp hay tiêu đồ thật |
| Missions/achievements có reward, hidden discovery, Nemesis, Expansion V2 profile | Không ghi progression/reward; quyết định explicit cho knowledge-only cần tách khỏi economic unlock |
| Adaptive rewarded difficulty history | Không đổi; practice history riêng nếu cần |
| Recall memory thuần học | Được persist sau khi audit không lẫn campaign/economy |
| Warp regen theo thời gian | Vẫn tiến triển như account bình thường; không bị snapshot Practice hoàn tác |

Shared Learning không được biến thành đường nhận Campaign currency qua mastery/missions ở consumer khác. Audit bridge downstream, không chỉ emitter. Giữ learning replay/dedupe policy của platform; không trừng phạt việc người dùng luyện lại một từ thật.

### 9.3 Entry/exit

- Practice chỉ stage đã unlocked/current frontier theo source; không cấp future unlock. QA unlock tách và rõ nhãn.
- Không đổi active paid attempt thành Practice rồi giữ simulation để quay lại rewarded. Kết thúc paid theo policy trước; Practice session mới.
- Smart Review entry phải mang capability ngay từ router/launch; không suy ra free chỉ từ tên UI hoặc bộ từ.
- Simulated consumable có thể dùng để luyện theo loadout policy, không làm tăng kho account khi thoát. Label phần thưởng mô phỏng rõ.
- Practice economy guard ưu tiên trước gameplay Recall/Hidden/Ascension classification; tránh bị nhánh input mode che mất policy.

## 10. Regen model xác định, O(1)

Constants giữ nguyên: `A=360000 ms`, `R=720000 ms`, Active cap 100, Reserve cap 300, cost 10.

State đề xuất: integer `current`, `reserve`, `activeProgressMs`, `reserveProgressMs`, clock high-water/baseline và daily state. Attempt/receipts có thể là account-level sibling thay vì nhét mọi thứ vào object Warp. Không tạo hai active-sortie store độc lập.

### 10.1 Invariant

- `0 <= current <= 100`, `0 <= reserve <= 300`, nguyên.
- `0 <= activeProgressMs < A`, `0 <= reserveProgressMs < R`.
- Active chưa đầy: chỉ accrue active clock; reserve remainder được giữ nhưng không chạy.
- Active đầy: chỉ accrue reserve clock; active remainder đã có từ trước một external refill được giữ đóng băng.
- Reserve đầy: reserve remainder bằng 0. Cả hai đầy: cả hai remainder bằng 0 và discard thời gian thừa.
- Reconcile cùng logical time hai lần không sinh thêm gì; luôn reconcile trước spend/refill/capacity check.

### 10.2 Thuật toán

1. Validate/sanitize state theo schema và policy corruption ở §14. Clock adapter trả elapsed không âm; pure model không tự gọi `Date.now()`.
2. Nếu Active <100, thời gian cần để đầy là `(100-current)*A - activeProgressMs`.
3. Nếu elapsed nhỏ hơn thời gian đó: cộng elapsed vào active carry, lấy quotient tăng Active, giữ remainder; Reserve không đổi.
4. Nếu đủ: đưa Active=100, active carry=0, chuyển phần elapsed còn lại cho Reserve.
5. Nếu Active đã đầy ngay đầu: elapsed đi thẳng Reserve; không nhân đôi accrual sang Active.
6. Reserve tăng bằng quotient của `reserveProgressMs + remainingElapsed` theo R, cap 300; giữ remainder nếu chưa đầy. Nếu cả hai đầy, clear carries và bỏ overflow time.
7. Advance logical clock watermark ngay cả khi không tăng số dư hoặc cả hai đầy. Tính bằng arithmetic, không loop mỗi phút offline.

External refill: reconcile trước, cộng Active trước rồi Reserve; không coi +20 là thời gian regen. Nếu refill làm Active đầy nhưng Reserve chưa đầy, active carry có trước được đóng băng; nếu cả hai đầy thì clear cả hai. Spend không tự reset carry; chỉ trừ integer amounts sau reconcile.

### 10.3 Golden examples

| Input | Elapsed/action | Expected |
|---|---|---|
| Active94, active carry2m, Reserve0 | +30m | Active99, active carry2m |
| Active98, carries0, Reserve0 | +40m | Active100, Reserve2, reserve carry4m |
| Active99, active carry5m, Reserve0, reserve carry11m | +2m | Active100, Reserve1, cả carries0 |
| Active100/Reserve300, carries0 | +3 ngày, rồi spend10, reconcile cùng now | 90/300, không hồi tức thì |
| Active92/Reserve40, carries0 | Refill20 | 100/52 |
| Active95/Reserve295 | Refill20 | Reject thiếu chỗ; không trừ SC/count |
| Active6/Reserve40, consent ON | Spend10 | 0/36 |
| Active0/Reserve0, carries0 | ETA đủ10 | 60 phút, không 23:41 |

Reserve opt-in mặc định chưa đồng ý; lần đầu confirm khoản thiếu, sau đó mới lưu lựa chọn auto-cover. Consent OFF: Active<10 thì không silently debit Reserve dù tổng đủ10. Không bao giờ auto-spend SC.

## 11. Clock và daily reset

### 11.1 Local time không đáng tin tuyệt đối

Dùng injected ClockAdapter, không trộn timestamp UI, monotonic elapsed và wall clock tùy tiện. Trong một session, `performance.now()` hữu ích để đo elapsed không bị wall-clock chỉnh; qua reload/sleep phải có policy riêng. Trên macOS các browser có khác biệt khi máy sleep, không dùng monotonic timer làm nguồn offline accrual duy nhất. [Performance.now — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now).

Policy tối thiểu:

- Lưu high-water wall time; `now` lùi thì offline elapsed=0 và không hạ watermark để lần sau ăn lại đoạn thời gian cũ.
- Dùng monotonic elapsed trong session để người dùng chỉnh giờ về đúng vẫn có thể kiếm regen khi chơi; những khoảng đã credit phải cập nhật effective baseline để không double count sau reload.
- Tua xa lên trước chỉ được cấp tối đa phần còn chứa được và discard overflow time; **không** suy ra caps đã chống exploit tua tới/spend/tua tiếp.
- Nếu clock anomaly kéo dài: UI giải thích, Practice hoạt động, không xóa save. Có flow re-anchor được xác nhận với 0 retroactive grant, giữ refill count và receipts. Đây là recovery cho local clock, không phải chứng nhận thời gian thật.
- Không dùng auto clock reset làm cách reset daily quota. Không khóa người dùng tới một năm xa trong tương lai mà không có flow recovery.

Chi tiết adapter phải có test sleep/wake/reload/re-anchor. Không tự tăng balance từ `Date.now` lẫn `performance.now` cho cùng khoảng thời gian.

### 11.2 Ngày game

Ngày game cố định UTC+7, reset 04:00 Việt Nam. Với timestamp UTC milliseconds, day index là:

```text
floor((utcMs + 3 * 60 * 60 * 1000) / 86400000)
```

Vì chuyển UTC sang UTC+7 rồi trừ giờ reset4h. Không dùng timezone setting của OS để tính quota. Test 03:59:59.999 và 04:00:00.000.

- Chỉ reset count khi day index tăng hợp lệ theo ClockAdapter policy; ngày lùi giữ count.
- Nhảy qua nhiều ngày chỉ reset current count một lần, không tích voucher cho ngày bỏ lỡ.
- Confirmation mở trước 04:00, submit sau 04:00: authority tính lại quote; UI hiển thị giá mới và yêu cầu xác nhận nếu quote thay đổi, không lặng lẽ chi theo stale UI.
- Day reset, debit SC, Warp gain, count và receipt nằm cùng transaction.
- Dù ngày không giảm, người dùng vẫn có thể liên tục tăng đồng hồ: giới hạn offline tại §1 vẫn còn.

## 12. Economy review: số đã sửa và điều chưa được chứng minh

### 12.1 Baseline tái tính từ code

Điều kiện: đi tuyến stage1–1000 một lần, accuracy99 cho base special; sector cadence10; Ascension tier0; objective bonus factor=0; multiplier Balanced=1 hoặc Impossible=1.65. “Performance every eligible” giả định >=4 badge ở mọi stage>=100. Đây là phân rã reward, không mô phỏng thời gian/failure thực tế.

| Scenario | Stage-role SC | Sector SC | Performance SC | Tổng |
|---|---:|---:|---:|---:|
| Balanced, không performance SC | 179 | 171 | 0 | 350 |
| Impossible, không performance SC | 308 | 171 | 0 | 479 |
| Balanced, performance mọi stage hợp lệ | 179 | 171 | 901 | 1251 |
| Impossible, performance mọi stage hợp lệ | 308 | 171 | 1802 | 2281 |

V2 ghi 590/2392 cho Impossible. Nếu nhân sector với difficulty1.65, sector thành282 và đúng ra được các số đó; nhưng `main.ts` hiện scale sector bằng **ascensionRewardMultiplier**, không phải difficulty multiplier. Đây là lời giải thích phù hợp với chênh111; chưa có script gốc V2 nên không khẳng định tác giả chắc chắn đã tính như vậy.

Objective bonus và Ascension có thể làm con số khác đi, phải mô tả scenario thay vì gọi một tổng không điều kiện là “current baseline”.

Lệnh read-only dùng để tái tính baseline, chạy từ thư mục `games/space-typing` với dependencies hiện có. Không tạo save hay sửa file:

```sh
node --import tsx --input-type=module -e '
import {stageRole} from "./src/campaign/stage.ts";
import {stageClearExpansionCurrencyReward as base,
  scaleExpansionCurrencyReward as scale} from "./src/economy/currencies.ts";
import {sectorCheckpointReward as sector} from "./src/rewards/campaign-rewards.ts";
for (const multiplier of [1, 1.65]) {
  let stageSC = 0, sectorSC = 0, performanceSC = 0;
  for (let stage = 1; stage <= 1000; stage++) {
    stageSC += scale(base(stage, stageRole(stage), 99), multiplier).starCrystal;
    if (stage % 10 === 0) sectorSC += sector(stage).currencies.starCrystal;
    if (stage >= 100) performanceSC += scale(
      {alloy: 0, starCrystal: 1, quantumCore: 0}, multiplier
    ).starCrystal;
  }
  console.log({multiplier, stageSC, sectorSC, performanceSC,
    noPerformance: stageSC + sectorSC,
    withPerformance: stageSC + sectorSC + performanceSC});
}'
```

Đoạn trên chủ ý giả định eligibility/performance tối đa như bảng, không mô phỏng `recordStageClear`, failure, time hay checkpoint receipts. Simulator production W00/W08 phải xử lý các điều kiện đó; không dùng script này thay toàn bộ test tích hợp.

### 12.2 Vì sao 8 SC chưa bảo đảm sink

Major boss (ví dụ stage100), base SC=4. Có performance SC thì Balanced=5 mỗi clear; Impossible base round(4*1.65)=7 và performance round(1*1.65)=2, tổng9. Không tính sector/Ascension/objective.

Hai clear loại này có thể trả10 SC Balanced hoặc18 SC Impossible so với giá refill đầu8 SC cho hai attempts. Đây là counterexample cấp công thức, không phải tuyên bố người chơi nào cũng làm được hoặc mọi stage đều replayable ở thời điểm đó. Source clear reward hiện không mặc định tắt base/performance chỉ vì replay.

Do đó:

- 3 refill/game-day giới hạn số giao dịch trong điều kiện clock bình thường, **không chứng minh** SC sink hay không-self-funding.
- Trung bình 1000 stages không đủ: người chơi tối ưu chọn stage có SC/Warp hoặc SC/phút cao nhất.
- Một one-time milestone lời hơn refill không tự là exploit. Một loop replay có lãi lặp lại mới là vấn đề nếu sản phẩm yêu cầu refill là sink.
- Không tự giảm reward hoặc tăng difficulty cùng milestone Warp để ép phép tính đẹp.

### 12.3 Cách chốt giá tốt hơn

Giữ +20 và max3; mô phỏng candidate8/12/18 nhưng không gắn nhãn đã cân bằng. Phân tách hai lựa chọn để owner quyết định:

1. **Đề xuất ưu tiên:** refill là optional SC sink. Dùng production reward formulas và các loop hợp lệ để tìm tổng SC repeatable tốt nhất của hai extra attempts; giá đầu cần lớn hơn giá trị đó nếu yêu cầu strict no-self-funding, các giá sau không thấp hơn. Kiểm tra cơ hội mua equipment/upgrade và khả năng tiếp cận của player thường, không chỉ chọn giá cực cao cho đủ bất đẳng thức.
2. Nếu mức giá strict làm refill vô nghĩa cho đa số, giữ giá dễ dùng và thừa nhận đây là **daily-limited acceleration**, không cam kết sink tuyệt đối. Cần owner chốt tradeoff; không gọi việc người chơi tận dụng reward hợp lệ là hack.

Không công bố một bộ giá thay thế mới chưa mô phỏng. Trước release paid refill cần có giá cụ thể được owner duyệt và report. Cốt lõi Warp/Practice có thể triển khai độc lập; không phát hành nút trả SC với lời hứa cân bằng chưa có bằng chứng.

### 12.4 Simulator phải có

- Import các pure production formulas, đúng thứ tự scale/round, objective factor, sector one-time eligibility và Ascension; không nhân một global multiplier cho mọi nguồn.
- All difficulty modes, Custom bounds, adaptive history, Voice reward policy; không giả Voice có typed performance badge giống Typing.
- Frontier progression, best unlocked replay, repeated major boss, stage1000, hidden route, expedition bridge, summon/respawn, missions/achievements.
- Paid failure0/5/10/20%, các tần suất Phoenix, Practice learning loop; đo SC/Warp, SC/phút, netSC từng refill1/2/3, không chỉ ngày trung bình.
- 1 phiên/ngày, nhiều phiên/ngày, nghỉ3/7 ngày; cap waste, reserve drawdown, initial balances và refill-day boundaries.
- Freeze config/source revision trong output. Không dùng snapshot save riêng của người dùng làm benchmark rồi thay đổi save đó.

### 12.5 Pacing đúng

- 100 Warp =10 rewarded attempts, không bảo đảm clear10 stages.
- Natural tối ưu khi Active luôn dưới cap:240 Warp/24h. Nếu ngủ/làm việc khiến Active đầy, Reserve chỉ5/h nên actual supply thấp hơn.
- Từ0/0 tới100/300:10h+60h=70h, giả định không spend/refill và carry0.
- Một phiên/ngày, mỗi lần tiêu hết hai pool: từ0/0 sau24h có100+70=170, tức17 attempts; không cộng thêm240 vào170.
- Perfect1000 clears, initial100, không paid/failure/cap waste: cần9900 Warp regen=990h≈41.25 ngày. Thời gian chiến đấu/đợi lịch có thể làm lâu hơn.
- Paid +60/game-day cho tốc độ dài hạn lý tưởng khoảng300/ngày; 1000/30≈33.3 ngày là xấp xỉ steady-state, không thời điểm hoàn thành chính xác vì initial100 và reset boundary.
- Không có hard cap30 attempts/ngày: Reserve/initial storage có thể cho burst hơn30. Lúc100/300 có40 attempts ngay, trước cả natural/paid supply ngày đó.
- Free Practice vẫn có thể tạo cảm giác “phải clear hai lần mới tiến bộ”; UX phải nói rõ trước khi vào, không giả Practice clear sẽ tự unlock frontier.

## 13. Refuel contract

Chỉ ở safe phase khi không có prepared/active/defeat-pending/unsettled attempt. HUD mở Refuel Depot cố định; không random stock. Purchase=immediate+20, không thêm inventory Fuel item trong release đầu.

Authority transaction:

1. Validate owner/session, request generation, policy/quote.
2. Reconcile, tính day và số refill đã dùng.
3. Recompute price theo count; validate explicit SC consent.
4. Check SC đủ và tổng storage room>=20 **sau reconcile**.
5. Debit SC, fill Active trước rồi Reserve, count+1, receipt, revision+1.
6. Ghi account state và làm mọi safe recovery baseline liên quan phản ánh post-purchase bằng cùng canonical boundary hoặc invalidation version bảo đảm không restore cũ.
7. ACK rồi UI animate. Duplicate click dùng cùng intent, không tạo ba giao dịch vì event handler chạy ba lần.

Không dùng Credits/Quantum Core, không auto refill, không mất overflow, không bán khi thiếu chỗ. Future free/event fuel cần receipt one-time + policy overflow riêng, không tự thêm daily/event resource vào scope hiện tại. Nếu sau này có item thì account-level, không expiry, không lẫn combat inventory.

## 14. Schema, migration, import/export và rollback

### 14.1 Migration

- Old schema thật chưa có Warp: Active100/Reserve0, carries0, current clock baseline, count0, no active attempt; không cộng regen từ timestamp save cũ.
- Migration ghi schema mới và grant initialization atomically, đúng một lần cho profile generation; crash giữa migrate không phát thêm100.
- Current schema bị thiếu/corrupt Warp không được coi là old save. Quarantine/recover từ committed compatible copy hoặc yêu cầu recovery rõ ràng; không tự full refill.
- Save version tương lai: không downgrade/mặc định hóa làm mất data. Unknown field/version policy có error rõ.
- Active attempt mismatch stage/tier/context: không coi là free launch token cho stage khác.
- Validate length/bounds/version cho receipts, timestamps, day index, currencies. Corrupt values không được clamp lên cap có lợi rồi âm thầm lưu như hợp lệ.

### 14.2 Backup policy đề xuất

Export chỉ lấy consistent committed snapshot, kèm profile/generation/revision/version; không export object nửa settlement. Trong active run chỉ export safe committed state và cảnh báo không có exact simulation resume, hoặc yêu cầu ra menu trước.

Import mặc định same-profile, older-revision không được silently overwrite economy mới. Hiển thị explicit `Restore older backup` nếu người dùng thật sự cần khôi phục: đây là hành động cho phép rollback do user quyết định, tạo save generation mới, vô hiệu pending callbacks/attempt claims và ghi cảnh báo có thể hoàn tác chi tiêu. Không cộng từng field theo max giữa hai save.

Nếu sản phẩm yêu cầu **không thể** lợi dụng cả nút restore có xác nhận, phải bỏ economy rollback qua restore trên profile đang quản lý hoặc dùng authority ngoài máy. Không thể vừa cho khôi phục hoàn toàn save cũ offline vừa bảo đảm mọi giao dịch sau backup không bị hoàn tác.

Import từ thiết bị/profile khác là whole-profile restore/replace có xác nhận, không chuyển một lượng Warp cộng vào profile hiện có. Old backup không chứa Warp không được lặp migration grant lên cùng current profile. Xóa toàn bộ storage hoặc restore cả browser profile vẫn ngoài threat model §1.

### 14.3 Rollback và thực tế code hiện tại

Current UI death giữ gains, nhưng repo vẫn có legacy checkpoint/death recovery helpers. Không dựa vào việc button legacy bị ẩn để bỏ audit load/import/recovery. V3 yêu cầu bảo toàn accounting đã commit qua mọi entry path, không lấy `RunPersistentState` cũ hoàn SC đã mua refill.

Có thể giữ checkpoint cho campaign encounter progression/learning knowledge, nhưng currency/inventory delta phải reconcile theo canonical revision. Nếu không chứng minh được một rollback an toàn, không dùng nó tự động cho managed paid attempt.

## 15. UX và performance

- Stage Select hiển thị rõ `Deploy · 10 Warp`, `Practice · Free`, reserve assist khi consent đúng.
- Game Over: phí đã dùng, gains theo committed policy, `Retry Rewarded · 10`, `Retry Practice · Free`, menu.
- Clear không animate trừ Warp lần nữa. UI settlement pending thì chưa cho launch/refill tiếp.
- Crash recovery thông báo interrupted và lựa chọn, không tự charge retry, không gọi restart từ đầu là “resume”.
- Practice banner thường trực nhưng gọn; simulated reward không làm real-wallet HUD tăng.
- ETA dựa số còn thiếu và fractional carry; no resources/carry0 cần60 phút, một charge cần6 phút. Countdown display không ghi save mỗi giây.
- Regen O(1), không polling full save mỗi frame. Short IDB writes tại transitions/reward batches; không inference/audio work trong transaction.
- Không cắt High/Ultra/VFX để bù overhead Warp. Đo frame time và storage latency; checksum/version chỉ lúc cần.
- App sleep/background/reload đúng semantics; không yêu cầu tab luôn mở để regen. Không notification mặc định. No expiry cho resource.

## 16. Milestones triển khai

| Milestone | Việc làm | Gate trước bước tiếp |
|---|---|---|
| W00 | Audit routes/writers/rewards/recovery, simulation baseline, owner quyết crash/price/Hidden/import | Có decision record và coverage; không copy giá V2 làm final |
| W01 | Pure Warp reconcile/spend/refill quote/day model, sanitization | Golden/property tests, clock policies rõ |
| W02 | Canonical transaction coordinator, revisions/receipts, mirror strategy, writer fence | Fault injection + hai-tab race pass trước gameplay |
| W03 | Migration, import/export, stale autosave/pagehide/recovery compatibility | Không rollback economy/duplicate init qua app path |
| W04 | Session capability, Practice/Smart Review isolation + Learning bridge | No persistent reward qua mọi sink, late callback pass |
| W05 | Paid admission prepared/active, every entry path và frozen context | Không playable trước commit, không gate bypass |
| W06 | Mid-stage accounting, clear/fail/Phoenix/interrupted state | Duplicate/crash cut-points pass |
| W07 | Reserve consent, HUD/ETA/refuel tại safe phases | Atomic debit/gain/count + day/quote tests |
| W08 | Full economy simulator với constants cuối, balanced/worst-route reports | Owner duyệt giá cụ thể và được/không được self-funding |
| W09 | Integration/perf/offline/multi-tab/visual testing và documentation | Báo PASS/FAIL/BLOCKED từng gate, không chỉ build pass |

Không phát hành paid gate trước khi Practice miễn phí dùng được. Không tách Reserve thành hai implementation ở pure-model milestone và UI milestone. Reuse các module đang có; file mới gợi ý `economy/warp-charge`, `campaign/sortie-policy`, `persistence/account-transactions`, `campaign/session-capabilities`, UI nhỏ. Không ép đúng tên file hoặc thêm lớp vì hình thức.

## 17. Test matrix bắt buộc

### 17.1 Pure model và clock

| ID | Test | Expected |
|---|---|---|
| T01 | Các golden examples §10.3 | Exact balances/carries/ETA |
| T02 | Reconcile chia nhỏ elapsed vs một lần, không action xen giữa | State tương đương |
| T03 | Reconcile cùng time nhiều lần | Không tăng thêm |
| T04 | Full cả hai vài ngày rồi spend | Không retroactive refill |
| T05 | Refill làm Active đầy giữa fractional clocks | Carry đúng policy, không double accrue |
| T06 | Reserve consent OFF với Active6/Reserve40 | Reject/ask, không silent spend |
| T07 | Backward clock rồi forward về điểm cũ | Không claim cùng elapsed hai lần |
| T08 | Huge forward, spend, repeated clock changes | Không overflow; report giới hạn offline, không giả PASS chống sửa giờ |
| T09 | macOS sleep/wake, reload, re-anchor | Không freeze vô hạn hoặc đếm sleep hai lần |
| T10 | 03:59:59.999/04:00, OS timezone đổi | Quota reset đúng fixed timezone |
| T11 | NaN/Infinity/negative/fraction/oversized payload | Reject/recovery rõ, không grant cap |

### 17.2 Transaction và nhiều tab

| ID | Test | Expected |
|---|---|---|
| T12 | Double-click Deploy / request retry | Một debit, một attempt |
| T13 | Hai tab Active10 cùng launch | Chỉ một paid admission |
| T14 | Hai tab cùng refill cuối quota | Một giao dịch hợp lệ, không count4 |
| T15 | Old autosave/pagehide tới sau spend/refill | Không ghi đè economy mới |
| T16 | Owner A suspend, takeover B, A wake | A bị fence, không phát thêm reward |
| T17 | IDB abort/quota error | Không launch/gain/debit confirmed |
| T18 | IDB success, mirror fail | Một commit, không refund/re-debit |
| T19 | ACK mất sau commit | Query receipt, không spend lần hai |
| T20 | IDB unavailable hoặc origin khác | Không silently fallback insecure/shared-account giả |
| T21 | Same request ID khác payload; old callback sau receipt eviction | Reject |
| T22 | Dialog refill stale price/day/capacity | Revalidate/confirm quote, không mất SC thiếu chỗ |

### 17.3 Attempt/reward/crash

| ID | Test | Expected |
|---|---|---|
| T23 | Mic/model/assets fail preflight | Không charge |
| T24 | Crash sau prepared trước active | Có thể continue cùng admission, không debit lại |
| T25 | Crash sau active, chỉ có persistent snapshot | Interrupted, không free stage restart |
| T26 | Retry sau interrupted/fail | User xác nhận attempt mới phí10; Practice0 |
| T27 | Kill nhận reward rồi force-close lặp | Không giữ free replay token để nhân gains |
| T28 | Duplicate clear callback, crash giữa clear settlement | Một reward/receipt hoặc toàn transaction abort |
| T29 | Defeat rồi Phoenix | Same attempt, consume item once trước resume |
| T30 | Save Phoenix fail/callback lặp/reload ở pending | Không free revive hoặc double consume |
| T31 | Next Stage/auto-next/hidden/rest route gọi launch | Không bypass gate; đúng activity policy |
| T32 | Mode/tier/difficulty đổi sau preflight | Reject/re-preflight, không reward bằng stale context |
| T33 | Replay major boss, stage1000, Ascension milestone | Repeatable/one-time reward đúng scope receipt |
| T34 | Summon/minion/infinite stall | Paid attempt không có reward producer vô hạn ngoài policy |

### 17.4 Practice, migration và sản phẩm

| ID | Test | Expected |
|---|---|---|
| T35 | Practice combat/Recall/Hidden branch | Mọi real wallet/inventory/power state unchanged |
| T36 | Nemesis/Expansion profile write trước clear handler return | Sink chặn progression trong Practice |
| T37 | Practice + late callback sau chuyển rewarded | Không mang simulated loot sang account |
| T38 | Practice exit khi canonical account/regen đã đổi | Không restore snapshot cũ đè mới |
| T39 | Practice/Smart Review learning | Event đúng input source, không giả speaking score/typed stats |
| T40 | Learning consumer mission reward bridge | Không biến free Practice thành Campaign economy farm |
| T41 | Old schema migrate rồi reload/import lại | Không grant100 thêm vào current profile |
| T42 | Current-schema missing Warp; future schema | Không silently full refill/downgrade |
| T43 | Backup cũ / khác generation / khác profile | Explicit restore policy, không merge có lợi |
| T44 | Legacy recovery/currency snapshot trước refill | Không hoàn SC trong khi Warp gain vẫn giữ |
| T45 | 0 Warp, vào Practice/current frontier | Vẫn học được, không unlock future content |
| T46 | SC simulator bảng §12.1 | Tái hiện350/479/1251/2281 theo assumptions |
| T47 | Best-repeatable replay + từng refill giá cuối | Report ROI, không dùng average che loop |
| T48 | Long idle/full pool và một phiên/ngày | Pacing/ETA không hứa hard30/ngày |
| T49 | Whole-file export trong pending settlement | Chỉ committed consistent snapshot |
| T50 | End-to-end qua Portal/browser thật | UI quote, persist, reload, read-only tab và logs đúng |

Tests T08 và T43 phải ghi rõ loại tấn công ngoài threat model; không đánh dấu chống sửa clock/save tuyệt đối là PASS chỉ vì không tái hiện trong happy path.

Property tests bổ sung: balances luôn trong bounds; mỗi accepted paid admission tổng debit10; mỗi refill accepted tổng gain20/debit quotedSC/count+1; failed transaction không mutate published state; terminal receipt không đổi; no action tạo Warp ngoài initial grant/regen/refill/explicit future reward policy.

## 18. Acceptance và các quyết định còn phải chốt

Trước code:

- [ ] Owner chấp nhận policy interrupted không free restart sau activation, hoặc yêu cầu exact-resume và tăng scope tương ứng.
- [ ] Chốt mục tiêu refill: strict sink hay limited acceleration; không coi8/12/18 đã validated.
- [ ] Phân loại Hidden/Expedition/Duel bridge và reward repeatability, nhất là stage1000/sector.
- [ ] Chốt explicit backup restore exception và offline anti-tamper limitation.

Trước release:

- [ ] Authority/revision/fence áp dụng mọi account writer, không chỉ Warp module.
- [ ] Prepared/active/Phoenix/terminal reward transactions và receipts pass fault injection.
- [ ] Practice miễn phí, mọi economy sink cách ly, learning còn hoạt động đúng source.
- [ ] Migration/recovery/mirror/import không hoàn giao dịch âm thầm trong managed paths.
- [ ] Giá thật đã có simulation + quyết định owner, không còn candidate trong UI production.
- [ ] Đã đọc `docs/VISUAL_TESTING.md`, chụp và tự xem thay đổi UI ở bước triển khai.
- [ ] Tests/build/performance và offline browser matrix có evidence; không đụng unrelated dirty files.

**Trạng thái review hiện tại:** đã sửa các mâu thuẫn và lỗi số học tìm thấy trong tài liệu; thiết kế có hướng triển khai cụ thể. **Chưa phải PASS implementation/economy/security.** Các owner decisions và simulation toàn route chưa có kết quả không được ghi thành “đã xong” hay “không còn lỗ hổng”.

## 19. Tài liệu kỹ thuật và research scope

IDB transaction lifetime/commit dùng theo [MDN IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction); phối hợp same-origin theo [MDN Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API); clock/sleep caveat theo [MDN Performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now). Đây là cơ sở API, không phải bằng chứng implementation hiện tại đã an toàn.

Các reference HSR/WuWa/Genshin/ZZZ/Arknights trong V2 chỉ là cảm hứng product. V3 không tái khẳng định cap/rate “current2026” của các game đó và không dùng tỷ lệ refill của họ để chứng minh kinh tế Space Typing. Quyết định cuối dựa luật owner, source formulas và hành vi người chơi của chính game.

## 20. Cách bàn giao cho AI triển khai

Gửi file V3 này thay V2. Với Voice/Hybrid gửi kèm `VOICE_INPUT_PLATFORM_SPACE_TYPING_3_MODE_FINAL_V2_2026-10-04.md` và `VOICE_HYBRID_WORD_CONFLICT_IMPLEMENTATION_PLAN_2026-10-04.md`.

Yêu cầu AI bắt đầu bằng W00, ghi decision/evidence, không bắt đầu bằng vẽ thanh stamina rồi vá save sau. Không tự mở server, không thu tiền thật, không sửa game khác, không commit/push khi chưa được yêu cầu. Mục tiêu là **giới hạn rewarded progression nhưng không giới hạn quyền luyện tập**, trong giới hạn trung thực của một game offline.
