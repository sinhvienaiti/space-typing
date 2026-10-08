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
import duelMusicTracks from "../audio/duel-music-tracks.json";
import {
  DUEL_KO_TIMELINE,
  duelProjectileTravelMs,
} from "./presentation-timing";
import { DUEL_MOMENTUM_TIERS, type DuelMomentumEvent } from "./momentum";

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

/**
 * Duel PvP music (2026-10-03): original high-tempo songs rendered by
 * scripts/music (`node scripts/music/render-songs.mjs --set=duel`), kept out
 * of the Campaign playlists. The owner found the earlier Duel pack too slow
 * and gloomy for PvP. Neon Dogfight (158 BPM) plays the early and middle
 * phases (calm → intense stem); Afterburner Finale (168 BPM) the Cataclysm.
 */
function duelSongStem(id: string, stem: "calm" | "intense"): string {
  const track = duelMusicTracks.tracks.find((entry) => entry.id === id);
  return track?.stems[stem] ?? "/assets/audio/duel/music/songs/" + id + "/" + stem + ".ogg";
}

const DUEL_MUSIC_ASSETS = Object.freeze({
  calm: {
    id: "duel-neon-dogfight-calm",
    defaultPath: duelSongStem("neon-dogfight", "calm"),
  },
  intense: {
    id: "duel-neon-dogfight-intense",
    defaultPath: duelSongStem("neon-dogfight", "intense"),
  },
  cataclysm: {
    id: "duel-afterburner-finale",
    defaultPath: duelSongStem("afterburner-finale", "intense"),
  },
});

export function duelMusicProfileForMap(
  mapId: DuelMapId,
): WorldMusicProfile {
  const source = musicProfileForWorld(
    DUEL_AUDIO_WORLD_SOURCE[mapId],
  );
  const profileId = duelMapProfile(mapId).audioProfileId;
  return {
    ...source,
    id: profileId,
    // Duel uses its own media pack rather than inheriting a campaign
    // playlist. An isolated world id intentionally yields no song-library
    // playlist, so MusicController resolves the profile assets below.
    worldId: "duel-" + mapId,
    baseTrack: {
      ...DUEL_MUSIC_ASSETS.calm,
      id: profileId + ":calm",
    },
    intenseTrackOrLayer: {
      ...DUEL_MUSIC_ASSETS.intense,
      id: profileId + ":intense",
    },
    galaxyBossTrack: {
      ...DUEL_MUSIC_ASSETS.cataclysm,
      id: profileId + ":cataclysm",
    },
    ambientLayers: [...source.ambientLayers],
    preloadHints: [
      DUEL_MUSIC_ASSETS.calm,
      DUEL_MUSIC_ASSETS.intense,
      DUEL_MUSIC_ASSETS.cataclysm,
    ],
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
      return "WORLD_INTENSE";
    case "cataclysm":
      return "GALAXY_BOSS";
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
  | "round-draw"
  // Weapons pass (2026-10-03): each typed weapon sounds like itself.
  | "beam-launch"
  | "beam-impact"
  | "rail-charge"
  | "rail-impact"
  | "lance-charge"
  | "lance-impact"
  | "lance-break"
  // Presentation-driven cues (2026-10-03 impact pass).
  | "type-tick"
  | "streak-tier"
  | "streak-break"
  | "shield-hit"
  | "shield-break"
  | "ko-blast"
  | "ko-final"
  | "match-win"
  | "match-loss"
  | "round-ready"
  | "fight"
  | "phase-shift"
  // Announcer voice (DotA lines, local assets): see `voice`.
  | "announce";

export type DuelTimedAudioCue = {
  cue: DuelCombatAudioCue;
  delayMs: number;
  side: "self" | "opponent" | "arena";
  /** Streak length (type-tick) or chain index (ko-blast). */
  step?: number;
  /** Momentum tier, 0…8. */
  tier?: number;
  /** Announcer line id for "announce" (e.g. "double-kill"). */
  voice?: string;
  /** Announcer priority: a busy voice is cut by an equal or higher one. */
  priority?: number;
  /** Length of a charge (rail-charge, lance-charge), seconds. */
  seconds?: number;
};

/** Your hits landing in a burst: DotA multi-kill lines. */
export function duelMultiKillVoice(count: number): string | null {
  if (count === 2) return "double-kill";
  if (count === 3) return "triple-kill";
  if (count === 4) return "ultra-kill";
  if (count === 5) return "rampage";
  return null;
}

/**
 * Moments the battle UI derives itself (they are not engine events), passed
 * along so sound follows exactly what is drawn.
 */
export type DuelPresentationBeat =
  | { type: "momentum"; event: DuelMomentumEvent }
  | { type: "shield-hit"; side: "self" | "opponent" }
  | { type: "shield-break"; side: "self" | "opponent" }
  | { type: "round-start"; round: number }
  | { type: "phase"; phase: DuelMatchPhase }
  | { type: "first-blood"; side: "self" | "opponent" }
  | { type: "multi-kill"; count: number };

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
    const impactDelayMs = duelProjectileTravelMs(
      view.shared.tactical.projectileSpeedScale[playerId] ?? 1,
    );
    // Timed to what flies (src/duel/ordnance.ts): three missiles 7% apart,
    // the railgun charging for 72% of the flight, the laser beam's contact.
    switch (actionId) {
      case "laser":
        cues.push({ cue: "beam-launch", delayMs: 0, side });
        cues.push({ cue: "beam-impact", delayMs: impactDelayMs, side });
        return;
      case "missile":
        for (let step = 0; step < 3; step += 1) {
          cues.push({ cue: "missile-launch", delayMs: step * 65, side, step });
          cues.push({ cue: "missile-impact", delayMs: impactDelayMs * (1 + step * 0.07), side, step });
        }
        return;
      case "railgun":
        cues.push({ cue: "rail-charge", delayMs: 0, side, seconds: impactDelayMs * 0.72 / 1000 });
        cues.push({ cue: "heavy-launch", delayMs: impactDelayMs * 0.72, side });
        cues.push({ cue: "rail-impact", delayMs: impactDelayMs, side });
        return;
      default:
        break;
    }
    cues.push({ cue: pair.launch, delayMs: 0, side });
    cues.push({
      cue: pair.impact,
      delayMs: impactDelayMs,
      side,
    });
  };

  for (const event of events) {
    switch (event.type) {
      case "cannon-fired":
        cues.push({ cue: "laser-launch", delayMs: 0, side: event.playerId === selfId ? "self" : "opponent" });
        break;
      case "cannon-hit":
        cues.push({ cue: "energy-impact", delayMs: 0, side: event.targetPlayerId === selfId ? "self" : "opponent" });
        break;
      case "combo-used":
        if (event.playerId === selfId) cues.push({ cue: "announce", delayMs: 0, side: "arena", voice: "combo-whore", priority: 1 });
        if (["homing-barrage", "gravity-bomb", "overcharged-railgun"].includes(event.comboId)) {
          pushAction(event.playerId, "railgun");
        } else {
          cues.push({ cue: "support", delayMs: 0, side: event.playerId === selfId ? "self" : "opponent" });
        }
        break;
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
        // The lance charging: rises for the whole counter window.
        cues.push({ cue: "lance-charge", delayMs: 0, side: event.threat.sourcePlayerId === selfId ? "self" : "opponent", seconds: Math.max(0.4, event.threat.remainingSeconds) });
        break;
      case "threat-countered":
        cues.push({ cue: "lance-break", delayMs: 0, side: event.sourcePlayerId === selfId ? "self" : "opponent" });
        cues.push({
          cue: "intercept",
          delayMs: 0,
          side:
            event.targetPlayerId === selfId
              ? "self"
              : "opponent",
        });
        break;
      case "threat-resolved":
        cues.push({ cue: "lance-impact", delayMs: 0, side: event.targetPlayerId === selfId ? "self" : "opponent" });
        break;
      case "precision-firepower":
        cues.push({
          cue: "precision",
          delayMs: 0,
          side:
            event.playerId === selfId
              ? "self"
              : "opponent",
        });
        break;
      case "precision-firepower-fired":
        cues.push({
          cue: "precision",
          delayMs: 0,
          side:
            event.playerId === selfId
              ? "self"
              : "opponent",
        });
        pushAction(
          event.playerId,
          event.actionId,
        );
        break;
      case "map-cataclysm":
        cues.push({
          cue: "cataclysm",
          delayMs: 0,
          side: "arena",
        });
        break;
      case "round-ended": {
        // The K.O. timeline: chain blasts, the final blast, the result
        // stinger, then the next-round call (DUEL_KO_TIMELINE).
        const result = event.result;
        const loserSide =
          result.status === "won"
            ? result.winnerId === selfId ? "opponent" : "self"
            : null;
        const knockedOut =
          loserSide !== null || (view.self.hull <= 0 || view.opponent.hull <= 0);
        if (knockedOut) {
          const side = loserSide ?? (view.self.hull <= 0 ? "self" : "opponent");
          DUEL_KO_TIMELINE.chainMs.forEach((delayMs, step) => {
            cues.push({ cue: "ko-blast", delayMs, side, step });
          });
          cues.push({ cue: "ko-final", delayMs: DUEL_KO_TIMELINE.finalMs, side });
        }
        const seriesOver = view.series.status !== "active";
        if (result.status === "won" && result.winnerId === selfId) {
          cues.push({ cue: "announce", delayMs: DUEL_KO_TIMELINE.finalMs + 250, side: "arena", voice: "ownage", priority: 5 });
        }
        cues.push({
          cue:
            result.status === "draw"
              ? "round-draw"
              : result.winnerId === selfId
                ? seriesOver ? "match-win" : "round-win"
                : seriesOver ? "match-loss" : "round-loss",
          delayMs: knockedOut ? DUEL_KO_TIMELINE.bannerMs : 300,
          side: "arena",
        });
        if (!seriesOver) {
          cues.push({ cue: "round-ready", delayMs: DUEL_KO_TIMELINE.readyMs, side: "arena" });
        }
        break;
      }
      default:
        break;
    }
  }

  return cues;
}

/** Cues for presentation beats; immediate, never deduplicated by sequence. */
export function duelBeatAudioCues(
  beats: readonly DuelPresentationBeat[],
): DuelTimedAudioCue[] {
  const cues: DuelTimedAudioCue[] = [];
  for (const beat of beats) {
    switch (beat.type) {
      case "momentum":
        if (beat.event.type === "tick") {
          cues.push({ cue: "type-tick", delayMs: 0, side: "self", step: beat.event.streak, tier: beat.event.tier });
        } else if (beat.event.type === "tier-up") {
          cues.push({ cue: "streak-tier", delayMs: 0, side: "self", step: beat.event.streak, tier: beat.event.tier });
          const voice = DUEL_MOMENTUM_TIERS[beat.event.tier]?.voice ?? "";
          if (voice !== "") cues.push({ cue: "announce", delayMs: 0, side: "arena", voice, priority: 2 });
        } else if (beat.event.lost >= 10) {
          cues.push({ cue: "streak-break", delayMs: 0, side: "self", step: beat.event.lost, tier: beat.event.tier });
        }
        break;
      case "shield-hit":
        cues.push({ cue: "shield-hit", delayMs: 0, side: beat.side });
        break;
      case "shield-break":
        cues.push({ cue: "shield-break", delayMs: 0, side: beat.side });
        break;
      case "round-start":
        cues.push({ cue: "fight", delayMs: 0, side: "arena", step: beat.round });
        break;
      case "first-blood":
        cues.push({ cue: "announce", delayMs: 0, side: "arena", voice: "first-blood", priority: 4 });
        break;
      case "multi-kill": {
        const voice = duelMultiKillVoice(beat.count);
        if (voice !== null) cues.push({ cue: "announce", delayMs: 0, side: "arena", voice, priority: 3 });
        break;
      }
      case "phase": {
        // The map-cataclysm event already plays the cataclysm sample.
        const tier = ["build", "skirmish", "war", "crisis", "cataclysm"].indexOf(beat.phase);
        cues.push({ cue: "phase-shift", delayMs: 0, side: "arena", tier: Math.max(0, tier) });
        break;
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
    beats: readonly DuelPresentationBeat[] = [],
  ): void {
    if (this.roundId !== view.roundId) {
      this.reset(view.roundId);
    }
    for (const cue of duelBeatAudioCues(beats)) this.play(cue);

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
