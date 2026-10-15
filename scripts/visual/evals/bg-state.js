// bg-gallery.html: waits for every cell's background to go live, then returns
// each World's diagnostics (active, tier, DPR, texture MB, sprite count...).
(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  for (let tries = 0; tries < 80; tries += 1) {
    const cells = window.__bgGalleryCells || [];
    if (cells.length > 0 && cells.every((cell) => cell.stage.active)) break;
    await wait(100);
  }
  return (window.__bgGalleryCells || []).map((cell) => cell.stage.diagnostics());
})()
