# Space Typing — Consolidated Code Review

Ngày review: 2026-09-22. Ngôn ngữ: tiếng Việt; giữ nguyên tên API/feature để đối chiếu code.

**Checkpoint duy nhất của report này:** `ff1845a2206da9dc69f0872796ffa80f84ac74b2` — `feat: add build synergy rules`.

Đây là report độc lập để chuyển cho AI/reviewer khác. Không cần đọc report `82b55d6` để hiểu các issue dưới đây. Các nhận xét cũ đã được kiểm tra lại trên checkpoint mới; không coi mọi kết luận cũ là còn đúng.

**Kết luận:** chưa thể đánh dấu review clean. Có **30 finding: 10 High, 17 Medium, 3 Low; không xác định được Critical**. Trong đó Low bao gồm maintainability/documentation, không đồng nghĩa với lỗi gameplay. Các điểm còn phụ thuộc thiết kế hoặc môi trường được ghi rõ. Không thể bảo đảm tuyệt đối rằng repository không còn lỗi chưa phát hiện.

## 1. Phạm vi, checkpoint và nguyên tắc

- Review child repository `games/space-typing`, toàn bộ nhóm code đã implement tới Step 56, đặc biệt phần thêm từ `82b55d6` tới `ff1845a`.
- Đã đọc đầy đủ `docs/PROJECT_CONTEXT.md` của đúng checkpoint trước khi review phần implementation mới; đối chiếu README, combat documentation, Git history, source và tests.
- Chỉ tham khảo parent cho contract trực tiếp của Space Typing: vocabulary, route/origin, nginx, submodule và launch/build wiring. Không review source gameplay của game khác.
- Local HEAD sau khi người dùng pull đúng `ff1845a`; `main`/`origin/main` cùng checkpoint. GitHub CI cũng chạy đúng SHA này.
- Parent `git submodule status games/space-typing` có dấu `+`: working child HEAD khác gitlink parent đang pin. Đây là trạng thái sau pull, không tự coi là bug và không cập nhật gitlink.
- Không sửa application source, tests, configuration, tài liệu thiết kế; không commit/push. Chỉ tạo file report này theo yêu cầu. Giữ nguyên report cũ và các lockfile/untracked file có sẵn.
- Tất cả số dòng child bên dưới tính theo `ff1845a`. Parent path được đánh dấu riêng và phản ánh cấu hình local được kiểm tra, không phải nội dung thuộc commit child.

### Verification thực tế

| Kiểm tra | Kết quả / giới hạn |
| --- | --- |
| Local unit suite: `pnpm --dir games/space-typing exec vitest run --no-cache` | PASS: **49 files, 230 tests**, Vitest 3.2.7. |
| Local TypeScript: `pnpm --dir games/space-typing exec tsc -p tsconfig.json --noEmit --incremental false` | PASS; không emit file. |
| Production build của đúng SHA | GitHub Actions job `test-build`, các step Install/Test/Build đều success. [CI run 35673435743](https://github.com/sinhvienaiti/space-typing/actions/runs/35673435743). |
| Local production bundle trong lượt này | Không chạy lại Vite build để tránh ghi đè `dist`; không đánh đồng CI build với local build. |
| Diagnostic runtime checks | **42 probe invocation thành công**, chia 3 đợt 31 + 9 + 2; gồm lỗi, positive controls và design observations, không phải 42 bug. |
| Cách chạy probes | Transpile module TypeScript thật trong bộ nhớ; mock Canvas/DOM/audio/RAF/fetch/IndexedDB/localStorage; gọi handler/runtime thật. Không thêm test file vào repo, không chạm browser profile thật. |
| Chưa thực hiện | Browser E2E, native dialog/focus smoke test, HTTP smoke test nginx đang chạy, quota/IndexedDB trên browser thật, profiling frame-time, browser speech-cancellation ordering. |

Unit tests/typecheck/CI xanh không phủ định lỗi tích hợp: tests hiện tại không instantiate `Game` và không chạy handler `main.ts`; persistence tests chủ yếu kiểm tra tạo/migrate/so sánh save, chưa chạy đầy đủ fallback I/O và import transaction.

### Mức độ chắc chắn

- **Cao — tái hiện:** gọi code thật với fixture/stub có kiểm soát và quan sát đúng trạng thái lỗi. Không có nghĩa đã xác minh native browser behavior ở mọi browser.
- **Cao — source:** control flow và call site đủ rõ; có thể có điều kiện môi trường được nêu riêng.
- **Trung bình:** hành vi code đã rõ nhưng phạm vi yêu cầu/design còn cần xác nhận.

## 2. Danh mục ưu tiên

| ID | Severity | Finding |
| --- | --- | --- |
| R01 | High | Recovery loader làm mất Credits. |
| R02 | High | Chọn save theo Campaign rank làm mất snapshot mới hơn / hoàn tác import hợp lệ. |
| R03 | High | Fallback save báo thất bại sau khi đã commit recovery record. |
| R04 | High | Hai import đồng thời: rollback của A ghi đè state của B. |
| R05 | High | Import lúc pause phá runtime/cooldown và rollback không khôi phục combat. |
| R06 | High | Skill tự tăng typed khiến enemy chưa lock không thể được chọn lại. |
| R07 | High | Reflection giết boss rồi projectile cũ làm Game Over trong cùng frame. |
| R08 | High | Đổi vocabulary lúc pause xóa enemy và có thể vượt stage. |
| R09 | High | Escape tiếp tục combat phía sau Choice/Anomaly dialog. |
| R10 | High | Shared vocabulary không được serve trên Space origin theo config parent hiện tại. |
| R11 | Medium | Migration hidden discovery có thể khóa vĩnh viễn unlock tại cuối Campaign. |
| R12 | Medium | Level/Mastery tăng nhưng effective stats không cập nhật khi Next. |
| R13 | Medium | EMP chỉ xóa timer cũ; Jammed trở lại ngay frame sau. |
| R14 | Medium | Event Shop bán consumable chưa có đường sử dụng. |
| R15 | Medium | Neutral target còn sống nhưng không acquire được khi boss xuất hiện. |
| R16 | Medium | Stage modifiers bỏ sót child-enemy và boss-projectile paths. |
| R17 | Medium | Skill preflight chấp nhận no-op hoặc từ chối effect hữu ích. |
| R18 | Medium | Word-completion effects bị bỏ qua ở một số đường kết thúc từ. |
| R19 | Medium | Frenzy mất modifier action-rate sau lần hành động đầu. |
| R20 | Medium | Thunder Grid mất action delay khi boss đổi phase. |
| R21 | Medium | Phase-2 boss volley hoàn toàn trượt player ở nhiều arena height. |
| R22 | Medium | “Replay stage” thực tế bắt đầu stage tiếp theo. |
| R23 | Medium | WPM tính cả pause/dialog time, ảnh hưởng cả XP mới. |
| R24 | Medium | Difficulty modes/adaptive model chưa được nối vào gameplay. |
| R25 | Medium | Vocabulary chấp nhận target không có chữ gõ được. |
| R26 | Medium | Vocabulary state lệch khi write fail hoặc response cũ về muộn. |
| R27 | Medium | Backup hợp lệ với collection rỗng bị tự thay bằng starter grants. |
| R28 | Low | Boss stagger phát HUD update mỗi frame dù thông tin không đổi. |
| R29 | Low | Normal/Special Shop sao chép transaction logic thay vì dùng chung. |
| R30 | Low | Current status/README vẫn báo checkpoint và schema cũ. |

## 3. Findings chi tiết

### R01 — Recovery loader bỏ mất Credits

- **Severity:** High. **Chắc chắn:** cao — tái hiện. **Mới:** Step 52/schema v13.
- **Vị trí:** `src/persistence/player-save.ts:528–553`, `recoverySaveFromLegacy()`; `:238–260`, `createPlayerSave()`; `:612–649`, fallback/IDB-empty load paths.
- **Vấn đề:** `recoverySaveFromLegacy()` chuyển tiếp tới `createPlayerSave()` mọi field tới `recovery.hiddenDiscovery`, nhưng không truyền `recovery.credits`. Tham số cuối mặc định bằng 0.
- **Vì sao là vấn đề:** bản recovery trên disk vẫn chứa Credits đúng, nhưng load qua recovery luôn trả về 0. Xảy ra khi IndexedDB không có/không đọc được, hoặc lần khởi tạo IDB từ recovery. Nếu snapshot này được save lại, số Credits cũ bị ghi đè thực sự.
- **Tái hiện:** tắt IndexedDB trong fixture; `savePlayerProgress(..., credits=999)` thành công. JSON recovery chứa 999; `loadPlayerSave().save.credits` trả 0. Không cần cạnh tranh với save cũ hay lỗi quota.
- **Sửa đề xuất:** truyền `recovery.credits`; thêm round-trip test cho toàn bộ field v13 qua localStorage-only, IDB read failure và IDB chưa có record. Các constructor nhiều tham số vị trí là nguyên nhân dễ bỏ sót field; có thể gom snapshot thành object nhỏ, không cần viết lại persistence.

### R02 — Save authority dựa vào Campaign rank, không dựa vào snapshot mới nhất

- **Severity:** High. **Chắc chắn:** cao — tái hiện nhiều nhánh. **Cũ:** Issue 2, nay ảnh hưởng cả Credits/pity/discovery/progression.
- **Vị trí:** `src/persistence/player-save.ts:503–525`, `chooseFurthestCampaign()`; `:528–556`, recovery/legacy merge; `:651–718`, lựa chọn toàn bộ save và mirror lại.
- **Vấn đề:** rank chỉ gồm highest stage, số cleared stages và số best entries. Rank bằng nhau ưu tiên IDB; inventory/equipment/characters/pity/discovery/Credits được lấy nguyên từ nguồn có Campaign thắng. `updatedAt` không quyết định authority.
- **Vì sao là vấn đề:** mua hàng, dùng item, tăng XP qua replay, chỉnh loadout… không nhất thiết tăng rank. Save mới thành công qua recovery vẫn có thể bị IDB cũ thay thế và ghi đè mirror. Ngược lại, restore một backup stage thấp hơn có thể bị recovery cũ stage cao hơn lấn át.
- **Tái hiện:** IDB có 2 Repair Kit, write IDB thất bại, recovery save thành công với 1 kit. Khi IDB đọc lại được, load trả 2 kit và mirror trở lại 2. Một probe khác: import Stage 1 vào IDB thành công nhưng mirror write thất bại; reload trả Stage 101 từ recovery cũ. IDB malformed `{}` còn thắng valid initial-rank recovery có 5 kits sau khi sanitize thành default, làm mất 5 kits.
- **Sửa đề xuất:** chọn authority cho **toàn snapshot** bằng revision/generation đáng tin cậy, kèm validation và trạng thái explicit restore. Chỉ dùng “furthest Campaign” cho migration legacy có giới hạn, không cho mọi lần load. Không tự union/max Credits/items: sẽ tạo duplication exploit. Bảo toàn bản recovery hợp lệ khi IDB malformed.

### R03 — Fallback commit một phần nhưng báo thất bại toàn bộ

- **Severity:** High. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 19.
- **Vị trí:** `src/persistence/player-save.ts:560–563`, `saveRecovery()`; `:772`, fallback call; `src/main.ts:2733–2763`, import rollback.
- **Vấn đề:** full recovery record được ghi trước, legacy Campaign key ghi sau. Nếu write thứ hai thất bại, hàm throw dù full save mới đã tồn tại. Import nhận false và khôi phục memory, nhưng không khôi phục record đã commit.
- **Vì sao là vấn đề:** UI nói “Previous progress was restored” nhưng reload thấy imported progress; memory/disk không cùng transaction. Tách biệt R02: ngay cả không có IDB hay không có arbitration, lỗi vẫn xảy ra.
- **Tái hiện:** localStorage-only; cho write recovery thành công, write `CAMPAIGN_STORAGE_KEY` throw. `savePlayerProgress()` reject; `loadPlayerSave()` vẫn trả Stage 101 vừa nhập.
- **Sửa đề xuất:** coi full recovery record là commit point; legacy mirror là best-effort và không được biến một commit thành failure. Nếu cần tính nguyên tử mạnh hơn, dùng transaction/journal hoặc rollback có kiểm tra; đồng bộ semantics với import UI.

### R04 — Import transaction không được serialize ở tầng application

- **Severity:** High. **Chắc chắn:** cao — tái hiện bằng handler thật. **Cũ:** Issue 22.
- **Vị trí:** `src/main.ts:2668–2772`, `importSaveFile()`; `src/persistence/autosave.ts:24–39`, `flush()`.
- **Vấn đề:** không có in-flight guard. Hai import đều publish state trước `await autosaveCampaign()`. AutosaveQueue serialize **writes**, nhưng không serialize capture/mutation/rollback trong các import handler.
- **Vì sao là vấn đề:** rollback của A có thể chạy sau khi B đã publish. B tiếp tục save snapshot riêng và thông báo success, trong khi memory đã bị A đổi về state cũ; autosave sau đó có thể lại ghi state cũ lên disk.
- **Tái hiện:** gọi hai import với Campaign 101 và 201; chỉ write đầu thất bại. Sau `Promise.all`, recovery chứa Stage 201, memory vẫn Stage 1 ban đầu. Đây là lỗi interleaving async, không cần hai disk write chạy đồng thời.
- **Sửa đề xuất:** guard/disable toàn transaction import, kể cả handler; prepare và persist trước khi publish state. Không cho start run/đổi context khi import pending, hoặc dùng transaction token để completion/rollback cũ không tác động context mới. Test A-fail/B-success và ngược lại.

### R05 — Import lúc pause phá invariant của live combat

- **Severity:** High. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 4.
- **Vị trí:** `src/main.ts:2668–2763`, import + rollback; `src/Game.ts:440–490`, character/support setters và `refreshSkillDefinitions()`; `:1166–1173`, `setPlayerStats()`; `src/skills/engine.ts:82`, `setDefinitions()`.
- **Vấn đề:** Data dialog mở được từ pause. Import gọi character/stat/support setters ngay trên stage đang sống. Đổi definitions reset cooldown/charges; stat base đổi nhưng current resource caps không được rebuild lúc paused; timer của character trước không được reset. Rollback gọi cùng setters chứ không restore runtime snapshot.
- **Vì sao là vấn đề:** refresh skill quota, lẫn effect của hai character, effective stats/HUD caps lệch; có thể đổi character nhận XP của stage đang chơi. Import failure không thật sự khôi phục gameplay cũ.
- **Tái hiện:** Wraith Cloak còn 5.5s sau setter sang Aegis; effective Shield 140 nhưng maxShield live vẫn 40. Qua import failure handler thật, Barrier `cooldown/charges/uses = 9/3/1` thành `0/4/0`, dù UI thông báo rollback.
- **Sửa đề xuất:** đơn giản nhất chỉ cho import tại title/clean boundary, yêu cầu kết thúc run hiện tại trước khi thay snapshot. Nếu hỗ trợ mid-run import phải định nghĩa reset/restore toàn runtime; không chỉ rollback persisted objects. Export khi paused không có cùng vấn đề này.

### R06 — Skill-assisted typing làm enemy chưa lock không thể acquire

- **Severity:** High. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 14; phạm vi rộng hơn với kits mới và Arc Circuit.
- **Vị trí:** `src/logic.ts:55–74`, `chooseTarget()`; `src/Game.ts:1466–1482`, acquisition; `:939–962`, Chain Lightning; `:1080–1100`, Meteor; `:3196–3202`, Thunder Grid; tương tự các nhánh advance của Reaper/Arsenal/Oracle/Celestial.
- **Vấn đề:** acquisition chỉ nhận `enemy.typed === 0`, nhưng skills tăng `typed` trên cả enemy chưa từng được người chơi lock. Các skills không tạo target lock cho mọi enemy được advance.
- **Vì sao là vấn đề:** “hỗ trợ” typing làm enemy không thể gõ tiếp, dù từ chưa hoàn thành và enemy vẫn tiến xuống. AoE/synergy tăng số target có thể làm tình trạng nặng hơn.
- **Tái hiện:** enemy `testing`, `targetId=null`; Chain/Thunder tăng typed lên 2, Meteor lên 1. Gõ cả chữ đầu lẫn chữ còn thiếu kế tiếp vẫn không acquire, thêm 2 misses. Đã kiểm tra cả ba đường.
- **Sửa đề xuất:** tách assisted progress khỏi điều kiện acquisition, hoặc cho acquire partial enemy theo next expected letter với policy rõ ràng. Giữ invariant: mọi enemy còn sống, chưa hoàn tất đều có đường tiếp tục typing. Không tự auto-complete/reveal word chỉ vì skill.

### R07 — Sau Stage Clear vẫn xử lý projectile cũ và chuyển sang Game Over

- **Severity:** High. **Chắc chắn:** cao — tái hiện với volley do game tự tạo. **Cũ:** Issue 24.
- **Vị trí:** `src/Game.ts:1696–1712`, projectile loop; `:1837–1852`, `finishStage()`; `:2447–2473`, `defeatBoss()`; `:3455–3505`, projectile lookup/reflection; `:3529–3605`, damage.
- **Vấn đề:** Reflect giết boss, `finishStage()` thay `this.projectiles=[]`, nhưng iterator `for...of` vẫn giữ array cũ. Projectile tiếp theo vẫn được xử lý; lookup không thấy nó nên bỏ qua reflection, rồi vẫn gây damage. Không có terminal-phase guard tại damage path.
- **Vì sao là vấn đề:** clear hook có thể cấp XP/Credits/drop, unlock và save, rồi cùng frame UI chuyển Game Over. Ngay cả damage không lethal cũng sửa resources sau clear snapshot.
- **Tái hiện:** Stage 50 Boss phase 2, arena 1280×600, boss HP 1, player Hull 1/Shield 0, Reflect 4.5s, reset shield-regen delay. Gọi `fireBossProjectiles()` thật rồi update 60 Hz: `playing → stageclear → gameover`, clear Hull 1, final Hull 0.
- **Sửa đề xuất:** dừng simulation/iteration ngay khi rời playing; bỏ qua stale entity không tồn tại; damage methods không được mutate terminal state. Thêm test exactly-one terminal outcome và exactly-once reward/save.

### R08 — Apply vocabulary lúc pause có thể xóa wave miễn phí

- **Severity:** High. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 3.
- **Vị trí:** `src/Game.ts:1216–1222`, `setVocabulary()`; `:1727–1745`, clear condition; `src/main.ts:2781–2830`, class/initial loader; `:2955–2993`, pause vocabulary và Custom apply.
- **Vấn đề:** setter xóa `enemies` và target, nhưng không khôi phục spawn budget/tiến độ stage. UI cho đổi vocabulary từ pause; initial fetch về trễ cũng có thể gọi setter khi đã playing.
- **Vì sao là vấn đề:** mất các enemy chưa tiêu diệt; khi `spawnRemaining=0`, resume lập tức clear normal stage hoặc chuyển sang boss, bỏ qua wave. Nay còn cấp progression/Credits của Step 43/52.
- **Tái hiện:** một enemy còn sống, không còn pending spawns; pause → setVocabulary → resume → update; kết quả Stage Clear với 0 kills.
- **Sửa đề xuất:** áp dụng vocabulary ở title/next-stage boundary hoặc restart stage rõ ràng có confirm. Setter đổi danh sách từ không nên âm thầm xóa combat đang diễn ra. Chặn stale initial load bằng request token/context check như R26.

### R09 — Choice/Anomaly dialog không chặn global Escape

- **Severity:** High. **Chắc chắn:** cao — handler thật với DOM stub; cần native-dialog smoke test bổ sung. **Mới:** Steps 48–49.
- **Vị trí:** `src/main.ts:833–838`, cancel listeners; `:1522–1532`, pause/showModal; `:3063–3080`, modal guard; `:3143–3148`, Escape route; `src/Game.ts:1374–1378`, Escape toggle.
- **Vấn đề:** global keydown guard kiểm tra settings/vocabulary/shop… nhưng thiếu `rewardChoiceDialog` và `anomalyDialog`. Ngăn `cancel` của dialog không ngăn listener keydown chung gọi `game.handleKey('Escape')`.
- **Vì sao là vấn đề:** game resume khi người chơi chưa chọn xong, trong khi dialog vẫn mở. Enemy/timer tiếp tục; sau đó key gameplay cũng được xử lý phía sau dialog. Anomaly có thể mất pending state sau clear; UI và simulation không còn cùng một decision state.
- **Tái hiện:** gọi onRewardChoice/onAnomalyReady thật: phase paused, dialog open. Dispatch Escape tới registered keydown handler: phase playing, dialog vẫn open ở cả hai trường hợp. Handler còn `preventDefault()` trên Escape, nên cancel-default không phải cơ chế đáng tin để giữ game paused.
- **Sửa đề xuất:** thêm cả hai dialog vào input gate; tốt hơn dùng helper `isBlockingDialogOpen()` và guard resume/toggle khi decision pending. Test Escape, Space, phím skill và letter; không chỉ test event `cancel`.

### R10 — Same-origin vocabulary URL không khớp parent routing

- **Severity:** High trong cấu hình platform đã kiểm tra. **Chắc chắn:** cao đối với source/config; HTTP deployment đang chạy chưa được kiểm chứng. **Cũ:** Issue 1.
- **Vị trí child:** `src/vocabulary.ts:7–8,22–64`, same-origin `/vocabulary/`; `vite.config.ts:3–8`, không có proxy/shared-assets mapping.
- **Vị trí parent:** `infra/nginx/typing-game.local.dev.conf:126–145`, Space server; `infra/nginx/typing-game.local.play.conf:75–84`, Space static root; alias `/vocabulary/` chỉ nằm ở Portal server (`:7–23` của play config).
- **Vấn đề:** iframe chạy tại `https://space.typing-game.local`, nên relative fetch không tới Portal origin. Space dev proxy toàn path sang Vite; Space play fallback sang child index.html, không map shared vocabulary.
- **Vì sao là vấn đề:** Class/shared vocabulary không tải được theo contract; initial load rơi về bundled fallback. SPA có thể trả HTML status 200, vẫn fail JSON parse. Không khẳng định custom deployment có alias ngoài repo cũng bị lỗi.
- **Tái hiện cần browser/server:** mở Space origin, kiểm tra `/vocabulary/index.json` và một level file phải là JSON đúng; đối chiếu dev lẫn play.
- **Sửa đề xuất:** thêm mapping trực tiếp ở Space server hoặc configurable shared origin/proxy thích hợp. Không sửa source các game khác. Thêm HTTP smoke test cho contract; đừng coi fallback 10 từ là shared vocabulary đã hoạt động.

### R11 — Hidden discovery không có catch-up cho save cũ gần Stage 1000

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Mới:** Step 50A + Step 54 integration.
- **Vị trí:** `src/persistence/player-save.ts:424–439`, v11 migration; `src/discovery/hidden-content.ts:294–368`, `lastRollStage` gate; `src/shops/special-shop.ts:72–80`, shop unlock contract.
- **Vấn đề:** save v11 migrate với empty discovery; roll lần đầu chỉ xử lý stage đang mở, không các stage đã vượt qua. Sau khi roll Stage 1000, mọi stage hợp lệ đều `<=lastRollStage`, không còn cách tăng drought/discover nữa.
- **Vì sao là vấn đề:** người chơi cũ ở cuối Campaign có thể vĩnh viễn thiếu Black Market/Event Shop và hidden contracts dù replay toàn Campaign. Hard guarantee không giúp nếu không còn eligible stage roll. Đây không phải yêu cầu phải implement hidden boss tương lai.
- **Tái hiện:** migrate v11 đã clear Stage 1000; roll stage 1000 với RNG 0.999 cho mọi family: 0 discovery. Sau đó thử mọi stage 1–1000 kể cả RNG=0/Luck cao đều `rolled=false`. Nếu lần đầu may mắn cũng chỉ discover tối đa một family.
- **Sửa đề xuất:** migration catch-up dựa trên progress, hoặc một nguồn discovery post-Campaign có anti-farming rõ ràng. Test old saves tại 950/999/1000 và import từ trước Step 50A. Không đơn giản bỏ replay guard vì sẽ phá contract chống farm.

### R12 — Level/Mastery mới không đi vào stats khi chơi liên tục

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Mới:** Step 43.
- **Vị trí:** `src/main.ts:1440–1453`, progression award; `:1802–1820`, effective-stat application; `:2286–2301`, startSelectedStage; `src/Game.ts:440–444`, same-character no-op.
- **Vấn đề:** sau award chỉ thay `characters`; Next gọi `setCharacter()` cùng ID và `startStage()`, không gọi lại `applyEquipmentStats()`.
- **Vì sao là vấn đề:** UI/save ghi level/mastery mới nhưng combat vẫn dùng stats cũ cho tới khi load lại hoặc một action khác refresh stats. Có thể tích lũy lệch qua nhiều stage liên tục.
- **Tái hiện:** handler thật tăng Vanguard từ level 1 lên 2; Hull trước và ở stage tiếp theo vẫn 118. Gọi refresh stats mới thành 118.6.
- **Sửa đề xuất:** build/apply effective stats tại entry point bắt đầu mỗi stage, từ snapshot character/equipment/talent/synergy hiện hành. Tránh refresh tùy tiện trong callback clear nếu setter còn reset result stats. Test level/mastery-up → Next, không cần mở menu hay reload.

### R13 — EMP không xóa Jammed khỏi generic status state

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Regression mới:** Step 55.
- **Vị trí:** `src/Game.ts:859–878`, `activateEmpPulse()`; `:1195–1198`, status/timer bridge; `:1508–1515`, tick + restore interference; `:2128–2146`, Jammer application.
- **Vấn đề:** EMP Burst chung và Volt EMP vẫn chỉ đặt `interferenceTimer=0`; Jammed còn trong `statusState`. Tick tiếp theo tính lại timer từ Jammed.
- **Vì sao là vấn đề:** effect giải interference từng có trước status engine không còn bền qua một frame; HUD cũng có thể vẫn báo Jammed. Đây là lỗi do hai nguồn state, không phải yêu cầu phải chuyển mọi timer sang engine ngay.
- **Tái hiện:** Jammed 4s + target hợp lệ; Volt EMP trả success; interference ngay sau cast bằng 0, sau `update(0.01)` bằng 3.99s.
- **Sửa đề xuất:** remove status Jammed qua API chung, để timer chỉ là derived state. Quyết định rõ EMP chỉ xóa Jammed hay toàn negative; không tự buff nó bằng cách cleanse tất cả. **Cleanse và Thunder Grid đã gọi generic cleanse đúng**, đã có positive probe; không gộp chúng vào lỗi này.

### R14 — Event Shop bán item không dùng được

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Mới:** Step 54 đưa registry-only items ra economy.
- **Vị trí:** `src/shops/special-shop.ts:63–70,96–121`, EVENT_ITEMS/offers; `src/items/registry.ts:62–115`, metadata `combatUsable: true`; `src/Game.ts:1117–1125`, chỉ chấp nhận recovery item; `src/main.ts:1158`, UI sử dụng `RecoveryItemId`.
- **Vấn đề:** shop bán Nova Bomb/EMP Charge/Time Crystal/Word Bomb/Supply Beacon/Lucky Dice, nhưng không có dispatch/gameplay/UI sử dụng các item này. Game trả false cho tất cả ID ngoài ba recovery items.
- **Vì sao là vấn đề:** người chơi mất Credits hợp lệ để đổi lấy item không có công dụng hiện tại, trong khi mô tả hứa tác dụng và metadata đánh dấu combat usable. Trước khi có shop, registry cho tương lai không tự nó là bug; bán nó như usable mới tạo integration defect.
- **Tái hiện:** các offer Event Shop tại Stage 50 mua thành công, trừ 92 hoặc 125 Credits; gọi `game.useConsumable(itemId)` khi playing luôn false.
- **Sửa đề xuất:** tạm ẩn/disable offer chưa implement và giải thích rõ, hoặc implement đường dùng theo scope được phê duyệt. Thêm test “every purchasable combat item has a usable runtime path”, không chỉ test transaction và known ID.

### R15 — Boss chiếm input trước neutral target chưa bắt đầu

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Mới:** Steps 45–49.
- **Vị trí:** `src/Game.ts:1399–1463`, input order; `:1753–1770`, spawnBoss giữ các neutral entities; `:1875–2005`, neutral lifecycle.
- **Vấn đề:** boss spawn khi wave hết nhưng không clear Supply/Treasure/Choice/Anomaly còn tồn tại. Input cho target đã typed được xét trước boss, nhưng target có `typed=0` chỉ được xét sau unconditional boss branch.
- **Vì sao là vấn đề:** neutral target vẫn hiện và còn lifetime nhưng người chơi không thể bắt đầu gõ; key của nó bị xử lý như boss miss. Riêng target đã gõ một phần lại tiếp tục được, tạo hành vi khó hiểu.
- **Tái hiện:** Supply `apple` chưa gõ còn sống; boss `testing` xuất hiện; nhấn `a`: Supply typed vẫn 0, misses tăng 1.
- **Sửa đề xuất:** đưa acquisition của neutral trước boss theo policy xung đột từ/chữ rõ ràng, hoặc chủ động kết thúc/ẩn neutral khi boss spawn. Không để render một target có vẻ tương tác được nhưng input không thể đến nó.

### R16 — Stage modifiers không đi qua tất cả entity creation paths

- **Severity:** Medium. **Chắc chắn:** cao về hành vi code; **trung bình về phạm vi thiết kế**, cần xác nhận nếu muốn miễn trừ summoned enemies/boss volleys. **Mới:** Step 51.
- **Vị trí:** `src/events/stage-scheduler.ts:40–85`, mô tả/effect; `src/Game.ts:2033–2079`, main spawn; `:2198–2238`, carrier child; `:2870–2910`, split fragments; `:1779–1834`, boss attack.
- **Vấn đề:** main-spawn enemy nhận speed/layer modifiers; carrier children và split fragments hard-code một layer, tính speed không có stage multiplier. Normal projectile path có storm multiplier; boss cadence/speed không có.
- **Vì sao là vấn đề:** HUD mô tả “Hostile ships … 18% faster”, “Standard enemies gain one additional typing layer”, “Hostile projectile pressure … 25%”, nhưng cùng một stage các đường spawn khác bỏ qua. Bản thân scheduler helper vẫn đúng; thiếu ở consumer integration.
- **Tái hiện:** cố định RNG; carrier Scout có speed 56.9032371 cả trước/sau bật 1.18 và vẫn 1 layer khi extra layers=1. Boss projectile vy giữ 190.518632 khi multiplier đổi 1→1.25. Source cũng không đưa storm vào boss interval.
- **Sửa đề xuất:** dùng helper nhỏ áp dụng stage modifiers ở các spawn/attack path phù hợp. Nếu exclusions là intentional, ghi rõ và thu hẹp HUD/spec thay vì áp modifier đại trà. Test từng entity family, không chỉ `combineStageEventModifiers()`.

### R17 — `effect-not-needed` không phản ánh effect thực sự

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 9.
- **Vị trí:** `src/Game.ts:518–573`, skill preflight; `:859–885`, EMP; `:939–960`, Chain; `:1080–1100`, Meteor; `src/skills/offensive.ts:58–72`, capped advance.
- **Vấn đề:** EMP coi mọi enemy là hữu ích dù Scout có `actionCooldown=null`, không projectile/boss. Ngược lại, interference-only bị chặn. Chain/Meteor chỉ kiểm tra tồn tại enemy, không kiểm tra enemy có còn layer/progress để thay đổi.
- **Vì sao là vấn đề:** mất Energy/cooldown/charges cho cast không tác động gameplay. Khác R13: đây là eligibility/no-op, không phải clear status rồi bị phục hồi.
- **Tái hiện:** Volt EMP vào lone inert Scout: Energy 70, cooldown 12s, enemy không đổi movement/action. Enemy `testing` đã typed 6, một layer: Chain thành công nhưng vẫn typed 6/Energy 62; Meteor vẫn typed 6/Energy 58.
- **Sửa đề xuất:** tính danh sách effect hữu ích trước khi consume; preflight và execution dùng cùng predicate/plan. Thêm one-letter, all-at-cap, layered enemy, Jammed-only, projectile-only và boss-only cases. Sau R13 sửa, Jammed-only nên được xét theo policy EMP.

### R18 — Word-completion pipeline bị bỏ qua ở terminal/neutral paths

- **Severity:** Medium. **Chắc chắn:** cao với lethal-boss-word; cao về neutral behavior nhưng **trung bình về policy passive trên neutral**. **Cũ:** Issue 17, có thêm integration case mới.
- **Vị trí:** `src/Game.ts:2356–2365`, boss death return trước completion; `:2536–2557`, Supply completion; `:2590–2601,2631–2641,2673–2687`, rare completions; `:2990–3061`, character word/perfect-word passives.
- **Vấn đề:** khi đúng chữ cuối cũng gây lethal per-key damage, boss path return trước learning/word-complete/passives. Các neutral paths gọi learning hook nhưng không gọi word-complete/perfect-word passives của character.
- **Vì sao là vấn đề:** một từ thực sự đã gõ xong không được reveal VI/IPA/pronunciation nếu là lethal boss key, đồng thời mất Volt Energy/perfect-word rewards. Neutral long words có learning nhưng không có Volt long-word benefit như normal/boss words; cần xác nhận chúng có chủ ý bị miễn không.
- **Tái hiện:** boss `testing`, typed 6, HP 1; final `g` clear nhưng 0 word hook, Volt Energy vẫn 30. Supply `testing`, reward Shield, typed 6: final `g` có learning event, Energy vẫn 30.
- **Sửa đề xuất:** xử lý actual word completion exactly-once trước terminal return; không reveal khi boss chết giữa một từ chưa xong. Gom helper completion đủ nhỏ, truyền loại target/perfect flag và quy tắc eligibility rõ ràng. Nếu neutral được hưởng perfect-word effects, cần track miss cho chúng; không tự suy ra perfect chỉ từ streak hiện tại.

### R19 — Frenzy chỉ giảm action interval đầu tiên

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 16.
- **Vị trí:** `src/enemies/elite.ts`, `applyEliteModifiers()`; `src/Game.ts:2050–2070`, initial modified cooldown; `:1665–1687`, recurring cooldown reset.
- **Vấn đề:** reset action cooldown lấy base interval/pressure, không áp lại Frenzy multiplier.
- **Vì sao là vấn đề:** elite modifier mất phần hành vi action-rate sau một lần bắn/action, trái với effect liên tục mà enemy vẫn mang.
- **Tái hiện:** Frenzy Destroyer có expected interval 2.753286s; sau action đầu reset thành 3.824009s.
- **Sửa đề xuất:** một helper tính recurring interval từ kind/difficulty/stage modifiers/elite modifiers, dùng cho spawn và reset. Không reuse nguyên initial cooldown có random offset nếu offset chỉ dành cho spawn.

### R20 — Thunder Grid delay bị phase transition ghi đè

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 18.
- **Vị trí:** `src/Game.ts:3219–3223`, thêm `VOLT_EMP_DELAY` trước phase update; `:2418–2430`, phase transition gán actionCooldown mới.
- **Vấn đề:** Thunder Grid cộng delay 3.5s, rồi `updateBossPhase()` reset timer về normal interval nếu damage vượt threshold.
- **Vì sao là vấn đề:** cùng skill nhưng crowd-control biến mất đúng lúc boss chuyển phase; boss có thể bắn sớm hơn dự kiến.
- **Tái hiện:** major boss chuyển sang phase 2 bởi Thunder Grid: cooldown 2.710679s, không còn +3.5s suppression.
- **Sửa đề xuất:** áp action delay sau phase transition hoặc lưu suppression riêng rồi phase timer tôn trọng nó. Test damage ngay trên/dưới phase threshold và lethal damage.

### R21 — Boss phase 2 mất khả năng bắn trúng player theo viewport

- **Severity:** Medium. **Chắc chắn:** cao — analytic và runtime probe. **Cũ:** Issue 23.
- **Vị trí:** `src/boss/model.ts:134–145`, projectile count; `src/Game.ts:1801–1834`, fan offsets ±0.08 rad; `:1696–1712`, collision; `:3915–3920`, boss position.
- **Vấn đề:** phase 2 của Boss/Major Boss có hai viên đối xứng, không viên giữa. Boss/player cùng x, player đứng yên; ở arena cao, cả hai trajectory đều nằm ngoài hit radius.
- **Vì sao là vấn đề:** chuyển phase 1→2 có thể loại bỏ toàn bộ direct projectile threat, không chỉ giảm accuracy của vài viên. Viewport ngắn lại ăn cả hai viên.
- **Tái hiện:** volley thật, không gõ/defense, update 60 Hz:

| Arena height | Phase 1 impacts | Phase 2 impacts |
| --- | ---: | ---: |
| 600 | 1 | 2 |
| 720 | 1 | 0 |
| 900 | 1 | 0 |
| 1080 | 1 | 0 |

- **Sửa đề xuất:** giữ ít nhất một trajectory có thể trúng player hoặc chọn spread/target points theo arena geometry. Số viên cụ thể là balance decision; không bắt buộc mọi viên phải hit. Test actual trajectory/collision, không chỉ projectile count.

### R22 — Nút Replay dùng selectedStage đã được advance

- **Severity:** Medium. **Chắc chắn:** cao — handler thật. **Cũ:** Issue 15.
- **Vị trí:** `src/campaign/progress.ts:84–112`, `recordStageClear()` cập nhật selectedStage; `src/main.ts:2286–2301`, start helper; `:2836`, clearRetryButton.
- **Vấn đề:** Replay và Next dùng cùng startSelectedStage; clear vừa đổi campaign selection sang stage sau.
- **Vì sao là vấn đề:** nút “Replay stage” không làm điều nó ghi; người chơi không retry lại stage vừa clear để luyện/gặp boss đó.
- **Tái hiện:** clear Stage 1 → selectedStage=2 → click `clearRetryButton` → game stage=2.
- **Sửa đề xuất:** lưu stage của result/run và truyền rõ vào Replay. Next/Continue mới theo campaign selection. Test cả replay old stage thấp hơn highest unlocked và Stage 1000.

### R23 — WPM bao gồm thời gian pause và suy nghĩ chọn reward

- **Severity:** Medium. **Chắc chắn:** cao — source. **Cũ:** Issue 12; Step 43/48/49 tăng impact.
- **Vị trí:** `src/main.ts:809,1419–1424,2299`, wall-clock timing; `:1441–1447`, WPM đi vào character award; `src/characters/progression.ts:53–70`, XP formula.
- **Vấn đề:** elapsed time là `performance.now() - stageStartedAt`, không trừ pause/dialog. Simulation timers pause đúng nhưng metric timer không theo simulation.
- **Vì sao là vấn đề:** cùng lượng typing/active play time nhưng pause 5 phút cho WPM thấp hơn đáng kể, ghi best metric sai và ít XP hơn. Choice/Anomaly là pause do game chủ động yêu cầu, không phải chơi chậm.
- **Tái hiện:** 300 hits trong 60s active tương ứng 60 WPM; thêm 300s pause, công thức lưu còn 10 WPM.
- **Sửa đề xuất:** tích lũy elapsed active-stage time từ playing clock, hoặc theo dõi đầy đủ pause intervals. Test manual pause, reward/anomaly dialog và trường hợp tab hidden theo policy riêng; không trộn thời gian đọc menu vào typing performance.

### R24 — Adaptive/fixed difficulty chỉ tồn tại ở helper

- **Severity:** Medium. **Chắc chắn:** cao — source. **Cũ:** Issue 5; requirement-integration gap, không phải crash.
- **Vị trí:** `src/main.ts:2286–2296`, difficulty call; `src/campaign/difficulty.ts`, model; `docs/PROJECT_CONTEXT.md:2686–2687` (Step 15A, tìm theo heading nếu số dòng thay đổi), cùng Current status.
- **Vấn đề:** live start luôn truyền `mode: 'normal'`, `recentWpm: 60`, `recentAccuracy: 96`. Không có selection/history được nối vào call này.
- **Vì sao là vấn đề:** yêu cầu fixed modes + adaptive smoothed performance được mô tả đã có, nhưng người chơi không trải nghiệm; tests model trend không chứng minh integration.
- **Sửa đề xuất:** thêm selection/persistence phù hợp và recent-performance input có smoothing/clamps, hoặc sửa status để thành pending nếu chưa giao tính năng này. Không tự giả định toàn bộ combat phải dùng seeded RNG để sửa issue này.

### R25 — Vocabulary có thể normalize thành chuỗi không gõ được

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 6.
- **Vị trí:** `src/vocabulary.ts:10–19,67–98`, validation/custom parser; `src/logic.ts:11–13`, `typingText()`; `src/Game.ts:2107–2125`, fallback pool.
- **Vấn đề:** kiểm tra non-empty English string nhưng không kiểm tra `typingText(en).length > 0`; `123`, punctuation-only hoặc non-Latin-only vẫn được nhận.
- **Vì sao là vấn đề:** không có chữ a–z để acquire/complete. Normal enemy có thể rơi xuống gây damage; boss hoặc neutral cũng có thể nhận invalid fallback word. Filter khi spawn không đủ vì candidate rỗng lại fallback về nguyên vocabulary.
- **Tái hiện:** `parseCustomVocabulary('123 | numbers')` trả một entry; `typingText(entry.en)` là empty string.
- **Sửa đề xuất:** dùng cùng canonical typing validator ở Class/Custom boundary; reject/report invalid rows trước apply. Nếu filter làm không còn target hợp lệ, giữ list cũ hoặc fallback hợp lệ rõ ràng. Không cần cấm phrase/punctuation có chữ cái.

### R26 — Vocabulary metadata và words không được commit nhất quán

- **Severity:** Medium. **Chắc chắn:** cao — hai nhánh tái hiện. **Cũ:** Issue 21.
- **Vị trí:** `src/main.ts:2781–2812`, applyClassLevel; `:2814–2830`, initial async load; `:2975–2993`, Custom handler.
- **Vấn đề A:** đổi sourceState trước localStorage write và trước game.setVocabulary. Nếu write fail, metadata mới nhưng words cũ.
- **Vấn đề B:** initial/Class request không có generation guard. Response cũ có thể overwrite Custom vừa apply, dù sourceState và saved custom text vẫn là Custom.
- **Vì sao là vấn đề:** gameplay dùng sai list; difficulty dùng vocabulary level khác actual words; asynchronous setter còn kích hoạt R08 nếu run đã bắt đầu.
- **Tái hiện:** source-key write fail khi apply Class 2: source level thành 2, array vocabulary giữ nguyên. Delay Class fetch, apply Custom `apple`, rồi release response `testing`: source vẫn Custom, game word thành `testing`.
- **Sửa đề xuất:** prepare/validate trước, publish metadata và vocabulary như một state transition sau save hoặc có rollback đầy đủ. Dùng request token/abort để obsolete response không commit. Custom handler cũng cần bắt storage failure có feedback.

### R27 — Valid empty backup bị biến thành starter equipment/spells

- **Severity:** Medium. **Chắc chắn:** cao — tái hiện. **Cũ:** Issue 20.
- **Vị trí:** `src/equipment/loadout.ts:222–246,378`, sanitizer/validator; `src/skills/support-loadout.ts:21–45,75`, sanitizer/validator; `src/persistence/backup.ts`, validate rồi migrate/create save.
- **Vấn đề:** validator chấp nhận `items=[]` với null loadout và `unlocked=[]` với empty spell slots, nhưng sanitizer coi zero length là thiếu dữ liệu rồi cấp starter collection.
- **Vì sao là vấn đề:** import được báo valid nhưng không giữ nguyên state; có thể grant ngoài ý định và tự trang bị starter. Đây là mismatch của accepted format, không khẳng định UI hiện có action bán hết equipment.
- **Tái hiện:** valid current-v13 empty backup parse success nhưng kết quả có 8 equipment và 4 unlocked support spells.
- **Sửa đề xuất:** phân biệt missing/malformed/explicit empty; giữ empty nếu format cho phép, hoặc reject có thông báo rõ nếu invariant bắt buộc non-empty. Starter grants chỉ dành cho migration/initialization phù hợp. Thêm round-trip invariant cho mọi accepted current save.

### R28 — Stagger HUD ghi DOM ở frame rate

- **Severity:** Low. **Chắc chắn:** cao về redundant work; chưa đo FPS impact. **Cũ:** Issue 13.
- **Vị trí:** `src/Game.ts:1786–1789`, updateBoss stagger branch; `src/main.ts:1259–1281`, renderBoss.
- **Vấn đề:** mỗi tick stagger đều emit boss HUD rồi render name/HP/width, trong khi HUD chỉ biểu diễn boolean stagger, không hiển thị remaining time.
- **Vì sao là vấn đề:** DOM writes/allocation không cần thiết trên combat hot path; có thể tăng chi phí khi kết hợp VFX. Không có bằng chứng để nâng thành High hay tuyên bố đã gây giật.
- **Tái hiện:** 30 update khi stagger đang active → 30 non-null boss HUD emissions.
- **Sửa đề xuất:** emit khi state hiển thị thay đổi (bao gồm stagger hết), hoặc throttle/cache view model. Giữ Canvas countdown trong simulation, không cần full UI framework.

### R29 — Hai shop purchase reducers sao chép gần nguyên transaction

- **Severity:** Low. **Chắc chắn:** cao — source; maintainability, chưa xác định failure với offer hiện tại. **Mới:** Steps 52/54.
- **Vị trí:** `src/shops/normal-shop.ts:99–161`, `buyNormalShopOffer()`; `src/shops/special-shop.ts:135–203`, `buySpecialShopOffer()`.
- **Vấn đề:** cùng kiểm tra Credits/full stack/duplicate ID, add equipment/item và payment, nhưng được chép thành hai implementations. Step 54 nói reuse transaction path, thực tế chỉ reuse các leaf helpers.
- **Vì sao là vấn đề:** sửa atomicity/validation ở một shop dễ bỏ sót shop còn lại. Các field/type mới sẽ phải cập nhật nhiều nơi, giống failure mode đã xảy ra với Credits forwarding ở R01. Không gọi typed registry offers hiện tại là lỗ hổng thanh toán chỉ vì public helper có thể bị gọi bằng input giả ngoài type contract.
- **Sửa đề xuất:** gom purchase reducer dùng chung cho union item/equipment nhỏ; giữ offer generation, unlock và pricing riêng. Không dựng economy/service abstraction tổng quát cho ba trường hợp đơn giản. Parameterize chung các transaction tests.

### R30 — Documentation status mâu thuẫn với implementation mới

- **Severity:** Low. **Chắc chắn:** cao — source/docs.
- **Vị trí:** `docs/PROJECT_CONTEXT.md:3191–3247`, Current status; Step 42 phần đầu/cuối; `README.md:79–91`, Next implementation checkpoint.
- **Vấn đề:** Current status vẫn ghi Next Step 39 và PlayerSave v7; README vẫn nói chuẩn bị Step 39/40/41/42. Code hiện tại có tất cả milestone character kits, progression/talents, drops/events, shops/status/synergy và PlayerSave v13. Các Step 43–56 phía trên đã ghi implemented.
- **Vì sao là vấn đề:** AI/developer đọc nhanh dễ implement lặp hệ thống, chọn sai schema hay review nhầm checkpoint. Đây chính là rủi ro chuyển report cũ sang người review mới.
- **Sửa đề xuất:** cập nhật một checkpoint summary có commit/schema/scope thực tế và link tới từng step. Không chỉ thay “implemented” bằng “complete/clean”: các issue ở report này vẫn cần xử lý. Review này không tự sửa tài liệu nguồn.

## 4. Docs / Code mismatches và các kết luận phải điều chỉnh

### Phần đã tiến triển thật sự

- Không còn đúng khi nói Fortune/Arsenal/Oracle/Bastion/Reaper/Celestial/Zenith chưa được implement: history/source mới đã thêm kits cho cả 11 character. Các kit là delivery slice hiện tại, không phải mọi ý tưởng trong full vision đều đã xong.
- Character-specific stat bonuses hiện đã tồn tại trong `src/characters/stats.ts`. Không giữ nhận xét cũ “chưa có character stat differentiation” như một defect ở checkpoint này.
- `PlayerSave` hiện v13, không phải v8 của report trước và không phải v7 trong stale status docs.
- Stage-event scheduler đã dùng seeded RNG; không nói “seed hoàn toàn không được dùng”. Whole combat vẫn có `Math.random()`, nhưng chỉ riêng điều đó chưa chứng minh vi phạm scope determinism của Step 51. Event selection còn nhận Luck; so sánh deterministic phải giữ cùng input.
- Step 50A là hidden **discovery contracts**, không phải cam kết đã implement hidden boss/weapon/mission runtime. Không đưa việc thiếu runtime tương lai vào danh sách bug.
- Step 55 chủ ý đăng ký các status IDs tương lai; không coi mọi status chưa có consumer là lỗi. Regression cụ thể là EMP ở R13.

### Các nghi vấn đã loại bỏ hoặc chưa đủ chắc để thành finding độc lập

1. **Support change không refresh synergy:** đã loại bỏ. `src/main.ts:2884–2902` thực sự gọi cả `applySupportSpells()` và `applyEquipmentStats()`, rồi render. Không yêu cầu sửa một lỗi không tồn tại.
2. **Synergy chỉ nằm ở metadata, không có effect:** không đúng. Probe xác nhận Arc Circuit tác động 6 targets; generic Mark với Oracle Lens 11s; Sanctuary Matrix barrier 8s, Shield recovery 42%. Resolver yêu cầu equipment đang equipped, không chỉ owned.
3. **Thunder Grid không cleanse generic status:** đã loại bỏ. Nhánh ultimate gọi `cleanseNegativeStatuses()`; EMP active mới là nhánh bỏ sót.
4. **Oracle Lens trên active có cùng tên:** registry ghi trigger ID `mark-of-weakness` (generic 8→11s), không phải `oracle-mark-of-weakness` (10s). Hai tên hiển thị giống nhau có thể gây nhầm. Cần làm rõ UX/spec nếu muốn synergy áp cả active; chưa tự kết luận active 10s là bug.
5. **Locked enemy chiếm input trước projectile:** tái hiện nhưng chưa được kết luận sai policy. Thay priority vô điều kiện có thể phá target-lock contract. Khác R15: target mới vẫn hiển thị nhưng không còn đường acquire sau boss transition.
6. **Skill/Reflect damage xuyên boss shield; shield tạo rồi bị phá bởi chính last-key crossing:** là behavior đã quan sát, chưa có policy đủ rõ để yêu cầu mọi damage source bị block. Không giữ các kết luận mạnh của lần review đầu.
7. **Bastion recycle trên typed projectile:** `destroyProjectile()` không gọi recycler; recycler nằm ở guardian-block path. Mô tả “destroyed projectiles” khá rộng; cần xác nhận có bao gồm typed/reflect kills hay chỉ guardian interception. Chưa đếm thêm bug dựa trên tên passive.
8. **Fortified mitigation trước/sau Barrier HP:** code áp generic incoming multiplier lên phần damage còn lại sau Barrier. Đây có thể là layer policy; chưa tự khẳng định sai nếu chưa thống nhất mitigation order.
9. **Speech cancellation race:** `src/speech.ts:39–56` dùng chung pending counter. Fixture old-speak → stop → new-speak → old-error callback tạo signals `true,false,true,false` khi new utterance chưa xong. Cần xác minh callback ordering ở browser hỗ trợ; nếu có, dùng generation token. Đây là conditional risk, không cộng vào 30 finding.
10. **Choice generator ít hơn 3 options sau 30 retry trùng:** helper có thể trả dưới 3 với RNG degenerate. Với 8 equipment uniform, xác suất tự nhiên rất nhỏ; chưa ưu tiên thành issue độc lập. Có thể chọn không hoàn lại hoặc fill fallback khi thêm deterministic test.

### Mapping để AI khác đối chiếu report cũ

| Issue cũ ở `82b55d6` | Vị trí trong report này |
| --- | --- |
| 1 / 2 / 3 / 4 | R10 / R02 / R08 / R05 |
| 5 / 6 / 9 | R24 / R25 / R17 |
| 12 / 13 / 14 / 15 | R23 / R28 / R06 / R22 |
| 16 / 17 / 18 / 19 | R19 / R18 / R20 / R03 |
| 20 / 21 / 22 / 23 / 24 | R27 / R26 / R04 / R21 / R07 |
| 7 / 8 | Vẫn là policy observations, không khôi phục thành bug chắc chắn. |
| 10 / 11 | Không dùng lại kết luận cũ; character stats và seeded event scheduler đã thay đổi hiện trạng. |

Những finding chính mới so với report cũ: R01, R09, R11–R16. R18 bổ sung neutral-completion behavior; R29/R30 là maintainability/process. Không tính một nguyên nhân thành nhiều issue chỉ vì nó xuất hiện ở nhiều character/skill.

## 5. Architecture risks — cập nhật sau khi Step 42 đã có đủ kits

Tên section cũ “Architecture risks for future Step 42 characters” không còn đúng thời điểm: các character đó đã có code. Rủi ro hiện tại là bảo trì/integration khi mở rộng từ Step 56 trở đi.

- `Game.ts` khoảng 4.800 dòng, `main.ts` khoảng 3.200 dòng. Kích thước không tự nó là bug, nhưng side-effect bị phân tán: word completion, target selection, per-character skills, terminal state và DOM/persistence callbacks. R06/R07/R18 là hậu quả cụ thể đáng ưu tiên hơn việc chia file cho đẹp.
- Có hai ownership layers cho character/stats: persisted objects trong main và combat snapshot trong Game. Cần một entry point chuẩn bị stage snapshot, không một generic state framework mới. R05/R12 là các invariant đang bị phá.
- Timers cũ và generic status engine đang cùng tồn tại. Giữ registry tương lai là hợp lý, nhưng effect đã migrate như Jammed phải có một source of truth; không để setter trực tiếp ở nhiều skill.
- Ba cửa hàng nên dùng chung transaction nhỏ; không nên thêm currency/material/durability để “giải quyết” vấn đề sửa chữa không có trong current scope.
- Persistence dùng nhiều positional parameters và nhiều mirror paths. R01 là bằng chứng field propagation dễ bị bỏ sót. Snapshot object/revision + focused recovery tests có lợi hơn rewrite storage toàn bộ.
- AutosaveQueue serialize writer tốt, nhưng app transaction, terminal transition và user action gating là responsibility khác; không coi một queue là đã xử lý toàn bộ race.
- Drop/shop làm equipment inventory tăng không có giới hạn rõ; render shop/equipment duyệt toàn collection và save cả snapshot. Đây là khả năng tăng latency về lâu dài, **chưa profile nên chưa kết luận performance bug**. Có thể đo ở vài trăm/vài nghìn items trước khi chọn pagination/salvage.
- Pure helpers/tests hiện là nền tốt. Nên thêm một lớp integration test nhỏ gọi Game và UI coordinators, không lập tức đưa vào ECS/event-bus/plugin architecture.

## 6. Things that are already clean / correct

- TypeScript strict + noUncheckedIndexedAccess chạy qua; không tìm thấy compile-time error ở checkpoint này. Runtime bugs về order/ownership không được type system phát hiện.
- Skill engine có cooldown/charges/per-stage quota và preflight typing conditions; timer chỉ được tick từ playing loop. Ordinary pause/reset positive controls đã qua; không khẳng định mọi pause path đúng vì R09.
- Normal word passives mẫu của Vanguard/Aegis/Volt/Wraith trigger một lần; stage start reset các timer được kiểm tra. Không có bằng chứng để nói mọi passive bị double-trigger.
- All-character registry, unlock synchronization từ cleared milestones và independent Level/Mastery/Talents tồn tại. Không invent một milestone thiếu chỉ từ README cũ.
- Progression/talent caps và validation được test; talent bonuses/character bonuses/synergy bonuses có layer riêng trong stat pipeline. R12 là thiếu refresh ở consumer, không phải arithmetic helper sai.
- Hidden state validator giới hạn known IDs/drought; codex không reveal metadata của undiscovered entries; at-most-one discovery và replay guard có thật. R11 là boundary của migration/progression cap.
- Stage scheduler deterministic cho cùng stage seed và Luck, unique events, modifier-slot cap; không trộn rare-event pity vào event pool này.
- Luck pity family độc lập, có chance caps và không tích lũy trước introduction khi base chance=0. Equipment rarity và Salvage frequency có đường tác động riêng.
- Enemy/Boss/Treasure drops thêm inventory không tự equip; các callback quan trọng đi qua autosave queue. Không đưa arbitrary hidden-contract equipment vào shop trước runtime của nó.
- Với các offer hợp lệ đang generate, normal/special reducers không charge khi insufficient/full/duplicate ID; service upgrade không charge missing/max/insufficient. Repair pack kiểm tra cả hai stack trước khi trừ tiền.
- Anomaly risk có min Hull 1, reward table khác nhau, pending flag ngăn resolver dùng lại bình thường. Vấn đề modal input cần xử lý riêng, không phủ nhận helper này.
- Cleanse giữ positive statuses, remove negative; Ward resistance bounded; timers generic stage-local; positive probes xác nhận Cleanse/Thunder Grid xóa Jammed bền.
- Synergy cần đúng character và equipped item; Sanctuary Matrix cần Sanctuary trong support loadout. Character/equipment/support UI handlers có stat refresh; R12 chỉ ra một lifecycle khác bị bỏ sót.
- Unsupported numeric save version bị từ chối; backup validators kiểm tra nhiều field/range/reference tốt. Không đề xuất bỏ validation để “khắc phục” migration.
- Canvas có delta clamp, DPR cap, particle cap theo quality, cleanup lasers/particles/projectiles; chưa có đo đạc chứng minh cần pooling ngay.

## 7. Test gaps và regression matrix cần bổ sung

Các probes trong review chỉ là evidence, **chưa được cài thành regression tests của repository**. Bảng sau là yêu cầu test đề xuất, không phải code đã sửa.

| Area | Case tối thiểu | Finding liên quan |
| --- | --- | --- |
| Recovery schema v13 | Credits và mọi field round-trip qua localStorage-only, IDB read fail, IDB empty | R01 |
| Save authority | Equal Campaign rank nhưng inventory/Credits/pity khác; explicit older restore; malformed IDB + good recovery | R02 |
| Commit semantics | Recovery write success rồi legacy write fail; UI outcome khớp persisted record | R03 |
| Import orchestration | A fail/B success và ngược lại; pending import + start/close; import while paused bị reject hoặc reset đúng policy | R04–R05 |
| Target acquisition | Chain/Meteor/Thunder/Reaper/Arsenal/Oracle/Celestial advance unlocked targets; nhiều assisted targets và một current lock | R06 |
| Terminal states | Reflect kills boss + còn projectile collision cùng tick; reward/clear/gameover exactly once | R07 |
| Vocabulary lifecycle | Apply paused, initial fetch late sau start, Custom thay Class request, source write failure | R08/R26 |
| Blocking dialogs | Escape/Space/letters/skill keys không resume/simulate khi Choice/Anomaly pending; native browser smoke test | R09 |
| Shared assets | HTTP index + một level qua Space dev/play origins | R10 |
| Discovery migration | v11 high-stage saves tại 950/999/1000, không còn stage mới nhưng vẫn có unlock policy hợp lệ | R11 |
| Progression integration | Level/Mastery tăng rồi Next, stats/caps/HUD khớp snapshot mới | R12 |
| Status integration | Jammer → generic EMP/Volt EMP/Cleanse/Thunder → update; no Jammed resurrection; pause freezes duration | R13 |
| Economy → gameplay | Mọi item offer bán được có use route hoặc được đánh dấu unavailable | R14 |
| Neutral → boss | Target chưa bắt đầu và đang typed tồn tại khi boss spawn; input/render consistency | R15 |
| Stage modifiers | Normal/carrier child/split fragment/elite/boss/volatile attacks theo policy phạm vi event | R16 |
| Skill effects | All targets at cap, one-letter, no-action Scout, Jammed-only; no resource consumption for no-op | R17 |
| Learning/passives | Lethal final boss letter vs lethal mid-word; neutral completion eligibility và perfect tracking | R18 |
| Enemy/boss cadence | Frenzy second/third action; Thunder threshold crossings | R19–R20 |
| Geometry | Volley collision ở height 600/720/900/1080, phase 1/2/3, player stationary | R21 |
| Campaign UI | Replay khác Next, replay earlier unlocked stage, final stage | R22 |
| Performance metric | Active seconds excludes manual pause/choice/anomaly; persisted WPM và awarded XP đúng | R23 |
| Difficulty UI | Mode/history thực sự đến difficultyFor, fair-reaction clamps và smoothing | R24 |
| Input validation | Zero-typeable entries; valid phrase/punctuation; empty resulting pool | R25 |
| Backup invariants | Mọi accepted current save round-trip, đặc biệt explicit empty collections | R27 |
| UI/performance | HUD emission count; equipment collection lớn; late-stage frame-time trên browser | R28 + observations |

### Evidence ledger rút gọn

- Target assistance: Chain/Thunder typed 2, Meteor typed 1; acquire vẫn null và 2 misses.
- Pause vocabulary: Stage Clear 0 kills.
- Paused import rollback: Barrier state 9/3/1 → 0/4/0.
- Recovery arbitration: kits 1 → 2; malformed IDB khiến kits 5 → 0.
- Fallback partial commit: rejected save nhưng reload highest stage 101.
- Concurrent import: memory 1, persisted 201.
- Credits recovery: serialized 999, loaded 0.
- Jammed: EMP immediate 0, next tick 3.99s.
- Progression: level 1 → 2, next-stage Hull vẫn 118; explicit stat rebuild 118.6.
- Old-save discovery: roll Stage 1000 không unlock, mọi subsequent stage 1–1000 bị gate.
- Event Shop: trả tiền 92/125 nhưng item runtime false.
- Choice/Anomaly: Escape chuyển paused → playing trong khi dialog còn open.
- Terminal collision: playing → stageclear → gameover trong một volley; clear Hull 1/final 0.
- Replay: clear 1, click replay bắt đầu 2.
- Late vocabulary: source Custom nhưng runtime word `testing` từ Class response cũ.
- Boss/skill/geometry, neutral passive và positive synergy/status controls được mô tả tại từng finding/section, không suy từ helper-only assertions.

## 8. Thứ tự sửa đề xuất — không phải authorization để tự sửa

1. **Data safety:** R01–R05. Sửa Credits forwarding ngay, nhưng cần test authority/commit/import boundary cùng nhau để không chỉ vá một triệu chứng.
2. **Combat correctness blockers:** R06–R09. Đảm bảo target có thể gõ tiếp, terminal state chỉ xảy ra một lần, vocabulary không xóa run và decision dialog thật sự chặn simulation/input.
3. **Playable environment:** R10; validate đúng Space origin trước khi tin playtest đang dùng shared vocabulary.
4. **New-step integration:** R11–R16, cùng R12/R23 ảnh hưởng progression. Đặc biệt không bán item chưa dùng được và không khóa old-save unlock chỉ vì hết Campaign.
5. **Các lỗi tái hiện còn lại:** R17–R27, ưu tiên boss/Replay trước polish.
6. **Maintainability/docs:** R28–R30 sau regression coverage; không rewrite lớn để sửa những invariant nhỏ.

Trước khi tiếp tục các step sau 56, nên có durable integration tests cho persistence failure paths, modal gating, assisted targets và terminal transitions. Không cần “implement lại” Fortune→Zenith: đã có kits, cần sửa integration và xác nhận những policy chưa rõ.

## 9. Final review summary

**Test status:** local 230/230 pass; 49 test files. **TypeScript:** pass. **Build status:** CI Test/Build pass ở đúng `ff1845a`; không chạy lại local Vite bundle trong lượt này. **Review status:** chưa clean, có High blockers.

Điểm mới đáng chú ý nhất là Credits bị mất qua recovery, Escape vượt qua forced reward/anomaly pause, Level/Mastery không refresh stats khi Next, EMP regression sau status migration, Event Shop bán item chưa dùng được và hidden discovery thiếu đường catch-up cho old save cuối Campaign. Các lỗi cũ về save authority/import transaction, assisted targeting và same-frame terminal transition vẫn tái hiện trên HEAD mới.

Đã loại bỏ những kết luận không còn đúng hoặc thiếu bằng chứng: character stats chưa có, toàn bộ seed không dùng, support change không refresh synergy, Thunder Grid không cleanse generic status, và việc coi mọi feature tương lai chưa có là bug hiện tại.

Report này là đánh giá có bằng chứng, không phải chứng nhận tuyệt đối “không còn thiếu sót”. Browser-native dialogs, actual IndexedDB/quota, live nginx assets, speech ordering và performance profiling vẫn cần QA riêng. **Không có fix nào được áp dụng; chỉ file report này được tạo.**
