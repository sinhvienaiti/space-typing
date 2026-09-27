# Space Typing — Hình nền mới (BGV): tài liệu bàn giao

> **Ngày:** 27/09/2026 · **Người viết:** Claude Code · **Người nhận:** ChatGPT (hoặc AI lập trình khác) làm tiếp, và chủ dự án.
>
> **Phạm vi:** hệ hình nền mới của `games/space-typing`, gọi tắt **BGV** (Background Visual Reboot). Đã làm xong bản thử **Galaxy 01 (World 01–05)**, chủ dự án đã chơi thử và chấp nhận hướng đi ("tốt rồi").
>
> **Tài liệu liên quan:**
> - Kế hoạch đầy đủ (lý do, thiết kế 10 Galaxy, ngân sách hiệu năng): [BACKGROUND_VISUAL_REBOOT_PLAN.md](BACKGROUND_VISUAL_REBOOT_PLAN.md)
> - Bộ prompt tạo 11 ảnh Galaxy 01: [background-reboot/G01_CHATGPT_PROMPT_PACK.md](background-reboot/G01_CHATGPT_PROMPT_PACK.md)
> - Góp ý của Codex và phản hồi từng điểm: [BACKGROUND_VISUAL_REBOOT_AI_DISCUSSION.md](BACKGROUND_VISUAL_REBOOT_AI_DISCUSSION.md)
>
> File này tập trung vào: hiện trạng thật, cách mọi thứ chạy, các lỗi đã gặp và cách đã xử lý, việc cần làm tiếp.

## Mục lục

0. [Đọc trước tiên](#0-đọc-trước-tiên)
1. [Chủ dự án muốn gì — quy tắc bắt buộc](#1-chủ-dự-án-muốn-gì--quy-tắc-bắt-buộc)
2. [Hiện trạng](#2-hiện-trạng)
3. [Cách chạy, xem và kiểm tra](#3-cách-chạy-xem-và-kiểm-tra)
4. [Kiến trúc kỹ thuật](#4-kiến-trúc-kỹ-thuật)
5. [Dữ liệu cảnh: kit và bố cục](#5-dữ-liệu-cảnh-kit-và-bố-cục)
6. [Đường ống xử lý ảnh](#6-đường-ống-xử-lý-ảnh)
7. [Nhật ký lỗi đã gặp và cách xử lý](#7-nhật-ký-lỗi-đã-gặp-và-cách-xử-lý)
8. [Việc còn lại, theo thứ tự ưu tiên](#8-việc-còn-lại-theo-thứ-tự-ưu-tiên)
9. [Những điều không được làm](#9-những-điều-không-được-làm)
10. [Checklist trước khi báo "xong"](#10-checklist-trước-khi-báo-xong)
- [Phụ lục A — Lệnh chẩn đoán](#phụ-lục-a--lệnh-chẩn-đoán)
- [Phụ lục B — Bộ ảnh hiện tại trong game](#phụ-lục-b--bộ-ảnh-hiện-tại-trong-game)

---

## 0. Đọc trước tiên

1. **Chưa có gì được commit.** Toàn bộ BGV đang nằm trong thư mục làm việc của repo con `games/space-typing`. HEAD đang tách rời (detached) tại `eff4717`. Mất thư mục này là mất hết. **Việc đầu tiên: commit vào một nhánh riêng** (mục 2.4).
2. **GitHub đã có code mới làm song song.**
   - Repo con: `origin/main` = `3c551b4`, đi trước 8 commit (PR #123–#126). Các commit này cũng làm lại hình nền World 01, nhưng theo hướng khác.
   - Repo gốc: `origin/main` = `83b94aa` (PR #45–#47).
   - Đã thử ghép trong thư mục tạm: **chỉ `package.json` xung đột**. Sau khi gộp tay thì kiểm tra kiểu đạt, **811/811 test đạt**, cả chuỗi build đạt, nền mới vẫn hiện đúng.
3. **Không chạy `./dev.sh` trước khi commit.** Script này kéo code mới rồi chạy `git submodule update` sang `3c551b4`. Git sẽ dừng vì 5 file đang sửa dở cũng bị sửa ở bản mới. Trước khi commit, hãy dùng `pnpm dev:space` (ở thư mục gốc) hoặc `./play.sh`. Cả hai đều không kéo code.
4. **Nền mới đang bật mặc định** cho World 01–05, kể cả khi chơi qua Portal. Thêm `?bg=legacy` để xem nền cũ. Từ World 06 trở đi vẫn là nền cũ, vì chưa có ảnh.
5. **Ảnh do chủ dự án tạo bằng Gemini hoặc ChatGPT Images. Code không vẽ cảnh.**
   - Ảnh gốc nằm ở `art-src/g01/`. Git bỏ qua ảnh trong thư mục này, **ảnh chỉ có trên máy của chủ dự án**. Trong Git chỉ có `art-src/README.md`, file này hướng dẫn chép ảnh vào đâu và đặt tên thế nào.
   - Lệnh `pnpm bg:prepare g01-celestial` biến ảnh gốc thành bộ ảnh chạy trong game (gọi là **kit**), lưu ở `public/assets/space-typing/backgrounds/g01-celestial/`.
6. **Chế độ Play (`./play.sh`) không tự build lại khi ảnh thay đổi.** Sau mỗi lần `bg:prepare`, phải chạy `pnpm build:space`.
7. **Vật thể phải đặc 100% và không nhoè.** Chủ dự án đã phản đối rõ hiệu ứng trong suốt. Chiều sâu chỉ được thể hiện bằng kích thước, tốc độ và màu hơi tối.
8. **Chủ dự án duyệt bằng mắt, qua Portal.** Test đạt không có nghĩa là đẹp. Mỗi thay đổi hình ảnh cần: build → tự chụp kiểm tra → báo chủ dự án tải lại trang.
9. **Giao tiếp với chủ dự án bằng tiếng Việt**, câu ngắn, dễ hiểu.

---

## 1. Chủ dự án muốn gì — quy tắc bắt buộc

| # | Quy tắc | Vì sao |
|---|---|---|
| 1 | **Cảnh phải là ảnh game giả tưởng** do chủ dự án tạo bằng công cụ ảnh. Code chỉ ghép lớp, tạo chuyển động, hạt sáng và hiệu ứng shader. | ChatGPT từng làm nhiều vòng bằng hình vẽ code (gradient, vòng tròn, đa giác) và ảnh CC0 độ phân giải thấp. Chủ dự án chê "thô, nhàm, không đẹp". Ảnh thiên văn thật (NASA/ESA) cũng không đủ "huyền ảo". |
| 2 | **Phong cách:** vũ trụ tối, sâu, hơi đáng sợ, nhiều màu. Thấy rõ thiên hà và sao. Nhiều thiên thạch to nhỏ. Tàu và quái vật trôi ngang. Xoay và chuyển động mượt. Áp dụng cho **cả 10 Galaxy**. | Ảnh tham khảo của chủ dự án: bài gamek.vn "Wallpaper những thiên hà huyền ảo" và ảnh "universo 8k" trên Freepik/Magnific. |
| 3 | **Không được giảm hiệu năng.** Đo **thời gian GPU**, không chỉ thời gian luồng chính. | Máy chủ dự án: MacBook có GPU tích hợp Intel UHD Graphics 630 (kèm Radeon Pro 560X), Chrome, màn Retina (DPR 2). |
| 4 | **Chỉ dùng cá nhân**, không bán, không phát hành. Chỉ cần ghi nguồn gốc ảnh vào manifest, không cần màn hình ghi công. | Quyết định của chủ dự án ngày 26/9. |
| 5 | **"Rẻ và đẹp":** không dùng công cụ hay thư viện trả phí. Engine WebGL2 tự viết. | Quyết định của chủ dự án. |
| 6 | **Vật thể đặc 100%, không nhoè.** Chỉ ánh sáng, khí tinh vân và hạt sáng được trong suốt. | Case 23 ở mục 7. Chủ dự án hỏi "sao cá voi trong suốt quá", rồi "con tàu khổng lồ không nên có hiệu ứng như vậy". |
| 7 | **Mọi thay đổi cần duyệt phải hiện mặc định khi chơi qua Portal.** Build lại trước khi báo, rồi bảo chủ dự án tải lại trang. | Case 7 ở mục 7. Portal nhúng game bằng iframe, không kèm tham số URL, nên chủ dự án không thấy những gì bật bằng `?bg=v2`. |
| 8 | **Khi thiếu ảnh:** đưa prompt cụ thể, tên file, tỉ lệ và loại nền. Không tự vẽ ảnh tạm bằng code. | Quy tắc 1. |
| 9 | **Duyệt bằng mắt.** So ảnh chụp trong game với ảnh tham khảo, rồi xin chủ dự án duyệt. | ChatGPT từng tin "CI xanh là xong". |
| 10 | **Nói tiếng Việt, dễ hiểu.** Hạn chế thuật ngữ. | Chủ dự án không phải lập trình viên đồ hoạ. |
| 11 | **Git:** trong phản hồi cho ChatGPT trước đây, chủ dự án cho phép tự commit và push không cần hỏi. Hãy làm theo chỉ dẫn mới nhất của chủ dự án. | Claude chưa commit gì, vì chưa được yêu cầu. |

---

## 2. Hiện trạng

### 2.1 Đã làm được

- **Engine nền WebGL2 riêng:** 4 chương trình shader. Nền chạy chung vòng `requestAnimationFrame` với game và mỗi khung hình chỉ tải lên GPU tối đa 1 texture.
- **Galaxy 01, 5 World, mỗi World một bố cục riêng:**
  - ảnh nền chính kèm chỉnh màu;
  - một vật thể lớn làm điểm nhấn (**hero**): hành tinh, cổng, pha lê, đảo nổi;
  - thiên thạch 3 tầng xa, giữa, gần;
  - sao 2 lớp, hạt sáng theo màu riêng của từng World;
  - tàu, cá voi, xác tàu mẹ, vệ tinh bay ngang;
  - mưa sao băng.
- **Đường ống xử lý ảnh Gemini/ChatGPT:** gỡ logo ✦, tách nền đen/xanh/tím, khử màu nền lem vào, tách từng vật thể, xếp vào ảnh gộp (**atlas**), làm ảnh lặp liền mạch, xuất WebP nhiều cỡ, SHA-256, ghi nguồn gốc.
- **4 bậc chất lượng Low/Medium/High/Ultra.** Khi máy chậm, phần nền tự hạ tải trước, rồi mới giảm độ nét gameplay.
- **Dự phòng:** tự quay về nền cũ khi không có WebGL2, mất context WebGL, thiếu kit, bố cục sai, hoặc World chưa có ảnh.
- **Trang gallery** `bg-gallery.html`: xem nhanh 5 World, bật chữ mẫu để kiểm tra độ dễ đọc, gọi sự kiện bằng nút.
- **Test:** 27 test riêng trong [tests/background-bgv.test.ts](../tests/background-bgv.test.ts). Toàn game 805/805 test đạt, `pnpm build` đạt.

### 2.2 Ảnh chụp hiện trạng (trong `docs/background-reboot/`)

| File | Nội dung |
|---|---|
| `g01-handoff-worlds-01-05.jpg` | 5 World trong gallery, bậc High. |
| `g01-handoff-ingame-world01.jpg` | World 01 trong trận, cỡ khu vực chơi của chủ dự án trong Portal (1642×799 CSS px). |
| `g01-handoff-whale-derelict.jpg` | Cá voi và xác tàu mẹ sau khi làm đặc 100%. |
| `current-*.jpg` | Nền cũ trước khi làm BGV, để so sánh. |
| `g01-gemini-*.jpg` | Lần ghép ảnh Gemini đầu tiên, trước khi chỉnh bố cục. |
| `style-ref-player-ships.png` | Ảnh tàu người chơi, **chỉ để tham khảo phong cách** khi viết prompt. Không phải yêu cầu vẽ tàu. |

### 2.3 Trạng thái Git (kiểm tra lúc 27/9, 21:50)

| Repo | Trên máy | GitHub (`origin/main`) |
|---|---|---|
| Gốc `typing-game` | `main` @ `0f16f43`, trỏ repo con tới `eff4717` | `83b94aa` (hơn 3 commit: #45 Play mode trên Windows WSL và macOS, #46 và #47 cập nhật con trỏ Space Typing), trỏ repo con tới `3c551b4` |
| Con `games/space-typing` | HEAD tách rời @ `eff4717`, **21 mục thay đổi chưa commit** | `3c551b4` (hơn 8 commit, 40 file) |

**Các file BGV sửa trong repo con (10 file đã có sẵn):**
- `.gitignore`: bỏ qua nội dung `art-src/`, trừ `art-src/README.md`.
- `docs/LOCAL_ASSETS_README.md`: khai báo `art-src/` là thư mục chỉ dùng trên máy, theo quy ước của dự án.
- `index.html`: thêm `<canvas id="bgCanvas">` ngay trước `#gameCanvas`.
- `package.json`: thêm devDependency `sharp`, script `bg:prepare`, và bước `check-background-art.mjs` vào cuối lệnh build.
- `pnpm-workspace.yaml`: thêm `allowBuilds: sharp: false`.
- `public/assets/space-typing/manifest.json`: thêm mục nguồn gốc `background-kit-g01-celestial`.
- `src/Game.ts`, `src/main.ts`, `src/performance/adaptive-resolution.ts`, `src/styles.css`: xem mục 4.4.

**File mới của BGV:**
- `art-src/README.md`: chỗ đặt ảnh gốc và tên file (ảnh gốc không lên Git).
- `bg-gallery.html`
- `src/background/` (toàn bộ)
- `scripts/bg-art/` (gồm `prepare-kit.mjs` và `gemini-sparkle-alpha.png`)
- `scripts/check-background-art.mjs`
- `tests/background-bgv.test.ts`
- `public/assets/space-typing/backgrounds/g01-celestial/` (kit, 3,4 MB)
- `docs/BACKGROUND_VISUAL_REBOOT_PLAN.md`, `docs/BACKGROUND_VISUAL_REBOOT_AI_DISCUSSION.md`, `docs/BACKGROUND_VISUAL_REBOOT_HANDOFF.md` (file này)
- `docs/background-reboot/`

**File chưa commit nhưng không thuộc BGV. Hỏi chủ dự án trước khi commit:**
- `docs/CODE_REVIEW_REPORT_82b55d6.md`, `docs/CODE_REVIEW_REPORT_ff1845a.md`: báo cáo review từ 22/9, có trước khi làm BGV.
- `pnpm-lock.yaml` trong repo con: bản trên GitHub cũng không theo dõi file này.
- Trong repo gốc: `pnpm-lock.yaml`, `portal/pnpm-lock.yaml`. Hai file này đã có từ trước.

**Những gì bên kia sửa trong 5 file trùng** (kết quả thử ghép bằng `git apply --3way` lên `origin/main`):

| File | Bên kia sửa gì | Kết quả ghép |
|---|---|---|
| `package.json` | Thêm `node scripts/check-background-assets.mjs` vào **đầu** lệnh build | **Xung đột.** Giữ cả hai bước kiểm tra (xem 2.4). |
| `src/Game.ts` | Thêm `characterId` vào `TestLabGameSnapshot` (2 dòng) | Tự ghép được |
| `src/main.ts` | Đổi âm lượng mặc định (nhạc 0,26, âm nền 0,08) | Tự ghép được |
| `index.html` | Sửa 117 dòng ở phần HUD và menu | Tự ghép được |
| `src/styles.css` | Sửa 518 dòng | Tự ghép được |

Các file mới của BGV không trùng đường dẫn nào ở `origin/main`. Bước kiểm tra mới của bên kia (`check-background-assets.mjs`, 12 ảnh PNG trong `backgrounds/vendor/`) cũng đạt khi có kit BGV.

**Trùng về cách hoạt động, cần chủ dự án quyết:** PR #123–#126 nâng cấp hệ nền cũ (`src/worlds/layered-background-*.ts`, `scene-renderer.ts`, ảnh `vendor/luminousdragon`, `vendor/ohjirochan`). PR #126 tách riêng một World 01 "production-authored". Sau khi ghép, **BGV vẽ thay cho hệ đó ở World 01–05** khi nó chạy được. Nền World 01 của bên kia chỉ hiện khi dùng `?bg=legacy`, hoặc khi BGV không chạy được (không có WebGL2, thiếu kit...). Xem việc P0-2 ở mục 8.

### 2.4 Cách ghép an toàn (làm theo đúng thứ tự)

```bash
# 1) Lưu BGV vào một nhánh riêng (đang ở HEAD tách rời eff4717)
cd /Users/jokerit/htdocs/typing-game/games/space-typing
git switch -c feat/bgv-galaxy01
git add .gitignore index.html package.json pnpm-workspace.yaml \
  public/assets/space-typing/manifest.json src/Game.ts src/main.ts \
  src/performance/adaptive-resolution.ts src/styles.css \
  bg-gallery.html src/background scripts/bg-art scripts/check-background-art.mjs \
  tests/background-bgv.test.ts public/assets/space-typing/backgrounds/g01-celestial \
  docs/BACKGROUND_VISUAL_REBOOT_PLAN.md docs/BACKGROUND_VISUAL_REBOOT_AI_DISCUSSION.md \
  docs/BACKGROUND_VISUAL_REBOOT_HANDOFF.md docs/background-reboot \
  art-src/README.md docs/LOCAL_ASSETS_README.md
git commit -m "feat: BGV WebGL2 background with owner-made Galaxy 01 kit"

# 2) Đưa lên trên bản mới nhất của GitHub
git fetch origin
git rebase origin/main
#    Xung đột duy nhất: dòng "build" trong package.json. Giữ cả hai bước kiểm tra:
#    "build": "node scripts/check-audio-assets.mjs && node scripts/check-background-assets.mjs && tsc -p tsconfig.json --noEmit && vite build && node scripts/report-bundle-metrics.mjs && node scripts/check-ship-art-integrity.mjs && node scripts/check-background-art.mjs"
git add package.json
git rebase --continue

# 3) Kiểm tra
pnpm install          # cần sharp cho bg:prepare
pnpm test             # mong đợi: tất cả đạt (bản thử ghép: 811/811)
pnpm build            # mong đợi: đạt, "Background kits: 1 kit(s), ~3.3 MiB"

# 4) Đẩy lên và merge vào main của repo con (theo quy trình PR của dự án)
git push -u origin feat/bgv-galaxy01

# 5) Sau khi repo con đã merge: cập nhật repo gốc
cd /Users/jokerit/htdocs/typing-game
git pull --ff-only --recurse-submodules=no     # lên 83b94aa
git -C games/space-typing fetch origin
git -C games/space-typing checkout <commit main mới của repo con>
git add games/space-typing
git commit -m "chore: sync Space Typing BGV background"
git push
# Từ đây ./dev.sh chạy lại bình thường.
```

**Lưu ý:** nếu chỉ commit vào nhánh mà chưa merge, `./dev.sh` vẫn checkout repo con về commit mà repo gốc đang trỏ. Khi đó BGV sẽ "biến mất" khỏi game, dù không mất code (vẫn nằm trong nhánh).

---

## 3. Cách chạy, xem và kiểm tra

### 3.1 Lệnh

| Việc | Lệnh | Ghi chú |
|---|---|---|
| Xử lý ảnh sau khi thêm hoặc thay ảnh trong `art-src/g01/` | `cd games/space-typing && pnpm bg:prepare g01-celestial --tool="Google Gemini"` | `--tool` chỉ để ghi nguồn gốc. Mặc định là "ChatGPT Images". |
| Chạy dev (không kéo code) | `cd /Users/jokerit/htdocs/typing-game && pnpm dev:space` | Vite ở cổng 3004. Đổi ảnh thì chỉ cần tải lại trang. |
| Chế độ Play (chủ dự án hay dùng) | `pnpm build:space` rồi `./play.sh` | `play.sh` chỉ build lại khi `src`, `index.html`, `package.json`, `tsconfig.json` hoặc `vite.config.ts` đổi. **Nó không để ý `public/`**, nên phải tự `build:space` sau `bg:prepare`. |
| Test | `cd games/space-typing && pnpm test` | |
| Build kèm kiểm tra | `cd games/space-typing && pnpm build` | Chạy thêm `check-background-art.mjs`. |

### 3.2 Địa chỉ và tham số

| Địa chỉ | Dùng để |
|---|---|
| `https://typing-game.local` → tab Space Typing | Cách chủ dự án chơi. Portal nhúng `https://space.typing-game.local` (lấy từ `portal/public/games.json`) vào iframe, **không kèm tham số**. |
| `https://space.typing-game.local/?bg=legacy` | Xem nền cũ để so sánh. |
| `...?bgPresent=layered` | Cách hiển thị thứ hai: hai canvas chồng lên nhau, thay cho cách mặc định là vẽ gộp nền vào canvas game (`blit`). Chưa so kỹ với hiệu ứng laser/nổ (plan §4.2). |
| `http://127.0.0.1:3004/?bg=legacy` | Tương tự, ở chế độ dev. |
| `http://127.0.0.1:3004/bg-gallery.html?grid=1&q=high&labels=1` | Gallery, **chỉ có ở chế độ dev** (không nằm trong bản build). |

Tham số của gallery:
- `world=world-01..05`: chọn World.
- `q=low|medium|high|ultra`: bậc chất lượng.
- `grid=1`: xem cả 5 World.
- `labels=1`: hiện chữ mẫu để kiểm tra độ dễ đọc.
- `panel=0`: ẩn bảng điều khiển.
- `t=<tốc độ>`: nhân tốc độ thời gian, ví dụ `t=8`.

### 3.3 Kích thước màn hình thật của chủ dự án

Khi chơi qua Portal, khu vực chơi rộng khoảng **1642×760 CSS px, tỉ lệ khoảng 2,2:1**, DPR 2. Ảnh nền 16:9 vì vậy **mất khoảng 22% chiều cao**. Luôn chụp kiểm tra ở kích thước này, ví dụ khung nhìn 1642×799 với DPR 2.

---

## 4. Kiến trúc kỹ thuật

### 4.1 Luồng chạy

```
main.ts backgroundOptions()  ──►  new Game(..., { backgroundCanvas, backgroundPresentation })
                                        │
Game ──► BackgroundStage (src/background/stage.ts)   ← Game chỉ nói chuyện với lớp này
            │ setWorld(worldId) → compositionForWorld() → không có? director = null → nền cũ
            │ load(): fetchKit (kit.json, cache "no-cache") → parseKit (kiểm tra chặt)
            │         → validateComposition (sai → giữ nền cũ) → missingKitReferences (chỉ ghi log)
            │         → tải ảnh cần cho World này (pickVariant theo vai trò và bậc) → createImageBitmap
            │ render() mỗi khung: processUploads() tải tối đa 1 texture lên GPU
            │         → xong hết → new SceneDirector(seed = worldId) → active = true
            ▼
SceneDirector (director.ts): mô phỏng cảnh, ghi Float32Array vị trí/màu các vật thể, danh sách lệnh vẽ
            ▼
WebGLBackgroundRenderer (webgl/renderer.ts): vẽ các lệnh bằng 4 chương trình shader
            ▼
Game.draw(): blit → drawImage(bgCanvas) vào canvas game; layered → xoá canvas game; legacy → nền cũ
```

### 4.2 File và vai trò

| File | Dòng | Vai trò |
|---|---|---|
| `src/background/types.ts` | 240 | Kiểu dữ liệu: kit, bố cục World (`WorldComposition`), các lớp, sự kiện. |
| `src/background/budget.ts` | 104 | Ngân sách từng bậc chất lượng; `resolveBackgroundDpr`; `flightSpeed` (60 px/s cho khung cao 900 px). |
| `src/background/math.ts` | 103 | `hashString` (FNV), `createRandom` (mulberry32), `gradeColorMatrix` (bão hoà, xoay màu YIQ, nhuộm), `plateAxisCenter` (căn ảnh nền theo `focus`). |
| `src/background/kit.ts` | 154 | `parseKit` kiểm tra chặt (sha256 64 ký tự hex, chặn `..`), gắn `?v=<16 ký tự sha>` vào URL, `pickVariant`, `framesForClass`, `textureKey`. |
| `src/background/loader.ts` | 43 | `fetchKit`, `fetchBitmap` (premultiply). |
| `src/background/stage.ts` | 438 | Nạp, tải lên GPU, tạo director, render, hạ/tăng tải, chẩn đoán, xử lý mất context. |
| `src/background/director.ts` | 812 | Mô phỏng cảnh tất định, không cấp phát bộ nhớ mỗi khung. |
| `src/background/compositions/index.ts` | 167 | Danh sách bố cục, `validateComposition`, `missingKitReferences`. |
| `src/background/compositions/g01-celestial.ts` | 407 | Bố cục 5 World của Galaxy 01. |
| `src/background/webgl/renderer.ts` | 511 | Chương trình shader, texture, chế độ hoà màu, vẽ theo lệnh, mất/khôi phục context. |
| `src/background/webgl/shaders.ts` | 252 | GLSL: backdrop, sheet, sprite, point, hàm chung. |
| `src/background/webgl/gl.ts` | 55 | Tạo chương trình shader, lấy uniform. |
| `src/background/webgl/fx-atlas.ts` + `fx-frames.ts` | 103 + 33 | Atlas 512×256 vẽ bằng Canvas2D, gồm quầng sáng, lấp lánh, hạt sáng, vệt sao băng. **Chỉ dùng cho hiệu ứng ánh sáng**, không dùng để vẽ cảnh. |
| `src/background/gallery.ts` + `bg-gallery.html` | 155 + 39 | Trang gallery (dev). |
| `scripts/bg-art/prepare-kit.mjs` | ~1000 | Đường ống xử lý ảnh (mục 6). |
| `scripts/check-background-art.mjs` | 102 | Kiểm tra kit khi build. |
| `tests/background-bgv.test.ts` | ~560 | 27 test. |

### 4.3 Thứ tự vẽ (xa → gần), dựng trong `SceneDirector.configure()`

1. **backdrop**, một lượt vẽ đục gộp 3 thứ: ảnh nền + lớp tinh vân phía sau đầu tiên (cộng sáng) + lớp bụi tối đầu tiên (mặt nạ). Kèm chỉnh màu, làm tối góc (vignette), làm mờ khi tạm dừng (dim) và dither chống sọc màu.
2. Các lớp phía sau khác, mỗi lớp một lượt vẽ riêng. Hiện không có.
3. **Sao** (point). Sao bị bụi che, bằng cách vertex shader đọc mặt nạ bụi.
4. Thiên thạch **xa**.
5. Quầng sáng của hero (FX cộng sáng), rồi đến **hero**.
6. Các lớp **phía trước** (`front: true`). Hiện là `glow-b` cộng sáng, chỉ bật từ bậc High.
7. Thiên thạch **giữa**.
8. **Sự kiện bay ngang** (cá voi, xác tàu, tàu nhỏ, vệ tinh), mỗi sự kiện một ô sprite. Vì vẽ sau lớp tinh vân phía trước, khí không phủ lên chúng.
9. Thiên thạch **gần**.
10. Hạt sáng theo World (point, không bị bụi che).
11. **Mưa sao băng** (FX cộng sáng, tối đa 8 vệt).

Hoà màu: backdrop không hoà (đục). Sprite dùng alpha đã premultiply. FX và `glow-b` cộng sáng. Bụi là mặt nạ.

### 4.4 Tích hợp vào game

- **`src/Game.ts`:**
  - Constructor có thêm tham số thứ 5: `options: { backgroundCanvas?, backgroundPresentation? }`. Có canvas thì tạo `BackgroundStage`.
  - Sau `resize()` ở constructor, gọi `setWorld(worldSceneProfile.worldId)`.
  - Khi đổi màn (`startStage`), gọi `setWorld(nextWorld.id)`. Nếu vẫn là World cũ thì giữ nguyên cảnh, để hành trình liền mạch.
  - `resize` gọi `backgroundStage.resize(width, height, devicePixelRatio)`. `updateSettings` gọi `setQuality`.
  - Vòng khung hình gọi `adaptiveRenderBudget.observe(quality, frameSeconds, drawMs, this.backgroundStage)`.
  - `draw()` tính độ rung màn hình, rồi gọi `renderBackgroundStage(time, shake)`, trả về `"blit"`, `"layered"` hoặc `"legacy"`.
    - `blit`: `drawImage(stage.canvas, 0, 0, w, h)` bên trong phép dịch rung, nên nền rung cùng game.
    - `legacy`: `drawBackground(time)`, tức `worldSceneRenderer` cũ.
  - Tốc độ thời gian của nền: đang chơi 1, tạm dừng 0,25, ở menu 0,5.
  - Thêm `getBackgroundDiagnostics()`. `destroy()` huỷ stage.
- **`src/main.ts`:** hàm `backgroundOptions()`. Mặc định BGV bật; `?bg=legacy` tắt; `?bgPresent=layered` đổi cách hiển thị.
- **`index.html` và `src/styles.css`:**
  - `#bgCanvas` được đặt `position:absolute; inset:0; pointer-events:none`. `#gameCanvas` được thêm `position:relative`.
  - Ở chế độ `blit`, stage đặt `#bgCanvas` thành `display:none`, để trình duyệt không phải ghép thêm một lớp toàn màn hình.
- **`src/performance/adaptive-resolution.ts`:**
  - Thêm kiểu `AdaptiveYieldLayer { stepDown(); stepUp() }`.
  - Khi chậm: hạ nền 1 nấc trước, đo lại 3,5 giây, rồi mới giảm độ nét gameplay.
  - Khi ổn định 7 giây: trả gameplay về đủ nét trước, rồi mới nâng nền.
  - **Chỉ áp dụng ở High và Ultra**, vì `observe` thoát sớm ở các bậc khác.

### 4.5 Bậc chất lượng và ngân sách (`budget.ts`)

| Bậc | DPR tối đa của nền | Điểm ảnh tối đa | Ảnh nền | Tinh vân/bụi | Hero | Atlas | Lớp cuộn chảy | Tần số vẽ |
|---|---|---|---|---|---|---|---|---|
| Low | 0,75 | 0,9 triệu | 1280 | 1024 | 512 | 1024 | 0 | ½ khung |
| Medium | 1 | 1,6 triệu | 1920 | 1024 | 1024 | 1024 | 0 | mỗi khung |
| High (mặc định) | 1,25 | 2,6 triệu | 1920 | 1024 | 1024 | 2048 | 1 | mỗi khung |
| Ultra | 1,5 | 4,0 triệu | 2880 | 2048 | 2048 | 2048 | 2 | mỗi khung |

DPR của nền cố ý thấp hơn gameplay: nền mềm hơn một chút để tạo chiều sâu, và đỡ tốn GPU.

Các nấc tự hạ tải (`LOAD_LEVELS` trong `stage.ts`), áp dụng trước khi đụng tới gameplay:
- DPR ×0,8;
- DPR ×0,65 và tắt cuộn chảy;
- DPR ×0,65 và vẽ nửa tần số. Nấc này chỉ có tác dụng ở chế độ `layered`.

### 4.6 Dự phòng

Các trường hợp tự quay về nền cũ:
- không có WebGL2;
- mất context WebGL: nền cũ hiện ngay, context khôi phục thì nạp lại (đã thử, mất khoảng 2,5 giây);
- không tải được `kit.json` hoặc kit sai định dạng;
- bố cục sai cấu trúc;
- tải ảnh lỗi;
- World chưa có bố cục (World 06+).

Riêng kit thiếu một vài ảnh vẫn vẽ được: lớp nào thiếu thì bỏ, thiếu ảnh nền thì nền đen, và chỉ ghi `console.info`.

### 4.7 Hiệu năng đã đo

Đo trên Intel UHD 630, Chrome, DPR 2, bằng `EXT_disjoint_timer_query_webgl2` (có khởi động trước, lấy trung vị 3 lần × 60 khung):

| Bậc | Canvas nền | GPU mỗi khung |
|---|---|---|
| Low | 1080×675 | 1,19 ms (vẽ nửa tần số, khoảng 0,6 ms/khung) |
| Medium | 1440×900 | khoảng 1,7 ms |
| High | 1800×1125 | 3,3 ms |
| Ultra | 2160×1350 | 5,25 ms |

- Luồng chính tốn khoảng 0,2–0,3 ms/khung cho nền. Hệ nền cũ tốn 0,7–1,0 ms.
- **Các số này đo với bộ ảnh thử**, trước khi có ảnh Gemini thật. Cần đo lại bằng kit thật (việc P2-3).

---

## 5. Dữ liệu cảnh: kit và bố cục

### 5.1 `kit.json` (do `prepare-kit.mjs` sinh ra, không sửa tay)

```json
{
  "id": "g01-celestial",
  "version": 3777276518,
  "textures": {
    "plate": { "variants": [{ "maxSize": 1280, "url": "plate.1280.webp", "sha256": "…64 hex…" }, …],
               "aspect": 1.777, "wrap": "clamp", "mipmaps": false }
  },
  "atlases": {
    "rocks": { "texture": "atlas-rocks",
               "frames": [{ "id": "rocks-00", "u0": 0, "v0": 0, "u1": 0.34, "v1": 0.34, "aspect": 1.0, "sizeRank": 0 }, …] }
  }
}
```

- `sizeRank`: 0 là vật lớn nhất trong atlas, 1 là vật nhỏ nhất. `framesForClass` dựa vào nó để chia `large`, `medium`, `small`.
- Tên file ảnh không đổi khi ảnh đổi. Vì vậy `parseKit` gắn thêm `?v=<16 ký tự đầu của sha256>` vào URL (case 9).

### 5.2 Bố cục World (`WorldComposition` trong `types.ts`)

| Trường | Ý nghĩa |
|---|---|
| `plate` | Ảnh nền chính: `texture`, `flipX`, `overscan` (phóng thêm để có chỗ trôi, ≥ 1), `drift` (biên độ trôi theo phần khung nhìn, phải ≤ (overscan − 1)/2), `driftPeriod` (giây), `focus` (phần ảnh được giữ khi màn hình phải cắt: 0 = trái/trên, 0,5 = giữa, 1 = phải/dưới), `grade` (exposure, gamma, saturation, hueShift, tint). |
| `sheets[]` | Lớp lặp liền mạch: `blend` (`add`, `screen` hoặc `mask`), `opacity`, `tileScale`, `depth` (hệ số tốc độ bay), `lateral` (trôi ngang, px/s), `flow` (độ uốn chảy), `tint`, `rotation`, `minTier`, `front`. |
| `hero` | Vật nhấn: `anchor` (vị trí tâm theo phần khung), `size` (theo chiều cao khung), `depth` (0,02–0,08), `flipX`, `spin`, `alpha`, `tint`, `glow` (quầng sáng FX phía sau). |
| `fields[]` | Tầng thiên thạch: `atlas`, `sizeClass`, `band` (`far`, `mid` hoặc `near`), `counts` theo bậc, `depth`, `size`, `spin` (độ/giây, vật lớn quay chậm hơn), `spread` (lệch hướng, độ), `tint`, `alpha`, `blur` (độ lệch mipmap), `avoidCenter` (tránh hành lang chữ ở giữa). |
| `stars[]`, `particles[]` | Lớp điểm sáng: `counts`, `spikes` (số sao có tia chữ thập), `depth`, `radius`, `brightness`, `palette`, `twinkle`, `twinkleHz`, `wander`, `minTier`. |
| `events[]` | `meteor-shower` (mưa sao băng: `interval`, `meteors`, `color`) hoặc `pass` (bay ngang: `atlas`, `frames` theo id, `sizeClass`, `interval`, `duration`, `headings` (độ: 0 = sang phải, 90 = xuống), `facing` (hướng mặt của ảnh), `mirror` (ảnh vẽ nhìn nghiêng thì lật gương thay vì xoay ngược), `size`, `alpha`, `tint`, `blur`, `minTier`). |
| `post.vignette` | Độ tối ở góc, 0–1. |

### 5.3 Galaxy 01 hiện tại

| World | Tên | Ảnh nền | Chỉnh màu | Hero (`anchor`, `size`) |
|---|---|---|---|---|
| world-01 | Rainbow Reach | `plate`, `focus [0.5, 0.15]` | exposure 0,9, gamma 1,12 | `hero-w01` hành tinh vành cầu vồng, [0.86, 0.72], 0,7, tint [0.86, 0.86, 0.9] |
| world-02 | Halo Garden | `plate-b`, lật ngang | hue +8 | `hero-w02` vòng hào quang vàng, [0.78, 0.3], 0,66 |
| world-03 | Prismatic Tide | `plate`, `focus [0.5, 0.15]` | exposure 0,9, gamma 1,1, hue −18, bão hoà 1,08 | `hero-w03` cụm pha lê, [0.2, 0.32], 0,66 |
| world-04 | Cherub Falls | `plate-b` | exposure 1,04, hue +6 | `hero-w04` đảo nổi và thác nước, [0.78, 0.34], 0,64 |
| world-05 | Aurora Gate | `plate`, lật ngang, `focus [0.5, 0.15]` | exposure 0,9, gamma 1,1, hue −35, bão hoà 0,95 | `hero-w05` cổng cực quang, [0.76, 0.27], 0,6 |

Các thông số chung của cả 5 World:
- `overscan` 1,06; `drift` [0,012; 0,01]; chu kỳ trôi 180 giây; vignette 0,6.
- Quầng sáng hero: bán kính 1,35 lần hero, cường độ 0,32.
- **Lớp phủ:**
  - `dust`: mặt nạ, đục 0,55, `tileScale` 1,4, xoay −32°, gộp vào backdrop.
  - `glow-b`: cộng sáng, đục 0,18, lớp phía trước, chỉ từ bậc High.
  - **`glow-a` đã có trong kit nhưng chưa được dùng** (việc P1-1).

**Tầng thiên thạch:**

| Tầng | Số lượng (Low/Med/High/Ultra) | Cỡ (theo chiều cao khung) | Nhuộm | alpha | blur |
|---|---|---|---|---|---|
| Xa | 10 / 18 / 28 / 38 | 0,012–0,032 | [0.62, 0.65, 0.8] | 1 | 0 |
| Giữa | 5 / 9 / 13 / 18 | 0,035–0,12 | [0.94, 0.95, 1] | 1 | 0 |
| Gần | 0 / 0 / 1 / 2 | 0,12–0,2 | [0.72, 0.72, 0.8] | 1 | 0,3 |

**Sự kiện:**

| Sự kiện | Ảnh (id trong atlas `life`) | Chu kỳ (giây) | Thời gian bay ngang | Cỡ | Làn |
|---|---|---|---|---|---|
| Cá voi vũ trụ | `life-01` | 70–120 | 40–60 giây | 0,28–0,4 | lớn |
| Xác tàu mẹ | `life-00` | 100–160 | 55–80 giây | 0,2–0,3 | lớn |
| Tàu nhỏ (Medium+) | `life-04`…`life-09` | 35–60 | 8–13 giây | 0,045–0,07 | nhỏ |
| Vệ tinh | `life-02`, `life-03` | 60–100 | 45–70 giây (bay dọc, 78°/102°) | 0,08–0,11 | nhỏ |
| Mưa sao băng (Medium+) | FX | 40–70 | 3–6 vệt | — | — |

- Tất cả đều `alpha: 1`, `blur: 0`. Ảnh nhìn nghiêng, mặt hướng sang phải (`facing: 0`), có `mirror: true`, trừ vệ tinh.
- **Lần xuất hiện đầu tiên:** sau 3 giây + 20% chu kỳ (`EVENT_GRACE_SECONDS`, `FIRST_EVENT_SHARE`). Tàu nhỏ đến sau khoảng 10–15 giây, cá voi sau khoảng 17–27 giây.
- **Hai làn:** mỗi lúc tối đa 1 vật lớn và 1 vật nhỏ trên màn hình (`laneBusy`).

### 5.4 Cách đạo diễn cảnh chạy (`director.ts`)

- **Tất định:** hạt giống là `worldId`, băm FNV rồi dùng mulberry32. Cùng World thì cùng cảnh. Test kiểm tra điều này.
- **Không cấp phát bộ nhớ mỗi khung:** dữ liệu nằm trong `Float32Array`. Mỗi sprite 16 số (`SPRITE_FLOATS`), mỗi điểm 12 số (`POINT_FLOATS`).
- **Vật thể chỉ sinh ra hoặc biến mất ở ngoài màn hình**, không bao giờ "hiện ra" giữa màn. Vật lớn quay chậm hơn vật nhỏ. Mỗi vật có hướng trôi riêng, không chung một đường chéo.
- **Hero** trôi rất chậm (độ sâu 0,02). Ra khỏi màn hình thì quay lại từ phía trên, ở vị trí đối xứng ngang.
- **Cá voi và tàu nhìn nghiêng:** khi bay ngược hướng mặt thì lật gương, không xoay 180° (vì xoay sẽ bị lộn ngược).
- API: `setViewport`, `setSpeedTarget`, `setDimTarget`, `setShake`, `triggerMeteorShower`, `triggerPass`, `update(dt)`.

### 5.5 Quy tắc khi chỉnh bố cục

- Vật thể: `alpha: 1`. `blur` bằng 0, trừ tầng gần tối đa khoảng 0,3. Chiều sâu chỉ bằng kích thước, tốc độ (`depth`) và `tint` hơi tối hoặc lạnh.
- Không để một vật chiếm quá nhiều khung. Hero World 01 từng cao 95% khung và che mất một phần ba cảnh.
- Ảnh nền bị cắt trên/dưới ở màn hình bè ngang. Dùng `focus` để giữ phần có chi tiết đẹp (thiên hà, lõi tinh vân), cắt phần trống.
- Vật lớn và sáng nên tránh hành lang chữ ở giữa (`avoidCenter`). Ảnh nền đã được làm tối nhẹ để chữ dễ đọc.
- Sau khi chỉnh: chạy `pnpm test` (có test cấu trúc cho mọi bố cục), chụp ở 1642×799 DPR 2, rồi xin chủ dự án duyệt.

---

## 6. Đường ống xử lý ảnh

### 6.1 Đầu vào (`art-src/g01/`, tên có tiền tố `g01-`, đuôi `.png`, `.webp`, `.jpg` hoặc `.jpeg`)

Thư mục này nằm ngoài `public/`, vì game không tải ảnh gốc. [art-src/README.md](../art-src/README.md) (có trong Git) ghi cách chép ảnh sang máy khác.

| Ảnh | Tỉ lệ | Nền | Ghi chú |
|---|---|---|---|
| `g01-plate` | 16:9 | đục | Nền chính. Càng to càng tốt: ≥ 1920 px mới nét ở High, 2880 px cho Ultra. |
| `g01-plate-b` | 16:9 | đục | Không bắt buộc. Nền thứ hai, dùng cho World 02 và 04. |
| `g01-glow-a`, `g01-glow-b` | 1:1 | đen | Tinh vân để cộng sáng. **Phải là một ảnh đơn, không phải lưới 2×2.** |
| `g01-dust` | 1:1 | trắng | Bụi tối vẽ trên nền trắng, sẽ đổi thành mặt nạ. |
| `g01-hero-w01…05` | 1:1 | trong suốt thật, xanh `#00FF00`, tím `#FF00FF` hoặc đen | Một vật thể, không chạm mép ảnh, không có mặt trời hay tia sáng tràn ra mép. |
| `g01-atlas-rocks` | 4:3 | trong suốt thật, xanh hoặc tím | 12 thiên thạch tách rời nhau. |
| `g01-atlas-life` | 4:3 | trong suốt thật, xanh hoặc tím | Tàu, sinh vật, vệ tinh, tách rời nhau. |

Ảnh Gemini thường có: logo ✦ ở góc, nền đen thay vì trong suốt, nền bụi màu xám, vật thể dính nhau. **Script đã tự xử lý những lỗi này.** Tên file ảnh Gemini tải về (`Gemini_Generated_Image_…`) phải đổi lại theo bảng trên.

### 6.2 Từng loại ảnh được xử lý thế nào (`scripts/bg-art/prepare-kit.mjs`)

**1. Gỡ logo ✦ của Gemini** (`removeSparkleWatermark`)
- Logo nằm cách góc dưới phải 120 px, độ đục khoảng 30%.
- Mẫu độ đục: `scripts/bg-art/gemini-sparkle-alpha.png` (64×64).
- Phát hiện: so độ sáng trong vùng logo với vòng ngay ngoài nó. Tỉ lệ nằm trong 0,55–1,6 thì coi là có logo.
- Đảo phép hoà chính xác: `in = (out − 252·a) / (1 − a)`. Ảnh không có logo thì giữ nguyên.

**2. Ảnh nền**
- Không bao giờ phóng to ảnh. Xuất các cỡ trong [2880, 1920, 1280], chỉ những cỡ không lớn hơn ảnh gốc. WebP chất lượng 84.
- **Báo cáo độ dễ đọc** trên vùng chơi (10%–85% chiều cao). Ngưỡng: độ sáng trung bình ≤ 40, p95 ≤ 120, tỉ lệ điểm rất sáng ≤ 1,5%, tỉ lệ điểm rất tối ≥ 20%.
- Cảnh báo nếu ảnh rộng dưới 1920 px.

**3. Tinh vân `glow-a`/`glow-b`**
- Cắt vuông, rồi `untile2x2` (nếu 4 góc gần giống hệt nhau thì giữ 1 ô).
- `levels`: nếu nền không đen thì kéo điểm đen lên phân vị 30.
- `makeSeamless`: cộng 4 bản dịch nửa ô, trọng số sin², để mỗi bản mờ về 0 đúng chỗ đường nối của chính nó.
- WebP chất lượng 88, lặp (repeat), có mipmap.

**4. Bụi `dust`**
- `levels`: 2% tối nhất thành đen, 8% sáng nhất thành trắng.
- Độ đục tính từ độ tối, màu cố định (8, 5, 14).
- Làm liền mạch, xuất WebP có kênh alpha.

**5. Hero** (`ensureTransparency(…, unmix = true)`, rồi `trim`)
- **Trong suốt thật:** hơn 60% viền ảnh trong suốt thì giữ nguyên.
- **Nền đen** (`extractFromBlack`):
  - tách các vùng sáng (> 20), đóng khe hở;
  - giữ vùng lớn nhất và các vùng lớn không chạm mép; bỏ sao lẻ và quầng nền;
  - lõi đặc ở chỗ độ sáng ≥ 70 và lấp lỗ kín nhỏ hơn 1,5% ảnh;
  - dải mềm 6 px có alpha theo độ sáng, rồi bỏ premultiply khỏi nền đen;
  - làm mờ dần 5% sát mép để không bao giờ lộ đường cắt thẳng.
- **Nền xanh/tím:**
  - màu nền lấy bằng trung vị của viền ảnh;
  - alpha = 1 − (mức ngả màu nền − 90)/100. Ngưỡng 90 cao để giữ đặc các màu hồng hoặc xanh của chính vật thể;
  - khử màu nền lem vào ở dải viền 6 px;
  - **riêng hero còn tách màu nền khỏi phần bán trong suốt nối liền với nền** (`unmixSpill`, case 18): coi `C = a·F + (1 − a)·K`, suy ra `a = 1 − excess/keyStrength` và `F = (C − (1 − a)·K)/a`.
- **Ô vuông caro vẽ giả** (không phải trong suốt thật): báo lỗi, bắt tạo lại ảnh.

**6. Atlas**
- Tách nền như trên, nhưng **không** tách phần bán trong suốt, để giữ độ đặc (case 18).
- `detectObjects`: lấy mặt nạ alpha > 24, nở ra 0,4% cạnh ảnh để gom mảnh gần nhau (vây, xúc tu), bỏ vật nhỏ hơn 0,15% ảnh.
- `cropObject`: cắt từng vật, xoá điểm ảnh của vật khác lọt vào khung. Rồi `trim`.
- `pack`: xếp theo kệ. Dùng atlas 1024 nếu mọi vật vừa ở cỡ gốc, không thì 2048.
- Xuất 2 cỡ (atlas và nửa atlas).
- Id khung theo diện tích giảm dần: `rocks-00`…`rocks-11`, `life-00`…`life-09`.
- **Ảnh xem trước có đánh số** ở `art-src/g01/_out/preview-atlas-*.webp`. Dùng ảnh này để gán id vào sự kiện. Hiện tại: `life-00` xác tàu mẹ, `life-01` cá voi, `life-02`/`03` vệ tinh, `life-04`…`09` tàu nhỏ.

**7. Kết thúc**
- Xoá file cũ không còn dùng trong thư mục kit.
- Ghi `kit.json` (version là mã băm) và `art-src/g01/_out/report.json` (ghi chú và độ sáng).
- Cập nhật mục nguồn gốc `background-kit-g01-celestial` trong `manifest.json`: category `galaxy-theme`, sourceType `generated`, không có `url`.

### 6.3 Kiểm tra khi build (`scripts/check-background-art.mjs`)

Với mỗi thư mục kit có `kit.json`, script kiểm tra:
- JSON hợp lệ, `id` trùng tên thư mục;
- mỗi biến thể: file tồn tại, SHA-256 khớp, đúng là WebP, cạnh dài bằng `maxSize`, tỉ lệ khớp (sai số 2%);
- atlas trỏ tới texture có thật;
- **không có file thừa**.

Sai là build dừng. Dung lượng chỉ báo cáo, không giới hạn.

### 6.4 Thêm một Galaxy mới (ví dụ G02)

1. Viết bộ prompt kiểu `G01_CHATGPT_PROMPT_PACK.md`, theo phần thiết kế Galaxy 02 trong plan §6. Đưa chủ dự án tên file và tỉ lệ.
2. Thêm vào `KITS` trong `prepare-kit.mjs`: `"g02-infernal": { src: "art-src/g02", prefix: "g02-" }`.
3. Chủ dự án đặt ảnh vào `art-src/g02/`, rồi chạy `pnpm bg:prepare g02-infernal`. Xem ảnh xem trước atlas để gán id.
4. Tạo `src/background/compositions/g02-infernal.ts` cho World 06–10, rồi đăng ký vào `BACKGROUND_COMPOSITIONS`.
5. Thêm test (test cấu trúc sẵn có sẽ tự kiểm mọi bố cục), chụp ở kích thước thật, xin chủ dự án duyệt.

---

## 7. Nhật ký lỗi đã gặp và cách xử lý

Dạng mỗi dòng: **Triệu chứng** → nguyên nhân → cách xử lý (file).

### A. Hiệu năng
1. **GPU quá tốn ở bản đầu** (High 6,9 ms, Ultra 12 ms trên UHD 630) → quá nhiều lượt vẽ toàn màn hình → gộp ảnh nền, tinh vân và bụi thành 1 lượt đục; sao tự đọc bụi trong vertex shader; bỏ lượt hậu kỳ; thay `pow` bằng đường cong rẻ; rút gọn hàm uốn chảy; hạ DPR của nền; lớp phía trước chỉ bật từ High → High còn 3,3 ms (`shaders.ts`, `renderer.ts`, `budget.ts`).
2. **Đo GPU bằng `gl.finish` không đáng tin** → dùng `EXT_disjoint_timer_query_webgl2`, có khởi động trước, lấy trung vị 3×60 khung.

### B. Lỗi engine
3. **Director không tìm thấy texture** → id texture đã được gắn tên kit ở một chỗ nhưng chỗ khác thì không → bỏ việc gắn tên trong kit; renderer tự gọi `textureKey(director.kit.id, id)`.
4. **Khôi phục context WebGL xong nhưng thiếu atlas FX** → cờ `contextLost` vẫn còn khi tạo lại tài nguyên → xoá cờ trước `createResources`.
5. **Mất context: director cũ vẫn chạy khi texture chưa có** → khi mất context đặt `director = null` để nền cũ hiện, và `render()` được gọi mỗi khung để việc tải tiếp tục (`stage.ts`).
6. **Cá voi và tàu lộn ngược khi bay sang trái** → xoay ảnh vẽ nhìn nghiêng 180° → thêm `facing` và `mirror` để lật gương thay vì xoay (`director.ts` `startPass`; có test).

### C. Tích hợp và vận hành
7. **Chủ dự án chơi qua Portal nhưng không thấy nền mới** → BGV chỉ bật bằng `?bg=v2`, trong khi Portal nhúng `https://space.typing-game.local` không kèm tham số → bật mặc định, `?bg=legacy` để tắt (`main.ts`).
8. **Chạy `./play.sh` vẫn thấy ảnh cũ** → `play.sh` coi bản build là mới vì `src` không đổi; nó không xét `public/` → sau `bg:prepare` phải chạy `pnpm build:space`. Chưa sửa `play.sh` vì bản GitHub (#45) đang sửa file này; sửa ở máy lúc này sẽ chặn `git pull` (việc P1-3).
9. **Trình duyệt có thể giữ ảnh cũ tới 30 ngày** → nginx Play đặt `/assets/` là `expires 30d; Cache-Control: public, immutable`, và tên file không đổi khi ảnh đổi → gắn `?v=<sha16>` vào URL ảnh. nginx (`try_files $uri`) và Vite bỏ qua query khi tìm file; đã thử cả hai (`kit.ts`).
10. **`./dev.sh` sẽ dừng giữa chừng** → nó kéo code rồi `git submodule update` sang commit mới, trùng 5 file đang sửa → commit và ghép trước (mục 2.4). Trước đó dùng `pnpm dev:space` hoặc `./play.sh`.
11. **`pnpm install` lỗi `ERR_PNPM_IGNORED_BUILDS` vì `sharp`** → pnpm 11 chặn script build chưa được cho phép → `allowBuilds: sharp: false` trong `pnpm-workspace.yaml`. sharp dùng bản libvips dựng sẵn, không cần build.

### D. Đường ống xử lý ảnh
12. **Logo ✦ của Gemini trên mọi ảnh** → gỡ bằng mẫu độ đục và phép đảo chính xác (6.2, mục 1).
13. **`atlas-life` bị xếp thành 1 vật** → gom mảnh theo khung bao, nên khung của cá voi (vây dài) nuốt luôn các tàu bên cạnh → gom theo mặt nạ điểm ảnh đã nở ra, kèm cắt có mặt nạ (`detectObjects`, `cropObject`).
14. **Viền xanh quanh cá voi và xác tàu** → màu nền lem vào viền → khử màu ở dải viền 6 px.
15. **`hero-w02` có đĩa đen, `hero-w05` bị thủng** → cách tách nền đen cũ giữ cả vùng tối hoặc đục lỗ vùng tối bên trong → lõi đặc chỉ ở chỗ sáng ≥ 70, lấp lỗ kín nhỏ hơn 1,5% ảnh (`extractFromBlack`).
16. **`hero-w04` bản cũ có quầng nắng chạm mép, lộ hình chữ nhật vàng** → thêm làm mờ 5% sát mép. Sau đó chủ dự án tạo lại ảnh trên nền xanh, không có nắng (27/9, 20:49).
17. **`glow-a` bản cũ là lưới 2×2 các ô gần giống nhau** → `untile2x2` không nhận ra, vì các ô không giống hệt (độ lệch 28,3 > ngưỡng 6) → bỏ `glow-a` khỏi bố cục. Chủ dự án đã tạo lại thành ảnh đơn (20:49), **nhưng chưa được gắn lại vào bố cục** (việc P1-1).
18. **Chân thác nước `hero-w04` bị xanh lá** → bụi nước bán trong suốt mang màu nền xanh ra xa khỏi viền (10% điểm ảnh còn ngả xanh; một nửa còn bị coi là đặc) → thêm `unmixSpill`: tách màu nền khỏi vùng ngả màu nền nối liền với nền → còn 0,03%.
    - **Bẫy:** áp dụng cho cả atlas thì ánh xanh ngọc và viền răng cưa của thiên thạch, tàu cũng bị tách, làm chúng kém đặc (tàu nhỏ từ 83% xuống 62%, cá voi từ 91% xuống 85%).
    - **Cách xử lý:** chỉ áp dụng cho hero (`ensureTransparency(…, true)`). Atlas giữ cách cũ, đã kiểm tra độ đặc về đúng như trước.
    - Còn một chấm xanh nhỏ ở cửa sổ ngôi đền (vùng kín, không nối với nền).
19. **Ảnh nền nhỏ** (1672 và 1376 px so với khoảng 3300 điểm ảnh thật trên màn Retina) → ảnh hơi mềm, trông như bị phóng → script cảnh báo; chờ chủ dự án đồng ý phóng bằng AI (việc P1-2).

### E. Bố cục, theo góp ý của chủ dự án
20. **"Hình như bị zoom, không thấy nhiều thứ"**
    - Ảnh thật ra chỉ phóng thêm 6%. Màn hình bè ngang (khoảng 2,2:1) cắt khoảng 22% chiều cao ảnh 16:9, trúng thiên hà xoắn ở mép trên.
    - → thêm `PlateSpec.focus` và `plateAxisCenter` (tính trên CPU, truyền `uCenter` vào shader, luôn chừa chỗ cho biên độ trôi). World dùng ảnh nền A đặt `focus [0.5, 0.15]`, vì phần dưới ảnh A chỉ là nền trống.
21. **Hành tinh World 01 quá to** (95% chiều cao khung) → giảm còn 0,7, `anchor` [0.86, 0.72].
22. **Tàu và cá voi xuất hiện quá muộn, mỗi lúc một con**
    - Lần đầu phải chờ 5 giây + 50% chu kỳ (cá voi 40–65 giây). Mỗi lúc chỉ 1 sự kiện, mà xác tàu bay ngang tới 55–80 giây.
    - → lần đầu còn 3 giây + 20% chu kỳ; thêm 2 làn (1 lớn + 1 nhỏ) (`director.ts`; có test).
23. **"Sao cá voi trong suốt quá", "thiên thạch có cục rõ, có cục mờ xuyên thấu", "con tàu khổng lồ không nên có hiệu ứng như vậy"**
    - Ảnh cắt ra vẫn đặc 91–98%. Lỗi nằm ở cấu hình: cá voi đục 82%, xác tàu 78% (nhuộm tối, `blur` 0,8), thiên thạch xa 85% (`blur` 0,4), thiên thạch gần `blur` 1,3.
    - → mọi vật thể `alpha: 1`, `blur: 0` (tầng gần 0,3), nhuộm sáng hơn.
    - Shader sprite không làm thay đổi alpha, đã kiểm tra (`g01-celestial.ts`).
24. **Thiên thạch gần thành vệt đen** (lần duyệt ảnh chụp trước đó) → nhuộm quá tối và nhoè mạnh → nhuộm sáng hơn, sau đó bỏ nhoè hẳn (case 23).
25. **Chữ khó đọc trên ảnh nền A** (p95 độ sáng 142 > 120) → chỉnh exposure 0,9 và gamma 1,1–1,12 cho các World dùng ảnh A, cộng vignette 0,6.

### F. Test
26. **Test "vật thể không hiện ra giữa màn" quá thời gian khi chạy cả bộ** → gom các vi phạm lại rồi kiểm một lần.
27. **So sánh số thực bằng nhau bị sai** → bỏ hàm phụ `coverFit` (cũng là code chết), chuyển `applyColorMatrix` vào test.

### G. Quy trình
28. **Khuyên chủ dự án tạo lại `glow-a` và `hero-w04` khi hai ảnh này đã được tạo lại rồi** → Claude dựa vào thông tin cũ → trước khi khuyên tạo lại ảnh, luôn xem giờ sửa của file trong `art-src/`, xem `_out/report.json`, và mở ảnh ra xem.
29. **Hai dòng đường dẫn thừa ở cuối `G01_CHATGPT_PROMPT_PACK.md`** (chủ dự án tự thêm) → chưa xoá. Hỏi chủ dự án trước.

---

## 8. Việc còn lại, theo thứ tự ưu tiên

### P0 — Làm ngay
- **P0-1. Commit và ghép code** theo mục 2.4.
  - *Xong khi:* repo con có BGV trên `main`, repo gốc trỏ tới commit đó, `./dev.sh` chạy được, `pnpm test` và `pnpm build` đạt, nền mới hiện qua Portal.
- **P0-2. Chủ dự án chọn hệ nền cho Galaxy 01:** BGV (đang mặc định) hay World 01 "production-authored" của PR #126.
  - *Đề xuất:* giữ BGV cho World 01–05 (chủ dự án đã chơi và đồng ý hướng này), giữ hệ kia làm dự phòng qua `?bg=legacy` cho tới khi được duyệt xoá (plan §10).
  - Không tự xoá code của bên nào khi chưa được đồng ý.

### P1 — Nên làm tiếp
- **P1-1. Gắn `glow-a` (đã tạo lại) làm lớp tinh vân phía sau** trong `sheets()` của `g01-celestial.ts`. Ví dụ: `blend: "add"`, opacity khoảng 0,25–0,35, `front: false`.
  - Lớp này tự gộp vào lượt backdrop, chỉ thêm 1 lần đọc texture mỗi điểm ảnh.
  - Kiểm tra độ dễ đọc bằng `labels=1`. Đo GPU (High ≤ khoảng 3,5 ms trên UHD 630). Xin duyệt.
- **P1-2. Ảnh nền nét hơn.**
  - *Cách 1:* phóng ảnh 2 lần bằng AI, dùng Real-ESRGAN (miễn phí, mã nguồn mở) hoặc Upscayl. **Phải hỏi chủ dự án trước khi tải công cụ về máy.**
  - *Cách 2:* nhờ chủ dự án tạo lại ảnh nền tỉ lệ 21:9, độ phân giải cao nhất có thể. Hợp với khung 2,2:1, không bị cắt trên/dưới.
  - Lưu ý: ở bậc High, canvas nền chỉ khoảng 2050 px ngang (DPR 1,25), nên phần lợi chủ yếu thấy ở Ultra. Phóng xong phải xem lại báo cáo độ sáng.
- **P1-3. Sửa `play.sh`:** thêm `games/space-typing/public` vào danh sách nguồn của Space Typing. Làm sau khi đã ghép bản #45 của `play.sh`.

### P2 — Cải thiện
- **P2-1.** Chấm xanh nhỏ ở cửa sổ ngôi đền `hero-w04`: bỏ qua, hoặc nhờ tạo lại ảnh.
- **P2-2. Texture của World trước không được giải phóng** khi sang World khác cùng kit. `dropKitTextures` chỉ chạy khi đổi kit. Tệ nhất là giữ đủ 5 hero, khoảng 25 MB ở High. Có thể xoá texture không thuộc `compositionTextures` của World mới, sau khi director mới đã chạy.
- **P2-3. Đo lại hiệu năng bằng kit thật**, trên trình duyệt thật và Test Lab (plan §7.3). Các số ở 4.7 đo bằng bộ ảnh thử.
- **P2-4.** So `layered` với `blit` trên cùng cảnh laser, quầng sáng, nổ, khiên, nova (plan §4.2). Nếu không cần thì bỏ `layered`.

### P3 — Mở rộng
- **P3-1. Galaxy 02–10** theo plan §6 và §9 (giai đoạn E): mỗi Galaxy một bộ prompt, một kit, một file bố cục. Tên kit gợi ý có trong plan (`infernal`, `frost-prism`, `verdant`, …).
- **P3-2. Dọn code và ảnh cũ** theo plan §10. Galaxy nào được duyệt trên hệ mới thì xoá phần cũ của Galaxy đó.

---

## 9. Những điều không được làm

- Không vẽ cảnh bằng code (gradient, hình học, "thiên thạch lục giác") để thay ảnh thật.
- Không dùng ảnh CC0 độ phân giải thấp rồi kéo to toàn màn hình. Không trộn nhiều phong cách ảnh trong một Galaxy.
- Không tạo "biến thể giả" bằng cách chỉ đổi màu một ảnh rồi gọi là ảnh mới.
- Không làm vật thể trong suốt hoặc nhoè để giả chiều sâu.
- Không đặt tính năng cần duyệt sau tham số URL. Portal không truyền tham số.
- Không báo "xong" chỉ vì test đạt. Phải có ảnh chụp ở kích thước thật và được chủ dự án duyệt.
- Không sửa `play.sh`, `dev.sh` hay các file trùng với bản GitHub trước khi ghép code (mục 2.4).
- Không chạy `./dev.sh` khi repo con còn thay đổi chưa commit.
- Không commit ảnh trong `art-src/` (ảnh gốc, nặng, chỉ ở máy chủ dự án). Git chỉ theo dõi `art-src/README.md`. Không đặt ảnh gốc vào `public/`, vì Vite sẽ chép chúng vào mọi bản build. Nhắc chủ dự án tự sao lưu thư mục này.
- Không sửa tay `kit.json` hay các file WebP trong kit. Luôn chạy lại `pnpm bg:prepare`.
- Không áp dụng `unmixSpill` cho atlas (case 18).
- Không tải hay chạy công cụ bên ngoài (Real-ESRGAN, v.v.) khi chủ dự án chưa đồng ý.

---

## 10. Checklist trước khi báo "xong"

- [ ] `pnpm test` đạt (ghi số test).
- [ ] `pnpm build` đạt (gồm `check-background-art.mjs`).
- [ ] Nếu ảnh đổi: đã chạy `pnpm bg:prepare …` và `pnpm build:space`.
- [ ] Đã chụp ở 1642×799, DPR 2, qua Portal hoặc `https://space.typing-game.local/`, sau khoảng 25 giây trong trận (để có tàu hoặc cá voi bay ngang).
- [ ] Đã xem gallery 5 World (`grid=1`) và bật chữ mẫu (`labels=1`) để kiểm tra độ dễ đọc.
- [ ] Vật thể đặc, không có viền xanh/tím. Đo độ đặc từng khung nếu có nghi ngờ (Phụ lục A).
- [ ] Nếu đụng tới shader hoặc số lượng vật thể: đã đo GPU ở High (mục tiêu ≤ khoảng 3,5 ms trên UHD 630).
- [ ] Báo chủ dự án bằng tiếng Việt: đã làm gì, chỉ cần tải lại trang (Cmd+R), và ảnh chụp ở đâu.

---

## Phụ lục A — Lệnh chẩn đoán

**Trong gallery (chế độ dev), mở DevTools console:**

```js
window.__bgGallery                                  // số liệu chẩn đoán của ô đầu tiên
const stage = window.__bgGalleryCells[0].stage;     // BackgroundStage
stage.diagnostics();     // active, world, tier, loadLevel, dpr, textureMB, sprites, pendingUploads, renderP95Ms
stage.triggerPass();     // gọi 1 sự kiện bay ngang ở làn còn trống (luôn ưu tiên cá voi trước)
stage.triggerMeteorShower();

// Chỉ để gỡ lỗi (trường private của TypeScript vẫn đọc được lúc chạy):
const d = stage.director;
const p = d.passes.find((q) => q.spec.id === "derelict");
d.startPass(p); p.start = d.clock - p.duration * 0.5;   // đặt xác tàu vào giữa đường bay
```

**Chụp màn hình không cần mở trình duyệt:**
- Chạy Chrome `--headless=new --remote-debugging-port=<cổng>`.
- Qua CDP: `Emulation.setDeviceMetricsOverride({ width: 1642, height: 799, deviceScaleFactor: 2 })`, rồi `Page.navigate`.
- Bấm `#startButton` để vào trận, chờ, rồi `Page.captureScreenshot`.
- Script Claude đã dùng nằm ngoài repo; viết lại theo mô tả này là đủ.

**Đo GPU:** dùng `EXT_disjoint_timer_query_webgl2` bọc quanh `renderer.draw()`. Khởi động khoảng 60 khung, rồi lấy trung vị của 3 lần × 60 khung. Không dùng `gl.finish()`.

**Đo độ đặc của từng khung atlas** (dùng sharp):
- Đọc `kit.json` và bản WebP lớn nhất.
- Với mỗi khung, đếm điểm ảnh alpha > 8 (phần được phủ). Trong số đó, tính % điểm alpha ≥ 250 (đặc) và alpha trung bình.
- Mức tham khảo hiện tại: thiên thạch đặc 95–98%, cá voi 91%, xác tàu 95%, tàu nhỏ khoảng 80–83% (tàu nhỏ nên viền chiếm tỉ lệ lớn).

**Tìm màu nền còn sót:** đếm điểm có `g − max(r, b) > 24` trong các điểm alpha > 8. Hiện tại: hero-w04 0,03%, atlas-life 0,88% (các chấm đèn nhỏ), atlas-rocks 0%.

**Xem phần ảnh nền đang hiện:**
- Tỉ lệ phủ `s = max(vw/W, vh/H) × overscan`.
- Phần thấy được: rộng `vw/s`, cao `vh/s` (tính bằng điểm ảnh của ảnh).
- Ví dụ ảnh A ở khung 1642×760: thấy 94% chiều ngang và 78% chiều cao.

## Phụ lục B — Bộ ảnh hiện tại trong game

`public/assets/space-typing/backgrounds/g01-celestial/`, khoảng 3,4 MB, version `3777276518`:

| Texture | Các cỡ (px) | Tỉ lệ | Kiểu | Dùng ở |
|---|---|---|---|---|
| `plate` | 1280 / 1672 | 1,777 | clamp | World 01, 03, 05 |
| `plate-b` | 1376 | 1,792 | clamp | World 02, 04 |
| `glow-a` | 1024 | 1 | repeat + mip | **chưa dùng** (P1-1) |
| `glow-b` | 1024 | 1 | repeat + mip | lớp phía trước, High+ |
| `dust` | 1024 | 1 | repeat + mip | mặt nạ bụi, gộp backdrop |
| `hero-w01` | 512 / 995 | 1,345 | clamp + mip | World 01 |
| `hero-w02` | 512 / 1011 | 1,009 | clamp + mip | World 02 |
| `hero-w03` | 512 / 1000 | 1,017 | clamp + mip | World 03 |
| `hero-w04` | 512 / 903 | 0,976 | clamp + mip | World 04 (bản nền xanh, đã tách bụi nước) |
| `hero-w05` | 512 / 1006 | 1,034 | clamp + mip | World 05 |
| `atlas-rocks` | 512 / 1024 | 1 | clamp + mip | 12 khung `rocks-00…11` |
| `atlas-life` | 1024 / 2048 | 1 | clamp + mip | 10 khung `life-00…09` |

Ảnh gốc (`art-src/g01/`, chỉ ở máy chủ dự án):

| Ảnh | Cỡ (px) |
|---|---|
| `g01-plate.png` | 1672×941 |
| `g01-plate-b.png` | 1376×768 |
| glow, dust, 5 hero | 1024×1024 |
| 2 atlas | 1200×896 |
