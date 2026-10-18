# Space Typing — Gemini Image Prompt Pack: Credit Crystals & Puzzle Chest

Ngày: 2026-09-30.

Mục đích: file độc lập để chủ dự án copy từng prompt vào Gemini tạo **art production**, không phải concept poster, mockup hay bản demo.

Nguồn thiết kế: [Report Credit/Duel/giải đố — §12](CREDIT_CRYSTAL_AND_DUEL_V2_IMPLEMENTATION_REVIEW_2026-09-30.md#12-hình-ảnh-giữ-gì-cần-bổ-sung-gì-cho-credit-duel-và-hòm-giải-đố), và §5–7 trong [Credit Crystal Master Plan](SPACE_TYPING_TIERED_CREDIT_CRYSTAL_MASTER_PLAN_REVIEWED_V2.md).

**Phạm vi: 11 sprite đầu ra, gồm CC01–CC08 và PQ01–PQ03.** Không cần tạo lại tàu người chơi, toàn bộ background Duel, icon skill hoặc bộ ảnh Expansion cũ. Nếu đã có đúng asset đạt yêu cầu, giữ và tái sử dụng thay vì tạo trùng.

Tài liệu chỉ cung cấp prompt, quy cách và QA; chưa tạo ảnh, chưa xác nhận ảnh nào PASS, chưa cài asset vào game. Các bố cục/pivot dưới đây là **quy ước authoring đề xuất cho bộ mới**, không phải metadata đã có trong renderer.

## 1. Cách dùng — đọc một lần trước khi tạo

1. Mỗi lần gửi **một prompt** trong code block tương ứng. Không gửi cả file rồi yêu cầu Gemini vẽ tất cả vào một ảnh.
2. Đính kèm reference theo hướng dẫn ngay trước prompt. Nếu Gemini không truy cập được file local, cần upload ảnh thật; gửi đường dẫn máy tính không thay thế việc upload.
3. Với reference phong cách: ưu tiên một crop asset đã duyệt, nhìn rõ vật thể, không nguyên ảnh screenshot có chữ/HUD. Không cần tạo ảnh reference mới.
4. CC05 bắt buộc dùng CC04 đã duyệt; PQ03 bắt buộc dùng PQ02 đã duyệt. Hai prompt này là **edit/variant**, không yêu cầu Gemini tự sáng tác lại vật thể từ trí nhớ.
5. Tải file ảnh gốc, không chụp màn hình preview. Đặt tên đúng bảng §2; không trông chờ công cụ tự ghi đúng tên hoặc tự lưu vào repo.
6. Kiểm tra theo §8 trước khi duyệt. Nếu sai, dùng edit với ảnh lỗi và reference phù hợp; không tự đổi thiết kế nguồn đã được duyệt chỉ để ảnh sau trông giống.
7. Giữ source/master; bản runtime WebP và các kích thước nhỏ được prepare riêng khi tích hợp. **Không đổi đuôi JPG thành PNG để giả alpha.**

### 1.1 Kích thước và transparency

- Chọn master vuông **1024×1024 px** cho cả bộ để thống nhất yêu cầu authoring. Đây là lựa chọn của pack này; report trước cho phép master nhỏ hơn với crystal nhỏ. Không phải game cần load 11 ảnh 1024² trong combat.
- Nếu phiên bản/công cụ Gemini đang dùng không xuất đúng kích thước hoặc RGBA, giữ output gốc và ghi rõ cần hậu kỳ. Pack không bảo đảm khả năng export của mọi model/UI.
- Ưu tiên PNG có **true transparent alpha**: vùng ngoài vật thể thực sự trong suốt, không hình caro được vẽ vào ảnh.
- Khi không thể xuất alpha, prompt cho phép nền phẳng neutral gray `#808080`, không bóng nền/gradient. Đây chỉ là source để xử lý tách nền; **chưa phải sprite production được duyệt**.
- Edit CC05/PQ03 phải giữ nguyên kích thước canvas của reference. Nếu reference không phải 1024², không resize riêng một state rồi làm lệch pair; xử lý cả pair đồng nhất trong pipeline.
- Không yêu cầu tool làm sprite sheet/atlas. Atlas, nếu dùng, là bước đóng gói sau khi từng sprite đã đạt QA.

### 1.2 Thứ tự ưu tiên khi reference và prompt khác nhau

1. Với CC05/PQ03: ảnh nguồn quyết định identity, camera, position và geometry; prompt chỉ thay đổi phần được chỉ định.
2. Với ảnh mới: prompt quyết định silhouette, orientation và bố cục; reference chỉ hướng dẫn rendering/material/palette tương thích.
3. Không copy chữ, UI frame, background, vũ khí hoặc chi tiết không liên quan từ reference.
4. Cùng phong cách không có nghĩa mọi crystal đều là một hình chỉ đổi màu. Ngoại lệ intentional là cặp Elite/Golden dùng chung geometry.

## 2. Danh sách file và reference cần chuẩn bị

| ID | File source dự kiến | Reference | Thứ tự |
| --- | --- | --- | --- |
| CC01 | `art-src/pickups/credits/common.png` | Asset đã duyệt của game làm style reference nếu có | Tạo trước để khóa phong cách crystal |
| CC02 | `art-src/pickups/credits/refined.png` | CC01 đã duyệt, style only | Sau CC01 |
| CC03 | `art-src/pickups/credits/high.png` | CC01/CC02 đã duyệt, style only | Sau CC02 |
| CC04 | `art-src/pickups/credits/elite.png` | CC03 đã duyệt, style only | Trước CC05 |
| CC05 | `art-src/pickups/credits/elite-golden.png` | **CC04 bắt buộc, ảnh cần edit** | Sau khi CC04 được duyệt |
| CC06 | `art-src/pickups/credits/mini-boss.png` | CC04 đã duyệt, style reference | Không dùng CC05 để biến toàn bộ tier sau thành vàng |
| CC07 | `art-src/pickups/credits/boss.png` | CC06 đã duyệt, style reference | Sau CC06 |
| CC08 | `art-src/pickups/credits/major-boss.png` | CC07 đã duyệt, style reference | Sau CC07 |
| PQ01 | `art-src/puzzle/puzzle-carrier.png` | Crop ship/asset sci-fi đã duyệt của game nếu có | Có thể làm độc lập nhóm crystal |
| PQ02 | `art-src/puzzle/puzzle-chest-closed.png` | PQ01 đã duyệt, style/material reference | Trước PQ03 |
| PQ03 | `art-src/puzzle/puzzle-chest-open.png` | **PQ02 bắt buộc, ảnh cần edit** | Sau khi PQ02 được duyệt |

CC/PQ là ID của pack mới, không đổi các ID A/B/C/E/F/G/H trong prompt pack Expansion cũ. Đây là tên source đề xuất; không tự rename/xóa asset cũ trong repo.

## 3. Art direction chung

### 3.1 Phong cách

Premium stylized sci-fi arcade: vật thể có chiều sâu 2.5D, material sắc nét, mảng sáng/tối lớn, silhouette dễ nhận biết. Không pixel art, không photoreal product photography, không icon phẳng đơn sắc, không hình nhựa đồ chơi bóng nhòe.

Material cần đẹp khi nhìn lớn nhưng đọc được khi thu nhỏ. Dùng broad facets/bevels thay cho hàng trăm đường khắc cực nhỏ. Light source ổn định từ upper-left; viền phía dưới/phải tối hơn để giữ hình trên nền sáng.

### 3.2 Crystal identity

- Cùng họ amethyst/violet, highlight trắng lạnh, accent cyan; Major Boss được có rất ít champagne-gold edge.
- Body chủ yếu opaque, độ sâu được vẽ trong material, không xuyên thấu toàn thân làm biến mất trên background.
- Một crystal liền khối mỗi ảnh. Crown/prongs là các facet/growth gắn vào cùng khối, không những viên nhỏ bay xung quanh.
- Không có tiền, con số, nhãn rarity, dấu tiền tệ, người, tay cầm, bệ hoặc khung icon.
- Không tạo halo lớn, tia sáng dài, đuôi bay hoặc sparkles rời. Những lớp động này thuộc runtime.

### 3.3 Carrier và hòm

- Friendly utility sci-fi: ivory/light neutral armor, navy inset, cyan lights, violet nhỏ và warm-gold latch; không dùng red aggressive eyes hoặc giant guns.
- Carrier bay **từ phải sang trái**, nose hướng trái, rear/thruster hướng phải. Dây kéo là runtime, hòm được render riêng.
- Hòm có một geometry thống nhất ở hai state; không dựa màu xanh/đỏ cố định để chỉ player ownership.
- Không bake chữ `QUIZ`, dấu `?`, câu hỏi, đáp án, reward hoặc UI card vào ảnh.

## 4. Prompts CC01–CC08 — copy từng block

### CC01 — Common / Amethyst Shard

Reference: có thể đính kèm một asset đã duyệt của game để giữ rendering style. Không cần ảnh Common có sẵn.

Đầu ra: `common.png`. Consumer theo C-plan: anchor khoảng 7–9 CSS px; đây là kích thước kiểm tra readability, không phải kích thước ảnh Gemini phải xuất.

```text
Create exactly ONE production-ready isolated game sprite for Space Typing: a Common-tier amethyst Credit Crystal. This is collectible currency artwork, not a jewelry product, an equipment item, a poster, or a UI mockup.

ART STYLE
Premium stylized sci-fi arcade, polished 2.5D painted rendering, sharp clean silhouette, broad readable facets. If a game-art reference is attached, match only its rendering quality and material language, not its subject, background, labels, or frame.

SUBJECT AND SILHOUETTE
One compact solid rhombus-shaped violet shard, upright, with a pointed top and bottom and simple angular side shoulders. Height approximately 1.6 times width. Use only three to five major readable facet planes, with one broad central face. It must remain recognizable when the visible crystal body is reduced to about 8 pixels tall. No crown extensions, no complex branching, no detached fragments.

MATERIAL AND LIGHTING
Deep amethyst body, a slightly lighter violet front facet, one strong ice-white upper-left reflection, a restrained lavender edge, and a thin dark indigo lower-right contour. Keep most of the body opaque; suggest gemstone depth through painted internal color rather than making the whole sprite transparent. Light comes from upper left. Preserve colored facets instead of burning the center into a white blob.

COMPOSITION
Square 1024 x 1024 master if supported. Upright object centered at approximately (50%, 50%). Visible silhouette occupies about 76% of canvas height, with generous transparent padding and no clipping. Orthographic-style isolated collectible view, a small amount of three-dimensional depth, no ground plane and no cast shadow outside the object.

OUTPUT
One object in one image. Prefer lossless PNG with real transparent alpha; do not paint a checkerboard. If true alpha export is unavailable, use one completely flat #808080 background without texture or shadow; this fallback will require background removal before game use. No text, numbers, currency signs, labels, watermark, border, UI, scenery, coin, metal mounting, floating sparkles, motion trail, wide halo, or additional crystals.
```

QA riêng: thu body về 8 px vẫn còn mảng tím + mặt sáng; không trông như một tia sáng hoặc biểu tượng kim cương trắng hoàn toàn.

### CC02 — Refined / Violet-Cyan Prism

Reference: CC01, **style only**, không copy silhouette Common.

Đầu ra: `refined.png`. Anchor khoảng 10–12 CSS px.

```text
Create exactly ONE isolated production game sprite for Space Typing: a Refined-tier violet-cyan Credit Crystal. If an approved Common crystal is attached, use it only to match material, lighting, and rendering style; create a clearly different elongated prism silhouette.

ART STYLE
Premium stylized sci-fi arcade collectible, polished 2.5D painting with clean angular contours and broad facets. Not photoreal jewelry, not a flat vector icon, not pixel art.

SUBJECT AND SILHOUETTE
One elongated hexagonal prism with a long central facet, two clear side facets, a beveled pointed upper cap and a tapered lower tip. Height about 2.0 times width. The central section should read as a prism rather than a stretched four-sided diamond. One connected crystal only, with no satellites, metal setting, or detached decoration. Keep the facet structure legible at an 11-pixel visible-body height.

MATERIAL AND LIGHTING
Rich violet body, darker indigo rear edge, distinct cyan refraction along one narrow side, and a crisp ice-white reflection on the upper-left cap. Upper-left light, darker lower-right contour. The body is predominantly opaque with painted internal depth. Slightly richer than Common, but no giant bloom or white blown-out center.

COMPOSITION
Prefer a square 1024 x 1024 master. Upright crystal centered at (50%, 50%), visible body approximately 76% of canvas height. Leave transparent margin on every side; no ground plane, horizon, surrounding scene or external cast shadow. Orthographic-style collectible view with restrained 3D depth.

OUTPUT
One sprite, one image, preferably PNG with true transparent alpha. Never draw a fake checkerboard. If alpha export is unavailable, use a completely flat #808080 background, no gradient or shadow, as a source requiring later background removal. No text, tier label, numbers, watermark, border, currency symbol, UI frame, floating fragments, starbursts, flight trails, decorative base, or other objects.
```

QA riêng: phân biệt được với CC01 bằng thân prism dài và mặt bên, không chỉ bằng cyan.

### CC03 — High / Royal Crystal

Reference: CC01 hoặc CC02 đã duyệt, style only.

Đầu ra: `high.png`. Anchor khoảng 13–16 CSS px.

```text
Create exactly ONE isolated production sprite for Space Typing: a High-tier Royal Credit Crystal. Attached approved lower-tier crystal art, if provided, is a material and lighting reference only. This tier needs its own silhouette, not just a recolor.

ART STYLE
Premium stylized sci-fi arcade, painted 2.5D volume, clean hard facets, strong small-scale readability. Avoid photoreal jewelry photography, flat glyphs, pixel art and tiny ornamental engraving.

SUBJECT AND SILHOUETTE
A broad regal hexagonal crystal: a pronounced central upper peak, two lower angular crown-like shoulders, wide upper body, and a single tapered lower point. Width about 72% of height. The shoulders are contiguous parts of one cut crystal, not separate jewels or a metal crown. Use five to seven bold primary planes and only a few secondary cuts. Make it visibly broader and more royal than a thin prism, readable at approximately 15 pixels tall.

MATERIAL AND LIGHTING
Royal purple and restrained magenta internal depth, crisp white upper-left facet highlights, thin cyan spectral edge, deep blue-violet shadow facets and a narrow dark contour. Mostly opaque body. Preserve a substantial purple central face; do not wash it out with bloom. Lighting comes consistently from upper left.

COMPOSITION
Square 1024 x 1024 master if supported, upright subject centered at (50%, 50%). Main silhouette around 76% of image height, entirely inside the canvas. Isolated orthographic-style collectible view with mild 3D depth; no floor, horizon, display stand or external cast shadow.

OUTPUT
One connected crystal in one image. Prefer PNG with real transparent alpha. Do not draw checkerboard pixels. If the exporter cannot produce alpha, use an absolutely flat #808080 background without shading; this is a background-removal source, not a finished transparent sprite. No text, numerical value, tier name, currency mark, watermark, border, UI, actual metal crown, detached shards, orbiting particles, long glints or wide halo.
```

QA riêng: vai crown vừa đủ; không đẩy High thành hình phức tạp nhất khiến Elite/Boss không còn chỗ nâng cấp.

### CC04 — Elite / Imperial Crystal

Reference: CC03 đã duyệt, style/material reference. Lưu ảnh đạt QA vì CC05 cần edit chính ảnh này.

Đầu ra: `elite.png`. Anchor khoảng 17–21 CSS px.

```text
Create exactly ONE isolated production game sprite for Space Typing: an Elite-tier Imperial Credit Crystal. An attached High-tier crystal, if present, is a style reference, not a shape to enlarge.

ART STYLE
Premium stylized sci-fi arcade, polished faceted 2.5D painting, bold sculpted silhouette, crisp readable edges. This is a magical-tech currency crystal, not equipment, jewelry, a badge, or a flat icon.

SUBJECT AND SILHOUETTE
A substantial elongated octagonal gemstone with stepped beveled shoulders, a raised central crystal ridge, strong angular lateral corners, a faceted upper cap and a pointed lower termination. Width about 70% of height. The stepped outline should distinguish it from the simpler Royal hexagon. One connected solid crystal, no separate satellites. Use a few dominant planes plus a controlled second layer of broad bevels; readable around 19 pixels tall.

MATERIAL AND LIGHTING
Violet-magenta body, luminous but bounded pale-white central reflection, cool cyan-white rim facets, dark indigo shadow planes. Strong upper-left light and a thin dark lower-right outline. Keep a mostly opaque purple body with internal painted depth. Leave distinct dark facet separations so it does not collapse into a glowing blob. This is the COOL Elite version: no dominant gold trim.

COMPOSITION
Square 1024 x 1024 master if supported. Upright, centered at (50%, 50%), about 76% canvas height, no cropping. Mild orthographic-style 3D depth. No ground, pedestal, environment or external shadow. Keep the composition stable: this exact image will later be edited into a Golden variant.

OUTPUT
One sprite in one image, preferably lossless PNG with true alpha. No painted checkerboard. If alpha cannot be exported, use a single flat #808080 background with no shadow or gradient for later background removal. No text, rarity label, numbers, watermark, currency symbol, border, UI panel, metallic jewelry mount, loose particles, orbiting gems, trails or large external bloom.
```

QA riêng: Elite phải nhận diện bằng stepped outline và khối lớn, không chỉ tăng độ sáng của High.

### CC05 — Golden variant của Elite — bắt buộc edit CC04

**Upload:** `elite.png` đã duyệt. Không dùng CC01 hoặc prompt chữ thay ảnh reference. Nếu chưa có CC04 đạt QA, hoàn thành CC04 trước.

Đầu ra: `elite-golden.png`. Giữ nguyên kích thước canvas, vị trí và tỷ lệ CC04.

```text
EDIT THE ATTACHED APPROVED ELITE CRYSTAL IMAGE into its Golden variant for Space Typing. The attached Elite image is the exact source object, not merely inspiration. If that source image is missing, ask for it instead of inventing a replacement design.

PRESERVE EXACTLY
Canvas dimensions, transparent padding, camera, upright orientation, position, bounding box, silhouette, central ridge, facet boundaries, bevel geometry, lower tip, outline thickness and lighting direction. Do not rotate, recenter, crop, scale or redesign the crystal. Keep the same predominantly violet-magenta body and the same mostly opaque material.

CHANGE ONLY
Turn the cool outer rim accents into controlled warm-white and pale champagne-gold highlights. Add a restrained amber-gold reflection to selected upper edge facets while keeping a purple central body and deep indigo shadows. The result is a premium Golden Elite variant of the exact same crystal. It must not become a gold coin, a gold ingot, a metal object or a fully yellow gemstone. Keep the central highlight detailed, not clipped to a white blob.

STYLE AND READABILITY
Maintain the source image's premium stylized sci-fi arcade 2.5D rendering and broad readable facets. It should remain legible at roughly 17–21 pixels of visible-body height. No additional facet noise or new ornament is needed.

OUTPUT
Exactly one edited sprite, same image dimensions and registration as the source. Preserve true transparent alpha when available; never draw a checkerboard. If the tool cannot export alpha, use only a flat #808080 matte without a shadow and preserve the source object's position for later processing. No text, numbers, tier label, watermark, border, new metal crown, jewelry setting, particles, trails, wide halo, background scene, side-by-side comparison or extra crystal.
```

QA riêng: overlay CC04/CC05 phải trùng silhouette. Nếu lệch geometry, yêu cầu edit lại từ CC04; không tự chấp nhận một crystal mới chỉ vì màu vàng đẹp.

### CC06 — Mini Boss / Grand Crystal

Reference: CC04 đã duyệt cho chất liệu, không copy stepped octagon nguyên mẫu.

Đầu ra: `mini-boss.png`. Anchor khoảng 22–28 CSS px.

```text
Create exactly ONE isolated production sprite for Space Typing: a Mini-Boss-tier Grand Credit Crystal. If approved Elite crystal art is attached, match its premium material and lighting while creating a distinct larger-tier silhouette.

ART STYLE
Premium stylized sci-fi arcade, sculpted 2.5D faceted painting, clean silhouette and bold internal planes, not photoreal jewelry, a flat logo, pixel art or an equipment reactor.

SUBJECT AND SILHOUETTE
A grand fused prismatic form: one dominant upright central crystal tower with two shorter heavy crystalline shoulder fins growing directly from its sides, all joined into one solid base tapering to a lower point. Width approximately 80% of height. The side fins must be thick, not fragile needles. This is ONE contiguous object, not three floating gems. It should feel heavier and more monumental than Elite while remaining readable around 25 pixels tall.

MATERIAL AND LIGHTING
Deep violet body, bright but bounded white inner facet, icy cyan prismatic side reflections, small magenta depth planes, and dark blue-purple outline along shaded edges. Mostly opaque gemstone body. Broad polished faces rather than dense microfacets. Upper-left lighting, strong enough separation between light and dark faces to preserve structure on bright backgrounds.

COMPOSITION
Square 1024 x 1024 master if supported. Upright crystal centered at (50%, 50%); full fused silhouette about 76% of canvas height. Transparent margins around all tips, no cropping. Orthographic-style isolated collectible view with moderate painted depth. No floor or external cast shadow.

OUTPUT
One connected crystal in one image, preferably lossless PNG with real transparent alpha. Never paint a checkerboard. If alpha export is unavailable, provide a completely flat #808080 background with no gradient or shadow for later background removal. No text, number, title, watermark, icon frame, currency symbol, metal base, actual crown, loose fragments, satellites, magical orbit, motion trail, scene or large glow cloud.
```

QA riêng: ba phần nhìn là một khối liên kết; không có mảnh rời bị cắt khỏi vật thể khi thu nhỏ.

### CC07 — Boss / Crown Crystal

Reference: CC06 đã duyệt cho style. Không gửi yêu cầu “enlarge mini-boss”.

Đầu ra: `boss.png`. Anchor khoảng 30–40 CSS px.

```text
Create exactly ONE isolated production hero-pickup sprite for Space Typing: a Boss-tier Crown Credit Crystal. Attached Mini-Boss artwork, if provided, is a rendering-style reference only. Design a clearly different boss silhouette, not a scaled-up lower-tier crystal.

ART STYLE
Premium stylized sci-fi arcade, richly faceted but clean 2.5D illustration, large polished planes and sculptural depth. It must read as a collectible crystal, not a royal emblem, jewelry, equipment, a photograph or a flat graphic.

SUBJECT AND SILHOUETTE
A broad crown-cut gem with a five-point crystalline upper crest integrated into a single thick gemstone body. The central crest point is highest, two intermediate points sit slightly lower, and the outer shoulders are broad and robust. The lower body converges into one substantial pointed keel. Width about 90% of height. The crown is carved from the same crystal, not a separate metal crown resting on it. All crest points are connected; no detached shards. At 35 pixels tall, the crest and keel should remain recognizable.

MATERIAL AND LIGHTING
Violet and magenta inner depth, large diamond-like ice-white upper-left reflections, cyan spectral side edges, and a restrained dark indigo silhouette. The body remains predominantly opaque and visibly purple. Use several major facets with a controlled secondary bevel structure. No overexposed white center and no painted external sparkle burst. Lighting stays upper left.

COMPOSITION
Square 1024 x 1024 master if supported. Upright, centered at (50%, 50%), complete silhouette about 76% of canvas height with clear alpha padding around every crest point. Orthographic-style collectible view with restrained 3D depth, no scenery, floor, pedestal or external cast shadow.

OUTPUT
Exactly one solid hero crystal, one image. Prefer PNG with true transparent alpha, never a painted checkerboard. If alpha is unavailable, use a completely flat #808080 matte with no shadow or gradient for later background removal. No text, number, tier badge, currency sign, watermark, border, metal crown, chain, satellites, shower of crystals, lens-flare rays, flight trail or wide halo.
```

QA riêng: các crest không quá mảnh; không tạo huy hiệu có viền tròn hoặc vương miện vàng thay vì crystal.

### CC08 — Major Boss / Sovereign Galaxy Crystal

Reference: CC07 đã duyệt cho material/style; shape cần khác rõ.

Đầu ra: `major-boss.png`. Anchor khoảng 38–50 CSS px.

```text
Create exactly ONE isolated production hero-pickup sprite for Space Typing: the highest-tier Major Boss Sovereign Galaxy Credit Crystal. If an approved Boss crystal is attached, use it for consistent rendering and material only. This asset must not be that image enlarged or simply recolored.

ART STYLE
Premium stylized sci-fi arcade, majestic 2.5D sculpted crystal painting with bold facets and carefully controlled detail. Not a photoreal gemstone photograph, a flat logo, a metal medallion, a spacecraft, or a relic machine.

SUBJECT AND SILHOUETTE
A monumental, almost square-height faceted crystal with a tall central spear-like upper peak, broad stepped crystalline wings on both sides, a nested diamond-shaped central face, and a substantial tapered lower point. Width about 95% of height. The lateral wings and nested face are fused growths of the same solid crystal, not orbiting pieces or metal appendages. Use stepped geometry to distinguish it from the Boss crystal's five-point crown crest. Keep enough broad, unbroken planes to read clearly at 44 pixels tall.

MATERIAL AND LIGHTING
Deep royal violet body, a bounded inner white core seen through painted facets, cyan spectral reflections and restrained magenta depths. Add only a few pale champagne-gold edge accents as the sovereign signature; purple must remain dominant. Dark indigo edge separation, predominantly opaque body, upper-left light. Several polished reflection points may be painted on the facets, but no detached star particles, external flare rays or giant bloom.

COMPOSITION
Square 1024 x 1024 master if supported. Upright, centered at (50%, 50%), whole connected silhouette about 76% of canvas height. Keep all tips within generous transparent margins. Orthographic-style isolated collectible view with painted depth. No floor, display stand, environment or external shadow.

OUTPUT
Exactly one sprite in one image. Prefer lossless PNG with actual transparent alpha; do not paint transparency checkerboards. If real alpha is unavailable, use a perfectly flat #808080 background without gradients or shadows, requiring later background removal. No words, digits, currency marks, tier labels, watermark, border, jewelry setting, orbit rings, detached crystals, full boss explosion, starfield, flight trails or a metal crown.
```

QA riêng: khác CC07 ở stepped lateral mass và central face; không vượt chi tiết đến mức chỉ còn nhiễu ở 44 px. “Galaxy” là identity, không yêu cầu vẽ cả ngân hà bên ngoài crystal.

## 5. Prompts PQ01–PQ03 — máy bay kéo hòm giải đố

### PQ01 — Puzzle Delivery Carrier

Reference: một crop ship/utility sci-fi asset đã duyệt của Space Typing nếu có. Enemy Carrier không mặc định là reference phù hợp chỉ vì cùng tên.

Đầu ra: `puzzle-carrier.png`.

Quy ước: carrier ở phía trước theo hướng bay trái, hòm được kéo phía sau/bên phải và hơi thấp hơn; engine vẽ tether. Vị trí attachment chỉ là hướng dẫn authoring, phải đo lại trên ảnh thật để làm metadata.

```text
Create exactly ONE isolated production game sprite for Space Typing: a friendly sci-fi delivery aircraft / utility drone that will tow a separate puzzle reward chest. Draw ONLY the aircraft. The chest, tether, motion and UI will be rendered separately by the game.

ART STYLE
Premium stylized sci-fi arcade, polished painted 2.5D metal and ceramic materials, clean readable silhouette and broad panel shapes. If game ship artwork is attached, match its rendering quality and sci-fi material language without copying its weapons, player insignia, labels or background. Not a realistic passenger airliner, not pixel art, not a flat icon, not a toy photograph.

CAMERA AND ORIENTATION
Horizontal craft pointing LEFT. Nose on the left, rear engines on the right. Use a shallow elevated three-quarter view so the upper hull and a narrow near-side surface are visible. Keep the left-right travel axis almost horizontal, not a nose pointed toward the viewer. The silhouette must read correctly during right-to-left movement across a 2D battlefield.

DESIGN
A compact, rounded-beveled utility hull with a short friendly nose, two broad short stabilizer wings, a protected cyan central sensor or cabin window, two compact rear thruster sockets and one visible rear-lower tow eye. Make the tow eye an integrated mechanical attachment at the right-rear underside, not an actual cable. Rounded armor and non-aggressive proportions distinguish it from an enemy fighter. No guns, missiles, red hostile eyes, skulls or visible pilot.

MATERIAL AND LIGHTING
Ivory/light neutral armored panels, deep navy recessed structure, restrained cyan emissive lights, small violet accents and a subtle warm-gold utility latch detail. Upper-left light with dark lower-right separation. Keep emissive lights inside their housings. No exhaust flame, smoke, trail or giant glow baked into the image.

COMPOSITION
Prefer a 1024 x 1024 square master. Craft roughly 2.5 times wider than tall. Center its overall silhouette around (50%, 50%), occupying about 80% of canvas width and approximately 32–36% of canvas height, leaving transparent margins. Do not add a ground plane or a cast shadow outside the craft. Keep the rear attachment visible and unobstructed. Do not crop wings, nose or engines.

OUTPUT
Exactly one aircraft, one image, preferably PNG with real transparent alpha. Never paint a checkerboard background. If true alpha export is unavailable, use completely flat #808080 with no texture, gradient or shadow for later background removal. No chest, rope, cable, hanging package, cargo contents, text, letters, question mark, numbers, logos, watermark, border, HUD, motion lines, scenery, stars or additional vehicles.
```

QA riêng:

- Nose trái, engine phải; không dựng 3/4 quá mạnh đến mức cảm giác bay xuống màn hình.
- Có rear tow eye để code nối dây; không có một sợi dây cố định đã vẽ trong PNG.
- Khi bỏ mọi label UI vẫn đọc là craft utility thân thiện, không phải quái combat.

### PQ02 — Puzzle Chest CLOSED

Reference: PQ01 đã duyệt cho material/palette. Không yêu cầu chép nguyên shape tàu vào hòm.

Đầu ra: `puzzle-chest-closed.png`. **Phải giữ canvas chưa trim và ảnh gốc để edit PQ03.**

Quy ước pair:

- Cùng canvas vuông.
- Thân hòm nằm ở vùng dưới-giữa; phần trên để dành cho nắp mở.
- Target main body khoảng x=24–76%, y=47–78%; bottom baseline y≈78%; pivot dự kiến ở thân khoảng (50%, 65%).
- Đây là target registration, không cam kết generator đặt đúng pixel. QA/pipeline phải kiểm tra.

```text
Create exactly ONE isolated production game sprite for Space Typing: a CLOSED sci-fi puzzle reward chest. This will be paired with an OPEN-state edit of this exact image. The chest must be a real game prop, not an illustration of a question panel or a UI card.

ART STYLE
Premium stylized sci-fi arcade, polished painted 2.5D depth, crisp broad bevels, readable large panels. If the approved delivery craft is attached, borrow only its ivory/navy/cyan material family and upper-left lighting. Do not copy its silhouette or add the craft to this image.

OBJECT DESIGN
One compact rectangular cargo chest with robust beveled corners, a clearly separate hinged top lid, a broad readable front face and a shallow visible right side. Include a simple central cyan lock/core surrounded by a small warm-gold mechanical latch, dark navy side recesses, ivory/light-neutral armor, and a few restrained violet seams. The lid hinges at the BACK edge and is fully closed. A small side tow bracket may be integrated into the body, but no rope or cable. No writing, question mark, letters, icons or displayed reward contents.

CAMERA
Fixed shallow elevated three-quarter view: see the front face, a narrow right side and the top of the lid. No extreme isometric angle and no fisheye. The OPEN version must later use this exact camera, not a new angle.

REGISTRATION AND PADDING
Prefer a square 1024 x 1024 master. Do NOT center the entire closed chest vertically. Intentionally place the main body in the lower-middle of the canvas, approximately x=24% to 76%, y=47% to 78%, with the bottom of the chest near y=78%. Keep the visual body center near x=50%. The closed lid sits on top of this body, around the mid-height region. Leave generous EMPTY transparent space above it, especially y=12% to 42%, so the same lid can open upward in a later edit without moving or scaling the body. Do not auto-crop or fill the empty upper area with decoration.

MATERIAL AND LIGHTING
Upper-left light, controlled bevel reflections, dark lower/right outlines. Opaque main body with small bounded cyan emissive details. No large aura, external cast shadow, platform, dust, fog or reward explosion.

OUTPUT
Exactly one CLOSED chest, one image. Prefer PNG with genuine transparent alpha, not a painted checkerboard. If alpha export is unavailable, use a perfectly flat #808080 background without texture or shadow; it will require later background removal. Preserve the full square canvas and its planned empty headroom. No aircraft, cable, open lid, loose coins, gems, text, mathematical symbols, numbers, watermark, border, HUD, backdrop or extra object.
```

QA riêng: khoảng trống phía trên là **cố ý**, không yêu cầu Gemini phóng to/center lại hòm để “lấp cho đẹp”. Lock/core là hình cơ khí, không câu trả lời hay dấu hỏi.

### PQ03 — Puzzle Chest OPEN — bắt buộc edit PQ02

**Upload:** đúng `puzzle-chest-closed.png` đã duyệt. Nếu công cụ có vùng chọn edit, ưu tiên chỉ vùng lid/top/interior; vẫn phải kiểm tra output không di chuyển body.

Đầu ra: `puzzle-chest-open.png`. Không gửi độc lập để model tưởng tượng một chiếc hòm mới.

```text
EDIT THE ATTACHED APPROVED CLOSED PUZZLE CHEST into the OPEN state of the SAME chest for Space Typing. This is an animation-state pair, not a new prop design. If the closed source image is missing, ask for it before creating the open version.

PRESERVE EXACTLY
The source canvas dimensions, camera angle, chest-body position, body scale, bottom baseline, front panel, side panels, armor geometry, latch housing, tow bracket, palette, lighting direction, transparent padding and perspective. Do not recenter, resize, rotate or crop the image. The main chest body must remain registered to the same pixels. The open version's total bounding box may extend upward because the lid opens, but the BODY must not move.

CHANGE ONLY THE OPENING PARTS
Rotate the same lid upward and backward around its original rear hinge, approximately a readable 75-degree opening from the closed position. Preserve the lid's thickness, width, bevels, material and decorative seams. Use the empty upper canvas reserved in the source so the raised lid fits without clipping. Reveal a modest dark navy interior with a soft pale-cyan/violet light INSIDE the cavity. The small latch mechanism may show an unlocked state, but do not redesign its housing. Keep the front and side body panels visually unchanged.

REWARD-NEUTRAL INTERIOR
The chest can award different rewards in gameplay. Do not draw coins, crystals, books, weapons, cards, money, written answers or any fixed reward inside it. Use only subtle interior light to show it has opened. No flying particles or reward rays; the game will add those effects.

STYLE
Maintain the exact premium stylized sci-fi arcade 2.5D rendering and upper-left light of the source. Keep broad readable panels and a clean silhouette. Do not turn the chest into a fantasy wooden treasure box, a gold jewelry case or a new futuristic design.

OUTPUT
Exactly one OPEN chest image at the source image's exact dimensions and body registration. Preserve genuine transparent alpha when supported; never paint a checkerboard. If alpha export is unavailable, use only a flat #808080 matte with no shadow while preserving registration, for later background removal. No text, numbers, labels, question marks, watermark, border, aircraft, cable, background, floor, external glow cloud, multiple views or before-and-after collage. Do not alter the closed source file; produce a separate open-state output.
```

QA riêng:

- Overlay PQ02/PQ03: front/side/body/bottom trùng, chỉ lid/interior/latch chuyển trạng thái.
- Nắp không phải bản photocopy của hòm bay lơ lửng, không xuyên vào thân và không clip mép canvas.
- Hai sprite thể hiện **hai state**, không mặc định đủ để interpolate nắp như một 3D hinge. Muốn chuyển động liên tục phải thiết kế layers/frame sequence trong integration riêng.

## 6. Phần nào không tạo bằng Gemini trong pack này?

Không yêu cầu thêm ảnh cho:

- Nội dung từng câu hỏi, từ vựng, đáp án hoặc 8 loại bài: UI render text, dùng badge existing/vector phù hợp.
- Số tiền Credits, tên buff, progress bar, countdown hoặc whole-screen HUD.
- Dây kéo giữa PQ01 và PQ02/PQ03, engine flame, hover, curved magnet, shader glint và reward particles.
- Mọi enemy kill burst đầy đủ; một crystal sprite được runtime spawn nhiều lần trong cap.
- 11 tàu người chơi, toàn bộ background Duel, skill icons và ảnh Expansion đã có.
- Một phiên bản Combat và một phiên bản PvP riêng của cùng hòm; state/ownership có thể thể hiện bằng UI/runtime marker.

Các Duel emblem, map-specific props/background còn thiếu không nằm trong 11 output này. Chỉ thêm vào một danh sách có consumer/identity rõ sau asset audit; không dùng pack này để tự sinh một kho asset ngoài scope.

## 7. Prompt sửa lỗi — chỉ dùng khi ảnh cụ thể không đạt

Các block sau là công cụ chỉnh **ảnh đã có**, không thêm ID hoặc tăng số asset cần bàn giao. Upload ảnh cần sửa; thêm ảnh reference cần giữ identity nếu liên quan.

### 7.1 Crystal quá nhiều chi tiết, mất hình khi thu nhỏ

```text
Edit the attached crystal sprite for small-scale game readability. Preserve its tier identity, outer silhouette, canvas dimensions, position, orientation, material family and upper-left lighting. Simplify tiny facet noise into a few broad light and dark planes. Restore a substantial opaque violet body, one controlled bright facet and a thin dark contour. Remove external haze, isolated sparkle dots and overexposed bloom without changing the crystal into a flat icon. Keep the same transparent padding. Export one edited image with true alpha if supported; otherwise use flat #808080 for later background removal, never a painted checkerboard. No text, new objects, redesign or enlarged crop.
```

### 7.2 Hòm mở bị lệch thân so với hòm đóng

Upload hai ảnh và nói rõ **Reference A = CLOSED chuẩn**, **Reference B = OPEN lỗi**. Reference A là authority geometry.

```text
Repair an animation-state registration error. Reference A is the approved CLOSED chest and is the authoritative source for canvas dimensions, camera, body geometry, body position, scale, bottom baseline, front panel, side panels, palette and lighting. Reference B is the OPEN attempt with alignment problems; use B only to understand that the lid should be open.

Build the corrected OPEN output from Reference A. Keep A's main chest body fixed in exactly the same position and scale. Open A's original lid backward around its rear hinge into the reserved upper headroom and reveal a softly lit, reward-neutral interior. Do not shift the body to center the larger open silhouette. Do not replace the lid or body with a different design. No coins, gems, text, background, external glow or new decoration. Output only one corrected OPEN sprite on A's full canvas, preserving genuine alpha when supported; if not, use flat #808080 for later removal. Do not overwrite or redesign Reference A.
```

### 7.3 Quy tắc khi alpha sai

Nếu nền caro đã bị vẽ vào ảnh, không coi câu trả lời “transparent PNG” của model là bằng chứng. Yêu cầu xuất alpha thật nếu công cụ hỗ trợ, hoặc xuất lại trên nền phẳng để xử lý tách nền bằng pipeline phù hợp. Sau tách nền phải kiểm tra viền mờ/matte trên cả nền sáng và tối; đổi extension hoặc chỉ xóa vùng nền bằng một màu không tự bảo đảm chất lượng.

## 8. Checklist duyệt trước khi đưa cho người tích hợp

### 8.1 Mọi asset

- [ ] Đúng một subject/ảnh, không collage, concept sheet hoặc nhiều góc nhìn.
- [ ] Đúng identity, orientation và filename; không có text/watermark/frame.
- [ ] Có file gốc, biết dimensions thực; source fallback matte được đánh dấu chưa tách nền, không báo alpha PASS.
- [ ] Alpha thật được kiểm tra trên cả nền trắng, đen và một background game sáng/tối.
- [ ] Không có viền trắng/xám bẩn do matte; không có checkerboard/ground shadow dính vào sprite.
- [ ] Không clip tip/wing/lid; padding đủ cho motion/rotation.
- [ ] Style/material thống nhất với reference đã duyệt, không chỉ “trông đẹp” khi xem riêng.
- [ ] Readable khi thu về kích thước consumer thật, không chỉ ở master 1024².

### 8.2 Crystal set

- [ ] Common → Refined → High → Elite → Mini Boss → Boss → Major Boss khác silhouette, không chỉ khác màu/độ lớn.
- [ ] CC04/CC05 trùng geometry/registration; CC05 vẫn có violet body.
- [ ] Đặt các tier ở cùng kích thước để kiểm tra identity, rồi đặt ở kích thước gameplay để kiểm tra hierarchy.
- [ ] Anchor size kiểm tra theo C-plan: CC01 7–9; CC02 10–12; CC03 13–16; CC04/CC05 17–21; CC06 22–28; CC07 30–40; CC08 38–50 CSS px.
- [ ] Các khoảng size trên nói về visible-body readability; khi tích hợp phải xử lý transparent padding, không scale cả canvas rồi vô tình làm body nhỏ hơn dự kiến.
- [ ] Ở kích thước rất nhỏ không ép thấy mọi facet; yêu cầu silhouette + một vài mảng màu/sáng còn rõ.
- [ ] Không có satellites/halo/trails baked sẵn làm tăng overdraw khi runtime thêm hiệu ứng.

### 8.3 Carrier/chest pair

- [ ] PQ01 nose trái, rear phải, tow point nhìn được; không có chest/tether đã ghép sẵn.
- [ ] PQ02 và PQ03 đúng cùng chiếc hòm, camera/material/palette không thay đổi.
- [ ] Main body overlay không nhảy vị trí/kích thước; bottom baseline trùng.
- [ ] Không auto-trim PQ02/PQ03 riêng từng ảnh. Nếu crop/pack atlas, dùng chung registration metadata/body pivot để giữ alignment.
- [ ] Hòm open không lộ reward cố định hoặc đáp án; cùng dùng được cho Combat/PvP.
- [ ] Cảnh gồm craft, tether runtime, chest và text UI vẫn đọc rõ, không che combat target/telegraph.

## 9. Handoff cho người tích hợp — không gửi thêm yêu cầu này để Gemini vẽ

1. Nhận đúng 11 output hoặc ghi rõ output nào đã reuse, output nào còn fail QA. Không đếm `@2x`/WebP derivatives là concept mới.
2. Preserve source artwork. Source convention:

```text
art-src/pickups/credits/
  common.png
  refined.png
  high.png
  elite.png
  elite-golden.png
  mini-boss.png
  boss.png
  major-boss.png

art-src/puzzle/
  puzzle-carrier.png
  puzzle-chest-closed.png
  puzzle-chest-open.png
```

3. Runtime paths dự kiến: `src/assets/pickups/credits/*.webp` và `src/assets/puzzle/*.webp`. Đây là đề xuất, chưa khẳng định pipeline/glob/consumer tương ứng đã được implement. Không chỉ copy PNG vào source folder rồi báo đã tích hợp.
4. Prepare alpha-preserving runtime sizes, sprite bounds và anchors. Carrier tow point, chest body pivot và lid registration phải lấy từ output thực, không tin tọa độ prompt đã chính xác.
5. Chỉ trim khi metadata giữ đúng registration; đặc biệt không trim cặp chest độc lập mà không bù offset.
6. Manifest/registry mapping, preload/decode/caching, quality caps và lifecycle owner phải đúng. Không decode master ở mỗi kill, không thêm một RAF loop riêng cho mỗi object.
7. Thử hiển thị/QA trong build thật là nghiệm thu sản phẩm, không phải làm một bản gameplay rút gọn. Giữ các gate economy/persistence/authority của report: ảnh đẹp không thay thế reward transaction correctness.

## 10. Tự rà tài liệu và trạng thái

- Bộ chính có đúng **8 CC + 3 PQ = 11 outputs**.
- Có đúng một prompt chính cho mỗi output; hai prompt sửa lỗi là hỗ trợ, không thêm asset bắt buộc.
- Mỗi prompt chính tự chứa subject/style/composition/output/negative constraints, không cần nối một “global prompt” bị thiếu khi copy.
- CC05 và PQ03 yêu cầu ảnh nguồn thật, không ngầm hứa model nhớ đúng vật thể từ lượt chat khác.
- Alpha/canvas size là yêu cầu cần kiểm tra, không tuyên bố Gemini chắc chắn xuất đúng.
- Không tạo ảnh câu hỏi/đáp án, không tự thêm background/Duel assets ngoài danh sách.
- Không có ảnh nào được sinh hoặc nghiệm thu trong tác vụ soạn file này. **Trạng thái: prompt pack sẵn để sử dụng; visual/runtime QA còn phải thực hiện trên output thật.**
