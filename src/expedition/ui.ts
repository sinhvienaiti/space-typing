import type {
  ExpeditionDraftChoice,
  ExpeditionRun,
} from "./core";

export type ExpeditionUi = {
  setResumeAvailable(available: boolean): void;
  showDraft(run: ExpeditionRun): void;
  showSummary(run: ExpeditionRun): void;
  close(): void;
  destroy(): void;
};

export function mountExpeditionUi(options: {
  onStart(): void;
  onResume(): void;
  onConfirm(choiceId: string, replacementRelicId: string | null): void;
  onAbandon(): void;
  onReturn(): void;
  relicLabel(id: string): string;
}): ExpeditionUi {
  const actions = document.querySelector(".title-play-actions");
  if (actions === null) {
    throw new Error("Expedition UI requires .title-play-actions.");
  }

  let resumeAvailable = false;
  const launch = document.createElement("button");
  launch.type = "button";
  launch.id = "expeditionButton";
  launch.textContent = "Expedition · Prototype";
  launch.addEventListener("click", () => {
    if (resumeAvailable) options.onResume();
    else options.onStart();
  });
  actions.append(launch);

  const dialog = document.createElement("dialog");
  dialog.id = "expeditionDialog";
  dialog.className = "settings-dialog reward-choice-dialog";
  dialog.addEventListener("cancel", (event) => event.preventDefault());

  const head = document.createElement("div");
  head.className = "dialog-head";
  const heading = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  const title = document.createElement("h2");
  heading.append(eyebrow, title);
  head.append(heading);

  const meta = document.createElement("p");
  meta.className = "equipment-note";
  const grid = document.createElement("div");
  grid.className = "reward-choice-grid";
  const actionsRow = document.createElement("div");
  actionsRow.className = "title-group-actions";
  dialog.append(head, meta, grid, actionsRow);
  document.body.append(dialog);

  function makeButton(
    label: string,
    handler: () => void,
    className = "",
  ): HTMLButtonElement {
    const node = document.createElement("button");
    node.type = "button";
    node.textContent = label;
    node.className = className;
    node.addEventListener("click", handler);
    return node;
  }

  function choiceLabel(choice: ExpeditionDraftChoice): string {
    return choice.kind === "continue"
      ? "Continue without a new Relic"
      : options.relicLabel(choice.relicId);
  }

  function showReplacement(
    run: ExpeditionRun,
    choice: Extract<ExpeditionDraftChoice, { kind: "relic" }>,
  ): void {
    grid.replaceChildren();
    const prompt = document.createElement("p");
    prompt.className = "equipment-note";
    prompt.textContent =
      "All 3 Relic slots are full. Choose one equipped Relic to replace.";
    grid.append(prompt);

    for (const id of run.relics.equipped) {
      grid.append(
        makeButton(
          "Replace " + options.relicLabel(id),
          () => options.onConfirm(choice.id, id),
          "reward-choice-option",
        ),
      );
    }
    grid.append(makeButton("Back", () => showDraft(run)));
  }

  function showDraft(run: ExpeditionRun): void {
    const offer = run.draftOffer;
    if (offer === null) return;

    eyebrow.textContent = "expedition draft";
    title.textContent =
      run.completedEncounters === 0
        ? "Choose your opening Relic"
        : "Choose your next Relic";
    meta.textContent =
      "Seed " +
      String(run.seed) +
      " · " +
      String(run.completedEncounters) +
      "/" +
      String(run.encounterPlan.length) +
      " encounters complete";

    grid.replaceChildren();
    actionsRow.replaceChildren();

    for (const choice of offer.choices) {
      grid.append(
        makeButton(
          choiceLabel(choice),
          () => {
            if (
              choice.kind === "relic" &&
              run.relics.equipped.length >= run.relics.maxEquipped &&
              !run.relics.equipped.includes(choice.relicId)
            ) {
              showReplacement(run, choice);
              return;
            }
            options.onConfirm(choice.id, null);
          },
          "reward-choice-option",
        ),
      );
    }

    actionsRow.append(
      makeButton("Abandon Expedition", options.onAbandon),
    );
    if (!dialog.open) dialog.showModal();
  }

  function showSummary(run: ExpeditionRun): void {
    eyebrow.textContent = "expedition summary";
    title.textContent =
      run.phase === "victory"
        ? "Expedition complete"
        : run.phase === "defeat"
          ? "Expedition ended"
          : "Expedition abandoned";
    const accuracy =
      run.completedEncounters > 0
        ? run.accuracySum / run.completedEncounters
        : 0;
    meta.textContent =
      String(run.completedEncounters) +
      "/" +
      String(run.encounterPlan.length) +
      " encounters · Score " +
      run.totalScore.toLocaleString() +
      " · Accuracy " +
      accuracy.toFixed(1) +
      "% · Campaign rewards: none";

    grid.replaceChildren();
    actionsRow.replaceChildren();
    const card = document.createElement("article");
    card.className = "reward-choice-option";
    const strong = document.createElement("strong");
    strong.textContent = "Run-local build";
    const small = document.createElement("small");
    small.textContent =
      run.relics.equipped.length > 0
        ? run.relics.equipped.map(options.relicLabel).join(" · ")
        : "No equipped Relics";
    card.append(strong, small);
    grid.append(card);
    actionsRow.append(
      makeButton("Return to Campaign", options.onReturn, "primary"),
    );
    if (!dialog.open) dialog.showModal();
  }

  return {
    setResumeAvailable(available) {
      resumeAvailable = available;
      launch.textContent = available
        ? "Resume Expedition"
        : "Expedition · Prototype";
    },
    showDraft,
    showSummary,
    close() {
      if (dialog.open) dialog.close();
    },
    destroy() {
      launch.remove();
      dialog.remove();
    },
  };
}
