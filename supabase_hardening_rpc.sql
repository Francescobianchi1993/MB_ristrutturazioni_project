-- Hardening sicurezza DB (segnalazioni get_advisors).
--
-- 1) Chiude la tabella di backup esposta senza RLS (errore "rls_disabled_in_public").
-- 2) Revoca l'esecuzione delle funzioni SECURITY DEFINER di gestione prezzi dagli
--    utenti pubblici. IMPORTANTE: si revoca SOLO da public e anon, NON da
--    authenticated: il gestionale prezzario chiama queste RPC da utente loggato
--    e revocarle anche ad authenticated lo romperebbe.

-- 1. Tabella di backup: abilita RLS (di fatto la rende non accessibile da anon).
alter table if exists public.voci_backup_20260617 enable row level security;

-- 2. Revoca EXECUTE sulle RPC admin SOLO da public e anon (NON da authenticated).
revoke execute on function public.applica_decisione(bigint, text, numeric, text) from public, anon;
revoke execute on function public.salva_decisione(bigint, text, numeric, text)   from public, anon;
revoke execute on function public.valida_proposte_bulk(bigint[])                 from public, anon;
revoke execute on function public.decisioni_recenti(integer)                     from public, anon;
revoke execute on function public.mio_profilo()                                  from public, anon;
revoke execute on function public.log_prezzo_change()                            from public, anon;
revoke execute on function public.notify_lead_on_insert()                        from public, anon;
