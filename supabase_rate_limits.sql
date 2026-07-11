-- Tabella di supporto al rate limiting delle edge function (recupera-password-admin,
-- admin-richieste). Accessibile SOLO dal service role: RLS abilitata e nessuna
-- policy → anon/authenticated non possono né leggere né scrivere.

create table if not exists public.rate_limits (
  chiave           text primary key,
  conteggio        integer not null default 0,
  finestra_inizio  timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- Nessuna policy volutamente: solo il service role (che bypassa la RLS) vi accede.
