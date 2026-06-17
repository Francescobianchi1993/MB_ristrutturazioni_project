/**
 * Mini-gestionale: elenca TUTTE le richieste in arrivo (sopralluoghi + interventi),
 * firma gli allegati e permette di segnare una richiesta come gestita.
 *
 * Protetta da password (secret `ADMIN_PASSWORD` su Supabase). La password viaggia
 * nel body, confrontata lato server col secret. Tutto via service role → i dati
 * restano privati e non leggibili con la sola anon key.
 *
 * Input (JSON): { password, azione, tipo?, id?, paths?, stato? }
 *   azione = 'lista' | 'firma' | 'segna'
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'sopralluogo-files';
const SCADENZA_SEC = 60 * 60 * 24 * 365;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { password, azione, tipo, id, paths, stato } = body ?? {};

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: cfg } = await supabase.from('app_config').select('valore').eq('chiave', 'admin_password').single();
    const pw = cfg?.valore ?? Deno.env.get('ADMIN_PASSWORD');
    if (!pw) return jsonResponse({ error: 'non_configurato' }, 503);
    if (password !== pw) return jsonResponse({ error: 'password_errata' }, 401);

    if (azione === 'lista') {
      const { data: sopralluoghi } = await supabase
        .from('lead_sopralluogo')
        .select('id, created_at, nome, email, telefono, note, allegati, stato')
        .order('created_at', { ascending: false })
        .limit(500);
      const { data: interventi } = await supabase
        .from('prenotazioni_intervento')
        .select('id, created_at, nome, email, telefono, categoria, urgenza, data_intervento, ora_intervento, totale_stimato, stato')
        .order('created_at', { ascending: false })
        .limit(500);
      return jsonResponse({ ok: true, sopralluoghi: sopralluoghi ?? [], interventi: interventi ?? [] });
    }

    if (azione === 'firma') {
      const out: { path: string; url: string | null }[] = [];
      for (const p of (Array.isArray(paths) ? paths : []).slice(0, 10)) {
        try {
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, SCADENZA_SEC);
          out.push({ path: p, url: data?.signedUrl ?? null });
        } catch {
          out.push({ path: p, url: null });
        }
      }
      return jsonResponse({ ok: true, urls: out });
    }

    if (azione === 'segna') {
      const tabella = tipo === 'intervento' ? 'prenotazioni_intervento' : 'lead_sopralluogo';
      if (!id || !stato) return jsonResponse({ error: 'parametri_mancanti' }, 400);
      await supabase.from(tabella).update({ stato }).eq('id', id);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'azione_sconosciuta' }, 400);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
