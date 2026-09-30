import type {
  ExpeditionDraftChoice,
  ExpeditionRestChoice,
  ExpeditionRun,
} from "./core";
import {
  encounterRecipeIconUrl,
  expeditionIconUrl,
  learningIconUrl,
  metaIconUrl,
  relicIconUrl,
  typingPatternIconUrl,
} from "../expansion-v2/asset-map";
import {
  ENCOUNTER_RECIPE_IDS,
  TYPING_PATTERN_IDS,
  type EncounterRecipeId,
  type TypingPatternId,
} from "../expansion-v2/contracts";
import {
  isRelicId,
} from "../relics/registry";

export type ExpeditionUi = {
  setResumeAvailable(available: boolean): void;
  setEvolutionTier(tier: number): void;
  setGhostEnabled(enabled: boolean): void;
  showDraft(run: ExpeditionRun): void;
  showBriefing(run: ExpeditionRun): void;
  showRest(run: ExpeditionRun): void;
  showSummary(run: ExpeditionRun): void;
  close(): void;
  destroy(): void;
};

export function mountExpeditionUi(options: {
  onStart(): void;
  onDailyStart(): void;
  onToggleGhost(): void;
  onResume(): void;
  onConfirm(choiceId: string, replacementRelicId: string | null): void;
  onContinue(): void;
  onRest(choice: ExpeditionRestChoice): void;
  onAbandon(): void;
  onReturn(): void;
  relicLabel(id: string): string;
  ghostCue(run: ExpeditionRun): string | null;
  learningSummary(run: ExpeditionRun): string | null;
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
  const launchIcon = iconImage(
    expeditionIconUrl("mode"),
    "Expedition",
  );
  if (launchIcon !== null) {
    decorateButton(launch, launchIcon);
  }
  launch.addEventListener("click", () => {
    if (resumeAvailable) options.onResume();
    else options.onStart();
  });
  const daily = document.createElement("button");
  daily.type = "button";
  daily.id = "expeditionDailyButton";
  daily.textContent = "Daily Expedition";
  const dailyIcon = iconImage(
    expeditionIconUrl("daily"),
    "Daily Expedition",
  );
  if (dailyIcon !== null) {
    decorateButton(daily, dailyIcon);
  }
  daily.addEventListener("click", options.onDailyStart);
  const ghost = document.createElement("button");
  ghost.type = "button";
  ghost.id = "expeditionGhostButton";
  ghost.textContent = "Ghost · On";
  const ghostIcon = iconImage(
    metaIconUrl("ghost"),
    "Personal Ghost",
  );
  if (ghostIcon !== null) {
    decorateButton(ghost, ghostIcon);
  }
  ghost.addEventListener("click", options.onToggleGhost);
  actions.append(launch, daily, ghost);

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

  function iconImage(
    url: string | null,
    alt: string,
  ): HTMLImageElement | null {
    if (url === null) return null;
    const image = document.createElement("img");
    image.className = "expansion-v2-icon";
    image.src = url;
    image.alt = alt;
    image.loading = "eager";
    image.decoding = "async";
    return image;
  }

  function decorateButton(
    button: HTMLButtonElement,
    image: HTMLImageElement | null,
  ): HTMLButtonElement {
    if (image === null) return button;
    const label = document.createElement("span");
    label.textContent = button.textContent ?? "";
    button.replaceChildren(image, label);
    button.classList.add("expansion-v2-icon-button");
    return button;
  }

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
      const button = makeButton(
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
      );
      const image =
        choice.kind === "relic" && isRelicId(choice.relicId)
          ? iconImage(
              relicIconUrl(choice.relicId),
              options.relicLabel(choice.relicId),
            )
          : null;
      grid.append(decorateButton(button, image));
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
    card.className = "reward-choice-option expansion-v2-briefing-card";
    const media = document.createElement("div");
    media.className = "expansion-v2-card-media";
    const recipe =
      design?.recipe !== undefined &&
      (ENCOUNTER_RECIPE_IDS as readonly string[]).includes(design.recipe)
        ? design.recipe as EncounterRecipeId
        : null;
    const pattern =
      design?.pattern !== undefined &&
      (TYPING_PATTERN_IDS as readonly string[]).includes(design.pattern)
        ? design.pattern as TypingPatternId
        : null;
    const recipeImage =
      recipe === null
        ? null
        : iconImage(
            encounterRecipeIconUrl(recipe),
            recipe.replaceAll("-", " "),
          );
    const patternImage =
      pattern === null
        ? null
        : iconImage(
            typingPatternIconUrl(pattern),
            pattern.replaceAll("-", " "),
          );
    if (recipeImage !== null) media.append(recipeImage);
    if (patternImage !== null) media.append(patternImage);
    if (media.childElementCount > 0) card.append(media);
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
    const ghostCue = options.ghostCue(run);
    if (ghostCue !== null) {
      const cue = document.createElement("small");
      cue.textContent = ghostCue;
      card.append(strong, small, cue);
    } else {
      card.append(strong, small);
    }
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

    const learningSummary = options.learningSummary(run);
    if (learningSummary !== null) {
      const learningCard = document.createElement("article");
      learningCard.className = "reward-choice-option expansion-v2-briefing-card";
      const wantedIcon = iconImage(
        learningIconUrl("wanted"),
        "Wanted Word",
      );
      if (wantedIcon !== null) learningCard.append(wantedIcon);
      const learningTitle = document.createElement("strong");
      learningTitle.textContent = "Wanted Word";
      const learningMeta = document.createElement("small");
      learningMeta.textContent = learningSummary;
      learningCard.append(learningTitle, learningMeta);
      grid.append(learningCard);
    }

    actionsRow.append(
      makeButton("Return to Campaign", options.onReturn, "primary"),
    );
    showModal();
  }

  return {
    setResumeAvailable(available) {
      resumeAvailable = available;
      const label = available
        ? "Resume Expedition V2"
        : "Expedition V2";
      const labelNode = launch.querySelector("span");
      if (labelNode !== null) labelNode.textContent = label;
      else launch.textContent = label;
      daily.disabled = available;
    },
    setEvolutionTier(tier) {
      const safe = Math.max(0, Math.min(3, Math.floor(tier)));
      launch.dataset.evolutionTier = String(safe);
      launch.classList.toggle("expedition-evolution-1", safe >= 1);
      launch.classList.toggle("expedition-evolution-2", safe >= 2);
      launch.classList.toggle("expedition-evolution-3", safe >= 3);
      const label = resumeAvailable
        ? "Resume Expedition V2"
        : safe === 0
          ? "Expedition V2"
          : "Expedition V2 · E" + String(safe);
      const labelNode = launch.querySelector("span");
      if (labelNode !== null) labelNode.textContent = label;
      else launch.textContent = label;
    },
    setGhostEnabled(enabled) {
      ghost.dataset.enabled = String(enabled);
      const label = enabled ? "Ghost · On" : "Ghost · Off";
      const labelNode = ghost.querySelector("span");
      if (labelNode !== null) labelNode.textContent = label;
      else ghost.textContent = label;
      ghost.setAttribute("aria-pressed", String(enabled));
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
      daily.remove();
      ghost.remove();
      dialog.remove();
    },
  };
}
