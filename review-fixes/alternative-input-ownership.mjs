import fs from "node:fs";

function replaceUnique(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Duplicate ${label}`);
  }
  return source.replace(before, after);
}

const path = "src/duel/alternative-battle-ui.ts";
let source = fs.readFileSync(path, "utf8");

source = replaceUnique(
  source,
  `function createNode<K extends keyof HTMLElementTagNameMap>(\n  tag: K,\n  className?: string,\n): HTMLElementTagNameMap[K] {\n  const node = document.createElement(tag);\n  if (className !== undefined) node.className = className;\n  return node;\n}\n`,
  `function createNode<K extends keyof HTMLElementTagNameMap>(\n  tag: K,\n  className?: string,\n): HTMLElementTagNameMap[K] {\n  const node = document.createElement(tag);\n  if (className !== undefined) node.className = className;\n  return node;\n}\n\nconst INTERACTIVE_KEY_TARGET =\n  'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"]';\n\nfunction interactiveKeyTarget(target: EventTarget | null): boolean {\n  return target instanceof Element &&\n    (target.matches(INTERACTIVE_KEY_TARGET) ||\n      target.closest(INTERACTIVE_KEY_TARGET) !== null);\n}\n`,
  "Alternative interactive target helper",
);

source = replaceUnique(
  source,
  `    const target = event.target;\n    if (\n      target instanceof HTMLInputElement ||\n      target instanceof HTMLTextAreaElement ||\n      target instanceof HTMLSelectElement ||\n      event.ctrlKey ||`,
  `    const target = event.target;\n    if (\n      interactiveKeyTarget(target) ||\n      event.ctrlKey ||`,
  "Alternative key ownership guard",
);

fs.writeFileSync(path, source);

fs.writeFileSync(
  "tests/duel-alternative-input-ownership-contract.test.ts",
  `import { readFileSync } from "node:fs";\nimport { describe, expect, it } from "vitest";\n\nconst source = readFileSync(\n  new URL("../src/duel/alternative-battle-ui.ts", import.meta.url),\n  "utf8",\n);\n\ndescribe("Alternative Duel keyboard ownership contract", () => {\n  it("does not hijack interactive controls or contenteditable targets", () => {\n    expect(source).toContain("button, a[href]");\n    expect(source).toContain("[contenteditable]");\n    expect(source).toContain("[role=\\\"button\\\"]");\n    expect(source).toContain("interactiveKeyTarget(target)");\n  });\n});\n`,
);
