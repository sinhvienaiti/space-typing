# Space Typing Default Audio Layout

Space Typing now ships a curated redistributable **CC0** default audio set.

Runtime resolution remains:

1. local/private override where a world-specific local path exists;
2. committed repository fallback;
3. fail-soft silence if playback is unavailable.

See `ATTRIBUTION.md` for source and license provenance.

## Default music

```text
public/assets/audio/music/
  sector.ogg   # calm exploration / shop / station / hidden fallback
  pulse.ogg    # pressure / intense / mini-boss / hidden challenge
  urgent.ogg   # world boss / galaxy boss / champion / defeat fallback
```

The game does **not** create one song per Campaign stage.

World-specific personal overrides are still supported:

```text
public/local-assets/music/world-01.ogg
...
public/local-assets/music/world-50.ogg
```

If a private world file is absent, the runtime uses the committed calm default.

## Ambient spacecraft layer

```text
public/assets/audio/ambient/
  engine-loop.ogg
  computer-loop.ogg
```

World/galaxy private ambient overrides remain supported under:

```text
public/local-assets/ambient/
```

The controller keeps at most two active ambient layers and ducks them more aggressively than music when pronunciation/warnings are active.

## Stingers

```text
public/assets/audio/stingers/
  victory.ogg
```

Victory is non-looping.

Defeat and transition currently reuse the verified music fallbacks in non-looping state mode plus existing synthesized SFX. This avoids vendoring extra large tracks merely for variety.

## Curated sampled SFX

```text
public/assets/audio/sfx/kenney/
  laser-small.ogg
  laser-large.ogg
  force-field.ogg
  explosion-crunch.ogg
  explosion-low.ogg
  engine-large.ogg
  thruster.ogg
  confirm.ogg
  error.ogg
```

These samples layer over the existing Web Audio synthesis for selected high-value events. Ordinary typing remains lightweight and does not allocate a new Audio element per keypress.

## Performance contract

- sampled SFX use a bounded reusable voice pool;
- sample preload starts after audio is unlocked by user interaction;
- no per-frame audio allocations;
- no 50-world eager music preload;
- only a small next-world hint set is preloaded;
- music crossfades reuse the existing controller;
- English pronunciation retains mix priority.

## Adaptive stage pacing

For ordinary stages, the pacing phases also drive music intensity:

```text
Opening       -> calm
Pressure Ramp -> intense
Mixed Threats -> intense
Recovery Beat -> calm
Finale        -> intense
```

Boss/elite/hazard/hidden music states remain authoritative and are not replaced by normal-wave logic.

## Manual acceptance

The committed assets make the M22 audio scenarios executable, but M22 still requires real browser + real audio-device observation. Automated CI cannot declare subjective loudness, clarity or listening quality PASS.
