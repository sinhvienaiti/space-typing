import type {
  ExpeditionDraftChoice,
  ExpeditionRestChoice,
  ExpeditionRun,
} from "./core";

export type ExpeditionUi = {
  setResumeAvailable(available: boolean): void;
  showDraft(run: ExpeditionRun): void;
  showBriefing(run: ExpeditionRun): void;
  showRest(run: ExpeditionRun): void;
  showSummary(run: ExpeditionRun): void;
  close(): void;
  destroy(): void;
};

export function mountExpeditionUi(options: {
  onStart(): void;
  onResume(): void;
  onConfirm(choiceId: string, replacementRelicId: string | null): void;
  onContinue(): void;
  onRest(choice: ExpeditionRestChoice): void;
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
  launch.textContent = "Expedition V2";
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

  function showModal(): void {
    if (!dialog.open) dialog.showModal();
  }

  function choiceLabel(choice: ExpeditionDraftChoice): string {
    return choice.kind === "continue"
      ? "Continue without a new Relic"
      : options.relicLabel(choice.relicId);
  }

  function progressText(run: ExpeditionRun): string {
    return (
      "Seed " +
      String(run.seed) +
      " · " +
      String(run.completedEncounters) +
      "/" +
      String(run.encounterPlan.length) +
      " encounters complete"
    );
  }

  function showReplacement(
    run: ExpeditionRun,
    choice: Extract<ExpeditionDraftChoice, { kind: "relic" }>,
  ): void {
    grid.replaceChildren();
    actionsRow.replaceChildren();
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
    actionsRow.append(makeButton("Back", () => showDraft(run)));
  }

  function showDraft(run: ExpeditionRun): void {
    const offer = run.draftOffer;
    if (offer === null) return;

    eyebrow.textContent = "expedition build draft";
    title.textContent =
      run.completedEncounters === 0
        ? "Choose your opening Relic"
        : "Evolve your run build";
    meta.textContent = progressText(run);

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
    showModal();
  }

  function showBriefing(run: ExpeditionRun): void {
    const encounter = run.encounterPlan[run.currentEncounterIndex];
    if (encounter === undefined) return;
    const design = encounter.design;

    eyebrow.textContent = "encounter briefing";
    title.textContent =
      "Encounter " +
      String(run.currentEncounterIndex + 1) +
      " / " +
      String(run.encounterPlan.length);
    meta.textContent =
      (design?.briefing ?? "Continue the Expedition.") +
      " · " +
      progressText(run);

    grid.replaceChildren();
    actionsRow.replaceChildren();

    const card = document.createElement("article");
    card.className = "reward-choice-option";
    const strong = document.createElement("strong");
    strong.textContent =
      (design?.recipe ?? "normal").replaceAll("-", " ") +
      " · " +
      (design?.pattern ?? "normal-word").replaceAll("-", " ");
    const small = document.createElement("small");
    small.textContent =
      (design?.objective ?? "Clear the encounter.") +
      (design?.condition === null || design?.condition === undefined
        ? ""
        : " · Condition: " + design.condition.replaceAll("-", " "));
    card.append(strong, small);
    grid.append(card);

    actionsRow.append(
      makeButton("Start Encounter", options.onContinue, "primary"),
      makeButton("Abandon Expedition", options.onAbandon),
    );
    showModal();
  }

  function showRest(run: ExpeditionRun): void {
    eyebrow.textContent = "recovery boundary";
    title.textContent = "Rest after Encounter 4";
    meta.textContent =
      "Choose one run-local recovery action. Campaign inventory and wallet are not used.";

    grid.replaceChildren();
    actionsRow.replaceChildren();

    grid.append(
      makeButton(
        "Repair 25% Hull",
        () => options.onRest({ kind: "repair", ratio: 0.25 }),
        "reward-choice-option",
      ),
    );

    for (const relicId of run.relics.equipped) {
      grid.append(
        makeButton(
          "Salvage " + options.relicLabel(relicId),
          () => options.onRest({ kind: "salvage", relicId }),
          "reward-choice-option",
        ),
      );
    }

    actionsRow.append(
      makeButton("Abandon Expedition", options.onAbandon),
    );
    showModal();
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
      "% · Campaign economy unchanged";

    grid.replaceChildren();
    actionsRow.replaceChildren();
    const card = document.createElement("article");
    card.className = "reward-choice-option";
    const strong = document.createElement("strong");
    strong.textContent = "Run-local build";
    const small = document.createElement("small");
    const discarded = run.relics.discarded ?? [];
    small.textContent =
      (run.relics.equipped.length > 0
        ? run.relics.equipped.map(options.relicLabel).join(" · ")
        : "No equipped Relics") +
      (discarded.length > 0
        ? " · Salvaged: " + discarded.map(options.relicLabel).join(", ")
        : "");
    card.append(strong, small);
    grid.append(card);
    actionsRow.append(
      makeButton("Return to Campaign", options.onReturn, "primary"),
    );
    showModal();
  }

  return {
    setResumeAvailable(available) {
      resumeAvailable = available;
      launch.textContent = available
        ? "Resume Expedition V2"
        : "Expedition V2";
    },
    showDraft,
    showBriefing,
    showRest,
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
