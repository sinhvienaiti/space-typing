export const DUEL_RNG_DOMAINS = [
  "word-offers",
  "hazards",
  "fate",
  "mystery",
  "bot-behavior",
  "cosmetic-only",
] as const;

export type DuelRngDomain = (typeof DUEL_RNG_DOMAINS)[number];

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function next(value: number): number {
  let state = value | 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
}

export class DuelRng {
  private state: number;

  constructor(seed: number) {
    const safe = Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 1;
    this.state = safe === 0 ? 0x9e3779b9 : safe;
  }

  nextUint32(): number {
    this.state = next(this.state);
    return this.state;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  nextInt(maxExclusive: number): number {
    const max = Math.max(1, Math.floor(maxExclusive));
    return Math.floor(this.nextFloat() * max);
  }

  snapshot(): number {
    return this.state >>> 0;
  }
}

export class DuelRngStreams {
  private readonly streams = new Map<DuelRngDomain, DuelRng>();

  constructor(
    private readonly matchSeed: number,
    private readonly contentVersion: string,
  ) {}

  domain(domain: DuelRngDomain): DuelRng {
    const existing = this.streams.get(domain);
    if (existing !== undefined) return existing;
    const seed =
      hash(
        String(this.matchSeed >>> 0) +
          ":" +
          this.contentVersion +
          ":" +
          domain,
      ) || 1;
    const created = new DuelRng(seed);
    this.streams.set(domain, created);
    return created;
  }
}
