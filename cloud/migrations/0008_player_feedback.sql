-- Ideas, bug reports and contact messages players send from the game (cloud/src/feedback.ts),
-- read and answered by Admins (Admin > Feedback). The account columns are copied at sending time,
-- so the queue stays readable when an account is renamed or deleted (deletion clears them).
create table player_feedback (
  id text primary key,
  account_id text,
  account_kind text,
  display_name text,
  category text not null,
  message text not null,
  contact_email text,
  context text not null default '{}',
  status text not null default 'new',
  admin_note text,
  created_at text not null,
  handled_at text,
  handled_by text
);
create index player_feedback_status_created on player_feedback (status, created_at);
create index player_feedback_account on player_feedback (account_id);
