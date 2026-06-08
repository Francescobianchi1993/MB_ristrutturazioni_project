-- Estensione tabella prenotazioni_intervento per la sincronizzazione Google Calendar.
-- Aggiunge il riferimento all'evento Google e i contatti del cliente.
--
-- L'insert ora passa dalla Edge Function `crea-prenotazione` (service role),
-- che scrive anche google_event_id: la policy anon_insert resta per retro-
-- compatibilità ma il flusso principale non la usa più.

alter table public.prenotazioni_intervento
  add column if not exists google_event_id text,   -- id evento sul Google Calendar società
  add column if not exists nome text,               -- nome cliente (opzionale)
  add column if not exists telefono text;           -- telefono cliente (opzionale)

comment on column public.prenotazioni_intervento.google_event_id is
  'ID evento creato sul Google Calendar della società (per modifiche/cancellazioni).';
