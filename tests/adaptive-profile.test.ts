import { describe, expect, it } from "vitest";
import {
  createAdaptiveProfile,
  recordAdaptiveResult,
  sanitizeAdaptiveProfile,
} from "../src/campaign/adaptive-profile";

describe("adaptive difficulty profile", () => {
  it("starts from a neutral reference profile", () => {
    expect(createAdaptiveProfile()).toEqual({
      smoothedWpm: 60,
      smoothedAccuracy: 96,
      samples: 0,
    });
  });

  it("uses the first valid result directly", () => {
    const result = recordAdaptiveResult(
      createAdaptiveProfile(),
      80,
      98,
    );
    expect(result).toEqual({
      smoothedWpm: 80,
      smoothedAccuracy: 98,
      samples: 1,
    });
  });

  it("smooths later results instead of reacting sharply", () => {
    const first = recordAdaptiveResult(
      createAdaptiveProfile(),
      80,
      98,
    );
    const second = recordAdaptiveResult(first, 40, 86);

    expect(second.smoothedWpm).toBe(70);
    expect(second.smoothedAccuracy).toBe(95);
    expect(second.samples).toBe(2);
  });

  it("sanitizes imported/local profile values to safe bounds", () => {
    expect(
      sanitizeAdaptiveProfile({
        smoothedWpm: 999,
        smoothedAccuracy: -10,
        samples: -4,
      }),
    ).toEqual({
      smoothedWpm: 220,
      smoothedAccuracy: 60,
      samples: 0,
    });
  });
});
