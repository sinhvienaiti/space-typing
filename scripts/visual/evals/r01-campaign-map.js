(() => {
  const failures = [];
  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const byId = (id) => document.getElementById(id);
  const stageDialog = byId("stageSelectDialog");
  const stageGrid = byId("stageGrid");
  const board = stageGrid?.querySelector(".stage-journey") ?? null;
  const nodes = board === null
    ? []
    : [...board.querySelectorAll(".journey-node[data-stage]")];
  const sector = byId("journeySectorDetail");
  const sectorStages = sector === null
    ? []
    : [...sector.querySelectorAll(".journey-sector-stage")];
  const sectorPath = sector?.querySelector(".journey-sector-path") ?? null;
  const bossLandmark = sector?.querySelector(".journey-sector-landmark-boss") ?? null;
  const restLandmark = sector?.querySelector(".journey-sector-landmark-rest") ?? null;
  const resourceHelp = [...document.querySelectorAll('[data-holo-help="resource"]')];
  const mobile = window.innerWidth <= 720;

  expect(stageDialog instanceof HTMLDialogElement && stageDialog.open, "Campaign Map dialog is not open.");
  expect(stageGrid instanceof HTMLElement, "Campaign Map scroll region is missing.");
  expect(board instanceof HTMLElement, "Journey Map board is missing.");
  expect(nodes.length === 20, `Expected 20 World journey nodes, found ${nodes.length}.`);
  expect(
    nodes.every((node) => node instanceof HTMLButtonElement),
    "Journey nodes must remain native keyboard/touch buttons.",
  );
  expect(
    nodes.every((node) => {
      const stage = Number(node.getAttribute("data-stage"));
      return Number.isInteger(stage) && stage >= 1 && stage <= 1000;
    }),
    "Journey nodes contain an invalid stage contract.",
  );
  expect(sector instanceof HTMLElement, "Current ten-stage sector detail is missing.");
  expect(sectorStages.length === 10, `Expected 10 sector stages, found ${sectorStages.length}.`);
  expect(bossLandmark instanceof HTMLElement, "Sector milestone landmark is missing.");
  expect(restLandmark instanceof HTMLElement, "Checkpoint Rest Hub landmark is missing.");
  expect(
    sector?.querySelectorAll("button").length === 0,
    "Sector detail must not reintroduce ordinary Shop/Station route choices.",
  );
  expect(stageGrid?.getAttribute("role") === "region", "Campaign Map scroll region lost its region role.");
  expect(stageGrid instanceof HTMLElement && stageGrid.tabIndex >= 0, "Campaign Map scroll region is not keyboard focusable.");
  expect(resourceHelp.length >= 8, `Expected contextual resource help targets, found ${resourceHelp.length}.`);
  expect(
    resourceHelp.every((node) => node instanceof HTMLElement && node.tabIndex >= 0 && (node.dataset.tip?.length ?? 0) > 0),
    "Contextual resource help must be keyboard focusable and carry tooltip copy.",
  );

  let keyboardNodeFocusable = false;
  const focusNode = nodes.find((node) => node instanceof HTMLButtonElement && !node.disabled);
  if (focusNode instanceof HTMLButtonElement) {
    focusNode.focus({ preventScroll: true });
    keyboardNodeFocusable = document.activeElement === focusNode;
  }
  expect(keyboardNodeFocusable, "No accessible Journey node accepted keyboard focus.");

  const pathColumns = sectorPath instanceof HTMLElement
    ? getComputedStyle(sectorPath).gridTemplateColumns.split(/\s+/).filter(Boolean).length
    : 0;
  if (mobile) {
    expect(pathColumns === 5, `Mobile sector rail should use 5 columns, found ${pathColumns}.`);
  } else {
    expect(pathColumns === 10, `Desktop sector rail should use 10 columns, found ${pathColumns}.`);
  }

  const viewportOverflow = Math.max(
    0,
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(viewportOverflow <= 1, `Document overflows viewport horizontally by ${viewportOverflow}px.`);

  const stageNumbers = nodes.map((node) => Number(node.getAttribute("data-stage")));
  const selectedStage = Number(
    board?.querySelector(".journey-node.selected[data-stage], .journey-node.current[data-stage], .journey-node.frontier[data-stage]")?.getAttribute("data-stage") ??
      stageNumbers[0] ??
      0,
  );

  return {
    pass: failures.length === 0,
    failures,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    mobile,
    worldNodeCount: nodes.length,
    worldRange: stageNumbers.length === 0
      ? null
      : [Math.min(...stageNumbers), Math.max(...stageNumbers)],
    selectedStage,
    sectorStageCount: sectorStages.length,
    sectorPathColumns: pathColumns,
    hasBossLandmark: bossLandmark instanceof HTMLElement,
    hasRestHubLandmark: restLandmark instanceof HTMLElement,
    resourceHelpCount: resourceHelp.length,
    keyboardNodeFocusable,
    viewportOverflow,
  };
})()