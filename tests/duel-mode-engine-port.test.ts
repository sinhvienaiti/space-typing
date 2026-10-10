import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import { DuelModeEngineCombatPort } from "../server/duel/mode-engine-port";
import { DuelModeRuntime } from "../server/duel/mode-runtime";

describe("DuelModeEngineCombatPort", () => {
  it("reuses the existing projectile events and applies damage only at impact", () => {
    const engine = new DuelEngine({
      typingCannon: true,
      maxHull: 10,
      maxShield: 0,
      startingShield: 0,
      regulationSeconds: 240,
    });
    const combat = new DuelModeEngineCombatPort(engine);
    const runtime = new DuelModeRuntime(combat);
    const mode = runtime.switchMode("reflex");

    combat.setAuthorityClock(1_000);
    expect(
      runtime.scheduleServerAttack({
        modeEpoch: mode.modeEpoch,
        attackId: "reflex:impact-sync:p1",
        sourcePlayerId: "player-1",
        damage: 10,
        travelMs: 600,
        presentation: "primary-cannon",
      }),
    ).toEqual({ ok: true });

    expect(combat.drainEvents()).toEqual([
      {
        type: "cannon-fired",
        playerId: "player-1",
        shotId: "reflex:impact-sync:p1",
        travelMs: 600,
      },
    ]);
    expect(engine.snapshot().players["player-2"].hull).toBe(10);

    expect(combat.advanceAuthorityClock(1_599)).toEqual([]);
    expect(engine.snapshot().players["player-2"].hull).toBe(10);
    expect(engine.snapshot().round.status).toBe("active");

    const impact = combat.advanceAuthorityClock(1_600);
    expect(impact).toContainEqual({
      type: "cannon-hit",
      playerId: "player-1",
      targetPlayerId: "player-2",
      shotId: "reflex:impact-sync:p1",
    });
    expect(impact).toContainEqual({
      type: "round-ended",
      result: { status: "won", winnerId: "player-1" },
    });
    expect(engine.snapshot().players["player-2"].hull).toBe(0);
  });

  it("keeps shield/hull resolution inside DuelEngine", () => {
    const engine = new DuelEngine({
      maxHull: 100,
      maxShield: 40,
      startingShield: 20,
    });
    const combat = new DuelModeEngineCombatPort(engine);
    const runtime = new DuelModeRuntime(combat);
    const mode = runtime.switchMode("word-chain");

    combat.setAuthorityClock(10_000);
    runtime.scheduleServerAttack({
      modeEpoch: mode.modeEpoch,
      attackId: "chain:shared-defense:p2",
      sourcePlayerId: "player-2",
      damage: 25,
      travelMs: 500,
      presentation: "primary-cannon",
    });
    combat.drainEvents();
    combat.advanceAuthorityClock(10_500);

    const target = engine.snapshot().players["player-1"];
    expect(target.shield).toBe(0);
    expect(target.hull).toBe(95);
  });

  it("drops remaining same-tick projectiles after the shared engine ends the round", () => {
    const engine = new DuelEngine({
      maxHull: 8,
      maxShield: 0,
      startingShield: 0,
    });
    const combat = new DuelModeEngineCombatPort(engine);
    const runtime = new DuelModeRuntime(combat);
    const mode = runtime.switchMode("reflex");

    combat.setAuthorityClock(3_000);
    runtime.scheduleServerAttack({
      modeEpoch: mode.modeEpoch,
      attackId: "reflex:ko-first:p1",
      sourcePlayerId: "player-1",
      damage: 8,
      travelMs: 600,
      presentation: "primary-cannon",
    });
    runtime.scheduleServerAttack({
      modeEpoch: mode.modeEpoch,
      attackId: "reflex:late-return:p2",
      sourcePlayerId: "player-2",
      damage: 8,
      travelMs: 600,
      presentation: "primary-cannon",
    });
    combat.drainEvents();

    const events = combat.advanceAuthorityClock(3_600);
    expect(events.filter((event) => event.type === "round-ended")).toHaveLength(1);
    expect(events.filter((event) => event.type === "cannon-hit")).toHaveLength(1);
    expect(combat.pendingCount()).toBe(0);
    expect(engine.snapshot().round).toEqual({
      status: "won",
      winnerId: "player-1",
    });
    expect(engine.snapshot().players["player-1"].hull).toBe(8);
    expect(engine.snapshot().players["player-2"].hull).toBe(0);
  });

  it("drops pending alternative projectiles when a round runtime is disposed", () => {
    const engine = new DuelEngine();
    const combat = new DuelModeEngineCombatPort(engine);
    const runtime = new DuelModeRuntime(combat);
    const mode = runtime.switchMode("reflex");

    combat.setAuthorityClock(2_000);
    runtime.scheduleServerAttack({
      modeEpoch: mode.modeEpoch,
      attackId: "reflex:stale-round:p1",
      sourcePlayerId: "player-1",
      damage: 8,
      travelMs: 600,
      presentation: "primary-cannon",
    });
    expect(combat.pendingCount()).toBe(1);

    combat.clear();
    expect(combat.pendingCount()).toBe(0);
    expect(combat.advanceAuthorityClock(99_999)).toEqual([]);
  });
});
