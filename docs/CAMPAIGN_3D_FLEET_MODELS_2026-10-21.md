# Campaign 3D: chọn 12 phi thuyền và model 3D cho quái, boss, đạn — 21/10/2026

> **Dành cho:** chủ dự án (chơi thử, duyệt) và AI làm tiếp (Codex, Claude).
> **Yêu cầu của chủ dự án:**
> - model 3D (Meshy/Tripo) **chỉ dùng cho Campaign 3D**, không đụng game 2D;
> - cho chọn 12 phi thuyền ngoài con rồng Draconis, góc máy quay hợp với phi thuyền;
> - ảnh nào chưa có model thì lấy model giống nó nhất, nhân bản và đổi tên;
> - thứ tự: boss → đạn → quái → vật phẩm.

## 1. Tóm tắt

- **Chọn pilot** ở menu `campaign-3d.html`: Draconis hoặc 1 trong 12 phi thuyền. Lựa chọn lưu ở khóa riêng `spaceTyping3dPilotV1`, không đổi cosmetic của game 2D.
- **Phi thuyền:**
  - dùng model `ships/<id>` có sẵn;
  - máy quay riêng: `chase` khi bay (sau lưng, cao khoảng 24°, thấy mặt trên thân tàu) và `hangar` ở menu (3/4 phía trước, tàu nằm bên phải khung menu);
  - bắn luân phiên 2 nòng; chữ cuối bắn cả hai nòng, đạn to hơn;
  - Nova là vòng ấn ký và tia sáng theo màu đạn của tàu.
- **Đạn riêng từng tàu:** `skills/<id>-bolt`, bay theo đường cong, mũi đi trước, có vệt sáng mảnh.
- **Quái:** 8 họ × 14 loại có model `enemies/<họ>-<loại>-3d`. Hậu tố `-3d` bảo đảm game 2D không đọc tới.
- **Boss:** đủ 26 boss có model `bosses/<id>`. 25 boss mới có clip `Boss_Idle_Hover` (bay lơ lửng), quay mặt về người chơi.
- **Draconis giữ nguyên** cách bay, phun lửa và máy quay cũ.
- **Chưa commit.**

## 2. Bằng chứng kiểm tra

- `pnpm build`: đạt. `vitest run tests`: 368 file, 2.273 test đạt (có test mới `campaign3d-models.test.ts`, `campaign3d-model-pipeline.test.mjs`).
- Ảnh chụp thật (Chrome, GPU) theo `docs/VISUAL_TESTING.md`:
  - `scripts/visual/scenarios/campaign3d-ships.mjs`: menu, trận đánh, đạn đang bay (quay chậm), chữ cuối, Nova, boss — với Vanguard, Crimson Talon, Solar Lance, Eternal Sovereign và Draconis.
  - `scripts/visual/scenarios/campaign3d-roster.mjs`: quái 8 họ (màn 220–508) và 9 boss (màn 10–900). Mọi quái và boss đều vẽ bằng model (`looks()` = `model`), không lỗi trang.
- Lệnh chạy:

  ```bash
  (pnpm exec vite --host 127.0.0.1 --port 3098 --strictPort > .visual/vite.log 2>&1 &)
  URL=http://127.0.0.1:3098/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-ships.mjs
  URL=http://127.0.0.1:3098/ node scripts/visual/cdp-run.mjs scripts/visual/scenarios/campaign3d-roster.mjs
  lsof -ti tcp:3098 | xargs kill
  ```

## 3. Dựng lại model

- File gốc Meshy/Tripo nằm ở `art-src/3d/` (không vào Git). Thư mục xếp giống ảnh 2D:
  - `art-src/<đường dẫn>/<tên>.png` → `art-src/3d/<đường dẫn>/<tên>.glb`;
  - quái: `art-src/3d/enemies/`, boss: `art-src/3d/bosses/`;
  - đạn tàu: `art-src/3d/projectiles/<NN>-<tàu>-<đạn>.glb`, cùng tên với ảnh trong `art-src/projectiles/`;
  - quy tắc đầy đủ: `art-src/3d/README.md`.
- Thư mục cũ `art-src/models/raw/` chỉ còn là bản sao thừa. Pipeline không đọc thư mục này. Đừng lưu file mới vào đó.
- Không có file gốc trên máy, chỉ còn bản đóng gói trong `public/`: Draconis (`heroes/draconis`, `heroes/draconis-v2`, `heroes/draconis-v3`, `guides/draconis-v4`), `bosses/auriel-hero`, `enemies/rainbow-scout-3d`, `skills/dragon-fireball`.
- Cấu hình từng model: `scripts/models/presets/campaign3d-models.json`. Gồm:
  - `source`: file gốc, tính từ `art-src/3d/`;
  - `placeholder`: model tạm, chỉ dùng khi file `source` chưa có;
  - `rotate`: ma trận xoay. Máy dò bằng cách so ảnh render 6 hướng với ảnh 2D, và chọn mặt trước theo quy ước Meshy −Y / Tripo +X khi hai mặt gần bằng nhau;
  - `facing`: boss là `-Y`, tức quay mặt glTF +Z, vì Campaign 3D không xoay boss;
  - `triangles`: quái 6.000, boss 30.000, đạn 3.000;
  - `autoEmissive` và `note`.
- Lệnh dựng. Cache dựa trên nội dung file, không dựa trên đường dẫn: chỉ dựng lại model đổi; dời hay đổi tên file gốc thì không phải dựng lại.

  ```bash
  node scripts/models/prepare-campaign3d-models.mjs --dry-run
  node scripts/models/prepare-campaign3d-models.mjs --kind bosses
  node scripts/models/prepare-campaign3d-models.mjs --only enemies/devil-scout-3d
  ```

- Công cụ Blender `space_typing_model_tools.py` có thêm:
  - `--rotate`: ma trận xoay trước khi chuẩn hóa;
  - `--facing`: đảo vị trí socket trước/sau cho boss;
  - clip `Boss_Idle_Hover` cho boss không có xương. Clip này đẩy vào NLA sau cùng, để tư thế xuất là tư thế đầy đủ kích thước; khung đầu của `Boss_Intro` bị thu nhỏ.

## 4. Ánh xạ tên ảnh → loại quái trong code

- Code có 8 họ: rainbow, angel, devil, frost, prism, nature, shadow, cosmic. **Không có họ magma**, nên 11 model magma (`art-src/3d/enemies/magma-*.glb`) được giữ lại nhưng không đóng gói. `magma-tank` chưa có model riêng.
- `leecher` → `leech`.
- `nature-boss` → `nature-commander`, vì nature không có ảnh commander.
- Cosmic dùng 8 ảnh riêng thay cho 8 loại còn thiếu:

  | Loại | Ảnh |
  |---|---|
  | scout | fast |
  | mine | core |
  | splitter | beast |
  | destroyer | dreadnought |
  | healer | sorcerer |
  | oppressor | grunt |
  | commander | elite |
  | leech | leecher |

- `rainbow-scout-3d` giữ model làm tay có sẵn (có cánh vỗ), không thay. File gốc của model này không có trên máy.

## 5. Model tạm (chủ dự án có thể tạo lại)

Ảnh 2D chưa có model riêng thì dùng tạm model gần giống nhất. Model tạm ghi ở trường `placeholder` trong `campaign3d-models.json`, không chép thành file riêng.

**Quái:**

| Model thiếu | Dùng tạm model |
|---|---|
| devil-destroyer | devil-cloaker |
| frost-destroyer | frost-commander |
| frost-leech | frost-healer |
| prism-splitter | prism-healer |
| rainbow-cloaker | rainbow-commander |
| rainbow-destroyer | rainbow-shield |
| rainbow-scout | prism-destroyer. Chỉ cho bản LOD đám đông của Defense (`enemies/rainbow-scout-lod`). Campaign vẫn dùng `rainbow-scout-3d` làm tay. |
| rainbow-tank | prism-scout |
| shadow-destroyer | shadow-cloaker |
| magma-tank | Không cần. Game không có họ magma. |

**Boss:**

- `tyrant-g03` dùng tạm model `warden-frost`. File gốc g03 trước đó trùng y hệt g06.
- Đã sửa tên tráo nhau: `lieutenant-devil` ↔ `lieutenant-frost`, `tyrant-g04` ↔ `tyrant-g05`. Ảnh chụp màn 110, 210 và 500 xác nhận đúng.

Thay model tạm:

1. Đặt file mới vào `art-src/3d/<thư mục>/<tên ảnh 2D>.glb`. Ví dụ: `art-src/3d/enemies/frost-leech.glb`, `art-src/3d/bosses/tyrant-g03.glb`.
2. Pipeline tự dùng file mới, bỏ model tạm.
3. Nếu hướng model mới khác, sửa `rotate` trong cấu hình.
4. Chạy lệnh dựng với `--only`. Ví dụ: `node scripts/models/prepare-campaign3d-models.mjs --only enemies/frost-leech-3d`.

## 6. Dung lượng

- `public/assets/space-typing/models/` tăng từ khoảng 80 MB lên 342 MB:
  - quái: 152 MB;
  - boss: 129 MB;
  - đạn: 7 MB.
- Game chỉ tải model khi cần: mỗi trận khoảng 3–8 quái, 1 boss, 1 tàu và 1 đạn. Bản Medium dùng file `.medium.glb`.
- Thư mục model đang được Git theo dõi, không dùng LFS. Trước khi commit, chủ dự án nên quyết định giữ trong Git, dùng Git LFS, hay đưa lên CDN/R2.

## 7. Chưa làm

- Relic, credit, puzzle, duel-target: file 3D đã đặt tên xong ở `art-src/3d/relics/`, `art-src/3d/pickups/credits/`, `art-src/3d/puzzle/`, `art-src/3d/duel-targets/`. Campaign 3D chưa có vật phẩm hay mục tiêu nào để dùng chúng. Defense dùng một số file này cho lõi, cổng, tháp và đá trang trí (mục `items/*` trong cấu hình).
- Đạn của tàu chưa có âm thanh riêng; đang dùng tiếng `shot` chung.

## Sửa theo phản hồi của chủ dự án (21/10, buổi sáng)

| Phản hồi | Nguyên nhân | Đã sửa |
|---|---|---|
| Phi thuyền "nhảy nhảy" | Tàu dùng nhịp nhún đập cánh của rồng (gần 2 lần/giây, cao 0,15) vì tàu không có clip bay | Tàu lướt nổi chậm (`src/scene3d/hero.ts`); lò xo giật lùi cứng và nhẹ hơn khi bắn |
| Đạn vẫn như đạn cũ | Model đạn nhỏ, bay 0,26 s, nhìn từ sau lưng thành một chấm; vệt sáng dài trông như tia laser | Đạn dài 1,9–2,5 m, bay 0,36–0,42 s, nghiêng theo mặt phẳng màn hình, trượt ra từ nòng, vệt sáng ngắn, tia lửa cùng màu (`src/scene3d/fx.ts`); quái nổ khi đạn chạm |
| Đạn sai tàu | File 3D của chủ dự án: 05↔06 và 10↔11 tráo nhau so với ảnh 2D cùng số | Đổi lại nguồn và đóng gói lại 4 đạn: Crimson Talon đỏ đen, Frost Seraph bạc xanh, Celestial Valkyrie xanh lá, Genesis Phoenix xanh dương |
| Quái xoay sang bên khác | Quái lắc ±17° và chỉ nhìn thẳng phía trước | Quái và boss luôn quay mặt về tàu, quay mượt, chỉ lắc ±3° (`src/campaign3d/actors.ts`) |
| (Claude thấy thêm) Tàu ở menu bị cắt, tối | Góc máy cũ gần quá, lớp phủ menu tối | Góc 3/4 từ trên cao 43°, đặt trong dải trống cạnh menu bằng dịch ống kính, lớp phủ sáng dần sang phải (`src/scene3d/space.ts`, `campaign3d.css`) |

Ghi chú cho chủ dự án: tên file đạn đã sửa trong `art-src/3d/projectiles/`. Các file `05-…`, `06-…`, `10-…`, `11-…` nay khớp ảnh 2D cùng số trong `art-src/projectiles/`. Thư mục tải về `~/Downloads/img-typing/` không còn là nơi lưu; đừng chép lại file từ đó.

