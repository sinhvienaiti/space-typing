from pathlib import Path
import re


def one(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{path}: expected 1 exact match, got {n}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


def rx(path: str, pattern: str, replacement: str, flags: int = 0) -> None:
    p = Path(path)
    text = p.read_text()
    out, n = re.subn(pattern, replacement, text, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f"{path}: expected 1 regex match, got {n}: {pattern[:100]!r}")
    p.write_text(out)


# 1) Expedition ownership: Back returns to Campaign without deleting resumable run data.
one(
    "src/main.ts",
    'async function startSelectedStage(practice = false): Promise<void> {\n  if (expeditionSession.ownsCampaignPersistence()) return;',
    'async function startSelectedStage(practice = false): Promise<void> {\n  if (expeditionSession.ownsCampaignPersistence()) {\n    showNotice("Expedition is still active · use Back to leave it, or Resume Expedition to continue.");\n    return;\n  }',
)
one(
    "src/main.ts",
    '''for (const id of ["titleButton", "clearTitleButton"]) {
  byId(id).addEventListener("click", async () => {
    if (!await finishManagedSortie("abandoned")) return;
    if (testingStagePreviewActive()) {
      restoreTestingStagePersistentState();
    }
    game.backToTitle();
  });
}''',
    '''function releaseExpeditionOwnershipForTitle(): void {
  if (!expeditionSession.ownsCampaignPersistence()) return;
  const campaignSnapshot = expeditionCampaignSnapshot;
  expansionEncounterRuntime = null;
  game.setExpansionEncounterContext(null);
  if (campaignSnapshot !== null) {
    applyAutosaveSnapshot(campaignSnapshot);
    refreshPersistentStateUi();
  }
  expeditionSession.release();
  expeditionCampaignSnapshot = null;
  latestCreditMode = "campaign";
  expeditionUi?.setResumeAvailable(expeditionSession.hasResumableRun());
}

for (const id of ["titleButton", "clearTitleButton"]) {
  byId(id).addEventListener("click", async () => {
    if (!await finishManagedSortie("abandoned")) return;
    if (testingStagePreviewActive()) {
      restoreTestingStagePersistentState();
    }
    game.backToTitle();
    releaseExpeditionOwnershipForTitle();
  });
}''',
)

# 2) Long-word diversity fallback from the existing stage vocabulary.
one(
    "src/expansion-v2/pattern-runtime.ts",
    'import type { TypingPatternId } from "./contracts";\n',
    'import type { TypingPatternId } from "./contracts";\n\nexport const LONG_WORD_MIN_DIVERSITY = 6;\n',
)
rx(
    "src/expansion-v2/pattern-runtime.ts",
    r'''  if \(pattern === "long-word"\) \{\n    const filtered = valid\.filter\(\n      \(entry\) => typingText\(entry\.en\)\.length >= 8,\n    \);\n    return filtered\.length > 0 \? filtered : \[\.\.\.valid\];\n  \}''',
    '''  if (pattern === "long-word") {
    const longWords = valid.filter(
      (entry) => typingText(entry.en).length >= 8,
    );
    const diversityTarget = Math.min(LONG_WORD_MIN_DIVERSITY, valid.length);
    if (longWords.length >= diversityTarget) return longWords;

    const longSet = new Set(longWords);
    const fallback = rotated(
      valid.filter((entry) => !longSet.has(entry)),
      seed,
    ).sort(
      (left, right) => typingText(right.en).length - typingText(left.en).length,
    );
    return [
      ...longWords,
      ...fallback.slice(0, diversityTarget - longWords.length),
    ];
  }''',
)

# 3) WARP UI ticks on aligned seconds; authoritative persistence remains 5-secondly.
one(
    "src/ui/warp-hud.ts",
    "/** Pure display projection of already-reconciled account state, never a second wallet. */",
    '''/** Milliseconds until the next whole-second boundary. */
export function warpCountdownTickDelay(nowMs: number): number {
  const normalized = Math.max(0, Math.floor(nowMs));
  const remainder = normalized % 1000;
  return remainder === 0 ? 1000 : 1000 - remainder;
}

/** Pure display projection of already-reconciled account state, never a second wallet. */''',
)
one(
    "src/main.ts",
    'import { warpHudView, warpRefuelView } from "./ui/warp-hud";',
    'import { warpCountdownTickDelay, warpHudView, warpRefuelView } from "./ui/warp-hud";',
)
rx(
    "src/main.ts",
    r'''window\.setInterval\(\(\) => \{\n  if \(\n    !expeditionSession\.ownsCampaignPersistence\(\)\n    && expeditionCampaignSnapshot === null\n    && !testingStagePreviewActive\(\)\n  \) \{\n    persistAutosave\("warp-tick"\);\n  \}\n  if \(currentScreen\(\) === "title"\) \{\n    void renderHubViews\(\);\n  \}\n\}, 5_000\);''',
    '''const warpPersistenceInterval = window.setInterval(() => {
  if (
    !expeditionSession.ownsCampaignPersistence()
    && expeditionCampaignSnapshot === null
    && !testingStagePreviewActive()
  ) {
    persistAutosave("warp-tick");
  }
}, 5_000);

let warpCountdownTimer: number | null = null;
let warpCountdownStopped = false;
function scheduleWarpCountdownTick(): void {
  if (warpCountdownStopped) return;
  warpCountdownTimer = window.setTimeout(() => {
    if (warpCountdownStopped) return;
    if (currentScreen() === "title") void renderHubViews();
    scheduleWarpCountdownTick();
  }, warpCountdownTickDelay(Date.now()));
}
scheduleWarpCountdownTick();
window.addEventListener("pagehide", () => {
  warpCountdownStopped = true;
  if (warpCountdownTimer !== null) window.clearTimeout(warpCountdownTimer);
  window.clearInterval(warpPersistenceInterval);
}, { once: true });''',
)

# 4) Briefing is informational. Interactive route selection remains openRouteMap().
p = Path("src/main.ts")
text = p.read_text()
marker = "\nfunction openRestHub(): void {"
if text.count(marker) != 1:
    raise SystemExit("src/main.ts: openRestHub marker drifted")
briefing = '''
function openStageBriefing(): void {
  if (
    ascension.selectedTier > 0 ||
    !persistenceReady ||
    !canOpenBetweenStageMenu()
  ) {
    showNotice("Mission Briefing is available between Campaign stages.");
    return;
  }

  const targetStage = routeTargetStage();
  route = syncRouteStateForStage(route, targetStage);
  const progress = routeProgress(route);
  const selected = selectedRouteNode(route, targetStage);
  const role = String(stageRole(targetStage));
  const stageLabel = String(targetStage).padStart(3, "0");
  byId("routeTitle").textContent = "Stage " + stageLabel + " · Mission Briefing";
  byId("routeMeta").textContent =
    "Sector " + String(route.graph.sectorStart).padStart(3, "0") + "-" +
    String(route.graph.sectorEnd).padStart(3, "0") + " · " +
    String(progress.chosen) + "/" + String(progress.total) + " route choices committed";

  const map = byId("routeMap");
  map.replaceChildren();
  map.classList.remove("route-sector-briefing");
  const summary = document.createElement("section");
  summary.className = "route-selected";
  const title = document.createElement("strong");
  title.textContent = selected === null
    ? "Mission route pending"
    : routeNodeLabel(selected.type) + " · Stage " + stageLabel;
  const detail = document.createElement("span");
  detail.textContent = selected === null
    ? "No route choice is committed yet. Starting the stage will open the route chooser when a branch decision is required."
    : routeNodeDescription(selected);
  const objective = document.createElement("small");
  objective.textContent = role.includes("boss")
    ? "Objective · defeat the sector boss and secure the checkpoint."
    : targetStage % 10 === 0
      ? "Objective · clear the checkpoint encounter and unlock rest services."
      : "Objective · clear the combat encounter and preserve the Campaign run.";
  summary.append(title, detail, objective);
  map.append(summary);
  byId("routeSelectedPanel").classList.add("hidden");
  byId("hiddenEncounterPanel").classList.add("hidden");
  if (!routeDialog.open) routeDialog.showModal();
}
'''
p.write_text(text.replace(marker, briefing + marker, 1))
one(
    "src/main.ts",
    'byId("routeButton").addEventListener("click", openRouteMap);',
    'byId("routeButton").addEventListener("click", openStageBriefing);',
)

# 5) Speaker is the single output-audio quick control; mic/input controls are untouched.
p = Path("index.html")
html = p.read_text()
for button_id in ("titleMusicButton", "titleVoiceButton"):
    pattern = rf'\n\s*<button id="{button_id}"[^>]*></button>'
    html, n = re.subn(pattern, "", html, count=1)
    if n != 1:
        raise SystemExit(f"index.html: failed to remove {button_id}")
credit = r'\n\s*<div class="holo-slider">\s*<button type="button" class="holo-slider-icon" data-icon="sparkle" data-mute="creditVolume"[\s\S]*?<output id="quickCreditVolumeValue">100%</output>\s*</div>'
html, n = re.subn(credit, "", html, count=1)
if n != 1:
    raise SystemExit("index.html: failed to remove quick credit slider")
for old, new in [
    ('<small>Music</small><input id="quickMusicVolume"', '<small>BGM</small><input id="quickMusicVolume"'),
    ('<small>Effects</small><input id="quickSfxVolume"', '<small>SFX</small><input id="quickSfxVolume"'),
    ('<small>Voice (pronunciation)</small><input id="quickVoiceVolume"', '<small>Voice / Pronunciation</small><input id="quickVoiceVolume"'),
]:
    if html.count(old) != 1:
        raise SystemExit(f"index.html: label drift: {old}")
    html = html.replace(old, new, 1)
p.write_text(html)
one(
    "src/ui/title-hub.ts",
    '  { field: "creditVolume", input: "quickCreditVolume", fallback: 1 },\n',
    "",
)

# 6) SpeechSynthesis caps volume at 1.0; choose a clearer local English source at that ceiling.
p = Path("src/speech.ts")
text = p.read_text()
old = '''function englishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "en-us") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
}'''
new = '''const PREFERRED_ENGLISH_VOICE_NAMES = [
  "google us english",
  "microsoft aria",
  "microsoft jenny",
  "samantha",
  "alex",
] as const;

export function selectEnglishVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  voices.forEach((voice, index) => {
    const lang = voice.lang.toLowerCase();
    if (!lang.startsWith("en")) return;
    const name = voice.name.toLowerCase();
    const preferred = PREFERRED_ENGLISH_VOICE_NAMES.findIndex(
      (candidate) => name.includes(candidate),
    );
    let score = lang == "en-us" ? 100 : 50;
    if (voice.localService) score += 40;
    if (voice.default) score += 5;
    if (preferred >= 0) score += 200 - preferred * 10;
    score -= index / 1000;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  });
  return best;
}

function englishVoice(): SpeechSynthesisVoice | null {
  return selectEnglishVoice(speechSynthesis.getVoices());
}'''
if text.count(old) != 1:
    raise SystemExit("src/speech.ts: englishVoice block drifted")
p.write_text(text.replace(old, new, 1))

# Regression tests.
one(
    "tests/expansion-v2-pattern-runtime.test.ts",
    "  buildPatternVocabulary,\n  chainMinimumLayers,",
    "  buildPatternVocabulary,\n  LONG_WORD_MIN_DIVERSITY,\n  chainMinimumLayers,",
)
one(
    "tests/expansion-v2-pattern-runtime.test.ts",
    "    expect(long.some((entry) => entry.en.length >= 8)).toBe(true);",
    "    expect(long.some((entry) => entry.en.length >= 8)).toBe(true);\n    expect(new Set(long.map((entry) => entry.en)).size).toBe(\n      Math.min(LONG_WORD_MIN_DIVERSITY, words.length),\n    );",
)
one(
    "tests/warp-hud.test.ts",
    'import { warpHudView, warpRefuelView } from "../src/ui/warp-hud";',
    'import { warpCountdownTickDelay, warpHudView, warpRefuelView } from "../src/ui/warp-hud";',
)
one(
    "tests/warp-hud.test.ts",
    'describe("pilot-card Warp HUD", () => {',
    '''describe("pilot-card Warp HUD", () => {
  it("aligns countdown rendering to whole-second boundaries without drift", () => {
    expect(warpCountdownTickDelay(10_000)).toBe(1000);
    expect(warpCountdownTickDelay(10_001)).toBe(999);
    expect(warpCountdownTickDelay(10_999)).toBe(1);
  });''',
)
one(
    "tests/expedition-session.test.ts",
    '  it("QA phase forcing stays inside Expedition storage", () => {',
    '''  it("release clears Expedition ownership but preserves a resumable run", () => {
    const storage = new MemoryStorage();
    const session = new ExpeditionSession(storage, "tab-a");
    session.start(createRun("leave-and-resume"), ["a", "b"]);

    expect(session.ownsCampaignPersistence()).toBe(true);
    session.release();
    expect(session.ownsCampaignPersistence()).toBe(false);
    expect(session.hasResumableRun()).toBe(true);
    expect(session.resume(["a", "b"])?.runId).toBe("leave-and-resume");
  });

  it("QA phase forcing stays inside Expedition storage", () => {''',
)
one(
    "tests/speech-focus.test.ts",
    'import { setSpeechGate, speakEnglish, stopSpeech } from "../src/speech";',
    'import { selectEnglishVoice, setSpeechGate, speakEnglish, stopSpeech } from "../src/speech";',
)
one(
    "tests/speech-focus.test.ts",
    'describe("pronunciation lifecycle hardening", () => {',
    '''describe("pronunciation lifecycle hardening", () => {
  it("prefers a clear local English voice at the native volume ceiling", () => {
    const voices = [
      { name: "Cloud English", lang: "en-US", localService: false, default: true, voiceURI: "cloud" },
      { name: "Samantha", lang: "en-US", localService: true, default: false, voiceURI: "local" },
    ] as SpeechSynthesisVoice[];
    expect(selectEnglishVoice(voices)?.name).toBe("Samantha");
  });''',
)

Path("tests/integration-polish.test.ts").write_text('''import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("integration polish contracts", () => {
  it("detaches Expedition ownership on Back and makes Campaign/Recall launch actionable", () => {
    expect(main).toContain("releaseExpeditionOwnershipForTitle();");
    expect(main).toContain("Expedition is still active · use Back to leave it, or Resume Expedition to continue.");
    expect(main).toContain("startRecall: () =>");
    expect(main).toContain('byId<HTMLButtonElement>("startButton").click();');
  });

  it("keeps Stage Select navigation separate from mission Briefing", () => {
    expect(main).toContain('byId("routeButton").addEventListener("click", openStageBriefing);');
    expect(main).toContain("function openStageBriefing(): void");
    expect(main).toContain("openRouteMap();");
  });

  it("exposes one output-audio HUD entry with BGM, SFX and pronunciation", () => {
    expect(html).not.toContain('id="titleMusicButton"');
    expect(html).not.toContain('id="titleVoiceButton"');
    expect(html).not.toContain('id="quickCreditVolume"');
    expect(html).toContain('<small>BGM</small><input id="quickMusicVolume"');
    expect(html).toContain('<small>SFX</small><input id="quickSfxVolume"');
    expect(html).toContain('<small>Voice / Pronunciation</small><input id="quickVoiceVolume"');
  });

  it("runs an aligned one-second WARP ticker with lifecycle cleanup", () => {
    expect(main).toContain("warpCountdownTickDelay(Date.now())");
    expect(main).toContain('window.addEventListener("pagehide"');
    expect(main).toContain("window.clearTimeout(warpCountdownTimer)");
  });
});
''')
