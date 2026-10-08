(async () => {
  // Portal URL + --eval-origin=https://space.typing-game.local + --fake-mic=1.
  // Only disposable visual:shot browser profiles; never a real player's account.
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const mode = document.querySelector("#voiceInputMode");
  mode.value = "hybrid";
  mode.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(500);
  document.querySelector("#voiceMicToggle").click();
  const statuses = [];
  let started = false;
  for (let i = 0; i < 35; i++) {
    await wait(1000);
    const text = document.querySelector("#voiceInputStatus").textContent;
    if (statuses.at(-1) !== text) statuses.push(text);
    if (!started && /ready|listening|paused|suspended/i.test(text)) {
      started = true;
      document.querySelector("#practiceButton").click();
    }
    if (/Error:/i.test(text)) break;
  }
  return { statuses, mode: mode.value, started, pressed: document.querySelector("#voiceMicToggle").getAttribute("aria-pressed"),
    balance: document.querySelector("#titleWarpBalance").textContent,
    feedback: document.querySelector("#voiceFeedback").textContent,
    practice: document.querySelector("#practiceBanner").textContent };
})()
