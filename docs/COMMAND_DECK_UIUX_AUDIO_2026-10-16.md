# Bàn giao: màn hình chính "Command Deck", hiệu ứng menu, âm thanh giao diện, cài đặt chuyển động (16/10/2026)

> **Dành cho:** chủ dự án và AI làm tiếp (Claude, ChatGPT, Codex).
> **Yêu cầu gốc:** màn `https://typing-game.local/space-typing` là bộ mặt của game, cần đẹp hơn: bố cục tốt hơn (được phép dài ra và cuộn), hình ảnh, âm thanh, hiệu ứng tốt hơn; hiệu ứng rê chuột và bấm ở ngoài trận cũng phải tốt.
> **Giữ nguyên:** phong cách Holo Command (chủ dự án chọn ngày 03/10), mọi `id` cũ của nút, mọi luồng xử lý cũ. Không có số liệu giả: mọi con số lấy từ bản lưu.

## 0. Tóm tắt

| Phần | Đã làm |
|---|---|
| Màn hình chính | Bố cục mới, cuộn được: màn đầu gồm nhiệm vụ Campaign, phi thuyền trưng bày 3D, bảng "Hôm nay"; bên dưới là 3 thẻ chế độ, lộ trình 10 Galaxy, đội tàu. |
| Tàu 3D | Phi thuyền đang chọn dựng bằng bộ "relief hull" của Duel: ánh sáng thật, bóng đổ, phản chiếu, chao theo chuột, lửa động cơ đúng vòi phun. |
| Hiệu ứng menu | Mọi nút bấm toả vòng sáng và tia lửa; thẻ có viền sáng theo chuột; vào trận có cảnh phóng tàu; quay về có cảnh các bảng trượt vào. |
| Âm thanh giao diện | 13 mẫu âm thật (Kenney, CC0) thay âm tổng hợp; phát qua Web Audio, đổi cao độ nhẹ mỗi lần, lệch trái/phải theo vị trí chuột; thêm tiếng bấm cho mọi nút và tiếng "Deploy". |
| Cài đặt chuyển động | **Nguyên nhân chính khiến menu "đứng im":** Windows trên máy chủ dự án tắt *Animation effects*, nên Chrome báo "giảm chuyển động" và game tắt gần hết hiệu ứng (cả hiệu ứng 3D màn kết quả). Nay game có cài đặt riêng, mặc định **Full**. |
| Sửa lỗi | Cảnh báo đồng bộ đám mây ("Cloud save unavailable…") không còn bật thành hộp thoại chặn. |

## 1. Màn hình chính (Command Deck)

### 1.1 Bố cục
- **Thanh trên** (dính ở đỉnh, chuyển sang nền kính khi cuộn): thẻ phi công gọn một hàng (tên, cấp, tiến độ, Warp, Credits), các nút công cụ. Dải thông tin giữa chỉ hiện khi màn rộng hơn 1500 px.
- **Màn đầu** (3 cột):
  - **Trái:** logo "SPACE TYPE" (chữ SPACE có vệt sáng chạy), thẻ Campaign: Galaxy/World hiện tại, thanh 20 ô của World (ô đã qua, ô đang chọn, ô mini boss 10, ô boss 20), nhãn "boss kế tiếp", nút **Deploy** lớn có quầng sáng.
  - **Giữa:** phi thuyền trưng bày trên bệ hologram (vòng quỹ đạo, tia sáng xoay, lửa động cơ), tên tàu, vai trò, cấp, nút "Change ship".
  - **Phải:** bảng **Today**: chuỗi ngày học (ngọn lửa đổi màu ở 1/7/30 ngày) và vòng mục tiêu từ trong ngày; bài học hằng ngày (5 ô); nhiệm vụ ngày; quà điểm danh; Warp miễn phí theo khung giờ; thư. Mỗi dòng mở đúng hộp thoại; có chấm đỏ khi có quà.
- **Hàng thẻ chế độ:** Expedition (vàng), Recall (xanh lá), Duel (đỏ). Chỉ nút Deploy được tô đặc; các nút chính khác là kính viền màu, rê chuột mới tô đặc, để mắt luôn thấy bước tiếp theo.
- **Cuộn xuống:**
  - **Lộ trình 10 Galaxy:** ảnh nền Galaxy, chân dung boss Tyrant, tiến độ 100 màn; Galaxy chưa mở chỉ hiện bóng đen của boss. Bấm vào Galaxy đã mở thì mở Stage Select đúng Galaxy đó.
  - **Đội tàu:** 11 phi thuyền (ảnh atlas, 1 tệp 781 KB), tàu đang bay, cấp, màn mở khoá.
- **Thanh dưới (dock)** dính ở đáy khi cuộn.
- **Màn nhỏ:** đã kiểm tra 1907×856, 1642×799, 1366×768, 1280×720 (nội dung màn đầu không bị dock che), 1100 px (2 cột, ẩn tàu trưng bày) và dưới 760 px (1 cột).

### 1.2 Tệp
| Tệp | Nội dung |
|---|---|
| `index.html` (`#titleOverlay`) | Cấu trúc mới: `.th-hero`, `#titleShowcase`, `#titleToday`, `#titleRouteSection`, `#titleFleetSection`. Mọi `id` cũ giữ nguyên. |
| `src/ui/title-home.ts` | Vẽ bảng Today, thanh World, lộ trình, đội tàu; hiệu ứng cuộn (thanh trên, làm tối nền, hiện dần từng khu); tàu nghiêng theo chuột. Chỉ vẽ lại khi HTML đổi. |
| `src/ui/title-home.css` | Toàn bộ kiểu của Command Deck, chuyển động vào/ra, responsive. |
| `src/ui/title-ship3d.ts` | Tàu 3D trưng bày (xem mục 2). |
| `src/ui/title-hub.ts` | Thêm `renderHome` (gọi cùng `render`), ảnh `#titleHeroShip`, làm mới đồng hồ đếm ngược mỗi 30 giây. |
| `src/main.ts` | `titleHomeData()` / `titleToday()`: lấy số thật từ `liveOps`, `lessonsToday()`, `campaign`, `characters`; làm mới khi live-ops hoặc bài học đổi; cảnh phóng tàu trong `presentStageTransition`; cảnh vào lại trong `renderPhase`. |
| `src/enemies/painted-sprites.ts` | `paintedBossThumbUrl` (ảnh boss bản nhẹ cho thẻ Galaxy). |
| `tests/title-home.test.ts` | Ngọn lửa chuỗi, đếm màn theo Galaxy, nhãn boss kế tiếp. |

### 1.3 Hiệu năng
- Các bảng mới **không dùng `backdrop-filter`**, vì nền phía sau vẽ lại mỗi khung.
- Chuyển động chỉ dùng `transform` và `opacity`.
- Ảnh lộ trình, ảnh boss tải lười (`loading="lazy"`).
- Khung hình màn chính đo được (1907×856, Chrome, dev server):
  - có tàu 3D: trung vị **12,6 ms**, p95 **16,8 ms**;
  - tàu 3D chỉ vẽ khi màn chính đang hiện và khu trưng bày nằm trong màn hình.

## 2. Tàu trưng bày 3D (`src/ui/title-ship3d.ts`)
- Dùng `DuelShip3D.loadFresh(<tàu đang chọn>, "self")`, cùng bộ dựng với Duel (nạp khoảng 0,65 giây, chạy nền).
- Chuyển động:
  - chao và quay nhẹ theo thời gian, nghiêng theo chuột;
  - đèn thân thỉnh thoảng loé (đèn nòng súng của mô hình);
  - lửa động cơ hai lớp (lõi nóng + quầng) vẽ đúng vị trí vòi phun chiếu ra từ mô hình.
- Mức chất lượng:
  - **Low**, không có WebGL hoặc nạp lỗi: giữ ảnh vẽ phẳng;
  - **Medium:** vẽ cách một khung.
- Đổi tàu trong Hangar thì tự nạp tàu mới.

## 3. Hiệu ứng rê chuột, bấm và chuyển cảnh
- **Bấm** (`src/ui/holo-motion.ts`, `src/ui/ui-fx.css`):
  - mọi nút, thẻ Galaxy, thẻ tàu toả lõi sáng, vòng sáng và 9 tia;
  - màu theo vùng (`--fx-color`): thẻ chế độ dùng màu riêng, chuỗi ngày màu cam;
  - hiệu ứng cũng chạy trong hộp thoại (gắn vào đúng hộp thoại đang mở).
- **Rê chuột:** các dòng Today trượt nhẹ, có mũi tên; thẻ chế độ sáng viền theo màu; thẻ Galaxy phóng to ảnh và boss nhô lên; thẻ tàu nổi lên.
- **Deploy:**
  - tàu hạ nhẹ rồi phóng vụt lên, các bảng rơi xuống mờ đi, loé sáng, có tiếng "Deploy" (0,42 giây);
  - sau đó mới hiện thẻ chuyển cảnh "Rainbow Reach…" như cũ.
- **Quay về màn chính:** cuộn về đầu trang; thanh trên, cột trái, tàu, bảng Today, thẻ chế độ lần lượt trượt vào.

## 4. Âm thanh giao diện
- **Tệp:** `src/assets/audio/ui/*.ogg` (13 tệp, khoảng 150 KB), nguồn và giấy phép ghi ở `public/assets/audio/ATTRIBUTION.md`.
- **Cách phát** (`Sfx.uiFile`):
  - giải mã thành bộ đệm Web Audio sau cú bấm đầu tiên;
  - đổi cao độ ngẫu nhiên ±3–7%;
  - đi qua bộ giới hạn chung; lệch trái/phải theo chuột;
  - chưa giải mã xong thì dùng `HTMLAudio`; không có tệp thì dùng âm tổng hợp cũ.
- **Mức to** (đỉnh, ở mức SFX mặc định 50%):

  | Tiếng | Mức |
  |---|---|
  | rê chuột | khoảng -34 dBFS |
  | bấm | -26 |
  | mở/đóng bảng | -24 |
  | xác nhận | -20 |
  | quà lớn | -14 |
  | Deploy | -12 |

  - AI không nghe được, nên mức được đặt theo số đo. **Chủ dự án nghe thử**; muốn đổi thì sửa số `gain` trong `Sfx.ts` (ghi chú trên `uiHover`).
- **Tiếng mới** (`Game.playUiCue`):
  - `click`: mọi nút ngoài trận;
  - `confirm` (`Sfx.uiAccept`): xác nhận trong menu;
  - `deploy`: lúc xuất kích.
  - Âm "bank" của Duel vẫn dùng `uiConfirm` cũ, để giữ hướng âm thanh không có tiếng chuông cao.

## 5. Cài đặt chuyển động giao diện (`src/ui/motion-preference.ts`)
- **Vấn đề:** Windows tắt *Animation effects* (thường bật vì máy yếu, không phải vì người dùng nhạy cảm với chuyển động) → `prefers-reduced-motion: reduce`. Khi đó:
  - mọi hiệu ứng menu, mở/đóng hộp thoại, gợn sóng bị tắt;
  - **hiệu ứng 3D màn Stage Complete / Run Over cũng không chạy** (`result-fx.ts`).
- **Cách làm:**
  - **Settings → Visual → Interface motion:** `Full` (mặc định), `Follow device setting`, `Reduced`. Lưu ở `localStorage` (`spaceTypingMotionV1`).
  - **JS:** mô-đun được nạp đầu tiên trong `main.ts` và thay `matchMedia("(prefers-reduced-motion: reduce)")` để trả lời theo cài đặt này. Mọi chỗ kiểm tra cũ tự đi theo, không phải sửa từng chỗ.
  - **CSS:** plugin PostCSS trong `vite.config.ts` đổi mọi khối `@media (prefers-reduced-motion: reduce) {…}` thành `[data-motion="reduced"] …`. Mô-đun giữ thuộc tính `data-motion` trên `<html>`.
- Nếu máy báo "giảm chuyển động", dòng cài đặt ghi rõ lý do.

## 6. Sửa lỗi khác
- `src/ui/blocking-notice-bridge.ts`:
  - thông báo bắt đầu bằng "Cloud save" hoặc có "saved on this device" không còn bị đẩy thành hộp thoại chặn;
  - trước đây, bấm Deploy khi mất kết nối đám mây sẽ hiện hộp thoại "This action cannot continue yet".
- `src/ui/runtime-quick-controls.ts`: khối CSS chèn bằng JS dùng `[data-motion="reduced"]`.

## 7. Kiểm tra đã chạy
- `tsc --noEmit`: các tệp của đợt này không có lỗi.
- `vitest`: 13 tệp liên quan (giao diện, âm thanh, Warp, tooltip, bố cục kết quả, `title-home`) đều qua.
- Ảnh chụp tự động (Chrome thật trên Windows, GPU thật): màn đầu, khi cuộn, rê chuột, bấm (làm chậm 10 lần), phóng tàu, quay về, màn kết quả, 4 cỡ màn hình. Ảnh trong `.visual/claude/`.

## 8. Chạy và chụp trên máy chủ dự án (Windows + WSL)
- git, node, pnpm chỉ có trong WSL. Chrome dùng bản Windows.
- **Vite trong WSL không nhận sự kiện đổi tệp** khi tệp được sửa từ Windows (ổ `/mnt/d`), nên dev server tạm phải dò định kỳ:
  - `pnpm exec vite --config .visual/claude/vite.poll.config.ts --port 3098`;
  - bản không HMR (để chụp ổn định): `.visual/claude/vite.stable.config.ts --port 3097`.
- Bản Play (`https://typing-game.local/space-typing`) cần `pnpm build:space` rồi tải lại trang.

## 9. Mô hình 3D: quy trình Tripo3D / Meshy → Blender (cập nhật 17/10)
- **Chia việc:** chủ dự án tạo mô hình trên Tripo3D/Meshy theo prompt ở `docs/art-requests/3D_TRIPO_MESHY_PROMPTS_2026-10-16.md` (109 món, tạo tự động bằng `node scripts/models/build-3d-prompt-pack.mjs`), tải GLB vào `art-src/3d/`, cùng đường dẫn và cùng tên với ảnh 2D (từ 21/10; quy tắc ở `art-src/README.md`). AI chỉnh trong Blender rồi đưa vào game.
- **Script Blender** `scripts/models/blender/space_typing_model_tools.py` chạy được không giao diện:
  - `blender -b --factory-startup -P … -- --input <file> --kind <loại> --id <id> --project <games/space-typing>`;
  - tuỳ chọn: `--auto-emissive <tỉ lệ>`, `--boss-clips`, `--keep-geometry`, `--preview <thư mục>`.
- **Việc script làm thêm:**
  - tự tạo bản đồ phát sáng từ màu gốc;
  - đặt điểm gắn của tàu theo hình học;
  - hoạt ảnh boss bằng xương, tự nhận vai trò xương từ các điểm `FX_*`;
  - ảnh xem trước để soi.
- **Đã làm với boss G01:** thêm `Boss_Hit` (12 khung), `Boss_Death` (48 khung), `Boss_Intro` (60 khung) bằng xương, không di chuyển gốc; thêm bản đồ phát sáng (5% điểm ảnh: cánh pha lê, lõi). `pnpm models:prepare`: High 4,03 MB, Medium 1,68 MB.
- **Blender trên máy chủ dự án:** chưa cài; AI dùng bản chạy liền 4.5.14 LTS tải về thư mục tạm của phiên.

## 10. Còn mở
- Chủ dự án nghe và duyệt mức âm giao diện; chọn lại mẫu âm nếu muốn (bộ Kenney đầy đủ đã tải, 303 tệp).
- Có thể thay ảnh vẽ cho bảng Today, rương, lịch (`docs/art-requests/LIVEOPS_UI_2D_AUDIO_2026-10-16.md`); hiện đang dựng bằng CSS.
- Bảng xếp hạng chưa có, nên màn chính chưa có khu "Cộng đồng".
