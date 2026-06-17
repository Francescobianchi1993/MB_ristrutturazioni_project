/**
 * Gestione self-service di una prenotazione da parte del cliente.
 *
 * Il cliente arriva qui dai pulsanti nella mail di conferma, che portano
 * l'id della prenotazione (UUID non indovinabile = "token" di gestione).
 *
 * Input (JSON): { azione, id, data?, ora? }
 *   azione = 'dettagli' | 'annulla' | 'sposta'
 * Output:
 *   dettagli → { ok, tipo, data, ora, stato }
 *   annulla  → { ok, stato: 'annullata' }
 *   sposta   → { ok, data, ora } | { error: 'slot_occupato' } (409)
 *
 * Usa il service role (bypassa RLS): la tabella resta non leggibile da anon.
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAccessToken, getBusy } from '../_shared/google.ts';
import { SLOT_DURATA_MIN, TIME_ZONE, romeWallToUTC } from '../_shared/time.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Body {
  azione: 'dettagli' | 'annulla' | 'sposta';
  id: string;
  data?: string;
  ora?: string;
}

function tipoLabel(categoria: string): string {
  return categoria === 'idro' ? 'Idraulico' : 'Elettricista';
}

/** Cancella un evento dal Google Calendar società (best-effort, non blocca). */
async function cancellaEvento(token: string, calendarId: string, eventId: string): Promise<void> {
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    // best-effort: se fallisce l'owner può cancellarlo a mano
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { azione, id, data, ora } = (await req.json()) as Body;
    if (!azione || !id) return jsonResponse({ error: 'parametri_mancanti' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: row, error } = await supabase
      .from('prenotazioni_intervento')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !row) return jsonResponse({ error: 'non_trovata' }, 404);

    // ── dettagli: info minime per la pagina di gestione ──────────────────────
    if (azione === 'dettagli') {
      return jsonResponse({
        ok: true,
        tipo: tipoLabel(row.categoria),
        data: row.data_intervento,
        ora: row.ora_intervento,
        stato: row.stato,
      });
    }

    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID mancante');
    const token = await getAccessToken();

    // ── annulla ──────────────────────────────────────────────────────────────
    if (azione === 'annulla') {
      if (row.stato === 'annullata') return jsonResponse({ ok: true, stato: 'annullata' });
      if (row.google_event_id) await cancellaEvento(token, calendarId, row.google_event_id);
      await supabase.from('prenotazioni_intervento').update({ stato: 'annullata' }).eq('id', id);
      return jsonResponse({ ok: true, stato: 'annullata' });
    }

    // ── sposta ─────────────────────────────────────────────────────────────-─
    if (azione === 'sposta') {
      if (!data || !ora) return jsonResponse({ error: 'data_ora_mancante' }, 400);
      if (row.stato === 'annullata') return jsonResponse({ error: 'gia_annullata' }, 409);

      const start = romeWallToUTC(data, ora);
      const end = new Date(start.getTime() + SLOT_DURATA_MIN * 60_000);

      // lo slot nuovo deve essere libero (l'evento attuale è su un altro orario)
      const busy = await getBusy(token, calendarId, start.toISOString(), end.toISOString(), TIME_ZONE);
      if (busy.length > 0) return jsonResponse({ error: 'slot_occupato' }, 409);

      const tipo = tipoLabel(row.categoria);
      const summary = `Intervento MB — ${tipo}${row.nome ? ` (${row.nome})` : ''}`;
      const descr = [
        'Appuntamento riprogrammato dal cliente.',
        `Tipo: ${tipo}`,
        row.nome ? `Cliente: ${row.nome}` : '',
        row.telefono ? `Telefono: ${row.telefono}` : '',
        row.email ? `Email: ${row.email}` : '',
      ].filter(Boolean).join('\n');

      // 1. crea il nuovo evento
      const evRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary,
            description: descr,
            start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
            end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
          }),
        },
      );
      if (!evRes.ok) throw new Error(`creazione evento fallita: ${evRes.status} ${await evRes.text()}`);
      const evento = await evRes.json();

      // 2. cancella il vecchio evento
      if (row.google_event_id) await cancellaEvento(token, calendarId, row.google_event_id);

      // 3. aggiorna la riga
      await supabase
        .from('prenotazioni_intervento')
        .update({
          data_intervento: data,
          ora_intervento: ora,
          google_event_id: evento.id,
          stato: 'spostata',
        })
        .eq('id', id);

      return jsonResponse({ ok: true, data, ora });
    }

    return jsonResponse({ error: 'azione_sconosciuta' }, 400);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
