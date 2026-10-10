(async () => {
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
  // Account/persistence initialization can legitimately trail the Vite/page-load
  // signal on a cold shared CI runner. Keep this independent from the map render
  // deadline so a slow bootstrap does not consume the structural QA budget.
  const buttonTimeoutMs = 60000;
  const renderTimeoutMs = 20000;
  const buttonDeadline = Date.now() + buttonTimeoutMs;
  let button = null;

  while (Date.now() < buttonDeadline) {
    button = document.getElementById("stageSelectButton");
    if (button instanceof HTMLButtonElement && !button.disabled) break;
    await sleep(100);
  }

  const startButton = document.getElementById("startButton");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(
      `Campaign Map button was not mounted before the QA timeout ` +
        `(startMounted=${startButton instanceof HTMLButtonElement}).`,
    );
  }
  if (button.disabled) {
    throw new Error(
      `Campaign Map button stayed disabled before the QA timeout ` +
        `(waitedMs=${buttonTimeoutMs}, ` +
        `startDisabled=${startButton instanceof HTMLButtonElement ? startButton.disabled : "unmounted"}).`,
    );
  }

  button.click();

  const renderDeadline = Date.now() + renderTimeoutMs;
  while (Date.now() < renderDeadline) {
    const dialog = document.getElementById("stageSelectDialog");
    const board = document.querySelector("#stageGrid .stage-journey");
    const sector = document.getElementById("journeySectorDetail");
    if (
      dialog instanceof HTMLDialogElement &&
      dialog.open &&
      board instanceof HTMLElement &&
      sector instanceof HTMLElement
    ) {
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      return {
        opened: true,
        buttonDisabled: button.disabled,
        worldNodeCount: board.querySelectorAll(".journey-node[data-stage]").length,
        sectorStageCount: sector.querySelectorAll(".journey-sector-stage").length,
      };
    }
    await sleep(100);
  }

  const dialog = document.getElementById("stageSelectDialog");
  const board = document.querySelector("#stageGrid .stage-journey");
  const sector = document.getElementById("journeySectorDetail");
  throw new Error(
    `Campaign Map did not finish rendering before the QA timeout ` +
      `(dialogOpen=${dialog instanceof HTMLDialogElement && dialog.open}, ` +
      `boardMounted=${board instanceof HTMLElement}, sectorMounted=${sector instanceof HTMLElement}).`,
  );
})()
