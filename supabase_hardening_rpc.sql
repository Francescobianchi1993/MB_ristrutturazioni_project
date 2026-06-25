-- Hardening sicurezza DB (segnalazioni get_advisors).
--
-- 1) Chiude la tabella di backup esposta senza RLS (errore "rls_disabled_in_public").
-- 2) Revoca l'esecuzione delle funzioni SECURITY DEFINER di gestione prezzi dagli
--    utenti pubblici (anon/authenticated): sono operazioni admin, non devono essere
--    invocabili via /rest/v1/rpc da chi non ha la service role.

-- 1. Tabella di backup: abilita RLS (di fatto la rende non accessibile da anon).
alter table if exists public.voci_backup_20260617 enable row level security;

-- 2. Revoca EXECUTE sulle RPC admin.
revoke execute on function public.applica_decisione(bigint, text, numeric, text) from anon, authenticated, public;
revoke execute on function public.salva_decisione(bigint, text, numeric, text)   from anon, authenticated, public;
revoke execute on function public.valida_proposte_bulk(bigint[])                 from anon, authenticated, public;
revoke execute on function public.decisioni_recenti(integer)                     from anon, authenticated, public;
revoke execute on function public.mio_profilo()                                  from anon, authenticated, public;
revoke execute on function public.log_prezzo_change()                            from anon, authenticated, public;
