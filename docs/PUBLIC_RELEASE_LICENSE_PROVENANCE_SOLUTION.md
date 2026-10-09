# Space Typing — Public Release License & Provenance Solution

Status: **planning only / no runtime implementation in this branch**  
Purpose: prepare Space Typing for a future public deployment while active feature workers continue elsewhere.  
Base checkpoint when this plan was created: `main` at `4ce8741c1d144fd77e5b000dac76f6ab99216254`.

## 1. Current release intent

The immediate Cloudflare deployment is intended only as a personal/test deployment, not as a marketed, monetized, or broadly announced public release.

Important: a `pages.dev` deployment is still technically accessible on the public Internet unless access controls are added. Therefore this plan distinguishes:

- **TEST RELEASE** — acceptable for owner-only/manual testing with clearly documented temporary risk controls.
- **PUBLIC RELEASE** — suitable for sharing, promotion, monetization, or broad external use only after all mandatory gates below pass.

This document intentionally does not change runtime assets, package metadata, licensing, or CI yet.

---

## 2. What is already known

### 2.1 Project-original code and procedural art

Current project documentation identifies the procedural player/enemy/boss/projectile/UI renderers as project-original work. These are not presently known to impose a third-party copyleft obligation on Space Typing.

### 2.2 Third-party audio

The repository already records provenance for bundled default audio in:

- `public/assets/audio/ATTRIBUTION.md`
- `public/assets/audio/music/CURATED_CC0_SOURCE.md`

The currently documented fallback music and Kenney SFX are recorded as **CC0**.

### 2.3 Third-party background art

The repository already records background provenance in:

- `docs/THIRD_PARTY_BACKGROUND_ASSETS.md`

The active documented external background assets are currently recorded as **CC0**.

### 2.4 Ship Visual V3

`public/assets/space-typing/ships/player-ships-v3.webp` is the 1024×768 atlas containing **11 distinct generated player-ship sprites** in the canonical CharacterId order.

Known repository facts:

- installed in commit `6756a9430b9130cc2a96fc779d4bde1fde65ce55` (`Ship V3: install premium artwork`);
- current manifest type: `generated`;
- current manifest wording: `Project-original generated asset; review provenance before public distribution`;
- production runtime prefers `V3 → V2 → procedural`.

Historical project records confirm the atlas was prepared/generated/assembled in an assistant-driven workflow before being installed into Git, but the surviving repository/history does **not** currently prove whether the originating image-generation model/tool was ChatGPT/OpenAI, Claude/Anthropic, or another generator. Do not invent that attribution. The provenance task below must recover or document the strongest verifiable source evidence that still exists.

### 2.5 Root project license

There is currently no root `LICENSE` file in `space-typing`.

This does not prevent the owner from running or deploying the project, but before a real public release the repository should explicitly state what rights are or are not granted to third parties.

---

# 3. Four mandatory completion tracks

## Track A — Full deploy-scope asset/license audit

Goal: know exactly what is shipped by the production build and whether every non-original asset has an acceptable provenance/license record.

### A1. Build a machine-readable asset inventory

Create a canonical file such as:

`docs/ASSET_PROVENANCE.json`

Minimum fields per asset:

```json
{
  "id": "asset-id",
  "path": "public/...",
  "category": "music|sfx|background|ship|enemy|boss|icon|font|data|other",
  "sourceType": "project-original|generated|third-party|procedural",
  "creator": "...",
  "sourceUrl": "...",
  "sourceRecord": "...",
  "license": "CC0|MIT|Apache-2.0|project-proprietary|generated-project-original|unknown",
  "commercialUseAllowed": true,
  "redistributionAllowed": true,
  "modificationAllowed": true,
  "attributionRequired": false,
  "attributionText": "...",
  "provenanceStatus": "verified|review-required|blocked",
  "notes": "..."
}
```

### A2. Audit the actual production payload, not just source folders

The audit must compare:

- files under `public/`;
- Vite production output;
- runtime-referenced assets;
- generated atlases;
- fonts, images, music, SFX, data files and any remotely loaded asset;
- assets inherited from the parent `typing-game` integration if the deployed build includes them.

Do not mark the audit complete merely because source documentation exists.

### A3. Classify every discovered asset

Allowed final states:

- `verified` — safe under the recorded terms;
- `review-required` — evidence exists but release approval is incomplete;
- `blocked` — unknown, incompatible, or insufficient rights.

**PUBLIC RELEASE gate:** zero `review-required` and zero `blocked` assets in the production payload.

**TEST RELEASE gate:** zero known-incompatible assets. Review-required generated project assets may remain only if the test deployment is not promoted and a temporary fallback/removal path is documented.

---

## Track B — Resolve Player Ship V2/V3 provenance

This is the most visible current provenance gap.

### B1. V3 identity

Treat `player-ships-v3.webp` as the 11-player-ship image atlas, not generic UI art.

### B2. Recover provenance evidence

Search, in order:

1. Git history and related docs;
2. prior handoff files / asset bundles / source contact sheets;
3. conversation/work records if available;
4. original generated PNG/WebP source files and metadata;
5. any prompt/reference-image records used to create the 11 ships.

Record:

- generator/provider if verifiable;
- date or generation batch if verifiable;
- whether external reference images were supplied;
- whether those references were only stylistic concepts or direct copyrighted inputs;
- whether the provider terms applicable at creation permit the intended distribution/commercial use;
- whether any manual edits/assembly were performed by the project.

### B3. Never guess the generator

If available evidence cannot distinguish ChatGPT/OpenAI from Claude/Anthropic or another tool, record:

`generator: unknown / historical assistant-generated workflow`

and preserve that uncertainty.

### B4. Release outcomes

One of these must be selected before broad public release:

**PASS-A — provenance verified**  
Keep V3 and update the manifest to an approved generated-project-original status.

**PASS-B — regenerate cleanly**  
Generate a new replacement atlas using a currently approved tool/workflow, preserve prompts/source records, review all 11 ships, update hashes, and replace V3 deliberately.

**PASS-C — temporary fallback**  
Exclude V3 from the public production payload/default and use V2 or the procedural ship renderer until V3 provenance is resolved.

For an owner-only test deployment, PASS-C is the safest temporary option if provenance remains unresolved.

### B5. V2

Audit `player-ships-v2.svg` separately. Its current manifest language also says to review before public release, so it must not be silently assumed clean merely because it is older.

---

## Track C — Consolidated third-party notices

Create root-level:

`THIRD_PARTY_NOTICES.md`

It should be generated or synchronized from the canonical provenance data and should include only assets/dependencies actually distributed in the release.

Recommended sections:

1. Audio
2. Background art
3. Libraries/dependencies
4. Fonts
5. Data/content sources
6. Other externally sourced assets

Each entry should contain:

- asset/package name;
- creator/project;
- canonical source;
- license;
- required attribution text, when applicable;
- local distributed path.

CC0 assets can still be listed for provenance even when attribution is not legally required.

Do not rely on scattered docs alone once a real public release begins.

---

## Track D — Root LICENSE / project copyright policy

Before broad public release, create root:

`LICENSE`

Recommended current direction for Space Typing: **project-proprietary / all rights reserved**, unless the owner later deliberately decides to open-source the code.

The root license must clearly separate:

- Space Typing project-original source code and project-original/generated assets;
- third-party components/assets, which remain governed by their own licenses listed in `THIRD_PARTY_NOTICES.md`.

Suggested policy intent:

```text
Copyright (c) 2026 Space Typing project owner.
All rights reserved.

No permission is granted to copy, modify, redistribute, sublicense, sell,
or create derivative commercial distributions of the project-original code
or project-original assets except with explicit permission from the copyright owner.

Third-party components and assets are excluded from this notice and remain
subject to their respective licenses documented in THIRD_PARTY_NOTICES.md.
```

Final wording should be reviewed before use if the project becomes commercial or legally significant.

Do not label the repository MIT/Apache/GPL merely because some bundled assets are CC0. Asset licenses do not automatically determine the application source-code license.

---

# 4. CI / automation solution

After the four tracks above are implemented, add a deterministic audit command, for example:

```bash
pnpm license:audit
```

Recommended implementation:

`scripts/license-audit.mjs`

The audit should fail when:

- a production asset has no provenance record;
- a provenance record references a missing file;
- `license` is empty/unknown for a production third-party asset;
- `provenanceStatus` is `blocked`;
- production mode contains `review-required` assets;
- required attribution text is missing from `THIRD_PARTY_NOTICES.md`;
- generated assets marked release-approved do not carry the expected reviewed hash or equivalent integrity record.

Suggested package scripts:

```json
{
  "license:audit": "node scripts/license-audit.mjs",
  "release:check": "pnpm license:audit && pnpm test && pnpm build"
}
```

Production Cloudflare deployment should eventually depend on `release:check`.

---

# 5. Recommended release states

## State T0 — current planning state

- No root `LICENSE` yet.
- Ship V2/V3 provenance not fully closed.
- Existing audio/background attribution docs are useful but not yet consolidated into a release gate.
- No license CI gate yet.

Result: **not ready to label as a fully cleared public production release**.

## State T1 — owner-only Cloudflare test

Allowed after a small pre-deploy check:

- no known incompatible third-party license;
- no secrets/private data in the client bundle;
- temporary treatment for Ship V3 is explicitly chosen;
- deployment is not promoted/monetized;
- known provenance gaps remain documented as TODOs.

Preferred temporary ship policy if V3 provenance cannot be verified immediately:

- deploy with V3 excluded/disabled from the public payload/default, or
- make V2/procedural art the deployment default until V3 is cleared.

This keeps testing unblocked without converting an unresolved provenance item into an accidental permanent public dependency.

## State R1 — shareable public alpha/beta

Required:

- Track A complete;
- Track B complete;
- Track C complete;
- Track D complete;
- `pnpm license:audit` passes;
- notices included with the deployed build/repository as appropriate.

## State R2 — commercial/marketing release

Everything in R1, plus:

- re-check provider terms for generated assets at release time;
- legal review if revenue, paid accounts, sponsorship, licensing, or company ownership is introduced;
- trademark/name review for the final public product identity;
- privacy/terms review if accounts, analytics, cloud saves, voice, payments, or personal data are enabled.

---

# 6. Implementation order for the future worker

When active feature work is stable, execute in this order:

1. Fetch latest HEAD; do not reset/revert newer work.
2. Inventory the actual deploy payload.
3. Create `docs/ASSET_PROVENANCE.json` from existing manifest/attribution/source docs.
4. Resolve Ship V2/V3 provenance.
5. Decide whether to keep, regenerate, or temporarily disable any unresolved asset.
6. Create `THIRD_PARTY_NOTICES.md`.
7. Create root `LICENSE` using the owner's chosen proprietary/open-source policy.
8. Implement `scripts/license-audit.mjs`.
9. Add `license:audit` and `release:check` scripts.
10. Add CI production gate.
11. Run tests/build/audit and browser smoke test.
12. Only then mark the public-release readiness checkpoint complete.

All steps must be resumable/idempotent and must preserve newer commits from other workers.

---

# 7. Definition of Done

This plan is complete only when all of the following are true:

- [ ] Every distributed asset has a provenance record.
- [ ] Every third-party distributed asset has a verified compatible license.
- [ ] Ship V2 provenance is resolved or it is removed from the release payload.
- [ ] Ship V3 provenance is resolved, regenerated cleanly, or removed from the release payload.
- [ ] Root `LICENSE` exists and reflects the owner's intentional licensing policy.
- [ ] `THIRD_PARTY_NOTICES.md` exists and matches the release payload.
- [ ] Machine-readable provenance is the canonical source of truth.
- [ ] `pnpm license:audit` passes.
- [ ] `pnpm release:check` passes.
- [ ] Cloudflare production deployment is gated by the release check.
- [ ] Test-only deployment and broad public/commercial deployment are clearly distinguished.

Until then, the Cloudflare deployment should be treated as a **test environment**, not as evidence that legal/provenance release readiness has been completed.
