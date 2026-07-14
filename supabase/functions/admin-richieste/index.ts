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
import { getAccessToken } from '../_shared/google.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { clientIp, confrontoSicuro, registraTentativo, tentativiRecenti } from '../_shared/ratelimit.ts';
import { EMAIL_PUBBLICA } from '../_shared/contatti.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { password, azione, tipo, id, paths, stato, propostaData, propostaOra } = body ?? {};

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: cfg } = await supabase.from('app_config').select('valore').eq('chiave', 'admin_password').single();
    const pw = cfg?.valore ?? Deno.env.get('ADMIN_PASSWORD');
    if (!pw) return jsonResponse({ error: 'non_configurato' }, 503);

    // Anti brute-force: max 10 tentativi ERRATI / 10 min per IP. I login corretti
    // non incrementano il contatore (nessun auto-lockout per la sessione admin).
    const ipKey = `admin-fail:${clientIp(req)}`;
    if (await tentativiRecenti(supabase, ipKey, 600) >= 10) {
      return jsonResponse({ error: 'troppi_tentativi' }, 429);
    }
    if (!confrontoSicuro(String(password ?? ''), String(pw))) {
      await registraTentativo(supabase, ipKey, 600);
      return jsonResponse({ error: 'password_errata' }, 401);
    }

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

    // Annulla un appuntamento intervento: cancella l'evento sul Google Calendar,
    // segna 'annullata' su DB e avvisa il cliente via email (con link riprenota).
    if (azione === 'annulla') {
      if (tipo !== 'intervento') return jsonResponse({ error: 'tipo_non_supportato' }, 400);
      if (!id) return jsonResponse({ error: 'parametri_mancanti' }, 400);
      const { data: row } = await supabase.from('prenotazioni_intervento').select('*').eq('id', id).single();
      if (!row) return jsonResponse({ error: 'non_trovata' }, 404);
      if (row.stato === 'annullata') return jsonResponse({ ok: true, stato: 'annullata' });

      const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
      if (calendarId && row.google_event_id) {
        try {
          const token = await getAccessToken();
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${row.google_event_id}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (e) {
          console.error('[admin] cancella evento Google fallita:', e instanceof Error ? e.message : String(e));
        }
      }
      await supabase.from('prenotazioni_intervento').update({ stato: 'annullata' }).eq('id', id);
      const email = await inviaEmailAnnullamentoCliente(row, propostaData, propostaOra);
      return jsonResponse({ ok: true, stato: 'annullata', email });
    }

    return jsonResponse({ error: 'azione_sconosciuta' }, 400);
  } catch (e) {
    // Non rimandiamo il messaggio grezzo al client (può rivelare dettagli interni).
    console.error('[admin-richieste] errore:', e instanceof Error ? e.message : String(e));
    return jsonResponse({ error: 'errore_interno' }, 500);
  }
});
