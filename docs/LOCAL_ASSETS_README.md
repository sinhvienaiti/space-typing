# Local Assets / Publishing Notice

This project may use local-only third-party assets for private development, testing, or personal gameplay.

These files are **not automatically cleared for redistribution or public hosting**. Before publishing the game, deploying it to a public host, creating a public release, or distributing a build, review every path listed below.

## Local-only asset paths

### Announcer audio

```text
public/local-assets/announcer/
```

Expected examples:

```text
double-kill.*
triple-kill.*
ultra-kill.*
rampage.*
monster-kill.*
```

These files may come from external sound libraries, games, mods, announcer packs, or other third-party sources used only for local testing/personal use.

Do not assume that a downloadable sound file is automatically redistributable.

Before a public release:

1. verify the license and redistribution rights for every file;
2. remove files that are local/private-use only;
3. replace them with original or properly licensed Space Typing assets when necessary;
4. add required attribution when the source license requires it;
5. verify that the final production build does not accidentally bundle ignored/local-only files.

## Future local-only folders

If additional third-party or private assets are added later, register them here before use.

Suggested convention:

```text
public/local-assets/
├── announcer/
├── music/
├── sfx/
├── voice/
└── experimental/
```

Any new folder under `public/local-assets/` should be treated as **review-required before publishing** unless its assets have been explicitly cleared for redistribution.

## Repository rule

Application code may reference optional local assets, but the game must not crash when they are missing.

Where appropriate:

```text
local asset exists
-> use local asset

local asset missing
-> use the project's normal/default behavior
```

Do not commit third-party binary assets to Git unless their redistribution rights have been verified.

## Public-release checklist

Before public deployment or distribution:

- audit `public/local-assets/`;
- inspect the final build output for bundled local assets;
- review third-party audio/image/font/media licenses;
- confirm required attribution;
- replace questionable assets;
- run the game without the local-only folders and confirm it still works;
- record the completed asset audit in the release notes.

## Current intention

The current Space Typing project is being developed for local/private use. This document exists so a future public release does not accidentally redistribute local-only or third-party assets.
