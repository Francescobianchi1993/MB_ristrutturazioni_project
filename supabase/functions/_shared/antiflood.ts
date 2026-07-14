// deno-lint-ignore-file no-explicit-any
/**
 * Freno anti-abuso per gli endpoint pubblici (prenotazione, preventivo,
 * sopralluogo). Questi indirizzi sono nel codice del sito, quindi chiamabili da
 * chiunque: senza un limite, uno script può far partire email dalla Gmail di MB,
 * messaggi WhatsApp a pagamento verso terzi, eventi sul Google Calendar e righe
 * a database, tutto a spese e a nome dell'azienda.
 *
 * Si appoggia al rate limiter già esistente (`ratelimit.ts`, tabella
 * `rate_limits` accessibile solo dal service role). Limita su DUE dimensioni:
 *   - per IP           → argina un singolo attaccante
 *   - per contatto     → argina il riuso di email/telefono da IP diversi
 *
 * Best-effort e non atomico (come il limiter sottostante): serve a ostacolare il
 * flooding automatico, non a fermare un avversario determinato e distribuito.
 */
import { clientIp, registraTentativo, tentativiRecenti } from './ratelimit.ts';

export interface LimiteOpts {
  /** Prefisso della chiave, tipicamente il nome della function. */
  azione: string;
  /** email/telefono del richiedente, per il limite per-contatto (opzionale). */
  contatto?: string | null;
  /** Finestra in secondi (default 1 ora). */
  finestraSec?: number;
  /** Max richieste per IP nella finestra (default 8). */
  maxIp?: number;
  /** Max richieste per contatto nella finestra (default 5). */
  maxContatto?: number;
}

/**
 * Registra il tentativo e dice se il chiamante ha superato il limite.
 * @returns true se la richiesta va RIFIUTATA (limite superato).
 */
export async function limiteSuperato(
  supabase: any,
  req: Request,
  opts: LimiteOpts,
): Promise<boolean> {
  const finestra = opts.finestraSec ?? 3600;
  const maxIp = opts.maxIp ?? 8;
  const maxContatto = opts.maxContatto ?? 5;

  const ip = clientIp(req);
  const chiaveIp = `${opts.azione}:ip:${ip}`;

  // Normalizza il contatto (minuscolo, senza spazi) così email e telefono
  // "uguali ma scritti diversi" cadono sulla stessa chiave.
  const contattoNorm = (opts.contatto ?? '').trim().toLowerCase().replace(/\s+/g, '');
  const chiaveContatto = contattoNorm ? `${opts.azione}:c:${contattoNorm}` : null;

  // Registriamo prima (così anche il tentativo bloccato "conta" e non si può
  // resettare la finestra restando appena sotto soglia), poi verifichiamo.
  await registraTentativo(supabase, chiaveIp, finestra);
  if (chiaveContatto) await registraTentativo(supabase, chiaveContatto, finestra);

  if ((await tentativiRecenti(supabase, chiaveIp, finestra)) > maxIp) return true;
  if (chiaveContatto && (await tentativiRecenti(supabase, chiaveContatto, finestra)) > maxContatto) {
    return true;
  }
  return false;
}
