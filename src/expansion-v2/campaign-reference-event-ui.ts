import type { CampaignReferenceRouteChoice } from "./campaign-reference-event";

export type CampaignReferenceEventUi = {
  show(): void;
  close(): void;
  destroy(): void;
};

export function mountCampaignReferenceEventUi(options: {
  onChoice(choice: CampaignReferenceRouteChoice): void;
}): CampaignReferenceEventUi {
  const dialog = document.createElement("dialog");
  dialog.id = "campaignV2RouteEventDialog";
  dialog.className = "settings-dialog reward-choice-dialog";
  dialog.addEventListener("cancel", (event) => event.preventDefault());

  const head = document.createElement("div");
  head.className = "dialog-head";
  const heading = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "campaign route event";
  const title = document.createElement("h2");
  title.textContent = "Ancient Gate";
  heading.append(eyebrow, title);
  head.append(heading);

  const meta = document.createElement("p");
  meta.className = "equipment-note";
  meta.textContent =
    "Choose the pressure profile for Stage 036. This changes only the next encounter pattern; Campaign wallet, gear and rewards stay unchanged.";

  const grid = document.createElement("div");
  grid.className = "reward-choice-grid";

  const risk = document.createElement("button");
  risk.type = "button";
  risk.className = "reward-choice-option";
  const riskTitle = document.createElement("strong");
  riskTitle.textContent = "Risky route";
  const riskMeta = document.createElement("small");
  riskMeta.textContent =
    "Short Burst pressure · more rapid target switching";
  risk.append(riskTitle, riskMeta);
  risk.addEventListener("click", () => options.onChoice("risk"));

  const stable = document.createElement("button");
  stable.type = "button";
  stable.className = "reward-choice-option";
  const stableTitle = document.createElement("strong");
  stableTitle.textContent = "Stable route";
  const stableMeta = document.createElement("small");
  stableMeta.textContent =
    "Normal Word pressure · balanced pacing";
  stable.append(stableTitle, stableMeta);
  stable.addEventListener("click", () => options.onChoice("stable"));

  grid.append(risk, stable);
  dialog.append(head, meta, grid);
  document.body.append(dialog);

  return {
    show() {
      if (!dialog.open) dialog.showModal();
    },
    close() {
      if (dialog.open) dialog.close();
    },
    destroy() {
      dialog.remove();
    },
  };
}
