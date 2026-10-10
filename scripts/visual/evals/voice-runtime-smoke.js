(async () => {
  // Run ONLY with shot.mjs --fake-mic=1 at the Portal dev origin.
  const { BrowserVoiceRuntime } = await import("/src/voice/runtime.ts");
  const stages = [], errors = [], feedback = [];
  let fixtureAudio, fixtureSource;
  let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (window.__voiceFixtureBase64) {
    stream.getTracks().forEach(track => track.stop());
    fixtureAudio = new AudioContext();
    await fixtureAudio.resume();
    const data = Uint8Array.from(atob(window.__voiceFixtureBase64), c => c.charCodeAt(0));
    fixtureSource = fixtureAudio.createBufferSource();
    fixtureSource.buffer = await fixtureAudio.decodeAudioData(data.buffer);
    fixtureSource.loop = true;
    const destination = fixtureAudio.createMediaStreamDestination();
    fixtureSource.connect(destination);
    stream = destination.stream;
  }
  let runtime;
  try {
    runtime = await BrowserVoiceRuntime.create(stream, {
      sessionId: "visual-synthetic-voice",
      onStatus: (stage, text) => stages.push({ stage, text }),
      onDetection: () => {}, onFeedback: value => feedback.push(value.transcript), onClock: () => {},
      onError: (message) => errors.push(message),
    }, AbortSignal.timeout(60000));
    await runtime.applyTargets({ sessionId: "visual-synthetic-voice", inputEpoch: 1,
      audioEpoch: 1, snapshotId: "smoke", registryRevision: 1,
      sampleRate: 16000, publishedAtSample: 0, targets: [] });
    const events = [], start = performance.now();
    let peak = 0;
    const capture = runtime.captureMessage.bind(runtime);
    runtime.captureMessage = (message) => {
      if (message.data) for (const sample of message.data) peak = Math.max(peak, Math.abs(sample));
      if (message.type !== "clock") events.push({ t: Math.round(performance.now() - start), type: message.type, pending: runtime.pending.length });
      capture(message);
    };
    runtime.model.worker.addEventListener("message", ({data}) => events.push({ t: Math.round(performance.now() - start), type: data.event }));
    await runtime.resume();
    fixtureSource?.start();
    await new Promise(resolve => setTimeout(resolve, 15000));
    return { status: errors.length || (fixtureSource && !feedback.length) ? "FAILED" : "synthetic audio + real model/Worker/AudioWorklet ready", stages,
      samples: runtime.nowSample(), errors, feedback, peak,
      blocks: events.filter(e => e.type === "pcm").length,
      maxPending: Math.max(0, ...events.filter(e => e.pending !== undefined).map(e => e.pending)),
      finals: events.filter(e => e.type === "result").length,
      firstEvents: events.slice(0, 20) };
  } finally {
    await runtime?.close();
    stream.getTracks().forEach(track => track.stop());
    fixtureSource?.stop();
    await fixtureAudio?.close();
  }
})()
