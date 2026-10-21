import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A localStorage stand-in; `refuse` makes the next writes of these keys fail as a full storage does. */
function memoryStorage() {
  const data = new Map<string, string>();
  const refuse = new Set<string>();
  return {
    data,
    refuse,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (refuse.has(key)) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

/** Browsers that block site data throw as soon as the page touches localStorage. */
function blockStorage(): void {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("Access is denied for this document.", "SecurityError");
    },
  });
}

/** Firefox with a damaged or busy profile store: localStorage is there, its reads throw. */
function refuseReads(storage: ReturnType<typeof memoryStorage>) {
  return {
    ...storage,
    getItem: (): string | null => {
      throw new DOMException("The storage is busy.", "NS_ERROR_STORAGE_BUSY");
    },
  };
}

async function safeStorage() {
  vi.resetModules();
  return import("../src/platform/safe-storage");
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("safe browser storage", () => {
  it("blocked storage never throws: this visit keeps what it wrote, and it is reported once", async () => {
    blockStorage();
    const { safeLocalStorage, onStorageTrouble } = await safeStorage();

    expect(safeLocalStorage.readItem("spaceTypingGameplayModeV1")).toBeUndefined();
    expect(safeLocalStorage.getItem("spaceTypingGameplayModeV1")).toBeNull();
    expect(safeLocalStorage.setItem("spaceTypingGameplayModeV1", "recall")).toBe(false);
    expect(safeLocalStorage.getItem("spaceTypingGameplayModeV1")).toBe("recall");
    expect(safeLocalStorage.writeJson("spaceTypingSettingsV1", { musicVolume: 0.4 })).toBe(false);
    expect(safeLocalStorage.readJson("spaceTypingSettingsV1")).toEqual({ musicVolume: 0.4 });
    expect(safeLocalStorage.removeItem("spaceTypingGameplayModeV1")).toBe(false);
    expect(safeLocalStorage.getItem("spaceTypingGameplayModeV1")).toBeNull();

    // A journal is stored or not written: nothing reaches memory either.
    expect(safeLocalStorage.commitItem("spaceTypingExpeditionRunV1", "{}")).toBe(false);
    expect(safeLocalStorage.getItem("spaceTypingExpeditionRunV1")).toBeNull();

    const troubles: unknown[] = [];
    onStorageTrouble((trouble) => troubles.push(trouble));
    expect(troubles).toEqual([{ area: "local", kind: "blocked" }]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("a full storage keeps the stored value; this visit reads the new one until a write succeeds", async () => {
    const storage = memoryStorage();
    storage.data.set("spaceTypingCustomVocabularyV1", "old words");
    storage.refuse.add("spaceTypingCustomVocabularyV1");
    vi.stubGlobal("localStorage", storage);
    const { safeLocalStorage, onStorageTrouble } = await safeStorage();
    const troubles: unknown[] = [];
    onStorageTrouble((trouble) => troubles.push(trouble));

    expect(safeLocalStorage.setItem("spaceTypingCustomVocabularyV1", "new words")).toBe(false);
    expect(safeLocalStorage.setItem("spaceTypingCustomVocabularyV1", "newer words")).toBe(false);
    expect(storage.data.get("spaceTypingCustomVocabularyV1")).toBe("old words");
    expect(safeLocalStorage.getItem("spaceTypingCustomVocabularyV1")).toBe("newer words");
    expect(troubles).toEqual([{ area: "local", kind: "full" }]);
    expect(warn).toHaveBeenCalledTimes(1);

    storage.refuse.clear();
    expect(safeLocalStorage.setItem("spaceTypingCustomVocabularyV1", "saved words")).toBe(true);
    expect(storage.data.get("spaceTypingCustomVocabularyV1")).toBe("saved words");
    expect(safeLocalStorage.getItem("spaceTypingCustomVocabularyV1")).toBe("saved words");
  });

  it("a refused journal write changes nothing, not even this visit's copy", async () => {
    const storage = memoryStorage();
    storage.data.set("spaceTypingWalletSyncV1:a", "journal 1");
    storage.refuse.add("spaceTypingWalletSyncV1:a");
    vi.stubGlobal("localStorage", storage);
    const { safeLocalStorage } = await safeStorage();

    expect(safeLocalStorage.commitItem("spaceTypingWalletSyncV1:a", "journal 2")).toBe(false);
    expect(safeLocalStorage.getItem("spaceTypingWalletSyncV1:a")).toBe("journal 1");
  });

  it("a settings save that fails keeps the stored settings whole; this visit uses the new ones", async () => {
    const storage = memoryStorage();
    const before = {
      spaceTypingSettingsV1: JSON.stringify({ musicVolume: 0.26 }),
      spaceTypingGameplayModeV1: "combat",
      spaceTypingRecallSettingsV1: JSON.stringify({ difficulty: "easy" }),
    };
    for (const [key, value] of Object.entries(before)) storage.data.set(key, value);
    // The volume is stored, then the browser refuses the next key.
    storage.refuse.add("spaceTypingGameplayModeV1");
    vi.stubGlobal("localStorage", storage);
    const { safeLocalStorage } = await safeStorage();

    const next = {
      spaceTypingSettingsV1: JSON.stringify({ musicVolume: 0.8 }),
      spaceTypingGameplayModeV1: "recall",
      spaceTypingRecallSettingsV1: JSON.stringify({ difficulty: "hard" }),
    };
    expect(safeLocalStorage.setItems(next)).toBe(false);
    expect(Object.fromEntries(storage.data)).toEqual(before);
    for (const [key, value] of Object.entries(next)) expect(safeLocalStorage.getItem(key)).toBe(value);

    storage.refuse.clear();
    expect(safeLocalStorage.setItems(next)).toBe(true);
    expect(Object.fromEntries(storage.data)).toEqual(next);
  });

  it("a new vocabulary source is not stored without its custom words", async () => {
    const storage = memoryStorage();
    storage.refuse.add("spaceTypingVocabularySourceV1");
    vi.stubGlobal("localStorage", storage);
    const { safeLocalStorage } = await safeStorage();

    expect(
      safeLocalStorage.setItems({
        spaceTypingCustomVocabularyV1: "comet - sao chổi",
        spaceTypingVocabularySourceV1: JSON.stringify({ mode: "custom" }),
      }),
    ).toBe(false);
    // The custom words written first were taken back out.
    expect(storage.data.size).toBe(0);
  });

  it("reads of corrupt JSON and writes of unserializable values answer instead of throwing", async () => {
    const storage = memoryStorage();
    storage.data.set("spaceTypingTitleRestoreV1", "{not json");
    vi.stubGlobal("localStorage", storage);
    const { safeLocalStorage } = await safeStorage();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(safeLocalStorage.readJson("spaceTypingTitleRestoreV1")).toBeNull();
    expect(safeLocalStorage.readJson("missing")).toBeNull();
    expect(safeLocalStorage.writeJson("spaceTypingTitleRestoreV1", cyclic)).toBe(false);
    expect(storage.data.get("spaceTypingTitleRestoreV1")).toBe("{not json");
  });

  it("session storage has its own copy and its own report", async () => {
    const local = memoryStorage();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", undefined);
    const { safeLocalStorage, safeSessionStorage } = await safeStorage();

    expect(safeSessionStorage.setItem("space-typing:duel-reconnect-token", "token")).toBe(false);
    expect(safeSessionStorage.getItem("space-typing:duel-reconnect-token")).toBe("token");
    expect(safeLocalStorage.getItem("space-typing:duel-reconnect-token")).toBeNull();
    // No storage at all (not a browser) is not a failure to report.
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("a browser that refuses reads", () => {
  it("readItem tells a refused read apart from a missing key", async () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    const { safeLocalStorage } = await safeStorage();
    expect(safeLocalStorage.readItem("spaceTypingPlayerSaveRecoveryV3")).toBeNull();

    vi.stubGlobal("localStorage", refuseReads(storage));
    expect(safeLocalStorage.readItem("spaceTypingPlayerSaveRecoveryV3")).toBeUndefined();
    expect(safeLocalStorage.getItem("spaceTypingPlayerSaveRecoveryV3")).toBeNull();
  });

  it("an unreadable recovery mirror stops the account load instead of starting a new save", async () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", refuseReads(storage));
    await safeStorage();
    const { CorruptAccountStateError, resolveStoredPlayerSave } = await import("../src/persistence/player-save");

    expect(() => resolveStoredPlayerSave(undefined)).toThrow(CorruptAccountStateError);
    expect(storage.data.size).toBe(0);

    // Readable and empty: the first save of a new player.
    vi.stubGlobal("localStorage", storage);
    expect(resolveStoredPlayerSave(undefined).save.lastSaveReason).toBe("migration");
  });
});

describe("boot with blocked storage", () => {
  it("the storage reads made while the game's modules load never throw", async () => {
    blockStorage();
    const { safeLocalStorage } = await safeStorage();
    // Reads its preference as the module loads.
    await import("../src/ui/motion-preference");
    const { expansionV2FeatureEnabled } = await import("../src/expansion-v2/feature-flags");
    const { createExpansionV2Profile, loadExpansionV2Profile } = await import("../src/expansion-v2/profile-store");
    const { createDefaultCampaignProgress, loadCampaignProgress } = await import("../src/campaign/progress");
    const { ExpeditionSession, ExpeditionStorageAdapter } = await import("../src/expedition/session");

    expect(expansionV2FeatureEnabled(safeLocalStorage, "")).toBe(true);
    expect(loadExpansionV2Profile(safeLocalStorage)).toEqual(createExpansionV2Profile());
    expect(loadCampaignProgress()).toEqual(createDefaultCampaignProgress());
    const session = new ExpeditionSession(new ExpeditionStorageAdapter(safeLocalStorage), "tab-a");
    expect(session.hasResumableRun()).toBe(false);
  });
});

describe("the game's storage wiring", () => {
  const SRC = join(__dirname, "..", "src");
  const main = readFileSync(join(SRC, "main.ts"), "utf8");

  function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? sources(join(dir, entry.name))
        : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : [],
    );
  }

  /** A top-level function or listener of main.ts, up to its closing line. */
  function body(signature: string, end = "\n}\n"): string {
    const start = main.indexOf(signature);
    expect(start, signature).toBeGreaterThan(-1);
    return main.slice(start, main.indexOf(end, start));
  }

  it("reaches browser storage only through platform/safe-storage", () => {
    const direct = sources(SRC)
      .filter((file) => !file.endsWith(join("platform", "safe-storage.ts")))
      .filter((file) => {
        // Code only: comments and strings may name the storage.
        const code = readFileSync(file, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, "\"\"")
          .replace(/\/\/.*$/gm, "");
        return /\b(?:localStorage|sessionStorage)\b/.test(code);
      })
      .map((file) => relative(SRC, file));
    expect(direct).toEqual([]);
  });

  it("stores the Settings dialog in one write, and a vocabulary source with its words", () => {
    const commit = body("async function commitSettingsDraft(");
    expect(commit.match(/safeLocalStorage\.setItems\(/g)).toHaveLength(1);
    expect(commit).toContain("...settingsEntries(),");
    expect(commit).toContain("...recallPreferenceEntries(),");
    expect(commit).not.toMatch(/\bsetItem\(|saveSettings\(\)|saveRecallPreferences\(\)/);

    expect(main).not.toMatch(/setItem\((?:SETTINGS_KEY|GAMEPLAY_MODE_KEY|RECALL_SETTINGS_KEY|SOURCE_KEY|CUSTOM_KEY)\b/);
    expect(body('byId("saveCustom").addEventListener(', "\n});\n")).toContain("saveVocabularySource(input.value);");
  });
});
