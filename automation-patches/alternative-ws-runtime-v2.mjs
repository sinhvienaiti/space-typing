import fs from "node:fs";
import { pathToFileURL } from "node:url";

const sourcePath = "automation-patches/alternative-ws-runtime.mjs";
let source = fs.readFileSync(sourcePath, "utf8");
source = source.replace(
  '    return `reflex:${view.challenge.challengeId}`;',
  '    return "reflex:" + view.challenge.challengeId;',
);
source = source.replace(
  '  return `word-chain:${view.beat.beatId}`;',
  '  return "word-chain:" + view.beat.beatId;',
);

const temporaryPath = "/tmp/alternative-ws-runtime-fixed.mjs";
fs.writeFileSync(temporaryPath, source);
await import(pathToFileURL(temporaryPath).href + `?v=${Date.now()}`);
