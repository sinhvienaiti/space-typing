import { afterEach, describe, expect, it, vi } from "vitest";

class FakeStorage {
  getItem(): string | null {
    return null;
  }
  setItem(): void {}
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Admin testing policy and stored player settings", () => {
  it("loads the policy without patching Storage for the whole page", async () => {
    const { getItem, setItem } = FakeStorage.prototype;
    vi.stubGlobal("Storage", FakeStorage);
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { getElementById: () => null });
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      json: async () => ({ testing: { unlockAllStages: true } }),
    }));

    const bootstrap = await import("../src/admin/game-testing-policy-bootstrap");

    expect(FakeStorage.prototype.getItem).toBe(getItem);
    expect(FakeStorage.prototype.setItem).toBe(setItem);
    // Settings code asks for the policy explicitly instead.
    expect(
      JSON.parse(bootstrap.settingsWithAdminStagePolicy('{"musicVolume":0.4,"unlockAllStages":false}')),
    ).toEqual({ musicVolume: 0.4, unlockAllStages: true });
    expect(JSON.parse(bootstrap.settingsWithAdminStagePolicy(null))).toEqual({ unlockAllStages: true });
  });

  it("never stores the testing switch with the player's settings", async () => {
    const { settingsWithoutTestingOverrides } = await import("../src/admin/game-testing-policy-bootstrap");

    expect(
      JSON.parse(settingsWithoutTestingOverrides('{"sfxVolume":0.5,"unlockAllStages":true}')),
    ).toEqual({ sfxVolume: 0.5 });
    expect(settingsWithoutTestingOverrides("{not json")).toBe("{not json");
  });
});
