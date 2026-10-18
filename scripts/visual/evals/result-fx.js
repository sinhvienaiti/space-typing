// Shows a results screen through the dev-only __resultPreview hook and waits.
// Usage: pnpm visual:shot "http://127.0.0.1:3004/?q=high#fx" out.png --wait=5000
//   --eval-file=scripts/visual/evals/result-fx.js  (edit KIND/AT below or set window.__fxArgs first)
(async () => {
  const args = Object.assign({ kind: "clear", stars: 3, level: 5, at: 900 }, window.__fxArgs ?? {});
  const params = new URLSearchParams(location.search);
  for (const key of ["kind", "stars", "level", "at"]) if (params.has("fx" + key)) args[key] = key === "kind" ? params.get("fx" + key) : Number(params.get("fx" + key));
  window.__resultPreview(args.kind, args.stars, args.level);
  await new Promise((resolve) => setTimeout(resolve, args.at));
  const overlay = document.getElementById(args.kind === "over" ? "gameOverOverlay" : "stageClearOverlay");
  return { args, fx3d: overlay.classList.contains("result-fx-3d"), canvas: Boolean(overlay.querySelector(".result-fx-canvas")) };
})()
