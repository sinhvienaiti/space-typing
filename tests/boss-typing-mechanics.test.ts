import { describe, expect, it } from "vitest";
import { difficultyFor } from "../src/campaign/difficulty";
import {
  bossActionIntervalMultiplier,
  bossTypingMechanicFor,
  bossWordLengthPreference,
  createBossTypingMechanicState,
  resolveBossWordMechanic,
  tickBossTypingMechanic,
} from "../src/boss/typing-mechanics";
import {
  createBossState,
  toBossHud,
} from "../src/boss/model";

const difficulty = difficultyFor({
  stage: 500,
  mode: "balanced",
  vocabularyLevel: 50,
  recentWpm: 60,
  recentAccuracy: 96,
});

describe("M16 boss typing mechanics", () => {
  it("maps World families to distinct phase mechanics", () => {
    expect(
      bossTypingMechanicFor("rainbow", "boss", 1),
    ).toBe("shield-sequence");
    expect(
      bossTypingMechanicFor("devil", "boss", 1),
    ).toBe("interrupt-charge");
    expect(
      bossTypingMechanicFor("cosmic", "boss", 1),
    ).toBe("weak-point");
    expect(
      bossTypingMechanicFor("shadow", "boss", 2),
    ).toBe("accuracy-curse");
  });

  it("uses only one mechanic per current boss phase", () => {
    const mechanic = createBossTypingMechanicState(
      "rainbow",
      "major-boss",
      1,
      difficulty,
    );
    expect(mechanic.id).toBe("shield-sequence");
    expect(mechanic.wordsRemaining).toBe(3);
    expect(mechanic.active).toBe(true);
  });

  it("requires the full shield word sequence before shield break", () => {
    let mechanic = createBossTypingMechanicState(
      "rainbow",
      "boss",
      1,
      difficulty,
    );
    const first = resolveBossWordMechanic(
      mechanic,
      true,
    );
    mechanic = first.state;

    expect(first.damageMultiplier).toBe(0);
    expect(first.shieldBroken).toBe(false);
    expect(mechanic.wordsRemaining).toBe(1);

    const second = resolveBossWordMechanic(
      mechanic,
      true,
    );
    expect(second.damageMultiplier).toBe(0);
    expect(second.shieldBroken).toBe(true);
    expect(second.state.active).toBe(false);
  });

  it("makes Interrupt Charge counterable and reports timeout", () => {
    const mechanic = createBossTypingMechanicState(
      "devil",
      "boss",
      1,
      difficulty,
    );
    expect(mechanic.maxTimer).toBeGreaterThan(0);

    const partial = tickBossTypingMechanic(
      mechanic,
      mechanic.maxTimer - 0.1,
    );
    expect(partial.expiredInterrupt).toBe(false);

    const expired = tickBossTypingMechanic(
      partial.state,
      0.2,
    );
    expect(expired.expiredInterrupt).toBe(true);
    expect(expired.state.active).toBe(false);

    const interrupted = resolveBossWordMechanic(
      mechanic,
      true,
    );
    expect(interrupted.interrupted).toBe(true);
    expect(interrupted.damageMultiplier).toBeGreaterThan(1);
    expect(interrupted.staggerSeconds).toBeGreaterThan(1);
  });

  it("turns Cosmic weak point into a long-word damage window", () => {
    const mechanic = createBossTypingMechanicState(
      "cosmic",
      "boss",
      1,
      difficulty,
    );
    expect(bossWordLengthPreference(mechanic)).toBe("long");

    const result = resolveBossWordMechanic(
      mechanic,
      true,
    );
    expect(result.damageMultiplier).toBeGreaterThan(1.5);
    expect(result.state.active).toBe(false);
  });

  it("turns rapid rage into short words and faster boss actions", () => {
    const mechanic = createBossTypingMechanicState(
      "devil",
      "major-boss",
      3,
      difficulty,
    );
    expect(mechanic.id).toBe("rapid-rage");
    expect(bossWordLengthPreference(mechanic)).toBe("short");
    expect(bossActionIntervalMultiplier(mechanic)).toBeLessThan(1);
  });

  it("rewards perfect accuracy during curse phase", () => {
    const mechanic = createBossTypingMechanicState(
      "shadow",
      "boss",
      2,
      difficulty,
    );
    const perfect = resolveBossWordMechanic(
      mechanic,
      true,
    );
    const missed = resolveBossWordMechanic(
      mechanic,
      false,
    );

    expect(perfect.damageMultiplier).toBeGreaterThan(
      missed.damageMultiplier,
    );
    expect(perfect.staggerSeconds).toBeGreaterThan(
      missed.staggerSeconds,
    );
  });

  it("exposes mechanic state through the existing Boss HUD contract", () => {
    const boss = createBossState(
      500,
      5,
      "boss",
      {
        id: "boss",
        en: "reactor",
        vi: "lò phản ứng",
        ipa: "/riˈæktɚ/",
      },
    );
    boss.typingMechanic =
      createBossTypingMechanicState(
        "devil",
        "boss",
        1,
        difficulty,
      );

    const hud = toBossHud(boss);
    expect(hud.mechanicLabel).toBe("Interrupt Charge");
    expect(hud.mechanicTimer).toBeGreaterThan(0);
  });
});
