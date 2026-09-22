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

The current production renderer is original procedural Canvas/UI artwork. No
third-party sprite, boss, projectile, crate, equipment-icon or spell artwork is
bundled at this checkpoint.

If a generated or openly licensed image is added later, it must be entered in
the manifest before runtime use. Loading failure must keep the procedural
fallback active so typing targets and gameplay remain functional.
