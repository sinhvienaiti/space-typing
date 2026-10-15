import {
  loadRuntimeTestingPolicy,
  runtimeTestingPolicy,
} from "./game-testing-policy";

const SETTINGS_KEY = "spaceTypingSettingsV1";
const STORAGE_PATCH_MARKER = Symbol.for(
  "space-typing.admin-testing-policy-storage-bridge",
);

type PatchedStoragePrototype = Storage & {
  [STORAGE_PATCH_MARKER]?: boolean;
};

function settingsWithAdminStagePolicy(raw: string | null): string {
  let parsed: Record<string, unknown> = {};
  if (raw !== null) {
    try {
      const value = JSON.parse(raw) as unknown;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
      }
    } catch {
      parsed = {};
    }
  }
  return JSON.stringify({
    ...parsed,
    unlockAllStages: runtimeTestingPolicy().unlockAllStages,
  });
}

function settingsWithoutTestingOverrides(raw: string): string {
  try {
    const value = JSON.parse(raw) as unknown;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return raw;
    }
    const next = { ...(value as Record<string, unknown>) };
    delete next.unlockAllStages;
    return JSON.stringify(next);
  } catch {
    return raw;
  }
}

function installLegacySettingsCompatibilityBridge(): void {
  if (typeof window === "undefined" || typeof Storage === "undefined") return;

  const prototype = Storage.prototype as PatchedStoragePrototype;
  if (prototype[STORAGE_PATCH_MARKER] === true) return;

  const local = window.localStorage;
  const getItem = Storage.prototype.getItem;
  const setItem = Storage.prototype.setItem;

  Storage.prototype.getItem = function patchedGetItem(key: string): string | null {
    const raw = getItem.call(this, key);
    if (this !== local || key !== SETTINGS_KEY) return raw;
    return settingsWithAdminStagePolicy(raw);
  };

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string): void {
    if (this === local && key === SETTINGS_KEY) {
      setItem.call(this, key, settingsWithoutTestingOverrides(value));
      return;
    }
    setItem.call(this, key, value);
  };

  Object.defineProperty(prototype, STORAGE_PATCH_MARKER, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
}

function hideLegacyPlayerTestingControl(): void {
  const legacy = document.getElementById("unlockAllStages");
  legacy?.closest(".settings-section")?.setAttribute("hidden", "");
}

if (typeof window !== "undefined") {
  await loadRuntimeTestingPolicy();
  installLegacySettingsCompatibilityBridge();
  hideLegacyPlayerTestingControl();
}
