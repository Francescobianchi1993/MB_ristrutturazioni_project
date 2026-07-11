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

-- NB: in origine esisteva una policy `anon_insert_prenotazioni` (INSERT to anon
-- WITH CHECK true) per l'inserimento diretto dal browser. Il flusso passa ora
-- SOLO dalla edge function `crea-prenotazione` (service role, bypassa RLS), che
-- applica tutte le validazioni (blocco weekend, 1 appuntamento/settimana, slot).
-- La policy anon è stata rimossa (vedi supabase_audit_hardening.sql) perché
-- permetteva insert arbitrari saltando quelle guardie. RLS abilitata senza policy
-- = tabella scrivibile solo via service role.
drop policy if exists "anon_insert_prenotazioni" on public.prenotazioni_intervento;

comment on table public.prenotazioni_intervento is
  'Prenotazioni dal wizard Intervento del sito MB. voci_custom = richieste libere a prezzo da definire.';
