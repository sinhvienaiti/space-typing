(async () => {
  const factory = await (await fetch("/src/voice/host-factory.mjs")).text();
  const runtimeUrl = /import\("([^"]*\/runtime\.ts[^\"]*)"\)/.exec(factory)?.[1];
  if (!runtimeUrl) throw new Error("Cannot find actual Vite runtime module");
  const { BrowserVoiceRuntime } = await import(runtimeUrl);
  const stats = { blocks: 0, ack: 0, peak: 0, feedback: [], detections: 0, errors: [], maxPending: 0, maxAckMs: 0, maxMainStallMs: 0, timeline: [] };
  const grammarBenchmark = new URLSearchParams(location.search).get('voiceQaGrammar') === 'library';
  let qaVocabulary = [];
  const qaSupported = grammarBenchmark ? new Set(await (await fetch('/assets/voice/vocabulary.json')).json()) : new Set();
  addEventListener('message', event => {
    if (grammarBenchmark && event.origin === 'https://space.typing-game.local' && Array.isArray(event.data?.qaVoiceVocabulary)) {
      qaVocabulary = [...new Set(event.data.qaVoiceVocabulary)].filter(form => form.split(' ').every(word => qaSupported.has(word)));
      qaVocabulary.push('[unk]');
      stats.grammarWords = qaVocabulary.length;
      stats.benchmark = 'full-library-vocabulary-plus-unk-NOT-PRODUCTION';
    }
  });
  // QA only: instrument the actual pinned Worker, not a mock decoder. Keep
  // timing local; never persist PCM or turn this on in the game runtime.
  stats.workerTrace = [];
  stats.workerMaxMs = {};
  stats.workerSlow = [];
  const workerModule = await (await fetch('/@id/__x00__offline-vosk-worker')).text();
  const workerPath = /export default "([^"]+)"/.exec(workerModule)?.[1];
  if (!workerPath) throw new Error('Missing pinned Worker URL');
  const workerSource = await (await fetch(workerPath)).text();
  const probe = `
    for (const name of ['processAudioChunk', 'createRecognizer', 'removeRecognizer']) {
      const original = worker_code.RecognizerWorker.prototype[name];
      worker_code.RecognizerWorker.prototype[name] = function(...args) {
        if (name === 'createRecognizer' && qaVocabulary.length) args[0].grammar = JSON.stringify(qaVocabulary);
        if (name === 'createRecognizer' && !this.qaNativeWrapped) {
          this.qaNativeWrapped = true;
          for (const operation of ['AcceptWaveform', 'Result', 'PartialResult']) {
            const proto = this.Vosk.Recognizer.prototype, native = proto[operation];
            proto[operation] = function(...input) {
              const begin = performance.now();
              postMessage({event:'qa-native',name:operation,phase:'start',at:performance.timeOrigin+begin});
              try { return native.apply(this,input); }
              finally { postMessage({event:'qa-native',name:operation,phase:'end',ms:performance.now()-begin,at:performance.timeOrigin+performance.now()}); }
            };
          }
        }
        const start = performance.now(), id = typeof args[0] === 'string' ? args[0] : args[0]?.recognizerId;
        postMessage({event:'qa-trace',name,id,phase:'start',heapMiB:this.Vosk.HEAPF32.byteLength/1048576,at:performance.timeOrigin+start});
        return Promise.resolve(original.apply(this,args)).finally(() => {
          postMessage({event:'qa-trace',name,id,phase:'end',ms:performance.now()-start,at:performance.timeOrigin+performance.now()});
        });
      };
    }
  `;
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      const traced = new URL(url, location.href).pathname === workerPath;
      const tracedWorkerUrl = traced ? URL.createObjectURL(new Blob([workerSource,
        'const qaVocabulary = ' + JSON.stringify(qaVocabulary) + ';', probe], {type:'application/javascript'})) : null;
      super(traced ? tracedWorkerUrl : url, options);
      if (traced) this.addEventListener('message', ({data}) => {
        if (data?.event === 'qa-native') {
          stats.nativeLast = data;
          stats.nativeMax ??= {};
          if(data.phase === 'end') stats.nativeMax[data.name] = Math.max(stats.nativeMax[data.name] ?? 0, data.ms);
          return;
        }
        if (data?.event !== 'qa-trace') return;
        if (data.phase === 'end') stats.workerMaxMs[data.name] = Math.max(stats.workerMaxMs[data.name] ?? 0, data.ms);
        if (data.name !== 'processAudioChunk' || data.ms > 200) {
          stats.workerSlow.push(data);
          if (stats.workerSlow.length > 80) stats.workerSlow.shift();
        }
        stats.workerTrace.push({...data, deliveryMs:performance.timeOrigin+performance.now()-data.at});
        if (stats.workerTrace.length > 20) stats.workerTrace.shift();
      });
    }
  };
  let last = performance.now();
  setInterval(() => { const now = performance.now(); stats.maxMainStallMs = Math.max(stats.maxMainStallMs, now - last - 50); last = now; }, 50);
  const create = BrowserVoiceRuntime.create;
  BrowserVoiceRuntime.create = async function (...args) {
    let fixtureSource, fixtureStarted = false;
    const callbacks = args[1];
    args[1] = { ...callbacks,
      onFeedback: value => { stats.feedback.push(value.transcript); callbacks.onFeedback(value); },
      onDetection: value => { stats.detections++; callbacks.onDetection(value); },
      onError: message => { stats.errors.push(message); callbacks.onError(message); },
    };
    const runtime = await create.apply(this, args), waiting = [];
    if (window.__voiceFixtureBase64) {
      const bytes = Uint8Array.from(atob(window.__voiceFixtureBase64), c => c.charCodeAt(0));
      fixtureSource = runtime.audio.createBufferSource();
      fixtureSource.buffer = await runtime.audio.decodeAudioData(bytes.buffer);
      fixtureSource.loop = true;
      runtime.source.disconnect();
      fixtureSource.connect(runtime.capture);
      stats.fixtureRoute = 'AudioBufferSource in production AudioContext -> production Worklet -> Vosk';
    }
    const final = runtime.final.bind(runtime);
    stats.finals ??= [];
    runtime.final = (result, generation) => {
      if (result.text) {
        stats.finals.push({result, generation, base:runtime.baseSample, clock:runtime.clock,
          targets:runtime.snapshots.at(-1)?.targets});
        if (stats.finals.length > 6) stats.finals.shift();
      }
      final(result, generation);
    };
    const resume = runtime.resume.bind(runtime), close = runtime.close.bind(runtime), suspend = runtime.suspend.bind(runtime);
    runtime.resume = async () => { await resume(); if (fixtureSource && !fixtureStarted) { fixtureStarted = true; fixtureSource.start(); } };
    runtime.suspend = async () => { waiting.length = 0; await suspend(); };
    runtime.close = async () => {
      if (fixtureStarted) fixtureSource?.stop();
      try { await close(); } finally { fixtureSource?.disconnect(); }
    };
    const capture = runtime.captureMessage.bind(runtime), acknowledge = runtime.acknowledge.bind(runtime);
    runtime.captureMessage = message => {
      if (message.type === "pcm") { stats.blocks++; waiting.push(performance.now()); }
      if (message.data) for (const sample of message.data) stats.peak = Math.max(stats.peak, Math.abs(sample));
      if (["pcm", "overflow"].includes(message.type)) {
        stats.maxPending = Math.max(stats.maxPending, runtime.pending.length);
        stats.timeline.push({ type: message.type, at: Math.round(performance.now()), pending: runtime.pending.length });
        if (stats.timeline.length > 30) stats.timeline.shift();
      }
      capture(message);
    };
    runtime.acknowledge = generation => {
      if (runtime.generation === generation && runtime.pending.length) {
        stats.ack++; const sent = waiting.shift();
        if (sent !== undefined) stats.maxAckMs = Math.max(stats.maxAckMs, performance.now() - sent);
      }
      acknowledge(generation);
    };
    return runtime;
  };
  window.__voiceDiagnostics = () => stats;
})()
