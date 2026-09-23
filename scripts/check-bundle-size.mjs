import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const root = new URL("../dist/", import.meta.url);
const limits = {
  jsRaw: 650 * 1024,
  jsGzip: 180 * 1024,
  cssRaw: 60 * 1024,
  cssGzip: 20 * 1024,
  totalRaw: 800 * 1024,
  totalGzip: 250 * 1024,
};

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
  // Premium V3 ship art has its own mandatory 1024x768 / 1.2 MiB
  // check in check-ship-art-budget.mjs. Do not double-count that
  // static image against the original M22 JS/CSS + non-V3 asset budget.
  // Keep every other asset in this budget as before.
  if (
    path.endsWith("/assets/space-typing/ships/player-ships-v3.webp") ||
    path.endsWith("/assets/space-typing/ships/player-ships-v3.png")
  ) {
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

const failures = Object.entries(metrics)
  .filter(([key, value]) => value > limits[key])
  .map(
    ([key, value]) =>
      key +
      " " +
      (value / 1024).toFixed(2) +
      " KiB exceeds " +
      (limits[key] / 1024).toFixed(2) +
      " KiB",
  );

console.log(
  "M22 bundle budget:",
  Object.fromEntries(
    Object.entries(metrics).map(([key, value]) => [
      key,
      (value / 1024).toFixed(2) + " KiB",
    ]),
  ),
);

if (failures.length > 0) {
  console.error("Bundle budget failures:\n" + failures.join("\n"));
  process.exitCode = 1;
}
