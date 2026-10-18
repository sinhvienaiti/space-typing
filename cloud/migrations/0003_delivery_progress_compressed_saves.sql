-- Round 2: exactly-once Daily Hub delivery, progress plausibility, compressed saves.
-- "if (not) exists" because an early local build of 0002 swapped these two ledger indexes.

-- The Daily Hub delivery cursor reads a player's ledger by id: needs (account_id, id).
create index if not exists reward_ledger_account_idx on reward_ledger (account_id, id);
drop index if exists reward_ledger_key_idx;

-- Admin "claimed" count kept on the mail row: one write per mail claim instead of an
-- extra index row on every ledger insert.
alter table mail add column claimed_count integer not null default 0;
update mail set claimed_count = (select count(*) from reward_ledger l where l.key = 'liveops:mail:mail-' || mail.id);

-- Time (ms since epoch) of the last accepted play-progress report, for plausibility caps.
alter table liveops_states add column progress_at integer;

-- Compressed saves: when data_gz is set, data is '{}' and summary holds the small
-- JSON the Admin and the conflict dialog show (computed at upload).
alter table player_saves add column data_gz blob;
alter table player_saves add column summary text;
-- Random id of the upload that wrote this copy (lets a device recognise its own
-- page-close upload whose answer it never received).
alter table player_saves add column upload_id text;
alter table player_save_backups add column data_gz blob;
alter table player_save_backups add column summary text;
