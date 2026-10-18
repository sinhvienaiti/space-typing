-- A server-observed phase-0 rollback may be reconciled once on re-enabling authority.
alter table wallets add column reconcile_required integer not null default 0;
-- Maintenance deletes ledger days across accounts, not by the composite account/day PK.
create index wallet_days_day on wallet_days(day);
