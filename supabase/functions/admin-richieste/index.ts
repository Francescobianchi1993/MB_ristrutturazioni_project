/**
 * Mini-gestionale: elenca TUTTE le richieste in arrivo (sopralluoghi + interventi),
 * firma gli allegati e permette di segnare una richiesta come gestita.
 *
 * Protetta da password (secret `ADMIN_PASSWORD` su Supabase). La password viaggia
 * nel body, confrontata lato server col secret. Tutto via service role → i dati
 * restano privati e non leggibili con la sola anon key.
 *
 * Input (JSON): { password, azione, tipo?, id?, paths?, stato? }
 *   azione = 'lista' | 'firma' | 'segna' | 'annulla'
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAccessToken, getBusy } from '../_shared/google.ts';
import { SLOT_DURATA_MIN, SLOT_ORARI, TIME_ZONE, romeWallToUTC } from '../_shared/time.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { clientIp, confrontoSicuro, registraTentativo, tentativiRecenti } from '../_shared/ratelimit.ts';
import { EMAIL_PUBBLICA } from '../_shared/contatti.ts';
import { verifyPassword } from '../_shared/password.ts';

const BUCKET = 'sopralluogo-files';
// Validità dei link firmati agli allegati privati dei clienti. Prima era 1 anno:
// un link uscito dal dispositivo dell'admin (cronologia sincronizzata, screenshot)
// restava accessibile a terzi per mesi. 2 ore bastano a guardare i file nella
// sessione admin; per rivederli si rigenera il link riaprendo la richiesta.
const SCADENZA_SEC = 60 * 60 * 2;

/** Email al cliente quando è MB ad annullare l'appuntamento (best-effort).
 *  Se MB propone un nuovo orario, l'email lo include con un link che apre la
 *  riprenota già pre-compilata (il cliente conferma con un tap o sceglie altro). */
type EsitoEmail = 'inviata' | 'non_inviata' | 'non_configurata' | 'senza_email';

// deno-lint-ignore no-explicit-any
async function inviaEmailAnnullamentoCliente(row: any, propostaData?: string, propostaOra?: string): Promise<EsitoEmail> {
  const user = Deno.env.get('GMAIL_USER');
  const passRaw = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!user || !passRaw) {
    console.warn('[admin] secret email mancanti (GMAIL_USER/GMAIL_APP_PASSWORD): nessuna email di annullamento inviata');
    return 'non_configurata';
  }
  if (!row.email) return 'senza_email';
  const password = passRaw.replace(/\s/g, '');
  const base = Deno.env.get('SITE_URL') ?? 'https://mb-ristrutturazioni-project.vercel.app';
  const haProposta = !!(propostaData && propostaOra);
  const riprenotaUrl = `${base}/?gestisci=${encodeURIComponent(row.id)}&do=riprenota`
    + (haProposta ? `&data=${encodeURIComponent(propostaData!)}&ora=${encodeURIComponent(propostaOra!)}` : '');
  const quando = row.data_intervento
    ? `${String(row.data_intervento).split('-').reverse().join('/')}${row.ora_intervento ? ' alle ' + row.ora_intervento : ''}`
    : '';
  const propostaLeggibile = haProposta
    ? `${String(propostaData).split('-').reverse().join('/')} alle ${propostaOra}`
    : '';
  const righe = [
    'Appuntamento annullato — MB Ristrutturazioni',
    `Ciao ${row.nome || 'gentile cliente'},`,
    `abbiamo dovuto annullare l'appuntamento${quando ? ' del ' + quando : ''}. Ci scusiamo per il disagio.`,
  ];
  if (haProposta) {
    righe.push('', `Ti proponiamo un nuovo orario: ${propostaLeggibile}.`, `Per confermarlo (o sceglierne un altro): ${riprenotaUrl}`);
  } else {
    righe.push(`Puoi riprenotare quando vuoi da qui: ${riprenotaUrl}`);
  }
  righe.push('Oppure chiamaci o scrivici su WhatsApp al +39 339 126 8722.', 'MB Ristrutturazioni · Roma');
  const testo = righe.join('\n');
  const client = new SMTPClient({ connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: user, password } } });
  try {
    await client.send({
      from: `MB Ristrutturazioni <${user}>`,
      to: row.email,
      // Se il cliente risponde all'annullamento, deve arrivare a MB, non al
      // mittente SMTP tecnico.
      replyTo: EMAIL_PUBBLICA,
      subject: 'Appuntamento annullato — MB Ristrutturazioni',
      content: testo,
    });
    return 'inviata';
  } catch (e) {
    console.error('[admin] email annullamento fallita:', e instanceof Error ? e.message : String(e));
    return 'non_inviata';
  } finally {
    try { await client.close(); } catch { /* best-effort */ }
  }
}

// Promemoria dell'evento sul telefono di chi ha il calendario (1 giorno + 2 ore
// prima): è così che il gestionale "manda le notifiche" a chi lavora.
const REMINDERS = { useDefault: false, overrides: [{ method: 'popup', minutes: 24 * 60 }, { method: 'popup', minutes: 120 }] };

/** Valida data (ISO, non weekend) + ora (slot valido). Ritorna null se ok. */
function validaSlot(data: string, ora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return 'data_non_valida';
  if (!SLOT_ORARI.includes(ora)) return 'ora_non_valida';
  const [gy, gm, gd] = data.split('-').map(Number);
  const dow = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay(); // 0=dom, 6=sab
  if (dow === 0 || dow === 6) return 'giorno_non_valido';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { password, azione, tipo, id, paths, stato, propostaData, propostaOra } = body ?? {};

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    // Password: preferiamo l'HASH (app_config.admin_password_hash). Fallback al
    // plaintext legacy (app_config.admin_password o secret ADMIN_PASSWORD) finché
    // qualcuno non è ancora migrato.
    const { data: cfgHash } = await supabase.from('app_config').select('valore').eq('chiave', 'admin_password_hash').maybeSingle();
    const hash = cfgHash?.valore ?? null;
    let plain: string | null = null;
    if (!hash) {
      const { data: cfgPlain } = await supabase.from('app_config').select('valore').eq('chiave', 'admin_password').maybeSingle();
      plain = cfgPlain?.valore ?? Deno.env.get('ADMIN_PASSWORD') ?? null;
    }
    if (!hash && !plain) return jsonResponse({ error: 'non_configurato' }, 503);

    // Anti brute-force: max 10 tentativi ERRATI / 10 min per IP. I login corretti
    // non incrementano il contatore (nessun auto-lockout per la sessione admin).
    const ipKey = `admin-fail:${clientIp(req)}`;
    if (await tentativiRecenti(supabase, ipKey, 600) >= 10) {
      return jsonResponse({ error: 'troppi_tentativi' }, 429);
    }
    const okPw = hash
      ? await verifyPassword(String(password ?? ''), hash)
      : confrontoSicuro(String(password ?? ''), String(plain));
    if (!okPw) {
      await registraTentativo(supabase, ipKey, 600);
      return jsonResponse({ error: 'password_errata' }, 401);
    }

    if (azione === 'lista') {
      const { data: sopralluoghi } = await supabase
        .from('lead_sopralluogo')
        .select('id, created_at, nome, email, telefono, note, allegati, stato')
        .order('created_at', { ascending: false })
        .limit(500);
      // Estesa: indirizzo/cap/citta/fuori_zona e voci sono indispensabili per il
      // tecnico che va a domicilio (prima non venivano nemmeno letti).
      const { data: interventi } = await supabase
        .from('prenotazioni_intervento')
        .select('id, created_at, nome, email, telefono, categoria, urgenza, data_intervento, ora_intervento, totale_stimato, stato, indirizzo, cap, citta, fuori_zona, voci, voci_custom, google_event_id')
        .order('created_at', { ascending: false })
        .limit(500);
      // Preventivi condivisi: prima invisibili nel gestionale.
      const { data: preventivi } = await supabase
        .from('preventivi')
        .select('id, created_at, totale, totale_ivato, finitura, tempistica, mq, interventi, contatti, tipo_casa')
        .order('created_at', { ascending: false })
        .limit(500);
      // Attività CRM (download PDF ecc.) col contatto collegato, per la timeline
      // della Scheda Cliente.
      const { data: attivita } = await supabase
        .from('mb_attivita')
        .select('tipo, dettaglio, conteggio, created_at, ultima_volta, contatto:mb_contatti(email, nome, telefono)')
        .order('ultima_volta', { ascending: false })
        .limit(500);
      return jsonResponse({
        ok: true,
        sopralluoghi: sopralluoghi ?? [],
        interventi: interventi ?? [],
        preventivi: preventivi ?? [],
        attivita: attivita ?? [],
      });
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
      // Whitelist: prima 'segna' scriveva QUALSIASI stringa nello stato (e su id
      // inesistente passava in silenzio). Ora accettiamo solo il vocabolario
      // valido impostabile a mano; annullato/riprogrammato restano guidati dai
      // rispettivi flussi (annulla / self-service).
      const STATI_OK = ['nuovo', 'in_lavorazione', 'preventivo_inviato', 'chiuso', 'perso'];
      if (!id || !stato) return jsonResponse({ error: 'parametri_mancanti' }, 400);
      if (!STATI_OK.includes(String(stato))) return jsonResponse({ error: 'stato_non_valido' }, 400);
      const { data: upd, error: updErr } = await supabase
        .from(tabella).update({ stato }).eq('id', id).select('id');
      if (updErr) { console.error('[admin] segna fallita:', updErr.message); return jsonResponse({ error: 'update_fallita' }, 500); }
      if (!upd || upd.length === 0) return jsonResponse({ error: 'non_trovata' }, 404);
      return jsonResponse({ ok: true });
    }

    // Note interne / promemoria sul contatto (chiave = email normalizzata).
    if (azione === 'note_lista') {
      const email = String(body?.email ?? '').trim().toLowerCase();
      if (!email) return jsonResponse({ ok: true, note: [] });
      const { data } = await supabase
        .from('mb_note').select('id, testo, autore, fatto, created_at')
        .eq('email', email).order('created_at', { ascending: false });
      return jsonResponse({ ok: true, note: data ?? [] });
    }
    if (azione === 'nota_aggiungi') {
      const email = String(body?.email ?? '').trim().toLowerCase();
      const testo = String(body?.testo ?? '').trim().slice(0, 2000);
      if (!email || !testo) return jsonResponse({ error: 'parametri_mancanti' }, 400);
      const { data, error } = await supabase
        .from('mb_note').insert({ email, testo }).select('id, testo, autore, fatto, created_at').single();
      if (error) { console.error('[admin] nota_aggiungi fallita:', error.message); return jsonResponse({ error: 'insert_fallita' }, 500); }
      return jsonResponse({ ok: true, nota: data });
    }
    if (azione === 'nota_elimina') {
      if (!id) return jsonResponse({ error: 'parametri_mancanti' }, 400);
      await supabase.from('mb_note').delete().eq('id', id);
      return jsonResponse({ ok: true });
    }

    // Annulla un appuntamento intervento: cancella l'evento sul Google Calendar,
    // segna 'annullata' su DB e avvisa il cliente via email (con link riprenota).
    if (azione === 'annulla') {
      if (tipo !== 'intervento') return jsonResponse({ error: 'tipo_non_supportato' }, 400);
      if (!id) return jsonResponse({ error: 'parametri_mancanti' }, 400);
      const { data: row } = await supabase.from('prenotazioni_intervento').select('*').eq('id', id).single();
      if (!row) return jsonResponse({ error: 'non_trovata' }, 404);
      if (row.stato === 'annullata') return jsonResponse({ ok: true, stato: 'annullata' });

      // 1. Rimuovi l'evento dal calendario del tecnico PRIMA di dichiarare
      //    annullato. Se questo fallisce e procedessimo lo stesso, il cliente
      //    riceverebbe "annullato" ma il tecnico avrebbe ancora l'appuntamento in
      //    agenda → trasferta a vuoto. In quel caso ci fermiamo: l'admin ritenta.
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      if (calendarId && row.google_event_id) {
        try {
          const token = await getAccessToken();
          const del = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${row.google_event_id}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
          );
          // 204 = rimosso; 404/410 = già assente (va bene lo stesso).
          if (!del.ok && del.status !== 404 && del.status !== 410) {
            console.error('[admin] cancella evento Google: HTTP', del.status);
            return jsonResponse({ error: 'calendario_non_aggiornato' }, 502);
          }
        } catch (e) {
          console.error('[admin] cancella evento Google fallita:', e instanceof Error ? e.message : String(e));
          return jsonResponse({ error: 'calendario_non_aggiornato' }, 502);
        }
      }

      // 2. Solo ora segna annullata sul DB. Se questo fallisce non avvisiamo il
      //    cliente (l'evento è già rimosso: un ritento troverà 404 → ok → update).
      const { error: updErr } = await supabase
        .from('prenotazioni_intervento')
        .update({ stato: 'annullata' })
        .eq('id', id);
      if (updErr) {
        console.error('[admin] annulla update DB fallita:', updErr.message);
        return jsonResponse({ error: 'update_fallita' }, 500);
      }

      // 3. Evento rimosso e DB aggiornato: ora possiamo avvisare il cliente.
      const email = await inviaEmailAnnullamentoCliente(row, propostaData, propostaOra);
      return jsonResponse({ ok: true, stato: 'annullata', email });
    }

    // Crea un appuntamento a mano dal gestionale (non da prenotazione cliente):
    // evento sul Calendar (con indirizzo + promemoria) + riga prenotazioni_intervento.
    if (azione === 'crea_appuntamento') {
      const b = body ?? {};
      const nome = String(b.nome ?? '').trim().slice(0, 120);
      const telefono = String(b.telefono ?? '').trim().slice(0, 40);
      const email = String(b.email ?? '').trim().slice(0, 160);
      const indirizzo = String(b.indirizzo ?? '').trim().slice(0, 200);
      const cap = String(b.cap ?? '').trim().slice(0, 10);
      const citta = String(b.citta ?? '').trim().slice(0, 80);
      const categoria = b.categoria === 'elettr' ? 'elettr' : 'idro';
      const note = String(b.note ?? '').trim().slice(0, 1000);
      const data = String(b.data ?? '');
      const ora = String(b.ora ?? '');
      if (!nome && !telefono) return jsonResponse({ error: 'parametri_mancanti' }, 400);
      const errV = validaSlot(data, ora); if (errV) return jsonResponse({ error: errV }, 400);
      const start = romeWallToUTC(data, ora);
      if (start.getTime() < Date.now()) return jsonResponse({ error: 'passato' }, 409);
      const end = new Date(start.getTime() + SLOT_DURATA_MIN * 60_000);
      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      if (!calendarId) return jsonResponse({ error: 'calendario_non_configurato' }, 503);
      const token = await getAccessToken();
      const busy = await getBusy(token, calendarId, start.toISOString(), end.toISOString(), TIME_ZONE);
      if (busy.length > 0) return jsonResponse({ error: 'slot_occupato' }, 409);

      const tipo = categoria === 'idro' ? 'Idraulico' : 'Elettricista';
      const indirizzoCompleto = [indirizzo, [cap, citta].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      const descr = [
        'Appuntamento creato dal gestionale',
        `Tipo: ${tipo}`,
        nome ? `Cliente: ${nome}` : '',
        telefono ? `Telefono: ${telefono}` : '',
        email ? `Email: ${email}` : '',
        indirizzoCompleto ? `Indirizzo: ${indirizzoCompleto}` : '',
        note ? `\nNote: ${note}` : '',
      ].filter(Boolean).join('\n');
      const evRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: `Intervento MB — ${tipo}${nome ? ` (${nome})` : ''}`,
            description: descr,
            location: indirizzoCompleto || undefined,
            start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
            end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
            reminders: REMINDERS,
          }),
        },
      );
      if (!evRes.ok) { console.error('[admin] crea evento fallita: HTTP', evRes.status); return jsonResponse({ error: 'calendario_non_aggiornato' }, 502); }
      const evento = await evRes.json();

      const { data: row, error: insErr } = await supabase.from('prenotazioni_intervento').insert({
        categoria, urgenza: 'normale', data_intervento: data, ora_intervento: ora,
        voci: [], voci_custom: note ? [note] : [], totale_stimato: 0, stato: 'in_lavorazione',
        google_event_id: evento.id, nome: nome || null, telefono: telefono || null, email: email || null,
        indirizzo: indirizzo || null, cap: cap || null, citta: citta || null, fuori_zona: false,
      }).select('id').single();
      if (insErr || !row) {
        console.error('[admin] insert prenotazione manuale fallita:', insErr?.message);
        // Rollback dell'evento appena creato: niente evento orfano.
        try {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${evento.id}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        } catch { /* best-effort */ }
        return jsonResponse({ error: 'insert_fallita' }, 500);
      }
      return jsonResponse({ ok: true, id: row.id });
    }

    // Sposta un appuntamento esistente a nuova data/ora dal gestionale: aggiorna
    // l'evento Calendar e il DB (il telefono del tecnico si aggiorna da solo).
    if (azione === 'sposta') {
      if (tipo !== 'intervento' || !id) return jsonResponse({ error: 'parametri_mancanti' }, 400);
      const data = String(body?.data ?? '');
      const ora = String(body?.ora ?? '');
      const errV = validaSlot(data, ora); if (errV) return jsonResponse({ error: errV }, 400);
      const start = romeWallToUTC(data, ora);
      if (start.getTime() < Date.now()) return jsonResponse({ error: 'passato' }, 409);
      const end = new Date(start.getTime() + SLOT_DURATA_MIN * 60_000);
      const { data: row } = await supabase.from('prenotazioni_intervento').select('*').eq('id', id).single();
      if (!row) return jsonResponse({ error: 'non_trovata' }, 404);
      if (row.stato === 'annullata') return jsonResponse({ error: 'gia_annullata' }, 409);
      const noOp = row.data_intervento === data && row.ora_intervento === ora;

      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      if (calendarId) {
        const token = await getAccessToken();
        const busy = await getBusy(token, calendarId, start.toISOString(), end.toISOString(), TIME_ZONE);
        // Se lo slot risulta occupato ma NON stiamo spostando sullo stesso orario
        // (dove l'unico "busy" è l'evento stesso), è davvero preso.
        if (busy.length > 0 && !noOp) return jsonResponse({ error: 'slot_occupato' }, 409);
        if (row.google_event_id) {
          const patch = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${row.google_event_id}`,
            {
              method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                start: { dateTime: start.toISOString(), timeZone: TIME_ZONE },
                end: { dateTime: end.toISOString(), timeZone: TIME_ZONE },
                reminders: REMINDERS,
              }),
            },
          );
          if (!patch.ok && patch.status !== 404 && patch.status !== 410) {
            console.error('[admin] sposta evento Google: HTTP', patch.status);
            return jsonResponse({ error: 'calendario_non_aggiornato' }, 502);
          }
        }
      }
      const { error: updErr } = await supabase
        .from('prenotazioni_intervento').update({ data_intervento: data, ora_intervento: ora }).eq('id', id);
      if (updErr) { console.error('[admin] sposta update fallita:', updErr.message); return jsonResponse({ error: 'update_fallita' }, 500); }
      return jsonResponse({ ok: true, data, ora });
    }

    return jsonResponse({ error: 'azione_sconosciuta' }, 400);
  } catch (e) {
    // Non rimandiamo il messaggio grezzo al client (può rivelare dettagli interni).
    console.error('[admin-richieste] errore:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'errore_interno' }, 500);
  }
});
