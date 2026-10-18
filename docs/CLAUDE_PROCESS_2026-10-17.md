# Tiến độ và kế hoạch làm tiếp (Claude, 16–17/10/2026)

> **Dành cho:** chủ dự án và AI làm tiếp (Codex, Claude). Đọc tài liệu này trước khi làm tiếp, nhất là khi phiên Claude bị dừng giữa chừng.
> **Cập nhật:** Claude cập nhật tài liệu này sau mỗi phần việc. Lần cập nhật cuối ở cuối tệp (mục 9).
> **Yêu cầu gốc của chủ dự án (16/10):**
> - VFX và CGI cho từng hành động, kể cả hiệu ứng rê chuột và bấm ở ngoài trận;
> - âm thanh hay;
> - màn `https://typing-game.local/space-typing` (bộ mặt của game) đẹp hơn, bố cục tốt hơn, được phép dài ra và cuộn;
> - làm tiếp boss G01 3D (VFX chưa như mong đợi);
> - rà soát cơ sở dữ liệu và tính năng online, xử lý tiếp phần còn thiếu.

## 0. Cách đọc nhanh

1. Mục 1: môi trường máy chủ dự án (Windows + WSL). Không đọc thì sẽ mất thời gian dò lệnh.
2. Mục 2: quy tắc và quyết định của chủ dự án. Bắt buộc theo.
3. Mục 3: việc đã xong (kèm tệp).
4. Mục 4: việc **đang làm dở**, trạng thái và cách làm cho xong.
5. Mục 5: việc còn lại, theo thứ tự ưu tiên.
6. Mục 6: kiểm tra trước khi báo xong.

## 1. Môi trường (máy chủ dự án)

- **Thư mục:** `D:\typing-game` (trong WSL: `/mnt/d/typing-game`). Game ở `games/space-typing` (submodule, đang ở trạng thái detached HEAD, **mọi thay đổi chưa commit**; không commit, không stash, không reset khi chưa được chủ dự án cho phép).
- **git, node 24 (nvm), pnpm chỉ có trong WSL Ubuntu.** Chạy lệnh bằng một tệp bash:
  - mở đầu tệp: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`, rồi `cd /mnt/d/typing-game/games/space-typing`;
  - chạy: `wsl -e bash <đường dẫn tệp>`;
  - không viết lệnh có `$` trực tiếp trong PowerShell (PowerShell sẽ tự thay biến).
- **Blender 5.2.2 LTS:** `D:\Blender\blender.exe`. Chạy không giao diện được.
- **Chrome:** `C:\Program Files\Google\Chrome\Application\chrome.exe`.
  - WSL ở chế độ mạng NAT, nên WSL không gọi được cổng gỡ lỗi của Chrome trên Windows.
  - Để chụp ảnh, dùng Node bản Windows (tải bản zip chạy liền từ nodejs.org, Node 22 trở lên). Chạy từ `games/space-typing`:
    - một ảnh: `scripts/visual/shot.mjs` với `SHOT_INSECURE=1`;
    - nhiều bước (rê chuột, bấm, gõ, chuỗi khung): `node scripts/visual/cdp-run.mjs scripts/visual/scenarios/<tên>.mjs`.
  - Các kịch bản có sẵn: `title-deck`, `title-sizes`, `launch`, `boss-g01`, `result-fx`, `skills`, `character-demo`.
  - Biến môi trường: `URL` (mặc định `http://127.0.0.1:3097/`), `Q` (chất lượng), `OUT_DIR`.
  - Ghép ảnh để so sánh: `node scripts/visual/montage.mjs <out.jpg> <cột> <rộng ô> <ảnh…>` (chạy trong WSL).
- **Dịch vụ cục bộ** (chạy trong WSL; tắt khi WSL khởi động lại):

  | Cổng | Dịch vụ | Khởi động |
  |---|---|---|
  | 443/80 | nginx (Play mode, phục vụ bản build tĩnh) | có sẵn |
  | 3016 | Worker tài khoản/online (wrangler dev) | `node games/space-typing/scripts/local-account.mjs start` |
  | 3014 | Duel | `node games/space-typing/scripts/local-duel.mjs start` |
  | 3199 | Admin runtime | `nohup node admin/server.mjs &` (từ `D:\typing-game`) |
  | 3097 / 3098 | Vite không HMR (chụp ảnh) / có HMR | xem dưới |

  **Một lệnh cho tất cả:** `wsl -e bash /mnt/d/typing-game/games/space-typing/scripts/dev/wsl-local-stack.sh`. Script này chạy cả 5 dịch vụ và **giữ phiên WSL mở**. Chạy như tác vụ nền hoặc trong một cửa sổ riêng. Các lệnh lẻ ở bảng trên tạo tiến trình nền rồi thoát, nên tiến trình sẽ chết theo phiên nếu phiên không được giữ mở.
- **Dev server tạm (Vite):**
  - **Vite không nhận sự kiện đổi tệp** khi tệp được sửa từ Windows trên `/mnt/d`. Phải dò định kỳ bằng `scripts/dev/vite.poll.config.ts` (cổng 3098).
  - Bản không HMR để chụp ảnh ổn định: `scripts/dev/vite.stable.config.ts` (cổng 3097).
  - Lệnh: `pnpm exec vite --config scripts/dev/vite.stable.config.ts --host 127.0.0.1 --port 3097 --strictPort`.
  - **Cấu hình dò bỏ qua `public/`.** Thêm tệp mới vào `public/` (GLB, ảnh) thì phải khởi động lại Vite, nếu không Vite trả về `index.html` thay cho tệp đó.
- **Bản Play:** chạy `pnpm build:space` ở `D:\typing-game`, rồi tải lại `https://typing-game.local/space-typing` (portal) hoặc `https://space.typing-game.local/`.
- **Windows trên máy này tắt *Animation effects*,** nên Chrome báo `prefers-reduced-motion: reduce`. Game nay có cài đặt riêng (mục 3.3), nhưng khi tự viết mã chuyển động, đừng dựa vào cài đặt của hệ điều hành.
- **Công cụ thử có sẵn:**
  - `scripts/visual/evals/*.js` (boss, kỹ năng, quái, màn kết quả);
  - `window.__spaceTypingGame` (chỉ có ở dev server), `__resultPreview("clear"|"over")`;
  - xem thêm `docs/VISUAL_TESTING.md` (viết cho macOS; cổng và đường dẫn khác).

## 2. Quy tắc và quyết định của chủ dự án

| Chủ đề | Quy tắc |
|---|---|
| Máy chủ online | **Chỉ Cloudflare gói Free** (Workers, D1, Durable Objects SQLite). Gói 5 USD chỉ khi thật sự bắt buộc. Không dùng PostgreSQL (lý do ở `docs/ONLINE_CLOUDFLARE_DEPLOY.md` mục 6 và báo cáo rà soát). |
| Mô hình 3D | Chủ dự án tạo trên **Tripo3D / Meshy** theo prompt AI viết. **AI chỉnh trong Blender** và đưa vào game. Không tự dựng mô hình bằng mã. |
| Quyết định | Phần nào cần chủ dự án chọn: **cứ làm theo đề xuất**, ghi rõ đã chọn gì trong tài liệu và báo lại. Vẫn hỏi trước với việc khó đảo ngược hoặc ra bên ngoài (deploy, xóa dữ liệu, thanh toán). |
| Giao diện | Phong cách Holo Command (chọn 03/10). **Giữ mọi `id` cũ.** Không hiện số liệu giả. Không dùng `backdrop-filter` trên khung mới đè lên nền đang vẽ. Chuyển động chỉ dùng transform/opacity. |
| Hiệu năng | Không được làm giảm hiệu năng. Đo trước và sau với thay đổi nặng về GPU. |
| Duyệt | Chủ dự án duyệt bằng mắt qua bản Play. **AI phải tự chụp và xem ảnh trước khi báo xong.** |
| Tài liệu | Tiếng Việt dễ đọc, câu ngắn. |
| Âm thanh Duel | Hướng hỏa lực phim chiến tranh, không có tiếng chuông cao. |

## 3. Đã xong

### 3.1 Màn hình chính "Command Deck"
- **Tài liệu:** `docs/COMMAND_DECK_UIUX_AUDIO_2026-10-16.md`.
- **Tệp chính:** `index.html` (`#titleOverlay`), `src/ui/title-home.ts`, `src/ui/title-home.css`, `src/ui/title-ship3d.ts`, `src/ui/title-hub.ts`, phần `titleHomeData()` / `titleToday()` trong `src/main.ts`, `tests/title-home.test.ts`.
- **Nội dung:**
  - màn đầu: thẻ Campaign (Deploy lớn, thanh 20 màn của World, nhãn boss kế tiếp), tàu trưng bày 3D, bảng Today (chuỗi ngày, bài học, nhiệm vụ, điểm danh, Warp miễn phí, thư);
  - cuộn xuống: lộ trình 10 Galaxy (boss chưa mở chỉ hiện bóng), đội 11 tàu;
  - thanh trên và dock dính; cảnh phóng tàu khi Deploy; cảnh trượt vào khi quay về;
  - đã kiểm tra ở 1907×856, 1642×799, 1366×768, 1280×720, 1100 px;
  - khung hình màn chính: trung vị 12,6 ms, p95 16,8 ms.

### 3.2 Hiệu ứng menu và âm thanh giao diện
- **Hiệu ứng bấm:** `src/ui/holo-motion.ts`, `src/ui/ui-fx.css`. Lõi sáng, vòng sáng, 9 tia; chạy cả trong hộp thoại.
- **Âm thanh:**
  - 13 mẫu âm Kenney CC0 ở `src/assets/audio/ui/`, ghi nguồn ở `public/assets/audio/ATTRIBUTION.md`, có kiểm tra định dạng trong `scripts/check-audio-assets.mjs`;
  - phát bằng Web Audio (`Sfx.uiFile`, `uiClick`, `uiDeploy`, `uiAccept`);
  - tiếng bấm toàn cục và lệch trái/phải theo chuột ở `main.ts`.

### 3.3 Cài đặt chuyển động giao diện
- **Tệp:** `src/ui/motion-preference.ts` (nạp đầu tiên trong `main.ts`), plugin PostCSS trong `vite.config.ts`, dòng Settings → Visual → "Interface motion" trong `index.html`.
- **Mặc định Full.** Lý do: Windows tắt Animation effects đã làm tắt mọi hiệu ứng menu và cả hiệu ứng 3D màn kết quả.

### 3.4 Sửa lỗi nhỏ
- `src/ui/blocking-notice-bridge.ts`: cảnh báo cloud save không còn thành hộp thoại chặn.
- `src/vfx/skill-fx.ts`: khói Missile Swarm liền thành dải (dày theo mức chất lượng).
- `admin/account-bridge.mjs`: thêm `POST /maintenance` (quyền `players.moderate`).

### 3.5 Online: rà soát vòng 1 và vòng 2 (agent online)
- **Vòng 1:** sửa 9 lỗi, gồm:
  - đăng xuất trên máy dùng chung;
  - báo cáo chat làm cạn hạn mức ghi D1;
  - `/liveops/import` cho tự tạo thư có quà;
  - đọc toàn bộ thư mỗi lần gửi tiến độ;
  - quét toàn bảng ở trang Admin;
  - cấm/tắt tiếng chưa đóng chat nhóm/riêng;
  - thư đã thu hồi vẫn nhận được;
  - đoán mã quà không giới hạn;
  - cookie phiên hết hạn cố định 30 ngày.
- **Vòng 2:**
  - quà đã xác nhận được giao đúng một lần (sổ giao quà trong `src/liveops/controller.ts`);
  - kiểm tra tiến độ theo thời gian thực (`cloud/src/liveops-rules.ts`);
  - giảm số yêu cầu: tiến độ 60 giây/lần, `flushNow()`, lưu đám mây tối đa 1 lần/phút;
  - bản lưu nén gzip, giữ 6 bản sao lưu;
  - Cron dọn dẹp hằng ngày; chặn bản game cũ ghi đè bản lưu mới;
  - thư phát chung tự hết hạn sau 30 ngày;
  - không còn hỏi chọn bản lưu khi cả hai bản đều mới.
- **Migration:** `cloud/migrations/0002_scan_indexes.sql`, `0003_delivery_progress_compressed_saves.sql`. **Production phải chạy migration trước khi deploy code.**
- **Tài liệu:** `docs/ONLINE_CLOUDFLARE_DEPLOY.md` (giới hạn gói Free, quy tắc WAF, số đo), `docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md` (thiết kế ví).
- **Kiểm tra lúc đó:** e2e 82/82, vitest đầy đủ 2057/2057.

### 3.6 Mô hình 3D
- **Bộ prompt Tripo3D/Meshy:** `docs/art-requests/3D_TRIPO_MESHY_PROMPTS_2026-10-16.md`.
  - 109 món: 11 tàu, 14 quái, 25 boss, 5 vật thể kỹ năng, 54 trang bị/vật phẩm;
  - tạo bằng `node scripts/models/build-3d-prompt-pack.mjs`;
  - prompt dưới 600 ký tự.
- **Script Blender** `scripts/models/blender/space_typing_model_tools.py` chạy không giao diện (Blender 4.5 và 5.2):
  - nạp tệp;
  - chuẩn hóa, giảm tam giác;
  - `--auto-emissive`: bản đồ phát sáng từ màu gốc;
  - điểm gắn tàu theo hình học;
  - `--boss-clips`: hoạt ảnh boss bằng xương;
  - `--preview`: ảnh xem trước;
  - xuất GLB.
- **Boss G01:**
  - đã thêm `Boss_Hit` (12 khung), `Boss_Death` (48 khung), `Boss_Intro` (60 khung) bằng xương, không di chuyển gốc; thêm bản đồ phát sáng (5% điểm ảnh);
  - tệp nguồn: `art-src/models/bosses/tyrant-g01.glb`;
  - đã chạy `pnpm models:prepare --only bosses/tyrant-g01`: High 4,03 MB, Medium 1,68 MB, manifest có 5 đoạn hoạt ảnh.

### 3.7 Kiểm tra gần nhất (17/10, 06:20)
- tsc: game, máy chủ Duel, Worker đều sạch.
- vitest đầy đủ: 2056/2057. Test còn lại (`tests/expedition-stage-runtime-snapshot.test.ts`) chỉ quá thời gian chờ 5 giây khi máy bận; chạy riêng thì qua.
- Bản Play đã build lúc 06:1x (trước các thay đổi ở mục 4).

## 4. Đang làm dở (hai agent của Claude; có thể dừng giữa chừng)

> **Cập nhật sau bàn giao:** Codex đã hoàn tất đợt sửa và nghiệm thu ví/boss trong working tree. Trạng thái dưới đây là ảnh chụp lúc Claude bàn giao. Kết quả hiện tại, giới hạn và các việc tiếp theo ở `CODEX_WALLET_BOSS_ACCEPTANCE_2026-10-17.md`.

### 4.1 VFX/CGI boss G01 — agent "boss"
- **Kế hoạch** (theo thứ tự tác động):
  1. lớp hiệu ứng **phía trên** boss (tia lửa trúng đòn, nổ lúc đổi pha, nổ lúc chết trước đây bị mô hình 3D che);
  2. **chiếu điểm gắn** `FX_CORE`, `FX_CAST_L/R`, `FX_HALO` ra 2D: tia Lance bắn từ lõi, đạn bắn từ hai tay, tích năng ở tay, nổ dây chuyền khi chết;
  3. **dàn dựng theo khung** (`src/boss/model-3d-choreography.ts`): truyền rõ giai đoạn chiêu và tiến độ, không đoán từ tư thế (trước đây tư thế giật ở đầu mỗi lần tích chiêu); đạn ra đúng khung 42; đòn bắn thường (volley) cũng có động tác; dùng đồng hồ của game;
  4. **vật liệu:** ánh sáng môi trường PMREM, viền fresnel và phát sáng theo mức tích năng, chớp trắng khi trúng đòn (`src/boss/boss-glow.ts`);
  5. phát sáng giả (bloom) rẻ cho High/Ultra;
  6. thay hào quang "tia" phẳng bằng chùm sáng mềm xoay; pha 3 (rapid-rage) có hiệu ứng nổi giận;
  7. đạn boss dạng pha lê phát sáng, có đuôi, có chớp nòng (chữ trong đạn vẫn dễ đọc);
  8. cảnh chết: vết nứt, nổ dây chuyền, ảnh nổ vẽ sẵn (`public/assets/space-typing/combat-vfx`), mảnh pha lê, chớp trắng, sóng xung kích. Cảnh xuất hiện: dải đen điện ảnh, cột sáng tại boss, tiếng nhấn;
  9. G01 dùng chất liệu pha lê thay cho bong bóng khi trúng/chết;
  10. âm thanh boss dùng mẫu Kenney Sci-Fi; tiếng bắn đúng khung;
  11. sửa `scripts/visual/evals/boss-perf-ab.js`.
- **Hoạt ảnh mới cần nối vào runtime:**
  - `Boss_Hit`: chỉ khi gõ xong từ / phản đòn / đòn nặng, có thời gian chờ (không phải mỗi viên đạn);
  - `Boss_Death`: khi chết;
  - `Boss_Intro`: khi bay vào;
  - độ phát sáng chỉnh qua `material.emissiveIntensity`.
- **Tệp đang sửa:**
  - mới: `src/boss/boss-fx.ts`, `src/boss/boss-glow.ts`, `src/boss/model-3d-choreography.ts`, `src/vfx/flare-sprites.ts`, `tests/boss-fx.test.ts`, `tests/boss-model-3d-choreography.test.ts`, `tests/boss-depth-runtime.test.ts`;
  - sửa: `src/boss/model-3d-runtime.ts`, `src/boss/boss-relief.ts`, `src/boss/depth-view.ts`, `src/boss/identity.ts`, `src/vfx/combat-fx.ts`, `src/Game.ts` (phần boss), `src/audio/Sfx.ts` (các hàm boss), `src/audio/sample-bank.ts`, `public/assets/audio/ATTRIBUTION.md`.
- **Lúc ghi tài liệu:** tsc sạch. Agent đã bị giới hạn phiên ngắt 4 lần; lần cuối đang làm phần ghi nguồn âm thanh.
- **Nếu phải làm tiếp thay agent:**
  1. chạy `tsc` và `vitest` cho `tests/boss-*.test.ts`;
  2. chụp boss bằng `scripts/visual/evals/boss-fx.js` / `boss-skill.js` (G01 = `#stage=100`; skill: `lance`, `quake`, `surge`, `tether`, `cataclysm`) ở High và Medium;
  3. đối chiếu 11 điểm trên, làm nốt điểm chưa đạt;
  4. đo khung hình Medium/High trước/sau (không tăng quá khoảng 0,5 ms ở Medium);
  5. **kiểm tra một hiện tượng lạ:** khoảng 1 giây đầu lúc G01 xuất hiện có một khối tròn xanh có cánh và vầng hào quang. Nếu không phải hiệu ứng cố ý thì sửa.

### 4.2 Ví tiền trên máy chủ, giai đoạn 1–3 — agent "online"
- **Thiết kế:** `docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md`.
- **Quyết định đã chọn theo đề xuất (17/10):**
  1. Campaign (tốn Warp) cần mạng với tài khoản đã có ví; khách chưa từng kết nối giữ cách cũ; Practice / ôn tập / Smart Review / Daily Lessons luôn chơi offline, không đụng ví.
  2. Trần khi chuyển dữ liệu cũ: Credits 2.000.000, Alloy 50.000, Star Crystal 20.000, Quantum Core 500, Warp tối đa đầy bình; vượt thì cắt và gắn cờ.
  3. Sổ ngày (`wallet_days`) giữ 90 ngày.
  4. Trần thu nhập ngày bằng khoảng 3 lần người chơi nhiều (60 phút/ngày) ở màn cao nhất của họ; vượt thì thưởng ×0,25 và gắn cờ. Cách tính ở `src/balance/wallet-cap-audit.ts`.
  5. Quà lớn (ngày 7 tân thủ, mốc chuỗi từ 30 ngày, mã quà loại lớn) cần tài khoản đã xác minh email; chưa xác minh thì giữ lại, trả khi xác minh.
- **Lúc ghi tài liệu:**
  - phía máy chủ đã chạy, e2e 103/103 với ví bật ở giai đoạn 3;
  - đang làm phía game: `adoptServerWarp` trong `src/persistence/account-transactions.ts`, rồi mô-đun `WalletSync` (`src/online/`).
- **Tệp:** `cloud/**`, `src/economy/wallet-rules.ts`, `src/balance/wallet-cap-audit.ts`, `src/persistence/**`, `src/online/**`, `src/liveops/**`, các luồng tiền trong `src/main.ts`, `scripts/account-e2e.mjs`, `admin/account-bridge.mjs`, `portal/src/admin/v2/players.ts` (bảng ví và điều chỉnh ví).
- **Nếu phải làm tiếp thay agent:**
  1. hoàn thành phía game: mọi lần mua, thưởng qua màn, bắt đầu màn (trừ Warp), nạp Warp đều đi qua `POST /wallet/spend`, `/wallet/sortie`, `/wallet/refuel` với `opId`; game chỉ hiển thị số dư máy chủ trả về;
  2. công tắc `WALLET_PHASE` trong `cloud/wrangler.jsonc`; dev không có Worker vẫn chạy cách cũ;
  3. Admin: xem và điều chỉnh ví (có lý do, có nhật ký);
  4. kiểm tra: `pnpm account:check`, tsc, vitest đầy đủ, `node scripts/account-e2e.mjs http://127.0.0.1:3016 http://127.0.0.1:3016`, thử thật trên trình duyệt (mua, qua màn, nhận quà, nạp Warp).

## 4b. Rà soát Codex và demo nhân vật (Claude, 17/10 chiều)

- **Rà soát thay đổi của Codex** (ví, boss G01, voice, chống lặp từ, Unlock, Vanguard Meshy): `docs/CLAUDE_REVIEW_CODEX_2026-10-17.md`.
  - **Claude đã sửa 12 lỗi**, gồm:
    - cộng tiền hai lần khi bản lưu bị thay;
    - thu nhập ngoài lượt bay không có trần cứng;
    - nhận thưởng Daily Lessons cho ngày cũ;
    - nhật ký mua hàng khóa tài khoản;
    - mở ví lỗi không thử lại;
    - boss không đổi theo chất lượng;
    - GLB đè ảnh Admin;
    - tranh chấp khi tải tàu trong Duel;
    - Recall mất ưu tiên từ yếu;
    - voice lỗi trên Safari cũ;
    - và 2 lỗi nhỏ khác.
  - **Việc còn lại cho Codex:** mục 3 của tài liệu đó, **12 bước theo thứ tự**.
- **Demo nhân vật có cánh** thay cho phi thuyền: `docs/CHARACTER_DEMO_2026-10-17.md`.
  - Xem tại `https://space.typing-game.local/character-demo.html`.
  - Kết luận: **làm được trên web**.
  - Trong tài liệu có: prompt Meshy/Tripo cho 4 nhân vật, các việc Blender cần thêm, các bước đưa vào game, đề xuất làm thử Solar Wyvern trước.

## 4c. Campaign 3D với Draconis (Claude, 17/10 tối)

- **Chủ dự án gửi** `art-src/models/raw/ships/Draconis.meshy.glb`. Yêu cầu: làm **chế độ riêng**, chép Campaign nhưng dựng 3D, theo hướng của demo nhân vật, không đụng Campaign hiện tại. Mô hình quái chủ dự án tạo sau.
- **Đã làm:**
  - Gắn xương (25 xương) và 10 hoạt ảnh cho Draconis bằng Blender. Thêm kiểu mô hình `heroes`.
  - Trang mới `campaign-3d.html`. Màn, độ khó, boss và từ vựng lấy từ Campaign. Tiến độ lưu ở khóa riêng.
  - Phần dựng cảnh dùng chung: `src/scene3d/`.
  - Nút "3D · Draconis" ở thẻ Campaign trên màn hình chính.
- **Đã hoàn tác:** bản thử gắn Draconis thẳng vào Campaign 2D (`src/Game.ts`), vì chủ dự án muốn chế độ riêng.
- **Chi tiết, cách chơi, quy trình mô hình quái, việc tiếp theo:** `docs/CAMPAIGN_3D_2026-10-17.md`.
- **Ý kiến của chủ dự án sau khi chơi thử:** Draconis không hợp góc máy (trông như đang đứng; tay không khớp khi đánh).
  - Chủ dự án chọn làm lại nhân vật **từ ảnh 2D trước**. Prompt và yêu cầu hình dáng: `docs/art-requests/HERO_2D_TO_3D_PROMPTS_2026-10-17.md`.
  - **Đã xong (18/10):** chủ dự án gửi ảnh và GLB `draconis-v2`. Claude đã gắn xương, làm hoạt ảnh bay mới, nâng góc máy, và đổi tia, Nova (phun lửa từ miệng) cùng bảng màu lửa. Xem mục 10 của `docs/CAMPAIGN_3D_2026-10-17.md`.
  - **Sau đó (18/10):** chủ dự án thấy v2 vẫn cứng và tay méo, nên gửi **v3** (rồng bốn chân, phun lửa từ miệng) và **v4** (người hướng dẫn ở màn hình chính). Chủ dự án cũng muốn nền trôi theo bản đồ World. Đã xong cả ba, xem mục 11–13 của tài liệu đó.

## 5. Việc còn lại (thứ tự ưu tiên)

> **Hướng dẫn cho Codex:** làm theo thứ tự dưới đây. Mỗi bước có tài liệu chi tiết. Làm xong bước nào thì chạy kiểm tra ở mục 6 cho phần đã sửa, tự chụp và xem ảnh nếu có thay đổi hình ảnh, rồi ghi vào nhật ký (mục 9).

0. **Rà soát 17/10:** làm 12 bước ở mục 3 của `docs/CLAUDE_REVIEW_CODEX_2026-10-17.md`.
   - Bước 1–2 (ví) là ưu tiên cao nhất.
   - **Phải làm trước khi bật ví trên production.**
1. **Hoàn thành mục 4.1 và 4.2,** build bản Play, chủ dự án duyệt.
   - Đã xong theo `CODEX_WALLET_BOSS_ACCEPTANCE_2026-10-17.md`; còn các giới hạn ghi trong đó.
1b. **Nhân vật có cánh** (khi chủ dự án gửi GLB Solar Wyvern): làm mục 5.2 rồi 5.3 của `docs/CHARACTER_DEMO_2026-10-17.md`, theo đúng thứ tự.
   - **Draconis đã xong** và chạy trong chế độ riêng Campaign 3D (mục 4c). Nhân vật mới nên dùng lại `--rig-json`, theo mục 4 của `docs/CAMPAIGN_3D_2026-10-17.md`.
1c. **Campaign 3D:** làm theo mục 8 của `docs/CAMPAIGN_3D_2026-10-17.md`. Mô hình quái `enemies/<loại>` dùng cho cả Campaign 2D và 3D, nên phải chụp kiểm tra cả hai.
2. **Mô hình 3D đợt 1** (khi chủ dự án gửi GLB vào `art-src/models/raw/<loại>/`): Vanguard, Scout, Vorgrath (G02), micro-missile, Pulse Laser Mk.I, Repair Kit.
   - **Vanguard đã được Codex tích hợp ngày 17/10 từ `raw/ships/vanguard.meshy.glb`:** có bản Blender, GLB High/Medium, màn chính, Campaign/Recall và renderer Duel; đã build và kiểm tra Play. Xem `VANGUARD_MESHY_INTEGRATION_2026-10-17.md`. Các model khác trong đợt này vẫn làm khi có file nguồn.
   - Blender: `D:\Blender\blender.exe -b --factory-startup -P scripts/models/blender/space_typing_model_tools.py -- --input … --kind … --id … --project <games/space-typing> --auto-emissive 0.08 --preview .visual/models/<id>`;
   - quái: thêm `--neutralize` (đổi màu gốc sang trắng gốm, giữ sáng tối; vùng phát sáng thành trắng; đã thử trên Blender 5.2);
   - cắt khối "lửa" nếu có;
   - `pnpm models:prepare --only <loại>/<id>`;
   - boss khác G01 cần thêm hợp đồng trong `src/boss/model-3d-contract.ts`;
   - chụp so sánh với `?model3d=off`.
3. **Online, phần còn lại sau ví** (`docs/ONLINE_CLOUDFLARE_DEPLOY.md`, báo cáo rà soát):
   - máy dùng chung: bản lưu theo tài khoản hoặc nút "xóa dữ liệu máy này" (tiến độ người trước có thể bị tải lên tài khoản khách mới);
   - giới hạn theo IP hợp với lớp học (30 khách/giờ, 10 đăng ký/giờ hiện quá chặt) + Turnstile;
   - chat: giới hạn số kết nối và tin nhắn mỗi ngày cho mỗi tài khoản, lưu lịch sử gọn hơn (mỗi tin hiện tốn khoảng 3,5 dòng ghi);
   - cấu hình từ xa cho luật live-ops (D1/KV), đo lường (tỉ lệ quay lại, tiền vào/ra);
   - **bảng xếp hạng và giải tuần** trên D1 (Daily Lessons, Expedition, điểm từng màn), rồi thêm khu "Cộng đồng" ở màn chính;
   - sự kiện ×2 do Admin lên lịch;
   - Duel online chuyển lên Durable Objects;
   - Season Pass, thanh toán: cần tư vấn pháp lý VN (Nghị định 147/2024).
4. **VFX/CGI phía người chơi:**
   - kỹ năng: Missile Swarm dùng mô hình 3D khi có; Gravity Well to và rõ hơn; Chain Lightning chưa ép được bằng `skill-fx.js` (kiểm tra mã kỹ năng);
   - quái: hiệu ứng trúng/chết theo 8 họ;
   - cảnh boss xuất hiện cho các boss khác;
   - phim mở đầu Galaxy (đề xuất C7 trong `docs/ONLINE_RETENTION_UIUX_3D_PROPOSAL_2026-10-16.md`).
5. **Giao diện:**
   - ảnh vẽ cho Daily Hub, rương, lịch (`docs/art-requests/LIVEOPS_UI_2D_AUDIO_2026-10-16.md`);
   - màn Stage Complete gọn hơn (nay rất dày chữ);
   - tách `main.ts` (khoảng 12 nghìn dòng) theo màn hình.
6. **Âm thanh:**
   - chủ dự án nghe và duyệt mức âm giao diện (số `gain` trong `Sfx.ts`, ghi chú trên `uiHover`);
   - nhạc riêng cho boss Tyrant, lớp "boss" trong hệ nhạc 2 lớp;
   - thay dần âm tổng hợp bằng mẫu thật. Bộ Kenney đầy đủ: tải lại từ `kenney.nl/assets/interface-sounds`, `sci-fi-sounds`, `impact-sounds` (CC0); bản tải lần này nằm ở thư mục tạm của phiên Claude.

## 6. Kiểm tra trước khi báo xong

```bash
# trong WSL, thư mục games/space-typing
pnpm exec tsc -p tsconfig.json --noEmit
pnpm exec tsc -p tsconfig.server.json --noEmit
pnpm -s account:check
pnpm exec vitest run tests            # khoảng 340 tệp; chạy riêng test nào quá 5 s
# Chỉ chạy E2E vào Worker + DB thử nghiệm riêng; không dùng Worker Play 3016.
# Ví dụ instance Codex: .visual/codex-review/wrangler.jsonc, persist account-state, cổng 3026.
ACCOUNT_ADMIN_TOKEN=codex-review-only node scripts/account-e2e.mjs http://127.0.0.1:3026 http://127.0.0.1:3026
node --test ../../admin/account-bridge.test.mjs   # từ D:\typing-game: node --test admin/*.test.mjs
cd ../.. && pnpm build:space          # rồi tải lại trang Play
```

Sau đó chụp ảnh bằng Chrome thật (mục 1), xem ảnh và so sánh trước/sau. Gửi chủ dự án (tiếng Việt): đã sửa gì, ảnh ở đâu, chỉ cần tải lại trang.

## 7. Tài liệu liên quan

| Tài liệu | Nội dung |
|---|---|
| `docs/COMMAND_DECK_UIUX_AUDIO_2026-10-16.md` | Màn hình chính, hiệu ứng menu, âm thanh giao diện, cài đặt chuyển động, Blender |
| `docs/ONLINE_RETENTION_UIUX_3D_PROPOSAL_2026-10-16.md` | Đề xuất gốc (online, UI/UX, VFX/SFX/CGI, 3D) |
| `docs/LIVEOPS_UIUX_3D_IMPLEMENTATION_2026-10-16.md`, `docs/HANDOFF_ONLINE_SHOP_LESSONS_VFX_2026-10-16.md` | Phần Codex đã làm trước đó |
| `docs/ONLINE_CLOUDFLARE_DEPLOY.md` | Đưa lên Cloudflare, giới hạn gói Free, WAF |
| `docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md` | Thiết kế ví tiền trên máy chủ |
| `docs/art-requests/3D_TRIPO_MESHY_PROMPTS_2026-10-16.md` | Prompt Tripo3D/Meshy (109 món) |
| `docs/art-requests/3D_MODELS_PROMPT_PACK_2026-10-16.md` | Quy chuẩn mô hình (hướng, điểm gắn, tên hoạt ảnh) |
| `docs/VISUAL_TESTING.md` | Cách chụp và soi ảnh |
| `docs/CLAUDE_REVIEW_CODEX_2026-10-17.md` | Kết quả rà soát Codex, lỗi đã sửa, 12 bước còn lại |
| `docs/CHARACTER_DEMO_2026-10-17.md` | Demo nhân vật có cánh, prompt Meshy/Tripo, kế hoạch đưa vào game |
| `docs/CAMPAIGN_3D_2026-10-17.md` | Chế độ Campaign 3D với Draconis: cách chơi, luật số, gắn xương, quy trình mô hình quái |

## 8. Ảnh chụp

Ảnh chụp tạm của Claude ở `games/space-typing/.visual/claude/` (Git bỏ qua):
- `deck-v3-top.png`, `portal-after.png`: màn chính mới;
- `m-sizes.jpg`: các cỡ màn hình;
- `m-ship3d.jpg`: tàu 3D;
- `m-result-clear.jpg`, `m-result-over.jpg`: màn kết quả có hiệu ứng;
- `m-boss-newglb.jpg`: boss G01 với GLB mới;
- `blender/m-g01-clips.jpg`: ảnh xem trước 3 hoạt ảnh mới;
- `m-missile.jpg`: khói tên lửa mới.

## 9. Nhật ký cập nhật

- **17/10/2026 — Codex hoàn tất 12 bước review:** source giữ các sửa đổi Claude và thực hiện các bước còn lại về ví, Admin support, 3D, voice, từ vựng và Preview. Đã đối chiếu đúng toàn bộ 352 tệp / 2.167 test đạt trên source cuối (154 tệp lượt bốn luồng + đúng 198 tệp còn lại lượt 12 luồng), 3 Admin bridge tests, 112 account E2E trên DB riêng 3026, kiểm tra HTTP rate limit/Confirm/Refund, TypeScript game/Duel/Worker và build Space/Portal đều đạt. Migration cộng dồn 0007 đã áp dụng local. Đã tự chụp/xem Play: Deploy 100→90, Preview 1000 giữ Warp 100→100/frontier 1→1, xóa preview về Stage 001, title hủy/tải lại, Medium→Low→High; fixture TTS đọc/replay đúng URI tới trễ. GPU thật: 8/8 bitmap đóng, cả hai renderer còn 0 geometry/texture sau dispose. Chi tiết, số đo bộ nhớ và giới hạn: `CODEX_CLAUDE_REVIEW_IMPLEMENTATION_2026-10-17.md`. Không reset save, không commit/push/deploy production; E2E không chạy vào DB Play 3016.

- **17/10/2026 — Codex thực hiện review:** đã triển khai bước 1–6 trong `CLAUDE_REVIEW_CODEX_2026-10-17.md`: cutoff chuyển ví cũ (thiếu/không hợp lệ thì không nhận seed), 30 wallet op/phút/account/isolate, phục hồi mua hàng và Admin có lý do/idempotency, giới hạn phase 2, đối chiếu rollback, receipt qua màn, consent giá refuel và nhật ký ngày chỉ tiến. `account:check` và 58 test ví liên quan đạt. Thêm migration cộng dồn `0007_wallet_reconciliation.sql`; chưa áp dụng vào DB Play ở mốc này. Đang thực hiện bước 7–12 và nghiệm thu tổng thể, không dùng mốc này để kết luận hoàn tất.

- **17/10/2026 10:20:** tạo tài liệu. Mục 4.1 và 4.2 đang chạy.
- **17/10/2026 — Codex tiếp tục:** phần ví và boss đã được đối chiếu với source mới hơn bàn giao. Đang hoàn thiện giá server, phục hồi giao dịch và nghiệm thu hình ảnh. Xem `CODEX_WALLET_BOSS_ACCEPTANCE_2026-10-17.md` để biết thay đổi, bằng chứng kiểm tra và giới hạn; không dùng các số kiểm thử cũ ở mục 3.7 để kết luận source hiện tại đã hoàn tất.
- **17/10/2026 — Codex hoàn tất đợt:** 344 tệp / 2.107 game tests, 112 E2E, 3 Admin bridge tests qua; TypeScript và build game/Portal qua. Đã tự xem ảnh boss Medium/High và bản Play, kiểm tra mua/hoàn tiền, Practice offline và Deploy 100→90 Warp. Đã áp dụng migration local và build bản Play cuối; chưa commit/push/deploy production. Xem báo cáo Codex về giới hạn inventory, giá Admin và bản lưu trên máy dùng chung.
- **17/10/2026 — Sửa ba lỗi chủ dự án báo sau khi chơi:** cố định voice tiếng Anh trong phiên; chống lặp sớm khi nhóm Long word/điểm độ khó cạn từ; sửa guard bỏ qua Unlock all stages đã publish. 22 tệp / 158 test liên quan đạt, TypeScript và build:space đạt. Bản Play xác nhận cùng voice qua đọc/replay, chọn và Deploy Stage 1000, Warp 100→100 và maxStage 1→1; đã tự xem ảnh. Chi tiết và giới hạn ở `CODEX_VOICE_VOCAB_STAGE_FIX_2026-10-17.md`. Không reset save, không đổi cờ Admin, không commit/push/deploy production.
- **17/10/2026 — Vanguard Meshy:** xử lý GLB chủ dự án gửi thành 12.000 tam giác, thêm idle/phát sáng/tám socket; xuất High 2,62 MiB, Medium 0,84 MiB. Nối thân tàu và hiệu ứng vào màn chính/Campaign/Recall/renderer Duel, sửa đổi tier/fallback. 54 test liên quan, TypeScript và build qua; đã đo A/B, tự xem ảnh và xác nhận Deploy trên Play 100→90 Warp. File gốc giữ nguyên. Hướng dẫn thử/làm lại: `VANGUARD_MESHY_INTEGRATION_2026-10-17.md`.
- **17/10/2026 chiều — Claude rà soát Codex và làm demo nhân vật:**
  - Ba agent rà soát chỉ đọc code (ví; 3D/hiệu năng; voice, từ vựng, Unlock). Claude tự đọc lại và sửa 12 lỗi.
  - Thêm test cho các lỗi đã sửa. TypeScript và `account:check` sạch; vitest đầy đủ 347 tệp / 2.132 test đạt; `pnpm build:space` đạt.
  - Chưa chạy `account-e2e`. Script này ghi thư có quà vào cơ sở dữ liệu của Worker Play 3016, nên phải chạy với cổng và thư mục lưu riêng.
  - Thêm trang `character-demo.html` vào bản build, cùng model `bosses/auriel-hero` (G01 + hoạt ảnh nhân vật mới tạo bằng Blender).
  - Đã chụp và tự xem 12 hành động ở cả Medium và High.
  - Không commit/push/deploy, không reset save.
  - Chi tiết: `CLAUDE_REVIEW_CODEX_2026-10-17.md`, `CHARACTER_DEMO_2026-10-17.md`.
- **17/10/2026 tối — Claude làm Campaign 3D với Draconis** (mục 4c):
  - Gắn xương và 10 hoạt ảnh cho `Draconis.meshy.glb` bằng Blender. Xuất bản High 3,5 MB và Medium 1,5 MB. Tệp gốc giữ nguyên.
  - Thêm trang riêng `campaign-3d.html`, phần dựng cảnh dùng chung `src/scene3d/`, và nút "3D · Draconis" ở thẻ Campaign.
  - Campaign 2D không đổi. Bản thử gắn Draconis vào `src/Game.ts` đã hoàn tác.
  - TypeScript sạch; vitest đầy đủ 353 tệp / 2.176 test đạt; `pnpm build:space` đạt.
  - Đã chụp và tự xem trên bản Play: High, Medium, màn 100 (boss G01 3D), màn hình chính.
  - Không commit/push/deploy, không reset save, không chạy `account-e2e`.
  - Chi tiết: `CAMPAIGN_3D_2026-10-17.md`.
- **18/10/2026 — sửa lưới Draconis v3 bị vỡ** (chủ dự án báo):
  - đo độ giãn của từng cạnh lưới;
  - nâng lên 60 nghìn tam giác; các mảnh rời nhỏ đi liền khối;
  - tách chóp đuôi và gai bờm khỏi cánh;
  - giảm biên độ cổ, chân, hàm và đuôi; bỏ vệt sáng ở cánh.
  - Kết quả: cạnh bị kéo dãn giảm từ 2,1–3,5% xuống 0,3–0,9%. Đã xem trên bản Play ở mức High và Medium. Chi tiết ở mục 11.3 của `CAMPAIGN_3D_2026-10-17.md`.
- **18/10/2026 sáng — Draconis v3, nền World chuyển động, người hướng dẫn v4:**
  - **v3:** gắn 34 xương (có hàm dưới), làm hoạt ảnh bay tính từng khung (cánh đập xuống nhanh, lên chậm, gập cánh, thân nhấp nhô, đuôi uốn sóng). Hàn trọng lượng da ở đường nối texture (sửa vết nứt trắng). Phun cầu lửa từ miệng. Góc máy mặc định đổi sang `flank`. Quái không còn chồng lên nhau.
  - **Nền:** `src/scene3d/world.ts` dựng bản đồ của World đang chơi từ bộ ảnh BGV của Campaign 2D: vòm trời xoay theo chuyến bay, mây, cột mốc tiến lại gần, đá ba tầng, vật bay ngang.
  - **v4:** người hướng dẫn ở màn hình chính, có lời chào theo hoàn cảnh, 10 mẹo xoay vòng và 5 động tác khi bấm.
  - TypeScript sạch; vitest đầy đủ 354 tệp / 2.181 test đạt; `pnpm build:space` đạt. Đã chụp và tự xem trên bản Play.
  - Không commit/push/deploy, không reset save.
  - Chi tiết: mục 11–13 của `CAMPAIGN_3D_2026-10-17.md`.
- **18/10/2026 trưa — chỉnh theo góp ý của chủ dự án** (chi tiết: mục 14 của `CAMPAIGN_3D_2026-10-17.md`):
  - **Rồng v3:** chân phi nước đại trên không; miệng chỉ há khi phun lửa; trúng đạn giật nhẹ, mềm; góc máy mặc định `rear`, cắt đáy theo ý chủ dự án; chân rực lửa và vết chân in vào không gian rồi mờ dần; ánh sáng trong cánh khi đập; âm thanh rồng tự tổng hợp (`SceneAudio.voice`) thay tiếng laser.
  - **Cá voi, xác tàu:** đi từ xa, hạ thấp dần khi tới gần, trượt ra mép dưới, không bay ngang tầm rồng. **Quái:** xuất hiện xa hơn (z −72), đứng ở z −13…−20.
  - **Người hướng dẫn v4:** sửa tay khi giơ lên. Lỗi gốc: cạnh của các mặt đã cắt vẫn truyền trọng số. Cạnh lưới giãn quá mức giảm từ 0,9–2% xuống 0,07–0,44%.
  - **Màn hình chờ:** đợi cả tàu 3D và người hướng dẫn rồi mới tắt; người hướng dẫn tải ngay trong lúc màn chờ còn che.
  - **Campaign 2D:** đã rà lại, không bị ảnh hưởng.
  - Kiểm tra: TypeScript sạch; `pnpm build:space` đạt; vitest đầy đủ 354 tệp / 2.181 test đạt. Đã chụp và tự xem trên bản Play ở mức High và Medium.
  - Không commit/push/deploy, không reset save, không chạy `account-e2e`.
- **18/10/2026 tối — kiểm tra Campaign 3D có ảnh hưởng các chế độ 2D không** (mục 17 của `CAMPAIGN_3D_2026-10-17.md`):
  - Kết luận: không ảnh hưởng. Đã kiểm mã nguồn, các khóa lưu trữ, sơ đồ nạp tệp của bản build, và các mô hình dùng chung.
  - Thêm `tests/mode-isolation.test.ts` (4 bài) để giữ ranh giới về sau.
- **18/10/2026 chiều — góp ý lần hai và tính năng góp ý trong game:**
  - **Rồng v3** (mục 15 của `CAMPAIGN_3D_2026-10-17.md`):
    - bỏ vết chân in và các hạt chấm, thay bằng dải lửa liên tục sau mỗi bàn chân;
    - vật thể khổng lồ giữ cỡ to như bản đầu, chỉ trôi dần xuống khi tới gần;
    - âm thanh trầm hơn: tiếng khè và lửa bùng khi phun, tiếng lửa bùng nổ khi quái chết, thay tiếng laser và tiếng nổ như súng;
    - kéo chuột hoặc bấm ←/→ để xoay máy quay ±29°.
  - **Theme phi thuyền / rồng cho toàn bộ game:** đã đánh giá (mục 16) và chưa làm. Việc này lớn, cần viết mới 5–8 nghìn dòng và sửa vào lõi `Game.ts`.
  - **Góp ý / báo lỗi / liên hệ** (`docs/PLAYER_FEEDBACK_2026-10-18.md`):
    - hộp thoại trong game (nút ở màn hình chính, "Report a bug" khi tạm dừng, liên kết trong Campaign 3D);
    - bảng `player_feedback` (migration 0008) và API trong Worker;
    - trang Admin > Feedback, quyền `feedback.read` và `feedback.manage`.
  - **Trên máy chủ dự án:**
    - đã áp migration 0008 vào cơ sở dữ liệu Play ở máy;
    - đã khởi động lại máy chủ Admin 3199 bằng `setsid nohup node admin/server.mjs` (PID ghi ở `.local/admin/server.pid`);
    - đã build Portal và game;
    - có một tin thử "[Claude test]" trong hàng góp ý.
    - **Production phải chạy migration 0008 trước khi deploy Worker.**
  - **Kiểm tra:**
    - TypeScript sạch ở game, Worker và Portal;
    - `pnpm admin:test` 47/47 đạt, các bộ kiểm tra cấu trúc trang admin đạt;
    - vitest đầy đủ: 356 tệp / 2.189 test. Có 1 test không đạt: `expedition-stage-runtime-snapshot`, vì chạy quá 5 giây trong lúc máy đang chụp ảnh song song. Chạy lại riêng 2 lần đều đạt (khoảng 250 ms mỗi lần);
    - đã chụp và tự xem trên bản Play.
  - Không commit/push/deploy, không reset save, không chạy `account-e2e`.
- **18/10/2026 khuya (2) — đo hiệu năng cho Defense, chi phí Cloudflare, bộ gõ tiếng Việt:**
  - **Bản V1** của chủ dự án đã lưu nguyên văn: `SPACE_TYPING_DEFENSE_MASTER_PLAN_V1.md`.
  - **Bản V2** đã cập nhật:
    - 4 quyết định của chủ dự án: trụ không gây sát thương; mỗi từ diệt đúng một con, trừ từ bom; chưa nối ví; chơi cùng tối đa 4 người;
    - mục 9a: số đo hiệu năng;
    - mục 11a: gói Free đủ cho khoảng 800 người chơi mỗi ngày và khoảng 120 trận chơi cùng mỗi ngày; gói 5 USD tốn khoảng 18 USD/tháng ở 3.000 người chơi mỗi ngày.
  - **Trang đo hiệu năng** (chỉ build khi bật `SPACE_BENCH=1`): `defense-bench.html`, `src/bench/`, `scripts/visual/scenarios/defense-bench.mjs`.
    - Script `scripts/models/blender/bake_impostor.py` dựng ảnh chụp sẵn 16 hướng × 4 nhịp cánh, và bản mô hình rút gọn 1.500 tam giác.
    - `cdp-run.mjs` nhận thêm biến môi trường `CHROME_FLAGS`.
    - Bài kiểm thử ranh giới cho phép `src/bench/` dùng `scene3d`, và cấm mọi chỗ khác nạp `src/bench/`.
  - **Kết quả đo:** vẽ theo lô (ảnh chụp sẵn, hoặc mô hình rút gọn) chịu được 800 quái trong 1,6–6 ms mỗi khung hình, kể cả khi CPU chậm 4 lần. Cách "mỗi quái một bản sao" hiện nay mất 23 ms ở 400 quái khi CPU chậm 4 lần.
  - **Campaign 3D:** bỏ qua phím đang ghép dấu của bộ gõ; hiện lời nhắc khi thấy UniKey/EVKey; thêm công cụ ghi phím `__campaign3d.keyTrace` (`CAMPAIGN_3D_2026-10-17.md` mục 18.9).
  - **Môi trường:** máy ảo WSL đã tự tắt một lần. nginx tự chạy lại, nhưng Worker 3016, Admin 3199 và Duel 3014 đã dừng và **chưa khởi động lại**.
  - Không commit/push/deploy, không reset save.
- **18/10/2026 khuya — kế hoạch chế độ thủ thành (Rift Defense), bản V2 để duyệt** (`SPACE_TYPING_DEFENSE_PLAN_V2_2026-10-18.md`):
  - Chủ dự án gửi bản V1 (chưa lưu trong repo). Claude đánh giá rồi viết lại thành V2, theo quyết định của chủ dự án: ưu tiên trụ gây hiệu ứng, trụ không diệt quái.
  - Nội dung chính của V2:
    - chỉ từ gõ đúng mới diệt được quái;
    - chữ trên quái là từ vựng theo cấp, có 3 kiểu hiện chữ (nhìn chữ, nhìn nghĩa, nghe);
    - trụ dùng để giúp gõ kịp và giúp nhớ từ;
    - là chế độ riêng như Campaign 3D;
    - lộ trình A → B → C → D (D là chơi cùng 2 người); không có chế độ 8 người, không có đấu xếp hạng.
  - **Chưa viết mã.** Đang chờ chủ dự án và Codex duyệt; các câu hỏi cần quyết nằm ở mục 14 của kế hoạch.
- **18/10/2026 tối (2) — âm thanh, VFX, HUD, quái và cầu lửa 3D, xoay cảnh** (chi tiết: mục 18 của `CAMPAIGN_3D_2026-10-17.md`):
  - **Âm thanh rồng:** 7 bản thu CC0 từ Freesound (`public/assets/audio/dragon/`, ghi tác giả trong `ATTRIBUTION.md`), thêm lớp trầm và mạch nén. Âm tổng hợp chỉ còn dùng khi tệp chưa tải xong.
  - **VFX:** cầu lửa trúng đích nổ bằng ảnh lửa thật; quái chết nổ thành quả cầu lửa; hơi thở Nova bằng ảnh lửa.
  - **HUD và màn kết quả Campaign 3D:** làm mới. Qua màn: vàng. Thất bại: đỏ, kèm mẹo chơi. Màn kết quả của 2D chưa đổi.
  - **Quái `enemies/rainbow-scout-3d`:** mô hình của chủ dự án, giảm còn 7.000 tam giác, cánh vỗ. Đuôi `-3d` nghĩa là chỉ Campaign 3D dùng.
  - **Cầu lửa `skills/dragon-fireball`:** mô hình của chủ dự án, 4.000 tam giác. Bay mềm theo đường cong, có vệt sáng (`LightTrail`).
  - **Xoay cảnh giữa các đợt:** rẽ 40–56°, luân phiên trái phải. Chỉ nền xoay; phần chơi giữ nguyên.
  - **Sửa lỗi có sẵn:** đợt quái kết thúc sớm khi con cuối vừa xuất hiện.
  - **Kiểm tra:**
    - TypeScript sạch; `pnpm build:space` đạt;
    - vitest đầy đủ 357 tệp / 2.193 test đạt;
    - đã chụp và tự xem ở High và Medium (cầu lửa, Scout, cú rẽ, Nova), không có lỗi JavaScript.
  - Không commit/push/deploy, không reset save, không chạy `account-e2e`.
  - Còn chờ chủ dự án nghe thử âm thanh mới và xem cú rẽ trong lúc chơi thật.
- **17/10/2026 khuya — chủ dự án báo Draconis không hợp góc máy:** Claude tìm ra nguyên nhân (dáng đứng, thân chỉ nghiêng 24°, hoạt ảnh lấy từ khung của boss, tay ra đòn ở ngang hông). Theo yêu cầu của chủ dự án, Claude viết prompt tạo ảnh 2D → 3D cho nhân vật bay (`docs/art-requests/HERO_2D_TO_3D_PROMPTS_2026-10-17.md`). Chưa sửa hoạt ảnh của Draconis cũ.
