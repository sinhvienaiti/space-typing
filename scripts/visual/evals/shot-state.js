// shot-gallery.html: bolts in flight, loaded painted sprites and mock targets.
(() => {
  const gallery = window.__shotGallery;
  if (!gallery) return { error: "not the shot gallery" };
  return {
    activeShots: gallery.shots.activeShots,
    spriteFiles: performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/fx/"))
      .map((entry) => entry.name.split("/").pop()),
    targets: gallery.targets.map((target) => ({ word: target.word, typed: target.typed })),
  };
})()
