# art-src/3d — mô hình 3D gốc (bản backup)

Đây là file GLB gốc chủ dự án tạo trên Tripo hoặc Meshy. Không sửa các file này.
Pipeline đọc file ở đây, rồi ghi bản đã xử lý vào `art-src/models/` và `public/assets/space-typing/models/`.

## Quy tắc đặt file

File 3D nằm cùng đường dẫn với ảnh 2D của nó:

```
art-src/<đường dẫn>/<tên>.png  →  art-src/3d/<đường dẫn>/<tên>.glb
```

Ví dụ:

| Ảnh 2D | Mô hình 3D |
|---|---|
| `art-src/enemies/frost-healer.png` | `art-src/3d/enemies/frost-healer.glb` |
| `art-src/bosses/warden-angel.png` | `art-src/3d/bosses/warden-angel.glb` |
| `art-src/relics/relic-frost-rhythm.png` | `art-src/3d/relics/relic-frost-rhythm.glb` |
| `art-src/pickups/credits/boss.png` | `art-src/3d/pickups/credits/boss.glb` |
| `art-src/projectiles/05-crimson-talon-crimson-bolt.png` | `art-src/3d/projectiles/05-crimson-talon-crimson-bolt.glb` |

Riêng phi thuyền: `art-src/ships/ship-NN-<id>-2d.png` → `art-src/3d/ships/ship-NN-<id>.glb` (bỏ đuôi `-2d`).
Vanguard dùng ảnh `art-src/ships/vanguard-top-hd.png`, file 3D là `ship-01-vanguard.glb`.

`defense/` để dành cho mô hình riêng của Defense (tháp, lõi, cổng). Hiện chưa có file.

Nhân vật (hero, guide) không theo quy tắc trên: file gốc đặt ở `art-src/3d/heroes/<id>.glb`. Hiện máy này chưa có file gốc nào của nhân vật.

## Thêm hoặc thay mô hình

1. Tải GLB về, đặt tên đúng như ảnh 2D, để vào đúng thư mục ở trên.
2. Chạy `node scripts/models/prepare-campaign3d-models.mjs`. Mục nào không đổi sẽ báo CACHED, nên chạy cả bộ cũng nhanh.
   Muốn chạy riêng: `--kind enemies` hoặc `--only=<khóa>`. `<khóa>` là khóa trong `scripts/models/presets/campaign3d-models.json` có `source` trỏ tới file vừa thêm, không phải tên ảnh 2D. Ví dụ: `--only=enemies/frost-healer-3d`. Một file có thể dùng cho nhiều khóa, ví dụ `enemies/angel-scout-3d` và `enemies/angel-scout-lod`.
3. Phi thuyền: `node scripts/models/prepare-ship-models.mjs --only <id>`, ví dụ `--only razorwing`.
4. Cache build dựa trên nội dung file. Đổi tên hay dời file mà nội dung giữ nguyên thì không phải build lại.

## Mô hình tạm (placeholder)

Một số ảnh 2D chưa có mô hình riêng. Game tạm dùng mô hình khác, ghi ở trường `placeholder` trong `scripts/models/presets/campaign3d-models.json`.

Khi bạn thêm file đúng tên, pipeline báo REVIEW và chưa thay mô hình trong game, vì góc xoay (`rotate`) đang chỉnh cho bản tạm.
AI xem hướng mô hình mới, sửa `rotate` nếu cần, rồi xóa trường `placeholder`. Lần chạy sau sẽ build từ file mới.
Nếu file thật đã build mà sau đó bị mất, pipeline báo MISSING và giữ bản đã build, không quay về bản tạm.

Danh sách đầy đủ, mã băm và tên file lúc tải về: `SOURCES.json` trong thư mục này.
