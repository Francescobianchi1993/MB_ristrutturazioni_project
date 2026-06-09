/**
 * Recapiti ufficiali MB Ristrutturazioni.
 *
 * Unica fonte di verità per numero di telefono / WhatsApp / email del sito:
 * importa da qui invece di scrivere il numero a mano, così resta coerente
 * ovunque e i link "tel:" funzionano (cliccabili → avviano la chiamata).
 */

/** Numero in formato E.164 per i link `tel:` e `wa.me`. */
export const TEL_E164 = '+393391268722';
/** Numero per WhatsApp (`wa.me/<numero>`), senza '+'. */
export const WHATSAPP_NUMERO = '393391268722';
/** Numero formattato per la lettura a schermo. */
export const TEL_DISPLAY = '339 126 8722';

export const EMAIL = 'mbristrutturazioniroma@gmail.com';

/** Link `tel:` pronto all'uso in un anchor. */
export const TEL_HREF = `tel:${TEL_E164}`;

/** Costruisce un link WhatsApp con messaggio precompilato. */
export function whatsappHref(messaggio: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(messaggio)}`;
}
