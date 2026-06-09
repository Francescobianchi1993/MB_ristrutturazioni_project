-- Aggiunge l'indirizzo dell'intervento alla tabella prenotazioni_intervento.
-- Dal form di prenotazione via/CAP/città sono ora obbligatori: servono per
-- sapere DOVE svolgere l'intervento e per il filtro zona di copertura.
--
-- fuori_zona = true quando il CAP non appartiene a Roma/provincia (CAP che non
-- iniziano per "00"): la prenotazione passa comunque ma viene marcata per la
-- valutazione di fattibilità (avviso morbido lato sito).

alter table public.prenotazioni_intervento
  add column if not exists indirizzo text,           -- via e numero civico
  add column if not exists cap text,                 -- CAP (5 cifre)
  add column if not exists citta text,               -- città / comune
  add column if not exists fuori_zona boolean not null default false;

comment on column public.prenotazioni_intervento.indirizzo is
  'Indirizzo (via e civico) dove svolgere l''intervento.';
comment on column public.prenotazioni_intervento.cap is
  'CAP dell''intervento. Roma e provincia iniziano per "00".';
comment on column public.prenotazioni_intervento.citta is
  'Città/comune dell''intervento.';
comment on column public.prenotazioni_intervento.fuori_zona is
  'true se il CAP è fuori dalla zona di copertura (Roma e provincia): da valutare.';
