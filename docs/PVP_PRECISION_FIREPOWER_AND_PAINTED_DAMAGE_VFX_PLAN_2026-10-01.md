# SPACE TYPING — PvP Precision Firepower + Painted Damage VFX Plan

**Date:** 2026-10-01  
**Status:** IMPLEMENTATION PLAN — painted-asset pipeline first, runtime integration second  
**Branch:** `feat/bgv-integration-current`

## 1. Core direction

Do not build the new PvP fire / explosion / destruction presentation mainly from CSS shapes.

The game already has a proven painted-shot pipeline under:

- `art-src/fx/<ship>/`
- `scripts/bg-art/prepare-fx.mjs`
- `public/assets/space-typing/fx/<ship>/`

The new damage presentation must follow the same idea:

**AI-painted / owner-generated source art -> deterministic processing -> runtime WebP assets -> code animates/composites the painted assets.**

Code is responsible for timing, transforms, parallax, blending, shake, sound and quality scaling.  
The visible flame/explosion artwork itself comes from generated source art.

---

## 2. New source-art folder

Create:

```text
art-src/combat-vfx/
```

Required source files:

```text
explosion-core.png
explosion-wide.png
shockwave-ring.png
fire-small.png
fire-medium.png
fire-critical.png
smoke-dark.png
smoke-hot.png
spark-burst.png
debris-burst.png
missile-salvo.png
bomb-impact.png
precision-burst.png
```

### Absolute delivery rule

**ONE GENERATION CALL = ONE REQUESTED FILE.**

No contact sheet, sprite board, grid, comparison sheet or multi-file canvas.

---

## 3. Art requirements

All source art:

- pure black background `#000000`;
- no text;
- no UI;
- no ship body unless the file explicitly needs one;
- no square visible border;
- bright additive-light VFX;
- cinematic sci-fi game quality;
- high detail;
- clean edge falloff into black;
- center composition with enough empty border for cropping;
- 1536x1536 or larger source preferred.

### Explosion

`explosion-core`
- white-hot center;
- yellow/orange plasma;
- red outer flame;
- tiny incandescent fragments;
- radial depth, not flat 2D clipart.

`explosion-wide`
- wider, asymmetric detonation;
- multiple plasma lobes;
- stronger debris and smoke;
- designed for large-map blast moments.

`shockwave-ring`
- thin white-hot ring;
- orange/red energy turbulence around the rim;
- transparent-looking center on black;
- suitable for fast scale-up.

### Persistent ship fire

`fire-small`
- compact localized damage flame;
- bright core, orange tongues, subtle smoke;
- for Hull <= 70%.

`fire-medium`
- visibly larger multi-tongue flame;
- more smoke, embers and intermittent flare;
- for Hull <= 45%.

`fire-critical`
- violent sustained plasma fire;
- heavy dark smoke;
- bright sparks and hot fragments;
- for Hull <= 20%.

These images are not static decorations. Runtime should layer two or three instances with slightly different scale/rotation/flicker so the result looks alive.

### Bonus firepower

`precision-burst`
- bright weapon-overdrive ignition;
- radial energy flare around a ship;
- used when a correct-typing milestone unlocks bonus ordnance.

`missile-salvo`
- missile-launch ignition/trail burst;
- not the whole missile itself.

`bomb-impact`
- dense core explosion for bonus bomb impact.

---

## 4. Runtime precision-firepower design

Accuracy rewards should be based on current Duel typing performance, not random chance.

The system tracks:

- correct character streak since last mistake;
- recent accuracy window;
- total Duel accuracy.

Suggested milestone ladder:

```text
10 correct chars  -> overdrive pulse + bonus laser burst
20 correct chars  -> micro missile
35 correct chars  -> missile salvo
50 correct chars  -> heavy bomb
75 correct chars  -> precision barrage
100 correct chars -> major ordnance burst
```

A wrong key breaks the current correct streak but does not erase total Duel accuracy.

High recent accuracy strengthens the milestone presentation:

```text
< 90%   -> baseline bonus
90–96%  -> stronger projectile / one extra secondary blast
97–98%  -> stronger salvo + larger impact
>= 99%  -> premium precision flare + strongest bounded secondary explosion
```

This is **bonus firepower**, not a replacement for normal Action Offers.

---

## 5. Damage-state VFX

Hull ratio controls persistent damage state:

```text
> 70%   clean ship
<= 70%  light fire / sparks
<= 45%  medium fire + smoke
<= 20%  critical fire + heavy smoke + recurring micro explosions
```

Shield damage alone should not start hull fire.

Repairing Hull above a threshold must reduce/remove the flame tier immediately.

Low quality:
- one painted flame layer;
- reduced smoke;
- no secondary debris.

Medium:
- two flame layers;
- smoke;
- occasional spark burst.

High:
- multi-layer flame;
- smoke;
- spark/debris;
- occasional local micro explosion.

Ultra:
- richest bounded composition;
- extra hot-smoke layer;
- stronger lighting bloom;
- rare map-space secondary blast on critical hits.

---

## 6. Map-wide explosion design

Large attack / elimination / major precision milestones can trigger a map-scale blast package:

1. painted `explosion-wide` at impact;
2. painted `shockwave-ring` expands across a large arena radius;
3. debris/spark painted layers;
4. short camera shake;
5. short brightness flash;
6. secondary distant burst(s) on High/Ultra only.

Do not cover the typing token long enough to harm gameplay readability.

---

## 7. Asset processing

New processor:

```text
scripts/bg-art/prepare-combat-vfx.mjs
```

Input:

```text
art-src/combat-vfx/<id>.(png|jpg|webp)
```

Output:

```text
public/assets/space-typing/combat-vfx/<id>.webp
public/assets/space-typing/combat-vfx/vfx.json
```

Processing requirements:

- validate near-black border;
- force noisy near-black pixels to pure black;
- crop to luminous content with safe padding;
- resize with Lanczos;
- preserve additive-light look;
- SHA-256 versioned manifest;
- fail soft at runtime: missing art keeps existing fallback FX.

---

## 8. Acceptance criteria

1. Fire/explosion presentation is visibly painted asset art, not mainly CSS geometry.
2. Persistent fire scales from light -> medium -> critical with Hull.
3. Repair reduces the fire tier correctly.
4. Medium/High/Ultra are visibly richer than Low.
5. Precision typing milestones create real bonus firepower.
6. Wrong key breaks the current precision streak.
7. >=97% and >=99% accuracy make the bonus attack visibly stronger.
8. Major bomb/missile impacts have large painted explosion + shockwave.
9. Map-wide blast never blocks typing readability for a long period.
10. All effect counts are bounded.
11. Missing art fails soft instead of crashing the game.
12. `predev` / `prebuild` automatically process changed combat VFX art.
