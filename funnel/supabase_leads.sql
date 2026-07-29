-- =============================================================================
-- Tabella `leads` per il funnel di acquisizione (vendi-casa-a-Roma).
-- Da lanciare nel SQL Editor di Supabase (una volta sola).
-- =============================================================================

create table if not exists public.leads (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),

  -- Step 1 · Immobile
  tipo_immobile      text,
  zona               text,
  indirizzo          text,
  mq                 int,

  -- Step 2 · Dettagli
  piano              text,
  ascensore          boolean,
  locali             int,
  bagni              int,
  stato              text,
  classe_energetica  text,
  anno_costruzione   int,

  -- Step 3 · Situazione
  motivo_vendita     text,
  tempistica         text,
  prezzo_atteso      int,

  -- Step 4 · Contatti
  nome               text,
  telefono           text,
  email              text,
  consenso_privacy   boolean,

  -- Stima indicativa calcolata al momento dell'invio
  stima_min          int,
  stima_max          int
);

-- -----------------------------------------------------------------------------
-- Row Level Security.
-- Abilitiamo RLS e concediamo ad `anon` SOLO l'INSERT: il form pubblico può
-- salvare un lead ma NESSUNO (via anon key) può leggere i lead già salvati.
-- La lettura avviene dalla dashboard Supabase con la service role, oppure da un
-- backend protetto. Così l'elenco contatti resta privato.
-- -----------------------------------------------------------------------------
alter table public.leads enable row level security;

drop policy if exists "leads_insert_anon" on public.leads;
create policy "leads_insert_anon"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

-- Nessuna policy di SELECT/UPDATE/DELETE per anon → non leggibile/modificabile
-- dal client pubblico.

-- Indice per ordinare i lead più recenti nella dashboard.
create index if not exists leads_created_at_idx
  on public.leads (created_at desc);
