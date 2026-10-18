-- Indexes for queries that otherwise scan a whole table (each scanned row
-- counts against the D1 Free plan's 5 million rows read per day).

-- Admin "Chat moderation" counts reports per target; player detail lists them.
create index chat_reports_target_idx on chat_reports (target_id, id);

-- One report per message and reporter (chat.ts inserts with "on conflict do nothing").
delete from chat_reports where id not in (select min(id) from chat_reports group by message_id, reporter_id);
create unique index chat_reports_once_idx on chat_reports (message_id, reporter_id);
