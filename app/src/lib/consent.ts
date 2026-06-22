/**
 * Gestione del consenso cookie (categoria marketing → Meta Pixel).
 *
 * Il Pixel è definito in index.html ma NON parte da solo: viene caricato solo
 * quando l'utente accetta (setConsent('granted') → window.loadMetaPixel()).
 * Così nessun dato va a Facebook senza consenso (GDPR/ePrivacy).
 */

const KEY = 'mb_cookie_consent';

export type Consent = 'granted' | 'denied';

// Accesso tipizzato alle funzioni globali iniettate da index.html.
interface PixelWindow {
  loadMetaPixel?: () => void;
  fbq?: (...args: unknown[]) => void;
}
function w(): PixelWindow {
  return window as unknown as PixelWindow;
}

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(c: Consent): void {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* localStorage non disponibile: procediamo comunque in memoria */
  }
  if (c === 'granted') w().loadMetaPixel?.();
}

export function hasMarketingConsent(): boolean {
  return getConsent() === 'granted';
}

/** Carica il Pixel se l'utente aveva già acconsentito (utente di ritorno). */
export function initPixelSeConsentito(): void {
  if (hasMarketingConsent()) w().loadMetaPixel?.();
}

/** Evento di conversione "Lead" (no-op se il Pixel non è attivo / consenso negato). */
export function trackLead(value?: number): void {
  const fbq = w().fbq;
  if (typeof fbq !== 'function') return;
  if (typeof value === 'number' && value > 0) fbq('track', 'Lead', { value, currency: 'EUR' });
  else fbq('track', 'Lead');
}

/** Evento per riaprire il banner cookie (usato dal link "Gestisci cookie"). */
export const EVENTO_RIAPRI_COOKIE = 'mb-open-cookie';
export function riapriBannerCookie(): void {
  window.dispatchEvent(new CustomEvent(EVENTO_RIAPRI_COOKIE));
}
