/**
 * Crea una prenotazione intervento.
 *
 * 1. verifica anti doppia-prenotazione (free/busy sullo slot esatto)
 * 2. crea l'evento sul Google Calendar della società
 * 3. salva la riga su Supabase (service role) con il google_event_id
 *
 * Input (JSON): payload PrenotazioneRiepilogo (vedi frontend).
 * Output: { ok, id, eventId } | { error: 'slot_occupato' } (409)
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAccessToken, getBusy } from '../_shared/google.ts';
import { SLOT_DURATA_MIN, TIME_ZONE, romeWallToUTC } from '../_shared/time.ts';
import { inviaWhatsApp } from '../_shared/whatsapp.ts';
import { inviaEmailConferma } from '../_shared/email.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Voce {
  id: number;
  voce: string;
  prezzo: number;
}

interface Payload {
  categoria: string;
  urgenza: string;
  voci: Voce[];
  vociCustom: string[];
  data: string;
  ora: string;
  totale: number;
  nome?: string;
  telefono?: string;
  email?: string;
}

function costruisciDescrizione(p: Payload, tipo: string): string {
  const righe = [
    'Prenotazione dal sito MB Ristrutturazioni',
    `Tipo: ${tipo}`,
    `Urgenza: ${p.urgenza === 'alta' ? 'Alta (prioritario)' : 'Normale'}`,
  ];
  if (p.nome) righe.push(`Cliente: ${p.nome}`);
  if (p.telefono) righe.push(`Telefono: ${p.telefono}`);
  if (p.email) righe.push(`Email: ${p.email}`);
  if (p.voci.length > 0) {
    righe.push('', 'Interventi:', ...p.voci.map((v) => `• ${v.voce} — € ${v.prezzo}`));
  }
  if (p.vociCustom.length > 0) {
    righe.push('', 'Richieste personalizzate (prezzo da definire):', ...p.vociCustom.map((d) => `• ${d}`));
  }
  righe.push('', `Totale stimato a listino: € ${p.totale.toFixed(2)}`);
  return righe.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const p = (await req.json()) as Payload;
    if (!p?.data || !p?.ora) return jsonResponse({ error: 'data_ora_mancante' }, 400);

    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID mancante');

    const token = await getAccessToken();
    const start = romeWallToUTC(p.data, p.ora);
    const end = new Date(start.getTime() + SLOT_DURATA_MIN * 60_000);

    // 1. anti doppia-prenotazione: lo slot deve essere ancora libero
    const busy = await getBusy(token, calendarId, start.toISOString(), end.toISOString(), TIME_ZONE);
    if (busy.length > 0) return jsonResponse({ error: 'slot_occupato' }, 409);

    // 2. crea l'evento sul calendario società
    const tipo = p.categoria === 'idro' ? 'Idraulico' : 'Elettricista';
    const summary = `Intervento MB — ${tipo}${p.nome ? ` (${p.nome})` : ''}`;
    const evRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          description: costruisciDescrizione(p, tipo),
          start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
          end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
        }),
      },
    );
    if (!evRes.ok) throw new Error(`creazione evento fallita: ${evRes.status} ${await evRes.text()}`);
    const evento = await evRes.json();

    // 3. registra su Supabase (service role: bypassa RLS e scrive google_event_id)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: row, error } = await supabase
      .from('prenotazioni_intervento')
      .insert({
        categoria: p.categoria,
        urgenza: p.urgenza,
        data_intervento: p.data,
        ora_intervento: p.ora,
        voci: p.voci,
        voci_custom: p.vociCustom,
        totale_stimato: p.totale,
        nome: p.nome ?? null,
        telefono: p.telefono ?? null,
        email: p.email ?? null,
        google_event_id: evento.id,
      })
      .select('id')
      .single();
    if (error) console.error('[crea-prenotazione] insert fallita:', error.message);

    // 4. conferme al cliente (best-effort; non bloccano la prenotazione)
    if (p.email) {
      await inviaEmailConferma({
        email: p.email,
        nome: p.nome ?? '',
        tipo,
        urgenza: p.urgenza,
        voci: p.voci,
        vociCustom: p.vociCustom,
        dataISO: p.data,
        ora: p.ora,
        totale: p.totale,
      });
    }
    if (p.telefono) {
      await inviaWhatsApp({
        telefono: p.telefono,
        nome: p.nome ?? 'Cliente',
        tipo,
        data: p.data.split('-').reverse().join('/'), // ISO → gg/mm/aaaa
        ora: p.ora,
      });
    }

    return jsonResponse({ ok: true, id: row?.id ?? null, eventId: evento.id });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
