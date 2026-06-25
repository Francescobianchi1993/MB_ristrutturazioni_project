/**
 * Restituisce un preventivo condiviso, dato il suo id (token del link pubblico).
 * Lettura via service role: la tabella `preventivi` non è leggibile da anon.
 * Espone solo i campi necessari al riepilogo pubblico (niente `stato` interno).
 *
 * Input (JSON):  { id }
 * Output (JSON): { preventivo: { id, created_at, totale, totale_min, totale_max,
 *                                finitura, tempistica, mq, interventi } }
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { id } = await req.json().catch(() => ({}));
    if (!id || typeof id !== 'string') return jsonResponse({ error: 'id_mancante' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('preventivi')
      .select('id, created_at, totale, totale_min, totale_max, totale_ivato, finitura, tempistica, tipo_casa, mq, interventi')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[leggi-preventivo] query fallita:', error.message);
      return jsonResponse({ error: 'query_fallita' }, 500);
    }
    if (!data) return jsonResponse({ error: 'non_trovato' }, 404);

    return jsonResponse({ preventivo: data });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
