const DIRECT_TEST_LAB_PARAM = "testLab";
const DIRECT_TEST_LAB_VALUE = "1";
const TEST_LAB_BUTTON_ID = "testLabButton";
const DIRECT_LAUNCH_TIMEOUT_MS = 10_000;

type TestLabLaunchTarget = {
  click(): void;
};

type DirectLaunchRuntime = {
  search: string;
  findButton: () => TestLabLaunchTarget | null;
  observe: (callback: () => void) => () => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => () => void;
  enqueue: (callback: () => void) => void;
};

export function shouldDirectLaunchTestLab(search: string): boolean {
  return (
    new URLSearchParams(search).get(DIRECT_TEST_LAB_PARAM) ===
    DIRECT_TEST_LAB_VALUE
  );
}

function browserRuntime(): DirectLaunchRuntime {
  return {
    search: typeof window === "undefined" ? "" : window.location.search,
    findButton: () => {
      if (typeof document === "undefined") return null;
      return document.getElementById(TEST_LAB_BUTTON_ID) as TestLabLaunchTarget | null;
    },
    observe: (callback) => {
      if (
        typeof MutationObserver === "undefined" ||
        typeof document === "undefined"
      ) {
        return () => undefined;
      }
      const observer = new MutationObserver(() => callback());
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      return () => observer.disconnect();
    },
    scheduleTimeout: (callback, delayMs) => {
      if (typeof window === "undefined") return () => undefined;
      const timeoutId = window.setTimeout(callback, delayMs);
      return () => window.clearTimeout(timeoutId);
    },
    enqueue: (callback) => {
      if (typeof queueMicrotask === "function") {
        queueMicrotask(callback);
        return;
      }
      void Promise.resolve().then(callback);
    },
  };
}

export function installDirectTestLabLaunch(
  overrides: Partial<DirectLaunchRuntime> = {},
): () => void {
  const runtime = { ...browserRuntime(), ...overrides };
  if (!shouldDirectLaunchTestLab(runtime.search)) return () => undefined;

  let disposed = false;
  let stopObserving: () => void = () => undefined;
  let cancelTimeout: () => void = () => undefined;

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    stopObserving();
    cancelTimeout();
  };

  const tryOpen = (): boolean => {
    if (disposed) return false;
    const button = runtime.findButton();
    if (button === null) return false;

    dispose();
    // The Test Lab button is appended before its click listener is registered.
    // Queue the canonical click until mountTestLab() has finished synchronously.
    runtime.enqueue(() => button.click());
    return true;
  };

  if (tryOpen()) return dispose;

  stopObserving = runtime.observe(() => {
    tryOpen();
  });
  cancelTimeout = runtime.scheduleTimeout(dispose, DIRECT_LAUNCH_TIMEOUT_MS);

  // Close the tiny gap between the initial lookup and observer installation.
  tryOpen();
  return dispose;
}
