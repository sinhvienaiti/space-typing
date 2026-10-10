(async () => {
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
  const deadline = Date.now() + 20000;
  let button = null;

  while (Date.now() < deadline) {
    button = document.getElementById("stageSelectButton");
    if (button instanceof HTMLButtonElement && !button.disabled) break;
    await sleep(100);
  }

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Campaign Map button was not mounted before the QA timeout.");
  }
  if (button.disabled) {
    throw new Error("Campaign Map button stayed disabled before the QA timeout.");
  }

  button.click();

  while (Date.now() < deadline) {
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

  throw new Error("Campaign Map did not finish rendering before the QA timeout.");
})()