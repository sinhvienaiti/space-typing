import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../src/duel/alternative-battle-ui.ts", import.meta.url),
  "utf8",
);

describe("Alternative Duel keyboard ownership contract", () => {
  it("does not hijack interactive controls or contenteditable targets", () => {
    expect(source).toContain("button, a[href]");
    expect(source).toContain("[contenteditable]");
    expect(source).toContain("[role=\"button\"]");
    expect(source).toContain("interactiveKeyTarget(target)");
  });
});
