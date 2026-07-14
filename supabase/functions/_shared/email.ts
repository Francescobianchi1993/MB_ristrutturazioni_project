/**
 * Invio email di conferma al cliente via Gmail SMTP (account società).
 *
 * Best-effort: senza secret esce in silenzio (la prenotazione resta valida).
 * Si attiva impostando:
 *   GMAIL_USER          — indirizzo Gmail MITTENTE (utenza SMTP autenticata; non è
 *                         la casella che MB legge — quella è EMAIL_PUBBLICA)
 *   GMAIL_APP_PASSWORD  — "Password per le app" Gmail (16 char, no password normale)
 *
 * L'email parte DALLA Gmail società: il cliente vede MB come mittente e le
 * risposte tornano lì. Tutto il contenuto è qui, nessun template esterno.
 */
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { romeWallToUTC, SLOT_DURATA_MIN } from './time.ts';
import { EMAIL_PUBBLICA } from './contatti.ts';

export interface DatiEmail {
  email: string;
  nome: string;
  tipo: string;
  urgenza: string;
  voci: { voce: string; prezzo: number }[];
  vociCustom: string[];
  dataISO: string;
  ora: string;
  totale: number;
  id?: string; // id prenotazione → link self-service "sposta/annulla"
}

function dataLeggibile(iso: string): string {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return new Intl.DateTimeFormat('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Europe/Rome',
    }).format(d);
  } catch {
    return iso.split('-').reverse().join('/');
  }
}

/** Titolo dell'evento calendario, generico (vale per intervento o sopralluogo). */
function titoloEvento(d: DatiEmail): string {
  return `Appuntamento MB Ristrutturazioni — ${d.tipo}`;
}

const DESCRIZIONE_EVENTO =
  'Appuntamento con MB Ristrutturazioni. Ti ricontattiamo a breve per i dettagli.';

/** Formatta una data in UTC compatto per calendari: YYYYMMDDTHHMMSSZ. */
function fmtCalUTC(dt: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}` +
    `T${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}${p(dt.getUTCSeconds())}Z`
  );
}

/** Inizio/fine dell'appuntamento (slot da 1h) come istanti UTC. */
function intervalloEvento(d: DatiEmail): { start: Date; end: Date } {
  const start = romeWallToUTC(d.dataISO, d.ora);
  const end = new Date(start.getTime() + SLOT_DURATA_MIN * 60_000);
  return { start, end };
}

/** Numero WhatsApp aziendale in formato internazionale per i link wa.me (339 126 8722). */
const WHATSAPP_NUMERO = '393391268722';

/**
 * Link alla pagina di gestione self-service (sposta/annulla) sul sito.
 * `do` pre-seleziona l'azione. Base URL da env SITE_URL (default = prod Vercel).
 */
function buildManageUrl(d: DatiEmail, azione: 'sposta' | 'annulla'): string | null {
  if (!d.id) return null;
  const base = Deno.env.get('SITE_URL') ?? 'https://mb-ristrutturazioni-project.vercel.app';
  return `${base}/?gestisci=${encodeURIComponent(d.id)}&do=${azione}`;
}

/**
 * Link "click-to-chat": apre il WhatsApp del CLIENTE con un messaggio già
 * precompilato verso il 339. Nessuna API Meta: è il cliente che invia, quindi
 * gratis, numero intatto sul telefono, nessun limite.
 */
function buildWhatsAppUrl(d: DatiEmail): string {
  const quando = dataLeggibile(d.dataISO);
  const testo =
    `Salve! Vorrei essere ricontattato riguardo al mio appuntamento del ${quando} alle ${d.ora}. Grazie!`;
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(testo)}`;
}

/**
 * Tasto "Apple": link a un endpoint pubblico che genera l'.ics al volo dai
 * parametri (titolo/data/ora). Su iPhone aprire il link apre l'app Calendario.
 */
function buildAppleIcsUrl(d: DatiEmail): string {
  const base = 'https://pwidhcxyyldtlagjpjkn.supabase.co/functions/v1/ics';
  const params = new URLSearchParams({ s: titoloEvento(d), d: d.dataISO, o: d.ora });
  return `${base}?${params.toString()}`;
}

/** Link "Aggiungi a Google Calendar" (apre il calendario del cliente). */
function buildGoogleCalUrl(d: DatiEmail): string {
  const { start, end } = intervalloEvento(d);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titoloEvento(d),
    dates: `${fmtCalUTC(start)}/${fmtCalUTC(end)}`,
    details: DESCRIZIONE_EVENTO,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Data ISO 8601 in UTC senza millisecondi (per i deeplink Outlook/Office365). */
function fmtISO(dt: Date): string {
  return dt.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Link "Aggiungi a Outlook/Office365" (host diverso: personale vs lavoro). */
function buildOutlookUrl(d: DatiEmail, host: string): string {
  const { start, end } = intervalloEvento(d);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: titoloEvento(d),
    startdt: fmtISO(start),
    enddt: fmtISO(end),
    body: DESCRIZIONE_EVENTO,
  });
  return `https://${host}/calendar/0/deeplink/compose?${params.toString()}`;
}

/** File .ics da allegare (silenzioso): unica via per Apple/iCloud, niente link web. */
function buildIcs(d: DatiEmail): string {
  const { start, end } = intervalloEvento(d);
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const uid = `${start.getTime()}-${d.email.replace(/[^a-z0-9]/gi, '')}@mb-ristrutturazioni`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MB Ristrutturazioni//Prenotazioni//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmtCalUTC(new Date())}`,
    `DTSTART:${fmtCalUTC(start)}`,
    `DTEND:${fmtCalUTC(end)}`,
    `SUMMARY:${esc(titoloEvento(d))}`,
    `DESCRIPTION:${esc(DESCRIZIONE_EVENTO)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function corpoHtml(d: DatiEmail): string {
  const quando = dataLeggibile(d.dataISO);
  const gcal = buildGoogleCalUrl(d);
  const outlook = buildOutlookUrl(d, 'outlook.live.com');
  const apple = buildAppleIcsUrl(d);
  const whatsapp = buildWhatsAppUrl(d);
  const tel = `tel:+${WHATSAPP_NUMERO}`;
  const spostaUrl = buildManageUrl(d, 'sposta');
  const annullaUrl = buildManageUrl(d, 'annulla');
  const bloccoGestione = spostaUrl && annullaUrl
    ? `<div style="margin:20px 0;text-align:center;border-top:1px solid #eee;padding-top:16px">
      <p style="color:#444;margin:0 0 10px;font-weight:bold">Hai un imprevisto?</p>
      <a href="${spostaUrl}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:10px;margin:4px">📅 Sposta appuntamento</a>
      <a href="${annullaUrl}" style="display:inline-block;background:#ffffff;color:#C0392B;border:2px solid #C0392B;text-decoration:none;font-weight:bold;padding:8px 18px;border-radius:10px;margin:4px">❌ Annulla appuntamento</a>
    </div>`
    : '';
  const righeVoci = d.voci
    .map((v) => `<tr><td style="padding:2px 0;color:#444">${v.voce}</td><td style="padding:2px 0;text-align:right;color:#666">€ ${v.prezzo}</td></tr>`)
    .join('');
  const righeCustom = d.vociCustom
    .map((c) => `<tr><td style="padding:2px 0;color:#444">${c}</td><td style="padding:2px 0;text-align:right;color:#999">da definire</td></tr>`)
    .join('');
  const bloccoVoci = d.voci.length || d.vociCustom.length
    ? `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px">${righeVoci}${righeCustom}</table>`
    : '';

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1A1A1A">
  <div style="background:#1A1A1A;padding:20px 24px;border-radius:16px 16px 0 0">
    <span style="color:#F5B800;font-size:20px;font-weight:bold">MB Ristrutturazioni</span>
  </div>
  <div style="border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;padding:24px">
    <h2 style="margin:0 0 8px">Prenotazione confermata ✅</h2>
    <p style="color:#444">Ciao ${d.nome || 'gentile cliente'}, abbiamo registrato la tua richiesta di intervento <strong>${d.tipo}</strong>.</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:4px 16px 4px 0;color:#888">Quando</td><td style="text-transform:capitalize"><strong>${quando}</strong> alle <strong>${d.ora}</strong></td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#888">Urgenza</td><td>${d.urgenza === 'alta' ? 'Alta (prioritario)' : 'Normale'}</td></tr>
    </table>
    ${bloccoVoci}
    <div style="border-top:1px solid #eee;padding-top:12px;display:flex;justify-content:space-between">
      <span style="color:#888">Totale stimato</span>
      <strong style="color:#F5B800;font-size:18px">€ ${d.totale.toFixed(2)}</strong>
    </div>
    <div style="margin:20px 0;text-align:center">
      <p style="color:#444;margin:0 0 10px;font-weight:bold">📅 Aggiungi al calendario</p>
      <a href="${gcal}" style="display:inline-block;background:#F5B800;color:#1A1A1A;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:10px;margin:4px">Google</a>
      <a href="${outlook}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:10px;margin:4px">Outlook</a>
      <a href="${apple}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:10px;margin:4px">Apple</a>
    </div>
    <div style="margin:20px 0;text-align:center">
      <p style="color:#444;margin:0 0 10px;font-weight:bold">Hai bisogno di altro?</p>
      <a href="${tel}" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;margin:4px">📞 Chiama</a>
      <a href="${whatsapp}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;margin:4px">💬 Contattaci</a>
    </div>
    ${bloccoGestione}
    <p style="color:#444;margin-top:20px">Ti confermeremo l'appuntamento entro 24 ore lavorative. Per qualsiasi cosa rispondi pure a questa email.</p>
    <p style="color:#999;font-size:12px;margin-top:24px">Stima orientativa, confermata dopo sopralluogo gratuito. MB Ristrutturazioni · Roma</p>
  </div>
</div>`;
}

function corpoTesto(d: DatiEmail): string {
  return [
    'Prenotazione confermata — MB Ristrutturazioni',
    `Ciao ${d.nome || 'gentile cliente'},`,
    `intervento ${d.tipo} registrato per ${dataLeggibile(d.dataISO)} alle ${d.ora}.`,
    `Totale stimato: € ${d.totale.toFixed(2)}.`,
    `Aggiungi al calendario — Google: ${buildGoogleCalUrl(d)}`,
    `Aggiungi al calendario — Outlook: ${buildOutlookUrl(d, 'outlook.live.com')}`,
    `Aggiungi al calendario — Apple: ${buildAppleIcsUrl(d)}`,
    `Chiamaci: +39 339 126 8722`,
    `Contattaci su WhatsApp: ${buildWhatsAppUrl(d)}`,
    ...(d.id
      ? [
          `Sposta appuntamento: ${buildManageUrl(d, 'sposta')}`,
          `Annulla appuntamento: ${buildManageUrl(d, 'annulla')}`,
        ]
      : []),
    "Ti confermeremo l'appuntamento entro 24 ore lavorative. Grazie!",
  ].join('\n');
}

export async function inviaEmailConferma(d: DatiEmail): Promise<void> {
  const user = Deno.env.get('GMAIL_USER');
  const passRaw = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!user || !passRaw || !d.email) return;
  const password = passRaw.replace(/\s/g, ''); // le app password si copiano con spazi

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: user, password },
    },
  });
  try {
    await client.send({
      from: `MB Ristrutturazioni <${user}>`,
      // Il cliente risponde alla casella che MB legge davvero, non al mittente SMTP.
      replyTo: EMAIL_PUBBLICA,
      to: d.email,
      subject: 'Conferma appuntamento — MB Ristrutturazioni',
      content: corpoTesto(d),
      html: corpoHtml(d),
      attachments: [
        {
          filename: 'appuntamento.ics',
          content: buildIcs(d),
          encoding: 'text',
          contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
        },
      ],
    });
  } catch (e) {
    console.error('[email] invio fallito:', e instanceof Error ? e.message : String(e));
  } finally {
    try {
      await client.close();
    } catch {
      // chiusura best-effort
    }
  }
}
