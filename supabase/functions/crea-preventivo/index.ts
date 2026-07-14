/**
 * Crea un preventivo condivisibile a partire dalla stima costruita nel
 * configuratore. Salva il record su `public.preventivi` (service role) e ritorna
 * l'id, che il frontend usa per comporre il link pubblico `?preventivo=<id>`.
 *
 * Input (JSON): {
 *   stato, totale, totale_min, totale_max, finitura, tempistica, mq,
 *   interventi: string[], contatti?: { name, email, phone }
 * }
 * Output (JSON): { id }
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { limiteSuperato } from '../_shared/antiflood.ts';

interface Body {
  stato?: unknown;
  totale?: number;
  totale_min?: number;
  totale_max?: number;
  totale_ivato?: number;
  finitura?: string;
  tempistica?: string;
  tipo_casa?: string;
  mq?: number;
  interventi?: unknown;
  contatti?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const b = (await req.json()) as Body;

    const totale = Number(b.totale) || 0;
    // Una stima senza valore non è condivisibile.
    if (totale <= 0) return jsonResponse({ error: 'stima_incompleta' }, 400);

    // Tetto alla dimensione dello snapshot `stato` (jsonb libero dal client):
    // senza, un payload enorme riempirebbe la tabella. 100 KB è molto più del
    // necessario per uno stato reale del configuratore.
    if (b.stato != null && JSON.stringify(b.stato).length > 100_000) {
      return jsonResponse({ error: 'payload_troppo_grande' }, 413);
    }

    const interventi = Array.isArray(b.interventi)
      ? b.interventi.map((x) => String(x).slice(0, 200)).slice(0, 30)
      : [];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Freno anti-abuso per IP: qui non parte nessuna email, ma è comunque una
    // scrittura pubblica su DB. Soglia più larga (creare più stime è legittimo).
    if (await limiteSuperato(supabase, req, {
      azione: 'crea-preventivo',
      maxIp: 20,
    })) {
      return jsonResponse({ error: 'troppe_richieste' }, 429);
    }

    const { data: row, error } = await supabase
      .from('preventivi')
      .insert({
        stato: b.stato ?? null,
        totale,
        totale_min: b.totale_min != null ? Number(b.totale_min) : null,
        totale_max: b.totale_max != null ? Number(b.totale_max) : null,
        totale_ivato: b.totale_ivato != null ? Number(b.totale_ivato) : null,
        finitura: b.finitura ?? null,
        tempistica: b.tempistica ?? null,
        tipo_casa: b.tipo_casa ?? null,
        mq: b.mq != null ? Number(b.mq) : null,
        interventi,
        contatti: b.contatti ?? null,
      })
      .select('id')
      .single();

    if (error || !row?.id) {
      console.error('[crea-preventivo] insert fallita:', error?.message);
      return jsonResponse({ error: 'insert_fallita' }, 500);
    }

    return jsonResponse({ id: row.id });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
