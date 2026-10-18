/**
 * Thin helpers over D1. D1 has no interactive transactions: a multi-step
 * write is one `batch()` (atomic: all statements or none). Read-then-write
 * flows use a version column and conditional statements instead of locks
 * (see liveops.ts and saves.ts).
 */
export type Row = Record<string, unknown>;

export type Sql = {
  all<T extends Row = Row>(sql: string, ...params: unknown[]): Promise<T[]>;
  first<T extends Row = Row>(sql: string, ...params: unknown[]): Promise<T | null>;
  run(sql: string, ...params: unknown[]): Promise<number>;
  stmt(sql: string, ...params: unknown[]): D1PreparedStatement;
  /** Atomic; returns rows changed per statement. */
  batch(statements: D1PreparedStatement[]): Promise<number[]>;
};

/** D1 rejects `undefined`; booleans become 1/0. */
function clean(params: unknown[]): unknown[] {
  return params.map((value) => (value === undefined ? null : typeof value === "boolean" ? (value ? 1 : 0) : value));
}

export function sql(db: D1Database): Sql {
  const stmt = (text: string, ...params: unknown[]): D1PreparedStatement =>
    params.length === 0 ? db.prepare(text) : db.prepare(text).bind(...clean(params));
  return {
    stmt,
    async all<T extends Row = Row>(text: string, ...params: unknown[]) {
      return (await stmt(text, ...params).all<T>()).results ?? [];
    },
    async first<T extends Row = Row>(text: string, ...params: unknown[]) {
      return (await stmt(text, ...params).first<T>()) ?? null;
    },
    async run(text: string, ...params: unknown[]) {
      return (await stmt(text, ...params).run()).meta.changes ?? 0;
    },
    async batch(statements: D1PreparedStatement[]) {
      if (statements.length === 0) return [];
      const results = await db.batch(statements);
      return results.map((result) => result.meta?.changes ?? 0);
    },
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed|constraint failed: UNIQUE|SQLITE_CONSTRAINT/i.test(error.message);
}

/**
 * Fixed-window counter in D1 (shared by every Worker instance). Returns the
 * count after this hit. Use only on rare paths (sign-in failures, sign-up,
 * password reset), since every call is a database write.
 */
const RATE_LIMIT_HIT = `insert into rate_limits (key, count, reset_at) values (?1, 1, ?2)
     on conflict (key) do update set
       count = case when rate_limits.reset_at <= ?3 then 1 else rate_limits.count + 1 end,
       reset_at = case when rate_limits.reset_at <= ?3 then excluded.reset_at else rate_limits.reset_at end`;

export async function hitRateLimit(db: Sql, key: string, windowMs: number, now = Date.now()): Promise<number> {
  const row = await db.first<{ count: number }>(RATE_LIMIT_HIT + " returning count", key, now + windowMs, now);
  return Number(row?.count ?? 1);
}

/** The same hit as a statement, to count several keys in one batch. */
export function rateLimitStmt(db: Sql, key: string, windowMs: number, now = Date.now()): D1PreparedStatement {
  return db.stmt(RATE_LIMIT_HIT, key, now + windowMs, now);
}

export async function peekRateLimit(db: Sql, key: string, now = Date.now()): Promise<number> {
  const row = await db.first<{ count: number; reset_at: number }>("select count, reset_at from rate_limits where key = ?1", key);
  return row === null || Number(row.reset_at) <= now ? 0 : Number(row.count);
}
