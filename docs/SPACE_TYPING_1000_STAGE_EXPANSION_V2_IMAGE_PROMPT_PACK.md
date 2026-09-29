# SPACE TYPING — 1000 STAGE EXPANSION V2 IMAGE PROMPT PACK

**Project:** `sinhvienaiti/space-typing`  
**Companion source of truth:** `SPACE_TYPING_1000_STAGE_EXPANSION_V2_FINAL.md`  
**Purpose:** Generate only the new source-art assets that materially improve readability, identity, reward presentation and long-term progression for Expansion V2.  
**Primary generator target:** Gemini image generation  
**Critical philosophy:** **REUSE-FIRST.** Do not create a new image simply because a gameplay system has a name.

---

# 0. READ THIS BEFORE GENERATING ANY IMAGE

This file is intentionally strict because previous image-generation workflows can fail in predictable ways:

- multiple requested assets merged into one image;
- collage/contact-sheet output;
- wrong World palette leaking from a previous prompt;
- Nature colors leaking into Cosmic assets or vice versa;
- filenames/labels painted onto the art;
- several variants inside one canvas;
- fake transparency/checkerboard;
- icon art too flat or too “mobile-game sticker” looking;
- source art with a full background when runtime needs alpha;
- photorealistic noise that becomes unreadable at game scale;
- inconsistent lighting/material style between related assets;
- duplicate silhouettes with only recoloring.

The rules below are mandatory.

---

# 1. CRITICAL DELIVERY RULE — ONE FILE PER GENERATION CALL

For **every requested source-art filename**, generate it in a completely separate image-generation call.

## ABSOLUTE RULE

```text
ONE GENERATION CALL
=
ONE REQUESTED FILE
```

Before every generation:

1. scope the generation exclusively to the current filename;
2. ignore every other filename mentioned in this document;
3. ignore previous generated assets except for the shared style principles;
4. do not preview upcoming assets;
5. do not combine sibling assets in the same canvas.

## NEVER DO ANY OF THESE

- collage;
- contact sheet;
- comparison board;
- concept sheet;
- multiple variants in one image;
- storyboard;
- split screen;
- 2×2 / 3×2 / grid;
- front/side/back sheet;
- several icons on one canvas;
- several Worlds in one image;
- filename written on the image;
- category label written on the image;
- explanatory text;
- fake UI screenshot unless the prompt explicitly asks for one;
- watermark;
- signature;
- logo.

If the prompt names several related assets for context, **still render only the current filename**.

---

# 2. CONTEXT-RESET / PALETTE-ISOLATION RULE

This rule is critical.

Before creating every file, mentally reset the visual context.

## DO NOT inherit

- the palette of the previous image;
- the World theme of the previous image;
- the material of the previous icon;
- the background of the previous asset;
- the shape language of an unrelated category.

Example:

```text
If the previous generation was Nature:
DO NOT carry green leaves, moss, vines or warm forest lighting
into a Cosmic / Chrono / Gravity asset.
```

Use **only the palette and subject explicitly stated for the current asset**.

Sibling assets may share rendering quality and visual language, but they must not become recolored copies.

---

# 3. GLOBAL STYLE ANCHOR

The visual target is a **premium cinematic sci-fi/fantasy game**.

Desired qualities:

- polished;
- layered;
- cinematic;
- high material quality;
- rich but controlled lighting;
- subtle fantasy energy;
- believable sci-fi forms;
- strong silhouette;
- readable at small gameplay/UI scale;
- detailed without noisy micro-detail;
- sophisticated glow, not flat neon;
- strong depth;
- no cheap flat-vector look;
- no crude primitive-shape look;
- no generic clip-art style;
- no childish sticker style;
- no overexposed bloom;
- no muddy low-contrast silhouette.

The art may be stylized, but should feel closer to **premium game key-art / polished RPG icon rendering** than to a simple UI glyph.

## Material vocabulary

Depending on the asset:

- dark aerospace metal;
- crystalline energy;
- glass-like temporal layers;
- plasma;
- ionized dust;
- holographic fields;
- arcane-cosmic geometry;
- controlled volumetric glow.

Do not make every object chrome or every effect purple.

---


## 3.1 OPTIONAL STYLE-REFERENCE IMAGE RULE

If a preferred Space Typing reference image is attached to the generation request, use it only as a **style-quality anchor** unless the current asset prompt explicitly says otherwise.

Borrow from the reference:

- rendering polish;
- material richness;
- depth;
- controlled cinematic lighting;
- glow quality;
- edge treatment;
- premium game-art finish.

Do **not** automatically copy from the reference:

- exact composition;
- exact object silhouette;
- exact World palette;
- background;
- pose;
- landmarks;
- enemy/boss identity;
- decorative symbols.

The current filename prompt always wins for **subject, palette, composition and background mode**.

A reference image from another World must never contaminate the current World/category palette. For example, a Nature reference may guide rendering quality but must not inject green foliage, moss, vines or warm forest light into a Cosmic/Chrono/Gravity asset.

Never recreate the reference image as a near-duplicate.

---

# 4. ICON TECHNICAL RULES

Unless a prompt says otherwise:

```text
FORMAT: PNG
CANVAS: square
RECOMMENDED GENERATION SIZE: 1024×1024
BACKGROUND: true transparent alpha
SUBJECT: one centered icon/object only
SAFE MARGIN: about 12–15% around the subject
NO TEXT
NO BORDER FRAME unless explicitly requested
NO DROP-SHADOW RECTANGLE
```

The subject must remain recognizable when reduced to roughly:

```text
64×64
96×96
128×128
```

Use large readable forms first; secondary details second.

Do not place thin critical details near the outer edge.

## Transparency

Transparent means:

- real alpha;
- no white background;
- no black background;
- no checkerboard printed into the image;
- no glow clipped by the canvas edge.

---

# 5. FULL-BLEED ART TECHNICAL RULES

Only assets explicitly marked **FULL-BLEED** may have a complete background.

For full-bleed plates:

```text
FORMAT: PNG
ASPECT: defined by the specific prompt
NO text
NO logo
NO UI
NO watermark
composition must leave gameplay-safe visual zones when requested
```

Do not use full-bleed generation for icons.

---

# 6. READABILITY RULE

These assets support a typing game.

Therefore:

- avoid fake readable words;
- avoid random alphabet characters as decoration;
- avoid high-frequency visual noise around the center;
- avoid dense glows that would compete with target text;
- prefer unmistakable silhouettes and color/value separation;
- visual communication must work without reading a tooltip.

---

# 7. ASSET STATUS LEGEND

Each group is marked as:

### REQUIRED
New source art is recommended because the mechanic needs a readable identity.

### REUSE-FIRST
Runtime should reuse/procedurally render existing art/effects. Generate only the small UI emblem/icon listed here if the UI needs it.

### DEFERRED
Do not generate now. The feature is not yet ready or depends on performance / final implementation.

---


# 7.1 ASSET MANIFEST SUMMARY

The pack contains **58 named source-art prompts** in total.

| Group | Count | Status |
|---|---:|---|
| A — Sector Conditions | 4 | REQUIRED |
| B — Elite / Affix | 9 | REQUIRED |
| C — Typing Patterns | 8 | REQUIRED |
| D — Flow tier emblems | 4 | REUSE-FIRST / generate only if UI needs dedicated emblems |
| E — Relic visual-role templates | 12 | CONDITIONAL; generate only after mapping latest existing relic roster |
| F — Encounter Recipes | 7 | REQUIRED when recipe identity becomes player-facing |
| G — Expedition | 4 | REQUIRED for Phase 4 UI |
| H — Learning / Mastery | 4 | REQUIRED for Phase 5 UI |
| I — Boss Parts | 4 | CONDITIONAL / UI-Test-Lab identity only; boss body art remains reuse-first |
| J — Meta | 2 | OPTIONAL / later |

**Immediate/phase-driven named assets before relic-roster approval:** 36 required across A/B/C/F/G/H.  
**Conditional relic templates:** 12 across E.  
**Conditional/optional named assets:** 10 across D/I/J.

Do not interpret “58 prompts exist” as “generate all 58 immediately.” Follow the implementation phase and the Generation Order section.


# 8. PROPOSED SOURCE-ART STAGING PATH

Until implementation chooses the final runtime folders, use this staging organization:

```text
games/space-typing/art-src/expansion-v2/
  conditions/
  elite/
  typing-patterns/
  flow/
  relics/
  encounter-recipes/
  expedition/
  learning/
  boss-parts/
  meta/
  deferred/
```

This is a **source-art staging convention**, not a requirement to restructure runtime code.

Implementation may later move/copy optimized assets into the existing canonical folders.

---

# 9. GROUP A — SECTOR CONDITION ICONS

**Status:** REQUIRED for briefing / HUD identity.  
**Runtime large-scale effects:** REUSE-FIRST from existing background/VFX systems.

All four are square transparent icons.

---

## A01 — `sector-solar-storm.png`

Generate exactly one file: `sector-solar-storm.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium cinematic sci-fi icon representing a **Solar Storm**.

Subject:

- a compact blazing stellar core;
- one sweeping solar flare curling around it;
- several controlled ion arcs;
- energized plasma particles contained close to the subject.

Palette:

- solar gold;
- hot amber;
- controlled white-hot core;
- tiny accents of deep red-orange.

Silhouette:

- mostly circular stellar mass;
- one asymmetrical flare makes it immediately distinct.

Mood:

- dangerous;
- energetic;
- majestic;
- high-tech fantasy space.

Do not include:

- planets;
- spaceships;
- text;
- lightning shaped like ordinary Earth thunder;
- green/forest colors;
- a full space background.

Background must be true transparent alpha.

The icon must still read clearly at 64–96 px.

---

## A02 — `sector-meteor-shower.png`

Generate exactly one file: `sector-meteor-shower.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium cinematic sci-fi icon representing a **Meteor Shower**.

Subject:

- three to five distinct meteor fragments moving in the same diagonal direction;
- one dominant meteor;
- smaller trailing fragments;
- elegant incandescent trails;
- visible rocky/mineral surface on the dominant meteor.

Palette:

- dark stone;
- ember orange;
- pale gold;
- subtle blue-white edge heat.

Composition:

- diagonal directional motion;
- compact enough for a square icon;
- no meteor touches the canvas edge.

Do not include:

- a planet;
- a landscape;
- a spaceship;
- readable letters;
- a full sky/background;
- random unrelated debris.

Transparent background.

---

## A03 — `sector-gravity-well.png`

Generate exactly one file: `sector-gravity-well.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium sci-fi/fantasy icon representing a **Gravity Well**.

Subject:

- a dark compact singularity at center;
- one elegant luminous accretion ring;
- subtle warped light arcs;
- a few tiny debris fragments visibly curving inward.

Palette:

- near-black singularity;
- electric blue;
- violet-blue;
- controlled pale cyan highlights.

Shape:

- circular gravitational center;
- asymmetric curved debris path to imply pull.

Do not include:

- a full galaxy background;
- large planet;
- text;
- human eye imagery;
- green Nature palette.

Transparent background.

The result must feel like a gameplay mechanic icon, not an astronomy photograph.

---

## A04 — `sector-time-fracture.png`

Generate exactly one file: `sector-time-fracture.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium cinematic icon representing **Time Fracture**.

Subject:

- a circular temporal field split into offset translucent layers;
- one fractured ring;
- a few echo-afterimages;
- subtle clockwork geometry without a literal readable clock face.

Palette:

- cool cyan;
- spectral blue;
- restrained violet;
- small white energy highlights.

Visual idea:

- part of the ring appears delayed or displaced in time.

Do not include:

- numbers;
- clock text;
- readable letters;
- giant hourglass;
- multiple separate icons.

Transparent background.

---

# 10. GROUP B — ELITE VARIANT / AFFIX ICONS

**Status:** REQUIRED.  
These are compact identity icons for briefing, Codex, debug/Test Lab and optional HUD use.  
Combat aura/rings may still be procedural.

All files: square, transparent, one emblem only.

---

## B01 — `elite-swift.png`


Generate exactly one file: `elite-swift.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Swift elite** emblem. Build the subject around a compact dark aerospace-metal enemy core with a sharply tapered aerodynamic chevron wrapping forward around it, plus one restrained motion streak that implies fast approach speed. Use cool blue-white energy with a narrow cyan highlight; keep the metal darker so the speed cue reads instantly. The silhouette should feel narrow, directional and agile rather than powerful or defensive. Avoid wings, feathers, arrows, readable symbols, a whole spaceship, or a generic “speedometer” icon. Keep all motion trails short enough to remain legible at 64–96 px.

## B02 — `elite-armored.png`


Generate exactly one file: `elite-armored.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Armored elite** emblem. Use a compact luminous core enclosed by two or three heavy interlocking hexagonal armor plates, with visible thickness, beveled aerospace-metal edges and small cyan seam lights between plates. Palette: gunmetal, steel blue and pale cyan; the center may glow softly but must not overpower the armor mass. The silhouette should look dense, broad and difficult to penetrate. Avoid a medieval shield shape, castle imagery, text, spikes that imply Berserker, or a flat hexagon logo. The icon must communicate layered physical protection at a glance.

## B03 — `elite-frenzy.png`


Generate exactly one file: `elite-frenzy.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Frenzy elite** emblem. Show one unstable dark-metal enemy core under rapidly escalating internal pressure, with three asymmetrical pulse spikes and short hot energy vents bursting outward. Palette: deep red, ember orange, controlled magenta accents and a small white-hot center. The shape should look agitated and accelerating, but still contained enough to read as one object. Avoid gore, faces, horns, demonic imagery, a giant explosion, or random lightning filling the canvas. The identity is “escalating aggression,” not “already detonating.”

## B04 — `elite-volatile.png`


Generate exactly one file: `elite-volatile.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Volatile elite** emblem. Depict a contained reactor-like core whose dark casing is visibly fractured by several bright internal cracks; add only a few small floating fragments and a tight pressure halo. Palette: dark graphite metal, amber-orange fractures and a white-yellow internal core. The silhouette should remain compact and round/technical, communicating dangerous stored energy that may burst on death. Avoid a full explosion cloud, fireball background, mushroom-cloud imagery, text, skulls or excessive debris. The state should look unstable but still intact.

## B05 — `affix-chrono.png`


Generate exactly one file: `affix-chrono.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Chrono affix** emblem. Use one compact enemy-core silhouette enclosed by an offset temporal ring, with two faint afterimage echoes displaced slightly backward along one direction. Palette: cyan, spectral blue and restrained violet over dark metal. Add subtle segmented time-wave arcs, but no literal clock face, numbers or hourglass. The composition should communicate that the unit changes speed when the player stops typing: the main core is crisp while the echoes suggest time slipping forward. Keep the echoes close enough that the icon remains one unmistakable subject.

## B06 — `affix-guardian.png`


Generate exactly one file: `affix-guardian.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Guardian affix** emblem. Place one central protective energy node inside a compact dark-metal emitter, projecting two short symmetric shield arcs outward toward small abstract ally-link points. Palette: luminous blue, pale cyan and dark gunmetal with a calm white core. The silhouette must communicate “protects nearby allies,” not merely “has personal armor.” Use visible connection energy between the center and side protection arcs. Avoid a medieval shield, castle crest, wings, text, or a large full bubble that could be confused with the Armored elite.

## B07 — `affix-berserker.png`


Generate exactly one file: `affix-berserker.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Berserker affix** emblem. Show a dense enemy core with layered inward compression rings transforming into a sharp outward red-orange surge, implying danger increasing as the unit gets closer. Palette: crimson, ember orange, very restrained white-hot tips and dark metal. The silhouette should feel forward-pressing and predatory without using a face or creature anatomy. Avoid horns, skulls, gore, demonic motifs, a generic flame icon or a full-screen explosion. Keep the effect focused around one compact subject.

## B08 — `affix-phase.png`


Generate exactly one file: `affix-phase.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Phase affix** emblem. Depict one compact enemy core in two partially overlapping spatial states: a sharp primary body and one offset translucent phase echo, connected by a thin spectral displacement seam. Palette: indigo, cyan and spectral violet with dark-metal anchors. The two states must clearly belong to the same unit rather than looking like two requested icons. Use a slight sideways displacement to suggest lane/position shifting. Avoid portals large enough to dominate the icon, duplicate full enemies, text, mirror imagery or motion blur that destroys the silhouette.

## B09 — `affix-anchored.png`


Generate exactly one file: `affix-anchored.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Anchored affix** emblem. Build a dense stabilization core with a heavy circular locking ring and four short mechanical stabilizer fins/braces positioned around it. Palette: dark steel, desaturated teal and pale cyan locking lights. The center should feel low, heavy and immovable, with tiny inward stabilizing energy lines rather than explosive motion. Avoid nautical anchors, chains, ship anchors, medieval motifs or gravity-well imagery. The visual message is resistance to pull/stun and positional control, achieved through futuristic stabilization hardware.

### Shared B-group rules

For every B asset:

- one emblem only;
- transparent background;
- no labels;
- no border;
- no recolored duplicate;
- silhouette must be unique;
- make each icon readable at 64 px;
- do not inherit the palette of the previous generated B asset unless specified above.

---

# 11. GROUP C — TYPING PATTERN ICONS

**Status:** REQUIRED for Test Lab / briefing / Codex-style explanation.  
These icons must communicate typing structure without placing readable English text in the art.

Use abstract luminous “token bars”, key pulses and slot structures.

---

## C01 — `typing-normal-word.png`


Generate exactly one file: `typing-normal-word.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create an abstract **Normal Word typing-pattern** emblem without any readable characters. Use one balanced horizontal luminous token bar made from five to seven clean segmented blocks, with a single subtle cursor/start pulse at the leading edge. Palette: neutral blue-white with a restrained cyan rim. The composition should be calm, centered and evenly weighted, representing the baseline “one normal word” interaction. Avoid keyboard keys, alphabet letters, text, quotation marks, sentence lines, or dramatic combat effects. It must read clearly as the neutral reference pattern beside the more specialized pattern icons.

## C02 — `typing-short-burst.png`


Generate exactly one file: `typing-short-burst.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create an abstract **Short Burst typing-pattern** emblem without letters. Use three compact luminous input pulses or very short segmented token bars in rapid forward succession, with tight spacing and a small directional energy trail. Palette: bright cyan-white with one restrained gold accent to emphasize speed. The silhouette should feel quick, clipped and rhythmic rather than long or heavy. Avoid literal keyboard keycaps, letters, bullets, arrows, or a long continuous word bar. The pattern must remain obviously different from Normal Word when displayed at small UI scale.

## C03 — `typing-long-word.png`


Generate exactly one file: `typing-long-word.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create an abstract **Long Word typing-pattern** emblem. Use one clearly extended segmented token beam, substantially longer than the Normal Word icon, with many readable segments feeding into a heavy charged endpoint. Palette: deep blue and cyan with a controlled warm-gold charge at the terminal end. The visual weight should build from left to right, communicating greater commitment and payoff for a long word. Avoid readable letters, a sentence made of several lines, a literal laser weapon, or multiple separate targets. Keep the long horizontal silhouette compact enough for the square canvas.

## C04 — `typing-phrase.png`


Generate exactly one file: `typing-phrase.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create an abstract **Phrase typing-pattern** emblem. Show two distinct short segmented token bars separated by a visible small gap and joined by one elegant luminous connector, so the viewer reads “two-part expression” without seeing any letters. Palette: violet-blue with pale cyan highlights and a neutral white connector. Keep both bars visually balanced but not identical in length. Avoid quotation marks, readable text, speech bubbles, sentence punctuation or three-plus lines. The icon should communicate a short collocation/phrase, not a full sentence.

## C05 — `typing-shared-target.png`


Generate exactly one file: `typing-shared-target.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create an abstract **Shared Target typing-pattern** emblem. Place one clear central segmented token bar at the top/center and project three synchronized energy links from it toward three small target nodes arranged beneath or around it. The single token bar must remain the dominant source, communicating “type once, affect the linked formation.” Palette: cyan-white source with three restrained blue/gold linked nodes. Avoid three separate text bars, readable letters, generic network diagrams or a crowded swarm. The connection geometry should stay clear at 64–96 px.

## C06 — `typing-chain.png`


Generate exactly one file: `typing-chain.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create an abstract **Chain typing-pattern** emblem. Arrange three short segmented token bars along one smooth curved path; energy from the endpoint of the first should visibly feed the start of the second, then the third. Use a controlled cyan-to-violet progression along the chain with a small white linking pulse at each handoff. Avoid readable letters, literal chain links, arrows, a circular repeat icon or disconnected bars. The visual should clearly communicate sequential typing where one completion flows into the next.

## C07 — `typing-recall-word.png`


Generate exactly one file: `typing-recall-word.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create an abstract **Recall Word typing-pattern** emblem. Show one segmented token bar emerging from a soft circular memory halo: one or two segments are bright/revealed while the remaining positions are dim ghost slots, suggesting reconstruction from memory. Palette: calm cyan, lavender-violet and soft white. Do not use square crossword tiles, alphabet letters, question marks, brains or book icons. The hidden/revealed distinction must remain readable without making the subject look broken or corrupted. Keep the mood thoughtful rather than threatening.

## C08 — `typing-boss-sentence.png`


Generate exactly one file: `typing-boss-sentence.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create an abstract **Boss Sentence typing-pattern** emblem. Use three compact horizontal token lines of different lengths that visually converge toward one imposing boss-core target marker, creating a cinematic sense of a longer multi-word challenge. Palette: cool blue/cyan token lines, a restrained red-gold boss target and white focus highlights. Avoid readable sentences, punctuation-heavy text, paragraphs, UI frames or a whole boss sprite. The icon should feel rare and climactic while remaining structurally clear at small size.

# 12. GROUP D — FLOW TIER EMBLEMS

**Status:** REUSE-FIRST.  
Combat aura/trails should be procedural/existing.  
Generate these only for UI/Codex/briefing if needed.

---

## D01 — `flow-normal.png`


Generate exactly one file: `flow-normal.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Flow: Normal** tier emblem. Use one clean, stable circular energy ring around a small calm core, with minimal secondary particles and no directional aggression. Palette: cool blue-white with very low-intensity cyan edge light. The ring should feel balanced, quiet and controlled, establishing the visual baseline for higher Flow tiers. Avoid wings, spikes, flames, lightning, text, numbers or excessive bloom. This is the least intense tier, so preserve generous negative space and a simple silhouette.

## D02 — `flow-focus.png`


Generate exactly one file: `flow-focus.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Flow: Focus** tier emblem. Build a tight luminous circular ring around a compact core and add one aerodynamic forward energy crest, as if the player’s attention has compressed the energy into a deliberate direction. Palette: cyan with restrained gold focus highlights and a white central pulse. The silhouette should be more purposeful than Normal but still disciplined. Avoid multiple wings, large explosions, text, a target crosshair or a generic speed icon. Keep the center clean and readable.

## D03 — `flow-flow.png`


Generate exactly one file: `flow-flow.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Flow: Flow** tier emblem. Use two balanced spiral/wing-like energy arcs orbiting a bright stable center, forming a smooth continuous rhythm rather than sharp aggression. Palette: blue-violet with pale cyan core light and a small white highlight. The arcs should suggest sustained effortless motion and synchrony. Avoid literal angel wings, bird feathers, text, overcomplicated mandalas or too many particles. The silhouette must clearly step up from Focus while remaining elegant and controlled.

## D04 — `flow-hyper.png`


Generate exactly one file: `flow-hyper.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Flow: Hyper** tier emblem. Build a bright central pulse surrounded by four compact outward energy fins and a tighter secondary ring, giving the icon unmistakable high-intensity symmetry. Palette: white-cyan core, cool electric blue and restrained violet edges. It should look powerful and fast without filling the canvas with noise. Avoid a full explosion, giant bloom, text, lightning storm or details that would hide the central shape. Preserve a clear 12–15% margin and readable silhouette.

# 13. GROUP E — PHASE 2 BUILD RELIC ART TEMPLATES

**Status:** CONDITIONAL — finalize the Phase 2 relic roster against the latest code **before generating this group**.

The V2 design target is roughly **12 total playable relics**, including existing relics that remain in the game. It is **not** an instruction to invent 12 brand-new mechanics.

Before generating any E-group file:

1. inspect the latest `relics/registry.ts` (or current equivalent);
2. list every existing relic that will remain;
3. map each retained relic into Precision / Combo / Long Word / Recall only if the behavior genuinely fits;
4. determine which roster gaps require new relics;
5. create a final mapping table:

```text
code relic ID
→ player-facing name
→ build family
→ canonical art filename
→ E-group visual template or custom prompt
```

6. generate only the rows approved by that mapping.

The E01–E12 prompts below are **visual-role templates**, not automatic permission to add 12 new relics or to rename existing relics. If an existing relic maps to one of these roles, keep the existing code/player identity and adapt the art filename to the project’s canonical naming rule.

Known existing examples from the reviewed code include `Storm Script`, `Frost Rhythm`, `Giant Word Lens`, and `Mirror Vow`; do not silently replace those identities with invented duplicates.

The exact gameplay numbers belong in code, not in the image.  
Each generated relic must have a distinct object silhouette, not merely a colored gem.

## Precision family

### E01 — `relic-precision-lens.png`


Generate exactly one file: `relic-precision-lens.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **precision/focusing role**. The object is a compact high-tech optical lens mounted in a dark aerospace-metal cradle, with a narrow cyan beam entering one side and converging sharply through the center. Use crisp glass/refraction surfaces, small mechanical adjustment points and restrained gold micro-accents. The silhouette should feel surgical, exact and lightweight. Avoid a camera lens, sniper scope, readable reticle, eye motif or generic gem. This is a visual-role template; the final code relic identity and canonical filename must come from the approved roster mapping.

### E02 — `relic-perfect-capacitor.png`


Generate exactly one file: `relic-perfect-capacitor.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **perfect-input energy capacitor role**. Use two symmetric dark-metal capacitor plates holding a perfectly stable white-blue energy sphere between them, with clean containment arcs and almost no chaotic sparks. Palette: gunmetal, icy blue, white core and tiny gold precision marks. The silhouette should communicate stored reward for flawless execution: balanced, exact and stable. Avoid batteries, lightning bolts, text, numbers or a generic orb. Treat this only as a visual-role template until mapped to an approved code relic.

### E03 — `relic-crystal-focus.png`


Generate exactly one file: `relic-crystal-focus.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **precision crystal/focus role**. Build a faceted translucent crystal prism inside a compact aerospace mounting frame; one thin cyan-gold energy line should enter, refract cleanly through the prism and emerge more concentrated. Use realistic glass depth and controlled internal caustic-like glow without rainbow overload. Silhouette: angular but refined. Avoid a loose fantasy gemstone, rainbow spectrum, magical wand, text or a background pedestal. Final name/filename must follow the approved relic roster mapping.

## Combo family

### E04 — `relic-combo-coil.png`


Generate exactly one file: `relic-combo-coil.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **combo continuity role**. Use a compact dual electromagnetic coil connected by one continuous circular current loop, emphasizing uninterrupted motion. Dark metal housings should anchor each coil while blue-violet energy travels cleanly around the loop; add one white pulse showing active circulation. The silhouette should feel cyclical and sustained rather than explosive. Avoid literal chain links, infinity-symbol text, lightning chaos or a generic ring. This is a visual-role template pending mapping to a real relic ID.

### E05 — `relic-streak-reactor.png`


Generate exactly one file: `relic-streak-reactor.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **streak-escalation reactor role**. Show a small dark-metal reactor core with three stacked energy bands rising in intensity from bottom to top, as if sustained correct typing progressively charges it. Palette: cyan core, cool blue lower bands and restrained gold upper-band accents. The silhouette should imply controlled escalation and accumulated momentum. Avoid numeric counters, progress bars, text, flames or a huge reactor scene. Final relic identity must be determined by the Phase 2 roster mapping.

### E06 — `relic-arc-conductor.png`


Generate exactly one file: `relic-arc-conductor.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for an **arc/conduction combo role**. Use a three-prong dark-metal conductor receiving one bright central energy input and splitting it into three clean controlled electric branches. Palette: purple-blue electrical energy, pale cyan core and dark gunmetal structure. Keep the arcs short, thick and legible rather than noisy. Avoid a lightning-storm background, trident weapon, tree branches, text or random sparks. This is a visual-role template and must not create a new mechanic unless the approved relic roster needs it.

## Long Word family

### E07 — `relic-heavy-core.png`


Generate exactly one file: `relic-heavy-core.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **heavy long-word payoff role**. Build a dense oversized micro-reactor with thick reinforced casing, broad mechanical shoulders and a compressed golden-white core. Palette: gunmetal, deep navy metal, warm white/gold center and restrained cyan status lights. The silhouette should feel heavy, deliberate and high-impact, clearly different from precision-family objects. Avoid a bomb, ammunition shell, text, hazard labels or a full engine. Generate only if mapped to an approved relic in the final roster.

### E08 — `relic-syllable-forge.png`


Generate exactly one file: `relic-syllable-forge.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **word-forging / accumulated-length role**. Show several small segmented luminous plates entering a compact futuristic fusion device and merging into one stronger glowing projectile/core at the output. Use dark aerospace metal, cyan input segments and a warm gold-white fused output. The composition should communicate “more segments become one powerful result.” Avoid a medieval anvil, blacksmith hammer, literal letters, text or factory scenery. This remains a visual-role template until roster mapping is approved.

### E09 — `relic-titan-lens.png`


Generate exactly one file: `relic-titan-lens.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **titan-scale long-word focusing role**. Build a thick industrial focusing lens with a reinforced outer ring, broad mechanical braces, a deep aperture and one massive compressed energy channel through the center. Palette: dark gunmetal, deep cyan energy and restrained warm-gold charge accents. The silhouette must feel siege-grade and weighty rather than delicate or surgical. Avoid a camera lens, telescope scene, crosshair, text or generic gemstone. Use only after mapping to an approved code relic.

## Recall family

### E10 — `relic-echo-core.png`


Generate exactly one file: `relic-echo-core.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **Recall echo role**. Use a small luminous memory seed at the center with two concentric translucent echo shells offset subtly in depth, suggesting a thought being recovered through repeated recall. Palette: calm cyan, soft violet and pale white; use dark minimal mechanical supports only if needed. The mood should be psychic/mnemonic rather than electrical. Avoid brains, eyes, ghosts, alphabet letters, text or chaotic lightning. Final identity must come from the approved relic roster.

### E11 — `relic-memory-orbit.png`


Generate exactly one file: `relic-memory-orbit.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **memory-orbit / Recall accumulation role**. Place one faceted memory crystal at center and three small luminous data fragments on elegant orbital arcs around it, each fragment clearly abstract and free of letters/numbers. Palette: pale cyan crystal, lavender energy and restrained gold focus highlights. The silhouette should communicate pieces of memory returning to a stable center. Avoid planets, solar-system imagery, brains, books or text. Generate only when mapped to a retained/new approved relic.

### E12 — `relic-mnemonic-prism.png`


Generate exactly one file: `relic-mnemonic-prism.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium relic visual for a **mnemonic reconstruction role**. Use a translucent prism or crystalline device containing several faint offset ghost-images of the same inner light, progressively aligning toward one sharp central focus point. Palette: pale cyan, lavender-violet and a tiny gold focal accent. The object should feel like memory layers resolving into clarity. Avoid literal words, puzzle pieces, brains, photographs or a generic gemstone. This is a visual-role template; roster mapping controls whether it is actually generated.

### Shared relic rules

- transparent background;
- no pedestal/background scene;
- one object;
- no UI card frame;
- no text;
- no Roman numerals;
- family resemblance through material quality, not identical shape.

---

# 14. GROUP F — ENCOUNTER RECIPE ICONS

**Status:** REQUIRED once Encounter Recipe reaches player-facing briefing/Test Lab.

These icons represent encounter composition, not specific Worlds.

---

## F01 — `recipe-swarm-assault.png`


Generate exactly one file: `recipe-swarm-assault.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Swarm Assault Encounter Recipe** emblem. Place one compact forward assault marker at center-front and surround it with five to seven smaller coordinated enemy-node silhouettes moving in the same direction, using layered depth to imply numbers without clutter. Palette: energetic red-orange threat accents against cool cyan coordination lights and dark-metal cores. The silhouette should immediately read as “many weak attackers arriving together.” Avoid insects, literal arrows, a full battle scene, text or dozens of tiny unreadable dots.

## F02 — `recipe-sniper-ambush.png`


Generate exactly one file: `recipe-sniper-ambush.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Sniper Ambush Encounter Recipe** emblem. Use one distant precision target node aligned through a long narrow luminous targeting corridor, with two small dim flank markers partially offset to suggest concealed support. Palette: cool blue/cyan geometry with one sharp warm-gold focus point. The composition should be sparse, tense and long-range. Avoid literal rifle scopes, guns, crosshair text, a human sniper, readable numbers or crowded enemies. Maintain strong negative space so it contrasts clearly with Swarm Assault.

## F03 — `recipe-fortress-siege.png`


Generate exactly one file: `recipe-fortress-siege.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Fortress Siege Encounter Recipe** emblem. Build one dense central armored structure/core protected by two layered defensive arcs and flanked by two smaller support nodes. Palette: gunmetal, steel blue, pale cyan defense light and restrained gold impact accents. The silhouette must feel entrenched, broad and difficult to break. Avoid medieval castles, brick walls, shields with crests, text or a full battlefield. Keep the composition compact enough to remain readable as a recipe icon.

## F04 — `recipe-escort-break.png`


Generate exactly one file: `recipe-escort-break.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Escort Break Encounter Recipe** emblem. Show one protected central transport/core moving along a clear direction, with two escort nodes maintaining a protective formation and one opposing attack vector visibly breaking into the formation. Palette: cool cyan/blue for the protected formation and controlled orange-gold for the breakthrough cue. Avoid literal arrows as flat UI symbols, whole spaceships with tiny detail, text or a busy battle scene. The key message is “break the escort structure.”

## F05 — `recipe-elite-hunt.png`


Generate exactly one file: `recipe-elite-hunt.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Elite Hunt Encounter Recipe** emblem. Make one prominent elite-core target the dominant subject, surrounded at a distance by several dim ordinary target nodes and a subtle incomplete hunter-lock ring. Palette: rich violet and warm gold on the elite, with cool desaturated blue for background nodes. The silhouette should communicate identifying and pursuing one dangerous target. Avoid skulls, animal hunting imagery, literal crosshair UI, text, trophies or a whole character portrait.

## F06 — `recipe-recall-rupture.png`


Generate exactly one file: `recipe-recall-rupture.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Recall Rupture Encounter Recipe** emblem. Use a fractured but elegant memory halo around a partially reconstructed segmented token, with two or three echo fragments being pulled back toward the central structure. Palette: cyan, soft violet and pale white with a restrained dark core. The visual should suggest Recall mechanics under pressure, not corrupted unreadable text. Avoid letters, question marks, brains, broken-glass chaos, horror imagery or a full UI panel.

## F07 — `recipe-boss-prelude.png`


Generate exactly one file: `recipe-boss-prelude.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Boss Prelude Encounter Recipe** emblem. Place a large dark boss-core silhouette looming in the upper/back portion of the icon while three smaller combat nodes and converging energy paths occupy the foreground, creating anticipation before the main boss arrival. Palette: restrained red-gold threat light on the boss with cool blue/cyan foreground systems. Avoid a full specific boss portrait, readable text, giant explosions or a completed boss fight scene. The icon should feel ominous and preparatory.

# 15. GROUP G — EXPEDITION ICONS

**Status:** REQUIRED for Phase 4 UI identity.

---

## G01 — `expedition-emblem.png`


Generate exactly one file: `expedition-emblem.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Expedition** mode emblem. Show one small stylized spacecraft/trajectory marker following an elegant curved route through three distinct orbital waypoint nodes toward a brighter distant destination core. Use dark aerospace-metal accents, cool cyan route energy and restrained gold at the destination. The composition should communicate a finite multi-encounter journey and discovery. Avoid map text, compass letters, planet labels, a shield badge frame or a full background scene. The route and destination must remain legible at 64–96 px.

## G02 — `expedition-daily-seed.png`


Generate exactly one file: `expedition-daily-seed.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Daily Seed** Expedition emblem. Use one faceted crystalline configuration core surrounded by a precise fixed orbital pattern of several repeated markers, communicating that the same deterministic setup is shared for the day. Palette: cyan crystal, pale violet orbit lines and restrained warm-gold anchor points. Avoid plant seeds, leaves, calendars, dates, numbers, dice, text or random chaotic particles. The geometry should feel reproducible and locked rather than random.

## G03 — `expedition-score-medal.png`


Generate exactly one file: `expedition-score-medal.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Expedition Score Medal** icon. Build a futuristic layered metal-and-energy award device with a strong central luminous core, two short structural fins and subtle concentric scoring bands. Palette: dark titanium, pale cyan and controlled gold-white prestige highlights. It should look valuable and game-specific without copying real military, national or sports medals. Avoid stars-and-stripes insignia, text, numbers, ribbons with writing, crowns or a flat trophy glyph. Keep the silhouette compact and premium.

## G04 — `expedition-reroll-chip.png`


Generate exactly one file: `expedition-reroll-chip.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Expedition Reroll Chip** icon. Depict a compact holographic navigation/data chip with two curved luminous route paths that diverge and reconnect around a central processor core, conveying rerouting without using flat UI arrows. Palette: cool cyan/blue circuitry with one violet alternate-path accent and restrained gold contacts. Avoid text, dice, recycling logos, literal circular arrows, currency symbols or a rectangular UI card background. The object should remain one physical/holographic device.

# 16. GROUP H — LEARNING / MASTERY ICONS

**Status:** REQUIRED for Phase 5 if those UI elements are implemented.

---

## H01 — `learning-wanted-word.png`


Generate exactly one file: `learning-wanted-word.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Wanted Word** learning emblem. Use one abstract luminous vocabulary-token core inside a sci-fi tracking bracket / bounty-lock system, with a compact amber-gold acquisition pulse around a cool cyan center. The icon should communicate “this learning target is being actively tracked for another encounter,” not criminal punishment. Avoid readable words, Western wanted posters, skulls, red danger stamps, crosshair violence or shame imagery. Keep the tone motivating, game-like and precise.

## H02 — `learning-mastery-star.png`


Generate exactly one file: `learning-mastery-star.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Mastery Star** learning icon. Build one refined crystalline star/node with a calm luminous core and subtle geometric facets, designed to appear as a single lit point in a larger mastery constellation. Palette: pale gold, soft cyan and white with restrained glass depth. The silhouette should feel earned, elegant and collectible rather than childish. Avoid cartoon stars, smiley faces, text, medals, crowns or excessive rays. Preserve clean negative space for use in a constellation UI.

## H03 — `learning-lexicon-boss.png`


Generate exactly one file: `learning-lexicon-boss.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Lexicon Boss** learning emblem. Construct an imposing central crystalline intelligence/core into which several abstract segmented token streams converge, suggesting that many learned/weak words are being combined into one boss-level challenge. Palette: violet, cyan and controlled gold-white power with dark metallic framing. The subject should feel boss-grade and intelligent without showing readable letters. Avoid books, dictionaries, brains, eyes, humanoid faces, text or a whole boss battle background.

## H04 — `learning-review-token.png`


Generate exactly one file: `learning-review-token.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Review Token** learning icon. Use one compact faceted memory crystal surrounded by a clean looping orbital path with a single returning pulse, communicating “revisit this later” and spaced review. Palette: calm cyan, soft lavender and a restrained gold return marker. Avoid calendars, clocks with numbers, circular-arrow UI glyphs, text, alphabet letters or plant imagery. Keep the object gentle and non-threatening; this is a learning reminder, not a penalty marker.

# 17. GROUP I — UNIVERSAL BOSS-PART ICONS

**Status:** REUSE-FIRST / REQUIRED only for boss targeting UI and Test Lab.  
Boss body art itself should reuse current boss source art unless a later implementation proves new overlay art is necessary.

---

## I01 — `boss-part-engine.png`


Generate exactly one file: `boss-part-engine.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium universal **Boss Engine Part** icon for targeting/Test Lab UI. Show a compact futuristic propulsion module with two clearly defined exhaust chambers, reinforced dark-metal housings and one central drive core emitting contained cyan-blue energy. Use a readable three-quarter technical silhouette without showing an entire ship or boss. Avoid wings, full engines attached to a hull, text, part numbers, warning labels or a background. The icon must look like a detachable functional component rather than loot.

## I02 — `boss-part-core.png`


Generate exactly one file: `boss-part-core.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium universal **Boss Core Part** icon. Depict one exposed high-energy reactor core surrounded by layered containment rings, structural braces and a bright central energy source. Palette: dark metal, deep red/burgundy outer structure, gold-white center and subtle cool status lights. The silhouette should clearly communicate “vital internal core.” Avoid hearts, gemstones, loot rarity framing, text, bio-organic organs or a full boss torso. Keep the component mechanical and targetable.

## I03 — `boss-part-cannon.png`


Generate exactly one file: `boss-part-cannon.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium universal **Boss Cannon Part** icon. Show one heavy futuristic cannon-module assembly in a clear three-quarter angle, with a single dominant barrel, reinforced recoil housing and a controlled red-orange charge line running toward the muzzle. Palette: dark gunmetal with restrained warm charge light and cool technical accents. Avoid a whole boss, handheld gun, real-world firearm details, ammunition, text, muzzle explosion or loot framing. The object should read as a detachable boss weapon component.

## I04 — `boss-part-shield.png`


Generate exactly one file: `boss-part-shield.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium universal **Boss Shield Part** icon. Build a compact shield-generator emitter device with dark-metal coils/projectors and a partial translucent hexagonal energy field visibly being projected from the hardware. Palette: cyan-blue field, pale white highlights and dark gunmetal emitter. It must read as the *generator component*, not a generic shield badge. Avoid medieval shields, crests, text, full bubble backgrounds, loot rarity framing or a whole boss. Keep the projected field partial so the hardware remains recognizable.

# 18. GROUP J — OPTIONAL META ICONS

**Status:** OPTIONAL / later.

## J01 — `meta-nemesis.png`


Generate exactly one file: `meta-nemesis.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Nemesis** meta emblem. Use one sharp elite enemy-core silhouette marked by a persistent diagonal scar-like energy seam and a small incomplete return-orbit motif indicating that this rival comes back stronger. Palette: crimson, deep violet, dark metal and a restrained pale highlight. The identity should feel personal, dangerous and recurring. Avoid skulls, blood, human faces, text, rank badges or a whole enemy portrait. Keep the scar symbolic and energetic rather than biological.

## J02 — `meta-personal-ghost.png`


Generate exactly one file: `meta-personal-ghost.png`.

Standalone output contract for this file:
- render ONLY this filename and ONLY one asset;
- square 1024×1024 PNG source art;
- true transparent alpha background;
- one centered subject, roughly 12–15% safe margin;
- no collage, no grid, no second variant, no preview panel;
- no text, filename, labels, numbers, watermark or logo;
- no fake checkerboard transparency and no background scene;
- preserve glow inside the canvas; do not crop critical silhouette;
- strong silhouette readable at approximately 64–96 px;
- reset palette/context from previous generations; use only this prompt's palette and subject;
- premium cinematic sci-fi/fantasy game-art finish, not flat clip-art or mobile-sticker styling.

Create a premium **Personal Ghost** meta emblem. Show one translucent stylized player-ship echo silhouette with a clean delayed trail and a small timing pulse offset behind it, communicating a replay of the player’s previous best timing. Palette: cool cyan, pale white and subtle blue transparency. It must feel like a performance echo, not horror. Avoid sheet-ghost imagery, faces, text, clocks with numbers, a full race scene or a solid second ship that could be mistaken for an active unit.

# 19. WHAT MUST NOT BE GENERATED YET

The following should remain **DEFERRED** until implementation reaches the corresponding phase.

## 19.1 Full cinematic plates

Do not create new:

- exploding planets;
- giant fleet-war plates;
- black-hole full-screen scenes;
- World-specific cinematic backgrounds;
- destruction debris sheets;

until:

1. background performance issues are fixed;
2. the first cinematic sequence layout is implemented;
3. exact aspect ratios and safe areas are known.

Otherwise the art may not fit the renderer.

## 19.2 Boss-specific detachable part sprites

Do not generate boss-specific engine/core/cannon overlays before the reference boss implementation establishes:

- actual anchor points;
- scale;
- perspective;
- boss sprite dimensions;
- whether parts need separate painted source art or can use procedural overlays.

## 19.3 Additional 24+ relic icons

Generate only the initial 12-core set first.

Do not generate future content before the build system is validated.

## 19.4 Word-category build icons

Hold until vocabulary metadata is audited.

---

# 20. DEFERRED CINEMATIC PROMPT TEMPLATES

These templates are intentionally **not ready for immediate generation**. They are preserved so the future art phase has a safe starting point.

## Template — World-specific planet destruction plate

Only use after implementation supplies:

```text
WORLD:
PALETTE:
ASPECT RATIO:
CAMERA:
SAFE TEXT ZONE:
PLANET POSITION:
LIGHT DIRECTION:
STAGE OF DESTRUCTION:
```

Prompt intent:

Create one premium cinematic full-bleed background plate showing a single planet at the specified destruction stage. Maintain the exact World palette. Leave the specified gameplay-safe zone visually calm. No text, no UI, no ships unless explicitly requested. Do not inherit palette from another World.

## Template — Fleet war background layer

Only use after exact layer/parallax requirements are known.

Create one background combat layer, not a complete gameplay screenshot. Keep capital ships and laser exchange in the outer/background zones. Never place bright explosions behind the active typing region. No text.

## Template — Black-hole environmental layer

Only use after WebGL distortion ownership is confirmed.

Generate only painted source components that cannot be procedurally rendered. Do not bake lensing distortion that the runtime already performs.

---

# 21. GENERATION ORDER

Recommended art-production order mirrors implementation so work is not wasted.

## Batch 1 — Phase 1A/1B

Generate first:

```text
A01–A04 Sector Conditions
B01–B09 Elite/Affix
C01–C08 Typing Patterns
D01–D04 Flow emblems (only if UI needs them)
```

## Batch 2 — Phase 2

First finalize the latest-code relic mapping. Then generate **only the approved/mapped subset** of:

```text
E01–E12 relic visual-role templates
```

Do not generate all 12 merely because twelve templates exist.

## Batch 3 — Encounter / Boss UI

Generate:

```text
F01–F07 Encounter Recipe
I01–I04 Boss Part icons
```

## Batch 4 — Expedition

Generate:

```text
G01–G04
J01 if Nemesis v1 is included
```

## Batch 5 — Learning

Generate:

```text
H01–H04
J02 if Personal Ghost is included
```

## Batch 6 — Cinematic

Do not start until the implementation-specific art request is written from the actual renderer.

---

# 22. GEMINI COPY-PASTE WRAPPER

Use this wrapper before **every individual asset prompt** if Gemini tends to carry context from prior generations:

```text
CRITICAL IMAGE DELIVERY RULE

Generate exactly ONE image for exactly ONE requested filename.

ONE GENERATION CALL = ONE REQUESTED FILE.

Reset context before generating:
- ignore palettes, Worlds, subjects and objects from all previous generations
- use only the palette and subject defined for the current filename
- do not reuse Nature colors in Cosmic assets or any previous World palette unless explicitly requested

DO NOT create:
- collage
- contact sheet
- concept sheet
- comparison board
- storyboard
- grid
- multiple variants
- several icons in one image
- labels
- filename text
- captions
- readable random words
- watermark
- logo

For icon assets:
- square PNG
- true transparent alpha
- one centered subject
- about 12–15% safe margin
- no background scene
- no fake transparency checkerboard
- strong silhouette readable at 64–96 px
- premium cinematic sci-fi/fantasy game art
- polished materials and controlled glow
- no cheap flat-vector/mobile-sticker look

Create ONLY the current requested filename.
```

Then append exactly one asset prompt from this document.

---

# 23. PER-FILE QUALITY CHECKLIST

Before accepting a generated image, verify all of the following.

## File identity

- exactly one requested asset;
- correct conceptual subject;
- no extra sibling assets;
- no collage;
- no labels.

## Background

For icons:

- true alpha;
- no background scene;
- no checkerboard.

## Style

- premium;
- consistent with Space Typing;
- not flat/basic;
- not crude primitive art;
- not copied silhouette from another icon.

## Readability

- recognizable at 64–96 px;
- subject not cropped;
- glow not clipped;
- enough contrast;
- no tiny critical details only visible at full resolution.

## Palette isolation

- current prompt palette only;
- no leaked Nature/Frost/Cosmic/etc. palette from prior generation unless requested.

## Gameplay suitability

- no random letters;
- no visual clutter that could be mistaken for target text;
- no unnecessary UI frame;
- no misleading mechanic signal.

Any failed item means regenerate that file only.

---

# 24. FILE-NAMING RULES

Use exactly the filename listed in this pack.

Rules:

- lowercase;
- kebab-case;
- `.png`;
- no spaces;
- no `(1)`;
- no `_final`;
- no `_new`;
- no automatic numbered suffix;
- no filename text painted inside the image.

If Gemini cannot control the downloaded filename, rename the downloaded file locally to the exact canonical filename before placing it in the source-art folder.

---

# 25. FINAL ART-PACK INTENT

This prompt pack is not trying to maximize the number of images.

Its purpose is to give every important new mechanic a clear visual identity while respecting the V2 architecture:

```text
new source art only where it improves:
- readability
- player choice
- build identity
- encounter identity
- progression identity
```

The runtime should still reuse:

- existing enemy/boss art;
- existing background art;
- existing meteor and black-hole effects;
- existing ship/Rage effects;
- procedural aura/rings/trails;
- current WebGL systems;

whenever those already solve the problem cleanly.

The correct result is a **cohesive, maintainable art set**, not an unnecessarily huge asset library.

---

**END — EXPANSION V2 IMAGE PROMPT PACK**
