-- Jarvis-style long-term memory for the telegram-agent bot: durable facts
-- the owner teaches it ("remember that ..."), injected every conversation.
create table if not exists public.bot_facts (
  chat_id bigint not null,
  key text not null,
  value text not null,
  category text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (chat_id, key)
);
alter table public.bot_facts enable row level security;
create index if not exists bot_facts_chat_idx on public.bot_facts (chat_id, key);
-- Service role only (used by telegram-agent) — no anon/authenticated
-- policies are created on purpose.
