import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { adminAdjust, adminSettlePurchase, adminWallet, confirmPurchase, earn, getWallet, openWallet, refuel, refund, sortie, spend } from "../cloud/src/wallet";
import { createWarpCharge, gameDay } from "../src/economy/warp-charge";

const NOW = Date.UTC(2026, 9, 17, 3);
const databases = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

/** Real SQLite statements and atomic batches; no filesystem or player's database. */
function fixture(phase = "3") {
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  sqlite.exec("create table accounts (id text primary key); insert into accounts values ('pilot'); create table gift_codes (id text);");
  sqlite.exec("create table player_saves (account_id text primary key, data text, data_gz blob, revision integer);");
  sqlite.exec("create table admin_audit (actor text, action text, target text, details text, created_at text)");
  for (const name of ["0004_wallets.sql", "0005_pending_purchases.sql", "0006_fixed_reward_receipts.sql", "0007_wallet_reconciliation.sql"]) {
    sqlite.exec(readFileSync(new URL("../cloud/migrations/" + name, import.meta.url), "utf8"));
  }
  const query = (text, params) => {
    const statement = sqlite.prepare(text);
    statement.setAllowBareNamedParameters(true);
    // D1 uses ?1, ?2…; SQLite's Node API binds those as named arguments.
    const bindings = Object.fromEntries(params.map((value, index) => [String(index + 1), value]));
    return { statement, bindings };
  };
  const run = (text, params) => {
    const { statement, bindings } = query(text, params);
    return Number(statement.run(bindings).changes);
  };
  const db = {
    async first(text, ...params) {
      const { statement, bindings } = query(text, params);
      return statement.get(bindings) ?? null;
    },
    async all(text, ...params) {
      const { statement, bindings } = query(text, params);
      return statement.all(bindings);
    },
    async run(text, ...params) { return run(text, params); },
    stmt: (text, ...params) => ({ text, params }),
    async batch(statements) {
      sqlite.exec("begin");
      try {
        const changes = statements.map(s => run(s.text, s.params));
        sqlite.exec("commit");
        return changes;
      } catch (error) { sqlite.exec("rollback"); throw error; }
    },
  };
  sqlite.prepare("insert into wallets (account_id, credits, warp, earn_day, today_day, origin, created_at, updated_at) values ('pilot', 1000, ?, ?, ?, 'test', '', '')")
    .run(JSON.stringify(createWarpCharge(NOW)), gameDay(NOW), gameDay(NOW));
  const env = { WALLET_PHASE: phase };
  const buy = (id, at = NOW) => spend(db, env, "pilot", { opId: id, purchase: { kind: "cosmetic", id: "frame-cyan" }, deltas: { credits: 300 } }, at);
  return { sqlite, db, env, buy };
}

describe("server wallet transactions on SQLite", () => {
  it("automatically refunds only purchases older than seven days, once", async () => {
    const { db, env, buy } = fixture();
    await buy("spend-expired");
    const account = { id: "pilot", kind: "guest" };
    const later = NOW + 8 * 86_400_000;
    expect((await openWallet(db, env, account, {}, later)).balances.credits).toBe(1000);
    expect((await openWallet(db, env, account, {}, later)).balances.credits).toBe(1000);
    expect((await adminWallet(db, env, "pilot", later)).pendingPurchases).toEqual([]);
    await expect(confirmPurchase(db, env, "pilot", { spendOpId: "spend-expired" }, later)).rejects.toMatchObject({ code: "purchase-missing" });
  });
  it("Admin settles pending purchases once and audits only the applied correction", async () => {
    const { sqlite, db, env, buy } = fixture();
    await buy("spend-support");
    expect((await adminWallet(db, env, "pilot", NOW)).pendingPurchases).toHaveLength(1);
    const input = { purchaseAction: "refund", spendOpId: "spend-support", reason: "lost item", idempotencyKey: "support-123" };
    await adminSettlePurchase(db, env, "pilot", input, "support", NOW);
    await adminSettlePurchase(db, env, "pilot", input, "support", NOW);
    const adjust = { deltas: { credits: 20 }, reason: "correction", idempotencyKey: "adjust-123" };
    await adminAdjust(db, env, "pilot", adjust, "support", NOW);
    await adminAdjust(db, env, "pilot", adjust, "support", NOW);
    expect((await getWallet(db, env, "pilot", NOW)).balances.credits).toBe(1020);
    expect(sqlite.prepare("select count(*) as n from admin_audit").get().n).toBe(2);
  });
  it("applies earning and sortie ceilings in phase 2 too", async () => {
    const { db, env } = fixture("2");
    const earned = await earn(db, env, "pilot", { opId: "earn-large", deltas: { credits: 100_000_000 } }, NOW);
    expect(earned.applied.credits).toBeLessThan(2000);
    await sortie(db, env, "pilot", { opId: "start:phase2", start: { attemptId: "phase2", stage: 1 } }, NOW);
    const finished = await sortie(db, env, "pilot", { opId: "finish:phase2", finish: { attemptId: "phase2", earnings: { credits: 100_000_000 } } }, NOW + 60_000);
    expect(finished.applied.credits).toBeLessThan(1000);
  });
  it("reconciles a server-observed rollback once, within migration caps", async () => {
    const { db, env } = fixture();
    const account = { id: "pilot", kind: "guest" };
    await expect(openWallet(db, { ...env, WALLET_PHASE: "0" }, account, {}, NOW)).rejects.toMatchObject({ code: "wallet-off" });
    const resumed = await openWallet(db, env, account, { balances: { credits: 3_000_000 } }, NOW);
    expect(resumed.balances.credits).toBe(2_000_000);
    expect(resumed.reconciled).toBe(true);
    expect((await openWallet(db, env, account, { balances: { credits: 0 } }, NOW)).balances.credits).toBe(2_000_000);
  });
  it("recovers only the immediately next stage backed by a clear receipt", async () => {
    const { sqlite, db, env } = fixture();
    const data = { campaign: { highestUnlockedStage: 2 }, account: { receipts: [{ id: "attempt:clear", kind: "clear", stage: 1 }] } };
    sqlite.prepare("insert into player_saves values ('pilot', ?, null, 1)").run(JSON.stringify(data));
    expect((await sortie(db, env, "pilot", { opId: "start:recover", start: { attemptId: "recover", stage: 2 } }, NOW)).maxStage).toBe(2);
    await expect(sortie(db, env, "pilot", { opId: "start:skip", start: { attemptId: "skip", stage: 4 } }, NOW)).rejects.toMatchObject({ code: "stage-locked" });
  });
  it("rejects a changed refuel quote and cannot reuse sortie ids to earn", async () => {
    const { sqlite, db, env } = fixture();
    sqlite.exec("update wallets set star_crystal=100");
    await expect(refuel(db, env, "pilot", { opId: "refuel-stale", quote: { index: 1, price: 8 } }, NOW)).rejects.toMatchObject({ code: "price-changed" });
    const filled = await refuel(db, env, "pilot", { opId: "refuel-current", quote: { index: 0, price: 8 } }, NOW);
    expect(filled.balances.starCrystal).toBe(92);
    await expect(earn(db, env, "pilot", { opId: "start:fake", deltas: { credits: 100 } }, NOW)).rejects.toMatchObject({ code: "invalid-op-kind" });
  });
  it("never rolls its ledger or earnings backwards when an older request arrives", async () => {
    const { sqlite, db, env } = fixture();
    await earn(db, env, "pilot", { opId: "earn-today", deltas: { credits: 100 } }, NOW);
    await earn(db, env, "pilot", { opId: "earn-tomorrow", deltas: { credits: 100 } }, NOW + 86_400_000);
    await earn(db, env, "pilot", { opId: "earn-delayed", deltas: { credits: 100 } }, NOW);
    const row = sqlite.prepare("select earn_day, today_day from wallets").get();
    expect(row.earn_day).toBe(gameDay(NOW + 86_400_000));
    expect(row.today_day).toBe(row.earn_day);
    expect(sqlite.prepare("select count(*) as n from wallet_days").get().n).toBe(1);
  });
  it("ignores both a forged device seed and an uploaded save for new accounts", async () => {
    const { sqlite, db, env } = fixture();
    sqlite.exec("delete from wallets");
    env.WALLET_SEED_BEFORE = new Date(NOW - 1).toISOString();
    const account = { id: "pilot", created_at: new Date(NOW).toISOString(), kind: "guest" };
    const seed = { balances: { credits: 2_000_000 }, stage: 1000 };
    const opened = await openWallet(db, env, account, seed, NOW);
    expect(opened.balances.credits).toBe(0);
    expect(opened.maxStage).toBe(1);
    sqlite.exec("delete from wallets");
    sqlite.prepare("insert into player_saves values ('pilot', ?, null, 1)").run(JSON.stringify({ credits: 2_000_000, campaign: { highestUnlockedStage: 1000 } }));
    expect((await openWallet(db, env, account, seed, NOW)).balances.credits).toBe(0);
  });
  it("migrates a legacy account within caps, limits device-only stage and prefers cloud evidence", async () => {
    const { sqlite, db, env } = fixture();
    sqlite.exec("delete from wallets");
    env.WALLET_SEED_BEFORE = new Date(NOW).toISOString();
    const account = { id: "pilot", created_at: new Date(NOW - 1).toISOString(), kind: "guest" };
    const opened = await openWallet(db, env, account, { balances: { credits: 3_000_000 }, stage: 1000 }, NOW);
    expect(opened.balances.credits).toBe(2_000_000);
    expect(opened.maxStage).toBe(20);
    expect(JSON.parse(sqlite.prepare("select flags from wallets").get().flags).map(x => x.code)).toContain("migration-stage");
    sqlite.exec("delete from wallets");
    sqlite.prepare("insert into player_saves values ('pilot', ?, null, 2)").run(JSON.stringify({ credits: 700, campaign: { highestUnlockedStage: 43 } }));
    const cloud = await openWallet(db, env, account, { balances: { credits: 9999 }, stage: 1000 }, NOW);
    expect(cloud.balances.credits).toBe(700);
    expect(cloud.maxStage).toBe(43);
  });
  it("denies migration when the cutoff is unset, invalid or equals account creation", async () => {
    for (const cutoff of [undefined, "bad", new Date(NOW).toISOString()]) {
      const { sqlite, db, env } = fixture();
      sqlite.exec("delete from wallets");
      env.WALLET_SEED_BEFORE = cutoff;
      expect((await openWallet(db, env, { id: "pilot", created_at: new Date(NOW).toISOString() }, { balances: { credits: 2000 } }, NOW)).balances.credits).toBe(0);
    }
  });
  it("refuses locked stages without spending Warp", async () => {
    const { db, env } = fixture();
    await expect(sortie(db, env, "pilot", { opId: "locked-attempt", start: { attemptId: "locked", stage: 1000 } }, NOW)).rejects.toMatchObject({ code: "stage-locked" });
    expect((await getWallet(db, env, "pilot", NOW)).warp.current).toBe(100);
  });

  it("uses catalogue prices and leaves the wallet untouched for a forged price", async () => {
    const { db, env } = fixture();
    await expect(spend(db, env, "pilot", { opId: "cheap-offer", purchase: { kind: "cosmetic", id: "frame-cyan" }, deltas: { credits: 1 } }, NOW)).rejects.toMatchObject({ code: "price-changed" });
    expect((await getWallet(db, env, "pilot", NOW)).balances.credits).toBe(1000);
  });
  it("keeps a debit receipt past day rollover and retry-ring eviction, and refunds it once", async () => {
    const { sqlite, db, env, buy } = fixture();
    await buy("spend-midnight");
    sqlite.exec("update wallets set recent_ops='[]', today_ops='[]'");
    const tomorrow = NOW + 86_400_000;
    expect((await buy("spend-midnight", tomorrow)).duplicate).toBe(true);
    expect((await refund(db, env, "pilot", { spendOpId: "spend-midnight" }, tomorrow)).balances.credits).toBe(1000);
    expect((await refund(db, env, "pilot", { spendOpId: "spend-midnight" }, tomorrow)).balances.credits).toBe(1000);
  });
  it("confirms a saved item and refuses a later refund", async () => {
    const { db, env, buy } = fixture();
    await buy("spend-confirmed");
    await confirmPurchase(db, env, "pilot", { spendOpId: "spend-confirmed" }, NOW);
    await expect(refund(db, env, "pilot", { spendOpId: "spend-confirmed" }, NOW)).rejects.toMatchObject({ code: "purchase-saved" });
    expect((await getWallet(db, env, "pilot", NOW)).balances.credits).toBe(700);
  });
  it("cancels an uncertain request even when the debit arrives after the refund", async () => {
    const { db, env, buy } = fixture();
    await refund(db, env, "pilot", { spendOpId: "spend-delayed" }, NOW);
    expect((await buy("spend-delayed")).duplicate).toBe(true);
    expect((await getWallet(db, env, "pilot", NOW)).balances.credits).toBe(1000);
  });
  it("does not pay a daily lesson twice after generic receipts have expired", async () => {
    const { sqlite, db, env } = fixture();
    const reward = { opId: "lessons:" + gameDay(NOW) + ":five", deltas: { credits: 400, starCrystal: 2 } };
    await earn(db, env, "pilot", reward, NOW);
    sqlite.exec("update wallets set recent_ops='[]', today_ops='[]'");
    expect((await earn(db, env, "pilot", reward, NOW + 86_400_000)).duplicate).toBe(true);
    expect((await getWallet(db, env, "pilot", NOW)).balances.credits).toBe(1400);
  });
  it("refuses Daily Lessons rewards for days before the wallet was opened", async () => {
    const { sqlite, db, env } = fixture();
    sqlite.prepare("update wallets set created_at = ?").run(new Date(NOW).toISOString());
    const day = gameDay(NOW);
    await expect(earn(db, env, "pilot", { opId: "lessons:" + (day - 3) + ":five", deltas: { credits: 400 } }, NOW)).rejects.toMatchObject({ code: "invalid-reward-day" });
    expect((await earn(db, env, "pilot", { opId: "lessons:" + day + ":five", deltas: { credits: 400 } }, NOW)).balances.credits).toBe(1400);
  });
  it("stops paying generic earnings past the day's hard ceiling", async () => {
    const { db, env } = fixture();
    let credits = 0;
    for (let index = 0; index < 60; index++) {
      credits = (await earn(db, env, "pilot", { opId: "flood-" + index, deltas: { credits: 1_000_000, starCrystal: 1_000_000 } }, NOW)).balances.credits;
    }
    const cap = (await getWallet(db, env, "pilot", NOW)).dailyCap.credits;
    expect(credits - 1000).toBeLessThanOrEqual(Math.ceil(cap * 1.25));
  });
  it("does not limit shadow-mode purchases to the pending receipt capacity", async () => {
    const { db, env, buy } = fixture("1");
    for (let index = 0; index < 25; index++) await buy("shadow-purchase-" + index);
    expect((await getWallet(db, env, "pilot", NOW)).phase).toBe(1);
  });
  it("uses the started stage for earnings and rejects a second finish with another opId", async () => {
    const { db, env } = fixture();
    await sortie(db, env, "pilot", { opId: "start-attempt", start: { attemptId: "attempt", stage: 1 } }, NOW);
    const finish = { attemptId: "attempt", stage: 1000, outcome: "cleared", words: 12, earnings: { credits: 300 } };
    const result = await sortie(db, env, "pilot", { opId: "finish-attempt", finish }, NOW + 60_000);
    expect(result.maxStage).toBe(2);
    await expect(sortie(db, env, "pilot", { opId: "finish-again", finish }, NOW + 70_000)).rejects.toMatchObject({ code: "sortie-unknown" });
  });
});
