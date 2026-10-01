import {
  DUEL_ACTIONS,
  DUEL_ACTIONS_BY_ID,
} from "./actions";
import {
  hasDuelTokenPrefixConflict,
  isValidDuelAnswerToken,
  normalizeDuelAnswerToken,
} from "./typing";
import type {
  DuelActionDefinition,
} from "./model";
import {
  DUEL_MAPS,
  duelMapProfile,
  type DuelMapId,
} from "./maps";

const AFFINITY_ACTION_IDS = [
  "shield",
  "reflect",
  "barrier",
] as const;

function affinityLabel(value: string): string {
  return value.replaceAll("-", " ").toUpperCase();
}

function buildActions(
  mapId: DuelMapId,
): readonly DuelActionDefinition[] {
  const profile = duelMapProfile(mapId);
  const overrideById = new Map<
    string,
    { displayLabel: string; answerToken: string }
  >();

  AFFINITY_ACTION_IDS.forEach((actionId, index) => {
    const affinity = profile.wordAffinity[index];
    if (affinity === undefined) return;
    const displayLabel = affinityLabel(affinity);
    overrideById.set(actionId, {
      displayLabel,
      answerToken: normalizeDuelAnswerToken(displayLabel),
    });
  });

  return Object.freeze(
    DUEL_ACTIONS.map((action) => {
      const override = overrideById.get(action.id);
      if (override === undefined) return action;
      return Object.freeze({
        ...action,
        ...override,
        mapPresentationId:
          profile.visualIdentityId + ":" + action.id,
      });
    }),
  );
}

const MAP_ACTIONS: Readonly<
  Record<DuelMapId, readonly DuelActionDefinition[]>
> = Object.freeze(
  Object.fromEntries(
    (Object.keys(DUEL_MAPS) as DuelMapId[]).map(
      (mapId) => [mapId, buildActions(mapId)],
    ),
  ) as Record<
    DuelMapId,
    readonly DuelActionDefinition[]
  >,
);

const MAP_ACTIONS_BY_ID: Readonly<
  Record<
    DuelMapId,
    ReadonlyMap<string, DuelActionDefinition>
  >
> = Object.freeze(
  Object.fromEntries(
    (Object.keys(DUEL_MAPS) as DuelMapId[]).map(
      (mapId) => [
        mapId,
        new Map(
          MAP_ACTIONS[mapId].map((action) => [
            action.id,
            action,
          ]),
        ),
      ],
    ),
  ) as Record<
    DuelMapId,
    ReadonlyMap<string, DuelActionDefinition>
  >,
);

export function duelActionsForMap(
  mapId: DuelMapId,
): readonly DuelActionDefinition[] {
  return MAP_ACTIONS[mapId];
}

export function duelActionMapForMap(
  mapId: DuelMapId,
): ReadonlyMap<string, DuelActionDefinition> {
  return MAP_ACTIONS_BY_ID[mapId];
}

export function duelActionDefinitionForMap(
  mapId: DuelMapId,
  actionId: string,
): DuelActionDefinition | undefined {
  return (
    MAP_ACTIONS_BY_ID[mapId].get(actionId) ??
    DUEL_ACTIONS_BY_ID.get(actionId)
  );
}

export function validateDuelMapActionDefinitions(): string[] {
  const errors: string[] = [];

  for (const mapId of Object.keys(DUEL_MAPS) as DuelMapId[]) {
    const actions = MAP_ACTIONS[mapId];
    const tokenOwners = new Map<string, string>();

    for (const action of actions) {
      if (!isValidDuelAnswerToken(action.answerToken)) {
        errors.push(
          mapId +
            ":" +
            action.id +
            ": invalid map answer token.",
        );
      }
      if (
        normalizeDuelAnswerToken(action.displayLabel) !==
        action.answerToken
      ) {
        errors.push(
          mapId +
            ":" +
            action.id +
            ": label/token mismatch.",
        );
      }
      const prior = tokenOwners.get(action.answerToken);
      if (prior !== undefined && prior !== action.id) {
        errors.push(
          mapId +
            ": duplicate token " +
            action.answerToken +
            " for " +
            prior +
            " and " +
            action.id +
            ".",
        );
      }
      tokenOwners.set(action.answerToken, action.id);
    }

    if (
      hasDuelTokenPrefixConflict(
        actions.map((action) => action.answerToken),
      )
    ) {
      errors.push(
        mapId +
          ": map action overlay introduced a token prefix conflict.",
      );
    }

    for (const actionId of AFFINITY_ACTION_IDS) {
      const base = DUEL_ACTIONS_BY_ID.get(actionId);
      const mapped = MAP_ACTIONS_BY_ID[mapId].get(actionId);
      if (base === undefined || mapped === undefined) {
        errors.push(
          mapId + ":" + actionId + ": missing affinity action.",
        );
        continue;
      }
      if (
        mapped.id !== base.id ||
        mapped.effectId !== base.effectId ||
        mapped.energyCost !== base.energyCost ||
        mapped.cooldownSeconds !== base.cooldownSeconds ||
        mapped.resolveMode !== base.resolveMode ||
        mapped.typingCostBand !== base.typingCostBand
      ) {
        errors.push(
          mapId +
            ":" +
            actionId +
            ": affinity changed gameplay contract.",
        );
      }
      if (
        mapped.answerToken.length < 6 ||
        mapped.answerToken.length > 8
      ) {
        errors.push(
          mapId +
            ":" +
            actionId +
            ": affinity token escaped the balanced medium band.",
        );
      }
    }
  }

  return errors;
}
