import { describe, expect, it } from "vitest";
import {
  ANNOUNCER_ASSET_PATHS,
  DEFAULT_ANNOUNCER_ASSET,
  PriorityKillChain,
  announcerEventForChainCount,
} from "../src/audio/announcer";

describe("priority kill announcer", () => {
  it("maps the first five chain milestones", () => {
    expect(announcerEventForChainCount(1)).toBeNull();
    expect(announcerEventForChainCount(2)).toBe("double-kill");
    expect(announcerEventForChainCount(3)).toBe("triple-kill");
    expect(announcerEventForChainCount(4)).toBe("ultra-kill");
    expect(announcerEventForChainCount(5)).toBe("rampage");
    expect(announcerEventForChainCount(6)).toBe("monster-kill");
    expect(announcerEventForChainCount(7)).toBeNull();
  });

  it("resets the chain after the configured window expires", () => {
    const chain = new PriorityKillChain(8);

    expect(chain.registerKill(1)).toBeNull();
    expect(chain.registerKill(5)).toBe("double-kill");
    expect(chain.registerKill(14)).toBeNull();
    expect(chain.getCount()).toBe(1);
  });

  it("uses one replaceable base audio asset until dedicated sounds are mapped", () => {
    expect(new Set(Object.values(ANNOUNCER_ASSET_PATHS))).toEqual(
      new Set([DEFAULT_ANNOUNCER_ASSET]),
    );
  });
});
