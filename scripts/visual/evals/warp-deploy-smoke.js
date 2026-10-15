(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const { loadPlayerSave } = await import("/src/persistence/player-save.ts");
  const before = (await loadPlayerSave()).save.account.warp.current;
  const messages = [];
  const observer = new MutationObserver(() => {
    const notice = document.querySelector("#notice")?.textContent;
    if (notice && messages.at(-1) !== notice) messages.push(notice);
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  document.querySelector("#startButton").click();
  await wait(10000);
  observer.disconnect();
  const save = (await loadPlayerSave()).save;
  return { before, after: save.account.warp.current, attempt: save.account.attempt?.phase,
    messages, hud: document.querySelector("#warpBalance").textContent,
    title: document.querySelector("#titleOverlay").className,
    disabled: document.querySelector("#startButton").disabled };
})()
