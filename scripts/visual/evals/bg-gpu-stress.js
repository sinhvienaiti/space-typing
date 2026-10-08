// Use on bg-gallery.html?world=<id>&q=<tier>&panel=0 (one World, no grid).
(async () => {
  // Headroom test: draw the background K times per frame and read the frame
  // rate the browser still reaches. 60 fps at K = n means ~n backgrounds fit.
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let cell = null;
  for (let tries = 0; tries < 80; tries += 1) {
    cell = (window.__bgGalleryCells || [])[0];
    if (cell && cell.stage.active) break;
    await wait(100);
  }
  if (!cell || !cell.stage.active) return { error: "stage not active" };
  const renderer = cell.stage.renderer;
  const gl = renderer.gl;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "n/a";
  const original = renderer.draw.bind(renderer);
  const fpsAt = async (repeat) => {
    renderer.draw = (director, flow) => {
      for (let index = 0; index < repeat; index += 1) original(director, flow);
    };
    // Settle, then time 120 frames.
    await new Promise((resolve) => {
      let frames = 0;
      const tick = () => (++frames < 30 ? requestAnimationFrame(tick) : resolve());
      requestAnimationFrame(tick);
    });
    const start = performance.now();
    await new Promise((resolve) => {
      let frames = 0;
      const tick = () => (++frames < 120 ? requestAnimationFrame(tick) : resolve());
      requestAnimationFrame(tick);
    });
    return +(120000 / (performance.now() - start)).toFixed(1);
  };
  const result = { gpu: gpu.replace(/ANGLE \(|, ANGLE Metal Renderer:|, Unspecified Version\)/g, ""), canvas: gl.drawingBufferWidth + "x" + gl.drawingBufferHeight };
  for (const repeat of [1, 3, 6, 10]) result["x" + repeat] = await fpsAt(repeat);
  renderer.draw = original;
  return result;
})()
