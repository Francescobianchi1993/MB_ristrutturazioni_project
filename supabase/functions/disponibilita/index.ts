/**
 * GET disponibilità slot intervento.
 *
 * Input (JSON):  { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }  (oppure { date })
 * Output (JSON): { giorni: { 'YYYY-MM-DD': { '08:00': true, '09:00': false, ... } } }
 *               true  = slot libero (prenotabile)
 *               false = slot occupato sul Google Calendar società, o nel passato
 *
 * Fonte della verità = Google Calendar: ogni evento "occupato" sul calendario
 * della società chiude il relativo slot. Il proprietario gestisce tutto dal
 * telefono creando/cancellando eventi.
 */
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAccessToken, getBusy } from '../_shared/google.ts';
import { SLOT_DURATA_MIN, SLOT_ORARI, TIME_ZONE, romeWallToUTC } from '../_shared/time.ts';

function* intervalloGiorni(from: string, to: string): Generator<string> {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  let cur = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  while (cur <= end) {
    const d = new Date(cur);
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    yield iso;
    cur += 86_400_000;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { from, to, date } = await req.json().catch(() => ({}));
    const dal: string | undefined = from ?? date;
    const al: string | undefined = to ?? date;
    if (!dal || !al) return jsonResponse({ error: 'parametri_mancanti' }, 400);

    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID mancante');

    const token = await getAccessToken();
    const timeMin = romeWallToUTC(dal, '00:00').toISOString();
    const timeMax = new Date(romeWallToUTC(al, '23:59').getTime() + 60_000).toISOString();
    const busy = await getBusy(token, calendarId, timeMin, timeMax, TIME_ZONE);
    const intervalli = busy.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()] as const);

    const adesso = Date.now();
    // "Oggi" in fuso Italia: la prima disponibilità è sempre dal giorno SUCCESSIVO,
    // a prescindere dall'ora corrente (es. alle 16:50 di oggi → si parte da domani).
    const oggiISO = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const giorni: Record<string, Record<string, boolean>> = {};
    for (const giorno of intervalloGiorni(dal, al)) {
      const [gy, gm, gd] = giorno.split('-').map(Number);
      const dow = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay(); // 0=dom, 6=sab
      const weekend = dow === 0 || dow === 6;
      const troppoPresto = giorno <= oggiISO; // oggi e giorni passati: non prenotabili
      const slots: Record<string, boolean> = {};
      for (const ora of SLOT_ORARI) {
        if (weekend || troppoPresto) {
          // Weekend, oppure prima del giorno successivo: nessuno slot libero.
          slots[ora] = false;
          continue;
        }
        const inizio = romeWallToUTC(giorno, ora).getTime();
        const fine = inizio + SLOT_DURATA_MIN * 60_000;
        const passato = inizio < adesso;
        const occupato = intervalli.some(([bs, be]) => bs < fine && be > inizio);
        slots[ora] = !passato && !occupato;
      }
      giorni[giorno] = slots;
    }
    return jsonResponse({ giorni });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
