#!/usr/bin/env node
/**
 * End-to-end check of the online API on the real Workers runtime.
 *   pnpm account:local   (wrangler dev on 127.0.0.1:3016, local D1 + Durable Objects)
 *   node scripts/account-e2e.mjs [baseUrl] [adminBaseUrl]
 * baseUrl may be a proxy (Vite 3004, nginx) to test the player routes and the
 * chat WebSocket through it; admin calls always go straight to the Worker,
 * because /internal/admin is only reachable through the Admin bridge.
 * Uses a fresh random email each run, so it can run against the same local database again.
 */
import { WebSocket } from "ws";

const base = process.argv[2] ?? "http://127.0.0.1:3016";
const adminBase = process.argv[3] ?? "http://127.0.0.1:3016";
const ADMIN = process.env.ACCOUNT_ADMIN_TOKEN ?? "local-account-admin";
const tag = Math.random().toString(36).slice(2, 8);
// Each run uses a made-up client address, so repeated local runs do not use up this machine's
// per-network allowances (10 sign-ups and 30 new guests an hour, 40 wrong gift codes per 15 min).
// A deployed Worker ignores it (Cloudflare sets cf-connecting-ip itself), so there runs share
// the real address: run it at most about 3 times an hour against production.
const fakeIp = "198.51." + Math.floor(Math.random() * 250 + 1) + "." + Math.floor(Math.random() * 250 + 1);
const SPOOF = { "cf-connecting-ip": fakeIp, "x-forwarded-for": fakeIp };
let failures = 0;
let checks = 0;

function check(label, condition, detail = "") {
  checks += 1;
  if (condition) console.log("  ✓ " + label);
  else {
    failures += 1;
    console.log("  ✗ " + label + (detail ? " — " + detail : ""));
  }
}

async function derive(email, password) {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", enc.encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode("space-typing:v1:" + email.trim().toLowerCase()), iterations: 310_000 }, material, 256);
  return Buffer.from(bits).toString("base64url");
}

function client(extraHeaders = SPOOF) {
  const self = {
    cookie: "",
    async call(path, { method, body, csrf = true } = {}) {
      const verb = method ?? (body === undefined ? "GET" : "POST");
      const response = await fetch(base + "/api/account" + path, {
        method: verb,
        headers: { "content-type": "application/json", ...extraHeaders, ...(csrf && verb !== "GET" ? { "x-space-typing": "1" } : {}), ...(self.cookie ? { cookie: self.cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) self.cookie = setCookie.split(";")[0];
      const text = await response.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }
      return { status: response.status, json };
    },
    chat(channel) {
      return new Promise((resolve, reject) => {
        const socket = new WebSocket(base.replace(/^http/, "ws") + "/api/account/chat/connect?channel=" + encodeURIComponent(channel), { headers: { cookie: self.cookie } });
        const inbox = [];
        socket.on("message", (data) => inbox.push(JSON.parse(String(data))));
        socket.on("open", () => setTimeout(() => resolve({ socket, inbox }), 150));
        socket.on("unexpected-response", (_request, response) => reject(new Error("HTTP " + response.statusCode)));
        socket.on("error", reject);
      });
    },
  };
  return self;
}

async function admin(path, body, token = ADMIN) {
  const response = await fetch(adminBase + "/internal/admin" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-account-admin-token": token, "x-admin-actor": "e2e" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log("Online API e2e against " + base);
const health = await fetch(base + "/api/account/healthz").then((r) => r.json()).catch(() => null);
if (!health?.ok) {
  console.log("Service not reachable. Start it with: pnpm account:local");
  process.exit(1);
}

console.log("Accounts");
const a = client();
check("writes need the request header", (await a.call("/guest", { body: { deviceKey: "d".repeat(40) }, csrf: false })).status === 403);
const device = "device-" + tag + "-" + "x".repeat(40);
const g = await a.call("/guest", { body: { deviceKey: device } });
check("guest account", g.status === 200 && g.json.account?.kind === "guest", JSON.stringify(g.json));
const guestId = g.json.account?.id;
check("same device key → same guest", (await client().call("/guest", { body: { deviceKey: device } })).json.account?.id === guestId);
const emailA = `pilot-${tag}@example.com`;
const keyA = await derive(emailA, "starlight-42");
check("register needs terms", (await a.call("/register", { body: { email: emailA, key: keyA, displayName: "Ace " + tag } })).status === 400);
const reg = await a.call("/register", { body: { email: emailA, key: keyA, displayName: "Ace " + tag, acceptTerms: true, birthYear: 2001 } });
check("guest upgraded keeps the same id", reg.status === 200 && reg.json.account?.id === guestId && reg.json.account?.kind === "registered", JSON.stringify(reg.json));
check("duplicate email refused", (await client().call("/register", { body: { email: emailA.toUpperCase(), key: keyA, displayName: "Dup", acceptTerms: true } })).status === 409);
const sameDevice = (await client().call("/guest", { body: { deviceKey: device } })).json.account;
check("device key no longer signs into the upgraded account", sameDevice?.kind === "guest" && sameDevice?.id !== guestId, JSON.stringify(sameDevice));
const outbox = await admin("/outbox");
const verifyMail = outbox.json.emails.find((m) => m.to_email === emailA && m.body.includes("?verify="));
const verifyToken = /verify=([\w-]+)/.exec(verifyMail?.body ?? "")?.[1];
check("verification email queued", Boolean(verifyToken));
check("email verified", (await a.call("/email/verify", { body: { token: verifyToken } })).status === 200 && (await a.call("/me")).json.account?.emailVerified === true);
const b = client();
check("wrong password refused", (await b.call("/login", { body: { email: emailA, key: await derive(emailA, "wrong-pass") } })).status === 401);
check("login", (await b.call("/login", { body: { email: emailA, key: keyA } })).status === 200);
check("logout", (await b.call("/logout", { body: {} })).status === 200 && (await b.call("/me")).json.account === null);

console.log("Password reset");
await client().call("/password/forgot", { body: { email: emailA } });
const resetMail = (await admin("/outbox")).json.emails.find((m) => m.to_email === emailA && m.body.includes("?reset="));
const resetToken = /reset=([\w-]+)/.exec(resetMail?.body ?? "")?.[1];
const resetEmail = await client().call("/password/reset-email", { body: { token: resetToken } });
check("reset link knows its email", resetEmail.json.email === emailA);
const keyA2 = await derive(emailA, "nebula-2026");
const wrongEmail = await client().call("/password/reset", { body: { token: resetToken, email: "someone-" + tag + "@example.com", key: keyA2 } });
check("a reset with the wrong email leaves the link usable", wrongEmail.status === 400 && (await client().call("/password/reset-email", { body: { token: resetToken } })).json.email === emailA);
check("password reset", (await client().call("/password/reset", { body: { token: resetToken, email: emailA, key: keyA2 } })).status === 200);
check("a reset link works once", (await client().call("/password/reset", { body: { token: resetToken, email: emailA, key: keyA2 } })).status === 400);
check("old sessions signed out", (await a.call("/me")).json.account === null);
check("login with new password", (await a.call("/login", { body: { email: emailA, key: keyA2 } })).status === 200);

console.log("Cloud save");
check("no save yet", (await a.call("/save")).status === 404);
const s1 = await a.call("/save", { method: "PUT", body: { baseRevision: 0, saveVersion: 28, data: { credits: 100, campaign: { highestUnlockedStage: 3, clearedStages: [1, 2] } } } });
check("first upload = revision 1", s1.json.revision === 1, JSON.stringify(s1.json));
const stale = await a.call("/save", { method: "PUT", body: { baseRevision: 0, saveVersion: 28, data: { credits: 1 } } });
check("stale device gets 409 with the server summary", stale.status === 409 && stale.json.details?.summary?.credits === 100, JSON.stringify(stale.json));
// A save shaped like the real one: repeated records, Vietnamese text (stored gzip-compressed).
const bigData = {
  credits: 250,
  campaign: { highestUnlockedStage: 4, clearedStages: [1, 2, 3] },
  note: "Phi công Việt Nam — tiến độ đã lưu ✓",
  words: Array.from({ length: 800 }, (_, index) => ({ id: "word-" + index, text: "thuyền vũ trụ " + index, seen: index % 7, correct: index % 5, last: "2026-10-16T09:00:00.000Z" })),
};
const s2 = await a.call("/save", { method: "PUT", body: { baseRevision: 1, saveVersion: 28, data: bigData, uploadId: "e2e-" + tag + "-upload" } });
check("second upload = revision 2", s2.json.revision === 2, JSON.stringify(s2.json));
check("the save is stored compressed", s2.json.storedBytes > 0 && s2.json.storedBytes * 4 < s2.json.bytes, s2.json.storedBytes + " of " + s2.json.bytes + " bytes");
const fetchedSave = await a.call("/save");
check("GET /save returns the exact save, revision and upload id",
  fetchedSave.json.revision === 2 && fetchedSave.json.uploadId === "e2e-" + tag + "-upload" && JSON.stringify(fetchedSave.json.data) === JSON.stringify(bigData));
const outdated = await a.call("/save", { method: "PUT", body: { baseRevision: 2, saveVersion: 27, data: { credits: 1 }, force: true } });
check("an older game version cannot overwrite a newer save", outdated.status === 409 && outdated.json.error === "client-outdated", JSON.stringify(outdated.json));
// A brand-new guest, as the game does it: no cloud copy → first upload on revision 0 → keep saving.
const fresh = client();
await fresh.call("/guest", { body: { deviceKey: "fresh-" + tag + "x".repeat(32) } });
const freshSave = { version: 28, credits: 0, campaign: { highestUnlockedStage: 1, clearedStages: [] }, updatedAt: new Date().toISOString() };
const freshMissing = (await fresh.call("/save")).status;
const freshFirst = await fresh.call("/save", { method: "PUT", body: { baseRevision: 0, saveVersion: 28, data: freshSave, uploadId: "fresh-" + tag + "-1" } });
const freshAgain = await fresh.call("/save", { method: "PUT", body: { baseRevision: 1, saveVersion: 28, data: { ...freshSave, credits: 300 }, uploadId: "fresh-" + tag + "-2" } });
const freshRead = (await fresh.call("/save")).json;
check("a brand-new guest saves without any conflict (404 → revision 1 → 2)",
  freshMissing === 404 && freshFirst.status === 200 && freshFirst.json.revision === 1 && freshAgain.status === 200 && freshAgain.json.revision === 2 &&
  freshRead.revision === 2 && freshRead.uploadId === "fresh-" + tag + "-2" && freshRead.data.credits === 300,
  [freshMissing, freshFirst.status, JSON.stringify(freshFirst.json), freshAgain.status, JSON.stringify(freshAgain.json)].join(" "));
// A second tab or origin with the same session but no local record sends revision 0: the answer
// carries the cloud summary, which the game uses to continue without asking (both copies fresh).
const freshSecond = await fresh.call("/save", { method: "PUT", body: { baseRevision: 0, saveVersion: 28, data: freshSave } });
check("a second fresh copy gets the cloud summary to decide without a prompt",
  freshSecond.status === 409 && freshSecond.json.details?.revision === 2 && freshSecond.json.details?.summary?.clearedStages === 0 && freshSecond.json.details?.summary?.highestUnlockedStage === 1,
  JSON.stringify(freshSecond.json));

console.log("Daily Hub");
const hub = await a.call("/liveops");
check("welcome mail delivered", hub.json.state?.inbox?.some((m) => m.id === "welcome"));
const c1 = await a.call("/liveops/claim", { body: { kind: "newbie" } });
check("starter day 1 pays 300 Credits", c1.status === 200 && c1.json.reward?.credits === 300, JSON.stringify(c1.json));
check("second claim refused", (await a.call("/liveops/claim", { body: { kind: "newbie" } })).status === 409);
const welcome = await a.call("/liveops/claim", { body: { kind: "message", id: "welcome" } });
check("welcome mail pays once", welcome.status === 200 && (await a.call("/liveops/claim", { body: { kind: "message", id: "welcome" } })).status === 409);
const progress = await a.call("/liveops/progress", { body: { progress: { words: 99999, activeSeconds: 99999 } } });
check("progress capped per call", progress.json.state?.daily?.counters?.words === 400 && progress.json.state?.daily?.counters?.activeSeconds === 600, JSON.stringify(progress.json.state?.daily?.counters));
const burst = await a.call("/liveops/progress", { body: { progress: { words: 400, activeSeconds: 600 } } });
const burstCounters = burst.json.state?.daily?.counters ?? {};
check("progress right after a report is limited by the time since it", burstCounters.words - 400 <= 40 && burstCounters.activeSeconds - 600 <= 20, JSON.stringify(burstCounters));
const head = (await a.call("/liveops")).json;
const ledger = (await a.call("/liveops?after=0")).json.ledger ?? [];
check("the hub reports the ledger for delivery", typeof head.ledgerHead === "number" && head.accountId === guestId &&
  ["liveops:newbie:1", "liveops:mail:welcome"].every((key) => ledger.some((row) => row.key === key)) && ledger.find((row) => row.key === "liveops:newbie:1")?.reward?.credits === 300,
  JSON.stringify(ledger.map((row) => row.key)));
check("ledger rows after the newest id: none", ((await a.call("/liveops?after=" + head.ledgerHead)).json.ledger ?? [1]).length === 0);
const parallel = await Promise.all([1, 2, 3].map(() => a.call("/liveops/claim", { body: { kind: "monthly" } })));
check("3 parallel monthly claims → exactly one paid", parallel.filter((r) => r.status === 200).length === 1, parallel.map((r) => r.status).join(","));
const forger = client();
await forger.call("/guest", { body: { deviceKey: "forger-" + tag + "x".repeat(32) } });
const forged = {
  version: 1, day: -1, week: -1, lastSeenDay: -1,
  inbox: [{ id: "forged", title: "Free", body: "", reward: { starCrystal: 999999 }, day: 0, expiresDay: -1, claimed: false },
          { id: "welcome", title: "Welcome", body: "", reward: { quantumCore: 999 }, day: 0, expiresDay: -1, claimed: false }],
  delivered: ["forged", "welcome"],
};
const imported = (await forger.call("/liveops/import", { body: { state: forged } })).json.state;
check("imported Daily Hub cannot bring its own mail rewards",
  imported && !imported.inbox.some((m) => m.id === "forged") && imported.inbox.find((m) => m.id === "welcome")?.reward?.quantumCore === undefined,
  JSON.stringify(imported?.inbox));

console.log("Admin mail and gift codes");
check("admin needs the token", (await admin("/players", undefined, "wrong")).status === 401);
const mail = await admin("/mail", { target: "all", title: "Launch " + tag, body: "Thanks!", reward: { starCrystal: 20, warp: 10 } });
check("broadcast mail", mail.status === 200);
check("reward safety limit", (await admin("/mail", { title: "Too much", reward: { quantumCore: 999 } })).status === 400);
const inbox = (await a.call("/liveops")).json.state.inbox;
const mailId = "mail-" + mail.json.id;
check("mail reaches the player", inbox.some((m) => m.id === mailId));
const mailClaim = await a.call("/liveops/claim", { body: { kind: "message", id: mailId } });
check("mail claim pays", mailClaim.json.reward?.starCrystal === 20);
const listed = (await admin("/mail")).json.mail.find((row) => row.id === mail.json.id);
const days = listed?.ends_at ? (Date.parse(listed.ends_at) - Date.parse(listed.starts_at)) / 86_400_000 : 0;
check("a broadcast without an end runs 30 days; Admin counts the claim", Math.round(days) === 30 && listed.claimed === 1, JSON.stringify(listed));
const revocable = await admin(`/players/${guestId}/mail`, { title: "Oops " + tag, body: "Sent by mistake", reward: { credits: 10 } });
const delivered = (await a.call("/liveops")).json.state.inbox.some((m) => m.id === "mail-" + revocable.json.id);
await admin(`/mail/${revocable.json.id}/revoke`, {});
const lateClaim = await a.call("/liveops/claim", { body: { kind: "message", id: "mail-" + revocable.json.id } });
check("revoked mail already in the inbox cannot be claimed", delivered && lateClaim.status === 409 && lateClaim.json.error === "withdrawn", lateClaim.status + " " + JSON.stringify(lateClaim.json));
const code = "E2E-" + tag.toUpperCase();
check("gift code created", (await admin("/gift-codes", { code, reward: { credits: 500 }, maxRedemptions: 1 })).status === 200);
check("gift code redeemed", (await a.call("/liveops/redeem", { body: { code: code.toLowerCase() } })).status === 200);
check("gift code once per player", (await a.call("/liveops/redeem", { body: { code } })).status === 409);
const guesser = client();
await guesser.call("/guest", { body: { deviceKey: "guesser-" + tag + "x".repeat(32) } });
const guesses = [];
for (let index = 0; index < 11; index += 1) guesses.push((await guesser.call("/liveops/redeem", { body: { code: "NOPE-" + tag + index } })).status);
check("guessing gift codes is rate limited", guesses.slice(0, 10).every((status) => status === 404) && guesses[10] === 429, guesses.join(","));

console.log("Server wallet");
const op = (name) => name + "-" + tag + "-" + Math.random().toString(36).slice(2, 8);
// A guest that never opens a wallet keeps the old path: claims work, wallet calls are refused.
const offline = client();
await offline.call("/guest", { body: { deviceKey: "offline-" + tag + "x".repeat(32) } });
const offlineClaim = await offline.call("/liveops/claim", { body: { kind: "newbie" } });
check("a guest without a wallet keeps the old Daily Hub path", offlineClaim.status === 200 && offlineClaim.json.wallet === undefined && offlineClaim.json.reward?.credits === 300, JSON.stringify(offlineClaim.json).slice(0, 200));
check("wallet changes need an opened wallet", (await offline.call("/wallet/op", { body: { kind: "earn", opId: op("earn"), deltas: { credits: 5 } } })).json.error === "no-wallet");

const w = client();
await w.call("/guest", { body: { deviceKey: "wallet-" + tag + "x".repeat(32) } });
const opened = await w.call("/wallet/open", { body: { seed: { balances: { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 } } } });
const walletPhase = opened.json.phase;
check("a fresh guest opens an empty wallet with full Active Warp", opened.status === 200 && walletPhase >= 1 && opened.json.balances?.credits === 0 && opened.json.warp?.current === 100, JSON.stringify(opened.json).slice(0, 200));
check("a locked Campaign stage cannot spend Warp", (await w.call("/wallet/sortie", { body: { opId: op("locked"), start: { attemptId: "locked-" + tag, stage: 1000 } } })).json.error === "stage-locked");
// Start a sortie now; it is finished later (after the 15-second plausibility minimum).
const slowSortie = "attempt-slow-" + tag;
const started = await w.call("/wallet/sortie", { body: { opId: op("sortie"), start: { attemptId: slowSortie, stage: 1, activity: "campaign" } } });
check("starting a sortie spends 10 Warp on the server", started.status === 200 && started.json.warp?.current === 90 && started.json.sortie?.id === slowSortie, JSON.stringify(started.json).slice(0, 200));
const startedAt = Date.now();
const claimed = await w.call("/liveops/claim", { body: { kind: "newbie" } });
check("a Daily Hub claim is paid into the wallet", claimed.status === 200 && claimed.json.wallet?.balances?.credits === 300, JSON.stringify(claimed.json.wallet?.balances));
check("…once", (await w.call("/liveops/claim", { body: { kind: "newbie" } })).status === 409);
const spendId = op("spend");
const offer = { kind: "cosmetic", id: "frame-cyan" };
check("client cannot choose a cheaper catalogue price", (await w.call("/wallet/op", { body: { kind: "spend", opId: op("cheap"), purchase: offer, deltas: { credits: 1 } } })).json.error === "price-changed");
check("a spend must identify a catalogue offer", (await w.call("/wallet/op", { body: { kind: "spend", opId: op("unknown"), deltas: { credits: 1 } } })).json.error === "invalid-offer");
const spent = await w.call("/wallet/op", { body: { kind: "spend", opId: spendId, source: "shop:test", purchase: offer, deltas: { credits: 300 } } });
const spentAgain = await w.call("/wallet/op", { body: { kind: "spend", opId: spendId, source: "shop:test", purchase: offer, deltas: { credits: 300 } } });
check("a repeated opId changes nothing", spent.json.balances?.credits === 0 && spentAgain.json.duplicate === true && spentAgain.json.balances?.credits === 0, JSON.stringify([spent.json.balances, spentAgain.json]).slice(0, 240));
const refunded = await w.call("/wallet/op", { body: { kind: "refund", opId: "refund:" + spendId, spendOpId: spendId } });
const refundedAgain = await w.call("/wallet/op", { body: { kind: "refund", opId: "refund:" + spendId, spendOpId: spendId } });
check("a purchase the game could not save is given back once", refunded.json.balances?.credits === 300 && refundedAgain.json.duplicate === true && refundedAgain.json.balances?.credits === 300,
  JSON.stringify([refunded.json.balances, refundedAgain.json.duplicate]));
const cancelledId = op("cancel");
await w.call("/wallet/op", { body: { kind: "refund", spendOpId: cancelledId } });
const cancelled = await w.call("/wallet/op", { body: { kind: "spend", opId: cancelledId, purchase: offer, deltas: { credits: 300 } } });
check("a delayed cancelled purchase cannot debit the wallet", cancelled.json.duplicate === true && cancelled.json.balances?.credits === 300);
const raceIds = [op("race"), op("race")];
const both = await Promise.all(raceIds.map((id) => w.call("/wallet/op", { body: { kind: "spend", opId: id, source: "shop:test", purchase: offer, deltas: { credits: 300 } } })));
check("two purchases at once cannot overspend", both.filter((r) => r.status === 200).length === 1 && both.some((r) => r.json.error === "insufficient"), both.map((r) => r.status + ":" + (r.json.error ?? r.json.balances?.credits)).join(" "));
const winningId = raceIds[both.findIndex((r) => r.status === 200)];
check("a saved purchase can be confirmed", (await w.call("/wallet/op", { body: { kind: "confirm", spendOpId: winningId } })).status === 200);
check("a confirmed purchase cannot be refunded", (await w.call("/wallet/op", { body: { kind: "refund", spendOpId: winningId } })).json.error === "purchase-saved");
check("a purchase above the balance is refused", (await w.call("/wallet/op", { body: { kind: "spend", opId: op("spend"), purchase: offer, deltas: { credits: 300 } } })).json.error === "insufficient");
const lessonDay = Math.floor((opened.json.serverTime + 3 * 3_600_000) / 86_400_000);
const lesson = await w.call("/wallet/op", { body: { kind: "earn", opId: "lessons:" + lessonDay + ":five", source: "lessons", deltas: { credits: 9999, starCrystal: 99 } } });
check("a Daily Lessons reward pays at most its table amount", walletPhase < 3 || (lesson.json.applied?.credits === 400 && lesson.json.applied?.starCrystal === 2), JSON.stringify(lesson.json.applied));
check("a future lesson reward is refused", (await w.call("/wallet/op", { body: { kind: "earn", opId: "lessons:" + (lessonDay + 1) + ":five", source: "lessons", deltas: { credits: 400 } } })).json.error === "invalid-reward-day");
const wId = (await w.call("/me")).json.account.id;
const gift = await admin(`/players/${wId}/wallet`, { deltas: { starCrystal: 10 }, reason: "e2e refuel test", idempotencyKey: op("adjust") });
const refueled = await w.call("/wallet/refuel", { body: { opId: op("refuel"), quote: { index: 0, price: 8 } } });
check("refuel spends Star Crystals and adds 20 Warp on the server",
  walletPhase < 2 || (refueled.status === 200 && refueled.json.price === 8 && refueled.json.balances?.starCrystal === gift.json.balances?.starCrystal - 8 &&
    refueled.json.warp.current + refueled.json.warp.reserve === gift.json.warp.current + gift.json.warp.reserve + 20),
  JSON.stringify({ status: refueled.status, price: refueled.json.price, sc: refueled.json.balances?.starCrystal, warp: refueled.json.warp }));
// Caps and plausibility on a second wallet (the first one has a sortie in progress).
const w2 = client();
await w2.call("/guest", { body: { deviceKey: "wallet2-" + tag + "x".repeat(32) } });
await w2.call("/wallet/open", { body: {} });
const forgedEarn = await w2.call("/wallet/op", { body: { kind: "earn", opId: op("earn"), source: "expedition", deltas: { credits: 1_000_000 } } });
check("one forged earning is cut to a few sorties' worth", walletPhase < 3 || (forgedEarn.json.applied?.credits > 0 && forgedEarn.json.applied?.credits <= 3 * 470), JSON.stringify(forgedEarn.json.applied));
let lastEarn = forgedEarn;
for (let index = 0; index < 5; index += 1) lastEarn = await w2.call("/wallet/op", { body: { kind: "earn", opId: op("earn"), source: "expedition", deltas: { credits: 9999 } } });
check("earnings above the daily cap decay to a quarter",
  walletPhase < 3 || (lastEarn.json.decayed?.includes("credits") && lastEarn.json.applied?.credits < forgedEarn.json.applied?.credits && lastEarn.json.earnedToday?.credits > lastEarn.json.dailyCap?.credits),
  JSON.stringify({ applied: lastEarn.json.applied, earned: lastEarn.json.earnedToday, cap: lastEarn.json.dailyCap }));
const fastId = "attempt-fast-" + tag;
await w2.call("/wallet/sortie", { body: { opId: op("sortie"), start: { attemptId: fastId, stage: 1 } } });
const fast = await w2.call("/wallet/sortie", { body: { opId: op("sortie"), finish: { attemptId: fastId, stage: 1, outcome: "cleared", words: 12, earnings: { credits: 5000, alloy: 50 } } } });
check("a sortie finished too fast earns little and is flagged", walletPhase < 3 || (fast.json.flags?.includes("sortie-too-fast") && fast.json.flags?.includes("sortie-over-max") && (fast.json.applied?.credits ?? 0) < 100), JSON.stringify({ applied: fast.json.applied, flags: fast.json.flags }));
check("a finished sortie cannot pay again under a new opId", (await w2.call("/wallet/sortie", { body: { opId: op("repeat"), finish: { attemptId: fastId, stage: 1000, outcome: "cleared", words: 12, earnings: { credits: 5000 } } } })).json.error === "sortie-unknown");
const noWarp = await w2.call("/wallet/sortie", { body: { opId: op("sortie"), start: { attemptId: "attempt-x-" + tag, stage: 1 } } });
check("the server keeps counting Warp across sorties", noWarp.status === 200 && noWarp.json.warp?.current === 80, JSON.stringify(noWarp.json.warp));
// A fresh account cannot manufacture a legacy seed by uploading a save before opening its wallet.
const rich = client();
await rich.call("/guest", { body: { deviceKey: "rich-" + tag + "x".repeat(32) } });
await rich.call("/save", { method: "PUT", body: { baseRevision: 0, saveVersion: 28, data: { credits: 5_000_000, expansionCurrencies: { alloy: 10, starCrystal: 999_999, quantumCore: 3 }, campaign: { highestUnlockedStage: 40, clearedStages: [] } } } });
const richWallet = (await rich.call("/wallet/open", { body: { seed: { balances: { credits: 1 } } } })).json;
check("a new account cannot seed money or progression via an uploaded save",
  richWallet.balances?.credits === 0 && richWallet.balances?.starCrystal === 0 && richWallet.balances?.alloy === 0 && richWallet.maxStage === 1,
  JSON.stringify(richWallet).slice(0, 240));
const richId = (await rich.call("/me")).json.account.id;
const adjusted = await admin(`/players/${richId}/wallet`, { deltas: { credits: 1_000 }, reason: "e2e correction", idempotencyKey: op("adjust") });
const richDetail = (await admin(`/players/${richId}`)).json;
check("Admin sees the wallet and corrects it with a reason",
  adjusted.status === 200 && adjusted.json.balances?.credits === 1000 && richDetail.wallet?.today?.ops?.some((o) => o.k === "admin"),
  JSON.stringify({ status: adjusted.status, credits: adjusted.json.balances?.credits, flags: richDetail.wallet?.flags }).slice(0, 240));
check("Admin wallet changes need a reason", (await admin(`/players/${richId}/wallet`, { deltas: { credits: 5 } })).status === 400);
const waitMs = 15_500 - (Date.now() - startedAt);
if (waitMs > 0) await wait(waitMs);
const slow = await w.call("/wallet/sortie", { body: { opId: op("sortie"), finish: { attemptId: slowSortie, stage: 1, outcome: "cleared", words: 30, earnings: { credits: 120, alloy: 2 } } } });
check("a plausible sortie is paid in full", slow.status === 200 && slow.json.applied?.credits === 120 && slow.json.applied?.alloy === 2 && (slow.json.flags ?? []).length === 0, JSON.stringify({ applied: slow.json.applied, flags: slow.json.flags }));

console.log("Friends, groups and chat");
const c = client();
const emailC = `wing-${tag}@example.com`;
await c.call("/register", { body: { email: emailC, key: await derive(emailC, "wingman-77"), displayName: "Wing " + tag, acceptTerms: true } });
// A big reward (gift code marked "big") waits until the email is verified, then pays.
const cWallet = (await c.call("/wallet/open", { body: {} })).json;
const bigCode = "BIG-" + tag.toUpperCase();
const bigCreated = await admin("/gift-codes", { code: bigCode, reward: { credits: 777, starCrystal: 7 }, big: true });
await c.call("/liveops/redeem", { body: { code: bigCode } });
const bigHeld = await c.call("/liveops/claim", { body: { kind: "message", id: "code-" + bigCreated.json.id } });
check("a big reward is held for an unverified email",
  walletPhase < 2 || (bigHeld.status === 200 && bigHeld.json.held === true && bigHeld.json.wallet?.balances?.credits === cWallet.balances?.credits && bigHeld.json.wallet?.held?.length === 1),
  JSON.stringify({ status: bigHeld.status, held: bigHeld.json.held, wallet: bigHeld.json.wallet?.balances }).slice(0, 240));
const cVerify = (await admin("/outbox")).json.emails.find((m) => m.to_email === emailC && m.body.includes("?verify="));
await c.call("/email/verify", { body: { token: /verify=([\w-]+)/.exec(cVerify?.body ?? "")?.[1] } });
const cAfter = (await c.call("/wallet")).json;
check("…and paid once the email is verified", walletPhase < 2 || (cAfter.balances?.credits === cWallet.balances.credits + 777 && cAfter.balances?.starCrystal === cWallet.balances.starCrystal + 7 && cAfter.held?.length === 0),
  JSON.stringify({ before: cWallet.balances, after: cAfter.balances, held: cAfter.held }).slice(0, 240));
const meA = (await a.call("/social")).json;
const meC = (await c.call("/social")).json;
check("pilot codes", /^[A-Z0-9]{6}$/.test(meA.pilotCode) && /^[A-Z0-9]{6}$/.test(meC.pilotCode));
check("friend request", (await a.call("/social/friends/request", { body: { code: meC.pilotCode } })).json.status === "pending-out");
const cFriends = (await c.call("/social")).json.friends;
const aId = cFriends.find((f) => f.status === "pending-in")?.id;
check("request arrives", Boolean(aId));
check("accept", (await c.call(`/social/friends/${aId}/accept`, { body: {} })).status === 200);
check("both are friends", (await a.call("/social")).json.friends.some((f) => f.status === "accepted"));
check("blocking an unknown pilot is a 404, not a server error", (await a.call(`/social/friends/${crypto.randomUUID()}/block`, { body: {} })).status === 404);
const group = await a.call("/social/groups", { body: { name: "Squad " + tag } });
check("group created", group.status === 200 && group.json.inviteCode?.length === 8, JSON.stringify(group.json));
check("join by invite", (await c.call("/social/groups/join", { body: { code: group.json.inviteCode } })).status === 200);

const guestOnly = client();
await guestOnly.call("/guest", { body: { deviceKey: "guest-reader-" + tag + "x".repeat(32) } });
const worldA = await a.chat("world");
const worldGuest = await guestOnly.chat("world");
check("world hello with history", worldA.inbox.some((m) => m.type === "hello"));
worldA.socket.send(JSON.stringify({ type: "send", text: "Hello fleet! visit www.spam.com you fucking noob", nonce: "1" }));
await wait(400);
const seen = worldGuest.inbox.find((m) => m.type === "message")?.message?.text ?? "";
check("guest reads world chat", seen.startsWith("Hello fleet!"), seen);
check("links removed and profanity masked", seen.includes("[link]") && seen.includes("f******") && !seen.includes("fucking"), seen);
worldGuest.socket.send(JSON.stringify({ type: "send", text: "hi", nonce: "g" }));
await wait(300);
check("guest cannot send", worldGuest.inbox.some((m) => m.type === "error" && m.nonce === "g"));
for (let index = 0; index < 4; index += 1) worldA.socket.send(JSON.stringify({ type: "send", text: "spam " + index, nonce: "s" + index }));
await wait(400);
check("flood control", worldA.inbox.some((m) => m.type === "error" && /slow down/i.test(m.message)));

const cId = (await a.call("/social")).json.friends.find((f) => f.status === "accepted").id;
const dmA = await a.chat("dm:" + cId);
const dmC = await c.chat("dm:" + (await c.call("/social")).json.friends[0].id);
dmA.socket.send(JSON.stringify({ type: "send", text: "Private hi", nonce: "p" }));
await wait(300);
check("private chat delivered", dmC.inbox.some((m) => m.type === "message" && m.message.text === "Private hi"));
dmA.socket.send(JSON.stringify({ type: "send", text: "Look check", nonce: "l1", look: { avatar: "avatar-crown", frame: "frame-prism", title: "title-legend" } }));
dmA.socket.send(JSON.stringify({ type: "send", text: "Bad look", nonce: "l2", look: { avatar: "<script>", frame: "frame-prism", title: "title-legend" } }));
await wait(500);
const looked = dmC.inbox.find((m) => m.type === "message" && m.message.text === "Look check")?.message.from.look;
check("Style Shop look travels with a message", looked?.avatar === "avatar-crown" && looked?.frame === "frame-prism" && looked?.title === "title-legend", JSON.stringify(looked));
const badLook = dmC.inbox.find((m) => m.type === "message" && m.message.text === "Bad look");
check("unknown look ids are dropped", badLook !== undefined && badLook.message.from.look === undefined, JSON.stringify(badLook?.message.from));
let strangerBlocked = false;
try {
  await guestOnly.chat("dm:" + cId);
} catch {
  strangerBlocked = true;
}
check("strangers cannot open a private chat", strangerBlocked);
const groupA = await a.chat("group:" + group.json.id);
const groupC = await c.chat("group:" + group.json.id);
groupC.socket.send(JSON.stringify({ type: "send", text: "Squad ready", nonce: "q" }));
await wait(300);
check("group chat delivered", groupA.inbox.some((m) => m.type === "message" && m.message.text === "Squad ready"));
const reportTarget = groupA.inbox.find((m) => m.type === "message")?.message?.id;
groupA.socket.send(JSON.stringify({ type: "report", id: reportTarget, reason: "test" }));
await wait(300);
const reports = (await admin("/chat/reports")).json.reports;
check("report reaches Admin", reports.some((r) => r.message_id === reportTarget));
for (let index = 0; index < 3; index += 1) groupA.socket.send(JSON.stringify({ type: "report", id: reportTarget, reason: "again " + index }));
await wait(400);
const reportsAfter = (await admin("/chat/reports")).json.reports.filter((r) => r.message_id === reportTarget);
check("reports are limited and stored once per message", reportsAfter.length === 1 && groupA.inbox.some((m) => m.type === "notice" && /several reports/.test(m.message)), reportsAfter.length + " rows");
const recent = (await admin("/chat/recent?channel=world:global")).json;
check("Admin reads world chat", recent.messages.some((m) => m.text.startsWith("Hello fleet!")));
for (const room of [worldA, worldGuest, dmA, dmC, groupA, groupC]) room.socket.close();

console.log("Moderation");
const players = (await admin("/players?q=" + tag)).json;
check("Admin finds players", players.total >= 2, JSON.stringify(players).slice(0, 200));
const cAccount = players.players.find((p) => p.email === emailC);
check("mute", (await admin(`/players/${cAccount.id}/mute`, { minutes: 10, reason: "test" })).status === 200);
check("ban needs a reason", (await admin(`/players/${cAccount.id}/ban`, { reason: "" })).status === 400);
check("ban", (await admin(`/players/${cAccount.id}/ban`, { reason: "Cheating" })).status === 200);
check("banned player signed out", (await c.call("/me")).json.account === null);
check("unban", (await admin(`/players/${cAccount.id}/unban`, {})).status === 200);
const maintenance = await admin("/maintenance", {});
check("daily clean-up runs (expired sessions, links, rate-limit rows)", maintenance.status === 200 && typeof maintenance.json.removed?.sessions === "number", JSON.stringify(maintenance.json));
if (/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(adminBase)) {
  // wrangler dev exposes the Cron Trigger at /cdn-cgi/local/scheduled.
  const cron = await fetch(adminBase + "/cdn-cgi/local/scheduled?cron=" + encodeURIComponent("23 20 * * *")).catch(() => null);
  check("the Cron Trigger handler runs", cron?.status === 200, String(cron?.status));
}
const audit = (await admin("/audit")).json.entries.map((e) => e.action);
check("audit trail", ["mail.broadcast", "giftcode.create", "player.ban", "player.unban", "player.mute"].every((action) => audit.includes(action)));
const detail = (await admin(`/players/${guestId}`)).json;
check("player detail with save summary", detail.save?.summary?.credits === 250 && detail.save?.summary?.highestUnlockedStage === 4, JSON.stringify(detail.save));

console.log("Account deletion");
check("delete needs the password", (await a.call("/delete", { body: { key: keyA } })).status === 401);
check("delete", (await a.call("/delete", { body: { key: keyA2 } })).status === 200);
check("deleted account cannot sign in", (await client().call("/login", { body: { email: emailA, key: keyA2 } })).status === 401);

console.log("\n" + (checks - failures) + "/" + checks + " checks passed");
process.exit(failures === 0 ? 0 : 1);
