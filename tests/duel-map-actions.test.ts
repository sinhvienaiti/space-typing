import { describe, expect, it } from "vitest";
import {
  DUEL_ACTIONS_BY_ID,
} from "../src/duel/actions";
import { DuelEngine } from "../src/duel/engine";
import {
  duelActionDefinitionForMap,
  duelActionMapForMap,
  duelActionsForMap,
  validateDuelMapActionDefinitions,
} from "../src/duel/map-actions";
import {
  DUEL_MAPS,
  type DuelMapId,
} from "../src/duel/maps";
import type { DuelActionOffer } from "../src/duel/model";

const MAP_IDS = Object.keys(DUEL_MAPS) as DuelMapId[];

describe("Duel map word affinity", () => {
  it("validates all map action overlays as balanced contract-preserving definitions", () => {
    expect(validateDuelMapActionDefinitions()).toEqual([]);
  });

  it("gives every map real themed Defense words instead of metadata-only affinity", () => {
    for (const mapId of MAP_IDS) {
      const words = [
        duelActionDefinitionForMap(mapId, "shield"),
        duelActionDefinitionForMap(mapId, "reflect"),
        duelActionDefinitionForMap(mapId, "barrier"),
      ];

      expect(
        words.every((action) => action !== undefined),
      ).toBe(true);
      expect(
        new Set(
          words.map((action) => action!.answerToken),
        ).size,
      ).toBe(3);
      expect(
        words.every(
          (action) =>
            action!.answerToken.length >= 6 &&
            action!.answerToken.length <= 8,
        ),
      ).toBe(true);
    }
  });

  it("preserves combat power, cost, cooldown and effect while changing the typed presentation", () => {
    for (const mapId of MAP_IDS) {
      for (const actionId of [
        "shield",
        "reflect",
        "barrier",
      ] as const) {
        const base = DUEL_ACTIONS_BY_ID.get(actionId)!;
        const mapped =
          duelActionDefinitionForMap(mapId, actionId)!;

        expect(mapped.id).toBe(base.id);
        expect(mapped.effectId).toBe(base.effectId);
        expect(mapped.energyCost).toBe(base.energyCost);
        expect(mapped.cooldownSeconds).toBe(
          base.cooldownSeconds,
        );
        expect(mapped.resolveMode).toBe(base.resolveMode);
        expect(mapped.typingCostBand).toBe(
          base.typingCostBand,
        );
        expect(mapped.answerToken).not.toBe(
          base.answerToken,
        );
      }
    }
  });

  it("keeps non-affinity actions unchanged", () => {
    for (const mapId of MAP_IDS) {
      for (const actionId of [
        "laser",
        "repair",
        "energy",
        "disrupt",
        "fate-crystal",
        "black-hole",
      ]) {
        const base = DUEL_ACTIONS_BY_ID.get(actionId)!;
        const mapped =
          duelActionDefinitionForMap(mapId, actionId)!;
        expect(mapped.answerToken).toBe(base.answerToken);
        expect(mapped.effectId).toBe(base.effectId);
      }
    }
  });

  it("returns a complete action registry for every map", () => {
    const baseIds = [...DUEL_ACTIONS_BY_ID.keys()].sort();
    for (const mapId of MAP_IDS) {
      expect(
        duelActionsForMap(mapId)
          .map((action) => action.id)
          .sort(),
      ).toEqual(baseIds);
    }
  });

  it("uses curated FINAL V3 examples with equivalent typing effort", () => {
    expect(
      duelActionDefinitionForMap(
        "frost-wastes",
        "shield",
      )?.displayLabel,
    ).toBe("ICE WALL");
    expect(
      duelActionDefinitionForMap(
        "inferno-rift",
        "shield",
      )?.displayLabel,
    ).toBe("FIRE WARD");
    expect(
      duelActionDefinitionForMap(
        "ocean-abyss",
        "reflect",
      )?.displayLabel,
    ).toBe("WAVE VEIL");
    expect(
      duelActionDefinitionForMap(
        "celestial-void",
        "barrier",
      )?.displayLabel,
    ).toBe("STAR WARD");
  });

  it("makes the production engine accept the map word and reject the stale base word", () => {
    const engine = new DuelEngine({
      mapId: "frost-wastes",
      startingEnergy: 100,
      actions: duelActionMapForMap("frost-wastes"),
    });
    const offer: DuelActionOffer = {
      instanceId: "frost:shield",
      actionId: "shield",
      ownerId: "player-1",
      status: "available",
      typedPrefix: "",
      slotIndex: 0,
      shared: false,
    };
    engine.setPrivateOffers("player-1", [offer]);

    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 1,
      char: "s",
    });
    let events = engine.step(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "typing-miss",
        playerId: "player-1",
      }),
    );

    engine.setPrivateOffers("player-1", [offer]);
    let sequence = 2;
    for (const char of "icewall") {
      engine.enqueueIntent({
        type: "TYPE_CHAR",
        playerId: "player-1",
        sequence,
        char,
      });
      sequence += 1;
    }
    events = engine.step(0);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "action-completed",
        playerId: "player-1",
        actionId: "shield",
      }),
    );
    expect(
      engine.snapshot().inventories["player-1"].defense,
    ).toHaveLength(1);
  });
});
