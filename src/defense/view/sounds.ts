import type { SceneAudio } from "../../scene3d/sfx";

/**
 * Rift Defense sounds (V4 §12): every tower strike, enemy attack and
 * build action has its own. Recorded ones come from the game's CC0 sets
 * (Kenney, the Duel packs, the UI sounds); frost, lightning, gravity,
 * heals, the alarm and jamming are synthesized, so each tower is told
 * apart by ear. A cap per sound keeps a storm from turning into noise.
 */

const AUDIO = "/assets/audio/";
const UI = import.meta.glob<string>("../../assets/audio/ui/*.ogg", { eager: true, query: "?url", import: "default" });
function ui(name: string): string {
  return Object.entries(UI).find(([path]) => path.endsWith("/" + name + ".ogg"))?.[1] ?? AUDIO + "sfx/kenney/confirm.ogg";
}

const FILES = {
  crystalHit: AUDIO + "sfx/kenney/crystal-hit.ogg",
  crystalBreak: AUDIO + "sfx/kenney/crystal-break.ogg",
  forceField: AUDIO + "sfx/kenney/force-field.ogg",
  forceCast: AUDIO + "sfx/kenney/force-field-cast.ogg",
  crunch: AUDIO + "sfx/kenney/explosion-crunch.ogg",
  crunchChain: AUDIO + "sfx/kenney/explosion-crunch-chain.ogg",
  laserSmall: AUDIO + "sfx/kenney/laser-small.ogg",
  emp: AUDIO + "duel/sfx/disrupt-emp.ogg",
  lock: AUDIO + "duel/sfx/lock-acquire.ogg",
  repair: AUDIO + "duel/sfx/repair-energy.ogg",
  scan: AUDIO + "duel/sfx/scan-pulse.ogg",
  launch: AUDIO + "duel/sfx/missile-launch.ogg",
  shieldHit: AUDIO + "duel/sfx/shield-hit.ogg",
  hitA: AUDIO + "duel/war/hit-a.ogg",
  hitB: AUDIO + "duel/war/hit-b.ogg",
  hitHeavy: AUDIO + "duel/war/hit-heavy.ogg",
  railgun: AUDIO + "duel/war/railgun.ogg",
  explosionB: AUDIO + "duel/war/explosion-b.ogg",
  explosionBig: AUDIO + "duel/war/explosion-big.ogg",
  deploy: ui("deploy-thump"),
  upgrade: ui("reward-shimmer"),
  sell: ui("reward-small"),
  streak: ui("streak"),
} as const;

type Build = (context: AudioContext, out: AudioNode, noise: AudioBuffer, now: number) => void;

function noiseBurst(context: AudioContext, out: AudioNode, noise: AudioBuffer, now: number, filter: BiquadFilterType, from: number, to: number, seconds: number, gain: number, q = 1): void {
  const source = context.createBufferSource();
  source.buffer = noise;
  const band = context.createBiquadFilter();
  band.type = filter;
  band.Q.value = q;
  band.frequency.setValueAtTime(from, now);
  band.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + seconds);
  const level = context.createGain();
  level.gain.setValueAtTime(gain, now);
  level.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  source.connect(band).connect(level).connect(out);
  source.start(now, Math.random() * 1.5);
  source.stop(now + seconds + 0.05);
}

function tone(context: AudioContext, out: AudioNode, now: number, type: OscillatorType, from: number, to: number, seconds: number, gain: number, delay = 0): void {
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now + delay);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + delay + seconds);
  const level = context.createGain();
  level.gain.setValueAtTime(0.0001, now + delay);
  level.gain.exponentialRampToValueAtTime(gain, now + delay + 0.01);
  level.gain.exponentialRampToValueAtTime(0.0001, now + delay + seconds);
  osc.connect(level).connect(out);
  osc.start(now + delay);
  osc.stop(now + delay + seconds + 0.05);
}

/** Lightning: a crackle of bright noise over a buzzing drop. */
const ZAP: Build = (context, out, noise, now) => {
  noiseBurst(context, out, noise, now, "bandpass", 4200, 1600, 0.16, 0.9, 2.5);
  noiseBurst(context, out, noise, now + 0.03, "highpass", 6000, 3000, 0.08, 0.5);
  tone(context, out, now, "square", 140, 48, 0.14, 0.18);
};
/** A frost wave: a glassy chirp and a cold hiss. */
const FROST: Build = (context, out, noise, now) => {
  noiseBurst(context, out, noise, now, "highpass", 5200, 2600, 0.3, 0.35);
  tone(context, out, now, "sine", 1900, 2900, 0.12, 0.12);
  tone(context, out, now, "triangle", 3100, 2400, 0.18, 0.06, 0.03);
};
/** A gravity collapse: a deep pull downward. */
const WHOOMP: Build = (context, out, noise, now) => {
  tone(context, out, now, "sine", 240, 38, 0.5, 0.75);
  noiseBurst(context, out, noise, now, "lowpass", 900, 120, 0.45, 0.5);
};
/** An Event Horizon throw: a rising shove. */
const SHOVE: Build = (context, out, noise, now) => {
  tone(context, out, now, "sine", 55, 140, 0.35, 0.6);
  noiseBurst(context, out, noise, now, "bandpass", 300, 1400, 0.3, 0.4, 1.4);
};
/** A heal: a soft major chord. */
const CHIME: Build = (context, out, _noise, now) => {
  for (const [frequency, delay] of [[784, 0], [988, 0.05], [1175, 0.1], [1568, 0.16]] as const) tone(context, out, now, "sine", frequency, frequency * 1.002, 0.9, 0.12, delay);
};
/** Energy: a bright double ping. */
const COIN: Build = (context, out, _noise, now) => {
  tone(context, out, now, "sine", 1320, 1320, 0.12, 0.14);
  tone(context, out, now, "sine", 1760, 1760, 0.22, 0.12, 0.07);
};
/** The Core in danger: a two-tone siren. */
const SIREN: Build = (context, out, _noise, now) => {
  for (let index = 0; index < 4; index += 1) tone(context, out, now, "sawtooth", index % 2 === 0 ? 660 : 880, index % 2 === 0 ? 660 : 880, 0.22, 0.07, index * 0.22);
};
/** Jamming: a burst of static. */
const STATIC: Build = (context, out, noise, now) => {
  noiseBurst(context, out, noise, now, "bandpass", 1700, 1300, 0.35, 0.35, 6);
};
/** A boss's stomp: a sub thump. */
const THUMP: Build = (context, out, noise, now) => {
  tone(context, out, now, "sine", 90, 32, 0.6, 0.9);
  noiseBurst(context, out, noise, now, "lowpass", 400, 60, 0.5, 0.6);
};

export class DefenseSounds {
  constructor(private readonly audio: SceneAudio) {}

  /** Starts loading the recorded ones (after the first click unlocks audio). */
  preload(): void {
    this.audio.preload(Object.values(FILES));
  }

  private file(name: keyof typeof FILES, gain: number, pan: number, gap = 0.05, rate = 1): void {
    this.audio.playFile(FILES[name], gain, { pan, gap, rate });
  }

  private synth(key: string, build: Build, gain: number, pan: number, gap = 0.06): void {
    this.audio.synth(key, build, gain, { pan, gap });
  }

  frost(pan: number): void {
    this.synth("frost", FROST, 0.45, pan, 0.12);
    this.file("crystalHit", 0.18, pan, 0.15, 1.4);
  }

  freeze(pan: number): void {
    this.file("crystalBreak", 0.45, pan, 0.1, 1.15);
    this.file("forceField", 0.25, pan, 0.2, 1.3);
  }

  lance(pan: number): void {
    this.file("crystalHit", 0.4, pan, 0.08, 0.8);
  }

  arc(pan: number, overload: boolean): void {
    this.synth("zap", ZAP, overload ? 0.75 : 0.5, pan, 0.07);
    if (overload) this.file("emp", 0.45, pan, 0.2);
  }

  lock(pan: number): void {
    this.file("lock", 0.45, pan, 0.15);
  }

  collapse(pan: number): void {
    this.synth("whoomp", WHOOMP, 0.6, pan, 0.2);
  }

  horizon(pan: number): void {
    this.synth("shove", SHOVE, 0.6, pan, 0.2);
  }

  coreHeal(): void {
    this.synth("chime", CHIME, 0.5, 0, 0.3);
  }

  revive(pan: number): void {
    this.file("repair", 0.5, pan, 0.2);
    this.synth("chime", CHIME, 0.35, pan, 0.3);
  }

  repair(pan: number): void {
    this.file("repair", 0.45, pan, 0.2);
  }

  income(pan: number): void {
    this.synth("coin", COIN, 0.4, pan, 0.08);
  }

  siphon(pan: number): void {
    this.synth("coin", COIN, 0.16, pan, 0.12);
  }

  enemyHeal(pan: number): void {
    this.synth("enemyHeal", CHIME, 0.12, pan, 0.4);
  }

  aim(pan: number): void {
    this.file("scan", 0.2, pan, 0.4, 1.4);
  }

  bolt(pan: number, boss: boolean): void {
    if (boss) this.file("railgun", 0.4, pan, 0.2);
    else this.file("laserSmall", 0.3, pan, 0.08);
  }

  towerHit(pan: number, heavy: boolean): void {
    this.file(heavy ? "hitHeavy" : Math.random() < 0.5 ? "hitA" : "hitB", heavy ? 0.55 : 0.4, pan, 0.06);
  }

  towerDown(pan: number): void {
    this.file("explosionB", 0.6, pan, 0.2);
    this.file("crunch", 0.4, pan, 0.2, 0.8);
  }

  mineBlast(pan: number): void {
    this.file("crunch", 0.55, pan, 0.08);
  }

  chain(pan: number): void {
    this.file("crunchChain", 0.45, pan, 0.12);
  }

  smash(pan: number): void {
    this.file("hitHeavy", 0.7, pan, 0.1, 0.8);
  }

  stomp(): void {
    this.synth("thump", THUMP, 0.8, 0, 0.3);
    this.file("explosionBig", 0.35, 0, 0.3, 0.7);
  }

  shield(pan: number): void {
    this.file("shieldHit", 0.35, pan, 0.12);
  }

  launch(pan: number): void {
    this.file("launch", 0.35, pan, 0.2);
  }

  jam(pan: number): void {
    this.synth("static", STATIC, 0.3, pan, 0.6);
  }

  build(): void {
    this.file("deploy", 0.6, 0, 0.05);
    this.file("forceCast", 0.3, 0, 0.05, 1.2);
  }

  upgrade(): void {
    this.file("upgrade", 0.6, 0, 0.05);
    this.file("forceCast", 0.35, 0, 0.05, 1.5);
  }

  sell(): void {
    this.file("sell", 0.55, 0, 0.05);
  }

  streak(): void {
    this.file("streak", 0.5, 0, 0.2);
  }

  alarm(): void {
    this.synth("siren", SIREN, 0.5, 0, 2.5);
  }
}
