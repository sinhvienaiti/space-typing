# Pre-M22 Combat Identity + Typing Clarity Master Plan

Status: ACTIVE

This slice is approved before the remaining M22 real-browser/audio/visual gate. It combines two related goals:

1. improve typing target clarity so same-prefix words rarely create ambiguous locks;
2. upgrade the player-side combat identity with illustrated ships, equipment-driven aura, and character-specific projectile/impact VFX.

The manual M22 matrix must run on the final version of this slice.

## Guardrails

- Typing clarity is more important than visual spectacle.
- Do not add a second scheduler, target system, equipment system, projectile damage system, or PlayerSave domain.
- Prefix suppression is weighted, not an absolute ban. The vocabulary must remain varied and rank/difficulty requirements still win.
- Once a target is locked, normal typing input stays on that target until completion/destruction/reset.
- Same-initial target acquisition must never be random. Nearest-to-player wins first; deterministic tie-breakers resolve exact ties.
- Ship artwork is a presentation asset. The existing procedural renderer remains the fail-soft fallback.
- Equipment aura is derived from the existing equipped items, Grade and affixes. No new persistent aura loadout is created.
- Player-shot visuals reuse the existing Laser/typing-hit mechanics; visual identity must not change damage, cadence, accuracy, target rules or boss balance.
- New artwork and effects must remain compact. Enemy words and hostile projectile letters remain visually dominant.
- Generated assets must be registered in the art manifest and remain optional/fail-soft.
- No PlayerSave schema bump is expected unless implementation uncovers an actual persistent gameplay requirement.
- M23 remains blocked until this slice and M22 manual QA are complete.

---

# Track A — Typing clarity

## C01 — Prefix conflict scoring
Add a pure prefix-conflict model for candidate words.

Rules:
- exact duplicate with an active enemy word receives the strongest penalty;
- shared 3+ letter prefix receives a strong penalty;
- shared 2-letter prefix receives a medium penalty;
- shared first letter receives a light penalty;
- repeated same-initial pressure increases the penalty when several active enemies already share that initial.

Acceptance:
- examples such as me, month and morning are ranked as highly conflicting while unrelated words remain low-conflict;
- punctuation/case is normalized through the canonical typing text;
- empty/non-letter words fail soft.

## C02 — Clarity-aware enemy word selection
Integrate C01 into rank-aware vocabulary selection.

Rules:
- preserve authored Rank and word-difficulty targeting;
- evaluate clarity inside a near-difficulty candidate band rather than selecting an unrelated easy word;
- apply to normal spawns, Carrier children, Splitter fragments and new armor/layer words;
- exact duplicates should be avoided whenever another near-band candidate exists;
- this remains soft suppression so late-game/high-pressure vocabulary does not deadlock.

Acceptance:
- active-prefix conflicts fall substantially without reducing spawn count;
- scheduler/admission and World Rank distribution remain unchanged.

## C03 — Deterministic same-initial target resolver
Formalize acquisition for multiple candidates sharing the first typed letter.

Priority:
1. shortest geometric distance to player;
2. lower on screen / more immediate contact when distance is effectively tied;
3. older enemy id for stable deterministic behavior;
4. shorter typing word as the final stable fallback.

Acceptance:
- acquisition is never random;
- after target lock, subsequent characters cannot silently jump to another same-prefix enemy;
- target death/removal clears the lock normally.

## C04 — Target readability feedback
Keep feedback subtle.

- retain the existing target line / targeted enemy styling;
- strengthen only the currently locked target enough to be obvious;
- do not add another central HUD panel;
- Test Lab must be able to reproduce same-prefix scenarios deterministically.

---

# Track B — Illustrated ship visual system

## C05 — Ship Visual V2 asset contract
Upgrade from six reused procedural silhouettes to 11 illustrated character assets.

Assets:
- Vanguard: heroic cyan/blue spear fighter;
- Aegis: mint/teal fortress tank;
- Volt: electric blue caster with gold core;
- Wraith: violet stealth/phantom;
- Fortune: gold treasure/crown craft;
- Arsenal: red/orange heavy assault fighter;
- Oracle: pink-violet mystic precision craft;
- Bastion: green-cyan shield/support hull;
- Reaper: crimson/magenta scythe fighter;
- Celestial: blue-violet/gold astral craft;
- Zenith: white/cyan/violet apex flagship.

Contract:
- transparent PNG;
- upward-facing;
- normalized square canvas;
- compact readable silhouette;
- no text/background;
- consistent art direction;
- generated asset source recorded in manifest.

Fallback:
- current Canvas procedural renderer remains available if an image fails to load.

## C06 — Runtime ship asset integration
Use the existing art asset pipeline.

- register each ship separately in public/assets/space-typing/manifest.json;
- preload through the current catalog;
- expose loaded player images to the character renderer;
- Character Select, player status preview and battlefield use the same canonical art;
- retain scale/bob/banking/engine effects around the image rather than baking all motion into the PNG.

Acceptance:
- missing PNG never breaks gameplay;
- combat footprint stays approximately the current size;
- previews may be larger without changing gameplay hit position.

---

# Track C — Equipment aura identity

## C07 — Derived equipment visual affinity
Derive aura from already-equipped gear.

Visual families:
- tech — neutral cyan/white;
- guard — teal/green defensive field;
- storm — electric cyan/blue;
- flame — orange/red assault;
- precision — violet/magenta focus;
- fortune — gold/amber luck/salvage;
- void — crimson/violet high-risk;
- celestial — white/gold/blue apex.

Inputs:
- equipped slot;
- equipment definition stats;
- affixes;
- Grade;
- enhancement level;
- optional character identity as a tie-break only.

Rules:
- no aura state is saved separately;
- Grade controls intensity, never gameplay power;
- affixes can bias affinity;
- mixed builds choose one dominant affinity plus a restrained secondary accent.

## C08 — Aura renderer
Render a compact layer around/behind the ship.

Possible primitives:
- halo ring;
- soft radial glow;
- tiny orbit sparks;
- short engine/wing trail;
- shield hex arc for defensive affinity;
- small electric arc for storm;
- restrained flame plume for assault;
- star motes for fortune/celestial;
- shadow wisps for void.

Acceptance:
- no large screen-filling aura;
- Low/Medium quality reduces particle/detail count;
- High/Ultra enables richer secondary accents;
- enemy words remain unobstructed.

---

# Track D — Player projectile / hit VFX identity

## C09 — Character projectile profiles
Create a pure profile for all 11 characters.

Each profile specifies:
- primary/secondary color;
- shot archetype;
- beam/bolt width;
- trail/glow intensity;
- muzzle flash shape;
- impact shape/hue;
- perfect/word-complete emphasis.

Initial archetypes:
- Vanguard — clean cyan spear bolt;
- Aegis — heavy teal shield round;
- Volt — electric plasma dart;
- Wraith — violet shadow needle;
- Fortune — gold star pulse;
- Arsenal — orange/red barrage tracer;
- Oracle — magenta psychic mote;
- Bastion — dense green-cyan guard pulse;
- Reaper — crimson slash tracer;
- Celestial — radiant feather/star lance;
- Zenith — white-cyan cosmic lance.

## C10 — Projectile renderer integration
The current player attack is a short-lived Laser visual created by correct typing.

- preserve that runtime mechanic;
- render each Laser through the current character projectile profile;
- add small muzzle flash and compact impact flare;
- word-complete/boss-word power may use a stronger visual variant;
- do not create moving physical player bullets unless later gameplay explicitly needs them.

Acceptance:
- damage and hit timing are unchanged;
- rapid typing does not create unreadable persistent trails;
- visual quality profile bounds glow/particle cost.

## C11 — Aura/projectile composition
Define strict layering:
1. equipment aura behind ship;
2. illustrated ship;
3. engine/core glow;
4. defensive/status rings;
5. player shot/tracer;
6. target impact;
7. hostile text/projectile labels remain readable above appropriate effects.

---

# Track E — Integration / QA

## C12 — Full regression and M22 handoff
Tests:
- prefix conflict scoring;
- rank-aware clarity selection;
- deterministic nearest-target acquisition;
- same-prefix Game/Test Lab scenario;
- all 11 ship asset ids/profile coverage;
- equipment aura derivation;
- all 11 projectile profiles;
- fail-soft art loading.

Technical gate:
- full tests;
- TypeScript;
- Vite production build;
- M22 bundle budget;
- performance sanity at max-pressure Test Lab.

Manual M22 additions:
- compare illustrated ships at combat scale and Character Select scale;
- verify aura is visible but not noisy across Grade/build examples;
- verify rapid player projectile effects do not cover enemy words;
- reproduce multiple same-initial enemies and confirm nearest target locks deterministically;
- verify same-prefix words are noticeably less common during normal play;
- check Low/Medium/High/Ultra visual quality.

## Execution order

1. C01-C04 typing clarity first.
2. C05-C06 illustrated ship assets/integration.
3. C07-C08 equipment aura.
4. C09-C11 projectile identity/composition.
5. C12 full regression/docs/CI.
