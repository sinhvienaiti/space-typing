-- Space Typing online: Cloudflare D1 (SQLite). Times are ISO-8601 UTC text,
-- ids are UUID text, JSON is stored as text (read with json_extract).
-- Apply: wrangler d1 migrations apply DB [--local|--remote] -c cloud/wrangler.jsonc

create table accounts (
  id text primary key,
  kind text not null check (kind in ('guest', 'registered')),
  -- Short public code friends type to find each other (e.g. "K7Q2MX").
  pilot_code text not null unique,
  email text,
  email_normalized text unique,
  email_verified_at text,
  -- Server-side keyed hash of the client-derived key (see cloud/src/crypto.ts).
  password_hash text,
  password_salt text,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'banned', 'deleted')),
  ban_reason text,
  banned_until text,
  chat_muted_until text,
  birth_year integer check (birth_year is null or birth_year between 1900 and 2100),
  terms_accepted_at text,
  created_at text not null,
  last_login_at text,
  last_seen_at text,
  deleted_at text,
  check (kind = 'guest' or (email_normalized is not null and password_hash is not null))
);
create index accounts_seen_idx on accounts (last_seen_at);
create index accounts_created_idx on accounts (created_at);

create table auth_identities (
  provider text not null,
  subject text not null,
  account_id text not null references accounts (id) on delete cascade,
  created_at text not null,
  primary key (provider, subject)
);
create index auth_identities_account_idx on auth_identities (account_id);

create table sessions (
  id text primary key,
  account_id text not null references accounts (id) on delete cascade,
  token_hash text not null unique,
  created_at text not null,
  expires_at text not null,
  last_seen_at text not null,
  ip text,
  user_agent text,
  revoked_at text
);
create index sessions_account_idx on sessions (account_id);

create table one_time_tokens (
  token_hash text primary key,
  account_id text not null references accounts (id) on delete cascade,
  purpose text not null check (purpose in ('verify-email', 'reset-password')),
  created_at text not null,
  expires_at text not null,
  used_at text
);

create table email_outbox (
  id integer primary key autoincrement,
  to_email text not null,
  subject text not null,
  body text not null,
  created_at text not null,
  sent_at text,
  error text
);

create table rate_limits (
  key text primary key,
  count integer not null,
  reset_at integer not null
);

create table player_saves (
  account_id text primary key references accounts (id) on delete cascade,
  revision integer not null,
  save_version integer not null,
  data text not null,
  bytes integer not null,
  device text,
  updated_at text not null
);

create table player_save_backups (
  id integer primary key autoincrement,
  account_id text not null references accounts (id) on delete cascade,
  revision integer not null,
  save_version integer not null,
  data text not null,
  reason text not null,
  created_at text not null
);
create index player_save_backups_account_idx on player_save_backups (account_id, id);

create table liveops_states (
  account_id text primary key references accounts (id) on delete cascade,
  data text not null,
  version integer not null default 0,
  updated_at text not null
);

create table reward_ledger (
  id integer primary key autoincrement,
  account_id text not null references accounts (id) on delete cascade,
  key text not null,
  source text not null,
  reward text not null,
  note text,
  admin_actor text,
  created_at text not null,
  unique (account_id, key)
);
create index reward_ledger_account_idx on reward_ledger (account_id, id);
create index reward_ledger_created_idx on reward_ledger (created_at);

create table mail (
  id text primary key,
  target_account_id text references accounts (id) on delete cascade,
  title text not null,
  body text not null,
  reward text not null default '{}',
  starts_at text not null,
  ends_at text,
  created_by text not null,
  created_at text not null,
  revoked_at text
);
create index mail_target_idx on mail (target_account_id);

create table gift_codes (
  id text primary key,
  code_hash text not null unique,
  code_hint text not null,
  title text not null,
  body text not null,
  reward text not null,
  max_redemptions integer,
  redeemed_count integer not null default 0,
  starts_at text not null,
  ends_at text,
  created_by text not null,
  created_at text not null,
  disabled_at text
);

create table gift_code_redemptions (
  code_id text not null references gift_codes (id) on delete cascade,
  account_id text not null references accounts (id) on delete cascade,
  redeemed_at text not null,
  primary key (code_id, account_id)
);
create index gift_code_redemptions_account_idx on gift_code_redemptions (account_id);

-- Social: friends (private chat) and groups (group chat).
create table friendships (
  account_id text not null references accounts (id) on delete cascade,
  friend_id text not null references accounts (id) on delete cascade,
  status text not null check (status in ('pending-out', 'pending-in', 'accepted', 'blocked')),
  created_at text not null,
  updated_at text not null,
  primary key (account_id, friend_id)
);
create index friendships_friend_idx on friendships (friend_id);

create table chat_groups (
  id text primary key,
  name text not null,
  owner_id text not null references accounts (id) on delete cascade,
  invite_code text not null unique,
  created_at text not null,
  archived_at text
);

create table chat_group_members (
  group_id text not null references chat_groups (id) on delete cascade,
  account_id text not null references accounts (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at text not null,
  primary key (group_id, account_id)
);
create index chat_group_members_account_idx on chat_group_members (account_id);

create table chat_reports (
  id integer primary key autoincrement,
  channel text not null,
  message_id text not null,
  reporter_id text not null,
  target_id text not null,
  target_name text not null,
  text text not null,
  reason text,
  created_at text not null,
  resolved_at text,
  resolved_by text,
  resolution text
);
create index chat_reports_open_idx on chat_reports (resolved_at, created_at);

create table admin_audit (
  id integer primary key autoincrement,
  actor text not null,
  action text not null,
  target text,
  details text not null default '{}',
  created_at text not null
);
create index admin_audit_created_idx on admin_audit (created_at);
