# Ship Visual V3 — verified binary installation and performance QA

The V3 source-art bundle has **11 genuinely distinct illustrated source ships** and one optimized 1024×768 transparent lossless WebP atlas. The reviewed binary is now committed at the canonical path and registered in the production manifest (commit `6756a943`); normal startup therefore prefers V3. The existing V2 SVG and procedural renderer remain fail-soft fallbacks, and `?shipArt=v2` remains the explicit same-device A/B reference.

## Reviewed production file

- Required filename: `player-ships-v3.webp`
- Required repository path: `public/assets/space-typing/ships/player-ships-v3.webp`
- SHA-256: `fb9434e002d6da650e34192eb425e62d1e2f3bec8804a9b33b7aa8733de10eb3`
- Raw file: 800,054 bytes (781.3 KiB); below the 800 KiB target and 1.2 MiB hard ceiling.
- 1024×768, 11 independently reviewed 256×256 cells in the canonical CharacterId order; twelfth cell fully transparent.
- Decode: ~3 MiB RGBA, one atlas shared across combat/Character Select/HUD.

`scripts/install-ship-v3.mjs` verifies the exact SHA and byte count, copies the binary into `public/`, and inserts the V3 art manifest entry just after V2. `scripts/check-ship-art-budget.mjs` runs under `pnpm build` and rejects unregistered, oversized, invalid-header, wrong-resolution and unreviewed-hash V3 files.

## Current production registration

Current `main` already contains:

- `public/assets/space-typing/ships/player-ships-v3.webp` — 800,054 bytes;
- `public/assets/space-typing/manifest.json` entry `player-ship-sheet-v3`;
- the reviewed SHA-256 guard in `scripts/check-ship-art-budget.mjs`;
- startup selection `V3 → V2 → procedural`, with `?shipArt=v2` explicitly excluding V3 from preload for A/B measurements.

`pnpm build` verifies the binary hash, RIFF/WebP header, exact 1024×768 dimensions and 1.2 MiB hard ceiling. CI #606 on the latest combined stage-pacing head also reports **Ship V3 art budget PASS**.

The installer remains a recovery/replacement tool only. Do **not** rerun it on a healthy clone merely because an older document said the binary was missing. If the committed file is intentionally replaced in the future, the new artwork must be reviewed and the expected hash updated deliberately; never substitute a random/upscaled image.

## Same-device browser A/B checklist (V35)

Use the existing Test Lab profiler, same stage/preset, same quality, same equipment build and same browser/device:

- **V2 reference:** load `?shipArt=v2`; V3 is excluded from image preload. Verify `document.documentElement.dataset.shipArt === "v2"`.
- **V3 candidate:** reload without `shipArt`; verify `document.documentElement.dataset.shipArt === "v3"`. A value of `v2` or `procedural` is a fallback and **not a V3 performance result**.
- Repeat each run three times for 60 seconds. Record average and p95 frame ms on Low/Medium/High/Ultra and a max-pressure Test Lab stage. Reject V3 if the paired p95 frame-time increase exceeds 1 ms or if V3 causes visible stutter.
- Review all 11 ships at native 64/78/128 CSS px and compare at least two opposite equipment-affinity auras during rapid typing; enemy text readability wins over bloom/particle richness.
- No new ship animation loop or per-frame image decode may be introduced. If the limits are exceeded, simplify/drop visual effects before requesting a larger resource budget.

Manual browser/visual and audio checks are **not** represented by CI. Do not mark V35 complete from the existence of the optimized atlas or a mock Canvas test. M22–M25 stay deferred until the user resumes those roadmap milestones.
