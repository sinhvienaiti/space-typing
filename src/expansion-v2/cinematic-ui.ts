import {
  cinematicFrame,
  createCinematicState,
  skipCinematic,
  startCinematic,
  tickCinematic,
} from "./cinematic";

export function playExpansionReferenceCinematic(options: {
  title: string;
  subtitle: string;
}): Promise<"complete" | "skipped"> {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "expansion-cinematic";
    Object.assign(root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "80",
      display: "grid",
      placeItems: "center",
      background:
        "radial-gradient(circle at 50% 45%, rgba(72,120,180,.28), rgba(2,5,14,.96) 58%)",
      overflow: "hidden",
    });

    const core = document.createElement("div");
    Object.assign(core.style, {
      width: "min(70vw, 760px)",
      textAlign: "center",
      color: "white",
      letterSpacing: ".04em",
      pointerEvents: "none",
    });
    const eyebrow = document.createElement("div");
    eyebrow.textContent = "EXPEDITION · FINAL APPROACH";
    Object.assign(eyebrow.style, {
      opacity: ".72",
      fontSize: "12px",
      marginBottom: "12px",
    });
    const heading = document.createElement("h2");
    heading.textContent = options.title;
    Object.assign(heading.style, {
      margin: "0",
      fontSize: "clamp(28px, 5vw, 64px)",
    });
    const subtitle = document.createElement("p");
    subtitle.textContent = options.subtitle;
    Object.assign(subtitle.style, {
      opacity: ".82",
      fontSize: "clamp(14px, 2vw, 20px)",
    });
    core.append(eyebrow, heading, subtitle);

    const skip = document.createElement("button");
    skip.type = "button";
    skip.textContent = "Skip";
    Object.assign(skip.style, {
      position: "absolute",
      right: "24px",
      bottom: "24px",
      zIndex: "2",
    });
    root.append(core, skip);
    document.body.append(root);

    let state = startCinematic(
      createCinematicState("expedition-v2-final-reference"),
    );
    let previous = performance.now();
    let raf = 0;
    let finished = false;

    const finish = (result: "complete" | "skipped") => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      root.remove();
      resolve(result);
    };

    skip.addEventListener("click", () => {
      state = skipCinematic(state);
      finish("skipped");
    });

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      state = tickCinematic(state, dt);
      const frame = cinematicFrame(state);
      core.style.opacity = String(
        frame.phase === "resolve"
          ? Math.max(0, 1 - frame.progress)
          : Math.min(1, 0.35 + frame.progress),
      );
      core.style.transform =
        "scale(" + String(0.96 + frame.progress * 0.04) + ")";
      root.style.backgroundColor =
        "rgba(0,0,0," + String(frame.backgroundDim) + ")";
      if (state.phase === "done") {
        finish("complete");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}
