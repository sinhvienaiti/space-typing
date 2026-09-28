// Any page on the dev server (it imports /src/audio/Sfx.ts): renders Sfx cues
// offline at the default SFX volume and reports, per cue, the peak (dBFS),
// the loudest 100 ms (K-weighted, LUFS-like), the audible length (ms) and
// the right-minus-left balance (dB). AI agents cannot listen; compare cues by
// these numbers. Reference points (28/09/2026): the sampled intercept zap
// peaks near -19 dBFS in game; World 01 music plays near -27 LUFS at the
// default music volume (0.26).
(async () => {
  const { Sfx } = await import("/src/audio/Sfx.ts");
  const RATE = 48000;
  const biquad = (b0, b1, b2, a1, a2) => {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return (x) => {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    };
  };
  const kWeight = (data) => {
    const shelf = biquad(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585);
    const highpass = biquad(1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621);
    return data.map((x) => highpass(shelf(x)));
  };

  async function measure(name, play) {
    class Offline extends OfflineAudioContext {
      constructor() { super(2, RATE, RATE); }
      resume() { return Promise.resolve(); }
    }
    const original = window.AudioContext;
    window.AudioContext = Offline;
    const sfx = new Sfx();
    sfx.setVolume(0.5); // default sfxVolume
    sfx.unlock();
    play(sfx);
    const buffer = await sfx.context.startRendering();
    window.AudioContext = original;

    const left = Array.from(buffer.getChannelData(0));
    const right = Array.from(buffer.getChannelData(1));
    let peak = 0;
    for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    const kl = kWeight(left);
    const kr = kWeight(right);
    const window100 = RATE / 10;
    let best = 0;
    for (let start = 0; start + window100 <= kl.length; start += RATE / 200) {
      let sum = 0;
      for (let i = start; i < start + window100; i++) sum += kl[i] * kl[i] + kr[i] * kr[i];
      best = Math.max(best, sum / window100);
    }
    let lastAudible = 0;
    for (let i = 0; i < left.length; i++) if (Math.abs(left[i]) > peak * 0.01) lastAudible = i;
    let energyLeft = 0, energyRight = 0;
    for (let i = 0; i < left.length; i++) { energyLeft += left[i] * left[i]; energyRight += right[i] * right[i]; }
    return {
      name,
      peakDb: +(20 * Math.log10(peak || 1e-9)).toFixed(1),
      loudest100ms: +(-0.691 + 10 * Math.log10(best || 1e-12)).toFixed(1),
      ms: Math.round((lastAudible / RATE) * 1000),
      rightMinusLeftDb: +(10 * Math.log10((energyRight || 1e-12) / (energyLeft || 1e-12))).toFixed(1),
    };
  }

  return [
    await measure("shot (every key)", (s) => s.shot(1)),
    await measure("hit, crystal (Vanguard)", (s) => s.boltImpact(1)),
    await measure("finisher, crystal", (s) => s.boltImpact(1.45)),
    await measure("hit, energy (legacy laser)", (s) => s.boltImpact(1, 0, "energy")),
    await measure("hit, crystal, target on the right", (s) => s.boltImpact(1, 0.6)),
    await measure("kill: hit + kill + finisher", (s) => { s.hit(); s.kill(); s.boltImpact(1.45); }),
    await measure("damage", (s) => s.damage()),
  ];
})()
