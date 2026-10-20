import { afterEach, describe, expect, it, vi } from "vitest";
import { OnlineSession, type OnlineAccount } from "../src/online/session";
import { installAccountDialog } from "../src/ui/account-dialog";

const account: OnlineAccount = {
  id: "existing-pilot",
  kind: "registered",
  pilotCode: "STAR42",
  email: "pilot@example.com",
  emailVerified: true,
  displayName: "Pilot",
  createdAt: "2026-10-20T00:00:00Z",
  hasPassword: false,
  oauthProviders: ["google"],
};
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("social account session", () => {
  it("starts the provider through the same-origin API without replacing the current guest", async () => {
    const fetch = vi.fn(async () => json({ url: "https://accounts.google.com/o/oauth2/v2/auth?state=server-owned" }));
    vi.stubGlobal("fetch", fetch);
    const session = new OnlineSession();
    session.account = { ...account, id: "guest-pilot", kind: "guest" };
    session.status = "online";
    const changed = vi.fn();
    session.onChange(changed);
    expect(await session.startOAuth("google", { intent: "register", acceptTerms: true, displayName: "Pilot", birthYear: "2000" }))
      .toContain("https://accounts.google.com/");
    expect(fetch).toHaveBeenCalledWith("/api/account/oauth/google/start", expect.objectContaining({
      method: "POST", credentials: "same-origin",
      headers: expect.objectContaining({ "x-space-typing": "1" }),
      body: JSON.stringify({ intent: "register", acceptTerms: true, displayName: "Pilot", birthYear: "2000" }),
    }));
    expect(session.account.id).toBe("guest-pilot");
    expect(changed).not.toHaveBeenCalled();
  });

  it("requires signup consent and an existing signed-in account for linking", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const session = new OnlineSession();
    await expect(session.startOAuth("google", { intent: "register", acceptTerms: false })).rejects.toThrow("Agree to the terms");
    await expect(session.startOAuth("facebook", { intent: "link", acceptTerms: false })).rejects.toThrow("Sign in before linking");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an unrelated or insecure redirect destination", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ url: "https://accounts.google.com.attacker.example/login" }))
      .mockResolvedValueOnce(json({ url: "http://www.facebook.com/dialog/oauth" }));
    vi.stubGlobal("fetch", fetch);
    const session = new OnlineSession();
    await expect(session.startOAuth("google", { intent: "login", acceptTerms: false })).rejects.toThrow("temporarily unavailable");
    await expect(session.startOAuth("facebook", { intent: "login", acceptTerms: false })).rejects.toThrow("temporarily unavailable");
  });

  it("uses the callback session cookie on boot and leaves device progress intact", async () => {
    const fetch = vi.fn(async () => json({ account, serverTime: Date.now() }));
    const saved = JSON.stringify({ campaign: { highestUnlockedStage: 9 }, credits: 500 });
    const storage = new Map([["spaceTypingPlayerSave", saved], ["spaceTypingDeviceKeyV1", "d".repeat(40)]]);
    const setItem = vi.fn((key: string, value: string) => storage.set(key, value));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem });
    const session = new OnlineSession();
    const changed = vi.fn();
    session.onChange(changed);
    await session.start();
    expect(session.account).toEqual(account);
    expect(session.registered).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/account/me", expect.objectContaining({ credentials: "same-origin" }));
    expect(setItem).not.toHaveBeenCalled();
    expect(storage.get("spaceTypingPlayerSave")).toBe(saved);
    expect(changed).toHaveBeenCalledOnce();
  });

  it("reports provider configuration without pretending an unconfigured provider is available", async () => {
    const providers = [{ id: "google", name: "Google", enabled: false }, { id: "facebook", name: "Facebook", enabled: false }];
    vi.stubGlobal("fetch", vi.fn(async () => json({ providers })));
    expect(await new OnlineSession().oauthProviders()).toEqual(providers);
  });
});

describe("social callback feedback", () => {
  it("removes the OAuth result from the URL, preserves other navigation and explains explicit linking", () => {
    vi.stubGlobal("document", { getElementById: () => null });
    vi.stubGlobal("location", { search: "?oauth=error&oauth_error=email-taken&quality=high", pathname: "/", hash: "#hangar" });
    const replaceState = vi.fn();
    vi.stubGlobal("history", { replaceState });
    const notice = vi.fn();
    const dialog = installAccountDialog({ session: new OnlineSession(), notice, sound: { tab() {}, error() {}, reveal() {} }, cloudStatus: () => "" });
    dialog.handleLinks();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/?quality=high#hangar");
    expect(notice).toHaveBeenCalledWith(expect.stringContaining("Sign in with its current method, then link"));
  });

  it("understands a stable direct callback error code", () => {
    vi.stubGlobal("document", { getElementById: () => null });
    vi.stubGlobal("location", { search: "?oauth=oauth-cancelled", pathname: "/", hash: "" });
    vi.stubGlobal("history", { replaceState: vi.fn() });
    const notice = vi.fn();
    installAccountDialog({ session: new OnlineSession(), notice, sound: { tab() {}, error() {}, reveal() {} }, cloudStatus: () => "" }).handleLinks();
    expect(notice).toHaveBeenCalledWith("Sign-in was cancelled. You can try again any time.");
  });

  it("shows a generic message for unknown callback text", () => {
    vi.stubGlobal("document", { getElementById: () => null });
    vi.stubGlobal("location", { search: "?oauth=%3Cscript%3Esecret%3C%2Fscript%3E", pathname: "/", hash: "" });
    vi.stubGlobal("history", { replaceState: vi.fn() });
    const notice = vi.fn();
    installAccountDialog({ session: new OnlineSession(), notice, sound: { tab() {}, error() {}, reveal() {} }, cloudStatus: () => "" }).handleLinks();
    expect(notice).toHaveBeenCalledWith("Could not complete social sign-in. Please try again.");
  });
});
