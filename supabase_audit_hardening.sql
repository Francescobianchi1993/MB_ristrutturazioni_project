-- Hardening da audit ultra (2026-07-11). Applicare sul progetto Supabase
-- pwidhcxyyldtlagjpjkn. Idempotente.

-- ── H2 / L4 ────────────────────────────────────────────────────────────────
-- Rimuove la policy che permetteva ad anon di inserire righe arbitrarie in
-- prenotazioni_intervento, bypassando tutte le guardie della edge function
-- crea-prenotazione (blocco weekend, 1 appuntamento/settimana, slot occupato).
-- Il flusso legittimo passa solo dalla function (service role), quindi togliere
-- la policy non rompe nulla. RLS resta abilitata → tabella write-only via service role.
-- (Se già applicato live in precedenza, questo DROP è un no-op.)
drop policy if exists "anon_insert_prenotazioni" on public.prenotazioni_intervento;

-- ── M12 / M14 ──────────────────────────────────────────────────────────────
-- Doppia prenotazione dello stesso slot per race check-then-create: un unique
-- index parziale su (data, ora) tra le prenotazioni ATTIVE (stato <> 'annullata')
-- rende impossibile due appuntamenti attivi sullo stesso slot a livello DB.
-- Le edge function (crea-prenotazione, gestisci-prenotazione) traducono la
-- violazione 23505 in { error: 'slot_occupato' } (409).
-- NB: se esistessero già duplicati attivi sullo stesso slot, la creazione fallisce:
--   select data_intervento, ora_intervento, count(*)
--   from public.prenotazioni_intervento
--   where stato <> 'annullata' and data_intervento is not null and ora_intervento is not null
--   group by 1,2 having count(*) > 1;
-- Bonificare eventuali duplicati prima di creare l'indice.
create unique index if not exists prenotazioni_slot_attivo_uniq
  on public.prenotazioni_intervento (data_intervento, ora_intervento)
  where stato <> 'annullata'
    and data_intervento is not null
    and ora_intervento is not null;
