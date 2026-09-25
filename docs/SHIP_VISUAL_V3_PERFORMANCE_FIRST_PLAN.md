# Ship Visual V3 — Performance-First Art Polish Plan

Status: V30–V34 IMPLEMENTED · V32/V33 REVIEWED BINARY COMMITTED + ACTIVE · CURRENT ROADMAP ACCEPTED 2026-09-24 · V35 DEDICATED BROWSER A/B RETAINED AS OPTIONAL REGRESSION CHECK

Source of truth: this document + `docs/PROJECT_CONTEXT.md` + existing V2 art/runtime contracts.
This is an approved, scoped follow-up to C05–C11 in `docs/PRE_M22_COMBAT_IDENTITY_TYPING_CLARITY_PLAN.md`.
The actual illustrated V3 art is committed and loaded with V2/procedural fallback. The original dedicated same-device browser benchmark remains valuable evidence, but after the 2026-09-24 owner acceptance it no longer blocks the roadmap. Do not invent benchmark numbers; run the A/B check when investigating a visual/performance regression.

## Product goal

Replace the current fairly geometric illustrated SVG ships with **11 clearly distinct premium 2D sci-fi/fantasy painted ship sprites** in the glossy, collectible, miniature-spacecraft direction approved by the user. Retain the compact battlefield footprint and existing equipment-derived aura and per-character projectile identities. Art quality matters, but the game remains typing-first; remove any embellishment with a material frame-time, memory, loading or word-readability penalty.

## Current baseline and architecture audit (main `3b8e09d`)

- V2: one optional 4 × 3 SVG atlas (`player-ships-v2.svg`), procedural Canvas fallback; `setCharacterShipSheet` and `drawCharacterShip` already share art across combat/HUD/character UI.
- Equipment aura is derived from existing equipped gear. Character-specific lasers and hits already reuse the existing hit visualization.
- Game has Low/Medium/High/Ultra rendering profiles, capped particles, DPR and Canvas pixels.
- CI #493 PASS: 124 test files / 629 tests; current bundle ~172.04 KiB gzip for script/style build metrics. **This number does not measure V3 public-image transfer or browser image decode memory**; evaluate those separately.
- V3 must not add a new gameplay or persistence domain, WebGL scene or a new animation loop.

## Reviewed decisions

1. Prefer a **single 4 × 3 transparent raster atlas** for all 11 ships (last cell unused), rather than 11 concurrent image requests or large untrimmed scene illustrations. Preserve fixed row-major CharacterId mapping.
2. Target 256 × 256 source pixels per cell: total 1024 × 768 atlas, approximately 3 MiB decoded RGBA. Render ~78 CSS-pixel combat ship and larger menu preview from the same loaded image.
3. Prefer an optimized **lossless/high-quality WebP** if transparent edges, broad browser compatibility and visual review meet requirements; PNG is an acceptable fallback if its measured payload remains within budget. No lossy halo artifacts around transparent wings.
4. Reuse **one decoded image** across battle, HUD and Character Select. No per-frame fetch, SVG parse, image decode, rasterization to an offscreen canvas or image resampling cache rebuild.
5. Reuse current engine flames, one derived equipment aura, 11 projectile profiles and state VFX. Do not bake an animated aura/shot into ship artwork or introduce sprite-sheet frame-by-frame animation.
6. Layer only the minimum runtime animation: current low-amplitude hover/bank, existing engine flames, already-shipped equipment aura and projectile VFX. Restrict or omit extra bloom, secondary particle clouds, 3D tilts, animated mechanical wings and large trails unless profiling proves their value.
7. An image load failure or budget violation must prefer V2 SVG; if V2 also fails, fall back to the current procedural Canvas silhouettes. Do not block gameplay.
8. The approved generated concept was only a **reference**. The reviewed 11-ship production atlas is now committed and integrated; V3 still remains **acceptance-pending** until the required same-device browser performance/readability review is recorded. A green file/hash/build check is not a substitute for V35.

## Measured performance and integrity gates

Static transfer/file-size ceilings are **not** acceptance gates. The atlas byte
size is reported for visibility, while actual runtime cost and correctness are
reviewed directly.

| Metric | Current acceptance rule |
| --- | --- |
| Atlas dimensions/layout | 1024 × 768 px for the current 4 × 3 runtime slicing contract |
| Reviewed asset identity | deliberate reviewed SHA/provenance; replacement requires explicit review |
| Simultaneously retained full-size atlas textures | 1 (release V2 decoded reference when V3 succeeds unless needed for failover) |
| Additional mandatory combat animation loops | 0 |
| Additional per-frame asset decode/canvas creation | 0 |
| Additional continuously moving ship particles | 0 on Low; no new emitter on Medium; opt-in/strictly bounded on High/Ultra only if measured |
| Incremental V3 CPU/frame at peak pressure | p95 frame-time regression ≤ 1 ms versus V2 on same browser/device/quality; if baseline already misses target, V3 must not worsen it |
| Incremental load delay | must not block starting a stage; degraded/fallback art is acceptable while V3 loads |
| Enemy word obstruction | none; visual effect must never cover or reduce enemy-word contrast |

Optimize image transfer/decode where practical, but do not reject reviewed art
or reduce maintainability merely to satisfy a historical KiB/MiB number.
Bundle and asset sizes are reported as review signals under
`docs/CODE_QUALITY_AND_PERFORMANCE_RULES.md`.

## Milestones

### V30 — Production art direction and distinctness specification

Define 11 unique shape languages with consistent top-down 2D orientation, transparency and lighting. Separate plated hull/canopy/engine housing/hardpoints and unique color accents. The goal is recognizability from silhouette at actual combat size, not adding microscopic details invisible at 78 px.

- Vanguard — streamlined cyan heroic spear fighter; twin nacelles.
- Aegis — broad mint armored fortress with recessed gold core.
- Volt — electric cyan/blue articulated arcs, strong energized core.
- Wraith — thin violet stealth crescent and shadow surfaces.
- Fortune — compact golden ornate crown/treasure silhouette.
- Arsenal — orange-red aggressive gun-wing assault fighter.
- Oracle — pink/violet mystic asymmetric prism tips and precise canopy.
- Bastion — green-cyan guard/fortress with protective side pods, distinct from Aegis.
- Reaper — crimson/magenta swept scythe blades.
- Celestial — blue/violet radiant angelic wings and gold star core.
- Zenith — white/cyan/violet apex flagship, layered high-rank hull distinct from Vanguard.

Acceptance: independent silhouette and full-color comparison at 64/78/128 CSS px. Reject art that is merely color-swapped or becomes visual mush at combat scale.

### V31 — Safe V3 atlas contract and performance guards

- Add V3 asset id and a **pure ordered fallback selector**: V3 → V2 → procedural.
- Keep the runtime atlas dimensions/layout contract explicit and validate image identity/header/dimensions without a transfer-size ceiling.
- Keep the current V2 artwork active until a real V3 atlas is available.
- Add tests for missing, failed, corrupt or wrong-dimension V3; preserve the existing V2 load and procedural fallback.
- Avoid per-character image preloading or repeated decode.

### V32 — Actual premium ship illustration production

- Produce 11 genuine polished top-down sprites, reviewed against V30, with clean transparent backgrounds and consistent lighting/scale.
- Assemble a real 4 × 3 raster atlas, preserving the existing CharacterId cell order.
- Generate **a preview contact sheet plus per-character crop review**.
- Optimize transparency and compression; document actual width, height and byte size.
- Do **not** commit the approved low-resolution concept sheet as an unreviewed combat atlas, stretch low-res assets as fake HQ or use speculative generated art credits.

### V33 — Runtime atlas switch

- Register the actual V3 asset through the existing optional manifest/pipeline and use V31 selector.
- Runtime loader never blocks stage start; V2/procedural always available during errors.
- Reuse one drawn image in Combat, Character Select and player status without changing hitboxes, ship size, logic or PlayerSave.
- Use existing style, color aura and shot profiles. Prefer no extra alpha-glow over a naturally illustrated hull.

### V34 — Lightweight finish for engines/aura/shots

- Retune colors, alpha, muzzle flash and aura layer composition against the new art; no new damage or projectile engine.
- Quality policy: Low = one clear ship + current minimal engine/shot effects; Medium = same with restrained aura; High/Ultra = richer current effects only while maintaining readability.
- Discard large outer halo, extra per-frame blurs or persistent particle trails if a visible/measurement gain is not worth their cost.

### V35 — Art quality and performance gate

- Automated: image identity/header/dimensions integrity check, unchanged gameplay tests, asset-fallback tests, TypeScript/build and report-only bundle metrics.
- Browser Test Lab: paired **same device/settings/stage/quality** V2 vs V3, 60 seconds per run plus high-pressure scene, collect frame-time p95/average, rough load duration and image failure telemetry; repeat runs instead of trusting one sample.
- Human visual pass at actual 64–128 CSS px plus at least two character/equipment build/aura combinations.
- If p95 frame regression > 1 ms, loading stalls gameplay or ship art harms enemy-text readability, simplify/optimize the expensive runtime behavior and re-test.

### V36 — M22 handoff, documentation and CI

- Update `docs/M22_MANUAL_PLAYTEST_MATRIX.md`, `docs/M22_BALANCE_PERFORMANCE_AUDIT.md`, roadmap and project context.
- After green PR CI, merge in reviewable slices; verify merged-main CI.
- M22 remains PENDING until actual browser/audio/human-paced manual rows are completed. M23/M24/M25 cannot be marked complete from an image/CI result.

## Out of scope unless a separate performance-backed proposal is accepted

- 3D/WebGL/Three.js for player ships;
- 11 large uncompressed standalone ship textures in memory;
- skeletal wing animation or dozens of baked animation frames;
- heavy real-time bloom, continuously blurred shadows, large full-screen engine trails;
- extra particle emitter per equipment item;
- new permanent combat HUD panels or visual overlays on typed words;
- claims that a generated sample image is production-ready without file-integrity/dimension/browser verification.

## Execution checkpoints

- V30: 11-ship art direction, exclusion list and performance/integrity constraints documented here.
- V31: implemented `src/characters/ship-art.ts` V3 → V2 → procedural fallback, dimension-validation tests, and `scripts/check-ship-art-integrity.mjs` wired to production build. The real V3 atlas is now registered; `?shipArt=v2` remains the QA baseline override.
- V32: 11 distinct generated source sprites and the reviewed 4×3 lossless WebP atlas are complete. The production atlas is committed in Git as `public/assets/space-typing/ships/player-ships-v3.webp` by commit `6756a943`; it is 1024×768, 800,054 bytes (781.3 KiB), ~3 MiB decoded RGBA and SHA-256 `fb9434e002d6da650e34192eb425e62d1e2f3bec8804a9b33b7aa8733de10eb3`. The production manifest registers `player-ship-sheet-v3`, and the build integrity guard verifies the exact reviewed hash and dimensions while reporting transfer size.
- V33/V34: the V3-aware render path is active by default through V3→V2→procedural selection; it avoids V2 engine flames and heavy image-shadow bloom over painted V3 art, and startup exposes `document.documentElement.dataset.shipArt` for QA. Character-specific projectiles and equipment aura still reuse existing implementations without new emitters. On successful V3 selection the decoded V2 fallback image reference is released; `?shipArt=v2` intentionally excludes V3 preload for clean A/B measurements.
- V35: atlas file/hash/header/dimensions/transfer checks now pass in production CI and V3 is available on normal startup. The remaining gate is the paired **same-device real-browser** V2/V3 Test Lab benchmark plus image-contrast/two-build human visual review. Never substitute mocked Canvas tests, CI frame simulations or invented benchmarks.
- V36: safe activation code and the vetted binary are now in Git and automated build guards pass. Final V3/M22 acceptance remains incomplete until the browser A/B and human visual/audio rows are recorded; M23/M24 remain blocked by the M22 manual gate.
