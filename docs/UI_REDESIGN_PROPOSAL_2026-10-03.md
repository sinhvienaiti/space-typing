# Đề xuất thiết kế lại giao diện Space Typing (2026-10-03)

Người viết: Claude. Trạng thái: chủ dự án **chọn phương án A** (2026-10-03). Đợt 1 (khung giao diện) và đợt 2 (sảnh Duel kèm danh sách phòng chờ) **đã làm**; xem mục 7.

## 1. Yêu cầu

Chủ dự án (2026-10-03), kèm 2 ảnh mẫu của web Bufopia:
- Giao diện xử lý chưa tốt.
- Cần các nút biểu tượng để chỉnh âm thanh, giọng nói, cài đặt, xem thứ hạng, và một số tính năng chơi online.
- Game sau này sẽ phục vụ chơi online.
- Thiết kế lại: màn mở đầu, danh sách phòng chờ, phần tạo phòng. Phong cách đẹp hơn, font hợp lý hơn.

## 2. Học từ ảnh mẫu (Bufopia)

- **Một chủ đề xuyên suốt.** Nền vẽ, khung, nút và chữ đều cùng một phong cách.
- **Góc trên phải** có hàng nút tròn: bạn bè, thứ hạng, âm thanh, cài đặt. Bấm một lần là tới, không phải mở menu sâu.
- **Góc trên trái** có thẻ người chơi: ảnh đại diện, tên, cấp, chuỗi ngày, thanh kinh nghiệm.
- **Dải trên cùng** tôn vinh top 3, tạo động lực.
- **3 thẻ chế độ lớn**, mỗi thẻ có hình minh họa, một câu mô tả và đúng một nút chính.
- **Không gian online** ("Square") có số người online, danh sách và khung trò chuyện.

## 3. Hiện trạng (đã kiểm tra mã)

Ảnh chụp bản đang chạy: `.visual/ui/now-start.png`, `.visual/ui/now-sheet.jpg`.

- **Màn mở đầu là một cột dài khoảng 25 nút** giống nhau, mỗi nút kèm dấu "ⓘ". Màn 1642×799 phải cuộn mới thấy hết. Không có thứ bậc: nút chính, nút phụ và cửa hàng trông như nhau.
- **Không có phông chữ riêng.** Không nạp web font nào. `:root` ghi `Inter`, nhưng chỉ hiện khi máy người chơi tình cờ đã cài; thường rơi về phông hệ thống.
- **Không có bộ màu chung.** `styles.css` dài 5.213 dòng, có 237 mã màu khác nhau. Có lỗi nhỏ: `var(--muted)` và `var(--accent)` được dùng ở khoảng 10 chỗ nhưng chưa định nghĩa.
- **Chưa có nút biểu tượng** (âm thanh, thứ hạng, online…), cũng chưa có thẻ người chơi. Âm thanh chỉ chỉnh được trong hộp Settings.
- **Duel:** một hộp thoại nhỏ có 3 tab.
  - Tạo phòng là một lưới 14 ô thả xuống chữ nhỏ.
  - Vào phòng chỉ bằng mã.
  - **Chưa có danh sách phòng chờ**: máy chủ không có lệnh liệt kê phòng, dù đã có lựa chọn Public/Private.
- Khoảng 22 hộp thoại dùng chung một khung `.settings-dialog`. Đổi khung này là đẹp lên hết cùng lúc.

## 4. Ba phương án (cùng bố cục, khác phong cách)

Ảnh demo nét cao (1642×799, DPR 2), dùng ảnh thật của game:

| | Màn mở đầu | Sảnh Duel + danh sách phòng | Tạo phòng |
|---|---|---|---|
| So sánh cả 3 | `.visual/ui/demo-menu-ABC.jpg` | `.visual/ui/demo-list-ABC.jpg` | `.visual/ui/demo-create-ABC.jpg` |
| A | `demo-menu-a.jpg` | `demo-list-a.jpg` | `demo-create-a.jpg` |
| B | `demo-menu-b.jpg` | `demo-list-b.jpg` | `demo-create-b.jpg` |
| C | `demo-menu-c.jpg` | `demo-list-c.jpg` | `demo-create-c.jpg` |

- **A · Holo Command:** bảng kính mờ kiểu hologram, góc vát, viền xanh lơ phát sáng.
  - Chữ tiêu đề Exo 2, chữ thường Be Vietnam Pro.
  - Hợp không khí bắn tàu khoa học viễn tưởng.
- **B · Cosmic Arcade:** khối dày bo tròn, nút nổi 3D có gờ dưới, nút tròn màu trắng ở góc phải. Gần ảnh mẫu Bufopia nhất: thân thiện, dễ dùng cho người học.
  - Chữ tiêu đề Baloo 2, chữ thường Nunito.
- **C · Starliner Premium:** phẳng, gọn, kiểu game lớn hiện đại. Một màu nhấn vàng cam, chỉ nút chính tô đặc.
  - Chữ tiêu đề Chakra Petch, chữ thường Inter.

Cả 6 phông đều có đủ dấu tiếng Việt (nghĩa từ vựng trong game là tiếng Việt). Khi làm thật sẽ đóng gói phông vào game (gói `@fontsource`), không tải từ mạng, nên chơi ngoại tuyến vẫn đúng chữ.

**Bố cục chung (giữ nguyên dù chọn phương án nào):**
- **Thanh trên:**
  - Thẻ phi công: tàu đang chọn, tên, cấp, credit, chuỗi ngày.
  - Dải "Top pilots".
  - 6 nút biểu tượng: Thứ hạng · Pilots online · Nhạc · Âm thanh · Giọng đọc · Cài đặt.
  - Bấm nút Âm thanh mở bảng nhỏ có 4 thanh trượt: nhạc, hiệu ứng, credit, giọng đọc. Bấm vào biểu tượng để tắt nhanh.
- **Giữa:** logo, rồi 4 thẻ chế độ, mỗi thẻ có ảnh và một nút chính:
  - Campaign (thẻ chính, to nhất: nút "Continue · Stage 001", "Stage select", "Briefing", chọn Combat/Recall);
  - Expedition (Daily, Ghost);
  - Recall;
  - Duel (số người online).
- **Thanh dưới:** 9 ô chức năng có biểu tượng: Hangar, Equipment, Tactical, Hotbar · Vocabulary, Missions, Codex · Shops, Data. Có chấm báo khi có việc mới.
- **Sảnh Duel toàn màn hình:**
  - Bên trái: thẻ phi công kèm hạng, thắng/thua, nút đổi tàu; trận xếp hạng; tạo phòng; nhập mã; luyện với máy.
  - Giữa: **danh sách phòng chờ** có ảnh bản đồ, luật (Bo3 · 4 phút · mức nguy hiểm), chủ phòng và hạng, số người, khóa mật khẩu, nút Join hoặc Watch; lọc All/Open/Friends, tìm kiếm, làm mới.
  - Bên phải: pilots online và khung trò chuyện.
- **Tạo phòng:**
  - Chọn bằng nút bấm thay cho ô thả xuống: Public/Private, Bo1/3/5, 3/4/5 phút, giữ hay đổi bản đồ.
  - Chọn bản đồ bằng ảnh (6 bản đồ và Ngẫu nhiên).
  - Các tùy chọn nâng cao gom vào một dòng có nút "Edit".

## 5. Kế hoạch triển khai sau khi chọn

**Đợt 1: khung giao diện** (chỉ phía trình duyệt; giữ nguyên mọi `id` mà mã và test đang dùng)
1. Bộ màu, bo góc, bóng và phông chữ chung trên `:root`. Đóng gói phông vào game. Sửa lỗi `--muted` / `--accent` chưa định nghĩa.
2. Bộ biểu tượng SVG dạng nét (giấy phép ISC). Thay các ký tự "ⓘ ⏭ ♪".
3. Thanh trên:
   - thẻ phi công;
   - 6 nút biểu tượng;
   - bảng âm thanh nhanh, nối vào cài đặt có sẵn (`musicVolume`, `sfxVolume`, `creditVolume`, `pronunciationVolume`).
4. Màn mở đầu mới: 4 thẻ chế độ và thanh dưới. Phần giải thích "ⓘ" chuyển thành chú thích hiện khi rê chuột.
5. Đổi khung hộp thoại chung, áp cho cả 22 hộp thoại, Settings và màn kết quả.
6. Bố cục cho màn hẹp (laptop nhỏ, điện thoại ngang).

**Đợt 2: Duel**
1. Sảnh Duel toàn màn hình và màn tạo phòng mới.
2. **Danh sách phòng chờ cần thêm ở máy chủ:**
   - lệnh `LIST_ROOMS` / `ROOM_LIST` (chỉ phòng Public, kèm bản đồ, luật, số người, có mật khẩu hay không);
   - máy chủ tự gửi cập nhật khi phòng mở, đầy hoặc đóng;
   - thêm test giao thức.
3. Chọn tàu ngay trong sảnh. Hiện nay tàu lấy theo tàu đang chọn ở Campaign.
4. Thẻ hai bên trong phòng chờ có ảnh tàu, hạng và trạng thái sẵn sàng (đang chỉ có chữ).

**Đợt 3: tính năng online**

Cần máy chủ có tài khoản. Phần nào chưa có dữ liệu thì ẩn đi, hoặc ghi "Coming soon", không hiện số giả.
- Bảng xếp hạng.
- Số người online và danh sách pilots online (cần máy chủ theo dõi ai đang kết nối).
- Trò chuyện trong sảnh (cần lọc lời lẽ, chặn và báo cáo người dùng).
- Bạn bè và mời vào phòng.

**Dữ liệu chưa có trong game** (thẻ phi công trong demo đang dùng số mẫu):
- cấp và kinh nghiệm phi công, chuỗi ngày đăng nhập;
- tên phi công dùng chung (hiện Duel có ô "Pilot name" riêng);
- hạng Duel dạng bậc (Silver II…); hiện chỉ có điểm 1000.

Sẽ dùng thứ đã có: tàu đang chọn, credit, tiến độ Campaign, điểm Duel. Phần còn lại thêm dần.

**Hiệu năng:** hiệu ứng làm mờ nền (phương án A) chỉ dùng ở menu, không dùng khi đang chơi. Sẽ đo thời gian mở menu và số khung hình trước và sau.

## 6. Tệp demo

- Trang demo (cần `pnpm dev`, cổng 3004):
  - `.visual/ui-mock/menu.html?theme=a|b|c&sound=1`
  - `.visual/ui-mock/lobby.html?theme=a|b|c&view=list|create`
- Mã demo: `.visual/ui-mock/theme.css` (3 bộ màu và chữ), `lobby.css`, `icons.js`.
- Chụp lại: `node scripts/visual/shot.mjs "http://127.0.0.1:3004/.visual/ui-mock/menu.html?theme=b" .visual/ui/x.png --width=1642 --height=799 --dpr=2 --wait=2000`.

## 7. Đã làm theo phương án A (2026-10-03)

### 7.1 Đợt 1: khung giao diện
- **Phông chữ:** gói `@fontsource/exo-2` (600, 700, 800, 800 nghiêng) và `@fontsource/be-vietnam-pro` (400–700), đóng gói vào game, có bảng chữ tiếng Việt. Nạp ở đầu `src/main.ts`. `:root` dùng Be Vietnam Pro; tiêu đề dùng Exo 2. Chữ nghĩa tiếng Việt khi hạ địch (`kill-translation.css`) cũng dùng Be Vietnam Pro.
- **Bộ màu chung** trên `:root` trong `src/ui/holo.css`: `--holo-*` (chữ, màu nhấn `#5fe3ff` → `#a07bff`, kính, viền, góc vát 14 px). Định nghĩa luôn `--muted` và `--accent`, sửa khoảng 10 chỗ trước đây dùng mà chưa có biến.
- **Kiểu dùng chung**, áp cho cả game:
  - nút, nút `.primary` (dải màu, chữ Exo 2);
  - ô nhập, thanh trượt (màu nhấn), viền khi chọn bằng bàn phím;
  - khung hộp thoại `.settings-dialog` (khoảng 22 hộp: kính, góc vát, tiêu đề in hoa Exo 2);
  - nút đóng, mục Settings;
  - thẻ pause, game over, kết quả.
- **Biểu tượng:** `src/ui/icons.ts`, khoảng 45 biểu tượng nét (kiểu Lucide, giấy phép ISC).
  - Gắn bằng `data-icon="tên"` và vẽ bằng mặt nạ CSS trong `::before`. Vì vậy mã đổi `textContent` của nút (ví dụ "Continue · Stage 002") vẫn giữ biểu tượng.
  - `iconSvg()` trả SVG cho các chỗ dựng bằng chuỗi.
- **Chú thích nổi:** `src/ui/holo-tooltip.ts`, một chú thích chung cho mọi `data-tip`, gắn vào `<body>` nên không bị góc vát cắt mất. Mô tả "ⓘ" cũ (`installMenuHelp`) nay thành `data-tip`.
- **Màn mở đầu (`#titleOverlay`, `index.html`):**
  - Thanh trên:
    - thẻ phi công: tàu đang chọn, tên, cấp, thanh tiến độ Stage x / 1000, credit;
    - dải trạng thái: đếm ngược Daily Expedition (nửa đêm UTC), stage cao nhất, số tàu đã mở;
    - 6 nút: Records, Duel lobby, Nhạc bật/tắt, Bảng âm thanh, Giọng đọc bật/tắt, Settings (`#settingsButton`).
  - Bảng âm thanh có 4 thanh trượt: nhạc, hiệu ứng, credit, giọng đọc. Nối thẳng vào `settings` và lưu ngay. Bấm biểu tượng để tắt; mức cũ được nhớ trong `spaceTypingQuickRestoreV1`.
  - Bảng Records chỉ hiện số liệu thật trên máy, kèm ghi chú "bảng xếp hạng toàn cầu sẽ có khi có tài khoản online".
  - Giữa: logo và 4 thẻ chế độ:
    - Campaign: ảnh nền đổi theo galaxy của stage đang chọn; ảnh tàu là tàu đang chọn; nút chọn Combat/Recall; Continue, Stage select, Briefing;
    - Expedition: các nút do `src/expedition/ui.ts` thêm vào `#titleExpeditionActions`, nhãn nay là "Launch" / "Resume run";
    - Recall (`#titleRecallStartButton`: chuyển sang Recall rồi bắt đầu);
    - Duel.
  - Thanh dưới: Hangar, Equipment, Tactical, Hotbar · Vocabulary, Missions, Codex · Shops, Data.
    - Shops mở menu chứa các nút cửa hàng cũ.
    - Có chấm báo khi cửa hàng đặc biệt mở.
  - Thanh điểm số trong trận được ẩn khi đang ở màn mở đầu.
  - Logic nằm ở `src/ui/title-hub.ts`. `main.ts` gọi `titleHub.render()` từ `renderPhase`, `updateCampaignUi` và `renderPlayerStatusIdentity`.
- **Mọi id cũ đều giữ nguyên.** Các quy tắc CSS cũ của màn mở đầu (`.title-main-card`, `.title-navigation-grid`…) đã gỡ khỏi `styles.css`.

### 7.2 Đợt 2: sảnh Duel và danh sách phòng chờ
- **Máy chủ** (trợ lý làm, có test):
  - `WATCH_ROOMS` / `ROOM_LIST`, kiểu `DuelRoomListing` trong `src/duel/protocol.ts`;
  - `authority.roomListings()`;
  - `server/duel/room-list-watchers.ts`: tối đa khoảng 4 lần gửi mỗi giây, luôn gửi trạng thái cuối;
  - phần xử lý trong `ws-server.ts`;
  - `client.watchRooms()`; controller có `watchRoomList()`, `joinRoom()`, `onRoomList`, `onConnectionStatus`;
  - test: `tests/duel-room-list.test.ts`, `tests/duel-online-room-controller.test.ts`, cùng phần thêm trong protocol và network-client.
  - Phiên bản giao thức vẫn là 7, vì chỉ thêm lệnh mới.
- **Giao diện sảnh** (`index.html #duelRoomDialog`, `src/ui/holo-lobby.css`, `src/duel/room-ui.ts`):
  - Hộp thoại toàn màn hình, nền bản đồ Inferno.
  - Cột trái:
    - thẻ phi công: tàu đang chọn, tên, điểm, nút "Change ship" mở Hangar; đóng Hangar thì ảnh tự cập nhật;
    - Ranked;
    - Create room, Practice vs bot, ô nhập mã và mật khẩu.
  - Giữa: **danh sách phòng chờ**.
    - Mỗi phòng có ảnh bản đồ (hoặc ô sọc "Random map"), tên, khóa nếu có mật khẩu, luật (Bo, phút, mức nguy hiểm, kiểu luật), chủ phòng kèm ảnh tàu, số người, trạng thái.
    - Nút Join; "In match" / "Full" bị khóa; "Your room" là phòng của mình.
    - Lọc All / Open / No password, tìm theo tên phòng hoặc chủ phòng, nút làm mới.
    - Khi mất kết nối, danh sách mờ đi và nút Join bị khóa.
    - Phòng có mật khẩu: bấm Join sẽ điền mã vào ô bên trái, rồi chờ nhập mật khẩu.
  - Khi đã vào phòng, phần giữa thành **màn trong phòng**: hai thẻ có ảnh tàu, nhãn YOU, chữ VS, trạng thái Ready.
  - **Tạo phòng** là bảng nổi (`#duelCreatePanel`):
    - Who can join, Rounds, Match length, Map order chọn bằng nút phân đoạn (`enhanceSegmented`). Ô select gốc vẫn còn, chỉ bị ẩn, để `duelRoomSettingsFromUi()` đọc như cũ.
    - Chọn bản đồ bằng 6 ảnh (`enhanceMapPicker`).
    - Mục "Advanced" gấp lại, gồm hazards, mystery, fate, bot, seed, rules và bot profile, kèm một dòng tóm tắt.
    - Esc hoặc bấm ra ngoài thì đóng bảng, sảnh vẫn mở.
  - Danh sách chỉ theo dõi khi sảnh đang mở và chưa vào phòng.
  - Máy chủ bản cũ trả `BAD_MESSAGE`: hiện hướng dẫn khởi động lại thay cho mã lỗi.
- **Lối thử cho nhà phát triển:** `window.__duelOnline` (chỉ có ở máy chủ dev). Kịch bản chụp sảnh với phòng mẫu: `.visual/ui-lobby-real.js`.

### 7.3 Lưu ý vận hành
- **Phải khởi động lại máy chủ Duel trên máy:** `pnpm duel:local:restart`. Nếu không, máy chủ cũ không hiểu `WATCH_ROOMS`.
- Ảnh chụp kiểm tra: `.visual/ui/real-title.png`, `real-*.jpg` (bảng nổi, hộp thoại), `lobby-*.jpg` (sảnh, tạo phòng, trong phòng), `game-1-ingame.jpg`.

### 7.4 Còn lại (đợt 3)
- Bảng xếp hạng toàn cầu, danh sách người online, trò chuyện, bạn bè: cần máy chủ có tài khoản.
- Cấp và kinh nghiệm phi công, chuỗi ngày đăng nhập: chưa có dữ liệu.
- Tên phi công dùng chung giữa Campaign và Duel.

## 8. Đợt 2 (04/10/2026)

Sửa lỗi chọn map Duel, quái bonus ở Recall; thêm hiệu ứng rê chuột và bấm, thanh điểm "bốc cháy", hàng phím tắt mới, Hangar, Shop, Missions, bản đồ chiến dịch, màn hoàn thành. Chi tiết: `docs/UI_POLISH_ROUND2_2026-10-04.md`.
