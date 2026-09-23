# Ship Visual V3 — Performance-First Art Polish Plan

Status: V30–V34 ART/PREP IMPLEMENTED · V32 BINARY NOT YET COMMITTED · V35 BROWSER GATE PENDING · V36 FINAL HANDOFF PENDING

Source of truth: this document + `docs/PROJECT_CONTEXT.md` + existing V2 art/runtime contracts.
This is an approved, scoped follow-up to C05–C11 in `docs/PRE_M22_COMBAT_IDENTITY_TYPING_CLARITY_PLAN.md`.
It must not be reported complete until the **actual new illustrated art** has been committed, loaded, reviewed in a browser and benchmarked. The existing V2 vector artwork is a usable fallback, not a substitute for the promised V3 premium art.

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
8. The approved generated concept is a **reference**. Ship V3 remains PENDING until 11 new production-quality sprites are actually prepared, checked and integrated. A performance scaffold or rebranding of V2 is not completion.

## Non-negotiable measured budgets

These are **acceptance ceilings for the incremental V3 slice**, not claims about measured current runtime:

| Metric | Acceptance budget |
| --- | --- |
| Initial V3 atlas file transfer | target ≤ 800 KiB; hard ceiling 1.2 MiB |
| Single atlas dimensions | ≤ 1024 × 768 px |
| Atlas decoded RGBA | ≤ 3 MiB at specified ceiling |
| Simultaneously retained full-size atlas textures | 1 (release V2 decoded reference when V3 succeeds unless needed for failover) |
| Additional mandatory combat animation loops | 0 |
| Additional per-frame asset decode/canvas creation | 0 |
| Additional continuously moving ship particles | 0 on Low; no new emitter on Medium; opt-in/strictly bounded on High/Ultra only if measured |
| Incremental V3 CPU/frame at peak pressure | p95 frame-time regression ≤ 1 ms versus V2 on same browser/device/quality; if baseline already misses target, V3 must not worsen it |
| Incremental load delay | must not block starting a stage; degraded/fallback art is acceptable while V3 loads |
| Enemy word obstruction | none; visual effect must never cover or reduce enemy-word contrast |

Target source resolution and file ceiling are **both** required. If high-detail art exceeds either, reduce source complexity/compression first. Only increase the budget by an explicitly reviewed plan amendment backed by measurements; default action is to simplify or drop expensive effects. Keep the existing enforced JS/CSS M22 bundle budgets. The canonical `player-ships-v3.webp`/`.png` raster is excluded from M22 `totalRaw` and `totalGzip` (it has a mandatory, separate 1.2 MiB/dimension check in `scripts/check-ship-art-budget.mjs`); **all other static assets retain their previous M22 accounting**. This prevents double-counting the single optional premium texture without weakening the JavaScript/CSS limits.

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
- Add dimensions/estimated decoded byte limits to the selector without falsely assuming external images comply.
- Keep the current V2 artwork active until a real V3 atlas is available.
- Add tests for missing, failed and oversized V3; preserving the existing V2 load and procedural fallback.
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

- Automated: image file dimensions/transfer budget check, unchanged gameplay tests, asset-fallback tests, TypeScript/build/M22 JS/CSS budget.
- Browser Test Lab: paired **same device/settings/stage/quality** V2 vs V3, 60 seconds per run plus high-pressure scene, collect frame-time p95/average, rough load duration and image failure telemetry; repeat runs instead of trusting one sample.
- Human visual pass at actual 64–128 CSS px plus at least two character/equipment build/aura combinations.
- If p95 frame regression > 1 ms, loading stalls gameplay, ship overlaps enemy text or images exceed hard ceiling, simplify/compress/remove expensive features and re-test; do not waive tests with a larger budget by default.

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
- claims that a generated sample image is production-ready without file/size/browser verification.

## Execution checkpoints

- V30: 11-ship art direction, exclusion list and hard budgets documented here.
- V31: implemented `src/characters/ship-art.ts` V3 → V2 → procedural fallback, dimension-validation tests, and `scripts/check-ship-art-budget.mjs` wired to production build. Until a real V3 atlas is registered, **runtime art remains V2**.
- V32: 11 distinct generated source sprites and the real 4×3 lossless WebP atlas have been assembled and visually reviewed as local artifacts; the atlas has 1024×768 pixels, 800,054 bytes (781.3 KiB; below the 800 KiB target), 3 MiB decoded RGBA and SHA-256 `fb9434e002d6da650e34192eb425e62d1e2f3bec8804a9b33b7aa8733de10eb3`. Local archive includes the full-resolution atlas, 11 original crops, a contact sheet and 64/78/128px previews. **The raster asset has not yet been committed as a binary GitHub blob.** The GitHub connector available in this environment can update source text but cannot ingest local binary files by path. Do not mark V32 source-of-truth integration complete until it is committed through a verified binary upload.
- V33/V34: V3-aware render path now accepts the existing V3→V2→procedural selection; avoids V2 engine flames and heavy image-shadow bloom over painted V3 sprite art; startup exposes current art source for QA. Character-specific projectiles and equipment aura still reuse their existing implementations without new emitters. Until the V3 WebP is registered in the existing art manifest **production continues to render V2**. `scripts/install-ship-v3.mjs` SHA-verifies the prepared V3 artwork, places the atlas under the canonical public path, and registers the manifest entry in a local clone.
- V35: local atlas file/format/source count/transparency and 64/78/128px preview preparation passed. Browser Test Lab V2/V3 paired performance, image contrast and two-build human visual comparison **must still be performed on a clone that has the V3 binary installed**. Never substitute mocked Canvas tests or an infographic's invented benchmarks.
- V36: docs and CI may merge the safe activation code first; the actual V3 release and final main CI are not complete until Git contains the vetted binary and browser checks have been recorded. M22–M25 remain deferred per user request.
