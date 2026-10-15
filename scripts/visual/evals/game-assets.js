// Game page (index.html, also inside the portal's origin): which background
// kit and shot sprites loaded, and whether the WebGL background is in use.
(() => {
  const files = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => name.includes("/backgrounds/") || name.includes("/fx/"))
    .map((name) => name.split("/assets/space-typing/")[1] ?? name);
  const bgCanvas = document.getElementById("bgCanvas");
  return {
    backgroundCanvas: bgCanvas === null ? "missing" : bgCanvas.style.display === "none" ? "blit (BGV on)" : "visible",
    files,
  };
})()
