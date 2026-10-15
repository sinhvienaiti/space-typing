import { describe, expect, it } from "vitest";
import {
  DEFAULT_RUNTIME_TESTING_POLICY,
  loadRuntimeTestingPolicy,
  runtimeTestingPolicy,
  sanitizeRuntimeTestingPolicy,
} from "../src/admin/game-testing-policy";
import {
  createStarterCharacterState,
  selectCharacter,
} from "../src/characters/state";

function response(body: unknown): typeof fetch {
  return (async () => ({
    ok: true,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("published real-game testing policy", () => {
  it("uses safe product defaults when the runtime envelope has no testing policy", () => {
    expect(sanitizeRuntimeTestingPolicy({})).toEqual(
      DEFAULT_RUNTIME_TESTING_POLICY,
    );
  });

  it("loads published stage and ship overrides from the runtime envelope", async () => {
    const policy = await loadRuntimeTestingPolicy(
      response({
        testing: {
          unlockAllStages: true,
          unlockAllShips: false,
        },
      }),
    );

    expect(policy).toEqual({
      unlockAllStages: true,
      unlockAllShips: false,
    });
    expect(runtimeTestingPolicy()).toEqual(policy);
  });

  it("does not grant ship ownership when all-ships testing is disabled", async () => {
    await loadRuntimeTestingPolicy(
      response({ testing: { unlockAllStages: false, unlockAllShips: false } }),
    );
    const starter = createStarterCharacterState();
    const selected = selectCharacter(starter, "aegis");

    expect(selected.selected).toBe("vanguard");
    expect(selected.unlocked).toEqual(["vanguard"]);
  });

  it("allows testing-only ship selection without mutating unlocked ownership", async () => {
    await loadRuntimeTestingPolicy(
      response({ testing: { unlockAllStages: false, unlockAllShips: true } }),
    );
    const starter = createStarterCharacterState();
    const selected = selectCharacter(starter, "aegis");

    expect(selected.selected).toBe("aegis");
    expect(selected.unlocked).toEqual(["vanguard"]);
  });
});
