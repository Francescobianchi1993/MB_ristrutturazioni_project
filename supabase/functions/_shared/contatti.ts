/**
 * Recapiti pubblici di MB, lato backend. Gemello di `app/src/lib/contatti.ts`.
 *
 * ATTENZIONE alla differenza tra i due indirizzi in gioco:
 *
 *   GMAIL_USER      → account SMTP che SPEDISCE. Deve restare la Gmail: è
 *                     l'utenza autenticata su smtp.gmail.com, e usare un `from`
 *                     diverso farebbe rifiutare o marcare come spam l'invio.
 *   EMAIL_PUBBLICA  → la casella che MB LEGGE. È quella che il cliente vede sul
 *                     sito, che riceve le notifiche interne e su cui finiscono
 *                     le risposte (replyTo).
 */

/** Casella presidiata da MB: ci arrivano lead e risposte dei clienti. */
export const EMAIL_PUBBLICA = 'mbristrutturazioni@yahoo.com';

/**
 * Destinatario delle notifiche interne (nuovo lead, prenotazione, sopralluogo).
 * `LEAD_EMAIL` resta sovrascrivibile da secret, ma il default NON è più il
 * mittente Gmail: senza secret le richieste finirebbero in una casella che
 * nessuno legge, e il fallimento sarebbe silenzioso.
 */
export function destinatarioLead(): string {
  return Deno.env.get('LEAD_EMAIL') ?? EMAIL_PUBBLICA;
}
