# Space Typing PvP — Nguyên nhân hình ảnh chưa đạt và kế hoạch hoàn thiện visual/audio

Ngày: 2026-10-01. Code local được kiểm tra: `000c3aa` (short HEAD).

## 1. Kết luận và phạm vi

Mục tiêu: trải nghiệm PvP theo ảnh 1–2 của chủ dự án — tàu đối thủ phía trên, tàu mình phía dưới, tối đa 10 mục tiêu gõ chữ trong không gian, HUD gọn ở góc, đạn/tên lửa có hướng, va chạm và âm thanh có lực. Không biến màn đấu thành bộ thẻ kỹ năng.

**Khoảng cách hiện tại không chỉ do ảnh chưa đẹp. Có lỗi pipeline alpha/compositing đã kiểm chứng, lỗi ưu tiên CSS làm tối nền, mục tiêu vẫn là hình gradient đơn giản, animation ảnh tĩnh và thiếu kết nối combat-event → SFX trong luồng PvP được kiểm tra.** Sinh thêm ảnh mà giữ nguyên các điểm này sẽ tiếp tục cho kết quả không đạt.

Tác vụ này chỉ phân tích, đo ảnh, chạy test và chụp trang chẩn đoán. Không sửa source gameplay/CSS/pipeline, không cài lại asset, không build, không commit/push. Các thay đổi có sẵn của người dùng được giữ nguyên. Không khẳng định repo local bằng GitHub main hoặc build trong ảnh chụp của người dùng.

Ảnh 4 có Hull người chơi bằng 0 và nút Return to Lobby: không lấy một ảnh kết thúc vòng làm bằng chứng rằng toàn trận không có đạn. Tuy nhiên, chất lượng target, matte vuông và cách xử lý màu có thể đối chiếu trực tiếp với code/asset.

## 2. Bằng chứng đã thu thập

### 2.1 Kiểm tra ảnh runtime

`public/assets/space-typing/combat-vfx/` có 13 WebP. Đọc metadata cả 13: **0/13 có alpha**. Tổng file khoảng **1.59 MiB**, tổng diện tích tương đương **36.89 MiB RGBA giải nén**. Đây là ước lượng dung lượng pixel, không phải phép đo RAM/GPU process thực tế.

| File | Kích thước | Alpha | Pixel tối gần đen, opaque |
| --- | --- | --- | ---: |
| bomb-impact.webp | 1024×1010 | Không | 68.07% |
| explosion-wide.webp | 1280×1280 | Không | 52.18% |
| fire-critical.webp | 896×896 | Không | 66.48% |
| smoke-dark.webp | 747×768 | Không | 72.49% |
| shockwave-ring.webp | 1024×1024 | Không | 77.46% |

Điều kiện thống kê tối: max(R,G,B)<20 và alpha≥250 sau ensureAlpha; không phải thuật toán tách nền. Bốn góc các ảnh trên đều RGB 0,0,0 và alpha 255. Source PNG được kiểm tra ở `bomb-impact`, `fire-critical`, `smoke-dark` cũng không có alpha; đuôi PNG không đồng nghĩa nền trong suốt.

### 2.2 Tái hiện lỗi blend trong Chrome

Dùng chính `bomb-impact.webp` và nền sọc tương phản; không chỉnh pixel ảnh:

- A: sprite con `mix-blend-mode: screen` bên trong parent positioned `z-index:1` → vẫn có hình chữ nhật đen.
- B: chuyển screen lên nhóm ghép tương ứng → nền đen biến mất, nhưng khói/mảnh vỡ bị hòa sáng và mất độ che phủ.

Ảnh bằng chứng: [so sánh A/B](../.visual/duel-blend-diagnostic-20261001.png). Đây là **minimal reproduction**, không phải screenshot của toàn trận đã sửa. Nếu gửi report ra ngoài repo, cần gửi kèm ảnh này vì `.visual` bị Git ignore.

Cơ chế phù hợp đặc tả: một isolated group khởi tạo trên backdrop trong suốt; blend bên trong nhóm không tự nhìn xuyên qua mọi stacking context tới nền ngoài. Tham khảo [W3C Compositing and Blending](https://www.w3.org/TR/compositing-1/).

### 2.3 Kiểm tra CSS thật bằng computed style

Nạp trực tiếp `src/duel/battle.css` trong Chrome:

- `.duel-battle` không có map: gradient alpha 0.08 → 0.18.
- Cùng element, thêm `data-map="frost-wastes"`: gradient alpha 0.28 → **0.75**, kèm radial gradient của map.

Selector `.duel-battle[data-map=...]` có specificity cao hơn `.duel-battle` ở cuối file. Đoạn override mới không thực sự làm nhẹ overlay của map như vẻ ngoài khi chỉ đọc cuối CSS.

Ảnh chẩn đoán thứ hai: [blend và cascade](../.visual/duel-blend-and-cascade-20261001.png). Lần chụp thứ hai hoàn tất exit 0, browser logs/exceptions rỗng. Lần thứ nhất đã lưu ảnh thành công nhưng script gặp lỗi ENOTEMPTY khi dọn profile Chrome tạm; không coi lần đó là command PASS toàn bộ.

### 2.4 Test

Chạy đúng ba file:

```text
pnpm exec vitest run tests/combat-vfx-sprites.test.ts tests/duel-battle-dom-contract.test.ts tests/duel-audio.test.ts
3 files / 14 tests PASS
```

Các test này kiểm tra schema manifest, hợp đồng chuỗi source/DOM/CSS và music-profile; không chứng minh alpha, cảm giác animation, nghe tiếng nổ hoặc FPS đạt. Chưa benchmark toàn trận, chưa ghi/nghe audio loopback.

## 3. Findings và hướng sửa

### F01 — High — Contract ảnh VFX và compositing không khớp

- Vị trí: `scripts/bg-art/prepare-combat-vfx.mjs:106` ép alpha=255; `:192` gọi `.removeAlpha()`; `src/duel/battle.css:898` nhóm `.duel-event-fx` có z-index; `:2554` và `:2654` đặt screen ở sprite; `src/duel/battle-ui.ts:1581` sinh map blast.
- Vấn đề: bitmap nền đen opaque phụ thuộc việc blend đúng backdrop. Parent stacking contexts khiến sprite screen vẫn lộ matte vuông như ảnh 3; lửa trên tàu cũng dùng cùng kiểu asset/contract.
- Chắc chắn: cao về dữ liệu ảnh/pipeline; cơ chế lỗi đã tái hiện bằng Chrome. Chưa inspect live DOM đúng phiên đấu trong ảnh của người dùng.
- Sửa: phân loại **emissive** (lửa sáng, flash, tia, vòng năng lượng) và **occluding** (khói, mảnh vỡ, thân vật thể). Loại occluding dùng RGBA thực với source-over; emissive dùng alpha hoặc black-backed sprite trong một pass blend được kiểm soát. Không áp screen lên cả UI/ship/smoke.
- Không sửa bằng đổi đuôi PNG, border-radius, giảm opacity toàn ảnh, blur mép hoặc xóa mọi pixel tối: các cách đó không phục hồi matte chuẩn và dễ phá khói/chi tiết tối.

### F02 — High — Lớp phủ tối của map thắng override mới

- Vị trí: `src/duel/battle.css:60` trở đi, các selector map; `:2866` trở đi, layout combat-first.
- Vấn đề: người triển khai thêm override nền nhẹ ở cuối nhưng selector map vẫn thắng. Frost có lớp phủ tối tới alpha 0.75 ở cuối gradient, làm mất màu và chiều sâu của artwork phía sau.
- Chắc chắn: đã xác nhận computed style; không khẳng định đây là nguyên nhân duy nhất của mọi vùng tối trong ảnh.
- Sửa: chỉ một nơi sở hữu overlay/compositing của battle; theme map cung cấp biến màu thay vì ghi đè nguyên background nhiều nơi. Giữ vùng nền yên cho gameplay bằng art direction/local contrast, không phủ tối mạnh toàn màn.
- QA: kiểm tra cả sáu map và trạng thái damage/finished, không chỉ mặc định không data-map.

### F03 — High đối với mục tiêu mỹ thuật — Target vẫn là gradient placeholder

- Vị trí: `src/duel/battle.css:3133` và các selector category phía sau; `src/duel/battle-ui.ts` tạo span `.duel-target-object`.
- Vấn đề: đá là gradient hình tròn, defense/support cùng hình xoay gradient. Không có silhouette/material riêng tương đương thiên thạch nứt, crystal, drone trong ảnh mẫu.
- Chắc chắn: cao.
- Sửa: dùng sprite chất lượng cao theo **action ID ổn định**, category chỉ là fallback. Không ánh xạ theo chữ người chơi thấy: `src/duel/map-actions.ts` thay token/label theo map.
- 10 là cap số target nhìn thấy cùng lúc, không phải tổng số loại art cần hỗ trợ. Phải audit tất cả action ID đang chạy và biến thể map.

### F04 — High đối với game feel — Ảnh nổ tĩnh bị dùng như cả animation

- Vị trí: `src/duel/battle.css:2784` trở đi; fire/smoke ở `:2751` trở đi.
- Vấn đề: đổi scale/rotate/opacity của một ảnh làm khói và mảnh vỡ nở cùng tốc độ; lửa trên tàu là hai bản cùng ảnh lắc qua lại. Đây là chuyển động của tấm ảnh, chưa phải diễn tiến vật lý của vụ nổ.
- Chắc chắn: cao từ keyframes; chất lượng cảm nhận cuối cần video thời gian thật.
- Sửa: burst dùng flipbook có pha hình thể thay đổi; khói dùng puff/layer có tốc độ riêng; fragment bay tách; fire loop riêng. Một flash/ring đơn giản vẫn có thể dùng ảnh tĩnh + transform, không bắt mọi thứ thành flipbook.

### F05 — High đối với âm thanh — Event combat chưa nối tới SFX ở integration đã kiểm tra

- Vị trí: `src/duel/battle-ui.ts:2222` truyền view và events tới hook; `src/main.ts:1147` nhận view, chỉ gọi `syncDuelAudio`; `src/duel/audio.ts` ánh xạ music profile/state.
- Vấn đề: đường này có nhạc theo phase nhưng chưa có router cho shot/impact/bomb/shield-break. Có asset/Sfx dùng trong PvE không có nghĩa PvP tự phát chúng.
- Chắc chắn: cao về đường hook; chưa nghe runtime nên không tuyên bố mọi nguồn âm thanh khác đều im lặng.
- Sửa: một presentation/audio router nhận event hợp lệ, chống phát trùng, chọn recipe âm thanh theo action/effect. Tái sử dụng audio bank hiện có khi phù hợp thay vì tạo AudioContext/bank riêng cho từng mode.

### F06 — Medium — Nổ lớn và cap chưa thống nhất giữa các đường spawn

- Vị trí: `src/duel/battle-ui.ts:1581` spawnMapBlast; `:1976` spawnFx; `src/duel/battle.css:2654` trở đi.
- Vấn đề: map blast rộng tới 920 CSS px, shockwave tới 1240 CSS px rồi tiếp tục scale. spawnMapBlast giới hạn riêng năm blast, nhưng còn thêm shockwave/secondary; không dùng chung gate MAX_FX_NODES cho mọi lần append.
- Chắc chắn: cao về code; chưa đo được đây gây bao nhiêu ms hoặc vượt cap ở phiên cụ thể.
- Sửa: phân cấp hit nhỏ/finisher/bomb/ultimate; một điểm quản lý budget cho toàn bộ transient FX. Cap cả diện tích blend phủ màn, không chỉ node count. Không để một burst chuẩn che gần toàn field.

### F07 — Medium — Presentation đang ghép impact vào animationend của projectile

- Vị trí: `src/duel/battle-ui.ts:1852` trở đi.
- Vấn đề: nếu thêm âm thanh một cách đơn giản ở action event, tiếng nổ có thể đi trước hình impact; nếu phụ thuộc hoàn toàn animationend, element bị cap/remove hoặc tab lifecycle có thể làm mất phần kết thúc.
- Chắc chắn: cao về cấu trúc; là rủi ro tích hợp, không bằng chứng network authority hiện sai.
- Sửa: dùng presentation timeline/cue time chung cho hình và tiếng, cleanup theo lifecycle. Kết quả damage/reward vẫn do DuelEngine/authority quyết định, không đợi animation hoặc audio.

### F08 — Medium — Trạng thái loaded hiện chưa chứng minh ảnh decode thành công

- Vị trí: `src/vfx/combat-vfx-sprites.ts` preloadCombatVfxSprites; `src/duel/battle-ui.ts:585` applyPaintedCombatVfx.
- Vấn đề: manifest hợp lệ dẫn tới tạo Image/src nhưng không await decode hoặc xác nhận mọi ảnh load được. Dataset painted-vfx dựa vào có URL, không dựa vào khả năng render.
- Chắc chắn: cao.
- Sửa: preload/decode trước trận cho asset thiết yếu, cache handles, báo lỗi rõ và fallback tương ứng. Thêm metadata blend/alpha/frame/pivot thay vì chỉ width/height/url/hash.

## 4. Art direction để đạt tinh thần ảnh 1

Ảnh 1 là mốc bố cục/material/nhịp chiến đấu; không nên hiểu là mọi pixel, tia, đám khói phải sáng và đông như vậy ở mọi thời điểm.

1. **Bố cục:** giữ tàu đối thủ trên và mình dưới, field mở, HUD gọn góc như ảnh 2. Không thêm card deck/hotbar che trung tâm. Target tối đa 10, tránh vùng HUD và tàu, label không đè nhau.
2. **Độ sâu:** nền xa giàu màu nhưng tương phản cục bộ thấp hơn target; midground có số ít asteroid rõ khối; foreground hiếm, không che chữ. Decorative asteroid không mang cùng tín hiệu lock/label như target có thể gõ.
3. **Điểm nhìn:** target được chọn, đường đạn và nơi trúng là các vùng sáng chính. Không dùng cùng cường độ glow cho cả nebula, mọi crystal, HUD và blast.
4. **Material:** asteroid opaque có khối và khe năng lượng; crystal có mặt cắt rõ; drone có hình cơ khí riêng. Không dùng cùng quả cầu cho missile/bomb và cùng giọt nước cho mọi buff.
5. **Typography:** chữ render bằng UI, không bake vào ảnh. Nền nhãn nhỏ, tương phản ổn định. Không copy lỗi chữ hoặc dữ liệu HUD giả trong ảnh concept.
6. **HUD:** portrait tàu và màu Hull/Shield/Energy phân biệt; hiển thị số liệu từ state thật. Ping chỉ có khi có dữ liệu network thật; local bot không gắn số ping giả. Không tự thêm Rage/ultimate nếu chưa có mechanic tương ứng.
7. **Tỉ lệ màn:** ảnh concept gần 16:9, ảnh game người dùng rộng hơn. Duyệt tại viewport thật trong Portal, không kéo dãn toàn scene để giống một ảnh 16:9.

## 5. Những asset nên giữ, tạo thêm hoặc làm lại

### Giữ có điều kiện

- Ship V3 và background hiện có: audit màu, alpha/padding và hiệu năng trước; không mặc định tạo lại tất cả.
- Asteroid/enemy/drone art đang có: chỉ reuse nếu đúng góc camera, silhouette, quyền sử dụng và ý nghĩa gameplay. Không dùng nguyên UI icon có frame làm world sprite.
- 13 VFX cũ: giữ source, một phần glow/flash có thể dùng trong pass emissive; các ảnh gộp khói + lửa đen chưa được duyệt thành final occluding sprite. Không xóa nguồn hàng loạt.
- Bộ credit crystal đã tạo: chỉ reuse sau kiểm tra không làm người chơi nhầm currency pickup và action target của PvP.

### Art package đề xuất

| Nhóm | Deliverable | Hướng tạo/chuẩn bị |
| --- | --- | --- |
| Attack targets | Laser core, missile pod, bomb core, rail/lance object | Sprite riêng, alpha, silhouette và lõi năng lượng khác nhau |
| Defense/support | Shield crystal, reflect/barrier variant, repair object/drone, energy crystal, amplifier, lock-on module | Chung phong cách nhưng khác hình, không chỉ recolor |
| Tactical/special | Scan module, disrupt device, gravity object, fate crystal, black-hole object | Dựa action ID thật; map variant tái sử dụng geometry khi phù hợp |
| Projectile | Bolt head, missile body, tracer texture, smoke puff | Tách body/glow/trail; đường bay do runtime |
| Impact | Small energy hit, shield hit, kinetic hit | Short flipbook/animated recipe; ít che chữ |
| Heavy explosion | Fire/emission flipbook + smoke flipbook + debris sprites + ring | Các lớp riêng, alpha/blend được khai báo |
| Ship damage | Fire loop nhỏ/vừa, smoke puff, anchor metadata | Gắn đúng vị trí tàu; không phủ ảnh vuông toàn frame |
| Atmosphere | Asteroid midground cần thiết, background đã cân màu | Không bake tàu/đạn/label vào wallpaper |

Không chốt số ảnh cuối cùng trước asset audit + mapping action ID. Một texture tái sử dụng qua nhiều recipe không cần tạo lại; một animation nhiều frame không được đếm là một sprite tĩnh tương đương.

Checklist mapping hiện tại từ `src/duel/actions.ts` gồm 18 ID: `laser`, `missile`, `railgun`, `bomb`, `siege-lance`, `shield`, `reflect`, `barrier`, `repair`, `energy`, `amplify`, `drone`, `lock-on`, `gravity`, `disrupt`, `scan`, `fate-crystal`, `black-hole`. Tên category như `mystery` không thay thế một action ID. Cần kiểm tra thêm các token phản ứng đính kèm (ví dụ `intercept` của siege-lance): không tự biến chúng thành action/target mới độc lập.

### Cách dùng công cụ tạo ảnh

- Dùng image generation tạo từng world object/keyframe đẹp, dùng reference đã duyệt để khóa phong cách; mỗi asset riêng, không dùng screenshot toàn trận làm runtime texture.
- Yêu cầu true alpha cho vật thể/khói cần che nền. Nếu generator không trả alpha đúng: đánh dấu source cần hậu kỳ; không gọi là production-ready chỉ vì đuôi PNG.
- Lửa phát sáng có thể tạo trên nền đen cho additive/screen, nhưng tuyệt đối không áp cùng pipeline đó cho khói tối.
- Dùng công cụ VFX/3D/compositing hoặc bộ animation có license phù hợp để làm sequence có temporal coherence. AI tạo nhiều frame độc lập có thể đổi hình, pivot, kích thước giữa frame; phải kiểm tra, không mặc định tạo sprite sheet đẹp là animate đẹp.
- Sprite sheet/atlas là bước đóng gói **sau** khi frame được chuẩn hóa; frame grid, FPS, frame count, pivot và padding cần chính xác.
- Master lớn giữ làm nguồn. Runtime dùng độ phân giải phù hợp kích thước nhìn và DPR, không decode mọi master 2K/4K trong trận.

## 6. Hợp đồng asset và renderer đề xuất

Mỗi asset/sequence cần metadata: id, version/hash, dimensions, frame rectangles/count/FPS nếu có, pivot, visible bounds, blend mode, alpha convention, looping, lifetime, quality variants và estimated decoded bytes. Schema cụ thể là công việc triển khai sau, không phải hiện repo đã hỗ trợ.

Tách ba nhóm:

1. **World/opaque:** tàu, asteroid, drone, crystal → alpha/source-over.
2. **Occluding FX:** khói, mảnh vỡ → alpha/source-over có feather đúng.
3. **Emissive FX:** glow, tia, flash → additive hoặc screen trong pass được kiểm soát.

HUD/label luôn ở lớp dễ đọc, không tham gia screen toàn scene. Chỉ đặt screen lên một container riêng chứa emission đã chuẩn bị, không đặt lên `.duel-battle` để sửa tạm tất cả.

Giải pháp production ưu tiên: giữ DOM cho HUD/label/input; gom transient VFX vào **một FX renderer/lifecycle owner** có pool, timeline và layer rõ. Chọn Canvas2D hay WebGL sau đo tải thực tế; không cần thay toàn bộ engine hoặc thêm hai renderer cùng vẽ một hiệu ứng. Canvas offscreen trong suốt rồi đưa lên DOM vẫn có thể giữ matte đen nếu alpha/blend sai — đổi renderer không tự chữa asset.

Phân biệt dứt khoát: state trận → event presentation → animation/audio. RNG cosmetic và thời gian animation không thay đổi damage, hit authority hoặc khả năng thắng.

## 7. Recipe chuyển động — không chỉ tăng số lượng hiệu ứng

Các khoảng dưới đây là **mốc thiết kế ban đầu**, cần nghiệm thu bằng video và điều chỉnh; không phải số đo hiện tại.

### Laser / đạn thường

- Muzzle flash rất ngắn, bolt có đầu sáng/thân màu/đuôi nhỏ, đường bay rõ từ muzzle tới đích.
- Impact nhỏ theo loại vật liệu; không spawn map-wide explosion cho từng ký tự.
- Volley có độ trễ ngắn giữa nòng, không tạo nhiều bản hoàn toàn chồng nhau cùng frame.

### Missile

- Body có hướng quay theo tiếp tuyến, quỹ đạo cong nhẹ, trail được lấy mẫu theo quãng đường và có cap.
- Smoke puff nở/chậm/tan theo tuổi, không kéo giãn một ảnh khói thành sợi dài.
- Telegraph phân biệt đạn còn bay với đòn đã resolve. Đạn cosmetic không giả làm threat tương tác nếu gameplay không có.

### Bomb

| Pha | Mốc gợi ý | Hình/âm |
| --- | --- | --- |
| Contact | 0–60 ms | Flash ngắn + crack/transient |
| Expansion | 40–220 ms | Fireball biến dạng + body tiếng nổ |
| Pressure | 80–350 ms | Shockwave mỏng + punch trầm có kiểm soát |
| Debris | 120–700 ms | Mảnh bay khác hướng, giảm tốc + vài tick |
| Dissipation | 200–1000 ms | Khói alpha nở chậm rồi tan + tail |

Các pha chồng nhau, không phải chờ nối từng pha. Screen shake nhỏ, ngắn; HUD ổn định; có reduced-motion/flash. Bomb thường không đồng nghĩa ultimate toàn màn. Không pause timer/input/PvP authority để tạo hit-stop; nếu cần chỉ tác động presentation cục bộ có giới hạn.

### Damage trên tàu

- Fire xuất hiện ở anchor hull/engine, tỷ lệ theo damage tier.
- Hai loop lệch phase, không hai bản một ảnh to nhỏ đè lên nhau.
- Smoke đi đúng hướng chuyển động quy ước; chữ/HUD không rung theo tàu.

## 8. Âm thanh có lực nhưng không chỉ lớn hơn

Tạo/mua/sử dụng sample offline chất lượng tốt với license rõ; không cần model audio chạy trên máy người chơi. Tái sử dụng Sfx/sample-bank đã có sau khi nghe đối chiếu. Công cụ tạo ảnh không thay thế công cụ tạo/biên tập âm thanh.

Một tiếng bom tốt có lớp transient sắc, body trung-trầm, sub ngắn và debris/tail. Loa Mac không thể hiện sub như loa lớn, nên phải có phần mid-bass/body nghe rõ; chỉ tăng bass sâu hoặc gain sẽ không tạo cảm giác mạnh tương đương.

Danh mục cần mapping: shot, missile launch, kinetic/energy impact, bomb, shield-hit, shield-break, repair/energy, lock/scan/disrupt, ship destruction, round result. Dùng vài biến thể và pitch/gain variation nhẹ để giảm lặp; giữ âm tín hiệu gameplay nhận biết được.

Yêu cầu integration:

- Music và SFX tách vai trò; nhạc duck nhẹ khi explosion chủ đạo, không tắt/mở giật theo mọi viên đạn.
- Muzzle audio tại launch; impact audio cùng thời điểm impact hình. Không đợi network gây chậm feedback nhập liệu, nhưng không phát authoritative explosion hai lần từ prediction và confirmed event.
- Deduplicate theo match/round/event hoặc presentation identity phù hợp protocol thật; không tự giả định event schema đã có ID đủ dùng.
- Cap voice tổng và theo nhóm; ưu tiên cảnh báo/major hit, bỏ bớt debris trùng thay vì chồng vô hạn.
- Predecode trước trận, dùng voice pooling/bank phù hợp; không tạo Audio element/AudioContext ở từng ký tự.
- Headroom/limiter, kiểm tra nhiều vụ nổ cùng lúc không clip. Pan theo vị trí vừa phải; tránh stereo cực đoan làm người dùng chỉ nghe một tai.
- Reset/hide/tab suspend/round end giải phóng voice, timer và callback đúng. Quy định rõ loại tail nào được phép kết thúc sau round.
- Nghe thật bằng loa Mac và tai nghe ở cùng volume. Chỉ số peak/loudness và test unit không đủ để kết luận âm thanh hay.

## 9. Hiệu năng phải được thiết kế cùng mỹ thuật

- Tôn trọng các budget hiện có trong `src/duel/performance.ts`: frame p95 20 ms, p99 28 ms, input-paint p95 50 ms, tối đa 18 projectile / 24 FX nodes. Đây là gate repo hiện tại, **không phải kết quả đo phiên này**. 20 ms cũng không tương đương bảo đảm 60 FPS đều đặn.
- Nếu đổi node model sang pool/canvas, cần cập nhật diagnostics để đếm FX sống thật, không giữ số node thấp giả tạo trong khi GPU vẽ hàng trăm sprite.
- Cap lớn nhất cho heavy blast; không có năm lớp gần toàn màn cùng lúc chỉ vì chưa chạm node budget. Có thể gom/giảm secondary khi nhiều event đồng thời, vẫn giữ feedback chính của mỗi action.
- Ưu tiên texture đã vẽ đẹp và nhỏ thay cho blur/drop-shadow lớn trên từng DOM element. Đo trước khi kết luận Canvas/WebGL nhanh hơn CSS.
- Một sheet 16 frame ×512² tương đương 16 MiB RGBA trước overhead. Nhiều animation đẹp có thể đội memory rất nhanh; chỉ load theme/recipe cần dùng, không tất cả quality cùng lúc.
- Quality giảm secondary smoke/debris/overdraw trước, không thay target đẹp bằng quả cầu placeholder và không đổi độ rõ telegraph.
- Bỏ forced synchronous layout ở feedback gõ khi có cách restart animation không cần `offsetWidth` (`battle-ui.ts:1480`); đây là điểm cần profile, chưa chứng minh là nguyên nhân lag chính.
- Đo cùng viewport, DPR, scene seed, thời gian warm-up, quality và trạng thái máy. Không so ảnh headless fixture với FPS trận thật rồi báo hiệu năng PASS.

## 10. Trình tự triển khai production đề xuất

Đây là các bước của cùng bản production, không phải làm demo rồi bỏ. Không tuyên bố hoàn thành khi mới hết nền đen.

1. **Chốt visual contract:** lấy ảnh 1–2 làm tham chiếu; audit asset/action ID và các loại VFX. Giữ rule PvP, không sửa economy/balance ngoài phạm vi.
2. **Sửa contract pipeline/compositing và cascade:** tách emissive/occluding; kiểm tra alpha; đảm bảo map overlay thực sự đúng computed style. Có thể dùng blend-group correction làm sửa lỗi trước mắt, nhưng không gọi đó là hoàn thiện khói.
3. **Hoàn thiện target sprites và HUD:** tạo artwork bằng công cụ theo style reference; mapping hết action ID; đúng pivot/size; chữ vẫn render động.
4. **Hoàn thiện animation recipes:** projectile paths, muzzle, impact, bomb, ship damage. Chọn một owner cho timeline, pool và budget.
5. **Kết nối âm thanh:** sound palette + event routing + mixing/dedup; cùng clock presentation với VFX, độc lập authority.
6. **Nghiệm thu toàn bộ:** ảnh, video, nghe thật, performance trên Mac, replay/round lifecycle và sáu map. Sửa cho đạt các gate rồi mới gọi PASS.

## 11. Checklist nghiệm thu bắt buộc

### Asset và alpha

- Không có khung vuông trên nền trắng, đen, checkerboard thật và background sáng/tối trong game.
- Thử cả asset riêng và cây DOM/render thật: z-index, opacity, filter, transform, isolation, quality tier đều có thể ảnh hưởng blend.
- Khói tối vẫn che nền tự nhiên; glow không có matte bẩn; không dùng thuật toán làm mất mảnh vỡ/chi tiết tối để che lỗi.
- Flipbook không lệch pivot/đổi crop giữa frame; mép texture có padding đủ để tránh atlas bleed.

### Visual/gameplay

- So sánh cùng viewport thật `1642×799`, DPR 2 theo `docs/VISUAL_TESTING.md`, cộng viewport của ảnh người dùng nếu khác. Chụp trạng thái idle/typing/volley/impact/low Hull/round end.
- Video ở tốc độ thật và quay chậm kiểm tra 3–5 thời điểm của vụ nổ; không duyệt từ một frame đẹp nhất.
- Không che label/telegraph; target có thể phân biệt bằng hình, không chỉ màu. Tối đa 10 mục tiêu visible; không click hitbox lệch sprite.
- Kiểm tra variant map, High/Ultra và reduced motion. Không hạ máy người dùng xuống Low để giấu vấn đề.
- Hình bắn/trúng đúng nguồn/đích, không lặp do event replay/reconnect; không phụ thuộc animationend để tính damage.

### Audio/performance

- Major explosion có transient/body/tail, không clipping khi chồng nhiều event; cảnh báo và từ đọc vẫn nghe được nếu chế độ có dùng.
- Không phát âm thanh lặp do prediction+confirmation, không còn voice/FX sau lifecycle cần dừng.
- Thu p95/p99 frame, input-paint, memory và số FX thực ở cảnh đông; so baseline cùng điều kiện; không chỉ đo idle.
- Unit/integration tests thêm: alpha/blend contract, missing/decode failure, event→SFX mapping, dedup, round cleanup, caps của mọi spawn path. Các source-string tests hiện có không thay visual/audio QA.

## 12. Kết luận bàn giao

**Hướng hợp lý nhất: giữ engine PvP và bố cục combat-first, nâng cấp asset contract + target art + compositing/animation + combat SFX theo một bộ quy cách thống nhất.** Chưa có cơ sở yêu cầu viết lại toàn bộ game.

Ưu tiên công cụ tạo artwork đẹp là đúng, nhưng cần sản xuất **các lớp có thể tích hợp** chứ không phải poster nổ rồi phóng lớn trong CSS. Ảnh 1 có thể làm mốc chất lượng; không cam kết đạt chỉ bằng số lượng ảnh hoặc một dòng blend.

Trạng thái hiện tại: **phân tích hoàn tất với bằng chứng alpha, Chrome blend/cascade và 14 test; chưa sửa code, chưa tạo bộ art mới, chưa nghiệm thu chất lượng runtime/audio/FPS.**
