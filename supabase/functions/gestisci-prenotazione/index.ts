/**
 * Gestione self-service di una prenotazione da parte del cliente.
 *
 * Il cliente arriva dai pulsanti nella mail di conferma (portano l'id = UUID
 * non indovinabile, fa da "token").
 *
 * Input (JSON): { azione, id, data?, ora? }
 *   azione = 'dettagli' | 'annulla' | 'sposta' | 'riprenota'
 * Output:
 *   dettagli  → { ok, tipo, data, ora, stato, passato }
 *   annulla   → { ok, stato: 'annullata' }
 *   sposta    → { ok, data, ora } | { error } (409)
 *   riprenota → { ok, id, data, ora } | { error } (409)   (crea una NUOVA prenotazione clone)
 *
 * Usa il service role (bypassa RLS): la tabella resta non leggibile da anon.
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAccessToken, getBusy } from '../_shared/google.ts';
import { SLOT_DURATA_MIN, SLOT_ORARI, TIME_ZONE, romeWallToUTC } from '../_shared/time.ts';
import { inviaEmailConferma } from '../_shared/email.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Body {
  azione: 'dettagli' | 'annulla' | 'sposta' | 'riprenota';
  id: string;
  data?: string;
  ora?: string;
}

function tipoLabel(categoria: string): string {
  return categoria === 'idro' ? 'Idraulico' : 'Elettricista';
}

/** Valida data (ISO) + ora (slot ammesso). Ritorna un codice errore o null.
 *  Necessario prima di romeWallToUTC: un'ora fuori range (es. '24:00') verrebbe
 *  normalizzata facendo scivolare il giorno e aggirando il blocco weekend.
 *  Coerente con la validazione di crea-prenotazione. */
function validaDataOra(data: string, ora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return 'data_non_valida';
  if (!SLOT_ORARI.includes(ora)) return 'ora_non_valida';
  return null;
}

/** Sabato/domenica non sono prenotabili: si lavora solo lun–ven. */
function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=dom, 6=sab
  return dow === 0 || dow === 6;
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

/** Cancella un evento dal Google Calendar (best-effort, non blocca). */
async function cancellaEvento(token: string, calendarId: string, eventId: string): Promise<void> {
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    // best-effort
  }
}

/** Crea un evento sul Google Calendar e ritorna il suo id. */
async function creaEvento(
  token: string,
  calendarId: string,
  summary: string,
  descr: string,
  start: Date,
  end: Date,
): Promise<string> {
  const res = await fetch(
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
  if (!res.ok) throw new Error(`creazione evento fallita: ${res.status} ${await res.text()}`);
  const ev = await res.json();
  return ev.id as string;
}

// deno-lint-ignore no-explicit-any
function buildDatiEmail(row: any, id: string, dataISO: string, ora: string) {
  return {
    email: row.email as string,
    nome: (row.nome ?? '') as string,
    tipo: tipoLabel(row.categoria),
    urgenza: row.urgenza as string,
    voci: (row.voci ?? []) as { voce: string; prezzo: number }[],
    vociCustom: (row.voci_custom ?? []) as string[],
    dataISO,
    ora,
    totale: Number(row.totale_stimato ?? 0),
    id,
  };
}

// deno-lint-ignore no-explicit-any
function descrizione(row: any, tipo: string, riprogrammato: boolean): string {
  return [
    riprogrammato ? 'Appuntamento riprogrammato dal cliente.' : 'Prenotazione dal sito MB Ristrutturazioni.',
    `Tipo: ${tipo}`,
    row.nome ? `Cliente: ${row.nome}` : '',
    row.telefono ? `Telefono: ${row.telefono}` : '',
    row.email ? `Email: ${row.email}` : '',
  ].filter(Boolean).join('\n');
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

    const startAttuale = row.data_intervento && row.ora_intervento
      ? romeWallToUTC(row.data_intervento, row.ora_intervento)
      : null;
    const passato = startAttuale ? startAttuale.getTime() < Date.now() : false;

    // ── dettagli ─────────────────────────────────────────────────────────────
    if (azione === 'dettagli') {
      return jsonResponse({
        ok: true,
        tipo: tipoLabel(row.categoria),
        data: row.data_intervento,
        ora: row.ora_intervento,
        stato: row.stato,
        passato,
      });
    }

    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID mancante');
    const token = await getAccessToken();
    const tipo = tipoLabel(row.categoria);
    const summary = `Intervento MB — ${tipo}${row.nome ? ` (${row.nome})` : ''}`;

    // ── annulla ──────────────────────────────────────────────────────────────
    if (azione === 'annulla') {
      if (row.stato === 'annullata') return jsonResponse({ ok: true, stato: 'annullata' });
      // Aggiorniamo prima il DB e solo dopo cancelliamo l'evento (best-effort):
      // se l'UPDATE fallisce non diciamo "ok" con la riga ancora attiva.
      const { error: updErr } = await supabase
        .from('prenotazioni_intervento')
        .update({ stato: 'annullata' })
        .eq('id', id);
      if (updErr) {
        console.error('[gestisci] annulla update fallita:', updErr.message);
        return jsonResponse({ error: 'annulla_fallita' }, 500);
      }
      if (row.google_event_id) await cancellaEvento(token, calendarId, row.google_event_id);
      return jsonResponse({ ok: true, stato: 'annullata' });
    }

    // ── sposta ─────────────────────────────────────────────────────────────--
    if (azione === 'sposta') {
      if (!data || !ora) return jsonResponse({ error: 'data_ora_mancante' }, 400);
      { const err = validaDataOra(data, ora); if (err) return jsonResponse({ error: err }, 400); }
      if (isWeekend(data)) return jsonResponse({ error: 'giorno_non_valido' }, 400);
      if (row.stato === 'annullata') return jsonResponse({ error: 'gia_annullata' }, 409);
      if (passato) return jsonResponse({ error: 'passato' }, 409);
      if (data === row.data_intervento && ora === row.ora_intervento) {
        return jsonResponse({ error: 'stesso_orario' }, 409);
      }

      // Controllo "un appuntamento a settimana" anche sullo spostamento: evita di
      // spostare nella settimana dove il cliente ha già un altro appuntamento attivo
      // (esclude quello corrente). Coerente col flusso riprenota/crea-prenotazione.
      {
        const emailLc = (row.email ?? '').trim().toLowerCase();
        const telN = normTel(row.telefono);
        if (emailLc || telN) {
          const { from, to } = settimanaISO(data);
          const { data: rows } = await supabase
            .from('prenotazioni_intervento')
            .select('id, email, telefono, stato')
            .gte('data_intervento', from)
            .lte('data_intervento', to)
            .neq('stato', 'annullata');
          const conflitto = (rows ?? []).some((r) =>
            r.id !== id &&
            ((emailLc && (r.email ?? '').trim().toLowerCase() === emailLc) ||
              (telN && normTel(r.telefono) === telN))
          );
          if (conflitto) return jsonResponse({ error: 'conflitto_settimana' }, 409);
        }
      }

      const start = romeWallToUTC(data, ora);
      if (start.getTime() < Date.now()) return jsonResponse({ error: 'passato' }, 409);
      const end = new Date(start.getTime() + SLOT_DURATA_MIN * 60_000);
      const busy = await getBusy(token, calendarId, start.toISOString(), end.toISOString(), TIME_ZONE);
      if (busy.length > 0) return jsonResponse({ error: 'slot_occupato' }, 409);

      const newEventId = await creaEvento(token, calendarId, summary, descrizione(row, tipo, true), start, end);
      // Aggiorniamo il DB PRIMA di cancellare il vecchio evento: se l'UPDATE
      // fallisce annulliamo il nuovo evento e lasciamo intatti riga + vecchio
      // evento (niente evento orfano né conferma "fantasma"). Coerente con riprenota.
      const { error: updErr } = await supabase
        .from('prenotazioni_intervento')
        .update({ data_intervento: data, ora_intervento: ora, google_event_id: newEventId, stato: 'spostata' })
        .eq('id', id);
      if (updErr) {
        console.error('[gestisci] sposta update fallita:', updErr.message);
        await cancellaEvento(token, calendarId, newEventId);
        // 23505 = slot occupato da un'altra prenotazione tra il check e l'update (race).
        if (updErr.code === '23505') return jsonResponse({ error: 'slot_occupato' }, 409);
        return jsonResponse({ error: 'update_fallita' }, 500);
      }
      if (row.google_event_id) await cancellaEvento(token, calendarId, row.google_event_id);

      if (row.email) await inviaEmailConferma(buildDatiEmail(row, id, data, ora));
      return jsonResponse({ ok: true, data, ora });
    }

    // ── riprenota: crea una NUOVA prenotazione clone (stesso intervento) ──────
    if (azione === 'riprenota') {
      if (!data || !ora) return jsonResponse({ error: 'data_ora_mancante' }, 400);
      { const err = validaDataOra(data, ora); if (err) return jsonResponse({ error: err }, 400); }
      if (isWeekend(data)) return jsonResponse({ error: 'giorno_non_valido' }, 400);

      // Controllo "un appuntamento a settimana": come nel flusso di prenotazione,
      // blocca se il cliente ha già un appuntamento ATTIVO nella stessa settimana
      // ISO (escluso quello di partenza, che di solito è annullato/passato).
      const emailLc = (row.email ?? '').trim().toLowerCase();
      const telN = normTel(row.telefono);
      if (emailLc || telN) {
        const { from, to } = settimanaISO(data);
        const { data: rows } = await supabase
          .from('prenotazioni_intervento')
          .select('id, email, telefono, stato')
          .gte('data_intervento', from)
          .lte('data_intervento', to)
          .neq('stato', 'annullata');
        const conflitto = (rows ?? []).some((r) =>
          r.id !== id &&
          ((emailLc && (r.email ?? '').trim().toLowerCase() === emailLc) ||
            (telN && normTel(r.telefono) === telN))
        );
        if (conflitto) return jsonResponse({ error: 'conflitto_settimana' }, 409);
      }

      const start = romeWallToUTC(data, ora);
      if (start.getTime() < Date.now()) return jsonResponse({ error: 'passato' }, 409);
      const end = new Date(start.getTime() + SLOT_DURATA_MIN * 60_000);
      const busy = await getBusy(token, calendarId, start.toISOString(), end.toISOString(), TIME_ZONE);
      if (busy.length > 0) return jsonResponse({ error: 'slot_occupato' }, 409);

      const newEventId = await creaEvento(token, calendarId, summary, descrizione(row, tipo, false), start, end);
      const { data: newRow, error: insErr } = await supabase
        .from('prenotazioni_intervento')
        .insert({
          categoria: row.categoria,
          urgenza: row.urgenza,
          data_intervento: data,
          ora_intervento: ora,
          voci: row.voci,
          voci_custom: row.voci_custom,
          totale_stimato: row.totale_stimato,
          nome: row.nome,
          telefono: row.telefono,
          email: row.email,
          indirizzo: row.indirizzo,
          cap: row.cap,
          citta: row.citta,
          fuori_zona: row.fuori_zona,
          google_event_id: newEventId,
        })
        .select('id')
        .single();
      // Se il salvataggio su DB fallisce NON confermiamo: cancelliamo l'evento
      // appena creato (niente evento orfano sul calendario) e segnaliamo l'errore.
      if (insErr || !newRow) {
        console.error('[gestisci] riprenota insert fallita:', insErr?.message);
        await cancellaEvento(token, calendarId, newEventId);
        // 23505 = slot occupato da un'altra prenotazione tra il check e l'insert (race).
        if (insErr?.code === '23505') return jsonResponse({ error: 'slot_occupato' }, 409);
        return jsonResponse({ error: 'insert_fallita' }, 500);
      }

      const newId = newRow.id;
      // Se la prenotazione di origine è ancora ATTIVA (non annullata e non
      // passata), la annulliamo ora che il clone è salvato: evita il doppione
      // (due appuntamenti attivi). Il controllo "un appuntamento a settimana"
      // esclude l'origine per id, quindi senza questo passaggio resterebbero
      // entrambi. Se era già annullata/passata non tocchiamo nulla.
      if (row.stato !== 'annullata' && !passato) {
        if (row.google_event_id) await cancellaEvento(token, calendarId, row.google_event_id);
        await supabase.from('prenotazioni_intervento').update({ stato: 'annullata' }).eq('id', id);
      }
      if (row.email) await inviaEmailConferma(buildDatiEmail(row, newId, data, ora));
      return jsonResponse({ ok: true, id: newId, data, ora });
    }

    return jsonResponse({ error: 'azione_sconosciuta' }, 400);
  } catch (e) {
    console.error('[gestisci-prenotazione] errore non gestito:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'errore_interno' }, 500);
  }
});
