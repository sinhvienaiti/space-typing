# Bàn giao: Daily Hub (quà online), chuyển động giao diện, đường ống 3D (16/10/2026)

> **Dành cho:** chủ dự án và AI làm tiếp (Claude, ChatGPT, Codex).
> **Đề xuất gốc:** `docs/ONLINE_RETENTION_UIUX_3D_PROPOSAL_2026-10-16.md`.
> **Ảnh và âm cần làm:**
> - `docs/art-requests/LIVEOPS_UI_2D_AUDIO_2026-10-16.md` (2D, âm thanh giao diện);
> - `docs/art-requests/3D_MODELS_PROMPT_PACK_2026-10-16.md` (3D).

## 0. Tóm tắt đợt này

| Phần | Đã làm | Còn mở |
|---|---|---|
| A. Quà online | Daily Hub đủ 5 tab: chuỗi ngày học + mục tiêu ngày, điểm danh 7 ngày + 28 ô/tháng, nhiệm vụ ngày/tuần + rương điểm năng động, quà thời gian chơi + Warp miễn phí theo khung giờ, hộp thư + mã quà. Chấm đỏ. Lưu trong save, nhận lại không trả hai lần. | **Đã làm ở đợt sau:** máy chủ chạy trên Cloudflare gói Free (Workers + D1 + Durable Objects), Admin soạn thư và mã quà. Xem `docs/HANDOFF_ONLINE_SHOP_LESSONS_VFX_2026-10-16.md`. Còn mở: Season Pass, bảng xếp hạng, thanh toán. |
| B. UI/UX | Đóng hộp thoại có hiệu ứng (mọi hộp thoại, không sửa chỗ gọi). Âm giao diện (rê chuột, tab, mở/đóng, lỗi, nhận quà). Màn mở quà dùng chung. Sửa lỗi chữ của quái bị boss che. | Chuyển cảnh giữa màn hình, tách `main.ts`, bộ thông báo chung. |
| C. 3D | Một ngữ cảnh WebGL dùng chung. Script nén mô hình: boss G01 12,6 MB còn 3,2 MB (High) và 1,4 MB (Medium). Tàu 3D, quái 3D dựng sẵn khung hình, trang bị/shop xoay 3D, tên lửa 3D; tất cả tự bật khi có file. Boss nhận thêm 3 đoạn hoạt ảnh tùy chọn. Script Blender. | Chờ mô hình đợt 1 (6 món). Sau khi duyệt: các tàu/quái/boss còn lại, VFX shader (khiên lục giác, phát sáng), đoạn phim boss xuất hiện. |

## 1. Quà online (live-ops)

### 1.1 Tệp
- **`src/liveops/time.ts`:** lịch. Ngày game đổi lúc **04:00 giờ Việt Nam**, trùng mốc của Warp (`gameDay`). Tuần bắt đầu thứ Hai; tháng tính theo lịch.
- **`src/liveops/policy.ts`:** mọi con số (quà, nhiệm vụ, rương, khung giờ). Dạng dữ liệu thuần, để Admin hoặc máy chủ thay sau này.
- **`src/liveops/state.ts`:** trạng thái và luật, toàn hàm thuần, trả state mới:
  - đổi ngày: `rolloverLiveOps`;
  - ghi tiến độ: `recordLiveOps`;
  - các lệnh nhận: `claim*`;
  - chấm đỏ: `liveOpsBadges`;
  - kiểm tra dữ liệu đọc từ đĩa: `sanitizeLiveOpsState`.
- **`src/liveops/controller.ts`:** nối luật với game. Thứ tự khi nhận quà:
  1. Kiểm tra có được nhận không (tab chỉ đọc, đang trong trận…).
  2. Nếu quà có Warp: chạy giao dịch tài khoản có khóa trước. Lỗi thì dừng, không đổi gì.
  3. Cộng tiền tệ vào save.
  4. Lưu tự động.
  5. Nếu bước 4 lỗi: lần lưu sau sẽ ghi.
- **`src/liveops/runtime.ts`:** đọc `/api/runtime/space-typing/liveops` (thư hệ thống, mã quà dạng SHA-256), và lấy **giờ máy chủ** từ header `Date` của phản hồi. Header này có cả khi endpoint trả 404, đã kiểm tra qua portal.
- **`src/ui/daily-hub.ts`, `src/ui/daily-hub.css`:** hộp thoại `#liveOpsDialog`, nút `#dailyHubButton` ở thanh dưới, nút thư `#titleMailButton` ở góc trên.
- **`src/ui/reward-reveal.ts`:** màn mở quà dùng chung. Nằm ở top layer (popover) nên hiện trên hộp thoại modal; số đếm lên; bấm hoặc Esc để đóng.
- **`src/ui/liveops-art.ts`:** ảnh vẽ tùy chọn ở `src/assets/liveops/*.webp`. Chưa có thì dùng hình dựng bằng CSS.

### 1.2 Lưu trữ
- **Chỗ lưu:** trạng thái nằm ở `save.auxiliary.liveOps`, cạnh `expansionV2` và `difficulty`. Không đổi phiên bản save (vẫn v28). `validateAccountAuxiliary` chấp nhận khóa mới.
- **Ghi cùng lần lưu:** `currentAutosaveSnapshot()` gửi `liveOps` cùng mỗi lần lưu tự động. Thiếu bước này thì lần lưu sau sẽ xóa mất dữ liệu.
- **Quà Warp** đi qua `AccountTransactions.giftWarp(key, amount)`:
  - **Khóa** (dạng `liveops:...`) ghi vào `account.milestoneGrants`, nên nhận lại cùng khóa thì không cộng thêm.
  - **Cách cộng** (`giftWarp` trong `warp-charge.ts`): vào Active trước, dư vào Reserve. Không đủ chỗ thì báo "Warp tanks are full".
  - **Đang trong trận** thì từ chối.
- **Practice/Review:** tiến độ vẫn được tính, vì dữ liệu nằm trong bộ nhớ, không bị bản tải lại sau Practice ghi đè. Bộ đếm 1 giây trong `main.ts` lưu lặng lẽ khi về màn hình chính.

### 1.3 Ghi tiến độ (`main.ts`)

| Sự kiện | Cộng vào |
|---|---|
| `onWordComplete` | `words +1`; `perfectWords +1` nếu gõ không sai |
| `onStageClear` | `clears`, `accurateClears` (≥ 95%), `bossKills`, `eliteKills`, `skills`, `bonus` (lấy từ snapshot của màn) |
| Mỗi giây | `activeSeconds`, chỉ khi đang chơi, tab đang hiện và có phím/giọng nói trong 60 giây gần nhất. Cộng theo khối 5 giây; trần 60 phút/ngày. |

Test Lab xem trước (`testingStagePreviewActive`) không tính.

### 1.4 Chống gian lận: hiện có và còn thiếu
- **Đã có:**
  - đồng hồ tài khoản đơn điệu (`WarpClock`);
  - đổi ngày lùi thì không mở thêm quà (`rolloverLiveOps` bỏ qua ngày nhỏ hơn);
  - quà Warp có khóa;
  - ưu tiên giờ máy chủ nếu đọc được.
- **Chưa có:** người chơi vẫn có thể sửa IndexedDB, hoặc chỉnh giờ máy **tiến lên** khi không có mạng. Chỉ máy chủ giữ ví (phần A0 trong đề xuất) mới chặn hẳn được.

### 1.5 Định dạng JSON Admin (khi làm trang Admin)

```json
{ "liveOps": {
  "messages": [{ "id": "patch-2026-10", "title": "Patch gift", "body": "Thanks for playing!", "reward": { "credits": 300, "warp": 20 }, "startsAt": "2026-10-20T00:00:00Z", "endsAt": "2026-10-27T00:00:00Z" }],
  "giftCodes": [{ "id": "launch", "sha256": "<sha256 hex của mã viết HOA>", "title": "Launch code", "body": "Welcome!", "reward": { "starCrystal": 20 }, "expiresAt": "2026-12-31T00:00:00Z" }]
} }
```

- **Đường dẫn:** game đọc `GET /api/runtime/space-typing/liveops`. Máy chủ Admin chưa có endpoint này (đang trả 404).
- **Khóa reward hợp lệ:** `credits`, `alloy`, `starCrystal`, `quantumCore`, `warp`, `shields`.

### 1.6 Kiểm tra đã chạy
- **Kiểm thử:** `tests/liveops-state.test.ts` (13) và `tests/liveops-warp-gift.test.ts` (4). Toàn bộ bộ kiểm thử: 332 tệp, 2016 kiểm thử đều qua.
- **Trình duyệt thật (qua portal, bản build):**
  - Nhận ngày 1 tân thủ: Credits 0 → 300, đã lưu IndexedDB.
  - Nhận thư chào mừng: +200 Credits, +20 Warp vào Reserve (Active đang đầy), khóa `liveops:mail:welcome` đã ghi.
  - Gõ 3 từ trong trận: mục tiêu hiện "3 / 100".

## 2. UI/UX

- **`src/ui/dialog-motion.ts`:** hiệu ứng đóng 170 ms cho mọi `<dialog>`, bằng cách vá `close/showModal/show` và getter `open`, bắt `submit` của `form[method=dialog]` và `cancel` (Esc). Hành vi:
  - Trong lúc đóng, `dialog.open` đã là `false`.
  - Gọi `showModal()` lúc đang đóng thì hộp thoại giữ mở.
  - Hộp thoại nào chặn Esc (`preventDefault` trên `cancel`) vẫn giữ mở.
  - Tắt bằng `?motion=off`, `data-motion="off"` hoặc chế độ giảm chuyển động của hệ điều hành.
  - Đã kiểm tra 4 trường hợp trên Chrome.
- **Âm giao diện** (`Sfx.uiHover/uiTab/uiOpen/uiClose/uiError/rewardReveal/streakIgnite`, gọi qua `game.playUiCue`):
  - Rê chuột chỉ kêu ngoài trận, giới hạn 70 ms giữa hai lần.
  - Có file `src/assets/audio/ui/<tên>.ogg` thì dùng file.
- **Chữ của quái luôn nằm trên boss:** khi có boss, `drawEnemy` dồn chữ vào `deferredEnemyWords`, vẽ sau boss.
- **Biểu tượng mới:** `gift`, `mail` (`src/ui/icons.ts`).

## 3. 3D

### 3.1 Kiến trúc
- **`src/render3d/shared-renderer.ts`:** **một** WebGLRenderer cho boss, tàu, quái, vật phẩm. Mỗi lần vẽ dùng góc dưới trái của một canvas chỉ lớn dần, trả về vùng `Frame3D`. Người gọi phải `drawFrame3D` ngay. Boss (GLB và tranh nổi) đã chuyển sang đây, nên bỏ được 1 ngữ cảnh WebGL riêng của boss.
- **`src/render3d/model-contracts.ts`:** hợp đồng theo loại: điểm gắn, hoạt ảnh, ngân sách tam giác, cỡ texture. Dùng chung cho script và game.
- **`src/render3d/model-loader.ts`:** đọc `public/assets/space-typing/models/manifest.json`. Không có trong danh sách thì không tải, nên không có lỗi 404. Chọn tầng: Low không dùng 3D; Medium dùng `.medium.glb`; High/Ultra dùng `.high.glb`. Giải nén meshopt có sẵn.
- **`src/render3d/ship-model.ts`:** tàu 3D, gắn vào `drawCharacterShip` (`src/characters/renderer.ts`).
  - Camera vuông góc nhìn xuống, nghiêng 0,38 rad từ phía sau.
  - Độ chao (banking) chuyển thành **lăn thân 3D thật**.
  - Điểm gắn `FX_*` được chiếu ngược ra tọa độ tàu, nên lửa động cơ, lõi và đèn cánh (`ship-lights.ts`) bám đúng mô hình.
- **`src/render3d/model-sheet.ts`:** "dựng sẵn". Mô hình được chụp một lần thành N khung (đứng yên, xoay, lăn) khi tải; trong trận chỉ vẽ ảnh, không tốn WebGL mỗi khung. Dùng cho:
  - quái: `src/render3d/enemy-models.ts`, 16 khung, đèn viền màu họ;
  - trang bị/shop: `src/ui/model-icon.ts`, 24 khung, xoay khi rê chuột;
  - tên lửa Missile Swarm: `src/vfx/skill-fx.ts`, 12 khung lăn.
- **Boss** (`src/boss/model-3d-runtime.ts`):
  - Nạp bản nén theo tầng.
  - Thêm hoạt ảnh tùy chọn: `Boss_Hit` (bật khi boss bị chớp trắng do trúng đòn), `Boss_Death` (khi xác rơi, `pose.dying`), `Boss_Intro` (khi bay vào, `pose.intro` = `bossIntro`).
- **So sánh với bản 2D:** thêm `?model3d=off` (tàu, quái, vật phẩm, tên lửa).

### 3.2 Script
- **`pnpm models:prepare`** (`scripts/models/prepare-models.ts`):
  - Đọc `art-src/models/<kind>/<id>.glb`, và bản G01 ở `art-src/3d/bosses/tyrant-g01.glb` (trước 21/10 ở `art-src/bosses/3d/`).
  - Kiểm tra theo hợp đồng.
  - Xử lý: dedup, prune (**giữ node lá**, vì các Empty `FX_` là lá; lần đầu chạy đã bị xóa mất 4 điểm gắn của G01, đã sửa và có kiểm tra chặn), weld, resample, texture WebP theo tầng, meshopt.
  - Ghi `manifest.json`.
- **`pnpm liveops-art:prepare`** (`scripts/bg-art/prepare-liveops-art.mjs`): ảnh Daily Hub, tách nền xanh lá/hồng tím/trong suốt.
- **`scripts/models/blender/space_typing_model_tools.py`:** gộp mesh, căn tâm, giảm tam giác, tăng phát sáng, tạo Empty `FX_`, tạo hoạt ảnh mẫu, xuất GLB.
- **Gói thêm** (chỉ dùng khi chuẩn bị tài nguyên): `@gltf-transform/core|extensions|functions` 4.5.1, `meshoptimizer` 1.3.0.

### 3.3 Số đo (Chrome không giao diện, 1440×900, dev server, boss G01 trên màn)

| Tầng | File nạp | Khung hình trung vị | p95 |
|---|---|---|---|
| High | `tyrant-g01.high.glb` 3,29 MB | 16,7 ms | 33,4 ms (1 lần giật lúc vừa nạp) |
| Medium | `tyrant-g01.medium.glb` 1,39 MB | 16,7 ms | 16,8 ms |

- **Ảnh chụp:** boss ở High và Medium nhìn như nhau.
- **Trước đây:** file 12,6 MB, texture JPEG 2048 chiếm khoảng 50–64 MB bộ nhớ GPU.
- **Chưa đo:** tàu, quái và vật phẩm 3D, vì chưa có mô hình. Khi có, đo lại bằng `scripts/visual/evals/boss-perf-ab.js` hoặc theo cách trên.

## 4. Việc tiếp theo (thứ tự đề xuất)
1. Chủ dự án làm **ảnh 2D thử** (3 ảnh) và **mô hình đợt 1** (6 món), đặt đúng thư mục, chạy 2 lệnh prepare rồi build.
2. Chủ dự án duyệt qua portal ở mức Medium và Ultra, so sánh với `?model3d=off`.
3. ~~Chọn máy chủ.~~ Đã chốt Cloudflare gói Free; Daily Hub nhận quà qua máy chủ khi online (`cloud/src/liveops.ts`), vẫn dùng `policy.ts` và `state.ts` làm luật chung.
4. ~~Trang Admin "Live-ops".~~ Đã có màn Live-ops mail (thư, mã quà). Còn mở: sự kiện ×2.
5. **VFX shader** (cần cảnh 3D chung): khiên lục giác Barrier Pulse, phát sáng (bloom) cho High/Ultra, tan rã khi chết.
6. **Chuyển cảnh:** vào trận và kết quả. Tách `main.ts` theo màn hình.
