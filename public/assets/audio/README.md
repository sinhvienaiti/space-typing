# Space Typing Music / Ambient Asset Layout

M08 resolves audio from these repository/default paths:

```text
public/assets/audio/music/
public/assets/audio/ambient/
public/assets/audio/stingers/
```

Optional local/private overrides use:

```text
public/local-assets/music/
public/local-assets/ambient/
```

Resolution order is local override -> repository/default -> fail-soft silence.

## World files

The canonical World ids are `world-01` through `world-50`.

Suggested base files:

```text
music/world-01.ogg
...
music/world-50.ogg

ambient/world-01.ogg
...
ambient/world-50.ogg
```

Galaxy ambient fallback names may use:

```text
ambient/galaxy-01.ogg
...
ambient/galaxy-10.ogg
```

## Shared special-state files

Current runtime mappings expect names such as:

```text
music/intense.ogg
music/mini-boss.ogg
music/world-boss.ogg
music/galaxy-boss.ogg
music/champion-hunt.ogg
music/hidden-challenge.ogg
music/hidden-world.ogg
music/shop.ogg
music/station.ogg

stingers/victory.ogg
stingers/defeat.ogg
stingers/world-transition.ogg
```

Final assets may reuse compositions/stems where appropriate. Do not create one song per Campaign stage.

No final World music binaries are committed by M08. Add repository/default files only when redistribution rights are verified. Local/private files remain governed by `docs/LOCAL_ASSETS_README.md`.
