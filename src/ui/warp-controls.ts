export const WARP_CONTROL_ACTIONS = {
  practiceButton: "practice",
  retryPracticeButton: "retryPractice",
  warpRefuelButton: "refuel",
  warpReserveToggle: "reserve",
  warpAbandonButton: "abandon",
  warpClockButton: "clock",
} as const;

type Action = (typeof WARP_CONTROL_ACTIONS)[keyof typeof WARP_CONTROL_ACTIONS];

/** One UI gate also covers the confirmation window before an IDB intent exists. */
export function installWarpControls(
  button: (id: string) => HTMLButtonElement,
  actions: Record<Action, () => Promise<void>>,
  notice: (message: string) => void,
  refresh: () => void,
): () => void {
  let pending = false;
  const removers = Object.entries(WARP_CONTROL_ACTIONS).map(([id, action]) => {
    const element = button(id);
    const listener = async () => {
      if (pending || element.disabled) return;
      pending = true;
      try {
        await actions[action]();
      } catch (error) {
        notice(error instanceof Error ? error.message : "Warp action failed");
      } finally {
        pending = false;
        refresh();
      }
    };
    element.addEventListener("click", listener);
    return () => element.removeEventListener("click", listener);
  });
  return () => removers.forEach((remove) => remove());
}
