import { kitManifestUrl, parseKit } from "./kit";
import type { BackgroundKit } from "./types";

/** Fetches and validates a kit.json; null when missing or malformed. */
export async function fetchKit(
  kitId: string,
  signal?: AbortSignal,
): Promise<BackgroundKit | null> {
  try {
    const response = await fetch(kitManifestUrl(kitId), { signal, cache: "no-cache" });
    if (!response.ok) return null;
    return parseKit(await response.json(), kitId);
  } catch (error) {
    if ((error as { name?: string }).name !== "AbortError") {
      console.warn("BGV: kit " + kitId + " unavailable.", error);
    }
    return null;
  }
}

/**
 * Downloads and decodes an image off the main thread where the browser
 * supports it. The bitmap is premultiplied, matching the renderer's blending.
 */
export async function fetchBitmap(
  url: string,
  signal?: AbortSignal,
): Promise<ImageBitmap | null> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await createImageBitmap(blob, {
      premultiplyAlpha: "premultiply",
      colorSpaceConversion: "default",
    });
  } catch (error) {
    if ((error as { name?: string }).name !== "AbortError") {
      console.warn("BGV: texture " + url + " unavailable.", error);
    }
    return null;
  }
}
