/**
 * Crea una prenotazione intervento.
 *
 * 1. verifica anti doppia-prenotazione (free/busy sullo slot esatto)
 * 2. controllo "doppio appuntamento nella stessa settimana" per lo stesso
 *    cliente (email O telefono): se ne esiste già uno attivo nella settimana
 *    e il client non ha confermato, risponde { conflitto, esistente } senza
 *    creare nulla → il sito mostra il pop-up sostituisci/mantieni.
 * 3. crea l'evento sul Google Calendar della società
 * 4. salva la riga su Supabase (service role) con il google_event_id
 * 5. se è una sostituzione (confermaSettimana + annullaId), annulla il
 *    precedente DOPO aver creato il nuovo (così non si perde nulla se lo slot
 *    è occupato).
 *
 * Output: { ok, id, eventId } | { error: 'slot_occupato' } (409)
 *        | { conflitto: true, esistente: { id, tipo, data, ora } }
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
  indirizzo?: string;
  cap?: string;
  citta?: string;
  fuoriZona?: boolean;
  confermaSettimana?: boolean; // true = il cliente ha accettato il doppio appuntamento (sostituzione)
  annullaId?: string; // id del precedente da annullare in caso di sostituzione
}

/** Lunedì–domenica (ISO) che contengono la data. */
function settimanaISO(dateStr: string): { from: string; to: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = lunedì
  const monday = new Date(dt.getTime() - dow * 86_400_000);
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { from: iso(monday), to: iso(sunday) };
}

/** Normalizza un numero IT in forma confrontabile (toglie il prefisso 39/0039). */
function normTel(t?: string | null): string {
  let n = (t ?? '').replace(/\D/g, '');
  if (n.startsWith('0039')) n = n.slice(4);
  if (n.length > 10 && n.startsWith('39')) n = n.slice(2);
  return n;
}

function tipoLabel(categoria: string): string {
  return categoria === 'idro' ? 'Idraulico' : 'Elettricista';
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
  const indirizzoCompleto = [p.indirizzo, [p.cap, p.citta].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  if (indirizzoCompleto) {
    righe.push(`Indirizzo: ${indirizzoCompleto}${p.fuoriZona ? ' ⚠️ FUORI ZONA — da valutare' : ''}`);
  }
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. anti doppia-prenotazione: lo slot deve essere ancora libero
    const busy = await getBusy(token, calendarId, start.toISOString(), end.toISOString(), TIME_ZONE);
    if (busy.length > 0) return jsonResponse({ error: 'slot_occupato' }, 409);

    // 2. controllo doppio appuntamento nella stessa settimana (solo prima conferma)
    if (!p.confermaSettimana && (p.email || p.telefono)) {
      const { from, to } = settimanaISO(p.data);
      const { data: rows } = await supabase
        .from('prenotazioni_intervento')
        .select('id, categoria, data_intervento, ora_intervento, email, telefono, stato')
        .gte('data_intervento', from)
        .lte('data_intervento', to)
        .neq('stato', 'annullata');
      const emailLc = (p.email ?? '').trim().toLowerCase();
      const telN = normTel(p.telefono);
      const match = (rows ?? []).find((r) =>
        (emailLc && (r.email ?? '').trim().toLowerCase() === emailLc) ||
        (telN && normTel(r.telefono) === telN)
      );
      if (match) {
        return jsonResponse({
          conflitto: true,
          esistente: {
            id: match.id,
            tipo: tipoLabel(match.categoria),
            data: match.data_intervento,
            ora: match.ora_intervento,
          },
        });
      }
    }

    // 3. crea l'evento sul calendario società
    const tipo = tipoLabel(p.categoria);
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

    // 4. registra su Supabase (service role: bypassa RLS e scrive google_event_id)
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
        indirizzo: p.indirizzo ?? null,
        cap: p.cap ?? null,
        citta: p.citta ?? null,
        fuori_zona: p.fuoriZona ?? false,
        google_event_id: evento.id,
      })
      .select('id')
      .single();
    if (error) console.error('[crea-prenotazione] insert fallita:', error.message);

    // 5. sostituzione: annulla il precedente DOPO aver creato il nuovo
    if (p.confermaSettimana && p.annullaId) {
      const { data: prev } = await supabase
        .from('prenotazioni_intervento')
        .select('google_event_id, stato')
        .eq('id', p.annullaId)
        .single();
      if (prev && prev.stato !== 'annullata') {
        if (prev.google_event_id) {
          try {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${prev.google_event_id}`,
              { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
            );
          } catch {
            // best-effort
          }
        }
        await supabase.from('prenotazioni_intervento').update({ stato: 'annullata' }).eq('id', p.annullaId);
      }
    }

    // 6. conferme al cliente (best-effort; non bloccano la prenotazione)
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
        id: row?.id ?? undefined,
      });
    }
    if (p.telefono) {
      await inviaWhatsApp({
        telefono: p.telefono,
        nome: p.nome ?? 'Cliente',
        tipo: `Intervento ${tipo.toLowerCase()}`,
        data: p.data.split('-').reverse().join('/'),
        ora: p.ora,
      });
    }

    return jsonResponse({ ok: true, id: row?.id ?? null, eventId: evento.id });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
