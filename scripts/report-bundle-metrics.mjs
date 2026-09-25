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

console.log(
  "Production bundle metrics (report-only, no hard byte limits):",
  {
    jsRaw: (jsRaw / 1024).toFixed(2) + " KiB",
    jsGzip: (jsGzip / 1024).toFixed(2) + " KiB",
    cssRaw: (cssRaw / 1024).toFixed(2) + " KiB",
    cssGzip: (cssGzip / 1024).toFixed(2) + " KiB",
    totalRaw: (totalRaw / 1024).toFixed(2) + " KiB",
    totalGzip: (totalGzip / 1024).toFixed(2) + " KiB",
  },
);
