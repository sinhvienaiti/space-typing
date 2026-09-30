const modules = import.meta.glob<string>(
  "../assets/expansion-v2/**/*.webp",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

function normalized(path: string): string {
  return path
    .replace(/^\.\.\/assets\/expansion-v2\//, "")
    .replace(/@2x(?=\.webp$)/, "");
}

const standard = new Map<string, string>();
const detail = new Map<string, string>();

for (const [path, url] of Object.entries(modules)) {
  const key = normalized(path);
  if (path.includes("@2x.webp")) detail.set(key, url);
  else standard.set(key, url);
}

export type ExpansionAssetQuality =
  | "low"
  | "medium"
  | "high"
  | "ultra";

export function expansionAssetUrl(
  relativePath: string,
  quality: ExpansionAssetQuality = "high",
): string | null {
  const key = relativePath.replace(/^\/+/, "").replace(/\.png$/i, ".webp");
  if (quality === "high" || quality === "ultra") {
    return detail.get(key) ?? standard.get(key) ?? null;
  }
  return standard.get(key) ?? detail.get(key) ?? null;
}

export function expansionAssetAvailable(relativePath: string): boolean {
  return expansionAssetUrl(relativePath, "high") !== null;
}
