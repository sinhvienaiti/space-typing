# Bộ 12 phi thuyền Meshy — 20/10/2026

Đã đưa bộ tàu mới vào cùng pipeline và renderer của Vanguard. HEAD ban đầu
`a7d97da4103398f2c75132c30adbd6f3280efee7`, branch
`feat/space-typing-2026-10-18`; đã fetch origin và xác nhận không có commit mới
hơn trước khi sửa. Không reset/revert. Các thay đổi môi trường ở repo cha giữ nguyên.

## Dùng ngay trong Play

Mở `https://space.typing-game.local/`, tải lại trang, vào **Hangar** và chọn nhân vật.
Mỗi nhân vật mặc định nhận mẫu tàu mới theo thứ tự dưới đây. Trong
**Ship appearance**, có thể đổi giữa mẫu mặc định và **Eternal Sovereign**.
Lựa chọn ngoại hình lưu riêng trên trình duyệt bằng khóa
`space-typing.ship-visuals.v1`; CharacterId, save gameplay, kỹ năng, chỉ số,
ultimate và điều kiện mở khóa vẫn giữ nguyên.

| STT | Nhân vật gameplay | Visual ID | 2D runtime | GLB High / Medium (MiB) |
|---|---|---|---|---|
| 01 | Vanguard | `vanguard` | Giữ bản đã duyệt | 2.62 / 0.84, giữ nguyên |
| 02 | Aegis | `razorwing` | Đã tạo | 2.63 / 0.96 |
| 03 | Volt | `solar-lance` | Đã tạo | 3.03 / 1.12 |
| 04 | Wraith | `phantom-wraith` | Đã tạo | 2.24 / 0.79 |
| 05 | Fortune | `crimson-talon` | Đã tạo | 2.36 / 0.84 |
| 06 | Arsenal | `frost-seraph` | Đã tạo | 3.11 / 1.09 |
| 07 | Oracle | `nova-reaper` | Đã tạo | 3.62 / 1.28 |
| 08 | Bastion | `astral-dragon` | Đã tạo | 2.53 / 0.88 |
| 09 | Reaper | `eclipse-monarch` | Đã tạo | 2.59 / 0.91 |
| 10 | Celestial | `celestial-valkyrie` | Đã tạo | 2.48 / 0.88 |
| 11 | Zenith | `genesis-phoenix` | Đã tạo | 3.38 / 1.10 |
| 12 | Skin của nhân vật đang chọn | `eternal-sovereign` | Đã tạo | 3.49 / 1.16 |

Toàn bộ GLB có khoảng 12.000 tam giác, đủ bốn socket bắt buộc và clip
`Ship_Idle`. Hai tier của cả bộ gồm khoảng 34.07 MiB High và 11.84 MiB Medium;
runtime chỉ tải mẫu đang cần. Campaign/Recall giữ một chủ thể hiện tại và hủy
model cũ khi đổi nhân vật. Ảnh fallback giải mã theo tàu đang dùng, không tải
sẵn cả 12 ảnh vào bộ nhớ lúc khởi động.

## Pipeline và tên source

Nguồn tên tàu duy nhất: `src/characters/ship-visual-catalog.json`.
`scripts/ships/ship-sources.mjs` dùng cùng catalog để khám phá source, kiểm tra
trùng ID/thứ tự/slot và báo filename sai. Nếu có nhiều alias, thứ tự ưu tiên
trong catalog được áp dụng và ghi cảnh báo; không phụ thuộc thứ tự filesystem.

Giữ convention cũ `vanguard-top-hd.png`, `vanguard.meshy.glb` và các
`<legacy-id>-top-hd.*`. Bộ mới nhận trực tiếp `ship-XX-<slug>-2d.png` và
`ship-XX-<slug>.glb`. Source gốc và dữ liệu Blender vẫn ở `art-src/`, gitignored.

> Cập nhật 21/10: GLB gốc của tàu chuyển từ `art-src/models/raw/ships/` sang
> `art-src/3d/ships/`. Tàu mới đặt ở đó, tên `ship-XX-<slug>.glb`. Vanguard là
> `ship-01-vanguard.glb`. Thư mục `raw/` cũ không còn được đọc.

```text
art-src/3d/ships/ship-XX-<slug>.glb
    → space_typing_model_tools.py (helper Vanguard)
art-src/models/ships/<slug>.glb
    → render_ship_top.py (chiếu orthographic, alpha thật, socket metadata)
art-src/ships/rendered/<slug>-top.png + <slug>-top.json
    → prepare-models.ts (packager cũ)
public/assets/space-typing/models/ships/<slug>/<slug>.high.glb
public/assets/space-typing/models/ships/<slug>/<slug>.medium.glb
    + public/assets/space-typing/models/manifest.json

PNG source / top projection
    → prepare-ship-3d.mjs (relief pipeline cũ)
public/assets/space-typing/ships/3d/<slug>/
    color.webp + emissive.webp + height.bin + model.json
    + ../manifest.json
```

Các PNG mới thực tế là ảnh studio nền xám, nhiều ảnh góc nghiêng; không phù hợp
để cắt relief top-down trực tiếp. Pipeline phát hiện trường hợp này, ghi rõ
nguồn bị từ chối và dùng ảnh top-down trong suốt chiếu từ GLB đã chuẩn hóa.
Ảnh gốc giữ nguyên. Sidecar mang SHA256 của GLB và các socket; ảnh/metadata cũ
không khớp model bị từ chối trước khi ghi output. Nozzle, lõi và đầu cánh được
chuyển từ cùng socket 3D vào ảnh 2D. Frost Seraph vẫn có bốn vị trí bắn 2D theo
recipe Arsenal. Màu lửa lấy gần socket động cơ; màu viền thân tính riêng.

Từ thư mục `games/space-typing`, khi Blender có trong PATH hoặc đã đặt
`BLENDER_BIN` trỏ tới executable:

```bash
pnpm ships:models:prepare
pnpm ship3d:prepare
pnpm build
```

Lần triển khai này dùng Blender ARM64 4.5.7 tại thư mục tạm, không cài toàn máy:

```bash
BLENDER_BIN='/private/tmp/space-typing-blender-volume/Blender.app/Contents/MacOS/Blender' pnpm ships:models:prepare
```

Máy có Blender.app thông thường có thể dùng
`BLENDER_BIN='/Applications/Blender.app/Contents/MacOS/Blender'`.
Để xử lý riêng một tàu:

```bash
pnpm ships:models:prepare --only razorwing
pnpm ship3d:prepare razorwing
pnpm models:prepare --only ships/razorwing
```

Lệnh cuối chỉ cần khi đã có GLB chuẩn hóa muốn đóng gói lại; batch mới đã gọi
nó tự động. `--dry-run` xem kế hoạch; `--force` làm lại; `--preview` xuất ảnh
review; `--save-blend` giữ file làm việc. Cache dùng hash nội dung raw, helper,
preset/socket, projection, contract, dependency lock và output. Chạy lại hiện
trả 11 `CACHED` và Vanguard `PRESERVED`. Thiếu một source không xóa bản runtime
đang có và không ngăn các tàu khác được xử lý. Lỗi từng tàu được ghi rõ và
trả mã lỗi tổng hợp. Manifest hỏng bị từ chối, không ghi đè mất các model khác.

## Hướng và socket

Đã chiếu và xem riêng cả 12 raw GLB; lần này từng model đều có mũi **-X trong
Blender**, Z up. Kết quả được ghi riêng theo ID ở
`scripts/models/presets/ships-meshy.json`, không hard-code hướng trong renderer.
Sau helper, mũi là Blender +Y / glTF -Z.

Mỗi tàu mới có `<slug>-meshy-sockets.json` riêng. Đã căn miệng động cơ và lõi
theo ảnh chiếu, kiểm tra lại với ảnh renderer thật, sửa các socket tự động bị
nhầm đuôi cánh với động cơ. Genesis Phoenix dùng hai động cơ, không đặt lửa ở
gai đuôi giữa. Vanguard giữ tám socket và hai GLB đã duyệt nguyên byte.

Không có tàu còn bị chặn vì thiếu GLB hay chưa xác nhận hướng. Khi thay thiết kế
raw khác cho cùng ID, cần kiểm tra lại preset hướng/socket; không mặc định rằng
thiết kế mới cũng có cùng trục hoặc cùng các miệng xả.

## Runtime và các file chính

- `ship-visual.ts`, catalog: tách visual identity và gameplay identity, lưu skin riêng.
- `main.ts`, `index.html`, `ui/title-hub.ts`, `ui/title-home.ts`: Hangar, chọn skin, ảnh thẻ/hero.
- `render3d/ship-model.ts`, `Game.ts`: GLB dùng chung Campaign/Recall, validate socket, hủy model khi đổi chủ thể.
- `duel/authored-ship.ts`, `duel/relief-model.ts`, `duel/ship3d.ts`, `duel/combat-visuals.ts`, `ui/title-ship3d.ts`: title/Duel dùng cùng identity và tier cũ.
- `characters/ship-art.ts`, `renderer.ts`, `chase-art.ts`: ảnh/nozzle/màu của mẫu đang chọn, rồi fallback cũ khi thiếu.
- `scripts/models/prepare-ship-models.mjs`, `render_ship_top.py`, presets, packager và image pipeline: source đến runtime, cache, báo lỗi từng tàu.
- Tests mới và regression tests: discovery, conflict, save cosmetic, socket, manifest, GLB thiếu, Low, đổi chất lượng/skin/nhân vật, async cũ, dispose, Admin exact-image authority.

Title/self Duel vẫn dùng High ở High/Ultra. Rival Duel và Campaign/Recall
dùng Medium cả khi Settings High. Low/WebGL fail/GLB fail giữ ảnh 2D. Kết quả
tải cũ không được ghi đè tàu hoặc tier mới; chỉ một thân tàu hiển thị mỗi lúc.
Nguồn ảnh/relief chỉ định chính xác từ Admin vẫn được ưu tiên, kể cả khi ảnh
còn đang giải mã. Đăng ký listener Duel được hủy khi rời và khôi phục khi mở lại.

## Xác minh

- Focused tests đã chạy trước build; toàn bộ suite cuối: **364 file, 2.233 test đạt**.
- `pnpm build`: kiểm tra art/audio, TypeScript game/server, Vite, bundle metrics,
  ship/background integrity đều đạt. Vite vẫn thông báo bundle lớn.
- Raw/projection/source SHA và URL hash của toàn bộ output đã đối chiếu; Razorwing
  chạy lại cho cùng input tạo bốn file relief giống nguyên byte.
- Chrome 1642×799 DPR 2: cả 12 model tải qua production renderer; self lấy High,
  rival lấy Medium; Campaign load thành công cả 12. Sau dispose từng Duel owner:
  geometry **0**, texture **0**. Đây là xác minh renderer, không phải trận PvP online.
- Play thật tại `https://space.typing-game.local/`: chọn Aegis/Razorwing, chọn skin
  Eternal, Medium → Low → High, Deploy Stage 1 (Warp 100 → 90). Low ẩn layer 3D
  và hiện ảnh Eternal; High tải lại GLB. Không có exception hoặc browser warning.
- Ảnh và JSON local: `.visual/ships-fleet/` gồm `all-12-authored.png`, `hangar.png`,
  `title-razorwing.png`, `title-eternal.png`, `quality-*.png`, `campaign-eternal.png`,
  `models-result.json`, `ui-result.json`. Overlay 2D:
  `.visual/ship3d-canonical12-overlay.jpg`. Dev riêng có cảnh báo vocabulary thiếu
  Portal; Play không có cảnh báo đó.

Các log build/test/batch trong `/private/tmp/space-typing-*`. Binary runtime và
source code được lưu trong commit bàn giao; ảnh QA và source art không đưa vào Git.

## Bổ sung theo VISUAL_TESTING.md

Đối chiếu trực tiếp [VISUAL_TESTING.md](VISUAL_TESTING.md), build lại bằng
`pnpm build:space` từ repo cha và bổ sung ảnh Play sau **20 giây trong trận**.
Ảnh phải xác nhận đang trong trận; chờ splash đóng và nút Deploy sẵn sàng bằng
`--ready`, vì click quá sớm có thể bị splash chặn dù công cụ vẫn chụp thành công.

- Gallery và ảnh trong trận đều 1642×799 DPR 2, PNG 3284×1598.
- Đã tự mở xem ba ảnh phóng to: `detail-title-hull.jpg`,
  `detail-combat-hull.jpg`, `detail-low-alpha.jpg` trong `.visual/ships-fleet/`.
  Kiểm tra viền thân, alpha, hai miệng xả và sự tách biệt lớp 2D/3D;
  không thấy nền xám hình chữ nhật, viền lem màu hoặc hai thân tàu chồng nhau.
- Ảnh mới và JSON: `.visual/ships-fleet/guideline-qa/`, gồm Vanguard và
  Eternal sau Deploy 20 giây, cùng ảnh crop `detail-combat-20s.jpg` đã mở xem.
  `exceptions` rỗng; bản Play không có console warning/error. Các dòng
  `click fallback` chỉ ghi cách harness bấm nút Hangar ngoài vùng nhìn thấy.

Đã đo `bg-gpu-stress.js` ba lần liên tiếp trên M4: High, buffer 2053×999,
x1/x3/x6/x10 đều 60 FPS. Sau đó A/B trong cùng phiên Chrome, Stage 1 với
8 quái cố định, Aegis mang skin Eternal, quality High, viewport DPR 2
(DPR canvas game được quality policy giới hạn 1.8):

| Chế độ | FPS đo bằng rAF | Frame p95 | CPU vẽ trung bình / p95 |
|---|---:|---:|---:|
| GLB | 60 | 18.1 ms | 1.44 / 2.4 ms |
| Cùng ngoại hình bằng fallback 2D | 60 | 17.9 ms | 0.63 / 1.0 ms |

Đổi luân phiên 16 block, mỗi block 1.5 giây; bỏ ba frame chuyển chế độ.
Không dùng GPU timer qua Metal. Đây là A/B hai chế độ render của bản hiện tại,
không phải số đo lịch sử trước tích hợp và không dùng để khẳng định hiệu năng
của mọi thiết bị/cảnh chơi. FPS thật nằm ở `ship.frame` trong JSON;
`ship.draw` là thời gian CPU vẽ, không phải GPU frame time.
Bằng chứng: `.visual/ships-fleet/perf-results.json`, `perf-review.mjs`,
`perf-scene.png`. Máy chủ Vite kiểm thử cổng 3098 đã được tắt.
