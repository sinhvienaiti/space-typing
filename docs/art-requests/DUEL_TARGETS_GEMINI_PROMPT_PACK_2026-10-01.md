# SPACE TYPING — DUEL TARGET ART PROMPT PACK

Ngày: 2026-10-01  
Mục đích: tạo 18 world-object sprite cho PvP Duel FINAL V4.  
Runtime path sau prepare: `public/assets/space-typing/duel-targets/`.  
Source local đặt tại: `art-src/duel-targets/`.

## CRITICAL DELIVERY RULE

- ONE GENERATION CALL = ONE REQUESTED FILE.
- Không collage, contact sheet, grid, storyboard hoặc nhiều object trong cùng ảnh.
- Mỗi ảnh chỉ chứa đúng một world object.
- Không chữ, không tên file, không label, không HUD, không viền card.
- Background phải **transparent alpha thật**. Không nền đen, trắng, checkerboard hoặc wallpaper.
- Object nằm gần tâm canvas, có padding an toàn quanh silhouette.
- Không bake glow thành hình vuông; glow phải fade tự nhiên vào alpha.
- Material rõ, silhouette đọc được khi hiển thị nhỏ khoảng 40–60 CSS px.
- Góc nhìn 3/4 front hoặc side phù hợp game không gian 2D; tránh phối cảnh cực đoan.
- Phong cách chung: cinematic sci-fi combat object, polished game key art, physically readable material, crisp edges, controlled bloom.
- Không tạo vật thể giống credit crystal pickup nếu action không phải crystal.
- Tất cả file đặt đúng tên bên dưới; có thể dùng PNG RGBA master lớn 1024×1024 hoặc tương đương.

## 01 — laser.png

Create one compact laser-core combat target for a cinematic sci-fi typing duel.
A small armored emitter core with a bright cyan-white energy chamber, dark gunmetal shell, a few precise mechanical vents and a clear forward firing aperture.
Silhouette must read as an energy weapon, not a generic crystal or orb.
Controlled emissive glow only around the energy chamber; metal remains opaque and detailed.
Single object, centered, transparent alpha background, no text, no UI frame, no projectile beam crossing the canvas.

## 02 — missile.png

Create one guided missile pod / missile body combat target.
Compact military sci-fi missile with a pointed nose, segmented metal body, tiny guidance fins and a restrained orange-cyan engine glow.
It must look clearly different from laser, bomb and railgun.
Show one object only, not a missile swarm.
Transparent alpha background, no smoke sheet, no text, no HUD.

## 03 — railgun.png

Create one heavy electromagnetic railgun-core combat target.
Long narrow industrial weapon module with twin rails, dense gunmetal structure, blue-white capacitor strips and a powerful forward muzzle assembly.
Silhouette should feel heavy, precise and kinetic rather than magical.
Keep the object readable at small size with strong length direction and clean negative space.
Transparent alpha, no text, no beam, no background.

## 04 — bomb.png

Create one compact futuristic bomb / explosive core target.
Dense armored spherical or faceted charge with visible locking seams, warning-energy core and a short mechanical arming section.
It must look heavier and more dangerous than a generic glowing ball.
Do not draw the explosion itself inside this asset.
Transparent alpha, one object, no labels or warning text.

## 05 — siege-lance.png

Create one elite siege-lance weapon object.
A long high-energy lance emitter with reinforced spine, sharp forward geometry, large capacitor chamber and controlled red-white / cyan energy accents.
Silhouette must look like a major attack and be visually distinct from railgun.
Avoid giant screen-filling wings; keep a compact target footprint.
Transparent alpha, no beam, no text, no UI.

## 06 — shield.png

Create one shield-generator world target.
A compact sci-fi defensive generator with a solid mechanical core and several angular projector petals, emitting a subtle cyan protective field close to the object.
Do not create a full-screen shield bubble.
It must read as equipment, not a currency crystal.
Transparent alpha, centered, no text or HUD.

## 07 — reflect.png

Create one reflection / deflection defense module.
Polished mirrored alloy plates around a compact energy core, asymmetric angled surfaces designed to redirect incoming fire.
Use a cool violet-cyan highlight language while keeping opaque metal readable.
Silhouette must differ clearly from shield and barrier.
Transparent alpha, no incoming projectile, no text.

## 08 — barrier.png

Create one heavy barrier projector target.
Broad reinforced emitter with layered armor ribs and a dense luminous central field generator.
Visual identity: stable, thick, defensive, heavier than shield.
No giant wall baked into the image; only a small local energy rim may surround the device.
Transparent alpha, no text, no UI panel.

## 09 — repair.png

Create one repair module / nanite repair canister target.
Mechanical service unit with tool-like articulated details, green-teal repair energy reservoir and small diagnostic lights.
It should communicate restoration without using a medical red cross or text.
Opaque machinery first, glow second.
Transparent alpha, one object only.

## 10 — energy.png

Create one energy-cell combat target.
High-density futuristic power cell with transparent inner chamber, bright golden-cyan plasma and strong mechanical containment rings.
It must not look like the game's credit currency pickup.
Use a technical power-module silhouette rather than a collectible gem.
Transparent alpha, no text, no UI.

## 11 — amplify.png

Create one amplifier field module target.
A compact resonator with concentric mechanical fins, a bright central emitter and subtle expanding energy rings close to the device.
The rings must fade to transparency and remain secondary to the physical object.
Distinct from scan and gravity.
Transparent alpha, no text or background.

## 12 — drone.png

Create one small autonomous support drone target.
Compact mechanical drone with two or four short stabilizer arms, visible sensors, service ports and a restrained blue-green thruster glow.
No pilot cockpit; clearly an unmanned support unit.
Readable silhouette and balanced 3/4 view.
Transparent alpha, no environment, no text.

## 13 — lock-on.png

Create one lock-on targeting module target.
Mechanical sensor package with a central optical lens, small tracking vanes and angular radar hardware.
Do not bake a large UI crosshair or letters into the sprite; the object itself must carry the identity.
Red-cyan targeting light accents are allowed but controlled.
Transparent alpha, no text, no HUD.

## 14 — gravity.png

Create one gravity-well device target.
Compact exotic-matter containment unit with a dark dense core, metallic stabilizer arcs and a thin violet-blue distortion halo.
The dark core must remain visibly separated from transparent background.
Do not make it a full black-hole scene.
Transparent alpha, one object, no text.

## 15 — disrupt.png

Create one electronic disruption / EMP device target.
Angular tactical module with segmented antennae, fractured magenta-cyan electrical traces and a dense dark metal core.
Visual identity should imply interference and jamming, not direct explosive damage.
Small local sparks may fade into alpha.
Transparent alpha, no text or UI.

## 16 — scan.png

Create one scanning sensor module target.
Compact high-resolution sensor dish / optical array with multiple lenses, thin rotating-ring geometry and cool cyan scanning emitters.
Do not bake a sweeping full-screen scan line.
It must remain distinct from lock-on: broader sensing array, less weapon-like.
Transparent alpha, no text or HUD.

## 17 — fate-crystal.png

Create one rare Fate Crystal PvP target.
Elegant faceted crystal suspended in a small mechanical containment cradle, with unusual prismatic violet-gold internal light.
It must look like a dangerous strategic objective, **not** like the game's credit crystal pickup: use a different silhouette, containment hardware and color hierarchy.
Premium cinematic material, crisp facets, restrained aura.
Transparent alpha, no text, no currency symbol.

## 18 — black-hole.png

Create one contained black-hole mystery target.
A compact singularity held by a sci-fi stabilizer frame: truly dark central core, thin bright accretion arc, subtle gravitational lensing and small metallic control anchors.
Do not render a full galaxy or wallpaper around it.
The silhouette must remain readable on both bright and dark game backgrounds.
Transparent alpha, no text, one contained object only.

## Sau khi tạo đủ ảnh

Đặt đúng 18 file master vào:

```text
games/space-typing/art-src/duel-targets/
```

Tên phải đúng chính xác:

```text
laser.png
missile.png
railgun.png
bomb.png
siege-lance.png
shield.png
reflect.png
barrier.png
repair.png
energy.png
amplify.png
drone.png
lock-on.png
gravity.png
disrupt.png
scan.png
fate-crystal.png
black-hole.png
```

Workflow thường ngày không cần nhớ lệnh riêng. Từ root `typing-game`, `./play.sh` hoặc `./dev.sh space` đã đi qua `pnpm --dir games/space-typing art:prepare`. Nếu muốn kiểm tra riêng pipeline target:

```bash
cd games/space-typing
pnpm duel-targets:prepare
pnpm test
pnpm build
```

Pipeline sẽ từ chối ảnh target không có transparent alpha thật thay vì âm thầm key nền đen/trắng thành sprite production.
