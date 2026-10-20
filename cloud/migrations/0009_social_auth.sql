-- Additive: keep account ids, saves, wallets and the original registered-account
-- CHECK intact. Social-only accounts store a random inaccessible password hash
-- and explicitly disable password login until the owner sets a password.
alter table accounts add column password_login_enabled integer not null default 1
  check (password_login_enabled in (0, 1));

-- Provider identities already use auth_identities(provider, subject). Never link
-- accounts by email alone. Browser-bound, single-use state expires in 10 minutes.
create table oauth_attempts (
  state_hash text primary key,
  browser_hash text not null,
  provider text not null check (provider in ('google', 'facebook')),
  verifier text not null,
  intent text not null check (intent in ('login', 'register', 'link')),
  account_id text references accounts(id) on delete cascade,
  session_id text references sessions(id) on delete cascade,
  accept_terms integer not null check (accept_terms in (0, 1)),
  display_name text,
  birth_year integer,
  created_at integer not null,
  expires_at integer not null,
  consumed_at integer
);
create index oauth_attempts_expiry_idx on oauth_attempts(expires_at);
