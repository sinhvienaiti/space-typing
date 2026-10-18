/** Bindings and settings of the space-typing-api Worker (cloud/wrangler.jsonc). */
export type Env = {
  DB: D1Database;
  CHAT: DurableObjectNamespace;
  PUBLIC_URL?: string;
  SESSION_DAYS?: string;
  /** Shared with admin/server.mjs for /internal/admin/*. */
  ADMIN_TOKEN?: string;
  /** Server-side secret mixed into password hashes. */
  PASSWORD_PEPPER?: string;
  /** Optional: send email through Resend (free tier) instead of only the outbox. */
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  /** "1" in local development: relaxed secrets, outbox shows links. */
  LOCAL_DEV?: string;
  /** Hourly save backups kept per player (1–24, default 6). */
  SAVE_BACKUPS?: string;
  /** Server wallet rollout (cloud/src/wallet.ts): 0 off, 1 shadow, 2 spends/Warp/claims, 3 + sortie checks. */
  WALLET_PHASE?: string;
  /** Only accounts created before this fixed ISO instant may migrate a legacy balance. Missing/invalid denies migration. */
  WALLET_SEED_BEFORE?: string;
};
