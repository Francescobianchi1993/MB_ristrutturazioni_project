/**
 * Restituisce un preventivo condiviso, dato il suo id (token del link pubblico).
 * Lettura via service role: la tabella `preventivi` non è leggibile da anon.
 *
 * Include lo `stato` del configuratore (serve a chi apre il link per scaricare
 * il PDF con la ripartizione per intervento), ma con i `contatti` RIMOSSI: il
 * link viene inoltrato a terzi e non deve esporre nome/email/telefono di chi ha
 * creato la stima.
 *
 * Input (JSON):  { id }
 * Output (JSON): { preventivo: { id, created_at, totale, totale_min, totale_max,
 *                                totale_ivato, finitura, tempistica, tipo_casa,
 *                                mq, interventi, stato } }
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
      .select(
        'id, created_at, totale, totale_min, totale_max, totale_ivato, finitura, tempistica, tipo_casa, mq, interventi, stato',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[leggi-preventivo] query fallita:', error.message);
      return jsonResponse({ error: 'query_fallita' }, 500);
    }
    if (!data) return jsonResponse({ error: 'non_trovato' }, 404);

    // Lo `stato` è uno snapshot dell'intero configuratore e contiene anche i
    // contatti di chi ha creato la stima: chi apre il link non deve vederli.
    const { stato, ...resto } = data as Record<string, unknown> & { stato?: Record<string, unknown> | null };
    const statoPubblico = stato && typeof stato === 'object' ? { ...stato, contatti: undefined } : null;

    return jsonResponse({ preventivo: { ...resto, stato: statoPubblico } });
  } catch (e) {
    console.error('[leggi-preventivo] errore non gestito:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'errore_interno' }, 500);
  }
});
