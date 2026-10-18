# Claude rà soát thay đổi của Codex — 17/10/2026

> **Dành cho:** chủ dự án và Codex.
> **Phạm vi:**
> - ví máy chủ giai đoạn 1–3 và boss G01;
> - sửa voice, chống lặp từ, Admin Unlock all stages;
> - Vanguard Meshy: Medium/High, màn chính, Campaign/Recall, Duel, socket.
>
> **Cách làm:** ba agent chỉ đọc và chạy thử, không sửa code. Mỗi agent dựng lại lỗi bằng SQLite trong bộ nhớ, `fetch` giả hoặc Chrome thật. Claude tự đọc lại code của mọi lỗi quan trọng trước khi sửa.
> **Không** commit, push, deploy, reset save hay đổi dữ liệu. Không chạy `scripts/account-e2e.mjs` vào Worker 3016 của bản Play: script đó gửi thư có quà cho mọi tài khoản và cấm/bỏ cấm tài khoản thử.

## 1. Kết luận

- **Phần nền làm tốt:**
  - ghi có kiểm tra phiên bản (version) và `opId` chống trả hai lần;
  - nhận quà Daily Hub, hoàn tiền và tính Warp đúng;
  - tải và hủy model có chặn kết quả cũ, có đường dự phòng (fallback) khi lỗi;
  - socket tính đúng;
  - voice chỉ đọc từ mới nhất, không rò rỉ bộ hẹn giờ;
  - Unlock all stages đúng phía máy chủ, lượt xem trước (preview) không đụng ví hay save.
- **Lỗ hổng chính ở ví:** máy chủ tin số dư khởi tạo do game gửi lên. Máy chủ cũng tin phần chênh lệch số dư mà game báo là "thu nhập".
- **Claude đã sửa** các lỗi có cách sửa rõ ràng (mục 2). Các việc cần chọn chính sách hoặc sửa nhiều chỗ ghi ở mục 3, theo từng bước cho Codex.

## 2. Claude đã sửa (17/10)

| # | Lỗi | Sửa | Tệp |
|---|---|---|---|
| V-H2 | Bản lưu trên máy bị thay (dùng cloud save, khôi phục bản sao lưu, đổi tài khoản trên máy chung) nhưng sổ "đã báo" vẫn giữ. Phần chênh bị báo lại thành thu nhập, nên **cộng tiền hai lần** (đã dựng lại: 800 → 1.200). | Sổ "đã báo" lưu kèm `generation` của bản lưu. Khi bản lưu đổi hoặc ví của tài khoản khác đã ghi vào bản lưu, game lấy số dư máy chủ và không báo phần chênh. | `src/online/wallet-sync.ts`, `src/main.ts` (`saveGeneration`) |
| V-H1 (phía game) | Bấm "Sign out" tạo khách mới, và khách mới được khởi tạo ví bằng số dư của tài khoản cũ. | Bản lưu đã theo ví của tài khoản khác thì game gửi `seed: {}`. Ví mới bắt đầu như người chơi mới. | `src/online/wallet-sync.ts` |
| V-H3 | Thu nhập ngoài lượt bay (không phải sortie): vượt trần ngày vẫn trả 25% mãi. Đã dựng lại: 200 yêu cầu được 75.352 Credits, trong khi trần ngày là 6.600. | Có trần cứng: thu nhập báo lên vượt 2 lần trần ngày thì không trả nữa, tối đa 1,25 lần trần mỗi ngày. Lượt bay (sortie) giữ nguyên, vì đã bị Warp giới hạn. | `src/economy/wallet-rules.ts` (`EARN_OUTSIDE_HARD_CAPS`), `cloud/src/wallet.ts` |
| V-M1 | Nhận thưởng Daily Lessons cho bất kỳ ngày nào trong 90 ngày qua (đã dựng lại 180 lượt nhận). | Từ chối các ngày trước ngày mở ví. Thưởng của những ngày đó đã nằm trong số dư khởi tạo. | `cloud/src/wallet.ts` (`createdDay`) |
| V-M2 | Máy chủ trả `purchase-saved` hoặc `purchase-missing` (409) nhưng game coi là "thử lại sau", nên **khóa mua hàng và Deploy** trên máy đó mãi. | Coi hai mã này là kết thúc: xóa nhật ký, lấy số dư máy chủ. | `src/online/wallet-sync.ts` |
| V-M6 | Mở ví lỗi một lần (5xx, quá thời gian) thì chặn Campaign và cửa hàng tới khi tải lại trang. | Tự thử lại sau 5 giây, tăng gấp đôi mỗi lần, tối đa 2 phút. | `src/online/wallet-sync.ts` |
| 3D-H1 | Boss không đổi theo chất lượng. Low vẫn vẽ GLB, Medium vẫn giữ bản High (texture 2K). | Khóa tải gồm cả bậc chất lượng. Đổi chất lượng giữa trận: Low hủy model, Medium/High tải đúng bậc. | `src/Game.ts` (`loadBossRelief`, `refreshBossReliefQuality`) |
| 3D-H2 | GLB Vanguard đè lên ảnh tàu chính xác do Admin đăng hoặc đang xem trước. | Có ảnh Admin thì không vẽ GLB. | `src/characters/renderer.ts` |
| 3D-M3 | Duel: hai lần tải cùng tàu và cùng bậc chung một lời hứa (promise). Lần cũ hủy model, lần mới nhận model đã hủy, nên mất thân 3D. | Mỗi lần yêu cầu dùng `loadFresh`. | `src/duel/combat-visuals.ts` |
| 3D-L9 | Màn chính ở Medium vẽ cách khung, làm `dt` bị nửa, nên chuyển động chậm một nửa. | `dt` tính cho cả hai khung. | `src/ui/title-ship3d.ts` |
| Voc-H1 | Recall không còn ưu tiên từ yếu: bản chống lặp mới gộp các bản sao từ yếu thành một (yếu xuất hiện 1,25 lần mỗi 20 lượt, thấp hơn ngẫu nhiên đều). | Bản sao thành **trọng số** khi bốc ngẫu nhiên. Nguồn không có bản sao thì kết quả giữ y như cũ. | `src/enemies/stage-word-variety.ts` |
| Voice-M1 | Safari/iOS dưới 16 không có `addEventListener` trên `speechSynthesis`, nên mỗi từ ném lỗi và tắt phiên voice. | Chỉ gắn sự kiện khi có; vòng dò 50 ms vẫn chạy. | `src/speech.ts` |

**Test mới:**

- `tests/wallet-sync.test.ts`: 4 test cho V-H2, V-H1, V-M2, V-M6;
- `tests/wallet-rules.test.ts`: trần cứng;
- `tests/cloud-wallet-transactions.test.mjs`: ngày Daily Lessons và trần cứng trên SQLite;
- `tests/stage-word-variety.test.ts`: trọng số từ yếu.

**Kiểm tra:**

- TypeScript game sạch, `account:check` sạch;
- 32 tệp / 269 test liên quan đạt; vitest đầy đủ 347 tệp / 2.132 test đạt;
- chưa chạy `account-e2e`: script này ghi thư có quà vào cơ sở dữ liệu Worker của bản Play, nên phải chạy với cổng và thư mục lưu riêng;
- `pnpm build:space` đạt;
- trên bản Play, màn chính và trang demo mở được, không có lỗi trong console.

## 3. Còn lại — các bước cho Codex (theo thứ tự)

> Làm xong bước nào thì chạy test của bước đó, cập nhật bảng này, ghi vào nhật ký của `CLAUDE_PROCESS_2026-10-17.md`.

**Codex thực hiện sau review:** chi tiết và giới hạn tại
`CODEX_CLAUDE_REVIEW_IMPLEMENTATION_2026-10-17.md`. Source/build đã hoàn tất;
đã đối chiếu đủ **352 tệp / 2.167 test đạt**, 3 Admin bridge tests, 112 E2E
trên DB riêng, TypeScript và build Space/Portal đạt. Đã kiểm tra/chụp/xem Play.

| Bước | Trạng thái | Bằng chứng |
|---|---|---|
| 1 | Đã triển khai, kiểm tra đạt | SQLite: tài khoản mới/cũ, cutoff thiếu/sai, ưu tiên cloud và giới hạn Stage 20 |
| 2 | Đã triển khai, kiểm tra đạt | Unit + HTTP 3026: 30 nhận, yêu cầu 31 bị 429, tiền không tăng thêm |
| 3 | Đã triển khai, kiểm tra đạt | SQLite tự hoàn 7 ngày; HTTP Admin Confirm/Refund/idempotency; UI fixture có lý do/hộp thoại |
| 4 | Đã triển khai, kiểm tra đạt | Phase 2 có trần; rollback đối chiếu một lần, không báo lại chênh như earn |
| 5 | Đã triển khai, kiểm tra đạt | Clear receipt đúng màn mới được đối chiếu frontier; không nhảy màn xa |
| 6 | Đã triển khai, kiểm tra đạt | Giá refuel, start intent, namespace, epoch/accountId, fixed lessons offline, sổ ngày; E2E 112/112 |
| 7 | Đã triển khai, kiểm tra đạt | Unit chặn thân module; đã tự xem boss High/Medium và đổi về Low |
| 8 | Đã triển khai, kiểm tra đạt | Medium cho hull nhỏ; 8/8 bitmap đóng, GPU 0/0 sau hủy; Play title hủy/tải lại sau 10 giây |
| 9 | Đã triển khai, kiểm tra đạt | SHA-256 URL cả ba model; test so hash và byte GLB thật |
| 10 | Đã triển khai, kiểm tra đạt | Socket/generation/tier/fallback/clip tests; PMREM và skeleton được dọn |
| 11 | Đã triển khai, kiểm tra đạt | 15 voice tests; fixture trên Play đọc/replay đúng URI đã lưu khi voice tới trễ 700 ms |
| 12 | Đã triển khai, kiểm tra đạt | Long Word 24 từ, giữ trọng số Recall; Play Preview 1000 giữ Warp 100→100, frontier 1→1, về title Stage 001 |

### Bước 1. Ví: chính sách số dư khởi tạo phía máy chủ (V-H1, cao)
**Lỗi:** `cloud/src/wallet.ts` `openWallet` vẫn tin `seed` do game gửi. Phía game đã ngừng gửi trong trường hợp vô tình, nhưng một client sửa đổi vẫn tự tạo ví 2.000.000 Credits và `maxStage` 1000. `PUT /save` gửi trước lần mở ví đầu cũng có tác dụng tương tự.

**Đề xuất:**

1. Thêm biến `WALLET_SEED_BEFORE` (ISO, ngày bật ví production) trong `cloud/wrangler.jsonc`.
2. Chỉ nhận seed (từ máy hoặc từ cloud save) khi `accounts.created_at < WALLET_SEED_BEFORE`. Tài khoản tạo sau ngày đó bắt đầu như người chơi mới.
3. Seed từ máy: giới hạn `stage` không vượt màn cao nhất trong cloud save gần nhất của tài khoản. Không có cloud save thì tối đa 20 (World 1). Gắn cờ `migration-stage` cho Admin.
4. Thêm test SQLite: tài khoản mới bị bỏ qua seed; tài khoản cũ vẫn chuyển dữ liệu được.

**Kiểm tra:** `pnpm -s account:check`, `vitest run tests/cloud-wallet-transactions.test.mjs tests/wallet-*.test.ts`.

### Bước 2. Ví: giới hạn số yêu cầu (V-H3 phần còn lại)
- Mỗi tài khoản tối đa khoảng 30 lần `/wallet/op` mỗi phút. Mỗi lần là một dòng ghi D1, mà gói Free chỉ có 100 nghìn dòng ghi mỗi ngày cho cả game.
- Đếm trong bộ nhớ Worker cùng bộ giới hạn đang dùng cho chat. Trả `429 rate-limited`; game coi như "thử lại sau".
- Về lâu dài: nhiệm vụ và Expedition chuyển sang nguồn máy chủ tự kiểm tra (như Daily Hub).

### Bước 3. Ví: nhật ký mua hàng còn treo (V-M3, V-M4)
1. **Hết hạn:** `pendingPurchases` cũ hơn 7 ngày thì tự hoàn tiền khi mở ví. Ghi op `refund:auto`.
2. **Admin:** `adminWallet` trả thêm `pendingPurchases`. Trang Admin (`portal/src/admin/v2/players.ts`) hiện danh sách, có nút "Hoàn tiền" và "Xác nhận" (cần lý do, ghi nhật ký).
3. **V-M4:** thêm cờ `purchaseInFlight` trong `WalletSync`. Bật từ lúc `spend()` thành công tới `settle()`/`refund()`. Khi cờ đang bật thì `open()` bỏ qua `recoverPurchase`.
4. Test cho cả ba ý.

### Bước 4. Ví: giai đoạn 2 và quay về giai đoạn 0 (V-M5)
- **Giai đoạn 2:** số dư đã do máy chủ quyết định nhưng chưa giới hạn earn/sortie (một op cộng được 100 triệu). Nên áp giới hạn của giai đoạn 3 cho cả giai đoạn 2, hoặc bỏ hẳn giai đoạn 2.
- **Giai đoạn 0 → ≥2:** đánh dấu ví "cần đối chiếu". Lần mở sau lấy số dư trong save của máy làm gốc (vẫn trong trần chuyển dữ liệu) thay vì báo một khoản "resync" bị cắt.

### Bước 5. Ví: màn cao nhất trên máy chủ thấp hơn trên máy (V-M7)
- Khi `stage-locked` xảy ra ở đúng màn kế tiếp màn cao nhất của save, cho phép nếu save có bằng chứng qua màn trước đó (receipt `…:clear`). Gắn cờ cho Admin.

### Bước 6. Ví: các lỗi nhỏ (L1–L9 trong báo cáo agent)
1. Admin điều chỉnh ví:
   - chỉ ghi `admin_audit` khi điều chỉnh thật sự áp dụng;
   - nhận `idempotencyKey` từ portal.
2. Nạp Warp: game gửi `{index, price}` đã hiện cho người chơi; máy chủ từ chối nếu khác.
3. Bắt đầu lượt bay: lưu và dùng lại `start:<id>` khi chưa chắc máy chủ đã nhận (như `refuelId`).
4. Kiểm tra tiền tố `opId` theo loại (`start:` chỉ cho sortie, `lessons:` chỉ cho earn…).
5. `acceptView`: bỏ qua câu trả lời của tài khoản cũ (so `epoch`).
6. Gợi ý (hint) Daily Lessons: chỉ đặt sau khi save thành công.
7. Thưởng Daily Lessons offline: báo theo `opId` cố định của từng ngày, không gộp vào "resync".
8. Sổ ngày:
   - `roll()` chỉ được đi tới, không lùi;
   - lưu trữ ngày không ghi đè hàng đã có;
   - thêm chỉ mục `wallet_days(day)`.
9. Sửa §13.3 trong tài liệu thiết kế: một lần mua tốn 2 dòng ghi.

### Bước 7. 3D: khối tròn xanh khi G01 xuất hiện (3D-M4)
- **Nguồn:** thân quái dạng module chung (`drawModularEnemy`, `Game.ts` khoảng dòng 12335) vẽ khi model chưa sẵn sàng và ảnh vẽ chưa giải mã xong.
- **Còn xảy ra khi:**
  - GLB lỗi trước khi ảnh giải mã xong;
  - tải quá 4 giây;
  - quality Low;
  - mất ngữ cảnh WebGL.
- **Sửa:**
  - boss có ảnh vẽ hoặc có hợp đồng 3D thì **không bao giờ** vẽ thân module;
  - giải mã ảnh vẽ của boss ngay khi bắt đầu màn;
  - trong lúc chờ chỉ vẽ hào quang và vết nứt không gian.

### Bước 8. 3D: bộ nhớ GPU (3D-M5)
1. Campaign (khung khoảng 113 px) và tàu đối thủ trong Duel dùng bậc **Medium** kể cả khi chọn High.
2. Hủy tàu ở màn chính khi `setActive(false)` quá 10 giây. Hủy tàu Duel khi rời Duel: thêm `dispose()` cho `DuelCombatVisuals`.
3. Khi hủy texture, đóng ImageBitmap: `texture.source.data?.close?.()`.
4. `DuelShip3D.dispose`: thêm `renderer.forceContextLoss()`, `key.shadow.dispose()`. Hủy renderer khi `create` lỗi.
5. Đo trước/sau bằng `performance.memory` hoặc `about:gpu`. Ghi số vào `VANGUARD_MESHY_INTEGRATION_2026-10-17.md`.

### Bước 9. 3D: bộ nhớ đệm model (Claude tự phát hiện)
- **Lỗi:** nginx đặt `Cache-Control: public, immutable` 30 ngày cho `/assets/`, nhưng tên GLB không đổi khi chạy lại `models:prepare`. Người chơi cũ có thể giữ model cũ tới 30 ngày.
- **Sửa:** `prepare-models.ts` thêm `?v=<10 ký tự đầu của SHA-256>` vào `url` trong manifest. Cập nhật test có so khớp URL.

### Bước 10. 3D: việc nhỏ
1. Hạt khói động cơ Campaign lấy từ socket model (`Game.ts` khoảng 10685), không lấy vị trí tàu vẽ.
2. `modelManifest()`:
   - không lưu kết quả `null` mãi; cho thử lại sau 30 giây;
   - nếu không có manifest thì **không** quay về tệp 12,5 MB `contract.url`.
3. `BossModel3D.dispose`: hủy texture xương.
4. Sau `webglcontextrestored`: dựng lại PMREM.
5. Phát sáng tối đa khoảng 1,6 lần như chú thích, không phải 2,0 lần (`model-3d-runtime.ts` khoảng dòng 562).
6. Bỏ cấp phát mỗi khung:
   - đọc `URLSearchParams` một lần;
   - tái dùng mảng và đối tượng trong `ShipModel3D.draw`.
7. Test:
   - socket của `ShipModel3D`;
   - hủy theo generation;
   - đổi chất lượng boss;
   - chặn khối tròn;
   - chọn `Boss_Hit` / `Boss_Death` / `Boss_Intro`.

### Bước 11. Voice
1. **V-M2:**
   - lưu `voiceURI` đã chọn vào localStorage, phiên sau ưu tiên voice đó;
   - lần chọn đầu chờ thêm khoảng 300 ms hoặc tới sự kiện `voiceschanged` thứ hai;
   - bỏ ghim khi `onerror` báo lỗi khác `interrupted` / `canceled`.
2. **L1:** không có voice tiếng Anh và danh sách rỗng thì trả lời ngay, không chờ 1,8 giây trong `withAudioOutput`. Lỗi "already playing" thì bỏ qua, không tắt phiên mic.
3. **L2:** gọi `getVoices()` và chọn voice lúc khởi động hoặc lần bấm đầu.
4. **L3:** báo một lần "Thiết bị không có giọng đọc tiếng Anh".

### Bước 12. Từ vựng và Unlock
1. **Voc-M3** (chủ dự án duyệt): màn Long word chỉ giữ chất "từ dài" khoảng 6 lượt đầu. Đề xuất:
   - nhóm Long word lấy 24 từ dài nhất;
   - khi cạn, quay về danh sách sắp theo **độ dài**, không theo điểm độ khó.
2. **Voc-L4:** lọc "chưa dùng" trước `admitCandidate` trong `entireSource()`. Giữ mảng boss lọc sẵn để WeakMap không bị trượt.
3. **Voc-L5:** boss "weak-point" ở Long word / Short burst: khi cạn từ dài thì lặp từ dài, không lấy từ ngắn.
4. **Unlock-L6:** chỉ nhận công tắc local `#unlockAllStages` khi `import.meta.env.DEV`.
5. **Unlock-L7:**
   - xóa snapshot preview khi bắt đầu thất bại;
   - xóa `testingStageOverride` khi về màn chính;
   - khi đang preview, hiện rõ "Preview" và không âm thầm bỏ lưu.

## 4. Báo cáo gốc của các agent

Báo cáo đầy đủ (có số dòng và kết quả dựng lại) nằm trong phiên Claude:

- **ví:** script dựng lỗi `rv-verify.mts`;
- **3D:** `rv-3d-out/`;
- **voice/từ vựng:** `bench/`.

Ba thư mục này ở thư mục tạm của phiên Claude và sẽ mất khi dọn máy. Nội dung chính đã chép vào mục 2 và 3.
