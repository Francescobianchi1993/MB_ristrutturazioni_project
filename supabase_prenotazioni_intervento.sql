-- Tabella prenotazioni del wizard "Intervento" (sito MB).
-- Applicata su Supabase (progetto pwidhcxyyldtlagjpjkn) il 2026-06-08.
--
-- Il sito è anonimo: anon può solo INSERIRE (nessuna lettura), così le
-- prenotazioni restano private e leggibili solo da service_role / dashboard.

create table if not exists public.prenotazioni_intervento (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  categoria text not null,                         -- 'idro' | 'elettrico'
  urgenza text not null,                           -- 'normale' | 'alta'
  data_intervento date,
  ora_intervento text,
  voci jsonb not null default '[]'::jsonb,          -- [{ id, voce, prezzo }]
  voci_custom jsonb not null default '[]'::jsonb,   -- ["descrizione libera", ...] prezzo da definire
  totale_stimato numeric not null default 0,
  stato text not null default 'nuova'              -- nuova | gestita | chiusa
);

alter table public.prenotazioni_intervento enable row level security;

drop policy if exists "anon_insert_prenotazioni" on public.prenotazioni_intervento;
create policy "anon_insert_prenotazioni"
  on public.prenotazioni_intervento
  for insert
  to anon
  with check (true);

comment on table public.prenotazioni_intervento is
  'Prenotazioni dal wizard Intervento del sito MB. voci_custom = richieste libere a prezzo da definire.';
