-- Tabella dei preventivi condivisibili generati dal configuratore "stima rapida".
-- L'id uuid funge da token capability nel link pubblico ?preventivo=<id>.
--
-- Sicurezza: RLS abilitata SENZA policy per anon → la tabella non è leggibile né
-- scrivibile dal client pubblico. Tutto l'accesso passa dalle edge function
-- (crea-preventivo / leggi-preventivo) che usano la service role (bypassa RLS),
-- stesso modello di lead_sopralluogo.

create table if not exists public.preventivi (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  stato       jsonb,            -- intero ProgettoState (snapshot della stima)
  totale      numeric not null, -- totale centrale
  totale_min  numeric,          -- estremo inferiore range (±15%)
  totale_max  numeric,          -- estremo superiore range
  finitura    text,             -- intelligent | smart | prestige
  tempistica  text,             -- urgente | normale | flessibile (solo informativo)
  mq          numeric,          -- superficie indicata
  interventi  jsonb,            -- elenco label interventi attivi
  contatti    jsonb             -- { name, email, phone } (opzionale)
);

alter table public.preventivi enable row level security;
-- Nessuna policy: anon non legge/scrive direttamente; accesso solo via service role.
