-- Aggiunge l'email del cliente alla tabella prenotazioni_intervento.
-- Dal form di prenotazione nome, telefono ed email sono ora obbligatori:
-- l'email serve per la conferma automatica (EmailJS), il telefono per WhatsApp.

alter table public.prenotazioni_intervento
  add column if not exists email text;

comment on column public.prenotazioni_intervento.email is
  'Email del cliente (obbligatoria dal form): usata per la conferma automatica.';
