import { describe, expect, it } from "vitest";
import { FIRST_REPORT_WINDOW_MS, IMPORT_MAX_STREAK, PROGRESS_CAPS, plausibleProgress, trustImportedLiveops } from "../cloud/src/liveops-rules";
import { LIVE_OPS_POLICY } from "../src/liveops/policy";
import { claimMessage, createLiveOpsState, rolloverLiveOps, type LiveOpsMessage, type LiveOpsState } from "../src/liveops/state";

const TODAY = 20_000;

function mail(id: string, reward: LiveOpsMessage["reward"], claimed = false): LiveOpsMessage {
  return { id, title: id, body: "", reward, day: TODAY, expiresDay: -1, claimed };
}

function withInbox(inbox: LiveOpsMessage[]): LiveOpsState {
  return { ...createLiveOpsState(), day: TODAY, week: 2857, lastSeenDay: TODAY, inbox, delivered: inbox.map((item) => item.id) };
}

describe("server import of an offline Daily Hub (cloud/src/liveops-rules.ts)", () => {
  it("drops unclaimed mail the client made up and forgets it as delivered", () => {
    const state = trustImportedLiveops(withInbox([mail("forged", { starCrystal: 999_999 }), mail("mail-real", { credits: 50 })]), TODAY);
    expect(state.inbox).toEqual([]);
    // Real server mail with that id arrives again on the next load.
    expect(state.delivered).toEqual([]);
    expect(claimMessage(state, "forged", TODAY).ok).toBe(false);
  });

  it("keeps the welcome and comeback crates at their policy rewards", () => {
    const state = trustImportedLiveops(withInbox([mail("welcome", { quantumCore: 999 }), mail("comeback-90", { credits: 1_000_000 })]), TODAY);
    expect(state.inbox.find((item) => item.id === "welcome")?.reward).toEqual(LIVE_OPS_POLICY.welcome);
    expect(state.inbox.find((item) => item.id === "comeback-90")?.reward).toEqual(LIVE_OPS_POLICY.comeback.reward);
    expect(state.delivered).toEqual(["welcome", "comeback-90"]);
  });

  it("keeps claimed mail so it is never paid twice", () => {
    const state = trustImportedLiveops(withInbox([mail("mail-old", { credits: 50 }, true)]), TODAY);
    expect(state.inbox.map((item) => item.id)).toEqual(["mail-old"]);
    expect(claimMessage(state, "mail-old", TODAY).ok).toBe(false);
  });

  it("clamps counters to one plausible day (a week to seven) and the streak to 30 days", () => {
    const forged = withInbox([]);
    forged.daily.counters.words = 1_000_000;
    forged.daily.counters.perfectWords = 1_000_000;
    forged.daily.counters.activeSeconds = 999_999;
    forged.weekly.counters.words = 1_000_000;
    forged.streak.count = 400;
    forged.streak.best = 400;
    const state = trustImportedLiveops(forged, TODAY);
    expect(state.daily.counters.words).toBe(3000);
    expect(state.daily.counters.perfectWords).toBe(3000);
    expect(state.daily.counters.activeSeconds).toBe(LIVE_OPS_POLICY.playtimeCapMinutes * 60);
    expect(state.weekly.counters.words).toBe(21_000);
    expect(state.streak.count).toBe(IMPORT_MAX_STREAK);
    expect(state.streak.best).toBe(IMPORT_MAX_STREAK);
  });

  it("pulls back days from a clock that ran ahead, so the hub turns over normally", () => {
    const ahead = { ...withInbox([]), day: TODAY + 50, lastSeenDay: TODAY + 50 };
    ahead.streak.lastGoalDay = TODAY + 50;
    ahead.newbie = { claimed: 2, lastDay: TODAY + 50 };
    const state = trustImportedLiveops(ahead, TODAY);
    expect(state.day).toBe(TODAY - 1);
    expect(state.lastSeenDay).toBe(TODAY);
    expect(state.streak.lastGoalDay).toBe(TODAY);
    expect(state.newbie.lastDay).toBe(TODAY);
    expect(rolloverLiveOps(state, TODAY).day).toBe(TODAY);
  });
});

describe("progress plausibility (cloud/src/liveops-rules.ts)", () => {
  it("allows a minute of real play", () => {
    expect(plausibleProgress({ words: 120, perfectWords: 100, activeSeconds: 60, clears: 1 }, 60_000)).toEqual({
      words: 120,
      perfectWords: 100,
      activeSeconds: 60,
      clears: 1,
    });
  });

  it("limits what fits in the time since the last report", () => {
    // Two seconds after the last report: a small allowance only.
    const quick = plausibleProgress({ words: 400, activeSeconds: 600, clears: 3, bossKills: 3 }, 2_000);
    expect(quick.words).toBe(28);
    expect(quick.activeSeconds).toBe(12);
    expect(quick.clears).toBe(1);
    expect(quick.bossKills).toBe(1);
  });

  it("never passes more than one report's worth, however long the gap", () => {
    const capped = plausibleProgress({ words: 99_999, activeSeconds: 99_999, eliteKills: 9999 }, 24 * 3_600_000);
    expect(capped).toEqual({ words: PROGRESS_CAPS.words, activeSeconds: PROGRESS_CAPS.activeSeconds, eliteKills: PROGRESS_CAPS.eliteKills });
    // The first report of an account is measured against a 10-minute window.
    expect(plausibleProgress({ words: 99_999, activeSeconds: 99_999 }, FIRST_REPORT_WINDOW_MS)).toEqual({ words: 400, activeSeconds: 600 });
  });

  it("keeps perfect words within words, accurate clears within clears, and ignores junk", () => {
    expect(plausibleProgress({ words: 5, perfectWords: 50, clears: 0, accurateClears: 2, skills: -4, bonus: "x" }, 60_000)).toEqual({
      words: 5,
      perfectWords: 5,
    });
    expect(plausibleProgress({ words: 10 }, Number.NaN)).toEqual({ words: 10 });
  });
});
