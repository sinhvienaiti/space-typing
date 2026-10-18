# SPACE TYPING PvP — Bộ prompt media đầy đủ cho Gemini

Ngày đối chiếu repository: **2026-10-02**. Ngôn ngữ hướng dẫn: Việt; prompt tạo media: Anh.

## 0. Đọc phần này trước khi tạo bất kỳ file nào

Đây là **bộ yêu cầu nguồn media thay thế/nâng cấp**, không phải thông báo game đang thiếu 56 asset, không phải lệnh sửa code, và không phải yêu cầu sinh tất cả ngay khi đọc tài liệu.

Repository hiện đã có:

- 18 target WebP trong `public/assets/space-typing/duel-targets/`.
- 13 VFX WebP động trong `public/assets/space-typing/combat-vfx/`, manifest hiện mô tả 256×256, 12 frame, 16 fps.
- 22 SFX Ogg và 3 music Ogg trong `public/assets/audio/duel/`.
- Artwork tàu và bolt/finisher/muzzle/impact riêng từng tàu đang được dùng lại từ Campaign.

**Giữ nguyên tàu, đạn Campaign và background hiện có. Không tạo lại ba nhóm này trong gói này.** Target `laser.png` là vật thể người chơi gõ để nhận/dùng action, KHÔNG phải ảnh viên đạn laser đang bay. Tương tự, `missile.png` là target; `missile-salvo.png` là key art của VFX; `missile-launch.wav` là âm thanh. Không thay nhầm các nhóm.

Tất cả mục có trạng thái mặc định **REUSE-FIRST**: giữ asset hiện tại nếu đã đạt. Chỉ sinh file người dùng chọn, hoặc toàn bộ nhóm khi người dùng nói rõ tạo lại cả nhóm. Không tự đổi REUSE-FIRST thành REQUIRED. **Số file mới bắt buộc chỉ để game chạy: 0.** Có file trên ổ đĩa không có nghĩa file đó đã đạt chất lượng hình ảnh/âm thanh; tài liệu này không chứng nhận chất lượng toàn bộ media hiện có.

### 0.1 Phạm vi và cách đếm chính xác

| Nhóm | Mã | File nguồn nếu tạo lại toàn bộ | File runtime tương ứng | Trạng thái |
| --- | --- | ---: | --- | --- |
| Target | T01–T18 | 18 PNG RGBA | 18 WebP tĩnh | REUSE-FIRST |
| VFX key art | V01–V13 | 13 PNG RGBA | Chưa dùng trực tiếp thay VFX động | REUSE-FIRST |
| SFX | S01–S22 | 22 WAV | 22 Ogg Vorbis | REUSE-FIRST |
| Nhạc | M01–M03 | 3 WAV | 3 Ogg Vorbis | REUSE-FIRST |
| VFX chuyển động | Cùng V01–V13 | Dẫn xuất từ 13 key art, không phải 13 ý tưởng khác | 13 animated WebP | Chỉ sản xuất khi thay sequence |

- Gói **ảnh nguồn** đầy đủ: **31 PNG**, không phải 31 ảnh game tự dùng ngay.
- Gói **âm thanh nguồn** đầy đủ: **25 WAV**.
- Tổng nguồn sáng tạo: **56 file = 31 PNG + 25 WAV**.
- Nếu bàn giao thêm đủ animation runtime: thêm **13 WebP động**, tổng **69 file media**, chưa tính metadata/preview/frame trung gian.
- Nếu bàn giao frame PNG trung gian: 13 sequence × 12 frame = **156 frame**. Các frame là bản dẫn xuất chuyển động; không tính chúng thành 156 thiết kế mới.
- Gói runtime đầy đủ vẫn là **56 file: 18 WebP tĩnh + 13 WebP động + 25 Ogg**. Không cộng nguồn và runtime rồi gọi thành số asset thiếu.

### 0.2 Làm gì trước để cải thiện cảm giác combat?

1. Kiểm tra/nâng cấp V01, V02, V03, V12: nổ lõi, nổ lớn, shockwave, bom. Đặc biệt loại bỏ nền chữ nhật và khói đen bị gộp sai lớp phát sáng.
2. Nghe và chọn thay S02, S06, S09, S11, S18: bắn chính, trúng đạn, bom, vỡ shield, phá hủy tàu. Đây là ưu tiên thiết kế, không khẳng định các file hiện tại đều hỏng.
3. Nâng cấp target nào còn giống icon/UI phẳng, không cần tạo lại cả 18 nếu bản hiện tại tốt.
4. Music và các VFX còn lại giữ trước nếu phù hợp. Không thêm hiệu ứng chỉ để màn hình đông hơn.

Ảnh đẹp không tự sửa được timing, layering, voice mixing hoặc FPS. Tích hợp vẫn cần code/manifest, duyệt chuyển động và đo hiệu năng.

## 1. Cách giao việc cho Gemini

Gửi **toàn bộ file này**, kèm ảnh demo PvP của chủ dự án nếu có. Ảnh demo chỉ tham khảo chất liệu và năng lượng; **không sao chép nguyên cảnh thành sprite**, không chép HUD/chữ/nền vào từng asset. Nếu chưa gửi ảnh demo, dùng mô tả độc lập trong tài liệu, không nói đã xem ảnh.

### 1.1 Lệnh tạo đủ ảnh nguồn, KHÔNG âm thanh/animation

```text
Read this document completely before generating.
For this request, I explicitly authorize regeneration of all REUSE-FIRST
image-source assets T01–T18 and V01–V13: exactly 31 individual PNG files.
Do not generate ships, ship bullets, backgrounds, music, SFX, or animations.
Apply the shared IMAGE wrapper and the one matching per-file prompt.
ONE IMAGE GENERATION TASK = ONE NAMED PNG FILE. No contact sheets.
Preserve canonical paths and filenames. Prefer genuine transparent RGBA.
If real alpha cannot be exported, mark that asset ALPHA_POSTPROCESS_REQUIRED;
do not pretend that a black/white/checkerboard background is transparency.
Do not call a VFX key-art PNG an animated effect.
Package completed files as specified in section 9, using real files/links only.
Report the exact successful, failed and postprocessing-required filenames.
```

### 1.2 Lệnh tạo chọn lọc

```text
Read the entire document. Generate only V01, V02, V03 and V12 as four
independent source PNGs. All other entries remain REUSE-FIRST and must
not be regenerated. Do not create animation or audio in this request.
Use the shared IMAGE wrapper plus the matching prompt for each filename.
```

Thay danh sách mã theo lựa chọn thực tế. Không dùng câu mơ hồ “tạo tất cả” nếu chỉ muốn ảnh.

### 1.3 Lệnh âm thanh — chỉ khi công cụ đang dùng có khả năng xuất audio

```text
Create only S01–S22 and M01–M03: 22 isolated sound effects and 3 music loops.
Apply the AUDIO or MUSIC wrapper plus the matching per-file prompt.
Return real playable audio files, not images of waveforms or descriptions.
If your current tools cannot synthesize/export these audio files, say so;
return the production briefs as NOT_GENERATED and do not invent download URLs.
Do not generate images or videos in place of audio.
```

Tài liệu **không mặc định mọi phiên bản/chế độ Gemini đều có công cụ sinh ảnh alpha, WAV hay animation**. Nếu công cụ chỉ sinh ảnh, dùng nó cho 31 PNG; chuyển brief audio/animation sang công cụ có khả năng phù hợp. Không đổi đuôi MP3 thành WAV hoặc MP4 thành WebP để giả xuất đúng định dạng.

## 2. Quy cách chung — bắt buộc nối trước từng prompt ảnh

### 2.1 IMAGE wrapper

```text
CRITICAL IMAGE DELIVERY CONTRACT
Create exactly ONE raster image for the ONE canonical PNG filename supplied
in the current task. Never print the filename inside the image.
Reset subject and palette from previous tasks; preserve only this pack's
shared premium cinematic sci-fi material language.

Output target: 1024 x 1024 PNG, sRGB, straight/unassociated RGBA alpha.
Exactly one isolated subject or one cohesive effect as specified below.
True transparent background; no black plate, white plate, galaxy, ground,
horizon, checkerboard pixels, surrounding environment or rectangular glow.
Keep the entire subject and glow inside the canvas. Minimum 12% transparent
margin on every side. Approximate visible bounding span: 65–76% of canvas.
Center the intended visual pivot at (512, 512), except when the file prompt
explicitly describes an off-center flame shape around that central anchor.
No baked cast shadow on a floor; self-shadowing on solid material is allowed.
Metal/object surfaces remain opaque; only glass, energy and edge glow may
be partially transparent. Do not make the entire object ghost-like.

Targets: convincing game-ready miniature world objects, strong silhouette,
limited large material masses, readable at 48–72 CSS pixels. Not flat UI icons.
VFX: isolated effect artwork, not a photographed explosion inside a scene.
Controlled bloom, no giant opaque white disk and no clipped luminous edges.

No text, letters, numbers, logos, watermarks, cards, badges, HUD, border,
collage, comparison board, sprite sheet, alternate designs, or extra assets.
Do not claim alpha, dimensions or file type were validated unless measured.
If a required export feature is unavailable, report it honestly.
```

### 2.2 Khi copy prompt riêng

Một task ảnh = wrapper ở 2.1 + **đúng một** block T hoặc V bên dưới. VFX cần nhiều spark/debris vẫn là **một cụm hiệu ứng**; quy tắc một asset không cấm các hạt thuộc cùng hiệu ứng.

Không tự nối prompt `laser.png` vào prompt `missile.png`. Không để model tạo một bảng 18 biểu tượng rồi cắt — tỷ lệ, viền và alpha thường sai.

### 2.3 Transparency và lỗi nền vuông

- Alpha thật là kênh dữ liệu: bên ngoài vật thể phải trong suốt khi đặt trên cả nền đen, xám và sáng. Nền caro được vẽ vào RGB **không phải alpha**.
- Target: ưu tiên phần vật thể đặc; không key toàn bộ màu đen vì sẽ đục thủng kim loại tối.
- VFX phát sáng và khói/mảnh vỡ phải tách lớp. Smoke dùng alpha bình thường; không dùng screen để “xóa nền đen” vì sẽ làm mất khói tối.
- Prompt không bảo đảm generator xuất alpha đúng. File không đạt giữ trong staging với trạng thái `ALPHA_POSTPROCESS_REQUIRED`, chưa đưa vào production.
- Nếu chỉ xuất được nền đen cho VFX ánh sáng, đó là nguồn cần xử lý lại, **không phải bản PASS**. Không áp dụng cách chuyển nền đen của light sprite lên target/smoke/debris.

## 3. Nhóm T — 18 target world-object PNG

Thư mục nguồn trong gói giao: `Duel_PVP_Media_Source/targets/`. Tất cả **REUSE-FIRST**.

Phong cách chung: vật thể không gian có thể bắn/thu thập, không phải nút bấm. Góc 3/4 nhẹ, ánh sáng chính phía trên-trái, viền lạnh nhẹ, gunmetal/titanium với màu chức năng. Tránh chi tiết chữ nhỏ. Không đưa từ typing vào ảnh — game tự vẽ chữ ngẫu nhiên.

### T01 — `targets/laser.png`

```text
Create laser.png: one compact laser emitter core, a tangible free-floating
weapon module. Use a short gunmetal body, one clear forward optical aperture,
two sturdy cooling fins and an exposed cyan-white energy chamber. Three-quarter
view, aperture aimed toward upper-right. Cyan is the dominant light accent;
opaque dark metal is the dominant material. A restrained glow stays attached
to the chamber. Recognizable at 48 pixels without fine engraving.
Do not draw a laser beam, ship, gem, circular UI badge or abstract flat symbol.
One centered isolated object, true-alpha PNG, per shared image contract.
```

### T02 — `targets/missile.png`

```text
Create missile.png: one guided sci-fi missile body with a pointed nose, compact
segmented hull and four short guidance fins. Diagonal lower-left to upper-right,
nose upper-right, engine lower-left. Brushed titanium, dark seams, restrained
amber engine aperture and small cyan sensor. The fins must remain visible at
small scale. Short local glow only; no smoke trail or active launch sequence.
Differentiate from a spherical bomb and a long open-frame railgun.
No swarm, spaceship, words or insignia. One isolated true-alpha world object.
```

### T03 — `targets/railgun.png`

```text
Create railgun.png: one heavy electromagnetic weapon module with two parallel
exposed rails, a dark central gap, squat rear capacitor block and reinforced
muzzle. Orient its long axis lower-left to upper-right. Industrial gunmetal,
blue-white capacitor strips and pale steel edges. Emphasize a rectangular,
precise kinetic silhouette; the rail gap must survive thumbnail reduction.
No crystalline blade, rocket fins, beam, sparks crossing the canvas or turret
base attached to scenery. One centered opaque mechanical object on real alpha.
```

### T04 — `targets/bomb.png`

```text
Create bomb.png: one dense faceted demolition charge, approximately spherical
with armored plates, deep locking seams and a short mechanical arming collar.
Dark tungsten shell with restrained orange-red light leaking from three seams.
Weight and explosive containment, not a smooth glowing ball. Use a broad clear
silhouette with no skinny fuse. Show the intact bomb before detonation.
No explosion, mushroom cloud, warning text, hazard sign, skull or cartoon face.
Single centered world object, opaque hull, genuine transparent background.
```

### T05 — `targets/siege-lance.png`

```text
Create siege-lance.png: one advanced siege energy-lance emitter. A narrow long
spine with two swept armored prongs encloses a brilliant crimson-white reactor
near the front. Rear housing is compact, angular and silver-black. Point the
weapon upper-right. Compared with railgun, make this tapered, blade-like and
elite, not twin parallel industrial rails. Keep all geometry compact enough
to read as one target. No emitted beam, sword handle, huge wings or ship.
Controlled local red emission, opaque metal, true-alpha isolated PNG.
```

### T06 — `targets/shield.png`

```text
Create shield.png: one compact shield generator with three solid projector
petals around a cyan core. Let the petals suggest a protective triangular
silhouette, with a thin local cyan energy rim connecting their tips. The device
itself is opaque brushed alloy, not a translucent shield icon. Three-quarter
view with visible depth. No full-screen bubble, enclosing card or heraldic
shield badge. Differentiate from the broad heavy barrier and mirror-like
reflect module. One centered machine on genuine transparent alpha.
```

### T07 — `targets/reflect.png`

```text
Create reflect.png: one angular deflection module consisting of three mirrored
alloy vanes tilted around a small violet core. Form a pinwheel-like physical
silhouette, not a circular UI arrow. Mirror faces have readable silver planes
and cyan-violet reflections; no reflected landscape. Metal stays solid and
opaque. The object communicates redirection rather than a thick protective
wall. No incoming bullets, arrow symbols, letters or full shield bubble.
Centered miniature sci-fi world object, crisp edges, real transparent alpha.
```

### T08 — `targets/barrier.png`

```text
Create barrier.png: one heavy defensive field projector, broad and squat with
two reinforced shoulder blocks, thick armor ribs and a recessed cyan energy
slot. The stable blocky silhouette must contrast with the lighter three-petal
shield generator. Small energy arcs may connect the blocks, but no large wall
or dome surrounds the device. Dark navy steel, pale worn edges, controlled
blue light. No door, building, UI panel, shield symbol or typography.
One centered tangible mechanism, opaque material, transparent RGBA background.
```

### T09 — `targets/repair.png`

```text
Create repair.png: one nanite maintenance canister with two short folded tool
arms, a protected teal-green reservoir and a compact rectangular service body.
Machinery first, healing light second. Off-white ceramic panels, gunmetal joints
and a single vivid green core identify restoration without medical symbols.
Use large readable parts, not many tiny tools. No red cross, plus sign, text,
human hand, robot face or attached ship. No healing beam crossing the image.
One isolated centered service object with real alpha and solid surfaces.
```

### T10 — `targets/energy.png`

```text
Create energy.png: one technical power cell, a short vertical cylindrical
containment chamber locked between two thick dark metal end caps. Inside is
golden plasma with a small white-hot center; cool cyan contacts mark the caps.
Keep the chamber readable and mostly contained, with minimal exterior glow.
This is a manufactured battery, not a credit crystal, coin, potion or egg.
No numbers, lightning-bolt icon, exposed cables leaving the canvas or scenery.
One centered premium sci-fi world object, transparent alpha around it.
```

### T11 — `targets/amplify.png`

```text
Create amplify.png: one compact resonator module with three nested mechanical
fins opening around a bright violet-gold emitter. Build a flared, funnel-like
silhouette with a dense physical rear housing. Two very short local light arcs
suggest amplification, without full concentric HUD rings. Opaque titanium and
controlled energy. Distinct from a sensor dish, a gravity cage and a crystal.
No full-screen shockwave, musical speaker icon, plus sign or text.
One coherent centered device on genuine transparent RGBA.
```

### T12 — `targets/drone.png`

```text
Create drone.png: one unmanned support drone with a small armored central body,
two lateral service arms and two stubby lower stabilizers. A single teal optical
sensor and restrained cyan thruster ports provide life. No cockpit or pilot.
Three-quarter front view; a clear horizontal silhouette unlike player ships.
Use practical metal panels and a few large joints, not decorative insect legs.
No deployed beam, cargo scene, drone swarm, speech face, lettering or badge.
Single centered solid world object on true transparent alpha.
```

### T13 — `targets/lock-on.png`

```text
Create lock-on.png: one precision targeting sensor with a large ruby-red optical
lens, three short tracking vanes and an angular armored housing. The red lens
must be the focal point, supported by subtle cyan connectors. Compact narrow
forward-looking silhouette, more weapon-like than the broad scan array.
No baked crosshair, reticle, target circles, UI arrows, readable display or
projectile. Use physical optics and metal depth instead of a flat icon.
One isolated centered object, opaque body and genuine transparent background.
```

### T14 — `targets/gravity.png`

```text
Create gravity.png: one exotic-matter gravity device with a dense violet core
inside two offset heavy metallic stabilizer arcs. Keep the core visible rather
than pure featureless black. The broad cage is the main silhouette; a thin
blue-violet distortion fringe stays close to it. Distinct from black-hole:
this asset is a physical control device, not an accretion disk or singularity.
No galaxy, orbit map, stars, background distortion plate or text.
Centered solid machinery with limited translucent energy, true alpha.
```

### T15 — `targets/disrupt.png`

```text
Create disrupt.png: one electronic-warfare jammer, a dense angular dark module
with two uneven segmented antenna fins and interrupted magenta-cyan electrical
traces. Make the asymmetry intentional and mechanically credible. Restrained
tiny local arcs communicate interference; the body remains opaque and readable.
Do not draw a generic bomb, lightning icon, visible glitch rectangle, scanline
background, digital letters or static covering the canvas. One compact object,
centered, premium material definition and transparent alpha.
```

### T16 — `targets/scan.png`

```text
Create scan.png: one broad reconnaissance sensor array with a shallow dish,
three small optical lenses and a compact rear electronics block. Cool cyan
emitters around a silver-blue dish rim. Three-quarter view, dish turned slightly
toward the viewer, wide open sensing silhouette. Clearly broader and less
aggressive than the red-lens lock-on module. No crosshair, radar UI screen,
full-image scanning line, grid, compass or text. Single centered machine,
opaque structure, controlled highlights and real transparent alpha.
```

### T17 — `targets/fate-crystal.png`

```text
Create fate-crystal.png: one rare strategic prism suspended in a dark mechanical
containment cradle. Use an irregular three-spire violet crystal, a restrained
golden internal seam and three short opaque clamp arms. The cradle and unusual
silhouette distinguish it from ordinary currency crystals. Facets are crisp,
with depth and a small soft aura, not a washed-out white jewel. No coin, money
symbol, reward chest, crown, label or giant halo. One centered contained object
on genuine transparent alpha, readable at small game scale.
```

### T18 — `targets/black-hole.png`

```text
Create black-hole.png: one miniature contained singularity, a visibly opaque
near-black central disk, a thin asymmetric violet-gold accretion arc and three
small metallic containment anchors. Preserve the dark disk as object pixels;
only the outside background is transparent. The luminous arc separates the
core from dark gameplay backgrounds. No surrounding galaxy, stars, nebula,
rectangular lensing plate or astrophotography scene. Distinct from the cage-like
gravity device. One isolated compact effect-object, true-alpha PNG.
```

## 4. Nhóm V — 13 VFX key art + brief chuyển động

Ảnh nguồn: `Duel_PVP_Media_Source/vfx-keyart/<id>.png`, 1024×1024 RGBA. Tất cả **REUSE-FIRST**.

**Mỗi block ảnh tạo một thời điểm đẹp của hiệu ứng, không phải animation.** Chuyển brief motion tương ứng sang công cụ animation/compositing ở mục 5 khi cần thay bản WebP động. Không yêu cầu generator ảnh tạo 12 frame độc lập rồi coi là chuyển động nhất quán.

### V01 — `vfx-keyart/explosion-core.png`

```text
Create explosion-core.png: one compact free-space energy detonation at its
early peak. Small white-yellow ignition center, structured orange plasma petals
and a few short amber sparks. Asymmetric organic detail inside a roughly radial
silhouette; energy concentrated near the center. Light/emission layer ONLY.
No opaque dark smoke, debris rocks, shockwave ring, ground, ship, scenery or
square bloom. Fade edges smoothly into true alpha and preserve internal detail.
One centered effect, not a giant white orb; keep 12% clear margin all around.
```

Motion: one-shot; bùng nhanh rồi tắt, không phình đều như zoom ảnh. Theo mốc mục 5; plasma thay hình theo thời gian, không thêm smoke. Dùng screen. Đây là nổ gọn, không thay mọi hit thường bằng nổ lớn.

### V02 — `vfx-keyart/explosion-wide.png`

```text
Create explosion-wide.png: one major free-space plasma blast with a wider
multi-lobed orange-gold silhouette and a compact white-hot center. Several
unequal tongues of incandescent gas extend radially, leaving transparent gaps
between them. More force and breadth than explosion-core, but no screen-filling
white flash. Emission only: do not include black smoke, solid shrapnel, a ground
plane, ship, shockwave ring or background. Fine ember accents remain near the
blast. Centered isolated true-alpha effect with unclipped feathered edges.
```

Motion: one-shot; nở rộng hơn V01, giảm sáng rõ sau peak, các nhánh plasma tan lệch pha. Dùng screen; khói/mảnh vỡ lấy từ V07/V08/V10, không gộp vào ảnh này.

### V03 — `vfx-keyart/shockwave-ring.png`

```text
Create shockwave-ring.png: one circular energy shockwave viewed straight on,
with a thin broken filament rim in pale amber-white and very subtle orange
turbulence. The center is entirely transparent, not a black disk and not fog.
Keep the ring circular, centered and evenly inside the safe margin. The rim
has intricate local energy but is narrow enough not to hide word labels.
No explosion core, debris, smoke, planet, portal tunnel, UI reticle or scenery.
One isolated light ring on genuine alpha with no rectangular glow plate.
```

Motion: one-shot; bán kính tăng khoảng 12%→72% đường kính canvas, rim mỏng dần và tắt. Tâm luôn alpha 0. Không để tự loop thành nhịp nhấp nháy. Dùng screen.

### V04 — `vfx-keyart/fire-small.png`

```text
Create fire-small.png: one small localized hull-damage flame, bright amber near
its ignition point at canvas center with two short orange tongues curling upward.
Keep the body compact and asymmetrical; fine embers may hover nearby. This is
flame emission only, not a burning ship, engine exhaust, torch or smoke plume.
No dark soot painted around it. Flame tips and glow dissolve smoothly into
real transparency. Preserve ample margins even above the tallest tip.
One isolated centered damage-fire element with controlled exposure.
```

Motion: loop; flame nhỏ rung mềm, anchor cố định giữa canvas, không tự chạy lên trên cả ảnh. Không fade về 0 ở mỗi vòng. Dùng screen.

### V05 — `vfx-keyart/fire-medium.png`

```text
Create fire-medium.png: one medium hull-damage flame cluster anchored at the
center, with three irregular orange-gold tongues and a small yellow-white base.
Denser and broader than fire-small but still localized, with visible transparent
gaps between flame lobes. A few restrained embers, no thick cloud. No ship,
engine nozzle, solid burning material, dark smoke, ground or environment.
Soft luminous falloff into genuine alpha, no cropped tips or rectangular glow.
One coherent effect, not three separately presented icons.
```

Motion: loop; ba nhánh biến dạng không đồng pha, giữ cùng điểm bám và lượng sáng trung bình. Không biến thành explosion nhấp nháy. Dùng screen.

### V06 — `vfx-keyart/fire-critical.png`

```text
Create fire-critical.png: one intense but localized critical hull-fire cluster.
Use a tightly contained white-gold base and several ragged orange-red tongues,
with sparse tiny ember fragments. Communicate unstable danger through organic
shape, not huge brightness or a full-screen fire wall. This is only the light
layer; no opaque smoke, destroyed ship, debris cloud, blast ring or scenery.
Anchor at the center, tips mostly upward, every glow edge inside clear margins.
One true-alpha VFX element with readable flame structure.
```

Motion: loop; có đợt phụt ngắn nhưng không white flash toàn màn, không thay đổi kích thước đột ngột ở seam. Dùng screen.

### V07 — `vfx-keyart/smoke-dark.png`

```text
Create smoke-dark.png: one localized plume of cool charcoal-gray smoke for a
damaged spacecraft. Volumetric soft curls, dense but not completely opaque near
the central source, lighter and more transparent toward the upper outer wisps.
Small cool highlights define volume without making smoke emissive. Keep all
wisps isolated on genuine transparent alpha. Dark smoke itself must remain
visible object data, not be keyed away. No fire, sparks, metal debris, spacecraft,
background fog rectangle, ground or environment. One compact centered plume.
```

Motion: loop; cuộn khói liên tục bốc từ điểm bám giữa, tản rồi mất ở mép trước khi chạm biên. Dùng **source-over**, không screen; không alpha-key màu đen.

### V08 — `vfx-keyart/smoke-hot.png`

```text
Create smoke-hot.png: one warm dense smoke plume with copper-brown inner curls
and muted ember illumination near the center. Outer wisps become neutral gray
and fade smoothly into genuine transparent alpha. The smoke volume stays
semitransparent and occluding, not glowing plasma. No separate flame tongues,
white explosion core, shockwave, sparks, solid debris, ship or background.
Preserve detail in dark smoke without baking a black plate behind it.
One isolated compact VFX plume, safely contained in the canvas.
```

Motion: loop; chuyển động như V07, màu ấm ổn định quanh gốc, không pulse toàn ảnh. Dùng source-over. Ánh lửa mạnh được ghép từ V04–V06, không bake vào smoke.

### V09 — `vfx-keyart/spark-burst.png`

```text
Create spark-burst.png: one tight radial cluster of 10–16 hot metallic sparks
from a single central impact. Mix short amber streaks with a few small white-gold
heads; vary direction and length, avoid a perfect star icon. Most of the canvas
remains transparent. No solid metal fragments, smoke, explosion cloud, target,
weapon or background. Each streak tapers and fades naturally; no hard rectangular
streak boundaries. One coherent isolated light effect, centered on real alpha,
readable at small size without overexposure.
```

Motion: one-shot; phát một lần từ tâm, bay ra giảm sáng, không sinh liên tục như pháo hoa. Dùng screen. Không cần hình spark riêng lẻ thành nhiều file.

### V10 — `vfx-keyart/debris-burst.png`

```text
Create debris-burst.png: one burst of 6–10 small irregular spacecraft armor
fragments scattered outward from an empty central origin. Opaque dark titanium
and silver chipped edges, a few tiny dull orange heated spots. Fragment sizes
vary; the negative space between pieces remains genuinely transparent. This
is the solid debris layer, not luminous sparks or an explosion. No smoke, flame,
large asteroid, intact ship, floor or backdrop. Keep every piece within safe
margins. One cohesive radial event, not a grid of individual objects.
```

Motion: one-shot; mảnh bay ra, xoay nhẹ, alpha giảm cuối vòng. Dùng source-over để kim loại vẫn đặc. Không biến debris thành đạn gameplay có collision mới.

### V11 — `vfx-keyart/missile-salvo.png`

```text
Create missile-salvo.png: one compact decorative salvo of three small physical
missiles in a close staggered formation, noses upward. Each has a solid metallic
body and short fins, with only a tiny attached warm engine light. No long smoke
trail, huge flame, explosion or enclosing scene. This is one integrated VFX
cluster, not three design alternatives or a contact sheet. The lead missile
is slightly ahead; leave large transparent gaps around the formation.
No player ship, target word or UI. Real transparent alpha, opaque missile bodies.
```

Motion: one-shot; ba missile xuất hiện lệch nhẹ 1 frame, chuyển động ngắn cùng hướng, không vẽ toàn quãng đường tàu–tàu vào asset. Dùng source-over. **Không thay projectile Campaign bằng sprite này**; thời điểm/vị trí gọi VFX phải được kiểm tra ở code khi tích hợp.

### V12 — `vfx-keyart/bomb-impact.png`

```text
Create bomb-impact.png: one powerful bomb detonation light layer for a spacecraft
duel. A compact brilliant white-gold ignition knot surrounded by thick irregular
orange plasma lobes and a few short radial incandescent jets. Strong punch,
clear layered structure, controlled exposure. The event is centered, floating
in empty space with true alpha. EXCLUDE opaque dark smoke, black interior plate,
debris, shockwave ring, mushroom-cloud stem, ground, ship and scenery.
Transparent gaps and soft fading glow must remove every rectangular image edge.
```

Motion: one-shot; onset rất nhanh, plasma phình rồi tan, phối V03 + V07/V08 + V10 ở runtime nếu cần. **Không gộp light + smoke vào một ảnh để né compositing.** Dùng screen.

### V13 — `vfx-keyart/precision-burst.png`

```text
Create precision-burst.png: one crisp precision-hit energy flash, a tiny cyan-white
center with four unequal tapered rays and a sparse halo of small blue particles.
Sharper and cleaner than an orange explosion, with a restrained gold glint only
at the core. Most of the canvas remains transparent. Not a star badge, sparkle
emoji, reward icon, UI crosshair or text. No smoke, ship or scenery. Keep the
longest ray inside the safe margin and eliminate any square bloom boundary.
One isolated premium light effect on genuine transparent alpha.
```

Motion: one-shot; flash nhanh, ray rút/tắt, hạt tan. Dùng screen. Không chiếm diện tích nổ bom hoặc làm người chơi tưởng mất máu lớn.

## 5. Hợp đồng animation VFX — không được nhầm với PNG

### 5.1 Cách sản xuất

1. Duyệt key art của từng V trước: silhouette, chất liệu, alpha.
2. Dùng **cùng key art** làm reference cho một animation thống nhất. Cấm tạo 12 ảnh độc lập không liên quan rồi ghép thành “animation”. Không chỉ duplicate một ảnh 12 lần hoặc zoom/fade ảnh tĩnh và gọi là chuyển động plasma thật.
3. Nếu có công cụ xuất RGBA frame sequence, xuất frame riêng cùng canvas/pivot. Nếu công cụ chỉ xuất video opaque, đánh dấu `ALPHA_POSTPROCESS_REQUIRED`; cần compositor xử lý matte, không đưa thẳng MP4 vào game.
4. Một key art cần **một task animation riêng**. Quy tắc ONE PNG FILE = ONE IMAGE TASK vẫn áp dụng với ảnh; animation task được phép có 12 frame vì đó là các thời điểm của cùng hiệu ứng, không phải collage.
5. Encode dẫn xuất runtime thành **animated WebP**, không atlas 4×3/strip, không GIF, không ảnh PNG bị đổi đuôi.

### 5.2 Thông số runtime để khớp gói hiện tại

| Thuộc tính | Yêu cầu |
| --- | --- |
| Canvas mỗi frame | 256×256 RGBA; không tự nâng lên 1024 runtime |
| Frame count | 12 frame thực sự khác nhau, cùng canvas |
| Timing | 16 fps danh nghĩa; xen kẽ 62/63 ms, tổng 750 ms/12 frame |
| Pivot | Chính giữa, (0.5, 0.5); không auto-crop riêng từng frame |
| One-shot | V01/V02/V03/V09/V10/V11/V12/V13; encode phát một lần, frame cuối alpha 0 |
| Loop | V04/V05/V06/V07/V08; encode loop vô hạn, seam liền mạch |
| Background | Alpha thật mọi frame; không matte đen/trắng, không checkerboard |
| Frame intermediate | `vfx-frames/<id>/frame-000.png` … `frame-011.png` nếu cung cấp |
| Animation output | `vfx-animated/<id>.webp` |

Lưu ý: WebP lưu delay theo mili giây, nên không ghi 62,5 ms như thể một số nguyên. Loop count phải được xác minh bằng decoder; đừng chỉ nhìn tên `loop` trong manifest. Metadata `fps: 16` do script ghi **không tự resample animation**.

Mốc one-shot gợi ý (định hướng motion, không luật damage): frame 000 bắt đầu rất nhỏ; 001–003 đạt peak; 004–007 mở rộng/tan; 008–010 fade; 011 alpha 0. V09 spark và V10 debris di chuyển có quán tính thay vì phình như quả bóng. Loop giữ năng lượng ổn định, chuyển từ 011 về 000 không jump; không bắt buộc duplicate hai frame này.

### 5.3 Wrapper animation

```text
Animate only the supplied approved VFX reference for the named asset.
Preserve its palette, central anchor, silhouette family and transparent background.
Create coherent evolving motion, not twelve unrelated image generations.
No camera move, camera zoom, scene, ship, text, background plate or new subject.
Separate luminous energy from opaque smoke/debris as required by this VFX ID.
Use the per-asset motion brief and the one-shot/loop classification in this pack.
Delivery target: 12 fixed-canvas RGBA frames and one correctly encoded animated
WebP, 256x256 runtime, nominal 16 fps, 750 ms per sequence.
If exact timing/alpha/encoding is unsupported, deliver your actual source format
and clearly mark the required postproduction. Do not fake metadata or success.
```

### 5.4 Giới hạn thực tế của code hiện tại

- `prepare-duel-vfx-sequences.mjs` đọc **WebP đã động**, không biến PNG thành animation.
- Script yêu cầu đủ 13 tên sequence khi chạy; thay vài file thì giữ đủ những file còn lại của bộ hiện có.
- Script copy animation và ghi `fps:16`, `loop`, `lifetimeMs`; không tự sửa alpha, cadence, loop flag trong bitstream hoặc đọc đầy đủ mọi lỗi visual.
- One-shot manifest hiện có lifetime 880 ms, trong khi 12 frame/16 fps dài 750 ms. Không kéo dài animation thành 880 ms bằng đổi fps nhưng vẫn ghi 16; để frame cuối trong suốt, nghiệm thu timing thực tế sau tích hợp.
- Runtime dùng URL ảnh ở CSS; timeline của animated image do trình duyệt quản lý. Không hứa mỗi lần gắn URL đều restart chính xác frame 0. Nếu cần event-locked animation, phải nâng renderer sang điều khiển frame/clock riêng; **media pack không tự cung cấp phần code này**.
- 13 sequence × 12 × 256×256×4 tương đương khoảng **39 MiB dữ liệu RGBA frame danh nghĩa**, chưa tính cache/GPU/decoder. Đây là ước tính, không phải số RAM đã đo. Không xuất 1024×1024×12 runtime: chỉ một sequence đã khoảng 48 MiB RGBA.

## 6. Nhóm S — 22 SFX

Thư mục nguồn: `Duel_PVP_Media_Source/audio/sfx/`. Tất cả **REUSE-FIRST**; chưa nghe đánh giá từng file hiện tại trong lần soạn prompt này. Không yêu cầu tạo lại chỉ vì đã có prompt.

### 6.1 AUDIO wrapper

```text
Create exactly ONE original isolated sci-fi game sound effect for the requested
WAV filename. No music bed, speech, count-in, narration, ambience recording,
multiple alternate takes in one file, or unrelated sounds before/after it.
Requested source: PCM WAV, 48 kHz, 24-bit, mono. If unsupported, disclose actual
format; do not merely rename a compressed file to .wav.
Onset within 10 ms, no excessive leading silence. Clean short fade to digital
silence after the natural tail, no truncated transient or audible end click.
Dry or very short designed space; no giant cathedral reverb.
Designed for repeated overlapping playback in a typing-combat game.
Use punch, transient definition and controlled mid-bass, not clipping or a
constant harsh high-frequency hiss. Must remain intelligible on laptop speakers.
No infrasonic rumble as the only source of weight; no aggressive loudness squash.
Aim for source sample peak at or below -6 dBFS to leave mixing headroom.
Keep perceptual hierarchy: routine fire < heavy attacks < major destruction.
No copied franchise sounds or named-artist imitation. Original sound design only.
Do not claim sample rate, peak or duration verified unless measured.
```

Các mức âm là **mục tiêu sản xuất**, không chứng nhận mix cuối. Không normalize mọi file thành cùng độ to. Source mono để game có thể đặt vị trí; không bake pan trái/phải vì người chơi có thể đổi phe.

### S01 — `audio/sfx/typing-miss.wav` — 0,08–0,15 s

```text
A short soft digital misfire tick: a muted tactile click plus a tiny descending
electronic tone. Clearly indicates one wrong typed character without sounding
like taking damage. Quiet, dry and non-punishing when repeated. No buzzer,
alarm, voice, explosion, piercing beep, bass boom or long echo. One isolated cue.
```

### S02 — `audio/sfx/laser-launch.wav` — 0,12–0,22 s

```text
A tight futuristic ship cannon launch: immediate crisp electric snap, compact
pitched energy body and very short upward flick. Controlled upper mids, a small
low-mid punch, no abrasive laser whistle. It must feel satisfying at several
shots per second without becoming a continuous wall of hiss. One launch only;
no impact, reload, pre-charge delay, music or reverb wash.
```

### S03 — `audio/sfx/missile-launch.wav` — 0,25–0,45 s

```text
One missile ignition and launch: short mechanical latch clack immediately into
a tight rocket whoosh, a rounded low-mid ignition punch and rapidly fading
exhaust texture. Forward momentum without stereo panning baked in. Not a jet
flying past the microphone. No explosion or target impact, no long charge-up,
no engine ambience continuing beyond the short cue.
```

### S04 — `audio/sfx/heavy-launch.wav` — 0,25–0,50 s

```text
One heavy electromagnetic cannon discharge: a hard precision crack layered
with a dense metallic low-mid thump and a very short electrical capacitor tail.
Heavier than a laser shot, cleaner and less fiery than a bomb. Attack begins
immediately with no dramatic pre-roll. No impact, ricochet, reload cycle,
long bass sustain, clipping or cinematic multi-second riser.
```

### S05 — `audio/sfx/bomb-launch.wav` — 0,25–0,50 s

```text
One heavy bomb deployment: a solid mechanical release, short compressed gas
ejection and a subtle descending energy thunk. Weighty and unmistakably launch,
not detonation. Short contained low-mid body, clean transient, minimal tail.
No ticking countdown, siren, explosion, long engine trail or background music.
Leave the larger sonic payoff for the separate bomb-impact cue.
```

### S06 — `audio/sfx/energy-impact.wav` — 0,12–0,25 s

```text
One small energy bolt impact: immediate bright electric crackle with a compact
rounded contact punch and quickly dissolving plasma fizz. Shorter and slightly
darker than the launch so alternating shots and hits remain distinguishable.
Designed for frequent overlap without harsh treble buildup. No huge explosion,
shield-break glass shower, deep cinematic boom or long reverb.
```

### S07 — `audio/sfx/kinetic-impact.wav` — 0,15–0,30 s

```text
One kinetic hit on spacecraft armor: sharp close metal contact, dense brief
body resonance and a tiny irregular fragment rattle. Solid but not ear-piercing.
Differentiate from electric energy-impact through physical material, not a
louder master level. No cartoony clang, long ringing bell, bullet ricochet
whistle, explosion sequence or multiple separate hits.
```

### S08 — `audio/sfx/missile-impact.wav` — 0,45–0,75 s

```text
One medium missile detonation: sharp contact crack, expanding compact blast
body and a brief gritty fragmentation tail. Audible punch in low mids on laptop
speakers, with controlled bass and a fast-decaying high end. Bigger than cannon
hits, smaller than bomb-impact. No launch whoosh, multiple sequential explosions,
long distant battlefield ambience, clipping or voice.
```

### S09 — `audio/sfx/bomb-impact.wav` — 0,65–1,00 s

```text
One powerful contained sci-fi bomb detonation: immediate hard transient,
weighty layered blast body, brief turbulent plasma roar and sparse short debris
ticks. Make it feel forceful through dynamics and spectral contrast, not a
flat clipped roar. Main energy decays quickly enough for typing cues to return.
No pre-charge, multiple blasts, long sub-only rumble, giant reverb or music.
```

### S10 — `audio/sfx/shield-hit.wav` — 0,15–0,28 s

```text
One intact energy shield absorbing a hit: short rounded crystalline-electric
ping with a soft elastic membrane thump and a rapidly fading shimmer. Defensive
contact, not breaking glass. A clean recognizable pitch family, comfortable
under repeated hits. No destruction, alarm, sci-fi door sound, long ringing
tone or bright sustained treble cloud.
```

### S11 — `audio/sfx/shield-break.wav` — 0,40–0,70 s

```text
One energy shield collapse: decisive brittle electric crack followed by a
short downward pitch fall and scattering crystalline fragments. Clearly more
important than shield-hit, but not the same sound as hull explosion. Let the
core pulse be strong without painful glass hiss. No ongoing alarm, launch,
voice, orchestral hit, long reverb or multiple collapses.
```

### S12 — `audio/sfx/repair-energy.wav` — 0,25–0,45 s

```text
One compact repair/resource restoration cue: warm soft electronic activation,
two tightly connected ascending harmonic tones and a subtle nanite shimmer.
Reassuring and mechanical, not a magical treasure fanfare. Keep it below attack
sounds in perceptual force. No speech, coins, health-monitor beeps, long melody,
looping motor, excessive sparkle or explosion.
```

### S13 — `audio/sfx/lock-acquire.wav` — 0,15–0,28 s

```text
One target-lock confirmation: a very short two-part sensor chirp, rising then
settling decisively, with a restrained mechanical click underneath. Precise and
urgent but not an alarm. One coherent cue rather than repeated beeps. Clear on
small speakers without high-pitched pain. No radar ambience, voice announcing
lock, missile launch, ticking countdown or musical phrase.
```

### S14 — `audio/sfx/scan-pulse.wav` — 0,25–0,45 s

```text
One short scanning pulse: a soft outward electronic sweep, a clear muted sensor
ping and a quick airy decay. Broader and gentler than lock-acquire, no threatening
alarm quality. Controlled bandwidth, dry foreground detail and minimal bass.
No submarine sonar ambience, long delay repeats, full sci-fi interface sequence,
speech or background hum. One isolated scan activation.
```

### S15 — `audio/sfx/disrupt-emp.wav` — 0,30–0,55 s

```text
One electronic disruption burst: a compact electrical thump with a short
granular digital crackle and falling power-down texture. Communicate temporary
interference, not hardware destruction. Avoid a full-band harsh static wall;
preserve a clear transient and controlled midrange body. No long glitch loop,
speech fragments, alarm, exploding metal or music.
```

### S16 — `audio/sfx/intercept.wav` — 0,15–0,30 s

```text
One successful projectile interception: crisp crossing-energy snap with a
small metallic tick and a brief clean bright tail. It should sound quick,
skillful and defensive, not like a large damage explosion. Short enough not to
mask the next typed word. No two separate hits, applause, ricochet whistle,
shield-collapse rumble or celebratory melody.
```

### S17 — `audio/sfx/precision.wav` — 0,18–0,35 s

```text
One precision-success combat accent: tight tactile click, clean luminous
harmonic ping and a tiny satisfying energy bloom. Premium, focused and concise.
More refined than a normal hit, not substantially louder. No coin pickup,
slot machine, reward fanfare, voice, bell melody or long sparkly reverb.
One short isolated cue suitable for occasional accurate-play rewards.
```

### S18 — `audio/sfx/ship-destruction.wav` — 0,90–1,40 s

```text
One spacecraft destruction event: immediate structural crack, a powerful
compact reactor blast and a descending tail of tearing metal and fading debris.
This is the highest-weight regular combat payoff, with a clear beginning and
finite end. Keep midrange detail and bass controlled; no clipping, endless
rumble, distant battlefield, multiple unrelated explosions, voices or music.
The tail must not obscure the following round-result cue.
```

### S19 — `audio/sfx/cataclysm.wav` — 0,60–1,00 s

```text
One phase-escalation warning impact: a dark synthetic pulse with a short tense
descending tonal gesture and controlled electrical texture. Clearly signals a
dangerous new phase without sounding like the player's ship has exploded.
No continuous siren, repeated warning beeps, spoken announcement, multi-second
trailer riser, music bed or sustained sub-bass. One decisive transition cue.
```

### S20 — `audio/sfx/round-win.wav` — 0,70–1,10 s

```text
One concise original sci-fi victory stinger: a firm soft impact followed by a
brief ascending consonant three-note synth gesture and a clean short release.
Earned and confident, not a casino jackpot or orchestral fanfare. Fits above a
quiet background music tail without overwhelming it. No voice, cheering,
applause, full song, long reverb or recognizable existing game melody.
```

### S21 — `audio/sfx/round-loss.wav` — 0,70–1,10 s

```text
One concise sci-fi defeat stinger: a restrained low electronic impact and a
short descending unresolved harmonic gesture, dignified rather than mocking.
Same timbral family as round-win, with less brightness. No sad-trombone joke,
punitive buzzer, voice, crying, orchestral passage, long bass wash or full song.
Original short cue ending cleanly.
```

### S22 — `audio/sfx/round-draw.wav` — 0,60–1,00 s

```text
One neutral sci-fi draw-result stinger: a balanced two-part electronic pulse
and a suspended unresolved harmonic tone, neither triumphant nor defeated.
Same restrained synth palette as win/loss, compact and readable. No alarm,
error buzzer, voice, applause, major explosion or long melody. One isolated
result cue with a clean dry ending.
```

## 7. Nhóm M — 3 music loop

Nguồn: `Duel_PVP_Media_Source/audio/music/`. **REUSE-FIRST**. Không gộp ba track thành một WAV. Đây là ba trạng thái thay thế/crossfade, không phải ba stem được cộng đồng thời mặc định.

### 7.1 MUSIC wrapper

```text
Compose exactly ONE original instrumental sci-fi combat game loop for the
requested filename. No vocals, speech, copyrighted melody, named-artist imitation,
baked combat SFX, gunshots, explosions or notification sounds.
Deliver stereo PCM WAV source, 48 kHz, 24-bit if supported; disclose actual format.
Common musical contract for the three tracks: D minor, 120 BPM, 4/4, 32 bars,
64.000 seconds, seamless cyclic structure. These are alternate intensity states,
not additive stems. No intro/outro, fade-in/out, empty leading/trailing padding.
Arrange space for rapid typing sounds and weapon transients. Avoid constant
harsh high mids and excessive sub-bass. Keep stereo coherent in mono.
Suggested delivered mix target: around -18 LUFS integrated and true peak no
higher than -2 dBTP; verify in audio postproduction, do not claim guessed values.
Reverb/delay tails must wrap musically across the loop seam without a click.
If exact bar count, duration or seamless export is unsupported, return the
actual source and mark LOOP_EDIT_REQUIRED. Never claim an untested seamless loop.
```

64 giây = 32 bars × 4 beat × 0,5 giây ở 120 BPM. Đây là **hợp đồng sáng tác mới**, không khẳng định track hiện tại có tempo/key này hoặc runtime đã có beat-synced transition.

### M01 — `audio/music/duel-nebula-calm.wav`

```text
Compose a restrained but purposeful space-duel engagement loop. Deep soft
pulsing synth bass, sparse clockwork percussion, a thin celestial arpeggio and
wide quiet dark pads. Forward motion from the opening beat, no long ambient
intro. Leave generous rhythmic and spectral gaps for typing and laser fire.
D minor, 120 BPM, 32 bars. Intensity about 3/10, tension without boredom.
No soaring lead melody, loud snare wall, cinematic boom or baked weapons.
```

### M02 — `audio/music/duel-combat-intense.wav`

```text
Compose the active combat counterpart to the calm loop in the same original
musical family. D minor, 120 BPM, 32 bars. Tighter syncopated bass, focused
electronic drums, restrained metallic percussion and a more urgent arpeggio.
Intensity about 7/10 through rhythm and arrangement, not a louder crushed mix.
Keep the main melody sparse and leave room for weapon transients. Energetic
space dogfight, no vocals, trailer riser, huge orchestral climax or baked SFX.
```

### M03 — `audio/music/duel-cataclysm.wav`

```text
Compose the highest-tension overtime loop in the same D-minor, 120-BPM,
32-bar musical family. Urgent interlocking electronic rhythms, a darker pulsing
bass and restrained dissonant textures that resolve back into the loop start.
Intensity about 9/10 while preserving dynamic headroom and readable combat
sounds. No constant alarm, white-noise wall, endless riser or full-band distortion.
Maintain rhythmic momentum all the way through a seamless loop; no ending hit.
```

## 8. Folder, mapping và tích hợp — KHÔNG copy mù vào public

### 8.1 Folder giao nguồn, nằm ngoài pipeline tự prepare

```text
Duel_PVP_Media_Source/
  targets/           # T01–T18, 18 PNG
  vfx-keyart/        # V01–V13, 13 PNG, KHÔNG animation
  vfx-animated/     # 13 WebP động khi đã hậu kỳ, có thể chưa có
  vfx-frames/       # optional dẫn xuất frame, không bắt buộc gửi khi chỉ tạo ảnh
  audio/
    sfx/            # S01–S22, 22 WAV
    music/          # M01–M03, 3 WAV
  delivery-manifest.json
  README.txt
```

Nhận gói vào Downloads hoặc thư mục staging riêng trước. **Không đặt ảnh chưa duyệt vào `art-src` rồi chạy dev/play**, vì pipeline có thể tự prepare và ghi đè runtime.

### 8.2 Mapping canonical sau khi được duyệt

Các đường dẫn repo tính từ `games/space-typing/`:

| Nguồn đã duyệt | Nơi chuẩn bị trong repo | Đầu ra game đọc |
| --- | --- | --- |
| `targets/<id>.png` | `art-src/duel-targets/<id>.png` | `public/assets/space-typing/duel-targets/<id>.webp` + `targets.json` |
| `vfx-keyart/<id>.png` | Giữ staging; nguồn cho animator | Không tự thay animation hiện tại |
| `vfx-animated/<id>.webp` | `art-src/combat-vfx-sequences/animated_webp/<id>.webp` | `public/assets/space-typing/combat-vfx/<id>.webp` + `vfx.json` |
| `audio/sfx/<id>.wav` | Giữ WAV master ở staging/nguồn âm thanh | Encode thật thành `public/assets/audio/duel/sfx/<id>.ogg` |
| `audio/music/<id>.wav` | Giữ WAV master ở staging/nguồn âm thanh | Encode thật thành `public/assets/audio/duel/music/<id>.ogg` |

`art-src/combat-vfx/<id>.png` là đường nguồn **VFX tĩnh legacy**. Pipeline `prepare-local-art.mjs` ưu tiên thư mục animated khi có nguồn động. Vì vậy bỏ PNG mới vào legacy folder **không có nghĩa animation đã được thay**. Không xóa bộ động để ép ảnh tĩnh được dùng chỉ vì ảnh mới đẹp hơn.

### 8.3 Các bước người tích hợp phải làm

1. Kiểm tra Git status, sao lưu/copy bộ nguồn và runtime đang dùng sang nơi riêng; không reset/checkout/delete thay đổi của chủ dự án.
2. Duyệt file mới ở staging. Xác minh MIME/decode thật, tên canonical, alpha, frame/loop và audio. Không chỉ nhìn extension/thumbnail.
3. Thay có chọn lọc vào **bộ nguồn đầy đủ đã giữ lại**. `prepare-duel-targets.mjs` và static VFX pipeline có bước xóa output không nằm trong bộ source hiện tại; không chạy trên bộ source thiếu rồi làm mất các runtime tốt khác. Animated prepare yêu cầu đủ 13 file.
4. Chạy riêng pipeline phù hợp sau khi duyệt: `pnpm duel-targets:prepare` hoặc `pnpm combat-vfx-sequences:prepare`. Đây là lệnh **có ghi file**, không phải kiểm tra read-only. Không yêu cầu Gemini tự chạy chúng trên repo.
5. Giữ tên stem audio đúng 22 SFX/3 music của tài liệu; WAV phải encode thành Ogg Vorbis thực sự. Pipeline art không tự encode WAV. Thay đổi sample gain, cache version hoặc đường dẫn nếu cần là việc tích hợp riêng, không hứa auto nhận theo filename mọi trường hợp.
6. Manifest/hash/kích thước phải sinh từ output thực; không để Gemini bịa SHA256 hoặc sửa tay số liệu theo mong muốn. Animated script có thể cần bổ sung validation/timing handling nếu nguồn mới không đúng hợp đồng.
7. Chạy TypeScript/tests/build và asset gates phù hợp, chú ý lifecycle build có thể prepare các art khác đang dirty. Kiểm tra diff trước/sau.
8. Đọc `docs/VISUAL_TESTING.md`: chụp bản Play thật ở 1642×799 DPR 2, xem ảnh tổng thể + crop viền/đạn/nổ; kiểm tra console. Kiểm tra tốc độ thật, không lấy ảnh freeze làm bằng chứng FPS.
9. Nghe SFX đơn lẻ và khi nhiều cue chồng lên nhau, nghe cả laptop/tai nghe, kiểm tra mute/volume. Music phải lặp qua seam; bật/tắt/đổi phase không click. Không tự tăng âm lượng hệ thống để “nghe bùng nổ”.
10. Đo trước–sau với cùng điều kiện, không chạy test/build cùng lúc đo FPS. Nếu regression hoặc alpha lỗi, khôi phục đúng asset vừa thay từ bản sao; không bỏ hết texture về Low để che vấn đề.

Không thay ship atlas, không ghi `fx/<ship>/bolt.webp`, không đổi balance/HP/input gameplay trong công việc media này. VFX hình ảnh không được là nguồn quyết định sát thương.

## 9. Packaging macOS — áp dụng protocol của chủ dự án đúng phạm vi

Đã đối chiếu `IMAGE_TASK_MACOS_PACKAGING_PROTOCOL.md`. Giữ quy tắc một ảnh/một task, tên canonical, task tracking, batch tối đa gợi ý 10 và phân biệt ZIP ảnh thật với ZIP downloader. Đây là hướng dẫn cho lượt **sinh media sau này**, không yêu cầu tạo ZIP giả khi chỉ đang soạn prompt.

### 9.1 Chia batch ảnh, tránh sai số thứ tự

- Image batch 01–10: T01–T10.
- Image batch 11–20: T11–T18 + V01–V02.
- Image batch 21–30: V03–V12.
- Image batch 31–31: V13.
- Audio quản lý riêng: S01–S10, S11–S20, S21–S22 + M01–M03. Không áp checklist ảnh 1024×1024 cho WAV.
- Animation quản lý riêng theo V01–V13; file runtime 256×256 là dẫn xuất, không vi phạm hợp đồng PNG nguồn 1024×1024.

Một task đang running không tạo task trùng chỉ vì chậm. Nếu công cụ không trả task ID, ghi trường đó null và trạng thái quan sát thực tế; không bịa ID. Khi có retry, chọn đúng một output chính thức sau khi kiểm tra, không đóng gói cả hai.

### 9.2 Manifest giao hàng

Ví dụ **schema minh họa**, không phải kết quả đã tạo:

```json
{
  "assetId": "V12",
  "canonicalPath": "vfx-keyart/bomb-impact.png",
  "status": "NOT_GENERATED",
  "taskId": null,
  "downloadUrl": null,
  "actualMime": null,
  "width": null,
  "height": null,
  "alphaVerified": false,
  "visuallyInspected": false,
  "durationMs": null,
  "frameCount": null,
  "audioSampleRate": null,
  "sha256": null,
  "officialOrRetry": "unselected",
  "notes": "Fill only with measured or observed values."
}
```

Trạng thái quy trình: `NOT_GENERATED`, `RUNNING`, `FAILED`, `GENERATED_UNVERIFIED`, `ALPHA_POSTPROCESS_REQUIRED`, `ANIMATION_POSTPROCESS_REQUIRED`, `LOOP_EDIT_REQUIRED`, `APPROVED_SOURCE`, `APPROVED_RUNTIME`. Metadata success của generator **không đồng nghĩa APPROVED_RUNTIME**.

### 9.3 Gói tải

- Ưu tiên ZIP chứa byte media thật, giữ category folders.
- Nếu chỉ có link: ZIP gồm `.command` + manifest links + README, ghi rõ **“gói script tải, không chứa ảnh/âm thanh”**.
- Không tạo link giả, không dùng placeholder URL trong script được quảng cáo chạy được. Báo link hết hạn hoặc chưa có output.
- `.command`: dùng thư mục tương đối cạnh script, biến riêng như `DUEL_MEDIA_DIR`; không dùng/ghi đè `HOME`, `CODEX_HOME`; không `sudo`, không lệnh xóa, không cài package, không ghi vào repo.
- Mỗi download dùng URL thật được quote, `curl -L --fail --retry 3`; giữ tên canonical/category, kiểm tra exit status. Dùng thư mục đích mới, không ghi đè file người dùng đang có. Chỉ mở Finder khi các download hoàn tất.
- Đọc script trước khi chạy; nếu macOS chặn, kiểm tra nguồn và quyền thực thi, không vô hiệu hóa bảo vệ hệ thống hàng loạt.
- Ví dụ tên gói: `Duel_PVP_Images_01_10.zip`, `Duel_PVP_31_Source_PNG_Master.zip`, `Duel_PVP_25_Source_WAV_Master.zip`. Chỉ dùng “PNG/WAV” trong tên nếu chứa file thật; downloader thêm hậu tố `_Download_Package`.
- Master chỉ chứa các file đã yêu cầu và đã thành công. Nếu 30/31 ảnh xong, ghi **30/31**, không đặt tên Completed_31 hoặc đợi vô hạn không báo file thiếu.

## 10. Checklist nghiệm thu — không có prompt nào bảo đảm không sai tuyệt đối

### 10.1 Ảnh target

- [ ] Một subject, tên/category đúng, 1024×1024 nguồn; không chữ/UI/grid.
- [ ] Có alpha thật; ngoài silhouette không còn nền đen/trắng/caro.
- [ ] Body đặc, không bị thủng vì key màu; `black-hole` giữ lõi tối đặc.
- [ ] Viền/glow không bị crop; không viền matte trên nền xám/sáng/tối.
- [ ] Phân biệt rõ laser/railgun/lance, shield/reflect/barrier, scan/lock-on, gravity/black-hole.
- [ ] Đọc được ở 48–72 CSS px; không dùng target làm projectile hoặc ngược lại.

### 10.2 VFX

- [ ] Key art chỉ là PNG reference, không quảng cáo là sequence.
- [ ] Sequence thật, 12 frame, 256×256/frame, tổng delay 750 ms; cùng pivot.
- [ ] One-shot và loop được encode đúng; frame cuối one-shot alpha 0.
- [ ] Kiểm tra alpha **mọi frame**, không chỉ frame đầu hoặc manifest.
- [ ] Light không bake smoke; smoke/debris không bị screen làm biến mất.
- [ ] Không loop flash bom liên tục; không jump ở seam fire/smoke.
- [ ] Nhìn trong game đúng kích thước, không chỉ xem đẹp khi phóng 1024 px.
- [ ] Kiểm tra khi kích cùng effect liên tiếp — browser animation restart không được giả định.

### 10.3 Audio/music

- [ ] File phát được, đúng codec thật; source và runtime phân biệt rõ.
- [ ] Không intro silence/ending click, không voice hoặc âm thanh lạc chủ đề.
- [ ] Launch không chứa impact trễ; tránh double explosion khi game phát cue hit riêng.
- [ ] Routine fire/hit nghe lâu không chói; bom/destruction có lực nhưng không clip mix.
- [ ] Music không chứa súng/nổ/typing; loop qua seam 3 lần, không click/hụt nhịp.
- [ ] Đo peak/loudness/format thật; không coi con số trong prompt là kết quả đã đạt.

### 10.4 Kết luận bàn giao

Chỉ nói **đã tạo nguồn** khi có file nguồn; chỉ nói **đã tích hợp** khi runtime/manifest đã cập nhật và game được kiểm tra; chỉ nói **đã nghiệm thu hình/âm thanh** khi thực sự xem/nghe. Prompt pack này chưa tạo media, chưa sửa runtime và không chứng nhận FPS.

## 11. Căn cứ đối chiếu trong repository

- `public/assets/space-typing/duel-targets/targets.json`: 18 ID target và output hiện có.
- `public/assets/space-typing/combat-vfx/vfx.json`: 13 ID, blend/loop/frame metadata hiện có.
- `scripts/bg-art/prepare-duel-targets.mjs`: source PNG, alpha validation, trim, max output 512.
- `scripts/bg-art/prepare-duel-vfx-sequences.mjs`: nguồn animated WebP, yêu cầu đủ 13, copy và ghi manifest.
- `scripts/bg-art/prepare-combat-vfx.mjs`: legacy VFX tĩnh; có fallback key nền đen nhưng không coi là chuẩn art cuối.
- `scripts/bg-art/prepare-local-art.mjs`: nguồn animated ưu tiên hơn static; auto-prepare có ghi output.
- `src/vfx/combat-vfx-sprites.ts`, `src/duel/battle-ui.ts`: manifest/URL và cách dùng VFX ở UI.
- `src/audio/sample-bank.ts`: 22 tên/path SFX Duel; `src/duel/audio.ts`: 3 tên/path music.
- `src/duel/combat-visuals.ts`: tái sử dụng tàu/đạn Campaign, không yêu cầu bộ projectile mới.
- `docs/VISUAL_TESTING.md`: quy trình visual QA; `docs/DUEL_COMBAT_V5_IMPLEMENTATION_HANDOFF_2026-10-02.md`: trạng thái code và giới hạn nghiệm thu.

Các prompt/mức âm/motion brief là quyết định thiết kế cho gói mới. Các đường dẫn/tên ID/trạng thái file được đối chiếu với code local ngày nêu đầu tài liệu; không dựa vào một branch remote chưa kiểm tra.
