import { describe, expect, it, vi } from "vitest";
import {
  installDirectTestLabLaunch,
  shouldDirectLaunchTestLab,
} from "../src/test-lab/direct-launch";

describe("direct Test Lab launch", () => {
  it("recognizes only the explicit Test Lab deep-link", () => {
    expect(shouldDirectLaunchTestLab("?testLab=1")).toBe(true);
    expect(shouldDirectLaunchTestLab("?foo=bar&testLab=1")).toBe(true);
    expect(shouldDirectLaunchTestLab("?testLab=0")).toBe(false);
    expect(shouldDirectLaunchTestLab("?testLab=true")).toBe(false);
    expect(shouldDirectLaunchTestLab("")).toBe(false);
  });

  it("does nothing when the deep-link is absent", () => {
    const findButton = vi.fn(() => null);
    const observe = vi.fn(() => () => undefined);
    const scheduleTimeout = vi.fn(() => () => undefined);

    installDirectTestLabLaunch({
      search: "?foo=bar",
      findButton,
      observe,
      scheduleTimeout,
      enqueue: (callback) => callback(),
    });

    expect(findButton).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
    expect(scheduleTimeout).not.toHaveBeenCalled();
  });

  it("waits for the canonical Test Lab button and clicks it once", () => {
    let target: { click(): void } | null = null;
    let onMutation: () => void = () => undefined;
    const click = vi.fn();
    const stopObserving = vi.fn();
    const cancelTimeout = vi.fn();

    const dispose = installDirectTestLabLaunch({
      search: "?testLab=1",
      findButton: () => target,
      observe: (callback) => {
        onMutation = callback;
        return stopObserving;
      },
      scheduleTimeout: () => cancelTimeout,
      enqueue: (callback) => callback(),
    });

    expect(click).not.toHaveBeenCalled();
    target = { click };
    onMutation();
    onMutation();

    expect(click).toHaveBeenCalledTimes(1);
    expect(stopObserving).toHaveBeenCalledTimes(1);
    expect(cancelTimeout).toHaveBeenCalledTimes(1);

    dispose();
    expect(stopObserving).toHaveBeenCalledTimes(1);
  });
});
