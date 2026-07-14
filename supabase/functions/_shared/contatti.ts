/**
 * Recapiti pubblici di MB, lato backend. Gemello di `app/src/lib/contatti.ts`.
 *
 * Oggi i due indirizzi in gioco coincidono, ma restano concetti distinti:
 *
 *   GMAIL_USER      → account SMTP che SPEDISCE (utenza autenticata su
 *                     smtp.gmail.com). Un `from` diverso da questo farebbe
 *                     rifiutare l'invio o finire in spam: non cambiarlo.
 *   EMAIL_PUBBLICA  → la casella che MB LEGGE: mostrata sul sito e sui PDF,
 *                     riceve le notifiche interne e le risposte (replyTo).
 *
 * Se un giorno MB passasse a un'altra casella, si cambia EMAIL_PUBBLICA (e il
 * secret LEAD_EMAIL) lasciando GMAIL_USER com'è.
 */

/**
 * Casella presidiata da MB: ci arrivano lead e risposte dei clienti.
 * Coincide con GMAIL_USER (il mittente SMTP), ed è voluto: il cliente vede,
 * riceve e risponde sempre allo stesso indirizzo.
 */
export const EMAIL_PUBBLICA = 'mbristrutturazioniroma@gmail.com';

/** Numero mostrato ai clienti nelle email. Gemello di TEL_DISPLAY sul frontend. */
export const TEL_DISPLAY = '339 126 8722';

/** Ragione sociale usata nella firma delle email. */
export const RAGIONE_SOCIALE = 'MB Ristrutturazioni';

/**
 * Destinatario delle notifiche interne (nuovo lead, prenotazione, sopralluogo).
 * `LEAD_EMAIL` resta sovrascrivibile da secret, ma il default NON è più il
 * mittente Gmail: senza secret le richieste finirebbero in una casella che
 * nessuno legge, e il fallimento sarebbe silenzioso.
 */
export function destinatarioLead(): string {
  return Deno.env.get('LEAD_EMAIL') ?? EMAIL_PUBBLICA;
}
