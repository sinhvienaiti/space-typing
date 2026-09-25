import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const root = new URL("../dist/", import.meta.url);

function files(dirUrl) {
  return readdirSync(dirUrl, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dirUrl);
    return entry.isDirectory() ? files(url) : [url];
  });
}

const built = files(root);
let jsRaw = 0;
let jsGzip = 0;
let cssRaw = 0;
let cssGzip = 0;
let totalRaw = 0;
let totalGzip = 0;

for (const url of built) {
  const path = url.pathname;

  // Premium V3 ship art and committed default audio have dedicated integrity
  // validation. Keep them out of executable/static bundle reporting so the
  // trend remains comparable with earlier M22 measurements.
  if (
    path.endsWith("/assets/space-typing/ships/player-ships-v3.webp") ||
    path.endsWith("/assets/space-typing/ships/player-ships-v3.png")
  ) {
    continue;
  }
  if (path.includes("/assets/audio/") && path.endsWith(".ogg")) {
    continue;
  }

  const buffer = readFileSync(url);
  const raw = statSync(url).size;
  const gzip = gzipSync(buffer).length;
  totalRaw += raw;
  totalGzip += gzip;

  if (path.endsWith(".js")) {
    jsRaw += raw;
    jsGzip += gzip;
  } else if (path.endsWith(".css")) {
    cssRaw += raw;
    cssGzip += gzip;
  }
}

const metrics = {
  jsRaw,
  jsGzip,
  cssRaw,
  cssGzip,
  totalRaw,
  totalGzip,
};

console.log(
  "Production bundle metrics (report-only):",
  Object.fromEntries(
    Object.entries(metrics).map(([key, value]) => [
      key,
      (value / 1024).toFixed(2) + " KiB",
    ]),
  ),
);
