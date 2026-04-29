-- ============================================================================
-- MB Ristrutturazioni — Hardening Supabase prima del lancio pubblico del sito
-- ============================================================================
-- Da applicare PRIMA di mettere online il sito vetrina con la anon key
-- esposta in browser. Apre la lettura solo sulle voci validate del prezzario,
-- e chiude le RPC SECURITY DEFINER al ruolo `anon` per evitare che chiunque
-- possa modificare prezzi o validare proposte senza login.
--
-- Da eseguire in Supabase SQL editor con l'utente postgres/admin.
-- ============================================================================

-- 1) Revoca EXECUTE delle RPC al ruolo `anon` ----------------------------------
REVOKE EXECUTE ON FUNCTION public.applica_decisione(bigint, text, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salva_decisione(bigint, text, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.valida_proposte_bulk(bigint[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decisioni_recenti(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mio_profilo() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_prezzo_change() FROM anon;

-- 2) Permetti SOLO la lettura pubblica delle voci validate --------------------
-- Le altre tabelle (decisioni_revisione, storico_modifiche, voci_archiviate,
-- utenti_profili) restano completamente fuori portata di anon.

DROP POLICY IF EXISTS "anon_read_validated_voci" ON public.voci;

CREATE POLICY "anon_read_validated_voci"
  ON public.voci
  FOR SELECT
  TO anon
  USING (stato = 'validated');

-- 3) Verifica nessun INSERT/UPDATE/DELETE pubblico su voci --------------------
-- Le policy esistenti per authenticated vanno verificate manualmente in
-- Dashboard → Authentication → Policies. Anon non deve avere policy di scrittura.

-- 4) Abilita Leaked Password Protection ---------------------------------------
-- Da Dashboard: Authentication → Providers → Email → Password Protection → ON.
-- Non si fa via SQL.

-- ============================================================================
-- Test finale (eseguire come anon role, sul SQL editor cambiando role):
--   SELECT id, voce, prezzo, stato FROM voci LIMIT 5;        -- DEVE funzionare
--   SELECT id, voce FROM voci WHERE stato = 'draft_da_validare' LIMIT 5;
--                                                             -- DEVE essere vuoto
--   SELECT * FROM voci_archiviate LIMIT 1;                    -- DEVE fallire o essere vuoto
--   SELECT applica_decisione(1, 'ok', 100, 'test');           -- DEVE fallire
-- ============================================================================
