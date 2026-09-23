export type M22ManualGateStatus = "pending" | "pass" | "fail";

export type M22ManualGateRow = {
  id: string;
  section: string;
  scenario: string;
  setup: string;
  passCriteria: string;
};

export type M22ManualGateRowResult = {
  status: M22ManualGateStatus;
  notes: string;
};

export type M22ManualGateState = {
  version: 1;
  browserDevice: string;
  updatedAt: string | null;
  rows: Record<string, M22ManualGateRowResult>;
};

export type M22ManualGateSummary = {
  total: number;
  pass: number;
  fail: number;
  pending: number;
  complete: boolean;
};

export type M22ManualGateMountOptions = {
  showNotice?(message: string): void;
};

export type M22ManualGateController = {
  getState(): M22ManualGateState;
  destroy(): void;
};

export const M22_MANUAL_GATE_STORAGE_KEY =
  "spaceTypingM22ManualGateV1";

export const M22_MANUAL_GATE_ROWS: readonly M22ManualGateRow[] = [
  {
    id: "difficulty-relax",
    section: "Difficulty and typing pace",
    scenario: "Relax",
    setup: "early + late World, 10-30 WPM",
    passCriteria:
      "readable, enough reaction time, no pressure pile that feels unavoidable",
  },
  {
    id: "difficulty-balanced",
    section: "Difficulty and typing pace",
    scenario: "Balanced",
    setup: "early/mid/late, 40-70 WPM",
    passCriteria: "normal reference experience, clear prioritization",
  },
  {
    id: "difficulty-hard",
    section: "Difficulty and typing pace",
    scenario: "Hard",
    setup: "mid/late, 70-100 WPM",
    passCriteria: "meaningfully harder without input unfairness",
  },
  {
    id: "difficulty-extreme",
    section: "Difficulty and typing pace",
    scenario: "Extreme",
    setup: "late World, 100-140 WPM",
    passCriteria: "strong pressure but threats remain readable",
  },
  {
    id: "difficulty-nightmare",
    section: "Difficulty and typing pace",
    scenario: "Nightmare",
    setup: "late World, 150-200 WPM",
    passCriteria: "high density remains understandable",
  },
  {
    id: "difficulty-impossible",
    section: "Difficulty and typing pace",
    scenario: "Impossible",
    setup: "Stage 900+, 250-300 WPM",
    passCriteria:
      "intentionally extreme but still obeys visible rules/caps",
  },
  {
    id: "difficulty-adaptive-low",
    section: "Difficulty and typing pace",
    scenario: "Adaptive low",
    setup: "~25 WPM / ~88%",
    passCriteria: "visibly backs pressure down",
  },
  {
    id: "difficulty-adaptive-mid",
    section: "Difficulty and typing pace",
    scenario: "Adaptive mid",
    setup: "~60 WPM / ~96%",
    passCriteria: "centered pressure",
  },
  {
    id: "difficulty-adaptive-high",
    section: "Difficulty and typing pace",
    scenario: "Adaptive high",
    setup: "100+ WPM / 99%+",
    passCriteria: "increases pressure without impossible overlap",
  },
  {
    id: "world-early",
    section: "World / enemy composition",
    scenario: "Early World",
    setup: "World 01-05",
    passCriteria: "target text and visuals clear",
  },
  {
    id: "world-mid",
    section: "World / enemy composition",
    scenario: "Mid World",
    setup: "World 20-30",
    passCriteria: "distinct identity from early game",
  },
  {
    id: "world-late",
    section: "World / enemy composition",
    scenario: "Late World",
    setup: "World 46-50",
    passCriteria: "dense visuals remain readable",
  },
  {
    id: "world-controller-heavy",
    section: "World / enemy composition",
    scenario: "Controller-heavy",
    setup: "spawn Jammer/Controller mix",
    passCriteria: "player understands CC source and duration",
  },
  {
    id: "world-support-heavy",
    section: "World / enemy composition",
    scenario: "Support-heavy",
    setup: "Healer/Carrier/Commander mix",
    passCriteria: "support relationships are understandable",
  },
  {
    id: "world-rank-vii-x",
    section: "World / enemy composition",
    scenario: "Rank VII-X",
    setup: "Rank X + 3 layers preset",
    passCriteria: "Rank/layer progression visually obvious",
  },
  {
    id: "world-formation-pressure",
    section: "World / enemy composition",
    scenario: "Formation pressure",
    setup: "formation stress preset",
    passCriteria: "package creates decisions, not unreadable overlap",
  },
  {
    id: "boss-mini",
    section: "Bosses / special encounters",
    scenario: "Mini Boss",
    setup: "any World Stage +10",
    passCriteria: "mechanic and phase pressure readable",
  },
  {
    id: "boss-world",
    section: "Bosses / special encounters",
    scenario: "World Boss",
    setup: "any World Stage +20",
    passCriteria: "boss identity matches World",
  },
  {
    id: "boss-galaxy",
    section: "Bosses / special encounters",
    scenario: "Galaxy Major Boss",
    setup: "Stage 100/200/.../1000",
    passCriteria: "multi-phase pressure readable",
  },
  {
    id: "boss-hidden-challenge",
    section: "Bosses / special encounters",
    scenario: "Hidden Challenge",
    setup: "discovered/forced hidden encounter",
    passCriteria: "optional risk/reward is clear",
  },
  {
    id: "boss-hidden-world",
    section: "Bosses / special encounters",
    scenario: "Hidden World",
    setup: "force hidden-world route",
    passCriteria: "theme/roster/music visibly distinct",
  },
  {
    id: "boss-champion-hunt",
    section: "Bosses / special encounters",
    scenario: "Champion Hunt",
    setup: "priority-target chain",
    passCriteria: "announcer chain and target priority understandable",
  },
  {
    id: "recovery-ordinary-death",
    section: "Death / recovery",
    scenario: "Ordinary death",
    setup: "checkpoint 181, die at 190",
    passCriteria: "clearly returns to committed checkpoint/economy",
  },
  {
    id: "recovery-salvage-anchor",
    section: "Death / recovery",
    scenario: "Salvage Anchor",
    setup: "built-in preset",
    passCriteria:
      "economy preservation vs frontier rollback understandable",
  },
  {
    id: "recovery-stage-revival",
    section: "Death / recovery",
    scenario: "Stage Revival Core",
    setup: "built-in preset",
    passCriteria: "stage-entry restart is visually clear",
  },
  {
    id: "recovery-phoenix",
    section: "Death / recovery",
    scenario: "Phoenix Core",
    setup: "boss-phase preset",
    passCriteria: "same encounter resumes with grace/resources",
  },
  {
    id: "recovery-technical-crash",
    section: "Death / recovery",
    scenario: "Technical crash",
    setup: "Test Lab crash snapshot",
    passCriteria: "recovery does not look like a gameplay death",
  },
  {
    id: "route-normal-shop",
    section: "Shops / route",
    scenario: "Normal shop",
    setup: "route/shop",
    passCriteria: "finite stock and prices readable",
  },
  {
    id: "route-hidden-black-market",
    section: "Shops / route",
    scenario: "Hidden / black market",
    setup: "force rare shop",
    passCriteria: "rare identity and stock clear",
  },
  {
    id: "route-station",
    section: "Shops / route",
    scenario: "Station",
    setup: "route Station",
    passCriteria: "repair/upgrade/support service flow clear",
  },
  {
    id: "route-branching-map",
    section: "Shops / route",
    scenario: "Branching Route Map",
    setup: "fresh ten-stage sector",
    passCriteria: "choices understandable, mandatory bosses obvious",
  },
  {
    id: "visual-high",
    section: "Visual quality / performance",
    scenario: "High quality",
    setup: "1920x1080+",
    passCriteria: "no text obscured by glow/particles",
  },
  {
    id: "visual-ultra",
    section: "Visual quality / performance",
    scenario: "Ultra quality",
    setup: "high-DPI display",
    passCriteria: "acceptable frame pacing; no runaway particles",
  },
  {
    id: "visual-max-pressure",
    section: "Visual quality / performance",
    scenario: "Max pressure",
    setup: "M21 formation/max-pressure preset",
    passCriteria:
      "no visible freeze/stutter from bounded runtime collections",
  },
  {
    id: "visual-long-session",
    section: "Visual quality / performance",
    scenario: "Long session",
    setup: "15+ minutes mixed combat",
    passCriteria: "no accumulating audio/visual artifacts",
  },
  {
    id: "audio-world-intense",
    section: "Audio",
    scenario: "World -> intense",
    setup: "regular combat pressure",
    passCriteria: "transition smooth; no duplicate tracks",
  },
  {
    id: "audio-world-boss",
    section: "Audio",
    scenario: "World -> boss",
    setup: "boss transition preset",
    passCriteria: "crossfade feels intentional",
  },
  {
    id: "audio-boss-phase",
    section: "Audio",
    scenario: "Boss phase",
    setup: "phase 1 -> 2 -> 3",
    passCriteria:
      "pressure/music boost does not clip or overwhelm typing",
  },
  {
    id: "audio-pronunciation-combat",
    section: "Audio",
    scenario: "Pronunciation + combat",
    setup: "enable English pronunciation",
    passCriteria: "word remains intelligible",
  },
  {
    id: "audio-announcer-pronunciation",
    section: "Audio",
    scenario: "Announcer + pronunciation",
    setup: "trigger together",
    passCriteria: "strongest duck keeps speech intelligible",
  },
  {
    id: "audio-warning-speech",
    section: "Audio",
    scenario: "Warning + speech",
    setup: "warning during speech",
    passCriteria: "warning remains noticeable without masking word",
  },
  {
    id: "audio-shop-station",
    section: "Audio",
    scenario: "Shop / Station",
    setup: "transition in/out",
    passCriteria: "music state clearly changes and restores",
  },
  {
    id: "audio-victory-defeat",
    section: "Audio",
    scenario: "Victory / defeat",
    setup: "complete/fail encounter",
    passCriteria: "stinger does not leave looping track behind",
  },
];

function emptyRowResult(): M22ManualGateRowResult {
  return {
    status: "pending",
    notes: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function statusValue(value: unknown): M22ManualGateStatus {
  return value === "pass" || value === "fail" ? value : "pending";
}

function stringValue(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.slice(0, maxLength)
    : "";
}

export function createM22ManualGateState(): M22ManualGateState {
  return {
    version: 1,
    browserDevice: "",
    updatedAt: null,
    rows: Object.fromEntries(
      M22_MANUAL_GATE_ROWS.map((row) => [row.id, emptyRowResult()]),
    ),
  };
}

export function sanitizeM22ManualGateState(
  value: unknown,
): M22ManualGateState {
  const state = createM22ManualGateState();
  if (!isRecord(value)) return state;

  state.browserDevice = stringValue(value.browserDevice, 240);
  state.updatedAt =
    typeof value.updatedAt === "string"
      ? value.updatedAt.slice(0, 80)
      : null;

  const rows = isRecord(value.rows) ? value.rows : {};
  for (const row of M22_MANUAL_GATE_ROWS) {
    const candidate = rows[row.id];
    if (!isRecord(candidate)) continue;
    state.rows[row.id] = {
      status: statusValue(candidate.status),
      notes: stringValue(candidate.notes, 4000),
    };
  }

  return state;
}

export function m22ManualGateSummary(
  state: M22ManualGateState,
): M22ManualGateSummary {
  let pass = 0;
  let fail = 0;
  let pending = 0;

  for (const row of M22_MANUAL_GATE_ROWS) {
    const status = state.rows[row.id]?.status ?? "pending";
    if (status === "pass") pass += 1;
    else if (status === "fail") fail += 1;
    else pending += 1;
  }

  return {
    total: M22_MANUAL_GATE_ROWS.length,
    pass,
    fail,
    pending,
    complete: fail === 0 && pending === 0,
  };
}

function markdownCell(value: string): string {
  return value
    .replaceAll("|", "\\|")
    .replace(/\r?\n/g, "<br>");
}

function statusLabel(status: M22ManualGateStatus): string {
  if (status === "pass") return "PASS";
  if (status === "fail") return "FAIL";
  return "PENDING";
}

export function m22ManualGateMarkdown(
  state: M22ManualGateState,
): string {
  const summary = m22ManualGateSummary(state);
  const lines = [
    "# M22 Manual Browser / Audio / Visual Playtest Report",
    "",
    "- Browser/device: " +
      (state.browserDevice.trim() || "NOT RECORDED"),
    "- Updated: " + (state.updatedAt ?? "NOT RECORDED"),
    "- Summary: " +
      String(summary.pass) +
      " PASS / " +
      String(summary.fail) +
      " FAIL / " +
      String(summary.pending) +
      " PENDING / " +
      String(summary.total) +
      " total",
    "",
  ];

  let section = "";
  for (const row of M22_MANUAL_GATE_ROWS) {
    if (row.section !== section) {
      section = row.section;
      lines.push(
        "## " + section,
        "",
        "| Scenario | Setup | Pass criteria | Status | Notes |",
        "| --- | --- | --- | --- | --- |",
      );
    }

    const result = state.rows[row.id] ?? emptyRowResult();
    lines.push(
      "| " +
        markdownCell(row.scenario) +
        " | " +
        markdownCell(row.setup) +
        " | " +
        markdownCell(row.passCriteria) +
        " | " +
        statusLabel(result.status) +
        " | " +
        markdownCell(result.notes) +
        " |",
    );
  }

  lines.push(
    "",
    summary.complete
      ? "M22 manual gate result: COMPLETE CANDIDATE — final post-fix CI is still required."
      : "M22 manual gate result: INCOMPLETE.",
    "",
  );

  return lines.join("\n");
}

function loadStoredState(): M22ManualGateState {
  try {
    const raw = localStorage.getItem(M22_MANUAL_GATE_STORAGE_KEY);
    return raw === null
      ? createM22ManualGateState()
      : sanitizeM22ManualGateState(JSON.parse(raw));
  } catch {
    return createM22ManualGateState();
  }
}

function storeState(state: M22ManualGateState): void {
  try {
    localStorage.setItem(
      M22_MANUAL_GATE_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Manual QA recording must never break the Test Lab runtime.
  }
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard !== undefined) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

export function mountM22ManualGate(
  root: HTMLElement,
  options: M22ManualGateMountOptions = {},
): M22ManualGateController {
  let state = loadStoredState();

  const intro = document.createElement("p");
  intro.className = "equipment-note";
  intro.textContent =
    "QA-only recorder for docs/M22_MANUAL_PLAYTEST_MATRIX.md. " +
    "It stores observations locally and never writes PlayerSave.";

  const summaryNode = document.createElement("strong");
  const browserLabel = document.createElement("label");
  browserLabel.textContent = "Browser / device";
  const browserInput = document.createElement("input");
  browserInput.type = "text";
  browserInput.placeholder = "Chrome 151 · macOS · speakers/headphones";
  browserInput.value = state.browserDevice;
  browserLabel.append(browserInput);

  const actions = document.createElement("div");
  actions.className = "test-lab-row";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy Markdown Report";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset Recorder";

  actions.append(copyButton, resetButton);
  root.replaceChildren(intro, summaryNode, browserLabel, actions);

  const sectionNodes = new Map<string, HTMLElement>();
  const sectionSummaries = new Map<string, HTMLElement>();

  function persist(): void {
    state.updatedAt = new Date().toISOString();
    state.browserDevice = browserInput.value.slice(0, 240);
    storeState(state);
    renderSummary();
  }

  function renderSummary(): void {
    const summary = m22ManualGateSummary(state);
    summaryNode.textContent =
      "M22 manual gate · " +
      String(summary.pass) +
      "/" +
      String(summary.total) +
      " PASS · " +
      String(summary.fail) +
      " FAIL · " +
      String(summary.pending) +
      " PENDING";

    for (const [section, node] of sectionSummaries) {
      const rows = M22_MANUAL_GATE_ROWS.filter(
        (row) => row.section === section,
      );
      const passed = rows.filter(
        (row) => state.rows[row.id]?.status === "pass",
      ).length;
      const failed = rows.filter(
        (row) => state.rows[row.id]?.status === "fail",
      ).length;
      node.textContent =
        section +
        " · " +
        String(passed) +
        "/" +
        String(rows.length) +
        " PASS" +
        (failed > 0 ? " · " + String(failed) + " FAIL" : "");
    }
  }

  for (const row of M22_MANUAL_GATE_ROWS) {
    let section = sectionNodes.get(row.section);
    if (section === undefined) {
      const details = document.createElement("details");
      const sectionSummary = document.createElement("summary");
      const body = document.createElement("div");
      details.append(sectionSummary, body);
      root.append(details);
      section = body;
      sectionNodes.set(row.section, body);
      sectionSummaries.set(row.section, sectionSummary);
    }

    const result = state.rows[row.id] ?? emptyRowResult();
    const container = document.createElement("div");
    container.className = "test-lab-grid";

    const scenario = document.createElement("label");
    const title = document.createElement("strong");
    title.textContent = row.scenario;
    const setup = document.createElement("small");
    setup.textContent = row.setup + " · " + row.passCriteria;
    scenario.append(title, setup);

    const status = document.createElement("select");
    status.append(
      optionForStatus("pending", "PENDING"),
      optionForStatus("pass", "PASS"),
      optionForStatus("fail", "FAIL"),
    );
    status.value = result.status;

    const notes = document.createElement("input");
    notes.type = "text";
    notes.placeholder = "Observed issue / steps / screenshot or audio note";
    notes.maxLength = 4000;
    notes.value = result.notes;

    status.addEventListener("change", () => {
      state.rows[row.id] = {
        status: statusValue(status.value),
        notes: notes.value.slice(0, 4000),
      };
      persist();
    });

    notes.addEventListener("change", () => {
      state.rows[row.id] = {
        status: statusValue(status.value),
        notes: notes.value.slice(0, 4000),
      };
      persist();
    });

    container.append(scenario, status, notes);
    section.append(container);
  }

  browserInput.addEventListener("change", persist);

  copyButton.addEventListener("click", () => {
    persist();
    void copyText(m22ManualGateMarkdown(state))
      .then(() => {
        options.showNotice?.("M22 manual report copied");
      })
      .catch(() => {
        options.showNotice?.(
          "Clipboard unavailable; use browser devtools/local storage to recover the QA report",
        );
      });
  });

  resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset all M22 manual playtest observations?")) {
      return;
    }
    state = createM22ManualGateState();
    browserInput.value = "";
    storeState(state);
    root.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
      select.value = "pending";
    });
    root.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach(
      (input) => {
        if (input !== browserInput) input.value = "";
      },
    );
    renderSummary();
    options.showNotice?.("M22 manual recorder reset");
  });

  renderSummary();

  return {
    getState(): M22ManualGateState {
      return sanitizeM22ManualGateState(state);
    },
    destroy(): void {
      root.replaceChildren();
    },
  };
}

function optionForStatus(
  value: M22ManualGateStatus,
  label: string,
): HTMLOptionElement {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}
