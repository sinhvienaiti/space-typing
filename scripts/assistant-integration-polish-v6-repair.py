from pathlib import Path

HELPER = Path("scripts/assistant-integration-polish.py")
text = HELPER.read_text()
start_marker = "# 3) WARP UI ticks on aligned seconds; authoritative persistence remains 5-secondly."
end_marker = "# 4) Briefing is informational. Interactive route selection remains openRouteMap()."
start = text.index(start_marker)
end = text.index(end_marker, start)

replacement = r"""# 3) WARP UI ticks every second while the existing 5-second persistence cadence remains authoritative.
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
one(
    "src/main.ts",
    '''window.setInterval(() => {
  renderWarpHud();
  if (persistenceReady && accountTransactions.canWrite() && !accountTransactions.busy()
    && !testingStagePreviewActive() && !practiceRestorePending && !clearSettlementPending
    && warpAccount?.attempt?.phase === "active" && game.getPhase() === "playing" && credits !== committedCredits) {
    void autosaveCampaign("manual");
  }
}, 5_000);''',
    '''const warpPersistenceInterval = window.setInterval(() => {
  if (persistenceReady && accountTransactions.canWrite() && !accountTransactions.busy()
    && !testingStagePreviewActive() && !practiceRestorePending && !clearSettlementPending
    && warpAccount?.attempt?.phase === "active" && game.getPhase() === "playing" && credits !== committedCredits) {
    void autosaveCampaign("manual");
  }
}, 5_000);

let warpCountdownTimer: number | null = null;
let warpCountdownStopped = false;
function scheduleWarpCountdownTick(): void {
  if (warpCountdownStopped) return;
  warpCountdownTimer = window.setTimeout(() => {
    if (warpCountdownStopped) return;
    renderWarpHud();
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

"""

patched = text[:start] + replacement + text[end:]
legacy_credit_mode = '  latestCreditMode = "campaign";\n'
if patched.count(legacy_credit_mode) != 1:
    raise SystemExit(
        "assistant-integration-polish.py: expected exactly one stale latestCreditMode assignment"
    )
patched = patched.replace(legacy_credit_mode, "", 1)
HELPER.write_text(patched)
print("assistant integration helper repaired for current WARP runtime and typecheck")
