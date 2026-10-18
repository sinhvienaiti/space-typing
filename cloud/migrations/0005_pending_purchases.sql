-- Purchase receipts survive day rollover until the game durably saves or refunds them.
alter table wallets add column pending_purchases text not null default '{}';
