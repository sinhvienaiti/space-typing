export class Sfx {
  private context: AudioContext | null = null;
  private volume = 0.5;

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  unlock(): void {
    if (this.context === null) {
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  shot(multiplier = 1): void {
    this.tone(520 + multiplier * 35, 0.038, "square", 0.04, 760);
  }

  hit(): void {
    this.tone(190, 0.065, "sawtooth", 0.045, 110);
  }

  kill(): void {
    this.noise(0.1, 0.055);
    this.tone(240, 0.12, "sawtooth", 0.045, 90);
  }

  wrong(): void {
    this.tone(92, 0.085, "square", 0.042, 70);
  }

  power(): void {
    this.tone(420, 0.16, "sine", 0.045, 760);
    window.setTimeout(() => this.tone(700, 0.18, "sine", 0.035, 1050), 60);
  }

  damage(): void {
    this.noise(0.11, 0.06);
    this.tone(75, 0.16, "sawtooth", 0.05, 45);
  }

  enemyShot(): void {
    this.tone(310, 0.09, "triangle", 0.032, 190);
  }

  support(): void {
    this.tone(440, 0.12, "sine", 0.026, 690);
    window.setTimeout(() => this.tone(620, 0.12, "sine", 0.02, 820), 45);
  }

  drain(): void {
    this.tone(210, 0.16, "sawtooth", 0.035, 78);
  }

  command(): void {
    this.tone(260, 0.11, "square", 0.03, 520);
    window.setTimeout(() => this.tone(520, 0.1, "square", 0.024, 760), 55);
  }

  eliteWarning(): void {
    this.tone(360, 0.11, "triangle", 0.028, 620);
    window.setTimeout(() => this.tone(620, 0.14, "triangle", 0.025, 930), 70);
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    endFrequency: number,
  ): void {
    if (this.volume <= 0) return;
    this.unlock();
    const context = this.context;
    if (context === null) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      now + duration,
    );

    gain.gain.setValueAtTime(gainValue * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private noise(duration: number, gainValue: number): void {
    if (this.volume <= 0) return;
    this.unlock();
    const context = this.context;
    if (context === null) return;

    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;

    gain.gain.setValueAtTime(gainValue * this.volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration,
    );

    source.connect(gain).connect(context.destination);
    source.start();
  }
}
