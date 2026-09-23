# Space Typing Asset Sources

This file is the human-readable companion to
`public/assets/space-typing/manifest.json`.

## Policy

Every non-procedural visual asset added to Space Typing must record:

- asset ID and category;
- original source;
- author/creator when applicable;
- license;
- whether attribution is required;
- local runtime URL when the asset is bundled.

The enemy/boss renderer remains original procedural Canvas/UI artwork. Player
ships now additionally support a bundled project-original illustrated asset
while retaining the procedural renderer as the runtime fallback.

## Player Ship Visual V2

Manifest ID:

```text
player-ship-sheet-v2
```

Bundled runtime asset:

```text
public/assets/space-typing/ships/player-ships-v2.svg
```

The sheet is a transparent 4x3 illustrated layout with 11 occupied cells in
CharacterId order (Vanguard through Zenith) and one reserved final cell. It was
created for this project following the approved generated ship-concept art
direction; it is not copied from an external game or sprite pack.

The art pipeline loads it as an optional player asset. If loading fails, the
existing project-original procedural ship renderer remains active, so gameplay,
typing readability and Character selection do not depend on the image asset.

Future generated or openly licensed images must likewise be entered in the
manifest before runtime use.

## Enemy system procedural coverage

The modular enemy renderer remains project-original procedural Canvas art.

Registered families:

- Rainbow;
- Angel;
- Devil;
- Frost;
- Prism;
- Nature;
- Shadow;
- Cosmic.

Bosses use the same renderer through `src/boss/visual-profile.ts`.
No external enemy or boss image is required at runtime, so missing optional
future image assets cannot block gameplay or typing readability.

The first production visual slice is therefore functional with procedural
fallback before any generated/open-license raster assets are introduced.
