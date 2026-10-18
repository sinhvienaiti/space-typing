-- Keep bounded daily-lesson receipts independently from the short generic retry ring.
alter table wallets add column fixed_claims text not null default '[]';
