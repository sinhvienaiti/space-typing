import type { DuelMatchPhase } from "./model";
import {
  duelMapProfile,
  duelPhaseRank,
  type DuelHazardProfile,
  type DuelMapId,
} from "./maps";
import { DuelRngStreams } from "./rng";

export type DuelHazardEvent = {
  sequence: number;
  mapId: DuelMapId;
  hazardId: DuelHazardProfile["id"];
  phase: DuelMatchPhase;
  pressure: number;
  telegraphSeconds: number;
  protectionSeconds: number;
  symmetry: DuelHazardProfile["symmetry"];
};

export type DuelCataclysmEvent = {
  sequence: number;
  mapId: DuelMapId;
  cataclysmId: string;
  displayLabel: string;
  pressureMultiplier: number;
};

export type DuelDirectorEvent =
  | { type: "hazard"; hazard: DuelHazardEvent }
  | { type: "cataclysm"; cataclysm: DuelCataclysmEvent };

const PHASE_INTERVAL_SECONDS: Readonly<
  Record<DuelMatchPhase, number>
> = {
  build: 9999,
  skirmish: 12,
  war: 9,
  crisis: 6.5,
  cataclysm: 4.5,
};

const PHASE_PRESSURE: Readonly<Record<DuelMatchPhase, number>> = {
  build: 0,
  skirmish: 0.78,
  war: 1,
  crisis: 1.28,
  cataclysm: 1.55,
};

export class DuelMapDirector {
  private readonly mapId: DuelMapId;
  private readonly rng: ReturnType<DuelRngStreams["domain"]>;
  private elapsedUntilHazard: number;
  private lastPhase: DuelMatchPhase = "build";
  private sequence = 0;
  private cataclysmEmitted = false;

  constructor(input: {
    mapId: DuelMapId;
    matchSeed: number;
    contentVersion: string;
  }) {
    this.mapId = input.mapId;
    const streams = new DuelRngStreams(
      input.matchSeed,
      input.contentVersion,
    );
    this.rng = streams.domain("hazards");
    this.elapsedUntilHazard = PHASE_INTERVAL_SECONDS.build;
  }

  update(
    dtSeconds: number,
    phase: DuelMatchPhase,
  ): DuelDirectorEvent[] {
    const events: DuelDirectorEvent[] = [];
    if (phase !== this.lastPhase) {
      if (phase === "build") {
        this.elapsedUntilHazard = PHASE_INTERVAL_SECONDS.build;
      } else if (this.lastPhase === "build") {
        this.elapsedUntilHazard = PHASE_INTERVAL_SECONDS[phase];
      } else {
        this.elapsedUntilHazard = Math.min(
          this.elapsedUntilHazard,
          PHASE_INTERVAL_SECONDS[phase],
        );
      }
      this.lastPhase = phase;
    }

    if (phase === "cataclysm" && !this.cataclysmEmitted) {
      this.cataclysmEmitted = true;
      const map = duelMapProfile(this.mapId);
      events.push({
        type: "cataclysm",
        cataclysm: {
          sequence: ++this.sequence,
          mapId: this.mapId,
          cataclysmId: map.cataclysm.id,
          displayLabel: map.cataclysm.displayLabel,
          pressureMultiplier: map.cataclysm.pressureMultiplier,
        },
      });
    }

    if (phase === "build") {
      this.elapsedUntilHazard = PHASE_INTERVAL_SECONDS.build;
      return events;
    }

    const dt = Math.max(
      0,
      Number.isFinite(dtSeconds) ? dtSeconds : 0,
    );
    this.elapsedUntilHazard -= dt;
    let guard = 0;

    while (this.elapsedUntilHazard <= 0 && guard < 4) {
      guard += 1;
      const hazard = this.pickHazard(phase);
      if (hazard !== null) {
        events.push({
          type: "hazard",
          hazard: {
            sequence: ++this.sequence,
            mapId: this.mapId,
            hazardId: hazard.id,
            phase,
            pressure:
              hazard.pressure * PHASE_PRESSURE[phase],
            telegraphSeconds: hazard.telegraphSeconds,
            protectionSeconds: hazard.protectionSeconds,
            symmetry: hazard.symmetry,
          },
        });
      }
      const base = PHASE_INTERVAL_SECONDS[phase];
      const jitter = 0.84 + this.rng.nextFloat() * 0.32;
      this.elapsedUntilHazard += base * jitter;
    }

    return events;
  }

  mapProfile() {
    return duelMapProfile(this.mapId);
  }

  resetRound(): void {
    this.elapsedUntilHazard = PHASE_INTERVAL_SECONDS.build;
    this.lastPhase = "build";
    this.sequence = 0;
    this.cataclysmEmitted = false;
  }

  private pickHazard(
    phase: DuelMatchPhase,
  ): DuelHazardProfile | null {
    const map = duelMapProfile(this.mapId);
    const eligible = map.hazards.filter(
      (hazard) =>
        duelPhaseRank(phase) >= duelPhaseRank(hazard.minPhase),
    );
    if (eligible.length === 0) return null;

    let total = 0;
    for (const hazard of eligible) total += hazard.baseWeight;
    let roll = this.rng.nextFloat() * total;
    for (const hazard of eligible) {
      roll -= hazard.baseWeight;
      if (roll <= 0) return hazard;
    }
    return eligible[eligible.length - 1] ?? null;
  }
}
