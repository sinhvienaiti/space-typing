import fs from "node:fs";

const path = "src/duel/network-client.ts";
let text = fs.readFileSync(path, "utf8");
const transforms = [
  [
`      view === null ||
      view.gameMode !== "standard" ||
      this.socket === null ||`,
`      view === null ||
      (view.gameMode !== undefined && view.gameMode !== "standard") ||
      this.socket === null ||`,
"sendIntent Standard fallback",
  ],
  [
`      roundChanged ||
      view.gameMode === "standard" ||
      (this.alternativeView !== null &&`,
`      roundChanged ||
      (view.gameMode ?? "standard") === "standard" ||
      (this.alternativeView !== null &&`,
"reconcile Standard fallback",
  ],
];
for (const [before, after, label] of transforms) {
  const count = text.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1, found ${count}`);
  text = text.replace(before, after);
}
fs.writeFileSync(path, text);
