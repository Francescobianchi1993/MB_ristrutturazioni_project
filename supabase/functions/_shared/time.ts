/**
 * Slot orari e conversione fuso orario.
 *
 * Gli slot sono gli stessi del wizard frontend (SLOT_ORARI in
 * LivelloIntervento.tsx). Durata fissa 1h. Tutte le ore sono interpretate
 * come orario locale italiano (Europe/Rome), poi convertite in UTC per le
 * API Google.
 */

export const TIME_ZONE = 'Europe/Rome';
export const SLOT_ORARI = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
];
export const SLOT_DURATA_MIN = 60;

/** Offset (minuti) del fuso `timeZone` per l'istante `date`. Gestisce l'ora legale. */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const asUTC = Date.UTC(
    +map.year, +map.month - 1, +map.day,
    +map.hour, +map.minute, +map.second,
  );
  return (asUTC - date.getTime()) / 60_000;
}

/**
 * Converte un orario "da muro" italiano (es. 2026-06-10 09:00) nell'istante
 * UTC corrispondente, tenendo conto di CET/CEST.
 */
export function romeWallToUTC(dateStr: string, timeStr: string): Date {
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m] = timeStr.split(':').map(Number);
  const utcGuess = Date.UTC(Y, M - 1, D, h, m);
  const off = tzOffsetMinutes(new Date(utcGuess), TIME_ZONE);
  return new Date(utcGuess - off * 60_000);
}
