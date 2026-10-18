-- Server wallet (docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md, phases 1–3).
-- WITHOUT ROWID with no secondary index: every money change is one written row.

create table wallets (
  account_id text primary key references accounts (id) on delete cascade,
  credits integer not null default 0,
  alloy integer not null default 0,
  star_crystal integer not null default 0,
  quantum_core integer not null default 0,
  -- WarpCharge JSON (src/economy/warp-charge.ts), reconciled on the server clock.
  warp text not null,
  -- Warp gifts that did not fit in the tanks; added as soon as there is room.
  warp_pending integer not null default 0,
  -- The sortie in progress: {"id","stage","activity","startedAt","cost"} or null.
  sortie text,
  -- Highest stage the server accepted (caps and plausibility use it).
  max_stage integer not null default 1,
  -- Earnings reported today (game day) per currency, for the daily caps.
  earn_day integer not null default -1,
  earned text not null default '{}',
  -- Today's day ledger (moved to wallet_days on the first change of a new day).
  today_day integer not null default -1,
  today_ops text not null default '[]',
  -- The last RECENT_OPS opIds (idempotency).
  recent_ops text not null default '[]',
  -- Big rewards waiting for a verified email: [{"key","label","reward"}].
  held text not null default '[]',
  -- Flags for Admin: [{"t","code","detail"}].
  flags text not null default '[]',
  version integer not null default 0,
  -- opId of the last change (lets a batched Daily Hub claim check its wallet write happened).
  last_op text,
  origin text not null,
  created_at text not null,
  updated_at text not null
) without rowid;

-- Earlier days of the ledger, kept 90 days (cloud/src/maintenance.ts).
create table wallet_days (
  account_id text not null references accounts (id) on delete cascade,
  day integer not null,
  ops text not null,
  totals text not null,
  primary key (account_id, day)
) without rowid;

-- Gift codes whose reward counts as big (needs a verified email).
alter table gift_codes add column big integer not null default 0;
