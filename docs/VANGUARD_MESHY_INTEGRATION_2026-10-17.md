# Đưa Vanguard Meshy vào game — 17/10/2026

Claude đã bàn giao quy trình này ở mục 5.2 của `CLAUDE_PROCESS_2026-10-17.md`
và mục 6.1 của `art-requests/3D_MODELS_PROMPT_PACK_2026-10-16.md`.

## Thử ngay

1. Mở `https://typing-game.local/space-typing` và nhấn **Ctrl+F5**.
2. Trong **Hangar**, chọn **Vanguard**.
3. Trong **Settings → Visual**, chọn **Medium**, **High** hoặc **Ultra**, rồi lưu.
4. Màn hình chính hiển thị thân tàu Meshy. Bấm **Deploy** hoặc **Practice** để xem trong trận.

Low dùng hình minh họa cũ. Mở trực tiếp
`https://space.typing-game.local/?model3d=off` để so với thân tàu cũ;
`?ship3d=0&model3d=off` tắt cả mô hình ở màn trưng bày/Duel.

## Các file hiện có

| File | Vai trò |
|---|---|
| `art-src/3d/ships/ship-01-vanguard.glb` | Bản Meshy gốc của chủ dự án, giữ nguyên. Trước 21/10 nằm ở `art-src/models/raw/ships/vanguard.meshy.glb` |
| `art-src/models/blend/ships/vanguard.blend` | Bản làm việc để mở trong Blender |
| `art-src/models/ships/vanguard.glb` | Bản đã căn hướng, tối ưu, thêm phát sáng/idle/socket |
| `scripts/models/presets/vanguard-meshy-sockets.json` | Vị trí động cơ, nòng súng, lõi và đầu cánh dành riêng model này |
| `public/assets/space-typing/models/ships/vanguard/vanguard.high.glb` | Bản High/Ultra, texture tối đa 2K, khoảng 2,62 MiB |
| `public/assets/space-typing/models/ships/vanguard/vanguard.medium.glb` | Bản Medium, texture tối đa 1K, khoảng 0,84 MiB |
| `public/assets/space-typing/models/manifest.json` | Danh sách model mà game thực sự đọc |

Chỉ đặt file vào `art-src/3d/` chưa làm đổi game: đó là đầu vào để xử lý. Game đọc
bản đã đóng gói trong `public/` qua manifest và cần build lại bản Play.

## Đã xử lý model

- Kiểm tra bằng Blender: một mesh, 21.193 tam giác, ba texture 2048×2048,
  chưa có hoạt ảnh hay điểm gắn.
- Mũi gốc hướng **-X trong Blender**. Đã xoay về **+Y**, căn tâm, đặt cạnh dài
  nhất 2 m; khi xuất glTF, mũi hướng -Z như camera của game yêu cầu.
- Giảm còn **12.000 tam giác**, giữ UV/material của Meshy.
- Tạo emissive từ vùng màu sáng có sắc độ, khoảng 6,2% texel: lõi, động cơ,
  đường sáng xanh. Thêm `Ship_Idle` 48 frame.
- Đặt tám điểm `FX_`: hai động cơ, nòng trung tâm, hai nòng bên, lõi, hai đầu cánh.
  Điểm động cơ được căn vào miệng xả thực; thuật toán tìm đuôi tự động dễ nhầm
  với phần giáp/cánh nhô về sau của tàu này.
- Giữ nguyên GLB gốc. SHA256:
  `87D4CC5694849BCCEC2B634DE8AF83479C00724E1C4A4A553E7D623ECC605A4A`.

## Code đã nối

- Campaign/Recall dùng GLB trên renderer 3D chung của game; lửa động cơ và đèn
  bám theo socket. Đạn thường dùng hai nòng bên, đòn kết thúc dùng nòng giữa;
  tia ngắm lấy điểm mũi đã chiếu từ model.
- Màn hình chính và renderer Duel ưu tiên model đã đóng gói khi có. Camera,
  nghiêng thân, recoil, đèn, muzzles và exhaust dùng cùng model/socket.
- Khi không có GLB, lỗi tải hoặc tắt model, đường fallback cũ vẫn dùng được.
  Preview/assignment relief chính xác từ Admin giữ nguồn đã chọn của Admin.
- Chọn đúng High/Medium khi đổi chất lượng. Chặn kết quả tải cũ ghi đè bản mới
  sau khi đổi chất lượng/tàu; dispose instance không còn dùng. Ẩn lớp canvas 3D
  khi dùng fallback để Low không chồng model đã tải lên ảnh 2D.
- Sửa script Blender cho model import dùng quaternion: xoay Euler đơn thuần
  trước đây không đổi hướng thật. Cũng sửa việc đọc matrix trước khi cập nhật
  khiến các socket cùng bị đặt ở gốc tọa độ.
- Hình nhỏ trên thẻ/icon vẫn dùng bộ minh họa hiện có; đây là tích hợp thân tàu 3D.

## Làm lại khi cần chỉnh model này

Từ PowerShell, chạy Blender bằng script của dự án (đường dẫn tuyệt đối):

```powershell
& 'D:\Blender\blender.exe' -b --factory-startup `
  -P 'D:\typing-game\games\space-typing\scripts\models\blender\space_typing_model_tools.py' -- `
  --input 'D:\typing-game\games\space-typing\art-src\3d\ships\ship-01-vanguard.glb' `
  --kind ships --id vanguard --project 'D:\typing-game\games\space-typing' `
  --nose=-X --tris 12000 --auto-emissive 0.08 `
  --sockets-json 'D:\typing-game\games\space-typing\scripts\models\presets\vanguard-meshy-sockets.json' `
  --save-blend 'D:\typing-game\games\space-typing\art-src\models\blend\ships\vanguard.blend'
```

Sau đó trong WSL, với Node/pnpm đã nạp:

```bash
cd /mnt/d/typing-game/games/space-typing
pnpm models:prepare --only ships/vanguard
cd /mnt/d/typing-game
pnpm build:space
```

Tải lại game bằng Ctrl+F5. Nếu dùng một thiết kế Meshy mới có hình dáng khác,
cần kiểm tra lại hướng mũi và vị trí socket trong Blender trước khi đóng gói.
File gốc trong `art-src/3d/` và file `.blend` là dữ liệu làm việc; bản game dùng hai GLB trong `public/`.

## Kiểm tra đã thực hiện

- **10 file / 54 test liên quan đạt:** chuẩn asset và socket, chuẩn hóa model,
  socket theo animation/banking, nòng đạn khi xoay/scale, PlayerShotSystem,
  lifecycle, fallback Duel, hợp đồng preview relief Admin, title UI và G01.
- Đã xem ảnh model gốc, sau Blender, màn hình chính, trong trận và hai góc
  camera của renderer Duel. Campaign High có hai miệng xả, ba nòng, lõi và đầu
  cánh được chiếu đúng; có đạn thật đang bay.
- Renderer Duel Medium tải `.medium.glb` cho cả self/rival, có hai nòng và hai
  miệng xả. Đây là kiểm tra renderer; không phải một trận multiplayer với người thật.
- Không có exception hoặc cảnh báo console trong các lượt ảnh trên.
- A/B cùng một trang, bật model và dùng thân 2D cũ luân phiên, hai lượt mỗi mức,
  GPU RTX 3050 Ti/ANGLE D3D11, viewport 1642×799 DPR 2, sau warm-up:

| Mức | CPU vẽ tăng so với thân 2D | CPU toàn cảnh khi có model | Frame interval p95 |
|---|---|---|---|
| Medium | +0,30 / +0,11 ms | trung bình 1,37 / 1,46 ms; p95 2,0 / 2,1 ms | 12,5 ms |
| High | +0,13 / +0,16 ms | trung bình 1,57 / 1,39 ms; p95 2,2 / 2,0 ms | 12,6 ms |

Đây là cảnh Stage 1 cố định, khóa scheduler để so riêng chi phí thân tàu,
không phải cam kết FPS cho mọi thiết bị hay trận đông mục tiêu. Không đo GPU
bằng timer extension qua ANGLE; số CPU và frame interval được ghi riêng.

Ảnh/log/JSON ở `.visual/vanguard-meshy/`, gồm `raw/`, `prepared/`,
`title-final-dev.png`, `combat-high.png`, `duel-medium.png`, `perf-suite.json`,
`tests.log`, `extra-tests.log`, `prepare-blender.log`, `models-prepare.log`.

## Bản Play

- Build chuẩn `pnpm build:space` đạt: art/audio, TypeScript game và Duel server,
  Vite, bundle report và ship/background guard. Sau sửa một dòng ẩn layer khi
  fallback, đã build Vite lại để Play chứa đúng source cuối.
- Bundle cuối `assets/game-ffzOsTIy.js`, build 17/10/2026 15:27:57 giờ máy.
- Chrome thật trên `https://space.typing-game.local/`, hồ sơ tạm:
  - Màn hình chính mount đúng `vanguard.high.glb`, nhận đủ **2.748.648 byte**,
    ẩn ảnh minh họa cũ; đã mở ảnh để tự xem.
  - Đổi Settings thật: Medium tải `vanguard.medium.glb`; Low có lớp 3D
    `visibility: hidden` và ảnh cũ hiện; High trở lại `vanguard.high.glb`.
    Dialog lưu/đóng bình thường, không chồng hai thân tàu.
  - Deploy thật vào trận, **Warp 100 → 90**; thân Meshy và lửa động cơ hiển thị
    trong bản Play. Debug handle dev không có. Đã tự xem ảnh trận.
  - Cả ba lượt đều `logs: []`, `exceptions: []`.
- Ảnh: `.visual/vanguard-meshy/title-play.png`, `quality-play.png`,
  `combat-play.png`. Đã soi thêm ảnh cắt thân/động cơ ở `title-detail.jpg`,
  `combat-detail.jpg`. Log build: `build.log`, `final-build.log`.
- Đã dừng Vite kiểm thử riêng ở cổng 3096. Người chơi chỉ cần tải lại Play.

Không reset save, không thay đổi database, không commit/push/deploy production.

## 17/10 — xử lý review Claude, bộ nhớ và cache

Mốc trước ở trên được giữ làm lịch sử. Sau review, Campaign và rival Duel dùng
Medium ngay cả ở Settings High; title/self Duel giữ High. URL GLB trong manifest
có hash nội dung. Title hủy sau 10 giây không active và tải lại khi về;
rời Duel hủy hull, GPU renderer, shadow và PMREM; dispose cũng đóng ImageBitmap.

Đo Chrome `performance.memory`, đơn vị MiB, trước tải / sau tải hai model /
sau dispose 1 giây: trước sửa **28,07 / 45,74 / 45,36**; sau sửa
**28,98 / 50,28 / 50,40**. Không ép GC nên không kết luận JS heap giảm từ số này.
Texture decode thực tế: rival đổi bốn ảnh 2048² sang bốn ảnh 1024²,
ước tính RGBA8 chưa mipmap **64 → 16 MiB** cho hull nhỏ. Campaign dùng cùng Medium.

Đã kiểm tra cleanup GPU trực tiếp: trước hủy self có 1 geometry/6 texture,
rival 1 geometry/4 texture; sau hủy **cả hai 0/0**, cả hai context đã mất;
**8/8 ImageBitmap** của hai model đã đóng. Đã kiểm tra trên Play:
Medium → Low → High, Deploy 100→90 Warp, title hull biến mất khi không active
quá 10 giây và được tải lại khi về. File Meshy gốc vẫn có SHA256 như mục đầu.

Ảnh/crop/log mới ở `.visual/codex-review/`. Chi tiết review, các kiểm tra và
giới hạn ở `CODEX_CLAUDE_REVIEW_IMPLEMENTATION_2026-10-17.md`.
