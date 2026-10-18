import { onlineRequest, OnlineError } from "./api";
import { derivePasswordKey, passwordProblem } from "./password-key";

/**
 * The player's online identity. On start the game asks who is signed in;
 * if nobody is, it signs in silently as a guest with a random device key,
 * so cloud save, the Daily Hub and reading chat work from the first visit.
 * Creating an account later upgrades that same guest and keeps everything.
 *
 * Without the API (offline, or a static host) the game stays local-only.
 */
export type OnlineAccount = {
  id: string;
  kind: "guest" | "registered";
  pilotCode: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string;
  createdAt: string;
};

export type OnlineStatus = "starting" | "online" | "offline" | "banned";

const DEVICE_KEY = "spaceTypingDeviceKeyV1";

function deviceKey(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing !== null && existing.length >= 32) return existing;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const created = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}

export class OnlineSession {
  status: OnlineStatus = "starting";
  account: OnlineAccount | null = null;
  bannedMessage = "";
  /** Server clock minus local clock (ms), from the last /me. */
  clockOffset = 0;
  private readonly listeners = new Set<() => void>();

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error(error);
      }
    }
  }

  private set(account: OnlineAccount | null, status: OnlineStatus): void {
    this.account = account;
    this.status = status;
    this.emit();
  }

  get online(): boolean {
    return this.status === "online" && this.account !== null;
  }

  get registered(): boolean {
    return this.account?.kind === "registered";
  }

  async start(): Promise<void> {
    try {
      const sentAt = Date.now();
      const me = await onlineRequest<{ account: OnlineAccount | null; banned?: string; serverTime: number }>("/me");
      this.clockOffset = me.serverTime - (sentAt + Date.now()) / 2;
      if (me.banned) {
        this.bannedMessage = me.banned;
        this.set(null, "banned");
        return;
      }
      if (me.account !== null) {
        this.set(me.account, "online");
        return;
      }
      const guest = await onlineRequest<{ account: OnlineAccount }>("/guest", { body: { deviceKey: deviceKey() } });
      this.set(guest.account, "online");
    } catch (error) {
      if (error instanceof OnlineError && error.code === "banned") {
        this.bannedMessage = error.message;
        this.set(null, "banned");
        return;
      }
      this.set(null, "offline");
    }
  }

  async register(input: { email: string; password: string; displayName: string; birthYear: string; acceptTerms: boolean }): Promise<void> {
    const problem = passwordProblem(input.password);
    if (problem !== null) throw new OnlineError(400, "invalid", problem);
    const key = await derivePasswordKey(input.email, input.password);
    const result = await onlineRequest<{ account: OnlineAccount }>("/register", {
      body: { email: input.email, key, displayName: input.displayName, birthYear: input.birthYear, acceptTerms: input.acceptTerms },
    });
    this.set(result.account, "online");
  }

  async login(email: string, password: string): Promise<void> {
    const key = await derivePasswordKey(email, password);
    const result = await onlineRequest<{ account: OnlineAccount }>("/login", { body: { email, key } });
    this.set(result.account, "online");
  }

  async logout(): Promise<void> {
    await onlineRequest("/logout", { body: {} });
    // Back to this device's guest so the game keeps working online.
    this.set(null, "starting");
    await this.start();
  }

  async forgotPassword(email: string): Promise<void> {
    await onlineRequest("/password/forgot", { body: { email } });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const problem = passwordProblem(password);
    if (problem !== null) throw new OnlineError(400, "invalid", problem);
    const { email } = await onlineRequest<{ email: string }>("/password/reset-email", { body: { token } });
    await onlineRequest("/password/reset", { body: { token, email, key: await derivePasswordKey(email, password) } });
  }

  async changePassword(current: string, next: string): Promise<void> {
    const email = this.account?.email;
    if (!email) throw new OnlineError(400, "invalid", "Sign in first.");
    const problem = passwordProblem(next);
    if (problem !== null) throw new OnlineError(400, "invalid", problem);
    await onlineRequest("/password/change", {
      body: { current: await derivePasswordKey(email, current), next: await derivePasswordKey(email, next) },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    await onlineRequest("/email/verify", { body: { token } });
    await this.refresh();
  }

  async resendVerification(): Promise<void> {
    await onlineRequest("/email/resend", { body: {} });
  }

  async rename(displayName: string): Promise<void> {
    const result = await onlineRequest<{ account: OnlineAccount }>("/profile", { body: { displayName } });
    this.set(result.account, "online");
  }

  async deleteAccount(password: string): Promise<void> {
    const email = this.account?.email;
    await onlineRequest("/delete", { body: email ? { key: await derivePasswordKey(email, password) } : {} });
    this.set(null, "starting");
    await this.start();
  }

  async refresh(): Promise<void> {
    try {
      const me = await onlineRequest<{ account: OnlineAccount | null }>("/me");
      if (me.account !== null) this.set(me.account, "online");
    } catch {
      /* Keep the current state. */
    }
  }
}
