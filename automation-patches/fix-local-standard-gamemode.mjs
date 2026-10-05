import fs from "node:fs";

const path = "src/duel/local-match.ts";
let text = fs.readFileSync(path, "utf8");
const before = `      roundId: this.roundId,
      mode: "practice",
      combatProfile: "normalized",`;
const after = `      roundId: this.roundId,
      mode: "practice",
      gameMode: "standard",
      combatProfile: "normalized",`;
const count = text.split(before).length - 1;
if (count !== 1) throw new Error(`Expected one Practice view anchor, found ${count}`);
text = text.replace(before, after);
fs.writeFileSync(path, text);
