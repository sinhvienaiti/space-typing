# High / Ultra Visual Quality V2

Status: implemented on `feat/bgv-integration-current`.

## Goal

High and Ultra must change visible fidelity, not only labels or a small particle
count. The upgrade is render-only: gameplay timing, hit boxes, enemy speed,
typing rules, damage and reward logic remain unchanged.

## Tier contract

- **Low**: minimum effects and low DPR for weak machines.
- **Medium**: normal gameplay presentation and standard 256 px enemy sprites.
- **High**: visibly sharper canvas, detailed 512 px enemy variants, more
  particles/background objects, richer skill passes and full baseline glow.
- **Ultra**: Retina-class target DPR where the viewport budget allows it,
  detailed sprites, the largest background/object budgets, denser skill VFX and
  stronger bounded glow.

Bosses use 640 px standard art and 1024 px detailed art.

## Sprite pipeline

One source image is still enough:

```
art-src/enemies/<family>-<kind>.png
art-src/bosses/<boss-id>.png
```

Run:

```bash
pnpm sprites:prepare
```

The script emits both standard and `@2x` WebP assets. High/Ultra prefer
`@2x`; Low/Medium prefer standard. Missing `@2x` falls back to standard,
and missing painted art falls back to the existing code renderer. This keeps
partial art packs safe.

## Performance safety

High/Ultra still use `AdaptiveRenderBudget`. Sustained slow frames yield the
background first and only then reduce gameplay render DPR, down to the existing
bounded adaptive floor. Therefore the quality tiers can start meaningfully
higher without turning a temporary heavy scene into permanent frame loss.

The new budgets remain bounded: canvas pixel ceilings, particle caps, scene
object caps, skill-effect counts and the painted-sprite LRU cache all have hard
limits.

## Runtime quality changes

Changing quality clears the procedural enemy body cache, updates the background,
preloads the correct painted sprite tier for the current stage, resets adaptive
sampling and resizes the canvas. A detailed sprite that is still decoding can
temporarily fall back to its standard sibling instead of disappearing.

## Non-goals

- No gameplay or balance changes.
- No custom voice work.
- No requirement that every current art file already has a detailed companion;
  the fallback chain is intentional.
