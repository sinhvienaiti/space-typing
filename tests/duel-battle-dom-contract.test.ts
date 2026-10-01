import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("Duel battle DOM contract", () => {
  it("declares every required static FX node before querying it", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL("../src/duel/battle-ui.ts", import.meta.url),
      ),
      "utf8",
    );

    expect(source).toContain(
      'id="duelEventFx" class="duel-event-fx"',
    );
    expect(source).toContain('fx: byId("duelEventFx")');
  });
});
