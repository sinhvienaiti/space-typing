/** Dev-only fixture acceptance. Run in a disposable profile with synthetic audio.
 * Seeds stationary word targets; never calls completion or fakes ASR messages. */
export async function run(mode = "hybrid", options = {}) {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const game = window.__spaceTypingGame;
  if (!game) throw new Error("Requires dev game handle, not a production player profile");
  const qaLibrary = await (await fetch('/vocabulary/lookup.json')).json();
  window.parent.postMessage({ qaVoiceVocabulary: [...game.getVoiceVocabularyForms(), ...Object.keys(qaLibrary.entries)] }, 'https://typing-game.local');
  // Diagnostic only: isolate decoder CPU from rendering. Never an acceptance PASS.
  if (options.isolateRendering) game.draw = () => {};
  const checkpoints = [];
  window.__voiceQaGame = () => ({ checkpoints, phase:game.getPhase(), mode:game.getInputMode(), metrics:game.getVoiceMetrics(), targets:game.getVoiceTargets() });
  const { VoiceResultPolicy } = await import('/src/input/platform/result-policy.mjs');
  const resolve = VoiceResultPolicy.prototype.resolve;
  const resolutions = [];
  VoiceResultPolicy.prototype.resolve = function(...args) {
    const result = resolve.apply(this, args);
    resolutions.push({ ...result, ageMs:(args[2]-args[0].audioEndSample)/16 });
    return result;
  };
  const select = document.querySelector("#voiceInputMode");
  select.value = mode;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(200);
  document.querySelector("#voiceMicToggle").click();
  const statuses = [];
  const status = () => {
    const value = document.querySelector("#voiceInputStatus").textContent;
    if (statuses.at(-1) !== value) statuses.push(value);
    if (document.querySelector("#voiceInputControls").dataset.state === "error") throw new Error(value);
    return value;
  };
  const until = async (condition, limit = 60000) => {
    const end = performance.now() + limit;
    while (performance.now() < end) { status(); if (condition()) return; await wait(100); }
    throw new Error("Voice QA timed out: " + status());
  };
  await until(() => /paused|listening/i.test(status()));
  document.querySelector("#practiceButton").click();
  await until(() => game.getPhase() === "playing" && /Listening/.test(status()));
  game.setTestLabMode(true);
  const seed = () => {
    game.testLabSpawnSamePrefixScenario();
    const words = ["apple", "reactor", "shield"];
    game.enemies.forEach((enemy, index) => {
      enemy.entry = { id: "voice-qa-" + words[index], en: words[index], vi: "", ipa: "" };
      enemy.layersRemaining = 1;
      enemy.speed = 0;
      enemy.actionCooldown = null;
    });
    if (mode === "hybrid") game.handleKey("r");
  };
  const before = { ...game.getVoiceMetrics() };
  seed();
  await wait(14000); status();
  const first = { ...game.getVoiceMetrics() };
  checkpoints.push({stage:'first', metrics:first, resolutions:resolutions.slice()});
  const protectedTarget = game.enemies.find(e => e.entry.en === "reactor");
  const protectedOk = mode !== "hybrid" || protectedTarget?.typed === 1;
  game.pause();
  await until(() => /paused/i.test(status()), 5000);
  const atPause = game.getVoiceMetrics().words;
  await wait(1500);
  const pauseSafe = game.getVoiceMetrics().words === atPause;
  game.resume();
  await until(() => /Listening/.test(status()), 15000);
  seed();
  await wait(14000); status();
  const afterResume = { ...game.getVoiceMetrics() };
  checkpoints.push({stage:'resume', metrics:afterResume, resolutions:resolutions.slice()});
  // Reconnect during active combat exercises fast warmup / signed sample origin.
  document.querySelector("#voiceMicToggle").click();
  await wait(300);
  document.querySelector("#voiceMicToggle").click();
  await until(() => /Listening|paused/i.test(status()));
  if (game.getPhase() === "paused") {
    game.resume();
    await until(() => /Listening/.test(status()), 15000);
  }
  seed();
  await wait(14000); status();
  const final = { ...game.getVoiceMetrics() };
  const pass = !options.isolateRendering && first.words > before.words && afterResume.words > first.words
    && final.words > afterResume.words && protectedOk && pauseSafe;
  return { pass, mode, statuses, before, first, afterResume, final, protectedOk, pauseSafe, resolutions,
    feedback: document.querySelector("#voiceFeedback").textContent,
    phase: game.getPhase(), balance: document.querySelector("#titleWarpBalance").textContent };
}
