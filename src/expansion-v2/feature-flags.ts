export const EXPANSION_V2_FEATURE_KEY =
  "spaceTypingExpansionV2Enabled";

export function expansionV2FeatureEnabled(
  storage: Pick<Storage, "getItem">,
  search = "",
): boolean {
  const params = new URLSearchParams(search);
  const query = params.get("expansionV2");
  if (query === "off" || query === "0" || query === "false") {
    return false;
  }
  if (query === "on" || query === "1" || query === "true") {
    return true;
  }
  return storage.getItem(EXPANSION_V2_FEATURE_KEY) !== "false";
}
