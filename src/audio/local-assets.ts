type BuildEnv = ImportMeta & { env?: { DEV?: boolean; SPACE_LOCAL_ASSETS?: boolean } };

/**
 * public/local-assets holds the owner's private audio (DotA announcer lines,
 * personal music; gitignored, docs/LOCAL_ASSETS_README.md). Only the dev
 * server and a build made with SPACE_LOCAL_ASSETS=1 look there; a player
 * build never requests it, and vite.config.ts leaves the folder out of dist.
 */
export function localAssetsEnabled(): boolean {
  const env = (import.meta as BuildEnv).env;
  return env?.DEV === true || env?.SPACE_LOCAL_ASSETS === true;
}
