import {
  musicProfileForWorld,
  type MusicState,
  type WorldMusicProfile,
} from "../audio/music-profile";
import {
  duelMapProfile,
  type DuelMapId,
} from "./maps";
import type { DuelMatchPhase } from "./model";

export const DUEL_AUDIO_WORLD_SOURCE: Readonly<
  Record<DuelMapId, string>
> = Object.freeze({
  "frost-wastes": "world-03",
  "inferno-rift": "world-02",
  "tempest-prime": "world-08",
  "ocean-abyss": "world-07",
  "terra-core": "world-04",
  "celestial-void": "world-09",
});

export function duelMusicProfileForMap(
  mapId: DuelMapId,
): WorldMusicProfile {
  const source = musicProfileForWorld(
    DUEL_AUDIO_WORLD_SOURCE[mapId],
  );
  return {
    ...source,
    id: duelMapProfile(mapId).audioProfileId,
    ambientLayers: [...source.ambientLayers],
    preloadHints: [...source.preloadHints],
    duckingProfile: {
      ...source.duckingProfile,
    },
  };
}

export function duelMusicStateForPhase(
  phase: DuelMatchPhase,
): MusicState {
  switch (phase) {
    case "build":
    case "skirmish":
      return "WORLD_NORMAL";
    case "war":
    case "crisis":
    case "cataclysm":
      return "WORLD_INTENSE";
  }
}

export function duelAudioPresentationKey(
  mapId: DuelMapId,
  phase: DuelMatchPhase,
): string {
  return (
    duelMapProfile(mapId).audioProfileId +
    ":" +
    duelMusicStateForPhase(phase)
  );
}


export type DuelCombatAudioCue =
  | "typing-miss"
  | "laser-launch"
  | "missile-launch"
  | "heavy-launch"
  | "bomb-launch"
  | "energy-impact"
  | "missile-impact"
  | "heavy-impact"
  | "bomb-impact"
  | "support"
  | "bank"
  | "warning"
  | "intercept"
  | "precision"
  | "cataclysm"
  | "round-win"
  | "round-loss"
  | "round-draw";

export type DuelTimedAudioCue = {
  cue: DuelCombatAudioCue;
  delayMs: number;
  side: "self" | "opponent" | "arena";
};

function eventPlayerId(
  event: import("./authority").DuelClientEvent,
): import("./model").DuelPlayerId | null {
  switch (event.type) {
    case "typing-miss":
    case "action-completed":
    case "action-fired":
    case "action-banked":
    case "stored-action-used":
    case "precision-firepower":
    case "precision-firepower-fired":
    case "combo-used":
    case "conversion-used":
    case "trap-armed":
    case "trap-triggered":
      return event.playerId;
    case "threat-countered":
    case "threat-resolved":
      return event.sourcePlayerId;
    default:
      return null;
  }
}

function actionCues(
  mapId: DuelMapId,
  actionId: string,
): { launch: DuelCombatAudioCue; impact: DuelCombatAudioCue } | null {
  switch (actionId) {
    case "laser":
      return { launch: "laser-launch", impact: "energy-impact" };
    case "missile":
      return { launch: "missile-launch", impact: "missile-impact" };
    case "railgun":
    case "siege-lance":
      return { launch: "heavy-launch", impact: "heavy-impact" };
    case "bomb":
      return { launch: "bomb-launch", impact: "bomb-impact" };
    default:
      void mapId;
      return null;
  }
}

export function duelCombatAudioCues(
  view: import("./authority").DuelClientMatchView,
  events: readonly import("./authority").DuelClientEvent[],
): DuelTimedAudioCue[] {
  const cues: DuelTimedAudioCue[] = [];
  const selfId = view.self.playerId;

  const pushAction = (
    playerId: import("./model").DuelPlayerId,
    actionId: string,
  ): void => {
    const pair = actionCues(view.map.id, actionId);
    const side = playerId === selfId ? "self" : "opponent";
    if (pair === null) {
      cues.push({ cue: "support", delayMs: 0, side });
      return;
    }
    cues.push({ cue: pair.launch, delayMs: 0, side });
    cues.push({ cue: pair.impact, delayMs: 620, side });
  };

  for (const event of events) {
    switch (event.type) {
      case "typing-miss":
        if (event.playerId === selfId) {
          cues.push({
            cue: "typing-miss",
            delayMs: 0,
            side: "self",
          });
        }
        break;
      case "action-fired":
      case "stored-action-used":
        pushAction(event.playerId, event.actionId);
        break;
      case "action-banked":
        if (event.playerId === selfId) {
          cues.push({ cue: "bank", delayMs: 0, side: "self" });
        }
        break;
      case "threat-created":
        if (event.threat.targetPlayerId === selfId) {
          cues.push({
            cue: "warning",
            delayMs: 0,
            side: "opponent",
          });
        }
        break;
      case "threat-countered":
        cues.push({
          cue: "intercept",
          delayMs: 0,
          side: event.targetPlayerId === selfId ? "self" : "opponent",
        });
        break;
      case "precision-firepower":
      case "precision-firepower-fired":
        cues.push({
          cue: "precision",
          delayMs: 0,
          side:
            event.playerId === selfId ? "self" : "opponent",
        });
        break;
      case "map-cataclysm":
        cues.push({
          cue: "cataclysm",
          delayMs: 0,
          side: "arena",
        });
        break;
      case "round-ended":
        cues.push({
          cue:
            event.result.status === "draw"
              ? "round-draw"
              : event.result.winnerId === selfId
                ? "round-win"
                : "round-loss",
          delayMs: 0,
          side: "arena",
        });
        break;
      default: {
        const playerId = eventPlayerId(event);
        void playerId;
      }
    }
  }

  return cues;
}

export class DuelCombatAudioRouter {
  private readonly seen = new Set<string>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private roundId: string | null = null;

  constructor(
    private readonly play: (cue: DuelTimedAudioCue) => void,
  ) {}

  consume(
    view: import("./authority").DuelClientMatchView,
    events: readonly import("./authority").DuelClientEvent[],
  ): void {
    if (this.roundId !== view.roundId) {
      this.reset(view.roundId);
    }

    const cues = duelCombatAudioCues(view, events);
    cues.forEach((cue, index) => {
      const key =
        view.roundId +
        ":" +
        String(view.serverSequence) +
        ":" +
        String(index) +
        ":" +
        cue.cue +
        ":" +
        cue.side;
      if (this.seen.has(key)) return;
      this.seen.add(key);

      if (cue.delayMs <= 0) {
        this.play(cue);
        return;
      }
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (this.roundId !== view.roundId) return;
        this.play(cue);
      }, cue.delayMs);
      this.timers.add(timer);
    });

    while (this.seen.size > 256) {
      const first = this.seen.values().next().value;
      if (typeof first !== "string") break;
      this.seen.delete(first);
    }
  }

  reset(roundId: string | null = null): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.seen.clear();
    this.roundId = roundId;
  }

  destroy(): void {
    this.reset(null);
  }
}
