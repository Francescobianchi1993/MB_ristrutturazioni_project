/**
 * Endpoint PUBBLICO che genera al volo un file .ics da parametri querystring.
 * Serve al tasto "Apple" nella mail di conferma: su iPhone aprire questo link
 * apre l'app Calendario con l'evento pronto (Apple non ha un link web add-event).
 *
 * GET /ics?s=<titolo>&d=<YYYY-MM-DD>&o=<HH:MM>
 *
 * verify_jwt=false: viene aperto da un click in email, senza token.
 * Nessun dato sensibile: solo titolo/data/ora passati in chiaro nell'URL.
 */
import { romeWallToUTC, SLOT_DURATA_MIN } from '../_shared/time.ts';

function fmtCalUTC(dt: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}` +
    `T${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}${p(dt.getUTCSeconds())}Z`
  );
}

Deno.serve((req) => {
  const url = new URL(req.url);
  const titolo = url.searchParams.get('s') ?? 'Appuntamento MB Ristrutturazioni';
  const d = url.searchParams.get('d');
  const o = url.searchParams.get('o');
  if (!d || !o) return new Response('parametri mancanti', { status: 400 });

  const start = romeWallToUTC(d, o);
  const end = new Date(start.getTime() + SLOT_DURATA_MIN * 60_000);
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MB Ristrutturazioni//Prenotazioni//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${start.getTime()}@mb-ristrutturazioni`,
    `DTSTAMP:${fmtCalUTC(new Date())}`,
    `DTSTART:${fmtCalUTC(start)}`,
    `DTEND:${fmtCalUTC(end)}`,
    `SUMMARY:${esc(titolo)}`,
    'DESCRIPTION:Appuntamento con MB Ristrutturazioni. Ti ricontattiamo a breve per i dettagli.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="appuntamento-mb.ics"',
    },
  });
});
