import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { deleteAccount, exportAccount } from "../cloud/src/accounts";
import { handleAdmin } from "../cloud/src/admin";
import { listFeedback, submitFeedback } from "../cloud/src/feedback";
import { cleanup } from "../cloud/src/maintenance";

const NOW = Date.UTC(2026, 9, 18, 4);
const databases = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

/** Every real migration on an in-memory SQLite, behind the same small API as cloud/src/db.ts. */
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  const folder = new URL("../cloud/migrations/", import.meta.url);
  for (const name of readdirSync(folder).filter((file) => file.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(new URL(name, folder), "utf8"));
  }
  const query = (text, params) => {
    const statement = sqlite.prepare(text);
    statement.setAllowBareNamedParameters(true);
    const bindings = Object.fromEntries(params.map((value, index) => [String(index + 1), value === undefined ? null : typeof value === "boolean" ? Number(value) : value]));
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
        const changes = statements.map((s) => run(s.text, s.params));
        sqlite.exec("commit");
        return changes;
      } catch (error) { sqlite.exec("rollback"); throw error; }
    },
  };
  sqlite.exec("insert into accounts (id, kind, pilot_code, display_name, created_at) values ('11111111-1111-4111-8111-111111111111', 'guest', 'K7Q2MX', 'Nova Pilot', '2026-10-01T00:00:00.000Z')");
  const account = { id: "11111111-1111-4111-8111-111111111111", kind: "guest", pilot_code: "K7Q2MX", display_name: "Nova Pilot", email: null };
  const auth = { account, sessionId: "s1", renewed: false };
  const context = (ip = "203.0.113.7", now = NOW) => ({ ip, userAgent: "Vitest browser", now });
  const admin = (method, path, body) =>
    handleAdmin(
      new Request("https://worker/internal/admin" + path, { method, headers: { "x-admin-actor": "Tester (support)" }, body: body === undefined ? undefined : JSON.stringify(body) }),
      db,
      {},
      path,
      NOW,
    ).then((response) => response.json());
  return { sqlite, db, auth, account, context, admin };
}

const report = {
  category: "bug",
  message: "The boss froze at stage 10\r\nafter the second wave.",
  contactEmail: "pilot@example.com",
  context: { screen: "pause", stage: 10, ship: "vanguard", errors: ["TypeError: x is undefined (main.js:12)"], secret: "dropped" },
};

describe("player feedback on SQLite", () => {
  it("stores a cleaned message with only the allowed context", async () => {
    const { sqlite, db, auth, context } = fixture();
    const { id } = await submitFeedback(db, auth, report, context());
    const row = sqlite.prepare("select * from player_feedback where id = ?").get(id);
    expect(row).toMatchObject({ category: "bug", status: "new", display_name: "Nova Pilot", account_kind: "guest", contact_email: "pilot@example.com" });
    expect(row.message).toBe("The boss froze at stage 10\nafter the second wave.");
    const stored = JSON.parse(row.context);
    expect(stored).toMatchObject({ screen: "pause", stage: 10, ship: "vanguard", userAgent: "Vitest browser" });
    expect(stored.errors).toEqual(["TypeError: x is undefined (main.js:12)"]);
    expect(stored.secret).toBeUndefined();
  });

  it("refuses short messages and bad emails, and limits a player to five an hour", async () => {
    const { db, auth, context } = fixture();
    await expect(submitFeedback(db, auth, { ...report, message: "too short" }, context())).rejects.toMatchObject({ status: 400, details: { field: "message" } });
    await expect(submitFeedback(db, auth, { ...report, contactEmail: "nope" }, context())).rejects.toMatchObject({ status: 400, details: { field: "contactEmail" } });
    for (let index = 0; index < 5; index += 1) await submitFeedback(db, auth, report, context());
    await expect(submitFeedback(db, auth, report, context())).rejects.toMatchObject({ status: 429, code: "rate-limited" });
    // An hour later the window has passed.
    await expect(submitFeedback(db, auth, report, context("203.0.113.7", NOW + 3_600_001))).resolves.toHaveProperty("id");
  });

  it("lists, filters and counts the queue for Admins", async () => {
    const { sqlite, db, auth, context } = fixture();
    await submitFeedback(db, auth, report, context());
    await submitFeedback(db, auth, { category: "idea", message: "Please add a dragon theme for every mode." }, context());
    const all = await listFeedback(db, new URLSearchParams());
    expect(all.total).toBe(2);
    expect(all.counts).toEqual({ new: 2, read: 0, resolved: 0 });
    sqlite.prepare("update player_feedback set status = 'resolved' where category = 'bug'").run();
    expect((await listFeedback(db, new URLSearchParams({ status: "open" }))).feedback.map((row) => row.category)).toEqual(["idea"]);
    const ideas = await listFeedback(db, new URLSearchParams({ category: "idea" }));
    expect(ideas.feedback.map((row) => row.category)).toEqual(["idea"]);
    const search = await listFeedback(db, new URLSearchParams({ q: "boss froze" }));
    expect(search.total).toBe(1);
    expect(search.feedback[0].context.stage).toBe(10);
    expect(search.feedback[0].pilot_code).toBe("K7Q2MX");
  });

  it("Admins mark messages read or resolved and reply by in-game mail, audited", async () => {
    const { sqlite, db, auth, context, admin } = fixture();
    const { id } = await submitFeedback(db, auth, report, context());
    expect(await admin("POST", "/feedback/" + id + "/status", { status: "read", note: "Looking into it" })).toEqual({ ok: true });
    expect(sqlite.prepare("select status, admin_note, handled_by from player_feedback where id = ?").get(id)).toEqual({ status: "read", admin_note: "Looking into it", handled_by: "Tester (support)" });
    const replied = await admin("POST", "/feedback/" + id + "/reply", { title: "Fixed in today's update", body: "Thanks for the report!" });
    expect(replied.ok).toBe(true);
    const mail = sqlite.prepare("select target_account_id, title, reward from mail where id = ?").get(replied.mail);
    expect(mail).toEqual({ target_account_id: auth.account.id, title: "Fixed in today's update", reward: "{}" });
    const row = sqlite.prepare("select status, admin_note from player_feedback where id = ?").get(id);
    expect(row.status).toBe("resolved");
    expect(row.admin_note).toContain("Fixed in today's update");
    const actions = sqlite.prepare("select action from admin_audit order by id").all().map((entry) => entry.action);
    expect(actions).toEqual(["feedback.status", "mail.player", "feedback.reply"]);
    expect((await admin("GET", "/stats")).newFeedback).toBe(0);
    await expect(admin("POST", "/feedback/" + id + "/status", { status: "lost" })).rejects.toMatchObject({ status: 400 });
  });

  it("an account deletion keeps the report but forgets the sender; old resolved reports are cleaned up", async () => {
    const { sqlite, db, auth, context } = fixture();
    const { id } = await submitFeedback(db, auth, report, context());
    expect((await exportAccount(db, auth, NOW)).feedback).toHaveLength(1);
    await deleteAccount(db, {}, auth, {}, NOW);
    expect(sqlite.prepare("select account_id, display_name, contact_email, message from player_feedback where id = ?").get(id)).toEqual({
      account_id: null,
      display_name: "Deleted pilot",
      contact_email: null,
      message: "The boss froze at stage 10\nafter the second wave.",
    });
    sqlite.prepare("update player_feedback set status = 'resolved', handled_at = '2025-01-01T00:00:00.000Z' where id = ?").run(id);
    expect((await cleanup(db, NOW)).feedback).toBe(1);
    expect(sqlite.prepare("select count(*) as n from player_feedback").get().n).toBe(0);
  });
});
