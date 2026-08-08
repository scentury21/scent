-- Conversation memory for the telegram-agent bot: keeps recent turns per
-- chat so the bot understands follow-ups across separate messages.
create table if not exists public.bot_memory (
  chat_id bigint not null,
  seq bigint not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  primary key (chat_id, seq)
);
alter table public.bot_memory enable row level security;
create index if not exists bot_memory_chat_idx on public.bot_memory (chat_id, seq desc);
-- Service role only (used by telegram-agent) — no anon/authenticated
-- policies are created on purpose.
