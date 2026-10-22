import { describe, expect, it } from "vitest";
import { gates, play } from "./td/balance";

/**
 * BUILD_1A6 §12 gates 4, 5, 6 and 7 on the report's seeds (`pnpm td:balance` prints the same table): the standard
 * plan in Cân bằng, once typing at 35 WPM, 95 % and once never typing, five seeds, four nights. The no-typing bot
 * holds every night; the typing bot never types more than 8 s in any 20 s, types 30–45 % of the day and 15–25 % of
 * the night, and has earned 25 % more gold, wood and food by the third nightfall; no call invariant breaks, no
 * command is refused.
 */
describe("the bots' gates (BUILD_1A6 §12)", () => {
  const nights = 4;
  const typing = play("balanced", true, 5, nights);
  const idle = play("balanced", false, 5, nights);

  for (const gate of gates(typing, idle, nights)) {
    it(`gate ${gate.id}: ${gate.name} — ${gate.target} (${gate.measured})`, () => {
      expect(gate.pass, gate.measured).toBe(true);
    });
  }

  it("both bots build, raise the Bastion with gold and hire; only the typing bot types, and it gets every kind of call done", () => {
    for (const r of [typing, idle]) {
      for (const run of r.runs) {
        const kinds = new Set(run.log.map((command) => command.t));
        for (const kind of ["build", "markTree", "hire", "assignUnit", "sandbox", "sellFood"]) expect(kinds, kind).toContain(kind);
        expect(run.world.buildings.level[0]).toBeGreaterThanOrEqual(2);
        expect(kinds.has("key")).toBe(r.typing);
      }
    }
    for (const kind of [0, 2, 3]) expect(typing.runs.reduce((n, run) => n + (run.callsByKind[kind]?.finished ?? 0), 0), "kind " + kind).toBeGreaterThan(0);
  });
});
