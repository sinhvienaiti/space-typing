import { ApiError } from "./http";

/** Best-effort per-isolate limit, before wallet D1 reads/writes. No D1 write to count a request. */
export class WalletRateLimit {
  private readonly accounts = new Map<string, { count: number; until: number }>();

  hit(accountId: string, now: number): void {
    let window = this.accounts.get(accountId);
    if (!window || now >= window.until) {
      // Bound memory even when an isolate sees many one-off accounts.
      if (this.accounts.size >= 10_000) {
        for (const [key, value] of this.accounts) if (now >= value.until) this.accounts.delete(key);
        if (this.accounts.size >= 10_000) throw new ApiError(429, "rate-limited", "Wallet is busy. Retry shortly.");
      }
      window = { count: 0, until: now + 60_000 };
      this.accounts.set(accountId, window);
    }
    if (window.count >= 30) throw new ApiError(429, "rate-limited", "Too many wallet operations. Retry in a minute.");
    window.count++;
  }
}

export const walletRateLimit = new WalletRateLimit();
